"""Middleware для API"""
import asyncio
import logging
import os
import time
from collections import defaultdict
from typing import Dict, Tuple, Set
from aiohttp import web
from bot.utils.telegram_auth import validate_telegram_webapp_data

logger = logging.getLogger(__name__)

# === LOAD TESTING CONFIG ===
# Отключить rate limiting полностью (для нагрузочного тестирования)
# Установить DISABLE_RATE_LIMIT=true в .env
DISABLE_RATE_LIMIT = os.getenv('DISABLE_RATE_LIMIT', 'false').lower() == 'true'

# IP адреса, освобожденные от rate limiting (whitelist для тестирования)
# Формат: RATE_LIMIT_WHITELIST=192.168.1.1,10.0.0.1
_whitelist_raw = os.getenv('RATE_LIMIT_WHITELIST', '')
RATE_LIMIT_WHITELIST: Set[str] = set(ip.strip() for ip in _whitelist_raw.split(',') if ip.strip())

if DISABLE_RATE_LIMIT:
    logger.warning("⚠️  RATE LIMITING IS DISABLED - only for testing!")
if RATE_LIMIT_WHITELIST:
    logger.info(f"Rate limit whitelist: {RATE_LIMIT_WHITELIST}")


# Хранилище для rate limiting (в памяти)
# Формат: {ip: [timestamp, ...]}
_rate_limit_storage: Dict[str, list] = defaultdict(list)

# asyncio.Lock для потокобезопасного доступа к _rate_limit_storage
_rate_limit_lock = asyncio.Lock()

# Веса endpoints для дифференцированного rate limiting
# Дорогие операции "стоят" больше запросов
ENDPOINT_COSTS = {
    '/api/config': 1,               # Легкий endpoint
    '/api/auth': 2,                 # Аутентификация
    '/api/employees': 5,            # Список сотрудников (запрос к БД)
    '/api/current-locations': 5,    # Текущие локации
    '/api/user/today-status': 3,    # Статус пользователя
    '/api/address': 10,             # Запрос к Yandex API
    '/api/records': 10,             # Создание записи
    '/api/reports/discipline': 50,  # Генерация PDF отчета (дорогая операция)
}
DEFAULT_COST = 3  # Стоимость по умолчанию


class RateLimiter:
    """Rate limiter для ограничения запросов с поддержкой весов endpoints"""

    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        """
        Args:
            max_requests: Максимум "единиц стоимости" в окне
            window_seconds: Размер окна в секундах
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds

    async def is_allowed(self, identifier: str, cost: int = 1) -> Tuple[bool, int]:
        """
        Проверка, разрешен ли запрос (потокобезопасная версия)

        Args:
            identifier: Идентификатор (обычно IP адрес)
            cost: Стоимость запроса в единицах

        Returns:
            Tuple[bool, int]: (разрешен ли запрос, оставшееся количество единиц)
        """
        async with _rate_limit_lock:
            now = time.time()
            window_start = now - self.window_seconds

            # Очищаем старые записи
            _rate_limit_storage[identifier] = [
                (ts, c) for ts, c in _rate_limit_storage[identifier]
                if ts > window_start
            ]

            # Считаем текущую стоимость
            current_cost = sum(c for _, c in _rate_limit_storage[identifier])

            if current_cost + cost > self.max_requests:
                return False, 0

            # Добавляем текущий запрос с его стоимостью
            _rate_limit_storage[identifier].append((now, cost))

            remaining = self.max_requests - current_cost - cost
            return True, remaining


# Глобальный rate limiter (увеличен лимит для поддержки весов)
rate_limiter = RateLimiter(max_requests=200, window_seconds=60)


@web.middleware
async def rate_limit_middleware(request: web.Request, handler):
    """
    Middleware для ограничения частоты запросов с дифференцированными весами

    Лимит: 200 единиц стоимости в минуту с одного IP
    Дорогие операции (PDF отчеты) стоят больше единиц

    Для нагрузочного тестирования:
    - DISABLE_RATE_LIMIT=true - отключить полностью
    - RATE_LIMIT_WHITELIST=ip1,ip2 - whitelist IP адресов
    """
    # Пропускаем для не-API роутов
    if not request.path.startswith('/api/'):
        return await handler(request)

    # Получаем IP адрес
    ip = request.headers.get('X-Real-IP') or \
         request.headers.get('X-Forwarded-For', '').split(',')[0] or \
         request.remote or \
         'unknown'

    # Проверяем: отключен ли rate limit или IP в whitelist
    if DISABLE_RATE_LIMIT or ip in RATE_LIMIT_WHITELIST:
        response = await handler(request)
        response.headers['X-RateLimit-Bypass'] = 'true'
        return response

    # Определяем стоимость запроса по endpoint
    # Ищем совпадение по началу пути (для динамических путей типа /api/records/123)
    cost = DEFAULT_COST
    for endpoint, endpoint_cost in ENDPOINT_COSTS.items():
        if request.path.startswith(endpoint):
            cost = endpoint_cost
            break

    # Проверяем лимит (async версия с Lock)
    allowed, remaining = await rate_limiter.is_allowed(ip, cost)

    if not allowed:
        logger.warning(f"Rate limit exceeded for IP: {ip}, path: {request.path}, cost: {cost}")
        return web.json_response(
            {
                'error': 'Rate limit exceeded',
                'message': 'Too many requests. Please try again later.'
            },
            status=429,
            headers={
                'Retry-After': '60',
                'X-RateLimit-Limit': str(rate_limiter.max_requests),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': str(int(time.time() + rate_limiter.window_seconds))
            }
        )

    # Выполняем запрос
    response = await handler(request)

    # Добавляем заголовки о rate limit
    response.headers['X-RateLimit-Limit'] = str(rate_limiter.max_requests)
    response.headers['X-RateLimit-Remaining'] = str(remaining)
    response.headers['X-RateLimit-Reset'] = str(int(time.time() + rate_limiter.window_seconds))

    return response


@web.middleware
async def error_handling_middleware(request: web.Request, handler):
    """
    Middleware для централизованной обработки ошибок
    """
    try:
        response = await handler(request)
        return response
    
    except web.HTTPException:
        # Пропускаем HTTP исключения (они уже обработаны)
        raise
    
    except ValueError as e:
        # Ошибки валидации
        logger.warning(f"Validation error: {e} | Path: {request.path}")
        return web.json_response(
            {
                'error': 'Validation error',
                'message': str(e)
            },
            status=400
        )
    
    except Exception as e:
        # Все остальные ошибки
        logger.error(
            f"Unexpected error: {e} | Path: {request.path} | Method: {request.method}",
            exc_info=True
        )
        return web.json_response(
            {
                'error': 'Internal server error',
                'message': 'An unexpected error occurred. Please try again later.'
            },
            status=500
        )


@web.middleware
async def telegram_auth_middleware(request: web.Request, handler):
    """
    Middleware для аутентификации через Telegram Mini App
    Извлекает и валидирует init data из заголовка Authorization
    """
    # Пропускаем для статических файлов и не-API роутов
    if not request.path.startswith('/api/'):
        return await handler(request)
    
    # Пропускаем публичные endpoints, которые не требуют аутентификации
    public_endpoints = ['/api/config', '/api/load-test-db']
    if request.path in public_endpoints:
        return await handler(request)
    
    # Получаем заголовок Authorization
    auth_header = request.headers.get('Authorization', '')
    
    logger.info(f"Auth header present: {bool(auth_header)}, starts with 'tma ': {auth_header.startswith('tma ')}")
    
    # Проверяем формат: "tma <initDataRaw>"
    if auth_header.startswith('tma '):
        init_data_raw = auth_header[4:]  # Убираем префикс "tma "
        
        logger.info(f"Init data raw length: {len(init_data_raw)}")
        logger.info(f"Init data raw: {init_data_raw[:100]}..." if len(init_data_raw) > 100 else f"Init data raw: {init_data_raw}")
        
        # Валидируем init data
        is_valid, parsed_data = validate_telegram_webapp_data(init_data_raw)
        
        logger.info(f"Validation result: is_valid={is_valid}, has_parsed_data={parsed_data is not None}")
        if parsed_data:
            logger.info(f"Parsed data keys: {list(parsed_data.keys())}")
        
        if is_valid and parsed_data:
            # Сохраняем валидированные данные в request для использования в handlers
            request['init_data'] = parsed_data
            request['init_data_raw'] = init_data_raw
            logger.info(f"Init data validated for user: {parsed_data.get('user', 'unknown')}")
        else:
            # Данные невалидны - отклоняем запрос
            logger.warning(f"Invalid init data from IP: {request.remote}")
            return web.json_response(
                {'error': 'Invalid or expired authentication data'},
                status=401
            )
    else:
        # Нет заголовка Authorization или неверный формат
        logger.warning(f"Missing Authorization header for {request.path} from IP: {request.remote}")
        return web.json_response(
            {'error': 'Authorization required'},
            status=401
        )
    
    return await handler(request)


@web.middleware
async def logging_middleware(request: web.Request, handler):
    """
    Middleware для логирования запросов
    """
    start_time = time.time()
    
    # Логируем входящий запрос
    logger.info(f"→ {request.method} {request.path} | IP: {request.remote}")
    
    try:
        response = await handler(request)
        
        # Логируем ответ
        elapsed = time.time() - start_time
        logger.info(
            f"← {request.method} {request.path} | "
            f"Status: {response.status} | "
            f"Time: {elapsed:.3f}s"
        )
        
        return response
    
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(
            f"✗ {request.method} {request.path} | "
            f"Error: {type(e).__name__} | "
            f"Time: {elapsed:.3f}s"
        )
        raise


def setup_middlewares(app: web.Application):
    """
    Настройка всех middleware
    
    Args:
        app: Приложение aiohttp
    """
    # Порядок важен! Middleware применяются в обратном порядке
    app.middlewares.append(error_handling_middleware)  # Внешний слой
    app.middlewares.append(rate_limit_middleware)
    app.middlewares.append(telegram_auth_middleware)  # Аутентификация Telegram
    app.middlewares.append(logging_middleware)  # Внутренний слой
    
    logger.info("Middlewares configured: error_handling, rate_limit, telegram_auth, logging")


"""Middleware для API"""
import logging
import time
from collections import defaultdict
from typing import Dict, Tuple
from aiohttp import web

logger = logging.getLogger(__name__)


# Хранилище для rate limiting (в памяти)
# Формат: {ip: [(timestamp, count), ...]}
_rate_limit_storage: Dict[str, list] = defaultdict(list)


class RateLimiter:
    """Rate limiter для ограничения запросов"""
    
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        """
        Args:
            max_requests: Максимум запросов в окне
            window_seconds: Размер окна в секундах
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds
    
    def is_allowed(self, identifier: str) -> Tuple[bool, int]:
        """
        Проверка, разрешен ли запрос
        
        Args:
            identifier: Идентификатор (обычно IP адрес)
            
        Returns:
            Tuple[bool, int]: (разрешен ли запрос, оставшееся количество запросов)
        """
        now = time.time()
        window_start = now - self.window_seconds
        
        # Очищаем старые записи
        _rate_limit_storage[identifier] = [
            ts for ts in _rate_limit_storage[identifier]
            if ts > window_start
        ]
        
        # Проверяем лимит
        current_count = len(_rate_limit_storage[identifier])
        
        if current_count >= self.max_requests:
            return False, 0
        
        # Добавляем текущий запрос
        _rate_limit_storage[identifier].append(now)
        
        remaining = self.max_requests - current_count - 1
        return True, remaining


# Глобальный rate limiter
rate_limiter = RateLimiter(max_requests=100, window_seconds=60)


@web.middleware
async def rate_limit_middleware(request: web.Request, handler):
    """
    Middleware для ограничения частоты запросов
    
    Лимит: 100 запросов в минуту с одного IP
    """
    # Пропускаем для не-API роутов
    if not request.path.startswith('/api/'):
        return await handler(request)
    
    # Получаем IP адрес
    ip = request.headers.get('X-Real-IP') or \
         request.headers.get('X-Forwarded-For', '').split(',')[0] or \
         request.remote or \
         'unknown'
    
    # Проверяем лимит
    allowed, remaining = rate_limiter.is_allowed(ip)
    
    if not allowed:
        logger.warning(f"Rate limit exceeded for IP: {ip}")
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
    app.middlewares.append(logging_middleware)  # Внутренний слой
    
    logger.info("Middlewares configured: error_handling, rate_limit, logging")


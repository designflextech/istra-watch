"""API маршруты"""
import json
import logging
from datetime import datetime, date, timedelta
from aiohttp import web
from bot.config import is_admin
from bot.services.user_service import UserService
from bot.services.record_service import RecordService
from bot.models.record import Record
from bot.utils.telegram_auth import validate_telegram_webapp_data

logger = logging.getLogger(__name__)


async def auth_user(request: web.Request) -> web.Response:
    """
    Аутентификация пользователя через Telegram WebApp
    
    Args:
        request: HTTP запрос
        
    Returns:
        JSON ответ с данными пользователя
    """
    data = await request.json()
    
    # Валидация Telegram WebApp данных
    init_data = data.get('init_data')
    if init_data:
        if not validate_telegram_webapp_data(init_data):
            logger.warning(f"Invalid Telegram WebApp data from IP: {request.remote}")
            return web.json_response(
                {'error': 'Неверные данные аутентификации'},
                status=401
            )
    else:
        # Режим разработки: если init_data отсутствует, выводим предупреждение
        logger.warning(f"DEV MODE: Authentication without init_data from IP: {request.remote}")
    
    telegram_id = data.get('telegram_id')
    
    if not telegram_id:
        raise ValueError('telegram_id обязателен')
    
    # Получаем пользователя из БД
    user = UserService.get_user_by_telegram_id(telegram_id)
    
    # Проверяем, является ли пользователь администратором
    is_user_admin = is_admin(telegram_id)
    
    if not user and not is_user_admin:
        return web.json_response(
            {'error': 'Пользователь не найден'},
            status=404
        )
    
    response_data = {
        'is_admin': is_user_admin,
        'user': user.to_dict() if user else None
    }
    
    logger.info(f"User authenticated: {telegram_id} (admin: {is_user_admin})")
    return web.json_response(response_data)


async def get_employees_status(request: web.Request) -> web.Response:
    """
    Получение статуса сотрудников за определенную дату
    
    Args:
        request: HTTP запрос
        
    Returns:
        JSON ответ со списком сотрудников и их статусами
    """
    # Получаем дату из параметров запроса
    date_str = request.query.get('date')
    
    if date_str:
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            raise ValueError('Неверный формат даты. Используйте YYYY-MM-DD')
    else:
        target_date = date.today()
    
    # Проверяем, что дата не старше 1 месяца
    one_month_ago = date.today() - timedelta(days=30)
    if target_date < one_month_ago:
        raise ValueError('Дата не может быть старше 1 месяца')
    
    # Получаем записи за дату
    records_data = RecordService.get_records_by_date(target_date)
    
    return web.json_response({
        'date': target_date.isoformat(),
        'employees': records_data
    })


async def get_record_details(request: web.Request) -> web.Response:
    """
    Получение детальной информации о записи
    
    Args:
        request: HTTP запрос
        
    Returns:
        JSON ответ с деталями записи
    """
    try:
        record_id = int(request.match_info.get('record_id'))
    except (ValueError, TypeError):
        raise ValueError('Неверный ID записи')
    
    record_details = RecordService.get_record_details(record_id)
    
    if not record_details:
        return web.json_response(
            {'error': 'Запись не найдена'},
            status=404
        )
    
    return web.json_response(record_details)


async def create_record(request: web.Request) -> web.Response:
    """
    Создание записи о приходе/уходе
    
    Args:
        request: HTTP запрос
        
    Returns:
        JSON ответ с созданной записью
    """
    data = await request.json()
    
    user_id = data.get('user_id')
    record_type = data.get('type')
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    comment = data.get('comment')
    
    # Валидация
    if not all([user_id, record_type, latitude, longitude]):
        raise ValueError('Обязательные поля: user_id, type, latitude, longitude')
    
    if record_type not in [Record.ARRIVAL, Record.DEPARTURE]:
        raise ValueError(f'type должен быть {Record.ARRIVAL} или {Record.DEPARTURE}')
    
    # Создаем запись
    record = await RecordService.create_record(
        user_id=int(user_id),
        record_type=record_type,
        latitude=float(latitude),
        longitude=float(longitude),
        comment=comment
    )
    
    logger.info(f"Record created: user_id={user_id}, type={record_type}, id={record.id}")
    
    return web.json_response({
        'success': True,
        'record': record.to_dict()
    })


def setup_routes(app: web.Application):
    """
    Настройка маршрутов API
    
    Args:
        app: Приложение aiohttp
    """
    app.router.add_post('/api/auth', auth_user)
    app.router.add_get('/api/employees', get_employees_status)
    app.router.add_get('/api/records/{record_id}', get_record_details)
    app.router.add_post('/api/records', create_record)


"""API маршруты"""
import json
import logging
from datetime import datetime, date, timedelta
from aiohttp import web
from bot.config import is_admin, YANDEX_MAPS_API_KEY
from bot.services.user_service import UserService
from bot.services.record_service import RecordService
from bot.models.record import Record
from bot.models.user import User

logger = logging.getLogger(__name__)


async def auth_user(request: web.Request) -> web.Response:
    """
    Аутентификация пользователя через Telegram WebApp
    
    Args:
        request: HTTP запрос с валидированными init_data из middleware
        
    Returns:
        JSON ответ с данными пользователя
    """
    # Init data уже валидированы в middleware и доступны в request
    init_data = request.get('init_data')
    
    if not init_data:
        return web.json_response(
            {'error': 'Неверные данные аутентификации'},
            status=401
        )
    
    # Извлекаем user data из валидированных init_data
    user_data_str = init_data.get('user')
    if not user_data_str:
        return web.json_response(
            {'error': 'Отсутствуют данные пользователя'},
            status=401
        )
    
    # Парсим JSON с данными пользователя
    try:
        user_data = json.loads(user_data_str)
        telegram_id = user_data.get('id')
        photo_url = user_data.get('photo_url')  # URL аватарки из Telegram
    except json.JSONDecodeError:
        logger.error(f"Failed to parse user data from init_data: {user_data_str}")
        return web.json_response(
            {'error': 'Некорректные данные пользователя'},
            status=401
        )
    
    if not telegram_id:
        raise ValueError('telegram_id обязателен')
    
    # Получаем пользователя из БД
    user = UserService.get_user_by_telegram_id(telegram_id)
    
    # Обновляем URL аватарки, если пользователь существует и есть photo_url
    if user and photo_url:
        # Проверяем, изменился ли URL аватарки
        if user.avatar_url != photo_url:
            user.avatar_url = photo_url
            user = user.update()
            logger.info(f"Updated avatar_url for user {telegram_id}")
    
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


async def get_address(request: web.Request) -> web.Response:
    """
    Получение адреса по координатам
    
    Args:
        request: HTTP запрос
        
    Returns:
        JSON ответ с адресом
    """
    try:
        latitude = float(request.query.get('latitude'))
        longitude = float(request.query.get('longitude'))
    except (ValueError, TypeError):
        raise ValueError('Неверные координаты')
    
    # Получаем адрес через Яндекс.Карты
    from bot.services.yandex_maps import YandexMapsService
    address_data = await YandexMapsService.get_address_by_coordinates(latitude, longitude)
    
    if not address_data:
        return web.json_response({
            'formatted_address': f'Координаты: {latitude:.6f}, {longitude:.6f}'
        })
    
    return web.json_response(address_data)


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


async def get_config(request: web.Request) -> web.Response:
    """
    Получение конфигурации для фронтенда
    
    Args:
        request: HTTP запрос
        
    Returns:
        JSON ответ с конфигурацией
    """
    return web.json_response({
        'yandex_maps_api_key': YANDEX_MAPS_API_KEY or ''
    })


async def upload_photo(request: web.Request) -> web.Response:
    """
    Загрузка фотографии к записи
    
    POST /api/records/{record_id}/photo
    
    Args:
        request: HTTP запрос с multipart/form-data содержащим фото
        
    Returns:
        JSON ответ с информацией о загруженном фото
    """
    try:
        record_id = int(request.match_info.get('record_id'))
    except (ValueError, TypeError):
        return web.json_response(
            {'error': 'Неверный ID записи'},
            status=400
        )
    
    # Получаем пользователя из init_data
    init_data = request.get('init_data')
    if not init_data:
        return web.json_response(
            {'error': 'Неверные данные аутентификации'},
            status=401
        )
    
    user_data_str = init_data.get('user')
    if not user_data_str:
        return web.json_response(
            {'error': 'Отсутствуют данные пользователя'},
            status=401
        )
    
    try:
        user_data = json.loads(user_data_str)
        telegram_id = user_data.get('id')
    except json.JSONDecodeError:
        return web.json_response(
            {'error': 'Некорректные данные пользователя'},
            status=401
        )
    
    # Получаем пользователя из БД
    user = UserService.get_user_by_telegram_id(telegram_id)
    if not user:
        return web.json_response(
            {'error': 'Пользователь не найден'},
            status=404
        )
    
    # Читаем multipart data
    reader = await request.multipart()
    photo_data = None
    
    async for part in reader:
        if part.name == 'photo':
            photo_data = await part.read()
            break
    
    if not photo_data:
        return web.json_response(
            {'error': 'Фото не найдено в запросе'},
            status=400
        )
    
    try:
        # Загружаем фото через сервис
        result = await RecordService.upload_photo(
            record_id=record_id,
            photo_data=photo_data,
            user_id=user.id
        )
        
        logger.info(f"Photo uploaded for record {record_id} by user {user.id}")
        
        return web.json_response({
            'success': True,
            **result
        })
        
    except ValueError as e:
        logger.warning(f"Photo upload validation error: {e}")
        return web.json_response(
            {'error': str(e)},
            status=400
        )
    except Exception as e:
        logger.error(f"Photo upload error: {e}")
        return web.json_response(
            {'error': 'Ошибка при загрузке фото'},
            status=500
        )


async def get_current_locations(request: web.Request) -> web.Response:
    """
    Получение текущих местоположений сотрудников (тех, кто на работе)
    
    Args:
        request: HTTP запрос
        
    Returns:
        JSON ответ со списком сотрудников и их текущими местоположениями
    """
    # Получаем сегодняшние записи всех сотрудников
    today = date.today()
    employees_data = RecordService.get_records_by_date(today)
    
    logger.info(f"Total employees with records today: {len(employees_data)}")
    
    # Фильтруем тех, кто отметился сегодня (и приход, и уход)
    # Не показываем только тех, кто вообще не делал записей
    current_locations = []
    for emp in employees_data:
        record = emp.get('record')
        user = emp.get('user')
        
        logger.info(f"User: {user.get('name') if user else 'None'}, Record type: {record.get('type') if record else 'None'}")
        
        # Проверяем что есть хоть какая-то запись (arrival или departure)
        if record and record.get('latitude') and record.get('longitude'):
            current_locations.append({
                'user': user,
                'latitude': record['latitude'],
                'longitude': record['longitude'],
                'timestamp': record['timestamp'],
                'address': record.get('address'),
                'record_type': record.get('type')  # Добавляем тип записи для отображения
            })
            logger.info(f"Added location for user: {user.get('name')} (type: {record.get('type')})")
    
    logger.info(f"Total current locations: {len(current_locations)}")
    
    return web.json_response({
        'locations': current_locations
    })


async def get_user_today_status(request: web.Request) -> web.Response:
    """
    Получение статуса пользователя за сегодня
    
    Returns:
        JSON ответ с информацией о последней записи за сегодня:
        {
            "has_arrival": bool,    # есть ли отметка о приходе
            "has_departure": bool,  # есть ли отметка об уходе  
            "last_record_type": str | None  # тип последней записи ('arrival' или 'departure')
        }
    """
    # Init data уже валидированы в middleware
    init_data = request.get('init_data')
    
    if not init_data:
        return web.json_response(
            {'error': 'Неверные данные аутентификации'},
            status=401
        )
    
    # Извлекаем user data
    user_data_str = init_data.get('user')
    if not user_data_str:
        return web.json_response(
            {'error': 'Отсутствуют данные пользователя'},
            status=401
        )
    
    try:
        user_data = json.loads(user_data_str)
        telegram_id = user_data.get('id')
    except json.JSONDecodeError:
        return web.json_response(
            {'error': 'Некорректные данные пользователя'},
            status=401
        )
    
    # Получаем пользователя из БД
    user = UserService.get_user_by_telegram_id(telegram_id)
    
    if not user:
        return web.json_response(
            {'error': 'Пользователь не найден'},
            status=404
        )
    
    # Получаем последнюю запись за сегодня
    today = date.today()
    last_record = Record.get_latest_by_user_and_date(user.id, today)
    
    response_data = {
        'has_arrival': False,
        'has_departure': False,
        'last_record_type': None
    }
    
    if last_record:
        response_data['last_record_type'] = last_record.record_type
        
        # Проверяем, есть ли записи о приходе и уходе за сегодня
        records_today = Record.get_by_user_and_date(user.id, today)
        for record in records_today:
            if record.record_type == Record.ARRIVAL:
                response_data['has_arrival'] = True
            elif record.record_type == Record.DEPARTURE:
                response_data['has_departure'] = True
    
    return web.json_response(response_data)


async def get_employee_records(request: web.Request) -> web.Response:
    """
    Получение записей конкретного сотрудника за определенную дату
    
    Args:
        request: HTTP запрос с user_id в пути и date в query параметрах
        
    Returns:
        JSON ответ со списком записей сотрудника за день
    """
    try:
        user_id = int(request.match_info.get('user_id'))
    except (ValueError, TypeError):
        return web.json_response(
            {'error': 'Неверный ID пользователя'},
            status=400
        )
    
    # Получаем дату из параметров запроса
    date_str = request.query.get('date')
    
    if date_str:
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return web.json_response(
                {'error': 'Неверный формат даты. Используйте YYYY-MM-DD'},
                status=400
            )
    else:
        target_date = date.today()
    
    # Проверяем, что дата не старше 1 месяца
    one_month_ago = date.today() - timedelta(days=30)
    if target_date < one_month_ago:
        return web.json_response(
            {'error': 'Дата не может быть старше 1 месяца'},
            status=400
        )
    
    # Получаем пользователя
    user = User.get_by_id(user_id)
    if not user:
        return web.json_response(
            {'error': 'Пользователь не найден'},
            status=404
        )
    
    # Получаем записи за дату
    records_data = RecordService.get_user_records_by_date(user_id, target_date)
    
    return web.json_response({
        'date': target_date.isoformat(),
        'user': user.to_dict(),
        'records': records_data
    })


def setup_routes(app: web.Application):
    """
    Настройка маршрутов API
    
    Args:
        app: Приложение aiohttp
    """
    app.router.add_post('/api/auth', auth_user)
    app.router.add_get('/api/employees', get_employees_status)
    app.router.add_get('/api/employees/{user_id}/records', get_employee_records)
    app.router.add_get('/api/records/{record_id}', get_record_details)
    app.router.add_post('/api/records', create_record)
    app.router.add_post('/api/records/{record_id}/photo', upload_photo)
    app.router.add_get('/api/address', get_address)
    app.router.add_get('/api/config', get_config)
    app.router.add_get('/api/current-locations', get_current_locations)
    app.router.add_get('/api/user/today-status', get_user_today_status)


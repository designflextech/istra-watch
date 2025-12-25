"""Сервис для работы с Яндекс.Картами"""
import time
import logging
import aiohttp
from typing import Optional, Dict, Any
from bot.config import YANDEX_MAPS_API_KEY

logger = logging.getLogger(__name__)

# Кэш для геокодирования (координаты -> адрес)
# Формат: {rounded_coords: (address_data, timestamp)}
_geocode_cache: Dict[str, tuple] = {}
_GEOCODE_CACHE_TTL = 86400  # 24 часа - адреса редко меняются
_GEOCODE_CACHE_MAX_SIZE = 1000  # Максимум 1000 записей


def _round_coords(latitude: float, longitude: float) -> str:
    """
    Округляем координаты до ~11 метров точности (4 знака после запятой)
    Это позволяет кэшировать близкие точки как одну
    """
    return f"{latitude:.4f},{longitude:.4f}"


class YandexMapsService:
    """Сервис для работы с Яндекс.Картами"""

    GEOCODE_URL = "https://geocode-maps.yandex.ru/1.x/"

    @staticmethod
    async def get_address_by_coordinates(latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
        """
        Получение адреса по координатам с кэшированием

        Args:
            latitude: Широта
            longitude: Долгота

        Returns:
            Словарь с данными адреса или None
        """
        # Проверяем кэш
        cache_key = _round_coords(latitude, longitude)
        if cache_key in _geocode_cache:
            data, timestamp = _geocode_cache[cache_key]
            if time.time() - timestamp < _GEOCODE_CACHE_TTL:
                logger.debug(f"Geocode cache hit for {cache_key}")
                return data

        params = {
            'apikey': YANDEX_MAPS_API_KEY,
            'geocode': f"{longitude},{latitude}",
            'format': 'json',
            'results': 1,
            'lang': 'ru_RU'
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(YandexMapsService.GEOCODE_URL, params=params) as response:
                    if response.status != 200:
                        return None
                    
                    data = await response.json()
                    
                    # Извлекаем информацию об адресе
                    geo_objects = data.get('response', {}).get('GeoObjectCollection', {}).get('featureMember', [])
                    
                    if not geo_objects:
                        return None
                    
                    geo_object = geo_objects[0].get('GeoObject', {})
                    formatted_address = geo_object.get('metaDataProperty', {}).get('GeocoderMetaData', {}).get('text', '')
                    
                    # Парсим компоненты адреса
                    address_components = geo_object.get('metaDataProperty', {}).get('GeocoderMetaData', {}).get('Address', {}).get('Components', [])
                    
                    country = None
                    city = None
                    street = None
                    building = None
                    
                    for component in address_components:
                        kind = component.get('kind')
                        name = component.get('name')
                        
                        if kind == 'country':
                            country = name
                        elif kind in ['province', 'locality']:
                            city = name
                        elif kind == 'street':
                            street = name
                        elif kind == 'house':
                            building = name
                    
                    result = {
                        'formatted_address': formatted_address,
                        'country': country,
                        'city': city,
                        'street': street,
                        'building': building,
                        'latitude': latitude,
                        'longitude': longitude
                    }

                    # Сохраняем в кэш
                    _geocode_cache[cache_key] = (result, time.time())
                    logger.debug(f"Geocode cache miss for {cache_key}, saved to cache")

                    # Очищаем старые записи если кэш переполнен
                    if len(_geocode_cache) > _GEOCODE_CACHE_MAX_SIZE:
                        # Удаляем самую старую запись
                        oldest_key = min(_geocode_cache.keys(), key=lambda k: _geocode_cache[k][1])
                        del _geocode_cache[oldest_key]

                    return result

        except Exception as e:
            logger.error(f"Ошибка при получении адреса: {e}")
            return None


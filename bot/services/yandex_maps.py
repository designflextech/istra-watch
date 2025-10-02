"""Сервис для работы с Яндекс.Картами"""
import aiohttp
from typing import Optional, Dict, Any
from bot.config import YANDEX_MAPS_API_KEY


class YandexMapsService:
    """Сервис для работы с Яндекс.Картами"""
    
    GEOCODE_URL = "https://geocode-maps.yandex.ru/1.x/"
    
    @staticmethod
    async def get_address_by_coordinates(latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
        """
        Получение адреса по координатам
        
        Args:
            latitude: Широта
            longitude: Долгота
            
        Returns:
            Словарь с данными адреса или None
        """
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
                    
                    return {
                        'formatted_address': formatted_address,
                        'country': country,
                        'city': city,
                        'street': street,
                        'building': building,
                        'latitude': latitude,
                        'longitude': longitude
                    }
        
        except Exception as e:
            print(f"Ошибка при получении адреса: {e}")
            return None


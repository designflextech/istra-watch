"""Сервис для работы с записями о приходах/уходах"""
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from bot.models.record import Record
from bot.models.address import Address
from bot.services.yandex_maps import YandexMapsService


class RecordService:
    """Сервис для работы с записями"""
    
    @staticmethod
    async def create_record(
        user_id: int,
        record_type: str,
        latitude: float,
        longitude: float,
        comment: Optional[str] = None
    ) -> Record:
        """
        Создание записи о приходе/уходе
        
        Args:
            user_id: ID пользователя
            record_type: Тип записи (arrival/departure)
            latitude: Широта
            longitude: Долгота
            comment: Комментарий
            
        Returns:
            Созданная запись
        """
        # Получаем или создаем адрес
        address = Address.get_by_coordinates(latitude, longitude)
        
        if not address:
            # Получаем адрес из Яндекс.Карт
            address_data = await YandexMapsService.get_address_by_coordinates(latitude, longitude)
            
            if address_data:
                address = Address.create(
                    formatted_address=address_data['formatted_address'],
                    latitude=latitude,
                    longitude=longitude,
                    country=address_data.get('country'),
                    city=address_data.get('city'),
                    street=address_data.get('street'),
                    building=address_data.get('building')
                )
        
        # Создаем запись
        record = Record.create(
            user_id=user_id,
            record_type=record_type,
            latitude=latitude,
            longitude=longitude,
            address_id=address.id if address else None,
            comment=comment
        )
        
        return record
    
    @staticmethod
    def get_records_by_date(target_date: date) -> List[Dict[str, Any]]:
        """
        Получение записей за определенную дату (оптимизировано с JOIN)
        
        Args:
            target_date: Целевая дата
            
        Returns:
            Список словарей с информацией о пользователях и их записях
        """
        # Используем оптимизированный метод с JOIN вместо N+1 запросов
        return Record.get_all_by_date_with_users_and_addresses(target_date)
    
    @staticmethod
    def get_record_details(record_id: int) -> Optional[Dict[str, Any]]:
        """
        Получение детальной информации о записи (оптимизировано с JOIN)
        
        Args:
            record_id: ID записи
            
        Returns:
            Словарь с информацией о записи или None
        """
        # Используем оптимизированный метод с JOIN вместо 3 отдельных запросов
        return Record.get_by_id_with_details(record_id)
    
    @staticmethod
    def get_user_records(user_id: int, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Получение записей пользователя (оптимизировано с JOIN)
        
        Args:
            user_id: ID пользователя
            limit: Максимальное количество записей
            
        Returns:
            Список записей с адресами
        """
        # Используем оптимизированный метод с JOIN вместо N+1 запросов
        return Record.get_by_user_with_addresses(user_id, limit)


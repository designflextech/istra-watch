"""Сервис для работы с записями о приходах/уходах"""
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from bot.models.record import Record
from bot.models.address import Address
from bot.services.yandex_maps import YandexMapsService
from bot.services.s3_service import S3Service
from bot.services.image_processor import ImageProcessor
import logging

logger = logging.getLogger(__name__)


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
    
    @staticmethod
    def get_user_records_by_date(user_id: int, target_date: date) -> List[Dict[str, Any]]:
        """
        Получение записей конкретного пользователя за определенную дату (оптимизировано с JOIN)
        
        Args:
            user_id: ID пользователя
            target_date: Целевая дата
            
        Returns:
            Список записей с адресами
        """
        # Используем оптимизированный метод с JOIN
        return Record.get_by_user_and_date_with_addresses(user_id, target_date)
    
    @staticmethod
    async def upload_photo(record_id: int, photo_data: bytes, user_id: int) -> Dict[str, Any]:
        """
        Загрузка фотографии к записи
        
        Args:
            record_id: ID записи
            photo_data: Бинарные данные фотографии
            user_id: ID пользователя (для проверки прав)
            
        Returns:
            Словарь с информацией о загруженном фото
            
        Raises:
            ValueError: При ошибке валидации
            Exception: При ошибке загрузки
        """
        # Получаем запись
        record = Record.get_by_id(record_id)
        if not record:
            raise ValueError('Запись не найдена')
        
        # Проверяем права (пользователь может загружать фото только к своим записям)
        if record.user_id != user_id:
            raise ValueError('Недостаточно прав для загрузки фото к этой записи')
        
        # Валидация изображения
        is_valid, error_message = ImageProcessor.validate_image(photo_data)
        if not is_valid:
            raise ValueError(error_message)
        
        # Обработка изображения (сжатие, сохранение EXIF)
        processed_data, metadata = ImageProcessor.process_image(photo_data)
        
        logger.info(f"Image processed for record {record_id}: {metadata}")
        
        # Загрузка в S3
        photo_url = S3Service.upload_photo(
            file_data=processed_data,
            user_id=user_id,
            record_id=record_id,
            content_type='image/jpeg'
        )
        
        # Обновление записи в БД
        record.photo_url = photo_url
        record.photo_uploaded_at = datetime.now()
        record = record.update()
        
        logger.info(f"Photo uploaded for record {record_id}: {photo_url}")
        
        return {
            'photo_url': photo_url,
            'photo_uploaded_at': record.photo_uploaded_at.isoformat() if record.photo_uploaded_at else None,
            'metadata': metadata
        }


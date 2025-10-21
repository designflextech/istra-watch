"""Сервис для работы с S3 хранилищем"""
import logging
import uuid
from datetime import datetime
from typing import Optional
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError, BotoCoreError
from bot.config import (
    S3_ENDPOINT_URL,
    S3_REGION,
    S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY,
    S3_BUCKET_NAME,
    S3_PUBLIC_URL
)
from bot.utils.timezone import now_msk

logger = logging.getLogger(__name__)


class S3Service:
    """Сервис для работы с S3-совместимым хранилищем (TWC Storage)"""
    
    _client = None
    
    @classmethod
    def get_client(cls):
        """Получение или создание S3 клиента (singleton)"""
        if cls._client is None:
            if not all([S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME]):
                raise ValueError("S3 credentials not configured. Check .env file.")
            
            cls._client = boto3.client(
                's3',
                endpoint_url=S3_ENDPOINT_URL,
                region_name=S3_REGION,
                aws_access_key_id=S3_ACCESS_KEY_ID,
                aws_secret_access_key=S3_SECRET_ACCESS_KEY,
                config=Config(signature_version='s3v4')
            )
            logger.info(f"S3 client initialized: endpoint={S3_ENDPOINT_URL}, bucket={S3_BUCKET_NAME}")
        
        return cls._client
    
    @staticmethod
    def generate_file_name(user_id: int, record_id: int, extension: str = 'jpg') -> str:
        """
        Генерация уникального имени файла
        
        Args:
            user_id: ID пользователя
            record_id: ID записи
            extension: Расширение файла
            
        Returns:
            Путь к файлу в формате: photos/{user_id}/{record_id}/photo_{timestamp}_{uuid}.{ext}
        """
        timestamp = now_msk().strftime('%Y%m%d_%H%M%S')  # Используем московское время
        unique_id = uuid.uuid4().hex[:8]
        filename = f"photo_{timestamp}_{unique_id}.{extension}"
        
        return f"photos/{user_id}/{record_id}/{filename}"
    
    @staticmethod
    def upload_photo(
        file_data: bytes,
        user_id: int,
        record_id: int,
        content_type: str = 'image/jpeg'
    ) -> str:
        """
        Загрузка фото в S3
        
        Args:
            file_data: Бинарные данные файла
            user_id: ID пользователя
            record_id: ID записи
            content_type: MIME-тип файла
            
        Returns:
            Публичный URL загруженного файла
            
        Raises:
            Exception: При ошибке загрузки
        """
        try:
            client = S3Service.get_client()
            
            # Генерируем имя файла
            file_key = S3Service.generate_file_name(user_id, record_id)
            
            # Загружаем файл в S3
            client.put_object(
                Bucket=S3_BUCKET_NAME,
                Key=file_key,
                Body=file_data,
                ContentType=content_type,
                CacheControl='max-age=31536000'  # Кэширование на 1 год
            )
            
            # Формируем публичный URL
            if S3_PUBLIC_URL:
                # Если есть CDN URL, используем его
                public_url = f"{S3_PUBLIC_URL}/{file_key}"
            else:
                # Иначе используем прямой URL к S3
                public_url = f"{S3_ENDPOINT_URL}/{S3_BUCKET_NAME}/{file_key}"
            
            logger.info(f"Photo uploaded successfully: {public_url}")
            
            return public_url
            
        except (ClientError, BotoCoreError) as e:
            logger.error(f"S3 upload error: {e}")
            raise Exception(f"Ошибка загрузки фото в хранилище: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error during upload: {e}")
            raise Exception(f"Неожиданная ошибка при загрузке фото: {str(e)}")
    
    @staticmethod
    def delete_photo(photo_url: str) -> bool:
        """
        Удаление фото из S3
        
        Args:
            photo_url: URL фотографии
            
        Returns:
            True если успешно удалено, False иначе
        """
        try:
            client = S3Service.get_client()
            
            # Извлекаем ключ файла из URL
            # URL формат: https://s3.twcstorage.ru/istra-geo-bot/photos/...
            if S3_PUBLIC_URL and photo_url.startswith(S3_PUBLIC_URL):
                file_key = photo_url[len(S3_PUBLIC_URL) + 1:]  # +1 для слэша
            else:
                # Парсим из полного S3 URL
                parts = photo_url.split(f'/{S3_BUCKET_NAME}/')
                if len(parts) != 2:
                    logger.error(f"Invalid photo URL format: {photo_url}")
                    return False
                file_key = parts[1]
            
            # Удаляем файл
            client.delete_object(
                Bucket=S3_BUCKET_NAME,
                Key=file_key
            )
            
            logger.info(f"Photo deleted successfully: {file_key}")
            return True
            
        except (ClientError, BotoCoreError) as e:
            logger.error(f"S3 delete error: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error during delete: {e}")
            return False
    
    @staticmethod
    def get_presigned_url(photo_url: str, expiration: int = 3600) -> Optional[str]:
        """
        Генерация временного подписанного URL (для приватных файлов)
        
        Note: Пока не используется, так как файлы публичные.
        Может пригодиться в будущем для приватных фото.
        
        Args:
            photo_url: URL фотографии
            expiration: Время жизни URL в секундах (по умолчанию 1 час)
            
        Returns:
            Подписанный URL или None при ошибке
        """
        try:
            client = S3Service.get_client()
            
            # Извлекаем ключ файла из URL
            if S3_PUBLIC_URL and photo_url.startswith(S3_PUBLIC_URL):
                file_key = photo_url[len(S3_PUBLIC_URL) + 1:]
            else:
                parts = photo_url.split(f'/{S3_BUCKET_NAME}/')
                if len(parts) != 2:
                    logger.error(f"Invalid photo URL format: {photo_url}")
                    return None
                file_key = parts[1]
            
            # Генерируем подписанный URL
            presigned_url = client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': S3_BUCKET_NAME,
                    'Key': file_key
                },
                ExpiresIn=expiration
            )
            
            return presigned_url
            
        except (ClientError, BotoCoreError) as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            return None
    
    @staticmethod
    def check_bucket_exists() -> bool:
        """
        Проверка существования бакета
        
        Returns:
            True если бакет существует и доступен
        """
        try:
            client = S3Service.get_client()
            client.head_bucket(Bucket=S3_BUCKET_NAME)
            logger.info(f"Bucket {S3_BUCKET_NAME} exists and accessible")
            return True
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code')
            if error_code == '404':
                logger.error(f"Bucket {S3_BUCKET_NAME} does not exist")
            elif error_code == '403':
                logger.error(f"Access denied to bucket {S3_BUCKET_NAME}")
            else:
                logger.error(f"Error checking bucket: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error checking bucket: {e}")
            return False


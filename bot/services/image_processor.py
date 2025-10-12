"""Сервис для обработки изображений"""
import io
import logging
from typing import Optional, Tuple
from PIL import Image

# Опционально для поддержки HEIC/HEIF (iOS)
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
    HEIF_SUPPORTED = True
except ImportError:
    HEIF_SUPPORTED = False

logger = logging.getLogger(__name__)


class ImageProcessor:
    """Сервис для обработки изображений перед загрузкой в S3"""
    
    MAX_DIMENSION = 1920  # максимальная сторона изображения
    JPEG_QUALITY = 85  # качество JPEG
    MAX_FILE_SIZE = 5 * 1024 * 1024  # максимальный размер файла 5MB
    
    ALLOWED_FORMATS = {'JPEG', 'PNG', 'HEIF', 'HEIC', 'WEBP'}
    
    @staticmethod
    def validate_image(image_data: bytes) -> Tuple[bool, Optional[str]]:
        """
        Валидация изображения
        
        Args:
            image_data: Бинарные данные изображения
            
        Returns:
            Tuple (is_valid, error_message)
        """
        # Проверка размера
        if len(image_data) > ImageProcessor.MAX_FILE_SIZE:
            return False, f'Размер файла превышает {ImageProcessor.MAX_FILE_SIZE // (1024 * 1024)}MB'
        
        try:
            img = Image.open(io.BytesIO(image_data))
            
            # Проверка формата
            if img.format not in ImageProcessor.ALLOWED_FORMATS:
                return False, f'Неподдерживаемый формат изображения: {img.format}. Разрешены: {", ".join(ImageProcessor.ALLOWED_FORMATS)}'
            
            # Проверка, что это действительно изображение
            img.verify()
            
            return True, None
            
        except Exception as e:
            logger.error(f"Image validation error: {e}")
            return False, f'Некорректный файл изображения: {str(e)}'
    
    @staticmethod
    def process_image(image_data: bytes) -> Tuple[bytes, dict]:
        """
        Обработка изображения:
        - Ресайз если необходимо (> MAX_DIMENSION)
        - Конвертация в JPEG
        - Сохранение EXIF метаданных (GPS, время съемки и т.д.)
        - Оптимизация
        
        Args:
            image_data: Бинарные данные изображения
            
        Returns:
            Tuple (processed_image_data, metadata)
        """
        img = Image.open(io.BytesIO(image_data))
        
        # Сохраняем EXIF данные
        exif = img.getexif() if hasattr(img, 'getexif') else None
        exif_bytes = None
        if exif:
            try:
                exif_bytes = exif.tobytes()
            except Exception as e:
                logger.warning(f"Failed to extract EXIF: {e}")
        
        # Сохраняем оригинальные размеры
        original_size = img.size
        original_format = img.format
        
        # Конвертируем в RGB если необходимо (для JPEG)
        if img.mode in ('RGBA', 'LA', 'P'):
            # Создаем белый фон для прозрачности
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Ресайз если изображение слишком большое
        resized = False
        if max(img.size) > ImageProcessor.MAX_DIMENSION:
            # Пропорциональное уменьшение
            img.thumbnail((ImageProcessor.MAX_DIMENSION, ImageProcessor.MAX_DIMENSION), Image.Resampling.LANCZOS)
            resized = True
            logger.info(f"Image resized from {original_size} to {img.size}")
        
        # Сохраняем в JPEG с EXIF
        output = io.BytesIO()
        save_kwargs = {
            'format': 'JPEG',
            'quality': ImageProcessor.JPEG_QUALITY,
            'optimize': True,
            'progressive': True  # Progressive JPEG для лучшей загрузки
        }
        
        # Добавляем EXIF если есть
        if exif_bytes:
            save_kwargs['exif'] = exif_bytes
        
        img.save(output, **save_kwargs)
        processed_data = output.getvalue()
        
        # Собираем метаданные
        metadata = {
            'original_format': original_format,
            'original_size': original_size,
            'processed_size': img.size,
            'original_file_size': len(image_data),
            'processed_file_size': len(processed_data),
            'resized': resized,
            'has_exif': bool(exif_bytes)
        }
        
        logger.info(f"Image processed: {metadata}")
        
        return processed_data, metadata
    
    @staticmethod
    def extract_exif_data(image_data: bytes) -> Optional[dict]:
        """
        Извлечение EXIF данных из изображения (для будущего использования)
        
        Args:
            image_data: Бинарные данные изображения
            
        Returns:
            Словарь с EXIF данными или None
        """
        try:
            img = Image.open(io.BytesIO(image_data))
            exif = img.getexif()
            
            if not exif:
                return None
            
            exif_data = {}
            
            # Извлекаем основные теги
            # https://pillow.readthedocs.io/en/stable/reference/ExifTags.html
            from PIL.ExifTags import TAGS, GPSTAGS
            
            for tag_id, value in exif.items():
                tag_name = TAGS.get(tag_id, tag_id)
                
                # GPS данные требуют специальной обработки
                if tag_name == "GPSInfo":
                    gps_data = {}
                    for gps_tag_id in value:
                        gps_tag_name = GPSTAGS.get(gps_tag_id, gps_tag_id)
                        gps_data[gps_tag_name] = value[gps_tag_id]
                    exif_data['GPSInfo'] = gps_data
                else:
                    # Конвертируем bytes в строку
                    if isinstance(value, bytes):
                        try:
                            value = value.decode('utf-8', errors='ignore')
                        except:
                            value = str(value)
                    
                    exif_data[tag_name] = value
            
            return exif_data
            
        except Exception as e:
            logger.error(f"Failed to extract EXIF data: {e}")
            return None
    
    @staticmethod
    def get_gps_coordinates(exif_data: dict) -> Optional[Tuple[float, float]]:
        """
        Извлечение GPS координат из EXIF данных
        
        Args:
            exif_data: Словарь с EXIF данными
            
        Returns:
            Tuple (latitude, longitude) или None
        """
        try:
            gps_info = exif_data.get('GPSInfo')
            if not gps_info:
                return None
            
            def convert_to_degrees(value):
                """Конвертация GPS координат в градусы"""
                d, m, s = value
                return d + (m / 60.0) + (s / 3600.0)
            
            lat = gps_info.get('GPSLatitude')
            lat_ref = gps_info.get('GPSLatitudeRef')
            lon = gps_info.get('GPSLongitude')
            lon_ref = gps_info.get('GPSLongitudeRef')
            
            if not all([lat, lat_ref, lon, lon_ref]):
                return None
            
            latitude = convert_to_degrees(lat)
            if lat_ref == 'S':
                latitude = -latitude
            
            longitude = convert_to_degrees(lon)
            if lon_ref == 'W':
                longitude = -longitude
            
            return latitude, longitude
            
        except Exception as e:
            logger.error(f"Failed to extract GPS coordinates: {e}")
            return None


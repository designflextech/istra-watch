"""Утилиты для работы с временными зонами"""
from datetime import datetime, date, timezone, timedelta
from typing import Optional


# Московская временная зона (UTC+3)
MSK = timezone(timedelta(hours=3))


def now_msk() -> datetime:
    """
    Получение текущего времени в московской временной зоне
    
    Returns:
        datetime: Текущее время в MSK
    """
    return datetime.now(MSK)


def today_msk() -> date:
    """
    Получение текущей даты в московской временной зоне
    
    Returns:
        date: Текущая дата в MSK
    """
    return now_msk().date()


def to_msk(dt: Optional[datetime]) -> Optional[datetime]:
    """
    Конвертация datetime в московское время
    
    Args:
        dt: datetime объект (может быть naive или aware)
        
    Returns:
        datetime в MSK или None если dt был None
    """
    if dt is None:
        return None
    
    # Если datetime naive (без timezone), считаем его UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    
    # Конвертируем в MSK
    return dt.astimezone(MSK)


def ensure_msk(dt: Optional[datetime]) -> Optional[datetime]:
    """
    Убеждается, что datetime в московском времени
    Если datetime naive, добавляет MSK timezone
    Если datetime aware, конвертирует в MSK
    
    Args:
        dt: datetime объект
        
    Returns:
        datetime в MSK или None если dt был None
    """
    if dt is None:
        return None
    
    if dt.tzinfo is None:
        # Naive datetime - считаем его уже в MSK
        return dt.replace(tzinfo=MSK)
    
    # Aware datetime - конвертируем в MSK
    return dt.astimezone(MSK)


def msk_date_range_utc(target_date: date) -> tuple[datetime, datetime]:
    """
    Получение начала и конца дня в MSK, конвертированных в UTC
    Полезно для SQL запросов к БД, которая хранит время в UTC
    
    Args:
        target_date: Дата в MSK
        
    Returns:
        Кортеж (начало_дня_utc, конец_дня_utc)
    """
    # Начало дня в MSK (00:00:00)
    start_msk = datetime.combine(target_date, datetime.min.time()).replace(tzinfo=MSK)
    # Конец дня в MSK (23:59:59.999999)
    end_msk = datetime.combine(target_date, datetime.max.time()).replace(tzinfo=MSK)
    
    # Конвертируем в UTC для SQL запросов
    start_utc = start_msk.astimezone(timezone.utc)
    end_utc = end_msk.astimezone(timezone.utc)
    
    return start_utc, end_utc


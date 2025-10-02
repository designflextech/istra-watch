"""Утилиты для аутентификации через Telegram"""
import hashlib
import hmac
from typing import Dict, Optional
from bot.config import TELEGRAM_BOT_TOKEN


def validate_telegram_webapp_data(init_data: str) -> bool:
    """
    Валидация данных из Telegram WebApp
    
    Args:
        init_data: Строка с данными инициализации
        
    Returns:
        True если данные валидны
    """
    try:
        # Парсим данные
        data_dict = {}
        for item in init_data.split('&'):
            key, value = item.split('=', 1)
            data_dict[key] = value
        
        # Извлекаем hash
        received_hash = data_dict.pop('hash', None)
        if not received_hash:
            return False
        
        # Создаем строку для проверки
        data_check_string = '\n'.join(
            f"{key}={value}" for key, value in sorted(data_dict.items())
        )
        
        # Вычисляем secret_key
        secret_key = hmac.new(
            b"WebAppData",
            TELEGRAM_BOT_TOKEN.encode(),
            hashlib.sha256
        ).digest()
        
        # Вычисляем hash
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return calculated_hash == received_hash
    
    except Exception as e:
        print(f"Ошибка валидации: {e}")
        return False


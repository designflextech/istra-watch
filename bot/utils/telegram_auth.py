"""Утилиты для аутентификации через Telegram"""
import hashlib
import hmac
import time
from typing import Dict, Optional, Tuple
from urllib.parse import unquote
from bot.config import TELEGRAM_BOT_TOKEN


def validate_telegram_webapp_data(init_data: str, max_age_seconds: int = 86400) -> Tuple[bool, Optional[Dict]]:
    """
    Валидация данных из Telegram WebApp согласно актуальной документации
    
    Args:
        init_data: Строка с данными инициализации (query string формат)
        max_age_seconds: Максимальный возраст данных в секундах (по умолчанию 24 часа)
        
    Returns:
        Tuple[bool, Optional[Dict]]: (валидность, словарь с данными)
    """
    try:
        print(f"[validate_telegram_webapp_data] Input length: {len(init_data)}")
        print(f"[validate_telegram_webapp_data] Input: {init_data}")
        
        # Парсим данные
        data_dict = {}
        for item in init_data.split('&'):
            if '=' not in item:
                continue
            key, value = item.split('=', 1)
            data_dict[key] = unquote(value)
        
        print(f"[validate_telegram_webapp_data] Parsed keys: {list(data_dict.keys())}")
        
        # Извлекаем hash
        received_hash = data_dict.pop('hash', None)
        
        print(f"[validate_telegram_webapp_data] Has hash: {received_hash is not None}")
        
        if not received_hash:
            print("[validate_telegram_webapp_data] No hash found")
            return False, None
        
        # Signature остается в data_dict для включения в data_check_string
        # (для новых версий Telegram signature является частью проверяемых данных)
        
        # Проверяем auth_date (важно для безопасности!)
        auth_date = data_dict.get('auth_date')
        print(f"[validate_telegram_webapp_data] auth_date: {auth_date}")
        
        if auth_date:
            try:
                auth_timestamp = int(auth_date)
                current_timestamp = int(time.time())
                age = current_timestamp - auth_timestamp
                
                print(f"[validate_telegram_webapp_data] Auth age: {age}s, max: {max_age_seconds}s")
                
                # Проверяем, не устарели ли данные
                if age > max_age_seconds:
                    print(f"Init data expired: age={age}s, max={max_age_seconds}s")
                    return False, None
            except ValueError:
                print(f"Invalid auth_date format: {auth_date}")
                return False, None
        else:
            print("Missing auth_date in init data")
            return False, None
        
        # Создаем строку для проверки (согласно документации Telegram)
        # Ключи должны быть отсортированы в алфавитном порядке
        data_check_string = '\n'.join(
            f"{key}={value}" for key, value in sorted(data_dict.items())
        )
        
        print(f"[validate_telegram_webapp_data] Data check string:\n{data_check_string}")
        print(f"[validate_telegram_webapp_data] Bot token length: {len(TELEGRAM_BOT_TOKEN)}")
        
        # Вычисляем secret_key
        # Шаг 3 из документации: Create HMAC-SHA256 using key "WebAppData" and apply it to the Telegram Bot token
        # hmac.new(key, msg, digestmod) - первый аргумент это ключ!
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=TELEGRAM_BOT_TOKEN.encode(),
            digestmod=hashlib.sha256
        ).digest()
        
        # Вычисляем hash
        # Шаг 4 из документации: Create HMAC-SHA256 using the result of the previous step as a key
        calculated_hash = hmac.new(
            key=secret_key,
            msg=data_check_string.encode(),
            digestmod=hashlib.sha256
        ).hexdigest()
        
        print(f"[validate_telegram_webapp_data] Expected hash: {received_hash}")
        print(f"[validate_telegram_webapp_data] Calculated hash: {calculated_hash}")
        
        # Сравниваем хеши
        is_valid = calculated_hash == received_hash
        
        if is_valid:
            print("[validate_telegram_webapp_data] ✅ Validation successful")
            return True, data_dict
        else:
            print(f"Hash mismatch: expected={received_hash}, calculated={calculated_hash}")
            return False, None
    
    except Exception as e:
        print(f"Ошибка валидации: {e}")
        import traceback
        traceback.print_exc()
        return False, None


def parse_init_data(init_data: str) -> Optional[Dict]:
    """
    Парсит init data в словарь
    
    Args:
        init_data: Строка с данными инициализации
        
    Returns:
        Словарь с данными или None
    """
    try:
        data_dict = {}
        for item in init_data.split('&'):
            if '=' not in item:
                continue
            key, value = item.split('=', 1)
            data_dict[key] = unquote(value)
        return data_dict
    except Exception as e:
        print(f"Ошибка парсинга init data: {e}")
        return None


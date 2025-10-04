"""Скрипт для добавления пользователя в базу данных"""
import sys
from pathlib import Path

# Добавляем корневую директорию в путь
sys.path.insert(0, str(Path(__file__).parent.parent))

from bot.models.user import User


def add_user(telegram_id: int, name: str, telegram_handle: str = None, phone: str = None, email: str = None):
    """
    Добавление пользователя в базу данных
    
    Args:
        telegram_id: Telegram ID пользователя
        name: Имя пользователя
        telegram_handle: Telegram handle пользователя (опционально)
        phone: Телефон пользователя (опционально)
        email: Email пользователя (опционально)
    """
    try:
        # Проверяем, существует ли уже пользователь
        existing_user = User.get_by_telegram_id(telegram_id)
        
        if existing_user:
            print(f"❌ Пользователь с Telegram ID {telegram_id} уже существует")
            print(f"   Имя: {existing_user.name}")
            print(f"   ID: {existing_user.id}")
            return
        
        # Создаем нового пользователя
        user = User.create(
            name=name,
            telegram_handle=telegram_handle,
            telegram_id=telegram_id,
            phone=phone,
            email=email
        )
        
        print(f"✅ Пользователь успешно добавлен!")
        print(f"   ID: {user.id}")
        print(f"   Имя: {user.name}")
        print(f"   Telegram ID: {user.telegram_id}")
        if user.telegram_handle:
            print(f"   Telegram Handle: {user.telegram_handle}")
        if user.phone:
            print(f"   Телефон: {user.phone}")
        if user.email:
            print(f"   Email: {user.email}")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Использование: python add_user.py <telegram_id> <имя> [telegram_handle] [phone] [email]")
        print("Пример: python add_user.py 123456789 'Иван Иванов' '@ivanov' '+7-900-123-45-67' 'ivan@example.com'")
        print("\nПараметры telegram_handle, phone и email опциональны")
        sys.exit(1)
    
    telegram_id = int(sys.argv[1])
    name = sys.argv[2]
    telegram_handle = sys.argv[3] if len(sys.argv) > 3 else None
    phone = sys.argv[4] if len(sys.argv) > 4 else None
    email = sys.argv[5] if len(sys.argv) > 5 else None
    
    add_user(telegram_id, name, telegram_handle, phone, email)


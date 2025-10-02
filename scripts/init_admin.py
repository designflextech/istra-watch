"""Скрипт для добавления администратора в базу данных"""
import sys
from pathlib import Path

# Добавляем корневую директорию в путь
sys.path.insert(0, str(Path(__file__).parent.parent))

from bot.models.user import User


def init_admin(telegram_id: int, name: str, telegram_handle: str):
    """
    Добавление администратора в базу данных
    
    Args:
        telegram_id: Telegram ID администратора
        name: Имя администратора
        telegram_handle: Telegram handle администратора
    """
    try:
        # Проверяем, существует ли уже пользователь
        existing_user = User.get_by_telegram_id(telegram_id)
        
        if existing_user:
            print(f"Пользователь с Telegram ID {telegram_id} уже существует")
            print(f"Имя: {existing_user.name}")
            return
        
        # Создаем нового администратора
        user = User.create(
            name=name,
            telegram_handle=telegram_handle,
            telegram_id=telegram_id
        )
        
        print(f"✅ Администратор успешно добавлен!")
        print(f"ID: {user.id}")
        print(f"Имя: {user.name}")
        print(f"Telegram ID: {user.telegram_id}")
        print(f"Telegram Handle: {user.telegram_handle}")
        print(f"\nНе забудьте добавить {telegram_id} в переменную окружения TELEGRAM_ADMIN_IDS")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")


if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Использование: python init_admin.py <telegram_id> <имя> <telegram_handle>")
        print("Пример: python init_admin.py 123456789 'Иван Иванов' '@ivanov'")
        sys.exit(1)
    
    telegram_id = int(sys.argv[1])
    name = sys.argv[2]
    telegram_handle = sys.argv[3]
    
    init_admin(telegram_id, name, telegram_handle)


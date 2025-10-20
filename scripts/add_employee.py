"""Скрипт для добавления сотрудника в базу данных"""
import sys
from pathlib import Path

# Добавляем корневую директорию в путь
sys.path.insert(0, str(Path(__file__).parent.parent))

from bot.models.user import User


def add_employee(name: str, telegram_handle: str = None, telegram_id: int = None, phone: str = None, email: str = None):
    """
    Добавление сотрудника в базу данных
    
    Args:
        name: Имя сотрудника
        telegram_handle: Telegram handle сотрудника (опционально)
        telegram_id: Telegram ID сотрудника (опционально)
        phone: Телефон сотрудника (опционально)
        email: Email сотрудника (опционально)
    """
    try:
        # Проверяем, существует ли уже пользователь по handle
        if telegram_handle:
            existing_user_by_handle = User.get_by_telegram_handle(telegram_handle)
            if existing_user_by_handle:
                print(f"❌ Пользователь с Telegram handle {telegram_handle} уже существует")
                print(f"   Имя: {existing_user_by_handle.name}")
                print(f"   ID: {existing_user_by_handle.id}")
                return
        
        # Проверяем, существует ли уже пользователь по telegram_id
        if telegram_id:
            existing_user_by_id = User.get_by_telegram_id(telegram_id)
            if existing_user_by_id:
                print(f"❌ Пользователь с Telegram ID {telegram_id} уже существует")
                print(f"   Имя: {existing_user_by_id.name}")
                print(f"   ID: {existing_user_by_id.id}")
                return
        
        # Создаем нового сотрудника
        user = User.create(
            name=name,
            telegram_handle=telegram_handle,
            telegram_id=telegram_id,
            phone=phone,
            email=email
        )
        
        print(f"✅ Сотрудник успешно добавлен!")
        print(f"   ID: {user.id}")
        print(f"   Имя: {user.name}")
        if user.telegram_handle:
            print(f"   Telegram Handle: {user.telegram_handle}")
        if user.telegram_id:
            print(f"   Telegram ID: {user.telegram_id}")
        if user.phone:
            print(f"   Телефон: {user.phone}")
        if user.email:
            print(f"   Email: {user.email}")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Использование: python add_employee.py <имя> [telegram_handle] [telegram_id] [phone] [email]")
        print("Пример: python add_employee.py 'Иван Иванов' '@ivanov' 123456789 '+7-900-123-45-67' 'ivan@example.com'")
        print("\nПараметры telegram_handle, telegram_id, phone и email опциональны")
        print("Можно указать только имя и handle без telegram_id")
        sys.exit(1)
    
    name = sys.argv[1]
    telegram_handle = sys.argv[2] if len(sys.argv) > 2 else None
    telegram_id = int(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3].isdigit() else None
    phone = sys.argv[4] if len(sys.argv) > 4 else None
    email = sys.argv[5] if len(sys.argv) > 5 else None
    
    add_employee(name, telegram_handle, telegram_id, phone, email)

"""Скрипт для добавления Максима и Марии в базу данных"""
import sys
from pathlib import Path

# Добавляем корневую директорию в путь
sys.path.insert(0, str(Path(__file__).parent.parent))

from bot.models.user import User


def add_users():
    """
    Добавление Максима Вейсгейма и Марии Блиссоновны в базу данных
    """
    users_to_add = [
        {
            'name': 'Максим Вейсгейм',
            'telegram_handle': '@qew7777',
            'telegram_id': 59642909,  # MY_ID из .env
        },
        {
            'name': 'Мария Блиссоновна',
            'telegram_handle': '@blissonblissonbliss',
            'telegram_id': 125093010,  # MARIA_ID из .env
        }
    ]
    
    print("=" * 60)
    print("Добавление пользователей в базу данных")
    print("=" * 60)
    print()
    
    for user_data in users_to_add:
        try:
            # Проверяем, существует ли уже пользователь
            existing_user = User.get_by_telegram_id(user_data['telegram_id'])
            
            if existing_user:
                print(f"⚠️  Пользователь {user_data['name']} уже существует в базе данных")
                print(f"   ID в БД: {existing_user.id}")
                print(f"   Telegram ID: {existing_user.telegram_id}")
                print(f"   Telegram Handle: {existing_user.telegram_handle}")
                print()
                continue
            
            # Создаем нового пользователя
            user = User.create(
                name=user_data['name'],
                telegram_handle=user_data['telegram_handle'],
                telegram_id=user_data['telegram_id']
            )
            
            print(f"✅ Пользователь {user_data['name']} успешно добавлен!")
            print(f"   ID в БД: {user.id}")
            print(f"   Telegram ID: {user.telegram_id}")
            print(f"   Telegram Handle: {user.telegram_handle}")
            print()
            
        except Exception as e:
            print(f"❌ Ошибка при добавлении {user_data['name']}: {e}")
            import traceback
            traceback.print_exc()
            print()
    
    print("=" * 60)
    print("Готово!")
    print("=" * 60)


if __name__ == '__main__':
    add_users()


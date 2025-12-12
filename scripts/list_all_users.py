"""Скрипт для вывода всех пользователей из базы данных"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from bot.models.user import User

def list_all_users():
    """Вывод всех пользователей в читаемом виде"""
    print("="*80)
    print("ВСЕ ПОЛЬЗОВАТЕЛИ В БАЗЕ ДАННЫХ")
    print("="*80)
    
    users = User.get_all(exclude_admins=False)
    
    if not users:
        print("База данных пуста")
        return
    
    print(f"\nВсего пользователей: {len(users)}\n")
    print("="*80)
    
    for i, user in enumerate(users, 1):
        print(f"\n{i}. {user.name}")
        print(f"   {'─'*76}")
        print(f"   ID в БД:          {user.id}")
        print(f"   Telegram ID:      {user.telegram_id if user.telegram_id else '(не указан)'}")
        print(f"   Telegram Handle:  {user.telegram_handle if user.telegram_handle else '(не указан)'}")
        print(f"   Email:            {user.email if user.email else '(не указан)'}")
        print(f"   Телефон:          {user.phone if user.phone else '(не указан)'}")
        print(f"   Avatar URL:       {user.avatar_url if user.avatar_url else '(нет)'}")
        print(f"   Создан:           {user.created_at}")
        print(f"   Обновлен:         {user.updated_at}")
    
    print("\n" + "="*80)
    print(f"ИТОГО: {len(users)} пользователей")
    print("="*80)


if __name__ == '__main__':
    list_all_users()


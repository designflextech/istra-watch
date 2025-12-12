"""Отладочный скрипт для проверки пользователей-админов"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from bot.models.user import User
from bot.config import TELEGRAM_ADMIN_IDS

ADMIN_TELEGRAM_HANDLES = [
    "@ELEN_SIM_SIM",
    "@Deechkin", 
    "@AlekseyVP",
    "@blissonblissonbliss"
]

def normalize_telegram_handle(handle: str) -> str:
    """Нормализация telegram handle"""
    if not handle:
        return ""
    handle = handle.strip().lower()
    if not handle.startswith('@'):
        handle = f"@{handle}"
    return handle

print("="*60)
print("ОТЛАДКА: Проверка пользователей")
print("="*60)

# Получаем всех пользователей
all_users = User.get_all(exclude_admins=False)

print(f"\nВсего пользователей в базе: {len(all_users)}")
print(f"\nAdmin IDs из .env: {TELEGRAM_ADMIN_IDS}")
print(f"Admin Handles: {ADMIN_TELEGRAM_HANDLES}")

print("\n" + "="*60)
print("ВСЕ ПОЛЬЗОВАТЕЛИ В БАЗЕ:")
print("="*60)

normalized_admin_handles = [normalize_telegram_handle(h) for h in ADMIN_TELEGRAM_HANDLES]

for i, user in enumerate(all_users, 1):
    tg_id_match = "✅ АДМИН (по ID)" if user.telegram_id and user.telegram_id in TELEGRAM_ADMIN_IDS else ""
    
    user_handle_normalized = normalize_telegram_handle(user.telegram_handle) if user.telegram_handle else ""
    handle_match = "✅ АДМИН (по handle)" if user_handle_normalized in normalized_admin_handles else ""
    
    status = " ".join([tg_id_match, handle_match]) if (tg_id_match or handle_match) else ""
    
    print(f"\n{i}. {user.name}")
    print(f"   ID в БД: {user.id}")
    print(f"   telegram_id: {user.telegram_id}")
    print(f"   telegram_handle: {user.telegram_handle}")
    print(f"   telegram_handle (normalized): {user_handle_normalized}")
    if status:
        print(f"   >>> {status}")

print("\n" + "="*60)
print("АДМИНЫ ПО ID:")
print("="*60)
admins_by_id = [u for u in all_users if u.telegram_id and u.telegram_id in TELEGRAM_ADMIN_IDS]
if admins_by_id:
    for admin in admins_by_id:
        print(f"  - {admin.name} (ID: {admin.id}, Handle: {admin.telegram_handle}, TG ID: {admin.telegram_id})")
else:
    print("  Не найдено")

print("\n" + "="*60)
print("АДМИНЫ ПО HANDLE:")
print("="*60)
admins_by_handle = [u for u in all_users if u.telegram_handle and normalize_telegram_handle(u.telegram_handle) in normalized_admin_handles]
if admins_by_handle:
    for admin in admins_by_handle:
        print(f"  - {admin.name} (ID: {admin.id}, Handle: {admin.telegram_handle}, TG ID: {admin.telegram_id})")
else:
    print("  Не найдено")

print("\n" + "="*60)
print("СРАВНЕНИЕ HANDLES:")
print("="*60)
print("\nИщем в базе:")
for handle in ADMIN_TELEGRAM_HANDLES:
    normalized = normalize_telegram_handle(handle)
    print(f"\n  {handle} -> {normalized}")
    matches = [u for u in all_users if u.telegram_handle and normalize_telegram_handle(u.telegram_handle) == normalized]
    if matches:
        for match in matches:
            print(f"    ✅ Найден: {match.name} (handle в БД: '{match.telegram_handle}')")
    else:
        print(f"    ❌ Не найден в базе")


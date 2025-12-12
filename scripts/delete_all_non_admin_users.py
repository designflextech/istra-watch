"""Скрипт для удаления всех пользователей (кроме админов) и их записей о приходе/уходе"""
import sys
from pathlib import Path
from typing import List, Optional
import requests

# Добавляем корневую директорию в путь
sys.path.insert(0, str(Path(__file__).parent.parent))

from bot.models.user import User
from bot.config import TELEGRAM_ADMIN_IDS, TELEGRAM_BOT_TOKEN
from bot.utils.database import get_db_connection, get_db_cursor, set_search_path, qualified_table_name

# Список telegram handles администраторов (для идентификации админов без telegram_id)
# Handles нормализуются автоматически (регистронезависимо, с/без @)
ADMIN_TELEGRAM_HANDLES = [
    "@ELEN_SIM_SIM",
    "@Deechkin", 
    "@AlekseyVP",
    "@blissonblissonbliss"
]


def get_telegram_id_by_username(username: str) -> Optional[int]:
    """
    Попытка получить telegram_id по username через Telegram Bot API
    
    ВНИМАНИЕ: Это работает только если пользователь взаимодействовал с ботом!
    Telegram Bot API не позволяет получить информацию о пользователе по username напрямую.
    
    Args:
        username: Telegram username (с @ или без)
        
    Returns:
        telegram_id если удалось получить, иначе None
    """
    if not TELEGRAM_BOT_TOKEN:
        return None
    
    # Нормализуем username
    username = username.strip()
    if username.startswith('@'):
        username = username[1:]
    
    # К сожалению, Telegram Bot API не предоставляет метод для получения user_id по username
    # Это можно сделать только если пользователь взаимодействовал с ботом
    # Мы можем попробовать через getUpdates, но это ненадежно
    
    return None


def get_user_records_count(user_id: int) -> int:
    """
    Получение количества записей пользователя
    
    Args:
        user_id: ID пользователя
        
    Returns:
        Количество записей
    """
    with get_db_connection() as conn:
        with get_db_cursor(conn) as cursor:
            set_search_path(cursor)
            records_table = qualified_table_name('records')
            
            cursor.execute(
                f"SELECT COUNT(*) as count FROM {records_table} WHERE user_id = %s",
                (user_id,)
            )
            result = cursor.fetchone()
            return result['count'] if result else 0


def delete_user_and_records(user_id: int) -> tuple[int, int]:
    """
    Удаление пользователя и всех его записей (записи удаляются каскадно)
    
    Args:
        user_id: ID пользователя
        
    Returns:
        Кортеж (количество удаленных записей, 1 если пользователь удален, 0 если нет)
    """
    # Сначала получаем количество записей для отчета
    records_count = get_user_records_count(user_id)
    
    # Удаляем пользователя (записи удалятся каскадно благодаря ON DELETE CASCADE)
    # User.delete() использует свой контекст и автоматически делает commit
    if User.delete(user_id):
        return (records_count, 1)
    else:
        return (0, 0)


def get_admin_users() -> List[User]:
    """
    Получение пользователей-админов
    
    Ищет по:
    1. telegram_id из TELEGRAM_ADMIN_IDS
    2. telegram_handle из ADMIN_TELEGRAM_HANDLES
    
    Returns:
        Список пользователей-админов
    """
    admin_users = []
    
    with get_db_connection() as conn:
        with get_db_cursor(conn) as cursor:
            set_search_path(cursor)
            users_table = qualified_table_name('users')
            
            # Ищем по telegram_id
            if TELEGRAM_ADMIN_IDS:
                cursor.execute(
                    f"SELECT * FROM {users_table} WHERE telegram_id IN %s",
                    (tuple(TELEGRAM_ADMIN_IDS),)
                )
                results = cursor.fetchall()
                admin_users.extend([User.from_dict(dict(row)) for row in results])
            
            # Ищем по telegram_handle
            if ADMIN_TELEGRAM_HANDLES:
                # Нормализуем handles для поиска
                normalized_handles = [normalize_telegram_handle(h) for h in ADMIN_TELEGRAM_HANDLES]
                
                # PostgreSQL: используем LOWER() для регистронезависимого поиска
                for handle in normalized_handles:
                    cursor.execute(
                        f"SELECT * FROM {users_table} WHERE LOWER(telegram_handle) = LOWER(%s)",
                        (handle,)
                    )
                    results = cursor.fetchall()
                    for row in results:
                        user = User.from_dict(dict(row))
                        # Проверяем, что не добавили дубликат
                        if not any(u.id == user.id for u in admin_users):
                            admin_users.append(user)
            
            return admin_users


def normalize_telegram_handle(handle: str) -> str:
    """
    Нормализация telegram handle для сравнения
    
    Args:
        handle: Telegram handle
        
    Returns:
        Нормализованный handle (lowercase, с @)
    """
    if not handle:
        return ""
    
    handle = handle.strip().lower()
    if not handle.startswith('@'):
        handle = f"@{handle}"
    
    return handle


def is_user_admin(user: User) -> bool:
    """
    Проверка, является ли пользователь администратором
    
    Проверяет:
    1. Есть ли telegram_id пользователя в TELEGRAM_ADMIN_IDS
    2. Есть ли telegram_handle пользователя в ADMIN_TELEGRAM_HANDLES
    
    Args:
        user: Пользователь для проверки
        
    Returns:
        True если пользователь админ, False иначе
    """
    # Проверка по telegram_id
    if user.telegram_id and user.telegram_id in TELEGRAM_ADMIN_IDS:
        return True
    
    # Проверка по telegram_handle
    if user.telegram_handle:
        user_handle = normalize_telegram_handle(user.telegram_handle)
        normalized_admin_handles = [normalize_telegram_handle(h) for h in ADMIN_TELEGRAM_HANDLES]
        if user_handle in normalized_admin_handles:
            return True
    
    return False


def identify_admins_without_telegram_id(users: List[User]) -> List[User]:
    """
    Интерактивная идентификация админов среди пользователей без telegram_id
    
    Args:
        users: Список пользователей без telegram_id
        
    Returns:
        Список пользователей, идентифицированных как админы
    """
    if not users:
        return []
    
    print("\n" + "🔍 "*30)
    print("ИДЕНТИФИКАЦИЯ АДМИНИСТРАТОРОВ БЕЗ TELEGRAM_ID")
    print("🔍 "*30)
    print(f"\nНайдено {len(users)} пользователей БЕЗ telegram_id.")
    print("Они могут быть админами, которые еще не запустили бота.")
    print("\nСписок Telegram Admin IDs из .env:", TELEGRAM_ADMIN_IDS)
    print("\nПожалуйста, укажите, кто из них является администратором:")
    print("(если вы знаете их telegram_id, введите его; если нет - пропустите)")
    print()
    
    identified_admins = []
    
    for i, user in enumerate(users, 1):
        print(f"\n{i}. {user.name}")
        print(f"   Telegram handle: {user.telegram_handle if user.telegram_handle else '(нет)'}")
        print(f"   ID в БД: {user.id}")
        print(f"   Email: {user.email if user.email else '(нет)'}")
        
        while True:
            response = input(f"   Введите telegram_id этого пользователя (или Enter для пропуска): ").strip()
            
            if not response:
                # Пропускаем
                break
            
            try:
                telegram_id = int(response)
                if telegram_id in TELEGRAM_ADMIN_IDS:
                    print(f"   ✅ Telegram ID {telegram_id} найден в списке админов!")
                    print(f"   Пользователь {user.name} будет считаться АДМИНИСТРАТОРОМ и НЕ будет удален.")
                    identified_admins.append(user)
                    
                    # Предлагаем обновить telegram_id в базе
                    update_response = input(f"   Обновить telegram_id в базе данных? (yes/no): ").strip().lower()
                    if update_response == 'yes':
                        user.telegram_id = telegram_id
                        user.update()
                        print(f"   ✅ Telegram ID обновлен в базе данных")
                    break
                else:
                    print(f"   ⚠️  Telegram ID {telegram_id} НЕ найден в списке админов: {TELEGRAM_ADMIN_IDS}")
                    retry = input(f"   Попробовать снова? (yes/no): ").strip().lower()
                    if retry != 'yes':
                        break
            except ValueError:
                print(f"   ❌ Неверный формат. Введите число или нажмите Enter")
    
    print("\n" + "🔍 "*30)
    if identified_admins:
        print(f"✅ Идентифицировано {len(identified_admins)} администраторов:")
        for admin in identified_admins:
            print(f"   - {admin.name} ({admin.telegram_handle})")
    else:
        print("ℹ️  Администраторы не идентифицированы")
    print("🔍 "*30)
    
    return identified_admins


def get_statistics() -> dict:
    """
    Получение статистики по пользователям и записям
    
    Returns:
        Словарь со статистикой
    """
    # Получаем всех пользователей (без фильтрации)
    all_users = User.get_all(exclude_admins=False)
    
    # Фильтруем вручную, используя is_user_admin (проверяет и по ID, и по handle)
    non_admin_users = [user for user in all_users if not is_user_admin(user)]
    
    total_records = 0
    users_with_records = 0
    users_without_records = 0
    
    for user in non_admin_users:
        records_count = get_user_records_count(user.id)
        total_records += records_count
        if records_count > 0:
            users_with_records += 1
        else:
            users_without_records += 1
    
    return {
        'total_users': len(non_admin_users),
        'users_with_records': users_with_records,
        'users_without_records': users_without_records,
        'total_records': total_records,
        'users': non_admin_users
    }


def show_statistics(stats: dict) -> None:
    """
    Показать статистику
    
    Args:
        stats: Словарь со статистикой
    """
    print("\n" + "="*60)
    print("📊 СТАТИСТИКА")
    print("="*60)
    print(f"Всего пользователей (кроме админов): {stats['total_users']}")
    print(f"  - С записями: {stats['users_with_records']}")
    print(f"  - Без записей: {stats['users_without_records']}")
    print(f"Всего записей для удаления: {stats['total_records']}")
    print("="*60)
    
    if stats['total_users'] > 0:
        print("\nСписок пользователей для удаления:")
        users_without_telegram_id = []
        for i, user in enumerate(stats['users'], 1):
            records_count = get_user_records_count(user.id)
            telegram_info = user.telegram_handle if user.telegram_handle else "(нет handle)"
            telegram_id_info = f"TG ID: {user.telegram_id}" if user.telegram_id else "⚠️ БЕЗ telegram_id"
            print(f"  {i}. {user.name} (ID: {user.id}, {telegram_info}, {telegram_id_info}, Записей: {records_count})")
            
            if not user.telegram_id:
                users_without_telegram_id.append(user)
        
        # Предупреждение о пользователях без telegram_id
        if users_without_telegram_id:
            print("\n" + "⚠️ "*30)
            print(f"ВНИМАНИЕ! {len(users_without_telegram_id)} пользователей БЕЗ telegram_id:")
            print("Это пользователи, которые могут быть админами, загруженными через Excel,")
            print("но еще не запустившими бота. ПРОВЕРЬТЕ ИХ ВРУЧНУЮ!")
            for user in users_without_telegram_id:
                print(f"  - {user.name} ({user.telegram_handle})")
            print("⚠️ "*30)


def delete_all_non_admin_users(force: bool = False) -> None:
    """
    Основная функция скрипта для удаления всех пользователей (кроме админов) и их записей
    
    Args:
        force: Принудительное удаление без подтверждения
    """
    try:
        # КРИТИЧЕСКАЯ ПРОВЕРКА: TELEGRAM_ADMIN_IDS должен быть настроен
        if not TELEGRAM_ADMIN_IDS:
            print("="*60)
            print("❌ ОШИБКА: TELEGRAM_ADMIN_IDS не настроен!")
            print("="*60)
            print("Без списка админов скрипт удалит ВСЕХ пользователей!")
            print("Настройте TELEGRAM_ADMIN_IDS в .env файле перед запуском.")
            print("\nПример в .env:")
            print("TELEGRAM_ADMIN_IDS=123456789,987654321")
            print("="*60)
            return
        
        print("🔍 Получение списка пользователей (кроме админов)...")
        
        # Получаем статистику
        stats = get_statistics()
        
        if stats['total_users'] == 0:
            print("✅ Нет пользователей для удаления (все пользователи - админы или база пуста)")
            return
        
        # Показываем статистику
        show_statistics(stats)
        
        # Показываем пользователей-админов (которые НЕ будут удалены)
        print("\n" + "="*60)
        print("🛡️  АДМИНИСТРАТОРЫ (НЕ БУДУТ УДАЛЕНЫ)")
        print("="*60)
        print(f"Telegram Admin IDs из .env: {TELEGRAM_ADMIN_IDS}")
        print(f"Admin Telegram Handles: {ADMIN_TELEGRAM_HANDLES}")
        
        admin_users = get_admin_users()
        if admin_users:
            print(f"\nНайдено {len(admin_users)} пользователей-админов в базе данных:")
            for i, admin in enumerate(admin_users, 1):
                records_count = get_user_records_count(admin.id)
                tg_id_str = f"TG ID: {admin.telegram_id}" if admin.telegram_id else "БЕЗ TG ID"
                reason = []
                if admin.telegram_id and admin.telegram_id in TELEGRAM_ADMIN_IDS:
                    reason.append("по ID")
                if admin.telegram_handle and normalize_telegram_handle(admin.telegram_handle) in [normalize_telegram_handle(h) for h in ADMIN_TELEGRAM_HANDLES]:
                    reason.append("по handle")
                reason_str = f" [{', '.join(reason)}]" if reason else ""
                print(f"  {i}. {admin.name} (ID: {admin.id}, Handle: {admin.telegram_handle}, {tg_id_str}, Записей: {records_count}){reason_str}")
        else:
            print("\n⚠️  В базе данных НЕ НАЙДЕНО пользователей-админов")
            print("    Проверьте TELEGRAM_ADMIN_IDS и ADMIN_TELEGRAM_HANDLES")
        
        print("="*60)
        
        # Проверяем, есть ли пользователи без telegram_id в списке на удаление
        users_without_telegram_id = [u for u in stats['users'] if not u.telegram_id]
        
        identified_admins = []
        if users_without_telegram_id and not force:
            print("\n⚠️  Найдены пользователи БЕЗ telegram_id в списке на удаление.")
            print("Они могут быть админами, которые еще не запустили бота.")
            
            response = input("\nХотите идентифицировать админов среди них? (yes/no): ").strip().lower()
            if response == 'yes':
                identified_admins = identify_admins_without_telegram_id(users_without_telegram_id)
                
                # Удаляем идентифицированных админов из списка на удаление
                if identified_admins:
                    identified_admin_ids = {admin.id for admin in identified_admins}
                    stats['users'] = [u for u in stats['users'] if u.id not in identified_admin_ids]
                    stats['total_users'] = len(stats['users'])
                    
                    print(f"\n✅ Обновлен список на удаление: {stats['total_users']} пользователей")
        
        # Проверяем, есть ли админы в списке на удаление (не должно быть!)
        admin_ids_set = set(TELEGRAM_ADMIN_IDS)
        admins_in_deletion_list = [u for u in stats['users'] if u.telegram_id and u.telegram_id in admin_ids_set]
        if admins_in_deletion_list:
            print("\n" + "🚨 "*30)
            print("КРИТИЧЕСКАЯ ОШИБКА! В списке на удаление найдены админы:")
            for admin in admins_in_deletion_list:
                print(f"  - {admin.name} (ID: {admin.id}, TG ID: {admin.telegram_id})")
            print("Это ошибка в логике скрипта! Операция отменена.")
            print("🚨 "*30)
            return
        
        # Запрашиваем подтверждение
        if not force:
            print(f"\n⚠️  ВНИМАНИЕ: Будет удалено:")
            print(f"   - {stats['total_users']} пользователей")
            print(f"   - {stats['total_records']} записей о приходе/уходе")
            print("\n⚠️  Это действие необратимо!")
            confirmation = input("Вы уверены? Введите 'DELETE ALL' для подтверждения: ")
            
            if confirmation != 'DELETE ALL':
                print("❌ Операция отменена")
                return
        
        # Удаляем записи и пользователей
        print(f"\n🗑️  Начало удаления...")
        
        total_deleted_records = 0
        total_deleted_users = 0
        errors = []
        
        for user in stats['users']:
            try:
                # Проверяем, что пользователь не админ (дополнительная проверка)
                if user.telegram_id and user.telegram_id in TELEGRAM_ADMIN_IDS:
                    print(f"   ⚠️  Пропущен админ: {user.name} (ID: {user.id}, Telegram ID: {user.telegram_id})")
                    continue
                
                # Удаляем пользователя (записи удалятся каскадно благодаря ON DELETE CASCADE)
                records_count, deleted = delete_user_and_records(user.id)
                
                if deleted:
                    total_deleted_users += 1
                    total_deleted_records += records_count
                    if records_count > 0:
                        print(f"   ✅ Удален пользователь {user.name} (ID: {user.id}) и {records_count} записей (каскадно)")
                    else:
                        print(f"   ✅ Удален пользователь {user.name} (ID: {user.id}) (без записей)")
                else:
                    errors.append(f"Не удалось удалить пользователя {user.name} (ID: {user.id})")
                    
            except Exception as e:
                error_msg = f"Ошибка при удалении пользователя {user.name} (ID: {user.id}): {str(e)}"
                errors.append(error_msg)
                print(f"   ❌ {error_msg}")
        
        # Показываем итоги
        print("\n" + "="*60)
        print("📊 ИТОГИ")
        print("="*60)
        print(f"✅ Удалено пользователей: {total_deleted_users}")
        print(f"✅ Удалено записей: {total_deleted_records}")
        
        if errors:
            print(f"\n⚠️  Ошибки ({len(errors)}):")
            for error in errors:
                print(f"   - {error}")
        
        print("="*60)
        print("✅ Операция завершена")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    force = '--force' in sys.argv
    
    if not force:
        print("="*60)
        print("⚠️  ВНИМАНИЕ: Этот скрипт удалит ВСЕХ пользователей (кроме админов)")
        print("   и ВСЕ их записи о приходе/уходе!")
        print("="*60)
        print("\nИспользование:")
        print("  python delete_all_non_admin_users.py          # С подтверждением")
        print("  python delete_all_non_admin_users.py --force  # Без подтверждения")
        print("\nАдминистраторы определяются через TELEGRAM_ADMIN_IDS в .env")
        print("="*60)
    
    delete_all_non_admin_users(force=force)


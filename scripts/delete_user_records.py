"""Скрипт для удаления записей о приходе/уходе пользователя"""
import sys
from pathlib import Path
from typing import Optional, List

# Добавляем корневую директорию в путь
sys.path.insert(0, str(Path(__file__).parent.parent))

from bot.models.user import User
from bot.models.record import Record
from bot.utils.database import get_db_connection, get_db_cursor, set_search_path, qualified_table_name


def find_user_by_name(name: str) -> Optional[User]:
    """
    Поиск пользователя по имени (частичное совпадение)
    
    Args:
        name: Имя пользователя для поиска
        
    Returns:
        Найденный пользователь или None
    """
    with get_db_connection() as conn:
        with get_db_cursor(conn) as cursor:
            set_search_path(cursor)
            users_table = qualified_table_name('users')
            
            # Поиск по частичному совпадению имени (регистронезависимый)
            cursor.execute(
                f"SELECT * FROM {users_table} WHERE LOWER(name) LIKE LOWER(%s)",
                (f"%{name}%",)
            )
            results = cursor.fetchall()
            
            if not results:
                return None
            
            if len(results) == 1:
                return User.from_dict(dict(results[0]))
            
            # Если найдено несколько пользователей, показываем их список
            print(f"Найдено {len(results)} пользователей с именем, содержащим '{name}':")
            for i, row in enumerate(results, 1):
                user = User.from_dict(dict(row))
                print(f"  {i}. ID: {user.id}, Имя: {user.name}, Telegram: {user.telegram_handle}")
            
            return None


def find_users_by_name(name: str) -> List[User]:
    """
    Поиск всех пользователей по имени (частичное совпадение)
    
    Args:
        name: Имя пользователя для поиска
        
    Returns:
        Список найденных пользователей
    """
    with get_db_connection() as conn:
        with get_db_cursor(conn) as cursor:
            set_search_path(cursor)
            users_table = qualified_table_name('users')
            
            # Поиск по частичному совпадению имени (регистронезависимый)
            cursor.execute(
                f"SELECT * FROM {users_table} WHERE LOWER(name) LIKE LOWER(%s)",
                (f"%{name}%",)
            )
            results = cursor.fetchall()
            
            return [User.from_dict(dict(row)) for row in results]


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


def delete_user_records(user_id: int) -> int:
    """
    Удаление всех записей пользователя
    
    Args:
        user_id: ID пользователя
        
    Returns:
        Количество удаленных записей
    """
    with get_db_connection() as conn:
        with get_db_cursor(conn) as cursor:
            set_search_path(cursor)
            records_table = qualified_table_name('records')
            
            # Сначала получаем количество записей для отчета
            cursor.execute(
                f"SELECT COUNT(*) as count FROM {records_table} WHERE user_id = %s",
                (user_id,)
            )
            count_result = cursor.fetchone()
            records_count = count_result['count'] if count_result else 0
            
            if records_count == 0:
                return 0
            
            # Удаляем все записи пользователя
            cursor.execute(
                f"DELETE FROM {records_table} WHERE user_id = %s",
                (user_id,)
            )
            
            return records_count


def show_user_records_summary(user_id: int) -> None:
    """
    Показать краткую сводку записей пользователя
    
    Args:
        user_id: ID пользователя
    """
    with get_db_connection() as conn:
        with get_db_cursor(conn) as cursor:
            set_search_path(cursor)
            records_table = qualified_table_name('records')
            
            # Получаем статистику по типам записей
            cursor.execute(
                f"""
                SELECT 
                    record_type,
                    COUNT(*) as count,
                    MIN(timestamp) as first_record,
                    MAX(timestamp) as last_record
                FROM {records_table} 
                WHERE user_id = %s 
                GROUP BY record_type
                ORDER BY record_type
                """,
                (user_id,)
            )
            results = cursor.fetchall()
            
            if not results:
                print("   Записи не найдены")
                return
            
            print("   Статистика записей:")
            for row in results:
                record_type = "Приход" if row['record_type'] == 'arrival' else "Уход"
                print(f"     {record_type}: {row['count']} записей")
                print(f"       Первая: {row['first_record']}")
                print(f"       Последняя: {row['last_record']}")


def delete_user_records_script(user_name: str, force: bool = False) -> None:
    """
    Основная функция скрипта для удаления записей пользователя
    
    Args:
        user_name: Имя пользователя для поиска
        force: Принудительное удаление без подтверждения
    """
    try:
        print(f"🔍 Поиск пользователей с именем '{user_name}'...")
        
        # Ищем всех пользователей
        users = find_users_by_name(user_name)
        
        if not users:
            print(f"❌ Пользователи с именем '{user_name}' не найдены")
            return
        
        if len(users) == 1:
            # Один пользователь - работаем с ним
            user = users[0]
            process_single_user(user, force)
        else:
            # Несколько пользователей - показываем список и даем выбор
            print(f"Найдено {len(users)} пользователей с именем, содержащим '{user_name}':")
            for i, user in enumerate(users, 1):
                records_count = get_user_records_count(user.id)
                print(f"  {i}. ID: {user.id}, Имя: {user.name}, Telegram: {user.telegram_handle}, Записей: {records_count}")
            
            if force:
                # В режиме force удаляем записи всех найденных пользователей
                print(f"\n⚠️  Режим --force: удаление записей всех {len(users)} пользователей...")
                total_deleted = 0
                for user in users:
                    deleted_count = delete_user_records(user.id)
                    total_deleted += deleted_count
                    if deleted_count > 0:
                        print(f"   Удалено {deleted_count} записей пользователя {user.name} (ID: {user.id})")
                print(f"✅ Всего удалено {total_deleted} записей")
            else:
                # Интерактивный выбор
                try:
                    choice = input(f"\nВыберите пользователя (1-{len(users)}) или 'all' для всех: ").strip()
                    
                    if choice.lower() == 'all':
                        # Удаляем записи всех пользователей
                        print(f"\n⚠️  ВНИМАНИЕ: Будет удалено записей всех {len(users)} пользователей")
                        confirmation = input("Вы уверены? Введите 'yes' для подтверждения: ")
                        
                        if confirmation.lower() != 'yes':
                            print("❌ Операция отменена")
                            return
                        
                        total_deleted = 0
                        for user in users:
                            deleted_count = delete_user_records(user.id)
                            total_deleted += deleted_count
                            if deleted_count > 0:
                                print(f"   Удалено {deleted_count} записей пользователя {user.name} (ID: {user.id})")
                        print(f"✅ Всего удалено {total_deleted} записей")
                    else:
                        # Выбран конкретный пользователь
                        user_index = int(choice) - 1
                        if 0 <= user_index < len(users):
                            user = users[user_index]
                            process_single_user(user, force)
                        else:
                            print("❌ Неверный выбор")
                            return
                            
                except (ValueError, KeyboardInterrupt):
                    print("❌ Операция отменена")
                    return
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()


def process_single_user(user: User, force: bool = False) -> None:
    """
    Обработка одного пользователя
    
    Args:
        user: Пользователь для обработки
        force: Принудительное удаление без подтверждения
    """
    print(f"\n✅ Выбран пользователь:")
    print(f"   ID: {user.id}")
    print(f"   Имя: {user.name}")
    print(f"   Telegram Handle: {user.telegram_handle}")
    print(f"   Telegram ID: {user.telegram_id}")
    
    # Получаем количество записей
    records_count = get_user_records_count(user.id)
    print(f"   Количество записей: {records_count}")
    
    if records_count == 0:
        print("✅ У пользователя нет записей для удаления")
        return
    
    # Показываем сводку записей
    show_user_records_summary(user.id)
    
    # Запрашиваем подтверждение
    if not force:
        print(f"\n⚠️  ВНИМАНИЕ: Будет удалено {records_count} записей пользователя {user.name}")
        confirmation = input("Вы уверены? Введите 'yes' для подтверждения: ")
        
        if confirmation.lower() != 'yes':
            print("❌ Операция отменена")
            return
    
    # Удаляем записи
    print(f"\n🗑️  Удаление записей пользователя {user.name}...")
    deleted_count = delete_user_records(user.id)
    
    print(f"✅ Успешно удалено {deleted_count} записей пользователя {user.name}")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Использование: python delete_user_records.py <имя_пользователя> [--force]")
        print("Пример: python delete_user_records.py 'Максим Вейсгейм'")
        print("Пример: python delete_user_records.py 'Максим' --force")
        print("\nПараметры:")
        print("  имя_пользователя - имя пользователя для поиска (частичное совпадение)")
        print("  --force         - принудительное удаление без подтверждения")
        sys.exit(1)
    
    user_name = sys.argv[1]
    force = '--force' in sys.argv
    
    delete_user_records_script(user_name, force)

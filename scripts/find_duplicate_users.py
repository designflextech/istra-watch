#!/usr/bin/env python3
"""
Скрипт для поиска и удаления дублирующихся пользователей в базе данных
"""
import sys
import os

# Добавляем корневую директорию проекта в путь
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from bot.utils.database import get_db_connection, get_db_cursor, set_search_path, qualified_table_name


def find_duplicates():
    """Найти всех дублирующихся пользователей"""
    with get_db_connection() as conn:
        with get_db_cursor(conn) as cursor:
            set_search_path(cursor)
            users_table = qualified_table_name('users')
            
            # Ищем дубликаты по telegram_handle
            cursor.execute(
                f"""
                SELECT 
                    telegram_handle, 
                    COUNT(*) as count,
                    ARRAY_AGG(id ORDER BY id) as user_ids,
                    ARRAY_AGG(name ORDER BY id) as names,
                    ARRAY_AGG(telegram_id ORDER BY id) as telegram_ids
                FROM {users_table}
                WHERE telegram_handle IS NOT NULL
                GROUP BY LOWER(telegram_handle)
                HAVING COUNT(*) > 1
                ORDER BY count DESC
                """
            )
            handle_duplicates = cursor.fetchall()
            
            # Ищем дубликаты по имени
            cursor.execute(
                f"""
                SELECT 
                    name, 
                    COUNT(*) as count,
                    ARRAY_AGG(id ORDER BY id) as user_ids,
                    ARRAY_AGG(telegram_handle ORDER BY id) as handles,
                    ARRAY_AGG(telegram_id ORDER BY id) as telegram_ids
                FROM {users_table}
                WHERE name IS NOT NULL
                GROUP BY LOWER(name)
                HAVING COUNT(*) > 1
                ORDER BY count DESC
                """
            )
            name_duplicates = cursor.fetchall()
            
            return handle_duplicates, name_duplicates


def get_user_records_count(user_id):
    """Получить количество записей пользователя"""
    with get_db_connection() as conn:
        with get_db_cursor(conn) as cursor:
            set_search_path(cursor)
            records_table = qualified_table_name('records')
            cursor.execute(
                f"SELECT COUNT(*) FROM {records_table} WHERE user_id = %s",
                (user_id,)
            )
            return cursor.fetchone()['count']


def delete_user(user_id):
    """Удалить пользователя по ID"""
    with get_db_connection() as conn:
        with get_db_cursor(conn) as cursor:
            set_search_path(cursor)
            users_table = qualified_table_name('users')
            cursor.execute(
                f"DELETE FROM {users_table} WHERE id = %s",
                (user_id,)
            )
            return cursor.rowcount > 0


def main():
    print("🔍 Поиск дублирующихся пользователей...\n")
    
    handle_duplicates, name_duplicates = find_duplicates()
    
    if not handle_duplicates and not name_duplicates:
        print("✅ Дубликатов не найдено!")
        return
    
    # Отображаем дубликаты по telegram_handle
    if handle_duplicates:
        print("📋 Дубликаты по telegram_handle:")
        print("-" * 80)
        for dup in handle_duplicates:
            print(f"\nTelegram Handle: {dup['telegram_handle']}")
            print(f"Количество дубликатов: {dup['count']}")
            print(f"User IDs: {dup['user_ids']}")
            print(f"Имена: {dup['names']}")
            print(f"Telegram IDs: {dup['telegram_ids']}")
            
            # Показываем количество записей для каждого
            for user_id in dup['user_ids']:
                records_count = get_user_records_count(user_id)
                print(f"  - User ID {user_id}: {records_count} записей")
    
    # Отображаем дубликаты по имени
    if name_duplicates:
        print("\n📋 Дубликаты по имени:")
        print("-" * 80)
        for dup in name_duplicates:
            print(f"\nИмя: {dup['name']}")
            print(f"Количество дубликатов: {dup['count']}")
            print(f"User IDs: {dup['user_ids']}")
            print(f"Telegram Handles: {dup['handles']}")
            print(f"Telegram IDs: {dup['telegram_ids']}")
            
            # Показываем количество записей для каждого
            for user_id in dup['user_ids']:
                records_count = get_user_records_count(user_id)
                print(f"  - User ID {user_id}: {records_count} записей")
    
    # Спрашиваем пользователя, хочет ли он удалить дубликаты
    print("\n" + "=" * 80)
    response = input("\nХотите удалить дубликаты? (yes/no): ").strip().lower()
    
    if response not in ['yes', 'y', 'да']:
        print("Отменено.")
        return
    
    print("\n⚠️  ВНИМАНИЕ: Будут удалены пользователи с меньшим количеством записей.")
    print("Если у всех одинаковое количество записей, будет удален пользователь с большим ID.")
    
    response = input("\nПродолжить? (yes/no): ").strip().lower()
    if response not in ['yes', 'y', 'да']:
        print("Отменено.")
        return
    
    # Обрабатываем дубликаты
    deleted_count = 0
    
    # Обрабатываем дубликаты по telegram_handle
    for dup in handle_duplicates:
        user_ids = dup['user_ids']
        
        # Получаем количество записей для каждого пользователя
        records_counts = [(user_id, get_user_records_count(user_id)) for user_id in user_ids]
        
        # Сортируем: сначала по количеству записей (больше лучше), затем по ID (меньше лучше)
        records_counts.sort(key=lambda x: (-x[1], x[0]))
        
        # Оставляем первого (с наибольшим количеством записей или наименьшим ID)
        keep_id = records_counts[0][0]
        
        # Удаляем остальных
        for user_id, count in records_counts[1:]:
            print(f"Удаляю User ID {user_id} (записей: {count})...")
            if delete_user(user_id):
                deleted_count += 1
                print(f"  ✅ Удален")
            else:
                print(f"  ❌ Ошибка удаления")
        
        print(f"Оставлен User ID {keep_id} (записей: {records_counts[0][1]})")
    
    # Обрабатываем дубликаты по имени (только если они не были обработаны выше)
    for dup in name_duplicates:
        # Проверяем, что все пользователи имеют одинаковый telegram_handle
        handles = [h for h in dup['handles'] if h is not None]
        if len(set([h.lower() for h in handles])) == 1:
            # Уже обработали выше
            continue
        
        user_ids = dup['user_ids']
        
        # Получаем количество записей для каждого пользователя
        records_counts = [(user_id, get_user_records_count(user_id)) for user_id in user_ids]
        
        # Сортируем: сначала по количеству записей (больше лучше), затем по ID (меньше лучше)
        records_counts.sort(key=lambda x: (-x[1], x[0]))
        
        # Оставляем первого (с наибольшим количеством записей или наименьшим ID)
        keep_id = records_counts[0][0]
        
        # Удаляем остальных
        for user_id, count in records_counts[1:]:
            print(f"Удаляю User ID {user_id} (записей: {count})...")
            if delete_user(user_id):
                deleted_count += 1
                print(f"  ✅ Удален")
            else:
                print(f"  ❌ Ошибка удаления")
        
        print(f"Оставлен User ID {keep_id} (записей: {records_counts[0][1]})")
    
    print(f"\n✅ Удалено {deleted_count} дублирующихся пользователей")


if __name__ == '__main__':
    main()


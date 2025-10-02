"""Запуск миграций"""
import os
import sys
import importlib.util
from pathlib import Path

# Добавляем корневую директорию в путь для импорта
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from bot.utils.database import get_db_connection, get_db_cursor, set_search_path, qualified_table_name


def get_migration_files():
    """Получение списка файлов миграций"""
    migrations_dir = Path(__file__).parent
    migration_files = sorted([
        f for f in os.listdir(migrations_dir)
        if f.endswith('.py') and f[0].isdigit() and f != 'run.py'
    ])
    return migration_files


def load_migration(file_path):
    """Загрузка модуля миграции"""
    spec = importlib.util.spec_from_file_location("migration", file_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def ensure_migrations_table():
    """Создание таблицы миграций, если она не существует"""
    with get_db_connection() as conn:
        with get_db_cursor(conn) as cursor:
            set_search_path(cursor)
            migrations_table = qualified_table_name('migrations')
            cursor.execute(f"""
                CREATE TABLE IF NOT EXISTS {migrations_table} (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL UNIQUE,
                    applied_at TIMESTAMP DEFAULT NOW()
                );
            """)


def get_applied_migrations():
    """Получение списка примененных миграций"""
    ensure_migrations_table()
    with get_db_connection() as conn:
        with get_db_cursor(conn) as cursor:
            set_search_path(cursor)
            migrations_table = qualified_table_name('migrations')
            cursor.execute(f"SELECT name FROM {migrations_table} ORDER BY name")
            return [row['name'] for row in cursor.fetchall()]


def apply_migration(migration_name, migration_module):
    """Применение миграции"""
    with get_db_connection() as conn:
        with get_db_cursor(conn) as cursor:
            set_search_path(cursor)
            print(f"Применение миграции: {migration_name}")
            migration_module.up(cursor)
            migrations_table = qualified_table_name('migrations')
            cursor.execute(
                f"INSERT INTO {migrations_table} (name) VALUES (%s)",
                (migration_name,)
            )
            print(f"✓ Миграция {migration_name} применена")


def rollback_migration(migration_name, migration_module):
    """Откат миграции"""
    with get_db_connection() as conn:
        with get_db_cursor(conn) as cursor:
            set_search_path(cursor)
            print(f"Откат миграции: {migration_name}")
            migration_module.down(cursor)
            migrations_table = qualified_table_name('migrations')
            cursor.execute(
                f"DELETE FROM {migrations_table} WHERE name = %s",
                (migration_name,)
            )
            print(f"✓ Миграция {migration_name} откачена")


def migrate():
    """Применение всех новых миграций"""
    migrations_dir = Path(__file__).parent
    migration_files = get_migration_files()
    applied = get_applied_migrations()
    
    new_migrations = [m for m in migration_files if m not in applied]
    
    if not new_migrations:
        print("Нет новых миграций для применения")
        return
    
    for migration_file in new_migrations:
        migration_path = migrations_dir / migration_file
        migration_module = load_migration(migration_path)
        apply_migration(migration_file, migration_module)
    
    print(f"\nВсего применено миграций: {len(new_migrations)}")


def rollback(steps=1):
    """Откат последних миграций"""
    migrations_dir = Path(__file__).parent
    applied = get_applied_migrations()
    
    if not applied:
        print("Нет миграций для отката")
        return
    
    to_rollback = applied[-steps:]
    
    for migration_name in reversed(to_rollback):
        migration_path = migrations_dir / migration_name
        if not migration_path.exists():
            print(f"⚠ Файл миграции {migration_name} не найден, пропускаем")
            continue
        
        migration_module = load_migration(migration_path)
        rollback_migration(migration_name, migration_module)
    
    print(f"\nВсего откачено миграций: {len(to_rollback)}")


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Управление миграциями базы данных')
    parser.add_argument('command', choices=['migrate', 'rollback'], 
                       help='Команда для выполнения')
    parser.add_argument('--steps', type=int, default=1,
                       help='Количество шагов для отката (только для rollback)')
    
    args = parser.parse_args()
    
    try:
        if args.command == 'migrate':
            migrate()
        elif args.command == 'rollback':
            rollback(args.steps)
    except Exception as e:
        print(f"Ошибка: {e}")
        sys.exit(1)


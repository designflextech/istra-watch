"""Создание таблицы для отслеживания примененных миграций"""
import sys
from pathlib import Path

# Добавляем корневую директорию в путь для импорта
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from bot.utils.database import set_search_path, qualified_table_name


def up(cursor):
    """Применение миграции"""
    set_search_path(cursor)
    
    cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS {qualified_table_name('migrations')} (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            applied_at TIMESTAMP DEFAULT NOW()
        );
    """)


def down(cursor):
    """Откат миграции"""
    set_search_path(cursor)
    
    cursor.execute(f"""
        DROP TABLE IF EXISTS {qualified_table_name('migrations')} CASCADE;
    """)


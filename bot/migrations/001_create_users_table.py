"""Создание таблицы пользователей"""
import sys
from pathlib import Path

# Добавляем корневую директорию в путь для импорта
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from bot.utils.database import set_search_path, qualified_table_name


def up(cursor):
    """Применение миграции"""
    set_search_path(cursor)
    
    cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS {qualified_table_name('users')} (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255),
            telegram_handle VARCHAR(255),
            telegram_id BIGINT UNIQUE,
            name VARCHAR(255) NOT NULL,
            phone VARCHAR(50),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON {qualified_table_name('users')}(telegram_id);
        CREATE INDEX IF NOT EXISTS idx_users_telegram_handle ON {qualified_table_name('users')}(telegram_handle);
    """)


def down(cursor):
    """Откат миграции"""
    set_search_path(cursor)
    
    cursor.execute(f"""
        DROP TABLE IF EXISTS {qualified_table_name('users')} CASCADE;
    """)


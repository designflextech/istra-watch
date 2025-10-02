"""Создание таблицы адресов"""
import sys
from pathlib import Path

# Добавляем корневую директорию в путь для импорта
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from bot.utils.database import set_search_path, qualified_table_name


def up(cursor):
    """Применение миграции"""
    set_search_path(cursor)
    
    cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS {qualified_table_name('addresses')} (
            id SERIAL PRIMARY KEY,
            formatted_address TEXT NOT NULL,
            latitude DOUBLE PRECISION NOT NULL,
            longitude DOUBLE PRECISION NOT NULL,
            country VARCHAR(255),
            city VARCHAR(255),
            street VARCHAR(255),
            building VARCHAR(50),
            created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_addresses_coordinates ON {qualified_table_name('addresses')}(latitude, longitude);
    """)


def down(cursor):
    """Откат миграции"""
    set_search_path(cursor)
    
    cursor.execute(f"""
        DROP TABLE IF EXISTS {qualified_table_name('addresses')} CASCADE;
    """)


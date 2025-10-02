"""Создание таблицы записей о приходах/уходах"""
import sys
from pathlib import Path

# Добавляем корневую директорию в путь для импорта
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from bot.utils.database import set_search_path, qualified_table_name


def up(cursor):
    """Применение миграции"""
    set_search_path(cursor)
    
    users_table = qualified_table_name('users')
    addresses_table = qualified_table_name('addresses')
    records_table = qualified_table_name('records')
    
    cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS {records_table} (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES {users_table}(id) ON DELETE CASCADE,
            record_type VARCHAR(20) NOT NULL CHECK (record_type IN ('arrival', 'departure')),
            timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
            comment TEXT,
            latitude DOUBLE PRECISION NOT NULL,
            longitude DOUBLE PRECISION NOT NULL,
            address_id INTEGER REFERENCES {addresses_table}(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_records_user_id ON {records_table}(user_id);
        CREATE INDEX IF NOT EXISTS idx_records_timestamp ON {records_table}(timestamp);
        CREATE INDEX IF NOT EXISTS idx_records_user_date ON {records_table}(user_id, DATE(timestamp));
    """)


def down(cursor):
    """Откат миграции"""
    set_search_path(cursor)
    
    cursor.execute(f"""
        DROP TABLE IF EXISTS {qualified_table_name('records')} CASCADE;
    """)


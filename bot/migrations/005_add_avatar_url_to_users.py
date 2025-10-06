"""Добавление поля avatar_url в таблицу пользователей"""
import sys
from pathlib import Path

# Добавляем корневую директорию в путь для импорта
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from bot.utils.database import set_search_path, qualified_table_name


def up(cursor):
    """Применение миграции"""
    set_search_path(cursor)
    
    cursor.execute(f"""
        ALTER TABLE {qualified_table_name('users')} 
        ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(1024);
    """)


def down(cursor):
    """Откат миграции"""
    set_search_path(cursor)
    
    cursor.execute(f"""
        ALTER TABLE {qualified_table_name('users')} 
        DROP COLUMN IF EXISTS avatar_url;
    """)


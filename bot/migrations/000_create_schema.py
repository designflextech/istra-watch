"""Создание схемы базы данных"""
import sys
from pathlib import Path

# Добавляем корневую директорию в путь для импорта
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from bot.config import DB_SCHEMA


def up(cursor):
    """Применение миграции"""
    # Создаем схему если она не существует
    cursor.execute(f"""
        CREATE SCHEMA IF NOT EXISTS {DB_SCHEMA};
    """)
    
    # Устанавливаем search_path
    cursor.execute(f"""
        SET search_path TO {DB_SCHEMA}, public;
    """)
    
    print(f"✓ Схема {DB_SCHEMA} создана")


def down(cursor):
    """Откат миграции"""
    # Удаляем схему только если она пустая
    # CASCADE удалит все объекты в схеме
    cursor.execute(f"""
        DROP SCHEMA IF EXISTS {DB_SCHEMA} CASCADE;
    """)
    
    print(f"✓ Схема {DB_SCHEMA} удалена")


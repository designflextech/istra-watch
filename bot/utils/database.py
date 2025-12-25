"""Утилиты для работы с базой данных"""
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from typing import Generator, Optional
import logging
import os
import sys
import importlib.util
from pathlib import Path
from bot.config import DATABASE_URL, DB_SCHEMA

logger = logging.getLogger(__name__)

# Глобальный пул соединений
_connection_pool: Optional[pool.ThreadedConnectionPool] = None


def init_connection_pool(minconn: int = 1, maxconn: int = 20):
    """
    Инициализация пула соединений с БД
    
    Args:
        minconn: Минимальное количество соединений
        maxconn: Максимальное количество соединений
    """
    global _connection_pool
    try:
        _connection_pool = pool.ThreadedConnectionPool(
            minconn,
            maxconn,
            DATABASE_URL
        )
        logger.info(f"Connection pool initialized: {minconn}-{maxconn} connections")
    except Exception as e:
        logger.error(f"Failed to initialize connection pool: {e}")
        raise


def close_connection_pool():
    """Закрытие пула соединений"""
    global _connection_pool
    if _connection_pool:
        _connection_pool.closeall()
        _connection_pool = None
        logger.info("Connection pool closed")


@contextmanager
def get_db_connection() -> Generator:
    """Контекстный менеджер для получения соединения из пула"""
    if _connection_pool is None:
        # Fallback: создаем прямое соединение если пул не инициализирован
        logger.warning("Connection pool not initialized, using direct connection")
        conn = psycopg2.connect(DATABASE_URL)
        try:
            yield conn
            conn.commit()
        except Exception:
            try:
                if not conn.closed:
                    conn.rollback()
            except Exception as rollback_error:
                logger.warning(f"Failed to rollback: {rollback_error}")
            raise
        finally:
            conn.close()
        return
    
    # Получаем соединение из пула
    conn = _connection_pool.getconn()
    connection_valid = True

    # Проверяем живость соединения перед использованием
    try:
        with conn.cursor() as test_cursor:
            test_cursor.execute("SELECT 1")
    except (psycopg2.OperationalError, psycopg2.InterfaceError) as e:
        logger.warning(f"Connection from pool is dead: {e}")
        connection_valid = False
        # Возвращаем мертвое соединение в пул с флагом close=True
        # Это корректно удалит его из пула
        try:
            _connection_pool.putconn(conn, close=True)
        except Exception as put_error:
            logger.warning(f"Failed to return dead connection to pool: {put_error}")

        # Пытаемся получить новое соединение из пула (до 3 попыток)
        for attempt in range(3):
            try:
                conn = _connection_pool.getconn()
                with conn.cursor() as test_cursor:
                    test_cursor.execute("SELECT 1")
                connection_valid = True
                logger.info(f"Got valid connection from pool on attempt {attempt + 1}")
                break
            except (psycopg2.OperationalError, psycopg2.InterfaceError) as retry_error:
                logger.warning(f"Connection attempt {attempt + 1} failed: {retry_error}")
                try:
                    _connection_pool.putconn(conn, close=True)
                except Exception:
                    pass

        # Если все попытки из пула неудачны, создаем прямое соединение
        if not connection_valid:
            logger.warning("All pool connections dead, creating direct connection")
            conn = psycopg2.connect(DATABASE_URL)
            connection_valid = True

    try:
        yield conn
        conn.commit()
    except Exception:
        # Безопасная обработка rollback на возможно мертвом соединении
        try:
            if not conn.closed:
                conn.rollback()
        except Exception as rollback_error:
            logger.warning(f"Failed to rollback: {rollback_error}")
        raise
    finally:
        # Всегда пытаемся вернуть соединение в пул
        try:
            if conn.closed:
                # Соединение закрыто, ничего не делаем
                logger.debug("Connection already closed, skipping putconn")
            else:
                _connection_pool.putconn(conn)
        except Exception as put_error:
            # Если не удалось вернуть в пул, закрываем соединение
            logger.warning(f"Failed to return connection to pool: {put_error}")
            try:
                conn.close()
            except Exception:
                pass


@contextmanager
def get_db_cursor(conn=None) -> Generator:
    """Контекстный менеджер для получения курсора БД"""
    if conn is None:
        with get_db_connection() as connection:
            cursor = connection.cursor(cursor_factory=RealDictCursor)
            try:
                yield cursor
            finally:
                cursor.close()
    else:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            yield cursor
        finally:
            cursor.close()


def get_schema() -> str:
    """
    Получение имени схемы из конфигурации
    
    Returns:
        Имя схемы БД
    """
    return DB_SCHEMA


def qualified_table_name(table_name: str) -> str:
    """
    Получение полного имени таблицы с учетом схемы
    
    Args:
        table_name: Имя таблицы
        
    Returns:
        Полное имя таблицы в формате schema.table
    """
    return f"{DB_SCHEMA}.{table_name}"


def set_search_path(cursor) -> None:
    """
    Установка search_path для схемы
    
    Args:
        cursor: Курсор базы данных
    """
    cursor.execute(f"SET search_path TO {DB_SCHEMA}, public")


def check_schema_exists() -> bool:
    """
    Проверка существования схемы
    
    Returns:
        True если схема существует, False иначе
    """
    try:
        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                cursor.execute("""
                    SELECT schema_name 
                    FROM information_schema.schemata 
                    WHERE schema_name = %s
                """, (DB_SCHEMA,))
                return cursor.fetchone() is not None
    except Exception as e:
        logger.error(f"Ошибка проверки существования схемы: {e}")
        return False


def get_migration_files():
    """Получение списка файлов миграций"""
    migrations_dir = Path(__file__).parent.parent / 'migrations'
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
            logger.info(f"Применение миграции: {migration_name}")
            migration_module.up(cursor)
            migrations_table = qualified_table_name('migrations')
            cursor.execute(
                f"INSERT INTO {migrations_table} (name) VALUES (%s)",
                (migration_name,)
            )
            logger.info(f"✓ Миграция {migration_name} применена")


def auto_migrate():
    """
    Автоматическое применение миграций при запуске
    """
    try:
        logger.info("Проверка и инициализация базы данных...")
        
        # Проверяем существование схемы
        if not check_schema_exists():
            logger.info(f"Схема {DB_SCHEMA} не существует, создаем...")
            # Создаем схему
            with get_db_connection() as conn:
                with get_db_cursor(conn) as cursor:
                    cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {DB_SCHEMA}")
                    cursor.execute(f"SET search_path TO {DB_SCHEMA}, public")
            logger.info(f"✓ Схема {DB_SCHEMA} создана")
        
        # Получаем список миграций
        migrations_dir = Path(__file__).parent.parent / 'migrations'
        migration_files = get_migration_files()
        applied = get_applied_migrations()
        
        new_migrations = [m for m in migration_files if m not in applied]
        
        if not new_migrations:
            logger.info("Нет новых миграций для применения")
            return
        
        logger.info(f"Найдено {len(new_migrations)} новых миграций")
        
        # Применяем новые миграции
        for migration_file in new_migrations:
            migration_path = migrations_dir / migration_file
            migration_module = load_migration(migration_path)
            apply_migration(migration_file, migration_module)
        
        logger.info(f"✓ Всего применено миграций: {len(new_migrations)}")
        
    except Exception as e:
        logger.error(f"Ошибка при автоматической миграции: {e}")
        raise


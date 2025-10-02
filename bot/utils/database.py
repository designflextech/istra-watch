"""Утилиты для работы с базой данных"""
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from typing import Generator, Optional
import logging
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
            conn.rollback()
            raise
        finally:
            conn.close()
        return
    
    # Получаем соединение из пула
    conn = _connection_pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        # Возвращаем соединение в пул
        _connection_pool.putconn(conn)


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


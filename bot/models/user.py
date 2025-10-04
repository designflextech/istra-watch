"""Модель пользователя"""
from typing import Optional, List, Dict, Any
from bot.utils.database import get_db_connection, get_db_cursor, set_search_path, qualified_table_name


class User:
    """Модель пользователя"""
    
    def __init__(
        self,
        id: Optional[int] = None,
        email: Optional[str] = None,
        telegram_handle: Optional[str] = None,
        telegram_id: Optional[int] = None,
        name: Optional[str] = None,
        phone: Optional[str] = None,
        created_at: Optional[str] = None,
        updated_at: Optional[str] = None
    ):
        self.id = id
        self.email = email
        self.telegram_handle = telegram_handle
        self.telegram_id = telegram_id
        self.name = name
        self.phone = phone
        self.created_at = created_at
        self.updated_at = updated_at
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'User':
        """Создание пользователя из словаря"""
        return cls(**data)
    
    def to_dict(self) -> Dict[str, Any]:
        """Преобразование пользователя в словарь"""
        return {
            'id': self.id,
            'email': self.email,
            'telegram_handle': self.telegram_handle,
            'telegram_id': self.telegram_id,
            'name': self.name,
            'phone': self.phone,
            'created_at': self.created_at.isoformat() if hasattr(self.created_at, 'isoformat') else str(self.created_at) if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if hasattr(self.updated_at, 'isoformat') else str(self.updated_at) if self.updated_at else None
        }
    
    @staticmethod
    def create(
        name: str,
        telegram_handle: str,
        email: Optional[str] = None,
        telegram_id: Optional[int] = None,
        phone: Optional[str] = None
    ) -> 'User':
        """Создание нового пользователя"""
        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                set_search_path(cursor)
                users_table = qualified_table_name('users')
                cursor.execute(
                    f"""
                    INSERT INTO {users_table} (name, telegram_handle, email, telegram_id, phone)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING *
                    """,
                    (name, telegram_handle, email, telegram_id, phone)
                )
                result = cursor.fetchone()
                return User.from_dict(dict(result))
    
    @staticmethod
    def get_by_id(user_id: int) -> Optional['User']:
        """Получение пользователя по ID"""
        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                set_search_path(cursor)
                users_table = qualified_table_name('users')
                cursor.execute(f"SELECT * FROM {users_table} WHERE id = %s", (user_id,))
                result = cursor.fetchone()
                return User.from_dict(dict(result)) if result else None
    
    @staticmethod
    def get_by_telegram_id(telegram_id: int) -> Optional['User']:
        """Получение пользователя по Telegram ID"""
        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                set_search_path(cursor)
                users_table = qualified_table_name('users')
                cursor.execute(f"SELECT * FROM {users_table} WHERE telegram_id = %s", (telegram_id,))
                result = cursor.fetchone()
                return User.from_dict(dict(result)) if result else None
    
    @staticmethod
    def get_by_telegram_handle(telegram_handle: str) -> Optional['User']:
        """Получение пользователя по Telegram handle"""
        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                set_search_path(cursor)
                users_table = qualified_table_name('users')
                cursor.execute(f"SELECT * FROM {users_table} WHERE telegram_handle = %s", (telegram_handle,))
                result = cursor.fetchone()
                return User.from_dict(dict(result)) if result else None
    
    @staticmethod
    def get_all(exclude_admins: bool = False, admin_ids: List[int] = None) -> List['User']:
        """Получение всех пользователей"""
        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                set_search_path(cursor)
                users_table = qualified_table_name('users')
                if exclude_admins and admin_ids:
                    cursor.execute(
                        f"SELECT * FROM {users_table} WHERE telegram_id NOT IN %s OR telegram_id IS NULL",
                        (tuple(admin_ids),)
                    )
                else:
                    cursor.execute(f"SELECT * FROM {users_table}")
                results = cursor.fetchall()
                return [User.from_dict(dict(row)) for row in results]
    
    def update(self) -> 'User':
        """Обновление пользователя"""
        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                set_search_path(cursor)
                users_table = qualified_table_name('users')
                cursor.execute(
                    f"""
                    UPDATE {users_table} 
                    SET email = %s, telegram_handle = %s, telegram_id = %s, 
                        name = %s, phone = %s, updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                    """,
                    (self.email, self.telegram_handle, self.telegram_id, 
                     self.name, self.phone, self.id)
                )
                result = cursor.fetchone()
                return User.from_dict(dict(result))
    
    @staticmethod
    def delete(user_id: int) -> bool:
        """Удаление пользователя"""
        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                set_search_path(cursor)
                users_table = qualified_table_name('users')
                cursor.execute(f"DELETE FROM {users_table} WHERE id = %s", (user_id,))
                return cursor.rowcount > 0


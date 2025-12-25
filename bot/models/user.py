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
        avatar_url: Optional[str] = None,
        created_at: Optional[str] = None,
        updated_at: Optional[str] = None
    ):
        self.id = id
        self.email = email
        self.telegram_handle = telegram_handle
        self.telegram_id = telegram_id
        self.name = name
        self.phone = phone
        self.avatar_url = avatar_url
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
            'avatar_url': self.avatar_url,
            'created_at': self.created_at.isoformat() if hasattr(self.created_at, 'isoformat') else str(self.created_at) if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if hasattr(self.updated_at, 'isoformat') else str(self.updated_at) if self.updated_at else None
        }
    
    @staticmethod
    def create(
        name: str,
        telegram_handle: str,
        email: Optional[str] = None,
        telegram_id: Optional[int] = None,
        phone: Optional[str] = None,
        avatar_url: Optional[str] = None
    ) -> 'User':
        """Создание нового пользователя"""
        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                set_search_path(cursor)
                users_table = qualified_table_name('users')
                cursor.execute(
                    f"""
                    INSERT INTO {users_table} (name, telegram_handle, email, telegram_id, phone, avatar_url)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING *
                    """,
                    (name, telegram_handle, email, telegram_id, phone, avatar_url)
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
        # Ищем по handle игнорируя регистр и наличие символа @
        # Работает для всех вариантов: deechkin, Deechkin, @deechkin, @Deechkin и т.д.
        if not telegram_handle:
            return None
        handle = telegram_handle.strip()
        if not handle:
            return None

        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                set_search_path(cursor)
                users_table = qualified_table_name('users')
                # Убираем @ из обеих сторон и сравниваем в нижнем регистре
                # LTRIM убирает @ слева, LOWER приводит к нижнему регистру
                cursor.execute(
                    f"SELECT * FROM {users_table} WHERE LOWER(LTRIM(telegram_handle, '@')) = LOWER(LTRIM(%s, '@'))",
                    (handle,)
                )
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
                        name = %s, phone = %s, avatar_url = %s, updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                    """,
                    (self.email, self.telegram_handle, self.telegram_id, 
                     self.name, self.phone, self.avatar_url, self.id)
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

    @staticmethod
    def get_all_as_dict() -> Dict[str, 'User']:
        """
        Получение всех пользователей как словарь {telegram_handle: User}
        Оптимизировано для быстрого поиска по handle
        """
        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                set_search_path(cursor)
                users_table = qualified_table_name('users')
                cursor.execute(f"SELECT * FROM {users_table}")
                results = cursor.fetchall()
                users_dict = {}
                for row in results:
                    user = User.from_dict(dict(row))
                    if user.telegram_handle:
                        # Нормализуем handle для ключа
                        normalized = user.telegram_handle.lower().lstrip('@')
                        users_dict[normalized] = user
                return users_dict

    @staticmethod
    def get_all_names_lowercase() -> set:
        """
        Получение множества всех имен пользователей в нижнем регистре
        Оптимизировано для быстрой проверки дубликатов
        """
        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                set_search_path(cursor)
                users_table = qualified_table_name('users')
                cursor.execute(f"SELECT LOWER(name) as name FROM {users_table}")
                results = cursor.fetchall()
                return {row['name'] for row in results if row['name']}

    @staticmethod
    def batch_create(users_data: List[Dict[str, Any]]) -> int:
        """
        Batch создание пользователей (один INSERT для всех)

        Args:
            users_data: Список словарей с данными пользователей
                       [{name, telegram_handle, email?, telegram_id?, phone?, avatar_url?}, ...]

        Returns:
            Количество созданных пользователей
        """
        if not users_data:
            return 0

        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                set_search_path(cursor)
                users_table = qualified_table_name('users')

                # Подготовка данных для batch insert
                values = []
                params = []
                for user in users_data:
                    values.append("(%s, %s, %s, %s, %s, %s)")
                    params.extend([
                        user.get('name'),
                        user.get('telegram_handle'),
                        user.get('email'),
                        user.get('telegram_id'),
                        user.get('phone'),
                        user.get('avatar_url')
                    ])

                query = f"""
                    INSERT INTO {users_table} (name, telegram_handle, email, telegram_id, phone, avatar_url)
                    VALUES {', '.join(values)}
                    ON CONFLICT (telegram_handle) DO NOTHING
                """
                cursor.execute(query, params)
                return cursor.rowcount

    @staticmethod
    def batch_update_names(updates: List[Dict[str, Any]]) -> int:
        """
        Batch обновление имен пользователей

        Args:
            updates: Список [{id, name}, ...]

        Returns:
            Количество обновленных пользователей
        """
        if not updates:
            return 0

        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                set_search_path(cursor)
                users_table = qualified_table_name('users')

                # Используем CASE для batch update
                ids = [u['id'] for u in updates]
                cases = " ".join([f"WHEN id = {u['id']} THEN %s" for u in updates])
                names = [u['name'] for u in updates]

                query = f"""
                    UPDATE {users_table}
                    SET name = CASE {cases} END,
                        updated_at = NOW()
                    WHERE id = ANY(%s)
                """
                cursor.execute(query, names + [ids])
                return cursor.rowcount


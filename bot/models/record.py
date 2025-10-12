"""Модель записи о приходе/уходе"""
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from bot.utils.database import get_db_connection, get_db_cursor, set_search_path, qualified_table_name


class Record:
    """Модель записи о приходе/уходе"""
    
    ARRIVAL = 'arrival'
    DEPARTURE = 'departure'
    
    def __init__(
        self,
        id: Optional[int] = None,
        user_id: Optional[int] = None,
        record_type: Optional[str] = None,
        timestamp: Optional[datetime] = None,
        comment: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        address_id: Optional[int] = None,
        created_at: Optional[str] = None,
        photo_url: Optional[str] = None,
        photo_uploaded_at: Optional[datetime] = None
    ):
        self.id = id
        self.user_id = user_id
        self.record_type = record_type
        self.timestamp = timestamp
        self.comment = comment
        self.latitude = latitude
        self.longitude = longitude
        self.address_id = address_id
        self.created_at = created_at
        self.photo_url = photo_url
        self.photo_uploaded_at = photo_uploaded_at
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Record':
        """Создание записи из словаря"""
        return cls(**data)
    
    def to_dict(self) -> Dict[str, Any]:
        """Преобразование записи в словарь"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'record_type': self.record_type,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'comment': self.comment,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'address_id': self.address_id,
            'created_at': self.created_at.isoformat() if hasattr(self.created_at, 'isoformat') else str(self.created_at) if self.created_at else None,
            'photo_url': self.photo_url,
            'photo_uploaded_at': self.photo_uploaded_at.isoformat() if self.photo_uploaded_at else None,
            'has_photo': bool(self.photo_url)
        }
    
    @staticmethod
    def create(
        user_id: int,
        record_type: str,
        latitude: float,
        longitude: float,
        address_id: Optional[int] = None,
        comment: Optional[str] = None,
        timestamp: Optional[datetime] = None
    ) -> 'Record':
        """Создание новой записи"""
        if timestamp is None:
            timestamp = datetime.now()
        
        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                set_search_path(cursor)
                records_table = qualified_table_name('records')
                cursor.execute(
                    f"""
                    INSERT INTO {records_table} (user_id, record_type, timestamp, comment, latitude, longitude, address_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                    """,
                    (user_id, record_type, timestamp, comment, latitude, longitude, address_id)
                )
                result = cursor.fetchone()
                return Record.from_dict(dict(result))
    
    @staticmethod
    def get_by_id(record_id: int) -> Optional['Record']:
        """Получение записи по ID"""
        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                set_search_path(cursor)
                records_table = qualified_table_name('records')
                cursor.execute(f"SELECT * FROM {records_table} WHERE id = %s", (record_id,))
                result = cursor.fetchone()
                return Record.from_dict(dict(result)) if result else None
    
    def update(self) -> 'Record':
        """Обновление записи в базе данных"""
        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                set_search_path(cursor)
                records_table = qualified_table_name('records')
                cursor.execute(
                    f"""
                    UPDATE {records_table}
                    SET user_id = %s,
                        record_type = %s,
                        timestamp = %s,
                        comment = %s,
                        latitude = %s,
                        longitude = %s,
                        address_id = %s,
                        photo_url = %s,
                        photo_uploaded_at = %s
                    WHERE id = %s
                    RETURNING *
                    """,
                    (self.user_id, self.record_type, self.timestamp, self.comment,
                     self.latitude, self.longitude, self.address_id,
                     self.photo_url, self.photo_uploaded_at, self.id)
                )
                result = cursor.fetchone()
                return Record.from_dict(dict(result)) if result else self
    
    @staticmethod
    def get_by_user_and_date(user_id: int, target_date: date) -> List['Record']:
        """Получение записей пользователя за определенную дату"""
        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                set_search_path(cursor)
                records_table = qualified_table_name('records')
                cursor.execute(
                    f"""
                    SELECT * FROM {records_table} 
                    WHERE user_id = %s 
                    AND DATE(timestamp) = %s
                    ORDER BY timestamp DESC
                    """,
                    (user_id, target_date)
                )
                results = cursor.fetchall()
                return [Record.from_dict(dict(row)) for row in results]
    
    @staticmethod
    def get_latest_by_user_and_date(user_id: int, target_date: date) -> Optional['Record']:
        """Получение последней записи пользователя за определенную дату"""
        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                set_search_path(cursor)
                records_table = qualified_table_name('records')
                cursor.execute(
                    f"""
                    SELECT * FROM {records_table} 
                    WHERE user_id = %s 
                    AND DATE(timestamp) = %s
                    ORDER BY timestamp DESC
                    LIMIT 1
                    """,
                    (user_id, target_date)
                )
                result = cursor.fetchone()
                return Record.from_dict(dict(result)) if result else None
    
    @staticmethod
    def get_all_by_date(target_date: date) -> List['Record']:
        """Получение всех записей за определенную дату"""
        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                set_search_path(cursor)
                records_table = qualified_table_name('records')
                cursor.execute(
                    f"""
                    SELECT * FROM {records_table} 
                    WHERE DATE(timestamp) = %s
                    ORDER BY timestamp DESC
                    """,
                    (target_date,)
                )
                results = cursor.fetchall()
                return [Record.from_dict(dict(row)) for row in results]
    
    @staticmethod
    def get_by_user(user_id: int, limit: int = 100) -> List['Record']:
        """Получение записей пользователя"""
        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                set_search_path(cursor)
                records_table = qualified_table_name('records')
                cursor.execute(
                    f"""
                    SELECT * FROM {records_table} 
                    WHERE user_id = %s 
                    ORDER BY timestamp DESC
                    LIMIT %s
                    """,
                    (user_id, limit)
                )
                results = cursor.fetchall()
                return [Record.from_dict(dict(row)) for row in results]
    
    @staticmethod
    def get_all_by_date_with_users_and_addresses(target_date: date) -> List[Dict[str, Any]]:
        """
        Получение всех записей за дату с информацией о пользователях и адресах (оптимизировано с JOIN)
        
        Args:
            target_date: Целевая дата
            
        Returns:
            Список словарей с пользователями и их последними записями за дату
        """
        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                set_search_path(cursor)
                users_table = qualified_table_name('users')
                records_table = qualified_table_name('records')
                addresses_table = qualified_table_name('addresses')
                
                cursor.execute(
                    f"""
                    SELECT 
                        u.id as user_id,
                        u.name as user_name,
                        u.email as user_email,
                        u.telegram_handle as user_telegram_handle,
                        u.telegram_id as user_telegram_id,
                        u.phone as user_phone,
                        u.avatar_url as user_avatar_url,
                        u.created_at as user_created_at,
                        u.updated_at as user_updated_at,
                        r.id as record_id,
                        r.record_type,
                        r.timestamp,
                        r.comment,
                        r.latitude,
                        r.longitude,
                        r.address_id,
                        r.created_at as record_created_at,
                        r.photo_url,
                        a.formatted_address,
                        a.latitude as address_latitude,
                        a.longitude as address_longitude,
                        a.country,
                        a.city,
                        a.street,
                        a.building,
                        a.created_at as address_created_at
                    FROM {users_table} u
                    LEFT JOIN LATERAL (
                        SELECT * FROM {records_table} 
                        WHERE user_id = u.id 
                        AND DATE(timestamp) = %s
                        ORDER BY timestamp DESC 
                        LIMIT 1
                    ) r ON true
                    LEFT JOIN {addresses_table} a ON r.address_id = a.id
                    ORDER BY u.name
                    """,
                    (target_date,)
                )
                results = cursor.fetchall()
                
                output = []
                for row in results:
                    user_data = {
                        'id': row['user_id'],
                        'name': row['user_name'],
                        'email': row['user_email'],
                        'telegram_handle': row['user_telegram_handle'],
                        'telegram_id': row['user_telegram_id'],
                        'phone': row['user_phone'],
                        'avatar_url': row['user_avatar_url'],
                        'created_at': row['user_created_at'].isoformat() if row['user_created_at'] else None,
                        'updated_at': row['user_updated_at'].isoformat() if row['user_updated_at'] else None
                    }
                    
                    record_data = None
                    if row['record_id']:
                        record_data = {
                            'id': row['record_id'],
                            'type': row['record_type'],
                            'timestamp': row['timestamp'].isoformat() if row['timestamp'] else None,
                            'comment': row['comment'],
                            'latitude': row['latitude'],
                            'longitude': row['longitude'],
                            'address': row['formatted_address'] if row['formatted_address'] else None,
                            'has_photo': bool(row.get('photo_url'))  # Для lazy loading
                        }
                    
                    output.append({
                        'user': user_data,
                        'record': record_data
                    })
                
                return output
    
    @staticmethod
    def get_by_id_with_details(record_id: int) -> Optional[Dict[str, Any]]:
        """
        Получение записи с деталями пользователя и адреса (оптимизировано с JOIN)
        
        Args:
            record_id: ID записи
            
        Returns:
            Словарь с полной информацией о записи или None
        """
        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                set_search_path(cursor)
                users_table = qualified_table_name('users')
                records_table = qualified_table_name('records')
                addresses_table = qualified_table_name('addresses')
                
                cursor.execute(
                    f"""
                    SELECT 
                        r.id as record_id,
                        r.user_id,
                        r.record_type,
                        r.timestamp,
                        r.comment,
                        r.latitude as record_latitude,
                        r.longitude as record_longitude,
                        r.address_id,
                        r.created_at as record_created_at,
                        r.photo_url,
                        r.photo_uploaded_at,
                        u.name as user_name,
                        u.email as user_email,
                        u.telegram_handle as user_telegram_handle,
                        u.telegram_id as user_telegram_id,
                        u.phone as user_phone,
                        u.avatar_url as user_avatar_url,
                        u.created_at as user_created_at,
                        u.updated_at as user_updated_at,
                        a.formatted_address,
                        a.latitude as address_latitude,
                        a.longitude as address_longitude,
                        a.country,
                        a.city,
                        a.street,
                        a.building,
                        a.created_at as address_created_at
                    FROM {records_table} r
                    LEFT JOIN {users_table} u ON r.user_id = u.id
                    LEFT JOIN {addresses_table} a ON r.address_id = a.id
                    WHERE r.id = %s
                    """,
                    (record_id,)
                )
                result = cursor.fetchone()
                
                if not result:
                    return None
                
                record_data = {
                    'id': result['record_id'],
                    'user_id': result['user_id'],
                    'record_type': result['record_type'],
                    'timestamp': result['timestamp'].isoformat() if result['timestamp'] else None,
                    'comment': result['comment'],
                    'latitude': result['record_latitude'],
                    'longitude': result['record_longitude'],
                    'address_id': result['address_id'],
                    'created_at': result['record_created_at'].isoformat() if result['record_created_at'] else None,
                    'photo_url': result['photo_url'],
                    'photo_uploaded_at': result['photo_uploaded_at'].isoformat() if result['photo_uploaded_at'] else None,
                    'has_photo': bool(result['photo_url'])
                }
                
                user_data = None
                if result['user_id']:
                    user_data = {
                        'id': result['user_id'],
                        'name': result['user_name'],
                        'email': result['user_email'],
                        'telegram_handle': result['user_telegram_handle'],
                        'telegram_id': result['user_telegram_id'],
                        'phone': result['user_phone'],
                        'avatar_url': result['user_avatar_url'],
                        'created_at': result['user_created_at'].isoformat() if result['user_created_at'] else None,
                        'updated_at': result['user_updated_at'].isoformat() if result['user_updated_at'] else None
                    }
                
                address_data = None
                if result['address_id']:
                    address_data = {
                        'id': result['address_id'],
                        'formatted_address': result['formatted_address'],
                        'latitude': result['address_latitude'],
                        'longitude': result['address_longitude'],
                        'country': result['country'],
                        'city': result['city'],
                        'street': result['street'],
                        'building': result['building'],
                        'created_at': result['address_created_at'].isoformat() if result['address_created_at'] else None
                    }
                
                return {
                    'record': record_data,
                    'user': user_data,
                    'address': address_data
                }
    
    @staticmethod
    def get_by_user_with_addresses(user_id: int, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Получение записей пользователя с адресами (оптимизировано с JOIN)
        
        Args:
            user_id: ID пользователя
            limit: Максимальное количество записей
            
        Returns:
            Список словарей с записями и адресами
        """
        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                set_search_path(cursor)
                records_table = qualified_table_name('records')
                addresses_table = qualified_table_name('addresses')
                
                cursor.execute(
                    f"""
                    SELECT 
                        r.id as record_id,
                        r.user_id,
                        r.record_type,
                        r.timestamp,
                        r.comment,
                        r.latitude as record_latitude,
                        r.longitude as record_longitude,
                        r.address_id,
                        r.created_at as record_created_at,
                        a.formatted_address,
                        a.latitude as address_latitude,
                        a.longitude as address_longitude,
                        a.country,
                        a.city,
                        a.street,
                        a.building,
                        a.created_at as address_created_at
                    FROM {records_table} r
                    LEFT JOIN {addresses_table} a ON r.address_id = a.id
                    WHERE r.user_id = %s
                    ORDER BY r.timestamp DESC
                    LIMIT %s
                    """,
                    (user_id, limit)
                )
                results = cursor.fetchall()
                
                output = []
                for row in results:
                    record_data = {
                        'id': row['record_id'],
                        'user_id': row['user_id'],
                        'record_type': row['record_type'],
                        'timestamp': row['timestamp'].isoformat() if row['timestamp'] else None,
                        'comment': row['comment'],
                        'latitude': row['record_latitude'],
                        'longitude': row['record_longitude'],
                        'address_id': row['address_id'],
                        'created_at': row['record_created_at'].isoformat() if row['record_created_at'] else None
                    }
                    
                    address_data = None
                    if row['address_id']:
                        address_data = {
                            'id': row['address_id'],
                            'formatted_address': row['formatted_address'],
                            'latitude': row['address_latitude'],
                            'longitude': row['address_longitude'],
                            'country': row['country'],
                            'city': row['city'],
                            'street': row['street'],
                            'building': row['building'],
                            'created_at': row['address_created_at'].isoformat() if row['address_created_at'] else None
                        }
                    
                    output.append({
                        'record': record_data,
                        'address': address_data
                    })
                
                return output


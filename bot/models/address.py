"""Модель адреса"""
from typing import Optional, Dict, Any
from bot.utils.database import get_db_connection, get_db_cursor, set_search_path, qualified_table_name


class Address:
    """Модель адреса"""
    
    def __init__(
        self,
        id: Optional[int] = None,
        formatted_address: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        country: Optional[str] = None,
        city: Optional[str] = None,
        street: Optional[str] = None,
        building: Optional[str] = None,
        created_at: Optional[str] = None
    ):
        self.id = id
        self.formatted_address = formatted_address
        self.latitude = latitude
        self.longitude = longitude
        self.country = country
        self.city = city
        self.street = street
        self.building = building
        self.created_at = created_at
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Address':
        """Создание адреса из словаря"""
        return cls(**data)
    
    def to_dict(self) -> Dict[str, Any]:
        """Преобразование адреса в словарь"""
        return {
            'id': self.id,
            'formatted_address': self.formatted_address,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'country': self.country,
            'city': self.city,
            'street': self.street,
            'building': self.building,
            'created_at': self.created_at
        }
    
    @staticmethod
    def create(
        formatted_address: str,
        latitude: float,
        longitude: float,
        country: Optional[str] = None,
        city: Optional[str] = None,
        street: Optional[str] = None,
        building: Optional[str] = None
    ) -> 'Address':
        """Создание нового адреса"""
        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                set_search_path(cursor)
                addresses_table = qualified_table_name('addresses')
                cursor.execute(
                    f"""
                    INSERT INTO {addresses_table} (formatted_address, latitude, longitude, country, city, street, building)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                    """,
                    (formatted_address, latitude, longitude, country, city, street, building)
                )
                result = cursor.fetchone()
                return Address.from_dict(dict(result))
    
    @staticmethod
    def get_by_id(address_id: int) -> Optional['Address']:
        """Получение адреса по ID"""
        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                set_search_path(cursor)
                addresses_table = qualified_table_name('addresses')
                cursor.execute(f"SELECT * FROM {addresses_table} WHERE id = %s", (address_id,))
                result = cursor.fetchone()
                return Address.from_dict(dict(result)) if result else None
    
    @staticmethod
    def get_by_coordinates(latitude: float, longitude: float, precision: float = 0.0001) -> Optional['Address']:
        """Получение адреса по координатам (с учетом погрешности)"""
        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                set_search_path(cursor)
                addresses_table = qualified_table_name('addresses')
                cursor.execute(
                    f"""
                    SELECT * FROM {addresses_table} 
                    WHERE ABS(latitude - %s) < %s 
                    AND ABS(longitude - %s) < %s
                    LIMIT 1
                    """,
                    (latitude, precision, longitude, precision)
                )
                result = cursor.fetchone()
                return Address.from_dict(dict(result)) if result else None


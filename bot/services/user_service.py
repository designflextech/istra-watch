"""Сервис для работы с пользователями"""
from typing import List, Optional
import openpyxl
from bot.models.user import User
from bot.config import TELEGRAM_ADMIN_IDS


class UserService:
    """Сервис для работы с пользователями"""
    
    @staticmethod
    def process_excel_file(file_path: str) -> dict:
        """
        Обработка Excel файла с пользователями
        
        Args:
            file_path: Путь к файлу
            
        Returns:
            Словарь с результатами обработки
        """
        try:
            workbook = openpyxl.load_workbook(file_path)
            sheet = workbook.active
            
            added = 0
            skipped = 0
            errors = []
            
            # Пропускаем заголовок (первую строку)
            for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
                try:
                    if not row or len(row) < 2:
                        continue
                    
                    name = str(row[0]).strip() if row[0] else None
                    telegram_handle = str(row[1]).strip() if row[1] else None
                    
                    if not name or not telegram_handle:
                        errors.append(f"Строка {row_idx}: пропущены обязательные поля")
                        continue
                    
                    # Нормализуем handle: добавляем @ если его нет и приводим к нижнему регистру
                    if not telegram_handle.startswith('@'):
                        telegram_handle = f"@{telegram_handle}"
                    telegram_handle = telegram_handle.lower()
                    
                    # Проверяем, существует ли пользователь по telegram_handle
                    existing_user = User.get_by_telegram_handle(telegram_handle)
                    
                    # Дополнительная проверка: проверяем, нет ли пользователя с таким же именем
                    # (защита от случайного создания дубликатов)
                    if not existing_user:
                        from bot.utils.database import get_db_connection, get_db_cursor, set_search_path, qualified_table_name
                        with get_db_connection() as conn:
                            with get_db_cursor(conn) as cursor:
                                set_search_path(cursor)
                                users_table = qualified_table_name('users')
                                cursor.execute(
                                    f"SELECT * FROM {users_table} WHERE LOWER(name) = LOWER(%s)",
                                    (name,)
                                )
                                duplicate_name = cursor.fetchone()
                                if duplicate_name:
                                    errors.append(f"Строка {row_idx}: пользователь с именем '{name}' уже существует")
                                    skipped += 1
                                    continue
                    
                    if existing_user:
                        skipped += 1
                    else:
                        # Создаем нового пользователя (telegram_id будет заполнен при первом входе)
                        User.create(
                            name=name,
                            telegram_handle=telegram_handle
                        )
                        added += 1
                
                except Exception as e:
                    errors.append(f"Строка {row_idx}: {str(e)}")
            
            return {
                'success': True,
                'added': added,
                'skipped': skipped,
                'errors': errors
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def get_all_users(exclude_admins: bool = False) -> List[User]:
        """
        Получение всех пользователей
        
        Args:
            exclude_admins: Исключить администраторов
            
        Returns:
            Список пользователей
        """
        return User.get_all(exclude_admins=exclude_admins, admin_ids=TELEGRAM_ADMIN_IDS)
    
    @staticmethod
    def get_user_by_telegram_id(telegram_id: int) -> Optional[User]:
        """
        Получение пользователя по Telegram ID
        
        Args:
            telegram_id: Telegram ID пользователя
            
        Returns:
            Пользователь или None
        """
        return User.get_by_telegram_id(telegram_id)
    
    @staticmethod
    def get_user_by_telegram_handle(telegram_handle: str) -> Optional[User]:
        """
        Получение пользователя по Telegram handle
        
        Args:
            telegram_handle: Telegram handle пользователя
            
        Returns:
            Пользователь или None
        """
        return User.get_by_telegram_handle(telegram_handle)
    
    @staticmethod
    def update_user_telegram_id(user_id: int, telegram_id: int) -> Optional[User]:
        """
        Обновление Telegram ID пользователя
        
        Args:
            user_id: ID пользователя
            telegram_id: Telegram ID
            
        Returns:
            Обновленный пользователь или None
        """
        user = User.get_by_id(user_id)
        if user:
            user.telegram_id = telegram_id
            return user.update()
        return None


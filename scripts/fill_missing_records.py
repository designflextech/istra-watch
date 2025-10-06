"""Скрипт для заполнения недостающих записей от последней даты до сегодня"""
import sys
from pathlib import Path
from datetime import datetime, timedelta
import random

# Добавляем корневую директорию в путь
sys.path.insert(0, str(Path(__file__).parent.parent))

from bot.models.user import User
from bot.models.address import Address
from bot.models.record import Record


def fill_missing_records(start_date_str: str, end_date_str: str = None):
    """
    Генерация записей для сотрудников с указанной даты до сегодня
    
    Args:
        start_date_str: Начальная дата в формате YYYY-MM-DD
        end_date_str: Конечная дата в формате YYYY-MM-DD (по умолчанию - сегодня)
    """
    print("🚀 Начинаем заполнение недостающих записей...")
    
    # Парсим даты
    start_date = datetime.strptime(start_date_str, '%Y-%m-%d').replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    
    if end_date_str:
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').replace(
            hour=0, minute=0, second=0, microsecond=0
        )
    else:
        end_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    print(f"📅 Период: {start_date.strftime('%Y-%m-%d')} → {end_date.strftime('%Y-%m-%d')}")
    
    # Получаем адрес офиса
    print("\n📍 Получаем адрес офиса...")
    office_address = Address.get_by_coordinates(55.758532, 37.613997)
    
    if not office_address:
        print("❌ Адрес офиса не найден. Создаем новый...")
        office_address = Address.create(
            formatted_address="Россия, Москва, Тверская улица, дом 1",
            latitude=55.758532,
            longitude=37.613997,
            country="Россия",
            city="Москва",
            street="Тверская улица",
            building="1"
        )
    
    print(f"✅ Адрес: {office_address.formatted_address} (ID: {office_address.id})")
    
    # Получаем сотрудников (исключая администраторов для надежности)
    print("\n👥 Получаем список сотрудников...")
    
    # Определяем сотрудников с их процентом посещаемости
    employees_config = {
        "Иван Петров": 1.0,
        "Мария Сидорова": 0.9,
        "Алексей Смирнов": 0.7,
        "Елена Козлова": 0.85,
        "Дмитрий Волков": 0.5,
    }
    
    # Получаем всех пользователей
    all_users = User.get_all()
    
    employees = []
    for user in all_users:
        if user.name in employees_config:
            employees.append({
                "user": user,
                "attendance_rate": employees_config[user.name]
            })
            print(f"✅ Найден сотрудник: {user.name} (ID: {user.id})")
    
    # Сообщаем о недостающих сотрудниках
    found_names = {emp["user"].name for emp in employees}
    for name in employees_config.keys():
        if name not in found_names:
            print(f"⚠️  Сотрудник не найден: {name}")
    
    if not employees:
        print("❌ Не найдено ни одного сотрудника")
        return
    
    # Создаем записи за указанный период
    print("\n📝 Создаем записи о приходах/уходах...")
    
    total_records = 0
    current_date = start_date
    
    while current_date <= end_date:
        # Пропускаем выходные (суббота=5, воскресенье=6)
        if current_date.weekday() in [5, 6]:
            print(f"\n  📅 {current_date.strftime('%Y-%m-%d (%A)')} - выходной, пропускаем")
            current_date += timedelta(days=1)
            continue
        
        print(f"\n  📅 {current_date.strftime('%Y-%m-%d (%A)')}")
        
        for emp in employees:
            user = emp["user"]
            attendance_rate = emp["attendance_rate"]
            
            # Случайно решаем, придет ли сотрудник в этот день
            if random.random() > attendance_rate:
                print(f"    ⚪ {user.name} не пришел(а)")
                continue
            
            # Генерируем случайное время прихода (8:00 - 10:00)
            arrival_hour = random.randint(8, 9)
            arrival_minute = random.randint(0, 59)
            arrival_time = current_date.replace(hour=arrival_hour, minute=arrival_minute)
            
            # Генерируем случайное время ухода (17:00 - 19:00)
            departure_hour = random.randint(17, 18)
            departure_minute = random.randint(0, 59)
            departure_time = current_date.replace(hour=departure_hour, minute=departure_minute)
            
            try:
                # Создаем запись о приходе
                arrival_record = Record.create(
                    user_id=user.id,
                    record_type=Record.ARRIVAL,
                    latitude=office_address.latitude,
                    longitude=office_address.longitude,
                    address_id=office_address.id,
                    timestamp=arrival_time,
                    comment="Приход на работу"
                )
                
                # Создаем запись об уходе
                departure_record = Record.create(
                    user_id=user.id,
                    record_type=Record.DEPARTURE,
                    latitude=office_address.latitude,
                    longitude=office_address.longitude,
                    address_id=office_address.id,
                    timestamp=departure_time,
                    comment="Уход с работы"
                )
                
                print(f"    ✅ {user.name}: приход {arrival_time.strftime('%H:%M')} → уход {departure_time.strftime('%H:%M')}")
                total_records += 2
                
            except Exception as e:
                print(f"    ❌ Ошибка при создании записей для {user.name}: {e}")
        
        current_date += timedelta(days=1)
    
    # Итоги
    print("\n" + "="*60)
    print("✨ Заполнение недостающих записей завершено!")
    print(f"📊 Создано записей: {total_records}")
    print("="*60)


if __name__ == '__main__':
    try:
        # По умолчанию генерируем записи с 4 октября по сегодня
        start_date = '2025-10-04'
        
        # Можно передать параметры: python fill_missing_records.py 2025-10-04 2025-10-06
        if len(sys.argv) > 1:
            start_date = sys.argv[1]
        
        end_date = None
        if len(sys.argv) > 2:
            end_date = sys.argv[2]
        
        fill_missing_records(start_date, end_date)
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Генерация прервана пользователем")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Критическая ошибка: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


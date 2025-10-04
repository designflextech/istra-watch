"""Скрипт для генерации тестовых данных - подчиненные и их записи за последнюю неделю"""
import sys
from pathlib import Path
from datetime import datetime, timedelta
import random

# Добавляем корневую директорию в путь
sys.path.insert(0, str(Path(__file__).parent.parent))

from bot.models.user import User
from bot.models.address import Address
from bot.models.record import Record


def generate_test_data():
    """
    Генерация тестовых данных:
    - Один адрес (офис)
    - Несколько подчиненных
    - Записи о приходах/уходах за последнюю неделю
    """
    print("🚀 Начинаем генерацию тестовых данных...")
    
    # 1. Создаем адрес офиса
    print("\n📍 Создаем адрес офиса...")
    try:
        office_address = Address.create(
            formatted_address="Россия, Москва, Тверская улица, дом 1",
            latitude=55.758532,
            longitude=37.613997,
            country="Россия",
            city="Москва",
            street="Тверская улица",
            building="1"
        )
        print(f"✅ Адрес создан: {office_address.formatted_address} (ID: {office_address.id})")
    except Exception as e:
        print(f"❌ Ошибка при создании адреса: {e}")
        return
    
    # 2. Создаем подчиненных
    print("\n👥 Создаем подчиненных...")
    employees_data = [
        {
            "name": "Иван Петров",
            "telegram_handle": "@ivan_petrov_test",
            "phone": "+7-900-111-22-33",
            "attendance_rate": 1.0  # 100% посещаемость
        },
        {
            "name": "Мария Сидорова",
            "telegram_handle": "@maria_sidorova_test",
            "phone": "+7-900-222-33-44",
            "attendance_rate": 0.9  # 90% посещаемость
        },
        {
            "name": "Алексей Смирнов",
            "telegram_handle": "@alexey_smirnov_test",
            "phone": "+7-900-333-44-55",
            "attendance_rate": 0.7  # 70% посещаемость
        },
        {
            "name": "Елена Козлова",
            "telegram_handle": "@elena_kozlova_test",
            "phone": "+7-900-444-55-66",
            "attendance_rate": 0.85  # 85% посещаемость
        },
        {
            "name": "Дмитрий Волков",
            "telegram_handle": "@dmitry_volkov_test",
            "phone": "+7-900-555-66-77",
            "attendance_rate": 0.5  # 50% посещаемость (часто пропускает)
        },
    ]
    
    employees = []
    for emp_data in employees_data:
        try:
            user = User.create(
                name=emp_data["name"],
                telegram_handle=emp_data["telegram_handle"],
                phone=emp_data["phone"]
            )
            employees.append({
                "user": user,
                "attendance_rate": emp_data["attendance_rate"]
            })
            print(f"✅ Создан сотрудник: {user.name} (ID: {user.id})")
        except Exception as e:
            print(f"❌ Ошибка при создании сотрудника {emp_data['name']}: {e}")
    
    if not employees:
        print("❌ Не удалось создать ни одного сотрудника")
        return
    
    # 3. Создаем записи о приходах/уходах за последнюю неделю
    print("\n📝 Создаем записи о приходах/уходах за последнюю неделю...")
    
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    total_records = 0
    
    # Проходим по последним 7 дням (включая сегодня)
    for days_ago in range(6, -1, -1):
        current_date = today - timedelta(days=days_ago)
        
        # Пропускаем выходные (суббота=5, воскресенье=6)
        if current_date.weekday() in [5, 6]:
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
    
    # Итоги
    print("\n" + "="*60)
    print("✨ Генерация тестовых данных завершена!")
    print(f"📊 Создано:")
    print(f"   - Адресов: 1")
    print(f"   - Сотрудников: {len(employees)}")
    print(f"   - Записей: {total_records}")
    print("="*60)


if __name__ == '__main__':
    try:
        generate_test_data()
    except KeyboardInterrupt:
        print("\n\n⚠️  Генерация прервана пользователем")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Критическая ошибка: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


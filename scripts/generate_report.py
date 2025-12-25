#!/usr/bin/env python3
"""Скрипт для генерации отчета о дисциплине сотрудников"""
import sys
import os
from datetime import datetime, date

# Добавляем корневую директорию проекта в путь
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bot.services.report_generator import generate_discipline_report
from bot.utils.database import init_connection_pool, close_connection_pool
from bot.utils.timezone import today_msk


def main():
    """Основная функция"""
    # Инициализация пула соединений
    init_connection_pool()
    
    try:
        # Параметры периода (можно изменить)
        # По умолчанию - текущий месяц (московское время)
        today = today_msk()
        date_from = date(today.year, today.month, 1)
        date_to = today
        
        # Если переданы аргументы командной строки
        if len(sys.argv) >= 3:
            try:
                date_from = datetime.strptime(sys.argv[1], '%Y-%m-%d').date()
                date_to = datetime.strptime(sys.argv[2], '%Y-%m-%d').date()
            except ValueError:
                print("Неверный формат даты. Используйте YYYY-MM-DD")
                print("Пример: python generate_report.py 2025-10-01 2025-10-31")
                return
        
        # Имя выходного файла
        output_filename = f"bot/Отчёт_о_дисциплине_сотрудников_за_{date_from.strftime('%d.%m.%Y')}__{date_to.strftime('%d.%m.%Y')}.pdf"
        
        print(f"Генерация отчета за период: {date_from} — {date_to}")
        print(f"Выходной файл: {output_filename}")
        
        # Генерация отчета
        generate_discipline_report(date_from, date_to, output_filename)
        
        print(f"✓ Отчет успешно создан: {output_filename}")
        
    except Exception as e:
        print(f"Ошибка при генерации отчета: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Закрытие пула соединений
        close_connection_pool()


if __name__ == '__main__':
    main()


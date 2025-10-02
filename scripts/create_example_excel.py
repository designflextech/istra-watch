"""Скрипт для создания примера Excel файла"""
import openpyxl
from pathlib import Path


def create_example_excel():
    """Создание примера Excel файла для загрузки сотрудников"""
    workbook = openpyxl.Workbook()
    sheet = workbook.active
    sheet.title = "Сотрудники"
    
    # Заголовки
    sheet['A1'] = 'ФИО'
    sheet['B1'] = 'Телеграм хендлер'
    
    # Примеры данных
    sheet['A2'] = 'Иванов Иван Иванович'
    sheet['B2'] = '@ivanov'
    
    sheet['A3'] = 'Петров Петр Петрович'
    sheet['B3'] = '@petrov'
    
    sheet['A4'] = 'Сидоров Сидор Сидорович'
    sheet['B4'] = '@sidorov'
    
    # Настройка ширины колонок
    sheet.column_dimensions['A'].width = 30
    sheet.column_dimensions['B'].width = 20
    
    # Сохранение файла
    output_path = Path(__file__).parent.parent / 'example_employees.xlsx'
    workbook.save(output_path)
    print(f"Пример файла создан: {output_path}")


if __name__ == '__main__':
    create_example_excel()


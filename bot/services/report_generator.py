"""Генератор PDF отчетов о дисциплине сотрудников"""
from datetime import datetime, date, time, timedelta
from typing import List, Dict, Any, Optional, Tuple
from io import BytesIO

from weasyprint import HTML

from bot.utils.database import get_db_connection, get_db_cursor, set_search_path, qualified_table_name
from bot.utils.timezone import now_msk, msk_date_range_utc
from bot.config import TELEGRAM_ADMIN_IDS, WORK_START_HOUR, WORK_END_HOUR


class DisciplineReportGenerator:
    """Генератор отчетов о дисциплине сотрудников"""
    
    # Рабочее время (из переменных окружения)
    WORK_START = time(WORK_START_HOUR, 0)
    WORK_END = time(WORK_END_HOUR, 0)
    
    # Дата начала учета посещаемости
    TRACKING_START_DATE = date(2025, 10, 21)
    
    def __init__(self, date_from: date, date_to: date):
        self.date_from = date_from
        self.date_to = date_to
        self.report_date = now_msk()  # Используем московское время
        
    def _get_work_days_count(self) -> int:
        """Подсчет рабочих дней с учетом даты начала учета"""
        count = 0
        # Начинаем считать с максимальной даты между началом периода и датой начала учета
        current = max(self.date_from, self.TRACKING_START_DATE)
        while current <= self.date_to:
            if current.weekday() < 5:
                count += 1
            current += timedelta(days=1)
        return count
    
    def _get_employees_data(self) -> List[Dict[str, Any]]:
        """Получение данных о сотрудниках"""
        with get_db_connection() as conn:
            with get_db_cursor(conn) as cursor:
                set_search_path(cursor)
                users_table = qualified_table_name('users')
                records_table = qualified_table_name('records')
                
                admin_filter = ""
                if TELEGRAM_ADMIN_IDS:
                    admin_filter = f"AND (u.telegram_id IS NULL OR u.telegram_id NOT IN ({','.join(map(str, TELEGRAM_ADMIN_IDS))}))"
                
                query = f"""
                    SELECT 
                        u.id, u.name, u.telegram_id,
                        r.id as record_id, r.record_type, r.timestamp, r.comment, r.photo_url
                    FROM {users_table} u
                    LEFT JOIN {records_table} r ON r.user_id = u.id
                        AND DATE(r.timestamp) BETWEEN %s AND %s
                    WHERE 1=1 {admin_filter}
                    ORDER BY u.name, r.timestamp
                """
                
                cursor.execute(query, (self.date_from, self.date_to))
                results = cursor.fetchall()
                
                employees = {}
                for row in results:
                    user_id = row['id']
                    if user_id not in employees:
                        employees[user_id] = {'id': user_id, 'name': row['name'], 'records': []}
                    
                    if row['record_id']:
                        employees[user_id]['records'].append({
                            'type': row['record_type'],
                            'timestamp': row['timestamp'],
                            'comment': row['comment'],
                            'has_photo': bool(row['photo_url'])
                        })
                
                return list(employees.values())
    
    def _calculate_employee_stats(self, employee: Dict[str, Any]) -> Dict[str, Any]:
        """Расчет статистики сотрудника"""
        records = employee['records']
        daily_records = {}
        
        for record in records:
            record_date = record['timestamp'].date()
            if record_date not in daily_records:
                daily_records[record_date] = {'arrival': None, 'departure': None}
            
            if record['type'] == 'arrival' and daily_records[record_date]['arrival'] is None:
                daily_records[record_date]['arrival'] = record
            elif record['type'] == 'departure' and daily_records[record_date]['departure'] is None:
                daily_records[record_date]['departure'] = record
        
        arrivals, departures = [], []
        late_count, early_leave_count = 0, 0
        photo_count = sum(1 for r in records if r['has_photo'])
        comment_count = sum(1 for r in records if r['comment'])
        
        for day_data in daily_records.values():
            if day_data['arrival']:
                arrival_time = day_data['arrival']['timestamp'].time()
                arrivals.append(arrival_time)
                if arrival_time > self.WORK_START:
                    late_count += 1
            
            if day_data['departure']:
                departure_time = day_data['departure']['timestamp'].time()
                departures.append(departure_time)
                if departure_time < self.WORK_END:
                    early_leave_count += 1
        
        # Подсчет пропусков (рабочих дней без отметки прихода)
        work_days = self._get_work_days_count()
        missed_days = work_days - len(arrivals)
        
        return {
            'name': employee['name'],
            'total_records': len(records),
            'avg_arrival': self._calculate_average_time(arrivals) if arrivals else None,
            'avg_departure': self._calculate_average_time(departures) if departures else None,
            'late_count': late_count,
            'early_leave_count': early_leave_count,
            'missed_days': missed_days,
            'photo_count': photo_count,
            'comment_count': comment_count,
            'arrivals': arrivals,
            'departures': departures
        }
    
    def _calculate_average_time(self, times: List[time]) -> time:
        if not times:
            return time(0, 0)
        total_minutes = sum(t.hour * 60 + t.minute for t in times)
        avg_minutes = total_minutes // len(times)
        return time(avg_minutes // 60, avg_minutes % 60)
    
    def _format_time(self, t: Optional[time]) -> str:
        return "—" if t is None else f"{t.hour:02d}:{t.minute:02d}"
    
    def _calculate_summary_stats(self, employees_stats: List[Dict[str, Any]]) -> Dict[str, Any]:
        total_employees = len(employees_stats)
        work_days = self._get_work_days_count()
        
        all_arrivals, all_departures = [], []
        total_late, total_early_leave, total_photos, total_comments, total_missed = 0, 0, 0, 0, 0
        
        for stats in employees_stats:
            all_arrivals.extend(stats['arrivals'])
            all_departures.extend(stats['departures'])
            total_late += stats['late_count']
            total_early_leave += stats['early_leave_count']
            total_photos += stats['photo_count']
            total_comments += stats['comment_count']
            total_missed += stats['missed_days']
        
        return {
            'total_employees': total_employees,
            'work_days': work_days,
            'avg_arrival': self._calculate_average_time(all_arrivals) if all_arrivals else None,
            'avg_departure': self._calculate_average_time(all_departures) if all_departures else None,
            'total_late': total_late,
            'total_early_leave': total_early_leave,
            'total_missed': total_missed,
            'total_photos': total_photos,
            'avg_comments_per_employee_per_day': round(total_comments / (total_employees * work_days), 1) if total_employees and work_days else 0
        }
    
    def _get_top_employees(self, employees_stats: List[Dict[str, Any]], count: int = 3) -> Tuple[List[str], List[str]]:
        # Топ пунктуальных: меньше опозданий и меньше пропусков
        sorted_punctual = sorted(employees_stats, key=lambda x: (x['late_count'], x['missed_days']))
        punctual = [s['name'] for s in sorted_punctual[:count] if s['arrivals']]
        
        # Топ опаздывающих: больше опозданий и больше пропусков
        sorted_late = sorted(employees_stats, key=lambda x: (x['late_count'], x['missed_days']), reverse=True)
        late = [s['name'] for s in sorted_late[:count] if s['late_count'] > 0 or s['missed_days'] > 0]
        
        return punctual, late
    
    def _calculate_avg_late_and_early(self, employees_stats: List[Dict[str, Any]]) -> Tuple[int, int]:
        late_minutes, early_minutes = [], []
        
        for stats in employees_stats:
            for arrival_time in stats['arrivals']:
                if arrival_time > self.WORK_START:
                    delta = arrival_time.hour * 60 + arrival_time.minute - self.WORK_START.hour * 60 - self.WORK_START.minute
                    late_minutes.append(delta)
            
            for departure_time in stats['departures']:
                if departure_time < self.WORK_END:
                    delta = self.WORK_END.hour * 60 + self.WORK_END.minute - departure_time.hour * 60 - departure_time.minute
                    early_minutes.append(delta)
        
        return (sum(late_minutes) // len(late_minutes) if late_minutes else 0,
                sum(early_minutes) // len(early_minutes) if early_minutes else 0)
    
    def _get_recommendation(self, summary_stats: Dict[str, Any]) -> str:
        """Выбор наиболее подходящей рекомендации из 10 вариантов"""
        total_employees = summary_stats['total_employees']
        work_days = summary_stats['work_days']
        avg_late_rate = summary_stats['total_late'] / total_employees if total_employees else 0
        avg_missed_rate = summary_stats['total_missed'] / total_employees if total_employees else 0
        
        recommendations = [
            # 1. Отличная дисциплина
            {
                'condition': lambda: avg_late_rate < 0.5 and avg_missed_rate < 0.5,
                'text': 'Продолжайте поддерживать высокий уровень дисциплины. Рекомендуется внедрить систему поощрений для мотивации сотрудников.'
            },
            # 2. Хорошая дисциплина с небольшими опозданиями
            {
                'condition': lambda: avg_late_rate < 2 and avg_missed_rate < 1,
                'text': 'Рекомендуется настроить напоминания сотрудникам о начале смены за 15 минут для минимизации редких опозданий.'
            },
            # 3. Проблема с пропусками
            {
                'condition': lambda: avg_missed_rate >= 3,
                'text': 'Критично высокий уровень пропусков. Необходимо провести индивидуальные беседы с сотрудниками и выяснить причины отсутствий. Рассмотрите введение системы уведомлений об обязательных отметках.'
            },
            # 4. Проблема с опозданиями
            {
                'condition': lambda: avg_late_rate >= 5,
                'text': 'Высокий уровень опозданий. Рекомендуется проработать систему штрафов или депремирования за систематические опоздания. Проведите анализ причин опозданий.'
            },
            # 5. Комбинированная проблема (опоздания + пропуски)
            {
                'condition': lambda: avg_late_rate >= 2 and avg_missed_rate >= 2,
                'text': 'Дисциплина требует серьезного внимания. Необходимо внедрить строгий контроль посещаемости, провести общее собрание и разъяснить важность соблюдения графика. Рассмотрите введение системы наказаний.'
            },
            # 6. Средние показатели с упором на опоздания
            {
                'condition': lambda: 2 <= avg_late_rate < 5,
                'text': 'Рекомендуется проработать систему уведомлений при частых опозданиях, а также рассмотреть возможность гибкого графика для отдельных сотрудников.'
            },
            # 7. Средние показатели с упором на пропуски
            {
                'condition': lambda: 1 <= avg_missed_rate < 3,
                'text': 'Необходимо усилить контроль за отметками прихода. Рекомендуется внедрить автоматические напоминания о необходимости отмечаться и проверять причины пропущенных отметок.'
            },
            # 8. Небольшие проблемы
            {
                'condition': lambda: avg_late_rate < 3 and avg_missed_rate < 2,
                'text': 'Дисциплина на хорошем уровне. Для улучшения рекомендуется внедрить геймификацию (рейтинги пунктуальности) и систему небольших поощрений.'
            },
            # 9. Критическая ситуация
            {
                'condition': lambda: avg_late_rate >= 7 or avg_missed_rate >= 5,
                'text': 'Критическая ситуация с дисциплиной. Требуется немедленное вмешательство руководства: проведение дисциплинарных мероприятий, пересмотр системы мотивации, возможно, кадровые изменения.'
            },
            # 10. Дефолтная рекомендация
            {
                'condition': lambda: True,
                'text': 'Рекомендуется регулярный мониторинг дисциплины и своевременное реагирование на отклонения. Проводите еженедельный анализ показателей.'
            }
        ]
        
        # Находим первую подходящую рекомендацию
        for rec in recommendations:
            if rec['condition']():
                return rec['text']
        
        # Возвращаем последнюю (дефолтную)
        return recommendations[-1]['text']
    
    def _generate_html(self, employees_stats, summary_stats, punctual, late_employees, avg_late, avg_early) -> str:
        # Оценка дисциплины с учетом опозданий и пропусков
        total_employees = summary_stats['total_employees']
        avg_late_rate = summary_stats['total_late'] / total_employees if total_employees else 0
        avg_missed_rate = summary_stats['total_missed'] / total_employees if total_employees else 0
        
        # Комбинированная оценка дисциплины
        if avg_late_rate < 1 and avg_missed_rate < 0.5:
            discipline_level = "отличная"
        elif avg_late_rate < 3 and avg_missed_rate < 2:
            discipline_level = "хорошая"
        elif avg_late_rate < 5 and avg_missed_rate < 3:
            discipline_level = "удовлетворительная"
        else:
            discipline_level = "требует внимания"
        
        # Получаем подходящую рекомендацию
        recommendation = self._get_recommendation(summary_stats)
        
        # Генерируем строки таблицы сотрудников
        employee_rows = ""
        for stats in sorted(employees_stats, key=lambda x: x['name']):
            employee_rows += f"""
                <tr>
                    <td>{stats['name']}</td>
                    <td>{stats['total_records']}</td>
                    <td>{self._format_time(stats['avg_arrival'])}</td>
                    <td>{self._format_time(stats['avg_departure'])}</td>
                    <td>{stats['late_count']}</td>
                    <td>{stats['early_leave_count']}</td>
                    <td>{stats['missed_days']}</td>
                    <td>{stats['comment_count']}</td>
                </tr>
            """
        
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Отчёт о дисциплине</title>
    <style>
        @page {{
            size: A4;
            margin: 2cm;
            @bottom-left {{
                content: "Отчёт о дисциплине сотрудников за {self.date_from.strftime('%d.%m.%Y')} — {self.date_to.strftime('%d.%m.%Y')}";
                font-size: 9pt;
                color: #666;
            }}
            @bottom-right {{
                content: "Страница " counter(page);
                font-size: 9pt;
                color: #666;
            }}
        }}
        
        body {{
            font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
            font-size: 10pt;
            line-height: 1.5;
            color: #333;
        }}
        
        h1 {{
            text-align: center;
            font-size: 18pt;
            margin: 0 0 15px 0;
            font-weight: bold;
        }}
        
        h2 {{
            font-size: 14pt;
            margin: 20px 0 10px 0;
            font-weight: bold;
        }}
        
        .info {{
            margin-bottom: 20px;
            line-height: 1.8;
            color: #000 !important;
        }}
        
        .info strong {{
            color: #000 !important;
        }}
        
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }}
        
        th {{
            background-color: #5A5A5A;
            color: white !important;
            padding: 10px 8px;
            text-align: left;
            font-weight: bold;
            font-size: 10pt;
            border: 1px solid #D0D0D0;
        }}
        
        td {{
            padding: 8px;
            border: 1px solid #E0E0E0;
            font-size: 10pt;
            color: #000 !important;
            background-color: inherit;
        }}
        
        tbody tr:nth-child(even) {{
            background-color: #F5F5F5 !important;
        }}
        
        tbody tr:nth-child(odd) {{
            background-color: white !important;
        }}
        
        tbody tr:nth-child(even) td {{
            background-color: #F5F5F5 !important;
        }}
        
        tbody tr:nth-child(odd) td {{
            background-color: white !important;
        }}
        
        .employee-table th:not(:first-child),
        .employee-table td:not(:first-child) {{
            text-align: center;
        }}
        
        .analytics {{
            line-height: 1.9;
            color: #000 !important;
        }}
        
        .analytics strong {{
            color: #000 !important;
        }}
        
        .conclusion {{
            line-height: 1.7;
            color: #000 !important;
        }}
        
        .conclusion strong {{
            color: #000 !important;
        }}
    </style>
</head>
<body>
    <h1>Отчёт о дисциплине сотрудников за<br/>{self.date_from.strftime('%d.%m.%Y')} — {self.date_to.strftime('%d.%m.%Y')}</h1>
    
    <div class="info">
        <strong>Период отчёта:</strong> {self.date_from.strftime('%d.%m.%Y')} — {self.date_to.strftime('%d.%m.%Y')}<br/>
        <strong>Дата формирования отчёта:</strong> {self.report_date.strftime('%d.%m.%Y')}<br/>
        🕘 <strong>Начало рабочего дня:</strong> {self.WORK_START.strftime('%H:%M')}<br/>
        🕕 <strong>Окончание рабочего дня:</strong> {self.WORK_END.strftime('%H:%M')}
    </div>
    
    <h2>📍 Сводные показатели</h2>
    <table>
        <thead>
            <tr>
                <th>📊 Показатель</th>
                <th>📈 Значение</th>
            </tr>
        </thead>
        <tbody>
            <tr><td>📈 Всего сотрудников</td><td>{summary_stats['total_employees']}</td></tr>
            <tr><td>🕓 Среднее время прихода</td><td>{self._format_time(summary_stats['avg_arrival'])}</td></tr>
            <tr><td>🕒 Среднее время ухода</td><td>{self._format_time(summary_stats['avg_departure'])}</td></tr>
            <tr><td>📌 Кол-во рабочих дней в периоде</td><td>{summary_stats['work_days']}</td></tr>
            <tr><td>🛑 Кол-во опозданий (после {self.WORK_START.strftime('%H:%M')})</td><td>{summary_stats['total_late']}</td></tr>
            <tr><td>⚠ Кол-во ранних уходов (до {self.WORK_END.strftime('%H:%M')})</td><td>{summary_stats['total_early_leave']}</td></tr>
            <tr><td>❌ Кол-во пропущенных дней</td><td>{summary_stats['total_missed']}</td></tr>
            <tr><td>📝 Среднее кол-во комментариев</td><td>{summary_stats['avg_comments_per_employee_per_day']} на сотрудника в день</td></tr>
            <tr><td>📷 Отметок с фото</td><td>{summary_stats['total_photos']}</td></tr>
        </tbody>
    </table>
    
    <h2>👥 Персональная статистика сотрудников</h2>
    <table class="employee-table">
        <thead>
            <tr>
                <th>👤 Сотрудник</th>
                <th>📆 Отметок<br/>всего</th>
                <th>🕘 Ср. время<br/>прихода</th>
                <th>🕕 Ср. время<br/>ухода</th>
                <th>🚨 Опозданий<br/>(&gt;{self.WORK_START.strftime('%H:%M')})</th>
                <th>🛑 Ранних уходов<br/>(&lt;{self.WORK_END.strftime('%H:%M')})</th>
                <th>❌ Пропусков<br/>(дней)</th>
                <th>📝 Комм.</th>
            </tr>
        </thead>
        <tbody>
        {employee_rows}
        </tbody>
    </table>
    
    <h2>🧭 Аналитика и дисциплина</h2>
    <div class="analytics">
        • <strong>🟢 Топ-3 самых пунктуальных сотрудников:</strong> {', '.join(punctual) if punctual else 'Нет данных'}<br/>
        • <strong>🔴 Топ-3 по опозданиям:</strong> {', '.join(late_employees) if late_employees else 'Нет данных'}<br/>
        • <strong>⏰ Среднее опоздание:</strong> {avg_late} мин<br/>
        • <strong>🕔 Средний ранний уход:</strong> {avg_early} мин<br/>
        • <strong>📊 Самые частые нарушения</strong> — с {self.WORK_START.strftime('%H:%M')} до {(datetime.combine(date.today(), self.WORK_START) + timedelta(minutes=30)).time().strftime('%H:%M')} (утро) и с {(datetime.combine(date.today(), self.WORK_END) - timedelta(minutes=30)).time().strftime('%H:%M')} до {self.WORK_END.strftime('%H:%M')} (вечер)
    </div>
    
    <h2>📌 Вывод</h2>
    <div class="conclusion">
        <strong>Общая дисциплина — {discipline_level}.</strong><br/><br/>
        {recommendation}
    </div>
</body>
</html>
        """
        return html
    
    def generate_pdf(self, output_path: Optional[str] = None) -> BytesIO:
        """Генерация PDF отчета"""
        employees = self._get_employees_data()
        employees_stats = [self._calculate_employee_stats(emp) for emp in employees]
        summary_stats = self._calculate_summary_stats(employees_stats)
        punctual, late_employees = self._get_top_employees(employees_stats)
        avg_late, avg_early = self._calculate_avg_late_and_early(employees_stats)
        
        html_content = self._generate_html(employees_stats, summary_stats, punctual, late_employees, avg_late, avg_early)
        
        if output_path:
            HTML(string=html_content).write_pdf(output_path)
            return BytesIO()
        else:
            pdf_bytes = HTML(string=html_content).write_pdf()
            return BytesIO(pdf_bytes)


def generate_discipline_report(date_from: date, date_to: date, output_path: Optional[str] = None) -> BytesIO:
    """Функция-хелпер для генерации отчета"""
    generator = DisciplineReportGenerator(date_from, date_to)
    return generator.generate_pdf(output_path)


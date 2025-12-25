## Недавние оптимизации:

Все исправления готовы!
Изменённые файлы:
Файл Изменения
main.py maxconn=50 (было 20)
database.py Retry логика + правильный возврат мёртвых соединений в пул
user_service.py Batch операции (3 запроса вместо N\*3)
user.py batch_create(), batch_update_names(), get_all_as_dict()
routes.py run_in_executor для PDF + TTL кэш для employees
upload_excel_handler.py run_in_executor для Excel
record_service.py run_in_executor для image processing
middleware.py asyncio.Lock + дифференцированные веса endpoints
yandex_maps.py 24-часовой кэш для геокодинга
Что исправлено:
Connection pool - увеличен до 50 соединений, исправлена утечка
Event loop - блокирующие операции (PDF, Excel, Images) вынесены в ThreadPool
N+1 queries - 1000 строк Excel теперь = 3 запроса вместо 3000
Race conditions - asyncio.Lock для rate limiter
Кэширование - 60 сек для employees, 24 часа для Yandex Geocoding
Rate limiting - дорогие операции (PDF) стоят 50 единиц, лёгкие (config) - 1
Для деплоя на сервере: docker compose up -d --build

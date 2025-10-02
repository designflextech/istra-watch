# Архитектура проекта

## Обзор

Istra Watch - это Telegram бот с мини-приложением для отслеживания присутствия сотрудников на рабочих местах. Проект построен на основе python-telegram-bot 22.5 и использует webhook для обработки обновлений.

## Технологический стек

- **Backend**: Python 3.10+, python-telegram-bot 22.5, aiohttp
- **Database**: PostgreSQL 12+
- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Telegram WebApp API
- **External APIs**: Яндекс.Карты API (Geocoder)

## Архитектурные принципы

### 1. Разделение ответственности

Проект разделен на четкие слои:

```
┌─────────────────────────────────────────┐
│           Presentation Layer            │
│  (Handlers, Keyboards, Frontend)        │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│           Business Logic Layer          │
│            (Services)                   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│           Data Access Layer             │
│              (Models)                   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│            Database (PostgreSQL)        │
└─────────────────────────────────────────┘
```

### 2. Модульность

Каждая функциональность изолирована в своем модуле:
- **1 хендлер = 1 действие**
- **1 клавиатура = 1 файл**
- **1 модель = 1 таблица = 1 класс**
- **1 сервис = 1 бизнес-логика**

### 3. Расширяемость

Проект легко расширяется:
- Добавьте новый хендлер в `bot/handlers/`
- Зарегистрируйте его в `main.py`
- Создайте соответствующий сервис
- При необходимости добавьте миграцию

## Компоненты системы

### Bot Layer (bot/)

#### Handlers (bot/handlers/)

Обработчики команд и сообщений Telegram:

- `start_handler.py` - Обработка команды /start
- `upload_excel_handler.py` - Загрузка Excel файлов

**Принцип работы:**
```
Telegram Update → Handler → Service → Model → Database
```

#### Keyboards (bot/keyboards/)

Клавиатуры для интерфейса бота:

- `admin_keyboard.py` - Клавиатура для администраторов
- `user_keyboard.py` - Клавиатура для обычных пользователей

**Особенности:**
- Используют WebAppInfo для мини-приложения
- ReplyKeyboardMarkup для постоянных клавиатур

#### Services (bot/services/)

Бизнес-логика приложения:

- `user_service.py` - Работа с пользователями, обработка Excel
- `record_service.py` - Создание и получение записей
- `yandex_maps.py` - Интеграция с Яндекс.Картами

**Принципы:**
- Все сложные операции выполняются в сервисах
- Сервисы не знают о Telegram API
- Сервисы можно использовать из API и хендлеров

#### Models (bot/models/)

Модели данных и работа с БД:

- `user.py` - Модель пользователя
- `record.py` - Модель записи о приходе/уходе
- `address.py` - Модель адреса

**Структура модели:**
```python
class Model:
    def __init__(self, ...):
        # Инициализация полей
    
    @staticmethod
    def create(...):
        # Создание записи
    
    @staticmethod
    def get_by_id(id):
        # Получение по ID
    
    def update(self):
        # Обновление
    
    @staticmethod
    def delete(id):
        # Удаление
```

#### Migrations (bot/migrations/)

Миграции базы данных:

- `001_create_users_table.py`
- `002_create_addresses_table.py`
- `003_create_records_table.py`
- `004_create_migrations_table.py`
- `run.py` - Менеджер миграций

**Структура миграции:**
```python
def up(cursor):
    # SQL для применения миграции
    
def down(cursor):
    # SQL для отката миграции
```

#### API (bot/api/)

REST API для мини-приложения:

- `routes.py` - Маршруты и обработчики

**Endpoints:**
- `POST /api/auth` - Аутентификация
- `GET /api/employees` - Список сотрудников
- `GET /api/records/{id}` - Детали записи
- `POST /api/records` - Создание записи

### Frontend Layer (frontend/)

#### Структура

```
frontend/
├── index.html              # Главная страница
└── static/
    ├── css/
    │   └── style.css      # Стили
    └── js/
        └── app.js         # Логика приложения
```

#### Компоненты UI

1. **Loading Screen** - Экран загрузки
2. **Admin Screen** - Список сотрудников (для админов)
3. **User Screen** - Главный экран (для пользователей)
4. **Record Screen** - Форма создания записи
5. **Details Screen** - Детали записи

#### Взаимодействие с Telegram WebApp

```javascript
const tg = window.Telegram.WebApp;

// Расширение на весь экран
tg.expand();

// Получение данных пользователя
const user = tg.initDataUnsafe?.user;

// Закрытие приложения
tg.close();
```

### Database Schema

```sql
users
├── id (PRIMARY KEY)
├── email
├── telegram_handle
├── telegram_id (UNIQUE)
├── name
├── phone
├── created_at
└── updated_at

addresses
├── id (PRIMARY KEY)
├── formatted_address
├── latitude
├── longitude
├── country
├── city
├── street
├── building
└── created_at

records
├── id (PRIMARY KEY)
├── user_id (FK → users)
├── record_type (arrival/departure)
├── timestamp
├── comment
├── latitude
├── longitude
├── address_id (FK → addresses)
└── created_at

migrations
├── id (PRIMARY KEY)
├── name
└── applied_at
```

## Потоки данных

### 1. Загрузка Excel (Админ)

```
User → Telegram → Handler → Service → Model → Database
                              ↓
                        Excel Parser
```

1. Админ отправляет Excel файл
2. `upload_excel_handler` получает файл
3. `UserService.process_excel_file()` парсит файл
4. `User.create()` добавляет пользователей в БД
5. Возвращается статистика

### 2. Просмотр сотрудников (Админ)

```
User → MiniApp → API → Service → Model → Database
         ↑                              ↓
         └────────── JSON Response ─────┘
```

1. Админ открывает мини-приложение
2. Frontend отправляет GET `/api/employees?date=...`
3. `RecordService.get_records_by_date()` получает данные
4. Возвращается JSON со списком
5. Frontend отображает список

### 3. Создание записи (Пользователь)

```
User → MiniApp → Geolocation → API → Service → Yandex Maps
                                        ↓
                                      Model → Database
```

1. Пользователь нажимает "Отметиться о приходе"
2. Browser API получает геолокацию
3. Frontend отправляет POST `/api/records`
4. `RecordService.create_record()`:
   - Проверяет адрес в БД
   - Если нет, запрашивает у Яндекс.Карт
   - Сохраняет адрес
   - Создает запись
5. Возвращается успешный ответ

## Безопасность

### Аутентификация

1. **Telegram WebApp** - Встроенная аутентификация Telegram
2. **Validation** - Валидация init_data через HMAC-SHA256
3. **Admin Check** - Проверка ID в переменной окружения

### Авторизация

- **Админы**: Могут загружать Excel, просматривать всех сотрудников
- **Пользователи**: Могут создавать только свои записи

### Защита данных

- **Webhook**: Только HTTPS
- **Database**: Подключение по паролю
- **Secrets**: Хранятся в .env
- **Validation**: Проверка входных данных

## Масштабирование

### Горизонтальное

Для масштабирования можно:
1. Использовать load balancer (nginx, HAProxy)
2. Запустить несколько инстансов бота
3. Использовать Redis для session storage

### Вертикальное

Для оптимизации:
1. Connection pooling для PostgreSQL
2. Кэширование адресов
3. Batch processing для загрузки пользователей
4. Индексы в БД (уже добавлены)

## Мониторинг

### Логирование

- Уровни: INFO, WARNING, ERROR
- Формат: timestamp - name - level - message
- Destination: stdout (можно перенаправить в файл)

### Метрики

Рекомендуется отслеживать:
- Количество активных пользователей
- Количество записей за день
- Время ответа API
- Ошибки при работе с Яндекс.Картами

## Расширение функциональности

### Добавление нового типа записи

1. Добавьте константу в `Record`:
   ```python
   BREAK = 'break'
   ```

2. Обновите check constraint в миграции:
   ```sql
   CHECK (record_type IN ('arrival', 'departure', 'break'))
   ```

3. Добавьте кнопку в frontend:
   ```html
   <button id="break-btn">☕ Перерыв</button>
   ```

### Добавление уведомлений

1. Создайте `bot/services/notification_service.py`
2. Добавьте метод отправки уведомлений
3. Вызывайте из `RecordService` после создания записи

### Добавление отчетов

1. Создайте `bot/handlers/report_handler.py`
2. Добавьте `bot/services/report_service.py`
3. Реализуйте генерацию отчета (PDF, Excel)
4. Зарегистрируйте handler в `main.py`

## Тестирование

### Unit тесты

Тестируйте:
- Модели (создание, получение, обновление)
- Сервисы (бизнес-логика)
- Утилиты (парсинг, валидация)

### Интеграционные тесты

Тестируйте:
- API endpoints
- Взаимодействие с БД
- Webhook обработку

### E2E тесты

Тестируйте:
- Полные сценарии пользователя
- Работу мини-приложения

## Производительность

### Bottlenecks

Потенциальные узкие места:
1. Яндекс.Карты API - лимит запросов
2. База данных - при большом количестве пользователей
3. Webhook - одно подключение

### Оптимизации

1. **Кэширование адресов** - уже реализовано через `Address.get_by_coordinates()`
2. **Batch insert** - для загрузки пользователей
3. **Database indexes** - уже добавлены
4. **Async operations** - используется aiohttp

## Deployment

### Production-ready checklist

- [ ] SSL сертификат настроен
- [ ] Секреты в переменных окружения
- [ ] Database backup настроен
- [ ] Логирование в файл
- [ ] Мониторинг работает
- [ ] systemd service создан
- [ ] Firewall настроен
- [ ] Rate limiting включен

## Документация кода

Все функции и классы документированы docstrings:

```python
def function(param: type) -> return_type:
    """
    Краткое описание
    
    Args:
        param: Описание параметра
        
    Returns:
        Описание возвращаемого значения
    """
```

## Вклад в проект

При добавлении нового функционала:
1. Следуйте существующей структуре
2. Документируйте код
3. Добавьте тесты
4. Обновите README.md
5. Создайте миграцию если нужно


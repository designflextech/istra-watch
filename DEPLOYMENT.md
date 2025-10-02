# Руководство по развертыванию

## Предварительные требования

- Python 3.10 или выше
- PostgreSQL 12 или выше
- Telegram бот (токен от @BotFather)
- Яндекс.Карты API ключ
- Сервер с публичным IP или домен для webhook

## Быстрый старт

### 1. Создание Telegram бота

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте команду `/newbot`
3. Следуйте инструкциям и сохраните полученный токен
4. Отправьте `/setmenubutton` и установите текст кнопки меню

### 2. Получение Яндекс.Карты API ключа

1. Перейдите на [Яндекс.Карты API](https://developer.tech.yandex.ru/)
2. Зарегистрируйтесь и создайте новый API ключ для Geocoder API

### 3. Настройка сервера

#### Клонирование репозитория

```bash
git clone <repository_url>
cd istra-watch
```

#### Создание виртуального окружения

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate  # Windows
```

#### Установка зависимостей

```bash
make install
# или
pip install -r requirements.txt
```

### 4. Настройка базы данных

#### Создание базы данных

```bash
# PostgreSQL должен быть установлен и запущен
createdb istra_watch
```

#### Настройка переменных окружения

Скопируйте `.env.example` в `.env` и заполните:

```bash
cp .env.example .env
nano .env  # или любой другой редактор
```

Обязательные переменные:
- `TELEGRAM_BOT_TOKEN` - токен вашего бота
- `TELEGRAM_ADMIN_IDS` - ID администраторов через запятую
- `WEBHOOK_URL` - URL вашего сервера (например, https://example.com)
- `DB_PASSWORD` - пароль от PostgreSQL
- `YANDEX_MAPS_API_KEY` - ключ API Яндекс.Карт

#### Применение миграций

```bash
make migrate
# или
python -m bot.migrations.run migrate
```

### 5. Добавление первого администратора (опционально)

```bash
python scripts/init_admin.py <telegram_id> "Имя" "@handle"
```

Чтобы узнать свой Telegram ID, используйте бота [@userinfobot](https://t.me/userinfobot)

### 6. Настройка webhook

#### Вариант A: Использование ngrok (для разработки)

```bash
ngrok http 8443
```

Скопируйте URL из ngrok (например, `https://abc123.ngrok.io`) и установите его в `.env`:

```
WEBHOOK_URL=https://abc123.ngrok.io
MINI_APP_URL=https://abc123.ngrok.io/miniapp
```

#### Вариант B: Использование собственного домена (для продакшена)

1. Настройте DNS для вашего домена
2. Установите SSL сертификат (Let's Encrypt)
3. Настройте nginx или другой reverse proxy

Пример конфигурации nginx:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8443;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 7. Запуск бота

```bash
make run
# или
python main.py
```

Для работы в фоне (Linux):

```bash
nohup python main.py > bot.log 2>&1 &
```

Или используйте systemd service (рекомендуется):

```bash
sudo cp deployment/istra-watch.service /etc/systemd/system/
sudo systemctl enable istra-watch
sudo systemctl start istra-watch
```

## Обслуживание

### Просмотр логов

```bash
tail -f bot.log
# или для systemd
sudo journalctl -u istra-watch -f
```

### Обновление кода

```bash
git pull
pip install -r requirements.txt
python -m bot.migrations.run migrate
sudo systemctl restart istra-watch
```

### Откат миграций

```bash
make migrate-rollback
# или
python -m bot.migrations.run rollback --steps=1
```

### Резервное копирование базы данных

```bash
pg_dump istra_watch > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Восстановление из резервной копии

```bash
psql istra_watch < backup_20231201_120000.sql
```

## Мониторинг

Рекомендуется настроить мониторинг:

1. Логирование ошибок (Sentry, LogDNA)
2. Мониторинг доступности (UptimeRobot, Pingdom)
3. Мониторинг ресурсов (Prometheus, Grafana)

## Безопасность

1. Используйте сильные пароли для базы данных
2. Ограничьте доступ к базе данных только с localhost
3. Регулярно обновляйте зависимости
4. Используйте firewall для ограничения доступа
5. Регулярно делайте резервные копии

## Масштабирование

Для высоких нагрузок рассмотрите:

1. Использование connection pooling для PostgreSQL (pgbouncer)
2. Кэширование (Redis)
3. Load balancing (nginx, HAProxy)
4. Репликация базы данных

## Troubleshooting

### Проблема: Webhook не работает

**Решение:**
- Проверьте, что URL доступен из интернета
- Убедитесь, что используется HTTPS
- Проверьте логи на наличие ошибок

### Проблема: База данных не подключается

**Решение:**
- Проверьте настройки в `.env`
- Убедитесь, что PostgreSQL запущен
- Проверьте права доступа пользователя БД

### Проблема: Геолокация не определяется

**Решение:**
- Убедитесь, что пользователь дал разрешение на геолокацию
- Проверьте, что мини-приложение открыто по HTTPS
- Проверьте ключ Яндекс.Карт API

## Поддержка

При возникновении проблем:
1. Проверьте логи
2. Ознакомьтесь с документацией
3. Создайте issue в репозитории


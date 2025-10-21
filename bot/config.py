"""Конфигурация приложения"""
import os
from urllib.parse import quote_plus
from dotenv import load_dotenv

load_dotenv()

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
TELEGRAM_ADMIN_IDS = [int(id.strip()) for id in os.getenv('TELEGRAM_ADMIN_IDS', '').split(',') if id.strip()]

# Webhook Configuration
WEBHOOK_URL = os.getenv('WEBHOOK_URL')
WEBHOOK_PATH = os.getenv('WEBHOOK_PATH', '/webhook')
WEBHOOK_PORT = int(os.getenv('WEBHOOK_PORT', 8443))

# Database Configuration
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', 5432))
DB_NAME = os.getenv('DB_NAME', 'istra_watch')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_SCHEMA = os.getenv('DB_SCHEMA', 'public')

# Yandex Maps API
YANDEX_MAPS_API_KEY = os.getenv('YANDEX_MAPS_API_KEY')

# Mini App Configuration
MINI_APP_URL = os.getenv('MINI_APP_URL')

# Work Time Configuration
WORK_START_HOUR = int(os.getenv('WORK_START_HOUR', 9))
WORK_END_HOUR = int(os.getenv('WORK_END_HOUR', 18))

# S3 Configuration (TWC Storage)
S3_ENDPOINT_URL = os.getenv('S3_ENDPOINT_URL', 'https://s3.twcstorage.ru')
S3_REGION = os.getenv('S3_REGION', 'ru-1')
S3_ACCESS_KEY_ID = os.getenv('S3_ACCESS_KEY_ID')
S3_SECRET_ACCESS_KEY = os.getenv('S3_SECRET_ACCESS_KEY')
S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME', '50f206ac-istra-geo-bot')
S3_PUBLIC_URL = os.getenv('S3_PUBLIC_URL')  # Optional CDN URL

# Database connection string
# URL-encode password to handle special characters like @, =, etc.
encoded_password = quote_plus(DB_PASSWORD) if DB_PASSWORD else ''
# Параметры для надежного соединения:
# - sslmode=prefer: использовать SSL если доступно
# - connect_timeout=10: таймаут подключения 10 секунд
# - keepalives=1: включить TCP keepalive
# - keepalives_idle=30: начать проверку после 30 сек простоя
# - keepalives_interval=10: проверять каждые 10 секунд
# - keepalives_count=5: максимум 5 попыток проверки
DATABASE_URL = f"postgresql://{DB_USER}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}?sslmode=prefer&connect_timeout=10&keepalives=1&keepalives_idle=30&keepalives_interval=10&keepalives_count=5"


def is_admin(user_id: int) -> bool:
    """Проверка, является ли пользователь администратором"""
    return user_id in TELEGRAM_ADMIN_IDS


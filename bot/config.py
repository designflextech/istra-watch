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

# Database connection string
# URL-encode password to handle special characters like @, =, etc.
encoded_password = quote_plus(DB_PASSWORD) if DB_PASSWORD else ''
DATABASE_URL = f"postgresql://{DB_USER}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"


def is_admin(user_id: int) -> bool:
    """Проверка, является ли пользователь администратором"""
    return user_id in TELEGRAM_ADMIN_IDS


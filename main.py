"""Главный файл бота"""
import logging
from aiohttp import web
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    filters
)

from bot.config import (
    TELEGRAM_BOT_TOKEN,
    WEBHOOK_URL,
    WEBHOOK_PATH,
    WEBHOOK_PORT
)
from bot.handlers.start_handler import start_handler
from bot.handlers.upload_excel_handler import (
    upload_excel_button_handler,
    excel_file_handler,
    add_employees_handler,
    download_template_handler,
    cancel_waiting_handler
)
from bot.api.routes import setup_routes
from bot.api.middleware import setup_middlewares
from bot.utils.database import init_connection_pool, close_connection_pool, auto_migrate

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)


async def setup_application() -> Application:
    """
    Настройка приложения бота
    
    Returns:
        Настроенное приложение
    """
    # Создаем приложение
    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    
    # Регистрируем обработчики
    application.add_handler(CommandHandler("start", start_handler))
    
    # Обработчики inline кнопок администратора
    application.add_handler(CallbackQueryHandler(add_employees_handler, pattern="^add_employees$"))
    application.add_handler(CallbackQueryHandler(download_template_handler, pattern="^download_template$"))
    
    # Обработчик файлов Excel (только когда ожидаем файл)
    application.add_handler(
        MessageHandler(
            filters.Document.FileExtension("xlsx"),
            excel_file_handler
        )
    )
    
    # Обработчик для сброса состояния ожидания (любые другие сообщения)
    application.add_handler(
        MessageHandler(
            filters.TEXT,
            cancel_waiting_handler
        )
    )
    
    return application


async def telegram_webhook(request: web.Request) -> web.Response:
    """
    Обработчик webhook от Telegram
    
    Args:
        request: HTTP запрос
        
    Returns:
        HTTP ответ
    """
    application = request.app['telegram_application']
    
    try:
        data = await request.json()
        update = Update.de_json(data, application.bot)
        await application.process_update(update)
        return web.Response(status=200)
    except Exception as e:
        logger.error(f"Ошибка обработки webhook: {e}")
        return web.Response(status=500)


async def serve_frontend(request: web.Request) -> web.Response:
    """
    Обслуживание фронтенда мини-приложения
    
    Args:
        request: HTTP запрос
        
    Returns:
        HTML страница
    """
    with open('frontend/index.html', 'r', encoding='utf-8') as f:
        content = f.read()
    return web.Response(text=content, content_type='text/html')


async def serve_safe_area_test(request: web.Request) -> web.Response:
    """
    Обслуживание тестовой страницы Safe Area
    
    Args:
        request: HTTP запрос
        
    Returns:
        HTML страница для тестирования Safe Area
    """
    with open('frontend/safe-area-test.html', 'r', encoding='utf-8') as f:
        content = f.read()
    return web.Response(text=content, content_type='text/html')


async def on_startup(app: web.Application):
    """
    Действия при запуске сервера

    Args:
        app: Приложение aiohttp
    """
    import os

    # Инициализируем пул соединений с БД
    # Настраивается через переменные окружения для нагрузочного тестирования:
    # DB_POOL_MIN=5 (по умолчанию)
    # DB_POOL_MAX=50 (по умолчанию, увеличить до 100-200 для 2000 юзеров)
    db_pool_min = int(os.getenv('DB_POOL_MIN', '5'))
    db_pool_max = int(os.getenv('DB_POOL_MAX', '50'))

    logger.info(f"Initializing database connection pool: {db_pool_min}-{db_pool_max} connections...")
    init_connection_pool(minconn=db_pool_min, maxconn=db_pool_max)
    
    # Автоматически применяем миграции при запуске
    # Это обеспечивает автоматическую инициализацию БД:
    # - Проверяет существование схемы и создает её при необходимости
    # - Применяет все новые миграции автоматически
    logger.info("Running database migrations...")
    auto_migrate()
    
    # Создаем и настраиваем приложение бота
    application = await setup_application()
    await application.initialize()
    await application.start()
    
    # Устанавливаем webhook
    webhook_url = f"{WEBHOOK_URL}{WEBHOOK_PATH}"
    await application.bot.set_webhook(webhook_url)
    
    logger.info(f"Webhook установлен: {webhook_url}")
    
    # Сохраняем приложение в контексте
    app['telegram_application'] = application
    
    logger.info("✓ Application started successfully")


async def on_shutdown(app: web.Application):
    """
    Действия при остановке сервера
    
    Args:
        app: Приложение aiohttp
    """
    application = app['telegram_application']
    
    # Удаляем webhook
    await application.bot.delete_webhook()
    
    # Останавливаем приложение
    await application.stop()
    await application.shutdown()
    
    # Закрываем пул соединений
    logger.info("Closing database connection pool...")
    close_connection_pool()
    
    logger.info("✓ Application shutdown complete")


def create_app() -> web.Application:
    """
    Создание веб-приложения
    
    Returns:
        Настроенное приложение aiohttp
    """
    app = web.Application()
    
    # Настраиваем middleware (порядок важен!)
    setup_middlewares(app)
    
    # Настраиваем маршруты API
    setup_routes(app)
    
    # Webhook для Telegram
    app.router.add_post(WEBHOOK_PATH, telegram_webhook)
    
    # Фронтенд мини-приложения
    app.router.add_get('/miniapp', serve_frontend)
    
    # Тестовая страница Safe Area
    app.router.add_get('/safe-area-test', serve_safe_area_test)
    
    # Статические файлы
    app.router.add_static('/static/', path='frontend/static/', name='static')
    
    # Обработчики жизненного цикла
    app.on_startup.append(on_startup)
    app.on_shutdown.append(on_shutdown)
    
    return app


def main():
    """Точка входа в приложение"""
    logger.info("Запуск бота...")
    
    app = create_app()
    
    # Запускаем веб-сервер
    web.run_app(
        app,
        host='0.0.0.0',
        port=WEBHOOK_PORT
    )


if __name__ == '__main__':
    main()


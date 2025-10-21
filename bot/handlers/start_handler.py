"""Обработчик команды /start"""
from telegram import Update
from telegram.ext import ContextTypes
from bot.config import is_admin
from bot.keyboards.admin_keyboard import get_admin_keyboard
from bot.keyboards.user_keyboard import get_user_keyboard
from bot.services.user_service import UserService


async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Обработчик команды /start
    
    Args:
        update: Объект обновления Telegram
        context: Контекст бота
    """
    user = update.effective_user
    
    if not user:
        return
    
    # Проверяем, является ли пользователь администратором
    if is_admin(user.id):
        message = (
            f"Добро пожаловать, {user.first_name}! 👋\n\n"
            "🛡️Вы вошли как администратор\n\n"
            "Это Бот, с помощью которого вы можете отслеживать сотрудников прямо в Мини-приложении\n\n"
            "📤 Шаг 1. Загрузите список сотрудников — используйте кнопку ниже, чтобы добавить их в систему\n"
            "📱 Шаг 2. Откройте Мини-приложение — следите за статусом сотрудников в удобном интерфейсе"
        )
        # Отправляем сообщение с inline клавиатурой
        await update.message.reply_text(message, reply_markup=get_admin_keyboard())
    else:
        # Проверяем, существует ли пользователь в базе сначала по telegram_id
        db_user = UserService.get_user_by_telegram_id(user.id)
        
        # Если не найден по telegram_id, пробуем найти по username
        if not db_user and user.username:
            print(f"DEBUG: Ищем пользователя по username: {user.username}")
            db_user = UserService.get_user_by_telegram_handle(user.username)
            print(f"DEBUG: Найден пользователь: {db_user}")
            
            # Если найден по handle, обновляем telegram_id
            if db_user and not db_user.telegram_id:
                print(f"DEBUG: Обновляем telegram_id для пользователя {db_user.name}")
                db_user.telegram_id = user.id
                db_user.update()
        
        if not db_user:
            message = (
                f"Привет, {user.first_name}! 👋\n\n"
                "К сожалению, вы не зарегистрированы в системе.\n"
                "Пожалуйста, обратитесь к администратору для добавления в список сотрудников."
            )
            await update.message.reply_text(message)
            return
        
        message = (
            f"Здравствуйте, {user.first_name}! 👋\n\n"
            "Добро пожаловать в систему отметок о присутствии\n\n"
            "👇 Нажмите кнопку ниже или или откройте Мини-приложение через профиль бота"
        )
        keyboard = get_user_keyboard()
        await update.message.reply_text(message, reply_markup=keyboard)


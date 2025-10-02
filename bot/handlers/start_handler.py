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
            "Вы вошли как администратор.\n\n"
            "Доступные действия:\n"
            "📤 Загрузить сотрудников - загрузка Excel файла с данными о сотрудниках\n"
            "📱 Открыть мини-приложение - просмотр статуса сотрудников"
        )
        keyboard = get_admin_keyboard()
    else:
        # Проверяем, существует ли пользователь в базе
        db_user = UserService.get_user_by_telegram_id(user.id)
        
        if not db_user:
            message = (
                f"Привет, {user.first_name}! 👋\n\n"
                "К сожалению, вы не зарегистрированы в системе.\n"
                "Пожалуйста, обратитесь к администратору для добавления в список сотрудников."
            )
            await update.message.reply_text(message)
            return
        
        message = (
            f"Привет, {user.first_name}! 👋\n\n"
            "Добро пожаловать в систему отслеживания присутствия.\n\n"
            "Для отметки прихода или ухода откройте мини-приложение:"
        )
        keyboard = get_user_keyboard()
    
    await update.message.reply_text(message, reply_markup=keyboard)


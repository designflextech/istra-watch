"""Обработчик команды /start"""
from telegram import Update
from telegram.ext import ContextTypes
from bot.config import is_admin
from bot.keyboards.admin_keyboard import get_admin_keyboard, get_admin_reply_keyboard
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
            "📤 Загрузить сотрудников - используйте кнопку ниже\n"
            "📱 Открыть мини-приложение - нажмите на кнопку для просмотра статуса сотрудников"
        )
        # Отправляем сообщение с inline клавиатурой для Web App
        await update.message.reply_text(message, reply_markup=get_admin_keyboard())
        # И устанавливаем reply клавиатуру для загрузки файлов
        await update.message.reply_text(
            "Используйте кнопку ниже для загрузки файла:",
            reply_markup=get_admin_reply_keyboard()
        )
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
            "Нажмите кнопку ниже для отметки прихода или ухода:"
        )
        keyboard = get_user_keyboard()
        await update.message.reply_text(message, reply_markup=keyboard)


"""Клавиатура для администраторов"""
from telegram import ReplyKeyboardMarkup, KeyboardButton, WebAppInfo
from bot.config import MINI_APP_URL


def get_admin_keyboard() -> ReplyKeyboardMarkup:
    """
    Получение клавиатуры для администраторов
    
    Returns:
        Клавиатура с кнопками для администратора
    """
    keyboard = [
        [KeyboardButton(text="📤 Загрузить сотрудников")],
        [KeyboardButton(text="📱 Открыть мини-приложение", web_app=WebAppInfo(url=MINI_APP_URL))]
    ]
    
    return ReplyKeyboardMarkup(
        keyboard,
        resize_keyboard=True,
        one_time_keyboard=False
    )


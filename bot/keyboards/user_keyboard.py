"""Клавиатура для обычных пользователей"""
from telegram import ReplyKeyboardMarkup, KeyboardButton, WebAppInfo
from bot.config import MINI_APP_URL


def get_user_keyboard() -> ReplyKeyboardMarkup:
    """
    Получение клавиатуры для обычных пользователей
    
    Returns:
        Клавиатура с кнопками для пользователя
    """
    keyboard = [
        [KeyboardButton(text="📱 Открыть мини-приложение", web_app=WebAppInfo(url=MINI_APP_URL))]
    ]
    
    return ReplyKeyboardMarkup(
        keyboard,
        resize_keyboard=True,
        one_time_keyboard=False
    )


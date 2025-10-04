"""Клавиатура для администраторов"""
from telegram import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo, ReplyKeyboardMarkup, KeyboardButton
from bot.config import MINI_APP_URL


def get_admin_keyboard() -> InlineKeyboardMarkup:
    """
    Получение клавиатуры для администраторов
    
    Returns:
        Inline клавиатура с кнопкой для открытия мини-приложения
    """
    keyboard = [
        [InlineKeyboardButton(text="📱 Открыть мини-приложение", web_app=WebAppInfo(url=MINI_APP_URL))]
    ]
    
    return InlineKeyboardMarkup(keyboard)


def get_admin_reply_keyboard() -> ReplyKeyboardMarkup:
    """
    Получение обычной клавиатуры для администраторов (для загрузки файлов)
    
    Returns:
        Reply клавиатура с кнопками для действий
    """
    keyboard = [
        [KeyboardButton(text="📤 Загрузить сотрудников")]
    ]
    
    return ReplyKeyboardMarkup(
        keyboard,
        resize_keyboard=True,
        one_time_keyboard=False
    )


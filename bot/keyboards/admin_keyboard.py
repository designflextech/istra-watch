"""Клавиатура для администраторов"""
from telegram import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from bot.config import MINI_APP_URL


def get_admin_keyboard() -> InlineKeyboardMarkup:
    """
    Получение клавиатуры для администраторов
    
    Returns:
        Inline клавиатура с кнопками для действий
    """
    keyboard = [
        [InlineKeyboardButton(text="📤 Добавить сотрудников", callback_data="add_employees")],
        [InlineKeyboardButton(text="📱 Открыть Мини-приложение", web_app=WebAppInfo(url=MINI_APP_URL))]
    ]
    
    return InlineKeyboardMarkup(keyboard)


def get_template_keyboard() -> InlineKeyboardMarkup:
    """
    Получение клавиатуры с кнопкой скачать шаблон
    
    Returns:
        Inline клавиатура с кнопкой скачать шаблон
    """
    keyboard = [
        [InlineKeyboardButton(text="📄 Скачать шаблон", callback_data="download_template")]
    ]
    
    return InlineKeyboardMarkup(keyboard)


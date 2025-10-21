"""Обработчик загрузки Excel файла"""
import os
import tempfile
from telegram import Update, ReplyKeyboardMarkup, KeyboardButton
from telegram.ext import ContextTypes
from bot.config import is_admin
from bot.services.user_service import UserService


# Состояния для ожидания файла
WAITING_FOR_FILE = 'waiting_for_excel'
WAITING_FOR_TEMPLATE = 'waiting_for_template'


async def upload_excel_button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Обработчик нажатия кнопки "Загрузить сотрудников"
    
    Args:
        update: Объект обновления Telegram
        context: Контекст бота
    """
    user = update.effective_user
    
    if not user or not is_admin(user.id):
        await update.message.reply_text("У вас нет доступа к этой функции.")
        return
    
    # Устанавливаем состояние ожидания файла
    context.user_data[WAITING_FOR_FILE] = True
    
    message = (
        "📤 Загрузка сотрудников\n\n"
        "Пожалуйста, отправьте Excel файл (.xlsx) со следующей структурой:\n\n"
        "| ФИО | Телеграм хендлер |\n"
        "|-----|------------------|\n"
        "| Иванов Иван Иванович | @ivanov |\n"
        "| Петров Петр Петрович | @petrov |\n\n"
        "⚠️ Первая строка файла должна содержать заголовки столбцов."
    )
    
    await update.message.reply_text(message)


async def excel_file_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Обработчик получения Excel файла
    
    Args:
        update: Объект обновления Telegram
        context: Контекст бота
    """
    user = update.effective_user
    
    if not user or not is_admin(user.id):
        await update.message.reply_text("У вас нет доступа к этой функции.")
        return
    
    # Проверяем, ожидаем ли мы файл
    if not context.user_data.get(WAITING_FOR_FILE):
        return
    
    document = update.message.document
    
    if not document:
        await update.message.reply_text("Пожалуйста, отправьте файл.")
        return
    
    # Проверяем расширение файла
    if not document.file_name.endswith('.xlsx'):
        await update.message.reply_text(
            "Неверный формат файла. Пожалуйста, отправьте файл Excel (.xlsx)."
        )
        return
    
    await update.message.reply_text("⏳ Обработка файла...")
    
    try:
        # Скачиваем файл
        file = await document.get_file()
        
        # Сохраняем во временный файл
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as temp_file:
            temp_path = temp_file.name
            await file.download_to_drive(temp_path)
        
        # Обрабатываем файл
        result = UserService.process_excel_file(temp_path)
        
        # Удаляем временный файл
        os.unlink(temp_path)
        
        # Формируем сообщение с результатами
        if result['success']:
            message_parts = ["✅ Обработка завершена!"]
            
            if result.get('added', 0) > 0:
                message_parts.append(f"➕ Добавлено: {result['added']}")
            
            if result.get('updated', 0) > 0:
                message_parts.append(f"🔄 Обновлено: {result['updated']}")
            
            if result.get('skipped', 0) > 0:
                message_parts.append(f"⏭️ Пропущено: {result['skipped']}")
            
            if result.get('errors'):
                message_parts.append(f"\n⚠️ Ошибки ({len(result['errors'])}):")
                for error in result['errors'][:5]:  # Показываем только первые 5 ошибок
                    message_parts.append(f"• {error}")
                if len(result['errors']) > 5:
                    message_parts.append(f"• ... и еще {len(result['errors']) - 5} ошибок")
            
            message_parts.append("\nТеперь у сотрудников есть доступ к Боту и Мини-приложению")
            message = "\n".join(message_parts)
        else:
            message = f"❌ Ошибка!\n{result.get('error', 'Неизвестная ошибка')}"
        
        await update.message.reply_text(message)
        
    except Exception as e:
        await update.message.reply_text(f"❌ Произошла ошибка: {str(e)}")
    
    finally:
        # Сбрасываем состояние
        context.user_data[WAITING_FOR_FILE] = False


async def add_employees_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Обработчик нажатия inline кнопки "Добавить сотрудников"
    
    Args:
        update: Объект обновления Telegram
        context: Контекст бота
    """
    query = update.callback_query
    await query.answer()
    
    user = query.from_user
    
    if not user or not is_admin(user.id):
        await query.edit_message_text("У вас нет доступа к этой функции.")
        return
    
    message = (
        "📤 Добавить сотрудников\n\n"
        "Шаг 1. Скачайте шаблон по кнопке «📄 Скачать шаблон»\n"
        "Шаг 2. Заполните шаблон по примеру\n"
        "Шаг 3. Отправьте файл Excel (.xlsx) в диалог с ботом"
    )
    
    # Импортируем клавиатуру здесь, чтобы избежать циклических импортов
    from bot.keyboards.admin_keyboard import get_template_keyboard
    
    await query.edit_message_text(message, reply_markup=get_template_keyboard())


async def download_template_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Обработчик нажатия inline кнопки "Скачать шаблон"
    
    Args:
        update: Объект обновления Telegram
        context: Контекст бота
    """
    query = update.callback_query
    await query.answer()
    
    user = query.from_user
    
    if not user or not is_admin(user.id):
        await query.edit_message_text("У вас нет доступа к этой функции.")
        return
    
    # Устанавливаем состояние ожидания файла
    context.user_data[WAITING_FOR_FILE] = True
    
    message = (
        "📄 Шаблон для загрузки сотрудников\n\n"
        "Файл содержит:\n"
        " ✓ Правильную структуру столбцов\n"
        " ✓ Примеры заполнения (удалите перед загрузкой)\n\n"
        "👇 Заполните данные и отправьте файл (.xlsx) в этот чат"
    )
    
    # Путь к файлу шаблона
    template_path = os.path.join(os.path.dirname(__file__), "..", "Сотрудники (Истра).xlsx")
    
    try:
        # Отправляем файл
        with open(template_path, 'rb') as template_file:
            await query.message.reply_document(
                document=template_file,
                filename="Сотрудники (Истра).xlsx",
                caption=message
            )
    except FileNotFoundError:
        await query.edit_message_text("❌ Файл шаблона не найден. Обратитесь к разработчику.")


async def cancel_waiting_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Обработчик для сброса состояния ожидания файла при получении любого другого сообщения
    
    Args:
        update: Объект обновления Telegram
        context: Контекст бота
    """
    user = update.effective_user
    
    if not user or not is_admin(user.id):
        return
    
    # Если мы ожидаем файл, но получили что-то другое - сбрасываем состояние
    if context.user_data.get(WAITING_FOR_FILE):
        context.user_data[WAITING_FOR_FILE] = False
        # Возвращаем основную клавиатуру
        from bot.keyboards.admin_keyboard import get_admin_keyboard
        await update.message.reply_text(
            "Ожидание файла отменено. Выберите действие:",
            reply_markup=get_admin_keyboard()
        )


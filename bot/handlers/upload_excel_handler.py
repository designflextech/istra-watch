"""Обработчик загрузки Excel файла"""
import os
import tempfile
from telegram import Update
from telegram.ext import ContextTypes
from bot.config import is_admin
from bot.services.user_service import UserService


# Состояние для ожидания файла
WAITING_FOR_FILE = 'waiting_for_excel'


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
            message = (
                "✅ Файл успешно обработан!\n\n"
                f"📊 Статистика:\n"
                f"➕ Добавлено: {result['added']}\n"
                f"⏭ Пропущено (уже существуют): {result['skipped']}\n"
            )
            
            if result['errors']:
                message += f"\n⚠️ Ошибки ({len(result['errors'])}):\n"
                for error in result['errors'][:5]:  # Показываем первые 5 ошибок
                    message += f"• {error}\n"
                
                if len(result['errors']) > 5:
                    message += f"... и еще {len(result['errors']) - 5} ошибок\n"
        else:
            message = f"❌ Ошибка при обработке файла:\n{result['error']}"
        
        await update.message.reply_text(message)
        
    except Exception as e:
        await update.message.reply_text(f"❌ Произошла ошибка: {str(e)}")
    
    finally:
        # Сбрасываем состояние
        context.user_data[WAITING_FOR_FILE] = False


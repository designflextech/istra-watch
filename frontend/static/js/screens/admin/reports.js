/**
 * Admin Reports Screen
 * Экран генерации отчетов о дисциплине сотрудников
 */

import { showScreen, showError } from '../../utils/helpers.js';

// Ключ для хранения состояния генерации отчета
const REPORT_GENERATION_KEY = 'istra_report_generating';

/**
 * Проверить, идет ли генерация отчета
 */
function isReportGenerating() {
    try {
        const state = localStorage.getItem(REPORT_GENERATION_KEY);
        return state === 'true';
    } catch (e) {
        console.error('Error checking report generation state:', e);
        return false;
    }
}

/**
 * Установить состояние генерации отчета
 */
function setReportGenerating(isGenerating) {
    try {
        if (isGenerating) {
            localStorage.setItem(REPORT_GENERATION_KEY, 'true');
        } else {
            localStorage.removeItem(REPORT_GENERATION_KEY);
        }
    } catch (e) {
        console.error('Error setting report generation state:', e);
    }
}

/**
 * Показать экран отчетов
 */
export function showReports() {
    showScreen('reports-screen');
    
    const container = document.getElementById('reports-container');
    
    // Получаем текущую дату
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Форматируем даты для input type="date"
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    container.innerHTML = `
        <div class="reports-section">
            <div class="section-header">
                <h2>Отчеты о дисциплине сотрудников</h2>
                <p>Сгенерируйте PDF отчет за выбранный период</p>
            </div>
            
            <div class="report-form-card">
                <div class="form-group">
                    <label for="date-from">Дата начала периода</label>
                    <input 
                        type="date" 
                        id="date-from" 
                        class="form-input"
                        value="${formatDate(firstDayOfMonth)}"
                    >
                </div>
                
                <div class="form-group">
                    <label for="date-to">Дата окончания периода</label>
                    <input 
                        type="date" 
                        id="date-to" 
                        class="form-input"
                        value="${formatDate(today)}"
                    >
                </div>
                
                <button id="generate-report-btn" class="btn btn-primary">
                    Сгенерировать отчет
                </button>
                
                <div id="report-status" class="report-status"></div>
            </div>
            
            <div class="report-info">
                <h3>Что включает отчет:</h3>
                <ul>
                    <li>Сводные показатели по всем сотрудникам</li>
                    <li>Персональная статистика каждого сотрудника</li>
                    <li>Аналитика и дисциплина (топ сотрудников)</li>
                    <li>Выводы и рекомендации</li>
                </ul>
            </div>
        </div>
    `;
    
    // Проверяем, идет ли генерация отчета
    const button = document.getElementById('generate-report-btn');
    const statusDiv = document.getElementById('report-status');
    
    if (isReportGenerating()) {
        button.disabled = true;
        button.textContent = '⏳ Генерация...';
        statusDiv.innerHTML = '<p class="status-loading">Генерируется отчет, пожалуйста подождите...</p>';
    }
    
    // Обработчик генерации отчета
    button.addEventListener('click', generateReport);
}

/**
 * Генерация отчета
 */
async function generateReport() {
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;
    const statusDiv = document.getElementById('report-status');
    const button = document.getElementById('generate-report-btn');
    
    // Валидация
    if (!dateFrom || !dateTo) {
        showError('Пожалуйста, выберите обе даты');
        return;
    }
    
    if (new Date(dateFrom) > new Date(dateTo)) {
        showError('Дата начала не может быть позже даты окончания');
        return;
    }
    
    // Блокируем кнопку и сохраняем состояние
    button.disabled = true;
    button.textContent = '⏳ Генерация...';
    statusDiv.innerHTML = '<p class="status-loading">Генерируется отчет, пожалуйста подождите...</p>';
    setReportGenerating(true);
    
    try {
        // Формируем URL с параметрами
        const url = `/api/reports/discipline?date_from=${dateFrom}&date_to=${dateTo}`;
        
        // Делаем запрос
        const initData = window.Telegram.WebApp.initData;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `tma ${initData}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка при генерации отчета');
        }
        
        // Получаем ответ
        const result = await response.json();
        
        // Показываем сообщение об успехе
        statusDiv.innerHTML = `
            <p class="status-success">✅ ${result.message}</p>
            <p style="font-size: 14px; color: var(--text-secondary); margin-top: 8px;">
                Откройте чат с ботом, чтобы посмотреть отчет
            </p>
        `;
        
        // Разблокируем кнопку и очищаем состояние
        button.disabled = false;
        button.textContent = '📄 Сгенерировать отчет';
        setReportGenerating(false);
        
        // Опционально: показываем уведомление через Telegram WebApp
        if (window.Telegram.WebApp.showAlert) {
            window.Telegram.WebApp.showAlert('Отчет успешно отправлен в чат с ботом!');
        }
        
    } catch (error) {
        console.error('Ошибка генерации отчета:', error);
        statusDiv.innerHTML = `<p class="status-error">❌ Ошибка: ${error.message}</p>`;
        showError(error.message);
        
        // Разблокируем кнопку и очищаем состояние
        button.disabled = false;
        button.textContent = '📄 Сгенерировать отчет';
        setReportGenerating(false);
    }
}


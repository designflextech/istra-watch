/**
 * Admin Employee Records Screen
 * Экран списка записей конкретного сотрудника за день
 */

import { API } from '../../utils/api.js';
import { cache } from '../../utils/cache.js';
import { showScreen, formatTime, formatDateRussian, formatAddress } from '../../utils/helpers.js';

/**
 * Проверить, является ли дата сегодняшней
 */
function isDateToday(dateString) {
    const today = new Date();
    const checkDate = new Date(dateString);
    
    return today.getFullYear() === checkDate.getFullYear() &&
           today.getMonth() === checkDate.getMonth() &&
           today.getDate() === checkDate.getDate();
}

/**
 * Показать список записей сотрудника
 */
export async function showEmployeeRecords(userId, date) {
    showScreen('employee-records-screen');
    
    // Загружаем записи
    await loadEmployeeRecords(userId, date);
}

/**
 * Загрузить записи сотрудника
 */
async function loadEmployeeRecords(userId, date) {
    const container = document.getElementById('employee-records-container');
    const dateElement = document.getElementById('employee-records-date');
    
    container.innerHTML = '<div class="loader-container"><div class="loader"></div></div>';
    
    // Форматируем дату
    const dateObj = new Date(date);
    dateElement.innerHTML = formatDateRussian(dateObj);
    
    try {
        console.log('=== Loading Employee Records ===');
        console.log('User ID:', userId);
        console.log('Date:', date);
        
        // Проверяем, есть ли данные в кэше для этой даты
        const cachedData = cache.get(`/api/employees/${userId}/records`, { date });
        if (cachedData) {
            console.log('Using cached data for employee records');
            renderEmployeeRecords(cachedData.user, cachedData.records, date);
            return;
        }
        
        const data = await API.getEmployeeRecords(userId, date);
        
        console.log('Response data:', data);
        console.log('Records count:', data.records?.length);
        
        renderEmployeeRecords(data.user, data.records, date);
        
    } catch (error) {
        console.error('Error loading employee records:', error);
        container.innerHTML = `<div class="error-message">${error.message}</div>`;
    }
}

/**
 * Отрисовать список записей сотрудника
 */
function renderEmployeeRecords(user, records, date) {
    console.log('=== Rendering Employee Records ===');
    console.log('User:', user);
    console.log('Records:', records);
    
    const container = document.getElementById('employee-records-container');
    
    // Определяем статус
    let status = 'На месте';
    if (records && records.length > 0) {
        const lastRecord = records[records.length - 1].record;
        if (lastRecord.record_type === 'departure') {
            status = 'Не на месте';
        }
    }
    
    // Профиль сотрудника
    const avatarUrl = user.avatar_url || 'https://via.placeholder.com/103';
    
    let profileHTML = `
        <div class="employee-profile">
            <img src="${avatarUrl}" alt="${user.name}" class="employee-profile-avatar">
            <h1 class="employee-profile-name">${user.name}</h1>
            <p class="employee-profile-status">${status}</p>
        </div>
    `;
    
    if (!records || records.length === 0) {
        console.log('No records to display');
        
        // Проверяем, является ли дата сегодняшней
        const isToday = isDateToday(date);
        let messageHTML;
        
        if (isToday) {
            messageHTML = `<p class="no-records-today">Сегодня нет отметок</p>`;
        } else {
            messageHTML = `<p style="text-align: center; padding: 20px;">Нет записей за ${new Date(date).toLocaleDateString('ru-RU')}</p>`;
        }
        
        container.innerHTML = profileHTML + messageHTML;
        
        // Добавляем обработчик кнопки "Назад"
        document.getElementById('employee-records-back-btn').onclick = () => {
            if (window.app && window.app.showEmployeesList) {
                window.app.showEmployeesList();
            }
        };
        return;
    }
    
    // Сортируем записи: сначала arrival, потом departure
    const sortedRecords = [...records].sort((a, b) => {
        if (a.record.record_type === 'arrival' && b.record.record_type === 'departure') return -1;
        if (a.record.record_type === 'departure' && b.record.record_type === 'arrival') return 1;
        return new Date(a.record.timestamp) - new Date(b.record.timestamp);
    });
    
    // Кэшируем детали каждой записи для быстрого доступа (TTL: 10 минут)
    sortedRecords.forEach(item => {
        const recordDetailsData = {
            record: item.record,
            user: user,
            address: item.address
        };
        cache.set(`/api/records/${item.record.id}`, recordDetailsData, {}, 10 * 60 * 1000);
    });
    
    // Временная линия
    const timelineHTML = sortedRecords.map((item, index) => {
        const record = item.record;
        const address = item.address;
        
        console.log('TIMELINE: Processing record', record.id);
        console.log('TIMELINE: Address object:', address);
        console.log('TIMELINE: formatted_address:', address ? address.formatted_address : 'null');
        
        const recordType = record.record_type === 'arrival' ? 'Пришел' : 'Ушел';
        const time = formatTime(record.timestamp);
        const addressText = address ? formatAddress(address.formatted_address) : 'Адрес не указан';
        
        console.log('TIMELINE: Final addressText:', addressText);
        
        const showLine = index < sortedRecords.length - 1;
        
        return `
            <div class="timeline-item" data-record-id="${record.id}">
                <div class="timeline-dot"></div>
                ${showLine ? '<div class="timeline-line"></div>' : ''}
                <div class="timeline-card">
                    <div class="timeline-card-content">
                        <span class="timeline-time">${recordType}: ${time}</span>
                        <span class="timeline-address">${addressText}</span>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M6 12L10 8L6 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        ${profileHTML}
        <div class="timeline">
            ${timelineHTML}
        </div>
    `;
    
    // Добавляем обработчик кнопки "Назад"
    document.getElementById('employee-records-back-btn').onclick = () => {
        if (window.app && window.app.showEmployeesList) {
            window.app.showEmployeesList();
        }
    };
    
    // Добавляем обработчики кликов после рендеринга
    document.querySelectorAll('.timeline-item').forEach(item => {
        item.onclick = () => {
            const recordId = parseInt(item.dataset.recordId);
            
            if (window.app && window.app.showRecordDetails) {
                window.app.showRecordDetails(recordId);
            }
        };
    });
}


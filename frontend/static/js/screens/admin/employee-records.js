/**
 * Admin Employee Records Screen
 * Экран списка записей конкретного сотрудника за день
 */

import { API } from '../../utils/api.js';
import { showScreen, formatTime } from '../../utils/helpers.js';

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
    const header = document.getElementById('employee-records-header');
    
    container.innerHTML = '<div class="loader"></div>';
    header.innerHTML = '<h1>Записи сотрудника</h1>';
    
    try {
        console.log('=== Loading Employee Records ===');
        console.log('User ID:', userId);
        console.log('Date:', date);
        
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
    const header = document.getElementById('employee-records-header');
    
    // Обновляем заголовок
    header.innerHTML = `
        <button id="employee-records-back-btn" class="back-btn">← Назад</button>
        <h1>${user.name}</h1>
    `;
    
    // Добавляем обработчик кнопки "Назад"
    document.getElementById('employee-records-back-btn').onclick = () => {
        if (window.app && window.app.showEmployeesList) {
            window.app.showEmployeesList();
        }
    };
    
    if (!records || records.length === 0) {
        console.log('No records to display');
        container.innerHTML = `<p>Нет записей за ${new Date(date).toLocaleDateString('ru-RU')}</p>`;
        return;
    }
    
    container.innerHTML = records.map(item => {
        const record = item.record;
        const address = item.address;
        
        const recordType = record.record_type === 'arrival' ? 'Приход' : 'Уход';
        const badgeClass = record.record_type === 'arrival' ? 'arrival' : 'departure';
        const time = formatTime(record.timestamp);
        const photoBadge = record.has_photo ? '<span class="photo-badge">📷</span>' : '';
        
        return `
            <div class="record-card" data-record-id="${record.id}">
                <div class="record-info">
                    <div class="record-type-time">
                        <span class="status-badge ${badgeClass}">${recordType}</span>
                        <span class="record-time">${time}${photoBadge}</span>
                    </div>
                </div>
                ${address ? `<div class="record-address">${address.formatted_address}</div>` : ''}
                ${record.comment ? `<div class="record-comment">${record.comment}</div>` : ''}
            </div>
        `;
    }).join('');
    
    // Добавляем обработчики кликов после рендеринга
    document.querySelectorAll('.record-card').forEach(card => {
        card.onclick = () => {
            const recordId = parseInt(card.dataset.recordId);
            
            if (window.app && window.app.showRecordDetails) {
                window.app.showRecordDetails(recordId);
            }
        };
    });
}


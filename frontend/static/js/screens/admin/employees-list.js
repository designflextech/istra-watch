/**
 * Admin Employees List Screen
 * Главный экран админа со списком сотрудников
 */

import { API } from '../../utils/api.js';
import { showScreen, getTodayString, formatTime } from '../../utils/helpers.js';

/**
 * Показать список сотрудников
 */
export async function showEmployeesList() {
    showScreen('admin-screen');
    
    // Устанавливаем сегодняшнюю дату
    const dateInput = document.getElementById('date-input');
    dateInput.value = getTodayString();
    
    // Отображаем дату в заголовке
    updateHeaderDate();
    
    // Загружаем список сотрудников
    await loadEmployees();
}

/**
 * Обновить дату в заголовке
 */
function updateHeaderDate() {
    const adminDate = document.getElementById('admin-date');
    const today = new Date();
    const options = { day: 'numeric', month: 'long' };
    const dateStr = today.toLocaleDateString('ru-RU', options);
    const dayName = today.toLocaleDateString('ru-RU', { weekday: 'long' });
    
    adminDate.innerHTML = `<span class="highlight">${dateStr},</span> ${dayName}`;
}

/**
 * Загрузить список сотрудников
 */
async function loadEmployees() {
    const dateInput = document.getElementById('date-input');
    const date = dateInput.value;
    const employeesList = document.getElementById('employees-list');
    
    employeesList.innerHTML = '<div class="loader"></div>';
    
    try {
        console.log('=== Loading Employees ===');
        console.log('Date:', date);
        
        const data = await API.getEmployeesStatus(date);
        
        console.log('Response data:', data);
        console.log('Employees count:', data.employees?.length);
        
        renderEmployees(data.employees, date);
        
    } catch (error) {
        console.error('Error loading employees:', error);
        employeesList.innerHTML = `<div class="error-message">${error.message}</div>`;
    }
}

/**
 * Отрисовать список сотрудников
 */
function renderEmployees(employees, date) {
    console.log('=== Rendering Employees ===');
    console.log('Employees:', employees);
    
    const employeesList = document.getElementById('employees-list');
    
    if (!employees || employees.length === 0) {
        console.log('No employees to display');
        employeesList.innerHTML = '<div class="empty-state"><p>Нет данных о сотрудниках</p></div>';
        return;
    }
    
    employeesList.innerHTML = employees.map(emp => {
        const user = emp.user;
        const arrivalRecord = emp.arrival_record;
        const departureRecord = emp.departure_record;
        
        // Avatar with fallback
        const avatarUrl = user.avatar_url || '';
        const avatarHTML = avatarUrl 
            ? `<img src="${avatarUrl}" class="employee-card-avatar" alt="${user.name}">` 
            : `<div class="employee-card-avatar" style="background: rgba(0,0,0,0.1);"></div>`;
        
        // Time display logic
        let timeHTML = '';
        let timeClass = '';
        
        if (arrivalRecord && departureRecord) {
            // Both arrival and departure
            const arrivalTime = formatTime(arrivalRecord.timestamp);
            const departureTime = formatTime(departureRecord.timestamp);
            timeHTML = `
                <span class="time-text">${arrivalTime}</span>
                <svg class="time-arrow" width="19" height="8" viewBox="0 0 19 8" fill="none">
                    <path d="M1 4H18M18 4L15 1M18 4L15 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="time-text secondary">${departureTime}</span>
            `;
        } else if (arrivalRecord) {
            // Only arrival
            const arrivalTime = formatTime(arrivalRecord.timestamp);
            timeHTML = `
                <span class="time-text">${arrivalTime}</span>
                <svg class="time-arrow" width="19" height="8" viewBox="0 0 19 8" fill="none">
                    <path d="M1 4H18M18 4L15 1M18 4L15 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="time-text success">На месте</span>
            `;
        } else {
            // No records
            timeHTML = '<span class="time-text error">Нет отметок</span>';
            timeClass = 'error';
        }
        
        return `
            <div class="card card-clickable employee-card" data-user-id="${user.id}" data-date="${date}">
                ${avatarHTML}
                <div class="employee-card-content">
                    <div class="employee-card-header">
                        <span class="employee-card-name">${user.name}</span>
                        <svg class="chevron-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="7.5" stroke="currentColor"/>
                            <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div class="employee-card-time ${timeClass}">
                        ${timeHTML}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Добавляем обработчики кликов после рендеринга
    document.querySelectorAll('.employee-card').forEach(card => {
        card.onclick = () => {
            const userId = parseInt(card.dataset.userId);
            const date = card.dataset.date;
            
            if (window.app && window.app.showEmployeeRecords) {
                window.app.showEmployeeRecords(userId, date);
            }
        };
    });
}


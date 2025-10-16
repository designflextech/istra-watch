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
    
    // Загружаем список сотрудников
    await loadEmployees();
    
    // Слушаем изменение даты
    dateInput.onchange = loadEmployees;
    
    // Обработчик кнопки карты
    const mapBtn = document.getElementById('map-btn');
    if (mapBtn) {
        mapBtn.onclick = () => {
            if (window.app && window.app.showAdminMap) {
                window.app.showAdminMap();
            }
        };
    }
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
        employeesList.innerHTML = '<p>Нет данных о сотрудниках</p>';
        return;
    }
    
    employeesList.innerHTML = employees.map(emp => {
        const user = emp.user;
        const record = emp.record;
        
        let statusBadge = '<span class="status-badge absent">Не на месте</span>';
        let details = 'Не отмечался';
        let photoBadge = '';
        
        if (record) {
            const recordType = record.type === 'arrival' ? 'Пришел' : 'Ушел';
            const badgeClass = record.type === 'arrival' ? 'arrival' : 'departure';
            const time = formatTime(record.timestamp);
            
            statusBadge = `<span class="status-badge ${badgeClass}">${recordType}</span>`;
            details = `${recordType}: ${time}`;
            
            // Показываем значок камеры если есть фото (lazy loading)
            if (record.has_photo) {
                photoBadge = '<span class="photo-badge">📷</span>';
            }
        }
        
        return `
            <div class="employee-card" data-user-id="${user.id}" data-date="${date}">
                <div class="employee-info">
                    <span class="employee-name">${user.name}${photoBadge}</span>
                    ${statusBadge}
                </div>
                <div class="employee-details">${details}</div>
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


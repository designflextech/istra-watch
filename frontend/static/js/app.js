// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// API URL (замените на ваш URL)
const API_URL = window.location.origin;

// Глобальные переменные
let currentUser = null;
let isAdmin = false;
let currentRecordType = null;
let currentLocation = null;

// Элементы DOM
const loadingScreen = document.getElementById('loading-screen');
const adminScreen = document.getElementById('admin-screen');
const userScreen = document.getElementById('user-screen');
const recordScreen = document.getElementById('record-screen');
const detailsScreen = document.getElementById('details-screen');

// Инициализация приложения
async function init() {
    try {
        const telegramUser = tg.initDataUnsafe?.user;
        
        if (!telegramUser) {
            showError('Ошибка получения данных пользователя');
            return;
        }
        
        // Аутентификация
        const response = await fetch(`${API_URL}/api/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                telegram_id: telegramUser.id,
                init_data: tg.initData  // Отправляем init_data для валидации
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            showError(error.error || 'Ошибка аутентификации');
            return;
        }
        
        const data = await response.json();
        isAdmin = data.is_admin;
        currentUser = data.user;
        
        // Показываем соответствующий экран
        if (isAdmin) {
            showAdminScreen();
        } else {
            showUserScreen();
        }
        
    } catch (error) {
        showError('Ошибка подключения к серверу');
        console.error(error);
    }
}

// Экран администратора
function showAdminScreen() {
    hideAllScreens();
    adminScreen.classList.add('active');
    
    // Устанавливаем сегодняшнюю дату
    const dateInput = document.getElementById('date-input');
    dateInput.value = new Date().toISOString().split('T')[0];
    
    // Загружаем список сотрудников
    loadEmployees();
    
    // Слушаем изменение даты
    dateInput.addEventListener('change', loadEmployees);
}

// Загрузка списка сотрудников
async function loadEmployees() {
    const dateInput = document.getElementById('date-input');
    const date = dateInput.value;
    const employeesList = document.getElementById('employees-list');
    
    employeesList.innerHTML = '<div class="loader"></div>';
    
    try {
        const response = await fetch(`${API_URL}/api/employees?date=${date}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка загрузки данных');
        }
        
        renderEmployees(data.employees);
        
    } catch (error) {
        employeesList.innerHTML = `<div class="error-message">${error.message}</div>`;
    }
}

// Отрисовка списка сотрудников
function renderEmployees(employees) {
    const employeesList = document.getElementById('employees-list');
    
    if (employees.length === 0) {
        employeesList.innerHTML = '<p>Нет данных о сотрудниках</p>';
        return;
    }
    
    employeesList.innerHTML = employees.map(emp => {
        const user = emp.user;
        const record = emp.record;
        
        let statusBadge = '<span class="status-badge absent">Не на месте</span>';
        let details = 'Не отмечался';
        
        if (record) {
            const recordType = record.type === 'arrival' ? 'Пришел' : 'Ушел';
            const badgeClass = record.type === 'arrival' ? 'arrival' : 'departure';
            const time = new Date(record.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            
            statusBadge = `<span class="status-badge ${badgeClass}">${recordType}</span>`;
            details = `${recordType}: ${time}`;
        }
        
        return `
            <div class="employee-card" onclick="showRecordDetails(${record ? record.id : 'null'})">
                <div class="employee-info">
                    <span class="employee-name">${user.name}</span>
                    ${statusBadge}
                </div>
                <div class="employee-details">${details}</div>
            </div>
        `;
    }).join('');
}

// Показ деталей записи
async function showRecordDetails(recordId) {
    if (!recordId) return;
    
    hideAllScreens();
    detailsScreen.classList.add('active');
    
    const recordDetails = document.getElementById('record-details');
    recordDetails.innerHTML = '<div class="loader"></div>';
    
    try {
        const response = await fetch(`${API_URL}/api/records/${recordId}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка загрузки данных');
        }
        
        const record = data.record;
        const user = data.user;
        const address = data.address;
        
        const recordType = record.record_type === 'arrival' ? 'Приход' : 'Уход';
        const timestamp = new Date(record.timestamp).toLocaleString('ru-RU');
        
        recordDetails.innerHTML = `
            <div class="detail-card">
                <h3>Сотрудник</h3>
                <p>${user.name}</p>
            </div>
            <div class="detail-card">
                <h3>Тип</h3>
                <p>${recordType}</p>
            </div>
            <div class="detail-card">
                <h3>Время</h3>
                <p>${timestamp}</p>
            </div>
            ${address ? `
                <div class="detail-card">
                    <h3>Адрес</h3>
                    <p>${address.formatted_address}</p>
                </div>
            ` : ''}
            ${record.comment ? `
                <div class="detail-card">
                    <h3>Комментарий</h3>
                    <p>${record.comment}</p>
                </div>
            ` : ''}
        `;
        
    } catch (error) {
        recordDetails.innerHTML = `<div class="error-message">${error.message}</div>`;
    }
}

// Экран пользователя
function showUserScreen() {
    hideAllScreens();
    userScreen.classList.add('active');
    
    // Отображаем информацию о пользователе
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');
    
    userName.textContent = currentUser.name;
    
    // Получаем аватар из Telegram
    const telegramUser = tg.initDataUnsafe?.user;
    if (telegramUser?.photo_url) {
        userAvatar.innerHTML = `<img src="${telegramUser.photo_url}" alt="Avatar">`;
    } else {
        userAvatar.textContent = currentUser.name.charAt(0);
    }
    
    // Обработчики кнопок
    document.getElementById('arrival-btn').onclick = () => showRecordScreen('arrival');
    document.getElementById('departure-btn').onclick = () => showRecordScreen('departure');
}

// Экран создания записи
async function showRecordScreen(recordType) {
    currentRecordType = recordType;
    hideAllScreens();
    recordScreen.classList.add('active');
    
    // Устанавливаем заголовок
    const recordTitle = document.getElementById('record-title');
    recordTitle.textContent = recordType === 'arrival' ? 'Отметка о приходе' : 'Отметка об уходе';
    
    // Получаем геолокацию
    await getLocation();
}

// Получение геолокации
async function getLocation() {
    const locationInfo = document.getElementById('location-info');
    const addressInfo = document.getElementById('address-info');
    
    try {
        if (!navigator.geolocation) {
            throw new Error('Геолокация не поддерживается');
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                
                locationInfo.innerHTML = `
                    <span>✅ Местоположение определено</span>
                `;
                
                addressInfo.textContent = `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`;
            },
            (error) => {
                locationInfo.innerHTML = `
                    <span>❌ Не удалось определить местоположение</span>
                `;
                addressInfo.textContent = 'Ошибка определения адреса';
                console.error(error);
            }
        );
        
    } catch (error) {
        locationInfo.innerHTML = `
            <span>❌ ${error.message}</span>
        `;
    }
}

// Обработка формы
document.getElementById('record-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentLocation) {
        alert('Не удалось определить местоположение');
        return;
    }
    
    const submitBtn = e.target.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Сохранение...';
    
    try {
        const comment = document.getElementById('comment').value;
        
        const response = await fetch(`${API_URL}/api/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                type: currentRecordType,
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                comment: comment || null
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка сохранения');
        }
        
        // Показываем успешное сообщение
        tg.showAlert('Запись успешно сохранена!', () => {
            showUserScreen();
        });
        
    } catch (error) {
        alert(error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Сохранить';
    }
});

// Кнопки назад
document.getElementById('back-btn').addEventListener('click', showUserScreen);
document.getElementById('details-back-btn').addEventListener('click', showAdminScreen);

// Утилиты
function hideAllScreens() {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
}

function showError(message) {
    hideAllScreens();
    loadingScreen.classList.add('active');
    loadingScreen.innerHTML = `<div class="error-message">${message}</div>`;
}

// Запуск приложения
init();


// Инициализация Telegram Mini App SDK
console.log('=== Telegram SDK Initialization ===');
console.log('window.telegramApps:', window.telegramApps);
console.log('window.Telegram:', window.Telegram);
console.log('window.Telegram?.WebApp:', window.Telegram?.WebApp);

let initDataRaw = '';
let initDataParsed = null;

// Используем официальный Telegram Web App API (наиболее надежный)
if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    console.log('Using Telegram WebApp API');
    console.log('Telegram WebApp:', tg);
    console.log('Platform:', tg.platform);
    console.log('Version:', tg.version);
    
    tg.ready();
    tg.expand();
    
    initDataRaw = tg.initData || '';
    initDataParsed = tg.initDataUnsafe || null;
    
    console.log('initDataRaw length:', initDataRaw.length);
    console.log('initDataRaw:', initDataRaw);
    console.log('initDataParsed:', initDataParsed);
    
    // Применяем цветовую схему
    if (tg.themeParams) {
        document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
        document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
        document.documentElement.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color || '#2481cc');
        document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#2481cc');
        document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
    }
} else if (window.telegramApps && window.telegramApps.init) {
    // SDK v3 - используем новый API (если доступен)
    const sdk = window.telegramApps;
    console.log('Using Telegram Apps SDK v3');
    
    sdk.init();
    
    const { miniApp, viewport, initData } = sdk;
    
    if (miniApp && miniApp.mount) {
        miniApp.mount();
        miniApp.ready();
    }
    
    if (viewport && viewport.mount) {
        viewport.mount();
        viewport.expand();
    }
    
    if (initData && initData.mount) {
        initData.mount();
        initDataRaw = initData.raw ? initData.raw() : '';
        initDataParsed = initData.state ? initData.state() : null;
    }
    
    console.log('initDataRaw:', initDataRaw);
    console.log('initDataParsed:', initDataParsed);
} else {
    console.error('❌ Telegram SDK not found - app must be opened in Telegram');
}

// API URL
const API_URL = window.location.origin;

// Глобальные переменные
let currentUser = null;
let isAdmin = false;
let currentRecordType = null;
let currentLocation = null;
let currentLocationTimestamp = null; // Время получения геолокации
let yandexMapsApiKey = null;
let yandexMapsLoaded = false;

// Элементы DOM
const loadingScreen = document.getElementById('loading-screen');
const adminScreen = document.getElementById('admin-screen');
const userScreen = document.getElementById('user-screen');
const recordScreen = document.getElementById('record-screen');
const detailsScreen = document.getElementById('details-screen');

// Загрузка конфигурации
async function loadConfig() {
    try {
        const response = await fetch(`${API_URL}/api/config`, {
            headers: {
                'Authorization': `tma ${initDataRaw}`
            }
        });
        if (response.ok) {
            const config = await response.json();
            yandexMapsApiKey = config.yandex_maps_api_key;
            
            // Динамически загружаем Яндекс.Карты API
            if (yandexMapsApiKey) {
                await loadYandexMapsAPI();
            }
        }
    } catch (error) {
        console.error('Failed to load config:', error);
    }
}

// Динамическая загрузка Яндекс.Карты API
function loadYandexMapsAPI() {
    return new Promise((resolve, reject) => {
        if (yandexMapsLoaded || typeof ymaps !== 'undefined') {
            yandexMapsLoaded = true;
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = `https://api-maps.yandex.ru/2.1/?apikey=${yandexMapsApiKey}&lang=ru_RU`;
        script.type = 'text/javascript';
        script.onload = () => {
            yandexMapsLoaded = true;
            resolve();
        };
        script.onerror = () => {
            console.error('Failed to load Yandex Maps API');
            reject();
        };
        document.head.appendChild(script);
    });
}

// Инициализация приложения
async function initApp() {
    try {
        console.log('=== App Initialization ===');
        console.log('initDataRaw:', initDataRaw);
        console.log('initDataParsed:', initDataParsed);
        
        const telegramUser = initDataParsed?.user;
        console.log('telegramUser:', telegramUser);
        
        if (!telegramUser || !initDataRaw) {
            const errorDetails = [];
            if (!telegramUser) errorDetails.push('Отсутствуют данные пользователя Telegram');
            if (!initDataRaw) errorDetails.push('Отсутствует initDataRaw');
            
            console.error('Initialization failed:', errorDetails);
            showError('Ошибка получения данных пользователя.<br><br>Детали:<br>' + errorDetails.join('<br>') + '<br><br>Приложение должно быть открыто в Telegram.');
            return;
        }
        
        // Аутентификация с отправкой initDataRaw в заголовке Authorization
        console.log('=== Authentication Request ===');
        console.log('API_URL:', API_URL);
        console.log('initDataRaw length:', initDataRaw.length);
        console.log('initDataRaw:', initDataRaw);
        console.log('telegram_id:', telegramUser.id);
        
        const response = await fetch(`${API_URL}/api/auth`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `tma ${initDataRaw}`
            },
            body: JSON.stringify({ 
                telegram_id: telegramUser.id
            })
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Array.from(response.headers.entries()));
        
        if (!response.ok) {
            const error = await response.json();
            console.error('Authentication error:', error);
            showError(error.error || 'Ошибка аутентификации');
            return;
        }
        
        const data = await response.json();
        isAdmin = data.is_admin;
        currentUser = data.user;
        
        console.log('=== Show Screen ===');
        console.log('isAdmin:', isAdmin);
        console.log('currentUser:', currentUser);
        
        // Загружаем конфигурацию (включая API ключ Яндекс.Карт) ПОСЛЕ аутентификации
        await loadConfig();
        
        // Показываем соответствующий экран
        if (isAdmin) {
            console.log('Calling showAdminScreen()');
            showAdminScreen();
        } else {
            console.log('Calling showUserScreen()');
            showUserScreen();
        }
        
    } catch (error) {
        showError('Ошибка подключения к серверу');
        console.error(error);
    }
}

// Экран администратора
function showAdminScreen() {
    console.log('=== showAdminScreen called ===');
    console.log('adminScreen element:', adminScreen);
    
    hideAllScreens();
    adminScreen.classList.add('active');
    
    console.log('adminScreen classes:', adminScreen.className);
    console.log('All screens:', document.querySelectorAll('.screen'));
    
    // Устанавливаем сегодняшнюю дату
    const dateInput = document.getElementById('date-input');
    dateInput.value = new Date().toISOString().split('T')[0];
    
    console.log('Date input value:', dateInput.value);
    
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
        console.log('=== Loading Employees ===');
        console.log('Date:', date);
        
        const response = await fetch(`${API_URL}/api/employees?date=${date}`, {
            headers: {
                'Authorization': `tma ${initDataRaw}`
            }
        });
        
        console.log('Response status:', response.status);
        
        const data = await response.json();
        console.log('Response data:', data);
        console.log('Employees count:', data.employees?.length);
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка загрузки данных');
        }
        
        renderEmployees(data.employees);
        
    } catch (error) {
        console.error('Error loading employees:', error);
        employeesList.innerHTML = `<div class="error-message">${error.message}</div>`;
    }
}

// Отрисовка списка сотрудников
function renderEmployees(employees) {
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
        const response = await fetch(`${API_URL}/api/records/${recordId}`, {
            headers: {
                'Authorization': `tma ${initDataRaw}`
            }
        });
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
    
    // Получаем аватар из Telegram (новый SDK использует photoUrl)
    const telegramUser = initDataParsed?.user;
    if (telegramUser?.photoUrl) {
        userAvatar.innerHTML = `<img src="${telegramUser.photoUrl}" alt="Avatar">`;
    } else {
        userAvatar.textContent = currentUser.name.charAt(0);
    }
    
    // Инициализируем карту
    initUserMap();
    
    // Обработчики кнопок
    document.getElementById('arrival-btn').onclick = () => showRecordScreen('arrival');
    document.getElementById('departure-btn').onclick = () => showRecordScreen('departure');
}

// Инициализация карты пользователя
let userMapInstance = null;
let userMapPlacemark = null;
function initUserMap() {
    const mapContainer = document.getElementById('user-map');
    
    // Если карта уже существует, уничтожаем её перед пересозданием
    if (userMapInstance) {
        console.log('Уничтожаем старую карту');
        try {
            if (userMapInstance.destroy) {
                userMapInstance.destroy();
            }
        } catch (e) {
            console.error('Ошибка при уничтожении карты:', e);
        }
        userMapInstance = null;
        userMapPlacemark = null;
    }
    
    // Проверяем, загружен ли API ключ
    if (!yandexMapsApiKey) {
        mapContainer.innerHTML = '<div class="map-loader"><span>API ключ Яндекс.Карт не настроен</span></div>';
        console.error('Yandex Maps API key not configured');
        return;
    }
    
    // Проверяем доступность Yandex Maps API
    if (!yandexMapsLoaded || typeof ymaps === 'undefined') {
        mapContainer.innerHTML = '<div class="map-loader"><span>Яндекс Карты недоступны</span></div>';
        console.error('Yandex Maps API not loaded');
        return;
    }
    
    // Показываем индикатор загрузки
    mapContainer.innerHTML = '<div class="map-loader"><div class="loader small"></div><span>Загрузка карты...</span></div>';
    
    // Функция для создания карты с заданными координатами
    const createMap = (userLat, userLon) => {
        // Очищаем контейнер
        mapContainer.innerHTML = '';
        
        // Инициализируем карту после загрузки API
        ymaps.ready(() => {
            try {
                // Создаем карту с минимальным набором элементов управления
                userMapInstance = new ymaps.Map('user-map', {
                    center: [userLat, userLon],
                    zoom: 16,
                    // Доступные элементы управления:
                    // 'zoomControl' - кнопки + и - для масштабирования
                    // 'geolocationControl' - кнопка определения местоположения
                    // 'typeSelector' - переключатель типа карты (схема/спутник)
                    // 'fullscreenControl' - кнопка полноэкранного режима
                    // 'routeButtonControl' - кнопка построения маршрута
                    // 'trafficControl' - пробки
                    // 'searchControl' - поиск
                    // 'rulerControl' - линейка
                    controls: ['zoomControl', 'geolocationControl']
                });
                
                // Настраиваем положение элементов управления
                // Опции: { left, right, top, bottom } - отступы в пикселях
                userMapInstance.controls.get('zoomControl').options.set({
                    position: { right: 10, top: 10 },
                    size: 'small' // 'small', 'medium', 'large'
                });
                
                userMapInstance.controls.get('geolocationControl').options.set({
                    position: { right: 10, top: 80 }
                });
                
                // Добавляем метку пользователя
                userMapPlacemark = new ymaps.Placemark([userLat, userLon], {
                    balloonContent: `<strong>${currentUser.name}</strong><br>Ваше местоположение`,
                    iconCaption: currentUser.name
                }, {
                    preset: 'islands#blueCircleDotIcon',
                    iconColor: '#3390ec'
                });
                
                userMapInstance.geoObjects.add(userMapPlacemark);
                
                // Настройка поведения карты
                userMapInstance.behaviors.disable('scrollZoom'); // Отключаем зум колесиком
                // Другие доступные behaviors:
                // 'drag' - перетаскивание карты
                // 'dblClickZoom' - зум двойным кликом
                // 'rightMouseButtonMagnifier' - лупа правой кнопкой
                // 'multiTouch' - мультитач жесты
                
            } catch (error) {
                console.error('Error initializing map:', error);
                mapContainer.innerHTML = '<div class="map-loader"><span>Ошибка загрузки карты</span></div>';
            }
        });
    };
    
    // Проверяем, есть ли уже сохраненная геолокация
    if (currentLocation && currentLocation.latitude && currentLocation.longitude) {
        console.log('Используем сохраненную геолокацию для карты:', currentLocation);
        createMap(currentLocation.latitude, currentLocation.longitude);
        return;
    }
    
    // Получаем новую геолокацию, если её нет
    if (!navigator.geolocation) {
        mapContainer.innerHTML = '<div class="map-loader"><span>Геолокация не поддерживается</span></div>';
        return;
    }
    
    console.log('Запрашиваем новую геолокацию для карты');
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLat = position.coords.latitude;
            const userLon = position.coords.longitude;
            
            // Сохраняем геолокацию глобально для переиспользования
            currentLocation = {
                latitude: userLat,
                longitude: userLon
            };
            currentLocationTimestamp = Date.now(); // Сохраняем время получения
            
            createMap(userLat, userLon);
        },
        (error) => {
            console.error('Geolocation error:', error);
            mapContainer.innerHTML = '<div class="map-loader"><span>Не удалось определить местоположение</span></div>';
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
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

// Проверка актуальности геолокации
function isLocationStale() {
    if (!currentLocation || !currentLocationTimestamp) {
        return true; // Геолокации нет, нужно получить
    }
    
    const now = Date.now();
    const ageMinutes = (now - currentLocationTimestamp) / 1000 / 60;
    
    // Рандомный интервал от 5 до 15 минут (10 ± 5)
    // Генерируем один раз при проверке для текущей сессии
    const expirationMinutes = 10 + (Math.random() * 10 - 5); // от 5 до 15 минут
    
    console.log(`Возраст геолокации: ${ageMinutes.toFixed(1)} мин, истекает через: ${expirationMinutes.toFixed(1)} мин`);
    
    return ageMinutes > expirationMinutes;
}

// Получение геолокации
async function getLocation() {
    const locationInfo = document.getElementById('location-info');
    const addressInfo = document.getElementById('address-info');
    
    try {
        if (!navigator.geolocation) {
            throw new Error('Геолокация не поддерживается');
        }
        
        // Проверяем, есть ли актуальная сохраненная геолокация
        if (currentLocation && !isLocationStale()) {
            console.log('Используем сохраненную геолокацию:', currentLocation);
            
            locationInfo.innerHTML = `
                <span>✅ Местоположение определено</span>
            `;
            
            // Получаем адрес по координатам
            addressInfo.innerHTML = '<div class="loader small"></div><span>Определение адреса...</span>';
            
            try {
                const response = await fetch(`${API_URL}/api/address?latitude=${currentLocation.latitude}&longitude=${currentLocation.longitude}`, {
                    headers: {
                        'Authorization': `tma ${initDataRaw}`
                    }
                });
                
                if (response.ok) {
                    const addressData = await response.json();
                    addressInfo.textContent = addressData.formatted_address || `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`;
                } else {
                    addressInfo.textContent = `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`;
                }
            } catch (error) {
                console.error('Ошибка получения адреса:', error);
                addressInfo.textContent = `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`;
            }
            
            return; // Выходим, не запрашивая геолокацию повторно
        }
        
        // Геолокация устарела или её нет, запрашиваем новую
        console.log('Запрос новой геолокации (устарела или отсутствует)');
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                currentLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                currentLocationTimestamp = Date.now(); // Обновляем timestamp
                
                locationInfo.innerHTML = `
                    <span>✅ Местоположение определено</span>
                `;
                
                // Получаем адрес по координатам
                addressInfo.innerHTML = '<div class="loader small"></div><span>Определение адреса...</span>';
                
                try {
                    const response = await fetch(`${API_URL}/api/address?latitude=${currentLocation.latitude}&longitude=${currentLocation.longitude}`, {
                        headers: {
                            'Authorization': `tma ${initDataRaw}`
                        }
                    });
                    
                    if (response.ok) {
                        const addressData = await response.json();
                        addressInfo.textContent = addressData.formatted_address || `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`;
                    } else {
                        addressInfo.textContent = `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`;
                    }
                } catch (error) {
                    console.error('Ошибка получения адреса:', error);
                    addressInfo.textContent = `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`;
                }
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
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `tma ${initDataRaw}`
            },
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
        if (window.Telegram?.WebApp?.showPopup) {
            window.Telegram.WebApp.showPopup({
                title: 'Успех',
                message: 'Запись успешно сохранена!',
                buttons: [{ id: 'ok', type: 'default', text: 'OK' }]
            }, () => {
                showUserScreen();
            });
        } else {
            // Fallback на обычный alert
            alert('Запись успешно сохранена!');
            showUserScreen();
        }
        
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
initApp();


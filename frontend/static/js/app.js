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
let selectedPhoto = null; // Выбранное фото для загрузки

// Элементы DOM
const loadingScreen = document.getElementById('loading-screen');
const adminScreen = document.getElementById('admin-screen');
const userScreen = document.getElementById('user-screen');
const recordScreen = document.getElementById('record-screen');
const detailsScreen = document.getElementById('details-screen');
const mapScreen = document.getElementById('map-screen');

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
    
    // Обработчик кнопки карты
    const mapBtn = document.getElementById('map-btn');
    if (mapBtn) {
        // Удаляем старый обработчик, если есть
        mapBtn.replaceWith(mapBtn.cloneNode(true));
        const newMapBtn = document.getElementById('map-btn');
        newMapBtn.addEventListener('click', showMapScreen);
    }
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
        let photoBadge = '';
        
        if (record) {
            const recordType = record.type === 'arrival' ? 'Пришел' : 'Ушел';
            const badgeClass = record.type === 'arrival' ? 'arrival' : 'departure';
            const time = new Date(record.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            
            statusBadge = `<span class="status-badge ${badgeClass}">${recordType}</span>`;
            details = `${recordType}: ${time}`;
            
            // Показываем значок камеры если есть фото (lazy loading)
            if (record.has_photo) {
                photoBadge = '<span class="photo-badge">📷</span>';
            }
        }
        
        return `
            <div class="employee-card" onclick="showRecordDetails(${record ? record.id : 'null'})">
                <div class="employee-info">
                    <span class="employee-name">${user.name}${photoBadge}</span>
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
            ${record.photo_url ? `
                <div class="detail-card photo-card">
                    <h3>Фотография</h3>
                    <img 
                        src="${record.photo_url}" 
                        alt="Фото записи" 
                        class="record-photo"
                        onclick="openPhotoFullscreen('${record.photo_url}')"
                        loading="lazy"
                    />
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
    
    // Получаем аватар - приоритет: avatar_url из БД, затем photoUrl из Telegram
    const avatarUrl = currentUser.avatar_url || initDataParsed?.user?.photoUrl;
    
    if (avatarUrl) {
        userAvatar.innerHTML = `<img src="${avatarUrl}" alt="Avatar" onerror="this.style.display='none'; this.parentElement.textContent='${currentUser.name.charAt(0)}'; this.parentElement.style.fontSize='32px';">`;
    } else {
        userAvatar.textContent = currentUser.name.charAt(0);
    }
    
    // Инициализируем карту
    initUserMap();
    
    // Обработчики кнопок
    document.getElementById('arrival-btn').onclick = () => showRecordScreen('arrival');
    document.getElementById('departure-btn').onclick = () => showRecordScreen('departure');
}

// Функция для создания кастомной иконки с аватаркой
// Примечание: должна вызываться только после загрузки ymaps
function createAvatarIcon(avatarUrl, userName) {
    if (typeof ymaps === 'undefined') {
        return {
            preset: 'islands#blueCircleDotIcon',
            iconColor: '#3390ec'
        };
    }
    
    let iconHtml;
    
    if (avatarUrl) {
        // HTML для аватарки с подписью снизу
        iconHtml = '<div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">' +
            '<div style="width: 40px; height: 40px; border-radius: 50%; overflow: hidden; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.3); background: #f0f0f0;">' +
                '<img src="' + avatarUrl + '" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.parentElement.innerHTML=\'<div style=\\\'width:100%;height:100%;background:#3390ec;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:16px;\\\'>' + (userName ? userName.charAt(0).toUpperCase() : '?') + '</div>\'" />' +
            '</div>' +
            '<div style="margin-top: 4px; padding: 2px 6px; background: #fff; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.2); font-size: 12px; font-weight: 600; white-space: nowrap; color: #000;">' + 
                (userName || 'Пользователь') + 
            '</div>' +
        '</div>';
    } else {
        // HTML для стандартной метки (кружок с буквой) с подписью снизу
        iconHtml = '<div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">' +
            '<div style="width: 40px; height: 40px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.3); background: #3390ec; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; font-size: 16px;">' +
                (userName ? userName.charAt(0).toUpperCase() : '?') +
            '</div>' +
            '<div style="margin-top: 4px; padding: 2px 6px; background: #fff; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.2); font-size: 12px; font-weight: 600; white-space: nowrap; color: #000;">' + 
                (userName || 'Пользователь') + 
            '</div>' +
        '</div>';
    }
    
    const iconLayout = ymaps.templateLayoutFactory.createClass(iconHtml);
    
    return {
        iconLayout: iconLayout,
        iconShape: {
            type: 'Circle',
            coordinates: [20, 20],
            radius: 20
        },
        // Смещаем иконку так, чтобы центр был на точке координат
        iconOffset: [-20, -25]
    };
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
                
                // Добавляем метку пользователя с аватаркой
                const iconOptions = createAvatarIcon(currentUser.avatar_url, currentUser.name);
                userMapPlacemark = new ymaps.Placemark([userLat, userLon], {
                    balloonContent: `<strong>${currentUser.name}</strong><br>Ваше местоположение`
                }, iconOptions);
                
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
    
    // Сбрасываем выбранное фото
    resetPhotoSelection();
    
    // Получаем геолокацию
    await getLocation();
}

// Сброс выбранного фото
function resetPhotoSelection() {
    selectedPhoto = null;
    document.getElementById('photo-input').value = '';
    document.getElementById('photo-preview').style.display = 'none';
    document.getElementById('preview-image').src = '';
    document.getElementById('photo-size-info').textContent = '';
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

// Обработчик выбора фото (теперь работает через label for="photo-input")
document.getElementById('photo-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Валидация размера (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        if (window.Telegram?.WebApp?.showPopup) {
            window.Telegram.WebApp.showPopup({
                title: 'Ошибка',
                message: 'Размер фото не должен превышать 5MB',
                buttons: [{ id: 'ok', type: 'default', text: 'OK' }]
            });
        } else {
            alert('Размер фото не должен превышать 5MB');
        }
        resetPhotoSelection();
        return;
    }
    
    // Предпросмотр
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('preview-image').src = e.target.result;
        document.getElementById('photo-preview').style.display = 'block';
        
        // Показываем размер файла
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        document.getElementById('photo-size-info').textContent = `Размер: ${sizeMB} MB`;
    };
    reader.readAsDataURL(file);
    
    selectedPhoto = file;
    console.log('Photo selected:', file.name, file.size, 'bytes');
});

// Обработчик удаления фото
document.getElementById('remove-photo-btn').addEventListener('click', () => {
    resetPhotoSelection();
});

// ============== CAMERA FUNCTIONALITY ==============

let cameraStream = null;
let currentFacingMode = 'environment'; // 'environment' = задняя камера, 'user' = фронтальная

// Открытие камеры
async function openCamera() {
    const modal = document.getElementById('camera-modal');
    const video = document.getElementById('camera-video');
    
    modal.style.display = 'flex';
    
    try {
        // Запрашиваем доступ к камере
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: currentFacingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        });
        
        video.srcObject = cameraStream;
        await video.play();
        
    } catch (error) {
        console.error('Camera access error:', error);
        closeCamera();
        
        if (window.Telegram?.WebApp?.showPopup) {
            window.Telegram.WebApp.showPopup({
                title: 'Ошибка',
                message: 'Не удалось получить доступ к камере. Проверьте разрешения.',
                buttons: [{ id: 'ok', type: 'default', text: 'OK' }]
            });
        } else {
            alert('Не удалось получить доступ к камере. Проверьте разрешения.');
        }
    }
}

// Закрытие камеры
function closeCamera() {
    const modal = document.getElementById('camera-modal');
    const video = document.getElementById('camera-video');
    
    // Останавливаем все треки (камеру)
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    
    video.srcObject = null;
    modal.style.display = 'none';
}

// Захват фото с камеры
function capturePhoto() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const ctx = canvas.getContext('2d');
    
    // Устанавливаем размер canvas равным размеру видео
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Рисуем текущий кадр на canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Конвертируем canvas в Blob
    canvas.toBlob((blob) => {
        if (!blob) {
            console.error('Failed to capture photo');
            return;
        }
        
        // Создаем File объект из Blob
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        // Валидация размера (5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            if (window.Telegram?.WebApp?.showPopup) {
                window.Telegram.WebApp.showPopup({
                    title: 'Ошибка',
                    message: 'Размер фото не должен превышать 5MB',
                    buttons: [{ id: 'ok', type: 'default', text: 'OK' }]
                });
            } else {
                alert('Размер фото не должен превышать 5MB');
            }
            return;
        }
        
        // Устанавливаем фото как выбранное
        selectedPhoto = file;
        
        // Показываем предпросмотр
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('preview-image').src = e.target.result;
            document.getElementById('photo-preview').style.display = 'block';
            
            // Показываем размер файла
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            document.getElementById('photo-size-info').textContent = `Размер: ${sizeMB} MB`;
        };
        reader.readAsDataURL(file);
        
        console.log('Photo captured:', file.name, file.size, 'bytes');
        
        // Закрываем камеру
        closeCamera();
        
    }, 'image/jpeg', 0.9); // 0.9 = качество JPEG (90%)
}

// Переключение камеры (фронтальная/задняя)
async function switchCamera() {
    // Переключаем режим
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    
    // Закрываем текущую камеру
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    
    // Открываем камеру с новым режимом
    const video = document.getElementById('camera-video');
    
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: currentFacingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        });
        
        video.srcObject = cameraStream;
        await video.play();
        
    } catch (error) {
        console.error('Camera switch error:', error);
        
        // Если не удалось переключить, возвращаем обратно
        currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
        
        if (window.Telegram?.WebApp?.showPopup) {
            window.Telegram.WebApp.showPopup({
                title: 'Ошибка',
                message: 'Не удалось переключить камеру',
                buttons: [{ id: 'ok', type: 'default', text: 'OK' }]
            });
        } else {
            alert('Не удалось переключить камеру');
        }
    }
}

// Обработчики событий для камеры
document.getElementById('take-photo-btn').addEventListener('click', openCamera);
document.getElementById('close-camera-btn').addEventListener('click', closeCamera);
document.getElementById('capture-btn').addEventListener('click', capturePhoto);
document.getElementById('switch-camera-btn').addEventListener('click', switchCamera);

// Закрываем камеру при клике на фон модального окна
document.getElementById('camera-modal').addEventListener('click', (e) => {
    if (e.target.id === 'camera-modal') {
        closeCamera();
    }
});

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
        
        // 1. Создаем запись
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
        
        const recordId = data.record.id;
        console.log('Record created:', recordId);
        
        // 2. Если есть фото, загружаем его
        if (selectedPhoto) {
            submitBtn.textContent = 'Загрузка фото...';
            console.log('Uploading photo for record:', recordId);
            
            const formData = new FormData();
            formData.append('photo', selectedPhoto);
            
            const photoResponse = await fetch(`${API_URL}/api/records/${recordId}/photo`, {
                method: 'POST',
                headers: {
                    'Authorization': `tma ${initDataRaw}`
                },
                body: formData
            });
            
            if (!photoResponse.ok) {
                const photoError = await photoResponse.json();
                console.error('Photo upload failed:', photoError);
                // Не прерываем процесс, запись уже создана
                throw new Error(`Запись сохранена, но фото не загружено: ${photoError.error || 'Неизвестная ошибка'}`);
            }
            
            const photoData = await photoResponse.json();
            console.log('Photo uploaded:', photoData.photo_url);
        }
        
        // 3. Показываем успешное сообщение
        if (window.Telegram?.WebApp?.showPopup) {
            window.Telegram.WebApp.showPopup({
                title: 'Успех',
                message: selectedPhoto ? 'Запись и фото успешно сохранены!' : 'Запись успешно сохранена!',
                buttons: [{ id: 'ok', type: 'default', text: 'OK' }]
            }, () => {
                showUserScreen();
            });
        } else {
            // Fallback на обычный alert
            alert(selectedPhoto ? 'Запись и фото успешно сохранены!' : 'Запись успешно сохранена!');
            showUserScreen();
        }
        
    } catch (error) {
        console.error('Form submission error:', error);
        if (window.Telegram?.WebApp?.showPopup) {
            window.Telegram.WebApp.showPopup({
                title: 'Ошибка',
                message: error.message,
                buttons: [{ id: 'ok', type: 'default', text: 'OK' }]
            });
        } else {
            alert(error.message);
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Сохранить';
    }
});

// Полноэкранный просмотр фото
function openPhotoFullscreen(photoUrl) {
    console.log('Opening photo fullscreen:', photoUrl);
    
    // Telegram Mini App имеет встроенную поддержку просмотра изображений
    if (window.Telegram?.WebApp?.openLink) {
        // Открываем в браузере для полноэкранного просмотра
        window.Telegram.WebApp.openLink(photoUrl);
    } else {
        // Fallback - открываем в новой вкладке
        window.open(photoUrl, '_blank');
    }
}

// Экран карты со всеми местоположениями
let fullMapInstance = null;
async function showMapScreen() {
    hideAllScreens();
    mapScreen.classList.add('active');
    
    const mapContainer = document.getElementById('full-map');
    
    // Уничтожаем старую карту, если есть
    if (fullMapInstance) {
        try {
            if (fullMapInstance.destroy) {
                fullMapInstance.destroy();
            }
        } catch (e) {
            console.error('Ошибка при уничтожении карты:', e);
        }
        fullMapInstance = null;
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
    
    try {
        // Получаем текущие местоположения сотрудников
        const response = await fetch(`${API_URL}/api/current-locations`, {
            headers: {
                'Authorization': `tma ${initDataRaw}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки данных');
        }
        
        const data = await response.json();
        const locations = data.locations || [];
        
        console.log('Current locations:', locations);
        
        if (locations.length === 0) {
            mapContainer.innerHTML = '<div class="map-loader"><span>Нет сотрудников на месте</span></div>';
            return;
        }
        
        // Очищаем контейнер
        mapContainer.innerHTML = '';
        
        // Инициализируем карту
        ymaps.ready(() => {
            try {
                // Вычисляем центр и зум для всех точек
                const bounds = locations.map(loc => [loc.latitude, loc.longitude]);
                
                // Создаем карту
                fullMapInstance = new ymaps.Map('full-map', {
                    center: bounds[0], // Временный центр
                    zoom: 10,
                    controls: ['zoomControl', 'geolocationControl', 'typeSelector']
                });
                
                // Добавляем метки для каждого сотрудника с аватарками
                locations.forEach(loc => {
                    const iconOptions = createAvatarIcon(loc.user.avatar_url, loc.user.name);
                    
                    const placemark = new ymaps.Placemark([loc.latitude, loc.longitude], {
                        balloonContent: `
                            <strong>${loc.user.name}</strong><br>
                            ${loc.address || 'Адрес не определен'}<br>
                            <small>Отметка: ${new Date(loc.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</small>
                        `
                    }, iconOptions);
                    
                    fullMapInstance.geoObjects.add(placemark);
                });
                
                // Автоматически подстраиваем зум и центр под все метки
                fullMapInstance.setBounds(fullMapInstance.geoObjects.getBounds(), {
                    checkZoomRange: true,
                    zoomMargin: 50
                });
                
            } catch (error) {
                console.error('Error initializing map:', error);
                mapContainer.innerHTML = '<div class="map-loader"><span>Ошибка загрузки карты</span></div>';
            }
        });
        
    } catch (error) {
        console.error('Error loading locations:', error);
        mapContainer.innerHTML = `<div class="map-loader"><span>${error.message}</span></div>`;
    }
}

// Кнопки назад
document.getElementById('back-btn').addEventListener('click', showUserScreen);
document.getElementById('details-back-btn').addEventListener('click', showAdminScreen);
document.getElementById('map-back-btn').addEventListener('click', showAdminScreen);

// Утилиты
function hideAllScreens() {
    // Закрываем камеру если она открыта
    if (cameraStream) {
        closeCamera();
    }
    
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


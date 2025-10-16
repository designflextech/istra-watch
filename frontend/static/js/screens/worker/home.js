/**
 * Worker Home Screen
 * Главный экран работника с кнопками "я на месте"/"я ухожу"
 */

import { API } from '../../utils/api.js';
import { telegramSDK } from '../../utils/telegram.js';
import { showScreen } from '../../utils/helpers.js';
import { getLocation } from '../../utils/geolocation.js';
import { createMap, createAvatarIcon, addPlacemark, isYandexMapsLoaded } from '../../utils/yandex-maps.js';

let userMapInstance = null;
let userMapPlacemark = null;

/**
 * Показать главный экран работника
 */
export async function showWorkerHome(user) {
    showScreen('user-screen');
    
    // Отображаем информацию о пользователе
    renderUserInfo(user);
    
    // Инициализируем карту
    await initUserMap(user);
    
    // Обновляем кнопку действия и отображаем записи времени/местоположения
    await updateActionButtonAndRecords(user);
}

/**
 * Отобразить информацию о пользователе
 */
function renderUserInfo(user) {
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');
    const userDate = document.getElementById('user-date');
    
    userName.textContent = user.name;
    
    // Получаем аватар - приоритет: avatar_url из БД, затем photoUrl из Telegram
    const avatarUrl = user.avatar_url || telegramSDK.initDataParsed?.user?.photoUrl;
    
    if (avatarUrl) {
        userAvatar.src = avatarUrl;
        userAvatar.onerror = () => {
            // Fallback если не загрузилась картинка
            userAvatar.style.display = 'none';
        };
    } else {
        userAvatar.style.display = 'none';
    }
    
    // Устанавливаем дату
    const today = new Date();
    const options = { day: 'numeric', month: 'long' };
    const dateStr = today.toLocaleDateString('ru-RU', options);
    const dayName = today.toLocaleDateString('ru-RU', { weekday: 'long' });
    
    userDate.innerHTML = `<span class="highlight">${dateStr},</span> ${dayName}`;
}

/**
 * Инициализация карты пользователя
 */
async function initUserMap(user) {
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
    
    // Проверяем доступность Yandex Maps API
    if (!isYandexMapsLoaded()) {
        mapContainer.innerHTML = '<div class="map-loader"><span>Яндекс Карты недоступны</span></div>';
        console.error('Yandex Maps API not loaded');
        return;
    }
    
    // Показываем индикатор загрузки
    mapContainer.innerHTML = '<div class="map-loader"><div class="loader small"></div><span>Загрузка карты...</span></div>';
    
    try {
        // Получаем геолокацию
        const location = await getLocation();
        
        // Очищаем контейнер
        mapContainer.innerHTML = '';
        
        // Создаем карту
        userMapInstance = await createMap('user-map', [location.latitude, location.longitude], 16, ['zoomControl', 'geolocationControl']);
        
        // Обновляем размер карты после создания
        if (userMapInstance && userMapInstance.container) {
            userMapInstance.container.fitToViewport();
        }
        
        // Настраиваем положение элементов управления
        userMapInstance.controls.get('zoomControl').options.set({
            position: { right: 10, top: 10 },
            size: 'small'
        });
        
        userMapInstance.controls.get('geolocationControl').options.set({
            position: { right: 10, top: 80 }
        });
        
        // Добавляем метку пользователя с аватаркой
        const iconOptions = createAvatarIcon(user.avatar_url, user.name);
        userMapPlacemark = addPlacemark(
            userMapInstance,
            [location.latitude, location.longitude],
            {
                balloonContent: `<strong>${user.name}</strong><br>Ваше местоположение`
            },
            iconOptions
        );
        
        // Настройка поведения карты
        userMapInstance.behaviors.disable('scrollZoom'); // Отключаем зум колесиком
        
    } catch (error) {
        console.error('Error initializing map:', error);
        mapContainer.innerHTML = '<div class="map-loader"><span>Не удалось загрузить карту</span></div>';
    }
}

/**
 * Обновить высоту карты и позиционирование кнопки в зависимости от количества записей
 */
function updateMapHeight(status) {
    const userMap = document.getElementById('user-map');
    const actionButtonContainer = document.getElementById('action-button-container');
    if (!userMap || !actionButtonContainer) return;
    
    // Удаляем все классы высоты
    userMap.classList.remove('no-records', 'with-single-record', 'with-double-records');
    actionButtonContainer.classList.remove('no-records', 'with-single-record', 'with-double-records');
    
    // Определяем количество записей
    const recordCount = (status.has_arrival ? 1 : 0) + (status.has_departure ? 1 : 0);
    
    // Устанавливаем соответствующие классы
    if (recordCount === 0) {
        userMap.classList.add('no-records');
        actionButtonContainer.classList.add('no-records');
    } else if (recordCount === 1) {
        userMap.classList.add('with-single-record');
        actionButtonContainer.classList.add('with-single-record');
    } else if (recordCount === 2) {
        userMap.classList.add('with-double-records');
        actionButtonContainer.classList.add('with-double-records');
    }
    
    // Обновляем размер карты если она уже создана
    if (userMapInstance && userMapInstance.container) {
        setTimeout(() => {
            userMapInstance.container.fitToViewport();
        }, 100); // Небольшая задержка для завершения CSS transition
    }
}

/**
 * Обновить кнопку действия и отобразить записи времени/местоположения
 */
async function updateActionButtonAndRecords(user) {
    const actionBtn = document.getElementById('action-btn');
    const timeLocationContainer = document.getElementById('time-location-container');
    const arrivalRecord = document.getElementById('arrival-record');
    const departureRecord = document.getElementById('departure-record');
    const timeLocationDivider = document.getElementById('time-location-divider');
    
    console.log('Elements found:', {
        actionBtn: !!actionBtn,
        timeLocationContainer: !!timeLocationContainer,
        arrivalRecord: !!arrivalRecord,
        departureRecord: !!departureRecord,
        timeLocationDivider: !!timeLocationDivider
    });
    
    try {
        // Получаем статус пользователя за сегодня
        const status = await API.getUserTodayStatus();
        console.log('User status response:', status);
        
        // Скрываем контейнер по умолчанию
        timeLocationContainer.style.display = 'none';
        arrivalRecord.style.display = 'none';
        departureRecord.style.display = 'none';
        timeLocationDivider.style.display = 'none';
        
        // Отображаем записи времени и местоположения
        if (status.has_arrival || status.has_departure) {
            timeLocationContainer.style.display = 'block';
            
            // Отображаем запись о приходе
            if (status.has_arrival && status.arrival_record) {
                arrivalRecord.style.display = 'flex';
                document.getElementById('arrival-time').textContent = `Пришел: ${status.arrival_record.time}`;
                document.getElementById('arrival-location').textContent = status.arrival_record.address || 'Адрес не указан';
            }
            
            // Отображаем запись об уходе
            if (status.has_departure && status.departure_record) {
                departureRecord.style.display = 'flex';
                document.getElementById('departure-time').textContent = `Ушел: ${status.departure_record.time}`;
                document.getElementById('departure-location').textContent = status.departure_record.address || 'Адрес не указан';
            }
            
            // Показываем разделитель только если есть обе записи
            if (status.has_arrival && status.has_departure) {
                timeLocationDivider.style.display = 'block';
            }
        }
        
        // Определяем, что показывать на основе статуса
        if (status.last_record_type === 'departure') {
            // Если есть отметка об уходе - скрываем кнопку
            actionBtn.style.display = 'none';
        } else if (status.last_record_type === 'arrival') {
            // Если есть отметка о приходе - показываем кнопку "Я ухожу"
            actionBtn.style.display = 'block';
            actionBtn.textContent = 'Я ухожу';
            actionBtn.className = 'btn btn-primary';
            actionBtn.style.width = '195px';
            actionBtn.onclick = () => {
                // Будет вызван из app.js
                if (window.app && window.app.showRecordForm) {
                    window.app.showRecordForm('departure', user);
                }
            };
        } else {
            // Если нет отметок - показываем кнопку "Я на месте"
            actionBtn.style.display = 'block';
            actionBtn.textContent = 'Я на месте';
            actionBtn.className = 'btn btn-primary';
            actionBtn.style.width = '195px';
            actionBtn.onclick = () => {
                // Будет вызван из app.js
                if (window.app && window.app.showRecordForm) {
                    window.app.showRecordForm('arrival', user);
                }
            };
        }
        
        // Обновляем высоту карты в зависимости от количества записей и наличия кнопки
        updateMapHeight(status);
    } catch (error) {
        console.error('Error updating action button and records:', error);
        // В случае ошибки скрываем контейнер записей и показываем кнопку "Я на месте" по умолчанию
        timeLocationContainer.style.display = 'none';
        actionBtn.style.display = 'block';
        actionBtn.textContent = 'Я на месте';
        actionBtn.className = 'btn btn-primary';
        actionBtn.style.width = '195px';
        actionBtn.onclick = () => {
            if (window.app && window.app.showRecordForm) {
                window.app.showRecordForm('arrival', user);
            }
        };
    }
}

/**
 * Обновить записи времени и местоположения (вызывается после создания новой записи)
 */
export async function refreshTimeLocationRecords(user) {
    const timeLocationContainer = document.getElementById('time-location-container');
    const arrivalRecord = document.getElementById('arrival-record');
    const departureRecord = document.getElementById('departure-record');
    const timeLocationDivider = document.getElementById('time-location-divider');
    
    console.log('Refresh - Elements found:', {
        timeLocationContainer: !!timeLocationContainer,
        arrivalRecord: !!arrivalRecord,
        departureRecord: !!departureRecord,
        timeLocationDivider: !!timeLocationDivider
    });
    
    try {
        // Получаем обновленный статус пользователя за сегодня
        const status = await API.getUserTodayStatus();
        console.log('Refresh - User status response:', status);
        
        // Скрываем контейнер по умолчанию
        timeLocationContainer.style.display = 'none';
        arrivalRecord.style.display = 'none';
        departureRecord.style.display = 'none';
        timeLocationDivider.style.display = 'none';
        
        // Отображаем записи времени и местоположения
        if (status.has_arrival || status.has_departure) {
            timeLocationContainer.style.display = 'block';
            
            // Отображаем запись о приходе
            if (status.has_arrival && status.arrival_record) {
                arrivalRecord.style.display = 'flex';
                document.getElementById('arrival-time').textContent = `Пришел: ${status.arrival_record.time}`;
                document.getElementById('arrival-location').textContent = status.arrival_record.address || 'Адрес не указан';
            }
            
            // Отображаем запись об уходе
            if (status.has_departure && status.departure_record) {
                departureRecord.style.display = 'flex';
                document.getElementById('departure-time').textContent = `Ушел: ${status.departure_record.time}`;
                document.getElementById('departure-location').textContent = status.departure_record.address || 'Адрес не указан';
            }
            
            // Показываем разделитель только если есть обе записи
            if (status.has_arrival && status.has_departure) {
                timeLocationDivider.style.display = 'block';
            }
        }
        
        // Обновляем кнопку действия
        const actionBtn = document.getElementById('action-btn');
        if (status.last_record_type === 'departure') {
            // Если есть отметка об уходе - скрываем кнопку
            actionBtn.style.display = 'none';
        } else if (status.last_record_type === 'arrival') {
            // Если есть отметка о приходе - показываем кнопку "Я ухожу"
            actionBtn.style.display = 'block';
            actionBtn.textContent = 'Я ухожу';
            actionBtn.className = 'btn btn-primary';
            actionBtn.style.width = '195px';
            actionBtn.onclick = () => {
                if (window.app && window.app.showRecordForm) {
                    window.app.showRecordForm('departure', user);
                }
            };
        } else {
            // Если нет отметок - показываем кнопку "Я на месте"
            actionBtn.style.display = 'block';
            actionBtn.textContent = 'Я на месте';
            actionBtn.className = 'btn btn-primary';
            actionBtn.style.width = '195px';
            actionBtn.onclick = () => {
                if (window.app && window.app.showRecordForm) {
                    window.app.showRecordForm('arrival', user);
                }
            };
        }
        
        // Обновляем высоту карты в зависимости от количества записей и наличия кнопки
        updateMapHeight(status);
    } catch (error) {
        console.error('Error refreshing time location records:', error);
    }
}

/**
 * Уничтожить карту (при выходе с экрана)
 */
export function destroyUserMap() {
    if (userMapInstance) {
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
}


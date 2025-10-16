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
    
    // Обновляем кнопку действия на основе статуса пользователя
    await updateActionButton(user);
}

/**
 * Отобразить информацию о пользователе
 */
function renderUserInfo(user) {
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');
    
    userName.textContent = user.name;
    
    // Получаем аватар - приоритет: avatar_url из БД, затем photoUrl из Telegram
    const avatarUrl = user.avatar_url || telegramSDK.initDataParsed?.user?.photoUrl;
    
    if (avatarUrl) {
        userAvatar.innerHTML = `<img src="${avatarUrl}" alt="Avatar" onerror="this.style.display='none'; this.parentElement.textContent='${user.name.charAt(0)}'; this.parentElement.style.fontSize='32px';">`;
    } else {
        userAvatar.textContent = user.name.charAt(0);
    }
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
 * Обновить кнопку действия на основе статуса пользователя
 */
async function updateActionButton(user) {
    const actionBtn = document.getElementById('action-btn');
    
    try {
        // Получаем статус пользователя за сегодня
        const status = await API.getUserTodayStatus();
        
        // Определяем, что показывать на основе статуса
        if (status.last_record_type === 'departure') {
            // Если есть отметка об уходе - скрываем кнопку (карта занимает её место)
            actionBtn.style.display = 'none';
        } else if (status.last_record_type === 'arrival') {
            // Если есть отметка о приходе - показываем кнопку "Я ухожу"
            actionBtn.style.display = 'block';
            actionBtn.innerHTML = 'Я ухожу';
            actionBtn.className = 'action-btn departure';
            actionBtn.onclick = () => {
                // Будет вызван из app.js
                if (window.app && window.app.showRecordForm) {
                    window.app.showRecordForm('departure', user);
                }
            };
        } else {
            // Если нет отметок - показываем кнопку "Я на месте"
            actionBtn.style.display = 'block';
            actionBtn.innerHTML = 'Я на месте';
            actionBtn.className = 'action-btn arrival';
            actionBtn.onclick = () => {
                // Будет вызван из app.js
                if (window.app && window.app.showRecordForm) {
                    window.app.showRecordForm('arrival', user);
                }
            };
        }
    } catch (error) {
        console.error('Error updating action button:', error);
        // В случае ошибки показываем кнопку "Я на месте" по умолчанию
        actionBtn.style.display = 'block';
        actionBtn.innerHTML = 'Я на месте';
        actionBtn.className = 'action-btn arrival';
        actionBtn.onclick = () => {
            if (window.app && window.app.showRecordForm) {
                window.app.showRecordForm('arrival', user);
            }
        };
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


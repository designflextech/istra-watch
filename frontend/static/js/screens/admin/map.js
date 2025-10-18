/**
 * Admin Map Screen
 * Экран карты с местоположениями сотрудников
 */

import { API } from '../../utils/api.js';
import { showScreen, formatTime, formatAddress } from '../../utils/helpers.js';
import { createMap, createAvatarIcon, addPlacemark, fitBounds, isYandexMapsLoaded } from '../../utils/yandex-maps.js';

let fullMapInstance = null;

// Координаты центра города Истра
const ISTRA_CENTER = [55.91, 36.86];

/**
 * Показать карту с местоположениями
 */
export async function showAdminMap() {
    showScreen('map-screen');
    
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
    
    // Проверяем доступность Yandex Maps API
    if (!isYandexMapsLoaded()) {
        mapContainer.innerHTML = '<div class="map-loader"><span>Яндекс Карты недоступны</span></div>';
        console.error('Yandex Maps API not loaded');
        return;
    }
    
    // Показываем индикатор загрузки
    mapContainer.innerHTML = '<div class="map-loader"><div class="loader small"></div><span>Загрузка карты...</span></div>';
    
    try {
        // Получаем текущие местоположения сотрудников (с кэшем на 30 секунд)
        const data = await API.get('/api/current-locations', {}, true, 30000);
        const locations = data.locations || [];
        
        console.log('Current locations:', locations);
        
        // Очищаем контейнер
        mapContainer.innerHTML = '';
        
        // Определяем центр карты
        let mapCenter = ISTRA_CENTER;
        let mapZoom = 10;
        
        if (locations.length > 0) {
            // Если есть сотрудники, используем центр первого местоположения
            mapCenter = [locations[0].latitude, locations[0].longitude];
            mapZoom = 12;
        }
        
        // Инициализируем карту
        fullMapInstance = await createMap(
            'full-map',
            mapCenter,
            mapZoom,
            ['zoomControl', 'geolocationControl', 'typeSelector']
        );
        
        // Добавляем метки для каждого сотрудника с аватарками
        locations.forEach(loc => {
            console.log('MAP: Processing location for user:', loc.user.name);
            console.log('MAP: Original address:', loc.address);
            const formattedAddr = formatAddress(loc.address);
            console.log('MAP: Formatted address:', formattedAddr);
            
            const iconOptions = createAvatarIcon(loc.user.avatar_url, loc.user.name);
            
            addPlacemark(
                fullMapInstance,
                [loc.latitude, loc.longitude],
                {
                    balloonContent: `
                        <strong>${loc.user.name}</strong><br>
                        ${formattedAddr}<br>
                        <small>Отметка: ${formatTime(loc.timestamp)}</small>
                    `
                },
                iconOptions
            );
        });
        
        // Автоматически подстраиваем зум и центр под все метки только если есть сотрудники
        if (locations.length > 0) {
            fitBounds(fullMapInstance, 50);
        }
        
    } catch (error) {
        console.error('Error loading locations:', error);
        mapContainer.innerHTML = `<div class="map-loader"><span>${error.message}</span></div>`;
    }
}

/**
 * Уничтожить карту (при выходе с экрана)
 */
export function destroyAdminMap() {
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
}


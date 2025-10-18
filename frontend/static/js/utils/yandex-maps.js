/**
 * Yandex Maps utilities
 * Модуль для работы с Яндекс.Картами
 */

let yandexMapsApiKey = null;
let yandexMapsLoaded = false;

/**
 * Установить API ключ Яндекс.Карт
 */
export function setYandexMapsApiKey(apiKey) {
    yandexMapsApiKey = apiKey;
}

/**
 * Динамическая загрузка Яндекс.Карты API
 */
export function loadYandexMapsAPI() {
    return new Promise((resolve, reject) => {
        if (yandexMapsLoaded || typeof ymaps !== 'undefined') {
            yandexMapsLoaded = true;
            resolve();
            return;
        }
        
        if (!yandexMapsApiKey) {
            reject(new Error('Yandex Maps API key not configured'));
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
            reject(new Error('Failed to load Yandex Maps API'));
        };
        document.head.appendChild(script);
    });
}

/**
 * Проверить, загружен ли API Яндекс.Карт
 */
export function isYandexMapsLoaded() {
    return yandexMapsLoaded && typeof ymaps !== 'undefined';
}

/**
 * Создать кастомную иконку с аватаркой
 */
export function createAvatarIcon(avatarUrl, userName) {
    if (!isYandexMapsLoaded()) {
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

/**
 * Создать карту
 */
export function createMap(containerId, center, zoom = 16, controls = ['zoomControl', 'geolocationControl']) {
    if (!isYandexMapsLoaded()) {
        throw new Error('Yandex Maps API not loaded');
    }
    
    return new Promise((resolve, reject) => {
        ymaps.ready(() => {
            try {
                const map = new ymaps.Map(containerId, {
                    center: center,
                    zoom: zoom,
                    controls: controls
                });
                
                resolve(map);
            } catch (error) {
                reject(error);
            }
        });
    });
}

/**
 * Добавить метку на карту
 */
export function addPlacemark(map, coordinates, properties, options) {
    if (!isYandexMapsLoaded()) {
        throw new Error('Yandex Maps API not loaded');
    }
    
    const placemark = new ymaps.Placemark(coordinates, properties, options);
    map.geoObjects.add(placemark);
    
    return placemark;
}

/**
 * Подстроить границы карты под все метки
 */
export function fitBounds(map, padding = 50) {
    if (!isYandexMapsLoaded()) {
        throw new Error('Yandex Maps API not loaded');
    }
    
    const bounds = map.geoObjects.getBounds();
    if (bounds) {
        map.setBounds(bounds, {
            checkZoomRange: true,
            zoomMargin: padding
        });
    }
}


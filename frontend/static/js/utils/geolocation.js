/**
 * Geolocation utilities
 * Модуль для работы с геолокацией
 */

let currentLocation = null;
let currentLocationTimestamp = null;

/**
 * Получить текущую геолокацию
 */
export function getCurrentLocation(options = {}) {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Геолокация не поддерживается'));
            return;
        }
        
        const defaultOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
            ...options
        };
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                currentLocationTimestamp = Date.now();
                
                resolve(currentLocation);
            },
            (error) => {
                console.error('Geolocation error:', error);
                reject(error);
            },
            defaultOptions
        );
    });
}

/**
 * Получить сохраненную геолокацию (если она еще актуальна)
 */
export function getCachedLocation() {
    if (!currentLocation || !currentLocationTimestamp) {
        return null;
    }
    
    // Проверяем, не устарела ли геолокация (старше 10 минут)
    const now = Date.now();
    const ageMinutes = (now - currentLocationTimestamp) / 1000 / 60;
    
    if (ageMinutes > 10) {
        return null; // Устарела
    }
    
    return currentLocation;
}

/**
 * Проверить актуальность геолокации
 */
export function isLocationStale() {
    if (!currentLocation || !currentLocationTimestamp) {
        return true; // Геолокации нет, нужно получить
    }
    
    const now = Date.now();
    const ageMinutes = (now - currentLocationTimestamp) / 1000 / 60;
    
    // Рандомный интервал от 5 до 15 минут (10 ± 5)
    const expirationMinutes = 10 + (Math.random() * 10 - 5);
    
    console.log(`Возраст геолокации: ${ageMinutes.toFixed(1)} мин, истекает через: ${expirationMinutes.toFixed(1)} мин`);
    
    return ageMinutes > expirationMinutes;
}

/**
 * Получить геолокацию (кешированную или новую)
 */
export async function getLocation() {
    // Проверяем кеш
    const cached = getCachedLocation();
    if (cached && !isLocationStale()) {
        console.log('Используем кешированную геолокацию:', cached);
        return cached;
    }
    
    // Получаем новую
    console.log('Запрос новой геолокации');
    return await getCurrentLocation();
}

/**
 * Очистить кеш геолокации
 */
export function clearLocationCache() {
    currentLocation = null;
    currentLocationTimestamp = null;
}

/**
 * Установить геолокацию вручную (для тестирования)
 */
export function setLocation(latitude, longitude) {
    currentLocation = { latitude, longitude };
    currentLocationTimestamp = Date.now();
}


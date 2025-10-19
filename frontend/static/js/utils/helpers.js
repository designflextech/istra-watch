/**
 * Helper utilities
 * Общие вспомогательные функции
 */

/**
 * Скрыть все экраны
 */
export function hideAllScreens() {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
}

/**
 * Показать экран
 */
export function showScreen(screenId) {
    hideAllScreens();
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.add('active');
    }
}

/**
 * Создать HTML лоадера
 * @param {string} message - текст для отображения
 * @param {string} size - размер лоадера ('normal' или 'small')
 * @returns {string} HTML строка с лоадером
 */
export function createLoaderHTML(message = 'Загрузка...', size = 'normal') {
    const loaderClass = size === 'small' ? 'loader small' : 'loader';
    
    return `
        <div class="${loaderClass}"></div>
        <p>${message}</p>
    `;
}

/**
 * Показать лоадер в контейнере
 * @param {HTMLElement|string} container - DOM элемент или ID контейнера
 * @param {string} message - текст для отображения
 * @param {string} size - размер лоадера ('normal' или 'small')
 */
export function showLoader(container, message = 'Загрузка...', size = 'normal') {
    const element = typeof container === 'string' ? document.getElementById(container) : container;
    if (element) {
        // Добавляем класс для центровки содержимого
        element.classList.add('loader-active');
        element.innerHTML = createLoaderHTML(message, size);
    }
}

/**
 * Скрыть лоадер и очистить контейнер
 * @param {HTMLElement|string} container - DOM элемент или ID контейнера
 */
export function hideLoader(container) {
    const element = typeof container === 'string' ? document.getElementById(container) : container;
    if (element) {
        element.classList.remove('loader-active');
        element.innerHTML = '';
    }
}

/**
 * Показать полноэкранный индикатор загрузки
 */
export function showLoading(message = 'Загрузка...') {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.innerHTML = createLoaderHTML(message, 'normal');
        loadingScreen.classList.add('active');
    }
}

/**
 * Показать ошибку
 */
export function showError(message) {
    hideAllScreens();
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.innerHTML = `<div class="error-message">${message}</div>`;
        loadingScreen.classList.add('active');
    }
}

/**
 * Форматировать дату
 */
export function formatDate(date) {
    if (!date) return '';
    
    if (typeof date === 'string') {
        date = new Date(date);
    }
    
    return date.toLocaleDateString('ru-RU');
}

/**
 * Форматировать дату по-русски (например: "2 октября, четверг")
 * Возвращает объект с HTML для правильного стилизования
 */
export function formatDateRussian(date) {
    if (!date) return '';
    
    if (typeof date === 'string') {
        date = new Date(date);
    }
    
    const months = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    
    const weekdays = [
        'воскресенье', 'понедельник', 'вторник', 'среда', 
        'четверг', 'пятница', 'суббота'
    ];
    
    const day = date.getDate();
    const month = months[date.getMonth()];
    const weekday = weekdays[date.getDay()];
    
    return `<span class="date-primary">${day} ${month},</span> <span class="date-secondary">${weekday}</span>`;
}

/**
 * Форматировать время
 */
export function formatTime(date) {
    if (!date) return '';
    
    if (typeof date === 'string') {
        date = new Date(date);
    }
    
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Форматировать дату и время
 */
export function formatDateTime(date) {
    if (!date) return '';
    
    if (typeof date === 'string') {
        date = new Date(date);
    }
    
    return date.toLocaleString('ru-RU');
}

/**
 * Получить сегодняшнюю дату в формате YYYY-MM-DD (в локальном времени)
 */
export function getTodayString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Создать элемент из HTML строки
 */
export function createElementFromHTML(htmlString) {
    const div = document.createElement('div');
    div.innerHTML = htmlString.trim();
    return div.firstChild;
}

/**
 * Дебаунс функции
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Экранировать HTML
 */
export function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Проверить, является ли устройство мобильным
 */
export function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Форматировать адрес в вид "Город, улица, дом"
 * @param {Object|string} address - Объект адреса с полями city, street, building или строка
 * @returns {string} Отформатированный адрес
 */
export function formatAddress(address) {
    try {
        debugLog('formatAddress called', {
            type: typeof address,
            isNull: address === null,
            isArray: Array.isArray(address),
            hasCity: address?.city,
            hasStreet: address?.street,
            hasBuilding: address?.building,
            hasFormattedAddress: !!address?.formatted_address,
            formattedAddressType: typeof address?.formatted_address
        });
        
        // Проверка на null, undefined, false, 0, ""
        if (!address) {
            debugLog('formatAddress: address is falsy');
            return 'Адрес не определен';
        }
        
        // Если пришла строка (старый формат), убираем страну
        if (typeof address === 'string') {
            const firstCommaIndex = address.indexOf(', ');
            if (firstCommaIndex !== -1) {
                const result = address.substring(firstCommaIndex + 2);
                debugLog('formatAddress result (string):', result);
                return result;
            }
            debugLog('formatAddress result (string no comma):', address);
            return address;
        }
        
        // Если пришел объект (новый формат), форматируем как "Город, улица, дом"
        // Проверяем что это объект, не null и не массив
        if (typeof address === 'object' && address !== null && !Array.isArray(address)) {
            // Если адрес обернут в объект с полем formatted_address (которое само объект)
            // Например: { formatted_address: { city: ..., street: ... } }
            if (address.formatted_address && typeof address.formatted_address === 'object') {
                debugLog('formatAddress: unwrapping formatted_address object');
                return formatAddress(address.formatted_address); // Рекурсивно обрабатываем
            }
            
            const parts = [];
            
            if (address.city) {
                parts.push(address.city);
            }
            
            if (address.street) {
                parts.push(address.street);
            }
            
            if (address.building) {
                parts.push(address.building);
            }
            
            // Если есть хотя бы одна часть, возвращаем
            if (parts.length > 0) {
                const result = parts.join(', ');
                debugLog('formatAddress result (parts):', result);
                return result;
            }
            
            // Если структурированных данных нет, используем formatted_address как fallback (строка)
            if (address.formatted_address && typeof address.formatted_address === 'string') {
                const firstCommaIndex = address.formatted_address.indexOf(', ');
                if (firstCommaIndex !== -1) {
                    const result = address.formatted_address.substring(firstCommaIndex + 2);
                    debugLog('formatAddress result (formatted_address):', result);
                    return result;
                }
                debugLog('formatAddress result (formatted_address no comma):', address.formatted_address);
                return address.formatted_address;
            }
        }
        
        debugLog('formatAddress: returning default');
        return 'Адрес не определен';
    } catch (error) {
        debugLog('formatAddress ERROR:', error.message);
        return 'Ошибка форматирования адреса';
    }
}


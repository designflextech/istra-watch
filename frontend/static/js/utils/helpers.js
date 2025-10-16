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
 * Показать индикатор загрузки
 */
export function showLoading(message = 'Загрузка...') {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.innerHTML = `
            <div class="loader"></div>
            <p>${message}</p>
        `;
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
 * Получить сегодняшнюю дату в формате YYYY-MM-DD
 */
export function getTodayString() {
    return new Date().toISOString().split('T')[0];
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


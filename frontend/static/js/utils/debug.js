/**
 * Debug Utilities
 * Модуль для отладки на мобильных устройствах (особенно в Telegram Mini Apps)
 */

let debugLogs = [];
const MAX_DEBUG_LOGS = 50;
let debugInitialized = false;
let isDebugBoxVisible = false;

/**
 * Показать debug box
 */
export function showDebugBox() {
    const debugBox = document.getElementById('debug-box');
    if (debugBox) {
        debugBox.style.display = 'flex';
        isDebugBoxVisible = true;
    }
}

/**
 * Скрыть debug box
 */
export function hideDebugBox() {
    const debugBox = document.getElementById('debug-box');
    if (debugBox) {
        debugBox.style.display = 'none';
        isDebugBoxVisible = false;
    }
}

/**
 * Переключить видимость debug box
 */
export function toggleDebugBoxVisibility() {
    if (isDebugBoxVisible) {
        hideDebugBox();
    } else {
        showDebugBox();
    }
}

/**
 * Добавить лог в debug box
 * @param {string} message - Сообщение
 * @param {*} data - Дополнительные данные (объект, массив и т.д.)
 */
export function debugLog(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
        timestamp,
        message,
        data
    };
    
    debugLogs.push(logEntry);
    if (debugLogs.length > MAX_DEBUG_LOGS) {
        debugLogs.shift();
    }
    
    // Также выводим в консоль
    console.log('[DEBUG]', message, data);
    
    // Если есть earlyDebugLog (для случаев когда модули еще не загрузились), используем его
    if (typeof window !== 'undefined' && window.earlyDebugLog && !debugInitialized) {
        window.earlyDebugLog(message, data);
    }
    
    // Обновляем debug box если он есть
    updateDebugBox();
}

/**
 * Очистить все логи
 */
export function clearDebugLog() {
    debugLogs = [];
    updateDebugBox();
}

/**
 * Обновить содержимое debug box
 */
function updateDebugBox() {
    const debugContent = document.getElementById('debug-content');
    if (!debugContent) {
        // Если элемент еще не готов, пробуем позже
        if (debugLogs.length > 0 && !debugInitialized) {
            setTimeout(updateDebugBox, 100);
        }
        return;
    }
    
    if (debugLogs.length === 0) {
        debugContent.innerHTML = '<div style="color: #ffff00; font-weight: bold;">Логи отсутствуют</div>';
        return;
    }
    
    debugContent.innerHTML = debugLogs.map(log => {
        let dataStr = '';
        if (log.data !== null && log.data !== undefined) {
            try {
                if (typeof log.data === 'object') {
                    dataStr = '<pre style="margin: 2px 0; font-size: 10px; white-space: pre-wrap; overflow-x: auto;">' + 
                              JSON.stringify(log.data, null, 2).substring(0, 500) + '</pre>';
                } else {
                    dataStr = '<span>' + String(log.data) + '</span>';
                }
            } catch (e) {
                dataStr = '<span style="color: #f00;">[Error: ' + e.message + ']</span>';
            }
        }
        return `<div style="border-bottom: 1px solid #333; padding: 4px 0; font-size: 11px;">
            <strong>[${log.timestamp}]</strong> ${log.message}
            ${dataStr}
        </div>`;
    }).join('');
    
    debugContent.scrollTop = debugContent.scrollHeight;
}

/**
 * Переключить видимость контента debug box (свернуть/развернуть)
 */
export function toggleDebugContent() {
    const debugContent = document.getElementById('debug-content');
    if (!debugContent) return;
    
    if (debugContent.style.display === 'none') {
        debugContent.style.display = 'block';
    } else {
        debugContent.style.display = 'none';
    }
}

/**
 * Инициализация debug box - вызывается после загрузки DOM
 */
export function initDebugBox() {
    if (debugInitialized) return;
    
    // Подхватываем ранние логи если они есть
    if (typeof window !== 'undefined' && window.earlyLogs && Array.isArray(window.earlyLogs)) {
        window.earlyLogs.forEach(log => {
            debugLogs.push(log);
        });
        // Очищаем ранние логи
        window.earlyLogs = [];
    }
    
    const clearBtn = document.getElementById('debug-clear-btn');
    const toggleBtn = document.getElementById('debug-toggle-btn');
    const showBtn = document.getElementById('debug-show-btn');
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            debugLog('🗑️ Debug log cleared by user');
            clearDebugLog();
        });
    }
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleDebugContent);
    }
    
    if (showBtn) {
        showBtn.addEventListener('click', toggleDebugBoxVisibility);
    }
    
    debugInitialized = true;
    debugLog('✅ Debug box initialized', {
        clearBtn: !!clearBtn,
        toggleBtn: !!toggleBtn,
        showBtn: !!showBtn,
        existingLogs: debugLogs.length
    });
    
    // Обновляем отображение если уже есть логи
    if (debugLogs.length > 0) {
        updateDebugBox();
    }
}

// Делаем функции доступными глобально для совместимости
if (typeof window !== 'undefined') {
    window.debugLog = debugLog;
    window.clearDebugLog = clearDebugLog;
    window.toggleDebugContent = toggleDebugContent;
    window.showDebugBox = showDebugBox;
    window.hideDebugBox = hideDebugBox;
    window.toggleDebugBoxVisibility = toggleDebugBoxVisibility;
    window.initDebugBox = initDebugBox;
}


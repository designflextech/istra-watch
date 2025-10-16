/**
 * Cache utilities
 * Модуль для кэширования данных на время сессии
 */

/**
 * Класс для управления кэшем
 */
export class Cache {
    constructor() {
        this.memoryCache = new Map();
        this.cachePrefix = 'istra_cache_';
    }

    /**
     * Генерация ключа кэша
     */
    _generateKey(namespace, params = {}) {
        const paramsStr = Object.keys(params)
            .sort()
            .map(key => `${key}:${params[key]}`)
            .join('|');
        return `${this.cachePrefix}${namespace}${paramsStr ? `_${paramsStr}` : ''}`;
    }

    /**
     * Получить данные из кэша
     */
    get(namespace, params = {}) {
        const key = this._generateKey(namespace, params);
        
        // Сначала проверяем память
        if (this.memoryCache.has(key)) {
            const cached = this.memoryCache.get(key);
            if (cached.expiry && Date.now() > cached.expiry) {
                this.memoryCache.delete(key);
                return null;
            }
            return cached.data;
        }

        // Затем проверяем sessionStorage
        try {
            const stored = sessionStorage.getItem(key);
            if (stored) {
                const cached = JSON.parse(stored);
                if (cached.expiry && Date.now() > cached.expiry) {
                    sessionStorage.removeItem(key);
                    return null;
                }
                // Сохраняем в память для быстрого доступа
                this.memoryCache.set(key, cached);
                return cached.data;
            }
        } catch (e) {
            console.error('Cache get error:', e);
        }

        return null;
    }

    /**
     * Сохранить данные в кэш
     * @param {string} namespace - Пространство имен (например, 'user_status', 'employees', и т.д.)
     * @param {any} data - Данные для кэширования
     * @param {Object} params - Параметры для генерации уникального ключа
     * @param {number} ttl - Время жизни в миллисекундах (по умолчанию - до конца сессии)
     */
    set(namespace, data, params = {}, ttl = null) {
        const key = this._generateKey(namespace, params);
        const cached = {
            data,
            expiry: ttl ? Date.now() + ttl : null,
            timestamp: Date.now()
        };

        // Сохраняем в память
        this.memoryCache.set(key, cached);

        // Сохраняем в sessionStorage
        try {
            sessionStorage.setItem(key, JSON.stringify(cached));
        } catch (e) {
            console.error('Cache set error:', e);
            // Если переполнение, очищаем старые записи
            if (e.name === 'QuotaExceededError') {
                this.cleanup();
                try {
                    sessionStorage.setItem(key, JSON.stringify(cached));
                } catch (e2) {
                    console.error('Cache set error after cleanup:', e2);
                }
            }
        }
    }

    /**
     * Удалить данные из кэша
     */
    remove(namespace, params = {}) {
        const key = this._generateKey(namespace, params);
        this.memoryCache.delete(key);
        try {
            sessionStorage.removeItem(key);
        } catch (e) {
            console.error('Cache remove error:', e);
        }
    }

    /**
     * Очистить весь кэш
     */
    clear() {
        this.memoryCache.clear();
        try {
            // Удаляем только наши ключи
            const keys = Object.keys(sessionStorage);
            keys.forEach(key => {
                if (key.startsWith(this.cachePrefix)) {
                    sessionStorage.removeItem(key);
                }
            });
        } catch (e) {
            console.error('Cache clear error:', e);
        }
    }

    /**
     * Очистить кэш по пространству имен
     */
    clearNamespace(namespace) {
        const prefix = `${this.cachePrefix}${namespace}`;
        
        // Очищаем из памяти
        for (const [key] of this.memoryCache) {
            if (key.startsWith(prefix)) {
                this.memoryCache.delete(key);
            }
        }

        // Очищаем из sessionStorage
        try {
            const keys = Object.keys(sessionStorage);
            keys.forEach(key => {
                if (key.startsWith(prefix)) {
                    sessionStorage.removeItem(key);
                }
            });
        } catch (e) {
            console.error('Cache clearNamespace error:', e);
        }
    }

    /**
     * Очистить устаревшие записи
     */
    cleanup() {
        const now = Date.now();

        // Очищаем из памяти
        for (const [key, value] of this.memoryCache) {
            if (value.expiry && now > value.expiry) {
                this.memoryCache.delete(key);
            }
        }

        // Очищаем из sessionStorage
        try {
            const keys = Object.keys(sessionStorage);
            keys.forEach(key => {
                if (key.startsWith(this.cachePrefix)) {
                    try {
                        const cached = JSON.parse(sessionStorage.getItem(key));
                        if (cached.expiry && now > cached.expiry) {
                            sessionStorage.removeItem(key);
                        }
                    } catch (e) {
                        // Если не можем распарсить, удаляем
                        sessionStorage.removeItem(key);
                    }
                }
            });
        } catch (e) {
            console.error('Cache cleanup error:', e);
        }
    }

    /**
     * Получить статистику кэша
     */
    getStats() {
        const memorySize = this.memoryCache.size;
        let storageSize = 0;
        
        try {
            const keys = Object.keys(sessionStorage);
            keys.forEach(key => {
                if (key.startsWith(this.cachePrefix)) {
                    storageSize++;
                }
            });
        } catch (e) {
            console.error('Cache getStats error:', e);
        }

        return {
            memorySize,
            storageSize
        };
    }
}

// Создаем единственный экземпляр кэша
export const cache = new Cache();

// Очищаем устаревшие записи при загрузке
cache.cleanup();


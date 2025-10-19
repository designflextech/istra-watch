/**
 * Safe Area Debug Utility
 * Утилита для отладки safe area на разных устройствах
 */

export class SafeAreaDebugger {
    constructor() {
        this.debugInfo = {
            platform: 'unknown',
            safeAreaInsets: {},
            headerPadding: 0,
            viewport: {},
            deviceInfo: {}
        };
    }

    /**
     * Собирает информацию о safe area
     */
    collectSafeAreaInfo() {
        const computedStyle = getComputedStyle(document.documentElement);
        
        this.debugInfo = {
            platform: this.detectPlatform(),
            safeAreaInsets: {
                top: computedStyle.getPropertyValue('--safe-area-inset-top') || '0px',
                bottom: computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0px',
                left: computedStyle.getPropertyValue('--safe-area-inset-left') || '0px',
                right: computedStyle.getPropertyValue('--safe-area-inset-right') || '0px'
            },
            headerPadding: computedStyle.getPropertyValue('--header-padding-top') || '24px',
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
                devicePixelRatio: window.devicePixelRatio
            },
            deviceInfo: {
                userAgent: navigator.userAgent,
                hasTelegram: !!window.Telegram,
                telegramPlatform: window.Telegram?.WebApp?.platform || 'unknown',
                isFullscreen: window.Telegram?.WebApp?.isFullscreen || false,
                telegramVersion: window.Telegram?.WebApp?.version || 'unknown'
            }
        };

        return this.debugInfo;
    }

    /**
     * Определяет платформу
     */
    detectPlatform() {
        const ua = navigator.userAgent;
        if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
        if (/Android/.test(ua)) return 'android';
        if (/Windows/.test(ua)) return 'windows';
        if (/Mac/.test(ua)) return 'mac';
        return 'unknown';
    }

    /**
     * Выводит отладочную информацию в консоль
     */
    logSafeAreaInfo() {
        const info = this.collectSafeAreaInfo();
        
        console.group('🔍 Safe Area Debug Info');
        console.log('📱 Platform:', info.platform);
        console.log('📐 Safe Area Insets:', info.safeAreaInsets);
        console.log('📏 Header Padding:', info.headerPadding);
        console.log('🖥️ Viewport:', info.viewport);
        console.log('📱 Device Info:', info.deviceInfo);
        
        // Проверяем заголовки
        const headers = document.querySelectorAll('.header, .profile-header, .employee-records-nav, .camera-header');
        console.log('🏷️ Headers found:', headers.length);
        headers.forEach((header, index) => {
            const rect = header.getBoundingClientRect();
            console.log(`Header ${index + 1}:`, {
                element: header.className,
                top: rect.top,
                paddingTop: getComputedStyle(header).paddingTop
            });
        });
        
        console.groupEnd();
        
        return info;
    }

    /**
     * Создает визуальный индикатор safe area
     */
    createVisualIndicator() {
        // Удаляем существующий индикатор
        const existing = document.getElementById('safe-area-indicator');
        if (existing) existing.remove();

        const indicator = document.createElement('div');
        indicator.id = 'safe-area-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 99999;
            border: 2px solid #ff0000;
            box-sizing: border-box;
        `;

        // Добавляем метки
        const topLabel = document.createElement('div');
        topLabel.textContent = 'Safe Area Top';
        topLabel.style.cssText = `
            position: absolute;
            top: 0;
            left: 10px;
            background: rgba(255, 0, 0, 0.8);
            color: white;
            padding: 2px 6px;
            font-size: 10px;
            border-radius: 0 0 4px 4px;
        `;

        const bottomLabel = document.createElement('div');
        bottomLabel.textContent = 'Safe Area Bottom';
        bottomLabel.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 10px;
            background: rgba(255, 0, 0, 0.8);
            color: white;
            padding: 2px 6px;
            font-size: 10px;
            border-radius: 4px 4px 0 0;
        `;

        indicator.appendChild(topLabel);
        indicator.appendChild(bottomLabel);
        document.body.appendChild(indicator);

        // Автоматически убираем через 5 секунд
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 5000);

        return indicator;
    }

    /**
     * Проверяет, правильно ли настроены отступы
     */
    validateSafeArea() {
        const info = this.collectSafeAreaInfo();
        const issues = [];

        // Проверяем заголовки
        const headers = document.querySelectorAll('.header, .profile-header, .employee-records-nav, .camera-header');
        headers.forEach((header, index) => {
            const rect = header.getBoundingClientRect();
            const paddingTop = parseInt(getComputedStyle(header).paddingTop);
            
            if (rect.top < 20) {
                issues.push(`Header ${index + 1} (${header.className}) слишком близко к верху экрана: ${rect.top}px`);
            }
            
            if (paddingTop < 24) {
                issues.push(`Header ${index + 1} имеет слишком маленький padding-top: ${paddingTop}px`);
            }
        });

        if (issues.length > 0) {
            console.warn('⚠️ Safe Area Issues Found:', issues);
            return { valid: false, issues };
        } else {
            console.log('✅ Safe Area validation passed');
            return { valid: true, issues: [] };
        }
    }
}

// Создаем глобальный экземпляр для отладки
export const safeAreaDebugger = new SafeAreaDebugger();

// Добавляем в window для доступа из консоли
if (typeof window !== 'undefined') {
    window.safeAreaDebugger = safeAreaDebugger;
}

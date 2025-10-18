/**
 * Telegram SDK utilities
 * Модуль для работы с Telegram Mini App SDK
 */

export class TelegramSDK {
    constructor() {
        this.initDataRaw = '';
        this.initDataParsed = null;
        this.tg = null;
        
        this.init();
    }
    
    /**
     * Инициализация Telegram SDK
     */
    init() {
        console.log('=== Telegram SDK Initialization ===');
        console.log('window.telegramApps:', window.telegramApps);
        console.log('window.Telegram:', window.Telegram);
        console.log('window.Telegram?.WebApp:', window.Telegram?.WebApp);
        
        // Используем официальный Telegram Web App API (наиболее надежный)
        if (window.Telegram?.WebApp) {
            this.tg = window.Telegram.WebApp;
            console.log('Using Telegram WebApp API');
            console.log('Telegram WebApp:', this.tg);
            console.log('Platform:', this.tg.platform);
            console.log('Version:', this.tg.version);
            
            this.tg.ready();
            
            // Раскрываем в полный экран только на мобильных устройствах
            const isMobile = this.tg.platform === 'android' || this.tg.platform === 'ios';
            if (isMobile) {
                // Используем новый API полноэкранного режима (Bot API 8.0+)
                if (typeof this.tg.requestFullscreen === 'function') {
                    this.tg.requestFullscreen();
                    console.log('Requested fullscreen mode on mobile platform:', this.tg.platform);
                    
                    // Подписываемся на события полноэкранного режима
                    this.tg.onEvent('fullscreenChanged', () => {
                        console.log('Fullscreen state changed. isFullscreen:', this.tg.isFullscreen);
                    });
                    
                    this.tg.onEvent('fullscreenFailed', (event) => {
                        console.warn('Fullscreen request failed:', event.error);
                        // Fallback на старый метод expand
                        this.tg.expand();
                    });
                } else {
                    // Fallback для старых версий Telegram
                    this.tg.expand();
                    console.log('Using legacy expand() on mobile platform:', this.tg.platform);
                }
            } else {
                console.log('Skipped fullscreen on desktop platform:', this.tg.platform);
            }
            
            this.initDataRaw = this.tg.initData || '';
            this.initDataParsed = this.tg.initDataUnsafe || null;
            
            console.log('initDataRaw length:', this.initDataRaw.length);
            console.log('initDataRaw:', this.initDataRaw);
            console.log('initDataParsed:', this.initDataParsed);
            
            // Применяем цветовую схему
            this.applyTheme();
        } else if (window.telegramApps && window.telegramApps.init) {
            // SDK v3 - используем новый API (если доступен)
            const sdk = window.telegramApps;
            console.log('Using Telegram Apps SDK v3');
            
            sdk.init();
            
            const { miniApp, viewport, initData } = sdk;
            
            if (miniApp && miniApp.mount) {
                miniApp.mount();
                miniApp.ready();
            }
            
            if (viewport && viewport.mount) {
                viewport.mount();
                viewport.expand();
            }
            
            if (initData && initData.mount) {
                initData.mount();
                this.initDataRaw = initData.raw ? initData.raw() : '';
                this.initDataParsed = initData.state ? initData.state() : null;
            }
            
            console.log('initDataRaw:', this.initDataRaw);
            console.log('initDataParsed:', this.initDataParsed);
        } else {
            console.error('❌ Telegram SDK not found - app must be opened in Telegram');
        }
    }
    
    /**
     * Применение темы Telegram
     */
    applyTheme() {
        if (!this.tg || !this.tg.themeParams) return;
        
        const params = this.tg.themeParams;
        document.documentElement.style.setProperty('--tg-theme-bg-color', params.bg_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-text-color', params.text_color || '#000000');
        document.documentElement.style.setProperty('--tg-theme-hint-color', params.hint_color || '#999999');
        document.documentElement.style.setProperty('--tg-theme-link-color', params.link_color || '#2481cc');
        document.documentElement.style.setProperty('--tg-theme-button-color', params.button_color || '#2481cc');
        document.documentElement.style.setProperty('--tg-theme-button-text-color', params.button_text_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', params.secondary_bg_color || '#f4f4f5');
    }
    
    /**
     * Получение данных пользователя Telegram
     */
    getUser() {
        return this.initDataParsed?.user || null;
    }
    
    /**
     * Показать попап
     */
    showPopup(title, message, callback) {
        if (this.tg?.showPopup) {
            this.tg.showPopup({
                title: title,
                message: message,
                buttons: [{ id: 'ok', type: 'default', text: 'OK' }]
            }, callback);
        } else {
            alert(message);
            if (callback) callback();
        }
    }
    
    /**
     * Показать подтверждение
     */
    showConfirm(title, message, callback) {
        if (this.tg?.showConfirm) {
            this.tg.showConfirm(message, callback);
        } else {
            const result = confirm(message);
            if (callback) callback(result);
        }
    }
    
    /**
     * Открыть ссылку
     */
    openLink(url) {
        if (this.tg?.openLink) {
            this.tg.openLink(url);
        } else {
            window.open(url, '_blank');
        }
    }
    
    /**
     * Закрыть приложение
     */
    close() {
        if (this.tg?.close) {
            this.tg.close();
        }
    }
    
    /**
     * Показать главную кнопку
     */
    showMainButton(text, callback) {
        if (!this.tg?.MainButton) return;
        
        this.tg.MainButton.setText(text);
        this.tg.MainButton.onClick(callback);
        this.tg.MainButton.show();
    }
    
    /**
     * Скрыть главную кнопку
     */
    hideMainButton() {
        if (this.tg?.MainButton) {
            this.tg.MainButton.hide();
        }
    }
    
    /**
     * Показать кнопку "Назад"
     */
    showBackButton(callback) {
        if (!this.tg?.BackButton) return;
        
        this.tg.BackButton.onClick(callback);
        this.tg.BackButton.show();
    }
    
    /**
     * Скрыть кнопку "Назад"
     */
    hideBackButton() {
        if (this.tg?.BackButton) {
            this.tg.BackButton.hide();
        }
    }
    
    /**
     * Показать индикатор загрузки на главной кнопке
     */
    showMainButtonProgress() {
        if (this.tg?.MainButton) {
            this.tg.MainButton.showProgress();
        }
    }
    
    /**
     * Скрыть индикатор загрузки на главной кнопке
     */
    hideMainButtonProgress() {
        if (this.tg?.MainButton) {
            this.tg.MainButton.hideProgress();
        }
    }
    
    /**
     * Запросить полноэкранный режим (Bot API 8.0+)
     */
    requestFullscreen() {
        if (this.tg?.requestFullscreen && typeof this.tg.requestFullscreen === 'function') {
            this.tg.requestFullscreen();
            return true;
        }
        console.warn('requestFullscreen() is not available');
        return false;
    }
    
    /**
     * Выйти из полноэкранного режима (Bot API 8.0+)
     */
    exitFullscreen() {
        if (this.tg?.exitFullscreen && typeof this.tg.exitFullscreen === 'function') {
            this.tg.exitFullscreen();
            return true;
        }
        console.warn('exitFullscreen() is not available');
        return false;
    }
    
    /**
     * Проверить, находится ли приложение в полноэкранном режиме
     */
    isFullscreen() {
        return this.tg?.isFullscreen || false;
    }
}

// Создаем глобальный экземпляр
export const telegramSDK = new TelegramSDK();


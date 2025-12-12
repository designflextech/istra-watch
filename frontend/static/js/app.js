/**
 * Main Application File
 * Координирует все модули и управляет навигацией
 */

import { telegramSDK } from './utils/telegram.js';
import { API } from './utils/api.js';
import { showLoading, showError } from './utils/helpers.js';
import { debugLog, initDebugBox } from './utils/debug.js';
import { setYandexMapsApiKey, loadYandexMapsAPI } from './utils/yandex-maps.js';
import { closeCamera } from './utils/camera.js';
import { safeAreaDebugger } from './utils/safe-area-debug.js';

// Импорт экранов работника
import { showWorkerHome, destroyUserMap, refreshTimeLocationRecords } from './screens/worker/home.js';
import { showRecordForm } from './screens/worker/record-form.js';

// Импорт экранов админа
import { showEmployeesList } from './screens/admin/employees-list.js';
import { showEmployeeRecords } from './screens/admin/employee-records.js';
import { showRecordDetails } from './screens/admin/record-details.js';
import { showAdminMap, destroyAdminMap } from './screens/admin/map.js';
import { showReports } from './screens/admin/reports.js';

// Глобальные переменные
let currentUser = null;
let isAdmin = false;

/**
 * Класс приложения
 */
class App {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
        
        // Делаем методы доступными глобально для использования в модулях
        window.app = this;
    }
    
    /**
     * Инициализация приложения
     */
    async init() {
        try {
            // Инициализируем debug box как можно раньше
            initDebugBox();
            
            console.log('=== App Initialization ===');
            debugLog('🚀 App initialization started', {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                isTelegram: !!window.Telegram?.WebApp
            });
            
            // Инициализируем отладчик safe area
            setTimeout(() => {
                safeAreaDebugger.logSafeAreaInfo();
                safeAreaDebugger.validateSafeArea();
            }, 1000);
            
            const telegramUser = telegramSDK.getUser();
            console.log('telegramUser:', telegramUser);
            debugLog('Telegram user data', telegramUser);
            
            if (!telegramUser || !telegramSDK.initDataRaw) {
                const errorDetails = [];
                if (!telegramUser) errorDetails.push('Отсутствуют данные пользователя Telegram');
                if (!telegramSDK.initDataRaw) errorDetails.push('Отсутствует initDataRaw');
                
                console.error('Initialization failed:', errorDetails);
                showError('Ошибка получения данных пользователя.<br><br>Детали:<br>' + errorDetails.join('<br>') + '<br><br>Приложение должно быть открыто в Telegram.');
                return;
            }
            
            // Проверяем платформу (до аутентификации, чтобы сразу блокировать)
            const platform = window.Telegram?.WebApp?.platform || 'unknown';
            console.log('Telegram platform:', platform);
            debugLog('Platform check', { platform });
            
            const isMobilePlatform = platform === 'android' || platform === 'ios';
            
            // Аутентификация
            console.log('=== Authentication Request ===');
            const data = await API.auth(telegramUser.id);
            
            this.isAdmin = data.is_admin;
            this.currentUser = data.user;
            const allowAdminDesktop = data.allow_admin_desktop || false;
            
            // Блокируем доступ с десктопа для не-админов или админов (если настройка отключена)
            if (!isMobilePlatform) {
                const shouldBlock = !this.isAdmin || (this.isAdmin && !allowAdminDesktop);
                
                if (shouldBlock) {
                    console.log('Blocking desktop access:', { 
                        isAdmin: this.isAdmin, 
                        allowAdminDesktop,
                        platform 
                    });
                    this.showMobileOnlyMessage();
                    return;
                }
            }
            
            console.log('=== Authentication Success ===');
            console.log('isAdmin:', this.isAdmin);
            console.log('currentUser:', this.currentUser);
            
            // Загружаем конфигурацию (включая API ключ Яндекс.Карт)
            await this.loadConfig();
            
            // Очищаем кэш при инициализации приложения для актуальных данных
            API.clearCache();
            
            // Показываем соответствующий экран
            if (this.isAdmin) {
                console.log('Calling showEmployeesList()');
                await showEmployeesList();
                this.setupAdminNavigation();
            } else {
                console.log('Calling showWorkerHome()');
                await showWorkerHome(this.currentUser);
            }
            
        } catch (error) {
            showError('Ошибка подключения к серверу: ' + error.message);
            console.error(error);
        }
    }
    
    /**
     * Загрузка конфигурации
     */
    async loadConfig() {
        try {
            const config = await API.getConfig();
            const yandexMapsApiKey = config.yandex_maps_api_key;
            
            if (yandexMapsApiKey) {
                setYandexMapsApiKey(yandexMapsApiKey);
                await loadYandexMapsAPI();
            }
        } catch (error) {
            console.error('Failed to load config:', error);
        }
    }
    
    /**
     * Настройка навигации для админа
     */
    setupAdminNavigation() {
        // Находим все навигационные кнопки
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const nav = item.dataset.nav;
                
                // Обновляем активное состояние
                this.updateNavigation(nav);
                
                // Переключаем экраны
                switch (nav) {
                    case 'employees':
                        showEmployeesList();
                        break;
                    case 'map':
                        showAdminMap();
                        break;
                    case 'reports':
                        showReports();
                        break;
                }
            });
        });
        
        // Обработчики кнопок "Назад"
        const detailsBackBtn = document.getElementById('details-back-btn');
        if (detailsBackBtn) {
            detailsBackBtn.onclick = () => {
                // Возвращаемся к списку записей сотрудника или к списку сотрудников
                // TODO: нужно сохранить контекст навигации
                showEmployeesList();
                this.updateNavigation('employees');
            };
        }
        
        const mapBackBtn = document.getElementById('map-back-btn');
        if (mapBackBtn) {
            mapBackBtn.onclick = () => {
                showEmployeesList();
                this.updateNavigation('employees');
            };
        }
    }
    
    /**
     * Обновить состояние навигации
     */
    updateNavigation(activeNav) {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            if (item.dataset.nav === activeNav) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
    
    /**
     * Показать главный экран работника
     */
    async showWorkerHome(user = null) {
        const userData = user || this.currentUser;
        await showWorkerHome(userData);
    }
    
    /**
     * Показать форму записи
     */
    async showRecordForm(recordType, user = null) {
        const userData = user || this.currentUser;
        
        // Уничтожаем карту пользователя перед переходом
        destroyUserMap();
        
        await showRecordForm(recordType, userData);
        
        // Обработчик кнопки "Назад"
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.onclick = () => {
                // Закрываем камеру если она открыта
                const video = document.getElementById('camera-video');
                closeCamera(video);
                
                this.showWorkerHome(userData);
            };
        }
    }
    
    /**
     * Показать список сотрудников (админ)
     */
    async showEmployeesList() {
        await showEmployeesList();
        this.updateNavigation('employees');
    }
    
    /**
     * Показать записи сотрудника (админ)
     */
    async showEmployeeRecords(userId, date) {
        await showEmployeeRecords(userId, date);
    }
    
    /**
     * Показать детали записи (админ)
     */
    async showRecordDetails(recordId) {
        await showRecordDetails(recordId);
    }
    
    /**
     * Показать карту (админ)
     */
    async showAdminMap() {
        await showAdminMap();
        this.updateNavigation('map');
    }
    
    /**
     * Показать отчеты (админ)
     */
    async showReports() {
        await showReports();
        this.updateNavigation('reports');
    }
    
    /**
     * Показать сообщение о необходимости использования смартфона
     */
    showMobileOnlyMessage() {
        // Создаем overlay с использованием существующих стилей приложения
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.zIndex = '10000'; // Поверх всего
        
        // Создаем модальное окно с использованием существующих стилей
        const modal = document.createElement('div');
        modal.className = 'modal-content';
        modal.style.textAlign = 'center';
        modal.style.maxWidth = '343px';
        
        // Иконка смартфона
        const icon = document.createElement('div');
        icon.style.fontSize = '64px';
        icon.style.marginBottom = 'var(--space-16)';
        icon.textContent = '📱';
        
        // Сообщение
        const message = document.createElement('p');
        message.style.fontSize = 'var(--font-size-body-l)';
        message.style.fontWeight = 'var(--font-weight-medium)';
        message.style.lineHeight = 'var(--line-height-body)';
        message.style.color = 'var(--text-secondary)';
        message.style.margin = '0';
        message.textContent = 'Пожалуйста, зайдите со смартфона';
        
        // Собираем элементы
        modal.appendChild(icon);
        modal.appendChild(message);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Блокируем прокрутку
        document.body.style.overflow = 'hidden';
    }
}

// Создаем и запускаем приложение
const app = new App();
app.init();

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
                this.showTelegramErrorMessage();
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
        // Создаем полноэкранный контейнер
        const fullscreenContainer = document.createElement('div');
        fullscreenContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(90deg, rgba(0, 0, 0, 0.02) 0%, rgba(0, 0, 0, 0.02) 100%), #FFFFFF;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 0 16px;
            overflow: hidden;
        `;
        
        // Контейнер для иллюстрации
        const illustrationContainer = document.createElement('div');
        illustrationContainer.style.cssText = `
            width: 278px;
            height: 278px;
            position: relative;
            margin-bottom: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // Концентрические круги (фон)
        const circle1 = document.createElement('div');
        circle1.style.cssText = `
            position: absolute;
            width: 278px;
            height: 278px;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.02);
            top: 0;
            left: 0;
        `;
        
        const circle2 = document.createElement('div');
        circle2.style.cssText = `
            position: absolute;
            width: 206px;
            height: 206px;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.04);
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        `;
        
        // Центральный круг с телефоном
        const phoneCircle = document.createElement('div');
        phoneCircle.style.cssText = `
            position: absolute;
            width: 124px;
            height: 124px;
            border-radius: 50%;
            background: #FFFFFF;
            box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.08);
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        `;
        
        // Изображение руки с телефоном
        const phoneImage = document.createElement('img');
        phoneImage.src = '/static/assets/a08468ad-cb99-4bc0-ac74-032e960822eb.png';
        phoneImage.alt = 'Телефон в руке';
        phoneImage.style.cssText = `
            width: 172%;
            height: 172%;
            object-fit: cover;
            position: absolute;
            top: -36%;
            left: -36%;
        `;
        phoneCircle.appendChild(phoneImage);
        
        // Иконка местоположения
        const locationIcon = document.createElement('img');
        locationIcon.src = '/static/assets/59d0be2e-c9df-4a72-9eb1-666a3942a03d.svg';
        locationIcon.alt = 'Местоположение';
        locationIcon.style.cssText = `
            position: absolute;
            width: 17.4px;
            height: 17.4px;
            top: 35%;
            left: 48%;
            transform: translate(-50%, -50%) rotate(135deg);
            z-index: 10;
        `;
        phoneCircle.appendChild(locationIcon);
        
        illustrationContainer.appendChild(circle1);
        illustrationContainer.appendChild(circle2);
        illustrationContainer.appendChild(phoneCircle);
        
        // Контейнер для текста
        const textContainer = document.createElement('div');
        textContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 16px;
            align-items: center;
            text-align: center;
            max-width: 343px;
        `;
        
        // Заголовок
        const title = document.createElement('h1');
        title.style.cssText = `
            font-family: var(--font-family);
            font-size: 26px;
            font-weight: var(--font-weight-semibold);
            line-height: 1.2;
            color: var(--text-primary);
            margin: 0;
        `;
        title.textContent = 'Пожалуйста, зайдите со смартфона';
        
        // Описание
        const description = document.createElement('p');
        description.style.cssText = `
            font-family: var(--font-family);
            font-size: var(--font-size-body-l);
            font-weight: var(--font-weight-medium);
            line-height: var(--line-height-body);
            color: var(--text-primary);
            margin: 0;
        `;
        description.textContent = 'Для дальнейшего использования миниаппа, вам необходимо переключиться на другое устройство';
        
        textContainer.appendChild(title);
        textContainer.appendChild(description);
        
        fullscreenContainer.appendChild(illustrationContainer);
        fullscreenContainer.appendChild(textContainer);
        document.body.appendChild(fullscreenContainer);
        
        // Блокируем прокрутку
        document.body.style.overflow = 'hidden';
    }

    /**
     * Показать сообщение об ошибке открытия вне Telegram
     */
    showTelegramErrorMessage() {
        // Создаем полноэкранный контейнер
        const fullscreenContainer = document.createElement('div');
        fullscreenContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(90deg, rgba(0, 0, 0, 0.02) 0%, rgba(0, 0, 0, 0.02) 100%), #FFFFFF;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            padding: 60px 24px 24px;
            overflow-y: auto;
        `;

        // Иконка ошибки
        const iconContainer = document.createElement('div');
        iconContainer.style.cssText = `
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: rgba(234, 67, 53, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 24px;
            flex-shrink: 0;
        `;
        iconContainer.innerHTML = `
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#EA4335" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        // Заголовок
        const title = document.createElement('h1');
        title.style.cssText = `
            font-family: var(--font-family);
            font-size: 22px;
            font-weight: var(--font-weight-semibold);
            line-height: 1.3;
            color: var(--text-primary);
            margin: 0 0 12px 0;
            text-align: center;
        `;
        title.textContent = 'Не удалось открыть приложение';

        // Подзаголовок
        const subtitle = document.createElement('p');
        subtitle.style.cssText = `
            font-family: var(--font-family);
            font-size: 15px;
            font-weight: var(--font-weight-regular);
            line-height: 1.5;
            color: var(--text-secondary);
            margin: 0 0 32px 0;
            text-align: center;
        `;
        subtitle.textContent = 'Приложение должно быть открыто через Telegram. Попробуйте следующее:';

        // Контейнер для шагов
        const stepsContainer = document.createElement('div');
        stepsContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 16px;
            width: 100%;
            max-width: 400px;
        `;

        const steps = [
            {
                number: '1',
                title: 'Откройте через бота',
                description: 'Зайдите в чат с ботом и нажмите кнопку "Меню" или отправьте команду /start'
            },
            {
                number: '2',
                title: 'Обновите Telegram',
                description: 'Убедитесь, что у вас установлена последняя версия приложения'
            },
            {
                number: '3',
                title: 'Перезапустите Telegram',
                description: 'Полностью закройте приложение и откройте заново'
            },
            {
                number: '4',
                title: 'Очистите кэш',
                description: 'Telegram → Настройки → Данные и память → Использование памяти → Очистить кэш'
            }
        ];

        steps.forEach(step => {
            const stepElement = document.createElement('div');
            stepElement.style.cssText = `
                display: flex;
                gap: 16px;
                padding: 16px;
                background: rgba(0, 0, 0, 0.02);
                border-radius: 12px;
                align-items: flex-start;
            `;

            const numberCircle = document.createElement('div');
            numberCircle.style.cssText = `
                width: 28px;
                height: 28px;
                min-width: 28px;
                border-radius: 50%;
                background: var(--text-primary);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: var(--font-family);
                font-size: 14px;
                font-weight: var(--font-weight-semibold);
            `;
            numberCircle.textContent = step.number;

            const textContainer = document.createElement('div');
            textContainer.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 4px;
            `;

            const stepTitle = document.createElement('div');
            stepTitle.style.cssText = `
                font-family: var(--font-family);
                font-size: 15px;
                font-weight: var(--font-weight-semibold);
                color: var(--text-primary);
                line-height: 1.3;
            `;
            stepTitle.textContent = step.title;

            const stepDescription = document.createElement('div');
            stepDescription.style.cssText = `
                font-family: var(--font-family);
                font-size: 13px;
                font-weight: var(--font-weight-regular);
                color: var(--text-secondary);
                line-height: 1.4;
            `;
            stepDescription.textContent = step.description;

            textContainer.appendChild(stepTitle);
            textContainer.appendChild(stepDescription);
            stepElement.appendChild(numberCircle);
            stepElement.appendChild(textContainer);
            stepsContainer.appendChild(stepElement);
        });

        fullscreenContainer.appendChild(iconContainer);
        fullscreenContainer.appendChild(title);
        fullscreenContainer.appendChild(subtitle);
        fullscreenContainer.appendChild(stepsContainer);
        document.body.appendChild(fullscreenContainer);

        // Блокируем прокрутку основного контента
        document.body.style.overflow = 'hidden';
    }
}

// Создаем и запускаем приложение
const app = new App();
app.init();

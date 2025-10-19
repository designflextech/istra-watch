/**
 * Worker Home Screen
 * Главный экран работника с кнопками "я на месте"/"я ухожу"
 */

import { API } from '../../utils/api.js';
import { telegramSDK } from '../../utils/telegram.js';
import { showScreen, formatAddress, showLoader } from '../../utils/helpers.js';
import { debugLog } from '../../utils/debug.js';
import { getLocation } from '../../utils/geolocation.js';
import { createMap, createAvatarIcon, addPlacemark, isYandexMapsLoaded } from '../../utils/yandex-maps.js';

let userMapInstance = null;
let userMapPlacemark = null;

/**
 * Показать главный экран работника
 */
export async function showWorkerHome(user) {
    showScreen('user-screen');
    
    // Показываем версию приложения для отладки кеша
    console.log('🏠 Worker Home loaded - Version: 20241020-v3-records-spacing');
    if (window.earlyDebugLog) {
        window.earlyDebugLog('🏠 Worker Home loaded - Version: 20241020-v3-records-spacing');
    }
    
    // Отображаем информацию о пользователе
    renderUserInfo(user);
    
    // Обновляем кнопку действия и отображаем записи времени/местоположения СРАЗУ
    // Не ждем загрузки карты, т.к. геолокация все равно будет запрошена на форме записи
    await updateActionButtonAndRecords(user);
    
    // Инициализируем карту в фоне (не блокируем показ кнопки)
    initUserMap(user).catch(error => {
        console.error('Map initialization failed, but app continues:', error);
    });
}

/**
 * Отобразить информацию о пользователе
 */
function renderUserInfo(user) {
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');
    const userDate = document.getElementById('user-date');
    
    userName.textContent = user.name;
    
    // Получаем аватар - приоритет: avatar_url из БД, затем photoUrl из Telegram
    const avatarUrl = user.avatar_url || telegramSDK.initDataParsed?.user?.photoUrl;
    
    if (avatarUrl) {
        userAvatar.src = avatarUrl;
        userAvatar.onerror = () => {
            // Fallback если не загрузилась картинка
            userAvatar.style.display = 'none';
        };
    } else {
        userAvatar.style.display = 'none';
    }
    
    // Устанавливаем дату
    const today = new Date();
    const options = { day: 'numeric', month: 'long' };
    const dateStr = today.toLocaleDateString('ru-RU', options);
    const dayName = today.toLocaleDateString('ru-RU', { weekday: 'long' });
    
    userDate.innerHTML = `<span class="highlight">${dateStr},</span> ${dayName}`;
}

/**
 * Инициализация карты пользователя
 */
async function initUserMap(user) {
    const mapContainer = document.getElementById('user-map');
    
    // Если карта уже существует, уничтожаем её перед пересозданием
    if (userMapInstance) {
        console.log('Уничтожаем старую карту');
        try {
            if (userMapInstance.destroy) {
                userMapInstance.destroy();
            }
        } catch (e) {
            console.error('Ошибка при уничтожении карты:', e);
        }
        userMapInstance = null;
        userMapPlacemark = null;
    }
    
    // Проверяем доступность Yandex Maps API
    if (!isYandexMapsLoaded()) {
        showLoader(mapContainer, 'Яндекс Карты недоступны', 'small');
        console.error('Yandex Maps API not loaded');
        return;
    }
    
    // Показываем индикатор загрузки
    showLoader(mapContainer, 'Загрузка карты...', 'small');
    
    try {
        // Получаем геолокацию
        const location = await getLocation();
        
        // Очищаем контейнер и удаляем класс лоадера
        mapContainer.classList.remove('loader-active');
        mapContainer.innerHTML = '';
        
        // Создаем карту
        userMapInstance = await createMap('user-map', [location.latitude, location.longitude], 16, ['zoomControl', 'geolocationControl']);
        
        // Обновляем размер карты после создания
        if (userMapInstance && userMapInstance.container) {
            userMapInstance.container.fitToViewport();
        }
        
        // Настраиваем положение элементов управления
        userMapInstance.controls.get('zoomControl').options.set({
            position: { right: 10, top: 10 },
            size: 'small'
        });
        
        userMapInstance.controls.get('geolocationControl').options.set({
            position: { right: 10, top: 80 }
        });
        
        // Добавляем метку пользователя с аватаркой
        const iconOptions = createAvatarIcon(user.avatar_url, user.name);
        userMapPlacemark = addPlacemark(
            userMapInstance,
            [location.latitude, location.longitude],
            {
                balloonContent: `<strong>${user.name}</strong><br>Ваше местоположение`
            },
            iconOptions
        );
        
        // Настройка поведения карты
        userMapInstance.behaviors.disable('scrollZoom'); // Отключаем зум колесиком
        
    } catch (error) {
        console.error('Error initializing map:', error);
        showLoader(mapContainer, 'Не удалось загрузить карту', 'small');
    }
}

/**
 * Обновить высоту карты и позиционирование кнопки в зависимости от количества записей
 */
function updateMapHeight(status) {
    const userMap = document.getElementById('user-map');
    const actionButtonContainer = document.getElementById('action-button-container');
    const actionBtn = document.getElementById('action-btn');
    if (!userMap || !actionButtonContainer) return;
    
    // Удаляем все классы высоты
    userMap.classList.remove('no-records', 'with-single-record', 'with-double-records');
    actionButtonContainer.classList.remove('no-records', 'with-single-record', 'with-double-records');
    
    // Определяем количество записей
    const recordCount = (status.has_arrival ? 1 : 0) + (status.has_departure ? 1 : 0);
    
    // Определяем видимость кнопки
    const isButtonVisible = status.last_record_type !== 'departure';
    
    // Логируем состояние для отладки
    console.log('🗺️ Map height update:', {
        recordCount,
        hasArrival: status.has_arrival,
        hasDeparture: status.has_departure,
        lastRecordType: status.last_record_type,
        isButtonVisible,
        version: '20241020-v3-records-spacing'
    });
    
    // Устанавливаем соответствующие классы в зависимости от количества записей
    if (recordCount === 0) {
        // Нет записей - кнопка видна, карта среднего размера
        userMap.classList.add('no-records');
        actionButtonContainer.classList.add('no-records');
        console.log('📏 Map state: NO RECORDS - medium size, button visible');
    } else if (recordCount === 1) {
        // Одна запись - кнопка видна, карта меньше
        userMap.classList.add('with-single-record');
        actionButtonContainer.classList.add('with-single-record');
        console.log('📏 Map state: SINGLE RECORD - smaller size, button visible');
    } else if (recordCount === 2) {
        // Две записи - кнопка НЕ видна, карта почти до низа
        userMap.classList.add('with-double-records');
        actionButtonContainer.classList.add('with-double-records');
        console.log('📏 Map state: DOUBLE RECORDS - large size, button HIDDEN');
    }
    
    // Обновляем размер карты если она уже создана
    if (userMapInstance && userMapInstance.container) {
        setTimeout(() => {
            userMapInstance.container.fitToViewport();
        }, 100); // Небольшая задержка для завершения CSS transition
    }
}

/**
 * Обновить кнопку действия и отобразить записи времени/местоположения
 */
async function updateActionButtonAndRecords(user) {
    const actionBtn = document.getElementById('action-btn');
    const timeLocationContainer = document.getElementById('time-location-container');
    const arrivalRecord = document.getElementById('arrival-record');
    const departureRecord = document.getElementById('departure-record');
    const timeLocationDivider = document.getElementById('time-location-divider');
    
    console.log('Elements found:', {
        actionBtn: !!actionBtn,
        timeLocationContainer: !!timeLocationContainer,
        arrivalRecord: !!arrivalRecord,
        departureRecord: !!departureRecord,
        timeLocationDivider: !!timeLocationDivider
    });
    
    try {
        // Получаем статус пользователя за сегодня
        const status = await API.getUserTodayStatus();
        
        // Логируем только ключевые данные, чтобы не обрезалось
        console.log('📥 Status received:', {
            has_arrival: status.has_arrival,
            has_departure: status.has_departure,
            last_type: status.last_record_type,
            arrival_time: status.arrival_record?.time,
            arrival_addr_type: typeof status.arrival_record?.address,
            departure_time: status.departure_record?.time,
            departure_addr_type: typeof status.departure_record?.address
        });
        
        // Проверяем что debugLog загрузился
        if (typeof debugLog === 'function') {
            debugLog('✅ Status OK', {
                arrival: !!status.has_arrival,
                departure: !!status.has_departure
            });
        } else {
            console.warn('⚠️ debugLog not loaded');
        }
        
        // Скрываем контейнер по умолчанию
        timeLocationContainer.style.display = 'none';
        arrivalRecord.style.display = 'none';
        departureRecord.style.display = 'none';
        timeLocationDivider.style.display = 'none';
        
        console.log('🎯 BEFORE display check:', {
            has_arrival: status.has_arrival,
            has_departure: status.has_departure,
            arrival_exists: !!status.arrival_record,
            departure_exists: !!status.departure_record
        });
        
        // Отображаем записи времени и местоположения
        if (status.has_arrival || status.has_departure) {
            console.log('✅ Entering time/location display block');
            timeLocationContainer.style.display = 'block';
            
            // Отображаем запись о приходе
            if (status.has_arrival && status.arrival_record) {
                try {
                    console.log('🔍 ARRIVAL address:', status.arrival_record.address);
                    console.log('🔍 formatAddress type:', typeof formatAddress);
                    
                    arrivalRecord.style.display = 'flex';
                    document.getElementById('arrival-time').textContent = `Пришел: ${status.arrival_record.time}`;
                    
                    // Безопасный вызов formatAddress с fallback
                    let arrivalAddress;
                    if (typeof formatAddress === 'function') {
                        arrivalAddress = formatAddress(status.arrival_record.address);
                    } else {
                        // Fallback форматирование БЕЗ зависимостей
                        const addr = status.arrival_record.address;
                        if (addr && typeof addr === 'object') {
                            // Проверяем структурированные поля
                            if (addr.city && addr.street) {
                                arrivalAddress = [addr.city, addr.street, addr.building].filter(Boolean).join(', ');
                            } 
                            // Если есть formatted_address как строка
                            else if (addr.formatted_address && typeof addr.formatted_address === 'string') {
                                // Убираем страну (первую часть до запятой)
                                const parts = addr.formatted_address.split(', ');
                                arrivalAddress = parts.length > 1 ? parts.slice(1).join(', ') : addr.formatted_address;
                            } else {
                                arrivalAddress = 'Адрес не определен';
                            }
                        } else if (typeof addr === 'string') {
                            const parts = addr.split(', ');
                            arrivalAddress = parts.length > 1 ? parts.slice(1).join(', ') : addr;
                        } else {
                            arrivalAddress = 'Адрес не определен';
                        }
                    }
                    
                    const arrivalLocationEl = document.getElementById('arrival-location');
                    arrivalLocationEl.textContent = arrivalAddress;
                    console.log('✅ ARRIVAL set:', arrivalAddress);
                } catch (error) {
                    console.error('❌ ARRIVAL error:', error.message);
                    console.error('Stack:', error.stack);
                }
            }
            
            // Отображаем запись об уходе
            if (status.has_departure && status.departure_record) {
                try {
                    console.log('🔍 DEPARTURE address:', status.departure_record.address);
                    
                    departureRecord.style.display = 'flex';
                    document.getElementById('departure-time').textContent = `Ушел: ${status.departure_record.time}`;
                    
                    // Безопасный вызов formatAddress с fallback
                    let departureAddress;
                    if (typeof formatAddress === 'function') {
                        departureAddress = formatAddress(status.departure_record.address);
                    } else {
                        // Fallback форматирование БЕЗ зависимостей
                        const addr = status.departure_record.address;
                        if (addr && typeof addr === 'object') {
                            // Проверяем структурированные поля
                            if (addr.city && addr.street) {
                                departureAddress = [addr.city, addr.street, addr.building].filter(Boolean).join(', ');
                            } 
                            // Если есть formatted_address как строка
                            else if (addr.formatted_address && typeof addr.formatted_address === 'string') {
                                // Убираем страну (первую часть до запятой)
                                const parts = addr.formatted_address.split(', ');
                                departureAddress = parts.length > 1 ? parts.slice(1).join(', ') : addr.formatted_address;
                            } else {
                                departureAddress = 'Адрес не определен';
                            }
                        } else if (typeof addr === 'string') {
                            const parts = addr.split(', ');
                            departureAddress = parts.length > 1 ? parts.slice(1).join(', ') : addr;
                        } else {
                            departureAddress = 'Адрес не определен';
                        }
                    }
                    
                    const departureLocationEl = document.getElementById('departure-location');
                    departureLocationEl.textContent = departureAddress;
                    console.log('✅ DEPARTURE set:', departureAddress);
                } catch (error) {
                    console.error('❌ DEPARTURE error:', error.message);
                    console.error('Stack:', error.stack);
                }
            }
            
            // Показываем разделитель только если есть обе записи
            if (status.has_arrival && status.has_departure) {
                timeLocationDivider.style.display = 'block';
            }
        }
        
        // Определяем, что показывать на основе статуса
        const recordCount = (status.has_arrival ? 1 : 0) + (status.has_departure ? 1 : 0);
        
        if (recordCount === 2) {
            // Если есть 2 записи (приход и уход) - скрываем кнопку полностью
            actionBtn.style.display = 'none';
        } else if (status.last_record_type === 'departure') {
            // Если есть отметка об уходе - скрываем кнопку
            actionBtn.style.display = 'none';
        } else if (status.last_record_type === 'arrival') {
            // Если есть отметка о приходе - показываем кнопку "Я ухожу"
            actionBtn.style.display = 'block';
            actionBtn.textContent = 'Я ухожу';
            actionBtn.className = 'btn btn-primary';
            actionBtn.style.width = '195px';
            actionBtn.onclick = () => {
                // Будет вызван из app.js
                if (window.app && window.app.showRecordForm) {
                    window.app.showRecordForm('departure', user);
                }
            };
        } else {
            // Если нет отметок - показываем кнопку "Я на месте"
            actionBtn.style.display = 'block';
            actionBtn.textContent = 'Я на месте';
            actionBtn.className = 'btn btn-primary';
            actionBtn.style.width = '195px';
            actionBtn.onclick = () => {
                // Будет вызван из app.js
                if (window.app && window.app.showRecordForm) {
                    window.app.showRecordForm('arrival', user);
                }
            };
        }
        
        // Обновляем высоту карты в зависимости от количества записей и наличия кнопки
        updateMapHeight(status);
    } catch (error) {
        console.error('Error updating action button and records:', error);
        // В случае ошибки скрываем контейнер записей и показываем кнопку "Я на месте" по умолчанию
        timeLocationContainer.style.display = 'none';
        actionBtn.style.display = 'block';
        actionBtn.textContent = 'Я на месте';
        actionBtn.className = 'btn btn-primary';
        actionBtn.style.width = '195px';
        actionBtn.onclick = () => {
            if (window.app && window.app.showRecordForm) {
                window.app.showRecordForm('arrival', user);
            }
        };
    }
}

/**
 * Обновить записи времени и местоположения (вызывается после создания новой записи)
 */
export async function refreshTimeLocationRecords(user) {
    const timeLocationContainer = document.getElementById('time-location-container');
    const arrivalRecord = document.getElementById('arrival-record');
    const departureRecord = document.getElementById('departure-record');
    const timeLocationDivider = document.getElementById('time-location-divider');
    
    console.log('Refresh - Elements found:', {
        timeLocationContainer: !!timeLocationContainer,
        arrivalRecord: !!arrivalRecord,
        departureRecord: !!departureRecord,
        timeLocationDivider: !!timeLocationDivider
    });
    
    try {
        // Получаем обновленный статус пользователя за сегодня
        const status = await API.getUserTodayStatus();
        console.log('Refresh - User status response:', status);
        debugLog('Refresh - User status received', {
            has_arrival: status.has_arrival,
            has_departure: status.has_departure,
            arrival_record: status.arrival_record,
            departure_record: status.departure_record
        });
        
        // Скрываем контейнер по умолчанию
        timeLocationContainer.style.display = 'none';
        arrivalRecord.style.display = 'none';
        departureRecord.style.display = 'none';
        timeLocationDivider.style.display = 'none';
        
        // Отображаем записи времени и местоположения
        if (status.has_arrival || status.has_departure) {
            timeLocationContainer.style.display = 'block';
            
            // Отображаем запись о приходе
            if (status.has_arrival && status.arrival_record) {
                debugLog('Refresh - Processing arrival record', status.arrival_record);
                arrivalRecord.style.display = 'flex';
                document.getElementById('arrival-time').textContent = `Пришел: ${status.arrival_record.time}`;
                const arrivalAddress = formatAddress(status.arrival_record.address);
                debugLog('Refresh - Arrival address formatted:', arrivalAddress);
                document.getElementById('arrival-location').textContent = arrivalAddress;
            }
            
            // Отображаем запись об уходе
            if (status.has_departure && status.departure_record) {
                debugLog('Refresh - Processing departure record', status.departure_record);
                departureRecord.style.display = 'flex';
                document.getElementById('departure-time').textContent = `Ушел: ${status.departure_record.time}`;
                const departureAddress = formatAddress(status.departure_record.address);
                debugLog('Refresh - Departure address formatted:', departureAddress);
                document.getElementById('departure-location').textContent = departureAddress;
            }
            
            // Показываем разделитель только если есть обе записи
            if (status.has_arrival && status.has_departure) {
                timeLocationDivider.style.display = 'block';
            }
        }
        
        // Обновляем кнопку действия
        const actionBtn = document.getElementById('action-btn');
        const recordCount = (status.has_arrival ? 1 : 0) + (status.has_departure ? 1 : 0);
        
        if (recordCount === 2) {
            // Если есть 2 записи (приход и уход) - скрываем кнопку полностью
            actionBtn.style.display = 'none';
        } else if (status.last_record_type === 'departure') {
            // Если есть отметка об уходе - скрываем кнопку
            actionBtn.style.display = 'none';
        } else if (status.last_record_type === 'arrival') {
            // Если есть отметка о приходе - показываем кнопку "Я ухожу"
            actionBtn.style.display = 'block';
            actionBtn.textContent = 'Я ухожу';
            actionBtn.className = 'btn btn-primary';
            actionBtn.style.width = '195px';
            actionBtn.onclick = () => {
                if (window.app && window.app.showRecordForm) {
                    window.app.showRecordForm('departure', user);
                }
            };
        } else {
            // Если нет отметок - показываем кнопку "Я на месте"
            actionBtn.style.display = 'block';
            actionBtn.textContent = 'Я на месте';
            actionBtn.className = 'btn btn-primary';
            actionBtn.style.width = '195px';
            actionBtn.onclick = () => {
                if (window.app && window.app.showRecordForm) {
                    window.app.showRecordForm('arrival', user);
                }
            };
        }
        
        // Обновляем высоту карты в зависимости от количества записей и наличия кнопки
        updateMapHeight(status);
    } catch (error) {
        console.error('Error refreshing time location records:', error);
    }
}

/**
 * Уничтожить карту (при выходе с экрана)
 */
export function destroyUserMap() {
    if (userMapInstance) {
        try {
            if (userMapInstance.destroy) {
                userMapInstance.destroy();
            }
        } catch (e) {
            console.error('Ошибка при уничтожении карты:', e);
        }
        userMapInstance = null;
        userMapPlacemark = null;
    }
}


/**
 * Worker Record Form Screen
 * Экран формы создания записи о приходе/уходе
 */

import { API } from '../../utils/api.js';
import { telegramSDK } from '../../utils/telegram.js';
import { showScreen } from '../../utils/helpers.js';
import { getLocation } from '../../utils/geolocation.js';
import { openCamera, closeCamera, capturePhoto, switchCamera, getPhotoPreview, getPhotoSizeMB } from '../../utils/camera.js';

let currentRecordType = null;
let selectedPhoto = null;

/**
 * Показать форму создания записи
 */
export async function showRecordForm(recordType, user) {
    currentRecordType = recordType;
    showScreen('record-screen');
    
    // Отображаем информацию о пользователе
    renderUserInfo(user);
    
    // Сбрасываем выбранное фото
    resetPhotoSelection();
    
    // Получаем геолокацию
    await getLocationInfo();
    
    // Устанавливаем обработчики
    setupFormHandlers(user);
}

/**
 * Отобразить информацию о пользователе
 */
function renderUserInfo(user) {
    const userName = document.getElementById('record-user-name');
    const userAvatar = document.getElementById('record-avatar');
    const userDate = document.getElementById('record-date');
    
    userName.textContent = user.name;
    
    // Получаем аватар - приоритет: avatar_url из БД, затем photoUrl из Telegram
    const avatarUrl = user.avatar_url || telegramSDK.initDataParsed?.user?.photoUrl;
    
    if (avatarUrl) {
        userAvatar.src = avatarUrl;
        userAvatar.onerror = () => {
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
 * Получить информацию о геолокации и адресе
 */
async function getLocationInfo() {
    const addressText = document.querySelector('.address-text');
    const dateValue = document.getElementById('record-date-value');
    const timeValue = document.getElementById('record-time-value');
    
    try {
        // Получаем геолокацию
        const location = await getLocation();
        
        // Устанавливаем текущую дату и время
        const now = new Date();
        dateValue.textContent = now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
        timeValue.textContent = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        
        // Получаем адрес по координатам
        addressText.textContent = 'Определение адреса...';
        
        try {
            const addressData = await API.getAddress(location.latitude, location.longitude);
            addressText.textContent = addressData.formatted_address || `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
        } catch (error) {
            console.error('Ошибка получения адреса:', error);
            addressText.textContent = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
        }
    } catch (error) {
        addressText.textContent = `Ошибка: ${error.message}`;
        dateValue.textContent = '--';
        timeValue.textContent = '--';
    }
}

/**
 * Установить обработчики формы
 */
function setupFormHandlers(user) {
    // Обработчик кнопки добавления фото
    const addPhotoBtn = document.getElementById('add-photo-btn');
    addPhotoBtn.onclick = handleTakePhoto;
    
    // Обработчик выбора фото из галереи
    const photoInput = document.getElementById('photo-input');
    photoInput.onchange = handlePhotoSelect;
    
    // Обработчик удаления фото
    const removePhotoBtn = document.getElementById('remove-photo-btn');
    removePhotoBtn.onclick = resetPhotoSelection;
    
    // Обработчик камеры
    const closeCameraBtn = document.getElementById('close-camera-btn');
    closeCameraBtn.onclick = handleCloseCamera;
    
    const captureBtn = document.getElementById('capture-btn');
    captureBtn.onclick = handleCapture;
    
    const switchCameraBtn = document.getElementById('switch-camera-btn');
    switchCameraBtn.onclick = handleSwitchCamera;
    
    // Закрываем камеру при клике на фон модального окна
    const cameraModal = document.getElementById('camera-modal');
    cameraModal.onclick = (e) => {
        if (e.target.id === 'camera-modal') {
            handleCloseCamera();
        }
    };
    
    // Обработчик кнопки "Отмена"
    const cancelBtn = document.getElementById('cancel-btn');
    cancelBtn.onclick = () => {
        if (window.app && window.app.showWorkerHome) {
            window.app.showWorkerHome(user);
        }
    };
    
    // Обработчик отправки формы
    const recordForm = document.getElementById('record-form');
    recordForm.onsubmit = (e) => handleFormSubmit(e, user);
}

/**
 * Обработчик открытия камеры
 */
async function handleTakePhoto() {
    const modal = document.getElementById('camera-modal');
    const video = document.getElementById('camera-video');
    
    modal.style.display = 'flex';
    
    const success = await openCamera(video);
    if (!success) {
        modal.style.display = 'none';
    }
}

/**
 * Обработчик закрытия камеры
 */
function handleCloseCamera() {
    const modal = document.getElementById('camera-modal');
    const video = document.getElementById('camera-video');
    
    closeCamera(video);
    modal.style.display = 'none';
}

/**
 * Обработчик захвата фото
 */
async function handleCapture() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    
    // Показываем индикатор загрузки
    document.getElementById('add-photo-btn').style.display = 'none';
    document.getElementById('photo-loading').style.display = 'flex';
    
    try {
        const photo = await capturePhoto(video, canvas);
        selectedPhoto = photo;
        
        // Показываем предпросмотр
        const previewUrl = await getPhotoPreview(photo);
        const previewImage = document.getElementById('preview-image');
        previewImage.src = previewUrl;
        previewImage.style.display = 'block';
        
        document.getElementById('photo-loading').style.display = 'none';
        document.getElementById('photo-preview').style.display = 'flex';
        
        console.log('Photo captured:', photo.name, photo.size, 'bytes');
        
        // Закрываем камеру
        handleCloseCamera();
    } catch (error) {
        console.error('Capture error:', error);
        document.getElementById('photo-loading').style.display = 'none';
        document.getElementById('add-photo-btn').style.display = 'flex';
        telegramSDK.showPopup('Ошибка', error.message);
    }
}

/**
 * Обработчик переключения камеры
 */
async function handleSwitchCamera() {
    const video = document.getElementById('camera-video');
    await switchCamera(video);
}

/**
 * Обработчик выбора фото из галереи
 */
async function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Валидация размера (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        telegramSDK.showPopup('Ошибка', 'Размер фото не должен превышать 5MB');
        resetPhotoSelection();
        return;
    }
    
    // Показываем индикатор загрузки
    document.getElementById('add-photo-btn').style.display = 'none';
    document.getElementById('photo-loading').style.display = 'flex';
    
    selectedPhoto = file;
    
    // Показываем предпросмотр
    const previewUrl = await getPhotoPreview(file);
    const previewImage = document.getElementById('preview-image');
    previewImage.src = previewUrl;
    previewImage.style.display = 'block';
    
    document.getElementById('photo-loading').style.display = 'none';
    document.getElementById('photo-preview').style.display = 'flex';
    
    console.log('Photo selected:', file.name, file.size, 'bytes');
}

/**
 * Сброс выбранного фото
 */
function resetPhotoSelection() {
    selectedPhoto = null;
    document.getElementById('photo-input').value = '';
    document.getElementById('photo-preview').style.display = 'none';
    document.getElementById('add-photo-btn').style.display = 'flex';
    document.getElementById('preview-image').src = '';
    document.getElementById('preview-image').style.display = 'none';
}

/**
 * Обработчик отправки формы
 */
async function handleFormSubmit(e, user) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Сохранение...';
    
    try {
        // Получаем геолокацию
        const location = await getLocation();
        
        const comment = document.getElementById('comment').value;
        
        // ОПТИМИСТИЧНОЕ ОБНОВЛЕНИЕ: Инвалидируем кэш статуса ДО создания записи
        // чтобы после возврата на главный экран всегда получались свежие данные
        API.invalidateCache('/api/user/today-status');
        API.invalidateCache('/api/employees');
        
        // 1. Создаем запись
        const response = await API.createRecord(
            user.id,
            currentRecordType,
            location.latitude,
            location.longitude,
            comment || null
        );
        
        const recordId = response.record.id;
        console.log('Record created:', recordId);
        
        // 2. Если есть фото, загружаем его
        if (selectedPhoto) {
            submitBtn.textContent = 'Загрузка фото...';
            console.log('Uploading photo for record:', recordId);
            
            try {
                const photoResponse = await API.uploadPhoto(recordId, selectedPhoto);
                console.log('Photo uploaded:', photoResponse.photo_url);
            } catch (error) {
                console.error('Photo upload failed:', error);
                // Не прерываем процесс, запись уже создана
                throw new Error(`Запись сохранена, но фото не загружено: ${error.message}`);
            }
        }
        
        // 3. Показываем успешное сообщение и сразу переходим на главный экран
        // ОПТИМИСТИЧНОЕ ОБНОВЛЕНИЕ: Переходим сразу, не дожидаясь закрытия попапа
        if (window.app && window.app.showWorkerHome) {
            window.app.showWorkerHome(user);
        }
        
        telegramSDK.showPopup(
            'Успех',
            selectedPhoto ? 'Запись и фото успешно сохранены!' : 'Запись успешно сохранена!'
        );
        
    } catch (error) {
        console.error('Form submission error:', error);
        telegramSDK.showPopup('Ошибка', error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Сохранить';
    }
}


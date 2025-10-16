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
    
    // Устанавливаем заголовок
    const recordTitle = document.getElementById('record-title');
    recordTitle.textContent = recordType === 'arrival' ? 'Отметка о приходе' : 'Отметка об уходе';
    
    // Сбрасываем выбранное фото
    resetPhotoSelection();
    
    // Получаем геолокацию
    await getLocationInfo();
    
    // Устанавливаем обработчики
    setupFormHandlers(user);
}

/**
 * Получить информацию о геолокации и адресе
 */
async function getLocationInfo() {
    const locationInfo = document.getElementById('location-info');
    const addressInfo = document.getElementById('address-info');
    
    try {
        // Получаем геолокацию
        const location = await getLocation();
        
        locationInfo.innerHTML = `<span>✅ Местоположение определено</span>`;
        
        // Получаем адрес по координатам
        addressInfo.innerHTML = '<div class="loader small"></div><span>Определение адреса...</span>';
        
        try {
            const addressData = await API.getAddress(location.latitude, location.longitude);
            addressInfo.textContent = addressData.formatted_address || `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
        } catch (error) {
            console.error('Ошибка получения адреса:', error);
            addressInfo.textContent = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
        }
    } catch (error) {
        locationInfo.innerHTML = `<span>❌ ${error.message}</span>`;
        addressInfo.textContent = 'Ошибка определения адреса';
    }
}

/**
 * Установить обработчики формы
 */
function setupFormHandlers(user) {
    // Обработчик кнопки "Сделать снимок"
    const takePhotoBtn = document.getElementById('take-photo-btn');
    takePhotoBtn.onclick = handleTakePhoto;
    
    // Обработчик выбора фото из галереи (если будет добавлен)
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
    
    try {
        const photo = await capturePhoto(video, canvas);
        selectedPhoto = photo;
        
        // Показываем предпросмотр
        const previewUrl = await getPhotoPreview(photo);
        document.getElementById('preview-image').src = previewUrl;
        document.getElementById('photo-preview').style.display = 'block';
        
        // Показываем размер файла
        const sizeMB = getPhotoSizeMB(photo);
        document.getElementById('photo-size-info').textContent = `Размер: ${sizeMB} MB`;
        
        console.log('Photo captured:', photo.name, photo.size, 'bytes');
        
        // Закрываем камеру
        handleCloseCamera();
    } catch (error) {
        console.error('Capture error:', error);
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
    
    selectedPhoto = file;
    
    // Показываем предпросмотр
    const previewUrl = await getPhotoPreview(file);
    document.getElementById('preview-image').src = previewUrl;
    document.getElementById('photo-preview').style.display = 'block';
    
    // Показываем размер файла
    const sizeMB = getPhotoSizeMB(file);
    document.getElementById('photo-size-info').textContent = `Размер: ${sizeMB} MB`;
    
    console.log('Photo selected:', file.name, file.size, 'bytes');
}

/**
 * Сброс выбранного фото
 */
function resetPhotoSelection() {
    selectedPhoto = null;
    document.getElementById('photo-input').value = '';
    document.getElementById('photo-preview').style.display = 'none';
    document.getElementById('preview-image').src = '';
    document.getElementById('photo-size-info').textContent = '';
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
        
        // 3. Показываем успешное сообщение
        telegramSDK.showPopup(
            'Успех',
            selectedPhoto ? 'Запись и фото успешно сохранены!' : 'Запись успешно сохранена!',
            () => {
                // Возвращаемся на главный экран
                if (window.app && window.app.showWorkerHome) {
                    window.app.showWorkerHome(user);
                }
            }
        );
        
    } catch (error) {
        console.error('Form submission error:', error);
        telegramSDK.showPopup('Ошибка', error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Сохранить';
    }
}


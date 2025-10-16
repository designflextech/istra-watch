/**
 * Admin Record Details Screen
 * Экран детальной информации о записи
 */

import { API } from '../../utils/api.js';
import { telegramSDK } from '../../utils/telegram.js';
import { showScreen, formatDateTime } from '../../utils/helpers.js';

/**
 * Показать детали записи
 */
export async function showRecordDetails(recordId) {
    showScreen('details-screen');
    
    const recordDetails = document.getElementById('record-details');
    recordDetails.innerHTML = '<div class="loader"></div>';
    
    try {
        const data = await API.getRecordDetails(recordId);
        
        renderRecordDetails(data);
        
    } catch (error) {
        recordDetails.innerHTML = `<div class="error-message">${error.message}</div>`;
    }
}

/**
 * Отрисовать детали записи
 */
function renderRecordDetails(data) {
    const record = data.record;
    const user = data.user;
    const address = data.address;
    
    const recordType = record.record_type === 'arrival' ? 'Приход' : 'Уход';
    const timestamp = formatDateTime(record.timestamp);
    
    const recordDetails = document.getElementById('record-details');
    
    recordDetails.innerHTML = `
        <div class="detail-card">
            <h3>Сотрудник</h3>
            <p>${user.name}</p>
        </div>
        <div class="detail-card">
            <h3>Тип</h3>
            <p>${recordType}</p>
        </div>
        <div class="detail-card">
            <h3>Время</h3>
            <p>${timestamp}</p>
        </div>
        ${address ? `
            <div class="detail-card">
                <h3>Адрес</h3>
                <p>${address.formatted_address}</p>
            </div>
        ` : ''}
        ${record.comment ? `
            <div class="detail-card">
                <h3>Комментарий</h3>
                <p>${record.comment}</p>
            </div>
        ` : ''}
        ${record.photo_url ? `
            <div class="detail-card photo-card">
                <h3>Фотография</h3>
                <img 
                    src="${record.photo_url}" 
                    alt="Фото записи" 
                    class="record-photo"
                    data-photo-url="${record.photo_url}"
                    loading="lazy"
                />
            </div>
        ` : ''}
    `;
    
    // Добавляем обработчик клика на фото
    const photoImg = recordDetails.querySelector('.record-photo');
    if (photoImg) {
        photoImg.onclick = () => {
            openPhotoFullscreen(photoImg.dataset.photoUrl);
        };
    }
}

/**
 * Открыть фото в полноэкранном режиме
 */
function openPhotoFullscreen(photoUrl) {
    console.log('Opening photo fullscreen:', photoUrl);
    telegramSDK.openLink(photoUrl);
}


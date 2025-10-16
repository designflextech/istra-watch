/**
 * Admin Record Details Modal
 * Модальное окно с детальной информацией о записи
 */

import { API } from '../../utils/api.js';
import { telegramSDK } from '../../utils/telegram.js';
import { formatTime, formatDate } from '../../utils/helpers.js';

/**
 * Показать детали записи
 */
export async function showRecordDetails(recordId) {
    const modal = document.getElementById('details-modal');
    const recordDetails = document.getElementById('record-details');
    
    // Показываем модальное окно
    modal.style.display = 'flex';
    recordDetails.innerHTML = '<div class="loader"></div>';
    
    try {
        const data = await API.getRecordDetails(recordId);
        
        renderRecordDetails(data);
        
    } catch (error) {
        recordDetails.innerHTML = `<div class="error-message">${error.message}</div>`;
    }
    
    // Добавляем обработчики закрытия
    setupCloseHandlers();
}

/**
 * Настроить обработчики закрытия модального окна
 */
function setupCloseHandlers() {
    const modal = document.getElementById('details-modal');
    const closeBtn = document.getElementById('details-close-btn');
    const modalContent = document.querySelector('.modal-content');
    
    // Закрытие по клику на кнопку
    closeBtn.onclick = (e) => {
        e.stopPropagation();
        closeModal();
    };
    
    // Закрытие по клику на оверлей
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
        }
    };
    
    // Предотвращаем закрытие при клике на контент
    if (modalContent) {
        modalContent.onclick = (e) => {
            e.stopPropagation();
        };
    }
}

/**
 * Закрыть модальное окно
 */
function closeModal() {
    const modal = document.getElementById('details-modal');
    modal.style.display = 'none';
}

/**
 * Отрисовать детали записи
 */
function renderRecordDetails(data) {
    const record = data.record;
    const user = data.user;
    const address = data.address;
    
    const recordType = record.record_type === 'arrival' ? 'Пришел' : 'Ушел';
    const detailsType = document.getElementById('details-type');
    const detailsUserName = document.getElementById('details-user-name');
    const recordDetails = document.getElementById('record-details');
    
    // Обновляем заголовок
    detailsType.textContent = recordType;
    detailsUserName.textContent = user.name;
    
    // Форматируем дату и время
    const dateObj = new Date(record.timestamp);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = String(dateObj.getFullYear()).slice(-2);
    const dateStr = `${day}.${month}.${year}`;
    const timeStr = formatTime(dateObj);
    
    // Собираем HTML
    let html = '';
    
    // Адрес
    if (address) {
        html += `
            <div class="address-container">
                <div class="address-info-modal">
                    <svg class="address-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="currentColor"/>
                    </svg>
                    <span class="address-text-modal">${address.formatted_address}</span>
                </div>
                <div class="datetime-container-modal">
                    <div class="datetime-item-modal">
                        <span class="datetime-label-modal">Дата</span>
                        <span class="datetime-value-modal">${dateStr}</span>
                    </div>
                    <div class="datetime-divider-modal"></div>
                    <div class="datetime-item-modal">
                        <span class="datetime-label-modal">Время</span>
                        <span class="datetime-value-modal">${timeStr}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Комментарий и фото
    if (record.comment || record.photo_url) {
        html += '<div class="comment-photo-container">';
        
        if (record.comment) {
            html += `
                <div class="comment-container-modal">
                    <p class="comment-label-modal">Комментарий</p>
                    <p class="comment-text-modal">${record.comment}</p>
                </div>
            `;
        }
        
        if (record.photo_url) {
            html += `
                <img 
                    src="${record.photo_url}" 
                    alt="Фото записи" 
                    class="record-photo-full"
                    data-photo-url="${record.photo_url}"
                    loading="lazy"
                />
            `;
        }
        
        html += '</div>';
    }
    
    recordDetails.innerHTML = html;
    
    // Добавляем обработчик клика на фото
    const photoImg = recordDetails.querySelector('.record-photo-full');
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


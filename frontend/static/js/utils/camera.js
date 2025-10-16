/**
 * Camera utilities
 * Модуль для работы с камерой устройства
 */

import { telegramSDK } from './telegram.js';

let cameraStream = null;
let currentFacingMode = 'environment'; // 'environment' = задняя камера, 'user' = фронтальная

/**
 * Открыть камеру
 */
export async function openCamera(videoElement) {
    try {
        // Запрашиваем доступ к камере
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: currentFacingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        });
        
        videoElement.srcObject = cameraStream;
        await videoElement.play();
        
        return true;
    } catch (error) {
        console.error('Camera access error:', error);
        
        telegramSDK.showPopup(
            'Ошибка',
            'Не удалось получить доступ к камере. Проверьте разрешения.'
        );
        
        return false;
    }
}

/**
 * Закрыть камеру
 */
export function closeCamera(videoElement) {
    // Останавливаем все треки (камеру)
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    
    if (videoElement) {
        videoElement.srcObject = null;
    }
}

/**
 * Захватить фото с камеры
 */
export function capturePhoto(videoElement, canvasElement, maxSize = 5 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
        const ctx = canvasElement.getContext('2d');
        
        // Устанавливаем размер canvas равным размеру видео
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        
        // Рисуем текущий кадр на canvas
        ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        
        // Конвертируем canvas в Blob
        canvasElement.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Failed to capture photo'));
                return;
            }
            
            // Создаем File объект из Blob
            const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
            
            // Валидация размера
            if (file.size > maxSize) {
                reject(new Error('Размер фото не должен превышать 5MB'));
                return;
            }
            
            resolve(file);
            
        }, 'image/jpeg', 0.9); // 0.9 = качество JPEG (90%)
    });
}

/**
 * Переключить камеру (фронтальная/задняя)
 */
export async function switchCamera(videoElement) {
    // Переключаем режим
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    
    // Закрываем текущую камеру
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    
    // Открываем камеру с новым режимом
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: currentFacingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        });
        
        videoElement.srcObject = cameraStream;
        await videoElement.play();
        
        return true;
    } catch (error) {
        console.error('Camera switch error:', error);
        
        // Если не удалось переключить, возвращаем обратно
        currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
        
        telegramSDK.showPopup(
            'Ошибка',
            'Не удалось переключить камеру'
        );
        
        return false;
    }
}

/**
 * Получить предпросмотр фото
 */
export function getPhotoPreview(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Получить размер фото в MB
 */
export function getPhotoSizeMB(file) {
    return (file.size / (1024 * 1024)).toFixed(2);
}


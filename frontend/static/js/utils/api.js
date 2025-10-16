/**
 * API utilities
 * Модуль для работы с backend API
 */

import { telegramSDK } from './telegram.js';

const API_URL = window.location.origin;

/**
 * Базовый класс для работы с API
 */
export class API {
    /**
     * Выполнить GET запрос
     */
    static async get(endpoint, params = {}) {
        const url = new URL(`${API_URL}${endpoint}`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `tma ${telegramSDK.initDataRaw}`
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка запроса');
        }
        
        return data;
    }
    
    /**
     * Выполнить POST запрос
     */
    static async post(endpoint, body = {}) {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `tma ${telegramSDK.initDataRaw}`
            },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка запроса');
        }
        
        return data;
    }
    
    /**
     * Загрузить файл
     */
    static async upload(endpoint, formData) {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `tma ${telegramSDK.initDataRaw}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка загрузки');
        }
        
        return data;
    }
    
    /**
     * Аутентификация пользователя
     */
    static async auth(telegramId) {
        return await this.post('/api/auth', { telegram_id: telegramId });
    }
    
    /**
     * Получить конфигурацию
     */
    static async getConfig() {
        return await this.get('/api/config');
    }
    
    /**
     * Получить статус сотрудников за дату
     */
    static async getEmployeesStatus(date) {
        return await this.get('/api/employees', { date });
    }
    
    /**
     * Получить записи конкретного сотрудника за дату
     */
    static async getEmployeeRecords(userId, date) {
        return await this.get(`/api/employees/${userId}/records`, { date });
    }
    
    /**
     * Получить детали записи
     */
    static async getRecordDetails(recordId) {
        return await this.get(`/api/records/${recordId}`);
    }
    
    /**
     * Создать запись о приходе/уходе
     */
    static async createRecord(userId, type, latitude, longitude, comment = null) {
        return await this.post('/api/records', {
            user_id: userId,
            type: type,
            latitude: latitude,
            longitude: longitude,
            comment: comment
        });
    }
    
    /**
     * Загрузить фото к записи
     */
    static async uploadPhoto(recordId, photoFile) {
        const formData = new FormData();
        formData.append('photo', photoFile);
        
        return await this.upload(`/api/records/${recordId}/photo`, formData);
    }
    
    /**
     * Получить адрес по координатам
     */
    static async getAddress(latitude, longitude) {
        return await this.get('/api/address', { latitude, longitude });
    }
    
    /**
     * Получить текущие местоположения сотрудников
     */
    static async getCurrentLocations() {
        return await this.get('/api/current-locations');
    }
    
    /**
     * Получить статус пользователя за сегодня
     */
    static async getUserTodayStatus() {
        return await this.get('/api/user/today-status');
    }
}


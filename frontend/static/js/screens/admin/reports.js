/**
 * Admin Reports Screen
 * Экран отчетов (заглушка)
 */

import { showScreen } from '../../utils/helpers.js';

/**
 * Показать экран отчетов
 */
export function showReports() {
    showScreen('reports-screen');
    
    const container = document.getElementById('reports-container');
    
    // Заглушка
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">📊</div>
            <h2>Отчеты</h2>
            <p>Раздел находится в разработке</p>
        </div>
    `;
}


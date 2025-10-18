# Дизайн-система Istra Watch

## Общая информация

**Проект:** Telegram Mini App для учета рабочего времени  
**Дизайн:** iOS-стиль с современным минималистичным интерфейсом  
**Версия:** 1.0

---

## 🎨 Цветовая палитра

### Основные цвета фона
```css
/* Основной фон */
background: linear-gradient(0deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.02)), #FFFFFF;
border: 1px solid rgba(0, 0, 0, 0.05);

/* Чистый белый (для карточек и модальных окон) */
background: #FFFFFF;
border: 1px solid rgba(0, 0, 0, 0.05);
```

### Адаптивные цвета (Telegram theme)
```css
--tg-theme-bg-color: #ffffff (по умолчанию)
--tg-theme-text-color: #000000
--tg-theme-hint-color: #999999
--tg-theme-link-color: #2481cc
--tg-theme-button-color: #2481cc
--tg-theme-button-text-color: #ffffff
--tg-theme-secondary-bg-color: #f4f4f5
```

### Статусные цвета
```css
/* Присутствие/На месте */
.status-in-place {
    background: #d4edda; /* светло-зеленый */
    color: #155724; /* темно-зеленый */
}

/* Ушел */
.status-has-left {
    background: #fff3cd; /* светло-желтый */
    color: #856404; /* темно-желтый */
}

/* Отсутствует */
.status-absent {
    background: #f8d7da; /* светло-красный */
    color: #721c24; /* темно-красный текст */
}
```

### Дополнительные цвета
```css
/* Адрес (светло-зеленый фон) */
background: rgba(200, 230, 201, 0.3); /* светло-зеленый полупрозрачный */

/* Иконка геолокации */
color: #4CAF50; /* зеленый */

/* Градиент для кнопок сотрудника */
.employee-action-gradient {
    background: linear-gradient(135deg, #FFD166 0%, #F4A261 100%);
    color: #000000;
}
```

---

## 📐 Типографика

### Системный шрифт
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

### Размеры текста
```css
/* Заголовок экрана */
h1 {
    font-size: 24px;
    font-weight: 600;
    color: #000000;
}

/* Имя сотрудника в карточке */
.employee-name {
    font-size: 17px;
    font-weight: 600;
    color: #000000;
}

/* Подзаголовок/статус в карточке */
.employee-status {
    font-size: 15px;
    font-weight: 400;
    color: #666666;
}

/* Время в карточке */
.employee-time {
    font-size: 15px;
    font-weight: 400;
    color: #000000;
}

/* Дата в хедере */
.date-header {
    font-size: 17px;
    font-weight: 600;
    color: #000000;
}

/* День недели */
.date-weekday {
    font-size: 15px;
    font-weight: 400;
    color: #999999;
}

/* Текст статуса "Нет отметок" */
.status-message {
    font-size: 13px;
    font-weight: 400;
    color: #d32f2f; /* красный */
}
```

---

## 🏗️ Компоненты UI

### 1. Container (Общий контейнер экрана)
```css
.screen-container {
    position: relative;
    width: 375px;
    max-width: 100vw;
    height: 844px;
    min-height: 100vh;
    background: linear-gradient(0deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.02)), #FFFFFF;
    border-radius: 44px; /* для превью в Figma, в реальности не нужен */
    padding: 60px 16px 90px; /* учитываем status bar и navigation bar */
}
```

### 2. Header (Шапка экрана)
```css
.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0 16px;
    gap: 12px;
}

.header-title {
    font-size: 34px;
    font-weight: 700;
    letter-spacing: 0.4px;
}

.header-date {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}

.header-date-main {
    font-size: 17px;
    font-weight: 600;
    color: #000000;
}

.header-date-weekday {
    font-size: 15px;
    font-weight: 400;
    color: #999999;
}
```

### 3. Back Button (Кнопка назад)
```css
.back-button {
    display: flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    color: #007AFF; /* iOS blue */
    font-size: 17px;
    font-weight: 400;
    padding: 8px 0;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
}

.back-button:active {
    opacity: 0.5;
}

.back-icon {
    font-size: 20px;
}
```

---

## 📋 Роль Администратора / Начальника

### Экран 1: Карта (Map)

**Назначение:** Отображение местоположений всех сотрудников на карте

**Структура:**
```html
<div class="map-screen">
    <div class="map-header">
        <span class="date-label">2 октября, четверг</span>
    </div>
    <div class="map-container">
        <!-- Yandex Maps API -->
        <div id="map"></div>
        <!-- Маркеры сотрудников с аватарами -->
        <div class="employee-markers">
            <!-- Пример маркера -->
            <div class="map-marker" data-user-id="123">
                <img src="avatar.jpg" class="marker-avatar" />
                <span class="marker-name">Иванов И.</span>
            </div>
        </div>
    </div>
    <!-- Нижняя навигация -->
    <div class="bottom-navigation">
        <button class="nav-button active">
            <span class="nav-icon">🗺️</span>
            <span class="nav-label">Карта</span>
        </button>
        <button class="nav-button">
            <span class="nav-icon">👥</span>
            <span class="nav-label">Сотрудники</span>
        </button>
        <button class="nav-button">
            <span class="nav-icon">📊</span>
            <span class="nav-label">Отчеты</span>
        </button>
    </div>
</div>
```

**Стили карты:**
```css
.map-screen {
    position: relative;
    width: 100%;
    height: 100vh;
    background: linear-gradient(0deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.02)), #FFFFFF;
}

.map-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 90px; /* высота навигации */
    background: #E5E5E5; /* фон карты по умолчанию */
}

.map-header {
    position: absolute;
    top: 60px; /* отступ от status bar */
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    padding: 8px 16px;
    border-radius: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.date-label {
    font-size: 15px;
    font-weight: 500;
    color: #000000;
}

/* Маркеры на карте */
.map-marker {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    cursor: pointer;
}

.marker-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 3px solid #FFFFFF;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.marker-name {
    font-size: 11px;
    font-weight: 500;
    background: rgba(255, 255, 255, 0.95);
    padding: 2px 8px;
    border-radius: 8px;
    white-space: nowrap;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}
```

---

### Экран 2: Главный экран (Main Screen) - Список сотрудников

**Назначение:** Отображение списка всех сотрудников с их статусами за выбранный день

**Структура:**
```html
<div class="main-screen">
    <div class="header">
        <h1>Сотрудники</h1>
        <div class="header-date">
            <span class="header-date-main">2 октября</span>
            <span class="header-date-weekday">четверг</span>
        </div>
    </div>
    
    <div class="employees-list">
        <!-- Карточка сотрудника: Ушел -->
        <div class="employee-card has-left" data-user-id="1">
            <div class="employee-header">
                <img src="avatar.jpg" class="employee-avatar" />
                <div class="employee-info">
                    <h3 class="employee-name">Сидоров Николай</h3>
                    <span class="employee-status">Не на месте</span>
                </div>
                <span class="chevron">›</span>
            </div>
            <div class="employee-timeline">
                <div class="timeline-item arrival">
                    <span class="timeline-dot filled"></span>
                    <span class="timeline-label">Пришел:</span>
                    <span class="timeline-time">09:30</span>
                    <span class="timeline-arrow">→</span>
                </div>
                <div class="timeline-item departure">
                    <span class="timeline-dot filled"></span>
                    <span class="timeline-label">Ушел:</span>
                    <span class="timeline-time">18:30</span>
                    <span class="timeline-arrow">→</span>
                </div>
            </div>
        </div>
        
        <!-- Карточка сотрудника: На месте -->
        <div class="employee-card in-place" data-user-id="2">
            <div class="employee-header">
                <img src="avatar.jpg" class="employee-avatar" />
                <div class="employee-info">
                    <h3 class="employee-name">Иванов Иван</h3>
                    <span class="employee-status">На месте</span>
                </div>
                <span class="chevron">›</span>
            </div>
            <div class="employee-timeline">
                <div class="timeline-item arrival">
                    <span class="timeline-dot filled"></span>
                    <span class="timeline-label">Пришел:</span>
                    <span class="timeline-time">10:00</span>
                    <span class="timeline-arrow">→</span>
                    <span class="timeline-address">Истра, ул. Мира 19</span>
                </div>
            </div>
        </div>
        
        <!-- Карточка сотрудника: Отсутствует -->
        <div class="employee-card absent" data-user-id="3">
            <div class="employee-header">
                <img src="avatar.jpg" class="employee-avatar" />
                <div class="employee-info">
                    <h3 class="employee-name">Константинопольский Константин</h3>
                    <span class="employee-status-alert">Нет отметок</span>
                </div>
                <span class="chevron">›</span>
            </div>
        </div>
    </div>
    
    <div class="bottom-navigation">
        <!-- см. компонент навигации ниже -->
    </div>
</div>
```

**Стили списка сотрудников:**
```css
.main-screen {
    padding: 60px 16px 100px;
    min-height: 100vh;
    background: linear-gradient(0deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.02)), #FFFFFF;
}

.employees-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-bottom: 16px;
}

/* Карточка сотрудника */
.employee-card {
    background: #FFFFFF;
    border-radius: 16px;
    padding: 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    border: 1px solid rgba(0, 0, 0, 0.05);
}

.employee-card:active {
    transform: scale(0.98);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.employee-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
}

.employee-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
    background: #E5E5E5;
}

.employee-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.employee-name {
    font-size: 17px;
    font-weight: 600;
    color: #000000;
    margin: 0;
}

.employee-status {
    font-size: 15px;
    font-weight: 400;
    color: #666666;
}

.employee-status-alert {
    font-size: 13px;
    font-weight: 500;
    color: #d32f2f; /* красный */
}

.chevron {
    font-size: 24px;
    color: #C7C7CC;
    font-weight: 300;
}

/* Таймлайн */
.employee-timeline {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-left: 68px; /* отступ для аватара */
    position: relative;
}

/* Вертикальная линия между событиями */
.employee-timeline::before {
    content: '';
    position: absolute;
    left: 68px;
    top: 10px;
    bottom: 10px;
    width: 2px;
    background: #E5E5E5;
}

.timeline-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    position: relative;
}

.timeline-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 2px solid #E5E5E5;
    background: #FFFFFF;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
}

.timeline-dot.filled {
    background: #000000;
    border-color: #000000;
}

.timeline-label {
    font-weight: 400;
    color: #666666;
}

.timeline-time {
    font-weight: 600;
    color: #000000;
}

.timeline-arrow {
    color: #C7C7CC;
    margin: 0 4px;
}

.timeline-address {
    font-weight: 400;
    color: #666666;
    flex: 1;
}

/* Вариант для "Ушел" */
.employee-card.has-left .employee-status {
    color: #666666;
}

/* Вариант для "На месте" */
.employee-card.in-place .employee-status {
    color: #4CAF50;
    font-weight: 500;
}

/* Вариант для "Отсутствует" */
.employee-card.absent .employee-header {
    margin-bottom: 0;
}
```

---

### Экран 3: Отчеты (Reports)

**Назначение:** Просмотр и скачивание отчетов

**Структура:**
```html
<div class="reports-screen">
    <div class="header">
        <h1>Отчеты</h1>
        <div class="header-date">
            <span class="header-date-main">2 октября</span>
            <span class="header-date-weekday">четверг</span>
        </div>
    </div>
    
    <div class="reports-list">
        <div class="report-card">
            <div class="report-info">
                <h3 class="report-title">Отчет за сентябрь</h3>
                <span class="report-format">PDF</span>
            </div>
            <button class="report-download-btn">
                <span class="download-icon">⬇</span>
            </button>
        </div>
    </div>
    
    <div class="bottom-navigation">
        <!-- см. компонент навигации ниже -->
    </div>
</div>
```

**Стили отчетов:**
```css
.reports-screen {
    padding: 60px 16px 100px;
    min-height: 100vh;
    background: linear-gradient(0deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.02)), #FFFFFF;
}

.reports-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.report-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #FFFFFF;
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(0, 0, 0, 0.05);
}

.report-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.report-title {
    font-size: 17px;
    font-weight: 600;
    color: #000000;
    margin: 0;
}

.report-format {
    font-size: 13px;
    font-weight: 400;
    color: #999999;
    text-transform: uppercase;
}

.report-download-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #F5F5F5;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.2s, transform 0.2s;
}

.report-download-btn:active {
    transform: scale(0.95);
    background: #E5E5E5;
}

.download-icon {
    font-size: 20px;
}
```

---

### Экран 4: Детали сотрудника - "На месте" (Employee Details / In Place)

**Назначение:** Просмотр подробной информации о сотруднике, который сейчас на месте

**Структура:**
```html
<div class="employee-details-screen">
    <div class="header">
        <button class="back-button">
            <span class="back-icon">‹</span>
        </button>
        <div class="header-date-center">
            <span class="date-main">2 октября</span>
            <span class="date-weekday">четверг</span>
        </div>
    </div>
    
    <div class="employee-profile">
        <img src="avatar.jpg" class="profile-avatar" />
        <h2 class="profile-name">Иванов Иван</h2>
        <span class="profile-status in-place">На месте</span>
    </div>
    
    <div class="employee-records">
        <div class="record-item" data-record-id="123">
            <span class="record-dot filled"></span>
            <div class="record-content">
                <div class="record-header">
                    <span class="record-label">Пришел:</span>
                    <span class="record-time">10:00</span>
                </div>
                <div class="record-address">
                    <span class="record-address-text">Истра, ул. Мира 19</span>
                </div>
            </div>
            <span class="record-chevron">›</span>
        </div>
    </div>
</div>
```

**Стили деталей сотрудника:**
```css
.employee-details-screen {
    padding: 60px 16px 40px;
    min-height: 100vh;
    background: #FFFFFF;
}

.header-date-center {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
}

.date-main {
    font-size: 17px;
    font-weight: 600;
    color: #000000;
}

.date-weekday {
    font-size: 13px;
    font-weight: 400;
    color: #999999;
}

.employee-profile {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 0 32px;
    gap: 12px;
}

.profile-avatar {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    object-fit: cover;
    background: #E5E5E5;
    margin-bottom: 8px;
}

.profile-name {
    font-size: 24px;
    font-weight: 700;
    color: #000000;
    margin: 0;
}

.profile-status {
    font-size: 17px;
    font-weight: 500;
    padding: 8px 16px;
    border-radius: 12px;
}

.profile-status.in-place {
    background: rgba(76, 175, 80, 0.1);
    color: #4CAF50;
}

.profile-status.has-left {
    background: rgba(158, 158, 158, 0.1);
    color: #666666;
}

.profile-status.absent {
    background: rgba(211, 47, 47, 0.1);
    color: #d32f2f;
}

.employee-records {
    display: flex;
    flex-direction: column;
    gap: 0;
}

.record-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: #F9F9F9;
    border-radius: 16px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: background 0.2s, transform 0.2s;
}

.record-item:active {
    transform: scale(0.98);
    background: #F0F0F0;
}

.record-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 2px solid #E5E5E5;
    background: #FFFFFF;
    flex-shrink: 0;
    margin-top: 6px;
}

.record-dot.filled {
    background: #000000;
    border-color: #000000;
}

.record-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.record-header {
    display: flex;
    gap: 8px;
    align-items: baseline;
}

.record-label {
    font-size: 17px;
    font-weight: 600;
    color: #000000;
}

.record-time {
    font-size: 17px;
    font-weight: 400;
    color: #666666;
}

.record-address {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 15px;
    color: #666666;
}

.record-address-text::before {
    content: '• ';
    color: #C7C7CC;
}

.record-chevron {
    font-size: 24px;
    color: #C7C7CC;
    font-weight: 300;
}
```

---

### Экран 5: Модальное окно отметки (Record Details Modal)

**Назначение:** Всплывающее окно с подробной информацией о конкретной отметке

**Структура:**
```html
<div class="modal-overlay">
    <div class="mark-modal">
        <div class="modal-header">
            <span class="modal-status">Пришел</span>
            <button class="modal-close-btn">✕</button>
        </div>
        
        <h2 class="modal-employee-name">Иванов Иван</h2>
        
        <div class="mark-details">
            <div class="mark-address-card">
                <span class="location-icon">📍</span>
                <span class="address-text">Истра, ул. Мира 19</span>
            </div>
            
            <div class="mark-info-grid">
                <div class="info-item">
                    <span class="info-label">Дата</span>
                    <span class="info-value">02.10.25</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Время</span>
                    <span class="info-value">10:00</span>
                </div>
            </div>
            
            <div class="mark-comment">
                <span class="comment-label">Комментарий</span>
                <p class="comment-text">Прибыл на место</p>
            </div>
            
            <div class="mark-photo">
                <img src="photo.jpg" class="photo-image" />
            </div>
        </div>
    </div>
</div>
```

**Стили модального окна:**
```css
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 1000;
    animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

.mark-modal {
    background: #FFFFFF;
    border-radius: 24px;
    max-width: 375px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    padding: 24px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
    from {
        transform: translateY(20px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.modal-status {
    font-size: 15px;
    font-weight: 500;
    color: #666666;
}

.modal-close-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #F5F5F5;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 18px;
    color: #666666;
    transition: background 0.2s;
}

.modal-close-btn:active {
    background: #E5E5E5;
}

.modal-employee-name {
    font-size: 24px;
    font-weight: 700;
    color: #000000;
    margin: 0 0 20px 0;
}

.mark-details {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.mark-address-card {
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(200, 230, 201, 0.3); /* светло-зеленый */
    padding: 16px;
    border-radius: 16px;
}

.location-icon {
    font-size: 20px;
}

.address-text {
    font-size: 15px;
    font-weight: 500;
    color: #000000;
    flex: 1;
}

.mark-info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.info-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: #F9F9F9;
    padding: 16px;
    border-radius: 12px;
}

.info-label {
    font-size: 13px;
    font-weight: 400;
    color: #999999;
}

.info-value {
    font-size: 17px;
    font-weight: 600;
    color: #000000;
}

.mark-comment {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.comment-label {
    font-size: 13px;
    font-weight: 500;
    color: #999999;
}

.comment-text {
    font-size: 15px;
    font-weight: 400;
    color: #000000;
    line-height: 1.4;
    margin: 0;
}

.mark-photo {
    border-radius: 16px;
    overflow: hidden;
}

.photo-image {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 16px;
}
```

---

## 🧭 Нижняя навигация (Bottom Navigation Bar)

**Компонент нижней навигации для всех основных экранов администратора**

```html
<div class="bottom-navigation">
    <button class="nav-button" data-screen="map">
        <span class="nav-icon">🗺️</span>
        <span class="nav-label">Карта</span>
    </button>
    <button class="nav-button active" data-screen="main">
        <span class="nav-icon">👥</span>
        <span class="nav-label">Сотрудники</span>
    </button>
    <button class="nav-button" data-screen="reports">
        <span class="nav-icon">📊</span>
        <span class="nav-label">Отчеты</span>
    </button>
</div>
```

**Стили навигации:**
```css
.bottom-navigation {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-around;
    align-items: center;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-top: 1px solid rgba(0, 0, 0, 0.05);
    padding: 8px 0 34px; /* 34px для iOS home indicator */
    z-index: 100;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}

.nav-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px 16px;
    transition: transform 0.2s;
    -webkit-tap-highlight-color: transparent;
    min-width: 70px;
}

.nav-button:active {
    transform: scale(0.95);
}

.nav-icon {
    font-size: 24px;
    opacity: 0.6;
    transition: opacity 0.2s;
}

.nav-button.active .nav-icon {
    opacity: 1;
}

.nav-label {
    font-size: 10px;
    font-weight: 500;
    color: #999999;
    transition: color 0.2s;
}

.nav-button.active .nav-label {
    color: #000000;
}
```

---

## 👤 Роль Сотрудника

### Экран 1: Главный экран - Начало дня (Main Screen / Beginning of the Day)

**Назначение:** Первоначальный экран сотрудника в начале рабочего дня, когда он еще не отметился

**Структура:**
```html
<div class="employee-main-screen beginning">
    <div class="employee-profile-header">
        <img src="avatar.jpg" class="profile-avatar-small" />
        <div class="profile-info">
            <h2 class="profile-name">Сидоров Николай</h2>
            <span class="profile-date">2 октября, <span class="weekday">четверг</span></span>
        </div>
    </div>
    
    <div class="employee-map-container">
        <div id="employee-map" class="employee-map">
            <!-- Yandex Maps с текущей позицией -->
            <div class="map-user-marker">
                <img src="avatar.jpg" class="user-marker-avatar" />
                <span class="user-marker-label">Сидоров Н.</span>
            </div>
        </div>
    </div>
    
    <div class="action-button-container">
        <button class="primary-action-btn arrival">
            Я на месте
        </button>
    </div>
</div>
```

**Стили начального экрана сотрудника:**
```css
.employee-main-screen {
    position: relative;
    width: 100%;
    min-height: 100vh;
    background: #FFFFFF;
    padding: 60px 16px 40px;
    display: flex;
    flex-direction: column;
}

.employee-profile-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
}

.profile-avatar-small {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    object-fit: cover;
    background: #E5E5E5;
    border: 2px solid #F0F0F0;
}

.profile-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.profile-name {
    font-size: 20px;
    font-weight: 600;
    color: #000000;
    margin: 0;
}

.profile-date {
    font-size: 15px;
    font-weight: 400;
    color: #000000;
}

.profile-date .weekday {
    color: #999999;
}

/* Карта сотрудника */
.employee-map-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    margin-bottom: 20px;
    min-height: 400px;
}

.employee-map {
    width: 100%;
    height: 100%;
    border-radius: 24px;
    overflow: hidden;
    background: #E5E5E5;
    position: relative;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.map-user-marker {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    z-index: 10;
}

.user-marker-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 4px solid #FFFFFF;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.user-marker-label {
    font-size: 13px;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    padding: 6px 12px;
    border-radius: 12px;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* Кнопка действия */
.action-button-container {
    padding: 20px 0;
}

.primary-action-btn {
    width: 100%;
    padding: 18px 24px;
    border: none;
    border-radius: 16px;
    font-size: 17px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, opacity 0.2s, box-shadow 0.2s;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.primary-action-btn:active {
    transform: scale(0.98);
    opacity: 0.9;
}

.primary-action-btn.arrival {
    background: linear-gradient(135deg, #FFD166 0%, #F4A261 100%);
    color: #000000;
}

.primary-action-btn.departure {
    background: linear-gradient(135deg, #FFD166 0%, #F4A261 100%);
    color: #000000;
}
```

---

### Экран 2: Главный экран - В течение дня (Main Screen / During the Day)

**Назначение:** Экран сотрудника после отметки о приходе, показывает текущее состояние

**Структура:**
```html
<div class="employee-main-screen during-day">
    <div class="employee-profile-header">
        <img src="avatar.jpg" class="profile-avatar-small" />
        <div class="profile-info">
            <h2 class="profile-name">Сидоров Николай</h2>
            <span class="profile-date">2 октября, <span class="weekday">четверг</span></span>
        </div>
    </div>
    
    <!-- Карточка с информацией о приходе -->
    <div class="current-status-card">
        <div class="status-indicator arrival"></div>
        <div class="status-info">
            <span class="status-label">Пришел:</span>
            <span class="status-time">09:30</span>
            <span class="status-separator">•</span>
            <span class="status-address">Истра, ул. Мира 19</span>
        </div>
    </div>
    
    <div class="employee-map-container">
        <div id="employee-map" class="employee-map">
            <!-- Yandex Maps с текущей позицией -->
        </div>
    </div>
    
    <div class="action-button-container">
        <button class="primary-action-btn departure">
            Я ухожу
        </button>
    </div>
</div>
```

**Стили карточки статуса:**
```css
.current-status-card {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #F9F9F9;
    padding: 16px;
    border-radius: 16px;
    margin-bottom: 20px;
    border: 1px solid rgba(0, 0, 0, 0.05);
}

.status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}

.status-indicator.arrival {
    background: #4CAF50;
}

.status-indicator.departure {
    background: #FF9800;
}

.status-info {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    font-size: 15px;
}

.status-label {
    font-weight: 600;
    color: #000000;
}

.status-time {
    font-weight: 600;
    color: #000000;
}

.status-separator {
    color: #C7C7CC;
    font-weight: 400;
}

.status-address {
    font-weight: 400;
    color: #666666;
}
```

---

### Экран 3: Главный экран - Конец дня (Main Screen / End of the Day)

**Назначение:** Экран сотрудника после отметки об уходе, показывает завершенный рабочий день

**Структура:**
```html
<div class="employee-main-screen end-of-day">
    <div class="employee-profile-header">
        <img src="avatar.jpg" class="profile-avatar-small" />
        <div class="profile-info">
            <h2 class="profile-name">Сидоров Николай</h2>
            <span class="profile-date">2 октября, <span class="weekday">четверг</span></span>
        </div>
    </div>
    
    <!-- Таймлайн рабочего дня -->
    <div class="day-timeline">
        <div class="timeline-record arrival">
            <div class="timeline-dot filled"></div>
            <div class="timeline-content">
                <span class="timeline-label">Пришел:</span>
                <span class="timeline-time">09:30</span>
                <span class="timeline-separator">•</span>
                <span class="timeline-address">Истра, ул. Мира 19</span>
            </div>
        </div>
        
        <div class="timeline-connector"></div>
        
        <div class="timeline-record departure">
            <div class="timeline-dot filled"></div>
            <div class="timeline-content">
                <span class="timeline-label">Ушел:</span>
                <span class="timeline-time">18:30</span>
                <span class="timeline-separator">•</span>
                <span class="timeline-address">Истра, ул. Мира 19</span>
            </div>
        </div>
    </div>
    
    <div class="employee-map-container">
        <div id="employee-map" class="employee-map">
            <!-- Yandex Maps с позицией последней отметки -->
        </div>
    </div>
    
    <!-- Нет кнопки действия, день завершен -->
    <div class="day-completed-message">
        <span class="completed-icon">✓</span>
        <span class="completed-text">Рабочий день завершен</span>
    </div>
</div>
```

**Стили таймлайна и завершения дня:**
```css
.day-timeline {
    display: flex;
    flex-direction: column;
    background: #F9F9F9;
    padding: 20px 16px;
    border-radius: 16px;
    margin-bottom: 20px;
    border: 1px solid rgba(0, 0, 0, 0.05);
    position: relative;
}

.timeline-record {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    position: relative;
    z-index: 2;
}

.timeline-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 3px solid #E5E5E5;
    background: #FFFFFF;
    flex-shrink: 0;
    margin-top: 4px;
}

.timeline-dot.filled {
    background: #000000;
    border-color: #000000;
}

.timeline-content {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 15px;
    padding-bottom: 4px;
}

.timeline-connector {
    width: 2px;
    height: 16px;
    background: #E5E5E5;
    margin-left: 5px;
    position: relative;
    z-index: 1;
}

.day-completed-message {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 20px;
    background: rgba(76, 175, 80, 0.1);
    border-radius: 16px;
    margin-top: 20px;
}

.completed-icon {
    font-size: 20px;
    color: #4CAF50;
}

.completed-text {
    font-size: 15px;
    font-weight: 500;
    color: #4CAF50;
}
```

---

### Экран 4: Форма создания отметки (Record Form)

**Назначение:** Форма создания отметки о приходе/уходе с геолокацией и опциональным фото

**Структура:**
```html
<div class="geolocation-screen">
    <div class="geo-header">
        <img src="avatar.jpg" class="geo-avatar" />
        <h2 class="geo-name">Сидоров Николай</h2>
        <span class="geo-date">2 октября, <span class="weekday">четверг</span></span>
    </div>
    
    <div class="geo-form">
        <!-- Адрес -->
        <div class="geo-address-card">
            <span class="geo-location-icon">📍</span>
            <span class="geo-address-text">Истра, ул. Мира 19</span>
        </div>
        
        <!-- Дата и Время -->
        <div class="geo-datetime-grid">
            <div class="datetime-item">
                <label class="datetime-label">Дата</label>
                <input type="text" class="datetime-value" value="02.10.25" readonly />
            </div>
            <div class="datetime-item">
                <label class="datetime-label">Время</label>
                <input type="text" class="datetime-value" value="09:30" readonly />
            </div>
        </div>
        
        <!-- Комментарий -->
        <div class="geo-comment-section">
            <label class="comment-label">Комментарий</label>
            <textarea 
                class="comment-input" 
                placeholder="Добавьте комментарий"
                rows="4"
            ></textarea>
        </div>
        
        <!-- Фото -->
        <div class="geo-photo-section">
            <label class="photo-section-label">Прикрепите фотографию*</label>
            <div class="photo-upload-grid">
                <button type="button" class="photo-upload-btn add">
                    <span class="upload-icon">+</span>
                </button>
                <button type="button" class="photo-upload-btn processing">
                    <span class="upload-icon loading">⟳</span>
                </button>
                <div class="photo-preview-thumb">
                    <img src="photo.jpg" class="thumb-image" />
                    <button type="button" class="remove-thumb-btn">
                        <span class="remove-icon">🗑</span>
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Кнопки действий -->
        <div class="geo-actions">
            <button type="button" class="geo-btn secondary">
                Отмена
            </button>
            <button type="submit" class="geo-btn primary">
                Сохранить
            </button>
        </div>
    </div>
</div>
```

**Стили формы геолокации:**
```css
.geolocation-screen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #FFFFFF;
    z-index: 100;
    overflow-y: auto;
    padding: 60px 16px 40px;
}

.geo-header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 24px;
}

.geo-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    object-fit: cover;
    background: #E5E5E5;
    margin-bottom: 4px;
}

.geo-name {
    font-size: 20px;
    font-weight: 600;
    color: #000000;
    margin: 0;
}

.geo-date {
    font-size: 15px;
    font-weight: 400;
    color: #000000;
}

.geo-date .weekday {
    color: #999999;
}

.geo-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

/* Карточка адреса */
.geo-address-card {
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(200, 230, 201, 0.3);
    padding: 16px;
    border-radius: 16px;
}

.geo-location-icon {
    font-size: 24px;
    flex-shrink: 0;
}

.geo-address-text {
    font-size: 17px;
    font-weight: 500;
    color: #000000;
    flex: 1;
}

/* Дата и время */
.geo-datetime-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.datetime-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: #F9F9F9;
    padding: 16px;
    border-radius: 12px;
}

.datetime-label {
    font-size: 13px;
    font-weight: 400;
    color: #999999;
}

.datetime-value {
    font-size: 17px;
    font-weight: 600;
    color: #000000;
    border: none;
    background: transparent;
    padding: 0;
    outline: none;
}

/* Комментарий */
.geo-comment-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.comment-label {
    font-size: 15px;
    font-weight: 600;
    color: #000000;
}

.comment-input {
    width: 100%;
    padding: 16px;
    border: 1px solid #E5E5E5;
    border-radius: 12px;
    font-size: 15px;
    font-family: inherit;
    resize: vertical;
    background: #F9F9F9;
    color: #000000;
    outline: none;
}

.comment-input::placeholder {
    color: #C7C7CC;
}

.comment-input:focus {
    border-color: #FFD166;
    background: #FFFFFF;
}

/* Фото */
.geo-photo-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.photo-section-label {
    font-size: 15px;
    font-weight: 600;
    color: #000000;
}

.photo-upload-grid {
    display: flex;
    gap: 12px;
    align-items: center;
}

.photo-upload-btn {
    width: 80px;
    height: 80px;
    border: none;
    border-radius: 16px;
    background: #F9F9F9;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s, transform 0.2s;
    flex-shrink: 0;
}

.photo-upload-btn.add {
    border: 2px dashed #E5E5E5;
}

.photo-upload-btn.processing {
    background: #F0F0F0;
}

.photo-upload-btn:active {
    transform: scale(0.95);
}

.upload-icon {
    font-size: 32px;
    color: #999999;
}

.upload-icon.loading {
    animation: rotate 1s linear infinite;
}

@keyframes rotate {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

.photo-preview-thumb {
    position: relative;
    width: 80px;
    height: 80px;
    border-radius: 16px;
    overflow: hidden;
    flex-shrink: 0;
}

.thumb-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.remove-thumb-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(10px);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
}

.remove-thumb-btn:active {
    background: rgba(0, 0, 0, 0.8);
}

.remove-icon {
    font-size: 16px;
}

/* Кнопки действий */
.geo-actions {
    display: flex;
    gap: 12px;
    margin-top: 12px;
}

.geo-btn {
    flex: 1;
    padding: 16px 24px;
    border: none;
    border-radius: 16px;
    font-size: 17px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, opacity 0.2s;
    -webkit-tap-highlight-color: transparent;
}

.geo-btn:active {
    transform: scale(0.98);
    opacity: 0.9;
}

.geo-btn.secondary {
    background: #F5F5F5;
    color: #000000;
}

.geo-btn.primary {
    background: linear-gradient(135deg, #FFD166 0%, #F4A261 100%);
    color: #000000;
    box-shadow: 0 4px 12px rgba(255, 209, 102, 0.3);
}
```

---

## 📱 Адаптивность и Взаимодействие

### Touch-friendly элементы
```css
/* Минимальная высота для тач-таргетов */
.touchable {
    min-height: 44px;
    min-width: 44px;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    -webkit-user-select: none;
}

/* Active состояния */
.interactive:active {
    transform: scale(0.98);
    opacity: 0.9;
}
```

### Safe Areas (для iOS)
```css
body {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
}

.bottom-navigation {
    padding-bottom: calc(34px + env(safe-area-inset-bottom));
}
```

### Анимации
```css
/* Переходы между экранами */
.screen-transition {
    animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

/* Fade transitions */
.fade-transition {
    animation: fadeIn 0.2s ease-out;
}
```

---

## 🔌 Недостающие API Endpoints

Большинство эндпоинтов для реализации дизайна уже реализованы. Ниже список опциональных эндпоинтов, которые могут понадобиться в будущем:

### 1. GET `/api/users/{user_id}/records` (опционально)

**Назначение:** Получение всех записей конкретного пользователя за период (для истории)

**Query параметры:**
- `start_date` (optional) - начало периода (YYYY-MM-DD)
- `end_date` (optional) - конец периода (YYYY-MM-DD)
- `limit` (optional) - количество записей (default: 30)

**Статус:** Логика есть в `RecordService.get_user_records()`, но эндпоинт не добавлен в routes. Можно добавить при необходимости просмотра истории сотрудника.

**Response:**
```json
{
    "user_id": 1,
    "records": [
        {
            "id": 123,
            "type": "arrival",
            "timestamp": "2025-10-02T09:30:00",
            "address": "Истра, ул. Мира 19",
            "has_photo": true
        }
    ]
}
```

---

### 2. GET `/api/reports/{report_id}/download` (не срочно)

**Назначение:** Скачивание сгенерированного отчета

**Статус:** Пока не реализовано, так как генерация отчетов еще не добавлена.

---

### 3. GET `/api/statistics` (желательно для dashboard)

**Назначение:** Статистика для администратора

**Response:**
```json
{
    "today": {
        "total_employees": 10,
        "present": 8,
        "absent": 2,
        "left": 3
    },
    "week": {
        "average_attendance": 85,
        "late_arrivals": 5
    }
}
```

**Статус:** Не реализовано. Можно добавить позже для расширенного dashboard администратора.

---

## 📝 Примечания для разработки

1. **Приоритет мобильного опыта:** Дизайн оптимизирован для iOS, но должен хорошо работать на Android
2. **Использовать нативные элементы:** По возможности использовать стандартные компоненты браузера
3. **Легкие анимации:** Все переходы должны быть быстрыми (200-300ms)
4. **Оффлайн-режим:** Предусмотреть кэширование для работы без интернета
5. **Accessibility:** Добавить aria-labels для всех интерактивных элементов

---

## 📊 Сравнение ролей

| Аспект | Администратор | Сотрудник |
|--------|--------------|-----------|
| **Фон** | Gradient overlay + белый | Чистый белый |
| **Навигация** | Нижняя панель (3 экрана) | Нет навигации |
| **Основной цвет** | Синий (system) | Желто-оранжевый |
| **Карта** | Полноэкранная с маркерами | Встроенная в экран |
| **Карточки** | Светло-серые (#F9F9F9) | Светло-серые (#F9F9F9) |
| **Список** | Просмотр всех сотрудников | Только свои отметки |
| **Действия** | Просмотр, отчеты | Создание отметок |

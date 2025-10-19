# 🐛 Debug Box - Руководство по использованию

Debug Box - это инструмент для отладки приложения на мобильных устройствах, особенно в Telegram Mini Apps, где нет доступа к DevTools.

## 📦 Расположение

- **Модуль**: `frontend/static/js/utils/debug.js`
- **UI**: Плавающая кнопка 🐛 в правом нижнем углу + выдвигающаяся панель снизу

## 🚀 Быстрый старт

### 1. Показать Debug Box

На экране есть кнопка 🐛 в правом нижнем углу - нажмите на неё чтобы показать/скрыть debug панель.

### 2. Добавить логи в ваш экран

```javascript
// Импортируйте debugLog из модуля debug
import { debugLog } from '../../utils/debug.js';

// Используйте в коде
debugLog('Сообщение', { key: 'value' });
```

## 📖 API

### `debugLog(message, data)`

Добавляет лог в debug box.

**Параметры:**
- `message` (string) - Текст сообщения
- `data` (any, optional) - Дополнительные данные (объект, массив, примитив)

**Примеры:**

```javascript
// Простое сообщение
debugLog('Приложение запущено');

// С данными
debugLog('User loaded', { id: 123, name: 'John' });

// С массивом
debugLog('Items', [1, 2, 3]);

// Только в одном выражении
debugLog('Status', status);
```

### `showDebugBox()`

Показывает debug box.

```javascript
import { showDebugBox } from '../../utils/debug.js';

showDebugBox();
```

### `hideDebugBox()`

Скрывает debug box.

```javascript
import { hideDebugBox } from '../../utils/debug.js';

hideDebugBox();
```

### `toggleDebugBoxVisibility()`

Переключает видимость debug box (показать/скрыть).

```javascript
import { toggleDebugBoxVisibility } from '../../utils/debug.js';

// По нажатию кнопки
button.addEventListener('click', toggleDebugBoxVisibility);
```

### `clearDebugLog()`

Очищает все логи.

```javascript
import { clearDebugLog } from '../../utils/debug.js';

clearDebugLog();
```

### `toggleDebugContent()`

Сворачивает/разворачивает контент debug box (сама панель остается видимой).

```javascript
import { toggleDebugContent } from '../../utils/debug.js';

toggleDebugContent();
```

### `initDebugBox()`

Инициализирует debug box (вызывается автоматически в `app.js`).

```javascript
import { initDebugBox } from '../../utils/debug.js';

// Вызывается один раз при загрузке приложения
initDebugBox();
```

## 🎯 Примеры использования

### Отладка загрузки данных

```javascript
import { debugLog } from '../../utils/debug.js';

async function loadUserData(userId) {
    debugLog('Loading user data', { userId });
    
    try {
        const data = await API.getUser(userId);
        debugLog('User data loaded', data);
        return data;
    } catch (error) {
        debugLog('Error loading user', { 
            error: error.message,
            userId 
        });
        throw error;
    }
}
```

### Отладка форматирования

```javascript
import { debugLog } from '../../utils/debug.js';

function formatAddress(address) {
    debugLog('formatAddress called', {
        type: typeof address,
        hasCity: !!address?.city,
        hasStreet: !!address?.street
    });
    
    const result = processAddress(address);
    
    debugLog('formatAddress result', result);
    return result;
}
```

### Условная отладка

```javascript
import { debugLog } from '../../utils/debug.js';

function processData(data) {
    // Логируем только в dev режиме
    if (window.location.hostname === 'localhost') {
        debugLog('Processing data', data);
    }
    
    // Или логируем только ошибки
    if (data.status === 'error') {
        debugLog('Error in data', data);
    }
}
```

### Отладка на конкретном экране

```javascript
// screens/worker/home.js
import { debugLog, showDebugBox } from '../../utils/debug.js';

export async function showWorkerHome(user) {
    // Показываем debug box автоматически на этом экране
    showDebugBox();
    
    debugLog('Worker home opened', { userId: user.id });
    
    // ... остальной код
}
```

## 💡 Best Practices

### 1. Используйте осмысленные сообщения

```javascript
// ❌ Плохо
debugLog('data', data);

// ✅ Хорошо
debugLog('API response received', data);
```

### 2. Структурируйте данные

```javascript
// ❌ Плохо
debugLog('status: ' + status + ', user: ' + user.name);

// ✅ Хорошо
debugLog('User status', { 
    status, 
    userName: user.name,
    userId: user.id 
});
```

### 3. Используйте эмодзи для категоризации

```javascript
debugLog('🚀 App started');
debugLog('📥 Data received', data);
debugLog('✅ Success', result);
debugLog('❌ Error', error);
debugLog('🔍 Debug info', info);
```

### 4. Очищайте логи перед важными операциями

```javascript
import { clearDebugLog, debugLog } from '../../utils/debug.js';

async function criticalOperation() {
    clearDebugLog();
    debugLog('🎯 Starting critical operation');
    
    // ... операция
}
```

## 🔧 Технические детали

### Ограничения

- **Максимум логов**: 50 (автоматически удаляются старые)
- **Размер данных**: Обрезаются до 500 символов в JSON
- **Z-index**: 99999 (debug box), 99998 (кнопка)

### Совместимость

- ✅ Работает во всех современных браузерах
- ✅ Работает в Telegram Mini Apps (iOS/Android)
- ✅ Работает без DevTools
- ✅ Автоматически подхватывает ранние логи из inline скрипта

### Глобальные функции

Все функции также доступны глобально через `window` для совместимости:

```javascript
// В консоли браузера или inline скриптах
window.debugLog('Test', { data: 123 });
window.showDebugBox();
window.hideDebugBox();
window.clearDebugLog();
```

## 🎨 Кастомизация

### Изменить стили Debug Box

Отредактируйте inline стили в `frontend/index.html`:

```html
<div id="debug-box" style="
    background: rgba(0, 0, 0, 0.95);  <!-- Цвет фона -->
    border-top: 2px solid #00ff00;    <!-- Цвет границы -->
    color: #00ff00;                   <!-- Цвет текста -->
    max-height: 40vh;                 <!-- Максимальная высота -->
">
```

### Изменить кнопку

```html
<button id="debug-show-btn" style="
    bottom: 10px;           <!-- Отступ снизу -->
    right: 10px;            <!-- Отступ справа -->
    width: 50px;            <!-- Размер -->
    height: 50px;
    font-size: 20px;        <!-- Размер эмодзи -->
">🐛</button>
```

### Изменить лимит логов

В `frontend/static/js/utils/debug.js`:

```javascript
const MAX_DEBUG_LOGS = 100; // Было 50
```

## 🐞 Troubleshooting

### Debug box не появляется

1. Проверьте что кнопка 🐛 видна
2. Нажмите на кнопку
3. Проверьте в DevTools что элемент `#debug-box` существует

### Логи не добавляются

1. Проверьте импорт: `import { debugLog } from '../../utils/debug.js';`
2. Проверьте что `initDebugBox()` вызван в `app.js`
3. Проверьте консоль на ошибки

### Функция не найдена

```javascript
// ❌ Неправильно
import { debugLog } from '../../utils/helpers.js';

// ✅ Правильно
import { debugLog } from '../../utils/debug.js';
```

## 📱 Использование на мобильных

1. Откройте приложение в Telegram
2. Нажмите кнопку 🐛 справа внизу
3. Debug box появится снизу экрана
4. Скроллите логи пальцем
5. Нажмите "Свернуть/Развернуть" чтобы свернуть контент
6. Нажмите "Очистить" чтобы очистить логи
7. Нажмите 🐛 снова чтобы полностью скрыть debug box

## 🎓 Примеры из реальных экранов

### Worker Home Screen

```javascript
// frontend/static/js/screens/worker/home.js
import { debugLog } from '../../utils/debug.js';

export async function showWorkerHome(user) {
    debugLog('🏠 Worker home screen opened', { 
        userId: user.id,
        userName: user.name 
    });
    
    // Загрузка статуса
    const status = await API.getUserTodayStatus();
    debugLog('📥 Status received', {
        has_arrival: status.has_arrival,
        has_departure: status.has_departure
    });
    
    // Форматирование адреса
    if (status.arrival_record) {
        debugLog('🔍 ARRIVAL address', status.arrival_record.address);
        const formatted = formatAddress(status.arrival_record.address);
        debugLog('✅ ARRIVAL formatted', formatted);
    }
}
```

### Admin Map Screen

```javascript
// frontend/static/js/screens/admin/map.js
import { debugLog } from '../../utils/debug.js';

export async function showAdminMap() {
    debugLog('🗺️ Map screen opened');
    
    const data = await API.get('/api/current-locations');
    debugLog('📍 Locations loaded', { 
        count: data.locations.length 
    });
    
    data.locations.forEach(loc => {
        debugLog('➕ Adding marker', {
            user: loc.user.name,
            coords: [loc.latitude, loc.longitude]
        });
    });
}
```

---

**Версия**: 1.0  
**Обновлено**: 19.10.2024


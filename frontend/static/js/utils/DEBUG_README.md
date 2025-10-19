# 🐛 Debug Module - Quick Reference

Модуль для отладки на мобильных устройствах (особенно в Telegram Mini Apps).

## 📦 Импорт

```javascript
import { debugLog } from '../../utils/debug.js';
```

## 🚀 Основное использование

```javascript
// Простой лог
debugLog('Message');

// С данными
debugLog('User loaded', { id: 123, name: 'John' });

// С эмодзи для категоризации
debugLog('🚀 App started');
debugLog('📥 Data received', data);
debugLog('✅ Success', result);
debugLog('❌ Error', error);
```

## 🎯 API

| Функция | Описание |
|---------|----------|
| `debugLog(message, data?)` | Добавить лог |
| `showDebugBox()` | Показать debug box |
| `hideDebugBox()` | Скрыть debug box |
| `toggleDebugBoxVisibility()` | Переключить видимость |
| `clearDebugLog()` | Очистить все логи |
| `toggleDebugContent()` | Свернуть/развернуть контент |
| `initDebugBox()` | Инициализация (вызывается автоматически) |

## 📱 UI

- **Кнопка**: 🐛 в правом нижнем углу (показать/скрыть debug box)
- **Панель**: Выдвигается снизу экрана
- **Кнопки в панели**:
  - "Очистить" - очистить все логи
  - "Свернуть/Развернуть" - свернуть контент панели

## 📖 Полная документация

См. `/DEBUG_GUIDE.md` в корне проекта.

## 💡 Пример

```javascript
import { debugLog } from '../../utils/debug.js';

export async function showWorkerHome(user) {
    debugLog('🏠 Home opened', { userId: user.id });
    
    try {
        const data = await loadData();
        debugLog('✅ Data loaded', data);
    } catch (error) {
        debugLog('❌ Error', { message: error.message });
    }
}
```


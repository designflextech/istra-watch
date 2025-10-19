#!/bin/bash

# Скрипт для тестирования Safe Area
echo "🔍 Тестирование Safe Area для Istra Watch"
echo "=========================================="

# Проверяем, запущен ли сервер
if ! curl -s http://localhost:8000 > /dev/null; then
    echo "❌ Сервер не запущен на localhost:8000"
    echo "Запустите сервер командой: make run"
    exit 1
fi

echo "✅ Сервер запущен"

# Открываем тестовую страницу
echo "🌐 Открываем тестовую страницу Safe Area..."

if command -v open > /dev/null; then
    # macOS
    open "http://localhost:8000/safe-area-test.html"
elif command -v xdg-open > /dev/null; then
    # Linux
    xdg-open "http://localhost:8000/safe-area-test.html"
elif command -v start > /dev/null; then
    # Windows
    start "http://localhost:8000/safe-area-test.html"
else
    echo "📱 Откройте в браузере: http://localhost:8000/safe-area-test.html"
fi

echo ""
echo "📋 Инструкции для тестирования:"
echo "1. Откройте Chrome DevTools (F12)"
echo "2. Включите режим мобильного устройства"
echo "3. Выберите iPhone 14 Pro или iPhone 15 Pro"
echo "4. Включите 'Show device frame'"
echo "5. Нажмите 'Показать Safe Area' на тестовой странице"
echo "6. Попробуйте симуляцию iOS/Android"
echo ""
echo "🔧 Команды для отладки в консоли:"
echo "- safeAreaDebugger.logSafeAreaInfo()"
echo "- safeAreaDebugger.validateSafeArea()"
echo "- safeAreaDebugger.createVisualIndicator()"
echo ""
echo "✅ Тестовая страница должна открыться в браузере"

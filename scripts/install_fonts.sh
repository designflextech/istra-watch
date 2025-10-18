#!/bin/bash
# Скрипт для установки шрифтов DejaVu Sans для генерации PDF отчетов

set -e

echo "🔤 Установка шрифтов DejaVu Sans..."

# Определяем корневую директорию проекта
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FONTS_DIR="$PROJECT_ROOT/fonts"

# Создаем директорию если её нет
mkdir -p "$FONTS_DIR"

# Проверяем что шрифты уже не установлены
if [ -f "$FONTS_DIR/DejaVuSans.ttf" ]; then
    echo "✓ Шрифты уже установлены в $FONTS_DIR"
    exit 0
fi

# Скачиваем шрифты
echo "📥 Скачивание шрифтов DejaVu..."
cd "$FONTS_DIR"
curl -L -O https://github.com/dejavu-fonts/dejavu-fonts/releases/download/version_2_37/dejavu-fonts-ttf-2.37.tar.bz2

# Распаковываем
echo "📦 Распаковка..."
tar -xjf dejavu-fonts-ttf-2.37.tar.bz2

# Копируем TTF файлы
echo "📋 Копирование файлов..."
mv dejavu-fonts-ttf-2.37/ttf/*.ttf .

# Очистка
echo "🧹 Очистка..."
rm -rf dejavu-fonts-ttf-2.37 dejavu-fonts-ttf-2.37.tar.bz2

echo "✅ Шрифты успешно установлены в $FONTS_DIR"
echo ""
echo "Установленные шрифты:"
ls -lh "$FONTS_DIR"/*.ttf | awk '{print "  - " $9}'

# Создаем маркерный файл
echo "# Маркер успешной установки шрифтов DejaVu Sans" > "$PROJECT_ROOT/.fonts_installed"
echo "# Дата установки: $(date +%Y-%m-%d)" >> "$PROJECT_ROOT/.fonts_installed"
echo "✓ Шрифты DejaVu установлены" >> "$PROJECT_ROOT/.fonts_installed"


# Dockerfile для istra-watch
FROM python:3.12-slim

# Устанавливаем системные зависимости
RUN apt-get update && apt-get install -y \
    postgresql-client \
    curl \
    bzip2 \
    fonts-dejavu \
    fonts-dejavu-core \
    fonts-dejavu-extra \
    fonts-noto-color-emoji \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем requirements.txt
COPY requirements.txt .

# Устанавливаем Python зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Копируем код приложения
COPY . .

# Создаем директорию для шрифтов и устанавливаем их
RUN mkdir -p /app/fonts && \
    cd /app/fonts && \
    curl -L -o dejavu-fonts.tar.bz2 https://github.com/dejavu-fonts/dejavu-fonts/releases/download/version_2_37/dejavu-fonts-ttf-2.37.tar.bz2 && \
    tar -xjf dejavu-fonts.tar.bz2 && \
    mv dejavu-fonts-ttf-2.37/ttf/*.ttf . && \
    rm -rf dejavu-fonts-ttf-2.37 dejavu-fonts.tar.bz2 && \
    cd /app

# Создаем маркерный файл
RUN echo "# Шрифты установлены в Docker образе" > /app/.fonts_installed && \
    echo "# Дата сборки образа: $(date +%Y-%m-%d)" >> /app/.fonts_installed && \
    echo "✓ Шрифты DejaVu установлены" >> /app/.fonts_installed

# Создаем непривилегированного пользователя
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

# Открываем порты
EXPOSE 8080 8443

# Команда запуска
CMD ["python", "main.py"]


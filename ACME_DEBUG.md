# Диагностика проблемы с ACME сертификатом

## Проблема
Let's Encrypt пытается получить доступ по HTTPS вместо HTTP:
```
Invalid response from https://istra-geo-watch.nwsr.in/.well-known/acme-challenge/...
```

Это ненормально! ACME HTTP challenge ВСЕГДА должен идти по HTTP (порт 80), но Let's Encrypt почему-то обращается по HTTPS.

## Возможные причины

### 1. Cloudflare или другой CDN (НАИБОЛЕЕ ВЕРОЯТНО)
Если домен `istra-geo-watch.nwsr.in` проксируется через Cloudflare:
- Cloudflare включает "Always Use HTTPS"
- Это редиректит ВСЕ HTTP запросы на HTTPS
- Включая ACME challenge запросы

**Решение:**
1. Зайдите в панель Cloudflare
2. Перейдите в SSL/TLS → Edge Certificates
3. Временно **отключите "Always Use HTTPS"**
4. Или измените режим на "DNS only" (серая облако) вместо "Proxied" (оранжевое облако)
5. Дождитесь получения сертификата
6. Верните настройки обратно

### 2. DNS провайдер с форсированным HTTPS
Некоторые DNS провайдеры (например, некоторые регистраторы доменов) имеют настройку "Force HTTPS" на уровне DNS.

**Проверка:**
```bash
# Проверьте, есть ли HSTS или редирект на DNS уровне
curl -I http://istra-geo-watch.nwsr.in
# Должен вернуть 200 или 404, НЕ 301/302 редирект на HTTPS
```

### 3. Старые CAA записи в DNS
CAA записи могут блокировать Let's Encrypt.

**Проверка:**
```bash
dig CAA istra-geo-watch.nwsr.in
# Если есть CAA записи, убедитесь что letsencrypt.org разрешен
```

## Решение: Использовать DNS Challenge

Если у вас есть доступ к API DNS провайдера, можно переключиться на DNS challenge вместо HTTP challenge.

**Для этого нужно:**
1. Попросить администратора сервера изменить certresolver в Traefik:
   ```bash
   --certificatesresolvers.le.acme.dnschallenge=true
   --certificatesresolvers.le.acme.dnschallenge.provider=cloudflare  # или другой провайдер
   ```

2. Добавить переменные окружения для DNS API в Traefik контейнер

## Временное решение: Вручную получить сертификат

Если ничего не помогает, можно:
1. Временно остановить Traefik
2. Запустить certbot локально на сервере:
   ```bash
   certbot certonly --standalone -d istra-geo-watch.nwsr.in
   ```
3. Скопировать полученный сертификат в `/opt/traefik/certs/`
4. Настроить Traefik использовать статический сертификат

## Что проверить ПРЯМО СЕЙЧАС

Выполните эту команду с вашего компьютера:
```bash
curl -v http://istra-geo-watch.nwsr.in/.well-known/acme-challenge/test
```

Ожидаемый результат: 404 или другая ошибка, но запрос должен идти по HTTP (порт 80).

Если видите редирект 301/302 на HTTPS - значит проблема в Cloudflare или DNS провайдере, НЕ в вашей конфигурации docker-compose.yml.


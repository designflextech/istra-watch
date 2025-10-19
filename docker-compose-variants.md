# Варианты конфигурации для решения проблемы ACME

## Вариант 1: Базовый (без HTTP роутера вообще)
Попробуйте этот вариант, если у вас TLS-ALPN challenge:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.istrageowatch.rule=Host(`istra-geo-watch.nwsr.in`)"
  - "traefik.http.routers.istrageowatch.entrypoints=websecure"
  - "traefik.http.routers.istrageowatch.tls=true"
  - "traefik.http.routers.istrageowatch.tls.certresolver=le"
  - "traefik.http.services.istrageowatch.loadbalancer.server.port=8443"
  - "traefik.docker.network=proxy"
```

## Вариант 2: Явно указать приоритет HTTP роутера
Может помочь, если глобальные правила конфликтуют:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.istrageowatch-secure.rule=Host(`istra-geo-watch.nwsr.in`)"
  - "traefik.http.routers.istrageowatch-secure.entrypoints=websecure"
  - "traefik.http.routers.istrageowatch-secure.tls=true"
  - "traefik.http.routers.istrageowatch-secure.tls.certresolver=le"
  - "traefik.http.routers.istrageowatch-secure.service=istrageowatch"
  - "traefik.http.routers.istrageowatch-insecure.rule=Host(`istra-geo-watch.nwsr.in`)"
  - "traefik.http.routers.istrageowatch-insecure.entrypoints=web"
  - "traefik.http.routers.istrageowatch-insecure.priority=100"
  - "traefik.http.routers.istrageowatch-insecure.service=istrageowatch"
  - "traefik.http.services.istrageowatch.loadbalancer.server.port=8443"
  - "traefik.docker.network=proxy"
```

## Вариант 3: Временно использовать staging Let's Encrypt
Чтобы не попасть в rate limit при тестировании:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.istrageowatch.rule=Host(`istra-geo-watch.nwsr.in`)"
  - "traefik.http.routers.istrageowatch.entrypoints=websecure"
  - "traefik.http.routers.istrageowatch.tls=true"
  - "traefik.http.routers.istrageowatch.tls.certresolver=le-staging"
  - "traefik.http.services.istrageowatch.loadbalancer.server.port=8443"
  - "traefik.docker.network=proxy"
```

## Проверьте в Portainer

1. **Traefik Dashboard**: Проверьте доступные certresolvers
   - Должен быть `le` или `le-tls` или `letsencrypt`
   
2. **Traefik Middlewares**: Проверьте, есть ли глобальный redirect middleware
   - Если есть, нужно его исключить для вашего сервиса

3. **Entrypoints**: Убедитесь что:
   - `web` (80) существует и доступен
   - `websecure` (443) существует и доступен


// k6 HEAVY load test - до 2000 пользователей
//
// ВНИМАНИЕ: Запускать только с отключенным rate limiting!
//
// Запуск:
//   k6 run scripts/load-test-heavy.js
//   k6 run --out json=results.json scripts/load-test-heavy.js
//
// С параметрами:
//   k6 run -e BASE_URL=https://istra-geo-watch.nwsr.in scripts/load-test-heavy.js

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// ================== МЕТРИКИ ==================
const errorRate = new Rate('error_rate');
const apiErrors = Counter('api_errors');
const dbConnectionErrors = Counter('db_connection_errors');
const rateLimitHits = Counter('rate_limit_hits');

const configLatency = new Trend('latency_config', true);
const employeesLatency = new Trend('latency_employees', true);
const locationsLatency = new Trend('latency_locations', true);
const statusLatency = new Trend('latency_status', true);

const activeConnections = new Gauge('active_connections');

// ================== КОНФИГУРАЦИЯ ==================
export const options = {
  scenarios: {
    // Сценарий 1: Постепенный рост до 500 юзеров
    gradual_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },     // Разогрев
        { duration: '2m', target: 200 },    // Средняя нагрузка
        { duration: '3m', target: 500 },    // Высокая нагрузка
        { duration: '2m', target: 500 },    // Удержание
        { duration: '1m', target: 0 },      // Спад
      ],
      gracefulRampDown: '30s',
    },

    // Сценарий 2: Стресс-тест до 2000 юзеров (запускается после первого)
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },
        { duration: '1m', target: 500 },
        { duration: '1m', target: 1000 },
        { duration: '1m', target: 1500 },
        { duration: '1m', target: 2000 },   // Пиковая нагрузка!
        { duration: '2m', target: 2000 },   // Удержание пика
        { duration: '1m', target: 0 },
      ],
      startTime: '10m', // Начинается после gradual_load
      gracefulRampDown: '30s',
    },

    // Сценарий 3: Spike test (внезапный всплеск)
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 1000 },  // Мгновенный всплеск!
        { duration: '1m', target: 1000 },
        { duration: '10s', target: 0 },
      ],
      startTime: '20m',
    },
  },

  // Пороговые значения
  thresholds: {
    http_req_duration: ['p(50)<500', 'p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.10'],       // Допустимо до 10% ошибок под нагрузкой
    error_rate: ['rate<0.15'],
    rate_limit_hits: ['count<100'],        // Не более 100 rate limit
  },

  // Настройки HTTP
  httpDebug: 'summary',
  noConnectionReuse: false,  // Переиспользуем соединения
  userAgent: 'k6-load-test/1.0',
};

// ================== НАСТРОЙКИ ==================
const BASE_URL = __ENV.BASE_URL || 'https://istra-geo-watch.nwsr.in';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

const headers = {
  'Content-Type': 'application/json',
  'User-Agent': 'k6-load-test/1.0',
};

if (AUTH_TOKEN) {
  headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
}

// ================== ENDPOINTS ==================
const ENDPOINTS = {
  config: { path: '/api/config', weight: 35, metric: configLatency },
  employees: { path: '/api/employees', weight: 25, metric: employeesLatency },
  locations: { path: '/api/current-locations', weight: 20, metric: locationsLatency },
  status: { path: '/api/user/today-status', weight: 20, metric: statusLatency },
};

// Weighted random selection
function pickEndpoint() {
  const total = Object.values(ENDPOINTS).reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const [name, ep] of Object.entries(ENDPOINTS)) {
    r -= ep.weight;
    if (r <= 0) return { name, ...ep };
  }
  return { name: 'config', ...ENDPOINTS.config };
}

// ================== MAIN TEST ==================
export default function () {
  const endpoint = pickEndpoint();

  group(endpoint.name, function () {
    const res = http.get(`${BASE_URL}${endpoint.path}`, { headers, timeout: '10s' });

    // Записываем latency в соответствующую метрику
    endpoint.metric.add(res.timings.duration);

    // Проверки
    const passed = check(res, {
      'status 2xx': (r) => r.status >= 200 && r.status < 300,
      'status not 5xx': (r) => r.status < 500,
      'no timeout': (r) => r.status !== 0,
      'response < 5s': (r) => r.timings.duration < 5000,
    });

    // Классификация ошибок
    if (!passed) {
      errorRate.add(1);
      apiErrors.add(1);

      if (res.status === 429) {
        rateLimitHits.add(1);
        console.warn(`[RATE LIMIT] ${endpoint.name} - VU:${__VU} Iter:${__ITER}`);
      } else if (res.status === 500 || res.status === 503) {
        // Вероятно проблема с DB connections
        if (res.body && res.body.includes('connection')) {
          dbConnectionErrors.add(1);
          console.error(`[DB ERROR] ${endpoint.name} - ${res.status}`);
        }
      } else if (res.status === 0) {
        console.error(`[TIMEOUT] ${endpoint.name} - request timed out`);
      }
    } else {
      errorRate.add(0);
    }
  });

  // Имитация реального пользователя
  sleep(Math.random() * 1.5 + 0.5); // 0.5-2 сек между запросами
}

// ================== LIFECYCLE ==================
export function setup() {
  console.log('========================================');
  console.log('  ISTRA WATCH LOAD TEST');
  console.log('========================================');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Auth: ${AUTH_TOKEN ? 'Enabled' : 'Disabled'}`);
  console.log('');

  // Проверяем доступность
  const healthCheck = http.get(`${BASE_URL}/api/config`, { headers });
  if (healthCheck.status !== 200) {
    console.error(`Health check failed: ${healthCheck.status}`);
    console.error('Make sure the server is running and rate limiting is disabled for testing');
  } else {
    console.log('Health check: OK');
  }

  return { startTime: new Date().toISOString() };
}

export function teardown(data) {
  console.log('');
  console.log('========================================');
  console.log('  TEST COMPLETED');
  console.log('========================================');
  console.log(`Started: ${data.startTime}`);
  console.log(`Ended: ${new Date().toISOString()}`);
}

// ================== SUMMARY ==================
export function handleSummary(data) {
  const summary = generateTextSummary(data);

  return {
    stdout: summary,
    'scripts/load-test-results.json': JSON.stringify(data, null, 2),
    'scripts/load-test-summary.txt': summary,
  };
}

function generateTextSummary(data) {
  const m = data.metrics;

  let s = '\n';
  s += '╔══════════════════════════════════════════════════════════════╗\n';
  s += '║           ISTRA WATCH - LOAD TEST RESULTS                   ║\n';
  s += '╠══════════════════════════════════════════════════════════════╣\n';

  s += '║ ОБЩАЯ СТАТИСТИКА                                            ║\n';
  s += `║   Всего запросов:      ${pad(m.http_reqs?.values?.count || 0, 8)}                       ║\n`;
  s += `║   Успешных:            ${pad(m.http_reqs?.values?.count - (m.http_req_failed?.values?.passes || 0), 8)}                       ║\n`;
  s += `║   Ошибок:              ${pad(m.http_req_failed?.values?.passes || 0, 8)}                       ║\n`;
  s += `║   Rate Limit hits:     ${pad(m.rate_limit_hits?.values?.count || 0, 8)}                       ║\n`;
  s += `║   DB Connection errors:${pad(m.db_connection_errors?.values?.count || 0, 8)}                       ║\n`;

  s += '╠══════════════════════════════════════════════════════════════╣\n';
  s += '║ ВРЕМЯ ОТВЕТА (мс)                                           ║\n';
  s += `║   Среднее:             ${pad(fmt(m.http_req_duration?.values?.avg), 8)}                       ║\n`;
  s += `║   Медиана (p50):       ${pad(fmt(m.http_req_duration?.values?.['p(50)']), 8)}                       ║\n`;
  s += `║   p95:                 ${pad(fmt(m.http_req_duration?.values?.['p(95)']), 8)}                       ║\n`;
  s += `║   p99:                 ${pad(fmt(m.http_req_duration?.values?.['p(99)']), 8)}                       ║\n`;
  s += `║   Максимум:            ${pad(fmt(m.http_req_duration?.values?.max), 8)}                       ║\n`;

  s += '╠══════════════════════════════════════════════════════════════╣\n';
  s += '║ ПО ENDPOINTS (avg ms)                                       ║\n';
  s += `║   /api/config:         ${pad(fmt(m.latency_config?.values?.avg), 8)}                       ║\n`;
  s += `║   /api/employees:      ${pad(fmt(m.latency_employees?.values?.avg), 8)}                       ║\n`;
  s += `║   /api/current-locations: ${pad(fmt(m.latency_locations?.values?.avg), 5)}                       ║\n`;
  s += `║   /api/user/today-status: ${pad(fmt(m.latency_status?.values?.avg), 5)}                       ║\n`;

  s += '╠══════════════════════════════════════════════════════════════╣\n';
  s += '║ ВЕРДИКТ                                                     ║\n';

  const errorPct = ((m.http_req_failed?.values?.rate || 0) * 100).toFixed(2);
  const p95 = m.http_req_duration?.values?.['p(95)'] || 0;

  if (errorPct < 5 && p95 < 2000) {
    s += '║   ✅ PASSED - Система выдержала нагрузку                    ║\n';
  } else if (errorPct < 10 && p95 < 5000) {
    s += '║   ⚠️  WARNING - Есть проблемы под высокой нагрузкой         ║\n';
  } else {
    s += '║   ❌ FAILED - Система не справляется с нагрузкой            ║\n';
  }

  s += `║   Error Rate: ${errorPct}%                                        ║\n`;
  s += '╚══════════════════════════════════════════════════════════════╝\n';

  return s;
}

function fmt(n) {
  return n ? n.toFixed(0) : '0';
}

function pad(v, len) {
  return String(v).padStart(len, ' ');
}

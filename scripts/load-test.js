// k6 load test script для Istra Watch
// Запуск: k6 run scripts/load-test.js
// Установка k6: https://k6.io/docs/getting-started/installation/

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Кастомные метрики
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');

// Конфигурация теста
export const options = {
  // Сценарии нагрузки
  scenarios: {
    // Плавный рост нагрузки
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 10 },   // Разогрев: 1 -> 10 пользователей
        { duration: '1m', target: 20 },    // Рост: 10 -> 20 пользователей
        { duration: '2m', target: 20 },    // Стабильная нагрузка: 20 пользователей
        { duration: '30s', target: 50 },   // Пик: 20 -> 50 пользователей
        { duration: '1m', target: 50 },    // Удержание пика
        { duration: '30s', target: 0 },    // Спад
      ],
    },
  },

  // Пороговые значения (тест провален если превышены)
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% запросов быстрее 2 сек
    http_req_failed: ['rate<0.05'],     // Менее 5% ошибок
    errors: ['rate<0.1'],               // Менее 10% ошибок в бизнес-логике
  },
};

const BASE_URL = 'https://istra-geo-watch.nwsr.in';

// Тестовые данные (замени на реальный токен тестового пользователя)
const TEST_AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test_token_here';

// Заголовки с авторизацией
const authHeaders = {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
  },
};

// Только GET запросы - безопасно для продакшена
const endpoints = [
  { path: '/api/config', weight: 30, name: 'config' },
  { path: '/api/employees', weight: 20, name: 'employees' },
  { path: '/api/current-locations', weight: 25, name: 'locations' },
  { path: '/api/user/today-status', weight: 25, name: 'today-status' },
];

// Выбор endpoint по весу
function selectEndpoint() {
  const totalWeight = endpoints.reduce((sum, e) => sum + e.weight, 0);
  let random = Math.random() * totalWeight;

  for (const endpoint of endpoints) {
    random -= endpoint.weight;
    if (random <= 0) return endpoint;
  }
  return endpoints[0];
}

export default function () {
  const endpoint = selectEndpoint();
  const url = `${BASE_URL}${endpoint.path}`;

  const startTime = Date.now();
  const response = http.get(url, authHeaders);
  const duration = Date.now() - startTime;

  // Записываем метрики
  apiLatency.add(duration, { endpoint: endpoint.name });

  // Проверки
  const success = check(response, {
    'status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'response time < 2s': (r) => r.timings.duration < 2000,
    'no rate limit': (r) => r.status !== 429,
  });

  errorRate.add(!success);

  // Логируем ошибки rate limit
  if (response.status === 429) {
    console.warn(`Rate limited on ${endpoint.name}`);
  }

  // Пауза между запросами (имитация реального пользователя)
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5 сек
}

// Отчет после теста
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'scripts/load-test-report.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options) {
  const metrics = data.metrics;

  let summary = '\n========== LOAD TEST SUMMARY ==========\n\n';

  summary += `Total Requests: ${metrics.http_reqs?.values?.count || 0}\n`;
  summary += `Failed Requests: ${metrics.http_req_failed?.values?.passes || 0}\n`;
  summary += `Avg Response Time: ${(metrics.http_req_duration?.values?.avg || 0).toFixed(0)}ms\n`;
  summary += `P95 Response Time: ${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(0)}ms\n`;
  summary += `Max Response Time: ${(metrics.http_req_duration?.values?.max || 0).toFixed(0)}ms\n`;
  summary += `Error Rate: ${((metrics.errors?.values?.rate || 0) * 100).toFixed(2)}%\n`;

  summary += '\n========================================\n';

  return summary;
}

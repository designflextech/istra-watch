// k6 load test script для Istra Watch
// Запуск: k6 run scripts/load-test.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Кастомные метрики
var errorRate = new Rate('errors');
var apiLatency = new Trend('api_latency');

// Конфигурация теста
export var options = {
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

var BASE_URL = 'https://istra-geo-watch.nwsr.in';

// Только GET запросы - безопасно для продакшена
var endpoints = [
  { path: '/api/config', weight: 30, name: 'config' },
];

export default function () {
  var url = BASE_URL + '/api/config';

  var startTime = Date.now();
  var response = http.get(url);
  var duration = Date.now() - startTime;

  // Записываем метрики
  apiLatency.add(duration);

  // Проверки
  var success = check(response, {
    'status is 200': function(r) { return r.status === 200; },
    'response time < 2s': function(r) { return r.timings.duration < 2000; },
    'no rate limit': function(r) { return r.status !== 429; },
  });

  errorRate.add(!success);

  // Логируем ошибки rate limit
  if (response.status === 429) {
    console.warn('Rate limited!');
  }

  // Пауза между запросами (имитация реального пользователя)
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5 сек
}

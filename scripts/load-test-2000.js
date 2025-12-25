// k6 STRESS test - до 2000 пользователей
// Запуск: k6 run scripts/load-test-2000.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

var errorRate = new Rate('errors');
var apiLatency = new Trend('api_latency');

export var options = {
  scenarios: {
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },   // Разогрев
        { duration: '1m', target: 500 },    // Средняя нагрузка
        { duration: '1m', target: 1000 },   // Высокая нагрузка
        { duration: '1m', target: 1500 },   // Очень высокая
        { duration: '1m', target: 2000 },   // ПИК 2000 юзеров!
        { duration: '2m', target: 2000 },   // Удержание пика
        { duration: '30s', target: 0 },     // Спад
      ],
    },
  },

  thresholds: {
    http_req_duration: ['p(95)<5000'],  // 95% < 5 сек (мягкий порог для стресс-теста)
    http_req_failed: ['rate<0.20'],     // Допустимо до 20% ошибок под экстремальной нагрузкой
  },
};

var BASE_URL = 'https://istra-geo-watch.nwsr.in';

export default function () {
  // Тестируем endpoint с реальным запросом к БД
  var response = http.get(BASE_URL + '/api/load-test-db');

  apiLatency.add(response.timings.duration);

  var success = check(response, {
    'status is 200': function(r) { return r.status === 200; },
    'response time < 5s': function(r) { return r.timings.duration < 5000; },
  });

  errorRate.add(!success);

  if (response.status === 429) {
    console.warn('Rate limited!');
  }
  if (response.status >= 500) {
    console.error('Server error: ' + response.status);
  }

  sleep(Math.random() * 1 + 0.3); // 0.3-1.3 сек (быстрее для стресс-теста)
}

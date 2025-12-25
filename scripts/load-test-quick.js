// k6 QUICK stress test - 3 минуты, до 500 юзеров
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

var errorRate = new Rate('errors');

export var options = {
  scenarios: {
    quick_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 100 },   // Быстрый разогрев
        { duration: '30s', target: 200 },   // 200 юзеров
        { duration: '30s', target: 300 },   // 300 юзеров
        { duration: '30s', target: 500 },   // 500 юзеров
        { duration: '40s', target: 500 },   // Удержание
        { duration: '10s', target: 0 },     // Спад
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.15'],
  },
};

var BASE_URL = 'https://istra-geo-watch.nwsr.in';

export default function () {
  var response = http.get(BASE_URL + '/api/load-test-db');

  var success = check(response, {
    'status 200': function(r) { return r.status === 200; },
    'fast': function(r) { return r.timings.duration < 3000; },
  });

  errorRate.add(!success);

  sleep(Math.random() * 0.5 + 0.2);
}

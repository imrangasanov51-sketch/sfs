// Проверка встроенного сервера для версии на ПК (без запуска Electron).
import { createRequire } from 'node:module';
const serve = createRequire(import.meta.url)('../electron/server.cjs'); const { server, port } = await serve();
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log(c ? '  ok ' : '  FAIL', m); };
const get = p => fetch(`http://127.0.0.1:${port}${p}`);
let r = await get('/'); ok(r.status === 200 && (await r.text()).includes('src/main.js'), 'главная страница отдаётся');
r = await get('/src/main.js'); ok(r.status === 200 && r.headers.get('content-type').startsWith('text/javascript'), 'модули отдаются как JavaScript');
r = await get('/style.css'); ok(r.status === 200, 'стили отдаются');
r = await get('/assets/planets/earth.png'); ok(r.status === 200 && r.headers.get('content-type') === 'image/png', 'текстуры планет отдаются как PNG');
for (const bad of ['/assets/', '/tools/make_assets.py', '/package.json', '/tests/smoke.mjs', '/src/../package.json', '/%2e%2e/package.json']) { r = await get(bad); ok(r.status === 404, `закрыто: ${bad}`); }
server.close(); console.log(fails.length ? `\nПРОВАЛЕНО: ${fails.length}` : '\nВСЕ ПРОВЕРКИ ПРОЙДЕНЫ'); process.exit(fails.length ? 1 : 0);

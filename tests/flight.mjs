// Численные проверки физики, мира и шаблонов ракет (без графики).  Запуск: node tests/flight.mjs
import { Rocket } from '../src/rocket.js';
import { TEMPLATES, DEFAULT_DESIGN, PARTS, stats, validate, isBooster, layout, graph, problems, fromLegacy, cleanDesign, newDesign } from '../src/parts.js';
import { orbit, predict, predictPath, advance, stepFor } from '../src/physics.js';
import * as W from '../src/world.js';
const { EARTH, MOON, MARS, SUN, BODIES, dominant } = W;
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log(c ? '  ok ' : '  FAIL', m); };
const fresh = d => { const r = new Rocket(structuredClone(d)); r.landedOn = null; r.state = 'flying'; return r; };
// круговая орбита вокруг тела на высоте alt (по часовой стрелке), старт в точке θ
const circ = (r, body, alt, t = 0, th = 0) => { const R = body.R + alt + r.refH / 2, [bx, by] = body.pos(t), [bvx, bvy] = body.vel(t), v = Math.sqrt(body.mu / R);
  Object.assign(r, { t, x: bx + R * Math.sin(th), y: by + R * Math.cos(th), vx: bvx + v * Math.cos(th), vy: bvy - v * Math.sin(th) }); return r; };

console.log('мир');
ok(BODIES.length === 14 && !BODIES.some(b => b.name === 'Рея'), 'в системе 14 тел (Солнце, 8 планет, 5 спутников), лишней Реи нет');
ok(Math.abs(Math.hypot(...EARTH.vel(0)) - 9145) < 20, `скорость Земли вокруг Солнца ≈ 9145 м/с (${Math.hypot(...EARTH.vel(0)).toFixed(0)})`);
ok(BODIES.filter(b => b.parent).every(b => b.soi < b.parent.soi && b.a + b.soi < (isFinite(b.parent.soi) ? b.parent.soi : Infinity)), 'сферы влияния вложены корректно');
ok(BODIES.every(b => dominant(...b.pos(5), 5) === b || b === SUN), 'центр каждого тела находится в его сфере влияния');
ok(dominant(...EARTH.pos(0), 0) === EARTH && dominant(0, 0, 0) === SUN, 'доминирующее тело: Земля у Земли, Солнце в центре');
for (const b of BODIES) { let mx = 0; for (let th = -3; th < 3; th += 0.0003) mx = Math.max(mx, Math.abs(b.terrain(th))); ok(b.terrain(0) === 0 && Math.abs(b.terrain(0.001)) < 1e-9 && mx < b.R * 0.002, `«${b.name}»: площадка плоская, рельеф ограничен (макс. ${mx.toFixed(0)} м)`); }

console.log('чертёж: свободная сборка');
for (const t of TEMPLATES) { const a = layout(t.design), b = layout(fromLegacy(t.design)); ok(a.parts.length === b.parts.length && Math.abs(a.height - b.height) < 1e-9 && a.parts.every((p, i) => p.stage === b.parts[i].stage && p.radial === b.parts[i].radial), `«${t.name}»: старый формат и конвертированный дают одну и ту же ракету`); }
{ const d = newDesign(); const add = (id, x, y, par, t = 'a') => { const u = d.next++; d.parts.push({ u, id, x, y }); if (par) d.links.push([u, par, t]); return u; };
  const pod = add('pod', 5, 100), tank = add('tankL', 5, 105.25, pod), dec = add('dec', 5, 109.55, tank), tank2 = add('tankM', 5, 112.85, dec), eng = add('engL', 5, 116.35, tank2); add('tankS', 6.8, 112.85, tank2, 's'); // боковой бак только с одной стороны
  const L = layout(d), st = id => L.parts.find(p => p.id === id).stage; ok(L.parts.length === 6 && st('tankL') === 0 && st('dec') === 1 && st('engL') === 1 && L.parts.find(p => p.radial).stage === 1, 'ступени определяются по графу разделителей, радиальная деталь — в ступени родителя');
  ok(Math.abs(L.parts[0].x) < 1e-9 && L.parts.every(p => p.y >= 0 || Math.abs(p.y) > 0) && Math.min(...L.parts.map(p => p.y - p.def.h / 2)) > -1e-9, 'координаты нормируются: ось — капсула, верх ракеты — 0');
  const r = new Rocket(d); r.landedOn = null; r.state = 'flying'; circ(r, EARTH, 100000); r.throttle = 1; for (let i = 0; i < 200; i++) r.step(0.02, { rotate: 0 }); ok(Number.isFinite(r.x) && r.stageFuel > 0 && r.alpha > 0, 'несимметричная ракета летит без ошибок');
  d.parts.push({ u: 99, id: 'tankS', x: 40, y: 40 }); ok(graph(d).unreached === 1 && problems(d).some(p => p.level === 'error' && /не соединён/.test(p.text)) && validate(d) !== null, 'деталь без связи с капсулой — ошибка, запуск запрещён'); }
{ ok(cleanDesign(null).parts.length === 0 && cleanDesign({ parts: [{ u: 1, id: 'ХХХ', x: 0, y: 0 }, { u: 2, id: 'pod', x: 'a', y: 0 }, { u: 3, id: 'pod', x: 0, y: 0 }], links: [[3, 7, 'a'], [3, 3, 'a']] }).parts.length === 1, 'повреждённые сохранения очищаются');
  ok(problems(newDesign())[0].level === 'error' && problems(fromLegacy({ stack: ['pod', 'tankS'], side: [] })).some(p => /двигател/.test(p.text)), 'проверки чертежа: пустая ракета и ракета без двигателей');
  const noPod = fromLegacy({ stack: ['tankS', 'engS'], side: [] }); ok(problems(noPod).some(p => /капсул/.test(p.text)), 'без капсулы запуск запрещён'); }

console.log('шаблоны и управляемость');
for (const t of TEMPLATES) { const st = stats(t.design); ok(validate(t.design) === null && st.twr >= 1.4 && st.alpha * 57.3 >= 0.3, `«${t.name}»: тяга/вес ${st.twr.toFixed(2)}, Δv ${st.dv.toFixed(0)} м/с, поворот ${(st.alpha * 57.3).toFixed(2)} °/с²`); }
{ const heavy = { stack: ['pod', 'tankS', 'tankXL', 'tankXL', 'tankXL', 'engH'], side: [] }, rcs = { ...heavy, side: [{ at: 1, id: 'rcs' }, { at: 2, id: 'rcs' }] }, light = { stack: ['pod', 'tankS', 'engS'], side: [] };
  const a = d => stats(d).alpha; ok(a(heavy) < a(rcs) / 5 && a(light) > a(heavy) * 50, `поворот зависит от массы: тяжёлая без двигателей ориентации ${(a(heavy) * 57.3).toFixed(3)} °/с², с ними ${(a(rcs) * 57.3).toFixed(2)}, лёгкая ${(a(light) * 57.3).toFixed(1)}`);
  const turn = d => { const r = fresh(d); circ(r, EARTH, 120000); for (let i = 0; i < 250; i++) r.rotate(0.02, 1); return r.angle; };
  ok(turn(light) > 10 * turn(heavy), `за 5 с: лёгкая ракета повернулась на ${(turn(light) * 57.3).toFixed(0)}°, тяжёлая — на ${(turn(heavy) * 57.3).toFixed(1)}°`);
  const r = fresh(light); circ(r, EARTH, 120000); let prev = 0, maxJerk = 0; for (let i = 0; i < 200; i++) { r.rotate(0.02, 1); maxJerk = Math.max(maxJerk, Math.abs(r.angVel - prev)); prev = r.angVel; } ok(r.angVel <= 1.2 + 1e-9 && maxJerk < 0.1, 'угловая скорость нарастает плавно и не превышает предела'); }

console.log('орбиты (интегрирование в системе доминирующего тела)');
for (const [b, alt] of [[EARTH, 100000], [MOON, 100000], [MARS, 80000]]) {
  const r = circ(fresh(DEFAULT_DESIGN), b, alt); for (let t = 0; t < 2e5;) { const h = stepFor(r, 0.02, 3000, 0.01); r.step(h, { rotate: 0 }); t += h; }
  const o = orbit(r); ok(o.body === b && Math.abs(o.ap - alt) < 300 && Math.abs(o.pe - alt) < 300, `орбита вокруг «${b.name}» держится (ап ${o.ap.toFixed(0)}, пе ${o.pe.toFixed(0)} м за 2·10⁵ с, тело движется со скоростью ${Math.hypot(...b.vel(0)).toFixed(0)} м/с)`);
}

console.log('подъём на орбиту (автопилот разворота)');
function ascent(design) {
  const r = new Rocket(structuredClone(design)); r.throttle = 1; let best = -1e9;
  for (let t = 0; t < 900; t += 0.02) {
    const loc = Math.atan2(r.x - EARTH.pos(r.t)[0], r.y - EARTH.pos(r.t)[1]), tgt = loc + Math.min(1, Math.max(0, (r.alt - 1000) / 60000)) * Math.PI / 2 * 0.97, err = Math.atan2(Math.sin(tgt - r.angle), Math.cos(tgt - r.angle));
    r.step(0.02, { rotate: Math.max(-1, Math.min(1, Math.sign(err) * Math.min(1.2, Math.sqrt(2 * r.alpha * 0.6 * Math.abs(err)), 2.5 * Math.abs(err)) / 1.2)) });
    const bo = r.parts.filter(isBooster); if (bo.length && bo.every(p => p.fuel <= 0)) r.stage();
    if (r.maxStage > 0 && r.parts.filter(p => p.stage === r.maxStage).every(p => p.fuel <= 0)) r.stage();
    if (r.alt > 30000) best = Math.max(best, orbit(r).pe);
    if (r.fuelTotal <= 0 || r.state === 'crashed') break;
  }
  return { best, state: r.state };
}
for (const i of [1, 2, 3, 4]) { const a = ascent(TEMPLATES[i].design); ok(a.best > 60000 && a.state !== 'crashed', `«${TEMPLATES[i].name}» выходит на орбиту (перигей ${(a.best / 1000).toFixed(0)} км)`); }

console.log('гравитация всех тел');
{ // регрессия: построение пути вперёд между шагами не должно влиять на полёт (кэш положений тел переиспользуется по кругу)
  const run = withPath => { const r = new Rocket(structuredClone(DEFAULT_DESIGN)); r.throttle = 1; for (let i = 0; i < 600; i++) { r.step(0.016, { rotate: 0 }); if (withPath && r.state === 'flying') predictPath(r, r.physProps, 3000, 150); } return [r.alt, r.speed]; };
  const a = run(false), b = run(true); ok(Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6, `прогноз траектории не портит расчёт полёта (высота ${a[0].toFixed(1)} и ${b[0].toFixed(1)} м)`); }
{ // Юпитер притягивает аппарат вне своей сферы влияния: сравниваем с расчётом без возмущений
  const run = on => { const saved = BODIES.map(b => [b.pertIdx, b.pertMu]); if (!on) BODIES.forEach(b => { b.pertIdx = new Int32Array(0); b.pertMu = new Float64Array(0); });
    const [jx, jy] = W.JUPITER.pos(0), [jvx, jvy] = W.JUPITER.vel(0), d = 1.2e10, n = Math.hypot(jx, jy), s = { t: 0, x: jx + jx / n * d, y: jy + jy / n * d, vx: jvx, vy: jvy };
    while (s.t < 1e6) advance(s, Math.min(stepFor(s, 1, 2000, 0.02), 1e6 - s.t), 1000, 0, 1); BODIES.forEach((b, i) => { b.pertIdx = saved[i][0]; b.pertMu = saved[i][1]; }); return s; };
  const a = run(true), b = run(false), diff = Math.hypot(a.x - b.x, a.y - b.y) / 1e3; ok(dominant(...[a.x, a.y], a.t) === SUN && diff > 1000, `притяжение Юпитера ощущается вне его сферы влияния: за 10⁶ с положение отличается на ${diff.toFixed(0)} км`); }
{ // приливное возмущение: орбита у Земли «дышит» из-за Луны и Солнца, но остаётся устойчивой
  const r = circ(fresh(DEFAULT_DESIGN), EARTH, 400000); let lo = 1e12, hi = 0; for (let t = 0; t < 4e5;) { const h = stepFor(r, 0.5, 20, 0.01); r.step(h, { rotate: 0 }); t += h; const q = orbit(r).pe; lo = Math.min(lo, q); hi = Math.max(hi, q); }
  ok(hi - lo > 1 && hi - lo < 5000, `возмущения Луны и Солнца заметны, но малы: перицентр колеблется на ${(hi - lo).toFixed(0)} м за 4·10⁵ с`); }
{ const r = circ(fresh(DEFAULT_DESIGN), EARTH, 100000), L = 3000, { pts, hit } = predictPath(r, r.physProps, L, 150); let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  ok(pts.length > 100 && Math.abs(len - L) / L < 0.1 && !hit, `путь вперёд: ${pts.length} точек, длина ${len.toFixed(0)} м вместо ${L} м, без удара на круговой орбите`);
  const f = fresh(DEFAULT_DESIGN); circ(f, EARTH, 20000); const [ex, ey] = EARTH.vel(0); f.vx = ex; f.vy = ey; const p2 = predictPath(f, f.physProps, 60000, 200); ok(!!p2.hit, 'путь вперёд помечает удар о поверхность при падении'); }
console.log('перелёты');
{ // Луна: ищем время манёвра, при котором траектория входит в сферу влияния Луны
  const r = circ(fresh(DEFAULT_DESIGN), EARTH, 100000); let best = Infinity;
  for (let T = 0; T < 1e5; T += 300) { const { pts } = predict(r, [{ t: T + 1, pro: 900, rad: 0 }], 2500, 6e5, r.physProps); for (const p of pts) { const [bx, by] = MOON.pos(p.t); best = Math.min(best, Math.hypot(p.x - bx, p.y - by)); } }
  ok(best < MOON.soi, `перелёт к Луне возможен: сближение ${(best / 1000).toFixed(0)} км < SOI ${(MOON.soi / 1000).toFixed(0)} км`); }
{ // уход с Земли на гелиоцентрическую орбиту
  const r = circ(fresh(DEFAULT_DESIGN), EARTH, 100000); const [bx, by] = EARTH.vel(0), v = Math.hypot(r.vx - bx, r.vy - by); r.vx += (r.vx - bx) / v * 1100; r.vy += (r.vy - by) / v * 1100;
  for (let t = 0; t < 4e6 && r.dom !== SUN;) { const h = stepFor(r, 0.5, 3000, 0.02); r.step(h, { rotate: 0 }); t += h; }
  const o = orbit(r); ok(r.dom === SUN && isFinite(o.ap) && o.pe > SUN.R, `+1100 м/с с низкой орбиты выводит на орбиту вокруг Солнца (ап ${(o.ap / 1e9).toFixed(1)}, пе ${(o.pe / 1e9).toFixed(1)} млн км)`); }
{ // Марс: окно запуска открыто в начале игры. Грубый поиск момента манёвра, затем уточнение величины манёвра и времени
  const r = circ(fresh(DEFAULT_DESIGN), EARTH, 100000); let best = Infinity, bT = 0, bDv = 0;
  const probe = (dv, T) => { const { pts } = predict(r, [{ t: T + 1, pro: dv, rad: 0 }], 4000, 4e7, r.physProps, 3e5); let m = Infinity; for (const p of pts) { const [bx, by] = MARS.pos(p.t); m = Math.min(m, Math.hypot(p.x - bx, p.y - by)); } return m; };
  for (const dv of [1050, 1080]) for (let T = 0; T < 1960; T += 80) { const m = probe(dv, T); if (m < best) { best = m; bT = T; bDv = dv; } }
  for (let dv = bDv - 30; dv <= bDv + 30; dv += 10) for (let T = bT - 60; T <= bT + 60; T += 20) { const m = probe(dv, T); if (m < best) { best = m; bDv = dv; } }
  ok(best < MARS.soi, `перелёт к Марсу возможен: сближение ${(best / 1000).toFixed(0)} км < SOI ${(MARS.soi / 1000).toFixed(0)} км (манёвр ≈ +${bDv} м/с)`); }

console.log('посадка, парашют, ступени');
function fall(chute) {
  const r = fresh(DEFAULT_DESIGN); while (r.stage()); r.parts.forEach(p => p.fuel = 0); const [bx, by] = EARTH.pos(0), [vx, vy] = EARTH.vel(0);
  Object.assign(r, { x: bx, y: by + EARTH.R + 6000, vx, vy: vy - 150 }); if (chute) r.deployChute();
  for (let t = 0; t < 600 && r.state === 'flying'; t += 0.02) r.step(0.02, { rotate: 0 }); return r.state;
}
ok(fall(true) === 'landed' && fall(false) === 'crashed', 'парашют спасает посадку, без него — крушение');
for (const [b, th] of [[MOON, 1.0], [EARTH, 0.4], [MARS, 2.2]]) {
  const r = fresh(DEFAULT_DESIGN), t = 100, [bx, by] = b.pos(t), [bvx, bvy] = b.vel(t), fl = b.R + b.terrain(th) + r.refH / 2;
  Object.assign(r, { t, x: bx + (fl + 5) * Math.sin(th), y: by + (fl + 5) * Math.cos(th), vx: bvx, vy: bvy, angle: th });
  for (let i = 0; i < 6000 && r.state === 'flying'; i++) r.step(0.02, { rotate: 0 });
  const [nx, ny] = b.pos(r.t), d = Math.hypot(r.x - nx, r.y - ny), fl2 = b.R + b.terrain(Math.atan2(r.x - nx, r.y - ny)) + r.refH / 2;
  ok(r.state === 'landed' && Math.abs(d - fl2) < 1e-4 && Math.abs(fl2 - fl) < 2, `посадка на склон «${b.name}» (θ=${th}): ракета стоит на рельефе (${r.state})`);
}
{ // после отделения ступени габариты пересчитываются: модуль не «парит» над грунтом
  const r = fresh(DEFAULT_DESIGN), h0 = r.refH, shape = r.parts.filter(p => p.stage === 0).map(p => [p.x, p.y]); const [bx, by] = EARTH.pos(0), [vx, vy] = EARTH.vel(0);
  Object.assign(r, { x: bx, y: by + EARTH.R + h0 / 2 + 400, vx, vy }); const top0 = [r.x + Math.sin(r.angle) * 0, r.y + h0 / 2 - r.parts.find(p => p.stage === 0).y];
  r.stage(); ok(r.refH < h0 - 20 && Math.abs((r.y + r.refH / 2 - r.parts[0].y) - top0[1]) < 1e-6, `после отделения высота ${h0.toFixed(1)} → ${r.refH.toFixed(1)} м, верх ракеты остался на месте`);
  for (let i = 0; i < 9000 && r.state === 'flying'; i++) r.step(0.01, { rotate: 0 }); const [nx, ny] = EARTH.pos(r.t), d = Math.hypot(r.x - nx, r.y - ny);
  ok(r.state !== 'flying' && Math.abs(d - (EARTH.R + EARTH.terrain(Math.atan2(r.x - nx, r.y - ny)) + r.refH / 2)) < 1e-4, `модуль после отделения касается грунта опорами (${r.state})`); }
{ const r = fresh(TEMPLATES[2].design), n0 = r.parts.length, d1 = r.stage(), d2 = r.stage(); ok(d1.every(isBooster) && d1.length === 2 && !d2.some(isBooster) && r.parts.length < n0 - 2, 'Пробел: сначала бустеры, потом ступень'); }

console.log('топливо по ступеням');
{ const r = new Rocket(structuredClone(DEFAULT_DESIGN)); r.throttle = 1; const tanks = st => r.parts.filter(p => p.stage === st && p.def.kind === 'tank'), sum = a => a.reduce((x, p) => x + p.fuel, 0);
  const up0 = sum(tanks(0)), low0 = sum(tanks(1)); for (let i = 0; i < 1500; i++) r.step(0.02, { rotate: 0 });
  ok(sum(tanks(0)) === up0 && sum(tanks(1)) < low0, `пока нижняя ступень не отделена, расходуется только её топливо (верхняя ${up0} → ${sum(tanks(0))} кг, нижняя ${low0.toFixed(0)} → ${sum(tanks(1)).toFixed(0)} кг)`);
  r.parts.filter(p => p.stage === 1).forEach(p => p.fuel = 0); r.step(0.02, { rotate: 0 }); ok(r.throttle === 0 && r.stageFuel === 0 && r.stageNo === 1, 'когда топливо ступени кончилось, двигатели глохнут, хотя в верхней ступени топливо есть');
  const th = r.twr; ok(th === 0, 'пустая ступень не даёт тяги'); r.stage(); r.throttle = 1; const f0 = sum(tanks(0)); for (let i = 0; i < 100; i++) r.step(0.02, { rotate: 0 });
  ok(r.stageNo === 0 && sum(tanks(0)) < f0, 'после отделения работает двигатель верхней ступени на её топливе'); }
{ const r = fresh({ stack: ['pod', 'tankL', 'dec', 'engH'], side: [] }); const [bx, by] = EARTH.pos(0); r.throttle = 1; for (let i = 0; i < 50; i++) r.step(0.02, { rotate: 0 });
  ok(r.stageFuel === 0 && r.throttle === 0, 'двигатель без топлива в своей ступени не работает (бак выше разделителя ему не доступен)'); }
console.log('двигатели');
{ const mk = () => fresh({ stack: ['pod', 'tankS', 'engV'], side: [] }); const a = mk(); a.x = EARTH.pos(0)[0]; a.y = EARTH.pos(0)[1] + EARTH.R + 20; const b = circ(mk(), EARTH, 100000);
  ok(a.press > 0.99 && b.press === 0, 'давление: у поверхности ≈ 1, в космосе 0'); }
console.log(fails.length ? `\nПРОВАЛЕНО: ${fails.length}` : '\nВСЕ ПРОВЕРКИ ПРОЙДЕНЫ'); process.exit(fails.length ? 1 : 0);

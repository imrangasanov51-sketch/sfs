import { dominant, table, SUN } from './world.js';

// Интегрируем в системе доминирующего тела (центр — тело): устойчивые орбиты вокруг движущихся тел. На аппарат действуют:
// притяжение центрального тела, сопротивление его атмосферы и ГРАВИТАЦИЯ ВСЕХ БЛИЗКИХ ТЕЛ — Солнца, родителя, спутников и планет —
// в виде прямого притяжения минус притяжение самого центрального тела (приливный член). Поэтому Луна притягивает и за пределами своей сферы влияния,
// а Юпитер возмущает полёты по Солнечной системе. Положения возмущающих тел берутся на середине шага.
const PX = new Float64Array(24), PY = new Float64Array(24), PR3 = new Float64Array(24);
let AX = 0, AY = 0;
function acc(b, n, mu, x, y, vx, vy, mass, cd, area, fx, fy) {
  const r2 = x * x + y * y, r = Math.sqrt(r2), g = b.mu / r2; let ax = -g * x / r, ay = -g * y / r;
  if (b.atm) { const h = r - b.R; if (h < b.atm.h) { const f = 0.5 * b.atm.rho0 * Math.exp(-Math.max(0, h) / b.atm.scaleH) * Math.hypot(vx, vy) * cd * area / mass; ax -= f * vx; ay -= f * vy; } }
  for (let j = 0; j < n; j++) { const dx = PX[j] - x, dy = PY[j] - y, d2 = dx * dx + dy * dy, d3 = d2 * Math.sqrt(d2); ax += mu[j] * (dx / d3 - PX[j] / PR3[j]); ay += mu[j] * (dy / d3 - PY[j] / PR3[j]); }
  AX = ax + fx / mass; AY = ay + fy / mass;
}
// Один шаг RK4 для s = {x, y, vx, vy, t} (абсолютные координаты). Возвращает доминирующее тело.
export function advance(s, dt, mass, cd, area, fx = 0, fy = 0) {
  // Записи таблицы тел переиспользуются по кругу, поэтому нужные числа копируются сразу — ссылки на запись не держим
  const b = dominant(s.x, s.y, s.t), i = b.idx, k = b.pertIdx, n = k.length, mu = b.pertMu;
  const e0 = table(s.t), ox = e0.x[i], oy = e0.y[i], ovx = e0.vx[i], ovy = e0.vy[i];
  const em = table(s.t + dt / 2), mx = em.x[i], my = em.y[i];
  for (let j = 0; j < n; j++) { const rx = em.x[k[j]] - mx, ry = em.y[k[j]] - my, r2 = rx * rx + ry * ry; PX[j] = rx; PY[j] = ry; PR3[j] = r2 * Math.sqrt(r2); }
  const e2 = table(s.t + dt), nx0 = e2.x[i], ny0 = e2.y[i], nvx0 = e2.vx[i], nvy0 = e2.vy[i];
  const x = s.x - ox, y = s.y - oy, vx = s.vx - ovx, vy = s.vy - ovy, h = dt / 2;
  acc(b, n, mu, x, y, vx, vy, mass, cd, area, fx, fy); const a1x = AX, a1y = AY;
  const v2x = vx + a1x * h, v2y = vy + a1y * h; acc(b, n, mu, x + vx * h, y + vy * h, v2x, v2y, mass, cd, area, fx, fy); const a2x = AX, a2y = AY;
  const v3x = vx + a2x * h, v3y = vy + a2y * h; acc(b, n, mu, x + v2x * h, y + v2y * h, v3x, v3y, mass, cd, area, fx, fy); const a3x = AX, a3y = AY;
  const v4x = vx + a3x * dt, v4y = vy + a3y * dt; acc(b, n, mu, x + v3x * dt, y + v3y * dt, v4x, v4y, mass, cd, area, fx, fy);
  s.x = x + dt / 6 * (vx + 2 * v2x + 2 * v3x + v4x) + nx0; s.y = y + dt / 6 * (vy + 2 * v2y + 2 * v3y + v4y) + ny0;
  s.vx = vx + dt / 6 * (a1x + 2 * a2x + 2 * a3x + AX) + nvx0; s.vy = vy + dt / 6 * (a1y + 2 * a2y + 2 * a3y + AY) + nvy0; s.t += dt;
  return b;
}
export const rk4 = advance;

// Адаптивный шаг: доля «времени падения» до ближайшего значимого тела (текущего, родителя и его спутников)
export function stepFor(s, lo, hi, k = 0.03) {
  const d = dominant(s.x, s.y, s.t), e = table(s.t); let m = Infinity;
  // масштаб времени: либо «расстояние / скорость», либо динамическое время тела √(d³/μ) — у почти неподвижного аппарата оно не даёт шагу стать огромным
  const test = c => { const d = Math.hypot(s.x - e.x[c.idx], s.y - e.y[c.idx]); m = Math.min(m, d / Math.max(1, Math.hypot(s.vx - e.vx[c.idx], s.vy - e.vy[c.idx])), Math.sqrt(d * d * d / c.mu)); };
  test(d); if (d.parent) test(d.parent); for (const c of d.children) test(c);
  return Math.min(hi, Math.max(lo, k * m));
}

function applyNode(s, n) {
  const b = dominant(s.x, s.y, s.t), [bx, by] = b.pos(s.t), [bvx, bvy] = b.vel(s.t);
  const rx = s.x - bx, ry = s.y - by, r = Math.hypot(rx, ry), vx = s.vx - bvx, vy = s.vy - bvy, v = Math.hypot(vx, vy) || 1;
  s.vx += n.pro * vx / v + n.rad * rx / r; s.vy += n.pro * vy / v + n.rad * ry / r;
}

// Прогноз траектории с учётом манёвр-узлов. Возвращает точки и индексы точек-узлов.
export function predict(s0, nodes, maxSteps, maxT, p, hi = 600) {
  const s = { x: s0.x, y: s0.y, vx: s0.vx, vy: s0.vy, t: s0.t }, pts = [{ ...s }], marks = [];
  const ns = nodes.filter(n => n.t > s.t).sort((a, b) => a.t - b.t); let ni = 0;
  for (let i = 0; i < maxSteps && s.t - s0.t < maxT; i++) {
    let dt = stepFor(s, 0.5, hi), b;
    if (ni < ns.length && s.t + dt >= ns[ni].t) {
      dt = ns[ni].t - s.t; if (dt > 1e-6) advance(s, dt, p.mass, p.cd, p.area);
      applyNode(s, ns[ni++]); marks.push(pts.length); pts.push({ ...s }); continue;
    }
    b = advance(s, dt, p.mass, p.cd, p.area); pts.push({ ...s });
    const e = table(s.t); if (Math.hypot(s.x - e.x[b.idx], s.y - e.y[b.idx]) < b.R) break;
  }
  return { pts, marks };
}

// Время ближайшей апсиды относительно доминирующего тела: 'ap' — апоцентр, 'pe' — перицентр
export function apsisTime(s, p, kind) {
  const { pts } = predict(s, [], 5000, 5e9, p, 1e5);
  let prev = null;
  for (const q of pts) {
    const b = dominant(q.x, q.y, q.t), [bx, by] = b.pos(q.t), [bvx, bvy] = b.vel(q.t);
    const d = (q.x - bx) * (q.vx - bvx) + (q.y - by) * (q.vy - bvy);
    if (prev && (kind === 'ap' && prev.d > 0 && d <= 0 || kind === 'pe' && prev.d < 0 && d >= 0)) { const f = prev.d / (prev.d - d); return prev.t + f * (q.t - prev.t); }
    prev = { d, t: q.t };
  }
  return null;
}

// Параметры орбиты относительно доминирующего тела
export function orbit(s) {
  const b = dominant(s.x, s.y, s.t), [bx, by] = b.pos(s.t), [bvx, bvy] = b.vel(s.t), mu = b.mu;
  const x = s.x - bx, y = s.y - by, vx = s.vx - bvx, vy = s.vy - bvy, r = Math.hypot(x, y);
  const en = (vx * vx + vy * vy) / 2 - mu / r, h = x * vy - y * vx, e = Math.sqrt(Math.max(0, 1 + 2 * en * h * h / (mu * mu)));
  if (en >= 0) return { body: b, ap: Infinity, pe: h * h / mu / (1 + e) - b.R, e, period: Infinity };
  const a = -mu / (2 * en);
  return { body: b, ap: a * (1 + e) - b.R, pe: a * (1 - e) - b.R, e, period: 2 * Math.PI * Math.sqrt(a ** 3 / mu) };
}

// Путь вперёд для сцены полёта (без тяги): точки в системе отсчёта, которая движется вместе с доминирующим телом и привязана к аппарату.
// L — длина пути в метрах, maxSteps — число отрезков. Шаг выбирается так, чтобы отрезки были примерно равной длины (линия не «плывёт»).
export function predictPath(s0, p, L, maxSteps) {
  const s = { x: s0.x, y: s0.y, vx: s0.vx, vy: s0.vy, t: s0.t }, dom = dominant(s.x, s.y, s.t), i = dom.idx, e0 = table(s.t), ox = e0.x[i], oy = e0.y[i], vx0 = e0.vx[i], vy0 = e0.vy[i];
  const frame = () => { const e = table(s.t); return [s.x - (e.x[i] - ox), s.y - (e.y[i] - oy)]; }, pts = [frame()], seg = L / maxSteps; let dist = 0, hit = null;
  for (let n = 0; n < maxSteps * 3 && dist < L; n++) {
    const e = table(s.t), v = Math.hypot(s.vx - e.vx[i], s.vy - e.vy[i]);
    const dt = Math.min(seg / Math.max(v, 0.5), stepFor(s, 0.01, 300, 0.03)); advance(s, Math.max(dt, 0.005), p.mass, p.cd, p.area);
    const q = frame(), last = pts[pts.length - 1]; if (!Number.isFinite(q[0]) || !Number.isFinite(q[1])) break; dist += Math.hypot(q[0] - last[0], q[1] - last[1]); pts.push(q);
    const e2 = table(s.t), dx = s.x - e2.x[i], dy = s.y - e2.y[i];
    if (Math.hypot(dx, dy) < dom.R + dom.terrain(Math.atan2(dx, dy))) { hit = q; break; }
  }
  return { pts, hit };
}

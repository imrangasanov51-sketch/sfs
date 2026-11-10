// Солнечная система в масштабе игры: радиусы и расстояния реальных тел умножены на 600/6371 (Земля = 600 км).
// Тела движутся «на рельсах» по круговым орбитам (по часовой стрелке); у каждого есть сфера влияния (SOI).
const F = 600 / 6371, AU = 1.496e11 * F;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// Рельеф: высота над «уровнем моря» как функция угла θ; возле θ = 0 — ровная площадка (место старта/посадки).
function terrainFn(R, rough, seed) {
  const k = [126, 419, 1508], a = [7.5e-4, 2e-4, 5e-5], L = k.map((kk, i) => [a[i] * R * rough, kk, seed + i * 2.1 + 0.4]);
  return th => L.reduce((h, [amp, kk, ph]) => h + amp * Math.sin(kk * th + ph), 0) * smooth(0.0015, 0.006, Math.abs(th));
}
export const BODIES = [];
function make(o) {
  const b = { name: o.name, key: o.key, kind: o.kind, R: o.R, mu: o.g * o.R * o.R, color: o.color, atm: o.atm || null, sky: o.sky || null, ring: !!o.ring,
    parent: o.parent || null, children: [], a: o.a || 0, phase: o.phase || 0, idx: BODIES.length, pi: o.parent ? o.parent.idx : -1, terrain: o.flat ? () => 0 : terrainFn(o.R, o.rough || 1, o.seed || 1) };
  if (!b.parent) { b.w = 0; b.soi = Infinity; }
  else { b.w = Math.sqrt(b.parent.mu / b.a ** 3); b.soi = b.a * (b.mu / b.parent.mu) ** 0.4; b.parent.children.push(b); }
  b.pos = t => { const e = table(t); return [e.x[b.idx], e.y[b.idx]]; };
  b.vel = t => { const e = table(t); return [e.vx[b.idx], e.vy[b.idx]]; };
  BODIES.push(b); return b;
}
// Положения и скорости ВСЕХ тел на момент t считаются за один проход (родители стоят в списке раньше детей).
// Хранятся последние 6 моментов: в одном шаге интегратора нужны t, середина и конец шага.
let ring = null, ri = 0;
export function table(t) {
  if (!ring) { const n = BODIES.length; ring = Array.from({ length: 6 }, () => ({ t: NaN, x: new Float64Array(n), y: new Float64Array(n), vx: new Float64Array(n), vy: new Float64Array(n) })); }
  for (let k = 0; k < 6; k++) if (ring[k].t === t) return ring[k];
  const e = ring[ri]; ri = (ri + 1) % 6; e.t = t;
  for (let i = 0; i < BODIES.length; i++) {
    const b = BODIES[i]; if (b.pi < 0) { e.x[i] = e.y[i] = e.vx[i] = e.vy[i] = 0; continue; }
    const sn = Math.sin(b.w * t + b.phase), cs = Math.cos(b.w * t + b.phase), p = b.pi, v = b.a * b.w;
    e.x[i] = e.x[p] + b.a * sn; e.y[i] = e.y[p] + b.a * cs; e.vx[i] = e.vx[p] + v * cs; e.vy[i] = e.vy[p] - v * sn;
  }
  return e;
}
const AIR = (h, rho0, scaleH) => ({ h, rho0, scaleH });
export const SUN = make({ key: 'sun', name: 'Солнце', kind: 'star', R: 696340e3 * F, g: 274, color: '#ffcc55', flat: true });
export const MERCURY = make({ key: 'mercury', name: 'Меркурий', kind: 'planet', R: 2.44e6 * F, g: 3.7, parent: SUN, a: 0.387 * AU, phase: 0.5, color: '#8c847a', rough: 1.6, seed: 2 });
export const VENUS = make({ key: 'venus', name: 'Венера', kind: 'planet', R: 6.052e6 * F, g: 8.87, parent: SUN, a: 0.723 * AU, phase: 2.0, color: '#d9b46a', atm: AIR(40000, 30, 6000), sky: { zen: [170, 140, 80], hor: [232, 205, 140] }, seed: 3 });
export const EARTH = make({ key: 'earth', name: 'Земля', kind: 'planet', R: 600000, g: 9.8, parent: SUN, a: AU, phase: 1.0 - Math.PI, color: '#2f7d3a', atm: AIR(30000, 1.2, 7000), sky: { zen: [58, 118, 214], hor: [165, 208, 248] }, seed: 1.3 });
export const MOON = make({ key: 'moon', name: 'Луна', kind: 'moon', R: 1.737e6 * F, g: 1.62, parent: EARTH, a: 3.844e8 * F, phase: 1.2, color: '#9a9a9a', rough: 1.8, seed: 4 });
export const MARS = make({ key: 'mars', name: 'Марс', kind: 'planet', R: 3.39e6 * F, g: 3.71, parent: SUN, a: 1.524 * AU, phase: 1.0 - Math.PI + 0.77, color: '#c1440e', atm: AIR(20000, 0.02, 9000), sky: { zen: [150, 108, 78], hor: [214, 164, 112] }, rough: 1.4, seed: 5 });
export const JUPITER = make({ key: 'jupiter', name: 'Юпитер', kind: 'planet', R: 69.911e6 * F, g: 24.79, parent: SUN, a: 5.203 * AU, phase: 4.2, color: '#c9a37a', atm: AIR(150000, 3, 20000), sky: { zen: [150, 110, 80], hor: [220, 190, 150] }, flat: true });
export const IO = make({ key: 'io', name: 'Ио', kind: 'moon', R: 1.822e6 * F, g: 1.8, parent: JUPITER, a: 4.217e8 * F, phase: 0.3, color: '#d8c050', rough: 1.5, seed: 6 });
export const EUROPA = make({ key: 'europa', name: 'Европа', kind: 'moon', R: 1.561e6 * F, g: 1.31, parent: JUPITER, a: 6.711e8 * F, phase: 2.5, color: '#d8ccb4', rough: 0.6, seed: 7 });
export const GANYMEDE = make({ key: 'ganymede', name: 'Ганимед', kind: 'moon', R: 2.634e6 * F, g: 1.43, parent: JUPITER, a: 1.0704e9 * F, phase: 4.4, color: '#96877a', rough: 1.3, seed: 8 });
export const SATURN = make({ key: 'saturn', name: 'Сатурн', kind: 'planet', R: 58.232e6 * F, g: 10.44, parent: SUN, a: 9.537 * AU, phase: 1.1, color: '#d8c08a', atm: AIR(150000, 3, 20000), sky: { zen: [160, 130, 90], hor: [225, 200, 150] }, flat: true, ring: true });
export const TITAN = make({ key: 'titan', name: 'Титан', kind: 'moon', R: 2.575e6 * F, g: 1.35, parent: SATURN, a: 1.2219e9 * F, phase: 3.0, color: '#d29a42', atm: AIR(50000, 1.5, 18000), sky: { zen: [150, 100, 40], hor: [212, 152, 72] }, seed: 9 });
export const URANUS = make({ key: 'uranus', name: 'Уран', kind: 'planet', R: 25.362e6 * F, g: 8.87, parent: SUN, a: 19.19 * AU, phase: 5.5, color: '#a6e0e6', atm: AIR(150000, 3, 20000), flat: true });
export const NEPTUNE = make({ key: 'neptune', name: 'Нептун', kind: 'planet', R: 24.622e6 * F, g: 11.15, parent: SUN, a: 30.07 * AU, phase: 2.9, color: '#3d5fd0', atm: AIR(150000, 3, 20000), flat: true });
export const PLANETS = BODIES.filter(b => b.kind === 'planet');

export { AU };
// Для каждого тела — набор тел, чьё притяжение учитывается как возмущение: предки (вплоть до Солнца) и дети (спутники; у Солнца — планеты)
for (const b of BODIES) { const set = []; for (let a = b.parent; a; a = a.parent) set.push(a); for (const c of b.children) set.push(c); b.pertIdx = Int32Array.from(set.map(k => k.idx)); b.pertMu = Float64Array.from(set.map(k => k.mu)); }

let cx = NaN, cy = NaN, ct = NaN, cres = SUN;
// Доминирующее тело — самое глубокое в иерархии, в чьей сфере влияния находится точка (спуск от Солнца вниз по детям)
export function dominant(x, y, t) {
  if (x === cx && y === cy && t === ct) return cres;
  const e = table(t); let cur = SUN;
  for (;;) { let nx = null; for (const c of cur.children) if (Math.hypot(x - e.x[c.idx], y - e.y[c.idx]) < c.soi) { nx = c; break; } if (!nx) break; cur = nx; }
  cx = x; cy = y; ct = t; cres = cur; return cur;
}
// Единичный вектор на Солнце и расстояние до него
export function toSun(x, y, t) { const [sx, sy] = SUN.pos(t), dx = sx - x, dy = sy - y, d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d, d]; }

import { WARP, MAX_TURN_RATE } from './config.js';
import { EARTH, BODIES } from './world.js';
import { Rocket } from './rocket.js';
import { Input } from './input.js';
import { Renderer, loadAssets } from './render.js';
import { Vab } from './vab.js';
import { problems } from './parts.js';
import { stepFor, rk4, orbit } from './physics.js';
import { Particles } from './particles.js';
import { Missions } from './missions.js';
import { createUi } from './ui.js';
import { Sound } from './sound.js';

const canvas = document.getElementById('c'), sound = new Sound(), missions = new Missions();
const game = {
  mode: 'vab', rocket: null, design: null, zoom: 4, zoomT: 4, mapZoomT: null, mapOff: [0, 0], dt: 0.016, warpIdx: 0, curWarp: 1, map: false, ref: EARTH, mapZoom: null, nodes: [], msg: '',
  particles: new Particles(), debris: [], paused: false, sas: 'off', holdAngle: 0, warpTo: null, toast: null, helpOpen: false, menuOpen: true, sound, missions,
  get warp() { return WARP[this.warpIdx]; },
  launch(design) {
    Object.assign(this, { design: structuredClone(design), zoom: 4, zoomT: 4, mapZoomT: null, mapOff: [0, 0], warpIdx: 0, curWarp: 1, map: false, ref: EARTH, mapZoom: null, nodes: [], msg: '', mode: 'flight', debris: [], particles: new Particles(), paused: false, sas: 'off', warpTo: null });
    this.rocket = new Rocket(this.design); missions.reset(); vab.show(false);
  },
  stage() { // отделение ступени: отброшенные детали летят отдельно
    const r = this.rocket; if (!r) return;
    if (r.landedOn && r.state !== 'crashed') { this.msg = 'Отделение ступени на поверхности невозможно'; return; }
    const refH0 = r.refH, x0 = r.x, y0 = r.y, d = r.stage(); if (!d) return;
    const up = [Math.sin(r.angle), Math.cos(r.angle)];
    this.debris.push({ parts: d, refH: refH0, x: x0, y: y0, vx: r.vx - up[0] * 2.5, vy: r.vy - up[1] * 2.5, t: r.t, angle: r.angle, angVel: (Math.random() - 0.5) * 0.6, mass: d.reduce((m, p) => m + p.def.dry + p.fuel, 0) || 1, age: 0 });
    r.vx += up[0] * 0.5; r.vy += up[1] * 0.5; if (this.debris.length > 8) this.debris.shift();
    for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28, sp = 3 + Math.random() * 14; this.particles.add({ x: r.x, y: r.y, vx: r.vx + Math.cos(a) * sp, vy: r.vy + Math.sin(a) * sp, life: 0.5 + Math.random(), size: 0.8, kind: 'fire' }); }
    sound.clunk();
  },
  toVab() { this.mode = 'vab'; this.paused = false; vab.show(true); },
  resume() { if (!this.rocket) return; this.mode = 'flight'; this.paused = false; vab.show(false); },
  cycleSas() { const o = ['off', 'hold', 'pro', 'retro', 'asc']; this.sas = o[(o.indexOf(this.sas) + 1) % o.length]; this.holdAngle = this.rocket.angle; },
  warpToNode() { // автоматически ускорить время до момента за минуту до узла
    const n = this.nodes[0]; if (!n) { this.msg = 'Сначала создайте узел (1 или 2 на карте)'; return; }
    if (n.t - this.rocket.t < 65) { this.msg = 'До узла меньше минуты'; return; }
    this.warpTo = n.t - 60; this.msg = '';
  },
};
loadAssets();
const renderer = new Renderer(canvas), vab = new Vab(canvas, d => game.launch(d), game), input = new Input(canvas, game);
window.__game = game; window.__vab = vab; window.__problems = problems;

// ---- меню, пауза, справка (src/ui.js)
const ui = createUi(game, { missions, hasFlight: () => !!game.rocket, toVab: () => game.toVab(), resume: () => game.resume() });
game.toVab();
addEventListener('keydown', e => {
  sound.init();
  if (e.code === 'Escape') { e.preventDefault(); ui.escape(); }
  else if (e.code === 'KeyH' && !game.menuOpen) ui.showHelp(!game.helpOpen);
});
addEventListener('pointerdown', () => sound.init());

// ---- ошибки не должны останавливать игру
function showErr(msg) {
  (window.__errors = window.__errors || []).push(String(msg));
  let d = document.getElementById('err'); if (!d) { d = document.createElement('div'); d.id = 'err'; document.body.appendChild(d); }
  d.textContent = 'Ошибка: ' + msg + ' (R — заново, B — ангар)';
}
addEventListener('error', e => showErr(e.message));

function burst(r, n, power) {
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, sp = 4 + Math.random() * power; game.particles.add({ x: r.x, y: r.y, vx: r.vx + Math.cos(a) * sp, vy: r.vy + Math.sin(a) * sp, life: 0.8 + Math.random() * 2, size: 1.5 + Math.random() * 3, kind: Math.random() < 0.55 ? 'fire' : 'smoke' }); }
}
function stepDebris(total) {
  game.debris = game.debris.filter(d => {
    const n = Math.min(500, Math.max(1, Math.ceil(total / stepFor(d, 0.02, 5)))), h = total / n;
    for (let i = 0; i < n; i++) rk4(d, h, d.mass, 0.4, 4);
    d.angle += d.angVel * total; d.age += total;
    const hit = BODIES.some(b => { const [bx, by] = b.pos(d.t); return Math.hypot(d.x - bx, d.y - by) < b.R; });
    if (hit) burst(d, 25, 25);
    return !hit && d.age < 300;
  });
}
function emit(r, total) {
  if (r.state === 'crashed' || game.map || game.zoom * r.refH < 16) return; // ракета-маркер: струи не рисуем
  const up = [Math.sin(r.angle), Math.cos(r.angle)], rt = [Math.cos(r.angle), -Math.sin(r.angle)];
  const count = Math.min(6, Math.ceil(total * 90 * r.throttle)), b = r.dom, [bvx, bvy] = b.vel(r.t), air = b.atm && r.alt < b.atm.h, pr = r.press;
  // в атмосфере выхлоп тормозится воздухом (остаётся «на месте» относительно планеты), в вакууме летит по инерции вместе с ракетой
  const baseX = bvx + (r.vx - bvx) * (1 - pr), baseY = bvy + (r.vy - bvy) * (1 - pr);
  if (r.throttle > 0 && r.fuelTotal > 0) for (const p of r.activeEngines) {
    const lx = p.x, ly = p.y - r.refH / 2 + p.def.h / 2, nx = r.x + rt[0] * lx - up[0] * ly, ny = r.y + rt[1] * lx - up[1] * ly;
    for (let i = 0; i < count; i++) {
      const sp = 60 + Math.random() * 80, j = (Math.random() - 0.5) * p.def.w * 0.5, sj = () => (Math.random() - 0.5) * 6;
      game.particles.add({ x: nx + rt[0] * j, y: ny + rt[1] * j, vx: baseX - up[0] * sp + sj(), vy: baseY - up[1] * sp + sj(), life: 0.3 + Math.random() * 0.5, size: p.def.w * 0.18, kind: 'fire' });
      if (air && Math.random() < 0.5) game.particles.add({ x: nx, y: ny, vx: bvx - up[0] * 25 + sj() * 2, vy: bvy - up[1] * 25 + sj() * 2, life: 2.5 + Math.random() * 3, size: p.def.w * 0.25, kind: 'smoke' });
    }
    if (r.agl < 70 && (b.atm || r.agl < 40)) { // пыль от струи у поверхности: скорость — грунта, цвет — грунта
      const [bx, by] = b.pos(r.t), th = Math.atan2(r.x - bx, r.y - by), rr = b.R + b.terrain(th), gx = bx + rr * Math.sin(th), gy = by + rr * Math.cos(th), tg = [Math.cos(th), -Math.sin(th)];
      const c0 = [parseInt(b.color.slice(1, 3), 16), parseInt(b.color.slice(3, 5), 16), parseInt(b.color.slice(5, 7), 16)], col = b === EARTH ? [150, 126, 92] : [c0[0] * 0.7 + 50, c0[1] * 0.7 + 45, c0[2] * 0.7 + 40];
      for (let i = 0; i < count * 2; i++) { const d = Math.random() < 0.5 ? -1 : 1, v = 8 + Math.random() * 38 * (1 - r.agl / 70); game.particles.add({ x: gx + (Math.random() - 0.5) * 6, y: gy + (Math.random() - 0.5) * 2, vx: bvx + tg[0] * d * v + (Math.random() - 0.5) * 3, vy: bvy + tg[1] * d * v + Math.random() * 3, life: 1.5 + Math.random() * 2, size: 1.5 + Math.random() * 3.5, kind: 'dust', col }); }
    }
  }
  if (r.turn) for (const p of r.parts) { // струи двигателей ориентации
    if (p.def.kind !== 'rcs') continue; const sg = Math.sign(p.x), nx = r.x + rt[0] * p.x - up[0] * (p.y - r.refH / 2), ny = r.y + rt[1] * p.x - up[1] * (p.y - r.refH / 2), top = r.turn * sg > 0 ? -1 : 1;
    for (let i = 0; i < 2; i++) game.particles.add({ x: nx, y: ny, vx: r.vx + rt[0] * sg * 6 + up[0] * top * 9, vy: r.vy + rt[1] * sg * 6 + up[1] * top * 9, life: 0.35, size: 0.3, kind: 'gas' });
  }
}
// SAS: удержание курса / по скорости / против скорости / автоподъём. Команда учитывает, как быстро ракета способна повернуться (масса!)
function rotateCommand(r) {
  if (input.rotate) { if (game.sas === 'hold') game.holdAngle = r.angle; return input.rotate; }
  if (game.sas === 'off' || r.state === 'crashed' || r.landedOn) return 0;
  let target = game.holdAngle;
  if (game.sas === 'pro' || game.sas === 'retro') {
    const [vx, vy] = r.dom.vel(r.t), rx = r.vx - vx, ry = r.vy - vy;
    target = Math.hypot(rx, ry) > 1 ? Math.atan2(rx, ry) + (game.sas === 'retro' ? Math.PI : 0) : r.angle;
  } else if (game.sas === 'asc') { // автоподъём: плавный разворот к горизонту на востоке до ~60 км
    const [bx, by] = r.dom.pos(r.t), loc = Math.atan2(r.x - bx, r.y - by);
    target = loc + Math.min(1, Math.max(0, (r.alt - 1000) / 60000)) * Math.PI / 2 * 0.97;
  }
  const err = Math.atan2(Math.sin(target - r.angle), Math.cos(target - r.angle)), a = Math.max(1e-6, r.alpha);
  const rate = Math.sign(err) * Math.min(MAX_TURN_RATE, Math.sqrt(2 * a * 0.6 * Math.abs(err)), 2.5 * Math.abs(err)); // торможение заранее: тяжёлая ракета не раскачивается
  return Math.max(-1, Math.min(1, rate / MAX_TURN_RATE));
}
function simulate(r, dt) {
  input.update(r, dt);
  const slow = r.throttle > 0 || (r.lowWarp && !r.landedOn); // у поверхности и под тягой время ускорять нельзя
  let warp = slow ? Math.min(game.warp, 4) : game.warp;
  if (game.warpTo != null) {
    const left = game.warpTo - r.t;
    if (left <= 0.5 || r.throttle > 0) game.warpTo = null; else warp = slow ? 4 : Math.min(WARP[WARP.length - 1], left / Math.max(dt, 0.001));
  }
  const hmax = slow ? 0.02 : stepFor(r, 0.02, 3000, 0.01);
  warp = Math.min(warp, 2000 * hmax / Math.max(dt, 1e-3)); game.curWarp = warp; // не больше 2000 шагов интегратора за кадр
  const total = dt * warp, n = Math.min(2000, Math.max(1, Math.ceil(total / hmax))), h = total / n, prev = r.state, rot = rotateCommand(r);
  for (let i = 0; i < n; i++) r.step(h, { rotate: rot });
  if (prev !== 'crashed' && r.state === 'crashed') { burst(r, 160, 60); sound.boom(); }
  stepDebris(total); game.particles.update(total); emit(r, total);
  const b = r.dom; sound.engine(r.fuelTotal > 0 ? r.throttle : 0, b.atm ? Math.exp(-Math.max(0, r.alt) / b.atm.scaleH) : 0);
  for (const m of missions.check(r, orbit(r))) game.toast = { text: m.name, until: performance.now() + 5000 };
}

let last = performance.now();
function frame(now) {
  try {
    const dt = Math.min(0.1, (now - last) / 1000); last = now; game.dt = dt;
    if (game.mode === 'flight') { const k = Math.min(1, dt * 9), r = game.rocket; let tz = game.zoomT;
      if (!game.map && r.state === 'flying') { // авто-масштаб при посадке: земля остаётся в кадре
        const b = r.dom, [bx, by] = b.pos(r.t), [bvx, bvy] = b.vel(r.t), ux = r.x - bx, uy = r.y - by, ul = Math.hypot(ux, uy) || 1, agl = r.agl;
        if (agl < 3000 && ((r.vx - bvx) * ux + (r.vy - bvy) * uy) / ul < 0) tz = Math.min(tz, (window.innerHeight * 0.4) / (Math.max(agl, 0) + r.refH * 0.5 + 15));
      }
      game.zoom *= Math.pow(tz / game.zoom, k); if (game.mapZoom && game.mapZoomT) game.mapZoom *= Math.pow(game.mapZoomT / game.mapZoom, k); }
    if (game.mode === 'vab') { vab.draw(); sound.engine(0, 0); }
    else { if (!game.paused && !game.helpOpen) simulate(game.rocket, dt); renderer.draw(game); }
  } catch (e) { showErr(e && e.message || e); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

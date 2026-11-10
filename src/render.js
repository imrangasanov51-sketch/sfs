import { BODIES, SUN, EARTH, dominant, toSun } from './world.js';
import { predict, predictPath, orbit } from './physics.js';
import { drawParts, drawMarker } from './draw.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const fmt = v => !isFinite(v) ? '∞' : Math.abs(v) < 0.5 ? '0 м' : Math.abs(v) >= 1e10 ? (v / 1e9).toFixed(1) + ' млн км' : Math.abs(v) >= 1e7 ? (v / 1e6).toFixed(1) + ' тыс. км' : Math.abs(v) >= 1e4 ? (v / 1000).toFixed(1) + ' км' : v.toFixed(0) + ' м';
const fmtT = s => { const n = s < 0 ? '−' : '', a = Math.abs(s), y = Math.floor(a / 31557600), d = Math.floor(a % 31557600 / 86400), h = Math.floor(a % 86400 / 3600), m = Math.floor(a % 3600 / 60);
  return n + (y ? y + 'г ' : '') + (y || d ? d + 'д ' : '') + (d || h ? h + 'ч ' : '') + m + 'м ' + Math.floor(a % 60) + 'с'; };
const SANS = '"Segoe UI","Helvetica Neue",Arial,sans-serif', MONO = 'ui-monospace,"Cascadia Mono",Consolas,"DejaVu Sans Mono",monospace', COND = '"Bahnschrift","Arial Narrow","Roboto Condensed",Arial,sans-serif';
const ACC = '#e8742a', LINE = '#2a3038', MUTED = '#7f8893', TXT = '#d9dde2';
const SAS = { off: 'выкл', hold: 'удержание', pro: 'по скорости', retro: 'против скорости', asc: 'автоподъём' };

// ---- текстуры планет (файлы assets/planets/*.png, сгенерированы tools/make_assets.py)
const IMG = {};
export function loadAssets() {
  if (typeof Image === 'undefined') return;
  for (const b of BODIES) { const im = new Image(); im.src = `assets/planets/${b.key}.png`; IMG[b.key] = im; }
}
const ready = im => !!im && im.complete && im.naturalWidth > 0;

export class Renderer {
  constructor(canvas) {
    this.c = canvas; this.g = canvas.getContext('2d'); this.velDir = null;
    this.stars = Array.from({ length: 380 }, () => [Math.random(), Math.random(), Math.random(), Math.floor(Math.random() * 4)]);
    this.resize(); addEventListener('resize', () => this.resize());
  }
  resize() {
    const dpr = Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
    this.dpr = dpr; this.W = innerWidth; this.H = innerHeight;
    this.c.width = Math.round(this.W * dpr); this.c.height = Math.round(this.H * dpr);
    Object.assign(this.c, { logicalW: this.W, logicalH: this.H, dpr }); this.buildStars();
  }
  buildStars() { // фон из звёзд рисуется один раз; каждый кадр — только drawImage и мерцание нескольких звёзд
    const cv = document.createElement('canvas'); cv.width = this.c.width; cv.height = this.c.height; const g = cv.getContext('2d'), T = [[255, 255, 255], [190, 210, 255], [255, 236, 200], [255, 210, 190]]; g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (const s of this.stars) { const c = T[s[3]]; g.fillStyle = css(c, 0.35 + 0.65 * s[2]); g.fillRect(s[0] * this.W, s[1] * this.H, s[2] * 1.6 + 0.8, s[2] * 1.6 + 0.8); } this.starCv = cv;
  }
  draw(game) {
    this.g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (game.map) this.map(game); else this.flight(game);
    this.hud(game);
  }
  line(pts, sx, sy, color, w = 2) {
    const g = this.g; if (pts.length < 2) return;
    g.strokeStyle = color; g.lineWidth = w; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(sx(p[0]), sy(p[1])) : g.moveTo(sx(p[0]), sy(p[1]))); g.stroke();
  }

  // Диск небесного тела: текстура + терминатор (день/ночь) + атмосферный ободок. (sdx, sdy) — направление на Солнце на экране.
  disc(b, cx, cy, rad, sdx, sdy) {
    const g = this.g; if (rad < 1.3) { g.fillStyle = b.color; g.beginPath(); g.arc(cx, cy, 1.6, 0, 7); g.fill(); return; }
    if (b.atm && b.sky && rad > 4) { const ro = rad * (1 + Math.max(b.atm.h / b.R * 2.4, 0.04)), hg = g.createRadialGradient(cx, cy, rad * 0.98, cx, cy, ro); hg.addColorStop(0, css(b.sky.hor, 0.55)); hg.addColorStop(1, css(b.sky.hor, 0)); g.fillStyle = hg; g.beginPath(); g.arc(cx, cy, ro, 0, 7); g.fill(); }
    if (b.ring) this.ring(cx, cy, rad, false);
    const im = IMG[b.key];
    if (ready(im) && rad < 5000) { g.save(); g.beginPath(); g.arc(cx, cy, rad, 0, 7); g.clip(); g.drawImage(im, cx - rad, cy - rad, rad * 2, rad * 2); g.restore(); }
    else { const pg = g.createRadialGradient(cx, cy, rad * 0.1, cx, cy, rad); const c = hex(b.color); pg.addColorStop(0, css(mix(c, [255, 255, 255], 0.15))); pg.addColorStop(1, css(mix(c, [0, 0, 0], 0.45))); g.fillStyle = pg; g.beginPath(); g.arc(cx, cy, rad, 0, 7); g.fill(); }
    if (b !== SUN && rad > 2 && rad < 5000) {
      const sg = g.createLinearGradient(cx + sdx * rad, cy + sdy * rad, cx - sdx * rad, cy - sdy * rad);
      sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(0.46, 'rgba(0,0,0,0.05)'); sg.addColorStop(0.62, 'rgba(0,0,6,0.62)'); sg.addColorStop(1, 'rgba(0,0,8,0.9)');
      g.save(); g.beginPath(); g.arc(cx, cy, rad, 0, 7); g.clip(); g.fillStyle = sg; g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); g.restore();
    }
    if (b.ring) this.ring(cx, cy, rad, true);
    if (b === SUN) { const gl = g.createRadialGradient(cx, cy, rad * 0.9, cx, cy, rad * 2.6); gl.addColorStop(0, 'rgba(255,214,120,.55)'); gl.addColorStop(1, 'rgba(255,170,60,0)'); g.fillStyle = gl; g.beginPath(); g.arc(cx, cy, rad * 2.6, 0, 7); g.fill(); }
  }
  ring(cx, cy, rad, front) { // кольца Сатурна
    const g = this.g, ri = rad * 1.25, ro = rad * 2.25;
    g.save(); g.translate(cx, cy); g.rotate(-0.3);
    if (front) { g.beginPath(); g.rect(-ro * 1.1, 0, ro * 2.2, ro); g.clip(); }
    g.beginPath(); g.ellipse(0, 0, ro, ro * 0.26, 0, 0, 7); g.ellipse(0, 0, ri, ri * 0.26, 0, 0, 7, true);
    const gr = g.createLinearGradient(-ro, 0, ro, 0); gr.addColorStop(0, 'rgba(210,190,150,.0)'); gr.addColorStop(0.18, 'rgba(226,206,160,.85)'); gr.addColorStop(0.5, 'rgba(180,160,120,.7)'); gr.addColorStop(0.82, 'rgba(226,206,160,.85)'); gr.addColorStop(1, 'rgba(210,190,150,0)');
    g.fillStyle = gr; g.fill('evenodd'); g.restore();
  }

  flight(game) {
    const { g } = this, r = game.rocket, z = game.zoom, W = this.W, H = this.H, dom = r.dom, now = performance.now() / 1000, dt = game.dt || 0.016;
    const sx = x => W / 2 + (x - r.x) * z, sy = y => H / 2 - (y - r.y) * z, sR = z; // ракета всегда в истинном масштабе
    const [tsx, tsy] = toSun(r.x, r.y, r.t), [bx0, by0] = dom.pos(r.t), ux = r.x - bx0, uy = r.y - by0, ul = Math.hypot(ux, uy) || 1;
    const elev = (ux * tsx + uy * tsy) / ul, day = smooth(-0.14, 0.2, elev);

    // ---- небо: плавно меняется с высотой, положением Солнца (день/закат/ночь) и составом атмосферы
    let space = 1, top = [1, 2, 8], bot = [2, 3, 10], air = 0;
    if (dom.atm && dom.sky) {
      air = Math.exp(-Math.max(0, r.alt) / (dom.atm.scaleH * 3.2)); space = Math.max(clamp(1 - air, 0, 1), smooth(dom.atm.h * 1.5, dom.atm.h * 6, H / z));
      const zen = mix([3, 5, 16], dom.sky.zen, day); let hor = mix([8, 12, 30], dom.sky.hor, day);
      hor = mix(hor, [255, 128, 64], clamp(1 - Math.abs(elev) / 0.24, 0, 1) * 0.85 * air);
      top = mix(zen, [1, 2, 8], space); bot = mix(hor, [2, 3, 10], space);
    }
    const sky = g.createLinearGradient(W / 2 + ux / ul * H * 0.6, H / 2 - uy / ul * H * 0.6, W / 2 - ux / ul * H * 0.6, H / 2 + uy / ul * H * 0.6);
    sky.addColorStop(0, css(top)); sky.addColorStop(1, css(bot)); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const starA = clamp(Math.pow(clamp((space - 0.4) / 0.6, 0, 1), 1.4) + (1 - day) * air * 0.95, 0, 1), TINT = [[255, 255, 255], [190, 210, 255], [255, 236, 200], [255, 210, 190]];
    if (starA > 0.02) { g.globalAlpha = starA; g.drawImage(this.starCv, 0, 0, W, H); for (let i = 0; i < 60; i++) { const st = this.stars[i], c = TINT[st[3]]; g.fillStyle = css(c, starA * 0.9 * (0.5 + 0.5 * Math.sin(now * (1 + st[2] * 2.5) + i))); g.fillRect(st[0] * W, st[1] * H, st[2] * 1.6 + 1.2, st[2] * 1.6 + 1.2); } g.globalAlpha = 1; }
    // Солнце: яркое ядро и тёплое гало (складываются со светом неба)
    const sunA = Math.max(space, smooth(-0.08, 0.05, elev)); if (sunA > 0.02) {
      const L = 0.4 * Math.min(W, H), px = W / 2 + tsx * L, py = H / 2 - tsy * L, prev = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter';
      const halo = g.createRadialGradient(px, py, 0, px, py, 260); halo.addColorStop(0, css([255, 214, 140], 0.55 * sunA)); halo.addColorStop(0.25, css([255, 170, 80], 0.18 * sunA)); halo.addColorStop(1, css([255, 150, 60], 0));
      g.fillStyle = halo; g.fillRect(px - 260, py - 260, 520, 520);
      const core = g.createRadialGradient(px, py, 0, px, py, 34); core.addColorStop(0, css([255, 255, 250], sunA)); core.addColorStop(0.35, css([255, 246, 200], 0.9 * sunA)); core.addColorStop(1, css([255, 220, 140], 0));
      g.fillStyle = core; g.fillRect(px - 34, py - 34, 68, 68); g.globalCompositeOperation = prev;
    }

    // ---- небесные тела
    for (const b of BODIES) {
      if (b === SUN) continue;
      const [bx, by] = b.pos(r.t), cx = sx(bx), cy = sy(by), rad = b.R * z, far = Math.hypot(cx - W / 2, cy - H / 2) - rad * 2.7;
      if (far > Math.hypot(W, H)) continue;
      const [stx, sty] = toSun(bx, by, r.t), half = Math.max(W, H) * 1.1 / rad, terr = b === dom && half < 0.25;
      if (!terr) { this.disc(b, cx, cy, rad, stx, -sty); continue; }
      // вблизи поверхности рисуем рельеф
      if (b.atm && b.sky && space > 0.03) { const ro = rad + b.atm.h * z * 2.2, hg = g.createRadialGradient(cx, cy, rad, cx, cy, ro); hg.addColorStop(0, css(b.sky.hor, 0.6 * space * (0.3 + 0.7 * day))); hg.addColorStop(1, css(b.sky.hor, 0)); g.fillStyle = hg; g.beginPath(); g.arc(cx, cy, ro, 0, 7); g.fill(); } // тонкий слой атмосферы над горизонтом
      const th0 = Math.atan2(r.x - bx, r.y - by), N = 160, gc = mix(hex(b.color), [0, 0, 0], 0.7 - 0.7 * (0.3 + 0.7 * day) * 1); const col = mix(hex(b.color), [0, 0, 0], 1 - (0.32 + 0.68 * day));
      g.beginPath();
      for (let i = 0; i <= N; i++) { const th = th0 - half + 2 * half * i / N, rr = b.R + b.terrain(th), px = sx(bx + rr * Math.sin(th)), py = sy(by + rr * Math.cos(th)); i ? g.lineTo(px, py) : g.moveTo(px, py); }
      for (const th of [th0 + half, th0 - half]) g.lineTo(sx(bx + b.R * 0.9 * Math.sin(th)), sy(by + b.R * 0.9 * Math.cos(th)));
      g.closePath(); const gd0 = [sx(bx + (b.R) * Math.sin(th0)), sy(by + (b.R) * Math.cos(th0))]; const gg2 = g.createLinearGradient(gd0[0], gd0[1], gd0[0] - ux / ul * H * 0.8, gd0[1] + uy / ul * H * 0.8); gg2.addColorStop(0, css(mix(col, [255, 255, 255], 0.12))); gg2.addColorStop(1, css(mix(col, [0, 0, 0], 0.45))); g.fillStyle = gg2; g.fill(); g.strokeStyle = css(mix(col, [255, 255, 255], 0.22)); g.lineWidth = Math.max(2, z * 0.45); g.stroke();
      if (z > 0.35) { // камни на поверхности (детерминированно от угла)
        g.fillStyle = css(mix(col, [0, 0, 0], 0.4));
        for (let i = 0; i < 70; i++) { const th = th0 - half + 2 * half * ((i * 0.6180339 + Math.floor(th0 * 40) * 0.37) % 1), rr = b.R + b.terrain(th), q = (Math.sin(th * 9301 + 7) + 1) / 2;
          g.beginPath(); g.ellipse(sx(bx + rr * Math.sin(th)), sy(by + rr * Math.cos(th)), (0.5 + 2.8 * q) * z, (0.3 + 1.2 * q) * z, th, 0, 7); g.fill(); }
      }
      if (b === EARTH && z > 0.3) { const pxp = sx(bx), pyp = sy(by + EARTH.R); g.save(); g.translate(pxp, pyp); g.fillStyle = '#4a5260'; g.fillRect(-9 * z, 0, 18 * z, 1.4 * z); g.fillStyle = '#c9a227'; g.fillRect(-9 * z, 0, 18 * z, 0.25 * z); g.fillStyle = '#6b7482'; g.fillRect(-9 * z, 0, 1.2 * z, 0.9 * z); g.fillRect(7.8 * z, 0, 1.2 * z, 0.9 * z); g.restore(); }
      // тень ракеты на грунте
      const agl = r.agl; if (agl < 220) { const th = Math.atan2(r.x - bx, r.y - by), rr = b.R + b.terrain(th); g.save(); g.translate(sx(bx + rr * Math.sin(th)), sy(by + rr * Math.cos(th))); g.rotate(th);
        g.fillStyle = `rgba(0,0,0,${0.38 * (1 - agl / 220) * (0.3 + 0.7 * day)})`; g.beginPath(); g.ellipse(0, 0, r.width * 0.9 * z + 4, (0.25 + r.refH * 0.01) * z + 1.5, 0, 0, 7); g.fill(); g.restore(); }
    }

    // ---- прогноз траектории
    this.path(r, sx, sy, z, W, H);
    for (const d of game.debris) {
      const x = sx(d.x), y = sy(d.y); if (x < -300 || x > W + 300 || y < -300 || y > H + 300) continue;
      if (d.refH * z < 16) drawMarker(g, x, y, d.angle, 5, '#aab2bb'); else { g.save(); g.translate(x, y); g.rotate(d.angle); drawParts(g, d.parts, d.refH, sR, 0, 0, { light: 0, dim: 0.1, legK: 1, press: 0, lod: z < 2.2 }); g.restore(); }
    }
    game.particles.draw(g, sx, sy, z);
    const heat = this.heat(r);
    if (heat > 0.02) { const [vx, vy] = dom.vel(r.t), rx = r.vx - vx, ry = r.vy - vy, v = Math.hypot(rx, ry) || 1, gx = W / 2 + rx / v * 25, gy = H / 2 - ry / v * 25;
      const hg = g.createRadialGradient(gx, gy, 5, gx, gy, 90 + 120 * heat); hg.addColorStop(0, `rgba(255,190,90,${0.8 * heat})`); hg.addColorStop(1, 'rgba(255,80,20,0)'); g.fillStyle = hg; g.fillRect(0, 0, W, H); }

    // ---- ракета: освещение от Солнца, тень планеты
    const rx = Math.cos(r.angle), ry = -Math.sin(r.angle), light = clamp(rx * tsx + ry * tsy, -1, 1), proj = ux * tsx + uy * tsy;
    let shadow = 0; if (proj < 0) { const perp = Math.sqrt(Math.max(0, ul * ul - proj * proj)); shadow = smooth(dom.R * 1.015, dom.R * 0.985, perp); }
    const dim = Math.max(shadow, (1 - day) * (1 - space) * 0.8);
    if (r.refH * z < 16) { // слишком мала для рисунка — белый треугольник, как в оригинале
      if (r.throttle > 0 && r.stageFuel > 0) { const dx = -Math.sin(r.angle), dy = Math.cos(r.angle); g.strokeStyle = '#ffb040'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(W / 2 + dx * 8, H / 2 + dy * 8); g.lineTo(W / 2 + dx * (10 + 10 * r.throttle), H / 2 + dy * (10 + 10 * r.throttle)); g.stroke(); }
      drawMarker(g, W / 2, H / 2, r.angle, 9);
    } else { g.save(); g.translate(W / 2, H / 2); g.rotate(r.angle);
      drawParts(g, r.parts, r.refH, sR, r.throttle > 0 && r.stageFuel > 0 ? r.throttle : 0, r.chuteK, { light, dim, legK: r.legK, solarK: r.solarK, turn: r.turn, press: r.press, t: now, lod: z < 2.2 }); g.restore(); }
    this.vectors(game, r, dt, W, H);
  }
  heat(r) {
    const b = r.dom; if (!b.atm || r.alt > b.atm.h) return 0;
    return clamp((b.atm.rho0 * Math.exp(-Math.max(0, r.alt) / b.atm.scaleH) * r.speed ** 3 - 5e7) / 3e8, 0, 1);
  }
  // Голубая линия — путь вперёд без тяги: только то, что ещё впереди, с затуханием по длине, стрелками направления и меткой удара о поверхность
  path(r, sx, sy, z, W, H) {
    if (r.state !== 'flying' || r.speed < 1) return;
    const g = this.g, L = 1.7 * Math.max(W, H) / z, { pts, hit } = predictPath(r, r.physProps, L, 150), n = pts.length; if (n < 3) return;
    const P = pts.map(p => [sx(p[0]), sy(p[1])]); g.lineWidth = 2; g.lineCap = 'round';
    for (let i = 0; i < n - 1; i += 8) { const a = Math.pow(1 - i / n, 1.4) * 0.9; g.strokeStyle = `rgba(90,185,255,${a})`; g.beginPath(); g.moveTo(P[i][0], P[i][1]); for (let j = i + 1; j <= Math.min(i + 8, n - 1); j++) g.lineTo(P[j][0], P[j][1]); g.stroke(); }
    let acc = 0, next = 70; // стрелки направления через каждые ~110 px
    for (let i = 1; i < n; i++) { const dx = P[i][0] - P[i - 1][0], dy = P[i][1] - P[i - 1][1], d = Math.hypot(dx, dy); acc += d;
      if (acc >= next && d > 0) { next += 110; const a = Math.atan2(dy, dx), al = Math.pow(1 - i / n, 1.2) * 0.95; g.fillStyle = `rgba(120,200,255,${al})`; g.save(); g.translate(P[i][0], P[i][1]); g.rotate(a); g.beginPath(); g.moveTo(6, 0); g.lineTo(-4, -4.5); g.lineTo(-4, 4.5); g.closePath(); g.fill(); g.restore(); } }
    g.lineCap = 'butt';
    if (hit) { const x = sx(hit[0]), y = sy(hit[1]); g.strokeStyle = '#e0645f'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 8, 0, 7); g.moveTo(x - 5, y - 5); g.lineTo(x + 5, y + 5); g.moveTo(x + 5, y - 5); g.lineTo(x - 5, y + 5); g.stroke(); this.caps('удар', x + 12, y + 4, '#e0645f', 10); }
  }
  // Маркеры направления полёта (прогрейд/ретроград) вокруг ракеты. Направление сглаживается, чтобы маркер не дёргался.
  vectors(game, r, dt, W, H) {
    const g = this.g, b = r.dom, [bvx, bvy] = b.vel(r.t), rx = r.vx - bvx, ry = r.vy - bvy, v = Math.hypot(rx, ry);
    if (v < 2 || r.state === 'landed') { this.velDir = null; return; }
    const d = [rx / v, -ry / v]; if (!this.velDir) this.velDir = d; else { const k = 1 - Math.exp(-dt * 10); this.velDir = [this.velDir[0] + (d[0] - this.velDir[0]) * k, this.velDir[1] + (d[1] - this.velDir[1]) * k]; }
    let m = Math.hypot(this.velDir[0], this.velDir[1]) || 1; const ux = this.velDir[0] / m, uy = this.velDir[1] / m, R = clamp(r.refH / 2 * game.zoom + 44, 64, Math.min(W, H) * 0.42), cx = W / 2, cy = H / 2;
    g.save(); g.lineWidth = 2;
    const px = cx + ux * R, py = cy + uy * R; // прогрейд
    g.strokeStyle = 'rgba(120,230,150,.9)'; g.fillStyle = 'rgba(120,230,150,.9)'; g.beginPath(); g.arc(px, py, 9, 0, 7); g.stroke(); g.beginPath(); g.arc(px, py, 2.2, 0, 7); g.fill();
    for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { g.beginPath(); g.moveTo(px + Math.cos(a) * 9, py + Math.sin(a) * 9); g.lineTo(px + Math.cos(a) * 15, py + Math.sin(a) * 15); g.stroke(); }
    g.beginPath(); g.moveTo(cx + ux * (R - 34), cy + uy * (R - 34)); g.lineTo(px - ux * 16, py - uy * 16); g.stroke();
    const qx = cx - ux * R, qy = cy - uy * R; // ретроград
    g.strokeStyle = 'rgba(255,200,90,.85)'; g.beginPath(); g.arc(qx, qy, 9, 0, 7); g.stroke(); g.beginPath(); g.moveTo(qx - 5, qy - 5); g.lineTo(qx + 5, qy + 5); g.moveTo(qx + 5, qy - 5); g.lineTo(qx - 5, qy + 5); g.stroke();
    g.fillStyle = 'rgba(190,255,205,.95)'; g.font = '12px system-ui, sans-serif'; g.fillText(`${v.toFixed(0)} м/с`, px + 14, py - 12);
    g.restore();
  }

  map(game) {
    const { g } = this, r = game.rocket, W = this.W, H = this.H, ref = game.ref, t0 = r.t, [rx, ry] = ref.pos(t0), off = game.mapOff || [0, 0];
    if (!game.mapZoom) { game.mapZoom = (H / 2) / (ref.children.length ? Math.max(...ref.children.map(b => b.a)) * 1.2 : isFinite(ref.soi) ? ref.soi * 1.4 : ref.R * 4); game.mapZoomT = game.mapZoom; game.mapOff = [0, 0]; }
    const z = game.mapZoom, cxw = rx + off[0], cyw = ry + off[1], sx = x => W / 2 + (x - cxw) * z, sy = y => H / 2 - (y - cyw) * z, diag = Math.hypot(W, H);
    const bg = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, diag * 0.6); bg.addColorStop(0, '#0a1020'); bg.addColorStop(1, '#03050a'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.55; g.drawImage(this.starCv, 0, 0, W, H); g.globalAlpha = 1;
    // орбиты и сферы влияния
    for (const b of BODIES) {
      if (!b.parent) continue; const [px, py] = b.parent.pos(t0), ox = sx(px), oy = sy(py), orad = b.a * z;
      if (orad > 3 && orad < diag * 60 && Math.abs(Math.hypot(ox - W / 2, oy - H / 2) - orad) < diag * 0.75) { g.strokeStyle = b.parent === ref ? 'rgba(130,160,210,.45)' : 'rgba(90,110,150,.28)'; g.lineWidth = 1; g.beginPath(); g.arc(ox, oy, orad, 0, 7); g.stroke(); }
      const [bx, by] = b.pos(t0), srad = b.soi * z; if (srad > 8 && srad < diag * 3) { g.setLineDash([5, 6]); g.strokeStyle = 'rgba(120,150,200,.3)'; g.beginPath(); g.arc(sx(bx), sy(by), srad, 0, 7); g.stroke(); g.setLineDash([]); }
    }
    for (const b of BODIES) {
      const [bx, by] = b.pos(t0), cx = sx(bx), cy = sy(by), rad = Math.max(b.R * z, b === SUN ? 6 : 3.5);
      if (cx < -200 || cx > W + 200 || cy < -200 || cy > H + 200) continue;
      const [stx, sty] = toSun(bx, by, t0); this.disc(b, cx, cy, rad, stx, -sty);
      if (b === ref || b.kind === 'star' || (b.parent && (b.parent === ref || b.a * z > 16))) { g.fillStyle = b === ref ? '#ffffff' : '#9fb0c4'; g.font = (b === ref ? 'bold ' : '') + '13px system-ui, sans-serif'; g.fillText(b.name, cx + rad + 5, cy + 4); }
    }
    // траектория: до узла — синяя, после — оранжевая
    // прогноз дорогой (до 8000 шагов): пересчитываем раз в несколько кадров или при смене узлов, начало траектории привязано к аппарату
    const nk = game.nodes.map(n => `${n.t.toFixed(1)}|${n.pro.toFixed(1)}|${n.rad.toFixed(1)}`).join(';'); this.fr = (this.fr || 0) + 1; const pc = this.pc;
    const orb = orbit(r), horizon = !game.nodes.length && isFinite(orb.period) && orb.pe > 0 ? orb.period * 1.08 : 5e9; // замкнутая орбита рисуется один раз, а не десятки оборотов
    if (!pc || pc.nk !== nk || this.fr - pc.fr >= (r.throttle > 0 ? 2 : 6) || r.t < pc.t0 || r.state !== pc.state || pc.rk !== r) this.pc = { ...predict(r, game.nodes, 8000, horizon, r.physProps, 3e5), nk, fr: this.fr, t0: r.t, state: r.state, rk: r };
    let k = 0; while (k < this.pc.pts.length - 2 && this.pc.pts[k + 1].t <= r.t) k++;
    const pts = [{ x: r.x, y: r.y, vx: r.vx, vy: r.vy, t: r.t }, ...this.pc.pts.slice(k + 1)], marks = this.pc.marks.filter(j => j > k).map(j => j - k);
    const tr = pts.map(p => { const d = ref.pos(p.t); return [p.x - (d[0] - rx), p.y - (d[1] - ry)]; });
    const cut = marks.length ? marks[0] : tr.length;
    this.line(tr.slice(0, cut + 1), sx, sy, 'rgba(90,190,255,.95)', 2.2); if (marks.length) { g.setLineDash([8, 5]); this.line(tr.slice(cut), sx, sy, 'rgba(255,170,60,.95)', 2.2); g.setLineDash([]); }
    { let acc = 0, next = 90; for (let i = 1; i < tr.length; i++) { const x1 = sx(tr[i][0]), y1 = sy(tr[i][1]), x0 = sx(tr[i - 1][0]), y0 = sy(tr[i - 1][1]), d = Math.hypot(x1 - x0, y1 - y0); acc += d; if (acc >= next && d > 0 && x1 > -20 && x1 < W + 20 && y1 > -20 && y1 < H + 20) { next += 160; g.fillStyle = i > cut ? 'rgba(255,170,60,.95)' : 'rgba(110,200,255,.95)'; g.save(); g.translate(x1, y1); g.rotate(Math.atan2(y1 - y0, x1 - x0)); g.beginPath(); g.moveTo(7, 0); g.lineTo(-4, -5); g.lineTo(-4, 5); g.closePath(); g.fill(); g.restore(); } } }
    for (const i of marks) { g.fillStyle = '#ffaa33'; g.beginPath(); g.arc(sx(tr[i][0]), sy(tr[i][1]), 6, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke(); }
    let ap = -1, pe = -1, prev = null;
    for (let i = 0; i < pts.length && (ap < 0 || pe < 0); i++) {
      const q = pts[i], b = dominant(q.x, q.y, q.t), [bx, by] = b.pos(q.t), [vx, vy] = b.vel(q.t), d = (q.x - bx) * (q.vx - vx) + (q.y - by) * (q.vy - vy);
      if (prev !== null) { if (ap < 0 && prev > 0 && d <= 0) ap = i; if (pe < 0 && prev < 0 && d >= 0) pe = i; } prev = d;
    }
    g.font = 'bold 13px system-ui, sans-serif';
    for (const [i, label, col] of [[ap, 'Ап', '#7fd1ff'], [pe, 'Пе', '#ffd36b']]) if (i >= 0 && Math.hypot(sx(tr[i][0]) - sx(rx), sy(tr[i][1]) - sy(ry)) > 18) { g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.arc(sx(tr[i][0]), sy(tr[i][1]), 6, 0, 7); g.stroke(); g.fillStyle = col; g.fillText(label, sx(tr[i][0]) + 9, sy(tr[i][1]) + 4); }
    // аппарат: треугольник по направлению движения
    const a = tr.length > 1 ? Math.atan2(-(tr[1][1] - tr[0][1]), tr[1][0] - tr[0][0]) : 0, mx = sx(r.x), my = sy(r.y);
    g.save(); g.translate(mx, my); g.rotate(a); g.fillStyle = '#fff'; g.strokeStyle = '#0a1020'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(9, 0); g.lineTo(-6, -5.5); g.lineTo(-3, 0); g.lineTo(-6, 5.5); g.closePath(); g.fill(); g.stroke(); g.restore();
  }

  panel(x, y, w, h, accent) { // плоская панель с тонкой рамкой и цветной меткой слева
    const g = this.g; g.fillStyle = 'rgba(11,14,18,.9)'; g.fillRect(x, y, w, h); g.strokeStyle = LINE; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    if (accent) { g.fillStyle = accent; g.fillRect(x, y, 3, h); }
  }
  caps(t, x, y, col = MUTED, size = 10) { const g = this.g; g.font = `${size}px ${COND}`; g.fillStyle = col; if ('letterSpacing' in g) g.letterSpacing = '1.4px'; g.fillText(String(t).toUpperCase(), x, y); if ('letterSpacing' in g) g.letterSpacing = '0px'; }
  bar(x, y, w, h, frac, col, label, val) { // вертикальная шкала со штрихами
    const g = this.g, f = clamp(frac, 0, 1); g.fillStyle = 'rgba(11,14,18,.9)'; g.fillRect(x, y, w, h); g.fillStyle = col; g.fillRect(x + 3, y + h - 3 - (h - 6) * f, w - 6, (h - 6) * f);
    g.strokeStyle = 'rgba(217,221,226,.38)'; g.lineWidth = 1; for (let i = 1; i < 10; i++) { const yy = Math.round(y + h * i / 10) + 0.5; g.beginPath(); g.moveTo(x + w - (i % 5 ? 6 : 11), yy); g.lineTo(x + w - 3, yy); g.stroke(); }
    g.strokeStyle = LINE; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    g.textAlign = 'center'; this.caps(label, x + w / 2, y + h + 14, MUTED, 9); g.fillStyle = TXT; g.font = `bold 11px ${MONO}`; g.fillText(val, x + w / 2, y - 6); g.textAlign = 'left';
  }
  navball(r, cx, cy, rad) { // индикатор положения: горизонт, маркеры прогрейда/ретрограда относительно носа
    const g = this.g, b = r.dom, [bx, by] = b.pos(r.t), loc = Math.atan2(r.x - bx, r.y - by), pitch = r.angle - loc;
    g.save(); g.beginPath(); g.arc(cx, cy, rad, 0, 7); g.clip(); g.translate(cx, cy); g.rotate(-pitch);
    g.fillStyle = '#35618f'; g.fillRect(-rad, -rad, rad * 2, rad); g.fillStyle = '#5c4730'; g.fillRect(-rad, 0, rad * 2, rad);
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-rad, 0); g.lineTo(rad, 0); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1; for (let a = 15; a < 360; a += 15) { const t = a * Math.PI / 180, k = a % 45 ? 0.9 : 0.82; g.beginPath(); g.moveTo(Math.sin(t) * rad * k, -Math.cos(t) * rad * k); g.lineTo(Math.sin(t) * rad, -Math.cos(t) * rad); g.stroke(); }
    g.rotate(pitch);
    const [bvx, bvy] = b.vel(r.t), rx = r.vx - bvx, ry = r.vy - bvy, v = Math.hypot(rx, ry);
    if (v > 2) { const psi = Math.atan2(rx, ry) - r.angle, m = (a, retro) => { const px = Math.sin(a) * rad * 0.7, py = -Math.cos(a) * rad * 0.7; g.lineWidth = 2; g.strokeStyle = retro ? '#e3b341' : '#7cc47f'; g.fillStyle = g.strokeStyle; g.beginPath(); g.arc(px, py, 7, 0, 7); g.stroke();
        if (retro) { g.beginPath(); g.moveTo(px - 4, py - 4); g.lineTo(px + 4, py + 4); g.moveTo(px + 4, py - 4); g.lineTo(px - 4, py + 4); g.stroke(); } else { g.beginPath(); g.arc(px, py, 1.8, 0, 7); g.fill(); } };
      m(psi, false); m(psi + Math.PI, true); }
    g.restore();
    g.strokeStyle = '#3a424c'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, rad, 0, 7); g.stroke();
    g.fillStyle = '#d9dde2'; g.strokeStyle = '#0b0e12'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, cy - rad * 0.5); g.lineTo(cx - 9, cy + 4); g.lineTo(cx, cy - 2); g.lineTo(cx + 9, cy + 4); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = ACC; g.beginPath(); g.moveTo(cx, cy - rad - 2); g.lineTo(cx - 5, cy - rad - 10); g.lineTo(cx + 5, cy - rad - 10); g.closePath(); g.fill();
  }
  hud(game) {
    const { g } = this, r = game.rocket, W = this.W, H = this.H, o = orbit(r), dom = o.body, n = game.nodes[0], now = performance.now() / 1000;
    const [bx, by] = dom.pos(r.t), [bvx, bvy] = dom.vel(r.t), ux = r.x - bx, uy = r.y - by, ul = Math.hypot(ux, uy) || 1;
    const rvx = r.vx - bvx, rvy = r.vy - bvy, vv = (rvx * ux + rvy * uy) / ul, vh = Math.sqrt(Math.max(0, rvx * rvx + rvy * rvy - vv * vv)), spd = Math.hypot(rvx, rvy);
    const state = { landed: ['на поверхности', '#7cc47f'], flying: ['в полёте', '#6fb1c9'], crashed: ['разбита · R — заново', '#d9534f'] }[r.state];
    // левая панель: высота, скорость, орбита
    const lh = game.map ? 176 : 160; this.panel(12, 12, 252, lh, state[1]); g.textAlign = 'left';
    this.caps(dom.name, 26, 30, TXT, 11); this.caps(state[0], 118, 30, state[1], 10);
    this.caps('высота', 26, 52); g.fillStyle = TXT; g.font = `bold 21px ${MONO}`; g.fillText(fmt(r.alt), 26, 74);
    if (r.agl < 3000) { g.fillStyle = MUTED; g.font = `11px ${MONO}`; g.fillText(`рельеф ${fmt(r.agl)}`, 150, 74); }
    this.caps('скорость', 26, 96); g.fillStyle = TXT; g.font = `bold 21px ${MONO}`; g.fillText(`${spd.toFixed(spd < 100 ? 1 : 0)} м/с`, 26, 118);
    g.fillStyle = vv < -8 && r.agl < 1500 ? '#e0645f' : MUTED; g.font = `11px ${MONO}`; g.fillText(`в ${vv.toFixed(1)}  г ${vh.toFixed(0)}`, 160, 118);
    g.fillStyle = '#aab2bb'; g.font = `12px ${MONO}`; g.fillText(r.state === 'landed' ? 'орбита —' : `Ап ${fmt(o.ap)}  Пе ${fmt(o.pe)}`, 26, 142);
    if (isFinite(o.period) && o.pe > 0 && r.state !== 'landed') { g.fillStyle = MUTED; g.fillText(`период ${fmtT(o.period)}`, 26, 158); }
    if (game.map) { g.fillStyle = MUTED; g.font = `11px ${MONO}`; g.fillText(`фокус ${game.ref.name} · ${fmt(Math.hypot(r.x - game.ref.pos(r.t)[0], r.y - game.ref.pos(r.t)[1]))}`, 26, 174); }
    // правая панель: параметры аппарата
    const L = [['время', fmtT(r.t)], ['ускорение', `x${Math.round(game.curWarp ?? game.warp)}`], ['Δv осталось', `${r.dvLeft.toFixed(0)} м/с`], ['топливо всего', `${(r.fuelTotal / r.fuel0 * 100).toFixed(0)}%`], ['тяга/вес', r.twr.toFixed(2)], ['ступень', `${r.stageNumber} из ${r.stagesTotal}`], ['след. сброс', r.stageHint], ['поворот', `${(r.alpha * 57.3).toFixed(1)} °/с²`], ['SAS', SAS[game.sas]]];
    if (r.hasSolar) L.push(['панели', r.solarK >= 1 ? 'раскрыты' : r.solarK > 0 ? (r.solarOn ? 'раскрываются' : 'убираются') : 'U — раскрыть']);
    if (r.hasChute) L.push(['парашют', r.chuteLost ? 'оторван' : r.chuteOn ? (r.chuteK >= 1 ? 'раскрыт' : 'раскрывается') : 'P — раскрыть']);
    if (n) L.push(['узел', `${fmtT(n.t - r.t)} · ${Math.hypot(n.pro, n.rad).toFixed(0)} м/с`]);
    const pw = 236, ph = L.length * 19 + 16; this.panel(W - pw - 12, 12, pw, ph, ACC);
    L.forEach(([k, v], i) => { this.caps(k, W - pw + 2, 33 + i * 19, MUTED, 10); g.fillStyle = TXT; g.font = `12px ${MONO}`; g.textAlign = 'right'; g.fillText(v, W - 26, 33 + i * 19); g.textAlign = 'left'; });
    // нижний центр: тяга, индикатор положения, топливо ступени
    const cx = W / 2, cy = H - 128, sf = r.stageFuelMax > 0 ? r.stageFuel / r.stageFuelMax : 0;
    this.bar(cx - 138, cy - 56, 20, 112, r.throttle, ACC, 'тяга', `${(r.throttle * 100).toFixed(0)}%`);
    this.navball(r, cx, cy, 54);
    this.bar(cx + 118, cy - 56, 20, 112, sf, sf > 0.15 ? '#7cc47f' : '#d9534f', 'ступень', `${(sf * 100).toFixed(0)}%`);
    // предупреждения
    const warn = [];
    if (r.stageFuel > 0 && sf < 0.1) warn.push('топливо ступени заканчивается'); else if (r.stageFuel <= 1e-6 && r.stageNo > 0) warn.push('ступень пуста — отделите (пробел)'); else if (r.stageFuel <= 1e-6 && r.fuelTotal <= 0 && r.state === 'flying') warn.push('топливо закончилось');
    if (r.state === 'flying' && vv < -(r.hasLegs ? 12 : 7) && r.agl < 1500) warn.push(`опасная скорость снижения ${(-vv).toFixed(0)} м/с`);
    if (r.state === 'landed' && r.throttle > 0 && r.twr < 1) warn.push('тяги недостаточно для взлёта');
    if (r.state === 'flying' && r.alpha * 57.3 < 0.2 && r.throttle === 0) warn.push('слабый поворот: нужны двигатели ориентации');
    const wy = game.toast && performance.now() < game.toast.until ? 86 : 40;
    warn.forEach((t, i) => { const a = 0.55 + 0.45 * Math.sin(now * 6); g.font = `bold 13px ${COND}`; if ('letterSpacing' in g) g.letterSpacing = '1.2px'; const w = g.measureText(t.toUpperCase()).width + 34; if ('letterSpacing' in g) g.letterSpacing = '0px';
      this.panel(W / 2 - w / 2, wy + i * 36 - 22, w, 28, `rgba(224,100,95,${a})`); g.fillStyle = `rgba(240,150,140,${a})`; g.textAlign = 'center'; this.caps(t, W / 2, wy + i * 36 - 4, `rgba(240,150,140,${a})`, 13); g.textAlign = 'left'; });
    if (game.msg) { g.font = `12px ${SANS}`; const w = g.measureText(game.msg).width + 30; this.panel(W / 2 - w / 2, H - 252, w, 28, ACC); g.fillStyle = TXT; g.textAlign = 'center'; g.fillText(game.msg, W / 2, H - 233); g.textAlign = 'left'; }
    if (game.toast && performance.now() < game.toast.until) { g.font = `bold 16px ${COND}`; const w = Math.max(220, g.measureText(game.toast.text).width + 60); this.panel(W / 2 - w / 2, 14, w, 52, ACC); g.textAlign = 'center'; this.caps('достижение', W / 2, 32, ACC, 10); g.fillStyle = TXT; g.font = `bold 16px ${COND}`; g.fillText(game.toast.text, W / 2, 55); g.textAlign = 'left'; }
    const hint = game.map ? 'M полёт · Tab тело · колесо масштаб · перетаскивание · C центр · 1/2 узел · ↑↓←→ Δv · W к узлу · H справка' : 'Z/X газ · Shift/Ctrl плавно · A/D поворот · Пробел ступень · P парашют · T SAS · M карта · Esc меню';
    g.font = `11px ${MONO}`; const hw = g.measureText(hint).width + 26; this.panel(12, H - 34, Math.min(hw, W - 24), 24, null); g.fillStyle = MUTED; g.fillText(hint, 24, H - 18);
  }
}

// Векторная «спрайтовая» графика деталей: металл с бликом от Солнца, швы, заклёпки, маркировка, сопла, анимация пламени.
// Все размеры задаются в метрах и масштабируются на s пикселей/м, поэтому картинка остаётся чёткой при любом зуме.
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const sh = (c, f) => `rgb(${clamp(c[0] * f, 0, 255) | 0},${clamp(c[1] * f, 0, 255) | 0},${clamp(c[2] * f, 0, 255) | 0})`;
const INK = 'rgba(10,14,22,.85)';
function metal(g, x0, x1, c, O, base = 1) { // горизонтальный градиент «цилиндра»; блик смещается в сторону Солнца
  const k = (1 - O.dim * 0.7) * base, hp = clamp(0.5 + O.light * 0.3, 0.2, 0.8), gr = g.createLinearGradient(x0, 0, x1, 0);
  gr.addColorStop(0, sh(c, 0.48 * k)); gr.addColorStop(Math.max(0.03, hp - 0.3), sh(c, 0.86 * k)); gr.addColorStop(hp, sh(c, 1.2 * k));
  gr.addColorStop(Math.min(0.97, hp + 0.3), sh(c, 0.74 * k)); gr.addColorStop(1, sh(c, 0.4 * k)); return gr;
}
const rr = (g, x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, Math.max(0, r)); else g.rect(x, y, w, h); };

function tank(g, p, x, y, w, h, s, c, O, line) {
  const ACC = { tankN: [150, 150, 170], tankS: [232, 102, 44], tankM: [58, 130, 200], tankL: [214, 160, 28], tankXL: [46, 158, 106], tankW: [180, 70, 70] }[p.id] || [200, 200, 200];
  g.fillStyle = metal(g, x - w / 2, x + w / 2, c, O); rr(g, x - w / 2, y - h / 2, w, h, w * 0.05); g.fill(); g.stroke();
  const cap = Math.min(h * 0.07, 0.45 * s);
  g.fillStyle = 'rgba(0,0,0,.30)'; g.fillRect(x - w / 2, y - h / 2, w, cap); g.fillRect(x - w / 2, y + h / 2 - cap, w, cap);
  g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x - w / 2, y - h / 2 + cap, w, Math.max(0.5, line));
  const sw = Math.max(1, h * 0.07); g.fillStyle = metal(g, x - w / 2, x + w / 2, ACC, O, 0.95);
  g.fillRect(x - w / 2, y - h / 2 + h * 0.22, w, sw); g.fillRect(x - w / 2, y + h / 2 - h * 0.22 - sw, w, sw);
  if (s > 2.5) { g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = Math.max(0.5, line * 0.6); const n = Math.max(1, Math.round(h / (3.2 * s))); for (let i = 1; i < n; i++) { const yy = y - h / 2 + h * i / n; g.beginPath(); g.moveTo(x - w / 2, yy); g.lineTo(x + w / 2, yy); g.stroke(); } }
  if (s > 7) {
    g.fillStyle = 'rgba(255,255,255,.35)'; const rv = Math.max(0.5, s * 0.06);
    for (let i = 0; i < 6; i++) { const rx = x - w / 2 + w * (i + 0.5) / 6; g.beginPath(); g.arc(rx, y - h / 2 + cap * 0.5, rv, 0, 7); g.fill(); g.beginPath(); g.arc(rx, y + h / 2 - cap * 0.5, rv, 0, 7); g.fill(); }
    if (h > 3.5 * s) { g.fillStyle = 'rgba(20,24,32,.7)'; g.font = `bold ${Math.max(5, Math.min(s * 0.7, w * 0.15))}px sans-serif`; g.textAlign = 'center'; g.fillText('ТОПЛИВО', x, y + s * 0.25); g.textAlign = 'left'; }
  }
  g.strokeStyle = INK;
}

function plume(g, cx, cy, ew, s, f, id, O, lb = ew) { // струя выхлопа: форма и цвет зависят от двигателя и давления среды
  const exp = 1 + (1 - O.press) * 0.9, len = lb * (id === 'engI' ? 14 : id === 'engV' ? 8 : id === 'srb' ? 7 : 6.5) * (0.35 + 0.75 * f) * (1 + (1 - O.press) * 0.5) * (0.92 + Math.random() * 0.12), wd = ew * 1.05 * exp * (0.6 + 0.5 * f);
  const pal = id === 'engI' ? [[90, 140, 255], [160, 200, 255], [240, 250, 255]] : id === 'engV' ? [[120, 160, 255], [190, 215, 255], [255, 255, 255]] : id === 'srb' ? [[255, 90, 25], [255, 170, 60], [255, 235, 190]] : [[255, 120, 30], [255, 190, 70], [255, 248, 215]];
  const prev = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const L = len * [1, 0.8, 0.55][i], W2 = wd * [1, 0.68, 0.36][i], col = pal[i], gr = g.createLinearGradient(0, cy, 0, cy + L);
    gr.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${0.95 * f ** 0.4})`); gr.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
    g.fillStyle = gr; g.beginPath(); g.moveTo(cx - W2, cy); g.quadraticCurveTo(cx - W2 * 0.9, cy + L * 0.55, cx, cy + L); g.quadraticCurveTo(cx + W2 * 0.9, cy + L * 0.55, cx + W2, cy); g.closePath(); g.fill();
  }
  g.globalCompositeOperation = prev;
}

function engine(g, p, x, y, w, h, s, c, O, flame, on) {
  const id = p.id, mountH = h * 0.22, bellTop = y - h / 2 + mountH, bellH = h - mountH, exits = [];
  g.fillStyle = metal(g, x - w * 0.36, x + w * 0.36, [90, 94, 102], O); rr(g, x - w * 0.36, y - h / 2, w * 0.72, mountH, 2); g.fill(); g.stroke();
  if (s > 4) { g.fillStyle = sh([160, 165, 175], 0.9 * (1 - O.dim * 0.6)); g.fillRect(x - w * 0.42, y - h / 2 + mountH * 0.25, w * 0.1, mountH * 0.5); g.fillRect(x + w * 0.32, y - h / 2 + mountH * 0.25, w * 0.1, mountH * 0.5); }
  const nozzle = (cx, ww) => {
    const tw = ww * (id === 'engV' ? 0.2 : 0.26), ew = ww * 0.5, ey = bellTop + bellH;
    g.beginPath(); g.moveTo(cx - tw, bellTop); g.bezierCurveTo(cx - tw * 1.1, bellTop + bellH * 0.4, cx - ew * 0.85, bellTop + bellH * 0.75, cx - ew, ey); g.lineTo(cx + ew, ey);
    g.bezierCurveTo(cx + ew * 0.85, bellTop + bellH * 0.75, cx + tw * 1.1, bellTop + bellH * 0.4, cx + tw, bellTop); g.closePath();
    g.fillStyle = metal(g, cx - ew, cx + ew, c, O); g.fill(); g.stroke();
    if (s > 3) { g.strokeStyle = 'rgba(0,0,0,.22)'; for (let i = 1; i <= 4; i++) { const t = i / 5, yy = bellTop + bellH * t, half = tw + (ew - tw) * t ** 1.5; g.beginPath(); g.moveTo(cx - half, yy); g.lineTo(cx + half, yy); g.stroke(); } g.strokeStyle = INK; }
    g.fillStyle = on ? `rgba(255,${150 + 90 * flame | 0},${60 + 120 * flame | 0},${0.55 + 0.4 * flame})` : 'rgba(6,8,12,.9)';
    g.beginPath(); g.ellipse(cx, ey, ew * 0.92, Math.max(1, ew * 0.18), 0, 0, 7); g.fill();
    g.fillStyle = sh([205, 208, 214], 1 - O.dim * 0.6); g.fillRect(cx - ew, ey - Math.max(1, s * 0.12), ew * 2, Math.max(1, s * 0.12));
    exits.push([cx, ey, ew]);
  };
  if (id === 'engH') for (const k of [-1, 0, 1]) nozzle(x + k * w * 0.3, w * 0.42); else nozzle(x, w);
  if (on) for (const [cx, ey, ew] of exits) plume(g, cx, ey, ew, s, flame, id, O, w * 0.5);
}

function pod(g, x, y, w, h, s, c, O) {
  g.beginPath(); g.moveTo(x - w / 2, y + h / 2); g.lineTo(x - w / 2, y - h * 0.08); g.bezierCurveTo(x - w / 2, y - h * 0.62, x - w * 0.18, y - h * 0.98, x, y - h * 0.98);
  g.bezierCurveTo(x + w * 0.18, y - h * 0.98, x + w / 2, y - h * 0.62, x + w / 2, y - h * 0.08); g.lineTo(x + w / 2, y + h / 2); g.closePath();
  g.fillStyle = metal(g, x - w / 2, x + w / 2, c, O); g.fill(); g.stroke();
  g.fillStyle = `rgba(40,34,30,${0.9 - O.dim * 0.2})`; g.fillRect(x - w / 2, y + h / 2 - h * 0.13, w, h * 0.13);
  g.fillStyle = 'rgba(200,60,40,.85)'; g.fillRect(x - w / 2, y + h / 2 - h * 0.27, w, h * 0.06);
  const wr = w * 0.17, wy = y - h * 0.18, wg = g.createRadialGradient(x - wr * 0.3, wy - wr * 0.3, wr * 0.1, x, wy, wr);
  wg.addColorStop(0, '#bfe6ff'); wg.addColorStop(0.6, '#3b82c4'); wg.addColorStop(1, '#14304f');
  g.fillStyle = 'rgb(30,34,44)'; g.beginPath(); g.arc(x, wy, wr * 1.25, 0, 7); g.fill(); g.fillStyle = wg; g.beginPath(); g.arc(x, wy, wr, 0, 7); g.fill();
  if (s > 3) { g.strokeStyle = 'rgba(220,225,235,.9)'; g.beginPath(); g.moveTo(x, y - h * 0.98); g.lineTo(x, y - h * 1.12); g.stroke(); g.strokeStyle = INK; }
}

function dec(g, x, y, w, h, O) {
  g.fillStyle = '#2b2e35'; g.fillRect(x - w / 2, y - h / 2, w, h); g.save(); g.beginPath(); g.rect(x - w / 2, y - h / 2, w, h); g.clip();
  g.fillStyle = `rgba(240,190,40,${0.9 - O.dim * 0.5})`; const st = Math.max(2, h * 1.1);
  for (let i = -2; i < w / st + 2; i++) { const x0 = x - w / 2 + i * st * 2; g.beginPath(); g.moveTo(x0, y + h / 2); g.lineTo(x0 + st, y + h / 2); g.lineTo(x0 + st + h, y - h / 2); g.lineTo(x0 + h, y - h / 2); g.closePath(); g.fill(); }
  g.restore();
}

function srb(g, p, x, y, w, h, s, O, flame, on) {
  const top = y - h / 2, nose = h * 0.13, bot = y + h / 2 - h * 0.07;
  g.fillStyle = metal(g, x - w / 2, x + w / 2, [232, 230, 224], O); g.fillRect(x - w / 2, top + nose, w, bot - top - nose); g.strokeRect(x - w / 2, top + nose, w, bot - top - nose);
  g.beginPath(); g.moveTo(x - w / 2, top + nose); g.quadraticCurveTo(x - w / 2, top + nose * 0.3, x, top); g.quadraticCurveTo(x + w / 2, top + nose * 0.3, x + w / 2, top + nose); g.closePath();
  g.fillStyle = metal(g, x - w / 2, x + w / 2, [190, 60, 48], O); g.fill(); g.stroke();
  g.fillStyle = metal(g, x - w / 2, x + w / 2, [200, 60, 50], O, 0.95); g.fillRect(x - w / 2, top + h * 0.3, w, h * 0.05); g.fillRect(x - w / 2, top + h * 0.62, w, h * 0.05);
  const nw = w * 0.8; g.beginPath(); g.moveTo(x - w * 0.3, bot); g.lineTo(x + w * 0.3, bot); g.lineTo(x + nw / 2, y + h / 2); g.lineTo(x - nw / 2, y + h / 2); g.closePath(); g.fillStyle = metal(g, x - nw / 2, x + nw / 2, [96, 98, 104], O); g.fill(); g.stroke();
  if (on) plume(g, x, y + h / 2, nw / 2, s, flame, 'srb', O, w * 0.9);
}

function leg(g, p, x, y, w, h, s, O) {
  const d = Math.sign(p.x) || 1, e = O.legK, hx = x - d * 0.3 * s, fx = x + d * (0.1 + 1.7 * e) * s, fy = y + h * 0.5 * (0.7 + 0.3 * e);
  g.lineCap = 'round'; g.strokeStyle = sh([150, 158, 170], 1 - O.dim * 0.6); g.lineWidth = Math.max(1, 0.16 * s);
  g.beginPath(); g.moveTo(hx, y - h * 0.4); g.lineTo(fx, fy); g.stroke();
  g.strokeStyle = sh([110, 116, 126], 1 - O.dim * 0.6); g.lineWidth = Math.max(0.8, 0.1 * s); g.beginPath(); g.moveTo(hx, y + h * 0.2); g.lineTo(hx + (fx - hx) * 0.55, y - h * 0.4 + (fy - y + h * 0.4) * 0.55); g.stroke();
  g.fillStyle = sh([180, 186, 196], 1 - O.dim * 0.6); g.beginPath(); g.ellipse(fx, fy, 0.38 * s, 0.1 * s + 0.5, 0, 0, 7); g.fill(); g.lineCap = 'butt'; g.strokeStyle = INK;
}

function rcs(g, p, x, y, w, h, s, O) {
  const d = Math.sign(p.x) || 1;
  g.fillStyle = metal(g, x - w / 2, x + w / 2, [170, 178, 190], O); rr(g, x - w / 2, y - h / 2, w, h, w * 0.25); g.fill(); g.stroke();
  for (const k of [-1, 1]) { const ny = y + k * h * 0.3, nx = x + d * w / 2; g.fillStyle = '#30343c'; g.beginPath(); g.moveTo(nx, ny - h * 0.08); g.lineTo(nx + d * w * 0.35, ny - h * 0.16); g.lineTo(nx + d * w * 0.35, ny + h * 0.16); g.lineTo(nx, ny + h * 0.08); g.closePath(); g.fill();
    if (O.turn && ((O.turn * d > 0) === (k < 0))) { g.fillStyle = 'rgba(235,245,255,.9)'; g.beginPath(); g.moveTo(nx + d * w * 0.35, ny - h * 0.1); g.lineTo(nx + d * (w * 0.35 + s * 1.1), ny + k * h * 0.2); g.lineTo(nx + d * w * 0.35, ny + h * 0.1); g.closePath(); g.fill(); } }
}

function chutePack(g, x, y, w, h, O) {
  g.fillStyle = metal(g, x - w / 2, x + w / 2, [232, 228, 216], O); rr(g, x - w / 2, y - h / 2, w, h, w * 0.3); g.fill(); g.stroke();
  g.fillStyle = 'rgba(224,80,50,.9)'; g.fillRect(x - w / 2, y - h * 0.1, w, h * 0.2);
}

function canopy(g, parts, refH, s, k) {
  const packs = parts.filter(p => p.def.kind === 'chute'); if (!packs.length) return;
  const area = packs.reduce((a, p) => a + p.def.chuteArea, 0), rad = Math.sqrt(area / Math.PI) * 0.7 * k * s, top = (-refH / 2 - Math.sqrt(area) * 0.9 * k) * s, apex = top - rad * 0.62;
  g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = Math.max(0.6, s * 0.05); g.beginPath();
  for (const p of packs) { const d = Math.sign(p.x) || 1; g.moveTo(p.x * s, (p.y - refH / 2 - p.def.h / 2) * s); g.lineTo(d * rad * 0.9, top); } g.stroke();
  g.save(); g.beginPath(); g.ellipse(0, top, rad, rad * 0.62, 0, Math.PI, 2 * Math.PI); g.closePath(); g.clip();
  g.fillStyle = '#f3eee2'; g.fillRect(-rad, apex, rad * 2, rad); g.fillStyle = '#d04a38';
  for (let j = 0; j < 8; j += 2) { g.beginPath(); g.moveTo(0, apex); g.lineTo(-rad + 2 * rad * j / 8, top); g.lineTo(-rad + 2 * rad * (j + 1) / 8, top); g.closePath(); g.fill(); }
  g.restore(); g.strokeStyle = '#8a2e22'; g.lineWidth = Math.max(1, s * 0.1); g.beginPath(); g.ellipse(0, top, rad, rad * 0.62, 0, Math.PI, 2 * Math.PI); g.closePath(); g.stroke();
}

function adapter(g, p, x, y, w, h, s, c, O) {
  const w2 = (p.def.w2 || w / s * 0.6) * s;
  g.beginPath(); g.moveTo(x - w / 2, y - h / 2); g.lineTo(x + w / 2, y - h / 2); g.lineTo(x + w2 / 2, y + h / 2); g.lineTo(x - w2 / 2, y + h / 2); g.closePath();
  g.fillStyle = metal(g, x - w / 2, x + w / 2, c, O); g.fill(); g.stroke();
  g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x - w / 2, y - h / 2, w, Math.min(h * 0.14, 0.3 * s)); g.fillRect(x - w2 / 2, y + h / 2 - Math.min(h * 0.14, 0.3 * s), w2, Math.min(h * 0.14, 0.3 * s));
}
function cone(g, x, y, w, h, s, c, O) {
  g.beginPath(); g.moveTo(x - w / 2, y + h / 2); g.bezierCurveTo(x - w / 2, y - h * 0.1, x - w * 0.2, y - h / 2, x, y - h / 2); g.bezierCurveTo(x + w * 0.2, y - h / 2, x + w / 2, y - h * 0.1, x + w / 2, y + h / 2); g.closePath();
  g.fillStyle = metal(g, x - w / 2, x + w / 2, c, O); g.fill(); g.stroke();
  g.fillStyle = 'rgba(232,116,42,.85)'; g.fillRect(x - w / 2, y + h * 0.28, w, h * 0.07); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - w / 2, y + h / 2 - Math.min(h * 0.1, 0.3 * s), w, Math.min(h * 0.1, 0.3 * s));
}
function solar(g, p, x, y, w, h, s, O) { // сложенная панель — тёмная плита у борта; раскрытая — крыло с сеткой элементов
  const d = Math.sign(p.x) || 1, k = O.solarK, hx = x - d * w / 2;
  g.fillStyle = '#16264a'; g.fillRect(x - w / 2, y - h / 2, w, h); g.strokeRect(x - w / 2, y - h / 2, w, h);
  if (k > 0.01) {
    const L = k * 3.4 * s, ph = h * 0.64, x1 = hx + d * L, x0 = Math.min(hx, x1), x2 = Math.max(hx, x1), top = y - ph / 2;
    g.strokeStyle = '#a0a8b2'; g.lineWidth = Math.max(1, 0.1 * s); g.beginPath(); g.moveTo(hx, y); g.lineTo(x1, y); g.stroke();
    g.fillStyle = `rgb(${29 * (1 - O.dim * 0.5) | 0},${61 * (1 - O.dim * 0.5) | 0},${115 * (1 - O.dim * 0.5) | 0})`; g.fillRect(x0, top, x2 - x0, ph); g.strokeStyle = INK; g.lineWidth = Math.max(0.8, 0.06 * s); g.strokeRect(x0, top, x2 - x0, ph);
    if (s > 3) { g.strokeStyle = 'rgba(160,190,235,.35)'; g.lineWidth = Math.max(0.5, 0.03 * s); const cell = 0.55 * s; for (let u = x0 + cell; u < x2; u += cell) { g.beginPath(); g.moveTo(u, top); g.lineTo(u, top + ph); g.stroke(); } for (let v = top + cell; v < top + ph; v += cell) { g.beginPath(); g.moveTo(x0, v); g.lineTo(x2, v); g.stroke(); } }
  }
}
function ion(g, p, x, y, w, h, s, c, O, flame, on) {
  g.fillStyle = metal(g, x - w / 2, x + w / 2, c, O); rr(g, x - w / 2, y - h / 2, w, h * 0.62, 2); g.fill(); g.stroke();
  const gy = y - h / 2 + h * 0.62; g.fillStyle = '#23272f'; g.fillRect(x - w * 0.42, gy, w * 0.84, h * 0.38); g.strokeRect(x - w * 0.42, gy, w * 0.84, h * 0.38);
  if (s > 4) { g.strokeStyle = 'rgba(120,180,255,.55)'; g.lineWidth = Math.max(0.5, 0.04 * s); for (let u = -0.3; u <= 0.31; u += 0.2) { g.beginPath(); g.moveTo(x + u * w * 1.4, gy); g.lineTo(x + u * w * 1.4, gy + h * 0.38); g.stroke(); } }
  if (on) { g.fillStyle = `rgba(140,190,255,${0.5 + 0.4 * flame})`; g.beginPath(); g.ellipse(x, y + h / 2, w * 0.34, Math.max(1, w * 0.07), 0, 0, 7); g.fill(); plume(g, x, y + h / 2, w * 0.2, s, flame, 'engI', O, w * 0.6); }
}
// Упрощённая отрисовка для малого масштаба: плоские фигуры без градиентов и швов
function simple(g, parts, refH, s, flame, O) {
  for (const p of parts) {
    const d = p.def, w = d.w * s, h = d.h * s, x = p.x * s, y = (p.y - refH / 2) * s, c = hexRgb(d.color), k = 0.9 * (1 - O.dim * 0.7);
    if (d.kind === 'solar' && O.solarK > 0.01) { const dir = Math.sign(p.x) || 1, L = O.solarK * 3.4 * s; g.fillStyle = '#1d3d73'; g.fillRect(Math.min(x, x + dir * L), y - h * 0.3, Math.abs(L), h * 0.6); }
    if (d.kind === 'engine' || d.kind === 'srb') { if (flame > 0 && p.active === true) { g.fillStyle = 'rgba(255,190,80,.9)'; g.beginPath(); g.moveTo(x - w * 0.4, y + h / 2); g.lineTo(x + w * 0.4, y + h / 2); g.lineTo(x, y + h / 2 + h * (1.2 + 2.5 * flame)); g.fill(); } }
    g.fillStyle = d.kind === 'dec' ? '#d9a640' : sh(c, k);
    if (d.kind === 'engine') { g.beginPath(); g.moveTo(x - w * 0.3, y - h / 2); g.lineTo(x + w * 0.3, y - h / 2); g.lineTo(x + w / 2, y + h / 2); g.lineTo(x - w / 2, y + h / 2); g.closePath(); g.fill(); }
    else if (d.kind === 'leg') { g.strokeStyle = sh(c, k); g.lineWidth = Math.max(1, 0.14 * s); const dir = Math.sign(p.x) || 1; g.beginPath(); g.moveTo(x, y - h * 0.4); g.lineTo(x + dir * (0.1 + 1.7 * O.legK) * s, y + h * 0.5); g.stroke(); }
    else g.fillRect(x - Math.max(w, 1) / 2, y - h / 2, Math.max(w, 1), h);
  }
}
// Белый треугольник: так ракета выглядит, когда она слишком мала для детального рисунка (как в оригинале)
export function drawMarker(g, x, y, ang, size, color = '#ffffff') {
  g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = color; g.strokeStyle = 'rgba(8,10,14,.9)'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(0, -size); g.lineTo(size * 0.72, size * 0.85); g.lineTo(0, size * 0.42); g.lineTo(-size * 0.72, size * 0.85); g.closePath(); g.fill(); g.stroke(); g.restore();
}

// parts — детали в метрах (y вниз от верха), refH — высота ракеты, s — пикселей на метр. Контекст уже в центре ракеты.
// flame — газ 0..1; chuteK — раскрытие парашюта; o: { light, dim, legK, turn, press, t }
export function drawParts(g, parts, refH, s, flame = 0, chuteK = 0, o = {}) {
  const O = { light: -0.5, dim: 0, legK: 1, solarK: 0, turn: 0, press: 1, t: 0, lod: false, ...o };
  if (O.lod) { simple(g, [...parts].sort((a, b) => (a.radial ? 0 : 1) - (b.radial ? 0 : 1)), refH, s, flame, O); if (chuteK > 0) canopy(g, parts, refH, s, chuteK); return; }
  for (const p of [...parts].sort((a, b) => (a.radial ? 0 : 1) - (b.radial ? 0 : 1))) {
    const d = p.def, w = d.w * s, h = d.h * s, x = p.x * s, y = (p.y - refH / 2) * s, c = hexRgb(d.color), line = Math.max(0.6, s * 0.045);
    const on = flame > 0 && p.active === true;
    g.lineWidth = line; g.strokeStyle = INK;
    switch (d.kind) {
      case 'tank': tank(g, p, x, y, w, h, s, c, O, line); break;
      case 'engine': if (p.id === 'engI') ion(g, p, x, y, w, h, s, c, O, flame, on); else engine(g, p, x, y, w, h, s, c, O, flame, on); break;
      case 'adapter': adapter(g, p, x, y, w, h, s, c, O); break;
      case 'cone': cone(g, x, y, w, h, s, c, O); break;
      case 'solar': solar(g, p, x, y, w, h, s, O); break;
      case 'pod': pod(g, x, y, w, h, s, c, O); break;
      case 'dec': dec(g, x, y, w, h, O); break;
      case 'srb': srb(g, p, x, y, w, h, s, O, flame, on); break;
      case 'leg': leg(g, p, x, y, w, h, s, O); break;
      case 'rcs': rcs(g, p, x, y, w, h, s, O); break;
      case 'chute': chutePack(g, x, y, w, h, O); break;
      default: g.fillStyle = metal(g, x - w / 2, x + w / 2, c, O); g.fillRect(x - w / 2, y - h / 2, w, h); g.strokeRect(x - w / 2, y - h / 2, w, h);
    }
  }
  if (chuteK > 0) canopy(g, parts, refH, s, chuteK);
}

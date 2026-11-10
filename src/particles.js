// Система частиц: огонь, дым, пыль, газ двигателей ориентации. Координаты мировые (метры), время — игровое.
// Рисуются пачками: частицы одного вида и яркости объединяются в один путь — на порядок меньше смен стиля и вызовов fill.
const BUCKETS = 6;
export class Particles {
  constructor() { this.list = []; this.groups = new Map(); }
  add(p) { if (this.list.length < 1600) this.list.push({ age: 0, ...p }); }
  update(dt) {
    const L = this.list; let w = 0;
    for (let i = 0; i < L.length; i++) {
      const p = L[i]; p.age += dt; if (p.age >= p.life) continue;
      p.x += p.vx * dt; p.y += p.vy * dt; if (p.drag) { const f = Math.exp(-p.drag * dt); p.vx = p.bvx + (p.vx - p.bvx) * f; p.vy = p.bvy + (p.vy - p.bvy) * f; }
      L[w++] = p;
    }
    L.length = w;
  }
  color(kind, k, b, col) { // b — номер корзины яркости 0..BUCKETS-1
    const a = (b + 0.5) / BUCKETS;
    if (kind === 'smoke') return `rgba(${150 - k * 40 | 0},${150 - k * 40 | 0},${155 - k * 40 | 0},${(0.35 * a).toFixed(2)})`;
    if (kind === 'dust') { const c = col || [150, 135, 110]; return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${(0.42 * a).toFixed(2)})`; }
    if (kind === 'gas') return `rgba(225,238,255,${(0.75 * a).toFixed(2)})`;
    return `rgba(255,${Math.round(210 - 150 * k)},${Math.round(80 - 60 * k)},${(0.85 * a).toFixed(2)})`;
  }
  draw(g, sx, sy, z) {
    const G = this.groups; G.clear();
    for (const p of this.list) {
      const k = p.age / p.life, grow = p.kind === 'smoke' ? 3 : p.kind === 'dust' ? 2.2 : 1.5, r = Math.max(1.2, p.size * z * (1 + k * grow)), px = sx(p.x), py = sy(p.y);
      if (px < -50 || py < -50 || px > 4000 || py > 4000) continue;
      const b = Math.min(BUCKETS - 1, ((1 - k) * BUCKETS) | 0), kb = p.kind === 'fire' ? Math.min(3, (k * 4) | 0) : 0, key = p.kind + b + kb + (p.col ? p.col[0] >> 5 : 0);
      let grp = G.get(key); if (!grp) { grp = { kind: p.kind, b, k: kb / 4, col: p.col, pts: [] }; G.set(key, grp); } grp.pts.push(px, py, r);
    }
    for (const grp of G.values()) { g.fillStyle = this.color(grp.kind, grp.k, grp.b, grp.col); g.beginPath(); const a = grp.pts; for (let i = 0; i < a.length; i += 3) { g.moveTo(a[i] + a[i + 2], a[i + 1]); g.arc(a[i], a[i + 1], a[i + 2], 0, 7); } g.fill(); }
  }
}

import { PARTS, TEMPLATES, DEFAULT_DESIGN, layout, stats, stageDeltaV, problems, normalize, newDesign, cleanDesign, graph, canStack, canSide } from './parts.js';
import { drawParts } from './draw.js';

// Ангар со свободной сборкой: деталь берут мышью, ведут к ракете и отпускают — она цепляется к ближайшему подходящему узлу.
// Ограничения: деталь должна быть присоединена, детали не пересекаются, капсула одна, у деталей свои узлы
// (двигатель — только сверху, капсула — только снизу, радиальные детали — к боку баков и капсулы).
const KEY = 'sfs_clone_design2', BP = 'sfs_clone_bp', PANEL = 304;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const CATS = [['Капсулы', ['pod', 'probe']], ['Баки', ['tankN', 'tankS', 'tankM', 'tankL', 'tankXL', 'tankW']], ['Двигатели', ['engT', 'engS', 'engL', 'engH', 'engV', 'engI']], ['Конструкции', ['dec', 'adapt', 'cone']], ['Оборудование', ['rcs', 'leg', 'chute', 'solar']], ['Ускорители', ['srb', 'srbS']]];
const STAGE_COL = ['#e8742a', '#d9b441', '#6fb1c9', '#8fbf7f', '#c78fbf'];
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

export class Vab {
  constructor(canvas, onLaunch, game = {}) {
    this.c = canvas; this.g = canvas.getContext('2d'); this.onLaunch = onLaunch; this.game = game;
    Object.assign(this, { msg: '', msgT: 0, sel: null, sym: true, tab: 'parts', cat: 0, hist: [], drag: null, hover: null, view: null, active: false, name: 'Новая ракета', mouse: [0, 0] });
    this.design = this.load();
    this.panel = el('div'); this.panel.id = 'vab'; document.body.appendChild(this.panel);
    this.go = el('button', 'go', 'ЗАПУСК'); this.go.id = 'vab-go'; this.go.label = 'Запуск'; this.go.onclick = () => this.launch(); document.body.appendChild(this.go);
    this.build();
    canvas.addEventListener('pointerdown', e => this.onDown(e));
    canvas.addEventListener('contextmenu', e => { if (this.active) { e.preventDefault(); const [wx, wy] = this.toWorld(e.clientX, e.clientY), u = this.hit(wx, wy); if (u != null) this.remove(u); } });
    canvas.addEventListener('wheel', e => { this.dirty = true; if (!this.active || !this.view) return; const [wx, wy] = this.toWorld(e.clientX, e.clientY), v = this.view, f = e.deltaY < 0 ? 1.12 : 1 / 1.12, ns = clamp(v.s * f, 2, 60), r = canvas.getBoundingClientRect();
      v.ox = e.clientX - r.left - wx * ns; v.oy = e.clientY - r.top - wy * ns; v.s = ns; });
    addEventListener('pointermove', e => this.onMove(e)); addEventListener('pointerup', e => this.onUp(e)); addEventListener('keydown', e => this.onKey(e));
  }

  // ---- хранение
  load() { try { const c = cleanDesign(JSON.parse(localStorage.getItem(KEY))); if (c.parts.length) return c; } catch {} return normalize(structuredClone(DEFAULT_DESIGN)); }
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.design)); } catch {} }
  bps() { try { const v = JSON.parse(localStorage.getItem(BP)); return Array.isArray(v) ? v.filter(b => b && typeof b.name === 'string' && b.design) : []; } catch { return []; } }
  saveBp(name) {
    name = String(name || '').trim().slice(0, 40) || 'Без названия'; this.name = name;
    const a = this.bps().filter(b => b.name !== name); a.unshift({ name, design: this.design });
    try { localStorage.setItem(BP, JSON.stringify(a.slice(0, 30))); } catch {} this.say(`Чертёж «${name}» сохранён`); this.build();
  }
  setDesign(d, name) { this.push(); this.design = cleanDesign(normalize(structuredClone(d))); if (name) this.name = name; this.sel = null; this.view = null; this.changed(); }
  push() { this.hist.push(JSON.stringify(this.design)); if (this.hist.length > 60) this.hist.shift(); }
  undo() { const h = this.hist.pop(); if (!h) return this.say('Отменять нечего'); this.design = cleanDesign(JSON.parse(h)); this.sel = null; this.changed(); }
  changed() { this.save(); this.msg = ''; this.refit(); this.dirty = true; }
  say(t) { this.msg = t; this.msgT = performance.now() + 4500; this.dirty = true; }
  launch() { const e = problems(this.design).find(p => p.level === 'error'); if (e) return this.say(e.text); this.onLaunch(this.design); }

  // ---- геометрия
  size() { const c = this.c; return [c.logicalW || c.width, c.logicalH || c.height, c.dpr || 1]; }
  toWorld(cx, cy) { const r = this.c.getBoundingClientRect(), v = this.view || { s: 10, ox: 0, oy: 0 }; return [(cx - r.left - v.ox) / v.s, (cy - r.top - v.oy) / v.s]; }
  byU(u) { return this.design.parts.find(p => p.u === u); }
  fitView() {
    const [W, H] = this.size(), P = this.design.parts; let x0 = -3, x1 = 3, y0 = -8, y1 = 3;
    if (P.length) { x0 = Math.min(...P.map(p => p.x - PARTS[p.id].w / 2)); x1 = Math.max(...P.map(p => p.x + PARTS[p.id].w / 2)); y0 = Math.min(...P.map(p => p.y - PARTS[p.id].h / 2)); y1 = Math.max(...P.map(p => p.y + PARTS[p.id].h / 2)); }
    const s = clamp(Math.min((H - 250) / Math.max(y1 - y0, 8), (W - PANEL - 330) / Math.max(x1 - x0, 6)), 2, 22);
    return { s, ox: PANEL + (W - PANEL - 220) / 2 - (x0 + x1) / 2 * s, oy: H - 130 - y1 * s };
  }
  fit() { this.view = this.fitView(); }
  refit() { // после изменений: если ракета перестала помещаться в окно — отдалить вид
    if (!this.view) return; const [W, H] = this.size(), v = this.view, P = this.design.parts; if (!P.length) return;
    const l = Math.min(...P.map(p => p.x - PARTS[p.id].w / 2)) * v.s + v.ox, r = Math.max(...P.map(p => p.x + PARTS[p.id].w / 2)) * v.s + v.ox, t = Math.min(...P.map(p => p.y - PARTS[p.id].h / 2)) * v.s + v.oy, b = Math.max(...P.map(p => p.y + PARTS[p.id].h / 2)) * v.s + v.oy;
    if (l < PANEL + 30 || r > W - 250 || t < 90 || b > H - 70) this.fit();
  }
  hit(wx, wy) { const P = this.design.parts; for (let i = P.length - 1; i >= 0; i--) { const p = P[i], d = PARTS[p.id]; if (Math.abs(wx - p.x) <= d.w / 2 && Math.abs(wy - p.y) <= d.h / 2) return p.u; } return null; }
  subtree(u) { const g = graph(this.design), out = []; for (const v of g.order) { let a = v; while (a != null && a !== u) a = g.parent.get(a); if (a === u) out.push(v); } return { g, out }; }
  clash(items, exclude) { // пересечение с остальными деталями (касание допускается)
    for (const it of items) { const a = PARTS[it.id]; for (const q of this.design.parts) { if (exclude.has(q.u)) continue; const b = PARTS[q.id]; if (Math.abs(it.x - q.x) < (a.w + b.w) / 2 - 0.04 && Math.abs(it.y - q.y) < (a.h + b.h) / 2 - 0.04) return true; } }
    return false;
  }
  // Поиск узла крепления: перебор осевых (сверху/снизу) и боковых позиций, сортировка по расстоянию до курсора, проверка пересечений
  findSnap(id, cur, exclude, offs, maxDist) {
    // cur — где сейчас центр переносимой детали. Притяжение считается по узлам: край детали к краю ракеты (а не центр к центру)
    const a = PARTS[id], list = [];
    for (const q of this.design.parts) {
      if (exclude.has(q.u)) continue; const qd = PARTS[q.id];
      if (canStack(id)) {
        if (qd.bottom && a.top) list.push({ q: q.u, t: 'a', x: q.x, y: q.y + (qd.h + a.h) / 2, nd: Math.hypot(cur.x - q.x, (cur.y - a.h / 2) - (q.y + qd.h / 2)) });
        if (qd.top && a.bottom) list.push({ q: q.u, t: 'a', x: q.x, y: q.y - (qd.h + a.h) / 2, nd: Math.hypot(cur.x - q.x, (cur.y + a.h / 2) - (q.y - qd.h / 2)) });
      }
      if (canSide(id) && qd.side) for (const sg of [-1, 1]) {
        const lo = q.y - qd.h / 2 + a.h / 2, hi = q.y + qd.h / 2 - a.h / 2, y = lo <= hi ? clamp(Math.round(cur.y * 4) / 4, lo, hi) : q.y;
        list.push({ q: q.u, t: 's', sg, x: q.x + sg * (qd.w + a.w) / 2, y, nd: Math.hypot((cur.x - sg * a.w / 2) - (q.x + sg * qd.w / 2), cur.y - y) });
      }
    }
    const sc = list.filter(c => c.nd <= maxDist).sort((m, n) => m.nd - n.nd);
    for (const c of sc) {
      if (this.clash(offs.map(o => ({ id: o.id, x: c.x + o.dx, y: c.y + o.dy })), exclude)) continue;
      if (this.sym && c.t === 's' && offs.length === 1) { const m = { id, x: 2 * this.byU(c.q).x - c.x, y: c.y }; if (this.clash([m], exclude)) continue; c.mirror = m; }
      return { cand: c, all: sc };
    }
    return { cand: null, all: sc };
  }

  // ---- изменения чертежа
  placeNew(id, sr) {
    const d = this.design;
    if (PARTS[id].kind === 'pod' && d.parts.some(p => PARTS[p.id].kind === 'pod')) return this.say('Капсула (или зонд) уже есть: на ракете может быть только одна');
    if (d.parts.length >= 80) return this.say('Слишком много деталей');
    if (!d.parts.length) { this.push(); const u = d.next++; d.parts.push({ u, id, x: 0, y: 0 }); this.sel = u; this.view = null; return this.changed(); }
    if (!sr || !sr.cand) return this.say('Деталь нужно прикрепить: поднесите её к подсвеченному узлу на ракете (без пересечений)');
    this.push(); const c = sr.cand, u = d.next++; d.parts.push({ u, id, x: c.x, y: c.y }); d.links.push([u, c.q, c.t]); this.sel = u;
    if (c.mirror) { const u2 = d.next++; d.parts.push({ u: u2, id, x: c.mirror.x, y: c.mirror.y }); d.links.push([u2, c.q, 's']); }
    this.changed();
  }
  autoAdd(id) { // быстрое добавление кликом по каталогу
    const d = this.design; if (!d.parts.length) return this.placeNew(id, null);
    let cur; const top = Math.min(...d.parts.map(p => p.y - PARTS[p.id].h / 2)), bot = Math.max(...d.parts.map(p => p.y + PARTS[p.id].h / 2)), root = d.parts.find(p => p.id === 'pod') || d.parts[0];
    if (canSide(id) && !canStack(id)) { const sel = this.sel != null ? this.byU(this.sel) : null, base = sel && PARTS[sel.id].side ? sel : (PARTS[root.id].side ? root : d.parts.find(p => PARTS[p.id].side)); if (!base) return this.say('Нет детали, к боку которой можно прикрепить'); cur = { x: base.x + 0.01, y: base.y }; }
    else cur = PARTS[id].kind === 'pod' ? { x: root.x, y: top - 5 } : { x: root.x, y: bot + 5 };
    this.placeNew(id, this.findSnap(id, cur, new Set(), [{ id, dx: 0, dy: 0 }], Infinity));
  }
  remove(u) {
    const g = graph(this.design); if (u === g.root && this.design.parts.length > 1) return this.say('Капсулу нельзя удалить отдельно: используйте «Очистить»');
    const { out } = this.subtree(u), del = new Set(out), p = this.byU(u);
    if (this.sym && g.info.get(u) && g.info.get(u).radial) { const l = this.design.links.find(l => l[0] === u); if (l) { const q = this.byU(l[1]); for (const o of this.design.parts) if (o.u !== u && o.id === p.id && Math.abs(o.y - p.y) < 0.01 && Math.abs((o.x - q.x) + (p.x - q.x)) < 0.01 && this.design.links.some(k => k[0] === o.u && k[1] === q.u && k[2] === 's')) del.add(o.u); } }
    this.push(); this.design.parts = this.design.parts.filter(q => !del.has(q.u)); this.design.links = this.design.links.filter(l => !del.has(l[0]) && !del.has(l[1])); this.sel = null; this.changed();
  }
  clear() { if (!this.design.parts.length) return; this.push(); this.design = newDesign(); this.sel = null; this.view = null; this.changed(); }
  finishMove(d) {
    const des = this.design;
    if (d.isRoot) { this.push(); for (const m of d.members) { const p = this.byU(m.u); p.x += d.delta[0]; p.y += d.delta[1]; } return this.changed(); }
    if (!d.snap || !d.snap.cand) return this.say('Здесь деталь не прикрепить: она возвращена на место');
    this.push(); const c = d.snap.cand, a = this.byU(d.u), dx = c.x - a.x, dy = c.y - a.y;
    des.links = des.links.filter(l => !((l[0] === d.u && l[1] === d.parentU) || (l[0] === d.parentU && l[1] === d.u)));
    for (const m of d.members) { const p = this.byU(m.u); p.x += dx; p.y += dy; }
    des.links.push([d.u, c.q, c.t]); this.changed();
  }

  // ---- ввод
  startNew(id, e) { if (!this.active) return; this.drag = { mode: 'new', id, sx: e.clientX, sy: e.clientY, moved: false, snap: null }; this.game.vabBusy = true; if (e.preventDefault) e.preventDefault(); }
  onDown(e) {
    this.dirty = true; if (!this.active || (e.button || 0) !== 0) return; if (!this.view) this.fit();
    const [wx, wy] = this.toWorld(e.clientX, e.clientY), u = this.hit(wx, wy); this.sel = u;
    this.drag = u != null ? { mode: 'pending', u, sx: e.clientX, sy: e.clientY, w0: [wx, wy] } : { mode: 'pan', sx: e.clientX, sy: e.clientY };
  }
  onMove(e) {
    this.dirty = true; this.mouse = [e.clientX, e.clientY]; const d = this.drag; if (!this.active || !this.view) return;
    const [wx, wy] = this.toWorld(e.clientX, e.clientY), far = Math.hypot(e.clientX - (d ? d.sx : 0), e.clientY - (d ? d.sy : 0)) > 5, maxD = Math.max(1.3, 60 / this.view.s);
    if (!d) { this.hover = this.hit(wx, wy); if (this.c.style) this.c.style.cursor = this.hover != null ? 'grab' : 'default'; return; }
    if (d.mode === 'pan') { this.view.ox += e.clientX - d.sx; this.view.oy += e.clientY - d.sy; d.sx = e.clientX; d.sy = e.clientY; return; }
    if (d.mode === 'pending' && far) {
      const { g, out } = this.subtree(d.u), a = this.byU(d.u);
      Object.assign(d, { mode: 'move', members: out.map(v => { const p = this.byU(v); return { u: v, id: p.id, dx: p.x - a.x, dy: p.y - a.y }; }), isRoot: d.u === g.root, parentU: g.parent.get(d.u), grab: [d.w0[0] - a.x, d.w0[1] - a.y], delta: [0, 0], snap: null });
      this.game.vabBusy = true; if (this.c.style) this.c.style.cursor = 'grabbing';
    }
    if (d.mode === 'move') {
      if (d.isRoot) d.delta = [wx - d.w0[0], wy - d.w0[1]];
      else { const a = this.byU(d.u); d.snap = this.findSnap(a.id, { x: wx - d.grab[0], y: wy - d.grab[1] }, new Set(d.members.map(m => m.u)), d.members.map(m => ({ id: m.id, dx: m.dx, dy: m.dy })), maxD); d.cur = [wx - d.grab[0], wy - d.grab[1]]; }
    } else if (d.mode === 'new') {
      if (far) d.moved = true; d.cur = [wx, wy]; d.snap = this.design.parts.length ? this.findSnap(d.id, { x: wx, y: wy }, new Set(), [{ id: d.id, dx: 0, dy: 0 }], maxD) : null;
    }
  }
  onUp(e) {
    this.dirty = true; const d = this.drag; this.drag = null; this.game.vabBusy = false; if (!d || !this.active) return;
    if (d.mode === 'new') { if (!d.moved) this.autoAdd(d.id); else if (e.clientX > PANEL) this.placeNew(d.id, d.snap); }
    else if (d.mode === 'move') this.finishMove(d);
    if (this.c.style) this.c.style.cursor = 'default';
  }
  onKey(e) {
    if (!this.active) return; this.dirty = true;
    if ((e.code === 'Delete' || e.code === 'Backspace') && this.sel != null) { this.remove(this.sel); if (e.preventDefault) e.preventDefault(); }
    else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) this.undo();
    else if (e.code === 'KeyF') this.fit();
    else if (e.code === 'Escape' && this.drag) { this.drag = null; this.game.vabBusy = true; setTimeout(() => { this.game.vabBusy = false; }, 0); }
  }

  // ---- панель (DOM)
  icon(cv, id) {
    const g = cv.getContext('2d'), d = PARTS[id], s = 28 / Math.max(d.w * (d.kind === 'leg' ? 4 : d.kind === 'rcs' ? 2 : d.kind === 'solar' ? 12 : 1), d.h * (d.kind === 'engine' ? 1.5 : 1));
    g.save(); g.translate(18, 18); drawParts(g, [{ id, def: d, x: 0, y: 0, fuel: d.fuel, stage: 0 }], 0, s, 0, 0, { light: -0.6, legK: 1, solarK: 1 }); g.restore();
  }
  specs(id) { const d = PARTS[id], t = [`${d.dry} кг`]; if (d.fuel) t.push(`топл. ${(d.fuel / 1000).toFixed(1)} т`); if (d.thrust) t.push(`${d.thrust / 1000} кН`); if (d.torque && d.kind === 'rcs') t.push(`${d.torque / 1000} кН·м`); if (d.chuteArea) t.push(`${d.chuteArea} м²`); return t.join('  ·  '); }
  row(id) {
    const b = el('button', 'part'); b.label = PARTS[id].name; const cv = el('canvas'); cv.width = cv.height = 36; this.icon(cv, id);
    const t = el('span', 'tx'); t.append(el('span', 'nm', PARTS[id].name), el('span', 'sp', this.specs(id))); b.append(cv, t);
    b.onpointerdown = e => this.startNew(id, e); return b;
  }
  btn(cls, label, fn) { const b = el('button', cls, label); b.label = label; b.onclick = fn; return b; }
  build() {
    const p = this.panel; p.innerHTML = '';
    const head = el('div', 'v-head'); head.append(el('span', 'v-t', 'АНГАР'), el('span', 'v-s', 'сборка ракеты')); p.append(head);
    const tabs = el('div', 'v-tabs'); for (const [k, l] of [['parts', 'Детали'], ['bp', 'Чертежи']]) tabs.append(this.btn('tab' + (this.tab === k ? ' on' : ''), l, () => { this.tab = k; this.build(); })); p.append(tabs);
    const body = el('div', 'v-body'); if (this.tab === 'parts') this.buildParts(body); else this.buildBp(body); p.append(body);
    const tools = el('div', 'v-tools');
    tools.append(this.btn('tool' + (this.sym ? ' on' : ''), this.sym ? 'Симметрия: вкл' : 'Симметрия: выкл', () => { this.sym = !this.sym; this.build(); }), this.btn('tool', 'Отменить', () => this.undo()), this.btn('tool', 'По центру', () => this.fit()), this.btn('tool danger', 'Очистить', () => this.clear()));
    p.append(tools); p.style.display = this.active ? 'flex' : 'none';
  }
  buildParts(body) {
    const cats = el('div', 'v-cats'); CATS.forEach(([n], i) => cats.append(this.btn('cat' + (i === this.cat ? ' on' : ''), n, () => { this.cat = i; this.build(); }))); body.append(cats);
    for (const id of CATS[this.cat][1]) body.append(this.row(id));
    body.append(el('div', 'v-hint', 'Перетащите деталь на ракету: она прикрепится к ближайшему подсвеченному узлу. Клик по детали каталога — добавить автоматически.'));
  }
  buildBp(body) {
    const sv = el('div', 'bp-save'), inp = el('input'); inp.placeholder = 'Название чертежа'; inp.value = this.name; inp.oninput = () => { this.name = inp.value; }; this.nameInput = inp;
    sv.append(inp, this.btn('tool', 'Сохранить', () => this.saveBp(inp.value))); body.append(sv);
    body.append(el('h4', null, 'Мои чертежи'));
    const mine = this.bps(); if (!mine.length) body.append(el('div', 'v-hint', 'Пока пусто. Соберите ракету и сохраните её.'));
    for (const b of mine) { const r = el('div', 'bp-row'); r.append(this.btn('ld', b.name, () => this.setDesign(b.design, b.name)), el('span', 'dv', `Δv ${stats(b.design).dv.toFixed(0)}`), this.btn('x', '×', () => { try { localStorage.setItem(BP, JSON.stringify(this.bps().filter(k => k.name !== b.name))); } catch {} this.build(); })); body.append(r); }
    body.append(el('h4', null, 'Шаблоны'));
    for (const t of TEMPLATES) { const r = el('div', 'bp-row'); r.append(this.btn('ld', t.name, () => this.setDesign(t.design, t.name)), el('span', 'dv', `Δv ${stats(t.design).dv.toFixed(0)}`)); body.append(r); }
  }
  show(on) { this.dirty = true; this.active = on; this.panel.style.display = on ? 'flex' : 'none'; this.go.style.display = on ? 'block' : 'none'; if (on) this.view = null; }

  // ---- отрисовка
  draw() {
    const [W0, H0, dpr0] = this.size(), now0 = performance.now(), sig = `${W0}x${H0}x${dpr0}`, live = !!(this.msg && now0 < this.msgT);
    if (sig !== this.sig) { this.sig = sig; this.dirty = true; } if (this.drag) this.dirty = true;
    if (!this.dirty && !live && !this.wasLive) return; // ничего не менялось — холст остаётся как есть
    this.wasLive = live; this.dirty = false;
    const { g } = this, [W, H, dpr] = this.size(); g.setTransform(dpr, 0, 0, dpr, 0, 0); if (!this.view) this.fit();
    const v = this.view, s = v.s, P = this.design.parts, gr = graph(this.design), d = this.drag, moving = d && d.mode === 'move' ? new Set(d.members.map(m => m.u)) : null;
    const root = gr.byU.get(gr.root), ax = root ? root.x : 0, bottom = P.length ? Math.max(...P.map(p => p.y + PARTS[p.id].h / 2)) : 0;
    g.fillStyle = '#0b0e12'; g.fillRect(0, 0, W, H);
    // чертёжная сетка и линейка высоты (0 — низ ракеты)
    const step = [0.5, 1, 2, 5, 10, 20, 50].find(t => t * s >= 22) || 50, wx0 = (PANEL - v.ox) / s, wx1 = (W - v.ox) / s, wy0 = -v.oy / s, wy1 = (H - v.oy) / s;
    g.lineWidth = 1; g.font = '10px ui-monospace, Consolas, monospace'; g.textAlign = 'left';
    for (let x = Math.floor(wx0 / step) * step; x <= wx1; x += step) { const maj = Math.round(x / step) % 5 === 0; g.strokeStyle = maj ? 'rgba(150,165,180,.20)' : 'rgba(150,165,180,.08)'; const px = Math.round(v.ox + x * s) + 0.5; g.beginPath(); g.moveTo(px, 0); g.lineTo(px, H); g.stroke(); }
    const yb = P.length ? bottom : 0; // горизонтальные линии отсчитываются от низа ракеты
    for (let k = Math.floor((yb - wy1) / step); k <= Math.ceil((yb - wy0) / step); k++) { const y = yb - k * step, maj = k % 5 === 0, py = Math.round(v.oy + y * s) + 0.5; g.strokeStyle = maj ? 'rgba(150,165,180,.20)' : 'rgba(150,165,180,.08)'; g.beginPath(); g.moveTo(PANEL, py); g.lineTo(W, py); g.stroke();
      if (maj && P.length && k > 0) { g.fillStyle = '#6f7a86'; g.fillText(`${(k * step).toFixed(step < 1 ? 1 : 0)} м`, PANEL + 8, py - 3); } }
    // площадка под ракетой
    if (P.length) { const py = v.oy + bottom * s, x0 = v.ox + ax * s - 90, x1 = v.ox + ax * s + 90; g.fillStyle = '#161b21'; g.fillRect(x0, py, x1 - x0, 16); g.fillStyle = '#2a323b'; g.fillRect(x0, py, x1 - x0, 3);
      g.strokeStyle = '#4a525c'; g.lineWidth = 1; for (let i = x0; i < x1; i += 12) { g.beginPath(); g.moveTo(i, py + 16); g.lineTo(i + 10, py + 4); g.stroke(); } }
    const disp = (list, dx = 0, dy = 0) => list.map(p => ({ u: p.u, id: p.id, def: PARTS[p.id], x: p.x - ax + dx, y: p.y + dy, fuel: PARTS[p.id].fuel, stage: 0, radial: !!(gr.info.get(p.u) && gr.info.get(p.u).radial) }));
    // ступени: цветные скобки слева от ракеты
    const stages = [...new Set(gr.order.map(u => gr.info.get(u).stage))].sort((a, b) => b - a); // порядок включения: сначала нижняя
    stages.forEach((st, i) => { const m = gr.order.map(u => gr.byU.get(u)).filter(p => gr.info.get(p.u).stage === st), y0 = Math.min(...m.map(p => p.y - PARTS[p.id].h / 2)), y1 = Math.max(...m.map(p => p.y + PARTS[p.id].h / 2)), x0 = Math.min(...P.map(p => p.x - PARTS[p.id].w / 2)), px = v.ox + (x0 - 2.4) * s - 14, col = STAGE_COL[i % STAGE_COL.length];
      g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(px + 6, v.oy + y0 * s + 1); g.lineTo(px, v.oy + y0 * s + 1); g.lineTo(px, v.oy + y1 * s - 1); g.lineTo(px + 6, v.oy + y1 * s - 1); g.stroke();
      g.save(); g.translate(px - 7, v.oy + (y0 + y1) / 2 * s); g.rotate(-Math.PI / 2); g.fillStyle = col; g.font = 'bold 10px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText(`СТУПЕНЬ ${i + 1}`, 0, 0); g.restore(); });
    g.save(); g.translate(v.ox + ax * s, v.oy);
    drawParts(g, disp(P.filter(p => !moving || !moving.has(p.u))), 0, s, 0, 0, { light: -0.55, legK: 1 });
    // выбранная и подсвеченная деталь
    for (const [u, col, dash] of [[this.hover, 'rgba(255,255,255,.35)', []], [this.sel, '#e8742a', [6, 4]]]) { const p = u != null ? this.byU(u) : null; if (!p || (moving && moving.has(u))) continue; const df = PARTS[p.id]; g.strokeStyle = col; g.lineWidth = 1.5; g.setLineDash(dash); g.strokeRect((p.x - ax - df.w / 2) * s - 3, (p.y - df.h / 2) * s - 3, df.w * s + 6, df.h * s + 6); g.setLineDash([]); }
    // перетаскиваемая деталь (призрак) и узлы крепления
    if (d && (d.mode === 'new' || d.mode === 'move') && d.cur !== undefined || (d && d.mode === 'move' && d.isRoot)) {
      const ok = d.snap && d.snap.cand, snapOk = !!ok;
      for (const c of (d.snap ? d.snap.all.slice(0, 40) : [])) { g.strokeStyle = 'rgba(232,116,42,.55)'; g.lineWidth = 1.2; g.beginPath(); g.arc((c.x - ax) * s, c.y * s, 5, 0, 7); g.stroke(); }
      if (ok) { g.fillStyle = '#7cc47f'; g.beginPath(); g.arc((ok.x - ax) * s, ok.y * s, 6, 0, 7); g.fill(); }
      g.globalAlpha = 0.75;
      if (d.mode === 'new') { const gx = ok ? ok.x : d.cur[0], gy = ok ? ok.y : d.cur[1], gp = [{ u: -1, id: d.id, x: gx + ax, y: gy, radial: !!(ok && ok.t === 's') }]; if (ok && ok.mirror) gp.push({ u: -2, id: d.id, x: ok.mirror.x + ax, y: ok.mirror.y, radial: true }); drawParts(g, disp(gp), 0, s, 0, 0, { light: -0.55, legK: 1 });
        const df = PARTS[d.id]; g.globalAlpha = 1; g.strokeStyle = snapOk || !P.length ? '#7cc47f' : '#d9534f'; g.lineWidth = 2; g.strokeRect((gx - df.w / 2) * s, (gy - df.h / 2) * s, df.w * s, df.h * s); }
      else if (d.isRoot) drawParts(g, disp(P.filter(p => moving.has(p.u)), d.delta[0], d.delta[1]), 0, s, 0, 0, { light: -0.55, legK: 1 });
      else { const a = this.byU(d.u), tx = ok ? ok.x : d.cur[0], ty = ok ? ok.y : d.cur[1]; drawParts(g, disp(P.filter(p => moving.has(p.u)), tx - a.x, ty - a.y), 0, s, 0, 0, { light: -0.55, legK: 1 }); g.globalAlpha = 1; const df = PARTS[a.id]; g.strokeStyle = snapOk ? '#7cc47f' : '#d9534f'; g.lineWidth = 2; g.strokeRect((tx - ax - df.w / 2) * s, (ty - df.h / 2) * s, df.w * s, df.h * s); }
      g.globalAlpha = 1;
    }
    g.restore();
    // размерная линия по высоте
    if (P.length) { const L = layout(this.design), top = Math.min(...P.map(p => p.y - PARTS[p.id].h / 2)), x = v.ox + Math.max(...P.map(p => p.x + PARTS[p.id].w / 2)) * s + 34, y0 = v.oy + top * s, y1 = v.oy + bottom * s;
      g.strokeStyle = '#7f8893'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.moveTo(x - 5, y0); g.lineTo(x + 5, y0); g.moveTo(x - 5, y1); g.lineTo(x + 5, y1); g.stroke();
      g.fillStyle = '#c3cad2'; g.font = '11px ui-monospace, Consolas, monospace'; g.textAlign = 'left'; g.fillText(`${L.height.toFixed(1)} м`, x + 8, (y0 + y1) / 2); }
    this.hud(W, H);
  }
  hud(W, H) {
    const { g } = this, P = this.design.parts, now = performance.now(); g.textAlign = 'left';
    const st = P.length ? stats(this.design) : null, pr = P.length ? problems(this.design) : [];
    // сводка: плоские ячейки с тонкой рамкой
    const cells = st ? [['МАССА', `${(st.mass / 1000).toFixed(1)} т`, ''], ['ТЯГА', `${(st.thrust / 1000).toFixed(0)} кН`, ''], ['ТЯГА / ВЕС', st.twr.toFixed(2), st.twr < 1 ? '#d9534f' : st.twr < 1.3 ? '#e3b341' : ''], ['Δv ВАКУУМ', `${st.dv.toFixed(0)} м/с`, ''], ['ТОПЛИВО', `${(st.fuel / 1000).toFixed(1)} т`, ''], ['ПОВОРОТ', `${(st.alpha * 57.3).toFixed(2)} °/с²`, st.alpha * 57.3 < 0.3 ? '#e3b341' : '']] : [];
    const x0 = PANEL + 16, cw = 116; g.fillStyle = '#0b0e12'; g.fillRect(PANEL, 0, W - PANEL, 74);
    g.fillStyle = '#7f8893'; g.font = '10px system-ui, sans-serif'; g.fillText(`ЧЕРТЁЖ:  ${this.name.toUpperCase()}`, x0, 20);
    cells.forEach(([l, val, col], i) => { const x = x0 + i * (cw + 6); g.strokeStyle = '#2a3038'; g.lineWidth = 1; g.strokeRect(x + 0.5, 28.5, cw, 40); g.fillStyle = '#7f8893'; g.font = '9px system-ui, sans-serif'; g.fillText(l, x + 8, 41); g.fillStyle = col || '#e3e6ea'; g.font = 'bold 15px ui-monospace, Consolas, monospace'; g.fillText(val, x + 8, 60); });
    // замечания
    let y = 94; g.font = '12px system-ui, sans-serif';
    for (const p of pr.slice(0, 4)) { g.fillStyle = p.level === 'error' ? '#e0645f' : '#d9a640'; g.fillText((p.level === 'error' ? '× ' : '! ') + p.text, x0, y); y += 17; }
    if (this.msg && now < this.msgT) { g.fillStyle = '#e8742a'; g.fillText('› ' + this.msg, x0, y + 4); }
    // ступени (справа)
    if (st) { const rows = stageDeltaV(layout(this.design).parts), pw = 204, px = W - pw - 16, ph = 30 + rows.length * 44; g.fillStyle = '#0d1014'; g.fillRect(px, 96, pw, ph); g.strokeStyle = '#2a3038'; g.strokeRect(px + 0.5, 96.5, pw, ph);
      g.fillStyle = '#7f8893'; g.font = '9px system-ui, sans-serif'; g.fillText('СТУПЕНИ В ПОРЯДКЕ ВКЛЮЧЕНИЯ', px + 10, 112);
      rows.forEach((r, i) => { const yy = 126 + i * 44, col = r.stage < 0 ? '#7f8893' : STAGE_COL[(i - (rows[0].stage < 0 ? 1 : 0) + STAGE_COL.length) % STAGE_COL.length]; g.fillStyle = col; g.fillRect(px + 10, yy, 3, 34);
        g.fillStyle = '#e3e6ea'; g.font = 'bold 12px system-ui, sans-serif'; g.fillText(r.label.charAt(0).toUpperCase() + r.label.slice(1), px + 20, yy + 10); g.font = '11px ui-monospace, Consolas, monospace'; g.fillStyle = '#aab2bb';
        g.fillText(`тяга ${(r.thrust / 1000).toFixed(0)} кН  топл. ${(r.fuel / 1000).toFixed(1)} т`, px + 20, yy + 23); g.fillText(`Δv ${r.dv.toFixed(0)} м/с`, px + 20, yy + 35); }); }
    g.fillStyle = '#6f7a86'; g.font = '11px system-ui, sans-serif'; g.fillText('колесо — масштаб · тянуть фон — сдвиг · Del — удалить · Ctrl+Z — отмена · F — по центру', PANEL + 16, H - 16);
  }
}

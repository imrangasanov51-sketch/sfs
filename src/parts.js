// Каталог деталей и раскладка конструкции. Размеры в метрах, масса в кг, тяга в Н, isp — в вакууме, ispSL — у поверхности Земли.
export const PARTS = {
  pod:    { name: 'Капсула',             kind: 'pod',    w: 3,   h: 2.5, dry: 800,  fuel: 0,    thrust: 0,      isp: 0,   color: '#cfd3d8', torque: 6000 , bottom: true, side: true},
  tankS:  { name: 'Бак малый',           kind: 'tank',   w: 3,   h: 4,   dry: 150,  fuel: 1500, thrust: 0,      isp: 0,   color: '#e8e8e8' , top: true, bottom: true, side: true, radial: true},
  tankM:  { name: 'Бак средний',         kind: 'tank',   w: 3,   h: 6,   dry: 220,  fuel: 2400, thrust: 0,      isp: 0,   color: '#eeeeee' , top: true, bottom: true, side: true, radial: true},
  tankL:  { name: 'Бак большой',         kind: 'tank',   w: 3,   h: 8,   dry: 300,  fuel: 3200, thrust: 0,      isp: 0,   color: '#f2f2f2' , top: true, bottom: true, side: true, radial: true},
  tankXL: { name: 'Бак огромный',        kind: 'tank',   w: 3,   h: 12,  dry: 450,  fuel: 4800, thrust: 0,      isp: 0,   color: '#f6f6f6' , top: true, bottom: true, side: true, radial: true},
  dec:    { name: 'Декаплер',            kind: 'dec',    w: 3,   h: 0.6, dry: 50,   fuel: 0,    thrust: 0,      isp: 0,   color: '#555' , top: true, bottom: true},
  engS:   { name: 'Двигатель «Шмель»',   kind: 'engine', w: 2.4, h: 2,   dry: 300,  fuel: 0,    thrust: 80000,  isp: 280, ispSL: 240, color: '#7a7f86' , top: true, radial: true},
  engL:   { name: 'Двигатель «Бизон»',   kind: 'engine', w: 3,   h: 3,   dry: 700,  fuel: 0,    thrust: 250000, isp: 310, ispSL: 270, color: '#6b7078' , top: true, radial: true},
  engH:   { name: 'Двигатель «Мамонт»',  kind: 'engine', w: 3.6, h: 3.6, dry: 1200, fuel: 0,    thrust: 500000, isp: 300, ispSL: 280, color: '#5d636b' , top: true, radial: true},
  engV:   { name: 'Вакуумный «Эфир»',    kind: 'engine', w: 2.4, h: 2.2, dry: 250,  fuel: 0,    thrust: 60000,  isp: 380, ispSL: 120, color: '#8a8f9a' , top: true, radial: true},
  chute:  { name: 'Парашют (пара)',      kind: 'chute',  w: 0.8, h: 1.2, dry: 80,   fuel: 0,    thrust: 0,      isp: 0,   color: '#e8e0d0', chuteArea: 130 , radial: true},
  leg:    { name: 'Опора (пара)',        kind: 'leg',    w: 0.6, h: 3,   dry: 60,   fuel: 0,    thrust: 0,      isp: 0,   color: '#9aa3ad' , radial: true},
  rcs:    { name: 'Двигатели ориентации (пара)', kind: 'rcs', w: 0.7, h: 0.9, dry: 35, fuel: 0, thrust: 0, isp: 0, color: '#aab2bd', torque: 40000 , radial: true},
  probe:  { name: 'Зонд',                 kind: 'pod',     w: 1.8, h: 1.6, dry: 180,  fuel: 0,    thrust: 0,      isp: 0,   color: '#bfc6cf', torque: 2500, bottom: true },
  tankN:  { name: 'Бак узкий',            kind: 'tank',    w: 1.8, h: 5,   dry: 90,   fuel: 900,  thrust: 0,      isp: 0,   color: '#e4e4ea', top: true, bottom: true, side: true, radial: true },
  tankW:  { name: 'Бак широкий',          kind: 'tank',    w: 4.5, h: 6,   dry: 520,  fuel: 5600, thrust: 0,      isp: 0,   color: '#efe9e4', top: true, bottom: true, side: true, radial: true },
  adapt:  { name: 'Переходник 3 → 1,8 м', kind: 'adapter', w: 3,   w2: 1.8, h: 1.5, dry: 70, fuel: 0,   thrust: 0,      isp: 0,   color: '#9aa1ab', top: true, bottom: true, side: true },
  cone:   { name: 'Обтекатель',           kind: 'cone',    w: 3,   h: 3.5, dry: 90,   fuel: 0,    thrust: 0,      isp: 0,   color: '#dfe3e8', bottom: true },
  engT:   { name: 'Двигатель «Стриж»',    kind: 'engine',  w: 1.4, h: 1.7, dry: 110,  fuel: 0,    thrust: 40000,  isp: 305, ispSL: 255, color: '#7d838c', top: true, radial: true },
  engI:   { name: 'Ионный «Луч»',         kind: 'engine',  w: 1.2, h: 1.4, dry: 160,  fuel: 0,    thrust: 6000,   isp: 1500, ispSL: 60, color: '#6f7a8a', top: true, radial: true },
  srbS:   { name: 'Ускоритель малый',     kind: 'srb',     w: 0.9, h: 5,   dry: 220,  fuel: 1400, thrust: 70000,  isp: 215, ispSL: 195, color: '#d9d2c3', radial: true },
  solar:  { name: 'Солнечная панель (пара)', kind: 'solar', w: 0.3, h: 3,  dry: 40,   fuel: 0,    thrust: 0,      isp: 0,   color: '#1d3d73', radial: true },
  srb:    { name: 'Ускоритель (твёрд.)', kind: 'srb',    w: 1.2, h: 8,   dry: 400,  fuel: 2500, thrust: 120000, isp: 220, ispSL: 200, color: '#d9d2c3' , radial: true},
};
export const STACK_IDS = ['pod', 'probe', 'tankN', 'tankS', 'tankM', 'tankL', 'tankXL', 'tankW', 'adapt', 'cone', 'dec', 'engT', 'engS', 'engL', 'engH', 'engV', 'engI'];
export const RADIAL_IDS = ['srb', 'srbS', 'tankN', 'tankS', 'tankM', 'tankL', 'tankXL', 'tankW', 'engT', 'engS', 'engL', 'engH', 'engV', 'engI', 'chute', 'leg', 'rcs', 'solar'];
export const isPod = id => PARTS[id].kind === 'pod';
const MOON_DESIGN = { stack: ['pod', 'tankS', 'tankL', 'engV', 'dec', 'tankXL', 'tankXL', 'tankXL', 'engH'], side: [{ at: 0, id: 'chute' }, { at: 3, id: 'leg' }, { at: 1, id: 'rcs' }, { at: 2, id: 'rcs' }] };
export const DEFAULT_DESIGN = MOON_DESIGN;
export const TEMPLATES = [
  { name: 'Прыжок (мини-ракета)', design: { stack: ['pod', 'tankS', 'engS'], side: [{ at: 0, id: 'chute' }, { at: 1, id: 'leg' }] } },
  { name: 'Орбитальная', design: { stack: ['pod', 'tankM', 'engV', 'dec', 'tankXL', 'tankXL', 'engH'], side: [{ at: 0, id: 'chute' }, { at: 2, id: 'leg' }, { at: 1, id: 'rcs' }] } },
  { name: 'С ускорителями', design: { stack: ['pod', 'tankM', 'engV', 'dec', 'tankXL', 'tankXL', 'engH'], side: [{ at: 0, id: 'chute' }, { at: 2, id: 'leg' }, { at: 4, id: 'srb' }, { at: 1, id: 'rcs' }] } },
  { name: 'Спутник', design: { stack: ['probe', 'tankM', 'engT', 'dec', 'tankL', 'tankL', 'engL'], side: [{ at: 1, id: 'solar' }, { at: 4, id: 'rcs' }] } },
  { name: 'Лунная', design: MOON_DESIGN },
];

export const isEngine = d => d.thrust > 0;

// ---- Чертёж: { parts: [{u, id, x, y}], links: [[u_ребёнка, u_родителя, 'a' осевая | 's' боковая]], next }
// x, y — центр детали в метрах (y вниз). Ступени: счётчик разделителей на пути от капсулы (разделитель относится к нижней ступени).
export const canStack = id => !!(PARTS[id].top || PARTS[id].bottom);
export const canSide = id => !!PARTS[id].radial; // радиально (к боку) можно крепить почти всё, кроме капсул, разделителей, переходников и обтекателей
export const newDesign = () => ({ parts: [], links: [], next: 1 });
export function fromLegacy(d) { // старый формат { stack: [id…], side: [{at, id}] } → свободный чертёж
  const out = newDesign(), us = []; let y = 0;
  for (const id of d.stack) { const def = PARTS[id], u = out.next++; out.parts.push({ u, id, x: 0, y: y + def.h / 2 }); if (us.length) out.links.push([u, us[us.length - 1], 'a']); us.push(u); y += def.h; }
  for (const sd of d.side || []) {
    const base = out.parts.find(p => p.u === us[sd.at]); if (!base) continue; const def = PARTS[sd.id], bd = PARTS[base.id];
    for (const sg of [-1, 1]) { const u = out.next++; out.parts.push({ u, id: sd.id, x: sg * (bd.w / 2 + def.w / 2), y: base.y }); out.links.push([u, base.u, 's']); }
  }
  return out;
}
export const normalize = d => (d && Array.isArray(d.parts) ? d : fromLegacy(d));
export function cleanDesign(d) { // защита от повреждённых сохранений
  const out = newDesign(); if (!d || !Array.isArray(d.parts)) return out;
  const ok = new Set();
  for (const p of d.parts) if (p && PARTS[p.id] && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isInteger(p.u) && !ok.has(p.u)) { out.parts.push({ u: p.u, id: p.id, x: p.x, y: p.y }); ok.add(p.u); }
  for (const l of d.links || []) if (Array.isArray(l) && ok.has(l[0]) && ok.has(l[1]) && l[0] !== l[1] && (l[2] === 'a' || l[2] === 's')) out.links.push([l[0], l[1], l[2]]);
  out.next = Math.max(0, ...out.parts.map(p => p.u)) + 1; return out;
}
// Граф связей от капсулы: порядок обхода, родители, ступень и «радиальность» каждой детали
export function graph(design) {
  const d = normalize(design), P = d.parts, byU = new Map(P.map(p => [p.u, p])), adj = new Map(P.map(p => [p.u, []]));
  for (const [c, q, t] of d.links) if (byU.has(c) && byU.has(q)) { adj.get(c).push({ v: q, t, toParent: true }); adj.get(q).push({ v: c, t, toParent: false }); }
  const root = (P.find(p => PARTS[p.id].kind === 'pod') || P[0] || {}).u, parent = new Map(), info = new Map(), order = [];
  if (root !== undefined) {
    info.set(root, { stage: 0, radial: false }); parent.set(root, null); order.push(root);
    for (let i = 0; i < order.length; i++) {
      const u = order[i], cur = info.get(u);
      for (const e of adj.get(u)) { if (info.has(e.v)) continue; info.set(e.v, { stage: cur.stage + (byU.get(e.v).id === 'dec' ? 1 : 0), radial: e.t === 's' && !e.toParent }); parent.set(e.v, u); order.push(e.v); }
    }
  }
  return { d, byU, root, order, parent, info, unreached: P.length - order.length };
}
export function layout(design) {
  const g = graph(design), P = g.order.map(u => g.byU.get(u));
  if (!P.length) return { parts: [], height: 0, width: 0, unreached: g.unreached };
  const top = Math.min(...P.map(p => p.y - PARTS[p.id].h / 2)), ax = g.byU.get(g.root).x;
  const parts = P.map(p => { const def = PARTS[p.id], inf = g.info.get(p.u); return { u: p.u, id: p.id, def, x: p.x - ax, y: p.y - top, stage: inf.stage, radial: inf.radial, fuel: def.fuel }; });
  return { parts, height: Math.max(...parts.map(p => p.y + p.def.h / 2)), width: Math.max(...parts.map(p => 2 * Math.abs(p.x) + p.def.w)), unreached: g.unreached };
}

// Двигатели нижней ступени, в которой есть двигатели, — они работают первыми
export function activeEngineParts(parts) {
  const e = parts.filter(p => isEngine(p.def)), st = Math.max(...e.map(p => p.stage), -1);
  return e.filter(p => p.stage === st);
}
// Δv по ступеням: топливо расходуется с нижних ступеней, пустые ступени отбрасываются
// Момент инерции относительно центра масс и момент сил маховика/двигателей ориентации (двигатели ориентации работают, пока есть топливо)
export function inertiaOf(parts) {
  let m = 0, yc = 0; for (const p of parts) { const pm = p.def.dry + p.fuel; m += pm; yc += pm * p.y; }
  if (!m) return 1; yc /= m; let I = 0;
  for (const p of parts) { const pm = p.def.dry + p.fuel; I += pm * ((p.y - yc) ** 2 + p.x ** 2) + pm * (p.def.h ** 2 + p.def.w ** 2) / 12; }
  return I;
}
export function torqueOf(parts, rcsOn = true) { return parts.reduce((t, p) => t + (p.def.kind === 'rcs' && !rcsOn ? 0 : (p.def.torque || 0)), 0); }
export const isBooster = p => !!p.radial && p.def.kind === 'srb';
// Δv по ступеням (в вакууме). Двигатели ступени сжигают только топливо своей ступени; перелива из верхних ступеней нет.
export function stageDeltaV(allParts, g0 = 9.8) {
  const boost = allParts.filter(isBooster), parts = allParts.filter(p => !isBooster(p)), out = [];
  let m = allParts.reduce((a, p) => a + p.def.dry + p.fuel, 0);
  const fb = boost.reduce((a, p) => a + p.fuel, 0);
  if (fb > 0) { // фаза бустеров: работают вместе с основным двигателем, потом отбрасываются
    const E = [...activeEngineParts(parts), ...boost], th = E.reduce((a, p) => a + p.def.thrust, 0);
    const dv = th > 0 && m > fb ? E.reduce((a, p) => a + p.def.thrust * p.def.isp, 0) / th * g0 * Math.log(m / (m - fb)) : 0;
    out.push({ stage: -1, label: 'бустеры', fuel: fb, thrust: th, dv });
  }
  m -= fb + boost.reduce((a, p) => a + p.def.dry, 0);
  const eng = parts.filter(p => isEngine(p.def)), top = Math.max(0, ...parts.map(p => p.stage));
  for (let s = top; s >= 0; s--) {
    const g = parts.filter(p => p.stage === s), fuel = g.reduce((a, p) => a + p.fuel, 0), dry = g.reduce((a, p) => a + p.def.dry, 0);
    const E = eng.filter(p => p.stage === s), th = E.reduce((a, p) => a + p.def.thrust, 0);
    const dv = fuel > 0 && th > 0 && m > fuel ? E.reduce((a, p) => a + p.def.thrust * p.def.isp, 0) / th * g0 * Math.log(m / (m - fuel)) : 0;
    out.push({ stage: s, label: `ступень ${top - s + 1}`, fuel, thrust: th, dv, engines: E.length, stranded: fuel > 0 && th === 0 });
    m -= fuel + dry;
  }
  return out;
}
export const deltaV = (parts, g0 = 9.8) => stageDeltaV(parts, g0).reduce((a, s) => a + s.dv, 0);
export function stats(design, g0 = 9.8) {
  const { parts } = layout(design);
  const mass = parts.reduce((m, p) => m + p.def.dry + p.fuel, 0), fuel = parts.reduce((m, p) => m + p.fuel, 0);
  const thrust = activeEngineParts(parts).reduce((t, p) => t + p.def.thrust, 0);
  return { mass, fuel, thrust, twr: thrust / (mass * g0), dv: deltaV(parts, g0), alpha: torqueOf(parts) / inertiaOf(parts) };
}
// Список замечаний к чертежу: error блокирует запуск, warn — предупреждение
export function problems(design) {
  const g = graph(design), L = layout(design), out = [], err = text => out.push({ level: 'error', text }), warn = text => out.push({ level: 'warn', text });
  if (!g.d.parts.length) return [{ level: 'error', text: 'Ракета пуста' }];
  if (!g.d.parts.some(p => PARTS[p.id].kind === 'pod')) err('Нужна капсула или зонд');
  if (g.unreached) err(`Есть детали, не соединённые с капсулой: ${g.unreached}`);
  const eng = L.parts.filter(p => isEngine(p.def));
  if (!eng.length) err('Нет двигателей');
  else {
    const fuelOf = s => L.parts.filter(p => p.stage === s && p.def.fuel > 0).reduce((a, p) => a + p.def.fuel, 0), low = Math.max(...eng.map(p => p.stage));
    if (fuelOf(low) <= 0) err('У нижних двигателей нет топлива: бак должен быть в их ступени (между разделителями)');
    for (const s of new Set(eng.map(p => p.stage))) if (s !== low && fuelOf(s) <= 0) warn(`Ступень ${Math.max(...L.parts.map(p => p.stage)) - s + 1}: двигатель без топлива в своей ступени`);
    for (const st of stageDeltaV(L.parts)) if (st.stranded) warn(`${st.label}: есть топливо, но нет двигателя — оно не будет использовано`);
    const sts = stats(design); if (sts.twr < 1) err(`Тяга/вес ${sts.twr.toFixed(2)} < 1 — ракета не взлетит`);
    if (sts.alpha * 57.3 < 0.3) warn('Тяжёлая ракета поворачивается медленно — добавьте двигатели ориентации');
  }
  return out;
}
export function validate(design) { const e = problems(design).find(p => p.level === 'error'); return e ? e.text : null; }

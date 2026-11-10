// Дымовой тест без браузера: подменяет DOM/Canvas, гоняет кадры и жмёт клавиши.  Запуск: node tests/smoke.mjs
const L = {}, CL = {}, store = {}, els = [];
const ctx = new Proxy({}, { get: (t, k) => k in t ? t[k] : k === 'measureText' ? () => ({ width: 50 }) : /^create(Linear|Radial)Gradient$/.test(k) ? () => ({ addColorStop() {} }) : () => {}, set: (t, k, v) => (t[k] = v, true) });
const canvas = { width: 1280, height: 720, getContext: () => ctx, addEventListener: (t, f) => (CL[t] ||= []).push(f), getBoundingClientRect: () => ({ left: 0, top: 0 }) };
const mk = tag => { const el = { width: 300, height: 150, getContext: () => ctx, tag, style: {}, children: [], className: '', id: '', _h: '', append(...a) { this.children.push(...a); }, appendChild(c) { this.children.push(c); return c; }, set innerHTML(v) { this._h = v; this.children = []; }, get innerHTML() { return this._h; } }; els.push(el); return el; };
const body = mk('body');
Object.assign(globalThis, { window: globalThis, innerWidth: 1280, innerHeight: 720, document: { getElementById: id => id === 'c' ? canvas : els.find(e => e.id === id) || null, createElement: mk, body },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } }, addEventListener: (t, f) => (L[t] ||= []).push(f) });
let cb = null; globalThis.requestAnimationFrame = f => { cb = f; return 1; };
let clock = 0; const tick = (n = 1, ms = 16) => { for (let i = 0; i < n; i++) { const f = cb; cb = null; clock += ms; f(clock); } };
const key = (code, up = true) => { L.keydown.forEach(f => f({ code, preventDefault() {} })); if (up) L.keyup.forEach(f => f({ code })); };
const hold = code => L.keydown.forEach(f => f({ code, preventDefault() {} })), release = code => L.keyup.forEach(f => f({ code }));
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log(c ? '  ok ' : '  FAIL', m); };
const errs = () => window.__errors || [];

const W = await import('../src/world.js');
await import('../src/main.js'); const G = globalThis.__game;
const buttons = el => el.children.flatMap(c => c.tag === 'button' ? [c] : buttons(c));
const panel = () => els.findLast(e => e.id === 'vab');
// поместить ракету на высоте alt над телом body с орбитальной (tangent) и радиальной скоростью относительно тела
const place = (body, alt, vt = 0, vr = 0, th = 0, ang = null) => { const r = G.rocket, t = r.t, [bx, by] = body.pos(t), [bvx, bvy] = body.vel(t), R = body.R + alt + r.refH / 2;
  Object.assign(r, { landedOn: null, state: 'flying', x: bx + R * Math.sin(th), y: by + R * Math.cos(th), vx: bvx + Math.cos(th) * vt + Math.sin(th) * vr, vy: bvy - Math.sin(th) * vt + Math.cos(th) * vr, angle: ang ?? th, angVel: 0, throttle: 0 }); };

tick(5); ok(!errs().length, 'ангар рисуется без ошибок');
ok(G.menuOpen, 'главное меню показано'); els.find(e => e.className === 'play').onclick(); ok(!G.menuOpen, '«Играть» закрывает меню');
const V = window.__vab, P0 = () => V.design.parts.length;
const byLabel = l => buttons(panel()).find(b => b.label === l), tool = l => { const b = byLabel(l); if (!b) throw new Error('нет кнопки ' + l); b.onclick(); tick(1); };
const ptr = (type, x, y) => (type === 'down' ? CL.pointerdown : type === 'move' ? L.pointermove : L.pointerup).forEach(f => f({ clientX: x, clientY: y, button: 0, preventDefault() {} }));
const world = (x, y) => [V.view.ox + x * V.view.s, V.view.oy + y * V.view.s];
const dragCard = (name, to, release = true) => { const c = byLabel(name); if (!c) throw new Error('нет карточки ' + name); c.onpointerdown({ clientX: 150, clientY: 220, preventDefault() {} }); ptr('move', 400, 260); ptr('move', to[0], to[1]); if (release) { ptr('up', to[0], to[1]); tick(2); } };
const clickCard = name => { byLabel(name).onpointerdown({ clientX: 150, clientY: 220, preventDefault() {} }); ptr('up', 150, 220); tick(2); };

// --- случайные нажатия по всей панели ангара (ничего не должно падать)
for (let i = 0; i < 160; i++) { const b = buttons(panel()); const t = b[Math.floor(Math.random() * b.length)]; if (t.onclick) t.onclick(); else if (t.onpointerdown) { t.onpointerdown({ clientX: 150, clientY: 220, preventDefault() {} }); ptr('move', 600 + Math.random() * 300, 150 + Math.random() * 300); ptr('up', 700, 300); } if (i % 8 === 0) { ptr('down', 600 + Math.random() * 300, 150 + Math.random() * 400); ptr('move', 650, 300); ptr('up', 650, 300); } tick(1); }
ok(!errs().length, 'случайные нажатия и перетаскивания в ангаре: без ошибок' + (errs()[0] ? ' — ' + errs()[0] : ''));

// --- свободная сборка мышью
byLabel('Детали').onclick(); tick(1); if (!V.sym) byLabel('Симметрия: выкл').onclick(); ok(V.sym, 'симметрия включена'); tool('Очистить'); ok(P0() === 0, 'чертёж очищен');
tool('Капсулы'); dragCard('Капсула', [800, 300]); ok(P0() === 1, 'первая деталь ставится куда угодно');
tool('Баки'); dragCard('Бак большой', world(0.2, 1.25 + 4)); ok(P0() === 2 && V.design.links.length === 1, 'бак притягивается к нижнему узлу капсулы');
tool('Двигатели'); dragCard('Двигатель «Бизон»', world(0, 1.25 + 8 + 1.5)); ok(P0() === 3, 'двигатель прикрепляется под баком');
tool('Оборудование'); dragCard('Опора (пара)', world(1.8, 5.25)); ok(P0() === 5 && V.design.links.filter(l => l[2] === 's').length === 2, 'радиальная деталь ставится парой (симметрия) к боку бака');
ok(problems_ok(V.design), 'собранная ракета проходит проверку');
tool('Капсулы'); dragCard('Зонд', world(0, -3)); ok(P0() === 5 && /Капсула \(или зонд\) уже есть/.test(V.msg), 'зонд тоже считается капсулой: вторую поставить нельзя');
function problems_ok(d) { return window.__problems(d).filter(p => p.level === 'error').length === 0; }
const n0 = P0(); tool('Баки'); dragCard('Бак малый', [1000, 560]); ok(P0() === n0 && /прикрепить/.test(V.msg), 'деталь вдали от ракеты не ставится: «нужно прикрепить»');
tool('Двигатели'); dragCard('Двигатель «Шмель»', world(0, -1.25 - 1)); ok(P0() === n0, 'двигатель нельзя поставить над капсулой (у капсулы нет верхнего узла)');
tool('Баки'); dragCard('Бак средний', world(0, 1.25 + 8 + 3)); ok(P0() === n0, 'на занятый узел вторую деталь не поставить (пересечение запрещено)');
tool('Капсулы'); dragCard('Капсула', world(0, -4)); ok(P0() === n0 && /уже есть/.test(V.msg), 'капсула может быть только одна');
{ const before = V.design.parts.map(p => [p.x, p.y]); const [tx, ty] = world(0.2, 1.25 + 4); ptr('down', tx, ty); ptr('move', tx + 60, ty + 20); ptr('move', tx + 400, ty + 140); ptr('up', tx + 400, ty + 140); tick(2);
  ok(V.design.parts.every((p, i) => p.x === before[i][0] && p.y === before[i][1]), 'деталь с присоединённым, брошенная вдали, возвращается на место'); }
{ const x0 = V.design.parts[0].x, [px, py] = world(0, 0); ptr('down', px, py); ptr('move', px + 20, py); ptr('move', px + 60, py + 10); ptr('up', px + 60, py + 10); tick(2); ok(Math.abs(V.design.parts[0].x - x0 - 60 / V.view.s) < 1e-6 && P0() === n0, 'перетаскивание капсулы сдвигает всю ракету целиком'); }
{ const [tx, ty] = world(V.design.parts[1].x, V.design.parts[1].y); ptr('down', tx, ty); ptr('up', tx, ty); tick(1); ok(V.sel === V.design.parts[1].u, 'клик выбирает деталь'); key('Delete'); tick(1); ok(P0() === 1, 'Del удаляет деталь вместе с тем, что к ней присоединено'); L.keydown.forEach(f => f({ code: 'KeyZ', ctrlKey: true, preventDefault() {} })); tick(1); ok(P0() === n0, 'Ctrl+Z возвращает удалённое'); }
// --- новые детали и свободное крепление
tool('Очистить'); tool('Баки'); dragCard('Бак широкий', [800, 330]); ok(P0() === 1, 'первой деталью может быть любая, например широкий бак');
tool('Конструкции'); dragCard('Обтекатель', world(0, -3 - 1.75)); ok(P0() === 2 && V.design.links.length === 1, 'обтекатель крепится сверху на бак (у него только нижний узел)');
dragCard('Переходник 3 → 1,8 м', world(0, 3 + 0.75)); ok(P0() === 3, 'переходник крепится снизу бака');
tool('Баки'); dragCard('Бак узкий', world(0, 3 + 1.5 + 2.5)); ok(P0() === 4, 'узкий бак продолжает ракету ниже переходника');
tool('Двигатели'); dragCard('Ионный «Луч»', world(0, 3 + 1.5 + 5 + 0.7)); ok(P0() === 5, 'ионный двигатель крепится снизу');
tool('Двигатели'); dragCard('Двигатель «Стриж»', world(2.25 + 0.7, 1.8)); ok(P0() === 7, 'двигатель можно прикрепить радиально к боку бака — парой');
tool('Оборудование'); dragCard('Солнечная панель (пара)', world(2.25 + 0.15, -1.5)); ok(P0() === 9, 'солнечные панели крепятся к боку');
tool('Ускорители'); dragCard('Ускоритель малый', world(0.9 + 0.45, 7)); ok(P0() === 11 && !errs().length, 'малый ускоритель крепится к боку узкого бака' + (errs()[0] ? ' — ' + errs()[0] : ''));
tool('Очистить'); tool('Капсулы'); clickCard('Капсула'); tool('Баки'); clickCard('Бак малый'); tool('Двигатели'); clickCard('Двигатель «Шмель»'); ok(P0() === 3 && window.__problems(V.design).every(p => p.level !== 'error'), 'клик по каталогу добавляет деталь автоматически (капсула — бак — двигатель)');
// --- чертежи
byLabel('Чертежи').onclick(); tick(1); V.nameInput.value = 'тест-ракета'; V.nameInput.oninput(); tool('Сохранить'); ok(V.bps().some(b => b.name === 'тест-ракета'), 'чертёж сохраняется под именем');
tool('Очистить'); byLabel('Чертежи').onclick(); tick(1); byLabel('тест-ракета').onclick(); tick(2); ok(P0() === 3, 'сохранённый чертёж загружается');
buttons(panel()).filter(b => b.label === '×').forEach((b, i, all) => { if (i === 0 && V.bps()[0].name === 'тест-ракета') b.onclick(); }); ok(!V.bps().some(b => b.name === 'тест-ракета'), 'чертёж удаляется');
byLabel('Лунная').onclick(); tick(2); ok(P0() > 10, 'шаблон загружается'); ok(!errs().length, 'сборка, чертежи, шаблоны: без ошибок' + (errs()[0] ? ' — ' + errs()[0] : ''));
els.find(e => e.id === 'vab-go').onclick(); ok(G.mode === 'flight', 'запуск из ангара');
key('KeyH'); ok(G.helpOpen, 'H открывает справку'); key('KeyH'); ok(!G.helpOpen, 'H закрывает справку'); key('KeyH'); key('Escape'); ok(!G.helpOpen, 'Esc закрывает справку'); key('KeyN');
// --- меню паузы и главное меню
key('Escape'); ok(G.pauseOpen && G.paused, 'Esc в полёте открывает меню паузы'); const t1 = G.rocket.t; tick(30); ok(G.rocket.t === t1, 'на паузе время не идёт');
els.find(e => e.className === 'resume' && e.n && els.indexOf(e) > els.findIndex(x => x.id === 'pause')).onclick(); ok(!G.pauseOpen && !G.paused, '«Продолжить» возвращает в игру');
key('Escape'); els.find(e => e.className === 'tomenu').onclick(); ok(G.menuOpen && !G.pauseOpen && G.paused, '«Главное меню» из паузы');
ok(els.find(e => e.className === 'resume').style.display !== 'none', 'в меню есть «Продолжить игру», пока идёт полёт'); els.find(e => e.className === 'resume').onclick(); ok(!G.menuOpen && !G.paused && G.mode === 'flight', '«Продолжить игру» возвращает в полёт');
key('Escape'); els.find(e => e.className === 'tovab').onclick(); ok(G.mode === 'vab' && !G.paused && !G.pauseOpen, '«Вернуться к сборке» из паузы'); tick(2);
key('Escape'); ok(G.menuOpen, 'Esc в ангаре открывает главное меню'); key('Escape'); ok(!G.menuOpen && G.mode === 'flight', 'Esc в меню при идущем полёте продолжает игру'); tick(3);

// --- старт и подъём, SAS, карта, узлы
key('KeyZ'); tick(1500); const r = G.rocket; 
key('Space'); ok(r.state === 'flying', 'отделение ступени в полёте'); ok(r.refH < 40, `габариты пересчитаны после отделения (${r.refH.toFixed(1)} м)`); tick(60);
for (let i = 0; i < 6; i++) key('KeyT'); tick(20); hold('KeyD'); tick(30); release('KeyD'); tick(20);
key('KeyM'); tick(10); key('Digit1'); tick(5); key('Digit2'); tick(5); hold('ArrowUp'); tick(20); release('ArrowUp'); hold('PageUp'); tick(10); release('PageUp'); key('KeyW'); tick(10);
for (let i = 0; i < 15; i++) { key('Tab'); tick(4); } key('KeyC'); CL.pointerdown.forEach(f => f({ clientX: 10, clientY: 10 })); CL.pointermove.forEach(f => f({ clientX: 60, clientY: 40 })); L.pointerup.forEach(f => f({}));
CL.wheel.forEach(f => f({ deltaY: -1, preventDefault() {} })); tick(5); key('Digit0'); key('KeyM'); key('KeyP'); key('Escape'); tick(3); key('Escape'); ok(!G.pauseOpen, 'повторный Esc закрывает меню паузы');
for (let i = 0; i < 11; i++) key('Period'); tick(100); key('KeyV'); key('KeyX');
ok(!errs().length, 'полёт, SAS, карта всех тел, узлы, масштаб, пауза: без ошибок' + (errs()[0] ? ' — ' + errs()[0] : '')); ok(Number.isFinite(r.x) && Number.isFinite(r.y), 'координаты конечны');

// --- орбита Земли, warp к узлу, достижения
{ const R = W.EARTH.R + 120000, v = Math.sqrt(W.EARTH.mu / R); G.rocket.parts.forEach(p => p.fuel = p.def.fuel * 0.5); place(W.EARTH, 120000, v, 0, 0, Math.PI / 2); }
key('KeyM'); key('Digit2'); tick(5); const t0 = G.rocket.t; key('KeyW'); tick(200); ok(G.rocket.t - t0 > 100, `warp к узлу сдвинул время (+${(G.rocket.t - t0).toFixed(0)} с)`);
ok(G.missions.done.has('orbit'), 'достижение «Орбита» получено'); key('KeyM'); ok(!errs().length, 'орбита и warp: без ошибок');
{ const t1 = G.rocket.t; key('Period'); key('Period'); key('Period'); key('Period'); key('Period'); key('Period'); key('Period'); key('Period'); key('Period'); key('Period'); key('Period'); tick(200); ok(G.rocket.t - t1 > 5e4 && G.curWarp > 1e4, `высокое ускорение времени работает (x${Math.round(G.curWarp)}, +${(G.rocket.t - t1).toExponential(1)} с)`); key('KeyV'); }

// --- Луна: вход в SOI, посадка на ровную площадку
place(W.MOON, 80000, 300, 0, 0.4, 0); tick(20); ok(G.rocket.dom === W.MOON && G.missions.done.has('soi'), 'у Луны доминирует её сфера влияния, достижение получено');
key('KeyM'); tick(10); key('KeyM'); place(W.MOON, 12, 0, 0, 0, 0); tick(500); ok(['landed', 'crashed'].includes(G.rocket.state), `контакт с Луной обработан (${G.rocket.state})`);
// --- Марс
key('KeyR'); tick(2); place(W.MARS, 200000, 400, 0, 0.3, 0); tick(20); ok(G.rocket.dom === W.MARS && G.missions.done.has('msoi'), 'у Марса доминирует его сфера влияния, достижение «Красная планета»');
place(W.MARS, 15, 0, 0, 0, 0); tick(600); ok(['landed', 'crashed'].includes(G.rocket.state), `контакт с Марсом обработан (${G.rocket.state})`);
// --- Солнечная орбита и дальние планеты (рисуем без ошибок)
key('KeyR'); tick(2); place(W.SUN, 5e9, Math.sqrt(W.SUN.mu / (W.SUN.R + 5e9)), 0, 0.2); tick(20); key('KeyM'); tick(10); key('KeyM');
for (const b of [W.JUPITER, W.SATURN, W.NEPTUNE, W.TITAN, W.IO]) { place(b, b.R * 2, Math.sqrt(b.mu / (3 * b.R)), 0, 0.5); tick(15); key('KeyM'); G.ref = b; G.mapZoom = null; tick(8); key('KeyM'); }
ok(!errs().length, 'Марс, Солнце и дальние планеты: без ошибок' + (errs()[0] ? ' — ' + errs()[0] : ''));
// --- падение на Землю: крушение, взрыв, перезапуск
key('KeyR'); tick(2); place(W.EARTH, 300, 0, -200, 0, 0); tick(150); ok(G.rocket.state === 'crashed', 'крушение зафиксировано'); tick(60);
key('KeyR'); tick(5); key('Space'); ok(/поверхности/.test(G.msg), 'на поверхности ступень отделить нельзя'); key('KeyB'); tick(5); ok(G.mode === 'vab', 'возврат в ангар');
ok(!errs().length, 'крушение, перезапуск, ангар: без ошибок' + (errs()[0] ? ' — ' + errs()[0] : ''));
console.log(fails.length ? `\nПРОВАЛЕНО: ${fails.length}` : '\nВСЕ ПРОВЕРКИ ПРОЙДЕНЫ'); process.exit(fails.length ? 1 : 0);

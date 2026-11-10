import { LIST } from './missions.js';

// Экранные меню (DOM): главное меню, меню паузы, справка. Логика Esc:
//  в полёте — меню паузы (продолжить / к сборке / главное меню); в ангаре — главное меню; в меню с полётом — продолжить.
export function createUi(game, hooks) {
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const item = (cls, label, fn) => { const b = mk('button', cls), n = mk('span', 'n', ''), t = mk('span', 't', label); b.label = label; b.n = n; b.t = t; b.append(n, t); b.onclick = fn; return b; };
  const number = list => { let i = 1; for (const b of list) if (b.style.display !== 'none') b.n.textContent = String(i++).padStart(2, '0'); };

  // ---- справка
  const help = mk('div'); help.id = 'help'; document.body.appendChild(help);
  function showHelp(on) {
    game.helpOpen = on; help.style.display = on ? 'block' : 'none'; if (!on) return;
    const ach = LIST.map(m => `<li class="${hooks.missions.done.has(m.id) ? 'ok' : ''}"><span class="mk">${hooks.missions.done.has(m.id) ? '[×]' : '[ ]'}</span> <b>${m.name}</b><span class="ds"> — ${m.desc}</span></li>`).join('');
    help.innerHTML = `<div class="h-head"><span>СПРАВКА</span><span class="h-x">H или Esc — закрыть</span></div><div class="h-cols">
<div><h3>Полёт</h3><dl><dt>Z / X</dt><dd>газ полный / выключить</dd><dt>Shift / Ctrl</dt><dd>газ плавно + / −</dd><dt>A / D</dt><dd>поворот</dd><dt>Пробел</dt><dd>отделить ступень (сначала бустеры)</dd><dt>P</dt><dd>раскрыть парашют</dd><dt>U</dt><dd>раскрыть / убрать солнечные панели</dd><dt>T</dt><dd>SAS: удержание, по скорости, против, автоподъём</dd><dt>, .</dt><dd>ускорение времени; V — сброс</dd><dt>колесо</dt><dd>масштаб</dd><dt>Esc</dt><dd>меню паузы</dd><dt>R / B</dt><dd>заново / в ангар</dd><dt>N</dt><dd>звук вкл/выкл</dd></dl>
<h3>Карта (M)</h3><dl><dt>Tab</dt><dd>сменить тело</dd><dt>перетаскивание</dt><dd>сдвиг; C — центр</dd><dt>1 / 2</dt><dd>узел в апо- / перицентре</dd><dt>стрелки</dt><dd>Δv прогрейд / радиал (Shift ×10)</dd><dt>PgUp / PgDn</dt><dd>время узла</dd><dt>W</dt><dd>ускорить время до узла</dd><dt>0</dt><dd>убрать узел</dd></dl>
<h3>Ангар</h3><dl><dt>перетащить деталь</dt><dd>из каталога на ракету; она прикрепится к ближайшему узлу</dd><dt>клик по детали</dt><dd>выбрать; Del — удалить с тем, что под ней</dd><dt>тянуть деталь</dt><dd>переставить вместе с присоединённым</dd><dt>Ctrl+Z</dt><dd>отменить</dd></dl></div>
<div><h3>Достижения</h3><ul class="ach">${ach}</ul><h3>Заметки инженера</h3><ul class="tips"><li>Каждая ступень тратит только своё топливо. Бак должен быть между разделителями вместе с двигателем.</li><li>Орбита Земли: боковая скорость ≈ 2,4 км/с на высоте 100 км.</li><li>К Луне: узел в перицентре, прогрейд ≈ +900 м/с.</li><li>К Марсу: покинь Землю (≈ +1,1 км/с), дождись окна запуска (W — ускорить до узла).</li><li>Тяжёлая ракета поворачивается медленно — добавь двигатели ориентации.</li><li>Голубая линия — путь вперёд без тяги: стрелки показывают направление, красный крестик — место удара.</li><li>Ракета всегда в настоящем размере; когда она слишком мала, вместо неё белый треугольник.</li><li>Гравитацию создают все близкие тела: Солнце, планеты, спутники.</li><li>Мягкая посадка: парашют и опоры, скорость ниже ~10 м/с.</li></ul></div></div>`;
  }

  // ---- главное меню
  const menu = mk('div'); menu.id = 'menu'; document.body.appendChild(menu);
  const left = mk('div', 'm-left'), planet = mk('div', 'm-planet'), title = mk('h1');
  title.append(mk('span', null, 'SPACE'), mk('span', null, 'FLIGHT'));
  const bResume = item('resume', 'Продолжить игру', () => { closeMenu(); hooks.resume(); });
  const bPlay = item('play', 'Играть', () => { closeMenu(); if (game.mode === 'flight') hooks.toVab(); });
  const bHelp = item('help', 'Справка и управление', () => showHelp(true));
  const bReset = item('danger', 'Сбросить прогресс', () => {
    if (typeof confirm !== 'undefined' && !confirm('Удалить сохранённые чертежи и достижения?')) return;
    try { ['sfs_clone_bp', 'sfs_clone_design2', 'sfs_clone_slots', 'sfs_clone_missions', 'sfs_clone_design'].forEach(k => localStorage.removeItem(k)); } catch {}
    if (typeof location !== 'undefined') location.reload();
  });
  const list = mk('div', 'm-list'); list.append(bResume, bPlay, bHelp, bReset);
  left.append(mk('div', 'm-kicker', 'Симулятор космических полётов'), title, mk('p', 'm-sub', 'Собери ракету. Выйди на орбиту. Долети до Луны, Марса и дальше.'), list, mk('div', 'm-foot', 'версия 0.9   ·   H — справка   ·   Esc — меню'));
  menu.append(planet, left);
  function refreshMenu() { const fl = hooks.hasFlight(); bResume.style.display = fl ? '' : 'none'; bPlay.t.textContent = fl ? 'К сборке ракеты' : 'Играть'; bPlay.label = bPlay.t.textContent; number([bResume, bPlay, bHelp, bReset]); }
  function closeMenu() { game.menuOpen = false; menu.style.display = 'none'; }
  function openMenu() { closePause(true); game.menuOpen = true; menu.style.display = 'flex'; refreshMenu(); if (game.mode === 'flight') game.paused = true; }

  // ---- меню паузы
  const pause = mk('div'); pause.id = 'pause'; document.body.appendChild(pause);
  const box = mk('div', 'p-box'), plist = mk('div', 'm-list');
  const pResume = item('resume', 'Продолжить игру', () => closePause());
  const pBuild = item('tovab', 'Вернуться к сборке', () => { closePause(true); game.paused = false; hooks.toVab(); });
  const pMenu = item('tomenu', 'Главное меню', () => openMenu());
  const pHelp = item('help', 'Справка', () => showHelp(true));
  plist.append(pResume, pBuild, pMenu, pHelp); number([pResume, pBuild, pMenu, pHelp]);
  box.append(mk('div', 'p-head', 'ПАУЗА'), plist, mk('div', 'p-foot', 'Esc — продолжить'));
  pause.append(box);
  function openPause() { game.pauseOpen = true; game.paused = true; pause.style.display = 'flex'; }
  function closePause(keepPaused) { game.pauseOpen = false; pause.style.display = 'none'; if (!keepPaused) game.paused = false; }

  function escape() {
    if (game.helpOpen) return showHelp(false);
    if (game.vabBusy) return;
    if (game.menuOpen) { if (hooks.hasFlight()) { closeMenu(); hooks.resume(); } return; }
    if (game.pauseOpen) return closePause();
    if (game.mode === 'flight') return openPause();
    if (game.mode === 'vab') openMenu();
  }
  menu.style.display = 'flex'; game.menuOpen = true; refreshMenu();
  return { showHelp, openMenu, closeMenu, openPause, closePause, escape, refreshMenu };
}

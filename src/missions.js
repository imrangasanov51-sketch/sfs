import { EARTH, SUN, MOON, MARS } from './world.js';
// Достижения: проверяются каждый кадр, прогресс хранится в браузере.
export const LIST = [
  { id: 'hop', name: 'Первый прыжок', desc: 'Поднимись на 1 км', test: c => c.body === EARTH && c.alt > 1000 },
  { id: 'space', name: 'Космос', desc: 'Пересеки границу атмосферы (30 км)', test: c => c.body === EARTH && c.alt > 30000 },
  { id: 'orbit', name: 'Орбита', desc: 'Выйди на орбиту Земли', test: c => c.body === EARTH && c.o.pe > 30000 && isFinite(c.o.ap) },
  { id: 'soi', name: 'Лунные пределы', desc: 'Войди в сферу влияния Луны', test: c => c.body === MOON },
  { id: 'lorbit', name: 'Орбита спутника', desc: 'Выйди на орбиту вокруг Луны или другого спутника', test: c => c.body.kind === 'moon' && c.o.pe > 0 && isFinite(c.o.ap) },
  { id: 'moonland', name: 'Лунная посадка', desc: 'Мягко сядь на Луну', test: c => c.state === 'landed' && c.landedOn === MOON },
  { id: 'helio', name: 'Орбита вокруг Солнца', desc: 'Покинь Землю и выйди на гелиоцентрическую орбиту', test: c => c.body === SUN && c.o.pe > SUN.R && isFinite(c.o.ap) },
  { id: 'msoi', name: 'Красная планета', desc: 'Войди в сферу влияния Марса', test: c => c.body === MARS },
  { id: 'mland', name: 'Посадка на Марс', desc: 'Мягко сядь на Марс', test: c => c.state === 'landed' && c.landedOn === MARS },
  { id: 'return', name: 'Возвращение', desc: 'Вернись на Землю после полёта в космос', test: c => c.state === 'landed' && c.landedOn === EARTH && c.flags.space },
];
export class Missions {
  constructor() { this.flags = { space: false }; try { this.done = new Set(JSON.parse(localStorage.getItem('sfs_clone_missions')) || []); } catch { this.done = new Set(); } }
  reset() { this.flags = { space: false }; }
  check(r, o) {
    if (r.dom === EARTH && r.alt > 30000) this.flags.space = true;
    const c = { body: r.dom, alt: r.alt, o, state: r.state, landedOn: r.landedOn, flags: this.flags }, fresh = [];
    for (const m of LIST) if (!this.done.has(m.id) && m.test(c)) { this.done.add(m.id); fresh.push(m); }
    if (fresh.length) try { localStorage.setItem('sfs_clone_missions', JSON.stringify([...this.done])); } catch {}
    return fresh;
  }
}

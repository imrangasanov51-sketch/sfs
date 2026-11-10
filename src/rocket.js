import { G0, MAX_TURN_RATE } from './config.js';
import { EARTH, dominant } from './world.js';
import { advance } from './physics.js';
import { layout, isEngine, deltaV, isBooster, inertiaOf, torqueOf } from './parts.js';

export class Rocket {
  constructor(design) {
    const L = layout(design);
    this.design = design; this.parts = L.parts; this.refH = L.height; this.width = L.width;
    this.refreshCaches(); this.fuel0 = this.fuelTotal; this.stagesTotal = Math.max(0, ...this.parts.map(p => p.stage)) + 1;
    const [ex, ey] = EARTH.pos(0), [evx, evy] = EARTH.vel(0), top = EARTH.R + this.refH / 2;
    Object.assign(this, { x: ex, y: ey + top, vx: evx, vy: evy, t: 0, angle: 0, angVel: 0, throttle: 0, cutThrottle: 0, state: 'landed', chuteK: 0, chuteOn: false, chuteLost: false, legK: 0, solarK: 0, solarOn: false, turn: 0, landedOn: EARTH, off: [0, top] });
  }
  get mass() { return this.parts.reduce((m, p) => m + p.def.dry + p.fuel, 0); }
  get fuelTotal() { return this.parts.reduce((m, p) => m + p.fuel, 0); }
  get maxStage() { return Math.max(0, ...this.parts.map(p => p.stage)); }
  get baseArea() { return Math.PI / 4 * this.width * this.width; }
  get chuteArea() { return this.chuteK * this.parts.reduce((a, p) => a + (p.def.chuteArea || 0), 0); }
  get area() { return this.baseArea + this.chuteArea; }
  get cd() { return ((this._cone ? 0.28 : 0.4) * this.baseArea + 1.6 * this.chuteArea) / this.area; } // обтекатель сверху снижает сопротивление
  get hasChute() { return this.chuteOn || this.chuteLost || this.parts.some(p => p.def.chuteArea); }
  refreshCaches() { const k = this.parts.map(p => p.def.kind); this._legs = k.includes('leg'); this._solar = k.includes('solar'); this._cone = k.includes('cone'); this._rcs = k.filter(x => x === 'rcs').length; }
  get hasLegs() { return this._legs; }
  get hasSolar() { return this._solar; }
  toggleSolar() { if (!this._solar) return false; this.solarOn = !this.solarOn; return true; }
  get inertia() { return inertiaOf(this.parts); }
  get torque() { return torqueOf(this.parts, this.fuelTotal > 0); }
  get alpha() { return this.torque / Math.max(1, this.inertia); } // угловое ускорение, рад/с² — чем тяжелее ракета, тем медленнее поворот
  deployChute() { // раскрыть парашют (один раз)
    if (this.chuteOn || this.chuteLost || !this.parts.some(p => p.def.chuteArea)) return false;
    this.chuteOn = true; return true;
  }
  get dom() { return dominant(this.x, this.y, this.t); }
  get alt() { const b = this.dom, [bx, by] = b.pos(this.t); return Math.hypot(this.x - bx, this.y - by) - b.R - this.refH / 2; }
  get agl() { const b = this.dom, [bx, by] = b.pos(this.t), dx = this.x - bx, dy = this.y - by; return Math.hypot(dx, dy) - b.R - b.terrain(Math.atan2(dx, dy)) - this.refH / 2; } // высота над рельефом
  get stageNumber() { return this.stagesTotal - this.stageNo; } // номер работающей ступени по порядку включения (1 — нижняя)
  get stageHint() { if (this.parts.some(isBooster)) return 'бустеры'; return this.maxStage > 0 ? `ступень ${this.stageNumber}` : 'нет'; }
  get speed() { const b = this.dom, [vx, vy] = b.vel(this.t); return Math.hypot(this.vx - vx, this.vy - vy); }
  get physProps() { return { mass: this.mass, cd: this.cd, area: this.area }; }
  get dvLeft() { return deltaV(this.parts); }
  get twr() { // тяга/вес при полном газе у текущего тела
    const b = this.dom, [bx, by] = b.pos(this.t), r = Math.hypot(this.x - bx, this.y - by);
    const th = this.stageFuel > 0 ? this.activeEngines.reduce((a, p) => a + p.def.thrust, 0) : 0;
    return th / (this.mass * b.mu / (r * r));
  }
  get press() { const b = this.dom; if (!b.atm) return 0; const a = this.alt; return a > b.atm.h ? 0 : Math.exp(-Math.max(0, a) / b.atm.scaleH); }
  get lowWarp() { const b = this.dom; return this.alt < (b.atm ? b.atm.h : 10000); } // у поверхности время ускорять нельзя
  get engines() { return this.parts.filter(p => isEngine(p.def)); }
  get activeEngines() { // работает самая нижняя ступень, в которой есть двигатель
    const e = this.engines, s = Math.max(...e.map(p => p.stage));
    return e.filter(p => p.stage === s);
  }

  stage() { // сначала отбрасываются бустеры, затем нижние ступени; возвращает отброшенные детали или null
    const boost = this.parts.filter(isBooster);
    if (boost.length) { this.parts = this.parts.filter(p => !isBooster(p)); this.reframe(); return boost; }
    const s = this.maxStage; if (s === 0) return null;
    const dropped = this.parts.filter(p => p.stage === s); this.parts = this.parts.filter(p => p.stage < s); this.reframe();
    if (this.cutThrottle > 0) { this.throttle = this.cutThrottle; this.cutThrottle = 0; } // двигатель заглох из-за пустой ступени: после отделения газ возвращается
    return dropped;
  }
  // После отделения меняются высота и ширина ракеты: пересчитываем габариты и сдвигаем центр так, чтобы оставшиеся детали не сдвинулись в мире
  reframe() {
    const oldH = this.refH, newH = Math.max(...this.parts.map(p => p.y + p.def.h / 2));
    this.width = Math.max(...this.parts.map(p => 2 * Math.abs(p.x) + p.def.w));
    this.refreshCaches(); const d = (oldH - newH) / 2; this.refH = newH; this.x += Math.sin(this.angle) * d; this.y += Math.cos(this.angle) * d;
  }
  consumeAny(amount) { // топливо для двигателей ориентации берётся из любых баков, начиная с нижних
    for (const p of [...this.parts].sort((a, b) => (isBooster(b) - isBooster(a)) || (b.stage - a.stage))) {
      if (amount <= 0) break; const d = Math.min(p.fuel, amount); p.fuel -= d; amount -= d;
    }
  }
  get stageNo() { const e = this.engines; return e.length ? Math.max(...e.map(p => p.stage)) : this.maxStage; } // ступень, двигатели которой работают сейчас
  get stagePool() { const st = this.stageNo; return this.parts.filter(p => p.stage === st && p.def.kind === 'tank'); } // баки текущей ступени
  get stageFuel() { const st = this.stageNo; return this.parts.filter(p => p.stage === st && p.def.fuel > 0).reduce((a, p) => a + p.fuel, 0); }
  get stageFuelMax() { const st = this.stageNo; return this.parts.filter(p => p.stage === st && p.def.fuel > 0).reduce((a, p) => a + p.def.fuel, 0); }
  // Тяга за шаг dt и расход топлива. Двигатели ступени берут топливо ТОЛЬКО из баков своей ступени (между разделителями);
  // бустеры сжигают собственное топливо. Пока ступень не отделена, топливо верхних ступеней не трогается.
  burn(dt) {
    if (this.throttle <= 0) { if (this._burning) { for (const p of this.parts) p.active = false; this._burning = false; } return 0; }
    this._burning = true; for (const p of this.parts) p.active = false;
    const eng = this.activeEngines, tanks = this.stagePool, th = this.throttle, pr = this.press, ispOf = d => d.isp + ((d.ispSL ?? d.isp) - d.isp) * pr;
    let pool = tanks.reduce((a, p) => a + p.fuel, 0), thrust = 0, needPool = 0, thrustPool = 0;
    for (const e of eng) {
      const f = e.def.thrust * th; if (f <= 0) continue; const m = f / (ispOf(e.def) * G0) * dt;
      if (e.def.fuel > 0) { if (e.fuel <= 0) continue; const use = Math.min(m, e.fuel); e.fuel -= use; thrust += f * use / m; e.active = true; }
      else { if (pool <= 0) continue; needPool += m; thrustPool += f; e.active = true; }
    }
    if (needPool > 0) { const take = Math.min(needPool, pool); thrust += thrustPool * take / needPool; let left = take; for (const p of tanks) { const d = Math.min(p.fuel, left); p.fuel -= d; left -= d; if (left <= 0) break; } pool -= take; }
    if (!eng.some(e => e.def.fuel > 0 ? e.fuel > 1e-9 : pool > 1e-9)) { if (th > 0) this.cutThrottle = th; this.throttle = 0; } // у ступени кончилось топливо — двигатели глохнут
    return thrust;
  }
  // Вращение: угловая скорость стремится к заданной, но не быстрее, чем позволяют момент сил и инерция
  rotate(dt, cmd) {
    if (this.landedOn) { this.angVel = 0; this.turn = 0; return; }
    if (!cmd && this.angVel === 0) { this.turn = 0; return; } // нечего считать
    const alpha = this.alpha, target = Math.max(-1, Math.min(1, cmd || 0)) * MAX_TURN_RATE, dw = target - this.angVel, lim = alpha * dt;
    const d = Math.max(-lim, Math.min(lim, dw)); this.angVel += d; this.angle += this.angVel * dt;
    this.turn = Math.abs(d) > 1e-9 ? Math.sign(d) : 0; // для анимации/частиц двигателей ориентации
    const nr = this._rcs;
    if (this.turn && nr && this.fuelTotal > 0) this.consumeAny(0.1 * nr * dt);
  }
  step(dt, input) {
    if (this.state === 'crashed') { this.t += dt; this.follow(); return; }
    this.rotate(dt, input.rotate);
    if (this._solar) this.solarK = Math.max(0, Math.min(1, this.solarK + (this.solarOn ? 1 : -1) * dt / 2.5)); // раскрытие панелей ~2,5 с
    if (this.hasLegs) { const want = this.landedOn || this.agl < 300 ? 1 : 0; this.legK = Math.max(0, Math.min(1, this.legK + Math.sign(want - this.legK) * dt / 1.2)); }
    if (this.chuteOn && !this.chuteLost) { // парашют раскрывается 3 с; при большом скоростном напоре его срывает
      const b = this.dom, alt = this.alt;
      if (b.atm && alt < b.atm.h) {
        const rho = b.atm.rho0 * Math.exp(-Math.max(0, alt) / b.atm.scaleH);
        if (this.chuteK < 1) { if (0.5 * rho * this.speed ** 2 > 10000) { this.chuteLost = true; this.chuteK = 0; this.parts = this.parts.filter(p => !p.def.chuteArea); } else this.chuteK = Math.min(1, this.chuteK + dt / 3); }
      }
    }
    const thrust = this.burn(dt);
    if (this.landedOn) {
      const b = this.landedOn, g = b.mu / Math.hypot(this.off[0], this.off[1]) ** 2;
      if (this.state === 'crashed' || thrust / (this.mass * g) < 1) { this.t += dt; this.follow(); return; }
      this.landedOn = null; this.state = 'flying';
    }
    const b = advance(this, dt, this.mass, this.cd, this.area, thrust * Math.sin(this.angle), thrust * Math.cos(this.angle));
    const [bx, by] = b.pos(this.t), [bvx, bvy] = b.vel(this.t), dx = this.x - bx, dy = this.y - by, r = Math.hypot(dx, dy), floor = b.R + b.terrain(Math.atan2(dx, dy)) + this.refH / 2;
    if (r < floor) {
      const vn = ((this.vx - bvx) * dx + (this.vy - bvy) * dy) / r, loc = Math.atan2(dx, dy);
      const tilt = Math.abs(Math.atan2(Math.sin(this.angle - loc), Math.cos(this.angle - loc)));
      this.landedOn = b; this.off = [dx / r * floor, dy / r * floor];
      const legs = this.hasLegs;
      if (vn < -(legs ? 16 : 10) || tilt > (legs ? 0.7 : 0.5)) { this.state = 'crashed'; this.throttle = 0; } else this.state = 'landed';
      this.follow();
    }
  }
  follow() { // стоим на теле и движемся вместе с ним
    const b = this.landedOn, [bx, by] = b.pos(this.t), [vx, vy] = b.vel(this.t);
    this.x = bx + this.off[0]; this.y = by + this.off[1]; this.vx = vx; this.vy = vy;
  }
}

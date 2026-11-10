import { WARP } from './config.js';
import { BODIES } from './world.js';
import { apsisTime } from './physics.js';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export class Input {
  constructor(canvas, game) {
    this.keys = new Set(); this.game = game;
    addEventListener('keydown', e => {
      this.keys.add(e.code);
      if (game.mode !== 'flight' || game.helpOpen) return;
      const r = game.rocket;
      if (game.paused) return;
      switch (e.code) {
        case 'KeyZ': r.throttle = 1; break;
        case 'KeyX': r.throttle = 0; r.cutThrottle = 0; break;
        case 'KeyR': game.launch(game.design); break;
        case 'KeyB': game.toVab(); break;
        case 'Space': game.stage(); e.preventDefault(); break;
        case 'KeyP': game.msg = r.deployChute() ? '' : 'Парашюта нет или он уже раскрыт'; break;
        case 'KeyT': game.cycleSas(); break;
        case 'KeyU': game.msg = r.toggleSolar() ? '' : 'Солнечных панелей нет'; break;
        case 'KeyW': game.warpToNode(); break;
        case 'KeyN': game.msg = game.sound.toggle() ? 'Звук включён' : 'Звук выключен'; break;
        case 'Period': game.warpTo = null; game.warpIdx = Math.min(WARP.length - 1, game.warpIdx + 1); break;
        case 'Comma': game.warpTo = null; game.warpIdx = Math.max(0, game.warpIdx - 1); break;
        case 'KeyV': game.warpTo = null; game.warpIdx = 0; break;
        case 'KeyM': game.map = !game.map; game.mapZoom = null; game.mapZoomT = null; game.mapOff = [0, 0]; break;
        case 'KeyC': game.mapOff = [0, 0]; break;
        case 'Tab': game.ref = BODIES[(BODIES.indexOf(game.ref) + 1) % BODIES.length]; game.mapZoom = null; game.mapZoomT = null; game.mapOff = [0, 0]; e.preventDefault(); break;
        case 'Digit1': case 'Digit2': {
          const t = apsisTime(r, r.physProps, e.code === 'Digit1' ? 'ap' : 'pe');
          if (t == null) game.msg = 'Апсида не найдена (орбита не замкнута)'; else { game.nodes = [{ t, pro: 0, rad: 0 }]; game.msg = ''; }
          break;
        }
        case 'Digit0': game.nodes = []; game.warpTo = null; break;
      }
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    canvas.addEventListener('wheel', e => {
      const f = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      if (game.map) { if (!game.mapZoom) return; game.mapZoomT = clamp((game.mapZoomT || game.mapZoom) * f, 1e-13, 1); }
      else game.zoomT = clamp((game.zoomT || game.zoom) * f, 1e-10, 20);
      e.preventDefault();
    }, { passive: false });
    let drag = null; // перетаскивание карты (мышь и касание)
    canvas.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY]; });
    addEventListener('pointerup', () => { drag = null; });
    canvas.addEventListener('pointermove', e => {
      if (!drag || !game.map || !game.mapZoom || !game.mapOff) return;
      game.mapOff[0] -= (e.clientX - drag[0]) / game.mapZoom; game.mapOff[1] += (e.clientY - drag[1]) / game.mapZoom; drag = [e.clientX, e.clientY];
    });
  }
  get rotate() {
    const m = this.game.map, k = c => this.keys.has(c);
    return ((k('KeyD') || (k('ArrowRight') && !m)) ? 1 : 0) - ((k('KeyA') || (k('ArrowLeft') && !m)) ? 1 : 0);
  }
  update(r, dt) {
    const k = c => this.keys.has(c), game = this.game;
    if (!game.map) {
      if (k('ShiftLeft')) r.throttle = Math.min(1, r.throttle + dt);
      if (k('ControlLeft')) r.throttle = Math.max(0, r.throttle - dt);
      return;
    }
    const n = game.nodes[0]; if (!n) return;
    const sh = k('ShiftLeft') ? 10 : 1;
    n.pro += ((k('ArrowUp') ? 1 : 0) - (k('ArrowDown') ? 1 : 0)) * 30 * sh * dt;
    n.rad += ((k('ArrowRight') ? 1 : 0) - (k('ArrowLeft') ? 1 : 0)) * 30 * sh * dt;
    n.t = Math.max(r.t + 1, n.t + ((k('PageUp') ? 1 : 0) - (k('PageDown') ? 1 : 0)) * 120 * sh * sh * dt);
  }
}

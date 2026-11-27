// الواجهة والأزرار تُنشأ بالكود. أزرار الكمبيوتر غير مرئية (لوحة مفاتيح + ماوس فقط)
import { Settings } from './settings.js';
import { Audio } from './audio.js';

export const UI = {
  init(game) {
    const touch = 'ontouchstart' in window;
    const menu = document.createElement('div'); menu.id = 'menu';
    menu.innerHTML = `<h1>تاكسي 2:00 فجراً</h1>
      <div style="font-size:13px;opacity:.7">المرحلة 1: اختبار القيادة والنظر</div>
      <label>الصوت <input id="vol" type="range" min="0" max="1" step="0.05"></label>
      <label>حساسية النظر <input id="sens" type="range" min="0.3" max="3" step="0.1"></label>
      <button class="main" id="play">ابدأ</button>`;
    document.body.appendChild(menu);
    const $ = id => menu.querySelector('#' + id);
    $('vol').value = Settings.data.vol; $('sens').value = Settings.data.sens;
    $('vol').oninput = e => { Settings.data.vol = +e.target.value; Settings.save(); Audio.apply(); };
    $('sens').oninput = e => { Settings.data.sens = +e.target.value; Settings.save(); };
    $('play').onclick = () => {
      Audio.init(); Audio.apply(); Audio.blip(); menu.style.display = 'none'; game.running = true;
      if (!touch) game.canvas.requestPointerLock?.();
    };
    document.addEventListener('pointerlockchange', () => {
      if (game.running && !document.pointerLockElement && !touch) { menu.style.display = 'flex'; game.running = false; }
    });
    const I = game.taxi.input, keys = {};
    const sync = () => {
      I.gas = (keys.KeyW || keys.ArrowUp) ? 1 : 0;
      I.brake = (keys.KeyS || keys.ArrowDown || keys.Space) ? 1 : 0;
      I.steer = ((keys.KeyD || keys.ArrowRight) ? 1 : 0) - ((keys.KeyA || keys.ArrowLeft) ? 1 : 0);
    };
    addEventListener('keydown', e => {
      keys[e.code] = true; sync();
      if (e.code === 'KeyR') game.fail('manual');
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    });
    addEventListener('keyup', e => { keys[e.code] = false; sync(); });
    addEventListener('mousemove', e => { if (game.running && document.pointerLockElement) game.taxi.look(e.movementX, e.movementY); });
    if (touch) {
      const t = document.createElement('div'); t.id = 'touch';
      t.innerHTML = '<div><b id="tL">◀</b><b id="tR">▶</b></div><div><b id="tB">■</b><b id="tG">▲</b></div>';
      document.body.appendChild(t);
      const hold = (id, fn) => { const b = t.querySelector('#' + id); b.ontouchstart = e => { e.preventDefault(); fn(1); }; b.ontouchend = b.ontouchcancel = () => fn(0); };
      hold('tG', v => I.gas = v); hold('tB', v => I.brake = v);
      let L = 0, R = 0; hold('tL', v => { L = v; I.steer = R - L; }); hold('tR', v => { R = v; I.steer = R - L; });
      let lx, ly, id = null;
      addEventListener('touchstart', e => { if (e.target.closest('#touch,#menu')) return; const p = e.changedTouches[0]; id = p.identifier; lx = p.clientX; ly = p.clientY; }, { passive: true });
      addEventListener('touchmove', e => { for (const p of e.changedTouches) if (p.identifier === id) { game.taxi.look((p.clientX - lx) * 1.6, (p.clientY - ly) * 1.6); lx = p.clientX; ly = p.clientY; } }, { passive: true });
    }
  }
};

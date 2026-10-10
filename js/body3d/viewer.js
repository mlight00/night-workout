// 3D 자세 보기 — 화면 요소(container)에 붙여서 쓴다.
// 운동 중 휴식 화면(고정 측면, 번호 없음)과 「자세 보기」(돌려보기·번호·측정값) 둘 다 이걸 쓴다.

import { createRig, interp } from './rig.js';
import { POSES } from './poses.js';

const R = Math.PI / 180;
const OKC = '#1D9E75', NGC = '#E24B4A';

export function createViewer(container, opts = {}) {
  const THREE = window.THREE;
  const tp = (getComputedStyle(document.body).color.match(/\d+/g) || [0, 0, 0]).map(Number);
  const dark = (tp[0] + tp[1] + tp[2]) / 3 > 140;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!opts.capture });
  renderer.setPixelRatio(Math.min(opts.interactive ? 2 : 1.5, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const cv = renderer.domElement;
  cv.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
  container.prepend(cv);
  const rig = createRig(THREE, { dark, shadow: opts.interactive ? 2048 : 1024 });
  const cam = new THREE.PerspectiveCamera(32, 1, 0.05, 60);

  let def = null, mode = 'ok', t0 = performance.now(), az = 62, elv = 10, focus = null, ctg = null, cds = 0, raf = 0, label = '', marks = [];
  let W = 0, H = 0;

  function size() {
    const w = container.clientWidth, h = container.clientHeight;
    if (w && h && (w !== W || h !== H)) { W = w; H = h; renderer.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); }
  }
  const ro = new ResizeObserver(size);
  ro.observe(container);

  function show(id, m = 'ok') {
    def = POSES[id];
    if (!def) return;
    mode = def[m] ? m : 'ok';
    rig.setup(def, mode);
    const c = def[mode].c || [];
    rig.highlight(c.flatMap((x) => x[4] || []), mode);
    az = def.view ?? 62;
    elv = 10;
    focus = null;
    ctg = null;
    t0 = performance.now();
    marks.forEach((e) => e.remove());
    marks = [];
    if (opts.markers) {
      const col = mode === 'ok' ? OKC : NGC;
      for (let i = 0; i < c.length; i++) {
        const d = document.createElement('div');
        d.className = 'mk3';
        d.innerHTML = `<b style="background:${col}">${i + 1}</b><span></span>`;
        container.appendChild(d);
        marks.push(d);
      }
    }
  }

  function frame(now, tFixed) {
    if (!def) return;
    size();
    if (!W) return;
    const m = def[mode], t = tFixed != null ? tFixed : ((now - t0) % m.dur) / m.dur;
    const [p, lb] = interp(m.fr, t, m.lin);
    label = lb || label;
    rig.pose(def, mode, p);
    const wt = focus ? rig.wp(focus) : new THREE.Vector3(...def.tg), wd = focus ? 1.25 : def.dist * (opts.zoom || 1);
    if (!ctg || tFixed != null) { ctg = wt.clone(); cds = wd; } else { ctg.lerp(wt, 0.12); cds += (wd - cds) * 0.12; }
    const e = elv * R, a = az * R;
    cam.position.set(ctg.x + cds * Math.sin(a) * Math.cos(e), ctg.y + cds * Math.sin(e), ctg.z + cds * Math.cos(a) * Math.cos(e));
    cam.lookAt(ctg);
    renderer.render(rig.scene, cam);
    if (marks.length) {
      (m.c || []).forEach((x, i) => {
        const v = rig.wp(x[0]).project(cam), el = marks[i];
        const o = x[0] === 'head' ? [-34, -16] : [16, 0];
        el.style.left = ((v.x + 1) / 2) * W + o[0] + 'px';
        el.style.top = ((1 - v.y) / 2) * H + o[1] + 'px';
        const s = el.querySelector('span'), val = rig.measure(x[3]);
        s.textContent = val;
        s.style.display = val ? '' : 'none';
      });
    }
    if (opts.onFrame) opts.onFrame(t);
  }

  function loop(now) { frame(now); raf = requestAnimationFrame(loop); }

  if (opts.interactive) {
    let drag = null;
    cv.addEventListener('pointerdown', (e) => { drag = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => {
      if (!drag) return;
      az -= (e.clientX - drag[0]) * 0.45;
      elv = Math.max(-4, Math.min(60, elv + (e.clientY - drag[1]) * 0.3));
      drag = [e.clientX, e.clientY];
      if (opts.onDrag) opts.onDrag();
    });
    cv.addEventListener('pointerup', () => { drag = null; });
  }

  return {
    show,
    start() { if (!raf) raf = requestAnimationFrame(loop); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
    renderAt(t) { frame(performance.now(), t); },
    setView(v) { az = v; elv = v === 62 ? 10 : 6; },
    setXray: (on) => rig.setXray(on),
    setFocus(k) { focus = k; },
    get label() { return label; },
    get callouts() { return def ? def[mode].c || [] : []; },
    hasBad: (id) => !!(POSES[id] && POSES[id].ng),
    canvas: cv,
  };
}

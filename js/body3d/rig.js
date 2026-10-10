// 3D 신체 모델 + 기구. THREE(r128 전역)를 받아서 만든다.
// 자세는 poses.js의 데이터(관절 각도 키프레임)로 정한다.
//
// 관절 각도 파라미터 (도 단위, 끝에 L/R을 붙이면 한쪽만)
//   rx 몸 전체 앞 기울기 · ry 몸 방향 · sp 척추 굽힘 · nk 목 숙임
//   el 어깨 올림(m, +는 으쓱) · pr 어깨 내밈(m)
//   sf 어깨 굽힘(앞/위) · sa 어깨 벌림 · ef 팔꿈치 굽힘(음수 = 뒤로 꺾임) · wf 손목
//   hf 고관절 굽힘 · ha 고관절 벌림 · hr 고관절 바깥 회전 · kv 무릎 안쪽 모임 · kf 무릎 굽힘 · pf 발목(+는 발끝 내림) · flat 발바닥 수평
//   hw / ak : 손목·발목 목표 위치 [x,y,z] (있으면 IK로 맞춤)

export const DEF = { grip: 0.85, wy: 0, rx: 0, ry: 0, sp: 0, nk: 0, el: 0, pr: 0, sf: 2, sa: 6, ef: 8, wf: 0, hf: 0, ha: 4, hr: 6, kv: 0, kf: 2, pf: 0, flat: 0, crank: 0 };
const R = Math.PI / 180;

export function interp(fr, t, lin) {
  let i = 0;
  while (i < fr.length - 2 && t >= fr[i + 1][0]) i++;
  const [ta, a, lb] = fr[i], [tb, b] = fr[i + 1];
  let u = Math.max(0, Math.min(1, (t - ta) / ((tb - ta) || 1)));
  if (!lin) u = u * u * (3 - 2 * u);
  const o = { ...DEF };
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const base = DEF[k] ?? DEF[k.slice(0, -1)];
    const x = a[k] ?? b[k] ?? base, y = b[k] ?? a[k] ?? base;
    o[k] = Array.isArray(x) ? x.map((v, j) => v + (y[j] - v) * u) : x + (y - x) * u;
  }
  return [o, lb];
}

export function createRig(THREE, opts = {}) {
  const V3 = THREE.Vector3, Q = THREE.Quaternion, dark = !!opts.dark;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8c8a84, 0.8));
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(2.5, 5.5, 3.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(opts.shadow || 2048, opts.shadow || 2048);
  Object.assign(sun.shadow.camera, { left: -2.6, right: 2.6, top: 3.2, bottom: -1.6, near: 0.5, far: 14 });
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffffff, 0.32);
  fill.position.set(-3, 2.2, -2.5);
  scene.add(fill);

  const MT = {};
  const mk = (n, c, o) => (MT[n] = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7, metalness: 0 }, o || {})));
  mk('skin', '#d9a07a', { roughness: 0.55 }); mk('joint', '#cf946c', { roughness: 0.55 });
  mk('ok', '#1D9E75', { emissive: '#0b5a45', emissiveIntensity: 0.5, roughness: 0.35, transparent: true, opacity: 0.88, depthTest: false });
  mk('ng', '#E24B4A', { emissive: '#7a1d1d', emissiveIntensity: 0.5, roughness: 0.35, transparent: true, opacity: 0.88, depthTest: false });
  mk('shirt', '#2b6a88', { roughness: 0.85 }); mk('shorts', '#2f343b', { roughness: 0.92 }); mk('sock', '#e6e6e2', { roughness: 0.9 });
  mk('shoe', '#f1f1ee', { roughness: 0.55 }); mk('sole', '#55544f', { roughness: 0.8 }); mk('lace', '#c9c9c4');
  mk('hair', '#262624', { roughness: 0.9 }); mk('eye', '#1a1a18', { roughness: 0.3 }); mk('sclera', '#f2efe9', { roughness: 0.4 }); mk('lip', '#a8645a', { roughness: 0.6 });
  mk('bone', '#eee5d0', { roughness: 0.5 }); mk('boneD', '#eee5d0', { roughness: 0.5, side: THREE.DoubleSide });
  mk('steel', '#4a535d', { roughness: 0.4, metalness: 0.55 }); mk('pad', '#25282d', { roughness: 0.85 }); mk('foam', '#18191b', { roughness: 0.95 });
  mk('chair', '#9b7653'); mk('mat', '#4f7364', { roughness: 0.95 }); mk('stepm', '#3d434b', { roughness: 0.8 });
  mk('bikeF', '#2f3438', { roughness: 0.5, metalness: 0.4 }); mk('bikeW', '#7b848d', { roughness: 0.35, metalness: 0.7 }); mk('screen', '#1D9E75', { emissive: '#0b5a45', emissiveIntensity: 0.6 });
  const FADE = ['skin', 'shirt', 'shorts', 'sock', 'shoe', 'sole', 'lace', 'hair', 'eye', 'sclera', 'lip'];

  const M = (g, m, sh = 1) => { const o = new THREE.Mesh(g, MT[m]); o.castShadow = !!sh; o.receiveShadow = true; return o; };
  const G = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p && p.add(g); return g; };
  const put = (o, p, x, y, z) => { o.position.set(x, y, z); p.add(o); return o; };
  const EL = (rx, ry, rz, m) => { const o = M(new THREE.SphereGeometry(1, 30, 20), m); o.scale.set(rx, ry, rz); return o; };
  const SP = (r, m) => M(new THREE.SphereGeometry(r, 24, 16), m);
  const CY = (a, b, h, m) => M(new THREE.CylinderGeometry(a, b, h, 18), m);
  const BX = (w, h, d, m) => M(new THREE.BoxGeometry(w, h, d), m);
  // 캡슐(손가락 마디): y=0에서 -len까지
  function capPts(r, len) {
    const pts = [];
    for (let i = 0; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.sin(a) * r, -len - Math.cos(a) * r)); }
    for (let i = 6; i >= 0; i--) { const a = (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.sin(a) * r, Math.cos(a) * r)); }
    return pts;
  }
  const BONES = [], JS = {}, PT = {}, SIDE = {}, LINKS = [];
  const bone = (o) => { BONES.push(o); o.visible = false; o.castShadow = false; return o; };
  const pnt = (n, p, x, y, z) => (PT[n] = G(p, x, y, z));
  const link = (a, b, r1, r2, m, isBone) => { const o = M(new THREE.CylinderGeometry(r2, r1, 1, 14), m); scene.add(o); LINKS.push({ o, a, b }); if (isBone) bone(o); return o; };

  // ---- 단면을 이어 붙인 몸(로프트): 고리마다 높이 y, 반폭 w, 앞 깊이 f, 뒤 깊이 b ----
  const SEG = 40;
  function loftFill(rings, n, arr) {
    let o = 0;
    for (const r of rings) {
      for (let j = 0; j < SEG; j++) {
        const t = (j / SEG) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
        const pc = Math.sign(c) * Math.abs(c) ** (2 / n), ps = Math.sign(s) * Math.abs(s) ** (2 / n);
        arr[o++] = (r.x || 0) + r.w * pc; arr[o++] = r.y; arr[o++] = (r.z || 0) + (ps >= 0 ? r.f : r.b) * ps;
      }
    }
    const a = rings[0], z = rings.at(-1);
    arr[o++] = a.x || 0; arr[o++] = a.y; arr[o++] = a.z || 0;
    arr[o++] = z.x || 0; arr[o++] = z.y; arr[o++] = z.z || 0;
  }
  function loft(rings, n = 2.2) {
    const R = rings.length, pos = new Float32Array((R * SEG + 2) * 3), idx = [];
    loftFill(rings, n, pos);
    for (let i = 0; i < R - 1; i++) for (let j = 0; j < SEG; j++) {
      const a = i * SEG + j, b = i * SEG + ((j + 1) % SEG), c = (i + 1) * SEG + ((j + 1) % SEG), d = (i + 1) * SEG + j;
      idx.push(a, d, b, b, d, c);
    }
    const c0 = R * SEG, c1 = R * SEG + 1, top = (R - 1) * SEG;
    for (let j = 0; j < SEG; j++) { idx.push(c0, j, (j + 1) % SEG); idx.push(c1, top + ((j + 1) % SEG), top + j); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    g.userData.n = n;
    return g;
  }
  function reloft(g, rings) { loftFill(rings, g.userData.n, g.attributes.position.array); g.attributes.position.needsUpdate = true; g.computeVertexNormals(); }
  const grow = (rings, k, kz = k) => rings.map((r) => ({ ...r, w: r.w * k, f: r.f * kz, b: r.b * kz }));

  // 몸통: f = 0이면 75kg(보통), 1이면 90kg(지금, 배 나옴)
  function torsoRings(f) {
    const L = (a, b) => a + (b - a) * f;
    return [
      { y: -0.215, w: 0.06, f: 0.04, b: 0.05 },
      { y: -0.2, w: 0.13, f: 0.08, b: 0.095 },
      { y: -0.15, w: 0.172, f: 0.105, b: 0.128 },
      { y: -0.08, w: L(0.172, 0.184), f: L(0.1, 0.12), b: L(0.12, 0.132) },
      { y: 0, w: L(0.156, 0.176), f: L(0.09, 0.128), b: 0.1 },
      { y: 0.08, w: L(0.146, 0.173), f: L(0.088, 0.148), b: L(0.088, 0.097) },
      { y: 0.16, w: L(0.152, 0.176), f: L(0.094, 0.143), b: L(0.093, 0.1) },
      { y: 0.24, w: L(0.17, 0.188), f: L(0.106, 0.128), b: 0.107 },
      { y: 0.31, w: 0.192, f: 0.118, b: 0.114 },
      { y: 0.37, w: 0.2, f: 0.121, b: 0.117 },
      { y: 0.42, w: 0.197, f: 0.104, b: 0.11 },
      { y: 0.455, w: 0.168, f: 0.083, b: 0.094 },
      { y: 0.48, w: 0.11, f: 0.064, b: 0.074 },
      { y: 0.505, w: 0.066, f: 0.05, b: 0.055 },
      { y: 0.52, w: 0.055, f: 0.045, b: 0.05 },
    ];
  }
  const UA = [ // 위팔: 어깨세모근 · 이두 · 삼두
    { y: -0.345, w: 0.034, f: 0.03, b: 0.034 }, { y: -0.33, w: 0.041, f: 0.036, b: 0.04 }, { y: -0.3, w: 0.044, f: 0.042, b: 0.045 },
    { y: -0.24, w: 0.046, f: 0.05, b: 0.048 }, { y: -0.18, w: 0.048, f: 0.055, b: 0.052 }, { y: -0.12, w: 0.052, f: 0.052, b: 0.055 },
    { y: -0.06, w: 0.06, f: 0.055, b: 0.058, x: 0.004 }, { y: 0, w: 0.066, f: 0.06, b: 0.062, x: 0.006 }, { y: 0.035, w: 0.058, f: 0.052, b: 0.054, x: 0.004 }, { y: 0.06, w: 0.03, f: 0.03, b: 0.03 },
  ];
  const FA = [ // 아래팔: 팔꿈치 쪽이 굵고 손목 쪽이 납작
    { y: -0.268, w: 0.022, f: 0.016, b: 0.016 }, { y: -0.255, w: 0.029, f: 0.02, b: 0.021 }, { y: -0.22, w: 0.032, f: 0.024, b: 0.025 },
    { y: -0.16, w: 0.037, f: 0.031, b: 0.031 }, { y: -0.09, w: 0.045, f: 0.041, b: 0.039 }, { y: -0.03, w: 0.049, f: 0.044, b: 0.045 },
    { y: 0.01, w: 0.044, f: 0.038, b: 0.044 }, { y: 0.03, w: 0.026, f: 0.024, b: 0.026 },
  ];
  const TH = [ // 허벅지: 앞(넙다리네갈래) · 뒤(햄스트링)
    { y: -0.455, w: 0.04, f: 0.04, b: 0.04 }, { y: -0.44, w: 0.052, f: 0.05, b: 0.05 }, { y: -0.41, w: 0.058, f: 0.063, b: 0.053 },
    { y: -0.34, w: 0.066, f: 0.072, b: 0.063 }, { y: -0.25, w: 0.078, f: 0.083, b: 0.076 }, { y: -0.15, w: 0.088, f: 0.09, b: 0.086 },
    { y: -0.05, w: 0.095, f: 0.094, b: 0.1 }, { y: 0.03, w: 0.09, f: 0.085, b: 0.096 }, { y: 0.07, w: 0.05, f: 0.05, b: 0.05 },
  ];
  const SN = [ // 정강이 + 종아리 볼록
    { y: -0.44, w: 0.026, f: 0.026, b: 0.026 }, { y: -0.42, w: 0.03, f: 0.03, b: 0.031 }, { y: -0.38, w: 0.031, f: 0.03, b: 0.032 },
    { y: -0.3, w: 0.037, f: 0.034, b: 0.043 }, { y: -0.22, w: 0.046, f: 0.038, b: 0.058 }, { y: -0.13, w: 0.054, f: 0.042, b: 0.075 },
    { y: -0.06, w: 0.052, f: 0.045, b: 0.07 }, { y: 0.0, w: 0.05, f: 0.046, b: 0.05 }, { y: 0.02, w: 0.03, f: 0.03, b: 0.03 },
  ];

  const root = G(scene);
  root.rotation.order = 'YXZ';
  const BODY = { thick: [] }; // 체중 따라 바뀌는 부분
  const P = { root };
  {
    const sp = (P.spine = G(root, 0, 0.06, 0));
    const r0 = torsoRings(1);
    BODY.tor = loft(r0, 2.3); sp.add(M(BODY.tor, 'skin'));
    BODY.top = loft(grow(r0.filter((r) => r.y >= -0.04 && r.y <= 0.455), 1.025, 1.035), 2.3); sp.add(M(BODY.top, 'shirt'));
    BODY.pants = loft(grow(r0.filter((r) => r.y <= 0.02), 1.035, 1.045), 2.3); sp.add(M(BODY.pants, 'shorts'));
    const pel = bone(put(M(new THREE.TorusGeometry(1, 0.09, 8, 30), 'bone'), root, 0, 0.02, 0));
    pel.scale.set(0.13, 0.09, 0.09); pel.rotation.x = Math.PI / 2;
    bone(put(CY(0.015, 0.015, 0.6, 'bone'), sp, 0, 0.21, -0.08));
    for (let y = -0.08; y < 0.5; y += 0.042) bone(put(BX(0.042, 0.018, 0.032, 'bone'), sp, 0, y, -0.085));
    [0.2, 0.245, 0.29, 0.335, 0.38, 0.42].forEach((y, i) => {
      const t = bone(put(M(new THREE.TorusGeometry(1, 0.06, 6, 32), 'bone'), sp, 0, y, 0));
      const r = [0.158, 0.17, 0.178, 0.18, 0.172, 0.15][i];
      t.rotation.x = Math.PI / 2; t.scale.set(r, r * 0.68, r * 0.68);
    });
    pnt('c7', sp, 0, 0.47, -0.08); pnt('navel', sp, 0, 0.1, 0.15); pnt('back', sp, 0, 0.28, -0.11); pnt('lback', sp, 0, 0.05, -0.1); pnt('chest', sp, 0, 0.36, 0.125);

    // 목 · 머리
    const nk = (P.neck = G(sp, 0, 0.47, -0.015));
    nk.add(M(loft([{ y: -0.03, w: 0.06, f: 0.055, b: 0.062 }, { y: 0.03, w: 0.054, f: 0.05, b: 0.055 }, { y: 0.09, w: 0.05, f: 0.046, b: 0.05 }, { y: 0.12, w: 0.03, f: 0.03, b: 0.03 }], 2.1), 'skin'));
    bone(put(CY(0.013, 0.013, 0.1, 'bone'), nk, 0, 0.04, -0.02));
    const hd = (P.head = G(nk, 0, 0.085, 0));
    const hc = G(hd, 0, 0.1, 0.012); PT.head = hc;
    put(EL(0.08, 0.1, 0.097, 'skin'), hc, 0, 0.012, -0.006);           // 머리뼈
    put(EL(0.067, 0.072, 0.075, 'skin'), hc, 0, -0.038, 0.02);         // 얼굴 아래쪽
    put(EL(0.04, 0.028, 0.034, 'skin'), hc, 0, -0.088, 0.052);         // 턱
    const nose = put(CY(0.005, 0.017, 0.042, 'skin'), hc, 0, -0.016, 0.097); nose.rotation.x = -1.35;
    put(SP(0.012, 'skin'), hc, 0, -0.034, 0.104);
    put(BX(0.03, 0.004, 0.006, 'lip'), hc, 0, -0.063, 0.082);
    const hr = put(M(new THREE.SphereGeometry(1, 32, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), 'hair'), hc, 0, 0.016, -0.012);
    hr.scale.set(0.085, 0.106, 0.104); hr.rotation.x = -0.36;
    [1, -1].forEach((s) => {
      put(EL(0.011, 0.008, 0.006, 'sclera'), hc, s * 0.03, 0.006, 0.084);
      put(SP(0.0055, 'eye'), hc, s * 0.03, 0.006, 0.089);
      const br = put(BX(0.03, 0.006, 0.01, 'hair'), hc, s * 0.031, 0.026, 0.087); br.rotation.z = -s * 0.12;
      put(BX(0.008, 0.03, 0.012, 'hair'), hc, s * 0.078, 0.0, -0.002);  // 구레나룻
      const e = put(EL(0.009, 0.023, 0.015, 'skin'), hc, s * 0.079, -0.01, -0.012); e.rotation.z = s * 0.15;
      if (s === 1) PT.ear = e;
    });

    [1, -1].forEach((s) => {
      const L = (SIDE[s] = {});
      const gd = (L.gird = G(sp, s * 0.2, 0.45, -0.01));
      const ac = pnt('acr' + s, gd, 0, 0.05, 0);
      const sc = new THREE.Shape(); sc.moveTo(0, 0); sc.lineTo(-0.11, -0.02); sc.lineTo(-0.03, -0.17); sc.closePath();
      const scp = bone(put(M(new THREE.ShapeGeometry(sc), 'boneD'), gd, -s * 0.035, -0.01, -0.12)); scp.scale.x = s;
      link(pnt('st' + s, sp, s * 0.02, 0.46, 0.085), ac, 0.011, 0.011, 'bone', 1);
      link(pnt('tr' + s, sp, s * 0.03, 0.485, -0.03), ac, 0.052, 0.04, 'skin');

      // 팔
      const sh = (L.sh = G(gd)); JS['sh' + s] = put(SP(0.058, 'joint'), sh, 0, 0, 0);
      const ua = M(loft(UA.map((r) => ({ ...r, x: (r.x || 0) * s })), 2.1), 'skin'); sh.add(ua); BODY.thick.push(ua);
      bone(put(CY(0.013, 0.012, 0.3, 'bone'), sh, 0, -0.165, 0));
      const el = (L.el = G(sh, 0, -0.33, 0)); JS['el' + s] = put(SP(0.04, 'joint'), el, 0, 0, -0.008);
      el.add(M(loft(FA, 2.3), 'skin'));
      [1, -1].forEach((k) => bone(put(CY(0.008, 0.007, 0.23, 'bone'), el, k * 0.012, -0.13, 0)));
      const wr = (L.wr = G(el, 0, -0.255, 0)); JS['wr' + s] = put(SP(0.028, 'joint'), wr, 0, 0, 0);
      // 손: 손바닥 + 손가락 4개(2마디) + 엄지 — grip 값으로 쥔다
      put(EL(0.04, 0.052, 0.018, 'skin'), wr, 0, -0.052, 0.002);
      L.fingers = [];
      for (let k = 0; k < 4; k++) {
        const len = [0.04, 0.045, 0.043, 0.035][k];
        const f1 = G(wr, s * (0.028 - k * 0.0185), -0.098, 0.004);
        f1.add(M(new THREE.LatheGeometry(capPts(0.0095, len), 12), 'skin'));
        const f2 = G(f1, 0, -len, 0);
        f2.add(M(new THREE.LatheGeometry(capPts(0.0088, len * 0.85), 12), 'skin'));
        L.fingers.push([f1, f2]);
      }
      const th1 = G(wr, s * 0.034, -0.03, 0.014); th1.rotation.set(-0.35, 0, s * 0.55);
      th1.add(M(new THREE.LatheGeometry(capPts(0.011, 0.034), 12), 'skin'));
      const th2 = G(th1, 0, -0.034, 0); th2.add(M(new THREE.LatheGeometry(capPts(0.0098, 0.028), 12), 'skin'));
      L.thumb = [th1, th2];
      pnt('gp' + s, wr, 0, -0.07, 0); PT['sh' + s] = sh; PT['el' + s] = el; PT['wr' + s] = wr;

      // 다리
      const hp = (L.hip = G(root, s * 0.095, 0, 0)); JS['hp' + s] = put(SP(0.07, 'joint'), hp, 0, 0, 0);
      const th = M(loft(TH, 2.2), 'skin'); hp.add(th); BODY.thick.push(th);
      const pl = M(loft(grow(TH.filter((r) => r.y >= -0.2), 1.07), 2.2), 'shorts'); hp.add(pl); BODY.thick.push(pl);
      bone(put(CY(0.016, 0.014, 0.4, 'bone'), hp, 0, -0.21, 0));
      const kn = (L.kn = G(hp, 0, -0.43, 0)); JS['kn' + s] = put(SP(0.046, 'joint'), kn, 0, 0, 0.022);
      kn.add(M(loft(SN, 2.2), 'skin')); bone(put(CY(0.014, 0.012, 0.4, 'bone'), kn, 0, -0.215, 0));
      const an = (L.an = G(kn, 0, -0.43, 0)); JS['an' + s] = put(SP(0.03, 'joint'), an, 0, 0, 0);
      // 양말 + 운동화(갑피 · 앞코 · 뒤축 · 끈 · 밑창)
      put(CY(0.036, 0.038, 0.05, 'sock'), an, 0, 0.005, 0);
      put(EL(0.048, 0.041, 0.122, 'shoe'), an, 0, -0.048, 0.045);
      put(EL(0.046, 0.032, 0.062, 'shoe'), an, 0, -0.062, 0.13);
      put(EL(0.043, 0.042, 0.05, 'shoe'), an, 0, -0.05, -0.052);
      const lc = put(BX(0.03, 0.006, 0.085, 'lace'), an, 0, -0.012, 0.075); lc.rotation.x = -0.33;
      put(BX(0.098, 0.017, 0.24, 'sole'), an, 0, -0.084, 0.03);
      put(EL(0.049, 0.0085, 0.06, 'sole'), an, 0, -0.084, 0.15);
      put(EL(0.047, 0.0085, 0.04, 'sole'), an, 0, -0.084, -0.085);
      pnt('ball' + s, an, 0, -0.0925, 0.12); pnt('heel' + s, an, 0, -0.0925, -0.075); pnt('toe' + s, an, 0, -0.075, 0.185);
      PT['hip' + s] = hp; PT['kn' + s] = kn; PT['an' + s] = an;
    });
    // 왼쪽(+X)을 기본 측정 쪽으로
    for (const k of ['sh', 'el', 'wr', 'hip', 'kn', 'an']) PT[k] = PT[k + '1'];
  }

  // ---- 기구 ----
  const EQ = {};
  {
    const fl = new THREE.Mesh(new THREE.CircleGeometry(7, 64), new THREE.ShadowMaterial({ opacity: dark ? 0.4 : 0.2 }));
    fl.receiveShadow = true; fl.rotation.x = -Math.PI / 2; scene.add(fl);
    const T = (EQ.tower = G(scene));
    [1, -1].forEach((s) => {
      put(BX(0.06, 0.05, 1.15, 'steel'), T, s * 0.48, 0.025, -0.02);
      put(BX(0.065, 2.25, 0.065, 'steel'), T, s * 0.4, 1.125, -0.42);
      put(BX(0.05, 0.05, 0.66, 'steel'), T, s * 0.4, 2.225, -0.12);
      put(BX(0.04, 0.04, 0.75, 'steel'), T, s * 0.44, 0.36, -0.24).rotation.x = -0.98;
      put(BX(0.1, 0.04, 0.04, 'steel'), T, s * 0.35, 1.2, -0.42);
      put(BX(0.04, 0.04, 0.6, 'steel'), T, s * 0.3, 1.2, -0.12);
      put(BX(0.095, 0.05, 0.36, 'pad'), T, s * 0.3, 1.245, -0.18);
      const g = put(CY(0.022, 0.022, 0.17, 'foam'), T, s * 0.3, 1.22, 0.11); g.rotation.x = Math.PI / 2; EQ['grip' + s] = g;
    });
    put(BX(1.02, 0.05, 0.06, 'steel'), T, 0, 0.025, -0.42); put(BX(0.86, 0.05, 0.05, 'steel'), T, 0, 2.225, -0.42); put(BX(0.8, 0.04, 0.04, 'steel'), T, 0, 1.0, -0.42);
    put(CY(0.016, 0.016, 1.2, 'steel'), T, 0, 2.2, 0.16).rotation.z = Math.PI / 2;
    put(BX(0.34, 0.55, 0.06, 'pad'), T, 0, 1.33, -0.36);
    EQ.stepF = put(BX(0.42, 0.22, 0.32, 'stepm'), scene, 0, 0.11, 0.62);
    EQ.stepD = put(BX(0.4, 0.2, 0.3, 'stepm'), scene, 0, 0.1, 0.05);
    const C = (EQ.chair = G(scene));
    put(BX(0.44, 0.04, 0.42, 'chair'), C, 0, 0, 0);
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => put(CY(0.017, 0.017, 0.43, 'chair'), C, a * 0.19, -0.215, b * 0.18));
    EQ.chairBack = G(C);
    put(BX(0.44, 0.3, 0.03, 'chair'), EQ.chairBack, 0, 0.33, -0.2);
    [1, -1].forEach((a) => put(CY(0.017, 0.017, 0.36, 'chair'), EQ.chairBack, a * 0.19, 0.17, -0.2));
    EQ.mat = put(BX(0.64, 0.012, 1.9, 'mat'), scene, 0, 0.006, -0.12);
    // 실내 자전거 (크랭크 중심 0,.30,.02 · 사람은 +Z를 봄)
    const B = (EQ.bike = G(scene));
    const cz = 0.02, cy = 0.3;
    put(BX(0.06, 0.05, 1.1, 'bikeF'), B, 0, 0.05, 0.08);
    [-0.42, 0.62].forEach((z) => put(BX(0.5, 0.05, 0.07, 'bikeF'), B, 0, 0.03, z));
    const fw = put(CY(0.22, 0.22, 0.05, 'bikeW'), B, 0, 0.36, cz + 0.42); fw.rotation.z = Math.PI / 2;
    put(BX(0.07, 0.6, 0.07, 'bikeF'), B, 0, 0.55, cz + 0.5).rotation.x = -0.25;
    put(BX(0.07, 0.07, 0.62, 'bikeF'), B, 0, 0.42, cz + 0.12).rotation.x = 0.35;
    EQ.seatPost = put(BX(0.06, 0.7, 0.06, 'bikeF'), B, 0, 0.6, cz - 0.12);
    EQ.seatPost.rotation.x = -0.28;
    EQ.saddle = put(EL(0.09, 0.03, 0.14, 'pad'), B, 0, 0.95, cz - 0.19);
    put(BX(0.05, 0.05, 0.05, 'steel'), B, 0, 0.73, cz + 0.08);
    put(CY(0.012, 0.012, 0.5, 'steel'), B, 0, 1.12, cz + 0.52).rotation.z = Math.PI / 2;
    [1, -1].forEach((s) => { const g = put(CY(0.02, 0.02, 0.13, 'foam'), B, s * 0.22, 1.12, cz + 0.52); g.rotation.z = Math.PI / 2; });
    put(BX(0.16, 0.1, 0.03, 'screen'), B, 0, 1.18, cz + 0.6).rotation.x = -0.5;
    const ck = (EQ.crank = G(B, 0, cy, cz));
    put(CY(0.06, 0.06, 0.03, 'bikeW'), ck, 0.06, 0, 0).rotation.z = Math.PI / 2;
    EQ.pedal = {};
    [1, -1].forEach((s) => {
      const arm = G(ck, s * 0.085, 0, 0);
      put(BX(0.025, 0.17, 0.035, 'steel'), arm, 0, s === 1 ? -0.085 : 0.085, 0);
      EQ.pedal[s] = put(BX(0.09, 0.02, 0.1, 'stepm'), scene, 0, 0, 0);
    });
    EQ.bikeC = new V3(0, cy, cz);
  }
  const EQK = ['tower', 'chair', 'mat', 'stepF', 'stepD', 'bike'];

  // ---- 자세 적용 ----
  const side = (p, k, s) => p[k + (s > 0 ? 'L' : 'R')] ?? p[k];
  function setGrip(L, gr) {
    for (const [f1, f2] of L.fingers) { f1.rotation.x = -gr * 1.45; f2.rotation.x = -gr * 1.65; }
    L.thumb[1].rotation.x = -gr * 0.9;
  }
  function apply(p) {
    root.position.set(0, 0, 0);
    root.rotation.set(p.rx * R, p.ry * R, 0);
    P.spine.rotation.x = p.sp * R; P.neck.rotation.x = p.nk * 0.5 * R; P.head.rotation.x = p.nk * 0.5 * R;
    [1, -1].forEach((s) => {
      const L = SIDE[s], g = (k) => side(p, k, s);
      L.gird.position.set(s * 0.2, 0.45 + g('el'), -0.01 + g('pr'));
      L.sh.rotation.set(-g('sf') * R, 0, s * g('sa') * R);
      L.el.rotation.set(-g('ef') * R, 0, 0);
      L.wr.rotation.set(-g('wf') * R, g('wy') * R, 0);
      setGrip(L, g('grip'));
      L.hip.rotation.set(-g('hf') * R, s * g('hr') * R, s * (g('ha') - g('kv')) * R);
      L.kn.rotation.set(g('kf') * R, 0, s * 2 * g('kv') * R);
      L.an.rotation.set(((g('flat') ? g('hf') - g('kf') - p.rx : 0) + g('pf')) * R, 0, 0);
    });
  }
  const wp = (k) => (PT[k] || JS[k]).getWorldPosition(new V3());
  const mid = (a, b) => wp(a).add(wp(b)).multiplyScalar(0.5);
  function anchorPoint(a) {
    if (a.type === 'mid') return mid(a.a, a.b);
    if (a.type === 'elbows') return mid('el1', 'el-1').add(new V3(0, -0.045, 0));
    if (a.type === 'root') return root.getWorldPosition(new V3());
    return wp(a.k);
  }
  function place(at, a) {
    root.updateMatrixWorld(true);
    root.position.add(new V3(...at).sub(anchorPoint(a)));
    root.updateMatrixWorld(true);
  }
  function basisQ(x, y, z) { return new Q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); }
  function twoBone(parent, origin, target, l1, l2, pole) {
    const T = parent.worldToLocal(target.clone()).sub(origin);
    const d = Math.min(Math.max(T.length(), 0.05), l1 + l2 - 0.001), u = T.clone().normalize();
    const bend = Math.PI - Math.acos((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2));
    const al = Math.acos(Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
    const pv = pole.clone().sub(u.clone().multiplyScalar(pole.dot(u))).normalize();
    const a = u.clone().multiplyScalar(Math.cos(al)).add(pv.multiplyScalar(Math.sin(al)));
    const fw = T.clone().sub(a.clone().multiplyScalar(l1));
    const perp = fw.sub(a.clone().multiplyScalar(fw.dot(a))).normalize();
    return { a, perp, bend };
  }
  function armIK(s, target, pole, flatHand) {
    const L = SIDE[s];
    L.gird.updateMatrixWorld(true);
    const { a, perp, bend } = twoBone(L.gird, new V3(), target, 0.33, 0.255, pole);
    const yv = a.clone().negate(), zv = perp, xv = new V3().crossVectors(yv, zv);
    L.sh.quaternion.copy(basisQ(xv, yv, zv));
    L.el.rotation.set(-bend, 0, 0);
    if (flatHand) {
      L.el.updateMatrixWorld(true);
      const qW = basisQ(new V3(-1, 0, 0), new V3(0, 0, -1), new V3(0, -1, 0));
      L.wr.quaternion.copy(L.el.getWorldQuaternion(new Q()).invert().multiply(qW));
    }
  }
  function legIK(s, target, pole, footPitch) {
    const L = SIDE[s];
    root.updateMatrixWorld(true);
    const { a, perp, bend } = twoBone(root, L.hip.position.clone(), target, 0.43, 0.43, pole);
    const yv = a.clone().negate(), zv = perp.clone().negate(), xv = new V3().crossVectors(yv, zv);
    L.hip.quaternion.copy(basisQ(xv, yv, zv));
    L.kn.rotation.set(bend, 0, 0);
    if (footPitch != null) {
      L.kn.updateMatrixWorld(true);
      const yaw = root.rotation.y;
      const qW = new Q().setFromEuler(new THREE.Euler(footPitch * R, yaw, 0, 'YXZ'));
      L.an.quaternion.copy(L.kn.getWorldQuaternion(new Q()).invert().multiply(qW));
    }
  }
  function updateLinks() {
    for (const L of LINKS) {
      const a = L.a.getWorldPosition(new V3()), b = L.b.getWorldPosition(new V3()), d = b.clone().sub(a), len = d.length();
      L.o.position.copy(a).addScaledVector(d, 0.5);
      L.o.scale.set(1, len, 1);
      L.o.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize());
    }
  }

  const rt = {}; // 자세별 실행 중 계산값 (밀어올리기 손 위치 등)
  const BALL = new V3(0, -0.0925, 0.12);
  function bikeFeet(p) {
    const C = EQ.bikeC, r = 0.17;
    EQ.crank.rotation.x = p.crank * R;
    [1, -1].forEach((s) => {
      const th = (p.crank + (s === 1 ? 0 : 180)) * R;
      const ped = new V3(s * 0.11, C.y - Math.cos(th) * r, C.z + Math.sin(th) * r);
      EQ.pedal[s].position.copy(ped).add(new V3(0, -0.012, 0));
      const pitch = 12 + 10 * Math.sin(th);
      const ball = BALL.clone().applyEuler(new THREE.Euler(pitch * R, 0, 0));
      legIK(s, ped.clone().sub(ball), new V3(0, 0, 1), pitch);
    });
  }

  function pose(def, mode, p) {
    const m = def[mode];
    apply(p);
    place(m.at || def.at, m.anc || def.anc);
    if (def.bike) bikeFeet(p);
    [1, -1].forEach((s) => {
      const key = s > 0 ? 'L' : 'R';
      const ak = p['ak' + key] || p.ak && [s * p.ak[0], p.ak[1], p.ak[2]];
      if (ak) legIK(s, new V3(...ak), new V3(0, 0, 1), side(p, 'fp', s) ?? 0);
    });
    root.updateMatrixWorld(true);
    const push = def.push && rt[def.id];
    [1, -1].forEach((s) => {
      const key = s > 0 ? 'L' : 'R';
      let hw = p['hw' + key] || (p.hw && [s * p.hw[0], p.hw[1], p.hw[2]]);
      if (push) hw = [s * push.x, push.y, push.z];
      if (def.holdAnkle === key) hw = wp('an' + s).add(new V3(0, 0.02, -0.06)).toArray();
      if (hw) {
        const fla = side(p, 'fla', s);
        const pole = fla != null ? new V3(s * Math.sin(fla * R), -Math.cos(fla * R), -0.12) : new V3(...(def.pole || [0.45, -1, -0.3])).multiply(new V3(s, 1, 1));
        armIK(s, new V3(...hw), pole, !!(push || def.flatHand));
        if (push || def.flatHand) setGrip(SIDE[s], 0.08);
      }
    });
    root.updateMatrixWorld(true);
    updateLinks();
  }

  // 자세가 바뀔 때 한 번: 기구 보이기·위치 맞추기
  function setup(def, mode) {
    for (const k of EQK) EQ[k].visible = (def.eq || []).includes(k);
    EQ.chairBack.visible = def.id !== 'inclinepush';
    const frame0 = (fr) => interp(fr, 0)[0];
    if (def.push) {
      // 손은 "올라간 자세"에서 어깨 바로 아래 바닥(또는 의자)에
      apply(frame0(def.ok.fr)); place(def.at, def.anc);
      const sh = wp('sh');
      rt[def.id] = { x: 0.27, y: def.push.y, z: sh.z + (def.push.dz || 0.03) };
      if (def.id === 'inclinepush') EQ.chair.position.set(0, def.push.y - 0.05, rt[def.id].z + 0.19);
    }
    if (def.setup === 'chairUnderHip') {
      pose(def, 'ok', interp(def.ok.fr, def.ok.ref ?? 0.5)[0]);
      const h = wp('hip'); EQ.chair.position.set(0, h.y - 0.105, h.z - 0.13);
    }
    if (def.setup === 'stepUnderFeet') {
      pose(def, 'ok', frame0(def.ok.fr));
      const y = Math.min(wp('heel1').y, wp('ball1').y);
      EQ.stepD.scale.y = y / 0.2; EQ.stepD.position.set(0, y / 2, wp('ball1').z - 0.05);
    }
    if (def.setup === 'backPad') {
      const at = def.at.slice();
      pose(def, 'ok', frame0(def.ok.fr));
      at[2] += -0.33 - (wp('back').z - 0.005);
      def.at = at;
      pose(def, 'ok', frame0(def.ok.fr));
      rt.okHipZ = wp('hip').z;
      [1, -1].forEach((s) => (EQ['grip' + s].position.z = wp('gp1').z));
      if (def.ng && def.ng.backAnchor) { def.ng.at = wp('back').toArray(); def.ng.anc = { type: 'pt', k: 'back' }; }
    } else {
      [1, -1].forEach((s) => (EQ['grip' + s].position.z = 0.11));
    }
    if (def.bike) {
      const drop = (def[mode] && def[mode].saddleDrop) || 0;
      EQ.saddle.position.y = 1.0 - drop;
      EQ.seatPost.position.y = 0.625 - drop / 2;
    }
  }

  function highlight(keys, mode) {
    for (const m of Object.values(JS)) { m.material = MT.joint; m.renderOrder = 0; m.scale.setScalar(1); }
    for (const k of keys) if (JS[k]) { JS[k].material = MT[mode]; JS[k].renderOrder = 10; JS[k].scale.setScalar(0.8); }
  }

  function setXray(on) {
    MT.joint.color.set(on ? '#4d5a69' : '#cf946c');
    for (const k of FADE) { const m = MT[k]; m.transparent = on; m.opacity = on ? 0.17 : 1; m.depthWrite = !on; m.needsUpdate = true; }
    for (const b of BONES) b.visible = on;
  }

  const ang = (a, b, c) => Math.round(wp(a).sub(wp(b)).angleTo(wp(c).sub(wp(b))) / R);
  function flare() {
    const q = P.spine.getWorldQuaternion(new Q());
    const u = wp('el').sub(wp('sh')), up = new V3(0, 1, 0).applyQuaternion(q), n = new V3(0, 0, 1).applyQuaternion(q);
    u.sub(n.multiplyScalar(u.dot(n)));
    return Math.round(u.angleTo(up.negate()) / R);
  }
  // 측정값 문자열. spec = ['ear'] | ['ang', a, b, c, 라벨] | ['bend', 라벨] | ['flare'] | ['kneeToe'] | ['hipGap'] | ['text', 문구]
  function measure(spec) {
    if (!spec) return '';
    switch (spec[0]) {
      case 'ear': return `귀–어깨 ${Math.round((wp('ear').y - wp('acr1').y) * 100)}cm`;
      case 'ang': return `${spec[4]} ${ang(spec[1], spec[2], spec[3])}°`;
      case 'line': {
        // 옆에서 본 몸의 꺾임: 발목→엉덩이와 엉덩이→어깨가 이루는 각 (좌우 폭은 빼고)
        const x = new V3(1, 0, 0).applyQuaternion(root.getWorldQuaternion(new Q()));
        const flat = (v) => v.sub(x.clone().multiplyScalar(v.dot(x)));
        const a = flat(mid('an1', 'an-1').sub(mid('hip1', 'hip-1'))), b = flat(mid('sh1', 'sh-1').sub(mid('hip1', 'hip-1')));
        return `몸 각도 ${Math.round(a.angleTo(b) / R)}°`;
      }
      case 'bend': return `${spec[1]} ${180 - ang('hip', 'kn', 'an')}°`;
      case 'flare': return `몸통과 ${flare()}°`;
      case 'kneeToe': return `발끝보다 ${Math.max(0, Math.round((wp('kn').z - wp('toe1').z) * 100))}cm 앞`;
      case 'hipGap': return `등받이에서 ${Math.max(0, Math.round((wp('hip').z - (rt.okHipZ ?? 0)) * 100))}cm`;
      case 'text': return spec[1];
      default: return '';
    }
  }

  // 체형: 75kg = 보통 체형, 90kg = 지금(배 나옴). 관절 위치는 그대로라 자세에는 영향 없음.
  function setBody(kg) {
    const f = Math.max(0, Math.min(1.3, ((kg || 90) - 75) / 15));
    const r = torsoRings(f);
    reloft(BODY.tor, r);
    reloft(BODY.top, grow(r.filter((x) => x.y >= -0.04 && x.y <= 0.455), 1.025, 1.035));
    reloft(BODY.pants, grow(r.filter((x) => x.y <= 0.02), 1.035, 1.045));
    for (const m of BODY.thick) m.scale.set(0.9 + 0.1 * f, 1, 0.9 + 0.1 * f);
  }
  setBody(opts.kg);

  return { scene, root, EQ, pose, setup, highlight, setXray, measure, wp, setBody };
}

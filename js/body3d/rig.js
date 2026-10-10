// 3D 신체 모델 + 기구. THREE(r128 전역)를 받아서 만든다.
// 자세는 poses.js의 데이터(관절 각도 키프레임)로 정한다.
//
// 관절 각도 파라미터 (도 단위, 끝에 L/R을 붙이면 한쪽만)
//   rx 몸 전체 앞 기울기 · ry 몸 방향 · sp 척추 굽힘 · nk 목 숙임
//   el 어깨 올림(m, +는 으쓱) · pr 어깨 내밈(m)
//   sf 어깨 굽힘(앞/위) · sa 어깨 벌림 · ef 팔꿈치 굽힘(음수 = 뒤로 꺾임) · wf 손목
//   hf 고관절 굽힘 · ha 고관절 벌림 · hr 고관절 바깥 회전 · kv 무릎 안쪽 모임 · kf 무릎 굽힘 · pf 발목(+는 발끝 내림) · flat 발바닥 수평
//   hw / ak : 손목·발목 목표 위치 [x,y,z] (있으면 IK로 맞춤)

export const DEF = { rx: 0, ry: 0, sp: 0, nk: 0, el: 0, pr: 0, sf: 2, sa: 6, ef: 8, wf: 0, hf: 0, ha: 4, hr: 6, kv: 0, kf: 2, pf: 0, flat: 0, crank: 0 };
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
  mk('skin', '#d69c76', { roughness: 0.6 }); mk('joint', '#4d5a69', { roughness: 0.35, metalness: 0.15 });
  mk('ok', '#1D9E75', { emissive: '#0b5a45', emissiveIntensity: 0.45, roughness: 0.35 }); mk('ng', '#E24B4A', { emissive: '#7a1d1d', emissiveIntensity: 0.45, roughness: 0.35 });
  mk('shorts', '#343941', { roughness: 0.92 }); mk('shoe', '#eeeeeb'); mk('sole', '#585752'); mk('hair', '#262624', { roughness: 0.9 }); mk('eye', '#1a1a18');
  mk('bone', '#eee5d0', { roughness: 0.5 }); mk('boneD', '#eee5d0', { roughness: 0.5, side: THREE.DoubleSide });
  mk('steel', '#4a535d', { roughness: 0.4, metalness: 0.55 }); mk('pad', '#25282d', { roughness: 0.85 }); mk('foam', '#18191b', { roughness: 0.95 });
  mk('chair', '#9b7653'); mk('mat', '#4f7364', { roughness: 0.95 }); mk('stepm', '#3d434b', { roughness: 0.8 });
  mk('bikeF', '#2f3438', { roughness: 0.5, metalness: 0.4 }); mk('bikeW', '#7b848d', { roughness: 0.35, metalness: 0.7 }); mk('screen', '#1D9E75', { emissive: '#0b5a45', emissiveIntensity: 0.6 });
  const FADE = ['skin', 'shorts', 'shoe', 'sole', 'hair', 'eye'];

  const M = (g, m, sh = 1) => { const o = new THREE.Mesh(g, MT[m]); o.castShadow = !!sh; o.receiveShadow = true; return o; };
  const G = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p && p.add(g); return g; };
  const put = (o, p, x, y, z) => { o.position.set(x, y, z); p.add(o); return o; };
  const lat = (pts) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 30);
  const EL = (rx, ry, rz, m) => { const o = M(new THREE.SphereGeometry(1, 30, 20), m); o.scale.set(rx, ry, rz); return o; };
  const SP = (r, m) => M(new THREE.SphereGeometry(r, 24, 16), m);
  const CY = (a, b, h, m) => M(new THREE.CylinderGeometry(a, b, h, 18), m);
  const BX = (w, h, d, m) => M(new THREE.BoxGeometry(w, h, d), m);
  const BONES = [], JS = {}, PT = {}, SIDE = {}, LINKS = [];
  const bone = (o) => { BONES.push(o); o.visible = false; o.castShadow = false; return o; };
  const pnt = (n, p, x, y, z) => (PT[n] = G(p, x, y, z));
  const link = (a, b, r1, r2, m, isBone) => { const o = M(new THREE.CylinderGeometry(r2, r1, 1, 14), m); scene.add(o); LINKS.push({ o, a, b }); if (isBone) bone(o); return o; };

  // ---- 사람 (176cm · 90kg 비율) ----
  const UA = [[0, -0.335], [0.04, -0.325], [0.045, -0.3], [0.051, -0.24], [0.057, -0.16], [0.061, -0.08], [0.062, -0.02], [0.05, 0.02], [0, 0.035]];
  const FA = [[0, -0.262], [0.028, -0.255], [0.031, -0.22], [0.038, -0.15], [0.046, -0.07], [0.046, -0.02], [0.04, 0.005], [0, 0.015]];
  const TH = [[0, -0.44], [0.055, -0.43], [0.06, -0.4], [0.07, -0.32], [0.083, -0.2], [0.091, -0.1], [0.093, -0.03], [0.086, 0.01], [0, 0.03]];
  const SH = [[0, -0.435], [0.03, -0.43], [0.033, -0.39], [0.04, -0.3], [0.05, -0.2], [0.054, -0.12], [0.05, -0.04], [0.046, 0], [0, 0.01]];
  const TOR = [[0, -0.2], [0.14, -0.19], [0.172, -0.13], [0.176, -0.04], [0.17, 0.06], [0.175, 0.16], [0.19, 0.26], [0.198, 0.34], [0.195, 0.4], [0.17, 0.45], [0.115, 0.49], [0.055, 0.51], [0, 0.515]];
  const root = G(scene);
  root.rotation.order = 'YXZ';
  const P = { root };
  {
    const sho = M(lat([[0, -0.12], [0.13, -0.11], [0.18, -0.05], [0.19, 0.03], [0.186, 0.1], [0.18, 0.15], [0, 0.16]]), 'shorts');
    sho.scale.z = 0.7; root.add(sho);
    [1, -1].forEach((s) => put(EL(0.088, 0.09, 0.07, 'shorts'), root, s * 0.075, -0.03, -0.05));
    const pel = bone(put(M(new THREE.TorusGeometry(1, 0.09, 8, 30), 'bone'), root, 0, 0.02, 0));
    pel.scale.set(0.13, 0.09, 0.09); pel.rotation.x = Math.PI / 2;
    const sp = (P.spine = G(root, 0, 0.06, 0));
    const tor = M(lat(TOR), 'skin'); tor.scale.z = 0.64; sp.add(tor);
    put(EL(0.158, 0.15, 0.118, 'skin'), sp, 0, 0.12, 0.025);
    bone(put(CY(0.015, 0.015, 0.6, 'bone'), sp, 0, 0.21, -0.08));
    for (let y = -0.08; y < 0.5; y += 0.042) bone(put(BX(0.042, 0.018, 0.032, 'bone'), sp, 0, y, -0.085));
    [0.2, 0.245, 0.29, 0.335, 0.38, 0.42].forEach((y, i) => {
      const t = bone(put(M(new THREE.TorusGeometry(1, 0.06, 6, 32), 'bone'), sp, 0, y, 0));
      const r = [0.158, 0.17, 0.178, 0.18, 0.172, 0.15][i];
      t.rotation.x = Math.PI / 2; t.scale.set(r, r * 0.68, r * 0.68);
    });
    pnt('c7', sp, 0, 0.47, -0.09); pnt('navel', sp, 0, 0.1, 0.17); pnt('back', sp, 0, 0.28, -0.135); pnt('lback', sp, 0, 0.05, -0.125); pnt('chest', sp, 0, 0.36, 0.13);
    const nk = (P.neck = G(sp, 0, 0.47, -0.015));
    put(CY(0.054, 0.06, 0.13, 'skin'), nk, 0, 0.045, 0);
    bone(put(CY(0.013, 0.013, 0.1, 'bone'), nk, 0, 0.04, -0.02));
    const hd = (P.head = G(nk, 0, 0.085, 0));
    const hc = G(hd, 0, 0.1, 0.012); PT.head = hc;
    hc.add(EL(0.078, 0.112, 0.098, 'skin'));
    put(EL(0.062, 0.05, 0.07, 'skin'), hc, 0, -0.065, 0.03);
    put(EL(0.014, 0.02, 0.022, 'skin'), hc, 0, -0.015, 0.1);
    const hr = put(M(new THREE.SphereGeometry(1, 30, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), 'hair'), hc, 0, 0.004, -0.006);
    hr.scale.set(0.082, 0.117, 0.102); hr.rotation.x = -0.32;
    [1, -1].forEach((s) => {
      put(SP(0.0085, 'eye'), hc, s * 0.03, 0.005, 0.088);
      const e = put(EL(0.012, 0.027, 0.017, 'skin'), hc, s * 0.077, -0.01, -0.005);
      if (s === 1) PT.ear = e;
    });
    [1, -1].forEach((s) => {
      const L = (SIDE[s] = {});
      const gd = (L.gird = G(sp, s * 0.2, 0.45, -0.01));
      const ac = pnt('acr' + s, gd, 0, 0.05, 0);
      const sc = new THREE.Shape(); sc.moveTo(0, 0); sc.lineTo(-0.11, -0.02); sc.lineTo(-0.03, -0.17); sc.closePath();
      const scp = bone(put(M(new THREE.ShapeGeometry(sc), 'boneD'), gd, -s * 0.035, -0.01, -0.12)); scp.scale.x = s;
      link(pnt('st' + s, sp, s * 0.02, 0.46, 0.085), ac, 0.011, 0.011, 'bone', 1);
      link(pnt('tr' + s, sp, s * 0.03, 0.48, -0.04), ac, 0.05, 0.035, 'skin');
      const sh = (L.sh = G(gd)); JS['sh' + s] = put(SP(0.06, 'joint'), sh, 0, 0, 0); sh.add(M(lat(UA), 'skin'));
      bone(put(CY(0.013, 0.012, 0.3, 'bone'), sh, 0, -0.165, 0));
      const el = (L.el = G(sh, 0, -0.33, 0)); JS['el' + s] = put(SP(0.045, 'joint'), el, 0, 0, 0); el.add(M(lat(FA), 'skin'));
      [1, -1].forEach((k) => bone(put(CY(0.008, 0.007, 0.23, 'bone'), el, k * 0.012, -0.13, 0)));
      const wr = (L.wr = G(el, 0, -0.255, 0)); JS['wr' + s] = put(SP(0.032, 'joint'), wr, 0, 0, 0);
      put(EL(0.044, 0.07, 0.027, 'skin'), wr, 0, -0.07, 0); put(EL(0.015, 0.035, 0.015, 'skin'), wr, s * 0.036, -0.035, 0.016);
      pnt('gp' + s, wr, 0, -0.07, 0); PT['sh' + s] = sh; PT['el' + s] = el; PT['wr' + s] = wr;
      const hp = (L.hip = G(root, s * 0.095, 0, 0)); JS['hp' + s] = put(SP(0.072, 'joint'), hp, 0, 0, 0); hp.add(M(lat(TH), 'skin'));
      hp.add(M(lat([[0, -0.2], [0.098, -0.195], [0.101, -0.1], [0.099, 0], [0, 0.04]]), 'shorts'));
      bone(put(CY(0.016, 0.014, 0.4, 'bone'), hp, 0, -0.21, 0));
      const kn = (L.kn = G(hp, 0, -0.43, 0)); JS['kn' + s] = put(SP(0.055, 'joint'), kn, 0, 0, 0.014); kn.add(M(lat(SH), 'skin'));
      put(EL(0.046, 0.1, 0.046, 'skin'), kn, 0, -0.14, -0.026); bone(put(CY(0.014, 0.012, 0.4, 'bone'), kn, 0, -0.215, 0));
      const an = (L.an = G(kn, 0, -0.43, 0)); JS['an' + s] = put(SP(0.036, 'joint'), an, 0, 0, 0);
      put(EL(0.05, 0.045, 0.135, 'shoe'), an, 0, -0.045, 0.05); put(BX(0.1, 0.016, 0.27, 'sole'), an, 0, -0.0845, 0.05);
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
  function apply(p) {
    root.position.set(0, 0, 0);
    root.rotation.set(p.rx * R, p.ry * R, 0);
    P.spine.rotation.x = p.sp * R; P.neck.rotation.x = p.nk * 0.5 * R; P.head.rotation.x = p.nk * 0.5 * R;
    [1, -1].forEach((s) => {
      const L = SIDE[s], g = (k) => side(p, k, s);
      L.gird.position.set(s * 0.2, 0.45 + g('el'), -0.01 + g('pr'));
      L.sh.rotation.set(-g('sf') * R, 0, s * g('sa') * R);
      L.el.rotation.set(-g('ef') * R, 0, 0);
      L.wr.rotation.set(-g('wf') * R, 0, 0);
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
    for (const m of Object.values(JS)) m.material = MT.joint;
    for (const k of keys) if (JS[k]) JS[k].material = MT[mode];
  }

  function setXray(on) {
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

  return { scene, root, EQ, pose, setup, highlight, setXray, measure, wp };
}

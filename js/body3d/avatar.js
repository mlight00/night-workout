// 3D 캐릭터(무료 공개 모델) 불러오기 + 리타깃.
// 캐릭터: Microsoft Rocketbox Sports_Male_04 (MIT) — assets/avatar/
// 우리 관절 계산(rig.js의 보이지 않는 뼈대)이 정한 방향대로 이 모델의 뼈를 돌린다.
//   · 몸통·목·머리·팔다리: 뼈대 각 마디의 "세계 방향" × (처음 자세에서 잰 차이) = 모델 뼈의 방향
//   · 쇄골: 어깨 관절 위치를 향하게
//   · 손가락: grip 값만큼 손바닥 쪽으로 굽힘
//   · 체중: 배·옆구리 부분 정점을 바깥으로 밀어 체형 변화

const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';

export function loadAvatar(THREE, { base, scale }) {
  const V3 = THREE.Vector3, Q = THREE.Quaternion;
  return new Promise((resolve, reject) => {
    const manager = new THREE.LoadingManager();
    // FBX 안에 적힌 원본 텍스처 경로(.tga)는 쓰지 않는다 — 우리가 줄인 jpg를 따로 입힌다
    manager.setURLModifier((u) => (/\.(tga|png|jpe?g|bmp|dds)$/i.test(u) && !u.includes('/assets/avatar/') ? BLANK : u));
    manager.addHandler(/\.tga$/i, { load: () => new THREE.Texture() }); // .tga는 읽지 않고 빈 텍스처 (경고 메시지 방지)
    // 텍스처를 먼저 다 받아 둔다 — 덜 받은 채로 그리면 그 부분이 투명하게 비어 보인다
    const tl = new THREE.TextureLoader();
    const files = ['body_color.jpg', 'body_normal.jpg', 'head_color.jpg', 'head_normal.jpg'];
    const texP = Promise.all(files.map((f) => new Promise((ok, no) => tl.load(base + f, ok, undefined, no))));
    const fbxP = new Promise((ok, no) => new THREE.FBXLoader(manager).load(base + 'sports_male_04.fbx', ok, undefined, no));
    Promise.all([fbxP, texP]).then(([obj, tx]) => {
      const T = Object.fromEntries(files.map((f, i) => [f, tx[i]]));
      resolve(build(obj, (f) => T[f]));
    }).catch(reject);
  });

  function build(obj, tex) {
    const rm = [];
    obj.traverse((n) => { if (n.isLight || n.isCamera) rm.push(n); });
    rm.forEach((n) => n.parent.remove(n));
    obj.scale.setScalar(scale);
    obj.updateMatrixWorld(true);

    const mats = {
      body: new THREE.MeshStandardMaterial({ map: tex('body_color.jpg'), normalMap: tex('body_normal.jpg'), roughness: 0.78, metalness: 0, skinning: true }),
      head: new THREE.MeshStandardMaterial({ map: tex('head_color.jpg'), normalMap: tex('head_normal.jpg'), roughness: 0.62, metalness: 0, skinning: true }),
    };
    let mesh = null;
    obj.traverse((n) => {
      if (!n.isSkinnedMesh) return;
      mesh = n;
      n.material = [].concat(n.material).map((m) => (/head/i.test(m.name) ? mats.head : mats.body));
      n.castShadow = true;
      n.receiveShadow = true;
      n.frustumCulled = false;
    });

    // 뼈 이름 정리 (FBX의 'Bip01 L Hand' → 'Bip01_L_Hand')
    const B = {};
    obj.traverse((n) => { if (n.isBone) B[n.name.replace(/[\s:]/g, '_')] = n; });
    const need = (k) => { if (!B[k]) throw new Error('캐릭터 뼈 없음: ' + k); return B[k]; };
    const wpos = (b) => b.getWorldPosition(new V3());
    const wq = (b) => b.getWorldQuaternion(new Q());
    const DOWN = new V3(0, -1, 0), UP = new V3(0, 1, 0);
    const basis = (x, y, z) => new Q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));

    // 처음 자세(바인드)에서 각 뼈의 "우리 뼈대 기준 차이"를 잰다
    const E = [];
    const add = (name, key, kind, extra = {}) => {
      const b = need(name);
      const e = { b, key, kind, bindLocal: b.quaternion.clone(), ...extra };
      const q0 = wq(b);
      let qd = new Q();
      if (kind === 'limb') qd = new Q().setFromUnitVectors(DOWN, wpos(need(extra.child)).sub(wpos(b)).normalize());
      if (kind === 'hand') {
        const s = extra.s, P = (k) => wpos(need(`Bip01_${s > 0 ? 'L' : 'R'}_${k}`));
        const dir = P('Finger2').sub(wpos(b)).normalize();
        const sideV = P('Finger1').sub(P('Finger4'));
        const palm = new V3().crossVectors(dir, sideV).multiplyScalar(s).normalize();
        const y = dir.clone().negate(), z = palm.sub(y.clone().multiplyScalar(palm.dot(y))).normalize();
        qd = basis(new V3().crossVectors(y, z), y, z);
        e.palm = z.clone();
      }
      if (kind === 'foot') {
        const f = wpos(need(extra.child)).sub(wpos(b)); f.y = 0; f.normalize();
        qd = basis(new V3().crossVectors(UP, f), UP.clone(), f);
      }
      e.off = qd.invert().multiply(q0);
      E.push(e);
      return e;
    };
    add('Bip01_Pelvis', 'root', 'frame');
    add('Bip01_Spine', 'spine', 'frame');
    for (const [s, X] of [[1, 'L'], [-1, 'R']]) {
      add(`Bip01_${X}_Thigh`, 'hip' + s, 'limb', { child: `Bip01_${X}_Calf` });
      add(`Bip01_${X}_Calf`, 'kn' + s, 'limb', { child: `Bip01_${X}_Foot` });
      add(`Bip01_${X}_Foot`, 'an' + s, 'foot', { child: `Bip01_${X}_Toe0` });
    }
    add('Bip01_Spine1', 'spine', 'frame');
    add('Bip01_Spine2', 'spine', 'frame');
    add('Bip01_Neck', 'neck', 'frame');
    add('Bip01_Head', 'head', 'frame');
    const hands = {};
    for (const [s, X] of [[1, 'L'], [-1, 'R']]) {
      add(`Bip01_${X}_Clavicle`, 'gird' + s, 'aim', { child: `Bip01_${X}_UpperArm` });
      add(`Bip01_${X}_UpperArm`, 'sh' + s, 'limb', { child: `Bip01_${X}_Forearm` });
      add(`Bip01_${X}_Forearm`, 'el' + s, 'limb', { child: `Bip01_${X}_Hand` });
      hands[s] = add(`Bip01_${X}_Hand`, 'wr' + s, 'hand', { s });
    }

    // 손가락 굽힘 축 (손바닥 쪽으로)
    const FING = [];
    for (const [s, X] of [[1, 'L'], [-1, 'R']]) {
      const palm = hands[s].palm;
      for (let f = 0; f <= 4; f++) {
        const chain = [`Bip01_${X}_Finger${f}`, `Bip01_${X}_Finger${f}1`, `Bip01_${X}_Finger${f}2`].map(need);
        chain.forEach((b, i) => {
          const c = chain[i + 1];
          const dir = c ? wpos(c).sub(wpos(b)).normalize() : wpos(b).sub(wpos(chain[i - 1])).normalize();
          const axisW = new V3().crossVectors(dir, palm).normalize();
          const axisL = axisW.applyQuaternion(wq(b).invert());
          const amp = f === 0 ? [0.35, 0.6, 0.5][i] : [1.15, 1.35, 1.0][i];
          FING.push({ b, s, bindLocal: b.quaternion.clone(), axisL, amp });
        });
      }
    }

    // 체형: 배·옆구리 정점. 메시 원본 좌표는 Z가 위라서 바인드 좌표(Y 위, cm)로 바꿔서 고른다
    const pos = mesh.geometry.attributes.position, orig = Float32Array.from(pos.array);
    // (bindMatrixInverse는 크기 조절이 섞여 있어서 쓰면 안 된다 — bindMatrix의 역행렬을 직접 구한다)
    const toBind = mesh.bindMatrix.clone(), toGeo = new THREE.Matrix3().setFromMatrix4(toBind).invert();
    const belly = [], v = new V3();
    for (let i = 0; i < pos.count; i++) {
      v.fromArray(orig, i * 3).applyMatrix4(toBind);
      const { x, y, z } = v;
      if (y < 86 || y > 140 || Math.abs(x) > 21) continue;
      const w = Math.exp(-(((y - 109) / 14) ** 2)) * (z > -1 ? 1 : 0.45) * Math.max(0, 1 - Math.max(0, Math.abs(x) - 16) / 5);
      if (w > 0.01) belly.push(i, w, x, z + 2);
    }

    const bip = need('Bip01');
    const T = new Q();

    function update(drv) {
      bip.position.copy(obj.worldToLocal(drv.pos('root')));
      bip.updateMatrixWorld(true);
      for (const e of E) {
        const pq = e.b.parent.getWorldQuaternion(T).invert();
        let want;
        if (e.kind === 'aim') {
          e.b.quaternion.copy(e.bindLocal);
          e.b.updateMatrixWorld(true);
          const p = wpos(e.b), cur = wpos(need(e.child)).sub(p).normalize(), tgt = drv.pos(e.key).sub(p).normalize();
          want = new Q().setFromUnitVectors(cur, tgt).multiply(wq(e.b));
        } else {
          want = drv.quat(e.key).multiply(e.off);
        }
        e.b.quaternion.copy(pq.multiply(want));
        e.b.updateMatrixWorld(true);
      }
      for (const f of FING) {
        const g = drv.grip[f.s] ?? 0.85;
        f.b.quaternion.copy(f.bindLocal).multiply(new Q().setFromAxisAngle(f.axisL, g * f.amp));
      }
      obj.updateMatrixWorld(true);
    }

    function setBody(kg) {
      // 모델 자체 체형 ≈ 80kg. 90kg이면 배가 나오고, 75kg 쪽이면 들어간다.
      const a = Math.max(-0.5, Math.min(1.4, ((kg || 90) - 80) / 10)) * 0.17;
      const arr = pos.array, d = new V3();
      arr.set(orig);
      for (let j = 0; j < belly.length; j += 4) {
        const i = belly[j], g = a * belly[j + 1];
        // 바인드 좌표에서 옆(x)·앞뒤(z)로 부풀린 만큼을 메시 좌표로 되돌려 더한다
        d.set(belly[j + 2] * g * 0.55, 0, belly[j + 3] * g).applyMatrix3(toGeo);
        arr[i * 3] += d.x; arr[i * 3 + 1] += d.y; arr[i * 3 + 2] += d.z;
      }
      pos.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
    }

    function setXray(on) {
      for (const m of Object.values(mats)) { m.transparent = on; m.opacity = on ? 0.18 : 1; m.depthWrite = !on; m.needsUpdate = true; }
    }

    return { object: obj, update, setBody, setXray };
  }
}

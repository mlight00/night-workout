import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POSES } from '../js/body3d/poses.js';
import { interp, DEF } from '../js/body3d/rig.js';
import { STRENGTH, WARMUP_STRENGTH, COOLDOWN_STRENGTH, COOLDOWN_BIKE } from '../js/program.js';

test('프로그램에 나오는 모든 동작은 3D 자세가 있다', () => {
  const ids = [
    ...STRENGTH.flatMap((e) => e.levels.map((l) => l.pose)),
    ...[...WARMUP_STRENGTH, ...COOLDOWN_STRENGTH, ...COOLDOWN_BIKE].map((x) => x.pose).filter(Boolean),
    'bike',
  ];
  for (const id of ids) assert.ok(POSES[id], id);
});

test('근력 동작은 모두 "피해야 할 자세"도 있다', () => {
  for (const e of STRENGTH) for (const l of e.levels) assert.ok(POSES[l.pose].ng, l.pose);
});

test('키프레임은 0에서 시작해 1로 끝나고 시간 순서대로', () => {
  for (const [id, p] of Object.entries(POSES)) for (const m of ['ok', 'ng']) {
    if (!p[m]) continue;
    const ts = p[m].fr.map((f) => f[0]);
    assert.equal(ts[0], 0, `${id} ${m}`);
    assert.equal(ts.at(-1), 1, `${id} ${m}`);
    ts.forEach((t, i) => i && assert.ok(t >= ts[i - 1], `${id} ${m}`));
    assert.ok(p[m].dur >= 1000, `${id} ${m} dur`);
  }
});

test('바른 자세의 첫 키프레임에는 단계 설명이 있다', () => {
  for (const [id, p] of Object.entries(POSES)) assert.ok(p.ok.fr[0][2], id);
});

test('설명은 [관절, 제목, 보조설명, ...] 형태', () => {
  for (const [id, p] of Object.entries(POSES)) for (const m of ['ok', 'ng']) {
    for (const c of (p[m] && p[m].c) || []) {
      assert.equal(typeof c[0], 'string', id);
      assert.ok(c[1] && c[2] !== undefined, id);
    }
  }
});

test('보간: 중간 시각은 두 값 사이, 배열도 보간, 없는 값은 기본값', () => {
  const [p] = interp([[0, { sf: 0, hw: [0, 0, 0] }], [1, { sf: 100, hw: [1, 2, 3] }]], 0.5, true);
  assert.equal(p.sf, 50);
  assert.deepEqual(p.hw, [0.5, 1, 1.5]);
  assert.equal(p.kf, DEF.kf);
  const [q] = interp([[0, { kfR: 140 }], [1, { kfR: 140 }]], 0.3);
  assert.equal(q.kfR, 140);
});

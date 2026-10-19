import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekStart, needsWeight, addWeight, weightSeries, bikeSeries, levelSeries, aerobicWeek, addWalk, undoWalk, aerobicSeries } from '../js/stats.js';
import { lineChart } from '../js/charts.js';

test('주의 시작은 월요일 (2026-10-10은 토요일 → 10-05)', () => {
  assert.equal(weekStart('2026-10-10'), '2026-10-05');
  assert.equal(weekStart('2026-10-05'), '2026-10-05');
  assert.equal(weekStart('2026-10-11'), '2026-10-05'); // 일요일
});

test('이번 주에 체중을 안 넣었으면 묻는다', () => {
  assert.equal(needsWeight([], '2026-10-10'), true);
  assert.equal(needsWeight([{ date: '2026-10-06', kg: 90 }], '2026-10-10'), false);
  assert.equal(needsWeight([{ date: '2026-10-04', kg: 90 }], '2026-10-10'), true);
});

test('같은 날 다시 넣으면 덮어쓰고, 날짜순, 소수 1자리', () => {
  let w = addWeight([], '2026-10-10', 90.44);
  w = addWeight(w, '2026-10-03', 91);
  w = addWeight(w, '2026-10-10', 90.2);
  assert.deepEqual(w, [{ date: '2026-10-03', kg: 91 }, { date: '2026-10-10', kg: 90.2 }]);
});

test('체중 그래프: 주별 마지막 값 + 4주 평균', () => {
  const w = [['2026-09-14', 91], ['2026-09-21', 90.6], ['2026-09-22', 90.4], ['2026-09-28', 90], ['2026-10-05', 89.6], ['2026-10-12', 89.6]]
    .map(([date, kg]) => ({ date, kg }));
  const s = weightSeries(w);
  assert.equal(s.length, 5);
  assert.equal(s[1].y, 90.4);
  assert.equal(s[4].avg, Math.round(((90.4 + 90 + 89.6 + 89.6) / 4) * 10) / 10);
});

test('자전거 심박·근력 레벨 시리즈', () => {
  const ss = [
    { date: '2026-10-01', type: 'strength', results: { hang: { lv: 1 } } },
    { date: '2026-10-02', type: 'bike', bike: { avgHr: 116, resistance: 4, lv: 1 } },
    { date: '2026-10-04', type: 'bike', bike: { avgHr: null } },
  ];
  assert.deepEqual(bikeSeries(ss), [{ x: '2026-10-02', y: 116, res: 4, lv: 1 }]);
  assert.deepEqual(levelSeries(ss, 'hang'), [{ x: '2026-10-01', y: 1 }]);
});

test('그래프: 점이 없으면 안내 문구, 있으면 SVG', () => {
  assert.match(lineChart({ series: [{ points: [], color: '#000' }] }), /아직 기록이 없습니다/);
  const svg = lineChart({ series: [{ points: [{ x: '2026-10-01', y: 90 }, { x: '2026-10-08', y: 89.5 }], color: '#185FA5' }], unit: 'kg' });
  assert.match(svg, /^<svg/);
  assert.match(svg, /<path d="M/);
});

test('이번 주 유산소: 자전거 탄 시간 + 걷기, 지난주는 빼고', () => {
  const sessions = [
    { date: '2026-10-13', type: 'bike', totalSeconds: 1800, bike: { rideMin: 21 } },
    { date: '2026-10-19', type: 'bike', totalSeconds: 1800, bike: { rideMin: 24 } },
    { date: '2026-10-20', type: 'strength', totalSeconds: 2000 },
    { date: '2026-10-21', type: 'bike', totalSeconds: 1500 }, // 예전 기록은 전체 시간
  ];
  const walks = [{ date: '2026-10-18', min: 30 }, { date: '2026-10-20', min: 20 }, { date: '2026-10-21', min: 10 }];
  assert.deepEqual(aerobicWeek(sessions, walks, '2026-10-21'), { bike: 49, walk: 30, total: 79 });
});

test('걷기 기록 더하기·되돌리기', () => {
  let w = addWalk([], '2026-10-21', 20);
  w = addWalk(w, '2026-10-21', 10);
  assert.equal(w.length, 2);
  w = undoWalk(w, '2026-10-21');
  assert.deepEqual(w, [{ date: '2026-10-21', min: 20 }]);
  assert.deepEqual(undoWalk(w, '2026-10-22'), w); // 오늘 기록이 없으면 그대로
});

test('주별 유산소 합계', () => {
  const s = [{ date: '2026-10-13', type: 'bike', bike: { rideMin: 21 } }, { date: '2026-10-20', type: 'bike', bike: { rideMin: 24 } }];
  assert.deepEqual(aerobicSeries(s, [{ date: '2026-10-21', min: 30 }]), [{ x: '2026-10-12', y: 21 }, { x: '2026-10-19', y: 54 }]);
});

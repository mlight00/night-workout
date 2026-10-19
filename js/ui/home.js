// 홈 화면 — 오늘 할 운동, 최근 7일, 체중 입력 권유

import { $, esc } from './dom.js';
import { STRENGTH, BIKE_ROUTINES, BIKE_ROTATION, AEROBIC_GOAL, levelOf, planText, targetText } from '../program.js';
import { weekStrip, restSuggested, doneToday, passedToday, streakDays, isWeekend, nextRoutine } from '../schedule.js';
import { needsWeight, aerobicWeek } from '../stats.js';
import { secText } from '../coach.js';
import { totalSeconds, bikeDay, routineSummary } from '../timeline.js';

const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const TYPE = { strength: '근', bike: '자', stretch: '스', rest: '쉼' };
const ROUTINE_CHIPS = [...BIKE_ROTATION, 'steady'];

export function renderHome({ data, today, type, routine, legacy, onWeight, onRoutine, onWalk, onWalkUndo }) {
  const S = data.sessions, L = data.state.levels;
  const weekend = isWeekend(today), done = doneToday(S, today), passed = passedToday(S, today);

  let banner = '';
  if (done) banner = `<div class="banner">오늘 운동을 마쳤습니다. 내일 만나요.</div>`;
  else if (passed) banner = `<div class="banner">오늘은 쉬기로 했습니다. 푹 쉬세요. 마음이 바뀌면 아래에서 운동할 수 있어요.</div>`;
  else if (restSuggested(S, today)) banner = `<div class="banner warn">${streakDays(S, today)}일 연속 운동했습니다. 오늘은 쉬는 날을 권합니다. 가볍게 20분 걷기만 해도 충분합니다.</div>`;
  else if (weekend) banner = `<div class="banner">주말이에요. 오늘 운동은 선택 — 해도 되고 쉬어도 됩니다. 가볍게 걷기 30분도 좋아요.</div>`;
  $('btnStart').textContent = passed ? '그래도 운동하기' : '오늘 운동 시작';
  $('btnPass').hidden = !weekend || done || passed;
  if (!S.length && legacy) banner += `<div class="banner">이전 앱 기록 ${legacy}회는 그대로 보관되어 있습니다.</div>`;
  $('homeBanner').innerHTML = banner;

  if (type === 'strength') {
    const rows = STRENGTH.map((e) => {
      const l = levelOf(e.id, L[e.id].lv);
      return `<li><span>${esc(l.name)}<span class="lv">Lv${L[e.id].lv}</span></span><span>${planText(l)}</span></li>`;
    }).join('');
    $('today').innerHTML = `<p class="today-type">오늘은 근력 날</p><ul class="today-list">${rows}</ul><p class="muted" style="margin-top:.6rem">웜업 3분 · 쿨다운 3분 포함 약 30분</p>`;
  } else {
    const lv = L.bike.lv, turn = nextRoutine(S);
    $('today').innerHTML = `<p class="today-type">오늘은 자전거 날 <span class="lv">Lv${lv}</span></p>
      <div class="seg routines">${ROUTINE_CHIPS.map((k) => `<button data-r="${k}" aria-pressed="${k === routine}">${BIKE_ROUTINES[k].name}${k === turn ? ' · 차례' : ''}</button>`).join('')}</div>
      <ul class="today-list"><li><span>${esc(BIKE_ROUTINES[routine].how)}</span></li><li><span>${esc(routineSummary(routine, lv))}</span></li>
      <li><span>끝나고 벽에 기대 버티기 (혈압 관리)</span><span>${targetText(levelOf('wall', L.wall.lv))} × 3</span></li>
      <li><span>웜업 5분(편하게 → 올리기) · 쿨다운 · 스트레칭</span><span>${secText(totalSeconds(bikeDay(lv, 'normal', routine, L.wall.lv)))}</span></li></ul>
      <p class="muted" style="margin-top:.6rem">심박은 1~2분 늦게 따라와요. 숫자보다 숨차는 느낌으로, 140은 넘기지 않기</p>`;
    $('today').querySelector('.routines').onclick = (e) => { const b = e.target.closest('button'); if (b) onRoutine(b.dataset.r); };
  }
  $('btnSwap').textContent = type === 'strength' ? '오늘은 자전거로 바꾸기' : '오늘은 근력으로 바꾸기';

  $('week').innerHTML = weekStrip(S, today).map((d, i) => {
    const [y, m, dd] = d.date.split('-').map(Number);
    const w = DOW[new Date(y, m - 1, dd).getDay()];
    return `<div class="${i === 6 ? 'today' : ''} ${d.weekend ? 'we' : ''}">${w}<b class="${d.type || ''} ${d.light ? 'light' : ''}">${d.type ? TYPE[d.type] : ''}</b></div>`;
  }).join('');

  // 이번 주 유산소 (자전거 + 걷기) — 목표 150분
  const a = aerobicWeek(S, data.walks, today);
  const pct = (m) => Math.min(100, (m / AEROBIC_GOAL) * 100);
  const todayWalk = (data.walks || []).filter((w) => w.date === today).reduce((t, w) => t + w.min, 0);
  const left = AEROBIC_GOAL - a.total;
  $('aeroCard').innerHTML = `<div class="card aero"><h3>이번 주 유산소 <span class="sub">${a.total}분 / ${AEROBIC_GOAL}분</span></h3>
    <div class="abar"><i class="b" style="width:${pct(a.bike)}%"></i><i class="w" style="width:${Math.min(100 - pct(a.bike), pct(a.walk))}%"></i></div>
    <p class="sub">자전거 ${a.bike}분 · 걷기 ${a.walk}분 — ${left > 0 ? `남은 ${left}분. 근력 날 저녁에 빠르게 걷기 20~30분이면 채워져요` : '이번 주 목표를 채웠어요!'}</p>
    <div class="walk"><span>걷기 기록</span><button data-w="10">+10분</button><button data-w="20">+20분</button><button data-w="30">+30분</button>${todayWalk ? '<button data-undo="1" class="ghost">되돌리기</button>' : ''}</div>
    ${todayWalk ? `<p class="muted">오늘 걷기 ${todayWalk}분</p>` : '<p class="muted">빠르게 걷기 = 말은 되지만 노래는 힘든 정도</p>'}</div>`;
  $('aeroCard').onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.w) onWalk(+b.dataset.w);
    if (b.dataset.undo) onWalkUndo();
  };

  if (needsWeight(data.weights, today)) {
    $('weighCard').innerHTML = `<div class="card"><h3>이번 주 아침 체중</h3><p class="sub" style="margin-bottom:.6rem">아침 공복에 잰 숫자를 넣어주세요. 일주일에 한 번이면 됩니다.</p>
      <div class="weigh"><input id="weighIn" type="number" inputmode="decimal" step="0.1" min="30" max="250" placeholder="90.0"><span>kg</span><button id="weighSave">저장</button></div></div>`;
    $('weighSave').onclick = () => {
      const v = parseFloat($('weighIn').value);
      if (v >= 30 && v <= 250) onWeight(v);
      else $('weighIn').focus();
    };
  } else {
    const last = data.weights.at(-1);
    $('weighCard').innerHTML = last ? `<p class="muted" style="text-align:center;margin-bottom:.8rem">이번 주 체중 ${last.kg}kg 입력 완료</p>` : '';
  }
}

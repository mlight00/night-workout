// 홈 화면 — 오늘 할 운동, 최근 7일, 체중 입력 권유

import { $, esc } from './dom.js';
import { STRENGTH, levelOf, targetText } from '../program.js';
import { weekStrip, restSuggested, doneToday, streakDays } from '../schedule.js';
import { needsWeight } from '../stats.js';
import { secText } from '../coach.js';
import { totalSeconds, bikeDay } from '../timeline.js';

const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const TYPE = { strength: '근', bike: '자', stretch: '스' };

export function renderHome({ data, today, type, legacy, onWeight }) {
  const S = data.sessions, L = data.state.levels;

  let banner = '';
  if (doneToday(S, today)) banner = `<div class="banner">오늘 운동을 마쳤습니다. 내일 만나요.</div>`;
  else if (restSuggested(S, today)) banner = `<div class="banner warn">${streakDays(S, today)}일 연속 운동했습니다. 오늘은 쉬는 날을 권합니다. 가볍게 20분 걷기만 해도 충분합니다.</div>`;
  if (!S.length && legacy) banner += `<div class="banner">이전 앱 기록 ${legacy}회는 그대로 보관되어 있습니다.</div>`;
  $('homeBanner').innerHTML = banner;

  if (type === 'strength') {
    const rows = STRENGTH.map((e) => {
      const l = levelOf(e.id, L[e.id].lv);
      return `<li><span>${esc(l.name)}<span class="lv">Lv${L[e.id].lv}</span></span><span>${targetText(l)} × 3</span></li>`;
    }).join('');
    $('today').innerHTML = `<p class="today-type">오늘은 근력 날</p><ul class="today-list">${rows}</ul><p class="muted" style="margin-top:.6rem">웜업 3분 · 쿨다운 3분 포함 약 30분</p>`;
  } else {
    const lv = L.bike.lv, l = levelOf('bike', lv);
    $('today').innerHTML = `<p class="today-type">오늘은 자전거 날 <span class="lv">Lv${lv}</span></p>
      <ul class="today-list"><li><span>목표 구간 (심박 105~120)</span><span>${targetText(l)}</span></li>
      <li><span>웜업 · 쿨다운 · 스트레칭 포함</span><span>${secText(totalSeconds(bikeDay(lv)))}</span></li></ul>
      <p class="muted" style="margin-top:.6rem">스마트워치로 심박을 보면서 타세요</p>`;
  }
  $('btnSwap').textContent = type === 'strength' ? '오늘은 자전거로 바꾸기' : '오늘은 근력으로 바꾸기';

  $('week').innerHTML = weekStrip(S, today).map((d, i) => {
    const [y, m, dd] = d.date.split('-').map(Number);
    const w = DOW[new Date(y, m - 1, dd).getDay()];
    return `<div class="${i === 6 ? 'today' : ''}">${w}<b class="${d.type || ''} ${d.light ? 'light' : ''}">${d.type ? TYPE[d.type] : ''}</b></div>`;
  }).join('');

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

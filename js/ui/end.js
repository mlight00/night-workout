// 완료 화면 — 1) 종목별 평가(실제 횟수·초, 자세, 힘든 정도) → 2) 저장 후 오늘 평가 + 레벨업/레벨다운

import { $, esc } from './dom.js';
import { STRENGTH, BIKE_ROUTINES, levelOf, targetText, maxLevel } from '../program.js';
import { canUp, suggestDown, canDown, UP_AFTER } from '../levels.js';
import { defaultDone, lastResult, GRADE_LABEL } from '../session.js';
import { secText } from '../coach.js';
import { withRo } from '../format.js';

const ORDER = STRENGTH.map((e) => e.id);
const FORM = [['good', '바르게'], ['some', '가끔 흐트러짐'], ['bad', '많이 흐트러짐']];
const EFFORT = [['easy', '여유'], ['ok', '적당'], ['hard', '한계']];
const TAG = { great: 'ok', good: 'ok', keep: 'mid', miss: 'ng' };

const targetsOf = (r) => (r.targets && r.targets.length ? r.targets : Array(r.totalSets).fill(r.target));
const unit = (r) => (r.type === 'hold' ? '초' : '회');
const routineName = (b) => (BIKE_ROUTINES[b.routine] || BIKE_ROUTINES.steady).name;

function nextInfo(id, lv) {
  if (lv >= maxLevel(id)) return null;
  const l = levelOf(id, lv + 1);
  return { name: l.name || '', target: targetText(l), pose: l.pose };
}

export function renderEnd(ctx) {
  const { rec } = ctx;
  const time = secText(rec.totalSeconds);
  $('endTitle').textContent = rec.completed ? `운동 끝 · ${time}` : `여기까지 · ${time}`;
  if (rec.type === 'stretch') return renderSimple(ctx, '스트레칭을 마쳤습니다. 오늘은 푹 쉬세요.');
  if (rec.mode === 'light') return renderSimple(ctx, '가볍게 한 날은 레벨 기록에 들어가지 않습니다. 그래도 운동한 날로 달력에 남습니다. 잘하셨어요.');
  if (rec.type === 'strength' && !Object.keys(rec.results).length) return renderSimple(ctx, '운동 단계 전에 멈췄습니다. 몸이 먼저입니다. 다음에 다시 해요.');
  return rec.judged ? renderJudged(ctx) : renderChecks(ctx);
}

function renderSimple({ onHome }, msg) {
  $('endBody').onclick = null;
  $('endBody').innerHTML = `<div class="banner">${msg}</div><button id="endHome" class="btn-start">홈으로</button>`;
  $('endHome').onclick = onHome;
}

const stepper = (val, max) => `<span class="stepper" data-max="${max}"><button type="button" data-d="-1" aria-label="줄이기">−</button><b>${val}</b><button type="button" data-d="1" aria-label="늘리기">+</button></span>`;
const choice = (k, label, opts, cur) => `<div class="q"><span>${label}</span><span class="seg" data-k="${k}">${opts.map(([v, t]) => `<button type="button" data-v="${v}" aria-pressed="${v === cur}">${t}</button>`).join('')}</span></div>`;

// ---- 1) 평가 입력 — 기본값이 "계획대로 했다"라서 그대로면 바로 저장 -------------------
function renderChecks(ctx) {
  const { rec } = ctx;
  let html = '<p class="sub hint">실제와 다른 것만 고쳐 주세요. 계획대로 했다면 그대로 저장하면 됩니다.</p>';
  if (rec.type === 'strength') {
    for (const id of ORDER) {
      const r = rec.results[id];
      if (!r) continue;
      const partial = r.setsDone < r.totalSets;
      html += `<div class="card res" data-ex="${id}"><h3><span>${esc(r.name)}<span class="lv">Lv${r.lv}</span></span>${partial ? '<span class="tag mid">중단</span>' : ''}</h3>`;
      if (partial) {
        html += '<p class="sub">중간에 멈춰서 이번엔 평가하지 않습니다</p></div>';
        continue;
      }
      const t = targetsOf(r);
      html += `<p class="sub">${r.type === 'hold' ? '버틴 시간' : '한 횟수'} — 목표 ${t.join(' · ')}${unit(r)}</p>
        <div class="sets-in">${defaultDone(r).map((d, i) => `<label>${i + 1}세트 ${stepper(d, r.type === 'hold' ? r.target : t[i] * 2 + 5)}</label>`).join('')}</div>
        ${choice('form', '자세', FORM, 'good')}${choice('effort', '힘든 정도', EFFORT, 'ok')}</div>`;
    }
  } else {
    const b = rec.bike;
    const steady = b.routine === 'steady';
    html += `<div class="card res" data-ex="bike"><h3><span>자전거 · ${routineName(b)}<span class="lv">Lv${b.lv}</span></span>${b.mainDone ? '<span class="tag ok">루틴 완주</span>' : '<span class="tag mid">루틴 미완료</span>'}</h3>
      <p class="sub" style="margin-bottom:.5rem">워치에서 이번 운동의 평균 심박을 확인해 넣어주세요. (그래프용, 비워도 됩니다)</p>
      <div class="fields"><label>평균 심박 <span><input id="hrIn" type="number" inputmode="numeric" min="50" max="200" placeholder="112"> 회</span></label>
      <label>기본 저항 단계 <span><input id="resIn" type="number" inputmode="numeric" min="1" max="40" placeholder="4"> 단계</span></label></div>
      ${b.mainDone ? `<label class="check"><input type="checkbox" id="followChk" checked> ${steady ? '목표 심박 구간을 대체로 유지했다' : '안내대로 따라 했다 (세게·편하게, 저항 올리고 내리기)'}</label>
      <label class="check"><input type="checkbox" id="overChk"> 심박이 140을 넘은 적이 있다</label>
      ${choice('effort', '힘든 정도', EFFORT, 'ok')}` : ''}</div>`;
  }
  html += `<button id="endSave" class="btn-start">저장하고 오늘 평가 보기</button>`;
  $('endBody').innerHTML = html;

  $('endBody').onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const st = b.closest('.stepper');
    if (st) {
      const v = st.querySelector('b'), max = +st.dataset.max;
      v.textContent = Math.max(0, Math.min(max, +v.textContent + +b.dataset.d));
      return;
    }
    const seg = b.closest('.seg[data-k]');
    if (seg) for (const x of seg.children) x.setAttribute('aria-pressed', x === b);
  };

  $('endSave').onclick = () => {
    const pick = (card, k) => card.querySelector(`.seg[data-k="${k}"] [aria-pressed="true"]`)?.dataset.v || null;
    const evals = {};
    for (const card of document.querySelectorAll('#endBody .card[data-ex]')) {
      if (card.dataset.ex === 'bike' || !card.querySelector('.stepper')) continue;
      evals[card.dataset.ex] = { done: [...card.querySelectorAll('.stepper b')].map((x) => +x.textContent), form: pick(card, 'form'), effort: pick(card, 'effort') };
    }
    let bike = null;
    if (rec.type === 'bike') {
      const card = document.querySelector('#endBody .card[data-ex="bike"]');
      bike = {
        avgHr: parseInt($('hrIn').value, 10) || null,
        resistance: parseInt($('resIn').value, 10) || null,
        followed: !$('followChk') || $('followChk').checked,
        over140: !!($('overChk') && $('overChk').checked),
        effort: pick(card, 'effort') || 'ok',
      };
    }
    ctx.onSave(evals, bike);
  };
}

// ---- 2) 오늘 평가 + 레벨 -----------------------------------------------------
function levelBody(state, id, r) {
  const st = state.levels[id];
  if (st.lv !== r.lv) return `<p class="sub">다음 운동부터 <b>Lv${st.lv} ${esc(levelOf(id, st.lv).name ?? '')} ${targetText(levelOf(id, st.lv))}</b></p>`;
  if (!r.grade) return '';
  const nx = nextInfo(id, st.lv);
  if (r.grade === 'great' || r.grade === 'good') {
    if (canUp(state, id) && nx) {
      return `<p class="sub">레벨을 올릴 수 있습니다</p><div class="acts"><button class="up" data-up="${id}">▲ Lv${st.lv + 1} ${esc(withRo(`${nx.name} ${nx.target}`))} 올리기</button>${nx.pose && id !== 'bike' ? `<button data-pv="${nx.pose}">자세 미리 보기</button>` : ''}</div>`;
    }
    if (!nx) return '<p class="sub">마지막 레벨입니다. 이대로 유지하세요.</p>';
    return `<p class="sub">같은 레벨에서 ${UP_AFTER - st.ok === 1 ? '한 번 더' : `${UP_AFTER - st.ok}번 더`} 성공하면 레벨업</p>`;
  }
  if (r.grade === 'keep') return '<p class="sub">이 레벨 유지</p>';
  return suggestDown(state, id) ? '<p class="sub">2번 연속 미달 — 한 단계 내리는 걸 권합니다</p>' : '<p class="sub">다음에 다시 도전</p>';
}

function renderJudged(ctx) {
  const { rec, state, sessions = [], onUp, onDown, onPreview, onHome } = ctx;
  const items = rec.type === 'strength'
    ? ORDER.filter((id) => rec.results[id]).map((id) => ({ id, r: rec.results[id] }))
    : [{ id: 'bike', r: { ...rec.bike, name: `자전거 · ${routineName(rec.bike)}` } }];

  const graded = items.filter((x) => x.r.grade);
  const count = (g) => graded.filter((x) => x.r.grade === g).length;
  const ups = items.filter(({ id }) => canUp(state, id) && state.levels[id].lv === items.find((x) => x.id === id).r.lv && nextInfo(id, state.levels[id].lv));
  const parts = [['great', '여유 있게 성공'], ['good', '성공'], ['keep', '유지'], ['miss', '미달']].map(([g, t]) => (count(g) ? `${t} ${count(g)}` : '')).filter(Boolean);
  let html = `<div class="card summary"><h3>오늘 평가</h3>
    <p class="score">${parts.join(' · ') || '평가한 종목이 없습니다'}</p>
    <p class="sub">${secText(rec.totalSeconds)} · ${rec.completed ? '끝까지 했습니다' : '중간에 멈췄습니다'}${ups.length ? ` · 레벨업 가능 ${ups.length}종목` : ''}</p></div>`;

  for (const { id, r } of items) {
    let line = '';
    if (id === 'bike') {
      const prev = lastResult(sessions, 'bike', rec);
      line = [r.avgHr ? `평균 심박 ${r.avgHr}` : '', r.resistance ? `저항 ${r.resistance}` : '', prev && prev.avgHr ? `지난번 ${prev.avgHr}${prev.routine ? `(${(BIKE_ROUTINES[prev.routine] || BIKE_ROUTINES.steady).name})` : ''}` : ''].filter(Boolean).join(' · ');
    } else if (r.done) {
      const prev = lastResult(sessions, id, rec);
      line = `오늘 ${r.done.join('·')} / 목표 ${targetsOf(r).join('·')}${unit(r)}${prev && prev.done ? ` · 지난번 ${prev.done.join('·')}${prev.lv !== r.lv ? `(Lv${prev.lv})` : ''}` : ''}`;
    }
    const st = state.levels[id];
    const downBtn = st.lv === r.lv && canDown(state, id) && (r.grade === 'miss' || r.grade === 'keep') ? `<button class="down" data-down="${id}">${suggestDown(state, id) ? '▼ 한 단계 내리기' : '너무 힘들었어요 ▼'}</button>` : '';
    html += `<div class="card res"><h3><span>${esc(r.name)}<span class="lv">Lv${r.lv}</span></span>${r.grade ? `<span class="tag ${TAG[r.grade]}">${GRADE_LABEL[r.grade]}</span>` : '<span class="tag mid">중단</span>'}</h3>
      ${line ? `<p class="sets">${esc(line)}</p>` : ''}<p class="why">${esc(r.why || '')}</p>${levelBody(state, id, r)}${downBtn ? `<div class="acts">${downBtn}</div>` : ''}</div>`;
  }
  html += `<button id="endHome" class="btn-start">홈으로</button>`;
  $('endBody').innerHTML = html;
  $('endHome').onclick = onHome;
  $('endBody').onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.up) onUp(b.dataset.up);
    if (b.dataset.down) onDown(b.dataset.down);
    if (b.dataset.pv) onPreview(b.dataset.pv);
  };
}

// 완료 화면 — 1) 종목별 체크 → 2) 저장 후 레벨업/레벨다운

import { $, esc } from './dom.js';
import { STRENGTH, levelOf, targetText, maxLevel } from '../program.js';
import { canUp, suggestDown, canDown, UP_AFTER } from '../levels.js';
import { secText } from '../coach.js';

const ORDER = STRENGTH.map((e) => e.id);

function setsText(r) {
  return r.type === 'hold' ? r.sets.map((s) => `${s}초`).join(' · ') : `${r.setsDone}세트 · 각 ${r.sets.map((s) => `${s}초`).join(' · ')}`;
}

// 세트별 목표가 다르면 "세트별 15·10·8회 모두 했다", 같으면 "3세트 모두 8회 했다"
function repsGoal(r) {
  const t = r.targets || [];
  return t.length && new Set(t).size > 1 ? `세트별 ${t.join('·')}회 모두 했다` : `${r.totalSets}세트 모두 ${r.target}회 했다`;
}

function nextInfo(id, lv) {
  if (lv >= maxLevel(id)) return null;
  const l = levelOf(id, lv + 1);
  return { name: l.name, target: targetText(l), pose: l.pose };
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

function renderChecks(ctx) {
  const { rec } = ctx;
  $('endBody').onclick = null;
  let html = '';
  if (rec.type === 'strength') {
    for (const id of ORDER) {
      const r = rec.results[id];
      if (!r) continue;
      const partial = r.setsDone < r.totalSets;
      const tag = partial ? '<span class="tag mid">중단</span>' : r.type === 'hold' ? (r.allHeld ? '<span class="tag ok">완주</span>' : '<span class="tag ng">미달</span>') : '';
      html += `<div class="card res"><h3><span>${esc(r.name)}<span class="lv">Lv${r.lv}</span></span>${tag}</h3><p class="sets">${setsText(r)}</p>`;
      if (!partial) {
        if (r.type === 'reps') html += `<label class="check"><input type="checkbox" data-k="reps" data-id="${id}"> ${repsGoal(r)}</label>`;
        html += `<label class="check"><input type="checkbox" data-k="form" data-id="${id}"> 바른 자세로 끝까지 했다</label>`;
      }
      html += '</div>';
    }
    if (!html) html = '<div class="banner">운동 단계까지 가기 전에 멈췄습니다.</div>';
  } else {
    const b = rec.bike;
    html += `<div class="card res"><h3><span>자전거<span class="lv">Lv${b.lv}</span></span>${b.mainDone ? '<span class="tag ok">메인 완주</span>' : '<span class="tag mid">메인 미완료</span>'}</h3>
      <p class="sub" style="margin-bottom:.5rem">워치에서 이번 운동의 평균 심박을 확인해 넣어주세요.</p>
      <div class="fields"><label>평균 심박 <span><input id="hrIn" type="number" inputmode="numeric" min="50" max="200" placeholder="112"> 회</span></label>
      <label>저항 단계 <span><input id="resIn" type="number" inputmode="numeric" min="1" max="40" placeholder="4"> 단계</span></label></div>
      ${b.mainDone ? '<label class="check"><input type="checkbox" id="zoneChk"> 목표 구간(심박 105~120)을 유지했다</label><label class="check"><input type="checkbox" id="talkChk"> 끝까지 말할 수 있는 정도였다</label>' : ''}</div>`;
  }
  html += `<button id="endSave" class="btn-start">저장하고 결과 보기</button>`;
  $('endBody').innerHTML = html;

  $('endSave').onclick = () => {
    const checks = {};
    for (const c of document.querySelectorAll('#endBody input[type=checkbox][data-id]')) (checks[c.dataset.id] ||= {})[c.dataset.k] = c.checked;
    const bike = rec.type === 'bike' ? {
      avgHr: parseInt($('hrIn').value, 10) || null,
      resistance: parseInt($('resIn').value, 10) || null,
      zone: !!($('zoneChk') && $('zoneChk').checked && $('talkChk').checked),
    } : null;
    ctx.onSave(checks, bike);
  };
}

function renderJudged(ctx) {
  const { rec, state, onUp, onDown, onPreview, onHome } = ctx;
  const items = rec.type === 'strength' ? ORDER.filter((id) => rec.results[id]).map((id) => ({ id, r: rec.results[id] })) : [{ id: 'bike', r: { ...rec.bike, name: '자전거' } }];
  let html = '';
  for (const { id, r } of items) {
    const st = state.levels[id];
    const changed = st.lv !== r.lv;
    const ok = r.success;
    let body = '';
    if (changed) {
      body = `<p class="sub">다음 운동부터 <b>Lv${st.lv} ${esc(levelOf(id, st.lv).name ?? '')} ${targetText(levelOf(id, st.lv))}</b></p>`;
    } else if (ok) {
      const nx = nextInfo(id, st.lv);
      if (canUp(state, id) && nx) {
        body = `<p class="sub">같은 레벨 ${UP_AFTER}번 연속 성공 — 올릴 수 있습니다</p>
          <div class="acts"><button class="up" data-up="${id}">▲ Lv${st.lv + 1} ${esc(nx.name)} ${nx.target}로 올리기</button>${nx.pose && id !== 'bike' ? `<button data-pv="${nx.pose}">자세 미리 보기</button>` : ''}</div>`;
      } else if (!nx) body = '<p class="sub">마지막 레벨입니다. 이대로 유지하세요.</p>';
      else body = `<p class="sub">성공 ${st.ok}/${UP_AFTER} — 한 번 더 성공하면 레벨업</p>`;
    } else {
      body = suggestDown(state, id)
        ? `<p class="sub">2번 연속 미달 — 한 단계 내리는 걸 권합니다</p>`
        : '<p class="sub">이번엔 미달 — 다음에 다시 도전</p>';
    }
    const downBtn = !changed && canDown(state, id) ? `<button class="down" data-down="${id}">${suggestDown(state, id) ? '▼ 한 단계 내리기' : '너무 힘들었어요 ▼'}</button>` : '';
    html += `<div class="card res"><h3><span>${esc(r.name)}<span class="lv">Lv${r.lv}</span></span>${ok ? '<span class="tag ok">성공</span>' : '<span class="tag ng">미달</span>'}</h3>${body}${downBtn ? `<div class="acts">${downBtn}</div>` : ''}</div>`;
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

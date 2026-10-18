// 기록·그래프 — 체중, 자전거 심박, 근력 레벨, 최근 운동, 백업

import { $, esc } from './dom.js';
import { lineChart } from '../charts.js';
import { weightSeries, bikeSeries, levelSeries } from '../stats.js';
import { STRENGTH, BIKE_ROUTINES, levelOf } from '../program.js';
import { secText } from '../coach.js';

const COLORS = { hang: '#378ADD', push: '#D85A30', squat: '#639922', dip: '#7F77DD', leg: '#D4537E' };
const TYPE = { strength: '근력', bike: '자전거', stretch: '스트레칭' };
const COND = { good: '좋음', ok: '보통', tired: '피곤함', pain: '아픈 곳' };
const QUIT = { tired: '피곤해서', joint: '관절 통증', dizzy: '어지러움', other: '' };

export function renderRecords({ data, onWeight, onExport, onImport, legacy, demo }) {
  const ws = weightSeries(data.weights);
  let weightNote = '';
  if (data.weights.length >= 2) {
    const d = Math.round((data.weights.at(-1).kg - data.weights[0].kg) * 10) / 10;
    weightNote = `<p class="sub">처음 기록 대비 <b>${d > 0 ? '+' : ''}${d}kg</b> · 점선은 4주 평균</p>`;
  }
  const bs = bikeSeries(data.sessions);
  const lvSeries = STRENGTH.map((e) => ({ points: levelSeries(data.sessions, e.id), color: COLORS[e.id], label: e.group }));
  const hist = data.sessions.filter((s) => s.type !== 'rest').slice(-12).reverse().map((s) => {
    const what = s.type === 'strength' && s.results
      ? Object.values(s.results).map((r) => `${r.name} Lv${r.lv}`).join(', ')
      : s.type === 'bike' ? `${s.bike?.routine && BIKE_ROUTINES[s.bike.routine] ? `${BIKE_ROUTINES[s.bike.routine].name} ` : ''}Lv${s.bike?.lv ?? ''}${s.bike?.avgHr ? ` · 평균 심박 ${s.bike.avgHr}` : ''}${s.bike?.resistance ? ` · 저항 ${s.bike.resistance}` : ''}` : '';
    const tag = [s.mode === 'light' ? '가볍게' : '', s.completed ? '' : `중단${QUIT[s.quitReason] ? `(${QUIT[s.quitReason]})` : ''}`, s.condition ? COND[s.condition] : ''].filter(Boolean).join(' · ');
    return `<li><span><b>${s.date.slice(5).replace('-', '/')} ${TYPE[s.type] || ''}</b> ${esc(what)}</span><span>${secText(s.totalSeconds)}${tag ? ` · ${tag}` : ''}</span></li>`;
  }).join('');

  $('recBody').innerHTML = `
    <div class="card"><h3>체중</h3>${weightNote}
      ${lineChart({ series: [{ points: ws.map((p) => ({ x: p.x, y: p.y })), color: '#378ADD' }, { points: ws.map((p) => ({ x: p.x, y: p.avg })), color: '#8fa3b8', dash: true }], unit: '' })}
      <div class="weigh" style="margin-top:.6rem"><input id="recWeigh" type="number" inputmode="decimal" step="0.1" min="30" max="250" placeholder="아침 체중"><span>kg</span><button id="recWeighSave">오늘 날짜로 저장</button></div>
    </div>
    <div class="card"><h3>자전거 평균 심박</h3>
      <p class="sub">같은 저항에서 평균 심박이 내려가면 심장이 좋아지고 있다는 뜻입니다.</p>
      ${lineChart({ series: [{ points: bs, color: '#1D9E75' }] })}
    </div>
    <div class="card"><h3>근력 레벨</h3>
      ${lineChart({ series: lvSeries, step: true, yMin: 0, yMax: 10 })}
      <div class="legend">${STRENGTH.map((e) => `<span><i style="background:${COLORS[e.id]}"></i>${esc(e.group)} Lv${data.state.levels[e.id].lv} ${esc(levelOf(e.id, data.state.levels[e.id].lv).name)}</span>`).join('')}</div>
    </div>
    <div class="card"><h3>최근 운동</h3>${hist ? `<ul class="hist">${hist}</ul>` : '<p class="empty">아직 기록이 없습니다</p>'}
      ${legacy ? `<p class="muted" style="margin-top:.6rem">이전 앱 기록 ${legacy}회는 따로 보관되어 있습니다.</p>` : ''}</div>
    ${demo ? '<p class="muted" style="text-align:center">체험 모드에서는 백업을 쓸 수 없습니다</p>' : ''}<div class="card" ${demo ? 'hidden' : ''}><h3>기록 백업</h3>
      <p class="sub" style="margin-bottom:.6rem">기록은 이 폰 안에만 저장됩니다. 브라우저 데이터를 지우면 함께 사라지니 가끔 파일로 내보내 두세요.</p>
      <div class="acts"><button id="btnExport">파일로 내보내기</button><button id="btnImport">파일에서 가져오기</button><input id="fileImport" type="file" accept=".json,application/json" hidden></div>
      <p id="impMsg" class="sub" style="margin-top:.5rem"></p>
    </div>`;

  $('recWeighSave').onclick = () => { const v = parseFloat($('recWeigh').value); if (v >= 30 && v <= 250) onWeight(v); else $('recWeigh').focus(); };
  $('btnExport').onclick = onExport;
  $('btnImport').onclick = () => $('fileImport').click();
  $('fileImport').onchange = () => {
    const f = $('fileImport').files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { const msg = onImport(String(r.result)); $('impMsg').textContent = msg; };
    r.readAsText(f);
  };
}

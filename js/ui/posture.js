// 「자세 보기」 — 3D 모델을 돌려보며 바른 자세와 피해야 할 자세를 확인

import { $, esc } from './dom.js';
import { createViewer } from '../body3d/viewer.js';
import { POSES } from '../body3d/poses.js';
import { STRENGTH, levelOf } from '../program.js';

const GROUPS = [
  ...STRENGTH.map((e) => ({ id: e.id, name: e.group, poses: [...new Set(e.levels.map((l) => l.pose))] })),
  { id: 'bike', name: '자전거', poses: ['bike'] },
  { id: 'stretch', name: '웜업·스트레칭', poses: ['armcircle', 'st_chest', 'st_lat', 'st_calf', 'st_quad'] },
];
const VIEWS = [[62, '비스듬히'], [90, '측면'], [0, '정면'], [180, '뒤']];
const OKC = '#1D9E75', NGC = '#E24B4A';

let viewer = null, levels = null;
const cur = { group: 'hang', pose: 'deadhang', mode: 'ok', xray: false, view: 62, focus: null };

function currentPoseOf(groupId) {
  if (!levels || !levels[groupId]) return null;
  return levelOf(groupId, levels[groupId].lv).pose;
}

function render() {
  const g = GROUPS.find((x) => x.id === cur.group);
  $('pGroups').innerHTML = GROUPS.map((x) => `<button data-g="${x.id}" aria-pressed="${x.id === cur.group}">${esc(x.name)}</button>`).join('');
  const now = currentPoseOf(cur.group);
  $('pMoves').innerHTML = g.poses.map((id) => `<button data-p="${id}" aria-pressed="${id === cur.pose}">${esc(POSES[id].name)}${id === now ? ' · 지금' : ''}</button>`).join('');
  const hasNg = !!POSES[cur.pose].ng;
  if (!hasNg) cur.mode = 'ok';
  $('pModes').innerHTML = `<button data-m="ok" aria-pressed="${cur.mode === 'ok'}">바른 자세</button>` + (hasNg ? `<button data-m="ng" aria-pressed="${cur.mode === 'ng'}">피해야 할 자세</button>` : '');
  $('pViews').innerHTML = VIEWS.map(([v, n]) => `<button data-v="${v}" aria-pressed="${v === cur.view}">${n}</button>`).join('');
  $('pXray').setAttribute('aria-pressed', cur.xray);

  viewer.show(cur.pose, cur.mode);
  viewer.setView(cur.view);
  viewer.setXray(cur.xray);
  cur.focus = null;
  viewer.setFocus(null);
  const col = cur.mode === 'ok' ? OKC : NGC;
  $('pList').innerHTML = viewer.callouts.map((c, i) => `<li data-i="${i}" role="button" tabindex="0"><b style="background:${col}">${i + 1}</b><span>${esc(c[1])}<small>${esc(c[2])}</small></span></li>`).join('');
}

function wire() {
  $('pGroups').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    cur.group = b.dataset.g;
    const g = GROUPS.find((x) => x.id === cur.group);
    cur.pose = currentPoseOf(cur.group) || g.poses[0];
    cur.view = POSES[cur.pose].view ?? 62;
    render();
  };
  $('pMoves').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    cur.pose = b.dataset.p; cur.view = POSES[cur.pose].view ?? 62; render();
  };
  $('pModes').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; cur.mode = b.dataset.m; render(); };
  $('pViews').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    cur.view = +b.dataset.v; viewer.setView(cur.view);
    for (const x of $('pViews').children) x.setAttribute('aria-pressed', x === b);
  };
  $('pXray').onclick = () => { cur.xray = !cur.xray; viewer.setXray(cur.xray); $('pXray').setAttribute('aria-pressed', cur.xray); };
  $('pList').onclick = (e) => {
    const li = e.target.closest('li'); if (!li) return;
    const k = viewer.callouts[+li.dataset.i][0];
    cur.focus = cur.focus === k ? null : k;
    viewer.setFocus(cur.focus);
    for (const x of $('pList').children) x.setAttribute('aria-pressed', x === li && !!cur.focus);
  };
  $('pList').onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } };
}

export function openPosture({ levels: lv, pose, mode } = {}) {
  levels = lv;
  if (!viewer) {
    let last = 0;
    viewer = createViewer($('p3d'), {
      interactive: true, markers: true,
      onFrame: () => { const n = performance.now(); if (n - last > 250) { last = n; $('pLabel').textContent = viewer.label; } },
      onDrag: () => { for (const x of $('pViews').children) x.setAttribute('aria-pressed', false); },
    });
    wire();
  }
  if (pose) {
    cur.pose = pose;
    cur.group = (GROUPS.find((g) => g.poses.includes(pose)) || GROUPS[0]).id;
    cur.mode = mode || 'ok';
  } else {
    cur.pose = currentPoseOf(cur.group) || cur.pose;
  }
  cur.view = POSES[cur.pose].view ?? 62;
  render();
  viewer.start();
}

export function closePosture() {
  if (viewer) viewer.stop();
}

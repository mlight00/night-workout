// 간단한 SVG 선 그래프 — 라이브러리 없이 문자열로 만든다.
// series: [{ points:[{x,y}], color, dash?, label }]

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function lineChart({ series, height = 180, unit = '', step = false, yMin, yMax }) {
  const W = 340, H = height, L = 38, Rp = 10, T = 12, B = 26;
  const all = series.flatMap((s) => s.points);
  if (!all.length) return `<p class="empty">아직 기록이 없습니다</p>`;
  const xs = [...new Set(all.map((p) => p.x))].sort();
  let lo = yMin ?? Math.min(...all.map((p) => p.y)), hi = yMax ?? Math.max(...all.map((p) => p.y));
  if (lo === hi) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.12;
  if (yMin == null) lo -= pad;
  if (yMax == null) hi += pad;
  const X = (x) => L + (xs.length === 1 ? (W - L - Rp) / 2 : (xs.indexOf(x) / (xs.length - 1)) * (W - L - Rp));
  const Y = (y) => T + (1 - (y - lo) / (hi - lo)) * (H - T - B);
  const r = (n) => Math.round(n * 10) / 10;

  let g = '';
  for (let i = 0; i <= 3; i++) {
    const v = lo + ((hi - lo) * i) / 3, y = r(Y(v));
    g += `<line x1="${L}" y1="${y}" x2="${W - Rp}" y2="${y}" class="grid"/><text x="${L - 6}" y="${y + 4}" text-anchor="end" class="ax">${r(v)}${unit}</text>`;
  }
  const lab = (x) => x.slice(5).replace('-', '/');
  [xs[0], xs.at(-1)].forEach((x, i) => {
    if (i && xs.length === 1) return;
    g += `<text x="${r(X(x))}" y="${H - 6}" text-anchor="${i ? 'end' : 'start'}" class="ax">${esc(lab(x))}</text>`;
  });

  for (const s of series) {
    if (!s.points.length) continue;
    let d = '';
    s.points.forEach((p, i) => {
      const x = r(X(p.x)), y = r(Y(p.y));
      if (!i) d += `M${x},${y}`;
      else d += step ? `H${x}V${y}` : `L${x},${y}`;
    });
    g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.5" ${s.dash ? 'stroke-dasharray="5 4"' : ''} stroke-linejoin="round"/>`;
    if (!s.dash) for (const p of s.points) g += `<circle cx="${r(X(p.x))}" cy="${r(Y(p.y))}" r="3.5" fill="${s.color}"/>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img">${g}</svg>`;
}

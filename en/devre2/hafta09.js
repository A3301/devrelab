/* Devre Kuramı II · Hafta 9 — RMS Değer ve Kompleks Güç */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd2h09';
  const S = Object.assign({ answers: {}, steps: {}, d1rows: [], d2rows: [], d3rows: [], st: {}, page: 'giris' }, Lab.store.load(KEY));
  Lab.answers = S.answers;
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => Lab.store.save(KEY, S), 300); };
  Lab.onAnswer = () => { save(); progress(); };
  const near = (a, b, t) => Math.abs(a - b) <= t;
  const rel = (a, b, t) => Math.abs(a - b) <= Math.abs(b) * t;

  /* ---------- kompleks sayı yardımcıları ([re, im]) ---------- */
  const Cx = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1]],
    mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]],
    div: (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; },
    conj: (a) => [a[0], -a[1]],
    abs: (a) => Math.hypot(a[0], a[1]),
    ang: (a) => (Math.atan2(a[1], a[0]) * 180) / Math.PI,
    polar: (m, deg) => [m * Math.cos((deg * Math.PI) / 180), m * Math.sin((deg * Math.PI) / 180)],
    sc: (a, k) => [a[0] * k, a[1] * k],
  };
  const W50 = 2 * Math.PI * 50;

  function inst(parent, brand, dark = true, right = '') {
    const d = document.createElement('div'); d.className = 'inst' + (dark ? ' dark' : '');
    d.innerHTML = `<div class="brand"><span>${brand}</span><span>${right}</span></div><div class="ctrls"></div>`;
    parent.appendChild(d); return { el: d, c: d.querySelector('.ctrls') };
  }
  function lcd(parent, label, unit, w = 150) {
    const d = document.createElement('div'); d.className = 'lcd'; d.style.minWidth = w + 'px'; d.style.marginBottom = '6px';
    d.innerHTML = `<div class="lab">${label}</div><span class="big">0</span><span class="unit">${unit}</span>`;
    parent.insertBefore(d, parent.querySelector('.ctrls'));
    const b = d.querySelector('.big'), u = d.querySelector('.unit');
    return (t, un) => { b.textContent = t; if (un != null) u.textContent = un; };
  }
  function segBtns(parent, list, cur, onPick) {
    const w = document.createElement('div'); w.className = 'seg'; w.style.margin = '4px 0';
    list.forEach(([v, t]) => {
      const b = document.createElement('button'); b.className = 'seg-btn' + (v === cur ? ' on' : ''); b.innerHTML = t; b.dataset.v = v;
      b.onclick = () => { w.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); onPick(v); };
      w.appendChild(b);
    });
    parent.appendChild(w); return w;
  }

  /* ---------- şema yardımcıları ---------- */
  const sch = {
    w: (g, pts) => E('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'w' }, g),
    dot: (g, x, y) => E('circle', { cx: x, cy: y, r: 3.5, class: 'node' }, g),
    t: (g, x, y, s, cls = 'lbl', anchor = 'middle') => { const e = E('text', { x, y, class: cls, 'text-anchor': anchor }, g); e.innerHTML = s; return e; },
    rH(g, x1, x2, y) { const n = 6, L = 8, step = (x2 - x1 - 2 * L) / n; let d = `M${x1},${y} h${L}`; for (let i = 0; i < n; i++) d += ` l${step / 2},${i % 2 ? 7 : -7} l${step / 2},${i % 2 ? -7 : 7}`; d += ` L${x2},${y}`; E('path', { d, class: 'w' }, g); },
    rV(g, x, y1, y2) { const n = 6, L = 8, step = (y2 - y1 - 2 * L) / n; let d = `M${x},${y1} v${L}`; for (let i = 0; i < n; i++) d += ` l${i % 2 ? 7 : -7},${step / 2} l${i % 2 ? -7 : 7},${step / 2}`; d += ` L${x},${y2}`; E('path', { d, class: 'w' }, g); },
    lH(g, x1, x2, y) { const n = 4, L = 8, s = (x2 - x1 - 2 * L) / n; let d = `M${x1},${y} h${L}`; for (let i = 0; i < n; i++) d += ` a${s / 2},${s / 2} 0 0 1 ${s},0`; d += ` L${x2},${y}`; E('path', { d, class: 'w', fill: 'none' }, g); },
    lV(g, x, y1, y2) { const n = 4, L = 8, s = (y2 - y1 - 2 * L) / n; let d = `M${x},${y1} v${L}`; for (let i = 0; i < n; i++) d += ` a${s / 2},${s / 2} 0 0 1 0,${s}`; d += ` L${x},${y2}`; E('path', { d, class: 'w', fill: 'none' }, g); },
    cH(g, x1, x2, y) { const m = (x1 + x2) / 2; E('path', { d: `M${x1},${y} H${m - 5} M${m - 5},${y - 14} v28 M${m + 5},${y - 14} v28 M${m + 5},${y} H${x2}`, class: 'w' }, g); },
    cV(g, x, y1, y2) { const m = (y1 + y2) / 2; E('path', { d: `M${x},${y1} V${m - 5} M${x - 14},${m - 5} h28 M${x - 14},${m + 5} h28 M${x},${m + 5} V${y2}`, class: 'w' }, g); },
    gnd(g, x, y) { E('path', { d: `M${x},${y} v8 M${x - 11},${y + 8} h22 M${x - 7},${y + 13} h14 M${x - 3},${y + 18} h6`, class: 'w' }, g); },
    src(g, x, y, r = 20) { E('circle', { cx: x, cy: y, r, class: 'w', fill: '#fff' }, g); E('path', { d: `M${x - 10},${y} q5,-12 10,0 t10,0`, class: 'w', fill: 'none' }, g); },
    meter(g, x, y, s) { E('circle', { cx: x, cy: y, r: 15, class: 'w', fill: '#fff' }, g); sch.t(g, x, y + 5, s, 'lbl'); },
    box(g, x, y, w, h, s) { E('rect', { x, y, width: w, height: h, rx: 5, class: 'w', fill: '#f4f7ff' }, g); sch.t(g, x + w / 2, y + h / 2 + 5, s, 'lbl'); },
  };

  /* ---------- vektör / fazör çizimi (eşit ölçek) ---------- */
  function vecDiagram(g, segs, o = {}) {
    const vb = g.viewBox.baseVal, W = vb.width, H = vb.height, pad = 36;
    g.innerHTML = '';
    const xs = [0], ys = [0];
    segs.forEach((s) => { xs.push(s.a[0], s.b[0]); ys.push(s.a[1], s.b[1]); });
    if (o.square) { const m = Math.max(...xs.map(Math.abs), ...ys.map(Math.abs), 1e-12); xs.push(-m, m); ys.push(-m, m); }
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const span = Math.max(x1 - x0, y1 - y0, 1e-12);
    const k = Math.min((W - 2 * pad) / Math.max(x1 - x0, span * 0.05), (H - 2 * pad) / Math.max(y1 - y0, span * 0.05));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const X = (x) => W / 2 + (x - cx) * k, Y = (y) => H / 2 - (y - cy) * k;
    E('line', { x1: 8, x2: W - 8, y1: Y(0), y2: Y(0), stroke: '#c8ced8' }, g);
    E('line', { x1: X(0), x2: X(0), y1: 8, y2: H - 8, stroke: '#c8ced8' }, g);
    if (o.theta != null && Math.abs(o.theta) > 0.01) {
      const r = 34, th = o.theta, ex = X(0) + r * Math.cos(th), ey = Y(0) - r * Math.sin(th);
      E('path', { d: `M${X(0) + r},${Y(0)} A${r},${r} 0 0 ${th > 0 ? 0 : 1} ${ex},${ey}`, stroke: '#7a4bb5', fill: 'none', 'stroke-width': 1.5 }, g);
      const tl = E('text', { x: X(0) + (r + 14) * Math.cos(th / 2), y: Y(0) - (r + 14) * Math.sin(th / 2) + 4, fill: '#7a4bb5', 'text-anchor': 'middle' }, g); tl.textContent = 'θ';
    }
    segs.forEach((s) => {
      const ax = X(s.a[0]), ay = Y(s.a[1]), bx = X(s.b[0]), by = Y(s.b[1]), L = Math.hypot(bx - ax, by - ay);
      E('line', { x1: ax, y1: ay, x2: bx, y2: by, stroke: s.c, 'stroke-width': s.w || 3, 'stroke-dasharray': s.dash || '' }, g);
      if (L > 8 && !s.noArrow) {
        const ux = (bx - ax) / L, uy = (by - ay) / L, h = 10;
        E('path', { d: `M${bx},${by} L${bx - h * ux + h * 0.45 * uy},${by - h * uy - h * 0.45 * ux} L${bx - h * ux - h * 0.45 * uy},${by - h * uy + h * 0.45 * ux} Z`, fill: s.c }, g);
      }
      if (s.t) { const t = E('text', { x: (ax + bx) / 2 + (s.dx || 0), y: (ay + by) / 2 + (s.dy == null ? -7 : s.dy), fill: s.c, 'text-anchor': 'middle', 'font-weight': 700 }, g); t.textContent = s.t; }
    });
    return { X, Y, k };
  }
  function powerTri(g, P, Q, unit = 'W', lab = true) {
    const Sm = Math.hypot(P, Q), th = Math.atan2(Q, P);
    vecDiagram(g, [
      { a: [0, 0], b: [P, 0], c: '#0b5cad', t: lab ? 'P' : '', dy: Q >= 0 ? 16 : -8 },
      { a: [P, 0], b: [P, Q], c: '#c62828', t: lab ? 'Q' : '', dx: 14, dy: 4 },
      { a: [0, 0], b: [P, Q], c: '#1a8a4a', t: lab ? '|S|' : '', dx: -14, dy: Q >= 0 ? -6 : 14 },
    ], { theta: Sm > 1e-9 ? th : null });
    return { Sm, th };
  }

  /* ================= GEZİNME / İLERLEME ================= */
  const pages = ['giris', 'onbilgi', 'onhaz', 'd1', 'd2', 'd3', 'rapor'];
  function go(p) {
    S.page = p; save();
    $$('section.page').forEach((s) => s.classList.toggle('active', s.id === p));
    $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.p === p));
    if (p === 'rapor') buildReport();
    window.scrollTo(0, 0);
  }
  $$('#nav button').forEach((b) => (b.onclick = () => go(b.dataset.p)));

  const stepDefs = {};
  function steps(key, list) {
    stepDefs[key] = list;
    $('#' + key + 'steps').innerHTML = list.map((s) => `<li>${s.t}</li>`).join('');
  }
  function evalSteps(key) {
    const lis = $$('#' + key + 'steps li');
    stepDefs[key].forEach((s, i) => {
      const id = key + '_' + i;
      if (!S.steps[id] && s.test()) { S.steps[id] = true; save(); Lab.toast('✔ Step completed: ' + s.t.replace(/<[^>]+>/g, '').slice(0, 70)); progress(); }
      lis[i].classList.toggle('done', !!S.steps[id]);
    });
  }
  const qids = { onhaz: [], d1: [], d2: [], d3: [] };
  function progress() {
    let tot = 0, ok = 0;
    Object.keys(stepDefs).forEach((k) => stepDefs[k].forEach((_, i) => { tot++; if (S.steps[k + '_' + i]) ok++; }));
    Object.values(qids).flat().forEach((q) => { tot++; if (S.answers[q] && S.answers[q].ok) ok++; });
    const p = Math.round((100 * ok) / tot);
    $('#prog').style.width = p + '%'; $('#progTxt').textContent = p + '%';
    const dots = $$('#nav .dot');
    pages.forEach((pg, i) => {
      let done = false;
      if (pg === 'giris' || pg === 'onbilgi') done = true;
      else if (qids[pg]) done = qids[pg].every((q) => S.answers[q] && S.answers[q].ok) && (!stepDefs[pg] || stepDefs[pg].every((_, j) => S.steps[pg + '_' + j]));
      else if (pg === 'rapor') done = p === 100;
      dots[i].classList.toggle('done', done);
    });
  }
  const mcq = (pg, el, o) => { qids[pg].push(o.id); Lab.mcq($(el), o); };
  const numq = (pg, el, o) => { qids[pg].push(o.id); Lab.numq($(el), o); };
  const qok = (ids) => ids.every((q) => S.answers[q] && S.answers[q].ok);

  [['stName', 'name'], ['stNo', 'no'], ['stGroup', 'group'], ['stDate', 'date'], ['stComment', 'comment']].forEach(([id, k]) => {
    const e = $('#' + id); e.value = S.st[k] || (k === 'date' ? new Date().toLocaleDateString('en-GB') : '');
    e.addEventListener('input', () => { S.st[k] = e.value; save(); });
  });

  /* ---------- dalga biçimleri (tepe 1, faz 0..1) ---------- */
  const WAVES = {
    sin: { n: 'Sine', k: 1, f: (p) => Math.sin(2 * Math.PI * p) },
    kare: { n: 'Square', k: 2, f: (p) => (p < 0.5 ? 1 : -1) },
    ucgen: { n: 'Triangle', k: 3, f: (p) => 1 - 4 * Math.abs(p - 0.5) },
    yarim: { n: 'Half-wave', k: 4, f: (p) => Math.max(0, Math.sin(2 * Math.PI * p)) },
    tam: { n: 'Full-wave', k: 5, f: (p) => Math.abs(Math.sin(2 * Math.PI * p)) },
  };
  const THEO = { sin: Math.SQRT1_2, kare: 1, ucgen: 1 / Math.sqrt(3), yarim: 0.5, tam: Math.SQRT1_2 };
  Object.values(WAVES).forEach((w) => {
    const N = 4000; let m = 0, ms = 0;
    for (let i = 0; i < N; i++) { const v = w.f((i + 0.5) / N); m += v; ms += v * v; }
    m /= N; ms /= N; let ma = 0;
    for (let i = 0; i < N; i++) ma += Math.abs(w.f((i + 0.5) / N) - m);
    Object.assign(w, { mean: m, ms, mabs: ma / N });
  });

  /* ================= ÖN BİLGİ ================= */
  const OB = (() => {
    let wave = 'sin', t0 = performance.now();
    segBtns($('#obWave'), [['sin', 'Sine'], ['kare', 'Square'], ['ucgen', 'Triangle'], ['yarim', 'Half-wave']], wave, (v) => { wave = v; t0 = performance.now(); });
    const cv = $('#obRms'), g = cv.getContext('2d');
    function draw() {
      const Wd = cv.width, H = cv.height, L = 40, R = 10, y0 = H / 2 + 20, sy = 80;
      const w = WAVES[wave], per = 2, dur = 5000;
      const u = ((performance.now() - t0) % (dur + 1500)) / dur, cur = Math.min(1, u);
      g.fillStyle = '#fff'; g.fillRect(0, 0, Wd, H);
      const X = (x) => L + (x / per) * (Wd - L - R), Y = (v) => y0 - v * sy;
      g.strokeStyle = '#d8dde6'; g.lineWidth = 1;
      [-1, 0, 1].forEach((v) => { g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(Wd - R, Y(v)); g.stroke(); });
      g.fillStyle = '#556'; g.font = '11px Segoe UI'; g.textAlign = 'right';
      g.fillText('+V_m', L - 4, Y(1) + 4); g.fillText('0', L - 4, Y(0) + 4); g.fillText('−V_m', L - 4, Y(-1) + 4);
      const plotF = (fn, col, upto) => { g.strokeStyle = col; g.lineWidth = 2.2; g.beginPath(); for (let i = 0; i <= 600; i++) { const x = (i / 600) * per; if (x > upto) break; const v = fn(x % 1); i ? g.lineTo(X(x), Y(v)) : g.moveTo(X(x), Y(v)); } g.stroke(); };
      plotF(w.f, '#0b5cad', per);
      g.globalAlpha = 0.9; plotF((p) => w.f(p) ** 2, '#e07a10', per * cur); g.globalAlpha = 1;
      // birikmiş ortalama
      const n = Math.max(1, Math.round(cur * 2000)); let acc = 0;
      for (let i = 0; i < n; i++) acc += w.f(((i + 0.5) / 2000 * per) % 1) ** 2;
      const msr = acc / n, rms = Math.sqrt(msr);
      g.setLineDash([6, 4]); g.strokeStyle = '#e07a10'; g.beginPath(); g.moveTo(L, Y(msr)); g.lineTo(X(per * cur), Y(msr)); g.stroke(); g.setLineDash([]);
      g.strokeStyle = '#1a8a4a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(L, Y(rms)); g.lineTo(X(per * cur), Y(rms)); g.stroke();
      g.strokeStyle = '#7a4bb5'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X(per * cur), 10); g.lineTo(X(per * cur), H - 10); g.stroke();
      g.textAlign = 'left'; g.font = '12px Segoe UI';
      g.fillStyle = '#0b5cad'; g.fillText('v(t)', L + 6, 16);
      g.fillStyle = '#e07a10'; g.fillText('v²(t) and its mean (dashed)', L + 50, 16);
      g.fillStyle = '#1a8a4a'; g.fillText('√mean = V_rms', L + 240, 16);
      $('#obRmsTxt').innerHTML = `Over the part swept by the cursor: mean v² = <b>${num(msr, 3)}</b> V<sub>m</sub>², square root = <b>${num(rms, 3)}</b> V<sub>m</sub>. Watch where the mean settles over whole periods.`;
    }
    function tri() {
      const P = +$('#obP').value, Q = +$('#obQ').value;
      const { Sm, th } = powerTri($('#obTri'), P, Q);
      const pf = Sm > 0 ? P / Sm : 1;
      $('#obTriTxt').innerHTML = `S = ${num(P, 1)} ${Q < 0 ? '−' : '+'} j${num(Math.abs(Q), 1)} → |S| = ${num(Sm, 2)}, θ = ${num((th * 180) / Math.PI, 1)}°, pf = ${num(pf, 3)} ${Math.abs(Q) < 1e-9 ? '(unity)' : Q > 0 ? '<b>lagging</b> (inductive)' : '<b>leading</b> (capacitive)'}`;
    }
    $('#obP').oninput = tri; $('#obQ').oninput = tri; tri();
    return { draw };
  })();

  /* ================= ÖN HAZIRLIK ================= */
  numq('onhaz', '#preQ', { id: 'p1', q: '1) Example 2.9: A sinusoidal voltage with peak value V<sub>m</sub> = 625 V is applied to R = 50 Ω. What is the average power in W?', answer: 3906.25, unit: 'W', explain: 'V<sub>rms</sub> = 625/√2 = 441.94 V; P = 441.94²/50 = 3906.25 W. (7812.5 W is the peak of the instantaneous power.)', hint: 'Convert to rms first; not V<sub>m</sub>²/R but V<sub>m</sub>²/(2R).' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) Example 2.10: What is the resistance in Ω of a purely resistive heater rated 230 V, 1500 W?', answer: 230 * 230 / 1500, unit: 'Ω', explain: 'R = V<sub>rms</sub>²/P = 52 900/1500 = 35.27 Ω; I<sub>rms</sub> = 6.52 A.', hint: 'Rating values are rms and average power: P = V²/R.' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) For the same heater, what is the peak instantaneous power p<sub>max</sub> in W?', answer: 3000, unit: 'W', explain: 'p = V<sub>m</sub>I<sub>m</sub>cos²ωt; peak V<sub>m</sub>I<sub>m</sub> = 2 V<sub>rms</sub>I<sub>rms</sub> = 2P = 3000 W.', hint: 'In a resistor p(t) = P(1 + cos2ωt).' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) Example 2.12: 240 V, P = 8 kW, pf = 0.8 lagging. What is the <b>real part</b> of the load impedance (series R) in Ω?', answer: 4.608, unit: 'Ω', explain: 'S = 8 + j6 kVA; Z = V²/S* = 57 600/(8000 − j6000) = 4.608 + j3.456 Ω.', hint: 'Z = V<sub>rms</sub>²/S*, or I = |S|/V and R = P/I².' });
  numq('onhaz', '#preQ', { id: 'p5', q: '5) Example 2.14: v = 200cos(ωt+30°) V, i = 5cos(ωt−15°) A. What is the average power P in W?', answer: 353.55, unit: 'W', explain: 'P = ½V<sub>m</sub>I<sub>m</sub>cos(30°−(−15°)) = 500 × 0.7071 = 353.6 W; Q is also 353.6 VAR (inductive).', hint: 'Peak values are given: do not forget the ½ factor; θ = θ<sub>v</sub> − θ<sub>i</sub>.' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) Example 2.15: A load at 230 V draws S = 3 − j4 kVA. Which statement is correct?', opts: ['pf = 0.6 lagging, load inductive', 'pf = 0.6 leading, load capacitive', 'pf = 0.8 leading, load capacitive', 'pf = 0.75, load resistive'], correct: 1, explain: '|S| = 5 kVA, cos θ = 3/5 = 0.6; Q &lt; 0 → current leads, load capacitive. Z = 10.58∠−53.13° Ω.', hint: 'The sign of Q tells you the type of load.' });

  /* ================= DENEY 1 · Dalga biçimi ve rms ================= */
  const D1 = (() => {
    const box = $('#d1inst');
    const fg = inst(box, 'FUNCTION GENERATOR', true, '50 Ω output'); const fgL = lcd(fg.el, 'FREQUENCY', 'Hz', 140);
    S.d1w = S.d1w || 'sin';
    segBtns(fg.c, Object.entries(WAVES).map(([k, w]) => [k, w.n]), S.d1w, (v) => { S.d1w = v; save(); });
    const kA = new Lab.Knob(fg.c, { label: 'Amplitude Vm', min: 0, max: 20, step: 0.1, value: S.d1A ?? 5, dark: true, fmt: (v) => num(v, 1) + ' V', onChange: (v) => { S.d1A = v; save(); } });
    const kO = new Lab.Knob(fg.c, { label: 'DC offset', min: -5, max: 5, step: 0.1, value: S.d1O ?? 0, dark: true, fmt: (v) => num(v, 1) + ' V', onChange: (v) => { S.d1O = v; save(); } });
    const kF = new Lab.Knob(fg.c, { label: 'Frequency', min: 10, max: 20000, log: true, value: S.d1F ?? 50, dark: true, fmt: (v) => eng(v, 'Hz', 3), onChange: (v) => { S.d1F = v; save(); } });
    const ld = inst(box, 'LOAD + WATTMETER', false); const pL = lcd(ld.el, 'P<sub>R</sub> (average)', 'W', 120);
    const kR = new Lab.Knob(ld.c, { label: 'R load', min: 10, max: 2000, log: true, value: S.d1R ?? 1000, fmt: (v) => Lab.ohm(v), onChange: (v) => { S.d1R = v; save(); } });
    const m1 = inst(box, 'TRMS MULTIMETER', false, 'true rms'); const m1L = lcd(m1.el, 'V~ rms', 'V', 130);
    S.d1cpl = S.d1cpl || 'ac';
    segBtns(m1.c, [['ac', 'AC'], ['acdc', 'AC+DC']], S.d1cpl, (v) => { S.d1cpl = v; save(); });
    const m2 = inst(box, 'AVG-RESPONDING MULTIMETER', false, 'cheap'); const m2L = lcd(m2.el, 'V~ (sine-calibrated)', 'V', 130);

    // osiloskop
    const scope = new Lab.Scope($('#d1scope'));
    scope.ch[0].vdiv = 5; scope.ch[1].vdiv = 0.2; scope.ch[1].pos = -2; scope.tdiv = 5e-3;
    const sk = $('#d1scopeKnobs');
    const VL = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10];
    new Lab.Knob(sk, { label: 'CH1 V/div', list: VL, value: 5, dark: true, size: 44, fmt: (v) => eng(v, 'V'), onChange: (v) => (scope.ch[0].vdiv = v) });
    new Lab.Knob(sk, { label: 'MATH W/div', list: [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2], value: 0.2, dark: true, size: 44, fmt: (v) => eng(v, 'W'), onChange: (v) => (scope.ch[1].vdiv = v) });
    new Lab.Knob(sk, { label: 'Time/div', list: [1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2, 2e-2], value: 5e-3, dark: true, size: 44, fmt: (v) => eng(v, 's'), onChange: (v) => (scope.tdiv = v) });

    // şema
    const g = $('#d1sch');
    sch.src(g, 70, 115); sch.t(g, 70, 160, 'generator', 'lbl');
    sch.w(g, [[70, 95], [70, 50], [110, 50]]); sch.rH(g, 110, 190, 50); sch.t(g, 150, 35, '50 Ω (int.)');
    sch.w(g, [[190, 50], [620, 50]]); sch.w(g, [[70, 135], [70, 180], [620, 180]]);
    sch.dot(g, 300, 50); sch.dot(g, 300, 180); sch.rV(g, 300, 50, 180); const tR = sch.t(g, 314, 120, 'R', 'lbl', 'start');
    [[420, 'V', 'TRMS'], [520, 'V', 'AVG']].forEach(([x, s, l]) => { sch.dot(g, x, 50); sch.dot(g, x, 180); sch.w(g, [[x, 50], [x, 100]]); sch.meter(g, x, 115, s); sch.w(g, [[x, 130], [x, 180]]); sch.t(g, x + 20, 120, l, 'lbl', 'start'); });
    sch.t(g, 640, 55, 'CH1', 'lbl', 'start'); sch.gnd(g, 620, 180);
    const tV = sch.t(g, 300, 205, '', 'val');

    const plot = new Lab.Plot($('#d1plot'), { xlabel: 'waveform (1 sine … 5 full-wave)', ylabel: 'reading / V_m' });
    let cur = {};
    function compute() {
      const w = WAVES[S.d1w], R = kR.value, kk = R / (R + 50);
      const a = kA.value * kk, d = kO.value * kk, f = kF.value;
      const mean = a * w.mean + d, ms = a * a * w.ms + 2 * a * d * w.mean + d * d;
      const acr = a * Math.sqrt(Math.max(0, w.ms - w.mean * w.mean));
      const trms = (S.d1cpl === 'acdc' ? Math.sqrt(ms) : acr) / Math.sqrt(1 + (f / 1e5) ** 2);
      const avg = (1.1107 * a * w.mabs) / Math.sqrt(1 + (f / 2000) ** 2);
      cur = { w: S.d1w, vm: a, off: d, f, trms, cpl: S.d1cpl, avg, p: ms / R, R, mean };
      return cur;
    }
    function update() {
      const c = compute(), w = WAVES[c.w];
      fgL(eng(c.f, '', 4).trim());
      m1L(num(c.trms, 3)); m2L(num(c.avg, 3)); pL(c.p < 1 ? num(c.p * 1e3, 1) : num(c.p, 3), c.p < 1 ? 'mW' : 'W');
      tR.textContent = 'R = ' + Lab.ohm(c.R);
      tV.textContent = `at load: ${w.n}, peak ${num(c.vm, 2)} V, DC ${num(c.off, 2)} V`;
      const n = 800, T = scope.tdiv * 10, y1 = new Float64Array(n), y2 = new Float64Array(n);
      for (let i = 0; i < n; i++) { const t = (i / (n - 1)) * T, ph = (t * c.f) % 1, v = c.vm * w.f(ph) + c.off; y1[i] = v; y2[i] = (v * v) / c.R; }
      scope.draw({ n, y: [y1, y2] });
      const m = scope.measure(), m1 = m.ch[0];
      $('#d1scopeMeas').innerHTML = `CH1 Vpp ${num(m1.vpp, 2)} V<br>CH1 max ${num(m1.max, 2)} V<br>CH1 f ${isFinite(m1.f) ? eng(m1.f, 'Hz') : '—'}<br>MATH max ${eng(m.ch[1].max, 'W')}`;
    }
    const tbody = $('#d1tab tbody');
    function table() {
      tbody.innerHTML = S.d1rows.map((r, i) => `<tr><td>${i + 1}</td><td class="l">${WAVES[r.w].n}</td><td>${num(r.vm, 2)}</td><td>${num(r.off, 2)}</td><td>${eng(r.f, '', 3)}</td><td>${num(r.trms, 3)}</td><td>${r.cpl === 'ac' ? 'AC' : 'AC+DC'}</td><td>${num(r.avg, 3)}</td><td>${num(r.p, 4)}</td></tr>`).join('');
      tbody.parentElement.parentElement.scrollTop = 1e6;
      drawPlot();
    }
    function drawPlot() {
      const L = S.d1rows.filter((r) => Math.abs(r.off) < 0.01 && r.vm > 0.05);
      const ser = [];
      if ($('#d1theo').checked) Object.entries(THEO).forEach(([k, v]) => ser.push({ pts: [[WAVES[k].k - 0.35, v], [WAVES[k].k + 0.35, v]], line: true, color: '#1a8a4a', dash: [5, 4] }));
      ser.push({ pts: L.map((r) => [WAVES[r.w].k - 0.08, r.trms / r.vm]), dots: true, color: '#0b5cad' });
      ser.push({ pts: L.map((r) => [WAVES[r.w].k + 0.08, r.avg / r.vm]), dots: true, color: '#e07a10' });
      plot.draw(ser, [0.5, 5.5], [0, 1.25]);
    }
    $('#d1theo').onchange = drawPlot;
    function rec() { const c = compute(); S.d1rows.push({ w: c.w, vm: c.vm, off: c.off, f: c.f, trms: c.trms, cpl: c.cpl, avg: c.avg, p: c.p }); save(); table(); Lab.toast(`Recorded: ${WAVES[c.w].n}, TRMS ${num(c.trms, 3)} V, avg-responding ${num(c.avg, 3)} V`); }
    $('#d1rec').onclick = rec;
    $('#d1del').onclick = () => { S.d1rows.pop(); save(); table(); };
    $('#d1csv').onclick = () => Lab.downloadCSV('hafta9_deney1.csv', ['#', 'wave', 'Vm (V)', 'VDC (V)', 'f (Hz)', 'TRMS (V)', 'coupling', 'avg-responding (V)', 'P (W)'], S.d1rows.map((r, i) => [i + 1, WAVES[r.w].n, +r.vm.toFixed(4), +r.off.toFixed(4), +r.f.toFixed(2), +r.trms.toFixed(4), r.cpl, +r.avg.toFixed(4), +r.p.toFixed(6)]));
    table();
    return { update, rec, cur: () => cur, plotCanvas: $('#d1plot'), scopeCanvas: $('#d1scope') };
  })();

  const d1has = (fn) => S.d1rows.some(fn);
  steps('d1', [
    { t: '<b>Sine</b>, amplitude 10 V, DC offset 0, f = 50 Hz, R = 1 kΩ. Read the peak value at the load on the oscilloscope (slightly less than 10 V because of the internal resistance), compare the two multimeters and record (<kbd>R</kbd>).', test: () => d1has((r) => r.w === 'sin' && Math.abs(r.off) < 0.01 && r.vm > 5 && r.f < 200) },
    { t: 'Switch to a <b>square</b> wave with the same amplitude and record. Which meter changed, and which one was “wrong”?', test: () => d1has((r) => r.w === 'kare' && Math.abs(r.off) < 0.01 && r.vm > 5 && r.f < 200) },
    { t: 'Record the <b>triangle</b> wave. Turn on the theoretical line in the reading/V<sub>m</sub> plot and compare.', test: () => d1has((r) => r.w === 'ucgen' && Math.abs(r.off) < 0.01 && r.vm > 5 && r.f < 200) },
    { t: 'Record the <b>half-wave</b> rectified signal with the TRMS meter in <b>AC+DC</b> coupling, then record once more in <b>AC</b> coupling. Why is there a difference?', test: () => d1has((r) => r.w === 'yarim' && r.cpl === 'acdc' && r.f < 200) && d1has((r) => r.w === 'yarim' && r.cpl === 'ac' && r.f < 200) },
    { t: 'Add <b>at least 2 V DC offset</b> to the sine and record in AC+DC coupling; compare with √(V<sub>DC</sub>² + V<sub>ac</sub>²).', test: () => d1has((r) => r.w === 'sin' && Math.abs(r.off) >= 1.8 && r.cpl === 'acdc') },
    { t: 'Set the sine frequency to <b>≥ 5 kHz</b> and record: see the bandwidth limit of the average-responding meter.', test: () => d1has((r) => r.w === 'sin' && r.f >= 5000) },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: 'What does the average-responding meter read (in V) for a <b>square</b> wave with 10 V peak and zero DC component (low frequency)?', answer: 11.107, tol: 1.5, unit: 'V', explain: 'Mean |v| = 10 V; the meter multiplies by 1.111 → 11.11 V. True rms is 10 V: 11% high.', hint: 'For a square wave |v| equals V<sub>m</sub> at every instant; by which number does the meter multiply it?' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'What does the average-responding meter read (in V) for a <b>triangle</b> wave with 10 V peak?', answer: 5.554, tol: 1.5, unit: 'V', explain: 'Mean |v| = V<sub>m</sub>/2 = 5 V; × 1.111 = 5.55 V. True rms is 5.77 V: 3.8% low.', hint: 'The mean of |v| for a triangle is V<sub>m</sub>/2.' });
  numq('d1', '#d1Q', { id: 'd1q3', q: 'What is the total (AC+DC) rms value in V of a <b>half-wave</b> rectified sine with 10 V peak?', answer: 5, tol: 1.5, unit: 'V', explain: 'Sine for half a period, zero for the other half: mean v² = V<sub>m</sub>²/4 → V<sub>rms</sub> = V<sub>m</sub>/2.', hint: 'The mean of v² for a sine was V<sub>m</sub>²/2; what if half of it is zero?' });
  numq('d1', '#d1Q', { id: 'd1q4', q: '10 V peak sine + 3 V DC offset. What does the TRMS meter read (in V) in AC+DC coupling?', answer: Math.sqrt(9 + 50), tol: 1.5, unit: 'V', explain: '√(3² + 7.071²) = √59 = 7.68 V. In AC coupling only 7.07 V is seen.', hint: 'DC and AC rms values combine as a sum of squares.' });
  mcq('d1', '#d1Q', { id: 'd1q5', q: 'Which meter should you choose to measure a current containing harmonics (non-sinusoidal)?', opts: ['Average-responding meter; it is more stable', 'True rms (TRMS) meter; it applies the definition directly', 'Either one, the result is the same', 'Measuring the peak and dividing by √2 is enough'], correct: 1, explain: 'The form factor is 1.111 only for a sine; a TRMS meter takes the mean of v², so it is independent of the waveform (within its CF and bandwidth limits).', hint: 'For which wave is the 1.111 factor inside the average-responding meter correct?' });
  mcq('d1', '#d1Q', { id: 'd1q6', q: 'At 5 kHz the reading of the average-responding meter dropped, while the TRMS reading did not change. Why?', opts: ['The rms of the signal decreases with frequency', 'The cheap meter has a narrow bandwidth; it attenuates high frequencies', 'The generator’s internal resistance increases with frequency', 'Oscilloscope loading'], correct: 1, explain: 'The rms value is independent of frequency. The AC bandwidth of cheap meters is typically 400 Hz–2 kHz.', hint: 'Did the peak value on the oscilloscope change?' });

  /* ================= DENEY 2 · Kompleks güç ================= */
  const D2 = (() => {
    const box = $('#d2inst');
    const vs = inst(box, 'VARIAC + ISOLATION TRANSFORMER', true, '50 Hz'); const vsL = lcd(vs.el, 'OUTPUT', 'V', 110);
    const kV = new Lab.Knob(vs.c, { label: 'Voltage', min: 0, max: 250, step: 1, value: S.d2V ?? 0, dark: true, fmt: (v) => num(v, 0) + ' V', onChange: (v) => { S.d2V = v; save(); } });
    const lb = inst(box, 'R–L–C LOAD BOX', false, 'series');
    const kR = new Lab.Knob(lb.c, { label: 'R', min: 0.5, max: 100, log: true, value: S.d2R ?? 20, fmt: (v) => num(v, v < 10 ? 3 : 2) + ' Ω', onChange: (v) => { S.d2R = v; save(); } });
    const kL = new Lab.Knob(lb.c, { label: 'L', min: 0, max: 100, step: 0.1, value: S.d2L ?? 0, fmt: (v) => num(v, 1) + ' mH', onChange: (v) => { S.d2L = v; save(); } });
    const kC = new Lab.Knob(lb.c, { label: 'C (0 = none)', min: 0, max: 1000, step: 1, value: S.d2C ?? 0, fmt: (v) => (v ? num(v, 0) + ' µF' : 'short'), onChange: (v) => { S.d2C = v; save(); } });
    const pa = inst(box, 'POWER ANALYSER', true, '1 phase');
    const L = {};
    [['V', 'V rms', 'V'], ['I', 'I rms', 'A'], ['P', 'P', 'W'], ['Q', 'Q', 'VAR'], ['S', '|S|', 'VA'], ['pf', 'pf', '']].forEach(([k, l, u]) => (L[k] = lcd(pa.el, l, u, 120)));

    const g = $('#d2sch');
    sch.src(g, 60, 120); sch.t(g, 60, 165, 'v<tspan font-size="10" dy="3">s</tspan>');
    sch.w(g, [[60, 100], [60, 50], [130, 50]]); sch.box(g, 130, 30, 70, 40, 'W · A'); sch.w(g, [[200, 50], [260, 50]]);
    sch.rH(g, 260, 350, 50); sch.w(g, [[350, 50], [380, 50]]); sch.lH(g, 380, 470, 50); sch.w(g, [[470, 50], [500, 50]]);
    sch.cH(g, 500, 560, 50); sch.w(g, [[560, 50], [640, 50], [640, 190], [60, 190], [60, 140]]);
    const tR = sch.t(g, 305, 30, 'R'), tL = sch.t(g, 425, 30, 'L'), tC = sch.t(g, 530, 30, 'C');
    const tZ = sch.t(g, 400, 120, '', 'val'), tI = sch.t(g, 230, 85, '', 'val');
    sch.t(g, 660, 120, 'load', 'lbl', 'start');

    const plot = new Lab.Plot($('#d2pt'), { xlabel: 't (ms)', ylabel: 'p (kW)' });
    let cur = {};
    function compute() {
      const V = kV.value, R = kR.value, Lh = kL.value * 1e-3, Cf = kC.value * 1e-6;
      const X = W50 * Lh - (Cf > 0 ? 1 / (W50 * Cf) : 0), Z = [R, X];
      const I = Cx.div([V, 0], Z), Sc = Cx.mul([V, 0], Cx.conj(I));
      const Sm = Cx.abs(Sc), pf = Sm > 1e-12 ? Sc[0] / Sm : 1;
      cur = { V, R, L: kL.value, C: kC.value, Z, I, Im: Cx.abs(I), P: Sc[0], Q: Sc[1], Sm, pf };
      return cur;
    }
    const tur = (Q, Sm) => (Math.abs(Q) <= Sm * 0.005 ? 'resistive' : Q > 0 ? 'inductive' : 'capacitive');
    const pfTxt = (pf, Q, Sm) => num(pf, 3) + (Math.abs(Q) <= Sm * 0.005 ? '' : Q > 0 ? ' lagging' : ' leading');
    function update() {
      const c = compute();
      vsL(num(c.V, 0));
      L.V(num(c.V, 1)); L.I(num(c.Im, c.Im < 10 ? 3 : 2));
      const big = (x, u) => (Math.abs(x) >= 1000 ? [num(x / 1000, 3), 'k' + u] : [num(x, 1), u]);
      L.P(...big(c.P, 'W')); L.Q(...big(c.Q, 'VAR')); L.S(...big(c.Sm, 'VA')); L.pf(pfTxt(c.pf, c.Q, c.Sm));
      tR.textContent = 'R = ' + num(c.R, 3) + ' Ω'; tL.textContent = 'L = ' + num(c.L, 1) + ' mH'; tC.textContent = c.C ? 'C = ' + num(c.C, 0) + ' µF' : 'C short';
      tZ.textContent = `Z = ${num(c.Z[0], 3)} ${c.Z[1] < 0 ? '−' : '+'} j${num(Math.abs(c.Z[1]), 3)} Ω`;
      tI.textContent = `I = ${num(c.Im, 2)} A`;
      const th = Math.atan2(c.Q, c.P);
      const iN = Cx.sc(Cx.polar(0.8, (-th * 180) / Math.PI), 1);
      vecDiagram($('#d2fz'), [{ a: [0, 0], b: [1, 0], c: '#0b5cad', t: 'V', dy: 16 }, { a: [0, 0], b: iN, c: '#c62828', t: 'I', dx: 10 }], { square: true, theta: c.Sm > 1e-9 ? -th : null });
      powerTri($('#d2tri'), c.P, c.Q);
      // p(t)
      const pts = [], vv = [], ii = [], Imag = c.Im * Math.SQRT2, iA = Math.atan2(c.I[1], c.I[0]);
      let pm = 1e-9;
      for (let k = 0; k <= 300; k++) { const t = (k / 300) * 0.04, v = c.V * Math.SQRT2 * Math.cos(W50 * t), i = Imag * Math.cos(W50 * t + iA), p = (v * i) / 1000; pts.push([t * 1e3, p]); pm = Math.max(pm, Math.abs(p)); vv.push([t * 1e3, v]); ii.push([t * 1e3, i]); }
      const ser = [];
      if ($('#d2vi').checked) {
        const vm = c.V * Math.SQRT2 || 1, im = Imag || 1;
        ser.push({ pts: vv.map(([t, v]) => [t, (v / vm) * pm * 0.9]), line: true, color: '#9db8dd', width: 1.3 });
        ser.push({ pts: ii.map(([t, i]) => [t, (i / im) * pm * 0.9]), line: true, color: '#e6a3a3', width: 1.3 });
      }
      ser.push({ pts, line: true, color: '#1a8a4a', width: 2.5 });
      ser.push({ pts: [[0, c.P / 1000], [40, c.P / 1000]], line: true, color: '#0b5cad', dash: [6, 4] });
      plot.draw(ser, [0, 40], [-pm * 1.1, pm * 1.1]);
      // ipucu
      let h = '';
      if (c.V < 1) h = 'The variac is at zero. Increase the voltage slowly.';
      else if (near(c.V, 240, 1) && !S.steps.d2_1) {
        if (Math.abs(c.pf - 0.8) > 0.01 && rel(c.P, 8000, 0.05)) h = 'P is close but pf is not 0.8: change the ratio of R to X (tan θ = X/R should be 0.75).';
        else if (Math.abs(c.pf - 0.8) <= 0.01 && !rel(c.P, 8000, 0.02)) h = 'pf is correct but P is not: scale R and X <b>by the same factor</b> (|Z| = V²/|S|).';
        else if (rel(c.P, 8000, 0.02) && Math.abs(c.pf - 0.8) <= 0.01 && c.Q < 0) h = 'pf is 0.8 but <b>leading</b>: “lagging” means inductive, use L instead of C.';
      }
      $('#d2hint').innerHTML = h || 'Hint: first compute Z on paper, then set the R, L, C knobs. You can tap a knob and type a value.';
    }
    const tbody = $('#d2tab tbody');
    function table() {
      tbody.innerHTML = S.d2rows.map((r, i) => `<tr><td>${i + 1}</td><td>${num(r.V, 0)}</td><td>${num(r.R, 3)}</td><td>${num(r.L, 1)}</td><td>${r.C ? num(r.C, 0) : '—'}</td><td>${num(r.Im, 3)}</td><td>${num(r.P, 1)}</td><td>${num(r.Q, 1)}</td><td>${num(r.Sm, 1)}</td><td>${pfTxt(r.pf, r.Q, r.Sm)}</td><td class="l">${tur(r.Q, r.Sm)}</td></tr>`).join('');
      tbody.parentElement.parentElement.scrollTop = 1e6;
    }
    function rec() { const c = compute(); if (c.V < 1) return Lab.toast('Source voltage is zero: turn up the variac first.'); S.d2rows.push({ V: c.V, R: c.R, L: c.L, C: c.C, Im: c.Im, P: c.P, Q: c.Q, Sm: c.Sm, pf: c.pf }); save(); table(); Lab.toast(`Recorded: P = ${num(c.P, 1)} W, Q = ${num(c.Q, 1)} VAR`); }
    $('#d2rec').onclick = rec;
    $('#d2del').onclick = () => { S.d2rows.pop(); save(); table(); };
    $('#d2csv').onclick = () => Lab.downloadCSV('hafta9_deney2.csv', ['#', 'V', 'R (ohm)', 'L (mH)', 'C (uF)', 'I (A)', 'P (W)', 'Q (VAR)', 'S (VA)', 'pf'], S.d2rows.map((r, i) => [i + 1, r.V, +r.R.toFixed(4), r.L, r.C, +r.Im.toFixed(4), +r.P.toFixed(2), +r.Q.toFixed(2), +r.Sm.toFixed(2), +r.pf.toFixed(4)]));
    table();
    return { update, rec, plotCanvas: $('#d2pt') };
  })();

  const d2has = (fn) => S.d2rows.some(fn);
  steps('d2', [
    { t: 'Raise the variac from zero to <b>230 V</b>. Record a measurement with L = 0, C = short (pure resistance). Do V and I overlap in the phasor diagram? Does p(t) ever go negative?', test: () => d2has((r) => r.L === 0 && r.C === 0 && r.V > 200) },
    { t: '<b>Design (Example 2.12):</b> compute and build the series R–L load that draws <b>P = 8 kW, pf = 0.8 lagging</b> at 240 V, and record it.', test: () => d2has((r) => near(r.V, 240, 1) && rel(r.P, 8000, 0.02) && near(r.pf, 0.8, 0.01) && r.Q > 0) },
    { t: 'Build a capacitive load (Q &lt; 0) and record. Which way did I rotate in the phasor diagram, and which way did the triangle open?', test: () => d2has((r) => r.Q < -0.02 * r.Sm) },
    { t: '<b>Design (Example 2.15):</b> build the series R–C load that draws <b>S = 3 − j4 kVA</b> at 230 V, and record it.', test: () => d2has((r) => near(r.V, 230, 1) && rel(r.P, 3000, 0.03) && rel(r.Q, -4000, 0.03)) },
    { t: 'Use L and C <b>together</b> to obtain pf ≥ 0.995 and record (close to series resonance). Why did the current increase?', test: () => d2has((r) => r.L > 0 && r.C > 0 && r.pf >= 0.995) },
    { t: 'Record <b>at least 5</b> measurements in total and check that |S|² = P² + Q² in every row.', test: () => S.d2rows.length >= 5 },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'What should the series <b>L</b> be in mH for the Example 2.12 load (50 Hz)?', answer: 3.456 / W50 * 1000, tol: 1.5, unit: 'mH', explain: 'X = 3.456 Ω → L = X/ω = 3.456/314.16 = 11.0 mH.', hint: 'Divide the imaginary part of Z = V²/S* by ω.' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'What is the source current I<sub>rms</sub> in A for the Example 2.12 load?', answer: 10000 / 240, tol: 1, unit: 'A', explain: 'I = |S|/V = 10 000/240 = 41.67 A.', hint: '|S| = P/pf.' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 'To build the Example 2.15 load as a series R–C, what should C be in µF (50 Hz)?', answer: 1e6 / (W50 * 0.8 * 230 * 230 / 5000), tol: 1.5, unit: 'µF', explain: '|Z| = 230²/5000 = 10.58 Ω; X = −10.58 × 0.8 = −8.464 Ω; C = 1/(ω × 8.464) = 376 µF. R = 6.348 Ω.', hint: 'Z = V²/S*; its imaginary part is −1/(ωC).' });
  mcq('d2', '#d2Q', { id: 'd2q4', q: 'With an inductive load the p(t) curve becomes <b>negative</b> during part of the period. What does this mean?', opts: ['It is a measurement error', 'During that interval the load returns the energy stored in the inductor to the source', 'The load generates power, P &lt; 0', 'The current is zero'], correct: 1, explain: 'The mean (P) stays positive; Q is the amplitude of the energy going back and forth. In a pure resistor p(t) is never negative.', hint: 'An inductor stores energy and gives it back.' });
  mcq('d2', '#d2Q', { id: 'd2q5', q: 'The power analyser shows “pf = 0.8 lagging”. Which statement is correct?', opts: ['The current leads the voltage, Q &lt; 0', 'The current lags the voltage, Q &gt; 0, the load is inductive', 'The load is capacitive, Q &gt; 0', 'P is negative'], correct: 1, explain: '“Lagging/leading” describes the position of the current relative to the voltage. S = 8 + j6 kVA.', hint: 'Where is I in the phasor diagram?' });
  mcq('d2', '#d2Q', { id: 'd2q6', q: 'Of two loads drawing the same P, what can be said about the source current of the one with the lower pf?', opts: ['It is smaller', 'It is the same', 'It is larger: I = P/(V·pf)', 'pf does not affect the current'], correct: 2, explain: 'A low pf means a larger current and more line loss. In Week 10 we will correct this with a capacitor.', hint: 'P = V I cos θ.' });

  /* ================= DENEY 3 · Paralel yükler ================= */
  const D3 = (() => {
    const box = $('#d3inst'), V0 = 240;
    const bar = inst(box, 'AC BUS', true, '50 Hz'); const barL = lcd(bar.el, 'BUS', 'V', 100);
    const kV = new Lab.Knob(bar.c, { label: 'Voltage', min: 200, max: 250, step: 1, value: S.d3V ?? 240, dark: true, fmt: (v) => num(v, 0) + ' V', onChange: (v) => { S.d3V = v; save(); } });
    S.d3k = S.d3k || [true, false]; S.d3lag = S.d3lag || [true, true]; S.d3pt = S.d3pt || 'T';
    const loads = [0, 1].map((k) => {
      const b = inst(box, `LOAD ${k + 1}`, false, 'defined at 240 V');
      const sw = document.createElement('button'); sw.className = 'seg-btn' + (S.d3k[k] ? ' on' : ''); sw.textContent = `K${k + 1} ${S.d3k[k] ? 'CLOSED (connected)' : 'OPEN'}`; sw.style.width = '100%';
      sw.onclick = () => { S.d3k[k] = !S.d3k[k]; sw.classList.toggle('on', S.d3k[k]); sw.textContent = `K${k + 1} ${S.d3k[k] ? 'CLOSED (connected)' : 'OPEN'}`; save(); };
      b.c.appendChild(sw);
      const kP = new Lab.Knob(b.c, { label: 'P', min: 0, max: 15, step: 0.1, value: (S.d3P || [])[k] ?? (k ? 2 : 5), fmt: (v) => num(v, 1) + ' kW', onChange: (v) => { (S.d3P = S.d3P || [5, 2])[k] = v; save(); } });
      const kF = new Lab.Knob(b.c, { label: 'pf', min: 0.1, max: 1, step: 0.01, value: (S.d3F || [])[k] ?? 0.9, fmt: (v) => num(v, 2), onChange: (v) => { (S.d3F = S.d3F || [0.9, 0.9])[k] = v; save(); } });
      segBtns(b.c, [['g', 'lagging'], ['i', 'leading']], S.d3lag[k] ? 'g' : 'i', (v) => { S.d3lag[k] = v === 'g'; save(); });
      return { kP, kF };
    });
    const pa = inst(box, 'POWER ANALYSER + CLAMP', true);
    segBtns(pa.c, [['T', 'Source'], ['1', 'Load 1'], ['2', 'Load 2']], S.d3pt, (v) => { S.d3pt = v; save(); });
    const L = {};
    [['I', 'I rms', 'A'], ['P', 'P', 'kW'], ['Q', 'Q', 'kVAR'], ['S', '|S|', 'kVA'], ['pf', 'pf', '']].forEach(([k, l, u]) => (L[k] = lcd(pa.el, l, u, 120)));

    const g = $('#d3sch');
    sch.src(g, 60, 130); sch.w(g, [[60, 110], [60, 50], [110, 50]]); sch.box(g, 110, 32, 56, 36, 'P_T'); sch.w(g, [[166, 50], [600, 50]]);
    sch.w(g, [[60, 150], [60, 210], [600, 210]]);
    const swE = [], tLd = [];
    [[300, 0], [500, 1]].forEach(([x, k]) => {
      sch.dot(g, x, 50); sch.dot(g, x, 210);
      sch.w(g, [[x, 50], [x, 70]]); swE[k] = E('line', { x1: x, y1: 70, x2: x, y2: 95, class: 'w' }, g); E('circle', { cx: x, cy: 70, r: 3, fill: '#222' }, g); E('circle', { cx: x, cy: 95, r: 3, fill: '#222' }, g);
      sch.t(g, x - 12, 88, 'K' + (k + 1), 'lbl', 'end');
      sch.w(g, [[x, 95], [x, 120]]); sch.box(g, x - 40, 120, 80, 40, 'Load ' + (k + 1)); sch.w(g, [[x, 160], [x, 210]]);
      tLd[k] = sch.t(g, x + 48, 145, '', 'val', 'start');
    });
    const pens = E('ellipse', { cx: 0, cy: 0, rx: 14, ry: 9, fill: 'none', stroke: '#d0480f', 'stroke-width': 3 }, g);
    const tV = sch.t(g, 60, 30, '', 'val', 'start');

    function loadS(k, V) {
      const P = loads[k].kP.value * 1000, pf = loads[k].kF.value, Q = (S.d3lag[k] ? 1 : -1) * P * Math.tan(Math.acos(pf));
      return Cx.sc([P, Q], (V / V0) ** 2);
    }
    let cur = {};
    function compute() {
      const V = kV.value;
      const S1 = S.d3k[0] ? loadS(0, V) : [0, 0], S2 = S.d3k[1] ? loadS(1, V) : [0, 0], ST = Cx.add(S1, S2);
      const Sp = S.d3pt === '1' ? S1 : S.d3pt === '2' ? S2 : ST, Sm = Cx.abs(Sp);
      cur = { V, S1, S2, ST, pt: S.d3pt, k1: S.d3k[0], k2: S.d3k[1], lag2: S.d3lag[1], P: Sp[0], Q: Sp[1], Sm, I: Sm / V, pf: Sm > 1e-9 ? Sp[0] / Sm : 1 };
      return cur;
    }
    const pfTxt = (pf, Q, Sm) => num(pf, 3) + (Math.abs(Q) <= Sm * 0.005 ? '' : Q > 0 ? ' lagging' : ' leading');
    function update() {
      const c = compute();
      barL(num(c.V, 0));
      L.I(num(c.I, 2)); L.P(num(c.P / 1000, 3)); L.Q(num(c.Q / 1000, 3)); L.S(num(c.Sm / 1000, 3)); L.pf(c.Sm > 1 ? pfTxt(c.pf, c.Q, c.Sm) : '—');
      [0, 1].forEach((k) => { const x = k ? 500 : 300; swE[k].setAttribute('x2', S.d3k[k] ? x : x + 18); tLd[k].textContent = S.d3k[k] ? '' : 'disconnected'; });
      const pp = { T: [138, 90], 1: [300, 108], 2: [500, 108] }[c.pt]; pens.setAttribute('cx', c.pt === 'T' ? 200 : pp[0]); pens.setAttribute('cy', c.pt === 'T' ? 50 : pp[1]);
      tV.textContent = `bus ${num(c.V, 0)} V`;
      const k = 1 / 1000;
      vecDiagram($('#d3tri'), [
        { a: [0, 0], b: Cx.sc(c.S1, k), c: '#0b5cad', t: c.k1 ? 'S1' : '' },
        { a: Cx.sc(c.S1, k), b: Cx.sc(c.ST, k), c: '#e07a10', t: c.k2 ? 'S2' : '' },
        { a: [0, 0], b: Cx.sc(c.ST, k), c: '#1a8a4a', t: 'S_T', dash: '6 4', dy: 16 },
      ]);
      const I1 = Cx.conj(Cx.sc(c.S1, 1 / c.V)), I2 = Cx.conj(Cx.sc(c.S2, 1 / c.V)), IT = Cx.add(I1, I2);
      const mx = Math.max(Cx.abs(I1), Cx.abs(I2), Cx.abs(IT), 1e-9), n = (z) => Cx.sc(z, 1 / mx);
      vecDiagram($('#d3fz'), [
        { a: [0, 0], b: [1.1, 0], c: '#888', t: 'V', dy: 16, w: 2 },
        { a: [0, 0], b: n(I1), c: '#0b5cad', t: c.k1 ? 'I1' : '' },
        { a: n(I1), b: n(IT), c: '#e07a10', t: c.k2 ? 'I2' : '', dash: '5 4' },
        { a: [0, 0], b: n(IT), c: '#1a8a4a', t: 'I_T', dy: 16 },
      ], { square: true });
    }
    const PTN = { T: 'Source', 1: 'Load 1', 2: 'Load 2' };
    const tbody = $('#d3tab tbody');
    function table() {
      tbody.innerHTML = S.d3rows.map((r, i) => `<tr><td>${i + 1}</td><td class="l">${PTN[r.pt]}</td><td>${r.k1 ? '●' : '○'}</td><td>${r.k2 ? '●' : '○'}</td><td>${num(r.V, 0)}</td><td>${num(r.I, 2)}</td><td>${num(r.P / 1000, 3)}</td><td>${num(r.Q / 1000, 3)}</td><td>${num(r.Sm / 1000, 3)}</td><td>${pfTxt(r.pf, r.Q, r.Sm)}</td></tr>`).join('');
      tbody.parentElement.parentElement.scrollTop = 1e6;
    }
    function rec() { const c = compute(); S.d3rows.push({ pt: c.pt, k1: c.k1, k2: c.k2, lag2: c.lag2, V: c.V, I: c.I, P: c.P, Q: c.Q, Sm: c.Sm, pf: c.pf }); save(); table(); Lab.toast(`Recorded (${PTN[c.pt]}): P = ${num(c.P / 1000, 3)} kW, Q = ${num(c.Q / 1000, 3)} kVAR`); }
    $('#d3rec').onclick = rec;
    $('#d3del').onclick = () => { S.d3rows.pop(); save(); table(); };
    $('#d3csv').onclick = () => Lab.downloadCSV('hafta9_deney3.csv', ['#', 'clamp', 'K1', 'K2', 'V', 'I (A)', 'P (W)', 'Q (VAR)', 'S (VA)', 'pf'], S.d3rows.map((r, i) => [i + 1, PTN[r.pt], r.k1 ? 1 : 0, r.k2 ? 1 : 0, r.V, +r.I.toFixed(3), +r.P.toFixed(1), +r.Q.toFixed(1), +r.Sm.toFixed(1), +r.pf.toFixed(4)]));
    table();
    return { update, rec };
  })();

  const d3has = (fn) => S.d3rows.some(fn);
  steps('d3', [
    { t: 'Set Load 1 to <b>8 kW, pf 0.8 lagging</b>, close K1, put the clamp on <b>Load 1</b> and record at 240 V (S<sub>1</sub> = 8 + j6 kVA expected).', test: () => d3has((r) => r.pt === '1' && r.k1 && near(r.V, 240, 0.5) && rel(r.P, 8000, 0.01) && rel(r.Q, 6000, 0.02)) },
    { t: 'Set Load 2 to <b>4 kW, pf 0.6 leading</b>, close K2, put the clamp on <b>Load 2</b> and record.', test: () => d3has((r) => r.pt === '2' && r.k2 && near(r.V, 240, 0.5) && rel(r.P, 4000, 0.01) && rel(r.Q, -16000 / 3, 0.02)) },
    { t: 'With both loads connected, move the clamp to the <b>Source</b> line and record. Compare P<sub>T</sub>, Q<sub>T</sub> and |S<sub>T</sub>| with the previous two rows.', test: () => d3has((r) => r.pt === 'T' && r.k1 && r.k2 && near(r.V, 240, 0.5) && rel(r.P, 12000, 0.01) && near(r.Q, 666.7, 150)) },
    { t: 'Make Load 2 <b>lagging</b> and record again at the source. How did the total pf and the source current change?', test: () => d3has((r) => r.pt === 'T' && r.k1 && r.k2 && r.lag2 && r.Q > 10000) },
    { t: 'Answer the questions: why are |S<sub>1</sub>| + |S<sub>2</sub>| and |S<sub>T</sub>| different?', test: () => qok(['d3q1', 'd3q2', 'd3q3']) },
  ]);
  numq('d3', '#d3Q', { id: 'd3q1', q: 'Example 2.13: What is the reactive power Q<sub>2</sub> of Load 2 (4 kW, 0.6 leading) in kVAR (with sign)?', answer: -16 / 3, tol: 1.5, unit: 'kVAR', explain: '|S<sub>2</sub>| = 4/0.6 = 6.667 kVA; Q<sub>2</sub> = −√(6.667² − 4²) = −5.333 kVAR.', hint: 'Leading → capacitive → Q &lt; 0.' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'What is the total apparent power |S<sub>T</sub>| in kVA?', answer: Math.hypot(12, 6 - 16 / 3), tol: 1, unit: 'kVA', explain: 'S<sub>T</sub> = 12 + j0.667 kVA → |S<sub>T</sub>| = 12.02 kVA.', hint: 'Add P and Q separately, then take the magnitude.' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'What is the arithmetic sum |S<sub>1</sub>| + |S<sub>2</sub>| in kVA? (Compare with the measured |S<sub>T</sub>|.)', answer: 10 + 20 / 3, tol: 1, unit: 'kVA', explain: '10 + 6.667 = 16.67 kVA; the actual total is only 12.02 kVA. The Qs cancelled each other.', hint: '|S<sub>1</sub>| = 10 kVA.' });
  numq('d3', '#d3Q', { id: 'd3q4', q: 'In Example 2.13, what is the source current I<sub>rms</sub> in A?', answer: Math.hypot(12000, 2000 / 3) / 240, tol: 1, unit: 'A', explain: 'I = |S<sub>T</sub>|/V = 12 018/240 = 50.08 A; total pf = 12/12.02 = 0.998 lagging.', hint: 'I = |S<sub>T</sub>|/V.' });
  mcq('d3', '#d3Q', { id: 'd3q5', q: 'Why did the source current increase when Load 2 was lagging instead of leading?', opts: ['Because P increased', 'The Qs no longer cancel but add; |S<sub>T</sub>| increased', 'Because the bus voltage dropped', 'Because the clamp was attached incorrectly'], correct: 1, explain: 'Q<sub>T</sub> = 6 + 5.33 = 11.33 kVAR; |S<sub>T</sub>| = 16.5 kVA. A capacitive load “balancing” an inductive load is the basis of the power factor correction in Week 10.', hint: 'P did not change; what did?' });

  /* ================= RAPOR ================= */
  function buildReport() {
    const sec = { onhaz: 'Pre-lab', d1: 'Experiment 1', d2: 'Experiment 2', d3: 'Experiment 3' };
    let tot = 0, ok = 0;
    const qrows = Object.entries(qids).map(([pg, ids]) => ids.map((id) => {
      const a = S.answers[id]; tot++; if (a && a.ok) ok++;
      const q = $(`[data-qid="${id}"] .qt`); const qt = q ? q.innerHTML : id;
      return `<tr><td class="l">${sec[pg]}</td><td class="l">${qt}</td><td class="l">${a ? a.a : '—'}</td><td>${a ? (a.ok ? '✔' : '✘') : '—'}</td></tr>`;
    }).join('')).join('');
    let sTot = 0, sOk = 0;
    Object.keys(stepDefs).forEach((k) => stepDefs[k].forEach((_, i) => { sTot++; if (S.steps[k + '_' + i]) sOk++; }));
    const img = (c) => { try { return `<img src="${c.toDataURL()}" style="width:48%;border:1px solid #ccc">`; } catch (e) { return ''; } };
    const tb = (id) => `<table class="data"><thead>${$(id + ' thead').innerHTML}</thead><tbody>${$(id + ' tbody').innerHTML}</tbody></table>`;
    const html = `
      <h2 style="margin:0">Circuit Theory II · Virtual Laboratory · Week 9 Report</h2>
      <p><b>Topic:</b> RMS value, true rms measurement, complex power and the power triangle</p>
      <table class="data" style="width:auto"><tr><th>Full name</th><td class="l">${S.st.name || ''}</td><th>Student ID</th><td class="l">${S.st.no || ''}</td><th>Group</th><td class="l">${S.st.group || ''}</td><th>Date</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Summary</h3>
      <p>Completed lab-sheet steps: <b>${sOk}/${sTot}</b> · Correct answers: <b>${ok}/${tot}</b> · Score: <b>${Math.round((50 * sOk) / sTot + (50 * ok) / tot)}/100</b></p>
      <h3>Answers</h3>
      <table class="data"><thead><tr><th>Section</th><th>Question</th><th>Answer</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Experiment 1 · Waveform and rms</h3>${tb('#d1tab')}
      <h3>Experiment 2 · Complex power</h3>${tb('#d2tab')}
      <h3>Experiment 3 · Parallel loads</h3>${tb('#d3tab')}
      <h3>Plots</h3>
      <div>${img(D1.plotCanvas)} ${img(D1.scopeCanvas)}</div>
      <div>${img(D2.plotCanvas)}</div>
      <h3>Student discussion</h3>
      <p style="white-space:pre-wrap;border:1px solid #ccc;padding:8px;min-height:60px">${(S.st.comment || '').replace(/</g, '&lt;')}</p>`;
    $('#reportPreview').innerHTML = html; $('#report').innerHTML = html;
  }
  $('#printBtn').onclick = () => { buildReport(); window.print(); };
  $('#resetBtn').onclick = () => { if (confirm('Delete all measurements, answers and progress for this week?')) { localStorage.removeItem('devrelab-en:' + KEY); location.reload(); } };

  /* ================= klavye / döngü ================= */
  $('#helpBtn').onclick = () => $('#helpModal').classList.add('show');
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (e.key === 'Escape') $('#helpModal').classList.remove('show');
    if (e.altKey && /^[0-6]$/.test(e.key)) { go(pages[+e.key]); e.preventDefault(); return; }
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.key === '?') $('#helpModal').classList.add('show');
    if (e.key === 'r' || e.key === 'R') { if (S.page === 'd1') D1.rec(); if (S.page === 'd2') D2.rec(); if (S.page === 'd3') D3.rec(); }
  });

  function loop() {
    if (S.page === 'onbilgi') OB.draw();
    if (S.page === 'd1') { D1.update(); evalSteps('d1'); }
    if (S.page === 'd2') { D2.update(); evalSteps('d2'); }
    if (S.page === 'd3') { D3.update(); evalSteps('d3'); }
    requestAnimationFrame(loop);
  }
  ['d1', 'd2', 'd3'].forEach(evalSteps);
  go(S.page); progress(); loop();
})();

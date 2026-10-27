/* Devre Kuramı II · Hafta 10 — Güç Hesapları ve Güç Faktörü Düzeltmesi */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd2h10';
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

  /* ================= ÖN BİLGİ ================= */
  const OB = (() => {
    const P = 30, Q = 40, V = 400;
    function draw() {
      const qc = +$('#obC').value, Qn = Q - qc, Sn = Math.hypot(P, Qn), pf = P / Sn;
      $('#obCv').textContent = num(qc, 1) + ' kVAR';
      vecDiagram($('#obTri'), [
        { a: [0, 0], b: [P, Q], c: '#0b5cad', t: 'S_M', dx: -16 },
        { a: [P, Q], b: [P, Qn], c: '#e07a10', t: qc > 1 ? '−Q_C' : '', dx: 22 },
        { a: [0, 0], b: [P, Qn], c: '#1a8a4a', t: 'S_line', dy: Qn >= 0 ? 16 : -8 },
      ], { theta: Math.atan2(Qn, P) });
      const g = $('#obBar').getContext('2d'), W = 560, H = 120;
      g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
      const rI = Sn / 50, rL = rI * rI;
      [['Line current', rI, '#0b5cad', num((Sn * 1000) / V, 1) + ' A'], ['Line loss', rL, '#c62828', num(rL * 100, 0) + '%']].forEach(([l, r, c, t], i) => {
        const y = 20 + i * 48; g.fillStyle = '#eef1f6'; g.fillRect(110, y, 400, 26);
        g.fillStyle = c; g.fillRect(110, y, 400 * Math.min(1.2, r) / 1.2, 26);
        g.fillStyle = '#223'; g.font = '13px Segoe UI'; g.textAlign = 'right'; g.fillText(l, 102, y + 18);
        g.textAlign = 'left'; g.fillStyle = '#fff'; g.fillText(t, 116, y + 18);
      });
      g.fillStyle = '#556'; g.font = '11px Segoe UI'; g.textAlign = 'left'; g.fillText('(uncompensated case = 100%)', 110, H - 4);
      $('#obTxt').innerHTML = `Total S = 30 ${Qn < 0 ? '−' : '+'} j${num(Math.abs(Qn), 1)} kVA, |S| = ${num(Sn, 2)} kVA, pf = <b>${num(pf, 3)}</b> ${Math.abs(Qn) < 0.3 ? '(unity)' : Qn > 0 ? 'lagging' : '<b style="color:#c62828">leading — overcompensation</b>'}. The motor’s P and Q did not change at all.`;
    }
    return { draw };
  })();

  /* ================= ÖN HAZIRLIK ================= */
  numq('onhaz', '#preQ', { id: 'p1', q: '1) Example 2.18: Source 250∠0° V, line 1 + j4 Ω, load 39 + j26 Ω in series. What is the rms value of the line current in A?', answer: 5, unit: 'A', explain: 'Z = 40 + j30 Ω, |Z| = 50 Ω → |I| = 250/50 = 5 A (I = 4 − j3 A).', hint: 'Total impedance first.' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) In the same circuit, what is the average power P<sub>L</sub> absorbed by the load in W?', answer: 975, unit: 'W', explain: 'P<sub>L</sub> = |I|²R<sub>L</sub> = 25 × 39 = 975 W. |V<sub>L</sub>|²/39 = 1408 W is wrong.', hint: 'In a series circuit use the current: |I|²R.' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) Example 2.19: Loads of 8 kW, pf 0.8 leading and 20 kVA, pf 0.6 lagging are in parallel. What is the combined power factor?', answer: 20 / Math.hypot(20, 10), tol: 1, unit: '', explain: 'S<sub>1</sub> = 8 − j6, S<sub>2</sub> = 12 + j16 → S = 20 + j10 kVA; pf = 20/22.36 = 0.894 lagging.', hint: 'Add P and Q separately.' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) In Example 2.19, how many µF are needed on the 250 V, 60 Hz bus to raise the pf to 1?', answer: 1e6 * 10000 / (2 * Math.PI * 60 * 62500), tol: 1.5, unit: 'µF', explain: 'Q<sub>C</sub> = 10 kVAR; C = 10 000/(377 × 62 500) = 424.4 µF.', hint: 'C = Q<sub>C</sub>/(ωV²); Q<sub>C</sub> is not P!' });
  numq('onhaz', '#preQ', { id: 'p5', q: '5) Example 2.20: 400 V, 50 Hz, motor 30 kW, cos θ = 0.6 lagging. What Q<sub>C</sub> in kVAR is needed to raise the pf to 0.95 lagging?', answer: 30 * (4 / 3 - Math.tan(Math.acos(0.95))), tol: 1.5, unit: 'kVAR', explain: 'tan θ<sub>1</sub> = 1.333, tan θ<sub>2</sub> = 0.3287 → Q<sub>C</sub> = 30 × 1.0046 = 30.14 kVAR.', hint: 'Q<sub>C</sub> = P(tan θ<sub>1</sub> − tan θ<sub>2</sub>).' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) In Example 2.21 the current of a source <b>leaves</b> its + terminal and ½V I* = −1950 + j3900 VA is found. What is the correct interpretation for the source?', opts: ['The source delivers 1950 W and absorbs 3900 VAR', 'The source absorbs 1950 W and delivers 3900 VAR', 'The source delivers 1950 W and 3900 VAR', 'The sign does not matter'], correct: 1, explain: 'If the current leaves the + terminal, the absorbed power is −½V I* = 1950 − j3900 VA: the source absorbs 1950 W and delivers 3900 VAR.', hint: 'Passive sign convention: if the current enters the + terminal, ½VI* is the absorbed power.' });

  /* ================= DENEY 1 · Motor + kondansatör ================= */
  const ZH = [0.05, 0.15];
  function motorNet(Vs, P, pf, C) {
    const SM0 = [P, P * Math.tan(Math.acos(pf))], ZM = Cx.div([Vs * Vs, 0], Cx.conj(SM0));
    const YM = Cx.div([1, 0], ZM), YC = [0, W50 * C], Y = Cx.add(YM, YC), Zp = Cx.div([1, 0], Y);
    const I = Cx.div([Vs, 0], Cx.add(ZH, Zp)), Vb = Cx.mul(I, Zp), Vb2 = Vb[0] ** 2 + Vb[1] ** 2, I2 = I[0] ** 2 + I[1] ** 2;
    const SM = Cx.sc(Cx.conj(YM), Vb2), SC = Cx.sc(Cx.conj(YC), Vb2), Sb = Cx.add(SM, SC), Sh = Cx.sc(ZH, I2), Ss = Cx.mul([Vs, 0], Cx.conj(I));
    const Sbm = Cx.abs(Sb);
    return { I: Math.sqrt(I2), Vb: Math.sqrt(Vb2), SM, SC, Sb, Sh, Ss, pfb: Sbm > 0 ? Sb[0] / Sbm : 1 };
  }
  const pfTxt = (pf, Q, Sm) => num(pf, 3) + (Math.abs(Q) <= Sm * 0.005 ? '' : Q > 0 ? ' lagging' : ' leading');
  const D1 = (() => {
    const box = $('#d1inst');
    const so = inst(box, 'SOURCE', true, '1 phase · 50 Hz'); const soL = lcd(so.el, 'V<sub>s</sub>', 'V', 100);
    const kV = new Lab.Knob(so.c, { label: 'Voltage', list: [230, 400], value: S.d1V ?? 400, dark: true, fmt: (v) => v + ' V', onChange: (v) => { S.d1V = v; save(); } });
    const mo = inst(box, 'MOTOR LOAD', false, 'defined at V<sub>s</sub>'); const moL = lcd(mo.el, 'motor P (actual)', 'kW', 120);
    const kP = new Lab.Knob(mo.c, { label: 'P', min: 1, max: 50, step: 0.5, value: S.d1P ?? 30, fmt: (v) => num(v, 1) + ' kW', onChange: (v) => { S.d1P = v; save(); } });
    const kF = new Lab.Knob(mo.c, { label: 'cos θ', min: 0.4, max: 1, step: 0.01, value: S.d1F ?? 0.6, fmt: (v) => num(v, 2) + ' lagging', onChange: (v) => { S.d1F = v; save(); } });
    const cb = inst(box, 'CAPACITOR BANK', false, 'with discharge resistors'); const cbL = lcd(cb.el, 'Q<sub>C</sub> (generated)', 'kVAR', 120);
    const kC = new Lab.Knob(cb.c, { label: 'C', min: 0, max: 1500, step: 0.5, value: S.d1C ?? 0, fmt: (v) => num(v, 1) + ' µF', onChange: (v) => { S.d1C = v; save(); } });
    const pa = inst(box, 'POWER ANALYSER · SOURCE', true); const L = {};
    [['I', 'I<sub>line</sub>', 'A'], ['P', 'P<sub>s</sub>', 'kW'], ['Q', 'Q<sub>s</sub>', 'kVAR'], ['pf', 'pf<sub>s</sub>', '']].forEach(([k, l, u]) => (L[k] = lcd(pa.el, l, u, 110)));
    const bm = inst(box, 'BUS MEASUREMENT', true); const bV = lcd(bm.el, 'V<sub>bus</sub>', 'V', 110), bP = lcd(bm.el, 'pf<sub>bus</sub>', '', 110), bH = lcd(bm.el, 'P<sub>line</sub> (loss)', 'W', 110);

    const g = $('#d1sch');
    sch.src(g, 60, 120); sch.w(g, [[60, 100], [60, 50], [110, 50]]); sch.box(g, 110, 32, 56, 36, 'W·A'); sch.w(g, [[166, 50], [190, 50]]);
    sch.rH(g, 190, 260, 50); sch.lH(g, 260, 330, 50); sch.t(g, 260, 30, 'line 0.05 + j0.15 Ω'); sch.w(g, [[330, 50], [620, 50]]);
    sch.w(g, [[60, 140], [60, 200], [620, 200]]);
    sch.dot(g, 420, 50); sch.dot(g, 420, 200); sch.w(g, [[420, 50], [420, 95]]); E('circle', { cx: 420, cy: 125, r: 28, class: 'w', fill: '#fff' }, g); sch.t(g, 420, 130, 'M', 'lbl'); sch.w(g, [[420, 153], [420, 200]]);
    sch.dot(g, 560, 50); sch.dot(g, 560, 200); sch.cV(g, 560, 50, 200);
    const tB = sch.t(g, 360, 40, '', 'val'), tM = sch.t(g, 455, 130, '', 'val', 'start'), tCc = sch.t(g, 580, 130, '', 'val', 'start'), tI = sch.t(g, 220, 85, '', 'val');

    const plot = new Lab.Plot($('#d1plot'), { xlabel: 'C (µF)', ylabel: 'I_line (A)' });
    let cur = {};
    function compute() {
      const Vs = kV.value, P = kP.value * 1000, pf = kF.value, C = kC.value * 1e-6;
      const r = motorNet(Vs, P, pf, C);
      cur = Object.assign(r, { Vs, P, pf, C: kC.value });
      return cur;
    }
    const same = (r, c) => r.Vs === c.Vs && r.P === c.P && near(r.pf, c.pf, 1e-6);
    function update() {
      const c = compute();
      soL(c.Vs); moL(num(c.SM[0] / 1000, 2)); cbL(num(-c.SC[1] / 1000, 2));
      L.I(num(c.I, 2)); L.P(num(c.Ss[0] / 1000, 3)); L.Q(num(c.Ss[1] / 1000, 3)); L.pf(pfTxt(c.Ss[0] / Cx.abs(c.Ss), c.Ss[1], Cx.abs(c.Ss)));
      bV(num(c.Vb, 1)); bP(pfTxt(c.pfb, c.Sb[1], Cx.abs(c.Sb))); bH(num(c.Sh[0], 1));
      tB.textContent = `V_bus = ${num(c.Vb, 1)} V`; tM.textContent = `${num(c.P / 1000, 1)} kW, cos ${num(c.pf, 2)}`; tCc.textContent = `C = ${num(c.C, 1)} µF`; tI.textContent = `I = ${num(c.I, 1)} A`;
      const k = 1 / 1000;
      vecDiagram($('#d1tri'), [
        { a: [0, 0], b: Cx.sc(c.SM, k), c: '#0b5cad', t: 'S_M', dx: -18 },
        { a: Cx.sc(c.SM, k), b: Cx.sc(c.Sb, k), c: '#e07a10', t: c.C > 0 ? 'Q_C' : '', dx: 22 },
        { a: [0, 0], b: Cx.sc(c.Sb, k), c: '#1a8a4a', t: 'S_bus', dy: c.Sb[1] >= 0 ? 16 : -8 },
      ], { theta: Math.atan2(c.Sb[1], c.Sb[0]) });
      let h;
      if (c.Sb[1] < -0.005 * Cx.abs(c.Sb)) h = '<b>Overcompensation:</b> total Q is negative, pf leading. The line current is rising again. Reduce C.';
      else if (c.pfb >= 0.945 && c.pfb <= 0.96) h = 'The bus pf is around 0.95. Compare the current and loss with the C = 0 row.';
      else if (c.C > 0 && c.pfb < 0.945) h = 'pf is still below the target: compute Q<sub>C</sub> from P(tan θ<sub>1</sub> − tan θ<sub>2</sub>) and find C = Q<sub>C</sub>/(ωV<sup>2</sup>).';
      else h = 'Size the capacitor on paper first, then tap the C knob and type the value.';
      $('#d1hint').innerHTML = h;
    }
    const tbody = $('#d1tab tbody');
    function table() {
      tbody.innerHTML = S.d1rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.Vs}</td><td>${num(r.P / 1000, 1)}</td><td>${num(r.pf, 2)}</td><td>${num(r.C, 1)}</td><td>${num(r.Vb, 1)}</td><td>${num(r.I, 2)}</td><td>${pfTxt(r.pfb, r.Qb, r.Sbm)}</td><td>${num(r.Qc / 1000, 2)}</td><td>${num(r.Ph, 1)}</td><td>${num(r.Ssm / 1000, 2)}</td></tr>`).join('');
      tbody.parentElement.parentElement.scrollTop = 1e6;
      drawPlot();
    }
    function drawPlot() {
      const c = cur.Vs ? cur : compute(), ser = [];
      if ($('#d1theo').checked) { const pts = []; for (let C = 0; C <= 1500; C += 10) pts.push([C, motorNet(c.Vs, c.P, c.pf, C * 1e-6).I]); ser.push({ pts, line: true, color: '#1a8a4a', dash: [6, 4] }); }
      ser.push({ pts: S.d1rows.filter((r) => same(r, c)).map((r) => [r.C, r.I]), dots: true, color: '#0b5cad' });
      const I0 = motorNet(c.Vs, c.P, c.pf, 0).I;
      plot.draw(ser, [0, 1500], [0, Math.max(10, I0 * 1.6)]);
    }
    $('#d1theo').onchange = drawPlot;
    function rec() { const c = compute(); S.d1rows.push({ Vs: c.Vs, P: c.P, pf: c.pf, C: c.C, Vb: c.Vb, I: c.I, pfb: c.pfb, Qb: c.Sb[1], Sbm: Cx.abs(c.Sb), Qc: -c.SC[1], Ph: c.Sh[0], Ssm: Cx.abs(c.Ss) }); save(); table(); Lab.toast(`Recorded: C = ${num(c.C, 1)} µF, I = ${num(c.I, 2)} A, pf = ${num(c.pfb, 3)}`); }
    $('#d1rec').onclick = rec;
    $('#d1del').onclick = () => { S.d1rows.pop(); save(); table(); };
    $('#d1csv').onclick = () => Lab.downloadCSV('hafta10_deney1.csv', ['#', 'Vs', 'PM (W)', 'cos', 'C (uF)', 'Vbus', 'I (A)', 'pf bus', 'QC (VAR)', 'Pline (W)', 'Ss (VA)'], S.d1rows.map((r, i) => [i + 1, r.Vs, r.P, r.pf, r.C, +r.Vb.toFixed(2), +r.I.toFixed(3), +r.pfb.toFixed(4), +r.Qc.toFixed(1), +r.Ph.toFixed(2), +r.Ssm.toFixed(1)]));
    compute(); table();
    return { update, rec, plotCanvas: $('#d1plot') };
  })();

  const ex20 = (r) => r.Vs === 400 && r.P === 30000 && near(r.pf, 0.6, 1e-6);
  steps('d1', [
    { t: 'Example 2.20: source <b>400 V</b>, motor <b>30 kW, cos θ = 0.6</b>, C = 0. Record the line current, bus pf and line loss (<kbd>R</kbd>).', test: () => S.d1rows.some((r) => ex20(r) && r.C === 0) },
    { t: 'Compute and set the required C so that the bus pf is <b>0.95 lagging</b> (0.945–0.955). Record and note the drop in current.', test: () => S.d1rows.some((r) => ex20(r) && r.pfb >= 0.945 && r.pfb <= 0.955 && r.Qb > 0) },
    { t: 'Increase C to obtain pf ≥ 0.995 and record. Did the current reach its minimum?', test: () => S.d1rows.some((r) => ex20(r) && r.pfb >= 0.995) },
    { t: '<b>Overcompensation:</b> increase C until the pf is <b>leading</b> and below 0.95, then record.', test: () => S.d1rows.some((r) => ex20(r) && r.Qb < 0 && r.pfb < 0.95) },
    { t: 'Record at least <b>6 different C</b> values for the same motor and turn on the “Theoretical curve”. Why is the curve V-shaped?', test: () => new Set(S.d1rows.filter(ex20).map((r) => r.C)).size >= 6 && $('#d1theo').checked },
    { t: 'Answer the questions.', test: () => qok(['d1q1', 'd1q2', 'd1q3', 'd1q4']) },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: 'Example 2.20: What C in µF is needed at 400 V, 50 Hz to make the pf 0.95 lagging (line neglected)?', answer: 1e6 * 30000 * (4 / 3 - Math.tan(Math.acos(0.95))) / (W50 * 160000), tol: 1.5, unit: 'µF', explain: 'Q<sub>C</sub> = 30.14 kVAR; C = 30 140/(314.16 × 160 000) = 599.6 µF.', hint: 'C = Q<sub>C</sub>/(ωV²), V = 400 V.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'What is the line current in A before compensation (ideal, line neglected)?', answer: 125, tol: 1, unit: 'A', explain: 'I = P/(V cos θ) = 30 000/(400 × 0.6) = 125 A; |S| = 50 kVA.', hint: 'I = |S|/V.' });
  numq('d1', '#d1Q', { id: 'd1q3', q: 'What is the line current in A at pf = 0.95 (ideal)?', answer: 30000 / (400 * 0.95), tol: 1, unit: 'A', explain: 'I = 30 000/(400 × 0.95) = 78.95 A; |S| = 31.58 kVA.', hint: 'P did not change; pf did.' });
  numq('d1', '#d1Q', { id: 'd1q4', q: 'By what percentage does the line loss decrease?', answer: 100 * (1 - (0.6 / 0.95) ** 2), tol: 2, unit: '%', explain: 'P<sub>k2</sub>/P<sub>k1</sub> = (0.6/0.95)² = 0.399 → about 60% reduction. Compare with the P<sub>line</sub> values you measured.', hint: 'Loss is proportional to I².' });
  mcq('d1', '#d1Q', { id: 'd1q5', q: 'What happens if the capacitor is chosen twice as large as required?', opts: ['pf stays at 1', 'Total Q becomes negative; pf becomes leading and the line current rises again', 'The motor power doubles', 'The line current drops to zero'], correct: 1, explain: 'The right branch of the V curve in the plot: overcompensation. In addition, the bus voltage rises and a capacitive penalty arises.', hint: 'Q<sub>net</sub> = Q<sub>M</sub> − Q<sub>C</sub>.' });
  mcq('d1', '#d1Q', { id: 'd1q6', q: 'What can be said about the active power drawn by the motor after compensation?', opts: ['It decreases; the capacitor supplies energy', 'Practically unchanged; only the reactive power and current carried by the line decrease', 'It increases', 'It becomes zero'], correct: 1, explain: 'A capacitor does not generate P (P<sub>C</sub> = 0). Since the bus voltage rises slightly, the P of the fixed-impedance motor even increases very slightly.', hint: 'Look at the motor P display.' });

  /* ================= DENEY 2 · Hat ve güç dengesi ================= */
  const D2 = (() => {
    const box = $('#d2inst');
    const so = inst(box, 'AC SOURCE', true, '50 Hz'); const soL = lcd(so.el, 'V<sub>s</sub>', 'V', 100);
    const kV = new Lab.Knob(so.c, { label: 'Voltage', min: 0, max: 300, step: 1, value: S.d2V ?? 100, dark: true, fmt: (v) => num(v, 0) + ' V', onChange: (v) => { S.d2V = v; save(); } });
    const hm = inst(box, 'LINE MODULE', false);
    const kRh = new Lab.Knob(hm.c, { label: 'R_h', min: 0, max: 10, step: 0.05, value: S.d2Rh ?? 1, fmt: (v) => num(v, 2) + ' Ω', onChange: (v) => { S.d2Rh = v; save(); } });
    const kXh = new Lab.Knob(hm.c, { label: 'X_h', min: 0, max: 20, step: 0.1, value: S.d2Xh ?? 4, fmt: (v) => num(v, 1) + ' Ω', onChange: (v) => { S.d2Xh = v; save(); } });
    const lb = inst(box, 'LOAD BOX', false);
    S.d2mode = S.d2mode || 's'; S.d2pt = S.d2pt || 'Y';
    segBtns(lb.c, [['s', 'series R + jX'], ['p', 'parallel R ∥ jX']], S.d2mode, (v) => { S.d2mode = v; save(); });
    const kR = new Lab.Knob(lb.c, { label: 'R', min: 0.5, max: 100, step: 0.1, value: S.d2R ?? 39, fmt: (v) => num(v, 1) + ' Ω', onChange: (v) => { S.d2R = v; save(); } });
    const kX = new Lab.Knob(lb.c, { label: 'X', min: -50, max: 50, step: 0.1, value: S.d2X ?? 26, fmt: (v) => num(v, 1) + ' Ω', onChange: (v) => { S.d2X = v; save(); } });
    const pa = inst(box, 'POWER ANALYSER', true);
    segBtns(pa.c, [['K', 'Source'], ['H', 'Line'], ['Y', 'Load']], S.d2pt, (v) => { S.d2pt = v; save(); });
    const L = {};
    [['V', 'V', 'V'], ['I', 'I', 'A'], ['P', 'P', 'W'], ['Q', 'Q', 'VAR'], ['S', '|S|', 'VA']].forEach(([k, l, u]) => (L[k] = lcd(pa.el, l, u, 110)));

    const g = $('#d2sch');
    sch.src(g, 60, 120); sch.w(g, [[60, 100], [60, 50], [130, 50]]); sch.rH(g, 130, 210, 50); sch.lH(g, 210, 290, 50); sch.w(g, [[290, 50], [420, 50]]);
    sch.w(g, [[60, 140], [60, 200], [620, 200]]);
    const tH = sch.t(g, 210, 30, ''), loadG = E('g', {}, g), tLd = sch.t(g, 640, 125, '', 'val', 'start'), tI = sch.t(g, 340, 40, '', 'val');
    const ptMark = E('rect', { x: 0, y: 0, width: 0, height: 0, fill: 'none', stroke: '#d0480f', 'stroke-width': 2.5, 'stroke-dasharray': '6 4', rx: 8 }, g);
    let lastMode = '';
    function drawLoad() {
      if (lastMode === S.d2mode) return; lastMode = S.d2mode; loadG.innerHTML = '';
      if (S.d2mode === 's') { sch.w(loadG, [[420, 50], [520, 50], [520, 60]]); sch.rV(loadG, 520, 60, 120); sch.lV(loadG, 520, 120, 180); sch.w(loadG, [[520, 180], [520, 200]]); sch.w(loadG, [[520, 200], [620, 200]]); }
      else { sch.w(loadG, [[420, 50], [600, 50]]); sch.dot(loadG, 480, 50); sch.dot(loadG, 480, 200); sch.rV(loadG, 480, 50, 200); sch.lV(loadG, 600, 50, 200); sch.dot(loadG, 600, 200); }
    }
    function compute() {
      const Vs = kV.value, Zh = [kRh.value, kXh.value], R = kR.value, X = kX.value;
      const ZL = S.d2mode === 's' ? [R, X] : (X === 0 ? [R, 0] : Cx.div(Cx.mul([R, 0], [0, X]), [R, X]));
      const I = Cx.div([Vs, 0], Cx.add(Zh, ZL)), I2 = I[0] ** 2 + I[1] ** 2, Im = Math.sqrt(I2);
      const Sh = Cx.sc(Zh, I2), SL = Cx.sc(ZL, I2), Ss = Cx.mul([Vs, 0], Cx.conj(I));
      const pt = S.d2pt, Sp = pt === 'K' ? Ss : pt === 'H' ? Sh : SL, Vp = pt === 'K' ? Vs : pt === 'H' ? Im * Cx.abs(Zh) : Im * Cx.abs(ZL);
      const r2 = (v) => Math.round(v * 100) / 100, cfg = `${r2(Vs)}|${r2(kRh.value)}|${r2(kXh.value)}|${S.d2mode}|${r2(R)}|${r2(X)}`;
      return { Vs, Zh, ZL, R, X, I, Im, Sh, SL, Ss, pt, Sp, Vp, cfg, mode: S.d2mode };
    }
    function update() {
      const c = compute(); drawLoad();
      soL(num(c.Vs, 0));
      L.V(num(c.Vp, 2)); L.I(num(c.Im, 3)); L.P(num(c.Sp[0], 1)); L.Q(num(c.Sp[1], 1)); L.S(num(Cx.abs(c.Sp), 1));
      tH.textContent = `Z_line = ${num(c.Zh[0], 2)} + j${num(c.Zh[1], 1)} Ω`;
      tLd.textContent = c.mode === 's' ? `${num(c.R, 1)} ${c.X < 0 ? '−' : '+'} j${num(Math.abs(c.X), 1)} Ω` : `${num(c.R, 1)} Ω ∥ j${num(c.X, 1)} Ω`;
      tI.textContent = `I = ${num(c.Im, 2)} A`;
      const box = { K: [30, 80, 60, 80], H: [125, 30, 170, 40], Y: [450, 40, 180, 170] }[c.pt];
      ptMark.setAttribute('x', box[0]); ptMark.setAttribute('y', box[1]); ptMark.setAttribute('width', box[2]); ptMark.setAttribute('height', box[3]);
      vecDiagram($('#d2vec'), [
        { a: [0, 0], b: c.Sh, c: '#c62828', t: 'S_line', dx: -18 },
        { a: c.Sh, b: Cx.add(c.Sh, c.SL), c: '#0b5cad', t: 'S_load', dx: 20 },
        { a: [0, 0], b: c.Ss, c: '#1a8a4a', t: 'S_source', dash: '6 4', dy: 16 },
      ]);
    }
    const PTN = { K: 'Source', H: 'Line', Y: 'Load' };
    const tbody = $('#d2tab tbody');
    function balance() {
      for (let i = S.d2rows.length - 1; i >= 0; i--) {
        const cfg = S.d2rows[i].cfg, last = {};
        S.d2rows.forEach((r) => { if (r.cfg === cfg) last[r.pt] = r; });
        if (last.K && last.H && last.Y) {
          const [v, rh, xh, m, R, X] = cfg.split('|');
          const dP = last.K.P - last.H.P - last.Y.P, dQ = last.K.Q - last.H.Q - last.Y.Q;
          $('#d2bal').innerHTML = `Configuration: ${v} V, line ${num(+rh, 2)} + j${num(+xh, 1)} Ω, load ${m === 's' ? 'series' : 'parallel'} R = ${num(+R, 1)} Ω, X = ${num(+X, 1)} Ω<br>
            P: ${num(last.K.P, 1)} = ${num(last.H.P, 1)} + ${num(last.Y.P, 1)} → difference <b>${num(dP, 2)} W</b><br>
            Q: ${num(last.K.Q, 1)} = ${num(last.H.Q, 1)} + ${num(last.Y.Q, 1)} → difference <b>${num(dQ, 2)} VAR</b><br>
            Efficiency η = P<sub>load</sub>/P<sub>source</sub>: compute it and enter it in the question.`;
          return;
        }
      }
      $('#d2bal').innerHTML = 'Record all three points <b>Source, Line and Load</b> in the same configuration; the balance is then checked here with your own measurements.';
    }
    function table() {
      tbody.innerHTML = S.d2rows.map((r, i) => { const [v, rh, xh, m, R, X] = r.cfg.split('|'); return `<tr><td>${i + 1}</td><td class="l">${v} V; ${num(+rh, 2)}+j${num(+xh, 1)}; ${m === 's' ? 'ser.' : 'par.'} ${num(+R, 1)}, ${num(+X, 1)}</td><td>${PTN[r.pt]}</td><td>${num(r.V, 2)}</td><td>${num(r.I, 3)}</td><td>${num(r.P, 1)}</td><td>${num(r.Q, 1)}</td><td>${num(r.Sm, 1)}</td></tr>`; }).join('');
      tbody.parentElement.parentElement.scrollTop = 1e6;
      balance();
    }
    function rec() { const c = compute(); if (c.Vs < 1) return Lab.toast('Source voltage is zero.'); S.d2rows.push({ cfg: c.cfg, pt: c.pt, V: c.Vp, I: c.Im, P: c.Sp[0], Q: c.Sp[1], Sm: Cx.abs(c.Sp), Ps: c.Ss[0], Ph: c.Sh[0] }); save(); table(); Lab.toast(`Kaydedildi (${PTN[c.pt]}): P = ${num(c.Sp[0], 1)} W, Q = ${num(c.Sp[1], 1)} VAR`); }
    $('#d2rec').onclick = rec;
    $('#d2del').onclick = () => { S.d2rows.pop(); save(); table(); };
    $('#d2csv').onclick = () => Lab.downloadCSV('hafta10_deney2.csv', ['#', 'configuration', 'point', 'V', 'I (A)', 'P (W)', 'Q (VAR)', 'S (VA)'], S.d2rows.map((r, i) => [i + 1, r.cfg, PTN[r.pt], +r.V.toFixed(3), +r.I.toFixed(4), +r.P.toFixed(2), +r.Q.toFixed(2), +r.Sm.toFixed(2)]));
    table();
    return { update, rec };
  })();

  const cfgHas = (cfg, pts) => pts.every((p) => S.d2rows.some((r) => r.cfg === cfg && r.pt === p));
  const C218 = '250|1|4|s|39|26', C222 = '100|2|6|p|10|-5';
  steps('d2', [
    { t: '<b>Example 2.18:</b> 250 V, line 1 + j4 Ω, series load 39 + j26 Ω. Connect the analyser to the <b>Load</b> and record.', test: () => cfgHas(C218, ['Y']) },
    { t: 'In the same configuration also record the <b>Line</b> and <b>Source</b> points. See in the balance box that the difference is zero.', test: () => cfgHas(C218, ['Y', 'H', 'K']) },
    { t: '<b>Example 2.22:</b> 100 V, line 2 + j6 Ω, <b>parallel</b> load 10 Ω ∥ −j5 Ω. Record the three points. Why does the source deliver inductive Q even though the load is capacitive?', test: () => cfgHas(C222, ['Y', 'H', 'K']) },
    { t: 'By changing the line parameters, reduce the line loss to <b>below 1%</b> of the source power and record the <b>Line</b> point. Which parameter was most effective?', test: () => S.d2rows.some((r) => r.pt === 'H' && r.Ps > 1 && r.Ph < 0.01 * r.Ps) },
    { t: 'Answer the questions.', test: () => qok(['d2q1', 'd2q2', 'd2q3', 'd2q4']) },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'Example 2.18: What is the load voltage |V<sub>L</sub>| in V?', answer: 5 * Math.hypot(39, 26), tol: 1, unit: 'V', explain: '|V<sub>L</sub>| = |I||Z<sub>L</sub>| = 5 × 46.87 = 234.36 V. The line dropped 15.6 V.', hint: '|Z<sub>L</sub>| = √(39² + 26²).' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'Example 2.18: What is the reactive power Q<sub>s</sub> delivered by the source in VAR?', answer: 750, tol: 1, unit: 'VAR', explain: 'Q<sub>s</sub> = Q<sub>line</sub> + Q<sub>L</sub> = 100 + 650 = 750 VAR; P<sub>s</sub> = 25 + 975 = 1000 W.', hint: 'Q<sub>line</sub> = |I|²X<sub>h</sub>.' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 'Example 2.18: What is the transmission efficiency η = P<sub>L</sub>/P<sub>s</sub> in percent?', answer: 97.5, tol: 0.5, unit: '%', explain: '975/1000 = 97.5%. Loss 2.5%.', hint: 'Use the Load and Source P values you recorded.' });
  numq('d2', '#d2Q', { id: 'd2q4', q: 'Example 2.22: What is the reactive power Q<sub>line</sub> absorbed by the line in VAR?', answer: 3000, tol: 1, unit: 'VAR', explain: '|I|² = 500 → Q<sub>line</sub> = 500 × 6 = 3000 VAR. The load absorbs −2000 VAR, the source supplies 1000 VAR.', hint: 'First find the parallel equivalent (2 − j4 Ω).' });
  mcq('d2', '#d2Q', { id: 'd2q5', q: 'In Example 2.18 a student found P<sub>L</sub> = |V<sub>L</sub>|²/39 = 1408 W. Where is the mistake?', opts: ['The calculation is correct', '|V<sub>L</sub>| is the total voltage across R and jX, not across R alone; in a series circuit |I|²R must be used', '26 should have been used instead of 39', 'The peak value should have been used instead of rms'], correct: 1, explain: 'The correct value is 975 W. V²/R can only be used with the voltage across R itself.', hint: 'Across which elements was the load voltage measured?' });

  /* ================= DENEY 3 · Ekonomi ================= */
  function econ(o) {
    const Q0 = o.P * Math.tan(Math.acos(o.pf)), Qn = Q0 - o.qc, Sn = Math.hypot(o.P, Qn);
    const Ea = o.P * o.h, Ei = Math.max(Qn, 0) * o.h, Ek = Math.max(-Qn, 0) * o.h;
    const ri = Ei / Ea, rk = Ek / Ea;
    const pen = (ri > 0.2 ? Ei * o.cR : 0) + (rk > 0.15 ? Ek * o.cR : 0);
    const loss = 0.02 * o.P * (Sn / o.P) ** 2 * o.h * o.cE;
    const inv = o.qc * o.cC;
    return { Q0, Qn, Sn, pfn: o.P / Sn, ri, rk, pen, loss, inv, amort: inv / 60, total: pen + loss + inv / 60 };
  }
  const DEF = { P: 120, pf: 0.72, h: 400, cE: 3, cR: 0.6, cC: 600 };
  const D3 = (() => {
    const box = $('#d3inst');
    const ts = inst(box, 'PLANT', false);
    const kP = new Lab.Knob(ts.c, { label: 'P avg.', min: 20, max: 300, step: 1, value: S.d3P ?? DEF.P, fmt: (v) => v + ' kW', onChange: (v) => { S.d3P = v; save(); } });
    const kF = new Lab.Knob(ts.c, { label: 'cos θ', min: 0.5, max: 1, step: 0.01, value: S.d3F ?? DEF.pf, fmt: (v) => num(v, 2), onChange: (v) => { S.d3F = v; save(); } });
    const kH = new Lab.Knob(ts.c, { label: 'hours/month', min: 100, max: 720, step: 10, value: S.d3H ?? DEF.h, fmt: (v) => v + ' h', onChange: (v) => { S.d3H = v; save(); } });
    const rb = inst(box, 'REACTIVE POWER RELAY + BANK', true); const rbL = lcd(rb.el, 'cos θ (net)', '', 110);
    const led = document.createElement('div'); led.style.cssText = 'max-width:200px;margin:4px 0'; rb.el.insertBefore(led, rb.c);
    const kS = new Lab.Knob(rb.c, { label: 'Step size', list: [2.5, 5, 7.5, 10, 12.5, 15, 20, 25], value: S.d3S ?? 7.5, dark: true, fmt: (v) => num(v, 1) + ' kVAR', onChange: (v) => { S.d3S = v; save(); } });
    const kN = new Lab.Knob(rb.c, { label: 'Number of steps', min: 0, max: 20, step: 1, value: S.d3N ?? 0, dark: true, fmt: (v) => v + ' / 20', onChange: (v) => { S.d3N = v; save(); } });
    const kT = new Lab.Knob(rb.c, { label: 'Target cos', min: 0.9, max: 1, step: 0.01, value: S.d3T ?? 0.98, dark: true, fmt: (v) => num(v, 2), onChange: (v) => { S.d3T = v; save(); } });
    const ab = document.createElement('button'); ab.className = 'seg-btn' + (S.d3auto ? ' on' : ''); ab.textContent = 'AUTOMATIC'; ab.style.width = '100%';
    ab.onclick = () => { S.d3auto = !S.d3auto; if (S.d3auto) S.d3autoUsed = true; ab.classList.toggle('on', !!S.d3auto); save(); };
    rb.c.appendChild(ab);
    const pr = inst(box, 'PRICES (representative)', false);
    const kE = new Lab.Knob(pr.c, { label: 'active TL/kWh', min: 1, max: 6, step: 0.1, value: S.d3cE ?? DEF.cE, fmt: (v) => num(v, 1), onChange: (v) => { S.d3cE = v; save(); } });
    const kR = new Lab.Knob(pr.c, { label: 'reactive TL/kVARh', min: 0.1, max: 2, step: 0.05, value: S.d3cR ?? DEF.cR, fmt: (v) => num(v, 2), onChange: (v) => { S.d3cR = v; save(); } });
    const kC = new Lab.Knob(pr.c, { label: 'cap. TL/kVAR', min: 200, max: 2000, step: 50, value: S.d3cC ?? DEF.cC, fmt: (v) => num(v, 0), onChange: (v) => { S.d3cC = v; save(); } });
    const fb = inst(box, 'MONTHLY BILL SUMMARY', true); const F = {};
    [['ri', 'E<sub>ind</sub>/E<sub>act</sub>', '%'], ['rk', 'E<sub>cap</sub>/E<sub>act</sub>', '%'], ['pen', 'Reactive penalty', 'TL'], ['loss', 'Energy loss', 'TL'], ['inv', 'Bank investment', 'TL']].forEach(([k, l, u]) => (F[k] = lcd(fb.el, l, u, 130)));

    const par = (qc) => ({ P: kP.value, pf: kF.value, h: kH.value, cE: kE.value, cR: kR.value, cC: kC.value, qc });
    const plot = new Lab.Plot($('#d3plot'), { xlabel: 'Q_C (kVAR)', ylabel: 'cost (thousand TL/month)' });
    let cur = {};
    function compute() {
      if (S.d3auto) {
        const Q0 = kP.value * Math.tan(Math.acos(kF.value)), lim = kP.value * Math.tan(Math.acos(kT.value));
        const n = clamp(Math.ceil((Q0 - lim) / kS.value - 1e-9), 0, 20);
        if (n !== kN.value) kN.set(n);
      }
      const e = econ(par(kN.value * kS.value));
      cur = Object.assign(e, { n: kN.value, st: kS.value, qc: kN.value * kS.value, prev: kN.value > 0 ? econ(par((kN.value - 1) * kS.value)).pen : null, def: kP.value === DEF.P && near(kF.value, DEF.pf, 1e-6) && kH.value === DEF.h });
      return cur;
    }
    let lastKey = '';
    function update() {
      const c = compute();
      rbL(num(c.pfn, 3) + (Math.abs(c.Qn) < 0.01 ? '' : c.Qn > 0 ? ' lag' : ' lead'));
      led.innerHTML = Array.from({ length: 20 }, (_, i) => `<span class="stage${i < c.n ? ' on' : ''}"></span>`).join('');
      F.ri(num(c.ri * 100, 1)); F.rk(num(c.rk * 100, 1)); F.pen(num(c.pen, 0)); F.loss(num(c.loss, 0)); F.inv(num(c.inv, 0));
      const key = [kP.value, kF.value, kH.value, kE.value, kR.value, kC.value, kS.value, c.n, $('#d3theo').checked, S.d3rows.length].join('|');
      if (key !== lastKey) { lastKey = key; drawPlot(c); }
    }
    function drawPlot(c) {
      const ser = [], qmax = 20 * kS.value, k = 1 / 1000;
      if ($('#d3theo').checked) {
        const P = [[], [], [], []];
        for (let i = 0; i <= 400; i++) { const q = (i / 400) * qmax, e = econ(par(q)); P[0].push([q, e.pen * k]); P[1].push([q, e.loss * k]); P[2].push([q, e.amort * k]); P[3].push([q, e.total * k]); }
        ['#c62828', '#e07a10', '#7a4bb5', '#1a8a4a'].forEach((col, i) => ser.push({ pts: P[i], line: true, color: col, width: i === 3 ? 2.5 : 1.5 }));
      }
      ser.push({ pts: S.d3rows.map((r) => [r.qc, r.total * k]), dots: true, color: '#0b5cad' });
      ser.push({ pts: [[c.qc, c.total * k]], dots: true, color: '#111' });
      const ymax = Math.max(econ(par(0)).total, econ(par(qmax)).total, ...S.d3rows.map((r) => r.total)) * k * 1.1;
      plot.draw(ser, [0, qmax], [0, Math.max(1, ymax)]);
    }
    const tbody = $('#d3tab tbody');
    function table() {
      tbody.innerHTML = S.d3rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.n} × ${num(r.st, 1)}</td><td>${num(r.qc, 1)}</td><td>${num(r.pfn, 3)}${r.Qn < 0 ? ' lead' : ''}</td><td>%${num(r.ri * 100, 1)}</td><td>%${num(r.rk * 100, 1)}</td><td>${num(r.pen, 0)}</td><td>${num(r.loss, 0)}</td><td>${num(r.inv, 0)}</td></tr>`).join('');
      tbody.parentElement.parentElement.scrollTop = 1e6;
    }
    function rec() { const c = compute(); S.d3rows.push({ n: c.n, st: c.st, qc: c.qc, pfn: c.pfn, Qn: c.Qn, ri: c.ri, rk: c.rk, pen: c.pen, loss: c.loss, inv: c.inv, total: c.total, prev: c.prev, def: c.def }); save(); table(); Lab.toast(`Recorded: ${c.n} steps, penalty ${num(c.pen, 0)} TL/month`); }
    $('#d3rec').onclick = rec;
    $('#d3del').onclick = () => { S.d3rows.pop(); save(); table(); };
    $('#d3csv').onclick = () => Lab.downloadCSV('hafta10_deney3.csv', ['#', 'steps', 'step kVAR', 'QC (kVAR)', 'cos', 'Eind/Eact', 'Ecap/Eact', 'penalty (TL)', 'loss (TL)', 'investment (TL)'], S.d3rows.map((r, i) => [i + 1, r.n, r.st, r.qc, +r.pfn.toFixed(4), +r.ri.toFixed(4), +r.rk.toFixed(4), Math.round(r.pen), Math.round(r.loss), Math.round(r.inv)]));
    table();
    return { update, rec, plotCanvas: $('#d3plot') };
  })();

  steps('d3', [
    { t: 'For the default plant (120 kW, 0.72, 400 h) record the <b>uncompensated</b> (0 steps) scenario. How large is the monthly penalty?', test: () => S.d3rows.some((r) => r.def && r.n === 0) },
    { t: 'With 7.5 kVAR steps, find the <b>smallest</b> number of steps that removes the penalty and record it.', test: () => S.d3rows.some((r) => r.def && r.st === 7.5 && r.pen === 0 && r.prev > 0) },
    { t: 'Record an <b>overcompensation</b> scenario: let the capacitive ratio exceed 15%. Why did the penalty come back?', test: () => S.d3rows.some((r) => r.def && r.rk > 0.15) },
    { t: 'Turn on the cost curve; record another scenario with a different step size that has no penalty and no overcompensation.', test: () => $('#d3theo').checked && S.d3rows.some((r) => r.def && r.st !== 7.5 && r.n > 0 && r.pen === 0) },
    { t: 'Switch the relay to <b>AUTOMATIC</b> and change the target cos θ; watch how the relay selects the steps.', test: () => !!S.d3autoUsed },
    { t: 'Answer the questions.', test: () => qok(['d3q1', 'd3q2', 'd3q3', 'd3q4']) },
  ]);
  const e0 = econ(Object.assign({ qc: 0 }, DEF)), e13 = econ(Object.assign({ qc: 97.5 }, DEF));
  numq('d3', '#d3Q', { id: 'd3q1', q: 'For the default plant, what is the smallest Q<sub>C</sub> in kVAR needed to bring the reactive ratio down to exactly 20%?', answer: e0.Q0 - 0.2 * DEF.P, tol: 1, unit: 'kVAR', explain: 'Q<sub>0</sub> = 120 × tan(arccos 0.72) = 115.66 kVAR; limit 0.2 × 120 = 24 kVAR → Q<sub>C</sub> = 91.66 kVAR (cos θ ≈ 0.981).', hint: 'The ratio E<sub>ind</sub>/E<sub>act</sub> = Q<sub>net</sub>/P.' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'Without compensation, what is the monthly reactive penalty in TL (default prices)?', answer: e0.pen, tol: 1, unit: 'TL', explain: 'E<sub>ind</sub> = 115.66 × 400 = 46 264 kVARh; × 0.6 TL = 27 758 TL/month.', hint: 'Since the ratio exceeds 20%, all of the reactive energy is billed.' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'By how many TL per month does compensation reduce the in-plant loss cost (0 → 13 steps × 7.5 kVAR)?', answer: e0.loss - e13.loss, tol: 2, unit: 'TL', explain: `Loss is proportional to |S|²: ${num(e0.loss, 0)} TL → ${num(e13.loss, 0)} TL.`, hint: 'Subtract the loss columns of the two rows in the scenario table.' });
  numq('d3', '#d3Q', { id: 'd3q4', q: 'What is the payback time in months of the 13-step (97.5 kVAR) bank? (Investment ÷ monthly saving; saving = difference in penalty + loss)', answer: e13.inv / (e0.pen + e0.loss - e13.pen - e13.loss), tol: 3, unit: 'months', explain: 'Investment 58 500 TL; monthly saving ≈ 30 400 TL → about 2 months. Compensation is one of the energy efficiency investments with the fastest payback in industry.', hint: 'Use the penalty and loss differences in the table.' });
  mcq('d3', '#d3Q', { id: 'd3q5', q: 'Why don’t we choose a 20-step (150 kVAR) bank on the basis of “the bigger the better”?', opts: ['Capacitors draw active power', 'Q<sub>net</sub> becomes negative; the capacitive ratio limit is exceeded, a penalty and a voltage rise result, and the investment is wasted', 'The relay does not support 20 steps', 'A larger bank does not increase loss, so there is no difference'], correct: 1, explain: 'The jump on the right of the cost curve is the capacitive penalty. The economic optimum lies inside the penalty-free region where investment and loss are balanced.', hint: 'Look at the right end of the cost curve.' });
  mcq('d3', '#d3Q', { id: 'd3q6', q: 'What is the environmental (sustainability) benefit of compensation?', opts: ['There is no benefit, it is only about the penalty', 'It reduces line and transformer losses; less energy is generated for the same work and grid capacity is freed', 'It makes the motors do less work', 'It lowers the electricity price'], correct: 1, explain: 'Reducing loss energy directly saves fuel and emissions; in addition, more load can be supplied with the existing cables and transformers.', hint: 'Look at the loss column.' });

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
      <h2 style="margin:0">Circuit Theory II · Virtual Laboratory · Week 10 Report</h2>
      <p><b>Topic:</b> Power calculations, power balance, power factor correction and the economic aspect</p>
      <table class="data" style="width:auto"><tr><th>Full name</th><td class="l">${S.st.name || ''}</td><th>Student ID</th><td class="l">${S.st.no || ''}</td><th>Group</th><td class="l">${S.st.group || ''}</td><th>Date</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Summary</h3>
      <p>Completed lab-sheet steps: <b>${sOk}/${sTot}</b> · Correct answers: <b>${ok}/${tot}</b> · Score: <b>${Math.round((50 * sOk) / sTot + (50 * ok) / tot)}/100</b></p>
      <h3>Answers</h3>
      <table class="data"><thead><tr><th>Section</th><th>Question</th><th>Answer</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Experiment 1 · Motor and capacitor</h3>${tb('#d1tab')}
      <h3>Experiment 2 · Line loss and power balance</h3>${tb('#d2tab')}
      <h3>Experiment 3 · Economics of compensation</h3>${tb('#d3tab')}
      <h3>Plots</h3>
      <div>${img(D1.plotCanvas)} ${img(D3.plotCanvas)}</div>
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

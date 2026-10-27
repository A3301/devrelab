/* Devre Kuramı II · Hafta 7 — Anlık, Ortalama ve Reaktif Güç (Bölüm 2.1–2.2) */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd2h07';
  const S = Object.assign({ answers: {}, steps: {}, st: {}, page: 'giris', b: {}, d4: { rows: [], tripSeen: false } }, Lab.store.load(KEY));
  Lab.answers = S.answers;
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => Lab.store.save(KEY, S), 300); };
  Lab.onAnswer = () => { save(); progress(); };

  /* ---------- kompleks yardımcılar ---------- */
  const cx = (re, im = 0) => [re, im];
  const cadd = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const csub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const cdiv = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
  const cabs = (a) => Math.hypot(a[0], a[1]);
  const cargd = (a) => (Math.atan2(a[1], a[0]) * 180) / Math.PI;
  const polar = (m, deg) => [m * Math.cos((deg * Math.PI) / 180), m * Math.sin((deg * Math.PI) / 180)];
  const near = (a, b, t) => Math.abs(a - b) <= t;
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const TAU = 2 * Math.PI;

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

  /* ---------- şema yardımcıları ---------- */
  const sch = {
    w: (g, pts) => E('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'w' }, g),
    dot: (g, x, y) => E('circle', { cx: x, cy: y, r: 3.5, class: 'node' }, g),
    t: (g, x, y, s, cls = 'lbl', anchor = 'middle') => { const e = E('text', { x, y, class: cls, 'text-anchor': anchor }, g); e.innerHTML = s; return e; },
    rH(g, x1, x2, y) { const n = 6, L = 8, step = (x2 - x1 - 2 * L) / n; let d = `M${x1},${y} h${L}`; for (let i = 0; i < n; i++) d += ` l${step / 2},${i % 2 ? 7 : -7} l${step / 2},${i % 2 ? -7 : 7}`; d += ` L${x2},${y}`; E('path', { d, class: 'w' }, g); },
    lH(g, x1, x2, y) { const n = 4, L = 10, r = (x2 - x1 - 2 * L) / n / 2; let d = `M${x1},${y} h${L}`; for (let i = 0; i < n; i++) d += ` a${r},${r} 0 0 1 ${2 * r},0`; d += ` L${x2},${y}`; E('path', { d, class: 'w', fill: 'none' }, g); },
    cH(g, x1, x2, y) { const m = (x1 + x2) / 2; E('path', { d: `M${x1},${y} H${m - 5} M${m - 5},${y - 14} V${y + 14} M${m + 5},${y - 14} V${y + 14} M${m + 5},${y} H${x2}`, class: 'w', fill: 'none' }, g); },
    gnd(g, x, y) { E('path', { d: `M${x},${y} v8 M${x - 11},${y + 8} h22 M${x - 7},${y + 13} h14 M${x - 3},${y + 18} h6`, class: 'w' }, g); },
    src(g, x, y, r = 22) { E('circle', { cx: x, cy: y, r, class: 'w', fill: '#fff' }, g); E('path', { d: `M${x - 11},${y} q5.5,-13 11,0 t11,0`, class: 'w', fill: 'none' }, g); },
    term(g, x, y) { E('circle', { cx: x, cy: y, r: 4.5, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g); },
  };

  /* ================= GEZİNME / İLERLEME ================= */
  const pages = ['giris', 'onbilgi', 'onhaz', 'd1', 'd2', 'd3', 'd4', 'rapor'];
  function go(p) {
    S.page = p; save();
    $$('section.page').forEach((s) => s.classList.toggle('active', s.id === p));
    $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.p === p));
    if (B[p]) B[p].dirty = true;
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
      let ok = false; try { ok = s.test(); } catch (e) { ok = false; }
      if (!S.steps[id] && ok) { S.steps[id] = true; save(); Lab.toast('✔ Step completed: ' + s.t.replace(/<[^>]+>/g, '').slice(0, 70)); progress(); }
      lis[i].classList.toggle('done', !!S.steps[id]);
    });
  }
  const qids = { onhaz: [], d1: [], d2: [], d3: [], d4: [] };
  function progress() {
    let tot = 0, ok = 0;
    Object.keys(stepDefs).forEach((k) => stepDefs[k].forEach((_, i) => { tot++; if (S.steps[k + '_' + i]) ok++; }));
    Object.values(qids).flat().forEach((q) => { tot++; if (S.answers[q] && S.answers[q].ok) ok++; });
    const p = tot ? Math.round((100 * ok) / tot) : 0;
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

  [['stName', 'name'], ['stNo', 'no'], ['stGroup', 'group'], ['stDate', 'date'], ['stComment', 'comment']].forEach(([id, k]) => {
    const e = $('#' + id); e.value = S.st[k] || (k === 'date' ? new Date().toLocaleDateString('en-GB') : '');
    e.addEventListener('input', () => { S.st[k] = e.value; save(); });
  });

  /* ================= ÖN BİLGİ · etkileşimli p(t) ================= */
  const OB = (() => {
    const g = $('#obDemo'), tri = $('#obTri'), Vm = 40, Im = 5;
    function draw() {
      const th = +$('#obTheta').value, parts = $('#obParts').checked, r = (th * Math.PI) / 180;
      $('#obThV').textContent = th + '°';
      const P = 0.5 * Vm * Im * Math.cos(r), Q = 0.5 * Vm * Im * Math.sin(r);
      g.innerHTML = '';
      const X0 = 40, X1 = 510, Y0 = 150, xs = (a) => X0 + ((X1 - X0) * a) / 720, yp = (p) => Y0 - p * 0.6, yv = (v) => Y0 - v * 2.2, yi = (i) => Y0 - i * 16;
      // negatif güç bölgeleri
      let neg = '';
      for (let a = 0; a <= 720; a += 2) { const p = Vm * Im * Math.cos(((a + th) * Math.PI) / 180) * Math.cos((a * Math.PI) / 180); if (p < 0) neg += `M${xs(a)},${Y0} V${yp(p)} `; }
      E('path', { d: neg, stroke: '#f6c2c2', 'stroke-width': 3 }, g);
      E('line', { x1: X0, x2: X1, y1: Y0, y2: Y0, stroke: '#99a' }, g);
      E('line', { x1: X0, x2: X0, y1: 20, y2: 280, stroke: '#99a' }, g);
      [0, 180, 360, 540, 720].forEach((a) => { const e = E('text', { x: xs(a), y: 296, 'text-anchor': 'middle', 'font-size': 11, fill: '#556' }, g); e.textContent = a + '°'; });
      const curve = (f, col, w = 2, dash) => { let d = ''; for (let a = 0; a <= 720; a += 3) d += (a ? 'L' : 'M') + xs(a) + ',' + f(a); E('path', { d, stroke: col, 'stroke-width': w, fill: 'none', 'stroke-dasharray': dash || '' }, g); };
      const c = (a) => Math.cos((a * Math.PI) / 180), s = (a) => Math.sin((a * Math.PI) / 180);
      curve((a) => yv(Vm * c(a + th)), '#b8960a', 1.6);
      curve((a) => yi(Im * c(a)), '#1592b8', 1.6);
      if (parts) { curve((a) => yp(P + P * c(2 * a)), '#e07a10', 1.6, '6 4'); curve((a) => yp(-Q * s(2 * a)), '#1a8a4a', 1.6, '6 4'); }
      curve((a) => yp(Vm * Im * c(a + th) * c(a)), '#c62828', 2.6);
      E('line', { x1: X0, x2: X1, y1: yp(P), y2: yp(P), stroke: '#c62828', 'stroke-dasharray': '3 3' }, g);
      const lg = [['v (V)', '#b8960a'], ['i (A, current reference)', '#1592b8'], ['p = vi (W)', '#c62828'], ['P (average)', '#c62828']].concat(parts ? [['P(1+cos2ωt)', '#e07a10'], ['−Q sin2ωt', '#1a8a4a']] : []);
      lg.forEach(([t, col], k) => { const e = E('text', { x: 50 + (k % 3) * 160, y: 14 + Math.floor(k / 3) * 14, 'font-size': 11, fill: col }, g); e.textContent = t; });
      $('#obTxt').innerHTML = `P = ½·40·5·cos(${th}°) = <b>${num(P, 1)} W</b> · Q = ½·40·5·sin(${th}°) = <b>${num(Q, 1)} VAR</b> · p<sub>max</sub> = ${num(P + 100, 1)} W, p<sub>min</sub> = ${num(P - 100, 1)} W · time with p &lt; 0: ${num(100 * (Math.abs(th) / 180), 0)}% of the period (pink regions) · ${th > 0 ? 'current lags: inductive' : th < 0 ? 'current leads: capacitive' : 'in phase: resistive'}`;
      // güç üçgeni
      tri.innerHTML = '';
      const k = 1.6, ox = 60, oy = 95, px = ox + P * k, qy = oy - Q * k * 0.38;
      E('line', { x1: ox, y1: oy, x2: px, y2: oy, stroke: '#0b5cad', 'stroke-width': 3 }, tri);
      E('line', { x1: px, y1: oy, x2: px, y2: qy, stroke: '#1a8a4a', 'stroke-width': 3 }, tri);
      E('line', { x1: ox, y1: oy, x2: px, y2: qy, stroke: '#c62828', 'stroke-width': 3 }, tri);
      const tx = (x, y, t, col, a = 'start') => { const e = E('text', { x, y, 'font-size': 12, fill: col, 'text-anchor': a }, tri); e.textContent = t; };
      tx((ox + px) / 2, oy + 16, `P = ${num(P, 1)} W`, '#0b5cad', 'middle');
      tx(px + 6, (oy + qy) / 2, `Q = ${num(Q, 1)} VAR`, '#1a8a4a');
      tx((ox + px) / 2 - 10, (oy + qy) / 2 - 6, 'S = ½VₘIₘ = 100 VA', '#c62828', 'end');
      tx(ox + 22, oy - 4, `θ = ${th}°`, '#333');
      tx(330, 160, `pf = cos θ = ${num(Math.cos(r), 3)} ${th > 0 ? 'lagging' : th < 0 ? 'leading' : ''}`, '#333');
    }
    $('#obTheta').oninput = draw; $('#obParts').onchange = draw;
    draw();
    return { draw };
  })();
  void OB;

  /* ================= ÖN HAZIRLIK ================= */
  numq('onhaz', '#preQ', { id: 'p1', q: '1) Example 2.1: v = 40 cos(ωt + 30°) V, i = 5 cos(ωt − 30°) A. What is the average power P in W?', answer: 50, unit: 'W', explain: 'P = ½·40·5·cos60° = 50 W. p(t) = 50 + 100 cos 2ωt W.', hint: 'θ<sub>v</sub> − θ<sub>i</sub> = 60°; P = ½V<sub>m</sub>I<sub>m</sub>cos θ.' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) In the same example f = 50 Hz. What is the value of p(t) at t = 5 ms, in W?', answer: -50, tol: 1, unit: 'W', explain: '2ωt = 200π·0.005 = π → p = 50 + 100 cos π = −50 W: at that instant the box delivers power to the source.', hint: 'p(t) = 50 + 100 cos(200πt)' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) Example 2.2: v = 100 cos(ωt + 15°) V, i = 4 sin(ωt − 15°) A (passive convention). What is P in W?', answer: -100, tol: 1, unit: 'W', explain: 'i = 4 cos(ωt − 105°), θ = 120°, P = 200 cos120° = −100 W: the box supplies active power.', hint: 'First convert the sine to a cosine: sin x = cos(x − 90°).' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) v = 50 cos(ωt + 10°) V, i = 2 cos(ωt − 50°) A. What is the reactive power Q in VAR?', answer: 43.3, tol: 1, unit: 'VAR', explain: 'θ = 60°, Q = 50 sin60° = 43.30 VAR; pf = 0.5 lagging.', hint: 'Q = ½V<sub>m</sub>I<sub>m</sub> sin θ' });
  mcq('onhaz', '#preQ', { id: 'p5', q: '5) If the source frequency is 50 Hz, at what frequency does the instantaneous power p(t) oscillate?', opts: ['25 Hz', '50 Hz', '100 Hz', 'It does not oscillate; it is constant'], correct: 2, explain: 'The product cos α cos β produces a 2ωt term: p(t) oscillates at 100 Hz. You will measure it on the MATH channel in Experiment 1.', hint: 'cos²x = (1 + cos 2x)/2' });
  numq('onhaz', '#preQ', { id: 'p6', q: '6) Example 2.6: A coffee maker consumes 140 kWh per year and draws an average of 1.2 kW while running. How many hours per year does it run?', answer: 116.67, tol: 1, unit: 'h', explain: 't = E/P = 140/1.2 = 116.67 h (≈ 19 minutes per day).', hint: 'E = P·t' });
  mcq('onhaz', '#preQ', { id: 'p7', q: '7) A load is given as “pf = 0.8 leading”. What is θ<sub>v</sub> − θ<sub>i</sub>?', opts: ['+36.87°', '−36.87°', '+53.13°', 'The sign cannot be determined'], correct: 1, explain: 'Leading = current ahead of voltage = capacitive: θ<sub>v</sub> − θ<sub>i</sub> &lt; 0, Q &lt; 0.', hint: 'cos θ = cos(−θ); the adjective determines the sign.' });

  /* ================= TEZGÂH FABRİKASI (Deney 1–3) ================= */
  const RLIST = [1, 2, 4.7, 6, 8, 10, 15, 22, 33, 47, 68, 100, 150, 220, 330, 470, 1000];
  const LLIST = [1e-3, 2.2e-3, 4.7e-3, 8e-3, 10e-3, 22e-3, 33e-3, 47e-3, 50e-3, 68e-3, 100e-3, 150e-3, 220e-3, 330e-3, 470e-3, 1];
  const CLIST = [1e-6, 2.2e-6, 4.7e-6, 10e-6, 22e-6, 33e-6, 47e-6, 68e-6, 100e-6, 125e-6, 220e-6, 470e-6, 1000e-6];
  const VDIV = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
  const ADIV = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10];
  const WDIV = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  const TDIV = [1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2, 2e-2, 5e-2, 0.1];
  const TNAME = { R: 'R', L: 'L', C: 'C', RL: 'Series RL', RC: 'Series RC', RLC: 'Series RLC' };
  const rCoil = (L) => 0.5 + 30 * L; // sargı direnci: 0,5 Ω + 0,03 Ω/mH
  const PRAT = 500; // yük direnci güç değeri (W), Örnek 2.3 (300 W) için güç direnci
  const IMAX = 10; // yükselteç koruması (A rms)

  function makeBench(k, cfg) {
    const st = S.b[k] || (S.b[k] = Object.assign({ on: false, rows: [], math: false, mean: false, decomp: false, cur: false }, cfg.def));
    const self = { dirty: true, k, st, hotWarned: false };
    const set = () => (self.dirty = true);
    const root = $('#' + k + 'bench');
    root.innerHTML = `
      <div class="bench"><div class="bench-row" id="${k}inst"></div>
        <div class="bench-row" style="margin-top:12px">
          <div class="inst dark scopewrap" style="flex:1;min-width:420px">
            <div class="brand"><span>DSO-4M · Digital Oscilloscope · MATH = CH1 × CH2</span><span><span class="led on g"></span> RUN</span></div>
            <div class="row" style="align-items:flex-start;flex-wrap:nowrap">
              <canvas id="${k}scope" width="640" height="400" style="width:100%;max-width:640px"></canvas>
              <div style="min-width:165px">
                <div class="ctrls" id="${k}sk"></div>
                <div class="row" style="margin:6px 0;gap:4px">
                  <button class="seg-btn on" id="${k}c1">CH1</button><button class="seg-btn on" id="${k}c2">CH2</button>
                  <button class="seg-btn" id="${k}cm">MATH</button><button class="seg-btn" id="${k}cav">MEAN</button><button class="seg-btn" id="${k}ccur">CURSOR</button>
                </div>
                <div class="meas" id="${k}meas"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="card" style="margin-top:12px"><svg id="${k}sch" class="schem" viewBox="0 0 760 250"></svg></div>
      ${cfg.decomp ? `<div class="card"><div class="row"><b>Components of p(t) (one period of v, current peak = 0)</b><span class="grow"></span><label style="font-size:13px"><input type="checkbox" id="${k}dec"> Show theoretical components</label></div><canvas id="${k}plot" width="640" height="280" style="width:100%"></canvas></div>` : ''}
      <div class="card">
        <div class="row"><b>Measurement table</b><span class="grow"></span>
          <button class="btn small" id="${k}rec">Record (R)</button>
          <button class="btn sec small" id="${k}del">Delete last row</button>
          <button class="btn sec small" id="${k}csv">CSV</button></div>
        <div class="tablewrap"><table class="data" id="${k}tab"><thead><tr><th>#</th><th>Load</th><th>Values</th><th>f (Hz)</th><th>V<sub>rms</sub></th><th>I<sub>rms</sub></th><th>p<sub>max</sub> (W)</th><th>p<sub>min</sub> (W)</th><th>MEAN (W)</th><th>Δt (ms)</th></tr></thead><tbody></tbody></table></div>
      </div>
      <div class="card"><h3 style="margin-top:0">Questions</h3><div id="${k}Q"></div></div>`;

    const box = $('#' + k + 'inst');
    // --- güç yükselteci
    const amp = inst(box, 'AC POWER AMPLIFIER · 0–100 V rms'); const ampL = lcd(amp.el, 'OUTPUT · V rms · f', '', 190);
    const kV = new Lab.Knob(amp.c, { label: 'Voltage', min: 0, max: 100, step: 0.05, value: st.V, dark: true, fmt: (v) => num(v, 2) + ' V', onChange: (v) => { st.V = v; save(); set(); } });
    const kf = new Lab.Knob(amp.c, { label: 'Frequency', min: 10, max: 5000, log: true, value: st.f, dark: true, fmt: (v) => eng(v, 'Hz', 4), onChange: (v) => { st.f = v; save(); set(); } });
    const pre = document.createElement('div'); pre.className = 'row'; pre.style.cssText = 'gap:3px;margin-top:4px;flex-wrap:wrap;max-width:200px';
    pre.innerHTML = [[50, '50 Hz'], [200 / TAU, 'ω=200'], [500 / TAU, 'ω=500'], [1000 / TAU, 'ω=1000']].map(([f, t]) => `<button class="seg-btn" data-f="${f}">${t}</button>`).join('');
    amp.el.appendChild(pre);
    $$('button', pre).forEach((b) => (b.onclick = () => kf.set(+b.dataset.f)));
    const outB = document.createElement('button'); outB.className = 'seg-btn'; outB.style.cssText = 'width:120px;padding:7px;margin-top:6px'; amp.el.appendChild(outB);
    const showOut = () => { outB.textContent = st.on ? 'OUTPUT ON' : 'OUTPUT OFF'; outB.classList.toggle('on', st.on); };
    outB.onclick = () => { st.on = !st.on; save(); showOut(); set(); }; showOut();
    // --- yük kutusu
    const lb = inst(box, 'LOAD BOX', false);
    const tb = document.createElement('div'); tb.className = 'row'; tb.style.cssText = 'gap:3px;margin-bottom:6px';
    tb.innerHTML = cfg.types.map((t) => `<button class="seg-btn" data-t="${t}">${TNAME[t]}</button>`).join('');
    lb.el.insertBefore(tb, lb.c);
    const showType = () => $$('button', tb).forEach((b) => b.classList.toggle('on', b.dataset.t === st.type));
    $$('button', tb).forEach((b) => (b.onclick = () => { st.type = b.dataset.t; save(); showType(); drawSch(); set(); }));
    if (!cfg.types.includes(st.type)) st.type = cfg.types[0];
    showType();
    const kR = new Lab.Knob(lb.c, { label: 'R', list: RLIST, value: st.R, fmt: Lab.ohm, onChange: (v) => { st.R = v; save(); set(); } });
    const kL = new Lab.Knob(lb.c, { label: 'L', list: LLIST, value: st.L, fmt: (v) => eng(v, 'H'), onChange: (v) => { st.L = v; save(); set(); } });
    const kC = new Lab.Knob(lb.c, { label: 'C', list: CLIST, value: st.C, fmt: (v) => eng(v, 'F'), onChange: (v) => { st.C = v; save(); set(); } });
    const rl = document.createElement('label'); rl.className = 'chk l'; rl.innerHTML = `<input type="checkbox" ${st.real ? 'checked' : ''}> Real inductor (winding resistance r)`; lb.el.appendChild(rl);
    rl.firstChild.onchange = (e) => { st.real = e.target.checked; save(); set(); };
    // --- rms ölçerler
    const mt = inst(box, 'TRUE-RMS METERS', false);
    const mVL = lcd(mt.el, 'VOLTMETER · load terminals', 'V', 130), mIL = lcd(mt.el, 'AMMETER', 'A', 130);

    // --- osiloskop
    const scope = new Lab.Scope($('#' + k + 'scope'));
    scope.ch[0].name = 'CH1 v'; scope.ch[1].name = 'CH2 i';
    scope.ch.push({ vdiv: 20, on: !!st.math, pos: 0, color: '#ff6b6b', name: 'MATH' });
    const sk = $('#' + k + 'sk');
    const k1 = new Lab.Knob(sk, { label: 'CH1 V/div', list: VDIV, value: st.v1 || 5, dark: true, size: 42, fmt: (v) => eng(v, 'V'), onChange: (v) => { scope.ch[0].vdiv = v; st.v1 = v; save(); set(); } });
    const k2 = new Lab.Knob(sk, { label: 'CH2 A/div', list: ADIV, value: st.v2 || 0.5, dark: true, size: 42, fmt: (v) => eng(v, 'A'), onChange: (v) => { scope.ch[1].vdiv = v; st.v2 = v; save(); set(); } });
    const km = new Lab.Knob(sk, { label: 'MATH W/div', list: WDIV, value: st.vm || 5, dark: true, size: 42, fmt: (v) => eng(v, 'W'), onChange: (v) => { scope.ch[2].vdiv = v; st.vm = v; save(); set(); } });
    const kmp = new Lab.Knob(sk, { label: 'MATH position', min: -4, max: 4, step: 0.1, value: st.mp ?? -1, dark: true, size: 42, fmt: (v) => num(v, 1) + ' d', onChange: (v) => { scope.ch[2].pos = v; st.mp = v; save(); set(); } });
    const kt = new Lab.Knob(sk, { label: 'TIME/div', list: TDIV, value: st.td || 2e-3, dark: true, size: 42, fmt: (v) => eng(v, 's'), onChange: (v) => { scope.tdiv = v; st.td = v; save(); set(); } });
    scope.ch[0].vdiv = k1.value; scope.ch[1].vdiv = k2.value; scope.ch[2].vdiv = km.value; scope.ch[2].pos = kmp.value; scope.tdiv = kt.value;
    const auto = document.createElement('button'); auto.className = 'seg-btn'; auto.textContent = 'AUTO'; sk.appendChild(auto);
    auto.onclick = () => {
      const c = self.c; if (!c) return;
      const pk = (L, x) => L.find((v) => v >= x) || L[L.length - 1];
      kt.set(pk(TDIV, 2.2 / c.f / 10)); k1.set(pk(VDIV, c.Vm / 3.5)); k2.set(pk(ADIV, Math.max(c.Im, 1e-3) / 3)); km.set(pk(WDIV, Math.max(Math.abs(c.P) + c.Sm, 0.01) / 3.2));
      kmp.set(clamp(-Math.round((c.P / km.value) * 10) / 10, -3, 3));
    };
    const tog = (id, key, f) => { const b = $(id); b.classList.toggle('on', !!st[key]); b.onclick = () => { st[key] = !st[key]; b.classList.toggle('on', !!st[key]); if (f) f(); save(); set(); }; };
    $('#' + k + 'c1').onclick = (e) => { scope.ch[0].on = !scope.ch[0].on; e.target.classList.toggle('on'); set(); };
    $('#' + k + 'c2').onclick = (e) => { scope.ch[1].on = !scope.ch[1].on; e.target.classList.toggle('on'); set(); };
    tog('#' + k + 'cm', 'math', () => (scope.ch[2].on = !!st.math));
    tog('#' + k + 'cav', 'mean');
    tog('#' + k + 'ccur', 'cur', () => (scope.cur.on = !!st.cur));
    scope.cur.on = !!st.cur;
    $('#' + k + 'scope').addEventListener('pointermove', () => { if (scope.cur.drag) set(); });
    if (cfg.decomp) { const d = $('#' + k + 'dec'); d.checked = !!st.decomp; d.onchange = () => { st.decomp = d.checked; save(); set(); }; }

    /* --- şema --- */
    const g = $('#' + k + 'sch');
    let tV, tI, tTh, tEl = [];
    function drawSch() {
      g.innerHTML = '';
      sch.src(g, 70, 140); sch.w(g, [[70, 118], [70, 60], [200, 60]]); sch.w(g, [[70, 162], [70, 215], [690, 215]]);
      sch.t(g, 30, 145, 'v<tspan font-size="10" dy="3">s</tspan>');
      // akım probu
      E('circle', { cx: 215, cy: 60, r: 15, fill: 'none', stroke: '#1592b8', 'stroke-width': 3 }, g); sch.w(g, [[200, 60], [300, 60]]);
      sch.t(g, 215, 32, 'CH2 · current probe', 'lbl').style.fill = '#1592b8';
      E('path', { d: 'M232,60 l-8,-5 v10 z', fill: '#1592b8' }, g);
      // CH1 yük uçlarında
      sch.dot(g, 270, 60); sch.dot(g, 270, 215); sch.w(g, [[270, 60], [270, 100]]); sch.term(g, 270, 104); sch.t(g, 280, 108, 'CH1 (+)', 'lbl', 'start').style.fill = '#b8960a';
      sch.gnd(g, 270, 215);
      const els = { R: ['R'], L: ['L'], C: ['C'], RL: ['R', 'L'], RC: ['R', 'C'], RLC: ['R', 'L', 'C'] }[st.type];
      const x0 = 320, x1 = 690, w = (x1 - x0) / els.length; tEl = [];
      sch.w(g, [[300, 60], [x0, 60]]);
      els.forEach((e, i) => {
        const a = x0 + i * w + 10, b = x0 + (i + 1) * w - 10;
        sch.w(g, [[x0 + i * w, 60], [a, 60]]); sch.w(g, [[b, 60], [x0 + (i + 1) * w, 60]]);
        if (e === 'R') sch.rH(g, a, b, 60); else if (e === 'L') sch.lH(g, a, b, 60); else sch.cH(g, a, b, 60);
        tEl.push([e, sch.t(g, (a + b) / 2, 36, '', 'lbl')]);
      });
      sch.w(g, [[x1, 60], [x1, 215]]);
      E('rect', { x: 305, y: 18, width: 395, height: 75, rx: 8, fill: 'none', stroke: '#aab', 'stroke-dasharray': '5 4' }, g);
      sch.t(g, 500, 110, 'LOAD BOX · ' + TNAME[st.type], 'lbl').style.fill = '#667';
      tV = sch.t(g, 110, 245, '', 'val', 'start'); tI = sch.t(g, 330, 245, '', 'val', 'start'); tTh = sch.t(g, 540, 245, '', 'val', 'start');
    }
    drawSch();

    function compute() {
      const w = TAU * st.f, r = st.real ? rCoil(st.L) : 0;
      const zR = cx(st.R), zL = cx(r, w * st.L), zC = cx(0, -1 / (w * st.C));
      const Z = { R: zR, L: zL, C: zC, RL: cadd(zR, zL), RC: cadd(zR, zC), RLC: cadd(cadd(zR, zL), zC) }[st.type];
      const V = st.on ? st.V : 0, I = cdiv(cx(V), Z), Ia = cabs(I);
      const th = cargd(Z), Vm = Math.SQRT2 * V, Im = Math.SQRT2 * Ia;
      const P = V * Ia * Math.cos((th * Math.PI) / 180), Q = V * Ia * Math.sin((th * Math.PI) / 180);
      const PR = st.type.includes('R') ? Ia * Ia * st.R : 0;
      return { type: st.type, V, f: st.f, w, R: st.R, L: st.L, C: st.C, real: !!st.real, r, on: st.on, Z, Ia, th, Vm, Im, P, Q, Sm: 0.5 * Vm * Im, PR };
    }
    let lastMeas = {};
    function sim(c) {
      const n = 1200, T = scope.tdiv * 10, dt = T / (n - 1);
      const y1 = new Float64Array(n), y2 = new Float64Array(n), y3 = new Float64Array(n);
      const th = (c.th * Math.PI) / 180, nv = 0.002 * c.Vm, ni = 0.002 * c.Im + 2e-4;
      for (let i = 0; i < n; i++) {
        const t = i * dt, v = c.Vm * Math.cos(c.w * t) + nv * gauss(), cur = c.Im * Math.cos(c.w * t - th) + ni * gauss();
        y1[i] = v; y2[i] = cur; y3[i] = v * cur;
      }
      return { n, y: [y1, y2, y3] };
    }
    function update() {
      const c = (self.c = compute());
      if (c.Ia > IMAX && st.on) { st.on = false; save(); showOut(); Lab.toast('⚠ The amplifier overcurrent protection tripped (> 10 A rms). Output switched off: increase the impedance or lower the voltage.', 5000); return update(); }
      if (c.PR > PRAT && !self.hotWarned) { self.hotWarned = true; Lab.toast(`⚠ The load resistor dissipates ${num(c.PR, 0)} W: this exceeds its ${PRAT} W rating, the resistor is overheating!`, 5000); }
      if (c.PR <= PRAT) self.hotWarned = false;
      self.hot = c.PR > PRAT;
      if (!self.dirty) return; self.dirty = false;
      ampL(`${num(st.V, 2)} V · ${eng(st.f, 'Hz', 4)}`);
      mVL(num(c.V * (1 + 0.001 * gauss()), 3)); mIL(c.Ia < 1 ? num(c.Ia * 1e3 * (1 + 0.001 * gauss()), 1) : num(c.Ia * (1 + 0.001 * gauss()), 3), c.Ia < 1 ? 'mA' : 'A');
      tEl.forEach(([e, t]) => (t.textContent = e === 'R' ? 'R = ' + Lab.ohm(c.R) : e === 'L' ? 'L = ' + eng(c.L, 'H') + (c.real ? ' (r = ' + num(c.r, 2) + ' Ω)' : '') : 'C = ' + eng(c.C, 'F')));
      if (tV) { tV.textContent = 'V = ' + num(c.V, 2) + ' V rms'; tI.textContent = 'I = ' + eng(c.Ia, 'A') + ' rms'; tTh.textContent = st.on ? (self.hot ? 'RESISTOR OVERHEATING!' : 'ω = ' + num(c.w, 1) + ' rad/s') : 'OUTPUT OFF'; tTh.style.fill = self.hot ? '#c62828' : ''; }
      const data = sim(c); scope.draw(data);
      const m = scope.measure();
      // ORT çizgisi
      const cv = $('#' + k + 'scope'), ctx = cv.getContext('2d'), H = cv.height, dy = H / 8;
      const pAvg = c.P * (1 + 0.003 * gauss());
      if (st.math && st.mean) {
        const Y = H / 2 - (pAvg / scope.ch[2].vdiv + scope.ch[2].pos) * dy;
        ctx.save(); ctx.strokeStyle = '#ffb3b3'; ctx.setLineDash([8, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, Y); ctx.lineTo(cv.width, Y); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#ffb3b3'; ctx.font = 'bold 12px Consolas'; ctx.fillText('MEAN', cv.width - 36, Y - 4); ctx.restore();
      }
      if (st.math) { ctx.save(); ctx.fillStyle = '#ff6b6b'; ctx.font = '12px Consolas'; ctx.fillText('MATH ' + eng(scope.ch[2].vdiv, 'W') + '/div', cv.width - 130, 16); ctx.restore(); }
      const pm = m.ch[2];
      lastMeas = { pmax: pm.max, pmin: pm.min, pavg: pAvg, dt: m.cur ? m.cur.dt : NaN };
      let h = `<span style="color:#f2d21b">CH1</span> V<sub>pp</sub> ${eng(m.ch[0].vpp, 'V')}<br>f ${isFinite(m.ch[0].f) ? eng(m.ch[0].f, 'Hz', 4) : '—'}<br>` +
        `<span style="color:#27c4f0">CH2</span> I<sub>pp</sub> ${eng(m.ch[1].vpp, 'A')}<br>`;
      if (st.math) h += `<span style="color:#ff6b6b">MATH</span> max ${eng(pm.max, 'W')}<br>min ${eng(pm.min, 'W')}<br>f ${isFinite(pm.f) ? eng(pm.f, 'Hz', 4) : '—'}<br>` + (st.mean ? `MEAN ${eng(pAvg, 'W', 4)}<br>` : '');
      if (m.cur) h += `<span style="color:#ff7cf0">CURSOR</span> Δt ${eng(m.cur.dt, 's', 4)}<br>1/Δt ${eng(1 / Math.abs(m.cur.dt || 1e-12), 'Hz')}`;
      $('#' + k + 'meas').innerHTML = h;
      if (cfg.decomp) drawDec(c);
    }
    let plot = cfg.decomp ? new Lab.Plot($('#' + k + 'plot'), { xlabel: 'ωt′ (degrees, current peak = 0)', ylabel: 'power (W)' }) : null;
    function drawDec(c) {
      const pts = [], a1 = [], a2 = [], pl = [];
      for (let a = 0; a <= 360; a += 4) {
        const x = (a * Math.PI) / 180;
        pts.push([a, c.Sm * (Math.cos((c.th * Math.PI) / 180) + Math.cos(2 * x + (c.th * Math.PI) / 180))]);
        a1.push([a, c.P + c.P * Math.cos(2 * x)]); a2.push([a, -c.Q * Math.sin(2 * x)]); pl.push([a, c.P]);
      }
      const ser = [{ pts, line: true, color: '#c62828', width: 2.5 }];
      if (st.decomp) ser.push({ pts: a1, line: true, color: '#e07a10', dash: [6, 4] }, { pts: a2, line: true, color: '#1a8a4a', dash: [6, 4] }, { pts: pl, line: true, color: '#0b5cad', dash: [3, 3] });
      const ym = Math.max(1e-3, Math.abs(c.P) + c.Sm) * 1.1;
      plot.draw(ser, [0, 360], [-ym, ym]);
    }

    const tbody = $('#' + k + 'tab tbody');
    const vals = (r) => ({ R: 'R=' + Lab.ohm(r.R), L: 'L=' + eng(r.L, 'H') + (r.real ? ' (real)' : ''), C: 'C=' + eng(r.C, 'F'), RL: Lab.ohm(r.R) + ', ' + eng(r.L, 'H') + (r.real ? ' (r)' : ''), RC: Lab.ohm(r.R) + ', ' + eng(r.C, 'F'), RLC: Lab.ohm(r.R) + ', ' + eng(r.L, 'H') + ', ' + eng(r.C, 'F') }[r.type]);
    function table() {
      tbody.innerHTML = st.rows.map((r, i) => `<tr><td>${i + 1}</td><td>${TNAME[r.type]}</td><td class="l">${vals(r)}</td><td>${num(r.f, 2)}</td><td>${num(r.V, 2)}</td><td>${num(r.I, 4)}</td><td>${num(r.pmax, 2)}</td><td>${num(r.pmin, 2)}</td><td>${num(r.pavg, 3)}</td><td>${isFinite(r.dt) ? num(r.dt * 1e3, 3) : '—'}</td></tr>`).join('');
      tbody.parentElement.parentElement.scrollTop = 1e6;
    }
    function rec() {
      const c = self.c || compute();
      if (!c.on) return Lab.toast('Output is off: switch the amplifier on first.');
      if (!st.math) return Lab.toast('Turn on the MATH channel to measure p(t).');
      st.rows.push({ type: c.type, R: c.R, L: c.L, C: c.C, real: c.real, f: c.f, V: c.V, I: c.Ia, Im: c.Im, th: c.th, pmax: lastMeas.pmax, pmin: lastMeas.pmin, pavg: lastMeas.pavg, dt: lastMeas.dt });
      save(); table(); Lab.toast(`Recorded: ${TNAME[c.type]}, MEAN = ${num(lastMeas.pavg, 2)} W`);
    }
    $('#' + k + 'rec').onclick = rec;
    $('#' + k + 'del').onclick = () => { st.rows.pop(); save(); table(); };
    $('#' + k + 'csv').onclick = () => Lab.downloadCSV(`hafta7_${k}.csv`, ['#', 'load', 'R (ohm)', 'L (H)', 'C (F)', 'f (Hz)', 'Vrms', 'Irms', 'pmax (W)', 'pmin (W)', 'MEAN (W)', 'dt (s)'], st.rows.map((r, i) => [i + 1, r.type, r.R, r.L, r.C, +r.f.toFixed(3), +r.V.toFixed(3), +r.I.toFixed(5), +r.pmax.toFixed(3), +r.pmin.toFixed(3), +r.pavg.toFixed(4), isFinite(r.dt) ? +r.dt.toExponential(4) : '']));
    table();
    Object.assign(self, { update, rec, compute, scope, kt, kV, kf, canvas: $('#' + k + 'scope') });
    return self;
  }

  const B = {};
  B.d1 = makeBench('d1', { types: ['R'], def: { type: 'R', V: 5, f: 50, R: 22, L: 50e-3, C: 100e-6, real: true } });
  B.d2 = makeBench('d2', { types: ['L', 'C'], def: { type: 'L', V: 10, f: 50, R: 10, L: 50e-3, C: 100e-6, real: true } });
  B.d3 = makeBench('d3', { types: ['RL', 'RC', 'RLC'], decomp: true, def: { type: 'RL', V: 20, f: 100, R: 10, L: 22e-3, C: 47e-6, real: true } });
  const bc = (k) => B[k].c || B[k].compute();
  const rows = (k) => S.b[k].rows;

  /* ---------- Deney 1 ---------- */
  steps('d1', [
    { t: 'Load: <b>R = 10 Ω</b>. Set the amplifier to <b>10 V rms, 50 Hz</b> and switch the output on. The ammeter should read 1 A.', test: () => { const c = bc('d1'); return c.on && c.R === 10 && near(c.V, 10, 0.1) && near(c.f, 50, 0.5); } },
    { t: 'Turn on the <b>MATH</b> channel and the <b>MEAN</b> line (AUTO scales). Does p(t) ever go below zero?', test: () => S.b.d1.math && S.b.d1.mean && bc('d1').on },
    { t: 'Set TIME/div so that about <b>2 periods</b> of v are visible on screen; how many peaks do you count on MATH?', test: () => { const n = B.d1.scope.tdiv * 10 * bc('d1').f; return S.b.d1.math && n >= 1.5 && n <= 4; } },
    { t: 'Record at least <b>3 measurements</b> with different <b>(V, R)</b> pairs (<kbd>R</kbd>). Compare MEAN with V<sub>rms</sub>·I<sub>rms</sub>.', test: () => new Set(rows('d1').map((r) => r.R + '_' + r.V.toFixed(1))).size >= 3 },
    { t: 'With the same R, change the frequency <b>50 Hz → 500 Hz</b> and record another measurement. Did P change?', test: () => rows('d1').some((r) => r.f <= 60) && rows('d1').some((r) => r.f >= 400) },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: 'R = 10 Ω, 10 V rms. What is the measured average of p(t) (MEAN) in W?', answer: 10, tol: 2, unit: 'W', explain: 'P = V<sub>rms</sub>²/R = 100/10 = 10 W = V<sub>rms</sub>I<sub>rms</sub>.', hint: 'Look at the MATH MEAN value or calculate V²/R.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'With the same setting, what should p<sub>max</sub> be in W?', answer: 20, tol: 2, unit: 'W', explain: 'p = P(1 + cos2ωt) → p<sub>max</sub> = 2P = V<sub>m</sub>I<sub>m</sub> = 14.14 · 1.414 = 20 W.', hint: 'The product of the peak values is V<sub>m</sub>I<sub>m</sub>.' });
  numq('d1', '#d1Q', { id: 'd1q3', q: 'With a 50 Hz source, what frequency does the MATH channel measure, in Hz?', answer: 100, tol: 1, unit: 'Hz', explain: 'p(t) oscillates at 2ω: 100 Hz. On screen, p has two peaks in each period of v.', hint: 'cos²ωt = ?' });
  mcq('d1', '#d1Q', { id: 'd1q4', q: 'Why is p(t) never negative in a resistive load?', opts: ['The resistor stores energy', 'v and i always have the same sign; their product is ≥ 0 and energy always flows into the load', 'The current probe clips negative values', 'Because the frequency is low'], correct: 1, explain: 'θ = 0: when v &lt; 0, i is also &lt; 0. The resistor turns energy into heat and cannot give it back.', hint: 'Do v and i cross zero at the same time?' });
  numq('d1', '#d1Q', { id: 'd1q5', q: 'Example 1.3: What is the average power of an R = 100 Ω heater connected to 220 V rms mains, in W?', answer: 484, tol: 1, unit: 'W', explain: 'P = 220²/100 = 484 W; with peak values: V<sub>m</sub>²/(2R) = 311.1²/200 = 484 W.', hint: 'With rms values P = V²/R' });

  /* ---------- Deney 2 ---------- */
  steps('d2', [
    { t: 'Example 2.4: Load <b>L = 50 mH</b>, “Real inductor” <b>off</b> (ideal), <b>ω = 200 rad/s</b> (button). Set the voltage so that <b>I<sub>m</sub> = 4 A</b> (I<sub>rms</sub> = 2.83 A) and switch on.', test: () => { const c = bc('d2'); return c.on && c.type === 'L' && c.L === 0.05 && !c.real && near(c.w, 200, 1) && near(c.Im, 4, 0.08); } },
    { t: 'With MATH and MEAN on, record a measurement at this setting. What is the average? How many times does p(t) go negative?', test: () => rows('d2').some((r) => r.type === 'L' && !r.real && near(r.Im, 4, 0.1)) },
    { t: 'Turn on the “<b>Real inductor</b>” option: the winding resistance r is added. MEAN is no longer zero; record a measurement.', test: () => rows('d2').some((r) => r.type === 'L' && r.real) },
    { t: 'Example 2.5: Load <b>C = 100 µF</b>, <b>ω = 500 rad/s</b>, <b>V<sub>m</sub> = 100 V</b> (70.71 V rms). Record a measurement; compare the timing of p(t) with that of the inductor.', test: () => rows('d2').some((r) => r.type === 'C' && r.C === 1e-4 && near(TAU * r.f, 500, 2) && near(r.V, 70.71, 0.3)) },
    { t: 'Record at least <b>4 measurements</b> in total for L and C.', test: () => rows('d2').length >= 4 },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'Example 2.4 (ideal inductor, i = 4 cos 200t A): what is the reactive power Q in VAR?', answer: 80, tol: 2, unit: 'VAR', explain: 'V<sub>m</sub> = ωL·I<sub>m</sub> = 200·0.05·4 = 40 V; Q = ½·40·4 = 80 VAR; p = −80 sin 400t W.', hint: 'p<sub>maks</sub> = −p<sub>min</sub> = |Q|' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'How much energy, in J, enters the same inductor during one positive power lobe (duration T/4)?', answer: 0.4, tol: 2, unit: 'J', explain: '∫80 sin 400t dt (one half-oscillation) = 80·2/400 = 0.4 J = ½L(I<sub>m</sub>)² − 0 = ½·0.05·16 ✓.', hint: 'One lobe: amplitude × 2 / (2ω)' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 'Example 2.5 (C = 100 µF, v = 100 sin 500t V): what is Q in VAR? (with its sign)', answer: -250, tol: 1, unit: 'VAR', explain: 'I<sub>m</sub> = ωCV<sub>m</sub> = 5 A, θ = −90°: Q = ½·100·5·sin(−90°) = −250 VAR. The capacitor “delivers” reactive power.', hint: 'For a capacitor θ<sub>v</sub> − θ<sub>i</sub> = −90°.' });
  numq('d2', '#d2Q', { id: 'd2q4', q: 'From your real-inductor measurement (MEAN and I<sub>rms</sub>), what is the winding resistance r of the currently selected inductor, in Ω?', answer: () => rCoil(S.b.d2.L), tol: 6, unit: 'Ω', explain: 'The average power in the inductor is dissipated only in r: r = P / I<sub>rms</sub>².', hint: 'P = I<sub>rms</sub>² r' });
  mcq('d2', '#d2Q', { id: 'd2q5', q: 'How do the p(t) curves of an inductor and a capacitor fed with the same current compare?', opts: ['They are the same', 'They have opposite signs: when the inductor takes, the capacitor gives; together their reactive powers cancel', 'In the capacitor p(t) is always positive', 'Their frequencies differ'], correct: 1, explain: 'Q<sub>L</sub> &gt; 0, Q<sub>C</sub> &lt; 0. This is why a compensation capacitor supplies the Q of a motor (Experiment 4).', hint: 'Compare the signs of the Qs.' });

  /* ---------- Deney 3 ---------- */
  steps('d3', [
    { t: 'Example 2.3: <b>Series RL</b>, R = 6 Ω, L = 8 mH, ideal inductor, <b>ω = 1000 rad/s</b>, <b>V<sub>m</sub> = 100 V</b> (70.71 V rms). Switch the output on and turn on MATH + MEAN.', test: () => { const c = bc('d3'); return c.on && c.type === 'RL' && c.R === 6 && c.L === 8e-3 && !c.real && near(c.w, 1000, 3) && near(c.V, 70.71, 0.3) && S.b.d3.math; } },
    { t: 'Turn on the <b>theoretical components</b>: see that the sum of the P(1 + cos2ωt) and −Q sin2ωt curves is p(t).', test: () => !!S.b.d3.decomp },
    { t: 'Turn on the <b>CURSORs</b>, place one on a peak of v and the other on a peak of i; record Δt (<kbd>R</kbd>).', test: () => rows('d3').some((r) => r.type === 'RL' && isFinite(r.dt) && Math.abs(r.dt) > 0) },
    { t: 'Set up a <b>Series RC</b> load and record a measurement: does the current lead or lag? What is the sign of Q?', test: () => rows('d3').some((r) => r.type === 'RC') },
    { t: 'Design: in a <b>Series RLC</b>, choose L and C to bring the current in phase with the voltage (|θ| &lt; 2°): Q ≈ 0, pf ≈ 1.', test: () => { const c = bc('d3'); return c.on && c.type === 'RLC' && Math.abs(c.th) < 2; } },
    { t: 'Record at least <b>5 measurements</b> in total.', test: () => rows('d3').length >= 5 },
  ]);
  numq('d3', '#d3Q', { id: 'd3q1', q: 'Example 2.3: from the p<sub>max</sub> and p<sub>min</sub> values, what is the average power P in W?', answer: 300, tol: 2, unit: 'W', explain: 'p<sub>max</sub> = 800 W, p<sub>min</sub> = −200 W → P = (800 − 200)/2 = 300 W = ½I<sub>m</sub>²R.', hint: 'P = (p<sub>max</sub> + p<sub>min</sub>)/2' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'From the same measurement, what is the reactive power Q in VAR?', answer: 400, tol: 2, unit: 'VAR', explain: '½V<sub>m</sub>I<sub>m</sub> = (800 + 200)/2 = 500 VA; Q = √(500² − 300²) = 400 VAR (current lags → +).', hint: '|Q| = √((½V<sub>m</sub>I<sub>m</sub>)² − P²)' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'In Example 2.3, what is the time difference Δt between the peak of v and the peak of i, in ms?', answer: 0.9273, tol: 4, unit: 'ms', explain: 'θ = 53.13° = 0.9273 rad; Δt = θ/ω = 0.9273 ms. Compare the value you measured with the cursors with this.', hint: 'Δt = θ(rad)/ω' });
  numq('d3', '#d3Q', { id: 'd3q4', q: 'For a capacitive load the oscilloscope shows p<sub>max</sub> = 650 W, p<sub>min</sub> = −250 W. What is Q in VAR? (with its sign)', answer: -403.11, tol: 1, unit: 'VAR', explain: 'P = 200 W, ½V<sub>m</sub>I<sub>m</sub> = 450 VA, |Q| = √(450² − 200²) = 403.1 VAR; capacitive → Q = −403.1 VAR.', hint: 'First P and ½V<sub>m</sub>I<sub>m</sub>; the sign comes from the load type.' });
  numq('d3', '#d3Q', { id: 'd3q5', q: 'Design: R = 6 Ω, L = 8 mH, ω = 1000 rad/s. What series capacitor, in µF, gives pf = 1?', answer: 125, tol: 1, unit: 'µF', explain: 'ωL = 1/(ωC) → C = 1/(ω²L) = 1/(10⁶·0.008) = 125 µF. The box has 125 µF: try it!', hint: 'Resonance: X<sub>L</sub> = X<sub>C</sub>' });
  mcq('d3', '#d3Q', { id: 'd3q6', q: 'What does “pf = 0.6 lagging” tell you?', opts: ['60% of the power is lost', 'The current lags the voltage by 53.13°; 60% of the apparent power is average power, the load is inductive (Q &gt; 0)', 'The current leads by 53.13°', 'The load is capacitive'], correct: 1, explain: 'cos θ = 0.6 → θ = +53.13°; P = 0.6·S, Q = 0.8·S.', hint: 'Lagging = current lags = inductive.' });

  /* ================= DENEY 4 · Wattmetre ================= */
  const DEV = [
    { id: 'lamp', ad: 'Incandescent lamp 100 W', P: 100, Q: 0 },
    { id: 'kettle', ad: 'Kettle 2000 W', P: 2000, Q: 0 },
    { id: 'toast', ad: 'Toaster 1146 W', P: 1146, Q: 0 },
    { id: 'dryer', ad: 'Hair-dryer 600 W', P: 600, Q: 0 },
    { id: 'motor', ad: 'Motor 0.37 kW · pf 0.75 lagging', P: 370, Q: 370 * Math.tan(Math.acos(0.75)) },
    { id: 'fluo', ad: 'Fluorescent with ballast (46 W, pf 0.5 lagging)', P: 46, Q: 46 * Math.tan(Math.acos(0.5)) },
    { id: 'cap', ad: 'Compensation capacitor 10 µF', C: 10e-6 },
  ];
  const D4 = (() => {
    const st = S.d4;
    st.dev = st.dev || { lamp: false };
    st.V = st.V ?? 0; st.on = !!st.on; st.aw = st.aw || 'seri'; st.vw = st.vw || 'paralel'; st.rng = st.rng || 5; st.trip = !!st.trip;
    const self = {};
    const box = $('#d4inst');
    const vr = inst(box, 'ISOLATION TRANSFORMER + VARIAC · 50 Hz'); const vrL = lcd(vr.el, 'OUTPUT', 'V', 110);
    const kV = new Lab.Knob(vr.c, { label: 'Variac', min: 0, max: 250, step: 0.5, value: st.V, dark: true, fmt: (v) => num(v, 1) + ' V', onChange: (v) => { st.V = v; save(); } });
    const onB = document.createElement('button'); onB.className = 'seg-btn'; onB.style.cssText = 'width:120px;padding:7px;margin-top:6px'; vr.el.appendChild(onB);
    const fuB = document.createElement('button'); fuB.className = 'seg-btn'; fuB.style.cssText = 'width:120px;padding:5px;margin-top:6px;display:block'; fuB.textContent = 'Reset fuse'; vr.el.appendChild(fuB);
    const showOn = () => { onB.textContent = st.on ? 'POWER ON' : 'POWER OFF'; onB.classList.toggle('on', st.on); };
    onB.onclick = () => { st.on = !st.on; save(); showOn(); }; showOn();
    fuB.onclick = () => { st.trip = false; save(); Lab.toast('Fuse reset. It will blow again if the overload continues.'); };
    const pr = inst(box, 'SOCKET STRIP · 16 A FUSE', false);
    const dl = document.createElement('div'); dl.style.cssText = 'font-size:12px;line-height:1.7;min-width:220px';
    dl.innerHTML = DEV.map((d) => `<label style="display:block"><input type="checkbox" data-d="${d.id}" ${st.dev[d.id] ? 'checked' : ''}> ${d.ad}</label>`).join('') + '<div style="color:#777;margin-top:4px">Switching the power off while plugging loads in and out is a good habit.</div>';
    pr.el.insertBefore(dl, pr.c);
    $$('input', dl).forEach((i) => (i.onchange = () => { st.dev[i.dataset.d] = i.checked; save(); }));
    const wm = inst(box, 'ELECTRODYNAMIC WATTMETER', false, 'cl. 0.5'); const wmL = lcd(wm.el, 'P (W)', 'W', 130);
    const ws = document.createElement('div'); ws.style.cssText = 'font-size:12px;line-height:1.9';
    ws.innerHTML = `<label>Current coil <select id="d4aw"><option value="seri">in SERIES with load</option><option value="paralel">in PARALLEL with socket</option></select></label><br>
      <label>Voltage coil <select id="d4vw"><option value="paralel">in PARALLEL with load</option><option value="seri">in SERIES with load</option></select></label><br>
      <label>Current range <select id="d4rng"><option value="5">5 A</option><option value="20">20 A</option></select></label>`;
    wm.el.insertBefore(ws, wm.c);
    $('#d4aw').value = st.aw; $('#d4vw').value = st.vw; $('#d4rng').value = String(st.rng);
    $('#d4aw').onchange = (e) => { st.aw = e.target.value; save(); }; $('#d4vw').onchange = (e) => { st.vw = e.target.value; save(); };
    $('#d4rng').onchange = (e) => { st.rng = +e.target.value; save(); };
    const mv = inst(box, 'RMS METERS', false); const mvL = lcd(mv.el, 'VOLTMETER', 'V', 110), maL = lcd(mv.el, 'AMMETER', 'A', 110);

    // şema
    const g = $('#d4sch');
    sch.src(g, 60, 135); sch.t(g, 60, 185, 'variac'); sch.w(g, [[60, 113], [60, 50], [120, 50]]);
    E('rect', { x: 120, y: 38, width: 46, height: 24, rx: 4, fill: '#fff', stroke: '#c62828' }, g); sch.t(g, 143, 55, 'F 16A', 'lbl').style.fontSize = '10px';
    sch.w(g, [[166, 50], [220, 50]]); E('circle', { cx: 240, cy: 50, r: 18, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g); sch.t(g, 240, 55, 'A');
    sch.w(g, [[258, 50], [300, 50]]);
    E('rect', { x: 300, y: 30, width: 120, height: 110, rx: 8, fill: '#f4f7ff', stroke: '#0b5cad' }, g); sch.t(g, 360, 22, 'Wattmeter W', 'lbl');
    const gW = E('g', {}, g);
    sch.w(g, [[60, 157], [60, 230], [680, 230]]);
    sch.w(g, [[470, 50], [680, 50]]); sch.dot(g, 520, 50); sch.dot(g, 520, 230);
    sch.w(g, [[520, 50], [520, 100]]); E('circle', { cx: 520, cy: 120, r: 18, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g); sch.t(g, 520, 125, 'V'); sch.w(g, [[520, 138], [520, 230]]);
    E('rect', { x: 600, y: 80, width: 110, height: 110, rx: 8, fill: '#fff', stroke: '#667', 'stroke-dasharray': '5 4' }, g);
    sch.w(g, [[680, 50], [680, 80]]); sch.w(g, [[680, 190], [680, 230]]);
    const tLoads = sch.t(g, 655, 205, '', 'lbl'); tLoads.style.fontSize = '10px';
    sch.t(g, 655, 140, 'LOADS', 'lbl');
    const tMode = sch.t(g, 380, 262, '', 'val');
    function drawW() {
      gW.innerHTML = '';
      if (st.aw === 'seri') { sch.w(gW, [[300, 50], [320, 50]]); sch.lH(gW, 320, 400, 50); sch.w(gW, [[400, 50], [470, 50]]); sch.t(gW, 360, 76, 'current coil', 'lbl').style.fontSize = '10px'; }
      else { sch.w(gW, [[300, 50], [470, 50]]); sch.dot(gW, 330, 50); sch.w(gW, [[330, 50], [330, 70]]); sch.lH(gW, 330, 400, 70); sch.w(gW, [[400, 70], [400, 230]]); sch.t(gW, 365, 92, 'current coil (PARALLEL!)', 'lbl').style.cssText = 'font-size:10px;fill:#c62828'; }
      if (st.vw === 'paralel') { sch.dot(gW, 440, 50); sch.w(gW, [[440, 50], [440, 95]]); sch.rV(gW, 440, 95, 135); sch.w(gW, [[440, 135], [440, 230]]); sch.dot(gW, 440, 230); sch.t(gW, 452, 120, 'voltage coil', 'lbl', 'start').style.fontSize = '10px'; }
      else { sch.t(gW, 360, 118, 'voltage coil in SERIES!', 'lbl').style.cssText = 'font-size:10px;fill:#c62828'; }
    }
    sch.rV = sch.rV || function (gg, x, y1, y2) { const n = 6, L = 6, step = (y2 - y1 - 2 * L) / n; let d = `M${x},${y1} v${L}`; for (let i = 0; i < n; i++) d += ` l${i % 2 ? 6 : -6},${step / 2} l${i % 2 ? -6 : 6},${step / 2}`; d += ` L${x},${y2}`; E('path', { d, class: 'w' }, gg); };
    let lastAw = '', lastVw = '';

    function compute() {
      const V0 = st.on && !st.trip ? st.V : 0, w = TAU * 50;
      let G = 0, Bm = 0;
      DEV.forEach((d) => { if (!st.dev[d.id]) return; if (d.C) Bm += w * d.C; else { G += d.P / (230 * 230); Bm -= d.Q / (230 * 230); } });
      const Y = cx(G, Bm), nLoad = DEV.filter((d) => st.dev[d.id]).length;
      let V = V0, I = 0, P = 0, Q = 0, mode = '', Pw = 0;
      if (st.aw === 'paralel' && V0 > 5) { st.trip = true; save(); Lab.toast('💥 The current coil was connected in parallel with the socket: the low-resistance coil short-circuited the source and the fuse blew. The current coil is connected in SERIES with the load.', 6000); return compute(); }
      if (st.vw === 'seri') {
        // gerilim bobini (≈ 10 kΩ) yüke seri: yük neredeyse gerilimsiz
        const Zl = nLoad ? cdiv(cx(1), Y) : cx(1e9), Zt = cadd(Zl, cx(1e4)), Ic = cdiv(cx(V0), Zt);
        I = cabs(Ic); const Vl = cmul(Ic, Zl); P = Vl[0] * Ic[0] + Vl[1] * Ic[1]; Pw = 0; mode = V0 > 1 ? 'Loads not working: voltage coil in series!' : '';
      } else {
        const Ic = cmul(cx(V0), Y); I = cabs(Ic); P = V0 * Ic[0]; Q = -V0 * Ic[1]; Pw = P;
        if (I > 16 && V0 > 0) { st.trip = true; st.tripSeen = true; save(); Lab.toast(`⚡ Total current ${num(I, 2)} A > 16 A: the fuse blew! Remove a load and reset the fuse.`, 6000); return compute(); }
        mode = st.trip ? 'FUSE BLOWN' : '';
      }
      let over = false;
      if (I > st.rng * 1.2) { over = true; Pw = Math.min(Pw, st.rng * 300); }
      return { V, I, P, Q, Pw, over, mode, nLoad, loads: DEV.filter((d) => st.dev[d.id]).map((d) => d.id) };
    }
    let warnedOver = false;
    function update() {
      if (lastAw !== st.aw || lastVw !== st.vw) { lastAw = st.aw; lastVw = st.vw; drawW(); }
      const c = (self.c = compute());
      if (c.over && !warnedOver) { warnedOver = true; Lab.toast('⚠ Wattmeter current coil overloaded: switch to the 20 A range. The pointer hit the end stop and the coil is heating up.', 5000); }
      if (!c.over) warnedOver = false;
      vrL(num(c.V, 1)); mvL(num(c.V * (1 + 0.001 * gauss()), 1)); maL(num(c.I * (1 + 0.002 * gauss()), 3));
      wmL(c.over ? 'OVER' : num(c.Pw * (1 + 0.002 * gauss()), 1));
      tLoads.textContent = c.nLoad + ' load(s) connected';
      tMode.textContent = c.mode || (st.on ? '' : 'power off'); tMode.style.fill = c.mode ? '#c62828' : '#555';
      fuB.style.display = st.trip ? 'block' : 'none';
    }
    const tbody = $('#d4tab tbody');
    const loadName = (ids) => ids.map((id) => DEV.find((d) => d.id === id).ad.split(' ')[0] + (id === 'cap' ? ' C' : '')).join(' + ') || '—';
    function table() { tbody.innerHTML = st.rows.map((r, i) => `<tr><td>${i + 1}</td><td class="l">${loadName(r.loads)}</td><td>${num(r.V, 1)}</td><td>${num(r.I, 3)}</td><td>${num(r.P, 1)}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; }
    function rec() {
      const c = self.c || compute();
      if (!st.on || st.trip || c.V < 1) return Lab.toast('To measure, the power must be on and the fuse must be intact.');
      if (st.vw === 'seri' || c.over) return Lab.toast('The wattmeter reading is invalid with this connection/range.');
      st.rows.push({ loads: c.loads, V: c.V, I: c.I, P: c.Pw }); save(); table(); Lab.toast(`Recorded: P = ${num(c.Pw, 1)} W, V·I = ${num(c.V * c.I, 1)} VA`);
    }
    $('#d4rec').onclick = rec;
    $('#d4del').onclick = () => { st.rows.pop(); save(); table(); };
    $('#d4csv').onclick = () => Lab.downloadCSV('hafta7_deney4.csv', ['#', 'loads', 'V (V)', 'I (A)', 'P (W)'], st.rows.map((r, i) => [i + 1, r.loads.join('+'), +r.V.toFixed(2), +r.I.toFixed(4), +r.P.toFixed(2)]));
    table();
    Object.assign(self, { update, rec });
    return self;
  })();
  const only = (ids) => { const L = (D4.c || {}).loads || []; return L.length === ids.length && ids.every((i) => L.includes(i)); };
  const d4ok = () => { const c = D4.c || {}; return S.d4.on && !S.d4.trip && S.d4.aw === 'seri' && S.d4.vw === 'paralel' && near(c.V, 230, 2) && !c.over; };
  steps('d4', [
    { t: 'Current coil in <b>series</b>, voltage coil in <b>parallel</b>; only the <b>incandescent lamp</b> connected. Set the variac to <b>230 V</b> and switch the power on. Compare P with V·I.', test: () => d4ok() && only(['lamp']) },
    { t: 'Remove the lamp, connect only the <b>motor</b> and record. Why is the wattmeter reading smaller than V·I?', test: () => S.d4.rows.some((r) => r.loads.length === 1 && r.loads[0] === 'motor' && near(r.V, 230, 2)) },
    { t: 'Add the <b>10 µF compensation capacitor</b> in parallel with the motor and record: did P change, did I change?', test: () => S.d4.rows.some((r) => r.loads.length === 2 && r.loads.includes('motor') && r.loads.includes('cap') && near(r.V, 230, 2)) },
    { t: 'Example 2.8: <b>kettle + toaster + hair dryer</b> at the same time (230 V). What happened? (Switch to the 20 A range first.)', test: () => !!S.d4.tripSeen },
    { t: 'Record at least <b>4 measurements</b> with different load combinations.', test: () => new Set(S.d4.rows.map((r) => r.loads.slice().sort().join('+'))).size >= 4 },
  ]);
  numq('d4', '#d4Q', { id: 'd4q1', q: 'With only the motor connected, what is the power factor pf = P/(V·I) from your measurements?', answer: 0.75, tol: 2, unit: '', explain: 'P ≈ 370 W, V·I ≈ 493 VA → pf = 0.75 (lagging, inductive).', hint: 'Wattmeter / (voltmeter × ammeter)' });
  numq('d4', '#d4Q', { id: 'd4q2', q: 'What is the reactive power Q drawn by the motor, in VAR?', answer: 326.3, tol: 2, unit: 'VAR', explain: 'Q = √(S² − P²) = √(493.3² − 370²) = 326.3 VAR.', hint: 'S = V·I, then Pythagoras.' });
  numq('d4', '#d4Q', { id: 'd4q3', q: 'How much reactive power, in VAR, does a 10 µF capacitor produce at 230 V, 50 Hz (magnitude)?', answer: 166.2, tol: 1, unit: 'VAR', explain: '|Q<sub>C</sub>| = V²ωC = 230²·314.16·10⁻⁵ = 166.2 VAR.', hint: 'Q<sub>C</sub> = V<sub>rms</sub>² / X<sub>C</sub>' });
  numq('d4', '#d4Q', { id: 'd4q4', q: 'With motor + capacitor together, what is the mains current in A? (measure or calculate)', answer: 1.7528, tol: 2, unit: 'A', explain: 'Q = 326.3 − 166.2 = 160.1 VAR, S = √(370² + 160.1²) = 403.2 VA, I = 1.753 A (2.145 A with the motor alone). P stayed the same.', hint: 'Add the reactive powers with their signs.' });
  numq('d4', '#d4Q', { id: 'd4q5', q: 'Example 2.8: how many amperes in total do kettle + toaster + hair dryer draw at 230 V?', answer: 16.29, tol: 1, unit: 'A', explain: 'P = 3746 W, resistive → I = 3746/230 = 16.29 A &gt; 16 A: the fuse blows.', hint: 'For resistive loads I = ΣP / V' });
  mcq('d4', '#d4Q', { id: 'd4q6', q: 'When the capacitor was connected, the wattmeter did not change but the ammeter reading dropped. Why?', opts: ['The capacitor produces active power', 'The capacitor supplies the motor’s reactive current locally; the Q and current from the mains decrease while P stays the same', 'The wattmeter broke', 'The voltage dropped'], correct: 1, explain: 'For an ideal capacitor P = 0. Smaller current: less cable loss (I²R), thinner cable, no reactive energy charge.', hint: 'What is the P of a capacitor?' });
  mcq('d4', '#d4Q', { id: 'd4q7', q: 'What happens if the wattmeter current coil is accidentally connected in parallel with the socket?', opts: ['The reading doubles', 'The very low-resistance coil short-circuits the source; the fuse blows and the coil may burn out', 'The reading is zero but there is no danger', 'The voltage coil is bypassed'], correct: 1, explain: 'The current coil is like an ammeter: connected in SERIES. The voltage coil is like a voltmeter: in PARALLEL.', hint: 'Like connecting an ammeter in parallel with the socket.' });

  /* ================= RAPOR ================= */
  function buildReport() {
    const sec = { onhaz: 'Pre-lab', d1: 'Experiment 1', d2: 'Experiment 2', d3: 'Experiment 3', d4: 'Experiment 4' };
    let tot = 0, ok = 0;
    const qrows = Object.entries(qids).map(([pg, ids]) => ids.map((id) => {
      const a = S.answers[id]; tot++; if (a && a.ok) ok++;
      const q = $(`[data-qid="${id}"] .qt`); const qt = q ? q.innerHTML : id;
      return `<tr><td class="l">${sec[pg]}</td><td class="l">${qt}</td><td class="l">${a ? a.a : '—'}</td><td>${a ? (a.ok ? '✔' : '✘') : '—'}</td></tr>`;
    }).join('')).join('');
    let sTot = 0, sOk = 0;
    Object.keys(stepDefs).forEach((k) => stepDefs[k].forEach((_, i) => { sTot++; if (S.steps[k + '_' + i]) sOk++; }));
    const img = (c) => { try { return `<img src="${c.toDataURL()}" style="width:32%;border:1px solid #ccc">`; } catch (e) { return ''; } };
    const tb = (k, t) => `<h3>${t}</h3><table class="data"><thead>${$('#' + k + 'tab thead').innerHTML}</thead><tbody>${$('#' + k + 'tab tbody').innerHTML}</tbody></table>`;
    const html = `
      <h2 style="margin:0">Circuit Theory II · Virtual Laboratory · Week 7 Report</h2>
      <p><b>Topic:</b> Instantaneous, average and reactive power — p(t) = v·i, power in R/L/C loads, wattmeter and V·I</p>
      <table class="data" style="width:auto"><tr><th>Full name</th><td class="l">${S.st.name || ''}</td><th>Student ID</th><td class="l">${S.st.no || ''}</td><th>Group</th><td class="l">${S.st.group || ''}</td><th>Date</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Summary</h3>
      <p>Lab-sheet steps completed: <b>${sOk}/${sTot}</b> · Correct answers: <b>${ok}/${tot}</b> · Score: <b>${Math.round((50 * sOk) / sTot + (50 * ok) / tot)}/100</b></p>
      <h3>Answers</h3>
      <table class="data"><thead><tr><th>Section</th><th>Question</th><th>Answer</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      ${tb('d1', 'Experiment 1 · p(t) in a resistor')}${tb('d2', 'Experiment 2 · p(t) in L and C')}${tb('d3', 'Experiment 3 · General load')}${tb('d4', 'Experiment 4 · Wattmeter and V·I')}
      <h3>Oscilloscope screens</h3>
      <div>${img(B.d1.canvas)} ${img(B.d2.canvas)} ${img(B.d3.canvas)}</div>
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
    if (e.altKey && /^[0-7]$/.test(e.key)) { go(pages[+e.key]); e.preventDefault(); return; }
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.key === '?') $('#helpModal').classList.add('show');
    if (e.key === 'r' || e.key === 'R') { if (B[S.page]) B[S.page].rec(); if (S.page === 'd4') D4.rec(); }
  });

  let lastT = 0;
  function loop(now) {
    const pg = S.page;
    if (B[pg]) { if (now - lastT > 120) { lastT = now; B[pg].dirty = true; } B[pg].update(); evalSteps(pg); }
    if (pg === 'd4') { D4.update(); evalSteps('d4'); }
    requestAnimationFrame(loop);
  }
  ['d1', 'd2', 'd3'].forEach((k) => B[k].update());
  D4.update();
  ['d1', 'd2', 'd3', 'd4'].forEach(evalSteps);
  go(S.page); progress(); requestAnimationFrame(loop);
})();

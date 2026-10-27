/* Devre Kuramı I · Hafta 13 — Paralel RLC Basamak Tepkisi */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd1h13';
  const S = Object.assign({ answers: {}, steps: {}, d1rows: [], d2rows: [], d3rows: [], d4rows: [], d4traces: [], st: {}, page: 'giris', d1seen: {} }, Lab.store.load(KEY));
  Lab.answers = S.answers;
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => Lab.store.save(KEY, S), 300); };
  Lab.onAnswer = () => { save(); progress(); };
  const near = (a, b, t) => Math.abs(a - b) <= t;
  const rel = (a, b, t) => Math.abs(a - b) <= Math.abs(b) * t;

  /* ---------- cihaz yardımcıları ---------- */
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
  const RLIST = [100, 200, 250, 400, 500, 800, 1000, 2000, 2500, 4000, 5000, 7500, 1e4, 2e4, 5e4];
  const LLIST = [0.01, 0.025, 0.05, 0.1, 0.5, 1, 2.5];
  const CLIST = [1e-8, 2.5e-8, 5e-8, 1e-7, 2e-7, 4e-7, 1e-6];
  const fH = (v) => eng(v, 'H'), fF = (v) => eng(v, 'F');

  /* ---------- şema yardımcıları ---------- */
  const sch = {
    w: (g, pts) => E('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'w' }, g),
    dot: (g, x, y) => E('circle', { cx: x, cy: y, r: 3.5, class: 'node' }, g),
    t: (g, x, y, s, cls = 'lbl', anchor = 'middle') => { const e = E('text', { x, y, class: cls, 'text-anchor': anchor }, g); e.innerHTML = s; return e; },
    rV(g, x, y1, y2) { const n = 6, L = 8, step = (y2 - y1 - 2 * L) / n; let d = `M${x},${y1} v${L}`; for (let i = 0; i < n; i++) d += ` l${i % 2 ? 7 : -7},${step / 2} l${i % 2 ? -7 : 7},${step / 2}`; d += ` L${x},${y2}`; E('path', { d, class: 'w' }, g); },
    lV(g, x, y1, y2) { const m = (y1 + y2) / 2; let d = `M${x},${y1} V${m - 24}`; for (let i = 0; i < 4; i++) d += ' a6,6 0 0 1 0,12'; d += ` V${y2}`; E('path', { d, class: 'w', fill: 'none' }, g); },
    cV(g, x, y1, y2) { const m = (y1 + y2) / 2; E('path', { d: `M${x},${y1} V${m - 5} M${x - 15},${m - 5} h30 M${x - 15},${m + 5} h30 M${x},${m + 5} V${y2}`, class: 'w' }, g); },
    gnd(g, x, y) { E('path', { d: `M${x},${y} v8 M${x - 11},${y + 8} h22 M${x - 7},${y + 13} h14 M${x - 3},${y + 18} h6`, class: 'w' }, g); },
    isrc(g, x, y) { E('circle', { cx: x, cy: y, r: 20, class: 'w', fill: '#fff' }, g); E('path', { d: `M${x},${y + 12} V${y - 12} m-5,7 l5,-7 l5,7`, class: 'w', fill: 'none' }, g); },
    sw(g, x1, x2, y, closed) {
      E('circle', { cx: x1, cy: y, r: 3.5, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g);
      E('circle', { cx: x2, cy: y, r: 3.5, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g);
      return E('line', { x1: x1 + 3, y1: y, x2: closed ? x2 - 3 : x2 - 6, y2: closed ? y : y - 20, class: 'w' }, g);
    },
  };
  // Paralel RLC şeması (akım kaynağı + S + R ‖ L ‖ C). Değer etiketlerini döndürür.
  function parSchem(g, opt = {}) {
    const yT = 55, yB = 205;
    sch.isrc(g, 80, 130); sch.w(g, [[80, 110], [80, yT], [150, yT]]); sch.w(g, [[80, 150], [80, yB], [600, yB]]);
    const swl = sch.sw(g, 150, 200, yT, false); sch.t(g, 175, yT - 26, 'S (t = 0)', 'lbl');
    sch.w(g, [[200, yT], [600, yT]]);
    sch.w(g, [[300, yT], [300, 90]]); sch.rV(g, 300, 90, 170); sch.w(g, [[300, 170], [300, yB]]);
    sch.w(g, [[440, yT], [440, 82]]); sch.lV(g, 440, 82, 150);
    if (opt.rL) { sch.rV(g, 440, 150, 190); sch.w(g, [[440, 190], [440, yB]]); } else sch.w(g, [[440, 150], [440, yB]]);
    sch.w(g, [[580, yT], [580, 100]]); sch.cV(g, 580, 100, 160); sch.w(g, [[580, 160], [580, yB]]);
    [300, 440, 580].forEach((x) => { sch.dot(g, x, yT); sch.dot(g, x, yB); });
    sch.gnd(g, 340, yB);
    E('path', { d: 'M425,95 v18 m-4,-6 l4,6 l4,-6', stroke: '#c62828', 'stroke-width': 2, fill: 'none' }, g);
    sch.t(g, 418, 108, 'i<tspan font-size="10" dy="3">L</tspan>', 'lbl', 'end').style.fill = '#c62828';
    sch.t(g, 640, yT + 4, '+', 'lbl'); sch.t(g, 640, yB - 2, '−', 'lbl'); sch.t(g, 650, 135, 'v', 'lbl', 'start');
    sch.w(g, [[600, yT], [630, yT]]); sch.w(g, [[600, yB], [630, yB]]);
    const tIs = sch.t(g, 110, 135, '', 'lbl', 'start'), tR = sch.t(g, 314, 135, '', 'lbl', 'start'), tL = sch.t(g, 454, 120, '', 'lbl', 'start'), tC = sch.t(g, 600, 136, '', 'lbl', 'start');
    const tMode = sch.t(g, 380, 24, '', 'val'), tWarn = sch.t(g, 380, 238, '', 'val');
    if (opt.rL) sch.t(g, 454, 176, 'r<tspan font-size="10" dy="3">L</tspan>', 'lbl', 'start');
    const tIC = sch.t(g, 600, 182, '', 'val', 'start');
    return { swl, tIs, tR, tL, tC, tMode, tWarn, tIC, setSw(closed) { swl.setAttribute('x2', closed ? 197 : 194); swl.setAttribute('y2', closed ? yT : yT - 20); } };
  }

  /* ---------- fizik: paralel RLC ---------- */
  const params = (R, L, C, rL = 0) => {
    const a = 1 / (2 * R * C), w0 = 1 / Math.sqrt(L * C);
    const kind = Math.abs(a - w0) < 1e-3 * w0 ? 'critical' : a > w0 ? 'over' : 'under';
    return { a, w0, kind, wd: kind === 'under' ? Math.sqrt(w0 * w0 - a * a) : 0 };
  };
  // x'' + 2αx' + ω0²x = 0 çözümü
  function sol2(a, w0, x0, dx0, t) {
    const d = a * a - w0 * w0;
    if (Math.abs(d) < 1e-6 * w0 * w0) return (dx0 + a * x0) * t * Math.exp(-a * t) + x0 * Math.exp(-a * t);
    if (d > 0) { const b = Math.sqrt(d), s1 = -a + b, s2 = -a - b, A1 = (dx0 - s2 * x0) / (s1 - s2); return A1 * Math.exp(s1 * t) + (x0 - A1) * Math.exp(s2 * t); }
    const wd = Math.sqrt(-d); return Math.exp(-a * t) * (x0 * Math.cos(wd * t) + ((dx0 + a * x0) / wd) * Math.sin(wd * t));
  }
  // Sayısal (RK4) çözüm. p = {Is,R,L,C,rL,I0,V0}; [0,T] aralığında n örnek; anahtar t0’da kapanır.
  function simPar(p, T, n, t0 = 0) {
    const { Is, R, L, C } = p, rL = p.rL || 0;
    const f = (y) => [(y[1] - rL * y[0]) / L, (Is - y[1] / R - y[0]) / C];
    const lam = Math.max(1 / Math.sqrt(L * C), 1 / (R * C), rL / L, 1);
    const dtS = T / (n - 1);
    let m = Math.ceil(dtS / (0.05 / lam)); m = clamp(m, 1, Math.max(1, Math.floor(600000 / n)));
    const t = new Float64Array(n), iL = new Float64Array(n), v = new Float64Array(n);
    let y = [p.I0 || 0, p.V0 || 0];
    for (let i = 0; i < n; i++) {
      t[i] = i * dtS; iL[i] = y[0]; v[i] = y[1];
      const ta = Math.max(t[i], t0), tb = (i + 1) * dtS;
      if (i === n - 1 || tb <= t0) continue;
      const h = (tb - ta) / m;
      for (let k = 0; k < m; k++) {
        const k1 = f(y), k2 = f([y[0] + (h / 2) * k1[0], y[1] + (h / 2) * k1[1]]), k3 = f([y[0] + (h / 2) * k2[0], y[1] + (h / 2) * k2[1]]), k4 = f([y[0] + h * k3[0], y[1] + h * k3[1]]);
        y = [y[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), y[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])];
      }
    }
    return { t, iL, v, n };
  }
  // basamak ölçütleri (yükselen basamak, son değer xf)
  function metrics(t, x, xf, t0 = 0) {
    let mx = -Infinity, tp = NaN, ts = t0;
    for (let i = 0; i < x.length; i++) {
      if (t[i] < t0) continue;
      if (x[i] > mx) { mx = x[i]; tp = t[i] - t0; }
      if (Math.abs(x[i] - xf) > 0.02 * Math.abs(xf)) ts = t[i] - t0;
    }
    const settled = Math.abs(x[x.length - 1] - xf) <= 0.02 * Math.abs(xf) && ts < t[t.length - 1] - t0 - 1e-15;
    return { os: (100 * (mx - xf)) / xf, mx, tp, ts: settled ? ts : NaN };
  }
  const tUnit = (T) => (T < 2e-3 ? [1e6, 'µs'] : [1e3, 'ms']);

  /* ================= GEZİNME / İLERLEME ================= */
  const pages = ['giris', 'onbilgi', 'onhaz', 'd1', 'd2', 'd3', 'd4', 'rapor'];
  const dirty = {};
  function go(p) {
    S.page = p; save();
    $$('section.page').forEach((s) => s.classList.toggle('active', s.id === p));
    $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.p === p));
    dirty[p] = true;
    if (p === 'rapor') buildReport();
    window.scrollTo(0, 0);
  }
  $$('#nav button').forEach((b) => (b.onclick = () => go(b.dataset.p)));

  const stepDefs = {};
  function steps(key, list) { stepDefs[key] = list; $('#' + key + 'steps').innerHTML = list.map((s) => `<li>${s.t}</li>`).join(''); }
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

  [['stName', 'name'], ['stNo', 'no'], ['stGroup', 'group'], ['stDate', 'date'], ['stComment', 'comment']].forEach(([id, k]) => {
    const e = $('#' + id); e.value = S.st[k] || (k === 'date' ? new Date().toLocaleDateString('en-GB') : '');
    e.addEventListener('input', () => { S.st[k] = e.value; save(); });
  });

  /* ================= ÖN HAZIRLIK ================= */
  numq('onhaz', '#preQ', { id: 'p1', q: '1) What is the neper frequency α of the Example 4.5 circuit in rad/s?', answer: 50000, unit: 'rad/s', explain: 'α = 1/(2RC) = 1/(2·400·25×10<sup>−9</sup>) = 50 000 rad/s.', hint: 'Parallel circuit: α = 1/(2RC).' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) What is the resonant frequency ω<sub>0</sub> of the same circuit in rad/s?', answer: 40000, unit: 'rad/s', explain: 'ω<sub>0</sub> = 1/√(25×10<sup>−3</sup>·25×10<sup>−9</sup>) = 40 000 rad/s → α &gt; ω<sub>0</sub>, overdamped.', hint: 'ω<sub>0</sub> = 1/√(LC); it does not contain R.' });
  mcq('onhaz', '#preQ', { id: 'p3', q: '3) As t → ∞, what are the inductor current i<sub>L</sub> and the node voltage v?', opts: ['i<sub>L</sub> = 0, v = I<sub>s</sub>R', 'i<sub>L</sub> = I<sub>s</sub>, v = 0', 'i<sub>L</sub> = I<sub>s</sub>/2, v = I<sub>s</sub>R/2', 'The oscillation lasts forever'], correct: 1, explain: 'In the DC steady state the inductor is a short circuit: the voltage across R and C becomes zero and all of the current flows through the inductor.', hint: 'How do the inductor and capacitor behave at DC?' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) Before the switch closes the capacitor is charged to V<sub>0</sub> = 8 V, L = 25 mH. What is di<sub>L</sub>/dt(0<sup>+</sup>) in A/s?', answer: 320, unit: 'A/s', explain: 'Parallel elements share the same voltage: L di<sub>L</sub>/dt = v(0<sup>+</sup>) = 8 V → 320 A/s.', hint: 'v = L di<sub>L</sub>/dt and v(0<sup>+</sup>) = V<sub>0</sub>.' });
  numq('onhaz', '#preQ', { id: 'p5', q: '5) With L = 25 mH, C = 25 nF, what R (in Ω) gives critical damping?', answer: 500, unit: 'Ω', explain: 'R = ½√(L/C) = ½√(10<sup>6</sup>) = 500 Ω. Below it overdamped, above it underdamped.', hint: 'Solve the condition α = ω<sub>0</sub> for R.' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) In an underdamped parallel circuit starting at rest, what does the percentage overshoot of the inductor current depend on?', opts: ['Only on I<sub>s</sub>', 'Only on the ratio α/ω<sub>d</sub> (i.e. the damping ratio)', 'Only on L', 'Nothing; the overshoot is always 100%'], correct: 1, explain: '%OS = 100·e<sup>−απ/ω<sub>d</sub></sup>. I<sub>s</sub> only sets the scale.', hint: 'The first peak is at ω<sub>d</sub>t = π; the envelope is e<sup>−αt</sup>.' });

  /* ================= DENEY 1 ================= */
  const D1 = (() => {
    const self = { closed: false, trace: null };
    const set = () => (dirty.d1 = true);
    const box = $('#d1inst');
    const src = inst(box, 'DC CURRENT SOURCE · I<sub>s</sub>', true, 'compliance ±60 V'); const srcL = lcd(src.el, 'I<sub>s</sub>', 'mA', 110);
    const kI = new Lab.Knob(src.c, { label: 'I_s', min: 0, max: 50, step: 0.5, value: 24, dark: true, fmt: (v) => num(v, 1) + ' mA', onChange: set });
    const swb = document.createElement('button'); swb.className = 'seg-btn'; swb.style.cssText = 'width:140px;padding:8px'; src.c.appendChild(swb);
    const swTxt = () => { swb.textContent = self.closed ? 'S CLOSED (click to rerun)' : 'CLOSE SWITCH'; swb.classList.toggle('on', self.closed); };
    swb.onclick = () => { self.closed = !self.closed; swTxt(); set(); }; swTxt();
    const eb = inst(box, 'COMPONENT BOXES', false);
    const kR = new Lab.Knob(eb.c, { label: 'R', list: RLIST, value: 400, fmt: Lab.ohm, onChange: set });
    const kL = new Lab.Knob(eb.c, { label: 'L', list: LLIST, value: 0.025, fmt: fH, onChange: set });
    const kC = new Lab.Knob(eb.c, { label: 'C', list: CLIST, value: 2.5e-8, fmt: fF, onChange: set });
    const sc = parSchem($('#d1sch'));
    const pI = new Lab.Plot($('#d1plotI'), { xlabel: 't', ylabel: 'i_L (mA)' }), pV = new Lab.Plot($('#d1plotV'), { xlabel: 't', ylabel: 'v (V)' });
    $('#d1theo').onchange = set; $('#d1cur').oninput = set;
    self.c = () => ({ Is: kI.value * 1e-3, R: kR.value, L: kL.value, C: kC.value });
    function window_(c) {
      const P = params(c.R, c.L, c.C);
      if (P.kind === 'over') return 6 / (P.a - Math.sqrt(P.a * P.a - P.w0 * P.w0));
      if (P.kind === 'critical') return 8 / P.a;
      return Math.min(5 / P.a, (8 * 2 * Math.PI) / P.wd);
    }
    self.update = () => {
      if (!dirty.d1) return; dirty.d1 = false;
      const c = self.c(); srcL(num(kI.value, 1));
      sc.tIs.textContent = 'I_s = ' + num(kI.value, 1) + ' mA'; sc.tR.textContent = 'R = ' + Lab.ohm(c.R); sc.tL.textContent = 'L = ' + fH(c.L); sc.tC.textContent = 'C = ' + fF(c.C);
      sc.setSw(self.closed);
      const T = window_(c), [k, u] = tUnit(T), pre = 0.05 * T, n = 601;
      let ser = [], serV = [], cur = '';
      if (self.closed) {
        const r = simPar(c, T + pre, n, pre); self.trace = { r, pre, k, u, c };
        const pts = [], ptsV = [];
        for (let i = 0; i < n; i++) { pts.push([(r.t[i] - pre) * k, r.iL[i] * 1e3]); ptsV.push([(r.t[i] - pre) * k, r.v[i]]); }
        let vmax = 0; for (const x of r.v) vmax = Math.max(vmax, Math.abs(x));
        sc.tWarn.textContent = vmax > 60 ? '⚠ Voltage peak ' + num(vmax, 0) + ' V > 60 V compliance limit: a real source cannot deliver this curve' : '';
        sc.tWarn.style.fill = '#c62828';
        if ($('#d1theo').checked) {
          const P = params(c.R, c.L, c.C), th = [];
          for (let i = 0; i <= 300; i++) { const t = (i / 300) * T; th.push([t * k, (c.Is + sol2(P.a, P.w0, -c.Is, 0, t)) * 1e3]); }
          ser.push({ pts: th, line: true, color: '#e07a10', dash: [6, 4] });
        }
        ser.push({ pts, line: true, color: '#0b5cad', width: 2.4 }); serV.push({ pts: ptsV, line: true, color: '#1a8a4a', width: 2.4 });
        const idx = Math.round(($('#d1cur').value / 1000) * (n - 1));
        self.curv = { t: r.t[idx] - pre, iL: r.iL[idx], v: r.v[idx] };
        cur = `t = ${num(self.curv.t * k, 2)} ${u} · i_L = ${num(self.curv.iL * 1e3, 3)} mA · v = ${num(self.curv.v, 3)} V`;
        const yI = [Math.min(0, ...pts.map((p) => p[1])) - 1, Math.max(c.Is * 1e3 * 1.05, ...pts.map((p) => p[1])) + 1];
        const yV = [Math.min(0, ...ptsV.map((p) => p[1])) * 1.1 - 0.1, Math.max(0.1, ...ptsV.map((p) => p[1])) * 1.1];
        const xc = self.curv.t * k;
        ser.push({ pts: [[xc, yI[0]], [xc, yI[1]]], line: true, color: '#d63ad0', dash: [4, 4], width: 1.2 });
        serV.push({ pts: [[xc, yV[0]], [xc, yV[1]]], line: true, color: '#d63ad0', dash: [4, 4], width: 1.2 });
        pI.o.xlabel = pV.o.xlabel = 't (' + u + ')';
        pI.draw(ser, [-pre * k, T * k], yI); pV.draw(serV, [-pre * k, T * k], yV);
        if (c.Is === 0.024 && c.L === 0.025 && c.C === 2.5e-8) { S.d1seen[c.R] = true; save(); }
      } else {
        self.trace = null; self.curv = null; sc.tWarn.textContent = '';
        pI.draw([], [0, 1], [0, 30]); pV.draw([], [0, 1], [0, 10]); cur = 'Switch open: first press CLOSE SWITCH.';
      }
      sc.tMode.textContent = self.closed ? 'S closed · source connected' : 'S open · circuit at rest';
      $('#d1curTxt').textContent = cur;
    };
    const tbody = $('#d1tab tbody');
    function table() { tbody.innerHTML = S.d1rows.map((r, i) => `<tr><td>${i + 1}</td><td>${num(r.Is * 1e3, 1)} mA</td><td>${Lab.ohm(r.R)}</td><td>${fH(r.L)}</td><td>${fF(r.C)}</td><td>${eng(r.t, 's')}</td><td>${num(r.iL * 1e3, 3)}</td><td>${num(r.v, 3)}</td></tr>`).join(''); }
    self.rec = () => {
      if (!self.curv) return Lab.toast('Close the switch first.');
      const c = self.c(); S.d1rows.push(Object.assign({}, c, self.curv)); save(); table();
      Lab.toast(`Recorded: t = ${eng(self.curv.t, 's')}, i_L = ${num(self.curv.iL * 1e3, 2)} mA, v = ${num(self.curv.v, 2)} V`);
    };
    $('#d1rec').onclick = self.rec;
    $('#d1del').onclick = () => { S.d1rows.pop(); save(); table(); };
    $('#d1csv').onclick = () => Lab.downloadCSV('week13_experiment1.csv', ['#', 'Is (mA)', 'R (ohm)', 'L (H)', 'C (F)', 't (s)', 'iL (mA)', 'v (V)'], S.d1rows.map((r, i) => [i + 1, r.Is * 1e3, r.R, r.L, r.C, r.t, +(r.iL * 1e3).toFixed(4), +r.v.toFixed(4)]));
    table(); set();
    Object.assign(self, { kI, kR, kL, kC });
    return self;
  })();
  const ex45 = (c) => near(c.Is, 0.024, 1e-6) && c.L === 0.025 && c.C === 2.5e-8;
  steps('d1', [
    { t: 'Example 4.5: select <b>I<sub>s</sub> = 24 mA, R = 400 Ω, L = 25 mH, C = 25 nF</b> and close the switch. Does the current overshoot 24 mA?', test: () => D1.closed && ex45(D1.c()) && D1.c().R === 400 },
    { t: 'Move the cursor to the <b>peak of the inductor voltage</b> and record the measurement (<kbd>R</kbd>). Note the peak time and value.', test: () => S.d1rows.some((r) => ex45(r) && r.R === 400 && near(r.t, 23.1e-6, 2e-6)) },
    { t: '“Predict first”: set <b>R = 2 kΩ</b> in the same circuit. Does the current exceed 24 mA?', test: () => D1.closed && ex45(D1.c()) && D1.c().R === 2000 },
    { t: 'With the same L and C, compute and set the R that makes the response <b>critically damped</b>.', test: () => D1.closed && ex45(D1.c()) && D1.c().R === 500 },
    { t: 'Increase R to <b>20 kΩ or more</b>: almost an ideal LC. Between which values does the current oscillate?', test: () => D1.closed && D1.c().R >= 2e4 },
    { t: 'Turn on the <b>theoretical curve</b>, compare it with the measurement, and record <b>at least 5</b> measurements in total at different R values.', test: () => $('#d1theo').checked && S.d1rows.length >= 5 && new Set(S.d1rows.map((r) => r.R)).size >= 2 },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: 'In Example 4.5, i<sub>L</sub>(t) = 24 + A<sub>1</sub>e<sup>−20 000t</sup> + A<sub>2</sub>e<sup>−80 000t</sup> mA. What is A<sub>1</sub> in mA?', answer: -32, unit: 'mA', explain: 'A<sub>1</sub> + A<sub>2</sub> = −24 and −20 000A<sub>1</sub> − 80 000A<sub>2</sub> = 0 → A<sub>1</sub> = −32, A<sub>2</sub> = 8.', hint: 'Two conditions: i<sub>L</sub>(0) = 0 and di<sub>L</sub>/dt(0) = v(0)/L = 0.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'What peak inductor voltage (in V) did you measure with the cursor?', answer: 7.56, tol: 2, unit: 'V', explain: 'v = 16(e<sup>−20 000t</sup> − e<sup>−80 000t</sup>) V; the peak is 7.56 V at 23.1 µs.', hint: 'Move the cursor to the highest point of the v(t) plot.' });
  numq('d1', '#d1Q', { id: 'd1q3', q: 'At how many µs does this peak occur? (Verify with theory: dv/dt = 0)', answer: 23.1, tol: 4, unit: 'µs', explain: 'e<sup>60 000t</sup> = 4 → t = ln4/60 000 = 23.1 µs.', hint: '−20 000e<sup>−20 000t</sup> + 80 000e<sup>−80 000t</sup> = 0' });
  mcq('d1', '#d1Q', { id: 'd1q4', q: 'What happened when R was increased from 400 Ω to 2 kΩ (same L, C)?', opts: ['It stayed overdamped', 'It became underdamped; the current exceeded 24 mA', 'It became critically damped', 'The current never reached 24 mA'], correct: 1, explain: 'α = 10 000 &lt; ω<sub>0</sub> = 40 000 → ω<sub>d</sub> = 38 730 rad/s. In the parallel circuit a large R means little damping.', hint: 'What happens to α = 1/(2RC) as R increases?' });
  numq('d1', '#d1Q', { id: 'd1q5', q: 'What maximum inductor current (in mA) did you measure with R = 2 kΩ?', answer: 24 * (1 + Math.exp((-Math.PI * 1e4) / Math.sqrt(16e8 - 1e8))), tol: 2, unit: 'mA', explain: 'i<sub>max</sub> = 24(1 + e<sup>−απ/ω<sub>d</sub></sup>) = 24(1 + 0.444) ≈ 34.7 mA (44% overshoot).', hint: 'Place the cursor on the first peak of the i<sub>L</sub> curve.' });
  mcq('d1', '#d1Q', { id: 'd1q6', q: 'Which statement is true for the R giving critical damping in the parallel circuit?', opts: ['R = 2√(L/C)', 'R = ½√(L/C); overshoot begins above this value', 'R = ½√(L/C); overshoot begins below this value', 'R = √(LC)'], correct: 1, explain: 'R = ½√(L/C) = 500 Ω. Larger R → α decreases → underdamped, overshoot.', hint: 'α = 1/(2RC) = ω<sub>0</sub>.' });

  /* ================= osiloskop kurucu ================= */
  const VDIV = [1e-3, 2e-3, 5e-3, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
  const TDIV = [1e-6, 2e-6, 5e-6, 1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3];
  function makeScope(row, id, o) {
    const w = document.createElement('div'); w.className = 'inst dark scopewrap'; w.style.cssText = 'flex:1;min-width:420px';
    w.innerHTML = `<div class="brand"><span>DSO-2C · Digital Oscilloscope</span><span><span class="led on g"></span> SINGLE SHOT · trigger at div 1</span></div>
      <div class="row" style="align-items:flex-start;flex-wrap:nowrap"><canvas id="${id}" width="640" height="400" style="width:100%;max-width:640px"></canvas>
      <div style="min-width:160px"><div class="ctrls"></div><div class="row" style="margin:6px 0"><button class="seg-btn on">CH1</button><button class="seg-btn on">CH2</button><button class="seg-btn">CURSOR</button></div><div class="meas"></div></div></div>`;
    row.appendChild(w);
    const meas = w.querySelector('.meas'), sk = w.querySelector('.ctrls');
    const scope = new Lab.Scope(w.querySelector('canvas'), { onMeasure: (m) => o.onMeasure && o.onMeasure(m, meas) });
    const k1 = new Lab.Knob(sk, { label: 'CH1 V/div', list: VDIV, value: o.v1, dark: true, size: 44, fmt: (v) => eng(v, 'V'), onChange: (v) => { scope.ch[0].vdiv = v; o.set(); } });
    const k2 = new Lab.Knob(sk, { label: 'CH2 V/div', list: VDIV, value: o.v2, dark: true, size: 44, fmt: (v) => eng(v, 'V'), onChange: (v) => { scope.ch[1].vdiv = v; o.set(); } });
    const kt = new Lab.Knob(sk, { label: 'TIME/div', list: TDIV, value: o.td, dark: true, size: 44, fmt: (v) => eng(v, 's'), onChange: (v) => { scope.tdiv = v; o.set(); } });
    scope.ch[0].vdiv = o.v1; scope.ch[1].vdiv = o.v2; scope.tdiv = o.td; scope.ch[0].pos = -3; scope.ch[1].pos = -3;
    const b = w.querySelectorAll('.seg-btn');
    b[0].onclick = () => { scope.ch[0].on = !scope.ch[0].on; b[0].classList.toggle('on'); o.set(); };
    b[1].onclick = () => { scope.ch[1].on = !scope.ch[1].on; b[1].classList.toggle('on'); o.set(); };
    b[2].onclick = () => { scope.cur.on = !scope.cur.on; b[2].classList.toggle('on'); scope.draw(); };
    return { scope, k1, k2, kt, canvas: w.querySelector('canvas') };
  }

  /* ================= DENEY 2 ================= */
  const D2 = (() => {
    const self = {};
    const set = () => (dirty.d2 = true);
    const box = $('#d2inst');
    const src = inst(box, 'DC CURRENT SOURCE · I<sub>s</sub>'); const srcL = lcd(src.el, 'I<sub>s</sub>', 'mA', 100);
    const kI = new Lab.Knob(src.c, { label: 'I_s', min: 0, max: 50, step: 0.5, value: 10, dark: true, fmt: (v) => num(v, 1) + ' mA', onChange: set });
    const eb = inst(box, 'COMPONENT BOXES', false);
    const kR = new Lab.Knob(eb.c, { label: 'R', list: RLIST, value: 1e4, fmt: Lab.ohm, onChange: set });
    const kL = new Lab.Knob(eb.c, { label: 'L', list: LLIST, value: 2.5, fmt: fH, onChange: set });
    const kC = new Lab.Knob(eb.c, { label: 'C', list: CLIST, value: 2.5e-8, fmt: fF, onChange: set });
    const pr = inst(box, 'CURRENT PROBE', false, '100 mV/mA'); const prL = lcd(pr.el, 'CH2 scale', '', 110); prL('100 mV/mA');
    const sc = parSchem($('#d2sch')); sc.setSw(true); sc.tMode.textContent = 'CH1: v (node) · CH2: i_L (current probe)';
    E('circle', { cx: 440, cy: 70, r: 9, fill: 'none', stroke: '#1592b8', 'stroke-width': 2.5 }, $('#d2sch'));
    sch.t($('#d2sch'), 462, 74, 'CH2', 'lbl', 'start').style.fill = '#1592b8';
    sch.t($('#d2sch'), 690, 135, 'CH1', 'lbl', 'start').style.fill = '#b8960a';
    function showMeas(m, el) {
      if (!m) return; self.meas = m;
      let h = `<span style="color:#f2d21b">CH1</span> max ${eng(m.ch[0].max, 'V')}<br><span style="color:#27c4f0">CH2</span> max ${eng(m.ch[1].max, 'V')}`;
      if (m.cur) h += `<br><span style="color:#ff7cf0">CURSOR</span> Δt ${eng(m.cur.dt, 's')}<br>CH1 a ${num(m.cur.v1a, 3)} V · b ${num(m.cur.v1b, 3)} V<br>CH2 a ${num(m.cur.v2a, 4)} V<br>CH2 b ${num(m.cur.v2b, 4)} V`;
      el.innerHTML = h;
    }
    const sco = makeScope($('#d2scopeRow'), 'd2scope', { v1: 10, v2: 0.5, td: 5e-4, set, onMeasure: showMeas });
    self.c = () => ({ Is: kI.value * 1e-3, R: kR.value, L: kL.value, C: kC.value });
    self.update = () => {
      if (!dirty.d2) return; dirty.d2 = false;
      const c = self.c(); srcL(num(kI.value, 1));
      sc.tIs.textContent = 'I_s = ' + num(kI.value, 1) + ' mA'; sc.tR.textContent = 'R = ' + Lab.ohm(c.R); sc.tL.textContent = 'L = ' + fH(c.L); sc.tC.textContent = 'C = ' + fF(c.C);
      const td = sco.scope.tdiv, n = 1000, r = simPar(c, 10 * td, n, td);
      const y1 = r.v, y2 = new Float64Array(n); for (let i = 0; i < n; i++) y2[i] = r.iL[i] * 100;
      // gerçek tp ve ts (adım değerlendirmesi için; ekranda gösterilmez)
      const T = 20 / Math.max(params(c.R, c.L, c.C).a, 1), rr = simPar(c, T, 4000, 0), mm = metrics(rr.t, rr.iL, c.Is);
      self.ref = mm;
      sco.scope.draw({ n, y: [y1, y2] });
    };
    const tbody = $('#d2tab tbody');
    function table() { tbody.innerHTML = S.d2rows.map((r, i) => `<tr><td>${i + 1}</td><td>${Lab.ohm(r.R)}</td><td>${eng(r.dt, 's')}</td><td>${num(r.v1b, 3)}</td><td>${num(r.v2a, 4)}</td><td>${num(r.v2b, 4)}</td><td>${num(r.v2b * 10, 3)}</td></tr>`).join(''); }
    self.rec = () => {
      const m = sco.scope.measure(); if (!m || !m.cur) return Lab.toast('First turn on and place the CURSORs.');
      const c = self.c(), ta = (sco.scope.cur.a - 1) * sco.scope.tdiv, tb = (sco.scope.cur.b - 1) * sco.scope.tdiv;
      S.d2rows.push(Object.assign({}, c, { dt: m.cur.dt, ta, tb, td: sco.scope.tdiv, v1b: m.cur.v1b, v2a: m.cur.v2a, v2b: m.cur.v2b, tp: self.ref.tp, ts: self.ref.ts })); save(); table();
      Lab.toast(`Recorded: Δt = ${eng(m.cur.dt, 's')}, CH2(b) = ${num(m.cur.v2b, 4)} V`);
    };
    $('#d2rec').onclick = self.rec;
    $('#d2del').onclick = () => { S.d2rows.pop(); save(); table(); };
    $('#d2csv').onclick = () => Lab.downloadCSV('week13_experiment2.csv', ['#', 'R (ohm)', 'dt (s)', 'CH1 b (V)', 'CH2 a (V)', 'CH2 b (V)', 'iL b (mA)'], S.d2rows.map((r, i) => [i + 1, r.R, r.dt, r.v1b, r.v2a, r.v2b, r.v2b * 10]));
    table(); set();
    Object.assign(self, { kI, kR, kL, kC, sco });
    return self;
  })();
  const ex415 = (c) => near(c.Is, 0.01, 1e-6) && c.L === 2.5 && c.C === 2.5e-8;
  steps('d2', [
    { t: 'Example 4.15: set <b>I<sub>s</sub> = 10 mA, R = 10 kΩ, L = 2.5 H, C = 25 nF</b>.', test: () => ex415(D2.c()) && D2.c().R === 1e4 },
    { t: 'Set CH2 to <b>0.2 V/div</b> so that the current curve best fills the screen, and the time base to <b>0.2–0.5 ms/div</b>.', test: () => D2.sco.k2.value === 0.2 && D2.sco.scope.tdiv >= 2e-4 && D2.sco.scope.tdiv <= 5e-4 },
    { t: 'Turn on the CURSORs: put <b>a</b> at the step instant (div 1) and <b>b</b> on the <b>first peak</b> of the current.', test: () => { const s = D2.sco.scope; return s.cur.on && ex415(D2.c()) && D2.c().R === 1e4 && near(s.cur.a, 1, 0.08) && D2.ref && rel((s.cur.b - 1) * s.tdiv, D2.ref.tp, 0.03); } },
    { t: 'Record the peak measurement (<kbd>R</kbd>): Δt = t<sub>p</sub>, CH2(b)/100 mV = i<sub>max</sub>.', test: () => S.d2rows.some((r) => ex415(r) && r.R === 1e4 && near(r.ta, 0, 0.1 * (r.td || 2e-4)) && rel(r.tb, r.tp, 0.03)) },
    { t: '<b>Settling time:</b> move cursor b to the point where the current enters the ±2% band (9.8–10.2 mA → CH2 0.98–1.02 V) for the last time, and record.', test: () => S.d2rows.some((r) => ex415(r) && r.R === 1e4 && isFinite(r.ts) && rel(r.tb, r.ts, 0.1)) },
    { t: 'Change R (e.g. 7.5 kΩ or 20 kΩ) and record the new peak measurement. How did the overshoot change?', test: () => S.d2rows.some((r) => ex415(r) && r.R !== 1e4 && rel(r.tb, r.tp, 0.05)) },
  ]);
  const ts415 = () => { const c = { Is: 0.01, R: 1e4, L: 2.5, C: 2.5e-8 }, r = simPar(c, 0.01, 8000, 0); return metrics(r.t, r.iL, 0.01).ts * 1e3; };
  numq('d2', '#d2Q', { id: 'd2q1', q: 'What peak time t<sub>p</sub> (in µs) did you measure?', answer: 907, tol: 3, unit: 'µs', explain: 't<sub>p</sub> = π/ω<sub>d</sub> = π/3464 = 907 µs.', hint: 'The Δt value of the cursors.' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'What is the maximum inductor current in mA? (CH2 scale 100 mV/mA)', answer: 11.63, tol: 1.5, unit: 'mA', explain: 'i<sub>max</sub> = 10 + 10e<sup>−2000·907µ</sup> = 11.63 mA.', hint: 'Divide the CH2(b) voltage by 100 mV/mA.' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 'What is the percentage overshoot?', answer: 16.3, tol: 0, abs: 0.8, unit: '%', explain: '(11.63 − 10)/10 = 16.3% = 100·e<sup>−απ/ω<sub>d</sub></sup>.', hint: '(i<sub>max</sub> − I<sub>s</sub>)/I<sub>s</sub>' });
  numq('d2', '#d2Q', { id: 'd2q4', q: 'From your t<sub>p</sub> measurement, what is the damped angular frequency ω<sub>d</sub> in rad/s?', answer: 3464, tol: 3, unit: 'rad/s', explain: 'ω<sub>d</sub> = π/t<sub>p</sub> ≈ 3464 rad/s = √(4000² − 2000²).', hint: 'The peak is at ω<sub>d</sub>t = π.' });
  numq('d2', '#d2Q', { id: 'd2q5', q: 'What 2% settling time t<sub>s</sub> (in ms) did you measure?', answer: ts415, tol: 10, unit: 'ms', explain: 'The rough estimate is 4/α = 2 ms; the actual t<sub>s</sub> may be slightly earlier than where the envelope crosses the band, because the oscillation passes inside the band.', hint: 'Find the instant when the current leaves the 9.8–10.2 mA band for the last time.' });
  mcq('d2', '#d2Q', { id: 'd2q6', q: 'What happens if you increase R from 10 kΩ to 20 kΩ?', opts: ['Overshoot decreases, settling is shorter', 'Overshoot increases, settling is longer (α is halved)', 'Only the final value changes', 'The response becomes overdamped'], correct: 1, explain: 'α = 1/(2RC) = 1000 rad/s: the envelope decays slowly, e<sup>−απ/ω<sub>d</sub></sup> grows.', hint: 'In the parallel circuit α is inversely proportional to R.' });

  /* ================= DENEY 3 · Tasarım ================= */
  const D3 = (() => {
    const self = {}, L = 0.1, Is = 0.01;
    const set = () => (dirty.d3 = true);
    const box = $('#d3inst');
    const src = inst(box, 'DC CURRENT SOURCE'); const srcL = lcd(src.el, 'I<sub>s</sub> (fixed)', 'mA', 100); srcL('10.0');
    const rb = inst(box, 'ADJUSTABLE RESISTOR (decade)', false); const rL_ = lcd(rb.el, 'R', 'Ω', 110);
    const kR = new Lab.Knob(rb.c, { label: 'R', min: 50, max: 20000, log: true, value: S.d3R || 1000, fmt: Lab.ohm, onChange: (v) => { S.d3R = v; save(); set(); } });
    const cb = inst(box, 'ADJUSTABLE CAPACITOR (decade)', false); const cL_ = lcd(cb.el, 'C', 'F', 110);
    const kC = new Lab.Knob(cb.c, { label: 'C', min: 1e-8, max: 1e-5, log: true, value: S.d3C || 1e-7, fmt: fF, onChange: (v) => { S.d3C = v; save(); set(); } });
    const lb = inst(box, 'INDUCTOR', false); const lL_ = lcd(lb.el, 'L (fixed)', 'mH', 90); lL_('100');
    $('#d3rL').checked = !!S.d3rL; $('#d3rL').onchange = (e) => { S.d3rL = e.target.checked; save(); set(); };
    let sc;
    function schem() { $('#d3sch').innerHTML = ''; sc = parSchem($('#d3sch'), { rL: !!S.d3rL }); sc.setSw(true); sc.tIs.textContent = 'I_s = 10 mA'; sc.tL.textContent = 'L = 100 mH'; if (S.d3rL) sc.tIC.textContent = 'r_L = 20 Ω'; }
    const plot = new Lab.Plot($('#d3plot'), { xlabel: 't (ms)', ylabel: 'i_L / I_s  (%)' });
    self.c = () => ({ Is, R: kR.value, L, C: kC.value, rL: S.d3rL ? 20 : 0 });
    self.update = () => {
      if (!dirty.d3) return; dirty.d3 = false;
      const c = self.c(); schem();
      rL_(Lab.ohm(c.R).replace('Ω', '').trim()); cL_(fF(c.C).replace('F', '').trim(), 'F');
      sc.tR.textContent = 'R = ' + Lab.ohm(c.R); sc.tC.textContent = 'C = ' + fF(c.C);
      const T = 3e-3, n = 900, r = simPar(c, T, n, 0), xf = (Is * c.R) / (c.R + c.rL), m = metrics(r.t, r.iL, xf);
      self.m = m;
      const pts = []; for (let i = 0; i < n; i++) pts.push([r.t[i] * 1e3, (100 * r.iL[i]) / Is]);
      const hl = (y, col, d) => ({ pts: [[0, y], [3, y]], line: true, color: col, dash: d, width: 1 });
      const yf = (100 * xf) / Is;
      plot.draw([hl(yf * 1.02, '#1a8a4a', [4, 4]), hl(yf * 0.98, '#1a8a4a', [4, 4]), hl(yf * 1.05, '#c62828', [8, 4]), hl(yf, '#99a', [2, 3]),
        { pts: [[1.2, 0], [1.2, 160]], line: true, color: '#e07a10', dash: [6, 4], width: 1.2 }, { pts, line: true, color: '#0b5cad', width: 2.4 }], [0, 3], [0, Math.max(120, ...pts.map((p) => p[1])) + 5]);
      const ok = m.os >= 4 && m.os <= 6 && isFinite(m.ts) && m.ts <= 1.2e-3;
      self.ok = ok;
      $('#d3meas').innerHTML = `Oscilloscope auto measurement → <b>%OS = ${num(m.os, 2)}</b> · <b>t<sub>s</sub>(%2) = ${isFinite(m.ts) ? num(m.ts * 1e3, 3) + ' ms' : '&gt; 3 ms'}</b> · final value ${num(xf * 1e3, 2)} mA. Red dashed: 105% · green: ±2% band · orange: 1.2 ms limit. ${ok ? '<b style="color:#1a8a4a">✔ Target met</b>' : '<b style="color:#c62828">Target not met</b>'}`;
    };
    const tbody = $('#d3tab tbody');
    function table() { tbody.innerHTML = S.d3rows.map((r, i) => `<tr><td>${i + 1}</td><td>${Lab.ohm(r.R)}</td><td>${fF(r.C)}</td><td>${r.rL ? '20 Ω' : 'ideal'}</td><td>${num(r.os, 2)}</td><td>${isFinite(r.ts) ? num(r.ts * 1e3, 3) : '&gt;3'}</td><td>${r.ok ? '✔' : '✘'}</td></tr>`).join(''); }
    self.rec = () => { const c = self.c(); S.d3rows.push({ R: c.R, C: c.C, rL: c.rL, os: self.m.os, ts: isFinite(self.m.ts) ? self.m.ts : null, ok: self.ok }); save(); table(); Lab.toast(`Recorded: %OS = ${num(self.m.os, 2)}`); };
    $('#d3rec').onclick = self.rec;
    $('#d3del').onclick = () => { S.d3rows.pop(); save(); table(); };
    $('#d3csv').onclick = () => Lab.downloadCSV('week13_experiment3.csv', ['#', 'R (ohm)', 'C (F)', 'rL (ohm)', '%OS', 'ts (ms)', 'target'], S.d3rows.map((r, i) => [i + 1, +r.R.toFixed(1), r.C, r.rL, +r.os.toFixed(3), r.ts ? +(r.ts * 1e3).toFixed(4) : '', r.ok ? 'yes' : 'no']));
    table(); set();
    Object.assign(self, { kR, kC, plotCanvas: $('#d3plot') });
    return self;
  })();
  steps('d3', [
    { t: 'First on paper: find <b>ζ</b> for 5% overshoot and <b>α</b> for t<sub>s</sub> ≈ 1 ms (questions 1–2).', test: () => ['d3q1', 'd3q2'].every((q) => S.answers[q] && S.answers[q].ok) },
    { t: 'Adjust R and C to bring the overshoot into the <b>4–6%</b> range (ideal inductor).', test: () => !S.d3rL && D3.m && D3.m.os >= 4 && D3.m.os <= 6 },
    { t: 'Keeping the overshoot, reselect C (and R accordingly) so that <b>t<sub>s</sub> ≤ 1.2 ms</b>.', test: () => !S.d3rL && D3.ok },
    { t: 'Record the design that meets the target (<kbd>R</kbd>).', test: () => S.d3rows.some((r) => r.ok && !r.rL) },
    { t: 'Turn on the <b>real inductor</b> (r<sub>L</sub> = 20 Ω) option and record with the same R and C. What happened to the overshoot and the final value?', test: () => S.d3rows.some((r) => r.rL) },
    { t: 'Compare the real-inductor record with the ideal one: how much did the final value drop, how much did the overshoot change? Note it in the table.', test: () => S.d3rows.some((r) => r.rL) },
  ]);
  const zeta5 = Math.log(20) / Math.sqrt(Math.PI ** 2 + Math.log(20) ** 2);
  numq('d3', '#d3Q', { id: 'd3q1', q: 'What damping ratio ζ = α/ω<sub>0</sub> is required for 5% overshoot?', answer: zeta5, tol: 2, unit: '', explain: 'πζ/√(1−ζ²) = ln20 = 3.00 → ζ = 0.690.', hint: 'Solve e<sup>−πζ/√(1−ζ²)</sup> = 0.05 for ζ.' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'Using the estimate t<sub>s</sub> ≈ 4/α, what must α be (in rad/s) for t<sub>s</sub> = 1 ms?', answer: 4000, tol: 1, unit: 'rad/s', explain: 'α = 4/t<sub>s</sub> = 4000 rad/s. (The 1.2 ms target leaves a margin.)', hint: 't<sub>s</sub> ≈ 4/α' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'With L = 100 mH, what must C be (in µF) for this α and ζ?', answer: 1 / ((4000 / zeta5) ** 2 * 0.1) * 1e6, tol: 4, unit: 'µF', explain: 'ω<sub>0</sub> = α/ζ = 5797 rad/s → C = 1/(ω<sub>0</sub>²L) ≈ 0.298 µF.', hint: 'First ω<sub>0</sub> = α/ζ.' });
  numq('d3', '#d3Q', { id: 'd3q4', q: 'With this C, what must R be in Ω?', answer: 1 / (2 * 4000 * (1 / ((4000 / zeta5) ** 2 * 0.1))), tol: 4, unit: 'Ω', explain: 'R = 1/(2αC) ≈ 420 Ω (or R = √(L/C)/(2ζ)).', hint: 'α = 1/(2RC)' });
  numq('d3', '#d3Q', { id: 'd3q5', q: 'If only the overshoot is specified: with L = 2.5 H, C = 25 nF, what must R be (in kΩ) for 5% overshoot?', answer: 10 / (2 * zeta5), tol: 3, unit: 'kΩ', explain: 'R = √(L/C)/(2ζ) = 10 kΩ/1.38 ≈ 7.25 kΩ. The 10 kΩ of Example 4.15 gave 16% overshoot.', hint: '√(L/C) = 10 kΩ.' });
  mcq('d3', '#d3Q', { id: 'd3q6', q: 'What did the 20 Ω internal resistance of the inductor do to the design?', opts: ['No effect at all', 'The final value dropped to I<sub>s</sub>R/(R+r<sub>L</sub>); the overshoot (relative to the final value) decreased only very slightly', 'It increased the overshoot', 'It doubled the resonant frequency'], correct: 1, explain: 'The series r<sub>L</sub> dissipates energy; at DC the current divides between R and r<sub>L</sub>. No compensation is needed; the overshoot stays within the target band.', hint: 'Compare the two rows in the table.' });

  /* ================= DENEY 4 · Başlangıç koşulları ================= */
  const D4 = (() => {
    const self = {}, L = 0.025, C = 2.5e-8, T = 300e-6, pre = 15e-6, n = 631, COL = ['#0b5cad', '#c62828', '#1a8a4a', '#7b3fb5', '#e07a10', '#0f8b8d', '#8a6d00'];
    const set = () => (dirty.d4 = true);
    const box = $('#d4inst');
    const src = inst(box, 'DC CURRENT SOURCE · I<sub>s</sub>'); const srcL = lcd(src.el, 'I<sub>s</sub>', 'mA', 90);
    const kI = new Lab.Knob(src.c, { label: 'I_s', min: 0, max: 50, step: 0.5, value: 24, dark: true, fmt: (v) => num(v, 1) + ' mA', onChange: set });
    const ic = inst(box, 'INITIAL CONDITION SETTER', true, 't &lt; 0'); const icL = lcd(ic.el, 'I<sub>0</sub> · V<sub>0</sub>', '', 150);
    const k0 = new Lab.Knob(ic.c, { label: 'I_0', min: -30, max: 30, step: 1, value: 0, dark: true, fmt: (v) => num(v, 0) + ' mA', onChange: set });
    const kV = new Lab.Knob(ic.c, { label: 'V_0', min: -20, max: 20, step: 0.5, value: 0, dark: true, fmt: (v) => num(v, 1) + ' V', onChange: set });
    const eb = inst(box, 'COMPONENTS', false, 'L = 25 mH (r<sub>L</sub> ≈ 2 Ω) · C = 25 nF');
    const kR = new Lab.Knob(eb.c, { label: 'R', list: RLIST, value: 400, fmt: Lab.ohm, onChange: set });
    const sc = parSchem($('#d4sch')); sc.setSw(true); sc.tL.textContent = 'L = 25 mH'; sc.tC.textContent = 'C = 25 nF';
    const plot = new Lab.Plot($('#d4plot'), { xlabel: 't (µs)', ylabel: 'i_L (mA)' });
    $('#d4theo').onchange = set; $('#d4cur').oninput = set;
    self.c = () => ({ Is: kI.value * 1e-3, R: kR.value, L, C, rL: 2, I0: k0.value * 1e-3, V0: kV.value });
    self.update = () => {
      if (!dirty.d4) return; dirty.d4 = false;
      const c = self.c(); srcL(num(kI.value, 1)); icL(num(k0.value, 0) + ' mA · ' + num(kV.value, 1) + ' V');
      sc.tIs.textContent = 'I_s = ' + num(kI.value, 1) + ' mA'; sc.tR.textContent = 'R = ' + Lab.ohm(c.R);
      sc.tIC.textContent = 'V_0 = ' + num(c.V0, 1) + ' V'; sc.tMode.textContent = 'i_L(0) = I_0 = ' + num(k0.value, 0) + ' mA';
      const r = simPar(c, T + pre, n, pre); self.r = r;
      const ser = S.d4traces.map((tr, i) => ({ pts: tr.pts, line: true, color: COL[i % COL.length], width: 1.8 }));
      const pts = []; for (let i = 0; i < n; i++) pts.push([(r.t[i] - pre) * 1e6, r.iL[i] * 1e3]);
      ser.push({ pts, line: true, color: '#222', width: 2.6 });
      if ($('#d4theo').checked) {
        const P = params(c.R, L, C), th = [];
        for (let i = 0; i <= 300; i++) { const t = (i / 300) * T; th.push([t * 1e6, (c.Is + sol2(P.a, P.w0, c.I0 - c.Is, c.V0 / L, t)) * 1e3]); }
        ser.push({ pts: th, line: true, color: '#e07a10', dash: [6, 4], width: 2 });
      }
      const all = ser.flatMap((s) => s.pts.map((p) => p[1]));
      const yr = [Math.min(0, ...all) - 2, Math.max(30, ...all) + 2];
      const idx = Math.round(($('#d4cur').value / 1000) * (n - 1));
      self.curv = { t: r.t[idx] - pre, iL: r.iL[idx], v: r.v[idx] };
      ser.push({ pts: [[self.curv.t * 1e6, yr[0]], [self.curv.t * 1e6, yr[1]]], line: true, color: '#d63ad0', dash: [4, 4], width: 1.2 });
      plot.draw(ser, [-pre * 1e6, T * 1e6], yr);
      $('#d4curTxt').textContent = `t = ${num(self.curv.t * 1e6, 2)} µs · i_L = ${num(self.curv.iL * 1e3, 3)} mA · v = ${num(self.curv.v, 3)} V`;
    };
    const tbody = $('#d4tab tbody');
    function table() { tbody.innerHTML = S.d4rows.map((r, i) => `<tr><td>${i + 1}</td><td>${Lab.ohm(r.R)}</td><td>${num(r.I0 * 1e3, 0)}</td><td>${num(r.V0, 1)}</td><td>${num(r.mn, 3)}</td><td>${num(r.mx, 3)}</td><td>${num(r.end, 3)}</td></tr>`).join(''); }
    self.rec = () => {
      dirty.d4 = true; self.update();
      const c = self.c(), r = self.r; let mn = Infinity, mx = -Infinity;
      for (let i = 0; i < n; i++) if (r.t[i] >= pre) { mn = Math.min(mn, r.iL[i]); mx = Math.max(mx, r.iL[i]); }
      S.d4rows.push({ R: c.R, Is: c.Is, I0: c.I0, V0: c.V0, mn: mn * 1e3, mx: mx * 1e3, end: r.iL[n - 1] * 1e3 });
      const pts = []; for (let i = 0; i < n; i += 3) pts.push([(r.t[i] - pre) * 1e6, +(r.iL[i] * 1e3).toFixed(4)]);
      S.d4traces.push({ pts }); if (S.d4traces.length > 7) S.d4traces.shift();
      save(); table(); set(); Lab.toast(`Trace recorded: I_0 = ${num(c.I0 * 1e3, 0)} mA, V_0 = ${num(c.V0, 1)} V`);
    };
    $('#d4rec').onclick = self.rec;
    $('#d4clr').onclick = () => { S.d4traces = []; save(); set(); };
    $('#d4csv').onclick = () => Lab.downloadCSV('week13_experiment4.csv', ['#', 'R (ohm)', 'Is (mA)', 'I0 (mA)', 'V0 (V)', 'iL min (mA)', 'iL max (mA)', 'iL(300us) (mA)'], S.d4rows.map((r, i) => [i + 1, r.R, r.Is * 1e3, r.I0 * 1e3, r.V0, +r.mn.toFixed(4), +r.mx.toFixed(4), +r.end.toFixed(4)]));
    table(); set();
    Object.assign(self, { kI, k0, kV, kR, plotCanvas: $('#d4plot') });
    return self;
  })();
  const d4has = (f) => S.d4rows.some((r) => near(r.Is, 0.024, 1e-6) && f(r));
  steps('d4', [
    { t: 'Run with <b>I<sub>0</sub> = 12 mA, V<sub>0</sub> = 0</b> (R = 400 Ω, I<sub>s</sub> = 24 mA) and record the trace.', test: () => d4has((r) => r.R === 400 && near(r.I0, 0.012, 1e-6) && r.V0 === 0) },
    { t: 'Record with <b>I<sub>0</sub> = 12 mA, V<sub>0</sub> = 6 V</b>. Why does the curve look like a single exponential?', test: () => d4has((r) => r.R === 400 && near(r.I0, 0.012, 1e-6) && r.V0 === 6) },
    { t: 'Record with <b>I<sub>0</sub> = 24 mA, V<sub>0</sub> = 0</b>. Is there a transient?', test: () => d4has((r) => r.R === 400 && near(r.I0, 0.024, 1e-6) && r.V0 === 0) },
    { t: 'Record with a <b>reverse</b> inductor current (I<sub>0</sub> &lt; 0).', test: () => d4has((r) => r.I0 < 0) },
    { t: 'Record with <b>R = 2 kΩ</b> (underdamped) and a nonzero initial condition.', test: () => d4has((r) => r.R === 2000 && (r.I0 !== 0 || r.V0 !== 0)) },
    { t: 'Turn on the <b>theoretical curve</b> and compare it with the last run. Where does the small difference come from?', test: () => $('#d4theo').checked && S.d4rows.length >= 3 },
  ]);
  numq('d4', '#d4Q', { id: 'd4q1', q: 'For I<sub>0</sub> = 12 mA, V<sub>0</sub> = 0, i<sub>L</sub> = 24 + A<sub>1</sub>e<sup>−20 000t</sup> + A<sub>2</sub>e<sup>−80 000t</sup> mA. What is A<sub>1</sub> in mA?', answer: -16, unit: 'mA', explain: 'A<sub>1</sub> + A<sub>2</sub> = 12 − 24 = −12; A<sub>1</sub> = −4A<sub>2</sub> → A<sub>2</sub> = 4, A<sub>1</sub> = −16.', hint: 'A<sub>1</sub> + A<sub>2</sub> = I<sub>0</sub> − I<sub>s</sub>' });
  numq('d4', '#d4Q', { id: 'd4q2', q: 'For I<sub>0</sub> = 12 mA, V<sub>0</sub> = 6 V, what is A<sub>2</sub> in mA?', answer: 0, tol: 0, abs: 0.05, unit: 'mA', explain: 'di<sub>L</sub>/dt(0) = 6/0.025 = 240 A/s → A<sub>1</sub> + 4A<sub>2</sub> = −12 and A<sub>1</sub> + A<sub>2</sub> = −12 → A<sub>2</sub> = 0: the fast root is not excited at all, the curve is a single exponential.', hint: '−20 000A<sub>1</sub> − 80 000A<sub>2</sub> = V<sub>0</sub>/L (240 000 in mA/s).' });
  numq('d4', '#d4Q', { id: 'd4q3', q: 'In the same case (I<sub>0</sub> = 12 mA, V<sub>0</sub> = 6 V), what is dv/dt(0<sup>+</sup>) in kV/s?', answer: -120, tol: 1, unit: 'kV/s', explain: 'C dv/dt = I<sub>s</sub> − V<sub>0</sub>/R − I<sub>0</sub> = 24 − 15 − 12 = −3 mA → −3 mA/25 nF = −120 kV/s.', hint: 'KCL: I<sub>s</sub> = v/R + i<sub>L</sub> + C dv/dt' });
  mcq('d4', '#d4Q', { id: 'd4q4', q: 'What did you observe with I<sub>0</sub> = I<sub>s</sub> = 24 mA and V<sub>0</sub> = 0?', opts: ['An overdamped transition', 'No transient: the circuit is already in steady state', 'The current dropped to zero', 'Oscillation'], correct: 1, explain: 'x(0) = I<sub>0</sub> − I<sub>s</sub> = 0 ve x\'(0) = V<sub>0</sub>/L = 0: all coefficients are zero.', hint: 'What became of the right-hand sides of the coefficient equations?' });
  mcq('d4', '#d4Q', { id: 'd4q5', q: 'What is the source of the small difference between the theoretical curve and the measurement?', opts: ['Numerical error', 'The ≈2 Ω internal resistance of the inductor: extra damping and a final value of 24·400/402 mA', 'Capacitor polarity', 'The internal resistance of the current source is not infinite'], correct: 1, explain: 'The theoretical curve is for an ideal inductor. r<sub>L</sub> both adds r<sub>L</sub>/2L to α and shares the DC current with R.', hint: 'Look at the inductor label on the bench.' });
  mcq('d4', '#d4Q', { id: 'd4q6', q: 'What do the initial conditions change?', opts: ['α and ω<sub>0</sub>', 'The final value', 'Only the coefficients (the path of the curve); the roots and the final value stay the same', 'The type of the response'], correct: 2, explain: 'The roots depend only on R, L, C; the final value depends only on the source.', hint: 'Where do all the stored traces go?' });

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
    const img = (c, w = 48) => { try { return `<img src="${c.toDataURL()}" style="width:${w}%;border:1px solid #ccc">`; } catch (e) { return ''; } };
    const tab = (id) => `<table class="data"><thead>${$('#' + id + ' thead').innerHTML}</thead><tbody>${$('#' + id + ' tbody').innerHTML}</tbody></table>`;
    const html = `
      <h2 style="margin:0">Circuit Theory I · Virtual Lab · Week 13 Report</h2>
      <p><b>Topic:</b> Parallel RLC step response — three damping types, overshoot and settling, design, initial conditions</p>
      <table class="data" style="width:auto"><tr><th>Full name</th><td class="l">${S.st.name || ''}</td><th>ID</th><td class="l">${S.st.no || ''}</td><th>Group</th><td class="l">${S.st.group || ''}</td><th>Date</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Summary</h3>
      <p>Lab-sheet steps completed: <b>${sOk}/${sTot}</b> · Correct answers: <b>${ok}/${tot}</b> · Score: <b>${Math.round((50 * sOk) / sTot + (50 * ok) / tot)}/100</b></p>
      <h3>Answers</h3>
      <table class="data"><thead><tr><th>Section</th><th>Question</th><th>Answer</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Experiment 1 · Step response measurements</h3>${tab('d1tab')}
      <h3>Experiment 2 · Cursor measurements</h3>${tab('d2tab')}
      <h3>Experiment 3 · Design</h3>${tab('d3tab')}
      <h3>Experiment 4 · Initial conditions</h3>${tab('d4tab')}
      <h3>Plots</h3>
      <div>${img($('#d1plotI'))} ${img($('#d1plotV'))}</div>
      <div>${img($('#d2scope'))} ${img(D3.plotCanvas)}</div>
      <div>${img(D4.plotCanvas, 60)}</div>
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
    if (e.key === 'r' || e.key === 'R') { const m = { d1: D1, d2: D2, d3: D3, d4: D4 }[S.page]; if (m) m.rec(); }
  });

  const MODS = { d1: D1, d2: D2, d3: D3, d4: D4 };
  function loop() {
    const m = MODS[S.page];
    if (m) { m.update(); evalSteps(S.page); }
    requestAnimationFrame(loop);
  }
  ['d1', 'd2', 'd3', 'd4'].forEach(evalSteps);
  go(S.page); progress(); loop();
})();

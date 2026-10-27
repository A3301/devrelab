/* Devre Kuramı I · Hafta 5 — İndüktör (Bobin) */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd1h05';
  const S = Object.assign({ answers: {}, steps: {}, d1rows: [], d2rows: [], d3rows: [], d4rows: [], st: {}, page: 'giris' }, Lab.store.load(KEY));
  if (S.Lx == null) S.Lx = (28 + Math.random() * 44) * 1e-3;
  if (S.Rx == null) S.Rx = 2.5 + Math.random() * 5;
  Lab.answers = S.answers;
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => Lab.store.save(KEY, S), 300); };
  Lab.onAnswer = () => { save(); progress(); };
  const near = (a, b, t) => Math.abs(a - b) <= t;
  const TAU = 2 * Math.PI;

  // bobinler (R: 20 °C sargı direnci, Cp: sargı kapasitesi)
  const COILS = [
    { n: '1 mH', L: 1e-3, R: 0.4, Cp: 5e-12 },
    { n: '10 mH', L: 10e-3, R: 2.1, Cp: 8e-12 },
    { n: '47 mH', L: 47e-3, R: 8.5, Cp: 15e-12 },
    { n: '100 mH / 6 Ω', L: 0.1, R: 6, Cp: 40e-12 },
    { n: 'Inductor X', L: S.Lx, R: S.Rx, Cp: 25e-12, x: true },
  ];
  const IX = 4, I100 = 3;

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
  function segs(parent, list, cur, onPick) {
    const d = document.createElement('div'); d.className = 'row'; d.style.cssText = 'gap:4px;margin-bottom:4px;flex-wrap:wrap';
    d.innerHTML = list.map(([k, t]) => `<button class="seg-btn${k === cur ? ' on' : ''}" data-k="${k}">${t}</button>`).join('');
    parent.appendChild(d);
    $$('button', d).forEach((b) => (b.onclick = () => { $$('button', d).forEach((x) => x.classList.toggle('on', x === b)); onPick(b.dataset.k); }));
    return d;
  }

  /* ---------- şema yardımcıları ---------- */
  const sch = {
    w: (g, pts) => E('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'w' }, g),
    dot: (g, x, y) => E('circle', { cx: x, cy: y, r: 3.5, class: 'node' }, g),
    t: (g, x, y, s, cls = 'lbl', anchor = 'middle') => { const e = E('text', { x, y, class: cls, 'text-anchor': anchor }, g); e.innerHTML = s; return e; },
    rH(g, x1, x2, y) { const n = 6, L = 8, step = (x2 - x1 - 2 * L) / n; let d = `M${x1},${y} h${L}`; for (let i = 0; i < n; i++) d += ` l${step / 2},${i % 2 ? 7 : -7} l${step / 2},${i % 2 ? -7 : 7}`; d += ` L${x2},${y}`; E('path', { d, class: 'w' }, g); },
    rV(g, x, y1, y2) { const n = 6, L = 8, step = (y2 - y1 - 2 * L) / n; let d = `M${x},${y1} v${L}`; for (let i = 0; i < n; i++) d += ` l${i % 2 ? 7 : -7},${step / 2} l${i % 2 ? -7 : 7},${step / 2}`; d += ` L${x},${y2}`; E('path', { d, class: 'w' }, g); },
    lV(g, x, y1, y2) { const n = 4, L = 8, s = (y2 - y1 - 2 * L) / n; let d = `M${x},${y1} v${L}`; for (let i = 0; i < n; i++) d += ` a${s / 2},${s / 2} 0 0 1 0,${s}`; d += ` L${x},${y2}`; E('path', { d, class: 'w' }, g); },
    lH(g, x1, x2, y) { const n = 4, L = 8, s = (x2 - x1 - 2 * L) / n; let d = `M${x1},${y} h${L}`; for (let i = 0; i < n; i++) d += ` a${s / 2},${s / 2} 0 0 1 ${s},0`; d += ` L${x2},${y}`; E('path', { d, class: 'w' }, g); },
    gnd(g, x, y) { E('path', { d: `M${x},${y} v8 M${x - 11},${y + 8} h22 M${x - 7},${y + 13} h14 M${x - 3},${y + 18} h6`, class: 'w' }, g); },
    src(g, x, y, r = 20, kind = 'dc') {
      E('circle', { cx: x, cy: y, r, class: 'w', fill: '#fff' }, g);
      if (kind === 'ac') E('path', { d: `M${x - 10},${y} q5,-12 10,0 t10,0`, class: 'w' }, g);
      else if (kind === 'i') E('path', { d: `M${x},${y + 11} V${y - 11} m-6,7 l6,-7 l6,7`, class: 'w' }, g);
      else { sch.t(g, x, y - 4, '+', 'lbl'); sch.t(g, x, y + 13, '−', 'lbl'); }
    },
    term(g, x, y) { E('circle', { cx: x, cy: y, r: 4.5, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g); },
    diodeV(g, x, y1, y2, up = true) { // katot yukarıda (up) — anot aşağıda
      const m = (y1 + y2) / 2; sch.w(g, [[x, y1], [x, m - 10]]); sch.w(g, [[x, m + 10], [x, y2]]);
      if (up) E('path', { d: `M${x - 10},${m + 10} h20 l-10,-18 z M${x - 10},${m - 10} h20`, class: 'w', fill: '#fff' }, g);
      else E('path', { d: `M${x - 10},${m - 10} h20 l-10,18 z M${x - 10},${m + 10} h20`, class: 'w', fill: '#fff' }, g);
    },
  };

  /* ---------- osiloskop ---------- */
  const VDIV = [1e-3, 2e-3, 5e-3, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200];
  const TDIV = [1e-6, 2e-6, 5e-6, 1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2, 2e-2];
  const pick = (L, x) => L.find((v) => v >= x) || L[L.length - 1];
  function makeScope(box, id, o) {
    box.innerHTML = `<div class="inst dark scopewrap" style="flex:1;min-width:420px"><div class="brand"><span>DSO-2C · Digital Oscilloscope</span><span><span class="led on g"></span> ${o.mode || 'RUN'}</span></div>
      <div class="row" style="align-items:flex-start;flex-wrap:nowrap"><canvas id="${id}" width="640" height="400" style="width:100%;max-width:640px"></canvas>
      <div style="min-width:150px"><div class="ctrls" id="${id}Knobs"></div><div class="row" style="margin:6px 0" id="${id}Btns"></div><div class="meas" id="${id}Meas"></div></div></div></div>`;
    const scope = new Lab.Scope($('#' + id)), sk = $('#' + id + 'Knobs'), ch = o.onChange;
    const k1 = new Lab.Knob(sk, { label: 'CH1 V/div', list: VDIV, value: o.v1, dark: true, size: 44, fmt: (v) => eng(v, 'V'), onChange: (v) => { scope.ch[0].vdiv = v; ch(); } });
    const k2 = new Lab.Knob(sk, { label: 'CH2 V/div', list: VDIV, value: o.v2, dark: true, size: 44, fmt: (v) => eng(v, 'V'), onChange: (v) => { scope.ch[1].vdiv = v; ch(); } });
    const kt = new Lab.Knob(sk, { label: 'TIME/div', list: TDIV, value: o.t, dark: true, size: 44, fmt: (v) => eng(v, 's'), onChange: (v) => { scope.tdiv = v; ch(); } });
    scope.ch[0].vdiv = o.v1; scope.ch[1].vdiv = o.v2; scope.tdiv = o.t;
    if (o.names) { scope.ch[0].name = o.names[0]; scope.ch[1].name = o.names[1]; }
    const bx = $('#' + id + 'Btns'), self = { scope, k1, k2, kt, math: false };
    const btn = (t, on, f) => { const b = document.createElement('button'); b.className = 'seg-btn' + (on ? ' on' : ''); b.textContent = t; b.onclick = () => { f(); b.classList.toggle('on'); ch(); }; bx.appendChild(b); return b; };
    btn('CH1', true, () => (scope.ch[0].on = !scope.ch[0].on));
    btn('CH2', true, () => (scope.ch[1].on = !scope.ch[1].on));
    if (o.mathBtn) btn('MATH 2−1', false, () => (self.math = !self.math));
    btn('CURSOR', false, () => (scope.cur.on = !scope.cur.on));
    if (o.auto) {
      const a = document.createElement('button'); a.className = 'seg-btn'; a.textContent = 'AUTO'; bx.appendChild(a);
      a.onclick = () => { const r = o.auto(); kt.set(pick(TDIV, r.t)); k1.set(pick(VDIV, r.v1)); k2.set(pick(VDIV, r.v2)); };
    }
    const meas = $('#' + id + 'Meas'), lab2 = () => (self.math ? 'MATH' : 'CH2');
    self.show = (m) => {
      if (!m) return;
      const [a, b] = m.ch;
      let h = `<span style="color:#f2d21b">CH1</span> Vpp ${eng(a.vpp, 'V')}<br>f ${isFinite(a.f) ? eng(a.f, 'Hz') : '—'}<br><span style="color:#27c4f0">${lab2()}</span> Vpp ${eng(b.vpp, 'V')}<br>max ${eng(b.max, 'V')} · min ${eng(b.min, 'V')}`;
      if (m.cur) h += `<br><span style="color:#ff7cf0">CURSOR</span> Δt ${eng(m.cur.dt, 's')}<br>CH1 ΔV/Δt ${eng((m.cur.v1b - m.cur.v1a) / m.cur.dt, 'V/s')}<br>${lab2()} ΔV/Δt ${eng((m.cur.v2b - m.cur.v2a) / m.cur.dt, 'V/s')}`;
      meas.innerHTML = h;
    };
    $('#' + id).addEventListener('pointermove', () => scope.cur.drag && self.show(scope.measure()));
    return self;
  }

  /* ================= GEZİNME / İLERLEME ================= */
  const pages = ['giris', 'onbilgi', 'onhaz', 'd1', 'd2', 'd3', 'd4', 'rapor'];
  function go(p) {
    S.page = p; save();
    $$('section.page').forEach((s) => s.classList.toggle('active', s.id === p));
    $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.p === p));
    if (p === 'd1') D1.dirty = true;
    if (p === 'd2') D2.dirty = true;
    if (p === 'd4') D4.dirty = true;
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
      if (!S.steps[id] && s.test()) { S.steps[id] = true; save(); Lab.toast('✔ Step completed: ' + s.t.replace(/<[^>]+>/g, '').slice(0, 70)); progress(); }
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
  mcq('onhaz', '#preQ', { id: 'p1', q: '1) A constant 5 A direct current flows through an ideal inductor with L = 2 H. What is the voltage across the inductor in volts?', opts: ['10 V', '0 V', '2.5 V', 'Infinite'], correct: 1, explain: 'The derivative of a constant is zero: v = L·0 = 0. The answer 10 V comes from the mistake v = L·i.', hint: 'Is the voltage set by the value of the current or by its rate of change?' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) Example 2.1: the current of an L = 200 mH inductor rises linearly from 0 to 3 A in 6 ms. What is the inductor voltage in this interval, in volts?', answer: 100, tol: 1, unit: 'V', explain: 'di/dt = 3/0.006 = 500 A/s; v = 0.2 × 500 = 100 V, constant throughout the interval.', hint: 'Convert mH to H and ms to s.' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) How many joules are stored in the same inductor at t = 6 ms?', answer: 0.9, tol: 1, unit: 'J', explain: 'w = ½(0.2)(3)² = 0.9 J.', hint: 'w = ½Li²' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) An L = 20 mH inductor carries 0.5 A and the current falls to zero within 1 µs. What is the inductor voltage in volts?', answer: -10000, tol: 1, unit: 'V', explain: 'di/dt = −0.5/10<sup>−6</sup> = −5·10<sup>5</sup> A/s; v = 0.02 × (−5·10<sup>5</sup>) = −10 000 V: an arc forms at the contact.', hint: 'Watch the sign: the current is decreasing.' });
  mcq('onhaz', '#preQ', { id: 'p5', q: '5) For an inductor (passive reference) i = −2 A and v = +3 V are measured. What is the inductor doing at this instant?', opts: ['Absorbing energy', 'Delivering energy', 'Neither absorbing nor delivering', 'Stored energy is negative'], correct: 1, explain: 'p = (3)(−2) = −6 W &lt; 0: the magnitude of the current is decreasing, the inductor delivers energy. The energy ½L(−2)² &gt; 0, it is only decreasing.', hint: 'Sign of p = vi.' });
  numq('onhaz', '#preQ', { id: 'p6', q: '6) Example 2.7: a real inductor with L = 100 mH, R = 6 Ω connected to a 12 V DC source is in steady state. What is the heat power dissipated in the winding, in W?', answer: 24, tol: 1, unit: 'W', explain: 'In steady state v<sub>L</sub> = 0, I = 12/6 = 2 A, P = I²R = 24 W.', hint: 'At DC an ideal L is a short circuit.' });

  /* ================= DENEY 1 · v = L di/dt ================= */
  const RSER = [100, 220, 470, 1e3, 2.2e3, 4.7e3];
  const wave = (k, x) => { const ph = x - Math.floor(x); if (k === 'sq') return ph < 0.5 ? 1 : -1; if (k === 'tri') return ph < 0.25 ? 4 * ph : ph < 0.75 ? 2 - 4 * ph : 4 * ph - 4; return Math.sin(TAU * x); };
  const D1 = (() => {
    const box = $('#d1inst'), self = { dirty: true, wave: S.d1w || 'tri' };
    const set = () => (self.dirty = true);
    const fg = inst(box, 'FG-100 FUNCTION GENERATOR', true, '50 Ω'); const fgL = lcd(fg.el, 'FREQUENCY · AMPLITUDE', '', 200);
    segs(fg.el, [['sin', '∿ Sine'], ['tri', '△ Triangle'], ['sq', '⊓ Square']], self.wave, (k) => { self.wave = S.d1w = k; save(); set(); });
    fg.el.appendChild(fg.c);
    const kf = new Lab.Knob(fg.c, { label: 'Frequency', min: 50, max: 5e4, log: true, value: S.d1f ?? 1000, dark: true, fmt: (v) => eng(v, 'Hz'), onChange: (v) => { S.d1f = v; save(); set(); } });
    const ka = new Lab.Knob(fg.c, { label: 'Amplitude', min: 0.1, max: 20, log: true, value: S.d1a ?? 10, dark: true, fmt: (v) => eng(v, 'Vpp'), onChange: (v) => { S.d1a = v; save(); set(); } });
    const pb = inst(box, 'CIRCUIT BOARD', false);
    const kr = new Lab.Knob(pb.c, { label: 'R_series', list: RSER, value: S.d1r ?? 1e3, fmt: Lab.ohm, onChange: (v) => { S.d1r = v; save(); set(); } });
    const kc = new Lab.Knob(pb.c, { label: 'Inductor', list: [0, 1, 2, 3, 4], value: S.d1c ?? 1, fmt: (i) => COILS[i].n, onChange: (v) => { S.d1c = v; save(); set(); } });
    const sc = makeScope($('#d1scopeBox'), 'd1scope', {
      v1: 0.05, v2: 5, t: 2e-4, mathBtn: true, onChange: set,
      auto: () => { const m = self.measure(); return { t: 2.5 / kf.value / 10, v1: m.ipp * 10 / 6, v2: (sc.math ? m.vLpp : m.vApp) / 6 }; },
    });
    const g = $('#d1sch');
    sch.src(g, 60, 150, 20, 'ac'); sch.w(g, [[60, 170], [60, 200]]); sch.gnd(g, 60, 200); sch.w(g, [[60, 130], [60, 80], [120, 80]]);
    sch.rH(g, 120, 220, 80); sch.w(g, [[220, 80], [340, 80]]); sch.lH(g, 340, 460, 80); sch.w(g, [[460, 80], [560, 80]]); sch.rV(g, 560, 80, 180); sch.gnd(g, 560, 180);
    sch.dot(g, 300, 80); sch.w(g, [[300, 80], [300, 50]]); sch.term(g, 300, 46); sch.t(g, 300, 34, 'CH2 (A)').style.fill = '#1592b8';
    sch.dot(g, 500, 80); sch.w(g, [[500, 80], [500, 50]]); sch.term(g, 500, 46); sch.t(g, 500, 34, 'CH1 (B)').style.fill = '#b8960a';
    sch.t(g, 580, 135, '10 Ω shunt', 'lbl', 'start');
    const tR = sch.t(g, 170, 65, ''), tC = sch.t(g, 400, 65, ''), tGen = sch.t(g, 90, 210, '', 'val', 'start');
    sch.t(g, 400, 110, 'v<tspan font-size="10" dy="3">L</tspan><tspan dy="-3"> = v</tspan><tspan font-size="10" dy="3">A</tspan><tspan dy="-3"> − v</tspan><tspan font-size="10" dy="3">B</tspan>', 'val');
    sch.t(g, 640, 210, 'oscilloscope grounds ⏚', 'lbl').setAttribute('style', 'font-size:11px;fill:#777');

    function sim(times) {
      const c = COILS[kc.value], f = kf.value, T = 1 / f, Vm = ka.value / 2, Rp = 50 + kr.value, Rt = Rp + c.R + 10, L = c.L, tau = L / Rt;
      const n = times.length, ts = -Math.ceil(Math.max(3 * T, 8 * tau) / T) * T;
      let h = Math.min(T / 1000, n > 1 ? (times[n - 1] - times[0]) / (n - 1) : T / 1000);
      if ((times[n - 1] - ts) / h > 3e5) h = (times[n - 1] - ts) / 3e5;
      const vf = (t) => Vm * wave(self.wave, f * t);
      let i = 0, t = ts;
      const y1 = new Float64Array(n), yA = new Float64Array(n), yL = new Float64Array(n);
      for (let k = 0; k < n; k++) {
        const tg = times[k];
        while (tg - t > h * 1e-6) { const hh = Math.min(h, tg - t), v = vf(t + hh / 2), e = Math.exp(-hh / tau); i = v / Rt + (i - v / Rt) * e; t += hh; }
        const vA = vf(tg) - Rp * i; y1[k] = 10 * i; yA[k] = vA; yL[k] = vA - 10 * i;
      }
      return { y1, yA, yL };
    }
    self.measure = () => {
      const T = 1 / kf.value, n = 2000, times = []; for (let k = 0; k < n; k++) times.push((k * 2 * T) / n);
      const r = sim(times), pp = (a) => Math.max(...a) - Math.min(...a);
      return { coil: kc.value, w: self.wave, f: kf.value, ipp: pp(r.y1) / 10, vLpp: pp(r.yL), vApp: pp(r.yA) };
    };
    self.update = () => {
      if (!self.dirty) return; self.dirty = false;
      fgL(`${eng(kf.value, 'Hz')} · ${eng(ka.value, 'Vpp')}`);
      tR.textContent = 'R_series = ' + Lab.ohm(kr.value); tC.textContent = 'L: ' + COILS[kc.value].n;
      tGen.textContent = { sin: 'sine', tri: 'triangle', sq: 'square' }[self.wave] + ' · ' + eng(kf.value, 'Hz') + ' · ' + eng(ka.value, 'Vpp');
      const n = 1000, T = sc.scope.tdiv * 10, times = []; for (let k = 0; k < n; k++) times.push((k * T) / (n - 1));
      const r = sim(times);
      sc.scope.draw({ n, y: [r.y1, sc.math ? r.yL : r.yA] }); sc.show(sc.scope.measure());
    };
    const plot = new Lab.Plot($('#d1plot'), { xlabel: '4 f i_pp  (A/s)', ylabel: 'v_L,pp  (V)' });
    const COL = ['#888', '#0b5cad', '#1a8a4a', '#7b3fb5', '#c62828'];
    function drawPlot() {
      const R = S.d1rows.filter((r) => r.w === 'tri'), xm = Math.max(1, ...R.map((r) => 4 * r.f * r.ipp)) * 1.1;
      const ser = [];
      if ($('#d1theo').checked) [...new Set(R.map((r) => r.coil).concat([kc.value]))].filter((c) => !COILS[c].x).forEach((c) => ser.push({ pts: [[0, 0], [xm, COILS[c].L * xm]], line: true, color: COL[c], dash: [6, 4], width: 1.2 }));
      [...new Set(R.map((r) => r.coil))].forEach((c) => ser.push({ pts: R.filter((r) => r.coil === c).map((r) => [4 * r.f * r.ipp, r.vLpp]), dots: true, color: COL[c] }));
      plot.draw(ser, [0, xm], null);
    }
    $('#d1theo').onchange = drawPlot;
    const tbody = $('#d1tab tbody');
    function table() { tbody.innerHTML = S.d1rows.map((r, i) => `<tr><td>${i + 1}</td><td>${COILS[r.coil].n}</td><td>${{ sin: 'sine', tri: 'triangle', sq: 'square' }[r.w]}</td><td>${num(r.f, 0)}</td><td>${num(r.ipp * 1e3, 2)}</td><td>${num(r.vLpp, 3)}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; drawPlot(); }
    self.rec = () => { const m = self.measure(); S.d1rows.push(m); save(); table(); Lab.toast(`Recorded: i_pp = ${num(m.ipp * 1e3, 2)} mA, v_L,pp = ${num(m.vLpp, 3)} V`); };
    $('#d1rec').onclick = self.rec;
    $('#d1del').onclick = () => { S.d1rows.pop(); save(); table(); };
    $('#d1csv').onclick = () => Lab.downloadCSV('hafta5_deney1.csv', ['#', 'inductor', 'wave', 'f (Hz)', 'ipp (A)', 'vLpp (V)'], S.d1rows.map((r, i) => [i + 1, COILS[r.coil].n, r.w, +r.f.toFixed(2), +r.ipp.toFixed(6), +r.vLpp.toFixed(4)]));
    table();
    Object.assign(self, { kf, ka, kr, kc, sc, plotCanvas: $('#d1plot') });
    return self;
  })();
  steps('d1', [
    { t: 'Set the generator to <b>triangle, 1 kHz, 10 Vpp</b>; R<sub>series</sub> = <b>1 kΩ</b>, inductor <b>10 mH</b>. See on CH1 (shunt) that the current is triangular (AUTO helps).', test: () => D1.wave === 'tri' && near(D1.kf.value, 1000, 50) && near(D1.ka.value, 10, 0.5) && D1.kr.value === 1e3 && D1.kc.value === 1 },
    { t: 'Turn on <b>MATH 2−1</b>: is the inductor voltage (CH2 − CH1) a <b>square</b> wave? Reduce CH2 V/div and look at the slight slope of the flat part of the square.', test: () => D1.sc.math && D1.wave === 'tri' },
    { t: 'Turn on the <b>CURSOR</b>s, place them on a rising edge of CH1 and read di/dt (ΔV/Δt ÷ 10 Ω). Compare with the height of the square: v = L di/dt.', test: () => D1.sc.math && D1.sc.scope.cur.on },
    { t: 'Fit <b>Inductor X</b> and record with the triangle wave at <b>at least 3 different frequencies</b> (keep R<sub>series</sub> ≫ ωL).', test: () => new Set(S.d1rows.filter((r) => r.coil === IX && r.w === 'tri').map((r) => Math.round(r.f))).size >= 3 },
    { t: 'Switch the wave to <b>sine</b> (MATH on): how far does the inductor voltage lead the current?', test: () => D1.wave === 'sin' && D1.sc.math },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: 'From your records (v<sub>L,pp</sub> = 4 f L i<sub>pp</sub>), what is the inductance of inductor X in mH?', answer: () => S.Lx * 1e3, tol: 12, unit: 'mH', explain: 'The slope of the points on the plot is L. Your value comes out slightly high: the R<sub>L</sub>i term and the rounding of the current at the corners (τ = L/R<sub>total</sub>) increase the ratio v<sub>L,pp</sub>/i<sub>pp</sub>.', hint: 'L = v<sub>L,pp</sub> / (4 f i<sub>pp</sub>). Average the records with R<sub>series</sub> = 4.7 kΩ in the 0.5–2 kHz range.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'If the slope of the triangular current in a 10 mH inductor is 200 A/s, what is the peak value of the square voltage (in the + half period) in mV?', answer: 2000, tol: 1, unit: 'mV', explain: 'v = L di/dt = 0.01 × 200 = 2 V = 2000 mV.', hint: 'v = L × slope' });
  mcq('d1', '#d1Q', { id: 'd1q3', q: 'Why are the flat parts of the square not perfectly horizontal but slightly sloped?', opts: ['Oscilloscope error', 'In a real inductor v = L di/dt + R<sub>L</sub>i; the R<sub>L</sub>i term varies with the triangular current', 'The shunt resistor is heating up', 'The generator amplitude is changing'], correct: 1, explain: 'We model the inductor as ideal L + series R<sub>L</sub> (Experiment 3).', hint: 'Is the resistance of the inductor wire zero?' });
  mcq('d1', '#d1Q', { id: 'd1q4', q: 'With a sinusoidal current, how is the inductor voltage related to the current?', opts: ['In phase', 'Leads by 90° (the derivative of sine is cosine)', 'Lags by 90°', '180° opposite'], correct: 1, explain: 'i = I<sub>m</sub> sin ωt ⇒ v = ωLI<sub>m</sub> cos ωt (Example 2.2). When the current is at its peak the voltage is zero.', hint: 'What is the slope when the current is at its peak?' });
  mcq('d1', '#d1Q', { id: 'd1q5', q: 'With R<sub>series</sub> = 100 Ω, inductor 100 mH, f = 5 kHz, the current is no longer triangular. Why?', opts: ['The inductor saturated', 'ωL ≈ 3 kΩ, much larger than R<sub>series</sub>: the inductor, not the resistor, sets the current, and the current follows the integral of the generator voltage rather than the voltage itself', 'The shunt has burned out', 'The frequency exceeded the generator’s limit'], correct: 1, explain: 'For the current to be triangular, R<sub>series</sub> ≫ ωL is required. Otherwise v<sub>fg</sub> ≈ L di/dt and the current behaves like the integral of the square voltage.', hint: 'Calculate ωL.' });

  /* ================= DENEY 2 · Akım profili ================= */
  const PRE = {
    ex21: { L: 0.2, Vc: 200, txt: '0 ; 0\n6 ; 3\n10 ; 3' },
    ex25a: { L: 0.02, Vc: 200, txt: '0 ; 0.5\n0.2 ; 0.5\n0.3 ; 0\n1 ; 0' },
    ex25b: { L: 0.02, Vc: 200, txt: '0 ; 0.5\n0.2 ; 0.5\n1.2 ; 0\n2 ; 0' },
    trap: { L: 0.5, Vc: 200, txt: '0 ; 0\n5 ; 2\n15 ; 2\n20 ; 0\n25 ; 0\n30 ; -1\n35 ; 0' },
  };
  const D2 = (() => {
    const box = $('#d2inst'), self = { dirty: true };
    const set = () => (self.dirty = true);
    const LL = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1];
    const cs = inst(box, 'PROGRAMMABLE CURRENT SOURCE', true, '<span class="led" id="d2lim"></span> COMPLIANCE LIMIT');
    const kv = new Lab.Knob(cs.c, { label: 'V_comp', list: [10, 20, 50, 100, 200, 500, 1000], value: S.d2Vc ?? 200, dark: true, fmt: (v) => '±' + v + ' V', onChange: (v) => { S.d2Vc = v; save(); set(); } });
    const bb = inst(box, 'INDUCTOR (ideal)', false);
    const kl = new Lab.Knob(bb.c, { label: 'L', list: LL, value: S.d2L ?? 0.2, fmt: (v) => eng(v, 'H'), onChange: (v) => { S.d2L = v; save(); set(); } });
    const cu = inst(box, 'MEASUREMENT INSTANT t*', true); const tL = lcd(cu.el, 't*', 'ms', 90);
    const kt = new Lab.Knob(cu.c, { label: 't* (ms)', min: 0, max: 50, step: 0.01, value: S.d2t ?? 6, dark: true, fmt: (v) => num(v, 2) + ' ms', onChange: (v) => { S.d2t = v; save(); set(); } });
    const mt = inst(box, 'MEASUREMENTS (at t*)', true);
    const L1 = lcd(mt.el, 'i', 'A', 110), L2 = lcd(mt.el, 'v', 'V', 110), L3 = lcd(mt.el, 'p = vi', 'W', 110), L4 = lcd(mt.el, 'w = ½Li²', 'J', 110), L5 = lcd(mt.el, '∫p dt', 'J', 110);
    const ta = $('#d2prof'); ta.value = S.d2txt || PRE.ex21.txt;
    function parse(txt) {
      const pts = [];
      txt.split(/\n/).forEach((ln) => { const p = ln.split(';'); if (p.length < 2) return; const t = Lab.parse(p[0]), i = Lab.parse(p[1]); if (isFinite(t) && isFinite(i) && t >= 0) pts.push([t, i]); });
      pts.sort((a, b) => a[0] - b[0]);
      return pts;
    }
    self.pts = parse(ta.value);
    const apply = () => { const p = parse(ta.value); if (p.length < 2) return Lab.toast('At least two valid lines are needed: t (ms) ; i (A)'); self.pts = p; S.d2txt = ta.value; save(); set(); };
    $('#d2apply').onclick = apply;
    $$('[data-pre]').forEach((b) => (b.onclick = () => { const p = PRE[b.dataset.pre]; ta.value = p.txt; kl.set(p.L); kv.set(p.Vc); apply(); }));
    const iref = (tm) => { // tm: ms
      const P = self.pts; if (tm <= P[0][0]) return P[0][1];
      for (let k = P.length - 1; k > 0; k--) if (tm >= P[k - 1][0] && tm <= P[k][0]) { if (P[k][0] === P[k - 1][0]) return P[k][1]; if (tm === P[k][0]) return P[k][1]; return P[k - 1][1] + ((P[k][1] - P[k - 1][1]) * (tm - P[k - 1][0])) / (P[k][0] - P[k - 1][0]); }
      return P[P.length - 1][1];
    };
    self.iref = iref;
    function sim() {
      const L = kl.value, Vc = kv.value, tEnd = Math.max(1, self.pts[self.pts.length - 1][0] * 1.1), N = 5000, h = tEnd / N; // ms
      const t = new Float64Array(N + 1), i = new Float64Array(N + 1), v = new Float64Array(N + 1), p = new Float64Array(N + 1), w = new Float64Array(N + 1), En = new Float64Array(N + 1);
      i[0] = iref(0); w[0] = 0.5 * L * i[0] ** 2; let lim = false; const dmax = (Vc / L) * h * 1e-3;
      for (let k = 1; k <= N; k++) {
        t[k] = k * h; const want = iref(t[k]) - i[k - 1], di = clamp(want, -dmax, dmax); if (Math.abs(want) > dmax * 1.0001) lim = true;
        i[k] = i[k - 1] + di; v[k] = (L * di) / (h * 1e-3); p[k] = v[k] * i[k]; w[k] = 0.5 * L * i[k] ** 2;
        En[k] = En[k - 1] + v[k] * 0.5 * (i[k] + i[k - 1]) * h * 1e-3;
      }
      v[0] = v[1]; p[0] = v[0] * i[0];
      return { t, i, v, p, w, En, N, h, lim, L };
    }
    const P4 = ['d2pi', 'd2pv', 'd2pp', 'd2pw'].map((id, k) => new Lab.Plot($('#' + id), { xlabel: 't (ms)', ylabel: ['i (A)', 'v (V)', 'p (W)', 'w (J)'][k] }));
    self.at = (r, tm) => { const k = clamp(Math.round(tm / r.h), 0, r.N); return { L: r.L, t: tm, i: r.i[k], v: r.v[k], p: r.p[k], w: r.w[k], E: r.En[k] }; };
    self.update = () => {
      if (!self.dirty) return; self.dirty = false;
      const r = (self.r = sim());
      if (r.lim) { self.limSeen = true; Lab.toast('The current source hit its compliance voltage: the required L·di/dt exceeds the limit, so the current cannot follow the profile.', 3500); }
      $('#d2lim').classList.toggle('on', r.lim);
      const tm = kt.value, a = self.at(r, tm);
      tL(num(tm, 2)); L1(num(a.i, 4)); L2(num(a.v, 2)); L3(num(a.p, 3)); L4(eng(a.w, '').trim()); L5(eng(a.E, '').trim());
      const arr = [r.i, r.v, r.p, r.w], col = ['#0b5cad', '#c62828', '#1a8a4a', '#7b3fb5'];
      P4.forEach((pl, k) => {
        const y = arr[k], pts = []; const step = Math.max(1, Math.floor(r.N / 1500));
        let mn = 0, mx = 0; for (let j = 0; j <= r.N; j++) { if (y[j] < mn) mn = y[j]; if (y[j] > mx) mx = y[j]; }
        for (let j = 0; j <= r.N; j += step) pts.push([r.t[j], y[j]]);
        if (mx - mn < 1e-12) { mx += 1; mn -= 1; } const pad = (mx - mn) * 0.08;
        pl.draw([{ pts: [[tm, mn - pad], [tm, mx + pad]], line: true, color: '#e07a10', dash: [4, 4], width: 1 }, { pts, line: true, color: col[k] }], [0, r.t[r.N]], [mn - pad, mx + pad]);
      });
    };
    const tbody = $('#d2tab tbody');
    function table() { tbody.innerHTML = S.d2rows.map((r, i) => `<tr><td>${i + 1}</td><td>${eng(r.L, 'H')}</td><td>${num(r.t, 2)}</td><td>${num(r.i, 4)}</td><td>${num(r.v, 2)}</td><td>${num(r.p, 3)}</td><td>${eng(r.w, '')}</td><td>${eng(r.E, '')}</td></tr>`).join(''); }
    self.rec = () => { self.dirty = true; self.update(); const a = self.at(self.r, kt.value); S.d2rows.push(a); save(); table(); Lab.toast(`Recorded: t* = ${num(a.t, 2)} ms, v = ${num(a.v, 2)} V`); };
    $('#d2rec').onclick = self.rec;
    $('#d2del').onclick = () => { S.d2rows.pop(); save(); table(); };
    $('#d2csv').onclick = () => Lab.downloadCSV('hafta5_deney2.csv', ['#', 'L (H)', 't (ms)', 'i (A)', 'v (V)', 'p (W)', 'w (J)', 'int p dt (J)'], S.d2rows.map((r, i) => [i + 1, r.L, r.t, r.i, r.v, r.p, r.w, r.E]));
    table();
    Object.assign(self, { kl, kv, kt, plotCanvas: $('#d2pv'), plotW: $('#d2pw') });
    return self;
  })();
  const isEx21 = () => D2.kl.value === 0.2 && Math.abs(D2.iref(0)) < 1e-9 && Math.abs(D2.iref(6) - 3) < 1e-6 && Math.abs(D2.iref(3) - 1.5) < 1e-6;
  steps('d2', [
    { t: 'Example 2.1: with <b>L = 200 mH</b>, enter the profile in which the current rises linearly <b>from 0 to 3 A in 6 ms</b> and press <b>Apply</b> (or the preset button). Look at the v(t) plot.', test: isEx21 },
    { t: 'Set <b>t* = 6 ms</b>; read and record i, v, p and w. Are ∫p dt and w the same?', test: () => S.d2rows.some((r) => r.L === 0.2 && near(r.t, 6, 0.02)) },
    { t: 'Build a <b>ramp–constant–zero</b> type profile (nonzero while the current is constant, zero at the end). What is the voltage while the current is constant?', test: () => { const P = D2.pts; return P.some((p, k) => k && p[1] === P[k - 1][1] && p[1] !== 0 && p[0] > P[k - 1][0]) && P[P.length - 1][1] === 0; } },
    { t: 'Example 2.5: with <b>L = 20 mH</b>, bring a 0.5 A current to zero in (a) <b>0.1 ms</b> and (b) <b>1 ms</b>; record once during each fall.', test: () => S.d2rows.some((r) => r.L === 0.02 && near(r.v, -100, 5)) && S.d2rows.some((r) => r.L === 0.02 && near(r.v, -10, 0.6)) },
    { t: 'Put a <b>jump</b> in the profile (two different currents at the same t) or lower the compliance voltage: what happens when the source hits its limit?', test: () => !!D2.limSeen },
    { t: 'Record at an instant when the current is <b>negative</b>: what is the sign of w? When is p negative?', test: () => S.d2rows.some((r) => r.i < -0.01) },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'Example 2.1: what is the instantaneous power at t = 6 ms, in W?', answer: 300, tol: 2, unit: 'W', explain: 'p = vi = 100 × 3 = 300 W: the instantaneous transfer rate. 0.9 J is the accumulated energy.', hint: 'Multiply v and i at the end of the ramp.' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'Example 2.1: what is ∫p dt over 0–6 ms, in J?', answer: 0.9, tol: 2, unit: 'J', explain: '∫50000 t dt = 25000(0.006)² = 0.9 J = ½Li²: check ✓.', hint: 'The last column of the table.' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 'Example 2.5(a): 0.5 A → 0 in 0.1 ms. What is the inductor voltage in volts?', answer: -100, tol: 2, unit: 'V', explain: 'v = 0.02 × (−0.5/10<sup>−4</sup>) = −100 V. In part (b), 10 times longer, 10 times smaller voltage: −10 V.', hint: 'Sign: the current is decreasing.' });
  numq('d2', '#d2Q', { id: 'd2q4', q: 'Example 2.5(a): what is the average power during the discharge, in W?', answer: 25, tol: 2, unit: 'W', explain: 'w<sub>0</sub> = ½(0.02)(0.5)² = 2.5 mJ; 2.5 mJ / 0.1 ms = 25 W. In (b), 2.5 W.', hint: 'Energy / time' });
  mcq('d2', '#d2Q', { id: 'd2q5', q: 'While the current is constant at 2 A (ramp–constant profile), what state is the inductor in?', opts: ['v = 0, w = constant; neither absorbing nor delivering', 'v = L·2, absorbing energy', 'v &lt; 0, delivering energy', 'w = 0'], correct: 0, explain: 'There is current but no voltage: at DC an ideal inductor is a short circuit. The energy is constant: ½L(2)².', hint: 'The slope is zero.' });
  mcq('d2', '#d2Q', { id: 'd2q6', q: 'Why is it impossible to bring the current to zero in zero time (a jump) in the profile?', opts: ['The source does not support it, there is no other reason', 'di/dt → ∞ requires infinite voltage; in practice the source hits its compliance limit, and an unprotected switch arcs', 'The inductor energy would become negative', 'Inductor current can jump'], correct: 1, explain: 'i<sub>L</sub>(0<sup>+</sup>) = i<sub>L</sub>(0<sup>−</sup>). You will see the consequences of this in Experiment 4.', hint: 'v = L di/dt, Δt → 0' });

  /* ================= DENEY 3 · Gerçek bobin ================= */
  const D3C = [I100, 1, IX];
  const RLEAD = 0.25, RTH = 6, CTH = 12, ACC = 4, TAMB = 20;
  const temp = { 3: TAMB, 1: TAMB, 4: TAMB };
  const Rt = (c) => COILS[c].R * (1 + 0.0039 * (temp[c] - TAMB));
  const D3 = (() => {
    const box = $('#d3inst'), self = { mode: S.d3mode || 'A', probe: 'open', rel: 0, relDone: false, on: false };
    const coil = () => D3C[kc.value];
    const mb = inst(box, 'CONNECTION', false);
    segs(mb.c, [['A', 'A · Ohmmeter'], ['B', 'B · DC supply'], ['C', 'C · AC measurement']], self.mode, (k) => { self.mode = S.d3mode = k; if (k !== 'B') self.on = false; save(); drawSch(); });
    const kc = new Lab.Knob(mb.c, { label: 'Inductor', list: [0, 1, 2], value: S.d3c ?? 2, fmt: (i) => COILS[D3C[i]].n, onChange: (v) => { S.d3c = v; save(); drawSch(); } });
    // ohmmetre
    const om = inst(box, 'DMM · Ω', false, 'REL'); const omL = lcd(om.el, 'Resistance', 'Ω', 120);
    segs(om.c, [['open', 'Open'], ['short', 'Short circuit'], ['coil', 'To inductor']], 'open', (k) => { self.probe = k; });
    const relB = document.createElement('button'); relB.className = 'seg-btn'; relB.textContent = 'REL'; om.c.appendChild(relB);
    relB.onclick = () => { if (self.mode !== 'A' || self.probe === 'open') return Lab.toast('For REL, short the probes (in mode A).'); self.rel = self.raw; self.relDone = self.probe === 'short'; relB.classList.add('on'); Lab.toast('REL: ' + num(self.rel, 3) + ' Ω taken as zero.'); };
    // DC kaynak
    const ps = inst(box, 'DC SUPPLY', true, '<span class="led" id="d3cc"></span> CC'); const psV = lcd(ps.el, 'V', 'V', 90), psA = lcd(ps.el, 'I (ammeter)', 'A', 110);
    const kv = new Lab.Knob(ps.c, { label: 'Voltage', min: 0, max: 15, step: 0.1, value: S.d3V ?? 12, dark: true, fmt: (v) => num(v, 1) + ' V', onChange: (v) => { S.d3V = v; save(); } });
    const ob = document.createElement('button'); ob.className = 'seg-btn'; ob.style.cssText = 'width:100px;padding:6px'; ps.c.appendChild(ob);
    ob.onclick = () => { if (self.mode !== 'B') return Lab.toast('First select the B · DC supply connection.'); self.on = !self.on; };
    const ir = inst(box, 'IR THERMOMETER', false, 'time ×' + ACC); const irL = lcd(ir.el, 'Inductor surface', '°C', 90);
    // AC
    const fg = inst(box, 'FG + AC VOLTMETER', true, 'true RMS'); const vR = lcd(fg.el, 'V<sub>R</sub> (100 Ω)', 'V', 110), vL = lcd(fg.el, 'V<sub>L</sub> (inductor)', 'V', 110);
    const kf = new Lab.Knob(fg.c, { label: 'Frequency', min: 20, max: 2e5, log: true, value: S.d3f ?? 1000, dark: true, fmt: (v) => eng(v, 'Hz'), onChange: (v) => { S.d3f = v; save(); } });
    const ka = new Lab.Knob(fg.c, { label: 'Amplitude', min: 1, max: 10, step: 0.1, value: S.d3a ?? 5, dark: true, fmt: (v) => num(v, 1) + ' Vpp', onChange: (v) => { S.d3a = v; save(); } });

    const g = $('#d3sch'); let tLbl, tVal;
    function coilSym(x, y1, y2) { sch.lV(g, x, y1, y1 + 60); sch.rV(g, x, y1 + 60, y2); E('rect', { x: x - 26, y: y1 - 4, width: 52, height: y2 - y1 + 8, fill: 'none', stroke: '#e07a10', 'stroke-dasharray': '4 3', rx: 6 }, g); }
    function drawSch() {
      g.innerHTML = ''; const c = COILS[coil()];
      if (self.mode === 'A') {
        coilSym(380, 50, 170); sch.w(g, [[380, 50], [380, 30], [250, 30]]); sch.w(g, [[380, 170], [380, 195], [250, 195]]);
        E('rect', { x: 170, y: 60, width: 80, height: 110, rx: 8, fill: '#f6f8fb', stroke: '#222' }, g); sch.t(g, 210, 120, 'Ω'); sch.w(g, [[250, 30], [210, 30], [210, 60]]); sch.w(g, [[250, 195], [210, 195], [210, 170]]);
      } else if (self.mode === 'B') {
        sch.src(g, 120, 115); sch.w(g, [[120, 95], [120, 40], [250, 40]]); E('circle', { cx: 270, cy: 40, r: 18, class: 'w', fill: '#fff' }, g); sch.t(g, 270, 45, 'A');
        sch.w(g, [[288, 40], [380, 40], [380, 50]]); coilSym(380, 50, 170); sch.w(g, [[380, 170], [380, 195], [120, 195], [120, 135]]); sch.gnd(g, 120, 195);
      } else {
        sch.src(g, 80, 115, 20, 'ac'); sch.w(g, [[80, 95], [80, 40], [130, 40]]); sch.rH(g, 130, 200, 40); sch.t(g, 165, 25, '50 Ω (generator)', 'lbl').style.fontSize = '11px';
        sch.w(g, [[200, 40], [230, 40]]); sch.rH(g, 230, 330, 40); sch.t(g, 280, 25, '100 Ω ref.'); sch.w(g, [[330, 40], [380, 40], [380, 50]]);
        coilSym(380, 50, 170); sch.w(g, [[380, 170], [380, 195], [80, 195], [80, 135]]); sch.gnd(g, 80, 195);
        E('path', { d: 'M260,60 l0,14 M300,60 l0,14', class: 'w', stroke: '#1592b8' }, g); sch.t(g, 280, 88, 'V<tspan font-size="10" dy="3">R</tspan>', 'val');
        sch.t(g, 440, 120, 'V<tspan font-size="10" dy="3">L</tspan>', 'val', 'start');
        E('path', { d: 'M440,55 h25 M465,55 v110 M440,165 h25', class: 'w', stroke: '#1592b8', 'stroke-dasharray': '3 3' }, g);
        sch.t(g, 600, 120, 'C<tspan font-size="10" dy="3">p</tspan><tspan dy="-3"> (winding capacitance) hidden</tspan>', 'lbl').style.fontSize = '11px';
      }
      sch.t(g, 380, 222, 'real inductor: L + R<tspan font-size="10" dy="3">L</tspan>', 'lbl').style.fill = '#e07a10';
      tLbl = sch.t(g, 410, 100, c.n, 'lbl', 'start'); tVal = sch.t(g, 600, 30, '', 'val');
    }
    drawSch();
    const cplx = { mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]], div: (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; }, abs: (a) => Math.hypot(a[0], a[1]) };
    self.ac = (f) => {
      const c = COILS[coil()], w = TAU * f, Zs = [Rt(coil()), w * c.L], Yc = [0, w * c.Cp];
      const Zc = cplx.div([1, 0], [cplx.div([1, 0], Zs)[0] + Yc[0], cplx.div([1, 0], Zs)[1] + Yc[1]]);
      const Zt = [150 + Zc[0], Zc[1]], I = cplx.div([ka.value / 2 / Math.SQRT2, 0], Zt);
      return { VR: cplx.abs(I) * 100, VL: cplx.abs(cplx.mul(I, Zc)) };
    };
    let last = performance.now();
    self.update = () => {
      const now = performance.now(), dt = Math.min(0.2, (now - last) / 1000) * ACC; last = now;
      const c = coil();
      // ısıl model: tüm bobinler soğur, beslenen ısınır
      let I = 0, cc = false;
      if (self.mode === 'B' && self.on) { I = kv.value / (Rt(c) + 0.05); if (I > 3) { I = 3; cc = true; } }
      Object.keys(temp).forEach((k) => { const P = +k === c ? I * I * Rt(c) : 0; temp[k] += ((P - (temp[k] - TAMB) / RTH) / CTH) * dt; });
      if (c === I100 && temp[c] > 45 && self.on) self.hot = true;
      if (temp[c] > 100 && !self.warned) { self.warned = true; Lab.toast('⚠ The inductor exceeded 100 °C: the varnish insulation may be damaged. Turn off the supply!', 5000); }
      if (temp[c] < 90) self.warned = false;
      psV(num(self.on ? (cc ? I * (Rt(c) + 0.05) : kv.value) : 0, 2)); psA(num(I, 3)); irL(num(temp[c], 1));
      $('#d3cc').classList.toggle('on', cc); ob.textContent = self.on ? 'OUTPUT ON' : 'OUTPUT OFF'; ob.classList.toggle('on', self.on);
      // ohmmetre
      self.raw = self.mode !== 'A' || self.probe === 'open' ? NaN : self.probe === 'short' ? RLEAD : Rt(c) + RLEAD;
      omL(isFinite(self.raw) ? num(self.raw - self.rel, 3) : 'OL');
      const a = self.mode === 'C' ? self.ac(kf.value) : { VR: 0, VL: 0 };
      vR(num(a.VR, 4)); vL(num(a.VL, 4));
      tVal.textContent = self.mode === 'A' ? 'Ω measurement' : self.mode === 'B' ? 'I = ' + num(I, 3) + ' A · ' + num(temp[c], 1) + ' °C' : 'f = ' + eng(kf.value, 'Hz');
      self.I = I;
    };
    const plot = new Lab.Plot($('#d3plot'), { xlabel: 'log10 f (Hz)', ylabel: '|Z| (Ω, log10)' });
    const COL = { 3: '#7b3fb5', 1: '#1a8a4a', 4: '#c62828' };
    function drawPlot() {
      const ser = [];
      if ($('#d3theo').checked) [...new Set(S.d3rows.map((r) => r.coil).concat([coil()]))].forEach((c) => { const pts = []; for (let x = 1.3; x <= 5.31; x += 0.02) { const w = TAU * Math.pow(10, x); pts.push([x, Math.log10(Math.hypot(COILS[c].R, w * COILS[c].L))]); } ser.push({ pts, line: true, dash: [5, 4], color: COL[c], width: 1.2 }); });
      [...new Set(S.d3rows.map((r) => r.coil))].forEach((c) => ser.push({ pts: S.d3rows.filter((r) => r.coil === c).map((r) => [Math.log10(r.f), Math.log10(r.VL / (r.VR / 100))]), dots: true, color: COL[c] }));
      plot.draw(ser, [1.2, 5.4], null);
    }
    $('#d3theo').onchange = drawPlot;
    const tbody = $('#d3tab tbody');
    function table() { tbody.innerHTML = S.d3rows.map((r, i) => `<tr><td>${i + 1}</td><td>${COILS[r.coil].n}</td><td>${num(r.f, 1)}</td><td>${num(r.VR, 4)}</td><td>${num(r.VL, 4)}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; drawPlot(); }
    self.rec = () => { if (self.mode !== 'C') return Lab.toast('For an AC record, select the C · AC measurement connection.'); const a = self.ac(kf.value); S.d3rows.push({ coil: coil(), f: kf.value, VR: a.VR, VL: a.VL }); save(); table(); Lab.toast(`Recorded: f = ${eng(kf.value, 'Hz')}, V_R = ${num(a.VR, 4)} V, V_L = ${num(a.VL, 4)} V`); };
    $('#d3rec').onclick = self.rec;
    $('#d3del').onclick = () => { S.d3rows.pop(); save(); table(); };
    $('#d3csv').onclick = () => Lab.downloadCSV('hafta5_deney3.csv', ['#', 'inductor', 'f (Hz)', 'VR (V rms)', 'VL (V rms)'], S.d3rows.map((r, i) => [i + 1, COILS[r.coil].n, +r.f.toFixed(2), +r.VR.toFixed(5), +r.VL.toFixed(5)]));
    table();
    Object.assign(self, { kc, kv, kf, coil, plotCanvas: $('#d3plot') });
    return self;
  })();
  steps('d3', [
    { t: 'In mode A, <b>short</b> the probes and look at the reading (probe resistance), then press <b>REL</b>.', test: () => D3.relDone },
    { t: 'Connect the probes to <b>Inductor X</b> and read the winding resistance (while the inductor is cold).', test: () => D3.relDone && D3.mode === 'A' && D3.probe === 'coil' && D3.coil() === IX },
    { t: 'Example 2.7: in mode B connect the <b>100 mH / 6 Ω</b> inductor to <b>12 V</b> and turn on the output. How many amperes does the ammeter show?', test: () => D3.mode === 'B' && D3.on && D3.coil() === I100 && near(D3.kv.value, 12, 0.05) },
    { t: 'Keep the output on and watch the current until the inductor exceeds <b>45 °C</b> (time runs 4× faster). Why does the current decrease? Then turn off the output.', test: () => !!D3.hot },
    { t: 'In mode C record V<sub>R</sub> and V<sub>L</sub> for <b>Inductor X</b> at <b>at least 5 frequencies</b> between 100 Hz and 10 kHz.', test: () => { const L = S.d3rows.filter((r) => r.coil === IX); return L.length >= 5 && Math.min(...L.map((r) => r.f)) <= 200 && Math.max(...L.map((r) => r.f)) >= 5e3; } },
    { t: 'Record any inductor <b>above 50 kHz</b> and compare the |Z| curve with the ideal model (turn on the model curve).', test: () => S.d3rows.some((r) => r.f >= 5e4) && $('#d3theo').checked },
  ]);
  numq('d3', '#d3Q', { id: 'd3q1', q: 'What is the winding resistance R<sub>L</sub> (cold) of inductor X, in Ω?', answer: () => S.Rx, tol: 3, unit: 'Ω', explain: 'The reading after the probe resistance has been removed with REL.', hint: 'If you read without REL you will get 0.25 Ω too much.' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'From your AC measurements, what is the inductance of inductor X in mH?', answer: () => S.Lx * 1e3, tol: 6, unit: 'mH', explain: 'I = V<sub>R</sub>/100, |Z| = V<sub>L</sub>/I, ωL = √(|Z|² − R<sub>L</sub>²). Compare with your Experiment 1 result.', hint: 'Use a record at a mid frequency (≈1 kHz); at very high frequency the C<sub>p</sub> error grows.' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'What is the quality factor Q = ωL/R<sub>L</sub> of inductor X at 1 kHz?', answer: () => (TAU * 1000 * S.Lx) / S.Rx, tol: 8, unit: '', explain: 'Q is related to the ratio of the energy the inductor stores to the energy it loses; large Q = close to an ideal inductor.', hint: 'ω = 2π·1000' });
  numq('d3', '#d3Q', { id: 'd3q4', q: 'Example 2.7: what is the circuit current in steady state (cold inductor), in A?', answer: 2, tol: 2, unit: 'A', explain: 'v<sub>L</sub> = 0 ⇒ I = 12/6 = 2 A. R, not L, sets the current.', hint: 'At DC, L is a short circuit.' });
  numq('d3', '#d3Q', { id: 'd3q5', q: 'Example 2.7: how much energy is held in the magnetic field, in J?', answer: 0.2, tol: 2, unit: 'J', explain: 'w = ½(0.1)(2)² = 0.2 J (stock); 24 W is the energy turned into heat every second (flow).', hint: 'w = ½LI²' });
  mcq('d3', '#d3Q', { id: 'd3q6', q: 'While the DC supply stayed on, the ammeter current slowly decreased. Why?', opts: ['The inductance of the inductor increased', 'As the copper heated up R<sub>L</sub> increased (≈0.39%/°C), so I = V/R<sub>L</sub> decreased', 'The supply failed', 'The inductor ran out of energy'], correct: 1, explain: 'In steady state only the winding resistance sets the current; the resistance increases with temperature. This heat loss is also undesirable for energy efficiency.', hint: 'Look at the thermometer.' });

  /* ================= DENEY 4 · Ters EMK ================= */
  const C4 = [{ n: 'Relay coil 100 mH / 120 Ω', L: 0.1, R: 120, C: 100e-12 }, { n: 'Solenoid 1 H / 24 Ω', L: 1, R: 24, C: 200e-12 }];
  const PROT = { none: 'None', diode: 'Diode 1N4007', zener: 'Diode + 24 V zener', res: '1 kΩ resistor', rev: 'Diode (REVERSED)' };
  const SWN = { mech: 'Mechanical switch', mos: 'MOSFET (40 V)' };
  const RON = 0.1, VARC = 300, RARC = 20, VBR = 40, RAV = 1, VD = 0.6, RD = 0.5, VZ = 24, RZ = 2.5;
  function d4sim(o, tdiv) {
    // o: {Vs, coil, sw, prot, closing}; t = 0 olay anı
    const c = C4[o.coil], L = c.L, R = c.R, C = c.C, Vs = o.Vs;
    const closedAfter = o.closing;
    let i = closedAfter ? 0 : Vs / (R + RON), vX = closedAfter ? Vs : RON * i;
    const i0 = i;
    const sw = (v) => {
      if (closedAfter) return [1 / RON, 0];
      if (o.sw === 'mech') { if (v > VARC) return [1 / RARC, -VARC / RARC]; if (v < -VARC) return [1 / RARC, VARC / RARC]; return [1e-9, 0]; }
      if (v > VBR) return [1 / RAV, -VBR / RAV]; if (v < -VD) return [1 / RD, VD / RD]; return [1e-9, 0];
    };
    const pr = (v) => { // X → T akımı = g(v − Vs) + c
      const d = v - Vs;
      if (o.prot === 'diode' && d > VD) return [1 / RD, -VD / RD];
      if (o.prot === 'zener' && d > VD + VZ) return [1 / RZ, -(VD + VZ) / RZ];
      if (o.prot === 'res') return [1e-3, 0];
      if (o.prot === 'rev' && -d > VD) return [1 / RD, VD / RD];
      return [0, 0];
    };
    const nb = 500, t0 = -tdiv, t1 = 9 * tdiv, bw = (t1 - t0) / nb;
    const vmn = new Float64Array(nb).fill(Infinity), vmx = new Float64Array(nb).fill(-Infinity), imn = new Float64Array(nb).fill(Infinity), imx = new Float64Array(nb).fill(-Infinity);
    const put = (t, v, ii) => { const b = Math.floor((t - t0) / bw); if (b < 0 || b >= nb) return; if (v < vmn[b]) vmn[b] = v; if (v > vmx[b]) vmx[b] = v; if (ii < imn[b]) imn[b] = ii; if (ii > imx[b]) imx[b] = ii; };
    for (let b = 0; b < nb; b++) { const t = t0 + (b + 0.5) * bw; if (t < 0) put(t, vX, i); }
    let t = 0, vpk = vX, tdec = NaN, Esw = 0, Epr = 0;
    const tStop = closedAfter ? Math.min(0.3, Math.max(t1, (6 * L) / R)) : 0.3;
    while (t < tStop) {
      const h = t < 3e-4 ? 1e-8 : t < 5e-3 ? 2e-7 : 5e-6;
      const a = (L * i / h + Vs) / (L / h + R), b = 1 / (L / h + R);
      let v1 = vX, gs, gp;
      for (let it = 0; it < 3; it++) {
        gs = sw(v1); gp = pr(v1);
        const G = gs[0] + gp[0], H = gs[1] + gp[1] - gp[0] * Vs;
        const nv = (C * vX / h + a - H) / (C / h + G + b);
        if (Math.abs(nv - v1) < 1e-9) { v1 = nv; break; } v1 = nv;
      }
      const i1 = a - b * v1, isw = gs[0] * v1 + gs[1], ipr = gp[0] * (v1 - Vs) + gp[1];
      if (!closedAfter) { if (gs[0] > 1e-6) Esw += isw * v1 * h; Epr += ipr * (v1 - Vs) * h; }
      t += h; i = i1; vX = v1;
      if (vX > vpk) vpk = vX;
      if (!closedAfter && isNaN(tdec) && Math.abs(i) < 0.1 * Math.abs(i0)) tdec = t;
      put(t, vX, i);
      if (t > t1 && (closedAfter || !isNaN(tdec))) break;
    }
    const n = 2 * nb, y1 = new Float64Array(n), y2 = new Float64Array(n);
    let lv = vX, li = i;
    for (let b = 0; b < nb; b++) { if (vmn[b] === Infinity) { vmn[b] = vmx[b] = lv; imn[b] = imx[b] = li; } lv = vmx[b]; li = imx[b]; y1[2 * b] = vmn[b]; y1[2 * b + 1] = vmx[b]; y2[2 * b] = imn[b]; y2[2 * b + 1] = imx[b]; }
    return { n, y: [y1, y2], vpk, tdec, Esw, Epr, i0 };
  }
  const D4 = (() => {
    const box = $('#d4inst'), self = { dirty: true, closed: true, ev: null };
    const set = () => (self.dirty = true);
    const ps = inst(box, 'DC SUPPLY', true, '<span class="led" id="d4cc"></span> CC'); const psL = lcd(ps.el, 'V<sub>S</sub>', 'V', 90);
    const kv = new Lab.Knob(ps.c, { label: 'V_S', min: 5, max: 24, step: 0.5, value: S.d4V ?? 12, dark: true, fmt: (v) => num(v, 1) + ' V', onChange: (v) => { S.d4V = v; save(); } });
    const cb = inst(box, 'INDUCTOR · SWITCH', false);
    const kc = new Lab.Knob(cb.c, { label: 'Inductor', list: [0, 1], value: S.d4c ?? 0, fmt: (i) => (i ? 'Solenoid 1 H' : 'Relay 100 mH'), onChange: (v) => { S.d4c = v; save(); drawSch(); } });
    self.sw = S.d4sw || 'mech';
    segs(cb.c, [['mech', 'Mechanical'], ['mos', 'MOSFET']], self.sw, (k) => { self.sw = S.d4sw = k; save(); drawSch(); });
    const pb = inst(box, 'PROTECTION ELEMENT', false); self.prot = S.d4p || 'none';
    segs(pb.c, Object.entries(PROT).map(([k, t]) => [k, t]), self.prot, (k) => { self.prot = S.d4p = k; save(); drawSch(); if (k === 'rev' && self.closed) revShort(); });
    const swb = inst(box, 'SWITCH', true); const swL = lcd(swb.el, 'State', '', 100);
    const sb = document.createElement('button'); sb.className = 'btn'; sb.style.cssText = 'width:120px;padding:10px'; swb.c.appendChild(sb);
    const mm = inst(box, 'SINGLE-SHOT MEASUREMENTS', true); const mV = lcd(mm.el, 'v<sub>X</sub> peak', 'V', 110), mT = lcd(mm.el, 'Decay time', 'ms', 110), mE = lcd(mm.el, 'In switch', 'mJ', 110);
    const sc = makeScope($('#d4scopeBox'), 'd4scope', { v1: 50, v2: 0.05, t: 2e-4, mode: 'SINGLE', onChange: set });
    function revShort() { S.d4revSeen = true; save(); $('#d4cc').classList.add('on'); Lab.toast('⚠ Diode reversed: with the switch closed it short-circuits the supply directly! The supply is in current limit (CC) and the diode is heating up.', 5500); }
    sb.onclick = () => {
      self.closed = !self.closed;
      self.ev = { Vs: kv.value, coil: kc.value, sw: self.sw, prot: self.prot, closing: self.closed };
      if (self.closed && self.prot === 'rev') revShort(); else $('#d4cc').classList.remove('on');
      set();
    };
    const g = $('#d4sch'); let tX, spark;
    function drawSch() {
      g.innerHTML = '';
      sch.src(g, 80, 130); sch.w(g, [[80, 110], [80, 40], [320, 40]]); sch.w(g, [[80, 150], [80, 230], [320, 230]]); sch.gnd(g, 80, 230);
      sch.w(g, [[320, 40], [320, 50]]); sch.lV(g, 320, 50, 120); sch.rV(g, 320, 120, 150); sch.w(g, [[320, 150], [320, 160]]); sch.dot(g, 320, 160);
      sch.t(g, 290, 100, C4[kc.value].n.split(' ')[0], 'lbl', 'end');
      sch.w(g, [[320, 160], [320, 175]]);
      if (self.sw === 'mech') { E('path', { d: 'M320,175 l22,-22', class: 'w' }, g); sch.dot(g, 320, 175); sch.w(g, [[320, 200], [320, 230]]); sch.dot(g, 320, 200); sch.t(g, 345, 200, 'S', 'lbl', 'start'); }
      else { E('rect', { x: 305, y: 175, width: 30, height: 30, rx: 4, class: 'w', fill: '#fff' }, g); sch.t(g, 320, 195, 'Q', 'lbl'); sch.w(g, [[320, 205], [320, 230]]); }
      spark = E('path', { d: 'M330,185 l8,-6 l-3,8 l10,-4 l-6,9 l9,1', stroke: '#ff9800', 'stroke-width': 3, fill: 'none', opacity: 0 }, g);
      if (self.prot !== 'none') {
        sch.w(g, [[320, 40], [420, 40], [420, 55]]); sch.w(g, [[320, 160], [420, 160], [420, 145]]); sch.dot(g, 320, 40);
        if (self.prot === 'res') sch.rV(g, 420, 55, 145);
        else if (self.prot === 'zener') { sch.diodeV(g, 420, 55, 100, true); sch.diodeV(g, 420, 100, 145, false); sch.t(g, 440, 80, '24 V', 'lbl', 'start'); }
        else sch.diodeV(g, 420, 55, 145, self.prot === 'diode');
        sch.t(g, 440, 120, PROT[self.prot], 'lbl', 'start').style.fill = self.prot === 'rev' ? '#c62828' : '#1a8a4a';
      }
      sch.t(g, 300, 165, 'X', 'lbl', 'end'); sch.w(g, [[320, 160], [560, 160], [560, 130]]); sch.term(g, 560, 126); sch.t(g, 560, 114, 'CH1 (×100)').style.fill = '#b8960a';
      E('circle', { cx: 320, cy: 135, r: 12, fill: 'none', stroke: '#1592b8', 'stroke-width': 2, 'stroke-dasharray': '4 3' }, g); sch.t(g, 300, 140, 'CH2', 'lbl', 'end').style.fill = '#1592b8';
      sch.t(g, 110, 135, 'V', 'lbl', 'start'); tX = sch.t(g, 600, 30, '', 'val');
    }
    drawSch();
    self.update = () => {
      sb.textContent = self.closed ? 'OPEN SWITCH' : 'CLOSE SWITCH'; swL(self.closed ? 'CLOSED' : 'OPEN'); psL(num(kv.value, 1));
      if (!self.dirty) return; self.dirty = false;
      if (!self.ev) { sc.scope.draw({ n: 2, y: [new Float64Array(2), new Float64Array(2)] }); tX.textContent = 'Press the switch: the oscilloscope captures the event'; return; }
      const r = (self.r = d4sim(self.ev, sc.scope.tdiv));
      sc.scope.draw({ n: r.n, y: r.y }); sc.show(sc.scope.measure());
      if (!self.ev.closing) {
        mV(num(r.vpk, 1)); mT(isFinite(r.tdec) ? num(r.tdec * 1e3, 3) : '—'); mE(num(r.Esw * 1e3, 3));
        if (!self.ev.shown) {
          self.ev.shown = true;
          if (self.ev.sw === 'mech' && r.vpk > VARC * 0.98) { Lab.toast('⚡ Sparking (arc) at the contacts! The back EMF rose to ' + num(r.vpk, 0) + ' V; the energy was dissipated in the arc.', 5000); spark.setAttribute('opacity', 1); setTimeout(() => spark.setAttribute('opacity', 0), 1500); }
          else if (self.ev.sw === 'mos' && r.Esw > 1e-6) Lab.toast('⚠ The MOSFET went into avalanche breakdown (' + num(r.Esw * 1e3, 2) + ' mJ). If this repeats at every turn-off it will soon fail.', 5000);
        }
        tX.textContent = 'opening event · v_X peak = ' + num(r.vpk, 1) + ' V'; tX.style.fill = r.vpk > 60 ? '#c62828' : '#1a8a4a';
      } else { tX.textContent = 'closing event · current rises with L/R'; tX.style.fill = '#1592b8'; }
    };
    const tbody = $('#d4tab tbody');
    function table() { tbody.innerHTML = S.d4rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.coil ? 'Solenoid' : 'Relay'}</td><td>${SWN[r.sw]}</td><td>${PROT[r.prot]}</td><td>${num(r.Vs, 1)}</td><td>${num(r.vpk, 1)}</td><td>${isFinite(r.tdec) ? num(r.tdec * 1e3, 3) : '—'}</td><td>${num(r.Esw * 1e3, 3)}</td></tr>`).join(''); }
    self.rec = () => {
      if (!self.ev || self.ev.closing || !self.r) return Lab.toast('First OPEN the switch: the table records the opening event.');
      const e = self.ev, r = self.r; S.d4rows.push({ coil: e.coil, sw: e.sw, prot: e.prot, Vs: e.Vs, vpk: r.vpk, tdec: r.tdec, Esw: r.Esw }); save(); table(); Lab.toast('Recorded: ' + PROT[e.prot] + ', v_X peak = ' + num(r.vpk, 1) + ' V');
    };
    $('#d4rec').onclick = self.rec;
    $('#d4del').onclick = () => { S.d4rows.pop(); save(); table(); };
    $('#d4csv').onclick = () => Lab.downloadCSV('hafta5_deney4.csv', ['#', 'inductor', 'switch', 'protection', 'Vs (V)', 'vX peak (V)', 'decay (ms)', 'switch energy (mJ)'], S.d4rows.map((r, i) => [i + 1, C4[r.coil].n, SWN[r.sw], PROT[r.prot], r.Vs, +r.vpk.toFixed(2), isFinite(r.tdec) ? +(r.tdec * 1e3).toFixed(4) : '', +(r.Esw * 1e3).toFixed(4)]));
    table();
    Object.assign(self, { kv, kc, sc });
    return self;
  })();
  const r4 = (f) => S.d4rows.some(f);
  steps('d4', [
    { t: '<b>Relay coil, mechanical switch, no protection</b>, V<sub>S</sub> = 12 V. Close the switch, then <b>open</b> it and record. How many volts did CH1 reach? (Set CH1 V/div to 100 V.)', test: () => r4((r) => r.prot === 'none' && r.sw === 'mech' && r.coil === 0 && r.vpk > 250) },
    { t: 'Change the switch to <b>MOSFET</b> and record an unprotected opening event: why was the voltage clipped at 40 V?', test: () => r4((r) => r.prot === 'none' && r.sw === 'mos' && r.vpk > 38) },
    { t: 'Fit a <b>flyback diode</b> and record the opening event. Compare the peak voltage and decay time (increase TIME/div).', test: () => r4((r) => r.prot === 'diode' && r.coil === 0 && Math.abs(r.Vs - 12) < 0.01) },
    { t: 'Also record one opening event each with a <b>zener + diode</b> and a <b>1 kΩ resistor</b>.', test: () => r4((r) => r.prot === 'zener') && r4((r) => r.prot === 'res' && r.coil === 0 && Math.abs(r.Vs - 12) < 0.01) },
    { t: 'Fit the diode <b>reversed</b> and try closing the switch. What happened? (Do not do this in a real lab!)', test: () => !!S.d4revSeen },
    { t: 'Record an opening event with the <b>Solenoid (1 H)</b> and a diode: why did the decay time become so long?', test: () => r4((r) => r.coil === 1 && r.prot === 'diode') },
  ]);
  const i0r = 12 / (120 + RON), Rp4 = 120 + RD;
  numq('d4', '#d4Q', { id: 'd4q1', q: 'Relay coil (100 mH, 120 Ω), V<sub>S</sub> = 12 V: how much energy is stored before the switch opens, in mJ?', answer: 0.5 * 0.1 * i0r * i0r * 1e3, tol: 3, unit: 'mJ', explain: 'I = 12/120 = 0.1 A; w = ½(0.1)(0.1)² = 0.5 mJ. Without protection all of this energy is dissipated in the arc or in the transistor.', hint: 'w = ½LI²' });
  numq('d4', '#d4Q', { id: 'd4q2', q: 'With 1 kΩ resistor protection, what is the approximate peak voltage of node X at the moment of opening, in V?', answer: 12 + i0r * 1000, tol: 3, unit: 'V', explain: 'Current does not jump: the 0.1 A flows unchanged through 1 kΩ, v<sub>L</sub> = −100 V; v<sub>X</sub> = 12 + 100 = 112 V. It decays with τ = L/(R<sub>L</sub>+R) ≈ 89 µs.', hint: 'i(0<sup>+</sup>) = i(0<sup>−</sup>) flows through the resistor.' });
  numq('d4', '#d4Q', { id: 'd4q3', q: 'With diode suppression (V<sub>D</sub> ≈ 0.6 V + 0.5 Ω), how many ms does it take for the relay current to fall to 10%?', answer: () => 1e3 * (0.1 / Rp4) * Math.log((i0r + VD / Rp4) / (0.1 * i0r + VD / Rp4)), tol: 6, unit: 'ms', explain: 'L di/dt = −V<sub>D</sub> − (R<sub>L</sub>+R<sub>D</sub>)i ⇒ i(t) = (I<sub>0</sub> + V<sub>D</sub>/R)e<sup>−t/τ</sup> − V<sub>D</sub>/R, τ = L/R ≈ 0.83 ms. Your measurement should be ≈ 1.6 ms.', hint: 'τ ln 10 ≈ 1.9 ms alone is roughly right too; the diode voltage speeds up the decay slightly.' });
  numq('d4', '#d4Q', { id: 'd4q4', q: 'Lecture notes: if a 0.5 A current in L = 20 mH is interrupted in 1 µs, what is the inductor voltage in V?', answer: -10000, tol: 1, unit: 'V', explain: '0.02 × (−0.5/10<sup>−6</sup>) = −10 000 V: the contact gap breaks down and the arc sustains the current.', hint: 'v = L Δi/Δt' });
  mcq('d4', '#d4Q', { id: 'd4q5', q: 'How should a flyback diode be connected?', opts: ['In series with the inductor', 'In parallel with the inductor, cathode to the +V<sub>S</sub> side, anode to the switch side', 'In parallel with the inductor, anode to the +V<sub>S</sub> side', 'In parallel with the switch'], correct: 1, explain: 'In normal operation it is reverse-biased and conducts no current; when the switch opens it provides a path for the inductor current. If reversed, it short-circuits the supply when the switch closes.', hint: 'The diode must not conduct while the switch is closed.' });
  mcq('d4', '#d4Q', { id: 'd4q6', q: 'In a driver that must release the relay quickly, what is the price of using a zener + diode instead of a diode alone?', opts: ['There is no price', 'Suppression is faster, but node X rises to V<sub>S</sub> + V<sub>Z</sub> + 0.7 V; the transistor voltage rating must be chosen accordingly', 'The relay never releases', 'The supply is short-circuited'], correct: 1, explain: 'The energy is dissipated at a higher voltage in a shorter time. A diode gives the lowest voltage but the relay releases late (more contact wear).', hint: 'Compare the peak voltage and decay time columns in the table.' });

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
      <h2 style="margin:0">Circuit Theory I · Virtual Lab · Week 5 Report</h2>
      <p><b>Topic:</b> Inductor — v = L di/dt, energy, real inductor, back EMF and flyback diode</p>
      <table class="data" style="width:auto"><tr><th>Full name</th><td class="l">${S.st.name || ''}</td><th>ID</th><td class="l">${S.st.no || ''}</td><th>Group</th><td class="l">${S.st.group || ''}</td><th>Date</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Summary</h3>
      <p>Lab-sheet steps completed: <b>${sOk}/${sTot}</b> · Correct answers: <b>${ok}/${tot}</b> · Score: <b>${Math.round((50 * sOk) / sTot + (50 * ok) / tot)}/100</b></p>
      <h3>Answers</h3>
      <table class="data"><thead><tr><th>Section</th><th>Question</th><th>Answer</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Experiment 1 · v = L di/dt</h3>${tab('d1tab')}
      <h3>Experiment 2 · Current profile</h3>${tab('d2tab')}
      <h3>Experiment 3 · Real inductor (AC)</h3>${tab('d3tab')}
      <h3>Experiment 4 · Back EMF</h3>${tab('d4tab')}
      <h3>Plots</h3>
      <div>${img(D1.plotCanvas)} ${img($('#d1scope'))}</div>
      <div>${img(D2.plotCanvas)} ${img(D2.plotW)}</div>
      <div>${img(D3.plotCanvas)} ${img($('#d4scope'))}</div>
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
  function loop() {
    D3.update(); // ısıl model her sayfada işler
    if (S.page === 'd1') { D1.update(); evalSteps('d1'); }
    if (S.page === 'd2') { D2.update(); evalSteps('d2'); }
    if (S.page === 'd3') evalSteps('d3');
    if (S.page === 'd4') { D4.update(); evalSteps('d4'); }
    requestAnimationFrame(loop);
  }
  ['d1', 'd2', 'd3', 'd4'].forEach(evalSteps);
  go(S.page); progress(); loop();
})();

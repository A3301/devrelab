/* Devre Kuramı II · Hafta 5 — AC düğüm ve çevre yöntemleri */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd2h5';
  const S = Object.assign({ answers: {}, steps: {}, st: {}, page: 'giris', d1rows: [], d2rows: [], d3rows: [], d4rows: [], fl: {} }, Lab.store.load(KEY));
  Lab.answers = S.answers;
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => Lab.store.save(KEY, S), 300); };
  Lab.onAnswer = () => { save(); progress(); };
  const near = (a, b, t) => Math.abs(a - b) <= t;
  const SQ2 = Math.SQRT2;

  /* ---------- kompleks sayı yardımcıları ---------- */
  const cadd = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const csub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const cdiv = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
  const cinv = (a) => cdiv([1, 0], a);
  const cabs = (a) => Math.hypot(a[0], a[1]);
  const cang = (a) => (Math.atan2(a[1], a[0]) * 180) / Math.PI;
  const polar = (m, d) => [m * Math.cos((d * Math.PI) / 180), m * Math.sin((d * Math.PI) / 180)];
  const cconj = (a) => [a[0], -a[1]];
  const wrap = (x) => ((((x + 180) % 360) + 360) % 360) - 180;
  const frect = (z, d = 3) => `${num(z[0], d)} ${z[1] < 0 ? '−' : '+'} j${num(Math.abs(z[1]), d)}`;
  const fpol = (z, d = 3) => `${num(cabs(z), d)}∠${num(cang(z), 2)}°`;
  function csolve(A, b) { // Gauss yok etme, kısmi pivot
    const n = b.length, M = A.map((r, i) => [...r.map((z) => [...z]), [...b[i]]]);
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (cabs(M[r][c]) > cabs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]];
      if (cabs(M[c][c]) < 1e-14) return null;
      for (let r = c + 1; r < n; r++) { const f = cdiv(M[r][c], M[c][c]); for (let k = c; k <= n; k++) M[r][k] = csub(M[r][k], cmul(f, M[c][k])); }
    }
    const x = new Array(n);
    for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let k = r + 1; k < n; k++) s = csub(s, cmul(M[r][k], x[k])); x[r] = cdiv(s, M[r][r]); }
    return x;
  }
  const det2 = (Y) => csub(cmul(Y[0][0], Y[1][1]), cmul(Y[0][1], Y[1][0]));
  // fazör(ler) -> osiloskop örnekleri; comps: [{z:[re,im] (tepe), w}]
  function wave(n, tdiv, comps) {
    const y = new Float64Array(n), T = 10 * tdiv;
    for (let k = 0; k < n; k++) { const t = (k / (n - 1)) * T; let s = 0; comps.forEach((c) => { s += cabs(c.z) * Math.cos(c.w * t + Math.atan2(c.z[1], c.z[0])); }); y[k] = s; }
    return y;
  }

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
  function segBtn(parent, txt, on) { const b = document.createElement('button'); b.className = 'seg-btn' + (on ? ' on' : ''); b.innerHTML = txt; parent.appendChild(b); return b; }
  function segGroup(parent, opts, cur, onPick) {
    const bs = opts.map(([v, t]) => { const b = segBtn(parent, t, v === cur); b.onclick = () => { bs.forEach((x) => x.classList.remove('on')); b.classList.add('on'); onPick(v); }; return b; });
    return bs;
  }

  /* ---------- şema yardımcıları ---------- */
  const sch = {
    w: (g, pts) => E('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'w' }, g),
    dot: (g, x, y) => E('circle', { cx: x, cy: y, r: 3.5, class: 'node' }, g),
    t: (g, x, y, s, cls = 'lbl', anchor = 'middle') => { const e = E('text', { x, y, class: cls, 'text-anchor': anchor }, g); e.innerHTML = s; return e; },
    rH(g, x1, x2, y) { const n = 6, L = 8, step = (x2 - x1 - 2 * L) / n; let d = `M${x1},${y} h${L}`; for (let i = 0; i < n; i++) d += ` l${step / 2},${i % 2 ? 7 : -7} l${step / 2},${i % 2 ? -7 : 7}`; d += ` L${x2},${y}`; E('path', { d, class: 'w' }, g); },
    rV(g, x, y1, y2) { const n = 6, L = 8, step = (y2 - y1 - 2 * L) / n; let d = `M${x},${y1} v${L}`; for (let i = 0; i < n; i++) d += ` l${i % 2 ? 7 : -7},${step / 2} l${i % 2 ? -7 : 7},${step / 2}`; d += ` L${x},${y2}`; E('path', { d, class: 'w' }, g); },
    lV(g, x, y1, y2) { const n = 4, h = (y2 - y1 - 16) / n; let d = `M${x},${y1} v8`; for (let i = 0; i < n; i++) d += ` a${h / 2},${h / 2} 0 0 1 0,${h}`; d += ` L${x},${y2}`; E('path', { d, class: 'w' }, g); },
    lH(g, x1, x2, y) { const n = 4, h = (x2 - x1 - 16) / n; let d = `M${x1},${y} h8`; for (let i = 0; i < n; i++) d += ` a${h / 2},${h / 2} 0 0 1 ${h},0`; d += ` L${x2},${y}`; E('path', { d, class: 'w' }, g); },
    cV(g, x, y1, y2) { const m = (y1 + y2) / 2; E('path', { d: `M${x},${y1} V${m - 5} M${x - 16},${m - 5} h32 M${x - 16},${m + 5} h32 M${x},${m + 5} V${y2}`, class: 'w' }, g); },
    zH(g, x1, x2, y) { const m = (x1 + x2) / 2; E('path', { d: `M${x1},${y} H${m - 30} M${m + 30},${y} H${x2}`, class: 'w' }, g); return E('rect', { x: m - 30, y: y - 12, width: 60, height: 24, class: 'w', fill: '#fff' }, g); },
    zV(g, x, y1, y2) { const m = (y1 + y2) / 2; E('path', { d: `M${x},${y1} V${m - 30} M${x},${m + 30} V${y2}`, class: 'w' }, g); return E('rect', { x: x - 12, y: m - 30, width: 24, height: 60, class: 'w', fill: '#fff' }, g); },
    gnd(g, x, y) { E('path', { d: `M${x},${y} v8 M${x - 11},${y + 8} h22 M${x - 7},${y + 13} h14 M${x - 3},${y + 18} h6`, class: 'w' }, g); },
    src(g, x, y, r = 20) { E('circle', { cx: x, cy: y, r, class: 'w', fill: '#fff' }, g); E('path', { d: `M${x - 10},${y} q5,-12 10,0 t10,0`, class: 'w' }, g); sch.t(g, x + r + 2, y - r + 4, '+', 'lbl', 'start'); },
    isrc(g, x, y, r = 20) { E('circle', { cx: x, cy: y, r, class: 'w', fill: '#fff' }, g); E('path', { d: `M${x},${y + 12} V${y - 10} m-5,6 l5,-7 l5,7`, class: 'w' }, g); },
    dep(g, x, y) { E('path', { d: `M${x},${y - 22} L${x + 18},${y} L${x},${y + 22} L${x - 18},${y} Z`, class: 'w', fill: '#fff' }, g); E('path', { d: `M${x},${y + 12} V${y - 10} m-5,6 l5,-7 l5,7`, class: 'w' }, g); },
  };

  /* ---------- osiloskop ---------- */
  const VDIV = [1e-3, 2e-3, 5e-3, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
  const TDIV = [1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2];
  const POS = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  function mkScope(host, o) {
    const w = document.createElement('div'); w.className = 'inst dark scopewrap'; w.style.cssText = 'flex:1;min-width:420px';
    w.innerHTML = `<div class="brand"><span>DSO-2C · Digital Oscilloscope</span><span><span class="led on g"></span> RUN · trigger CH1 ↑ peak</span></div>
      <div class="row" style="align-items:flex-start;flex-wrap:nowrap"><canvas width="640" height="400" style="width:100%;max-width:640px"></canvas>
      <div style="min-width:160px"><div class="ctrls"></div><div class="row btns" style="margin:6px 0;gap:4px"></div><div class="meas"></div></div></div>`;
    host.appendChild(w);
    const cv = w.querySelector('canvas'), sc = new Lab.Scope(cv), sk = w.querySelector('.ctrls'), bt = w.querySelector('.btns'), me = w.querySelector('.meas');
    const self = { sc, cv, dirty: true };
    const set = () => { self.dirty = true; };
    sc.ch[0].vdiv = o.v1; sc.ch[1].vdiv = o.v2; sc.tdiv = o.t;
    self.k1 = new Lab.Knob(sk, { label: 'CH1 V/div', list: VDIV, value: o.v1, dark: true, size: 40, fmt: (v) => eng(v, 'V'), onChange: (v) => { sc.ch[0].vdiv = v; set(); } });
    self.k2 = new Lab.Knob(sk, { label: o.l2 || 'CH2 V/div', list: VDIV, value: o.v2, dark: true, size: 40, fmt: (v) => eng(v, o.u2 || 'V'), onChange: (v) => { sc.ch[1].vdiv = v; set(); } });
    self.kt = new Lab.Knob(sk, { label: 'TIME/div', list: TDIV, value: o.t, dark: true, size: 40, fmt: (v) => eng(v, 's'), onChange: (v) => { sc.tdiv = v; set(); } });
    self.kp1 = new Lab.Knob(sk, { label: 'CH1 position', list: POS, value: 0, dark: true, size: 34, fmt: (v) => num(v, 0) + ' d', onChange: (v) => { sc.ch[0].pos = v; set(); } });
    self.kp2 = new Lab.Knob(sk, { label: 'CH2 position', list: POS, value: 0, dark: true, size: 34, fmt: (v) => num(v, 0) + ' d', onChange: (v) => { sc.ch[1].pos = v; set(); } });
    const b1 = segBtn(bt, 'CH1', true), b2 = segBtn(bt, 'CH2', true), bc = segBtn(bt, 'CURSOR', false);
    b1.onclick = () => { sc.ch[0].on = !sc.ch[0].on; b1.classList.toggle('on', sc.ch[0].on); set(); };
    b2.onclick = () => { sc.ch[1].on = !sc.ch[1].on; b2.classList.toggle('on', sc.ch[1].on); set(); };
    bc.onclick = () => { sc.cur.on = !sc.cur.on; bc.classList.toggle('on', sc.cur.on); set(); };
    self.tc = (x) => x * sc.tdiv;
    self.show = () => {
      const m = sc.measure(); if (!m) return; self.m = m;
      const [a, b] = m.ch, u2 = o.u2 || 'V';
      let h = `<span style="color:#f2d21b">CH1</span> Vpp ${eng(a.vpp, 'V')}<br><span style="color:#27c4f0">CH2</span> pp ${eng(b.vpp, u2)}`;
      if (m.cur) {
        const c = m.cur;
        h += `<br><span style="color:#ff7cf0">A</span> t ${eng(self.tc(sc.cur.a), 's')}<br>&nbsp;CH1 ${eng(c.v1a, 'V')} · CH2 ${eng(c.v2a, u2)}` +
          `<br><span style="color:#ff7cf0">B</span> t ${eng(self.tc(sc.cur.b), 's')}<br>&nbsp;CH1 ${eng(c.v1b, 'V')} · CH2 ${eng(c.v2b, u2)}<br>Δt = t<sub>B</sub>−t<sub>A</sub> ${eng(c.dt, 's')}`;
      }
      me.innerHTML = h;
    };
    cv.addEventListener('pointermove', () => sc.cur.drag && self.show());
    cv.addEventListener('pointerdown', () => setTimeout(self.show, 0));
    self.draw = (data) => { sc.draw(data); self.show(); };
    return self;
  }

  /* ================= GEZİNME / İLERLEME ================= */
  const pages = ['giris', 'onbilgi', 'onhaz', 'd1', 'd2', 'd3', 'd4', 'rapor'];
  const XP = {};
  function go(p) {
    S.page = p; save();
    $$('section.page').forEach((s) => s.classList.toggle('active', s.id === p));
    $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.p === p));
    if (XP[p]) XP[p].dirty = true;
    if (p === 'rapor') buildReport();
    window.scrollTo(0, 0);
  }
  $$('#nav button').forEach((b) => (b.onclick = () => go(b.dataset.p)));

  const stepDefs = {};
  function steps(key, list) { stepDefs[key] = list; $('#' + key + 'steps').innerHTML = list.map((s) => `<li>${s.t}</li>`).join(''); }
  function evalSteps(key) {
    if (!stepDefs[key]) return;
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

  /* ================= ÖN BİLGİ: dönen fazörler ================= */
  const OB = (() => {
    const g = $('#obAnim'), cx = 110, cy = 115;
    E('line', { x1: 10, y1: cy, x2: 210, y2: cy, stroke: '#aaa' }, g); E('line', { x1: cx, y1: 12, x2: cx, y2: 218, stroke: '#aaa' }, g);
    sch.t(g, 205, cy - 5, 'Re', 'lbl', 'end'); sch.t(g, cx + 4, 22, 'Im', 'lbl', 'start');
    E('line', { x1: 230, y1: cy, x2: 512, y2: cy, stroke: '#aaa' }, g); sch.t(g, 510, cy + 16, 't', 'lbl', 'end');
    const a1 = E('line', { stroke: '#e07a10', 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    const a2 = E('line', { stroke: '#0b5cad', 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    const as = E('line', { stroke: '#222', 'stroke-width': 2.5, 'stroke-dasharray': '5 3' }, g);
    const tip = E('circle', { r: 4, fill: '#222' }, g);
    const proj = E('line', { stroke: '#999', 'stroke-dasharray': '2 3' }, g);
    const tr = E('polyline', { fill: 'none', stroke: '#222', 'stroke-width': 2 }, g);
    sch.t(g, 14, 214, 'orange: V₁ (ω₁) · blue: V₂ (ω₂)', 'lbl', 'start').style.fontSize = '11px';
    let t = 0, hist = [];
    function frame(dt) {
      const r = +$('#obRatio').value, w1 = 1.3; t += dt;
      const p1 = polar(60, (w1 * t * 180) / Math.PI), p2 = polar(36, (r * w1 * t * 180) / Math.PI - 30), s = cadd(p1, p2);
      const X = (z) => cx + z[0], Y = (z) => cy - z[1];
      a1.setAttribute('x1', cx); a1.setAttribute('y1', cy); a1.setAttribute('x2', X(p1)); a1.setAttribute('y2', Y(p1));
      a2.setAttribute('x1', X(p1)); a2.setAttribute('y1', Y(p1)); a2.setAttribute('x2', X(s)); a2.setAttribute('y2', Y(s));
      as.setAttribute('x1', cx); as.setAttribute('y1', cy); as.setAttribute('x2', X(s)); as.setAttribute('y2', Y(s));
      tip.setAttribute('cx', X(s)); tip.setAttribute('cy', Y(s));
      // zaman ekseni: Re(toplam) dikey eksene çevrilerek çizilir
      hist.unshift(s[0]); if (hist.length > 280) hist.pop();
      proj.setAttribute('x1', X(s)); proj.setAttribute('y1', Y(s)); proj.setAttribute('x2', 230); proj.setAttribute('y2', cy - s[0]);
      tr.setAttribute('points', hist.map((v, i) => `${230 + i},${cy - v}`).join(' '));
    }
    $('#obRatio').onchange = () => { hist = []; };
    return { frame };
  })();

  /* ================= ÖN HAZIRLIK ================= */
  const I33 = cdiv([150, -20], [36, 26]);
  numq('onhaz', '#preQ', { id: 'p1', q: '1) At ω = 1000 rad/s the admittance of a 2 mH inductor is Y<sub>L</sub> = 1/(jωL). What is its imaginary part in siemens? (with sign)', answer: -0.5, tol: 0, abs: 0.005, unit: 'S', explain: 'Y<sub>L</sub> = 1/(j2) = −j0.5 S. The imaginary part of an inductor admittance is always negative.', hint: '1/j = −j' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) Example 1.29 (DC): 1.7v<sub>1</sub> − 0.5v<sub>2</sub> = 10 and −0.5v<sub>1</sub> + 0.6v<sub>2</sub> = 2. What is v<sub>1</sub> in volts?', answer: 7 / 0.77, tol: 1, unit: 'V', explain: 'Δ = 0.77; v<sub>1</sub> = (10·0.6 + 0.5·2)/0.77 = 9.09 V.', hint: 'Cramer: v<sub>1</sub> = (b<sub>1</sub>a<sub>22</sub> − a<sub>12</sub>b<sub>2</sub>)/Δ' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) Example 1.30 (AC, same structure, j2 Ω between nodes 1–2): what is |V<sub>2</sub>| in volts? (peak)', answer: cabs(cdiv([2.4, -6], [0.12, -0.65])), tol: 1.5, unit: 'V', explain: 'V<sub>2</sub> = (2.4 − j6)/(0.12 − j0.65) = 9.59 + j1.92 = 9.78∠11.34° V.', hint: 'First compute Δ = (1.2−j0.5)(0.1−j0.5) − (j0.5)².' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) Example 1.33 (mesh): (4+j6)I<sub>1</sub> − j6I<sub>2</sub> = 50, −j6I<sub>1</sub> + (3+j2)I<sub>2</sub> = −20. What is |I<sub>1</sub>| in amperes?', answer: cabs(I33), tol: 1.5, unit: 'A', explain: 'Δ = 36 + j26; I<sub>1</sub> = (150 − j20)/(36 + j26) = 2.48 − j2.34 A, |I<sub>1</sub>| = 3.41 A.', hint: 'Δ = (4+j6)(3+j2) − (−j6)²' });
  mcq('onhaz', '#preQ', { id: 'p5', q: '5) In Example 1.34, i(t) = 0.707cos(1000t − 45°) + 0.190cos(3000t − 101.57°) A. What is the rms value I<sub>rms</sub> approximately?', opts: ['0.90 A', '0.52 A', '0.64 A', '0.37 A'], correct: 1, explain: 'I<sub>rms</sub> = √(0.500² + 0.134²) = 0.518 A. The cross term of components with different frequencies averages to zero.', hint: 'Not the amplitudes: the squares of the rms values are added.' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) In a two-mesh circuit the shared branch is j6 Ω, mesh 1 also has 4 Ω, and the source is 50 V. Which is the mesh 1 equation? (both currents clockwise)', opts: ['(4+j6)I<sub>1</sub> + j6I<sub>2</sub> = 50', '(4+j6)I<sub>1</sub> − j6I<sub>2</sub> = 50', '4I<sub>1</sub> − j6I<sub>2</sub> = 50', '(4−j6)I<sub>1</sub> + j6I<sub>2</sub> = 50'], correct: 1, explain: 'I<sub>1</sub> − I<sub>2</sub> flows through the shared branch; the term of the neighbouring current is negative.', hint: 'Two clockwise currents flow in opposite directions in the shared branch.' });

  /* ================= DENEY 1 · İki kaynaklı düğüm analizi ================= */
  const D1 = (() => {
    const box = $('#d1inst');
    const gen = inst(box, 'FUNC. GENERATOR + POWER AMP · V<sub>s</sub>');
    const kV = new Lab.Knob(gen.c, { label: 'V_s (peak)', min: 0, max: 15, step: 0.5, value: S.d1V ?? 5, dark: true, fmt: (v) => num(v, 1) + ' V', onChange: (v) => { S.d1V = v; save(); self.dirty = true; } });
    const kW = new Lab.Knob(gen.c, { label: 'ω', list: [500, 1000, 2000], value: S.d1W ?? 2000, dark: true, fmt: (v) => num(v, 0) + ' r/s', onChange: (v) => { S.d1W = v; save(); self.dirty = true; } });
    const isr = inst(box, 'SYNCHRONOUS AC CURRENT SOURCE · I<sub>s</sub>');
    const kI = new Lab.Knob(isr.c, { label: 'I_s (peak)', min: 0, max: 3, step: 0.1, value: S.d1I ?? 1, dark: true, fmt: (v) => num(v, 1) + ' A', onChange: (v) => { S.d1I = v; save(); self.dirty = true; } });
    const kP = new Lab.Knob(isr.c, { label: 'phase', min: -180, max: 180, step: 5, value: S.d1P ?? 0, dark: true, fmt: (v) => num(v, 0) + '°', onChange: (v) => { S.d1P = v; save(); self.dirty = true; } });
    const bo = inst(box, 'INDUCTOR · 2 mH', false);
    segGroup(bo.c, [[false, 'Ideal'], [true, 'Real (r<sub>L</sub>)']], !!S.d1real, (v) => { S.d1real = v; save(); self.dirty = true; });
    const vm = inst(box, 'TRUE-RMS AC VOLTMETER');
    const vL = lcd(vm.el, 'V<sub>AC</sub> rms', 'V', 140);
    const PR = [['V1', 'V<sub>1</sub>'], ['V2', 'V<sub>2</sub>'], ['V12', 'V<sub>1</sub>−V<sub>2</sub>'], ['Vs', 'V<sub>s</sub>']];
    segGroup(vm.c, PR, S.d1probe || 'V1', (v) => { S.d1probe = v; save(); self.dirty = true; });
    const sc = mkScope($('#d1scopeHost'), { v1: 5, v2: 5, t: 1e-3 });
    const RL = 0.35; // gerçek bobinin sargı direnci
    const P = () => ({ V: kV.value, I: kI.value, ph: kP.value, w: kW.value, real: !!S.d1real, probe: S.d1probe || 'V1' });
    const isStd = (p) => p.V === 10 && near(p.I, 2, 1e-9) && p.ph === 0 && p.w === 1000;
    function solve(p) {
      const Zb = [p.real ? RL : 0, p.w * 2e-3], Yb = cinv(Zb);
      const Y = [[cadd([1 + 0.2, 0], Yb), [-Yb[0], -Yb[1]]], [[-Yb[0], -Yb[1]], cadd(Yb, [0.1, 0])]];
      const [V1, V2] = csolve(Y, [[p.V, 0], polar(p.I, p.ph)]);
      return { V1, V2, V12: csub(V1, V2), Vs: [p.V, 0] };
    }
    // şema
    const g = $('#d1sch');
    sch.w(g, [[60, 60], [60, 90]]); sch.src(g, 60, 120); sch.w(g, [[60, 150], [60, 210], [600, 210]]); sch.gnd(g, 330, 210);
    sch.w(g, [[60, 60], [90, 60]]); sch.rH(g, 90, 190, 60); sch.w(g, [[190, 60], [240, 60]]);
    sch.rV(g, 240, 60, 210); sch.w(g, [[240, 60], [290, 60]]); sch.lH(g, 290, 400, 60); sch.w(g, [[400, 60], [460, 60]]);
    sch.rV(g, 460, 60, 210); sch.w(g, [[460, 60], [600, 60], [600, 100]]); sch.isrc(g, 600, 130); sch.w(g, [[600, 160], [600, 210]]);
    [[240, 60], [460, 60], [240, 210], [460, 210]].forEach(([x, y]) => sch.dot(g, x, y));
    sch.t(g, 140, 45, '1 Ω'); sch.t(g, 252, 140, '5 Ω', 'lbl', 'start'); sch.t(g, 472, 140, '10 Ω', 'lbl', 'start');
    const tL = sch.t(g, 345, 40, ''); const tVs = sch.t(g, 14, 125, '', 'val', 'start'); const tIs = sch.t(g, 628, 135, '', 'val', 'start');
    sch.t(g, 240, 48, '1', 'val'); sch.t(g, 460, 48, '2', 'val');
    const hl = { V1: E('circle', { cx: 240, cy: 60, r: 11, fill: 'none', stroke: '#e07a10', 'stroke-width': 3 }, g), V2: E('circle', { cx: 460, cy: 60, r: 11, fill: 'none', stroke: '#e07a10', 'stroke-width': 3 }, g) };
    const hl12 = E('path', { d: 'M250,80 H450', stroke: '#e07a10', 'stroke-width': 3, 'stroke-dasharray': '6 4', fill: 'none' }, g);
    sch.t(g, 380, 250, 'Reference node (ground) · oscilloscope CH1 = v<tspan baseline-shift="sub" font-size="10">s</tspan>, CH2 = selected point', 'lbl').style.fontSize = '12px';
    const self = { sc, dirty: true };
    self.update = function () {
      if (!self.dirty && !sc.dirty) return; self.dirty = sc.dirty = false;
      const p = P(), r = solve(p), z = r[p.probe];
      vL(num(cabs(z) / SQ2, 3));
      tL.textContent = p.real ? 'j' + num(p.w * 2e-3, 1) + ' Ω + r_L' : 'j' + num(p.w * 2e-3, 1) + ' Ω (2 mH)';
      tVs.textContent = num(p.V, 1) + '∠0°'; tIs.textContent = num(p.I, 1) + '∠' + num(p.ph, 0) + '°';
      hl.V1.style.display = p.probe === 'V1' ? '' : 'none'; hl.V2.style.display = p.probe === 'V2' ? '' : 'none'; hl12.style.display = p.probe === 'V12' ? '' : 'none';
      const n = 1000, tdv = sc.sc.tdiv;
      sc.draw({ n, y: [wave(n, tdv, [{ z: [p.V, 0], w: p.w }]), wave(n, tdv, [{ z, w: p.w }])] });
    };
    const tbody = $('#d1tab tbody'), PN = { V1: 'V₁', V2: 'V₂', V12: 'V₁−V₂', Vs: 'V_s' };
    function table() { tbody.innerHTML = S.d1rows.map((r, i) => `<tr><td>${i + 1}</td><td>${num(r.V, 1)}</td><td>${num(r.I, 1)}∠${num(r.ph, 0)}°</td><td>${r.w}</td><td>${r.real ? 'real' : 'ideal'}</td><td>${PN[r.probe]}</td><td>${num(r.vr, 3)}</td><td>${r.dt == null ? '—' : eng(r.dt, 's')}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; }
    self.rec = function () {
      const p = P(), z = solve(p)[p.probe];
      const dt = sc.sc.cur.on && sc.m && sc.m.cur ? sc.m.cur.dt : null;
      S.d1rows.push({ ...p, vr: +(cabs(z) / SQ2).toFixed(4), dt }); save(); table();
      Lab.toast('Recorded: ' + PN[p.probe] + ' = ' + num(cabs(z) / SQ2, 3) + ' V rms' + (dt == null ? '' : ', Δt = ' + eng(dt, 's')));
    };
    $('#d1rec').onclick = self.rec; $('#d1del').onclick = () => { S.d1rows.pop(); save(); table(); };
    $('#d1csv').onclick = () => Lab.downloadCSV('hafta05_deney1.csv', ['#', 'Vs peak (V)', 'Is peak (A)', 'Is phase (deg)', 'w (rad/s)', 'inductor', 'point', 'Vrms (V)', 'dt (s)'], S.d1rows.map((r, i) => [i + 1, r.V, r.I, r.ph, r.w, r.real ? 'real' : 'ideal', r.probe, r.vr, r.dt == null ? '' : +r.dt.toExponential(4)]));
    table();
    // imleçle ölçülen fazın doğruluğu
    self.phaseOk = (r) => { if (r.dt == null) return false; const T = (2 * Math.PI) / r.w, z = solve(r)[r.probe]; return Math.abs(wrap((-360 * r.dt) / T - cang(z))) < 3; };
    self.solve = solve; self.isStd = isStd; self.P = P;
    return self;
  })();
  XP.d1 = D1;
  const d1std = (r) => D1.isStd(r) && !r.real;
  steps('d1', [
    { t: 'Example 1.30 setting: <b>V<sub>s</sub> = 10 V, I<sub>s</sub> = 2 A, phase 0°, ω = 1000 rad/s</b>, ideal inductor.', test: () => d1std(D1.P()) },
    { t: 'Measure points <b>V<sub>1</sub></b> and <b>V<sub>2</sub></b> with the voltmeter and record both.', test: () => ['V1', 'V2'].every((k) => S.d1rows.some((r) => d1std(r) && r.probe === k)) },
    { t: 'Switch CH2 to V<sub>2</sub>. Put CURSOR A on a CH1 peak and B on the nearest CH2 peak, then <b>record</b> (Δt is written to the table).', test: () => S.d1rows.some((r) => d1std(r) && r.probe === 'V2' && D1.phaseOk(r)) },
    { t: 'Superposition: measure and record V<sub>1</sub> first with the voltage source alone (I<sub>s</sub> = 0), then with the current source alone (V<sub>s</sub> = 0).', test: () => { const b = (r) => r.w === 1000 && !r.real && r.probe === 'V1'; return S.d1rows.some((r) => b(r) && r.V === 10 && r.I === 0) && S.d1rows.some((r) => b(r) && r.V === 0 && near(r.I, 2, 1e-9) && r.ph === 0); } },
    { t: 'Switch the inductor to the <b>real</b> model and record V<sub>2</sub> again at the Example 1.30 setting. How large is the difference?', test: () => S.d1rows.some((r) => D1.isStd(r) && r.real && r.probe === 'V2') },
  ]);
  const R130 = D1.solve({ V: 10, I: 2, ph: 0, w: 1000, real: false });
  numq('d1', '#d1Q', { id: 'd1q1', q: 'From your measurement, what is the amplitude (peak) of the V<sub>1</sub> phasor in volts?', answer: cabs(R130.V1), tol: 1.5, unit: 'V', explain: '|V<sub>1</sub>| = √2 · V<sub>rms</sub> = 9.20 V; consistent with 9.20∠−1.00° in the lecture notes.', hint: 'The voltmeter shows rms; multiply by √2 for the peak value.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'From your cursor measurement, what is the angle of V<sub>2</sub> in degrees? (V<sub>s</sub> reference, 0°)', answer: cang(R130.V2), tol: 0, abs: 1.5, unit: '°', explain: 'φ = −360°·Δt/T ≈ +11.3°. V<sub>2</sub> leads V<sub>s</sub>: it reaches its peak earlier.', hint: 'T = 2π/ω = 6.283 ms. Does the CH2 peak come before the CH1 peak?' });
  numq('d1', '#d1Q', { id: 'd1q3', q: 'Using the V<sub>1</sub> − V<sub>2</sub> measurement, what is the amplitude (peak) of the inductor current in amperes?', answer: cabs(R130.V12) / 2, tol: 2, unit: 'A', explain: '|I<sub>L</sub>| = |V<sub>1</sub> − V<sub>2</sub>|/|j2| ≈ 1.06 A.', hint: 'Multiply the rms value of the difference point by √2 and divide by |Z<sub>L</sub>| = 2 Ω.' });
  numq('d1', '#d1Q', { id: 'd1q4', q: 'With only the current source on (V<sub>s</sub> = 0), what is the amplitude (peak) of the V<sub>1</sub> you measured, in volts?', answer: cabs(D1.solve({ V: 0, I: 2, ph: 0, w: 1000, real: false }).V1), tol: 2, unit: 'V', explain: 'The <b>complex</b> sum of this contribution and the V<sub>s</sub>-only contribution gives 9.20∠−1° V.', hint: 'V<sub>rms</sub> of the corresponding table row × √2.' });
  mcq('d1', '#d1Q', { id: 'd1q5', q: 'Why is the arithmetic sum of the V<sub>1,rms</sub> values from the two single-source measurements not equal to the V<sub>1,rms</sub> measured with both sources on?', opts: ['Superposition is invalid in AC circuits', 'The two contributions have different phases; phasors add as vectors, not their amplitudes', 'The voltmeter’s internal resistance loads the circuit', 'The current source is nonlinear'], correct: 1, explain: 'Superposition holds at the same frequency, but the sum is a sum of complex numbers: |A + B| ≤ |A| + |B|.', hint: 'Each contribution has both an amplitude and an angle.' });

  /* ================= Denklem kurucu ================= */
  function matBuilder(host, o) {
    const id = o.id, st = (S[id] = S[id] || {});
    const cell = (k, lbl) => `<td class="l" style="white-space:nowrap">${lbl}<br><input type="text" data-k="${k}r" size="6" placeholder="real"> + j<input type="text" data-k="${k}i" size="6" placeholder="imag."></td>`;
    host.innerHTML = `<div class="row" style="align-items:flex-start;gap:18px">
      <table class="data" style="width:auto"><tr><th colspan="2">[Y] (S)</th></tr>
        <tr>${cell('y11', 'Y<sub>11</sub>')}${cell('y12', 'Y<sub>12</sub>')}</tr>
        <tr>${cell('y21', 'Y<sub>21</sub>')}${cell('y22', 'Y<sub>22</sub>')}</tr></table>
      <div style="padding-top:40px;font-size:22px">·[V] =</div>
      <table class="data" style="width:auto"><tr><th>[I] (A)</th></tr><tr>${cell('i1', 'I<sub>1</sub>')}</tr><tr>${cell('i2', 'I<sub>2</sub>')}</tr></table></div>
      <div class="row" style="margin-top:8px"><button class="btn small">Solve and compare with measurement</button><button class="btn sec small">Clear boxes</button></div>
      <div class="out" style="font-size:13.5px;line-height:1.6;margin-top:6px"></div>`;
    const ins = $$('input', host), out = $('.out', host);
    ins.forEach((e) => { e.value = st[e.dataset.k] ?? ''; e.addEventListener('input', () => { st[e.dataset.k] = e.value; save(); }); });
    const rd = (k) => { const a = Lab.parse(st[k + 'r'] ?? ''), b = Lab.parse(st[k + 'i'] ?? ''); return [isFinite(a) ? a : NaN, isFinite(b) ? b : (isFinite(a) ? 0 : NaN)]; };
    const close = (s, t) => cabs(csub(s, t)) <= 0.02 * Math.max(cabs(t), 0.05) + 1e-3;
    function diag(k, s, t) {
      if (close(s, t)) return null;
      if (Math.abs(t[1]) > 1e-9 && close(s, cconj(t))) return 'the sign of the imaginary part is reversed: inductor admittance 1/(jωL) = −j/(ωL) (negative), capacitor admittance jωC (positive).';
      if (close(s, [-t[0], -t[1]])) return k[0] === 'i' ? 'sign reversed: a source current <b>entering</b> the node is written as positive.' : 'sign reversed: the off-diagonal term is the <b>negative</b> of the admittance between the two nodes.';
      if (cabs(t) > 1e-9 && close(s, cinv(t))) return 'you seem to have written the impedance instead of the admittance (Y = 1/Z).';
      return o.hint ? o.hint(k) : 'recalculate this term.';
    }
    $$('button', host)[1].onclick = () => { ins.forEach((e) => { e.value = ''; st[e.dataset.k] = ''; }); save(); out.innerHTML = ''; };
    $$('button', host)[0].onclick = () => {
      const K = ['y11', 'y12', 'y21', 'y22', 'i1', 'i2'], s = {};
      for (const k of K) { s[k] = rd(k); if (!isFinite(s[k][0])) return Lab.toast('Fill in all boxes (an empty imaginary part is taken as 0).'); }
      const Yt = o.trueY(), It = o.trueI(), tr = { y11: Yt[0][0], y12: Yt[0][1], y21: Yt[1][0], y22: Yt[1][1], i1: It[0], i2: It[1] };
      const Ys = [[s.y11, s.y12], [s.y21, s.y22]], sol = csolve(Ys, [s.i1, s.i2]), meas = o.measured();
      const errs = K.map((k) => [k, diag(k, s[k], tr[k])]).filter((e) => e[1]);
      const okAll = errs.length === 0;
      let h = '';
      if (!sol) h += '<span style="color:var(--bad)">Your matrix is singular (Δ = 0): no solution. Check the diagonal terms.</span><br>';
      else {
        const e = Math.max(cabs(csub(sol[0], meas[0])) / cabs(meas[0]), cabs(csub(sol[1], meas[1])) / cabs(meas[1])) * 100;
        h += `Your Δ = ${frect(det2(Ys), 4)}<br>Your solution: V<sub>1</sub> = ${fpol(sol[0])} V, V<sub>2</sub> = ${fpol(sol[1])} V (peak)<br>Measured (rms×√2, phase meter): V<sub>1</sub> = ${fpol(meas[0])} V, V<sub>2</sub> = ${fpol(meas[1])} V<br>`;
        h += `Largest relative difference: <b style="color:${e < 2 ? 'var(--ok)' : 'var(--bad)'}">%${num(e, 1)}</b>${e < 2 ? ' ✔ the solution agrees with measurement.' : ' ✘ the solution does not agree with measurement.'}<br>`;
        o.onResult({ okAll, sol, meas, err: e });
      }
      if (okAll) h += '<span style="color:var(--ok)">✔ All terms of the matrix and source vector are correct.</span>';
      else h += '<span style="color:var(--bad)">Hint:</span><ul style="margin:2px 0">' + errs.slice(0, 3).map(([k, m]) => `<li><b>${k.toUpperCase().replace(/(\d+)/, '<sub>$1</sub>')}</b>: ${m}</li>`).join('') + '</ul>';
      out.innerHTML = h;
    };
  }

  /* ================= DENEY 2 · Denklem kurucu ================= */
  const D2 = (() => {
    const box = $('#d2inst');
    const LIST = { R: [1, 2, 4, 5, 10, 20, 50], L: [1e-3, 2e-3, 4e-3, 5e-3, 1e-2, 2e-2], C: [5e-5, 1e-4, 2.5e-4, 5e-4, 1e-3] };
    const FMT = { R: Lab.ohm, L: (v) => eng(v, 'H'), C: (v) => eng(v, 'F') };
    const DEF = { a: ['R', 5], b: ['L', 2e-3], c: ['R', 10] };
    S.d2br = S.d2br || JSON.parse(JSON.stringify(DEF));
    const BN = { a: 'Z<sub>a</sub> (1–ground)', b: 'Z<sub>b</sub> (1–2)', c: 'Z<sub>c</sub> (2–ground)' };
    const self = { dirty: true };
    ['a', 'b', 'c'].forEach((k) => {
      const ib = inst(box, 'ELEMENT BOX · ' + BN[k], false);
      const tg = document.createElement('div'); tg.className = 'row'; tg.style.gap = '3px'; ib.c.appendChild(tg);
      const kh = document.createElement('div'); ib.c.appendChild(kh);
      const mk = () => { kh.innerHTML = ''; const [ty, v] = S.d2br[k]; new Lab.Knob(kh, { label: ty, list: LIST[ty], value: v, size: 46, fmt: FMT[ty], onChange: (x) => { S.d2br[k][1] = x; save(); self.dirty = true; } }); };
      segGroup(tg, [['R', 'R'], ['L', 'L'], ['C', 'C']], S.d2br[k][0], (ty) => { S.d2br[k] = [ty, LIST[ty][Math.floor(LIST[ty].length / 2)]]; save(); mk(); self.dirty = true; });
      mk();
    });
    const gen = inst(box, 'SOURCES · V<sub>s</sub> = 10∠0° V, I<sub>s</sub> = 2∠0° A');
    const kW = new Lab.Knob(gen.c, { label: 'ω (common)', list: [250, 500, 1000, 2000, 4000], value: S.d2W ?? 1000, dark: true, fmt: (v) => num(v, 0) + ' r/s', onChange: (v) => { S.d2W = v; save(); self.dirty = true; } });
    const mt = inst(box, 'AC VOLTMETER + PHASE METER');
    const m1 = lcd(mt.el, 'V<sub>1</sub> rms', 'V', 110), a1 = lcd(mt.el, '∠V<sub>1</sub> (ref. V<sub>s</sub>)', '°', 110), m2 = lcd(mt.el, 'V<sub>2</sub> rms', 'V', 110), a2 = lcd(mt.el, '∠V<sub>2</sub>', '°', 110);
    const Zof = ([ty, v], w) => (ty === 'R' ? [v, 0] : ty === 'L' ? [0, w * v] : [0, -1 / (w * v)]);
    const P = () => ({ br: JSON.parse(JSON.stringify(S.d2br)), w: kW.value });
    function Ymat(p) {
      const Ya = cinv(Zof(p.br.a, p.w)), Yb = cinv(Zof(p.br.b, p.w)), Yc = cinv(Zof(p.br.c, p.w));
      return [[cadd(cadd([1, 0], Ya), Yb), [-Yb[0], -Yb[1]]], [[-Yb[0], -Yb[1]], cadd(Yb, Yc)]];
    }
    const Ivec = () => [[10, 0], [2, 0]];
    const meas = () => { const p = P(); return csolve(Ymat(p), Ivec()); };
    // şema
    const g = $('#d2sch');
    sch.w(g, [[60, 60], [60, 90]]); sch.src(g, 60, 120); sch.w(g, [[60, 150], [60, 200], [600, 200]]); sch.gnd(g, 330, 200);
    sch.w(g, [[60, 60], [90, 60]]); sch.rH(g, 90, 180, 60); sch.w(g, [[180, 60], [240, 60]]); sch.t(g, 135, 45, 'R<tspan baseline-shift="sub" font-size="10">s</tspan> = 1 Ω');
    sch.zV(g, 240, 60, 200); sch.zH(g, 240, 460, 60); sch.zV(g, 460, 60, 200);
    sch.w(g, [[460, 60], [600, 60], [600, 100]]); sch.isrc(g, 600, 130); sch.w(g, [[600, 160], [600, 200]]);
    [[240, 60], [460, 60], [240, 200], [460, 200]].forEach(([x, y]) => sch.dot(g, x, y));
    sch.t(g, 240, 48, '1', 'val'); sch.t(g, 460, 48, '2', 'val'); sch.t(g, 14, 125, '10∠0°', 'val', 'start'); sch.t(g, 628, 135, '2∠0° A', 'val', 'start');
    const tA = sch.t(g, 258, 135, '', 'lbl', 'start'), tB = sch.t(g, 350, 35, ''), tC = sch.t(g, 478, 135, '', 'lbl', 'start'), tW = sch.t(g, 330, 240, '', 'val');
    self.update = function () {
      if (!self.dirty) return; self.dirty = false;
      const p = P(), [V1, V2] = meas();
      m1(num(cabs(V1) / SQ2, 3)); a1(num(cang(V1), 1)); m2(num(cabs(V2) / SQ2, 3)); a2(num(cang(V2), 1));
      const lab = (b) => `${b[0]} = ${FMT[b[0]](b[1])}`;
      tA.textContent = lab(p.br.a); tB.textContent = lab(p.br.b); tC.textContent = lab(p.br.c);
      tW.textContent = 'ω = ' + p.w + ' rad/s  (f = ' + num(p.w / 2 / Math.PI, 1) + ' Hz)';
    };
    const cfgStr = (br) => ['a', 'b', 'c'].map((k) => br[k][0] + '=' + FMT[br[k][0]](br[k][1])).join(', ');
    const tbody = $('#d2tab tbody');
    function table() { tbody.innerHTML = S.d2rows.map((r, i) => `<tr><td>${i + 1}</td><td class="l">${r.cfg}</td><td>${r.w}</td><td>${r.ok ? '✔' : '✘'}</td><td>${r.v1s}</td><td>${r.v1m}</td><td>${r.v2s}</td><td>${r.v2m}</td><td>%${num(r.err, 1)}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; }
    matBuilder($('#d2mat'), {
      id: 'd2m', trueY: () => Ymat(P()), trueI: Ivec, measured: meas,
      hint: (k) => ({ y11: 'Y<sub>11</sub> = 1/R<sub>s</sub> + Y<sub>a</sub> + Y<sub>b</sub> (every branch touching node 1).', y22: 'Y<sub>22</sub> = Y<sub>b</sub> + Y<sub>c</sub>.', y12: 'Y<sub>12</sub> = −Y<sub>b</sub>.', y21: 'Y<sub>21</sub> = −Y<sub>b</sub>.', i1: 'Norton: V<sub>s</sub>/R<sub>s</sub>.', i2: 'I<sub>s</sub> entering node 2.' }[k]),
      onResult: (r) => {
        const p = P();
        S.d2rows.push({ cfg: cfgStr(p.br), br: p.br, w: p.w, ok: r.okAll, v1s: fpol(r.sol[0], 2), v1m: fpol(r.meas[0], 2), v2s: fpol(r.sol[1], 2), v2m: fpol(r.meas[1], 2), err: r.err });
        if (r.okAll && r.err < 2) {
          const std = JSON.stringify(p.br) === JSON.stringify(DEF) && p.w === 1000, hasC = ['a', 'b', 'c'].some((k) => p.br[k][0] === 'C'), hasX = ['a', 'b', 'c'].some((k) => p.br[k][0] !== 'R');
          if (std) S.fl.d2std = true; if (hasC) S.fl.d2cap = true; if (p.w !== 1000 && hasX) S.fl.d2w = true;
        }
        save(); table();
      },
    });
    $('#d2del').onclick = () => { S.d2rows.pop(); save(); table(); };
    $('#d2csv').onclick = () => Lab.downloadCSV('hafta05_deney2.csv', ['#', 'circuit', 'w (rad/s)', 'matrix correct', 'V1 solution', 'V1 measured', 'V2 solution', 'V2 measured', 'error %'], S.d2rows.map((r, i) => [i + 1, r.cfg, r.w, r.ok ? 'yes' : 'no', r.v1s, r.v1m, r.v2s, r.v2m, +r.err.toFixed(2)]));
    table();
    self.rec = () => Lab.toast('In this experiment rows are recorded with the “Solve and compare with measurement” button.');
    self.P = P; self.DEF = DEF;
    return self;
  })();
  XP.d2 = D2;
  steps('d2', [
    { t: 'The default circuit is Example 1.30: Z<sub>a</sub> = 5 Ω, Z<sub>b</sub> = 2 mH, Z<sub>c</sub> = 10 Ω, ω = 1000 rad/s. Read the meters.', test: () => { const p = D2.P(); return JSON.stringify(p.br) === JSON.stringify(D2.DEF) && p.w === 1000; } },
    { t: 'Enter [Y] and [I] for this circuit; <b>all terms must be correct</b> and the solution must agree with measurement within 2%.', test: () => !!S.fl.d2std },
    { t: 'Put a <b>capacitor</b> in one of the branches, rebuild the matrix and verify it.', test: () => !!S.fl.d2cap },
    { t: 'With a reactive element present, <b>change ω</b> (other than 1000), update the matrix and verify it.', test: () => !!S.fl.d2w },
    { t: 'Create correct-solution records for at least <b>3 different circuits</b> in total.', test: () => new Set(S.d2rows.filter((r) => r.ok && r.err < 2).map((r) => r.cfg + r.w)).size >= 3 },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'In the Example 1.30 circuit, what is the imaginary part of Y<sub>22</sub> in siemens? (with sign)', answer: -0.5, tol: 0, abs: 0.005, unit: 'S', explain: 'Y<sub>22</sub> = 1/(j2) + 1/10 = 0.1 − j0.5 S.', hint: 'The inductor and the 10 Ω touch node 2.' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'In the same circuit, what is the magnitude of the determinant |Δ|?', answer: Math.hypot(0.12, 0.65), tol: 1.5, unit: 'S²', explain: 'Δ = 0.12 − j0.65, |Δ| = 0.661 S².', hint: 'Δ = Y<sub>11</sub>Y<sub>22</sub> − Y<sub>12</sub>Y<sub>21</sub>; (j0.5)² = −0.25.' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 'If a 500 µF capacitor replaces Z<sub>b</sub> (ω = 1000 rad/s), what is the imaginary part of Y<sub>12</sub>? (with sign)', answer: -0.5, tol: 0, abs: 0.005, unit: 'S', explain: 'Y<sub>b</sub> = jωC = j0.5 S, Y<sub>12</sub> = −Y<sub>b</sub> = −j0.5 S. With the inductor it was +j0.5: the sign flips with the element.', hint: 'First Y<sub>b</sub>, then the minus sign.' });
  mcq('d2', '#d2Q', { id: 'd2q4', q: 'If you mistakenly write the inductor admittance as +j/(ωL), what do you see when comparing the solution with measurement?', opts: ['No difference at all', 'Same amplitude, only the angles come out with opposite sign', 'The solution deviates from measurement in amplitude and angle, yet the numbers look “reasonable” on their own', 'The matrix becomes singular'], correct: 2, explain: 'The error turns the circuit into a capacitive one; the solution is numerically meaningful but wrong. Only an independent check (measurement) catches it.', hint: 'Try this in the equation builder.' });
  mcq('d2', '#d2Q', { id: 'd2q5', q: 'Why is Y<sub>12</sub> = Y<sub>21</sub> in the admittance matrix of this experiment?', opts: ['The sources have the same frequency', 'The two nodes are connected only by a passive, reciprocal (bidirectional) branch', 'The reference node is grounded', 'The source currents are equal'], correct: 1, explain: 'A passive branch acts mutually between two nodes with the same admittance; a dependent source breaks this symmetry (Experiment 4).', hint: 'Which element do Y<sub>12</sub> and Y<sub>21</sub> come from?' });

  /* ================= DENEY 3 · Farklı frekanslı kaynaklar ================= */
  const D3 = (() => {
    const R = 10, L = 0.01, W1 = 1000;
    const box = $('#d3inst');
    const g1 = inst(box, 'GENERATOR 1 · 10 cos 1000t V');
    segGroup(g1.c, [[true, 'ON'], [false, 'OFF (jumper)']], S.d3s1 !== false, (v) => { S.d3s1 = v; save(); self.dirty = true; });
    const g2 = inst(box, 'GENERATOR 2 · 6 cos(ω<sub>2</sub>t − 30°) V');
    segGroup(g2.c, [[true, 'ON'], [false, 'OFF (jumper)']], S.d3s2 !== false, (v) => { S.d3s2 = v; save(); self.dirty = true; });
    const kW2 = new Lab.Knob(g2.c, { label: 'ω₂', list: [1000, 2000, 3000, 5000], value: S.d3w2 ?? 2000, dark: true, fmt: (v) => num(v, 0) + ' r/s', onChange: (v) => { S.d3w2 = v; save(); self.dirty = true; } });
    const am = inst(box, 'TRUE-RMS AMMETER'); const aL = lcd(am.el, 'I<sub>AC</sub> rms', 'mA', 130);
    const sc = mkScope($('#d3scopeHost'), { v1: 5, v2: 0.2, t: 1e-3, l2: 'CH2 i (1 V/A)' });
    const P = () => ({ s1: S.d3s1 !== false, s2: S.d3s2 !== false, w2: kW2.value });
    const comps = (p) => {
      const c = [];
      if (p.s1) c.push({ v: [10, 0], z: cdiv([10, 0], [R, W1 * L]), w: W1 });
      if (p.s2) c.push({ v: polar(6, -30), z: cdiv(polar(6, -30), [R, p.w2 * L]), w: p.w2 });
      return c;
    };
    function irms(p) {
      const c = comps(p); if (!c.length) return 0;
      if (c.length === 2 && c[0].w === c[1].w) return cabs(cadd(c[0].z, c[1].z)) / SQ2;
      return Math.sqrt(c.reduce((s, x) => s + (cabs(x.z) ** 2) / 2, 0));
    }
    // şema
    const g = $('#d3sch');
    sch.w(g, [[80, 40], [80, 70]]); sch.src(g, 80, 95, 18); sch.w(g, [[80, 113], [80, 125]]); sch.src(g, 80, 145, 18); sch.w(g, [[80, 163], [80, 190], [560, 190], [560, 40]]);
    sch.w(g, [[80, 40], [180, 40]]); sch.rH(g, 180, 300, 40); sch.w(g, [[300, 40], [360, 40]]); sch.lH(g, 360, 480, 40); sch.w(g, [[480, 40], [560, 40]]);
    sch.t(g, 240, 25, '10 Ω'); sch.t(g, 420, 25, '10 mH'); const t1 = sch.t(g, 110, 100, '', 'lbl', 'start'), t2 = sch.t(g, 110, 150, '', 'lbl', 'start');
    E('path', { d: 'M150,55 h40 m-8,-5 l8,5 l-8,5', class: 'w' }, g); sch.t(g, 170, 72, 'i(t)');
    sch.t(g, 600, 115, 'current probe → CH2', 'lbl', 'start');
    const self = { sc, dirty: true };
    self.update = function () {
      if (!self.dirty && !sc.dirty) return; self.dirty = sc.dirty = false;
      const p = P(), c = comps(p);
      t1.textContent = p.s1 ? 'v₁ = 10 cos 1000t' : 'v₁: jumper (0)'; t2.textContent = p.s2 ? `v₂ = 6 cos(${p.w2}t − 30°)` : 'v₂: jumper (0)';
      aL(num(irms(p) * 1e3, 1));
      const n = 1000, td = sc.sc.tdiv;
      sc.draw({ n, y: [wave(n, td, c.map((x) => ({ z: x.v, w: x.w }))), wave(n, td, c.map((x) => ({ z: x.z, w: x.w })))] });
      drawPlot();
    };
    const plot = new Lab.Plot($('#d3plot'), { xlabel: 't (ms)', ylabel: 'i (A)' });
    function drawPlot() {
      const p = P(), c = comps(p), T = (4 * Math.PI) / W1, ser = [];
      const at = (cs, t) => cs.reduce((s, x) => s + cabs(x.z) * Math.cos(x.w * t + Math.atan2(x.z[1], x.z[0])), 0);
      const meas = []; for (let k = 0; k <= 70; k++) { const t = (k / 70) * T; meas.push([t * 1e3, at(c, t)]); }
      if ($('#d3theo').checked) { const pts = []; for (let k = 0; k <= 400; k++) { const t = (k / 400) * T; pts.push([t * 1e3, at(c, t)]); } ser.push({ pts, line: true, color: '#1a8a4a', width: 2 }); }
      if ($('#d3wrong').checked && c.length) { const sum = c.reduce((s, x) => cadd(s, x.z), [0, 0]); const pts = []; for (let k = 0; k <= 400; k++) { const t = (k / 400) * T; pts.push([t * 1e3, cabs(sum) * Math.cos(W1 * t + Math.atan2(sum[1], sum[0]))]); } ser.push({ pts, line: true, color: '#c62828', dash: [6, 4] }); }
      ser.push({ pts: meas, dots: true, color: '#0b5cad' });
      plot.draw(ser, [0, T * 1e3], [-1.1, 1.1]);
    }
    $('#d3theo').onchange = () => { if ($('#d3theo').checked) { S.fl.d3theo = true; save(); } drawPlot(); };
    $('#d3wrong').onchange = () => { if ($('#d3wrong').checked) { S.fl.d3wrong = true; save(); } drawPlot(); };
    const tbody = $('#d3tab tbody');
    function table() { tbody.innerHTML = S.d3rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.s1 ? 'on' : '—'}</td><td>${r.s2 ? 'on' : '—'}</td><td>${r.w2}</td><td>${num(r.irms * 1e3, 1)}</td><td>${num(r.imax, 3)}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; }
    self.rec = function () {
      const p = P(); if (!sc.m) return;
      S.d3rows.push({ ...p, irms: irms(p), imax: sc.m.ch[1].max }); save(); table();
      Lab.toast('Recorded: I_rms = ' + num(irms(p) * 1e3, 1) + ' mA');
    };
    $('#d3rec').onclick = self.rec; $('#d3del').onclick = () => { S.d3rows.pop(); save(); table(); };
    $('#d3csv').onclick = () => Lab.downloadCSV('hafta05_deney3.csv', ['#', 'source1', 'source2', 'w2 (rad/s)', 'Irms (A)', 'i max (A)'], S.d3rows.map((r, i) => [i + 1, r.s1 ? 'on' : 'off', r.s2 ? 'on' : 'off', r.w2, +r.irms.toFixed(5), +r.imax.toFixed(4)]));
    table();
    self.irms = irms; self.comps = comps;
    return self;
  })();
  XP.d3 = D3;
  steps('d3', [
    { t: 'With only <b>generator 1</b> on, measure and record the current.', test: () => S.d3rows.some((r) => r.s1 && !r.s2) },
    { t: 'Only <b>generator 2</b> on, <b>ω<sub>2</sub> = 3000 rad/s</b>: record.', test: () => S.d3rows.some((r) => !r.s1 && r.s2 && r.w2 === 3000) },
    { t: 'Both on, ω<sub>2</sub> = 3000 rad/s: record. Does I<sub>rms</sub>² = I<sub>1</sub>² + I<sub>2</sub>² hold?', test: () => S.d3rows.some((r) => r.s1 && r.s2 && r.w2 === 3000) },
    { t: 'On the plot, first turn on the <b>wrong method</b> (add the phasors), then the <b>correct solution</b>, and compare with measurement.', test: () => S.fl.d3theo && S.fl.d3wrong },
    { t: '<b>ω<sub>2</sub> = 1000 rad/s</b> (same frequency), both on: record. Why does the sum of squares not hold now?', test: () => S.d3rows.some((r) => r.s1 && r.s2 && r.w2 === 1000) },
  ]);
  const c3 = D3.comps({ s1: true, s2: true, w2: 3000 });
  numq('d3', '#d3Q', { id: 'd3q1', q: 'With only generator 1 on, what is the amplitude (peak) of the current phasor in amperes?', answer: cabs(c3[0].z), tol: 1.5, unit: 'A', explain: 'I<sub>1</sub> = 10/(10 + j10) = 0.707∠−45° A; the ammeter shows 500 mA rms.', hint: 'I<sub>rms</sub> × √2' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'At ω<sub>2</sub> = 3000 rad/s, what is the angle in degrees of the current phasor produced by generator 2?', answer: cang(c3[1].z), tol: 0, abs: 1, unit: '°', explain: 'Z = 10 + j30 = 31.62∠71.57° Ω; I<sub>2</sub> = 6∠−30°/Z = 0.190∠−101.57° A.', hint: 'Recalculate Z at this ω: jωL = j30 Ω.' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'With both sources on (ω<sub>2</sub> = 3000), what is the measured I<sub>rms</sub> in amperes?', answer: D3.irms({ s1: true, s2: true, w2: 3000 }), tol: 1.5, unit: 'A', explain: '√(0.500² + 0.134²) = 0.518 A.', hint: 'Convert the ammeter reading from mA to A.' });
  numq('d3', '#d3Q', { id: 'd3q4', q: 'With ω<sub>2</sub> = 1000 rad/s (same frequency) and both sources on, what is I<sub>rms</sub> in amperes?', answer: D3.irms({ s1: true, s2: true, w2: 1000 }), tol: 1.5, unit: 'A', explain: 'At the same frequency the phasors are added first: I = (10 + 6∠−30°)/(10 + j10) ⇒ |I|/√2. The sum of squares is invalid here; the cross term remains.', hint: 'Add the phasors, then divide by √2.' });
  mcq('d3', '#d3Q', { id: 'd3q5', q: 'Why is it wrong to add two current phasors of different frequencies and write a single cosine?', opts: ['The phasors have different amplitudes', 'A phasor is the initial position of a vector rotating at one ω only; the angle between the two vectors changes with time', 'The inductor is nonlinear', 'Superposition holds only in DC'], correct: 1, explain: 'The angle between them opens as (ω<sub>2</sub> − ω<sub>1</sub>)t; the sum is not a constant phasor. On the plot the red curve does not match the measurement.', hint: 'Recall the animation in the Background section.' });

  /* ================= DENEY 4 · Bağımlı kaynak ================= */
  const D4 = (() => {
    const box = $('#d4inst');
    const gen = inst(box, 'SOURCE · V<sub>s</sub> = 10∠0° V, ω = 1000 rad/s');
    const vc = inst(box, 'VCCS MODULE · i = g·v<sub>1</sub>');
    const kG = new Lab.Knob(vc.c, { label: 'g', min: 0, max: 1, step: 0.05, value: S.d4g ?? 0.2, dark: true, size: 58, fmt: (v) => num(v, 2) + ' S', onChange: (v) => { S.d4g = v; save(); self.dirty = true; } });
    const mt = inst(box, 'AC VOLTMETER + PHASE METER');
    const m1 = lcd(mt.el, 'V<sub>1</sub> rms', 'V', 110), a1 = lcd(mt.el, '∠V<sub>1</sub>', '°', 100), m2 = lcd(mt.el, 'V<sub>2</sub> rms', 'V', 110), a2 = lcd(mt.el, '∠V<sub>2</sub>', '°', 100);
    lcd(gen.el, 'R<sub>1</sub> = 2 Ω · C = 250 µF · R<sub>b</sub> = 4 Ω · L = 2 mH', '', 150)('—');
    const Ymat = (gv) => [[[0.75, 0.25], [-0.25, 0]], [[-0.25 - gv, 0], [0.25, -0.5]]];
    const Ivec = () => [[5, 0], [0, 0]];
    const solve = (gv) => csolve(Ymat(gv), Ivec());
    // şema
    const g = $('#d4sch');
    sch.w(g, [[60, 60], [60, 90]]); sch.src(g, 60, 120); sch.w(g, [[60, 150], [60, 200], [620, 200]]); sch.gnd(g, 330, 200);
    sch.w(g, [[60, 60], [90, 60]]); sch.rH(g, 90, 190, 60); sch.w(g, [[190, 60], [240, 60]]); sch.t(g, 140, 45, '2 Ω');
    sch.cV(g, 240, 60, 200); sch.t(g, 262, 135, '250 µF', 'lbl', 'start');
    sch.w(g, [[240, 60], [300, 60]]); sch.rH(g, 300, 400, 60); sch.w(g, [[400, 60], [460, 60]]); sch.t(g, 350, 45, '4 Ω');
    sch.lV(g, 460, 60, 200); sch.t(g, 476, 135, '2 mH', 'lbl', 'start');
    sch.w(g, [[460, 60], [600, 60], [600, 108]]); sch.dep(g, 600, 130); sch.w(g, [[600, 152], [600, 200]]);
    [[240, 60], [460, 60], [240, 200], [460, 200]].forEach(([x, y]) => sch.dot(g, x, y));
    sch.t(g, 240, 48, '1', 'val'); sch.t(g, 460, 48, '2', 'val'); sch.t(g, 14, 125, '10∠0°', 'val', 'start');
    const tg = sch.t(g, 626, 135, '', 'val', 'start');
    const self = { dirty: true };
    self.update = function () {
      if (!self.dirty) return; self.dirty = false;
      const gv = kG.value, [V1, V2] = solve(gv);
      m1(num(cabs(V1) / SQ2, 3)); a1(num(cang(V1), 1)); m2(num(cabs(V2) / SQ2, 3)); a2(num(cang(V2), 1));
      tg.textContent = 'g·v₁, g = ' + num(gv, 2) + ' S';
      drawPlot();
    };
    const plot = new Lab.Plot($('#d4plot'), { xlabel: 'g (S)', ylabel: '|V₂| peak (V)' });
    function drawPlot() {
      const ser = [];
      if ($('#d4theo').checked) { const pts = []; for (let k = 0; k <= 100; k++) { const gv = k / 100; pts.push([gv, cabs(solve(gv)[1])]); } ser.push({ pts, line: true, color: '#e07a10', dash: [6, 4] }); }
      ser.push({ pts: S.d4rows.map((r) => [r.g, r.v2 * SQ2]), dots: true, color: '#0b5cad' });
      plot.draw(ser, [0, 1], [0, 22]);
    }
    $('#d4theo').onchange = () => { if ($('#d4theo').checked) { S.fl.d4theo = true; save(); } drawPlot(); };
    const tbody = $('#d4tab tbody');
    function table() { tbody.innerHTML = S.d4rows.map((r, i) => `<tr><td>${i + 1}</td><td>${num(r.g, 2)}</td><td>${num(r.v1, 3)}</td><td>${num(r.a1, 1)}°</td><td>${num(r.v2, 3)}</td><td>${num(r.a2, 1)}°</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; drawPlot(); }
    self.rec = function () {
      const gv = kG.value, [V1, V2] = solve(gv);
      S.d4rows.push({ g: gv, v1: cabs(V1) / SQ2, a1: cang(V1), v2: cabs(V2) / SQ2, a2: cang(V2) }); save(); table();
      Lab.toast('Recorded: g = ' + num(gv, 2) + ' S, V₂ = ' + num(cabs(V2) / SQ2, 3) + ' V rms');
    };
    $('#d4rec').onclick = self.rec; $('#d4del').onclick = () => { S.d4rows.pop(); save(); table(); };
    $('#d4csv').onclick = () => Lab.downloadCSV('hafta05_deney4.csv', ['#', 'g (S)', 'V1 rms (V)', 'V1 angle', 'V2 rms (V)', 'V2 angle'], S.d4rows.map((r, i) => [i + 1, r.g, +r.v1.toFixed(4), +r.a1.toFixed(2), +r.v2.toFixed(4), +r.a2.toFixed(2)]));
    table();
    matBuilder($('#d4mat'), {
      id: 'd4m', trueY: () => Ymat(kG.value), trueI: Ivec, measured: () => solve(kG.value),
      hint: (k) => ({ y11: '1/R<sub>1</sub> + jωC + 1/R<sub>b</sub>', y12: '−1/R<sub>b</sub> (the dependent source is not in the node 1 equation)', y21: '−1/R<sub>b</sub> − g: gV<sub>1</sub> was moved from right to left', y22: '1/R<sub>b</sub> + 1/(jωL)', i1: 'V<sub>s</sub>/R<sub>1</sub>', i2: 'no independent source: 0' }[k]),
      onResult: (r) => { if (r.okAll && r.err < 2 && kG.value > 0) { S.fl.d4mat = true; save(); } },
    });
    self.solve = solve;
    return self;
  })();
  XP.d4 = D4;
  steps('d4', [
    { t: 'With <b>g = 0</b> (dependent source inactive), measure and record V<sub>1</sub> and V<sub>2</sub>.', test: () => S.d4rows.some((r) => r.g === 0) },
    { t: 'Set <b>g = 0.5 S</b> and record. How much did V<sub>1</sub> change, and how much did V<sub>2</sub>?', test: () => S.d4rows.some((r) => near(r.g, 0.5, 1e-9)) },
    { t: 'Sweep g over 0–1 S, record at least <b>6 different g</b> values and turn on the theoretical curve.', test: () => new Set(S.d4rows.map((r) => r.g.toFixed(2))).size >= 6 && !!S.fl.d4theo },
    { t: 'With g ≠ 0, enter the <b>dependent-source [Y]</b> matrix and verify it by measurement (Y<sub>12</sub> ≠ Y<sub>21</sub>).', test: () => !!S.fl.d4mat },
  ]);
  const V05 = D4.solve(0.5);
  numq('d4', '#d4Q', { id: 'd4q1', q: 'With g = 0.5 S, what is the amplitude (peak) of V<sub>2</sub> in volts?', answer: cabs(V05[1]), tol: 1.5, unit: 'V', explain: 'Δ = 0.125 − j0.3125; V<sub>2</sub> = 5·0.75/Δ ⇒ |V<sub>2</sub>| ≈ 11.1 V.', hint: 'Voltmeter rms × √2.' });
  numq('d4', '#d4Q', { id: 'd4q2', q: 'With g = 0.5 S, what is the real part of Y<sub>21</sub>?', answer: -0.75, tol: 0, abs: 0.005, unit: 'S', explain: 'Y<sub>21</sub> = −1/R<sub>b</sub> − g = −0.25 − 0.5 = −0.75 S, whereas Y<sub>12</sub> = −0.25 S.', hint: 'Move the gV<sub>1</sub> term to the left-hand side in the node 2 equation.' });
  numq('d4', '#d4Q', { id: 'd4q3', q: 'With g = 0.5 S, what is the voltage gain |V<sub>2</sub>/V<sub>1</sub>|? (from your measurements)', answer: cabs(V05[1]) / cabs(V05[0]), tol: 2, unit: '', explain: 'From the node 2 equation V<sub>2</sub>/V<sub>1</sub> = (0.25 + g)/(0.25 − j0.5) ⇒ 0.75/0.559 = 1.34. In a passive circuit this ratio could not exceed 1.', hint: 'The ratio of the two rms values.' });
  mcq('d4', '#d4Q', { id: 'd4q4', q: 'Why does V<sub>1</sub> also change as g increases? (The dependent source is connected only to node 2.)', opts: ['V<sub>1</sub> does not change', 'When the node 2 voltage changes, it acts back on node 1 through the 4 Ω branch', 'The source voltage changes with g', 'The capacitor depends on g'], correct: 1, explain: 'The source is one-way, but the passive part of the circuit (4 Ω) is bidirectional; this is a feedback path.', hint: 'Y<sub>12</sub> = −0.25 S is still nonzero.' });
  mcq('d4', '#d4Q', { id: 'd4q5', q: 'Which method do the lecture notes recommend for finding the Thevenin impedance of a circuit with a dependent source?', opts: ['Switch off all sources and use series–parallel reduction', 'Switch off the independent sources and connect a test source to the terminals (V<sub>T</sub>/I<sub>T</sub>)', 'Switch off the dependent source as well', 'Measure only the open-circuit voltage'], correct: 1, explain: 'A dependent source cannot be switched off; it is part of the circuit. The test-source method (1.6) is used.', hint: 'A dependent source depends on its controlling variable.' });

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
    const img = (c) => { try { return `<img src="${c.toDataURL()}" style="width:48%;border:1px solid #ccc">`; } catch (e) { return ''; } };
    const tb = (id) => `<table class="data"><thead>${$(id + ' thead').innerHTML}</thead><tbody>${$(id + ' tbody').innerHTML}</tbody></table>`;
    const html = `
      <h2 style="margin:0">Circuit Theory II · Virtual Laboratory · Week 5 Report</h2>
      <p><b>Topic:</b> Nodal and mesh analysis in the sinusoidal steady state, superposition, dependent source (Section 1.7)</p>
      <table class="data" style="width:auto"><tr><th>Full name</th><td class="l">${S.st.name || ''}</td><th>ID</th><td class="l">${S.st.no || ''}</td><th>Group</th><td class="l">${S.st.group || ''}</td><th>Date</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Summary</h3>
      <p>Lab-sheet steps completed: <b>${sOk}/${sTot}</b> · Correct answers: <b>${ok}/${tot}</b> · Score: <b>${Math.round((50 * sOk) / sTot + (50 * ok) / tot)}/100</b></p>
      <h3>Answers</h3>
      <table class="data"><thead><tr><th>Section</th><th>Question</th><th>Answer</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Experiment 1 · Two-source nodal analysis</h3>${tb('#d1tab')}
      <h3>Experiment 2 · Equation builder</h3>${tb('#d2tab')}
      <h3>Experiment 3 · Sources of different frequencies</h3>${tb('#d3tab')}
      <h3>Experiment 4 · Dependent source</h3>${tb('#d4tab')}
      <h3>Plots</h3>
      <div>${img(D1.sc.cv)} ${img(D3.sc.cv)}</div><div>${img($('#d3plot'))} ${img($('#d4plot'))}</div>
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
    if ((e.key === 'r' || e.key === 'R') && XP[S.page]) XP[S.page].rec();
  });

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (S.page === 'onbilgi') OB.frame(dt);
    if (XP[S.page]) { XP[S.page].update(); evalSteps(S.page); }
    requestAnimationFrame(loop);
  }
  ['d1', 'd2', 'd3', 'd4'].forEach(evalSteps);
  go(S.page); progress(); requestAnimationFrame(loop);
})();

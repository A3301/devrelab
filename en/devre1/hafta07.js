/* Devre Kuramı I · Hafta 7 — Seri/paralel L ve C, karşılıklı endüktans, enerji (Bölüm 2.3–2.5) */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd1h07';
  const S = Object.assign({ answers: {}, steps: {}, st: {}, page: 'giris', d1rows: [], d2rows: [], d3rows: [], d4rows: [], d2m: [], d2seen: {} }, Lab.store.load(KEY));
  const rnd = (a) => (Math.random() * 2 - 1) * a;
  if (!S.tol) S.tol = { C: [rnd(0.04), rnd(0.04), rnd(0.04), rnd(0.04)], L: [rnd(0.04), rnd(0.04), rnd(0.04)], P: [rnd(0.03), rnd(0.03)] };
  if (!S.h3) S.h3 = { L1: (30 + Math.random() * 30) * 1e-3, L2: (50 + Math.random() * 60) * 1e-3, k: 0.3 + Math.random() * 0.5, dot: Math.random() < 0.5 ? 'top' : 'bot' };
  Lab.answers = S.answers;
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => Lab.store.save(KEY, S), 300); };
  Lab.onAnswer = () => { save(); progress(); };
  const near = (a, b, t) => Math.abs(a - b) <= t;

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
  function segBtns(parent, list, cur, cb) {
    const wb = document.createElement('div'); wb.className = 'row'; wb.style.cssText = 'gap:4px;margin-bottom:4px';
    wb.innerHTML = list.map(([k, t]) => `<button class="seg-btn${k === cur ? ' on' : ''}" data-k="${k}">${t}</button>`).join('');
    parent.insertBefore(wb, parent.querySelector('.ctrls'));
    $$('button', wb).forEach((b) => (b.onclick = () => { $$('button', wb).forEach((x) => x.classList.toggle('on', x === b)); cb(b.dataset.k); }));
    return wb;
  }
  function btn(parent, txt, cls = 'seg-btn', w = 96) { const b = document.createElement('button'); b.className = cls; b.textContent = txt; b.style.cssText = `min-width:${w}px;padding:8px 4px`; parent.appendChild(b); return b; }

  /* ---------- şema yardımcıları ---------- */
  const sch = {
    w: (g, pts) => E('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'w' }, g),
    dot: (g, x, y) => E('circle', { cx: x, cy: y, r: 3.5, class: 'node' }, g),
    t: (g, x, y, s, cls = 'lbl', anchor = 'middle') => { const e = E('text', { x, y, class: cls, 'text-anchor': anchor }, g); e.innerHTML = s; return e; },
    rH(g, x1, x2, y) { const n = 6, L = 8, step = (x2 - x1 - 2 * L) / n; let d = `M${x1},${y} h${L}`; for (let i = 0; i < n; i++) d += ` l${step / 2},${i % 2 ? 7 : -7} l${step / 2},${i % 2 ? -7 : 7}`; d += ` L${x2},${y}`; return E('path', { d, class: 'w' }, g); },
    gnd(g, x, y) { E('path', { d: `M${x},${y} v8 M${x - 11},${y + 8} h22 M${x - 7},${y + 13} h14 M${x - 3},${y + 18} h6`, class: 'w' }, g); },
    src(g, x, y, r = 20, kind = 'dc') {
      E('circle', { cx: x, cy: y, r, class: 'w', fill: '#fff' }, g);
      if (kind === 'i') E('path', { d: `M${x},${y + 11} v-22 m-6,7 l6,-7 l6,7`, class: 'w' }, g);
      else { sch.t(g, x, y - 4, '+', 'lbl'); sch.t(g, x, y + 13, '−', 'lbl'); }
    },
    term(g, x, y) { E('circle', { cx: x, cy: y, r: 4.5, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g); },
    capH(g, x1, x2, y) { const m = (x1 + x2) / 2; sch.w(g, [[x1, y], [m - 6, y]]); sch.w(g, [[m + 6, y], [x2, y]]); E('path', { d: `M${m - 6},${y - 16} v32 M${m + 6},${y - 16} v32`, class: 'w', 'stroke-width': 3 }, g); },
    capV(g, x, y1, y2) { const m = (y1 + y2) / 2; sch.w(g, [[x, y1], [x, m - 6]]); sch.w(g, [[x, m + 6], [x, y2]]); E('path', { d: `M${x - 16},${m - 6} h32 M${x - 16},${m + 6} h32`, class: 'w', 'stroke-width': 3 }, g); },
    indH(g, x1, x2, y) { const n = 4, L = 10, r = (x2 - x1 - 2 * L) / n / 2; let d = `M${x1},${y} h${L}`; for (let i = 0; i < n; i++) d += ` a${r},${r} 0 0 1 ${2 * r},0`; d += ` L${x2},${y}`; return E('path', { d, class: 'w' }, g); },
    indV(g, x, y1, y2, left) { const n = 4, L = 10, r = (y2 - y1 - 2 * L) / n / 2; let d = `M${x},${y1} v${L}`; for (let i = 0; i < n; i++) d += ` a${r},${r} 0 0 ${left ? 0 : 1} 0,${2 * r}`; d += ` L${x},${y2}`; return E('path', { d, class: 'w' }, g); },
  };

  /* ================= GEZİNME / İLERLEME ================= */
  const pages = ['giris', 'onbilgi', 'onhaz', 'd1', 'd2', 'd3', 'd4', 'rapor'];
  function go(p) {
    S.page = p; save();
    $$('section.page').forEach((s) => s.classList.toggle('active', s.id === p));
    $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.p === p));
    if (p === 'd2') D2.dirty = true;
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
  numq('onhaz', '#preQ', { id: 'p1', q: '1) 3 µF and 6 µF capacitors are connected in series. What is the equivalent capacitance in µF?', answer: 2, tol: 1, unit: 'µF', explain: '1/C = 1/3 + 1/6 = 1/2 → 2 µF. The series equivalent is smaller than even the smallest element.', hint: 'In series the reciprocals add (9 µF is the parallel rule).' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) Example 2.17: 2 µF and 6 µF in series, initially uncharged, 12 V applied. What is the voltage across the 2 µF capacitor in volts?', answer: 9, tol: 1, unit: 'V', explain: 'C<sub>eq</sub> = 1.5 µF, Q = 18 µC → V₁ = 18/2 = 9 V, V₂ = 3 V.', hint: 'In series the charge is shared: Q = C<sub>eq</sub>V.' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) Example 2.21: L₁ = 20 mH, L₂ = 30 mH (uncoupled) in parallel. What is the equivalent inductance in mH?', answer: 12, tol: 1, unit: 'mH', explain: '20·30/50 = 12 mH. In series it would be 50 mH.', hint: 'Inductors behave like resistors.' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) Example 2.24: M = 30 mH, secondary open; i₁ rises linearly from 0 to 1 A in 5 ms (entering the dotted terminal). What is v₂ in volts?', answer: 6, tol: 1, unit: 'V', explain: 'di₁/dt = 200 A/s → v₂ = 0.03 × 200 = 6 V (dotted terminal +).', hint: 'v₂ = M di₁/dt' });
  numq('onhaz', '#preQ', { id: 'p5', q: '5) Example 2.27: L₁ = 40 mH, L₂ = 90 mH, k = 0.50. What is M in mH?', answer: 30, tol: 1, unit: 'mH', explain: '√(40·90) = 60 mH → M = 0.5 × 60 = 30 mH. M can be at most 60 mH.', hint: 'M = k√(L₁L₂)' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) A student reports measuring L₁ = 10 mH, L₂ = 40 mH, M = 25 mH. Is this possible?', opts: ['Yes, M < L₂', 'No, it would give k > 1', 'Yes, k = 0.625', 'Not enough information'], correct: 1, explain: '√(10·40) = 20 mH < 25 mH → k = 1.25 > 1: physically impossible, the measurement is wrong.', hint: 'Compare M with the geometric mean.' });

  /* ================= DENEY 1 · Seri/paralel ================= */
  const W = 2 * Math.PI * 1000;
  const CB = [2e-6, 3e-6, 4e-6, 6e-6], LB = [20e-3, 30e-3, 40e-3];
  const cx = (re, im) => ({ re, im });
  const add = (a, b) => cx(a.re + b.re, a.im + b.im);
  const par = (a, b) => { const nr = a.re * b.re - a.im * b.im, ni = a.re * b.im + a.im * b.re, s = add(a, b), d = s.re * s.re + s.im * s.im; return cx((nr * s.re + ni * s.im) / d, (ni * s.re - nr * s.im) / d); };
  const zC = (C) => cx(0.02, -1 / (W * C)), zL = (L) => cx(60 * L, W * L);
  const D1 = (() => {
    const self = { kind: 'C', topo: 's' };
    const box = $('#d1inst');
    const dr = inst(box, 'COMPONENT DRAWER · CONNECTION', false);
    segBtns(dr.el, [['C', 'Capacitor'], ['L', 'Inductor']], 'C', (k) => { self.kind = k; relist(); });
    segBtns(dr.el, [['a', 'A only'], ['s', 'A–B series'], ['p', 'A ∥ B'], ['m', '(A–B series) ∥ C']], 's', (k) => { self.topo = k; });
    const fmtE = (i) => (self.kind === 'C' ? eng(CB[i], 'F') : eng(LB[i], 'H'));
    const kA = new Lab.Knob(dr.c, { label: 'A', list: [0, 1, 2, 3], value: 1, fmt: fmtE });
    const kB = new Lab.Knob(dr.c, { label: 'B', list: [0, 1, 2, 3], value: 3, fmt: fmtE });
    const kC = new Lab.Knob(dr.c, { label: 'C', list: [0, 1, 2, 3], value: 2, fmt: fmtE });
    function relist() { const L = self.kind === 'C' ? [0, 1, 2, 3] : [0, 1, 2]; [kA, kB, kC].forEach((k) => { k.o.list = L; k.set(Math.min(k.value, L.length - 1), true); }); }
    const lc = inst(box, 'LCR METER · 1 kHz · SERIES', true); const lcL = lcd(lc.el, 'MAIN', '', 150), lcR = lcd(lc.el, 'R<sub>s</sub>', 'Ω', 100);
    const val = (i) => (self.kind === 'C' ? CB[i] * (1 + S.tol.C[i]) : LB[i] * (1 + S.tol.L[i]));
    function compute() {
      const z = (i) => (self.kind === 'C' ? zC(val(i)) : zL(val(i)));
      const used = self.topo === 'a' ? [kA.value] : self.topo === 'm' ? [kA.value, kB.value, kC.value] : [kA.value, kB.value];
      if (new Set(used).size !== used.length) return { err: 'The same component cannot be used in two places' };
      let Z = z(kA.value);
      if (self.topo === 's') Z = add(Z, z(kB.value));
      if (self.topo === 'p') Z = par(Z, z(kB.value));
      if (self.topo === 'm') Z = par(add(Z, z(kB.value)), z(kC.value));
      const main = self.kind === 'C' ? -1 / (W * Z.im) : Z.im / W;
      return { main: main * (1 + rnd(0.001)), R: Z.re, used };
    }
    // ön-şarjlı seri kapasitörler
    const pb = $('#d1pre'), pre = { v1: 0, v2: 0 };
    const C1r = 2e-6 * (1 + S.tol.P[0]), C2r = 6e-6 * (1 + S.tol.P[1]);
    const ps = inst(pb, 'PRE-CHARGE UNIT', true);
    const k1 = new Lab.Knob(ps.c, { label: 'v₁(0)', min: -10, max: 10, step: 0.5, value: 3, dark: true, fmt: (v) => num(v, 1) + ' V' });
    const k2 = new Lab.Knob(ps.c, { label: 'v₂(0)', min: -10, max: 10, step: 0.5, value: 1, dark: true, fmt: (v) => num(v, 1) + ' V' });
    btn(ps.c, 'CHARGE').onclick = () => { pre.v1 = k1.value; pre.v2 = k2.value; pre.Q = 0; Lab.toast('C₁ and C₂ were charged separately and connected in series.'); };
    btn(ps.c, 'DISCHARGE').onclick = () => { pre.v1 = pre.v2 = 0; pre.Q = 0; Lab.toast('Both capacitors were discharged through a resistor.'); };
    const is = inst(pb, 'CONSTANT CURRENT SOURCE', true);
    const kI = new Lab.Knob(is.c, { label: 'I', min: -5, max: 5, step: 0.1, value: 1, dark: true, fmt: (v) => num(v, 1) + ' mA' });
    const kT = new Lab.Knob(is.c, { label: 'Δt', min: 0.5, max: 20, step: 0.5, value: 3, dark: true, fmt: (v) => num(v, 1) + ' ms' });
    btn(is.c, 'APPLY CURRENT', 'seg-btn', 110).onclick = () => { const q = kI.value * 1e-3 * kT.value * 1e-3; pre.v1 += q / C1r; pre.v2 += q / C2r; pre.Q = (pre.Q || 0) + q; Lab.toast(`${num(kI.value, 1)} mA × ${num(kT.value, 1)} ms = ${eng(q, 'C')} of charge passed through the series branch.`); };
    const dm = inst(pb, 'DMM · TERMINAL VOLTAGE', false); const dmL = lcd(dm.el, 'v (a–b)', 'V', 110);
    const dm1 = inst(pb, 'DMM · ACROSS C₁', false); const dm1L = lcd(dm1.el, 'v₁', 'V', 100);
    btn(dm.c, 'Connect to LCR', 'btn small', 90).onclick = () => {
      if (Math.abs(pre.v1) > 0.3 || Math.abs(pre.v2) > 0.3) return Lab.toast('⚠ The capacitors are charged! The LCR meter input will be damaged. DISCHARGE first.', 4500);
      Lab.toast('LCR meter (series C₁–C₂): ' + eng(1 / (1 / C1r + 1 / C2r), 'F') + '. (The LCR meter cannot see the initial voltage.)', 4500);
    };
    // şemalar
    const g = $('#d1sch'), dyn = E('g', {}, g);
    sch.t(g, 60, 30, 'LCR', 'lbl'); sch.term(g, 60, 60); sch.term(g, 60, 190); sch.t(g, 40, 65, 'a', 'lbl'); sch.t(g, 40, 195, 'b', 'lbl');
    function drawSch() {
      dyn.innerHTML = '';
      const el = (x1, x2, y, lab) => { (self.kind === 'C' ? sch.capH : sch.indH)(dyn, x1, x2, y); sch.t(dyn, (x1 + x2) / 2, y - 22, lab); };
      const lab = (k, n) => n + ' = ' + fmtE(k.value);
      sch.w(dyn, [[64, 60], [150, 60]]); sch.w(dyn, [[64, 190], [600, 190]]);
      if (self.topo === 'a') { el(150, 300, 60, lab(kA, 'A')); sch.w(dyn, [[300, 60], [600, 60], [600, 190]]); }
      else if (self.topo === 's') { el(150, 300, 60, lab(kA, 'A')); el(330, 480, 60, lab(kB, 'B')); sch.w(dyn, [[300, 60], [330, 60]]); sch.w(dyn, [[480, 60], [600, 60], [600, 190]]); }
      else if (self.topo === 'p') { sch.w(dyn, [[150, 60], [200, 60], [200, 120]]); el(200, 400, 120, ''); sch.t(dyn, 300, 108, lab(kA, 'A')); sch.w(dyn, [[150, 60], [520, 60]]); sch.t(dyn, 600, 40, ''); el(400, 560, 60, lab(kB, 'B')); sch.w(dyn, [[400, 120], [600, 120]]); sch.w(dyn, [[560, 60], [600, 60], [600, 190]]); sch.dot(dyn, 600, 120); sch.dot(dyn, 200, 60); }
      else { el(150, 280, 60, lab(kA, 'A')); el(300, 430, 60, lab(kB, 'B')); sch.w(dyn, [[280, 60], [300, 60]]); sch.w(dyn, [[430, 60], [600, 60], [600, 190]]); sch.w(dyn, [[120, 60], [120, 130], [250, 130]]); el(250, 450, 130, ''); sch.t(dyn, 350, 158, lab(kC, 'C')); sch.w(dyn, [[450, 130], [600, 130]]); sch.dot(dyn, 120, 60); sch.dot(dyn, 600, 130); }
    }
    const g2 = $('#d1sch2');
    sch.src(g2, 70, 95, 20, 'i'); sch.t(g2, 70, 140, 'I', 'lbl');
    sch.w(g2, [[70, 75], [70, 40], [200, 40]]); sch.capH(g2, 200, 300, 40); sch.capH(g2, 330, 430, 40); sch.w(g2, [[300, 40], [330, 40]]);
    sch.w(g2, [[430, 40], [520, 40], [520, 150], [70, 150], [70, 115]]); sch.t(g2, 250, 22, 'C₁ = 2 µF'); sch.t(g2, 380, 22, 'C₂ = 6 µF');
    const t1 = sch.t(g2, 250, 76, '', 'val'), t2 = sch.t(g2, 380, 76, '', 'val'), tv = sch.t(g2, 560, 100, '', 'val', 'start');
    sch.t(g2, 224, 60, '+'); sch.t(g2, 354, 60, '+');

    let last = '';
    self.update = () => {
      const r = compute(); self.r = r;
      if (r.err) { lcL('----', ''); lcR('—'); }
      else if (self.kind === 'C') { lcL(num(r.main * 1e6, 3), 'µF'); lcR(num(Math.abs(r.R), 3)); }
      else { lcL(num(r.main * 1e3, 2), 'mH'); lcR(num(r.R, 2)); }
      const key = self.kind + self.topo + kA.value + kB.value + kC.value;
      if (key !== last) { last = key; drawSch(); }
      dmL(num(pre.v1 + pre.v2, 3)); dm1L(num(pre.v1, 3));
      t1.textContent = 'v₁ = ' + num(pre.v1, 2) + ' V'; t2.textContent = 'v₂ = ' + num(pre.v2, 2) + ' V'; tv.textContent = 'v = ' + num(pre.v1 + pre.v2, 2) + ' V';
    };
    const TN = { a: 'single', s: 'series', p: 'parallel', m: '(A–B)∥C' };
    const tbody = $('#d1tab tbody');
    function table() { tbody.innerHTML = S.d1rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.kind}</td><td>${r.topo}</td><td>${r.A}</td><td>${r.B}</td><td>${r.C}</td><td>${r.read}</td><td>${r.R}</td></tr>`).join(''); }
    self.rec = () => {
      const r = compute(); if (r.err) return Lab.toast(r.err);
      const n = (k) => fmtE(k.value);
      S.d1rows.push({ kind: self.kind === 'C' ? 'C' : 'L', topo: TN[self.topo], ti: self.topo, idx: r.used, A: n(kA), B: self.topo === 'a' ? '—' : n(kB), C: self.topo === 'm' ? n(kC) : '—', read: self.kind === 'C' ? num(r.main * 1e6, 3) + ' µF' : num(r.main * 1e3, 2) + ' mH', R: num(Math.abs(r.R), 2) + ' Ω' });
      save(); table(); Lab.toast('Recorded: ' + S.d1rows[S.d1rows.length - 1].read);
    };
    self.recPre = () => {
      S.d1rows.push({ kind: 'pre-charge', topo: 'series C₁–C₂', ti: 'pre', A: 'v₁=' + num(pre.v1, 2) + ' V', B: 'v₂=' + num(pre.v2, 2) + ' V', C: 'ΣQ=' + eng(pre.Q || 0, 'C'), read: 'v=' + num(pre.v1 + pre.v2, 3) + ' V', R: '—', v: pre.v1 + pre.v2, q: pre.Q || 0, v10: k1.value, v20: k2.value });
      save(); table(); Lab.toast('Pre-charge measurement recorded.');
    };
    btn(dm1.c, 'Record', 'btn small', 70).onclick = self.recPre;
    $('#d1rec').onclick = self.rec;
    $('#d1del').onclick = () => { S.d1rows.pop(); save(); table(); };
    $('#d1csv').onclick = () => Lab.downloadCSV('hafta7_deney1.csv', ['#', 'type', 'connection', 'A', 'B', 'C', 'reading', 'Rs'], S.d1rows.map((r, i) => [i + 1, r.kind, r.topo, r.A, r.B, r.C, r.read, r.R]));
    table();
    return self;
  })();

  const hasRow = (kind, ti, idx) => S.d1rows.some((r) => r.kind === kind && r.ti === ti && r.idx && r.idx.length === idx.length && (ti === 's' || ti === 'p' ? [...r.idx].sort().join() === [...idx].sort().join() : r.idx.join() === idx.join()));
  steps('d1', [
    { t: 'Measure and record the four capacitors (2, 3, 4, 6 µF) <b>one by one</b> (“A only”). Note their tolerances.', test: () => [0, 1, 2, 3].every((i) => hasRow('C', 'a', [i])) },
    { t: 'Connect <b>3 µF and 6 µF in series</b>, measure and record. Is the result larger or smaller than the smallest element?', test: () => hasRow('C', 's', [1, 3]) },
    { t: 'Example 2.18: set up and measure the mixed connection <b>(3 µF – 6 µF series) ∥ 4 µF</b>.', test: () => S.d1rows.some((r) => r.kind === 'C' && r.ti === 'm' && [r.idx[0], r.idx[1]].sort().join() === '1,3' && r.idx[2] === 2) },
    { t: 'For inductors, measure and record <b>20 mH and 30 mH</b> first in series, then in parallel. Look at the winding resistances too.', test: () => hasRow('L', 's', [0, 1]) && hasRow('L', 'p', [0, 1]) },
    { t: 'On the pre-charge unit set <b>v₁(0) = 3 V, v₂(0) = 1 V</b> and press CHARGE; read the terminal voltage and record it (KVL).', test: () => S.d1rows.some((r) => r.ti === 'pre' && near(r.v10, 3, 0.01) && near(r.v20, 1, 0.01) && !r.q && near(r.v, 4, 0.05)) },
    { t: 'Then apply a current of <b>1 mA for 3 ms</b> and record again. Compare Δv with C<sub>eq</sub>.', test: () => S.d1rows.some((r) => r.ti === 'pre' && near(r.v10, 3, 0.01) && near(r.v20, 1, 0.01) && near(r.q, 3e-6, 1e-8)) },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: 'Using the 3 µF and 6 µF values you measured individually, calculate the series equivalent (µF). Does it agree with your series measurement?', answer: () => { const a = 3 * (1 + S.tol.C[1]), b = 6 * (1 + S.tol.C[3]); return (a * b) / (a + b); }, tol: 1.5, unit: 'µF', explain: 'C<sub>eq</sub> = C₁C₂/(C₁+C₂); nominally 2 µF. Using the measured values also explains the tolerance difference.', hint: 'Use the single-element values you measured yourself.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'Example 2.18: what is the nominal C<sub>ab</sub> in µF for (3 µF – 6 µF series) ∥ 4 µF?', answer: 6, tol: 1, unit: 'µF', explain: 'The series branch is 2 µF; in parallel with 4 µF it gives 6 µF.', hint: 'Work from the inside out: reduce the series branch first.' });
  numq('d1', '#d1Q', { id: 'd1q3', q: 'What is the nominal equivalent of 20 mH and 30 mH in parallel, in mH?', answer: 12, tol: 1, unit: 'mH', explain: '20·30/50 = 12 mH. The measurement differs slightly because of winding resistances and tolerance.', hint: 'Product over sum' });
  numq('d1', '#d1Q', { id: 'd1q4', q: 'C₁ = 2 µF (v₁(0) = 3 V) and C₂ = 6 µF (v₂(0) = 1 V) in series. When 1 mA is applied for 3 ms, what is the terminal voltage in volts (nominal)?', answer: 6, tol: 2, unit: 'V', explain: 'v(0) = 4 V (KVL), C<sub>eq</sub> = 1.5 µF → Δv = 3 µC / 1.5 µF = 2 V → 6 V.', hint: 'v = v(0) + (1/C<sub>eq</sub>)·I·Δt, v(0) = v₁(0)+v₂(0).' });
  mcq('d1', '#d1Q', { id: 'd1q5', q: '2 µF/16 V and 4 µF/16 V are connected in series and 30 V is applied. Is it safe?', opts: ['Yes, 30 < 32', 'No: the 2 µF one sees 20 V and breaks down', 'No: the 4 µF one sees 20 V', 'Yes, each sees 15 V'], correct: 1, explain: 'Q = (4/3 µF)(30 V) = 40 µC → V₁ = 20 V > 16 V. The smaller capacitance takes the larger voltage.', hint: 'In series the charge is shared.' });
  mcq('d1', '#d1Q', { id: 'd1q6', q: 'If you could measure the pre-charged series C₁–C₂ pair with the LCR meter (without discharging), could you read the initial voltage?', opts: ['Yes, the LCR meter also shows v(0)', 'No; the LCR meter measures only C<sub>eq</sub> with a small AC signal. The initial voltage is measured separately with a voltmeter (and a charged capacitor damages the instrument)', 'Only for inductors', 'Only in a parallel connection'], correct: 1, explain: 'Equivalent circuit: C<sub>eq</sub> in series with a v(0) voltage source.', hint: 'What does the LCR meter measure?' });

  /* ================= DENEY 2 · Karşılıklı endüktans ================= */
  const L1 = 40e-3, L2 = 90e-3;
  const kGap = (g) => 0.92 * Math.exp(-g / 9);
  const VDIV = [1e-3, 2e-3, 5e-3, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20];
  const TDIV = [1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2, 2e-2, 5e-2];
  const D2 = (() => {
    const self = { dirty: true, wave: 'tri', rev: false };
    const set = () => (self.dirty = true);
    const box = $('#d2inst');
    const fg = inst(box, 'V→I CURRENT SOURCE · i₁', true, 'function generator + power stage'); const fgL = lcd(fg.el, 'WAVE · f · I<sub>pp</sub>', '', 200);
    segBtns(fg.el, [['tri', '△ Triangle'], ['sin', '∿ Sine'], ['trap', '⊓ Trapezoid'], ['dc', '— DC']], 'tri', (k) => { self.wave = k; if (k === 'dc') S.d2seen.dc = true; set(); });
    const kf = new Lab.Knob(fg.c, { label: 'Frequency', min: 10, max: 2000, log: true, value: 200, dark: true, fmt: (v) => eng(v, 'Hz'), onChange: set });
    const ka = new Lab.Knob(fg.c, { label: 'I_pp', min: 0.05, max: 2, step: 0.01, value: 0.5, dark: true, fmt: (v) => num(v, 2) + ' App', onChange: set });
    const cl = inst(box, 'COIL ASSEMBLY', false, 'L₁ = 40 mH · L₂ = 90 mH');
    const kg = new Lab.Knob(cl.c, { label: 'Spacing', min: 1, max: 25, step: 0.5, value: 8, fmt: (v) => num(v, 1) + ' mm', onChange: set });
    const bR = btn(cl.c, 'CH2 probe: 2→+', 'seg-btn', 120); bR.onclick = () => { self.rev = !self.rev; bR.textContent = self.rev ? 'CH2 probe: 2’→+' : 'CH2 probe: 2→+'; set(); };
    const scope = new Lab.Scope($('#scope'));
    const sk = $('#scopeKnobs');
    const k1 = new Lab.Knob(sk, { label: 'CH1 V/div', list: VDIV, value: 0.2, dark: true, size: 44, fmt: (v) => eng(v, 'V'), onChange: (v) => { scope.ch[0].vdiv = v; set(); } });
    const k2 = new Lab.Knob(sk, { label: 'CH2 V/div', list: VDIV, value: 2, dark: true, size: 44, fmt: (v) => eng(v, 'V'), onChange: (v) => { scope.ch[1].vdiv = v; set(); } });
    const kt = new Lab.Knob(sk, { label: 'TIME/div', list: TDIV, value: 1e-3, dark: true, size: 44, fmt: (v) => eng(v, 's'), onChange: (v) => { scope.tdiv = v; set(); } });
    scope.ch[0].vdiv = 0.2; scope.ch[1].vdiv = 2; scope.tdiv = 1e-3; scope.ch[0].pos = 2; scope.ch[1].pos = -1.5;
    const tog = (id, f) => ($(id).onclick = (e) => { f(); e.target.classList.toggle('on'); set(); });
    tog('#ch1on', () => (scope.ch[0].on = !scope.ch[0].on));
    tog('#ch2on', () => (scope.ch[1].on = !scope.ch[1].on));
    tog('#curon', () => (scope.cur.on = !scope.cur.on));
    $('#scope').addEventListener('pointermove', () => scope.cur.drag && showMeas(scope.measure()));
    // şema
    const g = $('#d2sch');
    sch.src(g, 70, 120, 20, 'i'); sch.w(g, [[70, 100], [70, 50], [230, 50], [230, 70]]); sch.indV(g, 230, 70, 170, true); sch.w(g, [[230, 170], [230, 200], [160, 200]]);
    sch.rH(g, 100, 160, 200); sch.w(g, [[100, 200], [70, 200], [70, 140]]); sch.t(g, 130, 222, '1 Ω shunt'); sch.dot(g, 160, 200); sch.term(g, 160, 175); sch.t(g, 160, 165, 'CH1').style.fill = '#b8960a';
    sch.gnd(g, 100, 200);
    E('circle', { cx: 216, cy: 72, r: 5, fill: '#222' }, g); sch.t(g, 200, 120, 'L₁', 'lbl', 'end');
    const core = E('g', {}, g);
    sch.indV(g, 420, 70, 170, false); E('circle', { cx: 434, cy: 72, r: 5, fill: '#222' }, g); sch.t(g, 446, 120, 'L₂', 'lbl', 'start');
    sch.w(g, [[420, 70], [420, 50], [540, 50]]); sch.w(g, [[420, 170], [420, 200], [540, 200]]); sch.term(g, 544, 50); sch.term(g, 544, 200);
    sch.t(g, 560, 55, '2 (dotted)', 'lbl', 'start'); sch.t(g, 560, 205, '2’', 'lbl', 'start');
    const tProbe = sch.t(g, 600, 130, '', 'val', 'start'), tGap = sch.t(g, 325, 225, '', 'val'), tI = sch.t(g, 120, 40, '', 'val');
    function drawCore() { core.innerHTML = ''; const gp = kg.value * 3; E('rect', { x: 250, y: 60, width: 160, height: 120, rx: 6, fill: 'none', stroke: '#bbb', 'stroke-width': 6 }, core); E('rect', { x: 325 - gp / 2, y: 54, width: gp, height: 132, fill: '#fdfdfb' }, core); }

    // akım dalgası ve türevi (birim genlik)
    function wv(x) {
      const ph = x - Math.floor(x);
      if (self.wave === 'dc') return [1, 0];
      if (self.wave === 'sin') return [Math.sin(2 * Math.PI * ph), 2 * Math.PI * Math.cos(2 * Math.PI * ph)];
      if (self.wave === 'tri') return ph < 0.25 ? [4 * ph, 4] : ph < 0.75 ? [2 - 4 * ph, -4] : [4 * ph - 4, 4];
      const r = 0.04; // yamuk: kenar süresi periyodun %4’ü
      if (ph < r) return [-1 + (2 * ph) / r, 2 / r];
      if (ph < 0.5) return [1, 0];
      if (ph < 0.5 + r) return [1 - (2 * (ph - 0.5)) / r, -2 / r];
      return [-1, 0];
    }
    const Mval = () => kGap(kg.value) * Math.sqrt(L1 * L2);
    function sim() {
      const n = 1000, T = scope.tdiv * 10, dt = T / (n - 1), f = kf.value, A = ka.value / 2, M = Mval(), s = self.rev ? -1 : 1;
      const y1 = new Float64Array(n), y2 = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const t = i * dt - scope.tdiv, [w, dw] = wv(f * t);
        y1[i] = A * w + rnd(1e-3);
        y2[i] = s * M * A * dw * f + rnd(2e-3);
      }
      return { n, y: [y1, y2] };
    }
    function showMeas(m) {
      if (!m) return;
      const [a, b] = m.ch;
      let h = `<span style="color:#f2d21b">CH1</span> Vpp ${eng(a.vpp, 'V')}<br>f ${isFinite(a.f) ? eng(a.f, 'Hz') : '—'}<br><span style="color:#27c4f0">CH2</span> Vpp ${eng(b.vpp, 'V')}<br>max ${eng(b.max, 'V')} · min ${eng(b.min, 'V')}`;
      if (m.cur) h += `<br><span style="color:#ff7cf0">CURSOR</span> Δt ${eng(m.cur.dt, 's')}<br>ΔV(CH1) ${eng(m.cur.v1b - m.cur.v1a, 'V')}<br>CH2(a) ${eng(m.cur.v2a, 'V')} · CH2(b) ${eng(m.cur.v2b, 'V')}`;
      $('#scopeMeas').innerHTML = h; self.meas = m;
    }
    let lastGap = -1;
    self.update = () => {
      if (!self.dirty) return; self.dirty = false;
      const wn = { tri: 'triangle', sin: 'sine', trap: 'trapezoid', dc: 'DC' }[self.wave];
      fgL(`${wn} · ${eng(kf.value, 'Hz')} · ${num(ka.value, 2)} App`);
      if (kg.value !== lastGap) { lastGap = kg.value; drawCore(); }
      tGap.textContent = 'spacing = ' + num(kg.value, 1) + ' mm'; tI.textContent = 'i₁ (' + wn + ')';
      tProbe.textContent = self.rev ? 'CH2 on terminal 2’ (reversed!)' : 'CH2 on terminal 2 (dotted)';
      if (self.wave === 'sin') S.d2seen.sin = true;
      scope.draw(sim()); showMeas(scope.measure());
    };
    const WN = { tri: 'triangle', sin: 'sine', trap: 'trapezoid', dc: 'DC' };
    const tbody = $('#d2tab tbody');
    function table() { tbody.innerHTML = S.d2rows.map((r, i) => `<tr><td>${i + 1}</td><td>${WN[r.w]}${r.rev ? ' (probe reversed)' : ''}</td><td>${eng(r.f, 'Hz')}</td><td>${num(r.ipp, 2)}</td><td>${num(r.gap, 1)}</td><td>${eng(r.v1, 'V')}</td><td>${eng(r.v2, 'V')}</td><td>${eng(r.mx, 'V')}</td></tr>`).join(''); }
    self.rec = () => {
      const m = scope.measure(); if (!m) return;
      S.d2rows.push({ w: self.wave, rev: self.rev, f: kf.value, ipp: ka.value, gap: kg.value, v1: m.ch[0].vpp, v2: m.ch[1].vpp, mx: m.ch[1].max });
      save(); table(); Lab.toast(`Recorded (#${S.d2rows.length}): CH2 ${eng(m.ch[1].vpp, 'Vpp')}`);
    };
    $('#d2rec').onclick = self.rec;
    $('#d2del').onclick = () => { S.d2rows.pop(); save(); table(); };
    $('#d2csv').onclick = () => Lab.downloadCSV('hafta7_deney2.csv', ['#', 'waveform', 'f (Hz)', 'Ipp (A)', 'spacing (mm)', 'CH1 Vpp (V)', 'CH2 Vpp (V)', 'CH2 max (V)'], S.d2rows.map((r, i) => [i + 1, WN[r.w] + (r.rev ? ' reversed' : ''), r.f, r.ipp, r.gap, +r.v1.toPrecision(4), +r.v2.toPrecision(4), +r.mx.toPrecision(4)]));
    const plot = new Lab.Plot($('#d2plot'), { xlabel: 'spacing  (mm)', ylabel: 'M  (mH)' });
    function drawPlot() { plot.draw([{ pts: S.d2m.map((p) => [p[0], p[1]]).sort((a, b) => a[0] - b[0]), dots: true, line: true, color: '#0b5cad' }], [0, 26], [0, 60]); }
    $('#d2madd').onclick = () => {
      const i = parseInt($('#d2row').value, 10) - 1, m = Lab.parse($('#d2m').value), r = S.d2rows[i];
      if (!r || !isFinite(m)) return Lab.toast('Enter a valid row number and M value.');
      if (r.w !== 'tri') return Lab.toast('Calculate M from a triangular-current row (constant slope).');
      const ref = kGap(r.gap) * 60;
      S.d2m.push([r.gap, m]); save(); drawPlot();
      Lab.toast(Math.abs(m - ref) / ref < 0.06 ? '✔ Added to the plot; the value looks consistent.' : '⚠ Added, but this value looks inconsistent with your measurement: check the calculation M = V₂,peak / (2·I<sub>pp</sub>·f).', 3500);
    };
    $('#d2mclr').onclick = () => { S.d2m = []; save(); drawPlot(); };
    table(); drawPlot();
    Object.assign(self, { kf, ka, kg, k2, scope, plotCanvas: $('#d2plot') });
    return self;
  })();

  steps('d2', [
    { t: 'Set the current source to <b>triangle, 100 Hz, 1 App</b>. You should see a square wave on CH2 (secondary).', test: () => D2.wave === 'tri' && near(D2.kf.value, 100, 3) && near(D2.ka.value, 1, 0.01) },
    { t: 'Turn on the CURSORs: read the sign of v₂ while i₁ is <b>increasing</b> and <b>decreasing</b> (dot convention). Record a measurement.', test: () => D2.scope.cur.on && S.d2rows.some((r) => r.w === 'tri' && !r.rev) },
    { t: 'Connect the CH2 probe <b>reversed</b> (2’→+) and record a measurement. What changed, and what did not?', test: () => S.d2rows.some((r) => r.rev) },
    { t: 'Set the waveform to <b>sine</b> and <b>DC</b> and look at the secondary voltage (battery–transformer question).', test: () => S.d2seen.sin && S.d2seen.dc },
    { t: 'With triangular current, record measurements at <b>at least 4 different spacings</b> (one of them 4 mm).', test: () => new Set(S.d2rows.filter((r) => r.w === 'tri').map((r) => r.gap)).size >= 4 && S.d2rows.some((r) => r.w === 'tri' && r.gap === 4) },
    { t: 'Calculate M from each measurement and add <b>at least 3 points</b> to the M–spacing plot.', test: () => S.d2m.length >= 3 },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'Comparison with Example 2.24: with M = 30 mH and di₁/dt = 200 A/s, what is v₂ in volts? (The slope of a 1 App, 100 Hz triangular current is also 200 A/s.)', answer: 6, tol: 1, unit: 'V', explain: 'v₂ = 0.03 × 200 = 6 V. 1 App, 100 Hz triangle: 1 A / 5 ms = 200 A/s.', hint: 'Each half-period of the triangle is 5 ms.' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'From your measurement at 4 mm spacing, what is M in mH?', answer: () => kGap(4) * 60, tol: 6, unit: 'mH', explain: 'M = V₂,peak / |di₁/dt| = V₂,peak / (2·I<sub>pp</sub>·f).', hint: 'Divide the CH2 peak value (max) by the slope; convert to mH.' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 'What is the coupling coefficient k at 4 mm spacing?', answer: () => kGap(4), tol: 6, unit: '', explain: 'k = M/√(L₁L₂) = M/60 mH.', hint: '√(40·90) = 60 mH' });
  mcq('d2', '#d2Q', { id: 'd2q4', q: 'i₁ enters the dotted terminal and is decreasing; the secondary is open. Is the dotted terminal (2) of the secondary positive or negative?', opts: ['Positive', 'Negative', 'Zero', 'Not enough information'], correct: 1, explain: 'v₂ = M di₁/dt; the dots give +M, a decreasing current gives di₁/dt < 0 → v₂ < 0.', hint: 'What did CH2 show on the falling edge of the triangle on the oscilloscope?' });
  mcq('d2', '#d2Q', { id: 'd2q5', q: 'A 12 V battery is connected to the primary of a transformer; the current soon settles at a constant 2 A. What is the secondary voltage in steady state?', opts: ['12 V', 'Proportional to the turns ratio', '0 V', 'Infinite'], correct: 2, explain: 'Constant current → di₁/dt = 0 → v₂ = 0. You saw this with the DC waveform.', hint: 'What did CH2 show in the DC setting?' });
  mcq('d2', '#d2Q', { id: 'd2q6', q: 'With a sinusoidal current, what is the phase relation between v₂ and i₁ (probe 2→+)?', opts: ['In phase', 'v₂ leads i₁ by 90° (cosine)', 'v₂ lags i₁ by 90°', '180°'], correct: 1, explain: 'v₂ = M·ωI cos ωt: the derivative of the current.', hint: 'Where is v₂ when the current crosses zero?' });

  /* ================= DENEY 3 · Nokta yönü ================= */
  const D3 = (() => {
    const self = { cfg: 'L1' };
    const H = S.h3, M = H.k * Math.sqrt(H.L1 * H.L2);
    const box = $('#d3inst');
    const bx = inst(box, 'CONNECTION', false);
    segBtns(bx.el, [['L1', 'Winding 1 only (1–1’)'], ['L2', 'Winding 2 only (2–2’)'], ['A', 'Series A: 1’–2 joined'], ['B', 'Series B: 1’–2’ joined']], 'L1', (k) => { self.cfg = k; draw(); });
    const lc = inst(box, 'LCR METER · 1 kHz · SERIES', true); const lcL = lcd(lc.el, 'L<sub>s</sub>', 'mH', 130), lcR = lcd(lc.el, 'R<sub>s</sub>', 'Ω', 90);
    const noise = {};
    function read() {
      const c = self.cfg, aid = (c === 'A') === (H.dot === 'top') ? 1 : -1;
      const L = c === 'L1' ? H.L1 : c === 'L2' ? H.L2 : H.L1 + H.L2 + 2 * aid * M;
      if (noise[c] == null) noise[c] = rnd(0.002);
      const R = c === 'L1' ? 60 * H.L1 : c === 'L2' ? 60 * H.L2 : 60 * (H.L1 + H.L2);
      return { L: L * (1 + noise[c]), R };
    }
    const g = $('#d3sch'), dyn = E('g', {}, g);
    const coil = (x, lab, dotKnown) => {
      sch.indV(g, x, 70, 170, x < 300); sch.t(g, x + (x < 300 ? -40 : 40), 125, lab);
      if (dotKnown) E('circle', { cx: x - 14, cy: 72, r: 5, fill: '#222' }, g);
      else { sch.t(g, x + 16, 72, '?', 'val').style.fill = '#c62828'; sch.t(g, x + 16, 176, '?', 'val').style.fill = '#c62828'; }
    };
    coil(240, 'winding 1', true); coil(420, 'winding 2', false);
    E('rect', { x: 290, y: 60, width: 80, height: 120, fill: '#e3e0d6', stroke: '#aaa', rx: 6 }, g); sch.t(g, 330, 125, 'unlabelled', 'lbl').style.fontSize = '11px';
    sch.t(g, 225, 58, '1', 'val'); sch.t(g, 225, 196, '1’', 'val'); sch.t(g, 438, 58, '2', 'val'); sch.t(g, 438, 196, '2’', 'val');
    function draw() {
      dyn.innerHTML = ''; const c = self.cfg;
      const lead = (pts) => sch.w(dyn, pts);
      sch.t(dyn, 80, 120, 'LCR', 'lbl'); sch.term(dyn, 100, 40); sch.term(dyn, 100, 210);
      if (c === 'L1') { lead([[100, 40], [240, 40], [240, 70]]); lead([[100, 210], [240, 210], [240, 170]]); }
      else if (c === 'L2') { lead([[100, 40], [420, 40], [420, 70]]); lead([[100, 210], [420, 210], [420, 170]]); }
      else if (c === 'A') { lead([[100, 40], [240, 40], [240, 70]]); lead([[240, 170], [240, 195], [330, 195], [330, 30], [420, 30], [420, 70]]); lead([[100, 225], [500, 225], [500, 170], [420, 170]]); }
      else { lead([[100, 40], [240, 40], [240, 70]]); lead([[240, 170], [240, 200], [420, 200], [420, 170]]); lead([[100, 225], [500, 225], [500, 70], [420, 70]]); }
      if (c === 'A' || c === 'B') { E('path', { d: 'M100,225 V210', class: 'w' }, dyn); }
    }
    const CN = { L1: 'winding 1', L2: 'winding 2', A: 'series A (1’–2)', B: 'series B (1’–2’)' }, TN = { L1: '1–1’', L2: '2–2’', A: '1–2’', B: '1–2' };
    self.update = () => { const r = read(); lcL(num(r.L * 1e3, 2)); lcR(num(r.R, 2)); };
    const tbody = $('#d3tab tbody');
    function table() { tbody.innerHTML = S.d3rows.map((r, i) => `<tr><td>${i + 1}</td><td>${CN[r.c]}</td><td>${TN[r.c]}</td><td>${num(r.L * 1e3, 2)}</td><td>${num(r.R, 2)}</td></tr>`).join(''); }
    self.rec = () => { const r = read(); S.d3rows.push({ c: self.cfg, L: r.L, R: r.R }); save(); table(); Lab.toast('Recorded: ' + CN[self.cfg] + ' → ' + num(r.L * 1e3, 2) + ' mH'); };
    $('#d3rec').onclick = self.rec;
    $('#d3del').onclick = () => { S.d3rows.pop(); save(); table(); };
    $('#d3csv').onclick = () => Lab.downloadCSV('hafta7_deney3.csv', ['#', 'connection', 'LCR terminals', 'L (mH)', 'Rs (ohm)'], S.d3rows.map((r, i) => [i + 1, CN[r.c], TN[r.c], +(r.L * 1e3).toFixed(3), +r.R.toFixed(3)]));
    table(); draw();
    self.M = M;
    return self;
  })();

  steps('d3', [
    { t: 'Measure and record winding 1 and winding 2 <b>separately</b> (L₁, L₂).', test: () => ['L1', 'L2'].every((c) => S.d3rows.some((r) => r.c === c)) },
    { t: 'Measure and record the <b>Series A</b> connection (1’ joined to 2).', test: () => S.d3rows.some((r) => r.c === 'A') },
    { t: 'Measure and record the <b>Series B</b> connection (1’ joined to 2’). Which one is larger?', test: () => S.d3rows.some((r) => r.c === 'B') },
    { t: 'Determine the <b>dotted terminal</b> of winding 2 (question 1).', test: () => S.answers.d3q1 && S.answers.d3q1.ok },
    { t: 'Calculate M and k; check that L₊ + L₋ = 2(L₁ + L₂).', test: () => ['d3q2', 'd3q3'].every((q) => S.answers[q] && S.answers[q].ok) },
  ]);
  mcq('d3', '#d3Q', { id: 'd3q1', q: 'According to your measurements, which is the dotted terminal of winding 2? (The dot of winding 1 is at terminal 1.)', opts: ['2 (top terminal)', '2’ (bottom terminal)'], correct: S.h3.dot === 'top' ? 0 : 1, explain: 'The connection with the larger reading is the aiding one: the current enters at 1, and the dot is at whichever terminal it enters the second winding through. In series A the current enters at 2; in series B it enters at 2’, not 2.', hint: 'Series A: 1→1’→2→2’. Which connection gave the larger reading?' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'From your measurements, what is the mutual inductance M in mH?', answer: () => D3.M * 1e3, tol: 4, unit: 'mH', explain: 'M = (L₊ − L₋)/4.', hint: 'The difference is 4M, not 2M.' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'What is the coupling coefficient k?', answer: () => S.h3.k, tol: 5, unit: '', explain: 'k = M/√(L₁L₂); using the L₁ and L₂ you measured on their own.', hint: 'Take L₁ and L₂ from the separate measurements.' });
  numq('d3', '#d3Q', { id: 'd3q4', q: 'Example 2.28: L₁ = 40 mH, L₂ = 90 mH, M = 30 mH. What is the series-aiding equivalent L₊ in mH?', answer: 190, tol: 0.5, unit: 'mH', explain: '40 + 90 + 60 = 190 mH; 70 mH in the opposing connection.', hint: 'L₁+L₂+2M' });
  mcq('d3', '#d3Q', { id: 'd3q5', q: 'L₊ = 190 mH and L₋ = 70 mH were measured. A student found M = (190−70)/2 = 60 mH. What is the mistake?', opts: ['There is no mistake', 'The difference is 4M: M = 30 mH. 60 mH would mean k = 1 (suspicious)', 'The difference is M: 120 mH', 'L₋ was measured wrongly'], correct: 1, explain: 'L₊ − L₋ = (+2M) − (−2M) = 4M.', hint: 'Subtract the two formulas.' });

  /* ================= DENEY 4 · Enerji ve k ≤ 1 ================= */
  const D4 = (() => {
    const self = { w: null };
    const box = $('#d4inst');
    const reset = () => { self.w = null; };
    const ka = inst(box, 'COIL ASSEMBLY · k', false);
    const kk = new Lab.Knob(ka.c, { label: 'k', min: 0, max: 1.2, step: 0.01, value: 0.5, fmt: (v) => num(v, 2) + (v > 1 ? ' (theoretical!)' : ''), onChange: reset });
    const s1 = inst(box, 'DC CURRENT SOURCE 1', true); const s1L = lcd(s1.el, 'i₁ (+: into the dot)', 'A', 110);
    const kI1 = new Lab.Knob(s1.c, { label: 'i₁', min: -3, max: 3, step: 0.01, value: 2, dark: true, fmt: (v) => num(v, 2) + ' A', onChange: reset });
    const s2 = inst(box, 'DC CURRENT SOURCE 2', true); const s2L = lcd(s2.el, 'i₂ (+: into the dot)', 'A', 110);
    const kI2 = new Lab.Knob(s2.c, { label: 'i₂', min: -3, max: 3, step: 0.01, value: 1, dark: true, fmt: (v) => num(v, 2) + ' A', onChange: reset });
    const em = inst(box, 'ENERGY METER · ∫(v₁i₁+v₂i₂)dt', true); const emL = lcd(em.el, 'w', 'mJ', 130);
    const bB = btn(em.c, 'BUILD CURRENTS IN TURN', 'seg-btn', 170);
    const wTrue = (k, i1, i2) => 0.5 * L1 * i1 * i1 + 0.5 * L2 * i2 * i2 + k * Math.sqrt(L1 * L2) * i1 * i2;
    bB.onclick = () => {
      self.w = wTrue(kk.value, kI1.value, kI2.value) * (1 + rnd(0.003));
      if (self.w < 0) { S.d4neg = true; save(); Lab.toast('⚠ The energy meter gave a NEGATIVE value: a passive network cannot deliver energy without first receiving it from a source. k > 1 is physically impossible!', 6000); }
    };
    const g = $('#d4sch');
    sch.src(g, 80, 110, 20, 'i'); sch.w(g, [[80, 90], [80, 50], [220, 50], [220, 60]]); sch.indV(g, 220, 60, 160, true); sch.w(g, [[220, 160], [220, 180], [80, 180], [80, 130]]);
    E('circle', { cx: 206, cy: 62, r: 5, fill: '#222' }, g); E('circle', { cx: 314, cy: 62, r: 5, fill: '#222' }, g);
    sch.indV(g, 300, 60, 160, false); sch.w(g, [[300, 60], [300, 50], [440, 50], [440, 90]]); sch.w(g, [[300, 160], [300, 180], [440, 180], [440, 130]]); sch.src(g, 440, 110, 20, 'i');
    sch.t(g, 180, 115, 'L₁', 'lbl', 'end'); sch.t(g, 340, 115, 'L₂', 'lbl', 'start'); sch.t(g, 260, 30, '', 'val');
    const t1 = sch.t(g, 150, 40, '', 'val'), t2 = sch.t(g, 380, 40, '', 'val'), tk = sch.t(g, 260, 200, '', 'val'), tw = sch.t(g, 520, 110, '', 'val', 'start');
    const plot = new Lab.Plot($('#d4plot'), { xlabel: 'i₂  (A)', ylabel: 'w  (mJ)' });
    $('#d4theo').onchange = () => (self.pd = true);
    let lastKey = '';
    self.update = () => {
      const k = kk.value, i1 = kI1.value, i2 = kI2.value;
      s1L(num(i1, 2)); s2L(num(i2, 2)); emL(self.w == null ? '----' : num(self.w * 1e3, 1));
      t1.textContent = 'i₁ = ' + num(i1, 2) + ' A'; t2.textContent = 'i₂ = ' + num(i2, 2) + ' A'; tk.textContent = 'k = ' + num(k, 2) + (k > 1 ? ' — NOT PHYSICAL' : '');
      tk.style.fill = k > 1 ? '#c62828' : '#333';
      tw.textContent = self.w == null ? 'w = ? (measure)' : 'w = ' + num(self.w * 1e3, 1) + ' mJ'; tw.style.fill = self.w != null && self.w < 0 ? '#c62828' : '#1a8a4a';
      const key = [k, i1, i2, self.w, $('#d4theo').checked, S.d4rows.length].join();
      if (key !== lastKey) { lastKey = key; drawPlot(); }
    };
    function drawPlot() {
      const k = kk.value, i1 = kI1.value, ser = [];
      if ($('#d4theo').checked) { const p = []; for (let x = -3; x <= 3.0001; x += 0.05) p.push([x, wTrue(k, i1, x) * 1e3]); ser.push({ pts: p, line: true, color: k > 1 ? '#c62828' : '#6a1b9a' }); }
      ser.push({ pts: S.d4rows.filter((r) => r.k === k && r.i1 === i1).map((r) => [r.i2, r.w * 1e3]), dots: true, color: '#e07a10' });
      if (self.w != null) ser.push({ pts: [[kI2.value, self.w * 1e3]], dots: true, color: '#0b5cad' });
      ser.push({ pts: [[-3, 0], [3, 0]], line: true, color: '#999', width: 1 });
      plot.draw(ser, [-3, 3], null);
    }
    const tbody = $('#d4tab tbody');
    function table() { tbody.innerHTML = S.d4rows.map((r, i) => `<tr><td>${i + 1}</td><td>${num(r.k, 2)}</td><td>${num(r.i1, 2)}</td><td>${num(r.i2, 2)}</td><td style="color:${r.w < 0 ? '#c62828' : ''}">${num(r.w * 1e3, 1)}</td></tr>`).join(''); }
    self.rec = () => {
      if (self.w == null) return Lab.toast('First measure the energy with “BUILD CURRENTS IN TURN”.');
      S.d4rows.push({ k: kk.value, i1: kI1.value, i2: kI2.value, w: self.w }); save(); table(); Lab.toast('Recorded: w = ' + num(self.w * 1e3, 1) + ' mJ');
    };
    $('#d4rec').onclick = self.rec;
    $('#d4del').onclick = () => { S.d4rows.pop(); save(); table(); };
    $('#d4csv').onclick = () => Lab.downloadCSV('hafta7_deney4.csv', ['#', 'k', 'i1 (A)', 'i2 (A)', 'w (mJ)'], S.d4rows.map((r, i) => [i + 1, r.k, r.i1, r.i2, +(r.w * 1e3).toFixed(2)]));
    table();
    Object.assign(self, { plotCanvas: $('#d4plot') });
    return self;
  })();

  const r4 = (k, i1, i2, t = 0.005) => S.d4rows.some((r) => near(r.k, k, 0.001) && near(r.i1, i1, 0.005) && near(r.i2, i2, t));
  steps('d4', [
    { t: 'Example 2.30(a): <b>k = 0.50, i₁ = 2 A, i₂ = 1 A</b> (both entering the dots). Measure the energy and record it.', test: () => r4(0.5, 2, 1) },
    { t: 'Example 2.30(b): <b>i₂ = −1 A</b> (leaving the dot). Measure and record. Which term changed?', test: () => r4(0.5, 2, -1) },
    { t: 'With k = 0.50 and i₁ = 2 A, vary i₂ to find the point where the energy is <b>minimum</b> and record it (±0.05 A).', test: () => r4(0.5, 2, -2 * 0.5 * 60 / 90, 0.05) },
    { t: 'Set <b>k = 1.00</b>; with i₁ = 2 A find the i₂ that gives w ≈ 0 and record it. What does this mean?', test: () => S.d4rows.some((r) => near(r.k, 1, 0.001) && near(r.i1, 2, 0.005) && Math.abs(r.w) < 2e-3) },
    { t: 'Raise k <b>above 1</b> (theoretical) and find a current pair that gives negative energy.', test: () => !!S.d4neg },
  ]);
  numq('d4', '#d4Q', { id: 'd4q1', q: 'Example 2.30(a): what is the total energy in mJ?', answer: 185, tol: 1, unit: 'mJ', explain: '80 + 45 + 60 = 185 mJ.', hint: '½L₁i₁² + ½L₂i₂² + Mi₁i₂, M = 30 mH' });
  numq('d4', '#d4Q', { id: 'd4q2', q: 'Example 2.30(b): what is the total energy in mJ when i₂ leaves the dot?', answer: 65, tol: 1, unit: 'mJ', explain: '80 + 45 − 60 = 65 mJ. The self energies do not change; only the sign of the mutual term changes.', hint: 'Mutual term −Mi₁|i₂|' });
  numq('d4', '#d4Q', { id: 'd4q3', q: 'With k = 0.5 and i₁ = 2 A, what is the minimum value of the energy in mJ?', answer: 60, tol: 2, unit: 'mJ', explain: 'w<sub>min</sub> = ½L₁i₁²(1 − k²) = 80 × 0.75 = 60 mJ, at i₂ = −(M/L₂)i₁ = −0.667 A.', hint: 'dw/di₂ = 0' });
  numq('d4', '#d4Q', { id: 'd4q4', q: 'For L₁ = 40 mH and L₂ = 90 mH, what is the largest value M can take, in mH?', answer: 60, tol: 1, unit: 'mH', explain: 'M ≤ √(L₁L₂) = 60 mH (k = 1).', hint: 'Geometric mean' });
  mcq('d4', '#d4Q', { id: 'd4q5', q: 'Why is k > 1 physically impossible?', opts: ['Instruments cannot display it', 'For some current pairs the stored energy would be negative; a passive element cannot deliver energy it has not received from the source', 'The inductors would melt', 'M would become negative'], correct: 1, explain: 'w ≥ 0 for every (i₁, i₂) ⇔ M² ≤ L₁L₂ ⇔ k ≤ 1. In the experiment you read negative energy with k > 1.', hint: 'What did the energy meter show?' });
  mcq('d4', '#d4Q', { id: 'd4q6', q: 'With k = 1 and i₂ = −(M/L₂)i₁ the result was w = 0. What is the physical meaning of this?', opts: ['The inductors are short-circuited', 'With perfect coupling the fluxes of the two windings cancel completely; there is no net flux in the core and hence no energy', 'It is a measurement error', 'The currents are zero'], correct: 1, explain: 'In an ideal transformer the primary and secondary ampere-turns balance each other.', hint: 'Energy is stored in the magnetic field.' });

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
    const tab = (id) => `<table class="data"><thead>${$('#' + id + ' thead').innerHTML}</thead><tbody>${$('#' + id + ' tbody').innerHTML}</tbody></table>`;
    const html = `
      <h2 style="margin:0">Circuit Theory I · Virtual Laboratory · Week 7 Report</h2>
      <p><b>Topic:</b> Series/parallel L and C, mutual inductance, dot convention, coupled energy</p>
      <table class="data" style="width:auto"><tr><th>Full name</th><td class="l">${S.st.name || ''}</td><th>ID</th><td class="l">${S.st.no || ''}</td><th>Group</th><td class="l">${S.st.group || ''}</td><th>Date</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Summary</h3>
      <p>Lab-sheet steps completed: <b>${sOk}/${sTot}</b> · Correct answers: <b>${ok}/${tot}</b> · Score: <b>${Math.round((50 * sOk) / sTot + (50 * ok) / tot)}/100</b></p>
      <h3>Answers</h3>
      <table class="data"><thead><tr><th>Section</th><th>Question</th><th>Answer</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Experiment 1 · Equivalent measurements</h3>${tab('d1tab')}
      <h3>Experiment 2 · Mutual inductance</h3>${tab('d2tab')}
      <h3>Experiment 3 · Series aiding/opposing</h3>${tab('d3tab')}
      <h3>Experiment 4 · Energy</h3>${tab('d4tab')}
      <h3>Plots</h3>
      <div>${img($('#scope'))} ${img(D2.plotCanvas)}</div>
      <div>${img(D4.plotCanvas)}</div>
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
    if (S.page === 'd1') { D1.update(); evalSteps('d1'); }
    if (S.page === 'd2') { D2.update(); evalSteps('d2'); }
    if (S.page === 'd3') { D3.update(); evalSteps('d3'); }
    if (S.page === 'd4') { D4.update(); evalSteps('d4'); }
    requestAnimationFrame(loop);
  }
  ['d1', 'd2', 'd3', 'd4'].forEach(evalSteps);
  go(S.page); progress(); loop();
})();

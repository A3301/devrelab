/* Devre Kuramı I · Hafta 11 — Ardışık anahtarlama, sınırsız tepki, integral alıcı */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd1h11';
  const S = Object.assign({ answers: {}, steps: {}, st: {}, page: 'giris', d1rows: [], d2rows: [], d3rows: [], d1flags: {}, d2flags: {}, d3flags: {} }, Lab.store.load(KEY));
  if (S.vos == null) S.vos = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random()) * 1e-3; // 741 ofseti 1–2 mV
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
  function segBtn(parent, txt, on) { const b = document.createElement('button'); b.className = 'seg-btn' + (on ? ' on' : ''); b.innerHTML = txt; parent.appendChild(b); return b; }

  /* ---------- şema yardımcıları (hafta01’den + L, C, anahtar, bağımlı kaynak) ---------- */
  const sch = {
    w: (g, pts) => E('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'w' }, g),
    dot: (g, x, y) => E('circle', { cx: x, cy: y, r: 3.5, class: 'node' }, g),
    t: (g, x, y, s, cls = 'lbl', anchor = 'middle') => { const e = E('text', { x, y, class: cls, 'text-anchor': anchor }, g); e.innerHTML = s; return e; },
    rH(g, x1, x2, y) { const n = 6, L = 8, step = (x2 - x1 - 2 * L) / n; let d = `M${x1},${y} h${L}`; for (let i = 0; i < n; i++) d += ` l${step / 2},${i % 2 ? 7 : -7} l${step / 2},${i % 2 ? -7 : 7}`; d += ` L${x2},${y}`; E('path', { d, class: 'w' }, g); },
    rV(g, x, y1, y2) { const n = 6, L = 8, step = (y2 - y1 - 2 * L) / n; let d = `M${x},${y1} v${L}`; for (let i = 0; i < n; i++) d += ` l${i % 2 ? 7 : -7},${step / 2} l${i % 2 ? -7 : 7},${step / 2}`; d += ` L${x},${y2}`; E('path', { d, class: 'w' }, g); },
    lV(g, x, y1, y2) { const n = 4, h = (y2 - y1 - 16) / n; let d = `M${x},${y1} v8`; for (let i = 0; i < n; i++) d += ` a${h / 2},${h / 2} 0 0 1 0,${h}`; d += ` L${x},${y2}`; E('path', { d, class: 'w' }, g); },
    cV(g, x, y1, y2) { const m = (y1 + y2) / 2; E('path', { d: `M${x},${y1} V${m - 5} M${x - 16},${m - 5} h32 M${x - 16},${m + 5} h32 M${x},${m + 5} V${y2}`, class: 'w' }, g); },
    cH(g, x1, x2, y) { const m = (x1 + x2) / 2; E('path', { d: `M${x1},${y} H${m - 5} M${m - 5},${y - 15} v30 M${m + 5},${y - 15} v30 M${m + 5},${y} H${x2}`, class: 'w' }, g); },
    gnd(g, x, y) { E('path', { d: `M${x},${y} v8 M${x - 11},${y + 8} h22 M${x - 7},${y + 13} h14 M${x - 3},${y + 18} h6`, class: 'w' }, g); },
    src(g, x, y, r = 20, kind = 'dc') {
      E('circle', { cx: x, cy: y, r, class: 'w', fill: '#fff' }, g);
      if (kind === 'ac') E('path', { d: `M${x - 10},${y} q5,-12 10,0 t10,0`, class: 'w' }, g);
      else { sch.t(g, x, y - 4, '+', 'lbl'); sch.t(g, x, y + 13, '−', 'lbl'); }
    },
    dep(g, x, y) { E('path', { d: `M${x},${y - 22} L${x + 18},${y} L${x},${y + 22} L${x - 18},${y} Z`, class: 'w', fill: '#fff' }, g); E('path', { d: `M${x},${y + 12} V${y - 10} m-5,6 l5,-7 l5,7`, class: 'w' }, g); },
    term(g, x, y) { E('circle', { cx: x, cy: y, r: 4.5, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g); },
    opamp(g, x, yt, h = 110, w = 120) { E('path', { d: `M${x},${yt} L${x},${yt + h} L${x + w},${yt + h / 2} Z`, class: 'w', fill: '#f4f7ff' }, g); },
    sw(g, x1, x2, y) { // yatay anahtar; döndürülen fonksiyon durumu çizer
      const b = E('line', { x1, y1: y, x2, y2: y, class: 'w' }, g);
      [x1, x2].forEach((x) => E('circle', { cx: x, cy: y, r: 3.5, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g));
      return (on) => { b.setAttribute('x2', on ? x2 : x2 - 6); b.setAttribute('y2', on ? y : y - 20); b.style.stroke = on ? '#1a8a4a' : '#c62828'; };
    },
    swV(g, x, y1, y2) {
      const b = E('line', { x1: x, y1, x2: x, y2, class: 'w' }, g);
      [y1, y2].forEach((y) => E('circle', { cx: x, cy: y, r: 3.5, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g));
      return (on) => { b.setAttribute('x2', on ? x : x + 20); b.setAttribute('y2', on ? y2 : y2 - 6); b.style.stroke = on ? '#1a8a4a' : '#c62828'; };
    },
  };

  /* ---------- osiloskop yardımcısı ---------- */
  const VDIV = [1e-3, 2e-3, 5e-3, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
  const TDIV = [1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2, 2e-2, 5e-2, 0.1, 0.2, 0.5, 1];
  const POS = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  function mkScope(host, o) {
    const w = document.createElement('div'); w.className = 'inst dark scopewrap'; w.style.cssText = 'flex:1;min-width:420px';
    w.innerHTML = `<div class="brand"><span>DSO-2C · Digital Oscilloscope</span><span><span class="led on g"></span> <span class="runst">${o.mode || 'RUN'}</span></span></div>
      <div class="row" style="align-items:flex-start;flex-wrap:nowrap"><canvas width="640" height="400" style="width:100%;max-width:640px"></canvas>
      <div style="min-width:160px"><div class="ctrls"></div><div class="row btns" style="margin:6px 0;gap:4px"></div><div class="meas"></div></div></div>`;
    host.appendChild(w);
    const cv = w.querySelector('canvas'), sc = new Lab.Scope(cv), sk = w.querySelector('.ctrls'), bt = w.querySelector('.btns'), me = w.querySelector('.meas');
    const self = { sc, cv, dirty: true, run: true, runEl: w.querySelector('.runst'), led: w.querySelector('.led') };
    const set = () => { self.dirty = true; };
    sc.ch[0].vdiv = o.v1; sc.ch[1].vdiv = o.v2; sc.tdiv = o.t; sc.ch[0].pos = o.p1 || 0; sc.ch[1].pos = o.p2 || 0;
    self.k1 = new Lab.Knob(sk, { label: 'CH1 V/div', list: VDIV, value: o.v1, dark: true, size: 40, fmt: (v) => eng(v, 'V'), onChange: (v) => { sc.ch[0].vdiv = v; set(); } });
    self.k2 = new Lab.Knob(sk, { label: o.l2 || 'CH2 V/div', list: VDIV, value: o.v2, dark: true, size: 40, fmt: o.f2 || ((v) => eng(v, 'V')), onChange: (v) => { sc.ch[1].vdiv = v; set(); } });
    self.kt = new Lab.Knob(sk, { label: 'TIME/div', list: TDIV, value: o.t, dark: true, size: 40, fmt: (v) => eng(v, 's'), onChange: (v) => { sc.tdiv = v; set(); o.onT && o.onT(); } });
    self.kp1 = new Lab.Knob(sk, { label: 'CH1 position', list: POS, value: o.p1 || 0, dark: true, size: 34, fmt: (v) => num(v, 0) + ' div', onChange: (v) => { sc.ch[0].pos = v; set(); } });
    self.kp2 = new Lab.Knob(sk, { label: 'CH2 position', list: POS, value: o.p2 || 0, dark: true, size: 34, fmt: (v) => num(v, 0) + ' div', onChange: (v) => { sc.ch[1].pos = v; set(); } });
    const b1 = segBtn(bt, 'CH1', true), b2 = segBtn(bt, 'CH2', true), bc = segBtn(bt, 'CURSOR', false);
    b1.onclick = () => { sc.ch[0].on = !sc.ch[0].on; b1.classList.toggle('on', sc.ch[0].on); set(); };
    b2.onclick = () => { sc.ch[1].on = !sc.ch[1].on; b2.classList.toggle('on', sc.ch[1].on); set(); };
    bc.onclick = () => { sc.cur.on = !sc.cur.on; bc.classList.toggle('on', sc.cur.on); set(); };
    if (o.runBtn) {
      const br = segBtn(bt, 'RUN/STOP', true);
      br.onclick = () => { self.run = !self.run; br.classList.toggle('on', self.run); self.runEl.textContent = self.run ? 'RUN' : 'STOP'; self.led.classList.toggle('g', self.run); };
    }
    const pre = o.pre !== false;
    self.tc = (x) => (x - (pre ? 1 : 0)) * sc.tdiv; // imleç konumu -> tetikten itibaren zaman
    self.show = () => {
      const m = sc.measure(); if (!m) return; self.m = m;
      const [a, b] = m.ch;
      let h = `<span style="color:#f2d21b">CH1</span> max ${eng(a.max, 'V')}<br>&nbsp;&nbsp;&nbsp;&nbsp;min ${eng(a.min, 'V')}<br><span style="color:#27c4f0">CH2</span> max ${eng(b.max, o.u2 || 'V')}<br>&nbsp;&nbsp;&nbsp;&nbsp;min ${eng(b.min, o.u2 || 'V')}`;
      if (m.cur) {
        const c = m.cur;
        h += `<br><span style="color:#ff7cf0">CURSOR A</span>${pre ? ' t ' + eng(self.tc(sc.cur.a), 's') : ''}<br>&nbsp;CH1 ${eng(c.v1a, 'V')} · CH2 ${eng(c.v2a, o.u2 || 'V')}` +
          `<br><span style="color:#ff7cf0">CURSOR B</span>${pre ? ' t ' + eng(self.tc(sc.cur.b), 's') : ''}<br>&nbsp;CH1 ${eng(c.v1b, 'V')} · CH2 ${eng(c.v2b, o.u2 || 'V')}<br>Δt ${eng(c.dt, 's')}`;
      }
      if (o.extra) h += o.extra(m);
      me.innerHTML = h;
    };
    cv.addEventListener('pointermove', () => sc.cur.drag && self.show());
    cv.addEventListener('pointerdown', () => setTimeout(self.show, 0));
    self.draw = (data) => { sc.draw(data); self.show(); };
    return self;
  }

  /* ================= GEZİNME / İLERLEME ================= */
  const pages = ['giris', 'onbilgi', 'onhaz', 'd1', 'd2', 'd3', 'rapor'];
  function go(p) {
    S.page = p; save();
    $$('section.page').forEach((s) => s.classList.toggle('active', s.id === p));
    $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.p === p));
    if (p === 'd1') D1.dirty = true;
    if (p === 'd2') D2.sc.dirty = true;
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

  [['stName', 'name'], ['stNo', 'no'], ['stGroup', 'group'], ['stDate', 'date'], ['stComment', 'comment']].forEach(([id, k]) => {
    const e = $('#' + id); e.value = S.st[k] || (k === 'date' ? new Date().toLocaleDateString('en-GB') : '');
    e.addEventListener('input', () => { S.st[k] = e.value; save(); });
  });

  /* ================= ÖN HAZIRLIK ================= */
  numq('onhaz', '#preQ', { id: 'p1', q: '1) Example 3.8: 10 V, R<sub>s</sub> = 4 Ω, L = 1 H, R<sub>2</sub> = 2 Ω. After being closed for a long time, S1 opens at t = 0. What is the initial inductor current I<sub>0</sub> in amperes?', answer: 2.5, tol: 1, unit: 'A', explain: 'In steady state the inductor is a short circuit and also shorts the 2 Ω: I<sub>0</sub> = 10/4 = 2.5 A.', hint: 'What does the inductor look like in steady state? Does current flow through the 2 Ω in parallel with it?' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) In the same circuit a 6 Ω resistor is connected in parallel with the 2 Ω at t = 1 s. What is the time constant τ<sub>2</sub> of the second interval in seconds?', answer: 2 / 3, tol: 1.5, unit: 's', explain: 'R<sub>eq</sub> = 6∥2 = 1.5 Ω, τ<sub>2</sub> = 1/1.5 = 0.667 s.', hint: 'τ<sub>2</sub> = L / (R<sub>2</sub> ∥ R<sub>3</sub>)' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) Example 3.9: R = 10 kΩ and the dependent source is 0.3·v mA (g = 0.3 mA/V). What is R<sub>Th</sub> seen from the capacitor terminals, in kΩ?', answer: -5, tol: 1, unit: 'kΩ', explain: 'R<sub>Th</sub> = 1/(1/R − g) = 1/(0.1 − 0.3) mS = −5 kΩ: a negative resistance.', hint: 'Apply v to the terminals; the current drawn is i = v/R − g v.' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) Example 3.22: R<sub>s</sub> = 100 kΩ, C<sub>f</sub> = 0.1 µF, v<sub>o</sub>(0) = 0. v<sub>g</sub> is +1 V for 0–10 ms and 0 V for 10–20 ms. What is v<sub>o</sub> at t = 20 ms in volts?', answer: -1, tol: 1, unit: 'V', explain: '1/(R<sub>s</sub>C<sub>f</sub>) = 100 s<sup>−1</sup>; it falls to −1 V in the first 10 ms, and while the input is zero the output is held in memory.', hint: 'What is the capacitor current while the input is zero?' });
  mcq('onhaz', '#preQ', { id: 'p5', q: '5) The second switching occurs at t<sub>1</sub> and i(t<sub>1</sub>) = I<sub>1</sub>. Which is the correct expression for the second interval?', opts: ['I<sub>1</sub> e<sup>−t/τ<sub>2</sub></sup>', 'I<sub>1</sub> e<sup>−(t−t<sub>1</sub>)/τ<sub>2</sub></sup>', 'I<sub>0</sub> e<sup>−(t−t<sub>1</sub>)/τ<sub>2</sub></sup>', 'I<sub>1</sub> e<sup>−(t−t<sub>1</sub>)/τ<sub>1</sub></sup>'], correct: 1, explain: 'The value I<sub>1</sub> holds at t<sub>1</sub>; the exponential starts at that instant and carries the new circuit’s τ<sub>2</sub>.', hint: 'Setting t = t<sub>1</sub> in the formula must give I<sub>1</sub>.' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) Can R<sub>Th</sub> &lt; 0 occur in a circuit made only of resistors, inductors and capacitors?', opts: ['Yes, if the resistors are chosen suitably', 'No; a passive circuit dissipates energy, so R<sub>Th</sub> &gt; 0. A negative resistance requires a dependent source that pumps energy', 'Only if the capacitor is large'], correct: 1, explain: 'A dependent source (amplifier) can take energy from an external supply and deliver it to the circuit.', hint: 'Where can the energy come from?' });

  /* ================= DENEY 1 · Ardışık anahtarlama ================= */
  const D1 = (() => {
    const self = { t: -0.5, run: false, dirty: true, T0: -0.5, T1: 5 };
    const box = $('#d1inst');
    const ps = inst(box, 'DC SUPPLY · V<sub>s</sub>'); const psL = lcd(ps.el, 'V<sub>s</sub>', 'V', 90);
    const kV = new Lab.Knob(ps.c, { label: 'V_s', min: 0, max: 20, step: 0.5, value: S.d1V ?? 10, dark: true, fmt: (v) => num(v, 1) + ' V', onChange: (v) => { S.d1V = v; save(); self.dirty = true; } });
    const rb = inst(box, 'COMPONENT BOX', false);
    const kRs = new Lab.Knob(rb.c, { label: 'R_s', list: [2, 4, 8], value: S.d1Rs ?? 4, fmt: (v) => v + ' Ω', onChange: (v) => { S.d1Rs = v; save(); self.dirty = true; } });
    const kL = new Lab.Knob(rb.c, { label: 'L', list: [0.25, 0.5, 1, 2], value: S.d1L ?? 1, fmt: (v) => eng(v, 'H'), onChange: (v) => { S.d1L = v; save(); self.dirty = true; } });
    const kR2 = new Lab.Knob(rb.c, { label: 'R_2', list: [1, 2, 4, 8], value: S.d1R2 ?? 2, fmt: (v) => v + ' Ω', onChange: (v) => { S.d1R2 = v; save(); self.dirty = true; } });
    const kR3 = new Lab.Knob(rb.c, { label: 'R_3', list: [2, 3, 6, 12], value: S.d1R3 ?? 6, fmt: (v) => v + ' Ω', onChange: (v) => { S.d1R3 = v; save(); self.dirty = true; } });
    const tm = inst(box, 'SWITCH TIMER · 2 RELAYS'); const tmL = lcd(tm.el, 'TIME t', 's', 120);
    const kta = new Lab.Knob(tm.c, { label: 't_a (S1 opens)', min: 0, max: 2, step: 0.1, value: S.d1ta ?? 0, dark: true, fmt: (v) => num(v, 1) + ' s', onChange: (v) => { S.d1ta = v; save(); self.dirty = true; } });
    const ktb = new Lab.Knob(tm.c, { label: 't_b (S2 closes)', min: 0, max: 4, step: 0.1, value: S.d1tb ?? 2, dark: true, fmt: (v) => num(v, 1) + ' s', onChange: (v) => { S.d1tb = v; save(); self.dirty = true; } });
    const ksp = new Lab.Knob(tm.c, { label: 'Speed', list: [0.1, 0.25, 0.5, 1], value: 0.25, dark: true, fmt: (v) => '×' + num(v, 2) });
    const bb = document.createElement('div'); bb.className = 'row'; bb.style.cssText = 'gap:4px;margin-top:4px'; tm.el.appendChild(bb);
    const bStart = segBtn(bb, '▶ START', false), bPause = segBtn(bb, '❚❚ PAUSE', false);
    bStart.onclick = () => { self.t = self.T0; self.run = true; self.dirty = true; };
    bPause.onclick = () => { self.run = !self.run; };
    const m1 = inst(box, 'DMM-1 · i<sub>L</sub> (series, 10 A)', false); const m1L = lcd(m1.el, 'DC A', 'A', 110);
    const m2 = inst(box, 'DMM-2 · v<sub>L</sub>', false); const m2L = lcd(m2.el, 'DC V', 'V', 110);

    const P = () => ({ Vs: kV.value, Rs: kRs.value, L: kL.value, R2: kR2.value, R3: kR3.value, ta: kta.value, tb: Math.max(ktb.value, kta.value) });
    const ex = (p) => p.Vs === 10 && p.Rs === 4 && p.L === 1 && p.R2 === 2 && p.R3 === 6 && near(p.ta, 0, 1e-6) && near(p.tb, 1, 1e-6);
    // analitik çözüm; wrong=true: ikinci aralıkta zaman sıfırı kaydırılmamış (yaygın hata)
    function iL(t, p, wrong) {
      const I0 = p.Vs / p.Rs; if (t < p.ta) return I0;
      if (t < p.tb) return I0 * Math.exp(-(t - p.ta) * p.R2 / p.L);
      const i1 = I0 * Math.exp(-(p.tb - p.ta) * p.R2 / p.L), Req = (p.R2 * p.R3) / (p.R2 + p.R3);
      return i1 * Math.exp(-(wrong ? t : t - p.tb) * Req / p.L);
    }
    function vL(t, p) { const i = iL(t, p); if (t < p.ta) return 0; if (t < p.tb) return -i * p.R2; return -i * (p.R2 * p.R3) / (p.R2 + p.R3); }

    // şema
    const g = $('#d1sch');
    sch.src(g, 60, 150); sch.w(g, [[60, 130], [60, 60], [90, 60]]); sch.rH(g, 90, 170, 60); sch.w(g, [[170, 60], [200, 60]]);
    const s1 = sch.sw(g, 200, 250, 60); sch.w(g, [[250, 60], [570, 60]]);
    sch.t(g, 130, 45, 'R<tspan font-size="10" dy="3">s</tspan>'); sch.t(g, 225, 90, 'S1');
    sch.dot(g, 330, 60); sch.dot(g, 450, 60); sch.lV(g, 330, 60, 230); sch.rV(g, 450, 60, 230);
    sch.w(g, [[570, 60], [570, 80]]); const s2 = sch.swV(g, 570, 80, 125); sch.rV(g, 570, 125, 230);
    sch.w(g, [[60, 170], [60, 230], [570, 230]]); sch.dot(g, 330, 230); sch.dot(g, 450, 230); sch.gnd(g, 60, 230);
    sch.t(g, 30, 155, 'V<tspan font-size="10" dy="3">s</tspan>');
    const tL = sch.t(g, 345, 150, '', 'lbl', 'start'), tR2 = sch.t(g, 465, 150, '', 'lbl', 'start'), tR3 = sch.t(g, 585, 180, '', 'lbl', 'start'), tRs = sch.t(g, 130, 85, '', 'lbl');
    sch.t(g, 595, 105, 'S2', 'lbl', 'start');
    const tI = sch.t(g, 345, 110, '', 'val', 'start'), tV = sch.t(g, 345, 200, '', 'val', 'start'), tT = sch.t(g, 700, 30, '', 'val', 'end'), tSt = sch.t(g, 700, 255, '', 'val', 'end');
    E('path', { d: 'M318,85 v30 m-5,-8 l5,8 l5,-8', class: 'w', stroke: '#e07a10' }, g).style.stroke = '#e07a10';
    sch.t(g, 308, 105, 'i<tspan font-size="10" dy="3">L</tspan>', 'lbl', 'end');

    const plot = new Lab.Plot($('#d1plot'), { xlabel: 't  (s)', ylabel: 'i_L  (A)' });
    function drawPlot() {
      const p = P(), ser = [], N = 400, ymax = Math.max(0.5, (p.Vs / p.Rs) * 1.1);
      const curve = (t1, f) => { const pts = []; for (let k = 0; k <= N; k++) { const t = self.T0 + ((t1 - self.T0) * k) / N; pts.push([t, f(t)]); } return pts; };
      if ($('#d1theo').checked) ser.push({ pts: curve(self.T1, (t) => iL(t, p)), line: true, color: '#e07a10', dash: [6, 4], width: 1.5 });
      if ($('#d1wrong').checked) { const pts = []; for (let k = 0; k <= N; k++) { const t = p.tb + ((self.T1 - p.tb) * k) / N; pts.push([t, iL(t, p, true)]); } ser.push({ pts, line: true, color: '#c62828', dash: [3, 3], width: 1.5 }); }
      if (self.t > self.T0) ser.push({ pts: curve(Math.min(self.t, self.T1), (t) => iL(t, p)), line: true, color: '#0b5cad', width: 2.5 });
      ser.push({ pts: S.d1rows.map((r) => [r.t, r.i]), dots: true, color: '#1a8a4a' });
      plot.draw(ser, [self.T0, self.T1], [0, ymax]);
    }
    $('#d1theo').onchange = () => (self.dirty = true);
    $('#d1wrong').onchange = () => { if ($('#d1wrong').checked) { S.d1flags.wrong = true; save(); } self.dirty = true; };
    let last = performance.now();
    self.update = () => {
      const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
      const p = P();
      if (self.run) { self.t += dt * ksp.value; self.dirty = true; if (self.t >= self.T1) { self.t = self.T1; self.run = false; } if (ex(p) && self.t > 3) { S.d1flags.ran = true; save(); } }
      if (!self.dirty) return; self.dirty = false;
      const t = self.t, i = iL(Math.max(t, self.T0), p), v = vL(t, p);
      bPause.textContent = self.run ? '❚❚ PAUSE' : '▶ RESUME'; bPause.classList.toggle('on', self.run);
      psL(num(p.Vs, 1)); tmL(num(t, 3)); m1L(num(i, 4)); m2L(num(v, 3));
      s1(t < p.ta); s2(t >= p.tb);
      tRs.textContent = Lab.ohm(p.Rs); tL.textContent = 'L = ' + eng(p.L, 'H'); tR2.textContent = 'R₂ = ' + p.R2 + ' Ω'; tR3.textContent = 'R₃ = ' + p.R3 + ' Ω';
      tI.textContent = 'i_L = ' + num(i, 3) + ' A'; tV.textContent = 'v_L = ' + num(v, 2) + ' V'; tT.textContent = 't = ' + num(t, 2) + ' s';
      tSt.textContent = t < p.ta ? 'Interval 0: source connected (steady state)' : t < p.tb ? 'Interval 1: inductor sees only R₂' : 'Interval 2: R₂ ∥ R₃';
      if (ktb.value < kta.value) tSt.textContent += ' · (t_b < t_a: S2 closes at t_a)';
      drawPlot();
    };
    const tbody = $('#d1tab tbody');
    function table() {
      tbody.innerHTML = S.d1rows.map((r, k) => `<tr><td>${k + 1}</td><td>${num(r.L, 2)}</td><td>${r.R2}</td><td>${r.R3}</td><td>${num(r.ta, 1)}</td><td>${num(r.tb, 1)}</td><td>${num(r.t, 3)}</td><td>${num(r.i, 4)}</td><td>${num(r.v, 3)}</td></tr>`).join('');
      tbody.parentElement.parentElement.scrollTop = 1e6; self.dirty = true;
    }
    self.rec = () => {
      if (self.t <= self.T0) return Lab.toast('First start the recording with ▶ START.');
      const p = P(), i = iL(self.t, p), v = vL(self.t, p);
      S.d1rows.push({ ...p, t: self.t, i, v }); save(); table(); Lab.toast(`Recorded: t = ${num(self.t, 3)} s, i_L = ${num(i, 4)} A`);
    };
    $('#d1rec').onclick = self.rec;
    $('#d1del').onclick = () => { S.d1rows.pop(); save(); table(); };
    $('#d1csv').onclick = () => Lab.downloadCSV('hafta11_deney1.csv', ['#', 'Vs (V)', 'Rs', 'L (H)', 'R2', 'R3', 'ta (s)', 'tb (s)', 't (s)', 'iL (A)', 'vL (V)'], S.d1rows.map((r, k) => [k + 1, r.Vs, r.Rs, r.L, r.R2, r.R3, r.ta, r.tb, +r.t.toFixed(4), +r.i.toFixed(5), +r.v.toFixed(4)]));
    table();
    Object.assign(self, { P, ex, plotCanvas: $('#d1plot'), toggle: () => bPause.onclick() });
    return self;
  })();

  steps('d1', [
    { t: 'Example 3.8 setting: <b>V<sub>s</sub> = 10 V, R<sub>s</sub> = 4 Ω, L = 1 H, R<sub>2</sub> = 2 Ω, R<sub>3</sub> = 6 Ω</b>; on the timer <b>t<sub>a</sub> = 0, t<sub>b</sub> = 1 s</b>.', test: () => D1.ex(D1.P()) },
    { t: 'Press <b>▶ START</b> and watch the recording up to at least t = 3 s. At t<sub>b</sub>, did the current jump or did the slope change?', test: () => !!S.d1flags.ran },
    { t: 'Restart the recording, <b>PAUSE</b> (<kbd>Space</kbd>) at t ≈ 1.00 s and <b>record</b> i<sub>L</sub> (±0.02 s).', test: () => S.d1rows.some((r) => D1.ex(r) && near(r.t, 1, 0.02)) },
    { t: 'With the example setting, record <b>at least 6 points</b> in total from both intervals (0 &lt; t &lt; 1 s and t &gt; 1 s); include t ≈ 2 s as well.', test: () => { const L = S.d1rows.filter((r) => D1.ex(r)); return L.length >= 6 && L.some((r) => r.t > 0 && r.t < 1) && L.filter((r) => r.t > 1).length >= 2 && L.some((r) => near(r.t, 2, 0.03)); } },
    { t: 'Turn on the <b>Theoretical</b> and <b>unshifted (wrong)</b> curves. Does the wrong expression violate continuity at t<sub>b</sub>?', test: () => !!S.d1flags.wrong && $('#d1theo').checked },
    { t: 'Design: set <b>t<sub>b</sub> = 0.5 s</b>, repeat the recording and record at least one point at t &gt; 0.5 s.', test: () => S.d1rows.some((r) => near(r.tb, 0.5, 1e-6) && near(r.ta, 0, 1e-6) && r.t > 0.5) },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: 'According to your measurement (Example 3.8), what is i<sub>L</sub> in amperes at t = 1 s, when S2 closes?', answer: 2.5 * Math.exp(-2), tol: 2, unit: 'A', explain: 'i(1) = 2.5 e<sup>−2</sup> = 0.338 A. This value is the initial condition of the second interval.', hint: 'The t ≈ 1 s row of the table, or 2.5 e<sup>−t/τ<sub>1</sub></sup>.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'What is the time constant τ<sub>1</sub> of the first interval in seconds? (Verify from your recording: how long does the current take to fall to 36.8%?)', answer: 0.5, tol: 2, unit: 's', explain: 'τ<sub>1</sub> = L/R<sub>2</sub> = 1/2 = 0.5 s.', hint: 'Is the 6 Ω in the circuit during the first interval?' });
  numq('d1', '#d1Q', { id: 'd1q3', q: 'What is i<sub>L</sub> at t = 2 s, in amperes?', answer: 2.5 * Math.exp(-2) * Math.exp(-1.5), tol: 3, unit: 'A', explain: 'i(2) = 0.338 e<sup>−1.5(2−1)</sup> = 0.0755 A. The unshifted expression would give 0.338 e<sup>−3</sup> = 0.0168 A: an error of a factor of 4.5!', hint: '0.338 e<sup>−(t−1)/τ<sub>2</sub></sup>, τ<sub>2</sub> = 0.667 s' });
  numq('d1', '#d1Q', { id: 'd1q4', q: 'Design: with t<sub>b</sub> = 0.5 s, what is the current at t = 1.5 s, in amperes?', answer: 2.5 * Math.exp(-1) * Math.exp(-1.5), tol: 3, unit: 'A', explain: 'i(0.5) = 2.5 e<sup>−1</sup> = 0.920 A; i(1.5) = 0.920 e<sup>−1.5</sup> = 0.205 A.', hint: 'First i(t<sub>b</sub>), then the shifted exponential.' });
  mcq('d1', '#d1Q', { id: 'd1q5', q: 'What do you see in the recording at t<sub>b</sub>?', opts: ['The current drops to zero', 'The current jumps', 'The current stays continuous but its slope changes abruptly (the new circuit’s τ takes over)', 'Nothing changes'], correct: 2, explain: 'i<sub>L</sub> does not jump. Since R<sub>eq</sub> = 2∥6 = 1.5 Ω &lt; 2 Ω, τ<sub>2</sub> = 0.667 s &gt; τ<sub>1</sub>: the decay slows down and the slope magnitude decreases. v<sub>L</sub> = −iR<sub>eq</sub>, however, does jump.', hint: 'Can the inductor current jump? Is the new circuit’s τ the same?' });
  numq('d1', '#d1Q', { id: 'd1q6', q: 'Example 3.19 (RC): C = 1 µF, v(0) = 100 V; it discharges through 100 kΩ for 0–50 ms, and at t = 50 ms a second 100 kΩ is connected in parallel. What is v(150 ms) in volts?', answer: 100 * Math.exp(-0.5) * Math.exp(-2), tol: 2, unit: 'V', explain: 'v(50 ms) = 60.65 V; τ<sub>2</sub> = 50 ms; v(150 ms) = 60.65 e<sup>−2</sup> = 8.21 V.', hint: 'Same logic: continuity + (t − 50 ms).' });

  /* ================= DENEY 2 · Sınırsız tepki ================= */
  const D2 = (() => {
    const self = { rev: 1 };
    const box = $('#d2inst');
    const el = inst(box, 'COMPONENTS', false);
    const kC = new Lab.Knob(el.c, { label: 'C', list: [1e-6, 2e-6, 5e-6, 1e-5], value: S.d2C ?? 5e-6, fmt: (v) => eng(v, 'F'), onChange: (v) => { S.d2C = v; save(); } });
    const kR = new Lab.Knob(el.c, { label: 'R', list: [5e3, 1e4, 2e4, 5e4], value: S.d2R ?? 1e4, fmt: Lab.ohm, onChange: (v) => { S.d2R = v; save(); } });
    const dp = inst(box, 'DEPENDENT SOURCE · g·v (VCCS)'); const dpL = lcd(dp.el, 'g', 'mA/V', 100);
    const kg = new Lab.Knob(dp.c, { label: 'g', min: 0, max: 0.5, step: 0.01, value: S.d2g ?? 0.2, dark: true, fmt: (v) => num(v, 2) + ' mA/V', onChange: (v) => { S.d2g = v; save(); } });
    const kS = new Lab.Knob(dp.c, { label: 'Compliance ±V', list: [15, 30, 60, 120, 150], value: S.d2Vs ?? 120, dark: true, fmt: (v) => '±' + v + ' V', onChange: (v) => { S.d2Vs = v; save(); } });
    const pr = inst(box, 'PRECHARGE + SWITCH'); const prL = lcd(pr.el, 'v<sub>C</sub> (t &lt; 0)', 'V', 100);
    const kV0 = new Lab.Knob(pr.c, { label: 'V_0', min: 0, max: 20, step: 0.5, value: S.d2V0 ?? 10, dark: true, fmt: (v) => num(v, 1) + ' V', onChange: (v) => { S.d2V0 = v; save(); } });
    const bShot = segBtn(pr.c, '⚡ SWITCH<br>t = 0 (single shot)', false); bShot.style.cssText = 'padding:8px;width:110px';

    const sc = mkScope($('#d2scopeHost'), { v1: 20, v2: 5, t: 0.01, p1: -3, p2: -3, l2: 'CH2 (1 V/mA)', mode: 'SINGLE' });
    sc.sc.ch[1].on = true;
    const P = () => ({ C: kC.value, R: kR.value, g: kg.value, Vs: kS.value, V0: kV0.value });
    const kOf = (p) => (p.g * 1e-3 - 1 / p.R) / p.C;
    const kind = (p) => { const k = kOf(p); return Math.abs(k) < 1e-9 ? 'zero' : k > 0 ? 'pos' : 'neg'; };
    const ex = (p) => p.C === 5e-6 && p.R === 1e4 && near(p.g, 0.3, 1e-6) && near(p.V0, 10, 1e-6) && p.Vs >= 120;
    bShot.onclick = () => {
      const p = P(); S.d2shot = p; S.d2flags[kind(p)] = true; if (ex(p)) S.d2flags.ex = true; save();
      self.rev = 0; sc.dirty = true;
      Lab.toast(kind(p) === 'pos' ? 'Switch closed: the voltage is growing!' : kind(p) === 'zero' ? 'Switch closed: net current is zero.' : 'Switch closed: the voltage is decaying.');
    };
    // şema
    const g = $('#d2sch');
    sch.w(g, [[120, 60], [620, 60]]); sch.w(g, [[120, 210], [620, 210]]); sch.gnd(g, 370, 210);
    sch.cV(g, 120, 60, 210); sch.t(g, 95, 140, 'C', 'lbl', 'end'); const tC = sch.t(g, 95, 158, '', 'lbl', 'end');
    sch.t(g, 140, 90, '+', 'lbl'); sch.t(g, 140, 195, '−', 'lbl'); sch.t(g, 150, 140, 'v', 'lbl', 'start');
    sch.w(g, [[260, 60], [260, 80]]); const sw = sch.swV(g, 260, 80, 120); sch.w(g, [[260, 120], [400, 120]]); sch.t(g, 280, 105, 'S (t=0)', 'lbl', 'start');
    sch.w(g, [[200, 60], [200, 60]]);
    sch.dot(g, 400, 120); sch.rV(g, 400, 120, 210); const tR = sch.t(g, 415, 170, '', 'lbl', 'start');
    sch.w(g, [[400, 120], [560, 120], [560, 140]]); sch.dep(g, 560, 165); sch.w(g, [[560, 187], [560, 210]]);
    const tG = sch.t(g, 590, 170, '', 'lbl', 'start');
    sch.w(g, [[620, 60], [620, 60]]); sch.dot(g, 260, 60);
    // üst bağ: anahtar ile kapasitör üst ucu aynı düğüm (260,60); R ve kaynak alt raydan döner
    const tV = sch.t(g, 130, 40, '', 'val', 'start'), tRth = sch.t(g, 740, 40, '', 'val', 'end'), tMode = sch.t(g, 740, 240, '', 'val', 'end');
    E('rect', { x: 380, y: 100, width: 240, height: 125, fill: 'none', stroke: '#888', 'stroke-dasharray': '4 3', rx: 6 }, g);
    sch.t(g, 500, 245, 'R_Th seen from terminals = ?', 'lbl').style.fill = '#777';

    function trace(p) {
      const n = 1000, td = sc.sc.tdiv, k = kOf(p), y1 = new Float64Array(n), y2 = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const t = (i / (n - 1)) * 10 * td - td;
        let v = t < 0 ? p.V0 : clamp(p.V0 * Math.exp(k * t), -p.Vs, p.Vs);
        const ii = t < 0 ? 0 : p.g * v; // mA → 1 V/mA prob
        const vis = i / (n - 1) <= self.rev + 0.1;
        y1[i] = vis ? v : NaN; y2[i] = vis ? ii : NaN;
      }
      return { n, y: [y1, y2] };
    }
    let last = performance.now();
    self.update = () => {
      const now = performance.now(), dt = (now - last) / 1000; last = now;
      const p = P();
      dpL(num(p.g, 2)); prL(num(p.V0, 1)); tC.textContent = eng(p.C, 'F'); tR.textContent = 'R = ' + Lab.ohm(p.R); tG.textContent = num(p.g, 2) + '·v mA';
      tV.textContent = 'V₀ = ' + num(p.V0, 1) + ' V'; sw(!!S.d2shot);
      tMode.textContent = S.d2shot ? 'Last shot: g = ' + num(S.d2shot.g, 2) + ' mA/V, R = ' + Lab.ohm(S.d2shot.R) : 'Switch open (waiting for a shot)';
      tRth.textContent = '';
      if (self.rev < 1) { self.rev = Math.min(1, self.rev + dt / 1.5); sc.dirty = true; }
      if (!sc.dirty) return; sc.dirty = false;
      if (S.d2shot) sc.draw(trace(S.d2shot)); else sc.draw({ n: 2, y: [new Float64Array([p.V0, p.V0]), new Float64Array([0, 0])] });
    };
    const tbody = $('#d2tab tbody');
    function table() {
      tbody.innerHTML = S.d2rows.map((r, i) => `<tr><td>${i + 1}</td><td>${eng(r.C, 'F')}</td><td>${Lab.ohm(r.R)}</td><td>${num(r.g, 2)}</td><td>${num(r.V0, 1)}</td><td>${eng(r.ta, 's')}</td><td>${num(r.va, 2)}</td><td>${eng(r.tb, 's')}</td><td>${num(r.vb, 2)}</td><td>${eng(r.tb - r.ta, 's')}</td></tr>`).join('');
      tbody.parentElement.parentElement.scrollTop = 1e6;
    }
    self.rec = () => {
      if (!S.d2shot) return Lab.toast('First close the switch (single shot) and capture a waveform.');
      if (!sc.sc.cur.on || !sc.m || !sc.m.cur) return Lab.toast('Turn on the CURSORs and place them at two points.');
      const c = sc.m.cur, ta = sc.tc(sc.sc.cur.a), tb = sc.tc(sc.sc.cur.b);
      S.d2rows.push({ ...S.d2shot, ta, va: c.v1a, tb, vb: c.v1b }); save(); table();
      Lab.toast(`Recorded: Δt = ${eng(tb - ta, 's')}, v_A = ${num(c.v1a, 2)} V, v_B = ${num(c.v1b, 2)} V`);
    };
    $('#d2rec').onclick = self.rec;
    $('#d2del').onclick = () => { S.d2rows.pop(); save(); table(); };
    $('#d2csv').onclick = () => Lab.downloadCSV('hafta11_deney2.csv', ['#', 'C (F)', 'R (ohm)', 'g (mA/V)', 'V0 (V)', 'tA (s)', 'vA (V)', 'tB (s)', 'vB (V)'], S.d2rows.map((r, i) => [i + 1, r.C, r.R, r.g, r.V0, +r.ta.toFixed(6), +r.va.toFixed(4), +r.tb.toFixed(6), +r.vb.toFixed(4)]));
    table();
    Object.assign(self, { sc, P, ex, kind });
    return self;
  })();

  steps('d2', [
    { t: 'Example 3.9 setting: <b>C = 5 µF, R = 10 kΩ, g = 0.30 mA/V, V<sub>0</sub> = 10 V</b>, compliance voltage <b>±120 V</b>.', test: () => D2.ex(D2.P()) },
    { t: 'Take a single shot with <b>⚡ SWITCH</b>. How far did the voltage grow, and why did it stop there?', test: () => !!S.d2flags.ex },
    { t: 'Turn on the CURSORs: place A at t = 0 (10 V) and B at the instant the voltage is <b>100 V</b>, then record.', test: () => S.d2rows.some((r) => D2.ex(r) && near(r.va, 10, 1.5) && near(r.vb, 100, 4)) },
    { t: 'Find the boundary case: with R = 10 kΩ, set g to the value at which the voltage <b>neither grows nor decays</b> and take a shot.', test: () => !!S.d2flags.zero },
    { t: 'Lower g below this boundary and take a shot: the response now decays (R<sub>Th</sub> &gt; 0).', test: () => !!S.d2flags.neg },
    { t: 'Record <b>at least 3 cursor measurements</b> in total at different g or R values.', test: () => S.d2rows.length >= 3 && new Set(S.d2rows.map((r) => r.g + '_' + r.R)).size >= 2 },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'What is the time constant τ = R<sub>Th</sub>C of the Example 3.9 circuit in milliseconds? (Include its sign.)', answer: -25, tol: 2, unit: 'ms', explain: 'τ = (−5 kΩ)(5 µF) = −25 ms. From your cursor measurement: |τ| = Δt/ln(v<sub>B</sub>/v<sub>A</sub>).', hint: 'From your measurement |τ| = Δt/ln(v<sub>B</sub>/v<sub>A</sub>); the sign is negative for growth.' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'How many milliseconds did the voltage take to rise from 10 V to 100 V (your measurement)?', answer: 1000 * Math.log(10) / 40, tol: 3, unit: 'ms', explain: 't = ln(10)/40 = 57.6 ms.', hint: 'The Δt in the table.' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 'For R = 10 kΩ, what value of g (in mA/V) makes the response neither grow nor decay?', answer: 0.1, tol: 1, unit: 'mA/V', explain: 'g = 1/R = 0.1 mA/V: the dependent source exactly supplies the current drawn by the resistor, R<sub>Th</sub> → ∞, and the voltage stays constant.', hint: 'g − 1/R = 0' });
  numq('d2', '#d2Q', { id: 'd2q4', q: 'Example 3.20: C = 2 µF, v(0) = 5 V, R = 20 kΩ, g = 0.1 mA/V. In how many ms does the voltage reach 50 V? (Build it on the bench and verify.)', answer: 1000 * Math.log(10) / 25, tol: 3, unit: 'ms', explain: 'R<sub>Th</sub> = −20 kΩ, τ = −40 ms, v = 5e<sup>25t</sup>; t = ln10/25 = 92.1 ms.', hint: 'First R<sub>Th</sub>, then τ, then t = |τ| ln(50/5).' });
  mcq('d2', '#d2Q', { id: 'd2q5', q: 'Why did the trace become a flat line on the oscilloscope when the voltage reached ±V<sub>sat</sub>?', opts: ['The capacitor became fully charged and the current stopped', 'The model is invalid in this region: the amplifier forming the dependent source hit its supply (compliance voltage)', 'The trace went off the oscilloscope screen', 'τ turned positive'], correct: 1, explain: 'The mathematical model is unbounded; the real circuit is not. If it did not clip, a component would break down.', hint: 'Change the compliance voltage and take another shot.' });

  /* ================= DENEY 3 · İntegral alıcı ================= */
  const D3 = (() => {
    const self = { vo: 0, t: 0, b1: [], b2: [], reset: false, wave: S.d3wave || 'sq', okT: 0 };
    const box = $('#d3inst');
    const fg = inst(box, 'FG-100 FUNCTION GENERATOR'); const fgL = lcd(fg.el, 'v<sub>g</sub>', '', 190);
    const wb = document.createElement('div'); wb.className = 'row'; wb.style.cssText = 'gap:4px;margin-bottom:4px'; fg.el.insertBefore(wb, fg.c);
    wb.innerHTML = [['sq', '⊓ Square'], ['sin', '∿ Sine'], ['dc', '— DC']].map(([k, t]) => `<button class="seg-btn${k === self.wave ? ' on' : ''}" data-w="${k}">${t}</button>`).join('');
    $$('button', wb).forEach((b) => (b.onclick = () => { self.wave = S.d3wave = b.dataset.w; save(); $$('button', wb).forEach((x) => x.classList.toggle('on', x === b)); }));
    const kf = new Lab.Knob(fg.c, { label: 'Frequency', min: 1, max: 1000, log: true, value: S.d3f ?? 50, dark: true, fmt: (v) => eng(v, 'Hz'), onChange: (v) => { S.d3f = v; save(); } });
    const ka = new Lab.Knob(fg.c, { label: 'Amplitude (peak)', min: 0, max: 5, step: 0.05, value: S.d3a ?? 1, dark: true, fmt: (v) => num(v, 2) + ' V', onChange: (v) => { S.d3a = v; save(); } });
    const ko = new Lab.Knob(fg.c, { label: 'DC offset', min: -50, max: 50, step: 0.5, value: S.d3o ?? 0, dark: true, fmt: (v) => num(v, 1) + ' mV', onChange: (v) => { S.d3o = v; save(); } });
    const el = inst(box, 'COMPONENT BOX', false);
    const kRs = new Lab.Knob(el.c, { label: 'R_s', list: [1e4, 4.7e4, 1e5, 2.5e5, 1e6], value: S.d3Rs ?? 1e5, fmt: Lab.ohm, onChange: (v) => { S.d3Rs = v; save(); } });
    const kCf = new Lab.Knob(el.c, { label: 'C_f', list: [1e-8, 4.7e-8, 1e-7, 2e-7, 1e-6], value: S.d3Cf ?? 1e-7, fmt: (v) => eng(v, 'F'), onChange: (v) => { S.d3Cf = v; save(); } });
    const kRp = new Lab.Knob(el.c, { label: 'R_p (C_f ∥)', list: [1e5, 1e6, 1e7, 1e12], value: S.d3Rp ?? 1e12, fmt: (v) => (v >= 1e11 ? '∞ (none)' : Lab.ohm(v)), onChange: (v) => { S.d3Rp = v; save(); } });
    const oa = inst(box, 'µA741 · ±V<sub>CC</sub> · RESET'); const oaL = lcd(oa.el, 'DMM · v<sub>o</sub>', 'V', 110);
    const kV = new Lab.Knob(oa.c, { label: '±V_CC', list: [6, 10, 12, 15], value: S.d3V ?? 15, dark: true, fmt: (v) => '±' + v + ' V', onChange: (v) => { S.d3V = v; save(); } });
    const kPre = new Lab.Knob(oa.c, { label: 'v_o(0) initial condition', min: -5, max: 5, step: 0.1, value: S.d3pre ?? 0, dark: true, fmt: (v) => num(v, 1) + ' V', onChange: (v) => { S.d3pre = v; save(); } });
    const bRst = segBtn(oa.c, 'S<sub>R</sub>: OPEN', false); bRst.style.cssText = 'padding:8px;width:96px';
    bRst.onclick = () => {
      self.reset = !self.reset; bRst.innerHTML = self.reset ? 'S<sub>R</sub>: CLOSED' : 'S<sub>R</sub>: OPEN'; bRst.classList.toggle('on', self.reset);
      if (!self.reset) { S.d3flags.rst = true; if (ex() && Math.abs(kPre.value) < 1e-6) S.d3flags.rstEx = true; save(); }
    };
    const vb = document.createElement('label'); vb.style.cssText = 'font-size:11px;display:block;margin-top:4px;color:#dfe3ea';
    vb.innerHTML = `<input type="checkbox" ${S.d3vos ? 'checked' : ''}> Real V<sub>os</sub> (741)`; oa.c.appendChild(vb);
    vb.firstChild.onchange = (e) => { S.d3vos = e.target.checked; save(); };

    const sc = mkScope($('#d3scopeHost'), { v1: 1, v2: 0.5, t: 5e-3, runBtn: true, pre: true, onT: () => { self.b1 = []; self.b2 = []; } });
    const P = () => ({ wave: self.wave, f: kf.value, A: ka.value, off: ko.value * 1e-3, Rs: kRs.value, Cf: kCf.value, Rp: kRp.value, V: kV.value, pre: kPre.value, vos: S.d3vos ? S.vos : 0 });
    const ex = (p = P()) => p.wave === 'sq' && near(p.f, 50, 1) && near(p.A, 1, 1e-6) && p.Rs === 1e5 && p.Cf === 1e-7 && p.V === 6 && p.Rp >= 1e11 && Math.abs(p.off) < 1e-6 && !S.d3vos;
    function gen(t, p) {
      if (p.wave === 'dc') return p.A + p.off;
      const ph = t * p.f - Math.floor(t * p.f);
      return p.off + (p.wave === 'sq' ? (ph < 0.5 ? p.A : -p.A) : p.A * Math.sin(2 * Math.PI * ph));
    }
    // şema
    const g = $('#d3sch');
    sch.src(g, 60, 175, 20, 'ac'); sch.w(g, [[60, 155], [60, 150], [100, 150]]); sch.rH(g, 100, 190, 150); sch.w(g, [[190, 150], [380, 150]]);
    sch.w(g, [[60, 195], [60, 215]]); sch.gnd(g, 60, 215); sch.t(g, 25, 180, 'v<tspan font-size="10" dy="3">g</tspan>');
    sch.dot(g, 300, 150); sch.w(g, [[300, 150], [300, 40], [395, 40]]); sch.cH(g, 395, 445, 40); sch.w(g, [[445, 40], [580, 40], [580, 175]]);
    sch.dot(g, 300, 40); sch.dot(g, 580, 40);
    sch.w(g, [[300, 40], [300, 10], [360, 10]]); sch.rH(g, 360, 470, 10); sch.w(g, [[470, 10], [580, 10], [580, 40]]);
    const rpTxt = sch.t(g, 415, 28, '', 'lbl');
    sch.w(g, [[300, 75], [380, 75]]); const swR = sch.sw(g, 380, 430, 75); sch.w(g, [[430, 75], [580, 75]]); sch.t(g, 405, 95, 'S<tspan font-size="10" dy="3">R</tspan>', 'lbl'); sch.dot(g, 300, 75); sch.dot(g, 580, 75);
    sch.opamp(g, 380, 120); sch.t(g, 392, 155, '−'); sch.t(g, 392, 215, '+');
    sch.w(g, [[380, 210], [350, 210], [350, 225]]); sch.gnd(g, 350, 225);
    sch.w(g, [[500, 175], [660, 175]]); sch.term(g, 664, 175); sch.t(g, 676, 180, 'v<tspan font-size="10" dy="3">o</tspan>', 'lbl', 'start');
    const tRs = sch.t(g, 145, 135, ''), tCf = sch.t(g, 420, 64, '', 'lbl'), tVo = sch.t(g, 600, 165, '', 'val', 'start'), tSt = sch.t(g, 740, 255, '', 'val', 'end'), tVn = sch.t(g, 296, 168, 'v_n ≈ 0 (virtual ground)', 'lbl', 'end');
    tVn.style.fontSize = '11px';

    let last = performance.now();
    self.update = () => {
      const now = performance.now(), rdt = Math.min(0.05, (now - last) / 1000); last = now;
      const p = P(), td = sc.sc.tdiv, h = (td * 10) / 1000;
      const nst = Math.min(20000, Math.max(1, Math.round(rdt / h)));
      const tau = p.Rs * p.Cf, leak = p.Rp < 1e11;
      for (let k = 0; k < nst; k++) {
        self.t += h; const vg = gen(self.t, p);
        if (self.reset) self.vo = p.pre;
        else if (!leak) self.vo += h * (-(vg - p.vos) / tau);
        else { const vinf = p.vos - (p.Rp / p.Rs) * (vg - p.vos); self.vo = vinf + (self.vo - vinf) * Math.exp(-h / (p.Rp * p.Cf)); }
        self.vo = clamp(self.vo, -p.V, p.V);
        self.b1.push(vg); self.b2.push(self.vo);
      }
      if (self.b1.length > 4000) { self.b1.splice(0, self.b1.length - 2200); self.b2.splice(0, self.b2.length - 2200); }
      // adım bayrakları
      const sat = Math.abs(self.vo) >= p.V * 0.98;
      if (sat && S.d3vos && p.Rp >= 1e11 && p.f >= 20 && p.wave !== 'dc' && !self.reset) { if (!S.d3flags.drift) { S.d3flags.drift = true; save(); } }
      if (S.d3vos && p.Rp === 1e6 && p.wave !== 'dc' && !self.reset && Math.abs(self.vo) < 2) { self.okT += rdt; if (self.okT > 3 && !S.d3flags.leak) { S.d3flags.leak = true; save(); } } else self.okT = 0;
      // gösterim
      fgL(p.wave === 'dc' ? `DC ${num(p.A + p.off, 3)} V` : `${eng(p.f, 'Hz')} · ±${num(p.A, 2)} V${p.off ? ' · ofs ' + num(p.off * 1e3, 1) + ' mV' : ''}`, '');
      oaL(num(self.vo, 3)); swR(self.reset);
      tRs.textContent = 'R_s = ' + Lab.ohm(p.Rs); tCf.textContent = 'C_f = ' + eng(p.Cf, 'F'); rpTxt.textContent = p.Rp >= 1e11 ? 'no R_p' : 'R_p = ' + Lab.ohm(p.Rp);
      tVo.textContent = 'v_o = ' + num(self.vo, 2) + ' V';
      tSt.textContent = self.reset ? 'RESET: C_f being set to v_o(0) = ' + num(p.pre, 1) + ' V' : sat ? 'SATURATION: output stuck at ±V_CC' : 'INTEGRATING';
      tSt.style.fill = sat ? '#c62828' : self.reset ? '#e07a10' : '#1a8a4a';
      if (!sc.run) { if (sc.dirty) { sc.dirty = false; sc.draw(); } return; }
      const n = 1000, L = self.b1.length; if (L < 2) return;
      let st = Math.max(0, L - n);
      if (p.wave !== 'dc' && L >= n + 100) { const mid = p.off; for (let i = L - n; i >= 100; i--) if (self.b1[i - 1] < mid && self.b1[i] >= mid) { st = i - 100; break; } }
      const y1 = new Float64Array(n).fill(NaN), y2 = new Float64Array(n).fill(NaN);
      for (let i = 0; i < n && st + i < L; i++) { y1[i] = self.b1[st + i]; y2[i] = self.b2[st + i]; }
      sc.draw({ n, y: [y1, y2] }); sc.dirty = false;
    };
    const tbody = $('#d3tab tbody');
    const wn = { sq: 'square', sin: 'sine', dc: 'DC' };
    function table() {
      tbody.innerHTML = S.d3rows.map((r, i) => `<tr><td>${i + 1}</td><td>${wn[r.wave]}</td><td>${r.wave === 'dc' ? '—' : eng(r.f, 'Hz')}</td><td>${num(r.A, 2)} V</td><td>${Lab.ohm(r.Rs)}</td><td>${eng(r.Cf, 'F')}</td><td>${r.Rp >= 1e11 ? '∞' : Lab.ohm(r.Rp)}</td><td>${r.V}</td><td>${r.vos ? 'on' : 'off'}</td><td>${num(r.mx, 3)}</td><td>${num(r.mn, 3)}</td><td>${r.dt == null ? '—' : eng(r.dt, 's')}</td></tr>`).join('');
      tbody.parentElement.parentElement.scrollTop = 1e6;
    }
    self.rec = () => {
      const m = sc.m; if (!m) return;
      const p = P(), b = m.ch[1];
      S.d3rows.push({ wave: p.wave, f: p.f, A: p.A, Rs: p.Rs, Cf: p.Cf, Rp: p.Rp, V: p.V, vos: !!S.d3vos, mx: b.max, mn: b.min, dt: m.cur ? m.cur.dt : null }); save(); table();
      Lab.toast(`Recorded: v_o max ${num(b.max, 3)} V, min ${num(b.min, 3)} V`);
    };
    $('#d3rec').onclick = self.rec;
    $('#d3del').onclick = () => { S.d3rows.pop(); save(); table(); };
    $('#d3csv').onclick = () => Lab.downloadCSV('hafta11_deney3.csv', ['#', 'wave', 'f (Hz)', 'A (V)', 'Rs', 'Cf (F)', 'Rp', 'Vcc', 'Vos', 'vo max (V)', 'vo min (V)', 'dt cursor (s)'], S.d3rows.map((r, i) => [i + 1, wn[r.wave], +r.f.toFixed(3), r.A, r.Rs, r.Cf, r.Rp >= 1e11 ? 'none' : r.Rp, r.V, r.vos ? 'on' : 'off', +r.mx.toFixed(4), +r.mn.toFixed(4), r.dt == null ? '' : +r.dt.toFixed(6)]));
    table();
    Object.assign(self, { sc, P, ex, kf });
    return self;
  })();

  steps('d3', [
    { t: 'Example 3.10 setting: <b>square, 50 Hz, ±1 V</b> (offset 0), <b>R<sub>s</sub> = 100 kΩ, C<sub>f</sub> = 0.1 µF, no R<sub>p</sub>, ±6 V</b>, V<sub>os</sub> off.', test: () => D3.ex() },
    { t: 'Set the initial condition to <b>v<sub>o</sub>(0) = 0</b> and close and open S<sub>R</sub> once: the capacitor is cleared and integration starts from there.', test: () => !!S.d3flags.rstEx },
    { t: 'Examine the triangle wave on CH2 and <b>record</b> it. Is the peak-to-peak value ≈ 1 V? Measure the slope with the cursors.', test: () => S.d3rows.some((r) => r.wave === 'sq' && near(r.f, 50, 1) && r.Rs === 1e5 && r.Cf === 1e-7 && near(r.mx - r.mn, 1, 0.08) && !r.vos) },
    { t: 'Lower the frequency <b>below 8 Hz</b> (half period &gt; 60 ms). Does the output clip at ±6 V? Record a measurement.', test: () => S.d3rows.some((r) => r.wave === 'sq' && r.f < 8.3 && r.Rs === 1e5 && r.Cf === 1e-7 && r.V === 6 && Math.max(r.mx, -r.mn) >= 5.9) },
    { t: 'Set the frequency back to ≥ 20 Hz and turn on <b>Real V<sub>os</sub></b> (no R<sub>p</sub>). Wait until the output slowly drifts into saturation. (To speed it up you can add a 5–10 mV DC offset on the generator.)', test: () => !!S.d3flags.drift },
    { t: 'Insert <b>R<sub>p</sub> = 1 MΩ</b> and reset with S<sub>R</sub>: the drift should stop (|v<sub>o</sub>| must stay &lt; 2 V for at least 3 s).', test: () => !!S.d3flags.leak },
  ]);
  numq('d3', '#d3Q', { id: 'd3q1', q: 'Example 3.10: what is the slope of the output in V/s while v<sub>g</sub> = +1 V? (With its sign; compare with your cursor measurement.)', answer: -100, tol: 3, unit: 'V/s', explain: 'dv<sub>o</sub>/dt = −v<sub>g</sub>/(R<sub>s</sub>C<sub>f</sub>) = −100 V/s.', hint: '1/(R<sub>s</sub>C<sub>f</sub>) = 100 s<sup>−1</sup>, inverting structure.' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'What is the peak-to-peak value, in volts, of the triangle wave started with v<sub>o</sub>(0) = 0?', answer: 1, tol: 5, unit: 'V', explain: '100 V/s × 10 ms = 1 V: the output swings between 0 and −1 V.', hint: 'Slope × half period.' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'What is the longest half period, in ms, that can be used without saturation (v<sub>o</sub>(0) = 0, ±6 V)?', answer: 60, tol: 2, unit: 'ms', explain: 't = 6/100 = 60 ms; so f must be &gt; 8.33 Hz.', hint: 'V<sub>CC</sub> / |slope|' });
  numq('d3', '#d3Q', { id: 'd3q4', q: 'Example 3.21: R<sub>s</sub> = 250 kΩ, C<sub>f</sub> = 0.2 µF, v<sub>g</sub> = 2 V (DC), v<sub>o</sub>(0) = −3 V, ±10 V. In how many ms does the output saturate? (On the bench: DC waveform, initial condition −3 V, open S<sub>R</sub>, freeze with RUN/STOP and measure with the cursors.)', answer: 175, tol: 2, unit: 'ms', explain: 'Slope −40 V/s; −3 − 40t = −10 ⇒ t = 175 ms.', hint: '1/(R<sub>s</sub>C<sub>f</sub>) = 20 s<sup>−1</sup>.' });
  mcq('d3', '#d3Q', { id: 'd3q5', q: 'With V<sub>os</sub> on and no R<sub>p</sub>, why did the output drift into saturation over time?', opts: ['The average of the square wave is not zero', 'The integrator integrates the offset too: a continuous ramp with slope V<sub>os</sub>/(R<sub>s</sub>C<sub>f</sub>) forms', 'The capacitor is leaking', 'The oscilloscope trigger slipped'], correct: 1, explain: 'At DC the capacitor is an open circuit: there is no feedback and the DC gain is infinite. R<sub>p</sub> reduces the DC gain to −R<sub>p</sub>/R<sub>s</sub>.', hint: 'What does C<sub>f</sub> look like at DC?' });
  numq('d3', '#d3Q', { id: 'd3q6', q: 'For R<sub>p</sub> = 1 MΩ, R<sub>s</sub> = 100 kΩ and |V<sub>os</sub>| = 2 mV, what is the steady DC error at the output in mV?', answer: 22, tol: 3, unit: 'mV', explain: 'V<sub>os</sub>(1 + R<sub>p</sub>/R<sub>s</sub>) = 2 × 11 = 22 mV. The price: integration degrades for f &lt; 1/(2πR<sub>p</sub>C<sub>f</sub>) ≈ 1.6 Hz.', hint: 'Non-inverting gain (1 + R<sub>p</sub>/R<sub>s</sub>).' });

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
      <h2 style="margin:0">Circuit Theory I · Virtual Lab · Week 11 Report</h2>
      <p><b>Topic:</b> Sequential switching, unbounded response, integrating amplifier (Sections 3.5–3.7)</p>
      <table class="data" style="width:auto"><tr><th>Full name</th><td class="l">${S.st.name || ''}</td><th>ID</th><td class="l">${S.st.no || ''}</td><th>Group</th><td class="l">${S.st.group || ''}</td><th>Date</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Summary</h3>
      <p>Completed lab-sheet steps: <b>${sOk}/${sTot}</b> · Correct answers: <b>${ok}/${tot}</b> · Score: <b>${Math.round((50 * sOk) / sTot + (50 * ok) / tot)}/100</b></p>
      <h3>Answers</h3>
      <table class="data"><thead><tr><th>Section</th><th>Question</th><th>Answer</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Experiment 1 · Sequential switching</h3>${tb('#d1tab')}
      <h3>Experiment 2 · Unbounded response (cursor measurements)</h3>${tb('#d2tab')}
      <h3>Experiment 3 · Integrating amplifier</h3>${tb('#d3tab')}
      <h3>Plots</h3>
      <div>${img(D1.plotCanvas)} ${img(D2.sc.cv)}</div><div>${img(D3.sc.cv)}</div>
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
    if (e.key === ' ' && S.page === 'd1') { D1.toggle(); e.preventDefault(); }
  });

  function loop() {
    if (S.page === 'd1') { D1.update(); evalSteps('d1'); }
    if (S.page === 'd2') { D2.update(); evalSteps('d2'); }
    if (S.page === 'd3') { D3.update(); evalSteps('d3'); }
    requestAnimationFrame(loop);
  }
  ['d1', 'd2', 'd3'].forEach(evalSteps);
  go(S.page); progress(); loop();
})();

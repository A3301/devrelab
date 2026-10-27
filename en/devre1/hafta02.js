/* Devre Kuramı I · Hafta 2 — Eviren ve Evirmeyen Yükselteç, Gerilim İzleyici */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd1h02';
  const S = Object.assign({ answers: {}, steps: {}, st: {}, page: 'giris', sat: 'ideal', d1rows: [], d2rows: [], d3rows: [], d4rows: [] }, Lab.store.load(KEY));
  if (S.seed == null) S.seed = Math.random() * 1000;
  Lab.answers = S.answers;
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => Lab.store.save(KEY, S), 300); };
  Lab.onAnswer = () => { save(); progress(); };

  /* ---------- ortak model (µA741) ---------- */
  const A0 = 1e5, SR = 0.5e6, IMAX = 25e-3, RI = 2e6, IB = 80e-9, RG = 50, RDMM = 10e6;
  const vsat = (vcc) => (S.sat === 'real' ? vcc - 1.5 : vcc);
  const model = (vcc, A = A0) => ({ A, vsatP: vsat(vcc), vsatN: -vsat(vcc), vos: 0 });
  const near = (a, b, t) => Math.abs(a - b) <= t;
  const E12 = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
  const E12L = []; [1e2, 1e3, 1e4, 1e5].forEach((d) => E12.forEach((m) => E12L.push(+(m * d).toPrecision(3)))); E12L.push(1e6);
  const RBOX = [...new Set([...E12L.filter((r) => r >= 1e3), 2e4, 4e4, 5e4, 6e4, 8e4, 1.6e5, 2e5])].sort((a, b) => a - b);
  const INF = 1e12;
  const rfmt = (v) => (v >= 1e9 ? '∞ (open)' : v === 0 ? '0 (short)' : Lab.ohm(v));
  const strip = (s) => String(s).replace(/<[^>]+>/g, '');

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
  const iAuto = (i) => (Math.abs(i) < 1e-6 ? [num(i * 1e9, 1), 'nA'] : Math.abs(i) < 1e-3 ? [num(i * 1e6, 2), 'µA'] : [num(i * 1e3, 3), 'mA']);

  /* ---------- şema yardımcıları ---------- */
  const sch = {
    w: (g, pts) => E('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'w' }, g),
    dot: (g, x, y) => E('circle', { cx: x, cy: y, r: 3.5, class: 'node' }, g),
    t: (g, x, y, s, cls = 'lbl', anchor = 'middle') => { const e = E('text', { x, y, class: cls, 'text-anchor': anchor }, g); e.innerHTML = s; return e; },
    rH(g, x1, x2, y) { const n = 6, L = 8, step = (x2 - x1 - 2 * L) / n; let d = `M${x1},${y} h${L}`; for (let i = 0; i < n; i++) d += ` l${step / 2},${i % 2 ? 7 : -7} l${step / 2},${i % 2 ? -7 : 7}`; d += ` L${x2},${y}`; E('path', { d, class: 'w' }, g); },
    rV(g, x, y1, y2) { const n = 6, L = 8, step = (y2 - y1 - 2 * L) / n; let d = `M${x},${y1} v${L}`; for (let i = 0; i < n; i++) d += ` l${i % 2 ? 7 : -7},${step / 2} l${i % 2 ? -7 : 7},${step / 2}`; d += ` L${x},${y2}`; E('path', { d, class: 'w' }, g); },
    gnd(g, x, y) { E('path', { d: `M${x},${y} v8 M${x - 11},${y + 8} h22 M${x - 7},${y + 13} h14 M${x - 3},${y + 18} h6`, class: 'w' }, g); },
    src(g, x, y, r = 20, kind = 'dc') {
      E('circle', { cx: x, cy: y, r, class: 'w', fill: '#fff' }, g);
      if (kind === 'ac') E('path', { d: `M${x - 10},${y} q5,-12 10,0 t10,0`, class: 'w' }, g);
      else { sch.t(g, x, y - 4, '+', 'lbl'); sch.t(g, x, y + 13, '−', 'lbl'); }
    },
    term(g, x, y) { E('circle', { cx: x, cy: y, r: 4.5, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g); },
    opamp(g, x, yt, h = 110, w = 120) { E('path', { d: `M${x},${yt} L${x},${yt + h} L${x + w},${yt + h / 2} Z`, class: 'w', fill: '#f4f7ff' }, g); },
    supply(g) { sch.w(g, [[440, 137], [440, 100]]); sch.t(g, 440, 93, '+V<tspan font-size="10" dy="3">CC</tspan>'); sch.w(g, [[440, 192], [440, 230]]); sch.t(g, 440, 247, '−V<tspan font-size="10" dy="3">CC</tspan>'); },
    probe(g, x, y, name, color) { sch.dot(g, x, y); sch.w(g, [[x, y], [x, y - 24]]); sch.term(g, x, y - 28); const t = sch.t(g, x, y - 40, name); t.style.fill = color; t.style.fontWeight = 700; },
  };
  // Eviren yükselteç şeması (op-amp: x=380, yt=110 → v_n y=140, v_p y=190, çıkış 500,165)
  function schInv(g, kind = 'ac') {
    g.innerHTML = '';
    sch.src(g, 60, 215, 20, kind); sch.w(g, [[60, 195], [60, 140], [110, 140]]); sch.rH(g, 110, 190, 140); sch.w(g, [[190, 140], [380, 140]]); sch.dot(g, 300, 140);
    sch.w(g, [[60, 235], [60, 255]]); sch.gnd(g, 60, 255);
    sch.w(g, [[300, 140], [300, 60], [360, 60]]); sch.rH(g, 360, 440, 60); sch.w(g, [[440, 60], [580, 60], [580, 165]]);
    sch.opamp(g, 380, 110); sch.t(g, 392, 146, '−'); sch.t(g, 392, 196, '+');
    sch.w(g, [[500, 165], [660, 165]]); sch.dot(g, 580, 165); sch.rV(g, 660, 165, 255); sch.gnd(g, 660, 255);
    sch.w(g, [[380, 190], [345, 190], [345, 250]]); sch.gnd(g, 345, 250); sch.supply(g);
    sch.probe(g, 85, 140, 'CH1', '#b8960a'); sch.probe(g, 625, 165, 'CH2', '#1592b8');
    return {
      Rs: sch.t(g, 150, 125, ''), Rf: sch.t(g, 400, 45, ''), RL: sch.t(g, 672, 215, '', 'lbl', 'start'),
      vg: sch.t(g, 88, 225, '', 'val', 'start'), vn: sch.t(g, 296, 160, '', 'val', 'end'), vo: sch.t(g, 505, 192, '', 'val', 'start'),
      is: sch.t(g, 150, 162, '', 'val'), mode: sch.t(g, 600, 22, '', 'val'),
    };
  }
  // Evirmeyen yükselteç şeması
  function schNon(g, kind = 'ac') {
    g.innerHTML = '';
    sch.src(g, 230, 240, 20, kind); sch.w(g, [[230, 220], [230, 190], [380, 190]]); sch.w(g, [[230, 260], [230, 268]]); sch.gnd(g, 230, 268);
    sch.w(g, [[380, 140], [330, 140]]); sch.dot(g, 330, 140); sch.w(g, [[330, 140], [250, 140]]); sch.rH(g, 170, 250, 140); sch.w(g, [[170, 140], [120, 140], [120, 150]]); sch.gnd(g, 120, 150);
    sch.w(g, [[330, 140], [330, 60], [360, 60]]); sch.rH(g, 360, 440, 60); sch.w(g, [[440, 60], [580, 60], [580, 165]]);
    sch.opamp(g, 380, 110); sch.t(g, 392, 146, '−'); sch.t(g, 392, 196, '+');
    sch.w(g, [[500, 165], [660, 165]]); sch.dot(g, 580, 165); sch.rV(g, 660, 165, 255); sch.gnd(g, 660, 255); sch.supply(g);
    sch.probe(g, 300, 190, 'CH1', '#b8960a'); sch.probe(g, 625, 165, 'CH2', '#1592b8');
    return {
      Rs: sch.t(g, 210, 125, ''), Rf: sch.t(g, 400, 45, ''), RL: sch.t(g, 672, 215, '', 'lbl', 'start'),
      vg: sch.t(g, 258, 245, '', 'val', 'start'), vn: sch.t(g, 336, 100, '', 'val', 'start'), vo: sch.t(g, 505, 192, '', 'val', 'start'),
      is: sch.t(g, 300, 215, '', 'val'), mode: sch.t(g, 600, 22, '', 'val'),
    };
  }

  /* ---------- osiloskop paneli ---------- */
  const VDIV = [1e-3, 2e-3, 5e-3, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10];
  const TDIV = [1e-6, 2e-6, 5e-6, 1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2, 2e-2, 5e-2];
  const pick = (L, x) => L.find((v) => v >= x) || L[L.length - 1];
  function mkScope(host, id, o) {
    const w = document.createElement('div'); w.className = 'inst dark scopewrap'; w.style.cssText = 'flex:1;min-width:420px';
    w.innerHTML = `<div class="brand"><span>DSO-2C · Digital Oscilloscope</span><span><span class="led on g"></span> RUN</span></div>
      <div class="row" style="align-items:flex-start;flex-wrap:nowrap"><canvas id="${id}" width="640" height="400" style="width:100%;max-width:640px"></canvas>
      <div style="min-width:160px"><div class="ctrls"></div><div class="row" style="margin:6px 0;gap:4px"><button class="seg-btn on" data-k="c1">CH1</button><button class="seg-btn on" data-k="c2">CH2</button><button class="seg-btn" data-k="cur">CURSOR</button><button class="seg-btn" data-k="auto">AUTO</button></div><div class="meas"></div></div></div>`;
    host.appendChild(w);
    const cv = w.querySelector('canvas'), sc = new Lab.Scope(cv), ck = w.querySelector('.ctrls'), me = w.querySelector('.meas');
    const self = { sc, dirty: true, el: cv };
    const set = () => (self.dirty = true);
    self.k1 = new Lab.Knob(ck, { label: 'CH1 V/div', list: VDIV, value: o.v1, dark: true, size: 44, fmt: (v) => eng(v, 'V'), onChange: (v) => { sc.ch[0].vdiv = v; set(); } });
    self.k2 = new Lab.Knob(ck, { label: 'CH2 V/div', list: VDIV, value: o.v2, dark: true, size: 44, fmt: (v) => eng(v, 'V'), onChange: (v) => { sc.ch[1].vdiv = v; set(); } });
    self.kt = new Lab.Knob(ck, { label: 'TIME/div', list: TDIV, value: o.t, dark: true, size: 44, fmt: (v) => eng(v, 's'), onChange: (v) => { sc.tdiv = v; set(); } });
    sc.ch[0].vdiv = o.v1; sc.ch[1].vdiv = o.v2; sc.tdiv = o.t;
    $$('button', w).forEach((b) => (b.onclick = () => {
      const k = b.dataset.k;
      if (k === 'auto') {
        const m = sc.measure(); if (!m) return;
        self.kt.set(pick(TDIV, 2.5 / o.freq() / 10));
        const sz = (c) => Math.max(Math.abs(c.max), Math.abs(c.min), c.vpp / 2) / 3.5;
        self.k1.set(pick(VDIV, sz(m.ch[0]))); self.k2.set(pick(VDIV, sz(m.ch[1]))); return;
      }
      if (k === 'c1') sc.ch[0].on = !sc.ch[0].on;
      if (k === 'c2') sc.ch[1].on = !sc.ch[1].on;
      if (k === 'cur') sc.cur.on = !sc.cur.on;
      b.classList.toggle('on'); set();
    }));
    cv.addEventListener('pointermove', () => sc.cur.drag && self.show());
    self.show = () => {
      const m = sc.measure(); if (!m) return; self.meas = m;
      const c = (x, k, col) => `<span style="color:${col}">CH${k}</span> Vpp ${eng(x.vpp, 'V')}<br>&nbsp; max ${eng(x.max, 'V')} · min ${eng(x.min, 'V')}<br>&nbsp; f ${isFinite(x.f) ? eng(x.f, 'Hz') : '—'}<br>`;
      let h = c(m.ch[0], 1, '#f2d21b') + c(m.ch[1], 2, '#27c4f0');
      if (m.cur) h += `<span style="color:#ff7cf0">CURSOR</span> Δt ${eng(m.cur.dt, 's')}<br>&nbsp; CH1 a/b ${eng(m.cur.v1a, 'V')} / ${eng(m.cur.v1b, 'V')}<br>&nbsp; CH2 a/b ${eng(m.cur.v2a, 'V')} / ${eng(m.cur.v2b, 'V')}`;
      me.innerHTML = h;
    };
    self.draw = (data) => { sc.draw(data); self.show(); };
    return self;
  }
  function wave(kind, x) {
    const ph = x - Math.floor(x);
    if (kind === 'sq') return ph < 0.5 ? 1 : -1;
    if (kind === 'tri') return ph < 0.25 ? 4 * ph : ph < 0.75 ? 2 - 4 * ph : 4 * ph - 4;
    return Math.sin(2 * Math.PI * x);
  }
  // Zaman alanı benzetimi: vin(t) → CH1, tgt(t) statik (doyumlu) çıkış, SR sınırı uygulanır
  function runSim(scope, f, vin, tgt, ch1 = vin) {
    const n = 1000, T = scope.tdiv * 10, dt = T / (n - 1);
    const pre = Math.min(20000, Math.ceil(Math.max(2 / f, 1e-4) / dt));
    let vo = tgt(-pre * dt);
    const st = (t) => { vo += clamp(tgt(t) - vo, -SR * dt, SR * dt); };
    for (let i = -pre; i < 0; i++) st(i * dt);
    const y1 = new Float64Array(n), y2 = new Float64Array(n), y3 = new Float64Array(n);
    for (let i = 0; i < n; i++) { const t = i * dt; st(t); y1[i] = ch1(t); y2[i] = vo; y3[i] = vin(t); }
    return { n, y: [y1, y2], vin: y3 };
  }
  function waveBtns(fg, self, set) {
    const wb = document.createElement('div'); wb.className = 'row'; wb.style.cssText = 'gap:4px;margin-bottom:4px';
    wb.innerHTML = [['sin', '∿ Sine'], ['tri', '△ Triangle'], ['sq', '⊓ Square']].map(([k, t]) => `<button class="seg-btn${k === self.wave ? ' on' : ''}" data-w="${k}">${t}</button>`).join('');
    fg.el.insertBefore(wb, fg.c);
    $$('button', wb).forEach((b) => (b.onclick = () => { self.wave = b.dataset.w; $$('button', wb).forEach((x) => x.classList.toggle('on', x === b)); set(); }));
  }
  // ölçüm tablosu
  function recorder(k, head, cells, csv, onch) {
    const rows = S[k + 'rows'] || (S[k + 'rows'] = []);
    const tb = $('#' + k + 'tab tbody');
    $('#' + k + 'tab thead').innerHTML = '<tr>' + ['#', ...head].map((h) => `<th>${h}</th>`).join('') + '</tr>';
    const draw = () => { tb.innerHTML = rows.map((r, i) => `<tr><td>${i + 1}</td>${cells(r).map((c) => `<td>${c}</td>`).join('')}</tr>`).join(''); tb.parentElement.parentElement.scrollTop = 1e6; onch && onch(); };
    $('#' + k + 'del').onclick = () => { rows.pop(); save(); draw(); };
    $('#' + k + 'csv').onclick = () => Lab.downloadCSV(csv, ['#', ...head.map(strip)], rows.map((r, i) => [i + 1, ...cells(r).map(strip)]));
    draw();
    return { draw, rows, push(r) { rows.push(r); save(); draw(); } };
  }

  /* ================= GEZİNME / İLERLEME ================= */
  const pages = ['giris', 'onbilgi', 'onhaz', 'd1', 'd2', 'd3', 'd4', 'rapor'];
  function go(p) {
    S.page = p; save();
    $$('section.page').forEach((s) => s.classList.toggle('active', s.id === p));
    $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.p === p));
    [D1, D4].forEach((d) => d && (d.sc.dirty = true));
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
      if (!S.steps[id] && ok) { S.steps[id] = true; save(); Lab.toast('✔ Step completed: ' + strip(s.t).slice(0, 70)); progress(); }
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
  $('#satModel').value = S.sat;
  $('#satModel').onchange = (e) => { S.sat = e.target.value; save(); [D1, D4].forEach((d) => (d.sc.dirty = true)); };

  /* ---------- Ön bilgi şekli ---------- */
  (() => {
    const g = $('#obFig');
    const a = E('g', { transform: 'translate(0,0) scale(.62)' }, g); const L1 = schInv(a, 'ac');
    L1.Rs.textContent = 'R_s'; L1.Rf.textContent = 'R_f'; L1.RL.textContent = 'R_L'; L1.vg.textContent = 'v_g'; L1.vn.textContent = 'v_n = 0 (virtual ground)'; L1.mode.textContent = 'INVERTING: v_o = −(R_f/R_s)·v_g';
    const b = E('g', { transform: 'translate(470,0) scale(.62)' }, g); const L2 = schNon(b, 'ac');
    L2.Rs.textContent = 'R_s'; L2.Rf.textContent = 'R_f'; L2.RL.textContent = 'R_L'; L2.vg.textContent = 'v_g'; L2.vn.textContent = 'v_n = v_g'; L2.mode.textContent = 'NON-INVERTING: v_o = (1+R_f/R_s)·v_g';
    [L1.mode, L2.mode].forEach((t) => (t.style.fontSize = '17px'));
  })();

  /* ================= ÖN HAZIRLIK ================= */
  numq('onhaz', '#preQ', { id: 'p1', q: '1) Inverting amplifier: R<sub>s</sub> = 10 kΩ, R<sub>f</sub> = 47 kΩ, v<sub>g</sub> = 0.2 V, ±15 V. What is v<sub>o</sub> in volts?', answer: -0.94, tol: 1, unit: 'V', explain: 'v<sub>o</sub> = −(47/10)(0.2) = −0.94 V; |v<sub>o</sub>| &lt; 15 V, linear.', hint: 'v<sub>o</sub> = −(R<sub>f</sub>/R<sub>s</sub>)v<sub>g</sub>; mind the sign!' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) Non-inverting amplifier: R<sub>s</sub> = 2.2 kΩ, R<sub>f</sub> = 10 kΩ, v<sub>g</sub> = 1 V. What is v<sub>o</sub> in volts?', answer: 1 + 10 / 2.2, tol: 1, unit: 'V', explain: '1 + 10/2.2 = 5.545 → v<sub>o</sub> ≈ 5.55 V.', hint: 'v<sub>o</sub> = (1 + R<sub>f</sub>/R<sub>s</sub>)v<sub>g</sub>' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) A sensor with 5 V open-circuit voltage and 50 kΩ internal resistance is connected directly to a 50 kΩ load (no buffer). What is the load voltage in volts?', answer: 2.5, tol: 1, unit: 'V', explain: 'Voltage divider: 5·50/(50+50) = 2.5 V. Half of the signal is lost in the internal resistance.', hint: 'Internal resistance and load in series: voltage divider.' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) An inverting amplifier with gain −10 is supplied with ±12 V (course assumption). With v<sub>g</sub> = 1.5 V, what is v<sub>o</sub> in volts?', answer: -12, tol: 0.5, unit: 'V', explain: 'Ideally it would be −15 V; the output saturates at −12 V.', hint: 'First find the ideal result, then compare it with the supply limit.' });
  mcq('onhaz', '#preQ', { id: 'p5', q: '5) What is the input resistance seen by the source in an inverting amplifier?', opts: ['R<sub>f</sub>', 'R<sub>s</sub>', 'R<sub>s</sub> + R<sub>f</sub>', 'Infinite'], correct: 1, explain: 'The inverting node is a virtual ground; the source sees only R<sub>s</sub>.', hint: 'What is the voltage at the right-hand end of R<sub>s</sub>?' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) Which of these is <b>not</b> a resistor value in the E12 (10 %) series?', opts: ['4.7 kΩ', '5.6 kΩ', '5 kΩ', '8.2 kΩ'], correct: 2, explain: 'E12: 1.0 1.2 1.5 1.8 2.2 2.7 3.3 3.9 4.7 5.6 6.8 8.2 (× 10<sup>n</sup>). 5 kΩ can only be obtained with a trimpot or a series/parallel combination.', hint: 'Memorise the E12 series: 10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82.' });

  /* ================= DENEY 1 · Eviren yükselteç ================= */
  const D1 = (() => {
    const box = $('#d1inst'), self = { wave: 'sin', c: {} };
    const set = () => (self.sc.dirty = true);
    const fg = inst(box, 'FG-100 FUNCTION GENERATOR', 'R<sub>int</sub> 50 Ω'); const fgL = lcd(fg.el, 'FREQUENCY · AMPLITUDE · OFFSET', '', 230);
    waveBtns(fg, self, set);
    const kf = new Lab.Knob(fg.c, { label: 'Frequency', min: 10, max: 1e5, log: true, value: 1000, dark: true, fmt: (v) => eng(v, 'Hz'), onChange: set });
    const ka = new Lab.Knob(fg.c, { label: 'Amplitude', min: 0.01, max: 20, log: true, value: 0.2, dark: true, fmt: (v) => eng(v, 'Vpp'), onChange: set });
    const ko = new Lab.Knob(fg.c, { label: 'Offset', min: -5, max: 5, step: 0.05, value: 0, dark: true, fmt: (v) => num(v, 2) + ' V', onChange: set });
    const rb = inst(box, 'RESISTOR BOX', false);
    const ks = new Lab.Knob(rb.c, { label: 'R_s', list: RBOX, value: 1e4, fmt: Lab.ohm, onChange: set });
    const kr = new Lab.Knob(rb.c, { label: 'R_f', list: RBOX, value: 1e4, fmt: Lab.ohm, onChange: set });
    const kl = new Lab.Knob(rb.c, { label: 'R_L', list: [100, 220, 470, 1e3, 2.2e3, 4.7e3, 1e4, INF], value: INF, fmt: rfmt, onChange: set });
    const ps = inst(box, '±V<sub>CC</sub>'); const psL = lcd(ps.el, 'SUPPLY', 'V', 90);
    const kv = new Lab.Knob(ps.c, { label: 'V_CC', min: 5, max: 18, step: 0.5, value: 15, dark: true, fmt: (v) => '±' + num(v, 1) + ' V', onChange: set });
    self.sc = mkScope($('#d1scope'), 'd1sc', { v1: 0.1, v2: 0.5, t: 2e-4, freq: () => kf.value });
    const L = schInv($('#d1sch'), 'ac');

    function compute() {
      const Rs = ks.value, Rf = kr.value, RL = kl.value, vcc = kv.value, f = kf.value, Am = ka.value / 2, off = ko.value;
      const Rs1 = Rs + RG, G = -(Rf / Rs1) / (1 + (1 + Rf / Rs1) / A0);
      const vmaxI = IMAX / (1 / RL + 1 / Rf), vs = vsat(vcc), vmax = Math.min(vs, vmaxI);
      const emf = (t) => Am * wave(self.wave, f * t) + off;
      const term = (t) => (emf(t) * Rs) / Rs1;
      const tgt = (t) => clamp(G * emf(t), -vmax, vmax);
      const pk = Math.max(Math.abs(Am + off), Math.abs(-Am + off));
      const clip = Math.abs(G) * pk > vmax * 0.999;
      return { Rs, Rf, RL, vcc, f, Am, off, G, vmax, emf, term, tgt, clip, ilim: Math.abs(G) * pk > vmaxI && vmaxI < vs, Rs1, wave: self.wave, vpp: ka.value };
    }
    self.update = () => {
      if (!self.sc.dirty) return; self.sc.dirty = false;
      const c = (self.c = compute());
      fgL(`${eng(c.f, 'Hz')} · ${eng(c.vpp, 'Vpp')} · ${num(c.off, 2)} V`); psL('±' + num(c.vcc, 1));
      const d = runSim(self.sc.sc, c.f, c.emf, c.tgt, c.term);
      // eviren uç gerilimi (doyumda sanal toprak bozulur)
      let vnpk = 0;
      for (let i = 0; i < d.n; i++) { const vn = (d.vin[i] * c.Rf + d.y[1][i] * c.Rs1) / (c.Rs1 + c.Rf); if (Math.abs(vn) > Math.abs(vnpk)) vnpk = vn; }
      self.vnpk = vnpk;
      self.sc.draw(d);
      L.Rs.textContent = 'R_s = ' + Lab.ohm(c.Rs); L.Rf.textContent = 'R_f = ' + Lab.ohm(c.Rf); L.RL.textContent = 'R_L = ' + (c.RL >= 1e9 ? '∞' : Lab.ohm(c.RL));
      L.vg.textContent = 'v_g: ' + eng(c.vpp, 'Vpp'); L.vn.textContent = '|v_n|max = ' + (Math.abs(vnpk) < 1e-3 ? num(Math.abs(vnpk) * 1e6, 1) + ' µV' : num(Math.abs(vnpk) * 1e3, 1) + ' mV');
      L.vo.textContent = 'v_o'; L.is.textContent = '';
      L.mode.textContent = c.ilim ? 'CURRENT LIMIT (25 mA) · CLIPPING' : c.clip ? 'SATURATION · PEAKS CLIPPED' : 'LINEAR · VIRTUAL GROUND';
      L.mode.style.fill = c.clip ? '#c62828' : '#1a8a4a';
    };
    const tab = recorder('d1', ['R<sub>s</sub>', 'R<sub>f</sub>', 'R<sub>L</sub>', 'f', 'CH1 Vpp', 'CH2 Vpp', 'CH2/CH1', 'Clipping'],
      (r) => [Lab.ohm(r.Rs), Lab.ohm(r.Rf), r.RL >= 1e9 ? '∞' : Lab.ohm(r.RL), eng(r.f, 'Hz'), num(r.v1, 3), num(r.v2, 3), num(r.v2 / r.v1, 3), r.clip ? 'yes' : 'no'], 'hafta2_deney1.csv');
    self.rec = () => {
      const c = self.c, m = self.sc.meas; if (!m) return;
      tab.push({ Rs: c.Rs, Rf: c.Rf, RL: c.RL, f: c.f, v1: m.ch[0].vpp, v2: m.ch[1].vpp, clip: c.clip });
      Lab.toast(`Recorded: CH1 ${num(m.ch[0].vpp, 3)} Vpp → CH2 ${num(m.ch[1].vpp, 3)} Vpp`);
    };
    $('#d1rec').onclick = self.rec;
    Object.assign(self, { kf, ka, ko, ks, kr, kl, kv, tab });
    return self;
  })();
  const c1 = () => D1.c || {};
  steps('d1', [
    { t: 'Example 1.2: <b>R<sub>s</sub> = 20 kΩ, R<sub>f</sub> = 80 kΩ</b>, ±15 V. Set the generator to <b>sine, 1 kHz, 1 Vpp</b> (0.5 V peak), offset 0.', test: () => { const c = c1(); return c.wave === 'sin' && c.Rs === 2e4 && c.Rf === 8e4 && near(c.f, 1000, 50) && near(c.vpp, 1, 0.05) && Math.abs(c.off) < 0.03 && c.vcc === 15; } },
    { t: 'Set CH1 to <b>0.2 V/div</b> and CH2 to <b>1 V/div</b>. Turn the CURSORs on and measure Δt between an input peak and an output trough: phase difference = 360°·f·Δt.', test: () => S.steps.d1_0 && D1.sc.k1.value === 0.2 && D1.sc.k2.value === 1 && D1.sc.sc.cur.on },
    { t: 'Record a measurement at this setting (<kbd>R</kbd>). Calculate the gain from the Vpp ratio.', test: () => D1.tab.rows.some((r) => r.Rs === 2e4 && r.Rf === 8e4 && !r.clip) },
    { t: 'Example 1.3: increase the amplitude to find the point where the output <b>clips</b>, and record a clipped measurement. At what input peak did it start?', test: () => D1.tab.rows.some((r) => r.Rs === 2e4 && r.Rf === 8e4 && r.clip) },
    { t: 'Increase the gain to <b>−8</b> without changing the input resistance (keep R<sub>s</sub> = 20 kΩ), and record with a 1 Vpp input.', test: () => D1.tab.rows.some((r) => r.Rs === 2e4 && r.Rf === 1.6e5 && !r.clip) },
    { t: 'Reduce R<sub>L</sub> to <b>100 Ω</b> and increase the input: because of the 25 mA current limit the output clips well before ±15 V.', test: () => c1().ilim && c1().RL === 100 },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: 'In the Example 1.2 circuit (R<sub>s</sub> = 20 kΩ, R<sub>f</sub> = 80 kΩ), what voltage gain v<sub>o</sub>/v<sub>g</sub> did you measure? (with sign)', answer: -4, tol: 2, unit: '', explain: '−R<sub>f</sub>/R<sub>s</sub> = −4. The Vpp ratio gives the magnitude; the sign comes from the antiphase.', hint: 'CH2 Vpp / CH1 Vpp, then look at the phase.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'What input-output phase difference, in degrees, did you measure with the cursors?', answer: 180, tol: 4, unit: '°', explain: 'Minus sign = 180° phase difference: when the input is at its peak, the output is at its trough.', hint: 'Δφ = 360°·f·Δt; at 1 kHz the half-period is 0.5 ms.' });
  numq('d1', '#d1Q', { id: 'd1q3', q: 'With v<sub>g</sub> = 0.5 V (DC), what is the current i<sub>s</sub> through R<sub>s</sub> in µA?', answer: 25, tol: 2, unit: 'µA', explain: 'i<sub>s</sub> = 0.5/20 k = 25 µA; the same current flows through R<sub>f</sub>: 25 µA × 80 kΩ = 2 V.', hint: 'The inverting node is at 0 V.' });
  numq('d1', '#d1Q', { id: 'd1q4', q: 'Example 1.3: at ±15 V (course assumption), what is the largest input peak |v<sub>g</sub>| in volts for linear operation?', answer: 3.75, tol: 1, unit: 'V', explain: '4|v<sub>g</sub>| ≤ 15 → |v<sub>g</sub>| ≤ 3.75 V, i.e. 7.5 Vpp. In practice a 10 % margin is left.', hint: '|gain| × peak ≤ V<sub>sat</sub>' });
  numq('d1', '#d1Q', { id: 'd1q5', q: 'With v<sub>g</sub> = 0.5 V and R<sub>L</sub> = 1 kΩ, what is the magnitude |i<sub>o</sub>| of the op-amp output current in mA?', answer: 2.025, tol: 1, unit: 'mA', explain: 'i<sub>o</sub> = i<sub>L</sub> − i<sub>f</sub> = −2 − 0.025 = −2.025 mA. This current comes from the supply.', hint: 'Load current + R<sub>f</sub> current.' });
  mcq('d1', '#d1Q', { id: 'd1q6', q: 'What should be done to change the gain from −4 to −8 <b>without changing the input resistance</b>?', opts: ['Halve R<sub>s</sub>', 'Double R<sub>f</sub>', 'Double the supply', 'Use an op-amp with a larger A'], correct: 1, explain: 'R<sub>in</sub> = R<sub>s</sub> must stay constant; R<sub>f</sub>: 80 → 160 kΩ. The supply and A do not set the gain.', hint: 'Which resistor was the input resistance equal to?' });

  /* ================= DENEY 2 · Evirmeyen yükselteç ================= */
  const D2 = (() => {
    const box = $('#d2inst'), self = { swept: false, sweep: [] };
    const dc = inst(box, 'ADJUSTABLE DC SUPPLY · v<sub>g</sub>'); const dcL = lcd(dc.el, 'v<sub>g</sub>', 'V', 100);
    const kg = new Lab.Knob(dc.c, { label: 'v_g', min: -10, max: 10, step: 0.01, value: 1, dark: true, fmt: (v) => num(v, 2) + ' V' });
    const rb = inst(box, 'RESISTOR BOX', false);
    const ks = new Lab.Knob(rb.c, { label: 'R_s', list: [...RBOX, INF], value: 1e4, fmt: rfmt });
    const kr = new Lab.Knob(rb.c, { label: 'R_f', list: [0, ...RBOX], value: 1e4, fmt: rfmt });
    const kl = new Lab.Knob(rb.c, { label: 'R_L', list: [470, 1e3, 2.2e3, 4.7e3, 1e4, INF], value: 1e4, fmt: rfmt });
    const ps = inst(box, '±V<sub>CC</sub>'); const psL = lcd(ps.el, 'SUPPLY', 'V', 80);
    const kv = new Lab.Knob(ps.c, { label: 'V_CC', min: 5, max: 18, step: 0.5, value: 15, dark: true, fmt: (v) => '±' + num(v, 1) + ' V' });
    const m1 = inst(box, 'DMM-1 · v<sub>o</sub>', false); const m1L = lcd(m1.el, 'DC V', 'V', 110);
    const m2 = inst(box, 'DMM-2 · source current i<sub>g</sub>', false); const m2L = lcd(m2.el, 'DC A · auto range', 'nA', 120);
    const L = schNon($('#d2sch'), 'dc');

    function compute(vg = kg.value) {
      const Rs = ks.value, Rf = kr.value, RL = kl.value, vcc = kv.value, m = model(vcc);
      const b = Rs >= 1e9 || Rf === 0 ? 1 : Rs / (Rs + Rf);
      const r = Lab.opamp(vg, 0, 0, b, m);
      let vo = r.vo, ilim = false;
      const Gl = (RL >= 1e9 ? 0 : 1 / RL) + (Rs >= 1e9 ? 0 : 1 / (Rs + Rf));
      if (Math.abs(vo) * Gl > IMAX) { vo = (Math.sign(vo) * IMAX) / Gl; ilim = true; }
      const vn = b * vo, ig = IB + (vg - vn) / RI;
      const sat = Math.abs(r.vo) >= m.vsatP * 0.999 || ilim;
      return { vg, Rs, Rf, RL, vcc, vo, vn, ig, sat, ilim, b };
    }
    self.update = () => {
      const c = (self.c = compute());
      dcL(num(c.vg, 2)); psL('±' + num(c.vcc, 1)); m1L(num(c.vo, 3)); const a = iAuto(c.ig); m2L(a[0], a[1]);
      L.Rs.textContent = 'R_s = ' + rfmt(c.Rs); L.Rf.textContent = 'R_f = ' + rfmt(c.Rf); L.RL.textContent = 'R_L = ' + (c.RL >= 1e9 ? '∞' : Lab.ohm(c.RL));
      L.vg.textContent = 'v_g = ' + num(c.vg, 2) + ' V'; L.vn.textContent = 'v_n = ' + num(c.vn, 3) + ' V'; L.vo.textContent = 'v_o = ' + num(c.vo, 3) + ' V';
      L.is.textContent = 'i_g = ' + a.join(' ');
      L.mode.textContent = c.ilim ? 'CURRENT LIMIT' : c.sat ? 'SATURATION · v_n ≠ v_p' : 'LINEAR · v_n = v_p';
      L.mode.style.fill = c.sat ? '#c62828' : '#1a8a4a';
    };
    const plot = new Lab.Plot($('#d2plot'), { xlabel: 'v_g  (V)', ylabel: 'v_o  (V)' });
    function drawPlot() {
      const ser = [];
      if ($('#d2theo').checked && self.c) {
        const c = self.c, G = c.Rs >= 1e9 || c.Rf === 0 ? 1 : 1 + c.Rf / c.Rs, vs = vsat(c.vcc);
        const pts = []; for (let v = -10.5; v <= 10.501; v += 0.05) pts.push([v, clamp(v * G, -vs, vs)]);
        ser.push({ pts, line: true, color: '#e07a10', dash: [6, 4] });
      }
      if (self.sweep.length) ser.push({ pts: self.sweep, line: true, color: '#0b5cad', width: 2.5 });
      ser.push({ pts: S.d2rows.map((r) => [r.vg, r.vo]), dots: true, color: '#c62828' });
      plot.draw(ser, [-10.5, 10.5], [-19, 19]);
    }
    $('#d2theo').onchange = drawPlot;
    const tab = recorder('d2', ['R<sub>s</sub>', 'R<sub>f</sub>', 'R<sub>L</sub>', 'v<sub>g</sub> (V)', 'v<sub>o</sub> (V)', 'v<sub>o</sub>/v<sub>g</sub>', 'i<sub>g</sub>', 'Region'],
      (r) => [rfmt(r.Rs), rfmt(r.Rf), r.RL >= 1e9 ? '∞' : Lab.ohm(r.RL), num(r.vg, 2), num(r.vo, 3), r.vg ? num(r.vo / r.vg, 3) : '—', iAuto(r.ig).join(' '), r.sat ? 'saturation' : 'linear'], 'hafta2_deney2.csv', () => drawPlot());
    self.rec = () => { const c = compute(); tab.push({ Rs: c.Rs, Rf: c.Rf, RL: c.RL, vg: c.vg, vo: c.vo, ig: c.ig, sat: c.sat }); Lab.toast(`Recorded: v_g = ${num(c.vg, 2)} V → v_o = ${num(c.vo, 3)} V`); };
    $('#d2rec').onclick = self.rec;
    $('#d2sweep').onclick = () => {
      self.sweep = []; for (let v = -10; v <= 10.001; v += 0.1) { const c = compute(v); self.sweep.push([v, c.vo]); }
      if (ks.value === 1e4 && kr.value === 4e4) self.swept = true;
      drawPlot(); Lab.toast('Sweep finished: slope (1 + R_f/R_s), saturation at the ends.');
    };
    $('#d2clr').onclick = () => { self.sweep = []; drawPlot(); };
    Object.assign(self, { kg, ks, kr, kl, kv, tab, plotCanvas: $('#d2plot') });
    return self;
  })();
  steps('d2', [
    { t: 'Example 1.4: <b>R<sub>s</sub> = 10 kΩ, R<sub>f</sub> = 40 kΩ, v<sub>g</sub> = 2 V</b>, ±15 V. Read v<sub>o</sub> and the source current on DMM-2 and record them.', test: () => D2.tab.rows.some((r) => r.Rs === 1e4 && r.Rf === 4e4 && near(r.vg, 2, 0.005) && !r.sat) },
    { t: 'With the same resistors increase v<sub>g</sub> until saturation occurs and record a point <b>in saturation</b>.', test: () => D2.tab.rows.some((r) => r.Rs === 1e4 && r.Rf === 4e4 && r.sat && r.vg > 0) },
    { t: 'Use <b>Auto sweep</b> to plot the transfer curve for R<sub>s</sub> = 10 kΩ, R<sub>f</sub> = 40 kΩ; turn on Ideal curve and compare.', test: () => D2.swept },
    { t: 'Try to make the gain <b>less than 1</b>: reduce R<sub>f</sub> to its minimum (<b>0, short circuit</b>) and record a measurement. What happened?', test: () => D2.tab.rows.some((r) => r.Rf === 0 && !r.sat && Math.abs(r.vg) > 0.1) },
    { t: 'Now with R<sub>f</sub> = 40 kΩ set <b>R<sub>s</sub> = ∞</b> (open) and record. Is this also a voltage follower?', test: () => D2.tab.rows.some((r) => r.Rs >= 1e9 && r.Rf > 0 && !r.sat && Math.abs(r.vg) > 0.1) },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'Example 1.4 (R<sub>s</sub> = 10 kΩ, R<sub>f</sub> = 40 kΩ, v<sub>g</sub> = 2 V): what is v<sub>o</sub> in volts?', answer: 10, tol: 1, unit: 'V', explain: '(1 + 40/10)·2 = 10 V, in phase.', hint: '1 + R<sub>f</sub>/R<sub>s</sub>' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'In the same circuit at ±15 V (course assumption), what is the largest |v<sub>g</sub>| in volts for linear operation?', answer: 3, tol: 1, unit: 'V', explain: '5|v<sub>g</sub>| ≤ 15 → |v<sub>g</sub>| ≤ 3 V.', hint: 'Gain × v<sub>g</sub> ≤ V<sub>sat</sub>' });
  mcq('d2', '#d2Q', { id: 'd2q3', q: 'What does the source current you read on DMM-2 (≈80 nA) indicate?', opts: ['The gain is set wrongly', 'In the ideal model i<sub>p</sub> = 0; this is the small input bias current of the real 741. The source is practically not loaded at all', 'All of the current flows through R<sub>s</sub>', 'The op-amp is saturated'], correct: 1, explain: 'The input resistance of the non-inverting configuration is very large; it is preferred for sensitive sensors.', hint: 'Does the current change noticeably when you change v<sub>g</sub>?' });
  mcq('d2', '#d2Q', { id: 'd2q4', q: 'Can a gain of 0.5 be obtained with the non-inverting configuration?', opts: ['Yes, if R<sub>f</sub> &lt; R<sub>s</sub> is chosen', 'No; the gain is 1 + R<sub>f</sub>/R<sub>s</sub> ≥ 1. For attenuation use the inverting configuration or a voltage divider at the input', 'Yes, if R<sub>f</sub> is chosen negative', 'Yes, if the supply is reduced'], correct: 1, explain: 'A fraction of the output is made equal to the input; the output cannot be smaller than the input.', hint: 'What gain did you measure with R<sub>f</sub> = 0?' });
  numq('d2', '#d2Q', { id: 'd2q5', q: 'With R<sub>s</sub> = 10 kΩ, what must R<sub>f</sub> be in kΩ for a gain of +3?', answer: 20, tol: 1, unit: 'kΩ', explain: '1 + R<sub>f</sub>/10k = 3 → R<sub>f</sub> = 20 kΩ.', hint: 'R<sub>f</sub> = (K − 1)R<sub>s</sub>' });
  mcq('d2', '#d2Q', { id: 'd2q6', q: 'Both R<sub>s</sub> = ∞ and R<sub>f</sub> = 0 give a voltage follower. Why?', opts: ['In both cases the feedback divider ratio is 1: v<sub>n</sub> = v<sub>o</sub>', 'In both cases the op-amp is saturated', 'In both cases the input current is large', 'Only one of them is a follower'], correct: 0, explain: 'With R<sub>s</sub> open no current flows through R<sub>f</sub>, so there is no voltage drop across it; v<sub>n</sub> = v<sub>o</sub>.', hint: 'What is the relation between v<sub>n</sub> and v<sub>o</sub> in each case?' });

  /* ================= DENEY 3 · Yükleme etkisi ve tampon ================= */
  const D3 = (() => {
    const box = $('#d3inst'), self = { buf: false, swept: { on: false, off: false }, sw: { on: [], off: [] }, ilimSeen: false };
    const se = inst(box, 'SENSOR (Thévenin model)'); const seL = lcd(se.el, 'v<sub>Th</sub> (open circuit)', 'V', 110);
    const kV = new Lab.Knob(se.c, { label: 'v_Th', min: 0, max: 10, step: 0.05, value: 5, dark: true, fmt: (v) => num(v, 2) + ' V' });
    const kR = new Lab.Knob(se.c, { label: 'R_int', list: [1e3, 1e4, 4.7e4, 1e5, 2.2e5, 4.7e5, 1e6], value: 1e5, dark: true, fmt: Lab.ohm });
    const bf = inst(box, 'BUFFER (µA741 follower) · ±15 V', false);
    const bb = document.createElement('button'); bb.className = 'seg-btn'; bb.style.cssText = 'width:130px;padding:8px 4px'; bf.c.appendChild(bb);
    const bt = () => { bb.textContent = self.buf ? 'BUFFER: IN CIRCUIT' : 'BUFFER: NONE (direct)'; bb.classList.toggle('on', self.buf); };
    bb.onclick = () => { self.buf = !self.buf; bt(); }; bt();
    const ld = inst(box, 'LOAD (instrument / ADC)', false);
    const kL = new Lab.Knob(ld.c, { label: 'R_L', list: [100, 220, 470, 1e3, 2.2e3, 4.7e3, 1e4, 2.2e4, 4.7e4, 1e5, 2.2e5, 4.7e5, 1e6, INF], value: 1e4, fmt: rfmt });
    const m1 = inst(box, 'DMM-1 · v<sub>L</sub>', false, '10 MΩ'); const m1L = lcd(m1.el, 'DC V', 'V', 110);
    const m2 = inst(box, 'DMM-2 · i<sub>L</sub>', false); const m2L = lcd(m2.el, 'DC A', 'mA', 110);

    // şema
    const g = $('#d3sch');
    sch.src(g, 60, 200); sch.w(g, [[60, 180], [60, 130], [100, 130]]); sch.rH(g, 100, 180, 130); sch.w(g, [[180, 130], [240, 130]]); sch.dot(g, 240, 130);
    sch.w(g, [[60, 220], [60, 255]]); sch.gnd(g, 60, 255);
    E('rect', { x: 30, y: 95, width: 180, height: 140, fill: 'none', stroke: '#888', 'stroke-dasharray': '5 4', rx: 6 }, g); sch.t(g, 120, 88, 'SENSOR').style.fill = '#777';
    const gb = E('g', {}, g), gd = E('g', {}, g);
    sch.w(gb, [[240, 130], [240, 190], [380, 190]]); sch.opamp(gb, 380, 110); sch.t(gb, 392, 146, '−'); sch.t(gb, 392, 196, '+');
    sch.w(gb, [[500, 165], [530, 165], [530, 80], [350, 80], [350, 140], [380, 140]]); sch.w(gb, [[530, 165], [640, 165]]); sch.dot(gb, 530, 165);
    sch.w(gd, [[240, 130], [240, 40], [640, 40], [640, 165]]);
    sch.dot(g, 640, 165); sch.w(g, [[640, 165], [680, 165]]); sch.rV(g, 680, 165, 255); sch.gnd(g, 680, 255);
    const tRi = sch.t(g, 140, 116, ''), tV = sch.t(g, 88, 205, '', 'val', 'start'), tRL = sch.t(g, 694, 215, '', 'lbl', 'start'), tvL = sch.t(g, 650, 150, '', 'val', 'end'), tvS = sch.t(g, 236, 150, '', 'val', 'end'), tMode = sch.t(g, 450, 270, '', 'val');
    sch.t(g, 694, 235, '‖ DMM 10 MΩ', 'lbl', 'start').style.fontSize = '11px';

    function compute(RL = kL.value, buf = self.buf) {
      const vth = kV.value, Ri = kR.value, RLe = RL >= 1e9 ? RDMM : (RL * RDMM) / (RL + RDMM), vs = vsat(15);
      let vL, vS, ilim = false, sat = false;
      if (!buf) { vL = (vth * RLe) / (Ri + RLe); vS = vL; }
      else {
        let vo = vth / (1 + 1 / A0 + Ri / (A0 * RI));
        if (Math.abs(vo) > vs) { vo = Math.sign(vo) * vs; sat = true; }
        if (Math.abs(vo) / RLe > IMAX) { vo = Math.sign(vo) * IMAX * RLe; ilim = true; }
        vL = vo; vS = vth - Ri * (IB + vo / (A0 * RI));
      }
      return { vth, Ri, RL, buf, vL, vS, iL: RL >= 1e9 ? 0 : vL / RL, ilim, sat };
    }
    self.update = () => {
      const c = (self.c = compute());
      if (c.ilim) self.ilimSeen = true;
      seL(num(c.vth, 2)); m1L(num(c.vL, 3)); m2L(num(c.iL * 1e3, 3));
      gb.style.opacity = c.buf ? 1 : 0.13; gd.style.opacity = c.buf ? 0.13 : 1;
      tRi.textContent = 'R_int = ' + Lab.ohm(c.Ri); tV.textContent = 'v_Th = ' + num(c.vth, 2) + ' V'; tRL.textContent = 'R_L = ' + (c.RL >= 1e9 ? '∞ (DMM only)' : Lab.ohm(c.RL));
      tvL.textContent = 'v_L = ' + num(c.vL, 3) + ' V'; tvS.textContent = 'v_sensor = ' + num(c.vS, 3) + ' V';
      tMode.textContent = c.ilim ? 'BUFFER IN CURRENT LIMIT (25 mA)!' : c.buf ? 'Sensor not loaded · op-amp supplies the current' : 'Voltage divider: R_int and R_L share the voltage';
      tMode.style.fill = c.ilim ? '#c62828' : c.buf ? '#1a8a4a' : '#b26a00';
    };
    const plot = new Lab.Plot($('#d3plot'), { xlabel: 'log10(R_L / Ω)', ylabel: 'v_L  (V)' });
    const lg = (R) => Math.log10(R >= 1e9 ? 1e7 : R);
    function drawPlot() {
      const ser = [];
      if ($('#d3theo').checked && self.c) {
        const pts = []; for (let x = 2; x <= 7.001; x += 0.05) { const R = 10 ** x; pts.push([x, (self.c.vth * R) / (self.c.Ri + R)]); }
        ser.push({ pts, line: true, color: '#e07a10', dash: [6, 4] }, { pts: [[2, self.c.vth], [7, self.c.vth]], line: true, color: '#1a8a4a', dash: [6, 4] });
      }
      if (self.sw.off.length) ser.push({ pts: self.sw.off, line: true, color: '#b26a00', width: 2.5 });
      if (self.sw.on.length) ser.push({ pts: self.sw.on, line: true, color: '#0b5cad', width: 2.5 });
      ser.push({ pts: S.d3rows.filter((r) => !r.buf).map((r) => [lg(r.RL), r.vL]), dots: true, color: '#c62828' });
      ser.push({ pts: S.d3rows.filter((r) => r.buf).map((r) => [lg(r.RL), r.vL]), dots: true, color: '#0b2a4a' });
      plot.draw(ser, [2, 7], [0, 10.5]);
    }
    $('#d3theo').onchange = drawPlot;
    const tab = recorder('d3', ['v<sub>Th</sub> (V)', 'R<sub>int</sub>', 'Buffer', 'R<sub>L</sub>', 'v<sub>L</sub> (V)', 'i<sub>L</sub> (mA)'],
      (r) => [num(r.vth, 2), Lab.ohm(r.Ri), r.buf ? 'yes' : 'no', r.RL >= 1e9 ? '∞ (DMM)' : Lab.ohm(r.RL), num(r.vL, 3), num(r.iL * 1e3, 3)], 'hafta2_deney3.csv', () => drawPlot());
    self.rec = () => { const c = compute(); tab.push({ vth: c.vth, Ri: c.Ri, buf: c.buf, RL: c.RL, vL: c.vL, iL: c.iL }); Lab.toast(`Recorded: ${c.buf ? 'with buffer' : 'without buffer'}, v_L = ${num(c.vL, 3)} V`); };
    $('#d3rec').onclick = self.rec;
    $('#d3sweep').onclick = () => {
      const k = self.buf ? 'on' : 'off'; self.sw[k] = [];
      for (let x = 2; x <= 7.001; x += 0.05) { const c = compute(10 ** x); self.sw[k].push([x, c.vL]); }
      if (kV.value === 5 && kR.value === 1e5) self.swept[k] = true;
      drawPlot(); Lab.toast(self.buf ? 'Sweep with buffer added (blue).' : 'Sweep without buffer added (orange).');
    };
    $('#d3clr').onclick = () => { self.sw = { on: [], off: [] }; drawPlot(); };
    Object.assign(self, { kV, kR, kL, tab, plotCanvas: $('#d3plot') });
    drawPlot();
    return self;
  })();
  const f3 = (buf, RL, Ri = 1e5) => D3.tab.rows.some((r) => r.buf === buf && r.RL === RL && r.Ri === Ri && near(r.vth, 5, 0.01));
  steps('d3', [
    { t: 'Example 1.5: sensor <b>5 V, R<sub>int</sub> = 100 kΩ</b>, load <b>10 kΩ</b>, <b>no</b> buffer. Read v<sub>L</sub> and record it.', test: () => f3(false, 1e4) },
    { t: 'Switch the buffer in and record with the same load. How did v<sub>L</sub> and the sensor terminal voltage change?', test: () => f3(true, 1e4) },
    { t: 'For 5 V / 100 kΩ run the <b>R<sub>L</sub> sweep</b> both without and with the buffer (press the sweep button twice).', test: () => D3.swept.on && D3.swept.off },
    { t: 'With the buffer in circuit reduce R<sub>L</sub> to <b>100 Ω</b>. The buffer cannot drive every load: it enters the 25 mA current limit.', test: () => D3.ilimSeen },
    { t: 'Set the sensor to <b>R<sub>int</sub> = 1 MΩ</b> and record without buffer and with <b>R<sub>L</sub> = ∞</b> (DMM only): even the instrument itself loads the source!', test: () => f3(false, INF, 1e6) },
  ]);
  numq('d3', '#d3Q', { id: 'd3q1', q: 'Without the buffer (5 V, 100 kΩ, 10 kΩ load), what is v<sub>L</sub> in volts?', answer: 0.4545, tol: 2, unit: 'V', explain: '5·10/(100+10) = 0.45 V. The DMM’s 10 MΩ affects this value by only 1 ‰.', hint: 'Voltage divider' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'In this case, what percentage of the sensor voltage is lost?', answer: 90.9, tol: 1, unit: '%', explain: '(5 − 0.45)/5 = 91 % loss.', hint: '(v<sub>Th</sub> − v<sub>L</sub>)/v<sub>Th</sub> × 100' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'With the buffer, what is the load current i<sub>L</sub> in mA, and who supplies it? (enter the number)', answer: 0.5, tol: 2, unit: 'mA', explain: '5 V/10 kΩ = 0.5 mA; the current comes not from the sensor but from the op-amp supply.', hint: 'v<sub>L</sub>/R<sub>L</sub>' });
  numq('d3', '#d3Q', { id: 'd3q4', q: 'With the buffer in circuit and R<sub>L</sub> = 100 Ω, what v<sub>L</sub> did you read, in volts? (5 V sensor)', answer: 2.5, tol: 2, unit: 'V', explain: '5 V/100 Ω would require 50 mA; the op-amp supplies at most 25 mA → 25 mA × 100 Ω = 2.5 V. A heavy load needs a power stage.', hint: 'I<sub>max</sub> × R<sub>L</sub>' });
  numq('d3', '#d3Q', { id: 'd3q5', q: 'If you measure a 5 V sensor with 1 MΩ internal resistance directly with a DMM of 10 MΩ input, how many volts do you read?', answer: 50 / 11, tol: 1, unit: 'V', explain: '5·10/11 = 4.545 V: the instrument alone causes a 9 % error.', hint: 'The input resistance of the DMM is also a load.' });
  mcq('d3', '#d3Q', { id: 'd3q6', q: 'If the gain of a voltage follower is 1, what is the circuit good for?', opts: ['It is of no use', 'It amplifies the voltage', 'It supplies current and power and isolates the source from the load', 'It inverts the signal'], correct: 2, explain: 'i<sub>p</sub> ≈ 0, i<sub>o</sub> = v<sub>o</sub>/R<sub>L</sub>: the power gain is very large. That is why instruments and ADC inputs start with a buffer.', hint: 'Is current drawn from the sensor when the buffer is present?' });

  /* ================= DENEY 4 · Tasarım görevi ================= */
  const D4 = (() => {
    const box = $('#d4inst'), self = { c: {} };
    const set = () => (self.sc.dirty = true);
    function newTask() {
      const inv = Math.random() < 0.6, vcc = Math.random() < 0.5 ? 12 : 15;
      let t;
      if (inv) {
        const G = [3, 5, 8, 10, 12, 15, 20, 22, 33][Math.floor(Math.random() * 9)];
        let rin = [2e3, 4.7e3, 1e4, 2.2e4, 4.7e4][Math.floor(Math.random() * 5)];
        while (G * rin > 5e5) rin /= 2.2;
        t = { inv, G: -G, rin: +rin.toPrecision(2), vcc };
      } else {
        const G = [2, 3, 4, 6, 11, 16][Math.floor(Math.random() * 6)];
        t = { inv, G, vcc };
      }
      t.vpk = Math.floor(((0.7 * vcc) / Math.abs(t.G)) * 100) / 100;
      S.task = t; save(); showTask(); set();
    }
    function showTask() {
      const t = S.task;
      $('#d4task').innerHTML = t.inv
        ? `<b>Task:</b> Design a microphone preamplifier. Voltage gain <b>${t.G}</b> (±5 %), input resistance seen by the source <b>at least ${Lab.ohm(t.rin)}</b>, input signal at most <b>${num(t.vpk, 2)} V peak</b>, supply <b>±${t.vcc} V</b>. <b>E12</b> resistors only (5 % tolerance), R ≤ 1 MΩ. At the largest input the output must leave <b>at least a 10 % margin</b> to saturation.`
        : `<b>Task:</b> Design an in-phase amplifier for a sensor with high internal resistance. Voltage gain <b>+${t.G}</b> (±5 %), the sensor <b>must not be loaded</b>, input signal at most <b>${num(t.vpk, 2)} V peak</b>, supply <b>±${t.vcc} V</b>. <b>E12</b> resistors only; the feedback branch must not overload the output: <b>R<sub>s</sub> + R<sub>f</sub> ≥ 10 kΩ</b>, R ≤ 1 MΩ. <b>At least a 10 % margin</b> to saturation.`;
    }
    const tp = inst(box, 'TOPOLOGY', false);
    const tb = document.createElement('div'); tb.className = 'row'; tb.style.gap = '4px';
    tb.innerHTML = '<button class="seg-btn" data-t="inv">INVERTING</button><button class="seg-btn" data-t="non">NON-INVERTING</button>'; tp.c.appendChild(tb);
    const topo = () => S.d4topo || 'inv';
    $$('button', tb).forEach((b) => (b.onclick = () => { S.d4topo = b.dataset.t; save(); drawSch(); set(); }));
    const rb = inst(box, 'E12 RESISTOR DRAWER · 5 %', false);
    const ks = new Lab.Knob(rb.c, { label: 'R_s', list: E12L, value: S.d4Rs || 1e4, fmt: Lab.ohm, onChange: (v) => { S.d4Rs = v; save(); set(); } });
    const kr = new Lab.Knob(rb.c, { label: 'R_f', list: E12L, value: S.d4Rf || 1e4, fmt: Lab.ohm, onChange: (v) => { S.d4Rf = v; save(); set(); } });
    const fg = inst(box, 'TEST SIGNAL', true, 'sine 1 kHz'); const fgL = lcd(fg.el, 'v<sub>g</sub> peak (task)', 'V', 110);
    self.sc = mkScope($('#d4scope'), 'd4sc', { v1: 0.5, v2: 5, t: 2e-4, freq: () => 1000 });
    let L;
    function drawSch() { $$('button', tb).forEach((b) => b.classList.toggle('on', b.dataset.t === topo())); L = topo() === 'inv' ? schInv($('#d4sch')) : schNon($('#d4sch')); }
    // %5 toleranslı gerçek değer: nominal değere ve öğrenciye özgü sabit sapma
    const act = (R, slot) => { const h = Math.sin(R * 12.9898 + slot * 78.233 + S.seed) * 43758.5453; return R * (1 + 0.05 * 0.9 * (2 * (h - Math.floor(h)) - 1)); };
    function compute() {
      const t = S.task, inv = topo() === 'inv', Rs = ks.value, Rf = kr.value, vs = vsat(t.vcc);
      const Gn = inv ? -Rf / Rs : 1 + Rf / Rs;
      const Ra = act(Rs, 1), Rfa = act(Rf, 2);
      const Ga = inv ? -(Rfa / Ra) / (1 + (1 + Rfa / Ra) / A0) : (1 + Rfa / Ra) / (1 + (1 + Rfa / Ra) / A0);
      const rin = inv ? Rs : Infinity, okTopo = inv === t.inv;
      const okG = Math.abs(Gn - t.G) / Math.abs(t.G) <= 0.05;
      const okR = inv ? Rs >= t.rin * 0.999 && Rf <= 1e6 : Rs + Rf >= 1e4 && Rf <= 1e6;
      const outPk = Math.abs(Gn) * t.vpk, okM = outPk <= 0.9 * vs;
      const vmax = Math.min(vs, IMAX / (1 / (inv ? Rfa : Ra + Rfa)));
      return { t, inv, Rs, Rf, Gn, Ga, rin, okTopo, okG, okR, okM, outPk, vs, vmax, all: okTopo && okG && okR && okM };
    }
    self.update = () => {
      if (!self.sc.dirty) return; self.sc.dirty = false;
      const c = (self.c = compute());
      fgL(num(c.t.vpk, 2));
      const vin = (t) => c.t.vpk * Math.sin(2 * Math.PI * 1000 * t);
      self.sc.draw(runSim(self.sc.sc, 1000, vin, (t) => clamp(c.Ga * vin(t), -c.vmax, c.vmax)));
      L.Rs.textContent = 'R_s = ' + Lab.ohm(c.Rs); L.Rf.textContent = 'R_f = ' + Lab.ohm(c.Rf); L.RL.textContent = 'R_L = ∞';
      L.vg.textContent = 'v_g ≤ ' + num(c.t.vpk, 2) + ' V peak'; L.vn.textContent = ''; L.vo.textContent = 'v_o'; L.is.textContent = '';
      L.mode.textContent = 'Task: ' + (c.t.inv ? '' : '+') + c.t.G + ' · ±' + c.t.vcc + ' V'; L.mode.style.fill = '#0b5cad';
    };
    const tab = recorder('d4', ['Task', 'Topology', 'R<sub>s</sub>', 'R<sub>f</sub>', 'G nominal', 'G measured', 'R<sub>in</sub>', 'Output peak (V)', 'Meets spec'],
      (r) => [(r.tG > 0 ? '+' : '') + r.tG + ' / ±' + r.vcc + ' V', r.inv ? 'inverting' : 'non-inverting', Lab.ohm(r.Rs), Lab.ohm(r.Rf), num(r.Gn, 3), num(r.Gm, 3), r.inv ? Lab.ohm(r.Rs) : 'very large', num(r.pk, 2), r.all ? '✔' : '✘'], 'hafta2_deney4.csv');
    self.rec = () => {
      const c = self.c, m = self.sc.meas; if (!m || !c.t) return;
      const Gm = (m.ch[1].vpp / m.ch[0].vpp) * (c.inv ? -1 : 1);
      tab.push({ tG: c.t.G, vcc: c.t.vcc, inv: c.inv, Rs: c.Rs, Rf: c.Rf, Gn: c.Gn, Gm, pk: m.ch[1].max, all: c.all });
      Lab.toast(c.all ? '✔ The design meets all requirements.' : '✘ The design fails at least one requirement. Read the task again.', 3500);
    };
    $('#d4rec').onclick = self.rec;
    $('#d4new').onclick = () => { if (!S.task || confirm('Get a new design task?')) newTask(); };
    if (!S.task) newTask(); else showTask();
    drawSch();
    Object.assign(self, { ks, kr, tab, compute });
    return self;
  })();
  const c4 = () => D4.c || {};
  steps('d4', [
    { t: 'Read the task and choose the correct <b>topology</b> (in phase or antiphase? what must the input resistance be?).', test: () => !!S.d4topo && c4().okTopo },
    { t: 'Achieve the <b>gain within ±5 %</b> with E12 values.', test: () => c4().okTopo && c4().okG },
    { t: 'Meet the input-resistance / feedback-load requirement.', test: () => c4().okTopo && c4().okG && c4().okR },
    { t: 'Verify on the oscilloscope that the output <b>does not clip</b> at the largest input and that a 10 % margin remains (CH2 max).', test: () => c4().all },
    { t: 'Record the design that meets all requirements (<kbd>R</kbd>). Why is the measured gain slightly different from the nominal one?', test: () => D4.tab.rows.some((r) => r.all) },
    { t: 'Get a <b>new task</b> and record a second compliant design.', test: () => new Set(D4.tab.rows.filter((r) => r.all).map((r) => r.tG + '/' + r.vcc)).size >= 2 },
  ]);
  numq('d4', '#d4Q', { id: 'd4q1', q: 'Example 1.15: with R<sub>s</sub> = 5 kΩ, what must R<sub>f</sub> be in kΩ for a gain of −12?', answer: 60, tol: 1, unit: 'kΩ', explain: 'R<sub>f</sub> = 12 R<sub>s</sub> = 60 kΩ.', hint: 'R<sub>f</sub>/R<sub>s</sub> = |gain|' });
  numq('d4', '#d4Q', { id: 'd4q2', q: 'In the same circuit at ±15 V (course assumption), what is the largest |v<sub>g</sub>| in volts for linear operation?', answer: 1.25, tol: 1, unit: 'V', explain: '12|v<sub>g</sub>| ≤ 15 → 1.25 V.', hint: '15/12' });
  numq('d4', '#d4Q', { id: 'd4q3', q: '60 kΩ is not in the E12 series. If R<sub>s</sub> = 4.7 kΩ is chosen, what is the nearest E12 R<sub>f</sub> in kΩ for a gain of −12?', answer: 56, tol: 0.5, unit: 'kΩ', explain: '12 × 4.7 = 56.4 kΩ → 56 kΩ; gain −11.91 (0.7 % error).', hint: 'First find the ideal value, then pick the nearest one in the E12 series.' });
  numq('d4', '#d4Q', { id: 'd4q4', q: 'What is the largest input peak, in volts, that your current design (nominal values, saturation assumption on the Introduction page) can accept without saturating?', answer: () => { const c = D4.compute(); return c.vs / Math.abs(c.Gn); }, tol: 2, unit: 'V', explain: 'V<sub>sat</sub>/|G|. The peak value in the task must be at most 90 % of this.', hint: 'V<sub>sat</sub>/|G<sub>nominal</sub>|' });
  mcq('d4', '#d4Q', { id: 'd4q5', q: 'Why is it a bad idea to obtain the same gain with R<sub>s</sub> = 470 kΩ, R<sub>f</sub> = 4.7 MΩ?', opts: ['The gain changes', 'Very large resistors increase thermal noise, offset error due to bias current, and leakage/stray effects', 'The op-amp burns out', 'The input resistance drops'], correct: 1, explain: 'An 80 nA bias current across 4.7 MΩ means a 0.38 V error. In practice values between 1 kΩ and 1 MΩ are preferred.', hint: 'Bias current × R<sub>f</sub> = ?' });
  mcq('d4', '#d4Q', { id: 'd4q6', q: 'The gain you measured differs from the nominal value by 1–5 %. What is the most likely cause?', opts: ['The op-amp gain A is finite', 'The actual values of the 5 % tolerance resistors differ from their labels', 'Oscilloscope error', 'The supply voltage'], correct: 1, explain: 'A = 10<sup>5</sup> gives an error of only the order of ‰; the main difference comes from resistor tolerance. For precision work 1 % or 0.1 % resistors are used.', hint: 'With A = 10<sup>5</sup> the finite-gain error is roughly (1+R<sub>f</sub>/R<sub>s</sub>)/A.' });

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
    const T = (id) => `<table class="data">${$(id).innerHTML}</table>`;
    const html = `
      <h2 style="margin:0">Circuit Theory I · Virtual Lab · Week 2 Report</h2>
      <p><b>Topic:</b> Inverting and non-inverting amplifier, voltage follower (buffer), loading effect, resistor selection</p>
      <table class="data" style="width:auto"><tr><th>Full name</th><td class="l">${S.st.name || ''}</td><th>Student ID</th><td class="l">${S.st.no || ''}</td><th>Group</th><td class="l">${S.st.group || ''}</td><th>Date</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Summary</h3>
      <p>Lab-sheet steps completed: <b>${sOk}/${sTot}</b> · Correct answers: <b>${ok}/${tot}</b> · Score: <b>${Math.round((50 * sOk) / sTot + (50 * ok) / tot)}/100</b></p>
      <h3>Answers</h3>
      <table class="data"><thead><tr><th>Section</th><th>Question</th><th>Answer</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Experiment 1 · Inverting amplifier</h3>${T('#d1tab')}
      <h3>Experiment 2 · Non-inverting amplifier</h3>${T('#d2tab')}
      <h3>Experiment 3 · Loading effect and buffer</h3>${T('#d3tab')}
      <h3>Experiment 4 · Design</h3><p>${$('#d4task').innerHTML}</p>${T('#d4tab')}
      <h3>Plots and oscilloscope screenshots</h3>
      <div>${img(D1.sc.el)} ${img(D4.sc.el)}</div><div>${img(D2.plotCanvas)} ${img(D3.plotCanvas)}</div>
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
    if (e.key === 'r' || e.key === 'R') { const d = { d1: D1, d2: D2, d3: D3, d4: D4 }[S.page]; if (d) d.rec(); }
  });

  function loop() {
    if (S.page === 'd1') { D1.update(); evalSteps('d1'); }
    if (S.page === 'd2') { D2.update(); evalSteps('d2'); }
    if (S.page === 'd3') { D3.update(); evalSteps('d3'); }
    if (S.page === 'd4') { D4.update(); evalSteps('d4'); }
    requestAnimationFrame(loop);
  }
  D1.update(); D2.update(); D3.update(); D4.update();
  ['d1', 'd2', 'd3', 'd4'].forEach(evalSteps);
  go(S.page); progress(); loop();
})();

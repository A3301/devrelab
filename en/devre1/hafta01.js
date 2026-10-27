/* Devre Kuramı I · Hafta 1 — Op-Amp ile Tanışma */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd1h1';
  const S = Object.assign({ answers: {}, steps: {}, d2rows: [], d4rows: [], st: {}, page: 'giris', sat: 'ideal', d1hov: [], pinQuiz: 0 }, Lab.store.load(KEY));
  if (S.vos0 == null) S.vos0 = (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 1.2) * 1e-3;
  Lab.answers = S.answers;
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => Lab.store.save(KEY, S), 300); };
  Lab.onAnswer = () => { save(); progress(); };

  /* ---------- ortak model ---------- */
  const A0 = 1e5, SR = 0.5e6, IQ = 1.7e-3, IMAX = 25e-3, RI = 2e6;
  const vsat = (vcc) => (S.sat === 'real' ? vcc - 1.5 : vcc);
  const model = (vcc, A = A0) => ({ A, vsatP: vsat(vcc), vsatN: -vsat(vcc), vos: 0 });
  const RLIST = [1e3, 2e3, 4.7e3, 5e3, 1e4, 2e4, 2.2e4, 4e4, 4.7e4, 5e4, 6e4, 8e4, 1e5, 1.6e5, 2.2e5, 4.7e5, 1e6];
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
  // otomatik aralıklı voltmetre gösterimi
  const vAuto = (v) => (Math.abs(v) < 1e-3 ? [num(v * 1e6, 1), 'µV'] : Math.abs(v) < 1 ? [num(v * 1e3, 2), 'mV'] : [num(v, 3), 'V']);

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
    opamp(g, x, yt, h = 110, w = 120) {
      E('path', { d: `M${x},${yt} L${x},${yt + h} L${x + w},${yt + h / 2} Z`, class: 'w', fill: '#f4f7ff' }, g);
    },
  };

  /* ================= GEZİNME / İLERLEME ================= */
  const pages = ['giris', 'onbilgi', 'onhaz', 'd1', 'd2', 'd3', 'd4', 'rapor'];
  function go(p) {
    S.page = p; save();
    $$('section.page').forEach((s) => s.classList.toggle('active', s.id === p));
    $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.p === p));
    if (p === 'd3') D3.dirty = true;
    if (p === 'rapor') buildReport();
    window.scrollTo(0, 0);
  }
  $$('#nav button').forEach((b) => (b.onclick = () => go(b.dataset.p)));

  const stepDefs = {};
  function steps(key, list) {
    stepDefs[key] = list;
    const ol = $('#' + key + 'steps');
    ol.innerHTML = list.map((s) => `<li>${s.t}</li>`).join('');
  }
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

  // öğrenci bilgisi
  [['stName', 'name'], ['stNo', 'no'], ['stGroup', 'group'], ['stDate', 'date'], ['stComment', 'comment']].forEach(([id, k]) => {
    const e = $('#' + id); e.value = S.st[k] || (k === 'date' ? new Date().toLocaleDateString('en-GB') : '');
    e.addEventListener('input', () => { S.st[k] = e.value; save(); });
  });
  $('#satModel').value = S.sat;
  $('#satModel').onchange = (e) => { S.sat = e.target.value; save(); D3.dirty = true; };

  /* ================= ÖN HAZIRLIK ================= */
  numq('onhaz', '#preQ', { id: 'p1', q: '1) A = 10<sup>5</sup>, ±15 V. With v<sub>p</sub> − v<sub>n</sub> = 60 µV, what is v<sub>o</sub> in volts?', answer: 6, unit: 'V', explain: '10<sup>5</sup> × 60 µV = 6 V &lt; 15 V, linear region.', hint: 'First multiply by A, then compare with ±15 V.' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) With v<sub>p</sub> − v<sub>n</sub> = −200 µV, what is v<sub>o</sub> in volts?', answer: -15, unit: 'V', explain: 'The ideal product gives −20 V, but the output cannot exceed the supply: −15 V (saturation).', hint: 'Can the output go beyond ±15 V?' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) What is the limit of the linear region |v<sub>p</sub> − v<sub>n</sub>| in µV?', answer: 150, unit: 'µV', explain: '15 V / 10<sup>5</sup> = 150 µV.', hint: 'V<sub>CC</sub>/A' });
  mcq('onhaz', '#preQ', { id: 'p4', q: '4) Which pin of the µA741 IC is the non-inverting input (+)?', opts: ['2', '3', '6', '7'], correct: 1, explain: '2: inverting (−), 3: non-inverting (+), 6: output, 7: +V<sub>CC</sub>, 4: −V<sub>CC</sub>.', hint: 'You will examine the pins in Experiment 1; look at the pinout in the Background section.' });
  mcq('onhaz', '#preQ', { id: 'p5', q: '5) What are the two constraints of the ideal op-amp?', opts: ['v<sub>o</sub> = 0 and i<sub>o</sub> = 0', 'v<sub>p</sub> = v<sub>n</sub> and i<sub>p</sub> = i<sub>n</sub> = 0 (with negative feedback)', 'v<sub>p</sub> = v<sub>n</sub> and i<sub>o</sub> = 0', 'A = 0 and R<sub>i</sub> = 0'], correct: 1, explain: 'Virtual short and zero input current. The output current is not zero!', hint: 'The output feeds the load; the output current cannot be zero.' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) Can the assumption v<sub>p</sub> = v<sub>n</sub> be used in a circuit with positive feedback?', opts: ['Yes, always', 'No; the circuit does not settle and the output latches at ±V<sub>sat</sub>', 'Only if A is very large'], correct: 1, explain: 'The virtual short is a consequence of negative feedback.', hint: 'When the output rises, does the difference grow or shrink?' });

  /* ================= DENEY 1 · Breadboard ================= */
  const D1 = (() => {
    const svg = $('#bb');
    const terms = [], T = {};
    const wires = S.d1wires || (S.d1wires = []);
    let color = '#d62828', on = false, status = '', quiz = null;
    const COLORS = { Red: '#d62828', Black: '#222', Blue: '#1d4ed8', Yellow: '#f2c200', Green: '#15803d', Orange: '#ea7a10' };
    const addT = (id, x, y, net, el, jack) => { const t = { id, x, y, net, el, jack }; terms.push(t); T[id] = t; return t; };

    const defs = E('defs', {}, svg);
    defs.innerHTML = `<linearGradient id="psuG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#454b55"/><stop offset="1" stop-color="#1f2328"/></linearGradient>
      <linearGradient id="bbG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7f5ee"/><stop offset="1" stop-color="#e4e0d4"/></linearGradient>
      <filter id="sh"><feDropShadow dx="1" dy="2" stdDeviation="1.5" flood-opacity=".45"/></filter>`;

    // --- güç kaynağı
    E('rect', { x: 15, y: 40, width: 290, height: 400, rx: 10, fill: 'url(#psuG)', stroke: '#111', filter: 'url(#sh)' }, svg);
    sch.t(svg, 160, 66, 'SYMMETRIC DC POWER SUPPLY', '', 'middle').setAttribute('style', 'fill:#e6e9ee;font-size:13px;font-weight:700;letter-spacing:.06em');
    sch.t(svg, 160, 82, '±0–20 V · current limit 0.5 A', '', 'middle').setAttribute('style', 'fill:#9aa3b0;font-size:11px');
    const disp = {};
    [['p', 95, '+ CHANNEL'], ['n', 180, '− CHANNEL']].forEach(([k, y, lab]) => {
      E('rect', { x: 35, y, width: 250, height: 72, rx: 5, fill: '#0c1a10', stroke: '#000' }, svg);
      sch.t(svg, 45, y + 15, lab, '', 'start').setAttribute('style', 'fill:#5fbf73;font-size:10px;font-weight:700');
      disp[k + 'V'] = sch.t(svg, 180, y + 50, '0.00', '', 'end'); disp[k + 'V'].setAttribute('style', 'fill:#7dff8f;font:700 30px Consolas,monospace');
      sch.t(svg, 186, y + 50, 'V', '', 'start').setAttribute('style', 'fill:#5fbf73;font-size:13px');
      disp[k + 'I'] = sch.t(svg, 275, y + 50, '0.0 mA', '', 'end'); disp[k + 'I'].setAttribute('style', 'fill:#ffb04a;font:700 15px Consolas,monospace');
    });
    const fo = E('foreignObject', { x: 22, y: 258, width: 126, height: 124 }, svg);
    const kdiv = document.createElement('div'); fo.appendChild(kdiv); kdiv.style.color = '#dfe3ea';
    const knob = new Lab.Knob(kdiv, { label: 'VOLTAGE', min: 0, max: 20, step: 0.1, value: S.d1V ?? 5, dark: true, size: 62, fmt: (v) => '±' + num(v, 1) + ' V', onChange: (v) => { S.d1V = v; save(); evalPower(); } });
    const fo2 = E('foreignObject', { x: 150, y: 270, width: 145, height: 90 }, svg);
    const bdiv = document.createElement('div'); fo2.appendChild(bdiv);
    bdiv.innerHTML = `<button class="seg-btn" id="psuOut" style="width:120px;padding:8px">OUTPUT OFF</button>
      <div style="color:#cfd5de;font-size:11px;margin-top:8px"><span class="led" id="ledOut"></span> OUTPUT &nbsp; <span class="led" id="ledCC"></span> CC (current limit)</div>`;
    [['J+', 80, '#c81e1e', '+V'], ['JC', 160, '#111', 'COM'], ['J-', 240, '#1d4ed8', '−V']].forEach(([id, x, c, l]) => {
      sch.t(svg, x, 392, l, '', 'middle').setAttribute('style', 'fill:#e6e9ee;font-size:12px;font-weight:700');
      E('circle', { cx: x, cy: 415, r: 15, fill: c, stroke: '#000', filter: 'url(#sh)' }, svg);
      E('circle', { cx: x, cy: 415, r: 6, fill: '#ccc', stroke: '#555' }, svg);
      E('circle', { cx: x, cy: 415, r: 3, fill: '#333' }, svg);
      addT(id, x, 415, id, null, true);
    });

    // --- breadboard
    E('rect', { x: 340, y: 28, width: 628, height: 432, rx: 8, fill: 'url(#bbG)', stroke: '#b9b3a3', filter: 'url(#sh)' }, svg);
    const X = (c) => 400 + 18 * c;
    const ROWY = [130, 148, 166, 184, 202, 256, 274, 292, 310, 328];
    E('rect', { x: 352, y: 214, width: 604, height: 30, fill: '#d9d4c6' }, svg);
    [[47, '#d62828'], [89, '#1d4ed8'], [397, '#d62828'], [439, '#1d4ed8']].forEach(([y, c]) => E('line', { x1: 392, x2: 930, y1: y, y2: y, stroke: c, 'stroke-width': 2 }, svg));
    [['+', 62, '#d62828'], ['−', 82, '#1d4ed8'], ['+', 412, '#d62828'], ['−', 432, '#1d4ed8']].forEach(([s, y, c]) => sch.t(svg, 378, y, s, '', 'middle').setAttribute('style', `fill:${c};font-weight:700;font-size:15px`));
    'abcdefghij'.split('').forEach((l, r) => sch.t(svg, 380, ROWY[r] + 4, l, '', 'middle').setAttribute('style', 'fill:#8a8474;font-size:10px'));
    for (let c = 0; c < 30; c += 5) sch.t(svg, X(c), 116, c + 1, '', 'middle').setAttribute('style', 'fill:#8a8474;font-size:10px');
    const holeG = E('g', {}, svg);
    const hole = (id, x, y, net) => { const el = E('rect', { x: x - 3.5, y: y - 3.5, width: 7, height: 7, rx: 1.5, fill: '#3b3a36' }, holeG); addT(id, x, y, net, el); };
    for (let c = 0; c < 30; c++) for (let r = 0; r < 10; r++) hole(`h${c}_${r}`, X(c), ROWY[r], (r < 5 ? 'T' : 'B') + c);
    [58, 78, 408, 428].forEach((y, k) => { for (let c = 0; c < 30; c++) if (c % 6 !== 5) hole(`r${k}_${c}`, X(c), y, 'R' + k); });

    // --- µA741 (sütun 12..15, e/f satırları)
    const PIN = { 8: [12, 'T'], 7: [13, 'T'], 6: [14, 'T'], 5: [15, 'T'], 1: [12, 'B'], 2: [13, 'B'], 3: [14, 'B'], 4: [15, 'B'] };
    const PINFO = { 1: 'Offset Null — one end of the trimpot', 2: 'Inverting input (−), v<sub>n</sub>', 3: 'Non-inverting input (+), v<sub>p</sub>', 4: '−V<sub>CC</sub> negative supply', 5: 'Offset Null — other end of the trimpot', 6: 'Output v<sub>o</sub>', 7: '+V<sub>CC</sub> positive supply', 8: 'NC — not connected (unused) pin' };
    for (const p in PIN) { const [c, s] = PIN[p]; T[`h${c}_${s === 'T' ? 4 : 5}`].occ = true; }
    const icG = E('g', {}, svg);
    for (const p in PIN) {
      const [c, s] = PIN[p], x = X(c);
      E('rect', { x: x - 3, y: s === 'T' ? 199 : 250, width: 6, height: 9, fill: '#c3c7cc', stroke: '#888', 'stroke-width': 0.5 }, icG);
    }
    const body = E('rect', { x: 603, y: 207, width: 80, height: 44, rx: 3, fill: '#1d1d20', filter: 'url(#sh)' }, icG);
    E('circle', { cx: 603, cy: 229, r: 6, fill: '#d9d4c6' }, icG);
    E('circle', { cx: 614, cy: 243, r: 2.5, fill: '#4a4a50' }, icG);
    const icTxt = sch.t(icG, 646, 227, 'µA741CN', '', 'middle'); icTxt.setAttribute('style', 'fill:#d4d4d8;font:700 10px Consolas');
    sch.t(icG, 646, 240, '2541 · TI', '', 'middle').setAttribute('style', 'fill:#8c8c94;font:8px Consolas');
    const smoke = E('g', {}, svg);
    for (const p in PIN) {
      const [c, s] = PIN[p], x = X(c), y = s === 'T' ? 194 : 252;
      const r = E('rect', { x: x - 7, y, width: 14, height: 16, fill: 'transparent', style: 'cursor:pointer' }, svg);
      sch.t(svg, x, s === 'T' ? 190 : 278, p, '', 'middle').setAttribute('style', 'fill:#555;font-size:9px;font-weight:700;pointer-events:none');
      r.addEventListener('mouseenter', () => pinHover(+p));
      r.addEventListener('click', () => { pinHover(+p); pinClick(+p); }); // dokunmatik ekranda fareyle üzerine gelme yok
    }
    const wireG = E('g', {}, svg);
    const tmp = E('path', { stroke: '#888', 'stroke-width': 4, fill: 'none', 'stroke-dasharray': '6 5', 'pointer-events': 'none' }, svg);

    function pinHover(p) {
      if (quiz) return;
      $('#pinInfo').innerHTML = `<b>Pin ${p}:</b> ${PINFO[p]}`;
      if (!S.d1hov.includes(p)) { S.d1hov.push(p); save(); }
    }
    function pinClick(p) {
      if (!quiz) return;
      const q = quiz.list[quiz.i], ok = q.pin.includes(p);
      if (ok) quiz.score++;
      Lab.toast(ok ? `✔ Correct: pin ${p}` : `✘ Pin ${p} = ${PINFO[p].replace(/<[^>]+>/g, '')}. Correct answer: ${q.pin.join(' or ')}`);
      quiz.i++;
      if (quiz.i >= quiz.list.length) {
        S.pinQuiz = Math.max(S.pinQuiz, quiz.score); save();
        $('#pinInfo').innerHTML = `<b>Pin test finished: ${quiz.score}/${quiz.list.length}</b> ${quiz.score >= 5 ? '— well done!' : '— at least 5 correct needed, try again.'}`;
        quiz = null; $('#pinQuizBtn').textContent = 'Start pin test';
      } else askPin();
    }
    function askPin() { $('#pinInfo').innerHTML = `<b>Question ${quiz.i + 1}/${quiz.list.length}:</b> click the pin that is the <span style="font-size:16px">${quiz.list[quiz.i].t}</span> terminal.`; }
    $('#pinQuizBtn').onclick = () => {
      const all = [{ t: 'Non-inverting input (+)', pin: [3] }, { t: 'Inverting input (−)', pin: [2] }, { t: 'Output v<sub>o</sub>', pin: [6] }, { t: '+V<sub>CC</sub>', pin: [7] }, { t: '−V<sub>CC</sub>', pin: [4] }, { t: 'Offset null', pin: [1, 5] }, { t: 'Unused (NC)', pin: [8] }];
      all.sort(() => Math.random() - 0.5);
      quiz = { list: all.slice(0, 6), i: 0, score: 0 }; $('#pinQuizBtn').textContent = 'Test running…'; askPin();
    };

    // --- kablolar
    const pt = (e) => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
    const touch = window.matchMedia && matchMedia('(pointer:coarse)').matches; // parmakla delik bulmak için daha geniş yakalama
    const nearest = (p) => { let b = null, bd = 1e9; for (const t of terms) { const d = Math.hypot(t.x - p.x, t.y - p.y); if (d < (t.jack ? 18 : touch ? 12 : 9) && d < bd) { b = t; bd = d; } } return b; };
    const used = (id) => T[id].occ || wires.some((w) => w.a === id || w.b === id);
    const curve = (a, b) => { const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - Math.min(60, Math.hypot(a.x - b.x, a.y - b.y) * 0.25); return `M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`; };
    function drawWires() {
      wireG.innerHTML = '';
      wires.forEach((w, i) => {
        const a = T[w.a], b = T[w.b], g = E('g', { style: 'cursor:pointer' }, wireG), d = curve(a, b);
        E('path', { d, stroke: '#000', 'stroke-opacity': 0.35, 'stroke-width': 8, fill: 'none' }, g);
        E('path', { d, stroke: w.c, 'stroke-width': 5.5, fill: 'none', 'stroke-linecap': 'round' }, g);
        E('path', { d, stroke: '#fff', 'stroke-opacity': 0.3, 'stroke-width': 1.5, fill: 'none', transform: 'translate(-1,-1)' }, g);
        [a, b].forEach((t) => E('circle', { cx: t.x, cy: t.y, r: 3.5, fill: '#c9cdd2', stroke: '#666' }, g));
        g.addEventListener('click', (e) => { e.stopPropagation(); wires.splice(i, 1); changed(); });
      });
    }
    let drag = null;
    svg.addEventListener('pointerdown', (e) => {
      const t = nearest(pt(e)); if (!t) return;
      if (!t.jack && used(t.id)) { Lab.toast(t.occ ? 'An IC pin occupies this hole. Plug the wire into one of the <b>empty holes in the same column</b> (the 5 holes of a column are connected together).' : 'This hole is occupied: only one wire per hole.'); return; }
      drag = t; svg.setPointerCapture(e.pointerId); e.preventDefault();
    });
    svg.addEventListener('pointermove', (e) => {
      const p = pt(e);
      if (drag) { const t = nearest(p) || p; tmp.setAttribute('d', curve(drag, t)); tmp.setAttribute('stroke', color); return; }
      const t = nearest(p);
      terms.forEach((u) => u.el && u.el.setAttribute('fill', t && !t.jack && u.net === t.net ? '#2fae4a' : '#3b3a36'));
    });
    svg.addEventListener('pointerup', (e) => {
      if (!drag) return;
      const t = nearest(pt(e)); tmp.setAttribute('d', '');
      if (t && t !== drag) {
        if (!t.jack && used(t.id)) Lab.toast('This hole is occupied.');
        else { wires.push({ a: drag.id, b: t.id, c: color }); changed(); }
      }
      drag = null;
    });
    $('#wireColors').innerHTML = Object.entries(COLORS).map(([n, c]) => `<button title="${n}" data-c="${c}" style="width:22px;height:22px;border-radius:50%;border:3px solid ${c === color ? '#0b5cad' : '#fff'};background:${c};box-shadow:0 0 0 1px #999"></button>`).join('');
    $$('#wireColors button').forEach((b) => (b.onclick = () => { color = b.dataset.c; $$('#wireColors button').forEach((x) => (x.style.borderColor = x === b ? '#0b5cad' : '#fff')); }));
    $('#undoWire').onclick = () => { wires.pop(); changed(); };
    $('#clearWires').onclick = () => { wires.length = 0; changed(); };
    $('#newIC').onclick = () => { S.d1burn = null; save(); evalPower(); Lab.toast('New µA741 inserted. Check the connections.'); };
    $('#psuOut').onclick = () => { on = !on; evalPower(); };
    function changed() { save(); drawWires(); evalPower(); }

    // --- devre değerlendirmesi
    function find() {
      const par = {};
      const f = (x) => (par[x] == null || par[x] === x ? x : (par[x] = f(par[x])));
      wires.forEach((w) => { const a = f(T[w.a].net), b = f(T[w.b].net); if (a !== b) par[a] = b; });
      return f;
    }
    let st = {};
    function evalPower() {
      const f = find(), P = f('J+'), N = f('J-'), C = f('JC'), V = knob.value;
      const p7 = f('T13'), p4 = f('B15'), p6 = f('T14');
      st = { p7ok: p7 === P, p4ok: p4 === N, com: ['R0', 'R1', 'R2', 'R3'].some((r) => f(r) === C) };
      let msg = '', Ip = 0, In = 0, cc = false, Vp = V, Vn = V;
      if (on) {
        if (P === N || P === C || N === C) { cc = true; Vp = Vn = 0; Ip = In = 0.5; msg = 'Short circuit! The supply terminals are connected together; the supply went into current limit (CC).'; }
        else if (S.d1burn) { cc = true; Vp = Vn = 0.6; Ip = In = 0.5; msg = 'The damaged IC is shorting the supply. Turn the output off and insert a new 741.'; }
        else if (p7 === N && p4 === P) return burn('Supply connected in reverse (+V → 4, −V → 7). The internal diodes of the IC conducted and it burned out.');
        else if (st.p7ok && st.p4ok && V > 18) return burn('Absolute maximum supply of ±18 V exceeded (' + num(V, 1) + ' V). The IC is destroyed.');
        else if (st.p7ok && st.p4ok) {
          Ip = In = V > 2 ? IQ * Math.min(1, V / 5) : 0;
          if (p6 === P || p6 === N || p6 === C) { const x = IMAX + IQ; if (p6 === P || p6 === C) In = x; if (p6 === N || p6 === C) Ip = x; msg = 'Warning: the output pin (6) is connected to a supply terminal. The output short-circuit current (~25 mA) is flowing and the IC heats up.'; }
          else msg = st.com ? '' : 'The op-amp is powered, but COM (ground) is not connected to the breadboard: the measurements have no reference.';
        } else if (st.p7ok || st.p4ok) msg = 'Only one supply terminal is connected: the op-amp does not work. It must be 7 → +V, 4 → −V.';
        else if (p7 === C || p4 === C || p7 === P || p4 === N) msg = 'Supply connections are missing or wrong.';
      }
      st.ok = on && st.p7ok && st.p4ok && st.com && !S.d1burn && !cc && V <= 18;
      disp.pV.textContent = num(on ? Vp : V, 2); disp.nV.textContent = num(-(on ? Vn : V), 2);
      [disp.pV, disp.nV].forEach((d) => (d.style.opacity = on ? 1 : 0.35));
      disp.pI.textContent = num(Ip * 1e3, 1) + ' mA'; disp.nI.textContent = num(In * 1e3, 1) + ' mA';
      $('#psuOut').textContent = on ? 'OUTPUT ON' : 'OUTPUT OFF'; $('#psuOut').classList.toggle('on', on);
      $('#ledOut').classList.toggle('on', on); $('#ledOut').classList.toggle('g', on); $('#ledCC').classList.toggle('on', on && cc);
      body.setAttribute('fill', S.d1burn ? '#3a2a20' : '#1d1d20'); icTxt.textContent = S.d1burn ? 'DAMAGED' : 'µA741CN';
      icTxt.style.fill = S.d1burn ? '#ff6b4a' : '#d4d4d8';
      $('#newIC').style.display = S.d1burn ? '' : 'none';
      if (msg && msg !== status) Lab.toast(msg, 4500);
      if (st.ok && status !== 'ok') Lab.toast('✔ The op-amp is powered correctly. A quiescent current of ≈1.7 mA is read on both channels.', 4500);
      status = st.ok ? 'ok' : msg;
    }
    function burn(why) {
      S.d1burn = why; save();
      smoke.innerHTML = '';
      for (let i = 0; i < 6; i++) {
        const c = E('circle', { cx: 630 + i * 6, cy: 220, r: 6, fill: '#777', opacity: 0.7 }, smoke);
        c.innerHTML = `<animate attributeName="cy" from="220" to="120" dur="${1.6 + i * 0.25}s" repeatCount="6"/><animate attributeName="r" from="5" to="22" dur="${1.6 + i * 0.25}s" repeatCount="6"/><animate attributeName="opacity" from=".7" to="0" dur="${1.6 + i * 0.25}s" repeatCount="6" fill="freeze"/>`;
      }
      Lab.toast('💥 ' + why, 6000);
      evalPower();
    }
    drawWires(); evalPower();
    return { st: () => st, knob, on: () => on };
  })();

  steps('d1', [
    { t: 'Move the mouse over the IC pins (on a touch screen, tap a pin) and read the function of at least 4 pins. Notch on the left: pin 1 is at the bottom left, numbers increase counter-clockwise.', test: () => S.d1hov.length >= 4 },
    { t: 'With the output <b>off</b>, set the supply voltage knob to <b>±15.0 V</b>.', test: () => near(D1.knob.value, 15, 0.05) },
    { t: 'Connect the <b>+V</b> terminal to pin 7 (directly or via the red rail).', test: () => D1.st().p7ok },
    { t: 'Connect the <b>−V</b> terminal to pin 4.', test: () => D1.st().p4ok },
    { t: 'Connect the <b>COM</b> (ground) terminal to a rail: this rail is the 0 V reference of the circuit.', test: () => D1.st().com },
    { t: 'Check the connections and turn the <b>OUTPUT</b> on. You should see ≈1.7 mA on both channels.', test: () => D1.st().ok },
    { t: 'Complete the <b>pin test</b> with at least 5/6 correct.', test: () => S.pinQuiz >= 5 },
  ]);
  mcq('d1', '#d1Q', { id: 'd1q1', q: 'When the output was turned on, ≈1.7 mA was read on both channels, although nothing is connected to the inputs or the output. What is this current?', opts: ['Bias current flowing through the inputs', 'Quiescent (supply) current drawn by the internal circuitry of the op-amp', 'Short-circuit current from the output to ground', 'Instrument error'], correct: 1, explain: 'It enters at +V<sub>CC</sub> and leaves at −V<sub>CC</sub>; in the five-terminal KCL the two cancel in the sum i<sub>CC+</sub> + i<sub>CC−</sub>.', hint: 'The current enters from the + channel and returns through the − channel.' });
  mcq('d1', '#d1Q', { id: 'd1q2', q: 'What would happen if you had accidentally connected the +V terminal to pin 6 instead of pin 7?', opts: ['Nothing; 6 and 7 are connected internally', 'The output pin is tied to the supply; the op-amp is not powered, and once powered the output is shorted', 'The circuit becomes an inverting amplifier', 'The gain doubles'], correct: 1, explain: '6 is the output. Connecting the output to a voltage source stresses the output stage.', hint: 'What was the function of pin 6?' });
  mcq('d1', '#d1Q', { id: 'd1q3', q: 'Within which range must the op-amp output voltage stay?', opts: ['Between 0 and +V<sub>CC</sub>', 'Between −V<sub>CC</sub> and +V<sub>CC</sub>', 'There is no limit; it equals A(v<sub>p</sub>−v<sub>n</sub>)', '±1 V'], correct: 1, explain: 'The supply provides the energy; the output cannot exceed the supply (in practice it stays 1–2 V below).', hint: 'Where does the energy come from?' });

  /* ================= DENEY 2 · Açık çevrim ================= */
  const D2 = (() => {
    const box = $('#d2inst');
    const ps = inst(box, '±V<sub>CC</sub> SUPPLY'); const psL = lcd(ps.el, 'SUPPLY', 'V', 110);
    const kV = new Lab.Knob(ps.c, { label: 'V<sub>CC</sub>'.replace(/<[^>]+>/g, ''), min: 5, max: 18, step: 0.5, value: 15, dark: true, fmt: (v) => '±' + num(v, 1) + ' V' });
    const dc = inst(box, 'ADJUSTABLE DC SUPPLY · V<sub>S</sub>'); const dcL = lcd(dc.el, 'V<sub>S</sub> = coarse + fine', 'mV', 130);
    const kC = new Lab.Knob(dc.c, { label: 'Coarse', min: -500, max: 500, step: 5, value: 0, dark: true, fmt: (v) => num(v, 0) + ' mV' });
    const kF = new Lab.Knob(dc.c, { label: 'Fine', min: -10, max: 10, step: 0.05, value: 0, dark: true, fmt: (v) => num(v, 2) + ' mV' });
    const m1 = inst(box, 'DMM-1', false, 'v<sub>p</sub> − v<sub>n</sub>'); const m1L = lcd(m1.el, 'DC V · auto range', 'µV', 130);
    const m2 = inst(box, 'DMM-2', false, 'v<sub>o</sub>'); const m2L = lcd(m2.el, 'DC V', 'V', 130);
    const of = inst(box, 'OFFSET TRIMPOT', false, '1–5 / 10 kΩ');
    const kO = new Lab.Knob(of.c, { label: 'Adjust', min: 0, max: 100, step: 0.1, value: S.d2pot ?? 50, fmt: (v) => num(v, 1) + '%', onChange: (v) => { S.d2pot = v; save(); } });
    const vosBox = document.createElement('label'); vosBox.style.cssText = 'font-size:11px;display:block;margin-top:4px';
    vosBox.innerHTML = `<input type="checkbox" ${S.d2vos === false ? '' : 'checked'}> Real V<sub>os</sub>`; of.c.appendChild(vosBox);
    vosBox.firstChild.onchange = (e) => { S.d2vos = e.target.checked; save(); };

    // şema
    const g = $('#d2sch');
    sch.src(g, 60, 205); sch.w(g, [[60, 185], [60, 165], [120, 165]]); sch.rH(g, 120, 200, 165); sch.w(g, [[200, 165], [380, 165]]);
    sch.t(g, 160, 150, 'R<tspan font-size="10" dy="3">1</tspan><tspan dy="-3"> 100 kΩ</tspan>');
    sch.rV(g, 300, 165, 245); sch.gnd(g, 300, 245); sch.dot(g, 300, 165); sch.t(g, 318, 215, 'R<tspan font-size="10" dy="3">2</tspan><tspan dy="-3"> 100 Ω</tspan>', 'lbl', 'start');
    sch.w(g, [[60, 225], [60, 245]]); sch.gnd(g, 60, 245); sch.t(g, 28, 210, 'V<tspan font-size="10" dy="3">S</tspan>');
    sch.opamp(g, 380, 80); sch.t(g, 392, 110, '−', 'lbl'); sch.t(g, 392, 170, '+', 'lbl');
    sch.w(g, [[380, 105], [350, 105], [350, 112]]); sch.gnd(g, 350, 112);
    sch.w(g, [[500, 135], [620, 135]]); sch.dot(g, 620, 135); sch.rV(g, 620, 135, 245); sch.gnd(g, 620, 245);
    sch.t(g, 636, 200, 'R<tspan font-size="10" dy="3">L</tspan><tspan dy="-3"> 10 kΩ</tspan>', 'lbl', 'start');
    sch.w(g, [[440, 107], [440, 70]]); sch.t(g, 440, 63, '+V<tspan font-size="10" dy="3">CC</tspan>');
    sch.w(g, [[410, 176], [410, 236]]); sch.w(g, [[470, 149], [470, 236]]); sch.rH(g, 410, 470, 236);
    E('path', { d: 'M440,262 V246 m-5,6 l5,-7 l5,7', class: 'w' }, g); sch.t(g, 440, 278, '−V<tspan font-size="10" dy="3">CC</tspan>');
    sch.t(g, 404, 196, '1', 'lbl', 'end'); sch.t(g, 476, 196, '5', 'lbl', 'start'); sch.t(g, 520, 240, '10 kΩ offset', 'lbl', 'start');
    const tVp = sch.t(g, 300, 150, '', 'val'), tVo = sch.t(g, 625, 122, '', 'val', 'start'), tMode = sch.t(g, 590, 40, '', 'val');
    sch.t(g, 335, 100, 'v<tspan font-size="10" dy="3">n</tspan><tspan dy="-3"> = 0</tspan>', 'val', 'end');
    E('path', { d: 'M180,130 h40', stroke: '#888', 'stroke-dasharray': '3 3' }, g); sch.t(g, 200, 125, '1000 : 1 divider', 'lbl').setAttribute('style', 'font-size:11px;fill:#777');

    const plot = new Lab.Plot($('#d2plot'), { xlabel: 'v_p − v_n  (µV)', ylabel: 'v_o  (V)' });
    let cur = {};
    function compute() {
      const vs = (kC.value + kF.value) * 1e-3, vcc = kV.value, vp = (vs * 100) / 100100;
      const vos = S.d2vos === false ? 0 : S.vos0 - ((kO.value - 50) / 50) * 2.5e-3;
      const m = model(vcc); m.vos = vos;
      const r = Lab.opamp(vp, 0, 0, 0, m);
      const sat = Math.abs(r.vo) >= m.vsatP * 0.999;
      cur = { vs, vcc, vd: vp, vo: r.vo, sat, vsat: m.vsatP, vos };
      return cur;
    }
    function update() {
      const c = compute();
      psL('±' + num(c.vcc, 1)); dcL(num(c.vs * 1e3, 2));
      const a = vAuto(c.vd); m1L(a[0], a[1]); m2L(num(c.vo, 3));
      tVp.textContent = 'v_p = ' + a[0] + ' ' + a[1]; tVo.textContent = 'v_o = ' + num(c.vo, 2) + ' V';
      tMode.textContent = c.sat ? (c.vo > 0 ? 'POSITIVE SATURATION' : 'NEGATIVE SATURATION') : 'LINEAR REGION';
      tMode.style.fill = c.sat ? '#c62828' : '#1a8a4a';
    }
    const tbody = $('#d2tab tbody');
    function table() {
      tbody.innerHTML = S.d2rows.map((r, i) => `<tr><td>${i + 1}</td><td>${num(r.vs * 1e3, 2)}</td><td>${num(r.vcc, 1)}</td><td>${num(r.vd * 1e6, 1)}</td><td>${num(r.vo, 3)}</td><td class="l">${r.sat ? 'saturation' : 'linear'}</td></tr>`).join('');
      tbody.parentElement.parentElement.scrollTop = 1e6;
      drawPlot();
    }
    function fit() {
      const L = S.d2rows.filter((r) => !r.sat && r.vcc === kV.value);
      if (L.length < 2) return null;
      const n = L.length, mx = L.reduce((s, r) => s + r.vd, 0) / n, my = L.reduce((s, r) => s + r.vo, 0) / n;
      const sxx = L.reduce((s, r) => s + (r.vd - mx) ** 2, 0); if (sxx < 1e-16) return null;
      const A = L.reduce((s, r) => s + (r.vd - mx) * (r.vo - my), 0) / sxx;
      return { A, vos: (my - A * mx) / A, n };
    }
    function drawPlot() {
      const vs = vsat(kV.value);
      const xs = S.d2rows.map((r) => r.vd * 1e6), xm = Math.max(300, ...xs.map(Math.abs)) * 1.1;
      const ser = [{ pts: S.d2rows.map((r) => [r.vd * 1e6, r.vo]), dots: true, color: '#0b5cad' }];
      if ($('#d2theo').checked) ser.unshift({ pts: [[-xm, -vs], [(-vs / A0) * 1e6, -vs], [(vs / A0) * 1e6, vs], [xm, vs]], line: true, color: '#e07a10', dash: [6, 4] });
      plot.draw(ser, [-xm, xm], [-19, 19]);
      const f = fit();
      $('#d2fit').innerHTML = f ? `Least squares from the linear points (${f.n} points, ±${num(kV.value, 1)} V): <b>A ≈ ${eng(f.A, '', 3)}</b> · residual offset ≈ ${num(f.vos * 1e6, 1)} µV · linear limit ≈ ±${num((vs / f.A) * 1e6, 0)} µV` : 'Record at least 2 different points in the linear region to compute the slope.';
    }
    $('#d2theo').onchange = drawPlot;
    function rec() { const c = compute(); S.d2rows.push({ vs: c.vs, vcc: c.vcc, vd: c.vd, vo: c.vo, sat: c.sat }); save(); table(); Lab.toast(`Recorded: v_p−v_n = ${num(c.vd * 1e6, 1)} µV, v_o = ${num(c.vo, 3)} V`); }
    $('#d2rec').onclick = rec;
    $('#d2del').onclick = () => { S.d2rows.pop(); save(); table(); };
    $('#d2csv').onclick = () => Lab.downloadCSV('hafta1_deney2.csv', ['#', 'Vs (mV)', 'Vcc (V)', 'vp-vn (uV)', 'vo (V)', 'region'], S.d2rows.map((r, i) => [i + 1, +(r.vs * 1e3).toFixed(3), r.vcc, +(r.vd * 1e6).toFixed(2), +r.vo.toFixed(4), r.sat ? 'saturation' : 'linear']));
    table();
    return { update, rec, compute, cur: () => cur, plotCanvas: $('#d2plot'), fit };
  })();

  steps('d2', [
    { t: 'Is the output saturated with V<sub>S</sub> = 0? With real V<sub>os</sub> on, turn the <b>offset trimpot</b> (fine with Shift) to bring v<sub>o</sub> into the linear region (|v<sub>o</sub>| &lt; 13 V).', test: () => { const c = D2.cur(); return Math.abs(c.vs) < 5e-4 && Math.abs(c.vo) < 0.9 * c.vsat; } },
    { t: 'At ±15 V, record <b>at least 5 points</b> in the linear region (positive and negative v<sub>p</sub>−v<sub>n</sub>). Hint: 0.05 mV steps of the Fine knob give ≈ 0.05 µV difference; ±100 mV on the Coarse knob ≈ ±100 µV.', test: () => { const L = S.d2rows.filter((r) => !r.sat && r.vcc === 15); return L.length >= 5 && L.some((r) => r.vd > 0) && L.some((r) => r.vd < 0); } },
    { t: 'At ±15 V, record one point each in <b>positive and negative saturation</b> (e.g. V<sub>S</sub> = ±300 mV).', test: () => S.d2rows.some((r) => r.sat && r.vo > 0 && r.vcc === 15) && S.d2rows.some((r) => r.sat && r.vo < 0 && r.vcc === 15) },
    { t: 'Reduce the supply to <b>±12 V</b> and record a saturation point. How did the saturation level and the linear limit change?', test: () => S.d2rows.some((r) => r.sat && r.vcc === 12) },
    { t: 'Find A from the slope of the plot and answer the questions.', test: () => ['d2q1', 'd2q2', 'd2q3'].every((q) => S.answers[q] && S.answers[q].ok) },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'With a ±15 V supply, what is the limit of the linear region |v<sub>p</sub> − v<sub>n</sub>| in µV (course assumption)?', answer: 150, unit: 'µV', explain: 'V<sub>CC</sub>/A = 15/10<sup>5</sup>.', hint: 'V<sub>CC</sub>/A' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'From the slope of your measurements in the linear region, what is the open-loop gain A?', answer: A0, tol: 8, unit: '', explain: 'Slope Δv<sub>o</sub>/Δ(v<sub>p</sub>−v<sub>n</sub>) = A. The offset only shifts the curve; it does not change the slope.', hint: 'Divide the v<sub>o</sub> difference of two linear points by their (v<sub>p</sub>−v<sub>n</sub>) difference; convert µV to V. You may type e.g. 1e5.' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 'With a ±12 V supply and v<sub>p</sub> − v<sub>n</sub> = 0.5 mV, what is v<sub>o</sub> in volts? (According to your saturation assumption on the Introduction page)', answer: () => vsat(12), tol: 1, unit: 'V', explain: 'The ideal product is 50 V, so the supply limit applies.', hint: 'Does A × 0.5 mV fit within the supply?' });
  mcq('d2', '#d2Q', { id: 'd2q4', q: 'Why was the output saturated with V<sub>S</sub> = 0 before the trimpot was adjusted?', opts: ['The divider resistors were chosen wrongly', 'The internal offset voltage of the IC (≈1 mV) is larger than the 150 µV limit and is multiplied by A', 'The supply voltage is too high', 'The multimeter is loading the input'], correct: 1, explain: 'V<sub>os</sub> is like a small battery in series with the input; in open loop even that is enough to saturate the output.', hint: 'While DMM-1 reads zero, what does the op-amp “see” internally?' });
  mcq('d2', '#d2Q', { id: 'd2q5', q: 'Conclusion: can the op-amp on its own (in open loop) be used as a linear amplifier?', opts: ['Yes; it is ideal because its gain is very large', 'No; the linear region is of the order of µV, and A and V<sub>os</sub> vary with production/temperature; feedback is essential', 'Yes, if the supply is increased'], correct: 1, explain: 'In Experiment 4 you will see how feedback solves this problem.', hint: 'Look at the width of the linear region in the plot.' });

  /* ================= DENEY 3 · Karşılaştırıcı ================= */
  const VDIV = [1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10];
  const TDIV = [1e-6, 2e-6, 5e-6, 1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2, 2e-2, 5e-2];
  const D3 = (() => {
    const box = $('#d3inst'), self = { dirty: true, wave: 'sin' };
    const set = () => (self.dirty = true);
    const fg = inst(box, 'FG-100 FUNCTION GENERATOR'); const fgL = lcd(fg.el, 'FREQUENCY · AMPLITUDE', '', 210);
    const wb = document.createElement('div'); wb.className = 'row'; wb.style.cssText = 'gap:4px;margin-bottom:4px';
    wb.innerHTML = [['sin', '∿ Sine'], ['tri', '△ Triangle'], ['sq', '⊓ Square']].map(([k, t]) => `<button class="seg-btn${k === 'sin' ? ' on' : ''}" data-w="${k}">${t}</button>`).join('');
    fg.el.insertBefore(wb, fg.c);
    $$('button', wb).forEach((b) => (b.onclick = () => { self.wave = b.dataset.w; $$('button', wb).forEach((x) => x.classList.toggle('on', x === b)); set(); }));
    const kf = new Lab.Knob(fg.c, { label: 'Frequency', min: 10, max: 1e5, log: true, value: 1000, dark: true, fmt: (v) => eng(v, 'Hz'), onChange: set });
    const ka = new Lab.Knob(fg.c, { label: 'Amplitude (Vpp)', min: 1e-4, max: 20, log: true, value: 1, dark: true, fmt: (v) => eng(v, 'Vpp'), onChange: set });
    const rf = inst(box, 'REFERENCE · v<sub>n</sub>'); const rfL = lcd(rf.el, 'V<sub>ref</sub>', 'V', 100);
    const kr = new Lab.Knob(rf.c, { label: 'V_ref', min: -2, max: 2, step: 0.01, value: 0, dark: true, fmt: (v) => num(v, 2) + ' V', onChange: set });
    const ps = inst(box, '±V<sub>CC</sub>'); const psL = lcd(ps.el, 'SUPPLY', 'V', 90);
    const kv = new Lab.Knob(ps.c, { label: 'V_CC', min: 5, max: 18, step: 0.5, value: 15, dark: true, fmt: (v) => '±' + num(v, 1) + ' V', onChange: set });

    const scope = new Lab.Scope($('#scope'));
    const sk = $('#scopeKnobs');
    const k1 = new Lab.Knob(sk, { label: 'CH1 V/div', list: VDIV, value: 0.5, dark: true, size: 44, fmt: (v) => eng(v, 'V'), onChange: (v) => { scope.ch[0].vdiv = v; set(); } });
    const k2 = new Lab.Knob(sk, { label: 'CH2 V/div', list: VDIV, value: 5, dark: true, size: 44, fmt: (v) => eng(v, 'V'), onChange: (v) => { scope.ch[1].vdiv = v; set(); } });
    const kt = new Lab.Knob(sk, { label: 'TIME/div', list: TDIV, value: 2e-4, dark: true, size: 44, fmt: (v) => eng(v, 's'), onChange: (v) => { scope.tdiv = v; set(); } });
    scope.ch[0].vdiv = 0.5; scope.ch[1].vdiv = 5; scope.tdiv = 2e-4; scope.ch[0].pos = 0; scope.ch[1].pos = 0;
    const auto = document.createElement('button'); auto.className = 'seg-btn'; auto.textContent = 'AUTO'; sk.appendChild(auto);
    auto.onclick = () => {
      const pick = (L, x) => L.find((v) => v >= x) || L[L.length - 1];
      kt.set(pick(TDIV, 2.5 / kf.value / 10)); k1.set(pick(VDIV, ka.value / 6)); k2.set(pick(VDIV, (2 * vsat(kv.value)) / 6));
    };
    const tog = (id, f) => ($(id).onclick = (e) => { f(); e.target.classList.toggle('on'); set(); });
    tog('#ch1on', () => (scope.ch[0].on = !scope.ch[0].on));
    tog('#ch2on', () => (scope.ch[1].on = !scope.ch[1].on));
    tog('#curon', () => (scope.cur.on = !scope.cur.on));
    $('#scope').addEventListener('pointermove', () => scope.cur.drag && showMeas(scope.measure()));

    // şema
    const g = $('#d3sch');
    sch.src(g, 90, 175, 20, 'ac'); sch.w(g, [[90, 155], [90, 145], [380, 145]]); sch.w(g, [[90, 195], [90, 205]]); sch.gnd(g, 90, 205);
    sch.dot(g, 200, 145); sch.w(g, [[200, 145], [200, 120]]); sch.term(g, 200, 116); sch.t(g, 200, 104, 'CH1').style.fill = '#b8960a';
    sch.opamp(g, 380, 60); sch.t(g, 392, 90, '−'); sch.t(g, 392, 150, '+');
    sch.w(g, [[380, 85], [310, 85]]); sch.term(g, 306, 85);
    sch.w(g, [[500, 115], [610, 115]]); sch.term(g, 614, 115); sch.t(g, 640, 120, 'CH2 (v<tspan font-size="10" dy="3">o</tspan><tspan dy="-3">)</tspan>', 'lbl', 'start').style.fill = '#1592b8';
    sch.w(g, [[440, 87], [440, 45]]); sch.t(g, 440, 38, '+V<tspan font-size="10" dy="3">CC</tspan>');
    sch.w(g, [[440, 143], [440, 185]]); sch.t(g, 440, 202, '−V<tspan font-size="10" dy="3">CC</tspan>');
    const tRef = sch.t(g, 298, 90, '', 'val', 'end'), tGen = sch.t(g, 120, 200, '', 'val', 'start');

    function wave(x) {
      const ph = x - Math.floor(x);
      if (self.wave === 'sq') return ph < 0.5 ? 1 : -1;
      if (self.wave === 'tri') return ph < 0.25 ? 4 * ph : ph < 0.75 ? 2 - 4 * ph : 4 * ph - 4;
      return Math.sin(2 * Math.PI * x);
    }
    function sim() {
      const n = 1000, T = scope.tdiv * 10, dt = T / (n - 1), f = kf.value, Am = ka.value / 2, vr = kr.value, vs = vsat(kv.value);
      const vin = (t) => Am * wave(f * (t - scope.tdiv));
      const tgt = (t) => clamp(A0 * (vin(t) - vr), -vs, vs);
      const pre = Math.min(50000, Math.ceil(Math.max(2 / f, 2e-4) / dt));
      let vo = tgt(-pre * dt);
      const step = (t) => { vo += clamp(tgt(t) - vo, -SR * dt, SR * dt); };
      for (let i = -pre; i < 0; i++) step(i * dt);
      const y1 = new Float64Array(n), y2 = new Float64Array(n);
      for (let i = 0; i < n; i++) { const t = i * dt; step(t); y1[i] = vin(t); y2[i] = vo; }
      return { n, y: [y1, y2] };
    }
    function showMeas(m) {
      if (!m) return;
      const [a, b] = m.ch;
      let h = `<span style="color:#f2d21b">CH1</span> Vpp ${eng(a.vpp, 'V')} · f ${isFinite(a.f) ? eng(a.f, 'Hz') : '—'}<br>` +
        `<span style="color:#27c4f0">CH2</span> Vpp ${eng(b.vpp, 'V')}<br>f ${isFinite(b.f) ? eng(b.f, 'Hz') : '—'} · duty ${isFinite(b.duty) ? num(b.duty, 1) + ' %' : '—'}<br>` +
        `t<sub>r</sub>(10–90) ${isFinite(b.tr) ? eng(b.tr, 's') : '—'}`;
      if (m.cur) h += `<br><span style="color:#ff7cf0">CURSOR</span> Δt ${eng(m.cur.dt, 's')}<br>ΔV(CH2) ${eng(m.cur.v2b - m.cur.v2a, 'V')}<br>ΔV/Δt ${num((m.cur.v2b - m.cur.v2a) / m.cur.dt / 1e6, 3)} V/µs`;
      $('#scopeMeas').innerHTML = h; self.meas = m;
    }
    self.update = () => {
      if (!self.dirty) return; self.dirty = false;
      fgL(`${eng(kf.value, 'Hz')} · ${eng(ka.value, 'Vpp')}`); rfL(num(kr.value, 2)); psL('±' + num(kv.value, 1));
      tRef.textContent = 'V_ref = ' + num(kr.value, 2) + ' V'; tGen.textContent = { sin: 'sine', tri: 'triangle', sq: 'square' }[self.wave] + ' · ' + eng(kf.value, 'Hz') + ' · ' + eng(ka.value, 'Vpp');
      scope.draw(sim()); showMeas(scope.measure());
    };
    Object.assign(self, { kf, ka, kr, kv, k1, k2, scope });
    return self;
  })();

  steps('d3', [
    { t: 'Set the generator to <b>sine, 1 kHz, 0.6 mVpp</b> (0.3 mV peak), V<sub>ref</sub> = 0 V. (You can tap the Amplitude knob and type 0.6m.)', test: () => D3.wave === 'sin' && near(D3.ka.value, 6e-4, 6e-5) && near(D3.kf.value, 1000, 100) && Math.abs(D3.kr.value) < 0.005 },
    { t: 'Set CH1 to <b>0.1 mV/div</b> and CH2 to <b>5 V/div</b>. Has the 0.3 mV input turned into a ±15 V square wave? (Lecture notes Figure: “Without feedback”)', test: () => S.steps.d3_0 && D3.k1.value <= 1e-4 && D3.k2.value === 5 },
    { t: 'Set the amplitude to <b>2 Vpp</b> and V<sub>ref</sub> to <b>+0.50 V</b>. Measure the duty cycle and compare it with the formula.', test: () => D3.wave === 'sin' && near(D3.ka.value, 2, 0.1) && near(D3.kr.value, 0.5, 0.005) },
    { t: 'Set the frequency to <b>≥ 20 kHz</b> and turn the CURSORs on. Place the two cursors on the sloped edge of the output and measure SR from ΔV/Δt.', test: () => D3.kf.value >= 2e4 && D3.scope.cur.on },
    { t: 'Set the frequency to <b>≥ 50 kHz</b>: the output no longer reaches ±15 V (it becomes triangular). Think about why.', test: () => D3.kf.value >= 5e4 && D3.meas && D3.meas.ch[1].vpp < 1.8 * vsat(D3.kv.value) },
  ]);
  numq('d3', '#d3Q', { id: 'd3q1', q: 'V<sub>m</sub> = 1 V peak sine, V<sub>ref</sub> = +0.5 V. What is the duty cycle of the output (fraction of time high) in percent?', answer: 100 / 3, tol: 0, abs: 1, unit: '%', explain: 'D = ½ − arcsin(0.5)/π = ½ − 1/6 = 33.3 %. Compare with the oscilloscope measurement.', hint: 'D = ½ − arcsin(V<sub>ref</sub>/V<sub>m</sub>)/π' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'What slew rate SR did you measure with the oscilloscope, in V/µs?', answer: 0.5, tol: 12, unit: 'V/µs', explain: 'For the µA741, SR = 0.5 V/µs.', hint: 'Place the cursors on the linear part of the sloped edge: ΔV/Δt.' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'With ±15 V saturation, how many µs does the output transition from −15 V to +15 V take?', answer: 60, tol: 4, unit: 'µs', explain: '30 V / 0.5 V/µs = 60 µs.', hint: 'Total swing / SR' });
  numq('d3', '#d3Q', { id: 'd3q4', q: 'What is approximately the highest frequency, in kHz, at which the output can fully reach ±15 V in every half-period (V<sub>ref</sub>=0)?', answer: 8.33, tol: 5, unit: 'kHz', explain: 'Half-period ≥ 60 µs → T ≥ 120 µs → f ≤ 8.33 kHz.', hint: 'If one edge takes 60 µs, what must the half-period be at least?' });
  mcq('d3', '#d3Q', { id: 'd3q5', q: 'Why does the output not reach ±15 V at 50 kHz?', opts: ['The op-amp went into saturation', 'Slew-rate limit: in a 10 µs half-period the output can change by at most 5 V', 'The gain increased with frequency', 'The oscilloscope bandwidth is insufficient'], correct: 1, explain: 'This is not saturation; the output does not touch the supply, it simply cannot keep up. (Section 1.6)', hint: 'SR × (T/2) = ?' });

  /* ================= DENEY 4 · Geri besleme ================= */
  const D4 = (() => {
    const box = $('#d4inst'), self = { prev: 0, ilim: false, ilimSeen: false, sweepPts: [], sweepMode: null };
    const sg = inst(box, 'DC SUPPLY · v<sub>g</sub>'); const sgL = lcd(sg.el, 'v<sub>g</sub>', 'V', 100);
    const kg = new Lab.Knob(sg.c, { label: 'v_g', min: -5, max: 5, step: 0.01, value: 1, dark: true, fmt: (v) => num(v, 2) + ' V' });
    const rb = inst(box, 'RESISTOR BOX', false);
    const ks = new Lab.Knob(rb.c, { label: 'R_s', list: RLIST, value: 1e4, fmt: Lab.ohm });
    const kfb = new Lab.Knob(rb.c, { label: 'R_f', list: RLIST, value: 1e4, fmt: Lab.ohm });
    const kl = new Lab.Knob(rb.c, { label: 'R_L', list: [100, 220, 470, 1e3, 2e3, 4.7e3, 1e4, 1e12], value: 1e4, fmt: (v) => (v >= 1e9 ? '∞ (open)' : Lab.ohm(v)) });
    const oa = inst(box, 'OP-AMP · S1', false);
    const ka = new Lab.Knob(oa.c, { label: 'A', list: [1e2, 1e3, 1e4, 1e5, 1e6], value: 1e5, fmt: (v) => '10^' + Math.round(Math.log10(v)) });
    const sw = document.createElement('button'); sw.className = 'seg-btn on'; sw.style.cssText = 'width:110px;padding:8px 4px'; oa.c.appendChild(sw);
    self.neg = true;
    const swTxt = () => (sw.textContent = self.neg ? 'S1: NEGATIVE FB' : 'S1: POSITIVE FB');
    sw.onclick = () => { self.neg = !self.neg; sw.classList.toggle('on', self.neg); swTxt(); self.prev = vsat(kv.value) * (Math.random() < 0.5 ? 1 : -1); }; swTxt();
    const ps = inst(box, '±V<sub>CC</sub>'); const psL = lcd(ps.el, 'SUPPLY', 'V', 80);
    const kv = new Lab.Knob(ps.c, { label: 'V_CC', min: 5, max: 18, step: 0.5, value: 15, dark: true, fmt: (v) => '±' + num(v, 1) + ' V' });
    const mm = inst(box, 'DMM-1 · v<sub>n</sub> (inverting terminal)', false); const mmL = lcd(mm.el, 'DC V · auto range', 'µV', 130);
    const mo = inst(box, 'DMM-2 · v<sub>o</sub>', false); const moL = lcd(mo.el, 'DC V', 'V', 110);

    // şema
    const g = $('#d4sch');
    sch.src(g, 60, 215); sch.w(g, [[60, 195], [60, 140], [110, 140]]); sch.rH(g, 110, 190, 140); sch.w(g, [[190, 140], [380, 140]]); sch.dot(g, 300, 140);
    sch.w(g, [[60, 235], [60, 255]]); sch.gnd(g, 60, 255);
    sch.w(g, [[300, 140], [300, 60], [360, 60]]); sch.rH(g, 360, 440, 60); sch.w(g, [[440, 60], [580, 60], [580, 165]]);
    sch.opamp(g, 380, 110); sch.w(g, [[500, 165], [660, 165]]); sch.dot(g, 580, 165);
    sch.rV(g, 660, 165, 255); sch.gnd(g, 660, 255);
    sch.w(g, [[380, 190], [345, 190], [345, 250]]); sch.gnd(g, 345, 250);
    E('rect', { x: 352, y: 126, width: 44, height: 78, fill: 'none', stroke: '#e07a10', 'stroke-dasharray': '4 3', rx: 5 }, g);
    sch.t(g, 374, 220, 'S1', 'lbl').style.fill = '#e07a10';
    const tTop = sch.t(g, 392, 146, '−', 'val'), tBot = sch.t(g, 392, 196, '+', 'val');
    sch.w(g, [[440, 137], [440, 100]]); sch.t(g, 440, 93, '+V<tspan font-size="10" dy="3">CC</tspan>');
    sch.w(g, [[440, 192], [440, 230]]); sch.t(g, 440, 247, '−V<tspan font-size="10" dy="3">CC</tspan>');
    const tRs = sch.t(g, 150, 125, ''), tRf = sch.t(g, 400, 45, ''), tRL = sch.t(g, 646, 205, '', 'lbl', 'end');
    const tIs = sch.t(g, 150, 162, '', 'val'), tIf = sch.t(g, 400, 84, '', 'val'), tIL = sch.t(g, 646, 225, '', 'val', 'end');
    const tVg = sch.t(g, 88, 220, '', 'val', 'start'), tVn = sch.t(g, 296, 128, '', 'val', 'end'), tVo = sch.t(g, 590, 155, '', 'val', 'start'), tMode = sch.t(g, 600, 25, '', 'val');
    const tIo = sch.t(g, 510, 185, '', 'val', 'start');
    const fl = [E('path', { d: 'M60,195 V140 H300', class: 'flow' }, g), E('path', { d: 'M300,140 V60 H580 V165', class: 'flow' }, g), E('path', { d: 'M580,165 H660 V255', class: 'flow' }, g)];

    function compute() {
      const vg = kg.value, Rs = ks.value, Rf = kfb.value, RL = kl.value, vcc = kv.value, A = ka.value;
      const m = model(vcc, A), G = 1 / Rs + 1 / Rf + 1 / RI, a = vg / Rs / G, b = 1 / Rf / G;
      let r = self.neg ? Lab.opamp(0, 0, a, b, m, self.prev) : Lab.opamp(a, b, 0, 0, m, self.prev);
      let vo = r.vo, ilim = false;
      const io0 = vo / RL + (vo - (a + b * vo)) / Rf;
      if (Math.abs(io0) > IMAX) { vo = (Math.sign(io0) * IMAX + a / Rf) / (1 / RL + (1 - b) / Rf); ilim = true; }
      self.prev = vo;
      const vN = a + b * vo, vp = self.neg ? 0 : vN, vn = self.neg ? vN : 0;
      const is = (vg - vN) / Rs, ifb = (vN - vo) / Rf, iL = vo / RL, io = iL - ifb, iNode = vN / RI;
      const iccP = IQ + Math.max(io, 0), iccN = -IQ + Math.min(io, 0);
      const ip = self.neg ? -iNode : iNode, inn = self.neg ? iNode : -iNode;
      const sat = Math.abs(r.vo) >= m.vsatP * 0.999;
      return { vg, Rs, Rf, RL, vcc, A, vo, vN, vp, vn, is, ifb, iL, io, ip, inn, iccP, iccN, ilim, sat, neg: self.neg };
    }
    function update() {
      const c = (self.c = compute());
      if (c.ilim) self.ilimSeen = true;
      sgL(num(c.vg, 2)); psL('±' + num(c.vcc, 1));
      const a = vAuto(c.vn); mmL(a[0], a[1]); moL(num(c.vo, 3));
      tTop.textContent = c.neg ? '−' : '+'; tBot.textContent = c.neg ? '+' : '−';
      tRs.textContent = 'R_s = ' + Lab.ohm(c.Rs); tRf.textContent = 'R_f = ' + Lab.ohm(c.Rf); tRL.textContent = 'R_L = ' + (c.RL >= 1e9 ? '∞' : Lab.ohm(c.RL));
      tIs.textContent = 'i_s = ' + eng(c.is, 'A'); tIf.textContent = 'i_f = ' + eng(c.ifb, 'A'); tIL.textContent = 'i_L = ' + eng(c.iL, 'A');
      tVg.textContent = 'v_g = ' + num(c.vg, 2) + ' V';
      const vNa = vAuto(c.vN); tVn.textContent = (c.neg ? 'v_n = ' : 'v_p = ') + vNa[0] + ' ' + vNa[1];
      tVo.textContent = 'v_o = ' + num(c.vo, 3) + ' V'; tIo.textContent = 'i_o = ' + eng(c.io, 'A');
      tMode.textContent = c.ilim ? 'CURRENT LIMIT (25 mA)!' : !c.neg ? 'POSITIVE FB · LATCHED' : c.sat ? 'SATURATION · v_p ≠ v_n' : 'LINEAR · VIRTUAL SHORT';
      tMode.style.fill = c.ilim || !c.neg || c.sat ? '#c62828' : '#1a8a4a';
      const rows = [
        ['Non-inverting input (+) i<sub>p</sub>', c.ip], ['Inverting input (−) i<sub>n</sub>', c.inn], ['Output terminal (inward) −i<sub>o</sub>', -c.io],
        ['+V<sub>CC</sub> terminal i<sub>CC+</sub>', c.iccP], ['−V<sub>CC</sub> terminal i<sub>CC−</sub>', c.iccN],
      ];
      const sum = rows.reduce((s, r) => s + r[1], 0);
      $('#d4cur').innerHTML = rows.map((r) => `<tr><td class="l">${r[0]}</td><td>${eng(r[1], 'A')}</td></tr>`).join('') + `<tr><th class="l">Total (KCL)</th><th>${Math.abs(sum) < 1e-12 ? '0 A ✓' : eng(sum, 'A')}</th></tr>`;
      $('#d4kcl').innerHTML = `Net current from the supply terminals i<sub>CC+</sub> + i<sub>CC−</sub> = <b>${eng(c.iccP + c.iccN, 'A')}</b> = output current i<sub>o</sub>. Only ${eng(Math.abs(c.inn), 'A')} flows through the inputs.`;
      self.flowI = [c.is, c.ifb, c.RL >= 1e9 ? 0 : c.iL];
    }
    let off = [0, 0, 0], last = performance.now();
    self.anim = () => {
      const now = performance.now(), dt = (now - last) / 1000; last = now;
      if (!self.flowI) return;
      fl.forEach((p, k) => {
        const i = self.flowI[k], sp = Math.abs(i) < 1e-7 ? 0 : clamp(20 + 30 * Math.log10(Math.abs(i) / 1e-6), 8, 160);
        p.style.opacity = sp ? 0.9 : 0;
        off[k] -= Math.sign(i) * sp * dt; p.style.strokeDashoffset = off[k];
      });
    };
    const plot = new Lab.Plot($('#d4plot'), { xlabel: 'v_g  (V)', ylabel: 'v_o  (V)' });
    function drawPlot() {
      const ser = [];
      if (self.sweepPts.length) ser.push({ pts: self.sweepPts, line: true, color: self.sweepMode ? '#0b5cad' : '#c62828', width: 2.5 });
      ser.push({ pts: S.d4rows.map((r) => [r.vg, r.vo]), dots: true, color: '#e07a10' });
      plot.draw(ser, [-5.2, 5.2], [-19, 19]);
    }
    const tbody = $('#d4tab tbody');
    function table() {
      tbody.innerHTML = S.d4rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.neg ? 'neg' : 'pos'}</td><td>1e${Math.round(Math.log10(r.A))}</td><td>${Lab.ohm(r.Rs)}</td><td>${Lab.ohm(r.Rf)}</td><td>${r.RL >= 1e9 ? '∞' : Lab.ohm(r.RL)}</td><td>${num(r.vg, 2)}</td><td>${vAuto(r.vn).join(' ')}</td><td>${num(r.vo, 3)}</td><td>${r.vg ? num(r.vo / r.vg, 3) : '—'}</td><td>${eng(r.io, 'A')}</td></tr>`).join('');
      drawPlot();
    }
    function rec() { const c = compute(); S.d4rows.push({ neg: c.neg, A: c.A, Rs: c.Rs, Rf: c.Rf, RL: c.RL, vg: c.vg, vn: c.vn, vo: c.vo, io: c.io }); save(); table(); Lab.toast(`Recorded: v_g = ${num(c.vg, 2)} V → v_o = ${num(c.vo, 3)} V`); }
    $('#d4rec').onclick = rec;
    $('#d4clr').onclick = () => { S.d4rows = []; self.sweepPts = []; save(); table(); };
    $('#d4csv').onclick = () => Lab.downloadCSV('hafta1_deney4.csv', ['#', 'FB', 'A', 'Rs', 'Rf', 'RL', 'vg (V)', 'vn (V)', 'vo (V)', 'vo/vg', 'io (A)'], S.d4rows.map((r, i) => [i + 1, r.neg ? 'negative' : 'positive', r.A, r.Rs, r.Rf, r.RL, r.vg, r.vn, r.vo, r.vg ? r.vo / r.vg : '', r.io]));
    $('#d4sweep').onclick = () => {
      if (self.sweeping) return;
      self.sweeping = true; self.sweepPts = []; self.sweepMode = self.neg;
      const seq = []; for (let v = -5; v <= 5.001; v += 0.1) seq.push(v); for (let v = 4.9; v >= -5.001; v -= 0.1) seq.push(v);
      self.prev = -1e3; let i = 0;
      const h = setInterval(() => {
        kg.set(+seq[i].toFixed(2)); const c = compute(); self.sweepPts.push([c.vg, c.vo]); drawPlot();
        if (++i >= seq.length) { clearInterval(h); self.sweeping = false; if (!self.neg) { S.d4sweepPos = true; save(); } Lab.toast(self.neg ? 'Sweep finished: slope −R_f/R_s, saturation at the ends.' : 'Sweep finished: up and down sweeps follow different paths → hysteresis (memory).'); }
      }, 25);
    };
    table();
    Object.assign(self, { update, rec, kg, ks, kfb, kl, ka, kv, plotCanvas: $('#d4plot') });
    return self;
  })();

  const d4c = () => D4.c || {};
  steps('d4', [
    { t: '<b>R<sub>s</sub> = 10 kΩ, R<sub>f</sub> = 47 kΩ, v<sub>g</sub> = 1 V</b>, A = 10<sup>5</sup>, S1 negative. Read v<sub>o</sub> ≈ −4.7 V and v<sub>n</sub> ≈ 47 µV on DMM-1: the inverting terminal is not connected to ground but is ≈0 V (<b>virtual ground</b>).', test: () => { const c = d4c(); return c.neg && c.Rs === 1e4 && c.Rf === 4.7e4 && near(c.vg, 1, 0.005) && c.A === 1e5; } },
    { t: 'Reduce A to <b>10<sup>2</sup></b>. How did v<sub>n</sub> and the gain change? Compare with the finite-gain formula.', test: () => { const c = d4c(); return c.neg && c.A === 100; } },
    { t: 'Example 1.11: <b>R<sub>s</sub> = 10 kΩ, R<sub>f</sub> = 50 kΩ, R<sub>L</sub> = 2 kΩ, v<sub>g</sub> = −1 V</b>, A = 10<sup>5</sup>. Verify KCL in the terminal currents table.', test: () => { const c = d4c(); return c.neg && c.Rs === 1e4 && c.Rf === 5e4 && c.RL === 2e3 && near(c.vg, -1, 0.005); } },
    { t: 'Reduce R<sub>L</sub> to <b>100 Ω</b> and bring the output to around ±10 V: the op-amp enters its <b>25 mA current limit</b> and v<sub>o</sub> drops.', test: () => D4.ilimSeen },
    { t: 'Switch S1 to <b>POSITIVE</b> and press <b>Auto sweep</b>. Why does the output take no intermediate values? Compare the up and down curves.', test: () => !!S.d4sweepPos },
    { t: 'Record at least <b>4 measurements</b> at different settings (<kbd>R</kbd>).', test: () => S.d4rows.length >= 4 },
  ]);
  numq('d4', '#d4Q', { id: 'd4q1', q: 'R<sub>s</sub> = 10 kΩ, R<sub>f</sub> = 47 kΩ, v<sub>g</sub> = 1 V (ideal): what is v<sub>o</sub> in volts?', answer: -4.7, tol: 1, unit: 'V', explain: 'v<sub>o</sub> = −(R<sub>f</sub>/R<sub>s</sub>)v<sub>g</sub> = −4.7 V.', hint: 'Do not forget the minus sign.' });
  numq('d4', '#d4Q', { id: 'd4q2', q: 'In the same circuit with A = 10<sup>5</sup>, what is v<sub>n</sub> in µV?', answer: 47, tol: 3, unit: 'µV', explain: 'v<sub>n</sub> = −v<sub>o</sub>/A = 4.7/10<sup>5</sup> = 47 µV: practically zero.', hint: 'v<sub>o</sub> = A(0 − v<sub>n</sub>)' });
  numq('d4', '#d4Q', { id: 'd4q3', q: 'A = 100, R<sub>s</sub> = 10 kΩ, R<sub>f</sub> = 100 kΩ, v<sub>g</sub> = 0.5 V: what is v<sub>o</sub> in volts?', answer: -0.5 * 10 / (1 + 11 / 100), tol: 0.6, unit: 'V', explain: '(−10)/(1 + 11/100) × 0.5 = −4.505 V; a 10 % deviation from the ideal −5 V.', hint: '(−R<sub>f</sub>/R<sub>s</sub>)/(1 + (1+R<sub>f</sub>/R<sub>s</sub>)/A)' });
  numq('d4', '#d4Q', { id: 'd4q4', q: 'Example 1.11 (R<sub>s</sub> = 10 kΩ, R<sub>f</sub> = 50 kΩ, R<sub>L</sub> = 2 kΩ, v<sub>g</sub> = −1 V): what is the current i<sub>o</sub> leaving the op-amp output, in mA?', answer: 2.6, tol: 1.5, unit: 'mA', explain: 'i<sub>o</sub> = i<sub>L</sub> + 0.1 mA = 2.5 + 0.1 = 2.6 mA; this current comes from the supply.', hint: 'Load current + current through R<sub>f</sub> into the virtual ground.' });
  numq('d4', '#d4Q', { id: 'd4q5', q: 'Positive FB, R<sub>s</sub> = 10 kΩ, R<sub>f</sub> = 100 kΩ, ±15 V: with the output at −15 V, above which value of v<sub>g</sub> does it switch to +15 V?', answer: 1.5, tol: 3, unit: 'V', explain: 'The switch occurs when v<sub>p</sub> crosses zero: v<sub>g</sub>/R<sub>s</sub> + v<sub>o</sub>/R<sub>f</sub> = 0 → v<sub>g</sub> = 15 × 10/100 = 1.5 V. This is the hysteresis threshold you saw in the sweep (Schmitt trigger).', hint: 'v<sub>p</sub> = (v<sub>g</sub>R<sub>f</sub> + v<sub>o</sub>R<sub>s</sub>)/(R<sub>s</sub>+R<sub>f</sub>) = 0' });
  mcq('d4', '#d4Q', { id: 'd4q6', q: 'With negative feedback v<sub>n</sub> ≈ 0, so why is the inverting terminal not considered “connected to ground”?', opts: ['It is connected; it is the same thing', 'It is a virtual ground: its voltage is ≈0 but no current flows into it; all of i<sub>s</sub> passes through R<sub>f</sub>', 'A large current flows from the inverting terminal to ground', 'Because the op-amp is saturated'], correct: 1, explain: 'In the terminal currents table i<sub>n</sub> is of the order of pA, and i<sub>s</sub> = −i<sub>f</sub>.', hint: 'Look at the value of i<sub>n</sub> in the table.' });

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
    const f = D2.fit();
    const img = (c) => { try { return `<img src="${c.toDataURL()}" style="width:48%;border:1px solid #ccc">`; } catch (e) { return ''; } };
    const html = `
      <h2 style="margin:0">Circuit Theory I · Virtual Lab · Week 1 Report</h2>
      <p><b>Topic:</b> Meet the op-amp — terminals, open loop, saturation, comparator, virtual short</p>
      <table class="data" style="width:auto"><tr><th>Full name</th><td class="l">${S.st.name || ''}</td><th>Student ID</th><td class="l">${S.st.no || ''}</td><th>Group</th><td class="l">${S.st.group || ''}</td><th>Date</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Summary</h3>
      <p>Lab-sheet steps completed: <b>${sOk}/${sTot}</b> · Correct answers: <b>${ok}/${tot}</b> · Score: <b>${Math.round((50 * sOk) / sTot + (50 * ok) / tot)}/100</b>${S.d1burn ? ' · <span style="color:#c62828">IC burned out in Experiment 1</span>' : ''}</p>
      <h3>Answers</h3>
      <table class="data"><thead><tr><th>Section</th><th>Question</th><th>Answer</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Experiment 2 · Open-loop measurements</h3>
      ${f ? `<p>Least squares: A ≈ ${eng(f.A, '', 3)}, residual offset ≈ ${num(f.vos * 1e6, 1)} µV (${f.n} points).</p>` : ''}
      <table class="data"><thead><tr><th>#</th><th>V<sub>S</sub> (mV)</th><th>±V<sub>CC</sub></th><th>v<sub>p</sub>−v<sub>n</sub> (µV)</th><th>v<sub>o</sub> (V)</th><th>Region</th></tr></thead><tbody>${$('#d2tab tbody').innerHTML}</tbody></table>
      <h3>Experiment 4 · Feedback measurements</h3>
      <table class="data"><thead>${$('#d4tab thead').innerHTML}</thead><tbody>${$('#d4tab tbody').innerHTML}</tbody></table>
      <h3>Plots</h3>
      <div>${img(D2.plotCanvas)} ${img(D4.plotCanvas)}</div>
      <div>${img($('#scope'))}</div>
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
    if (e.key === 'r' || e.key === 'R') { if (S.page === 'd2') D2.rec(); if (S.page === 'd4') D4.rec(); }
  });

  function loop() {
    if (S.page === 'd1') evalSteps('d1');
    if (S.page === 'd2') { D2.update(); evalSteps('d2'); }
    if (S.page === 'd3') { D3.update(); evalSteps('d3'); }
    if (S.page === 'd4') { if (!D4.sweeping) D4.update(); D4.anim(); evalSteps('d4'); }
    requestAnimationFrame(loop);
  }
  ['d1', 'd2', 'd3', 'd4'].forEach(evalSteps);
  go(S.page); progress(); loop();
})();

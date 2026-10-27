/* Devre Kuramı I · Hafta 8 — Ara Sınav Haftası: Uygulamalı Sınav (Bölüm 1 + 2) */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd1h08';
  const S = Object.assign({ answers: {}, steps: {}, st: {}, page: 'giris',
    d1: { sc: null, hist: [], rows: [], probe: 4, tpEver: [], vpvn: false },
    d2: { sen: null, rows: [], d: null },
    d3: { sc: null, hist: [], curUsed: false },
    exam: null, exams: [] }, Lab.store.load(KEY));
  Lab.answers = S.answers;
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => Lab.store.save(KEY, S), 300); };
  Lab.onAnswer = () => { save(); progress(); };

  /* ---------- ortak yardımcılar ---------- */
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const rnd = (a, b, d = 2) => +(a + Math.random() * (b - a)).toFixed(d);
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const VS = 13.5; // gerçekçi 741 doyumu, ±15 V
  const ohm = Lab.ohm;

  function inst(parent, brand, dark = true, right = '') {
    const d = document.createElement('div'); d.className = 'inst' + (dark ? ' dark' : '');
    d.innerHTML = `<div class="brand"><span>${brand}</span><span>${right}</span></div><div class="ctrls"></div>`;
    parent.appendChild(d); return { el: d, c: d.querySelector('.ctrls') };
  }
  function lcd(parent, label, unit, w = 150) {
    const d = document.createElement('div'); d.className = 'lcd'; d.style.minWidth = w + 'px'; d.style.marginBottom = '6px';
    d.innerHTML = `<div class="lab">${label}</div><span class="big">0</span><span class="unit">${unit}</span>`;
    parent.insertBefore(d, parent.querySelector('.ctrls'));
    const b = d.querySelector('.big'), u = d.querySelector('.unit'), l = d.querySelector('.lab');
    return (t, un, lab) => { b.textContent = t; if (un != null) u.textContent = un; if (lab != null) l.innerHTML = lab; };
  }

  /* ---------- şema yardımcıları (hafta01 ile aynı) ---------- */
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
  };
  const sub = (a, b) => `${a}<tspan font-size="10" dy="3">${b}</tspan><tspan dy="-3"> </tspan>`;

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
  numq('onhaz', '#preQ', { id: 'p1', q: '1) Non-inverting amplifier: R<sub>s</sub> = 10 kΩ, R<sub>f</sub> = 47 kΩ, v<sub>g</sub> = 0.8 V. What is v<sub>o</sub> in volts?', answer: 4.56, tol: 1, unit: 'V', explain: '(1 + 4.7) × 0.8 = 4.56 V; within ±15 V.', hint: 'The gain is 1 + R<sub>f</sub>/R<sub>s</sub>.' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) If 1 kΩ is fitted by mistake instead of R<sub>s</sub> in the same circuit, what is v<sub>o</sub> in volts (lecture assumption, saturation ±15 V)?', answer: 15, tol: 1, unit: 'V', explain: '(1 + 47) × 0.8 = 38.4 V is calculated, but the output saturates at +15 V.', hint: 'First calculate the ideal result, then compare it with the supply.' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) Difference amplifier: R<sub>1</sub> = R<sub>3</sub> = 10 kΩ, R<sub>2</sub> = R<sub>4</sub> = 100 kΩ; v<sub>b</sub> − v<sub>a</sub> = 50 mV. What is v<sub>o</sub> in volts?', answer: 0.5, tol: 1, unit: 'V', explain: '(100/10) × 50 mV = 0.5 V. The common-mode voltage (e.g. 2.5 V) does not reach the output if the ratios are equal.', hint: 'v<sub>o</sub> = (R<sub>2</sub>/R<sub>1</sub>)(v<sub>b</sub> − v<sub>a</sub>)' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) Example 2.1: the current of an L = 200 mH inductor rises linearly from 0 to 3 A in 6 ms. What is the inductor voltage in volts?', answer: 100, tol: 1, unit: 'V', explain: 'v = L di/dt = 0.2 × (3/0.006) = 100 V, constant.', hint: 'Slope = 3 A / 6 ms = 500 A/s.' });
  numq('onhaz', '#preQ', { id: 'p5', q: '5) Example 2.9: the voltage of a C = 2 µF capacitor rises linearly from 0 to 6 V in 3 ms. What is the current in mA?', answer: 4, tol: 1, unit: 'mA', explain: 'i = C dv/dt = 2×10⁻⁶ × 2000 = 4 mA.', hint: 'The slope is 2000 V/s.' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) If the voltage of an element is a triangular wave and its current is a square wave, which element is it?', opts: ['Resistor', 'Inductor', 'Capacitor', 'Cannot be determined'], correct: 2, explain: 'i = C dv/dt: the slope of the triangle is constant → the current is constant in each half-period (square).', hint: 'In which element is the current proportional to the derivative of the voltage?' });

  /* ================= GÖREV 1 · ARIZA BUL ================= */
  const FAULTS = [
    ['ok', 'No fault — the board works correctly'],
    ['swap', 'Op-amp inputs connected in reverse (+ and − swapped)'],
    ['rfopen', 'R_f open (open circuit)'],
    ['cap', 'Supply decoupling electrolytic (C1) fitted backwards'],
    ['wrongR', 'Wrong-value resistor fitted (colour-code error)'],
  ];
  const FEXPL = {
    ok: 'Supply ±15 V, v<sub>p</sub> = v<sub>n</sub> and v<sub>o</sub>/v<sub>g</sub> = 5.7: the board is healthy. Saying “no fault” is also a diagnosis!',
    swap: 'v<sub>n</sub> = v<sub>g</sub> (the source is on the inverting terminal), while v<sub>p</sub> comes from the output through the divider and the output is saturated: the feedback is <b>positive</b>. The relation v<sub>p</sub> = v<sub>o</sub>·R<sub>s</sub>/(R<sub>s</sub>+R<sub>f</sub>) gives it away.',
    rfopen: 'v<sub>n</sub> ≈ 0 (pulled to ground through R<sub>s</sub>, only a few mV from the bias current), v<sub>p</sub> = v<sub>g</sub> &gt; 0 and the output is at +V<sub>sat</sub>: there is no feedback path, the op-amp works open loop like a comparator.',
    cap: 'The +V<sub>CC</sub> pin is about 2 V instead of 15 V, and the supply is in CC (current limit) mode: the reversed electrolytic short-circuits the supply. Since the op-amp is left without supply, v<sub>p</sub> ≠ v<sub>n</sub>.',
    wrongR: 'If the supply and the virtual short are normal but the gain is not 5.7, a resistor value is wrong: R<sub>f</sub> = R<sub>s</sub>(v<sub>o</sub>/v<sub>n</sub> − 1). On a saturated board you can find which resistor changed using v<sub>n</sub> = v<sub>o</sub>·R<sub>s</sub>/(R<sub>s</sub>+R<sub>f</sub>).',
  };
  const TPN = ['TP1 · v<sub>g</sub> (source)', 'TP2 · pin 3 (+)', 'TP3 · pin 2 (−)', 'TP4 · pin 6 (v<sub>o</sub>)', 'TP5 · pin 7 (+V<sub>CC</sub>)', 'TP6 · pin 4 (−V<sub>CC</sub>)'];
  const TPT = ['TP1 vg', 'TP2 pin3', 'TP3 pin2', 'TP4 vo', 'TP5 +Vcc', 'TP6 -Vcc'];

  const D1 = (() => {
    const self = {};
    const Rs0 = 1e4, Rf0 = 4.7e4, RL = 1e4, IB = 80e-9, IQ = 1.7e-3;
    function newSc() {
      const prev = S.d1.sc && S.d1.sc.f;
      let f; do { f = pick(['ok', 'swap', 'swap', 'rfopen', 'rfopen', 'cap', 'cap', 'wrongR', 'wrongR']); } while (f === prev && Math.random() < 0.8);
      S.d1.sc = { f, vg: rnd(0.3, 1.1, 2), sub: Math.random() < 0.5 ? 'rf' : 'rs', rail: rnd(1.6, 2.4, 2), n: S.d1.hist.length + 1, meas: [], done: false };
      save();
    }
    if (!S.d1.sc) newSc();
    function compute(sc = S.d1.sc) {
      let Rs = Rs0, Rf = Rf0, railP = 15, railN = -15, cc = false;
      const vg = sc.vg;
      if (sc.f === 'wrongR') { if (sc.sub === 'rf') Rf = 4.7e3; else Rs = 1e3; }
      const G = 1 + Rf / Rs, k = Rs / (Rs + Rf);
      let p3, p2, vo;
      if (sc.f === 'swap') { vo = -VS; p2 = vg; p3 = vo * k; }
      else if (sc.f === 'rfopen') { p3 = vg; p2 = IB * Rs; vo = VS; }
      else if (sc.f === 'cap') { railP = sc.rail; cc = true; p3 = vg; vo = Math.max(0.05, Math.min(G * vg, railP - 1.4)); p2 = vo * k; }
      else { p3 = vg; vo = clamp((G * vg) / (1 + G / 1e5), -VS, VS); p2 = vo * k; }
      const io = vo / RL + (sc.f === 'rfopen' ? 0 : vo / (Rs + Rf));
      const Ip = cc ? 0.5 : IQ + Math.max(0, io), In = IQ + Math.max(0, -io);
      return { tp: [vg, p3, p2, vo, railP, railN], Ip, In, cc };
    }
    // --- tezgâh
    const box = $('#d1inst');
    const ps = inst(box, 'SYMMETRIC DC SUPPLY', true, '<span class="led" id="d1cc"></span> CC');
    const psP = lcd(ps.el, '+ CHANNEL', 'V', 120), psN = lcd(ps.el, '− CHANNEL', 'V', 120);
    const psI = document.createElement('div'); psI.style.cssText = 'font:12px Consolas;color:#ffb04a'; ps.c.appendChild(psI);
    const dc = inst(box, 'ADJUSTABLE DC SUPPLY · v<sub>g</sub>'); const dcL = lcd(dc.el, 'SETTING', 'V', 110);
    const dm = inst(box, 'DMM · DC V', false, '10 MΩ input'); const dmL = lcd(dm.el, '—', 'V', 170);
    const dmInfo = document.createElement('div'); dmInfo.style.cssText = 'font-size:11px;max-width:180px'; dmInfo.innerHTML = 'Black lead: COM (ground). Touch the red lead to a TP by clicking it on the schematic.'; dm.c.appendChild(dmInfo);

    // --- şema
    const g = $('#d1sch');
    sch.src(g, 70, 215); sch.w(g, [[70, 195], [70, 185], [300, 185]]); sch.w(g, [[70, 235], [70, 255]]); sch.gnd(g, 70, 255);
    sch.t(g, 36, 220, sub('v', 'g'));
    sch.opamp(g, 300, 100); sch.t(g, 312, 130, '−'); sch.t(g, 312, 190, '+');
    sch.t(g, 296, 120, '2', 'lbl', 'end').setAttribute('style', 'font-size:10px'); sch.t(g, 296, 180, '3', 'lbl', 'end').setAttribute('style', 'font-size:10px');
    sch.w(g, [[300, 125], [230, 125]]); sch.dot(g, 230, 125);
    sch.rH(g, 130, 230, 125); sch.w(g, [[130, 125], [130, 140]]); sch.gnd(g, 130, 140); sch.t(g, 180, 110, sub('R', 's') + '10 kΩ');
    sch.w(g, [[230, 125], [230, 50], [280, 50]]); sch.rH(g, 280, 400, 50); sch.w(g, [[400, 50], [470, 50], [470, 155]]); sch.t(g, 340, 36, sub('R', 'f') + '47 kΩ');
    sch.w(g, [[420, 155], [560, 155]]); sch.dot(g, 470, 155); sch.rV(g, 560, 155, 255); sch.gnd(g, 560, 255); sch.t(g, 576, 210, sub('R', 'L') + '10 kΩ', 'lbl', 'start');
    sch.w(g, [[360, 128], [360, 80], [440, 80], [440, 92]]);
    E('path', { d: 'M428,92 h24 M428,100 q12,-5 24,0', class: 'w' }, g); sch.w(g, [[440, 98], [440, 112]]); sch.gnd(g, 440, 112);
    sch.t(g, 424, 96, '+', 'lbl', 'end').setAttribute('style', 'font-size:11px'); sch.t(g, 456, 128, 'C1', 'lbl', 'start').setAttribute('style', 'font-size:11px');
    sch.t(g, 352, 76, '+15 V · 7', 'lbl', 'end');
    sch.w(g, [[360, 182], [360, 250]]); sch.t(g, 368, 262, '−15 V · 4', 'lbl', 'start');
    sch.t(g, 650, 40, 'C1 = 100 µF / 25 V', 'lbl').setAttribute('style', 'font-size:11px;fill:#777');
    const tpPos = [[150, 185], [270, 185], [265, 125], [520, 155], [360, 100], [360, 230]];
    const tpEls = tpPos.map(([x, y], i) => {
      const t = E('g', { class: 'tp' }, g);
      E('circle', { cx: x, cy: y, r: 7 }, t);
      sch.t(t, x + (i === 4 ? -12 : 0), y - (i === 5 ? -22 : 11), 'TP' + (i + 1), '', i === 4 ? 'end' : 'middle');
      t.addEventListener('click', () => probe(i));
      return t;
    });
    const tMsg = sch.t(g, 600, 300, '', 'val'); tMsg.setAttribute('style', 'fill:#c62828;font-size:12px');
    function probe(i) {
      S.d1.probe = i;
      const sc = S.d1.sc; if (!sc.meas.includes(i)) sc.meas.push(i);
      if (!S.d1.tpEver.includes(i)) S.d1.tpEver.push(i);
      if (sc.meas.includes(1) && sc.meas.includes(2)) S.d1.vpvn = true;
      save(); self.tick = 0;
    }
    // --- teşhis
    $('#d1diag').innerHTML = '<option value="">— choose your diagnosis —</option>' + FAULTS.map(([k, t]) => `<option value="${k}">${t.replace('R_f', 'Rf')}</option>`).join('');
    function score() {
      const h = S.d1.hist, ok = h.filter((x) => x.ok).length;
      $('#d1score').textContent = `Correct diagnoses: ${ok}/${h.length}`;
      $('#d1card').textContent = 'Board #' + S.d1.sc.n;
    }
    $('#d1go').onclick = () => {
      const sc = S.d1.sc, v = $('#d1diag').value;
      if (sc.done) return Lab.toast('This board has been diagnosed. Continue with “New board”.');
      if (!v) return Lab.toast('Choose a diagnosis.');
      if (sc.meas.length < 2) return Lab.toast('No diagnosis without measurement: measure at least two test points.');
      const ok = v === sc.f; sc.done = true;
      S.d1.hist.push({ n: sc.n, f: sc.f, g: v, ok, nm: sc.meas.length, vg: sc.vg, sub: sc.sub });
      const name = FAULTS.find((x) => x[0] === sc.f)[1];
      $('#d1fb').innerHTML = (ok ? '<b style="color:#1a8a4a">✔ Correct diagnosis.</b> ' : `<b style="color:#c62828">✘ Incorrect.</b> Actual fault: <b>${name}</b>. `) + FEXPL[sc.f] + (sc.f === 'wrongR' ? ` (On this board ${sc.sub === 'rf' ? '4.7 kΩ was fitted instead of R<sub>f</sub>' : '1 kΩ was fitted instead of R<sub>s</sub>'}.)` : '');
      save(); score(); progress();
    };
    $('#d1next').onclick = () => { if (!S.d1.sc.done && S.d1.sc.meas.length && !confirm('Do you want to skip this board without diagnosing it?')) return; newSc(); $('#d1diag').value = ''; $('#d1fb').innerHTML = 'New board fitted. Measure first: at least two test points.'; score(); };
    // --- tablo
    const tbody = $('#d1tab tbody');
    function table() { tbody.innerHTML = S.d1.rows.map((r, i) => `<tr><td>${i + 1}</td><td>#${r.n}</td><td class="l">${TPN[r.tp]}</td><td>${num(r.v, 3)}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; }
    self.rec = () => { const v = self.reading; if (v == null) return; S.d1.rows.push({ n: S.d1.sc.n, tp: S.d1.probe, v }); save(); table(); Lab.toast(`Recorded: ${TPT[S.d1.probe]} = ${num(v, 3)} V`); };
    $('#d1rec').onclick = self.rec;
    $('#d1del').onclick = () => { S.d1.rows.pop(); save(); table(); };
    $('#d1csv').onclick = () => Lab.downloadCSV('hafta8_gorev1.csv', ['#', 'board', 'point', 'V'], S.d1.rows.map((r, i) => [i + 1, r.n, TPT[r.tp], +r.v.toFixed(4)]));
    self.tick = 0;
    self.update = () => {
      const c = compute(), sc = S.d1.sc;
      psP(num(c.tp[4], 2)); psN(num(c.tp[5], 2));
      psI.textContent = `+ ${num(c.Ip * 1e3, 1)} mA   − ${num(c.In * 1e3, 1)} mA`;
      $('#d1cc').classList.toggle('on', c.cc);
      dcL(num(sc.vg, 2));
      tpEls.forEach((t, i) => t.classList.toggle('sel', i === S.d1.probe));
      if (self.tick-- <= 0) { // ~4 Hz yenileme, gürültülü okuma
        self.tick = 15;
        const v = c.tp[S.d1.probe];
        self.reading = v * (1 + 3e-4 * gauss()) + 2e-4 * gauss();
        dmL(num(self.reading, Math.abs(self.reading) >= 10 ? 2 : 3), 'V', TPN[S.d1.probe]);
      }
      tMsg.textContent = c.cc ? 'Supply in CC: at current limit!' : '';
    };
    table(); score();
    if (S.d1.sc.done) $('#d1fb').innerHTML = 'This board has been diagnosed. Continue with “New board”.';
    self.compute = compute;
    return self;
  })();

  const d1ok = () => S.d1.hist.filter((h) => h.ok).length;
  steps('d1', [
    { t: 'On any board first verify the <b>supply</b>: measure points TP5 (+V<sub>CC</sub>) and TP6 (−V<sub>CC</sub>).', test: () => S.d1.tpEver.includes(4) && S.d1.tpEver.includes(5) },
    { t: 'On the same board measure <b>v<sub>p</sub> and v<sub>n</sub></b> (TP2, TP3) and check whether the virtual short holds.', test: () => S.d1.vpvn },
    { t: 'Record at least <b>6 measurements</b> in the table (<kbd>R</kbd>).', test: () => S.d1.rows.length >= 6 },
    { t: 'Diagnose <b>3 boards</b> correctly.', test: () => d1ok() >= 3 },
    { t: 'Diagnose at least <b>6 boards</b> in total and raise your success rate above <b>80%</b> (last 6 boards).', test: () => { const h = S.d1.hist.slice(-6); return h.length >= 6 && h.filter((x) => x.ok).length >= 5; } },
  ]);
  mcq('d1', '#d1Q', { id: 'd1q1', q: 'On a board v<sub>p</sub> = 0.6 V, v<sub>n</sub> ≈ 0.8 mV and v<sub>o</sub> = +13.5 V were measured; the supply is ±15 V. What is the most likely fault?', opts: ['Inputs swapped', 'R<sub>f</sub> open', 'C1 fitted backwards', 'Board healthy'], correct: 1, explain: 'v<sub>n</sub> is pulled to ground through R<sub>s</sub> (only 80 nA × 10 kΩ); since there is no feedback the op-amp is saturated.', hint: 'Why does v<sub>n</sub> not rise while the output is +13.5 V?' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'On a board v<sub>n</sub> = v<sub>p</sub> = 0.50 V and v<sub>o</sub> = 0.735 V were measured (R<sub>s</sub> = 10 kΩ is correct). What is the fitted R<sub>f</sub> in kΩ?', answer: 4.7, tol: 2, unit: 'kΩ', explain: 'R<sub>f</sub> = R<sub>s</sub>(v<sub>o</sub>/v<sub>n</sub> − 1) = 10 × 0.47 = 4.7 kΩ: a 4.7 kΩ yellow-violet-red may have been fitted instead of the 47 kΩ yellow-violet-orange.', hint: 'v<sub>o</sub> = (1 + R<sub>f</sub>/R<sub>s</sub>) v<sub>n</sub>' });
  mcq('d1', '#d1Q', { id: 'd1q3', q: 'On the board with swapped inputs (v<sub>g</sub> on the inverting terminal) the output is at −13.5 V. How many volts do you expect to measure at pin 3?', opts: ['v<sub>g</sub>', '0 V', '−13.5 × 10/57 ≈ −2.37 V', '+13.5 V'], correct: 2, explain: 'Pin 3 is now the midpoint of the R<sub>f</sub>–R<sub>s</sub> divider: v<sub>p</sub> = v<sub>o</sub>R<sub>s</sub>/(R<sub>s</sub>+R<sub>f</sub>).', hint: 'Which node is pin 3 still connected to?' });
  mcq('d1', '#d1Q', { id: 'd1q4', q: 'Why are pins 7 and 4 measured first when troubleshooting?', opts: ['Because it is tradition', 'All other measurements on an op-amp without supply are meaningless; a single measurement eliminates the widest class of faults', 'The other pins cannot be measured', 'Pin 7 has the highest voltage'], correct: 1, explain: 'Power first, then feedback, values last: each measurement eliminates one class of fault.', hint: 'Where does the op-amp get its energy from?' });
  mcq('d1', '#d1Q', { id: 'd1q5', q: 'What is the typical symptom of an electrolytic capacitor fitted backwards?', opts: ['The output voltage doubles', 'The supply goes into current limit (CC), the supply voltage collapses and the capacitor heats up', 'There is no symptom', 'The op-amp turns into a comparator but the supply stays normal'], correct: 1, explain: 'With reverse bias the oxide layer conducts and a large leakage current flows; the capacitor heats up, swells and may explode.', hint: 'Look at the CC lamp on the supply display.' });

  /* ================= GÖREV 2 · TASARIM ================= */
  const E12 = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
  const RV = []; [1e3, 1e4, 1e5].forEach((m) => E12.forEach((v) => RV.push(Math.round(v * m)))); RV.push(1e6);
  const D2 = (() => {
    const self = {};
    function newSen() { S.d2.sen = { S: pick([25, 40, 50, 80, 100]) * 1e-3, Ri: pick([1e3, 2.2e3, 4.7e3, 1e4]), Vcm: 2.5 }; save(); }
    if (!S.d2.sen) newSen();
    if (!S.d2.d) S.d2.d = { R1: 1e4, R2: 1e4, R3: 1e4, R4: 1e4, Rs: 1e4, Rf: 1e4, buf: true };
    const ids = ['R1', 'R2', 'R3', 'R4', 'Rs', 'Rf'];
    ids.forEach((k) => {
      const s = $('#d2' + k); s.innerHTML = RV.map((v) => `<option value="${v}">${ohm(v)}</option>`).join('');
      s.value = String(S.d2.d[k]); s.onchange = () => { S.d2.d[k] = +s.value; save(); };
    });
    $('#d2buf').checked = S.d2.d.buf; $('#d2buf').onchange = (e) => { S.d2.d.buf = e.target.checked; save(); };

    function calc(x, d = S.d2.d) {
      const s = S.d2.sen, vd = s.S * x, va = s.Vcm + vd / 2, vb = s.Vcm - vd / 2, Ri = d.buf ? 0 : s.Ri;
      const vp = (va * d.R4) / (Ri + d.R3 + d.R4), R1e = d.R1 + Ri;
      let v1 = vp * (1 + d.R2 / R1e) - (vb * d.R2) / R1e;
      // fark katı: + girişe va (R3–R4), − girişe vb (R1–R2); çıkış = k (va − vb)
      const sat1 = Math.abs(v1) > VS; v1 = clamp(v1, -VS, VS);
      let vo = (1 + d.Rf / d.Rs) * v1; const sat2 = Math.abs(vo) > VS; vo = clamp(vo, -VS, VS);
      return { vd, v1, vo, sat1, sat2 };
    }
    // --- tezgâh
    const box = $('#d2inst');
    const sn = inst(box, 'SENSOR SIMULATOR', true, 'bridge output');
    const snL = lcd(sn.el, 'v<sub>d</sub> = v<sub>a</sub> − v<sub>b</sub>', 'mV', 130);
    const kx = new Lab.Knob(sn.c, { label: 'Quantity', min: 0, max: 100, step: 1, value: 50, dark: true, fmt: (v) => num(v, 0) + '%' });
    const snInfo = document.createElement('div'); snInfo.style.cssText = 'font-size:11px;line-height:1.5;margin-left:6px'; sn.c.appendChild(snInfo);
    const dm1 = inst(box, 'DMM-1 · difference stage output', false); const dm1L = lcd(dm1.el, 'DC V', 'V', 130);
    const dm2 = inst(box, 'DMM-2 · v<sub>o</sub>', false); const dm2L = lcd(dm2.el, 'DC V', 'V', 130);
    const ps = inst(box, 'SUPPLY', true); const psL = lcd(ps.el, 'ALL STAGES', 'V', 90); psL('±15.0');

    // --- şema
    const g = $('#d2sch');
    function drawSch() {
      g.innerHTML = '';
      const d = S.d2.d, s = S.d2.sen;
      E('rect', { x: 14, y: 70, width: 70, height: 140, rx: 6, fill: '#fff8e6', stroke: '#b26a00' }, g);
      sch.t(g, 49, 64, 'Sensor'); sch.t(g, 49, 146, 'bridge').setAttribute('style', 'font-size:11px;fill:#777');
      sch.t(g, 92, 102, 'a', 'lbl', 'start'); sch.t(g, 92, 192, 'b', 'lbl', 'start');
      sch.t(g, 49, 228, sub('R', 'i') + ohm(s.Ri)).setAttribute('style', 'font-size:11px');
      // tamponlar
      const buf = (x, y) => { sch.opamp(g, x, y - 25, 50, 50); sch.t(g, x + 8, y - 8, '+'); sch.t(g, x + 8, y + 18, '−'); };
      if (d.buf) {
        sch.w(g, [[84, 110], [130, 110]]); buf(130, 110); sch.w(g, [[180, 110], [215, 110]]);
        sch.w(g, [[84, 180], [130, 180]]); buf(130, 180); sch.w(g, [[180, 180], [215, 180]]);
        sch.t(g, 155, 76, 'buffer').setAttribute('style', 'font-size:11px;fill:#777');
      } else {
        sch.w(g, [[84, 110], [215, 110]]); sch.w(g, [[84, 180], [215, 180]]);
        sch.t(g, 150, 146, 'no buffer').setAttribute('style', 'font-size:11px;fill:#c62828');
      }
      // fark katı: a → R3 → p, R4 p→toprak ; b → R1 → n, R2 n→çıkış
      sch.rH(g, 215, 290, 180); sch.t(g, 252, 205, sub('R', '3') + ohm(d.R3)).setAttribute('style', 'font-size:11px');
      sch.rH(g, 215, 290, 110); sch.t(g, 252, 96, sub('R', '1') + ohm(d.R1)).setAttribute('style', 'font-size:11px');
      // a üstte gelir ama + girişe gitmeli: çapraz bağlantı yerine etiket
      sch.t(g, 200, 104, 'b', 'lbl').setAttribute('style', 'font-size:11px;fill:#0b5cad');
      sch.t(g, 200, 174, 'a', 'lbl').setAttribute('style', 'font-size:11px;fill:#0b5cad');
      sch.w(g, [[290, 110], [340, 110]]); sch.w(g, [[290, 180], [340, 180]]); sch.dot(g, 310, 110); sch.dot(g, 310, 180);
      sch.rV(g, 310, 180, 250); sch.gnd(g, 310, 250); sch.t(g, 318, 230, sub('R', '4') + ohm(d.R4), 'lbl', 'start').setAttribute('style', 'font-size:11px');
      sch.opamp(g, 340, 90, 110, 100); sch.t(g, 350, 114, '−'); sch.t(g, 350, 184, '+');
      sch.w(g, [[310, 110], [310, 40], [340, 40]]); sch.rH(g, 340, 420, 40); sch.w(g, [[420, 40], [460, 40], [460, 145]]);
      sch.t(g, 380, 26, sub('R', '2') + ohm(d.R2)).setAttribute('style', 'font-size:11px');
      sch.w(g, [[440, 145], [560, 145]]); sch.dot(g, 460, 145); sch.t(g, 470, 138, sub('v', '1'), 'lbl', 'start');
      // evirmeyen kat
      sch.opamp(g, 560, 95, 100, 100); sch.t(g, 570, 154, '+'); sch.t(g, 570, 119, '−');
      sch.w(g, [[560, 115], [535, 115], [535, 225]]); sch.dot(g, 535, 225); sch.rV(g, 535, 225, 280);
      E('path', { d: 'M535,280 v0', class: 'w' }, g); sch.gnd(g, 535, 280);
      sch.t(g, 525, 262, sub('R', 's') + ohm(d.Rs), 'lbl', 'end').setAttribute('style', 'font-size:11px');
      sch.w(g, [[535, 225], [580, 225]]); sch.rH(g, 580, 680, 225); sch.w(g, [[680, 225], [700, 225], [700, 145]]);
      sch.t(g, 630, 248, sub('R', 'f') + ohm(d.Rf)).setAttribute('style', 'font-size:11px');
      sch.w(g, [[660, 145], [740, 145]]); sch.dot(g, 700, 145); sch.term(g, 740, 145); sch.t(g, 740, 130, sub('v', 'o'));
      // 535,115 → 535,225 dikey hat 145’teki v1 hattını kesmez (v1 hattı 560’ta biter)
      sch.w(g, [[535, 145], [560, 145]]);
    }
    // v1 hattını + girişe bağlamak için düzeltme: 440→560 hattı zaten 145’te + girişe gider (+ işareti 154’te)
    snInfo.innerHTML = '';
    self.updSen = () => { const s = S.d2.sen; snInfo.innerHTML = `Full scale S = <b>${num(s.S * 1e3, 0)} mV</b><br>Common mode 2.5 V<br>R<sub>i</sub> = ${ohm(s.Ri)} (each terminal)`; };
    self.updSen();
    let schKey = '';
    self.update = () => {
      const k = JSON.stringify(S.d2.d) + S.d2.sen.Ri; if (k !== schKey) { schKey = k; drawSch(); }
      const c = calc(kx.value / 100);
      snL(num(c.vd * 1e3, 2)); dm1L(num(c.v1, 3)); dm2L(num(c.vo, 3));
      self.live = c;
    };
    const plot = new Lab.Plot($('#d2plot'), { xlabel: 'measured quantity  (%)', ylabel: 'v_o  (V)' });
    let lastCurve = [];
    function drawPlot() {
      plot.draw([{ pts: [[0, 0], [100, 10]], line: true, color: '#e07a10', dash: [6, 4] }, { pts: [[0, 9.6], [100, 9.6]], line: true, color: '#cfd6e0', width: 1 }, { pts: lastCurve, line: true, color: '#0b5cad', width: 2.5 }], [0, 100], [-2, 14]);
    }
    self.evaluate = () => {
      const d = Object.assign({}, S.d2.d), s = S.d2.sen;
      lastCurve = []; let sat = false;
      for (let x = 0; x <= 1.0001; x += 0.05) { const c = calc(x, d); lastCurve.push([x * 100, c.vo]); if (c.sat1 || c.sat2) sat = true; }
      const v0 = calc(0, d).vo, v1 = calc(1, d).vo, G1 = d.R2 / d.R1, G2 = 1 + d.Rf / d.Rs;
      const why = [];
      if (Math.abs(v0) > 0.15) why.push(`output at 0% is ${num(v0, 3)} V (must be ≤ 0.15 V) — ${Math.abs(d.R2 / d.R1 - d.R4 / d.R3) > 1e-9 ? 'R<sub>2</sub>/R<sub>1</sub> ≠ R<sub>4</sub>/R<sub>3</sub>: common mode leaks through' : (d.buf ? 'common-mode leakage' : 'the internal resistance loads the branches unequally')}`);
      if (Math.abs(v1 - 10) > 0.4) why.push(`output at 100% is ${num(v1, 3)} V (must be 9.6–10.4 V)`);
      if (sat) why.push('at least one stage saturates');
      if (G1 > 100 || G2 > 100) why.push(`stage gain exceeds 100 (difference stage ${num(G1, 1)}, non-inverting ${num(G2, 1)}) — with GBW = 1 MHz the bandwidth drops below 10 kHz`);
      const pass = !why.length;
      S.d2.rows.push({ S: s.S, Ri: s.Ri, buf: d.buf, R1: d.R1, R2: d.R2, R3: d.R3, R4: d.R4, Rs: d.Rs, Rf: d.Rf, v0, v1, pass });
      save(); table(); drawPlot();
      $('#d2verdict').innerHTML = pass
        ? `<b style="color:#1a8a4a">✔ ACCEPTABLE.</b> v<sub>o</sub>(0%) = ${num(v0, 3)} V, v<sub>o</sub>(100%) = ${num(v1, 3)} V (error ${num(Math.abs(v1 - 10) * 10, 1)}%). Stage gains: ${num(G1, 2)} × ${num(G2, 2)}.`
        : `<b style="color:#c62828">✘ NOT ACCEPTABLE.</b><br>• ${why.join('<br>• ')}`;
      Lab.toast(pass ? '✔ The design meets the target.' : '✘ The design does not meet the target.');
    };
    $('#d2eval').onclick = self.evaluate;
    $('#d2new').onclick = () => { if (!confirm('Select a new sensor? (The records in the table are kept.)')) return; newSen(); self.updSen(); schKey = ''; Lab.toast('New sensor: S = ' + num(S.d2.sen.S * 1e3, 0) + ' mV, R_i = ' + ohm(S.d2.sen.Ri)); };
    const tbody = $('#d2tab tbody');
    function table() {
      tbody.innerHTML = S.d2.rows.map((r, i) => `<tr><td>${i + 1}</td><td>${num(r.S * 1e3, 0)}</td><td>${ohm(r.Ri)}</td><td>${r.buf ? 'yes' : 'no'}</td><td>${ohm(r.R1)}/${ohm(r.R2)}</td><td>${ohm(r.R3)}/${ohm(r.R4)}</td><td>${ohm(r.Rs)}/${ohm(r.Rf)}</td><td>${num(r.v0, 3)}</td><td>${num(r.v1, 3)}</td><td>${r.pass ? '✔' : '✘'}</td></tr>`).join('');
      tbody.parentElement.parentElement.scrollTop = 1e6;
    }
    $('#d2csv').onclick = () => Lab.downloadCSV('hafta8_gorev2.csv', ['#', 'S (mV)', 'Ri', 'buffer', 'R1', 'R2', 'R3', 'R4', 'Rs', 'Rf', 'vo(0)', 'vo(100)', 'result'], S.d2.rows.map((r, i) => [i + 1, r.S * 1e3, r.Ri, r.buf ? 'yes' : 'no', r.R1, r.R2, r.R3, r.R4, r.Rs, r.Rf, +r.v0.toFixed(4), +r.v1.toFixed(4), r.pass ? 'pass' : 'fail']));
    table(); drawPlot();
    self.plotCanvas = $('#d2plot'); self.kx = kx;
    return self;
  })();

  const sameR = (a, b) => ['R1', 'R2', 'R3', 'R4', 'Rs', 'Rf'].every((k) => a[k] === b[k]);
  steps('d2', [
    { t: 'Calculate the <b>total gain</b> needed for your sensor and answer the first question.', test: () => S.answers.d2q1 && S.answers.d2q1.ok },
    { t: 'Split the gain into two stages (each ≤ 100). With the buffers fitted, find a design that gives an <b>ACCEPTABLE</b> result.', test: () => S.d2.rows.some((r) => r.pass && r.buf) },
    { t: 'Evaluate the same acceptable design <b>with the buffers removed</b>. How did the 0% and 100% outputs change?', test: () => S.d2.rows.some((r) => !r.buf && S.d2.rows.some((q) => q.pass && q.buf && q.S === r.S && q.Ri === r.Ri && sameR(q, r))) },
    { t: 'With the buffers fitted, set the quantity knob to <b>100%</b> and see about 10 V on DMM-2.', test: () => S.d2.d.buf && D2.live && D2.kx.value === 100 && Math.abs(D2.live.vo - 10) < 0.4 },
    { t: 'Find a <b>second</b> acceptable design <b>with different resistors</b> (at least 2 acceptable designs).', test: () => { const p = S.d2.rows.filter((r) => r.pass); return p.some((a) => p.some((b) => !sameR(a, b))); } },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'What total gain is needed to bring the full-scale output (S) of your sensor to 10 V? (Read the S value from the sensor simulator.)', answer: () => 10 / S.d2.sen.S, tol: 1, unit: '', explain: 'G = 10 V / S. E.g. S = 50 mV → 200 = 10 × 20.', hint: 'G = (target full scale) / (sensor full scale); make the units match.' });
  mcq('d2', '#d2Q', { id: 'd2q2', q: 'If R<sub>2</sub>/R<sub>1</sub> ≠ R<sub>4</sub>/R<sub>3</sub> is chosen in the difference stage, why is the output not zero at 0% (v<sub>d</sub> = 0)?', opts: ['The sensor is faulty', 'The 2.5 V common-mode voltage at both terminals does not cancel completely; it is multiplied by the gain and reaches the output', 'The op-amp saturates', 'The non-inverting stage produces an offset'], correct: 1, explain: 'Common-mode rejection depends on the equality of the ratios of the two branches. A small imbalance × a large gain = a large error.', hint: 'Calculate v<sub>1</sub> with v<sub>a</sub> = v<sub>b</sub> = 2.5 V.' });
  mcq('d2', '#d2Q', { id: 'd2q3', q: 'What is the main reason the design fails when the buffers are removed?', opts: ['The buffer was providing gain', 'The sensor’s internal resistance is added in series with R<sub>1</sub> and R<sub>3</sub>; the branch ratios and the gain change (loading effect)', 'The supply is insufficient', 'Without a buffer the op-amp becomes a comparator'], correct: 1, explain: 'A buffer has a very large input resistance and a very small output resistance: it does not load the source.', hint: 'Is the input resistance of the difference stage infinite?' });
  mcq('d2', '#d2Q', { id: 'd2q4', q: 'With a total gain of 250, why are two stages (e.g. 10 × 25) preferred to a single stage?', opts: ['Fewer resistors are used', 'Since GBW is constant, a single stage with gain 250 drops the bandwidth to ≈ 4 kHz; with two stages each stage gives ≥ 40 kHz bandwidth', 'Saturation is eliminated', 'A gain of 250 cannot be obtained with a single stage'], correct: 1, explain: 'The idea of Example 1.10: gain × bandwidth = GBW; in cascaded stages each stage carries its own bandwidth.', hint: 'f<sub>3dB</sub> = GBW / A<sub>v</sub>' });
  numq('d2', '#d2Q', { id: 'd2q5', q: 'In a buffered design the difference stage has R<sub>1</sub> = R<sub>3</sub> = 10 kΩ, R<sub>2</sub> = R<sub>4</sub> = 100 kΩ, and the non-inverting stage R<sub>s</sub> = 1 kΩ, R<sub>f</sub> = 18 kΩ. If the sensor full scale is 50 mV, what is v<sub>o</sub> at 100% in volts?', answer: 9.5, tol: 1, unit: 'V', explain: '10 × 19 × 50 mV = 9.5 V. (Not R<sub>f</sub>/R<sub>s</sub> but 1 + R<sub>f</sub>/R<sub>s</sub> = 19!)', hint: '(R<sub>2</sub>/R<sub>1</sub>)(1 + R<sub>f</sub>/R<sub>s</sub>) S' });

  /* ================= GÖREV 3 · DALGA BİÇİMİ TANIMA ================= */
  const ELS = [['R', 'Resistor (R)'], ['L', 'Inductor (L)'], ['C', 'Capacitor (C)'], ['INT', 'Op-amp integrator'], ['DIFF', 'Op-amp differentiator']];
  const EQS = ['v = R i', 'v = L di/dt', 'i = L dv/dt', 'i = C dv/dt', 'v = C di/dt', 'v<sub>o</sub> = −(1/RC) ∫ v<sub>g</sub> dt', 'v<sub>o</sub> = −RC dv<sub>g</sub>/dt'];
  const EQOF = { R: 0, L: 1, C: 3, INT: 5, DIFF: 6 };
  const tri = (t, f) => (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * f * t));
  const sq = (x) => (x >= 0 ? 1 : -1);
  const D3 = (() => {
    const self = { dirty: true };
    function gen() {
      const kind = pick(['Ltri', 'Ctri', 'Lsin', 'Csin', 'Rsin', 'INT', 'INT', 'DIFF']);
      const sc = { kind, n: S.d3.hist.length + 1, done: false };
      if (kind === 'Ltri') { const L = pick([10, 22, 47, 100]) * 1e-3; Object.assign(sc, { el: 'L', L, Ip: rnd(2, 10, 1) * 1e-3, f: pick([1000, 2000, 5000]), r: +(pick([0.5, 1, 1.5]) * L * 100).toFixed(1) }); }
      if (kind === 'Ctri') { Object.assign(sc, { el: 'C', C: pick([0.1, 0.22, 0.47, 1]) * 1e-6, Vp: rnd(1, 5, 1), f: pick([200, 500, 1000]) }); }
      if (kind === 'Lsin') { const L = pick([10, 22, 47, 100]) * 1e-3; Object.assign(sc, { el: 'L', L, Ip: rnd(2, 10, 1) * 1e-3, f: pick([1000, 2000, 5000]), r: +(pick([0.5, 1, 1.5]) * L * 100).toFixed(1) }); }
      if (kind === 'Csin') { Object.assign(sc, { el: 'C', C: pick([0.1, 0.22, 0.47, 1]) * 1e-6, Vp: rnd(1, 5, 1), f: pick([200, 500, 1000]) }); }
      if (kind === 'Rsin') { Object.assign(sc, { el: 'R', R: pick([100, 220, 470, 1000]), Ip: rnd(2, 10, 1) * 1e-3, f: pick([200, 500, 1000, 2000]) }); }
      if (kind === 'INT') { let p; do { Object.assign(sc, { el: 'INT', Vm: pick([1, 2, 5]), f: pick([100, 200, 500, 1000]), RC: pick([1e4, 2.2e4, 4.7e4]) * pick([0.01, 0.022, 0.047, 0.1]) * 1e-6 }); p = sc.Vm / (2 * sc.f * sc.RC); } while (p < 1 || p > 20); }
      if (kind === 'DIFF') { let a; do { Object.assign(sc, { el: 'DIFF', Vp: pick([1, 2]), f: pick([100, 200, 500]), RC: pick([1e4, 2.2e4, 4.7e4]) * pick([0.01, 0.022, 0.047, 0.1]) * 1e-6 }); a = sc.RC * 4 * sc.Vp * sc.f; } while (a < 0.5 || a > 12); }
      S.d3.sc = sc; save(); setupUI(); autoScale(); self.dirty = true;
    }
    // sinyal fonksiyonları: [ch1(t), ch2(t)]
    function sig(sc, t) {
      const w = 2 * Math.PI * sc.f, Rsh = 100;
      switch (sc.kind) {
        case 'Ltri': { const i = sc.Ip * tri(t, sc.f), di = sc.Ip * 4 * sc.f * sq(Math.cos(w * t)); return [sc.L * di + sc.r * i, Rsh * i]; }
        case 'Ctri': { const v = sc.Vp * tri(t, sc.f), i = sc.C * sc.Vp * 4 * sc.f * sq(Math.cos(w * t)); return [v, Rsh * i]; }
        case 'Lsin': { const i = sc.Ip * Math.sin(w * t); return [sc.r * i + w * sc.L * sc.Ip * Math.cos(w * t), Rsh * i]; }
        case 'Csin': { const v = sc.Vp * Math.sin(w * t); return [v, Rsh * w * sc.C * sc.Vp * Math.cos(w * t)]; }
        case 'Rsin': { const i = sc.Ip * Math.sin(w * t); return [sc.R * i, Rsh * i]; }
        case 'INT': { const T = 1 / sc.f, ph = ((t % T) + T) % T, gI = ph < T / 2 ? ph : T - ph; return [sc.Vm * sq(Math.sin(w * t)), -(sc.Vm / sc.RC) * (gI - T / 4)]; }
        case 'DIFF': { return [sc.Vp * tri(t, sc.f), -sc.RC * sc.Vp * 4 * sc.f * sq(Math.cos(w * t))]; }
      }
      return [0, 0];
    }
    function answer(sc) {
      if (sc.el === 'R') return { v: sc.R, unit: 'Ω', ask: 'Resistance R =' };
      if (sc.el === 'L') return { v: sc.L * 1e3, unit: 'mH', ask: 'Inductance L =' };
      if (sc.el === 'C') return { v: sc.C * 1e6, unit: 'µF', ask: 'Capacitance C =' };
      return { v: sc.RC * 1e3, unit: 'ms', ask: 'Time constant RC =' };
    }
    // --- osiloskop
    const VL = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10];
    const TL = [1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3];
    const scope = new Lab.Scope($('#scope'), { onMeasure: (m) => meas(m) });
    const kc = $('#scopeKnobs');
    const k1 = new Lab.Knob(kc, { label: 'CH1 V/div', list: VL, value: 1, dark: true, size: 46, fmt: (v) => eng(v, 'V'), onChange: (v) => { scope.ch[0].vdiv = v; self.dirty = true; } });
    const k2 = new Lab.Knob(kc, { label: 'CH2 V/div', list: VL, value: 1, dark: true, size: 46, fmt: (v) => eng(v, 'V'), onChange: (v) => { scope.ch[1].vdiv = v; self.dirty = true; } });
    const kt = new Lab.Knob(kc, { label: 'TIME/div', list: TL, value: 2e-4, dark: true, size: 46, fmt: (v) => eng(v, 's'), onChange: (v) => { scope.tdiv = v; self.dirty = true; } });
    const kp1 = new Lab.Knob(kc, { label: 'CH1 position', min: -4, max: 4, step: 0.1, value: 0, dark: true, size: 40, fmt: (v) => num(v, 1), onChange: (v) => { scope.ch[0].pos = v; self.dirty = true; } });
    const kp2 = new Lab.Knob(kc, { label: 'CH2 position', min: -4, max: 4, step: 0.1, value: 0, dark: true, size: 40, fmt: (v) => num(v, 1), onChange: (v) => { scope.ch[1].pos = v; self.dirty = true; } });
    const bestV = (a) => VL.find((v) => a / v <= 3.2) || 10;
    function autoScale() {
      const sc = S.d3.sc, T = 1 / sc.f; let m1 = 0, m2 = 0;
      for (let i = 0; i < 400; i++) { const y = sig(sc, (i / 400) * T); m1 = Math.max(m1, Math.abs(y[0])); m2 = Math.max(m2, Math.abs(y[1])); }
      k1.set(bestV(m1)); k2.set(bestV(m2)); kt.set(TL.find((t) => t * 10 >= 2 * T) || 5e-3);
    }
    $('#ch1on').onclick = (e) => { scope.ch[0].on = !scope.ch[0].on; e.target.classList.toggle('on', scope.ch[0].on); self.dirty = true; };
    $('#ch2on').onclick = (e) => { scope.ch[1].on = !scope.ch[1].on; e.target.classList.toggle('on', scope.ch[1].on); self.dirty = true; };
    $('#curon').onclick = (e) => { scope.cur.on = !scope.cur.on; e.target.classList.toggle('on', scope.cur.on); if (scope.cur.on) { S.d3.curUsed = true; save(); } self.dirty = true; };
    $('#scope').addEventListener('pointermove', () => { if (scope.cur.drag) self.dirty = true; });
    function meas(m) {
      if (!m) return;
      const f = (x) => (isFinite(x) ? eng(x, 'Hz') : '—');
      let h = `CH1 Vpp ${eng(m.ch[0].vpp, 'V')}<br>CH1 f ${f(m.ch[0].f)}<br>CH2 Vpp ${eng(m.ch[1].vpp, 'V')}<br>CH2 f ${f(m.ch[1].f)}`;
      if (m.cur) h += `<br><span style="color:#ff7cf0">Δt ${eng(m.cur.dt, 's')}<br>CH1 a/b ${num(m.cur.v1a, 3)} / ${num(m.cur.v1b, 3)}<br>CH2 a/b ${num(m.cur.v2a, 3)} / ${num(m.cur.v2b, 3)}</span>`;
      $('#scopeMeas').innerHTML = h;
    }
    const noise = new Float64Array(1200).map(() => gauss());
    self.update = () => {
      if (!self.dirty) return; self.dirty = false;
      const sc = S.d3.sc, n = 1200, y1 = new Float64Array(n), y2 = new Float64Array(n), Tw = 10 * scope.tdiv;
      for (let i = 0; i < n; i++) { const y = sig(sc, (i / (n - 1)) * Tw); y1[i] = y[0] + 0.004 * scope.ch[0].vdiv * noise[i]; y2[i] = y[1] + 0.004 * scope.ch[1].vdiv * noise[(i * 7) % n]; }
      scope.draw({ n, y: [y1, y2] });
    };
    // --- kara kutu şeması
    function drawSch() {
      const g = $('#d3sch'); g.innerHTML = ''; const sc = S.d3.sc, opa = sc.el === 'INT' || sc.el === 'DIFF';
      if (!opa) {
        sch.src(g, 80, 100, 22, 'ac'); sch.t(g, 80, 146, 'generator').setAttribute('style', 'font-size:11px;fill:#777');
        sch.w(g, [[80, 78], [80, 40], [360, 40], [360, 60]]); E('rect', { x: 330, y: 60, width: 60, height: 80, rx: 6, fill: '#fff4e2', stroke: '#b26a00', 'stroke-width': 2 }, g);
        sch.t(g, 360, 108, '?', 'val').setAttribute('style', 'font-size:30px;font-weight:700;fill:#b26a00');
        sch.w(g, [[360, 140], [360, 160]]); sch.rV(g, 360, 160, 190); sch.t(g, 372, 180, 'R<tspan font-size="10" dy="3">sh</tspan><tspan dy="-3"> 100 Ω</tspan>', 'lbl', 'start');
        sch.w(g, [[80, 122], [80, 190], [360, 190]]); sch.dot(g, 360, 160);
        sch.t(g, 470, 70, 'CH1 → both terminals of the box: v(t)', 'lbl', 'start').setAttribute('style', 'fill:#b89a00;font-size:12px;font-weight:700');
        sch.t(g, 470, 170, 'CH2 → shunt: 100·i(t)', 'lbl', 'start').setAttribute('style', 'fill:#1596c0;font-size:12px;font-weight:700');
        E('path', { d: 'M460,66 L395,66 M460,166 L370,160', stroke: '#999', 'stroke-dasharray': '4 3' }, g);
      } else {
        sch.src(g, 70, 110, 20, 'ac'); sch.w(g, [[70, 90], [70, 70], [150, 70]]); sch.w(g, [[70, 130], [70, 160]]); sch.gnd(g, 70, 160);
        E('rect', { x: 150, y: 30, width: 260, height: 130, rx: 8, fill: '#fff4e2', stroke: '#b26a00', 'stroke-width': 2 }, g);
        sch.t(g, 280, 90, 'op-amp + R + C', 'val').setAttribute('style', 'font-size:15px;fill:#b26a00');
        sch.t(g, 280, 112, 'connection hidden', 'lbl').setAttribute('style', 'font-size:12px;fill:#b26a00');
        sch.w(g, [[410, 95], [480, 95]]); sch.term(g, 480, 95);
        sch.t(g, 520, 70, 'CH1 → input v_g', 'lbl', 'start').setAttribute('style', 'fill:#b89a00;font-size:12px;font-weight:700');
        sch.t(g, 520, 120, 'CH2 → output v_o', 'lbl', 'start').setAttribute('style', 'fill:#1596c0;font-size:12px;font-weight:700');
      }
    }
    function setupUI() {
      const sc = S.d3.sc, a = answer(sc);
      $('#d3el').innerHTML = ELS.map(([k, t]) => `<label style="display:block;font-size:14px"><input type="radio" name="d3el" value="${k}"> ${t}</label>`).join('');
      $('#d3eq').innerHTML = EQS.map((t, i) => `<label style="display:block;font-size:14px"><input type="radio" name="d3eq" value="${i}"> ${t}</label>`).join('');
      $('#d3ask').textContent = 'Value: (the quantity asked appears once you select the element)';
      $('#d3unit').textContent = '';
      $('#d3val').value = '';
      $$('input[name=d3el]').forEach((r) => (r.onchange = () => { const b = answer({ el: r.value, R: 0, L: 0, C: 0, RC: 0 }); $('#d3ask').textContent = b.ask; $('#d3unit').textContent = b.unit; }));
      $('#d3no').textContent = 'Screen #' + sc.n;
      $('#d3fb').innerHTML = sc.done ? 'This screen has been answered. Continue with “New screen”.' : 'Examine the screen; measure slope and time with the cursors.';
      drawSch(); score(); void a;
    }
    function score() {
      const h = S.d3.hist; $('#d3score').textContent = `Fully correct: ${h.filter((x) => x.okEl && x.okEq && x.okVal).length}/${h.length}`;
    }
    $('#d3go').onclick = () => {
      const sc = S.d3.sc; if (sc.done) return Lab.toast('This screen has been answered. Continue with “New screen”.');
      const re = $('input[name=d3el]:checked'), rq = $('input[name=d3eq]:checked'), v = Lab.parse($('#d3val').value);
      if (!re || !rq) return Lab.toast('Select the element and the equation.');
      if (!isFinite(v)) return Lab.toast('Enter the value as a number.');
      const a = answer(sc), okEl = re.value === sc.el, okEq = +rq.value === EQOF[sc.el], okVal = okEl && Math.abs(v - a.v) <= 0.06 * a.v;
      sc.done = true; S.d3.hist.push({ n: sc.n, kind: sc.kind, el: sc.el, gEl: re.value, okEl, okEq, okVal, v, ref: a.v, unit: a.unit });
      const nm = ELS.find((x) => x[0] === sc.el)[1];
      const why = {
        Ltri: 'Current is a triangle, voltage a (slightly tilted) square: v = L di/dt. L = V<sub>square</sub> / (4 I<sub>p</sub> f); the tilt comes from the internal resistance of the inductor.',
        Ctri: 'Voltage is a triangle, current a square: i = C dv/dt. C = I<sub>square</sub> / (4 V<sub>p</sub> f).',
        Lsin: 'The voltage leads the current by 90° (inductor). L = V<sub>m</sub> / (ω I<sub>m</sub>).',
        Csin: 'The current leads the voltage by 90° (capacitor). C = I<sub>m</sub> / (ω V<sub>m</sub>).',
        Rsin: 'Current and voltage are in phase: R = V<sub>m</sub>/I<sub>m</sub>.',
        INT: 'Square input → triangular output, the output decreases while the input is positive: integrator. RC = V<sub>m</sub>(T/2) / ΔV<sub>o,pp</sub>.',
        DIFF: 'Triangular input → square output, the output is negative while the slope is positive: differentiator. RC = |V<sub>o</sub>| / (4 V<sub>p</sub> f).',
      }[sc.kind];
      $('#d3fb').innerHTML = `${okEl ? '✔' : '✘'} Element · ${okEq ? '✔' : '✘'} Equation · ${okVal ? '✔' : '✘'} Value<br>Correct answer: <b>${nm}</b>, ${EQS[EQOF[sc.el]]}, ${a.ask} <b>${num(a.v, a.v < 1 ? 3 : a.v < 100 ? 2 : 0)} ${a.unit}</b>. ${why}`;
      save(); score(); progress();
    };
    $('#d3next').onclick = () => gen();
    if (!S.d3.sc) gen(); else { setupUI(); autoScale(); }
    self.scope = scope;
    return self;
  })();

  const d3full = () => S.d3.hist.filter((h) => h.okEl && h.okEq).length;
  steps('d3', [
    { t: 'Turn on the <b>CURSOR</b> and measure a half-period (Δt); adjust the scales with the knobs.', test: () => S.d3.curUsed },
    { t: 'Recognise the element and the equation correctly on <b>3 screens</b>.', test: () => d3full() >= 3 },
    { t: 'On at least <b>2 screens</b> also calculate the value correctly (±6%).', test: () => S.d3.hist.filter((h) => h.okVal).length >= 2 },
    { t: 'Correctly recognise an <b>integrator</b> screen (warm-up: the topic of the next section).', test: () => S.d3.hist.some((h) => h.el === 'INT' && h.okEl && h.okEq) },
    { t: 'Solve at least <b>8 screens</b> in total, with element+equation correct on at least 6 of the last 8.', test: () => { const h = S.d3.hist.slice(-8); return h.length >= 8 && h.filter((x) => x.okEl && x.okEq).length >= 6; } },
  ]);
  mcq('d3', '#d3Q', { id: 'd3q1', q: 'In sinusoidal steady state, what is the phase relation between current and voltage in a capacitor?', opts: ['In phase', 'The current leads the voltage by 90°', 'The current lags the voltage by 90°', '180° opposite'], correct: 1, explain: 'i = C dv/dt: the derivative of a sine is a cosine, a quarter period ahead (Example 2.10).', hint: 'What is the derivative of sin?' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'The screen shows a triangular current (peak 5 mA, f = 1 kHz) and a ±0.94 V square voltage. What is L in mH?', answer: 47, tol: 2, unit: 'mH', explain: 'di/dt = 4 I<sub>p</sub> f = 20 A/s → L = 0.94 / 20 = 47 mH.', hint: 'Slope of the triangle: a change of 2I<sub>p</sub> in half a period.' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'Integrator: R = 10 kΩ, C = 0.1 µF, 1 V DC applied to the input at t = 0, v<sub>o</sub>(0) = 0. What is v<sub>o</sub> in volts at t = 2 ms?', answer: -2, tol: 1, unit: 'V', explain: 'v<sub>o</sub> = −(1/RC)·V·t = −(1/1 ms)(1 V)(2 ms) = −2 V. The ramp goes negative.', hint: 'RC = 1 ms; inverting structure.' });
  mcq('d3', '#d3Q', { id: 'd3q4', q: 'Which quantity cannot change instantaneously in an inductor?', opts: ['Voltage', 'Current', 'Both', 'Neither'], correct: 1, explain: 'If the current changed instantaneously, di/dt → ∞ and v → ∞. That is why suddenly interrupting an inductor current creates a spark.', hint: 'v = L di/dt' });
  mcq('d3', '#d3Q', { id: 'd3q5', q: 'Which element is in the feedback path of an op-amp integrator?', opts: ['Resistor', 'Capacitor', 'Inductor', 'Diode'], correct: 1, explain: 'R at the input, C in the feedback: i = v<sub>g</sub>/R charges the capacitor, v<sub>o</sub> = −(1/RC)∫v<sub>g</sub>dt.', hint: 'Which element accumulates the current?' });

  /* ================= GÖREV 4 · SÜRELİ DENEME SINAVI ================= */
  const EXDUR = 40 * 60;
  const kO = (r) => ohm(r);
  const GENS = [
    () => { const A = pick([5e4, 1e5, 2e5]), V = pick([12, 15]), d = pick([20, 50, 60, 80, -40, -200, 300, 1000]); return { q: `A = ${num(A / 1e3, 0)}×10³, supply ±${V} V, v<sub>p</sub> − v<sub>n</sub> = ${d} µV. What is v<sub>o</sub> in V?`, a: clamp(A * d * 1e-6, -V, V), u: 'V' }; },
    () => { const A = pick([5e4, 1e5, 2e5]), V = pick([10, 12, 15]); return { q: `A = ${num(A / 1e3, 0)}×10³, supply ±${V} V. What is the limit of the linear region |v<sub>p</sub> − v<sub>n</sub>| in µV?`, a: (V / A) * 1e6, u: 'µV' }; },
    () => { const Rs = pick([1e3, 2e3, 4.7e3, 1e4]), Rf = pick([1e4, 2.2e4, 4.7e4, 1e5]), vg = rnd(-1.5, 1.5, 2) || 0.5; return { q: `Inverting amplifier: R<sub>s</sub> = ${kO(Rs)}, R<sub>f</sub> = ${kO(Rf)}, v<sub>g</sub> = ${num(vg, 2)} V, ±15 V. What is v<sub>o</sub> in V?`, a: clamp((-Rf / Rs) * vg, -15, 15), u: 'V' }; },
    () => { const Rs = pick([1e3, 2.2e3, 4.7e3, 1e4]), Rf = pick([1e4, 2.2e4, 3.3e4, 4.7e4]), vg = rnd(0.1, 1.2, 2); return { q: `Non-inverting amplifier: R<sub>s</sub> = ${kO(Rs)}, R<sub>f</sub> = ${kO(Rf)}, v<sub>g</sub> = ${num(vg, 2)} V, ±15 V. What is v<sub>o</sub> in V?`, a: clamp((1 + Rf / Rs) * vg, -15, 15), u: 'V' }; },
    () => { const Rf = pick([2e4, 4.7e4, 1e5]), Ra = pick([1e4, 2e4]), Rb = pick([1e4, 4.7e4, 5e4]), va = rnd(-1, 1, 1) || 0.3, vb = rnd(-1, 1, 1) || -0.4; return { q: `Summing amplifier: R<sub>f</sub> = ${kO(Rf)}, R<sub>a</sub> = ${kO(Ra)}, R<sub>b</sub> = ${kO(Rb)}, v<sub>a</sub> = ${num(va, 1)} V, v<sub>b</sub> = ${num(vb, 1)} V, ±15 V. What is v<sub>o</sub> in V?`, a: clamp(-Rf * (va / Ra + vb / Rb), -15, 15), u: 'V', abs: 0.02 }; },
    () => { const R1 = pick([1e3, 5e3, 1e4]), k = pick([2, 5, 10, 20]), va = rnd(0.5, 2, 2), vb = +(va + rnd(-0.4, 0.4, 2)).toFixed(2); return { q: `Difference amplifier, R<sub>1</sub> = R<sub>3</sub> = ${kO(R1)}, R<sub>2</sub> = R<sub>4</sub> = ${kO(k * R1)}; v<sub>a</sub> = ${num(va, 2)} V (inverting side), v<sub>b</sub> = ${num(vb, 2)} V. What is v<sub>o</sub> in V?`, a: clamp(k * (vb - va), -15, 15), u: 'V', abs: 0.02 }; },
    () => { const Rs = pick([1e3, 2e3, 5e3]), Rf = pick([2e4, 5e4, 1e5]), V = pick([12, 15]); return { q: `Inverting amplifier, R<sub>s</sub> = ${kO(Rs)}, R<sub>f</sub> = ${kO(Rf)}, ±${V} V. What is the largest |v<sub>g</sub>| in V that can be applied without saturation?`, a: (V * Rs) / Rf, u: 'V' }; },
    () => { const G = pick([1, 2]) * 1e6, A = pick([10, 20, 50, 100, 200]); return { q: `With an op-amp of GBW = ${num(G / 1e6, 0)} MHz, what is the bandwidth in kHz of a stage with gain ${A}?`, a: G / A / 1e3, u: 'kHz' }; },
    () => { const SR = pick([0.5, 1, 13]), Vm = pick([2, 5, 10]); return { q: `SR = ${num(SR, 1)} V/µs, output peak value V<sub>m</sub> = ${Vm} V. What is the highest frequency in kHz for an undistorted sine?`, a: (SR * 1e6) / (2 * Math.PI * Vm) / 1e3, u: 'kHz' }; },
    () => { const Rs = 1e4, Rf = pick([2e4, 5e4, 1e5]), RL = pick([1e3, 2e3, 5e3]), vg = pick([-1, -0.5, 0.5, 1]); const vo = (-Rf / Rs) * vg; return { q: `Similar to Example 1.11: R<sub>s</sub> = 10 kΩ, R<sub>f</sub> = ${kO(Rf)}, R<sub>L</sub> = ${kO(RL)}, v<sub>g</sub> = ${num(vg, 1)} V (ideal). What is the magnitude of the op-amp output terminal current |i<sub>o</sub>| in mA?`, a: (Math.abs(vo) / RL + Math.abs(vo) / Rf) * 1e3, u: 'mA' }; },
    () => { const L = pick([50, 100, 200, 500]), I = pick([1, 2, 3, 5]), t = pick([2, 4, 5, 10]); return { q: `The current of an L = ${L} mH inductor rises linearly within ${t} ms from 0 to ${I} A. What is the inductor voltage in V?`, a: (L * 1e-3 * I) / (t * 1e-3), u: 'V' }; },
    () => { const L = pick([20, 50, 100, 200]), I = rnd(0.5, 4, 1); return { q: `An L = ${L} mH inductor carries a current of ${num(I, 1)} A. What is the stored energy in mJ?`, a: 0.5 * L * I * I, u: 'mJ' }; },
    () => { const C = pick([1, 2, 4.7, 10]), V = pick([5, 6, 10, 12]), t = pick([1, 2, 3, 5]); return { q: `The voltage of a C = ${num(C, 1)} µF capacitor rises linearly within ${t} ms from 0 to ${V} V. What is the current in mA?`, a: (C * V) / t, u: 'mA' }; },
    () => { const C = pick([100, 220, 330, 470]), V = pick([9, 12, 18, 24]); return { q: `A C = ${C} µF capacitor is charged to ${V} V. What is the stored energy in mJ?`, a: 0.5 * C * 1e-6 * V * V * 1e3, u: 'mJ' }; },
    () => { const a = pick([2, 3, 4, 6]), b = pick([3, 6, 12]), c = pick([4, 12]); return { q: `${a} µF, ${b} µF and ${c} µF capacitors are connected in <b>series</b>. What is the equivalent capacitance in µF?`, a: 1 / (1 / a + 1 / b + 1 / c), u: 'µF' }; },
    () => { const a = pick([10, 20, 30, 60]), b = pick([15, 30, 60]), c = pick([20, 40]); return { q: `${a} mH, ${b} mH and ${c} mH inductors are connected in <b>parallel</b> (no coupling). What is the equivalent inductance in mH?`, a: 1 / (1 / a + 1 / b + 1 / c), u: 'mH' }; },
    () => { const I = pick([1, 2, 5]), C = pick([1, 2, 10]), t = pick([2, 5, 10]); return { q: `An initially uncharged C = ${C} µF capacitor is charged with a constant current of ${I} mA for ${t} ms. What is the final voltage in V?`, a: (I * 1e-3 * t * 1e-3) / (C * 1e-6), u: 'V' }; },
    () => { const L = pick([0.05, 0.1, 0.2]), Im = pick([1, 2, 3]), w = pick([100, 500, 1000]); return { q: `The current of an L = ${num(L, 2)} H inductor is i(t) = ${Im} sin(${w}t) A. What is the peak value of the voltage in V?`, a: w * L * Im, u: 'V' }; },
    () => { const L1 = pick([4, 9, 16, 25]), L2 = pick([4, 9, 16, 36]), k = pick([0.25, 0.5, 0.8, 0.9]); return { q: `L<sub>1</sub> = ${L1} mH, L<sub>2</sub> = ${L2} mH, coupling coefficient k = ${num(k, 2)}. What is the mutual inductance M in mH?`, a: k * Math.sqrt(L1 * L2), u: 'mH' }; },
    () => { const R = pick([1e4, 2e4, 1e5]), C = pick([0.1, 0.47, 1]), V = pick([0.5, 1, 2]), t = pick([1, 2, 5]); const RC = R * C * 1e-6; return { q: `Integrator: R = ${kO(R)}, C = ${num(C, 2)} µF, v<sub>o</sub>(0) = 0, ${num(V, 1)} V DC applied to the input. What is v<sub>o</sub> in V at t = ${t} ms? (±15 V)`, a: clamp((-V * t * 1e-3) / RC, -15, 15), u: 'V', abs: 0.01 }; },
  ];
  const D4 = (() => {
    const self = {};
    const box = $('#exBox');
    function render() {
      const ex = S.exam;
      if (!ex) { box.innerHTML = '<p class="lead" style="margin:0">No exam has been started yet.</p>'; return; }
      box.innerHTML = `<h3 style="margin-top:0">Attempt #${ex.no} ${ex.done ? `· <span class="badge ${ex.score >= 60 ? 'ok' : 'bad'}">Score ${ex.score}/100</span>` : ''}</h3>` +
        ex.qs.map((q, i) => {
          const r = ex.res ? ex.res[i] : null;
          return `<div class="exq ${r == null ? '' : r ? 'ok' : 'bad'}"><b>${i + 1})</b> ${q.q}<div class="row" style="margin-top:4px"><input type="text" size="10" data-i="${i}" value="${(ex.resp[i] || '').replace(/"/g, '')}" ${ex.done ? 'disabled' : ''}> <span>${q.u}</span>${ex.done ? ` <span style="font-size:13px">${r ? '✔' : '✘ correct: ' + num(q.a, Math.abs(q.a) >= 100 ? 1 : 3)}</span>` : ''}</div></div>`;
        }).join('');
      $$('#exBox input').forEach((inp) => inp.addEventListener('input', () => { ex.resp[+inp.dataset.i] = inp.value; save(); }));
    }
    function hist() {
      $('#exHist tbody').innerHTML = S.exams.map((h, i) => `<tr><td>${i + 1}</td><td class="l">${h.date}</td><td>${h.score}</td><td>${Math.floor(h.used / 60)}:${String(h.used % 60).padStart(2, '0')}</td></tr>`).join('') || '<tr><td colspan="4" class="l">—</td></tr>';
    }
    function start() {
      if (S.exam && !S.exam.done && !confirm('Cancel the exam in progress and start a new one?')) return;
      const qs = GENS.map((f) => f()).map((q) => Object.assign(q, { a: +q.a.toPrecision(6) }));
      qs.sort(() => Math.random() - 0.5);
      S.exam = { no: S.exams.length + 1, qs, resp: [], start: Date.now(), done: false };
      save(); render(); Lab.toast('Exam started: 20 questions, 40 minutes. Good luck!');
    }
    function finish(auto) {
      const ex = S.exam; if (!ex || ex.done) return;
      if (!auto && !confirm('Do you want to finish and grade the exam?')) return;
      ex.res = ex.qs.map((q, i) => { const v = Lab.parse(ex.resp[i] || ''); return isFinite(v) && Math.abs(v - q.a) <= Math.abs(q.a) * 0.02 + (q.abs || 0.001); });
      ex.score = 5 * ex.res.filter(Boolean).length; ex.done = true;
      const used = Math.min(EXDUR, Math.round((Date.now() - ex.start) / 1000));
      S.exams.push({ date: new Date().toLocaleString('en-GB'), score: ex.score, used });
      save(); render(); hist(); progress();
      Lab.toast((auto ? 'Time is up! ' : '') + 'Your score: ' + ex.score + '/100', 5000);
    }
    $('#exStart').onclick = start;
    $('#exFinish').onclick = () => finish(false);
    self.tick = () => {
      const ex = S.exam, el = $('#exTimer');
      if (!ex || ex.done) { el.textContent = '40:00'; el.classList.remove('low'); return; }
      const left = Math.max(0, EXDUR - Math.floor((Date.now() - ex.start) / 1000));
      el.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
      el.classList.toggle('low', left < 300);
      if (left <= 0) finish(true);
    };
    render(); hist();
    return self;
  })();
  steps('d4', [
    { t: '<b>Start</b> a practice exam.', test: () => !!S.exam },
    { t: '<b>Finish and grade</b> at least one exam; review the correct values of your wrong answers.', test: () => S.exams.length >= 1 },
    { t: 'Score at least <b>60</b> points in an attempt.', test: () => S.exams.some((h) => h.score >= 60) },
    { t: 'Score at least <b>80</b> points in an attempt in <b>less than 30 minutes</b>.', test: () => S.exams.some((h) => h.score >= 80 && h.used < 1800) },
  ]);

  /* ================= RAPOR ================= */
  function buildReport() {
    const sec = { onhaz: 'Pre-lab', d1: 'Task 1', d2: 'Task 2', d3: 'Task 3', d4: 'Task 4' };
    let tot = 0, ok = 0;
    const qrows = Object.entries(qids).map(([pg, ids]) => ids.map((id) => {
      const a = S.answers[id]; tot++; if (a && a.ok) ok++;
      const q = $(`[data-qid="${id}"] .qt`); const qt = q ? q.innerHTML : id;
      return `<tr><td class="l">${sec[pg]}</td><td class="l">${qt}</td><td class="l">${a ? a.a : '—'}</td><td>${a ? (a.ok ? '✔' : '✘') : '—'}</td></tr>`;
    }).join('')).join('');
    let sTot = 0, sOk = 0;
    Object.keys(stepDefs).forEach((k) => stepDefs[k].forEach((_, i) => { sTot++; if (S.steps[k + '_' + i]) sOk++; }));
    const fn = (k) => (FAULTS.find((x) => x[0] === k) || ['', '—'])[1];
    const h1 = S.d1.hist.map((h) => `<tr><td>#${h.n}</td><td class="l">${fn(h.f)}</td><td class="l">${fn(h.g)}</td><td>${h.nm}</td><td>${h.ok ? '✔' : '✘'}</td></tr>`).join('');
    const h3 = S.d3.hist.map((h) => `<tr><td>#${h.n}</td><td class="l">${(ELS.find((x) => x[0] === h.el) || [])[1]}</td><td class="l">${(ELS.find((x) => x[0] === h.gEl) || [])[1]}</td><td>${num(h.v, 3)} / ${num(h.ref, 3)} ${h.unit}</td><td>${h.okEl && h.okEq ? '✔' : '✘'} ${h.okVal ? '✔' : '✘'}</td></tr>`).join('');
    const best = S.exams.reduce((m, h) => Math.max(m, h.score), 0);
    const img = (c) => { try { return `<img src="${c.toDataURL()}" style="width:48%;border:1px solid #ccc">`; } catch (e) { return ''; } };
    const html = `
      <h2 style="margin:0">Circuit Theory I · Virtual Laboratory · Week 8 Report</h2>
      <p><b>Topic:</b> Midterm exam week — troubleshooting, sensor interface design, waveform recognition, timed practice exam (Sections 1–2)</p>
      <table class="data" style="width:auto"><tr><th>Full name</th><td class="l">${S.st.name || ''}</td><th>ID</th><td class="l">${S.st.no || ''}</td><th>Group</th><td class="l">${S.st.group || ''}</td><th>Date</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Summary</h3>
      <p>Lab-sheet steps: <b>${sOk}/${sTot}</b> · Correct answers: <b>${ok}/${tot}</b> · Fault diagnosis: <b>${d1ok()}/${S.d1.hist.length}</b> · Waveform (element+equation): <b>${d3full()}/${S.d3.hist.length}</b> · Acceptable designs: <b>${S.d2.rows.filter((r) => r.pass).length}</b> · Best practice exam: <b>${best}/100</b> (${S.exams.length} attempts)</p>
      <p>Practical score: <b>${Math.round((40 * sOk) / sTot + (30 * ok) / tot + 0.3 * best)}/100</b></p>
      <h3>Answers</h3>
      <table class="data"><thead><tr><th>Section</th><th>Question</th><th>Answer</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Task 1 · Fault diagnoses</h3>
      <table class="data"><thead><tr><th>Board</th><th>Actual fault</th><th>Diagnosis</th><th>Points measured</th><th></th></tr></thead><tbody>${h1}</tbody></table>
      <h3>Task 2 · Evaluated designs</h3>
      <table class="data"><thead>${$('#d2tab thead').innerHTML}</thead><tbody>${$('#d2tab tbody').innerHTML}</tbody></table>
      <h3>Task 3 · Waveform answers</h3>
      <table class="data"><thead><tr><th>Screen</th><th>Actual</th><th>Answer</th><th>Value (yours / correct)</th><th>Recognition · Value</th></tr></thead><tbody>${h3}</tbody></table>
      <h3>Task 4 · Practice exams</h3>
      <table class="data"><thead><tr><th>#</th><th>Date</th><th>Score</th><th>Time</th></tr></thead><tbody>${$('#exHist tbody').innerHTML}</tbody></table>
      <h3>Plots</h3>
      <div>${img(D2.plotCanvas)} ${img($('#scope'))}</div>
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
    if (e.key === 'r' || e.key === 'R') { if (S.page === 'd1') D1.rec(); if (S.page === 'd2') D2.evaluate(); }
  });

  let lastT = 0;
  function loop(now) {
    if (S.page === 'd1') { D1.update(); evalSteps('d1'); }
    if (S.page === 'd2') { D2.update(); evalSteps('d2'); }
    if (S.page === 'd3') { D3.update(); evalSteps('d3'); }
    if (now - lastT > 250) { lastT = now; D4.tick(); if (S.page === 'd4') evalSteps('d4'); }
    requestAnimationFrame(loop);
  }
  ['d1', 'd2', 'd3', 'd4'].forEach(evalSteps);
  go(S.page); progress(); requestAnimationFrame(loop);
})();

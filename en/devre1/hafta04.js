/* Devre Kuramı I · Hafta 4 — Gerçek Op-Amp Sınırları */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd1h04';
  const S = Object.assign({ answers: {}, steps: {}, d1rows: [], d2rows: [], d3rows: [], d4rows: [], st: {}, page: 'giris' }, Lab.store.load(KEY));
  if (S.seed == null) S.seed = Math.random() * 1000;
  if (S.vos == null) S.vos = (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random() * 2) * 1e-3;
  if (S.ib == null) S.ib = (70 + Math.random() * 20) * 1e-9;
  if (S.ios == null) S.ios = (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 12) * 1e-9;
  Lab.answers = S.answers;
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => Lab.store.save(KEY, S), 300); };
  Lab.onAnswer = () => { save(); progress(); };

  /* ---------- ortak op-amp modeli (µA741) ---------- */
  const A0 = 1e5, FB = 10, GBW = A0 * FB, SR = 0.5e6, VSAT = 14, RI = 2e6;
  const near = (a, b, t) => Math.abs(a - b) <= t;
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
  const vAuto = (v) => (Math.abs(v) < 1e-3 ? [num(v * 1e6, 1), 'µV'] : Math.abs(v) < 1 ? [num(v * 1e3, 2), 'mV'] : [num(v, 4), 'V']);

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
  };
  // evirmeyen kat: + giriş (x, yt+85), çıkış (x+120, yt+55)
  function stageNI(g, x, yt, inX) {
    sch.opamp(g, x, yt); sch.t(g, x + 12, yt + 30, '−'); sch.t(g, x + 12, yt + 90, '+');
    sch.w(g, [[inX, yt + 85], [x, yt + 85]]);
    sch.w(g, [[x, yt + 25], [x - 25, yt + 25], [x - 25, yt - 25], [x + 30, yt - 25]]); sch.rH(g, x + 30, x + 110, yt - 25);
    sch.w(g, [[x + 110, yt - 25], [x + 150, yt - 25], [x + 150, yt + 55]]); sch.w(g, [[x + 120, yt + 55], [x + 175, yt + 55]]); sch.dot(g, x + 150, yt + 55);
    sch.dot(g, x - 25, yt + 25); sch.rH(g, x - 105, x - 25, yt + 25); sch.gnd(g, x - 105, yt + 25);
    sch.t(g, x - 65, yt + 12, 'R<tspan font-size="10" dy="3">s</tspan><tspan dy="-3"> 1 kΩ</tspan>');
    return { rf: sch.t(g, x + 70, yt - 38, '') };
  }

  /* ---------- tek kutuplu + SR sınırlı op-amp benzetimi ----------
     Evirmeyen kat (kazanç G):  dv_o/dt = λ (G' u − v_o), λ = 2πf_b(1 + A0/G), G' = A0/(1 + A0/G)
     Adım tam (üstel) ayrıklaştırılır, değişim ±SR·h ile, çıkış ±VSAT ile sınırlanır.            */
  const stagesOf = (Gs) => Gs.map((G) => ({ G, lam: TAU * FB * (1 + A0 / G), Gp: A0 / (1 + A0 / G) }));
  function Hof(st, f) { // karmaşık kapalı çevrim kazancı
    let re = 1, im = 0;
    st.forEach((s) => { const x = f / (s.lam / TAU), d = 1 + x * x, hr = s.Gp / d, hi = (-s.Gp * x) / d; const r = re * hr - im * hi; im = re * hi + im * hr; re = r; });
    return { re, im, mag: Math.hypot(re, im), ph: Math.atan2(im, re) };
  }
  function simSine(st, f, Vm, times) {
    const w = TAU * f, T = 1 / f, n = times.length, ts = times[0] - 3 * T;
    let h = Math.min(T / 400, n > 1 ? (times[n - 1] - times[0]) / (n - 1) : T / 400);
    if ((times[n - 1] - ts) / h > 4e5) h = (times[n - 1] - ts) / 4e5;
    // fazör kararlı durumundan başla
    const x = []; let amp = Vm, ph = 0;
    st.forEach((s) => { const hh = Hof([s], f); amp *= hh.mag; ph += hh.ph; x.push(clamp(amp * Math.sin(w * ts + ph), -VSAT, VSAT)); });
    const ea = st.map((s) => 1 - Math.exp(-s.lam * h));
    const step = (t, hh, e) => {
      let u = Vm * Math.sin(w * t);
      for (let k = 0; k < st.length; k++) {
        const ek = e ? e[k] : 1 - Math.exp(-st[k].lam * hh);
        const dv = clamp((st[k].Gp * u - x[k]) * ek, -SR * hh, SR * hh);
        x[k] = clamp(x[k] + dv, -VSAT, VSAT); u = x[k];
      }
    };
    const vin = new Float64Array(n), vo = new Float64Array(n);
    let t = ts;
    for (let i = 0; i < n; i++) {
      const tg = times[i];
      while (tg - t > h * 1e-6) { const hh = Math.min(h, tg - t); t += hh; step(t, hh, hh === h ? ea : null); }
      vin[i] = Vm * Math.sin(w * tg); vo[i] = x[st.length - 1];
    }
    return { vin, vo };
  }
  // temel bileşen, faz, THD, tepe-tepe
  function analyse(st, f, Vm) {
    const N = 800, T = 1 / f, times = []; for (let i = 0; i < N; i++) times.push((i * 2 * T) / N);
    const { vo } = simSine(st, f, Vm, times);
    let a = 0, b = 0, m = 0, mx = -1e9, mn = 1e9;
    for (let i = 0; i < N; i++) { const p = (TAU * f) * times[i]; a += vo[i] * Math.sin(p); b += vo[i] * Math.cos(p); m += vo[i]; if (vo[i] > mx) mx = vo[i]; if (vo[i] < mn) mn = vo[i]; }
    a *= 2 / N; b *= 2 / N; m /= N;
    let rms2 = 0; for (let i = 0; i < N; i++) rms2 += (vo[i] - m) ** 2; rms2 /= N;
    const F = (a * a + b * b) / 2, thd = F > 0 ? Math.sqrt(Math.max(0, rms2 - F) / F) : 0;
    return { A1: Math.hypot(a, b), ph: (Math.atan2(b, a) * 180) / Math.PI, thd: thd * 100, vpp: mx - mn };
  }

  /* ---------- osiloskop oluşturucu ---------- */
  const VDIV = [1e-3, 2e-3, 5e-3, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10];
  const TDIV = [1e-6, 2e-6, 5e-6, 1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3];
  const pick = (L, x) => L.find((v) => v >= x) || L[L.length - 1];
  function makeScope(box, id, o) {
    box.innerHTML = `<div class="inst dark scopewrap" style="flex:1;min-width:420px"><div class="brand"><span>DSO-2C · Digital Oscilloscope</span><span><span class="led on g"></span> RUN</span></div>
      <div class="row" style="align-items:flex-start;flex-wrap:nowrap"><canvas id="${id}" width="640" height="400" style="width:100%;max-width:640px"></canvas>
      <div style="min-width:150px"><div class="ctrls" id="${id}Knobs"></div><div class="row" style="margin:6px 0" id="${id}Btns"></div><div class="meas" id="${id}Meas"></div></div></div></div>`;
    const scope = new Lab.Scope($('#' + id)), sk = $('#' + id + 'Knobs');
    const ch = o.onChange;
    const k1 = new Lab.Knob(sk, { label: 'CH1 V/div', list: VDIV, value: o.v1, dark: true, size: 44, fmt: (v) => eng(v, 'V'), onChange: (v) => { scope.ch[0].vdiv = v; ch(); } });
    const k2 = new Lab.Knob(sk, { label: 'CH2 V/div', list: VDIV, value: o.v2, dark: true, size: 44, fmt: (v) => eng(v, 'V'), onChange: (v) => { scope.ch[1].vdiv = v; ch(); } });
    const kt = new Lab.Knob(sk, { label: 'TIME/div', list: TDIV, value: o.t, dark: true, size: 44, fmt: (v) => eng(v, 's'), onChange: (v) => { scope.tdiv = v; ch(); } });
    scope.ch[0].vdiv = o.v1; scope.ch[1].vdiv = o.v2; scope.tdiv = o.t;
    const bx = $('#' + id + 'Btns');
    const btn = (t, on, f) => { const b = document.createElement('button'); b.className = 'seg-btn' + (on ? ' on' : ''); b.textContent = t; b.onclick = () => { f(); b.classList.toggle('on'); ch(); }; bx.appendChild(b); return b; };
    btn('CH1', true, () => (scope.ch[0].on = !scope.ch[0].on));
    btn('CH2', true, () => (scope.ch[1].on = !scope.ch[1].on));
    btn('CURSOR', false, () => (scope.cur.on = !scope.cur.on));
    const auto = document.createElement('button'); auto.className = 'seg-btn'; auto.textContent = 'AUTO'; bx.appendChild(auto);
    auto.onclick = () => { const a = o.auto(); kt.set(pick(TDIV, a.t)); k1.set(pick(VDIV, a.v1)); k2.set(pick(VDIV, a.v2)); };
    const meas = $('#' + id + 'Meas');
    const show = (m) => {
      if (!m) return;
      const [a, b] = m.ch;
      let h = `<span style="color:#f2d21b">CH1</span> Vpp ${eng(a.vpp, 'V')}<br>f ${isFinite(a.f) ? eng(a.f, 'Hz') : '—'}<br><span style="color:#27c4f0">CH2</span> Vpp ${eng(b.vpp, 'V')}<br>max ${eng(b.max, 'V')} · min ${eng(b.min, 'V')}`;
      if (m.cur) h += `<br><span style="color:#ff7cf0">CURSOR</span> Δt ${eng(m.cur.dt, 's')}<br>ΔV(CH2) ${eng(m.cur.v2b - m.cur.v2a, 'V')}<br>ΔV/Δt ${num((m.cur.v2b - m.cur.v2a) / m.cur.dt / 1e6, 3)} V/µs`;
      meas.innerHTML = h;
    };
    $('#' + id).addEventListener('pointermove', () => scope.cur.drag && show(scope.measure()));
    return { scope, k1, k2, kt, show };
  }

  /* ================= GEZİNME / İLERLEME ================= */
  const pages = ['giris', 'onbilgi', 'onhaz', 'd1', 'd2', 'd3', 'd4', 'rapor'];
  function go(p) {
    S.page = p; save();
    $$('section.page').forEach((s) => s.classList.toggle('active', s.id === p));
    $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.p === p));
    if (p === 'd2') D2.dirty = true;
    if (p === 'd3') D3.dirty = true;
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
  numq('onhaz', '#preQ', { id: 'p1', q: '1) Inverting amplifier with R<sub>s</sub> = 10 kΩ, R<sub>f</sub> = 90 kΩ, A = 10<sup>3</sup>. What is the approximate percentage error of the closed-loop gain relative to its ideal value?', answer: 100 * (10 / 1000) / (1 + 10 / 1000), tol: 3, unit: '%', explain: '(1+R<sub>f</sub>/R<sub>s</sub>)/A = 10/1000 = 0.01; actual gain −9/1.01 = −8.911, error ≈ 0.99%.', hint: 'The correction term in the denominator is (1+R<sub>f</sub>/R<sub>s</sub>)/A.' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) GBW = 1 MHz. What is the −3 dB bandwidth, in kHz, of a non-inverting amplifier with a gain of 50?', answer: 20, tol: 1, unit: 'kHz', explain: 'f<sub>3dB</sub> = GBW/gain = 10<sup>6</sup>/50 = 20 kHz.', hint: 'The product is constant.' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) SR = 0.5 V/µs. Up to what frequency, in kHz, can a sine with a 5 V peak be produced without distortion?', answer: 0.5e6 / (TAU * 5) / 1e3, tol: 2, unit: 'kHz', explain: 'f ≤ SR/(2πV<sub>m</sub>) = 0.5·10<sup>6</sup>/(2π·5) = 15.9 kHz.', hint: 'The maximum slope of a sine is 2πfV<sub>m</sub>.' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) V<sub>os</sub> = 3 mV, R<sub>s</sub> = 1 kΩ, R<sub>f</sub> = 47 kΩ. What is the DC shift, in mV, at the output of an inverting amplifier with a grounded input?', answer: 144, tol: 1, unit: 'mV', explain: '(1 + 47) × 3 mV = 144 mV. The offset is multiplied not by the inverting gain but by (1+R<sub>f</sub>/R<sub>s</sub>).', hint: 'V<sub>os</sub> is like a battery in series with the non-inverting input.' });
  mcq('onhaz', '#preQ', { id: 'p5', q: '5) If the amplitude of the input sine in the same circuit is increased tenfold, which of the following is true?', opts: ['Both the GBW limit and the SR limit fall tenfold', 'The GBW limit is unchanged, the SR limit falls tenfold', 'The GBW limit falls tenfold, the SR limit is unchanged', 'Neither changes'], correct: 1, explain: 'GBW is a small-signal limit (depends on gain), SR is a large-signal limit (depends on amplitude).', hint: 'Which formula contains V<sub>m</sub>?' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) What should be the value of the resistor R<sub>p</sub> placed at the non-inverting input to reduce the effect of the bias current?', opts: ['R<sub>s</sub> + R<sub>f</sub>', 'R<sub>s</sub> ‖ R<sub>f</sub>', 'R<sub>f</sub>', 'Zero'], correct: 1, explain: 'Both inputs see the same Thevenin resistance to ground; the effects of equal bias currents cancel.', hint: 'Looking into the inverting terminal (with source and output at zero), how do R<sub>s</sub> and R<sub>f</sub> appear to be connected?' });

  /* ================= DENEY 1 · Sonlu A ================= */
  const RL1 = [1e3, 2e3, 5e3, 1e4, 2e4, 4e4, 5e4, 8e4, 1e5, 2e5, 4e5, 1e6];
  const ALIST = [10, 30, 100, 300, 1e3, 3e3, 1e4, 3e4, 1e5, 3e5, 1e6];
  const fmtA = (v) => (v >= 1e3 ? (v / Math.pow(10, Math.floor(Math.log10(v))) === 1 ? '10^' + Math.round(Math.log10(v)) : '3·10^' + Math.floor(Math.log10(v))) : String(v));
  const tolF = (R, k) => 1 + 0.01 * Math.sin(S.seed * (k + 1) + Math.log(R) * 7.3); // ±%1 sabit sapma
  const D1 = (() => {
    const box = $('#d1inst'), self = {};
    const sg = inst(box, 'DC SUPPLY · v<sub>g</sub>'); const sgL = lcd(sg.el, 'v<sub>g</sub>', 'V', 100);
    const kg = new Lab.Knob(sg.c, { label: 'v_g', min: -2, max: 2, step: 0.001, value: S.d1vg ?? 1, dark: true, fmt: (v) => num(v, 3) + ' V', onChange: (v) => { S.d1vg = v; save(); } });
    const rb = inst(box, 'RESISTOR BOXES', false);
    const ks = new Lab.Knob(rb.c, { label: 'R_s', list: RL1, value: S.d1Rs ?? 2e4, fmt: Lab.ohm, onChange: (v) => { S.d1Rs = v; save(); } });
    const kf = new Lab.Knob(rb.c, { label: 'R_f', list: RL1, value: S.d1Rf ?? 8e4, fmt: Lab.ohm, onChange: (v) => { S.d1Rf = v; save(); } });
    const tb = document.createElement('label'); tb.style.cssText = 'font-size:11px;display:block;margin-top:4px';
    tb.innerHTML = `<input type="checkbox" ${S.d1tol ? 'checked' : ''}> 1% tolerance`; rb.c.appendChild(tb);
    tb.firstChild.onchange = (e) => { S.d1tol = e.target.checked; save(); };
    const oa = inst(box, 'OP-AMP BOARD', false, 'A selector');
    const ka = new Lab.Knob(oa.c, { label: 'A', list: ALIST, value: S.d1A ?? 1e5, fmt: fmtA, onChange: (v) => { S.d1A = v; save(); } });
    const m1 = inst(box, 'DMM-1 · v<sub>n</sub>', false); const m1L = lcd(m1.el, 'DC V · autorange', 'µV', 120);
    const m2 = inst(box, 'DMM-2 · v<sub>o</sub>', false); const m2L = lcd(m2.el, 'DC V', 'V', 120);

    const g = $('#d1sch');
    sch.src(g, 60, 200); sch.w(g, [[60, 180], [60, 140], [110, 140]]); sch.rH(g, 110, 190, 140); sch.w(g, [[190, 140], [380, 140]]); sch.dot(g, 300, 140);
    sch.w(g, [[60, 220], [60, 240]]); sch.gnd(g, 60, 240);
    sch.w(g, [[300, 140], [300, 60], [360, 60]]); sch.rH(g, 360, 440, 60); sch.w(g, [[440, 60], [580, 60], [580, 165]]);
    sch.opamp(g, 380, 110); sch.t(g, 392, 146, '−'); sch.t(g, 392, 206, '+'); sch.w(g, [[500, 165], [640, 165]]); sch.dot(g, 580, 165); sch.term(g, 644, 165);
    sch.w(g, [[380, 195], [345, 195], [345, 225]]); sch.gnd(g, 345, 225);
    const tRs = sch.t(g, 150, 125, ''), tRf = sch.t(g, 400, 45, ''), tVg = sch.t(g, 88, 205, '', 'val', 'start');
    const tVn = sch.t(g, 296, 128, '', 'val', 'end'), tVo = sch.t(g, 600, 155, '', 'val', 'start'), tA = sch.t(g, 440, 240, '', 'val'), tG = sch.t(g, 640, 30, '', 'val');

    function compute() {
      const vg = kg.value, Rs = ks.value, Rf = kf.value, A = ka.value;
      const rs = S.d1tol ? Rs * tolF(Rs, 1) : Rs, rf = S.d1tol ? Rf * tolF(Rf, 2) : Rf;
      const G = 1 / rs + 1 / rf + 1 / RI, a = vg / rs / G, b = 1 / rf / G;
      const r = Lab.opamp(0, 0, a, b, { A, vsatP: VSAT, vsatN: -VSAT });
      const vn = a + b * r.vo, gain = vg ? r.vo / vg : NaN, gi = -Rf / Rs;
      return { vg, Rs, Rf, A, tol: !!S.d1tol, vn, vo: r.vo, gain, err: vg ? (100 * (gi - gain)) / gi : NaN, sat: r.mode !== 'doğrusal' };
    }
    self.update = () => {
      const c = (self.c = compute());
      sgL(num(c.vg, 3)); const a = vAuto(c.vn); m1L(a[0], a[1]); m2L(num(c.vo, 5));
      tRs.textContent = 'R_s = ' + Lab.ohm(c.Rs); tRf.textContent = 'R_f = ' + Lab.ohm(c.Rf); tVg.textContent = 'v_g = ' + num(c.vg, 3) + ' V';
      tVn.textContent = 'v_n = ' + a[0] + ' ' + a[1]; tVo.textContent = 'v_o = ' + num(c.vo, 4) + ' V'; tA.textContent = 'A = ' + fmtA(c.A);
      tG.textContent = c.sat ? 'SATURATION — reduce v_g' : 'ideal gain −R_f/R_s = ' + num(-c.Rf / c.Rs, 2); tG.style.fill = c.sat ? '#c62828' : '#1a8a4a';
    };
    const plot = new Lab.Plot($('#d1plot'), { xlabel: 'log10 A', ylabel: 'log10 (error %)' });
    function drawPlot() {
      const ser = [];
      if ($('#d1theo').checked) {
        const k = 1 + kf.value / ks.value, pts = [];
        for (let x = 1; x <= 6.001; x += 0.05) { const A = Math.pow(10, x); pts.push([x, Math.log10((100 * (k / A)) / (1 + k / A))]); }
        ser.push({ pts, line: true, color: '#e07a10', dash: [6, 4] });
      }
      ser.push({ pts: S.d1rows.filter((r) => !r.sat && isFinite(r.err)).map((r) => [Math.log10(r.A), Math.log10(Math.max(1e-6, Math.abs(r.err)))]), dots: true, color: '#0b5cad' });
      plot.draw(ser, [0.8, 6.2], [-6, 2.5]);
    }
    $('#d1theo').onchange = drawPlot;
    const tbody = $('#d1tab tbody');
    function table() {
      tbody.innerHTML = S.d1rows.map((r, i) => `<tr><td>${i + 1}</td><td>${fmtA(r.A)}</td><td>${Lab.ohm(r.Rs)}</td><td>${Lab.ohm(r.Rf)}</td><td>${num(r.vg, 3)}</td><td>${vAuto(r.vn).join(' ')}</td><td>${num(r.vo, 5)}</td><td>${num(r.gain, 5)}</td><td>${r.sat ? 'saturation' : num(r.err, 4)}</td></tr>`).join('');
      drawPlot();
    }
    self.rec = () => { const c = compute(); if (!c.vg) return Lab.toast('The gain cannot be calculated with v_g = 0.'); S.d1rows.push(c); save(); table(); Lab.toast(`Recorded: A = ${fmtA(c.A)}, v_o/v_g = ${num(c.gain, 5)}`); };
    $('#d1rec').onclick = self.rec;
    $('#d1del').onclick = () => { S.d1rows.pop(); save(); table(); };
    $('#d1csv').onclick = () => Lab.downloadCSV('hafta4_deney1.csv', ['#', 'A', 'Rs', 'Rf', 'vg (V)', 'vn (V)', 'vo (V)', 'vo/vg', 'error (%)'], S.d1rows.map((r, i) => [i + 1, r.A, r.Rs, r.Rf, r.vg, r.vn, r.vo, r.gain, r.err]));
    table();
    Object.assign(self, { kg, ks, kf, ka, plotCanvas: $('#d1plot') });
    return self;
  })();
  const d1c = () => D1.c || {};
  steps('d1', [
    { t: 'Example 1.8: set <b>R<sub>s</sub> = 20 kΩ, R<sub>f</sub> = 80 kΩ, A = 10<sup>5</sup>, v<sub>g</sub> = 1 V</b> and record. How many µV is v<sub>n</sub>? How close is v<sub>o</sub> to −4 V?', test: () => S.d1rows.some((r) => r.Rs === 2e4 && r.Rf === 8e4 && r.A === 1e5) },
    { t: 'Reduce A to <b>10<sup>2</sup></b> (a weak stage) and record again. How much did the gain drop?', test: () => S.d1rows.some((r) => r.Rs === 2e4 && r.Rf === 8e4 && r.A === 100) },
    { t: 'With the same resistors, record at <b>at least 5 different values of A</b>; look at the error–A relation on the plot (log–log).', test: () => new Set(S.d1rows.filter((r) => r.Rs === 2e4 && r.Rf === 8e4 && !r.sat).map((r) => r.A)).size >= 5 },
    { t: 'Raise the ideal gain to <b>20</b> (R<sub>f</sub> = 400 kΩ) and record at A = 10<sup>2</sup>; reduce v<sub>g</sub> (e.g. 0.5 V) so that the output does not saturate. By what factor did the error grow?', test: () => S.d1rows.some((r) => r.Rf / r.Rs === 20 && r.A === 100 && !r.sat) },
    { t: 'Turn on the <b>theoretical curve</b> and compare it with your measurements; then tick the “1% tolerance” box and take another record at A = 10<sup>5</sup>. Which error dominates?', test: () => $('#d1theo').checked && S.d1rows.some((r) => r.A === 1e5 && r.tol) },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: 'Example 1.8: with A = 10<sup>2</sup>, what is the actual closed-loop gain v<sub>o</sub>/v<sub>g</sub>?', answer: -4 / 1.05, tol: 0.3, unit: '', explain: '(−4)/(1 + 5/100) = −3.8095.', hint: '(−R<sub>f</sub>/R<sub>s</sub>)/(1+(1+R<sub>f</sub>/R<sub>s</sub>)/A); mind the sign.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'What is the percentage error in the same case?', answer: 100 * (1 - 1 / 1.05), tol: 3, unit: '%', explain: '(4 − 3.8095)/4 = 4.76% ≈ 4.8%: much larger than the resistor tolerance, so the ideal model cannot be used.', hint: '|G<sub>ideal</sub> − G|/|G<sub>ideal</sub>|' });
  numq('d1', '#d1Q', { id: 'd1q3', q: 'What is the percentage error with A = 10<sup>5</sup>?', answer: 100 * (5e-5 / (1 + 5e-5)), tol: 5, unit: '%', explain: '5/10<sup>5</sup> = 5·10<sup>−5</sup> = 0.005%: negligible beside a 1% tolerance.', hint: 'ε ≈ (1+R<sub>f</sub>/R<sub>s</sub>)/A' });
  numq('d1', '#d1Q', { id: 'd1q4', q: 'With an ideal gain of 4, what is the minimum A that keeps the error below 0.1%?', answer: 4995, tol: 1.5, unit: '', explain: '(5/A)/(1+5/A) ≤ 0.001 ⇒ A ≥ 4995 ≈ 5000.', hint: 'ε ≈ 5/A ≤ 10<sup>−3</sup>' });
  mcq('d1', '#d1Q', { id: 'd1q5', q: 'At A = 10<sup>2</sup>, how did the error change when you raised the ideal gain from 4 to 20?', opts: ['It did not change; the error depends only on A', 'It grew by about 21/5 ≈ 4 times; the error is proportional to (1+R<sub>f</sub>/R<sub>s</sub>)/A', 'It decreased; a large gain is more accurate', 'It grew 20 times'], correct: 1, explain: '“A is a shared budget”: the more of it is spent on gain, the larger the error. At A = 100 the error for a gain of 20 is ≈ 17.4%.', hint: 'The numerator of the correction term went from 5 to 21.' });

  /* ================= DENEY 2 · GBW / Bode ================= */
  const RFL = [0, 1e3, 4e3, 9e3, 19e3, 49e3, 99e3, 199e3, 499e3, 999e3];
  const fmtRf = (v) => (v === 0 ? '0 (follower)' : Lab.ohm(v));
  const cfgName = (Gs) => (Gs.length === 1 ? 'G=' + Gs[0] : Gs.join('×'));
  const D2 = (() => {
    const box = $('#d2inst'), self = { dirty: true };
    const set = () => (self.dirty = true);
    const fg = inst(box, 'FG-200 FUNCTION GENERATOR', true, 'sine · 50 Ω'); const fgL = lcd(fg.el, 'FREQUENCY · AMPLITUDE', '', 210);
    const kf = new Lab.Knob(fg.c, { label: 'Frequency', min: 10, max: 2e6, log: true, value: S.d2f ?? 1000, dark: true, fmt: (v) => eng(v, 'Hz'), onChange: (v) => { S.d2f = v; save(); set(); } });
    const ka = new Lab.Knob(fg.c, { label: 'Amplitude', min: 1e-3, max: 20, log: true, value: S.d2a ?? 0.1, dark: true, fmt: (v) => eng(v, 'Vpp'), onChange: (v) => { S.d2a = v; save(); set(); } });
    const rb = inst(box, 'GAIN RESISTORS', false, 'R<sub>s</sub> = 1 kΩ');
    const k1 = new Lab.Knob(rb.c, { label: 'Stage 1 R_f', list: RFL, value: S.d2r1 ?? 99e3, fmt: fmtRf, onChange: (v) => { S.d2r1 = v; save(); set(); } });
    const k2 = new Lab.Knob(rb.c, { label: 'Stage 2 R_f', list: RFL, value: S.d2r2 ?? 9e3, fmt: fmtRf, onChange: (v) => { S.d2r2 = v; save(); set(); } });
    const sw = document.createElement('button'); sw.className = 'seg-btn'; sw.style.cssText = 'width:120px;padding:8px 4px'; rb.c.appendChild(sw);
    const swTxt = () => { sw.textContent = S.d2two ? 'STAGE 2 CONNECTED' : 'NO STAGE 2'; sw.classList.toggle('on', !!S.d2two); };
    sw.onclick = () => { S.d2two = !S.d2two; save(); swTxt(); set(); drawSch(); }; swTxt();
    const mv = inst(box, 'AC MILLIVOLTMETER · PHASE METER', true, '<span class="led" id="d2srLed"></span> SR');
    const mvI = lcd(mv.el, 'CH-A · V<sub>i</sub> (peak-to-peak)', 'mVpp', 150), mvO = lcd(mv.el, 'CH-B · V<sub>o</sub> (peak-to-peak)', 'Vpp', 150), mvP = lcd(mv.el, 'PHASE (B − A) · GAIN', '', 150);

    const g = $('#d2sch'); let stTxt = [];
    function drawSch() {
      g.innerHTML = '';
      sch.src(g, 50, 170, 20, 'ac'); sch.w(g, [[50, 190], [50, 205]]); sch.gnd(g, 50, 205); sch.w(g, [[50, 150], [50, 145], [70, 145]]);
      sch.term(g, 70, 145); sch.t(g, 70, 132, 'A').style.fill = '#b8960a';
      const s1 = stageNI(g, 230, 60, 70);
      stTxt = [s1.rf];
      if (S.d2two) { const s2 = stageNI(g, 530, 60, 405); stTxt.push(s2.rf); sch.term(g, 709, 115); sch.t(g, 725, 120, 'B', 'lbl', 'start').style.fill = '#1592b8'; }
      else { sch.term(g, 409, 115); sch.t(g, 420, 120, 'B', 'lbl', 'start').style.fill = '#1592b8'; }
      self.tGen = sch.t(g, 80, 230, '', 'val', 'start'); self.tTot = sch.t(g, 600, 230, '', 'val');
    }
    drawSch();
    const Gs = () => (S.d2two ? [1 + k1.value / 1e3, 1 + k2.value / 1e3] : [1 + k1.value / 1e3]).map((x) => Math.round(x));
    self.measure = (f) => { const G = Gs(), st = stagesOf(G), Vm = ka.value / 2, r = analyse(st, f, Vm); return { cfg: cfgName(G), Gs: G, f, vi: ka.value, vo: 2 * r.A1, vpp: r.vpp, ph: r.ph, thd: r.thd }; };
    self.update = () => {
      if (!self.dirty) return; self.dirty = false;
      const m = (self.m = self.measure(kf.value));
      fgL(`${eng(kf.value, 'Hz')} · ${eng(ka.value, 'Vpp')}`);
      mvI(num(m.vi * 1e3, 2)); mvO(num(m.vpp, 4)); mvP(num(m.ph, 1) + '° · ' + num(m.vpp / m.vi, 2));
      $('#d2srLed').classList.toggle('on', m.thd > 3);
      const G = Gs(); stTxt.forEach((t, i) => (t.textContent = 'R_f = ' + fmtRf(i ? k2.value : k1.value) + '  (G = ' + G[i] + ')'));
      self.tGen.textContent = 'sine · ' + eng(kf.value, 'Hz') + ' · ' + eng(ka.value, 'Vpp');
      self.tTot.textContent = 'DC gain = ' + G.reduce((a, b) => a * b, 1);
      if (Math.max(...[m.vpp]) > 2 * VSAT * 0.98) Lab.toast('Output saturated: reduce the input amplitude.');
    };
    const plot = new Lab.Plot($('#d2plot'), { xlabel: 'log10 f   (2 → 100 Hz, 3 → 1 kHz, 4 → 10 kHz, 5 → 100 kHz, 6 → 1 MHz)', ylabel: 'Gain (dB)' });
    const COL = ['#0b5cad', '#1a8a4a', '#c62828', '#7b3fb5', '#e07a10', '#0f8b8d', '#8a6d00'];
    function drawPlot() {
      const cfgs = [...new Set(S.d2rows.map((r) => r.cfg))], ser = [];
      if ($('#d2theo').checked) {
        const cur = cfgName(Gs()); const list = cfgs.includes(cur) ? cfgs : cfgs.concat([cur]);
        list.forEach((c) => {
          const G = c.startsWith('G=') ? [+c.slice(2)] : c.split('×').map(Number), st = stagesOf(G), pts = [];
          for (let x = 1; x <= 6.31; x += 0.02) pts.push([x, 20 * Math.log10(Hof(st, Math.pow(10, x)).mag)]);
          ser.push({ pts, line: true, color: '#999', width: 1.2, dash: [5, 4] });
        });
      }
      cfgs.forEach((c, i) => ser.push({ pts: S.d2rows.filter((r) => r.cfg === c).sort((a, b) => a.f - b.f).map((r) => [Math.log10(r.f), 20 * Math.log10(r.vo / r.vi)]), dots: true, line: true, width: 1.5, color: COL[i % COL.length] }));
      plot.draw(ser, [1, 6.4], [-30, 65]);
      $('#d2leg').innerHTML = cfgs.map((c, i) => `<span style="color:${COL[i % COL.length]};font-weight:700">● ${c}</span>`).join(' &nbsp; ') + ($('#d2theo').checked ? ' &nbsp; <span style="color:#888">- - theoretical</span>' : '');
    }
    $('#d2theo').onchange = drawPlot;
    const tbody = $('#d2tab tbody');
    function table() {
      tbody.innerHTML = S.d2rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.cfg}</td><td>${eng(r.f, '')}</td><td>${num(r.vi * 1e3, 1)}</td><td>${num(r.vo, 4)}</td><td>${num(r.vo / r.vi, 3)}</td><td>${num(20 * Math.log10(r.vo / r.vi), 2)}</td><td>${num(r.ph, 1)}</td></tr>`).join('');
      tbody.parentElement.parentElement.scrollTop = 1e6;
      drawPlot();
    }
    self.rec = () => { const m = self.measure(kf.value); if (m.thd > 3) Lab.toast('Warning: output distorted (SR/saturation). This point may be invalid for a GBW measurement.', 4000); S.d2rows.push(m); save(); table(); Lab.toast(`Recorded: ${m.cfg}, f = ${eng(m.f, 'Hz')}, V_o = ${num(m.vo, 3)} Vpp`); };
    $('#d2rec').onclick = self.rec;
    $('#d2del').onclick = () => { S.d2rows.pop(); save(); table(); };
    $('#d2clr').onclick = () => { if (confirm('Delete the Bode table?')) { S.d2rows = []; save(); table(); } };
    $('#d2csv').onclick = () => Lab.downloadCSV('hafta4_deney2.csv', ['#', 'configuration', 'f (Hz)', 'Vi (Vpp)', 'Vo (Vpp)', 'Vo/Vi', 'dB', 'phase (degrees)'], S.d2rows.map((r, i) => [i + 1, r.cfg, r.f, r.vi, +r.vo.toFixed(5), +(r.vo / r.vi).toFixed(4), +(20 * Math.log10(r.vo / r.vi)).toFixed(2), +r.ph.toFixed(1)]));
    $('#d2sweep').onclick = () => {
      if (self.sweeping) return;
      const fs = []; for (let d = 1; d <= 6; d++) [1, 2, 5].forEach((m) => { if (m * Math.pow(10, d) <= 2e6) fs.push(m * Math.pow(10, d)); });
      self.sweeping = true; let i = 0;
      const h = setInterval(() => {
        kf.set(fs[i]); const m = self.measure(fs[i]); S.d2rows.push(m); table();
        if (++i >= fs.length) { clearInterval(h); self.sweeping = false; save(); Lab.toast('Sweep finished: ' + m.cfg + ' — ' + fs.length + ' points recorded.'); }
      }, 70);
    };
    table();
    Object.assign(self, { kf, ka, k1, k2, Gs, plotCanvas: $('#d2plot') });
    return self;
  })();
  const rowsOf = (c) => S.d2rows.filter((r) => r.cfg === c && r.thd < 3);
  steps('d2', [
    { t: 'Single stage, <b>gain 100</b> (R<sub>f</sub> = 99 kΩ), <b>f = 1 kHz, V<sub>i</sub> = 20 mVpp</b>. Is the output ≈ 2 Vpp?', test: () => !S.d2two && D2.k1.value === 99e3 && near(D2.kf.value, 1000, 100) && near(D2.ka.value, 0.02, 0.002) },
    { t: 'For gain 100, record at <b>at least 8 frequencies</b> between 100 Hz and 1 MHz (Auto sweep or manually with <kbd>R</kbd>). Find the −3 dB frequency: take closely spaced points by hand around −3 dB.', test: () => { const L = rowsOf('G=100'); return L.length >= 8 && Math.min(...L.map((r) => r.f)) <= 1e3 && Math.max(...L.map((r) => r.f)) >= 1e5; } },
    { t: 'Set the gain to <b>20</b> (R<sub>f</sub> = 19 kΩ) and <b>5</b> (R<sub>f</sub> = 4 kΩ) and take at least 6 points for each. Adjust the input amplitude so that the output is a few Vpp.', test: () => rowsOf('G=20').length >= 6 && rowsOf('G=5').length >= 6 },
    { t: 'Example 1.10: <b>connect stage 2</b>, set both stages to <b>gain 10</b> (R<sub>f</sub> = 9 kΩ), and take at least 8 points with V<sub>i</sub> ≈ 10 mVpp. The total gain is 100; what is the bandwidth now?', test: () => rowsOf('10×10').length >= 8 },
    { t: 'Turn on the <b>theoretical curves</b>, compare them with the measurements and answer the questions.', test: () => $('#d2theo').checked && ['d2q1', 'd2q2', 'd2q4'].every((q) => S.answers[q] && S.answers[q].ok) },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'According to your measurement, what is the −3 dB frequency of the gain-100 stage, in kHz?', answer: 10, tol: 6, unit: 'kHz', explain: 'GBW/gain = 1 MHz/100 = 10 kHz. At this point the gain falls from 40 dB to 37 dB, phase ≈ −45°.', hint: 'Look for the frequency at which the gain falls to 100 × 0.707 = 70.7.' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'From the f<sub>3dB</sub> you measured for gain 20, what is the GBW of the op-amp in MHz?', answer: 1, tol: 6, unit: 'MHz', explain: '20 × 50 kHz = 1 MHz; 100 × 10 kHz and 5 × 200 kHz give the same product.', hint: 'GBW = gain × f<sub>3dB</sub>' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 'Example 1.10: if a flat response up to 60 kHz is required, what is the largest gain obtainable with a single stage?', answer: 1e6 / 6e4, tol: 2, unit: '', explain: '10<sup>6</sup>/(60·10<sup>3</sup>) = 16.7.', hint: 'The product is constant: gain = GBW/f' });
  numq('d2', '#d2Q', { id: 'd2q4', q: 'What is the overall −3 dB frequency, in kHz, that you measured for the two-stage (10 × 10) design?', answer: 100 * Math.sqrt(Math.SQRT2 - 1), tol: 5, unit: 'kHz', explain: 'The 100 kHz in the lecture notes is the bandwidth of each stage; at that frequency the two stages give 0.707·0.707 = 0.5, so the overall −3 dB point drops to 100·√(√2−1) ≈ 64 kHz. The 60 kHz target is still met; a single stage with gain 100 had only 10 kHz.', hint: 'The frequency at which the total gain is 100 × 0.707. It is not 100 kHz!' });
  mcq('d2', '#d2Q', { id: 'd2q5', q: 'Is it possible to obtain a gain of 1000 and a bandwidth of 100 kHz in a single stage with one op-amp of GBW = 1 MHz?', opts: ['Yes, if the supply is increased', 'Yes, if R<sub>f</sub> is made larger', 'No: the product would require 100 MHz; with this op-amp the bandwidth at gain 1000 is 1 kHz', 'No: it would work only in saturation'], correct: 2, explain: 'The supply sets only the saturation limit. Solution: an op-amp with higher GBW, or cascaded stages.', hint: '1000 × 100 kHz = ?' });

  /* ================= DENEY 3 · SR ================= */
  const D3 = (() => {
    const box = $('#d3inst'), self = { dirty: true };
    const set = () => (self.dirty = true);
    const fg = inst(box, 'FG-200 FUNCTION GENERATOR', true, 'sine · 50 Ω'); const fgL = lcd(fg.el, 'FREQUENCY · AMPLITUDE', '', 200);
    const kf = new Lab.Knob(fg.c, { label: 'Frequency', min: 100, max: 5e5, log: true, value: S.d3f ?? 1000, dark: true, fmt: (v) => eng(v, 'Hz'), onChange: (v) => { S.d3f = v; save(); set(); } });
    const ka = new Lab.Knob(fg.c, { label: 'Amplitude', min: 0.01, max: 5, log: true, value: S.d3a ?? 0.5, dark: true, fmt: (v) => eng(v, 'Vpp'), onChange: (v) => { S.d3a = v; save(); set(); } });
    const rb = inst(box, 'GAIN', false, 'R<sub>s</sub> = 1 kΩ');
    const kr = new Lab.Knob(rb.c, { label: 'R_f', list: RFL, value: S.d3r ?? 9e3, fmt: fmtRf, onChange: (v) => { S.d3r = v; save(); set(); } });
    const an = inst(box, 'DISTORTION ANALYSER', true); const thL = lcd(an.el, 'THD (output)', '%', 110), voL = lcd(an.el, 'V<sub>o</sub> peak-to-peak', 'Vpp', 110);
    const sc = makeScope($('#d3scopeBox'), 'd3scope', {
      v1: 1, v2: 5, t: 2e-4, onChange: set,
      auto: () => ({ t: 2.5 / kf.value / 10, v1: ka.value / 6, v2: Math.max(0.02, Math.min(28, self.m ? self.m.vpp : 10) / 6) }),
    });
    const g = $('#d3sch');
    sch.src(g, 60, 165, 20, 'ac'); sch.w(g, [[60, 185], [60, 200]]); sch.gnd(g, 60, 200); sch.w(g, [[60, 145], [60, 140], [250, 140]]);
    sch.dot(g, 150, 140); sch.w(g, [[150, 140], [150, 115]]); sch.term(g, 150, 111); sch.t(g, 150, 100, 'CH1').style.fill = '#b8960a';
    const s = stageNI(g, 330, 55, 250);
    sch.term(g, 509, 110); sch.t(g, 520, 115, 'CH2 (v<tspan font-size="10" dy="3">o</tspan><tspan dy="-3">)</tspan>', 'lbl', 'start').style.fill = '#1592b8';
    sch.t(g, 390, 200, '±15 V supply · R<tspan font-size="10" dy="3">L</tspan><tspan dy="-3"> = 10 kΩ</tspan>', 'lbl');
    const tGen = sch.t(g, 90, 200, '', 'val', 'start'), tLim = sch.t(g, 640, 30, '', 'val');
    const G = () => Math.round(1 + kr.value / 1e3);
    self.update = () => {
      if (!self.dirty) return; self.dirty = false;
      const st = stagesOf([G()]), f = kf.value, Vm = ka.value / 2;
      const r = (self.m = analyse(st, f, Vm));
      fgL(`${eng(f, 'Hz')} · ${eng(ka.value, 'Vpp')}`); thL(num(r.thd, 2)); voL(num(r.vpp, 3));
      s.rf.textContent = 'R_f = ' + fmtRf(kr.value) + '  (G = ' + G() + ')'; tGen.textContent = 'sine · ' + eng(f, 'Hz') + ' · ' + eng(ka.value, 'Vpp');
      const satd = r.vpp > 2 * VSAT * 0.99; tLim.textContent = satd ? 'SATURATION (±14 V)' : r.thd > 1 ? 'OUTPUT DISTORTED' : 'OUTPUT SINUSOIDAL'; tLim.style.fill = satd || r.thd > 1 ? '#c62828' : '#1a8a4a';
      const n = 1000, T = sc.scope.tdiv * 10, times = []; for (let i = 0; i < n; i++) times.push((i * T) / (n - 1));
      const d = simSine(st, f, Vm, times);
      sc.scope.draw({ n, y: [d.vin, d.vo] }); sc.show(sc.scope.measure());
    };
    const tbody = $('#d3tab tbody');
    function table() { tbody.innerHTML = S.d3rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.G}</td><td>${num(r.vi, 3)}</td><td>${num(r.f / 1e3, 2)}</td><td>${num(r.vo, 3)}</td><td>${num(r.vo / r.vi, 2)}</td><td>${num(r.thd, 2)}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; }
    self.rec = () => { const st = stagesOf([G()]), r = analyse(st, kf.value, ka.value / 2); S.d3rows.push({ G: G(), vi: ka.value, f: kf.value, vo: r.vpp, thd: r.thd }); save(); table(); Lab.toast(`Recorded: f = ${eng(kf.value, 'Hz')}, V_o = ${num(r.vpp, 2)} Vpp, THD = ${num(r.thd, 2)}%`); };
    $('#d3rec').onclick = self.rec;
    $('#d3del').onclick = () => { S.d3rows.pop(); save(); table(); };
    $('#d3csv').onclick = () => Lab.downloadCSV('hafta4_deney3.csv', ['#', 'gain', 'Vi (Vpp)', 'f (Hz)', 'Vo (Vpp)', 'Vo/Vi', 'THD (%)'], S.d3rows.map((r, i) => [i + 1, r.G, r.vi, +r.f.toFixed(1), +r.vo.toFixed(4), +(r.vo / r.vi).toFixed(3), +r.thd.toFixed(3)]));
    table();
    Object.assign(self, { kf, ka, kr, G, sc });
    return self;
  })();
  const rows3 = (G, vi) => S.d3rows.filter((r) => r.G === G && near(r.vi, vi, vi * 0.06));
  steps('d3', [
    { t: '<b>Gain 10</b> (R<sub>f</sub> = 9 kΩ), <b>V<sub>i</sub> = 2 Vpp</b> (output 10 V peak), <b>f = 1 kHz</b>. Is the output a clean sine (THD &lt; 1%)?', test: () => D3.G() === 10 && near(D3.ka.value, 2, 0.1) && near(D3.kf.value, 1000, 100) && D3.m && D3.m.thd < 1 },
    { t: 'Increase the frequency slowly; note the frequency at which THD exceeds 1%. With the same setting record at <b>at least 4 frequencies</b> (including below 5 kHz and above 15 kHz).', test: () => { const L = rows3(10, 2); return L.length >= 4 && L.some((r) => r.f < 5e3) && L.some((r) => r.f > 1.5e4); } },
    { t: 'At <b>f ≥ 20 kHz</b> turn on the CURSORs; place the two cursors on the sloping edge of the output and measure SR from ΔV/Δt.', test: () => D3.G() === 10 && D3.kf.value >= 2e4 && D3.sc.scope.cur.on },
    { t: 'Example 1.21: <b>gain 20</b> (R<sub>f</sub> = 19 kΩ), <b>V<sub>i</sub> = 0.8 Vpp</b> for an 8 V peak output. Take at least 3 records below and above 9 kHz.', test: () => { const L = rows3(20, 0.8); return L.length >= 3 && L.some((r) => r.f < 9e3) && L.some((r) => r.f > 1.1e4); } },
    { t: 'Reduce the amplitude to <b>V<sub>i</sub> = 0.15 Vpp</b> (output 1.5 V peak); take at least 3 records between 10 and 100 kHz. Is the waveform distorted, or does only the amplitude fall?', test: () => { const L = rows3(20, 0.15); return L.length >= 3 && L.some((r) => r.f > 4e4); } },
  ]);
  numq('d3', '#d3Q', { id: 'd3q1', q: 'What slew rate, in V/µs, did you measure with the cursors?', answer: 0.5, tol: 12, unit: 'V/µs', explain: 'µA741: SR = 0.5 V/µs. The slope of the triangular output has this value regardless of frequency.', hint: 'Place the cursors on the straight part of the sloping edge.' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'Example 1.9: what is the highest undistorted frequency, in kHz, for a sine with a 10 V peak?', answer: 0.5e6 / (TAU * 10) / 1e3, tol: 2, unit: 'kHz', explain: 'f ≤ SR/(2πV<sub>m</sub>) = 0.5·10<sup>6</sup>/(2π·10) = 7.96 kHz. This is where THD starts to rise in your measurement.', hint: '2πfV<sub>m</sub> = SR' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'Example 1.9: if the peak value were 1 V, what would the SR limit be, in kHz?', answer: 0.5e6 / TAU / 1e3, tol: 2, unit: 'kHz', explain: '79.6 kHz: the limit is set not by frequency alone but by the amplitude × frequency product.', hint: 'Same formula, V<sub>m</sub> = 1 V.' });
  numq('d3', '#d3Q', { id: 'd3q4', q: 'Example 1.21: gain 20, output peak 8 V. What is the highest usable frequency, in kHz?', answer: 0.5e6 / (TAU * 8) / 1e3, tol: 2, unit: 'kHz', explain: 'GBW limit 50 kHz, SR limit 9.95 kHz; the smaller one applies: 9.95 kHz (set by SR).', hint: 'Find the two limits separately and take the smaller.' });
  mcq('d3', '#d3Q', { id: 'd3q5', q: 'With gain 20 and an output peak of 1.5 V, which limit determines the bandwidth?', opts: ['SR, because f<sub>SR</sub> = 53 kHz &lt; 50 kHz', 'GBW, because f<sub>SR</sub> ≈ 53 kHz &gt; f<sub>3dB</sub> = 50 kHz', 'Saturation', 'Both at the same time'], correct: 1, explain: 'As the amplitude decreases the SR limit moves up; this time the bandwidth is set by GBW. In your measurement the wave stayed sinusoidal and only the amplitude fell.', hint: 'Compare SR/(2π·1.5 V) with 10<sup>6</sup>/20.' });
  mcq('d3', '#d3Q', { id: 'd3q6', q: 'On the oscilloscope the output is a sharp-peaked triangle with a peak well below ±14 V. Which limit does this indicate?', opts: ['Saturation', 'Slew rate (SR): the output cannot keep up', 'GBW: only the amplitude falls, the shape stays sinusoidal', 'Offset voltage'], correct: 1, explain: 'In saturation the peaks are clipped flat; at the GBW limit the wave stays sinusoidal. Becoming triangular is characteristic of SR.', hint: 'Did the shape change, or did the amplitude fall?' });

  /* ================= DENEY 4 · Ofset / I_B ================= */
  const D4 = (() => {
    const box = $('#d4inst'), self = {};
    const sg = inst(box, 'DC SUPPLY · v<sub>g</sub>'); const sgL = lcd(sg.el, 'v<sub>g</sub>', 'mV', 100);
    const kg = new Lab.Knob(sg.c, { label: 'v_g', min: -100, max: 100, step: 0.5, value: S.d4vg ?? 0, dark: true, fmt: (v) => num(v, 1) + ' mV', onChange: (v) => { S.d4vg = v; save(); } });
    const rb = inst(box, 'RESISTOR BOXES', false);
    const ks = new Lab.Knob(rb.c, { label: 'R_s', list: [1e3, 1e4, 1e5], value: S.d4Rs ?? 1e3, fmt: Lab.ohm, onChange: (v) => { S.d4Rs = v; save(); } });
    const kf = new Lab.Knob(rb.c, { label: 'R_f', list: [1e4, 1e5, 1e6], value: S.d4Rf ?? 1e5, fmt: Lab.ohm, onChange: (v) => { S.d4Rf = v; save(); } });
    const kp = new Lab.Knob(rb.c, { label: 'R_p', list: [0, 1e3, 4.7e3, 9.1e3, 1e4, 2e4, 4.7e4, 9.1e4, 1e5, 1e6], value: S.d4Rp ?? 0, fmt: (v) => (v ? Lab.ohm(v) : '0 (short)'), onChange: (v) => { S.d4Rp = v; save(); } });
    const tr = inst(box, 'OFFSET TRIMPOT', false, '1–5 / 10 kΩ');
    const kt = new Lab.Knob(tr.c, { label: 'Setting', min: 0, max: 100, step: 0.1, value: S.d4trim ?? 50, fmt: (v) => num(v, 1) + '%', onChange: (v) => { S.d4trim = v; save(); } });
    const mm = inst(box, 'DMM · v<sub>o</sub>', false, '10 MΩ'); const mmL = lcd(mm.el, 'DC V · autorange', 'mV', 130);

    const g = $('#d4sch');
    sch.src(g, 60, 200); sch.w(g, [[60, 180], [60, 140], [110, 140]]); sch.rH(g, 110, 190, 140); sch.w(g, [[190, 140], [380, 140]]); sch.dot(g, 300, 140);
    sch.w(g, [[60, 220], [60, 240]]); sch.gnd(g, 60, 240);
    sch.w(g, [[300, 140], [300, 60], [360, 60]]); sch.rH(g, 360, 440, 60); sch.w(g, [[440, 60], [580, 60], [580, 165]]);
    sch.opamp(g, 380, 110); sch.t(g, 392, 146, '−'); sch.t(g, 392, 206, '+'); sch.w(g, [[500, 165], [640, 165]]); sch.dot(g, 580, 165); sch.term(g, 644, 165);
    sch.w(g, [[380, 195], [345, 195]]); sch.rV(g, 345, 195, 245); sch.gnd(g, 345, 245);
    E('path', { d: 'M372,150 v-22 m-4,6 l4,-6 l4,6', class: 'w', stroke: '#c62828' }, g); E('path', { d: 'M372,190 v22 m-4,-6 l4,6 l4,-6', class: 'w', stroke: '#c62828' }, g);
    sch.t(g, 300, 270, 'I<tspan font-size="10" dy="3">B+</tspan>', 'lbl').style.fill = '#c62828';
    const tRs = sch.t(g, 150, 125, ''), tRf = sch.t(g, 400, 45, ''), tRp = sch.t(g, 335, 225, '', 'lbl', 'end'), tVg = sch.t(g, 88, 205, '', 'val', 'start');
    const tVo = sch.t(g, 600, 155, '', 'val', 'start');
    sch.t(g, 372, 112, 'I<tspan font-size="10" dy="3">B−</tspan>', 'lbl', 'end').style.fill = '#c62828';
    sch.t(g, 600, 245, 'V_os acts like a battery in series with the input', 'lbl').setAttribute('style', 'font-size:11px;fill:#777');

    function compute() {
      const vg = kg.value * 1e-3, Rs = ks.value, Rf = kf.value, Rp = kp.value;
      const vos = S.vos + ((kt.value - 50) / 50) * 6e-3, ibp = S.ib + S.ios / 2, ibn = S.ib - S.ios / 2;
      let vo = (1 + Rf / Rs) * (vos - ibp * Rp) + ibn * Rf - (Rf / Rs) * vg;
      vo = clamp(vo, -VSAT, VSAT);
      const noise = (Math.random() - 0.5) * 2e-6 * (1 + Rf / 1e5);
      return { vg, Rs, Rf, Rp, trim: kt.value, vo: vo + noise };
    }
    self.update = () => {
      const c = (self.c = compute());
      sgL(num(c.vg * 1e3, 1)); const a = vAuto(c.vo); mmL(a[0], a[1]);
      tRs.textContent = 'R_s = ' + Lab.ohm(c.Rs); tRf.textContent = 'R_f = ' + Lab.ohm(c.Rf); tRp.textContent = 'R_p = ' + (c.Rp ? Lab.ohm(c.Rp) : '0');
      tVg.textContent = 'v_g = ' + num(c.vg * 1e3, 1) + ' mV'; tVo.textContent = 'v_o = ' + a[0] + ' ' + a[1];
    };
    const tbody = $('#d4tab tbody');
    function table() { tbody.innerHTML = S.d4rows.map((r, i) => `<tr><td>${i + 1}</td><td>${Lab.ohm(r.Rs)}</td><td>${Lab.ohm(r.Rf)}</td><td>${r.Rp ? Lab.ohm(r.Rp) : '0'}</td><td>${num(r.trim, 1)}%</td><td>${num(r.vg * 1e3, 1)}</td><td>${num(r.vo * 1e3, 3)}</td></tr>`).join(''); }
    self.rec = () => { const c = compute(); S.d4rows.push(c); save(); table(); Lab.toast(`Recorded: v_o = ${num(c.vo * 1e3, 3)} mV`); };
    $('#d4rec').onclick = self.rec;
    $('#d4del').onclick = () => { S.d4rows.pop(); save(); table(); };
    $('#d4csv').onclick = () => Lab.downloadCSV('hafta4_deney4.csv', ['#', 'Rs', 'Rf', 'Rp', 'trim (%)', 'vg (mV)', 'vo (mV)'], S.d4rows.map((r, i) => [i + 1, r.Rs, r.Rf, r.Rp, r.trim, r.vg * 1e3, +(r.vo * 1e3).toFixed(4)]));
    table();
    Object.assign(self, { kg, ks, kf, kp, kt });
    return self;
  })();
  const d4row = (Rs, Rf, Rp, f = () => true) => S.d4rows.some((r) => r.Rs === Rs && r.Rf === Rf && r.Rp === Rp && f(r));
  const d4c = () => D4.c || {};
  steps('d4', [
    { t: 'Trimpot at mid position (50%), v<sub>g</sub> = 0, <b>R<sub>s</sub> = 1 kΩ, R<sub>f</sub> = 100 kΩ, R<sub>p</sub> = 0</b>: record the output. With these resistors I<sub>B</sub>R<sub>f</sub> is small, so most of the shift comes from V<sub>os</sub>.', test: () => d4row(1e3, 1e5, 0, (r) => r.trim === 50 && r.vg === 0) },
    { t: 'Build the same gain with large resistors: <b>R<sub>s</sub> = 10 kΩ, R<sub>f</sub> = 1 MΩ, R<sub>p</sub> = 0</b> (trim 50%, v<sub>g</sub> = 0) and record. Where does the difference come from?', test: () => d4row(1e4, 1e6, 0, (r) => r.trim === 50 && r.vg === 0) },
    { t: 'Compensation resistor: calculate and select <b>R<sub>p</sub> ≈ R<sub>s</sub>‖R<sub>f</sub></b> (same circuit) and record.', test: () => d4row(1e4, 1e6, 1e4, (r) => r.trim === 50 && r.vg === 0) },
    { t: 'Null the output with the offset <b>trimpot</b>: |v<sub>o</sub>| &lt; 1 mV (R<sub>s</sub> = 10 kΩ, R<sub>f</sub> = 1 MΩ, R<sub>p</sub> = 10 kΩ, v<sub>g</sub> = 0).', test: () => { const c = d4c(); return c.Rs === 1e4 && c.Rf === 1e6 && c.Rp === 1e4 && c.vg === 0 && Math.abs(c.vo) < 1e-3; } },
    { t: 'Apply <b>v<sub>g</sub> = 10 mV</b> to the nulled circuit and record: was the gain affected by the offset?', test: () => S.d4rows.some((r) => r.Rs === 1e4 && r.Rf === 1e6 && Math.abs(r.vg - 0.01) < 1e-6 && Math.abs(r.vo + 1) < 0.01) },
  ]);
  numq('d4', '#d4Q', { id: 'd4q1', q: 'From your measurement in step 1, what is the offset voltage V<sub>os</sub> of the op-amp in mV? (with sign)', answer: () => S.vos * 1e3, tol: 6, abs: 0.05, unit: 'mV', explain: 'V<sub>os</sub> ≈ v<sub>o</sub>/(1+R<sub>f</sub>/R<sub>s</sub>) = v<sub>o</sub>/101. With small resistors the I<sub>B</sub> contribution (≈8 mV/101 ≈ 0.08 mV) is negligible.', hint: 'Divide the output shift by the non-inverting gain.' });
  numq('d4', '#d4Q', { id: 'd4q2', q: 'From the difference between steps 1 and 2, what is the bias current of the inverting input in nA?', answer: () => (S.ib - S.ios / 2) * 1e9, tol: 10, unit: 'nA', explain: 'Since the gain is the same (101), the V<sub>os</sub> contribution is the same; the difference is I<sub>B−</sub>(1 MΩ − 100 kΩ) = I<sub>B−</sub>·0.9 MΩ.', hint: 'Δv<sub>o</sub> / (R<sub>f2</sub> − R<sub>f1</sub>)' });
  numq('d4', '#d4Q', { id: 'd4q3', q: 'For a circuit with R<sub>s</sub> = 10 kΩ, R<sub>f</sub> = 100 kΩ, what is the ideal compensation resistor R<sub>p</sub> in kΩ?', answer: 1e4 * 1e5 / 1.1e5 / 1e3, tol: 1.5, unit: 'kΩ', explain: 'R<sub>s</sub>‖R<sub>f</sub> = 10·100/110 = 9.09 kΩ (standard value 9.1 kΩ).', hint: 'Two resistors in parallel.' });
  numq('d4', '#d4Q', { id: 'd4q4', q: 'V<sub>os</sub> = 2 mV, R<sub>s</sub> = 10 kΩ, R<sub>f</sub> = 100 kΩ. What DC shift, in mV, does the offset cause at the output?', answer: 22, tol: 1, unit: 'mV', explain: '(1 + 100/10) × 2 mV = 22 mV.', hint: '(1+R<sub>f</sub>/R<sub>s</sub>)V<sub>os</sub>' });
  mcq('d4', '#d4Q', { id: 'd4q5', q: 'Do offset and bias current distort the waveform of an audio signal?', opts: ['Yes, they produce harmonic distortion', 'No; it is a DC term, the waveform stays the same and only the zero point shifts', 'Only at high frequency', 'Yes, they reduce the gain'], correct: 1, explain: 'As you saw in step 5, the gain does not change. However, in high-gain DC amplifiers the shift can even cause saturation; that is why op-amps with low V<sub>os</sub>/I<sub>B</sub> are chosen for precision applications.', hint: 'What gain did you get in your v<sub>g</sub> = 10 mV measurement?' });

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
      <h2 style="margin:0">Circuit Theory I · Virtual Laboratory · Week 4 Report</h2>
      <p><b>Topic:</b> Real op-amp limitations — finite gain, gain–bandwidth product, slew rate, offset and bias current</p>
      <table class="data" style="width:auto"><tr><th>Full name</th><td class="l">${S.st.name || ''}</td><th>Student ID</th><td class="l">${S.st.no || ''}</td><th>Group</th><td class="l">${S.st.group || ''}</td><th>Date</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Summary</h3>
      <p>Lab-sheet steps completed: <b>${sOk}/${sTot}</b> · Correct answers: <b>${ok}/${tot}</b> · Score: <b>${Math.round((50 * sOk) / sTot + (50 * ok) / tot)}/100</b></p>
      <h3>Answers</h3>
      <table class="data"><thead><tr><th>Section</th><th>Question</th><th>Answer</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Experiment 1 · Finite gain</h3>${tab('d1tab')}
      <h3>Experiment 2 · Frequency response</h3>${tab('d2tab')}
      <h3>Experiment 3 · Slew rate</h3>${tab('d3tab')}
      <h3>Experiment 4 · Offset and bias current</h3>${tab('d4tab')}
      <h3>Plots</h3>
      <div>${img(D1.plotCanvas)} ${img($('#d3scope'))}</div>
      <div>${img(D2.plotCanvas, 98)}</div>
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
    if (S.page === 'd2') { if (!D2.sweeping) D2.update(); evalSteps('d2'); }
    if (S.page === 'd3') { D3.update(); evalSteps('d3'); }
    if (S.page === 'd4') { D4.update(); evalSteps('d4'); }
    requestAnimationFrame(loop);
  }
  D1.update(); D4.update();
  ['d1', 'd2', 'd3', 'd4'].forEach(evalSteps);
  go(S.page); progress(); loop();
})();

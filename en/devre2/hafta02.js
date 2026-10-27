/* Devre Kuramı II · Hafta 2 — R, L, C elemanları, empedans ve admitans */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd2h02';
  const S = Object.assign({ answers: {}, steps: {}, st: {}, page: 'giris', d1rows: [], d2rows: [], d3rows: [], d4rows: [], fl: {} }, Lab.store.load(KEY));
  if (S.ux == null) { // kara kutu X: tek eleman
    const t = ['R', 'L', 'C'][Math.floor(Math.random() * 3)];
    const v = t === 'R' ? Math.round(47 + Math.random() * 420) : t === 'L' ? Math.round(5 + Math.random() * 45) * 1e-3 : Math.round(22 + Math.random() * 448) / 100 * 1e-6;
    S.ux = { t, v };
  }
  if (S.cy == null) S.cy = [4.7, 6.8, 10, 15, 22][Math.floor(Math.random() * 5)] * 1e-6; // kutu Y kapasitesi
  if (S.esr == null) S.esr = +(0.3 + Math.random() * 1.2).toFixed(2); // kutu Y ESR (Ω)
  Lab.answers = S.answers;
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => Lab.store.save(KEY, S), 300); };
  Lab.onAnswer = () => { save(); progress(); };
  const near = (a, b, t) => Math.abs(a - b) <= t;
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const wrap180 = (d) => { d = ((d + 180) % 360 + 360) % 360 - 180; return d; };

  /* ---------- kompleks yardımcılar ---------- */
  const C = {
    pol: (m, deg) => [m * Math.cos(deg * D2R), m * Math.sin(deg * D2R)],
    add: (a, b) => [a[0] + b[0], a[1] + b[1]],
    mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]],
    div: (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; },
    abs: (a) => Math.hypot(a[0], a[1]),
    ang: (a) => Math.atan2(a[1], a[0]) * R2D,
  };

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
  function segGroup(parent, items, cur, onSel) { // items: [[value, label]]
    const bs = items.map(([v, l]) => { const b = segBtn(parent, l, v === cur); b.onclick = () => { bs.forEach((x) => x.classList.remove('on')); b.classList.add('on'); onSel(v); }; return b; });
    return (v) => bs.forEach((b, i) => b.classList.toggle('on', items[i][0] === v));
  }

  /* ---------- şema yardımcıları ---------- */
  const sch = {
    w: (g, pts) => E('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'w' }, g),
    dot: (g, x, y) => E('circle', { cx: x, cy: y, r: 3.5, class: 'node' }, g),
    t: (g, x, y, s, cls = 'lbl', anchor = 'middle') => { const e = E('text', { x, y, class: cls, 'text-anchor': anchor }, g); e.innerHTML = s; return e; },
    rH(g, x1, x2, y) { const n = 6, L = 8, step = (x2 - x1 - 2 * L) / n; let d = `M${x1},${y} h${L}`; for (let i = 0; i < n; i++) d += ` l${step / 2},${i % 2 ? 7 : -7} l${step / 2},${i % 2 ? -7 : 7}`; d += ` L${x2},${y}`; E('path', { d, class: 'w' }, g); },
    rV(g, x, y1, y2) { const n = 6, L = 8, step = (y2 - y1 - 2 * L) / n; let d = `M${x},${y1} v${L}`; for (let i = 0; i < n; i++) d += ` l${i % 2 ? 7 : -7},${step / 2} l${i % 2 ? -7 : 7},${step / 2}`; d += ` L${x},${y2}`; E('path', { d, class: 'w' }, g); },
    lH(g, x1, x2, y) { const n = 4, w = (x2 - x1 - 16) / n; let d = `M${x1},${y} h8`; for (let i = 0; i < n; i++) d += ` a${w / 2},${w / 2} 0 0 1 ${w},0`; d += ` L${x2},${y}`; E('path', { d, class: 'w' }, g); },
    lV(g, x, y1, y2) { const n = 4, h = (y2 - y1 - 16) / n; let d = `M${x},${y1} v8`; for (let i = 0; i < n; i++) d += ` a${h / 2},${h / 2} 0 0 1 0,${h}`; d += ` L${x},${y2}`; E('path', { d, class: 'w' }, g); },
    cV(g, x, y1, y2) { const m = (y1 + y2) / 2; E('path', { d: `M${x},${y1} V${m - 5} M${x - 16},${m - 5} h32 M${x - 16},${m + 5} h32 M${x},${m + 5} V${y2}`, class: 'w' }, g); },
    gnd(g, x, y) { E('path', { d: `M${x},${y} v8 M${x - 11},${y + 8} h22 M${x - 7},${y + 13} h14 M${x - 3},${y + 18} h6`, class: 'w' }, g); },
    src(g, x, y, r = 20) { E('circle', { cx: x, cy: y, r, class: 'w', fill: '#fff' }, g); E('path', { d: `M${x - 10},${y} q5,-12 10,0 t10,0`, class: 'w' }, g); },
    box(g, x, y, w, h, txt) { E('rect', { x, y, width: w, height: h, rx: 6, class: 'w', fill: '#f4f7ff' }, g); sch.t(g, x + w / 2, y + h / 2 + 5, txt); },
    sw(g, x1, x2, y) {
      const b = E('line', { x1, y1: y, x2, y2: y, class: 'w' }, g);
      [x1, x2].forEach((x) => E('circle', { cx: x, cy: y, r: 3.5, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g));
      return (on) => { b.setAttribute('x2', on ? x2 : x2 - 6); b.setAttribute('y2', on ? y : y - 20); b.style.stroke = on ? '#1a8a4a' : '#c62828'; };
    },
    arrow(g, x1, y1, x2, y2, color, w = 3) {
      const a = Math.atan2(y2 - y1, x2 - x1), h = 10;
      E('line', { x1, y1, x2, y2, stroke: color, 'stroke-width': w }, g);
      E('path', { d: `M${x2},${y2} L${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} L${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)} Z`, fill: color }, g);
    },
  };

  /* ---------- osiloskop yardımcısı ---------- */
  const VDIV = [1e-3, 2e-3, 5e-3, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
  const TDIV = [1e-6, 2e-6, 5e-6, 1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2, 2e-2, 5e-2];
  const POS = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  function mkScope(host, o) {
    const w = document.createElement('div'); w.className = 'inst dark scopewrap'; w.style.cssText = 'flex:1;min-width:420px';
    w.innerHTML = `<div class="brand"><span>DSO-2C · Digital Oscilloscope</span><span><span class="led on g"></span> <span class="runst">${o.mode || 'RUN'}</span></span></div>
      <div class="row" style="align-items:flex-start;flex-wrap:nowrap"><canvas width="640" height="400" style="width:100%;max-width:640px"></canvas>
      <div style="min-width:160px"><div class="ctrls"></div><div class="row btns" style="margin:6px 0;gap:4px"></div><div class="meas"></div></div></div>`;
    host.appendChild(w);
    const cv = w.querySelector('canvas'), sc = new Lab.Scope(cv), sk = w.querySelector('.ctrls'), bt = w.querySelector('.btns'), me = w.querySelector('.meas');
    const self = { sc, cv, dirty: true, bt, runEl: w.querySelector('.runst') };
    const set = () => { self.dirty = true; };
    sc.ch[0].vdiv = o.v1; sc.ch[1].vdiv = o.v2; sc.tdiv = o.t; sc.ch[0].pos = o.p1 || 0; sc.ch[1].pos = o.p2 || 0;
    self.k1 = new Lab.Knob(sk, { label: 'CH1 V/div', list: VDIV, value: o.v1, dark: true, size: 40, fmt: (v) => eng(v, 'V'), onChange: (v) => { sc.ch[0].vdiv = v; set(); } });
    self.k2 = new Lab.Knob(sk, { label: o.l2 || 'CH2 V/div', list: VDIV, value: o.v2, dark: true, size: 40, fmt: (v) => eng(v, o.u2 || 'V'), onChange: (v) => { sc.ch[1].vdiv = v; set(); } });
    self.kt = new Lab.Knob(sk, { label: 'TIME/div', list: TDIV, value: o.t, dark: true, size: 40, fmt: (v) => eng(v, 's'), onChange: (v) => { sc.tdiv = v; set(); } });
    self.kp1 = new Lab.Knob(sk, { label: 'CH1 position', list: POS, value: o.p1 || 0, dark: true, size: 34, fmt: (v) => num(v, 0) + ' d', onChange: (v) => { sc.ch[0].pos = v; set(); } });
    self.kp2 = new Lab.Knob(sk, { label: 'CH2 position', list: POS, value: o.p2 || 0, dark: true, size: 34, fmt: (v) => num(v, 0) + ' d', onChange: (v) => { sc.ch[1].pos = v; set(); } });
    const b1 = segBtn(bt, 'CH1', true), b2 = segBtn(bt, 'CH2', o.ch2 !== false), bc = segBtn(bt, 'CURSOR', false);
    sc.ch[1].on = o.ch2 !== false;
    b1.onclick = () => { sc.ch[0].on = !sc.ch[0].on; b1.classList.toggle('on', sc.ch[0].on); set(); };
    b2.onclick = () => { sc.ch[1].on = !sc.ch[1].on; b2.classList.toggle('on', sc.ch[1].on); set(); };
    bc.onclick = () => { sc.cur.on = !sc.cur.on; bc.classList.toggle('on', sc.cur.on); set(); };
    const pre = !!o.pre;
    self.tc = (x) => (x - (pre ? 1 : 0)) * sc.tdiv;
    self.show = () => {
      const m = sc.measure(); if (!m) return; self.m = m;
      const [a, b] = m.ch;
      let h = `<span style="color:#f2d21b">CH1</span> V<sub>pp</sub> ${eng(a.vpp, 'V')}<br>&nbsp;&nbsp;max ${eng(a.max, 'V')}`;
      if (sc.ch[1].on) h += `<br><span style="color:#27c4f0">CH2</span> V<sub>pp</sub> ${eng(b.vpp, o.u2 || 'V')}<br>&nbsp;&nbsp;max ${eng(b.max, o.u2 || 'V')}`;
      if (o.freq !== false && isFinite(a.f)) h += `<br>CH1 f ≈ ${eng(a.f, 'Hz', 3)}`;
      if (m.cur) {
        const c = m.cur;
        h += `<br><span style="color:#ff7cf0">CURSOR A</span>${pre ? ' t ' + eng(self.tc(sc.cur.a), 's') : ''}<br>&nbsp;CH1 ${eng(c.v1a, 'V')} · CH2 ${eng(c.v2a, o.u2 || 'V')}` +
          `<br><span style="color:#ff7cf0">CURSOR B</span>${pre ? ' t ' + eng(self.tc(sc.cur.b), 's') : ''}<br>&nbsp;CH1 ${eng(c.v1b, 'V')} · CH2 ${eng(c.v2b, o.u2 || 'V')}<br>Δt = t<sub>B</sub>−t<sub>A</sub> ${eng(c.dt, 's')}<br>1/Δt ${eng(1 / Math.abs(c.dt), 'Hz')}`;
      }
      if (o.extra) h += o.extra(m);
      me.innerHTML = h;
    };
    cv.addEventListener('pointermove', () => sc.cur.drag && self.show());
    cv.addEventListener('pointerdown', () => setTimeout(self.show, 0));
    self.draw = (data) => { sc.draw(data); self.show(); };
    return self;
  }
  // Örnekleme: fns = [f1(t), f2(t)], t0 = ekranın sol kenarındaki zaman
  const noise = () => (Math.random() + Math.random() - 1) * 0.5;
  function trace(tdiv, fns, t0 = 0, nz = [0, 0], n = 1200) {
    const y = [new Float64Array(n), new Float64Array(n)];
    for (let k = 0; k < n; k++) { const t = t0 + (k / (n - 1)) * 10 * tdiv; for (let c = 0; c < 2; c++) y[c][k] = fns[c](t) + nz[c] * noise(); }
    return { n, y };
  }
  // tetik: kosinüs referansının yükselen sıfır geçişi ekranın 1. bölmesinde
  const trigT0 = (w, ph, tdiv) => { const T = 2 * Math.PI / w; let t = (-Math.PI / 2 - ph) / w; t = ((t % T) + T) % T; return t - tdiv; };

  /* ================= GEZİNME / İLERLEME ================= */
  const pages = ['giris', 'onbilgi', 'onhaz', 'd1', 'd2', 'd3', 'd4', 'rapor'];
  const XP = {};
  function go(p) {
    S.page = p; save();
    $$('section.page').forEach((s) => s.classList.toggle('active', s.id === p));
    $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.p === p));
    if (XP[p]) XP[p].sc.dirty = true;
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

  /* ================= ortak AC modelleri ================= */
  const LIST_FL = [20, 50, 100, 200, 500, 1000, 2000, 5000, 1e4, 2e4, 5e4, 1e5];
  const ELN = { R: 'Resistor', L: 'Inductor', C: 'Capacitor' };
  // R = 100 Ω, L = 10 mH (r_L = 8 Ω), C = 1 µF (ESR = 0,4 Ω)
  const ELZ = (el, w, real) => el === 'R' ? [100, 0] : el === 'L' ? [real ? 8 : 0, w * 0.01] : [real ? 0.4 : 0, -1 / (w * 1e-6)];
  const fmtZ = (z) => `${num(z[0], 2)} ${z[1] < 0 ? '−' : '+'} j${num(Math.abs(z[1]), 2)}`;
  const rnd = (v, sig = 4) => +v.toPrecision(sig);
  // AC ölçüm: kaynak V (rms), yük Z, akım sınırı Imax (rms) → {V, I, th}
  function acMeas(Vs, Z, Imax = 1) {
    const zm = C.abs(Z); let I = Vs / zm, V = Vs, lim = false;
    if (I > Imax) { I = Imax; V = Imax * zm; lim = true; }
    return { V: rnd(V * (1 + 0.001 * noise())), I: rnd(I * (1 + 0.001 * noise())), th: +(C.ang(Z) + 0.15 * noise()).toFixed(1), lim };
  }
  function meterBox(parent, title) {
    const m = inst(parent, title, false);
    const v = lcd(m.el, 'V<sub>rms</sub> (element)', 'V', 130), i = lcd(m.el, 'I<sub>rms</sub>', 'mA', 130), t = lcd(m.el, 'PHASE θ<sub>v</sub> − θ<sub>i</sub>', '°', 130);
    const warn = document.createElement('div'); warn.style.cssText = 'font-size:11px;color:#c62828;font-weight:700;min-height:14px'; m.el.insertBefore(warn, m.c);
    return (r) => { v(num(r.V, 3)); if (r.I >= 0.1) i(num(r.I, 3), 'A'); else i(num(r.I * 1e3, 3), 'mA'); t(num(r.th, 1)); warn.textContent = r.lim ? 'CURRENT LIMIT (1 A)!' : ''; };
  }

  /* ================= ÖN BİLGİ · V–I fazörleri ve Z düzlemi ================= */
  const OB = (() => {
    const cv = $('#obAnim'), g = cv.getContext('2d'), W = cv.width, H = cv.height;
    let el = 'L', run = true, ang = 0, last = 0, on = false;
    segGroup($('#obSel'), [['R', 'Resistor'], ['L', 'Inductor'], ['C', 'Capacitor']], el, (v) => { el = v; S.fl.ob = true; save(); });
    $('#obRun').onclick = () => { run = !run; $('#obRun').textContent = run ? 'Pause' : 'Resume'; };
    function arrow(x1, y1, x2, y2, c) { const a = Math.atan2(y2 - y1, x2 - x1); g.strokeStyle = g.fillStyle = c; g.lineWidth = 3; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - 11 * Math.cos(a - 0.4), y2 - 11 * Math.sin(a - 0.4)); g.lineTo(x2 - 11 * Math.cos(a + 0.4), y2 - 11 * Math.sin(a + 0.4)); g.fill(); }
    function frame(ts) {
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts; if (run) ang += dt * 2 * Math.PI * 0.2;
      const dv = { R: 0, L: Math.PI / 2, C: -Math.PI / 2 }[el], Vm = 0.9, Im = 0.6, cx = 130, cy = H / 2, R = 100;
      g.fillStyle = '#0e1726'; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1; g.beginPath(); g.moveTo(15, cy); g.lineTo(245, cy); g.moveTo(cx, 15); g.lineTo(cx, H - 15); g.stroke();
      arrow(cx, cy, cx + Vm * R * Math.cos(ang + dv), cy - Vm * R * Math.sin(ang + dv), '#f2d21b');
      arrow(cx, cy, cx + Im * R * Math.cos(ang), cy - Im * R * Math.sin(ang), '#27c4f0');
      g.fillStyle = '#dfe3ea'; g.font = '13px Segoe UI';
      g.fillText({ R: 'V and I in phase', L: 'V leads I by 90° (ELI)', C: 'I leads V by 90° (ICE)' }[el], 12, 20);
      const x0 = 280, x1 = W - 12, sc = 95;
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.strokeRect(x0, 15, x1 - x0, H - 30); g.beginPath(); g.moveTo(x0, cy); g.lineTo(x1, cy); g.stroke();
      const tr = (amp, off, c) => { g.strokeStyle = c; g.lineWidth = 2.2; g.beginPath(); for (let x = x0; x <= x1; x += 2) { const a = ang - ((x1 - x) / (x1 - x0)) * 4 * Math.PI; const y = cy - amp * sc * Math.cos(a + off); x === x0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); };
      tr(Vm, dv, '#f2d21b'); tr(Im, 0, '#27c4f0');
      g.fillStyle = '#9fb3d1'; g.fillText('t →  (right edge = now)', x0 + 6, H - 22); g.fillText('v', x1 - 14, 32); g.fillStyle = '#27c4f0'; g.fillText('i', x1 - 26, 32);
      // gölgeler: fazörlerin gerçel izdüşümü sağ kenardaki değerdir
      g.setLineDash([3, 4]); g.strokeStyle = 'rgba(242,210,27,.5)'; const yv = cy - Vm * sc * Math.cos(ang + dv); g.beginPath(); g.moveTo(x1, yv); g.lineTo(x1 - 8, yv); g.stroke(); g.setLineDash([]);
      if (S.page === 'onbilgi') requestAnimationFrame(frame); else { on = false; last = 0; }
    }
    // Z düzlemi
    const zs = $('#obZ'), OX = 260, OY = 150, K = 0.5; // 1 px = 2 Ω
    E('line', { x1: 10, y1: OY, x2: 630, y2: OY, stroke: '#aab' }, zs); E('line', { x1: OX, y1: 8, x2: OX, y2: 292, stroke: '#aab' }, zs);
    sch.t(zs, 625, OY - 6, 'Re{Z} = R', 'lbl', 'end'); sch.t(zs, OX + 6, 20, 'Im{Z} = X  (inductive +)', 'lbl', 'start'); sch.t(zs, OX + 6, 288, 'capacitive −', 'lbl', 'start');
    const zg = E('g', {}, zs);
    function drawZ() {
      const w = Math.pow(10, +$('#obW').value), R = 100, L = 0.1, Cc = 10e-6;
      $('#obWv').textContent = 'ω = ' + num(w, 0) + ' rad/s';
      zg.innerHTML = '';
      const X = (r) => OX + r * K, Y = (x) => clamp(OY - x * K, 10, 290);
      const pt = (r, x, c, t) => { const yy = OY - x * K, off = yy < 10 || yy > 290; E('circle', { cx: X(r), cy: Y(x), r: 6, fill: c }, zg); sch.t(zg, X(r) + 10, Y(x) + 4, t + (off ? ' (off screen)' : ''), 'val', 'start').style.fill = c; };
      E('line', { x1: X(R), y1: 10, x2: X(R), y2: 290, stroke: '#e07a10', 'stroke-dasharray': '5 4' }, zg);
      pt(R, 0, '#444', 'Z_R = ' + R + ' Ω');
      pt(0, w * L, '#0b5cad', 'Z_L = j' + num(w * L, 1));
      pt(0, -1 / (w * Cc), '#1a8a4a', 'Z_C = −j' + num(1 / (w * Cc), 1));
      pt(R, w * L, '#e07a10', 'series RL: ' + R + ' + j' + num(w * L, 1));
      sch.t(zg, 14, 290, 'R = 100 Ω, L = 0.1 H, C = 10 µF', 'lbl', 'start');
    }
    $('#obW').addEventListener('input', () => { drawZ(); S.fl.obz = true; save(); });
    drawZ();
    return { start() { if (!on) { on = true; requestAnimationFrame(frame); } } };
  })();
  const PH = OB;

  /* ================= ÖN HAZIRLIK ================= */
  numq('onhaz', '#preQ', { id: 'p1', q: '1) Example 1.12: L = 20 mH, i = 5cos(1000t − 30°) A. What is the peak value of v(t) in V?', answer: 100, tol: 1, unit: 'V', explain: 'Z<sub>L</sub> = j20 Ω; V = 20∠90° · 5∠−30° = 100∠60° V ⇒ v = 100cos(1000t + 60°).', hint: '|V| = ωL·I<sub>m</sub>' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) Example 1.13: C = 50 µF, v = 120cos(2000t + 15°) V. What is the phase angle of i(t) in degrees?', answer: 105, tol: 1, unit: '°', explain: 'Z<sub>C</sub> = −j10 Ω; I = 120∠15°/10∠−90° = 12∠105° A. The current leads the voltage by 90°.', hint: 'In division the angles are subtracted: 15° − (−90°).' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) Example 1.14: What is the reactance X<sub>C</sub> of C = 10 µF at f = 50 Hz, in Ω? (with sign)', answer: -1 / (2 * Math.PI * 50 * 10e-6), tol: 1, unit: 'Ω', explain: 'X<sub>C</sub> = −1/(ωC) = −1/(314.16·10<sup>−5</sup>) = −318.3 Ω.', hint: 'Capacitive reactance is negative.' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) Example 1.15: What is the reactance of L = 100 mH at f = 5 kHz, in Ω?', answer: 2 * Math.PI * 5000 * 0.1, tol: 1, unit: 'Ω', explain: 'X<sub>L</sub> = 2π·5000·0.1 = 3141.6 Ω; exactly 100 times the 31.4 Ω at 50 Hz (X<sub>L</sub> ∝ f).', hint: 'ω = 2πf' });
  mcq('onhaz', '#preQ', { id: 'p5', q: '5) At f = 100 Hz, |Z<sub>L</sub>| = 20 Ω and |Z<sub>C</sub>| = 50 Ω. What are they at f = 1 kHz?', opts: ['20 Ω and 50 Ω', '200 Ω and 5 Ω', '2 Ω and 500 Ω', '200 Ω and 500 Ω'], correct: 1, explain: 'X<sub>L</sub> ∝ f, |X<sub>C</sub>| ∝ 1/f.', hint: 'One increases with frequency, the other decreases.' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) i = 3cos(ωt + 20°) A, v = 12cos(ωt + 110°) V. What is the element?', opts: ['Resistor', 'Inductor', 'Capacitor', 'Cannot be determined'], correct: 1, explain: 'θ = 110° − 20° = +90°: the voltage leads ⇒ inductor; Z = 4∠90° = j4 Ω, ωL = 4 Ω.', hint: 'Look at the sign of θ<sub>v</sub> − θ<sub>i</sub>.' });

  /* ================= DENEY 1 · V–I faz ilişkisi ================= */
  const D1 = (() => {
    const box = $('#d1inst');
    const fg = inst(box, 'FG-2 · FUNCTION GENERATOR', true, '50 Ω');
    const kF = new Lab.Knob(fg.c, { label: 'FREQUENCY', list: LIST_FL, value: S.d1f ?? 1000, dark: true, fmt: (v) => eng(v, 'Hz'), onChange: (v) => { S.d1f = v; save(); sc.dirty = true; } });
    const kA = new Lab.Knob(fg.c, { label: 'Vm', min: 0.5, max: 10, step: 0.1, value: S.d1a ?? 5, dark: true, fmt: (v) => num(v, 1) + ' V', onChange: (v) => { S.d1a = v; save(); sc.dirty = true; } });
    kA.el.querySelector('.kl').innerHTML = 'V<sub>m</sub> (open circuit)';
    const es = inst(box, 'ELEMENT BOX', false);
    segGroup(es.c, [['R', 'R 100 Ω'], ['L', 'L 10 mH'], ['C', 'C 1 µF']], S.d1el || 'R', (v) => { S.d1el = v; save(); sc.dirty = true; });
    const ms = inst(box, 'ELEMENT MODEL', false);
    segGroup(ms.c, [[false, 'Ideal'], [true, 'Real (r<sub>L</sub> 8 Ω, ESR 0.4 Ω)']], !!S.d1real, (v) => { S.d1real = v; save(); sc.dirty = true; });
    const sc = mkScope($('#d1scopeHost'), { v1: 2, v2: 0.2, t: 2e-4, l2: 'CH2 (shunt)' });
    const P = () => ({ el: S.d1el || 'R', real: !!S.d1real, f: kF.value, a: kA.value });
    const solve = (p) => { const w = 2 * Math.PI * p.f, Z = ELZ(p.el, w, p.real), I = C.div([p.a, 0], C.add(Z, [60, 0])); return { w, Z, I, V: C.mul(I, Z), Vs: C.mul(I, [10, 0]) }; };
    // şema
    const g = $('#d1sch');
    sch.src(g, 70, 110); sch.t(g, 70, 160, 'FG'); sch.w(g, [[70, 90], [70, 50], [100, 50]]); sch.rH(g, 100, 170, 50); sch.t(g, 135, 35, '50 Ω');
    sch.w(g, [[170, 50], [280, 50]]); const eg = E('g', {}, g); sch.w(g, [[400, 50], [520, 50]]); sch.rV(g, 520, 50, 160); sch.t(g, 535, 110, 'R<sub>shunt</sub> = 10 Ω', 'lbl', 'start');
    sch.w(g, [[520, 160], [520, 180], [70, 180], [70, 130]]); sch.gnd(g, 300, 180);
    sch.dot(g, 280, 50); sch.dot(g, 400, 50); sch.dot(g, 520, 50);
    E('path', { d: 'M280,50 V90 H300 M400,50 V90 H380', class: 'w', stroke: '#f2a900' }, g); sch.box(g, 300, 78, 80, 26, ''); sch.t(g, 340, 96, 'diff. probe'); sch.t(g, 340, 125, '→ CH1 (v)');
    sch.w(g, [[520, 50], [640, 50]]); sch.t(g, 650, 55, '→ CH2 (i·10 Ω)', 'lbl', 'start');
    const tE = sch.t(g, 340, 30, '', 'val');
    function drawEl(el) { eg.innerHTML = ''; if (el === 'R') sch.rH(eg, 280, 400, 50); else if (el === 'L') sch.lH(eg, 280, 400, 50); else E('path', { d: 'M280,50 H335 M335,32 v36 M345,32 v36 M345,50 H400', class: 'w' }, eg); }
    let lastEl = '';
    function update() {
      const p = P(); if (p.el !== lastEl) { drawEl(p.el); lastEl = p.el; }
      tE.textContent = ELN[p.el] + (p.real ? ' (real)' : ' (ideal)') + ' · f = ' + eng(p.f, 'Hz');
      if (!sc.dirty) return; sc.dirty = false;
      const s = solve(p), vA = C.abs(s.V), vP = C.ang(s.V) * D2R, iA = C.abs(s.Vs), iP = C.ang(s.Vs) * D2R;
      const t0 = trigT0(s.w, vP, sc.sc.tdiv);
      sc.draw(trace(sc.sc.tdiv, [(t) => vA * Math.cos(s.w * t + vP), (t) => iA * Math.cos(s.w * t + iP)], t0, [vA * 0.004, iA * 0.004]));
    }
    const tbody = $('#d1tab tbody');
    function table() { tbody.innerHTML = S.d1rows.map((r, i) => `<tr><td>${i + 1}</td><td>${ELN[r.el]}</td><td>${r.real ? 'real' : 'ideal'}</td><td>${eng(r.f, 'Hz')}</td><td>${num(r.v1, 3)}</td><td>${num(r.v2, 4)}</td><td>${r.dt == null ? '—' : eng(r.dt, 's')}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; }
    function rec() {
      const m = sc.m; if (!m) return; const p = P();
      S.d1rows.push({ ...p, v1: m.ch[0].max, v2: m.ch[1].max, dt: m.cur ? m.cur.dt : null }); save(); table();
      Lab.toast('Recorded' + (m.cur ? ': Δt = ' + eng(m.cur.dt, 's') + ' (A should be the voltage peak, B the current peak)' : ' (cursor off: no Δt)'));
    }
    $('#d1rec').onclick = rec; $('#d1del').onclick = () => { S.d1rows.pop(); save(); table(); };
    $('#d1csv').onclick = () => Lab.downloadCSV('d2_hafta02_deney1.csv', ['#', 'element', 'model', 'f (Hz)', 'CH1 peak (V)', 'CH2 peak (V)', 'dt (s)'], S.d1rows.map((r, i) => [i + 1, r.el, r.real ? 'real' : 'ideal', r.f, +r.v1.toFixed(4), +r.v2.toFixed(5), r.dt == null ? '' : +r.dt.toExponential(4)]));
    table();
    const thOf = (r) => (r.dt == null ? NaN : wrap180(360 * r.f * r.dt));
    const thTrue = (r) => C.ang(ELZ(r.el, 2 * Math.PI * r.f, r.real));
    const ok = (r) => near(thOf(r), thTrue(r), 4);
    return { sc, update, rec, P, ok };
  })();
  XP.d1 = D1;
  steps('d1', [
    { t: '<b>Resistor</b>, f = 1 kHz: put CURSOR A on a voltage (CH1) peak and B on the nearest current (CH2) peak, then <b>record</b>.', test: () => S.d1rows.some((r) => r.el === 'R' && r.f === 1000 && D1.ok(r)) },
    { t: 'Record the same measurement for the <b>ideal inductor</b>, f = 1 kHz. Which curve leads?', test: () => S.d1rows.some((r) => r.el === 'L' && !r.real && r.f === 1000 && D1.ok(r)) },
    { t: 'Measure and record for the <b>ideal capacitor</b>, f = 1 kHz.', test: () => S.d1rows.some((r) => r.el === 'C' && !r.real && r.f === 1000 && D1.ok(r)) },
    { t: 'With the ideal inductor, raise the frequency to <b>10 kHz</b> and record again: did the angle change, and what happened to the amplitude ratio?', test: () => S.d1rows.some((r) => r.el === 'L' && !r.real && r.f === 1e4 && D1.ok(r)) },
    { t: 'Switch to the <b>real inductor</b>, measure the angle at <b>f = 200 Hz</b> and record. Why is it not 90°?', test: () => S.d1rows.some((r) => r.el === 'L' && r.real && r.f === 200 && D1.ok(r)) },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: 'What θ = θ<sub>v</sub> − θ<sub>i</sub> did you measure for the ideal inductor at 1 kHz, in degrees?', answer: 90, tol: 4, unit: '°', explain: 'Z<sub>L</sub> = jωL = ωL∠90°: the voltage leads the current by 90°.', hint: 'θ = 360°·f·Δt; positive if the current peak comes later.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'What is θ for the ideal capacitor at 1 kHz, in degrees?', answer: -90, tol: 4, unit: '°', explain: 'Z<sub>C</sub> = −j/(ωC) = (1/ωC)∠−90°: the current leads the voltage by 90°.', hint: 'Watch the sign.' });
  numq('d1', '#d1Q', { id: 'd1q3', q: 'From your 1 kHz measurement of the ideal inductor, what is |Z<sub>L</sub>| = V<sub>m</sub>/I<sub>m</sub> in Ω? (I<sub>m</sub> = CH2 peak / 10 Ω)', answer: 2 * Math.PI * 1000 * 0.01, tol: 3, unit: 'Ω', explain: 'ωL = 2π·1000·0.01 = 62.83 Ω. At 10 kHz it becomes 628 Ω.', hint: 'CH1 peak ÷ (CH2 peak/10)' });
  numq('d1', '#d1Q', { id: 'd1q4', q: 'What θ did you measure for the real inductor (r<sub>L</sub> = 8 Ω) at 200 Hz, in degrees?', answer: Math.atan2(2 * Math.PI * 200 * 0.01, 8) * R2D, tol: 4, unit: '°', explain: 'θ = tan<sup>−1</sup>(ωL/r<sub>L</sub>) = tan<sup>−1</sup>(12.57/8) = 57.5°. At low frequency ωL is small, so the winding resistance comes to the fore; Q = ωL/r<sub>L</sub> = 1.57.', hint: 'Z = r<sub>L</sub> + jωL' });
  mcq('d1', '#d1Q', { id: 'd1q5', q: 'What is the physical reason that the voltage leads the current in an inductor?', opts: ['The inductor stores energy in an electric field', 'v = L di/dt: the voltage is largest when the current changes fastest (at its zero crossing)', 'The resistance of the inductor is zero', 'The current enters the inductor with a delay because the wire is long'], correct: 1, explain: 'Differentiation shifts a cosine 90° ahead: d/dt cos ωt = ω cos(ωt + 90°).', hint: 'Differentiation is multiplication by jω for phasors.' });
  mcq('d1', '#d1Q', { id: 'd1q6', q: 'What changed in the ideal inductor when the frequency was raised from 1 kHz to 10 kHz?', opts: ['The angle dropped from 90° to 0°', 'The angle stayed the same (90°), the current amplitude decreased about 10 times', 'The angle became −90°', 'Nothing changed'], correct: 1, explain: 'The angle depends on the element type, the magnitude on frequency: |Z<sub>L</sub>| = ωL increased 10 times. (Because of the 50 + 10 Ω source/shunt resistance, the ratio at 1 kHz is not exactly 10.)', hint: 'Compare the CH2 peak values in your table.' });

  /* ================= DENEY 2 · Frekans taraması ================= */
  const D2 = (() => {
    const box = $('#d2inst');
    const am = inst(box, 'AC POWER AMPLIFIER', true, 'I ≤ 1 A');
    const kF = new Lab.Knob(am.c, { label: 'FREQUENCY', min: 20, max: 1e5, log: true, value: S.d2f ?? 1000, dark: true, size: 62, fmt: (v) => eng(v, 'Hz', 4), onChange: (v) => { S.d2f = v; save(); } });
    const kV = new Lab.Knob(am.c, { label: 'V rms', min: 0.1, max: 10, step: 0.1, value: S.d2v ?? 2, dark: true, fmt: (v) => num(v, 1) + ' V', onChange: (v) => { S.d2v = v; save(); } });
    const es = inst(box, 'ELEMENT', false);
    segGroup(es.c, [['R', 'R 100 Ω'], ['L', 'L 10 mH'], ['C', 'C 1 µF']], S.d2el || 'L', (v) => { S.d2el = v; save(); });
    segGroup(es.c, [[false, 'Ideal'], [true, 'Real']], !!S.d2real, (v) => { S.d2real = v; save(); });
    const show = meterBox(box, 'V–A–PHASE METER');
    const P = () => ({ el: S.d2el || 'L', real: !!S.d2real, f: kF.value, Vs: kV.value });
    let cur = null, lastK = '';
    const plot = new Lab.Plot($('#d2plot'), { xlabel: 'log₁₀ f  (Hz)', ylabel: 'log₁₀ |Z|  (Ω)' });
    const plotPh = new Lab.Plot($('#d2plotph'), { xlabel: 'log₁₀ f  (Hz)', ylabel: 'θ  (°)' });
    const COL = { R: '#444', L: '#0b5cad', C: '#1a8a4a' };
    $('#d2theo').onchange = () => { if ($('#d2theo').checked) { S.fl.d2theo = true; save(); } drawPlots(); };
    function drawPlots() {
      const s1 = [], s2 = [];
      if ($('#d2theo').checked) ['R', 'L', 'C'].forEach((el) => {
        const pts = [], pp = []; for (let k = 0; k <= 100; k++) { const lf = Math.log10(20) + (k / 100) * (5 - Math.log10(20)), Z = ELZ(el, 2 * Math.PI * Math.pow(10, lf), false); pts.push([lf, Math.log10(C.abs(Z))]); pp.push([lf, C.ang(Z)]); }
        s1.push({ pts, line: true, color: COL[el], dash: [6, 4], width: 1.5 }); s2.push({ pts: pp, line: true, color: COL[el], dash: [6, 4], width: 1.5 });
      });
      ['R', 'L', 'C'].forEach((el) => { const rows = S.d2rows.filter((r) => r.el === el); s1.push({ pts: rows.map((r) => [Math.log10(r.f), Math.log10(r.V / r.I)]), dots: true, color: COL[el] }); s2.push({ pts: rows.map((r) => [Math.log10(r.f), r.th]), dots: true, color: COL[el] }); });
      plot.draw(s1, [1.2, 5.05], [-0.5, 4.5]); plotPh.draw(s2, [1.2, 5.05], [-100, 100]);
    }
    function update() {
      const p = P(), k = JSON.stringify(p);
      if (k !== lastK || !cur) { lastK = k; cur = acMeas(p.Vs, ELZ(p.el, 2 * Math.PI * p.f, p.real)); show(cur); }
    }
    const tbody = $('#d2tab tbody');
    function table() { tbody.innerHTML = S.d2rows.map((r, i) => `<tr><td>${i + 1}</td><td>${ELN[r.el]}${r.real ? '*' : ''}</td><td>${num(r.f, r.f < 100 ? 1 : 0)}</td><td>${num(r.V, 3)}</td><td>${eng(r.I, 'A')}</td><td>${num(r.th, 1)}</td><td>${num(r.V / r.I, 2)}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; drawPlots(); }
    function rec() { if (!cur) return; const p = P(); S.d2rows.push({ el: p.el, real: p.real, f: rnd(p.f, 4), V: cur.V, I: cur.I, th: cur.th }); save(); table(); Lab.toast('Recorded: f = ' + eng(p.f, 'Hz', 4) + ', |Z| = ' + num(cur.V / cur.I, 2) + ' Ω'); }
    $('#d2rec').onclick = rec; $('#d2del').onclick = () => { S.d2rows.pop(); save(); table(); };
    $('#d2csv').onclick = () => Lab.downloadCSV('d2_hafta02_deney2.csv', ['#', 'element', 'model', 'f (Hz)', 'Vrms (V)', 'Irms (A)', 'theta (deg)', '|Z| (ohm)'], S.d2rows.map((r, i) => [i + 1, r.el, r.real ? 'real' : 'ideal', r.f, r.V, r.I, r.th, +(r.V / r.I).toFixed(3)]));
    table();
    return { update, rec, sc: { dirty: true } };
  })();
  XP.d2 = D2;
  const span = (el) => { const fs = S.d2rows.filter((r) => r.el === el).map((r) => r.f); return fs.length >= 5 && Math.max(...fs) / Math.min(...fs) >= 100; };
  steps('d2', [
    { t: 'For the <b>resistor</b>, record measurements at <b>at least 5</b> frequencies spanning at least two decades (e.g. 100 Hz–10 kHz).', test: () => span('R') },
    { t: 'Do the same sweep for the <b>inductor</b>.', test: () => span('L') },
    { t: 'Do the same sweep for the <b>capacitor</b>.', test: () => span('C') },
    { t: 'Turn on the <b>theoretical curves</b> and compare with your measurements. Are the slopes +1 and −1?', test: () => !!S.fl.d2theo },
    { t: '<b>Design:</b> Find the frequency at which |Z<sub>L</sub>| = |Z<sub>C</sub>|; at that frequency (±3%) record both an L and a C measurement.', test: () => S.d2rows.some((a) => a.el === 'L' && S.d2rows.some((b) => b.el === 'C' && Math.abs(a.f / b.f - 1) < 0.03 && Math.abs((a.V / a.I) / (b.V / b.I) - 1) < 0.06)) },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'What is the slope of the log|Z| – log f line in your inductor data? (from two distant points)', answer: 1, tol: 5, unit: '', explain: '|Z<sub>L</sub>| = 2πL·f ⇒ log|Z| = log f + log(2πL): slope +1. In a real inductor r<sub>L</sub> reduces the slope at low frequency.', hint: 'Δlog|Z| / Δlog f' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'From your data, what is the inductance of the inductor in mH?', answer: 10, tol: 3, unit: 'mH', explain: 'L = |Z|/(2πf). With the real model use the high-frequency points.', hint: 'L = |Z| / (2πf)' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 'From your data, what is the capacitance of the capacitor in µF?', answer: 1, tol: 3, unit: 'µF', explain: 'C = 1/(2πf|Z|).', hint: 'C = 1/(2πf|Z|)' });
  numq('d2', '#d2Q', { id: 'd2q4', q: 'At what frequency in Hz is |Z<sub>L</sub>| = |Z<sub>C</sub>|?', answer: 1 / (2 * Math.PI * Math.sqrt(0.01 * 1e-6)), tol: 3, unit: 'Hz', explain: 'ωL = 1/(ωC) ⇒ f = 1/(2π√(LC)) = 1591.5 Hz. In a few weeks this frequency will reappear as resonance.', hint: 'ω = 1/√(LC)' });
  mcq('d2', '#d2Q', { id: 'd2q5', q: 'In your measurement, how did the angle and |Z| of the resistor change with frequency?', opts: ['|Z| increased with frequency', '|Z| constant, θ ≈ 0°', '|Z| decreased, θ = −90°', 'θ rose from 0° to 90° with frequency'], correct: 1, explain: 'The impedance of an ideal resistor is real and independent of frequency (at very high frequency the small parasitic inductance of real resistors may appear).', hint: 'The grey points on the graph.' });

  /* ================= DENEY 3 · Empedans düzlemi ================= */
  const TOP = { sRLC: 'Series R–L–C', sRL: 'Series R–L', pRC: 'Parallel R ∥ C', pRL: 'Parallel R ∥ L' };
  const zTop = (p, w) => {
    const ZR = [p.R, 0], ZL = [0, w * p.L], ZC = [0, -1 / (w * p.C)];
    if (p.top === 'sRLC') return C.add(C.add(ZR, ZL), ZC);
    if (p.top === 'sRL') return C.add(ZR, ZL);
    const Y = C.add(C.div([1, 0], ZR), C.div([1, 0], p.top === 'pRC' ? ZC : ZL)); return C.div([1, 0], Y);
  };
  const D3 = (() => {
    const box = $('#d3inst');
    const am = inst(box, 'AC POWER AMPLIFIER', true, 'I ≤ 1 A');
    const kVm = new Lab.Knob(am.c, { label: 'Vm', min: 1, max: 50, step: 1, value: S.d3v ?? 10, dark: true, fmt: (v) => num(v, 0) + ' V', onChange: (v) => { S.d3v = v; save(); } });
    kVm.el.querySelector('.kl').innerHTML = 'V<sub>m</sub> (peak)';
    const kW = new Lab.Knob(am.c, { label: 'ω', min: 100, max: 1e4, log: true, value: S.d3w ?? 1000, dark: true, size: 62, fmt: (v) => num(v, 0) + ' r/s', onChange: (v) => { S.d3w = v; save(); } });
    const tb = inst(box, 'CIRCUIT', false);
    segGroup(tb.c, Object.entries(TOP), S.d3top || 'sRLC', (v) => { S.d3top = v; save(); });
    const ek = inst(box, 'ELEMENT BOXES', false);
    const kR = new Lab.Knob(ek.c, { label: 'R', list: [10, 20, 25, 30, 40, 50, 75, 100, 200], value: S.d3R ?? 30, fmt: Lab.ohm, onChange: (v) => { S.d3R = v; save(); } });
    const kL = new Lab.Knob(ek.c, { label: 'L', list: [0.01, 0.02, 0.03, 0.06, 0.1, 0.2], value: S.d3L ?? 0.06, fmt: (v) => eng(v, 'H'), onChange: (v) => { S.d3L = v; save(); } });
    const kC = new Lab.Knob(ek.c, { label: 'C', list: [1e-6, 2.2e-6, 5e-6, 1e-5, 2e-5, 5e-5, 1e-4], value: S.d3C ?? 5e-5, fmt: (v) => eng(v, 'F'), onChange: (v) => { S.d3C = v; save(); } });
    const show = meterBox(box, 'V–A–PHASE METER');
    const P = () => ({ top: S.d3top || 'sRLC', R: kR.value, L: kL.value, C: kC.value, w: kW.value, Vm: kVm.value });
    // şema
    const g = $('#d3sch'), sg = E('g', {}, g), tW = sch.t(g, 380, 192, '', 'val');
    function drawSch(p) {
      sg.innerHTML = '';
      sch.src(sg, 70, 100); sch.w(sg, [[70, 80], [70, 40], [160, 40]]); sch.w(sg, [[70, 120], [70, 160], [640, 160]]); sch.gnd(sg, 360, 160);
      const lr = (x, t) => sch.t(sg, x, 25, t, 'lbl');
      if (p.top[0] === 's') {
        sch.rH(sg, 160, 260, 40); lr(210, 'R = ' + Lab.ohm(p.R));
        sch.w(sg, [[260, 40], [300, 40]]); sch.lH(sg, 300, 420, 40); lr(360, 'L = ' + eng(p.L, 'H'));
        if (p.top === 'sRLC') { sch.w(sg, [[420, 40], [500, 40]]); E('path', { d: 'M500,40 H535 M535,22 v36 M545,22 v36 M545,40 H600', class: 'w' }, sg); lr(540, 'C = ' + eng(p.C, 'F')); sch.w(sg, [[600, 40], [640, 40], [640, 160]]); }
        else sch.w(sg, [[420, 40], [640, 40], [640, 160]]);
      } else {
        sch.w(sg, [[160, 40], [520, 40]]); sch.dot(sg, 300, 40); sch.dot(sg, 500, 40); sch.dot(sg, 300, 160); sch.dot(sg, 500, 160);
        sch.rV(sg, 300, 40, 160); sch.t(sg, 315, 105, 'R = ' + Lab.ohm(p.R), 'lbl', 'start');
        if (p.top === 'pRC') { sch.cV(sg, 500, 40, 160); sch.t(sg, 525, 105, 'C = ' + eng(p.C, 'F'), 'lbl', 'start'); } else { sch.lV(sg, 500, 40, 160); sch.t(sg, 515, 105, 'L = ' + eng(p.L, 'H'), 'lbl', 'start'); }
      }
      E('circle', { cx: 120, cy: 40, r: 9, fill: '#fff', class: 'w' }, sg); sch.t(sg, 120, 44, 'A', 'lbl');
    }
    // kompleks düzlem
    const cp = $('#d3cp'), cg = E('g', {}, cp);
    segGroup($('#d3view'), [['Z', 'Z plane (Ω)'], ['Y', 'Y plane (S)']], S.d3view || 'Z', (v) => { S.d3view = v; if (v === 'Y') S.fl.d3y = true; save(); drawCP(); });
    $('#d3theo').onchange = () => { if ($('#d3theo').checked) { S.fl.d3theo = true; save(); } drawCP(); };
    const zOf = (r) => C.pol(r.V / r.I, r.th);
    function drawCP() {
      cg.innerHTML = '';
      const p = P(), isY = (S.d3view || 'Z') === 'Y';
      const conv = (z) => (isY ? C.div([1, 0], z) : z);
      const rows = S.d3rows.filter((r) => r.top === p.top), pts = rows.map((r) => conv(zOf(r)));
      let theo = [];
      if ($('#d3theo').checked) for (let k = 0; k <= 160; k++) { const w = 100 * Math.pow(100, k / 160); theo.push(conv(zTop(p, w))); }
      const all = pts.concat(theo, [conv(zTop(p, p.w))]);
      let m = Math.max(1e-9, ...all.map((z) => Math.max(Math.abs(z[0]), Math.abs(z[1])))); m = Math.min(m, isY ? 1 : 1e4) * 1.15;
      const OX = 200, OY = 180, K = 160 / m, X = (z) => OX + z[0] * K, Y = (z) => clamp(OY - z[1] * K, 4, 356);
      E('line', { x1: 10, y1: OY, x2: 390, y2: OY, stroke: '#aab' }, cg); E('line', { x1: OX, y1: 6, x2: OX, y2: 354, stroke: '#aab' }, cg);
      sch.t(cg, 386, OY - 6, isY ? 'G' : 'R', 'lbl', 'end'); sch.t(cg, OX + 6, 18, isY ? 'jB' : 'jX', 'lbl', 'start');
      sch.t(cg, 386, OY + 16, (isY ? eng(m / 1.15, 'S') : eng(m / 1.15, 'Ω')), 'lbl', 'end');
      if (theo.length) E('polyline', { points: theo.map((z) => X(z) + ',' + Y(z)).join(' '), fill: 'none', stroke: '#e07a10', 'stroke-dasharray': '5 4', 'stroke-width': 2 }, cg);
      pts.forEach((z, i) => { E('circle', { cx: X(z), cy: Y(z), r: 5, fill: '#0b5cad' }, cg); sch.t(cg, X(z) + 7, Y(z) - 5, String(S.d3rows.indexOf(rows[i]) + 1), 'lbl', 'start').style.fontSize = '11px'; });
      sch.t(cg, 12, 352, TOP[p.top] + ' · ' + (isY ? 'Y = 1/Z' : 'Z') + ' · numbers = table rows', 'lbl', 'start').style.fontSize = '11px';
    }
    let cur = null, lastK = '';
    function update() {
      const p = P(), k = JSON.stringify(p);
      if (k !== lastK || !cur) { lastK = k; drawSch(p); cur = acMeas(p.Vm / Math.SQRT2, zTop(p, p.w)); show(cur); tW.textContent = 'ω = ' + num(p.w, 0) + ' rad/s (f = ' + num(p.w / (2 * Math.PI), 1) + ' Hz), v_s = ' + p.Vm + ' cos ωt V'; drawCP(); }
    }
    const tbody = $('#d3tab tbody');
    function table() { tbody.innerHTML = S.d3rows.map((r, i) => `<tr><td>${i + 1}</td><td class="l">${TOP[r.top]} (${Lab.ohm(r.R)}${r.top !== 'pRC' ? ', ' + eng(r.L, 'H') : ''}${r.top === 'sRLC' || r.top === 'pRC' ? ', ' + eng(r.C, 'F') : ''})</td><td>${num(r.w, 0)}</td><td>${num(r.V, 3)}</td><td>${eng(r.I, 'A')}</td><td>${num(r.th, 1)}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; drawCP(); }
    function rec() { if (!cur) return; const p = P(); S.d3rows.push({ ...p, w: rnd(p.w, 4), V: cur.V, I: cur.I, th: cur.th }); save(); table(); Lab.toast('Recorded: ' + TOP[p.top] + ', ω = ' + num(p.w, 0) + ' rad/s'); }
    $('#d3rec').onclick = rec; $('#d3del').onclick = () => { S.d3rows.pop(); save(); table(); };
    $('#d3csv').onclick = () => Lab.downloadCSV('d2_hafta02_deney3.csv', ['#', 'circuit', 'R (ohm)', 'L (H)', 'C (F)', 'omega (rad/s)', 'Vrms (V)', 'Irms (A)', 'theta (deg)'], S.d3rows.map((r, i) => [i + 1, r.top, r.R, r.L, r.C, r.w, r.V, r.I, r.th]));
    table();
    const ex16 = (r) => r.top === 'sRLC' && r.R === 30 && r.L === 0.06 && r.C === 5e-5 && near(r.w, 1000, 5);
    const ex17 = (r) => r.top === 'pRC' && r.R === 50 && r.C === 1e-5 && near(r.w, 2000, 10);
    return { update, rec, sc: { dirty: true }, ex16, ex17 };
  })();
  XP.d3 = D3;
  steps('d3', [
    { t: 'Example 1.16: <b>series RLC</b>, R = 30 Ω, L = 60 mH, C = 50 µF, <b>ω = 1000 rad/s</b>, V<sub>m</sub> = 50 V. Record the measurement.', test: () => S.d3rows.some(D3.ex16) },
    { t: 'Example 1.17: <b>R = 50 Ω ∥ C = 10 µF</b>, <b>ω = 2000 rad/s</b>. Record the measurement.', test: () => S.d3rows.some(D3.ex17) },
    { t: 'Sweep ω in the Example 1.16 circuit: record <b>at least 6</b> measurements in total from the θ &lt; 0 and θ &gt; 0 regions.', test: () => { const L = S.d3rows.filter((r) => r.top === 'sRLC' && r.R === 30 && r.L === 0.06 && r.C === 5e-5); return L.length >= 6 && L.some((r) => r.th < -5) && L.some((r) => r.th > 5); } },
    { t: 'Also examine your points in the <b>Y plane</b>. What did the straight line of the series RLC in Z turn into in Y?', test: () => !!S.fl.d3y },
    { t: 'Turn on the <b>theoretical locus</b> and compare with your measurements.', test: () => !!S.fl.d3theo },
  ]);
  numq('d3', '#d3Q', { id: 'd3q1', q: 'From your Example 1.16 measurement, what is |Z| in Ω?', answer: 50, tol: 2, unit: 'Ω', explain: 'Z = 30 + j60 − j20 = 30 + j40 = 50∠53.13° Ω.', hint: 'V<sub>rms</sub>/I<sub>rms</sub>' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'In the same measurement, what is the reactance X = |Z| sin θ in Ω?', answer: 40, tol: 3, unit: 'Ω', explain: 'X = X<sub>L</sub> + X<sub>C</sub> = 60 − 20 = 40 Ω > 0: the circuit is inductive.', hint: 'Z = |Z|cos θ + j|Z|sin θ' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'In Example 1.16, what is the peak current I<sub>m</sub> in A?', answer: 1, tol: 2, unit: 'A', explain: 'I = 50∠0°/50∠53.13° = 1∠−53.13° A. The ammeter reads rms (0.707 A)!', hint: 'I<sub>m</sub> = √2·I<sub>rms</sub>' });
  numq('d3', '#d3Q', { id: 'd3q4', q: 'From your Example 1.17 measurement, what is the susceptance B in S?', answer: 0.02, tol: 3, unit: 'S', explain: 'Y = 1/R + jωC = 0.02 + j0.02 S. B &gt; 0: capacitive admittance.', hint: 'Y = 1/Z ⇒ |Y| = I/V, angle −θ.' });
  numq('d3', '#d3Q', { id: 'd3q5', q: 'In Example 1.17, what is the real part of the equivalent impedance in Ω?', answer: 25, tol: 3, unit: 'Ω', explain: 'Z = 1/(0.02 + j0.02) = 25 − j25 Ω. Note: although the parallel R = 50 Ω, the real part of Z is 25 Ω.', hint: '|Z|cos θ' });
  mcq('d3', '#d3Q', { id: 'd3q6', q: 'When ω is swept in a series RLC, which curve does the Z point trace on the complex plane?', opts: ['A circle centered at the origin', 'A vertical line with Re{Z} = R', 'A segment on the real axis', 'A parabola'], correct: 1, explain: 'Z = R + j(ωL − 1/ωC): the real part is constant, the imaginary part goes from −∞ to +∞. In the Y plane this line becomes a circle of diameter 1/R.', hint: 'Which part depends on ω?' });

  /* ================= DENEY 4 · Bilinmeyen eleman ve ESR ================= */
  const D4 = (() => {
    const box = $('#d4inst');
    const am = inst(box, 'AC POWER AMPLIFIER', true, 'I ≤ 1 A');
    const kF = new Lab.Knob(am.c, { label: 'FREQUENCY', min: 20, max: 1e5, log: true, value: S.d4f ?? 1000, dark: true, size: 62, fmt: (v) => eng(v, 'Hz', 4), onChange: (v) => { S.d4f = v; save(); } });
    const kV = new Lab.Knob(am.c, { label: 'V rms', min: 0.1, max: 5, step: 0.1, value: S.d4v ?? 1, dark: true, fmt: (v) => num(v, 1) + ' V', onChange: (v) => { S.d4v = v; save(); } });
    const bs = inst(box, 'BLACK BOX', false);
    segGroup(bs.c, [['X', 'Box X (?)'], ['Y', 'Box Y (capacitor)']], S.d4box || 'X', (v) => { S.d4box = v; save(); });
    const show = meterBox(box, 'V–A–PHASE METER');
    const ux = S.ux;
    const zX = (w) => ux.t === 'R' ? [ux.v, 0] : ux.t === 'L' ? [ux.v * 400, w * ux.v] : [0.02, -1 / (w * ux.v)];
    const zY = (w) => [S.esr, -1 / (w * S.cy)];
    const P = () => ({ box: S.d4box || 'X', f: kF.value, Vs: kV.value });
    const g = $('#d4sch');
    sch.src(g, 80, 90); sch.w(g, [[80, 70], [80, 40], [420, 40]]); sch.w(g, [[80, 110], [80, 140], [420, 140]]); sch.gnd(g, 250, 140);
    E('circle', { cx: 180, cy: 40, r: 10, fill: '#fff', class: 'w' }, g); sch.t(g, 180, 44, 'A');
    const bx = E('rect', { x: 380, y: 60, width: 80, height: 60, rx: 6, fill: '#333', stroke: '#111' }, g); const bt = sch.t(g, 420, 95, '?', 'lbl'); bt.style.fill = '#fff';
    sch.w(g, [[420, 40], [420, 60]]); sch.w(g, [[420, 120], [420, 140]]);
    sch.w(g, [[420, 40], [560, 40], [560, 70]]); sch.w(g, [[420, 140], [560, 140], [560, 110]]); E('circle', { cx: 560, cy: 90, r: 18, fill: '#fff', class: 'w' }, g); sch.t(g, 560, 95, 'V'); sch.t(g, 600, 95, 'phase meter: θ = θ_v − θ_i', 'lbl', 'start');
    let cur = null, lastK = '';
    const plot = new Lab.Plot($('#d4plot'), { xlabel: 'log₁₀ f  (Hz)', ylabel: 'θ  (°)' });
    function drawPlot() { const rows = S.d4rows.filter((r) => r.box === 'Y'); plot.draw([{ pts: rows.map((r) => [Math.log10(r.f), r.th]), dots: true, color: '#1a8a4a' }], [1.2, 5.05], [-95, 5]); }
    function update() {
      const p = P(), k = JSON.stringify(p);
      if (k !== lastK || !cur) { lastK = k; const w = 2 * Math.PI * p.f; cur = acMeas(p.Vs, p.box === 'X' ? zX(w) : zY(w)); show(cur); bt.textContent = p.box === 'X' ? 'X ?' : 'Y'; bx.setAttribute('fill', p.box === 'X' ? '#333' : '#2c5a8a'); }
    }
    const tbody = $('#d4tab tbody');
    function table() { tbody.innerHTML = S.d4rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.box}</td><td>${num(r.f, r.f < 100 ? 1 : 0)}</td><td>${num(r.V, 3)}</td><td>${eng(r.I, 'A')}</td><td>${num(r.th, 1)}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; drawPlot(); }
    function rec() { if (!cur) return; const p = P(); S.d4rows.push({ box: p.box, f: rnd(p.f, 4), V: cur.V, I: cur.I, th: cur.th }); save(); table(); Lab.toast('Recorded: box ' + p.box + ', f = ' + eng(p.f, 'Hz', 4)); }
    $('#d4rec').onclick = rec; $('#d4del').onclick = () => { S.d4rows.pop(); save(); table(); };
    $('#d4csv').onclick = () => Lab.downloadCSV('d2_hafta02_deney4.csv', ['#', 'box', 'f (Hz)', 'Vrms (V)', 'Irms (A)', 'theta (deg)'], S.d4rows.map((r, i) => [i + 1, r.box, r.f, r.V, r.I, r.th]));
    table();
    return { update, rec, sc: { dirty: true } };
  })();
  XP.d4 = D4;
  steps('d4', [
    { t: 'Measure and record <b>Box X</b> at <b>at least 3 frequencies</b> spread over at least one decade.', test: () => { const fs = S.d4rows.filter((r) => r.box === 'X').map((r) => r.f); return fs.length >= 3 && Math.max(...fs) / Math.min(...fs) >= 10; } },
    { t: 'Measure and record <b>Box Y</b> at low frequency (f ≤ 100 Hz): how close is θ to −90°?', test: () => S.d4rows.some((r) => r.box === 'Y' && r.f <= 100) },
    { t: 'Measure and record Box Y at high frequency (f ≥ 20 kHz): where did θ move?', test: () => S.d4rows.some((r) => r.box === 'Y' && r.f >= 2e4) },
    { t: 'Take measurements of Box Y at <b>at least 6</b> frequencies in total and complete the θ–f graph.', test: () => S.d4rows.filter((r) => r.box === 'Y').length >= 6 },
  ]);
  const UXT = ['R', 'L', 'C'];
  mcq('d4', '#d4Q', { id: 'd4q1', q: 'What type of element is in Box X?', opts: ['Resistor', 'Inductor', 'Capacitor', 'Cannot be determined'], correct: UXT.indexOf(S.ux.t), explain: 'The sign of the angle and the direction in which |Z| changes with frequency determine the type with certainty.', hint: 'Look at the sign of θ and whether |Z| increases or decreases as f increases.' });
  numq('d4', '#d4Q', { id: 'd4q2', q: 'What is the value of Box X? (in Ω if a resistor, mH if an inductor, µF if a capacitor)', answer: () => (S.ux.t === 'R' ? S.ux.v : S.ux.t === 'L' ? S.ux.v * 1e3 : S.ux.v * 1e6), tol: 4, unit: 'Ω / mH / µF', explain: 'R = |Z|; L = |Z|sin θ/(2πf); C = 1/(2πf|Z|sin|θ|). Since an inductor has winding resistance, it is more accurate to use the reactive component (|Z|sin θ).', hint: 'Start from the reactance X = |Z| sin θ.' });
  numq('d4', '#d4Q', { id: 'd4q3', q: 'What is the capacitance of Box Y in µF? (from the low-frequency measurement)', answer: () => S.cy * 1e6, tol: 4, unit: 'µF', explain: 'At low frequency X<sub>C</sub> ≫ ESR: C = 1/(2πf|X|).', hint: 'C = 1/(2πf·|Z|sin|θ|)' });
  numq('d4', '#d4Q', { id: 'd4q4', q: 'What is the ESR of Box Y in Ω? (from the high-frequency measurement)', answer: () => S.esr, tol: 10, unit: 'Ω', explain: 'ESR = Re{Z} = |Z| cos θ. At high frequency θ approaches zero, so cos θ is measured with good sensitivity.', hint: '|Z| cos θ' });
  numq('d4', '#d4Q', { id: 'd4q5', q: 'What is the dissipation factor D = tan δ = ωC·ESR of Box Y at 1 kHz?', answer: () => 2 * Math.PI * 1000 * S.cy * S.esr, tol: 12, unit: '', explain: 'D = ESR/|X<sub>C</sub>|; δ = 90° − |θ|. For a good film capacitor D ≈ 0.001, for an electrolytic 0.05–0.2.', hint: 'Calculate with the C and ESR you found, or tan(90° − |θ|).' });
  mcq('d4', '#d4Q', { id: 'd4q6', q: 'Why does θ of Box Y shift from −90° toward 0° as the frequency increases?', opts: ['Capacitance increases with frequency', '1/(ωC) becomes small and the constant ESR becomes dominant in the total impedance', 'Meter error', 'The capacitor turns into an inductor'], correct: 1, explain: 'tan θ = −1/(ωC·ESR). At much higher frequency the inductance of the leads (ESL) comes into play and θ can become positive: the self-resonance of the capacitor.', hint: 'Z = ESR − j/(ωC): which term depends on frequency?' });

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
      <h2 style="margin:0">Circuit Theory II · Virtual Lab · Week 2 Report</h2>
      <p><b>Topic:</b> V–I relation in R, L, C elements, impedance, admittance and real components (Section 1.4)</p>
      <table class="data" style="width:auto"><tr><th>Full name</th><td class="l">${S.st.name || ''}</td><th>ID</th><td class="l">${S.st.no || ''}</td><th>Group</th><td class="l">${S.st.group || ''}</td><th>Date</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Summary</h3>
      <p>Lab-sheet steps completed: <b>${sOk}/${sTot}</b> · Correct answers: <b>${ok}/${tot}</b> · Score: <b>${Math.round((50 * sOk) / sTot + (50 * ok) / tot)}/100</b></p>
      <h3>Answers</h3>
      <table class="data"><thead><tr><th>Section</th><th>Question</th><th>Answer</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Experiment 1 · V–I phase relation</h3>${tb('#d1tab')}
      <h3>Experiment 2 · Frequency sweep</h3>${tb('#d2tab')}
      <h3>Experiment 3 · Impedance and admittance</h3>${tb('#d3tab')}
      <h3>Experiment 4 · Unknown element and ESR</h3>${tb('#d4tab')}
      <h3>Graphs</h3>
      <div>${img(D1.sc.cv)} ${img($('#d2plot'))}</div><div>${img($('#d2plotph'))} ${img($('#d4plot'))}</div><div style="width:48%;border:1px solid #ccc">${$('#d3cp').outerHTML}</div>
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

  function loop() {
    if (XP[S.page]) { XP[S.page].update(); evalSteps(S.page); }
    if (S.page === 'onbilgi') PH.start();
    requestAnimationFrame(loop);
  }
  ['d1', 'd2', 'd3', 'd4'].forEach(evalSteps);
  go(S.page); progress(); loop();
})();

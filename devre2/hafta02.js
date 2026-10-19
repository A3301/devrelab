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
    w.innerHTML = `<div class="brand"><span>DSO-2C · Dijital Osiloskop</span><span><span class="led on g"></span> <span class="runst">${o.mode || 'RUN'}</span></span></div>
      <div class="row" style="align-items:flex-start;flex-wrap:nowrap"><canvas width="640" height="400" style="width:100%;max-width:640px"></canvas>
      <div style="min-width:160px"><div class="ctrls"></div><div class="row btns" style="margin:6px 0;gap:4px"></div><div class="meas"></div></div></div>`;
    host.appendChild(w);
    const cv = w.querySelector('canvas'), sc = new Lab.Scope(cv), sk = w.querySelector('.ctrls'), bt = w.querySelector('.btns'), me = w.querySelector('.meas');
    const self = { sc, cv, dirty: true, bt, runEl: w.querySelector('.runst') };
    const set = () => { self.dirty = true; };
    sc.ch[0].vdiv = o.v1; sc.ch[1].vdiv = o.v2; sc.tdiv = o.t; sc.ch[0].pos = o.p1 || 0; sc.ch[1].pos = o.p2 || 0;
    self.k1 = new Lab.Knob(sk, { label: 'CH1 V/d', list: VDIV, value: o.v1, dark: true, size: 40, fmt: (v) => eng(v, 'V'), onChange: (v) => { sc.ch[0].vdiv = v; set(); } });
    self.k2 = new Lab.Knob(sk, { label: o.l2 || 'CH2 V/d', list: VDIV, value: o.v2, dark: true, size: 40, fmt: (v) => eng(v, o.u2 || 'V'), onChange: (v) => { sc.ch[1].vdiv = v; set(); } });
    self.kt = new Lab.Knob(sk, { label: 'ZAMAN/d', list: TDIV, value: o.t, dark: true, size: 40, fmt: (v) => eng(v, 's'), onChange: (v) => { sc.tdiv = v; set(); } });
    self.kp1 = new Lab.Knob(sk, { label: 'CH1 konum', list: POS, value: o.p1 || 0, dark: true, size: 34, fmt: (v) => num(v, 0) + ' d', onChange: (v) => { sc.ch[0].pos = v; set(); } });
    self.kp2 = new Lab.Knob(sk, { label: 'CH2 konum', list: POS, value: o.p2 || 0, dark: true, size: 34, fmt: (v) => num(v, 0) + ' d', onChange: (v) => { sc.ch[1].pos = v; set(); } });
    const b1 = segBtn(bt, 'CH1', true), b2 = segBtn(bt, 'CH2', o.ch2 !== false), bc = segBtn(bt, 'İMLEÇ', false);
    sc.ch[1].on = o.ch2 !== false;
    b1.onclick = () => { sc.ch[0].on = !sc.ch[0].on; b1.classList.toggle('on', sc.ch[0].on); set(); };
    b2.onclick = () => { sc.ch[1].on = !sc.ch[1].on; b2.classList.toggle('on', sc.ch[1].on); set(); };
    bc.onclick = () => { sc.cur.on = !sc.cur.on; bc.classList.toggle('on', sc.cur.on); set(); };
    const pre = !!o.pre;
    self.tc = (x) => (x - (pre ? 1 : 0)) * sc.tdiv;
    self.show = () => {
      const m = sc.measure(); if (!m) return; self.m = m;
      const [a, b] = m.ch;
      let h = `<span style="color:#f2d21b">CH1</span> V<sub>pp</sub> ${eng(a.vpp, 'V')}<br>&nbsp;&nbsp;maks ${eng(a.max, 'V')}`;
      if (sc.ch[1].on) h += `<br><span style="color:#27c4f0">CH2</span> V<sub>pp</sub> ${eng(b.vpp, o.u2 || 'V')}<br>&nbsp;&nbsp;maks ${eng(b.max, o.u2 || 'V')}`;
      if (o.freq !== false && isFinite(a.f)) h += `<br>CH1 f ≈ ${eng(a.f, 'Hz', 3)}`;
      if (m.cur) {
        const c = m.cur;
        h += `<br><span style="color:#ff7cf0">İMLEÇ A</span>${pre ? ' t ' + eng(self.tc(sc.cur.a), 's') : ''}<br>&nbsp;CH1 ${eng(c.v1a, 'V')} · CH2 ${eng(c.v2a, o.u2 || 'V')}` +
          `<br><span style="color:#ff7cf0">İMLEÇ B</span>${pre ? ' t ' + eng(self.tc(sc.cur.b), 's') : ''}<br>&nbsp;CH1 ${eng(c.v1b, 'V')} · CH2 ${eng(c.v2b, o.u2 || 'V')}<br>Δt = t<sub>B</sub>−t<sub>A</sub> ${eng(c.dt, 's')}<br>1/Δt ${eng(1 / Math.abs(c.dt), 'Hz')}`;
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
      if (!S.steps[id] && s.test()) { S.steps[id] = true; save(); Lab.toast('✔ Adım tamamlandı: ' + s.t.replace(/<[^>]+>/g, '').slice(0, 70)); progress(); }
      lis[i].classList.toggle('done', !!S.steps[id]);
    });
  }
  const qids = { onhaz: [], d1: [], d2: [], d3: [], d4: [] };
  function progress() {
    let tot = 0, ok = 0;
    Object.keys(stepDefs).forEach((k) => stepDefs[k].forEach((_, i) => { tot++; if (S.steps[k + '_' + i]) ok++; }));
    Object.values(qids).flat().forEach((q) => { tot++; if (S.answers[q] && S.answers[q].ok) ok++; });
    const p = Math.round((100 * ok) / tot);
    $('#prog').style.width = p + '%'; $('#progTxt').textContent = '%' + p;
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
    const e = $('#' + id); e.value = S.st[k] || (k === 'date' ? new Date().toLocaleDateString('tr-TR') : '');
    e.addEventListener('input', () => { S.st[k] = e.value; save(); });
  });

  /* ================= ortak AC modelleri ================= */
  const LIST_FL = [20, 50, 100, 200, 500, 1000, 2000, 5000, 1e4, 2e4, 5e4, 1e5];
  const ELN = { R: 'Direnç', L: 'Bobin', C: 'Kondansatör' };
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
    const v = lcd(m.el, 'V<sub>rms</sub> (eleman)', 'V', 130), i = lcd(m.el, 'I<sub>rms</sub>', 'mA', 130), t = lcd(m.el, 'FAZ θ<sub>v</sub> − θ<sub>i</sub>', '°', 130);
    const warn = document.createElement('div'); warn.style.cssText = 'font-size:11px;color:#c62828;font-weight:700;min-height:14px'; m.el.insertBefore(warn, m.c);
    return (r) => { v(num(r.V, 3)); if (r.I >= 0.1) i(num(r.I, 3), 'A'); else i(num(r.I * 1e3, 3), 'mA'); t(num(r.th, 1)); warn.textContent = r.lim ? 'AKIM SINIRI (1 A)!' : ''; };
  }

  /* ================= ÖN BİLGİ · V–I fazörleri ve Z düzlemi ================= */
  const OB = (() => {
    const cv = $('#obAnim'), g = cv.getContext('2d'), W = cv.width, H = cv.height;
    let el = 'L', run = true, ang = 0, last = 0, on = false;
    segGroup($('#obSel'), [['R', 'Direnç'], ['L', 'Bobin'], ['C', 'Kondansatör']], el, (v) => { el = v; S.fl.ob = true; save(); });
    $('#obRun').onclick = () => { run = !run; $('#obRun').textContent = run ? 'Durdur' : 'Sürdür'; };
    function arrow(x1, y1, x2, y2, c) { const a = Math.atan2(y2 - y1, x2 - x1); g.strokeStyle = g.fillStyle = c; g.lineWidth = 3; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - 11 * Math.cos(a - 0.4), y2 - 11 * Math.sin(a - 0.4)); g.lineTo(x2 - 11 * Math.cos(a + 0.4), y2 - 11 * Math.sin(a + 0.4)); g.fill(); }
    function frame(ts) {
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts; if (run) ang += dt * 2 * Math.PI * 0.2;
      const dv = { R: 0, L: Math.PI / 2, C: -Math.PI / 2 }[el], Vm = 0.9, Im = 0.6, cx = 130, cy = H / 2, R = 100;
      g.fillStyle = '#0e1726'; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1; g.beginPath(); g.moveTo(15, cy); g.lineTo(245, cy); g.moveTo(cx, 15); g.lineTo(cx, H - 15); g.stroke();
      arrow(cx, cy, cx + Vm * R * Math.cos(ang + dv), cy - Vm * R * Math.sin(ang + dv), '#f2d21b');
      arrow(cx, cy, cx + Im * R * Math.cos(ang), cy - Im * R * Math.sin(ang), '#27c4f0');
      g.fillStyle = '#dfe3ea'; g.font = '13px Segoe UI';
      g.fillText({ R: 'V ve I aynı fazda', L: 'V, I’dan 90° önde (ELI)', C: 'I, V’den 90° önde (ICE)' }[el], 12, 20);
      const x0 = 280, x1 = W - 12, sc = 95;
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.strokeRect(x0, 15, x1 - x0, H - 30); g.beginPath(); g.moveTo(x0, cy); g.lineTo(x1, cy); g.stroke();
      const tr = (amp, off, c) => { g.strokeStyle = c; g.lineWidth = 2.2; g.beginPath(); for (let x = x0; x <= x1; x += 2) { const a = ang - ((x1 - x) / (x1 - x0)) * 4 * Math.PI; const y = cy - amp * sc * Math.cos(a + off); x === x0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); };
      tr(Vm, dv, '#f2d21b'); tr(Im, 0, '#27c4f0');
      g.fillStyle = '#9fb3d1'; g.fillText('t →  (sağ kenar = şimdi)', x0 + 6, H - 22); g.fillText('v', x1 - 14, 32); g.fillStyle = '#27c4f0'; g.fillText('i', x1 - 26, 32);
      // gölgeler: fazörlerin gerçel izdüşümü sağ kenardaki değerdir
      g.setLineDash([3, 4]); g.strokeStyle = 'rgba(242,210,27,.5)'; const yv = cy - Vm * sc * Math.cos(ang + dv); g.beginPath(); g.moveTo(x1, yv); g.lineTo(x1 - 8, yv); g.stroke(); g.setLineDash([]);
      if (S.page === 'onbilgi') requestAnimationFrame(frame); else { on = false; last = 0; }
    }
    // Z düzlemi
    const zs = $('#obZ'), OX = 260, OY = 150, K = 0.5; // 1 px = 2 Ω
    E('line', { x1: 10, y1: OY, x2: 630, y2: OY, stroke: '#aab' }, zs); E('line', { x1: OX, y1: 8, x2: OX, y2: 292, stroke: '#aab' }, zs);
    sch.t(zs, 625, OY - 6, 'Re{Z} = R', 'lbl', 'end'); sch.t(zs, OX + 6, 20, 'Im{Z} = X  (endüktif +)', 'lbl', 'start'); sch.t(zs, OX + 6, 288, 'kapasitif −', 'lbl', 'start');
    const zg = E('g', {}, zs);
    function drawZ() {
      const w = Math.pow(10, +$('#obW').value), R = 100, L = 0.1, Cc = 10e-6;
      $('#obWv').textContent = 'ω = ' + num(w, 0) + ' rad/s';
      zg.innerHTML = '';
      const X = (r) => OX + r * K, Y = (x) => clamp(OY - x * K, 10, 290);
      const pt = (r, x, c, t) => { const yy = OY - x * K, off = yy < 10 || yy > 290; E('circle', { cx: X(r), cy: Y(x), r: 6, fill: c }, zg); sch.t(zg, X(r) + 10, Y(x) + 4, t + (off ? ' (ekran dışı)' : ''), 'val', 'start').style.fill = c; };
      E('line', { x1: X(R), y1: 10, x2: X(R), y2: 290, stroke: '#e07a10', 'stroke-dasharray': '5 4' }, zg);
      pt(R, 0, '#444', 'Z_R = ' + R + ' Ω');
      pt(0, w * L, '#0b5cad', 'Z_L = j' + num(w * L, 1));
      pt(0, -1 / (w * Cc), '#1a8a4a', 'Z_C = −j' + num(1 / (w * Cc), 1));
      pt(R, w * L, '#e07a10', 'seri RL: ' + R + ' + j' + num(w * L, 1));
      sch.t(zg, 14, 290, 'R = 100 Ω, L = 0,1 H, C = 10 µF', 'lbl', 'start');
    }
    $('#obW').addEventListener('input', () => { drawZ(); S.fl.obz = true; save(); });
    drawZ();
    return { start() { if (!on) { on = true; requestAnimationFrame(frame); } } };
  })();
  const PH = OB;

  /* ================= ÖN HAZIRLIK ================= */
  numq('onhaz', '#preQ', { id: 'p1', q: '1) Örnek 1.12: L = 20 mH, i = 5cos(1000t − 30°) A. v(t)’nin tepe değeri kaç V’tur?', answer: 100, tol: 1, unit: 'V', explain: 'Z<sub>L</sub> = j20 Ω; V = 20∠90° · 5∠−30° = 100∠60° V ⇒ v = 100cos(1000t + 60°).', hint: '|V| = ωL·I<sub>m</sub>' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) Örnek 1.13: C = 50 µF, v = 120cos(2000t + 15°) V. i(t)’nin faz açısı kaç derecedir?', answer: 105, tol: 1, unit: '°', explain: 'Z<sub>C</sub> = −j10 Ω; I = 120∠15°/10∠−90° = 12∠105° A. Akım gerilimden 90° önde.', hint: 'Bölmede açılar çıkarılır: 15° − (−90°).' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) Örnek 1.14: f = 50 Hz’de C = 10 µF’ın reaktansı X<sub>C</sub> kaç Ω’dur? (işaretiyle)', answer: -1 / (2 * Math.PI * 50 * 10e-6), tol: 1, unit: 'Ω', explain: 'X<sub>C</sub> = −1/(ωC) = −1/(314,16·10<sup>−5</sup>) = −318,3 Ω.', hint: 'Kapasitif reaktans negatiftir.' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) Örnek 1.15: L = 100 mH’nin f = 5 kHz’deki reaktansı kaç Ω’dur?', answer: 2 * Math.PI * 5000 * 0.1, tol: 1, unit: 'Ω', explain: 'X<sub>L</sub> = 2π·5000·0,1 = 3141,6 Ω; 50 Hz’deki 31,4 Ω’un tam 100 katı (X<sub>L</sub> ∝ f).', hint: 'ω = 2πf' });
  mcq('onhaz', '#preQ', { id: 'p5', q: '5) f = 100 Hz’de |Z<sub>L</sub>| = 20 Ω, |Z<sub>C</sub>| = 50 Ω. f = 1 kHz’de ne olur?', opts: ['20 Ω ve 50 Ω', '200 Ω ve 5 Ω', '2 Ω ve 500 Ω', '200 Ω ve 500 Ω'], correct: 1, explain: 'X<sub>L</sub> ∝ f, |X<sub>C</sub>| ∝ 1/f.', hint: 'Biri frekansla artar, diğeri azalır.' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) i = 3cos(ωt + 20°) A, v = 12cos(ωt + 110°) V. Eleman nedir?', opts: ['Direnç', 'Bobin', 'Kondansatör', 'Belirlenemez'], correct: 1, explain: 'θ = 110° − 20° = +90°: gerilim önde ⇒ bobin; Z = 4∠90° = j4 Ω, ωL = 4 Ω.', hint: 'θ<sub>v</sub> − θ<sub>i</sub>’nin işaretine bakın.' });

  /* ================= DENEY 1 · V–I faz ilişkisi ================= */
  const D1 = (() => {
    const box = $('#d1inst');
    const fg = inst(box, 'FG-2 · FONKSİYON ÜRETECİ', true, '50 Ω');
    const kF = new Lab.Knob(fg.c, { label: 'FREKANS', list: LIST_FL, value: S.d1f ?? 1000, dark: true, fmt: (v) => eng(v, 'Hz'), onChange: (v) => { S.d1f = v; save(); sc.dirty = true; } });
    const kA = new Lab.Knob(fg.c, { label: 'Vm', min: 0.5, max: 10, step: 0.1, value: S.d1a ?? 5, dark: true, fmt: (v) => num(v, 1) + ' V', onChange: (v) => { S.d1a = v; save(); sc.dirty = true; } });
    kA.el.querySelector('.kl').innerHTML = 'V<sub>m</sub> (açık devre)';
    const es = inst(box, 'ELEMAN KUTUSU', false);
    segGroup(es.c, [['R', 'R 100 Ω'], ['L', 'L 10 mH'], ['C', 'C 1 µF']], S.d1el || 'R', (v) => { S.d1el = v; save(); sc.dirty = true; });
    const ms = inst(box, 'ELEMAN MODELİ', false);
    segGroup(ms.c, [[false, 'İdeal'], [true, 'Gerçek (r<sub>L</sub> 8 Ω, ESR 0,4 Ω)']], !!S.d1real, (v) => { S.d1real = v; save(); sc.dirty = true; });
    const sc = mkScope($('#d1scopeHost'), { v1: 2, v2: 0.2, t: 2e-4, l2: 'CH2 (şönt)' });
    const P = () => ({ el: S.d1el || 'R', real: !!S.d1real, f: kF.value, a: kA.value });
    const solve = (p) => { const w = 2 * Math.PI * p.f, Z = ELZ(p.el, w, p.real), I = C.div([p.a, 0], C.add(Z, [60, 0])); return { w, Z, I, V: C.mul(I, Z), Vs: C.mul(I, [10, 0]) }; };
    // şema
    const g = $('#d1sch');
    sch.src(g, 70, 110); sch.t(g, 70, 160, 'FG'); sch.w(g, [[70, 90], [70, 50], [100, 50]]); sch.rH(g, 100, 170, 50); sch.t(g, 135, 35, '50 Ω');
    sch.w(g, [[170, 50], [280, 50]]); const eg = E('g', {}, g); sch.w(g, [[400, 50], [520, 50]]); sch.rV(g, 520, 50, 160); sch.t(g, 535, 110, 'R<sub>şönt</sub> = 10 Ω', 'lbl', 'start');
    sch.w(g, [[520, 160], [520, 180], [70, 180], [70, 130]]); sch.gnd(g, 300, 180);
    sch.dot(g, 280, 50); sch.dot(g, 400, 50); sch.dot(g, 520, 50);
    E('path', { d: 'M280,50 V90 H300 M400,50 V90 H380', class: 'w', stroke: '#f2a900' }, g); sch.box(g, 300, 78, 80, 26, ''); sch.t(g, 340, 96, 'dif. prob'); sch.t(g, 340, 125, '→ CH1 (v)');
    sch.w(g, [[520, 50], [640, 50]]); sch.t(g, 650, 55, '→ CH2 (i·10 Ω)', 'lbl', 'start');
    const tE = sch.t(g, 340, 30, '', 'val');
    function drawEl(el) { eg.innerHTML = ''; if (el === 'R') sch.rH(eg, 280, 400, 50); else if (el === 'L') sch.lH(eg, 280, 400, 50); else E('path', { d: 'M280,50 H335 M335,32 v36 M345,32 v36 M345,50 H400', class: 'w' }, eg); }
    let lastEl = '';
    function update() {
      const p = P(); if (p.el !== lastEl) { drawEl(p.el); lastEl = p.el; }
      tE.textContent = ELN[p.el] + (p.real ? ' (gerçek)' : ' (ideal)') + ' · f = ' + eng(p.f, 'Hz');
      if (!sc.dirty) return; sc.dirty = false;
      const s = solve(p), vA = C.abs(s.V), vP = C.ang(s.V) * D2R, iA = C.abs(s.Vs), iP = C.ang(s.Vs) * D2R;
      const t0 = trigT0(s.w, vP, sc.sc.tdiv);
      sc.draw(trace(sc.sc.tdiv, [(t) => vA * Math.cos(s.w * t + vP), (t) => iA * Math.cos(s.w * t + iP)], t0, [vA * 0.004, iA * 0.004]));
    }
    const tbody = $('#d1tab tbody');
    function table() { tbody.innerHTML = S.d1rows.map((r, i) => `<tr><td>${i + 1}</td><td>${ELN[r.el]}</td><td>${r.real ? 'gerçek' : 'ideal'}</td><td>${eng(r.f, 'Hz')}</td><td>${num(r.v1, 3)}</td><td>${num(r.v2, 4)}</td><td>${r.dt == null ? '—' : eng(r.dt, 's')}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; }
    function rec() {
      const m = sc.m; if (!m) return; const p = P();
      S.d1rows.push({ ...p, v1: m.ch[0].max, v2: m.ch[1].max, dt: m.cur ? m.cur.dt : null }); save(); table();
      Lab.toast('Kaydedildi' + (m.cur ? ': Δt = ' + eng(m.cur.dt, 's') + ' (A: gerilim tepesi, B: akım tepesi olmalı)' : ' (imleç kapalı: Δt yok)'));
    }
    $('#d1rec').onclick = rec; $('#d1del').onclick = () => { S.d1rows.pop(); save(); table(); };
    $('#d1csv').onclick = () => Lab.downloadCSV('d2_hafta02_deney1.csv', ['#', 'eleman', 'model', 'f (Hz)', 'CH1 tepe (V)', 'CH2 tepe (V)', 'dt (s)'], S.d1rows.map((r, i) => [i + 1, r.el, r.real ? 'gercek' : 'ideal', r.f, +r.v1.toFixed(4), +r.v2.toFixed(5), r.dt == null ? '' : +r.dt.toExponential(4)]));
    table();
    const thOf = (r) => (r.dt == null ? NaN : wrap180(360 * r.f * r.dt));
    const thTrue = (r) => C.ang(ELZ(r.el, 2 * Math.PI * r.f, r.real));
    const ok = (r) => near(thOf(r), thTrue(r), 4);
    return { sc, update, rec, P, ok };
  })();
  XP.d1 = D1;
  steps('d1', [
    { t: '<b>Direnç</b>, f = 1 kHz: İMLEÇ A’yı gerilim (CH1) tepesine, B’yi en yakın akım (CH2) tepesine koyup <b>kaydedin</b>.', test: () => S.d1rows.some((r) => r.el === 'R' && r.f === 1000 && D1.ok(r)) },
    { t: '<b>İdeal bobin</b>, f = 1 kHz için aynı ölçümü kaydedin. Hangi eğri önde?', test: () => S.d1rows.some((r) => r.el === 'L' && !r.real && r.f === 1000 && D1.ok(r)) },
    { t: '<b>İdeal kondansatör</b>, f = 1 kHz için ölçüp kaydedin.', test: () => S.d1rows.some((r) => r.el === 'C' && !r.real && r.f === 1000 && D1.ok(r)) },
    { t: 'İdeal bobinde frekansı <b>10 kHz</b>’e çıkarıp tekrar kaydedin: açı değişti mi, genlik oranı ne oldu?', test: () => S.d1rows.some((r) => r.el === 'L' && !r.real && r.f === 1e4 && D1.ok(r)) },
    { t: '<b>Gerçek bobine</b> geçin ve <b>f = 200 Hz</b>’de açıyı ölçüp kaydedin. Neden 90° değil?', test: () => S.d1rows.some((r) => r.el === 'L' && r.real && r.f === 200 && D1.ok(r)) },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: 'İdeal bobinde 1 kHz’de ölçtüğünüz θ = θ<sub>v</sub> − θ<sub>i</sub> kaç derecedir?', answer: 90, tol: 4, unit: '°', explain: 'Z<sub>L</sub> = jωL = ωL∠90°: gerilim akımdan 90° önde.', hint: 'θ = 360°·f·Δt; akım tepesi sonra geliyorsa pozitif.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'İdeal kondansatörde 1 kHz’de θ kaç derecedir?', answer: -90, tol: 4, unit: '°', explain: 'Z<sub>C</sub> = −j/(ωC) = (1/ωC)∠−90°: akım gerilimden 90° önde.', hint: 'İşarete dikkat.' });
  numq('d1', '#d1Q', { id: 'd1q3', q: 'İdeal bobinde 1 kHz ölçümünüzden |Z<sub>L</sub>| = V<sub>m</sub>/I<sub>m</sub> kaç Ω’dur? (I<sub>m</sub> = CH2 tepe / 10 Ω)', answer: 2 * Math.PI * 1000 * 0.01, tol: 3, unit: 'Ω', explain: 'ωL = 2π·1000·0,01 = 62,83 Ω. 10 kHz’de 628 Ω olur.', hint: 'CH1 tepe ÷ (CH2 tepe/10)' });
  numq('d1', '#d1Q', { id: 'd1q4', q: 'Gerçek bobinde (r<sub>L</sub> = 8 Ω) 200 Hz’de ölçtüğünüz θ kaç derecedir?', answer: Math.atan2(2 * Math.PI * 200 * 0.01, 8) * R2D, tol: 4, unit: '°', explain: 'θ = tan<sup>−1</sup>(ωL/r<sub>L</sub>) = tan<sup>−1</sup>(12,57/8) = 57,5°. Düşük frekansta ωL küçük olduğundan sargı direnci öne çıkar; Q = ωL/r<sub>L</sub> = 1,57.', hint: 'Z = r<sub>L</sub> + jωL' });
  mcq('d1', '#d1Q', { id: 'd1q5', q: 'Bobinde gerilimin akımdan önde olmasının fiziksel nedeni hangisidir?', opts: ['Bobin enerjiyi elektrik alanında depolar', 'v = L di/dt: gerilim, akımın en hızlı değiştiği anda (sıfır geçişinde) en büyüktür', 'Bobinin direnci sıfırdır', 'Akım bobine gecikmeli girer çünkü tel uzundur'], correct: 1, explain: 'Türev kosinüsü 90° ileri kaydırır: d/dt cos ωt = ω cos(ωt + 90°).', hint: 'Türev fazörde jω ile çarpmadır.' });
  mcq('d1', '#d1Q', { id: 'd1q6', q: 'Frekans 1 kHz’den 10 kHz’e çıkınca ideal bobinde ne değişti?', opts: ['Açı 90°’den 0°’ye indi', 'Açı aynı (90°) kaldı, akım genliği yaklaşık 10 kat azaldı', 'Açı −90° oldu', 'Hiçbir şey değişmedi'], correct: 1, explain: 'Açı elemanın türüne bağlıdır, büyüklük frekansa: |Z<sub>L</sub>| = ωL 10 kat arttı. (50 + 10 Ω kaynak/şönt direnci nedeniyle 1 kHz’de oran tam 10 değildir.)', hint: 'Tablonuzdaki CH2 tepe değerlerini karşılaştırın.' });

  /* ================= DENEY 2 · Frekans taraması ================= */
  const D2 = (() => {
    const box = $('#d2inst');
    const am = inst(box, 'AC GÜÇ YÜKSELTECİ', true, 'I ≤ 1 A');
    const kF = new Lab.Knob(am.c, { label: 'FREKANS', min: 20, max: 1e5, log: true, value: S.d2f ?? 1000, dark: true, size: 62, fmt: (v) => eng(v, 'Hz', 4), onChange: (v) => { S.d2f = v; save(); } });
    const kV = new Lab.Knob(am.c, { label: 'V rms', min: 0.1, max: 10, step: 0.1, value: S.d2v ?? 2, dark: true, fmt: (v) => num(v, 1) + ' V', onChange: (v) => { S.d2v = v; save(); } });
    const es = inst(box, 'ELEMAN', false);
    segGroup(es.c, [['R', 'R 100 Ω'], ['L', 'L 10 mH'], ['C', 'C 1 µF']], S.d2el || 'L', (v) => { S.d2el = v; save(); });
    segGroup(es.c, [[false, 'İdeal'], [true, 'Gerçek']], !!S.d2real, (v) => { S.d2real = v; save(); });
    const show = meterBox(box, 'V–A–FAZ METRE');
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
    function rec() { if (!cur) return; const p = P(); S.d2rows.push({ el: p.el, real: p.real, f: rnd(p.f, 4), V: cur.V, I: cur.I, th: cur.th }); save(); table(); Lab.toast('Kaydedildi: f = ' + eng(p.f, 'Hz', 4) + ', |Z| = ' + num(cur.V / cur.I, 2) + ' Ω'); }
    $('#d2rec').onclick = rec; $('#d2del').onclick = () => { S.d2rows.pop(); save(); table(); };
    $('#d2csv').onclick = () => Lab.downloadCSV('d2_hafta02_deney2.csv', ['#', 'eleman', 'model', 'f (Hz)', 'Vrms (V)', 'Irms (A)', 'theta (der)', '|Z| (ohm)'], S.d2rows.map((r, i) => [i + 1, r.el, r.real ? 'gercek' : 'ideal', r.f, r.V, r.I, r.th, +(r.V / r.I).toFixed(3)]));
    table();
    return { update, rec, sc: { dirty: true } };
  })();
  XP.d2 = D2;
  const span = (el) => { const fs = S.d2rows.filter((r) => r.el === el).map((r) => r.f); return fs.length >= 5 && Math.max(...fs) / Math.min(...fs) >= 100; };
  steps('d2', [
    { t: '<b>Direnç</b> için en az iki on katlık aralıkta (ör. 100 Hz–10 kHz) <b>en az 5</b> frekansta ölçüm kaydedin.', test: () => span('R') },
    { t: '<b>Bobin</b> için aynı taramayı yapın.', test: () => span('L') },
    { t: '<b>Kondansatör</b> için aynı taramayı yapın.', test: () => span('C') },
    { t: '<b>Teorik eğrileri</b> açıp ölçümlerinizle karşılaştırın. Eğimler +1 ve −1 mi?', test: () => !!S.fl.d2theo },
    { t: '<b>Tasarım:</b> |Z<sub>L</sub>| = |Z<sub>C</sub>| olduğu frekansı bulun; o frekansta (±%3) hem L hem C ölçümü kaydedin.', test: () => S.d2rows.some((a) => a.el === 'L' && S.d2rows.some((b) => b.el === 'C' && Math.abs(a.f / b.f - 1) < 0.03 && Math.abs((a.V / a.I) / (b.V / b.I) - 1) < 0.06)) },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'Bobin verinizde log|Z| – log f doğrusunun eğimi kaçtır? (iki uzak noktadan)', answer: 1, tol: 5, unit: '', explain: '|Z<sub>L</sub>| = 2πL·f ⇒ log|Z| = log f + log(2πL): eğim +1. Gerçek bobinde düşük frekansta r<sub>L</sub> eğimi azaltır.', hint: 'Δlog|Z| / Δlog f' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'Verinizden bobinin endüktansı kaç mH’dir?', answer: 10, tol: 3, unit: 'mH', explain: 'L = |Z|/(2πf). Gerçek modelde yüksek frekans noktalarını kullanın.', hint: 'L = |Z| / (2πf)' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 'Verinizden kondansatörün kapasitesi kaç µF’tır?', answer: 1, tol: 3, unit: 'µF', explain: 'C = 1/(2πf|Z|).', hint: 'C = 1/(2πf|Z|)' });
  numq('d2', '#d2Q', { id: 'd2q4', q: '|Z<sub>L</sub>| = |Z<sub>C</sub>| olduğu frekans kaç Hz’dir?', answer: 1 / (2 * Math.PI * Math.sqrt(0.01 * 1e-6)), tol: 3, unit: 'Hz', explain: 'ωL = 1/(ωC) ⇒ f = 1/(2π√(LC)) = 1591,5 Hz. Bu frekans haftalar sonra rezonans olarak karşımıza çıkacak.', hint: 'ω = 1/√(LC)' });
  mcq('d2', '#d2Q', { id: 'd2q5', q: 'Ölçümünüzde dirençli elemanın açısı ve |Z|’si frekansla nasıl değişti?', opts: ['|Z| frekansla arttı', '|Z| sabit, θ ≈ 0°', '|Z| azaldı, θ = −90°', 'θ frekansla 0°’den 90°’ye çıktı'], correct: 1, explain: 'İdeal direncin empedansı gerçeldir ve frekanstan bağımsızdır (çok yüksek frekansta gerçek dirençlerin küçük parazitik endüktansı görülebilir).', hint: 'Grafikteki gri noktalar.' });

  /* ================= DENEY 3 · Empedans düzlemi ================= */
  const TOP = { sRLC: 'Seri R–L–C', sRL: 'Seri R–L', pRC: 'Paralel R ∥ C', pRL: 'Paralel R ∥ L' };
  const zTop = (p, w) => {
    const ZR = [p.R, 0], ZL = [0, w * p.L], ZC = [0, -1 / (w * p.C)];
    if (p.top === 'sRLC') return C.add(C.add(ZR, ZL), ZC);
    if (p.top === 'sRL') return C.add(ZR, ZL);
    const Y = C.add(C.div([1, 0], ZR), C.div([1, 0], p.top === 'pRC' ? ZC : ZL)); return C.div([1, 0], Y);
  };
  const D3 = (() => {
    const box = $('#d3inst');
    const am = inst(box, 'AC GÜÇ YÜKSELTECİ', true, 'I ≤ 1 A');
    const kVm = new Lab.Knob(am.c, { label: 'Vm', min: 1, max: 50, step: 1, value: S.d3v ?? 10, dark: true, fmt: (v) => num(v, 0) + ' V', onChange: (v) => { S.d3v = v; save(); } });
    kVm.el.querySelector('.kl').innerHTML = 'V<sub>m</sub> (tepe)';
    const kW = new Lab.Knob(am.c, { label: 'ω', min: 100, max: 1e4, log: true, value: S.d3w ?? 1000, dark: true, size: 62, fmt: (v) => num(v, 0) + ' r/s', onChange: (v) => { S.d3w = v; save(); } });
    const tb = inst(box, 'DEVRE', false);
    segGroup(tb.c, Object.entries(TOP), S.d3top || 'sRLC', (v) => { S.d3top = v; save(); });
    const ek = inst(box, 'ELEMAN KUTULARI', false);
    const kR = new Lab.Knob(ek.c, { label: 'R', list: [10, 20, 25, 30, 40, 50, 75, 100, 200], value: S.d3R ?? 30, fmt: Lab.ohm, onChange: (v) => { S.d3R = v; save(); } });
    const kL = new Lab.Knob(ek.c, { label: 'L', list: [0.01, 0.02, 0.03, 0.06, 0.1, 0.2], value: S.d3L ?? 0.06, fmt: (v) => eng(v, 'H'), onChange: (v) => { S.d3L = v; save(); } });
    const kC = new Lab.Knob(ek.c, { label: 'C', list: [1e-6, 2.2e-6, 5e-6, 1e-5, 2e-5, 5e-5, 1e-4], value: S.d3C ?? 5e-5, fmt: (v) => eng(v, 'F'), onChange: (v) => { S.d3C = v; save(); } });
    const show = meterBox(box, 'V–A–FAZ METRE');
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
    segGroup($('#d3view'), [['Z', 'Z düzlemi (Ω)'], ['Y', 'Y düzlemi (S)']], S.d3view || 'Z', (v) => { S.d3view = v; if (v === 'Y') S.fl.d3y = true; save(); drawCP(); });
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
      sch.t(cg, 12, 352, TOP[p.top] + ' · ' + (isY ? 'Y = 1/Z' : 'Z') + ' · numaralar tablo satırı', 'lbl', 'start').style.fontSize = '11px';
    }
    let cur = null, lastK = '';
    function update() {
      const p = P(), k = JSON.stringify(p);
      if (k !== lastK || !cur) { lastK = k; drawSch(p); cur = acMeas(p.Vm / Math.SQRT2, zTop(p, p.w)); show(cur); tW.textContent = 'ω = ' + num(p.w, 0) + ' rad/s (f = ' + num(p.w / (2 * Math.PI), 1) + ' Hz), v_s = ' + p.Vm + ' cos ωt V'; drawCP(); }
    }
    const tbody = $('#d3tab tbody');
    function table() { tbody.innerHTML = S.d3rows.map((r, i) => `<tr><td>${i + 1}</td><td class="l">${TOP[r.top]} (${Lab.ohm(r.R)}${r.top !== 'pRC' ? ', ' + eng(r.L, 'H') : ''}${r.top === 'sRLC' || r.top === 'pRC' ? ', ' + eng(r.C, 'F') : ''})</td><td>${num(r.w, 0)}</td><td>${num(r.V, 3)}</td><td>${eng(r.I, 'A')}</td><td>${num(r.th, 1)}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; drawCP(); }
    function rec() { if (!cur) return; const p = P(); S.d3rows.push({ ...p, w: rnd(p.w, 4), V: cur.V, I: cur.I, th: cur.th }); save(); table(); Lab.toast('Kaydedildi: ' + TOP[p.top] + ', ω = ' + num(p.w, 0) + ' rad/s'); }
    $('#d3rec').onclick = rec; $('#d3del').onclick = () => { S.d3rows.pop(); save(); table(); };
    $('#d3csv').onclick = () => Lab.downloadCSV('d2_hafta02_deney3.csv', ['#', 'devre', 'R (ohm)', 'L (H)', 'C (F)', 'omega (rad/s)', 'Vrms (V)', 'Irms (A)', 'theta (der)'], S.d3rows.map((r, i) => [i + 1, r.top, r.R, r.L, r.C, r.w, r.V, r.I, r.th]));
    table();
    const ex16 = (r) => r.top === 'sRLC' && r.R === 30 && r.L === 0.06 && r.C === 5e-5 && near(r.w, 1000, 5);
    const ex17 = (r) => r.top === 'pRC' && r.R === 50 && r.C === 1e-5 && near(r.w, 2000, 10);
    return { update, rec, sc: { dirty: true }, ex16, ex17 };
  })();
  XP.d3 = D3;
  steps('d3', [
    { t: 'Örnek 1.16: <b>seri RLC</b>, R = 30 Ω, L = 60 mH, C = 50 µF, <b>ω = 1000 rad/s</b>, V<sub>m</sub> = 50 V. Ölçümü kaydedin.', test: () => S.d3rows.some(D3.ex16) },
    { t: 'Örnek 1.17: <b>R = 50 Ω ∥ C = 10 µF</b>, <b>ω = 2000 rad/s</b>. Ölçümü kaydedin.', test: () => S.d3rows.some(D3.ex17) },
    { t: 'Örnek 1.16 devresinde ω’yı tarayın: θ &lt; 0 ve θ &gt; 0 bölgelerinden toplam <b>en az 6</b> ölçüm kaydedin.', test: () => { const L = S.d3rows.filter((r) => r.top === 'sRLC' && r.R === 30 && r.L === 0.06 && r.C === 5e-5); return L.length >= 6 && L.some((r) => r.th < -5) && L.some((r) => r.th > 5); } },
    { t: 'Noktalarınızı <b>Y düzleminde</b> de inceleyin. Seri RLC’nin Z’deki doğrusu Y’de neye dönüştü?', test: () => !!S.fl.d3y },
    { t: '<b>Teorik yer eğrisini</b> açıp ölçümlerinizle karşılaştırın.', test: () => !!S.fl.d3theo },
  ]);
  numq('d3', '#d3Q', { id: 'd3q1', q: 'Örnek 1.16 ölçümünüzden |Z| kaç Ω’dur?', answer: 50, tol: 2, unit: 'Ω', explain: 'Z = 30 + j60 − j20 = 30 + j40 = 50∠53,13° Ω.', hint: 'V<sub>rms</sub>/I<sub>rms</sub>' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'Aynı ölçümde reaktans X = |Z| sin θ kaç Ω’dur?', answer: 40, tol: 3, unit: 'Ω', explain: 'X = X<sub>L</sub> + X<sub>C</sub> = 60 − 20 = 40 Ω > 0: devre endüktif.', hint: 'Z = |Z|cos θ + j|Z|sin θ' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'Örnek 1.16’da akımın tepe değeri I<sub>m</sub> kaç A’dır?', answer: 1, tol: 2, unit: 'A', explain: 'I = 50∠0°/50∠53,13° = 1∠−53,13° A. Ampermetre rms (0,707 A) okur!', hint: 'I<sub>m</sub> = √2·I<sub>rms</sub>' });
  numq('d3', '#d3Q', { id: 'd3q4', q: 'Örnek 1.17 ölçümünüzden süseptans B kaç S’dir?', answer: 0.02, tol: 3, unit: 'S', explain: 'Y = 1/R + jωC = 0,02 + j0,02 S. B &gt; 0: kapasitif admitans.', hint: 'Y = 1/Z ⇒ |Y| = I/V, açısı −θ.' });
  numq('d3', '#d3Q', { id: 'd3q5', q: 'Örnek 1.17’de eşdeğer empedansın gerçel kısmı kaç Ω’dur?', answer: 25, tol: 3, unit: 'Ω', explain: 'Z = 1/(0,02 + j0,02) = 25 − j25 Ω. Dikkat: paralel R = 50 Ω olsa da Z’nin gerçel kısmı 25 Ω’dur.', hint: '|Z|cos θ' });
  mcq('d3', '#d3Q', { id: 'd3q6', q: 'Seri RLC’de ω taranırken Z noktası kompleks düzlemde hangi eğriyi izler?', opts: ['Orijin merkezli bir daire', 'Re{Z} = R olan düşey bir doğru', 'Gerçel eksen üzerinde bir doğru parçası', 'Bir parabol'], correct: 1, explain: 'Z = R + j(ωL − 1/ωC): gerçel kısım sabit, sanal kısım −∞’dan +∞’a gider. Y düzleminde bu doğru, çapı 1/R olan bir daireye dönüşür.', hint: 'Hangi kısım ω’ya bağlı?' });

  /* ================= DENEY 4 · Bilinmeyen eleman ve ESR ================= */
  const D4 = (() => {
    const box = $('#d4inst');
    const am = inst(box, 'AC GÜÇ YÜKSELTECİ', true, 'I ≤ 1 A');
    const kF = new Lab.Knob(am.c, { label: 'FREKANS', min: 20, max: 1e5, log: true, value: S.d4f ?? 1000, dark: true, size: 62, fmt: (v) => eng(v, 'Hz', 4), onChange: (v) => { S.d4f = v; save(); } });
    const kV = new Lab.Knob(am.c, { label: 'V rms', min: 0.1, max: 5, step: 0.1, value: S.d4v ?? 1, dark: true, fmt: (v) => num(v, 1) + ' V', onChange: (v) => { S.d4v = v; save(); } });
    const bs = inst(box, 'KARA KUTU', false);
    segGroup(bs.c, [['X', 'Kutu X (?)'], ['Y', 'Kutu Y (kondansatör)']], S.d4box || 'X', (v) => { S.d4box = v; save(); });
    const show = meterBox(box, 'V–A–FAZ METRE');
    const ux = S.ux;
    const zX = (w) => ux.t === 'R' ? [ux.v, 0] : ux.t === 'L' ? [ux.v * 400, w * ux.v] : [0.02, -1 / (w * ux.v)];
    const zY = (w) => [S.esr, -1 / (w * S.cy)];
    const P = () => ({ box: S.d4box || 'X', f: kF.value, Vs: kV.value });
    const g = $('#d4sch');
    sch.src(g, 80, 90); sch.w(g, [[80, 70], [80, 40], [420, 40]]); sch.w(g, [[80, 110], [80, 140], [420, 140]]); sch.gnd(g, 250, 140);
    E('circle', { cx: 180, cy: 40, r: 10, fill: '#fff', class: 'w' }, g); sch.t(g, 180, 44, 'A');
    const bx = E('rect', { x: 380, y: 60, width: 80, height: 60, rx: 6, fill: '#333', stroke: '#111' }, g); const bt = sch.t(g, 420, 95, '?', 'lbl'); bt.style.fill = '#fff';
    sch.w(g, [[420, 40], [420, 60]]); sch.w(g, [[420, 120], [420, 140]]);
    sch.w(g, [[420, 40], [560, 40], [560, 70]]); sch.w(g, [[420, 140], [560, 140], [560, 110]]); E('circle', { cx: 560, cy: 90, r: 18, fill: '#fff', class: 'w' }, g); sch.t(g, 560, 95, 'V'); sch.t(g, 600, 95, 'faz metre: θ = θ_v − θ_i', 'lbl', 'start');
    let cur = null, lastK = '';
    const plot = new Lab.Plot($('#d4plot'), { xlabel: 'log₁₀ f  (Hz)', ylabel: 'θ  (°)' });
    function drawPlot() { const rows = S.d4rows.filter((r) => r.box === 'Y'); plot.draw([{ pts: rows.map((r) => [Math.log10(r.f), r.th]), dots: true, color: '#1a8a4a' }], [1.2, 5.05], [-95, 5]); }
    function update() {
      const p = P(), k = JSON.stringify(p);
      if (k !== lastK || !cur) { lastK = k; const w = 2 * Math.PI * p.f; cur = acMeas(p.Vs, p.box === 'X' ? zX(w) : zY(w)); show(cur); bt.textContent = p.box === 'X' ? 'X ?' : 'Y'; bx.setAttribute('fill', p.box === 'X' ? '#333' : '#2c5a8a'); }
    }
    const tbody = $('#d4tab tbody');
    function table() { tbody.innerHTML = S.d4rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.box}</td><td>${num(r.f, r.f < 100 ? 1 : 0)}</td><td>${num(r.V, 3)}</td><td>${eng(r.I, 'A')}</td><td>${num(r.th, 1)}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; drawPlot(); }
    function rec() { if (!cur) return; const p = P(); S.d4rows.push({ box: p.box, f: rnd(p.f, 4), V: cur.V, I: cur.I, th: cur.th }); save(); table(); Lab.toast('Kaydedildi: kutu ' + p.box + ', f = ' + eng(p.f, 'Hz', 4)); }
    $('#d4rec').onclick = rec; $('#d4del').onclick = () => { S.d4rows.pop(); save(); table(); };
    $('#d4csv').onclick = () => Lab.downloadCSV('d2_hafta02_deney4.csv', ['#', 'kutu', 'f (Hz)', 'Vrms (V)', 'Irms (A)', 'theta (der)'], S.d4rows.map((r, i) => [i + 1, r.box, r.f, r.V, r.I, r.th]));
    table();
    return { update, rec, sc: { dirty: true } };
  })();
  XP.d4 = D4;
  steps('d4', [
    { t: '<b>Kutu X</b>’i en az <b>3 frekansta</b>, en az bir on katlık aralığa yayarak ölçüp kaydedin.', test: () => { const fs = S.d4rows.filter((r) => r.box === 'X').map((r) => r.f); return fs.length >= 3 && Math.max(...fs) / Math.min(...fs) >= 10; } },
    { t: '<b>Kutu Y</b>’yi düşük frekansta (f ≤ 100 Hz) ölçüp kaydedin: θ −90°’ye ne kadar yakın?', test: () => S.d4rows.some((r) => r.box === 'Y' && r.f <= 100) },
    { t: 'Kutu Y’yi yüksek frekansta (f ≥ 20 kHz) ölçüp kaydedin: θ nereye kaydı?', test: () => S.d4rows.some((r) => r.box === 'Y' && r.f >= 2e4) },
    { t: 'Kutu Y için toplam <b>en az 6</b> frekansta ölçüm alıp θ–f grafiğini tamamlayın.', test: () => S.d4rows.filter((r) => r.box === 'Y').length >= 6 },
  ]);
  const UXT = ['R', 'L', 'C'];
  mcq('d4', '#d4Q', { id: 'd4q1', q: 'Kutu X’teki elemanın türü nedir?', opts: ['Direnç', 'Bobin', 'Kondansatör', 'Belirlenemez'], correct: UXT.indexOf(S.ux.t), explain: 'Açının işareti ve |Z|’nin frekansla değişim yönü türü kesin olarak belirler.', hint: 'θ’nın işaretine ve |Z|’nin f arttıkça artıp azalmasına bakın.' });
  numq('d4', '#d4Q', { id: 'd4q2', q: 'Kutu X’in değeri nedir? (direnç ise Ω, bobin ise mH, kondansatör ise µF cinsinden)', answer: () => (S.ux.t === 'R' ? S.ux.v : S.ux.t === 'L' ? S.ux.v * 1e3 : S.ux.v * 1e6), tol: 4, unit: 'Ω / mH / µF', explain: 'R = |Z|; L = |Z|sin θ/(2πf); C = 1/(2πf|Z|sin|θ|). Bobinde sargı direnci olduğu için reaktif bileşeni (|Z|sin θ) kullanmak daha doğrudur.', hint: 'Reaktans X = |Z| sin θ’dan başlayın.' });
  numq('d4', '#d4Q', { id: 'd4q3', q: 'Kutu Y’nin kapasitesi kaç µF’tır? (düşük frekans ölçümünden)', answer: () => S.cy * 1e6, tol: 4, unit: 'µF', explain: 'Düşük frekansta X<sub>C</sub> ≫ ESR: C = 1/(2πf|X|).', hint: 'C = 1/(2πf·|Z|sin|θ|)' });
  numq('d4', '#d4Q', { id: 'd4q4', q: 'Kutu Y’nin ESR’si kaç Ω’dur? (yüksek frekans ölçümünden)', answer: () => S.esr, tol: 10, unit: 'Ω', explain: 'ESR = Re{Z} = |Z| cos θ. Yüksek frekansta θ sıfıra yaklaştığı için cos θ duyarlı ölçülür.', hint: '|Z| cos θ' });
  numq('d4', '#d4Q', { id: 'd4q5', q: 'Kutu Y’nin 1 kHz’deki kayıp faktörü D = tan δ = ωC·ESR kaçtır?', answer: () => 2 * Math.PI * 1000 * S.cy * S.esr, tol: 12, unit: '', explain: 'D = ESR/|X<sub>C</sub>|; δ = 90° − |θ|. İyi bir film kondansatörde D ≈ 0,001, elektrolitikte 0,05–0,2.', hint: 'Bulduğunuz C ve ESR ile hesaplayın ya da tan(90° − |θ|).' });
  mcq('d4', '#d4Q', { id: 'd4q6', q: 'Kutu Y’de frekans arttıkça θ’nın −90°’den 0°’ye doğru kaymasının nedeni nedir?', opts: ['Kapasite frekansla artar', '1/(ωC) küçülür ve sabit ESR toplam empedansta baskın hâle gelir', 'Ölçü aletinin hatası', 'Kondansatör bobine dönüşür'], correct: 1, explain: 'tan θ = −1/(ωC·ESR). Çok daha yüksek frekansta bağlantı uçlarının endüktansı (ESL) devreye girer ve θ pozitif olabilir: kondansatörün öz rezonansı.', hint: 'Z = ESR − j/(ωC): hangi terim frekansa bağlı?' });

  /* ================= RAPOR ================= */
  function buildReport() {
    const sec = { onhaz: 'Ön Hazırlık', d1: 'Deney 1', d2: 'Deney 2', d3: 'Deney 3', d4: 'Deney 4' };
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
      <h2 style="margin:0">Devre Kuramı II · Sanal Laboratuvar · Hafta 2 Raporu</h2>
      <p><b>Konu:</b> R, L, C elemanlarında V–I ilişkisi, empedans, admitans ve gerçek elemanlar (Bölüm 1.4)</p>
      <table class="data" style="width:auto"><tr><th>Ad Soyad</th><td class="l">${S.st.name || ''}</td><th>No</th><td class="l">${S.st.no || ''}</td><th>Grup</th><td class="l">${S.st.group || ''}</td><th>Tarih</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Özet</h3>
      <p>Tamamlanan föy adımı: <b>${sOk}/${sTot}</b> · Doğru yanıt: <b>${ok}/${tot}</b> · Puan: <b>${Math.round((50 * sOk) / sTot + (50 * ok) / tot)}/100</b></p>
      <h3>Yanıtlar</h3>
      <table class="data"><thead><tr><th>Bölüm</th><th>Soru</th><th>Yanıt</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Deney 1 · V–I faz ilişkisi</h3>${tb('#d1tab')}
      <h3>Deney 2 · Frekans taraması</h3>${tb('#d2tab')}
      <h3>Deney 3 · Empedans ve admitans</h3>${tb('#d3tab')}
      <h3>Deney 4 · Bilinmeyen eleman ve ESR</h3>${tb('#d4tab')}
      <h3>Grafikler</h3>
      <div>${img(D1.sc.cv)} ${img($('#d2plot'))}</div><div>${img($('#d2plotph'))} ${img($('#d4plot'))}</div><div style="width:48%;border:1px solid #ccc">${$('#d3cp').outerHTML}</div>
      <h3>Öğrenci yorumu</h3>
      <p style="white-space:pre-wrap;border:1px solid #ccc;padding:8px;min-height:60px">${(S.st.comment || '').replace(/</g, '&lt;')}</p>`;
    $('#reportPreview').innerHTML = html; $('#report').innerHTML = html;
  }
  $('#printBtn').onclick = () => { buildReport(); window.print(); };
  $('#resetBtn').onclick = () => { if (confirm('Bu haftaya ait tüm ölçüm, yanıt ve ilerleme silinsin mi?')) { localStorage.removeItem('devrelab:' + KEY); location.reload(); } };

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

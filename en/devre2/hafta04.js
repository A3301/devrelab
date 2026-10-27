/* Devre Kuramı II · Hafta 4 — AC Devrelerde Thevenin ve Norton Eşdeğeri */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd2h04';
  const S = Object.assign({ answers: {}, steps: {}, st: {}, page: 'giris', d1rows: [], d2rows: [], d3rows: [] }, Lab.store.load(KEY));
  Lab.answers = S.answers;
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => Lab.store.save(KEY, S), 300); };
  Lab.onAnswer = () => { save(); progress(); };

  /* ---------- kompleks sayı yardımcıları ---------- */
  const C = (re, im = 0) => ({ re, im });
  const cadd = (a, b) => C(a.re + b.re, a.im + b.im);
  const csub = (a, b) => C(a.re - b.re, a.im - b.im);
  const cmul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  const cdiv = (a, b) => { const d = b.re * b.re + b.im * b.im; return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); };
  const cinv = (a) => cdiv(C(1), a);
  const cabs = (a) => Math.hypot(a.re, a.im);
  const carg = (a) => (Math.atan2(a.im, a.re) * 180) / Math.PI;
  const cscale = (a, k) => C(a.re * k, a.im * k);
  const polar = (m, deg) => C(m * Math.cos((deg * Math.PI) / 180), m * Math.sin((deg * Math.PI) / 180));
  const cpar = (a, b) => cdiv(cmul(a, b), cadd(a, b));
  const fC = (z, d = 2) => `${num(z.re, d)} ${z.im < 0 ? '−' : '+'} j${num(Math.abs(z.im), d)}`;
  const fP = (z, d = 2) => `${num(cabs(z), d)}∠${num(carg(z), 1)}°`;
  const near = (a, b, t) => Math.abs(a - b) <= t;
  const TAU = 2 * Math.PI;

  /* ---------- cihaz yardımcıları ---------- */
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
  const RG = 50; // fonksiyon üreteci iç direnci
  function gen(box, o) {
    const g = inst(box, 'FG-200 FUNCTION GENERATOR', true, 'R<sub>i</sub> = 50 Ω');
    const L = lcd(g.el, 'FREQUENCY · AMPLITUDE (open circuit, rms)', '', 200);
    const kf = new Lab.Knob(g.c, { label: 'Frequency', min: 20, max: 20000, log: true, value: o.f, dark: true, fmt: (v) => eng(v, 'Hz', 4), onChange: o.ch });
    const ka = new Lab.Knob(g.c, { label: 'Amplitude', min: 0.1, max: 10, step: 0.05, value: o.a, dark: true, fmt: (v) => num(v, 2) + ' V', onChange: o.ch });
    return { kf, ka, show: () => L(`${eng(kf.value, 'Hz', 4)} · ${num(ka.value, 2)} V`) };
  }
  function meter(box, title, right, kind = 'V') {
    const m = inst(box, title, false, right); m.el.style.minWidth = '130px';
    const L = lcd(m.el, kind === 'V' ? 'AC V · TRMS' : 'AC A · TRMS', '', 110);
    return (x) => { const a = Math.abs(x); if (kind === 'V') (a < 1 ? L(num(a * 1e3, 1), 'mV') : L(num(a, 3), 'V')); else (a < 1 ? L(num(a * 1e3, 2), 'mA') : L(num(a, 3), 'A')); };
  }
  const RLIST = [10, 22, 30, 33, 47, 50, 68, 100, 150, 220, 330, 470, 1000];
  const LLIST = [0.01, 0.025, 0.033, 0.05, 0.1];
  const CLIST = [1e-6, 2.2e-6, 4.7e-6, 10e-6, 20e-6, 25e-6, 47e-6];
  const rL = (L) => ({ '0.01': 2.5, '0.025': 6, '0.033': 7.5, '0.05': 12, '0.1': 22 })[String(L)] || 10; // bobin iç direnci (Ω)

  /* ---------- şema yardımcıları ---------- */
  const sch = {
    w: (g, pts) => E('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'w' }, g),
    dot: (g, x, y) => E('circle', { cx: x, cy: y, r: 3.5, class: 'node' }, g),
    t: (g, x, y, s, cls = 'lbl', anchor = 'middle') => { const e = E('text', { x, y, class: cls, 'text-anchor': anchor }, g); e.innerHTML = s; return e; },
    rH(g, x1, x2, y) { const n = 6, L = 8, step = (x2 - x1 - 2 * L) / n; let d = `M${x1},${y} h${L}`; for (let i = 0; i < n; i++) d += ` l${step / 2},${i % 2 ? 7 : -7} l${step / 2},${i % 2 ? -7 : 7}`; d += ` L${x2},${y}`; E('path', { d, class: 'w' }, g); },
    rV(g, x, y1, y2) { const n = 6, L = 8, step = (y2 - y1 - 2 * L) / n; let d = `M${x},${y1} v${L}`; for (let i = 0; i < n; i++) d += ` l${i % 2 ? 7 : -7},${step / 2} l${i % 2 ? -7 : 7},${step / 2}`; d += ` L${x},${y2}`; E('path', { d, class: 'w' }, g); },
    lH(g, x1, x2, y) { const m = (x1 + x2) / 2, r = 7; let d = `M${x1},${y} L${m - 4 * r},${y}`; for (let i = 0; i < 4; i++) d += ` a${r},${r} 0 0 1 ${2 * r},0`; d += ` L${x2},${y}`; E('path', { d, class: 'w' }, g); },
    lV(g, x, y1, y2) { const m = (y1 + y2) / 2, r = 7; let d = `M${x},${y1} L${x},${m - 4 * r}`; for (let i = 0; i < 4; i++) d += ` a${r},${r} 0 0 1 0,${2 * r}`; d += ` L${x},${y2}`; E('path', { d, class: 'w' }, g); },
    cH(g, x1, x2, y) { const m = (x1 + x2) / 2; E('path', { d: `M${x1},${y} H${m - 5} M${m - 5},${y - 13} v26 M${m + 5},${y - 13} v26 M${m + 5},${y} H${x2}`, class: 'w' }, g); },
    cV(g, x, y1, y2) { const m = (y1 + y2) / 2; E('path', { d: `M${x},${y1} V${m - 5} M${x - 13},${m - 5} h26 M${x - 13},${m + 5} h26 M${x},${m + 5} V${y2}`, class: 'w' }, g); },
    gnd(g, x, y) { E('path', { d: `M${x},${y} v8 M${x - 11},${y + 8} h22 M${x - 7},${y + 13} h14 M${x - 3},${y + 18} h6`, class: 'w' }, g); },
    src(g, x, y, r = 20) { E('circle', { cx: x, cy: y, r, class: 'w', fill: '#fff' }, g); E('path', { d: `M${x - 10},${y} q5,-12 10,0 t10,0`, class: 'w' }, g); },
    meter(g, x, y, s, col = '#0b5cad') { E('circle', { cx: x, cy: y, r: 13, fill: '#fff', stroke: col, 'stroke-width': 2 }, g); const t = sch.t(g, x, y + 5, s, 'lbl'); t.style.fill = col; t.style.fontWeight = 700; },
    zbox(g, p1, p2, label) { // eğik hat üzerinde genel empedans kutusu
      const [x1, y1] = p1, [x2, y2] = p2, mx = (x1 + x2) / 2, my = (y1 + y2) / 2, a = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
      sch.w(g, [p1, p2]);
      E('rect', { x: mx - 26, y: my - 9, width: 52, height: 18, fill: '#fff', stroke: '#222', 'stroke-width': 2, transform: `rotate(${a} ${mx} ${my})` }, g);
      return sch.t(g, mx, my - 16, label, 'val');
    },
  };

  /* ---------- fazör diyagramı (canlı SVG) ---------- */
  function phasorDiag(svg, items) {
    svg.innerHTML = '';
    const W = 320, H = 300, P = 30;
    let xs = [0], ys = [0];
    items.forEach((it) => { const f = it.from || C(0); xs.push(f.re, f.re + it.z.re); ys.push(f.im, f.im + it.z.im); });
    let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const span = Math.max(x1 - x0, y1 - y0, 1e-12);
    const s = Math.min((W - 2 * P) / Math.max(x1 - x0, span * 0.3), (H - 2 * P) / Math.max(y1 - y0, span * 0.3));
    const cx = (W - (x1 + x0) * s) / 2, cy = (H + (y1 + y0) * s) / 2;
    const X = (v) => cx + v * s, Y = (v) => cy - v * s;
    E('line', { x1: 4, y1: Y(0), x2: W - 4, y2: Y(0), stroke: '#bbb' }, svg); E('line', { x1: X(0), y1: 4, x2: X(0), y2: H - 4, stroke: '#bbb' }, svg);
    sch.t(svg, W - 8, Y(0) - 4, 'Re', 'lbl', 'end').style.fontSize = '11px'; sch.t(svg, X(0) + 4, 14, 'Im', 'lbl', 'start').style.fontSize = '11px';
    items.forEach((it) => {
      const f = it.from || C(0), t = cadd(f, it.z), ax = X(f.re), ay = Y(f.im), bx = X(t.re), by = Y(t.im);
      const L = Math.hypot(bx - ax, by - ay); if (L < 1) return;
      const ux = (bx - ax) / L, uy = (by - ay) / L, h = Math.min(10, L * 0.4);
      E('line', { x1: ax, y1: ay, x2: bx - ux * h * 0.8, y2: by - uy * h * 0.8, stroke: it.color, 'stroke-width': it.w || 2.5, 'stroke-dasharray': it.dash || '' }, svg);
      E('path', { d: `M${bx},${by} L${bx - ux * h - uy * h * 0.45},${by - uy * h + ux * h * 0.45} L${bx - ux * h + uy * h * 0.45},${by - uy * h - ux * h * 0.45} Z`, fill: it.color }, svg);
      const tx = sch.t(svg, (ax + bx) / 2 - uy * 12, (ay + by) / 2 + ux * 12 + 4, it.label, 'lbl'); tx.style.fill = it.color; tx.style.fontWeight = 700; tx.style.fontSize = '12px';
    });
  }

  /* ---------- osiloskop (fazörden dalga + X-Y kipi) ---------- */
  const VDIV = [1e-3, 2e-3, 5e-3, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20];
  const TDIV = [1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2, 2e-2];
  function makeScope(host, o) {
    const w = document.createElement('div'); w.className = 'inst dark scopewrap'; w.style.cssText = 'flex:1;min-width:420px';
    w.innerHTML = `<div class="brand"><span>DSO-2C · Two-Channel Oscilloscope</span><span>${o.chs}</span></div>
      <div class="row" style="align-items:flex-start;flex-wrap:nowrap"><canvas width="560" height="350" style="width:100%;max-width:560px"></canvas>
      <div style="min-width:160px"><div class="ctrls"></div><div class="row" style="margin:6px 0;gap:4px"><button class="seg-btn on">CH1</button><button class="seg-btn on">CH2</button><button class="seg-btn">CURSOR</button><button class="seg-btn">X-Y</button><button class="seg-btn">AUTO</button></div><div class="meas"></div></div></div>`;
    host.appendChild(w);
    const cv = $('canvas', w), kc = $('.ctrls', w), bt = $$('button', w), meas = $('.meas', w);
    const sc = new Lab.Scope(cv);
    const self = { sc, xy: false, xyUsed: false, curUsed: false, dirty: true };
    const set = () => (self.dirty = true);
    self.k1 = new Lab.Knob(kc, { label: 'CH1 V/div', list: VDIV, value: o.v1 || 1, dark: true, size: 42, fmt: (v) => eng(v, 'V'), onChange: (v) => { sc.ch[0].vdiv = v; set(); } });
    self.k2 = new Lab.Knob(kc, { label: 'CH2 V/div', list: VDIV, value: o.v2 || 1, dark: true, size: 42, fmt: (v) => eng(v, 'V'), onChange: (v) => { sc.ch[1].vdiv = v; set(); } });
    self.kt = new Lab.Knob(kc, { label: 'TIME/div', list: TDIV, value: o.t || 5e-4, dark: true, size: 42, fmt: (v) => eng(v, 's'), onChange: (v) => { sc.tdiv = v; set(); } });
    sc.ch[0].vdiv = self.k1.value; sc.ch[1].vdiv = self.k2.value; sc.tdiv = self.kt.value;
    bt[0].onclick = () => { sc.ch[0].on = !sc.ch[0].on; bt[0].classList.toggle('on'); set(); };
    bt[1].onclick = () => { sc.ch[1].on = !sc.ch[1].on; bt[1].classList.toggle('on'); set(); };
    bt[2].onclick = () => { sc.cur.on = !sc.cur.on; bt[2].classList.toggle('on'); if (sc.cur.on) self.curUsed = true; set(); };
    bt[3].onclick = () => { self.xy = !self.xy; bt[3].classList.toggle('on'); if (self.xy) self.xyUsed = true; set(); };
    bt[4].onclick = () => {
      const L = self.last; if (!L) return;
      const pick = (A, x) => A.find((v) => v >= x) || A[A.length - 1];
      self.kt.set(pick(TDIV, 2 / L.f / 10)); self.k1.set(pick(VDIV, (Math.SQRT2 * cabs(L.p1)) / 3.5)); self.k2.set(pick(VDIV, (Math.SQRT2 * cabs(L.p2)) / 3.5));
    };
    cv.addEventListener('pointermove', () => { if (sc.cur.drag) { self.curUsed = true; showMeas(); } });
    function showMeas() {
      const m = sc.measure(); if (!m) return;
      const [a, b] = m.ch;
      let h = `<span style="color:#f2d21b">CH1</span> Vpp ${eng(a.vpp, 'V')}<br><span style="color:#27c4f0">CH2</span> Vpp ${eng(b.vpp, 'V')}<br>f ${isFinite(a.f) ? eng(a.f, 'Hz', 4) : '—'}`;
      if (m.cur && !self.xy) h += `<br><span style="color:#ff7cf0">CURSOR</span> Δt = ${eng(m.cur.dt, 's', 4)}<br>1/Δt = ${eng(1 / Math.abs(m.cur.dt || 1e-12), 'Hz')}`;
      if (self.xy) h += '<br><span style="color:#ff7cf0">X-Y</span>: CH1 → horizontal, CH2 → vertical';
      meas.innerHTML = h;
    }
    function drawXY(L) {
      const g = cv.getContext('2d'), W = cv.width, H = cv.height, dx = W / 10, dy = H / 8;
      g.fillStyle = '#06140c'; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(120,200,140,.18)'; g.lineWidth = 1;
      for (let i = 1; i < 10; i++) { g.beginPath(); g.moveTo(i * dx, 0); g.lineTo(i * dx, H); g.stroke(); }
      for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(0, i * dy); g.lineTo(W, i * dy); g.stroke(); }
      g.strokeStyle = 'rgba(120,200,140,.45)'; g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
      g.strokeStyle = '#7dffb0'; g.lineWidth = 2; g.shadowColor = '#7dffb0'; g.shadowBlur = 6; g.beginPath();
      for (let i = 0; i <= 400; i++) {
        const th = (i / 400) * TAU, x = Math.SQRT2 * (L.p1.re * Math.cos(th) - L.p1.im * Math.sin(th)), y = Math.SQRT2 * (L.p2.re * Math.cos(th) - L.p2.im * Math.sin(th));
        const X = W / 2 + (x / sc.ch[0].vdiv) * dx, Y = H / 2 - (y / sc.ch[1].vdiv) * dy;
        i ? g.lineTo(X, Y) : g.moveTo(X, Y);
      }
      g.stroke(); g.shadowBlur = 0;
      g.font = '12px Consolas'; g.fillStyle = '#9fe0b0'; g.fillText(`X-Y · X: ${eng(sc.ch[0].vdiv, 'V')}/div  Y: ${eng(sc.ch[1].vdiv, 'V')}/div`, 8, H - 8);
    }
    // p1, p2: etkin değer fazörleri (CH1 tetik referansı)
    self.render = (f, p1, p2) => {
      self.last = { f, p1, p2 };
      if (self.xy) { drawXY(self.last); showMeas(); return; }
      const n = 1000, T = sc.tdiv * 10, y1 = new Float64Array(n), y2 = new Float64Array(n);
      const t0 = -carg(p1) / 360 / f; // CH1 yükselen sıfır geçişinde tetikle
      const nz = (a) => (Math.random() - 0.5) * (0.004 * a + 2e-4);
      const a1 = Math.SQRT2 * cabs(p1), a2 = Math.SQRT2 * cabs(p2);
      for (let i = 0; i < n; i++) {
        const t = (i / (n - 1)) * T + t0 - 1 / (4 * f), th = TAU * f * t;
        y1[i] = Math.SQRT2 * (p1.re * Math.cos(th) - p1.im * Math.sin(th)) + nz(a1);
        y2[i] = Math.SQRT2 * (p2.re * Math.cos(th) - p2.im * Math.sin(th)) + nz(a2);
      }
      sc.draw({ n, y: [y1, y2] }); showMeas();
    };
    return self;
  }

  /* ---------- tablo / grafik yardımcıları ---------- */
  function tableBind(key, cols, csvName, csvHead, csvRow) {
    const tbody = $(`#${key}tab tbody`);
    const draw = () => { tbody.innerHTML = S[key + 'rows'].map((r, i) => `<tr><td>${i + 1}</td>${cols(r).map((c) => `<td>${c}</td>`).join('')}</tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; };
    $(`#${key}del`).onclick = () => { S[key + 'rows'].pop(); save(); draw(); };
    $(`#${key}csv`).onclick = () => Lab.downloadCSV(csvName, csvHead, S[key + 'rows'].map((r, i) => [i + 1, ...csvRow(r)]));
    return draw;
  }
  /* ================= GEZİNME / İLERLEME ================= */
  const pages = ['giris', 'onbilgi', 'onhaz', 'd1', 'd2', 'd3', 'rapor'];
  function go(p) {
    S.page = p; save();
    $$('section.page').forEach((s) => s.classList.toggle('active', s.id === p));
    $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.p === p));
    [D1, D2, D3].forEach((D) => D && (D.scope.dirty = true));
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

  /* ================= ÖN BİLGİ · yük değişince V_L fazörü ================= */
  const OB = (() => {
    const svg = $('#obSvg'), wr = $('#obR'), wx = $('#obX'), txt = $('#obTxt');
    function frame() {
      const RL = Math.pow(10, +wr.value), X = +wx.value, Vth = C(10), Zth = C(50, X);
      const VL = cdiv(cscale(Vth, RL), cadd(Zth, C(RL))), IL = cdiv(Vth, cadd(Zth, C(RL)));
      svg.innerHTML = '';
      const ox = 40, oy = 170, s = 34, Xp = (z) => ox + z.re * s, Yp = (z) => oy - z.im * s;
      E('line', { x1: 20, y1: oy, x2: 420, y2: oy, stroke: '#bbb' }, svg); E('line', { x1: ox, y1: 10, x2: ox, y2: 290, stroke: '#bbb' }, svg);
      let d = ''; for (let i = 0; i <= 300; i++) { const r = Math.pow(10, -1 + (6 * i) / 300), v = cdiv(cscale(Vth, r), cadd(Zth, C(r))); d += (i ? 'L' : 'M') + Xp(v) + ',' + Yp(v); }
      E('path', { d, fill: 'none', stroke: '#e07a10', 'stroke-width': 2, 'stroke-dasharray': '5 4' }, svg);
      sch.t(svg, 300, 28, 'Trace of the V_L tip as R_L = 0 → ∞', 'lbl').style.fill = '#e07a10';
      const arrow = (a, b, col, lab, w = 2.5) => {
        const ax = Xp(a), ay = Yp(a), bx = Xp(b), by = Yp(b), L = Math.hypot(bx - ax, by - ay); if (L < 2) return;
        const ux = (bx - ax) / L, uy = (by - ay) / L, h = Math.min(10, L * 0.4);
        E('line', { x1: ax, y1: ay, x2: bx - ux * h * 0.8, y2: by - uy * h * 0.8, stroke: col, 'stroke-width': w }, svg);
        E('path', { d: `M${bx},${by} L${bx - ux * h - uy * h * 0.45},${by - uy * h + ux * h * 0.45} L${bx - ux * h + uy * h * 0.45},${by - uy * h - ux * h * 0.45} Z`, fill: col }, svg);
        const t = sch.t(svg, (ax + bx) / 2 - uy * 14, (ay + by) / 2 + ux * 14 + 4, lab, 'lbl'); t.style.fill = col; t.style.fontWeight = 700;
      };
      arrow(C(0), Vth, '#222', 'V_Th'); arrow(C(0), VL, '#c62828', 'V_L'); arrow(VL, Vth, '#1565c0', 'Z_Th·I');
      arrow(C(0), cscale(IL, 0.08 * 50 * 2), '#2e7d32', 'I_L (scaled)', 1.6);
      txt.innerHTML = `R<sub>L</sub> = <b>${Lab.ohm(RL)}</b>, Z<sub>Th</sub> = 50 ${X < 0 ? '−' : '+'} j${num(Math.abs(X), 0)} Ω → |V<sub>L</sub>| = ${num(cabs(VL), 2)} V ∠${num(carg(VL), 1)}°, |I<sub>L</sub>| = ${eng(cabs(IL), 'A')}, P<sub>L</sub> = ${eng(cabs(IL) ** 2 * RL, 'W')} (V<sub>Th</sub> 10 V rms). The red and blue arrows tip-to-tail always give V<sub>Th</sub>: <b>V<sub>Th</sub> = Z<sub>Th</sub>I + V<sub>L</sub></b>. However complex the inside of the box, the load “sees” only these two numbers.`;
    }
    return { frame };
  })();

  /* ================= ÖN HAZIRLIK ================= */
  mcq('onhaz', '#preQ', { id: 'p1', q: '1) A source V<sub>s</sub> = 20∠30° V with series Z<sub>s</sub> = 4 + j3 Ω (+ terminal at a) is converted to a current source. What is I<sub>s</sub>?', opts: ['4∠−6.87° A, arrow towards a', '4∠66.87° A, arrow towards a', '100∠66.87° A, arrow towards a', '4∠−6.87° A, arrow towards b'], correct: 0, explain: 'I<sub>s</sub> = 20∠30°/5∠36.87° = 4∠−6.87° A; since the + terminal is at a, the arrow points to a. Z<sub>s</sub> moves to parallel unchanged.', hint: 'In division magnitudes divide and angles subtract; the arrow direction follows the polarity.' });
  mcq('onhaz', '#preQ', { id: 'p2', q: '2) V<sub>Th</sub> = 30∠0° V, Z<sub>Th</sub> = 3 − j4 Ω. What is the Norton current I<sub>N</sub>?', opts: ['6∠53.13° A', '6∠−53.13° A', '150∠−53.13° A', '30∠0° A'], correct: 0, explain: 'I<sub>N</sub> = 30∠0°/5∠−53.13° = 6∠53.13° A = 3.6 + j4.8 A.', hint: '0° − (−53.13°) = ?' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) (Example 1.28) V<sub>s</sub> = 120∠0° V, series 8 + j6 Ω; 12 − j16 Ω between a–b. What is the Norton current magnitude |I<sub>N</sub>| in amperes?', answer: 12, tol: 1, unit: 'A', explain: 'a–b shorted: the 12 − j16 branch is out of circuit; I<sub>N</sub> = 120/(8 + j6) = 9.6 − j7.2 = 12∠−36.87° A.', hint: 'When the terminals are shorted the parallel branch has zero voltage; it carries no current.' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) In the same circuit, what is the real part of Z<sub>N</sub> = Z<sub>Th</sub> in ohms?', answer: 8.8, tol: 1, unit: 'Ω', explain: 'Source shorted: (8 + j6) ∥ (12 − j16) = (192 − j56)/(20 − j10) = 8.8 + j1.6 Ω.', hint: 'Short the independent voltage source and look in from a–b; the two branches are in parallel.' });
  numq('onhaz', '#preQ', { id: 'p5', q: '5) In the same circuit, what is |V<sub>Th</sub>| in volts?', answer: 107.33, tol: 1, unit: 'V', explain: 'V<sub>Th</sub> = I<sub>N</sub>Z<sub>N</sub> = (9.6 − j7.2)(8.8 + j1.6) = 96 − j48 V = 107.33∠−26.57° V. The same as with the voltage divider.', hint: 'V<sub>Th</sub> = I<sub>N</sub>·Z<sub>N</sub>, or the voltage divider at open circuit.' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) (Example 1.27) In computing Z<sub>Th</sub>, what is done with the dependent source (10V<sub>x</sub>)?', opts: ['It is short-circuited', 'It is open-circuited', 'It is left in place; Z<sub>Th</sub> is found with a test source (V<sub>T</sub>/I<sub>T</sub>)', 'Its value is doubled'], correct: 2, explain: 'The dependent source’s value depends on V<sub>x</sub>, and V<sub>x</sub> ≠ 0 during the test. If it is zeroed, |Z| = 36.4 Ω (wrong); the correct value is 91.2 − j38.4 Ω.', hint: 'Only independent sources are zeroed.' });

  /* ================= KARA KUTU modeli ================= */
  if (!S.box) { const r = (a, b) => Math.round(a + Math.random() * (b - a)); S.box = { E: +(3 + Math.random() * 3).toFixed(2), R1: r(40, 120), X1: r(30, 90), R2: r(80, 200), X2: r(60, 180), code: 'KK-' + r(100, 999) }; save(); }
  const BX = S.box, FB = 1000;
  const Z1 = C(BX.R1, BX.X1), Z2 = C(BX.R2, -BX.X2);
  const VTH = cdiv(cmul(C(BX.E), Z2), cadd(Z1, Z2)), ZTH = cpar(Z1, Z2), IN = cdiv(VTH, ZTH);
  const ZV = C(10e6), RSH = 1.1; // voltmetre girişi; ampermetre yükü 0,1 Ω + 1 Ω şönt
  function terminal(ZL) { // ZL: null = açık devre
    const Zext = ZL ? cadd(C(RSH), ZL) : null, Zload = Zext ? cpar(Zext, ZV) : ZV;
    const V = cdiv(cmul(VTH, Zload), cadd(ZTH, Zload)), I = Zext ? cdiv(V, Zext) : C(0);
    return { V, I };
  }
  const RLL = [10, 22, 33, 47, 68, 100, 150, 220, 330, 470, 680, 1000, 2200, 4700, 10000];
  const CLL = [0.1e-6, 0.22e-6, 0.47e-6, 1e-6, 2.2e-6, 4.7e-6, 10e-6];
  const LLL = [1e-3, 2.2e-3, 4.7e-3, 10e-3, 22e-3, 47e-3];
  function boxInst(box) {
    const b = inst(box, 'BLACK BOX · ' + BX.code, true, 'a ● &nbsp; ● b &nbsp; REF ◯');
    const L = lcd(b.el, 'CONTENTS', '', 150); L('? ? ?');
    const n = document.createElement('div'); n.style.cssText = 'font-size:11px;max-width:170px;line-height:1.4'; n.innerHTML = 'A linear, single-frequency (1 kHz) network. The REF output gives a 1 V<sub>rms</sub> sine synchronous with the internal source.'; b.c.appendChild(n);
  }
  function loadUI(box, o) { // yük seçimi
    const lb = inst(box, 'LOAD', false); lb.el.style.minWidth = '230px';
    const row = document.createElement('div'); row.className = 'row'; row.style.cssText = 'gap:4px;margin-bottom:6px';
    row.innerHTML = o.kinds.map(([k, t]) => `<button class="seg-btn" data-k="${k}">${t}</button>`).join('');
    lb.el.insertBefore(row, lb.c);
    const self = { kind: o.kind };
    const paint = () => $$('button', row).forEach((x) => x.classList.toggle('on', x.dataset.k === self.kind));
    $$('button', row).forEach((x) => (x.onclick = () => { self.kind = x.dataset.k; paint(); o.ch(); }));
    paint();
    self.kR = new Lab.Knob(lb.c, { label: 'R_L', list: RLL, value: o.R || 100, fmt: (v) => Lab.ohm(v), onChange: o.ch });
    if (o.reactive) {
      self.kC = new Lab.Knob(lb.c, { label: 'C (series)', list: CLL, value: 1e-6, fmt: (v) => eng(v, 'F'), onChange: o.ch });
      self.kL = new Lab.Knob(lb.c, { label: 'L (series)', list: LLL, value: 10e-3, fmt: (v) => eng(v, 'H'), onChange: o.ch });
    }
    self.Z = () => {
      const w = TAU * FB;
      if (self.kind === 'open') return null;
      if (self.kind === 'short') return C(0);
      if (self.kind === 'RC') return C(self.kR.value, -1 / (w * self.kC.value));
      if (self.kind === 'RL') return C(self.kR.value, w * self.kL.value);
      return C(self.kR.value);
    };
    self.desc = () => ({ open: 'open circuit', short: 'short circuit', R: 'R ' + Lab.ohm(self.kR.value), RC: `R ${Lab.ohm(self.kR.value)} + C ${eng(self.kC && self.kC.value, 'F')}`, RL: `R ${Lab.ohm(self.kR.value)} + L ${eng(self.kL && self.kL.value, 'H')}` })[self.kind];
    return self;
  }

  /* ================= DENEY 1 · Kara kutunun Thevenin eşdeğeri ================= */
  const D1 = (() => {
    const box = $('#d1inst'), self = { ch2: 'v' };
    const ch = () => (scope.dirty = true);
    boxInst(box);
    const LD = loadUI(box, { kinds: [['open', 'OPEN'], ['short', 'SHORT'], ['R', 'R_L']], kind: 'open', ch });
    const mV = meter(box, 'V1', 'V<sub>ab</sub> · 10 MΩ'), mA = meter(box, 'A1', 'I (0.1 Ω burden)', 'A');
    const scope = makeScope($('#d1scope'), { chs: 'CH1: REF · CH2: selected', v1: 0.5, v2: 1, t: 2e-4 });
    self.scope = scope;
    const sw = document.createElement('div'); sw.className = 'row'; sw.style.cssText = 'gap:4px;margin-top:6px';
    sw.innerHTML = '<span style="font-size:11px">CH2 probe:</span><button class="seg-btn on" data-c="v">a–b voltage</button><button class="seg-btn" data-c="i">1 Ω shunt (current)</button>';
    $('#d1scope .meas').before(sw);
    $$('button', sw).forEach((x) => (x.onclick = () => { self.ch2 = x.dataset.c; $$('button', sw).forEach((y) => y.classList.toggle('on', y === x)); ch(); }));
    const g = $('#d1sch');
    E('rect', { x: 20, y: 30, width: 150, height: 170, fill: '#2b2f36', rx: 8 }, g); sch.t(g, 95, 110, 'BLACK BOX', 'lbl').style.fill = '#fff'; sch.t(g, 95, 130, '1 kHz · linear', 'lbl').style.fill = '#aab';
    sch.w(g, [[170, 60], [230, 60]]); sch.w(g, [[170, 180], [430, 180]]); sch.dot(g, 200, 60); sch.dot(g, 200, 180); sch.t(g, 192, 52, 'a', 'val'); sch.t(g, 192, 198, 'b', 'val');
    sch.meter(g, 200, 120, 'V'); sch.w(g, [[200, 60], [200, 107]]); sch.w(g, [[200, 133], [200, 180]]);
    sch.meter(g, 245, 60, 'A'); sch.w(g, [[258, 60], [280, 60]]); sch.rH(g, 280, 330, 60); sch.t(g, 305, 45, '1 Ω shunt'); sch.w(g, [[330, 60], [430, 60]]);
    E('rect', { x: 405, y: 90, width: 50, height: 60, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g); sch.w(g, [[430, 60], [430, 90]]); sch.w(g, [[430, 150], [430, 180]]);
    const tL = sch.t(g, 430, 125, '', 'lbl'); sch.t(g, 95, 220, 'REF → CH1', 'lbl').style.fill = '#b8960a';
    let cur = {};
    self.update = () => {
      const t = terminal(LD.Z()); cur = { V: t.V, I: t.I, kind: LD.kind, desc: LD.desc() };
      mV(cabs(t.V)); mA(cabs(t.I)); tL.textContent = { open: '∞', short: '0', R: Lab.ohm(LD.kR.value) }[LD.kind];
      if (scope.dirty) { scope.dirty = false; scope.render(FB, C(1), self.ch2 === 'v' ? t.V : cscale(t.I, 1)); }
      if (scope.sc.cur.on && LD.kind === 'open' && self.ch2 === 'v') S.d1phV = true;
      if (scope.sc.cur.on && LD.kind === 'short' && self.ch2 === 'i') S.d1phI = true;
    };
    const draw = tableBind('d1', (r) => [r.desc, num(r.v, 4), num(r.i * 1e3, 3), r.ch2 === 'v' ? 'V<sub>ab</sub>' : 'shunt', r.dt != null ? num(r.dt * 1e6, 1) : '—'],
      'hafta4_deney1.csv', ['#', 'load', '|Vab| (V)', '|I| (mA)', 'CH2', 'dt (us)'], (r) => [r.desc, +r.v.toFixed(5), +(r.i * 1e3).toFixed(4), r.ch2, r.dt != null ? +(r.dt * 1e6).toFixed(2) : '']);
    self.rec = () => {
      const m = scope.sc.cur.on && !scope.xy ? scope.sc.measure() : null;
      S.d1rows.push({ kind: cur.kind, desc: cur.desc, v: cabs(cur.V), i: cabs(cur.I), ch2: self.ch2, dt: m && m.cur ? m.cur.dt : null }); save(); draw();
      Lab.toast(`Recorded: ${cur.desc}`);
    };
    $('#d1rec').onclick = self.rec; draw();
    Object.assign(self, { LD, cur: () => cur });
    return self;
  })();
  const ok = (...ids) => ids.every((q) => S.answers[q] && S.answers[q].ok);
  steps('d1', [
    { t: 'Leave the load <b>OPEN</b>; read V1 and record. Does the 10 MΩ voltmeter load the box? This is |V<sub>Th</sub>| (rms).', test: () => S.d1rows.some((r) => r.kind === 'open') },
    { t: 'With CH2 = a–b voltage, turn on the <b>CURSOR</b>s at open circuit; find ∠V<sub>Th</sub> from Δt between the REF and V<sub>ab</sub> zero crossings (φ = 360°·f·Δt).', test: () => !!S.d1phV },
    { t: 'Set the load to <b>SHORT</b>; read the ammeter and record. This is |I<sub>N</sub>| (ammeter + shunt add a small 1.1 Ω error).', test: () => S.d1rows.some((r) => r.kind === 'short') },
    { t: 'At short circuit switch CH2 to the <b>1 Ω shunt</b> and measure ∠I<sub>N</sub> with the cursors. The shunt voltage is in phase with the current (1 V ↔ 1 A).', test: () => !!S.d1phI },
    { t: 'Do the phasor division Z<sub>Th</sub> = V<sub>Th</sub> / I<sub>N</sub> and enter <b>V<sub>Th</sub></b> and <b>Z<sub>Th</sub></b> correctly in the questions.', test: () => ok('d1q1', 'd1q2', 'd1q4', 'd1q5') },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: 'What is the |V<sub>Th</sub>| of your black box in volts (rms)?', answer: () => cabs(VTH), tol: 1.5, unit: 'V', explain: 'Open-circuit voltage = V<sub>Th</sub>. A 10 MΩ voltmeter is negligible against a Z<sub>Th</sub> below a kΩ.', hint: 'The V1 reading with the load OPEN.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'What is the phase angle of V<sub>Th</sub> relative to REF in degrees? (Positive if leading.)', answer: () => carg(VTH), tol: 0, abs: 3, unit: '°', explain: 'At open circuit V<sub>ab</sub> = E·Z<sub>2</sub>/(Z<sub>1</sub>+Z<sub>2</sub>); the phase shifts depending on the elements inside the box.', hint: 'Measure Δt between same-direction (rising) zero crossings. If CH2 crosses before CH1, V<sub>Th</sub> leads. At f = 1 kHz, 1 µs = 0.36°.' });
  numq('d1', '#d1Q', { id: 'd1q3', q: 'What is |I<sub>N</sub>| in milliamperes?', answer: () => cabs(IN) * 1e3, tol: 5, unit: 'mA', explain: 'The short-circuit current. Because of the 1.1 Ω of the ammeter and shunt, the measurement is slightly smaller than the true I<sub>N</sub>.', hint: 'The A1 reading with the load SHORT.' });
  numq('d1', '#d1Q', { id: 'd1q4', q: 'What is the real part R<sub>Th</sub> of Z<sub>Th</sub> in ohms?', answer: () => ZTH.re, tol: 5, abs: 2, unit: 'Ω', explain: 'Z<sub>Th</sub> = V<sub>Th</sub>/I<sub>N</sub>: divide the magnitudes, subtract the angles, then convert to rectangular form.', hint: '|Z<sub>Th</sub>| = |V<sub>Th</sub>|/|I<sub>N</sub>|, ∠Z<sub>Th</sub> = ∠V<sub>Th</sub> − ∠I<sub>N</sub>; R<sub>Th</sub> = |Z|cos θ. Do not forget to convert mA to A.' });
  numq('d1', '#d1Q', { id: 'd1q5', q: 'What is the imaginary part X<sub>Th</sub> of Z<sub>Th</sub> in ohms? (Negative if capacitive.)', answer: () => ZTH.im, tol: 6, abs: 2, unit: 'Ω', explain: 'X<sub>Th</sub> = |Z|sin θ. Its sign tells whether the box looks inductive or capacitive from its terminals.', hint: 'If the current leads the voltage, θ is negative: capacitive.' });
  mcq('d1', '#d1Q', { id: 'd1q6', q: 'Why did we use the REF output in the phase measurement; would measuring V<sub>ab</sub> and I on their own not be enough?', opts: ['REF is only cosmetic', 'V<sub>Th</sub> is measured at open circuit and I<sub>N</sub> at short circuit; comparing the phases of two separate measurements requires a common time/phase reference', 'The oscilloscope has a single channel', 'REF gives the box’s Z<sub>Th</sub> directly'], correct: 1, explain: 'The angle of Z<sub>Th</sub> is ∠V<sub>Th</sub> − ∠I<sub>N</sub>. Since the two do not exist at the same time, we measure both against the same REF.', hint: 'Can the two measurements be made at the same time?' });

  /* ================= DENEY 2 · Yük değiştirerek doğrulama ================= */
  const D2 = (() => {
    const box = $('#d2inst'), self = {};
    boxInst(box);
    const LD = loadUI(box, { kinds: [['R', 'R'], ['RC', 'R + C'], ['RL', 'R + L']], kind: 'R', reactive: true, ch: () => {} });
    const mV = meter(box, 'V1', 'V<sub>L</sub> · 10 MΩ'), mA = meter(box, 'A1', 'I<sub>L</sub>', 'A');
    self.scope = { dirty: false };
    const ins = ['vm', 'va', 'zr', 'zi'];
    S.d2m = S.d2m || {};
    ins.forEach((k) => { const e = $('#d2' + k); e.value = S.d2m[k] ?? ''; e.addEventListener('input', () => { S.d2m[k] = e.value; save(); draw(); drawPlot(); }); });
    const model = () => { const v = ins.map((k) => Lab.parse(S.d2m[k])); if (v.some((x) => !isFinite(x)) || v[0] <= 0) return null; return { V: polar(v[0], v[1]), Z: C(v[2], v[3]) }; };
    const predict = (ZL) => { const m = model(); if (!m) return null; const Zx = cadd(C(RSH), ZL); return cabs(cdiv(cmul(m.V, Zx), cadd(m.Z, Zx))); };
    let cur = {};
    self.update = () => { const ZL = LD.Z(), t = terminal(ZL); cur = { ZL, V: t.V, I: t.I, desc: LD.desc(), kind: LD.kind, R: LD.kR.value }; mV(cabs(t.V)); mA(cabs(t.I)); };
    const plot = new Lab.Plot($('#d2plot'), { xlabel: 'R_L (Ω) — purely resistive loads only', ylabel: '|V_L| (V)' });
    const err = (r) => { const p = predict(C(r.zr, r.zi)); return p == null ? null : (100 * (p - r.v)) / r.v; };
    const draw = tableBind('d2', (r) => { const p = predict(C(r.zr, r.zi)), e = err(r); return [r.desc, fC(C(r.zr, r.zi), 1), num(r.v, 4), num(r.i * 1e3, 3), p == null ? '—' : num(p, 4), e == null ? '—' : `<span style="color:${Math.abs(e) < 3 ? '#1a8a4a' : '#c62828'}">${num(e, 1)}</span>`]; },
      'hafta4_deney2.csv', ['#', 'load', 'Re ZL', 'Im ZL', '|VL| (V)', '|IL| (mA)', 'model |VL|', 'error %'], (r) => { const p = predict(C(r.zr, r.zi)), e = err(r); return [r.desc, r.zr, +r.zi.toFixed(3), +r.v.toFixed(5), +(r.i * 1e3).toFixed(4), p == null ? '' : +p.toFixed(5), e == null ? '' : +e.toFixed(2)]; });
    function drawPlot() {
      const rows = S.d2rows.filter((r) => r.kind === 'R');
      const ser = [{ pts: rows.map((r) => [r.R, r.v]).sort((a, b) => a[0] - b[0]), dots: true, color: '#0b5cad' }];
      if (model()) { const pts = []; for (let i = 0; i <= 200; i++) { const R = 10 + (2990 * i) / 200; pts.push([R, predict(C(R))]); } ser.unshift({ pts, line: true, color: '#e07a10', dash: [6, 4] }); }
      plot.draw(ser, [0, 3000], null);
    }
    self.rec = () => { S.d2rows.push({ desc: cur.desc, kind: cur.kind, R: cur.R, zr: cur.ZL.re, zi: cur.ZL.im, v: cabs(cur.V), i: cabs(cur.I) }); save(); draw(); drawPlot(); Lab.toast(`Recorded: ${cur.desc}`); };
    $('#d2rec').onclick = self.rec; $('#d2del').onclick = () => { S.d2rows.pop(); save(); draw(); drawPlot(); };
    draw(); drawPlot();
    Object.assign(self, { LD, model, err, plotCanvas: $('#d2plot') });
    return self;
  })();
  steps('d2', [
    { t: 'Enter the <b>V<sub>Th</sub></b> (magnitude, angle) and <b>Z<sub>Th</sub></b> (Re, Im) values you found in Experiment 1 into the model boxes.', test: () => !!D2.model() },
    { t: 'Record V<sub>L</sub> and I<sub>L</sub> for at least <b>5 different purely resistive</b> loads (R<sub>L</sub>); does the orange model curve pass through your points?', test: () => new Set(S.d2rows.filter((r) => r.kind === 'R').map((r) => r.R)).size >= 5 },
    { t: 'Try an <b>R + C</b> and an <b>R + L</b> load and record. Does the model also hold for reactive loads?', test: () => S.d2rows.some((r) => r.kind === 'RC') && S.d2rows.some((r) => r.kind === 'RL') },
    { t: 'Your model should give an average error <b>below 3%</b> over at least 6 records (last column of the table). If the error is large, go back to Experiment 1 and measure the phase again.', test: () => { const e = S.d2rows.map(D2.err).filter((x) => x != null); return e.length >= 6 && e.reduce((s, x) => s + Math.abs(x), 0) / e.length < 3; } },
    { t: 'Compare the load power (P<sub>L</sub> = |I<sub>L</sub>|²R<sub>L</sub>): record a resistive load with R<sub>L</sub> ≈ |Z<sub>Th</sub>| (±25%).', test: () => S.d2rows.some((r) => r.kind === 'R' && Math.abs(r.R / cabs(ZTH) - 1) < 0.25) },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'Using your Thevenin model, what is the load current amplitude in mA when <b>R<sub>L</sub> = 220 Ω</b> is connected to the box? (Neglect the shunt/ammeter.)', answer: () => cabs(cdiv(VTH, cadd(ZTH, C(220)))) * 1e3, tol: 3, unit: 'mA', explain: 'I<sub>L</sub> = V<sub>Th</sub>/(Z<sub>Th</sub> + R<sub>L</sub>): no need to re-solve the box. Verify by measurement.', hint: 'The denominator is complex: (R<sub>Th</sub> + 220) + jX<sub>Th</sub>; take its magnitude.' });
  numq('d2', '#d2Q', { id: 'd2q2', q: '(Example 1.28) V<sub>Th</sub> = 96 − j48 V, Z<sub>Th</sub> = 8.8 + j1.6 Ω; 10 Ω is connected across the terminals. What is |I<sub>L</sub>| in amperes?', answer: 5.69, tol: 1, unit: 'A', explain: 'I<sub>L</sub> = (96 − j48)/(18.8 + j1.6) = 4.85 − j2.97 = 5.69∠−31.43° A. Dividing the Norton current between Z<sub>N</sub> and 10 Ω gives the same result.', hint: 'Convert numerator and denominator to polar form and divide.' });
  mcq('d2', '#d2Q', { id: 'd2q3', q: 'Why is it unnecessary to re-solve the inside of the box when the load changes?', opts: ['Because the inside of the box does not change with time', 'Since the circuit is linear and single-frequency, the behaviour at terminals a–b is fully determined by V<sub>Th</sub> and Z<sub>Th</sub> (superposition)', 'Because the load is always small', 'Because the voltmeter is 10 MΩ'], correct: 1, explain: 'Thevenin’s theorem is for linear circuits. If the box contained a diode or an element going into saturation, the model would change with the load.', hint: 'What was the validity condition of the theorem?' });
  mcq('d2', '#d2Q', { id: 'd2q4', q: '“Half-voltage method”: does adjusting R<sub>L</sub> until V<sub>L</sub> = V<sub>Th</sub>/2 and saying R<sub>Th</sub> = R<sub>L</sub> give the correct result for this box?', opts: ['Yes, always', 'No; since Z<sub>Th</sub> has a reactive part, the condition V<sub>L</sub> = V<sub>Th</sub>/2 means |Z<sub>Th</sub> + R<sub>L</sub>| = 2R<sub>L</sub>, not R<sub>L</sub> = R<sub>Th</sub>', 'Only at short circuit', 'Only at 50 Hz'], correct: 1, explain: 'The method is valid only for a purely resistive Z<sub>Th</sub> (e.g. the function generator’s 50 Ω, Experiment 3). In AC the phase must also be measured.', hint: 'How do magnitudes combine in a complex divider?' });
  mcq('d2', '#d2Q', { id: 'd2q5', q: 'In your measurements, how does |V<sub>L</sub>| change as R<sub>L</sub> increases?', opts: ['It decreases', 'It increases and approaches V<sub>Th</sub> (open-circuit limit)', 'It stays constant', 'It drops to zero'], correct: 1, explain: 'As R<sub>L</sub> → ∞, V<sub>L</sub> → V<sub>Th</sub>; as R<sub>L</sub> → 0, I<sub>L</sub> → I<sub>N</sub>. The two end points are the two measurements of Experiment 1.', hint: 'Look at the points on the plot.' });

  /* ================= DENEY 3 · Fonksiyon üreteci, kaynak dönüşümü, Norton ================= */
  const D3 = (() => {
    const box = $('#d3inst'), self = { src: 'real', zmode: '50' };
    const ch = () => (scope.dirty = true);
    const g = inst(box, 'FG-200 FUNCTION GENERATOR', true, 'R<sub>i</sub> = 50 Ω'); const gL = lcd(g.el, 'AMPLITUDE (display)', 'Vpp', 160);
    const zr = document.createElement('div'); zr.className = 'row'; zr.style.cssText = 'gap:4px;margin-bottom:6px';
    zr.innerHTML = '<span style="font-size:11px">OUTPUT LOAD:</span><button class="seg-btn on" data-z="50">50 Ω</button><button class="seg-btn" data-z="hiz">High-Z</button>';
    g.el.insertBefore(zr, g.c);
    $$('button', zr).forEach((x) => (x.onclick = () => { self.zmode = x.dataset.z; $$('button', zr).forEach((y) => y.classList.toggle('on', y === x)); ch(); }));
    const ka = new Lab.Knob(g.c, { label: 'Amplitude', min: 0.2, max: 10, step: 0.1, value: 2, dark: true, fmt: (v) => num(v, 1) + ' Vpp', onChange: ch });
    const lb = inst(box, 'LOAD RESISTOR', false);
    const kR = new Lab.Knob(lb.c, { label: 'R_L', list: [10, 22, 47, 50, 100, 220, 470, 1000, 10000, 1e6], value: 1e6, fmt: (v) => (v >= 1e6 ? 'none (1 MΩ)' : Lab.ohm(v)), onChange: ch });
    const mV = meter(box, 'V1', 'V<sub>L</sub> (rms)');
    const scope = makeScope($('#d3scope'), { chs: 'CH1: V<sub>L</sub> · CH2: SYNC', v1: 1, v2: 1, t: 2e-4 });
    self.scope = scope;
    const ins = ['vth', 'rth', 'in', 'rn'];
    S.d3m = S.d3m || {};
    ins.forEach((k) => { const e = $('#d3' + k); e.value = S.d3m[k] ?? ''; e.addEventListener('input', () => { S.d3m[k] = e.value; save(); ch(); }); });
    const srcSel = $('#d3src'); srcSel.value = self.src; srcSel.onchange = () => { self.src = srcSel.value; ch(); };
    const sg = $('#d3sch');
    function schem() {
      sg.innerHTML = '';
      E('rect', { x: 15, y: 25, width: 210, height: 190, fill: 'none', stroke: '#999', 'stroke-dasharray': '4 4' }, sg);
      sch.t(sg, 120, 232, { real: 'real generator (inside hidden)', thev: 'your Thevenin model', norton: 'your Norton model' }[self.src], 'lbl').style.fontSize = '12px';
      if (self.src === 'norton') {
        E('circle', { cx: 70, cy: 120, r: 20, class: 'w', fill: '#fff' }, sg); E('path', { d: 'M70,132 V106 m-6,8 l6,-8 l6,8', class: 'w' }, sg);
        sch.w(sg, [[70, 100], [70, 60], [250, 60]]); sch.w(sg, [[70, 140], [70, 180], [250, 180]]); sch.dot(sg, 160, 60); sch.dot(sg, 160, 180); sch.rV(sg, 160, 60, 180);
        sch.t(sg, 40, 125, 'I<tspan font-size="10" dy="3">N</tspan>', 'lbl', 'end'); sch.t(sg, 176, 125, 'R<tspan font-size="10" dy="3">N</tspan>', 'lbl', 'start');
      } else {
        sch.src(sg, 70, 120); sch.w(sg, [[70, 100], [70, 60], [110, 60]]); sch.rH(sg, 110, 180, 60); sch.w(sg, [[180, 60], [250, 60]]); sch.w(sg, [[70, 140], [70, 180], [250, 180]]);
        sch.t(sg, 40, 125, self.src === 'real' ? 'E' : 'V<tspan font-size="10" dy="3">Th</tspan>', 'lbl', 'end'); sch.t(sg, 145, 45, self.src === 'real' ? '50 Ω' : 'R<tspan font-size="10" dy="3">Th</tspan>');
      }
      sch.dot(sg, 250, 60); sch.dot(sg, 250, 180); sch.w(sg, [[250, 60], [330, 60]]); sch.rV(sg, 330, 60, 180); sch.w(sg, [[330, 180], [250, 180]]); sch.t(sg, 346, 125, 'R<tspan font-size="10" dy="3">L</tspan>', 'lbl', 'start');
      sch.w(sg, [[330, 60], [420, 60]]); sch.t(sg, 425, 64, '→ CH1, V1', 'lbl', 'start'); sch.w(sg, [[330, 180], [420, 180]]); sch.gnd(sg, 420, 180);
    }
    schem();
    const emf = () => (self.zmode === '50' ? 2 : 1) * ka.value; // tepe-tepe açık devre
    const pars = () => ins.map((k) => Lab.parse(S.d3m[k]));
    function vL() { // tepe-tepe yük gerilimi (osiloskop 1 MΩ dahil)
      const RL = kR.value >= 1e6 ? 1e6 : 1 / (1 / kR.value + 1e-6), p = pars();
      if (self.src === 'thev') { if (!isFinite(p[0]) || !(p[1] >= 0)) return NaN; return (p[0] * RL) / (p[1] + RL); }
      if (self.src === 'norton') { if (!isFinite(p[2]) || !(p[3] > 0)) return NaN; return 2 * p[2] * 1e-3 * ((p[3] * RL) / (p[3] + RL)); }
      return (emf() * RL) / (RG + RL);
    }
    let cur = {};
    self.update = () => {
      gL(num(ka.value, 2)); const v = vL(); cur = { src: self.src, emf: emf(), RL: kR.value, v, zmode: self.zmode, a: ka.value };
      mV(isFinite(v) ? v / (2 * Math.SQRT2) : 0);
      if (scope.dirty) { scope.dirty = false; schem(); scope.render(1000, C(isFinite(v) ? v / (2 * Math.SQRT2) : 0), C(1)); }
    };
    const SN = { real: 'real generator', thev: 'Thevenin model', norton: 'Norton model' };
    const draw = tableBind('d3', (r) => [SN[r.src], r.src === 'real' ? `${r.zmode === '50' ? '50 Ω' : 'High-Z'} · display ${num(r.a, 1)} Vpp` : '—', r.RL >= 1e6 ? 'none' : Lab.ohm(r.RL), num(r.v, 3)],
      'hafta4_deney3.csv', ['#', 'source', 'setting', 'RL (ohm)', 'VL (Vpp)'], (r) => [SN[r.src], r.src === 'real' ? r.zmode + ' / ' + r.a : '', r.RL, +r.v.toFixed(4)]);
    self.rec = () => { if (!isFinite(cur.v)) return Lab.toast('Model values are missing.'); S.d3rows.push({ ...cur }); save(); draw(); Lab.toast(`Recorded: ${SN[cur.src]}, V<sub>L</sub> = ${num(cur.v, 3)} Vpp`); };
    $('#d3rec').onclick = self.rec; draw();
    Object.assign(self, { ka, kR, cur: () => cur });
    return self;
  })();
  const d3match = (src) => { const set = new Set(); S.d3rows.filter((r) => r.src === src).forEach((m) => { if (S.d3rows.some((r) => r.src === 'real' && r.RL === m.RL && Math.abs(m.v / r.v - 1) < 0.02)) set.add(m.RL); }); return set.size; };
  steps('d3', [
    { t: 'Set the generator to <b>High-Z</b> mode and the amplitude to <b>10 Vpp</b>; record without a load (oscilloscope only). Do the display and the measurement agree?', test: () => S.d3rows.some((r) => r.src === 'real' && r.zmode === 'hiz' && near(r.a, 10, 0.05) && r.RL >= 1e6) },
    { t: 'At the same setting connect <b>R<sub>L</sub> = 50 Ω</b> and record. Why did the voltage drop to half?', test: () => S.d3rows.some((r) => r.src === 'real' && r.zmode === 'hiz' && near(r.a, 10, 0.05) && r.RL === 50) },
    { t: 'Switch the generator to <b>50 Ω</b> mode: with the display at 5 Vpp, measure and record with a 50 Ω load and with no load. In which case is the display “right”?', test: () => ['50', 1e6].every((x) => S.d3rows.some((r) => r.src === 'real' && r.zmode === '50' && near(r.a, 5, 0.05) && (x === '50' ? r.RL === 50 : r.RL >= 1e6))) },
    { t: 'From your measurements enter the generator’s <b>Thevenin model</b> (V<sub>Th</sub> Vpp, R<sub>Th</sub>), set the source selector to “Thevenin”; record the same result as the real generator (±2%) at <b>at least 2 different R<sub>L</sub></b> values.', test: () => d3match('thev') >= 2 },
    { t: '<b>Source transformation:</b> compute and enter the Norton model (I<sub>N</sub> mA peak, R<sub>N</sub>); record the same result as the real generator at at least 2 different R<sub>L</sub> values.', test: () => d3match('norton') >= 2 },
  ]);
  mcq('d3', '#d3Q', { id: 'd3q1', q: 'The generator is in <b>50 Ω</b> mode, display 2 Vpp. What is measured if only the oscilloscope (1 MΩ) is connected to the output?', opts: ['2 Vpp', '≈ 4 Vpp', '1 Vpp', '0 V'], correct: 1, explain: 'The display assumes a 50 Ω load: E = 4 Vpp, half of it, 2 Vpp, across a 50 Ω load. The unloaded output shows E. This is the source of the lab complaint “I measured twice as much”.', hint: 'For which load is the number on the display correct?' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'A generator’s open-circuit voltage is 4 Vpp, and 2.667 Vpp is measured across a 100 Ω load. What is the internal resistance in ohms?', answer: 50, tol: 2, unit: 'Ω', explain: 'R<sub>i</sub> = R<sub>L</sub>(V<sub>oc</sub>/V<sub>L</sub> − 1) = 100(1.5 − 1) = 50 Ω. It follows from the voltage divider.', hint: 'Solve V<sub>L</sub> = V<sub>oc</sub>·R<sub>L</sub>/(R<sub>i</sub> + R<sub>L</sub>) for R<sub>i</sub>.' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'What is the Norton current in mA (peak) of a generator with 10 Vpp open-circuit voltage and 50 Ω internal resistance?', answer: 100, tol: 1, unit: 'mA', explain: 'I<sub>N</sub> = V<sub>Th</sub>/R<sub>Th</sub> = 5 V peak / 50 Ω = 100 mA peak; R<sub>N</sub> = 50 Ω in parallel.', hint: 'First convert Vpp to peak (÷2).' });
  numq('d3', '#d3Q', { id: 'd3q4', q: '(Example 1.26) A 40∠0° V source with series 1 + j3 Ω. What is the amplitude of the equivalent current source in amperes?', answer: 12.65, tol: 1, unit: 'A', explain: 'I = 40/(1 + j3) = 4 − j12 A = 12.65∠−71.57° A; the 1 + j3 Ω moves to parallel.', hint: 'Multiply by the conjugate: (1 + j3)(1 − j3) = 10.' });
  mcq('d3', '#d3Q', { id: 'd3q5', q: '(Example 1.26) If we had also included the 10 − j19 Ω branch, across which V<sub>0</sub> is measured, in the source transformation, could we find V<sub>0</sub>?', opts: ['Yes; the transformation preserves every voltage', 'No; the transformation preserves only terminals a–b, and the internal voltage and current of the transformed branch are lost', 'Yes, only the current direction changes', 'No, because it is a capacitor'], correct: 1, explain: 'Do not touch the element containing the quantity you are looking for. In the experiment, too, the Norton model drives the load identically, but the current “inside” the model is not the same as inside the real generator.', hint: 'From which terminals is the transformation equivalent?' });
  mcq('d3', '#d3Q', { id: 'd3q6', q: 'In the Norton model, is the power dissipated in R<sub>N</sub> equal to the power dissipated in the real generator’s 50 Ω?', opts: ['Yes, equivalent circuits are the same in every respect', 'No; equivalence holds only for the voltage-current relation at the terminals, internal power loss differs (with no load the Norton model dissipates power internally, the Thevenin model does not)', 'Equal only at short circuit', 'Power is undefined'], correct: 1, explain: 'At open circuit there is no current in the Thevenin model (loss 0), while in the Norton model all of I<sub>N</sub> flows through R<sub>N</sub>. An equivalent circuit is not used to compute efficiency.', hint: 'With no load, does current flow inside the two models?' });

  /* ================= RAPOR ================= */
  function buildReport() {
    const sec = { onhaz: 'Pre-lab', d1: 'Experiment 1', d2: 'Experiment 2', d3: 'Experiment 3' };
    let tot = 0, ok2 = 0;
    const qrows = Object.entries(qids).map(([pg, ids]) => ids.map((id) => {
      const a = S.answers[id]; tot++; if (a && a.ok) ok2++;
      const q = $(`[data-qid="${id}"] .qt`); const qt = q ? q.innerHTML : id;
      return `<tr><td class="l">${sec[pg]}</td><td class="l">${qt}</td><td class="l">${a ? a.a : '—'}</td><td>${a ? (a.ok ? '✔' : '✘') : '—'}</td></tr>`;
    }).join('')).join('');
    let sTot = 0, sOk = 0;
    Object.keys(stepDefs).forEach((k) => stepDefs[k].forEach((_, i) => { sTot++; if (S.steps[k + '_' + i]) sOk++; }));
    const img = (c) => { try { return `<img src="${c.toDataURL()}" style="width:48%;border:1px solid #ccc">`; } catch (e) { return ''; } };
    const tab = (id) => `<table class="data"><thead>${$(`#${id} thead`).innerHTML}</thead><tbody>${$(`#${id} tbody`).innerHTML}</tbody></table>`;
    const m = D2.model();
    const html = `
      <h2 style="margin:0">Circuit Theory II · Virtual Lab · Week 4 Report</h2>
      <p><b>Topic:</b> Thevenin and Norton equivalents in AC circuits, source transformation, internal resistance of the function generator</p>
      <table class="data" style="width:auto"><tr><th>Full name</th><td class="l">${S.st.name || ''}</td><th>ID</th><td class="l">${S.st.no || ''}</td><th>Group</th><td class="l">${S.st.group || ''}</td><th>Date</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Summary</h3>
      <p>Black box: <b>${BX.code}</b> · Lab-sheet steps completed: <b>${sOk}/${sTot}</b> · Correct answers: <b>${ok2}/${tot}</b> · Score: <b>${Math.round((50 * sOk) / sTot + (50 * ok2) / tot)}/100</b></p>
      ${m ? `<p>Student’s Thevenin model: V<sub>Th</sub> = ${fP(m.V, 3)} V, Z<sub>Th</sub> = ${fC(m.Z, 2)} Ω</p>` : ''}
      <h3>Answers</h3>
      <table class="data"><thead><tr><th>Section</th><th>Question</th><th>Answer</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Experiment 1 · Open/short-circuit measurements</h3>${tab('d1tab')}
      <h3>Experiment 2 · Verification with loads</h3>${tab('d2tab')}
      <div>${img(D2.plotCanvas)}</div>
      <h3>Experiment 3 · Generator model and source transformation</h3>${tab('d3tab')}
      <h3>Student discussion</h3>
      <p style="white-space:pre-wrap;border:1px solid #ccc;padding:8px;min-height:60px">${(S.st.comment || '').replace(/</g, '&lt;')}</p>`;
    $('#reportPreview').innerHTML = html; $('#report').innerHTML = html;
  }
  $('#printBtn').onclick = () => { buildReport(); window.print(); };
  $('#resetBtn').onclick = () => { if (confirm('Delete all measurements, answers and progress for this week? (Your black box will also change.)')) { localStorage.removeItem('devrelab-en:' + KEY); location.reload(); } };

  /* ================= klavye / döngü ================= */
  $('#helpBtn').onclick = () => $('#helpModal').classList.add('show');
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (e.key === 'Escape') $('#helpModal').classList.remove('show');
    if (e.altKey && /^[0-6]$/.test(e.key)) { go(pages[+e.key]); e.preventDefault(); return; }
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.key === '?') $('#helpModal').classList.add('show');
    if (e.key === 'r' || e.key === 'R') { const D = { d1: D1, d2: D2, d3: D3 }[S.page]; if (D) D.rec(); }
  });
  let tick = 0;
  function loop() {
    tick++;
    if (S.page === 'onbilgi') OB.frame();
    if (S.page === 'd1') { D1.update(); evalSteps('d1'); }
    if (S.page === 'd2') { D2.update(); evalSteps('d2'); }
    if (S.page === 'd3') { D3.update(); evalSteps('d3'); }
    if (tick % 15 === 0) { const D = { d1: D1, d3: D3 }[S.page]; if (D) D.scope.dirty = true; }
    requestAnimationFrame(loop);
  }
  ['d1', 'd2', 'd3'].forEach(evalSteps);
  go(S.page); progress(); loop();
})();

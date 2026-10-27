/* Devre Kuramı II · Hafta 3 — Seri, Paralel, Δ–Y ve Frekans Bölgesinde Kirchhoff */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd2h03';
  const S = Object.assign({ answers: {}, steps: {}, st: {}, page: 'giris', d1rows: [], d2rows: [], d3rows: [], d4rows: [], d4z: {}, d4mode: 'delta', d4pre: 0 }, Lab.store.load(KEY));
  if (S.ctol == null) S.ctol = (Math.random() * 2 - 1) * 0.05; // kondansatör toleransı ±%5 (öğrenciye özgü)
  if (!S.d4rand) { const ri = (a, b) => Math.round(a + Math.random() * (b - a)); S.d4rand = { ab: [ri(5, 60), ri(-40, 40)], ac: [ri(10, 90), ri(-40, 40)], bc: [ri(5, 50), 0], bd: [ri(10, 80), ri(20, 80)], cd: [ri(5, 40), -ri(10, 60)] }; }
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
  const Creal = (c) => c * (1 + S.ctol);

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
  const pages = ['giris', 'onbilgi', 'onhaz', 'd1', 'd2', 'd3', 'd4', 'rapor'];
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

  /* ================= ÖN BİLGİ · dönen fazörler animasyonu ================= */
  const OB = (() => {
    const svg = $('#obSvg'), w = $('#obW'), txt = $('#obTxt');
    const R = 10, L = 0.05, Cc = 20e-6, Vm = 20; // Örnek 1.23
    let t0 = performance.now();
    function frame() {
      const om = 1000 * Math.pow(10, +w.value), Z = C(R, om * L - 1 / (om * Cc)), I = cdiv(C(Vm), Z);
      const VR = cscale(I, R), VL = cmul(I, C(0, om * L)), VC = cmul(I, C(0, -1 / (om * Cc))), Vs = C(Vm);
      const th = ((performance.now() - t0) / 1000) * TAU * 0.25, rot = polar(1, (th * 180) / Math.PI);
      const r = (z) => cmul(z, rot);
      const pts = [r(VR), r(cadd(VR, VL)), r(Vs)], M = Math.max(...pts.map(cabs), cabs(VR), 1) * 1.08;
      svg.innerHTML = '';
      const cx = 150, cy = 150, s = 125 / M, X = (z) => cx + z.re * s, Y = (z) => cy - z.im * s;
      E('circle', { cx, cy, r: cabs(Vs) * s, fill: 'none', stroke: '#ddd', 'stroke-dasharray': '3 4' }, svg);
      E('line', { x1: 20, y1: cy, x2: 280, y2: cy, stroke: '#bbb' }, svg); E('line', { x1: cx, y1: 20, x2: cx, y2: 280, stroke: '#bbb' }, svg);
      sch.t(svg, 284, cy + 4, 'Re', 'lbl', 'start').style.fontSize = '11px';
      const arrow = (a, b, col, lab) => {
        const ax = X(a), ay = Y(a), bx = X(b), by = Y(b), Ln = Math.hypot(bx - ax, by - ay); if (Ln < 2) return;
        const ux = (bx - ax) / Ln, uy = (by - ay) / Ln, h = Math.min(9, Ln * 0.4);
        E('line', { x1: ax, y1: ay, x2: bx - ux * h * 0.8, y2: by - uy * h * 0.8, stroke: col, 'stroke-width': 2.5 }, svg);
        E('path', { d: `M${bx},${by} L${bx - ux * h - uy * h * 0.45},${by - uy * h + ux * h * 0.45} L${bx - ux * h + uy * h * 0.45},${by - uy * h - ux * h * 0.45} Z`, fill: col }, svg);
        E('line', { x1: bx, y1: by, x2: bx, y2: cy, stroke: col, 'stroke-dasharray': '2 3', opacity: 0.5 }, svg);
        const tt = sch.t(svg, bx + 8, by - 6, lab, 'lbl', 'start'); tt.style.fill = col; tt.style.fontWeight = 700;
      };
      const O = C(0);
      arrow(O, r(Vs), '#222', 'V_s');
      arrow(O, r(VR), '#c62828', 'V_R'); arrow(r(VR), r(cadd(VR, VL)), '#1565c0', 'V_L'); arrow(r(cadd(VR, VL)), r(Vs), '#2e7d32', 'V_C');
      // sağda: anlık değerler (gerçek eksene izdüşüm) — çubuklar
      const inst = [['v_R', r(VR).re, '#c62828'], ['v_L', r(VL).re, '#1565c0'], ['v_C', r(VC).re, '#2e7d32'], ['v_s', r(Vs).re, '#222']];
      const bx0 = 470, bs = 120 / M;
      sch.t(svg, 470, 22, 'Instantaneous values (projection on real axis)', 'lbl').style.fontSize = '12px';
      E('line', { x1: bx0, y1: 30, x2: bx0, y2: 280, stroke: '#999' }, svg);
      inst.forEach(([n, v, col], i) => {
        const y = 55 + i * 52;
        E('rect', { x: Math.min(bx0, bx0 + v * bs), y: y - 12, width: Math.abs(v * bs), height: 24, fill: col, opacity: 0.8 }, svg);
        sch.t(svg, 330, y + 5, `${n} = ${num(v, 1)} V`, 'lbl', 'start').style.fill = col;
      });
      const sum = inst[0][1] + inst[1][1] + inst[2][1];
      sch.t(svg, 330, 270, `v_R + v_L + v_C = ${num(sum, 1)} V  (= v_s)`, 'val', 'start');
      txt.innerHTML = `ω = <b>${num(om, 0)} rad/s</b> (ω<sub>0</sub> = 1000 rad/s) · |V<sub>R</sub>| = ${num(cabs(VR), 1)} V · |V<sub>L</sub>| = ${num(cabs(VL), 1)} V · |V<sub>C</sub>| = ${num(cabs(VC), 1)} V · <b>arithmetic sum = ${num(cabs(VR) + cabs(VL) + cabs(VC), 1)} V</b>, yet |V<sub>s</sub>| = 20 V. Voltmeters show magnitude (rms value); they do not “see” phase. What must be added are the arrows.`;
    }
    return { frame };
  })();

  /* ================= ÖN HAZIRLIK ================= */
  numq('onhaz', '#preQ', { id: 'p1', q: '1) (Example 1.18) v<sub>s</sub> = 750cos(5000t + 30°) V, R = 90 Ω, L = 32 mH, C = 5 µF in series. What is the current amplitude |I| in amperes?', answer: 5, unit: 'A', explain: 'Z = 90 + j160 − j40 = 90 + j120 = 150∠53.13° Ω → |I| = 750/150 = 5 A.', hint: 'First find Z<sub>L</sub> = jωL and Z<sub>C</sub> = −j/(ωC); reactances add with their signs.' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) In the same circuit, what is the phase angle of the current in degrees?', answer: -23.13, tol: 0, abs: 0.3, unit: '°', explain: 'φ<sub>I</sub> = φ<sub>V</sub> − φ<sub>Z</sub> = 30° − 53.13° = −23.13°. The circuit is inductive; the current lags.', hint: 'In division, angles subtract.' });
  mcq('onhaz', '#preQ', { id: 'p3', q: '3) 3 + j4 Ω and 3 − j4 Ω are connected in parallel. What is the equivalent impedance?', opts: ['6 Ω', '≈ 4.17 Ω, purely real', '≈ 4.17 + j2 Ω', '0 Ω'], correct: 1, explain: 'Product/sum: 25/6 = 4.17 Ω. The product of a conjugate pair is |Z|² and the sum is 2R: both are real.', hint: 'Impedances do not add in parallel; use product/sum.' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) For Z = 3 + j4 Ω, what is the real part G of the admittance in siemens?', answer: 0.12, unit: 'S', explain: 'Y = (3 − j4)/25 = 0.12 − j0.16 S. G ≠ 1/R = 0.333 S!', hint: 'Y = 1/Z; multiply by the conjugate; the denominator is R² + X².' });
  numq('onhaz', '#preQ', { id: 'p5', q: '5) (Example 1.24) 10 + j15 Ω in series with (8 + j6) ∥ (−j10) Ω. What is the magnitude of the input impedance in ohms?', answer: 22.36, tol: 1, unit: 'Ω', explain: 'Z<sub>p</sub> = (8+j6)(−j10)/(8−j4) = 10 − j5; Z = 20 + j10 = 22.36∠26.57° Ω.', hint: 'From the inside out: the parallel block first.' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) Three equal delta-connected impedances Z<sub>Δ</sub> = 30 Ω are converted to wye. What is a Y branch in ohms?', opts: ['90 Ω', '30 Ω', '15 Ω', '10 Ω'], correct: 3, explain: 'Z<sub>Y</sub> = Z<sub>Δ</sub>/3 = 10 Ω. Getting 15 Ω means a denominator error (only the two adjacent elements).', hint: 'The denominator is the sum of all three Δ elements.' });

  /* ================= DENEY 1 · Seri RLC ve KVL ================= */
  const D1 = (() => {
    const box = $('#d1inst'), self = { ph: !!S.d1ph };
    const ch = () => (scope.dirty = true);
    const G = gen(box, { f: 1000, a: 5, ch });
    const eb = inst(box, 'ELEMENT BOX', false);
    const kR = new Lab.Knob(eb.c, { label: 'R', list: RLIST, value: 100, fmt: (v) => Lab.ohm(v), onChange: ch });
    const kL = new Lab.Knob(eb.c, { label: 'L (inductor)', list: LLIST, value: 0.05, fmt: (v) => eng(v, 'H'), onChange: ch });
    const kC = new Lab.Knob(eb.c, { label: 'C', list: CLIST, value: 20e-6, fmt: (v) => eng(v, 'F'), onChange: ch });
    const mS = meter(box, 'V1', 'V<sub>s</sub> (generator terminal)'), mR = meter(box, 'V2', 'V<sub>R</sub>'), mL = meter(box, 'V3', 'V<sub>L</sub> (inductor)'), mC = meter(box, 'V4', 'V<sub>C</sub>'), mI = meter(box, 'A1', 'I', 'A');
    const scope = makeScope($('#d1scope'), { chs: 'CH1: V<sub>s</sub> · CH2: V<sub>R</sub> (in phase with current)', v1: 5, v2: 2, t: 2e-4 });
    self.scope = scope;
    // şema
    const g = $('#d1sch');
    sch.src(g, 50, 140); sch.t(g, 50, 185, 'E', 'lbl'); sch.w(g, [[50, 120], [50, 60], [70, 60]]); sch.rH(g, 70, 120, 60); sch.t(g, 95, 45, 'R<tspan font-size="10" dy="3">i</tspan><tspan dy="-3">=50 Ω</tspan>');
    E('rect', { x: 18, y: 30, width: 120, height: 190, fill: 'none', stroke: '#999', 'stroke-dasharray': '4 4' }, g); sch.t(g, 78, 236, 'function generator', 'lbl').style.fontSize = '11px';
    sch.w(g, [[120, 60], [170, 60]]); sch.dot(g, 150, 60); sch.rH(g, 170, 240, 60); sch.w(g, [[240, 60], [270, 60]]); sch.lH(g, 270, 350, 60); sch.w(g, [[350, 60], [380, 60]]); sch.cH(g, 380, 430, 60);
    sch.w(g, [[430, 60], [470, 60], [470, 220], [50, 220], [50, 160]]); sch.dot(g, 150, 220);
    sch.t(g, 205, 40, 'R'); sch.t(g, 310, 38, 'L, r<tspan font-size="10" dy="3">L</tspan>'); sch.t(g, 405, 38, 'C');
    sch.meter(g, 150, 140, 'V1'); sch.w(g, [[150, 60], [150, 127]]); sch.w(g, [[150, 153], [150, 220]]);
    const tI = sch.t(g, 300, 120, '', 'val'), tVs = sch.t(g, 168, 145, '', 'val', 'start'), tZ = sch.t(g, 300, 150, '', 'val'), tMode = sch.t(g, 300, 185, '', 'val');
    let cur = {};
    function calc() {
      const f = G.kf.value, om = TAU * f, R = kR.value, L = kL.value, Cn = kC.value, Ca = Creal(Cn);
      const zR = C(R), zL = C(rL(L), om * L), zC = C(0, -1 / (om * Ca)), Z = cadd(cadd(zR, zL), zC);
      const I = cdiv(C(G.ka.value), cadd(C(RG), Z));
      cur = { f, R, L, C: Cn, I, Vs: cmul(I, Z), VR: cmul(I, zR), VL: cmul(I, zL), VC: cmul(I, zC), Z, f0: 1 / (TAU * Math.sqrt(L * Ca)) };
      return cur;
    }
    self.update = () => {
      const c = calc(); G.show();
      mS(cabs(c.Vs)); mR(cabs(c.VR)); mL(cabs(c.VL)); mC(cabs(c.VC)); mI(cabs(c.I));
      tI.textContent = `I = ${eng(cabs(c.I), 'A')}`; tVs.textContent = `V_s = ${num(cabs(c.Vs), 3)} V`;
      tZ.textContent = `R=${Lab.ohm(c.R)} · L=${eng(c.L, 'H')} · C=${eng(c.C, 'F')}`;
      const X = c.Z.im; tMode.textContent = Math.abs(X) < 0.03 * cabs(c.Z) ? 'X ≈ 0 · near resonance' : X > 0 ? 'X > 0 · inductive' : 'X < 0 · capacitive';
      tMode.style.fill = Math.abs(X) < 0.03 * cabs(c.Z) ? '#1a8a4a' : X > 0 ? '#1565c0' : '#2e7d32';
      if (self.ph) {
        phasorDiag($('#d1pd'), [{ z: c.Vs, color: '#222', label: 'V_s', w: 3 }, { z: c.VR, color: '#c62828', label: 'V_R' }, { z: c.VL, from: c.VR, color: '#1565c0', label: 'V_L' }, { z: c.VC, from: cadd(c.VR, c.VL), color: '#2e7d32', label: 'V_C' }, { z: cscale(c.I, (0.6 * cabs(c.VR)) / cabs(c.I)), color: '#e07a10', label: 'I', dash: '5 3', w: 1.8 }]);
        $('#d1pdTxt').innerHTML = `Arrows tip-to-tail: V<sub>R</sub>+V<sub>L</sub>+V<sub>C</sub> = <b>${fP(cadd(cadd(c.VR, c.VL), c.VC), 3)} V</b> · V<sub>s</sub> = <b>${fP(c.Vs, 3)} V</b> (angles relative to E, not to the current)`;
      }
      if (scope.dirty) { scope.dirty = false; scope.render(c.f, c.Vs, c.VR); }
    };
    $('#d1ph').checked = self.ph; $('#d1ph').onchange = (e) => { self.ph = S.d1ph = e.target.checked; save(); if (!self.ph) { $('#d1pd').innerHTML = ''; $('#d1pdTxt').innerHTML = 'Diagram hidden.'; } };
    const plot = new Lab.Plot($('#d1plot'), { xlabel: 'f (Hz)', ylabel: '|I| (mA)' });
    const draw = tableBind('d1', (r) => [num(r.f, 1), Lab.ohm(r.R) + ' / ' + eng(r.L, 'H') + ' / ' + eng(r.C, 'F'), num(r.vs, 3), num(r.vr, 3), num(r.vl, 3), num(r.vc, 3), `<b>${num(r.vr + r.vl + r.vc, 3)}</b>`, num(r.i * 1e3, 2)],
      'hafta3_deney1.csv', ['#', 'f (Hz)', 'R', 'L', 'C', 'Vs', 'VR', 'VL', 'VC', 'VR+VL+VC', 'I (mA)'], (r) => [+r.f.toFixed(2), r.R, r.L, r.C, +r.vs.toFixed(4), +r.vr.toFixed(4), +r.vl.toFixed(4), +r.vc.toFixed(4), +(r.vr + r.vl + r.vc).toFixed(4), +(r.i * 1e3).toFixed(3)]);
    function drawPlot() {
      const rows = S.d1rows.filter((r) => r.R === kR.value && r.L === kL.value && r.C === kC.value);
      const ser = [{ pts: rows.map((r) => [r.f, r.i * 1e3]).sort((a, b) => a[0] - b[0]), dots: true, line: true, width: 1, color: '#0b5cad' }];
      const fs = rows.map((r) => r.f), fa = Math.min(...fs, 50), fb = Math.max(...fs, 500);
      if ($('#d1theo').checked) {
        const pts = []; for (let i = 0; i <= 200; i++) { const f = fa + ((fb - fa) * i) / 200, om = TAU * f; pts.push([f, (1e3 * G.ka.value) / cabs(C(RG + kR.value, om * kL.value - 1 / (om * kC.value)))]); }
        ser.unshift({ pts, line: true, color: '#e07a10', dash: [6, 4] });
      }
      plot.draw(ser, [fa, fb], null);
    }
    self.d1 = drawPlot; self.d1t = draw;
    $('#d1theo').onchange = drawPlot;
    self.rec = () => { const c = calc(); S.d1rows.push({ f: c.f, R: c.R, L: c.L, C: c.C, vs: cabs(c.Vs), vr: cabs(c.VR), vl: cabs(c.VL), vc: cabs(c.VC), i: cabs(c.I), f0: c.f0 }); save(); draw(); drawPlot(); Lab.toast(`Recorded: f = ${num(c.f, 1)} Hz, |I| = ${eng(cabs(c.I), 'A')}`); };
    $('#d1rec').onclick = self.rec;
    $('#d1del').onclick = () => { S.d1rows.pop(); save(); draw(); drawPlot(); };
    draw(); drawPlot();
    Object.assign(self, { G, kR, kL, kC, cur: () => cur, plotCanvas: $('#d1plot') });
    return self;
  })();
  const grp = (rows) => { const m = {}; rows.forEach((r) => (m[`${r.R}|${r.L}|${r.C}`] = m[`${r.R}|${r.L}|${r.C}`] || []).push(r)); return Object.values(m); };
  steps('d1', [
    { t: 'Select R = 100 Ω, L = 50 mH, C = 20 µF; set the generator to <b>1 kHz, 5 V</b>, read the four voltmeters and record (<kbd>R</kbd>).', test: () => S.d1rows.some((r) => r.R === 100 && r.L === 0.05 && r.C === 20e-6 && near(r.f, 1000, 100)) },
    { t: '<b>Surprising result:</b> record a measurement where the arithmetic sum V<sub>R</sub> + V<sub>L</sub> + V<sub>C</sub> exceeds V<sub>s</sub> by <b>at least 30%</b>. Has KVL failed?', test: () => S.d1rows.some((r) => r.vr + r.vl + r.vc > 1.3 * r.vs) },
    { t: 'Turn on the <b>phasor diagram</b>: when the V<sub>R</sub>, V<sub>L</sub>, V<sub>C</sub> arrows are added tip-to-tail, do you reach the tip of the V<sub>s</sub> arrow?', test: () => D1.ph },
    { t: 'With the same R, L, C take measurements at <b>at least 6 different frequencies</b> below and above f<sub>0</sub>; study the |I|–f plot.', test: () => grp(S.d1rows).some((g) => new Set(g.map((r) => Math.round(r.f))).size >= 6 && g.some((r) => r.f < 0.8 * r.f0) && g.some((r) => r.f > 1.25 * r.f0)) },
    { t: 'Find resonance: set the frequency of maximum current (±2%) and record. Are V<sub>C</sub> and V<sub>L</sub> larger than V<sub>s</sub>?', test: () => S.d1rows.some((r) => Math.abs(r.f - r.f0) / r.f0 < 0.02) },
    { t: 'At a frequency below f<sub>0</sub>, turn on the oscilloscope <b>CURSOR</b>s and measure Δt between the CH1 and CH2 zero crossings (φ = 360°·f·Δt).', test: () => D1.scope.curUsed && D1.cur().f < 0.85 * D1.cur().f0 },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: '(Example 1.23) L = 50 mH, C = 20 µF. What is the resonant frequency f<sub>0</sub> in Hz?', answer: 159.15, tol: 1, unit: 'Hz', explain: 'ω<sub>0</sub> = 1/√(LC) = 1000 rad/s → f<sub>0</sub> = 159.15 Hz. Your measured value may shift by the capacitor tolerance.', hint: 'ω<sub>0</sub> = 1/√(LC), then divide by 2π.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: '(Example 1.23) R = 10 Ω, v<sub>s</sub> = 20cos ω<sub>0</sub>t V. At resonance, what is |V<sub>L</sub>| in volts (peak)?', answer: 100, tol: 1, unit: 'V', explain: 'I = 20/10 = 2 A, |V<sub>L</sub>| = ω<sub>0</sub>L·I = 50·2 = 100 V = Q·|V<sub>s</sub>| (Q = 5). KVL still holds: V<sub>L</sub> + V<sub>C</sub> = 0.', hint: 'At resonance Z = R; find the current first, then multiply by ω<sub>0</sub>L.' });
  mcq('d1', '#d1Q', { id: 'd1q3', q: 'Why is the arithmetic sum of the voltmeter readings larger than V<sub>s</sub>?', opts: ['The voltmeters are faulty; KVL does not hold in AC', 'KVL holds for instantaneous values and phasors; a voltmeter shows only the magnitude (rms value), and magnitudes of voltages with different phases do not add', 'Because of the generator’s 50 Ω internal resistance', 'Because of the inductor’s winding resistance'], correct: 1, explain: 'V<sub>L</sub> and V<sub>C</sub> are in antiphase and partly cancel each other; the readings, however, are always positive. See the rotating-phasor animation in Background.', hint: 'Do the arrows in the phasor diagram point in the same direction?' });
  numq('d1', '#d1Q', { id: 'd1q4', q: 'With your current R, L, C selection, what <b>V<sub>C</sub>/V<sub>s</sub></b> ratio do you expect at resonance? (V<sub>s</sub> is the voltage at the generator terminals; do not forget the inductor’s winding resistance.)', answer: () => { const c = D1.cur(), Ca = Creal(c.C), w0 = 1 / Math.sqrt(c.L * Ca); return 1 / (w0 * Ca) / Math.hypot(c.R + rL(c.L), 0); }, tol: 6, unit: '', explain: 'At resonance V<sub>s</sub> = I(R + r<sub>L</sub>) and |V<sub>C</sub>| = I/(ω<sub>0</sub>C) → ratio = 1/(ω<sub>0</sub>C(R + r<sub>L</sub>)). If r<sub>L</sub> is neglected the ratio comes out too large.', hint: 'At resonance the reactances cancel; V<sub>s</sub> is carried only by the resistances: R and the inductor’s r<sub>L</sub> (LCR meter value in the lecture notes/Notes box).' });
  mcq('d1', '#d1Q', { id: 'd1q5', q: 'How does a series RLC circuit behave when f &lt; f<sub>0</sub>?', opts: ['Inductive; current lags V<sub>s</sub>', 'Capacitive; current leads V<sub>s</sub>', 'Purely resistive', 'The current is zero'], correct: 1, explain: '1/ωC &gt; ωL → X &lt; 0, φ<sub>Z</sub> &lt; 0 → φ<sub>I</sub> = φ<sub>V</sub> − φ<sub>Z</sub> &gt; 0. On the oscilloscope CH2 (V<sub>R</sub>) crosses zero before CH1.', hint: 'Which reactance is larger at low frequency?' });
  mcq('d1', '#d1Q', { id: 'd1q6', q: 'Why does the V1 (generator terminal) reading drop noticeably below the generator’s set value near resonance?', opts: ['The generator is faulty', 'Since the current is maximum, the drop across the 50 Ω internal resistance is also maximum; the generator is not an ideal voltage source', 'The voltmeter is frequency-sensitive', 'The capacitor becomes a short circuit'], correct: 1, explain: 'Real generator = E + 50 Ω in series (Thevenin model, Week 4). So check KVL with the measured V<sub>s</sub>, not with the generator setting.', hint: 'Recall the generator model in Background.' });

  /* ================= DENEY 2 · Paralel RLC ve KCL ================= */
  const D2 = (() => {
    const box = $('#d2inst'), self = { ph: !!S.d2ph };
    const ch = () => (scope.dirty = true);
    const G = gen(box, { f: 159.15, a: 5, ch });
    const eb = inst(box, 'ELEMENT BOX', false);
    const kR = new Lab.Knob(eb.c, { label: 'R', list: RLIST, value: 50, fmt: (v) => Lab.ohm(v), onChange: ch });
    const kL = new Lab.Knob(eb.c, { label: 'L (inductor)', list: LLIST, value: 0.025, fmt: (v) => eng(v, 'H'), onChange: ch });
    const kC = new Lab.Knob(eb.c, { label: 'C', list: CLIST, value: 20e-6, fmt: (v) => eng(v, 'F'), onChange: ch });
    const mV = meter(box, 'V1', 'V (parallel terminals)'), mI = meter(box, 'A0', 'I total', 'A'), mR = meter(box, 'A1', 'I<sub>R</sub>', 'A'), mL = meter(box, 'A2', 'I<sub>L</sub>', 'A'), mC = meter(box, 'A3', 'I<sub>C</sub>', 'A');
    const scope = makeScope($('#d2scope'), { chs: 'CH1: V · CH2: 1 Ω shunt (= I total)', v1: 2, v2: 0.05, t: 1e-3 });
    self.scope = scope;
    const g = $('#d2sch');
    sch.src(g, 50, 140); sch.t(g, 50, 185, 'E'); sch.w(g, [[50, 120], [50, 50], [70, 50]]); sch.rH(g, 70, 120, 50); sch.t(g, 95, 36, 'R<tspan font-size="10" dy="3">i</tspan><tspan dy="-3">=50 Ω</tspan>');
    sch.w(g, [[120, 50], [150, 50]]); sch.meter(g, 165, 50, 'A0'); sch.w(g, [[178, 50], [460, 50]]);
    [[230, 'A1', 'R'], [330, 'A2', 'L'], [430, 'A3', 'C']].forEach(([x, m, k]) => {
      sch.dot(g, x, 50); sch.w(g, [[x, 50], [x, 70]]); sch.meter(g, x, 83, m); sch.w(g, [[x, 96], [x, 115]]);
      if (k === 'R') sch.rV(g, x, 115, 195); else if (k === 'L') sch.lV(g, x, 115, 195); else sch.cV(g, x, 115, 195);
      sch.w(g, [[x, 195], [x, 225]]); sch.dot(g, x, 225); sch.t(g, x + 16, 160, k, 'lbl', 'start');
    });
    sch.w(g, [[430, 50], [460, 50]]); sch.w(g, [[50, 160], [50, 225], [430, 225]]);
    const tV = sch.t(g, 300, 252, '', 'val');
    let cur = {};
    function calc() {
      const f = G.kf.value, om = TAU * f, R = kR.value, L = kL.value, Cn = kC.value, Ca = Creal(Cn);
      const zR = C(R), zL = C(rL(L), om * L), yC = C(0, om * Ca);
      const Yp = cadd(cadd(cinv(zR), cinv(zL)), yC), Zp = cinv(Yp);
      const I = cdiv(C(G.ka.value), cadd(C(RG + 1), Zp)), V = cmul(I, Zp);
      cur = { f, R, L, C: Cn, I, V, IR: cdiv(V, zR), IL: cdiv(V, zL), IC: cmul(V, yC), f0: 1 / (TAU * Math.sqrt(L * Ca)) };
      return cur;
    }
    self.update = () => {
      const c = calc(); G.show();
      mV(cabs(c.V)); mI(cabs(c.I)); mR(cabs(c.IR)); mL(cabs(c.IL)); mC(cabs(c.IC));
      tV.textContent = `V = ${num(cabs(c.V), 3)} V · R=${Lab.ohm(c.R)} · L=${eng(c.L, 'H')} · C=${eng(c.C, 'F')}`;
      if (self.ph) {
        const k = (0.8 * cabs(c.V)) / Math.max(cabs(c.I), cabs(c.IL), cabs(c.IC), cabs(c.IR));
        phasorDiag($('#d2pd'), [{ z: cscale(c.V, 0.8 * cabs(c.V) / cabs(c.V)), color: '#999', label: 'V', dash: '5 3', w: 1.5 }, { z: cscale(c.IR, k), color: '#c62828', label: 'I_R' }, { z: cscale(c.IL, k), from: cscale(c.IR, k), color: '#1565c0', label: 'I_L' }, { z: cscale(c.IC, k), from: cscale(cadd(c.IR, c.IL), k), color: '#2e7d32', label: 'I_C' }, { z: cscale(c.I, k), color: '#222', label: 'I', w: 3 }]);
        $('#d2pdTxt').innerHTML = `I<sub>R</sub>+I<sub>L</sub>+I<sub>C</sub> = <b>${fP(cadd(cadd(c.IR, c.IL), c.IC), 4)} A</b> · I = <b>${fP(c.I, 4)} A</b> (V axis grey, dashed)`;
      }
      if (scope.dirty) { scope.dirty = false; scope.render(c.f, c.V, c.I); }
    };
    $('#d2ph').checked = self.ph; $('#d2ph').onchange = (e) => { self.ph = S.d2ph = e.target.checked; save(); if (!self.ph) { $('#d2pd').innerHTML = ''; $('#d2pdTxt').innerHTML = 'Diagram hidden.'; } };
    const plot = new Lab.Plot($('#d2plot'), { xlabel: 'f (Hz)', ylabel: 'current (mA)' });
    const draw = tableBind('d2', (r) => [num(r.f, 1), Lab.ohm(r.R) + ' / ' + eng(r.L, 'H') + ' / ' + eng(r.C, 'F'), num(r.v, 3), num(r.i * 1e3, 2), num(r.ir * 1e3, 2), num(r.il * 1e3, 2), num(r.ic * 1e3, 2), `<b>${num((r.ir + r.il + r.ic) * 1e3, 2)}</b>`],
      'hafta3_deney2.csv', ['#', 'f (Hz)', 'R', 'L', 'C', 'V', 'I (mA)', 'IR', 'IL', 'IC', 'IR+IL+IC'], (r) => [+r.f.toFixed(2), r.R, r.L, r.C, +r.v.toFixed(4), +(r.i * 1e3).toFixed(3), +(r.ir * 1e3).toFixed(3), +(r.il * 1e3).toFixed(3), +(r.ic * 1e3).toFixed(3), +((r.ir + r.il + r.ic) * 1e3).toFixed(3)]);
    function drawPlot() {
      const rows = S.d2rows.filter((r) => r.R === kR.value && r.L === kL.value && r.C === kC.value).sort((a, b) => a.f - b.f);
      const ser = [{ pts: rows.map((r) => [r.f, r.i * 1e3]), dots: true, line: true, width: 1, color: '#222' }, { pts: rows.map((r) => [r.f, r.il * 1e3]), dots: true, line: true, width: 1, color: '#1565c0' }, { pts: rows.map((r) => [r.f, r.ic * 1e3]), dots: true, line: true, width: 1, color: '#2e7d32' }];
      const fs = rows.map((r) => r.f), fa = Math.min(...fs, 50), fb = Math.max(...fs, 500);
      if ($('#d2theo').checked) {
        const pts = []; for (let i = 0; i <= 200; i++) { const f = fa + ((fb - fa) * i) / 200, om = TAU * f; const Zp = cinv(C(1 / kR.value, om * kC.value - 1 / (om * kL.value))); pts.push([f, (1e3 * G.ka.value) / cabs(cadd(C(RG + 1), Zp))]); }
        ser.unshift({ pts, line: true, color: '#e07a10', dash: [6, 4] });
      }
      plot.draw(ser, [fa, fb], null);
    }
    self.d2 = drawPlot;
    $('#d2theo').onchange = drawPlot;
    self.rec = () => { const c = calc(); S.d2rows.push({ f: c.f, R: c.R, L: c.L, C: c.C, v: cabs(c.V), i: cabs(c.I), ir: cabs(c.IR), il: cabs(c.IL), ic: cabs(c.IC), f0: c.f0 }); save(); draw(); drawPlot(); Lab.toast(`Recorded: f = ${num(c.f, 1)} Hz, |I| = ${eng(cabs(c.I), 'A')}`); };
    $('#d2rec').onclick = self.rec;
    $('#d2del').onclick = () => { S.d2rows.pop(); save(); draw(); drawPlot(); };
    draw(); drawPlot();
    Object.assign(self, { G, kR, kL, kC, cur: () => cur, plotCanvas: $('#d2plot') });
    return self;
  })();
  steps('d2', [
    { t: '(Example 1.20) Select R = 50 Ω, L = 25 mH, C = 20 µF; set the frequency to <b>159.15 Hz</b> (ω = 1000 rad/s) and record.', test: () => S.d2rows.some((r) => r.R === 50 && r.L === 0.025 && r.C === 20e-6 && near(r.f, 159.15, 3)) },
    { t: 'Record a measurement where the arithmetic sum of the branch ammeters exceeds the total current by <b>more than 50%</b>. Has KCL failed?', test: () => S.d2rows.some((r) => r.ir + r.il + r.ic > 1.5 * r.i) },
    { t: 'Turn on the current <b>phasor diagram</b>: when I<sub>R</sub>, I<sub>L</sub>, I<sub>C</sub> are added tip-to-tail, do you reach the total I arrow? Which way do I<sub>L</sub> and I<sub>C</sub> point?', test: () => D2.ph },
    { t: 'With the same elements take measurements at <b>at least 6 frequencies</b> on both sides of f<sub>0</sub>; find on the plot where the total current is minimum.', test: () => grp(S.d2rows).some((g) => new Set(g.map((r) => Math.round(r.f))).size >= 6 && g.some((r) => r.f < 0.8 * r.f0) && g.some((r) => r.f > 1.25 * r.f0)) },
    { t: 'Tune to parallel resonance (±3%) and record: are I<sub>L</sub> and I<sub>C</sub> <b>at least 2 times</b> the total current? (Not at R = 50 Ω; increase R: when the parallel R is small most of the current flows through the resistor.)', test: () => S.d2rows.some((r) => Math.abs(r.f - r.f0) / r.f0 < 0.03 && r.il > 2 * r.i) },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: '(Example 1.20) With ideal elements, v<sub>s</sub> = 100cos(1000t) V is applied directly to parallel R‖L‖C. What is the amplitude of the total current in amperes?', answer: 2.83, tol: 1, unit: 'A', explain: 'Y = 0.02 − j0.04 + j0.02 = 0.02 − j0.02 S → I = 2 − j2 = 2.83∠−45° A.', hint: 'In parallel add the admittances: G = 1/R, Y<sub>L</sub> = −j/(ωL), Y<sub>C</sub> = jωC.' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'In the same example, what is the current amplitude |I<sub>L</sub>| of the inductor branch in amperes?', answer: 4, tol: 1, unit: 'A', explain: 'I<sub>L</sub> = 100/(j25) = −j4 A. It is larger than the total current (2.83 A)!', hint: 'I<sub>L</sub> = V/(jωL).' });
  mcq('d2', '#d2Q', { id: 'd2q3', q: 'How can a branch current be larger than the total current?', opts: ['It is an ammeter error', 'I<sub>L</sub> and I<sub>C</sub> are in antiphase; they cancel in the total but circulate at full size in the branches (energy swings between L and C)', 'In AC, KCL holds only for average values', 'The resistor current is negative'], correct: 1, explain: 'KCL holds exactly for phasors: I = I<sub>R</sub> + I<sub>L</sub> + I<sub>C</sub> (arrows). Not the arithmetic sum.', hint: 'Look at the directions of the I<sub>L</sub> and I<sub>C</sub> arrows in the phasor diagram.' });
  numq('d2', '#d2Q', { id: 'd2q4', q: 'For L = 25 mH, C = 20 µF, what is the (ideal) parallel resonant frequency in Hz?', answer: 225.08, tol: 1, unit: 'Hz', explain: 'f<sub>0</sub> = 1/(2π√(LC)) = 225 Hz. The inductor’s winding resistance and the C tolerance shift the measured value slightly.', hint: 'Same formula as for series RLC.' });
  mcq('d2', '#d2Q', { id: 'd2q5', q: 'If the susceptance in the admittance is B &gt; 0, what is the branch like?', opts: ['Inductive', 'Capacitive', 'Resistive', 'Cannot be determined'], correct: 1, explain: 'Y<sub>C</sub> = jωC → B &gt; 0 is capacitive. It is the opposite of the sign of X in impedance (lecture notes: “Sign trap”).', hint: 'What sign does the imaginary part of Y<sub>C</sub> = jωC have?' });
  mcq('d2', '#d2Q', { id: 'd2q6', q: 'At parallel resonance, what is the total current drawn from the source like?', opts: ['Maximum (as in series resonance)', 'Minimum; since B = 0, |Y| is minimum and |Z| is maximum', 'Constant, independent of zero', 'Infinite'], correct: 1, explain: 'The opposite of series resonance: |Y| drops to G. That is why a parallel LC “tank” circuit does not load the source.', hint: 'Look at the minimum of the black curve on the plot.' });

  /* ================= DENEY 3 · Gerilim bölücü (RC) ve akım bölücü ================= */
  const D3 = (() => {
    const box = $('#d3inst'), self = {};
    const ch = () => (scope.dirty = true);
    const G = gen(box, { f: 159.15, a: 5, ch });
    const eb = inst(box, 'ELEMENT BOX', false);
    const kR = new Lab.Knob(eb.c, { label: 'R', list: RLIST, value: 30, fmt: (v) => Lab.ohm(v), onChange: ch });
    const kC = new Lab.Knob(eb.c, { label: 'C', list: CLIST, value: 25e-6, fmt: (v) => eng(v, 'F'), onChange: ch });
    const mS = meter(box, 'V1', 'V<sub>s</sub>'), mR = meter(box, 'V2', 'V<sub>R</sub>'), mC = meter(box, 'V3', 'V<sub>C</sub>');
    const scope = makeScope($('#d3scope'), { chs: 'CH1: V<sub>s</sub> · CH2: V<sub>C</sub>', v1: 2, v2: 2, t: 1e-3 });
    self.scope = scope;
    const g = $('#d3sch');
    sch.src(g, 50, 130); sch.t(g, 50, 175, 'E'); sch.w(g, [[50, 110], [50, 50], [70, 50]]); sch.rH(g, 70, 120, 50); sch.t(g, 95, 36, '50 Ω');
    sch.w(g, [[120, 50], [200, 50]]); sch.dot(g, 150, 50); sch.t(g, 150, 38, 'V<tspan font-size="10" dy="3">s</tspan>', 'lbl');
    sch.rH(g, 200, 290, 50); sch.t(g, 245, 34, 'R'); sch.w(g, [[290, 50], [360, 50]]); sch.dot(g, 360, 50); sch.cV(g, 360, 50, 200); sch.t(g, 380, 130, 'C', 'lbl', 'start');
    sch.w(g, [[360, 200], [50, 200], [50, 150]]); sch.w(g, [[360, 50], [430, 50]]); sch.t(g, 440, 54, 'V<tspan font-size="10" dy="3">C</tspan><tspan dy="-3"> → CH2</tspan>', 'lbl', 'start');
    const tW = sch.t(g, 240, 235, '', 'val');
    let cur = {};
    function calc() {
      const f = G.kf.value, om = TAU * f, R = kR.value, Cn = kC.value, Ca = Creal(Cn), zC = C(0, -1 / (om * Ca)), Z = cadd(C(R), zC);
      const I = cdiv(C(G.ka.value), cadd(C(RG), Z));
      cur = { f, om, R, C: Cn, Vs: cmul(I, Z), VR: cscale(I, R), VC: cmul(I, zC), wc: 1 / (R * Ca) };
      return cur;
    }
    self.update = () => {
      const c = calc(); G.show(); mS(cabs(c.Vs)); mR(cabs(c.VR)); mC(cabs(c.VC));
      tW.textContent = `ω = ${num(c.om, 0)} rad/s · R = ${Lab.ohm(c.R)} · C = ${eng(c.C, 'F')}`;
      if (scope.dirty) { scope.dirty = false; scope.render(c.f, c.Vs, c.VC); }
    };
    const plot = new Lab.Plot($('#d3plot'), { xlabel: 'ω (rad/s)', ylabel: '|V_k| / |V_s|' });
    const draw = tableBind('d3', (r) => [num(r.f, 1), num(TAU * r.f, 0), Lab.ohm(r.R) + ' / ' + eng(r.C, 'F'), num(r.vs, 3), num(r.vr, 3), num(r.vc, 3), `<b>${num(r.vr + r.vc, 3)}</b>`],
      'hafta3_deney3.csv', ['#', 'f (Hz)', 'w (rad/s)', 'R', 'C', 'Vs', 'VR', 'VC', 'VR+VC'], (r) => [+r.f.toFixed(2), +(TAU * r.f).toFixed(1), r.R, r.C, +r.vs.toFixed(4), +r.vr.toFixed(4), +r.vc.toFixed(4), +(r.vr + r.vc).toFixed(4)]);
    function drawPlot() {
      const rows = S.d3rows.filter((r) => r.R === kR.value && r.C === kC.value).sort((a, b) => a.f - b.f);
      const ser = [{ pts: rows.map((r) => [TAU * r.f, r.vr / r.vs]), dots: true, line: true, width: 1, color: '#c62828' }, { pts: rows.map((r) => [TAU * r.f, r.vc / r.vs]), dots: true, line: true, width: 1, color: '#2e7d32' }];
      const ws = rows.map((r) => TAU * r.f), wa = 0, wb = Math.max(...ws, 5000);
      if ($('#d3theo').checked) {
        const a = [], b = []; const RC = kR.value * kC.value;
        for (let i = 1; i <= 200; i++) { const w = (wb * i) / 200, x = w * RC; a.push([w, x / Math.hypot(1, x)]); b.push([w, 1 / Math.hypot(1, x)]); }
        ser.unshift({ pts: a, line: true, color: '#e57373', dash: [6, 4] }, { pts: b, line: true, color: '#81c784', dash: [6, 4] });
      }
      plot.draw(ser, [wa, wb], [0, 1.05]);
    }
    $('#d3theo').onchange = drawPlot;
    self.rec = () => { const c = calc(); S.d3rows.push({ f: c.f, R: c.R, C: c.C, vs: cabs(c.Vs), vr: cabs(c.VR), vc: cabs(c.VC), wc: c.wc }); save(); draw(); drawPlot(); Lab.toast(`Recorded: ω = ${num(c.om, 0)} rad/s`); };
    $('#d3rec').onclick = self.rec;
    $('#d3del').onclick = () => { S.d3rows.pop(); save(); draw(); drawPlot(); };
    draw(); drawPlot();
    Object.assign(self, { G, kR, kC, cur: () => cur, plotCanvas: $('#d3plot') });
    return self;
  })();
  steps('d3', [
    { t: '(Example 1.21) R = 30 Ω, C = 25 µF; set the frequency to <b>159.15 Hz</b> (ω = 1000 rad/s) and record.', test: () => S.d3rows.some((r) => r.R === 30 && r.C === 25e-6 && near(r.f, 159.15, 3)) },
    { t: 'In this measurement compare the sum V<sub>R</sub> + V<sub>C</sub> with V<sub>s</sub>; have a record showing that the sum exceeds V<sub>s</sub> by at least 30%.', test: () => S.d3rows.some((r) => r.vr + r.vc > 1.3 * r.vs) },
    { t: 'Measure the phase difference: read Δt with the oscilloscope <b>CURSOR</b> <i>or</i> find sin φ = (y-intercept)/(y-peak) from the ellipse in <b>X-Y</b> mode.', test: () => D3.scope.curUsed || D3.scope.xyUsed },
    { t: 'With the same R, C record at <b>at least 6 frequencies</b> below and above ω<sub>c</sub> = 1/RC; study the two ratio curves on the plot.', test: () => { const m = {}; S.d3rows.forEach((r) => (m[r.R + '|' + r.C] = m[r.R + '|' + r.C] || []).push(r)); return Object.values(m).some((g) => new Set(g.map((r) => Math.round(r.f))).size >= 6 && g.some((r) => TAU * r.f < 0.6 * r.wc) && g.some((r) => TAU * r.f > 1.6 * r.wc)); } },
    { t: 'Find the crossover frequency: record a measurement with |V<sub>R</sub>| ≈ |V<sub>C</sub>| (±5%). At this point what fraction of V<sub>s</sub> is each?', test: () => S.d3rows.some((r) => Math.abs(r.vr / r.vc - 1) < 0.05) },
  ]);
  numq('d3', '#d3Q', { id: 'd3q1', q: '(Example 1.21) V = 100∠0° V, R = 30 Ω, C = 25 µF, ω = 1000 rad/s. What is |V<sub>C</sub>| in volts?', answer: 80, tol: 1, unit: 'V', explain: 'V<sub>C</sub> = (−j40)/(30 − j40)·100 = 80∠−36.87° V; V<sub>R</sub> = 60∠53.13° V. 60 + 80 = 140 ≠ 100, but √(60² + 80²) = 100.', hint: 'Voltage divider: V<sub>C</sub> = Z<sub>C</sub>/(Z<sub>R</sub> + Z<sub>C</sub>)·V.' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'In the same example, what is the phase angle of V<sub>C</sub> in degrees?', answer: -36.87, tol: 0, abs: 0.5, unit: '°', explain: '−90° − (−53.13°) = −36.87°. V<sub>C</sub> lags the source.', hint: 'Numerator −90°, denominator −53.13°; angles subtract.' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'For R = 30 Ω, C = 25 µF, at what ω in rad/s is |V<sub>R</sub>| = |V<sub>C</sub>| (with nominal values)?', answer: 1333.3, tol: 1, unit: 'rad/s', explain: 'ωRC = 1 → ω = 1/RC = 1333 rad/s. At this point both are V<sub>s</sub>/√2 = 70.7% of V<sub>s</sub>. Your measured value shifts by the C tolerance.', hint: 'The condition R = 1/(ωC).' });
  numq('d3', '#d3Q', { id: 'd3q4', q: 'At your current setting, what is the phase difference of V<sub>C</sub> relative to V<sub>s</sub> in degrees, as measured with the oscilloscope? (Negative if lagging.)', answer: () => { const c = D3.cur(); return carg(c.VC) - carg(c.Vs); }, tol: 0, abs: 3, unit: '°', explain: 'φ = −arctan(ωRC). With cursors: φ = −360°·f·Δt.', hint: 'Measure Δt between same-direction zero crossings of CH1 and CH2; φ = 360°·f·Δt. If CH2 crosses later it lags (negative). In X-Y mode: sin|φ| = y<sub>0</sub>/y<sub>peak</sub>.' });
  numq('d3', '#d3Q', { id: 'd3q5', q: '(Example 1.22, current divider) A 10∠0° A source; Z<sub>1</sub> = 3 + j4 Ω and Z<sub>2</sub> = 6 Ω in parallel. What is |I<sub>1</sub>| in amperes?', answer: 6.09, tol: 1, unit: 'A', explain: 'I<sub>1</sub> = Z<sub>2</sub>/(Z<sub>1</sub>+Z<sub>2</sub>)·I = 6/(9 + j4)·10 = 6.09∠−23.96° A; I<sub>2</sub> = 5.08∠29.17° A. 6.09 + 5.08 ≠ 10, but the phasor sum is 10.', hint: 'The denominator is the sum of the two impedances; the numerator is the <b>other</b> branch’s impedance.' });
  mcq('d3', '#d3Q', { id: 'd3q6', q: 'If V<sub>C</sub> is taken as the output of this RC voltage divider, what kind of filter is the circuit?', opts: ['High-pass', 'Low-pass: as ω → 0, |V<sub>C</sub>| → |V<sub>s</sub>|; at high frequency C approaches a short circuit', 'Band-stop', 'Passes all frequencies equally'], correct: 1, explain: 'The green curve on the plot falls as ω increases. The V<sub>R</sub> output, in contrast, is high-pass. Loudspeaker crossovers work on this principle.', hint: 'Look at the trend of the green curve (V<sub>C</sub>/V<sub>s</sub>).' });

  /* ================= DENEY 4 · Δ–Y ile köprü devresi ================= */
  const PRE = [
    { n: 'Example 1.19 (lecture 9.8)', ab: C(0, -4), ac: C(63.2, 2.4), bc: C(10, 0), bd: C(20, 60), cd: C(0, -20) },
    { n: 'Balanced bridge', ab: C(100, 0), ac: C(200, 0), bc: C(50, 0), bd: C(0, 100), cd: C(0, 200) },
    { n: 'Your own bridge', ab: C(...S.d4rand.ab), ac: C(...S.d4rand.ac), bc: C(...S.d4rand.bc), bd: C(...S.d4rand.bd), cd: C(...S.d4rand.cd) },
  ];
  const VSRC = 120; // tepe, 0°
  function nodal(n, els, inj) { // düğüm 0 = referans (d)
    const m = n - 1, A = Array.from({ length: m }, () => Array.from({ length: m + 1 }, () => C(0)));
    els.forEach(({ a, b, z }) => { const y = cinv(z); [[a, a, 1], [b, b, 1], [a, b, -1], [b, a, -1]].forEach(([i, j, s]) => { if (i && j) A[i - 1][j - 1] = cadd(A[i - 1][j - 1], cscale(y, s)); }); });
    inj.forEach((v, i) => { if (i && v) A[i - 1][m] = cadd(A[i - 1][m], v); });
    for (let k = 0; k < m; k++) {
      let p = k; for (let i = k + 1; i < m; i++) if (cabs(A[i][k]) > cabs(A[p][k])) p = i;
      [A[k], A[p]] = [A[p], A[k]];
      for (let i = k + 1; i < m; i++) { const f = cdiv(A[i][k], A[k][k]); for (let j = k; j <= m; j++) A[i][j] = csub(A[i][j], cmul(f, A[k][j])); }
    }
    const x = Array(m).fill(C(0));
    for (let i = m - 1; i >= 0; i--) { let s = A[i][m]; for (let j = i + 1; j < m; j++) s = csub(s, cmul(A[i][j], x[j])); x[i] = cdiv(s, A[i][i]); }
    return [C(0), ...x];
  }
  const ND = { d: 0, a: 1, b: 2, c: 3, n: 4 };
  const yOf = (p) => { const s = cadd(cadd(p.bc, p.bd), p.cd); return { z1: cdiv(cmul(p.bc, p.bd), s), z2: cdiv(cmul(p.bc, p.cd), s), z3: cdiv(cmul(p.bd, p.cd), s) }; };
  const D4 = (() => {
    const box = $('#d4inst'), self = {};
    const so = inst(box, 'AC SOURCE · 1 kHz', true, '120∠0° V (peak)');
    const soL = lcd(so.el, 'STATUS', '', 120);
    const bsrc = document.createElement('button'); bsrc.className = 'seg-btn'; bsrc.textContent = 'CONNECT SOURCE'; so.c.appendChild(bsrc);
    const lc = inst(box, 'LCR METER · 1 kHz', true, 'series equivalent'); const lcL = lcd(lc.el, '|Z|  ∠θ', '', 190); const lcL2 = lcd(lc.el, 'R<sub>s</sub>  ·  X<sub>s</sub>', '', 190);
    const sel = document.createElement('select'); sel.innerHTML = ['ad', 'ab', 'ac', 'bc', 'bd', 'cd'].map((p) => `<option value="${p}">terminals ${p[0]}–${p[1]}</option>`).join(''); lc.c.appendChild(sel);
    const vv = inst(box, 'VECTOR VOLTMETER / CURRENT PROBE', true, 'peak · phase relative to source'); const vvL = lcd(vv.el, 'MAGNITUDE ∠ PHASE', '', 210);
    const qs = document.createElement('select'); qs.innerHTML = ['I0', 'I1', 'I2', 'I3', 'I4', 'I5', 'V1', 'V2'].map((q) => `<option>${q}</option>`).join(''); vv.c.appendChild(qs);
    self.src = !!S.d4src; self.pair = 'ad'; self.q = 'I0';
    const paint = () => { bsrc.classList.toggle('on', self.src); bsrc.textContent = self.src ? 'SOURCE CONNECTED' : 'SOURCE DISCONNECTED'; };
    bsrc.onclick = () => { self.src = S.d4src = !self.src; save(); paint(); }; paint();
    sel.onchange = () => (self.pair = sel.value); qs.onchange = () => (self.q = qs.value);
    const pre = $('#d4pre'); pre.innerHTML = PRE.map((p, i) => `<option value="${i}">${p.n}</option>`).join(''); pre.value = S.d4pre;
    pre.onchange = () => { S.d4pre = +pre.value; save(); schem(); };
    const mode = $('#d4mode'); mode.value = S.d4mode;
    const zin = ['z1r', 'z1i', 'z2r', 'z2i', 'z3r', 'z3i'];
    zin.forEach((k) => { const e = $('#d4' + k); e.value = S.d4z[k] ?? ''; e.addEventListener('input', () => { S.d4z[k] = e.value; if (S.d4mode === 'y' && !userY()) { S.d4mode = 'delta'; mode.value = 'delta'; } save(); schem(); }); });
    const userY = () => { const v = zin.map((k) => Lab.parse(S.d4z[k])); if (v.some((x) => !isFinite(x))) return null; return { z1: C(v[0], v[1]), z2: C(v[2], v[3]), z3: C(v[4], v[5]) }; };
    mode.onchange = () => { if (mode.value === 'y' && !userY()) { Lab.toast('First enter the Z<sub>1</sub>, Z<sub>2</sub>, Z<sub>3</sub> values.'); mode.value = 'delta'; return; } S.d4mode = mode.value; save(); schem(); };
    if (S.d4mode === 'y' && !userY()) { S.d4mode = 'delta'; mode.value = 'delta'; }
    const P = () => PRE[S.d4pre];
    self.yOK = () => { const u = userY(), t = yOf(P()); return !!u && ['z1', 'z2', 'z3'].every((k) => cabs(csub(u[k], t[k])) <= 0.01 * cabs(t[k]) + 0.05); };
    function els() {
      const p = P();
      if (S.d4mode === 'y') { const u = userY(); return [{ a: 1, b: 2, z: p.ab }, { a: 1, b: 3, z: p.ac }, { a: 2, b: 4, z: u.z1 }, { a: 3, b: 4, z: u.z2 }, { a: 4, b: 0, z: u.z3 }]; }
      return [{ a: 1, b: 2, z: p.ab }, { a: 1, b: 3, z: p.ac }, { a: 2, b: 3, z: p.bc }, { a: 2, b: 0, z: p.bd }, { a: 3, b: 0, z: p.cd }];
    }
    function zPair(pq) { const n = S.d4mode === 'y' ? 5 : 4, inj = Array(n).fill(null); const i = ND[pq[0]], j = ND[pq[1]]; inj[i] = C(1); if (j) inj[j] = C(-1); const v = nodal(n, els(), inj); return csub(v[i], v[j]); }
    function solveSrc() {
      const n = S.d4mode === 'y' ? 5 : 4, inj = Array(n).fill(null); inj[1] = C(1);
      const v1 = nodal(n, els(), inj), k = cdiv(C(VSRC), v1[1]), v = v1.map((x) => cmul(x, k)), p = P();
      const r = { I0: k, I1: cdiv(csub(v[1], v[2]), p.ab), I2: cdiv(csub(v[1], v[3]), p.ac), V1: v[2], V2: v[3] };
      if (S.d4mode === 'delta') Object.assign(r, { I3: cdiv(csub(v[2], v[3]), p.bc), I4: cdiv(v[2], p.bd), I5: cdiv(v[3], p.cd) });
      return r;
    }
    let cur = {};
    self.update = () => {
      cur = { pair: self.pair, q: self.q, mode: S.d4mode, pre: S.d4pre };
      soL(self.src ? 'CONNECTED' : 'DISCONNECTED');
      if (self.src) { lcL('— (source connected!)'); lcL2('—'); cur.Z = null; }
      else { const z = zPair(self.pair); cur.Z = z; lcL(`${num(cabs(z), 2)} Ω ∠${num(carg(z), 1)}°`); lcL2(`${num(z.re, 2)} Ω · ${num(z.im, 2)} Ω`); }
      if (!self.src) { vvL('— (no source)'); cur.M = null; }
      else { const r = solveSrc(), m = r[self.q]; cur.M = m || null; vvL(m ? `${num(cabs(m), 3)} ${self.q[0] === 'I' ? 'A' : 'V'} ∠${num(carg(m), 1)}°` : 'branch absent in Y'); }
    };
    // şema
    function schem() {
      const g = $('#d4sch'); g.innerHTML = ''; const p = P();
      const A = [270, 40], B = [130, 170], Cc = [410, 170], D = [270, 300], N = [270, 205];
      sch.w(g, [A, [50, 40], [50, 140]]); sch.src(g, 50, 170); sch.w(g, [[50, 190], [50, 300], D]); sch.t(g, 20, 175, '120∠0°', 'val', 'middle').setAttribute('transform', 'rotate(-90 20 175)');
      sch.zbox(g, A, B, fC(p.ab, 1)); sch.zbox(g, A, Cc, fC(p.ac, 1));
      if (S.d4mode === 'y') { const u = userY(); sch.zbox(g, B, N, 'Z₁=' + fC(u.z1, 2)); sch.zbox(g, Cc, N, 'Z₂=' + fC(u.z2, 2)); sch.zbox(g, N, D, 'Z₃=' + fC(u.z3, 2)); sch.dot(g, ...N); sch.t(g, N[0] + 12, N[1] + 4, 'n', 'lbl', 'start'); }
      else { sch.zbox(g, B, Cc, fC(p.bc, 1)); sch.zbox(g, B, D, fC(p.bd, 1)); sch.zbox(g, Cc, D, fC(p.cd, 1)); }
      [[A, 'a', 0, -8], [B, 'b', -14, 4], [Cc, 'c', 14, 4], [D, 'd', 0, 22]].forEach(([q, s, dx, dy]) => { sch.dot(g, ...q); sch.t(g, q[0] + dx, q[1] + dy, s, 'val'); });
      sch.t(g, 470, 330, S.d4mode === 'y' ? 'lower delta → wye' : 'lower delta b–c–d (Δ)', 'lbl', 'end').style.fill = '#777';
    }
    schem();
    const draw = tableBind('d4', (r) => [r.mode === 'y' ? 'Y' : 'Δ', PRE[r.pre].n, r.what, num(r.mag, 3), num(r.ang, 2), r.re != null ? fC(C(r.re, r.im), 3) : ''],
      'hafta3_deney4.csv', ['#', 'circuit', 'preset', 'measurement', 'magnitude', 'angle (deg)', 'Re', 'Im'], (r) => [r.mode, PRE[r.pre].n, r.what, +r.mag.toFixed(4), +r.ang.toFixed(3), +r.re.toFixed(4), +r.im.toFixed(4)]);
    self.rec = () => {
      const c = cur; let z, what;
      if (!self.src && c.Z) { z = c.Z; what = 'Z_' + c.pair; }
      else if (self.src && c.M) { z = c.M; what = c.q; }
      else return Lab.toast('No valid measurement to record.');
      S.d4rows.push({ mode: c.mode, pre: c.pre, what, mag: cabs(z), ang: carg(z), re: z.re, im: z.im }); save(); draw(); Lab.toast(`Recorded: ${what} = ${fP(z, 3)}`);
    };
    $('#d4rec').onclick = self.rec; $('#d4del').onclick = () => { S.d4rows.pop(); save(); draw(); };
    draw();
    return self;
  })();
  const d4has = (f) => S.d4rows.some(f);
  steps('d4', [
    { t: 'With the Example 1.19 preset, <b>disconnect</b> the source; connect the LCR meter to terminals <b>a–d</b>, measure Z<sub>ad</sub> and record. (Is there a series or parallel pair in the bridge?)', test: () => d4has((r) => r.pre === 0 && r.mode === 'delta' && r.what === 'Z_ad') },
    { t: 'On paper, <b>convert</b> the lower Δ (b–c–d) <b>to Y</b> and enter Z<sub>1</sub>, Z<sub>2</sub>, Z<sub>3</sub> in the boxes (branches connected to b, c, d).', test: () => S.d4pre === 0 && D4.yOK() },
    { t: 'Switch the circuit to the <b>Y</b> view, measure Z<sub>ad</sub> again and record. Did the impedance seen from the terminals change?', test: () => d4has((r) => r.pre === 0 && r.mode === 'y' && r.what === 'Z_ad') },
    { t: 'Connect the source; measure and record <b>I<sub>1</sub></b> in both the Δ and the Y circuit. Is the branch current outside the Δ preserved?', test: () => d4has((r) => r.pre === 0 && r.mode === 'delta' && r.what === 'I1') && d4has((r) => r.pre === 0 && r.mode === 'y' && r.what === 'I1') },
    { t: 'Select the <b>Balanced bridge</b> preset; measure and record the current <b>I<sub>3</sub></b> in the bridge arm. Why is it close to zero?', test: () => d4has((r) => r.pre === 1 && r.what === 'I3') },
  ]);
  numq('d4', '#d4Q', { id: 'd4q1', q: '(Example 1.19) What is the magnitude in ohms of the sum of the lower Δ elements Σ = Z<sub>bc</sub> + Z<sub>bd</sub> + Z<sub>cd</sub>?', answer: 50, tol: 1, unit: 'Ω', explain: 'Σ = 10 + 20 + j60 − j20 = 30 + j40 = 50∠53.13° Ω. This is the denominator of every Y branch.', hint: 'Add the three Δ elements as complex numbers.' });
  numq('d4', '#d4Q', { id: 'd4q2', q: 'What is the magnitude |Z<sub>eq</sub>| in ohms of the equivalent impedance seen by the source?', answer: 30, tol: 1, unit: 'Ω', explain: 'Z<sub>abn</sub> = 12, Z<sub>acn</sub> = 60 → 12∥60 = 10; + Z<sub>3</sub> = 8 − j24 → 18 − j24 = 30∠−53.13° Ω. Compare with your LCR measurement.', hint: 'After converting to Y find the a–b–n and a–c–n branches; they are in parallel between a and n, then in series with Z<sub>3</sub>.' });
  numq('d4', '#d4Q', { id: 'd4q3', q: 'What is the source current amplitude |I<sub>0</sub>| in amperes (peak)?', answer: 4, tol: 1, unit: 'A', explain: 'I<sub>0</sub> = 120/(30∠−53.13°) = 4∠53.13° A.', hint: 'I<sub>0</sub> = V/Z<sub>eq</sub>.' });
  numq('d4', '#d4Q', { id: 'd4q4', q: 'What is the phase angle of I<sub>0</sub> in degrees?', answer: 53.13, tol: 0, abs: 0.5, unit: '°', explain: '0° − (−53.13°) = +53.13°: the circuit is capacitive, the current leads.', hint: 'In division angles subtract; the denominator’s angle is negative.' });
  mcq('d4', '#d4Q', { id: 'd4q5', q: 'After the Δ–Y transformation, is the current I<sub>1</sub> in branch a–b the same as in the original circuit?', opts: ['Yes, it is the same', 'No, it changes because of the Y', 'Only the magnitude is the same', 'Cannot be said'], correct: 0, explain: 'The transformation preserves the view from terminals b, c, d; branches outside the Δ are not affected. I<sub>3</sub>, I<sub>4</sub>, I<sub>5</sub>, being inside the Δ, can be found only from the original circuit.', hint: 'Compare your two measurements in the experiment.' });
  mcq('d4', '#d4Q', { id: 'd4q6', q: 'Under what condition is the current in the bridge arm (I<sub>3</sub>) zero?', opts: ['Z<sub>ab</sub> = Z<sub>cd</sub>', 'Z<sub>ab</sub>·Z<sub>cd</sub> = Z<sub>ac</sub>·Z<sub>bd</sub> (equal ratios: b and c at the same potential)', 'When all impedances are real', 'When the source frequency is zero'], correct: 1, explain: 'Z<sub>ab</sub>/Z<sub>bd</sub> = Z<sub>ac</sub>/Z<sub>cd</sub> → V<sub>b</sub> = V<sub>c</sub>. AC bridges (Maxwell, Schering) measure unknown L and C using this balance; at balance the bridge arm drops out and the circuit reduces to series-parallel.', hint: 'Nodes b and c are each the output of a voltage divider.' });

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
    const tab = (id) => `<table class="data"><thead>${$(`#${id} thead`).innerHTML}</thead><tbody>${$(`#${id} tbody`).innerHTML}</tbody></table>`;
    const html = `
      <h2 style="margin:0">Circuit Theory II · Virtual Lab · Week 3 Report</h2>
      <p><b>Topic:</b> Series and parallel connection, Kirchhoff’s laws in the frequency domain, voltage/current divider, Δ–Y transformation</p>
      <table class="data" style="width:auto"><tr><th>Full name</th><td class="l">${S.st.name || ''}</td><th>ID</th><td class="l">${S.st.no || ''}</td><th>Group</th><td class="l">${S.st.group || ''}</td><th>Date</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Summary</h3>
      <p>Lab-sheet steps completed: <b>${sOk}/${sTot}</b> · Correct answers: <b>${ok}/${tot}</b> · Score: <b>${Math.round((50 * sOk) / sTot + (50 * ok) / tot)}/100</b></p>
      <h3>Answers</h3>
      <table class="data"><thead><tr><th>Section</th><th>Question</th><th>Answer</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Experiment 1 · Series RLC measurements</h3>${tab('d1tab')}
      <h3>Experiment 2 · Parallel RLC measurements</h3>${tab('d2tab')}
      <h3>Experiment 3 · RC voltage divider</h3>${tab('d3tab')}
      <h3>Experiment 4 · Bridge and Δ–Y</h3>${tab('d4tab')}
      <h3>Plots</h3>
      <div>${img(D1.plotCanvas)} ${img(D2.plotCanvas)}</div><div>${img(D3.plotCanvas)}</div>
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
    if (e.key === 'r' || e.key === 'R') { const D = { d1: D1, d2: D2, d3: D3, d4: D4 }[S.page]; if (D) D.rec(); }
  });
  let tick = 0;
  function loop() {
    tick++;
    if (S.page === 'onbilgi') OB.frame();
    if (S.page === 'd1') { D1.update(); evalSteps('d1'); }
    if (S.page === 'd2') { D2.update(); evalSteps('d2'); }
    if (S.page === 'd3') { D3.update(); evalSteps('d3'); }
    if (S.page === 'd4') { D4.update(); evalSteps('d4'); }
    if (tick % 15 === 0) { const D = { d1: D1, d2: D2, d3: D3 }[S.page]; if (D) D.scope.dirty = true; } // gürültülü iz tazelensin
    requestAnimationFrame(loop);
  }
  ['d1', 'd2', 'd3', 'd4'].forEach(evalSteps);
  go(S.page); progress(); loop();
})();

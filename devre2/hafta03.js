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
    const g = inst(box, 'FG-200 FONKSİYON ÜRETECİ', true, 'R<sub>i</sub> = 50 Ω');
    const L = lcd(g.el, 'FREKANS · GENLİK (açık devre, etkin)', '', 200);
    const kf = new Lab.Knob(g.c, { label: 'Frekans', min: 20, max: 20000, log: true, value: o.f, dark: true, fmt: (v) => eng(v, 'Hz', 4), onChange: o.ch });
    const ka = new Lab.Knob(g.c, { label: 'Genlik', min: 0.1, max: 10, step: 0.05, value: o.a, dark: true, fmt: (v) => num(v, 2) + ' V', onChange: o.ch });
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
    w.innerHTML = `<div class="brand"><span>DSO-2C · İki Kanallı Osiloskop</span><span>${o.chs}</span></div>
      <div class="row" style="align-items:flex-start;flex-wrap:nowrap"><canvas width="560" height="350" style="width:100%;max-width:560px"></canvas>
      <div style="min-width:160px"><div class="ctrls"></div><div class="row" style="margin:6px 0;gap:4px"><button class="seg-btn on">CH1</button><button class="seg-btn on">CH2</button><button class="seg-btn">İMLEÇ</button><button class="seg-btn">X-Y</button><button class="seg-btn">AUTO</button></div><div class="meas"></div></div></div>`;
    host.appendChild(w);
    const cv = $('canvas', w), kc = $('.ctrls', w), bt = $$('button', w), meas = $('.meas', w);
    const sc = new Lab.Scope(cv);
    const self = { sc, xy: false, xyUsed: false, curUsed: false, dirty: true };
    const set = () => (self.dirty = true);
    self.k1 = new Lab.Knob(kc, { label: 'CH1 V/d', list: VDIV, value: o.v1 || 1, dark: true, size: 42, fmt: (v) => eng(v, 'V'), onChange: (v) => { sc.ch[0].vdiv = v; set(); } });
    self.k2 = new Lab.Knob(kc, { label: 'CH2 V/d', list: VDIV, value: o.v2 || 1, dark: true, size: 42, fmt: (v) => eng(v, 'V'), onChange: (v) => { sc.ch[1].vdiv = v; set(); } });
    self.kt = new Lab.Knob(kc, { label: 'ZAMAN/d', list: TDIV, value: o.t || 5e-4, dark: true, size: 42, fmt: (v) => eng(v, 's'), onChange: (v) => { sc.tdiv = v; set(); } });
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
      if (m.cur && !self.xy) h += `<br><span style="color:#ff7cf0">İMLEÇ</span> Δt = ${eng(m.cur.dt, 's', 4)}<br>1/Δt = ${eng(1 / Math.abs(m.cur.dt || 1e-12), 'Hz')}`;
      if (self.xy) h += '<br><span style="color:#ff7cf0">X-Y</span>: CH1 → yatay, CH2 → düşey';
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
      g.font = '12px Consolas'; g.fillStyle = '#9fe0b0'; g.fillText(`X-Y · X: ${eng(sc.ch[0].vdiv, 'V')}/d  Y: ${eng(sc.ch[1].vdiv, 'V')}/d`, 8, H - 8);
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
      sch.t(svg, 470, 22, 'Anlık değerler (gerçek eksene izdüşüm)', 'lbl').style.fontSize = '12px';
      E('line', { x1: bx0, y1: 30, x2: bx0, y2: 280, stroke: '#999' }, svg);
      inst.forEach(([n, v, col], i) => {
        const y = 55 + i * 52;
        E('rect', { x: Math.min(bx0, bx0 + v * bs), y: y - 12, width: Math.abs(v * bs), height: 24, fill: col, opacity: 0.8 }, svg);
        sch.t(svg, 330, y + 5, `${n} = ${num(v, 1)} V`, 'lbl', 'start').style.fill = col;
      });
      const sum = inst[0][1] + inst[1][1] + inst[2][1];
      sch.t(svg, 330, 270, `v_R + v_L + v_C = ${num(sum, 1)} V  (= v_s)`, 'val', 'start');
      txt.innerHTML = `ω = <b>${num(om, 0)} rad/s</b> (ω<sub>0</sub> = 1000 rad/s) · |V<sub>R</sub>| = ${num(cabs(VR), 1)} V · |V<sub>L</sub>| = ${num(cabs(VL), 1)} V · |V<sub>C</sub>| = ${num(cabs(VC), 1)} V · <b>aritmetik toplam = ${num(cabs(VR) + cabs(VL) + cabs(VC), 1)} V</b>, oysa |V<sub>s</sub>| = 20 V. Voltmetreler genlik (etkin değer) gösterir; fazı “görmez”. Toplanması gereken, oklardır.`;
    }
    return { frame };
  })();

  /* ================= ÖN HAZIRLIK ================= */
  numq('onhaz', '#preQ', { id: 'p1', q: '1) (Örnek 1.18) v<sub>s</sub> = 750cos(5000t + 30°) V, R = 90 Ω, L = 32 mH, C = 5 µF seri. Akımın genliği |I| kaç amperdir?', answer: 5, unit: 'A', explain: 'Z = 90 + j160 − j40 = 90 + j120 = 150∠53,13° Ω → |I| = 750/150 = 5 A.', hint: 'Önce Z<sub>L</sub> = jωL ve Z<sub>C</sub> = −j/(ωC) bulun; reaktanslar işaretiyle toplanır.' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) Aynı devrede akımın faz açısı kaç derecedir?', answer: -23.13, tol: 0, abs: 0.3, unit: '°', explain: 'φ<sub>I</sub> = φ<sub>V</sub> − φ<sub>Z</sub> = 30° − 53,13° = −23,13°. Devre endüktif, akım geride.', hint: 'Bölmede açılar çıkarılır.' });
  mcq('onhaz', '#preQ', { id: 'p3', q: '3) 3 + j4 Ω ve 3 − j4 Ω paralel bağlanıyor. Eşdeğer empedans nedir?', opts: ['6 Ω', '≈ 4,17 Ω, saf gerçek', '≈ 4,17 + j2 Ω', '0 Ω'], correct: 1, explain: 'Çarpım/toplam: 25/6 = 4,17 Ω. Eşlenik çiftin çarpımı |Z|², toplamı 2R: ikisi de gerçek.', hint: 'Paralelde empedanslar toplanmaz; çarpım/toplam kullanın.' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) Z = 3 + j4 Ω için admitansın gerçek kısmı G kaç siemenstir?', answer: 0.12, unit: 'S', explain: 'Y = (3 − j4)/25 = 0,12 − j0,16 S. G ≠ 1/R = 0,333 S!', hint: 'Y = 1/Z; eşlenikle genişletin, payda R² + X².' });
  numq('onhaz', '#preQ', { id: 'p5', q: '5) (Örnek 1.24) 10 + j15 Ω ile (8 + j6) ∥ (−j10) Ω seri. Giriş empedansının genliği kaç ohmdur?', answer: 22.36, tol: 1, unit: 'Ω', explain: 'Z<sub>p</sub> = (8+j6)(−j10)/(8−j4) = 10 − j5; Z = 20 + j10 = 22,36∠26,57° Ω.', hint: 'İçeriden dışarıya: önce paralel blok.' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) Δ bağlı üç eşit empedans Z<sub>Δ</sub> = 30 Ω yıldıza çevriliyor. Y kolu kaç ohmdur?', opts: ['90 Ω', '30 Ω', '15 Ω', '10 Ω'], correct: 3, explain: 'Z<sub>Y</sub> = Z<sub>Δ</sub>/3 = 10 Ω. 15 Ω çıkaran payda hatası yapmıştır (yalnız komşu iki eleman).', hint: 'Payda Δ’nın üç elemanının toplamıdır.' });

  /* ================= DENEY 1 · Seri RLC ve KVL ================= */
  const D1 = (() => {
    const box = $('#d1inst'), self = { ph: !!S.d1ph };
    const ch = () => (scope.dirty = true);
    const G = gen(box, { f: 1000, a: 5, ch });
    const eb = inst(box, 'ELEMAN KUTUSU', false);
    const kR = new Lab.Knob(eb.c, { label: 'R', list: RLIST, value: 100, fmt: (v) => Lab.ohm(v), onChange: ch });
    const kL = new Lab.Knob(eb.c, { label: 'L (bobin)', list: LLIST, value: 0.05, fmt: (v) => eng(v, 'H'), onChange: ch });
    const kC = new Lab.Knob(eb.c, { label: 'C', list: CLIST, value: 20e-6, fmt: (v) => eng(v, 'F'), onChange: ch });
    const mS = meter(box, 'V1', 'V<sub>s</sub> (üreteç ucu)'), mR = meter(box, 'V2', 'V<sub>R</sub>'), mL = meter(box, 'V3', 'V<sub>L</sub> (bobin)'), mC = meter(box, 'V4', 'V<sub>C</sub>'), mI = meter(box, 'A1', 'I', 'A');
    const scope = makeScope($('#d1scope'), { chs: 'CH1: V<sub>s</sub> · CH2: V<sub>R</sub> (akımla aynı fazda)', v1: 5, v2: 2, t: 2e-4 });
    self.scope = scope;
    // şema
    const g = $('#d1sch');
    sch.src(g, 50, 140); sch.t(g, 50, 185, 'E', 'lbl'); sch.w(g, [[50, 120], [50, 60], [70, 60]]); sch.rH(g, 70, 120, 60); sch.t(g, 95, 45, 'R<tspan font-size="10" dy="3">i</tspan><tspan dy="-3">=50 Ω</tspan>');
    E('rect', { x: 18, y: 30, width: 120, height: 190, fill: 'none', stroke: '#999', 'stroke-dasharray': '4 4' }, g); sch.t(g, 78, 236, 'fonksiyon üreteci', 'lbl').style.fontSize = '11px';
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
      const X = c.Z.im; tMode.textContent = Math.abs(X) < 0.03 * cabs(c.Z) ? 'X ≈ 0 · rezonansa yakın' : X > 0 ? 'X > 0 · endüktif' : 'X < 0 · kapasitif';
      tMode.style.fill = Math.abs(X) < 0.03 * cabs(c.Z) ? '#1a8a4a' : X > 0 ? '#1565c0' : '#2e7d32';
      if (self.ph) {
        phasorDiag($('#d1pd'), [{ z: c.Vs, color: '#222', label: 'V_s', w: 3 }, { z: c.VR, color: '#c62828', label: 'V_R' }, { z: c.VL, from: c.VR, color: '#1565c0', label: 'V_L' }, { z: c.VC, from: cadd(c.VR, c.VL), color: '#2e7d32', label: 'V_C' }, { z: cscale(c.I, (0.6 * cabs(c.VR)) / cabs(c.I)), color: '#e07a10', label: 'I', dash: '5 3', w: 1.8 }]);
        $('#d1pdTxt').innerHTML = `Oklar uç uca: V<sub>R</sub>+V<sub>L</sub>+V<sub>C</sub> = <b>${fP(cadd(cadd(c.VR, c.VL), c.VC), 3)} V</b> · V<sub>s</sub> = <b>${fP(c.Vs, 3)} V</b> (açılar akıma değil, E’ye göre)`;
      }
      if (scope.dirty) { scope.dirty = false; scope.render(c.f, c.Vs, c.VR); }
    };
    $('#d1ph').checked = self.ph; $('#d1ph').onchange = (e) => { self.ph = S.d1ph = e.target.checked; save(); if (!self.ph) { $('#d1pd').innerHTML = ''; $('#d1pdTxt').innerHTML = 'Diyagram kapalı.'; } };
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
    self.rec = () => { const c = calc(); S.d1rows.push({ f: c.f, R: c.R, L: c.L, C: c.C, vs: cabs(c.Vs), vr: cabs(c.VR), vl: cabs(c.VL), vc: cabs(c.VC), i: cabs(c.I), f0: c.f0 }); save(); draw(); drawPlot(); Lab.toast(`Kaydedildi: f = ${num(c.f, 1)} Hz, |I| = ${eng(cabs(c.I), 'A')}`); };
    $('#d1rec').onclick = self.rec;
    $('#d1del').onclick = () => { S.d1rows.pop(); save(); draw(); drawPlot(); };
    draw(); drawPlot();
    Object.assign(self, { G, kR, kL, kC, cur: () => cur, plotCanvas: $('#d1plot') });
    return self;
  })();
  const grp = (rows) => { const m = {}; rows.forEach((r) => (m[`${r.R}|${r.L}|${r.C}`] = m[`${r.R}|${r.L}|${r.C}`] || []).push(r)); return Object.values(m); };
  steps('d1', [
    { t: 'R = 100 Ω, L = 50 mH, C = 20 µF seçin; üreteci <b>1 kHz, 5 V</b> yapın ve dört voltmetreyi okuyup kaydedin (<kbd>R</kbd>).', test: () => S.d1rows.some((r) => r.R === 100 && r.L === 0.05 && r.C === 20e-6 && near(r.f, 1000, 100)) },
    { t: '<b>Şaşırtıcı sonuç:</b> V<sub>R</sub> + V<sub>L</sub> + V<sub>C</sub> aritmetik toplamının V<sub>s</sub>’yi <b>en az %30</b> aştığı bir ölçüm kaydedin. KVL bozuldu mu?', test: () => S.d1rows.some((r) => r.vr + r.vl + r.vc > 1.3 * r.vs) },
    { t: '<b>Fazör diyagramını</b> açın: V<sub>R</sub>, V<sub>L</sub>, V<sub>C</sub> oklarını uç uca ekleyince V<sub>s</sub> okunun ucuna varılıyor mu?', test: () => D1.ph },
    { t: 'Aynı R, L, C ile f<sub>0</sub>’ın altında ve üstünde <b>en az 6 farklı frekansta</b> ölçüm alın; |I|–f grafiğini inceleyin.', test: () => grp(S.d1rows).some((g) => new Set(g.map((r) => Math.round(r.f))).size >= 6 && g.some((r) => r.f < 0.8 * r.f0) && g.some((r) => r.f > 1.25 * r.f0)) },
    { t: 'Rezonansı bulun: akımın en büyük olduğu frekansı (±%2) ayarlayıp kaydedin. V<sub>C</sub> ve V<sub>L</sub>, V<sub>s</sub>’den büyük mü?', test: () => S.d1rows.some((r) => Math.abs(r.f - r.f0) / r.f0 < 0.02) },
    { t: 'f<sub>0</sub>’ın altında bir frekansta osiloskobun <b>İMLEÇ</b>’lerini açıp CH1 ile CH2 sıfır geçişleri arasındaki Δt’yi ölçün (φ = 360°·f·Δt).', test: () => D1.scope.curUsed && D1.cur().f < 0.85 * D1.cur().f0 },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: '(Örnek 1.23) L = 50 mH, C = 20 µF. Rezonans frekansı f<sub>0</sub> kaç Hz’dir?', answer: 159.15, tol: 1, unit: 'Hz', explain: 'ω<sub>0</sub> = 1/√(LC) = 1000 rad/s → f<sub>0</sub> = 159,15 Hz. Ölçtüğünüz değer kondansatör toleransı kadar kayabilir.', hint: 'ω<sub>0</sub> = 1/√(LC), sonra 2π’ye bölün.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: '(Örnek 1.23) R = 10 Ω, v<sub>s</sub> = 20cos ω<sub>0</sub>t V. Rezonansta |V<sub>L</sub>| kaç volttur (tepe)?', answer: 100, tol: 1, unit: 'V', explain: 'I = 20/10 = 2 A, |V<sub>L</sub>| = ω<sub>0</sub>L·I = 50·2 = 100 V = Q·|V<sub>s</sub>| (Q = 5). KVL yine sağlanır: V<sub>L</sub> + V<sub>C</sub> = 0.', hint: 'Rezonansta Z = R; önce akımı bulun, sonra ω<sub>0</sub>L ile çarpın.' });
  mcq('d1', '#d1Q', { id: 'd1q3', q: 'Voltmetre okumalarının aritmetik toplamı neden V<sub>s</sub>’den büyük çıkıyor?', opts: ['Voltmetreler hatalı; KVL AC’de geçerli değildir', 'KVL anlık değerler ve fazörler için geçerlidir; voltmetre yalnız genliği (etkin değer) gösterir, farklı fazlı gerilimlerin genlikleri toplanmaz', 'Üretecin 50 Ω iç direnci yüzünden', 'Bobinin iç direnci yüzünden'], correct: 1, explain: 'V<sub>L</sub> ile V<sub>C</sub> zıt fazlıdır ve birbirini kısmen götürür; okumalar ise hep pozitiftir. Ön Bilgi’deki dönen fazör animasyonuna bakın.', hint: 'Fazör diyagramında okların yönleri aynı mı?' });
  numq('d1', '#d1Q', { id: 'd1q4', q: 'Şu anki R, L, C seçiminizle rezonansta beklenen <b>V<sub>C</sub>/V<sub>s</sub></b> oranı kaçtır? (V<sub>s</sub> üreteç ucundaki gerilim; bobinin iç direncini unutmayın.)', answer: () => { const c = D1.cur(), Ca = Creal(c.C), w0 = 1 / Math.sqrt(c.L * Ca); return 1 / (w0 * Ca) / Math.hypot(c.R + rL(c.L), 0); }, tol: 6, unit: '', explain: 'Rezonansta V<sub>s</sub> = I(R + r<sub>L</sub>) ve |V<sub>C</sub>| = I/(ω<sub>0</sub>C) → oran = 1/(ω<sub>0</sub>C(R + r<sub>L</sub>)). r<sub>L</sub> ihmal edilirse oran büyük çıkar.', hint: 'Rezonansta reaktanslar götürülür; V<sub>s</sub>’yi yalnız dirençler taşır: R ve bobinin r<sub>L</sub>’si (LCR metre değeri ders notunda/Bilgi kutusunda).' });
  mcq('d1', '#d1Q', { id: 'd1q5', q: 'f &lt; f<sub>0</sub> iken seri RLC devresi nasıl davranır?', opts: ['Endüktif; akım V<sub>s</sub>’nin gerisinde', 'Kapasitif; akım V<sub>s</sub>’nin önünde', 'Saf dirençsel', 'Akım sıfırdır'], correct: 1, explain: '1/ωC &gt; ωL → X &lt; 0, φ<sub>Z</sub> &lt; 0 → φ<sub>I</sub> = φ<sub>V</sub> − φ<sub>Z</sub> &gt; 0. Osiloskopta CH2 (V<sub>R</sub>) CH1’den önce sıfırdan geçer.', hint: 'Düşük frekansta hangi reaktans büyüktür?' });
  mcq('d1', '#d1Q', { id: 'd1q6', q: 'Rezonansa yaklaşırken V1 (üreteç ucu) okuması neden üretecin ayar değerinden belirgin biçimde düşüyor?', opts: ['Üreteç arızalı', 'Akım en büyük olduğundan 50 Ω iç dirençteki düşüm de en büyüktür; üreteç ideal gerilim kaynağı değildir', 'Voltmetre frekansa duyarlıdır', 'Kondansatör kısa devre olur'], correct: 1, explain: 'Gerçek üreteç = E + 50 Ω seri (Thevenin modeli, Hafta 4). Bu yüzden KVL kontrolünü üreteç ayarıyla değil, ölçülen V<sub>s</sub> ile yapın.', hint: 'Ön Bilgi’deki üreteç modelini hatırlayın.' });

  /* ================= DENEY 2 · Paralel RLC ve KCL ================= */
  const D2 = (() => {
    const box = $('#d2inst'), self = { ph: !!S.d2ph };
    const ch = () => (scope.dirty = true);
    const G = gen(box, { f: 159.15, a: 5, ch });
    const eb = inst(box, 'ELEMAN KUTUSU', false);
    const kR = new Lab.Knob(eb.c, { label: 'R', list: RLIST, value: 50, fmt: (v) => Lab.ohm(v), onChange: ch });
    const kL = new Lab.Knob(eb.c, { label: 'L (bobin)', list: LLIST, value: 0.025, fmt: (v) => eng(v, 'H'), onChange: ch });
    const kC = new Lab.Knob(eb.c, { label: 'C', list: CLIST, value: 20e-6, fmt: (v) => eng(v, 'F'), onChange: ch });
    const mV = meter(box, 'V1', 'V (paralel uçlar)'), mI = meter(box, 'A0', 'I toplam', 'A'), mR = meter(box, 'A1', 'I<sub>R</sub>', 'A'), mL = meter(box, 'A2', 'I<sub>L</sub>', 'A'), mC = meter(box, 'A3', 'I<sub>C</sub>', 'A');
    const scope = makeScope($('#d2scope'), { chs: 'CH1: V · CH2: 1 Ω şönt (= I toplam)', v1: 2, v2: 0.05, t: 1e-3 });
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
        $('#d2pdTxt').innerHTML = `I<sub>R</sub>+I<sub>L</sub>+I<sub>C</sub> = <b>${fP(cadd(cadd(c.IR, c.IL), c.IC), 4)} A</b> · I = <b>${fP(c.I, 4)} A</b> (V ekseni gri, kesikli)`;
      }
      if (scope.dirty) { scope.dirty = false; scope.render(c.f, c.V, c.I); }
    };
    $('#d2ph').checked = self.ph; $('#d2ph').onchange = (e) => { self.ph = S.d2ph = e.target.checked; save(); if (!self.ph) { $('#d2pd').innerHTML = ''; $('#d2pdTxt').innerHTML = 'Diyagram kapalı.'; } };
    const plot = new Lab.Plot($('#d2plot'), { xlabel: 'f (Hz)', ylabel: 'akım (mA)' });
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
    self.rec = () => { const c = calc(); S.d2rows.push({ f: c.f, R: c.R, L: c.L, C: c.C, v: cabs(c.V), i: cabs(c.I), ir: cabs(c.IR), il: cabs(c.IL), ic: cabs(c.IC), f0: c.f0 }); save(); draw(); drawPlot(); Lab.toast(`Kaydedildi: f = ${num(c.f, 1)} Hz, |I| = ${eng(cabs(c.I), 'A')}`); };
    $('#d2rec').onclick = self.rec;
    $('#d2del').onclick = () => { S.d2rows.pop(); save(); draw(); drawPlot(); };
    draw(); drawPlot();
    Object.assign(self, { G, kR, kL, kC, cur: () => cur, plotCanvas: $('#d2plot') });
    return self;
  })();
  steps('d2', [
    { t: '(Örnek 1.20) R = 50 Ω, L = 25 mH, C = 20 µF seçin; frekansı <b>159,15 Hz</b> (ω = 1000 rad/s) yapıp kaydedin.', test: () => S.d2rows.some((r) => r.R === 50 && r.L === 0.025 && r.C === 20e-6 && near(r.f, 159.15, 3)) },
    { t: 'Kol ampermetrelerinin aritmetik toplamının toplam akımı <b>%50’den fazla</b> aştığı bir ölçüm kaydedin. KCL bozuldu mu?', test: () => S.d2rows.some((r) => r.ir + r.il + r.ic > 1.5 * r.i) },
    { t: 'Akım <b>fazör diyagramını</b> açın: I<sub>R</sub>, I<sub>L</sub>, I<sub>C</sub> uç uca eklenince toplam I okuna varılıyor mu? I<sub>L</sub> ile I<sub>C</sub> hangi yönde?', test: () => D2.ph },
    { t: 'Aynı elemanlarla f<sub>0</sub>’ın iki yanında <b>en az 6 frekansta</b> ölçüm alın; toplam akımın nerede en küçük olduğunu grafikte bulun.', test: () => grp(S.d2rows).some((g) => new Set(g.map((r) => Math.round(r.f))).size >= 6 && g.some((r) => r.f < 0.8 * r.f0) && g.some((r) => r.f > 1.25 * r.f0)) },
    { t: 'Paralel rezonansa (±%3) gelip kaydedin: I<sub>L</sub> ve I<sub>C</sub> toplam akımın <b>en az 2 katı</b> mı? (R = 50 Ω’da değil; R’yi büyütün: paralel R küçükken akımın çoğu dirençten geçer.)', test: () => S.d2rows.some((r) => Math.abs(r.f - r.f0) / r.f0 < 0.03 && r.il > 2 * r.i) },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: '(Örnek 1.20) İdeal elemanlarla, v<sub>s</sub> = 100cos(1000t) V doğrudan paralel R‖L‖C’ye uygulanıyor. Toplam akımın genliği kaç amperdir?', answer: 2.83, tol: 1, unit: 'A', explain: 'Y = 0,02 − j0,04 + j0,02 = 0,02 − j0,02 S → I = 2 − j2 = 2,83∠−45° A.', hint: 'Paralelde admitansları toplayın: G = 1/R, Y<sub>L</sub> = −j/(ωL), Y<sub>C</sub> = jωC.' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'Aynı örnekte bobin kolunun akım genliği |I<sub>L</sub>| kaç amperdir?', answer: 4, tol: 1, unit: 'A', explain: 'I<sub>L</sub> = 100/(j25) = −j4 A. Toplam akımdan (2,83 A) büyüktür!', hint: 'I<sub>L</sub> = V/(jωL).' });
  mcq('d2', '#d2Q', { id: 'd2q3', q: 'Bir kol akımı nasıl olur da toplam akımdan büyük çıkar?', opts: ['Ampermetre hatasıdır', 'I<sub>L</sub> ve I<sub>C</sub> zıt fazlıdır; toplamda birbirini götürür, kollarda ise tam büyüklükleriyle dolaşır (enerji L ile C arasında gidip gelir)', 'KCL AC’de yalnız ortalama değerler için geçerlidir', 'Direnç akımı negatiftir'], correct: 1, explain: 'KCL fazörler için tam geçerlidir: I = I<sub>R</sub> + I<sub>L</sub> + I<sub>C</sub> (oklar). Aritmetik toplam değil.', hint: 'Fazör diyagramında I<sub>L</sub> ve I<sub>C</sub> oklarının yönlerine bakın.' });
  numq('d2', '#d2Q', { id: 'd2q4', q: 'L = 25 mH, C = 20 µF için (ideal) paralel rezonans frekansı kaç Hz’dir?', answer: 225.08, tol: 1, unit: 'Hz', explain: 'f<sub>0</sub> = 1/(2π√(LC)) = 225 Hz. Bobin iç direnci ve C toleransı ölçülen değeri biraz kaydırır.', hint: 'Seri RLC ile aynı formül.' });
  mcq('d2', '#d2Q', { id: 'd2q5', q: 'Admitansta süseptans B &gt; 0 ise kol nasıldır?', opts: ['Endüktif', 'Kapasitif', 'Dirençsel', 'Belirlenemez'], correct: 1, explain: 'Y<sub>C</sub> = jωC → B &gt; 0 kapasitif. Empedanstaki X işaretinin tersidir (ders notu: “İşaret tuzağı”).', hint: 'Y<sub>C</sub> = jωC’nin sanal kısmı hangi işaretli?' });
  mcq('d2', '#d2Q', { id: 'd2q6', q: 'Paralel rezonansta kaynaktan çekilen toplam akım nasıldır?', opts: ['En büyük (seri rezonanstaki gibi)', 'En küçük; B = 0 olduğundan |Y| en küçük, |Z| en büyüktür', 'Sıfırdan bağımsız sabittir', 'Sonsuzdur'], correct: 1, explain: 'Seri rezonansın tersi: |Y| = G’ye iner. Bu yüzden paralel LC “tank” devresi kaynağı yüklemez.', hint: 'Grafikteki siyah eğrinin minimumuna bakın.' });

  /* ================= DENEY 3 · Gerilim bölücü (RC) ve akım bölücü ================= */
  const D3 = (() => {
    const box = $('#d3inst'), self = {};
    const ch = () => (scope.dirty = true);
    const G = gen(box, { f: 159.15, a: 5, ch });
    const eb = inst(box, 'ELEMAN KUTUSU', false);
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
    self.rec = () => { const c = calc(); S.d3rows.push({ f: c.f, R: c.R, C: c.C, vs: cabs(c.Vs), vr: cabs(c.VR), vc: cabs(c.VC), wc: c.wc }); save(); draw(); drawPlot(); Lab.toast(`Kaydedildi: ω = ${num(c.om, 0)} rad/s`); };
    $('#d3rec').onclick = self.rec;
    $('#d3del').onclick = () => { S.d3rows.pop(); save(); draw(); drawPlot(); };
    draw(); drawPlot();
    Object.assign(self, { G, kR, kC, cur: () => cur, plotCanvas: $('#d3plot') });
    return self;
  })();
  steps('d3', [
    { t: '(Örnek 1.21) R = 30 Ω, C = 25 µF; frekansı <b>159,15 Hz</b> (ω = 1000 rad/s) yapıp kaydedin.', test: () => S.d3rows.some((r) => r.R === 30 && r.C === 25e-6 && near(r.f, 159.15, 3)) },
    { t: 'Bu ölçümde V<sub>R</sub> + V<sub>C</sub> toplamını V<sub>s</sub> ile karşılaştırın; toplamın V<sub>s</sub>’yi en az %30 aştığını gösteren bir kayıt olsun.', test: () => S.d3rows.some((r) => r.vr + r.vc > 1.3 * r.vs) },
    { t: 'Faz farkını ölçün: osiloskopta <b>İMLEÇ</b> ile Δt’yi okuyun <i>ya da</i> <b>X-Y</b> kipinde elipsten sin φ = (y-kesişimi)/(y-tepe) bulun.', test: () => D3.scope.curUsed || D3.scope.xyUsed },
    { t: 'Aynı R, C ile ω<sub>c</sub> = 1/RC’nin altında ve üstünde <b>en az 6 frekansta</b> kayıt alın; iki oran eğrisini grafikte inceleyin.', test: () => { const m = {}; S.d3rows.forEach((r) => (m[r.R + '|' + r.C] = m[r.R + '|' + r.C] || []).push(r)); return Object.values(m).some((g) => new Set(g.map((r) => Math.round(r.f))).size >= 6 && g.some((r) => TAU * r.f < 0.6 * r.wc) && g.some((r) => TAU * r.f > 1.6 * r.wc)); } },
    { t: 'Kesişim frekansını bulun: |V<sub>R</sub>| ≈ |V<sub>C</sub>| (±%5) olan bir ölçüm kaydedin. Bu noktada her biri V<sub>s</sub>’nin kaçta kaçı?', test: () => S.d3rows.some((r) => Math.abs(r.vr / r.vc - 1) < 0.05) },
  ]);
  numq('d3', '#d3Q', { id: 'd3q1', q: '(Örnek 1.21) V = 100∠0° V, R = 30 Ω, C = 25 µF, ω = 1000 rad/s. |V<sub>C</sub>| kaç volttur?', answer: 80, tol: 1, unit: 'V', explain: 'V<sub>C</sub> = (−j40)/(30 − j40)·100 = 80∠−36,87° V; V<sub>R</sub> = 60∠53,13° V. 60 + 80 = 140 ≠ 100 ama √(60² + 80²) = 100.', hint: 'Gerilim bölücü: V<sub>C</sub> = Z<sub>C</sub>/(Z<sub>R</sub> + Z<sub>C</sub>)·V.' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'Aynı örnekte V<sub>C</sub>’nin faz açısı kaç derecedir?', answer: -36.87, tol: 0, abs: 0.5, unit: '°', explain: '−90° − (−53,13°) = −36,87°. V<sub>C</sub> kaynağın gerisinde.', hint: 'Pay −90°, payda −53,13°; açılar çıkarılır.' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'R = 30 Ω, C = 25 µF için |V<sub>R</sub>| = |V<sub>C</sub>| olan ω kaç rad/s’dir (nominal değerlerle)?', answer: 1333.3, tol: 1, unit: 'rad/s', explain: 'ωRC = 1 → ω = 1/RC = 1333 rad/s. Bu noktada ikisi de V<sub>s</sub>/√2 = %70,7 V<sub>s</sub>. Ölçtüğünüz değer C toleransı kadar kayar.', hint: 'R = 1/(ωC) koşulu.' });
  numq('d3', '#d3Q', { id: 'd3q4', q: 'Şu anki ayarınızda, osiloskopla ölçtüğünüz V<sub>C</sub>’nin V<sub>s</sub>’ye göre faz farkı kaç derecedir? (Geride ise eksi.)', answer: () => { const c = D3.cur(); return carg(c.VC) - carg(c.Vs); }, tol: 0, abs: 3, unit: '°', explain: 'φ = −arctan(ωRC). İmleçle: φ = −360°·f·Δt.', hint: 'CH1 ile CH2’nin aynı yöndeki sıfır geçişleri arasındaki Δt’yi ölçün; φ = 360°·f·Δt. CH2 sonra geçiyorsa geridedir (eksi). X-Y kipinde: sin|φ| = y<sub>0</sub>/y<sub>tepe</sub>.' });
  numq('d3', '#d3Q', { id: 'd3q5', q: '(Örnek 1.22, akım bölücü) 10∠0° A’lik kaynak; Z<sub>1</sub> = 3 + j4 Ω ve Z<sub>2</sub> = 6 Ω paralel. |I<sub>1</sub>| kaç amperdir?', answer: 6.09, tol: 1, unit: 'A', explain: 'I<sub>1</sub> = Z<sub>2</sub>/(Z<sub>1</sub>+Z<sub>2</sub>)·I = 6/(9 + j4)·10 = 6,09∠−23,96° A; I<sub>2</sub> = 5,08∠29,17° A. 6,09 + 5,08 ≠ 10 ama fazör toplamı 10.', hint: 'Payda iki empedansın toplamı, pay <b>diğer</b> kolun empedansı.' });
  mcq('d3', '#d3Q', { id: 'd3q6', q: 'Bu RC gerilim bölücüde V<sub>C</sub> çıkış alınırsa devre nasıl bir süzgeçtir?', opts: ['Yüksek geçiren', 'Alçak geçiren: ω → 0 iken |V<sub>C</sub>| → |V<sub>s</sub>|, yüksek frekansta C kısa devreye yaklaşır', 'Bant durduran', 'Tüm frekansları eşit geçirir'], correct: 1, explain: 'Grafikteki yeşil eğri ω arttıkça düşer. V<sub>R</sub> çıkışı ise yüksek geçirendir. Hoparlör ayırıcıları bu ilkeyle çalışır.', hint: 'Yeşil eğrinin (V<sub>C</sub>/V<sub>s</sub>) gidişine bakın.' });

  /* ================= DENEY 4 · Δ–Y ile köprü devresi ================= */
  const PRE = [
    { n: 'Örnek 1.19 (ders 9.8)', ab: C(0, -4), ac: C(63.2, 2.4), bc: C(10, 0), bd: C(20, 60), cd: C(0, -20) },
    { n: 'Dengeli köprü', ab: C(100, 0), ac: C(200, 0), bc: C(50, 0), bd: C(0, 100), cd: C(0, 200) },
    { n: 'Size özel köprü', ab: C(...S.d4rand.ab), ac: C(...S.d4rand.ac), bc: C(...S.d4rand.bc), bd: C(...S.d4rand.bd), cd: C(...S.d4rand.cd) },
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
    const so = inst(box, 'AC KAYNAK · 1 kHz', true, '120∠0° V (tepe)');
    const soL = lcd(so.el, 'DURUM', '', 120);
    const bsrc = document.createElement('button'); bsrc.className = 'seg-btn'; bsrc.textContent = 'KAYNAĞI BAĞLA'; so.c.appendChild(bsrc);
    const lc = inst(box, 'LCR METRE · 1 kHz', true, 'seri eşdeğer'); const lcL = lcd(lc.el, '|Z|  ∠θ', '', 190); const lcL2 = lcd(lc.el, 'R<sub>s</sub>  ·  X<sub>s</sub>', '', 190);
    const sel = document.createElement('select'); sel.innerHTML = ['ad', 'ab', 'ac', 'bc', 'bd', 'cd'].map((p) => `<option value="${p}">${p[0]}–${p[1]} uçları</option>`).join(''); lc.c.appendChild(sel);
    const vv = inst(box, 'VEKTÖR VOLTMETRE / AKIM PROBU', true, 'tepe · faz kaynağa göre'); const vvL = lcd(vv.el, 'GENLİK ∠ FAZ', '', 210);
    const qs = document.createElement('select'); qs.innerHTML = ['I0', 'I1', 'I2', 'I3', 'I4', 'I5', 'V1', 'V2'].map((q) => `<option>${q}</option>`).join(''); vv.c.appendChild(qs);
    self.src = !!S.d4src; self.pair = 'ad'; self.q = 'I0';
    const paint = () => { bsrc.classList.toggle('on', self.src); bsrc.textContent = self.src ? 'KAYNAK BAĞLI' : 'KAYNAK SÖKÜLÜ'; };
    bsrc.onclick = () => { self.src = S.d4src = !self.src; save(); paint(); }; paint();
    sel.onchange = () => (self.pair = sel.value); qs.onchange = () => (self.q = qs.value);
    const pre = $('#d4pre'); pre.innerHTML = PRE.map((p, i) => `<option value="${i}">${p.n}</option>`).join(''); pre.value = S.d4pre;
    pre.onchange = () => { S.d4pre = +pre.value; save(); schem(); };
    const mode = $('#d4mode'); mode.value = S.d4mode;
    const zin = ['z1r', 'z1i', 'z2r', 'z2i', 'z3r', 'z3i'];
    zin.forEach((k) => { const e = $('#d4' + k); e.value = S.d4z[k] ?? ''; e.addEventListener('input', () => { S.d4z[k] = e.value; if (S.d4mode === 'y' && !userY()) { S.d4mode = 'delta'; mode.value = 'delta'; } save(); schem(); }); });
    const userY = () => { const v = zin.map((k) => Lab.parse(S.d4z[k])); if (v.some((x) => !isFinite(x))) return null; return { z1: C(v[0], v[1]), z2: C(v[2], v[3]), z3: C(v[4], v[5]) }; };
    mode.onchange = () => { if (mode.value === 'y' && !userY()) { Lab.toast('Önce Z<sub>1</sub>, Z<sub>2</sub>, Z<sub>3</sub> değerlerini girin.'); mode.value = 'delta'; return; } S.d4mode = mode.value; save(); schem(); };
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
      soL(self.src ? 'BAĞLI' : 'SÖKÜLÜ');
      if (self.src) { lcL('— (kaynak bağlı!)'); lcL2('—'); cur.Z = null; }
      else { const z = zPair(self.pair); cur.Z = z; lcL(`${num(cabs(z), 2)} Ω ∠${num(carg(z), 1)}°`); lcL2(`${num(z.re, 2)} Ω · ${num(z.im, 2)} Ω`); }
      if (!self.src) { vvL('— (kaynak yok)'); cur.M = null; }
      else { const r = solveSrc(), m = r[self.q]; cur.M = m || null; vvL(m ? `${num(cabs(m), 3)} ${self.q[0] === 'I' ? 'A' : 'V'} ∠${num(carg(m), 1)}°` : 'Y’de bu kol yok'); }
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
      sch.t(g, 470, 330, S.d4mode === 'y' ? 'alt üçgen → yıldız' : 'alt üçgen b–c–d (Δ)', 'lbl', 'end').style.fill = '#777';
    }
    schem();
    const draw = tableBind('d4', (r) => [r.mode === 'y' ? 'Y' : 'Δ', PRE[r.pre].n, r.what, num(r.mag, 3), num(r.ang, 2), r.re != null ? fC(C(r.re, r.im), 3) : ''],
      'hafta3_deney4.csv', ['#', 'devre', 'onayar', 'olcum', 'genlik', 'aci (deg)', 'Re', 'Im'], (r) => [r.mode, PRE[r.pre].n, r.what, +r.mag.toFixed(4), +r.ang.toFixed(3), +r.re.toFixed(4), +r.im.toFixed(4)]);
    self.rec = () => {
      const c = cur; let z, what;
      if (!self.src && c.Z) { z = c.Z; what = 'Z_' + c.pair; }
      else if (self.src && c.M) { z = c.M; what = c.q; }
      else return Lab.toast('Kaydedilecek geçerli bir ölçüm yok.');
      S.d4rows.push({ mode: c.mode, pre: c.pre, what, mag: cabs(z), ang: carg(z), re: z.re, im: z.im }); save(); draw(); Lab.toast(`Kaydedildi: ${what} = ${fP(z, 3)}`);
    };
    $('#d4rec').onclick = self.rec; $('#d4del').onclick = () => { S.d4rows.pop(); save(); draw(); };
    draw();
    return self;
  })();
  const d4has = (f) => S.d4rows.some(f);
  steps('d4', [
    { t: 'Örnek 1.19 önayarında kaynağı <b>sökün</b>; LCR metreyi <b>a–d</b> uçlarına bağlayıp Z<sub>ad</sub>’yi ölçün ve kaydedin. (Köprüde seri ya da paralel çift var mı?)', test: () => d4has((r) => r.pre === 0 && r.mode === 'delta' && r.what === 'Z_ad') },
    { t: 'Alt Δ’yı (b–c–d) kâğıt üzerinde <b>Y’ye dönüştürün</b> ve Z<sub>1</sub>, Z<sub>2</sub>, Z<sub>3</sub> kutularına girin (b, c, d’ye bağlı kollar).', test: () => S.d4pre === 0 && D4.yOK() },
    { t: 'Devreyi <b>Y</b> görünümüne alıp Z<sub>ad</sub>’yi yeniden ölçün ve kaydedin. Uçlardan görünen empedans değişti mi?', test: () => d4has((r) => r.pre === 0 && r.mode === 'y' && r.what === 'Z_ad') },
    { t: 'Kaynağı bağlayın; <b>I<sub>1</sub></b>’i hem Δ hem Y devresinde ölçüp kaydedin. Δ’nın dışındaki kol akımı korunuyor mu?', test: () => d4has((r) => r.pre === 0 && r.mode === 'delta' && r.what === 'I1') && d4has((r) => r.pre === 0 && r.mode === 'y' && r.what === 'I1') },
    { t: '<b>Dengeli köprü</b> önayarını seçin; köprü kolundaki <b>I<sub>3</sub></b> akımını ölçüp kaydedin. Neden sıfıra yakın?', test: () => d4has((r) => r.pre === 1 && r.what === 'I3') },
  ]);
  numq('d4', '#d4Q', { id: 'd4q1', q: '(Örnek 1.19) Alt Δ’nın elemanları toplamı Σ = Z<sub>bc</sub> + Z<sub>bd</sub> + Z<sub>cd</sub>’nin genliği kaç ohmdur?', answer: 50, tol: 1, unit: 'Ω', explain: 'Σ = 10 + 20 + j60 − j20 = 30 + j40 = 50∠53,13° Ω. Her Y kolunun paydası budur.', hint: 'Üç Δ elemanını kompleks olarak toplayın.' });
  numq('d4', '#d4Q', { id: 'd4q2', q: 'Kaynağın gördüğü eşdeğer empedansın genliği |Z<sub>eş</sub>| kaç ohmdur?', answer: 30, tol: 1, unit: 'Ω', explain: 'Z<sub>abn</sub> = 12, Z<sub>acn</sub> = 60 → 12∥60 = 10; + Z<sub>3</sub> = 8 − j24 → 18 − j24 = 30∠−53,13° Ω. LCR ölçümünüzle karşılaştırın.', hint: 'Y’ye çevirdikten sonra a–b–n ve a–c–n kollarını bulun; ikisi a–n arasında paraleldir, sonra Z<sub>3</sub> ile seri.' });
  numq('d4', '#d4Q', { id: 'd4q3', q: 'Kaynak akımının genliği |I<sub>0</sub>| kaç amperdir (tepe)?', answer: 4, tol: 1, unit: 'A', explain: 'I<sub>0</sub> = 120/(30∠−53,13°) = 4∠53,13° A.', hint: 'I<sub>0</sub> = V/Z<sub>eş</sub>.' });
  numq('d4', '#d4Q', { id: 'd4q4', q: 'I<sub>0</sub>’ın faz açısı kaç derecedir?', answer: 53.13, tol: 0, abs: 0.5, unit: '°', explain: '0° − (−53,13°) = +53,13°: devre kapasitif, akım önde.', hint: 'Bölmede açılar çıkarılır; paydanın açısı negatif.' });
  mcq('d4', '#d4Q', { id: 'd4q5', q: 'Δ–Y dönüşümünden sonra a–b kolundaki I<sub>1</sub> akımı orijinal devredekiyle aynı mıdır?', opts: ['Evet, aynıdır', 'Hayır, Y yüzünden değişir', 'Yalnız genlik aynıdır', 'Söylenemez'], correct: 0, explain: 'Dönüşüm b, c, d uçlarından görünüşü korur; Δ’nın dışındaki kollar etkilenmez. I<sub>3</sub>, I<sub>4</sub>, I<sub>5</sub> ise Δ’nın içinde olduğundan yalnız orijinal devreden bulunur.', hint: 'Deneyde iki ölçümünüzü karşılaştırın.' });
  mcq('d4', '#d4Q', { id: 'd4q6', q: 'Köprü kolundaki akım (I<sub>3</sub>) hangi koşulda sıfır olur?', opts: ['Z<sub>ab</sub> = Z<sub>cd</sub>', 'Z<sub>ab</sub>·Z<sub>cd</sub> = Z<sub>ac</sub>·Z<sub>bd</sub> (oranlar eşit: b ve c aynı potansiyelde)', 'Tüm empedanslar gerçek olduğunda', 'Kaynak frekansı sıfır olduğunda'], correct: 1, explain: 'Z<sub>ab</sub>/Z<sub>bd</sub> = Z<sub>ac</sub>/Z<sub>cd</sub> → V<sub>b</sub> = V<sub>c</sub>. AC köprüler (Maxwell, Schering) bilinmeyen L ve C’yi bu dengeyle ölçer; dengede köprü kolu devre dışı kalır ve devre seri-paralele iner.', hint: 'b ve c düğümleri birer gerilim bölücünün çıkışıdır.' });

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
    const tab = (id) => `<table class="data"><thead>${$(`#${id} thead`).innerHTML}</thead><tbody>${$(`#${id} tbody`).innerHTML}</tbody></table>`;
    const html = `
      <h2 style="margin:0">Devre Kuramı II · Sanal Laboratuvar · Hafta 3 Raporu</h2>
      <p><b>Konu:</b> Seri ve paralel bağlantı, frekans bölgesinde Kirchhoff yasaları, gerilim/akım bölücü, Δ–Y dönüşümü</p>
      <table class="data" style="width:auto"><tr><th>Ad Soyad</th><td class="l">${S.st.name || ''}</td><th>No</th><td class="l">${S.st.no || ''}</td><th>Grup</th><td class="l">${S.st.group || ''}</td><th>Tarih</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Özet</h3>
      <p>Tamamlanan föy adımı: <b>${sOk}/${sTot}</b> · Doğru yanıt: <b>${ok}/${tot}</b> · Puan: <b>${Math.round((50 * sOk) / sTot + (50 * ok) / tot)}/100</b></p>
      <h3>Yanıtlar</h3>
      <table class="data"><thead><tr><th>Bölüm</th><th>Soru</th><th>Yanıt</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Deney 1 · Seri RLC ölçümleri</h3>${tab('d1tab')}
      <h3>Deney 2 · Paralel RLC ölçümleri</h3>${tab('d2tab')}
      <h3>Deney 3 · RC gerilim bölücü</h3>${tab('d3tab')}
      <h3>Deney 4 · Köprü ve Δ–Y</h3>${tab('d4tab')}
      <h3>Grafikler</h3>
      <div>${img(D1.plotCanvas)} ${img(D2.plotCanvas)}</div><div>${img(D3.plotCanvas)}</div>
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

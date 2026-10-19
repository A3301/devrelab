/* Devre Kuramı II · Hafta 11 — Maksimum Güç Transferi */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd2h11';
  const S = Object.assign({ answers: {}, steps: {}, d1rows: [], d2rows: [], d3rows: [], st: {}, page: 'giris' }, Lab.store.load(KEY));
  Lab.answers = S.answers;
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => Lab.store.save(KEY, S), 300); };
  Lab.onAnswer = () => { save(); progress(); };
  const near = (a, b, t) => Math.abs(a - b) <= t;
  const rel = (a, b, t) => Math.abs(a - b) <= Math.abs(b) * t;

  /* ---------- kompleks sayı yardımcıları ([re, im]) ---------- */
  const Cx = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1]],
    mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]],
    div: (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; },
    conj: (a) => [a[0], -a[1]],
    abs: (a) => Math.hypot(a[0], a[1]),
    ang: (a) => (Math.atan2(a[1], a[0]) * 180) / Math.PI,
    polar: (m, deg) => [m * Math.cos((deg * Math.PI) / 180), m * Math.sin((deg * Math.PI) / 180)],
    sc: (a, k) => [a[0] * k, a[1] * k],
  };
  const W50 = 2 * Math.PI * 50;

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
  function segBtns(parent, list, cur, onPick) {
    const w = document.createElement('div'); w.className = 'seg'; w.style.margin = '4px 0';
    list.forEach(([v, t]) => {
      const b = document.createElement('button'); b.className = 'seg-btn' + (v === cur ? ' on' : ''); b.innerHTML = t; b.dataset.v = v;
      b.onclick = () => { w.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); onPick(v); };
      w.appendChild(b);
    });
    parent.appendChild(w); return w;
  }

  /* ---------- şema yardımcıları ---------- */
  const sch = {
    w: (g, pts) => E('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'w' }, g),
    dot: (g, x, y) => E('circle', { cx: x, cy: y, r: 3.5, class: 'node' }, g),
    t: (g, x, y, s, cls = 'lbl', anchor = 'middle') => { const e = E('text', { x, y, class: cls, 'text-anchor': anchor }, g); e.innerHTML = s; return e; },
    rH(g, x1, x2, y) { const n = 6, L = 8, step = (x2 - x1 - 2 * L) / n; let d = `M${x1},${y} h${L}`; for (let i = 0; i < n; i++) d += ` l${step / 2},${i % 2 ? 7 : -7} l${step / 2},${i % 2 ? -7 : 7}`; d += ` L${x2},${y}`; E('path', { d, class: 'w' }, g); },
    rV(g, x, y1, y2) { const n = 6, L = 8, step = (y2 - y1 - 2 * L) / n; let d = `M${x},${y1} v${L}`; for (let i = 0; i < n; i++) d += ` l${i % 2 ? 7 : -7},${step / 2} l${i % 2 ? -7 : 7},${step / 2}`; d += ` L${x},${y2}`; E('path', { d, class: 'w' }, g); },
    lH(g, x1, x2, y) { const n = 4, L = 8, s = (x2 - x1 - 2 * L) / n; let d = `M${x1},${y} h${L}`; for (let i = 0; i < n; i++) d += ` a${s / 2},${s / 2} 0 0 1 ${s},0`; d += ` L${x2},${y}`; E('path', { d, class: 'w', fill: 'none' }, g); },
    lV(g, x, y1, y2) { const n = 4, L = 8, s = (y2 - y1 - 2 * L) / n; let d = `M${x},${y1} v${L}`; for (let i = 0; i < n; i++) d += ` a${s / 2},${s / 2} 0 0 1 0,${s}`; d += ` L${x},${y2}`; E('path', { d, class: 'w', fill: 'none' }, g); },
    cH(g, x1, x2, y) { const m = (x1 + x2) / 2; E('path', { d: `M${x1},${y} H${m - 5} M${m - 5},${y - 14} v28 M${m + 5},${y - 14} v28 M${m + 5},${y} H${x2}`, class: 'w' }, g); },
    cV(g, x, y1, y2) { const m = (y1 + y2) / 2; E('path', { d: `M${x},${y1} V${m - 5} M${x - 14},${m - 5} h28 M${x - 14},${m + 5} h28 M${x},${m + 5} V${y2}`, class: 'w' }, g); },
    gnd(g, x, y) { E('path', { d: `M${x},${y} v8 M${x - 11},${y + 8} h22 M${x - 7},${y + 13} h14 M${x - 3},${y + 18} h6`, class: 'w' }, g); },
    src(g, x, y, r = 20) { E('circle', { cx: x, cy: y, r, class: 'w', fill: '#fff' }, g); E('path', { d: `M${x - 10},${y} q5,-12 10,0 t10,0`, class: 'w', fill: 'none' }, g); },
    meter(g, x, y, s) { E('circle', { cx: x, cy: y, r: 15, class: 'w', fill: '#fff' }, g); sch.t(g, x, y + 5, s, 'lbl'); },
    box(g, x, y, w, h, s) { E('rect', { x, y, width: w, height: h, rx: 5, class: 'w', fill: '#f4f7ff' }, g); sch.t(g, x + w / 2, y + h / 2 + 5, s, 'lbl'); },
  };

  /* ---------- vektör / fazör çizimi (eşit ölçek) ---------- */
  function vecDiagram(g, segs, o = {}) {
    const vb = g.viewBox.baseVal, W = vb.width, H = vb.height, pad = 36;
    g.innerHTML = '';
    const xs = [0], ys = [0];
    segs.forEach((s) => { xs.push(s.a[0], s.b[0]); ys.push(s.a[1], s.b[1]); });
    if (o.square) { const m = Math.max(...xs.map(Math.abs), ...ys.map(Math.abs), 1e-12); xs.push(-m, m); ys.push(-m, m); }
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const span = Math.max(x1 - x0, y1 - y0, 1e-12);
    const k = Math.min((W - 2 * pad) / Math.max(x1 - x0, span * 0.05), (H - 2 * pad) / Math.max(y1 - y0, span * 0.05));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const X = (x) => W / 2 + (x - cx) * k, Y = (y) => H / 2 - (y - cy) * k;
    E('line', { x1: 8, x2: W - 8, y1: Y(0), y2: Y(0), stroke: '#c8ced8' }, g);
    E('line', { x1: X(0), x2: X(0), y1: 8, y2: H - 8, stroke: '#c8ced8' }, g);
    if (o.theta != null && Math.abs(o.theta) > 0.01) {
      const r = 34, th = o.theta, ex = X(0) + r * Math.cos(th), ey = Y(0) - r * Math.sin(th);
      E('path', { d: `M${X(0) + r},${Y(0)} A${r},${r} 0 0 ${th > 0 ? 0 : 1} ${ex},${ey}`, stroke: '#7a4bb5', fill: 'none', 'stroke-width': 1.5 }, g);
      const tl = E('text', { x: X(0) + (r + 14) * Math.cos(th / 2), y: Y(0) - (r + 14) * Math.sin(th / 2) + 4, fill: '#7a4bb5', 'text-anchor': 'middle' }, g); tl.textContent = 'θ';
    }
    segs.forEach((s) => {
      const ax = X(s.a[0]), ay = Y(s.a[1]), bx = X(s.b[0]), by = Y(s.b[1]), L = Math.hypot(bx - ax, by - ay);
      E('line', { x1: ax, y1: ay, x2: bx, y2: by, stroke: s.c, 'stroke-width': s.w || 3, 'stroke-dasharray': s.dash || '' }, g);
      if (L > 8 && !s.noArrow) {
        const ux = (bx - ax) / L, uy = (by - ay) / L, h = 10;
        E('path', { d: `M${bx},${by} L${bx - h * ux + h * 0.45 * uy},${by - h * uy - h * 0.45 * ux} L${bx - h * ux - h * 0.45 * uy},${by - h * uy + h * 0.45 * ux} Z`, fill: s.c }, g);
      }
      if (s.t) { const t = E('text', { x: (ax + bx) / 2 + (s.dx || 0), y: (ay + by) / 2 + (s.dy == null ? -7 : s.dy), fill: s.c, 'text-anchor': 'middle', 'font-weight': 700 }, g); t.textContent = s.t; }
    });
    return { X, Y, k };
  }
  function powerTri(g, P, Q, unit = 'W', lab = true) {
    const Sm = Math.hypot(P, Q), th = Math.atan2(Q, P);
    vecDiagram(g, [
      { a: [0, 0], b: [P, 0], c: '#0b5cad', t: lab ? 'P' : '', dy: Q >= 0 ? 16 : -8 },
      { a: [P, 0], b: [P, Q], c: '#c62828', t: lab ? 'Q' : '', dx: 14, dy: 4 },
      { a: [0, 0], b: [P, Q], c: '#1a8a4a', t: lab ? '|S|' : '', dx: -14, dy: Q >= 0 ? -6 : 14 },
    ], { theta: Sm > 1e-9 ? th : null });
    return { Sm, th };
  }

  /* ================= GEZİNME / İLERLEME ================= */
  const pages = ['giris', 'onbilgi', 'onhaz', 'd1', 'd2', 'd3', 'rapor'];
  function go(p) {
    S.page = p; save();
    $$('section.page').forEach((s) => s.classList.toggle('active', s.id === p));
    $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.p === p));
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
      if (!S.steps[id] && s.test()) { S.steps[id] = true; save(); Lab.toast('✔ Adım tamamlandı: ' + s.t.replace(/<[^>]+>/g, '').slice(0, 70)); progress(); }
      lis[i].classList.toggle('done', !!S.steps[id]);
    });
  }
  const qids = { onhaz: [], d1: [], d2: [], d3: [] };
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
  const qok = (ids) => ids.every((q) => S.answers[q] && S.answers[q].ok);

  [['stName', 'name'], ['stNo', 'no'], ['stGroup', 'group'], ['stDate', 'date'], ['stComment', 'comment']].forEach(([id, k]) => {
    const e = $('#' + id); e.value = S.st[k] || (k === 'date' ? new Date().toLocaleDateString('tr-TR') : '');
    e.addEventListener('input', () => { S.st[k] = e.value; save(); });
  });

  sch.term = (g, x, y) => E('circle', { cx: x, cy: y, r: 4.5, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g);
  /* ---------- ortak model ---------- */
  if (!S.hid) S.hid = { R: Math.round(20 + 60 * Math.random()), X: (Math.random() < 0.5 ? -1 : 1) * Math.round(10 + 50 * Math.random()) };
  const SRC = {
    a: { n: 'Örnek 10.9 · 10 V, 3000 + j4000 Ω', k: 'Örn. 10.9', V: 10, R: 3000, X: 4000, Rmax: 8000, Xm: 8000 },
    b: { n: 'Örnek 2.23 · 100 V, 3 + j4 Ω', k: 'Örn. 2.23', V: 100, R: 3, X: 4, Rmax: 10, Xm: 10 },
    g: { n: 'Gizli kaynak · 20 V, Z<sub>Th</sub> = ?', k: 'Gizli', V: 20, R: S.hid.R, X: S.hid.X, Rmax: 200, Xm: 150 },
  };
  const pL = (s, R, X) => (s.V * s.V * R) / ((s.R + R) ** 2 + (s.X + X) ** 2);
  const pMax = (s) => (s.V * s.V) / (4 * s.R);
  const fP = (p) => eng(p, 'W', 4);
  function retune(k, min, max, step, v) { Object.assign(k.o, { min, max, step }); k.set(v, true); }

  /* ================= ÖN BİLGİ ================= */
  const OB = (() => {
    const plot = new Lab.Plot($('#obPlot'), { xlabel: 'R_L (Ω)', ylabel: 'P_L / P_maks  ve  η' });
    const Rth = 50, V = 10, Pm = (V * V) / (4 * Rth);
    const P = [], H = [];
    for (let R = 0; R <= 300; R += 2) { P.push([R, (V * V * R) / (Rth + R) ** 2 / Pm]); H.push([R, R / (Rth + R)]); }
    function draw() {
      const R = 300 * +$('#obR').value, p = (V * V * R) / (Rth + R) ** 2, eta = R / (Rth + R);
      $('#obRv').textContent = num(R, 0) + ' Ω';
      plot.draw([
        { pts: P, line: true, color: '#0b5cad', width: 2.5 }, { pts: H, line: true, color: '#e07a10', width: 2.5 },
        { pts: [[R, 0], [R, 1.05]], line: true, color: '#999', dash: [4, 4], width: 1 },
        { pts: [[R, p / Pm], [R, eta]], dots: true, color: '#c62828' },
      ], [0, 300], [0, 1.05]);
      $('#obTxt').innerHTML = `R<sub>L</sub> = ${num(R, 0)} Ω → P<sub>L</sub> = <b>${num(p * 1000, 1)} mW</b> (mavi, P<sub>maks</sub> = 500 mW’a oranla), η = <b>%${num(eta * 100, 1)}</b> (turuncu). Tepe hangi R<sub>L</sub>’de, o noktada verim kaç?`;
    }
    return { draw };
  })();

  /* ================= ÖN HAZIRLIK ================= */
  numq('onhaz', '#preQ', { id: 'p1', q: '1) Örnek 10.9a: 10 V (rms), Z<sub>Th</sub> = 3000 + j4000 Ω. Kısıtsız yüke aktarılabilecek en büyük güç kaç mW’tır?', answer: 100 / 12, tol: 1, unit: 'mW', explain: 'Z<sub>L</sub> = 3000 − j4000 Ω; P = 10²/(4 × 3000) = 8,33 mW.', hint: 'P<sub>maks</sub> = |V<sub>Th</sub>|²/(4R<sub>Th</sub>).' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) Örnek 2.23: 100 V, Z<sub>Th</sub> = 3 + j4 Ω, yük saf ayarlı direnç. P’yi en büyük yapan R<sub>L</sub> kaç Ω’dur?', answer: 5, tol: 1, unit: 'Ω', explain: 'R<sub>L</sub> = |Z<sub>Th</sub>| = √(9 + 16) = 5 Ω.', hint: 'X<sub>L</sub> = 0 kısıtı: R<sub>L</sub> = |Z<sub>Th</sub>|.' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) Bu güç, eşlenik uyumdaki P<sub>maks</sub>’ın yüzde kaçıdır?', answer: 75, tol: 1, unit: '%', explain: 'P = 100² × 5/(8² + 4²) = 625 W; P<sub>maks</sub> = 10 000/12 = 833,3 W → %75.', hint: 'P = V²R<sub>L</sub>/((R<sub>Th</sub>+R<sub>L</sub>)² + X<sub>Th</sub>²).' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) Örnek 2.25: 800 Ω çıkışlı yükselteci 8 Ω hoparlöre uydurmak için ideal trafonun oranı n (n:1) kaç olmalıdır?', answer: 10, tol: 1, unit: '', explain: 'n²·8 = 800 → n = 10.', hint: 'Primerden görülen direnç n²R<sub>L</sub>.' });
  numq('onhaz', '#preQ', { id: 'p5', q: '5) Örnek 2.24: R<sub>Th</sub> = 50 Ω, X<sub>Th</sub> = −30 Ω; yük 75 Ω sabit, yalnız seri jX eklenebiliyor. 100 MHz’de eklenecek bobin kaç nH’dir?', answer: (30 / (2 * Math.PI * 1e8)) * 1e9, tol: 1.5, unit: 'nH', explain: 'X = +30 Ω (−X<sub>Th</sub>) → bobin; L = 30/(2π × 10<sup>8</sup>) = 47,7 nH.', hint: 'Reaktansı sıfırlayın: X = −X<sub>Th</sub>.' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) Tepe değeri V<sub>m</sub> = 19,2 V, R<sub>Th</sub> = 5,76 Ω olan kaynaktan eşlenik uyumda alınan ortalama güç?', opts: ['16 W', '8 W', '32 W', '4 W'], correct: 1, explain: 'Tepe değerle P = V<sub>m</sub>²/(8R<sub>Th</sub>) = 368,64/46,08 = 8 W.', hint: 'Tepe değerle yazılan her güç ifadesinde ½ çarpanı vardır.' });

  /* ================= DENEY 1 · P_L yüzeyi ================= */
  const D1 = (() => {
    const box = $('#d1inst');
    S.d1src = S.d1src || 'a'; S.d1scan = S.d1scan || {};
    const so = inst(box, 'THEVENİN KAYNAK MODÜLÜ', true); const soL = lcd(so.el, 'V<sub>Th</sub> (açık devre)', 'V', 130);
    segBtns(so.c, Object.entries(SRC).map(([k, s]) => [k, s.k]), S.d1src, (v) => { S.d1src = v; save(); setSrc(); });
    const ld = inst(box, 'YÜK: DİRENÇ + REAKTANS KUTUSU', false);
    const kR = new Lab.Knob(ld.c, { label: 'R_L', min: 0, max: 1, step: 0, value: 0, size: 62, fmt: (v) => Lab.ohm(v), onChange: (v) => { (S.d1RX = S.d1RX || {})[S.d1src + 'R'] = v; save(); } });
    const kX = new Lab.Knob(ld.c, { label: 'X_L', min: -1, max: 1, step: 0, value: 0, size: 62, fmt: (v) => (v < 0 ? '−j' : '+j') + Lab.ohm(Math.abs(v)), onChange: (v) => { (S.d1RX = S.d1RX || {})[S.d1src + 'X'] = v; save(); } });
    const mt = inst(box, 'ÖLÇÜ ALETLERİ', true); const wL = lcd(mt.el, 'Wattmetre P<sub>L</sub>', 'W', 130), vL = lcd(mt.el, '|V<sub>L</sub>| rms', 'V', 130), iL = lcd(mt.el, 'I rms', 'mA', 130);
    function setSrc() {
      const s = SRC[S.d1src], m = S.d1RX || {};
      retune(kR, 0, s.Rmax, s.Rmax / 4000, m[S.d1src + 'R'] ?? s.Rmax / 5);
      retune(kX, -s.Xm, s.Xm, s.Xm / 2000, m[S.d1src + 'X'] ?? 0);
      table();
    }
    const g = $('#d1sch');
    E('rect', { x: 30, y: 25, width: 250, height: 160, rx: 10, fill: '#f1f3f7', stroke: '#9aa3b0', 'stroke-dasharray': '6 4' }, g);
    sch.t(g, 155, 45, 'kaynak modülü', 'lbl');
    sch.src(g, 80, 115); sch.w(g, [[80, 95], [80, 70], [120, 70]]); sch.rH(g, 120, 190, 70); sch.lH(g, 190, 250, 70); sch.w(g, [[250, 70], [300, 70]]);
    const tZ = sch.t(g, 185, 100, '', 'val');
    sch.w(g, [[80, 135], [80, 170], [300, 170]]); sch.term(g, 300, 70); sch.term(g, 300, 170); sch.t(g, 300, 58, 'a'); sch.t(g, 300, 196, 'b');
    sch.w(g, [[300, 70], [460, 70]]); sch.box(g, 400, 52, 50, 36, 'W'); sch.w(g, [[450, 70], [560, 70], [560, 80]]); sch.rV(g, 560, 80, 120); sch.lV(g, 560, 120, 160); sch.w(g, [[560, 160], [560, 170], [300, 170]]);
    const tL = sch.t(g, 580, 125, '', 'val', 'start');

    const cv = $('#d1map'), gx = cv.getContext('2d'), MW = cv.width, MH = cv.height, ML = 64, MR = 20, MT = 12, MB = 40;
    const mx = (R) => ML + (R / SRC[S.d1src].Rmax) * (MW - ML - MR), my = (X) => MT + ((SRC[S.d1src].Xm - X) / (2 * SRC[S.d1src].Xm)) * (MH - MT - MB);
    cv.addEventListener('click', (e) => {
      const r = cv.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * MW, y = ((e.clientY - r.top) / r.height) * MH, s = SRC[S.d1src];
      if (x < ML || x > MW - MR || y < MT || y > MH - MB) return;
      kR.set(((x - ML) / (MW - ML - MR)) * s.Rmax); kX.set(s.Xm - ((y - MT) / (MH - MT - MB)) * 2 * s.Xm);
    });
    const NX = 26, NY = 21;
    $('#d1scan').onclick = () => {
      const s = SRC[S.d1src], gr = [];
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const R = ((i + 0.5) / NX) * s.Rmax, X = s.Xm - ((j + 0.5) / NY) * 2 * s.Xm; gr.push(pL(s, R, X) * (1 + 0.004 * (Math.random() - 0.5))); }
      S.d1scan[S.d1src] = gr; save(); dirty = true; Lab.toast(`Izgara taraması bitti: ${NX} × ${NY} = ${NX * NY} ölçüm.`);
    };
    let dirty = true, last = '';
    function drawMap(c) {
      const s = SRC[S.d1src];
      gx.fillStyle = '#fff'; gx.fillRect(0, 0, MW, MH);
      const gr = S.d1scan[S.d1src];
      if (gr) {
        const mxP = Math.max(...gr), cw = (MW - ML - MR) / NX, ch = (MH - MT - MB) / NY;
        gr.forEach((p, k) => { const i = k % NX, j = Math.floor(k / NX), t = p / mxP; gx.fillStyle = `rgb(${Math.round(255 - 215 * t)},${Math.round(255 - 160 * t)},${Math.round(255 - 60 * t)})`; gx.fillRect(ML + i * cw, MT + j * ch, cw + 0.5, ch + 0.5); });
      }
      if ($('#d1theo').checked) {
        const nx = 120, ny = 90, Pm = pMax(s), F = [];
        for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) F.push(pL(s, (i / nx) * s.Rmax, s.Xm - (j / ny) * 2 * s.Xm) / Pm);
        const X = (i) => ML + (i / nx) * (MW - ML - MR), Y = (j) => MT + (j / ny) * (MH - MT - MB);
        gx.strokeStyle = '#c62828'; gx.lineWidth = 1.2;
        [0.2, 0.4, 0.6, 0.8, 0.9, 0.97].forEach((lv) => {
          gx.beginPath();
          for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
            const v = [F[j * (nx + 1) + i], F[j * (nx + 1) + i + 1], F[(j + 1) * (nx + 1) + i + 1], F[(j + 1) * (nx + 1) + i]];
            const P = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]], cr = [];
            for (let e = 0; e < 4; e++) { const a = v[e] - lv, b = v[(e + 1) % 4] - lv; if ((a < 0) !== (b < 0)) { const t = a / (a - b), p0 = P[e], p1 = P[(e + 1) % 4]; cr.push([X(p0[0] + t * (p1[0] - p0[0])), Y(p0[1] + t * (p1[1] - p0[1]))]); } }
            for (let q = 0; q + 1 < cr.length; q += 2) { gx.moveTo(cr[q][0], cr[q][1]); gx.lineTo(cr[q + 1][0], cr[q + 1][1]); }
          }
          gx.stroke();
        });
      }
      gx.strokeStyle = '#99a'; gx.lineWidth = 1; gx.strokeRect(ML, MT, MW - ML - MR, MH - MT - MB);
      gx.beginPath(); gx.moveTo(ML, my(0)); gx.lineTo(MW - MR, my(0)); gx.stroke();
      gx.fillStyle = '#334'; gx.font = '11px Segoe UI'; gx.textAlign = 'center';
      for (let i = 0; i <= 4; i++) gx.fillText(Lab.ohm((s.Rmax * i) / 4), mx((s.Rmax * i) / 4), MH - MB + 14);
      gx.textAlign = 'right';
      for (let i = -2; i <= 2; i++) gx.fillText(Lab.ohm(Math.abs((s.Xm * i) / 2)).replace(/^/, i < 0 ? '−' : i > 0 ? '+' : ''), ML - 4, my((s.Xm * i) / 2) + 4);
      gx.textAlign = 'center'; gx.font = '12px Segoe UI'; gx.fillText('R_L', (ML + MW - MR) / 2, MH - 8);
      gx.save(); gx.translate(14, (MT + MH - MB) / 2); gx.rotate(-Math.PI / 2); gx.fillText('X_L', 0, 0); gx.restore();
      gx.fillStyle = '#0b5cad';
      S.d1rows.filter((r) => r.src === S.d1src).forEach((r) => { gx.beginPath(); gx.arc(mx(r.R), my(r.X), 4, 0, 7); gx.fill(); });
      gx.strokeStyle = '#111'; gx.lineWidth = 2; const cx = mx(c.R), cy = my(c.X);
      gx.beginPath(); gx.moveTo(cx - 9, cy); gx.lineTo(cx + 9, cy); gx.moveTo(cx, cy - 9); gx.lineTo(cx, cy + 9); gx.stroke();
    }
    let cur = {};
    function compute() {
      const s = SRC[S.d1src], R = kR.value, X = kX.value, Zt = Math.hypot(s.R + R, s.X + X), I = s.V / Zt;
      cur = { src: S.d1src, R, X, I, VL: I * Math.hypot(R, X), P: pL(s, R, X), eff: pL(s, R, X) / pMax(s) };
      return cur;
    }
    function update() {
      const c = compute(), s = SRC[c.src];
      soL(num(s.V, 2)); wL(...(c.P < 1 ? [num(c.P * 1000, 3), 'mW'] : [num(c.P, 2), 'W'])); vL(num(c.VL, 3)); iL(...(c.I < 1 ? [num(c.I * 1000, 3), 'mA'] : [num(c.I, 3), 'A']));
      tZ.textContent = c.src === 'g' ? 'Z_Th = ?' : `Z_Th = ${Lab.ohm(s.R)} + j${Lab.ohm(s.X)}`;
      tL.textContent = `Z_L = ${Lab.ohm(c.R)} ${c.X < 0 ? '−' : '+'} j${Lab.ohm(Math.abs(c.X))}`;
      const key = [c.src, c.R, c.X, $('#d1theo').checked, S.d1rows.length].join('|');
      if (dirty || key !== last) { drawMap(c); last = key; dirty = false; }
    }
    const tbody = $('#d1tab tbody');
    function table() {
      tbody.innerHTML = S.d1rows.map((r, i) => `<tr><td>${i + 1}</td><td class="l">${SRC[r.src].k}</td><td>${Lab.ohm(r.R)}</td><td>${r.X < 0 ? '−' : ''}${Lab.ohm(Math.abs(r.X))}</td><td>${num(r.VL, 3)}</td><td>${num(r.I * 1000, 3)}</td><td>${fP(r.P)}</td></tr>`).join('');
      tbody.parentElement.parentElement.scrollTop = 1e6; dirty = true;
    }
    function rec() { const c = compute(); S.d1rows.push({ src: c.src, R: c.R, X: c.X, VL: c.VL, I: c.I, P: c.P, eff: c.eff }); save(); table(); Lab.toast(`Kaydedildi: P_L = ${fP(c.P)}`); }
    $('#d1rec').onclick = rec;
    $('#d1del').onclick = () => { S.d1rows.pop(); save(); table(); };
    $('#d1csv').onclick = () => Lab.downloadCSV('hafta11_deney1.csv', ['#', 'kaynak', 'RL (ohm)', 'XL (ohm)', 'VL (V)', 'I (A)', 'PL (W)'], S.d1rows.map((r, i) => [i + 1, SRC[r.src].k, +r.R.toFixed(3), +r.X.toFixed(3), +r.VL.toFixed(5), +r.I.toFixed(7), +r.P.toExponential(5)]));
    $('#d1theo').onchange = () => (dirty = true);
    setSrc();
    return { update, rec, mapCanvas: cv };
  })();

  steps('d1', [
    { t: '<b>Örnek 10.9</b> kaynağını seçin. Farklı R<sub>L</sub>, X<sub>L</sub> değerlerinde <b>en az 3</b> ölçüm kaydedin (<kbd>R</kbd>).', test: () => S.d1rows.filter((r) => r.src === 'a').length >= 3 },
    { t: '<b>Otomatik ızgara taraması</b> yapın. Renkli haritada tepenin nerede olduğunu ve X<sub>L</sub> yönünde simetriyi gözleyin.', test: () => !!(S.d1scan && S.d1scan.a) },
    { t: 'Düğmelerle (Shift ile ince) tepeyi bulun: wattmetre <b>P<sub>maks</sub>’ın %99,5’ine</b> ulaşınca kaydedin. Z<sub>L</sub> ile Z<sub>Th</sub>’yi karşılaştırın.', test: () => S.d1rows.some((r) => r.src === 'a' && r.eff >= 0.995) },
    { t: '<b>Gizli kaynak</b>: Z<sub>Th</sub> bilinmiyor. Tepeyi (%99) bulup kaydedin ve Z<sub>Th</sub>’yi ölçümden çıkarın.', test: () => S.d1rows.some((r) => r.src === 'g' && r.eff >= 0.99) },
    { t: '<b>Kuramsal konturları</b> açın ve ölçülen haritayla karşılaştırın; gizli kaynak sorularını yanıtlayın.', test: () => $('#d1theo').checked && qok(['d1q2', 'd1q3']) },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: 'Örnek 10.9 kaynağında bulduğunuz tepede yük gerilimi |V<sub>L</sub>| kaç V’tur?', answer: (10 / 6000) * 5000, tol: 1.5, unit: 'V', explain: 'I = 10/6000 A; |Z<sub>L</sub>| = 5000 Ω → |V<sub>L</sub>| = 8,33 V. Yük gerilimi V<sub>Th</sub>’nin yarısı değil! Reaktans rezonansı gerilimi yükseltebilir.', hint: '|V<sub>L</sub>| = |I||Z<sub>L</sub>|.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'Gizli kaynağın R<sub>Th</sub> değeri kaç Ω’dur?', answer: () => S.hid.R, tol: 3, unit: 'Ω', explain: 'Tepede R<sub>L</sub> = R<sub>Th</sub>. Ayrıca P<sub>maks</sub> = V<sub>Th</sub>²/(4R<sub>Th</sub>) ile çapraz kontrol edebilirsiniz.', hint: 'Tepedeki R<sub>L</sub> değerini okuyun; ya da R<sub>Th</sub> = V<sub>Th</sub>²/(4P<sub>maks</sub>).' });
  numq('d1', '#d1Q', { id: 'd1q3', q: 'Gizli kaynağın X<sub>Th</sub> değeri kaç Ω’dur (işaretiyle)?', answer: () => S.hid.X, tol: 4, abs: 0.5, unit: 'Ω', explain: 'Tepede X<sub>L</sub> = −X<sub>Th</sub>. İşaret, kaynağın endüktif (+) ya da kapasitif (−) olduğunu söyler.', hint: 'Eşlenik: X<sub>Th</sub> = −X<sub>L</sub>(tepe).' });
  mcq('d1', '#d1Q', { id: 'd1q4', q: 'Örnek 10.9 kaynağına Z<sub>L</sub> = Z<sub>Th</sub> = 3000 + j4000 Ω bağlansaydı ne olurdu?', opts: ['Maksimum güç aktarılırdı', 'Reaktanslar toplanır (j8000), akım küçülür; güç P<sub>maks</sub>’ın %36’sına düşer', 'Akım sonsuz olurdu', 'Güç değişmezdi'], correct: 1, explain: 'P = 100 × 3000/(6000² + 8000²) = 3 mW; 8,33 mW’ın %36’sı. Haritada (3000, +4000) noktasına bakın.', hint: 'Toplam çevrim empedansını yazın.' });
  numq('d1', '#d1Q', { id: 'd1q5', q: 'Örnek 10.9 kaynağında X<sub>L</sub> = −4000 Ω sabitken R<sub>L</sub> = 1000 Ω yapılırsa P<sub>L</sub> kaç mW olur?', answer: (100 * 1000) / 16e6 * 1000, tol: 1.5, unit: 'mW', explain: 'P = 100 × 1000/(4000²) = 6,25 mW (%75). Tepenin R<sub>L</sub> yönünde yayvan olduğuna dikkat.', hint: 'Reaktans sıfırlandı: P = V²R<sub>L</sub>/(R<sub>Th</sub>+R<sub>L</sub>)².' });

  /* ================= DENEY 2 · Kısıtlı yükler ================= */
  const D2 = (() => {
    const box = $('#d2inst');
    S.d2src = S.d2src || 'b'; S.d2mode = S.d2mode || 'r'; S.d2sw = S.d2sw || {};
    const so = inst(box, 'THEVENİN KAYNAK', true); const soL = lcd(so.el, 'Z<sub>Th</sub>', 'Ω', 150);
    segBtns(so.c, [['a', 'Örn. 10.9'], ['b', 'Örn. 2.23']], S.d2src, (v) => { S.d2src = v; save(); cfg(); });
    const ld = inst(box, 'KISITLI YÜK', false);
    segBtns(ld.c, [['r', 'Yalnız R<sub>L</sub>'], ['b', 'Sınırlı R, X'], ['c', 'Açı sabit']], S.d2mode, (v) => { S.d2mode = v; save(); cfg(); });
    const k1 = new Lab.Knob(ld.c, { label: 'R_L', min: 0, max: 1, step: 0, value: 0, size: 60, fmt: (v) => Lab.ohm(v), onChange: () => save() });
    const k2 = new Lab.Knob(ld.c, { label: 'X_L', min: -1, max: 0, step: 0, value: 0, size: 60, fmt: (v) => (v < 0 ? '−j' : '+j') + Lab.ohm(Math.abs(v)) });
    const kA = new Lab.Knob(ld.c, { label: 'θ_L', min: -90, max: 90, step: 0.01, value: S.d2ang ?? -36.87, size: 60, fmt: (v) => num(v, 2) + '°', onChange: (v) => { S.d2ang = v; save(); } });
    const mt = inst(box, 'WATTMETRE', true); const wL = lcd(mt.el, 'P<sub>L</sub>', 'W', 130), zL = lcd(mt.el, 'Z<sub>L</sub>', 'Ω', 150);
    const sc = () => (S.d2src === 'a' ? 1 : 1 / 1000);
    function cfg() {
      const s = SRC[S.d2src], k = sc(), m = S.d2mode;
      k1.o.label = m === 'c' ? '|Z_L|' : 'R_L'; k1.el.querySelector('.kl').textContent = k1.o.label;
      const max = m === 'b' ? 4000 * k : 2.5 * Math.hypot(s.R, s.X);
      retune(k1, 0, max, max / 4000, max / 5);
      retune(k2, -2000 * k, 0, 2000 * k / 1000, 0);
      k2.el.style.display = m === 'b' ? '' : 'none'; kA.el.style.display = m === 'c' ? '' : 'none';
      $('#d2lim').textContent = m === 'b' ? `Sınırlar: 0 ≤ R_L ≤ ${Lab.ohm(4000 * k)}, −${Lab.ohm(2000 * k)} ≤ X_L ≤ 0` : m === 'c' ? 'Z_L = |Z_L|∠θ_L, yalnız |Z_L| ayarlı' : 'X_L = 0 (saf direnç)';
      drawPlot();
    }
    const g = $('#d2sch');
    sch.src(g, 70, 110); sch.w(g, [[70, 90], [70, 60], [110, 60]]); sch.rH(g, 110, 190, 60); sch.lH(g, 190, 260, 60); sch.w(g, [[260, 60], [480, 60], [480, 70]]);
    E('rect', { x: 440, y: 70, width: 80, height: 80, rx: 6, fill: '#fff4e0', stroke: '#a60', 'stroke-width': 2 }, g); sch.t(g, 480, 115, 'Z_L', 'lbl');
    sch.w(g, [[480, 150], [480, 170], [70, 170], [70, 130]]);
    const tZ = sch.t(g, 185, 40, '', 'val'), tL = sch.t(g, 540, 105, '', 'val', 'start'), tLim = sch.t(g, 540, 130, '', 'lbl', 'start');
    tLim.id = 'd2lim'; tLim.setAttribute('style', 'font-size:12px;fill:#666');

    function zl(v1 = k1.value) {
      const m = S.d2mode;
      return m === 'r' ? [v1, 0] : m === 'b' ? [v1, k2.value] : Cx.polar(v1, kA.value);
    }
    function best() {
      const s = SRC[S.d2src], k = sc(), m = S.d2mode;
      if (m === 'r') return pL(s, Math.hypot(s.R, s.X), 0);
      if (m === 'b') { const X = clamp(-s.X, -2000 * k, 0), R = clamp(Math.hypot(s.R, s.X + X), 0, 4000 * k); return pL(s, R, X); }
      const z = Cx.polar(Math.hypot(s.R, s.X), kA.value); return pL(s, z[0], z[1]);
    }
    const plot = new Lab.Plot($('#d2plot'), { xlabel: 'ayarlı büyüklük (Ω)', ylabel: 'P_L (mW / W)' });
    const uP = () => (S.d2src === 'a' ? 1000 : 1);
    function drawPlot() {
      const s = SRC[S.d2src], u = uP(), ser = [], col = { r: '#0b5cad', b: '#e07a10', c: '#7a4bb5' };
      Object.entries(S.d2sw).forEach(([key, pts]) => { if (key[1] === S.d2src) ser.push({ pts: pts.map(([x, p]) => [x, p * u]), line: true, color: col[key[0]], width: key[0] === S.d2mode ? 2.5 : 1.2 }); });
      if ($('#d2theo').checked) ser.push({ pts: [[0, pMax(s) * u], [k1.o.max, pMax(s) * u]], line: true, color: '#1a8a4a', dash: [6, 4] });
      ser.push({ pts: S.d2rows.filter((r) => r.src === S.d2src && r.mode === S.d2mode).map((r) => [r.v1, r.P * u]), dots: true, color: '#c62828' });
      const z = zl(); ser.push({ pts: [[k1.value, pL(s, z[0], z[1]) * u]], dots: true, color: '#111' });
      plot.draw(ser, [0, k1.o.max], [0, pMax(s) * u * 1.1]);
      $('#d2plot').title = S.d2src === 'a' ? 'P_L (mW)' : 'P_L (W)';
    }
    $('#d2theo').onchange = drawPlot;
    let sweeping = false;
    $('#d2sweep').onclick = () => {
      if (sweeping) return; sweeping = true;
      const s = SRC[S.d2src], key = S.d2mode + S.d2src, pts = [], N = 80; let i = 0;
      const h = setInterval(() => {
        const v = (i / N) * k1.o.max, z = zl(v); pts.push([v, pL(s, z[0], z[1])]); k1.set(v); S.d2sw[key] = pts;
        if (++i > N) { clearInterval(h); sweeping = false; save(); Lab.toast('Tarama bitti. Diğer kısıtlarla karşılaştırmak için onları da tarayın.'); }
      }, 20);
    };
    let cur = {}, last = '';
    function compute() {
      const s = SRC[S.d2src], z = zl(), P = pL(s, z[0], z[1]);
      cur = { src: S.d2src, mode: S.d2mode, v1: k1.value, R: z[0], X: z[1], Zm: Cx.abs(z), ang: Cx.ang(z), P, opt: P / best() };
      return cur;
    }
    function update() {
      const c = compute(), s = SRC[c.src];
      soL(`${num(s.R, 0)} + j${num(s.X, 0)}`); wL(...(c.P < 1 ? [num(c.P * 1000, 3), 'mW'] : [num(c.P, 2), 'W'])); zL(`${num(c.R, c.R < 10 ? 3 : 0)} ${c.X < 0 ? '−' : '+'} j${num(Math.abs(c.X), Math.abs(c.X) < 10 ? 3 : 0)}`);
      tZ.textContent = `Z_Th = ${Lab.ohm(s.R)} + j${Lab.ohm(s.X)}, V_Th = ${s.V} V`;
      tL.textContent = `Z_L = ${Lab.ohm(c.Zm)} ∠ ${num(c.ang, 2)}°`;
      const key = [c.src, c.mode, c.v1, c.X, kA.value, S.d2rows.length, $('#d2theo').checked].join('|');
      if (key !== last) { last = key; drawPlot(); }
    }
    const MN = { r: 'yalnız R', b: 'sınırlı', c: 'açı sabit' };
    const tbody = $('#d2tab tbody');
    function table() {
      tbody.innerHTML = S.d2rows.map((r, i) => `<tr><td>${i + 1}</td><td class="l">${SRC[r.src].k}</td><td class="l">${MN[r.mode]}</td><td>${Lab.ohm(r.R)}</td><td>${r.X < 0 ? '−' : ''}${Lab.ohm(Math.abs(r.X))}</td><td>${Lab.ohm(r.Zm)}</td><td>${num(r.ang, 2)}</td><td>${fP(r.P)}</td></tr>`).join('');
      tbody.parentElement.parentElement.scrollTop = 1e6;
    }
    function rec() { const c = compute(); S.d2rows.push({ src: c.src, mode: c.mode, v1: c.v1, R: c.R, X: c.X, Zm: c.Zm, ang: c.ang, P: c.P, opt: c.opt, angK: kA.value }); save(); table(); Lab.toast(`Kaydedildi: P_L = ${fP(c.P)}`); }
    $('#d2rec').onclick = rec;
    $('#d2del').onclick = () => { S.d2rows.pop(); save(); table(); };
    $('#d2csv').onclick = () => Lab.downloadCSV('hafta11_deney2.csv', ['#', 'kaynak', 'kisit', 'RL', 'XL', '|ZL|', 'aci', 'PL (W)'], S.d2rows.map((r, i) => [i + 1, SRC[r.src].k, MN[r.mode], +r.R.toFixed(4), +r.X.toFixed(4), +r.Zm.toFixed(4), +r.ang.toFixed(3), +r.P.toExponential(5)]));
    cfg(); table();
    return { update, rec, plotCanvas: $('#d2plot'), sweeping: () => sweeping };
  })();

  steps('d2', [
    { t: '<b>Örnek 2.23</b> kaynağı, <b>yalnız R<sub>L</sub></b> kısıtı: <b>Tara</b>’ya basın, sonra tepeyi düğmeyle bulup (%99,5) kaydedin.', test: () => S.d2rows.some((r) => r.src === 'b' && r.mode === 'r' && r.opt >= 0.995) },
    { t: '<b>Örnek 10.9b</b>: kaynağı Örn. 10.9’a, kısıtı <b>sınırlı R, X</b>’e alın. Önce X<sub>L</sub>’yi, sonra R<sub>L</sub>’yi ayarlayıp en iyi noktayı kaydedin.', test: () => S.d2rows.some((r) => r.src === 'a' && r.mode === 'b' && r.opt >= 0.995) },
    { t: '<b>Örnek 10.10</b>: <b>açı sabit</b> kısıtı, θ<sub>L</sub> = −36,87°. |Z<sub>L</sub>|’yi ayarlayıp en iyi noktayı kaydedin.', test: () => S.d2rows.some((r) => r.src === 'a' && r.mode === 'c' && near(r.angK, -36.87, 0.05) && r.opt >= 0.995) },
    { t: 'Aynı kaynakta <b>en az iki</b> kısıtı tarayıp “Kısıtsız P<sub>maks</sub>” çizgisini açın. Hangi kısıt en çok güç kaybettiriyor?', test: () => Object.keys(S.d2sw).filter((k) => k[1] === 'a').length >= 2 && $('#d2theo').checked },
    { t: 'Soruları yanıtlayın.', test: () => qok(['d2q1', 'd2q2', 'd2q3']) },
  ]);
  const P109b = pL(SRC.a, Math.hypot(3000, 2000), -2000);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'Örnek 10.9b: Sınırlar altında en iyi R<sub>L</sub> kaç Ω’dur?', answer: Math.hypot(3000, 2000), tol: 1, unit: 'Ω', explain: 'X<sub>L</sub> = −2000 Ω (−4000’e en yakın izinli değer); R<sub>L</sub> = √(3000² + 2000²) = 3606 Ω (≤ 4000, izinli).', hint: 'Önce X<sub>L</sub>, sonra R<sub>L</sub> = √(R<sub>Th</sub>² + (X<sub>Th</sub>+X<sub>L</sub>)²).' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'Örnek 10.9b: Bu yükte aktarılan güç kaç mW’tır?', answer: P109b * 1000, tol: 1, unit: 'mW', explain: `|I| = 10/|6606 + j2000| = 1,449 mA; P = I²R<sub>L</sub> = ${num(P109b * 1000, 2)} mW (kısıtsız 8,33 mW).`, hint: 'P = |I|²R<sub>L</sub>.' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 'Örnek 10.10: θ<sub>L</sub> = −36,87° sabitken aktarılan en büyük güç kaç mW’tır?', answer: 8, tol: 1, unit: 'mW', explain: 'Z<sub>L</sub> = 5000∠−36,87° = 4000 − j3000 Ω; toplam 7000 + j1000, |I| = 1,414 mA; P = 2·10<sup>−6</sup> × 4000 = 8 mW.', hint: '|Z<sub>L</sub>| = |Z<sub>Th</sub>| = 5000 Ω.' });
  mcq('d2', '#d2Q', { id: 'd2q4', q: 'Örnek 10.10’da Z<sub>L</sub> = 3000 − j4000 Ω seçilemez. Neden?', opts: ['Direnç sınırı aşılır', 'Açısı −53,13°’dir; kısıt −36,87° açı istiyor', 'Kapasitif yük yasaktır', 'Güç negatif olur'], correct: 1, explain: 'Kısıt varken eşlenik çoğu zaman ulaşılamaz; yalnız büyüklük eşlenir: 4000 − j3000 Ω.', hint: 'arctan(−4000/3000) = ?' });
  mcq('d2', '#d2Q', { id: 'd2q5', q: 'Yalnız R<sub>L</sub> ayarlanabilen yükte gücü artırmanın en kolay yolu nedir?', opts: ['R<sub>L</sub>’yi sıfır yapmak', 'Yüke seri, X<sub>Th</sub>’yi yok edecek bir reaktans (burada kondansatör) eklemek', 'Kaynağın frekansını sıfır yapmak', 'R<sub>L</sub>’yi sonsuz yapmak'], correct: 1, explain: 'Örnek 2.24’teki gibi: reaktansı sıfırlayan seri eleman, R<sub>L</sub> = R<sub>Th</sub> ile birlikte tam uyumu sağlar.', hint: 'Paydadaki (X<sub>Th</sub> + X<sub>L</sub>)² terimi.' });

  /* ================= DENEY 3 · Trafo ve verim ================= */
  const AMP = { V: 40, R: 800 }, R1 = 15, R2 = 0.15;
  function tx(conn, n, RL) {
    let Zin, Ptr = 0;
    if (conn === 'd') { n = 1; Zin = RL; } else if (conn === 'i') Zin = n * n * RL; else Zin = R1 + n * n * (R2 + RL);
    const I1 = AMP.V / (AMP.R + Zin), PL = I1 * I1 * n * n * RL, Pi = I1 * I1 * AMP.R;
    if (conn === 'g') Ptr = I1 * I1 * (R1 + n * n * R2);
    return { I1, PL, Pi, Ptr, eta: PL / (PL + Pi + Ptr), n };
  }
  const D3 = (() => {
    const box = $('#d3inst');
    S.d3conn = S.d3conn || 'd'; S.d3RL = S.d3RL || 8;
    const am = inst(box, 'SES YÜKSELTECİ', true, 'Thevenin'); const amL = lcd(am.el, 'V<sub>Th</sub> / R<sub>Th</sub>', '', 150); amL('40 V / 800 Ω');
    const tr = inst(box, 'UYDURMA TRAFOSU', false);
    segBtns(tr.c, [['d', 'Doğrudan'], ['i', 'İdeal trafo'], ['g', 'Gerçek trafo']], S.d3conn, (v) => { S.d3conn = v; save(); });
    const kN = new Lab.Knob(tr.c, { label: 'n (n:1)', min: 1, max: 30, step: 0.1, value: S.d3n ?? 3, size: 62, fmt: (v) => num(v, 1) + ' : 1', onChange: (v) => { S.d3n = v; save(); } });
    const hp = inst(box, 'HOPARLÖR', false);
    segBtns(hp.c, [[4, '4 Ω'], [8, '8 Ω'], [16, '16 Ω']], S.d3RL, (v) => { S.d3RL = v; save(); });
    const mt = inst(box, 'WATTMETRELER', true); const wL = lcd(mt.el, 'P<sub>L</sub> hoparlör', 'W', 120), wI = lcd(mt.el, 'P<sub>iç</sub> (R<sub>Th</sub>)', 'W', 120), wT = lcd(mt.el, 'P<sub>trafo</sub> (bakır)', 'W', 120), aI = lcd(mt.el, 'I<sub>1</sub> primer', 'mA', 120);
    const g = $('#d3sch');
    E('rect', { x: 20, y: 25, width: 220, height: 160, rx: 10, fill: '#f1f3f7', stroke: '#9aa3b0', 'stroke-dasharray': '6 4' }, g); sch.t(g, 130, 45, 'yükselteç', 'lbl');
    sch.src(g, 70, 115); sch.w(g, [[70, 95], [70, 70], [110, 70]]); sch.rH(g, 110, 200, 70); sch.t(g, 155, 95, '800 Ω'); sch.w(g, [[200, 70], [330, 70]]);
    sch.w(g, [[70, 135], [70, 170], [330, 170]]);
    const trG = E('g', {}, g), tN = sch.t(g, 400, 30, '', 'val');
    sch.w(g, [[470, 70], [600, 70], [600, 85]]); E('path', { d: 'M590,85 h20 v50 h-20 z M610,95 l18,-14 v78 l-18,-14', class: 'w', fill: '#eef4ff' }, g); sch.w(g, [[600, 135], [600, 170], [470, 170]]);
    const tRL = sch.t(g, 640, 125, '', 'val', 'start');
    let lastC = '';
    function drawTr() {
      if (lastC === S.d3conn) return; lastC = S.d3conn; trG.innerHTML = '';
      if (S.d3conn === 'd') { sch.w(trG, [[330, 70], [470, 70]]); sch.w(trG, [[330, 170], [470, 170]]); return; }
      sch.w(trG, [[330, 70], [370, 70], [370, 80]]); sch.lV(trG, 370, 80, 160); sch.w(trG, [[370, 160], [370, 170], [330, 170]]);
      sch.w(trG, [[470, 70], [430, 70], [430, 80]]); sch.lV(trG, 430, 80, 160); sch.w(trG, [[430, 160], [430, 170], [470, 170]]);
      E('path', { d: 'M395,80 V160 M405,80 V160', class: 'w' }, trG); E('circle', { cx: 360, cy: 88, r: 3, fill: '#222' }, trG); E('circle', { cx: 440, cy: 88, r: 3, fill: '#222' }, trG);
    }
    const pP = new Lab.Plot($('#d3plotP'), { xlabel: 'n', ylabel: 'P_L (W)' }), pE = new Lab.Plot($('#d3plotE'), { xlabel: 'n', ylabel: 'η (%)' });
    let cur = {}, last = '';
    function compute() { cur = Object.assign(tx(S.d3conn, kN.value, S.d3RL), { conn: S.d3conn, RL: S.d3RL }); return cur; }
    function drawPlots(c) {
      const sP = [], sE = [], th = $('#d3theo').checked;
      if (th) ['i', 'g'].forEach((cn) => { const a = [], b = []; for (let n = 1; n <= 30; n += 0.25) { const r = tx(cn, n, c.RL); a.push([n, r.PL]); b.push([n, 100 * r.eta]); } const col = cn === 'i' ? '#1a8a4a' : '#7a4bb5'; sP.push({ pts: a, line: true, color: col, dash: cn === 'g' ? [6, 4] : null }); sE.push({ pts: b, line: true, color: col, dash: cn === 'g' ? [6, 4] : null }); });
      const L = S.d3rows.filter((r) => r.RL === c.RL);
      sP.push({ pts: L.map((r) => [r.n, r.PL]), dots: true, color: '#0b5cad' }); sE.push({ pts: L.map((r) => [r.n, 100 * r.eta]), dots: true, color: '#0b5cad' });
      sP.push({ pts: [[c.n, c.PL]], dots: true, color: '#c62828' }); sE.push({ pts: [[c.n, 100 * c.eta]], dots: true, color: '#c62828' });
      pP.draw(sP, [0, 30], [0, 0.6]); pE.draw(sE, [0, 30], [0, 100]);
    }
    function update() {
      const c = compute(); drawTr();
      wL(num(c.PL, 4)); wI(num(c.Pi, 4)); wT(num(c.Ptr, 4)); aI(num(c.I1 * 1000, 2));
      tN.textContent = c.conn === 'd' ? 'doğrudan bağlı' : `${c.conn === 'i' ? 'ideal' : 'gerçek'} trafo ${num(c.n, 1)} : 1`;
      tRL.textContent = `R_L = ${c.RL} Ω`;
      const key = [c.conn, c.n, c.RL, S.d3rows.length, $('#d3theo').checked].join('|');
      if (key !== last) { last = key; drawPlots(c); }
    }
    const CN = { d: 'doğrudan', i: 'ideal trafo', g: 'gerçek trafo' };
    const tbody = $('#d3tab tbody');
    function table() {
      tbody.innerHTML = S.d3rows.map((r, i) => `<tr><td>${i + 1}</td><td class="l">${CN[r.conn]}</td><td>${num(r.n, 1)}</td><td>${r.RL}</td><td>${num(r.I1 * 1000, 2)}</td><td>${num(r.PL, 4)}</td><td>${num(r.Pi, 4)}</td><td>${num(r.Ptr, 4)}</td><td>${num(100 * r.eta, 1)}</td></tr>`).join('');
      tbody.parentElement.parentElement.scrollTop = 1e6;
    }
    function rec() { const c = compute(); S.d3rows.push({ conn: c.conn, n: c.n, RL: c.RL, I1: c.I1, PL: c.PL, Pi: c.Pi, Ptr: c.Ptr, eta: c.eta }); save(); table(); Lab.toast(`Kaydedildi: P_L = ${num(c.PL, 4)} W`); }
    $('#d3rec').onclick = rec;
    $('#d3del').onclick = () => { S.d3rows.pop(); save(); table(); };
    $('#d3csv').onclick = () => Lab.downloadCSV('hafta11_deney3.csv', ['#', 'baglanti', 'n', 'RL', 'I1 (A)', 'PL (W)', 'Pic (W)', 'Ptrafo (W)', 'verim'], S.d3rows.map((r, i) => [i + 1, CN[r.conn], r.n, r.RL, +r.I1.toFixed(6), +r.PL.toFixed(6), +r.Pi.toFixed(6), +r.Ptr.toFixed(6), +r.eta.toFixed(4)]));
    table();
    return { update, rec, cP: $('#d3plotP'), cE: $('#d3plotE') };
  })();

  let realBest = 0; for (let n = 1; n <= 30; n += 0.01) realBest = Math.max(realBest, tx('g', n, 8).PL);
  steps('d3', [
    { t: '8 Ω hoparlörü <b>doğrudan</b> bağlayıp kaydedin (<kbd>R</kbd>). Gücün ne kadarı kaynağın iç direncinde kalıyor?', test: () => S.d3rows.some((r) => r.conn === 'd' && r.RL === 8) },
    { t: '<b>İdeal trafo</b> ile n’yi hesaplayıp ayarlayın: P<sub>L</sub> en büyük değerinin %99’una ulaşsın, kaydedin.', test: () => S.d3rows.some((r) => r.conn === 'i' && r.RL === 8 && r.PL >= 0.99 * 0.5) },
    { t: 'İdeal trafoda, 8 Ω için <b>en az 6 farklı n</b> kaydedip kuramsal eğrileri açın. Tepe ne kadar yassı?', test: () => new Set(S.d3rows.filter((r) => r.conn === 'i' && r.RL === 8).map((r) => r.n)).size >= 6 && $('#d3theo').checked },
    { t: 'Verimi <b>%80’in üzerine</b> çıkaran bir n ile kaydedin. Hoparlör gücü ne oldu?', test: () => S.d3rows.some((r) => r.conn === 'i' && r.eta >= 0.8) },
    { t: '<b>Gerçek trafo</b> ile (8 Ω) en büyük gücü bulup (%99) kaydedin. En iyi n değişti mi?', test: () => S.d3rows.some((r) => r.conn === 'g' && r.RL === 8 && r.PL >= 0.99 * realBest) },
    { t: 'Soruları yanıtlayın.', test: () => qok(['d3q1', 'd3q2', 'd3q3', 'd3q4']) },
  ]);
  numq('d3', '#d3Q', { id: 'd3q1', q: 'Örnek 2.25a: 8 Ω hoparlör doğrudan bağlanınca hoparlör gücü kaç mW’tır?', answer: (40 / 808) ** 2 * 8 * 1000, tol: 1.5, unit: 'mW', explain: 'I = 40/808 = 49,5 mA; P = I² × 8 = 19,6 mW. Kaynak içinde 1,96 W yanıyor (η ≈ %1).', hint: 'Seri çevrim: 800 + 8 Ω.' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'Örnek 2.25b: İdeal trafo ile hoparlöre aktarılabilecek en büyük güç kaç W’tır?', answer: 0.5, tol: 1, unit: 'W', explain: 'P<sub>maks</sub> = 40²/(4 × 800) = 0,5 W; doğrudan bağlantının 25 katından fazla.', hint: 'Uyumda P = V<sub>Th</sub>²/(4R<sub>Th</sub>).' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'Uyum noktasında verim yüzde kaçtır (ideal trafo)?', answer: 50, tol: 1, unit: '%', explain: 'n²R<sub>L</sub> = R<sub>Th</sub> → η = R<sub>Th</sub>/(2R<sub>Th</sub>) = %50. P<sub>L</sub> ile P<sub>iç</sub>’in eşit olduğunu tablodan görün.', hint: 'P<sub>L</sub> ve P<sub>iç</sub> sütunlarını karşılaştırın.' });
  numq('d3', '#d3Q', { id: 'd3q4', q: 'n = 20 (ideal trafo, 8 Ω) iken hoparlör gücü kaç W’tır?', answer: (40 * 40 * 3200) / 4000 ** 2, tol: 1.5, unit: 'W', explain: 'R’ = 400 × 8 = 3200 Ω; P = 40² × 3200/4000² = 0,32 W; η = 3200/4000 = %80.', hint: 'R’ = n²R<sub>L</sub>, P = V²R’/(R<sub>Th</sub> + R’)².' });
  numq('d3', '#d3Q', { id: 'd3q5', q: '4 Ω’luk hoparlör için uyum oranı n kaç olmalıdır?', answer: Math.sqrt(200), tol: 1.5, unit: '', explain: 'n = √(800/4) = 14,14.', hint: 'n = √(R<sub>Th</sub>/R<sub>L</sub>).' });
  mcq('d3', '#d3Q', { id: 'd3q6', q: 'Elektrik santralleri ve şebeke neden maksimum güç transferi koşulunda çalıştırılmaz?', opts: ['Çünkü güç sistemlerinde reaktans yoktur', 'Uyumda verim %50’dir; üretilen enerjinin yarısı kaynak ve hatlarda ısıya dönüşürdü. Güç sistemlerinde verim, işaret devrelerinde güç önceliklidir', 'Çünkü yasaktır', 'Çünkü maksimum güç yalnız DC’de tanımlıdır'], correct: 1, explain: 'Şebekede R<sub>yük</sub> ≫ R<sub>kaynak</sub>; verim %95 üzeridir. Haberleşme ve sensör devrelerinde ise zayıf sinyalin en çok gücünü almak önemlidir.', hint: 'η = R<sub>L</sub>/(R<sub>Th</sub>+R<sub>L</sub>).' });

  /* ================= RAPOR ================= */
  function buildReport() {
    const sec = { onhaz: 'Ön Hazırlık', d1: 'Deney 1', d2: 'Deney 2', d3: 'Deney 3' };
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
      <h2 style="margin:0">Devre Kuramı II · Sanal Laboratuvar · Hafta 11 Raporu</h2>
      <p><b>Konu:</b> Maksimum güç transferi, kısıtlı yükler, trafo ile uydurma ve verim</p>
      <table class="data" style="width:auto"><tr><th>Ad Soyad</th><td class="l">${S.st.name || ''}</td><th>No</th><td class="l">${S.st.no || ''}</td><th>Grup</th><td class="l">${S.st.group || ''}</td><th>Tarih</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Özet</h3>
      <p>Tamamlanan föy adımı: <b>${sOk}/${sTot}</b> · Doğru yanıt: <b>${ok}/${tot}</b> · Puan: <b>${Math.round((50 * sOk) / sTot + (50 * ok) / tot)}/100</b></p>
      <h3>Yanıtlar</h3>
      <table class="data"><thead><tr><th>Bölüm</th><th>Soru</th><th>Yanıt</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Deney 1 · P<sub>L</sub> yüzeyi</h3>${tb('#d1tab')}
      <h3>Deney 2 · Kısıtlı yükler</h3>${tb('#d2tab')}
      <h3>Deney 3 · Trafo ve verim</h3>${tb('#d3tab')}
      <h3>Grafikler</h3>
      <div>${img(D1.mapCanvas)} ${img(D2.plotCanvas)}</div>
      <div>${img(D3.cP)} ${img(D3.cE)}</div>
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
    if (e.altKey && /^[0-6]$/.test(e.key)) { go(pages[+e.key]); e.preventDefault(); return; }
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.key === '?') $('#helpModal').classList.add('show');
    if (e.key === 'r' || e.key === 'R') { if (S.page === 'd1') D1.rec(); if (S.page === 'd2') D2.rec(); if (S.page === 'd3') D3.rec(); }
  });

  function loop() {
    if (S.page === 'onbilgi') OB.draw();
    if (S.page === 'd1') { D1.update(); evalSteps('d1'); }
    if (S.page === 'd2') { D2.update(); evalSteps('d2'); }
    if (S.page === 'd3') { D3.update(); evalSteps('d3'); }
    requestAnimationFrame(loop);
  }
  ['d1', 'd2', 'd3'].forEach(evalSteps);
  go(S.page); progress(); loop();
})();

/* Devre Kuramı II · Hafta 9 — RMS Değer ve Kompleks Güç */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd2h09';
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

  /* ---------- dalga biçimleri (tepe 1, faz 0..1) ---------- */
  const WAVES = {
    sin: { n: 'Sinüs', k: 1, f: (p) => Math.sin(2 * Math.PI * p) },
    kare: { n: 'Kare', k: 2, f: (p) => (p < 0.5 ? 1 : -1) },
    ucgen: { n: 'Üçgen', k: 3, f: (p) => 1 - 4 * Math.abs(p - 0.5) },
    yarim: { n: 'Yarım dalga', k: 4, f: (p) => Math.max(0, Math.sin(2 * Math.PI * p)) },
    tam: { n: 'Tam dalga', k: 5, f: (p) => Math.abs(Math.sin(2 * Math.PI * p)) },
  };
  const THEO = { sin: Math.SQRT1_2, kare: 1, ucgen: 1 / Math.sqrt(3), yarim: 0.5, tam: Math.SQRT1_2 };
  Object.values(WAVES).forEach((w) => {
    const N = 4000; let m = 0, ms = 0;
    for (let i = 0; i < N; i++) { const v = w.f((i + 0.5) / N); m += v; ms += v * v; }
    m /= N; ms /= N; let ma = 0;
    for (let i = 0; i < N; i++) ma += Math.abs(w.f((i + 0.5) / N) - m);
    Object.assign(w, { mean: m, ms, mabs: ma / N });
  });

  /* ================= ÖN BİLGİ ================= */
  const OB = (() => {
    let wave = 'sin', t0 = performance.now();
    segBtns($('#obWave'), [['sin', 'Sinüs'], ['kare', 'Kare'], ['ucgen', 'Üçgen'], ['yarim', 'Yarım dalga']], wave, (v) => { wave = v; t0 = performance.now(); });
    const cv = $('#obRms'), g = cv.getContext('2d');
    function draw() {
      const Wd = cv.width, H = cv.height, L = 40, R = 10, y0 = H / 2 + 20, sy = 80;
      const w = WAVES[wave], per = 2, dur = 5000;
      const u = ((performance.now() - t0) % (dur + 1500)) / dur, cur = Math.min(1, u);
      g.fillStyle = '#fff'; g.fillRect(0, 0, Wd, H);
      const X = (x) => L + (x / per) * (Wd - L - R), Y = (v) => y0 - v * sy;
      g.strokeStyle = '#d8dde6'; g.lineWidth = 1;
      [-1, 0, 1].forEach((v) => { g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(Wd - R, Y(v)); g.stroke(); });
      g.fillStyle = '#556'; g.font = '11px Segoe UI'; g.textAlign = 'right';
      g.fillText('+V_m', L - 4, Y(1) + 4); g.fillText('0', L - 4, Y(0) + 4); g.fillText('−V_m', L - 4, Y(-1) + 4);
      const plotF = (fn, col, upto) => { g.strokeStyle = col; g.lineWidth = 2.2; g.beginPath(); for (let i = 0; i <= 600; i++) { const x = (i / 600) * per; if (x > upto) break; const v = fn(x % 1); i ? g.lineTo(X(x), Y(v)) : g.moveTo(X(x), Y(v)); } g.stroke(); };
      plotF(w.f, '#0b5cad', per);
      g.globalAlpha = 0.9; plotF((p) => w.f(p) ** 2, '#e07a10', per * cur); g.globalAlpha = 1;
      // birikmiş ortalama
      const n = Math.max(1, Math.round(cur * 2000)); let acc = 0;
      for (let i = 0; i < n; i++) acc += w.f(((i + 0.5) / 2000 * per) % 1) ** 2;
      const msr = acc / n, rms = Math.sqrt(msr);
      g.setLineDash([6, 4]); g.strokeStyle = '#e07a10'; g.beginPath(); g.moveTo(L, Y(msr)); g.lineTo(X(per * cur), Y(msr)); g.stroke(); g.setLineDash([]);
      g.strokeStyle = '#1a8a4a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(L, Y(rms)); g.lineTo(X(per * cur), Y(rms)); g.stroke();
      g.strokeStyle = '#7a4bb5'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X(per * cur), 10); g.lineTo(X(per * cur), H - 10); g.stroke();
      g.textAlign = 'left'; g.font = '12px Segoe UI';
      g.fillStyle = '#0b5cad'; g.fillText('v(t)', L + 6, 16);
      g.fillStyle = '#e07a10'; g.fillText('v²(t) ve ortalaması (kesik)', L + 50, 16);
      g.fillStyle = '#1a8a4a'; g.fillText('√ortalama = V_rms', L + 240, 16);
      $('#obRmsTxt').innerHTML = `İmlecin süpürdüğü bölümde: ortalama v² = <b>${num(msr, 3)}</b> V<sub>m</sub>², karekökü = <b>${num(rms, 3)}</b> V<sub>m</sub>. Tam periyotlarda ortalamanın nereye yerleştiğini izleyin.`;
    }
    function tri() {
      const P = +$('#obP').value, Q = +$('#obQ').value;
      const { Sm, th } = powerTri($('#obTri'), P, Q);
      const pf = Sm > 0 ? P / Sm : 1;
      $('#obTriTxt').innerHTML = `S = ${num(P, 1)} ${Q < 0 ? '−' : '+'} j${num(Math.abs(Q), 1)} → |S| = ${num(Sm, 2)}, θ = ${num((th * 180) / Math.PI, 1)}°, pf = ${num(pf, 3)} ${Math.abs(Q) < 1e-9 ? '(birim)' : Q > 0 ? '<b>geri</b> (endüktif)' : '<b>ileri</b> (kapasitif)'}`;
    }
    $('#obP').oninput = tri; $('#obQ').oninput = tri; tri();
    return { draw };
  })();

  /* ================= ÖN HAZIRLIK ================= */
  numq('onhaz', '#preQ', { id: 'p1', q: '1) Örnek 2.9: Tepe değeri V<sub>m</sub> = 625 V olan sinüs gerilim R = 50 Ω’a uygulanıyor. Ortalama güç kaç W’tır?', answer: 3906.25, unit: 'W', explain: 'V<sub>rms</sub> = 625/√2 = 441,94 V; P = 441,94²/50 = 3906,25 W. (7812,5 W anlık gücün tepesidir.)', hint: 'Önce rms’e çevirin; V<sub>m</sub>²/R değil V<sub>m</sub>²/(2R).' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) Örnek 2.10: Etiketi 230 V, 1500 W olan saf dirençli ısıtıcının direnci kaç Ω’dur?', answer: 230 * 230 / 1500, unit: 'Ω', explain: 'R = V<sub>rms</sub>²/P = 52 900/1500 = 35,27 Ω; I<sub>rms</sub> = 6,52 A.', hint: 'Etiket değerleri rms ve ortalama güçtür: P = V²/R.' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) Aynı ısıtıcıda anlık gücün tepe değeri p<sub>max</sub> kaç W’tır?', answer: 3000, unit: 'W', explain: 'p = V<sub>m</sub>I<sub>m</sub>cos²ωt; tepe V<sub>m</sub>I<sub>m</sub> = 2 V<sub>rms</sub>I<sub>rms</sub> = 2P = 3000 W.', hint: 'Dirençte p(t) = P(1 + cos2ωt).' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) Örnek 2.12: 240 V, P = 8 kW, pf = 0,8 geri. Yük empedansının <b>gerçel kısmı</b> (seri R) kaç Ω’dur?', answer: 4.608, unit: 'Ω', explain: 'S = 8 + j6 kVA; Z = V²/S* = 57 600/(8000 − j6000) = 4,608 + j3,456 Ω.', hint: 'Z = V<sub>rms</sub>²/S* ya da I = |S|/V ve R = P/I².' });
  numq('onhaz', '#preQ', { id: 'p5', q: '5) Örnek 2.14: v = 200cos(ωt+30°) V, i = 5cos(ωt−15°) A. Ortalama güç P kaç W’tır?', answer: 353.55, unit: 'W', explain: 'P = ½V<sub>m</sub>I<sub>m</sub>cos(30°−(−15°)) = 500 × 0,7071 = 353,6 W; Q da 353,6 VAR (endüktif).', hint: 'Tepe değerler verildi: ½ çarpanını unutmayın; θ = θ<sub>v</sub> − θ<sub>i</sub>.' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) Örnek 2.15: 230 V altındaki bir yük S = 3 − j4 kVA çekiyor. Hangisi doğrudur?', opts: ['pf = 0,6 geri, yük endüktif', 'pf = 0,6 ileri, yük kapasitif', 'pf = 0,8 ileri, yük kapasitif', 'pf = 0,75, yük dirençsel'], correct: 1, explain: '|S| = 5 kVA, cos θ = 3/5 = 0,6; Q &lt; 0 → akım ileride, yük kapasitif. Z = 10,58∠−53,13° Ω.', hint: 'Q’nun işareti yükün türünü söyler.' });

  /* ================= DENEY 1 · Dalga biçimi ve rms ================= */
  const D1 = (() => {
    const box = $('#d1inst');
    const fg = inst(box, 'FONKSİYON ÜRETECİ', true, '50 Ω çıkış'); const fgL = lcd(fg.el, 'FREKANS', 'Hz', 140);
    S.d1w = S.d1w || 'sin';
    segBtns(fg.c, Object.entries(WAVES).map(([k, w]) => [k, w.n]), S.d1w, (v) => { S.d1w = v; save(); });
    const kA = new Lab.Knob(fg.c, { label: 'Genlik Vm', min: 0, max: 20, step: 0.1, value: S.d1A ?? 5, dark: true, fmt: (v) => num(v, 1) + ' V', onChange: (v) => { S.d1A = v; save(); } });
    const kO = new Lab.Knob(fg.c, { label: 'DC kayma', min: -5, max: 5, step: 0.1, value: S.d1O ?? 0, dark: true, fmt: (v) => num(v, 1) + ' V', onChange: (v) => { S.d1O = v; save(); } });
    const kF = new Lab.Knob(fg.c, { label: 'Frekans', min: 10, max: 20000, log: true, value: S.d1F ?? 50, dark: true, fmt: (v) => eng(v, 'Hz', 3), onChange: (v) => { S.d1F = v; save(); } });
    const ld = inst(box, 'YÜK + WATTMETRE', false); const pL = lcd(ld.el, 'P<sub>R</sub> (ortalama)', 'W', 120);
    const kR = new Lab.Knob(ld.c, { label: 'R yük', min: 10, max: 2000, log: true, value: S.d1R ?? 1000, fmt: (v) => Lab.ohm(v), onChange: (v) => { S.d1R = v; save(); } });
    const m1 = inst(box, 'TRMS MULTİMETRE', false, 'gerçek rms'); const m1L = lcd(m1.el, 'V~ rms', 'V', 130);
    S.d1cpl = S.d1cpl || 'ac';
    segBtns(m1.c, [['ac', 'AC'], ['acdc', 'AC+DC']], S.d1cpl, (v) => { S.d1cpl = v; save(); });
    const m2 = inst(box, 'ORT. DUYARLI MULTİMETRE', false, 'ucuz'); const m2L = lcd(m2.el, 'V~ (sinüse kalibre)', 'V', 130);

    // osiloskop
    const scope = new Lab.Scope($('#d1scope'));
    scope.ch[0].vdiv = 5; scope.ch[1].vdiv = 0.2; scope.ch[1].pos = -2; scope.tdiv = 5e-3;
    const sk = $('#d1scopeKnobs');
    const VL = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10];
    new Lab.Knob(sk, { label: 'CH1 V/div', list: VL, value: 5, dark: true, size: 44, fmt: (v) => eng(v, 'V'), onChange: (v) => (scope.ch[0].vdiv = v) });
    new Lab.Knob(sk, { label: 'MATH W/div', list: [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2], value: 0.2, dark: true, size: 44, fmt: (v) => eng(v, 'W'), onChange: (v) => (scope.ch[1].vdiv = v) });
    new Lab.Knob(sk, { label: 'Zaman/div', list: [1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2, 2e-2], value: 5e-3, dark: true, size: 44, fmt: (v) => eng(v, 's'), onChange: (v) => (scope.tdiv = v) });

    // şema
    const g = $('#d1sch');
    sch.src(g, 70, 115); sch.t(g, 70, 160, 'üreteç', 'lbl');
    sch.w(g, [[70, 95], [70, 50], [110, 50]]); sch.rH(g, 110, 190, 50); sch.t(g, 150, 35, '50 Ω (iç)');
    sch.w(g, [[190, 50], [620, 50]]); sch.w(g, [[70, 135], [70, 180], [620, 180]]);
    sch.dot(g, 300, 50); sch.dot(g, 300, 180); sch.rV(g, 300, 50, 180); const tR = sch.t(g, 314, 120, 'R', 'lbl', 'start');
    [[420, 'V', 'TRMS'], [520, 'V', 'ORT']].forEach(([x, s, l]) => { sch.dot(g, x, 50); sch.dot(g, x, 180); sch.w(g, [[x, 50], [x, 100]]); sch.meter(g, x, 115, s); sch.w(g, [[x, 130], [x, 180]]); sch.t(g, x + 20, 120, l, 'lbl', 'start'); });
    sch.t(g, 640, 55, 'CH1', 'lbl', 'start'); sch.gnd(g, 620, 180);
    const tV = sch.t(g, 300, 205, '', 'val');

    const plot = new Lab.Plot($('#d1plot'), { xlabel: 'dalga biçimi (1 sinüs … 5 tam dalga)', ylabel: 'okunan / V_m' });
    let cur = {};
    function compute() {
      const w = WAVES[S.d1w], R = kR.value, kk = R / (R + 50);
      const a = kA.value * kk, d = kO.value * kk, f = kF.value;
      const mean = a * w.mean + d, ms = a * a * w.ms + 2 * a * d * w.mean + d * d;
      const acr = a * Math.sqrt(Math.max(0, w.ms - w.mean * w.mean));
      const trms = (S.d1cpl === 'acdc' ? Math.sqrt(ms) : acr) / Math.sqrt(1 + (f / 1e5) ** 2);
      const avg = (1.1107 * a * w.mabs) / Math.sqrt(1 + (f / 2000) ** 2);
      cur = { w: S.d1w, vm: a, off: d, f, trms, cpl: S.d1cpl, avg, p: ms / R, R, mean };
      return cur;
    }
    function update() {
      const c = compute(), w = WAVES[c.w];
      fgL(eng(c.f, '', 4).trim());
      m1L(num(c.trms, 3)); m2L(num(c.avg, 3)); pL(c.p < 1 ? num(c.p * 1e3, 1) : num(c.p, 3), c.p < 1 ? 'mW' : 'W');
      tR.textContent = 'R = ' + Lab.ohm(c.R);
      tV.textContent = `yükte: ${w.n}, tepe ${num(c.vm, 2)} V, DC ${num(c.off, 2)} V`;
      const n = 800, T = scope.tdiv * 10, y1 = new Float64Array(n), y2 = new Float64Array(n);
      for (let i = 0; i < n; i++) { const t = (i / (n - 1)) * T, ph = (t * c.f) % 1, v = c.vm * w.f(ph) + c.off; y1[i] = v; y2[i] = (v * v) / c.R; }
      scope.draw({ n, y: [y1, y2] });
      const m = scope.measure(), m1 = m.ch[0];
      $('#d1scopeMeas').innerHTML = `CH1 Vpp ${num(m1.vpp, 2)} V<br>CH1 maks ${num(m1.max, 2)} V<br>CH1 f ${isFinite(m1.f) ? eng(m1.f, 'Hz') : '—'}<br>MATH maks ${eng(m.ch[1].max, 'W')}`;
    }
    const tbody = $('#d1tab tbody');
    function table() {
      tbody.innerHTML = S.d1rows.map((r, i) => `<tr><td>${i + 1}</td><td class="l">${WAVES[r.w].n}</td><td>${num(r.vm, 2)}</td><td>${num(r.off, 2)}</td><td>${eng(r.f, '', 3)}</td><td>${num(r.trms, 3)}</td><td>${r.cpl === 'ac' ? 'AC' : 'AC+DC'}</td><td>${num(r.avg, 3)}</td><td>${num(r.p, 4)}</td></tr>`).join('');
      tbody.parentElement.parentElement.scrollTop = 1e6;
      drawPlot();
    }
    function drawPlot() {
      const L = S.d1rows.filter((r) => Math.abs(r.off) < 0.01 && r.vm > 0.05);
      const ser = [];
      if ($('#d1theo').checked) Object.entries(THEO).forEach(([k, v]) => ser.push({ pts: [[WAVES[k].k - 0.35, v], [WAVES[k].k + 0.35, v]], line: true, color: '#1a8a4a', dash: [5, 4] }));
      ser.push({ pts: L.map((r) => [WAVES[r.w].k - 0.08, r.trms / r.vm]), dots: true, color: '#0b5cad' });
      ser.push({ pts: L.map((r) => [WAVES[r.w].k + 0.08, r.avg / r.vm]), dots: true, color: '#e07a10' });
      plot.draw(ser, [0.5, 5.5], [0, 1.25]);
    }
    $('#d1theo').onchange = drawPlot;
    function rec() { const c = compute(); S.d1rows.push({ w: c.w, vm: c.vm, off: c.off, f: c.f, trms: c.trms, cpl: c.cpl, avg: c.avg, p: c.p }); save(); table(); Lab.toast(`Kaydedildi: ${WAVES[c.w].n}, TRMS ${num(c.trms, 3)} V, ort. duyarlı ${num(c.avg, 3)} V`); }
    $('#d1rec').onclick = rec;
    $('#d1del').onclick = () => { S.d1rows.pop(); save(); table(); };
    $('#d1csv').onclick = () => Lab.downloadCSV('hafta9_deney1.csv', ['#', 'dalga', 'Vm (V)', 'VDC (V)', 'f (Hz)', 'TRMS (V)', 'kuplaj', 'ort. duyarli (V)', 'P (W)'], S.d1rows.map((r, i) => [i + 1, WAVES[r.w].n, +r.vm.toFixed(4), +r.off.toFixed(4), +r.f.toFixed(2), +r.trms.toFixed(4), r.cpl, +r.avg.toFixed(4), +r.p.toFixed(6)]));
    table();
    return { update, rec, cur: () => cur, plotCanvas: $('#d1plot'), scopeCanvas: $('#d1scope') };
  })();

  const d1has = (fn) => S.d1rows.some(fn);
  steps('d1', [
    { t: '<b>Sinüs</b>, genlik 10 V, DC kayma 0, f = 50 Hz, R = 1 kΩ. Osiloskopta yükteki tepe değeri okuyun (iç direnç yüzünden 10 V’tan biraz azdır), iki multimetreyi karşılaştırıp kaydedin (<kbd>R</kbd>).', test: () => d1has((r) => r.w === 'sin' && Math.abs(r.off) < 0.01 && r.vm > 5 && r.f < 200) },
    { t: 'Aynı genlikte <b>kare</b> dalgaya geçip kaydedin. Hangi ölçer değişti, hangisi “yanıldı”?', test: () => d1has((r) => r.w === 'kare' && Math.abs(r.off) < 0.01 && r.vm > 5 && r.f < 200) },
    { t: '<b>Üçgen</b> dalgayı kaydedin. Okunan/V<sub>m</sub> grafiğinde kuramsal çizgiyi açıp karşılaştırın.', test: () => d1has((r) => r.w === 'ucgen' && Math.abs(r.off) < 0.01 && r.vm > 5 && r.f < 200) },
    { t: '<b>Yarım dalga</b> doğrultulmuş sinyali TRMS ölçer <b>AC+DC</b> kuplajındayken kaydedin, sonra <b>AC</b> kuplajında bir kez daha kaydedin. Fark neden var?', test: () => d1has((r) => r.w === 'yarim' && r.cpl === 'acdc' && r.f < 200) && d1has((r) => r.w === 'yarim' && r.cpl === 'ac' && r.f < 200) },
    { t: 'Sinüse <b>en az 2 V DC kayma</b> ekleyip AC+DC kuplajda kaydedin; √(V<sub>DC</sub>² + V<sub>ac</sub>²) ile karşılaştırın.', test: () => d1has((r) => r.w === 'sin' && Math.abs(r.off) >= 1.8 && r.cpl === 'acdc') },
    { t: 'Sinüsün frekansını <b>≥ 5 kHz</b> yapıp kaydedin: ortalama duyarlı ölçerin bant genişliği sınırını görün.', test: () => d1has((r) => r.w === 'sin' && r.f >= 5000) },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: 'Tepe değeri 10 V, DC bileşeni sıfır olan <b>kare</b> dalgayı ortalama duyarlı ölçer kaç V gösterir (düşük frekans)?', answer: 11.107, tol: 1.5, unit: 'V', explain: 'Ortalama |v| = 10 V; ölçer 1,111 ile çarpar → 11,11 V. Gerçek rms 10 V: %11 fazla.', hint: 'Kare dalgada |v| her an V<sub>m</sub>’dir; ölçer bunu hangi sayıyla çarpıyor?' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'Tepe değeri 10 V olan <b>üçgen</b> dalgayı ortalama duyarlı ölçer kaç V gösterir?', answer: 5.554, tol: 1.5, unit: 'V', explain: 'Ortalama |v| = V<sub>m</sub>/2 = 5 V; × 1,111 = 5,55 V. Gerçek rms 5,77 V: %3,8 az.', hint: 'Üçgenin |v| ortalaması V<sub>m</sub>/2’dir.' });
  numq('d1', '#d1Q', { id: 'd1q3', q: 'Tepe değeri 10 V olan <b>yarım dalga</b> doğrultulmuş sinüsün toplam (AC+DC) rms değeri kaç V’tur?', answer: 5, tol: 1.5, unit: 'V', explain: 'Yarım periyot boyunca sinüs, yarım periyot sıfır: ortalama v² = V<sub>m</sub>²/4 → V<sub>rms</sub> = V<sub>m</sub>/2.', hint: 'Sinüsün v² ortalaması V<sub>m</sub>²/2 idi; yarısı sıfırsa?' });
  numq('d1', '#d1Q', { id: 'd1q4', q: 'Tepe 10 V sinüs + 3 V DC kayma. TRMS ölçer AC+DC kuplajda kaç V gösterir?', answer: Math.sqrt(9 + 50), tol: 1.5, unit: 'V', explain: '√(3² + 7,071²) = √59 = 7,68 V. AC kuplajda yalnız 7,07 V görülür.', hint: 'DC ve AC rms’leri karelerin toplamı olarak birleşir.' });
  mcq('d1', '#d1Q', { id: 'd1q5', q: 'Harmonik içeren (sinüs olmayan) bir akımı ölçmek için hangi ölçeri seçmelisiniz?', opts: ['Ortalama duyarlı ölçer; daha kararlıdır', 'Gerçek rms (TRMS) ölçer; tanımı doğrudan uygular', 'Hangisi olursa olsun, sonuç aynıdır', 'Tepe değeri ölçüp √2’ye bölmek yeterlidir'], correct: 1, explain: 'Biçim çarpanı yalnız sinüste 1,111’dir; TRMS ölçer v²’nin ortalamasını aldığı için dalga biçiminden bağımsızdır (CF ve bant sınırları içinde).', hint: 'Ortalama duyarlı ölçerin içindeki 1,111 çarpanı hangi dalga için doğru?' });
  mcq('d1', '#d1Q', { id: 'd1q6', q: '5 kHz’de ortalama duyarlı ölçerin okuması düştü, TRMS ölçerinki değişmedi. Neden?', opts: ['Sinyalin rms’i frekansla azalır', 'Ucuz ölçerin bant genişliği dardır; yüksek frekansı zayıflatır', 'Üretecin iç direnci frekansla artar', 'Osiloskop yüklemesi'], correct: 1, explain: 'Rms değer frekanstan bağımsızdır. Ucuz ölçerlerin AC bant genişliği tipik olarak 400 Hz–2 kHz’dir.', hint: 'Osiloskopta tepe değer değişti mi?' });

  /* ================= DENEY 2 · Kompleks güç ================= */
  const D2 = (() => {
    const box = $('#d2inst');
    const vs = inst(box, 'VARYAK + YALITIM TRAFOSU', true, '50 Hz'); const vsL = lcd(vs.el, 'ÇIKIŞ', 'V', 110);
    const kV = new Lab.Knob(vs.c, { label: 'Gerilim', min: 0, max: 250, step: 1, value: S.d2V ?? 0, dark: true, fmt: (v) => num(v, 0) + ' V', onChange: (v) => { S.d2V = v; save(); } });
    const lb = inst(box, 'R–L–C YÜK KUTUSU', false, 'seri');
    const kR = new Lab.Knob(lb.c, { label: 'R', min: 0.5, max: 100, log: true, value: S.d2R ?? 20, fmt: (v) => num(v, v < 10 ? 3 : 2) + ' Ω', onChange: (v) => { S.d2R = v; save(); } });
    const kL = new Lab.Knob(lb.c, { label: 'L', min: 0, max: 100, step: 0.1, value: S.d2L ?? 0, fmt: (v) => num(v, 1) + ' mH', onChange: (v) => { S.d2L = v; save(); } });
    const kC = new Lab.Knob(lb.c, { label: 'C (0 = yok)', min: 0, max: 1000, step: 1, value: S.d2C ?? 0, fmt: (v) => (v ? num(v, 0) + ' µF' : 'kısa'), onChange: (v) => { S.d2C = v; save(); } });
    const pa = inst(box, 'GÜÇ ANALİZÖRÜ', true, '1 faz');
    const L = {};
    [['V', 'V rms', 'V'], ['I', 'I rms', 'A'], ['P', 'P', 'W'], ['Q', 'Q', 'VAR'], ['S', '|S|', 'VA'], ['pf', 'pf', '']].forEach(([k, l, u]) => (L[k] = lcd(pa.el, l, u, 120)));

    const g = $('#d2sch');
    sch.src(g, 60, 120); sch.t(g, 60, 165, 'v<tspan font-size="10" dy="3">s</tspan>');
    sch.w(g, [[60, 100], [60, 50], [130, 50]]); sch.box(g, 130, 30, 70, 40, 'W · A'); sch.w(g, [[200, 50], [260, 50]]);
    sch.rH(g, 260, 350, 50); sch.w(g, [[350, 50], [380, 50]]); sch.lH(g, 380, 470, 50); sch.w(g, [[470, 50], [500, 50]]);
    sch.cH(g, 500, 560, 50); sch.w(g, [[560, 50], [640, 50], [640, 190], [60, 190], [60, 140]]);
    const tR = sch.t(g, 305, 30, 'R'), tL = sch.t(g, 425, 30, 'L'), tC = sch.t(g, 530, 30, 'C');
    const tZ = sch.t(g, 400, 120, '', 'val'), tI = sch.t(g, 230, 85, '', 'val');
    sch.t(g, 660, 120, 'yük', 'lbl', 'start');

    const plot = new Lab.Plot($('#d2pt'), { xlabel: 't (ms)', ylabel: 'p (kW)' });
    let cur = {};
    function compute() {
      const V = kV.value, R = kR.value, Lh = kL.value * 1e-3, Cf = kC.value * 1e-6;
      const X = W50 * Lh - (Cf > 0 ? 1 / (W50 * Cf) : 0), Z = [R, X];
      const I = Cx.div([V, 0], Z), Sc = Cx.mul([V, 0], Cx.conj(I));
      const Sm = Cx.abs(Sc), pf = Sm > 1e-12 ? Sc[0] / Sm : 1;
      cur = { V, R, L: kL.value, C: kC.value, Z, I, Im: Cx.abs(I), P: Sc[0], Q: Sc[1], Sm, pf };
      return cur;
    }
    const tur = (Q, Sm) => (Math.abs(Q) <= Sm * 0.005 ? 'dirençsel' : Q > 0 ? 'endüktif' : 'kapasitif');
    const pfTxt = (pf, Q, Sm) => num(pf, 3) + (Math.abs(Q) <= Sm * 0.005 ? '' : Q > 0 ? ' geri' : ' ileri');
    function update() {
      const c = compute();
      vsL(num(c.V, 0));
      L.V(num(c.V, 1)); L.I(num(c.Im, c.Im < 10 ? 3 : 2));
      const big = (x, u) => (Math.abs(x) >= 1000 ? [num(x / 1000, 3), 'k' + u] : [num(x, 1), u]);
      L.P(...big(c.P, 'W')); L.Q(...big(c.Q, 'VAR')); L.S(...big(c.Sm, 'VA')); L.pf(pfTxt(c.pf, c.Q, c.Sm));
      tR.textContent = 'R = ' + num(c.R, 3) + ' Ω'; tL.textContent = 'L = ' + num(c.L, 1) + ' mH'; tC.textContent = c.C ? 'C = ' + num(c.C, 0) + ' µF' : 'C kısa';
      tZ.textContent = `Z = ${num(c.Z[0], 3)} ${c.Z[1] < 0 ? '−' : '+'} j${num(Math.abs(c.Z[1]), 3)} Ω`;
      tI.textContent = `I = ${num(c.Im, 2)} A`;
      const th = Math.atan2(c.Q, c.P);
      const iN = Cx.sc(Cx.polar(0.8, (-th * 180) / Math.PI), 1);
      vecDiagram($('#d2fz'), [{ a: [0, 0], b: [1, 0], c: '#0b5cad', t: 'V', dy: 16 }, { a: [0, 0], b: iN, c: '#c62828', t: 'I', dx: 10 }], { square: true, theta: c.Sm > 1e-9 ? -th : null });
      powerTri($('#d2tri'), c.P, c.Q);
      // p(t)
      const pts = [], vv = [], ii = [], Imag = c.Im * Math.SQRT2, iA = Math.atan2(c.I[1], c.I[0]);
      let pm = 1e-9;
      for (let k = 0; k <= 300; k++) { const t = (k / 300) * 0.04, v = c.V * Math.SQRT2 * Math.cos(W50 * t), i = Imag * Math.cos(W50 * t + iA), p = (v * i) / 1000; pts.push([t * 1e3, p]); pm = Math.max(pm, Math.abs(p)); vv.push([t * 1e3, v]); ii.push([t * 1e3, i]); }
      const ser = [];
      if ($('#d2vi').checked) {
        const vm = c.V * Math.SQRT2 || 1, im = Imag || 1;
        ser.push({ pts: vv.map(([t, v]) => [t, (v / vm) * pm * 0.9]), line: true, color: '#9db8dd', width: 1.3 });
        ser.push({ pts: ii.map(([t, i]) => [t, (i / im) * pm * 0.9]), line: true, color: '#e6a3a3', width: 1.3 });
      }
      ser.push({ pts, line: true, color: '#1a8a4a', width: 2.5 });
      ser.push({ pts: [[0, c.P / 1000], [40, c.P / 1000]], line: true, color: '#0b5cad', dash: [6, 4] });
      plot.draw(ser, [0, 40], [-pm * 1.1, pm * 1.1]);
      // ipucu
      let h = '';
      if (c.V < 1) h = 'Varyak sıfırda. Gerilimi yavaşça artırın.';
      else if (near(c.V, 240, 1) && !S.steps.d2_1) {
        if (Math.abs(c.pf - 0.8) > 0.01 && rel(c.P, 8000, 0.05)) h = 'P yakın ama pf 0,8 değil: R ile X oranını değiştirin (tan θ = X/R = 0,75 olmalı).';
        else if (Math.abs(c.pf - 0.8) <= 0.01 && !rel(c.P, 8000, 0.02)) h = 'pf doğru ama P değil: R ve X’i <b>aynı oranda</b> büyütüp küçültün (|Z| = V²/|S|).';
        else if (rel(c.P, 8000, 0.02) && Math.abs(c.pf - 0.8) <= 0.01 && c.Q < 0) h = 'pf 0,8 ama <b>ileri</b>: “geri” endüktif demektir, C yerine L kullanın.';
      }
      $('#d2hint').innerHTML = h || 'İpucu: önce kâğıt üzerinde Z’yi hesaplayın, sonra R, L, C düğmelerini ayarlayın. Dokunup değer yazabilirsiniz.';
    }
    const tbody = $('#d2tab tbody');
    function table() {
      tbody.innerHTML = S.d2rows.map((r, i) => `<tr><td>${i + 1}</td><td>${num(r.V, 0)}</td><td>${num(r.R, 3)}</td><td>${num(r.L, 1)}</td><td>${r.C ? num(r.C, 0) : '—'}</td><td>${num(r.Im, 3)}</td><td>${num(r.P, 1)}</td><td>${num(r.Q, 1)}</td><td>${num(r.Sm, 1)}</td><td>${pfTxt(r.pf, r.Q, r.Sm)}</td><td class="l">${tur(r.Q, r.Sm)}</td></tr>`).join('');
      tbody.parentElement.parentElement.scrollTop = 1e6;
    }
    function rec() { const c = compute(); if (c.V < 1) return Lab.toast('Kaynak gerilimi sıfır: önce varyakı açın.'); S.d2rows.push({ V: c.V, R: c.R, L: c.L, C: c.C, Im: c.Im, P: c.P, Q: c.Q, Sm: c.Sm, pf: c.pf }); save(); table(); Lab.toast(`Kaydedildi: P = ${num(c.P, 1)} W, Q = ${num(c.Q, 1)} VAR`); }
    $('#d2rec').onclick = rec;
    $('#d2del').onclick = () => { S.d2rows.pop(); save(); table(); };
    $('#d2csv').onclick = () => Lab.downloadCSV('hafta9_deney2.csv', ['#', 'V', 'R (ohm)', 'L (mH)', 'C (uF)', 'I (A)', 'P (W)', 'Q (VAR)', 'S (VA)', 'pf'], S.d2rows.map((r, i) => [i + 1, r.V, +r.R.toFixed(4), r.L, r.C, +r.Im.toFixed(4), +r.P.toFixed(2), +r.Q.toFixed(2), +r.Sm.toFixed(2), +r.pf.toFixed(4)]));
    table();
    return { update, rec, plotCanvas: $('#d2pt') };
  })();

  const d2has = (fn) => S.d2rows.some(fn);
  steps('d2', [
    { t: 'Varyakı sıfırdan <b>230 V</b>’a getirin. L = 0, C = kısa iken (saf direnç) bir ölçüm kaydedin. Fazörde V ile I üst üste mi? p(t) hiç negatife iniyor mu?', test: () => d2has((r) => r.L === 0 && r.C === 0 && r.V > 200) },
    { t: '<b>Tasarım (Örnek 2.12):</b> 240 V’ta <b>P = 8 kW, pf = 0,8 geri</b> çeken seri R–L yükünü hesaplayıp kurun ve kaydedin.', test: () => d2has((r) => near(r.V, 240, 1) && rel(r.P, 8000, 0.02) && near(r.pf, 0.8, 0.01) && r.Q > 0) },
    { t: 'Kapasitif bir yük kurup (Q &lt; 0) kaydedin. Fazörde I hangi yöne döndü, üçgen hangi yöne açıldı?', test: () => d2has((r) => r.Q < -0.02 * r.Sm) },
    { t: '<b>Tasarım (Örnek 2.15):</b> 230 V’ta <b>S = 3 − j4 kVA</b> çeken seri R–C yükünü kurup kaydedin.', test: () => d2has((r) => near(r.V, 230, 1) && rel(r.P, 3000, 0.03) && rel(r.Q, -4000, 0.03)) },
    { t: 'L ve C’yi <b>birlikte</b> kullanarak pf ≥ 0,995 elde edip kaydedin (seri rezonansa yakın). Akım neden büyüdü?', test: () => d2has((r) => r.L > 0 && r.C > 0 && r.pf >= 0.995) },
    { t: 'Toplam <b>en az 5</b> ölçüm kaydedin ve her satırda |S|² = P² + Q² olduğunu kontrol edin.', test: () => S.d2rows.length >= 5 },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'Örnek 2.12 yükü için seri <b>L</b> kaç mH olmalıdır (50 Hz)?', answer: 3.456 / W50 * 1000, tol: 1.5, unit: 'mH', explain: 'X = 3,456 Ω → L = X/ω = 3,456/314,16 = 11,0 mH.', hint: 'Z = V²/S* ifadesinin sanal kısmını ω’ya bölün.' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'Örnek 2.12 yükünde kaynak akımı I<sub>rms</sub> kaç A’dir?', answer: 10000 / 240, tol: 1, unit: 'A', explain: 'I = |S|/V = 10 000/240 = 41,67 A.', hint: '|S| = P/pf.' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 'Örnek 2.15 yükünü seri R–C ile kurmak için C kaç µF olmalıdır (50 Hz)?', answer: 1e6 / (W50 * 0.8 * 230 * 230 / 5000), tol: 1.5, unit: 'µF', explain: '|Z| = 230²/5000 = 10,58 Ω; X = −10,58 × 0,8 = −8,464 Ω; C = 1/(ω × 8,464) = 376 µF. R = 6,348 Ω.', hint: 'Z = V²/S*; sanal kısmı −1/(ωC).' });
  mcq('d2', '#d2Q', { id: 'd2q4', q: 'Endüktif yükte p(t) eğrisi periyodun bir bölümünde <b>negatif</b> oluyor. Bu ne demektir?', opts: ['Ölçüm hatasıdır', 'O aralıkta yük, bobinde depoladığı enerjiyi kaynağa geri veriyor', 'Yük güç üretiyor, P &lt; 0', 'Akım sıfırdır'], correct: 1, explain: 'Ortalama (P) pozitif kalır; gidip gelen enerjinin genliği Q’dur. Saf dirençte p(t) hiç negatif olmaz.', hint: 'Bobin enerji depolar ve geri verir.' });
  mcq('d2', '#d2Q', { id: 'd2q5', q: 'Güç analizörü “pf = 0,8 geri” gösteriyor. Hangisi doğrudur?', opts: ['Akım gerilimden ileride, Q &lt; 0', 'Akım gerilimden geride, Q &gt; 0, yük endüktif', 'Yük kapasitif, Q &gt; 0', 'P negatif'], correct: 1, explain: '“Geri/ileri” akımın gerilime göre konumunu anlatır. S = 8 + j6 kVA.', hint: 'Fazör diyagramında I nerede?' });
  mcq('d2', '#d2Q', { id: 'd2q6', q: 'Aynı P’yi çeken iki yükten pf’si düşük olanın kaynak akımı için ne söylenebilir?', opts: ['Daha küçüktür', 'Aynıdır', 'Daha büyüktür: I = P/(V·pf)', 'pf akımı etkilemez'], correct: 2, explain: 'Düşük pf daha büyük akım, daha çok hat kaybı demektir. Hafta 10’da bunu kondansatörle düzelteceğiz.', hint: 'P = V I cos θ.' });

  /* ================= DENEY 3 · Paralel yükler ================= */
  const D3 = (() => {
    const box = $('#d3inst'), V0 = 240;
    const bar = inst(box, 'AC BARA', true, '50 Hz'); const barL = lcd(bar.el, 'BARA', 'V', 100);
    const kV = new Lab.Knob(bar.c, { label: 'Gerilim', min: 200, max: 250, step: 1, value: S.d3V ?? 240, dark: true, fmt: (v) => num(v, 0) + ' V', onChange: (v) => { S.d3V = v; save(); } });
    S.d3k = S.d3k || [true, false]; S.d3lag = S.d3lag || [true, true]; S.d3pt = S.d3pt || 'T';
    const loads = [0, 1].map((k) => {
      const b = inst(box, `YÜK ${k + 1}`, false, '240 V’ta tanımlı');
      const sw = document.createElement('button'); sw.className = 'seg-btn' + (S.d3k[k] ? ' on' : ''); sw.textContent = `K${k + 1} ${S.d3k[k] ? 'KAPALI (bağlı)' : 'AÇIK'}`; sw.style.width = '100%';
      sw.onclick = () => { S.d3k[k] = !S.d3k[k]; sw.classList.toggle('on', S.d3k[k]); sw.textContent = `K${k + 1} ${S.d3k[k] ? 'KAPALI (bağlı)' : 'AÇIK'}`; save(); };
      b.c.appendChild(sw);
      const kP = new Lab.Knob(b.c, { label: 'P', min: 0, max: 15, step: 0.1, value: (S.d3P || [])[k] ?? (k ? 2 : 5), fmt: (v) => num(v, 1) + ' kW', onChange: (v) => { (S.d3P = S.d3P || [5, 2])[k] = v; save(); } });
      const kF = new Lab.Knob(b.c, { label: 'pf', min: 0.1, max: 1, step: 0.01, value: (S.d3F || [])[k] ?? 0.9, fmt: (v) => num(v, 2), onChange: (v) => { (S.d3F = S.d3F || [0.9, 0.9])[k] = v; save(); } });
      segBtns(b.c, [['g', 'geri'], ['i', 'ileri']], S.d3lag[k] ? 'g' : 'i', (v) => { S.d3lag[k] = v === 'g'; save(); });
      return { kP, kF };
    });
    const pa = inst(box, 'GÜÇ ANALİZÖRÜ + PENS', true);
    segBtns(pa.c, [['T', 'Kaynak'], ['1', 'Yük 1'], ['2', 'Yük 2']], S.d3pt, (v) => { S.d3pt = v; save(); });
    const L = {};
    [['I', 'I rms', 'A'], ['P', 'P', 'kW'], ['Q', 'Q', 'kVAR'], ['S', '|S|', 'kVA'], ['pf', 'pf', '']].forEach(([k, l, u]) => (L[k] = lcd(pa.el, l, u, 120)));

    const g = $('#d3sch');
    sch.src(g, 60, 130); sch.w(g, [[60, 110], [60, 50], [110, 50]]); sch.box(g, 110, 32, 56, 36, 'P_T'); sch.w(g, [[166, 50], [600, 50]]);
    sch.w(g, [[60, 150], [60, 210], [600, 210]]);
    const swE = [], tLd = [];
    [[300, 0], [500, 1]].forEach(([x, k]) => {
      sch.dot(g, x, 50); sch.dot(g, x, 210);
      sch.w(g, [[x, 50], [x, 70]]); swE[k] = E('line', { x1: x, y1: 70, x2: x, y2: 95, class: 'w' }, g); E('circle', { cx: x, cy: 70, r: 3, fill: '#222' }, g); E('circle', { cx: x, cy: 95, r: 3, fill: '#222' }, g);
      sch.t(g, x - 12, 88, 'K' + (k + 1), 'lbl', 'end');
      sch.w(g, [[x, 95], [x, 120]]); sch.box(g, x - 40, 120, 80, 40, 'Yük ' + (k + 1)); sch.w(g, [[x, 160], [x, 210]]);
      tLd[k] = sch.t(g, x + 48, 145, '', 'val', 'start');
    });
    const pens = E('ellipse', { cx: 0, cy: 0, rx: 14, ry: 9, fill: 'none', stroke: '#d0480f', 'stroke-width': 3 }, g);
    const tV = sch.t(g, 60, 30, '', 'val', 'start');

    function loadS(k, V) {
      const P = loads[k].kP.value * 1000, pf = loads[k].kF.value, Q = (S.d3lag[k] ? 1 : -1) * P * Math.tan(Math.acos(pf));
      return Cx.sc([P, Q], (V / V0) ** 2);
    }
    let cur = {};
    function compute() {
      const V = kV.value;
      const S1 = S.d3k[0] ? loadS(0, V) : [0, 0], S2 = S.d3k[1] ? loadS(1, V) : [0, 0], ST = Cx.add(S1, S2);
      const Sp = S.d3pt === '1' ? S1 : S.d3pt === '2' ? S2 : ST, Sm = Cx.abs(Sp);
      cur = { V, S1, S2, ST, pt: S.d3pt, k1: S.d3k[0], k2: S.d3k[1], lag2: S.d3lag[1], P: Sp[0], Q: Sp[1], Sm, I: Sm / V, pf: Sm > 1e-9 ? Sp[0] / Sm : 1 };
      return cur;
    }
    const pfTxt = (pf, Q, Sm) => num(pf, 3) + (Math.abs(Q) <= Sm * 0.005 ? '' : Q > 0 ? ' geri' : ' ileri');
    function update() {
      const c = compute();
      barL(num(c.V, 0));
      L.I(num(c.I, 2)); L.P(num(c.P / 1000, 3)); L.Q(num(c.Q / 1000, 3)); L.S(num(c.Sm / 1000, 3)); L.pf(c.Sm > 1 ? pfTxt(c.pf, c.Q, c.Sm) : '—');
      [0, 1].forEach((k) => { const x = k ? 500 : 300; swE[k].setAttribute('x2', S.d3k[k] ? x : x + 18); tLd[k].textContent = S.d3k[k] ? '' : 'devre dışı'; });
      const pp = { T: [138, 90], 1: [300, 108], 2: [500, 108] }[c.pt]; pens.setAttribute('cx', c.pt === 'T' ? 200 : pp[0]); pens.setAttribute('cy', c.pt === 'T' ? 50 : pp[1]);
      tV.textContent = `bara ${num(c.V, 0)} V`;
      const k = 1 / 1000;
      vecDiagram($('#d3tri'), [
        { a: [0, 0], b: Cx.sc(c.S1, k), c: '#0b5cad', t: c.k1 ? 'S1' : '' },
        { a: Cx.sc(c.S1, k), b: Cx.sc(c.ST, k), c: '#e07a10', t: c.k2 ? 'S2' : '' },
        { a: [0, 0], b: Cx.sc(c.ST, k), c: '#1a8a4a', t: 'S_T', dash: '6 4', dy: 16 },
      ]);
      const I1 = Cx.conj(Cx.sc(c.S1, 1 / c.V)), I2 = Cx.conj(Cx.sc(c.S2, 1 / c.V)), IT = Cx.add(I1, I2);
      const mx = Math.max(Cx.abs(I1), Cx.abs(I2), Cx.abs(IT), 1e-9), n = (z) => Cx.sc(z, 1 / mx);
      vecDiagram($('#d3fz'), [
        { a: [0, 0], b: [1.1, 0], c: '#888', t: 'V', dy: 16, w: 2 },
        { a: [0, 0], b: n(I1), c: '#0b5cad', t: c.k1 ? 'I1' : '' },
        { a: n(I1), b: n(IT), c: '#e07a10', t: c.k2 ? 'I2' : '', dash: '5 4' },
        { a: [0, 0], b: n(IT), c: '#1a8a4a', t: 'I_T', dy: 16 },
      ], { square: true });
    }
    const PTN = { T: 'Kaynak', 1: 'Yük 1', 2: 'Yük 2' };
    const tbody = $('#d3tab tbody');
    function table() {
      tbody.innerHTML = S.d3rows.map((r, i) => `<tr><td>${i + 1}</td><td class="l">${PTN[r.pt]}</td><td>${r.k1 ? '●' : '○'}</td><td>${r.k2 ? '●' : '○'}</td><td>${num(r.V, 0)}</td><td>${num(r.I, 2)}</td><td>${num(r.P / 1000, 3)}</td><td>${num(r.Q / 1000, 3)}</td><td>${num(r.Sm / 1000, 3)}</td><td>${pfTxt(r.pf, r.Q, r.Sm)}</td></tr>`).join('');
      tbody.parentElement.parentElement.scrollTop = 1e6;
    }
    function rec() { const c = compute(); S.d3rows.push({ pt: c.pt, k1: c.k1, k2: c.k2, lag2: c.lag2, V: c.V, I: c.I, P: c.P, Q: c.Q, Sm: c.Sm, pf: c.pf }); save(); table(); Lab.toast(`Kaydedildi (${PTN[c.pt]}): P = ${num(c.P / 1000, 3)} kW, Q = ${num(c.Q / 1000, 3)} kVAR`); }
    $('#d3rec').onclick = rec;
    $('#d3del').onclick = () => { S.d3rows.pop(); save(); table(); };
    $('#d3csv').onclick = () => Lab.downloadCSV('hafta9_deney3.csv', ['#', 'pens', 'K1', 'K2', 'V', 'I (A)', 'P (W)', 'Q (VAR)', 'S (VA)', 'pf'], S.d3rows.map((r, i) => [i + 1, PTN[r.pt], r.k1 ? 1 : 0, r.k2 ? 1 : 0, r.V, +r.I.toFixed(3), +r.P.toFixed(1), +r.Q.toFixed(1), +r.Sm.toFixed(1), +r.pf.toFixed(4)]));
    table();
    return { update, rec };
  })();

  const d3has = (fn) => S.d3rows.some(fn);
  steps('d3', [
    { t: 'Yük 1’i <b>8 kW, pf 0,8 geri</b> yapın, K1’i kapatın, pensi <b>Yük 1</b>’e takıp 240 V’ta kaydedin (S<sub>1</sub> = 8 + j6 kVA beklenir).', test: () => d3has((r) => r.pt === '1' && r.k1 && near(r.V, 240, 0.5) && rel(r.P, 8000, 0.01) && rel(r.Q, 6000, 0.02)) },
    { t: 'Yük 2’yi <b>4 kW, pf 0,6 ileri</b> yapın, K2’yi kapatın, pensi <b>Yük 2</b>’ye takıp kaydedin.', test: () => d3has((r) => r.pt === '2' && r.k2 && near(r.V, 240, 0.5) && rel(r.P, 4000, 0.01) && rel(r.Q, -16000 / 3, 0.02)) },
    { t: 'İki yük bağlıyken pensi <b>Kaynak</b> hattına alıp kaydedin. P<sub>T</sub>, Q<sub>T</sub> ve |S<sub>T</sub>|’yi önceki iki satırla karşılaştırın.', test: () => d3has((r) => r.pt === 'T' && r.k1 && r.k2 && near(r.V, 240, 0.5) && rel(r.P, 12000, 0.01) && near(r.Q, 666.7, 150)) },
    { t: 'Yük 2’yi <b>geri</b> yapıp kaynaktan tekrar kaydedin. Toplam pf ve kaynak akımı nasıl değişti?', test: () => d3has((r) => r.pt === 'T' && r.k1 && r.k2 && r.lag2 && r.Q > 10000) },
    { t: 'Soruları yanıtlayın: |S<sub>1</sub>| + |S<sub>2</sub>| ile |S<sub>T</sub>| neden farklı?', test: () => qok(['d3q1', 'd3q2', 'd3q3']) },
  ]);
  numq('d3', '#d3Q', { id: 'd3q1', q: 'Örnek 2.13: Yük 2’nin (4 kW, 0,6 ileri) reaktif gücü Q<sub>2</sub> kaç kVAR’dır (işaretiyle)?', answer: -16 / 3, tol: 1.5, unit: 'kVAR', explain: '|S<sub>2</sub>| = 4/0,6 = 6,667 kVA; Q<sub>2</sub> = −√(6,667² − 4²) = −5,333 kVAR.', hint: 'İleri → kapasitif → Q &lt; 0.' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'Toplam görünür güç |S<sub>T</sub>| kaç kVA’dır?', answer: Math.hypot(12, 6 - 16 / 3), tol: 1, unit: 'kVA', explain: 'S<sub>T</sub> = 12 + j0,667 kVA → |S<sub>T</sub>| = 12,02 kVA.', hint: 'P ve Q’yu ayrı toplayın, sonra şiddeti alın.' });
  numq('d3', '#d3Q', { id: 'd3q3', q: '|S<sub>1</sub>| + |S<sub>2</sub>| aritmetik toplamı kaç kVA’dır? (Ölçülen |S<sub>T</sub>| ile karşılaştırın.)', answer: 10 + 20 / 3, tol: 1, unit: 'kVA', explain: '10 + 6,667 = 16,67 kVA; gerçek toplam yalnız 12,02 kVA. Q’lar birbirini götürdü.', hint: '|S<sub>1</sub>| = 10 kVA.' });
  numq('d3', '#d3Q', { id: 'd3q4', q: 'Örnek 2.13’te kaynak akımı I<sub>rms</sub> kaç A’dir?', answer: Math.hypot(12000, 2000 / 3) / 240, tol: 1, unit: 'A', explain: 'I = |S<sub>T</sub>|/V = 12 018/240 = 50,08 A; toplam pf = 12/12,02 = 0,998 geri.', hint: 'I = |S<sub>T</sub>|/V.' });
  mcq('d3', '#d3Q', { id: 'd3q5', q: 'Yük 2 ileri yerine geri olduğunda kaynak akımı neden büyüdü?', opts: ['P arttığı için', 'Q’lar artık birbirini götürmüyor, toplanıyor; |S<sub>T</sub>| büyüdü', 'Bara gerilimi düştüğü için', 'Pens yanlış takıldığı için'], correct: 1, explain: 'Q<sub>T</sub> = 6 + 5,33 = 11,33 kVAR; |S<sub>T</sub>| = 16,5 kVA. Kapasitif bir yükün endüktif yükü “dengelemesi” Hafta 10’daki güç faktörü düzeltmesinin temelidir.', hint: 'P değişmedi; değişen ne?' });

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
      <h2 style="margin:0">Devre Kuramı II · Sanal Laboratuvar · Hafta 9 Raporu</h2>
      <p><b>Konu:</b> RMS değer, gerçek rms ölçüm, kompleks güç ve güç üçgeni</p>
      <table class="data" style="width:auto"><tr><th>Ad Soyad</th><td class="l">${S.st.name || ''}</td><th>No</th><td class="l">${S.st.no || ''}</td><th>Grup</th><td class="l">${S.st.group || ''}</td><th>Tarih</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Özet</h3>
      <p>Tamamlanan föy adımı: <b>${sOk}/${sTot}</b> · Doğru yanıt: <b>${ok}/${tot}</b> · Puan: <b>${Math.round((50 * sOk) / sTot + (50 * ok) / tot)}/100</b></p>
      <h3>Yanıtlar</h3>
      <table class="data"><thead><tr><th>Bölüm</th><th>Soru</th><th>Yanıt</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Deney 1 · Dalga biçimi ve rms</h3>${tb('#d1tab')}
      <h3>Deney 2 · Kompleks güç</h3>${tb('#d2tab')}
      <h3>Deney 3 · Paralel yükler</h3>${tb('#d3tab')}
      <h3>Grafikler</h3>
      <div>${img(D1.plotCanvas)} ${img(D1.scopeCanvas)}</div>
      <div>${img(D2.plotCanvas)}</div>
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

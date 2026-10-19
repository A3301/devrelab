/* Devre Kuramı II · Hafta 8 — Ara Sınav Haftası: Uygulamalı Sınav (Bölüm 1 + 2) */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd2h08';
  const S = Object.assign({ answers: {}, steps: {}, st: {}, page: 'giris',
    d1: { sc: null, hist: [], rows: [], red: 'TP1', blk: 'TP0', f: 1000, V: 5, pairs: [] },
    d2: { sc: null, rows: [], d: { type: 'C', v1: 0, v2: -1, rat: 0 } },
    d3: { sc: null, hist: [], curUsed: false, mode: 'mix' },
    exam: null, exams: [] }, Lab.store.load(KEY));
  Lab.answers = S.answers;
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => Lab.store.save(KEY, S), 300); };
  Lab.onAnswer = () => { save(); progress(); };

  /* ---------- yardımcılar ---------- */
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const rnd = (a, b, d = 2) => +(a + Math.random() * (b - a)).toFixed(d);
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const cx = (re, im = 0) => [re, im];
  const cadd = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const csub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const cdiv = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
  const cabs = (a) => Math.hypot(a[0], a[1]);
  const cargd = (a) => (Math.atan2(a[1], a[0]) * 180) / Math.PI;
  const polar = (m, deg) => [m * Math.cos((deg * Math.PI) / 180), m * Math.sin((deg * Math.PI) / 180)];
  const D2R = Math.PI / 180, TAU = 2 * Math.PI;
  const normA = (a) => { a = ((a % 360) + 360) % 360; return a > 180 ? a - 360 : a; };
  const ohm = Lab.ohm;
  const rCoil = (L) => 0.5 + 30 * L;

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
  const sch = {
    w: (g, pts) => E('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'w' }, g),
    dot: (g, x, y) => E('circle', { cx: x, cy: y, r: 3.5, class: 'node' }, g),
    t: (g, x, y, s, cls = 'lbl', anchor = 'middle') => { const e = E('text', { x, y, class: cls, 'text-anchor': anchor }, g); e.innerHTML = s; return e; },
    rH(g, x1, x2, y) { const n = 6, L = 8, step = (x2 - x1 - 2 * L) / n; let d = `M${x1},${y} h${L}`; for (let i = 0; i < n; i++) d += ` l${step / 2},${i % 2 ? 7 : -7} l${step / 2},${i % 2 ? -7 : 7}`; d += ` L${x2},${y}`; E('path', { d, class: 'w' }, g); },
    lH(g, x1, x2, y) { const n = 4, L = 10, r = (x2 - x1 - 2 * L) / n / 2; let d = `M${x1},${y} h${L}`; for (let i = 0; i < n; i++) d += ` a${r},${r} 0 0 1 ${2 * r},0`; d += ` L${x2},${y}`; E('path', { d, class: 'w', fill: 'none' }, g); },
    cV(g, x, y1, y2) { const m = (y1 + y2) / 2; E('path', { d: `M${x},${y1} V${m - 5} M${x - 14},${m - 5} H${x + 14} M${x - 14},${m + 5} H${x + 14} M${x},${m + 5} V${y2}`, class: 'w', fill: 'none' }, g); },
    cH(g, x1, x2, y) { const m = (x1 + x2) / 2; E('path', { d: `M${x1},${y} H${m - 5} M${m - 5},${y - 14} V${y + 14} M${m + 5},${y - 14} V${y + 14} M${m + 5},${y} H${x2}`, class: 'w', fill: 'none' }, g); },
    gnd(g, x, y) { E('path', { d: `M${x},${y} v8 M${x - 11},${y + 8} h22 M${x - 7},${y + 13} h14 M${x - 3},${y + 18} h6`, class: 'w' }, g); },
    src(g, x, y, r = 22) { E('circle', { cx: x, cy: y, r, class: 'w', fill: '#fff' }, g); E('path', { d: `M${x - 11},${y} q5.5,-13 11,0 t11,0`, class: 'w', fill: 'none' }, g); },
  };
  // ok çizimi (fazör)
  function arrow(g, x0, y0, x1, y1, col, w = 2.5, dash) {
    E('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: col, 'stroke-width': w, 'stroke-dasharray': dash || '' }, g);
    const a = Math.atan2(y1 - y0, x1 - x0), L = 10;
    if (Math.hypot(x1 - x0, y1 - y0) > 4) E('path', { d: `M${x1},${y1} L${x1 - L * Math.cos(a - 0.4)},${y1 - L * Math.sin(a - 0.4)} L${x1 - L * Math.cos(a + 0.4)},${y1 - L * Math.sin(a + 0.4)} Z`, fill: col }, g);
  }
  const txt = (g, x, y, s, col = '#223', a = 'start', size = 12) => { const e = E('text', { x, y, fill: col, 'text-anchor': a, 'font-size': size }, g); e.innerHTML = s; return e; };

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
  function steps(key, list) { stepDefs[key] = list; $('#' + key + 'steps').innerHTML = list.map((s) => `<li>${s.t}</li>`).join(''); }
  function evalSteps(key) {
    const lis = $$('#' + key + 'steps li');
    stepDefs[key].forEach((s, i) => {
      const id = key + '_' + i;
      let ok = false; try { ok = s.test(); } catch (e) { ok = false; }
      if (!S.steps[id] && ok) { S.steps[id] = true; save(); Lab.toast('✔ Adım tamamlandı: ' + s.t.replace(/<[^>]+>/g, '').slice(0, 70)); progress(); }
      lis[i].classList.toggle('done', !!S.steps[id]);
    });
  }
  const qids = { onhaz: [], d1: [], d2: [], d3: [] };
  function progress() {
    let tot = 0, ok = 0;
    Object.keys(stepDefs).forEach((k) => stepDefs[k].forEach((_, i) => { tot++; if (S.steps[k + '_' + i]) ok++; }));
    Object.values(qids).flat().forEach((q) => { tot++; if (S.answers[q] && S.answers[q].ok) ok++; });
    const p = tot ? Math.round((100 * ok) / tot) : 0;
    $('#prog').style.width = p + '%'; $('#progTxt').textContent = '%' + p;
    const dots = $$('#nav .dot');
    pages.forEach((pg, i) => {
      let done = false;
      if (pg === 'giris' || pg === 'onbilgi') done = true;
      else if (qids[pg] || stepDefs[pg]) done = (qids[pg] || []).every((q) => S.answers[q] && S.answers[q].ok) && (!stepDefs[pg] || stepDefs[pg].every((_, j) => S.steps[pg + '_' + j]));
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

  /* ================= ÖN BİLGİ · dönen fazör ================= */
  const OBP = (() => {
    const g = $('#obPh'), th = 50;
    return (t) => {
      const a = (t / 1000) * 1.2; // rad/s yavaş
      g.innerHTML = '';
      const cx0 = 100, cy0 = 100, R = 70, x0 = 200;
      E('circle', { cx: cx0, cy: cy0, r: R, fill: 'none', stroke: '#dde' }, g);
      E('line', { x1: 20, x2: 510, y1: cy0, y2: cy0, stroke: '#ccd' }, g); E('line', { x1: cx0, x2: cx0, y1: 20, y2: 180, stroke: '#ccd' }, g);
      // sinüs eğrileri: zaman sağa akar, izdüşüm = yatay bileşen → dikey eksende çiziyoruz (Re → aşağı eksen yerine yukarı)
      const vx = cx0 + R * Math.cos(a), vy = cy0 - R * Math.sin(a);
      const ix = cx0 + 0.6 * R * Math.cos(a - th * D2R), iy = cy0 - 0.6 * R * Math.sin(a - th * D2R);
      arrow(g, cx0, cy0, vx, vy, '#b8960a', 3); arrow(g, cx0, cy0, ix, iy, '#1592b8', 3);
      // dikey izdüşüm (Im) yerine gösterimde y bileşenini zamana taşıyoruz: cos(ωt+φ) = Re → burada 90° döndürülmüş eksen
      let dv = '', di = '';
      for (let k = 0; k <= 300; k += 3) {
        const aa = a - (k / 300) * 2 * Math.PI;
        dv += (k ? 'L' : 'M') + (x0 + k) + ',' + (cy0 - R * Math.sin(aa));
        di += (k ? 'L' : 'M') + (x0 + k) + ',' + (cy0 - 0.6 * R * Math.sin(aa - th * D2R));
      }
      E('path', { d: dv, stroke: '#b8960a', fill: 'none', 'stroke-width': 2 }, g); E('path', { d: di, stroke: '#1592b8', fill: 'none', 'stroke-width': 2 }, g);
      E('line', { x1: vx, y1: vy, x2: x0, y2: vy, stroke: '#b8960a', 'stroke-dasharray': '3 3' }, g);
      E('line', { x1: ix, y1: iy, x2: x0, y2: iy, stroke: '#1592b8', 'stroke-dasharray': '3 3' }, g);
      txt(g, 30, 196, 'Fazörler ω ile döner', '#556', 'start', 11); txt(g, 330, 196, 'izdüşüm → zaman dalgası', '#556', 'middle', 11);
      txt(g, 14, 20, 'v', '#b8960a', 'start', 13); txt(g, 28, 20, 'i (θ = 50° geride)', '#1592b8', 'start', 13);
    };
  })();

  /* ================= ÖN HAZIRLIK ================= */
  numq('onhaz', '#preQ', { id: 'p1', q: '1) Örnek 1.3: Osiloskopta bir sinüsün tepeden tepeye değeri 34 V. rms değeri kaç V?', answer: 12.02, tol: 1, unit: 'V', explain: 'V<sub>m</sub> = 17 V, V<sub>rms</sub> = 17/√2 = 12,02 V.', hint: 'V<sub>pp</sub> = 2V<sub>m</sub>' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) Örnek 1.4: v = 10 sin(ωt + 30°), i = 4 cos(ωt − 20°), f = 50 Hz. İki dalga arasındaki zaman farkı kaç ms?', answer: 2.22, tol: 2, unit: 'ms', explain: 'v = 10 cos(ωt − 60°); fark 40° → Δt = (40/360)·20 ms = 2,22 ms (akım önde).', hint: 'Önce sin → cos.' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) Örnek 1.18: v<sub>s</sub> = 750 cos(5000t + 30°) V, R = 90 Ω, L = 32 mH, C = 5 µF seri. Akımın tepe değeri kaç A?', answer: 5, tol: 1, unit: 'A', explain: 'Z = 90 + j(160 − 40) = 150∠53,13° Ω; I = 750/150 = 5 A, ∠−23,13°.', hint: 'X<sub>L</sub> = ωL, X<sub>C</sub> = 1/(ωC)' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) Örnek 1.23: R = 10 Ω, L = 50 mH, C = 20 µF seri. Rezonans açısal frekansı kaç rad/s?', answer: 1000, tol: 1, unit: 'rad/s', explain: 'ω<sub>0</sub> = 1/√(LC) = 1/√(10⁻⁶) = 1000 rad/s; Q = 5.', hint: 'ω<sub>0</sub>² LC = 1' });
  numq('onhaz', '#preQ', { id: 'p5', q: '5) Örnek 2.3: v = 100 cos1000t V, R = 6 Ω, L = 8 mH seri. Reaktif güç Q kaç VAR?', answer: 400, tol: 1, unit: 'VAR', explain: 'I = 10∠−53,13° A, Q = ½·100·10·sin53,13° = 400 VAR; P = 300 W.', hint: 'Q = ½I<sub>m</sub>²X<sub>L</sub>' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) Thevenin empedansı Z<sub>Th</sub> = 4 + j3 Ω olan bir kaynağa en büyük gücü aktarmak için yük ne olmalıdır?', opts: ['4 + j3 Ω', '4 − j3 Ω', '5 Ω', '0 Ω'], correct: 1, explain: 'Z<sub>L</sub> = Z<sub>Th</sub>*: reaktanslar birbirini götürür, R<sub>L</sub> = R<sub>Th</sub>.', hint: 'Eşlenik.' });
  mcq('onhaz', '#preQ', { id: 'p7', q: '7) Seri RL devresinde |V<sub>R</sub>| = 6 V, |V<sub>L</sub>| = 8 V ölçülüyor. Kaynak gerilimi kaç V’tur?', opts: ['14 V', '10 V', '2 V', '48 V'], correct: 1, explain: 'V<sub>R</sub> ile V<sub>L</sub> 90° farklı: |V| = √(6² + 8²) = 10 V. Genlikleri toplamak sık hatadır.', hint: 'Fazörler dik.' });

  /* ================= GÖREV 1 · AC ARIZA BUL ================= */
  const NOM = { Rg: 50, R: 220, L: 22e-3, rL: 8, C: 1e-6 };
  const FAULTS = [
    ['ok', 'Arıza yok — kart sağlam'],
    ['Ropen', 'R kopuk (açık devre)'],
    ['Lopen', 'Bobin sargısı kopuk'],
    ['Copen', 'Kondansatör bacağı kopuk'],
    ['Cshort', 'Kondansatör delinmiş (kısa devre)'],
    ['Lshort', 'Bobin uçlarında lehim köprüsü (kısa devre)'],
    ['Cwrong', 'Yanlış kondansatör (1 µF yerine 100 nF)'],
    ['Rwrong', 'Yanlış direnç (220 Ω yerine 2,2 kΩ)'],
    ['Lwrong', 'Yanlış bobin (22 mH yerine 2,2 mH)'],
  ];
  const TPS = ['TP1', 'TP2', 'TP3', 'TP0'];
  const TPN = { TP1: 'TP1 (üreteç ucu)', TP2: 'TP2 (R–L arası)', TP3: 'TP3 (L–C arası)', TP0: 'TP0 (toprak)' };
  function card(fault, f, V) {
    const w = TAU * f, OPEN = cx(1e9), SH = cx(0.01);
    let ZR = cx(NOM.R), ZL = cx(NOM.rL, w * NOM.L), ZC = cx(0, -1 / (w * NOM.C));
    if (fault === 'Ropen') ZR = OPEN; if (fault === 'Lopen') ZL = OPEN; if (fault === 'Copen') ZC = OPEN;
    if (fault === 'Cshort') ZC = SH; if (fault === 'Lshort') ZL = SH;
    if (fault === 'Cwrong') ZC = cx(0, -1 / (w * 1e-7)); if (fault === 'Rwrong') ZR = cx(2200); if (fault === 'Lwrong') ZL = cx(0.8, w * 2.2e-3);
    const Zt = cadd(cadd(ZR, ZL), ZC), I = cdiv(cx(V), cadd(cx(NOM.Rg), Zt));
    const node = { TP1: cmul(I, Zt), TP2: cmul(I, cadd(ZL, ZC)), TP3: cmul(I, ZC), TP0: cx(0) };
    return { I, node };
  }
  const nominal = (f) => card('ok', f, 5);
  const D1 = (() => {
    const st = S.d1, self = {};
    const box = $('#d1inst');
    const fg = inst(box, 'FONKSİYON ÜRETECİ · 50 Ω'); const fgL = lcd(fg.el, 'SİNÜS · emk (rms) · f', '', 180);
    const kf = new Lab.Knob(fg.c, { label: 'Frekans', min: 100, max: 20000, log: true, value: st.f, dark: true, fmt: (v) => eng(v, 'Hz'), onChange: (v) => { st.f = v; save(); } });
    const kv = new Lab.Knob(fg.c, { label: 'Genlik', min: 0.5, max: 10, step: 0.1, value: st.V, dark: true, fmt: (v) => num(v, 1) + ' V', onChange: (v) => { st.V = v; save(); } });
    const dm = inst(box, 'GERÇEK RMS DMM · AC V', false, '10 MΩ'); const dmL = lcd(dm.el, 'V~ (kırmızı − siyah)', 'V', 150);
    const sel = document.createElement('div'); sel.style.cssText = 'font-size:12px;line-height:1.9';
    sel.innerHTML = `<label>Kırmızı uç <select id="d1red">${TPS.map((t) => `<option value="${t}">${TPN[t]}</option>`).join('')}</select></label><br><label>Siyah uç <select id="d1blk">${TPS.map((t) => `<option value="${t}">${TPN[t]}</option>`).join('')}</select></label>`;
    dm.el.insertBefore(sel, dm.c);
    const am = inst(box, 'AC AMPERMETRE · seri', false); const amL = lcd(am.el, 'I~ (rms)', 'mA', 120);
    $('#d1red').value = st.red; $('#d1blk').value = st.blk;
    $('#d1red').onchange = (e) => { st.red = e.target.value; save(); drawTP(); };
    $('#d1blk').onchange = (e) => { st.blk = e.target.value; save(); drawTP(); };
    // şema
    const g = $('#d1sch');
    sch.src(g, 70, 150); sch.t(g, 30, 155, 'v<tspan font-size="10" dy="3">g</tspan>');
    sch.w(g, [[70, 128], [70, 60], [100, 60]]); sch.rH(g, 100, 160, 60); sch.t(g, 130, 42, 'R<tspan font-size="10" dy="3">g</tspan><tspan dy="-3"> 50 Ω</tspan>', 'lbl');
    sch.w(g, [[160, 60], [210, 60]]); E('circle', { cx: 230, cy: 60, r: 17, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g); sch.t(g, 230, 65, 'A');
    sch.w(g, [[247, 60], [290, 60]]); sch.rH(g, 290, 400, 60); sch.t(g, 345, 40, 'R 220 Ω');
    sch.w(g, [[400, 60], [450, 60]]); sch.lH(g, 450, 560, 60); sch.t(g, 505, 40, 'L 22 mH (r 8 Ω)');
    sch.w(g, [[560, 60], [640, 60], [640, 120]]); sch.cV(g, 640, 120, 190); sch.t(g, 660, 160, 'C 1 µF', 'lbl', 'start');
    sch.w(g, [[640, 190], [640, 240], [70, 240], [70, 172]]); sch.gnd(g, 360, 240);
    E('rect', { x: 20, y: 25, width: 160, height: 240, rx: 8, fill: 'none', stroke: '#aab', 'stroke-dasharray': '5 4' }, g); sch.t(g, 100, 285, 'üreteç (iç)', 'lbl').style.fill = '#778';
    const TPXY = { TP1: [270, 60], TP2: [425, 60], TP3: [600, 60], TP0: [500, 240] };
    const tpG = {};
    TPS.forEach((t) => {
      const [x, y] = TPXY[t], gg = E('g', { class: 'tp' }, g);
      E('line', { x1: x, y1: y, x2: x, y2: y + (t === 'TP0' ? 22 : -22), stroke: '#c62828', 'stroke-width': 2 }, gg);
      E('circle', { cx: x, cy: y + (t === 'TP0' ? 30 : -30), r: 9 }, gg);
      E('text', { x: x + 12, y: y + (t === 'TP0' ? 34 : -34) }, gg).textContent = t;
      gg.addEventListener('click', (e) => { if (e.shiftKey) { st.blk = t; $('#d1blk').value = t; } else { st.red = t; $('#d1red').value = t; } save(); drawTP(); });
      tpG[t] = gg;
    });
    function drawTP() { TPS.forEach((t) => { tpG[t].classList.toggle('red', st.red === t); tpG[t].classList.toggle('blk', st.blk === t && st.red !== t); }); }
    drawTP();
    // teşhis
    $('#d1diag').innerHTML = '<option value="">— teşhis seçin —</option>' + FAULTS.map(([k, t]) => `<option value="${k}">${t}</option>`).join('');
    function newCard() { st.sc = { n: (st.sc ? st.sc.n : 0) + 1, fault: Math.random() < 0.12 ? 'ok' : pick(FAULTS.slice(1))[0], done: false }; st.pairs = []; save(); $('#d1diag').value = ''; $('#d1fb').innerHTML = 'Yeni kart takıldı. Ölçmeye başlayın.'; }
    if (!st.sc) newCard();
    let cur = {};
    self.update = () => {
      const c = card(st.sc.fault, st.f, st.V), vr = c.node[st.red], vb = c.node[st.blk];
      const v = cabs(csub(vr, vb)) * (1 + 0.003 * gauss()) + 0.0004 * Math.abs(gauss()), i = cabs(c.I) * (1 + 0.003 * gauss());
      cur = { v, i };
      fgL(`${num(st.V, 1)} V · ${eng(st.f, 'Hz')}`); dmL(st.red === st.blk ? '0,000' : num(v, 3)); amL(num(i * 1e3, 2));
      $('#d1card').textContent = 'Kart #' + st.sc.n;
      const key = st.red < st.blk ? st.red + '-' + st.blk : st.blk + '-' + st.red;
      if (S.page === 'd1' && st.red !== st.blk && !st.pairs.includes(key)) { st.pairs.push(key); save(); }
      const okN = st.hist.filter((h) => h.ok).length;
      $('#d1score').textContent = `Doğru teşhis: ${okN}/${st.hist.length}`;
    };
    function rec() { if (st.red === st.blk) return Lab.toast('Kırmızı ve siyah uç aynı noktada.'); st.rows.push({ n: st.sc.n, f: st.f, red: st.red, blk: st.blk, v: cur.v, i: cur.i }); save(); table(); Lab.toast(`Kaydedildi: ${st.red} → ${st.blk} = ${num(cur.v, 3)} V`); }
    const tbody = $('#d1tab tbody');
    function table() { tbody.innerHTML = st.rows.map((r, k) => `<tr><td>${k + 1}</td><td>#${r.n}</td><td>${num(r.f, 0)}</td><td>${r.red} → ${r.blk}</td><td>${num(r.v, 3)}</td><td>${num(r.i * 1e3, 2)}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; }
    $('#d1rec').onclick = rec;
    $('#d1del').onclick = () => { st.rows.pop(); save(); table(); };
    $('#d1csv').onclick = () => Lab.downloadCSV('hafta8_gorev1.csv', ['#', 'kart', 'f (Hz)', 'kirmizi', 'siyah', 'V (V)', 'I (mA)'], st.rows.map((r, k) => [k + 1, r.n, +r.f.toFixed(1), r.red, r.blk, +r.v.toFixed(4), +(r.i * 1e3).toFixed(3)]));
    $('#d1go').onclick = () => {
      const d = $('#d1diag').value; if (!d) return Lab.toast('Bir teşhis seçin.');
      if (st.sc.done) return Lab.toast('Bu kart teşhis edildi. Yeni kart alın.');
      if (st.pairs.length < 3) return Lab.toast('Teşhisten önce en az üç farklı nokta çifti ölçün.');
      const ok = d === st.sc.fault; st.sc.done = true;
      st.hist.push({ n: st.sc.n, fault: st.sc.fault, diag: d, ok, pairs: st.pairs.length }); save(); progress();
      const name = (k) => FAULTS.find((x) => x[0] === k)[1];
      $('#d1fb').innerHTML = ok ? `✔ <b>Doğru.</b> ${name(d)}. ${st.pairs.length} nokta çifti ölçtünüz.` : `✘ <b>Yanlış.</b> Sizin teşhisiniz: ${name(d)}. Gerçek arıza: <b>${name(st.sc.fault)}</b>. Ölçümlerinizi bu bilgiyle yeniden yorumlayın; sonra yeni kart alın.`;
    };
    $('#d1next').onclick = newCard;
    table();
    Object.assign(self, { rec, kf });
    return self;
  })();
  steps('d1', [
    { t: 'Kaynağı ölçün: kırmızı uç <b>TP1</b>, siyah uç <b>TP0</b>; okumayı <b>kaydedin</b> (<kbd>R</kbd>). Okunan değer neden 5 V’tan küçük olabilir?', test: () => S.d1.rows.some((r) => [r.red, r.blk].sort().join('-') === 'TP0-TP1') },
    { t: 'Aynı kartta her elemanın uçlarını ölçün: <b>R</b> (TP1–TP2), <b>L</b> (TP2–TP3), <b>C</b> (TP3–TP0).', test: () => ['TP1-TP2', 'TP2-TP3', 'TP0-TP3'].every((p) => S.d1.pairs.includes(p)) },
    { t: 'Şüpheli bir kartta frekansı değiştirip (ör. 3 kHz) en az bir ölçüm <b>kaydedin</b>.', test: () => S.d1.rows.some((r) => Math.abs(r.f - 1000) > 200) },
    { t: 'En az <b>3 kartı doğru</b> teşhis edin.', test: () => S.d1.hist.filter((h) => h.ok).length >= 3 },
    { t: 'Son <b>5 teşhisin en az 4’ü</b> doğru olsun.', test: () => { const h = S.d1.hist.slice(-5); return h.length >= 5 && h.filter((x) => x.ok).length >= 4; } },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: 'Sağlam kartta 1 kHz’de devre akımı (rms) kaç mA olmalı? (üreteç emk 5 V, R<sub>g</sub> = 50 Ω dahil)', answer: () => cabs(nominal(1000).I) * 1e3, tol: 2, unit: 'mA', explain: 'Z = (50 + 220 + 8) + j(138,2 − 159,2) = 278 − j20,9 Ω, |Z| = 278,8 Ω, I = 5/278,8 = 17,9 mA.', hint: 'Bütün dirençleri ve reaktansları toplayın; X<sub>L</sub> = 2πfL, X<sub>C</sub> = 1/(2πfC).' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'Sağlam kartta 1 kHz’de kondansatör gerilimi kaç V rms?', answer: () => cabs(nominal(1000).node.TP3), tol: 2, unit: 'V', explain: 'V<sub>C</sub> = I·X<sub>C</sub> = 17,9 mA · 159,2 Ω ≈ 2,85 V.', hint: 'V<sub>C</sub> = I / (ωC)' });
  numq('d1', '#d1Q', { id: 'd1q3', q: 'Kartın seri rezonans frekansı kaç Hz?', answer: 1 / (TAU * Math.sqrt(22e-3 * 1e-6)), tol: 1, unit: 'Hz', explain: 'f<sub>0</sub> = 1/(2π√(LC)) = 1/(2π√(22·10⁻⁹)) ≈ 1073 Hz. 1 kHz rezonansa yakın: devre hafif kapasitif.', hint: 'f<sub>0</sub> = 1/(2π√(LC))' });
  mcq('d1', '#d1Q', { id: 'd1q4', q: 'Ampermetre ≈ 0 mA, TP2–TP3 arası ≈ 5 V, diğer eleman gerilimleri ≈ 0. Arıza nedir?', opts: ['R kopuk', 'Bobin sargısı kopuk', 'Kondansatör kısa devre', 'Arıza yok'], correct: 1, explain: 'Akım yoksa açık bir yer vardır; kaynak geriliminin tamamı açıklığın uçlarında görünür: TP2–TP3 = bobin.', hint: 'Akım sıfırken gerilim düşümü nerede olur?' });
  mcq('d1', '#d1Q', { id: 'd1q5', q: 'TP3–TP0 ≈ 0 V ve akım sağlam karttakinden büyük. En olası arıza?', opts: ['Kondansatör delinmiş (kısa devre)', 'Kondansatör bacağı kopuk', 'R kopuk', 'Bobin kopuk'], correct: 0, explain: 'Akım akarken uçlarında gerilim olmayan eleman kısa devredir; −j159 Ω ortadan kalktığı için |Z| değişir.', hint: 'V = I·Z ve V ≈ 0, I ≠ 0 → Z ≈ ?' });

  /* ================= GÖREV 2 · FAZ AÇISI TASARIMI ================= */
  const E12 = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
  const CVALS = [1e-7, 1e-6, 1e-5].flatMap((d) => E12.map((k) => +(k * d).toPrecision(3))).concat([1e-4]);
  const LVALS = [1e-4, 1e-3, 1e-2].flatMap((d) => E12.map((k) => +(k * d).toPrecision(3))).concat([0.1]);
  const CRAT = [[16, 1], [50, 1.3], [100, 1.8], [250, 2.6], [400, 3.5]]; // V tepe, maliyet çarpanı
  const LRAT = [[0.1, 1], [0.25, 1.3], [0.5, 1.7], [1, 2.4], [2, 3.4]]; // A rms
  const F2 = 1000, W2 = TAU * F2, V2 = 10;
  const elZ = (type, a, b) => {
    if (type === 'C') { const C = a + (b > 0 ? b : 0); return { Z: cx(0, -1 / (W2 * C)), val: C }; }
    const L = a + (b > 0 ? b : 0); return { Z: cx(rCoil(a) + (b > 0 ? rCoil(b) : 0), W2 * L), val: L };
  };
  function d2calc(sc, d) {
    const list = d.type === 'C' ? CVALS : LVALS, a = list[d.v1], b = d.v2 >= 0 ? list[d.v2] : 0;
    const e = elZ(d.type, a, b), Zy = cx(sc.R, W2 * sc.L), Z = cadd(Zy, e.Z), I = cdiv(cx(V2), Z);
    const th = cargd(Z), Ia = cabs(I), Vs = cabs(cmul(I, e.Z)), Vy = cabs(cmul(I, Zy));
    const rats = d.type === 'C' ? CRAT : LRAT, rat = rats[d.rat] || rats[0];
    const need = d.type === 'C' ? Math.SQRT2 * Vs : Ia, ratOK = rat[0] >= need;
    const minIdx = rats.findIndex((r) => r[0] >= need), eco = ratOK && d.rat === minIdx;
    const n = b > 0 ? 2 : 1, base = d.type === 'C' ? (x) => 2 + 0.15 * x * 1e6 : (x) => 3 + 0.4 * x * 1e3;
    const cost = (base(a) + (b > 0 ? base(b) : 0)) * rat[1];
    return { a, b, n, val: e.val, Z, I, th, Ia, Vs, Vy, Zs: e.Z, Zy, rat, ratOK, eco, cost, need };
  }
  function newScenario() {
    for (let tries = 0; tries < 200; tries++) {
      const sc = { id: Math.random().toString(36).slice(2, 6).toUpperCase(), R: pick([10, 22, 47]), L: pick([2.2e-3, 4.7e-3, 10e-3]), th: pick([0, 15, 30, 45, -15, -30, -45, 60]) };
      const Xy = W2 * sc.L, Xs = sc.R * Math.tan(sc.th * D2R) - Xy;
      if (Math.abs(Xs) < 3) continue;
      const type = Xs < 0 ? 'C' : 'L', list = type === 'C' ? CVALS : LVALS;
      let best = 99;
      for (let i = 0; i < list.length; i++) for (let j = -1; j < list.length; j++) {
        const c = d2calc(sc, { type, v1: i, v2: j, rat: 4 }); best = Math.min(best, Math.abs(c.th - sc.th));
      }
      if (best <= 1.5) return sc;
    }
    return { id: 'A1', R: 22, L: 10e-3, th: 30 };
  }
  const D2 = (() => {
    const st = S.d2, self = {};
    if (!st.sc) { st.sc = newScenario(); save(); }
    const box = $('#d2inst');
    const amp = inst(box, 'GÜÇ YÜKSELTECİ · 1 kHz'); const ampL = lcd(amp.el, 'ÇIKIŞ', 'V rms', 120);
    const yk = inst(box, 'YÜK · R<sub>y</sub> + L<sub>y</sub>', false); const ykL = lcd(yk.el, 'SENARYO', '', 220);
    const ms = inst(box, 'RMS ÖLÇERLER', false); const msI = lcd(ms.el, 'AMPERMETRE', 'mA', 110), msV = lcd(ms.el, 'V (seri eleman)', 'V', 110);
    function fillSel() {
      const d = st.d, list = d.type === 'C' ? CVALS : LVALS, f = (v) => (d.type === 'C' ? eng(v, 'F') : eng(v, 'H'));
      $('#d2type').value = d.type;
      $('#d2v1').innerHTML = list.map((v, i) => `<option value="${i}">${f(v)}</option>`).join('');
      $('#d2v2').innerHTML = '<option value="-1">— yok —</option>' + list.map((v, i) => `<option value="${i}">${f(v)}</option>`).join('');
      $('#d2rat').innerHTML = (d.type === 'C' ? CRAT : LRAT).map((r, i) => `<option value="${i}">${d.type === 'C' ? r[0] + ' V (tepe)' : num(r[0], 2) + ' A rms'}</option>`).join('');
      $('#d2v1').value = String(Math.min(d.v1, list.length - 1)); $('#d2v2').value = String(d.v2); $('#d2rat').value = String(d.rat);
    }
    $('#d2type').onchange = (e) => { st.d = { type: e.target.value, v1: 0, v2: -1, rat: 0 }; save(); fillSel(); };
    ['v1', 'v2', 'rat'].forEach((k) => ($('#d2' + k).onchange = (e) => { st.d[k] = +e.target.value; save(); }));
    fillSel();
    // şema
    const g = $('#d2sch');
    sch.src(g, 70, 120); sch.w(g, [[70, 98], [70, 50], [150, 50]]); E('circle', { cx: 170, cy: 50, r: 17, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g); sch.t(g, 170, 55, 'A');
    sch.w(g, [[187, 50], [240, 50]]);
    const gS = E('g', {}, g);
    sch.w(g, [[360, 50], [420, 50]]); sch.rH(g, 420, 520, 50); sch.w(g, [[520, 50], [560, 50]]); sch.lH(g, 560, 660, 50); sch.w(g, [[660, 50], [700, 50], [700, 190], [70, 190], [70, 142]]);
    E('rect', { x: 405, y: 15, width: 270, height: 70, rx: 8, fill: 'none', stroke: '#aab', 'stroke-dasharray': '5 4' }, g);
    const tY = sch.t(g, 540, 105, '', 'lbl'), tS = sch.t(g, 300, 20, '', 'lbl'), tT = sch.t(g, 380, 215, '', 'val');
    function drawSel() {
      gS.innerHTML = '';
      if (st.d.type === 'C') sch.cH(gS, 240, 360, 50); else sch.lH(gS, 240, 360, 50);
    }
    function phasor(c) {
      const p = $('#d2ph'); p.innerHTML = '';
      const ox = 60, oy = 170;
      E('line', { x1: 20, x2: 350, y1: oy, y2: oy, stroke: '#ccd' }, p); E('line', { x1: ox, x2: ox, y1: 10, y2: 290, stroke: '#ccd' }, p);
      if (!c) { txt(p, 180, 150, 'Değerlendirme sonrası çizilir', '#889', 'middle'); return; }
      const k = 250 / V2, Vy = cmul(c.I, c.Zy), Vs = cmul(c.I, c.Zs);
      const P = (z) => [ox + z[0] * k, oy - z[1] * k];
      const a = P(cx(V2)), b = P(Vy);
      arrow(p, ox, oy, a[0], a[1], '#b8960a', 3); txt(p, a[0] - 4, a[1] + 16, 'V<tspan font-size="9" dy="3">kaynak</tspan>', '#b8960a', 'end');
      arrow(p, ox, oy, b[0], b[1], '#0b5cad', 2.5); txt(p, b[0] + 4, b[1] - 4, 'V<tspan font-size="9" dy="3">yük</tspan>', '#0b5cad');
      arrow(p, b[0], b[1], b[0] + Vs[0] * k, b[1] - Vs[1] * k, '#e07a10', 2.5, '6 3'); txt(p, (b[0] + a[0]) / 2 + 6, (b[1] + a[1]) / 2, 'V<tspan font-size="9" dy="3">s</tspan>', '#e07a10');
      const Ik = 120 / Math.max(c.Ia, 1e-6), Ie = [ox + c.I[0] * Ik, oy - c.I[1] * Ik];
      arrow(p, ox, oy, Ie[0], Ie[1], '#1592b8', 3); txt(p, Ie[0] + 4, Ie[1] + 14, 'I', '#1592b8');
      txt(p, 340, 285, `θ = ${num(c.th, 1)}° · hedef ${S.d2.sc.th}°`, '#333', 'end');
    }
    self.update = () => {
      drawSel(); ampL('10,00');
      const sc = st.sc, c = d2calc(sc, st.d);
      ykL(`R<sub>y</sub>=${sc.R} Ω, L<sub>y</sub>=${eng(sc.L, 'H')}, hedef θ=${sc.th}°`.replace(/<[^>]+>/g, ''));
      msI(num(c.Ia * 1e3 * (1 + 0.002 * gauss()), 1)); msV(num(c.Vs * (1 + 0.002 * gauss()), 2));
      tY.textContent = `R_y = ${sc.R} Ω · L_y = ${eng(sc.L, 'H')}`;
      tS.textContent = st.d.type === 'C' ? 'seri C = ' + eng(c.val, 'F') : 'seri L = ' + eng(c.val, 'H');
      tT.textContent = `Senaryo ${sc.id}: V = 10 V rms, f = 1 kHz, hedef θ_v − θ_i = ${sc.th}°`;
    };
    function evaluate() {
      const sc = st.sc, c = d2calc(sc, st.d), okA = Math.abs(c.th - sc.th) <= 3, pass = okA && c.ratOK;
      st.rows.push({ id: sc.id, type: st.d.type, val: c.val, n: c.n, rat: c.rat[0], th: c.th, I: c.Ia, Vs: c.Vs, cost: c.cost, pass, eco: pass && c.eco, okA });
      save(); table(); phasor(c); progress();
      const fe = (v) => (st.d.type === 'C' ? eng(v, 'F') : eng(v, 'H'));
      let h = `Ölçülen θ<sub>v</sub> − θ<sub>i</sub> = <b>${num(c.th, 1)}°</b> (hedef ${sc.th}°) · I = ${num(c.Ia * 1e3, 1)} mA · seri eleman ${fe(c.val)} uçlarında ${num(c.Vs, 2)} V rms`;
      h += st.d.type === 'C' ? ` (tepe ${num(c.need, 1)} V, etiket ${c.rat[0]} V)` : ` (etiket ${num(c.rat[0], 2)} A)`;
      h += ` · maliyet ≈ ${num(c.cost, 2)} ₺<br>`;
      if (!okA) h += `✘ Açı tutmuyor. ${c.th > sc.th ? 'Toplam reaktans fazla endüktif' : 'Toplam reaktans fazla kapasitif'}: X<sub>s</sub> = R<sub>y</sub> tan θ − X<sub>y</sub> hesabını kontrol edin.`;
      else if (!c.ratOK) h += '✘ Açı tamam ama eleman değeri yetersiz: ' + (st.d.type === 'C' ? 'kondansatör tepe gerilimine dayanmaz (delinir).' : 'bobin akımı etiket değerini aşıyor (ısınır).');
      else h += c.eco ? '✔ <b>UYGUN ve EKONOMİK.</b>' : '✔ <b>UYGUN</b>, ama daha düşük (ucuz) bir etiket değeri de yeterdi.';
      $('#d2verdict').innerHTML = h;
    }
    const tbody = $('#d2tab tbody');
    function table() {
      tbody.innerHTML = st.rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.id}</td><td>${r.type}${r.n > 1 ? ' ×2' : ''}</td><td>${r.type === 'C' ? eng(r.val, 'F') : eng(r.val, 'H')} / ${r.type === 'C' ? r.rat + ' V' : num(r.rat, 2) + ' A'}</td><td>${num(r.th, 1)}°</td><td>${num(r.I * 1e3, 1)}</td><td>${num(r.Vs, 2)}</td><td>${num(r.cost, 2)} ₺</td><td class="l">${r.pass ? (r.eco ? 'uygun · ekonomik' : 'uygun') : r.okA ? 'değer yetersiz' : 'açı dışında'}</td></tr>`).join('');
      tbody.parentElement.parentElement.scrollTop = 1e6;
    }
    $('#d2eval').onclick = evaluate;
    $('#d2new').onclick = () => { st.sc = newScenario(); save(); $('#d2verdict').innerHTML = 'Yeni senaryo: önce gerekli X<sub>s</sub>’yi hesaplayın.'; phasor(null); };
    $('#d2csv').onclick = () => Lab.downloadCSV('hafta8_gorev2.csv', ['#', 'senaryo', 'tur', 'deger', 'etiket', 'theta', 'I (A)', 'Vs (V)', 'maliyet', 'sonuc'], st.rows.map((r, i) => [i + 1, r.id, r.type, r.val, r.rat, +r.th.toFixed(2), +r.I.toFixed(5), +r.Vs.toFixed(3), +r.cost.toFixed(2), r.pass ? 'uygun' : 'ret']));
    table(); phasor(null);
    Object.assign(self, { evaluate });
    return self;
  })();
  const d2Xs = () => { const sc = S.d2.sc; return sc.R * Math.tan(sc.th * D2R) - W2 * sc.L; };
  steps('d2', [
    { t: 'Senaryonuz için gerekli seri reaktansı <b>X<sub>s</sub></b> hesaplayıp ilk soruya girin (C mi, L mi?).', test: () => S.answers.d2q1 && S.answers.d2q1.ok },
    { t: 'Hesapladığınız değere en yakın E12 elemanı seçip <b>değerlendirin</b>.', test: () => S.d2.rows.length >= 1 },
    { t: 'Gerekirse ikinci elemanla ince ayar yapıp <b>UYGUN</b> bir tasarıma ulaşın (|θ − θ<sub>hedef</sub>| ≤ 3°, değer yeterli).', test: () => S.d2.rows.some((r) => r.pass) },
    { t: 'Aynı senaryoda <b>en ekonomik yeterli</b> etiket değeriyle uygun tasarım yapın.', test: () => S.d2.rows.some((r) => r.eco) },
    { t: '<b>İki farklı senaryoda</b> uygun tasarım elde edin.', test: () => new Set(S.d2.rows.filter((r) => r.pass).map((r) => r.id)).size >= 2 },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'Şu anki senaryonuz için gerekli seri reaktans X<sub>s</sub> kaç Ω? (kapasitif ise eksi işaretli girin)', answer: d2Xs, tol: 3, abs: 0.3, unit: 'Ω', explain: 'X<sub>s</sub> = R<sub>y</sub> tan θ<sub>hedef</sub> − ωL<sub>y</sub>. Eksi → kondansatör, C = 1/(ω|X<sub>s</sub>|).', hint: 'ω = 2π·1000; tan θ hesap makinesinde derece kipinde.' });
  numq('d2', '#d2Q', { id: 'd2q2', q: '50 Hz’de 100 mH’lik bir bobine seri bağlanarak devreyi rezonansa (pf = 1) getiren kondansatör kaç µF?', answer: 101.32, tol: 1, unit: 'µF', explain: 'C = 1/(ω²L) = 1/((314,16)²·0,1) = 101,3 µF.', hint: 'ω²LC = 1' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 'R = 30 Ω, X<sub>L</sub> = 40 Ω olan yükte ω = 1000 rad/s. Akımı gerilimle aynı faza getiren seri C kaç µF?', answer: 25, tol: 1, unit: 'µF', explain: 'X<sub>C</sub> = 40 Ω → C = 1/(1000·40) = 25 µF.', hint: 'X<sub>C</sub> = X<sub>L</sub>' });
  numq('d2', '#d2Q', { id: 'd2q4', q: 'Örnek 1.23: v<sub>s</sub> = 20 cos ωt V, R = 10 Ω, L = 50 mH, C = 20 µF seri. Rezonansta kondansatör geriliminin tepe değeri kaç V?', answer: 100, tol: 1, unit: 'V', explain: 'I = 2 A, X<sub>C</sub> = 50 Ω → V<sub>C</sub> = 100 V = Q·V (Q = 5). Kondansatör en az 100 V tepe değerli olmalı!', hint: 'Rezonansta I = V/R.' });
  mcq('d2', '#d2Q', { id: 'd2q5', q: 'Hedef açı 0°’a yaklaştıkça seri kondansatörün gerilimi ne olur?', opts: ['Sıfıra iner', 'Akım büyüdüğü için artar; kaynağı bile aşabilir', 'Değişmez', 'Yalnızca faz değişir'], correct: 1, explain: 'Toplam reaktans sıfıra giderken |Z| = R<sub>y</sub> olur, akım en büyük; V<sub>C</sub> = I·X<sub>C</sub> büyür. Gerilim değeri seçimi bu yüzden kritik.', hint: '|Z| en küçük olunca I ne olur?' });

  /* ================= GÖREV 3 · DALGA / FAZÖR TANIMA ================= */
  const VDIV = [0.5, 1, 2, 5, 10, 20];
  const ADIV = [0.05, 0.1, 0.2, 0.5, 1, 2];
  const TDIV = [1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2];
  const TYPES = { R: 'Saf direnç', L: 'Saf bobin', C: 'Saf kapasitör', RL: 'Endüktif yük (R + L)', RC: 'Kapasitif yük (R + C)' };
  const D3 = (() => {
    const st = S.d3, self = { dirty: true };
    const scope = new Lab.Scope($('#scope'));
    const sk = $('#scopeKnobs');
    const k1 = new Lab.Knob(sk, { label: 'CH1 V/d', list: VDIV, value: 5, dark: true, size: 44, fmt: (v) => eng(v, 'V'), onChange: (v) => { scope.ch[0].vdiv = v; self.dirty = true; } });
    const k2 = new Lab.Knob(sk, { label: 'CH2 A/d', list: ADIV, value: 0.5, dark: true, size: 44, fmt: (v) => eng(v, 'A'), onChange: (v) => { scope.ch[1].vdiv = v; self.dirty = true; } });
    const kt = new Lab.Knob(sk, { label: 'ZAMAN/d', list: TDIV, value: 2e-3, dark: true, size: 44, fmt: (v) => eng(v, 's'), onChange: (v) => { scope.tdiv = v; self.dirty = true; } });
    $('#curon').onclick = (e) => { scope.cur.on = !scope.cur.on; e.target.classList.toggle('on', scope.cur.on); if (scope.cur.on) { st.curUsed = true; save(); } self.dirty = true; };
    $('#scope').addEventListener('pointermove', () => { if (scope.cur.drag) self.dirty = true; });
    $('#d3mode').value = st.mode; $('#d3mode').onchange = (e) => { st.mode = e.target.value; save(); };
    function gen() {
      const type = pick(Object.keys(TYPES));
      const th = { R: 0, L: 90, C: -90, RL: rnd(20, 70, 0), RC: -rnd(20, 70, 0) }[type];
      const mode = st.mode === 'mix' ? pick(['scope', 'ph']) : st.mode;
      const sc = { n: (st.sc ? st.sc.n : 0) + 1, type, th, mode, Vm: pick([5, 8, 10, 12, 15, 20]), Im: pick([0.2, 0.4, 0.5, 0.8, 1, 1.5]), f: pick([50, 100, 200, 500, 1000]), ph0: rnd(-60, 60, 0), done: false };
      sc.P = 0.5 * sc.Vm * sc.Im * Math.cos(th * D2R);
      st.sc = sc; save();
      // ön ayar: ekranda ≈ 2 periyot, genlikler 2–3 bölme
      const pk = (L, x) => L.find((v) => v >= x) || L[L.length - 1];
      kt.set(pk(TDIV, 2 / sc.f / 10)); k1.set(pk(VDIV, sc.Vm / 3.2)); k2.set(pk(ADIV, sc.Im / 3.2));
      ['#d3type', '#d3th', '#d3P'].forEach((s) => ($(s).value = ''));
      $('#d3fb').innerHTML = sc.mode === 'scope' ? 'Osiloskop ekranı: önce hangisinin tepe yaptığına bakın, imleçlerle Δt ölçün.' : 'Fazör diyagramı: açıları okuyun, θ = ∠V − ∠I.';
      self.dirty = true;
    }
    if (!st.sc) gen();
    function drawPh(sc) {
      const g = $('#d3ph'); g.innerHTML = '';
      const ox = 210, oy = 170, R = 130;
      E('circle', { cx: ox, cy: oy, r: R, fill: 'none', stroke: '#eef' }, g);
      for (let a = 0; a < 360; a += 15) { const r1 = a % 90 ? R - 5 : R - 12; E('line', { x1: ox + r1 * Math.cos(a * D2R), y1: oy - r1 * Math.sin(a * D2R), x2: ox + R * Math.cos(a * D2R), y2: oy - R * Math.sin(a * D2R), stroke: '#bbc' }, g); }
      E('line', { x1: ox - R - 10, x2: ox + R + 10, y1: oy, y2: oy, stroke: '#99a' }, g); E('line', { x1: ox, x2: ox, y1: oy - R - 10, y2: oy + R + 10, stroke: '#99a' }, g);
      txt(g, ox + R + 8, oy - 4, 'Re', '#778'); txt(g, ox + 4, oy - R - 2, 'Im', '#778');
      const av = sc.ph0, ai = sc.ph0 - sc.th, lv = R * 0.92, li = R * 0.6;
      const V = [ox + lv * Math.cos(av * D2R), oy - lv * Math.sin(av * D2R)], I = [ox + li * Math.cos(ai * D2R), oy - li * Math.sin(ai * D2R)];
      if (sc.type === 'RL' || sc.type === 'RC') {
        const vr = lv * Math.cos(sc.th * D2R), VR = [ox + vr * Math.cos(ai * D2R), oy - vr * Math.sin(ai * D2R)];
        arrow(g, ox, oy, VR[0], VR[1], '#8a8', 1.5, '4 3'); arrow(g, VR[0], VR[1], V[0], V[1], '#8a8', 1.5, '4 3');
      }
      arrow(g, ox, oy, V[0], V[1], '#b8960a', 3.5); arrow(g, ox, oy, I[0], I[1], '#1592b8', 3.5);
      txt(g, V[0] + (V[0] > ox ? 6 : -6), V[1] - 6, `V = ${num(sc.Vm, 0)}∠${num(av, 0)}° V`, '#8a6d00', V[0] > ox ? 'start' : 'end', 13);
      txt(g, I[0] + (I[0] > ox ? 6 : -6), I[1] + 16, `I = ${num(sc.Im, 2)}∠${num(normA(ai), 0)}° A`, '#0f6f8c', I[0] > ox ? 'start' : 'end', 13);
      txt(g, 10, 330, `f = ${sc.f} Hz · uzunluklar tepe değer · ölçekler farklı`, '#667', 'start', 11);
    }
    self.update = () => {
      if (!self.dirty) return; self.dirty = false;
      const sc = st.sc, isS = sc.mode === 'scope';
      $('#d3scopeBox').style.display = isS ? '' : 'none'; $('#d3phBox').style.display = isS ? 'none' : '';
      $('#d3no').textContent = 'Ekran #' + sc.n;
      $('#d3hdr').textContent = 'CH1: v · CH2: i (1 V/A)'; $('#d3hdr2').textContent = 'Ekran #' + sc.n;
      const full = st.hist.filter((h) => h.okType && h.okTh && h.okP).length;
      $('#d3score').textContent = `Tam doğru: ${full}/${st.hist.length}`;
      if (!isS) { drawPh(sc); return; }
      scope.ch[0].vdiv = k1.value; scope.ch[1].vdiv = k2.value; scope.tdiv = kt.value;
      const n = 1000, T = scope.tdiv * 10, dt = T / (n - 1), w = TAU * sc.f;
      const y1 = new Float64Array(n), y2 = new Float64Array(n);
      for (let i = 0; i < n; i++) { const t = i * dt; y1[i] = sc.Vm * Math.cos(w * t + sc.ph0 * D2R) + 0.004 * sc.Vm * gauss(); y2[i] = sc.Im * Math.cos(w * t + (sc.ph0 - sc.th) * D2R) + 0.004 * sc.Im * gauss(); }
      scope.draw({ n, y: [y1, y2] });
      const m = scope.measure(); let h = `<span style="color:#f2d21b">CH1</span> V<sub>pp</sub> ${eng(m.ch[0].vpp, 'V')}<br>f ${isFinite(m.ch[0].f) ? eng(m.ch[0].f, 'Hz') : '—'}<br><span style="color:#27c4f0">CH2</span> I<sub>pp</sub> ${eng(m.ch[1].vpp, 'A')}<br>`;
      if (m.cur) h += `<span style="color:#ff7cf0">İMLEÇ</span> Δt ${eng(m.cur.dt, 's')}<br>CH1: ${num(m.cur.v1a, 2)} → ${num(m.cur.v1b, 2)} V<br>CH2: ${num(m.cur.v2a, 3)} → ${num(m.cur.v2b, 3)} A`;
      $('#scopeMeas').innerHTML = h;
    };
    $('#d3go').onclick = () => {
      const sc = st.sc; if (sc.done) return Lab.toast('Bu ekran yanıtlandı. Yeni ekran alın.');
      const ty = $('#d3type').value, th = Lab.parse($('#d3th').value), P = Lab.parse($('#d3P').value);
      if (!ty || !isFinite(th) || !isFinite(P)) return Lab.toast('Tür, açı ve güç alanlarının üçünü de doldurun.');
      const tolT = sc.mode === 'scope' ? 6 : 2;
      const okType = ty === sc.type, okTh = Math.abs(normA(th - sc.th)) <= tolT, okP = Math.abs(P - sc.P) <= Math.abs(sc.P) * 0.08 + 0.02 * 0.5 * sc.Vm * sc.Im;
      sc.done = true; st.hist.push({ n: sc.n, mode: sc.mode, type: sc.type, th: sc.th, P: sc.P, ans: { ty, th, P }, okType, okTh, okP }); save(); progress();
      $('#d3fb').innerHTML = `${okType ? '✔' : '✘'} Tür: ${TYPES[ty]}${okType ? '' : ' (doğrusu ' + TYPES[sc.type] + ')'} · ${okTh ? '✔' : '✘'} θ = ${num(th, 1)}°${okTh ? '' : ' (doğrusu ' + num(sc.th, 0) + '°)'} · ${okP ? '✔' : '✘'} P = ${num(P, 3)} W${okP ? '' : ' (doğrusu ' + num(sc.P, 3) + ' W)'}`;
      self.dirty = true;
    };
    $('#d3next').onclick = gen;
    Object.assign(self, { scope });
    return self;
  })();
  steps('d3', [
    { t: 'Bir <b>osiloskop</b> ekranında tür ve açıyı doğru bulun.', test: () => S.d3.hist.some((h) => h.mode === 'scope' && h.okType && h.okTh) },
    { t: 'Bir <b>fazör diyagramı</b> ekranını tamamen (tür, açı, güç) doğru çözün.', test: () => S.d3.hist.some((h) => h.mode === 'ph' && h.okType && h.okTh && h.okP) },
    { t: 'Açı ölçümünde osiloskop <b>imleçlerini</b> kullanın.', test: () => !!S.d3.curUsed },
    { t: 'Toplam en az <b>8 ekran</b> çözün; son 8’in en az 6’sı tam doğru olsun.', test: () => { const h = S.d3.hist.slice(-8); return h.length >= 8 && h.filter((x) => x.okType && x.okTh && x.okP).length >= 6; } },
  ]);
  mcq('d3', '#d3Q', { id: 'd3q1', q: 'Osiloskopta v’nin tepesi i’nin tepesinden çeyrek periyottan daha kısa bir süre <b>önce</b> geliyor. Yük nedir?', opts: ['Kapasitif (R + C)', 'Endüktif (R + L)', 'Saf direnç', 'Saf kapasitör'], correct: 1, explain: 'Akım geride, 0° &lt; θ &lt; 90°: endüktif yük. Tam çeyrek periyot olsaydı saf bobin.', hint: 'v önce → akım geride.' });
  numq('d3', '#d3Q', { id: 'd3q2', q: '50 Hz’de v ile i tepeleri arasında Δt = 1,5 ms ölçüldü. |θ<sub>v</sub> − θ<sub>i</sub>| kaç derece?', answer: 27, tol: 1, unit: '°', explain: 'θ = 360°·Δt/T = 360·1,5/20 = 27°.', hint: 'T = 20 ms' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'Örnek 1.42: R = 100 Ω, C = 10 µF seri, ω = 1000 rad/s. θ<sub>v</sub> − θ<sub>i</sub> kaç derece?', answer: -45, tol: 1, unit: '°', explain: 'Z = 100 − j100 = 141,4∠−45° Ω: akım gerilimden 45° ileride.', hint: 'X<sub>C</sub> = 1/(ωC) = 100 Ω' });
  numq('d3', '#d3Q', { id: 'd3q4', q: 'Örnek 1.43: v = 20 cos2000t V; R = 5 Ω, L = 5 mH, C = 200 µF paralel. Kaynak akımının tepe değeri kaç A?', answer: 7.211, tol: 1, unit: 'A', explain: 'I<sub>R</sub> = 4, I<sub>L</sub> = 2∠−90°, I<sub>C</sub> = 8∠90° → I<sub>s</sub> = 4 + j6 = 7,211∠56,31° A (kapasitif).', hint: 'Dal akımlarını fazör olarak toplayın.' });
  mcq('d3', '#d3Q', { id: 'd3q5', q: 'Fazör diyagramında V ile I arasındaki açı 120° çıkıyor (pasif düzen). Ne söylersiniz?', opts: ['P &lt; 0: kutu aktif güç veriyor (kaynak gibi davranıyor)', 'Saf bobin', 'Ölçüm hatası; açı 90°’yi aşamaz', 'P &gt; 0, Q &lt; 0'], correct: 0, explain: 'cos120° &lt; 0 → P &lt; 0 (Örnek 2.2). Pasif yükte |θ| ≤ 90° olur; aşıyorsa kutuda kaynak vardır.', hint: 'cos120° işareti?' });

  /* ================= GÖREV 4 · SÜRELİ DENEME SINAVI ================= */
  const EXDUR = 40 * 60;
  const GENS = [
    () => { const pp = pick([10, 17, 24, 34, 50, 622]); return { q: `Osiloskopta bir sinüsün tepeden tepeye değeri ${pp} V. rms değeri kaç V?`, a: pp / 2 / Math.SQRT2, u: 'V' }; },
    () => { const w = pick([100, 314.16, 500, 1000, 2000 * Math.PI]); return { q: `v(t) = 40 cos(${num(w, 2)}t − 60°) V. Periyot kaç ms?`, a: (TAU / w) * 1e3, u: 'ms' }; },
    () => { const al = pick([10, 30, 45, 60]), be = pick([-20, 0, 15, 40]); return { q: `v = 10 sin(ωt + ${al}°) V, i = 4 cos(ωt ${be < 0 ? '−' : '+'} ${Math.abs(be)}°) A. θ<sub>v</sub> − θ<sub>i</sub> kaç derece? (−180…180)`, a: normA(al - 90 - be), u: '°', abs: 0.5 }; },
    () => { const L = pick([10, 20, 50, 100, 200]), f = pick([50, 60, 400, 1000]); return { q: `L = ${L} mH bobinin ${f} Hz’deki reaktansı kaç Ω?`, a: TAU * f * L * 1e-3, u: 'Ω' }; },
    () => { const C = pick([1, 2.2, 10, 47, 100]), f = pick([50, 100, 1000]); return { q: `C = ${num(C, 1)} µF kondansatörün ${f} Hz’deki reaktansının büyüklüğü kaç Ω?`, a: 1 / (TAU * f * C * 1e-6), u: 'Ω' }; },
    () => { const R = pick([30, 40, 60, 80]), L = pick([30, 40, 80, 100]), w = pick([400, 1000]), Vm = pick([100, 200]); return { q: `Seri RL: v<sub>s</sub> = ${Vm} cos(${w}t) V, R = ${R} Ω, L = ${L} mH. Akımın tepe değeri kaç A?`, a: Vm / Math.hypot(R, w * L * 1e-3), u: 'A' }; },
    () => { const R = pick([30, 90, 40]), XL = pick([60, 160, 80]), XC = pick([20, 40, 50]), Vm = pick([50, 150, 750]); return { q: `Seri RLC: R = ${R} Ω, X<sub>L</sub> = ${XL} Ω, X<sub>C</sub> = ${XC} Ω, V<sub>m</sub> = ${Vm} V. I<sub>m</sub> kaç A?`, a: Vm / Math.hypot(R, XL - XC), u: 'A' }; },
    () => { const R = pick([50, 100]), C = pick([10, 20]), w = pick([1000, 2000]), V = pick([10, 20]); return { q: `Paralel RC: R = ${R} Ω, C = ${C} µF, v = ${V} cos(${w}t) V. Kaynak akımının tepe değeri kaç A?`, a: V * Math.hypot(1 / R, w * C * 1e-6), u: 'A' }; },
    () => { const L = pick([10, 22, 50, 100]), C = pick([1, 10, 20, 100]); return { q: `Seri rezonans: L = ${L} mH, C = ${C} µF. Rezonans frekansı kaç Hz?`, a: 1 / (TAU * Math.sqrt(L * 1e-3 * C * 1e-6)), u: 'Hz' }; },
    () => { const R = pick([30, 40, 60]), XC = pick([40, 30, 80]), Vm = pick([100, 50]); return { q: `Gerilim bölücü: V = ${Vm}∠0° V, R = ${R} Ω ile X<sub>C</sub> = ${XC} Ω seri. Kondansatör geriliminin genliği kaç V?`, a: (Vm * XC) / Math.hypot(R, XC), u: 'V' }; },
    () => { const A = pick([20, 30]), a = pick([-30, 0]), Bm = pick([40, 50]), b = pick([60, 90]); return { q: `y = ${A} cos(ωt ${a < 0 ? '−' : '+'} ${Math.abs(a)}°) + ${Bm} cos(ωt + ${b}°). Toplamın genliği kaç?`, a: cabs(cadd(polar(A, a), polar(Bm, b))), u: '' }; },
    () => { const n = pick([2, 5, 10]), RL = pick([8, 50, 100]); return { q: `İdeal transformatör N<sub>1</sub>:N<sub>2</sub> = ${n}:1, sekondere ${RL} Ω bağlı. Primerden görülen empedans kaç Ω?`, a: n * n * RL, u: 'Ω' }; },
    () => { const L = pick([30, 100, 200]), R = pick([10, 40, 50]); return { q: `Seri RL devresi sinüs kaynağa bağlanıyor: R = ${R} Ω, L = ${L} mH. Geçici bileşenin zaman sabiti τ kaç ms?`, a: L / R, u: 'ms' }; },
    () => { const Vm = pick([40, 100, 50]), Im = pick([2, 4, 5]), tv = pick([15, 30, 10]), ti = pick([-15, -30, -50]), sn = Math.random() < 0.5; return { q: `v = ${Vm} cos(ωt + ${tv}°) V, i = ${Im} ${sn ? 'sin' : 'cos'}(ωt − ${Math.abs(ti)}°) A (pasif düzen). Ortalama güç P kaç W?`, a: 0.5 * Vm * Im * Math.cos((tv - (ti - (sn ? 90 : 0))) * D2R), u: 'W', abs: 0.05 }; },
    () => { const Vm = pick([50, 100]), Im = pick([2, 4]), th = pick([30, 53.13, 60, -45]); return { q: `V<sub>m</sub> = ${Vm} V, I<sub>m</sub> = ${Im} A, θ<sub>v</sub> − θ<sub>i</sub> = ${num(th, 2)}°. Reaktif güç Q kaç VAR? (işaretiyle)`, a: 0.5 * Vm * Im * Math.sin(th * D2R), u: 'VAR' }; },
    () => { const R = pick([6, 30, 8]), X = pick([8, 40, 6, -8]); return { q: `Seri yük Z = ${R} ${X < 0 ? '−' : '+'} j${Math.abs(X)} Ω. Güç faktörü kaçtır?`, a: R / Math.hypot(R, X), u: '' }; },
    () => { const V = pick([100, 230, 120]), R = pick([6, 30, 40]), X = pick([8, 40, 30]); return { q: `${V} V rms kaynak, Z = ${R} + j${X} Ω yükü besliyor. Yükün ortalama gücü kaç W?`, a: (V * V * R) / (R * R + X * X), u: 'W' }; },
    () => { const a = pick([2000, 1500]), b = pick([1146, 1200]), c = pick([600, 516]); return { q: `230 V prize ${a} W, ${b} W ve ${c} W’lık rezistif cihazlar bağlı. Toplam akım kaç A?`, a: (a + b + c) / 230, u: 'A' }; },
    () => { const P = pick([5, 10, 20]), pf1 = pick([0.7, 0.75, 0.8]), pf2 = pick([0.95, 1]); return { q: `${P} kW, pf = ${num(pf1, 2)} (geri) yük 230 V, 50 Hz’de. pf’yi ${num(pf2, pf2 < 1 ? 2 : 0)}’e çıkarmak için paralel kondansatör kaç µF?`, a: ((P * 1e3 * (Math.tan(Math.acos(pf1)) - Math.tan(Math.acos(pf2)))) / (TAU * 50 * 230 * 230)) * 1e6, u: 'µF' }; },
    () => { const V = pick([10, 20, 50]), R = pick([4, 8, 50]); return { q: `Thevenin eşdeğeri V<sub>Th</sub> = ${V} V rms, Z<sub>Th</sub> = ${R} + j${R} Ω. Yüke aktarılabilecek en büyük ortalama güç kaç W?`, a: (V * V) / (4 * R), u: 'W' }; },
  ];
  const D4 = (() => {
    const self = {}, box = $('#exBox');
    function render() {
      const ex = S.exam;
      if (!ex) { box.innerHTML = '<p class="lead" style="margin:0">Henüz başlatılmış bir sınav yok.</p>'; return; }
      box.innerHTML = `<h3 style="margin-top:0">Deneme #${ex.no} ${ex.done ? `· <span class="badge ${ex.score >= 60 ? 'ok' : 'bad'}">Puan ${ex.score}/100</span>` : ''}</h3>` +
        ex.qs.map((q, i) => {
          const r = ex.res ? ex.res[i] : null;
          return `<div class="exq ${r == null ? '' : r ? 'ok' : 'bad'}"><b>${i + 1})</b> ${q.q}<div class="row" style="margin-top:4px"><input type="text" size="10" data-i="${i}" value="${(ex.resp[i] || '').replace(/"/g, '')}" ${ex.done ? 'disabled' : ''}> <span>${q.u}</span>${ex.done ? ` <span style="font-size:13px">${r ? '✔' : '✘ doğrusu ' + num(q.a, Math.abs(q.a) >= 100 ? 1 : 3)}</span>` : ''}</div></div>`;
        }).join('');
      $$('#exBox input').forEach((inp) => inp.addEventListener('input', () => { ex.resp[+inp.dataset.i] = inp.value; save(); }));
    }
    function hist() { $('#exHist tbody').innerHTML = S.exams.map((h, i) => `<tr><td>${i + 1}</td><td class="l">${h.date}</td><td>${h.score}</td><td>${Math.floor(h.used / 60)}:${String(h.used % 60).padStart(2, '0')}</td></tr>`).join('') || '<tr><td colspan="4" class="l">—</td></tr>'; }
    function start() {
      if (S.exam && !S.exam.done && !confirm('Süren sınav iptal edilip yenisi başlatılsın mı?')) return;
      const qs = GENS.map((f) => f()).map((q) => Object.assign(q, { a: +q.a.toPrecision(6) }));
      qs.sort(() => Math.random() - 0.5);
      S.exam = { no: S.exams.length + 1, qs, resp: [], start: Date.now(), done: false };
      save(); render(); Lab.toast('Sınav başladı: 20 soru, 40 dakika. Başarılar!');
    }
    function finish(auto) {
      const ex = S.exam; if (!ex || ex.done) return;
      if (!auto && !confirm('Sınavı bitirip puanlamak istiyor musunuz?')) return;
      ex.res = ex.qs.map((q, i) => { const v = Lab.parse(ex.resp[i] || ''); return isFinite(v) && Math.abs(v - q.a) <= Math.abs(q.a) * 0.02 + (q.abs || 0.001); });
      ex.score = 5 * ex.res.filter(Boolean).length; ex.done = true;
      const used = Math.min(EXDUR, Math.round((Date.now() - ex.start) / 1000));
      S.exams.push({ date: new Date().toLocaleString('tr-TR'), score: ex.score, used });
      save(); render(); hist(); progress();
      Lab.toast((auto ? 'Süre doldu! ' : '') + 'Puanınız: ' + ex.score + '/100', 5000);
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
    { t: 'Bir deneme sınavı <b>başlatın</b>.', test: () => !!S.exam },
    { t: 'En az bir sınavı <b>bitirip puanlatın</b>; yanlışlarınızın doğru değerlerini inceleyin.', test: () => S.exams.length >= 1 },
    { t: 'Bir denemede en az <b>60</b> puan alın.', test: () => S.exams.some((h) => h.score >= 60) },
    { t: 'Bir denemede en az <b>80</b> puanı <b>30 dakikadan kısa</b> sürede alın.', test: () => S.exams.some((h) => h.score >= 80 && h.used < 1800) },
  ]);

  /* ================= RAPOR ================= */
  function buildReport() {
    const sec = { onhaz: 'Ön Hazırlık', d1: 'Görev 1', d2: 'Görev 2', d3: 'Görev 3' };
    let tot = 0, ok = 0;
    const qrows = Object.entries(qids).map(([pg, ids]) => ids.map((id) => {
      const a = S.answers[id]; tot++; if (a && a.ok) ok++;
      const q = $(`[data-qid="${id}"] .qt`); const qt = q ? q.innerHTML : id;
      return `<tr><td class="l">${sec[pg]}</td><td class="l">${qt}</td><td class="l">${a ? a.a : '—'}</td><td>${a ? (a.ok ? '✔' : '✘') : '—'}</td></tr>`;
    }).join('')).join('');
    let sTot = 0, sOk = 0;
    Object.keys(stepDefs).forEach((k) => stepDefs[k].forEach((_, i) => { sTot++; if (S.steps[k + '_' + i]) sOk++; }));
    const fn = (k) => (FAULTS.find((x) => x[0] === k) || ['', k])[1];
    const h1 = S.d1.hist.map((h) => `<tr><td>#${h.n}</td><td class="l">${fn(h.fault)}</td><td class="l">${fn(h.diag)}</td><td>${h.pairs}</td><td>${h.ok ? '✔' : '✘'}</td></tr>`).join('');
    const h3 = S.d3.hist.map((h) => `<tr><td>#${h.n}</td><td>${h.mode === 'scope' ? 'osiloskop' : 'fazör'}</td><td class="l">${TYPES[h.type]} · ${num(h.th, 0)}° · ${num(h.P, 3)} W</td><td class="l">${TYPES[h.ans.ty] || '—'} · ${num(h.ans.th, 1)}° · ${num(h.ans.P, 3)} W</td><td>${h.okType ? '✔' : '✘'}${h.okTh ? '✔' : '✘'}${h.okP ? '✔' : '✘'}</td></tr>`).join('');
    const best = S.exams.reduce((m, h) => Math.max(m, h.score), 0);
    const img = (c) => { try { return `<img src="${c.toDataURL()}" style="width:48%;border:1px solid #ccc">`; } catch (e) { return ''; } };
    const html = `
      <h2 style="margin:0">Devre Kuramı II · Sanal Laboratuvar · Hafta 8 Raporu</h2>
      <p><b>Konu:</b> Ara sınav haftası — AC arıza bulma, faz açısı tasarımı, dalga biçimi/fazör tanıma, süreli deneme sınavı (Bölüm 1–2)</p>
      <table class="data" style="width:auto"><tr><th>Ad Soyad</th><td class="l">${S.st.name || ''}</td><th>No</th><td class="l">${S.st.no || ''}</td><th>Grup</th><td class="l">${S.st.group || ''}</td><th>Tarih</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Özet</h3>
      <p>Föy adımı: <b>${sOk}/${sTot}</b> · Doğru yanıt: <b>${ok}/${tot}</b> · Arıza teşhisi: <b>${S.d1.hist.filter((h) => h.ok).length}/${S.d1.hist.length}</b> · Uygun tasarım: <b>${S.d2.rows.filter((r) => r.pass).length}</b> (ekonomik ${S.d2.rows.filter((r) => r.eco).length}) · Tanıma (tam doğru): <b>${S.d3.hist.filter((h) => h.okType && h.okTh && h.okP).length}/${S.d3.hist.length}</b> · En iyi deneme sınavı: <b>${best}/100</b> (${S.exams.length} deneme)</p>
      <h3>Yanıtlar</h3>
      <table class="data"><thead><tr><th>Bölüm</th><th>Soru</th><th>Yanıt</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Görev 1 · Arıza teşhisleri</h3>
      <table class="data"><thead><tr><th>Kart</th><th>Gerçek arıza</th><th>Teşhis</th><th>Ölçülen çift</th><th></th></tr></thead><tbody>${h1}</tbody></table>
      <h3>Görev 1 · Ölçümler</h3>
      <table class="data"><thead>${$('#d1tab thead').innerHTML}</thead><tbody>${$('#d1tab tbody').innerHTML}</tbody></table>
      <h3>Görev 2 · Değerlendirilen tasarımlar</h3>
      <table class="data"><thead>${$('#d2tab thead').innerHTML}</thead><tbody>${$('#d2tab tbody').innerHTML}</tbody></table>
      <h3>Görev 3 · Tanıma yanıtları</h3>
      <table class="data"><thead><tr><th>Ekran</th><th>Tür</th><th>Gerçek</th><th>Yanıt</th><th>Tür·θ·P</th></tr></thead><tbody>${h3}</tbody></table>
      <h3>Görev 4 · Deneme sınavları</h3>
      <table class="data"><thead><tr><th>#</th><th>Tarih</th><th>Puan</th><th>Süre</th></tr></thead><tbody>${$('#exHist tbody').innerHTML}</tbody></table>
      <h3>Ekran</h3><div>${img($('#scope'))}</div>
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
    if (e.key === 'r' || e.key === 'R') { if (S.page === 'd1') D1.rec(); if (S.page === 'd2') D2.evaluate(); }
  });
  let lastT = 0, lastS = 0;
  function loop(now) {
    if (S.page === 'onbilgi') OBP(now);
    if (S.page === 'd1' && now - lastS > 150) { lastS = now; D1.update(); evalSteps('d1'); }
    if (S.page === 'd2' && now - lastS > 150) { lastS = now; D2.update(); evalSteps('d2'); }
    if (S.page === 'd3') { if (now - lastS > 200) { lastS = now; D3.dirty = true; } D3.update(); evalSteps('d3'); }
    if (now - lastT > 250) { lastT = now; D4.tick(); if (S.page === 'd4') evalSteps('d4'); }
    requestAnimationFrame(loop);
  }
  D1.update(); D2.update(); OBP(0);
  ['d1', 'd2', 'd3', 'd4'].forEach(evalSteps);
  go(S.page); progress(); requestAnimationFrame(loop);
})();

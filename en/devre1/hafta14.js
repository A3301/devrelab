/* Devre Kuramı I · Hafta 14 — Seri RLC Devreleri ve Dönem Tekrarı */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd1h14';
  const S = Object.assign({ answers: {}, steps: {}, d1rows: [], d2rows: [], d3rows: [], d4rows: [], st: {}, page: 'giris', d1seen: {} }, Lab.store.load(KEY));
  Lab.answers = S.answers;
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => Lab.store.save(KEY, S), 300); };
  Lab.onAnswer = () => { save(); progress(); };
  const near = (a, b, t) => Math.abs(a - b) <= t;
  const rel = (a, b, t) => Math.abs(a - b) <= Math.abs(b) * t;

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
  const RLIST = [100, 200, 250, 400, 500, 800, 1000, 2000, 2500, 4000, 5000, 7500, 1e4, 2e4, 5e4];
  const LLIST = [0.01, 0.025, 0.05, 0.1, 0.5, 1, 2.5];
  const CLIST = [1e-8, 2.5e-8, 5e-8, 1e-7, 2e-7, 4e-7, 1e-6];
  const fH = (v) => eng(v, 'H'), fF = (v) => eng(v, 'F');

  /* ---------- şema yardımcıları ---------- */
  const sch = {
    w: (g, pts) => E('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'w' }, g),
    dot: (g, x, y) => E('circle', { cx: x, cy: y, r: 3.5, class: 'node' }, g),
    t: (g, x, y, s, cls = 'lbl', anchor = 'middle') => { const e = E('text', { x, y, class: cls, 'text-anchor': anchor }, g); e.innerHTML = s; return e; },
    rV(g, x, y1, y2) { const n = 6, L = 8, step = (y2 - y1 - 2 * L) / n; let d = `M${x},${y1} v${L}`; for (let i = 0; i < n; i++) d += ` l${i % 2 ? 7 : -7},${step / 2} l${i % 2 ? -7 : 7},${step / 2}`; d += ` L${x},${y2}`; E('path', { d, class: 'w' }, g); },
    lV(g, x, y1, y2) { const m = (y1 + y2) / 2; let d = `M${x},${y1} V${m - 24}`; for (let i = 0; i < 4; i++) d += ' a6,6 0 0 1 0,12'; d += ` V${y2}`; E('path', { d, class: 'w', fill: 'none' }, g); },
    cV(g, x, y1, y2) { const m = (y1 + y2) / 2; E('path', { d: `M${x},${y1} V${m - 5} M${x - 15},${m - 5} h30 M${x - 15},${m + 5} h30 M${x},${m + 5} V${y2}`, class: 'w' }, g); },
    gnd(g, x, y) { E('path', { d: `M${x},${y} v8 M${x - 11},${y + 8} h22 M${x - 7},${y + 13} h14 M${x - 3},${y + 18} h6`, class: 'w' }, g); },
    isrc(g, x, y) { E('circle', { cx: x, cy: y, r: 20, class: 'w', fill: '#fff' }, g); E('path', { d: `M${x},${y + 12} V${y - 12} m-5,7 l5,-7 l5,7`, class: 'w', fill: 'none' }, g); },
    sw(g, x1, x2, y, closed) {
      E('circle', { cx: x1, cy: y, r: 3.5, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g);
      E('circle', { cx: x2, cy: y, r: 3.5, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g);
      return E('line', { x1: x1 + 3, y1: y, x2: closed ? x2 - 3 : x2 - 6, y2: closed ? y : y - 20, class: 'w' }, g);
    },
  };
  // Paralel RLC şeması (akım kaynağı + S + R ‖ L ‖ C). Değer etiketlerini döndürür.
  function parSchem(g, opt = {}) {
    const yT = 55, yB = 205;
    sch.isrc(g, 80, 130); sch.w(g, [[80, 110], [80, yT], [150, yT]]); sch.w(g, [[80, 150], [80, yB], [600, yB]]);
    const swl = sch.sw(g, 150, 200, yT, false); sch.t(g, 175, yT - 26, 'S (t = 0)', 'lbl');
    sch.w(g, [[200, yT], [600, yT]]);
    sch.w(g, [[300, yT], [300, 90]]); sch.rV(g, 300, 90, 170); sch.w(g, [[300, 170], [300, yB]]);
    sch.w(g, [[440, yT], [440, 82]]); sch.lV(g, 440, 82, 150);
    if (opt.rL) { sch.rV(g, 440, 150, 190); sch.w(g, [[440, 190], [440, yB]]); } else sch.w(g, [[440, 150], [440, yB]]);
    sch.w(g, [[580, yT], [580, 100]]); sch.cV(g, 580, 100, 160); sch.w(g, [[580, 160], [580, yB]]);
    [300, 440, 580].forEach((x) => { sch.dot(g, x, yT); sch.dot(g, x, yB); });
    sch.gnd(g, 340, yB);
    E('path', { d: 'M425,95 v18 m-4,-6 l4,6 l4,-6', stroke: '#c62828', 'stroke-width': 2, fill: 'none' }, g);
    sch.t(g, 418, 108, 'i<tspan font-size="10" dy="3">L</tspan>', 'lbl', 'end').style.fill = '#c62828';
    sch.t(g, 640, yT + 4, '+', 'lbl'); sch.t(g, 640, yB - 2, '−', 'lbl'); sch.t(g, 650, 135, 'v', 'lbl', 'start');
    sch.w(g, [[600, yT], [630, yT]]); sch.w(g, [[600, yB], [630, yB]]);
    const tIs = sch.t(g, 110, 135, '', 'lbl', 'start'), tR = sch.t(g, 314, 135, '', 'lbl', 'start'), tL = sch.t(g, 454, 120, '', 'lbl', 'start'), tC = sch.t(g, 600, 136, '', 'lbl', 'start');
    const tMode = sch.t(g, 380, 24, '', 'val'), tWarn = sch.t(g, 380, 238, '', 'val');
    if (opt.rL) sch.t(g, 454, 176, 'r<tspan font-size="10" dy="3">L</tspan>', 'lbl', 'start');
    const tIC = sch.t(g, 600, 182, '', 'val', 'start');
    return { swl, tIs, tR, tL, tC, tMode, tWarn, tIC, setSw(closed) { swl.setAttribute('x2', closed ? 197 : 194); swl.setAttribute('y2', closed ? yT : yT - 20); } };
  }

  /* ---------- fizik: paralel RLC ---------- */
  const params = (R, L, C, rL = 0) => {
    const a = 1 / (2 * R * C), w0 = 1 / Math.sqrt(L * C);
    const kind = Math.abs(a - w0) < 1e-3 * w0 ? 'kritik' : a > w0 ? 'aşırı' : 'az';
    return { a, w0, kind, wd: kind === 'az' ? Math.sqrt(w0 * w0 - a * a) : 0 };
  };
  // x'' + 2αx' + ω0²x = 0 çözümü
  function sol2(a, w0, x0, dx0, t) {
    const d = a * a - w0 * w0;
    if (Math.abs(d) < 1e-6 * w0 * w0) return (dx0 + a * x0) * t * Math.exp(-a * t) + x0 * Math.exp(-a * t);
    if (d > 0) { const b = Math.sqrt(d), s1 = -a + b, s2 = -a - b, A1 = (dx0 - s2 * x0) / (s1 - s2); return A1 * Math.exp(s1 * t) + (x0 - A1) * Math.exp(s2 * t); }
    const wd = Math.sqrt(-d); return Math.exp(-a * t) * (x0 * Math.cos(wd * t) + ((dx0 + a * x0) / wd) * Math.sin(wd * t));
  }
  // Sayısal (RK4) çözüm. p = {Is,R,L,C,rL,I0,V0}; [0,T] aralığında n örnek; anahtar t0’da kapanır.
  function simPar(p, T, n, t0 = 0) {
    const { Is, R, L, C } = p, rL = p.rL || 0;
    const f = (y) => [(y[1] - rL * y[0]) / L, (Is - y[1] / R - y[0]) / C];
    const lam = Math.max(1 / Math.sqrt(L * C), 1 / (R * C), rL / L, 1);
    const dtS = T / (n - 1);
    let m = Math.ceil(dtS / (0.05 / lam)); m = clamp(m, 1, Math.max(1, Math.floor(600000 / n)));
    const t = new Float64Array(n), iL = new Float64Array(n), v = new Float64Array(n);
    let y = [p.I0 || 0, p.V0 || 0];
    for (let i = 0; i < n; i++) {
      t[i] = i * dtS; iL[i] = y[0]; v[i] = y[1];
      const ta = Math.max(t[i], t0), tb = (i + 1) * dtS;
      if (i === n - 1 || tb <= t0) continue;
      const h = (tb - ta) / m;
      for (let k = 0; k < m; k++) {
        const k1 = f(y), k2 = f([y[0] + (h / 2) * k1[0], y[1] + (h / 2) * k1[1]]), k3 = f([y[0] + (h / 2) * k2[0], y[1] + (h / 2) * k2[1]]), k4 = f([y[0] + h * k3[0], y[1] + h * k3[1]]);
        y = [y[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), y[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])];
      }
    }
    return { t, iL, v, n };
  }
  // basamak ölçütleri (yükselen basamak, son değer xf)
  function metrics(t, x, xf, t0 = 0) {
    let mx = -Infinity, tp = NaN, ts = t0;
    for (let i = 0; i < x.length; i++) {
      if (t[i] < t0) continue;
      if (x[i] > mx) { mx = x[i]; tp = t[i] - t0; }
      if (Math.abs(x[i] - xf) > 0.02 * Math.abs(xf)) ts = t[i] - t0;
    }
    const settled = Math.abs(x[x.length - 1] - xf) <= 0.02 * Math.abs(xf) && ts < t[t.length - 1] - t0 - 1e-15;
    return { os: (100 * (mx - xf)) / xf, mx, tp, ts: settled ? ts : NaN };
  }
  const tUnit = (T) => (T < 2e-3 ? [1e6, 'µs'] : [1e3, 'ms']);

  /* ================= GEZİNME / İLERLEME ================= */
  const pages = ['giris', 'onbilgi', 'onhaz', 'd1', 'd2', 'd3', 'd4', 'rapor'];
  const dirty = {};
  function go(p) {
    S.page = p; save();
    $$('section.page').forEach((s) => s.classList.toggle('active', s.id === p));
    $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.p === p));
    dirty[p] = true;
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
      if (!S.steps[id] && ok) { S.steps[id] = true; save(); Lab.toast('✔ Step completed: ' + s.t.replace(/<[^>]+>/g, '').slice(0, 70)); progress(); }
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

  /* ================= osiloskop kurucu ================= */
  const VDIV = [1e-3, 2e-3, 5e-3, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
  const TDIV = [5e-8, 1e-7, 2e-7, 5e-7, 1e-6, 2e-6, 5e-6, 1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3];
  function makeScope(row, id, o) {
    const w = document.createElement('div'); w.className = 'inst dark scopewrap'; w.style.cssText = 'flex:1;min-width:420px';
    w.innerHTML = `<div class="brand"><span>DSO-2C · Digital Oscilloscope</span><span><span class="led on g"></span> SINGLE SHOT · trigger at div 1</span></div>
      <div class="row" style="align-items:flex-start;flex-wrap:nowrap"><canvas id="${id}" width="640" height="400" style="width:100%;max-width:640px"></canvas>
      <div style="min-width:160px"><div class="ctrls"></div><div class="row" style="margin:6px 0"><button class="seg-btn on">CH1</button><button class="seg-btn on">CH2</button><button class="seg-btn">CURSOR</button></div><div class="meas"></div></div></div>`;
    row.appendChild(w);
    const meas = w.querySelector('.meas'), sk = w.querySelector('.ctrls');
    const scope = new Lab.Scope(w.querySelector('canvas'), { onMeasure: (m) => o.onMeasure && o.onMeasure(m, meas) });
    const k1 = new Lab.Knob(sk, { label: 'CH1 V/div', list: VDIV, value: o.v1, dark: true, size: 44, fmt: (v) => eng(v, 'V'), onChange: (v) => { scope.ch[0].vdiv = v; o.set(); } });
    const k2 = new Lab.Knob(sk, { label: 'CH2 V/div', list: VDIV, value: o.v2, dark: true, size: 44, fmt: (v) => eng(v, 'V'), onChange: (v) => { scope.ch[1].vdiv = v; o.set(); } });
    const kt = new Lab.Knob(sk, { label: 'TIME/div', list: TDIV, value: o.td, dark: true, size: 44, fmt: (v) => eng(v, 's'), onChange: (v) => { scope.tdiv = v; o.set(); } });
    scope.ch[0].vdiv = o.v1; scope.ch[1].vdiv = o.v2; scope.tdiv = o.td; scope.ch[0].pos = -3; scope.ch[1].pos = -3;
    const b = w.querySelectorAll('.seg-btn');
    b[0].onclick = () => { scope.ch[0].on = !scope.ch[0].on; b[0].classList.toggle('on'); o.set(); };
    b[1].onclick = () => { scope.ch[1].on = !scope.ch[1].on; b[1].classList.toggle('on'); o.set(); };
    b[2].onclick = () => { scope.cur.on = !scope.cur.on; b[2].classList.toggle('on'); scope.draw(); };
    return { scope, k1, k2, kt, canvas: w.querySelector('canvas') };
  }

  /* ---------- seri devre şema ve fizik ---------- */
  sch.rH = (g, x1, x2, y) => { const n = 6, L = 8, step = (x2 - x1 - 2 * L) / n; let d = `M${x1},${y} h${L}`; for (let i = 0; i < n; i++) d += ` l${step / 2},${i % 2 ? 7 : -7} l${step / 2},${i % 2 ? -7 : 7}`; d += ` L${x2},${y}`; E('path', { d, class: 'w' }, g); };
  sch.lH = (g, x1, x2, y) => { const m = (x1 + x2) / 2; let d = `M${x1},${y} H${m - 24}`; for (let i = 0; i < 4; i++) d += ' a6,6 0 0 1 12,0'; d += ` H${x2}`; E('path', { d, class: 'w', fill: 'none' }, g); };
  sch.vsrc = (g, x, y, ac) => { E('circle', { cx: x, cy: y, r: 20, class: 'w', fill: '#fff' }, g); if (ac) E('path', { d: `M${x - 10},${y} h6 v-9 h8 v18 h6`, class: 'w', fill: 'none' }, g); else { sch.t(g, x, y - 4, '+'); sch.t(g, x, y + 13, '−'); } };
  // Seri RLC şeması: kaynak – (Rg) – R – L – C – dönüş
  function serSchem(g, opt = {}) {
    const yT = 55, yB = 205;
    sch.vsrc(g, 70, 130, opt.ac); sch.w(g, [[70, 110], [70, yT], [110, yT]]); sch.w(g, [[70, 150], [70, yB], [600, yB]]);
    if (opt.sw !== false) { sch.sw(g, 110, 160, yT, true); sch.t(g, 135, yT - 26, opt.swLbl || 'S (t = 0)'); } else sch.w(g, [[110, yT], [160, yT]]);
    sch.w(g, [[160, yT], [190, yT]]); sch.rH(g, 190, 280, yT); sch.w(g, [[280, yT], [330, yT]]); sch.lH(g, 330, 430, yT); sch.w(g, [[430, yT], [600, yT], [600, 100]]);
    sch.cV(g, 600, 100, 160); sch.w(g, [[600, 160], [600, yB]]); sch.gnd(g, 330, yB);
    E('path', { d: 'M210,32 h30 m-6,-4 l6,4 l-6,4', stroke: '#c62828', 'stroke-width': 2, fill: 'none' }, g); sch.t(g, 225, 26, 'i').style.fill = '#c62828';
    sch.t(g, 640, 112, '+'); sch.t(g, 640, 160, '−'); sch.t(g, 650, 138, 'v<tspan font-size="10" dy="3">C</tspan>', 'lbl', 'start');
    return { tS: sch.t(g, 100, 135, '', 'lbl', 'start'), tR: sch.t(g, 235, 85, ''), tL: sch.t(g, 380, 85, ''), tC: sch.t(g, 618, 136, '', 'lbl', 'start'), tMode: sch.t(g, 380, 238, '', 'val') };
  }
  const paramsS = (R, L, C) => { const a = R / (2 * L), w0 = 1 / Math.sqrt(L * C); const kind = Math.abs(a - w0) < 1e-3 * w0 ? 'kritik' : a > w0 ? 'aşırı' : 'az'; return { a, w0, kind, wd: kind === 'az' ? Math.sqrt(w0 * w0 - a * a) : 0 }; };
  // Seri RLC sayısal çözüm: L di/dt = vs(t) − R i − vC, C dvC/dt = i. t∈[t0,t1], n örnek.
  function simSer(p, t0, t1, n, vs) {
    const { R, L, C } = p, f = (t, y) => [(vs(t) - R * y[0] - y[1]) / L, y[0] / C];
    const lam = Math.max(1 / Math.sqrt(L * C), R / L, 1), dtS = (t1 - t0) / (n - 1);
    let m = clamp(Math.ceil(dtS / (0.05 / lam)), 1, Math.max(1, Math.floor(800000 / n)));
    const t = new Float64Array(n), i = new Float64Array(n), vC = new Float64Array(n);
    let y = [p.I0 || 0, p.V0 || 0], tt = t0; const h = dtS / m;
    for (let k = 0; k < n; k++) {
      t[k] = t0 + k * dtS; i[k] = y[0]; vC[k] = y[1];
      if (k === n - 1) break;
      for (let j = 0; j < m; j++) {
        const k1 = f(tt, y), k2 = f(tt + h / 2, [y[0] + (h / 2) * k1[0], y[1] + (h / 2) * k1[1]]), k3 = f(tt + h / 2, [y[0] + (h / 2) * k2[0], y[1] + (h / 2) * k2[1]]), k4 = f(tt + h, [y[0] + h * k3[0], y[1] + h * k3[1]]);
        y = [y[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), y[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])]; tt += h;
      }
    }
    return { t, i, vC, n, y };
  }
  const winOf = (P) => (P.kind === 'aşırı' ? 6 / (P.a - Math.sqrt(P.a * P.a - P.w0 * P.w0)) : P.kind === 'kritik' ? 8 / P.a : Math.min(5 / P.a, (6 * 2 * Math.PI) / P.wd));

  /* ================= ÖN HAZIRLIK ================= */
  numq('onhaz', '#preQ', { id: 'p1', q: '1) Series RLC: R = 200 Ω, L = 50 mH, C = 0.5 µF. What is α in rad/s?', answer: 2000, unit: 'rad/s', explain: 'α = R/(2L) = 200/0.1 = 2000 rad/s.', hint: 'In the series circuit α = R/2L.' });
  mcq('onhaz', '#preQ', { id: 'p2', q: '2) What is the response type of the same circuit?', opts: ['Overdamped', 'Critically damped', 'Underdamped (ω<sub>0</sub> = 6325 rad/s &gt; α)'], correct: 2, explain: 'ω<sub>0</sub> = 1/√(0.05·5×10<sup>−7</sup>) = 6325 rad/s &gt; 2000.', hint: 'Compare α with ω<sub>0</sub>.' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) What R (in Ω) gives critical damping in the same series circuit?', answer: 632.5, tol: 1, unit: 'Ω', explain: 'R = 2√(L/C) = 2√(10<sup>5</sup>) = 632.5 Ω.', hint: 'R/(2L) = 1/√(LC)' });
  mcq('onhaz', '#preQ', { id: 'p4', q: '4) What happens if R → 0 in the series circuit?', opts: ['Damping becomes infinite', 'α → 0: lossless LC, sustained oscillation', 'The circuit becomes overdamped', 'ω<sub>0</sub> becomes zero'], correct: 1, explain: 'In the series circuit R is what dissipates energy; if R = 0 there is no loss. (The parallel formula would give infinity here: a common mistake!)', hint: 'Which element on the single current path produces heat?' });
  numq('onhaz', '#preQ', { id: 'p5', q: '5) In the series RLC step response, if v<sub>C</sub>(0) = 0 and i(0) = 0, what is dv<sub>C</sub>/dt(0<sup>+</sup>) in V/s?', answer: 0, tol: 0, abs: 0.001, unit: 'V/s', explain: 'dv<sub>C</sub>/dt = i/C and i(0<sup>+</sup>) = 0 (the inductor current cannot change abruptly).', hint: 'i = C dv<sub>C</sub>/dt' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) With the same L and C, can you make a parallel and a series circuit critically damped at the same time with the same R?', opts: ['Yes, with R = √(L/C)', 'No: parallel R = ½√(L/C), series R = 2√(L/C); they differ by a factor of 4', 'Yes, for any R', 'Only if L = C'], correct: 1, explain: 'The parallel critical resistance is ¼ of the series critical resistance.', hint: 'Write the two critical conditions side by side.' });

  /* ================= DENEY 1 · seri ve paralel yan yana ================= */
  const RL14 = [100, 200, 250, 400, 500, 560, 800, 1000, 2000, 2500, 4000, 5000, 1e4];
  const LL14 = [0.01, 0.025, 0.05, 0.1, 0.5, 1, 2.5], CL14 = [1e-8, 2.5e-8, 1e-7, 2e-7, 4e-7, 1e-6];
  const D1 = (() => {
    const self = { mode: S.d1mode || 'nat' };
    const set = () => (dirty.d1 = true);
    const box = $('#d1inst');
    const src = inst(box, 'SOURCE / INITIAL', true); const srcL = lcd(src.el, 'V<sub>s</sub> · V<sub>0</sub>', 'V', 100);
    const kV = new Lab.Knob(src.c, { label: "V", min: 0, max: 100, step: 1, value: 48, dark: true, fmt: (v) => num(v, 0) + ' V', onChange: set });
    const mb = document.createElement('div'); mb.className = 'row'; mb.style.gap = '4px';
    mb.innerHTML = `<button class="seg-btn" data-m="nat">Natural</button><button class="seg-btn" data-m="step">Step</button>`; src.c.appendChild(mb);
    const mset = () => $$('button', mb).forEach((b) => b.classList.toggle('on', b.dataset.m === self.mode));
    $$('button', mb).forEach((b) => (b.onclick = () => { self.mode = b.dataset.m; S.d1mode = self.mode; save(); mset(); set(); })); mset();
    const eb = inst(box, 'SHARED COMPONENT BOXES', false, 'same for both circuits');
    const kR = new Lab.Knob(eb.c, { label: 'R', list: RL14, value: 500, fmt: Lab.ohm, onChange: set });
    const kL = new Lab.Knob(eb.c, { label: 'L', list: LL14, value: 0.1, fmt: fH, onChange: set });
    const kC = new Lab.Knob(eb.c, { label: 'C', list: CL14, value: 4e-7, fmt: fF, onChange: set });
    const scS = serSchem($('#d1schS')), scP = parSchem($('#d1schP')); scP.setSw(true);
    const pS = new Lab.Plot($('#d1plotS'), { xlabel: 't', ylabel: '' }), pP = new Lab.Plot($('#d1plotP'), { xlabel: 't', ylabel: '' });
    $('#d1cur').oninput = set;
    self.c = () => ({ V: kV.value, R: kR.value, L: kL.value, C: kC.value, mode: self.mode });
    self.update = () => {
      if (!dirty.d1) return; dirty.d1 = false;
      const c = self.c(), nat = c.mode === 'nat', n = 601, fr = $('#d1cur').value / 1000;
      srcL(num(c.V, 0));
      scS.tS.textContent = nat ? 'v_C(0) = ' + num(c.V, 0) + ' V' : 'V_s = ' + num(c.V, 0) + ' V'; scS.tR.textContent = 'R = ' + Lab.ohm(c.R); scS.tL.textContent = 'L = ' + fH(c.L); scS.tC.textContent = 'C = ' + fF(c.C);
      scS.tMode.textContent = nat ? 'Source shorted, C starts charged' : 'Starts at rest, V_s step';
      scP.tIs.textContent = nat ? 'I_s = 0' : 'I_s = 10 mA'; scP.tR.textContent = 'R = ' + Lab.ohm(c.R); scP.tL.textContent = 'L = ' + fH(c.L); scP.tC.textContent = 'C = ' + fF(c.C);
      scP.tIC.textContent = nat ? 'v(0) = ' + num(c.V, 0) + ' V' : ''; scP.tMode.textContent = nat ? 'Natural response' : 'Step, starting at rest';
      // seri
      const PS = paramsS(c.R, c.L, c.C), TS = winOf(PS), [kS, uS] = tUnit(TS);
      const rs = simSer({ R: c.R, L: c.L, C: c.C, V0: nat ? c.V : 0 }, 0, TS, n, () => (nat ? 0 : c.V));
      const yS = nat ? rs.i.map((x) => x * 1e3) : rs.vC;
      // paralel
      const PP = params(c.R, c.L, c.C), TP = winOf(PP), [kP, uP] = tUnit(TP);
      const rp = simPar({ Is: nat ? 0 : 0.01, R: c.R, L: c.L, C: c.C, V0: nat ? c.V : 0 }, TP, n, 0);
      const yP = nat ? rp.v : rp.iL.map((x) => x * 1e3);
      const ix = Math.round(fr * (n - 1));
      self.curv = { tS: rs.t[ix], yS: yS[ix], tP: rp.t[ix], yP: yP[ix] };
      const draw = (pl, t, y, k, u, lab, col, xc) => {
        const pts = []; for (let i = 0; i < n; i++) pts.push([t[i] * k, y[i]]);
        let lo = Math.min(0, ...y), hi = Math.max(0, ...y); const pad = (hi - lo) * 0.08 + 1e-9; lo -= pad; hi += pad;
        pl.o.xlabel = 't (' + u + ')'; pl.o.ylabel = lab;
        pl.draw([{ pts, line: true, color: col, width: 2.4 }, { pts: [[xc * k, lo], [xc * k, hi]], line: true, color: '#d63ad0', dash: [4, 4], width: 1.2 }], [0, t[n - 1] * k], [lo, hi]);
      };
      draw(pS, rs.t, yS, kS, uS, nat ? 'i (mA)' : 'v_C (V)', '#0b5cad', rs.t[ix]);
      draw(pP, rp.t, yP, kP, uP, nat ? 'v (V)' : 'i_L (mA)', '#c62828', rp.t[ix]);
      $('#d1curTxt').innerHTML = `Series: t = ${num(rs.t[ix] * kS, 2)} ${uS}, ${nat ? 'i' : 'v<sub>C</sub>'} = ${num(yS[ix], 3)} ${nat ? 'mA' : 'V'} &nbsp;|&nbsp; Parallel: t = ${num(rp.t[ix] * kP, 2)} ${uP}, ${nat ? 'v' : 'i<sub>L</sub>'} = ${num(yP[ix], 3)} ${nat ? 'V' : 'mA'}`;
      self.seen = self.seen || {}; self.seen[c.mode + c.R + '_' + c.L + '_' + c.C] = true;
    };
    const tbody = $('#d1tab tbody');
    function table() { tbody.innerHTML = S.d1rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.mode === 'nat' ? 'natural' : 'step'}</td><td>${num(r.V, 0)} V</td><td>${Lab.ohm(r.R)}</td><td>${fH(r.L)}</td><td>${fF(r.C)}</td><td>${eng(r.tS, 's')}</td><td>${num(r.yS, 3)}</td><td>${eng(r.tP, 's')}</td><td>${num(r.yP, 3)}</td></tr>`).join(''); }
    self.rec = () => { S.d1rows.push(Object.assign(self.c(), self.curv)); save(); table(); Lab.toast('Recorded: cursor values of both circuits.'); };
    $('#d1rec').onclick = self.rec;
    $('#d1del').onclick = () => { S.d1rows.pop(); save(); table(); };
    $('#d1csv').onclick = () => Lab.downloadCSV('week14_experiment1.csv', ['#', 'mode', 'V', 'R', 'L', 'C', 't series (s)', 'series value', 't parallel (s)', 'parallel value'], S.d1rows.map((r, i) => [i + 1, r.mode, r.V, r.R, r.L, r.C, r.tS, r.yS, r.tP, r.yP]));
    table(); set();
    Object.assign(self, { kV, kR, kL, kC });
    return self;
  })();
  steps('d1', [
    { t: 'Example 4.16 (natural): <b>V<sub>0</sub> = 100 V, R = 500 Ω, L = 100 mH, C = 0.4 µF</b>. Put the cursor at the largest amplitude of the series current and record.', test: () => S.d1rows.some((r) => r.mode === 'nat' && r.V === 100 && r.R === 500 && r.L === 0.1 && r.C === 4e-7 && near(Math.abs(r.yS), 109, 3) && near(r.tS, 242e-6, 12e-6)) },
    { t: 'With the same settings look at the parallel circuit: which type is it with the same R? Record another row.', test: () => S.d1rows.filter((r) => r.mode === 'nat' && r.R === 500 && r.L === 0.1 && r.C === 4e-7).length >= 2 },
    { t: 'Example 4.6 (step): <b>V<sub>s</sub> = 48 V, R = 560 Ω, L = 100 mH, C = 0.1 µF</b>. Measure and record the first peak of v<sub>C</sub>.', test: () => S.d1rows.some((r) => r.mode === 'step' && r.V === 48 && r.R === 560 && r.L === 0.1 && r.C === 1e-7 && near(r.yS, 67.2, 1) && near(r.tS, 327e-6, 12e-6)) },
    { t: 'In the same circuit set the R that makes the series response <b>critically damped</b>. How does the parallel circuit behave at this R?', test: () => { const c = D1.c(); return c.mode === 'step' && c.R === 2000 && c.L === 0.1 && c.C === 1e-7; } },
    { t: 'Set R to its smallest (100 Ω) and largest (10 kΩ) values: do the two circuits change in <b>opposite</b> directions?', test: () => D1.seen && Object.keys(D1.seen).some((k) => /^(nat|step)100_/.test(k)) && Object.keys(D1.seen).some((k) => /^(nat|step)10000_/.test(k)) },
    { t: 'Record <b>at least 5</b> measurements in total.', test: () => S.d1rows.length >= 5 },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: 'What is α of the series circuit in Example 4.16, in rad/s?', answer: 2500, unit: 'rad/s', explain: 'α = 500/(2·0.1) = 2500 rad/s; ω<sub>0</sub> = 5000 → underdamped.', hint: 'α = R/2L' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'What largest current amplitude (in mA) did you measure?', answer: 109, tol: 3, unit: 'mA', explain: 'i(t) = −231e<sup>−2500t</sup>sin(4330t) mA; tan ω<sub>d</sub>t = ω<sub>d</sub>/α → t = 242 µs, |i| = 109 mA.', hint: 'Put the cursor at the deepest point of the series current curve.' });
  numq('d1', '#d1Q', { id: 'd1q3', q: 'What largest capacitor voltage (in V) did you measure in Example 4.6?', answer: 67.2, tol: 1.5, unit: 'V', explain: 'v<sub>C</sub> = 48 + 48e<sup>−2800·327µ</sup> = 67.2 V (40% overshoot).', hint: 'The first peak is at ω<sub>d</sub>t = π.' });
  numq('d1', '#d1Q', { id: 'd1q4', q: 'What is the series critical resistance of the Example 4.6 circuit in Ω?', answer: 2000, tol: 1, unit: 'Ω', explain: 'R = 2√(L/C) = 2√(0.1/10<sup>−7</sup>) = 2000 Ω.', hint: 'R = 2√(L/C)' });
  mcq('d1', '#d1Q', { id: 'd1q5', q: 'What did you observe when R was increased?', opts: ['Damping increased in both circuits', 'Damping increased in the series circuit and decreased in the parallel circuit', 'It decreased in the series circuit and increased in the parallel', 'Neither changed'], correct: 1, explain: 'In series α = R/2L (proportional to R), in parallel α = 1/2RC (inversely proportional to R).', hint: 'Compare the two α formulas.' });
  mcq('d1', '#d1Q', { id: 'd1q6', q: 'Why is ω<sub>0</sub> the same in both circuits?', opts: ['Coincidence', 'ω<sub>0</sub> = 1/√(LC) depends only on L and C; R sets only the damping', 'Because R is the same', 'Because the source is the same'], correct: 1, explain: 'Energy swings back and forth between L and C; its rate is set by L and C.', hint: 'Does the ω<sub>0</sub> formula contain R?' });

  /* ================= DENEY 2 · Kare dalga ile çınlama ================= */
  const D2 = (() => {
    const self = { lowZ: S.d2lowZ !== false };
    const set = () => (dirty.d2 = true);
    const box = $('#d2inst');
    const fg = inst(box, 'FG-100 SQUARE-WAVE GENERATOR', true, '0–5 V'); const fgL = lcd(fg.el, 'f · output impedance', '', 170);
    const kf = new Lab.Knob(fg.c, { label: 'Frequency', min: 1e4, max: 1e6, log: true, value: 1e5, dark: true, fmt: (v) => eng(v, 'Hz'), onChange: set });
    const zb = document.createElement('button'); zb.className = 'seg-btn'; zb.style.cssText = 'width:130px;padding:8px'; fg.c.appendChild(zb);
    const zt = () => { zb.textContent = self.lowZ ? 'Driver: 5 Ω (logic)' : 'Driver: 50 Ω'; zb.classList.toggle('on', !self.lowZ); };
    zb.onclick = () => { self.lowZ = !self.lowZ; S.d2lowZ = self.lowZ; save(); zt(); set(); }; zt();
    const hb = inst(box, 'LINE MODEL', false, 'cable L + load C');
    const kL = new Lab.Knob(hb.c, { label: 'L line', list: [2.5e-7, 5e-7, 1e-6, 2e-6, 5e-6], value: 1e-6, fmt: fH, onChange: set });
    const kC = new Lab.Knob(hb.c, { label: 'C load', list: [1e-10, 2.2e-10, 4.7e-10, 1e-9, 2.2e-9, 4.7e-9], value: 1e-9, fmt: fF, onChange: set });
    const rb = inst(box, 'DAMPING RESISTOR R<sub>d</sub>', false); const rdL = lcd(rb.el, 'R<sub>d</sub>', 'Ω', 80);
    const kRd = new Lab.Knob(rb.c, { label: 'R_d', min: 0, max: 150, step: 0.5, value: 0, fmt: (v) => num(v, 1) + ' Ω', onChange: set });
    const sc = serSchem($('#d2sch'), { ac: true, sw: false });
    sch.t($('#d2sch'), 70, 30, 'CH1', 'lbl').style.fill = '#b8960a'; sch.t($('#d2sch'), 690, 138, 'CH2', 'lbl', 'start').style.fill = '#1592b8';
    function showMeas(m, el) {
      if (!m) return; self.meas = m;
      let h = `<span style="color:#f2d21b">CH1</span> Vpp ${eng(m.ch[0].vpp, 'V')}<br><span style="color:#27c4f0">CH2</span> max ${eng(m.ch[1].max, 'V')}`;
      if (m.cur) h += `<br><span style="color:#ff7cf0">CURSOR</span> Δt ${eng(m.cur.dt, 's')}<br>1/Δt ${eng(1 / Math.abs(m.cur.dt || 1e-30), 'Hz')}<br>CH2 a ${num(m.cur.v2a, 3)} V<br>CH2 b ${num(m.cur.v2b, 3)} V`;
      el.innerHTML = h;
    }
    const sco = makeScope($('#d2scopeRow'), 'd2scope', { v1: 2, v2: 2, td: 5e-7, set, onMeasure: showMeas });
    sco.scope.ch[0].pos = 0; sco.scope.ch[1].pos = -3;
    self.c = () => ({ Rg: self.lowZ ? 5 : 50, Rd: kRd.value, L: kL.value, C: kC.value, f: kf.value, r: 1 });
    self.update = () => {
      if (!dirty.d2) return; dirty.d2 = false;
      const c = self.c(), td = sco.scope.tdiv, P = 1 / c.f, Rt = c.Rg + c.r + c.Rd;
      fgL(eng(c.f, 'Hz') + ' · ' + c.Rg + ' Ω'); rdL(num(c.Rd, 1));
      sc.tS.textContent = 'R_g = ' + c.Rg + ' Ω'; sc.tR.textContent = 'R_d = ' + num(c.Rd, 1) + ' Ω'; sc.tL.textContent = 'L = ' + fH(c.L); sc.tC.textContent = 'C = ' + fF(c.C);
      sc.tMode.textContent = 'source → line (L) → load (C)';
      const vg = (t) => (((t / P) % 1) + 1) % 1 < 0.5 ? 5 : 0;
      // yükselen kenar ekranda t = td’de: üç periyot önceden başla
      const pre = simSer({ R: Rt, L: c.L, C: c.C }, -3 * P - td, -td, 1200, vg);
      const n = 1000, r = simSer({ R: Rt, L: c.L, C: c.C, I0: pre.y[0], V0: pre.y[1] }, -td, 9 * td, n, vg);
      const y1 = new Float64Array(n); for (let k = 0; k < n; k++) y1[k] = vg(r.t[k]) - c.Rg * r.i[k];
      sco.scope.draw({ n, y: [y1, r.vC] });
      let mx = 0; for (const v of r.vC) mx = Math.max(mx, v); self.os = (100 * (mx - 5)) / 5;
      const a = Rt / (2 * c.L), w0 = 1 / Math.sqrt(c.L * c.C); self.Td = a < w0 ? (2 * Math.PI) / Math.sqrt(w0 * w0 - a * a) : NaN;
    };
    const tbody = $('#d2tab tbody');
    function table() { tbody.innerHTML = S.d2rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.Rg} Ω</td><td>${num(r.Rd, 1)} Ω</td><td>${fH(r.L)}</td><td>${fF(r.C)}</td><td>${r.dt != null ? eng(r.dt, 's') : '—'}</td><td>${num(r.max, 3)}</td></tr>`).join(''); }
    self.rec = () => {
      const m = sco.scope.measure(); const c = self.c();
      S.d2rows.push(Object.assign(c, { dt: m && m.cur ? m.cur.dt : null, max: m ? m.ch[1].max : NaN, os: self.os, Td: self.Td })); save(); table();
      Lab.toast('Recorded: CH2 max ' + num(m.ch[1].max, 3) + ' V');
    };
    $('#d2rec').onclick = self.rec;
    $('#d2del').onclick = () => { S.d2rows.pop(); save(); table(); };
    $('#d2csv').onclick = () => Lab.downloadCSV('week14_experiment2.csv', ['#', 'Rg (ohm)', 'Rd (ohm)', 'L (H)', 'C (F)', 'dt (s)', 'CH2 max (V)'], S.d2rows.map((r, i) => [i + 1, r.Rg, r.Rd, r.L, r.C, r.dt == null ? '' : r.dt, r.max]));
    table(); set();
    Object.assign(self, { kf, kL, kC, kRd, sco });
    return self;
  })();
  const d2std = (r) => r.L === 1e-6 && r.C === 1e-9;
  steps('d2', [
    { t: '<b>5 Ω driver, L = 1 µH, C = 1 nF, R<sub>d</sub> = 0</b>. Set the time base to ≤ 0.2 µs/div and observe the ringing on CH2.', test: () => { const c = D2.c(); return c.Rg === 5 && d2std(c) && c.Rd === 0 && D2.sco.scope.tdiv <= 2e-7; } },
    { t: 'Measure and record the ringing period by placing the CURSORs on two successive peaks.', test: () => S.d2rows.some((r) => r.Rg === 5 && d2std(r) && r.Rd === 0 && r.dt != null && isFinite(r.Td) && rel(Math.abs(r.dt), r.Td, 0.05)) },
    { t: 'Set R<sub>d</sub> to the value (±3 Ω) that makes the response <b>critically damped</b>, and record.', test: () => S.d2rows.some((r) => r.Rg === 5 && d2std(r) && near(r.Rd + r.Rg + r.r, 2 * Math.sqrt(1e3), 3)) },
    { t: 'Choose R<sub>d</sub> so that the overshoot is <b>4–6%</b>, and record.', test: () => S.d2rows.some((r) => r.Rg === 5 && d2std(r) && r.os >= 4 && r.os <= 6) },
    { t: 'Set the driver to <b>50 Ω</b> and record with R<sub>d</sub> = 0. Where did the ringing go?', test: () => S.d2rows.some((r) => r.Rg === 50 && d2std(r) && r.Rd === 0) },
  ]);
  const Z0 = Math.sqrt(1e-6 / 1e-9), a5 = 6 / 2e-6, wd5 = Math.sqrt(1e15 - a5 * a5);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'What ringing frequency f<sub>d</sub> (in MHz) did you measure?', answer: wd5 / (2 * Math.PI) / 1e6, tol: 4, unit: 'MHz', explain: 'α = 6 Ω/(2·1 µH) = 3×10<sup>6</sup>, ω<sub>0</sub> = 3.16×10<sup>7</sup> → f<sub>d</sub> ≈ 5.01 MHz ≈ f<sub>0</sub>.', hint: '1/Δt (two successive peaks).' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'With R<sub>d</sub> = 0 (5 Ω driver), what is the percentage overshoot approximately?', answer: 100 * Math.exp((-a5 * Math.PI) / wd5), tol: 5, unit: '%', explain: '%OS = 100e<sup>−απ/ω<sub>d</sub></sup> ≈ 74%: the 5 V logic signal shoots up to 8.7 V and the receiver input may be damaged.', hint: '(CH2 max − 5 V)/5 V' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 'What must R<sub>d</sub> be (in Ω) for critical damping? (driver 5 Ω, line resistance 1 Ω)', answer: 2 * Z0 - 6, tol: 4, unit: 'Ω', explain: 'R<sub>tot</sub> = 2√(L/C) = 63.2 Ω → R<sub>d</sub> = 63.2 − 6 = 57.2 Ω.', hint: 'Series circuit: R = 2√(L/C), where R includes all series resistances.' });
  numq('d2', '#d2Q', { id: 'd2q4', q: 'What must R<sub>d</sub> be (in Ω) for 5% overshoot? (ζ = 0.69)', answer: 2 * 0.6901 * Z0 - 6, tol: 5, unit: 'Ω', explain: 'R<sub>tot</sub> = 2ζ√(L/C) = 43.6 Ω → R<sub>d</sub> ≈ 37.6 Ω. Faster edge, small overshoot.', hint: 'α = ζω<sub>0</sub> and α = R<sub>tot</sub>/2L.' });
  mcq('d2', '#d2Q', { id: 'd2q5', q: 'Why did the ringing almost disappear with the 50 Ω output generator?', opts: ['The frequency changed', 'The generator’s 50 Ω internal resistance acted as a series damping resistor (R<sub>tot</sub> ≈ 51 Ω, close to critical)', 'C decreased', 'The oscilloscope filtered it'], correct: 1, explain: 'On fast digital lines the 22–47 Ω “series termination” resistor placed at the driver output does exactly this job.', hint: 'In the series circuit α = R/2L; R includes the generator resistance.' });

  /* ================= DENEY 3 · Ateşleme bobini ================= */
  const D3 = (() => {
    const self = {}, Vb = 12, Lp = 5e-3, rp = 1.5, N = 100, Vsp = 15000;
    const set = () => (dirty.d3 = true);
    const box = $('#d3inst');
    const bt = inst(box, 'BATTERY 12 V · BREAKER', true); const btL = lcd(bt.el, 'dwell time', 'ms', 110);
    const kDw = new Lab.Knob(bt.c, { label: 'Dwell', min: 0.2, max: 10, step: 0.1, value: 3, dark: true, fmt: (v) => num(v, 1) + ' ms', onChange: set });
    const kRb = new Lab.Knob(bt.c, { label: 'Balast R', min: 0, max: 3, step: 0.1, value: 1.5, dark: true, fmt: (v) => num(v, 1) + ' Ω', onChange: set });
    const cb = inst(box, 'CAPACITOR (across breaker)', false);
    const kC = new Lab.Knob(cb.c, { label: 'C', list: [1e-9, 2.2e-8, 4.7e-8, 1e-7, 2.2e-7, 4.7e-7, 1e-6], value: 2.2e-7, fmt: (v) => (v <= 1e-9 ? 'none (1 nF stray)' : fF(v)), onChange: set });
    const hv = inst(box, 'HV PROBE 1000:1', true, 'secondary'); const hvL = lcd(hv.el, 'secondary peak', 'kV', 110);
    const g = $('#d3sch');
    const sc = serSchem(g, { sw: true, swLbl: 'breaker (opens at t = 0)' }); sc.tS.textContent = 'battery 12 V';
    sc.tL.textContent = 'L_p = 5 mH (r = 1.5 Ω)'; sc.tMode.textContent = 'Primary circuit · secondary turns ratio N = 100, spark-plug threshold ≈ 15 kV';
    const pI = new Lab.Plot($('#d3plotI'), { xlabel: 't (ms)', ylabel: 'i_p (A)' }), pV = new Lab.Plot($('#d3plotV'), { xlabel: 't (µs)', ylabel: 'v_C primary (V)' });
    self.c = () => ({ dw: kDw.value * 1e-3, Rb: kRb.value, C: kC.value });
    self.update = () => {
      if (!dirty.d3) return; dirty.d3 = false;
      const c = self.c(), R = rp + c.Rb, tau = Lp / R, Iinf = Vb / R, I0 = Iinf * (1 - Math.exp(-c.dw / tau));
      btL(num(kDw.value, 1)); sc.tR.textContent = 'R_b = ' + num(c.Rb, 1) + ' Ω'; sc.tC.textContent = 'C = ' + (c.C <= 1e-9 ? 'stray 1 nF' : fF(c.C));
      const ptsI = []; for (let k = 0; k <= 200; k++) { const t = (k / 200) * c.dw; ptsI.push([t * 1e3, Iinf * (1 - Math.exp(-t / tau))]); }
      pI.draw([{ pts: ptsI, line: true, color: '#0b5cad', width: 2.4 }], [0, Math.max(c.dw * 1e3, 1)], [0, Math.max(Iinf * 1.1, 0.5)]);
      const w0 = 1 / Math.sqrt(Lp * c.C), T = Math.min((3 * 2 * Math.PI) / w0, 2e-3), n = 800;
      const r = simSer({ R, L: Lp, C: c.C, I0 }, 0, T, n, () => Vb);
      let vmax = 0, t300 = NaN; for (let k = 0; k < n; k++) { vmax = Math.max(vmax, r.vC[k]); if (isNaN(t300) && r.vC[k] >= 300) t300 = r.t[k]; }
      const pts = []; for (let k = 0; k < n; k++) pts.push([r.t[k] * 1e6, r.vC[k]]);
      pV.draw([{ pts, line: true, color: '#c62828', width: 2.2 }], [0, T * 1e6], [Math.min(...r.vC) * 1.1 - 10, vmax * 1.1 + 10]);
      const sec = (N * vmax) / 1e3, spark = N * vmax >= Vsp, arc = !isNaN(t300) && t300 < 2e-6;
      hvL(spark ? num(Vsp / 1e3, 1) + ' ⚡' : num(sec, 1), 'kV');
      self.st = { I0, vmax, sec, spark, arc, tau };
      $('#d3stat').innerHTML = (spark ? '<b style="color:#1a8a4a">⚡ Spark at the plug</b> (the secondary broke down at ≈15 kV; the open-circuit value would be higher)' : '<b style="color:#c62828">No spark</b>: the secondary voltage did not reach the plug threshold') +
        (arc ? '<br><b style="color:#c62828">⚠ Breaker arc:</b> the voltage exceeded 300 V while the contacts were only a few µm apart; energy burns at the contact, the breaker wears and the spark weakens.' : '');
    };
    const tbody = $('#d3tab tbody');
    function table() { tbody.innerHTML = S.d3rows.map((r, i) => `<tr><td>${i + 1}</td><td>${num(r.dw * 1e3, 1)}</td><td>${num(r.Rb, 1)}</td><td>${r.C <= 1e-9 ? 'none' : fF(r.C)}</td><td>${r.spark ? 'yes' : 'no'}</td><td>${r.arc ? 'YES' : '—'}</td><td>${r.spark ? '≥ 15' : num(r.sec, 1)}</td></tr>`).join(''); }
    self.rec = () => { const c = self.c(); S.d3rows.push(Object.assign(c, { spark: self.st.spark, arc: self.st.arc, sec: self.st.sec })); save(); table(); Lab.toast('Recorded.'); };
    $('#d3rec').onclick = self.rec;
    $('#d3del').onclick = () => { S.d3rows.pop(); save(); table(); };
    $('#d3csv').onclick = () => Lab.downloadCSV('week14_experiment3.csv', ['#', 'dwell (ms)', 'Rb (ohm)', 'C (F)', 'spark', 'breaker arc', 'secondary (kV)'], S.d3rows.map((r, i) => [i + 1, r.dw * 1e3, r.Rb, r.C, r.spark ? 'yes' : 'no', r.arc ? 'yes' : 'no', +r.sec.toFixed(2)]));
    table(); set();
    Object.assign(self, { kDw, kRb, kC, plotCanvas: $('#d3plotV') });
    return self;
  })();
  steps('d3', [
    { t: 'R<sub>b</sub> = 1.5 Ω, C = 0.22 µF. Choose the dwell time long enough for the primary current to reach <b>95%</b> of its final value (≥ 3τ), and record.', test: () => S.d3rows.some((r) => near(r.Rb, 1.5, 0.01) && r.C === 2.2e-7 && r.dw >= 3 * (5e-3 / 3) - 1e-5) },
    { t: '<b>Remove</b> the capacitor (none: 1 nF stray) and record. What happens at the breaker?', test: () => S.d3rows.some((r) => r.C <= 1e-9) },
    { t: 'With C = 0.22 µF reduce the dwell time to <b>0.5 ms</b> (high engine speed) and record.', test: () => S.d3rows.some((r) => r.C === 2.2e-7 && r.dw <= 0.5e-3 + 1e-6) },
    { t: 'Try the <b>largest C</b> that still gives a spark (record with C = 1 µF). Why is too much also bad?', test: () => S.d3rows.some((r) => r.C === 1e-6) },
    { t: 'Record <b>at least 5</b> measurements in total.', test: () => S.d3rows.length >= 5 },
  ]);
  numq('d3', '#d3Q', { id: 'd3q1', q: 'With R<sub>b</sub> = 1.5 Ω, what is the time constant τ = L/R of the primary circuit in ms?', answer: 5 / 3, tol: 2, unit: 'ms', explain: 'R = 1.5 + 1.5 = 3 Ω → τ = 5 mH/3 Ω = 1.67 ms.', hint: 'The winding resistance is also in series.' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'With a 3 ms dwell time, what is the primary current I<sub>0</sub> (in A) at the instant the breaker opens?', answer: 4 * (1 - Math.exp(-1.8)), tol: 2, unit: 'A', explain: 'I<sub>0</sub> = 4(1 − e<sup>−3/1.667</sup>) = 3.34 A.', hint: 'First-order RL charging (Section 3).' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'With C = 0.22 µF, what is the primary ringing frequency in Hz after the breaker opens?', answer: 1 / (2 * Math.PI * Math.sqrt(5e-3 * 2.2e-7)), tol: 3, unit: 'Hz', explain: 'α = 300 ≪ ω<sub>0</sub> = 30 151 rad/s → f ≈ 4.8 kHz.', hint: 'f<sub>0</sub> = 1/(2π√(LC))' });
  numq('d3', '#d3Q', { id: 'd3q4', q: 'Assuming no losses, for I<sub>0</sub> = 4 A, C = 0.22 µF, what is the primary voltage amplitude I<sub>0</sub>√(L/C) in V?', answer: 4 * Math.sqrt(5e-3 / 2.2e-7), tol: 2, unit: 'V', explain: '½LI<sub>0</sub>² = ½Cv²  → v = I<sub>0</sub>√(L/C) ≈ 603 V; ×100 on the secondary ≈ 60 kV (the plug breaks down at 15 kV).', hint: 'The coil energy is transferred entirely to the capacitor.' });
  mcq('d3', '#d3Q', { id: 'd3q5', q: 'Why is the capacitor fitted?', opts: ['To charge the battery', 'To slow the voltage rise while the breaker opens and prevent arcing at the contact; to transfer the energy to the plug by LC oscillation', 'To increase the frequency', 'To draw current'], correct: 1, explain: 'Without C, v = L di/dt rises while the contacts separate and the arc burns the energy. Too large a C lowers the peak voltage I<sub>0</sub>√(L/C).', hint: 'Read the on-screen warning without C.' });
  mcq('d3', '#d3Q', { id: 'd3q6', q: 'Why does the spark weaken at high engine speed (short dwell time)?', opts: ['The battery voltage drops', 'In a time short compared with τ the coil current cannot reach its final value; the stored energy ½LI<sub>0</sub>² decreases', 'C increases', 'The frequency drops'], correct: 1, explain: 'This is why electronic ignition adjusts the dwell time to engine speed (dwell control).', hint: 'Look at I<sub>0</sub> and the energy formula.' });

  /* ================= DENEY 4 · Dönem sonu karma tekrar ================= */
  const D4 = (() => {
    const self = {};
    const R3 = (x) => +x.toPrecision(3);
    if (!S.d4) S.d4 = { n: 0, ok: 0, okS: 0, okP: 0, okK: 0, cur: null, hist: [] };
    function newQ() {
      const L = LL14[Math.floor(Math.random() * LL14.length)], C = CL14[Math.floor(Math.random() * CL14.length)];
      const top = Math.random() < 0.5 ? 's' : 'p', kind = ['aşırı', 'kritik', 'az'][Math.floor(Math.random() * 3)];
      const z = Math.sqrt(L / C), f = 1.5 + Math.random() * 3;
      let R = top === 's' ? 2 * z : z / 2;
      if (kind === 'aşırı') R = top === 's' ? R * f : R / f; if (kind === 'az') R = top === 's' ? R / f : R * f;
      if (kind !== 'kritik') R = R3(R); const mode = Math.random() < 0.5 ? 'natural' : 'step';
      S.d4.cur = { top, L, C, R, kind, mode, done: false }; save(); show();
    }
    const plot = new Lab.Plot($('#d4plot'), { xlabel: 't', ylabel: '' });
    function show() {
      const q = S.d4.cur; if (!q) return;
      $('#d4sch').innerHTML = '';
      if (q.top === 's') { const s = serSchem($('#d4sch')); s.tR.textContent = 'R = ' + Lab.ohm(q.R); s.tL.textContent = 'L = ' + fH(q.L); s.tC.textContent = 'C = ' + fF(q.C); s.tS.textContent = q.mode === 'natural' ? 'v_C(0) = 10 V, source 0' : 'V_s = 10 V, at rest'; s.tMode.textContent = 'SERIES RLC · ' + q.mode + ' response'; }
      else { const p = parSchem($('#d4sch')); p.setSw(true); p.tR.textContent = 'R = ' + Lab.ohm(q.R); p.tL.textContent = 'L = ' + fH(q.L); p.tC.textContent = 'C = ' + fF(q.C); p.tIs.textContent = q.mode === 'natural' ? 'I_s = 0' : 'I_s = 10 mA'; p.tIC.textContent = q.mode === 'natural' ? 'v(0) = 10 V' : ''; p.tMode.textContent = 'PARALLEL RLC · ' + q.mode + ' response'; }
      $('#d4fb').innerHTML = q.done ? q.fb : 'Select the response type and enter α.';
      $('#d4score').textContent = `Correct: ${S.d4.ok} / ${S.d4.n} · series ${S.d4.okS} · parallel ${S.d4.okP} · critical ${S.d4.okK}`;
      if (!q.done) { plot.draw([], [0, 1], [0, 1]); return; }
      const P = q.top === 's' ? paramsS(q.R, q.L, q.C) : params(q.R, q.L, q.C), T = winOf(P), [k, u] = tUnit(T), n = 500;
      let y, t;
      if (q.top === 's') { const r = simSer({ R: q.R, L: q.L, C: q.C, V0: q.mode === 'natural' ? 10 : 0 }, 0, T, n, () => (q.mode === 'natural' ? 0 : 10)); t = r.t; y = r.vC; plot.o.ylabel = 'v_C (V)'; }
      else { const r = simPar({ Is: q.mode === 'natural' ? 0 : 0.01, R: q.R, L: q.L, C: q.C, V0: q.mode === 'natural' ? 10 : 0 }, T, n, 0); t = r.t; y = q.mode === 'natural' ? r.v : r.iL.map((x) => x * 1e3); plot.o.ylabel = q.mode === 'natural' ? 'v (V)' : 'i_L (mA)'; }
      const pts = []; for (let i = 0; i < n; i++) pts.push([t[i] * k, y[i]]);
      plot.o.xlabel = 't (' + u + ')'; plot.draw([{ pts, line: true, color: '#0b5cad', width: 2.4 }]);
    }
    $$('#d4kind button').forEach((b) => (b.onclick = () => { $$('#d4kind button').forEach((x) => x.classList.toggle('on', x === b)); self.pick = b.dataset.k; }));
    $('#d4new').onclick = newQ;
    $('#d4check').onclick = () => {
      const q = S.d4.cur; if (!q || q.done) return Lab.toast('Request a new circuit.');
      if (!self.pick) return Lab.toast('Select the response type.');
      const a = Lab.parse($('#d4alpha').value); if (!isFinite(a)) return Lab.toast('Enter a number for α.');
      const P = q.top === 's' ? paramsS(q.R, q.L, q.C) : params(q.R, q.L, q.C);
      const okK = self.pick === P.kind, okA = Math.abs(a - P.a) <= 0.03 * P.a, ok = okK && okA;
      S.d4.n++; if (ok) { S.d4.ok++; if (q.top === 's') S.d4.okS++; else S.d4.okP++; if (P.kind === 'kritik') S.d4.okK++; }
      q.done = true;
      q.fb = (ok ? '✔ Correct. ' : '✘ ') + `α = ${num(P.a, 0)} rad/s, ω<sub>0</sub> = ${num(P.w0, 0)} rad/s → type: <b>${({ 'aşırı': 'overdamped', kritik: 'critically damped', az: 'underdamped' })[P.kind]}</b>.` + (okK ? '' : ' Wrong type.') + (okA ? '' : ` α incorrect (${q.top === 's' ? 'series: R/2L' : 'parallel: 1/2RC'}).`);
      S.d4.hist.push({ top: q.top, R: q.R, L: q.L, C: q.C, kind: P.kind, pick: self.pick, a, ok }); save(); show(); table(); progress();
    };
    const tbody = $('#d4tab tbody');
    function table() { tbody.innerHTML = S.d4.hist.map((r, i) => `<tr><td>${i + 1}</td><td>${r.top === 's' ? 'series' : 'parallel'}</td><td>${Lab.ohm(r.R)}</td><td>${fH(r.L)}</td><td>${fF(r.C)}</td><td>${({ 'aşırı': 'overdamped', kritik: 'critically damped', az: 'underdamped' })[r.pick] || r.pick}</td><td>${num(r.a, 0)}</td><td>${r.ok ? '✔' : '✘'}</td></tr>`).join(''); }
    self.update = () => {};
    self.rec = () => $('#d4check').click();
    $('#d4csv').onclick = () => Lab.downloadCSV('week14_experiment4.csv', ['#', 'circuit', 'R', 'L', 'C', 'answer type', 'answer alpha', 'correct'], S.d4.hist.map((r, i) => [i + 1, r.top, r.R, r.L, r.C, r.pick, r.a, r.ok ? 'yes' : 'no']));
    if (!S.d4.cur) newQ(); else show(); table();
    Object.assign(self, { plotCanvas: $('#d4plot') });
    return self;
  })();
  steps('d4', [
    { t: 'Classify the first circuit correctly (type + α, 3% tolerance).', test: () => S.d4.ok >= 1 },
    { t: 'Answer at least <b>2 series</b> and <b>2 parallel</b> circuits correctly.', test: () => S.d4.okS >= 2 && S.d4.okP >= 2 },
    { t: 'Correctly identify a <b>critically damped</b> circuit.', test: () => S.d4.okK >= 1 },
    { t: 'Reach <b>8 correct</b> answers in total.', test: () => S.d4.ok >= 8 },
  ]);
  mcq('d4', '#d4Q', { id: 'd4q1', q: 'What is the first thing to do to determine the response type of an RLC circuit?', opts: ['Find the coefficients', 'Compute and compare α and ω<sub>0</sub>', 'Find the final value', 'Write the initial conditions'], correct: 1, explain: 'Method: first α and ω<sub>0</sub>, then the type, then the coefficients (Chapter 4 formula card).', hint: 'The type is determined by the roots.' });
  mcq('d4', '#d4Q', { id: 'd4q2', q: 'Series RLC with L = 0.1 H, C = 0.4 µF, R = 1 kΩ. Response?', opts: ['Overdamped', 'Critically damped', 'Underdamped'], correct: 1, explain: 'α = 1000/0.2 = 5000 = ω<sub>0</sub> (Example 4.17).', hint: 'R = 2√(L/C)?' });
  mcq('d4', '#d4Q', { id: 'd4q3', q: 'Parallel RLC with R = 1 kΩ, L = 10 mH, C = 1 µF. Response?', opts: ['Overdamped', 'Critically damped', 'Underdamped (α = 500 &lt; ω<sub>0</sub> = 10 000)'], correct: 2, explain: 'α = 1/(2·1000·10<sup>−6</sup>) = 500, ω<sub>0</sub> = 10 000; ω<sub>d</sub> ≈ 9987 rad/s.', hint: 'Parallel: α = 1/2RC.' });
  mcq('d4', '#d4Q', { id: 'd4q4', q: 'Which solution form is correct for critical damping?', opts: ['D e<sup>−αt</sup>', '(D<sub>1</sub>t + D<sub>2</sub>)e<sup>−αt</sup>', 'A<sub>1</sub>e<sup>s<sub>1</sub>t</sup> + A<sub>2</sub>e<sup>s<sub>2</sub>t</sup>', 'B cos ω<sub>0</sub>t'], correct: 1, explain: 'With a repeated root two independent terms are needed (Chapter 4 common mistake).', hint: 'Two initial conditions, two constants.' });
  numq('d4', '#d4Q', { id: 'd4q5', q: 'Example 4.17: L = 100 mH, C = 0.4 µF, V<sub>s</sub> = 50 V; what is the peak current (in mA) in the critically damped series circuit?', answer: 36.8, tol: 2, unit: 'mA', explain: 'i = 500t e<sup>−5000t</sup> A; the peak is 36.8 mA at t = 1/α = 200 µs.', hint: 'i = C dv<sub>C</sub>/dt, peak at t = 1/α.' });

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
      <h2 style="margin:0">Circuit Theory I · Virtual Lab · Week 14 Report</h2>
      <p><b>Topic:</b> Series RLC circuits, series–parallel comparison, ringing and damping, ignition coil, semester review</p>
      <table class="data" style="width:auto"><tr><th>Full name</th><td class="l">${S.st.name || ''}</td><th>ID</th><td class="l">${S.st.no || ''}</td><th>Group</th><td class="l">${S.st.group || ''}</td><th>Date</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Summary</h3>
      <p>Lab-sheet steps completed: <b>${sOk}/${sTot}</b> · Correct answers: <b>${ok}/${tot}</b> · Mixed review: <b>${S.d4.ok}/${S.d4.n}</b> · Score: <b>${Math.round((50 * sOk) / sTot + (50 * ok) / tot)}/100</b></p>
      <h3>Answers</h3>
      <table class="data"><thead><tr><th>Section</th><th>Question</th><th>Answer</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Experiment 1 · Series and parallel</h3>${tab('d1tab')}
      <h3>Experiment 2 · Ringing and damping resistor</h3>${tab('d2tab')}
      <h3>Experiment 3 · Ignition coil</h3>${tab('d3tab')}
      <h3>Experiment 4 · Mixed review</h3>${tab('d4tab')}
      <h3>Plots</h3>
      <div>${img($('#d1plotS'))} ${img($('#d1plotP'))}</div>
      <div>${img($('#d2scope'))} ${img(D3.plotCanvas)}</div>
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
  const MODS = { d1: D1, d2: D2, d3: D3, d4: D4 };
  function loop() {
    const m = MODS[S.page];
    if (m) { m.update(); evalSteps(S.page); }
    requestAnimationFrame(loop);
  }
  ['d1', 'd2', 'd3', 'd4'].forEach(evalSteps);
  go(S.page); progress(); loop();
})();

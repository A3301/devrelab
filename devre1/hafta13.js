/* Devre Kuramı I · Hafta 13 — Paralel RLC Basamak Tepkisi */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd1h13';
  const S = Object.assign({ answers: {}, steps: {}, d1rows: [], d2rows: [], d3rows: [], d4rows: [], d4traces: [], st: {}, page: 'giris', d1seen: {} }, Lab.store.load(KEY));
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
      if (!S.steps[id] && ok) { S.steps[id] = true; save(); Lab.toast('✔ Adım tamamlandı: ' + s.t.replace(/<[^>]+>/g, '').slice(0, 70)); progress(); }
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

  /* ================= ÖN HAZIRLIK ================= */
  numq('onhaz', '#preQ', { id: 'p1', q: '1) Örnek 4.5 devresinde neper frekansı α kaç rad/s\'dir?', answer: 50000, unit: 'rad/s', explain: 'α = 1/(2RC) = 1/(2·400·25×10<sup>−9</sup>) = 50 000 rad/s.', hint: 'Paralel devre: α = 1/(2RC).' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) Aynı devrede rezonans frekansı ω<sub>0</sub> kaç rad/s\'dir?', answer: 40000, unit: 'rad/s', explain: 'ω<sub>0</sub> = 1/√(25×10<sup>−3</sup>·25×10<sup>−9</sup>) = 40 000 rad/s → α &gt; ω<sub>0</sub>, aşırı sönümlü.', hint: 'ω<sub>0</sub> = 1/√(LC); R içermez.' });
  mcq('onhaz', '#preQ', { id: 'p3', q: '3) t → ∞ iken bobin akımı i<sub>L</sub> ve düğüm gerilimi v ne olur?', opts: ['i<sub>L</sub> = 0, v = I<sub>s</sub>R', 'i<sub>L</sub> = I<sub>s</sub>, v = 0', 'i<sub>L</sub> = I<sub>s</sub>/2, v = I<sub>s</sub>R/2', 'Salınım sonsuza dek sürer'], correct: 1, explain: 'DC kalıcı durumda bobin kısa devredir: R ve C\'nin uçlarındaki gerilim sıfır olur, akımın tamamı bobinden geçer.', hint: 'DC\'de bobin ve kondansatör nasıl davranır?' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) Anahtar kapanmadan önce kondansatör V<sub>0</sub> = 8 V\'a dolu, L = 25 mH. di<sub>L</sub>/dt(0<sup>+</sup>) kaç A/s\'dir?', answer: 320, unit: 'A/s', explain: 'Paralel elemanların gerilimi ortaktır: L di<sub>L</sub>/dt = v(0<sup>+</sup>) = 8 V → 320 A/s.', hint: 'v = L di<sub>L</sub>/dt ve v(0<sup>+</sup>) = V<sub>0</sub>.' });
  numq('onhaz', '#preQ', { id: 'p5', q: '5) L = 25 mH, C = 25 nF ile kritik sönüm için R kaç Ω olmalıdır?', answer: 500, unit: 'Ω', explain: 'R = ½√(L/C) = ½√(10<sup>6</sup>) = 500 Ω. Altında aşırı, üstünde az sönümlü.', hint: 'α = ω<sub>0</sub> koşulundan R\'yi çekin.' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) Boşta başlayan az sönümlü paralel devrede bobin akımının aşım yüzdesi neye bağlıdır?', opts: ['Yalnızca I<sub>s</sub>\'ye', 'Yalnızca α/ω<sub>d</sub> oranına (yani sönüm oranına)', 'Yalnızca L\'ye', 'Hiçbir şeye; aşım her zaman %100\'dür'], correct: 1, explain: '%OS = 100·e<sup>−απ/ω<sub>d</sub></sup>. I<sub>s</sub> yalnızca ölçeği belirler.', hint: 'İlk tepe ω<sub>d</sub>t = π anında; zarf e<sup>−αt</sup>.' });

  /* ================= DENEY 1 ================= */
  const D1 = (() => {
    const self = { closed: false, trace: null };
    const set = () => (dirty.d1 = true);
    const box = $('#d1inst');
    const src = inst(box, 'DC AKIM KAYNAĞI · I<sub>s</sub>', true, 'uyum ±60 V'); const srcL = lcd(src.el, 'I<sub>s</sub>', 'mA', 110);
    const kI = new Lab.Knob(src.c, { label: 'I_s', min: 0, max: 50, step: 0.5, value: 24, dark: true, fmt: (v) => num(v, 1) + ' mA', onChange: set });
    const swb = document.createElement('button'); swb.className = 'seg-btn'; swb.style.cssText = 'width:140px;padding:8px'; src.c.appendChild(swb);
    const swTxt = () => { swb.textContent = self.closed ? 'S KAPALI (yeniden: tıkla)' : 'ANAHTARI KAPAT'; swb.classList.toggle('on', self.closed); };
    swb.onclick = () => { self.closed = !self.closed; swTxt(); set(); }; swTxt();
    const eb = inst(box, 'ELEMAN KUTULARI', false);
    const kR = new Lab.Knob(eb.c, { label: 'R', list: RLIST, value: 400, fmt: Lab.ohm, onChange: set });
    const kL = new Lab.Knob(eb.c, { label: 'L', list: LLIST, value: 0.025, fmt: fH, onChange: set });
    const kC = new Lab.Knob(eb.c, { label: 'C', list: CLIST, value: 2.5e-8, fmt: fF, onChange: set });
    const sc = parSchem($('#d1sch'));
    const pI = new Lab.Plot($('#d1plotI'), { xlabel: 't', ylabel: 'i_L (mA)' }), pV = new Lab.Plot($('#d1plotV'), { xlabel: 't', ylabel: 'v (V)' });
    $('#d1theo').onchange = set; $('#d1cur').oninput = set;
    self.c = () => ({ Is: kI.value * 1e-3, R: kR.value, L: kL.value, C: kC.value });
    function window_(c) {
      const P = params(c.R, c.L, c.C);
      if (P.kind === 'aşırı') return 6 / (P.a - Math.sqrt(P.a * P.a - P.w0 * P.w0));
      if (P.kind === 'kritik') return 8 / P.a;
      return Math.min(5 / P.a, (8 * 2 * Math.PI) / P.wd);
    }
    self.update = () => {
      if (!dirty.d1) return; dirty.d1 = false;
      const c = self.c(); srcL(num(kI.value, 1));
      sc.tIs.textContent = 'I_s = ' + num(kI.value, 1) + ' mA'; sc.tR.textContent = 'R = ' + Lab.ohm(c.R); sc.tL.textContent = 'L = ' + fH(c.L); sc.tC.textContent = 'C = ' + fF(c.C);
      sc.setSw(self.closed);
      const T = window_(c), [k, u] = tUnit(T), pre = 0.05 * T, n = 601;
      let ser = [], serV = [], cur = '';
      if (self.closed) {
        const r = simPar(c, T + pre, n, pre); self.trace = { r, pre, k, u, c };
        const pts = [], ptsV = [];
        for (let i = 0; i < n; i++) { pts.push([(r.t[i] - pre) * k, r.iL[i] * 1e3]); ptsV.push([(r.t[i] - pre) * k, r.v[i]]); }
        let vmax = 0; for (const x of r.v) vmax = Math.max(vmax, Math.abs(x));
        sc.tWarn.textContent = vmax > 60 ? '⚠ Gerilim tepesi ' + num(vmax, 0) + ' V > 60 V uyum sınırı: gerçek kaynak bu eğriyi veremez' : '';
        sc.tWarn.style.fill = '#c62828';
        if ($('#d1theo').checked) {
          const P = params(c.R, c.L, c.C), th = [];
          for (let i = 0; i <= 300; i++) { const t = (i / 300) * T; th.push([t * k, (c.Is + sol2(P.a, P.w0, -c.Is, 0, t)) * 1e3]); }
          ser.push({ pts: th, line: true, color: '#e07a10', dash: [6, 4] });
        }
        ser.push({ pts, line: true, color: '#0b5cad', width: 2.4 }); serV.push({ pts: ptsV, line: true, color: '#1a8a4a', width: 2.4 });
        const idx = Math.round(($('#d1cur').value / 1000) * (n - 1));
        self.curv = { t: r.t[idx] - pre, iL: r.iL[idx], v: r.v[idx] };
        cur = `t = ${num(self.curv.t * k, 2)} ${u} · i_L = ${num(self.curv.iL * 1e3, 3)} mA · v = ${num(self.curv.v, 3)} V`;
        const yI = [Math.min(0, ...pts.map((p) => p[1])) - 1, Math.max(c.Is * 1e3 * 1.05, ...pts.map((p) => p[1])) + 1];
        const yV = [Math.min(0, ...ptsV.map((p) => p[1])) * 1.1 - 0.1, Math.max(0.1, ...ptsV.map((p) => p[1])) * 1.1];
        const xc = self.curv.t * k;
        ser.push({ pts: [[xc, yI[0]], [xc, yI[1]]], line: true, color: '#d63ad0', dash: [4, 4], width: 1.2 });
        serV.push({ pts: [[xc, yV[0]], [xc, yV[1]]], line: true, color: '#d63ad0', dash: [4, 4], width: 1.2 });
        pI.o.xlabel = pV.o.xlabel = 't (' + u + ')';
        pI.draw(ser, [-pre * k, T * k], yI); pV.draw(serV, [-pre * k, T * k], yV);
        if (c.Is === 0.024 && c.L === 0.025 && c.C === 2.5e-8) { S.d1seen[c.R] = true; save(); }
      } else {
        self.trace = null; self.curv = null; sc.tWarn.textContent = '';
        pI.draw([], [0, 1], [0, 30]); pV.draw([], [0, 1], [0, 10]); cur = 'Anahtar açık: önce ANAHTARI KAPAT.';
      }
      sc.tMode.textContent = self.closed ? 'S kapalı · kaynak devrede' : 'S açık · devre boşta';
      $('#d1curTxt').textContent = cur;
    };
    const tbody = $('#d1tab tbody');
    function table() { tbody.innerHTML = S.d1rows.map((r, i) => `<tr><td>${i + 1}</td><td>${num(r.Is * 1e3, 1)} mA</td><td>${Lab.ohm(r.R)}</td><td>${fH(r.L)}</td><td>${fF(r.C)}</td><td>${eng(r.t, 's')}</td><td>${num(r.iL * 1e3, 3)}</td><td>${num(r.v, 3)}</td></tr>`).join(''); }
    self.rec = () => {
      if (!self.curv) return Lab.toast('Önce anahtarı kapatın.');
      const c = self.c(); S.d1rows.push(Object.assign({}, c, self.curv)); save(); table();
      Lab.toast(`Kaydedildi: t = ${eng(self.curv.t, 's')}, i_L = ${num(self.curv.iL * 1e3, 2)} mA, v = ${num(self.curv.v, 2)} V`);
    };
    $('#d1rec').onclick = self.rec;
    $('#d1del').onclick = () => { S.d1rows.pop(); save(); table(); };
    $('#d1csv').onclick = () => Lab.downloadCSV('hafta13_deney1.csv', ['#', 'Is (mA)', 'R (ohm)', 'L (H)', 'C (F)', 't (s)', 'iL (mA)', 'v (V)'], S.d1rows.map((r, i) => [i + 1, r.Is * 1e3, r.R, r.L, r.C, r.t, +(r.iL * 1e3).toFixed(4), +r.v.toFixed(4)]));
    table(); set();
    Object.assign(self, { kI, kR, kL, kC });
    return self;
  })();
  const ex45 = (c) => near(c.Is, 0.024, 1e-6) && c.L === 0.025 && c.C === 2.5e-8;
  steps('d1', [
    { t: 'Örnek 4.5: <b>I<sub>s</sub> = 24 mA, R = 400 Ω, L = 25 mH, C = 25 nF</b> seçip anahtarı kapatın. Akım 24 mA\'e aşım yapıyor mu?', test: () => D1.closed && ex45(D1.c()) && D1.c().R === 400 },
    { t: 'İmleci <b>bobin geriliminin tepesine</b> getirip ölçümü kaydedin (<kbd>R</kbd>). Tepe anını ve değerini not edin.', test: () => S.d1rows.some((r) => ex45(r) && r.R === 400 && near(r.t, 23.1e-6, 2e-6)) },
    { t: '“Önce tahmin et”: aynı devrede <b>R = 2 kΩ</b> yapın. Akım 24 mA\'i aşıyor mu?', test: () => D1.closed && ex45(D1.c()) && D1.c().R === 2000 },
    { t: 'Aynı L ve C ile tepkiyi <b>kritik sönümlü</b> yapan R\'yi hesaplayıp ayarlayın.', test: () => D1.closed && ex45(D1.c()) && D1.c().R === 500 },
    { t: 'R\'yi <b>20 kΩ veya üstüne</b> çıkarın: neredeyse ideal LC. Akım hangi değerler arasında salınıyor?', test: () => D1.closed && D1.c().R >= 2e4 },
    { t: '<b>Kuramsal eğriyi</b> açıp ölçümle karşılaştırın ve farklı R\'lerde toplam <b>en az 5</b> ölçüm kaydedin.', test: () => $('#d1theo').checked && S.d1rows.length >= 5 && new Set(S.d1rows.map((r) => r.R)).size >= 2 },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: 'Örnek 4.5\'te i<sub>L</sub>(t) = 24 + A<sub>1</sub>e<sup>−20 000t</sup> + A<sub>2</sub>e<sup>−80 000t</sup> mA. A<sub>1</sub> kaç mA\'dir?', answer: -32, unit: 'mA', explain: 'A<sub>1</sub> + A<sub>2</sub> = −24 ve −20 000A<sub>1</sub> − 80 000A<sub>2</sub> = 0 → A<sub>1</sub> = −32, A<sub>2</sub> = 8.', hint: 'İki koşul: i<sub>L</sub>(0) = 0 ve di<sub>L</sub>/dt(0) = v(0)/L = 0.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'İmleçle ölçtüğünüz bobin gerilimi tepe değeri kaç V\'tur?', answer: 7.56, tol: 2, unit: 'V', explain: 'v = 16(e<sup>−20 000t</sup> − e<sup>−80 000t</sup>) V; tepe 23,1 µs\'de 7,56 V.', hint: 'İmleci v(t) grafiğinin en yüksek noktasına getirin.' });
  numq('d1', '#d1Q', { id: 'd1q3', q: 'Bu tepe kaç µs\'de oluşuyor? (Kuramla doğrulayın: dv/dt = 0)', answer: 23.1, tol: 4, unit: 'µs', explain: 'e<sup>60 000t</sup> = 4 → t = ln4/60 000 = 23,1 µs.', hint: '−20 000e<sup>−20 000t</sup> + 80 000e<sup>−80 000t</sup> = 0' });
  mcq('d1', '#d1Q', { id: 'd1q4', q: 'R 400 Ω\'dan 2 kΩ\'a çıkarıldığında (L, C aynı) ne oldu?', opts: ['Aşırı sönümlü kaldı', 'Az sönümlü oldu, akım 24 mA\'i aştı', 'Kritik sönümlü oldu', 'Akım 24 mA\'e hiç ulaşmadı'], correct: 1, explain: 'α = 10 000 &lt; ω<sub>0</sub> = 40 000 → ω<sub>d</sub> = 38 730 rad/s. Paralel devrede büyük R az sönüm demektir.', hint: 'α = 1/(2RC) R büyüyünce ne olur?' });
  numq('d1', '#d1Q', { id: 'd1q5', q: 'R = 2 kΩ iken ölçtüğünüz en büyük bobin akımı kaç mA\'dir?', answer: 24 * (1 + Math.exp((-Math.PI * 1e4) / Math.sqrt(16e8 - 1e8))), tol: 2, unit: 'mA', explain: 'i<sub>maks</sub> = 24(1 + e<sup>−απ/ω<sub>d</sub></sup>) = 24(1 + 0,444) ≈ 34,7 mA (%44 aşım).', hint: 'İmleci i<sub>L</sub> eğrisinin ilk tepesine koyun.' });
  mcq('d1', '#d1Q', { id: 'd1q6', q: 'Paralel devrede kritik sönüm sağlayan R için hangisi doğrudur?', opts: ['R = 2√(L/C)', 'R = ½√(L/C); bu değerin üstünde aşım başlar', 'R = ½√(L/C); bu değerin altında aşım başlar', 'R = √(LC)'], correct: 1, explain: 'R = ½√(L/C) = 500 Ω. Daha büyük R → α küçülür → az sönümlü, aşım.', hint: 'α = 1/(2RC) = ω<sub>0</sub>.' });

  /* ================= osiloskop kurucu ================= */
  const VDIV = [1e-3, 2e-3, 5e-3, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
  const TDIV = [1e-6, 2e-6, 5e-6, 1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3];
  function makeScope(row, id, o) {
    const w = document.createElement('div'); w.className = 'inst dark scopewrap'; w.style.cssText = 'flex:1;min-width:420px';
    w.innerHTML = `<div class="brand"><span>DSO-2C · Dijital Osiloskop</span><span><span class="led on g"></span> TEK ATIM · tetik 1. bölme</span></div>
      <div class="row" style="align-items:flex-start;flex-wrap:nowrap"><canvas id="${id}" width="640" height="400" style="width:100%;max-width:640px"></canvas>
      <div style="min-width:160px"><div class="ctrls"></div><div class="row" style="margin:6px 0"><button class="seg-btn on">CH1</button><button class="seg-btn on">CH2</button><button class="seg-btn">İMLEÇ</button></div><div class="meas"></div></div></div>`;
    row.appendChild(w);
    const meas = w.querySelector('.meas'), sk = w.querySelector('.ctrls');
    const scope = new Lab.Scope(w.querySelector('canvas'), { onMeasure: (m) => o.onMeasure && o.onMeasure(m, meas) });
    const k1 = new Lab.Knob(sk, { label: 'CH1 V/d', list: VDIV, value: o.v1, dark: true, size: 44, fmt: (v) => eng(v, 'V'), onChange: (v) => { scope.ch[0].vdiv = v; o.set(); } });
    const k2 = new Lab.Knob(sk, { label: 'CH2 V/d', list: VDIV, value: o.v2, dark: true, size: 44, fmt: (v) => eng(v, 'V'), onChange: (v) => { scope.ch[1].vdiv = v; o.set(); } });
    const kt = new Lab.Knob(sk, { label: 'ZAMAN/d', list: TDIV, value: o.td, dark: true, size: 44, fmt: (v) => eng(v, 's'), onChange: (v) => { scope.tdiv = v; o.set(); } });
    scope.ch[0].vdiv = o.v1; scope.ch[1].vdiv = o.v2; scope.tdiv = o.td; scope.ch[0].pos = -3; scope.ch[1].pos = -3;
    const b = w.querySelectorAll('.seg-btn');
    b[0].onclick = () => { scope.ch[0].on = !scope.ch[0].on; b[0].classList.toggle('on'); o.set(); };
    b[1].onclick = () => { scope.ch[1].on = !scope.ch[1].on; b[1].classList.toggle('on'); o.set(); };
    b[2].onclick = () => { scope.cur.on = !scope.cur.on; b[2].classList.toggle('on'); scope.draw(); };
    return { scope, k1, k2, kt, canvas: w.querySelector('canvas') };
  }

  /* ================= DENEY 2 ================= */
  const D2 = (() => {
    const self = {};
    const set = () => (dirty.d2 = true);
    const box = $('#d2inst');
    const src = inst(box, 'DC AKIM KAYNAĞI · I<sub>s</sub>'); const srcL = lcd(src.el, 'I<sub>s</sub>', 'mA', 100);
    const kI = new Lab.Knob(src.c, { label: 'I_s', min: 0, max: 50, step: 0.5, value: 10, dark: true, fmt: (v) => num(v, 1) + ' mA', onChange: set });
    const eb = inst(box, 'ELEMAN KUTULARI', false);
    const kR = new Lab.Knob(eb.c, { label: 'R', list: RLIST, value: 1e4, fmt: Lab.ohm, onChange: set });
    const kL = new Lab.Knob(eb.c, { label: 'L', list: LLIST, value: 2.5, fmt: fH, onChange: set });
    const kC = new Lab.Knob(eb.c, { label: 'C', list: CLIST, value: 2.5e-8, fmt: fF, onChange: set });
    const pr = inst(box, 'AKIM PROBU', false, '100 mV/mA'); const prL = lcd(pr.el, 'CH2 ölçeği', '', 110); prL('100 mV/mA');
    const sc = parSchem($('#d2sch')); sc.setSw(true); sc.tMode.textContent = 'CH1: v (düğüm) · CH2: i_L (akım probu)';
    E('circle', { cx: 440, cy: 70, r: 9, fill: 'none', stroke: '#1592b8', 'stroke-width': 2.5 }, $('#d2sch'));
    sch.t($('#d2sch'), 462, 74, 'CH2', 'lbl', 'start').style.fill = '#1592b8';
    sch.t($('#d2sch'), 690, 135, 'CH1', 'lbl', 'start').style.fill = '#b8960a';
    function showMeas(m, el) {
      if (!m) return; self.meas = m;
      let h = `<span style="color:#f2d21b">CH1</span> maks ${eng(m.ch[0].max, 'V')}<br><span style="color:#27c4f0">CH2</span> maks ${eng(m.ch[1].max, 'V')}`;
      if (m.cur) h += `<br><span style="color:#ff7cf0">İMLEÇ</span> Δt ${eng(m.cur.dt, 's')}<br>CH1 a ${num(m.cur.v1a, 3)} V · b ${num(m.cur.v1b, 3)} V<br>CH2 a ${num(m.cur.v2a, 4)} V<br>CH2 b ${num(m.cur.v2b, 4)} V`;
      el.innerHTML = h;
    }
    const sco = makeScope($('#d2scopeRow'), 'd2scope', { v1: 10, v2: 0.5, td: 5e-4, set, onMeasure: showMeas });
    self.c = () => ({ Is: kI.value * 1e-3, R: kR.value, L: kL.value, C: kC.value });
    self.update = () => {
      if (!dirty.d2) return; dirty.d2 = false;
      const c = self.c(); srcL(num(kI.value, 1));
      sc.tIs.textContent = 'I_s = ' + num(kI.value, 1) + ' mA'; sc.tR.textContent = 'R = ' + Lab.ohm(c.R); sc.tL.textContent = 'L = ' + fH(c.L); sc.tC.textContent = 'C = ' + fF(c.C);
      const td = sco.scope.tdiv, n = 1000, r = simPar(c, 10 * td, n, td);
      const y1 = r.v, y2 = new Float64Array(n); for (let i = 0; i < n; i++) y2[i] = r.iL[i] * 100;
      // gerçek tp ve ts (adım değerlendirmesi için; ekranda gösterilmez)
      const T = 20 / Math.max(params(c.R, c.L, c.C).a, 1), rr = simPar(c, T, 4000, 0), mm = metrics(rr.t, rr.iL, c.Is);
      self.ref = mm;
      sco.scope.draw({ n, y: [y1, y2] });
    };
    const tbody = $('#d2tab tbody');
    function table() { tbody.innerHTML = S.d2rows.map((r, i) => `<tr><td>${i + 1}</td><td>${Lab.ohm(r.R)}</td><td>${eng(r.dt, 's')}</td><td>${num(r.v1b, 3)}</td><td>${num(r.v2a, 4)}</td><td>${num(r.v2b, 4)}</td><td>${num(r.v2b * 10, 3)}</td></tr>`).join(''); }
    self.rec = () => {
      const m = sco.scope.measure(); if (!m || !m.cur) return Lab.toast('Önce İMLEÇ\'leri açın ve yerleştirin.');
      const c = self.c(), ta = (sco.scope.cur.a - 1) * sco.scope.tdiv, tb = (sco.scope.cur.b - 1) * sco.scope.tdiv;
      S.d2rows.push(Object.assign({}, c, { dt: m.cur.dt, ta, tb, td: sco.scope.tdiv, v1b: m.cur.v1b, v2a: m.cur.v2a, v2b: m.cur.v2b, tp: self.ref.tp, ts: self.ref.ts })); save(); table();
      Lab.toast(`Kaydedildi: Δt = ${eng(m.cur.dt, 's')}, CH2(b) = ${num(m.cur.v2b, 4)} V`);
    };
    $('#d2rec').onclick = self.rec;
    $('#d2del').onclick = () => { S.d2rows.pop(); save(); table(); };
    $('#d2csv').onclick = () => Lab.downloadCSV('hafta13_deney2.csv', ['#', 'R (ohm)', 'dt (s)', 'CH1 b (V)', 'CH2 a (V)', 'CH2 b (V)', 'iL b (mA)'], S.d2rows.map((r, i) => [i + 1, r.R, r.dt, r.v1b, r.v2a, r.v2b, r.v2b * 10]));
    table(); set();
    Object.assign(self, { kI, kR, kL, kC, sco });
    return self;
  })();
  const ex415 = (c) => near(c.Is, 0.01, 1e-6) && c.L === 2.5 && c.C === 2.5e-8;
  steps('d2', [
    { t: 'Örnek 4.15: <b>I<sub>s</sub> = 10 mA, R = 10 kΩ, L = 2,5 H, C = 25 nF</b> ayarlayın.', test: () => ex415(D2.c()) && D2.c().R === 1e4 },
    { t: 'CH2\'yi akım eğrisi ekranı en iyi dolduracak şekilde <b>0,2 V/d</b>, zaman tabanını <b>0,2–0,5 ms/d</b> yapın.', test: () => D2.sco.k2.value === 0.2 && D2.sco.scope.tdiv >= 2e-4 && D2.sco.scope.tdiv <= 5e-4 },
    { t: 'İMLEÇ\'leri açın: <b>a</b>\'yı basamak anına (1. bölme), <b>b</b>\'yi akımın <b>ilk tepesine</b> koyun.', test: () => { const s = D2.sco.scope; return s.cur.on && ex415(D2.c()) && D2.c().R === 1e4 && near(s.cur.a, 1, 0.08) && D2.ref && rel((s.cur.b - 1) * s.tdiv, D2.ref.tp, 0.03); } },
    { t: 'Tepe ölçümünü kaydedin (<kbd>R</kbd>): Δt = t<sub>p</sub>, CH2(b)/100 mV = i<sub>maks</sub>.', test: () => S.d2rows.some((r) => ex415(r) && r.R === 1e4 && near(r.ta, 0, 0.1 * (r.td || 2e-4)) && rel(r.tb, r.tp, 0.03)) },
    { t: '<b>Yerleşme süresi:</b> b imlecini akımın ±%2 bandına (9,8–10,2 mA → CH2 0,98–1,02 V) son kez girdiği noktaya taşıyıp kaydedin.', test: () => S.d2rows.some((r) => ex415(r) && r.R === 1e4 && isFinite(r.ts) && rel(r.tb, r.ts, 0.1)) },
    { t: 'R\'yi değiştirin (ör. 7,5 kΩ veya 20 kΩ) ve yeni tepe ölçümünü kaydedin. Aşım nasıl değişti?', test: () => S.d2rows.some((r) => ex415(r) && r.R !== 1e4 && rel(r.tb, r.tp, 0.05)) },
  ]);
  const ts415 = () => { const c = { Is: 0.01, R: 1e4, L: 2.5, C: 2.5e-8 }, r = simPar(c, 0.01, 8000, 0); return metrics(r.t, r.iL, 0.01).ts * 1e3; };
  numq('d2', '#d2Q', { id: 'd2q1', q: 'Ölçtüğünüz tepe anı t<sub>p</sub> kaç µs\'dir?', answer: 907, tol: 3, unit: 'µs', explain: 't<sub>p</sub> = π/ω<sub>d</sub> = π/3464 = 907 µs.', hint: 'İmleçlerin Δt değeri.' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'En büyük bobin akımı kaç mA\'dir? (CH2 ölçeği 100 mV/mA)', answer: 11.63, tol: 1.5, unit: 'mA', explain: 'i<sub>maks</sub> = 10 + 10e<sup>−2000·907µ</sup> = 11,63 mA.', hint: 'CH2(b) gerilimini 100 mV/mA\'e bölün.' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 'Aşım yüzdesi nedir?', answer: 16.3, tol: 0, abs: 0.8, unit: '%', explain: '(11,63 − 10)/10 = %16,3 = 100·e<sup>−απ/ω<sub>d</sub></sup>.', hint: '(i<sub>maks</sub> − I<sub>s</sub>)/I<sub>s</sub>' });
  numq('d2', '#d2Q', { id: 'd2q4', q: 't<sub>p</sub> ölçümünüzden sönümlü açısal frekans ω<sub>d</sub> kaç rad/s\'dir?', answer: 3464, tol: 3, unit: 'rad/s', explain: 'ω<sub>d</sub> = π/t<sub>p</sub> ≈ 3464 rad/s = √(4000² − 2000²).', hint: 'Tepe ω<sub>d</sub>t = π anında.' });
  numq('d2', '#d2Q', { id: 'd2q5', q: 'Ölçtüğünüz %2 yerleşme süresi t<sub>s</sub> kaç ms\'dir?', answer: ts415, tol: 10, unit: 'ms', explain: 'Kaba kestirim 4/α = 2 ms; gerçek t<sub>s</sub> zarfın bandı kestiği yerden biraz önce olabilir çünkü salınım bandın içinden geçer.', hint: 'Akımın 9,8–10,2 mA bandından son kez çıktığı anı bulun.' });
  mcq('d2', '#d2Q', { id: 'd2q6', q: 'R\'yi 10 kΩ\'dan 20 kΩ\'a çıkarırsanız ne olur?', opts: ['Aşım azalır, yerleşme kısalır', 'Aşım artar, yerleşme uzar (α yarıya iner)', 'Yalnızca son değer değişir', 'Tepki aşırı sönümlü olur'], correct: 1, explain: 'α = 1/(2RC) = 1000 rad/s: zarf yavaş sönümlenir, e<sup>−απ/ω<sub>d</sub></sup> büyür.', hint: 'Paralel devrede R ile α ters orantılıdır.' });

  /* ================= DENEY 3 · Tasarım ================= */
  const D3 = (() => {
    const self = {}, L = 0.1, Is = 0.01;
    const set = () => (dirty.d3 = true);
    const box = $('#d3inst');
    const src = inst(box, 'DC AKIM KAYNAĞI'); const srcL = lcd(src.el, 'I<sub>s</sub> (sabit)', 'mA', 100); srcL('10,0');
    const rb = inst(box, 'AYARLI DİRENÇ (dekad)', false); const rL_ = lcd(rb.el, 'R', 'Ω', 110);
    const kR = new Lab.Knob(rb.c, { label: 'R', min: 50, max: 20000, log: true, value: S.d3R || 1000, fmt: Lab.ohm, onChange: (v) => { S.d3R = v; save(); set(); } });
    const cb = inst(box, 'AYARLI KONDANSATÖR (dekad)', false); const cL_ = lcd(cb.el, 'C', 'F', 110);
    const kC = new Lab.Knob(cb.c, { label: 'C', min: 1e-8, max: 1e-5, log: true, value: S.d3C || 1e-7, fmt: fF, onChange: (v) => { S.d3C = v; save(); set(); } });
    const lb = inst(box, 'BOBİN', false); const lL_ = lcd(lb.el, 'L (sabit)', 'mH', 90); lL_('100');
    $('#d3rL').checked = !!S.d3rL; $('#d3rL').onchange = (e) => { S.d3rL = e.target.checked; save(); set(); };
    let sc;
    function schem() { $('#d3sch').innerHTML = ''; sc = parSchem($('#d3sch'), { rL: !!S.d3rL }); sc.setSw(true); sc.tIs.textContent = 'I_s = 10 mA'; sc.tL.textContent = 'L = 100 mH'; if (S.d3rL) sc.tIC.textContent = 'r_L = 20 Ω'; }
    const plot = new Lab.Plot($('#d3plot'), { xlabel: 't (ms)', ylabel: 'i_L / I_s  (%)' });
    self.c = () => ({ Is, R: kR.value, L, C: kC.value, rL: S.d3rL ? 20 : 0 });
    self.update = () => {
      if (!dirty.d3) return; dirty.d3 = false;
      const c = self.c(); schem();
      rL_(Lab.ohm(c.R).replace('Ω', '').trim()); cL_(fF(c.C).replace('F', '').trim(), 'F');
      sc.tR.textContent = 'R = ' + Lab.ohm(c.R); sc.tC.textContent = 'C = ' + fF(c.C);
      const T = 3e-3, n = 900, r = simPar(c, T, n, 0), xf = (Is * c.R) / (c.R + c.rL), m = metrics(r.t, r.iL, xf);
      self.m = m;
      const pts = []; for (let i = 0; i < n; i++) pts.push([r.t[i] * 1e3, (100 * r.iL[i]) / Is]);
      const hl = (y, col, d) => ({ pts: [[0, y], [3, y]], line: true, color: col, dash: d, width: 1 });
      const yf = (100 * xf) / Is;
      plot.draw([hl(yf * 1.02, '#1a8a4a', [4, 4]), hl(yf * 0.98, '#1a8a4a', [4, 4]), hl(yf * 1.05, '#c62828', [8, 4]), hl(yf, '#99a', [2, 3]),
        { pts: [[1.2, 0], [1.2, 160]], line: true, color: '#e07a10', dash: [6, 4], width: 1.2 }, { pts, line: true, color: '#0b5cad', width: 2.4 }], [0, 3], [0, Math.max(120, ...pts.map((p) => p[1])) + 5]);
      const ok = m.os >= 4 && m.os <= 6 && isFinite(m.ts) && m.ts <= 1.2e-3;
      self.ok = ok;
      $('#d3meas').innerHTML = `Osiloskop otomatik ölçümü → <b>%OS = ${num(m.os, 2)}</b> · <b>t<sub>s</sub>(%2) = ${isFinite(m.ts) ? num(m.ts * 1e3, 3) + ' ms' : '&gt; 3 ms'}</b> · son değer ${num(xf * 1e3, 2)} mA. Kırmızı kesikli: %105 · yeşil: ±%2 bant · turuncu: 1,2 ms sınırı. ${ok ? '<b style="color:#1a8a4a">✔ Hedef sağlandı</b>' : '<b style="color:#c62828">Hedef sağlanmadı</b>'}`;
    };
    const tbody = $('#d3tab tbody');
    function table() { tbody.innerHTML = S.d3rows.map((r, i) => `<tr><td>${i + 1}</td><td>${Lab.ohm(r.R)}</td><td>${fF(r.C)}</td><td>${r.rL ? '20 Ω' : 'ideal'}</td><td>${num(r.os, 2)}</td><td>${isFinite(r.ts) ? num(r.ts * 1e3, 3) : '&gt;3'}</td><td>${r.ok ? '✔' : '✘'}</td></tr>`).join(''); }
    self.rec = () => { const c = self.c(); S.d3rows.push({ R: c.R, C: c.C, rL: c.rL, os: self.m.os, ts: isFinite(self.m.ts) ? self.m.ts : null, ok: self.ok }); save(); table(); Lab.toast(`Kaydedildi: %OS = ${num(self.m.os, 2)}`); };
    $('#d3rec').onclick = self.rec;
    $('#d3del').onclick = () => { S.d3rows.pop(); save(); table(); };
    $('#d3csv').onclick = () => Lab.downloadCSV('hafta13_deney3.csv', ['#', 'R (ohm)', 'C (F)', 'rL (ohm)', '%OS', 'ts (ms)', 'hedef'], S.d3rows.map((r, i) => [i + 1, +r.R.toFixed(1), r.C, r.rL, +r.os.toFixed(3), r.ts ? +(r.ts * 1e3).toFixed(4) : '', r.ok ? 'evet' : 'hayir']));
    table(); set();
    Object.assign(self, { kR, kC, plotCanvas: $('#d3plot') });
    return self;
  })();
  steps('d3', [
    { t: 'Önce kâğıt üzerinde: %5 aşım için <b>ζ</b>\'yı ve t<sub>s</sub> ≈ 1 ms için <b>α</b>\'yı bulun (soru 1–2).', test: () => ['d3q1', 'd3q2'].every((q) => S.answers[q] && S.answers[q].ok) },
    { t: 'R ve C\'yi ayarlayarak aşımı <b>%4–%6</b> aralığına getirin (ideal bobin).', test: () => !S.d3rL && D3.m && D3.m.os >= 4 && D3.m.os <= 6 },
    { t: 'Aşımı korurken <b>t<sub>s</sub> ≤ 1,2 ms</b> olacak şekilde C\'yi (ve buna göre R\'yi) yeniden seçin.', test: () => !S.d3rL && D3.ok },
    { t: 'Hedefi sağlayan tasarımı kaydedin (<kbd>R</kbd>).', test: () => S.d3rows.some((r) => r.ok && !r.rL) },
    { t: '<b>Gerçek bobin</b> (r<sub>L</sub> = 20 Ω) seçeneğini açın, aynı R ve C ile kaydedin. Aşım ve son değer ne oldu?', test: () => S.d3rows.some((r) => r.rL) },
    { t: 'Gerçek bobinli kaydı ideal kayıtla karşılaştırın: son değer ne kadar düştü, aşım ne kadar değişti? Tabloya not edin.', test: () => S.d3rows.some((r) => r.rL) },
  ]);
  const zeta5 = Math.log(20) / Math.sqrt(Math.PI ** 2 + Math.log(20) ** 2);
  numq('d3', '#d3Q', { id: 'd3q1', q: '%5 aşım için gereken sönüm oranı ζ = α/ω<sub>0</sub> kaçtır?', answer: zeta5, tol: 2, unit: '', explain: 'πζ/√(1−ζ²) = ln20 = 3,00 → ζ = 0,690.', hint: 'e<sup>−πζ/√(1−ζ²)</sup> = 0,05 eşitliğinden ζ\'yı çekin.' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 't<sub>s</sub> ≈ 4/α kestirimiyle t<sub>s</sub> = 1 ms için α kaç rad/s olmalıdır?', answer: 4000, tol: 1, unit: 'rad/s', explain: 'α = 4/t<sub>s</sub> = 4000 rad/s. (Hedefte 1,2 ms pay bırakıldı.)', hint: 't<sub>s</sub> ≈ 4/α' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'L = 100 mH ile bu α ve ζ için C kaç µF olmalıdır?', answer: 1 / ((4000 / zeta5) ** 2 * 0.1) * 1e6, tol: 4, unit: 'µF', explain: 'ω<sub>0</sub> = α/ζ = 5797 rad/s → C = 1/(ω<sub>0</sub>²L) ≈ 0,298 µF.', hint: 'Önce ω<sub>0</sub> = α/ζ.' });
  numq('d3', '#d3Q', { id: 'd3q4', q: 'Bu C ile R kaç Ω olmalıdır?', answer: 1 / (2 * 4000 * (1 / ((4000 / zeta5) ** 2 * 0.1))), tol: 4, unit: 'Ω', explain: 'R = 1/(2αC) ≈ 420 Ω (ya da R = √(L/C)/(2ζ)).', hint: 'α = 1/(2RC)' });
  numq('d3', '#d3Q', { id: 'd3q5', q: 'Yalnızca aşım isteniyorsa: L = 2,5 H, C = 25 nF ile %5 aşım için R kaç kΩ olmalıdır?', answer: 10 / (2 * zeta5), tol: 3, unit: 'kΩ', explain: 'R = √(L/C)/(2ζ) = 10 kΩ/1,38 ≈ 7,25 kΩ. Örnek 4.15\'teki 10 kΩ %16 aşım veriyordu.', hint: '√(L/C) = 10 kΩ.' });
  mcq('d3', '#d3Q', { id: 'd3q6', q: 'Bobinin 20 Ω iç direnci tasarıma ne yaptı?', opts: ['Hiçbir etkisi yok', 'Son değer I<sub>s</sub>R/(R+r<sub>L</sub>)\'ye düştü; aşım (son değere göre) yalnızca çok az azaldı', 'Aşımı artırdı', 'Rezonans frekansını iki katına çıkardı'], correct: 1, explain: 'Seri r<sub>L</sub> enerji harcar; DC\'de akım R ile r<sub>L</sub> arasında bölünür. Telafiye gerek yok; aşım hedef bandında kalır.', hint: 'Tablodaki iki satırı karşılaştırın.' });

  /* ================= DENEY 4 · Başlangıç koşulları ================= */
  const D4 = (() => {
    const self = {}, L = 0.025, C = 2.5e-8, T = 300e-6, pre = 15e-6, n = 631, COL = ['#0b5cad', '#c62828', '#1a8a4a', '#7b3fb5', '#e07a10', '#0f8b8d', '#8a6d00'];
    const set = () => (dirty.d4 = true);
    const box = $('#d4inst');
    const src = inst(box, 'DC AKIM KAYNAĞI · I<sub>s</sub>'); const srcL = lcd(src.el, 'I<sub>s</sub>', 'mA', 90);
    const kI = new Lab.Knob(src.c, { label: 'I_s', min: 0, max: 50, step: 0.5, value: 24, dark: true, fmt: (v) => num(v, 1) + ' mA', onChange: set });
    const ic = inst(box, 'BAŞLANGIÇ KOŞULU AYARLAYICI', true, 't &lt; 0'); const icL = lcd(ic.el, 'I<sub>0</sub> · V<sub>0</sub>', '', 150);
    const k0 = new Lab.Knob(ic.c, { label: 'I_0', min: -30, max: 30, step: 1, value: 0, dark: true, fmt: (v) => num(v, 0) + ' mA', onChange: set });
    const kV = new Lab.Knob(ic.c, { label: 'V_0', min: -20, max: 20, step: 0.5, value: 0, dark: true, fmt: (v) => num(v, 1) + ' V', onChange: set });
    const eb = inst(box, 'ELEMANLAR', false, 'L = 25 mH (r<sub>L</sub> ≈ 2 Ω) · C = 25 nF');
    const kR = new Lab.Knob(eb.c, { label: 'R', list: RLIST, value: 400, fmt: Lab.ohm, onChange: set });
    const sc = parSchem($('#d4sch')); sc.setSw(true); sc.tL.textContent = 'L = 25 mH'; sc.tC.textContent = 'C = 25 nF';
    const plot = new Lab.Plot($('#d4plot'), { xlabel: 't (µs)', ylabel: 'i_L (mA)' });
    $('#d4theo').onchange = set; $('#d4cur').oninput = set;
    self.c = () => ({ Is: kI.value * 1e-3, R: kR.value, L, C, rL: 2, I0: k0.value * 1e-3, V0: kV.value });
    self.update = () => {
      if (!dirty.d4) return; dirty.d4 = false;
      const c = self.c(); srcL(num(kI.value, 1)); icL(num(k0.value, 0) + ' mA · ' + num(kV.value, 1) + ' V');
      sc.tIs.textContent = 'I_s = ' + num(kI.value, 1) + ' mA'; sc.tR.textContent = 'R = ' + Lab.ohm(c.R);
      sc.tIC.textContent = 'V_0 = ' + num(c.V0, 1) + ' V'; sc.tMode.textContent = 'i_L(0) = I_0 = ' + num(k0.value, 0) + ' mA';
      const r = simPar(c, T + pre, n, pre); self.r = r;
      const ser = S.d4traces.map((tr, i) => ({ pts: tr.pts, line: true, color: COL[i % COL.length], width: 1.8 }));
      const pts = []; for (let i = 0; i < n; i++) pts.push([(r.t[i] - pre) * 1e6, r.iL[i] * 1e3]);
      ser.push({ pts, line: true, color: '#222', width: 2.6 });
      if ($('#d4theo').checked) {
        const P = params(c.R, L, C), th = [];
        for (let i = 0; i <= 300; i++) { const t = (i / 300) * T; th.push([t * 1e6, (c.Is + sol2(P.a, P.w0, c.I0 - c.Is, c.V0 / L, t)) * 1e3]); }
        ser.push({ pts: th, line: true, color: '#e07a10', dash: [6, 4], width: 2 });
      }
      const all = ser.flatMap((s) => s.pts.map((p) => p[1]));
      const yr = [Math.min(0, ...all) - 2, Math.max(30, ...all) + 2];
      const idx = Math.round(($('#d4cur').value / 1000) * (n - 1));
      self.curv = { t: r.t[idx] - pre, iL: r.iL[idx], v: r.v[idx] };
      ser.push({ pts: [[self.curv.t * 1e6, yr[0]], [self.curv.t * 1e6, yr[1]]], line: true, color: '#d63ad0', dash: [4, 4], width: 1.2 });
      plot.draw(ser, [-pre * 1e6, T * 1e6], yr);
      $('#d4curTxt').textContent = `t = ${num(self.curv.t * 1e6, 2)} µs · i_L = ${num(self.curv.iL * 1e3, 3)} mA · v = ${num(self.curv.v, 3)} V`;
    };
    const tbody = $('#d4tab tbody');
    function table() { tbody.innerHTML = S.d4rows.map((r, i) => `<tr><td>${i + 1}</td><td>${Lab.ohm(r.R)}</td><td>${num(r.I0 * 1e3, 0)}</td><td>${num(r.V0, 1)}</td><td>${num(r.mn, 3)}</td><td>${num(r.mx, 3)}</td><td>${num(r.end, 3)}</td></tr>`).join(''); }
    self.rec = () => {
      dirty.d4 = true; self.update();
      const c = self.c(), r = self.r; let mn = Infinity, mx = -Infinity;
      for (let i = 0; i < n; i++) if (r.t[i] >= pre) { mn = Math.min(mn, r.iL[i]); mx = Math.max(mx, r.iL[i]); }
      S.d4rows.push({ R: c.R, Is: c.Is, I0: c.I0, V0: c.V0, mn: mn * 1e3, mx: mx * 1e3, end: r.iL[n - 1] * 1e3 });
      const pts = []; for (let i = 0; i < n; i += 3) pts.push([(r.t[i] - pre) * 1e6, +(r.iL[i] * 1e3).toFixed(4)]);
      S.d4traces.push({ pts }); if (S.d4traces.length > 7) S.d4traces.shift();
      save(); table(); set(); Lab.toast(`İz kaydedildi: I_0 = ${num(c.I0 * 1e3, 0)} mA, V_0 = ${num(c.V0, 1)} V`);
    };
    $('#d4rec').onclick = self.rec;
    $('#d4clr').onclick = () => { S.d4traces = []; save(); set(); };
    $('#d4csv').onclick = () => Lab.downloadCSV('hafta13_deney4.csv', ['#', 'R (ohm)', 'Is (mA)', 'I0 (mA)', 'V0 (V)', 'iL min (mA)', 'iL maks (mA)', 'iL(300us) (mA)'], S.d4rows.map((r, i) => [i + 1, r.R, r.Is * 1e3, r.I0 * 1e3, r.V0, +r.mn.toFixed(4), +r.mx.toFixed(4), +r.end.toFixed(4)]));
    table(); set();
    Object.assign(self, { kI, k0, kV, kR, plotCanvas: $('#d4plot') });
    return self;
  })();
  const d4has = (f) => S.d4rows.some((r) => near(r.Is, 0.024, 1e-6) && f(r));
  steps('d4', [
    { t: '<b>I<sub>0</sub> = 12 mA, V<sub>0</sub> = 0</b> (R = 400 Ω, I<sub>s</sub> = 24 mA) ile çalıştırıp izi kaydedin.', test: () => d4has((r) => r.R === 400 && near(r.I0, 0.012, 1e-6) && r.V0 === 0) },
    { t: '<b>I<sub>0</sub> = 12 mA, V<sub>0</sub> = 6 V</b> ile kaydedin. Eğri neden tek üstel gibi görünüyor?', test: () => d4has((r) => r.R === 400 && near(r.I0, 0.012, 1e-6) && r.V0 === 6) },
    { t: '<b>I<sub>0</sub> = 24 mA, V<sub>0</sub> = 0</b> ile kaydedin. Geçici rejim var mı?', test: () => d4has((r) => r.R === 400 && near(r.I0, 0.024, 1e-6) && r.V0 === 0) },
    { t: 'Bobinde <b>ters yönde</b> akım (I<sub>0</sub> &lt; 0) ile kaydedin.', test: () => d4has((r) => r.I0 < 0) },
    { t: '<b>R = 2 kΩ</b> (az sönümlü) ve sıfırdan farklı bir başlangıç koşuluyla kaydedin.', test: () => d4has((r) => r.R === 2000 && (r.I0 !== 0 || r.V0 !== 0)) },
    { t: '<b>Kuramsal eğriyi</b> açıp son çalıştırmayla karşılaştırın. Küçük fark nereden geliyor?', test: () => $('#d4theo').checked && S.d4rows.length >= 3 },
  ]);
  numq('d4', '#d4Q', { id: 'd4q1', q: 'I<sub>0</sub> = 12 mA, V<sub>0</sub> = 0 için i<sub>L</sub> = 24 + A<sub>1</sub>e<sup>−20 000t</sup> + A<sub>2</sub>e<sup>−80 000t</sup> mA. A<sub>1</sub> kaç mA\'dir?', answer: -16, unit: 'mA', explain: 'A<sub>1</sub> + A<sub>2</sub> = 12 − 24 = −12; A<sub>1</sub> = −4A<sub>2</sub> → A<sub>2</sub> = 4, A<sub>1</sub> = −16.', hint: 'A<sub>1</sub> + A<sub>2</sub> = I<sub>0</sub> − I<sub>s</sub>' });
  numq('d4', '#d4Q', { id: 'd4q2', q: 'I<sub>0</sub> = 12 mA, V<sub>0</sub> = 6 V için A<sub>2</sub> kaç mA\'dir?', answer: 0, tol: 0, abs: 0.05, unit: 'mA', explain: 'di<sub>L</sub>/dt(0) = 6/0,025 = 240 A/s → A<sub>1</sub> + 4A<sub>2</sub> = −12 ve A<sub>1</sub> + A<sub>2</sub> = −12 → A<sub>2</sub> = 0: hızlı kök hiç uyarılmaz, eğri tek üstel olur.', hint: '−20 000A<sub>1</sub> − 80 000A<sub>2</sub> = V<sub>0</sub>/L (mA/s cinsinden 240 000).' });
  numq('d4', '#d4Q', { id: 'd4q3', q: 'Aynı durumda (I<sub>0</sub> = 12 mA, V<sub>0</sub> = 6 V) dv/dt(0<sup>+</sup>) kaç kV/s\'dir?', answer: -120, tol: 1, unit: 'kV/s', explain: 'C dv/dt = I<sub>s</sub> − V<sub>0</sub>/R − I<sub>0</sub> = 24 − 15 − 12 = −3 mA → −3 mA/25 nF = −120 kV/s.', hint: 'KCL: I<sub>s</sub> = v/R + i<sub>L</sub> + C dv/dt' });
  mcq('d4', '#d4Q', { id: 'd4q4', q: 'I<sub>0</sub> = I<sub>s</sub> = 24 mA ve V<sub>0</sub> = 0 iken ne gözlediniz?', opts: ['Aşırı sönümlü bir geçiş', 'Geçici rejim yok: devre zaten kalıcı durumda', 'Akım sıfıra düştü', 'Salınım'], correct: 1, explain: 'x(0) = I<sub>0</sub> − I<sub>s</sub> = 0 ve x\'(0) = V<sub>0</sub>/L = 0: tüm katsayılar sıfır.', hint: 'Katsayı denklemlerinin sağ tarafları ne oldu?' });
  mcq('d4', '#d4Q', { id: 'd4q5', q: 'Kuramsal eğri ile ölçüm arasındaki küçük farkın kaynağı nedir?', opts: ['Sayısal hata', 'Bobinin ≈2 Ω iç direnci: ek sönüm ve son değer 24·400/402 mA', 'Kondansatör kutbu', 'Akım kaynağının iç direnci sonsuz değil'], correct: 1, explain: 'Kuramsal eğri ideal bobin içindir. r<sub>L</sub> hem α\'ya r<sub>L</sub>/2L kadar katkı yapar hem de DC\'de akımı R ile paylaştırır.', hint: 'Tezgâhta bobin etiketine bakın.' });
  mcq('d4', '#d4Q', { id: 'd4q6', q: 'Başlangıç koşulları neyi değiştirir?', opts: ['α ve ω<sub>0</sub>\'ı', 'Son değeri', 'Yalnızca katsayıları (eğrinin yolunu); kökler ve son değer aynı kalır', 'Tepkinin türünü'], correct: 2, explain: 'Kökler yalnızca R, L, C\'ye; son değer yalnızca kaynağa bağlıdır.', hint: 'Saklanan izlerin hepsi nereye gidiyor?' });

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
    const img = (c, w = 48) => { try { return `<img src="${c.toDataURL()}" style="width:${w}%;border:1px solid #ccc">`; } catch (e) { return ''; } };
    const tab = (id) => `<table class="data"><thead>${$('#' + id + ' thead').innerHTML}</thead><tbody>${$('#' + id + ' tbody').innerHTML}</tbody></table>`;
    const html = `
      <h2 style="margin:0">Devre Kuramı I · Sanal Laboratuvar · Hafta 13 Raporu</h2>
      <p><b>Konu:</b> Paralel RLC basamak tepkisi — üç sönüm türü, aşım ve yerleşme, tasarım, başlangıç koşulları</p>
      <table class="data" style="width:auto"><tr><th>Ad Soyad</th><td class="l">${S.st.name || ''}</td><th>No</th><td class="l">${S.st.no || ''}</td><th>Grup</th><td class="l">${S.st.group || ''}</td><th>Tarih</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Özet</h3>
      <p>Tamamlanan föy adımı: <b>${sOk}/${sTot}</b> · Doğru yanıt: <b>${ok}/${tot}</b> · Puan: <b>${Math.round((50 * sOk) / sTot + (50 * ok) / tot)}/100</b></p>
      <h3>Yanıtlar</h3>
      <table class="data"><thead><tr><th>Bölüm</th><th>Soru</th><th>Yanıt</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Deney 1 · Basamak tepkisi ölçümleri</h3>${tab('d1tab')}
      <h3>Deney 2 · İmleç ölçümleri</h3>${tab('d2tab')}
      <h3>Deney 3 · Tasarım</h3>${tab('d3tab')}
      <h3>Deney 4 · Başlangıç koşulları</h3>${tab('d4tab')}
      <h3>Grafikler</h3>
      <div>${img($('#d1plotI'))} ${img($('#d1plotV'))}</div>
      <div>${img($('#d2scope'))} ${img(D3.plotCanvas)}</div>
      <div>${img(D4.plotCanvas, 60)}</div>
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

/* Devre Kuramı I · Hafta 6 — Kapasitör (Bölüm 2.2) */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd1h06';
  const S = Object.assign({ answers: {}, steps: {}, st: {}, page: 'giris', d1rows: [], d2rows: [], d3rows: [], d4rows: [], d1seen: {}, d3broken: {}, d3lcr: {}, d2unlock: {} }, Lab.store.load(KEY));
  // oturuma özgü gizli değerler (öğrenci ölçerek bulur)
  if (S.cx == null) S.cx = Math.round((0.8 + Math.random() * 3.6) * 100) / 100 * 1e-6;
  if (S.ctol == null) S.ctol = (Math.random() * 2 - 1) * 0.03;
  if (!S.u) S.u = { cer: Math.random() * 2 - 1, film: Math.random() * 2 - 1, elco: Math.random() * 2 - 1, tant: Math.random() * 2 - 1 };
  Lab.answers = S.answers;
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => Lab.store.save(KEY, S), 300); };
  Lab.onAnswer = () => { save(); progress(); };
  const near = (a, b, t) => Math.abs(a - b) <= t;

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
  function segBtns(parent, list, cur, cb) {
    const wb = document.createElement('div'); wb.className = 'row'; wb.style.cssText = 'gap:4px;margin-bottom:4px';
    wb.innerHTML = list.map(([k, t]) => `<button class="seg-btn${k === cur ? ' on' : ''}" data-k="${k}">${t}</button>`).join('');
    parent.insertBefore(wb, parent.querySelector('.ctrls'));
    $$('button', wb).forEach((b) => (b.onclick = () => { $$('button', wb).forEach((x) => x.classList.toggle('on', x === b)); cb(b.dataset.k); }));
    return wb;
  }
  const iAuto = (i) => { const a = Math.abs(i); return a < 1e-3 ? [num(i * 1e6, 2), 'µA'] : a < 1 ? [num(i * 1e3, 2), 'mA'] : [num(i, 3), 'A']; };

  /* ---------- şema yardımcıları ---------- */
  const sch = {
    w: (g, pts) => E('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'w' }, g),
    dot: (g, x, y) => E('circle', { cx: x, cy: y, r: 3.5, class: 'node' }, g),
    t: (g, x, y, s, cls = 'lbl', anchor = 'middle') => { const e = E('text', { x, y, class: cls, 'text-anchor': anchor }, g); e.innerHTML = s; return e; },
    rH(g, x1, x2, y) { const n = 6, L = 8, step = (x2 - x1 - 2 * L) / n; let d = `M${x1},${y} h${L}`; for (let i = 0; i < n; i++) d += ` l${step / 2},${i % 2 ? 7 : -7} l${step / 2},${i % 2 ? -7 : 7}`; d += ` L${x2},${y}`; return E('path', { d, class: 'w' }, g); },
    rV(g, x, y1, y2) { const n = 6, L = 8, step = (y2 - y1 - 2 * L) / n; let d = `M${x},${y1} v${L}`; for (let i = 0; i < n; i++) d += ` l${i % 2 ? 7 : -7},${step / 2} l${i % 2 ? -7 : 7},${step / 2}`; d += ` L${x},${y2}`; return E('path', { d, class: 'w' }, g); },
    gnd(g, x, y) { E('path', { d: `M${x},${y} v8 M${x - 11},${y + 8} h22 M${x - 7},${y + 13} h14 M${x - 3},${y + 18} h6`, class: 'w' }, g); },
    src(g, x, y, r = 20, kind = 'dc') {
      E('circle', { cx: x, cy: y, r, class: 'w', fill: '#fff' }, g);
      if (kind === 'ac') E('path', { d: `M${x - 10},${y} q5,-12 10,0 t10,0`, class: 'w' }, g);
      else if (kind === 'awg') E('path', { d: `M${x - 11},${y + 6} l6,-12 h6 l5,10`, class: 'w' }, g);
      else { sch.t(g, x, y - 4, '+', 'lbl'); sch.t(g, x, y + 13, '−', 'lbl'); }
    },
    term(g, x, y) { E('circle', { cx: x, cy: y, r: 4.5, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g); },
    capH(g, x1, x2, y, pol) { const m = (x1 + x2) / 2; sch.w(g, [[x1, y], [m - 6, y]]); sch.w(g, [[m + 6, y], [x2, y]]); E('path', { d: `M${m - 6},${y - 16} v32`, class: 'w', 'stroke-width': 3 }, g); E('path', { d: pol ? `M${m + 10},${y - 16} q-6,16 0,32` : `M${m + 6},${y - 16} v32`, class: 'w', 'stroke-width': 3 }, g); if (pol) sch.t(g, m - 14, y - 18, '+'); },
    capV(g, x, y1, y2, pol) { const m = (y1 + y2) / 2; sch.w(g, [[x, y1], [x, m - 6]]); sch.w(g, [[x, m + 6], [x, y2]]); E('path', { d: `M${x - 16},${m - 6} h32`, class: 'w', 'stroke-width': 3 }, g); E('path', { d: pol ? `M${x - 16},${m + 10} q16,-6 32,0` : `M${x - 16},${m + 6} h32`, class: 'w', 'stroke-width': 3 }, g); if (pol) sch.t(g, x - 22, m - 10, '+'); },
  };

  /* ================= GEZİNME / İLERLEME ================= */
  const pages = ['giris', 'onbilgi', 'onhaz', 'd1', 'd2', 'd3', 'd4', 'rapor'];
  function go(p) {
    S.page = p; save();
    $$('section.page').forEach((s) => s.classList.toggle('active', s.id === p));
    $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.p === p));
    if (p === 'd1') D1.dirty = true;
    if (p === 'd2') D2.draw();
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
    if (window._h6d2) window._h6d2.locks();
  }
  const mcq = (pg, el, o) => { qids[pg].push(o.id); Lab.mcq($(el), o); };
  const numq = (pg, el, o) => { qids[pg].push(o.id); Lab.numq($(el), o); };

  [['stName', 'name'], ['stNo', 'no'], ['stGroup', 'group'], ['stDate', 'date'], ['stComment', 'comment']].forEach(([id, k]) => {
    const e = $('#' + id); e.value = S.st[k] || (k === 'date' ? new Date().toLocaleDateString('tr-TR') : '');
    e.addEventListener('input', () => { S.st[k] = e.value; save(); });
  });

  /* ================= ÖN HAZIRLIK ================= */
  numq('onhaz', '#preQ', { id: 'p1', q: '1) Örnek 2.9: C = 2 µF, v(0) = 0. Gerilim 3 ms içinde 0 V\'tan 6 V\'a doğrusal artıyor. Bu aralıkta akım kaç mA\'dir?', answer: 4, unit: 'mA', explain: 'dv/dt = 6/0,003 = 2000 V/s → i = 2×10<sup>−6</sup> × 2000 = 4 mA (sabit).', hint: 'Önce eğimi (V/s) bulun, sonra C ile çarpın.' });
  mcq('onhaz', '#preQ', { id: 'p2', q: '2) 10 µF kapasitörün uçlarında uzun süredir sabit 12 V var. Kapasitörün akımı nedir?', opts: ['120 µA', '0 A', '1,2 A', 'Sonsuz'], correct: 1, explain: 'dv/dt = 0 → i = 0. 120 µA cevabı i = C·v hatasıdır; C·v = 120 µC yüktür. DC sürekli durumda kapasitör açık devredir.', hint: 'Akımı belirleyen gerilimin değeri mi, eğimi mi?' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) Örnek 2.10: C = 5 µF, v(t) = 10 sin(1000t) V. Akımın tepe değeri kaç mA\'dir?', answer: 50, unit: 'mA', explain: 'i = C dv/dt = 5×10<sup>−6</sup>·10·1000 cos(1000t) = 50 cos(1000t) mA.', hint: 'Zincir kuralı: 1000 dışarı çarpan olarak çıkar.' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) Örnek 2.8: A = 100 cm², d = 0,50 mm, hava. Kapasite kaç pF\'tır?', answer: 177.08, tol: 1, unit: 'pF', explain: 'A = 0,01 m², C = 8,854×10<sup>−12</sup>·0,01/5×10<sup>−4</sup> = 177 pF.', hint: '1 cm² = 10<sup>−4</sup> m² (10<sup>−2</sup> değil!).' });
  numq('onhaz', '#preQ', { id: 'p5', q: '5) Fişi çekilmiş cihazdaki 470 µF kapasitör 325 V\'a yüklü. Sakladığı enerji kaç J\'dür?', answer: 24.82, tol: 1.5, unit: 'J', explain: 'w = ½·470×10<sup>−6</sup>·325² ≈ 24,8 J. Uçlar açıkken bu enerji saatlerce kalabilir.', hint: 'w = ½Cv²' });
  numq('onhaz', '#preQ', { id: 'p6', q: '6) Boş 100 µF kapasitör ideal 10 V kaynağa dirençsiz bağlanıyor. Gerilim 1 µs\'de 10 V\'a çıksaydı ortalama akım kaç A olurdu?', answer: 1000, tol: 1, unit: 'A', explain: 'i = C Δv/Δt = 100×10<sup>−6</sup> × 10<sup>7</sup> = 1000 A. Gerçekte kablo ve kaynak direnci sınırlar; yine de büyük bir ani akım (inrush) oluşur.', hint: 'Δv/Δt = 10 V / 1 µs' });

  /* ================= DENEY 1 · i = C dv/dt ================= */
  const VDIV = [1e-3, 2e-3, 5e-3, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10];
  const TDIV = [1e-6, 2e-6, 5e-6, 1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2, 2e-2];
  const CLIST = [10e-9, 22e-9, 47e-9, 100e-9, 220e-9, 470e-9, 1e-6, 2.2e-6, 4.7e-6, 10e-6, -1];
  const RG = 50;
  const D1 = (() => {
    const box = $('#d1inst'), self = { dirty: true, wave: 'tri' };
    const set = () => (self.dirty = true);
    const fg = inst(box, 'FG-100 FONKSİYON ÜRETECİ', true, 'R<sub>iç</sub> = 50 Ω'); const fgL = lcd(fg.el, 'FREKANS · GENLİK (açık devre)', '', 210);
    segBtns(fg.el, [['sin', '∿ Sinüs'], ['tri', '△ Üçgen'], ['sq', '⊓ Kare']], 'tri', (k) => { self.wave = k; set(); });
    const kf = new Lab.Knob(fg.c, { label: 'Frekans', min: 10, max: 1e5, log: true, value: 500, dark: true, fmt: (v) => eng(v, 'Hz'), onChange: set });
    const ka = new Lab.Knob(fg.c, { label: 'Genlik (Vpp)', min: 0.1, max: 20, log: true, value: 5, dark: true, fmt: (v) => eng(v, 'Vpp'), onChange: set });
    const cb = inst(box, 'KAPASİTÖR KUTUSU · ŞÖNT', false);
    const kc = new Lab.Knob(cb.c, { label: 'C', list: CLIST, value: 100e-9, fmt: (v) => (v < 0 ? 'C_x (?)' : eng(v, 'F')), onChange: set });
    const ks = new Lab.Knob(cb.c, { label: 'R_sh', list: [1, 10, 100], value: 100, fmt: Lab.ohm, onChange: set });

    const scope = new Lab.Scope($('#scope'));
    const sk = $('#scopeKnobs');
    const k1 = new Lab.Knob(sk, { label: 'CH1 V/d', list: VDIV, value: 1, dark: true, size: 44, fmt: (v) => eng(v, 'V'), onChange: (v) => { scope.ch[0].vdiv = v; set(); } });
    const k2 = new Lab.Knob(sk, { label: 'CH2 V/d', list: VDIV, value: 0.5, dark: true, size: 44, fmt: (v) => eng(v, 'V'), onChange: (v) => { scope.ch[1].vdiv = v; set(); } });
    const kt = new Lab.Knob(sk, { label: 'ZAMAN/d', list: TDIV, value: 5e-4, dark: true, size: 44, fmt: (v) => eng(v, 's'), onChange: (v) => { scope.tdiv = v; set(); } });
    scope.ch[0].vdiv = 1; scope.ch[1].vdiv = 0.5; scope.tdiv = 5e-4; scope.ch[0].pos = 1.5; scope.ch[1].pos = -2;
    const auto = document.createElement('button'); auto.className = 'seg-btn'; auto.textContent = 'AUTO'; sk.appendChild(auto);
    auto.onclick = () => {
      const pick = (L, x) => L.find((v) => v >= x) || L[L.length - 1];
      kt.set(pick(TDIV, 2.5 / kf.value / 10));
      const m = scope.measure(); if (!m) return;
      k1.set(pick(VDIV, m.ch[0].vpp / 3.5)); k2.set(pick(VDIV, Math.max(1e-3, m.ch[1].vpp) / 3.5));
    };
    const tog = (id, f) => ($(id).onclick = (e) => { f(); e.target.classList.toggle('on'); set(); });
    tog('#ch1on', () => (scope.ch[0].on = !scope.ch[0].on));
    tog('#ch2on', () => (scope.ch[1].on = !scope.ch[1].on));
    tog('#curon', () => (scope.cur.on = !scope.cur.on));
    $('#scope').addEventListener('pointermove', () => scope.cur.drag && showMeas(scope.measure()));

    // şema
    const g = $('#d1sch');
    E('rect', { x: 30, y: 60, width: 150, height: 130, rx: 8, fill: 'none', stroke: '#888', 'stroke-dasharray': '5 4' }, g);
    sch.t(g, 105, 52, 'Fonksiyon üreteci', 'lbl').style.fill = '#666';
    sch.src(g, 70, 140, 20, 'ac'); sch.w(g, [[70, 120], [70, 90], [100, 90]]); sch.rH(g, 100, 170, 90); sch.t(g, 135, 77, '50 Ω');
    sch.w(g, [[70, 160], [70, 215], [600, 215]]); sch.gnd(g, 330, 215);
    sch.w(g, [[170, 90], [300, 90]]); sch.dot(g, 240, 90); sch.w(g, [[240, 90], [240, 60]]); sch.term(g, 240, 56); sch.t(g, 240, 44, 'CH1').style.fill = '#b8960a';
    sch.capH(g, 300, 420, 90); const tC = sch.t(g, 360, 62, '');
    sch.w(g, [[420, 90], [520, 90]]); sch.dot(g, 520, 90); sch.w(g, [[520, 90], [520, 60]]); sch.term(g, 520, 56); sch.t(g, 520, 44, 'CH2').style.fill = '#1592b8';
    sch.w(g, [[520, 90], [600, 90]]); sch.rV(g, 600, 90, 215); const tR = sch.t(g, 616, 160, '', 'lbl', 'start');
    sch.dot(g, 600, 215); sch.t(g, 330, 248, 'osiloskop toprağı (ortak)', 'lbl').style.cssText = 'font-size:11px;fill:#777';
    const tGen = sch.t(g, 105, 182, '', 'val'), tFlow = sch.t(g, 470, 120, 'i →', 'val');
    sch.t(g, 360, 120, 'v<tspan font-size="10" dy="3">C</tspan>', 'lbl'); sch.t(g, 336, 108, '+', 'lbl'); sch.t(g, 386, 108, '−', 'lbl');
    tFlow.style.fill = '#e07a10';

    function wave(x) {
      const ph = x - Math.floor(x);
      if (self.wave === 'sq') return ph < 0.5 ? 1 : -1;
      if (self.wave === 'tri') return ph < 0.25 ? 4 * ph : ph < 0.75 ? 2 - 4 * ph : 4 * ph - 4;
      return Math.sin(2 * Math.PI * x);
    }
    const capVal = () => (kc.value < 0 ? S.cx : kc.value * (1 + S.ctol));
    function sim() {
      const n = 1000, T = scope.tdiv * 10, dt = T / (n - 1), f = kf.value, Am = ka.value / 2;
      const C = capVal(), Rsh = ks.value, Rt = RG + Rsh, tau = Rt * C;
      const vs = (t) => Am * wave(f * (t - scope.tdiv));
      let vc = 0;
      const per = 1 / f, tpre = Math.ceil(Math.max(6 * tau, 2 * per) / per) * per;
      let np = Math.ceil(tpre / Math.min(tau / 4, per / 200)); np = Math.min(np, 400000);
      const hp = tpre / np, ap = 1 - Math.exp(-hp / tau);
      for (let i = 0; i < np; i++) vc += (vs(-tpre + (i + 0.5) * hp) - vc) * ap;
      const ns = Math.min(400, Math.max(1, Math.ceil(dt / (tau / 4)))), h = dt / ns, b = 1 - Math.exp(-h / tau);
      const y1 = new Float64Array(n), y2 = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const t = i * dt;
        if (i) for (let k = 0; k < ns; k++) vc += (vs(t - dt + (k + 0.5) * h) - vc) * b;
        const ii = (vs(t) - vc) / Rt;
        y1[i] = vs(t) - ii * RG + (Math.random() - 0.5) * 2e-3;
        y2[i] = ii * Rsh + (Math.random() - 0.5) * 4e-4;
      }
      return { n, y: [y1, y2] };
    }
    function showMeas(m) {
      if (!m) return;
      const [a, b] = m.ch;
      let h = `<span style="color:#f2d21b">CH1</span> Vpp ${eng(a.vpp, 'V')}<br>f ${isFinite(a.f) ? eng(a.f, 'Hz') : '—'}<br>` +
        `<span style="color:#27c4f0">CH2</span> Vpp ${eng(b.vpp, 'V')}<br>maks ${eng(b.max, 'V')}`;
      if (m.cur) h += `<br><span style="color:#ff7cf0">İMLEÇ</span> Δt ${eng(m.cur.dt, 's')}<br>ΔV(CH1) ${eng(m.cur.v1b - m.cur.v1a, 'V')}<br>CH2(a) ${eng(m.cur.v2a, 'V')}<br>CH2(b) ${eng(m.cur.v2b, 'V')}`;
      $('#scopeMeas').innerHTML = h; self.meas = m;
    }
    self.update = () => {
      if (!self.dirty) return; self.dirty = false;
      const wn = { sin: 'sinüs', tri: 'üçgen', sq: 'kare' }[self.wave];
      fgL(`${wn} · ${eng(kf.value, 'Hz')} · ${eng(ka.value, 'Vpp')}`);
      tGen.textContent = wn + ' · ' + eng(kf.value, 'Hz');
      tC.textContent = 'C = ' + (kc.value < 0 ? 'C_x (?)' : eng(kc.value, 'F'));
      tR.textContent = 'R_sh = ' + Lab.ohm(ks.value);
      if (kc.value === 1e-6) S.d1seen[self.wave] = true;
      scope.draw(sim()); showMeas(scope.measure());
    };
    const tbody = $('#d1tab tbody');
    function table() {
      tbody.innerHTML = S.d1rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.w}</td><td>${eng(r.f, 'Hz')}</td><td>${eng(r.a, 'Vpp')}</td><td>${r.C < 0 ? 'C_x' : eng(r.C, 'F')}</td><td>${Lab.ohm(r.R)}</td><td>${eng(r.v1, 'V')}</td><td>${eng(r.v2, 'V')}</td></tr>`).join('');
    }
    self.rec = () => {
      const m = scope.measure(); if (!m) return;
      S.d1rows.push({ w: { sin: 'sinüs', tri: 'üçgen', sq: 'kare' }[self.wave], f: kf.value, a: ka.value, C: kc.value, R: ks.value, v1: m.ch[0].vpp, v2: m.ch[1].vpp });
      save(); table(); Lab.toast(`Kaydedildi: CH1 ${eng(m.ch[0].vpp, 'Vpp')}, CH2 ${eng(m.ch[1].vpp, 'Vpp')}`);
    };
    $('#d1rec').onclick = self.rec;
    $('#d1del').onclick = () => { S.d1rows.pop(); save(); table(); };
    $('#d1csv').onclick = () => Lab.downloadCSV('hafta6_deney1.csv', ['#', 'dalga', 'f (Hz)', 'uretec (Vpp)', 'C (F)', 'Rsh (ohm)', 'CH1 Vpp (V)', 'CH2 Vpp (V)'], S.d1rows.map((r, i) => [i + 1, r.w, r.f, r.a, r.C < 0 ? 'Cx' : r.C, r.R, +r.v1.toPrecision(4), +r.v2.toPrecision(4)]));
    table();
    Object.assign(self, { kf, ka, kc, ks, k1, k2, kt, scope });
    return self;
  })();

  steps('d1', [
    { t: 'Üreteci <b>üçgen, 1 kHz, 2 Vpp</b> yapın. (Değer yazmak için düğmeye çift tıklayın.)', test: () => D1.wave === 'tri' && near(D1.kf.value, 1000, 30) && near(D1.ka.value, 2, 0.06) },
    { t: 'Kapasitör kutusunu <b>1 µF</b>, şöntü <b>10 Ω</b> yapın. CH2\'de kare dalga görünene kadar CH2 V/d\'yi küçültün (≤ 20 mV/d).', test: () => S.steps.d1_0 && D1.kc.value === 1e-6 && D1.ks.value === 10 && D1.k2.value <= 0.02 },
    { t: '<b>İMLEÇ</b>\'leri açın, CH1\'in bir rampası üzerinde Δt ve ΔV okuyup eğimi bulun; CH2 tepe değerinden akımı hesaplayın. Bir ölçüm kaydedin.', test: () => D1.scope.cur.on && S.d1rows.some((r) => r.C === 1e-6 && r.w === 'üçgen') },
    { t: 'Aynı kapasitörle dalga biçimini önce <b>sinüs</b> sonra <b>kare</b> yapıp akımın biçimine bakın.', test: () => S.d1seen.sin && S.d1seen.sq },
    { t: 'Kapasitör kutusunu <b>C<sub>x</sub> (?)</b> konumuna alın; üçgen dalgayla en az <b>2 farklı frekansta</b> ölçüm kaydedin.', test: () => new Set(S.d1rows.filter((r) => r.C < 0 && r.w === 'üçgen').map((r) => Math.round(r.f))).size >= 2 },
    { t: 'Kaydettiğiniz değerlerden C<sub>x</sub>\'i hesaplayıp soruları yanıtlayın.', test: () => S.answers.d1q3 && S.answers.d1q3.ok },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: 'Üçgen, 1 kHz, 2 Vpp ve C = 1 µF için ideal akım karesinin tepe değeri kaç mA\'dir? (|dv/dt| = 2V<sub>pp</sub>f)', answer: 4, tol: 3, unit: 'mA', explain: '|dv/dt| = 2·2·1000 = 4000 V/s → i = 10<sup>−6</sup>·4000 = 4 mA. 10 Ω şöntte 40 mV tepe, 80 mVpp.', hint: 'Bir yarım periyotta (0,5 ms) gerilim 2 V değişir.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'Aynı ayarda CH2\'de ölçtüğünüz kare dalganın tepeden tepeye değeri kaç mV\'tur?', answer: () => 2 * 4e-3 * (1 + S.ctol) * 10 * 1e3, tol: 6, unit: 'mV', explain: 'V<sub>pp</sub>(CH2) = 2·i·R<sub>sh</sub>. Ölçümünüz 80 mV civarında olmalı (kapasitör toleransı ±%3).', hint: 'Osiloskop ölçüm panelindeki CH2 Vpp değerini okuyun.' });
  numq('d1', '#d1Q', { id: 'd1q3', q: 'Ölçümlerinizden bilinmeyen kapasitör C<sub>x</sub> kaç µF\'tır?', answer: () => S.cx * 1e6, tol: 6, unit: 'µF', explain: 'C<sub>x</sub> = i / |dv/dt| = (V<sub>pp,CH2</sub>/2R<sub>sh</sub>) / (2V<sub>pp,CH1</sub>f).', hint: 'Akım = (CH2 Vpp / 2) / R<sub>sh</sub>; eğim = 2·(CH1 Vpp)·f. Köşelerdeki yuvarlanmanın etkisini azaltmak için düşük frekans seçin.' });
  mcq('d1', '#d1Q', { id: 'd1q4', q: 'Sinüs gerilimde CH2 (akım) eğrisi CH1\'e göre nasıldır?', opts: ['Aynı fazda', '90° geride', '90° önde (kosinüs): akım tepe, gerilim sıfırdan geçerken oluşur', '180° ters fazda'], correct: 2, explain: 'i = ωCV<sub>m</sub> cos ωt. Akım, gerilimin eğiminin en büyük olduğu anda (sıfır geçişinde) tepe yapar.', hint: 'Sinüsün eğimi nerede en büyüktür?' });
  mcq('d1', '#d1Q', { id: 'd1q5', q: 'Kare gerilimde CH2\'de neden kısa, sivri akım darbeleri görülür?', opts: ['Kapasitör bozuktur', 'Gerilim sabitken akım sıfır; kenarlarda dv/dt çok büyük. Darbenin tepesini 50 Ω + R<sub>sh</sub> sınırlar', 'Osiloskop yanlış ayarlıdır', 'Kare dalgada akım da karedir'], correct: 1, explain: 'İdeal kaynakla kenarda dv/dt → ∞ olurdu; gerçekte akım ΔV/(R<sub>g</sub>+R<sub>sh</sub>) ile başlar ve τ ile söner.', hint: 'i = C dv/dt: kare dalganın düz kısımlarında eğim nedir?' });
  mcq('d1', '#d1Q', { id: 'd1q6', q: 'Şönt direnç neden 1–10 Ω gibi küçük seçilir?', opts: ['Daha çok akım aksın diye', 'Kapasitör geriliminin, üretecin verdiği gerilime yakın kalması (şönt düşümünün ihmal edilebilmesi) için', 'Osiloskobu korumak için', 'Fark etmez'], correct: 1, explain: 'R<sub>sh</sub> büyükse devre bir RC devresine dönüşür; v<sub>C</sub> artık üçgen olmaz, akım da kare olmaz. 100 Ω ile deneyip görebilirsiniz.', hint: 'R<sub>sh</sub> = 100 Ω ile 1 µF ve 1 kHz\'de ne gördünüz?' });

  /* ================= DENEY 2 · Gerilim profili ================= */
  const EX236 = '0:0, 2:20, 4:20, 7:-10, 9:-10';
  const D2 = (() => {
    const self = {};
    const box = $('#d2inst');
    const aw = inst(box, 'AWG · KEYFİ DALGA ÜRETECİ', true, 'iç direnç R<sub>s</sub>'); const awL = lcd(aw.el, 'PROFİL SÜRESİ', 'ms', 120);
    const kr = new Lab.Knob(aw.c, { label: 'R_s', list: [0.1, 0.5, 1, 2, 5, 10, 50], value: S.d2Rs ?? 1, dark: true, fmt: Lab.ohm, onChange: (v) => { S.d2Rs = v; save(); run(); } });
    const cb = inst(box, 'KAPASİTÖR', false);
    const kc = new Lab.Knob(cb.c, { label: 'C', list: [1e-6, 2e-6, 4.7e-6, 10e-6, 22e-6, 50e-6, 100e-6], value: S.d2C ?? 50e-6, fmt: (v) => eng(v, 'F'), onChange: (v) => { S.d2C = v; save(); run(); } });
    const pr = inst(box, 'AKIM PROBU · TEPE TUTMA', false); const prL = lcd(pr.el, 'i<sub>tepe</sub>', 'A', 120);
    const presets = [['Örnek 2.36 (C = 50 µF)', EX236, 50e-6], ['Örnek 2.9 (C = 2 µF)', '0:0, 3:6, 5:6', 2e-6], ['Basamak 0→10 V', '0:0, 1:0, 1:10, 4:10', 10e-6], ['Üçgen ±5 V', '0:0, 1:5, 3:-5, 5:5, 6:0', 10e-6]];
    $('#d2presets').innerHTML = presets.map((p, i) => `<button class="btn sec small" data-i="${i}">${p[0]}</button>`).join('');
    $$('#d2presets button').forEach((b) => (b.onclick = () => { const p = presets[+b.dataset.i]; $('#d2prof').value = p[1]; kc.set(p[2]); apply(); }));
    $('#d2prof').value = S.d2prof || EX236;
    $('#d2apply').onclick = apply;
    $('#d2prof').addEventListener('keydown', (e) => e.key === 'Enter' && apply());
    self.sel = 'i';
    $$('#d2sel button').forEach((b) => (b.onclick = () => {
      if (b.disabled) return Lab.toast('Bu grafik, ilgili soruyu kendi hesabınızla doğru yanıtladığınızda açılır.');
      self.sel = b.dataset.k; $$('#d2sel button').forEach((x) => x.classList.toggle('on', x === b)); draw();
    }));
    self.locks = () => {
      const pOk = S.answers.d2q2 && S.answers.d2q2.ok, wOk = S.answers.d2q3 && S.answers.d2q3.ok;
      const bp = $('#d2sel [data-k="p"]'), bw = $('#d2sel [data-k="w"]');
      bp.style.opacity = pOk ? 1 : 0.4; bw.style.opacity = wOk ? 1 : 0.4; bp.disabled = !pOk; bw.disabled = !wOk;
    };
    $('#d2theo').onchange = draw;
    $('#d2t').oninput = readout;

    // şema
    const g = $('#d2sch');
    E('rect', { x: 30, y: 30, width: 190, height: 140, rx: 8, fill: 'none', stroke: '#888', 'stroke-dasharray': '5 4' }, g);
    sch.t(g, 125, 24, 'AWG', 'lbl').style.fill = '#666';
    sch.src(g, 75, 110, 20, 'awg'); sch.w(g, [[75, 90], [75, 60], [110, 60]]); sch.rH(g, 110, 190, 60); const tRs = sch.t(g, 150, 48, '');
    sch.w(g, [[75, 130], [75, 175], [520, 175]]); sch.gnd(g, 300, 175);
    sch.w(g, [[190, 60], [400, 60]]); E('circle', { cx: 300, cy: 60, r: 13, fill: 'none', stroke: '#e07a10', 'stroke-width': 2.5 }, g); sch.t(g, 300, 40, 'akım probu').style.fill = '#e07a10';
    sch.w(g, [[400, 60], [400, 90]]); sch.capV(g, 400, 90, 150); sch.w(g, [[400, 150], [400, 175]]); const tC = sch.t(g, 426, 124, '', 'lbl', 'start');
    sch.dot(g, 400, 60); sch.dot(g, 400, 175); sch.w(g, [[400, 60], [520, 60], [520, 95]]); sch.w(g, [[520, 145], [520, 175]]);
    E('circle', { cx: 520, cy: 120, r: 25, fill: '#fff', class: 'w' }, g); sch.t(g, 520, 125, 'V');
    const tRead = sch.t(g, 560, 110, '', 'val', 'start'), tRead2 = sch.t(g, 560, 132, '', 'val', 'start');

    const plotV = new Lab.Plot($('#d2plotV'), { xlabel: 't  (ms)', ylabel: 'v_C  (V)' });
    const plotX = new Lab.Plot($('#d2plotX'), { xlabel: 't  (ms)', ylabel: 'i  (A)' });
    let pts = [], res = null;
    function parse(s) {
      const p = s.split(/[,;]+/).map((x) => x.trim()).filter(Boolean).map((x) => x.split(':').map((y) => parseFloat(y.replace(/\s/g, ''))));
      if (p.length < 2 || p.some((q) => q.length !== 2 || !q.every(isFinite))) return null;
      for (let i = 1; i < p.length; i++) if (p[i][0] < p[i - 1][0]) return null;
      if (p[0][0] !== 0 || p[p.length - 1][0] <= 0 || p[p.length - 1][0] > 100) return null;
      if (p.some((q) => Math.abs(q[1]) > 50)) return null;
      return p;
    }
    function vprof(t) { // t: ms
      let k = 0; for (let i = 0; i < pts.length; i++) if (pts[i][0] <= t) k = i;
      if (k >= pts.length - 1) return pts[pts.length - 1][1];
      const a = pts[k], b = pts[k + 1]; return a[1] + ((b[1] - a[1]) * (t - a[0])) / (b[0] - a[0]);
    }
    const hasJump = () => pts.some((p, i) => i && p[0] === pts[i - 1][0] && p[1] !== pts[i - 1][1]);
    function apply() {
      const p = parse($('#d2prof').value);
      if (!p) return Lab.toast('Profil okunamadı. Biçim: 0:0, 2:20, 4:20 … (t ms artan, ilk nokta t = 0, |v| ≤ 50 V, t ≤ 100 ms)', 4500);
      S.d2prof = $('#d2prof').value.trim(); save(); pts = p; run();
    }
    function run() {
      if (!pts.length) { const p = parse($('#d2prof').value) || parse(EX236); pts = p; }
      const C = kc.value, Rs = kr.value, tau = Rs * C, tEnd = pts[pts.length - 1][0] * 1e-3, N = 1500, h0 = tEnd / N;
      const ns = Math.min(300, Math.max(1, Math.ceil(h0 / (tau / 3)))), h = h0 / ns, a = 1 - Math.exp(-h / tau);
      const T = new Float64Array(N + 1), V = new Float64Array(N + 1), I = new Float64Array(N + 1), VP = new Float64Array(N + 1);
      let vc = vprof(0), ipk = 0;
      for (let i = 0; i <= N; i++) {
        const t = i * h0;
        if (i) for (let k = 0; k < ns; k++) {
          const tm = t - h0 + (k + 0.5) * h, vpm = vprof(tm * 1e3);
          const ii = (vpm - vc) / Rs * (h / tau > 0.05 ? (1 - Math.exp(-h / tau)) / (h / tau) : 1);
          if (Math.abs(ii) > Math.abs(ipk)) ipk = ii;
          vc += (vpm - vc) * a;
        }
        const vp = vprof(t * 1e3), ii = (vp - vc) / Rs;
        if (Math.abs(ii) > Math.abs(ipk)) ipk = ii;
        T[i] = t; V[i] = vc; I[i] = ii; VP[i] = vp;
      }
      res = { T, V, I, VP, N, C, Rs, tEnd, ipk, jump: hasJump() };
      awL(num(tEnd * 1e3, 1)); prL(num(Math.abs(ipk), 3));
      tRs.textContent = 'R_s = ' + Lab.ohm(Rs); tC.textContent = 'C = ' + eng(C, 'F');
      draw();
    }
    function draw() {
      if (!res) return run();
      const { T, V, I, N, C, tEnd } = res, step = 3;
      const tx = (i) => T[i] * 1e3;
      const sV = [{ pts: [], line: true, color: '#0b5cad', width: 2.2 }];
      for (let i = 0; i <= N; i += step) sV[0].pts.push([tx(i), V[i]]);
      if ($('#d2theo').checked) sV.push({ pts: pts.map((p) => [p[0], p[1]]), line: true, color: '#e07a10', dash: [6, 4] });
      const vmax = Math.max(1, ...pts.map((p) => Math.abs(p[1]))) * 1.15;
      const tc = cursorIdx(); sV.push({ pts: [[tx(tc), -vmax], [tx(tc), vmax]], line: true, color: '#c2185b', width: 1, dash: [3, 3] });
      plotV.draw(sV, [0, tEnd * 1e3], [-vmax, vmax]);
      const f = { i: (i) => I[i], p: (i) => V[i] * I[i], w: (i) => 0.5 * C * V[i] * V[i] * 1e3 }[self.sel];
      plotX.o.ylabel = { i: 'i  (A)', p: 'p  (W)', w: 'w  (mJ)' }[self.sel];
      const sX = [{ pts: [], line: true, color: { i: '#c62828', p: '#6a1b9a', w: '#1a8a4a' }[self.sel], width: 2.2 }];
      for (let i = 0; i <= N; i += step) sX[0].pts.push([tx(i), f(i)]);
      // görünür ölçek: basamak darbesi ekranı ezmesin diye %99 dilim
      const ys = sX[0].pts.map((p) => p[1]).sort((a, b) => a - b);
      let lo = Math.min(0, ys[Math.floor(ys.length * 0.005)]), hi = Math.max(0, ys[Math.floor(ys.length * 0.995)]);
      if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
      const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
      if (self.sel === 'i' && $('#d2theo').checked) {
        const th = []; for (let k = 1; k < pts.length; k++) { const a = pts[k - 1], b = pts[k]; if (b[0] > a[0]) { const ii = C * (b[1] - a[1]) / ((b[0] - a[0]) * 1e-3); th.push([a[0], ii], [b[0], ii]); } else th.push([a[0], b[1] > a[1] ? hi : lo]); }
        sX.push({ pts: th, line: true, color: '#e07a10', dash: [6, 4] });
      }
      sX.push({ pts: [[tx(tc), lo], [tx(tc), hi]], line: true, color: '#c2185b', width: 1, dash: [3, 3] });
      plotX.draw(sX, [0, tEnd * 1e3], [lo, hi]);
      readout();
    }
    const cursorIdx = () => Math.round((+$('#d2t').value / 1000) * res.N);
    function readout() {
      if (!res) return;
      const i = cursorIdx(), t = res.T[i] * 1e3;
      self.cur = { t, v: res.V[i], i: res.I[i] };
      $('#d2read').innerHTML = `t = ${num(t, 3)} ms &nbsp;·&nbsp; Voltmetre v<sub>C</sub> = ${num(res.V[i], 3)} V &nbsp;·&nbsp; Akım probu i = ${iAuto(res.I[i]).join(' ')} &nbsp;·&nbsp; tepe tutma |i|<sub>maks</sub> = ${num(Math.abs(res.ipk), 3)} A` + (res.jump ? ' &nbsp;<span style="color:#ffb04a">⚠ profilde basamak var</span>' : '');
      tRead.textContent = 'v_C = ' + num(res.V[i], 2) + ' V'; tRead2.textContent = 'i = ' + iAuto(res.I[i]).join(' ');
      if (!self._drawing) { self._drawing = true; requestAnimationFrame(() => { self._drawing = false; redrawCursor(); }); }
    }
    let lastIdx = -1;
    function redrawCursor() { const i = cursorIdx(); if (i !== lastIdx) { lastIdx = i; draw(); } }
    const tbody = $('#d2tab tbody');
    function table() {
      tbody.innerHTML = S.d2rows.map((r, i) => `<tr><td>${i + 1}</td><td>${eng(r.C, 'F')}</td><td>${Lab.ohm(r.Rs)}</td><td>${num(r.t, 3)}</td><td>${num(r.v, 3)}</td><td>${num(r.i, 4)}</td><td>${num(Math.abs(r.ipk), 3)}</td><td class="l" style="font-size:11px">${r.prof}</td></tr>`).join('');
    }
    self.rec = () => {
      if (!res || !self.cur) return;
      S.d2rows.push({ C: res.C, Rs: res.Rs, t: self.cur.t, v: self.cur.v, i: self.cur.i, ipk: res.ipk, jump: res.jump, prof: S.d2prof || EX236 });
      save(); table(); Lab.toast(`Kaydedildi: t = ${num(self.cur.t, 2)} ms, v_C = ${num(self.cur.v, 3)} V, i = ${iAuto(self.cur.i).join(' ')}`);
    };
    $('#d2rec').onclick = self.rec;
    $('#d2del').onclick = () => { S.d2rows.pop(); save(); table(); };
    $('#d2csv').onclick = () => Lab.downloadCSV('hafta6_deney2.csv', ['#', 'C (F)', 'Rs (ohm)', 't (ms)', 'vC (V)', 'i (A)', 'itepe (A)', 'profil'], S.d2rows.map((r, i) => [i + 1, r.C, r.Rs, +r.t.toFixed(4), +r.v.toFixed(4), +r.i.toPrecision(5), +Math.abs(r.ipk).toPrecision(4), r.prof.replace(/;/g, ',')]));
    table();
    Object.assign(self, { kc, kr, run, draw, res: () => res, apply, plots: [$('#d2plotV'), $('#d2plotX')] });
    return self;
  })();
  D2.apply(); window._h6d2 = D2; D2.locks();

  const normP = (s) => (s || '').replace(/\s/g, '');
  const ex236 = (r) => normP(r.prof) === normP(EX236) && r.C === 50e-6;
  steps('d2', [
    { t: '<b>Örnek 2.36</b> hazır profilini yükleyin (C = 50 µF; 0–2 ms\'de 20 V\'a çıkış, 4 ms\'ye kadar sabit, 7 ms\'de −10 V\'a iniş).', test: () => normP(S.d2prof) === normP(EX236) && D2.kc.value === 50e-6 },
    { t: 'Zaman imlecini <b>0–2 ms</b>, <b>2–4 ms</b> ve <b>4–7 ms</b> aralıklarına getirip her aralıkta en az birer ölçüm kaydedin (<kbd>R</kbd>).', test: () => [[0.2, 1.9], [2.2, 3.8], [4.2, 6.9]].every(([a, b]) => S.d2rows.some((r) => ex236(r) && r.t > a && r.t < b)) },
    { t: 'Kaydettiğiniz v ve i\'den t = 1 ms\'deki <b>gücü</b> hesaplayıp ilgili soruyu yanıtlayın: güç grafiği açılır. İşaretini yorumlayın.', test: () => S.answers.d2q2 && S.answers.d2q2.ok },
    { t: '<b>Enerji</b> sorularını yanıtlayın; açılan w grafiğinde v<sub>C</sub> = 0 iken (≈6 ms) enerjinin sıfır olduğunu görün.', test: () => ['d2q3', 'd2q4'].every((q) => S.answers[q] && S.answers[q].ok) },
    { t: '<b>Basamak 0→10 V</b> profilini yükleyin, R<sub>s</sub> = <b>1 Ω</b> iken basamaktan hemen sonra bir ölçüm kaydedin; tepe akımı not edin.', test: () => S.d2rows.some((r) => r.jump && r.Rs === 1) },
    { t: 'R<sub>s</sub>\'yi <b>10 Ω</b> yapıp aynı ölçümü tekrarlayın. Tepe akım ve v<sub>C</sub>\'nin yükselme süresi nasıl değişti?', test: () => S.d2rows.some((r) => r.jump && r.Rs === 10) },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'Örnek 2.36: 0–2 ms aralığında kapasitör akımı kaç A\'dir?', answer: 0.5, tol: 3, unit: 'A', explain: 'i = C dv/dt = 50×10<sup>−6</sup> × 20/0,002 = 0,5 A.', hint: 'Kaydettiğiniz akım değerine bakın; eğim × C ile sağlayın.' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 't = 1 ms anında kapasitörün aldığı güç p kaç W\'tır?', answer: 5, tol: 4, unit: 'W', explain: 'v(1 ms) = 10 V, i = 0,5 A → p = 5 W > 0: kapasitör enerji alıyor.', hint: 'p = v·i (pasif işaret kuralı).' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 't = 2 ms\'de depolanan enerji kaç mJ\'dür?', answer: 10, tol: 3, unit: 'mJ', explain: 'w = ½·50×10<sup>−6</sup>·20² = 10 mJ.', hint: 'w = ½Cv²' });
  numq('d2', '#d2Q', { id: 'd2q4', q: 't = 7 ms\'de depolanan enerji kaç mJ\'dür?', answer: 2.5, tol: 4, unit: 'mJ', explain: 'v = −10 V → w = ½·50×10<sup>−6</sup>·100 = 2,5 mJ. Enerji gerilimin karesine bağlıdır: işaret önemsiz.', hint: 'Gerilim negatif olsa da v² pozitiftir.' });
  mcq('d2', '#d2Q', { id: 'd2q5', q: '4–7 ms aralığında (i = −0,5 A) gücün işareti nasıldır?', opts: ['Hep pozitif', 'Hep negatif', '4–6 ms\'de negatif (enerji geri verilir), 6–7 ms\'de pozitif (ters yönde yeniden yüklenir)', 'Sıfır'], correct: 2, explain: '4–6 ms: v > 0, i < 0 → p < 0. 6 ms\'de v = 0 → w = 0. 6–7 ms: v < 0, i < 0 → p > 0.', hint: 'v\'nin işareti 6 ms\'de değişiyor.' });
  numq('d2', '#d2Q', { id: 'd2q6', q: 'Basamak 0→10 V, R<sub>s</sub> = 1 Ω: basamak anındaki tepe akım yaklaşık kaç A\'dir?', answer: 10, tol: 5, unit: 'A', explain: 'Gerilim sıçrayamaz: v<sub>C</sub>(0<sup>+</sup>) = 0, tüm 10 V R<sub>s</sub> üzerine düşer → i = 10 A. Sonra τ = R<sub>s</sub>C ile söner.', hint: 'Basamaktan hemen sonra v<sub>C</sub> hâlâ kaç volttur?' });
  mcq('d2', '#d2Q', { id: 'd2q7', q: 'R<sub>s</sub> → 0 olsaydı basamakta ne olurdu?', opts: ['v<sub>C</sub> de anında sıçrar, akım sonlu kalır', 'Akım sonsuz olurdu (ideal model çelişir); bu yüzden fiziksel devrelerde kapasitör gerilimi sürekli kabul edilir', 'Akım sıfır olurdu', 'Kapasitör açık devre olurdu'], correct: 1, explain: 'i = C dv/dt; sıfır sürede sonlu gerilim değişimi sonsuz akım ister. Süreklilik kuralı: v<sub>C</sub>(0<sup>+</sup>) = v<sub>C</sub>(0<sup>−</sup>).', hint: 'Δt → 0 iken C·Δv/Δt?' });

  /* ================= DENEY 3 · Gerçek kapasitör ================= */
  const PARTS = {
    cer: { name: 'Seramik 100 nF / 50 V', short: 'Seramik', Cn: 100e-9, tol: 0.10, Vr: 50, pol: false, esr: 0.03, Gf: 2e-11, Cth: 0.03, Rth: 150 },
    film: { name: 'Film (MKT) 1 µF / 63 V', short: 'Film', Cn: 1e-6, tol: 0.05, Vr: 63, pol: false, esr: 0.015, Gf: 1e-10, Cth: 0.3, Rth: 60 },
    elco: { name: 'Elektrolitik 100 µF / 25 V', short: 'Elektrolitik', Cn: 100e-6, tol: 0.20, Vr: 25, pol: true, esr: 0.45, Gf: 3e-7, Cth: 1.0, Rth: 40, Tx: 115 },
    tant: { name: 'Tantal 10 µF / 16 V', short: 'Tantal', Cn: 10e-6, tol: 0.10, Vr: 16, pol: true, esr: 1.2, Gf: 3e-8, Cth: 0.12, Rth: 80, Tx: 150 },
  };
  const D3 = (() => {
    const self = { part: S.d3part || 'elco', on: false, rev: false, v: 0, T: 25, tOn: 0, dmg: 0, hold: 0, lcrTxt: '—', i: 0 };
    const pb = $('#d3parts');
    pb.innerHTML = '<b style="font-size:13px">Kapasitör çekmecesi:</b> ' + Object.entries(PARTS).map(([k, p]) => `<button class="seg-btn" data-k="${k}">${p.name}</button>`).join('') + ' <button class="btn warn small" id="d3new">Yenisini tak</button>';
    $$('button[data-k]', pb).forEach((b) => (b.onclick = () => { if (self.on) return Lab.toast('Önce kaynağın çıkışını kapatın: devre değiştirirken enerji kesilir.'); self.part = b.dataset.k; S.d3part = self.part; save(); self.v = 0; self.T = 25; self.dmg = 0; self.tOn = 0; self.lcrTxt = '—'; mark(); drawPart(); }));
    const mark = () => $$('button[data-k]', pb).forEach((b) => b.classList.toggle('on', b.dataset.k === self.part));
    $('#d3new').onclick = () => { delete S.d3broken[self.part]; save(); self.v = 0; self.T = 25; self.dmg = 0; self.tOn = 0; Lab.toast('Yeni bir ' + PARTS[self.part].name + ' takıldı.'); drawPart(); };
    const box = $('#d3inst');
    const ps = inst(box, 'DC GÜÇ KAYNAĞI · 0–60 V', true, 'akım sınırı 1 A'); const psL = lcd(ps.el, 'ÇIKIŞ', 'V', 110), psI = lcd(ps.el, 'AKIM', 'A', 110);
    const kV = new Lab.Knob(ps.c, { label: 'Gerilim', min: 0, max: 60, step: 0.5, value: 12, dark: true, fmt: (v) => num(v, 1) + ' V' });
    const bOut = document.createElement('button'); bOut.className = 'seg-btn'; bOut.style.cssText = 'width:96px;padding:8px 4px'; ps.c.appendChild(bOut);
    const bPol = document.createElement('button'); bPol.className = 'seg-btn'; bPol.style.cssText = 'width:96px;padding:8px 4px'; ps.c.appendChild(bPol);
    const btxt = () => { bOut.textContent = self.on ? 'ÇIKIŞ AÇIK' : 'ÇIKIŞ KAPALI'; bOut.classList.toggle('on', self.on); bPol.textContent = self.rev ? 'KUTUP: TERS' : 'KUTUP: NORMAL'; bPol.style.color = self.rev ? '#ff6b4a' : ''; };
    bOut.onclick = () => { self.on = !self.on; if (self.on) self.tOn = 0; btxt(); };
    bPol.onclick = () => { if (self.on) return Lab.toast('Kutbu çıkış açıkken değiştirmeyin. Önce çıkışı kapatın.'); self.rev = !self.rev; btxt(); };
    btxt();
    const rb = inst(box, 'SERİ DİRENÇ', false);
    const kR = new Lab.Knob(rb.c, { label: 'R', list: [10, 100, 1e3, 1e4], value: 1e3, fmt: Lab.ohm });
    const m1 = inst(box, 'DMM-1 · AKIM', false); const m1L = lcd(m1.el, 'DC A · oto aralık', 'µA', 120);
    const m2 = inst(box, 'DMM-2 · v<sub>C</sub>', false); const m2L = lcd(m2.el, 'DC V', 'V', 110);
    const ir = inst(box, 'IR TERMOMETRE', false); const irL = lcd(ir.el, 'GÖVDE', '°C', 90);
    const lc = inst(box, 'LCR METRE · 1 kHz', false); const lcL = lcd(lc.el, 'C · ESR', '', 170);
    const bL = document.createElement('button'); bL.className = 'btn small'; bL.textContent = 'Ölç'; lc.c.appendChild(bL);
    const bD = document.createElement('button'); bD.className = 'btn sec small'; bD.textContent = 'Boşalt (100 Ω)'; lc.c.appendChild(bD);
    bD.onclick = () => { if (self.on) return Lab.toast('Önce kaynağın çıkışını kapatın.'); self.v = 0; Lab.toast('Kapasitör 100 Ω boşaltma probuyla boşaltıldı. DMM-2 ≈ 0 V.'); };
    const P = () => PARTS[self.part], Creal = () => P().Cn * (1 + P().tol * 0.85 * S.u[self.part]);
    bL.onclick = () => {
      if (self.on) return Lab.toast('LCR metreyi beslenen devreye bağlamayın! Önce çıkışı kapatın.', 4000);
      if (Math.abs(self.v) > 0.5) return Lab.toast('⚠ Kapasitör ' + num(self.v, 1) + ' V\'a yüklü! LCR metrenin girişi zarar görür. Önce boşaltın.', 4500);
      const br = S.d3broken[self.part];
      if (br) { self.lcrTxt = br === 'delindi' || br === 'yandı' ? 'KISA DEVRE' : 'OL (açık)'; }
      else { const c = Creal(); self.lcrTxt = eng(c, 'F') + ' · ' + num(P().esr * (1 + 0.1 * S.u[self.part]), 2) + ' Ω'; S.d3lcr[self.part] = true; save(); }
      lcL(self.lcrTxt);
    };
    // görsel
    const vis = $('#d3vis'); const vg = E('g', {}, vis), fx = E('g', {}, vis);
    function drawPart() {
      vg.innerHTML = ''; const br = S.d3broken[self.part], k = self.part;
      const b = clamp((self.T - 60) / 50 + self.dmg / 6, 0, 1) * (br ? 0 : 1);
      E('rect', { x: 0, y: 225, width: 320, height: 35, fill: '#d9d4c6' }, vg);
      const lead = (x, y2) => E('line', { x1: x, y1: 180, x2: x, y2, stroke: '#9aa', 'stroke-width': 4 }, vg);
      if (k === 'elco') {
        lead(140, 245); lead(180, 232);
        const body = E('path', { d: `M110,${70} Q160,${70 - 40 * b} 210,70 V200 Q160,210 110,200 Z`, fill: br ? '#3b3b44' : '#1f4fa0', stroke: '#0d2550' }, vg);
        E('rect', { x: 180, y: 70, width: 22, height: 132, fill: br ? '#555' : '#c9d6ea' }, vg);
        for (let y = 90; y < 200; y += 24) sch.t(vg, 191, y, '−', '').setAttribute('style', 'fill:#1f4fa0;font:700 16px sans-serif');
        const tx = sch.t(vg, 145, 140, '100µF 25V', ''); tx.setAttribute('style', 'fill:#e6eefc;font:700 13px sans-serif'); tx.setAttribute('transform', 'rotate(-90 145 140)');
        if (br) { E('path', { d: 'M110,70 l12,-26 l14,18 l12,-30 l12,26 l14,-22 l12,24 l14,-18 l10,28 Z', fill: '#c9c4b8', stroke: '#333' }, vg); E('path', { d: 'M150,40 q-10,-20 6,-34 M175,36 q12,-18 -2,-34', stroke: '#777', fill: 'none', 'stroke-width': 3, opacity: 0.6 }, vg); }
        else E('path', { d: `M135,${70 - 30 * b} l50,0 M160,${58 - 34 * b} l0,24`, stroke: '#9fb3d6', 'stroke-width': 2 }, vg);
        void body;
      } else if (k === 'cer') {
        lead(140, 245); lead(180, 245);
        E('ellipse', { cx: 160, cy: 120, rx: 55 + 6 * b, ry: 60 + 6 * b, fill: br ? '#4a3a2a' : '#d9822b', stroke: '#8a4f12', 'stroke-width': 2 }, vg);
        sch.t(vg, 160, 116, '104', '').setAttribute('style', 'fill:#3a2208;font:700 20px Consolas');
        sch.t(vg, 160, 138, '50V', '').setAttribute('style', 'fill:#3a2208;font:12px Consolas');
        if (br) E('path', { d: 'M120,80 l25,30 l-10,15 l30,40', stroke: '#111', 'stroke-width': 3, fill: 'none' }, vg);
      } else if (k === 'film') {
        lead(130, 245); lead(190, 245);
        E('rect', { x: 95, y: 70, width: 130, height: 110, rx: 10, fill: br ? '#4a2a2a' : '#c62828', stroke: '#7f1010', 'stroke-width': 2 }, vg);
        sch.t(vg, 160, 112, 'MKT 1µ', '').setAttribute('style', 'fill:#fff;font:700 18px Consolas');
        sch.t(vg, 160, 136, '63V ±5%', '').setAttribute('style', 'fill:#fff;font:13px Consolas');
      } else {
        lead(145, 245); lead(175, 238);
        E('path', { d: `M160,${60 - 10 * b} C${215 + 8 * b},${70} ${215 + 8 * b},180 160,180 C${105 - 8 * b},180 ${105 - 8 * b},70 160,${60 - 10 * b} Z`, fill: br ? '#2a2620' : '#e8b923', stroke: '#8a6a00', 'stroke-width': 2 }, vg);
        sch.t(vg, 160, 118, '106', '').setAttribute('style', 'fill:#3a2a00;font:700 18px Consolas');
        sch.t(vg, 160, 140, '16V', '').setAttribute('style', 'fill:#3a2a00;font:13px Consolas');
        sch.t(vg, 128, 100, '+', '').setAttribute('style', 'fill:#3a2a00;font:700 20px sans-serif');
        if (br) for (let i = 0; i < 3; i++) E('path', { d: `M${140 + i * 14},70 q-8,-20 4,-40`, stroke: '#ff7a1a', 'stroke-width': 4, fill: 'none', opacity: 0.8 }, vg);
      }
      const pol = P().pol;
      sch.t(vg, 300, 22, P().name, '').setAttribute('style', 'font:700 12px "Segoe UI";fill:#333;text-anchor:end');
      if (pol) { sch.t(vg, k === 'elco' ? 140 : 145, 258, self.rev ? '− (kaynak)' : '+ (kaynak)', '').setAttribute('style', `font:11px "Segoe UI";fill:${self.rev ? '#c62828' : '#1a8a4a'};text-anchor:middle`); }
      if (br) sch.t(vg, 160, 30, br.toUpperCase(), '').setAttribute('style', 'font:700 16px "Segoe UI";fill:#c62828;text-anchor:middle');
      else if (self.T > 60) sch.t(vg, 160, 30, self.T > 90 ? 'ŞİŞİYOR! ÇOK SICAK' : 'ISINIYOR', '').setAttribute('style', 'font:700 14px "Segoe UI";fill:#e07a10;text-anchor:middle');
    }
    function boom(kind) {
      fx.innerHTML = '';
      vis.classList.remove('boom'); void vis.getBBox(); vis.classList.add('boom');
      if (kind !== 'delindi') for (let i = 0; i < 14; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, d = 80 + Math.random() * 90, c = E('rect', { x: 158, y: 60, width: 6, height: 4, fill: i % 3 ? '#e8e2d0' : '#888' }, fx);
        c.innerHTML = `<animate attributeName="x" from="158" to="${158 + d * Math.cos(a)}" dur="0.9s" fill="freeze"/><animate attributeName="y" from="60" to="${60 + d * Math.sin(a) + 60}" dur="0.9s" fill="freeze"/><animate attributeName="opacity" from="1" to="0" dur="1.6s" fill="freeze"/>`;
      }
      for (let i = 0; i < 6; i++) {
        const c = E('circle', { cx: 150 + i * 5, cy: 60, r: 6, fill: '#777', opacity: 0.7 }, fx);
        c.innerHTML = `<animate attributeName="cy" from="60" to="-20" dur="${1.6 + i * 0.3}s" repeatCount="4"/><animate attributeName="r" from="6" to="26" dur="${1.6 + i * 0.3}s" repeatCount="4"/><animate attributeName="opacity" from=".7" to="0" dur="${1.6 + i * 0.3}s" repeatCount="4" fill="freeze"/>`;
      }
    }
    function fail(kind, msg) { S.d3broken[self.part] = kind; save(); boom(kind); Lab.toast(msg, 6500); if (kind === 'patladı') S.d3boom = true; if (kind === 'delindi') S.d3bd = true; save(); drawPart(); }
    // şema
    const g = $('#d3sch');
    sch.src(g, 50, 140); const tVs = sch.t(g, 50, 185, '', 'val');
    sch.w(g, [[50, 120], [50, 50], [90, 50]]); sch.rH(g, 90, 170, 50); const tR = sch.t(g, 130, 36, '');
    sch.w(g, [[170, 50], [250, 50], [250, 80]]); sch.w(g, [[50, 160], [50, 230], [250, 230]]); sch.gnd(g, 150, 230);
    E('rect', { x: 205, y: 80, width: 190, height: 130, rx: 6, fill: 'none', stroke: '#e07a10', 'stroke-dasharray': '4 3' }, g);
    sch.t(g, 300, 225, 'gerçek kapasitör modeli', 'lbl').style.cssText = 'font-size:11px;fill:#e07a10';
    sch.w(g, [[250, 80], [250, 92]]); sch.rV(g, 250, 92, 130); sch.t(g, 262, 116, 'ESR', 'lbl', 'start').style.fontSize = '11px';
    sch.w(g, [[250, 130], [250, 140]]); sch.dot(g, 250, 140); sch.w(g, [[250, 140], [340, 140]]);
    const capG = E('g', {}, g);
    sch.w(g, [[250, 200], [250, 230]]); sch.dot(g, 250, 200); sch.w(g, [[250, 200], [340, 200]]);
    sch.rV(g, 340, 140, 200); sch.t(g, 352, 175, 'R<tspan font-size="9" dy="3">sız</tspan>', 'lbl', 'start').style.fontSize = '11px';
    const tV = sch.t(g, 300, 110, '', 'val', 'start'), tI = sch.t(g, 130, 75, '', 'val');
    const fl = E('path', { d: 'M50,120 V50 H250 V140', class: 'flow' }, g); let off = 0;

    let lastPart = null;
    self.step = (dtR) => {
      const p = P(), br = S.d3broken[self.part];
      if (lastPart !== self.part + self.rev + (br || '')) { lastPart = self.part + self.rev + (br || ''); capG.innerHTML = ''; sch.capV(capG, 250, 140, 200, p.pol); }
      const dt = Math.min(dtR, 0.05);
      const Vs = self.on ? kV.value * (self.rev ? -1 : 1) : 0, R = kR.value, C = Creal(), ILIM = 1;
      // sızıntı iletkenliği
      let G = p.Gf * (p.pol && self.v > 0 ? 1 + 4 * Math.exp(-self.tOn / 20) : 1);
      if (p.pol && self.v < -1) { self.dmg += (dt * (-self.v - 1)) / 10; }
      if (p.pol && self.v < 0) G = Math.max(G, 2e-5 * Math.exp(self.dmg));
      if (Math.abs(self.v) > 1.15 * p.Vr && !br) { self.hold += dt; if (self.hold > 0.4) { if (p.pol) { self.dmg = 20; } else return fail('delindi', '⚡ ' + p.name + ' gerilim değeri aşıldı (' + num(Math.abs(self.v), 1) + ' V > ' + p.Vr + ' V): dielektrik delindi, kapasitör kısa devre oldu.'); } } else self.hold = 0;
      if (p.pol && self.dmg >= 20) G = Math.max(G, 2);
      if (br === 'delindi' || br === 'yandı') G = 50; if (br === 'patladı') G = 1e-6;
      self.tOn += dt;
      let i;
      if (!self.on) { self.v *= Math.exp(-(dt * G) / C); i = 0; }
      else {
        const Gs = 1 / R, vinf = (Vs * Gs) / (Gs + G), tau = C / (Gs + G);
        let vn = vinf + (self.v - vinf) * Math.exp(-dt / tau);
        i = (Vs - vn) / R;
        if (Math.abs(i) > ILIM) { i = Math.sign(i) * ILIM; vn = clamp(self.v + ((i - G * self.v) * dt) / C, -Math.abs(Vs), Math.abs(Vs)); }
        self.v = vn;
      }
      self.i = i;
      const Pc = G * self.v * self.v + (i * i) * p.esr;
      self.T += (dt * (Pc - (self.T - 25) / p.Rth)) / p.Cth;
      if (!br && p.pol && self.T >= p.Tx) fail(self.part === 'elco' ? 'patladı' : 'yandı', self.part === 'elco' ? '💥 Elektrolitik kapasitör PATLADI! Ters gerilim oksit tabakasını çözdü, sızıntı akımı ısıttı, elektrolit kaynayıp emniyet çentiğini yırttı.' : '🔥 Tantal kapasitör kısa devre olup YANDI! Tantal ters gerilim ve aşırı gerilime hiç dayanmaz.');
      if (br && self.T > 25) self.T += 0; // soğuma yukarıda
    };
    self.update = () => {
      const p = P();
      psL(num(self.on ? kV.value * (self.rev ? -1 : 1) : 0, 1)); psI(num(Math.abs(self.i), 3));
      const a = iAuto(self.i); m1L(a[0], a[1]); m2L(num(self.v, 2)); irL(num(self.T, 1)); lcL(self.lcrTxt);
      tVs.textContent = (self.on ? num(kV.value * (self.rev ? -1 : 1), 1) : '0') + ' V'; tR.textContent = 'R = ' + Lab.ohm(kR.value);
      tV.textContent = 'v_C = ' + num(self.v, 2) + ' V'; tI.textContent = 'i = ' + a.join(' ');
      off -= Math.sign(self.i) * (Math.abs(self.i) < 1e-7 ? 0 : clamp(20 + 25 * Math.log10(Math.abs(self.i) / 1e-6), 6, 140)) / 60; fl.style.strokeDashoffset = off; fl.style.opacity = Math.abs(self.i) < 1e-7 ? 0 : 0.9;
      if ((self._f = (self._f || 0) + 1) % 6 === 0) drawPart();
      void p;
    };
    const tbody = $('#d3tab tbody');
    function table() {
      tbody.innerHTML = S.d3rows.map((r, i) => `<tr><td>${i + 1}</td><td class="l">${r.n}</td><td>${r.rev ? '<b style="color:#c62828">ters</b>' : 'normal'}</td><td>${num(r.Vs, 1)} V</td><td>${Lab.ohm(r.R)}</td><td>${num(r.v, 2)}</td><td>${iAuto(r.i).join(' ')}</td><td>${num(r.T, 1)}</td><td>${r.lcr}</td><td class="l">${r.st}</td></tr>`).join('');
    }
    self.rec = () => {
      const p = P();
      S.d3rows.push({ k: self.part, n: p.short, rev: self.rev, Vs: self.on ? kV.value : 0, R: kR.value, v: self.v, i: self.i, T: self.T, lcr: S.d3lcr[self.part] ? self.lcrTxt : '—', st: S.d3broken[self.part] || (self.on ? 'besleniyor' : 'kaynak kapalı') });
      save(); table(); Lab.toast(`Kaydedildi: ${p.short}, v_C = ${num(self.v, 2)} V, i = ${iAuto(self.i).join(' ')}`);
    };
    $('#d3rec').onclick = self.rec;
    $('#d3del').onclick = () => { S.d3rows.pop(); save(); table(); };
    $('#d3csv').onclick = () => Lab.downloadCSV('hafta6_deney3.csv', ['#', 'kapasitor', 'kutup', 'Vs (V)', 'R (ohm)', 'vC (V)', 'i (A)', 'T (C)', 'LCR', 'durum'], S.d3rows.map((r, i) => [i + 1, r.n, r.rev ? 'ters' : 'normal', r.Vs, r.R, +r.v.toFixed(3), +r.i.toPrecision(4), +r.T.toFixed(1), r.lcr, r.st]));
    table(); mark(); drawPart();
    Object.assign(self, { kV, kR, P });
    return self;
  })();

  steps('d3', [
    { t: '<b>Elektrolitik 100 µF / 25 V</b>\'ı seçin ve boşken <b>LCR metre</b> ile ölçün. Okunan değer ±%20 toleransın içinde mi?', test: () => !!S.d3lcr.elco },
    { t: 'Elektrolitiği <b>normal kutupla, 12 V, R = 1 kΩ</b> üzerinden besleyin. Dolduktan sonra sızıntı akımını okuyup kaydedin.', test: () => S.d3rows.some((r) => r.k === 'elco' && !r.rev && r.Vs === 12 && r.R === 1e3 && r.v > 11.5) },
    { t: '<b>Film</b> kapasitörü <b>ters kutupla 12 V</b>\'a bağlayıp kaydedin: kutupsuz kapasitörde hiçbir şey olmaz.', test: () => S.d3rows.some((r) => r.k === 'film' && r.rev && r.Vs >= 12 && Math.abs(r.v) > 11) },
    { t: 'Koruyucu gözlüğünüzü takın 😉 Elektrolitiği <b>ters kutupla</b>, <b>R = 10 Ω</b> ve ≥ 12 V ile besleyin. Akımı ve sıcaklığı izleyin.', test: () => !!S.d3boom },
    { t: '<b>Seramik</b> kapasitörde gerilimi değerinin (50 V) üzerine çıkarın: ne oldu?', test: () => !!S.d3bd },
    { t: 'Farklı kapasitör ve koşullarda en az <b>5 ölçüm</b> kaydedin (<kbd>R</kbd>).', test: () => S.d3rows.length >= 5 },
  ]);
  numq('d3', '#d3Q', { id: 'd3q1', q: '100 µF / 25 V elektrolitik için “I ≤ 0,01·C·V<sub>R</sub>” kuralına göre izin verilen en büyük sızıntı akımı kaç µA\'dir?', answer: 25, tol: 1, unit: 'µA', explain: '0,01 × 100 × 25 = 25 µA. Ölçtüğünüz değer (12 V\'ta) bunun altında olmalı.', hint: 'C µF, V volt cinsinden; sonuç µA.' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'Etiketi 100 µF ±%20 olan bir elektrolitik için kabul edilebilecek en küçük kapasite kaç µF\'tır?', answer: 80, tol: 0.5, unit: 'µF', explain: '100 × (1 − 0,20) = 80 µF. LCR ölçümünüz 80–120 µF arasında olmalı.', hint: 'Tolerans her iki yöne geçerlidir.' });
  mcq('d3', '#d3Q', { id: 'd3q3', q: 'Ters kutuplanan elektrolitik neden ısınıp patlar?', opts: ['Kapasitesi aniden artar', 'Ters gerilim dielektrik oksidi çözer; sızıntı akımı katlanarak artar, v·i gücü elektroliti ısıtıp gaza dönüştürür', 'ESR sıfıra düşer', 'Dielektrik sabiti negatif olur'], correct: 1, explain: 'Bu yüzden elektrolitiklerin tepesinde basıncı kontrollü boşaltan bir emniyet çentiği (K/T işareti) vardır.', hint: 'Deneyde akım ve sıcaklık nasıl değişti?' });
  mcq('d3', '#d3Q', { id: 'd3q4', q: 'R = 1 kΩ ile ters kutupladığınızda kapasitör patlamadı ya da çok geç ısındı. Neden?', opts: ['1 kΩ kapasitörü korur, ters kutup zararsızdır', 'Seri direnç akımı sınırlar; kapasitörde harcanan güç küçük kalır. Hasar yine oluşur ama yavaş', 'Ters kutup yalnızca 25 V üzerinde zararlıdır', 'Elektrolitik kutupsuzdur'], correct: 1, explain: 'Gücün üst sınırı yaklaşık V<sup>2</sup>/(4R): 10 Ω ile 1 kΩ arasında 100 kat fark var.', hint: 'Kapasitöre aktarılabilecek en büyük güç hangi dirence bağlı?' });
  mcq('d3', '#d3Q', { id: 'd3q5', q: 'Bir entegrenin besleme bacağının dibine konacak dekuplaj kapasitörü için en uygun seçim hangisidir?', opts: ['1000 µF elektrolitik', '100 nF seramik (kutupsuz, düşük ESR, yüksek frekansta iyi)', '1 µF film, 1 m kabloyla', 'Kapasitör gerekmez'], correct: 1, explain: 'Seramik kapasitörün iç endüktansı ve ESR\'si küçüktür; ani akım ihtiyacını entegrenin dibinden karşılar.', hint: 'Ön Bilgi sayfasındaki tür tablosuna bakın.' });
  mcq('d3', '#d3Q', { id: 'd3q6', q: 'Seramik kapasitörde gerilim değeri aşılınca ne oldu?', opts: ['Kapasitesi arttı', 'Dielektrik delindi; kapasitör kalıcı olarak kısa devre oldu ve kaynak akım sınırına girdi', 'Kendi kendini onardı', 'Hiçbir şey'], correct: 1, explain: 'Gerilim değeri, dielektriğin dayanabileceği elektrik alanıyla (V/d) belirlenir. Seri bağlantılarda küçük kapasitörün daha çok gerilim aldığını unutmayın.', hint: 'LCR metre şimdi ne gösteriyor?' });

  /* ================= DENEY 4 · Güvenli boşaltma ================= */
  const CAPS4 = [{ C: 470e-6, Vr: 400, n: '470 µF / 400 V' }, { C: 1000e-6, Vr: 63, n: '1000 µF / 63 V' }, { C: 100e-6, Vr: 450, n: '100 µF / 450 V' }];
  const RL4 = [0.05, 100, 1e3, 1e4, 4.7e4, 1e5, 1e6];
  const D4 = (() => {
    const self = { v: 0, sw: false, dmm: true, speed: 1, T: 25, burnt: false, run: null, spark: 0 };
    const box = $('#d4inst');
    const cp = inst(box, 'YÜKLÜ KAPASİTÖR · ŞARJ ÜNİTESİ', true); const cpL = lcd(cp.el, 'ŞARJ GERİLİMİ', 'V', 110);
    const kC = new Lab.Knob(cp.c, { label: 'Kapasitör', list: [0, 1, 2], value: 0, dark: true, fmt: (i) => CAPS4[i].n, onChange: () => { self.v = 0; } });
    const kV0 = new Lab.Knob(cp.c, { label: 'V_0', min: 10, max: 450, step: 5, value: 325, dark: true, fmt: (v) => num(v, 0) + ' V' });
    const bCh = document.createElement('button'); bCh.className = 'seg-btn'; bCh.textContent = 'ŞARJ ET'; bCh.style.cssText = 'width:90px;padding:8px 4px'; cp.c.appendChild(bCh);
    bCh.onclick = () => {
      if (self.sw) return Lab.toast('Boşaltma anahtarı kapalıyken şarj edilemez. Önce S\'yi açın.');
      const c = CAPS4[kC.value];
      if (kV0.value > c.Vr) return Lab.toast(`⚠ ${c.n} kapasitörü ${kV0.value} V\'a şarj edilemez: gerilim değeri ${c.Vr} V. Şarj ünitesi reddetti.`, 4000);
      self.v = kV0.value; Lab.toast(`Kapasitör ${num(self.v, 0)} V\'a şarj edildi ve şarj ünitesi ayrıldı. Uçları artık TEHLİKELİ.`, 3500);
      if (kC.value === 0 && near(self.v, 325, 0.5)) { S.d4ch = true; save(); }
    };
    const rb = inst(box, 'BOŞALTMA DİRENCİ', false);
    const kR = new Lab.Knob(rb.c, { label: 'R', list: RL4, value: 1e4, fmt: (v) => (v < 1 ? 'tornavida' : Lab.ohm(v)), onChange: () => { self.burnt = false; self.T = 25; } });
    const kP = new Lab.Knob(rb.c, { label: 'Güç değeri', list: [0.25, 1, 5, 10], value: 0.25, fmt: (v) => num(v, v < 1 ? 2 : 0) + ' W', onChange: () => { self.burnt = false; self.T = 25; } });
    const sw = inst(box, 'ANAHTAR · ZAMAN', false); const tL = lcd(sw.el, 'S kapandıktan sonra', 's', 120);
    const bS = document.createElement('button'); bS.className = 'seg-btn'; bS.style.cssText = 'width:100px;padding:8px 4px'; sw.c.appendChild(bS);
    const bSp = document.createElement('button'); bSp.className = 'seg-btn'; bSp.style.cssText = 'width:70px;padding:8px 4px'; sw.c.appendChild(bSp);
    const sTxt = () => { bS.textContent = self.sw ? 'S: KAPALI' : 'S: AÇIK'; bS.classList.toggle('on', self.sw); bSp.textContent = 'hız ×' + self.speed; };
    bS.onclick = () => { self.sw = !self.sw; if (self.sw) startRun(); else endRun(); sTxt(); };
    bSp.onclick = () => { self.speed = self.speed === 1 ? 10 : self.speed === 10 ? 100 : 1; sTxt(); };
    sTxt();
    const dm = inst(box, 'DMM · v<sub>C</sub>', false, '10 MΩ'); const dmL = lcd(dm.el, 'DC V', 'V', 110);
    const bM = document.createElement('label'); bM.style.cssText = 'font-size:12px'; bM.innerHTML = '<input type="checkbox" checked> uçlar bağlı'; dm.c.appendChild(bM);
    bM.firstChild.onchange = (e) => (self.dmm = e.target.checked);
    const ir = inst(box, 'IR TERMOMETRE · R', false); const irL = lcd(ir.el, 'DİRENÇ', '°C', 90);

    // şema
    const g = $('#d4sch');
    sch.w(g, [[150, 50], [150, 90]]); sch.capV(g, 150, 90, 170, true); sch.w(g, [[150, 170], [150, 215], [560, 215]]);
    sch.w(g, [[150, 50], [330, 50]]); sch.dot(g, 150, 50); sch.dot(g, 150, 215);
    const tC = sch.t(g, 110, 134, '', 'lbl', 'end'), tV = sch.t(g, 110, 154, '', 'val', 'end');
    sch.term(g, 334, 50); const swArm = E('line', { x1: 338, y1: 50, x2: 390, y2: 22, stroke: '#222', 'stroke-width': 3 }, g); sch.term(g, 394, 50); sch.t(g, 365, 78, 'S');
    sch.w(g, [[398, 50], [460, 50], [460, 90]]); const rPath = sch.rV(g, 460, 90, 170); sch.w(g, [[460, 170], [460, 215]]); sch.dot(g, 460, 215);
    const tR = sch.t(g, 478, 125, '', 'lbl', 'start'), tT = sch.t(g, 478, 147, '', 'val', 'start');
    sch.w(g, [[150, 50], [150, 30], [600, 30], [600, 105]]); E('circle', { cx: 600, cy: 130, r: 25, fill: '#fff', class: 'w' }, g); sch.t(g, 600, 135, 'V'); sch.w(g, [[600, 155], [600, 215], [560, 215]]);
    sch.t(g, 640, 135, 'DMM 10 MΩ', 'lbl', 'start');
    const spark = E('g', { opacity: 0 }, g);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; E('line', { x1: 365, y1: 45, x2: 365 + 34 * Math.cos(a), y2: 45 + 34 * Math.sin(a), stroke: i % 2 ? '#ffd400' : '#ff7a00', 'stroke-width': 3 }, spark); }
    E('circle', { cx: 365, cy: 45, r: 12, fill: '#fff7b0' }, spark);
    const fl = E('path', { d: 'M150,90 V50 H460 V215 H150', class: 'flow' }, g); let off = 0;

    const plot = new Lab.Plot($('#d4plot'), { xlabel: 't  (s)', ylabel: 'v_C  (V)' });
    const cap = () => CAPS4[kC.value];
    function startRun() {
      const R = kR.value;
      self.run = { t: 0, V0: self.v, R, P: kP.value, C: cap().C, Tmax: self.T, t50: self.v <= 50 ? 0 : null, pts: [[0, self.v]], last: 0, res: '' };
      if (R < 1 && self.v > 5) {
        const E0 = 0.5 * cap().C * self.v * self.v;
        Lab.toast(`💥 KIVILCIM! Tornavidayla kısa devre: tepe akım ≈ ${num(self.v / 0.05, 0)} A, ${num(E0, 1)} J mikrosaniyeler içinde uçta açığa çıktı. Tornavidanın ucu eridi, kapasitör uçları hasar gördü.`, 6500);
        self.spark = 1.2; S.d4spark = true; save(); self.run.res = 'KIVILCIM (hatalı yöntem)';
      }
    }
    function endRun(auto) {
      const r = self.run; if (!r) return; self.run = null;
      if (r.t < 0.05 && r.R >= 1) return;
      const res = r.res || (self.burnt ? 'DİRENÇ YANDI — kapasitör hâlâ yüklü!' : self.v < 50 ? 'güvenli (< 50 V)' : 'yarım kaldı (> 50 V)');
      S.d4rows.push({ C: r.C, V0: r.V0, R: r.R, P: r.P, t: r.t, v: self.v, t50: r.t50, Tmax: r.Tmax, res, burnt: self.burnt });
      save(); table(); if (auto) Lab.toast('Boşaltma bitti, tabloya eklendi: ' + res);
    }
    self.rec = () => { if (self.run) { endRun(); self.sw = false; sTxt(); } else Lab.toast('Kayıt, bir boşaltma sırasında ya da sonunda alınır (S\'yi kapatın).'); };
    self.step = (dtR) => {
      const dt = Math.min(dtR, 0.05) * self.speed, C = cap().C;
      const Rleak = 7200 / C, Rd = 1e7;
      const GR = self.sw && !self.burnt ? 1 / kR.value : 0;
      const G = GR + 1 / Rleak + (self.dmm ? 1 / Rd : 0);
      const v0 = self.v, v1 = v0 * Math.exp((-dt * G) / C);
      const Ein = 0.5 * C * (v0 * v0 - v1 * v1) * (GR / G);
      self.v = v1;
      const R = kR.value, Pr = kP.value;
      if (R >= 1) {
        const Cth = 0.2 * Pr, Rth = 100 / Pr;
        self.T += Ein / Cth - (dt * (self.T - 25)) / (Rth * Cth);
        if (self.T < 25) self.T = 25;
        if (!self.burnt && self.T > 350) { self.burnt = true; S.d4burnSeen = true; save(); Lab.toast(`🔥 ${Lab.ohm(R)} / ${num(Pr, 2)} W direnç YANDI ve açık devre oldu! Kapasitörde hâlâ ${num(self.v, 0)} V var — dokunmayın.`, 6500); }
      }
      if (!self.sw && self.dmm && self.v > 50) { S.d4open = (S.d4open || 0) + dt; }
      const r = self.run;
      if (r) {
        r.t += dt; r.Tmax = Math.max(r.Tmax, self.T);
        if (r.t50 == null && self.v < 50) r.t50 = r.t;
        if (r.t - r.last >= r.t / 300 || r.t - r.last > 0.5) { r.pts.push([r.t, self.v]); r.last = r.t; if (r.pts.length > 1500) r.pts = r.pts.filter((_, i) => i % 2 === 0); }
        if (self.v < 1 && r.t > 0.01) { endRun(true); self.sw = false; sTxt(); }
      }
      if (self.spark > 0) self.spark -= dtR;
      self.iR = GR * self.v;
    };
    let drawCnt = 0;
    self.update = () => {
      const c = cap(), R = kR.value;
      cpL(num(kV0.value, 0)); tL(num(self.run ? self.run.t : 0, 2));
      dmL(self.dmm ? num(self.v, self.v < 100 ? 2 : 1) : '----'); irL(num(self.T, 0));
      tC.textContent = c.n; tV.textContent = 'v_C = ' + num(self.v, 1) + ' V'; tV.style.fill = self.v > 50 ? '#c62828' : '#1a8a4a';
      tR.textContent = (R < 1 ? 'tornavida ≈ 0,05 Ω' : 'R = ' + Lab.ohm(R) + ' / ' + num(kP.value, kP.value < 1 ? 2 : 0) + ' W') + (self.burnt ? ' — YANDI' : '');
      tT.textContent = 'T_R = ' + num(self.T, 0) + ' °C'; tT.style.fill = self.T > 150 ? '#c62828' : '#333';
      rPath.style.stroke = self.burnt ? '#5a2a10' : self.T > 120 ? '#e65100' : '#222';
      swArm.setAttribute('y2', self.sw ? 50 : 22);
      spark.setAttribute('opacity', self.spark > 0 ? (Math.random() * 0.6 + 0.4) * Math.min(1, self.spark) : 0);
      const i = self.iR || 0; off -= (Math.abs(i) < 1e-6 ? 0 : clamp(20 + 25 * Math.log10(Math.abs(i) / 1e-5), 6, 140)) / 60; fl.style.strokeDashoffset = off; fl.style.opacity = Math.abs(i) < 1e-6 ? 0 : 0.9;
      if (++drawCnt % 4 === 0) drawPlot();
    };
    function drawPlot() {
      const r = self.run || self.lastRun;
      if (self.run) self.lastRun = self.run;
      if (!r) { plot.draw([], [0, 10], [0, 350]); return; }
      const tau = r.R * r.C, tm = Math.max(r.t, Math.min(5 * tau, 600), 1);
      const ser = [{ pts: r.pts.concat([[r.t, self.run ? self.v : r.pts[r.pts.length - 1][1]]]), line: true, color: '#0b5cad', width: 2.4 }];
      if ($('#d4theo').checked && r.R >= 1) { const th = []; for (let k = 0; k <= 200; k++) { const t = (tm * k) / 200; th.push([t, r.V0 * Math.exp(-t / tau)]); } ser.push({ pts: th, line: true, color: '#e07a10', dash: [6, 4] }); }
      ser.push({ pts: [[0, 50], [tm, 50]], line: true, color: '#c62828', width: 1, dash: [3, 4] });
      plot.draw(ser, [0, tm], [0, Math.max(60, r.V0 * 1.05)]);
    }
    const tbody = $('#d4tab tbody');
    function table() {
      tbody.innerHTML = S.d4rows.map((r, i) => `<tr><td>${i + 1}</td><td>${eng(r.C, 'F')}</td><td>${num(r.V0, 0)}</td><td>${r.R < 1 ? 'tornavida' : Lab.ohm(r.R)}</td><td>${r.R < 1 ? '—' : num(r.P, r.P < 1 ? 2 : 0) + ' W'}</td><td>${num(r.t, 2)}</td><td>${num(r.v, 1)}</td><td>${r.t50 == null ? '—' : num(r.t50, 2)}</td><td>${num(r.Tmax, 0)}</td><td class="l" style="color:${/güvenli/.test(r.res) ? '#1a8a4a' : '#c62828'}">${r.res}</td></tr>`).join('');
    }
    $('#d4theo').onchange = drawPlot;
    $('#d4rec').onclick = self.rec;
    $('#d4del').onclick = () => { S.d4rows.pop(); save(); table(); };
    $('#d4csv').onclick = () => Lab.downloadCSV('hafta6_deney4.csv', ['#', 'C (F)', 'V0 (V)', 'R (ohm)', 'P (W)', 't (s)', 'vson (V)', 't50 (s)', 'TRmaks (C)', 'sonuc'], S.d4rows.map((r, i) => [i + 1, r.C, r.V0, r.R, r.P, +r.t.toFixed(3), +r.v.toFixed(2), r.t50 == null ? '' : +r.t50.toFixed(3), +r.Tmax.toFixed(0), r.res]));
    table(); drawPlot();
    Object.assign(self, { kC, kV0, kR, kP, plotCanvas: $('#d4plot') });
    return self;
  })();

  steps('d4', [
    { t: '<b>470 µF / 400 V</b> kapasitörü seçip <b>V<sub>0</sub> = 325 V</b>\'a şarj edin (230 V şebekenin tepe değeri).', test: () => !!S.d4ch },
    { t: 'S açıkken, yalnızca voltmetre bağlıyken en az <b>60 s</b> (hızı ×10 yapabilirsiniz) bekleyin. Gerilim ne kadar düştü? Fişi çekilmiş cihazdaki tehlikeyi düşünün.', test: () => (S.d4open || 0) >= 60 },
    { t: '<b>R = 10 kΩ, 0,25 W</b> ile boşaltmayı deneyin. Ne oldu? (Kapasitörü gerekirse yeniden şarj edin.)', test: () => !!S.d4burnSeen },
    { t: 'Uygun güç değerli bir dirençle (ör. <b>10 kΩ / 5 W</b>) 325 V\'tan <b>50 V altına</b> güvenle boşaltın; t<sub>50V</sub> süresini ölçün.', test: () => S.d4rows.some((r) => r.R >= 1 && !r.burnt && r.V0 >= 300 && r.v < 50 && r.C === 470e-6) },
    { t: 'Neden yapılmaması gerektiğini görmek için bir kez <b>tornavida</b> ile boşaltın (yalnızca sanal ortamda!).', test: () => !!S.d4spark },
    { t: 'En az iki farklı R ile güvenli boşaltma kaydedip süreleri karşılaştırın.', test: () => new Set(S.d4rows.filter((r) => /güvenli/.test(r.res)).map((r) => r.R)).size >= 2 },
  ]);
  numq('d4', '#d4Q', { id: 'd4q1', q: '470 µF ve 10 kΩ için zaman sabiti τ kaç saniyedir?', answer: 4.7, tol: 1, unit: 's', explain: 'τ = RC = 10<sup>4</sup> × 470×10<sup>−6</sup> = 4,7 s.', hint: 'τ = RC' });
  numq('d4', '#d4Q', { id: 'd4q2', q: '325 V\'tan 50 V\'a inmek için gereken süre kaç saniyedir (10 kΩ, 470 µF)? Ölçtüğünüz t<sub>50V</sub> ile karşılaştırın.', answer: 4.7 * Math.log(325 / 50), tol: 4, unit: 's', explain: 't = RC ln(V<sub>0</sub>/V<sub>g</sub>) = 4,7 × ln(6,5) ≈ 8,8 s. Voltmetrenin 10 MΩ\'u etkiyi çok az hızlandırır.', hint: 'V<sub>0</sub>e<sup>−t/τ</sup> = 50 V eşitliğini t için çözün.' });
  numq('d4', '#d4Q', { id: 'd4q3', q: 'Anahtar kapandığı anda 10 kΩ direncin harcadığı tepe güç kaç W\'tır?', answer: 325 * 325 / 1e4, tol: 3, unit: 'W', explain: 'P = V<sub>0</sub><sup>2</sup>/R = 325²/10<sup>4</sup> ≈ 10,6 W — 0,25 W\'lık direncin 40 katı!', hint: 'p = v²/R, v = V<sub>0</sub> iken.' });
  numq('d4', '#d4Q', { id: 'd4q4', q: 'Boşaltma boyunca dirence aktarılan toplam enerji kaç J\'dür?', answer: 0.5 * 470e-6 * 325 * 325, tol: 2, unit: 'J', explain: 'Tüm ½CV<sub>0</sub><sup>2</sup> ≈ 24,8 J ısıya dönüşür. Küçük bir 0,25 W direncin ısıl kütlesi bunu kaldıramaz; tel sargılı 5–10 W direnç kaldırır.', hint: 'w = ½CV²' });
  mcq('d4', '#d4Q', { id: 'd4q5', q: 'S açıkken yalnızca voltmetre bağlıyken gerilim neden çok yavaş düştü?', opts: ['Voltmetre bozuk', 'Akım yolu yalnızca 10 MΩ voltmetre ve kapasitörün sızıntısıdır: τ binlerce saniye. Fişi çekilmiş cihazda kapasitör saatlerce yüklü kalabilir', 'Kapasitör kendini yeniden şarj ediyor', 'Gerilim hiç düşmez'], correct: 1, explain: 'τ = 10 MΩ × 470 µF = 4700 s. Bu yüzden güç kaynaklarında kalıcı “bleeder” (boşaltma) dirençleri bulunur.', hint: 'τ = R<sub>DMM</sub>·C' });
  mcq('d4', '#d4Q', { id: 'd4q6', q: 'Tornavidayla kısa devre etmek neden yanlıştır?', opts: ['Kapasitör boşalmaz', 'Direnç ≈ 0,05 Ω: binlerce amperlik darbe, kıvılcım, metal sıçraması; kapasitörün iç bağlantıları ve uçları zarar görür, göz yaralanması riski', 'Tornavida mıknatıslanır', 'Hiçbir sakıncası yoktur'], correct: 1, explain: 'Doğrusu: uygun değer ve güçte bir dirençle, yalıtımlı probla boşaltıp multimetreyle doğrulamak.', hint: 'Tepe akım = V<sub>0</sub>/R' });

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
      <h2 style="margin:0">Devre Kuramı I · Sanal Laboratuvar · Hafta 6 Raporu</h2>
      <p><b>Konu:</b> Kapasitör — i = C dv/dt, gerilimin sürekliliği, enerji, gerçek kapasitör, güvenli boşaltma</p>
      <table class="data" style="width:auto"><tr><th>Ad Soyad</th><td class="l">${S.st.name || ''}</td><th>No</th><td class="l">${S.st.no || ''}</td><th>Grup</th><td class="l">${S.st.group || ''}</td><th>Tarih</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Özet</h3>
      <p>Tamamlanan föy adımı: <b>${sOk}/${sTot}</b> · Doğru yanıt: <b>${ok}/${tot}</b> · Puan: <b>${Math.round((50 * sOk) / sTot + (50 * ok) / tot)}/100</b></p>
      <h3>Yanıtlar</h3>
      <table class="data"><thead><tr><th>Bölüm</th><th>Soru</th><th>Yanıt</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Deney 1 · i = C dv/dt ölçümleri</h3>${tab('d1tab')}
      <h3>Deney 2 · Gerilim profili ölçümleri</h3>${tab('d2tab')}
      <h3>Deney 3 · Gerçek kapasitör</h3>${tab('d3tab')}
      <h3>Deney 4 · Boşaltma kayıtları</h3>${tab('d4tab')}
      <h3>Grafikler</h3>
      <div>${img($('#scope'))} ${img(D4.plotCanvas)}</div>
      <div>${img(D2.plots[0])} ${img(D2.plots[1])}</div>
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

  let last = performance.now();
  function loop() {
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
    D3.step(dt); D4.step(dt); // fiziksel süreçler sayfa dışında da sürer
    if (S.page === 'd1') { D1.update(); evalSteps('d1'); }
    if (S.page === 'd2') evalSteps('d2');
    if (S.page === 'd3') { D3.update(); evalSteps('d3'); }
    if (S.page === 'd4') { D4.update(); evalSteps('d4'); }
    requestAnimationFrame(loop);
  }
  ['d1', 'd2', 'd3', 'd4'].forEach(evalSteps);
  go(S.page); progress(); loop();
})();

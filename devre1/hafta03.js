/* Devre Kuramı I · Hafta 3 — Toplayan ve Fark Yükselteci, CMRR */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd1h03';
  const S = Object.assign({ answers: {}, steps: {}, st: {}, page: 'giris', sat: 'ideal', d1rows: [], d2rows: [], d3rows: [], d4rows: [] }, Lab.store.load(KEY));
  if (S.seed == null) S.seed = Math.random() * 1000;
  Lab.answers = S.answers;
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => Lab.store.save(KEY, S), 300); };
  Lab.onAnswer = () => { save(); progress(); };

  /* ---------- ortak model (µA741) ---------- */
  const A0 = 1e5, SR = 0.5e6, IMAX = 25e-3, RI = 2e6, IB = 80e-9, RG = 50, RDMM = 10e6;
  const vsat = (vcc) => (S.sat === 'real' ? vcc - 1.5 : vcc);
  const model = (vcc, A = A0) => ({ A, vsatP: vsat(vcc), vsatN: -vsat(vcc), vos: 0 });
  const near = (a, b, t) => Math.abs(a - b) <= t;
  const E12 = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
  const E12L = []; [1e2, 1e3, 1e4, 1e5].forEach((d) => E12.forEach((m) => E12L.push(+(m * d).toPrecision(3)))); E12L.push(1e6);
  const RBOX = [...new Set([...E12L.filter((r) => r >= 1e3), 2e4, 4e4, 5e4, 6e4, 8e4, 1.6e5, 2e5])].sort((a, b) => a - b);
  const INF = 1e12;
  const rfmt = (v) => (v >= 1e9 ? '∞ (açık)' : v === 0 ? '0 (kısa)' : Lab.ohm(v));
  const strip = (s) => String(s).replace(/<[^>]+>/g, '');

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
  const iAuto = (i) => (Math.abs(i) < 1e-6 ? [num(i * 1e9, 1), 'nA'] : Math.abs(i) < 1e-3 ? [num(i * 1e6, 2), 'µA'] : [num(i * 1e3, 3), 'mA']);

  /* ---------- şema yardımcıları ---------- */
  const sch = {
    w: (g, pts) => E('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'w' }, g),
    dot: (g, x, y) => E('circle', { cx: x, cy: y, r: 3.5, class: 'node' }, g),
    t: (g, x, y, s, cls = 'lbl', anchor = 'middle') => { const e = E('text', { x, y, class: cls, 'text-anchor': anchor }, g); e.innerHTML = s; return e; },
    rH(g, x1, x2, y) { const n = 6, L = 8, step = (x2 - x1 - 2 * L) / n; let d = `M${x1},${y} h${L}`; for (let i = 0; i < n; i++) d += ` l${step / 2},${i % 2 ? 7 : -7} l${step / 2},${i % 2 ? -7 : 7}`; d += ` L${x2},${y}`; E('path', { d, class: 'w' }, g); },
    rV(g, x, y1, y2) { const n = 6, L = 8, step = (y2 - y1 - 2 * L) / n; let d = `M${x},${y1} v${L}`; for (let i = 0; i < n; i++) d += ` l${i % 2 ? 7 : -7},${step / 2} l${i % 2 ? -7 : 7},${step / 2}`; d += ` L${x},${y2}`; E('path', { d, class: 'w' }, g); },
    gnd(g, x, y) { E('path', { d: `M${x},${y} v8 M${x - 11},${y + 8} h22 M${x - 7},${y + 13} h14 M${x - 3},${y + 18} h6`, class: 'w' }, g); },
    src(g, x, y, r = 20, kind = 'dc') {
      E('circle', { cx: x, cy: y, r, class: 'w', fill: '#fff' }, g);
      if (kind === 'ac') E('path', { d: `M${x - 10},${y} q5,-12 10,0 t10,0`, class: 'w' }, g);
      else { sch.t(g, x, y - 4, '+', 'lbl'); sch.t(g, x, y + 13, '−', 'lbl'); }
    },
    term(g, x, y) { E('circle', { cx: x, cy: y, r: 4.5, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g); },
    opamp(g, x, yt, h = 110, w = 120) { E('path', { d: `M${x},${yt} L${x},${yt + h} L${x + w},${yt + h / 2} Z`, class: 'w', fill: '#f4f7ff' }, g); },
    supply(g) { sch.w(g, [[440, 137], [440, 100]]); sch.t(g, 440, 93, '+V<tspan font-size="10" dy="3">CC</tspan>'); sch.w(g, [[440, 192], [440, 230]]); sch.t(g, 440, 247, '−V<tspan font-size="10" dy="3">CC</tspan>'); },
    probe(g, x, y, name, color) { sch.dot(g, x, y); sch.w(g, [[x, y], [x, y - 24]]); sch.term(g, x, y - 28); const t = sch.t(g, x, y - 40, name); t.style.fill = color; t.style.fontWeight = 700; },
  };
  // Eviren yükselteç şeması (op-amp: x=380, yt=110 → v_n y=140, v_p y=190, çıkış 500,165)
  function schInv(g, kind = 'ac') {
    g.innerHTML = '';
    sch.src(g, 60, 215, 20, kind); sch.w(g, [[60, 195], [60, 140], [110, 140]]); sch.rH(g, 110, 190, 140); sch.w(g, [[190, 140], [380, 140]]); sch.dot(g, 300, 140);
    sch.w(g, [[60, 235], [60, 255]]); sch.gnd(g, 60, 255);
    sch.w(g, [[300, 140], [300, 60], [360, 60]]); sch.rH(g, 360, 440, 60); sch.w(g, [[440, 60], [580, 60], [580, 165]]);
    sch.opamp(g, 380, 110); sch.t(g, 392, 146, '−'); sch.t(g, 392, 196, '+');
    sch.w(g, [[500, 165], [660, 165]]); sch.dot(g, 580, 165); sch.rV(g, 660, 165, 255); sch.gnd(g, 660, 255);
    sch.w(g, [[380, 190], [345, 190], [345, 250]]); sch.gnd(g, 345, 250); sch.supply(g);
    sch.probe(g, 85, 140, 'CH1', '#b8960a'); sch.probe(g, 625, 165, 'CH2', '#1592b8');
    return {
      Rs: sch.t(g, 150, 125, ''), Rf: sch.t(g, 400, 45, ''), RL: sch.t(g, 672, 215, '', 'lbl', 'start'),
      vg: sch.t(g, 88, 225, '', 'val', 'start'), vn: sch.t(g, 296, 160, '', 'val', 'end'), vo: sch.t(g, 505, 192, '', 'val', 'start'),
      is: sch.t(g, 150, 162, '', 'val'), mode: sch.t(g, 600, 22, '', 'val'),
    };
  }
  // Evirmeyen yükselteç şeması
  function schNon(g, kind = 'ac') {
    g.innerHTML = '';
    sch.src(g, 230, 240, 20, kind); sch.w(g, [[230, 220], [230, 190], [380, 190]]); sch.w(g, [[230, 260], [230, 268]]); sch.gnd(g, 230, 268);
    sch.w(g, [[380, 140], [330, 140]]); sch.dot(g, 330, 140); sch.w(g, [[330, 140], [250, 140]]); sch.rH(g, 170, 250, 140); sch.w(g, [[170, 140], [120, 140], [120, 150]]); sch.gnd(g, 120, 150);
    sch.w(g, [[330, 140], [330, 60], [360, 60]]); sch.rH(g, 360, 440, 60); sch.w(g, [[440, 60], [580, 60], [580, 165]]);
    sch.opamp(g, 380, 110); sch.t(g, 392, 146, '−'); sch.t(g, 392, 196, '+');
    sch.w(g, [[500, 165], [660, 165]]); sch.dot(g, 580, 165); sch.rV(g, 660, 165, 255); sch.gnd(g, 660, 255); sch.supply(g);
    sch.probe(g, 300, 190, 'CH1', '#b8960a'); sch.probe(g, 625, 165, 'CH2', '#1592b8');
    return {
      Rs: sch.t(g, 210, 125, ''), Rf: sch.t(g, 400, 45, ''), RL: sch.t(g, 672, 215, '', 'lbl', 'start'),
      vg: sch.t(g, 258, 245, '', 'val', 'start'), vn: sch.t(g, 336, 100, '', 'val', 'start'), vo: sch.t(g, 505, 192, '', 'val', 'start'),
      is: sch.t(g, 300, 215, '', 'val'), mode: sch.t(g, 600, 22, '', 'val'),
    };
  }

  /* ---------- osiloskop paneli ---------- */
  const VDIV = [1e-3, 2e-3, 5e-3, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10];
  const TDIV = [1e-6, 2e-6, 5e-6, 1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2, 2e-2, 5e-2];
  const pick = (L, x) => L.find((v) => v >= x) || L[L.length - 1];
  function mkScope(host, id, o) {
    const w = document.createElement('div'); w.className = 'inst dark scopewrap'; w.style.cssText = 'flex:1;min-width:420px';
    w.innerHTML = `<div class="brand"><span>DSO-2C · Dijital Osiloskop</span><span><span class="led on g"></span> RUN</span></div>
      <div class="row" style="align-items:flex-start;flex-wrap:nowrap"><canvas id="${id}" width="640" height="400" style="width:100%;max-width:640px"></canvas>
      <div style="min-width:160px"><div class="ctrls"></div><div class="row" style="margin:6px 0;gap:4px"><button class="seg-btn on" data-k="c1">CH1</button><button class="seg-btn on" data-k="c2">CH2</button><button class="seg-btn" data-k="cur">İMLEÇ</button><button class="seg-btn" data-k="auto">AUTO</button></div><div class="meas"></div></div></div>`;
    host.appendChild(w);
    const cv = w.querySelector('canvas'), sc = new Lab.Scope(cv), ck = w.querySelector('.ctrls'), me = w.querySelector('.meas');
    const self = { sc, dirty: true, el: cv };
    const set = () => (self.dirty = true);
    self.k1 = new Lab.Knob(ck, { label: 'CH1 V/d', list: VDIV, value: o.v1, dark: true, size: 44, fmt: (v) => eng(v, 'V'), onChange: (v) => { sc.ch[0].vdiv = v; set(); } });
    self.k2 = new Lab.Knob(ck, { label: 'CH2 V/d', list: VDIV, value: o.v2, dark: true, size: 44, fmt: (v) => eng(v, 'V'), onChange: (v) => { sc.ch[1].vdiv = v; set(); } });
    self.kt = new Lab.Knob(ck, { label: 'ZAMAN/d', list: TDIV, value: o.t, dark: true, size: 44, fmt: (v) => eng(v, 's'), onChange: (v) => { sc.tdiv = v; set(); } });
    sc.ch[0].vdiv = o.v1; sc.ch[1].vdiv = o.v2; sc.tdiv = o.t;
    $$('button', w).forEach((b) => (b.onclick = () => {
      const k = b.dataset.k;
      if (k === 'auto') {
        const m = sc.measure(); if (!m) return;
        self.kt.set(pick(TDIV, 2.5 / o.freq() / 10));
        const sz = (c) => Math.max(Math.abs(c.max), Math.abs(c.min), c.vpp / 2) / 3.5;
        self.k1.set(pick(VDIV, sz(m.ch[0]))); self.k2.set(pick(VDIV, sz(m.ch[1]))); return;
      }
      if (k === 'c1') sc.ch[0].on = !sc.ch[0].on;
      if (k === 'c2') sc.ch[1].on = !sc.ch[1].on;
      if (k === 'cur') sc.cur.on = !sc.cur.on;
      b.classList.toggle('on'); set();
    }));
    cv.addEventListener('pointermove', () => sc.cur.drag && self.show());
    self.show = () => {
      const m = sc.measure(); if (!m) return; self.meas = m;
      const c = (x, k, col) => `<span style="color:${col}">CH${k}</span> Vpp ${eng(x.vpp, 'V')}<br>&nbsp; maks ${eng(x.max, 'V')} · min ${eng(x.min, 'V')}<br>&nbsp; f ${isFinite(x.f) ? eng(x.f, 'Hz') : '—'}<br>`;
      let h = c(m.ch[0], 1, '#f2d21b') + c(m.ch[1], 2, '#27c4f0');
      if (m.cur) h += `<span style="color:#ff7cf0">İMLEÇ</span> Δt ${eng(m.cur.dt, 's')}<br>&nbsp; CH1 a/b ${eng(m.cur.v1a, 'V')} / ${eng(m.cur.v1b, 'V')}<br>&nbsp; CH2 a/b ${eng(m.cur.v2a, 'V')} / ${eng(m.cur.v2b, 'V')}`;
      me.innerHTML = h;
    };
    self.draw = (data) => { sc.draw(data); self.show(); };
    return self;
  }
  function wave(kind, x) {
    const ph = x - Math.floor(x);
    if (kind === 'sq') return ph < 0.5 ? 1 : -1;
    if (kind === 'tri') return ph < 0.25 ? 4 * ph : ph < 0.75 ? 2 - 4 * ph : 4 * ph - 4;
    return Math.sin(2 * Math.PI * x);
  }
  // Zaman alanı benzetimi: vin(t) → CH1, tgt(t) statik (doyumlu) çıkış, SR sınırı uygulanır
  function runSim(scope, f, vin, tgt, ch1 = vin) {
    const n = 1000, T = scope.tdiv * 10, dt = T / (n - 1);
    const pre = Math.min(20000, Math.ceil(Math.max(2 / f, 1e-4) / dt));
    let vo = tgt(-pre * dt);
    const st = (t) => { vo += clamp(tgt(t) - vo, -SR * dt, SR * dt); };
    for (let i = -pre; i < 0; i++) st(i * dt);
    const y1 = new Float64Array(n), y2 = new Float64Array(n), y3 = new Float64Array(n);
    for (let i = 0; i < n; i++) { const t = i * dt; st(t); y1[i] = ch1(t); y2[i] = vo; y3[i] = vin(t); }
    return { n, y: [y1, y2], vin: y3 };
  }
  function waveBtns(fg, self, set) {
    const wb = document.createElement('div'); wb.className = 'row'; wb.style.cssText = 'gap:4px;margin-bottom:4px';
    wb.innerHTML = [['sin', '∿ Sinüs'], ['tri', '△ Üçgen'], ['sq', '⊓ Kare']].map(([k, t]) => `<button class="seg-btn${k === self.wave ? ' on' : ''}" data-w="${k}">${t}</button>`).join('');
    fg.el.insertBefore(wb, fg.c);
    $$('button', wb).forEach((b) => (b.onclick = () => { self.wave = b.dataset.w; $$('button', wb).forEach((x) => x.classList.toggle('on', x === b)); set(); }));
  }
  // ölçüm tablosu
  function recorder(k, head, cells, csv, onch) {
    const rows = S[k + 'rows'] || (S[k + 'rows'] = []);
    const tb = $('#' + k + 'tab tbody');
    $('#' + k + 'tab thead').innerHTML = '<tr>' + ['#', ...head].map((h) => `<th>${h}</th>`).join('') + '</tr>';
    const draw = () => { tb.innerHTML = rows.map((r, i) => `<tr><td>${i + 1}</td>${cells(r).map((c) => `<td>${c}</td>`).join('')}</tr>`).join(''); tb.parentElement.parentElement.scrollTop = 1e6; onch && onch(); };
    $('#' + k + 'del').onclick = () => { rows.pop(); save(); draw(); };
    $('#' + k + 'csv').onclick = () => Lab.downloadCSV(csv, ['#', ...head.map(strip)], rows.map((r, i) => [i + 1, ...cells(r).map(strip)]));
    draw();
    return { draw, rows, push(r) { rows.push(r); save(); draw(); } };
  }

  /* ================= GEZİNME / İLERLEME ================= */
  const pages = ['giris', 'onbilgi', 'onhaz', 'd1', 'd2', 'd3', 'd4', 'rapor'];
  function go(p) {
    S.page = p; save();
    $$('section.page').forEach((s) => s.classList.toggle('active', s.id === p));
    $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.p === p));
    [D1, D4].forEach((d) => d && (d.sc.dirty = true));
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
      if (!S.steps[id] && ok) { S.steps[id] = true; save(); Lab.toast('✔ Adım tamamlandı: ' + strip(s.t).slice(0, 70)); progress(); }
      lis[i].classList.toggle('done', !!S.steps[id]);
    });
  }
  const qids = { onhaz: [], d1: [], d2: [], d3: [], d4: [] };
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
  $('#satModel').value = S.sat;
  $('#satModel').onchange = (e) => { S.sat = e.target.value; save(); [D1, D4].forEach((d) => (d.sc.dirty = true)); };

  /* ---------- Hafta 3 şemaları ---------- */
  // Toplayan yükselteç (üç giriş, op-amp x=380)
  function schSum(g) {
    g.innerHTML = '';
    [[60, 100, 110, 190], [130, 140, 150, 240], [200, 180, 215, 275]].forEach(([x, y, r1, r2], k) => {
      sch.src(g, x, 250, 20, k === 1 ? 'dc' : 'ac'); sch.w(g, [[x, 270], [x, 272]]); sch.gnd(g, x, 272);
      sch.w(g, [[x, 230], [x, y], [r1, y]]); sch.rH(g, r1, r2, y);
    });
    E('path', { d: 'M193,248 h5 v-6 h5 v12 h5 v-6 h5', class: 'w' }, g);
    sch.w(g, [[190, 100], [300, 100], [300, 140]]); sch.w(g, [[240, 140], [380, 140]]); sch.w(g, [[275, 180], [300, 180], [300, 140]]); sch.dot(g, 300, 140); sch.dot(g, 330, 140);
    sch.w(g, [[330, 140], [330, 50], [360, 50]]); sch.rH(g, 360, 440, 50); sch.w(g, [[440, 50], [580, 50], [580, 165]]);
    sch.opamp(g, 380, 110); sch.t(g, 392, 146, '−'); sch.t(g, 392, 196, '+');
    sch.w(g, [[500, 165], [660, 165]]); sch.dot(g, 580, 165); sch.w(g, [[380, 190], [345, 190], [345, 250]]); sch.gnd(g, 345, 250); sch.supply(g);
    sch.probe(g, 625, 165, 'CH2', '#1592b8'); sch.term(g, 664, 165);
    return {
      Ra: sch.t(g, 150, 86, ''), Rb: sch.t(g, 195, 126, ''), Rc: sch.t(g, 245, 166, ''), Rf: sch.t(g, 400, 36, ''),
      va: sch.t(g, 60, 305, '', 'val'), vb: sch.t(g, 130, 305, '', 'val'), vc: sch.t(g, 200, 305, '', 'val'),
      vn: sch.t(g, 336, 128, '', 'val', 'start'), vo: sch.t(g, 505, 192, '', 'val', 'start'), mode: sch.t(g, 600, 20, '', 'val'),
    };
  }
  // Fark yükselteci
  function schDiff(g, kind = 'dc') {
    g.innerHTML = '';
    sch.src(g, 60, 200, 20, kind); sch.w(g, [[60, 180], [60, 140], [110, 140]]); sch.rH(g, 110, 190, 140); sch.w(g, [[190, 140], [380, 140]]); sch.dot(g, 300, 140);
    sch.w(g, [[60, 220], [60, 262]]); sch.gnd(g, 60, 262);
    sch.w(g, [[300, 140], [300, 60], [360, 60]]); sch.rH(g, 360, 440, 60); sch.w(g, [[440, 60], [580, 60], [580, 165]]);
    sch.src(g, 150, 250, 20, kind); sch.w(g, [[150, 230], [150, 190], [200, 190]]); sch.rH(g, 200, 280, 190); sch.w(g, [[280, 190], [380, 190]]); sch.dot(g, 330, 190);
    sch.rV(g, 330, 190, 262); sch.gnd(g, 330, 262); sch.w(g, [[150, 270], [150, 272]]); sch.gnd(g, 150, 272);
    sch.opamp(g, 380, 110); sch.t(g, 392, 146, '−'); sch.t(g, 392, 196, '+');
    sch.w(g, [[500, 165], [660, 165]]); sch.dot(g, 580, 165); sch.supply(g);
    sch.probe(g, 625, 165, 'v_o', '#1592b8'); sch.term(g, 664, 165);
    return {
      R1: sch.t(g, 150, 125, ''), R2: sch.t(g, 400, 45, ''), R3: sch.t(g, 240, 178, ''), R4: sch.t(g, 344, 240, '', 'lbl', 'start'),
      va: sch.t(g, 60, 126, '', 'val'), vb: sch.t(g, 176, 232, '', 'val', 'start'), vn: sch.t(g, 296, 160, '', 'val', 'end'), vp: sch.t(g, 344, 210, '', 'val', 'start'),
      vo: sch.t(g, 505, 192, '', 'val', 'start'), i1: sch.t(g, 150, 162, '', 'val'), mode: sch.t(g, 600, 22, '', 'val'),
    };
  }
  // Ön bilgi şekli
  (() => {
    const g = $('#obFig');
    const a = E('g', { transform: 'scale(.6)' }, g); const L1 = schSum(a);
    L1.Ra.textContent = 'R_a'; L1.Rb.textContent = 'R_b'; L1.Rc.textContent = 'R_c'; L1.Rf.textContent = 'R_f'; L1.va.textContent = 'v_a'; L1.vb.textContent = 'v_b'; L1.vc.textContent = 'v_c'; L1.vn.textContent = 'sanal toprak'; L1.mode.textContent = 'TOPLAYAN';
    const b = E('g', { transform: 'translate(475,0) scale(.6)' }, g); const L2 = schDiff(b);
    L2.R1.textContent = 'R_1'; L2.R2.textContent = 'R_2'; L2.R3.textContent = 'R_3'; L2.R4.textContent = 'R_4'; L2.va.textContent = 'v_a'; L2.vb.textContent = 'v_b'; L2.mode.textContent = 'FARK YÜKSELTECİ';
    [L1.mode, L2.mode].forEach((t) => (t.style.fontSize = '18px'));
  })();
  const CMRR_OP = 10 ** (-90 / 20); // µA741: 90 dB

  /* ================= ÖN HAZIRLIK ================= */
  numq('onhaz', '#preQ', { id: 'p1', q: '1) Toplayan yükselteç: R<sub>a</sub> = R<sub>b</sub> = R<sub>f</sub> = 10 kΩ, v<sub>a</sub> = 1 V, v<sub>b</sub> = −3 V. v<sub>o</sub> kaç volttur?', answer: 2, tol: 1, unit: 'V', explain: 'v<sub>o</sub> = −(1 − 3) = +2 V.', hint: 'v<sub>o</sub> = −(R<sub>f</sub>/R<sub>a</sub>·v<sub>a</sub> + R<sub>f</sub>/R<sub>b</sub>·v<sub>b</sub>)' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) Fark yükselteci: R<sub>1</sub> = R<sub>3</sub> = 10 kΩ, R<sub>2</sub> = R<sub>4</sub> = 50 kΩ, v<sub>a</sub> = 1,2 V, v<sub>b</sub> = 1,0 V. v<sub>o</sub> kaç volttur?', answer: -1, tol: 1, unit: 'V', explain: '5·(1,0 − 1,2) = −1 V.', hint: 'v<sub>o</sub> = (R<sub>2</sub>/R<sub>1</sub>)(v<sub>b</sub> − v<sub>a</sub>); hangi giriş evirmeyen uçta?' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) Aynı (oranları eşit) fark yükseltecinde v<sub>a</sub> = v<sub>b</sub> = 3 V ise v<sub>o</sub> kaç volttur?', answer: 0, tol: 0, abs: 0.01, unit: 'V', explain: 'Ortak işaret ideal olarak tamamen silinir.', hint: 'Fark sıfır.' });
  mcq('onhaz', '#preQ', { id: 'p4', q: '4) CMRR nedir?', opts: ['Ortak kazancın fark kazancına oranı', 'Fark kazancının ortak kazanca oranı: |A<sub>d</sub>/A<sub>cm</sub>|', 'Çıkış geriliminin besleme gerilimine oranı', 'Giriş direncinin çıkış direncine oranı'], correct: 1, explain: 'CMRR = |A<sub>d</sub>/A<sub>cm</sub>|, desibelde 20·log<sub>10</sub>(·). Ne kadar büyükse gürültü bastırma o kadar iyi.', hint: 'İstenen kazanç paydada mı payda mı olmalı?' });
  numq('onhaz', '#preQ', { id: 'p5', q: '5) CMRR = 80 dB, oran olarak kaçtır?', answer: 1e4, tol: 1, unit: '', explain: '10<sup>80/20</sup> = 10<sup>4</sup>.', hint: '10<sup>dB/20</sup>' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) Toplayan yükselteçte girişler neden birbirini etkilemez?', opts: ['Dirençler büyük olduğu için', 'Hepsi aynı sanal toprağa bağlıdır; bir girişin değişmesi diğer kolun akımını değiştirmez', 'Op-amp her girişi ayrı yükseltir', 'Etkilerler'], correct: 1, explain: 'Her kolun akımı yalnız kendi v<sub>k</sub>/R<sub>k</sub> değeridir; akımlar düğümde toplanıp R<sub>f</sub>\'den geçer.', hint: 'Düğüm gerilimi kaç volt?' });

  /* ================= DENEY 1 · Toplayan yükselteç ================= */
  const D1 = (() => {
    const box = $('#d1inst'), self = { c: {}, ch1: 'a', clipSeen: false };
    const set = () => (self.sc.dirty = true);
    const ga = inst(box, 'FG-1 · v<sub>a</sub> SİNÜS', '50 Ω'); const gaL = lcd(ga.el, 'v<sub>a</sub>', '', 160);
    const kaA = new Lab.Knob(ga.c, { label: 'Genlik', min: 0, max: 10, step: 0.05, value: 1, dark: true, fmt: (v) => num(v, 2) + ' Vpp', onChange: set });
    const kaO = new Lab.Knob(ga.c, { label: 'Ofset', min: -5, max: 5, step: 0.05, value: 0, dark: true, fmt: (v) => num(v, 2) + ' V', onChange: set });
    const kaF = new Lab.Knob(ga.c, { label: 'Frekans', min: 10, max: 2e4, log: true, value: 1000, dark: true, fmt: (v) => eng(v, 'Hz'), onChange: set });
    const gb = inst(box, 'DC KAYNAK · v<sub>b</sub>'); const gbL = lcd(gb.el, 'v<sub>b</sub>', 'V', 80);
    const kb = new Lab.Knob(gb.c, { label: 'v_b', min: -10, max: 10, step: 0.05, value: 0, dark: true, fmt: (v) => num(v, 2) + ' V', onChange: set });
    const gc = inst(box, 'FG-2 · v<sub>c</sub> KARE', '50 Ω'); const gcL = lcd(gc.el, 'v<sub>c</sub>', '', 160);
    const kcA = new Lab.Knob(gc.c, { label: 'Genlik', min: 0, max: 10, step: 0.05, value: 0, dark: true, fmt: (v) => num(v, 2) + ' Vpp', onChange: set });
    const kcO = new Lab.Knob(gc.c, { label: 'Ofset', min: -5, max: 5, step: 0.05, value: 0, dark: true, fmt: (v) => num(v, 2) + ' V', onChange: set });
    const kcF = new Lab.Knob(gc.c, { label: 'Frekans', min: 10, max: 2e4, log: true, value: 200, dark: true, fmt: (v) => eng(v, 'Hz'), onChange: set });
    const rb = inst(box, 'DİRENÇ KUTUSU', false);
    const kRa = new Lab.Knob(rb.c, { label: 'R_a', list: RBOX, value: 1e4, fmt: Lab.ohm, onChange: set });
    const kRb = new Lab.Knob(rb.c, { label: 'R_b', list: RBOX, value: 1e4, fmt: Lab.ohm, onChange: set });
    const kRc = new Lab.Knob(rb.c, { label: 'R_c', list: RBOX, value: 1e4, fmt: Lab.ohm, onChange: set });
    const kRf = new Lab.Knob(rb.c, { label: 'R_f', list: RBOX, value: 1e4, fmt: Lab.ohm, onChange: set });
    const ps = inst(box, '±V<sub>CC</sub>'); const psL = lcd(ps.el, 'BESLEME', 'V', 80);
    const kv = new Lab.Knob(ps.c, { label: 'V_CC', min: 5, max: 18, step: 0.5, value: 15, dark: true, fmt: (v) => '±' + num(v, 1) + ' V', onChange: set });
    const sel = document.createElement('div'); sel.className = 'row'; sel.style.cssText = 'gap:4px;margin-top:6px';
    sel.innerHTML = '<span style="font-size:11px">CH1 probu:</span>' + [['a', 'v_a'], ['b', 'v_b'], ['c', 'v_c']].map(([k, t]) => `<button class="seg-btn${k === 'a' ? ' on' : ''}" data-c="${k}">${t}</button>`).join('');
    ps.c.appendChild(sel);
    $$('button', sel).forEach((b) => (b.onclick = () => { self.ch1 = b.dataset.c; $$('button', sel).forEach((x) => x.classList.toggle('on', x === b)); set(); }));
    self.sc = mkScope($('#d1scope'), 'd1sc', { v1: 0.5, v2: 1, t: 1e-3, freq: () => Math.min(kaF.value, kcF.value) });
    const L = schSum($('#d1sch'));

    function compute() {
      const Ra = kRa.value + RG, Rb = kRb.value, Rc = kRc.value + RG, Rf = kRf.value, vcc = kv.value, vs = vsat(vcc);
      const A = kaA.value / 2, C = kcA.value / 2;
      const den = 1 + (1 + Rf / Ra + Rf / Rb + Rf / Rc) / A0;
      const va = (t) => A * Math.sin(2 * Math.PI * kaF.value * t) + kaO.value, vb = () => kb.value, vc = (t) => C * wave('sq', kcF.value * t) + kcO.value;
      const ideal = (t) => -((Rf / Ra) * va(t) + (Rf / Rb) * vb() + (Rf / Rc) * vc(t)) / den;
      const vmax = Math.min(vs, IMAX * Rf);
      const ext = [A + Math.abs(kaO.value), Math.abs(kb.value), C + Math.abs(kcO.value)];
      const worst = (Rf / Ra) * (A + Math.abs(kaO.value)) + (Rf / Rb) * Math.abs(kb.value) + (Rf / Rc) * (C + Math.abs(kcO.value));
      return { Ra: kRa.value, Rb: Rb, Rc: kRc.value, Rf, vcc, vmax, va, vb, vc, ideal, worst, ext, aA: kaA.value, aO: kaO.value, b: kb.value, cA: kcA.value, cO: kcO.value };
    }
    self.update = () => {
      if (!self.sc.dirty) return; self.sc.dirty = false;
      const c = (self.c = compute());
      gaL(`${num(c.aA, 2)} Vpp ${c.aO >= 0 ? '+' : ''}${num(c.aO, 2)} V`); gbL(num(c.b, 2)); gcL(`${num(c.cA, 2)} Vpp ${c.cO >= 0 ? '+' : ''}${num(c.cO, 2)} V`); psL('±' + num(c.vcc, 1));
      const probe = { a: c.va, b: c.vb, c: c.vc }[self.ch1];
      const d = runSim(self.sc.sc, Math.min(kaF.value, kcF.value), probe, (t) => clamp(c.ideal(t), -c.vmax, c.vmax));
      let mx = -1e9, mn = 1e9, s = 0, clip = false;
      for (let i = 0; i < d.n; i++) { const v = d.y[1][i]; s += v; if (v > mx) mx = v; if (v < mn) mn = v; if (Math.abs(v) >= c.vmax * 0.999) clip = true; }
      c.clip = clip; c.mean = s / d.n; c.mx = mx; c.mn = mn; if (clip) self.clipSeen = true;
      self.sc.draw(d);
      L.Ra.textContent = 'R_a = ' + Lab.ohm(c.Ra); L.Rb.textContent = 'R_b = ' + Lab.ohm(c.Rb); L.Rc.textContent = 'R_c = ' + Lab.ohm(c.Rc); L.Rf.textContent = 'R_f = ' + Lab.ohm(c.Rf);
      L.va.textContent = 'v_a'; L.vb.textContent = 'v_b'; L.vc.textContent = 'v_c'; L.vn.textContent = 'v_n ≈ 0'; L.vo.textContent = 'v_o';
      L.mode.textContent = clip ? 'DOYUM · KIRPILMA' : 'DOĞRUSAL · ağırlıklı toplam'; L.mode.style.fill = clip ? '#c62828' : '#1a8a4a';
    };
    const tab = recorder('d1', ['R<sub>a</sub>', 'R<sub>b</sub>', 'R<sub>c</sub>', 'R<sub>f</sub>', 'v<sub>a</sub> (Vpp / ofset)', 'v<sub>b</sub> (V)', 'v<sub>c</sub> (Vpp / ofset)', 'v<sub>o</sub> maks', 'v<sub>o</sub> min', 'v<sub>o</sub> ort.', 'Kırpılma'],
      (r) => [Lab.ohm(r.Ra), Lab.ohm(r.Rb), Lab.ohm(r.Rc), Lab.ohm(r.Rf), num(r.aA, 2) + ' / ' + num(r.aO, 2), num(r.b, 2), num(r.cA, 2) + ' / ' + num(r.cO, 2), num(r.mx, 3), num(r.mn, 3), num(r.mean, 3), r.clip ? 'var' : 'yok'], 'hafta3_deney1.csv');
    self.rec = () => { const c = self.c; tab.push({ Ra: c.Ra, Rb: c.Rb, Rc: c.Rc, Rf: c.Rf, aA: c.aA, aO: c.aO, b: c.b, cA: c.cA, cO: c.cO, mx: c.mx, mn: c.mn, mean: c.mean, clip: c.clip }); Lab.toast(`Kaydedildi: v_o ort. = ${num(c.mean, 3)} V`); };
    $('#d1rec').onclick = self.rec;
    Object.assign(self, { tab });
    return self;
  })();
  const ex16 = (r) => r.Ra === 2e4 && r.Rb === 4e4 && r.Rc === 1e4 && r.Rf === 4e4;
  steps('d1', [
    { t: 'Örnek 1.6: <b>R<sub>a</sub> = 20 k, R<sub>b</sub> = 40 k, R<sub>c</sub> = 10 k, R<sub>f</sub> = 40 kΩ</b>. Girişleri DC yapın: FG-1 genlik 0, ofset <b>1 V</b>; v<sub>b</sub> = <b>2 V</b>; FG-2 genlik 0, ofset <b>0,5 V</b>. Çıkışı kaydedin.', test: () => D1.tab.rows.some((r) => ex16(r) && r.aA === 0 && near(r.aO, 1, 0.01) && near(r.b, 2, 0.01) && r.cA === 0 && near(r.cO, 0.5, 0.01)) },
    { t: 'Aynı dirençlerle girişleri teker teker sıfırlayıp her girişin katkısını ayrı ayrı ölçün (en az 2 kayıt daha). Süperpozisyon tutuyor mu?', test: () => D1.tab.rows.filter((r) => ex16(r)).length >= 3 },
    { t: 'Üç farklı sinyali birlikte toplayın: <b>sinüs (genlik &gt; 0) + DC (v<sub>b</sub> ≠ 0) + kare (genlik &gt; 0)</b>, kırpılmadan kaydedin. CH1 probunu üç kaynak arasında gezdirip çıkışla karşılaştırın.', test: () => D1.tab.rows.some((r) => r.aA > 0 && Math.abs(r.b) > 0.05 && r.cA > 0 && !r.clip) },
    { t: '<b>Ses mikseri:</b> üç kanalın ağırlığı eşit olsun (R<sub>a</sub> = R<sub>b</sub> = R<sub>c</sub>) ve toplam kazanç her kanal için −1/2 olsun; kaydedin.', test: () => D1.tab.rows.some((r) => r.Ra === r.Rb && r.Rb === r.Rc && near(r.Rf / r.Ra, 0.5, 1e-6)) },
    { t: 'Bir kanalın ağırlığını artırarak çıkışı <b>doyuma</b> sokun ve kırpılmış bir ölçüm kaydedin.', test: () => D1.tab.rows.some((r) => r.clip) },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: 'Örnek 1.6 ayarında ölçtüğünüz v<sub>o</sub> kaç volttur?', answer: -6, tol: 1, unit: 'V', explain: '−(2·1 + 1·2 + 4·0,5) = −6 V.', hint: 'Her kolun kazancı −R<sub>f</sub>/R<sub>k</sub>.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'Örnek 1.6\'da v<sub>c</sub> kolunun kazancının büyüklüğü R<sub>f</sub>/R<sub>c</sub> kaçtır?', answer: 4, tol: 1, unit: '', explain: '40/10 = 4: en küçük direnç en büyük ağırlığı verir.', hint: 'R<sub>f</sub>/R<sub>c</sub>' });
  numq('d1', '#d1Q', { id: 'd1q3', q: 'Örnek 1.6\'da v<sub>c</sub> 0,5 V\'tan 1 V\'a çıkarılırsa v<sub>o</sub> kaç volt olur?', answer: -8, tol: 1, unit: 'V', explain: 'v<sub>c</sub> katkısı 2 V artar: −8 V. Aynı artış v<sub>b</sub>\'de yalnızca 0,5 V etki ederdi.', hint: 'Yalnızca v<sub>c</sub>\'nin katkısı değişir.' });
  mcq('d1', '#d1Q', { id: 'd1q4', q: 'Hangi giriş çıkışı en çok etkiler?', opts: ['En büyük gerilimli giriş', 'Direnci en küçük olan kol (en büyük R<sub>f</sub>/R<sub>k</sub>)', 'Direnci en büyük olan kol', 'Hepsi eşit etkiler'], correct: 1, explain: 'Ağırlık R<sub>f</sub>/R<sub>k</sub>\'dır. Ses mikserinde her kanalın seviyesi bu dirençle ayarlanır.', hint: 'Kazanç ifadesinde R<sub>k</sub> paydadadır.' });
  mcq('d1', '#d1Q', { id: 'd1q5', q: 'Çıkıştaki DC seviye (ortalama) hangi girişlerden gelir?', opts: ['Yalnız v<sub>b</sub>\'den', 'v<sub>b</sub> ile birlikte üreteçlerin ofsetlerinden, kendi ağırlıklarıyla', 'Sinüsün genliğinden', 'Kare dalganın frekansından'], correct: 1, explain: 'Sinüs ve simetrik kare dalganın ortalaması sıfırdır; DC katkı yalnızca sabit bileşenlerden gelir.', hint: 'Tablodaki ortalama sütununu ofsetlerle karşılaştırın.' });

  /* ================= DENEY 2 · Fark yükselteci ================= */
  const D2 = (() => {
    const box = $('#d2inst'), self = { tie: false };
    const ga = inst(box, 'DC KAYNAK · v<sub>a</sub> (eviren kol)'); const gaL = lcd(ga.el, 'v<sub>a</sub>', 'V', 90);
    const ka = new Lab.Knob(ga.c, { label: 'v_a', min: -10, max: 10, step: 0.01, value: 1, dark: true, fmt: (v) => num(v, 2) + ' V' });
    const gb = inst(box, 'DC KAYNAK · v<sub>b</sub> (evirmeyen kol)'); const gbL = lcd(gb.el, 'v<sub>b</sub>', 'V', 90);
    const kb = new Lab.Knob(gb.c, { label: 'v_b', min: -10, max: 10, step: 0.01, value: 1.5, dark: true, fmt: (v) => num(v, 2) + ' V' });
    const tb = document.createElement('button'); tb.className = 'seg-btn'; tb.style.cssText = 'width:120px;padding:6px 4px'; gb.c.appendChild(tb);
    const tt = () => { tb.textContent = self.tie ? 'v_b = v_a (ORTAK)' : 'Bağımsız'; tb.classList.toggle('on', self.tie); };
    tb.onclick = () => { self.tie = !self.tie; tt(); }; tt();
    const rb = inst(box, 'DİRENÇ KUTUSU', false);
    const k1 = new Lab.Knob(rb.c, { label: 'R_1', list: RBOX, value: 1e4, fmt: Lab.ohm });
    const k2 = new Lab.Knob(rb.c, { label: 'R_2', list: RBOX, value: 1e4, fmt: Lab.ohm });
    const k3 = new Lab.Knob(rb.c, { label: 'R_3', list: RBOX, value: 1e4, fmt: Lab.ohm });
    const k4 = new Lab.Knob(rb.c, { label: 'R_4', list: [...new Set([...RBOX, 1.1e5])].sort((a, b) => a - b), value: 1e4, fmt: Lab.ohm });
    const ps = inst(box, '±V<sub>CC</sub>'); const psL = lcd(ps.el, 'BESLEME', 'V', 80);
    const kv = new Lab.Knob(ps.c, { label: 'V_CC', min: 5, max: 18, step: 0.5, value: 15, dark: true, fmt: (v) => '±' + num(v, 1) + ' V' });
    const m1 = inst(box, 'DMM-1 · v<sub>p</sub> / v<sub>n</sub>', false); const m1L = lcd(m1.el, 'v<sub>p</sub> (DC V)', 'V', 100); const m1bL = lcd(m1.el, 'v<sub>n</sub> (DC V)', 'V', 100);
    const m2 = inst(box, 'DMM-2 · v<sub>o</sub> ve i<sub>1</sub>', false); const m2L = lcd(m2.el, 'v<sub>o</sub> (DC V)', 'V', 100); const m2bL = lcd(m2.el, 'i<sub>1</sub> (R<sub>1</sub>, soldan sağa)', 'µA', 100);
    const L = schDiff($('#d2sch'));
    function compute() {
      const va = ka.value, vb = self.tie ? va : kb.value, R1 = k1.value, R2 = k2.value, R3 = k3.value, R4 = k4.value, vcc = kv.value, m = model(vcc);
      const vp = (vb * R4) / (R3 + R4); m.vos = vp * CMRR_OP;
      const r = Lab.opamp(vp, 0, (va * R2) / (R1 + R2), R1 / (R1 + R2), m);
      let vo = r.vo; const sat = Math.abs(vo) >= m.vsatP * 0.999;
      const vn = (va * R2 + vo * R1) / (R1 + R2), i1 = (va - vn) / R1;
      return { va, vb, R1, R2, R3, R4, vcc, vp, vn, vo, i1, sat, tie: self.tie };
    }
    self.update = () => {
      const c = (self.c = compute());
      gaL(num(c.va, 2)); gbL(num(c.vb, 2)); psL('±' + num(c.vcc, 1)); m1L(num(c.vp, 4)); m1bL(num(c.vn, 4)); m2L(num(c.vo, 4)); m2bL(num(c.i1 * 1e6, 2));
      L.R1.textContent = 'R_1 = ' + Lab.ohm(c.R1); L.R2.textContent = 'R_2 = ' + Lab.ohm(c.R2); L.R3.textContent = 'R_3 = ' + Lab.ohm(c.R3); L.R4.textContent = 'R_4 = ' + Lab.ohm(c.R4);
      L.va.textContent = 'v_a = ' + num(c.va, 2) + ' V'; L.vb.textContent = 'v_b = ' + num(c.vb, 2) + ' V'; L.vn.textContent = ''; L.vp.textContent = ''; L.vo.textContent = 'v_o = ' + num(c.vo, 3) + ' V'; L.i1.textContent = '';
      const eq = Math.abs(c.R2 / c.R1 - c.R4 / c.R3) < 1e-9;
      L.mode.textContent = c.sat ? 'DOYUM' : eq ? 'R2/R1 = R4/R3 · oran koşulu sağlanıyor' : 'ORAN KOŞULU BOZUK'; L.mode.style.fill = c.sat || !eq ? '#c62828' : '#1a8a4a';
    };
    const tab = recorder('d2', ['R<sub>1</sub>', 'R<sub>2</sub>', 'R<sub>3</sub>', 'R<sub>4</sub>', 'v<sub>a</sub> (V)', 'v<sub>b</sub> (V)', 'v<sub>p</sub> (V)', 'i<sub>1</sub> (µA)', 'v<sub>o</sub> (V)'],
      (r) => [Lab.ohm(r.R1), Lab.ohm(r.R2), Lab.ohm(r.R3), Lab.ohm(r.R4), num(r.va, 2), num(r.vb, 2), num(r.vp, 4), num(r.i1 * 1e6, 2), num(r.vo, 4)], 'hafta3_deney2.csv');
    self.rec = () => { const c = compute(); tab.push(c); Lab.toast(`Kaydedildi: v_b − v_a = ${num(c.vb - c.va, 2)} V → v_o = ${num(c.vo, 4)} V`); };
    $('#d2rec').onclick = self.rec;
    Object.assign(self, { tab });
    return self;
  })();
  const ex17 = (r) => r.R1 === 2e4 && r.R3 === 2e4 && r.R2 === 1e5;
  steps('d2', [
    { t: 'Örnek 1.7: <b>R<sub>1</sub> = R<sub>3</sub> = 20 kΩ, R<sub>2</sub> = R<sub>4</sub> = 100 kΩ</b>, <b>v<sub>a</sub> = 2 V, v<sub>b</sub> = 2,5 V</b>. Oran koşulunu kontrol edip kaydedin.', test: () => D2.tab.rows.some((r) => ex17(r) && r.R4 === 1e5 && near(r.va, 2, 0.005) && near(r.vb, 2.5, 0.005)) },
    { t: 'Girişleri birleştirin (<b>v<sub>b</sub> = v<sub>a</sub> = 2 V</b>, ORTAK düğmesi) ve kaydedin: ortak işaret silindi mi?', test: () => D2.tab.rows.some((r) => ex17(r) && r.R4 === 1e5 && near(r.va, 2, 0.005) && near(r.vb, 2, 0.005)) },
    { t: 'Örnek 1.14: <b>v<sub>a</sub> = 1 V, v<sub>b</sub> = 3 V</b>. DMM-1\'de v<sub>p</sub> ve v<sub>n</sub>\'yi, DMM-2\'de i<sub>1</sub>\'i okuyup kaydedin. v<sub>n</sub> sıfır mı?', test: () => D2.tab.rows.some((r) => ex17(r) && r.R4 === 1e5 && near(r.va, 1, 0.005) && near(r.vb, 3, 0.005)) },
    { t: 'Sık hata kontrolü: v<sub>b</sub> &lt; v<sub>a</sub> olacak bir ölçüm kaydedin. Çıkışın işareti hangi farka göre belirleniyor?', test: () => D2.tab.rows.some((r) => ex17(r) && r.R4 === 1e5 && r.vb < r.va - 0.05 && !r.sat) },
    { t: 'Önce tahmin et: <b>R<sub>4</sub> = 110 kΩ</b> takıldı. v<sub>a</sub> = v<sub>b</sub> = 2 V iken kaydedin. Çıkış hâlâ sıfır mı?', test: () => D2.tab.rows.some((r) => ex17(r) && r.R4 === 1.1e5 && near(r.va, 2, 0.005) && near(r.vb, 2, 0.005)) },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'Örnek 1.7\'de (v<sub>a</sub> = 2 V, v<sub>b</sub> = 2,5 V) v<sub>o</sub> kaç volttur?', answer: 2.5, tol: 1, unit: 'V', explain: '5·(2,5 − 2) = 2,5 V.', hint: '(R<sub>2</sub>/R<sub>1</sub>)(v<sub>b</sub> − v<sub>a</sub>)' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'Örnek 1.14\'te v<sub>n</sub> kaç volttur?', answer: 2.5, tol: 1, unit: 'V', explain: 'v<sub>p</sub> = 3·100/120 = 2,5 V ve sanal kısa devre: v<sub>n</sub> = 2,5 V (sıfır değil!).', hint: 'Önce v<sub>p</sub>\'yi bölücüden bulun.' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 'Örnek 1.14\'te R<sub>1</sub>\'den soldan sağa geçen i<sub>1</sub> kaç µA\'dir?', answer: -75, tol: 2, unit: 'µA', explain: '(1 − 2,5)/20k = −75 µA: gerçek yön v<sub>n</sub> düğümünden kaynağa doğrudur.', hint: '(v<sub>a</sub> − v<sub>n</sub>)/R<sub>1</sub>' });
  numq('d2', '#d2Q', { id: 'd2q4', q: 'Örnek 1.14\'te v<sub>o</sub> kaç volttur?', answer: 10, tol: 1, unit: 'V', explain: '5·(3 − 1) = 10 V; kontrol: v<sub>n</sub> − i<sub>1</sub>R<sub>2</sub> = 2,5 + 7,5 = 10 V.', hint: 'Fark kazancı 5.' });
  numq('d2', '#d2Q', { id: 'd2q5', q: 'R<sub>4</sub> = 110 kΩ iken v<sub>a</sub> = v<sub>b</sub> = 2 V için ölçtüğünüz v<sub>o</sub> kaç volttur?', answer: 6 * 2 * 110 / 130 - 10, tol: 3, unit: 'V', explain: 'v<sub>p</sub> = 2·110/130 = 1,692 V; v<sub>o</sub> = 6·1,692 − 5·2 = 0,15 V. Ortak 2 V çıkışta 0,15 V\'luk bir hata bıraktı.', hint: 'v<sub>o</sub> = (1 + R<sub>2</sub>/R<sub>1</sub>)v<sub>p</sub> − (R<sub>2</sub>/R<sub>1</sub>)v<sub>a</sub>' });
  mcq('d2', '#d2Q', { id: 'd2q6', q: 'Fark yükseltecinin çıkış ifadesi hangisidir (oran koşulu sağlanıyorken)?', opts: ['(R<sub>2</sub>/R<sub>1</sub>)(v<sub>a</sub> − v<sub>b</sub>)', '(R<sub>2</sub>/R<sub>1</sub>)(v<sub>b</sub> − v<sub>a</sub>)', '(1 + R<sub>2</sub>/R<sub>1</sub>)(v<sub>b</sub> − v<sub>a</sub>)', '−(R<sub>2</sub>/R<sub>1</sub>)(v<sub>a</sub> + v<sub>b</sub>)'], correct: 1, explain: 'v<sub>b</sub> evirmeyen uca bağlıdır ve pozitif katkı verir. Kontrol: v<sub>b</sub> &gt; v<sub>a</sub> iken çıkış pozitif.', hint: 'Kaydettiğiniz v<sub>b</sub> &lt; v<sub>a</sub> ölçümünde çıkışın işareti neydi?' });

  /* ================= DENEY 3 · Direnç uyumsuzluğu ve CMRR ================= */
  const D3 = (() => {
    const box = $('#d3inst'), self = { mode: 'cm', tol: 'man', set: null };
    const NOM = [2e4, 1e5, 2e4, 1e5];
    const gb = inst(box, 'TEST KAYNAĞI'); const gL = lcd(gb.el, 'giriş', '', 170);
    const mb = document.createElement('div'); mb.className = 'row'; mb.style.cssText = 'gap:4px;margin-bottom:4px';
    mb.innerHTML = '<button class="seg-btn" data-m="dm">FARK MODU</button><button class="seg-btn on" data-m="cm">ORTAK MOD</button>'; gb.el.insertBefore(mb, gb.c);
    $$('button', mb).forEach((b) => (b.onclick = () => { self.mode = b.dataset.m; $$('button', mb).forEach((x) => x.classList.toggle('on', x === b)); }));
    const kin = new Lab.Knob(gb.c, { label: 'v_d / v_cm', min: 0.1, max: 5, step: 0.05, value: 2, dark: true, fmt: (v) => num(v, 2) + ' V' });
    const rb = inst(box, 'DİRENÇ SETİ · nominal 20 k / 100 k / 20 k / 100 k', false);
    const tbx = document.createElement('div'); tbx.className = 'row'; tbx.style.cssText = 'gap:4px;margin-bottom:4px';
    tbx.innerHTML = [['man', 'Elle R4'], ['0.05', '%5'], ['0.01', '%1'], ['0.001', '%0,1']].map(([k, t]) => `<button class="seg-btn${k === 'man' ? ' on' : ''}" data-t="${k}">${t}</button>`).join('');
    rb.el.insertBefore(tbx, rb.c);
    const k4 = new Lab.Knob(rb.c, { label: 'R_4 (elle)', min: 9e4, max: 1.2e5, step: 100, value: 1e5, fmt: (v) => num(v / 1e3, 1) + ' kΩ' });
    const draw = document.createElement('button'); draw.className = 'btn small'; draw.textContent = 'Rastgele dirençler tak'; rb.c.appendChild(draw);
    const rv = document.createElement('div'); rv.style.cssText = 'font:12px Consolas,monospace;margin-top:4px;min-width:200px'; rb.el.appendChild(rv);
    $$('button', tbx).forEach((b) => (b.onclick = () => { self.tol = b.dataset.t; $$('button', tbx).forEach((x) => x.classList.toggle('on', x === b)); if (self.tol !== 'man') newSet(); }));
    function newSet() { const t = +self.tol; self.set = NOM.map((R) => R * (1 + t * (2 * Math.random() - 1))); }
    draw.onclick = () => { if (self.tol === 'man') return Lab.toast('Önce bir tolerans sınıfı seçin (%5, %1, %0,1).'); newSet(); Lab.toast('Yeni bir direnç takımı takıldı.'); };
    const mm = inst(box, 'DMM · v<sub>o</sub>', false); const mL = lcd(mm.el, 'DC V · 5½ hane', 'V', 130);
    const L = schDiff($('#d3sch'));
    const R = () => (self.tol === 'man' ? [2e4, 1e5, 2e4, k4.value] : self.set);
    function vout(Rs, va, vb) {
      const [R1, R2, R3, R4] = Rs, m = model(15), vp = (vb * R4) / (R3 + R4); m.vos = vp * CMRR_OP;
      return Lab.opamp(vp, 0, (va * R2) / (R1 + R2), R1 / (R1 + R2), m).vo;
    }
    function compute() {
      const Rs = R(), v = kin.value;
      const [va, vb] = self.mode === 'dm' ? [-v / 2, v / 2] : [v, v];
      return { Rs, va, vb, vo: vout(Rs, va, vb), mode: self.mode, v, tol: self.tol };
    }
    self.update = () => {
      const c = (self.c = compute());
      gL(self.mode === 'dm' ? `v_a = ${num(c.va, 3)} · v_b = ${num(c.vb, 3)}` : `v_a = v_b = ${num(c.v, 2)}`, 'V');
      mL(num(c.vo, 5));
      rv.innerHTML = c.Rs.map((x, i) => `R${i + 1} = ${num(x / 1e3, 3)} kΩ`).join('<br>');
      L.R1.textContent = 'R_1'; L.R2.textContent = 'R_2'; L.R3.textContent = 'R_3'; L.R4.textContent = 'R_4';
      L.va.textContent = 'v_a = ' + num(c.va, 2) + ' V'; L.vb.textContent = 'v_b = ' + num(c.vb, 2) + ' V'; L.vo.textContent = 'v_o = ' + num(c.vo, 4) + ' V';
      L.vn.textContent = ''; L.vp.textContent = ''; L.i1.textContent = '';
      L.mode.textContent = c.mode === 'dm' ? 'FARK MODU: v_b − v_a = ' + num(c.v, 2) + ' V' : 'ORTAK MOD: v_cm = ' + num(c.v, 2) + ' V'; L.mode.style.fill = '#0b5cad';
    };
    const plot = new Lab.Plot($('#d3plot'), { xlabel: 'tolerans sınıfı  log10(t / %)', ylabel: 'CMRR  (dB)' });
    const tolTxt = (t) => (t === 'man' ? 'elle' : '%' + num(+t * 100, +t < 0.01 ? 1 : 0));
    function drawPlot() {
      const pts = S.d3rows.filter((r) => r.tol !== 'man' && r.acm !== 0).map((r) => [Math.log10(+r.tol * 100), 20 * Math.log10(Math.abs(r.ad / r.acm))]);
      const ser = [{ pts, dots: true, color: '#0b5cad' }];
      if ($('#d3theo').checked) ser.push({ pts: [-1.05, -0.5, 0, 0.5, 0.75].map((x) => [x, 20 * Math.log10(6 / (4 * 10 ** x / 100))]), line: true, color: '#e07a10', dash: [6, 4] });
      plot.draw(ser, [-1.2, 0.9], [20, 100]);
    }
    $('#d3theo').onchange = drawPlot;
    const tab = recorder('d3', ['Takım', 'R<sub>1</sub>', 'R<sub>2</sub>', 'R<sub>3</sub>', 'R<sub>4</sub>', 'v<sub>o</sub> fark (v<sub>d</sub> = 1 V)', 'v<sub>o</sub> ortak (v<sub>cm</sub> = 2 V)'],
      (r) => [tolTxt(r.tol), ...r.Rs.map((x) => num(x / 1e3, 3) + ' k'), num(r.ad, 5), num(r.acm * 2, 5)], 'hafta3_deney3.csv', () => drawPlot());
    self.rec = () => {
      const Rs = R(); if (!Rs) return Lab.toast('Önce bir direnç takımı takın.');
      const ad = vout(Rs, -0.5, 0.5), acm = vout(Rs, 2, 2) / 2;
      tab.push({ tol: self.tol, Rs: Rs.slice(), ad, acm });
      Lab.toast('Bu direnç takımı için iki mod ölçüldü ve kaydedildi (v_d = 1 V, v_cm = 2 V).');
    };
    $('#d3rec').onclick = self.rec;
    Object.assign(self, { tab, k4, plotCanvas: $('#d3plot') });
    return self;
  })();
  const n3 = (t) => D3.tab.rows.filter((r) => r.tol === t).length;
  steps('d3', [
    { t: '<b>Elle R4</b> ile R<sub>4</sub> = <b>100,0 kΩ</b> (uyumlu) yapın; önce ORTAK MOD\'da (2 V), sonra FARK MODU\'nda (1 V) çıkışı okuyup takımı kaydedin.', test: () => D3.tab.rows.some((r) => r.tol === 'man' && near(r.Rs[3], 1e5, 1)) },
    { t: 'R<sub>4</sub> = <b>110,0 kΩ</b> yapıp kaydedin. A<sub>d</sub>, A<sub>cm</sub> ve CMRR\'yi tablodan hesaplayın.', test: () => D3.tab.rows.some((r) => r.tol === 'man' && near(r.Rs[3], 1.1e5, 1)) },
    { t: '<b>%5</b> toleransla en az 4 rastgele takım kaydedin.', test: () => n3('0.05') >= 4 },
    { t: '<b>%1</b> toleransla en az 4 rastgele takım kaydedin.', test: () => n3('0.01') >= 4 },
    { t: '<b>%0,1</b> toleransla en az 4 rastgele takım kaydedin ve grafikte üç sınıfı karşılaştırın (teorik en kötü durumu açın).', test: () => n3('0.001') >= 4 },
  ]);
  numq('d3', '#d3Q', { id: 'd3q1', q: 'R<sub>4</sub> = 110 kΩ için ortak mod kazancı |A<sub>cm</sub>| = |v<sub>o</sub>/v<sub>cm</sub>| kaçtır?', answer: (6 * 110 / 130 - 5), tol: 3, unit: '', explain: '0,1538 V / 2 V ≈ 0,077. İdeal (uyumlu) durumda 0 olmalıydı.', hint: 'Tablodaki ortak mod çıkışını 2 V\'a bölün.' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'Aynı takım için CMRR kaç dB\'dir?', answer: 20 * Math.log10(((6 * 110 / 130 + 5) / 2) / (6 * 110 / 130 - 5)), tol: 3, unit: 'dB', explain: 'A<sub>d</sub> ≈ 5,04, A<sub>cm</sub> ≈ 0,077 → CMRR ≈ 65,5 ≈ 36,3 dB. Op-ampın kendi CMRR\'si 90 dB iken devre 36 dB\'e düştü!', hint: '20·log<sub>10</sub>(A<sub>d</sub>/A<sub>cm</sub>)' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'Örnek 1.20: R<sub>1</sub> = R<sub>3</sub> = 10 kΩ, R<sub>2</sub> = 150 kΩ, R<sub>4</sub> = 151,5 kΩ (%1 büyük), v<sub>a</sub> = 2,000 V, v<sub>b</sub> = 2,012 V. v<sub>o</sub> kaç volttur?', answer: 16 * 2.012 * 151.5 / 161.5 - 30, tol: 2, unit: 'V', explain: 'v<sub>p</sub> = 1,8874 V; v<sub>o</sub> = 16·1,8874 − 15·2 = 0,199 V. İdeal 0,180 V\'a göre %10 hata!', hint: 'v<sub>o</sub> = (1 + R<sub>2</sub>/R<sub>1</sub>)v<sub>p</sub> − (R<sub>2</sub>/R<sub>1</sub>)v<sub>a</sub>' });
  numq('d3', '#d3Q', { id: 'd3q4', q: 'Bu devrede (A<sub>d</sub> = 5) her direnç en çok ±t saparsa en kötü durum CMRR ≈ (1 + A<sub>d</sub>)/(4t) olur. t = %1 için bu kaç dB\'dir?', answer: 20 * Math.log10(6 / 0.04), tol: 3, unit: 'dB', explain: '6/0,04 = 150 → 43,5 dB. %0,1 ile 63,5 dB. Ölçtüğünüz rastgele takımlar genellikle bu sınırın üstünde kalır.', hint: '20·log<sub>10</sub>(6/(4·0,01))' });
  mcq('d3', '#d3Q', { id: 'd3q5', q: 'Grafiğe göre CMRR\'yi 20 dB artırmak için direnç toleransını ne yapmalısınız?', opts: ['İki kat iyileştirmek', 'On kat iyileştirmek (ör. %1 → %0,1)', 'Değiştirmenin etkisi yok', 'Op-ampı değiştirmek yeterli'], correct: 1, explain: 'CMRR toleransla ters orantılıdır: 10 kat daha iyi direnç = +20 dB. Bu yüzden fark yükselteçlerinde %0,1 dirençler ya da hazır ölçü yükselteci entegreleri kullanılır.', hint: 'Grafikteki eğim ne kadar?' });

  /* ================= DENEY 4 · Gürültülü hat ================= */
  const D4 = (() => {
    const box = $('#d4inst'), self = { meas: 'se', tol: '0' };
    const set = () => (self.sc.dirty = true);
    const sg = inst(box, 'SENSÖR SİNYALİ (fark)', '500 Hz'); const sgL = lcd(sg.el, 'v<sub>d</sub>', 'mVpp', 90);
    const ks = new Lab.Knob(sg.c, { label: 'v_d', min: 5, max: 200, step: 1, value: 20, dark: true, fmt: (v) => num(v, 0) + ' mVpp', onChange: set });
    const ns = inst(box, 'HATTA BİNEN 50 Hz ŞEBEKE GÜRÜLTÜSÜ (ortak)'); const nsL = lcd(ns.el, 'v<sub>cm</sub> tepe', 'V', 90);
    const kn = new Lab.Knob(ns.c, { label: 'v_cm', min: 0, max: 5, step: 0.05, value: 0, dark: true, fmt: (v) => num(v, 2) + ' V', onChange: set });
    const am = inst(box, 'ALICI YÜKSELTEÇ · ±15 V', false);
    const mb = document.createElement('div'); mb.className = 'row'; mb.style.cssText = 'gap:4px;margin-bottom:4px';
    mb.innerHTML = '<button class="seg-btn on" data-m="se">TEK UÇLU (v_b → toprak)</button><button class="seg-btn" data-m="diff">FARK YÜKSELTECİ</button>'; am.el.insertBefore(mb, am.c);
    $$('button', mb).forEach((b) => (b.onclick = () => { self.meas = b.dataset.m; $$('button', mb).forEach((x) => x.classList.toggle('on', x === b)); set(); }));
    const kg = new Lab.Knob(am.c, { label: 'Kazanç R_2/R_1', list: [1, 2, 5, 10, 20, 50], value: 10, fmt: (v) => '× ' + v, onChange: set });
    const tb = document.createElement('div'); tb.className = 'row'; tb.style.cssText = 'gap:4px';
    tb.innerHTML = '<span style="font-size:11px">Direnç:</span>' + [['0', 'ideal'], ['0.001', '%0,1'], ['0.01', '%1'], ['0.05', '%5']].map(([k, t]) => `<button class="seg-btn${k === '0' ? ' on' : ''}" data-t="${k}">${t}</button>`).join('');
    am.c.appendChild(tb);
    $$('button', tb).forEach((b) => (b.onclick = () => { self.tol = b.dataset.t; $$('button', tb).forEach((x) => x.classList.toggle('on', x === b)); set(); }));
    self.sc = mkScope($('#d4scope'), 'd4sc', { v1: 1, v2: 2, t: 5e-3, freq: () => 50 });
    // öğrenciye özgü sabit sapma yönleri
    const u = [0, 1, 2, 3].map((k) => { const h = Math.sin(S.seed * 7.13 + k * 91.7) * 43758.5453; return 2 * (h - Math.floor(h)) - 1; });
    // şema
    const g = $('#d4sch');
    E('rect', { x: 20, y: 90, width: 120, height: 130, rx: 6, fill: '#f3f6fb', stroke: '#888', 'stroke-dasharray': '5 4' }, g); sch.t(g, 80, 82, 'SENSÖR').style.fill = '#777';
    sch.src(g, 80, 155, 20, 'ac'); sch.t(g, 80, 200, 'v_d', 'lbl');
    E('path', { d: 'M140,120 C220,100 260,140 340,120 S470,100 520,120 M140,190 C220,210 260,170 340,190 S470,210 520,190', stroke: '#555', 'stroke-width': 2.5, fill: 'none' }, g);
    sch.w(g, [[80, 135], [80, 120], [140, 120]]); sch.w(g, [[80, 175], [80, 190], [140, 190]]);
    sch.t(g, 330, 95, 'uzun hat (10 m) · 50 Hz kuplajı her iki tele eşit biner', 'lbl').style.fontSize = '12px';
    E('path', { d: 'M300,40 v30 M290,62 l10,10 l10,-10', stroke: '#c62828', 'stroke-width': 2, fill: 'none' }, g); sch.t(g, 300, 32, '~ şebeke', 'lbl').style.fill = '#c62828';
    sch.t(g, 530, 124, 'v_b', 'lbl', 'start'); sch.t(g, 530, 194, 'v_a', 'lbl', 'start');
    E('rect', { x: 580, y: 110, width: 140, height: 90, rx: 8, fill: '#f4f7ff', stroke: '#222', 'stroke-width': 2 }, g);
    const tAmp = sch.t(g, 650, 150, '', 'val'), tAmp2 = sch.t(g, 650, 172, '', 'lbl');
    sch.w(g, [[520, 120], [580, 120]]); const wA = sch.w(g, [[520, 190], [580, 190]]);
    const gndA = E('g', {}, g); sch.w(gndA, [[560, 190], [560, 240]]); sch.gnd(gndA, 560, 240);
    sch.t(g, 560, 285, '', 'lbl');
    const tMode = sch.t(g, 380, 270, '', 'val');
    function compute() {
      const G = kg.value, t = +self.tol, vd = ks.value / 1e3 / 2, vc = kn.value, vs = vsat(15);
      const R1 = 1e4 * (1 + t * u[0]), R2 = G * 1e4 * (1 + t * u[1]), R3 = 1e4 * (1 + t * u[2]), R4 = G * 1e4 * (1 + t * u[3]);
      const k4 = R4 / (R3 + R4), Gp = 1 + R2 / R1, Gn = R2 / R1;
      const cm = (tt) => vc * Math.sin(2 * Math.PI * 50 * tt), sg = (tt) => vd * Math.sin(2 * Math.PI * 500 * tt);
      const vb = (tt) => cm(tt) + sg(tt) / 2, va = (tt) => cm(tt) - sg(tt) / 2;
      const out = self.meas === 'se' ? (tt) => G * vb(tt) : (tt) => Gp * k4 * vb(tt) * (1 + CMRR_OP) - Gn * va(tt);
      const acm = self.meas === 'se' ? G : Math.abs(Gp * k4 * (1 + CMRR_OP) - Gn);
      return { G, t, vd, vc, vs, vb, out, acm, meas: self.meas, tol: self.tol };
    }
    self.update = () => {
      if (!self.sc.dirty) return; self.sc.dirty = false;
      const c = (self.c = compute());
      sgL(num(c.vd * 2e3, 0)); nsL(num(c.vc, 2));
      self.sc.draw(runSim(self.sc.sc, 50, c.vb, (tt) => clamp(c.out(tt), -c.vs, c.vs)));
      const m = self.sc.meas; c.clip = m && (m.ch[1].max >= c.vs * 0.999 || m.ch[1].min <= -c.vs * 0.999);
      tAmp.textContent = c.meas === 'se' ? 'v_o = ' + c.G + '·v_b' : 'v_o = ' + c.G + '·(v_b − v_a)';
      tAmp2.textContent = c.meas === 'se' ? 'v_a kullanılmıyor' : 'direnç: ' + (c.t ? '%' + num(c.t * 100, c.t < 0.01 ? 1 : 0) : 'ideal');
      wA.style.opacity = c.meas === 'se' ? 0.15 : 1; gndA.style.opacity = c.meas === 'se' ? 1 : 0;
      tMode.textContent = c.clip ? 'ÇIKIŞ DOYUMDA · sinyal gürültüde boğuldu' : ''; tMode.style.fill = '#c62828';
    };
    const tab = recorder('d4', ['Ölçüm', 'Kazanç', 'Direnç', 'v<sub>d</sub> (mVpp)', 'v<sub>cm</sub> tepe (V)', 'CH2 Vpp (V)', 'CH2 maks (V)', 'Doyum'],
      (r) => [r.meas === 'se' ? 'tek uçlu' : 'fark', '× ' + r.G, r.meas === 'se' ? '—' : r.t ? '%' + num(r.t * 100, r.t < 0.01 ? 1 : 0) : 'ideal', num(r.vd * 2e3, 0), num(r.vc, 2), num(r.vpp, 4), num(r.mx, 4), r.clip ? 'var' : 'yok'], 'hafta3_deney4.csv');
    self.rec = () => { const c = self.c, m = self.sc.meas; if (!m) return; tab.push({ meas: c.meas, G: c.G, t: c.t, vd: c.vd, vc: c.vc, vpp: m.ch[1].vpp, mx: m.ch[1].max, clip: !!c.clip }); Lab.toast(`Kaydedildi: CH2 ${num(m.ch[1].vpp, 4)} Vpp`); };
    $('#d4rec').onclick = self.rec;
    Object.assign(self, { tab });
    return self;
  })();
  const r4 = (f) => D4.tab.rows.some(f);
  steps('d4', [
    { t: 'Gürültü yokken (v<sub>cm</sub> = 0) <b>tek uçlu</b>, kazanç ×10, v<sub>d</sub> = 20 mVpp ölçümünü kaydedin. Sinyal temiz mi?', test: () => r4((r) => r.meas === 'se' && r.G === 10 && r.vc === 0 && near(r.vd, 0.01, 1e-6)) },
    { t: 'Hatta <b>1 V tepe</b> 50 Hz ortak gürültü bindirin, tek uçlu ölçümü kaydedin. Sinyal nerede?', test: () => r4((r) => r.meas === 'se' && r.G === 10 && near(r.vc, 1, 0.01)) },
    { t: '<b>Fark yükselteci</b> (ideal dirençler) ile aynı ayarı kaydedin. CH2 zaman ölçeğini küçültüp 500 Hz sinyali inceleyin.', test: () => r4((r) => r.meas === 'diff' && r.t === 0 && r.G === 10 && near(r.vc, 1, 0.01)) },
    { t: 'Dirençleri <b>%5</b> ve <b>%1</b> yapıp ikisini de kaydedin: çıkışta 50 Hz kalıntısı görünüyor mu?', test: () => r4((r) => r.meas === 'diff' && r.t === 0.05 && near(r.vc, 1, 0.01)) && r4((r) => r.meas === 'diff' && r.t === 0.01 && near(r.vc, 1, 0.01)) },
    { t: 'Gürültüyü <b>5 V</b> tepeye çıkarın, %0,1 dirençlerle kaydedin. Sinyal hâlâ kurtarılabiliyor mu?', test: () => r4((r) => r.meas === 'diff' && r.t === 0.001 && near(r.vc, 5, 0.01)) },
  ]);
  numq('d4', '#d4Q', { id: 'd4q1', q: 'Tek uçlu, kazanç ×10, 1 V tepe ortak gürültüde (doyum olmasaydı) çıkıştaki 50 Hz bileşeninin tepe değeri kaç volt olurdu?', answer: 10, tol: 1, unit: 'V', explain: 'Tek uçlu yükselteç gürültüyü sinyalle aynı kazançla yükseltir: 10 V tepe; 20 mVpp\'lik sinyal (0,2 Vpp çıkış) bunun yanında kaybolur.', hint: 'G·v<sub>cm</sub>' });
  numq('d4', '#d4Q', { id: 'd4q2', q: 'İdeal fark yükseltecinde (×10) 20 mVpp\'lik sinyal çıkışta kaç Vpp olur?', answer: 0.2, tol: 2, unit: 'Vpp', explain: '10·20 mVpp = 0,2 Vpp; ortak 50 Hz tamamen silinir.', hint: 'Yalnızca fark yükseltilir.' });
  numq('d4', '#d4Q', { id: 'd4q3', q: 'R<sub>1</sub> = R<sub>3</sub> = 10 kΩ, R<sub>2</sub> = 100 kΩ, R<sub>4</sub> = 101 kΩ (%1 büyük), 1 V tepe ortak gürültü: çıkıştaki 50 Hz kalıntısının tepe değeri kaç mV\'tur?', answer: (11 * 101 / 111 - 10) * 1000, tol: 3, unit: 'mV', explain: 'A<sub>cm</sub> = 11·101/111 − 10 ≈ 0,0090 → 9 mV tepe: 100 mV tepe sinyalin yanında %9\'luk bir uğultu.', hint: 'A<sub>cm</sub> = (1 + R<sub>2</sub>/R<sub>1</sub>)·R<sub>4</sub>/(R<sub>3</sub>+R<sub>4</sub>) − R<sub>2</sub>/R<sub>1</sub>' });
  mcq('d4', '#d4Q', { id: 'd4q4', q: 'Fark yükseltecinin gürültüyü bastırabilmesi için kablolama nasıl olmalıdır?', opts: ['İki tel birbirinden mümkün olduğunca uzak döşenmeli', 'İki tel bükümlü çift (twisted pair) olarak birlikte döşenmeli ki gürültü her ikisine eşit binsin', 'Tek tel yeterli, dönüş toprak üzerinden', 'Kablo boyu önemli değil, ekran gereksiz'], correct: 1, explain: 'Fark yükselteci yalnızca <b>ortak</b> bileşeni siler. Gürültü iki tele farklı binerse fark gibi görünür ve yükseltilir. Endüstride 4–20 mA, RS-485, CAN, XLR mikrofon kabloları bu ilkeyle çalışır.', hint: 'Silinen bileşen hangisiydi?' });
  mcq('d4', '#d4Q', { id: 'd4q5', q: 'Gürültü 5 V tepe ve dirençler %5 iken hangi önlem en etkilidir?', opts: ['Kazancı artırmak', '%0,1 (ya da eşleştirilmiş) dirençler veya hazır bir ölçü yükselteci entegresi kullanmak', 'Beslemeyi düşürmek', 'Sinyal frekansını artırmak'], correct: 1, explain: 'Kalıntı A<sub>cm</sub>·v<sub>cm</sub> ile orantılıdır; A<sub>cm</sub>\'yi direnç eşleşmesi belirler. Kazancı artırmak sinyalle birlikte kalıntıyı da büyütür.', hint: 'Kalıntıyı belirleyen hangi oran?' });

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
    const T = (id) => `<table class="data">${$(id).innerHTML}</table>`;
    const html = `
      <h2 style="margin:0">Devre Kuramı I · Sanal Laboratuvar · Hafta 3 Raporu</h2>
      <p><b>Konu:</b> Toplayan ve fark yükselteci, ortak işaret bastırma (CMRR), gürültülü hattan sinyal kurtarma</p>
      <table class="data" style="width:auto"><tr><th>Ad Soyad</th><td class="l">${S.st.name || ''}</td><th>No</th><td class="l">${S.st.no || ''}</td><th>Grup</th><td class="l">${S.st.group || ''}</td><th>Tarih</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Özet</h3>
      <p>Tamamlanan föy adımı: <b>${sOk}/${sTot}</b> · Doğru yanıt: <b>${ok}/${tot}</b> · Puan: <b>${Math.round((50 * sOk) / sTot + (50 * ok) / tot)}/100</b></p>
      <h3>Yanıtlar</h3>
      <table class="data"><thead><tr><th>Bölüm</th><th>Soru</th><th>Yanıt</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Deney 1 · Toplayan yükselteç</h3>${T('#d1tab')}
      <h3>Deney 2 · Fark yükselteci</h3>${T('#d2tab')}
      <h3>Deney 3 · Direnç uyumsuzluğu ve CMRR</h3>${T('#d3tab')}
      <h3>Deney 4 · Gürültülü hat</h3>${T('#d4tab')}
      <h3>Grafikler ve osiloskop görüntüleri</h3>
      <div>${img(D1.sc.el)} ${img(D4.sc.el)}</div><div>${img(D3.plotCanvas)}</div>
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
    if (e.key === 'r' || e.key === 'R') { const d = { d1: D1, d2: D2, d3: D3, d4: D4 }[S.page]; if (d) d.rec(); }
  });

  function loop() {
    if (S.page === 'd1') { D1.update(); evalSteps('d1'); }
    if (S.page === 'd2') { D2.update(); evalSteps('d2'); }
    if (S.page === 'd3') { D3.update(); evalSteps('d3'); }
    if (S.page === 'd4') { D4.update(); evalSteps('d4'); }
    requestAnimationFrame(loop);
  }
  D1.update(); D2.update(); D3.update(); D4.update();
  ['d1', 'd2', 'd3', 'd4'].forEach(evalSteps);
  go(S.page); progress(); loop();
})();

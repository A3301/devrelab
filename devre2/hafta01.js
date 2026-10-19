/* Devre Kuramı II · Hafta 1 — Sinüs kaynaklar, faz farkı, fazör, RL sinüsoidal tepki */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd2h01';
  const S = Object.assign({ answers: {}, steps: {}, st: {}, page: 'giris', d1rows: [], d2rows: [], d3rows: [], d4rows: [], fl: {} }, Lab.store.load(KEY));
  if (S.fcal == null) S.fcal = (Math.random() - 0.5) * 0.012; // üreteç frekans kalibrasyon hatası (±%0,6)
  if (S.tau == null) S.tau = (90 + Math.random() * 180) * 1e-6; // kara kutu RC zaman sabiti (90–270 µs)
  if (S.gbox == null) S.gbox = 0.85 + Math.random() * 0.1; // kara kutu ek zayıflatma
  Lab.answers = S.answers;
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => Lab.store.save(KEY, S), 300); };
  Lab.onAnswer = () => { save(); progress(); };
  const near = (a, b, t) => Math.abs(a - b) <= t;
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const wrap180 = (d) => { d = ((d + 180) % 360 + 360) % 360 - 180; return d; };

  /* ---------- kompleks yardımcılar ---------- */
  const C = {
    pol: (m, deg) => [m * Math.cos(deg * D2R), m * Math.sin(deg * D2R)],
    add: (a, b) => [a[0] + b[0], a[1] + b[1]],
    mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]],
    div: (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; },
    abs: (a) => Math.hypot(a[0], a[1]),
    ang: (a) => Math.atan2(a[1], a[0]) * R2D,
  };

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
  function segBtn(parent, txt, on) { const b = document.createElement('button'); b.className = 'seg-btn' + (on ? ' on' : ''); b.innerHTML = txt; parent.appendChild(b); return b; }
  function segGroup(parent, items, cur, onSel) { // items: [[value, label]]
    const bs = items.map(([v, l]) => { const b = segBtn(parent, l, v === cur); b.onclick = () => { bs.forEach((x) => x.classList.remove('on')); b.classList.add('on'); onSel(v); }; return b; });
    return (v) => bs.forEach((b, i) => b.classList.toggle('on', items[i][0] === v));
  }

  /* ---------- şema yardımcıları ---------- */
  const sch = {
    w: (g, pts) => E('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'w' }, g),
    dot: (g, x, y) => E('circle', { cx: x, cy: y, r: 3.5, class: 'node' }, g),
    t: (g, x, y, s, cls = 'lbl', anchor = 'middle') => { const e = E('text', { x, y, class: cls, 'text-anchor': anchor }, g); e.innerHTML = s; return e; },
    rH(g, x1, x2, y) { const n = 6, L = 8, step = (x2 - x1 - 2 * L) / n; let d = `M${x1},${y} h${L}`; for (let i = 0; i < n; i++) d += ` l${step / 2},${i % 2 ? 7 : -7} l${step / 2},${i % 2 ? -7 : 7}`; d += ` L${x2},${y}`; E('path', { d, class: 'w' }, g); },
    rV(g, x, y1, y2) { const n = 6, L = 8, step = (y2 - y1 - 2 * L) / n; let d = `M${x},${y1} v${L}`; for (let i = 0; i < n; i++) d += ` l${i % 2 ? 7 : -7},${step / 2} l${i % 2 ? -7 : 7},${step / 2}`; d += ` L${x},${y2}`; E('path', { d, class: 'w' }, g); },
    lH(g, x1, x2, y) { const n = 4, w = (x2 - x1 - 16) / n; let d = `M${x1},${y} h8`; for (let i = 0; i < n; i++) d += ` a${w / 2},${w / 2} 0 0 1 ${w},0`; d += ` L${x2},${y}`; E('path', { d, class: 'w' }, g); },
    lV(g, x, y1, y2) { const n = 4, h = (y2 - y1 - 16) / n; let d = `M${x},${y1} v8`; for (let i = 0; i < n; i++) d += ` a${h / 2},${h / 2} 0 0 1 0,${h}`; d += ` L${x},${y2}`; E('path', { d, class: 'w' }, g); },
    cV(g, x, y1, y2) { const m = (y1 + y2) / 2; E('path', { d: `M${x},${y1} V${m - 5} M${x - 16},${m - 5} h32 M${x - 16},${m + 5} h32 M${x},${m + 5} V${y2}`, class: 'w' }, g); },
    gnd(g, x, y) { E('path', { d: `M${x},${y} v8 M${x - 11},${y + 8} h22 M${x - 7},${y + 13} h14 M${x - 3},${y + 18} h6`, class: 'w' }, g); },
    src(g, x, y, r = 20) { E('circle', { cx: x, cy: y, r, class: 'w', fill: '#fff' }, g); E('path', { d: `M${x - 10},${y} q5,-12 10,0 t10,0`, class: 'w' }, g); },
    box(g, x, y, w, h, txt) { E('rect', { x, y, width: w, height: h, rx: 6, class: 'w', fill: '#f4f7ff' }, g); sch.t(g, x + w / 2, y + h / 2 + 5, txt); },
    sw(g, x1, x2, y) {
      const b = E('line', { x1, y1: y, x2, y2: y, class: 'w' }, g);
      [x1, x2].forEach((x) => E('circle', { cx: x, cy: y, r: 3.5, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g));
      return (on) => { b.setAttribute('x2', on ? x2 : x2 - 6); b.setAttribute('y2', on ? y : y - 20); b.style.stroke = on ? '#1a8a4a' : '#c62828'; };
    },
    arrow(g, x1, y1, x2, y2, color, w = 3) {
      const a = Math.atan2(y2 - y1, x2 - x1), h = 10;
      E('line', { x1, y1, x2, y2, stroke: color, 'stroke-width': w }, g);
      E('path', { d: `M${x2},${y2} L${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} L${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)} Z`, fill: color }, g);
    },
  };

  /* ---------- osiloskop yardımcısı ---------- */
  const VDIV = [1e-3, 2e-3, 5e-3, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
  const TDIV = [1e-6, 2e-6, 5e-6, 1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2, 2e-2, 5e-2];
  const POS = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  function mkScope(host, o) {
    const w = document.createElement('div'); w.className = 'inst dark scopewrap'; w.style.cssText = 'flex:1;min-width:420px';
    w.innerHTML = `<div class="brand"><span>DSO-2C · Dijital Osiloskop</span><span><span class="led on g"></span> <span class="runst">${o.mode || 'RUN'}</span></span></div>
      <div class="row" style="align-items:flex-start;flex-wrap:nowrap"><canvas width="640" height="400" style="width:100%;max-width:640px"></canvas>
      <div style="min-width:160px"><div class="ctrls"></div><div class="row btns" style="margin:6px 0;gap:4px"></div><div class="meas"></div></div></div>`;
    host.appendChild(w);
    const cv = w.querySelector('canvas'), sc = new Lab.Scope(cv), sk = w.querySelector('.ctrls'), bt = w.querySelector('.btns'), me = w.querySelector('.meas');
    const self = { sc, cv, dirty: true, bt, runEl: w.querySelector('.runst') };
    const set = () => { self.dirty = true; };
    sc.ch[0].vdiv = o.v1; sc.ch[1].vdiv = o.v2; sc.tdiv = o.t; sc.ch[0].pos = o.p1 || 0; sc.ch[1].pos = o.p2 || 0;
    self.k1 = new Lab.Knob(sk, { label: 'CH1 V/d', list: VDIV, value: o.v1, dark: true, size: 40, fmt: (v) => eng(v, 'V'), onChange: (v) => { sc.ch[0].vdiv = v; set(); } });
    self.k2 = new Lab.Knob(sk, { label: o.l2 || 'CH2 V/d', list: VDIV, value: o.v2, dark: true, size: 40, fmt: (v) => eng(v, o.u2 || 'V'), onChange: (v) => { sc.ch[1].vdiv = v; set(); } });
    self.kt = new Lab.Knob(sk, { label: 'ZAMAN/d', list: TDIV, value: o.t, dark: true, size: 40, fmt: (v) => eng(v, 's'), onChange: (v) => { sc.tdiv = v; set(); } });
    self.kp1 = new Lab.Knob(sk, { label: 'CH1 konum', list: POS, value: o.p1 || 0, dark: true, size: 34, fmt: (v) => num(v, 0) + ' d', onChange: (v) => { sc.ch[0].pos = v; set(); } });
    self.kp2 = new Lab.Knob(sk, { label: 'CH2 konum', list: POS, value: o.p2 || 0, dark: true, size: 34, fmt: (v) => num(v, 0) + ' d', onChange: (v) => { sc.ch[1].pos = v; set(); } });
    const b1 = segBtn(bt, 'CH1', true), b2 = segBtn(bt, 'CH2', o.ch2 !== false), bc = segBtn(bt, 'İMLEÇ', false);
    sc.ch[1].on = o.ch2 !== false;
    b1.onclick = () => { sc.ch[0].on = !sc.ch[0].on; b1.classList.toggle('on', sc.ch[0].on); set(); };
    b2.onclick = () => { sc.ch[1].on = !sc.ch[1].on; b2.classList.toggle('on', sc.ch[1].on); set(); };
    bc.onclick = () => { sc.cur.on = !sc.cur.on; bc.classList.toggle('on', sc.cur.on); set(); };
    const pre = !!o.pre;
    self.tc = (x) => (x - (pre ? 1 : 0)) * sc.tdiv;
    self.show = () => {
      const m = sc.measure(); if (!m) return; self.m = m;
      const [a, b] = m.ch;
      let h = `<span style="color:#f2d21b">CH1</span> V<sub>pp</sub> ${eng(a.vpp, 'V')}<br>&nbsp;&nbsp;maks ${eng(a.max, 'V')}`;
      if (sc.ch[1].on) h += `<br><span style="color:#27c4f0">CH2</span> V<sub>pp</sub> ${eng(b.vpp, o.u2 || 'V')}<br>&nbsp;&nbsp;maks ${eng(b.max, o.u2 || 'V')}`;
      if (o.freq !== false && isFinite(a.f)) h += `<br>CH1 f ≈ ${eng(a.f, 'Hz', 3)}`;
      if (m.cur) {
        const c = m.cur;
        h += `<br><span style="color:#ff7cf0">İMLEÇ A</span>${pre ? ' t ' + eng(self.tc(sc.cur.a), 's') : ''}<br>&nbsp;CH1 ${eng(c.v1a, 'V')} · CH2 ${eng(c.v2a, o.u2 || 'V')}` +
          `<br><span style="color:#ff7cf0">İMLEÇ B</span>${pre ? ' t ' + eng(self.tc(sc.cur.b), 's') : ''}<br>&nbsp;CH1 ${eng(c.v1b, 'V')} · CH2 ${eng(c.v2b, o.u2 || 'V')}<br>Δt = t<sub>B</sub>−t<sub>A</sub> ${eng(c.dt, 's')}<br>1/Δt ${eng(1 / Math.abs(c.dt), 'Hz')}`;
      }
      if (o.extra) h += o.extra(m);
      me.innerHTML = h;
    };
    cv.addEventListener('pointermove', () => sc.cur.drag && self.show());
    cv.addEventListener('pointerdown', () => setTimeout(self.show, 0));
    self.draw = (data) => { sc.draw(data); self.show(); };
    return self;
  }
  // Örnekleme: fns = [f1(t), f2(t)], t0 = ekranın sol kenarındaki zaman
  const noise = () => (Math.random() + Math.random() - 1) * 0.5;
  function trace(tdiv, fns, t0 = 0, nz = [0, 0], n = 1200) {
    const y = [new Float64Array(n), new Float64Array(n)];
    for (let k = 0; k < n; k++) { const t = t0 + (k / (n - 1)) * 10 * tdiv; for (let c = 0; c < 2; c++) y[c][k] = fns[c](t) + nz[c] * noise(); }
    return { n, y };
  }
  // tetik: kosinüs referansının yükselen sıfır geçişi ekranın 1. bölmesinde
  const trigT0 = (w, ph, tdiv) => { const T = 2 * Math.PI / w; let t = (-Math.PI / 2 - ph) / w; t = ((t % T) + T) % T; return t - tdiv; };

  /* ================= GEZİNME / İLERLEME ================= */
  const pages = ['giris', 'onbilgi', 'onhaz', 'd1', 'd2', 'd3', 'd4', 'rapor'];
  const XP = {};
  function go(p) {
    S.page = p; save();
    $$('section.page').forEach((s) => s.classList.toggle('active', s.id === p));
    $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.p === p));
    if (XP[p]) XP[p].sc.dirty = true;
    if (p === 'rapor') buildReport();
    window.scrollTo(0, 0);
  }
  $$('#nav button').forEach((b) => (b.onclick = () => go(b.dataset.p)));

  const stepDefs = {};
  function steps(key, list) { stepDefs[key] = list; $('#' + key + 'steps').innerHTML = list.map((s) => `<li>${s.t}</li>`).join(''); }
  function evalSteps(key) {
    if (!stepDefs[key]) return;
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

  /* ================= ÖN BİLGİ · dönen fazör animasyonu ================= */
  const PH = (() => {
    const cv = $('#phAnim'), g = cv.getContext('2d'), W = cv.width, H = cv.height;
    const cx = W / 2, cy = 120, R = 95, top = 240, bot = H - 10;
    let run = true, ang = 0, last = 0;
    const hist = []; // [v1, v2, toplam] örnekleri (yeni olan başta)
    const A = () => +$('#phA').value, P = () => +$('#phP').value, B = () => $('#phB').checked, BP = () => +$('#phBP').value;
    const lbl = () => { $('#phAv').textContent = num(A(), 2); $('#phPv').textContent = (P() > 0 ? '+' : '') + P() + '°'; $('#phBv').textContent = (BP() > 0 ? '+' : '') + BP() + '°'; };
    ['phA', 'phP', 'phB', 'phBP'].forEach((id) => $('#' + id).addEventListener('input', () => { hist.length = 0; lbl(); S.fl.phAnim = true; save(); }));
    $('#phRun').onclick = () => { run = !run; $('#phRun').textContent = run ? 'Durdur' : 'Sürdür'; };
    lbl();
    function arrow(x1, y1, x2, y2, c, w = 3) {
      const a = Math.atan2(y2 - y1, x2 - x1); g.strokeStyle = g.fillStyle = c; g.lineWidth = w;
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
      g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - 11 * Math.cos(a - 0.4), y2 - 11 * Math.sin(a - 0.4)); g.lineTo(x2 - 11 * Math.cos(a + 0.4), y2 - 11 * Math.sin(a + 0.4)); g.fill();
    }
    function frame(ts) {
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
      if (run) ang += dt * 2 * Math.PI * 0.25;
      const a1 = ang + P() * D2R, a2 = ang + BP() * D2R;
      const p1 = [A() * Math.cos(a1), A() * Math.sin(a1)], p2 = B() ? [0.6 * Math.cos(a2), 0.6 * Math.sin(a2)] : [0, 0];
      const ps = [p1[0] + p2[0], p1[1] + p2[1]];
      if (run) { hist.unshift([p1[0], p2[0], ps[0]]); if (hist.length > 420) hist.pop(); }
      g.fillStyle = '#0e1726'; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(cx - R * 1.7, cy); g.lineTo(cx + R * 1.7, cy); g.moveTo(cx, cy - R * 1.15); g.lineTo(cx, cy + R * 1.15); g.stroke();
      g.beginPath(); g.arc(cx, cy, R * A(), 0, 7); g.stroke();
      g.fillStyle = '#9fb3d1'; g.font = '12px Segoe UI'; g.fillText('Re', cx + R * 1.6, cy - 6); g.fillText('Im', cx + 6, cy - R * 1.05);
      const X = (v) => cx + v * R, Y = (v) => cy - v * R;
      arrow(cx, cy, X(p1[0]), Y(p1[1]), '#f2d21b');
      if (B()) { arrow(X(p1[0]), Y(p1[1]), X(ps[0]), Y(ps[1]), '#27c4f0'); arrow(cx, cy, X(p2[0]), Y(p2[1]), 'rgba(39,196,240,.45)', 2); arrow(cx, cy, X(ps[0]), Y(ps[1]), '#ffffff'); }
      // gölge: gerçel eksene iz düşüm
      const sh = B() ? ps : p1;
      g.setLineDash([4, 4]); g.strokeStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.moveTo(X(sh[0]), Y(sh[1])); g.lineTo(X(sh[0]), top); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#ff7cf0'; g.beginPath(); g.arc(X(sh[0]), cy, 5, 0, 7); g.fill();
      // zaman ekseni (aşağı doğru)
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.strokeRect(cx - R * 1.6, top, R * 3.2, bot - top);
      g.beginPath(); g.moveTo(cx, top); g.lineTo(cx, bot); g.stroke();
      g.fillStyle = '#9fb3d1'; g.fillText('t ↓', cx - R * 1.55, bot - 6); g.fillText('v(t) = gölge', cx + R * 0.6, top + 14);
      const tr = (k, c, w) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); hist.forEach((h, i) => { const y = top + i * ((bot - top) / 420), x = X(h[k]); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); };
      if (B()) { tr(0, 'rgba(242,210,27,.6)', 1.5); tr(1, 'rgba(39,196,240,.6)', 1.5); tr(2, '#ffffff', 2.5); } else tr(0, '#f2d21b', 2.5);
      g.fillStyle = '#dfe3ea'; g.font = '13px Consolas';
      g.fillText('ωt = ' + num(((ang * R2D) % 360), 0) + '°', 10, 18);
      if (S.page === 'onbilgi') requestAnimationFrame(frame); else { last = 0; loopOn = false; }
    }
    let loopOn = false;
    return { start() { if (!loopOn) { loopOn = true; requestAnimationFrame(frame); } } };
  })();

  /* ================= ÖN HAZIRLIK ================= */
  numq('onhaz', '#preQ', { id: 'p1', q: '1) Örnek 1.2: v(t) = 40cos(1000πt − 60°) V. Periyot T kaç ms’dir?', answer: 2, tol: 1, unit: 'ms', explain: 'ω = 1000π ⇒ f = 500 Hz ⇒ T = 2 ms.', hint: 'f = ω/2π, T = 1/f' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) Aynı gerilimde ilk pozitif tepe hangi anda (ms) oluşur?', answer: 1 / 3, tol: 2, unit: 'ms', explain: '1000πt − π/3 = 0 ⇒ t = 1/3000 s = 0,333 ms. φ &lt; 0 olduğundan tepe t = 0’dan sonra gelir.', hint: 'Argümanı sıfır yapın; derece ile radyanı aynı birime getirin.' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) Örnek 1.3: 220 V rms şebekeye bağlı 100 Ω ısıtıcının ortalama gücü kaç W’tır?', answer: 484, tol: 1, unit: 'W', explain: 'P = V<sub>rms</sub>²/R = 220²/100 = 484 W. Tepe ile: 311,1²/(2·100) = 484 W.', hint: 'Güçte rms kullanılır.' });
  mcq('onhaz', '#preQ', { id: 'p4', q: '4) v<sub>1</sub> = 10cos(ωt + 20°) ve v<sub>2</sub> = 6cos(ωt − 70°). Hangisi, kaç derece ileridedir?', opts: ['v<sub>1</sub>, 90° ileride', 'v<sub>2</sub>, 90° ileride', 'v<sub>1</sub>, 50° ileride', 'Aynı fazdalar'], correct: 0, explain: 'Δφ = 20° − (−70°) = +90°: v<sub>1</sub> tepesine önce ulaşır. Genlikler cevabı değiştirmez.', hint: 'Faz farkı φ<sub>1</sub> − φ<sub>2</sub>; genliğe bakmayın.' });
  numq('onhaz', '#preQ', { id: 'p5', q: '5) Örnek 1.4: v = 10sin(ωt + 30°), i = 4cos(ωt − 20°), f = 50 Hz. Faz farkının zaman karşılığı kaç ms’dir?', answer: 20 * 40 / 360, tol: 2, unit: 'ms', explain: 'v = 10cos(ωt − 60°); fark 40° (i ileride). Δt = (40/360)·20 ms = 2,22 ms.', hint: 'Önce sin’i cos’a çevirin (−90°).' });
  numq('onhaz', '#preQ', { id: 'p6', q: '6) Örnek 1.5: v<sub>s</sub> = 100cos400t V, R = 30 Ω, L = 100 mH. Kararlı hâl akım genliği I<sub>m</sub> kaç A’dır?', answer: 2, tol: 1, unit: 'A', explain: 'ωL = 40 Ω, |Z| = √(30² + 40²) = 50 Ω, I<sub>m</sub> = 100/50 = 2 A, θ = 53,13°.', hint: 'Bobini kısa devre saymayın: V<sub>m</sub>/√(R² + ω²L²).' });

  /* ================= DENEY 1 · Sinüs, rms ================= */
  const FLIST = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 1e4, 2e4, 5e4, 1e5];
  const WAVES = { sin: 'Sinüs', tri: 'Üçgen', sq: 'Kare' };
  const wave = (k, x) => { // x: faz (rad), tepe 1
    if (k === 'sin') return Math.cos(x);
    const u = ((x / (2 * Math.PI)) % 1 + 1) % 1; // 0..1, u=0 tepe
    if (k === 'tri') return u < 0.5 ? 1 - 4 * u : -3 + 4 * u;
    return u < 0.25 || u >= 0.75 ? 1 : -1;
  };
  const RMSF = { sin: Math.SQRT1_2, tri: 1 / Math.sqrt(3), sq: 1 };
  const AVGF = { sin: 2 / Math.PI, tri: 0.5, sq: 1 };
  const D1 = (() => {
    const box = $('#d1inst');
    const fg = inst(box, 'FG-2 · FONKSİYON ÜRETECİ', true, '50 Ω');
    const setW = segGroup(fg.c, Object.entries(WAVES), S.d1w || 'sin', (v) => { S.d1w = v; save(); sc.dirty = true; });
    const kF = new Lab.Knob(fg.c, { label: 'FREKANS', list: FLIST, value: S.d1f ?? 1000, dark: true, fmt: (v) => eng(v, 'Hz'), onChange: (v) => { S.d1f = v; save(); sc.dirty = true; } });
    const kA = new Lab.Knob(fg.c, { label: 'GENLİK V<sub>pp</sub>', min: 0, max: 20, step: 0.1, value: S.d1a ?? 4, dark: true, fmt: (v) => num(v, 1) + ' Vpp', onChange: (v) => { S.d1a = v; save(); sc.dirty = true; } });
    kA.el.querySelector('.kl').innerHTML = 'GENLİK (V<sub>pp</sub>)';
    const tm = inst(box, 'TRUE-RMS AC VOLTMETRE', false); const tL = lcd(tm.el, 'V<sub>rms</sub> · 10 Hz–100 kHz', 'V', 140);
    const cm = inst(box, 'UCUZ MULTİMETRE · V~', false); const cL = lcd(cm.el, 'ortalama × 1,111', 'V', 140);
    const sc = mkScope($('#d1scopeHost'), { v1: 1, v2: 1, t: 2e-4, ch2: false });
    const P = () => ({ w: S.d1w || 'sin', f: kF.value, vpp: kA.value });
    const fTrue = (f) => f * (1 + S.fcal);
    const meters = (p) => {
      const vp = p.vpp / 2, ft = fTrue(p.f);
      const tr = vp * RMSF[p.w] / Math.sqrt(1 + Math.pow(ft / 3e5, 4));
      const bw = 1 / Math.sqrt(1 + Math.pow(ft / 4000, 4)); // ucuz aletin bant genişliği ~4 kHz (1 kHz’e kadar düz)
      const ch = vp * AVGF[p.w] * 1.1107 * (p.w === 'sin' ? bw : Math.pow(bw, 1.6));
      return { tr, ch };
    };
    // şema
    const g = $('#d1sch');
    sch.src(g, 70, 85); sch.t(g, 70, 135, 'FG (50 Ω)'); sch.rH(g, 90, 160, 50); sch.w(g, [[70, 65], [70, 50], [90, 50]]); sch.t(g, 125, 35, 'R<sub>s</sub>=50 Ω');
    sch.w(g, [[160, 50], [700, 50]]); sch.w(g, [[70, 105], [70, 140], [700, 140]]); sch.gnd(g, 380, 140);
    [[300, 'OSİLOSKOP CH1 (1 MΩ)'], [470, 'TRUE-RMS'], [640, 'UCUZ DMM']].forEach(([x, t]) => { sch.dot(g, x, 50); sch.dot(g, x, 140); sch.box(g, x - 60, 72, 120, 44, ''); sch.t(g, x, 98, t); sch.w(g, [[x, 50], [x, 72]]); sch.w(g, [[x, 116], [x, 140]]); });
    const tS = sch.t(g, 300, 30, '', 'val');
    function update() {
      const p = P(), m = meters(p);
      tL(num(m.tr, 3)); cL(num(m.ch, 3));
      tS.textContent = WAVES[p.w] + ', ' + eng(p.f, 'Hz') + ', ' + num(p.vpp, 1) + ' Vpp';
      if (!sc.dirty) return; sc.dirty = false;
      const w = 2 * Math.PI * fTrue(p.f), vp = p.vpp / 2, t0 = trigT0(w, 0, sc.sc.tdiv);
      sc.draw(trace(sc.sc.tdiv, [(t) => vp * wave(p.w, w * t), () => 0], t0, [vp * 0.006, 0]));
    }
    const tbody = $('#d1tab tbody');
    function table() { tbody.innerHTML = S.d1rows.map((r, i) => `<tr><td>${i + 1}</td><td>${WAVES[r.w]}</td><td>${eng(r.f, 'Hz')}</td><td>${num(r.vpp, 2)}</td><td>${r.dt == null ? '—' : eng(r.dt, 's')}</td><td>${num(r.tr, 3)}</td><td>${num(r.ch, 3)}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; }
    function rec() {
      const m = sc.m; if (!m) return; const p = P(), mt = meters(p);
      const dt = m.cur ? Math.abs(m.cur.dt) : null;
      S.d1rows.push({ ...p, vpp: m.ch[0].vpp, set: p.vpp, dt, tr: mt.tr, ch: mt.ch }); save(); table();
      Lab.toast('Kaydedildi: V<sub>pp</sub> = ' + num(m.ch[0].vpp, 2) + ' V' + (dt ? ', Δt = ' + eng(dt, 's') : ''));
    }
    $('#d1rec').onclick = rec; $('#d1del').onclick = () => { S.d1rows.pop(); save(); table(); };
    $('#d1csv').onclick = () => Lab.downloadCSV('d2_hafta01_deney1.csv', ['#', 'dalga', 'f ayar (Hz)', 'Vpp (V)', 'dt (s)', 'true rms (V)', 'ucuz DMM (V)'], S.d1rows.map((r, i) => [i + 1, r.w, r.f, +r.vpp.toFixed(3), r.dt == null ? '' : +r.dt.toExponential(4), +r.tr.toFixed(4), +r.ch.toFixed(4)]));
    table();
    return { sc, update, rec, P, fTrue };
  })();
  XP.d1 = D1;
  const T500 = 1 / D1.fTrue(500);
  steps('d1', [
    { t: 'Üreteci <b>sinüs, 500 Hz, 8 V<sub>pp</sub></b> konumuna getirin (Örnek 1.2’nin frekansı). ZAMAN/d’yi en az iki periyot görünecek biçimde seçin.', test: () => { const p = D1.P(); return p.w === 'sin' && p.f === 500 && near(p.vpp, 8, 0.05) && D1.sc.sc.tdiv >= 4e-4 && D1.sc.sc.tdiv <= 1e-3; } },
    { t: 'İMLEÇ A ve B’yi iki ardışık tepeye koyup <b>kaydedin</b> (Δt = T).', test: () => S.d1rows.some((r) => r.w === 'sin' && r.f === 500 && r.dt && near(r.dt, T500, 0.015 * T500)) },
    { t: 'Örnek 1.3’ün ölçeklenmiş hâli: <b>17 V<sub>pp</sub></b> sinüs ayarlayıp kaydedin. Voltmetre okuması V<sub>m</sub>/√2 ile uyuşuyor mu?', test: () => S.d1rows.some((r) => r.w === 'sin' && near(r.set, 17, 0.05) && r.f <= 1000) },
    { t: 'Aynı genlikte <b>üçgen</b> ve <b>kare</b> dalga için de birer ölçüm kaydedin (f ≤ 1 kHz).', test: () => ['tri', 'sq'].every((w) => S.d1rows.some((r) => r.w === w && r.f <= 1000)) },
    { t: 'Sinüste frekansı <b>10 kHz veya üstüne</b> çıkarıp kaydedin: iki voltmetre hâlâ aynı mı okuyor?', test: () => S.d1rows.some((r) => r.w === 'sin' && r.f >= 1e4) },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: '500 Hz ayarında ölçtüğünüz periyottan üretecin <b>gerçek</b> frekansı kaç Hz’dir?', answer: () => D1.fTrue(500), tol: 1, unit: 'Hz', explain: 'f = 1/T. Üreteç kadranı ile gerçek frekans arasındaki küçük fark kalibrasyon hatasıdır; frekans her zaman ölçülerek doğrulanır.', hint: 'Tabloda 500 Hz satırındaki Δt’nin tersini alın.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'Sinüste true-rms okumasının tepe değere oranı V<sub>rms</sub>/V<sub>m</sub> kaçtır? (ölçümünüzden)', answer: Math.SQRT1_2, tol: 1.5, unit: '', explain: 'V<sub>rms</sub> = V<sub>m</sub>/√2 = 0,707 V<sub>m</sub>.', hint: 'V<sub>m</sub> = V<sub>pp</sub>/2.' });
  numq('d1', '#d1Q', { id: 'd1q3', q: 'Üçgen dalgada V<sub>rms</sub>/V<sub>p</sub> oranını ölçümünüzden bulun.', answer: 1 / Math.sqrt(3), tol: 1.5, unit: '', explain: 'Örnek 1.1: I<sub>rms</sub> = I<sub>p</sub>/√3 = 0,577 I<sub>p</sub>. Üçgen dalga sinüsten daha az “dolu” olduğu için oran küçüktür.', hint: 'True-rms okumasını V<sub>pp</sub>/2’ye bölün.' });
  numq('d1', '#d1Q', { id: 'd1q4', q: 'Kare dalgada ucuz multimetre gerçek rms değerden yüzde kaç <b>fazla</b> okudu?', answer: (1.1107 - 1) * 100, tol: 6, unit: '%', explain: 'Kare dalganın ortalaması da tepe değeridir; alet bunu sinüs katsayısı 1,111 ile çarpar ⇒ %11 fazla okur.', hint: '(DMM − true rms)/true rms × 100' });
  mcq('d1', '#d1Q', { id: 'd1q5', q: '10 kHz sinüste ucuz multimetrenin düşük okumasının nedeni nedir?', opts: ['Sinüsün rms değeri frekansla azalır', 'Aletin bant genişliği sınırlıdır; yüksek frekansta duyarlılığı düşer', 'Üretecin genliği frekansla azalır', 'Osiloskop yüklemesi'], correct: 1, explain: 'Osiloskop V<sub>pp</sub>’yi ve true-rms voltmetre değeri değişmedi; yalnız ucuz alet düştü. Ölçü aletinin frekans aralığı her zaman kontrol edilmelidir.', hint: 'Diğer iki aletin okumasına bakın.' });

  /* ================= DENEY 2 · Faz farkı ================= */
  const D2 = (() => {
    const box = $('#d2inst');
    const sel = inst(box, 'KAYNAK SEÇİMİ', false);
    const setSrc = segGroup(sel.c, [['gen', 'İki kanallı üreteç'], ['box', 'Kara kutu X']], S.d2src || 'gen', (v) => { S.d2src = v; save(); sc.dirty = true; });
    const fg = inst(box, 'FG-2 · ÇİFT KANAL', true, 'ortak f');
    const kF = new Lab.Knob(fg.c, { label: 'FREKANS', min: 10, max: 2e4, log: true, value: S.d2f ?? 50, dark: true, fmt: (v) => eng(v, 'Hz', 4), onChange: (v) => { S.d2f = v; save(); sc.dirty = true; } });
    const mk = (ch, def) => {
      const d = document.createElement('div'); d.style.cssText = 'display:flex;flex-direction:column;gap:4px;align-items:center'; fg.c.appendChild(d);
      const lab = document.createElement('div'); lab.style.cssText = 'font-size:11px;color:#cfd6e2'; lab.textContent = 'ÇIKIŞ ' + ch; d.appendChild(lab);
      const row = document.createElement('div'); d.appendChild(row);
      const k = 'd2' + ch;
      S[k] = Object.assign({ fn: def.fn, a: def.a, p: def.p }, S[k] || {});
      segGroup(row, [['cos', 'cos'], ['sin', 'sin']], S[k].fn, (v) => { S[k].fn = v; save(); sc.dirty = true; });
      const ka = new Lab.Knob(d, { label: 'V<sub>m</sub>', min: 0, max: 10, step: 0.1, value: S[k].a, dark: true, size: 44, fmt: (v) => num(v, 1) + ' V', onChange: (v) => { S[k].a = v; save(); sc.dirty = true; } });
      ka.el.querySelector('.kl').innerHTML = 'V<sub>m</sub>';
      const kp = new Lab.Knob(d, { label: 'φ', min: -180, max: 180, step: 1, value: S[k].p, dark: true, size: 44, fmt: (v) => num(v, 0) + '°', onChange: (v) => { S[k].p = v; save(); sc.dirty = true; } });
      return { get: () => S[k] };
    };
    const cA = mk('A', { fn: 'cos', a: 5, p: 0 }), cB = mk('B', { fn: 'cos', a: 5, p: 0 });
    const sc = mkScope($('#d2scopeHost'), { v1: 2, v2: 2, t: 2e-3 });
    const bxy = segBtn(sc.bt, 'X-Y', !!S.d2xy);
    bxy.onclick = () => { S.d2xy = !S.d2xy; bxy.classList.toggle('on', S.d2xy); save(); sc.dirty = true; };
    // sinyaller: [genlik, kosinüs fazı (der)]
    const cosPh = (c) => c.p - (c.fn === 'sin' ? 90 : 0);
    const boxH = (f) => { const H = C.div([S.gbox, 0], [1, 2 * Math.PI * f * S.tau]); return [C.abs(H), C.ang(H)]; };
    const P = () => ({ src: S.d2src || 'gen', f: kF.value, A: { ...cA.get() }, B: { ...cB.get() } });
    function sig(p) {
      const a = p.A, ph1 = cosPh(a);
      if (p.src === 'gen') return [[a.a, ph1], [p.B.a, cosPh(p.B)]];
      const [m, d] = boxH(p.f); return [[a.a, ph1], [a.a * m, ph1 + d]];
    }
    // şema
    const g = $('#d2sch');
    sch.src(g, 80, 100); sch.t(g, 80, 150, 'FG çıkış A');
    sch.w(g, [[80, 80], [80, 50], [700, 50]]); sch.w(g, [[80, 120], [80, 160], [700, 160]]); sch.gnd(g, 390, 160);
    const gBox = E('g', {}, g), gGen = E('g', {}, g);
    sch.box(gBox, 330, 70, 120, 60, 'Kara kutu X'); sch.w(gBox, [[300, 50], [300, 100], [330, 100]]); sch.w(gBox, [[450, 100], [560, 100]]); sch.w(gBox, [[390, 130], [390, 160]]);
    sch.src(gGen, 560, 120); sch.t(gGen, 500, 125, 'FG çıkış B', 'lbl', 'end'); sch.w(gGen, [[560, 100], [560, 100]]); sch.w(gGen, [[560, 140], [560, 160]]);
    sch.t(g, 300, 40, 'CH1', 'lbl'); sch.dot(g, 300, 50); sch.box(g, 600, 75, 110, 50, ''); sch.t(g, 655, 97, 'CH1 ← A'); sch.t(g, 655, 115, 'CH2 ←');
    sch.w(g, [[560, 100], [600, 100]]); sch.dot(g, 560, 100);
    const tSig = sch.t(g, 380, 190, '', 'val');
    // X-Y ekranı
    const xy = $('#d2xy'), xg = xy.getContext('2d'), yc = $('#d2ycur');
    yc.value = S.d2yc ?? 1;
    yc.oninput = () => { S.d2yc = +yc.value; save(); drawXY(); };
    let cur = null;
    function drawXY() {
      const W = xy.width, H = xy.height, dx = W / 10, dy = H / 8;
      xg.fillStyle = '#06140c'; xg.fillRect(0, 0, W, H);
      xg.strokeStyle = 'rgba(120,200,140,.18)'; xg.lineWidth = 1;
      for (let i = 1; i < 10; i++) { xg.beginPath(); xg.moveTo(i * dx, 0); xg.lineTo(i * dx, H); xg.stroke(); }
      for (let i = 1; i < 8; i++) { xg.beginPath(); xg.moveTo(0, i * dy); xg.lineTo(W, i * dy); xg.stroke(); }
      xg.strokeStyle = 'rgba(120,200,140,.45)'; xg.beginPath(); xg.moveTo(W / 2, 0); xg.lineTo(W / 2, H); xg.moveTo(0, H / 2); xg.lineTo(W, H / 2); xg.stroke();
      const v1 = sc.sc.ch[0].vdiv, v2 = sc.sc.ch[1].vdiv;
      const ycv = (+yc.value) * v2;
      $('#d2ycurv').textContent = num(+yc.value, 2) + ' d = ' + eng(ycv, 'V');
      if (!S.d2xy || !cur) { xg.fillStyle = '#9fe0b0'; xg.font = '13px Consolas'; xg.fillText(S.d2xy ? '' : 'X-Y kapalı (osiloskopta X-Y düğmesi)', 14, 22); if (!S.d2xy) return; }
      const [[a1, p1], [a2, p2]] = cur;
      xg.strokeStyle = '#7ef09a'; xg.lineWidth = 2; xg.shadowColor = '#7ef09a'; xg.shadowBlur = 6; xg.beginPath();
      for (let k = 0; k <= 400; k++) {
        const th = (k / 400) * 2 * Math.PI, x = a1 * Math.cos(th + p1 * D2R) + 0.004 * a1 * noise(), y = a2 * Math.cos(th + p2 * D2R) + 0.004 * a2 * noise();
        const X = W / 2 + (x / v1) * dx, Y = H / 2 - (y / v2) * dy; k ? xg.lineTo(clamp(X, -2, W + 2), clamp(Y, -2, H + 2)) : xg.moveTo(X, Y);
      }
      xg.stroke(); xg.shadowBlur = 0;
      xg.strokeStyle = '#ff7cf0'; xg.setLineDash([5, 4]); const Yc = H / 2 - (+yc.value) * dy; xg.beginPath(); xg.moveTo(0, Yc); xg.lineTo(W, Yc); xg.stroke(); xg.setLineDash([]);
      xg.fillStyle = '#9fe0b0'; xg.font = '12px Consolas'; xg.fillText(`X ${eng(v1, 'V')}/d  Y ${eng(v2, 'V')}/d   Y imleci ${eng(ycv, 'V')}`, 8, H - 8);
    }
    function update() {
      const p = P();
      gBox.style.display = p.src === 'box' ? '' : 'none'; gGen.style.display = p.src === 'gen' ? '' : 'none';
      tSig.textContent = p.src === 'gen' ? `A: ${num(p.A.a, 1)} ${p.A.fn}(ωt${p.A.p >= 0 ? '+' : '−'}${Math.abs(p.A.p)}°)  ·  B: ${num(p.B.a, 1)} ${p.B.fn}(ωt${p.B.p >= 0 ? '+' : '−'}${Math.abs(p.B.p)}°)  ·  f = ${eng(p.f, 'Hz', 4)}` : `Kara kutu girişi: ${num(p.A.a, 1)} ${p.A.fn}(ωt${p.A.p >= 0 ? '+' : '−'}${Math.abs(p.A.p)}°) · f = ${eng(p.f, 'Hz', 4)}`;
      if (!sc.dirty) return; sc.dirty = false;
      cur = sig(p);
      const w = 2 * Math.PI * p.f, [[a1, p1], [a2, p2]] = cur;
      const t0 = trigT0(w, p1 * D2R, sc.sc.tdiv);
      sc.draw(trace(sc.sc.tdiv, [(t) => a1 * Math.cos(w * t + p1 * D2R), (t) => a2 * Math.cos(w * t + p2 * D2R)], t0, [a1 * 0.005, a2 * 0.005]));
      drawXY();
    }
    const tbody = $('#d2tab tbody');
    function table() { tbody.innerHTML = S.d2rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.src === 'gen' ? 'Üreteç' : 'Kutu X'}</td><td>${eng(r.f, 'Hz', 4)}</td><td>${r.dt == null ? '—' : eng(r.dt, 's')}</td><td>${r.xy ? eng(r.yc, 'V') : '—'}</td><td>${num(r.y2m, 3)}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; }
    function rec() {
      const m = sc.m; if (!m) return; const p = P();
      if (!m.cur && !S.d2xy) return Lab.toast('Δt için İMLEÇ’i açın ya da Lissajous için X-Y modunu açıp Y imlecini kesime getirin.');
      S.d2rows.push({ src: p.src, f: p.f, A: p.A, B: p.B, dt: m.cur ? m.cur.dt : null, xy: !!S.d2xy, yc: (+yc.value) * sc.sc.ch[1].vdiv, y2m: m.ch[1].max }); save(); table();
      Lab.toast('Kaydedildi' + (m.cur ? ': Δt = ' + eng(m.cur.dt, 's') : '') + (S.d2xy ? ' · Y imleci ' + eng((+yc.value) * sc.sc.ch[1].vdiv, 'V') : ''));
    }
    $('#d2rec').onclick = rec; $('#d2del').onclick = () => { S.d2rows.pop(); save(); table(); };
    $('#d2csv').onclick = () => Lab.downloadCSV('d2_hafta01_deney2.csv', ['#', 'kaynak', 'f (Hz)', 'dt (s)', 'XY', 'Y imleci (V)', 'CH2 maks (V)'], S.d2rows.map((r, i) => [i + 1, r.src, +r.f.toFixed(3), r.dt == null ? '' : +r.dt.toExponential(4), r.xy ? 1 : 0, +r.yc.toFixed(4), +r.y2m.toFixed(4)]));
    table();
    const isEx = (p) => p.src === 'gen' && near(p.f, 50, 0.5) && p.A.fn === 'sin' && near(p.A.a, 10, 0.05) && p.A.p === 30 && p.B.fn === 'cos' && near(p.B.a, 4, 0.05) && p.B.p === -20;
    const exDt = 0.02 * 40 / 360;
    const boxPh = (f) => boxH(f)[1];
    return { sc, update, rec, P, isEx, exDt, boxPh, boxH, drawXY };
  })();
  XP.d2 = D2;
  const goodXY = (r) => { if (!r.xy) return false; const s = r.src === 'gen' ? Math.abs(Math.sin(40 * D2R)) : Math.abs(Math.sin(D2.boxPh(r.f) * D2R)); return near(Math.abs(r.yc) / r.y2m, s, 0.03); };
  steps('d2', [
    { t: 'Örnek 1.4’ü kurun: f = <b>50 Hz</b>; çıkış A = <b>10 sin(ωt + 30°)</b>, çıkış B = <b>4 cos(ωt − 20°)</b>. (V<sub>m</sub> ve φ düğmelerine çift tıklayıp değer yazabilirsiniz.)', test: () => D2.isEx(D2.P()) },
    { t: 'İMLEÇ A’yı CH1’in, B’yi CH2’nin en yakın aynı yöndeki tepesine koyup <b>kaydedin</b> (Δt).', test: () => S.d2rows.some((r) => r.src === 'gen' && D2.isEx(r) && r.dt != null && near(Math.abs(r.dt), D2.exDt, 0.05 * D2.exDt)) },
    { t: '<b>X-Y</b> modunu açın; Y imlecini elipsin düşey eksenle (x = 0) kesiştiği noktaya getirip kaydedin.', test: () => S.d2rows.some((r) => r.src === 'gen' && D2.isEx(r) && goodXY(r)) },
    { t: '<b>Kara kutu X</b>’e geçin, f = <b>1 kHz</b> (±5 Hz) için Δt’yi ölçüp kaydedin.', test: () => S.d2rows.some((r) => r.src === 'box' && near(r.f, 1000, 5) && r.dt != null && near(Math.abs(r.dt) * 360 * r.f, Math.abs(D2.boxPh(r.f)), 2.5)) },
    { t: 'Aynı frekansta kutunun Lissajous ölçümünü kaydedin.', test: () => S.d2rows.some((r) => r.src === 'box' && near(r.f, 1000, 5) && goodXY(r)) },
    { t: '<b>Tasarım:</b> Kutunun faz kaymasının tam <b>45°</b> olduğu frekansı bulun (Y<sub>0</sub>/Y<sub>m</sub> = ?) ve o frekansta X-Y ölçümü kaydedin.', test: () => S.d2rows.some((r) => r.src === 'box' && near(Math.abs(D2.boxPh(r.f)), 45, 2) && goodXY(r)) },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'Örnek 1.4: Δt ölçümünüzden faz farkı kaç derecedir? (mutlak değer)', answer: 40, tol: 4, unit: '°', explain: 'Δφ = 360°·Δt/T = 360·2,22/20 = 40°.', hint: 'T = 20 ms (50 Hz).' });
  mcq('d2', '#d2Q', { id: 'd2q2', q: 'Örnek 1.4’te hangi sinyal öndedir?', opts: ['v (CH1), 40° önde', 'i (CH2), 40° önde', 'v, 50° önde', 'Aynı fazdalar'], correct: 1, explain: 'v = 10cos(ωt − 60°), i = 4cos(ωt − 20°): i’nin tepesi önce gelir. Osiloskopta CH2 tepesi CH1’inkinden 2,22 ms önce görünür.', hint: 'Önce sin’i kosinüse çevirin; büyük faz öndedir.' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 'Örnek 1.4 Lissajous ölçümünüzden Y<sub>0</sub>/Y<sub>m</sub> oranı kaçtır?', answer: Math.sin(40 * D2R), tol: 3, unit: '', explain: 'sin 40° = 0,643; arcsin ile 40° bulunur. İki yöntem uyuşmalı.', hint: 'Y imleci değerini CH2 maks değerine bölün.' });
  numq('d2', '#d2Q', { id: 'd2q4', q: 'Kara kutu X’in 1 kHz’deki faz kayması kaç derecedir? (mutlak değer)', answer: () => Math.abs(D2.boxPh(1000)), tol: 4, unit: '°', explain: 'Kutu bir RC alçak geçiren devredir: θ = −tan<sup>−1</sup>(ωRC). Çıkış girişten geride.', hint: '360°·Δt·f; Lissajous ile karşılaştırın.' });
  numq('d2', '#d2Q', { id: 'd2q5', q: 'Kutunun 45° frekansından zaman sabiti τ = RC kaç µs’dir?', answer: () => S.tau * 1e6, tol: 4, unit: 'µs', explain: 'tan 45° = 1 = ωRC ⇒ RC = 1/(2πf<sub>45</sub>).', hint: 'ωτ = 1' });
  mcq('d2', '#d2Q', { id: 'd2q6', q: 'X-Y ekranında eksenlere hizalı bir elips (ya da daire) görüyorsanız faz farkı nedir?', opts: ['0°', '45°', '90°', '180°'], correct: 2, explain: 'Y<sub>0</sub> = Y<sub>m</sub> ⇒ sin Δφ = 1 ⇒ 90°. Eşit genlik ve eşit V/d ise daire olur.', hint: 'Y<sub>0</sub>/Y<sub>m</sub> = 1' });

  /* ================= DENEY 3 · Fazör toplama ================= */
  const D3 = (() => {
    const box = $('#d3inst');
    const mk = (n, def) => {
      const k = 'd3s' + n; S[k] = Object.assign({ fn: def.fn, a: def.a, p: def.p }, S[k] || {});
      const b = inst(box, 'KAYNAK v<sub>' + n + '</sub> (yüzer)');
      segGroup(b.c, [['cos', 'cos'], ['sin', 'sin']], S[k].fn, (v) => { S[k].fn = v; save(); sc.dirty = true; });
      const ka = new Lab.Knob(b.c, { label: 'V<sub>m</sub>', min: 0, max: 5, step: 0.1, value: S[k].a, dark: true, size: 46, fmt: (v) => num(v, 1) + ' V', onChange: (v) => { S[k].a = v; save(); sc.dirty = true; } });
      ka.el.querySelector('.kl').innerHTML = 'V<sub>m</sub>';
      new Lab.Knob(b.c, { label: 'φ', min: -180, max: 180, step: 1, value: S[k].p, dark: true, size: 46, fmt: (v) => num(v, 0) + '°', onChange: (v) => { S[k].p = v; save(); sc.dirty = true; } });
      return () => S[k];
    };
    const g1 = mk(1, { fn: 'cos', a: 2, p: 0 }), g2 = mk(2, { fn: 'cos', a: 2, p: 90 });
    const so = inst(box, 'OSİLOSKOP CH2 GİRİŞİ', false);
    segGroup(so.c, [['v1', 'v<sub>1</sub>'], ['v2', 'v<sub>2</sub>'], ['sum', 'v<sub>1</sub>+v<sub>2</sub>']], S.d3sel || 'sum', (v) => { S.d3sel = v; save(); sc.dirty = true; });
    const fq = lcd(so.el, 'ortak frekans', 'Hz', 110); fq('1000');
    const f = 1000, w = 2 * Math.PI * f;
    const sc = mkScope($('#d3scopeHost'), { v1: 1, v2: 1, t: 2e-4 });
    const cosPh = (c) => c.p - (c.fn === 'sin' ? 90 : 0);
    const P = () => ({ s1: { ...g1() }, s2: { ...g2() }, sel: S.d3sel || 'sum' });
    const phs = (p) => { const V1 = C.pol(p.s1.a, cosPh(p.s1)), V2 = C.pol(p.s2.a, cosPh(p.s2)); return { V1, V2, V: C.add(V1, V2) }; };
    // şema
    const g = $('#d3sch');
    sch.src(g, 120, 70); sch.src(g, 120, 140); sch.t(g, 80, 75, 'v<sub>1</sub>', 'lbl', 'end'); sch.t(g, 80, 145, 'v<sub>2</sub>', 'lbl', 'end');
    sch.w(g, [[120, 50], [120, 30], [520, 30]]); sch.w(g, [[120, 90], [120, 120]]); sch.w(g, [[120, 160], [120, 180], [520, 180]]); sch.gnd(g, 300, 180);
    sch.dot(g, 120, 105); sch.w(g, [[120, 105], [260, 105]]); sch.t(g, 268, 109, 'ara düğüm', 'lbl', 'start');
    sch.box(g, 520, 60, 200, 90, ''); sch.t(g, 620, 90, 'CH1 ← SYNC: cos ωt'); const tC2 = sch.t(g, 620, 115, ''); sch.w(g, [[520, 30], [560, 30], [560, 60]]);
    const t1 = sch.t(g, 160, 75, '', 'val', 'start'), t2 = sch.t(g, 160, 145, '', 'val', 'start');
    // fazör diyagramı
    const ph = $('#d3ph'), OX = 180, OY = 160, K = 26;
    E('line', { x1: 10, y1: OY, x2: 350, y2: OY, stroke: '#aab' }, ph); E('line', { x1: OX, y1: 10, x2: OX, y2: 310, stroke: '#aab' }, ph);
    sch.t(ph, 345, OY - 6, 'Re', 'lbl', 'end'); sch.t(ph, OX + 6, 22, 'Im', 'lbl', 'start');
    for (let r = 1; r <= 5; r++) E('circle', { cx: OX, cy: OY, r: r * K, fill: 'none', stroke: '#eef', 'stroke-dasharray': '3 4' }, ph);
    const pg = E('g', {}, ph); let rotA = 0, lastT = 0;
    $('#d3rot').onchange = () => { sc.dirty = true; };
    $('#d3theo').onchange = () => { if ($('#d3theo').checked) { S.fl.d3theo = true; save(); } sc.dirty = true; };
    function drawPh(p, a) {
      pg.innerHTML = '';
      const { V1, V2, V } = phs(p), r = [Math.cos(a), Math.sin(a)];
      const R1 = C.mul(V1, r), R2 = C.mul(V2, r), RV = C.mul(V, r);
      const X = (z) => OX + z[0] * K, Y = (z) => OY - z[1] * K;
      E('polyline', { points: `${X(R2)},${Y(R2)} ${X(RV)},${Y(RV)}`, stroke: '#27c4f0', 'stroke-dasharray': '4 4', fill: 'none' }, pg);
      sch.arrow(pg, OX, OY, X(R1), Y(R1), '#c9a400');
      sch.arrow(pg, X(R1), Y(R1), X(RV), Y(RV), '#1a9cc4');
      sch.arrow(pg, OX, OY, X(R2), Y(R2), 'rgba(26,156,196,.35)', 2);
      sch.arrow(pg, OX, OY, X(RV), Y(RV), '#c62828', 3.5);
      sch.t(pg, X(R1) + 6, Y(R1) - 6, 'V₁', 'lbl', 'start'); sch.t(pg, X(RV) + 6, Y(RV) + 14, 'V = V₁+V₂', 'lbl', 'start');
      sch.t(pg, 12, 300, `V₁ = ${num(p.s1.a, 1)}∠${num(cosPh(p.s1), 0)}°   V₂ = ${num(p.s2.a, 1)}∠${num(cosPh(p.s2), 0)}°`, 'val', 'start');
      if ($('#d3theo').checked) sch.t(pg, 12, 20, `V = ${num(C.abs(V), 3)}∠${num(C.ang(V), 2)}°  (${num(V[0], 2)} ${V[1] < 0 ? '−' : '+'} j${num(Math.abs(V[1]), 2)})`, 'val', 'start');
      if (a) { E('line', { x1: X(RV), y1: Y(RV), x2: X(RV), y2: OY, stroke: '#c62828', 'stroke-dasharray': '3 3' }, pg); E('circle', { cx: X(RV), cy: OY, r: 4, fill: '#c62828' }, pg); }
    }
    function update() {
      const p = P();
      const ff = (c) => `${num(c.a, 1)} ${c.fn}(ωt${c.p >= 0 ? '+' : '−'}${Math.abs(c.p)}°)`;
      t1.textContent = ff(p.s1); t2.textContent = ff(p.s2); tC2.textContent = 'CH2 ← ' + { v1: 'v₁', v2: 'v₂', sum: 'v₁ + v₂' }[p.sel];
      if ($('#d3rot').checked) { const now = performance.now(); rotA += lastT ? (now - lastT) / 1000 * 2 * Math.PI * 0.2 : 0; lastT = now; drawPh(p, rotA); }
      else { lastT = 0; rotA = 0; }
      if (!sc.dirty) return; sc.dirty = false;
      if (!$('#d3rot').checked) drawPh(p, 0);
      const { V1, V2, V } = phs(p), Z = { v1: V1, v2: V2, sum: V }[p.sel], A = C.abs(Z), ph2 = Math.atan2(Z[1], Z[0]);
      const t0 = trigT0(w, 0, sc.sc.tdiv);
      sc.draw(trace(sc.sc.tdiv, [(t) => 2 * Math.cos(w * t), (t) => A * Math.cos(w * t + ph2)], t0, [0.01, 0.01]));
    }
    const tbody = $('#d3tab tbody');
    const fs = (c) => `${num(c.a, 1)}${c.fn === 'sin' ? ' sin' : ''}∠${num(c.p, 0)}°`;
    function table() { tbody.innerHTML = S.d3rows.map((r, i) => `<tr><td>${i + 1}</td><td>${fs(r.s1)}</td><td>${fs(r.s2)}</td><td>${{ v1: 'v₁', v2: 'v₂', sum: 'toplam' }[r.sel]}</td><td>${num(r.y2m, 3)}</td><td>${r.dt == null ? '—' : eng(r.dt, 's')}</td><td>${eng(1 / f, 's')}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; }
    function rec() {
      const m = sc.m; if (!m) return; const p = P();
      S.d3rows.push({ ...p, y2m: m.ch[1].max, dt: m.cur ? m.cur.dt : null }); save(); table();
      Lab.toast('Kaydedildi: CH2 maks = ' + num(m.ch[1].max, 3) + ' V' + (m.cur ? ', Δt = ' + eng(m.cur.dt, 's') : ''));
    }
    $('#d3rec').onclick = rec; $('#d3del').onclick = () => { S.d3rows.pop(); save(); table(); };
    $('#d3csv').onclick = () => Lab.downloadCSV('d2_hafta01_deney3.csv', ['#', 'v1', 'v2', 'CH2', 'CH2 maks (V)', 'dt (s)'], S.d3rows.map((r, i) => [i + 1, fs(r.s1), fs(r.s2), r.sel, +r.y2m.toFixed(4), r.dt == null ? '' : +r.dt.toExponential(4)]));
    table();
    const isS = (c, fn, a, p) => c.fn === fn && near(c.a, a, 0.05) && c.p === p;
    const ex8 = (r) => isS(r.s1, 'cos', 2, -30) && isS(r.s2, 'cos', 4, 60);
    const ex10 = (r) => isS(r.s1, 'cos', 4, 0) && isS(r.s2, 'sin', 3, 0);
    const phOK = (r, deg) => r.dt != null && near(Math.abs(r.dt) * 360 * f, Math.abs(deg), 2.5);
    return { sc, update, rec, P, phs, ex8, ex10, phOK, cosPh };
  })();
  XP.d3 = D3;
  steps('d3', [
    { t: 'Örnek 1.8’in 1/10 ölçekli hâlini kurun: <b>v<sub>1</sub> = 2cos(ωt − 30°)</b>, <b>v<sub>2</sub> = 4cos(ωt + 60°)</b>.', test: () => D3.ex8(D3.P()) },
    { t: 'CH2’yi <b>toplama</b> alın. İMLEÇ A’yı CH1 tepesine, B’yi en yakın CH2 tepesine koyup <b>kaydedin</b>.', test: () => S.d3rows.some((r) => r.sel === 'sum' && D3.ex8(r) && D3.phOK(r, 33.43)) },
    { t: 'Örnek 1.10: <b>v<sub>1</sub> = 4cos ωt</b>, <b>v<sub>2</sub> = 3sin ωt</b> kurup toplamı aynı biçimde ölçüp kaydedin.', test: () => S.d3rows.some((r) => r.sel === 'sum' && D3.ex10(r) && D3.phOK(r, -36.87)) },
    { t: '<b>Tasarım:</b> v<sub>1</sub> ≠ 0 iken toplamı <b>sıfırlayacak</b> v<sub>2</sub>’yi bulun ve kaydedin (CH2 maks &lt; %3·V<sub>1</sub>).', test: () => S.d3rows.some((r) => r.sel === 'sum' && r.s1.a >= 1 && r.y2m < 0.03 * r.s1.a + 0.02) },
    { t: 'Ölçümlerinizi bitirdikten sonra <b>hesaplanan toplamı</b> diyagramda gösterip karşılaştırın; isterseniz fazörleri döndürün.', test: () => !!S.fl.d3theo },
  ]);
  numq('d3', '#d3Q', { id: 'd3q1', q: 'Örnek 1.8 (ölçekli): ölçtüğünüz toplamın tepe değeri kaç V’tur?', answer: 4.472, tol: 2, unit: 'V', explain: '|2∠−30° + 4∠60°| = 4,472 (ders notunda 44,72). 2 + 4 = 6 değil: dalgalar aynı anda tepe yapmaz.', hint: 'CH2 maks.' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'Aynı ölçümden toplamın fazı kaç derecedir? (işaretiyle; tepe referanstan önce geliyorsa +)', answer: 33.43, tol: 5, unit: '°', explain: 'φ = tan<sup>−1</sup>(24,64/37,32) = 33,43°. CH2 tepesi CH1’den 92,9 µs önce gelir.', hint: 'φ = 360°·Δt/T; işaret için hangi tepenin önce geldiğine bakın.' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'Örnek 1.10: i = 4cos ωt + 3sin ωt. Toplamın fazı kaç derecedir?', answer: -36.87, tol: 3, unit: '°', explain: 'I = 4 − j3 = 5∠−36,87°; i = 5cos(ωt − 36,87°). sin, −90° fazlı kosinüstür.', hint: 'Sinüsün fazörü 3∠−90° = −j3.' });
  mcq('d3', '#d3Q', { id: 'd3q4', q: 'Toplamı sıfırlayan v<sub>2</sub> için hangisi doğrudur?', opts: ['v<sub>2</sub>, v<sub>1</sub> ile aynı fazlı ve eşit genlikli', 'v<sub>2</sub>, v<sub>1</sub>’den 90° farklı', 'v<sub>2</sub>, v<sub>1</sub> ile eşit genlikli ve 180° zıt fazlı', 'İki sinüsün toplamı hiçbir zaman sıfır olamaz'], correct: 2, explain: 'V<sub>2</sub> = −V<sub>1</sub> = V<sub>1</sub>∠180°. Gürültü giderme kulaklıkları bu ilkeyle çalışır.', hint: 'V<sub>1</sub> + V<sub>2</sub> = 0' });
  mcq('d3', '#d3Q', { id: 'd3q5', q: 'Fazör toplamının yalnızca <b>aynı frekanslı</b> sinüslerde geçerli olmasının nedeni nedir?', opts: ['Farklı frekanslı fazörler farklı hızlarda döner; aralarındaki açı sabit kalmaz', 'Farklı frekansta genlikler değişir', 'Kompleks sayılar yalnız bir frekansta tanımlıdır', 'Osiloskop tetiklenemez'], correct: 0, explain: 'Fazör e<sup>jωt</sup> çarpanını dışarıda bırakır; bu ancak tüm terimlerde aynı ω varsa ortak çarpandır.', hint: 'Animasyonda iki fazörü düşünün.' });

  /* ================= DENEY 4 · RL geçici + kararlı hâl ================= */
  const D4 = (() => {
    const box = $('#d4inst');
    const ac = inst(box, 'AC KAYNAK · YALITIM TRAFOLU', true, 'faz açılı anahtar');
    const kV = new Lab.Knob(ac.c, { label: 'V_m', min: 10, max: 100, step: 1, value: S.d4V ?? 100, dark: true, fmt: (v) => num(v, 0) + ' V', onChange: (v) => { S.d4V = v; save(); } });
    kV.el.querySelector('.kl').innerHTML = 'V<sub>m</sub>';
    const kW = new Lab.Knob(ac.c, { label: 'ω', min: 100, max: 2000, step: 10, value: S.d4w ?? 400, dark: true, fmt: (v) => num(v, 0) + ' r/s', onChange: (v) => { S.d4w = v; save(); } });
    const kP = new Lab.Knob(ac.c, { label: 'φ (kapanma)', min: -180, max: 180, step: 0.1, value: S.d4p ?? 0, dark: true, fmt: (v) => num(v, 1) + '°', onChange: (v) => { S.d4p = v; save(); } });
    const fL = lcd(ac.el, 'f = ω/2π', 'Hz', 110);
    const rb = inst(box, 'DİRENÇ KUTUSU · BOBİN', false);
    const kR = new Lab.Knob(rb.c, { label: 'R', list: [10, 20, 30, 40, 50, 75, 100, 150, 200], value: S.d4R ?? 30, fmt: Lab.ohm, onChange: (v) => { S.d4R = v; save(); } });
    const kL = new Lab.Knob(rb.c, { label: 'L', list: [0.03, 0.05, 0.1, 0.2, 0.3], value: S.d4L ?? 0.1, fmt: (v) => eng(v, 'H'), onChange: (v) => { S.d4L = v; save(); } });
    const bRl = segBtn(rb.c, 'r<sub>L</sub> = 1,2 Ω (gerçek bobin)', !!S.d4rl);
    bRl.onclick = () => { S.d4rl = !S.d4rl; bRl.classList.toggle('on', S.d4rl); save(); };
    const sw = inst(box, 'ANAHTAR S', false);
    const bShot = segBtn(sw.c, 'Anahtarı kapat (t = 0)', false); const bOpen = segBtn(sw.c, 'Kaynağı kapat / sıfırla', false);
    const sc = mkScope($('#d4scopeHost'), { v1: 50, v2: 1, t: 2e-3, pre: true, mode: 'SINGLE', l2: 'CH2 akım (1 V/A)', u2: 'A', p1: 1, p2: -1, freq: false });
    const P = () => ({ V: kV.value, w: kW.value, ph: kP.value, R: kR.value, L: kL.value, rl: S.d4rl ? 1.2 : 0 });
    const solve = (p) => {
      const Rt = p.R + p.rl, Z = Math.hypot(Rt, p.w * p.L), th = Math.atan2(p.w * p.L, Rt) * R2D, Im = p.V / Z, tau = p.L / Rt, K = -Im * Math.cos((p.ph - th) * D2R);
      return { Rt, Z, th, Im, tau, K, i: (t) => (t < 0 ? 0 : K * Math.exp(-t / tau) + Im * Math.cos(p.w * t + (p.ph - th) * D2R)), tr: (t) => K * Math.exp(-t / tau), ss: (t) => Im * Math.cos(p.w * t + (p.ph - th) * D2R) };
    };
    // şema
    const g = $('#d4sch');
    sch.src(g, 80, 110); sch.t(g, 80, 160, 'v<sub>s</sub>'); sch.w(g, [[80, 90], [80, 50], [150, 50]]); const swS = sch.sw(g, 150, 210, 50); sch.t(g, 180, 30, 'S (t = 0)');
    sch.w(g, [[210, 50], [260, 50]]); sch.rH(g, 260, 360, 50); const tR = sch.t(g, 310, 30, '', 'val');
    sch.w(g, [[360, 50], [420, 50]]); sch.lH(g, 420, 540, 50); const tLb = sch.t(g, 480, 30, '', 'val');
    sch.w(g, [[540, 50], [600, 50], [600, 170], [80, 170], [80, 130]]); sch.gnd(g, 340, 170);
    E('circle', { cx: 390, cy: 50, r: 12, fill: 'none', stroke: '#0b5cad', 'stroke-width': 2 }, g); sch.t(g, 390, 85, 'akım probu → CH2');
    E('path', { d: 'M560,70 v30 m-5,-8 l5,8 l5,-8', class: 'w' }, g); sch.t(g, 572, 95, 'i(t)', 'lbl', 'start');
    const tS = sch.t(g, 340, 210, '', 'val');
    let shot = S.d4shot || null;
    swS(!!shot);
    bShot.onclick = () => { shot = P(); S.d4shot = shot; save(); swS(true); sc.dirty = true; Lab.toast('Anahtar kapandı: osiloskop tek atışı yakaladı.'); };
    bOpen.onclick = () => { shot = null; S.d4shot = null; save(); swS(false); sc.dirty = true; };
    const plot = new Lab.Plot($('#d4plot'), { xlabel: 't  (ms)', ylabel: 'i  (A)' });
    $('#d4theo').onchange = () => { if ($('#d4theo').checked) { S.fl.d4theo = true; save(); } sc.dirty = true; };
    let lastKey = '';
    function update() {
      const p = P(); fL(num(p.w / (2 * Math.PI), 2));
      tR.textContent = 'R = ' + Lab.ohm(p.R); tLb.textContent = 'L = ' + eng(p.L, 'H') + (p.rl ? ' (r_L 1,2 Ω)' : '');
      tS.textContent = shot ? `Yakalanan: V_m = ${shot.V} V, ω = ${shot.w} rad/s, φ = ${num(shot.ph, 1)}°, R = ${shot.R} Ω, L = ${eng(shot.L, 'H')}` : 'Anahtar açık: CH2’de akım yok. Ayarları yapıp “Anahtarı kapat”a basın.';
      const key = JSON.stringify([shot, p]); if (key !== lastKey) { lastKey = key; sc.dirty = true; }
      if (!sc.dirty) return; sc.dirty = false;
      const q = shot || p, s = solve(q), td = sc.sc.tdiv, t0 = -td;
      sc.draw(trace(td, [(t) => q.V * Math.cos(q.w * t + q.ph * D2R), (t) => (shot ? s.i(t) : 0)], t0, [q.V * 0.004, 0.004]));
      const ser = [], N = 500, T = 9 * td;
      if (shot) {
        ser.push({ pts: Array.from({ length: N + 1 }, (_, k) => { const t = (k / N) * T; return [t * 1e3, s.i(t)]; }), line: true, color: '#0b5cad', width: 2.5 });
        if ($('#d4theo').checked) {
          ser.push({ pts: Array.from({ length: N + 1 }, (_, k) => { const t = (k / N) * T; return [t * 1e3, s.tr(t)]; }), line: true, color: '#c62828', dash: [6, 4] });
          ser.push({ pts: Array.from({ length: N + 1 }, (_, k) => { const t = (k / N) * T; return [t * 1e3, s.ss(t)]; }), line: true, color: '#1a8a4a', dash: [3, 3] });
          const t5 = 5 * s.tau * 1e3; if (t5 < T * 1e3) ser.push({ pts: [[t5, -s.Im * 1.6], [t5, s.Im * 1.6]], line: true, color: '#999', width: 1, dash: [2, 3] });
        }
      }
      const ym = shot ? Math.max(0.1, s.Im + Math.abs(s.K)) * 1.1 : 1;
      plot.draw(ser, [0, T * 1e3], [-ym, ym]);
    }
    const tbody = $('#d4tab tbody');
    function table() { tbody.innerHTML = S.d4rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.V}</td><td>${num(r.w / (2 * Math.PI), 2)} Hz</td><td>${num(r.ph, 1)}°</td><td>${r.R}</td><td>${eng(r.L, 'H')}</td><td>${r.ta == null ? '—' : eng(r.ta, 's')}</td><td>${r.ia == null ? '—' : num(r.ia, 3)}</td><td>${num(r.im, 3)}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; }
    function rec() {
      if (!shot) return Lab.toast('Önce anahtarı kapatıp bir tek atış yakalayın.');
      const m = sc.m; if (!m) return;
      const c = m.cur ? { ta: sc.tc(sc.sc.cur.a), ia: m.cur.v2a } : { ta: null, ia: null };
      const im = Math.max(Math.abs(m.ch[1].max), Math.abs(m.ch[1].min));
      S.d4rows.push({ ...shot, ...c, im, td: sc.sc.tdiv }); save(); table();
      Lab.toast('Kaydedildi' + (c.ta != null ? ': t<sub>A</sub> = ' + eng(c.ta, 's') + ', i = ' + num(c.ia, 3) + ' A' : ': |i| maks = ' + num(im, 3) + ' A'));
    }
    $('#d4rec').onclick = rec; $('#d4del').onclick = () => { S.d4rows.pop(); save(); table(); };
    $('#d4csv').onclick = () => Lab.downloadCSV('d2_hafta01_deney4.csv', ['#', 'Vm (V)', 'omega (rad/s)', 'phi (der)', 'R (ohm)', 'L (H)', 'rL (ohm)', 'tA (s)', 'iA (A)', '|i| maks (A)'], S.d4rows.map((r, i) => [i + 1, r.V, r.w, r.ph, r.R, r.L, r.rl, r.ta == null ? '' : +r.ta.toExponential(4), r.ia == null ? '' : +r.ia.toFixed(4), +r.im.toFixed(4)]));
    table();
    const ex5 = (q) => q && q.V === 100 && q.w === 400 && near(q.ph, 0, 0.05) && q.R === 30 && q.L === 0.1 && !q.rl;
    return { sc, update, rec, P, solve, ex5, shot: () => shot };
  })();
  XP.d4 = D4;
  const maxAbsI = (p) => { const s = D4.solve(p); let m = 0; for (let k = 0; k <= 4000; k++) { const t = (k / 4000) * 8 * s.tau + 0; m = Math.max(m, Math.abs(s.i(t))); } return m; };
  steps('d4', [
    { t: 'Örnek 1.5’i kurun: <b>V<sub>m</sub> = 100 V, ω = 400 rad/s, φ = 0°, R = 30 Ω, L = 100 mH</b> (ideal bobin) ve anahtarı kapatın.', test: () => D4.ex5(D4.shot()) },
    { t: 'İMLEÇ A’yı <b>t = 5 ms</b>’ye koyup (±0,1 ms) kaydedin. Ders notundaki 0,688 A ile karşılaştırın.', test: () => S.d4rows.some((r) => D4.ex5(r) && r.ta != null && near(r.ta, 5e-3, 1e-4)) },
    { t: '<b>Geçici ve kararlı hâl eğrilerini</b> açın; 5τ çizgisinden sonra toplam akımın kararlı hâle oturduğunu görün.', test: () => !!S.fl.d4theo },
    { t: '<b>Tasarım:</b> Aynı devrede geçicinin <b>hiç oluşmadığı</b> kapanma açısını (−90°…90° aralığında) bulun, anahtarı kapatıp kaydedin.', test: () => S.d4rows.some((r) => r.w === 400 && r.R === 30 && r.L === 0.1 && !r.rl && near(r.ph, -36.87, 1.5)) },
    { t: 'Geçicinin <b>en büyük</b> olduğu açıda (φ = θ) kapatıp kaydedin. |i| maks, kararlı hâl genliğini kaç kat aşıyor?', test: () => S.d4rows.some((r) => r.w === 400 && r.R === 30 && r.L === 0.1 && !r.rl && near(r.ph, 53.13, 1.5)) },
    { t: 'L’yi <b>300 mH</b>’ye çıkarıp (R = 30 Ω) bir ölçüm daha kaydedin: geçici ne kadar uzadı?', test: () => S.d4rows.some((r) => r.L === 0.3 && r.R === 30) },
  ]);
  numq('d4', '#d4Q', { id: 'd4q1', q: 'Örnek 1.5: akımın gerilimden geri kalma açısı θ kaç derecedir?', answer: 53.13, tol: 1, unit: '°', explain: 'tan θ = ωL/R = 40/30 ⇒ θ = 53,13°.', hint: 'tan θ = ωL/R' });
  numq('d4', '#d4Q', { id: 'd4q2', q: 'Ölçümünüzde t = 5 ms’deki akım kaç A’dır?', answer: () => D4.solve({ V: 100, w: 400, ph: 0, R: 30, L: 0.1, rl: 0 }).i(5e-3), tol: 3, unit: 'A', explain: 'i = −1,2e<sup>−1,5</sup> + 2cos(2 − 0,927) = −0,268 + 0,955 = 0,688 A.', hint: 'İmleç A’daki CH2 değeri (1 V/A).' });
  numq('d4', '#d4Q', { id: 'd4q3', q: 'Geçicinin oluşmadığı kapanma açısı φ kaç derecedir? (−90°…90° aralığında)', answer: -36.87, tol: 3, unit: '°', explain: 'K = −I<sub>m</sub>cos(φ − θ) = 0 ⇒ φ = θ ± 90° = −36,87° veya 143,13°.', hint: 'φ − θ = ±90°' });
  numq('d4', '#d4Q', { id: 'd4q4', q: 'φ = θ’da kapatınca ölçtüğünüz |i| maks kaç A’dır?', answer: () => maxAbsI({ V: 100, w: 400, ph: 53.13, R: 30, L: 0.1, rl: 0 }), tol: 3, unit: 'A', explain: 'K = −2 A; yaklaşık yarım periyot sonra geçici ve kararlı hâl aynı yönde toplanır: |i| ≈ 2 + 2e<sup>−300·7,85 ms</sup> ≈ 2,19 A.', hint: 'CH2 maks/min değerlerinden mutlak değerce büyük olanı.' });
  mcq('d4', '#d4Q', { id: 'd4q5', q: 'L = 300 mH, R = 30 Ω iken geçici pratikte ne zaman biter?', opts: ['≈ 3,3 ms', '≈ 10 ms', '≈ 50 ms', 'ω’ya bağlı olduğu için hesaplanamaz'], correct: 2, explain: 'τ = L/R = 10 ms, 5τ = 50 ms. τ’ya ω girmez.', hint: '5τ, τ = L/R' });
  mcq('d4', '#d4Q', { id: 'd4q6', q: 'Kararlı hâlde akım genliğini V<sub>m</sub>/R = 3,33 A bulan öğrencinin hatası nedir?', opts: ['rms kullanmamış', 'Bobini kısa devre saymış; kararlı hâlde bobin ωL kadar reaktans gösterir', 'τ’yu yanlış hesaplamış', 'Hata yok'], correct: 1, explain: 'Akım sürekli değiştiği için L di/dt ≠ 0. Doğrusu V<sub>m</sub>/√(R² + ω²L²) = 2 A.', hint: 'Sık hata: bobini kısa devre saymak.' });

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
    const tb = (id) => `<table class="data"><thead>${$(id + ' thead').innerHTML}</thead><tbody>${$(id + ' tbody').innerHTML}</tbody></table>`;
    const html = `
      <h2 style="margin:0">Devre Kuramı II · Sanal Laboratuvar · Hafta 1 Raporu</h2>
      <p><b>Konu:</b> Sinüs kaynaklar, rms, faz farkı, fazör kavramı ve RL devresinin sinüsoidal tepkisi (Bölüm 1.1–1.3)</p>
      <table class="data" style="width:auto"><tr><th>Ad Soyad</th><td class="l">${S.st.name || ''}</td><th>No</th><td class="l">${S.st.no || ''}</td><th>Grup</th><td class="l">${S.st.group || ''}</td><th>Tarih</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Özet</h3>
      <p>Tamamlanan föy adımı: <b>${sOk}/${sTot}</b> · Doğru yanıt: <b>${ok}/${tot}</b> · Puan: <b>${Math.round((50 * sOk) / sTot + (50 * ok) / tot)}/100</b></p>
      <h3>Yanıtlar</h3>
      <table class="data"><thead><tr><th>Bölüm</th><th>Soru</th><th>Yanıt</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Deney 1 · Sinüs parametreleri ve rms</h3>${tb('#d1tab')}
      <h3>Deney 2 · Faz farkı (Δt ve Lissajous)</h3>${tb('#d2tab')}
      <h3>Deney 3 · Fazör toplama</h3>${tb('#d3tab')}
      <h3>Deney 4 · RL geçici ve kararlı hâl</h3>${tb('#d4tab')}
      <h3>Grafikler</h3>
      <div>${img(D1.sc.cv)} ${img(D2.sc.cv)}</div><div>${img($('#d2xy'))} ${img(D3.sc.cv)}</div><div>${img(D4.sc.cv)} ${img($('#d4plot'))}</div>
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
    if ((e.key === 'r' || e.key === 'R') && XP[S.page]) XP[S.page].rec();
  });

  function loop() {
    if (XP[S.page]) { XP[S.page].update(); evalSteps(S.page); }
    if (S.page === 'onbilgi') PH.start();
    requestAnimationFrame(loop);
  }
  ['d1', 'd2', 'd3', 'd4'].forEach(evalSteps);
  go(S.page); progress(); loop();
})();

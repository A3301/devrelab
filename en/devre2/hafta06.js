/* Devre Kuramı II · Hafta 6 — Transformatör (doğrusal ve ideal) ve fazör diyagramı */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd2h6';
  const S = Object.assign({ answers: {}, steps: {}, st: {}, page: 'giris', d1rows: [], d2rows: [], d3rows: [], d4rows: [], d5rows: [], fl: {} }, Lab.store.load(KEY));
  // öğrenciye özgü gizli parametreler (üretim toleransı)
  const rnd = (a, b) => a + Math.random() * (b - a);
  if (!S.tp) S.tp = { a: (230 / 24) * rnd(0.98, 1.02), R1: 20 * rnd(0.9, 1.1), R2: 20 * rnd(0.9, 1.1), X1: 6 * rnd(0.85, 1.15), X2: 6 * rnd(0.85, 1.15), Rc: 17600 * rnd(0.85, 1.15), Xm: 11500 * rnd(0.85, 1.15) };
  if (S.pdot == null) S.pdot = Math.random() < 0.5;
  if (S.pn == null) S.pn = +rnd(9.3, 9.9).toFixed(3);
  Lab.answers = S.answers;
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => Lab.store.save(KEY, S), 300); };
  Lab.onAnswer = () => { save(); progress(); };
  const near = (a, b, t) => Math.abs(a - b) <= t;
  const SQ2 = Math.SQRT2;

  /* ---------- kompleks sayı yardımcıları ---------- */
  const cadd = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const csub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const cdiv = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
  const cinv = (a) => cdiv([1, 0], a);
  const cabs = (a) => Math.hypot(a[0], a[1]);
  const cang = (a) => (Math.atan2(a[1], a[0]) * 180) / Math.PI;
  const polar = (m, d) => [m * Math.cos((d * Math.PI) / 180), m * Math.sin((d * Math.PI) / 180)];
  const cconj = (a) => [a[0], -a[1]];
  const wrap = (x) => ((((x + 180) % 360) + 360) % 360) - 180;
  const frect = (z, d = 3) => `${num(z[0], d)} ${z[1] < 0 ? '−' : '+'} j${num(Math.abs(z[1]), d)}`;
  const fpol = (z, d = 3) => `${num(cabs(z), d)}∠${num(cang(z), 2)}°`;
  function csolve(A, b) { // Gauss yok etme, kısmi pivot
    const n = b.length, M = A.map((r, i) => [...r.map((z) => [...z]), [...b[i]]]);
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (cabs(M[r][c]) > cabs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]];
      if (cabs(M[c][c]) < 1e-14) return null;
      for (let r = c + 1; r < n; r++) { const f = cdiv(M[r][c], M[c][c]); for (let k = c; k <= n; k++) M[r][k] = csub(M[r][k], cmul(f, M[c][k])); }
    }
    const x = new Array(n);
    for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let k = r + 1; k < n; k++) s = csub(s, cmul(M[r][k], x[k])); x[r] = cdiv(s, M[r][r]); }
    return x;
  }
  const det2 = (Y) => csub(cmul(Y[0][0], Y[1][1]), cmul(Y[0][1], Y[1][0]));
  // fazör(ler) -> osiloskop örnekleri; comps: [{z:[re,im] (tepe), w}]
  function wave(n, tdiv, comps) {
    const y = new Float64Array(n), T = 10 * tdiv;
    for (let k = 0; k < n; k++) { const t = (k / (n - 1)) * T; let s = 0; comps.forEach((c) => { s += cabs(c.z) * Math.cos(c.w * t + Math.atan2(c.z[1], c.z[0])); }); y[k] = s; }
    return y;
  }

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
  function segGroup(parent, opts, cur, onPick) {
    const bs = opts.map(([v, t]) => { const b = segBtn(parent, t, v === cur); b.onclick = () => { bs.forEach((x) => x.classList.remove('on')); b.classList.add('on'); onPick(v); }; return b; });
    return bs;
  }

  /* ---------- şema yardımcıları ---------- */
  const sch = {
    w: (g, pts) => E('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'w' }, g),
    dot: (g, x, y) => E('circle', { cx: x, cy: y, r: 3.5, class: 'node' }, g),
    t: (g, x, y, s, cls = 'lbl', anchor = 'middle') => { const e = E('text', { x, y, class: cls, 'text-anchor': anchor }, g); e.innerHTML = s; return e; },
    rH(g, x1, x2, y) { const n = 6, L = 8, step = (x2 - x1 - 2 * L) / n; let d = `M${x1},${y} h${L}`; for (let i = 0; i < n; i++) d += ` l${step / 2},${i % 2 ? 7 : -7} l${step / 2},${i % 2 ? -7 : 7}`; d += ` L${x2},${y}`; E('path', { d, class: 'w' }, g); },
    rV(g, x, y1, y2) { const n = 6, L = 8, step = (y2 - y1 - 2 * L) / n; let d = `M${x},${y1} v${L}`; for (let i = 0; i < n; i++) d += ` l${i % 2 ? 7 : -7},${step / 2} l${i % 2 ? -7 : 7},${step / 2}`; d += ` L${x},${y2}`; E('path', { d, class: 'w' }, g); },
    lV(g, x, y1, y2) { const n = 4, h = (y2 - y1 - 16) / n; let d = `M${x},${y1} v8`; for (let i = 0; i < n; i++) d += ` a${h / 2},${h / 2} 0 0 1 0,${h}`; d += ` L${x},${y2}`; E('path', { d, class: 'w' }, g); },
    lH(g, x1, x2, y) { const n = 4, h = (x2 - x1 - 16) / n; let d = `M${x1},${y} h8`; for (let i = 0; i < n; i++) d += ` a${h / 2},${h / 2} 0 0 1 ${h},0`; d += ` L${x2},${y}`; E('path', { d, class: 'w' }, g); },
    cV(g, x, y1, y2) { const m = (y1 + y2) / 2; E('path', { d: `M${x},${y1} V${m - 5} M${x - 16},${m - 5} h32 M${x - 16},${m + 5} h32 M${x},${m + 5} V${y2}`, class: 'w' }, g); },
    zH(g, x1, x2, y) { const m = (x1 + x2) / 2; E('path', { d: `M${x1},${y} H${m - 30} M${m + 30},${y} H${x2}`, class: 'w' }, g); return E('rect', { x: m - 30, y: y - 12, width: 60, height: 24, class: 'w', fill: '#fff' }, g); },
    zV(g, x, y1, y2) { const m = (y1 + y2) / 2; E('path', { d: `M${x},${y1} V${m - 30} M${x},${m + 30} V${y2}`, class: 'w' }, g); return E('rect', { x: x - 12, y: m - 30, width: 24, height: 60, class: 'w', fill: '#fff' }, g); },
    gnd(g, x, y) { E('path', { d: `M${x},${y} v8 M${x - 11},${y + 8} h22 M${x - 7},${y + 13} h14 M${x - 3},${y + 18} h6`, class: 'w' }, g); },
    src(g, x, y, r = 20) { E('circle', { cx: x, cy: y, r, class: 'w', fill: '#fff' }, g); E('path', { d: `M${x - 10},${y} q5,-12 10,0 t10,0`, class: 'w' }, g); sch.t(g, x + r + 2, y - r + 4, '+', 'lbl', 'start'); },
    isrc(g, x, y, r = 20) { E('circle', { cx: x, cy: y, r, class: 'w', fill: '#fff' }, g); E('path', { d: `M${x},${y + 12} V${y - 10} m-5,6 l5,-7 l5,7`, class: 'w' }, g); },
    dep(g, x, y) { E('path', { d: `M${x},${y - 22} L${x + 18},${y} L${x},${y + 22} L${x - 18},${y} Z`, class: 'w', fill: '#fff' }, g); E('path', { d: `M${x},${y + 12} V${y - 10} m-5,6 l5,-7 l5,7`, class: 'w' }, g); },
  };

  /* ---------- osiloskop ---------- */
  const VDIV = [1e-3, 2e-3, 5e-3, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200];
  const TDIV = [1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2];
  const POS = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  function mkScope(host, o) {
    const w = document.createElement('div'); w.className = 'inst dark scopewrap'; w.style.cssText = 'flex:1;min-width:420px';
    w.innerHTML = `<div class="brand"><span>DSO-2C · Digital Oscilloscope</span><span><span class="led on g"></span> RUN · trigger CH1 ↑ peak</span></div>
      <div class="row" style="align-items:flex-start;flex-wrap:nowrap"><canvas width="640" height="400" style="width:100%;max-width:640px"></canvas>
      <div style="min-width:160px"><div class="ctrls"></div><div class="row btns" style="margin:6px 0;gap:4px"></div><div class="meas"></div></div></div>`;
    host.appendChild(w);
    const cv = w.querySelector('canvas'), sc = new Lab.Scope(cv), sk = w.querySelector('.ctrls'), bt = w.querySelector('.btns'), me = w.querySelector('.meas');
    const self = { sc, cv, dirty: true };
    const set = () => { self.dirty = true; };
    sc.ch[0].vdiv = o.v1; sc.ch[1].vdiv = o.v2; sc.tdiv = o.t;
    self.k1 = new Lab.Knob(sk, { label: 'CH1 V/div', list: VDIV, value: o.v1, dark: true, size: 40, fmt: (v) => eng(v, 'V'), onChange: (v) => { sc.ch[0].vdiv = v; set(); } });
    self.k2 = new Lab.Knob(sk, { label: o.l2 || 'CH2 V/div', list: VDIV, value: o.v2, dark: true, size: 40, fmt: (v) => eng(v, o.u2 || 'V'), onChange: (v) => { sc.ch[1].vdiv = v; set(); } });
    self.kt = new Lab.Knob(sk, { label: 'TIME/div', list: TDIV, value: o.t, dark: true, size: 40, fmt: (v) => eng(v, 's'), onChange: (v) => { sc.tdiv = v; set(); } });
    self.kp1 = new Lab.Knob(sk, { label: 'CH1 position', list: POS, value: 0, dark: true, size: 34, fmt: (v) => num(v, 0) + ' d', onChange: (v) => { sc.ch[0].pos = v; set(); } });
    self.kp2 = new Lab.Knob(sk, { label: 'CH2 position', list: POS, value: 0, dark: true, size: 34, fmt: (v) => num(v, 0) + ' d', onChange: (v) => { sc.ch[1].pos = v; set(); } });
    const b1 = segBtn(bt, 'CH1', true), b2 = segBtn(bt, 'CH2', true), bc = segBtn(bt, 'CURSOR', false);
    b1.onclick = () => { sc.ch[0].on = !sc.ch[0].on; b1.classList.toggle('on', sc.ch[0].on); set(); };
    b2.onclick = () => { sc.ch[1].on = !sc.ch[1].on; b2.classList.toggle('on', sc.ch[1].on); set(); };
    bc.onclick = () => { sc.cur.on = !sc.cur.on; bc.classList.toggle('on', sc.cur.on); set(); };
    self.tc = (x) => x * sc.tdiv;
    self.show = () => {
      const m = sc.measure(); if (!m) return; self.m = m;
      const [a, b] = m.ch, u2 = o.u2 || 'V';
      let h = `<span style="color:#f2d21b">CH1</span> Vpp ${eng(a.vpp, 'V')}<br><span style="color:#27c4f0">CH2</span> pp ${eng(b.vpp, u2)}`;
      if (m.cur) {
        const c = m.cur;
        h += `<br><span style="color:#ff7cf0">A</span> t ${eng(self.tc(sc.cur.a), 's')}<br>&nbsp;CH1 ${eng(c.v1a, 'V')} · CH2 ${eng(c.v2a, u2)}` +
          `<br><span style="color:#ff7cf0">B</span> t ${eng(self.tc(sc.cur.b), 's')}<br>&nbsp;CH1 ${eng(c.v1b, 'V')} · CH2 ${eng(c.v2b, u2)}<br>Δt = t<sub>B</sub>−t<sub>A</sub> ${eng(c.dt, 's')}`;
      }
      me.innerHTML = h;
    };
    cv.addEventListener('pointermove', () => sc.cur.drag && self.show());
    cv.addEventListener('pointerdown', () => setTimeout(self.show, 0));
    self.draw = (data) => { sc.draw(data); self.show(); };
    return self;
  }

  /* ================= GEZİNME / İLERLEME ================= */
  const pages = ['giris', 'onbilgi', 'onhaz', 'd1', 'd2', 'd3', 'd4', 'd5', 'rapor'];
  const XP = {};
  function go(p) {
    S.page = p; save();
    $$('section.page').forEach((s) => s.classList.toggle('active', s.id === p));
    $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.p === p));
    if (XP[p]) XP[p].dirty = true;
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
      if (!S.steps[id] && s.test()) { S.steps[id] = true; save(); Lab.toast('✔ Step completed: ' + s.t.replace(/<[^>]+>/g, '').slice(0, 70)); progress(); }
      lis[i].classList.toggle('done', !!S.steps[id]);
    });
  }
  const qids = { onhaz: [], d1: [], d2: [], d3: [], d4: [], d5: [] };
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


  const sub = (a, b) => `${a}<tspan baseline-shift="sub" font-size="10">${b}</tspan>`;
  // ikinci sargı için sola bombeli bobin ve trafo çizimi
  sch.lVr = (g, x, y1, y2) => { const n = 4, h = (y2 - y1 - 16) / n; let d = `M${x},${y1} v8`; for (let i = 0; i < n; i++) d += ` a${h / 2},${h / 2} 0 0 0 0,${h}`; d += ` L${x},${y2}`; E('path', { d, class: 'w' }, g); };
  function xfmr(g, x1, x2, y1, y2, core) { // x1: primer bobin, x2: sekonder bobin
    sch.lV(g, x1, y1, y2); sch.lVr(g, x2, y1, y2);
    const m = (x1 + x2) / 2;
    if (core === 'iron') { E('line', { x1: m - 4, y1: y1 + 6, x2: m - 4, y2: y2 - 6, class: 'w' }, g); E('line', { x1: m + 4, y1: y1 + 6, x2: m + 4, y2: y2 - 6, class: 'w' }, g); }
    else E('line', { x1: m, y1: y1 + 6, x2: m, y2: y2 - 6, stroke: '#888', 'stroke-dasharray': '4 4' }, g);
  }
  const bigdot = (g, x, y) => E('circle', { cx: x, cy: y, r: 5, fill: '#222' }, g);

  /* ================= ÖN BİLGİ: trafo fazörleri ================= */
  const OB = (() => {
    const g = $('#obTr');
    sch.w(g, [[20, 50], [70, 50]]); sch.w(g, [[20, 170], [70, 170]]); xfmr(g, 70, 130, 50, 170, 'iron'); sch.w(g, [[130, 50], [180, 50]]); sch.w(g, [[130, 170], [180, 170]]);
    bigdot(g, 56, 62); const d2 = bigdot(g, 144, 62);
    sch.t(g, 14, 115, sub('v', '1'), 'lbl', 'start'); sch.t(g, 186, 115, sub('v', '2'), 'lbl', 'start');
    sch.t(g, 14, 45, '+', 'lbl', 'start'); sch.t(g, 186, 45, '+', 'lbl', 'start');
    const cx = 290, cy = 105;
    E('circle', { cx, cy, r: 72, fill: 'none', stroke: '#ddd' }, g);
    E('line', { x1: cx - 80, y1: cy, x2: cx + 80, y2: cy, stroke: '#aaa' }, g); E('line', { x1: cx, y1: cy - 85, x2: cx, y2: cy + 85, stroke: '#aaa' }, g);
    E('line', { x1: 380, y1: cy, x2: 515, y2: cy, stroke: '#aaa' }, g);
    const a1 = E('line', { stroke: '#e07a10', 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    const a2 = E('line', { stroke: '#0b5cad', 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    const w1 = E('polyline', { fill: 'none', stroke: '#e07a10', 'stroke-width': 2 }, g), w2 = E('polyline', { fill: 'none', stroke: '#0b5cad', 'stroke-width': 2 }, g);
    sch.t(g, 380, 200, 'orange v₁ · blue v₂', 'lbl', 'start').style.fontSize = '11px';
    let t = 0; const h1 = [], h2 = [];
    function frame(dt) {
      t += dt; const s = +$('#obDot').value, n = +$('#obN').value;
      d2.setAttribute('cy', s > 0 ? 62 : 158);
      const ang = 1.5 * t, m1 = 70, m2 = Math.min(70, 70 / n) * s;
      const p1 = [m1 * Math.cos(ang), m1 * Math.sin(ang)], p2 = [m2 * Math.cos(ang), m2 * Math.sin(ang)];
      a1.setAttribute('x1', cx); a1.setAttribute('y1', cy); a1.setAttribute('x2', cx + p1[0]); a1.setAttribute('y2', cy - p1[1]);
      a2.setAttribute('x1', cx); a2.setAttribute('y1', cy); a2.setAttribute('x2', cx + p2[0]); a2.setAttribute('y2', cy - p2[1]);
      h1.unshift(p1[0]); h2.unshift(p2[0]); if (h1.length > 135) { h1.pop(); h2.pop(); }
      w1.setAttribute('points', h1.map((v, i) => `${380 + i},${cy - v}`).join(' ')); w2.setAttribute('points', h2.map((v, i) => `${380 + i},${cy - v}`).join(' '));
    }
    return { frame };
  })();

  /* ================= ÖN HAZIRLIK ================= */
  numq('onhaz', '#preQ', { id: 'p1', q: '1) Example 1.35: what is the mutual inductance M in henries?', answer: 3, tol: 1, unit: 'H', explain: 'M = k√(L<sub>1</sub>L<sub>2</sub>) = 0.5√36 = 3 H; ωM = 1200 Ω.', hint: 'M = k√(L<sub>1</sub>L<sub>2</sub>)' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) What is the imaginary part in ohms of the secondary self-impedance Z<sub>22</sub> = R<sub>2</sub> + jωL<sub>2</sub> + Z<sub>L</sub>? (with sign)', answer: -900, tol: 1, unit: 'Ω', explain: 'j1600 − j2500 = −j900 Ω: the secondary is capacitive.', hint: '1/(jωC) = −j2500 Ω' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) What is the imaginary part in ohms of the reflected impedance Z<sub>r</sub> = ω²M²/Z<sub>22</sub>? (with sign)', answer: 800, tol: 1, unit: 'Ω', explain: 'Z<sub>r</sub> = 1.44·10<sup>6</sup>/(900 − j900) = 800 + j800 Ω. A capacitive secondary appears inductive at the primary.', hint: 'Multiply by the conjugate of the denominator.' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) Example 1.39: R<sub>s</sub> = 800 Ω, R<sub>L</sub> = 8 Ω. What must N<sub>1</sub>/N<sub>2</sub> be for maximum power?', answer: 10, tol: 1, unit: '', explain: '(N<sub>1</sub>/N<sub>2</sub>)²·8 = 800 ⇒ N<sub>1</sub>/N<sub>2</sub> = 10.', hint: 'R<sub>IN</sub> = (N<sub>1</sub>/N<sub>2</sub>)² R<sub>L</sub> = R<sub>s</sub>' });
  mcq('onhaz', '#preQ', { id: 'p5', q: '5) V = 120∠20° V and I = 6∠50° A are measured on a load. What type of load is it?', opts: ['Inductive; Z = 20∠30° Ω', 'Capacitive; Z = 20∠−30° Ω', 'Resistive; Z = 20 Ω', 'Inductive; Z = 20∠−30° Ω'], correct: 1, explain: 'Z = V/I = 20∠−30° Ω; the current leads the voltage by 30°: capacitive.', hint: 'θ<sub>Z</sub> = θ<sub>V</sub> − θ<sub>I</sub>' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) Why is the short-circuit test of a transformer done with only 5–10% of the rated voltage?', opts: ['So that the wattmeter reads more accurately', 'With the secondary shorted, full voltage draws many times the rated current; a low voltage is enough to drive rated current', 'To measure the iron loss', 'The turns ratio changes at low voltage'], correct: 1, explain: 'In a short circuit only the small winding impedance limits the current. Also, at low voltage the flux is small, so the iron loss is negligible.', hint: 'What limits the current in a short circuit?' });

  /* ================= DENEY 1 · Doğrusal trafo ================= */
  const D1 = (() => {
    const R1 = 200, R2 = 100, L1 = 9, L2 = 4, W = 400, Zs = [500, 100], RL = 800, CL = 1e-6;
    const box = $('#d1inst');
    const gen = inst(box, 'GENERATOR + POWER AMP · Z<sub>s</sub> = 500 + j100 Ω');
    const kV = new Lab.Knob(gen.c, { label: 'V_s (rms)', min: 0, max: 300, step: 10, value: S.d1V ?? 100, dark: true, fmt: (v) => num(v, 0) + ' V', onChange: (v) => { S.d1V = v; save(); self.dirty = true; } });
    lcd(gen.el, 'ω (fixed)', 'rad/s', 100)('400');
    const tr = inst(box, 'AIR-CORE TRANSFORMER · L<sub>1</sub> = 9 H, L<sub>2</sub> = 4 H', false);
    const kK = new Lab.Knob(tr.c, { label: 'k (core gap)', min: 0.1, max: 0.95, step: 0.05, value: S.d1k ?? 0.3, size: 58, fmt: (v) => num(v, 2), onChange: (v) => { S.d1k = v; save(); self.dirty = true; } });
    const ld = inst(box, 'SECONDARY LOAD', false);
    const LOADS = [['zl', '800 Ω + 1 µF'], ['zr', 'C shorted (800 Ω)'], ['open', 'Open'], ['short', 'Short circuit']];
    segGroup(ld.c, LOADS, S.d1load || 'zl', (v) => { S.d1load = v; save(); self.dirty = true; });
    const mt = inst(box, 'POWER ANALYSER (a–b) + AMMETER');
    const mV = lcd(mt.el, 'V<sub>ab</sub> rms', 'V', 100), mI = lcd(mt.el, 'I<sub>1</sub> rms', 'mA', 100), mP = lcd(mt.el, 'P<sub>ab</sub>', 'W', 100), mI2 = lcd(mt.el, 'I<sub>2</sub> rms', 'mA', 100);
    const sc = mkScope($('#d1scopeHost'), { v1: 200, v2: 50, t: 2e-3, l2: 'CH2 i₁ mA/d', u2: 'mA' });
    const P = () => ({ V: kV.value, k: kK.value, load: S.d1load || 'zl' });
    function solve(p) {
      const wM = W * p.k * Math.sqrt(L1 * L2), Z11 = cadd(Zs, [R1, W * L1]);
      const Z22 = { zl: [R2 + RL, W * L2 - 1 / (W * CL)], zr: [R2 + RL, W * L2], short: [R2, W * L2], open: null }[p.load];
      const Zr = Z22 ? cdiv([wM * wM, 0], Z22) : [0, 0];
      const I1 = cdiv([p.V, 0], cadd(Z11, Zr)), I2 = Z22 ? cdiv(cmul([0, wM], I1), Z22) : [0, 0];
      const Vab = csub([p.V, 0], cmul(Zs, I1));
      return { I1, I2, Vab, Zr, Zab: cadd([R1, W * L1], Zr), Pab: cmul(Vab, cconj(I1))[0], PL: (cabs(I2) ** 2) * (p.load === 'short' ? 0 : RL) };
    }
    // şema
    const g = $('#d1sch');
    sch.w(g, [[50, 60], [50, 100]]); sch.src(g, 50, 130); sch.w(g, [[50, 160], [50, 210], [300, 210], [300, 190]]);
    sch.w(g, [[50, 60], [70, 60]]); sch.zH(g, 70, 170, 60); sch.t(g, 120, 40, sub('Z', 's'));
    sch.w(g, [[170, 60], [190, 60]]); sch.rH(g, 190, 260, 60); sch.t(g, 225, 42, '200 Ω'); sch.w(g, [[260, 60], [300, 60], [300, 80]]);
    xfmr(g, 300, 380, 80, 190, 'air'); bigdot(g, 288, 92); bigdot(g, 392, 92);
    sch.w(g, [[380, 80], [380, 60], [420, 60]]); sch.rH(g, 420, 490, 60); sch.t(g, 455, 42, '100 Ω'); sch.w(g, [[490, 60], [560, 60]]);
    sch.w(g, [[380, 190], [380, 210], [640, 210]]);
    const gl = E('g', {}, g);
    sch.t(g, 275, 140, '9 H', 'lbl', 'end'); sch.t(g, 405, 140, '4 H', 'lbl', 'start'); const tk = sch.t(g, 340, 235, '', 'val');
    sch.t(g, 190, 50, 'a', 'lbl'); sch.t(g, 190, 228, 'b', 'lbl'); sch.dot(g, 190, 60); sch.dot(g, 190, 210);
    E('path', { d: 'M215,75 h30 m-7,-5 l7,5 l-7,5', class: 'w' }, g); sch.t(g, 230, 92, sub('I', '1'));
    E('path', { d: 'M500,75 h30 m-7,-5 l7,5 l-7,5', class: 'w' }, g); sch.t(g, 515, 92, sub('I', '2'));
    function drawLoad(l) {
      gl.innerHTML = '';
      if (l === 'open') { sch.w(gl, [[560, 60], [580, 60]]); sch.w(gl, [[640, 210], [600, 210]]); sch.t(gl, 600, 140, 'open', 'lbl'); return; }
      if (l === 'short') { sch.w(gl, [[560, 60], [640, 60], [640, 210]]); sch.t(gl, 652, 140, 'short', 'lbl', 'start'); return; }
      sch.w(gl, [[560, 60], [640, 60]]); sch.rV(gl, 640, 60, 140); sch.t(gl, 652, 105, '800 Ω', 'lbl', 'start');
      if (l === 'zl') { sch.cV(gl, 640, 140, 210); sch.t(gl, 662, 180, '1 µF', 'lbl', 'start'); } else { sch.w(gl, [[640, 140], [640, 210]]); sch.t(gl, 652, 180, 'C bridged', 'lbl', 'start'); }
    }
    const self = { sc, dirty: true };
    let lastLoad = null;
    self.update = function () {
      if (!self.dirty && !sc.dirty) return; self.dirty = sc.dirty = false;
      const p = P(), r = solve(p);
      if (p.load !== lastLoad) { drawLoad(p.load); lastLoad = p.load; }
      tk.textContent = 'k = ' + num(p.k, 2) + ' · M = ' + num(p.k * 6, 2) + ' H';
      mV(num(cabs(r.Vab), 1)); mI(num(cabs(r.I1) * 1e3, 2)); mP(num(r.Pab, 3)); mI2(num(cabs(r.I2) * 1e3, 2));
      const ref = cang(r.Vab), n = 1000, td = sc.sc.tdiv;
      sc.draw({ n, y: [wave(n, td, [{ z: [cabs(r.Vab) * SQ2, 0], w: W }]), wave(n, td, [{ z: polar(cabs(r.I1) * SQ2 * 1e3, cang(r.I1) - ref), w: W }])] });
      drawPlot();
    };
    const plot = new Lab.Plot($('#d1plot'), { xlabel: 'k', ylabel: 'P_L (W)' });
    function drawPlot() {
      const ser = [];
      if ($('#d1theo').checked) { const pts = []; for (let i = 0; i <= 90; i++) { const k = 0.05 + i * 0.01; pts.push([k, solve({ V: 300, k, load: 'zl' }).PL]); } ser.push({ pts, line: true, color: '#e07a10', dash: [6, 4] }); }
      ser.push({ pts: S.d1rows.filter((r) => r.load === 'zl' && r.V === 300).map((r) => [r.k, ((r.i2 / 1e3) ** 2) * RL]), dots: true, color: '#0b5cad' });
      plot.draw(ser, [0, 1], [0, 6]);
    }
    $('#d1theo').onchange = () => { if ($('#d1theo').checked) { S.fl.d1theo = true; save(); } drawPlot(); };
    const LN = Object.fromEntries(LOADS);
    const tbody = $('#d1tab tbody');
    function table() { tbody.innerHTML = S.d1rows.map((r, i) => `<tr><td>${i + 1}</td><td>${num(r.k, 2)}</td><td>${LN[r.load]}</td><td>${num(r.vab, 1)}</td><td>${num(r.i1, 2)}</td><td>${num(r.i2, 2)}</td><td>${num(r.pab, 3)}</td><td>${r.dt == null ? '—' : eng(r.dt, 's')}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; drawPlot(); }
    self.rec = function () {
      const p = P(), r = solve(p), dt = sc.sc.cur.on && sc.m && sc.m.cur ? sc.m.cur.dt : null;
      S.d1rows.push({ ...p, vab: +cabs(r.Vab).toFixed(3), i1: +(cabs(r.I1) * 1e3).toFixed(3), i2: +(cabs(r.I2) * 1e3).toFixed(3), pab: +r.Pab.toFixed(4), dt }); save(); table();
      Lab.toast('Recorded: I₁ = ' + num(cabs(r.I1) * 1e3, 2) + ' mA' + (dt == null ? '' : ', Δt = ' + eng(dt, 's')));
    };
    $('#d1rec').onclick = self.rec; $('#d1del').onclick = () => { S.d1rows.pop(); save(); table(); };
    $('#d1csv').onclick = () => Lab.downloadCSV('hafta06_deney1.csv', ['#', 'k', 'secondary', 'Vs (V)', 'Vab (V)', 'I1 (mA)', 'I2 (mA)', 'Pab (W)', 'dt (s)'], S.d1rows.map((r, i) => [i + 1, r.k, r.load, r.V, r.vab, r.i1, r.i2, r.pab, r.dt == null ? '' : +r.dt.toExponential(4)]));
    table();
    self.phaseOk = (r) => { if (r.dt == null) return false; const x = solve(r), T = (2 * Math.PI) / W; return Math.abs(wrap((360 * r.dt) / T - (cang(x.Vab) - cang(x.I1)))) < 3; };
    self.P = P; self.solve = solve;
    return self;
  })();
  XP.d1 = D1;
  const d1std = (r) => r.V === 300 && near(r.k, 0.5, 1e-9) && r.load === 'zl';
  steps('d1', [
    { t: 'Example 1.35 setting: <b>V<sub>s</sub> = 300 V, k = 0.5</b>, load 800 Ω + 1 µF.', test: () => d1std(D1.P()) },
    { t: 'Read the meters at this setting and <b>record</b>.', test: () => S.d1rows.some(d1std) },
    { t: 'Put CURSOR A on a v<sub>ab</sub> peak and B on the next i<sub>1</sub> peak, then record (for the phase angle θ).', test: () => S.d1rows.some((r) => d1std(r) && D1.phaseOk(r)) },
    { t: 'Leave the secondary <b>open</b> and record: do you get Z<sub>ab</sub> = R<sub>1</sub> + jωL<sub>1</sub>?', test: () => S.d1rows.some((r) => r.load === 'open' && r.V === 300) },
    { t: 'Short the capacitor (<b>C shorted</b>) and record at k = 0.5 and 300 V together with a phase measurement.', test: () => S.d1rows.some((r) => r.load === 'zr' && r.V === 300 && near(r.k, 0.5, 1e-9) && D1.phaseOk(r)) },
    { t: 'With load 800 Ω + 1 µF at 300 V, record at least <b>5 different k</b> values and turn on the theoretical curve.', test: () => new Set(S.d1rows.filter((r) => r.load === 'zl' && r.V === 300).map((r) => r.k.toFixed(2))).size >= 5 && !!S.fl.d1theo },
  ]);
  const X135 = D1.solve({ V: 300, k: 0.5, load: 'zl' }), X135c = D1.solve({ V: 300, k: 0.5, load: 'zr' });
  numq('d1', '#d1Q', { id: 'd1q1', q: 'At the Example 1.35 setting, what is the primary current I<sub>1</sub> in mA (rms)?', answer: cabs(X135.I1) * 1e3, tol: 1.5, unit: 'mA', explain: 'I<sub>1</sub> = 300/(1500 + j4500) = 63.25∠−71.57° mA.', hint: 'The ammeter reading.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'From your measurements (V<sub>ab</sub>, I<sub>1</sub>, θ), what is the real part Re(Z<sub>r</sub>) of the reflected impedance in ohms?', answer: X135.Zr[0], tol: 3, unit: 'Ω', explain: 'Z<sub>ab</sub> = |V<sub>ab</sub>/I<sub>1</sub>|∠θ ≈ 1000 + j4400 Ω; Z<sub>r</sub> = Z<sub>ab</sub> − (200 + j3600) = 800 + j800 Ω.', hint: 'θ = 360°·Δt/T, T = 2π/400 = 15.71 ms. Convert Z<sub>ab</sub> to rectangular form.' });
  numq('d1', '#d1Q', { id: 'd1q3', q: 'With C shorted, what is Im(Z<sub>r</sub>) in ohms from your measurement? (with sign)', answer: X135c.Zr[1], tol: 4, unit: 'Ω', explain: 'Z<sub>22</sub> = 900 + j1600 (inductive) ⇒ Z<sub>r</sub> = 384.6 − j683.7 Ω: the reflected reactance is capacitive.', hint: 'This time, is the imaginary part of Z<sub>ab</sub> smaller or larger than 3600?' });
  numq('d1', '#d1Q', { id: 'd1q4', q: 'At the Example 1.35 setting, what power in W does the wattmeter show at terminals a–b?', answer: X135.Pab, tol: 2, unit: 'W', explain: 'P<sub>ab</sub> = |I<sub>1</sub>|²·200 + |I<sub>2</sub>|²·900 = 0.80 + 3.20 = 4.0 W. With the 2 W in the source internal resistance the total is 6 W (lecture notes).', hint: 'The power analyser reading; for a check, the sum of I²R.' });
  mcq('d1', '#d1Q', { id: 'd1q5', q: 'If k is doubled (everything else the same), how does Z<sub>r</sub> change?', opts: ['It doubles', 'It quadruples', 'It does not change', 'It halves'], correct: 1, explain: 'Z<sub>r</sub> = ω²M²/Z<sub>22</sub> ve M ∝ k ⇒ Z<sub>r</sub> ∝ k².', hint: 'M = k√(L<sub>1</sub>L<sub>2</sub>), and Z<sub>r</sub> is proportional to the square of M.' });
  mcq('d1', '#d1Q', { id: 'd1q6', q: 'Although the load is capacitive (Example 1.35), why did the imaginary part of Z<sub>ab</sub> <b>increase</b> relative to R<sub>1</sub> + jωL<sub>1</sub>?', opts: ['Measurement error', 'Z<sub>r</sub> ∝ 1/Z<sub>22</sub>: because the conjugate is taken, a capacitive secondary appears inductive at the primary', 'The capacitor behaves inductively', 'The source impedance is inductive'], correct: 1, explain: '1/(R − jX) = (R + jX)/|Z|²: the sign flips.', hint: 'Conjugate of the denominator.' });

  /* ================= DENEY 2 · Boşta ve kısa devre ================= */
  const D2 = (() => {
    const tp = S.tp, In = 100 / 230, W = 2 * Math.PI * 50, FUSE = 0.8;
    const box = $('#d2inst');
    const iso = inst(box, 'ISOLATION TRANSFORMER 230/230 V', false);
    segGroup(iso.c, [[true, 'IN CIRCUIT'], [false, 'BYPASS']], S.d2iso === true, (v) => { if (S.d2on) { Lab.toast('Switch POWER off first.'); return; } S.d2iso = v; save(); self.dirty = true; });
    const vr = inst(box, 'VARIAC 0–250 V');
    const kV = new Lab.Knob(vr.c, { label: 'V_1 (rms)', min: 0, max: 250, step: 0.5, value: S.d2V ?? 0, dark: true, size: 62, fmt: (v) => num(v, 1) + ' V', onChange: (v) => { S.d2V = v; save(); self.dirty = true; } });
    const sw = inst(box, 'DISTRIBUTION BOX · 0.8 A T');
    const led = document.createElement('span'); led.className = 'led'; sw.el.querySelector('.brand span:last-child').appendChild(led);
    const bOn = segBtn(sw.c, 'POWER', !!S.d2on), bF = segBtn(sw.c, 'Replace fuse', false);
    const md = inst(box, 'SECONDARY CONNECTION', false);
    const mb = segGroup(md.c, [['oc', 'Open (no load)'], ['sc', 'Short circuit (through A)']], S.d2mode || 'oc', (v) => {
      if (S.d2on) { Lab.toast('⚠ Never change connections with power on! Switch POWER off first.', 4000); mb.forEach((b, i) => b.classList.toggle('on', ['oc', 'sc'][i] === (S.d2mode || 'oc'))); return; }
      S.d2mode = v; save(); self.dirty = true;
    });
    const mt = inst(box, 'POWER ANALYSER (primary) · SECONDARY METER');
    const mV = lcd(mt.el, 'V<sub>1</sub> rms', 'V', 100), mI = lcd(mt.el, 'I<sub>1</sub> rms', 'mA', 100), mP = lcd(mt.el, 'P<sub>1</sub>', 'W', 100), mS = lcd(mt.el, 'V<sub>2</sub> rms', 'V', 100);
    const Z1 = [tp.R1, tp.X1], Z2 = [tp.R2, tp.X2], Zm = cinv([1 / tp.Rc, -1 / tp.Xm]);
    function solve(V, mode) {
      if (mode === 'oc') { const I1 = cdiv([V, 0], cadd(Z1, Zm)), Em = cmul(I1, Zm); return { I1, V2: cabs(Em) / tp.a, I2: 0, P: V * I1[0] }; }
      const Zp = cinv(cadd(cinv(Zm), cinv(Z2))), I1 = cdiv([V, 0], cadd(Z1, Zp)), Em = cmul(I1, Zp);
      return { I1, V2: 0, I2: (cabs(Em) / cabs(Z2)) * tp.a, P: V * I1[0], Zin: cadd(Z1, Zp) };
    }
    const P = () => ({ V: kV.value, mode: S.d2mode || 'oc', on: !!S.d2on, iso: S.d2iso === true });
    bOn.onclick = () => {
      if (S.d2fuse) return Lab.toast('The fuse has blown. Switch the power off, replace the fuse and find your mistake.', 3500);
      if (!S.d2on && S.d2iso !== true) return Lab.toast('⚠ Isolation transformer bypassed! The oscilloscope and instruments must float with respect to the mains: switch the isolation transformer in first.', 4500);
      S.d2on = !S.d2on;
      if (S.d2on && (S.d2mode || 'oc') === 'sc') { if (kV.value <= 5) { S.fl.d2scSafe = true; } else Lab.toast('⚠ The variac was not at zero in the short-circuit test! In reality the current would jump instantly.', 4500); }
      bOn.classList.toggle('on', S.d2on); save(); self.dirty = true;
    };
    bF.onclick = () => { if (S.d2on) return Lab.toast('Switch the power off first.'); if (!S.d2fuse) return Lab.toast('The fuse is intact.'); S.d2fuse = false; save(); self.dirty = true; Lab.toast('A new 0.8 A time-delay fuse has been fitted.'); };
    // şema
    const g = $('#d2sch');
    sch.src(g, 50, 125); sch.t(g, 50, 172, '230 V 50 Hz', 'lbl');
    sch.w(g, [[50, 105], [50, 60], [110, 60]]); sch.w(g, [[50, 145], [50, 200], [300, 200], [300, 180]]);
    E('rect', { x: 110, y: 45, width: 60, height: 30, class: 'w', fill: '#fff' }, g); sch.t(g, 140, 65, 'W', 'val');
    sch.w(g, [[170, 60], [200, 60]]); E('circle', { cx: 215, cy: 60, r: 14, class: 'w', fill: '#fff' }, g); sch.t(g, 215, 65, 'A', 'val');
    sch.w(g, [[229, 60], [300, 60], [300, 80]]); E('circle', { cx: 255, cy: 130, r: 14, class: 'w', fill: '#fff' }, g); sch.t(g, 255, 135, 'V', 'val'); sch.w(g, [[255, 60], [255, 116]]); sch.w(g, [[255, 144], [255, 200]]);
    xfmr(g, 300, 380, 80, 180, 'iron'); sch.t(g, 340, 225, '230/24 V · 100 VA', 'lbl');
    sch.w(g, [[380, 80], [380, 60], [480, 60]]); sch.w(g, [[380, 180], [380, 200], [480, 200]]);
    const gs = E('g', {}, g); const tSt = sch.t(g, 600, 30, '', 'val');
    let lastM = null;
    function drawSec(m) {
      gs.innerHTML = '';
      if (m === 'oc') { sch.w(gs, [[480, 60], [520, 60], [520, 116]]); E('circle', { cx: 520, cy: 130, r: 14, class: 'w', fill: '#fff' }, gs); sch.t(gs, 520, 135, 'V', 'val'); sch.w(gs, [[520, 144], [520, 200], [480, 200]]); sch.t(gs, 545, 135, 'open secondary: terminals live!', 'lbl', 'start').style.fill = '#c62828'; }
      else { sch.w(gs, [[480, 60], [520, 60], [520, 116]]); E('circle', { cx: 520, cy: 130, r: 14, class: 'w', fill: '#fff' }, gs); sch.t(gs, 520, 135, 'A', 'val'); sch.w(gs, [[520, 144], [520, 200], [480, 200]]); sch.t(gs, 545, 135, 'short circuit through ammeter', 'lbl', 'start'); }
    }
    const self = { dirty: true };
    self.update = function () {
      if (!self.dirty) return; self.dirty = false;
      const p = P();
      if (p.mode !== lastM) { drawSec(p.mode); lastM = p.mode; mS(0, p.mode === 'oc' ? 'V' : 'A'); }
      bOn.classList.toggle('on', p.on); led.classList.toggle('on', p.on); led.classList.toggle('g', p.on);
      tSt.textContent = S.d2fuse ? 'FUSE BLOWN' : p.on ? 'POWER ON' : 'no power'; tSt.style.fill = S.d2fuse || p.on ? '#c62828' : '#1a8a4a';
      if (!p.on) { mV('0.0'); mI('0.0'); mP('0.00'); mS('0.00', p.mode === 'oc' ? 'V' : 'A'); return; }
      const r = solve(p.V, p.mode), i1 = cabs(r.I1);
      if (i1 > FUSE) { S.d2on = false; S.d2fuse = true; save(); Lab.toast('💥 The fuse blew! I₁ = ' + num(i1, 2) + ' A > 0.8 A. In the short-circuit test, raise the variac slowly from zero.', 5000); self.dirty = true; return; }
      mV(num(p.V, 1)); mI(num(i1 * 1e3, 1)); mP(num(r.P, 3));
      if (p.mode === 'oc') mS(num(r.V2, 2), 'V'); else mS(num(r.I2, 3), 'A');
    };
    const tbody = $('#d2tab tbody');
    function table() { tbody.innerHTML = S.d2rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.mode === 'oc' ? 'open circuit' : 'short circuit'}</td><td>${num(r.V, 1)}</td><td>${num(r.I1 * 1e3, 1)}</td><td>${num(r.P, 3)}</td><td>${r.mode === 'oc' ? num(r.V2, 2) : '—'}</td><td>${r.mode === 'sc' ? num(r.I2, 3) : '—'}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; }
    self.rec = function () {
      const p = P(); if (!p.on) return Lab.toast('No power: the meters read zero.');
      const r = solve(p.V, p.mode);
      S.d2rows.push({ mode: p.mode, V: p.V, I1: +cabs(r.I1).toFixed(5), P: +r.P.toFixed(4), V2: +r.V2.toFixed(3), I2: +r.I2.toFixed(4) }); save(); table();
      Lab.toast('Recorded: ' + (p.mode === 'oc' ? 'open circuit' : 'short circuit') + ', P₁ = ' + num(r.P, 3) + ' W');
    };
    $('#d2rec').onclick = self.rec; $('#d2del').onclick = () => { S.d2rows.pop(); save(); table(); };
    $('#d2csv').onclick = () => Lab.downloadCSV('hafta06_deney2.csv', ['#', 'test', 'V1 (V)', 'I1 (A)', 'P1 (W)', 'V2 (V)', 'I2 (A)'], S.d2rows.map((r, i) => [i + 1, r.mode === 'oc' ? 'open circuit' : 'short circuit', r.V, r.I1, r.P, r.V2, r.I2]));
    table();
    if (S.d2on && S.d2iso !== true) S.d2on = false;
    self.solve = solve; self.In = In;
    return self;
  })();
  XP.d2 = D2;
  steps('d2', [
    { t: 'Switch the <b>isolation transformer</b> in, leave the secondary <b>open</b>, set the variac to 230 V, apply power and <b>record</b> (open-circuit test).', test: () => S.d2rows.some((r) => r.mode === 'oc' && near(r.V, 230, 2)) },
    { t: 'Switch the power off, change the secondary to the <b>short-circuit</b> connection, turn the variac down to <b>0 V</b>, and only then apply power.', test: () => !!S.fl.d2scSafe },
    { t: 'Slowly raise the variac to bring the primary current to the <b>rated current</b> (100 VA/230 V = 435 mA, ±3%) and record.', test: () => S.d2rows.some((r) => r.mode === 'sc' && near(r.I1, D2.In, 0.03 * D2.In)) },
    { t: 'In the short-circuit test record at least <b>3 different current</b> points: does P<sub>1</sub> grow with the square of the current?', test: () => new Set(S.d2rows.filter((r) => r.mode === 'sc').map((r) => r.V)).size >= 3 },
  ]);
  const OC = D2.solve(230, 'oc'), SCz = D2.solve(10, 'sc').Zin;
  numq('d2', '#d2Q', { id: 'd2q1', q: 'From your open-circuit test measurement, what is the turns ratio N<sub>1</sub>/N<sub>2</sub> ≈ V<sub>1</sub>/V<sub>2</sub>?', answer: 230 / OC.V2, tol: 1, unit: '', explain: 'Since the no-load current is very small, the voltage drop in the primary winding is negligible: V<sub>1</sub>/V<sub>2</sub> ≈ N<sub>1</sub>/N<sub>2</sub>. Compare with 230/24 = 9.58 on the label.', hint: 'V<sub>1</sub>/V<sub>2</sub> in the open-circuit row.' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'From the open-circuit test, what is the parallel resistance representing the iron loss, R<sub>c</sub> ≈ V<sub>1</sub>²/P<sub>0</sub>, in kΩ?', answer: (230 * 230) / OC.P / 1e3, tol: 3, unit: 'kΩ', explain: 'The no-load power is almost entirely core loss (hysteresis + eddy current).', hint: '230² / P<sub>0</sub>, then in kΩ.' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 'From the short-circuit test, what is the equivalent resistance referred to the primary, R<sub>eq</sub> = P<sub>k</sub>/I<sub>k</sub>², in ohms?', answer: SCz[0], tol: 3, unit: 'Ω', explain: 'R<sub>eq</sub> ≈ R<sub>1</sub> + R<sub>2</sub>′ (the secondary resistance is referred to the primary with a²). In small transformers most of u<sub>k</sub> comes from resistance.', hint: 'Use the row at rated current; convert the current to A.' });
  numq('d2', '#d2Q', { id: 'd2q4', q: 'What is the equivalent reactance X<sub>eq</sub> = √(Z<sub>eq</sub>² − R<sub>eq</sub>²) in ohms? (Z<sub>eq</sub> = V<sub>k</sub>/I<sub>k</sub>)', answer: SCz[1], tol: 5, unit: 'Ω', explain: 'X<sub>eq</sub> ≈ X<sub>1</sub> + X<sub>2</sub>′: it represents the leakage flux of the windings.', hint: 'First Z<sub>eq</sub> = V<sub>k</sub>/I<sub>k</sub>.' });
  numq('d2', '#d2Q', { id: 'd2q5', q: 'What is the short-circuit voltage u<sub>k</sub> = V<sub>k</sub>/V<sub>n</sub> in percent?', answer: (D2.In * cabs(SCz) / 230) * 100, tol: 3, unit: '%', explain: 'u<sub>k</sub> determines how many times the rated current flows when the secondary is shorted: I<sub>sc</sub> ≈ I<sub>n</sub>/u<sub>k</sub>.', hint: 'V<sub>k</sub> at rated current / 230 × 100' });
  mcq('d2', '#d2Q', { id: 'd2q6', q: 'Why is almost all of the power shown by the wattmeter in the short-circuit test copper loss?', opts: ['The core saturates in a short circuit', 'Since the applied voltage is small, the flux and hence the iron loss (∝ V²) are negligibly small', 'The secondary current is zero', 'Iron loss occurs only in DC'], correct: 1, explain: 'Iron loss is approximately V²/R<sub>c</sub>; at 8% voltage it is about 0.6% of the no-load loss.', hint: 'What does iron loss depend on?' });

  /* ================= DENEY 3 · Empedans uydurma ================= */
  const D3 = (() => {
    const VS = 40;
    const box = $('#d3inst');
    const gen = inst(box, 'SOURCE 40 V rms · INTERNAL RESISTANCE');
    const kRs = new Lab.Knob(gen.c, { label: 'R_s', list: [50, 200, 800, 3200], value: S.d3Rs ?? 800, dark: true, fmt: Lab.ohm, onChange: (v) => { S.d3Rs = v; save(); self.dirty = true; } });
    const tr = inst(box, 'OUTPUT TRANSFORMER · N<sub>1</sub>:N<sub>2</sub>', false);
    segGroup(tr.c, [[true, 'With transformer'], [false, 'Without transformer (direct)']], S.d3tr !== false, (v) => { S.d3tr = v; save(); self.dirty = true; });
    const kN = new Lab.Knob(tr.c, { label: 'N₁:N₂', list: [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 20, 25, 30, 40], value: S.d3n ?? 4, size: 56, fmt: (v) => v + ':1', onChange: (v) => { S.d3n = v; save(); self.dirty = true; } });
    const sp = inst(box, 'LOUDSPEAKER', false);
    const kRL = new Lab.Knob(sp.c, { label: 'R_L', list: [4, 8, 16], value: S.d3RL ?? 8, fmt: Lab.ohm, onChange: (v) => { S.d3RL = v; save(); self.dirty = true; } });
    const mt = inst(box, 'AC METERS');
    const mI1 = lcd(mt.el, 'I<sub>1</sub> rms', 'mA', 100), mV2 = lcd(mt.el, 'V<sub>2</sub> rms', 'V', 100), mI2 = lcd(mt.el, 'I<sub>2</sub> rms', 'mA', 100);
    const P = () => ({ tr: S.d3tr !== false, Rs: kRs.value, RL: kRL.value, n: kN.value });
    function solve(p) {
      if (!p.tr) { const I = VS / (p.Rs + p.RL); return { i1: I, i2: I, v2: I * p.RL }; }
      const I1 = VS / (p.Rs + p.n * p.n * p.RL), I2 = p.n * I1; return { i1: I1, i2: I2, v2: I2 * p.RL };
    }
    const g = $('#d3sch');
    sch.src(g, 50, 120); sch.w(g, [[50, 100], [50, 50], [80, 50]]); sch.rH(g, 80, 180, 50); sch.t(g, 130, 32, sub('R', 's'));
    sch.w(g, [[50, 140], [50, 180], [280, 180], [280, 160]]); sch.t(g, 50, 210, '40 V rms', 'lbl');
    const gt = E('g', {}, g);
    sch.w(g, [[180, 50], [280, 50], [280, 70]]);
    const tN = sch.t(g, 320, 32, '', 'val'), tR = sch.t(g, 130, 75, '', 'lbl');
    function drawT(on) {
      gt.innerHTML = '';
      if (on) { xfmr(gt, 280, 360, 70, 160, 'iron'); bigdot(gt, 268, 82); bigdot(gt, 372, 82); sch.w(gt, [[360, 70], [360, 50], [520, 50], [520, 80]]); sch.w(gt, [[360, 160], [360, 180], [520, 180], [520, 150]]); }
      else { sch.w(gt, [[280, 70], [280, 50], [520, 50], [520, 80]]); sch.w(gt, [[280, 160], [280, 180], [520, 180], [520, 150]]); sch.w(gt, [[280, 70], [280, 160]]).style.display = 'none'; }
      E('rect', { x: 508, y: 80, width: 24, height: 70, class: 'w', fill: '#fff' }, gt);
      E('path', { d: 'M532,95 L560,72 L560,158 L532,135 Z', class: 'w', fill: '#eef' }, gt);
    }
    const self = { dirty: true }; let lastTr = null;
    self.update = function () {
      if (!self.dirty) return; self.dirty = false;
      const p = P(), r = solve(p);
      if (p.tr !== lastTr) { drawT(p.tr); lastTr = p.tr; }
      tN.textContent = p.tr ? p.n + ':1' : 'no transformer'; tR.textContent = Lab.ohm(p.Rs);
      mI1(num(r.i1 * 1e3, 2)); mV2(num(r.v2, 3)); mI2(num(r.i2 * 1e3, 1));
      drawPlot();
    };
    const plot = new Lab.Plot($('#d3plot'), { xlabel: 'N₁/N₂', ylabel: 'P_L (mW)' });
    function drawPlot() {
      const p = P(), ser = [], PLf = (n) => { const I1 = VS / (p.Rs + n * n * p.RL); return (n * I1) ** 2 * p.RL * 1e3; };
      if ($('#d3theo').checked) { const pts = []; for (let i = 0; i <= 200; i++) { const n = 1 + (i * 39) / 200; pts.push([n, PLf(n)]); } ser.push({ pts, line: true, color: '#e07a10', dash: [6, 4] }); }
      ser.push({ pts: S.d3rows.filter((r) => r.Rs === p.Rs && r.RL === p.RL).map((r) => [r.tr ? r.n : 1, r.pl]), dots: true, color: '#0b5cad' });
      plot.draw(ser, [0, 40], [0, ((VS * VS) / (4 * p.Rs)) * 1e3 * 1.1]);
    }
    $('#d3theo').onchange = () => { if ($('#d3theo').checked) { S.fl.d3theo = true; save(); } drawPlot(); };
    const tbody = $('#d3tab tbody');
    function table() { tbody.innerHTML = S.d3rows.map((r, i) => `<tr><td>${i + 1}</td><td>${Lab.ohm(r.Rs)}</td><td>${Lab.ohm(r.RL)}</td><td>${r.tr ? r.n + ':1' : 'none'}</td><td>${num(r.i1, 2)}</td><td>${num(r.v2, 3)}</td><td>${num(r.i2, 1)}</td><td>${num(r.pl, 1)}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; drawPlot(); }
    self.rec = function () {
      const p = P(), r = solve(p);
      S.d3rows.push({ ...p, i1: r.i1 * 1e3, v2: r.v2, i2: r.i2 * 1e3, pl: r.v2 * r.i2 * 1e3 }); save(); table();
      Lab.toast('Recorded: V₂ = ' + num(r.v2, 3) + ' V, I₂ = ' + num(r.i2 * 1e3, 1) + ' mA');
    };
    $('#d3rec').onclick = self.rec; $('#d3del').onclick = () => { S.d3rows.pop(); save(); table(); };
    $('#d3csv').onclick = () => Lab.downloadCSV('hafta06_deney3.csv', ['#', 'Rs (ohm)', 'RL (ohm)', 'N1/N2', 'I1 (mA)', 'V2 (V)', 'I2 (mA)', 'PL (mW)'], S.d3rows.map((r, i) => [i + 1, r.Rs, r.RL, r.tr ? r.n : 'no transformer', +r.i1.toFixed(3), +r.v2.toFixed(4), +r.i2.toFixed(2), +r.pl.toFixed(2)]));
    table();
    return self;
  })();
  XP.d3 = D3;
  const r88 = (r) => r.Rs === 800 && r.RL === 8;
  steps('d3', [
    { t: 'R<sub>s</sub> = 800 Ω, R<sub>L</sub> = 8 Ω: first connect the loudspeaker <b>without a transformer</b> and record.', test: () => S.d3rows.some((r) => r88(r) && !r.tr) },
    { t: 'With the transformer, try and record at least <b>5 different turns ratios</b>.', test: () => new Set(S.d3rows.filter((r) => r88(r) && r.tr).map((r) => r.n)).size >= 5 },
    { t: 'Turn on the <b>theoretical curve</b>: where is the peak, and do your measurements agree with the curve?', test: () => !!S.fl.d3theo },
    { t: 'Design: for a <b>R<sub>L</sub> = 4 Ω</b> loudspeaker (R<sub>s</sub> = 800 Ω), select the best ratio in the list and record.', test: () => S.d3rows.some((r) => r.tr && r.Rs === 800 && r.RL === 4 && r.n === 14) },
    { t: 'Design: for <b>R<sub>s</sub> = 200 Ω</b>, R<sub>L</sub> = 8 Ω, find the best ratio and record.', test: () => S.d3rows.some((r) => r.tr && r.Rs === 200 && r.RL === 8 && r.n === 5) },
  ]);
  numq('d3', '#d3Q', { id: 'd3q1', q: 'For R<sub>s</sub> = 800 Ω, R<sub>L</sub> = 8 Ω, what is the largest loudspeaker power you measured, in W?', answer: 0.5, tol: 1.5, unit: 'W', explain: 'At N<sub>1</sub>:N<sub>2</sub> = 10:1, I<sub>2</sub> = 250 mA, V<sub>2</sub> = 2 V, P<sub>L</sub> = 0.5 W.', hint: 'The largest P<sub>L</sub> in the table; convert mW to W.' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'What is the ratio (gain) of the matched power to the power without a transformer?', answer: 0.5 / ((40 / 808) ** 2 * 8), tol: 2, unit: 'times', explain: 'Without transformer 19.6 mW; with matching 500 mW ⇒ ≈ 25.5 times.', hint: 'Take the ratio of the two P<sub>L</sub> values.' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'At matching, what is the primary current I<sub>1</sub> in mA?', answer: 25, tol: 1.5, unit: 'mA', explain: 'R<sub>IN</sub> = 800 Ω ⇒ I<sub>1</sub> = 40/1600 = 25 mA; I<sub>2</sub> = 10·I<sub>1</sub> = 250 mA.', hint: 'The N<sub>1</sub>:N<sub>2</sub> = 10:1 row.' });
  numq('d3', '#d3Q', { id: 'd3q4', q: 'For R<sub>L</sub> = 4 Ω, what is the theoretical optimum N<sub>1</sub>/N<sub>2</sub>? (R<sub>s</sub> = 800 Ω)', answer: Math.sqrt(200), tol: 1.5, unit: '', explain: '√(800/4) = 14.14; the nearest ratio in the list is 14:1. Since the peak of the curve is broad, a small deviation reduces the power very little.', hint: '√(R<sub>s</sub>/R<sub>L</sub>)' });
  mcq('d3', '#d3Q', { id: 'd3q5', q: 'At matching, what percentage of the power delivered by the source reaches the loudspeaker?', opts: ['100%', '50%', '25%', '10%'], correct: 1, explain: 'When R<sub>IN</sub> = R<sub>s</sub> the same current flows through both, so the power is shared half and half (1 W source, 0.5 W loudspeaker).', hint: 'R<sub>s</sub> and R<sub>IN</sub> are equal.' });
  mcq('d3', '#d3Q', { id: 'd3q6', q: 'For a 10:1 transformer with an 8 Ω load a student writes Z<sub>IN</sub> = a²Z<sub>L</sub> (a = 0.1). What does the student get, and what is correct?', opts: ['Gets 0.08 Ω; correct is 800 Ω (divide by a²)', 'Gets 800 Ω; correct is 0.08 Ω', 'Gets 80 Ω; correct is 8 Ω', 'The student is right'], correct: 0, explain: 'If a = N<sub>2</sub>/N<sub>1</sub>, then Z<sub>IN</sub> = Z<sub>L</sub>/a². A step-down transformer makes the load look large to the source.', hint: 'Lecture notes: “common mistake: inverting the turns ratio”.' });

  /* ================= DENEY 4 · Polarite testi ================= */
  const D4 = (() => {
    const box = $('#d4inst');
    const vr = inst(box, 'VARIAC (low voltage)');
    const kV = new Lab.Knob(vr.c, { label: 'V_variac', min: 0, max: 40, step: 0.5, value: S.d4V ?? 0, dark: true, size: 58, fmt: (v) => num(v, 1) + ' V', onChange: (v) => { S.d4V = v; save(); self.dirty = true; } });
    const jb = inst(box, 'JUMPER LEAD', false);
    const JM = [['none', 'None'], ['H2X2', 'H2–X2'], ['H2X1', 'H2–X1']];
    segGroup(jb.c, JM, S.d4j || 'none', (v) => { S.d4j = v; save(); self.dirty = true; checkShort(); });
    const vm = inst(box, 'AC VOLTMETER'); const mV = lcd(vm.el, 'V<sub>AC</sub> rms', 'V', 130);
    const PB = [['H', 'H1–H2'], ['X', 'X1–X2'], ['T', 'H1–free terminal']];
    segGroup(vm.c, PB, S.d4p || 'H', (v) => { S.d4p = v; save(); self.dirty = true; });
    const sc = mkScope($('#d4scopeHost'), { v1: 20, v2: 2, t: 5e-3 });
    const pr = inst($('#d4scopeHost'), 'PROBE CONNECTION', false);
    pr.el.style.alignSelf = 'flex-start';
    segGroup(pr.c, [[false, 'Probes disconnected'], [true, 'CH1: H1/H2(ground) · CH2: X1/X2(ground)']], !!S.d4scope, (v) => { S.d4scope = v; save(); self.dirty = true; checkShort(); });
    function checkShort() {
      if (S.d4scope && S.d4j === 'H2X1') {
        Lab.toast('⚠ The probe grounds join H2 and X2, and the jumper connects H2–X1: the secondary (X1–X2) is SHORT-CIRCUITED through the probe ground! The probes have been disconnected.', 6000);
        S.d4scope = false; save(); const bs = $$('.seg-btn', pr.c); bs[0].classList.add('on'); bs[1].classList.remove('on');
      }
    }
    const s = () => (S.pdot ? 1 : -1);
    const P = () => ({ V: kV.value, j: S.d4j || 'none', p: S.d4p || 'H' });
    function read(p) {
      const v1 = p.V, v2 = (s() * p.V) / S.pn; // X1−X2 fazörü (gerçel, ±)
      if (p.p === 'H') return v1; if (p.p === 'X') return Math.abs(v2);
      if (p.j === 'none') return null;
      return Math.abs(p.j === 'H2X2' ? v1 - v2 : v1 + v2);
    }
    // şema
    const g = $('#d4sch');
    xfmr(g, 260, 340, 60, 180, 'iron');
    sch.w(g, [[260, 60], [200, 60]]); sch.w(g, [[260, 180], [200, 180]]); sch.w(g, [[340, 60], [400, 60]]); sch.w(g, [[340, 180], [400, 180]]);
    [[200, 60, 'H1'], [200, 180, 'H2'], [400, 60, 'X1'], [400, 180, 'X2']].forEach(([x, y, l]) => { E('circle', { cx: x, cy: y, r: 6, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g); sch.t(g, x + (x < 300 ? -12 : 12), y + 5, l, 'val', x < 300 ? 'end' : 'start'); });
    bigdot(g, 248, 72); sch.t(g, 360, 80, '?', 'val'); sch.t(g, 360, 172, '?', 'val');
    sch.src(g, 90, 120); sch.w(g, [[90, 100], [90, 60], [194, 60]]); sch.w(g, [[90, 140], [90, 180], [194, 180]]); sch.t(g, 90, 215, 'variac', 'lbl');
    const gj = E('g', {}, g), tRd = sch.t(g, 600, 30, '', 'val');
    let lastJ = null;
    function drawJ(j) {
      gj.innerHTML = '';
      if (j === 'H2X2') E('path', { d: 'M200,186 Q300,240 400,186', fill: 'none', stroke: '#e07a10', 'stroke-width': 3 }, gj);
      if (j === 'H2X1') E('path', { d: 'M200,186 Q300,250 470,200 Q500,110 406,60', fill: 'none', stroke: '#e07a10', 'stroke-width': 3 }, gj);
    }
    const self = { sc, dirty: true };
    self.update = function () {
      if (!self.dirty && !sc.dirty) return; self.dirty = sc.dirty = false;
      const p = P(), r = read(p);
      if (p.j !== lastJ) { drawJ(p.j); lastJ = p.j; }
      mV(r == null ? '— —' : num(r, 2)); tRd.textContent = 'Jumper: ' + (Object.fromEntries(JM))[p.j];
      const n = 1000, td = sc.sc.tdiv, w = 2 * Math.PI * 50;
      const y1 = S.d4scope ? wave(n, td, [{ z: [p.V * SQ2, 0], w }]) : new Float64Array(n);
      const y2 = S.d4scope ? wave(n, td, [{ z: [(s() * p.V * SQ2) / S.pn, 0], w }]) : new Float64Array(n);
      if (S.d4scope && p.j === 'H2X2' && p.V > 0) { S.fl.d4scope = true; save(); }
      sc.draw({ n, y: [y1, y2] });
    };
    const tbody = $('#d4tab tbody'), PN = Object.fromEntries(PB), JN = Object.fromEntries(JM);
    function table() { tbody.innerHTML = S.d4rows.map((r, i) => `<tr><td>${i + 1}</td><td>${num(r.V, 1)}</td><td>${JN[r.j]}</td><td>${PN[r.p]}</td><td>${num(r.v, 3)}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; }
    self.rec = function () {
      const p = P(), r = read(p); if (r == null) return Lab.toast('No jumper: there is no closed circuit between H1 and the secondary, so the reading is meaningless.');
      S.d4rows.push({ ...p, v: +r.toFixed(4) }); save(); table(); Lab.toast('Recorded: ' + PN[p.p] + ' = ' + num(r, 2) + ' V');
    };
    $('#d4rec').onclick = self.rec; $('#d4del').onclick = () => { S.d4rows.pop(); save(); table(); };
    $('#d4csv').onclick = () => Lab.downloadCSV('hafta06_deney4.csv', ['#', 'V variac (V)', 'jumper', 'measurement', 'reading (V)'], S.d4rows.map((r, i) => [i + 1, r.V, r.j, r.p, r.v]));
    table();
    // karar
    const dec = $('#d4dec'); let pick = null;
    const sp = document.createElement('span'); sp.textContent = 'Secondary terminal with the same polarity as H1 (dotted):'; sp.style.fontSize = '14px'; dec.appendChild(sp);
    segGroup(dec, [['X1', 'X1'], ['X2', 'X2']], null, (v) => { pick = v; });
    const bc = document.createElement('button'); bc.className = 'btn small'; bc.textContent = 'Check decision'; dec.appendChild(bc);
    const fb = $('#d4decfb');
    const showFb = () => { if (S.fl.d4dot) { fb.className = 'fb ok'; fb.innerHTML = '✔ Correct: the dot is at terminal ' + (S.pdot ? 'X1' : 'X2') + '. Your measurements support this result.'; } };
    bc.onclick = () => {
      if (!pick) return Lab.toast('First select X1 or X2.');
      if (S.d4rows.filter((r) => r.p === 'T').length < 2) return Lab.toast('Before deciding, measure and record the test voltage with both jumper connections.');
      if ((pick === 'X1') === S.pdot) { S.fl.d4dot = true; save(); showFb(); }
      else { S.d4tries = (S.d4tries || 0) + 1; save(); fb.className = 'fb bad'; fb.innerHTML = '✘ This contradicts your measurements. If the reading with the H2–X2 jumper was V<sub>1</sub> − V<sub>2</sub>, H1 and X1 are positive at the same time; if it was V<sub>1</sub> + V<sub>2</sub>, the opposite. Also check the phases on the oscilloscope.'; }
    };
    showFb();
    return self;
  })();
  XP.d4 = D4;
  const okV = (r) => r.V >= 10 && r.V <= 30;
  steps('d4', [
    { t: 'Set the variac to <b>10–30 V</b>; measure and record the <b>H1–H2</b> and <b>X1–X2</b> voltages.', test: () => ['H', 'X'].every((k) => S.d4rows.some((r) => okV(r) && r.p === k)) },
    { t: 'Fit the <b>H2–X2</b> jumper and record the H1–free terminal (X1) voltage.', test: () => S.d4rows.some((r) => okV(r) && r.p === 'T' && r.j === 'H2X2') },
    { t: 'Change to the <b>H2–X1</b> jumper and record the H1–free terminal (X2) voltage.', test: () => S.d4rows.some((r) => okV(r) && r.p === 'T' && r.j === 'H2X1') },
    { t: 'Connect the probes with the H2–X2 jumper: are CH1 and CH2 <b>in phase or in antiphase?</b>', test: () => !!S.fl.d4scope },
    { t: '<b>Decide</b> which secondary terminal carries the dot.', test: () => !!S.fl.d4dot },
  ]);
  numq('d4', '#d4Q', { id: 'd4q1', q: 'From your measurements, what is the turns ratio N<sub>1</sub>/N<sub>2</sub> of this transformer?', answer: () => S.pn, tol: 1.5, unit: '', explain: 'N<sub>1</sub>/N<sub>2</sub> = V<sub>H1–H2</sub>/V<sub>X1–X2</sub>.', hint: 'Take the ratio of the two winding voltages at the same variac setting.' });
  numq('d4', '#d4Q', { id: 'd4q2', q: 'With the variac at 24 V, how many volts does the voltmeter show in the <b>additive</b> connection?', answer: () => 24 + 24 / S.pn, tol: 1, unit: 'V', explain: 'V<sub>1</sub> + V<sub>2</sub> = 24 + 24/(N<sub>1</sub>/N<sub>2</sub>). Which jumper is additive depends on the dot.', hint: 'Additive = the two winding voltages in series in the same direction.' });
  numq('d4', '#d4Q', { id: 'd4q3', q: 'Lecture notes p. 289: N<sub>1</sub> = 200, N<sub>2</sub> = 50, the + terminal of V<sub>1</sub> is undotted and that of V<sub>2</sub> is dotted. If V<sub>1</sub> = 120∠0° V, what is V<sub>2</sub> in volts? (with sign)', answer: -30, tol: 0, abs: 0.3, unit: 'V', explain: 'One + terminal is dotted and the other is not ⇒ V<sub>1</sub>/N<sub>1</sub> = −V<sub>2</sub>/N<sub>2</sub> ⇒ V<sub>2</sub> = −30 V.', hint: 'The rule looks at the dots, not at the layout.' });
  numq('d4', '#d4Q', { id: 'd4q4', q: 'In the same transformer I<sub>1</sub> enters the undotted terminal, I<sub>2</sub> enters the dotted terminal, and I<sub>1</sub> = 2∠−30° A. What is |I<sub>2</sub>| in amperes?', answer: 8, tol: 1, unit: 'A', explain: 'One enters (the undotted terminal) and the other enters the dotted one ⇒ different ⇒ N<sub>1</sub>I<sub>1</sub> = +N<sub>2</sub>I<sub>2</sub>, I<sub>2</sub> = 4·I<sub>1</sub> = 8∠−30° A.', hint: 'N<sub>1</sub>/N<sub>2</sub> = 4' });
  mcq('d4', '#d4Q', { id: 'd4q5', q: 'What happens if the secondaries of two identical transformers are connected in parallel without checking polarity and one is connected the wrong way round?', opts: ['The voltage doubles', 'The two secondaries short each other; a high circulating current heats the windings and the fuse blows', 'Nothing happens', 'The frequency changes'], correct: 1, explain: 'With reversed polarity the two source voltages add in series and only the small winding impedances limit the current.', hint: 'What is the net voltage around the loop?' });

  /* ================= DENEY 5 · Fazör diyagramı ================= */
  const D5 = (() => {
    const MODES = {
      e40: { name: 'Example 1.40 · parallel L–C–R', w0: 5000, ws: [2500, 5000, 10000], ch: ['i<sub>R</sub>', 'i<sub>s</sub>'], v: [1, 2], t: 2e-4 },
      e41: { name: 'Example 1.41 · series RL', w0: 2000, ws: [1000, 2000, 4000], ch: ['i', 'v<sub>s</sub>'], v: [1, 50], t: 5e-4 },
      e42: { name: 'Example 1.42 · series RC', w0: 1000, ws: [500, 1000, 2000], ch: ['v<sub>s</sub>', 'i'], v: [20, 0.1], t: 1e-3 },
      e43: { name: 'Example 1.43 · parallel RLC', w0: 2000, ws: [500, 1000, 2000, 4000], ch: ['v', 'i<sub>s</sub>'], v: [10, 2], t: 5e-4 },
    };
    const box = $('#d5inst');
    const md = inst(box, 'CIRCUIT SELECTION', false);
    S.d5mode = S.d5mode || 'e40';
    segGroup(md.c, Object.entries(MODES).map(([k, m]) => [k, m.name.split(' · ')[0]]), S.d5mode, (v) => { S.d5mode = v; S.d5w = MODES[v].w0; save(); mkW(); setScope(); drawSch(); self.dirty = true; });
    const ge = inst(box, 'GENERATOR · ω');
    const wh = document.createElement('div'); ge.c.appendChild(wh);
    let kW;
    const mkW = () => { wh.innerHTML = ''; const m = MODES[S.d5mode]; kW = new Lab.Knob(wh, { label: 'ω', list: m.ws, value: S.d5w ?? m.w0, dark: true, fmt: (v) => num(v, 0) + ' r/s', onChange: (v) => { S.d5w = v; save(); self.dirty = true; } }); };
    const rb = inst(box, 'R BOX (Example 1.40)', false);
    const kR = new Lab.Knob(rb.c, { label: 'R (log)', min: 0.05, max: 5, log: true, value: S.d5R ?? 1, size: 58, fmt: (v) => num(v, 3) + ' Ω', onChange: (v) => { S.d5R = v; save(); self.dirty = true; } });
    const sc = mkScope($('#d5scopeHost'), { v1: 1, v2: 2, t: 2e-4 });
    function setScope() { const m = MODES[S.d5mode]; sc.k1.set(m.v[0]); sc.k2.set(m.v[1]); sc.kt.set(m.t); }
    // her devrenin fazörleri (tepe değer); ch: [CH1, CH2]
    function model(mode, w, R) {
      const V = (re, im = 0) => [re, im];
      if (mode === 'e40') {
        const v = V(1), IR = [1 / R, 0], IL = cdiv(v, [0, w * 0.2e-3]), IC = cmul(v, [0, w * 800e-6]), Is = cadd(cadd(IR, IL), IC);
        return { ch: [IR, Is], list: [{ z: v, k: 'V', l: sub('V', 'm'), c: '#555' }, { z: IR, k: 'I', l: sub('I', 'R'), c: '#e07a10' }, { z: IL, k: 'I', l: sub('I', 'L'), c: '#1a8a4a' }, { z: IC, k: 'I', l: sub('I', 'C'), c: '#8a2be2' }, { z: Is, k: 'I', l: sub('I', 's'), c: '#0b5cad', tot: true }], chain: [IR, IC, IL] };
      }
      if (mode === 'e41') {
        const I = V(2), VR = cmul(I, [30, 0]), VL = cmul(I, [0, w * 0.02]), Vs = cadd(VR, VL);
        return { ch: [I, Vs], list: [{ z: I, k: 'I', l: 'I', c: '#555' }, { z: VR, k: 'V', l: sub('V', 'R'), c: '#e07a10' }, { z: VL, k: 'V', l: sub('V', 'L'), c: '#1a8a4a' }, { z: Vs, k: 'V', l: sub('V', 'S'), c: '#0b5cad', tot: true }], chain: [VR, VL] };
      }
      if (mode === 'e42') {
        const Vs = V(50), Z = [100, -1 / (w * 10e-6)], I = cdiv(Vs, Z), VR = cmul(I, [100, 0]), VC = cdiv(I, [0, w * 10e-6]);
        return { ch: [Vs, I], list: [{ z: I, k: 'I', l: 'I', c: '#555' }, { z: VR, k: 'V', l: sub('V', 'R'), c: '#e07a10' }, { z: VC, k: 'V', l: sub('V', 'C'), c: '#8a2be2' }, { z: Vs, k: 'V', l: sub('V', 'S'), c: '#0b5cad', tot: true }], chain: [VR, VC] };
      }
      const v = V(20), IR = [4, 0], IL = cdiv(v, [0, w * 5e-3]), IC = cmul(v, [0, w * 200e-6]), Is = cadd(cadd(IR, IL), IC);
      return { ch: [v, Is], list: [{ z: v, k: 'V', l: 'V', c: '#555' }, { z: IR, k: 'I', l: sub('I', 'R'), c: '#e07a10' }, { z: IL, k: 'I', l: sub('I', 'L'), c: '#1a8a4a' }, { z: IC, k: 'I', l: sub('I', 'C'), c: '#8a2be2' }, { z: Is, k: 'I', l: sub('I', 's'), c: '#0b5cad', tot: true }], chain: [IR, IC, IL] };
    }
    // canlı fazör paneli
    const ph = $('#d5ph'), O = 210;
    function arrow(g, a, b, col, w = 3, dash) {
      const [x1, y1] = a, [x2, y2] = b, L = Math.hypot(x2 - x1, y2 - y1); if (L < 1) return;
      const ux = (x2 - x1) / L, uy = (y2 - y1) / L;
      E('line', { x1, y1, x2: x2 - ux * 8, y2: y2 - uy * 8, stroke: col, 'stroke-width': w, 'stroke-dasharray': dash || '' }, g);
      E('path', { d: `M${x2},${y2} L${x2 - ux * 12 - uy * 5},${y2 - uy * 12 + ux * 5} L${x2 - ux * 12 + uy * 5},${y2 - uy * 12 - ux * 5} Z`, fill: col }, g);
    }
    function drawPh(m) {
      ph.innerHTML = '';
      E('line', { x1: 10, y1: O, x2: 410, y2: O, stroke: '#bbb' }, ph); E('line', { x1: O, y1: 10, x2: O, y2: 410, stroke: '#bbb' }, ph);
      sch.t(ph, 405, O - 6, 'Re', 'lbl', 'end'); sch.t(ph, O + 6, 22, 'Im', 'lbl', 'start');
      const mx = { V: 0, I: 0 }; m.list.forEach((p) => { mx[p.k] = Math.max(mx[p.k], cabs(p.z)); });
      if ($('#d5poly').checked) { const k = m.list.find((p) => p.z === m.chain[0]).k; let acc = [0, 0]; m.chain.forEach((z) => { acc = cadd(acc, z); mx[k] = Math.max(mx[k], cabs(acc)); }); }
      const P2 = (z, k) => [O + (z[0] / (mx[k] || 1)) * 170, O - (z[1] / (mx[k] || 1)) * 170];
      if ($('#d5poly').checked) {
        let acc = [0, 0]; const k = m.list.find((p) => p.z === m.chain[0]).k;
        m.chain.forEach((z) => { const nx = cadd(acc, z), col = m.list.find((p) => p.z === z).c; arrow(ph, P2(acc, k), P2(nx, k), col, 2, '5 3'); acc = nx; });
      }
      m.list.forEach((p) => { const b = P2(p.z, p.k); arrow(ph, [O, O], b, p.c, p.tot ? 4 : 3); const t = sch.t(ph, b[0] + (p.z[0] >= 0 ? 6 : -6), b[1] + (p.z[1] >= 0 ? -6 : 16), p.l, 'val', p.z[0] >= 0 ? 'start' : 'end'); t.style.fill = p.c; });
      sch.t(ph, 14, 405, 'Voltage and current arrows on separate scales', 'lbl', 'start').style.fontSize = '11px';
    }
    $('#d5poly').onchange = () => { if ($('#d5poly').checked) { S.fl.d5poly = true; save(); } self.dirty = true; };
    // devre şeması
    const gs = $('#d5sch');
    function drawSch() {
      gs.innerHTML = ''; const mode = S.d5mode;
      if (mode === 'e40' || mode === 'e43') {
        sch.w(gs, [[50, 40], [370, 40]]); sch.w(gs, [[50, 200], [370, 200]]);
        sch.isrc(gs, 50, 120); sch.w(gs, [[50, 40], [50, 100]]); sch.w(gs, [[50, 140], [50, 200]]);
        const xs = mode === 'e40' ? [[150, 'L'], [250, 'C'], [350, 'R']] : [[150, 'R'], [250, 'L'], [350, 'C']];
        xs.forEach(([x, t]) => { if (t === 'R') sch.rV(gs, x, 40, 200); if (t === 'L') sch.lV(gs, x, 40, 200); if (t === 'C') sch.cV(gs, x, 40, 200); sch.dot(gs, x, 40); sch.dot(gs, x, 200); });
        const lab = mode === 'e40' ? [[165, '0.2 mH'], [270, '800 µF'], [365, 'R = ?']] : [[165, '5 Ω'], [265, '5 mH'], [365, '200 µF']];
        lab.forEach(([x, t]) => sch.t(gs, x, 125, t, 'lbl', 'start'));
        sch.t(gs, 20, 125, sub('i', 's'), 'lbl', 'end'); sch.gnd(gs, 210, 200);
      } else {
        sch.src(gs, 60, 120); sch.w(gs, [[60, 100], [60, 50], [130, 50]]); sch.rH(gs, 130, 230, 50); sch.w(gs, [[230, 50], [320, 50], [320, 70]]);
        if (mode === 'e41') sch.lV(gs, 320, 70, 170); else sch.cV(gs, 320, 70, 170);
        sch.w(gs, [[320, 170], [320, 200], [60, 200], [60, 140]]);
        sch.t(gs, 180, 35, mode === 'e41' ? '30 Ω' : '100 Ω'); sch.t(gs, 340, 125, mode === 'e41' ? '20 mH' : '10 µF', 'lbl', 'start');
        E('path', { d: 'M150,65 h30 m-7,-5 l7,5 l-7,5', class: 'w' }, gs); sch.t(gs, 165, 82, 'i');
      }
      $('#d5desc').innerHTML = { e40: 'Parallel branches, common voltage v<sub>m</sub> (reference, 1 V peak). Goal: i<sub>R</sub> should lag i<sub>s</sub> by 45°. CH1 = i<sub>R</sub>, CH2 = i<sub>s</sub> (current probe, 1 V/A).', e41: 'Series RL, i(t) = 2 cos ωt A (reference). CH1 = i (1 V/A), CH2 = v<sub>s</sub>.', e42: 'Series RC, v<sub>s</sub>(t) = 50 cos ωt V (reference). CH1 = v<sub>s</sub>, CH2 = i (1 V/A).', e43: 'Parallel RLC, v(t) = 20 cos ωt V (reference). CH1 = v, CH2 = i<sub>s</sub> (1 V/A).' }[mode];
    }
    const P = () => ({ mode: S.d5mode, w: kW.value, R: kR.value });
    const self = { sc, dirty: true };
    self.update = function () {
      if (!self.dirty && !sc.dirty) return; self.dirty = sc.dirty = false;
      const p = P(), m = model(p.mode, p.w, p.R);
      drawPh(m);
      const ref = cang(m.ch[0]), n = 1000, td = sc.sc.tdiv;
      sc.draw({ n, y: m.ch.map((z) => wave(n, td, [{ z: polar(cabs(z), cang(z) - ref), w: p.w }])) });
    };
    const tbody = $('#d5tab tbody');
    function table() { tbody.innerHTML = S.d5rows.map((r, i) => `<tr><td>${i + 1}</td><td class="l">${MODES[r.mode].name}</td><td>${r.mode === 'e40' ? 'R = ' + num(r.R, 3) + ' Ω' : '—'}</td><td>${r.w}</td><td>${num(r.c1, 3)}</td><td>${num(r.c2, 3)}</td><td>${r.dt == null ? '—' : eng(r.dt, 's')}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; }
    self.rec = function () {
      const p = P(), m = model(p.mode, p.w, p.R), dt = sc.sc.cur.on && sc.m && sc.m.cur ? sc.m.cur.dt : null;
      S.d5rows.push({ ...p, c1: cabs(m.ch[0]), c2: cabs(m.ch[1]), dt }); save(); table();
      Lab.toast('Recorded' + (dt == null ? ' (cursors off: no Δt)' : ': Δt = ' + eng(dt, 's')));
    };
    $('#d5rec').onclick = self.rec; $('#d5del').onclick = () => { S.d5rows.pop(); save(); table(); };
    $('#d5csv').onclick = () => Lab.downloadCSV('hafta06_deney5.csv', ['#', 'circuit', 'R (ohm)', 'w (rad/s)', 'CH1 peak', 'CH2 peak', 'dt (s)'], S.d5rows.map((r, i) => [i + 1, r.mode, r.mode === 'e40' ? +r.R.toFixed(4) : '', r.w, +r.c1.toFixed(4), +r.c2.toFixed(4), r.dt == null ? '' : +r.dt.toExponential(4)]));
    mkW(); drawSch(); setScope(); table();
    self.phaseOk = (r) => { if (r.dt == null) return false; const m = model(r.mode, r.w, r.R), T = (2 * Math.PI) / r.w; return Math.abs(wrap((-360 * r.dt) / T - (cang(m.ch[1]) - cang(m.ch[0])))) < 3; };
    self.model = model; self.MODES = MODES;
    return self;
  })();
  XP.d5 = D5;
  const nom = (r) => r.w === D5.MODES[r.mode].w0;
  steps('d5', [
    { t: 'Select the <b>Example 1.40</b> circuit and turn on the <b>polygon</b> view: why do I<sub>L</sub> and I<sub>C</sub> partly cancel each other?', test: () => S.d5mode === 'e40' && !!S.fl.d5poly },
    { t: 'Adjust R so that the current i<sub>R</sub> <b>lags i<sub>s</sub> by 45°</b>; measure Δt with the cursors and record.', test: () => S.d5rows.some((r) => r.mode === 'e40' && nom(r) && near(r.R, 1 / 3, 0.01) && D5.phaseOk(r)) },
    { t: '<b>Example 1.41</b> (series RL): measure the phase difference between v<sub>s</sub> and i with the cursors and record.', test: () => S.d5rows.some((r) => r.mode === 'e41' && nom(r) && D5.phaseOk(r)) },
    { t: '<b>Example 1.42</b> (series RC): measure how far the current leads the voltage and record.', test: () => S.d5rows.some((r) => r.mode === 'e42' && nom(r) && D5.phaseOk(r)) },
    { t: '<b>Example 1.43</b> (parallel RLC): record with a phase measurement at ω = 2000 rad/s; then take another record at ω = 500 rad/s. Did the circuit type change?', test: () => S.d5rows.some((r) => r.mode === 'e43' && nom(r) && D5.phaseOk(r)) && S.d5rows.some((r) => r.mode === 'e43' && r.w === 500) },
  ]);
  numq('d5', '#d5Q', { id: 'd5q1', q: 'What is the R you found in Example 1.40, in ohms?', answer: 1 / 3, tol: 2, unit: 'Ω', explain: 'I<sub>C</sub> + I<sub>L</sub> = 3V<sub>m</sub>∠90°; tan 45° = 1 ⇒ I<sub>R</sub> = 3V<sub>m</sub> ⇒ R = 1/3 Ω.', hint: 'The two legs of the right triangle are equal.' });
  numq('d5', '#d5Q', { id: 'd5q2', q: 'With this R and V<sub>m</sub> = 1 V, what is the source current amplitude |I<sub>s</sub>| in amperes?', answer: 3 * Math.SQRT2, tol: 1.5, unit: 'A', explain: 'I<sub>s</sub> = 3 + j3 = 4.243∠45° A.', hint: 'The CH2 peak value (1 V/A).' });
  numq('d5', '#d5Q', { id: 'd5q3', q: 'In Example 1.41, by how many degrees does v<sub>s</sub> lead i?', answer: (Math.atan(40 / 30) * 180) / Math.PI, tol: 0, abs: 1.5, unit: '°', explain: 'θ = arctan(40/30) = 53.13°; V<sub>S</sub> = 60 + j80 = 100∠53.13° V. Not 60 + 80 = 140, but Pythagoras: 100.', hint: 'φ = 360°·|Δt|/T' });
  numq('d5', '#d5Q', { id: 'd5q4', q: 'In Example 1.42, by how many degrees does the current lead the voltage?', answer: 45, tol: 0, abs: 1.5, unit: '°', explain: 'Z = 100 − j100 = 141.4∠−45° Ω ⇒ θ<sub>I</sub> = 0 − (−45°) = +45°.', hint: 'The one that peaks first leads.' });
  numq('d5', '#d5Q', { id: 'd5q5', q: 'In Example 1.43 (ω = 2000 rad/s), what is |I<sub>s</sub>| in amperes?', answer: Math.hypot(4, 6), tol: 1.5, unit: 'A', explain: 'I<sub>s</sub> = 4 + j(8 − 2) = 7.211∠56.31° A: capacitive.', hint: 'The CH2 peak value.' });
  mcq('d5', '#d5Q', { id: 'd5q6', q: 'In the Example 1.43 circuit, what changes when ω drops to 500 rad/s?', opts: ['The circuit stays capacitive and the current leads even more', 'I<sub>L</sub> &gt; I<sub>C</sub>, the source current lags the voltage: the circuit becomes inductive', 'The phase does not change', 'I<sub>R</sub> changes'], correct: 1, explain: 'X<sub>L</sub> = 2.5 Ω (I<sub>L</sub> = 8 A), X<sub>C</sub> = 10 Ω (I<sub>C</sub> = 2 A). Below resonance ω<sub>0</sub> = 1/√(LC) = 1000 rad/s a parallel circuit is inductive.', hint: 'Look at the lengths of the green and purple arrows in the diagram.' });

  /* ================= RAPOR ================= */
  function buildReport() {
    const sec = { onhaz: 'Pre-lab', d1: 'Experiment 1', d2: 'Experiment 2', d3: 'Experiment 3', d4: 'Experiment 4', d5: 'Experiment 5' };
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
    const phs = (() => { try { return `<div style="width:48%;display:inline-block;vertical-align:top">${$('#d5ph').outerHTML}</div>`; } catch (e) { return ''; } })();
    const html = `
      <h2 style="margin:0">Circuit Theory II · Virtual Laboratory · Week 6 Report</h2>
      <p><b>Topic:</b> Linear and ideal transformers, open-circuit and short-circuit tests, impedance matching, dot convention, phasor diagrams (Sections 1.8–1.10)</p>
      <table class="data" style="width:auto"><tr><th>Full name</th><td class="l">${S.st.name || ''}</td><th>ID</th><td class="l">${S.st.no || ''}</td><th>Group</th><td class="l">${S.st.group || ''}</td><th>Date</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Summary</h3>
      <p>Lab-sheet steps completed: <b>${sOk}/${sTot}</b> · Correct answers: <b>${ok}/${tot}</b> · Score: <b>${Math.round((50 * sOk) / sTot + (50 * ok) / tot)}/100</b></p>
      <h3>Answers</h3>
      <table class="data"><thead><tr><th>Section</th><th>Question</th><th>Answer</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Experiment 1 · Linear transformer</h3>${tb('#d1tab')}
      <h3>Experiment 2 · Open-circuit and short-circuit tests</h3>${tb('#d2tab')}
      <h3>Experiment 3 · Impedance matching</h3>${tb('#d3tab')}
      <h3>Experiment 4 · Polarity test</h3>${tb('#d4tab')}<p>Dot decision: ${S.fl.d4dot ? '✔ correct' : '—'}</p>
      <h3>Experiment 5 · Phasor diagram</h3>${tb('#d5tab')}
      <h3>Plots</h3>
      <div>${img(D1.sc.cv)} ${img($('#d1plot'))}</div><div>${img($('#d3plot'))} ${img(D5.sc.cv)}</div><div>${phs}</div>
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
    if (e.altKey && /^[0-8]$/.test(e.key)) { go(pages[+e.key]); e.preventDefault(); return; }
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.key === '?') $('#helpModal').classList.add('show');
    if ((e.key === 'r' || e.key === 'R') && XP[S.page]) XP[S.page].rec();
  });

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (S.page === 'onbilgi') OB.frame(dt);
    if (XP[S.page]) { XP[S.page].update(); evalSteps(S.page); }
    requestAnimationFrame(loop);
  }
  ['d1', 'd2', 'd3', 'd4', 'd5'].forEach(evalSteps);
  go(S.page); progress(); requestAnimationFrame(loop);
})();

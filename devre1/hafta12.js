/* Devre Kuramı I · Hafta 12 — Paralel RLC doğal tepki */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd1h12';
  const S = Object.assign({ answers: {}, steps: {}, st: {}, page: 'giris', d1rows: [], d2rows: [], d3rows: [], d4rows: [], fl: {} }, Lab.store.load(KEY));
  if (S.cx == null) S.cx = Math.round(100 + Math.random() * 50) * 1e-9; // bilinmeyen C_x (100–150 nF)
  if (S.rL == null) S.rL = Math.round(250 + Math.random() * 200); // 8 H bobinin sargı direnci
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
  function segBtn(parent, txt, on) { const b = document.createElement('button'); b.className = 'seg-btn' + (on ? ' on' : ''); b.innerHTML = txt; parent.appendChild(b); return b; }

  /* ---------- şema yardımcıları (hafta01’den + L, C, anahtar, bağımlı kaynak) ---------- */
  const sch = {
    w: (g, pts) => E('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'w' }, g),
    dot: (g, x, y) => E('circle', { cx: x, cy: y, r: 3.5, class: 'node' }, g),
    t: (g, x, y, s, cls = 'lbl', anchor = 'middle') => { const e = E('text', { x, y, class: cls, 'text-anchor': anchor }, g); e.innerHTML = s; return e; },
    rH(g, x1, x2, y) { const n = 6, L = 8, step = (x2 - x1 - 2 * L) / n; let d = `M${x1},${y} h${L}`; for (let i = 0; i < n; i++) d += ` l${step / 2},${i % 2 ? 7 : -7} l${step / 2},${i % 2 ? -7 : 7}`; d += ` L${x2},${y}`; E('path', { d, class: 'w' }, g); },
    rV(g, x, y1, y2) { const n = 6, L = 8, step = (y2 - y1 - 2 * L) / n; let d = `M${x},${y1} v${L}`; for (let i = 0; i < n; i++) d += ` l${i % 2 ? 7 : -7},${step / 2} l${i % 2 ? -7 : 7},${step / 2}`; d += ` L${x},${y2}`; E('path', { d, class: 'w' }, g); },
    lV(g, x, y1, y2) { const n = 4, h = (y2 - y1 - 16) / n; let d = `M${x},${y1} v8`; for (let i = 0; i < n; i++) d += ` a${h / 2},${h / 2} 0 0 1 0,${h}`; d += ` L${x},${y2}`; E('path', { d, class: 'w' }, g); },
    cV(g, x, y1, y2) { const m = (y1 + y2) / 2; E('path', { d: `M${x},${y1} V${m - 5} M${x - 16},${m - 5} h32 M${x - 16},${m + 5} h32 M${x},${m + 5} V${y2}`, class: 'w' }, g); },
    cH(g, x1, x2, y) { const m = (x1 + x2) / 2; E('path', { d: `M${x1},${y} H${m - 5} M${m - 5},${y - 15} v30 M${m + 5},${y - 15} v30 M${m + 5},${y} H${x2}`, class: 'w' }, g); },
    gnd(g, x, y) { E('path', { d: `M${x},${y} v8 M${x - 11},${y + 8} h22 M${x - 7},${y + 13} h14 M${x - 3},${y + 18} h6`, class: 'w' }, g); },
    src(g, x, y, r = 20, kind = 'dc') {
      E('circle', { cx: x, cy: y, r, class: 'w', fill: '#fff' }, g);
      if (kind === 'ac') E('path', { d: `M${x - 10},${y} q5,-12 10,0 t10,0`, class: 'w' }, g);
      else { sch.t(g, x, y - 4, '+', 'lbl'); sch.t(g, x, y + 13, '−', 'lbl'); }
    },
    dep(g, x, y) { E('path', { d: `M${x},${y - 22} L${x + 18},${y} L${x},${y + 22} L${x - 18},${y} Z`, class: 'w', fill: '#fff' }, g); E('path', { d: `M${x},${y + 12} V${y - 10} m-5,6 l5,-7 l5,7`, class: 'w' }, g); },
    term(g, x, y) { E('circle', { cx: x, cy: y, r: 4.5, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g); },
    opamp(g, x, yt, h = 110, w = 120) { E('path', { d: `M${x},${yt} L${x},${yt + h} L${x + w},${yt + h / 2} Z`, class: 'w', fill: '#f4f7ff' }, g); },
    sw(g, x1, x2, y) { // yatay anahtar; döndürülen fonksiyon durumu çizer
      const b = E('line', { x1, y1: y, x2, y2: y, class: 'w' }, g);
      [x1, x2].forEach((x) => E('circle', { cx: x, cy: y, r: 3.5, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g));
      return (on) => { b.setAttribute('x2', on ? x2 : x2 - 6); b.setAttribute('y2', on ? y : y - 20); b.style.stroke = on ? '#1a8a4a' : '#c62828'; };
    },
    swV(g, x, y1, y2) {
      const b = E('line', { x1: x, y1, x2: x, y2, class: 'w' }, g);
      [y1, y2].forEach((y) => E('circle', { cx: x, cy: y, r: 3.5, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g));
      return (on) => { b.setAttribute('x2', on ? x : x + 20); b.setAttribute('y2', on ? y2 : y2 - 6); b.style.stroke = on ? '#1a8a4a' : '#c62828'; };
    },
  };

  /* ---------- osiloskop yardımcısı ---------- */
  const VDIV = [1e-3, 2e-3, 5e-3, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
  const TDIV = [1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2, 2e-2, 5e-2, 0.1, 0.2, 0.5, 1];
  const POS = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  function mkScope(host, o) {
    const w = document.createElement('div'); w.className = 'inst dark scopewrap'; w.style.cssText = 'flex:1;min-width:420px';
    w.innerHTML = `<div class="brand"><span>DSO-2C · Dijital Osiloskop</span><span><span class="led on g"></span> <span class="runst">${o.mode || 'RUN'}</span></span></div>
      <div class="row" style="align-items:flex-start;flex-wrap:nowrap"><canvas width="640" height="400" style="width:100%;max-width:640px"></canvas>
      <div style="min-width:160px"><div class="ctrls"></div><div class="row btns" style="margin:6px 0;gap:4px"></div><div class="meas"></div></div></div>`;
    host.appendChild(w);
    const cv = w.querySelector('canvas'), sc = new Lab.Scope(cv), sk = w.querySelector('.ctrls'), bt = w.querySelector('.btns'), me = w.querySelector('.meas');
    const self = { sc, cv, dirty: true, run: true, runEl: w.querySelector('.runst'), led: w.querySelector('.led') };
    const set = () => { self.dirty = true; };
    sc.ch[0].vdiv = o.v1; sc.ch[1].vdiv = o.v2; sc.tdiv = o.t; sc.ch[0].pos = o.p1 || 0; sc.ch[1].pos = o.p2 || 0;
    self.k1 = new Lab.Knob(sk, { label: 'CH1 V/d', list: VDIV, value: o.v1, dark: true, size: 40, fmt: (v) => eng(v, 'V'), onChange: (v) => { sc.ch[0].vdiv = v; set(); } });
    self.k2 = new Lab.Knob(sk, { label: o.l2 || 'CH2 V/d', list: VDIV, value: o.v2, dark: true, size: 40, fmt: o.f2 || ((v) => eng(v, 'V')), onChange: (v) => { sc.ch[1].vdiv = v; set(); } });
    self.kt = new Lab.Knob(sk, { label: 'ZAMAN/d', list: TDIV, value: o.t, dark: true, size: 40, fmt: (v) => eng(v, 's'), onChange: (v) => { sc.tdiv = v; set(); o.onT && o.onT(); } });
    self.kp1 = new Lab.Knob(sk, { label: 'CH1 konum', list: POS, value: o.p1 || 0, dark: true, size: 34, fmt: (v) => num(v, 0) + ' d', onChange: (v) => { sc.ch[0].pos = v; set(); } });
    self.kp2 = new Lab.Knob(sk, { label: 'CH2 konum', list: POS, value: o.p2 || 0, dark: true, size: 34, fmt: (v) => num(v, 0) + ' d', onChange: (v) => { sc.ch[1].pos = v; set(); } });
    const b1 = segBtn(bt, 'CH1', true), b2 = segBtn(bt, 'CH2', true), bc = segBtn(bt, 'İMLEÇ', false);
    b1.onclick = () => { sc.ch[0].on = !sc.ch[0].on; b1.classList.toggle('on', sc.ch[0].on); set(); };
    b2.onclick = () => { sc.ch[1].on = !sc.ch[1].on; b2.classList.toggle('on', sc.ch[1].on); set(); };
    bc.onclick = () => { sc.cur.on = !sc.cur.on; bc.classList.toggle('on', sc.cur.on); set(); };
    if (o.runBtn) {
      const br = segBtn(bt, 'RUN/STOP', true);
      br.onclick = () => { self.run = !self.run; br.classList.toggle('on', self.run); self.runEl.textContent = self.run ? 'RUN' : 'STOP'; self.led.classList.toggle('g', self.run); };
    }
    const pre = o.pre !== false;
    self.tc = (x) => (x - (pre ? 1 : 0)) * sc.tdiv; // imleç konumu -> tetikten itibaren zaman
    self.show = () => {
      const m = sc.measure(); if (!m) return; self.m = m;
      const [a, b] = m.ch;
      let h = `<span style="color:#f2d21b">CH1</span> maks ${eng(a.max, 'V')}<br>&nbsp;&nbsp;&nbsp;&nbsp;min ${eng(a.min, 'V')}<br><span style="color:#27c4f0">CH2</span> maks ${eng(b.max, o.u2 || 'V')}<br>&nbsp;&nbsp;&nbsp;&nbsp;min ${eng(b.min, o.u2 || 'V')}`;
      if (m.cur) {
        const c = m.cur;
        h += `<br><span style="color:#ff7cf0">İMLEÇ A</span>${pre ? ' t ' + eng(self.tc(sc.cur.a), 's') : ''}<br>&nbsp;CH1 ${eng(c.v1a, 'V')} · CH2 ${eng(c.v2a, o.u2 || 'V')}` +
          `<br><span style="color:#ff7cf0">İMLEÇ B</span>${pre ? ' t ' + eng(self.tc(sc.cur.b), 's') : ''}<br>&nbsp;CH1 ${eng(c.v1b, 'V')} · CH2 ${eng(c.v2b, o.u2 || 'V')}<br>Δt ${eng(c.dt, 's')}`;
      }
      if (o.extra) h += o.extra(m);
      me.innerHTML = h;
    };
    cv.addEventListener('pointermove', () => sc.cur.drag && self.show());
    cv.addEventListener('pointerdown', () => setTimeout(self.show, 0));
    self.draw = (data) => { sc.draw(data); self.show(); };
    return self;
  }

  /* ---------- RLC fiziği ---------- */
  // Analitik doğal tepki (ideal bobin). Döner: f(t) -> [v, iL], ayrıca tür ve kökler
  function natural(R, L, C, V0, I0) {
    const a = 1 / (2 * R * C), w0 = 1 / Math.sqrt(L * C), D0 = -(V0 / R + I0) / C;
    let f, type, slow;
    if (Math.abs(a - w0) / w0 < 1e-4) {
      const D1 = D0 + a * V0; type = 'kritik'; slow = a;
      f = (t) => { const e = Math.exp(-a * t); return [(D1 * t + V0) * e, (D1 - a * (D1 * t + V0)) * e]; };
    } else if (a > w0) {
      const r = Math.sqrt(a * a - w0 * w0), s1 = -a + r, s2 = -a - r, A1 = (D0 - s2 * V0) / (s1 - s2), A2 = V0 - A1;
      type = 'aşırı'; slow = -s1;
      f = (t) => { const e1 = Math.exp(s1 * t), e2 = Math.exp(s2 * t); return [A1 * e1 + A2 * e2, s1 * A1 * e1 + s2 * A2 * e2]; };
    } else {
      const wd = Math.sqrt(w0 * w0 - a * a), B1 = V0, B2 = (D0 + a * V0) / wd;
      type = 'az'; slow = a;
      f = (t) => { const e = Math.exp(-a * t), c = Math.cos(wd * t), s = Math.sin(wd * t); return [e * (B1 * c + B2 * s), e * ((-a * B1 + wd * B2) * c + (-a * B2 - wd * B1) * s)]; };
    }
    const g = (t) => { if (t < 0) return [V0, I0]; const [v, dv] = f(t); return [v, -(v / R + C * dv)]; };
    return { g, a, w0, type, slow };
  }
  const typeOf = (a, w0) => (Math.abs(a - w0) / w0 < 0.005 ? 'kritik' : a > w0 ? 'aşırı' : 'az');
  const TNAME = { aşırı: 'AŞIRI SÖNÜMLÜ', kritik: 'KRİTİK SÖNÜMLÜ', az: 'AZ SÖNÜMLÜ' };
  // %2 oturma süresi ve sıfır geçişi sayısı
  function settle(nat) {
    const T = Math.min(12 / Math.max(nat.slow, 1e-9), 2000 / nat.w0), N = 6000;
    let vm = 0, last = 0, zc = 0, prev = nat.g(0)[0];
    const vs = new Float64Array(N + 1);
    for (let i = 0; i <= N; i++) { const v = nat.g((i / N) * T)[0]; vs[i] = v; vm = Math.max(vm, Math.abs(v)); if (i && ((prev > 0 && v <= 0) || (prev < 0 && v >= 0))) zc++; if (v !== 0) prev = v; }
    for (let i = 0; i <= N; i++) if (Math.abs(vs[i]) > 0.02 * vm) last = i;
    return { ts: (Math.min(N, last + 1) / N) * T, zc };
  }
  // RK4 (sargı direnci r ile)
  function rkTrace(p, td, n = 1000) {
    const { R, r, L, C, V0, I0 } = p, h = (10 * td) / (n - 1);
    const a = 1 / (2 * R * C) + r / (2 * L), w0 = Math.sqrt((1 + r / R) / (L * C));
    const m = Math.max(1, Math.ceil((h * Math.max(a, w0)) / 0.05)), dt = h / m;
    const F = (v, i) => [-(v / R + i) / C, (v - r * i) / L];
    const y1 = new Float64Array(n), y2 = new Float64Array(n);
    let v = V0, i = I0;
    for (let k = 0; k < n; k++) {
      const t = k * h - td;
      if (t > 0) for (let j = 0; j < m; j++) {
        const k1 = F(v, i), k2 = F(v + dt / 2 * k1[0], i + dt / 2 * k1[1]), k3 = F(v + dt / 2 * k2[0], i + dt / 2 * k2[1]), k4 = F(v + dt * k3[0], i + dt * k3[1]);
        v += dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); i += dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
      }
      y1[k] = v; y2[k] = i * 1e3;
    }
    return { n, y: [y1, y2] };
  }
  function natTrace(nat, td, n = 1000) {
    const y1 = new Float64Array(n), y2 = new Float64Array(n);
    for (let k = 0; k < n; k++) { const t = (k / (n - 1)) * 10 * td - td, [v, i] = nat.g(t); y1[k] = v; y2[k] = i * 1e3; }
    return { n, y: [y1, y2] };
  }
  const tdTrue = (R, r, L, C) => { const a = 1 / (2 * R * C) + r / (2 * L), w02 = (1 + r / R) / (L * C); return w02 > a * a ? (2 * Math.PI) / Math.sqrt(w02 - a * a) : NaN; };
  const RLIST = [1e3, 1.5e3, 2e3, 2.5e3, 3e3, 3.5e3, 4e3, 4.5e3, 5e3, 6e3, 8e3, 1e4, 1.5e4, 2e4, 3e4, 5e4, 1e5];
  const scOpt = { l2: 'CH2 i_L (1 V/mA)', u2: 'V' };

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

  /* ================= ÖN HAZIRLIK ================= */
  numq('onhaz', '#preQ', { id: 'p1', q: '1) Örnek 4.1: paralel RLC, R = 200 Ω, L = 50 mH, C = 0,2 µF. Neper frekansı α kaç rad/s\'dir?', answer: 12500, tol: 1, unit: 'rad/s', explain: 'α = 1/(2RC) = 1/(2·200·0,2·10<sup>−6</sup>) = 12 500 rad/s.', hint: 'Paralel devre: α = 1/(2RC)' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) Aynı devrede ω<sub>0</sub> kaç rad/s\'dir?', answer: 10000, tol: 1, unit: 'rad/s', explain: 'ω<sub>0</sub> = 1/√(LC) = 10 000 rad/s; α &gt; ω<sub>0</sub>: aşırı sönümlü.', hint: '1/√(LC)' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) V<sub>0</sub> = 12 V, I<sub>0</sub> = 30 mA için dv/dt(0<sup>+</sup>) kaç V/s\'dir?', answer: -450000, tol: 1, unit: 'V/s', explain: '−(12/200 + 0,03)/0,2 µF = −450 000 V/s.', hint: '−(V<sub>0</sub>/R + I<sub>0</sub>)/C' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) L = 50 mH ve C = 0,2 µF sabitken kritik sönüm için R kaç Ω olmalıdır?', answer: 250, tol: 1, unit: 'Ω', explain: 'R = ½√(L/C) = ½√250 000 = 250 Ω.', hint: 'α = ω<sub>0</sub> koşulundan R\'yi çekin.' });
  numq('onhaz', '#preQ', { id: 'p5', q: '5) Örnek 4.3: R = 20 kΩ, L = 8 H, C = 0,125 µF. Sönümlü frekans ω<sub>d</sub> kaç rad/s\'dir?', answer: Math.sqrt(1e6 - 4e4), tol: 1, unit: 'rad/s', explain: 'α = 200, ω<sub>0</sub> = 1000 ⇒ ω<sub>d</sub> = √(1000² − 200²) = 979,8 rad/s.', hint: 'ω<sub>d</sub> = √(ω<sub>0</sub>² − α²)' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) Paralel RLC\'de yalnızca R büyütülürse ne olur?', opts: ['ω<sub>d</sub> artar, sönüm azalır', 'ω<sub>d</sub> azalır, sönüm artar', 'İkisi de değişmez', 'ω<sub>0</sub> artar'], correct: 0, explain: 'α = 1/(2RC) küçülür, ω<sub>0</sub> sabit, ω<sub>d</sub> → ω<sub>0</sub>. Seri devrede ilişki terstir.', hint: 'Paralel devrede R kaçak yoldur.' });

  /* ================= DENEY 1 · Üç tepki ================= */
  const D1 = (() => {
    const L = 8, C = 0.125e-6;
    const box = $('#d1inst');
    const rb = inst(box, 'DİRENÇ KUTUSU · R', false);
    const kR = new Lab.Knob(rb.c, { label: 'R', list: RLIST, value: S.d1R ?? 1e4, size: 62, fmt: Lab.ohm, onChange: (v) => { S.d1R = v; save(); sc.dirty = true; } });
    const ic = inst(box, 'BAŞLANGIÇ KOŞULU YÜKLEYİCİ');
    const kV0 = new Lab.Knob(ic.c, { label: 'V_0', min: -50, max: 50, step: 1, value: S.d1V0 ?? 0, dark: true, fmt: (v) => num(v, 0) + ' V', onChange: (v) => { S.d1V0 = v; save(); sc.dirty = true; } });
    const kI0 = new Lab.Knob(ic.c, { label: 'I_0', min: -20, max: 20, step: 0.25, value: S.d1I0 ?? -12.25, dark: true, fmt: (v) => num(v, 2) + ' mA', onChange: (v) => { S.d1I0 = v; save(); sc.dirty = true; } });
    const an = inst(box, 'RLC ÇÖZÜMLEYİCİ'); const aL = lcd(an.el, 'α', 'rad/s', 120); const wL = lcd(an.el, 'ω<sub>0</sub>', 'rad/s', 120);
    const sc = mkScope($('#d1scopeHost'), { v1: 20, v2: 5, t: 1e-3, ...scOpt });
    const P = () => ({ R: kR.value, V0: kV0.value, I0: kI0.value * 1e-3 });
    const icEx = (p) => p.V0 === 0 && near(p.I0, -12.25e-3, 1e-7);
    // şema
    const g = $('#d1sch');
    sch.w(g, [[40, 50], [380, 50]]); sch.w(g, [[40, 210], [380, 210]]); sch.gnd(g, 210, 210);
    sch.rV(g, 100, 50, 210); sch.lV(g, 210, 50, 210); sch.cV(g, 320, 50, 210);
    [100, 210, 320].forEach((x) => { sch.dot(g, x, 50); sch.dot(g, x, 210); });
    const tR = sch.t(g, 115, 135, '', 'lbl', 'start'); sch.t(g, 225, 135, 'L = 8 H', 'lbl', 'start'); sch.t(g, 340, 125, 'C =', 'lbl', 'start'); sch.t(g, 340, 142, '0,125 µF', 'lbl', 'start');
    sch.t(g, 300, 72, '+', 'lbl'); sch.t(g, 300, 196, '−', 'lbl'); sch.t(g, 290, 135, 'v', 'lbl', 'end');
    E('path', { d: 'M196,80 v28 m-5,-8 l5,8 l5,-8', class: 'w' }, g); sch.t(g, 190, 98, 'i_L', 'lbl', 'end');
    const tIC = sch.t(g, 210, 245, '', 'val'), tTy = sch.t(g, 210, 30, '', 'val');
    // s-düzlemi
    const sp = $('#d1splane'), K = 70, OX = 300, OY = 150;
    const X = (s) => OX + (s / 1000) * K, Y = (w) => OY - (w / 1000) * K;
    E('line', { x1: 10, y1: OY, x2: 350, y2: OY, stroke: '#888' }, sp); E('line', { x1: OX, y1: 10, x2: OX, y2: 290, stroke: '#888' }, sp);
    sch.t(sp, 345, OY - 6, 'σ', 'lbl', 'end'); sch.t(sp, OX + 6, 22, 'jω', 'lbl', 'start');
    E('circle', { cx: OX, cy: OY, r: K, fill: 'none', stroke: '#0b5cad', 'stroke-dasharray': '5 4' }, sp);
    sch.t(sp, OX - K, OY + 16, '−ω₀', 'lbl');
    const rg = E('g', {}, sp), tSp = sch.t(sp, 15, 285, '', 'val', 'start');
    function drawS(nat) {
      rg.innerHTML = '';
      const cross = (s, w, c) => { const x = Math.max(16, X(s)), y = Y(w); E('path', { d: `M${x - 6},${y - 6} l12,12 m0,-12 l-12,12`, stroke: c, 'stroke-width': 3 }, rg); if (X(s) < 16) sch.t(rg, 22, y - 10, '◄ ekran dışı', 'lbl', 'start').style.fontSize = '10px'; };
      const { a, w0 } = nat, ty = typeOf(a, w0);
      if (ty === 'az') { const wd = Math.sqrt(w0 * w0 - a * a); cross(-a, wd, '#1a8a4a'); cross(-a, -wd, '#1a8a4a'); }
      else if (ty === 'kritik') cross(-a, 0, '#e07a10');
      else { const r = Math.sqrt(a * a - w0 * w0); cross(-a + r, 0, '#c62828'); cross(-a - r, 0, '#c62828'); }
      tSp.textContent = TNAME[ty]; tSp.style.fill = { az: '#1a8a4a', kritik: '#e07a10', aşırı: '#c62828' }[ty];
    }
    function update() {
      const p = P(), nat = natural(p.R, L, C, p.V0, p.I0), ty = typeOf(nat.a, nat.w0);
      aL(num(nat.a, 0)); wL(num(nat.w0, 0)); tR.textContent = 'R = ' + Lab.ohm(p.R);
      tIC.textContent = 'V₀ = ' + num(p.V0, 0) + ' V, I₀ = ' + num(p.I0 * 1e3, 2) + ' mA';
      tTy.textContent = TNAME[ty];
      if (icEx(p)) { const k = { az: p.R === 2e4 ? 'u' : null, kritik: 'c', aşırı: p.R <= 2e3 ? 'o' : null }[ty]; if (k && !S.fl['d1' + k]) { S.fl['d1' + k] = true; save(); } }
      if (!sc.dirty) return; sc.dirty = false;
      drawS(nat); sc.draw(natTrace(nat, sc.sc.tdiv));
    }
    const tbody = $('#d1tab tbody');
    function table() { tbody.innerHTML = S.d1rows.map((r, i) => `<tr><td>${i + 1}</td><td>${Lab.ohm(r.R)}</td><td>${num(r.V0, 0)}</td><td>${num(r.I0 * 1e3, 2)}</td><td>${r.ty}</td><td>${num(r.mx, 2)}</td><td>${num(r.mn, 2)}</td><td>${r.ta == null ? '—' : eng(r.ta, 's')}</td><td>${r.va == null ? '—' : num(r.va, 2)}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; }
    function rec() {
      const m = sc.m; if (!m) return; const p = P(), nat = natural(p.R, L, C, p.V0, p.I0);
      S.d1rows.push({ ...p, ty: typeOf(nat.a, nat.w0), mx: m.ch[0].max, mn: m.ch[0].min, ta: m.cur ? sc.tc(sc.sc.cur.a) : null, va: m.cur ? m.cur.v1a : null }); save(); table();
      Lab.toast('Kaydedildi: R = ' + Lab.ohm(p.R) + ', v maks = ' + num(m.ch[0].max, 2) + ' V');
    }
    $('#d1rec').onclick = rec; $('#d1del').onclick = () => { S.d1rows.pop(); save(); table(); };
    $('#d1csv').onclick = () => Lab.downloadCSV('hafta12_deney1.csv', ['#', 'R', 'V0 (V)', 'I0 (A)', 'tur', 'v maks', 'v min', 'tA (s)', 'vA (V)'], S.d1rows.map((r, i) => [i + 1, r.R, r.V0, r.I0, r.ty, +r.mx.toFixed(3), +r.mn.toFixed(3), r.ta == null ? '' : +r.ta.toFixed(6), r.va == null ? '' : +r.va.toFixed(3)]));
    table();
    return { sc, update, rec, P, icEx };
  })();
  XP.d1 = D1;
  steps('d1', [
    { t: 'Örnek 4.3: <b>R = 20 kΩ, V<sub>0</sub> = 0, I<sub>0</sub> = −12,25 mA</b>. Az sönümlü salınımı ve s-düzlemindeki karmaşık kök çiftini inceleyin.', test: () => !!S.fl.d1u },
    { t: 'Örnek 4.4: R\'yi <b>4 kΩ</b>\'a indirin. Kökler nerede birleşti? Salınım kaldı mı?', test: () => !!S.fl.d1c },
    { t: 'R\'yi <b>2 kΩ veya altına</b> indirin: aşırı sönüm. İki gerçek kök birbirinden nasıl uzaklaşıyor?', test: () => !!S.fl.d1o },
    { t: 'Üç türün her birinden en az bir ölçüm <b>kaydedin</b> (v maks/min tabloya yazılır).', test: () => ['az', 'kritik', 'aşırı'].every((t) => S.d1rows.some((r) => r.ty === t)) },
    { t: 'R = 4 kΩ\'da İMLEÇ A\'yı gerilimin tepesine koyup kaydedin. Tepe anı ve değeri ders notuyla uyuşuyor mu?', test: () => S.d1rows.some((r) => r.R === 4e3 && D1.icEx(r) && r.ta != null && near(r.ta, 1e-3, 8e-5)) },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: 'Kritik sönümde (R = 4 kΩ) ölçtüğünüz tepe gerilimi kaç volttur?', answer: 98 * Math.exp(-1), tol: 2, unit: 'V', explain: 'v = 98 000 t e<sup>−1000t</sup>; tepe t = 1/α = 1 ms\'de 36,1 V.', hint: 'İmleci tepeye koyun ya da CH1 maks değerini okuyun.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'Az sönümde (R = 20 kΩ) ilk tepe değeri kaç volttur?', answer: 74.1, tol: 2, unit: 'V', explain: 't = 1,40 ms\'de 74,1 V; zarf o anda 75,6 V.', hint: 'CH1 maks.' });
  numq('d1', '#d1Q', { id: 'd1q3', q: 'R = 2 kΩ iken yavaş kök s<sub>1</sub> kaç rad/s\'dir? (İşaretiyle)', answer: -2000 + Math.sqrt(3e6), tol: 2, unit: 'rad/s', explain: 'α = 2000, ω<sub>0</sub> = 1000 ⇒ s<sub>1</sub> = −2000 + √3·1000 = −268 rad/s. Bu yavaş kök uzun kuyruğu oluşturur.', hint: 's<sub>1</sub> = −α + √(α² − ω<sub>0</sub>²)' });
  mcq('d1', '#d1Q', { id: 'd1q4', q: 'R, 4 kΩ\'dan 20 kΩ\'a çıkarken kökler s-düzleminde nasıl hareket etti?', opts: ['Gerçek eksende sağa', 'Yarıçapı ω<sub>0</sub> olan daire üzerinde jω eksenine doğru', 'Sol yarı düzlemden sağ yarı düzleme geçti', 'Hareket etmedi'], correct: 1, explain: '|s|² = α² + ω<sub>d</sub>² = ω<sub>0</sub>² sabit; α küçüldükçe kökler daire üzerinde eksene yaklaşır.', hint: 'α² + ω<sub>d</sub>² = ?' });
  mcq('d1', '#d1Q', { id: 'd1q5', q: 'Aşırı sönümlü tepkide gerilim t &gt; 0 için en fazla kaç kez sıfırdan geçebilir?', opts: ['Hiç', 'En fazla bir kez', 'İki kez', 'Sonsuz kez'], correct: 1, explain: 'A<sub>1</sub>e<sup>s<sub>1</sub>t</sup> = −A<sub>2</sub>e<sup>s<sub>2</sub>t</sup> denkleminin en çok bir çözümü vardır.', hint: 'Üstel fonksiyon birebirdir.' });

  /* ================= DENEY 2 · ω_d ve α ================= */
  const D2 = (() => {
    const L = 8;
    const box = $('#d2inst');
    const cb = inst(box, 'KONDANSATÖR SEÇİMİ', false);
    const bK = segBtn(cb.c, 'C = 0,125 µF (bilinen)', S.d2x !== true), bX = segBtn(cb.c, 'C<sub>x</sub> (bilinmeyen)', S.d2x === true);
    const setX = (x) => { S.d2x = x; save(); bK.classList.toggle('on', !x); bX.classList.toggle('on', x); sc.dirty = true; };
    bK.onclick = () => setX(false); bX.onclick = () => setX(true);
    const rb = inst(box, 'DİRENÇ KUTUSU', false);
    const kR = new Lab.Knob(rb.c, { label: 'R', list: [1e4, 2e4, 5e4, 1e5], value: S.d2R ?? 2e4, fmt: Lab.ohm, onChange: (v) => { S.d2R = v; save(); sc.dirty = true; } });
    const ic = inst(box, 'YÜKLEYİCİ'); lcd(ic.el, 'V<sub>0</sub> = 0 · I<sub>0</sub>', 'mA', 110)(num(-12.25, 2));
    const sc = mkScope($('#d2scopeHost'), { v1: 20, v2: 5, t: 5e-4, ...scOpt });
    const P = () => ({ R: kR.value, x: !!S.d2x, C: S.d2x ? S.cx : 0.125e-6 });
    function update() {
      if (!sc.dirty) return; sc.dirty = false;
      const p = P(); sc.draw(natTrace(natural(p.R, L, p.C, 0, -12.25e-3), sc.sc.tdiv));
    }
    const tbody = $('#d2tab tbody');
    function table() { tbody.innerHTML = S.d2rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.x ? 'C<sub>x</sub>' : '0,125 µF'}</td><td>${Lab.ohm(r.R)}</td><td>${eng(r.ta, 's')}</td><td>${num(r.va, 3)}</td><td>${eng(r.tb, 's')}</td><td>${num(r.vb, 3)}</td><td>${eng(r.tb - r.ta, 's')}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; }
    function rec() {
      if (!sc.sc.cur.on || !sc.m || !sc.m.cur) return Lab.toast('İMLEÇ\'leri açın, A ve B\'yi ardışık iki tepeye yerleştirin.');
      const c = sc.m.cur, p = P();
      S.d2rows.push({ ...p, ta: sc.tc(sc.sc.cur.a), va: c.v1a, tb: sc.tc(sc.sc.cur.b), vb: c.v1b }); save(); table();
      Lab.toast(`Kaydedildi: Δt = ${eng(c.dt, 's')}, v_A = ${num(c.v1a, 2)} V, v_B = ${num(c.v1b, 2)} V`);
    }
    $('#d2rec').onclick = rec; $('#d2del').onclick = () => { S.d2rows.pop(); save(); table(); };
    $('#d2csv').onclick = () => Lab.downloadCSV('hafta12_deney2.csv', ['#', 'C', 'R', 'tA (s)', 'vA (V)', 'tB (s)', 'vB (V)'], S.d2rows.map((r, i) => [i + 1, r.x ? 'Cx' : 1.25e-7, r.R, +r.ta.toFixed(7), +r.va.toFixed(4), +r.tb.toFixed(7), +r.vb.toFixed(4)]));
    table();
    const goodRow = (r) => { const Td = tdTrue(r.R, 0, L, r.C); return near(r.tb - r.ta, Td, 0.02 * Td) && r.va > r.vb && r.vb > 0; };
    return { sc, update, rec, goodRow, P };
  })();
  XP.d2 = D2;
  steps('d2', [
    { t: '<b>Bilinen C</b>, R = 20 kΩ seçin. ZAMAN/d\'yi en az iki tepe görünecek biçimde ayarlayın.', test: () => !S.d2x && D2.P().R === 2e4 && D2.sc.sc.tdiv <= 5e-3 && D2.sc.sc.tdiv >= 1e-3 },
    { t: 'İMLEÇ A\'yı ilk pozitif tepeye, B\'yi bir sonraki pozitif tepeye koyup <b>kaydedin</b> (Δt = T<sub>d</sub>).', test: () => S.d2rows.some((r) => !r.x && r.R === 2e4 && D2.goodRow(r)) },
    { t: 'Aynı ölçümü R = 50 kΩ ya da 100 kΩ için tekrarlayın: T<sub>d</sub> ve tepe oranı nasıl değişti?', test: () => S.d2rows.some((r) => !r.x && r.R >= 5e4 && D2.goodRow(r)) },
    { t: '<b>C<sub>x</sub></b>\'e geçin (R = 20 kΩ) ve ardışık iki tepeyi ölçüp kaydedin.', test: () => S.d2rows.some((r) => r.x && D2.goodRow(r)) },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'Bilinen C, R = 20 kΩ: ölçtüğünüz sönümlü periyot T<sub>d</sub> kaç ms\'dir?', answer: 2 * Math.PI / Math.sqrt(1e6 - 4e4) * 1e3, tol: 2, unit: 'ms', explain: 'T<sub>d</sub> = 2π/979,8 = 6,41 ms.', hint: 'Tablodaki Δt.' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'Aynı ölçümden logaritmik azalma δ = ln(v<sub>A</sub>/v<sub>B</sub>) kaçtır?', answer: 200 * 2 * Math.PI / Math.sqrt(1e6 - 4e4), tol: 4, unit: '', explain: 'δ = αT<sub>d</sub> = 200 × 6,41 ms = 1,28: her periyotta genlik e<sup>1,28</sup> ≈ 3,6 kat azalır.', hint: 'v<sub>A</sub>/v<sub>B</sub> oranının doğal logaritması.' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 'Ölçümünüzden α kaç rad/s\'dir?', answer: 200, tol: 4, unit: 'rad/s', explain: 'α = δ/T<sub>d</sub> = 200 rad/s = 1/(2RC) ✓', hint: 'α = δ / T<sub>d</sub>' });
  numq('d2', '#d2Q', { id: 'd2q4', q: 'C<sub>x</sub> ölçümünüzden bilinmeyen kondansatör kaç nF\'tır?', answer: () => S.cx * 1e9, tol: 4, unit: 'nF', explain: 'ω<sub>0</sub>² = ω<sub>d</sub>² + α², C<sub>x</sub> = 1/(ω<sub>0</sub>²L); ya da C<sub>x</sub> = 1/(2Rα). İkisi tutarlıysa ölçümünüz güvenilirdir.', hint: 'Önce α ve ω<sub>d</sub>; sonra ω<sub>0</sub> ve C. L = 8 H.' });
  mcq('d2', '#d2Q', { id: 'd2q5', q: 'α\'yı tek bir tepeden değil iki ardışık tepenin oranından bulmanın üstünlüğü nedir?', opts: ['Daha az imleç hareketi gerekir', 'Bilinmeyen başlangıç genliği (√(B<sub>1</sub>²+B<sub>2</sub>²)) oranda sadeleşir', 'ω<sub>0</sub>\'ı doğrudan verir', 'Probun kazancını ölçer'], correct: 1, explain: 'Aynı nedenle osiloskop ve probun mutlak kazanç hatası da sadeleşir.', hint: 'v<sub>A</sub>/v<sub>B</sub> = e<sup>αT<sub>d</sub></sup>: genlik nerede?' });

  /* ================= DENEY 3 · Kritik tasarım ================= */
  const D3 = (() => {
    const box = $('#d3inst');
    const el = inst(box, 'ELEMAN SEÇİMİ', false);
    const kL = new Lab.Knob(el.c, { label: 'L', list: [0.01, 0.05, 0.1, 1, 8], value: S.d3L ?? 0.1, fmt: (v) => eng(v, 'H'), onChange: (v) => { S.d3L = v; save(); sc.dirty = true; } });
    const kC = new Lab.Knob(el.c, { label: 'C', list: [1e-8, 2.5e-8, 1e-7, 1.25e-7, 2e-7, 1e-6], value: S.d3C ?? 2e-7, fmt: (v) => eng(v, 'F'), onChange: (v) => { S.d3C = v; save(); sc.dirty = true; } });
    const rb = inst(box, 'AYARLI DİRENÇ'); const rL = lcd(rb.el, 'R', 'Ω', 110);
    const kR = new Lab.Knob(rb.c, { label: 'R (log)', min: 10, max: 1e5, log: true, value: S.d3R ?? 1000, dark: true, size: 62, fmt: Lab.ohm, onChange: (v) => { S.d3R = v; save(); sc.dirty = true; } });
    const ic = inst(box, 'YÜKLEYİCİ');
    const kV0 = new Lab.Knob(ic.c, { label: 'V_0', min: -20, max: 20, step: 1, value: S.d3V0 ?? 12, dark: true, fmt: (v) => num(v, 0) + ' V', onChange: (v) => { S.d3V0 = v; save(); sc.dirty = true; } });
    const kI0 = new Lab.Knob(ic.c, { label: 'I_0', min: -40, max: 40, step: 0.25, value: S.d3I0 ?? 30, dark: true, fmt: (v) => num(v, 2) + ' mA', onChange: (v) => { S.d3I0 = v; save(); sc.dirty = true; } });
    let cur = {};
    const sc = mkScope($('#d3scopeHost'), { v1: 5, v2: 10, t: 1e-4, ...scOpt, extra: () => `<br><span style="color:#7ee08a">OTO</span> t<sub>s</sub>(%2) ${cur.st ? eng(cur.st.ts, 's') : '—'}<br>sıfır geçişi: ${cur.st ? cur.st.zc : '—'}` });
    const P = () => ({ L: kL.value, C: kC.value, R: kR.value, V0: kV0.value, I0: kI0.value * 1e-3 });
    function update() {
      if (!sc.dirty) return; sc.dirty = false;
      const p = P(), nat = natural(p.R, p.L, p.C, p.V0, p.I0);
      cur = { p, st: settle(nat) }; rL(Lab.ohm(p.R).replace(' Ω', '').replace('Ω', ''));
      sc.draw(natTrace(nat, sc.sc.tdiv)); drawPlot();
    }
    const plot = new Lab.Plot($('#d3plot'), { xlabel: 'R  (Ω)', ylabel: 't_s  (ms)' });
    function drawPlot() {
      const p = P(), rows = S.d3rows.filter((r) => r.L === p.L && r.C === p.C), ser = [];
      const xs = rows.map((r) => r.R), Rk = 0.5 * Math.sqrt(p.L / p.C);
      let x0 = xs.length ? Math.min(...xs) * 0.9 : Rk / 3, x1 = xs.length ? Math.max(...xs) * 1.1 : Rk * 3;
      if ($('#d3theo').checked) {
        x0 = Math.min(x0, Rk / 3); x1 = Math.max(x1, Rk * 3);
        const pts = []; for (let k = 0; k <= 80; k++) { const R = x0 * Math.pow(x1 / x0, k / 80); pts.push([R, settle(natural(R, p.L, p.C, p.V0, p.I0)).ts * 1e3]); }
        ser.push({ pts, line: true, color: '#e07a10', dash: [6, 4] });
      }
      ser.push({ pts: rows.map((r) => [r.R, r.ts * 1e3]), dots: true, color: '#0b5cad' });
      plot.draw(ser, [x0, x1]);
    }
    $('#d3theo').onchange = () => { if ($('#d3theo').checked) { S.fl.d3theo = true; save(); } drawPlot(); };
    const tbody = $('#d3tab tbody');
    function table() { tbody.innerHTML = S.d3rows.map((r, i) => `<tr><td>${i + 1}</td><td>${eng(r.L, 'H')}</td><td>${eng(r.C, 'F')}</td><td>${Lab.ohm(r.R)}</td><td>${eng(r.ts, 's')}</td><td>${r.zc}</td><td>${num(r.mx, 2)}</td><td>${num(r.mn, 2)}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; drawPlot(); }
    function rec() {
      if (!cur.st || !sc.m) return; const p = P();
      S.d3rows.push({ ...p, ts: cur.st.ts, zc: cur.st.zc, mx: sc.m.ch[0].max, mn: sc.m.ch[0].min }); save(); table();
      Lab.toast('Kaydedildi: R = ' + Lab.ohm(p.R) + ', t_s = ' + eng(cur.st.ts, 's'));
    }
    $('#d3rec').onclick = rec; $('#d3del').onclick = () => { S.d3rows.pop(); save(); table(); };
    $('#d3csv').onclick = () => Lab.downloadCSV('hafta12_deney3.csv', ['#', 'L (H)', 'C (F)', 'R (ohm)', 'ts (s)', 'sifir gecisi', 'v maks', 'v min'], S.d3rows.map((r, i) => [i + 1, r.L, r.C, +r.R.toFixed(2), +r.ts.toExponential(4), r.zc, +r.mx.toFixed(3), +r.mn.toFixed(3)]));
    table();
    return { sc, update, rec, P };
  })();
  XP.d3 = D3;
  const isA = (r) => r.L === 0.05 && r.C === 2e-7;
  steps('d3', [
    { t: '<b>L = 50 mH, C = 0,2 µF</b> seçin (Örnek 4.1). Yükleyici V<sub>0</sub> = 12 V, I<sub>0</sub> = 30 mA.', test: () => isA(D3.P()) },
    { t: 'Hesapladığınız kritik direnci ayarlayın (dokunup yazabilirsiniz): salınım yok (en fazla bir sıfır geçişi), en hızlı dönüş.', test: () => { const p = D3.P(); return isA(p) && near(p.R, 250, 3.75); } },
    { t: 'R<sub>k</sub>\'nın iki yanından (küçük ve büyük) toplam <b>en az 6</b> ölçüm kaydedin.', test: () => { const L = S.d3rows.filter(isA); return L.length >= 6 && L.some((r) => r.R < 240) && L.some((r) => r.R > 260); } },
    { t: '<b>Teorik eğriyi</b> açın: en kısa t<sub>s</sub> tam R<sub>k</sub>\'da mı, biraz yukarısında mı?', test: () => !!S.fl.d3theo },
    { t: 'Örnek 4.4 için tasarlayın: <b>L = 8 H, C = 0,125 µF</b>; kritik R\'yi bulup kaydedin.', test: () => S.d3rows.some((r) => r.L === 8 && r.C === 1.25e-7 && near(r.R, 4000, 60)) },
  ]);
  numq('d3', '#d3Q', { id: 'd3q1', q: 'L = 50 mH, C = 0,2 µF için kritik sönüm direnci kaç Ω\'dur?', answer: 250, tol: 1, unit: 'Ω', explain: 'R<sub>k</sub> = ½√(L/C) = 250 Ω.', hint: 'α = ω<sub>0</sub>' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'L = 8 H, C = 0,125 µF için kritik sönüm direnci kaç kΩ\'dur?', answer: 4, tol: 1, unit: 'kΩ', explain: '½√(8/0,125·10<sup>−6</sup>) = ½ × 8000 = 4 kΩ.', hint: '½√(L/C)' });
  mcq('d3', '#d3Q', { id: 'd3q3', q: 'Ölçümlerinize göre salınım yapmadan (en fazla bir sıfır geçişi) en kısa sürede oturan tasarım hangisidir?', opts: ['En küçük R (aşırı sönüm)', 'R = R<sub>k</sub> (kritik sönüm)', 'En büyük R (az sönüm)', 'R\'den bağımsız'], correct: 1, explain: 'Aşırı sönümde yavaş kök kuyruk bırakır, az sönümde aşım vardır. Hafif aşıma izin verilirse R biraz büyütülerek daha da kısa t<sub>s</sub> elde edilebilir: grafiğinizde minimum R<sub>k</sub>\'nın biraz sağındadır.', hint: 'Sıfır geçişi sütunu 1 ya da 0 olanlar arasında t<sub>s</sub> en küçük hangisi?' });
  mcq('d3', '#d3Q', { id: 'd3q4', q: 'Kritik tasarımda C toleransı nedeniyle gerçek C %10 büyük çıkarsa devre ne olur?', opts: ['Kritik kalır', 'Hafif az sönümlü olur', 'Hafif aşırı sönümlü olur', 'Kararsız olur'], correct: 1, explain: 'α = 1/(2RC) %9 azalır, ω<sub>0</sub> = 1/√(LC) yalnızca %4,7 azalır ⇒ α &lt; ω<sub>0</sub>. Bu yüzden pratikte R biraz küçük seçilir.', hint: 'α ∝ 1/C, ω<sub>0</sub> ∝ 1/√C' });

  /* ================= DENEY 4 · Gerçek bobin ================= */
  const D4 = (() => {
    const L = 8, C = 0.125e-6;
    const box = $('#d4inst');
    const bo = inst(box, 'BOBİN · 8 H', false);
    const bI = segBtn(bo.c, 'İdeal model', S.d4real === false), bRe = segBtn(bo.c, 'Gerçek bobin', S.d4real !== false);
    const setM = (r) => { S.d4real = r; save(); bI.classList.toggle('on', !r); bRe.classList.toggle('on', r); sc.dirty = true; if (!r && kR.value >= 1e11) { S.fl.d4ideal = true; save(); } };
    bI.onclick = () => setM(false); bRe.onclick = () => setM(true);
    const dm = inst(box, 'DMM · Ω', false); const dmL = lcd(dm.el, 'Ω · bobin uçları', 'Ω', 110);
    const bO = segBtn(dm.c, 'Ölç (enerjisiz)', false); bO.onclick = () => { S.fl.d4ohm = true; save(); dmL(num(S.rL + (Math.random() - 0.5) * 0.4, 1)); };
    dmL('— — —');
    const rb = inst(box, 'DİRENÇ KUTUSU', false);
    const kR = new Lab.Knob(rb.c, { label: 'R', list: [1e4, 2e4, 5e4, 1e12], value: S.d4R ?? 1e12, fmt: (v) => (v >= 1e11 ? '∞ (sökülü)' : Lab.ohm(v)), onChange: (v) => { S.d4R = v; save(); sc.dirty = true; if (S.d4real === false && v >= 1e11) { S.fl.d4ideal = true; save(); } } });
    const ic = inst(box, 'YÜKLEYİCİ'); lcd(ic.el, 'V<sub>0</sub> = 0 · I<sub>0</sub>', 'mA', 110)(num(-12.25, 2));
    const sc = mkScope($('#d4scopeHost'), { v1: 50, v2: 5, t: 0.01, ...scOpt });
    const P = () => ({ R: kR.value, r: S.d4real === false ? 0 : S.rL, real: S.d4real !== false, L, C, V0: 0, I0: -12.25e-3 });
    // şema
    const g = $('#d4sch');
    sch.w(g, [[40, 40], [460, 40]]); sch.w(g, [[40, 210], [460, 210]]); sch.gnd(g, 250, 210);
    sch.rV(g, 100, 40, 210); sch.lV(g, 250, 40, 130); sch.rV(g, 250, 130, 210); sch.cV(g, 400, 40, 210);
    [100, 250, 400].forEach((x) => { sch.dot(g, x, 40); sch.dot(g, x, 210); });
    E('rect', { x: 225, y: 45, width: 50, height: 160, fill: 'none', stroke: '#e07a10', 'stroke-dasharray': '4 3', rx: 5 }, g);
    sch.t(g, 285, 90, 'L = 8 H', 'lbl', 'start'); const tr = sch.t(g, 285, 175, '', 'lbl', 'start'); sch.t(g, 250, 232, 'gerçek bobin', 'lbl').style.fill = '#e07a10';
    const tR = sch.t(g, 115, 130, '', 'lbl', 'start'); sch.t(g, 418, 130, '0,125 µF', 'lbl', 'start');
    function update() {
      if (!sc.dirty) return; sc.dirty = false;
      const p = P(); tR.textContent = p.R >= 1e11 ? 'R = ∞' : 'R = ' + Lab.ohm(p.R); tr.textContent = p.real ? 'r_L = ?' : 'r_L = 0 (ideal)';
      sc.draw(rkTrace(p, sc.sc.tdiv));
    }
    const tbody = $('#d4tab tbody');
    function table() { tbody.innerHTML = S.d4rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.real ? 'gerçek' : 'ideal'}</td><td>${r.R >= 1e11 ? '∞' : Lab.ohm(r.R)}</td><td>${eng(r.ta, 's')}</td><td>${num(r.va, 3)}</td><td>${eng(r.tb, 's')}</td><td>${num(r.vb, 3)}</td><td>${eng(r.tb - r.ta, 's')}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; }
    function rec() {
      if (!sc.sc.cur.on || !sc.m || !sc.m.cur) return Lab.toast('İMLEÇ\'leri açın, A ve B\'yi iki pozitif tepeye yerleştirin.');
      const c = sc.m.cur, p = P();
      S.d4rows.push({ R: p.R, r: p.r, real: p.real, ta: sc.tc(sc.sc.cur.a), va: c.v1a, tb: sc.tc(sc.sc.cur.b), vb: c.v1b }); save(); table();
      Lab.toast(`Kaydedildi: Δt = ${eng(c.dt, 's')}, v_A/v_B = ${num(c.v1a / c.v1b, 3)}`);
    }
    $('#d4rec').onclick = rec; $('#d4del').onclick = () => { S.d4rows.pop(); save(); table(); };
    $('#d4csv').onclick = () => Lab.downloadCSV('hafta12_deney4.csv', ['#', 'model', 'R', 'tA (s)', 'vA (V)', 'tB (s)', 'vB (V)'], S.d4rows.map((r, i) => [i + 1, r.real ? 'gercek' : 'ideal', r.R >= 1e11 ? 'sonsuz' : r.R, +r.ta.toFixed(6), +r.va.toFixed(4), +r.tb.toFixed(6), +r.vb.toFixed(4)]));
    table();
    // Δt bir ya da birkaç tam periyot olabilir
    const goodRow = (r) => { const Td = tdTrue(r.R, r.r, L, C), k = Math.round((r.tb - r.ta) / Td); return k >= 1 && near(r.tb - r.ta, k * Td, 0.02 * Td) && r.va > r.vb && r.vb > 0; };
    return { sc, update, rec, goodRow };
  })();
  XP.d4 = D4;
  steps('d4', [
    { t: 'DMM ile bobinin <b>sargı direncini</b> ölçün (devre enerjisizken).', test: () => !!S.fl.d4ohm },
    { t: '<b>Gerçek bobin</b>, <b>R = ∞</b>: salınım sönüyor mu? İki pozitif tepe arası (bir ya da birkaç periyot) imleçle ölçüp kaydedin.', test: () => S.d4rows.some((r) => r.real && r.R >= 1e11 && D4.goodRow(r)) },
    { t: 'Gerçek bobin, <b>R = 20 kΩ</b> için aynı ölçümü kaydedin.', test: () => S.d4rows.some((r) => r.real && r.R === 2e4 && D4.goodRow(r)) },
    { t: '<b>İdeal model</b> ve R = ∞ seçip dalgayı inceleyin: model ne öngörüyor?', test: () => !!S.fl.d4ideal },
  ]);
  numq('d4', '#d4Q', { id: 'd4q1', q: 'Ölçtüğünüz sargı direnci r<sub>L</sub> kaç Ω\'dur?', answer: () => S.rL, tol: 1, unit: 'Ω', explain: 'Büyük endüktanslı bobinlerde yüzlerce ohm olağandır.', hint: 'DMM göstergesi.' });
  numq('d4', '#d4Q', { id: 'd4q2', q: 'R = ∞ ölçümünüzden α kaç rad/s\'dir? (α = ln(v<sub>A</sub>/v<sub>B</sub>)/Δt)', answer: () => S.rL / 16, tol: 6, unit: 'rad/s', explain: 'Model: α = r<sub>L</sub>/(2L) = r<sub>L</sub>/16. Ölçümünüz bununla uyuşmalı.', hint: 'Δt birden çok periyotsa formül yine geçerlidir.' });
  numq('d4', '#d4Q', { id: 'd4q3', q: 'R = 20 kΩ ve gerçek bobinle beklenen toplam α kaç rad/s\'dir? (Ölçümünüzle karşılaştırın.)', answer: () => 200 + S.rL / 16, tol: 6, unit: 'rad/s', explain: 'α ≈ 1/(2RC) + r<sub>L</sub>/(2L) = 200 + r<sub>L</sub>/16.', hint: 'İki sönüm kaynağı toplanır.' });
  mcq('d4', '#d4Q', { id: 'd4q4', q: 'İdeal modelde R = ∞ iken ne öngörülür, gerçekte ne oldu?', opts: ['İkisinde de salınım söner', 'İdeal: α = 0, salınım hiç sönmez; gerçek: r<sub>L</sub> nedeniyle sönümlü', 'İdeal: aşırı sönüm; gerçek: az sönüm', 'Fark yok'], correct: 1, explain: 'Kayıpsız LC devresi yalnızca idealleştirmedir; Q = ω<sub>0</sub>L/r<sub>L</sub> sonludur.', hint: 'α = 1/(2RC), R → ∞' });
  mcq('d4', '#d4Q', { id: 'd4q5', q: 'Sargı direnci hesaba katılınca kritik sönüm için gereken paralel R nasıl değişir?', opts: ['Biraz daha büyük R gerekir', 'Biraz daha küçük R gerekir', 'Değişmez', 'Kritik sönüm imkânsızdır'], correct: 0, explain: 'Bobin zaten r<sub>L</sub>/(2L) kadar sönüm katıyor; α = ω<sub>0</sub> için paralel dirençten gelen 1/(2RC) payı azalmalı ⇒ R büyümeli.', hint: 'α = 1/(2RC) + r<sub>L</sub>/(2L)' });

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
      <h2 style="margin:0">Devre Kuramı I · Sanal Laboratuvar · Hafta 12 Raporu</h2>
      <p><b>Konu:</b> Paralel RLC devresinin doğal tepkisi: aşırı, az ve kritik sönüm (Bölüm 4.1–4.4)</p>
      <table class="data" style="width:auto"><tr><th>Ad Soyad</th><td class="l">${S.st.name || ''}</td><th>No</th><td class="l">${S.st.no || ''}</td><th>Grup</th><td class="l">${S.st.group || ''}</td><th>Tarih</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Özet</h3>
      <p>Tamamlanan föy adımı: <b>${sOk}/${sTot}</b> · Doğru yanıt: <b>${ok}/${tot}</b> · Puan: <b>${Math.round((50 * sOk) / sTot + (50 * ok) / tot)}/100</b></p>
      <h3>Yanıtlar</h3>
      <table class="data"><thead><tr><th>Bölüm</th><th>Soru</th><th>Yanıt</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Deney 1 · Üç tepki</h3>${tb('#d1tab')}
      <h3>Deney 2 · ω<sub>d</sub> ve α ölçümü</h3>${tb('#d2tab')}
      <h3>Deney 3 · Kritik sönüm tasarımı</h3>${tb('#d3tab')}
      <h3>Deney 4 · Gerçek bobin</h3>${tb('#d4tab')}
      <h3>Grafikler</h3>
      <div>${img(D1.sc.cv)} ${img(D2.sc.cv)}</div><div>${img(D3.sc.cv)} ${img($('#d3plot'))}</div><div>${img(D4.sc.cv)}</div>
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
    requestAnimationFrame(loop);
  }
  ['d1', 'd2', 'd3', 'd4'].forEach(evalSteps);
  go(S.page); progress(); loop();
})();

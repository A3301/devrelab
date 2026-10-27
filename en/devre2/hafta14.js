/* Devre Kuramı II · Hafta 14 — Güç ölçme: wattmetre ve iki-wattmetre yöntemi (Bölüm 3.6) + dönem tekrarı */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd2h14';
  const S = Object.assign({ answers: {}, steps: {}, st: {}, page: 'giris', fl: {}, d1rows: [], d2rows: [], d3rows: [], d4rows: [] }, Lab.store.load(KEY));
  // kara kutu yükü; pf ≤ 0,89 olmalı ki 0,95’e kompanzasyon anlamlı olsun (X ≥ 0,5R)
  while (!S.bx || S.bx.X < 0.5 * S.bx.R) S.bx = { R: 12 + Math.round(Math.random() * 28), X: 10 + Math.round(Math.random() * 30), D: Math.random() < 0.5 };
  const pages = ['giris', 'onbilgi', 'onhaz', 'd1', 'd2', 'd3', 'd4', 'rapor'];
  Lab.answers = S.answers;
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => Lab.store.save(KEY, S), 300); };
  Lab.onAnswer = () => { save(); progress(); };
  const near = (a, b, t) => Math.abs(a - b) <= t;
  const flag = (k) => { if (!S.fl[k]) { S.fl[k] = true; save(); } };

  /* ---------- kompleks sayı yardımcıları ---------- */
  const D2R = Math.PI / 180;
  const cx = (re, im = 0) => ({ re, im });
  const cadd = (...a) => a.reduce((s, z) => cx(s.re + z.re, s.im + z.im), cx(0));
  const csub = (a, b) => cx(a.re - b.re, a.im - b.im);
  const cmul = (a, b) => cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  const cdiv = (a, b) => { const d = b.re * b.re + b.im * b.im; return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); };
  const cabs = (a) => Math.hypot(a.re, a.im);
  const cang = (a) => Math.atan2(a.im, a.re) / D2R;
  const polar = (m, deg) => cx(m * Math.cos(deg * D2R), m * Math.sin(deg * D2R));
  const conj = (a) => cx(a.re, -a.im);
  const csc = (a, k) => cx(a.re * k, a.im * k);
  const cinv = (a) => cdiv(cx(1), a);
  const fz = (z, u = '', d = 2) => num(cabs(z), d) + ' ' + u + ' ∠ ' + num(cang(z), 1) + '°';
  const wrap180 = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

  /* ---------- üç faz çözücüler ---------- */
  // dengeli kaynak: seq 'abc' ⇒ b −120°, c +120° ; 'acb' ⇒ b +120°, c −120°
  const src3 = (Vp, seq = 'abc', ph = 0) => [polar(Vp, ph), polar(Vp, ph + (seq === 'abc' ? -120 : 120)), polar(Vp, ph + (seq === 'abc' ? 120 : -120))];
  // Y–Y genel çözüm. Zs: kaynak+hat seri empedansı (her faz), Z: yük kolları, Z0: nötr (null = kopuk)
  function solveYY(Vs, Zs, Z, Z0) {
    const Zt = Z.map((z, i) => cadd(z, Zs[i])), Y = Zt.map(cinv);
    let num_ = cx(0), den = cx(0);
    Y.forEach((y, i) => { num_ = cadd(num_, cmul(Vs[i], y)); den = cadd(den, y); });
    if (Z0) den = cadd(den, cinv(Z0));
    const VN = cdiv(num_, den);
    const I = Y.map((y, i) => cmul(csub(Vs[i], VN), y));
    const I0 = Z0 ? cdiv(VN, Z0) : cx(0);
    const VL = I.map((ii, i) => cmul(Z[i], ii)); // yük faz gerilimleri (N’ye göre)
    const VT = VL.map((v) => cadd(v, VN)); // yük uçları (kaynak nötrüne göre)
    return { VN, I, I0, VL, VT };
  }
  // Δ kolları [Zab, Zbc, Zca] → eşdeğer Y [ZA, ZB, ZC]
  function d2y(Zd) { const s = cadd(...Zd); return [cdiv(cmul(Zd[0], Zd[2]), s), cdiv(cmul(Zd[0], Zd[1]), s), cdiv(cmul(Zd[1], Zd[2]), s)]; }
  const lineV = (V) => [csub(V[0], V[1]), csub(V[1], V[2]), csub(V[2], V[0])];

  /* ---------- cihaz yardımcıları ---------- */
  function inst(parent, brand, dark = true, right = '') {
    const d = document.createElement('div'); d.className = 'inst' + (dark ? ' dark' : '');
    d.innerHTML = `<div class="brand"><span>${brand}</span><span>${right}</span></div><div class="ctrls"></div>`;
    parent.appendChild(d); return { el: d, c: d.querySelector('.ctrls') };
  }
  function lcd(parent, label, unit, w = 130) {
    const d = document.createElement('div'); d.className = 'lcd'; d.style.minWidth = w + 'px'; d.style.marginBottom = '6px';
    d.innerHTML = `<div class="lab">${label}</div><span class="big">0</span><span class="unit">${unit}</span>`;
    parent.insertBefore(d, parent.querySelector('.ctrls'));
    const b = d.querySelector('.big'), u = d.querySelector('.unit'), l = d.querySelector('.lab');
    const f = (t, un) => { b.textContent = t; if (un != null) u.textContent = un; };
    f.label = (s) => { l.innerHTML = s; };
    return f;
  }
  function segBtn(parent, txt, on) { const b = document.createElement('button'); b.className = 'seg-btn' + (on ? ' on' : ''); b.innerHTML = txt; parent.appendChild(b); return b; }
  function selBox(parent, label, opts, val, onChange) {
    const l = document.createElement('label'); l.style.cssText = 'font-size:11px;display:flex;flex-direction:column;gap:2px;font-weight:600';
    l.innerHTML = `<span>${label}</span>`;
    const s = document.createElement('select'); s.style.cssText = 'font-size:12px;padding:2px 4px';
    opts.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.innerHTML = t; s.appendChild(o); });
    s.value = val; s.onchange = () => onChange(s.value); l.appendChild(s); parent.appendChild(l); return s;
  }
  // iki konumlu anahtar (segBtn çifti)
  function toggle2(parent, a, b, val, onChange) {
    const w = document.createElement('div'); w.className = 'row'; w.style.gap = '3px'; parent.appendChild(w);
    const A = segBtn(w, a, !val), B = segBtn(w, b, !!val);
    const set = (v, silent) => { A.classList.toggle('on', !v); B.classList.toggle('on', !!v); if (!silent) onChange(!!v); };
    A.onclick = () => set(false); B.onclick = () => set(true);
    return set;
  }

  /* ---------- şema yardımcıları (hafta01’den) ---------- */
  const sch = {
    w: (g, pts, st) => { const e = E('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'w' }, g); if (st) e.setAttribute('style', st); return e; },
    dot: (g, x, y) => E('circle', { cx: x, cy: y, r: 3.5, class: 'node' }, g),
    t: (g, x, y, s, cls = 'lbl', anchor = 'middle') => { const e = E('text', { x, y, class: cls, 'text-anchor': anchor }, g); e.innerHTML = s; return e; },
    zH(g, x1, x2, y, lab) { E('rect', { x: x1 + 6, y: y - 9, width: x2 - x1 - 12, height: 18, class: 'w', fill: '#fff' }, g); E('path', { d: `M${x1},${y} h6 M${x2 - 6},${y} H${x2}`, class: 'w' }, g); if (lab) return sch.t(g, (x1 + x2) / 2, y - 14, lab, 'lbl'); },
    zV(g, x, y1, y2, lab) { E('rect', { x: x - 9, y: y1 + 6, width: 18, height: y2 - y1 - 12, class: 'w', fill: '#fff' }, g); E('path', { d: `M${x},${y1} v6 M${x},${y2 - 6} V${y2}`, class: 'w' }, g); if (lab) return sch.t(g, x + 14, (y1 + y2) / 2 + 4, lab, 'lbl', 'start'); },
    zL(g, x1, y1, x2, y2) { // eğik empedans (Δ kolları için)
      const L = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1) / D2R, gg = E('g', { transform: `translate(${x1},${y1}) rotate(${a})` }, g);
      E('path', { d: `M0,0 h${L * 0.25} M${L * 0.75},0 H${L}`, class: 'w' }, gg); E('rect', { x: L * 0.25, y: -9, width: L * 0.5, height: 18, class: 'w', fill: '#fff' }, gg);
    },
    src(g, x, y, r = 18) { E('circle', { cx: x, cy: y, r, class: 'w', fill: '#fff' }, g); E('path', { d: `M${x - 9},${y} q4.5,-11 9,0 t9,0`, class: 'w' }, g); },
    gnd(g, x, y) { E('path', { d: `M${x},${y} v8 M${x - 11},${y + 8} h22 M${x - 7},${y + 13} h14 M${x - 3},${y + 18} h6`, class: 'w' }, g); },
    term(g, x, y) { E('circle', { cx: x, cy: y, r: 4.5, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g); },
    sw(g, x1, x2, y) {
      const b = E('line', { x1, y1: y, x2, y2: y, class: 'w' }, g);
      [x1, x2].forEach((x) => E('circle', { cx: x, cy: y, r: 3.5, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g));
      return (on) => { b.setAttribute('x2', on ? x2 : x2 - 6); b.setAttribute('y2', on ? y : y - 18); b.style.stroke = on ? '#1a8a4a' : '#c62828'; };
    },
    meter(g, x, y, s, col = '#0b5cad') { E('circle', { cx: x, cy: y, r: 13, fill: '#fff', stroke: col, 'stroke-width': 2 }, g); const t = sch.t(g, x, y + 5, s, 'lbl'); t.style.fontWeight = 700; t.style.fill = col; return t; },
  };

  /* ---------- fazör diyagramı ---------- */
  // items: [{z, c, l, o (başlangıç noktası, ops.), dash}] ; o.R yarıçap (piksel)
  function phasors(svgEl, items, opt = {}) {
    svgEl.innerHTML = '';
    const vb = svgEl.viewBox.baseVal, W = vb.width || 300, H = vb.height || 300, cxp = W / 2, cyp = H / 2, R = opt.R || Math.min(W, H) * 0.4;
    const mx = opt.max || Math.max(1e-9, ...items.map((it) => cabs(cadd(it.z, it.o || cx(0)))), ...items.map((it) => cabs(it.o || cx(0))));
    const k = R / mx, P = (z) => [cxp + z.re * k, cyp - z.im * k];
    E('line', { x1: 8, y1: cyp, x2: W - 8, y2: cyp, stroke: '#bbb' }, svgEl); E('line', { x1: cxp, y1: 8, x2: cxp, y2: H - 8, stroke: '#bbb' }, svgEl);
    E('circle', { cx: cxp, cy: cyp, r: R, fill: 'none', stroke: '#dde', 'stroke-dasharray': '3 4' }, svgEl);
    sch.t(svgEl, W - 10, cyp - 5, 'Re', 'lbl', 'end').style.fontSize = '11px'; sch.t(svgEl, cxp + 5, 18, 'Im', 'lbl', 'start').style.fontSize = '11px';
    items.forEach((it) => {
      const o = it.o || cx(0), [x1, y1] = P(o), [x2, y2] = P(cadd(o, it.z));
      const L = Math.hypot(x2 - x1, y2 - y1); if (L < 1) return;
      const ux = (x2 - x1) / L, uy = (y2 - y1) / L, hl = Math.min(11, L * 0.4);
      E('line', { x1, y1, x2: x2 - ux * hl * 0.8, y2: y2 - uy * hl * 0.8, stroke: it.c, 'stroke-width': it.w || 2.6, 'stroke-dasharray': it.dash || '' }, svgEl);
      E('path', { d: `M${x2},${y2} L${x2 - ux * hl - uy * hl * 0.45},${y2 - uy * hl + ux * hl * 0.45} L${x2 - ux * hl + uy * hl * 0.45},${y2 - uy * hl - ux * hl * 0.45} Z`, fill: it.c }, svgEl);
      if (it.l) { const t = sch.t(svgEl, x2 + ux * 13, y2 + uy * 13 + 4, it.l, 'lbl'); t.style.fill = it.c; t.style.fontWeight = 700; t.style.fontSize = '12px'; }
    });
    (opt.pts || []).forEach((p) => { const [x, y] = P(p.z); E('circle', { cx: x, cy: y, r: 4, fill: p.c || '#222' }, svgEl); if (p.l) sch.t(svgEl, x + 7, y - 6, p.l, 'lbl', 'start').style.fontSize = '12px'; });
  }

  /* ---------- çok kanallı osiloskop (tetik: CH1 yükselen sıfır geçişi) ---------- */
  const VDIV = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500];
  const TDIV = [1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2];
  function mkOsc(host, o) {
    const w = document.createElement('div'); w.className = 'inst dark scopewrap'; w.style.cssText = 'flex:1;min-width:420px';
    w.innerHTML = `<div class="brand"><span>${o.brand || 'DSO-4C · Four-channel oscilloscope · differential probes'}</span><span><span class="led on g"></span> RUN · trigger CH1 ↑</span></div>
      <div class="row" style="align-items:flex-start;flex-wrap:nowrap"><canvas width="640" height="400" style="width:100%;max-width:640px;touch-action:none"></canvas>
      <div style="min-width:175px"><div class="ctrls"></div><div class="row btns" style="margin:6px 0;gap:4px"></div><div class="meas"></div></div></div>`;
    host.appendChild(w);
    const cv = w.querySelector('canvas'), g = cv.getContext('2d'), sk = w.querySelector('.ctrls'), bt = w.querySelector('.btns'), me = w.querySelector('.meas');
    const self = { cv, dirty: true, tdiv: o.t, chs: o.chs.map((c) => Object.assign({ on: true }, c)), gd: o.groups.map((x) => x.v), cur: { on: false, a: 2.5, b: 4, drag: null }, src: null };
    o.groups.forEach((gr, i) => new Lab.Knob(sk, { label: gr.l, list: gr.list || VDIV, value: gr.v, dark: true, size: 38, fmt: (v) => eng(v, gr.u), onChange: (v) => { self.gd[i] = v; self.dirty = true; } }));
    self.kt = new Lab.Knob(sk, { label: 'TIME/div', list: TDIV, value: o.t, dark: true, size: 38, fmt: (v) => eng(v, 's'), onChange: (v) => { self.tdiv = v; self.dirty = true; } });
    self.chs.forEach((c, k) => { const b = segBtn(bt, 'CH' + (k + 1), true); b.style.borderBottom = '3px solid ' + c.c; c.btn = b; b.onclick = () => { c.on = !c.on; b.classList.toggle('on', c.on); self.dirty = true; }; });
    const bc = segBtn(bt, 'CURSOR', false); bc.onclick = () => { self.cur.on = !self.cur.on; bc.classList.toggle('on', self.cur.on); self.dirty = true; };
    const pos = (e) => { const r = cv.getBoundingClientRect(); return clamp(((e.clientX - r.left) / r.width) * 10, 0, 10); };
    cv.addEventListener('pointerdown', (e) => { if (!self.cur.on) return; const x = pos(e); self.cur.drag = Math.abs(x - self.cur.a) < Math.abs(x - self.cur.b) ? 'a' : 'b'; cv.setPointerCapture(e.pointerId); self.cur[self.cur.drag] = x; self.dirty = true; });
    cv.addEventListener('pointermove', (e) => { if (self.cur.drag) { self.cur[self.cur.drag] = pos(e); self.dirty = true; } });
    cv.addEventListener('pointerup', () => (self.cur.drag = null));
    self.tAt = (x) => (x - 1) * self.tdiv; // tetikten itibaren zaman
    self.t0 = () => { const s = self.src; if (!s || s.trig == null) return 0; const T = 2 * Math.PI / s.w; let t = ((-90 - s.trig) * D2R) / s.w; t = ((t % T) + T) % T; return t; };
    self.val = (k, x) => self.src.f[k](self.t0() + self.tAt(x));
    self.chOn = (k) => self.chs[k].on;
    self.draw = (src) => {
      if (src) self.src = src; const s = self.src; if (!s) return;
      const W = cv.width, H = cv.height, dx = W / 10, dy = H / 8;
      g.fillStyle = '#06140c'; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(120,200,140,.18)'; g.lineWidth = 1;
      for (let i = 1; i < 10; i++) { g.beginPath(); g.moveTo(i * dx, 0); g.lineTo(i * dx, H); g.stroke(); }
      for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(0, i * dy); g.lineTo(W, i * dy); g.stroke(); }
      g.strokeStyle = 'rgba(120,200,140,.45)';
      for (let i = 0; i < 50; i++) { g.beginPath(); g.moveTo(i * dx / 5, H / 2 - 3); g.lineTo(i * dx / 5, H / 2 + 3); g.stroke(); }
      const t0 = self.t0(), N = 700;
      self.chs.forEach((c, k) => {
        if (!c.on || !s.f[k]) return;
        const vd = self.gd[c.g || 0]; g.strokeStyle = c.c; g.lineWidth = 2; g.shadowColor = c.c; g.shadowBlur = 5; g.beginPath();
        for (let i = 0; i <= N; i++) { const x = (i / N) * 10, y = s.f[k](t0 + self.tAt(x)), Y = clamp(H / 2 - (y / vd) * dy, -2, H + 2); i ? g.lineTo(x * dx, Y) : g.moveTo(x * dx, Y); }
        g.stroke(); g.shadowBlur = 0;
      });
      g.font = '12px Consolas'; let lx = 8;
      self.chs.forEach((c, k) => { if (!c.on) return; g.fillStyle = c.c; const t = 'CH' + (k + 1) + ' ' + (s.names ? s.names[k] : c.n); g.fillText(t, lx, 15); lx += g.measureText(t).width + 14; });
      g.fillStyle = '#9fe0b0'; g.fillText(o.groups.map((gr, i) => gr.l.replace(/\/d(iv)?/, '') + ' ' + eng(self.gd[i], gr.u) + '/div').join('  ') + '   ' + eng(self.tdiv, 's') + '/d', 8, H - 8);
      g.fillStyle = '#f2d21b'; g.fillText('T▼', dx - 8, 28);
      if (self.cur.on) {
        g.strokeStyle = '#ff7cf0'; g.setLineDash([5, 4]);
        ['a', 'b'].forEach((q) => { const X = (self.cur[q] / 10) * W; g.beginPath(); g.moveTo(X, 0); g.lineTo(X, H); g.stroke(); g.fillStyle = '#ff7cf0'; g.fillText(q.toUpperCase(), X + 3, H - 24); });
        g.setLineDash([]);
      }
      let h = '';
      self.chs.forEach((c, k) => { if (c.on && s.rms) h += `<span style="color:${c.c}">CH${k + 1}</span> ${s.mlab || 'rms'} ${eng(s.rms[k], o.groups[c.g || 0].u)}<br>`; });
      if (self.cur.on) {
        h += `<span style="color:#ff7cf0">CURSOR</span> t<sub>A</sub> ${eng(self.tAt(self.cur.a), 's')} · t<sub>B</sub> ${eng(self.tAt(self.cur.b), 's')}<br>Δt = t<sub>B</sub>−t<sub>A</sub> = <b>${eng(self.tAt(self.cur.b) - self.tAt(self.cur.a), 's')}</b><br>`;
        self.chs.forEach((c, k) => { if (c.on) h += `<span style="color:${c.c}">CH${k + 1}</span> A ${eng(self.val(k, self.cur.a), o.groups[c.g || 0].u)} · B ${eng(self.val(k, self.cur.b), o.groups[c.g || 0].u)}<br>`; });
      }
      me.innerHTML = h;
    };
    self.curDt = () => self.tAt(self.cur.b) - self.tAt(self.cur.a);
    return self;
  }
  // sinüs fonksiyonu (rms fazörden)
  const sig = (Z, w) => (t) => Math.SQRT2 * (Z.re * Math.cos(w * t) - Z.im * Math.sin(w * t));
  // imleç ölçümü geçerli mi? A, k1 kanalının tepesinde; B, k2 kanalının bir tepesinde; Δt faz farkıyla uyumlu
  function curPhaseOK(sc, Z1, Z2, w, tolF = 0.035) {
    if (!sc.cur.on) return false;
    const T = 2 * Math.PI / w, dt = sc.curDt(), exp = -((cang(Z2) - cang(Z1)) * D2R) / w;
    const r = ((dt - exp) % T + T) % T;
    return (r < tolF * T || r > (1 - tolF) * T);
  }

  /* ================= GEZİNME / İLERLEME ================= */
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
      let ok = false; try { ok = s.test(); } catch (e) {}
      if (!S.steps[id] && ok) { S.steps[id] = true; save(); Lab.toast('✔ Step completed: ' + s.t.replace(/<[^>]+>/g, '').slice(0, 70)); progress(); }
      lis[i].classList.toggle('done', !!S.steps[id]);
    });
  }
  const qids = {};
  function progress() {
    let tot = 0, ok = 0;
    Object.keys(stepDefs).forEach((k) => stepDefs[k].forEach((_, i) => { tot++; if (S.steps[k + '_' + i]) ok++; }));
    Object.values(qids).flat().forEach((q) => { tot++; if (S.answers[q] && S.answers[q].ok) ok++; });
    const p = tot ? Math.round((100 * ok) / tot) : 0;
    $('#prog').style.width = p + '%'; $('#progTxt').textContent = p + '%';
    const dots = $$('#nav .dot');
    pages.forEach((pg, i) => {
      let done = false;
      if (pg === 'giris' || pg === 'onbilgi') done = true;
      else if (qids[pg]) done = qids[pg].every((q) => S.answers[q] && S.answers[q].ok) && (!stepDefs[pg] || stepDefs[pg].every((_, j) => S.steps[pg + '_' + j]));
      else if (pg === 'rapor') done = p === 100;
      if (dots[i]) dots[i].classList.toggle('done', done);
    });
  }
  const mcq = (pg, el, o) => { (qids[pg] = qids[pg] || []).push(o.id); Lab.mcq($(el), o); };
  const numq = (pg, el, o) => { (qids[pg] = qids[pg] || []).push(o.id); Lab.numq($(el), o); };
  [['stName', 'name'], ['stNo', 'no'], ['stGroup', 'group'], ['stDate', 'date'], ['stComment', 'comment']].forEach(([id, k]) => {
    const e = $('#' + id); e.value = S.st[k] || (k === 'date' ? new Date().toLocaleDateString('en-GB') : '');
    e.addEventListener('input', () => { S.st[k] = e.value; save(); });
  });
  // ölçüm tablosu yardımcısı
  function table(id, rowsKey, cols, csvName, csvHead, csvRow) {
    const tb = $('#' + id + ' tbody');
    const draw = () => { tb.innerHTML = S[rowsKey].map((r, i) => `<tr><td>${i + 1}</td>${cols(r).map((c) => `<td>${c}</td>`).join('')}</tr>`).join(''); tb.parentElement.parentElement.scrollTop = 1e6; };
    return { draw, csv: () => Lab.downloadCSV(csvName, ['#', ...csvHead], S[rowsKey].map((r, i) => [i + 1, ...csvRow(r)])) };
  }
  const def = (k, v) => { if (S[k] == null) S[k] = v; };
  const PH = ['#e0a800', '#1597c9', '#d6336c'];
  const w50 = 2 * Math.PI * 50;
  const zs = (R, X) => num(R, 2).replace(/\.?0+$/, '') + (X >= 0 ? ' + j' : ' − j') + num(Math.abs(X), 2).replace(/\.?0+$/, '');
  // iki-wattmetre (W1: a hattı akımı, V_ab; W2: c hattı akımı, V_cb) — ideal kaynak uçlarında
  const twoW = (V, I) => [cmul(csub(V[0], V[1]), conj(I[0])).re, cmul(csub(V[2], V[1]), conj(I[2])).re];

  /* ---------- analog wattmetre ---------- */
  function wattMeter(parent, title) {
    const d = document.createElement('div'); d.style.cssText = 'background:#f4f1e6;border-radius:8px;padding:4px;box-shadow:inset 0 1px 4px rgba(0,0,0,.4)';
    parent.insertBefore(d, parent.querySelector('.ctrls'));
    const s = E('svg', { viewBox: '0 0 220 130', width: 220, height: 130 }, d);
    const cx0 = 110, cy0 = 118, R = 92, A0 = -50, A1 = 50, ang = (p) => (A0 + (A1 - A0) * p) * D2R;
    E('path', { d: `M${cx0 + R * Math.sin(ang(0))},${cy0 - R * Math.cos(ang(0))} A${R},${R} 0 0 1 ${cx0 + R * Math.sin(ang(1))},${cy0 - R * Math.cos(ang(1))}`, fill: 'none', stroke: '#333', 'stroke-width': 1.5 }, s);
    const lab = [];
    for (let i = 0; i <= 50; i++) { const a = ang(i / 50), l = i % 10 ? (i % 5 ? 5 : 8) : 12; E('line', { x1: cx0 + R * Math.sin(a), y1: cy0 - R * Math.cos(a), x2: cx0 + (R - l) * Math.sin(a), y2: cy0 - (R - l) * Math.cos(a), stroke: '#333' }, s); if (i % 10 === 0) { const t = E('text', { x: cx0 + (R - 22) * Math.sin(a), y: cy0 - (R - 22) * Math.cos(a) + 4, 'text-anchor': 'middle', 'font-size': 10 }, s); lab.push(t); } }
    E('text', { x: cx0, y: 70, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700 }, s).textContent = title;
    const tF = E('text', { x: cx0, y: 84, 'text-anchor': 'middle', 'font-size': 10, fill: '#555' }, s);
    const nd = E('line', { x1: cx0, y1: cy0, x2: cx0, y2: cy0 - R + 4, stroke: '#c00', 'stroke-width': 2.2 }, s);
    E('circle', { cx: cx0, cy: cy0, r: 5, fill: '#333' }, s);
    const tW = E('text', { x: 8, y: 14, 'font-size': 11, fill: '#c62828', 'font-weight': 700 }, s);
    const rd = document.createElement('div'); rd.style.cssText = 'font:12px Consolas,monospace;text-align:center;color:#222'; d.appendChild(rd);
    // döner: okunan değer (ibre ölçekteyse) ya da null
    return (W, full) => {
      lab.forEach((t, i) => { t.textContent = num((full * i) / 5, 0); });
      tF.textContent = 'full scale ' + num(full, 0) + ' W';
      let p = W / full, pinned = false;
      if (p < -0.02) { p = -0.06; pinned = true; } else if (p > 1.05) { p = 1.06; pinned = true; }
      const a = ang(p); nd.setAttribute('x2', cx0 + (R - 4) * Math.sin(a)); nd.setAttribute('y2', cy0 - (R - 4) * Math.cos(a));
      tW.textContent = W / full < -0.02 ? '◄ REVERSE DEFLECTION' : W / full > 1.05 ? 'OFF SCALE ►' : '';
      const rdv = pinned ? null : Math.round(clamp(W / full, 0, 1) * 1000) / 1000 * full; // ‰1 okuma çözünürlüğü (ayna skala)
      rd.textContent = pinned ? 'unreadable' : 'pointer ≈ ' + num(rdv, 0) + ' W';
      return rdv;
    };
  }

  /* ================= ÖN BİLGİ · W1, W2 – θ ================= */
  const obc = $('#obAnim'), obg = obc.getContext('2d');
  function obTick() {
    const th = +$('#obTh').value, g = obg, W = obc.width, H = obc.height, L = 60, R = W - 20, T = 20, B = H - 40;
    $('#obThV').textContent = (th > 0 ? '+' : '') + th + '°  (pf = ' + num(Math.cos(th * D2R), 3) + (th > 0 ? ' lag' : th < 0 ? ' lead' : '') + ')';
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    const X = (t) => L + ((t + 90) / 180) * (R - L), Y = (v) => T + (1 - (v + 1) / 2) * (B - T);
    g.strokeStyle = '#e4e8ef'; g.font = '11px Segoe UI'; g.fillStyle = '#556'; g.textAlign = 'center';
    for (let t = -90; t <= 90; t += 30) { g.beginPath(); g.moveTo(X(t), T); g.lineTo(X(t), B); g.stroke(); g.fillText(t + '°', X(t), B + 14); }
    g.textAlign = 'right'; [-1, -0.5, 0, 0.5, 1].forEach((v) => { g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(R, Y(v)); g.stroke(); g.fillText(num(v, 1), L - 5, Y(v) + 4); });
    g.strokeStyle = '#99a'; g.beginPath(); g.moveTo(L, Y(0)); g.lineTo(R, Y(0)); g.stroke();
    g.fillStyle = 'rgba(198,40,40,.08)'; g.fillRect(X(60), T, X(90) - X(60), B - T); g.fillRect(X(-90), T, X(-60) - X(-90), B - T);
    const cur = (f, c) => { g.strokeStyle = c; g.lineWidth = 2.5; g.beginPath(); for (let t = -90; t <= 90; t++) { const y = Y(f(t)); t === -90 ? g.moveTo(X(t), y) : g.lineTo(X(t), y); } g.stroke(); };
    cur((t) => Math.cos((t + 30) * D2R), '#0b5cad'); cur((t) => Math.cos((t - 30) * D2R), '#e07a10'); cur((t) => Math.cos((t + 30) * D2R) + Math.cos((t - 30) * D2R), '#999');
    g.strokeStyle = '#222'; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(X(th), T); g.lineTo(X(th), B); g.stroke(); g.setLineDash([]);
    [[Math.cos((th + 30) * D2R), '#0b5cad'], [Math.cos((th - 30) * D2R), '#e07a10']].forEach(([v, c]) => { g.fillStyle = c; g.beginPath(); g.arc(X(th), Y(v), 5, 0, 7); g.fill(); });
    g.textAlign = 'left'; g.font = '12px Segoe UI';
    g.fillStyle = '#0b5cad'; g.fillText('W₁/(V_L I_L) = cos(θ+30°)', L + 6, T + 14); g.fillStyle = '#e07a10'; g.fillText('W₂/(V_L I_L) = cos(θ−30°)', L + 6, T + 30); g.fillStyle = '#777'; g.fillText('(W₁+W₂)/(V_L I_L) = √3 cos θ', L + 6, T + 46);
    g.fillStyle = '#c62828'; g.fillText('|θ| > 60° (pf < 0.5): one wattmeter negative', X(18), B - 8);
    g.fillStyle = '#222'; g.font = 'bold 13px Segoe UI'; g.fillText('W₁ = ' + num(Math.cos((th + 30) * D2R), 3) + '   W₂ = ' + num(Math.cos((th - 30) * D2R), 3) + '  (× V_L I_L)', R - 330, H - 6);
  }

  /* ================= ÖN HAZIRLIK ================= */
  numq('onhaz', '#preQ', { id: 'p1', q: '1) For a single-phase load V = 230 V, I = 5 A and the wattmeter shows 920 W. What is the power factor?', answer: 0.8, tol: 1, unit: '', explain: 'pf = P/(VI) = 920/1150 = 0.80.', hint: 'pf = W / (V·I)' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) Example 3.28: abc, V<sub>L</sub> = 400 V, W<sub>1</sub> = 2000 W, W<sub>2</sub> = 4000 W. What is the total reactive power in VAR?', answer: Math.sqrt(3) * 2000, tol: 1, unit: 'VAR', explain: 'Q = √3(W<sub>2</sub> − W<sub>1</sub>) = 3464 VAR; P = 6000 W, θ = 30°.', hint: 'Q = √3(W<sub>2</sub> − W<sub>1</sub>)' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) In the same example, what is the power factor?', answer: Math.cos(30 * D2R), tol: 1, unit: '', explain: 'tan θ = √3·2000/6000 = 0.577 ⇒ θ = 30°, pf = 0.866 lagging.', hint: 'tan θ = √3(W<sub>2</sub> − W<sub>1</sub>)/(W<sub>1</sub> + W<sub>2</sub>)' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) Example 3.29: W<sub>1</sub> = −1000 W (pointer deflected backwards), W<sub>2</sub> = 5000 W. What is the total active power in W?', answer: 4000, tol: 1, unit: 'W', explain: 'The negative reading is added with its sign: P = −1000 + 5000 = 4000 W.', hint: 'Do not forget the sign.' });
  mcq('onhaz', '#preQ', { id: 'p5', q: '5) With how many wattmeters can we measure the total power of an unbalanced 4-wire (with neutral) system?', opts: ['1', '2', '3', '4'], correct: 2, explain: 'Blondel’s theorem: an n-conductor system needs n − 1 wattmeters. 2 for a 3-wire system, 3 for a 4-wire system.', hint: 'n − 1' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) How are the current coil and the voltage coil of a wattmeter connected?', opts: ['Both in series', 'Current coil in series with the load, voltage coil in parallel with the load', 'Current coil in parallel, voltage coil in series', 'Both in parallel'], correct: 1, explain: 'The current coil has low resistance (like an ammeter), the voltage coil has high resistance (like a voltmeter).', hint: 'How are an ammeter and a voltmeter connected?' });

  /* ================= DENEY 1 · Tek wattmetre ================= */
  const D1 = (() => {
    const st = { dirty: true };
    def('d1R', 40); def('d1X', 30); def('d1Ir', 5); def('d1par', false); def('d1rev', false); def('d1fuse', true);
    const V0 = 230, box = $('#d1inst');
    const gen = inst(box, 'SINGLE PHASE · 230 V · 50 Hz · isolation transformer'); const sL = lcd(gen.el, 'Fuse 16 A', '', 120);
    const bF = segBtn(gen.c, 'Replace fuse', false); bF.onclick = () => { S.d1fuse = true; save(); st.dirty = true; };
    const ld = inst(box, 'LOAD BOX', false);
    new Lab.Knob(ld.c, { label: 'R', min: 2, max: 200, step: 1, value: S.d1R, size: 46, fmt: (v) => v + ' Ω', onChange: (v) => { S.d1R = v; save(); st.dirty = true; } });
    new Lab.Knob(ld.c, { label: 'X', min: -100, max: 100, step: 1, value: S.d1X, size: 46, fmt: (v) => v + ' Ω', onChange: (v) => { S.d1X = v; save(); st.dirty = true; } });
    const wm = inst(box, 'ANALOG WATTMETER · 300 V', false);
    const meter = wattMeter(wm.el, 'W');
    new Lab.Knob(wm.c, { label: 'Current range', list: [1, 5, 10], value: S.d1Ir, size: 40, fmt: (v) => v + ' A', onChange: (v) => { S.d1Ir = v; save(); st.dirty = true; } });
    const wc = document.createElement('div'); wc.style.cssText = 'display:flex;flex-direction:column;gap:4px;font-size:11px'; wm.c.appendChild(wc);
    wc.insertAdjacentHTML('beforeend', '<b>Current coil</b>');
    toggle2(wc, 'in series with load', 'in parallel with load', S.d1par, (v) => { S.d1par = v; save(); st.dirty = true; });
    wc.insertAdjacentHTML('beforeend', '<b>Voltage coil ± terminal</b>');
    toggle2(wc, 'correct', 'reversed', S.d1rev, (v) => { S.d1rev = v; save(); st.dirty = true; });
    const ms = inst(box, 'DMMs (rms)'); const vL = lcd(ms.el, 'V', 'V', 90), iL = lcd(ms.el, 'I', 'A', 90), tL = lcd(ms.el, 'current coil load', '%', 90);
    const g = $('#d1sch'), dyn = E('g', {}, g);
    function drawSch() {
      dyn.innerHTML = '';
      sch.src(dyn, 60, 130, 20); sch.t(dyn, 60, 175, '230 V', 'lbl');
      sch.w(dyn, [[60, 110], [60, 50], [120, 50]]); sch.w(dyn, [[60, 150], [60, 210], [560, 210]]);
      E('rect', { x: 120, y: 42, width: 30, height: 16, fill: S.d1fuse ? '#fff' : '#fcc', stroke: '#222', 'stroke-width': 2 }, dyn); sch.t(dyn, 135, 36, 'fuse', 'lbl').style.fontSize = '11px';
      E('rect', { x: 230, y: 70, width: 120, height: 100, fill: '#f4f7ff', stroke: '#0b5cad', 'stroke-width': 2, rx: 8 }, dyn); sch.t(dyn, 290, 92, 'Wattmeter', 'lbl');
      if (!S.d1par) {
        sch.w(dyn, [[150, 50], [250, 50], [250, 120]]); E('path', { d: 'M250,120 h20 q10,-12 20,0 q10,12 20,0 h20', class: 'w' }, dyn); sch.w(dyn, [[330, 120], [330, 50], [480, 50]]);
        sch.t(dyn, 290, 140, 'current coil (series)', 'lbl').style.fontSize = '11px';
      } else {
        sch.w(dyn, [[150, 50], [480, 50]]); sch.w(dyn, [[250, 50], [250, 120]]); E('path', { d: 'M250,120 h20 q10,-12 20,0 q10,12 20,0 h20', class: 'w' }, dyn); sch.w(dyn, [[330, 120], [330, 190], [330, 210]]);
        const t = sch.t(dyn, 290, 140, 'current coil in PARALLEL!', 'lbl'); t.style.fontSize = '11px'; t.style.fill = '#c62828';
      }
      sch.dot(dyn, 380, 50); sch.w(dyn, [[380, 50], [380, 150]]); sch.zV(dyn, 380, 150, 200); sch.w(dyn, [[380, 200], [380, 210]]); sch.dot(dyn, 380, 210);
      sch.t(dyn, 398, 178, 'voltage coil', 'lbl', 'start').style.fontSize = '11px';
      sch.t(dyn, 372, S.d1rev ? 205 : 66, '±', 'val', 'end');
      sch.w(dyn, [[480, 50], [560, 50], [560, 90]]); sch.zV(dyn, 560, 90, 180, 'Z = ' + zs(S.d1R, S.d1X) + ' Ω'); sch.w(dyn, [[560, 180], [560, 210]]);
      sch.t(dyn, 250, 40, '±', 'val');
    }
    const solve = () => {
      const Z = cx(S.d1R, S.d1X);
      if (S.d1par || !S.d1fuse) return { V: 0, I: 0, P: 0, Q: 0, W: 0 };
      const I = cdiv(cx(V0), Z), Sx = cmul(cx(V0), conj(I));
      return { V: V0, I: cabs(I), P: Sx.re, Q: Sx.im, W: (S.d1rev ? -1 : 1) * Sx.re };
    };
    let rd = null, curR = null;
    function update() {
      if (!st.dirty) return; st.dirty = false;
      if (S.d1par && S.d1fuse) { S.d1fuse = false; save(); flag('d1blow'); Lab.toast('💥 Current coil in parallel with the source = SHORT CIRCUIT! The fuse blew and the current coil burned out (in reality). Correct the connection and replace the fuse.', 5000); }
      drawSch(); curR = solve();
      sL(S.d1fuse ? 'intact' : 'BLOWN');
      vL(num(curR.V, 1)); iL(num(curR.I, 3)); const load = (100 * curR.I) / S.d1Ir; tL(num(load, 0));
      rd = meter(curR.W, 300 * S.d1Ir);
      if (curR.I > 1.2 * S.d1Ir) { Lab.toast('⚠ Current coil overloaded (' + num(load, 0) + ' %) — the coil is heating up even though the pointer is on scale!', 3000); if (Math.abs(curR.W) < 0.6 * 300 * S.d1Ir) flag('overI'); }
    }
    const T = table('d1tab', 'd1rows', (r) => [zs(r.R, r.X), r.Ir + ' A', r.rev ? 'reversed' : 'correct', r.rd == null ? 'unreadable' : num(r.rd, 0), num(r.V, 1), num(r.I, 3), num(r.VI, 1)],
      'hafta14_deney1.csv', ['R', 'X', 'current range (A)', 'polarity', 'W reading (W)', 'V (V)', 'I (A)', 'V*I (VA)'], (r) => [r.R, r.X, r.Ir, r.rev ? 'reversed' : 'correct', r.rd == null ? '' : r.rd, +r.V.toFixed(2), +r.I.toFixed(4), +r.VI.toFixed(2)]);
    function rec() {
      if (!S.d1fuse) return Lab.toast('The fuse is blown: first correct the connection and replace the fuse.');
      S.d1rows.push({ R: S.d1R, X: S.d1X, Ir: S.d1Ir, rev: S.d1rev, rd, V: curR.V, I: curR.I, VI: curR.V * curR.I, over: curR.I > 1.2 * S.d1Ir }); save(); T.draw();
      Lab.toast(rd == null ? 'Recorded: pointer unreadable (reverse deflection or off scale).' : 'Recorded: ' + num(rd, 0) + ' W');
    }
    $('#d1rec').onclick = rec; $('#d1del').onclick = () => { S.d1rows.pop(); save(); T.draw(); }; $('#d1csv').onclick = T.csv; T.draw();
    st.update = update; st.rec = rec;
    return st;
  })();
  XP.d1 = D1;
  steps('d1', [
    { t: 'Load <b>40 + j30 Ω</b>, current range <b>5 A</b>, correct connection. Record the wattmeter, V and I readings (R).', test: () => S.d1rows.some((r) => r.R === 40 && r.X === 30 && r.Ir === 5 && !r.rev && r.rd != null) },
    { t: 'Connect the ± terminal of the voltage coil <b>reversed</b>: what did the pointer do? Record this case too.', test: () => S.d1rows.some((r) => r.rev && r.rd == null) },
    { t: 'Deliberately connect the <b>current coil in parallel with the load</b> (a common mistake) and see the result; then correct it and replace the fuse.', test: () => !!S.fl.d1blow && S.d1fuse && !S.d1par },
    { t: 'Choose a low power factor load (e.g. small R, large |X|) and keep the current range low: <b>the current coil can be overloaded while the pointer is at mid-scale</b>. Create this situation and record it.', test: () => !!S.fl.overI && S.d1rows.some((r) => r.over) },
    { t: 'Record for at least <b>4 different loads</b> on the correct range; compare W with V·I.', test: () => new Set(S.d1rows.filter((r) => r.rd != null && !r.rev && !r.over).map((r) => r.R + '/' + r.X)).size >= 4 },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: 'With the 40 + j30 Ω load, how many W did the wattmeter show?', answer: 230 * 230 / 50 * 0.8, tol: 1, unit: 'W', explain: 'I = 230/50 = 4.6 A; P = I²R = 4.6²·40 = 846.4 W.', hint: 'Pointer reading.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'From this measurement, what is the power factor (W / V·I)?', answer: 0.8, tol: 1, unit: '', explain: '846.4/(230·4.6) = 0.80 = cos 36.87°.', hint: 'pf = W/(V I)' });
  numq('d1', '#d1Q', { id: 'd1q3', q: 'What is the reactive power of the same load in VAR?', answer: 4.6 * 4.6 * 30, tol: 1.5, unit: 'VAR', explain: 'Q = √((VI)² − P²) = I²X = 634.8 VAR.', hint: 'Power triangle.' });
  mcq('d1', '#d1Q', { id: 'd1q4', q: 'What is the correct action when the pointer deflects backwards (to the left)?', opts: ['Connect the current coil in parallel', 'Switch off, swap the terminals of the voltage (or current) coil and record the reading as negative', 'Increase the current range', 'Ignore the measurement'], correct: 1, explain: 'Reverse deflection means that power flows opposite to the coil directions (or the connection is reversed). In the two-wattmeter method this reading is added with a minus sign.', hint: 'Look at your reversed-connection record.' });
  mcq('d1', '#d1Q', { id: 'd1q5', q: 'With the low-pf load, why was there a danger although the pointer was at mid-scale?', opts: ['The voltage coil may burn', 'The wattmeter shows P, while the current coil carries I regardless of P and may have exceeded its range', 'The pointer is miscalibrated', 'There is no danger'], correct: 1, explain: 'The current and voltage ranges of a wattmeter must be monitored separately: putting an ammeter and a voltmeter in the circuit is good practice.', hint: 'The I / range ratio.' });

  /* ================= DENEY 2 · İki-wattmetre yöntemi (dengeli) ================= */
  const D2 = (() => {
    const st = { dirty: true };
    def('d2Vp', 120); def('d2R', 8); def('d2X', 6); def('d2D', false); def('d2seq', 'abc'); def('d2r1', false); def('d2r2', false); def('d2Ir', 20);
    const box = $('#d2inst');
    const gen = inst(box, 'THREE-PHASE SOURCE · 3-wire');
    new Lab.Knob(gen.c, { label: 'V_φ', min: 0, max: 240, step: 1, value: S.d2Vp, dark: true, size: 46, fmt: (v) => num(v, 0) + ' V', onChange: (v) => { S.d2Vp = v; save(); st.dirty = true; } });
    toggle2(gen.c, 'abc', 'acb', S.d2seq === 'acb', (v) => { S.d2seq = v ? 'acb' : 'abc'; save(); st.dirty = true; });
    const ld = inst(box, 'BALANCED LOAD · phase impedance', false);
    new Lab.Knob(ld.c, { label: 'R', min: 0, max: 100, step: 0.01, value: S.d2R, size: 46, fmt: (v) => num(v, 2) + ' Ω', onChange: (v) => { S.d2R = v; save(); st.dirty = true; } });
    new Lab.Knob(ld.c, { label: 'X', min: -100, max: 100, step: 0.01, value: S.d2X, size: 46, fmt: (v) => num(v, 2) + ' Ω', onChange: (v) => { S.d2X = v; save(); st.dirty = true; } });
    toggle2(ld.c, 'Y', 'Δ', S.d2D, (v) => { S.d2D = v; save(); st.dirty = true; });
    const wm = inst(box, 'TWO ANALOG WATTMETERS · 600 V', false);
    const m1 = wattMeter(wm.el, 'W₁ (line a, V_ab)'), m2 = wattMeter(wm.el, 'W₂ (line c, V_cb)');
    new Lab.Knob(wm.c, { label: 'Current range', list: [5, 10, 15, 20, 50], value: S.d2Ir, size: 38, fmt: (v) => v + ' A', onChange: (v) => { S.d2Ir = v; save(); st.dirty = true; } });
    const pc = document.createElement('div'); pc.style.cssText = 'display:flex;flex-direction:column;gap:3px;font-size:11px'; wm.c.appendChild(pc);
    pc.insertAdjacentHTML('beforeend', '<b>W₁ voltage coil</b>'); toggle2(pc, 'normal', 'reversed', S.d2r1, (v) => { S.d2r1 = v; save(); st.dirty = true; });
    pc.insertAdjacentHTML('beforeend', '<b>W₂ voltage coil</b>'); toggle2(pc, 'normal', 'reversed', S.d2r2, (v) => { S.d2r2 = v; save(); st.dirty = true; });
    const ms = inst(box, 'V–A METERS'); const vL = lcd(ms.el, 'V<sub>L</sub>', 'V', 90), iL = lcd(ms.el, 'I<sub>L</sub>', 'A', 90);
    const plot = new Lab.Plot($('#d2plot'), { xlabel: 'θ  (°)  (angle of the phase impedance)', ylabel: 'W / (V_L I_L)' });
    const solve = () => {
      const V = src3(S.d2Vp, S.d2seq), Z = cx(S.d2R, S.d2X), Zy = S.d2D ? csc(Z, 1 / 3) : Z;
      const I = V.map((v) => (cabs(Zy) ? cdiv(v, Zy) : cx(0)));
      const [W1, W2] = twoW(V, I);
      return { W1, W2, VL: S.d2Vp * Math.sqrt(3), IL: cabs(I[0]), th: cang(Z) };
    };
    let rd = [null, null], cur = null;
    function drawPlot() {
      const ser = [];
      if ($('#d2theo').checked) { const a = [], b = []; for (let t = -90; t <= 90; t += 2) { a.push([t, Math.cos((t + 30) * D2R)]); b.push([t, Math.cos((t - 30) * D2R)]); } ser.push({ pts: S.d2seq === 'abc' ? a : b, line: true, color: '#0b5cad', dash: [6, 4] }, { pts: S.d2seq === 'abc' ? b : a, line: true, color: '#e07a10', dash: [6, 4] }); }
      const rows = S.d2rows.filter((r) => r.seq === S.d2seq && r.ok && r.VL * r.IL > 0);
      ser.push({ pts: rows.map((r) => [r.th, r.W1 / (r.VL * r.IL)]), dots: true, color: '#0b5cad' }, { pts: rows.map((r) => [r.th, r.W2 / (r.VL * r.IL)]), dots: true, color: '#e07a10' });
      plot.draw(ser, [-90, 90], [-1, 1]);
    }
    $('#d2theo').onchange = () => { if ($('#d2theo').checked) flag('d2theo'); drawPlot(); };
    function update() {
      if (!st.dirty) return; st.dirty = false;
      cur = solve(); vL(num(cur.VL, 1)); iL(num(cur.IL, 2));
      const full = 600 * S.d2Ir;
      rd = [m1((S.d2r1 ? -1 : 1) * cur.W1, full), m2((S.d2r2 ? -1 : 1) * cur.W2, full)];
      if (cur.IL > 1.2 * S.d2Ir) Lab.toast('⚠ Wattmeter current coils overloaded: increase the current range.', 2500);
      drawPlot();
    }
    const T = table('d2tab', 'd2rows', (r) => [r.seq, r.D ? 'Δ' : 'Y', num(r.Vp, 0), zs(r.R, r.X), num(r.th, 2), r.ok ? num(r.W1, 0) : '—', r.ok ? num(r.W2, 0) : '—', num(r.VL, 1), num(r.IL, 2)],
      'hafta14_deney2.csv', ['seq', 'connection', 'Vphi', 'R', 'X', 'theta', 'W1 (W)', 'W2 (W)', 'VL', 'IL'], (r) => [r.seq, r.D ? 'D' : 'Y', r.Vp, r.R, r.X, +r.th.toFixed(3), r.ok ? r.W1 : '', r.ok ? r.W2 : '', +r.VL.toFixed(2), +r.IL.toFixed(3)]);
    function rec() {
      const ok = rd[0] != null && rd[1] != null;
      const W1 = ok ? (S.d2r1 ? -1 : 1) * rd[0] : null, W2 = ok ? (S.d2r2 ? -1 : 1) * rd[1] : null;
      S.d2rows.push({ seq: S.d2seq, D: S.d2D, Vp: S.d2Vp, R: S.d2R, X: S.d2X, th: cur.th, W1, W2, VL: cur.VL, IL: cur.IL, ok, neg: ok && (W1 < 0 || W2 < 0) }); save(); T.draw(); drawPlot();
      Lab.toast(ok ? 'Recorded: W₁ = ' + num(W1, 0) + ' W, W₂ = ' + num(W2, 0) + ' W (the reading of the reversed coil was entered with a minus sign)' : 'A pointer cannot be read: reverse the voltage coil of the reverse-deflecting wattmeter or increase the range.', 4000);
    }
    $('#d2rec').onclick = rec; $('#d2del').onclick = () => { S.d2rows.pop(); save(); T.draw(); drawPlot(); }; $('#d2csv').onclick = T.csv; T.draw();
    st.update = update; st.rec = rec;
    return st;
  })();
  XP.d2 = D2;
  steps('d2', [
    { t: '<b>Example 3.27(a)</b>: Y load, V<sub>φ</sub> = 120 V, abc, Z<sub>φ</sub> = <b>8 + j6 Ω</b>. Read both wattmeters and record.', test: () => S.d2rows.some((r) => r.ok && !r.D && r.Vp === 120 && r.R === 8 && r.X === 6 && r.seq === 'abc') },
    { t: '<b>Example 3.27(b)</b>: Z<sub>φ</sub> = 8 − j6 Ω (capacitive). Which wattmeter reading increased?', test: () => S.d2rows.some((r) => r.ok && r.Vp === 120 && r.R === 8 && r.X === -6) },
    { t: 'Choose a load with |θ| &gt; 60° (e.g. Example 3.27(d): 10∠−75° = 2.59 − j9.66 Ω). <b>Reverse the voltage coil</b> of the reverse-deflecting wattmeter and record the reading.', test: () => S.d2rows.some((r) => r.ok && r.neg && Math.abs(r.th) > 60) },
    { t: 'Record for at least <b>6 different θ</b> in the same sequence and turn on the <b>theoretical curves</b>.', test: () => new Set(S.d2rows.filter((r) => r.ok && r.seq === S.d2seq).map((r) => Math.round(r.th))).size >= 6 && !!S.fl.d2theo },
    { t: 'Set the sequence to <b>acb</b> and record for 8 + j6 Ω: what happened to the readings?', test: () => S.d2rows.some((r) => r.ok && r.seq === 'acb' && r.R === 8 && r.X === 6) },
  ]);
  const VLI = 120 * Math.sqrt(3) * 12;
  numq('d2', '#d2Q', { id: 'd2q1', q: 'Example 3.27(a): how many W did W<sub>1</sub> read?', answer: VLI * Math.cos((36.87 + 30) * D2R), tol: 1.5, unit: 'W', explain: 'V<sub>L</sub>I<sub>L</sub> = 207.85·12 = 2494 VA; W<sub>1</sub> = 2494·cos66.87° = 979.8 W.', hint: 'Pointer reading.' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'With the same load, how many W did W<sub>2</sub> read?', answer: VLI * Math.cos((36.87 - 30) * D2R), tol: 1.5, unit: 'W', explain: 'W<sub>2</sub> = 2494·cos6.87° = 2476 W; W<sub>1</sub> + W<sub>2</sub> = 3456 W = 3·12²·8 ✓', hint: 'Pointer reading.' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 'Example 3.29: W<sub>1</sub> = −1000 W, W<sub>2</sub> = 5000 W. What is the power factor?', answer: Math.cos(Math.atan(Math.sqrt(3) * 6000 / 4000)), tol: 1.5, unit: '', explain: 'tan θ = √3·6000/4000 = 2.598 ⇒ θ = 68.9°, pf = 0.359 lagging: a lightly loaded motor.', hint: 'tan θ = √3(W<sub>2</sub> − W<sub>1</sub>)/(W<sub>1</sub> + W<sub>2</sub>)' });
  mcq('d2', '#d2Q', { id: 'd2q4', q: 'According to your measurements, under what condition does a wattmeter read negative?', opts: ['pf &gt; 0.866', 'pf &lt; 0.5 (|θ| &gt; 60°)', 'Always when the load is capacitive', 'Never'], correct: 1, explain: 'cos(θ + 30°) &lt; 0 ⇔ θ &gt; 60°. The red region in the plot.', hint: 'The θ where the curves cross zero in the plot.' });
  mcq('d2', '#d2Q', { id: 'd2q5', q: 'What happened with the same load in the acb sequence?', opts: ['The two readings swapped; P is the same, the sign of Q in the formula reverses', 'Both readings became zero', 'The total power doubled', 'Nothing changed'], correct: 0, explain: 'Slides: “acb → the readings swap”. This is why you must know the phase sequence before using the tan θ formula.', hint: 'Compare your abc and acb rows.' });
  mcq('d2', '#d2Q', { id: 'd2q6', q: 'Is W<sub>1</sub> = V<sub>L</sub>I<sub>L</sub>cos(θ+30°) also valid for a Δ-connected load?', opts: ['No, only for Y', 'Yes; θ is the angle of the phase impedance and the line quantities do not change', 'Yes, but θ − 30° is written instead of θ', 'No, Δ needs three wattmeters'], correct: 1, explain: 'The wattmeters see only line voltage and line current; the equivalent Y of a Δ load has the same angle (θ<sub>Y</sub> = θ<sub>Δ</sub>).', hint: 'Try it with the Y/Δ switch.' });

  /* ================= DENEY 3 · Dengesiz yük; tek wattmetreyle Q ================= */
  const D3 = (() => {
    const st = { dirty: true };
    def('d3Vp', 120.09); def('d3Z', [[10, 0], [8, 6], [6, -8]]); def('d3i', 'a'); def('d3v', 'bc');
    const box = $('#d3inst');
    const gen = inst(box, 'THREE-PHASE SOURCE · abc · 3-wire');
    new Lab.Knob(gen.c, { label: 'V_L', list: [208, 400], value: Math.round(S.d3Vp * Math.sqrt(3)) >= 399 ? 400 : 208, dark: true, size: 44, fmt: (v) => v + ' V', onChange: (v) => { S.d3Vp = v / Math.sqrt(3); save(); st.dirty = true; } });
    const ld = inst(box, 'Y LOAD · per phase (neutral not connected)', false);
    ['A', 'B', 'C'].forEach((p, k) => {
      new Lab.Knob(ld.c, { label: 'R_' + p, min: 0, max: 50, step: 0.5, value: S.d3Z[k][0], size: 38, fmt: (v) => num(v, 1), onChange: (v) => { S.d3Z[k][0] = v; save(); st.dirty = true; } });
      new Lab.Knob(ld.c, { label: 'X_' + p, min: -50, max: 50, step: 0.5, value: S.d3Z[k][1], size: 38, fmt: (v) => num(v, 1), onChange: (v) => { S.d3Z[k][1] = v; save(); st.dirty = true; } });
    });
    const dw = inst(box, 'DIGITAL WATTMETERS (signed)');
    const wL = [lcd(dw.el, 'W<sub>1</sub>: I<sub>a</sub>, V<sub>ab</sub>', 'W', 110), lcd(dw.el, 'W<sub>2</sub>: I<sub>c</sub>, V<sub>cb</sub>', 'W', 110), lcd(dw.el, 'W<sub>3</sub> (free)', 'W', 110)];
    selBox(dw.c, 'W₃ current coil', [['a', 'line a'], ['b', 'line b'], ['c', 'line c']], S.d3i, (v) => { S.d3i = v; save(); st.dirty = true; });
    selBox(dw.c, 'W₃ voltage coil (± – )', ['ab', 'ba', 'bc', 'cb', 'ca', 'ac'].map((p) => [p, p[0] + ' – ' + p[1]]), S.d3v, (v) => { S.d3v = v; save(); st.dirty = true; });
    const am = inst(box, 'CLAMP AMMETERS', false); const aL = ['I<sub>aA</sub>', 'I<sub>bB</sub>', 'I<sub>cC</sub>'].map((l) => lcd(am.el, l, 'A', 85));
    const solve = (Vp = S.d3Vp, Zr = S.d3Z) => {
      const V = src3(Vp, 'abc'), Z = Zr.map(([r, x]) => cx(Math.max(r, 1e-6), x));
      const r = solveYY(V, [cx(0), cx(0), cx(0)], Z, null), [W1, W2] = twoW(V, r.I);
      const ix = 'abc'.indexOf(S.d3i), p = (q) => V['abc'.indexOf(q)];
      const W3 = cmul(csub(p(S.d3v[0]), p(S.d3v[1])), conj(r.I[ix])).re;
      const Pt = r.I.reduce((s, i, k) => s + cabs(i) ** 2 * Z[k].re, 0), Qt = r.I.reduce((s, i, k) => s + cabs(i) ** 2 * Z[k].im, 0);
      return { I: r.I, W1, W2, W3, Pt, Qt };
    };
    st.ref = (() => { const s = S.d3i, v = S.d3v; S.d3i = 'a'; S.d3v = 'bc'; const a = solve(208 / Math.sqrt(3), [[10, 0], [8, 6], [6, -8]]), b = solve(120, [[8, 6], [8, 6], [8, 6]]); S.d3i = s; S.d3v = v; return { a, b }; })();
    let cur = null;
    function update() {
      if (!st.dirty) return; st.dirty = false;
      cur = solve(); wL[0](num(cur.W1, 1)); wL[1](num(cur.W2, 1)); wL[2](num(cur.W3, 1)); cur.I.forEach((i, k) => aL[k](num(cabs(i), 3)));
      const it = cur.I.map((z, k) => ({ z, c: PH[k], l: 'I' + 'abc'[k] }));
      phasors($('#d3ph'), it);
    }
    const T = table('d3tab', 'd3rows', (r) => [num(r.VL, 0), r.Z.map(([a, b]) => zs(a, b)).join(' | '), num(r.W1, 1), num(r.W2, 1), num(r.W3, 1) + ' (' + r.i + ', ' + r.v + ')', r.I.map((x) => num(x, 3)).join(' / ')],
      'hafta14_deney3.csv', ['VL', 'ZA', 'ZB', 'ZC', 'W1', 'W2', 'W3', 'W3 current', 'W3 voltage', 'Ia', 'Ib', 'Ic'], (r) => [+r.VL.toFixed(1), zs(...r.Z[0]), zs(...r.Z[1]), zs(...r.Z[2]), +r.W1.toFixed(2), +r.W2.toFixed(2), +r.W3.toFixed(2), r.i, r.v, ...r.I.map((x) => +x.toFixed(4))]);
    function rec() {
      S.d3rows.push({ VL: S.d3Vp * Math.sqrt(3), Z: S.d3Z.map((z) => z.slice()), W1: cur.W1, W2: cur.W2, W3: cur.W3, i: S.d3i, v: S.d3v, I: cur.I.map(cabs) }); save(); T.draw();
      Lab.toast('Recorded: W₁ + W₂ = ' + num(cur.W1 + cur.W2, 1) + ' W');
    }
    $('#d3rec').onclick = rec; $('#d3del').onclick = () => { S.d3rows.pop(); save(); T.draw(); }; $('#d3csv').onclick = T.csv; T.draw();
    st.update = update; st.rec = rec;
    return st;
  })();
  XP.d3 = D3;
  const zEq = (r, z) => r.Z.every((p, k) => p[0] === z[k][0] && p[1] === z[k][1]);
  const bal86 = [[8, 6], [8, 6], [8, 6]], ex330 = [[10, 0], [8, 6], [6, -8]];
  steps('d3', [
    { t: '<b>Example 3.30</b>: V<sub>L</sub> = 208 V, Z<sub>A</sub> = 10, Z<sub>B</sub> = 8 + j6, Z<sub>C</sub> = 6 − j8 Ω. Record W<sub>1</sub>, W<sub>2</sub> and the line currents.', test: () => S.d3rows.some((r) => near(r.VL, 208, 0.5) && zEq(r, ex330)) },
    { t: 'With the same load, connect W<sub>3</sub> once as <b>current line b, voltage b–a</b> and once as <b>current line b, voltage b–c</b>, and take two records (moving the reference to a or c).', test: () => S.d3rows.some((r) => zEq(r, ex330) && r.i === 'b' && r.v === 'ba') && S.d3rows.some((r) => zEq(r, ex330) && r.i === 'b' && r.v === 'bc') },
    { t: '<b>Example 3.31</b>: balanced load <b>8 + j6 Ω</b> (V<sub>φ</sub> = 120 V ⇒ V<sub>L</sub> = 208 V), W<sub>3</sub>: current line <b>a</b>, voltage <b>b–c</b>. Record: Q = √3·W<sub>3</sub>.', test: () => S.d3rows.some((r) => zEq(r, bal86) && r.i === 'a' && r.v === 'bc') },
    { t: 'Record for an <b>unbalanced</b> load of your own choice and check W<sub>1</sub> + W<sub>2</sub> against ΣI²R.', test: () => S.d3rows.some((r) => !zEq(r, ex330) && !(r.Z[0][0] === r.Z[1][0] && r.Z[1][0] === r.Z[2][0] && r.Z[0][1] === r.Z[1][1] && r.Z[1][1] === r.Z[2][1])) },
  ]);
  numq('d3', '#d3Q', { id: 'd3q1', q: 'Example 3.30: how many W did W<sub>1</sub> read?', answer: () => D3.ref.a.W1, tol: 1, unit: 'W', explain: 'For an unbalanced load W<sub>1</sub> = Re{V<sub>AB</sub> I<sub>aA</sub>*}: first V<sub>N</sub>, then the line currents are found; the cos(θ ± 30°) formula is not used.', hint: 'Digital W<sub>1</sub>.' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'Example 3.30: what is the total active power W<sub>1</sub> + W<sub>2</sub> in W?', answer: () => D3.ref.a.Pt, tol: 1, unit: 'W', explain: 'Check: it must equal ΣI²R = |I<sub>a</sub>|²·10 + |I<sub>b</sub>|²·8 + |I<sub>c</sub>|²·6.', hint: 'Add the two readings with their signs.' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'Example 3.31: how many W did W<sub>3</sub> (current a, voltage b–c) read?', answer: () => D3.ref.b.W3, tol: 1, unit: 'W', explain: 'W = V<sub>L</sub>I<sub>L</sub>cos(90° − θ) = V<sub>L</sub>I<sub>L</sub> sin θ = 207.85·12·0.6 ≈ 1496.5 W.', hint: 'Digital W<sub>3</sub>.' });
  numq('d3', '#d3Q', { id: 'd3q4', q: 'From this reading, what is the total reactive power Q in VAR?', answer: () => D3.ref.b.Qt, tol: 1, unit: 'VAR', explain: 'Q = √3·W = 2592 VAR = 3·12²·6 ✓ (valid only for a balanced load).', hint: 'Q = √3 W' });
  mcq('d3', '#d3Q', { id: 'd3q5', q: 'Which statement is true for the two-wattmeter method with an unbalanced 3-wire load?', opts: ['W<sub>1</sub> + W<sub>2</sub> still gives the total P, but tan θ = √3(W<sub>2</sub>−W<sub>1</sub>)/(W<sub>1</sub>+W<sub>2</sub>) loses its meaning', 'Nothing can be measured', 'Three wattmeters are required', 'Only Q is measured'], correct: 0, explain: 'Blondel’s theorem holds for P in every 3-wire system; θ, however, is not a single number for an unbalanced load.', hint: 'Your comparison of W<sub>1</sub> + W<sub>2</sub> with ΣI²R.' });
  mcq('d3', '#d3Q', { id: 'd3q6', q: 'When line a or c is chosen as the reference instead of b (your W<sub>3</sub> trial), how is the total power measured?', opts: ['Whichever line is common, the sum of the wattmeters on the other two lines gives P', 'Only b can be the reference', 'The three readings are added', 'It cannot be measured'], correct: 0, explain: 'The non-± terminal of every wattmeter’s voltage coil must be on the same (common) line; it does not matter which line is chosen.', hint: 'n − 1 wattmeters, common return line.' });

  /* ================= DENEY 4 · Kara kutu ve dönem tekrarı ================= */
  const D4 = (() => {
    const st = { dirty: true };
    def('d4C', 0);
    const VL = 400, Vp = VL / Math.sqrt(3), bx = S.bx;
    const ZY = bx.D ? cx(bx.R / 3, bx.X / 3) : cx(bx.R, bx.X); // eşdeğer Y
    const box = $('#d4inst');
    const kk = inst(box, 'BLACK BOX · balanced three-phase load (internal connection hidden)');
    const cb = inst(box, 'Δ CAPACITOR BANK', false);
    new Lab.Knob(cb.c, { label: 'C_Δ', min: 0, max: 200, step: 0.5, value: S.d4C, size: 56, fmt: (v) => num(v, 1) + ' µF', onChange: (v) => { S.d4C = v; save(); st.dirty = true; } });
    const ms = inst(box, 'INSTRUMENTS (source side)');
    const mL = [lcd(ms.el, 'V<sub>L</sub>', 'V', 90), lcd(ms.el, 'I<sub>L</sub>', 'A', 90), lcd(ms.el, 'W<sub>1</sub> (a, V<sub>ab</sub>)', 'W', 100), lcd(ms.el, 'W<sub>2</sub> (c, V<sub>cb</sub>)', 'W', 100)];
    kk.el.insertAdjacentHTML('beforeend', '<div style="font-size:12px;max-width:230px;line-height:1.5">V<sub>L</sub> = 400 V, 50 Hz, abc. The box contains three identical impedances connected in Y or Δ. You can measure only at the terminals.</div>');
    const solve = (C = S.d4C) => {
      const V = src3(Vp, 'abc'), Yc = cx(0, w50 * 3 * C * 1e-6);
      const I = V.map((v) => cadd(cdiv(v, ZY), cmul(v, Yc))), [W1, W2] = twoW(V, I);
      return { IL: cabs(I[0]), W1, W2 };
    };
    const P0 = 3 * Vp * Vp * ZY.re / (ZY.re ** 2 + ZY.im ** 2), Q0 = 3 * Vp * Vp * ZY.im / (ZY.re ** 2 + ZY.im ** 2);
    st.ref = { P0, Q0, pf0: P0 / Math.hypot(P0, Q0), Z: cabs(ZY), th: cang(ZY), C95: (Q0 - P0 * Math.tan(Math.acos(0.95))) / (3 * w50 * VL * VL) * 1e6 };
    let cur = null;
    function update() { if (!st.dirty) return; st.dirty = false; cur = solve(); mL[0](num(VL, 1)); mL[1](num(cur.IL, 3)); mL[2](num(cur.W1, 1)); mL[3](num(cur.W2, 1)); }
    const T = table('d4tab', 'd4rows', (r) => [num(r.C, 1), num(r.IL, 3), num(r.W1, 1), num(r.W2, 1)], 'hafta14_deney4.csv', ['C_delta (uF)', 'IL (A)', 'W1 (W)', 'W2 (W)'], (r) => [r.C, +r.IL.toFixed(4), +r.W1.toFixed(2), +r.W2.toFixed(2)]);
    function rec() { S.d4rows.push(Object.assign({ C: S.d4C }, cur)); save(); T.draw(); Lab.toast('Recorded: W₁ = ' + num(cur.W1, 1) + ' W, W₂ = ' + num(cur.W2, 1) + ' W'); }
    $('#d4rec').onclick = rec; $('#d4del').onclick = () => { S.d4rows.pop(); save(); T.draw(); }; $('#d4csv').onclick = T.csv; T.draw();
    st.update = update; st.rec = rec;
    return st;
  })();
  XP.d4 = D4;
  const pfOf = (r) => { const P = r.W1 + r.W2, Q = Math.sqrt(3) * (r.W2 - r.W1); return P / Math.hypot(P, Q); };
  steps('d4', [
    { t: 'Measure the black box without capacitors (C<sub>Δ</sub> = 0) and record: V<sub>L</sub>, I<sub>L</sub>, W<sub>1</sub>, W<sub>2</sub>.', test: () => S.d4rows.some((r) => r.C === 0) },
    { t: 'From the readings calculate P, Q, pf and the equivalent Y phase impedance (questions 1–4).', test: () => ['d4q1', 'd4q2', 'd4q3', 'd4q4'].every((q) => S.answers[q] && S.answers[q].ok) },
    { t: 'Design and set the C<sub>Δ</sub> that raises the pf to <b>0.95 lagging</b> and record; verify the pf from the wattmeters.', test: () => S.d4rows.some((r) => r.C > 0 && pfOf(r) >= 0.94 && pfOf(r) <= 0.96 && r.W2 >= r.W1) },
    { t: 'Show from the table that after compensation W<sub>1</sub> + W<sub>2</sub> does not change and I<sub>L</sub> decreases (record at least 3 C values).', test: () => new Set(S.d4rows.map((r) => r.C)).size >= 3 },
  ]);
  numq('d4', '#d4Q', { id: 'd4q1', q: 'Black box: what is the total active power P in W?', answer: () => D4.ref.P0, tol: 1, unit: 'W', explain: 'P = W<sub>1</sub> + W<sub>2</sub>.', hint: 'Add the two readings.' });
  numq('d4', '#d4Q', { id: 'd4q2', q: 'What is the total reactive power Q in VAR?', answer: () => D4.ref.Q0, tol: 1.5, unit: 'VAR', explain: 'Q = √3(W<sub>2</sub> − W<sub>1</sub>) (abc).', hint: 'Q = √3(W<sub>2</sub> − W<sub>1</sub>)' });
  numq('d4', '#d4Q', { id: 'd4q3', q: 'What is the power factor?', answer: () => D4.ref.pf0, tol: 1, unit: '', explain: 'pf = P/√(P² + Q²) or cos(arctan(Q/P)).', hint: 'tan θ = Q/P' });
  numq('d4', '#d4Q', { id: 'd4q4', q: 'What is the magnitude |Z<sub>Y</sub>| of the equivalent Y phase impedance in Ω?', answer: () => D4.ref.Z, tol: 1.5, unit: 'Ω', explain: '|Z<sub>Y</sub>| = (V<sub>L</sub>/√3)/I<sub>L</sub>. If the box is Δ-connected the actual branch impedance is 3 times this; Y and Δ cannot be distinguished by terminal measurements!', hint: 'V<sub>φ</sub>/I<sub>L</sub>' });
  numq('d4', '#d4Q', { id: 'd4q5', q: 'What C<sub>Δ</sub> in µF did you design for pf = 0.95?', answer: () => D4.ref.C95, tol: 3, unit: 'µF', explain: 'C<sub>Δ</sub> = P(tan θ<sub>1</sub> − tan θ<sub>2</sub>)/(3ωV<sub>L</sub>²).', hint: 'Week 13 Experiment 4.' });
  // dönem sonu karma tekrar
  numq('d4', '#d4R', { id: 'r1', q: 'T1) Chapter 1: what is the rms value of the voltage v(t) = 170cos(377t − 40°) V in volts?', answer: 170 / Math.SQRT2, tol: 0.5, unit: 'V', explain: 'V<sub>rms</sub> = V<sub>m</sub>/√2 = 120.2 V.', hint: '√2' });
  numq('d4', '#d4R', { id: 'r2', q: 'T2) Chapter 1: R = 30 Ω and ωL = 40 Ω are in series; if 100 V (rms) is applied, what is the current in A?', answer: 2, tol: 1, unit: 'A', explain: '|Z| = √(30² + 40²) = 50 Ω ⇒ I = 2 A, lagging by 53.13°.', hint: '|Z| = √(R² + X²)' });
  numq('d4', '#d4R', { id: 'r3', q: 'T3) Chapter 1: ideal transformer N<sub>1</sub>:N<sub>2</sub> = 1:5, 500 Ω on the secondary. What is the impedance seen from the primary in Ω?', answer: 20, tol: 1, unit: 'Ω', explain: 'Z<sub>in</sub> = Z<sub>L</sub>(N<sub>1</sub>/N<sub>2</sub>)² = 500/25 = 20 Ω.', hint: '(N<sub>1</sub>/N<sub>2</sub>)²' });
  numq('d4', '#d4R', { id: 'r4', q: 'T4) Chapter 2: V = 100∠0° V, I = 5∠−60° A (rms). What is the average power in W?', answer: 250, tol: 1, unit: 'W', explain: 'P = VI cos 60° = 250 W; Q = 433 VAR.', hint: 'P = VI cos(θ<sub>v</sub> − θ<sub>i</sub>)' });
  numq('d4', '#d4R', { id: 'r5', q: 'T5) Chapter 2: Thévenin equivalent V<sub>Th</sub> = 100 V (rms), Z<sub>Th</sub> = 20 + j30 Ω. What is the maximum power that can be transferred to the load in W?', answer: 125, tol: 1, unit: 'W', explain: 'Z<sub>L</sub> = Z<sub>Th</sub>* = 20 − j30 Ω; P<sub>max</sub> = |V<sub>Th</sub>|²/(4R<sub>Th</sub>) = 10 000/80 = 125 W.', hint: 'Conjugate matching.' });
  numq('d4', '#d4R', { id: 'r6', q: 'T6) Chapter 3: what is the total active power in W of a balanced load with V<sub>L</sub> = 400 V, I<sub>L</sub> = 10 A, pf = 0.8?', answer: Math.sqrt(3) * 4000 * 0.8, tol: 1, unit: 'W', explain: 'P = √3·400·10·0.8 = 5543 W.', hint: '√3 V<sub>L</sub> I<sub>L</sub> cos θ' });
  mcq('d4', '#d4R', { id: 'r7', q: 'T7) Chapters 2–3: What does power factor correction not change?', opts: ['The line current', 'The active power drawn by the load', 'The reactive power drawn from the source', 'The line loss'], correct: 1, explain: 'A capacitor consumes no active power; the load does the same work, only the reactive current is supplied locally.', hint: 'The base of the power triangle.' });
  mcq('d4', '#d4R', { id: 'r8', q: 'T8) Chapter 3: If the neutral current is zero in a balanced Y–Y system, why is a neutral conductor still run?', opts: ['Aesthetics', 'Because of single-phase loads and imbalance; if the neutral breaks the star point shifts and overvoltage occurs', 'To double the power', 'To determine the phase sequence'], correct: 1, explain: 'Real distribution networks are never perfectly balanced (Week 12 Experiment 4).', hint: 'The broken-neutral experiment.' });

  const REP = { hafta: 14, konu: 'Power measurement: single wattmeter, two-wattmeter method, power in an unbalanced load and measuring Q with a single wattmeter; semester review (Section 3.6)',
    tables: [['Experiment 1 · Single wattmeter', '#d1tab'], ['Experiment 2 · Two-wattmeter (balanced)', '#d2tab'], ['Experiment 3 · Unbalanced load', '#d3tab'], ['Experiment 4 · Black box', '#d4tab']],
    canv: () => [$('#d2plot')], svgs: () => [$('#d1sch'), $('#d3ph')] };

  /* ================= RAPOR ================= */
  function buildReport() {
    const sec = { onhaz: 'Pre-lab', d1: 'Experiment 1', d2: 'Experiment 2', d3: 'Experiment 3', d4: 'Experiment 4' };
    let tot = 0, ok = 0;
    const qrows = Object.entries(qids).map(([pg, ids]) => ids.map((id) => {
      const a = S.answers[id]; tot++; if (a && a.ok) ok++;
      const q = $(`[data-qid="${id}"] .qt`); const qt = q ? q.innerHTML : id;
      return `<tr><td class="l">${sec[pg] || pg}</td><td class="l">${qt}</td><td class="l">${a ? a.a : '—'}</td><td>${a ? (a.ok ? '✔' : '✘') : '—'}</td></tr>`;
    }).join('')).join('');
    let sTot = 0, sOk = 0;
    Object.keys(stepDefs).forEach((k) => stepDefs[k].forEach((_, i) => { sTot++; if (S.steps[k + '_' + i]) sOk++; }));
    const img = (c) => { try { return c ? `<img src="${c.toDataURL()}" style="width:48%;border:1px solid #ccc">` : ''; } catch (e) { return ''; } };
    const svgImg = (s) => s ? `<div style="display:inline-block;width:32%;vertical-align:top;border:1px solid #ccc">${s.outerHTML}</div>` : '';
    const tb = (id) => `<table class="data"><thead>${$(id + ' thead').innerHTML}</thead><tbody>${$(id + ' tbody').innerHTML}</tbody></table>`;
    const html = `
      <h2 style="margin:0">Circuit Theory II · Virtual Laboratory · Week ${REP.hafta} Report</h2>
      <p><b>Topic:</b> ${REP.konu}</p>
      <table class="data" style="width:auto"><tr><th>Full name</th><td class="l">${S.st.name || ''}</td><th>No</th><td class="l">${S.st.no || ''}</td><th>Group</th><td class="l">${S.st.group || ''}</td><th>Date</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Summary</h3>
      <p>Lab-sheet steps completed: <b>${sOk}/${sTot}</b> · Correct answers: <b>${ok}/${tot}</b> · Score: <b>${Math.round((50 * sOk) / Math.max(1, sTot) + (50 * ok) / Math.max(1, tot))}/100</b></p>
      <h3>Answers</h3>
      <table class="data"><thead><tr><th>Section</th><th>Question</th><th>Answer</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      ${REP.tables.map(([t, id]) => `<h3>${t}</h3>${tb(id)}`).join('')}
      <h3>Plots and diagrams</h3>
      <div>${REP.canv().map(img).join(' ')}</div><div>${REP.svgs().map(svgImg).join(' ')}</div>
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
    if (e.altKey && /^[0-9]$/.test(e.key) && pages[+e.key]) { go(pages[+e.key]); e.preventDefault(); return; }
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.key === '?') $('#helpModal').classList.add('show');
    if ((e.key === 'r' || e.key === 'R') && XP[S.page] && XP[S.page].rec) XP[S.page].rec();
  });
  function loop(ts) {
    if (XP[S.page]) { XP[S.page].update(); evalSteps(S.page); }
    if (S.page === 'onbilgi' && typeof obTick === 'function') obTick(ts);
    requestAnimationFrame(loop);
  }
  Object.keys(stepDefs).forEach(evalSteps);
  go(pages.includes(S.page) ? S.page : 'giris'); progress(); requestAnimationFrame(loop);
})();

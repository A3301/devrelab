/* Devre Kuramı II · Hafta 13 — Y–Δ bağlantı ve üç fazlı güç (Bölüm 3.4–3.5) */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd2h13';
  const S = Object.assign({ answers: {}, steps: {}, st: {}, page: 'giris', fl: {}, d1rows: [], d2rows: [], d3rows: [], d4rows: [] }, Lab.store.load(KEY));
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
  const PH = ['#e0a800', '#1597c9', '#d6336c'], PHs = ['#f2d21b', '#27c4f0', '#ff6b8a'];
  const w50 = 2 * Math.PI * 50;
  const zs = (R, X) => num(R, 1) + (X >= 0 ? ' + j' : ' − j') + num(Math.abs(X), 1);

  /* ================= ÖN BİLGİ · anlık güçler ================= */
  const ob = { t: 0, last: null };
  const obc = $('#obAnim'), obg = obc.getContext('2d');
  function obTick(ts) {
    if (ob.last == null) ob.last = ts; ob.t += (ts - ob.last) / 1000 * 0.25; ob.last = ts;
    const th = +$('#obTh').value, tot = $('#obTot').checked, g = obg, W = obc.width, H = obc.height;
    $('#obThV').textContent = th + '°  (pf = ' + num(Math.cos(th * D2R), 3) + ')';
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    const L = 40, R = W - 10, y0 = H - 30, sc = (H - 60) / 3.2; // p birimi: V_m I_m /2 = 1
    g.strokeStyle = '#ccd'; g.beginPath(); g.moveTo(L, y0); g.lineTo(R, y0); g.moveTo(L, 10); g.lineTo(L, y0); g.stroke();
    g.fillStyle = '#555'; g.font = '12px Segoe UI'; g.fillText('0', 26, y0 + 4); g.fillText('ωt →', R - 40, y0 + 18);
    const f = (k, x) => { const a = x - k * 2 * Math.PI / 3; return Math.cos(a) * Math.cos(a - th * D2R) * 2; }; // p_k / (V_φ I_φ)
    const N = 400, span = 4 * Math.PI;
    [0, 1, 2].forEach((k) => { g.strokeStyle = PH[k]; g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= N; i++) { const x = (i / N) * span + ob.t * 6, y = y0 - f(k, x) * sc * 0.5 - sc * 0.5; i ? g.lineTo(L + (i / N) * (R - L), y) : g.moveTo(L, y); } g.stroke(); });
    if (tot) { g.strokeStyle = '#222'; g.lineWidth = 3; g.beginPath(); for (let i = 0; i <= N; i++) { const x = (i / N) * span + ob.t * 6, y = y0 - (f(0, x) + f(1, x) + f(2, x)) * sc * 0.5 - sc * 0.5; i ? g.lineTo(L + (i / N) * (R - L), y) : g.moveTo(L, y); } g.stroke(); g.fillStyle = '#222'; g.fillText('p_T = p_a + p_b + p_c = 3 V_φ I_φ cos θ  (constant!)', L + 10, 22); }
    g.fillStyle = '#333'; g.fillText('Each phase power pulsates at 2ω and ' + (th > 0 ? 'can briefly become negative' : 'never becomes negative') + '; the sum of the three is constant.', L + 10, H - 6);
  }

  /* ================= ÖN HAZIRLIK ================= */
  numq('onhaz', '#preQ', { id: 'p1', q: '1) Example 3.7: For a balanced Δ load with Z<sub>Δ</sub> = 27 + j36 Ω, what is the magnitude |Z<sub>Y</sub>| of the equivalent Y branch in Ω?', answer: 15, tol: 1, unit: 'Ω', explain: 'Z<sub>Y</sub> = Z<sub>Δ</sub>/3 = 9 + j12 = 15∠53.13° Ω.', hint: 'Z<sub>Y</sub> = Z<sub>Δ</sub>/3' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) Example 3.18: Three loads Z = 30 + j40 Ω are connected in <b>Y</b> to 400 V. What is the phase current in A?', answer: 400 / Math.sqrt(3) / 50, tol: 1, unit: 'A', explain: 'V<sub>φ</sub> = 400/√3 = 230.9 V, |Z| = 50 Ω ⇒ I<sub>φ</sub> = I<sub>L</sub> = 4.62 A.', hint: 'In Y, V<sub>φ</sub> = V<sub>L</sub>/√3.' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) Example 3.25: Y-connected motor, V<sub>L</sub> = 400 V, P<sub>T</sub> = 15 kW, pf = 0.85 lagging. What is the line current in A?', answer: 15000 / (Math.sqrt(3) * 400 * 0.85), tol: 1, unit: 'A', explain: 'I<sub>L</sub> = P<sub>T</sub>/(√3 V<sub>L</sub> cos θ) = 25.47 A.', hint: 'P<sub>T</sub> = √3 V<sub>L</sub> I<sub>L</sub> cos θ' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) Example 3.26: For a Δ load, V<sub>L</sub> = 380 V, I<sub>L</sub> = 20 A, P<sub>T</sub> = 10 kW were measured. What is the power factor?', answer: 10000 / (Math.sqrt(3) * 380 * 20), tol: 1, unit: '', explain: 'S<sub>T</sub> = √3·380·20 = 13.16 kVA ⇒ pf = 10/13.16 = 0.760.', hint: 'pf = P/S' });
  mcq('onhaz', '#preQ', { id: 'p5', q: '5) Example 3.23: If the same 2 MW is carried over the same line at 12 kV instead of 6 kV, how does the line loss change?', opts: ['It halves', 'It drops to one quarter', 'It does not change', 'It doubles'], correct: 1, explain: 'I<sub>L</sub> ∝ 1/V<sub>L</sub>, loss ∝ I<sub>L</sub>² ⇒ P<sub>6</sub>/P<sub>12</sub> = 4. This is why high voltage is used for power transmission.', hint: '3 I<sub>L</sub>² R<sub>ℓ</sub>' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) In a balanced Δ load (abc), what is the relation between the line current I<sub>aA</sub> and the phase current I<sub>AB</sub>?', opts: ['I<sub>aA</sub> = I<sub>AB</sub>', 'I<sub>aA</sub> = √3 I<sub>AB</sub>∠−30°', 'I<sub>aA</sub> = √3 I<sub>AB</sub>∠+30°', 'I<sub>aA</sub> = I<sub>AB</sub>/√3'], correct: 1, explain: 'I<sub>aA</sub> = I<sub>AB</sub> − I<sub>CA</sub> = √3 I<sub>AB</sub>∠−30° (∠+30° in acb).', hint: 'KCL at node A.' });

  /* ================= DENEY 1 · Δ yükte faz ve hat akımları ================= */
  const D1 = (() => {
    const st = { dirty: true };
    def('d1Vp', 120); def('d1seq', 'abc'); def('d1R', 24); def('d1X', 18); def('d1open', false);
    const box = $('#d1inst');
    const gen = inst(box, 'Y SOURCE · ideal · 50 Hz');
    new Lab.Knob(gen.c, { label: 'V_an', min: 0, max: 230, step: 1, value: S.d1Vp, dark: true, size: 50, fmt: (v) => num(v, 0) + ' V', onChange: (v) => { S.d1Vp = v; save(); st.dirty = true; } });
    toggle2(gen.c, 'abc', 'acb', S.d1seq === 'acb', (v) => { S.d1seq = v ? 'acb' : 'abc'; save(); st.dirty = true; });
    const ld = inst(box, 'Δ LOAD · each branch', false);
    new Lab.Knob(ld.c, { label: 'R', min: 1, max: 100, step: 0.5, value: S.d1R, size: 48, fmt: (v) => num(v, 1) + ' Ω', onChange: (v) => { S.d1R = v; save(); st.dirty = true; } });
    new Lab.Knob(ld.c, { label: 'X', min: -60, max: 60, step: 0.5, value: S.d1X, size: 48, fmt: (v) => num(v, 1) + ' Ω', onChange: (v) => { S.d1X = v; save(); st.dirty = true; } });
    toggle2(ld.c, 'CA branch connected', 'CA branch OPEN', S.d1open, (v) => { S.d1open = v; save(); st.dirty = true; });
    const am = inst(box, 'CLAMP AMMETERS · line');
    const aL = ['I<sub>aA</sub>', 'I<sub>bB</sub>', 'I<sub>cC</sub>'].map((l) => lcd(am.el, l, 'A', 95));
    const ak = inst(box, 'AMMETERS · Δ branches', false);
    const kL = ['I<sub>AB</sub>', 'I<sub>BC</sub>', 'I<sub>CA</sub>'].map((l) => lcd(ak.el, l, 'A', 95));
    const vm = inst(box, 'VOLTMETER', false); const vL = lcd(vm.el, 'V<sub>AB</sub> (load branch)', 'V', 110);
    const sc = mkOsc($('#d1scope'), { chs: [{ n: 'i_AB', c: PHs[0] }, { n: 'i_aA', c: '#7ee08a' }], groups: [{ l: 'A/d', v: 5, u: 'A', list: [0.5, 1, 2, 5, 10, 20] }], t: 2e-3, brand: 'DSO · current probes (1 V/A)' });
    // şema
    const g = $('#d1sch'), A = [430, 50], B = [360, 220], Cc = [560, 220];
    [['a', 50], ['b', 120], ['c', 190]].forEach(([p, y], k) => { sch.src(g, 60, y, 15); sch.w(g, [[45, y], [25, y], [25, 250]]); sch.t(g, 60, y - 20, 'v<tspan font-size="10">' + p + 'n</tspan>', 'lbl'); sch.w(g, [[75, y], [250, y]]); sch.meter(g, 160, y, 'A'); sch.term(g, 250, y); sch.t(g, 250, y - 10, p, 'lbl'); });
    sch.w(g, [[25, 250], [80, 250]]); sch.t(g, 95, 255, 'n', 'val');
    sch.w(g, [[250, 50], [A[0], 50]]); sch.w(g, [[250, 120], [300, 120], [300, B[1]], B]); sch.w(g, [[250, 190], [280, 190], [280, 260], [Cc[0], 260], Cc]);
    sch.zL(g, A[0], A[1], B[0], B[1]); sch.zL(g, B[0], B[1], Cc[0], Cc[1]); const caG = E('g', {}, g);
    [A, B, Cc].forEach((p, k) => { sch.dot(g, p[0], p[1]); sch.t(g, p[0] + (k === 2 ? 14 : k === 0 ? 12 : -14), p[1] + (k === 0 ? -6 : 18), 'ABC'[k], 'val'); });
    sch.t(g, 375, 130, 'Z<tspan font-size="10">AB</tspan>', 'lbl'); sch.t(g, 460, 245, 'Z<tspan font-size="10">BC</tspan>', 'lbl'); sch.t(g, 525, 130, 'Z<tspan font-size="10">CA</tspan>', 'lbl');
    const tZ = sch.t(g, 640, 40, '', 'lbl');
    let R = null;
    const solve = () => {
      const V = src3(S.d1Vp, S.d1seq), VL = lineV(V), Z = cx(S.d1R, S.d1X);
      const Ik = [cdiv(VL[0], Z), cdiv(VL[1], Z), S.d1open ? cx(0) : cdiv(VL[2], Z)];
      const I = [csub(Ik[0], Ik[2]), csub(Ik[1], Ik[0]), csub(Ik[2], Ik[1])];
      return { V, VL, Ik, I };
    };
    function update() {
      if (!st.dirty && !(st.sc && st.sc.dirty)) return; st.dirty = false; if (st.sc) st.sc.dirty = false;
      R = solve();
      R.I.forEach((i, k) => aL[k](num(cabs(i), 2))); R.Ik.forEach((i, k) => kL[k](num(cabs(i), 2))); vL(num(cabs(R.VL[0]), 1));
      caG.innerHTML = '';
      if (S.d1open) { sch.zL(caG, Cc[0], Cc[1], 520, 160); sch.w(caG, [[478, 115], [A[0], A[1]]]); sch.t(caG, 500, 150, '✂', 'val'); }
      else sch.zL(caG, Cc[0], Cc[1], A[0], A[1]);
      tZ.textContent = 'Z = ' + zs(S.d1R, S.d1X) + ' Ω';
      sc.draw({ f: [sig(R.Ik[0], w50), sig(R.I[0], w50)], w: w50, trig: cang(R.Ik[0]), rms: [cabs(R.Ik[0]), cabs(R.I[0])] });
      const it = R.Ik.map((z, k) => ({ z, c: PH[k], l: ['I_AB', 'I_BC', 'I_CA'][k] }));
      R.I.forEach((z, k) => it.push({ z, c: PH[k], dash: '6 4', w: 2, l: ['I_aA', 'I_bB', 'I_cC'][k] }));
      it.push({ z: csc(R.Ik[2], -1), o: R.Ik[0], c: '#999', dash: '2 3', w: 1.5 });
      phasors($('#d1ph'), it);
    }
    const T = table('d1tab', 'd1rows', (r) => [r.seq, num(r.Vp, 0), zs(r.R, r.X), r.open ? 'open' : 'conn.', num(r.Ia, 2), num(r.Ib, 2), num(r.Ic, 2), num(r.Iab, 2), num(r.Ibc, 2), num(r.Ica, 2), num(r.VAB, 1), r.dt == null ? '—' : num(r.dt * 1e3, 3)],
      'hafta13_deney1.csv', ['seq', 'Van', 'R', 'X', 'CA open', 'IaA', 'IbB', 'IcC', 'IAB', 'IBC', 'ICA', 'VAB', 'dt (ms)'], (r) => [r.seq, r.Vp, r.R, r.X, r.open ? 1 : 0, +r.Ia.toFixed(3), +r.Ib.toFixed(3), +r.Ic.toFixed(3), +r.Iab.toFixed(3), +r.Ibc.toFixed(3), +r.Ica.toFixed(3), +r.VAB.toFixed(2), r.dt == null ? '' : +(r.dt * 1e3).toFixed(4)]);
    function rec() {
      const r = solve(); let dt = null, ok = false;
      if (sc.cur.on) { dt = sc.curDt(); ok = cabs(r.Ik[0]) > 0 && sc.val(0, sc.cur.a) > 0.97 * Math.SQRT2 * cabs(r.Ik[0]) && curPhaseOK(sc, r.Ik[0], r.I[0], w50); }
      S.d1rows.push({ seq: S.d1seq, Vp: S.d1Vp, R: S.d1R, X: S.d1X, open: S.d1open, Ia: cabs(r.I[0]), Ib: cabs(r.I[1]), Ic: cabs(r.I[2]), Iab: cabs(r.Ik[0]), Ibc: cabs(r.Ik[1]), Ica: cabs(r.Ik[2]), VAB: cabs(r.VL[0]), dt, ok }); save(); T.draw();
      Lab.toast('Recorded' + (dt != null && !ok ? ' (cursors are not on the peaks: A → i<sub>AB</sub> peak, B → nearest i<sub>aA</sub> peak)' : ''));
    }
    $('#d1rec').onclick = rec; $('#d1del').onclick = () => { S.d1rows.pop(); save(); T.draw(); }; $('#d1csv').onclick = T.csv; T.draw();
    st.update = update; st.rec = rec; st.sc = sc;
    return st;
  })();
  XP.d1 = D1;
  const ex314 = (r) => r.Vp === 120 && r.R === 24 && r.X === 18 && !r.open;
  steps('d1', [
    { t: '<b>Example 3.14</b>: V<sub>an</sub> = 120 V, abc, Z<sub>Δ</sub> = <b>24 + j18 Ω</b>. Record the line and branch currents (R).', test: () => S.d1rows.some((r) => ex314(r) && r.seq === 'abc') },
    { t: 'Place CURSOR A on the i<sub>AB</sub> peak and B on the <b>nearest</b> i<sub>aA</sub> peak, then record. Does the line current lead or lag the branch current?', test: () => S.d1rows.some((r) => !r.open && r.seq === 'abc' && r.ok) },
    { t: 'Set the sequence to <b>acb</b> and repeat the same time measurement.', test: () => S.d1rows.some((r) => !r.open && r.seq === 'acb' && r.ok) },
    { t: 'Change the branch impedance and record with <b>at least three different</b> balanced loads: does the ratio I<sub>L</sub>/I<sub>φ</sub> change?', test: () => new Set(S.d1rows.filter((r) => !r.open).map((r) => r.R + '/' + r.X)).size >= 3 },
    { t: '<b>Open the CA branch</b> (Example 3.14 load) and record: which line current did not change, and which did?', test: () => S.d1rows.some((r) => r.Vp === 120 && r.R === 24 && r.X === 18 && r.open) },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: 'Example 3.14: what is the measured line current |I<sub>aA</sub>| in A?', answer: 12, tol: 1, unit: 'A', explain: 'Z<sub>Y</sub> = Z<sub>Δ</sub>/3 = 8 + j6 = 10∠36.87° Ω ⇒ I<sub>aA</sub> = 120/10 = 12∠−36.87° A.', hint: 'Line ammeter; also calculate it with the single-phase equivalent.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'What is the branch (phase) current |I<sub>AB</sub>| in A?', answer: 12 / Math.sqrt(3), tol: 1, unit: 'A', explain: 'V<sub>AB</sub> = 207.85∠30° V; I<sub>AB</sub> = 207.85/30 = 6.93∠−6.87° A = 12/√3.', hint: 'I<sub>φ</sub> = I<sub>L</sub>/√3' });
  numq('d1', '#d1Q', { id: 'd1q3', q: 'In abc, from the oscilloscope: by how many degrees does i<sub>aA</sub> lag i<sub>AB</sub>?', answer: 30, tol: 4, unit: '°', explain: 'Δt = +1.67 ms (B to the right of A) ⇒ 30° lagging: I<sub>aA</sub> = √3 I<sub>AB</sub>∠−30°.', hint: 'θ = 360°·Δt/T' });
  mcq('d1', '#d1Q', { id: 'd1q4', q: 'What did your measurement show in the acb sequence?', opts: ['i<sub>aA</sub> leads i<sub>AB</sub> by 30°', 'i<sub>aA</sub> lags i<sub>AB</sub> by 30°', 'In phase', 'Lagging by 90°'], correct: 0, explain: 'In acb, I<sub>aA</sub> = √3 I<sub>AB</sub>∠+30°: the current twin of the ±30° rule for voltages.', hint: 'The sign of Δt in your acb row.' });
  numq('d1', '#d1Q', { id: 'd1q5', q: 'With the CA branch open, what was |I<sub>bB</sub>| in A?', answer: 12, tol: 1, unit: 'A', explain: 'I<sub>CA</sub> = 0 ⇒ I<sub>aA</sub> = I<sub>AB</sub> = 6.93 A, I<sub>cC</sub> = −I<sub>BC</sub> = 6.93 A, but I<sub>bB</sub> = I<sub>BC</sub> − I<sub>AB</sub> = √3·6.93 = 12 A: line B still feeds two branches.', hint: 'KCL at node B.' });
  mcq('d1', '#d1Q', { id: 'd1q6', q: 'Why was the magnitude ratio of line to branch current always √3 in a balanced Δ load?', opts: ['A coincidence depending on the branch impedance', 'The line current is the difference of two equal branch currents 120° apart', 'Because the line voltage is √3 times larger', 'Ammeter error'], correct: 1, explain: 'I<sub>aA</sub> = I<sub>AB</sub> − I<sub>CA</sub>: the grey dashed arrow in the phasor panel. The same geometry as V<sub>L</sub> = √3V<sub>φ</sub> for voltages.', hint: 'Examine the construction in the phasor panel.' });

  /* ================= DENEY 2 · Δ–Y dönüşümü, Y mi Δ mı? ================= */
  const D2 = (() => {
    const st = { dirty: true };
    def('d2VL', 400); def('d2R', 30); def('d2X', 40); def('d2c', 'Y'); def('d2lcr', false);
    const box = $('#d2inst');
    const gen = inst(box, 'SUPPLY · abc · 50 Hz');
    new Lab.Knob(gen.c, { label: 'V_L', list: [230, 380, 400], value: S.d2VL, dark: true, size: 46, fmt: (v) => v + ' V', onChange: (v) => { S.d2VL = v; save(); st.dirty = true; } });
    toggle2(gen.c, 'Supply', 'LCR bridge (de-energized)', S.d2lcr, (v) => { S.d2lcr = v; save(); st.dirty = true; });
    const ld = inst(box, 'THREE IDENTICAL WINDINGS (motor terminal box)', false);
    new Lab.Knob(ld.c, { label: 'R', min: 1, max: 100, step: 1, value: S.d2R, size: 46, fmt: (v) => num(v, 0) + ' Ω', onChange: (v) => { S.d2R = v; save(); st.dirty = true; } });
    new Lab.Knob(ld.c, { label: 'X', min: 0, max: 100, step: 1, value: S.d2X, size: 46, fmt: (v) => num(v, 0) + ' Ω', onChange: (v) => { S.d2X = v; save(); st.dirty = true; } });
    toggle2(ld.c, 'Y (wye)', 'Δ (delta)', S.d2c === 'D', (v) => { S.d2c = v ? 'D' : 'Y'; save(); st.dirty = true; });
    const ms = inst(box, 'MEASUREMENTS');
    const mL = [lcd(ms.el, 'I<sub>L</sub> line', 'A', 100), lcd(ms.el, 'I<sub>φ</sub> winding', 'A', 100), lcd(ms.el, 'V<sub>φ</sub> winding', 'V', 100), lcd(ms.el, 'P<sub>T</sub> (wattmeter)', 'W', 110)];
    const lc = inst(box, 'LCR BRIDGE · terminals A–B, 50 Hz', false); const zL = lcd(lc.el, '|Z<sub>AB</sub>|', 'Ω', 100), zA = lcd(lc.el, 'θ', '°', 70);
    const g = $('#d2sch'); const gg = E('g', {}, g);
    function drawSch() {
      gg.innerHTML = '';
      const T = [[60, 60], [60, 140], [60, 220]];
      T.forEach((p, k) => { sch.term(gg, p[0], p[1]); sch.t(gg, p[0] - 20, p[1] + 5, 'ABC'[k], 'val'); });
      if (S.d2c === 'Y') {
        const N = [340, 140];
        T.forEach((p, k) => { sch.w(gg, [p, [140, p[1]]]); sch.zL(gg, 140, p[1], N[0], N[1]); });
        sch.dot(gg, N[0], N[1]); sch.t(gg, N[0] + 12, N[1] + 5, 'N (star point)', 'lbl', 'start');
      } else {
        const P = [[300, 50], [230, 230], [370, 230]];
        T.forEach((p, k) => sch.w(gg, [p, [150, p[1]], [150 + k * 15, p[1]], P[k]]));
        sch.zL(gg, P[0][0], P[0][1], P[1][0], P[1][1]); sch.zL(gg, P[1][0], P[1][1], P[2][0], P[2][1]); sch.zL(gg, P[2][0], P[2][1], P[0][0], P[0][1]);
        P.forEach((p) => sch.dot(gg, p[0], p[1]));
      }
      sch.t(gg, 480, 40, S.d2c === 'Y' ? 'Y connected: winding sees V<tspan font-size="10">L</tspan>/√3' : 'Δ connected: winding sees V<tspan font-size="10">L</tspan>', 'lbl', 'start');
      sch.t(gg, 480, 64, 'Z = ' + zs(S.d2R, S.d2X) + ' Ω', 'lbl', 'start');
      sch.t(gg, 480, 88, S.d2lcr ? 'LCR bridge across A–B (supply disconnected)' : 'Supply connected', 'lbl', 'start');
    }
    const solve = () => {
      const Z = cx(S.d2R, S.d2X), Zm = cabs(Z), VL = S.d2VL;
      const Vph = S.d2c === 'Y' ? VL / Math.sqrt(3) : VL, Iph = Vph / Zm, IL = S.d2c === 'Y' ? Iph : Iph * Math.sqrt(3);
      const P = 3 * Iph * Iph * S.d2R;
      const Zab = S.d2c === 'Y' ? csc(Z, 2) : csc(Z, 2 / 3); // Δ: Z ∥ 2Z
      return { Vph, Iph, IL, P, Zab };
    };
    function update() {
      if (!st.dirty && !(st.sc && st.sc.dirty)) return; st.dirty = false; if (st.sc) st.sc.dirty = false;
      drawSch(); const r = solve();
      if (S.d2lcr) { mL.forEach((f) => f('—')); zL(num(cabs(r.Zab), 2)); zA(num(cang(r.Zab), 1)); }
      else { mL[0](num(r.IL, 2)); mL[1](num(r.Iph, 2)); mL[2](num(r.Vph, 1)); mL[3](num(r.P, 0)); zL('—'); zA('—'); }
    }
    const T = table('d2tab', 'd2rows', (r) => [r.c === 'Y' ? 'Y' : 'Δ', r.lcr ? 'LCR' : r.VL, zs(r.R, r.X), r.lcr ? '—' : num(r.IL, 2), r.lcr ? '—' : num(r.Iph, 2), r.lcr ? '—' : num(r.Vph, 1), r.lcr ? '—' : num(r.P, 0), r.lcr ? num(r.Zm, 2) + ' ∠ ' + num(r.Za, 1) + '°' : '—'],
      'hafta13_deney2.csv', ['connection', 'VL', 'R', 'X', 'IL', 'Iphi', 'Vphi', 'P (W)', '|Zab|', 'angle'], (r) => [r.c, r.lcr ? 'LCR' : r.VL, r.R, r.X, r.lcr ? '' : +r.IL.toFixed(3), r.lcr ? '' : +r.Iph.toFixed(3), r.lcr ? '' : +r.Vph.toFixed(2), r.lcr ? '' : +r.P.toFixed(1), r.lcr ? +r.Zm.toFixed(3) : '', r.lcr ? +r.Za.toFixed(2) : '']);
    function rec() {
      const r = solve();
      S.d2rows.push({ c: S.d2c, VL: S.d2VL, lcr: S.d2lcr, R: S.d2R, X: S.d2X, IL: r.IL, Iph: r.Iph, Vph: r.Vph, P: r.P, Zm: cabs(r.Zab), Za: cang(r.Zab) }); save(); T.draw();
      Lab.toast('Recorded: ' + (S.d2c === 'Y' ? 'Y' : 'Δ') + (S.d2lcr ? ' · LCR' : ' · I<sub>L</sub> = ' + num(r.IL, 2) + ' A'));
    }
    $('#d2rec').onclick = rec; $('#d2del').onclick = () => { S.d2rows.pop(); save(); T.draw(); }; $('#d2csv').onclick = T.csv; T.draw();
    st.update = update; st.rec = rec;
    return st;
  })();
  XP.d2 = D2;
  const z3040 = (r) => r.R === 30 && r.X === 40;
  steps('d2', [
    { t: '<b>Example 3.18</b>: Z = 30 + j40 Ω, V<sub>L</sub> = 400 V; connect in <b>Y</b> and record.', test: () => S.d2rows.some((r) => z3040(r) && r.c === 'Y' && !r.lcr && r.VL === 400) },
    { t: 'Connect the same windings in <b>Δ</b> and record. By what factor did the line current and power increase?', test: () => S.d2rows.some((r) => z3040(r) && r.c === 'D' && !r.lcr && r.VL === 400) },
    { t: 'Disconnect the supply and connect the <b>LCR bridge</b> across A–B; record the impedance seen from the terminals for both Δ and Y connections.', test: () => S.d2rows.some((r) => z3040(r) && r.c === 'D' && r.lcr) && S.d2rows.some((r) => z3040(r) && r.c === 'Y' && r.lcr) },
    { t: '<b>Example 3.16</b>: Z = 12 + j16 Ω, V<sub>L</sub> = 400 V; record both the Δ and Y connections.', test: () => ['Y', 'D'].every((c) => S.d2rows.some((r) => r.R === 12 && r.X === 16 && r.c === c && !r.lcr && r.VL === 400)) },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'Example 3.18, Δ connection: what is the line current in A?', answer: 8 * Math.sqrt(3), tol: 1, unit: 'A', explain: 'In Δ, V<sub>φ</sub> = 400 V ⇒ I<sub>φ</sub> = 8 A, I<sub>L</sub> = √3·8 = 13.86 A (4.62 A in Y).', hint: 'Line ammeter.' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'From your measurements, what is the ratio P<sub>Δ</sub>/P<sub>Y</sub>?', answer: 3, tol: 1, unit: '', explain: 'In Δ the winding voltage is √3 times larger ⇒ power is (√3)² = 3 times: 5760 W / 1920 W.', hint: 'Divide the P values of the two rows.' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 'With the windings in Δ, what |Z<sub>AB</sub>| in Ω did the LCR bridge show across A–B?', answer: 50 * 2 / 3, tol: 1, unit: 'Ω', explain: 'Z<sub>AB</sub> = Z ∥ 2Z = (2/3)Z = 33.3 Ω. In the equivalent Y, Z<sub>AB</sub> = 2Z<sub>Y</sub> ⇒ Z<sub>Y</sub> = Z<sub>Δ</sub>/3 ✓', hint: 'Direct reading.' });
  numq('d2', '#d2Q', { id: 'd2q4', q: 'From this LCR reading, what is the magnitude |Z<sub>Y</sub>| of the equivalent Y branch impedance in Ω?', answer: 50 / 3, tol: 1, unit: 'Ω', explain: 'Z<sub>Y</sub> = Z<sub>AB</sub>/2 = 16.7 Ω = 50/3.', hint: 'In Y, two branches are in series between A and B.' });
  numq('d2', '#d2Q', { id: 'd2q5', q: 'Example 3.16: with the 12 + j16 Ω windings in Δ, what is the line current in A?', answer: 20 * Math.sqrt(3), tol: 1, unit: 'A', explain: 'I<sub>AB</sub> = 400/20 = 20 A, I<sub>aA</sub> = 34.64 A; 11.55 A in Y; ratio 3.', hint: '|Z| = 20 Ω' });
  mcq('d2', '#d2Q', { id: 'd2q6', q: 'In star–delta starting, why is the motor first connected in Y?', opts: ['To reverse the direction of rotation', 'To reduce the starting line current (and torque) to one third', 'To make the power factor 1', 'To drive current through the neutral conductor'], correct: 1, explain: 'As you measured, the line current in Y is 1/3 of that in Δ; once the motor speeds up it is switched to Δ and delivers full power.', hint: 'I<sub>L,Y</sub> / I<sub>L,Δ</sub>' });

  /* ================= DENEY 3 · Üç fazlı güç ve anlık toplam güç ================= */
  const Zg0 = cx(0.2, 0.5), Zl0 = cx(0.8, 1.5);
  const D3 = (() => {
    const st = { dirty: true };
    def('d3Vp', 120); def('d3R', 39); def('d3X', 28); def('d3zg', true); def('d3zl', true); def('d3un', 0); def('d3pt', 'L');
    const box = $('#d3inst');
    const gen = inst(box, 'GENERATOR · Z<sub>g</sub> = 0.2 + j0.5 Ω');
    new Lab.Knob(gen.c, { label: 'E_φ', min: 0, max: 240, step: 1, value: S.d3Vp, dark: true, size: 46, fmt: (v) => num(v, 0) + ' V', onChange: (v) => { S.d3Vp = v; save(); st.dirty = true; } });
    toggle2(gen.c, 'Z<sub>g</sub> off', 'Z<sub>g</sub> on', S.d3zg, (v) => { S.d3zg = v; save(); st.dirty = true; });
    toggle2(gen.c, 'No line', 'Line 0.8+j1.5', S.d3zl, (v) => { S.d3zl = v; save(); st.dirty = true; });
    const ld = inst(box, 'Y LOAD (4-wire)', false);
    new Lab.Knob(ld.c, { label: 'R', min: 1, max: 100, step: 0.5, value: S.d3R, size: 46, fmt: (v) => num(v, 1) + ' Ω', onChange: (v) => { S.d3R = v; save(); st.dirty = true; } });
    new Lab.Knob(ld.c, { label: 'X', min: -60, max: 60, step: 0.5, value: S.d3X, size: 46, fmt: (v) => num(v, 1) + ' Ω', onChange: (v) => { S.d3X = v; save(); st.dirty = true; } });
    new Lab.Knob(ld.c, { label: 'Phase C R ±', min: -50, max: 200, step: 10, value: S.d3un, size: 40, fmt: (v) => (v > 0 ? '+' : '') + v + ' %', onChange: (v) => { S.d3un = v; save(); st.dirty = true; } });
    const pa = inst(box, 'POWER ANALYZER · 3-phase total');
    const pL = [lcd(pa.el, 'P', 'W', 105), lcd(pa.el, 'Q', 'VAR', 105), lcd(pa.el, '|S|', 'VA', 105), lcd(pa.el, 'pf', '', 80)];
    selBox(pa.c, 'Connection point', [['L', 'load terminals (A, B, C)'], ['G', 'generator terminals (a, b, c)'], ['E', 'internal emf (ideal source)']], S.d3pt, (v) => { S.d3pt = v; save(); st.dirty = true; });
    const sc = mkOsc($('#d3scope'), { chs: [{ n: 'p_a', c: PHs[0] }, { n: 'p_b', c: PHs[1] }, { n: 'p_c', c: PHs[2] }, { n: 'p_T', c: '#ffffff' }], groups: [{ l: 'W/d', v: 200, u: 'W', list: [20, 50, 100, 200, 500, 1000] }], t: 2e-3, brand: 'DSO · MATH: p = v·i (load phases) · trigger v_AN ↑' });
    const solve = () => {
      const Vs = src3(S.d3Vp, 'abc'), Zs = cadd(S.d3zg ? Zg0 : cx(0), S.d3zl ? Zl0 : cx(0)), Z = cx(S.d3R, S.d3X), Zc = cx(S.d3R * (1 + S.d3un / 100), S.d3X);
      const r = solveYY(Vs, [Zs, Zs, Zs], [Z, Z, Zc], cx(1e-3));
      r.Vs = Vs; r.Vg = r.I.map((i, k) => csub(Vs[k], cmul(S.d3zg ? Zg0 : cx(0), i)));
      const Sx = (V) => cadd(...V.map((v, k) => cmul(v, conj(r.I[k]))));
      r.S = { L: Sx(r.VL), G: Sx(r.Vg), E: Sx(Vs) };
      return r;
    };
    const tbl = $('#d3pwr');
    function update() {
      if (!st.dirty && !(st.sc && st.sc.dirty)) return; st.dirty = false; if (st.sc) st.sc.dirty = false;
      const r = solve(), Sm = r.S[S.d3pt];
      pL[0](num(Sm.re, 1)); pL[1](num(Sm.im, 1)); pL[2](num(cabs(Sm), 1)); pL[3](cabs(Sm) ? num(Sm.re / cabs(Sm), 3) + (Sm.im > 1e-6 ? ' lag' : Sm.im < -1e-6 ? ' lead' : '') : '—');
      const fv = r.VL.map((v) => sig(v, w50)), fi = r.I.map((i) => sig(i, w50)), fp = [0, 1, 2].map((k) => (t) => fv[k](t) * fi[k](t));
      sc.draw({ f: [...fp, (t) => fp[0](t) + fp[1](t) + fp[2](t)], w: w50, trig: cang(r.VL[0]), mlab: 'avg', rms: [...[0, 1, 2].map((k) => cmul(r.VL[k], conj(r.I[k])).re), r.S.L.re] });
      tbl.innerHTML = '<tr><th></th><th>a</th><th>b</th><th>c</th></tr>' + ['|V<sub>φ</sub>| load (V)', '|I| (A)'].map((h, j) => `<tr><td class="l">${h}</td>${[0, 1, 2].map((k) => `<td>${num(cabs(j ? r.I[k] : r.VL[k]), 2)}</td>`).join('')}</tr>`).join('');
    }
    const T = table('d3tab', 'd3rows', (r) => [num(r.Vp, 0), zs(r.R, r.X), r.un ? (r.un > 0 ? '+' : '') + r.un + ' %' : '—', (r.zg ? 'Z<sub>g</sub> ' : '') + (r.zl ? 'Z<sub>ℓ</sub>' : ''), { L: 'load', G: 'generator', E: 'emf' }[r.pt], num(r.P, 1), num(r.Q, 1), num(r.S, 1), num(r.pf, 3), r.rip == null ? '—' : num(r.rip, 1)],
      'hafta13_deney3.csv', ['Ephi', 'R', 'X', 'imbalance %', 'Zg', 'Zl', 'point', 'P', 'Q', 'S', 'pf', 'pT ripple (W)'], (r) => [r.Vp, r.R, r.X, r.un, r.zg ? 1 : 0, r.zl ? 1 : 0, r.pt, +r.P.toFixed(2), +r.Q.toFixed(2), +r.S.toFixed(2), +r.pf.toFixed(4), r.rip == null ? '' : +r.rip.toFixed(2)]);
    function rec() {
      const r = solve(), Sm = r.S[S.d3pt];
      let rip = null;
      if (sc.cur.on && sc.chOn(3)) rip = Math.abs(sc.val(3, sc.cur.b) - sc.val(3, sc.cur.a));
      S.d3rows.push({ Vp: S.d3Vp, R: S.d3R, X: S.d3X, un: S.d3un, zg: S.d3zg, zl: S.d3zl, pt: S.d3pt, P: Sm.re, Q: Sm.im, S: cabs(Sm), pf: cabs(Sm) ? Sm.re / cabs(Sm) : 0, rip, pa: sc.cur.on && sc.chOn(0) ? sc.val(0, sc.cur.a) : null }); save(); T.draw();
      Lab.toast('Recorded: P = ' + num(Sm.re, 1) + ' W' + (rip != null ? ', |p<sub>T</sub>(B) − p<sub>T</sub>(A)| = ' + num(rip, 1) + ' W' : ''));
    }
    $('#d3rec').onclick = rec; $('#d3del').onclick = () => { S.d3rows.pop(); save(); T.draw(); }; $('#d3csv').onclick = T.csv; T.draw();
    st.update = update; st.rec = rec; st.sc = sc; st.solve = solve;
    return st;
  })();
  XP.d3 = D3;
  const ex319 = (r) => r.Vp === 120 && r.R === 39 && r.X === 28 && r.zg && r.zl && !r.un;
  steps('d3', [
    { t: '<b>Example 3.19</b>: E<sub>φ</sub> = 120 V, load 39 + j28 Ω, Z<sub>g</sub> and line in circuit, balanced. Connect the power analyzer to the <b>load terminals</b> and record.', test: () => S.d3rows.some((r) => ex319(r) && r.pt === 'L') },
    { t: 'Move the analyzer to the <b>generator terminals</b> and to the <b>internal emf</b> and record both: where did the difference go?', test: () => S.d3rows.some((r) => ex319(r) && r.pt === 'G') && S.d3rows.some((r) => ex319(r) && r.pt === 'E') },
    { t: 'Turn on all four oscilloscope channels with at least one period visible. Place CURSORS A and B on p<sub>T</sub> at <b>two different instants</b> and record (balanced).', test: () => S.d3rows.some((r) => !r.un && r.rip != null && r.Vp > 0) && D3.sc.chs.every((c) => c.on) },
    { t: 'Make the load <b>unbalanced</b> by changing the phase C resistance (≥ 50%); is p<sub>T</sub> still constant? Record the peak–trough difference with the cursors.', test: () => S.d3rows.some((r) => Math.abs(r.un) >= 50 && r.rip != null && r.rip > 1) },
    { t: 'Record with a balanced, <b>X = 0</b> (purely resistive) load: what were the pf and the minimum value of a single phase power?', test: () => S.d3rows.some((r) => !r.un && r.X === 0 && r.pt === 'L') },
  ]);
  numq('d3', '#d3Q', { id: 'd3q1', q: 'Example 3.19: what is the total active power of the load in W?', answer: 3 * 2.4 * 2.4 * 39, tol: 1, unit: 'W', explain: 'P = 3·|I|²·R = 3·2.4²·39 = 673.9 W.', hint: 'Analyzer at the load terminals.' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'What is the total reactive power of the load in VAR?', answer: 3 * 2.4 * 2.4 * 28, tol: 1, unit: 'VAR', explain: 'Q = 3·2.4²·28 = 483.8 VAR (inductive).', hint: 'Analyzer at the load terminals.' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'What is the difference in P between the generator and load terminals (total line loss) in W?', answer: 3 * 2.4 * 2.4 * 0.8, tol: 2, unit: 'W', explain: 'P<sub>line</sub> = 3·2.4²·0.8 = 13.8 W. The difference between the emf and the generator terminals is the internal loss: 3·2.4²·0.2 = 3.46 W.', hint: 'Difference in P between the two records.' });
  numq('d3', '#d3Q', { id: 'd3q4', q: 'What is the apparent power |S| delivered by the internal emf in VA?', answer: 864, tol: 1, unit: 'VA', explain: 'S = 3·120·2.4∠36.87° = 691.2 + j518.4 VA ⇒ 864 VA.', hint: 'Analyzer at “internal emf”.' });
  numq('d3', '#d3Q', { id: 'd3q5', q: 'For the balanced Example 3.19 load, what is the maximum value of the single-phase power p<sub>a</sub>(t) in W? (Measure with a cursor.)', answer: 115.22 * 2.4 * (1 + Math.cos(Math.atan2(28, 39))), tol: 2, unit: 'W', explain: 'p<sub>a</sub> = V I cos θ + V I cos(2ωt − θ) ⇒ max = V I (1 + cos θ) = 276.5·(1 + 0.812) = 501 W; its average is 224.6 W.', hint: 'Cursor on the CH1 peak.' });
  mcq('d3', '#d3Q', { id: 'd3q6', q: 'Why is p<sub>T</sub>(t) constant with a balanced load, and what is its practical importance?', opts: ['Since the voltages sum to zero, the power is zero too', 'The 2ω pulsating terms are 120° apart and cancel; a vibration-free constant torque is obtained on the motor shaft', 'The line impedance filters out the pulsation', 'It is constant only for a pure resistance'], correct: 1, explain: 'p<sub>T</sub> = 3V<sub>φ</sub>I<sub>φ</sub>cos θ. Single-phase motors vibrate at 100 Hz, three-phase motors run smoothly. (Common mistake from the slides: “the sum is zero, so power is zero”.)', hint: 'Compare the ripple in your balanced and unbalanced records.' });

  /* ================= DENEY 4 · Hat kaybı ve pf düzeltmesi ================= */
  const D4 = (() => {
    const st = { dirty: true };
    def('d4P', 480); def('d4pf', 0.8); def('d4C', 0);
    const VL = 600, Zl = cx(0.005, 0.025), VAN = cx(VL / Math.sqrt(3));
    const box = $('#d4inst');
    const ld = inst(box, 'FACTORY LOAD · V<sub>L</sub> = 600 V (constant at the load bus)');
    new Lab.Knob(ld.c, { label: 'P', list: [120, 240, 360, 480, 600], value: S.d4P, dark: true, size: 46, fmt: (v) => v + ' kW', onChange: (v) => { S.d4P = v; save(); st.dirty = true; } });
    new Lab.Knob(ld.c, { label: 'pf (lag)', min: 0.6, max: 1, step: 0.01, value: S.d4pf, dark: true, size: 46, fmt: (v) => num(v, 2), onChange: (v) => { S.d4pf = v; save(); st.dirty = true; } });
    const cb = inst(box, 'Δ CAPACITOR BANK', false);
    new Lab.Knob(cb.c, { label: 'C_Δ (per branch)', min: 0, max: 1500, step: 1, value: S.d4C, size: 60, fmt: (v) => num(v, 0) + ' µF', onChange: (v) => { S.d4C = v; save(); st.dirty = true; } });
    const ms = inst(box, 'ENERGY ANALYZERS');
    const mL = [lcd(ms.el, 'I<sub>L</sub> line', 'A', 100), lcd(ms.el, 'pf load bus', '', 100), lcd(ms.el, 'P<sub>line</sub> loss', 'kW', 100), lcd(ms.el, 'Q<sub>line</sub>', 'kVAR', 100), lcd(ms.el, 'V<sub>L</sub> sending end', 'V', 100), lcd(ms.el, 'pf sending end', '', 100)];
    const plot = new Lab.Plot($('#d4plot'), { xlabel: 'C_Δ  (µF)', ylabel: 'P_line  (kW)' });
    const solve = (C = S.d4C, P = S.d4P, pf = S.d4pf) => {
      const Pp = P * 1e3 / 3, Qp = Pp * Math.tan(Math.acos(pf));
      const Iload = conj(cdiv(cx(Pp, Qp), VAN)), Ic = cmul(cx(0, w50 * 3 * C * 1e-6), VAN); // Δ C ⇒ Y eşdeğeri 3C
      const I = cadd(Iload, Ic), Vs = cadd(VAN, cmul(Zl, I)), Sb = cmul(VAN, conj(I)), Ss = cmul(Vs, conj(I));
      return { I: cabs(I), pfb: Sb.re / cabs(Sb), lead: Sb.im < 0, Pl: 3 * cabs(I) ** 2 * Zl.re, Ql: 3 * cabs(I) ** 2 * Zl.im, VLs: cabs(Vs) * Math.sqrt(3), pfs: Ss.re / cabs(Ss), leads: Ss.im < 0 };
    };
    const tag = (l) => (l ? ' lead' : ' lag');
    function drawPlot() {
      const rows = S.d4rows.filter((r) => r.P === S.d4P && r.pf === S.d4pf), ser = [];
      if ($('#d4theo').checked) { const pts = []; for (let c = 0; c <= 1500; c += 15) pts.push([c, solve(c).Pl / 1e3]); ser.push({ pts, line: true, color: '#e07a10', dash: [6, 4] }); }
      ser.push({ pts: rows.map((r) => [r.C, r.Pl / 1e3]), dots: true, color: '#0b5cad' });
      plot.draw(ser, [0, 1500]);
    }
    $('#d4theo').onchange = () => { if ($('#d4theo').checked) flag('d4theo'); drawPlot(); };
    // güç üçgeni
    function tri() {
      const s = $('#d4tri'); s.innerHTML = '';
      const P = S.d4P, Q1 = P * Math.tan(Math.acos(S.d4pf)), Qc = 3 * 600 * 600 * w50 * S.d4C * 1e-6 / 1e3, Q2 = Q1 - Qc, k = 260 / Math.max(P, Q1 + 50, Math.abs(Q2) + 50), x0 = 30, y0 = 170;
      const L = (x1, y1, x2, y2, c, d) => E('line', { x1, y1, x2, y2, stroke: c, 'stroke-width': 3, 'stroke-dasharray': d || '' }, s);
      L(x0, y0, x0 + P * k, y0, '#0b5cad'); L(x0 + P * k, y0, x0 + P * k, y0 - Q1 * k, '#c62828'); L(x0, y0, x0 + P * k, y0 - Q1 * k, '#555', '5 4');
      L(x0 + P * k + 12, y0 - Q1 * k, x0 + P * k + 12, y0 - Q2 * k, '#1a8a4a'); L(x0, y0, x0 + P * k, y0 - Q2 * k, '#222');
      sch.t(s, x0 + P * k / 2, y0 + 18, 'P (kW)', 'lbl'); sch.t(s, x0 + P * k + 18, y0 - Q1 * k + 12, 'Q₁', 'lbl', 'start'); sch.t(s, x0 + P * k + 18, y0 - (Q1 + Q2) * k / 2, 'Q<tspan font-size="10">C</tspan>', 'lbl', 'start').style.fill = '#1a8a4a'; sch.t(s, x0 + 8, 20, 'Power triangle: dashed = S₁ before correction, black = S₂ after', 'lbl', 'start').style.fontSize = '11px';
    }
    function update() {
      if (!st.dirty && !(st.sc && st.sc.dirty)) return; st.dirty = false; if (st.sc) st.sc.dirty = false;
      const r = solve();
      mL[0](num(r.I, 1)); mL[1](num(r.pfb, 3) + tag(r.lead)); mL[2](num(r.Pl / 1e3, 2)); mL[3](num(r.Ql / 1e3, 2)); mL[4](num(r.VLs, 1)); mL[5](num(r.pfs, 3) + tag(r.leads));
      tri(); drawPlot();
    }
    const T = table('d4tab', 'd4rows', (r) => [r.P, num(r.pf, 2), num(r.C, 0), num(r.I, 1), num(r.pfb, 3) + tag(r.lead), num(r.Pl / 1e3, 2), num(r.VLs, 1)],
      'hafta13_deney4.csv', ['P (kW)', 'pf load', 'C_delta (uF)', 'IL (A)', 'pf bus', 'P line (kW)', 'VL sending (V)'], (r) => [r.P, r.pf, r.C, +r.I.toFixed(2), +(r.lead ? -r.pfb : r.pfb).toFixed(4), +(r.Pl / 1e3).toFixed(3), +r.VLs.toFixed(2)]);
    function rec() { const r = solve(); S.d4rows.push(Object.assign({ P: S.d4P, pf: S.d4pf, C: S.d4C }, r)); save(); T.draw(); drawPlot(); Lab.toast('Recorded: C<sub>Δ</sub> = ' + S.d4C + ' µF, P<sub>line</sub> = ' + num(r.Pl / 1e3, 2) + ' kW'); }
    $('#d4rec').onclick = rec; $('#d4del').onclick = () => { S.d4rows.pop(); save(); T.draw(); drawPlot(); }; $('#d4csv').onclick = T.csv; T.draw();
    st.update = update; st.rec = rec;
    return st;
  })();
  XP.d4 = D4;
  const ex324 = (r) => r.P === 480 && near(r.pf, 0.8, 1e-6);
  steps('d4', [
    { t: '<b>Examples 3.21–3.22</b>: 480 kW, pf = 0.8 lagging, <b>C<sub>Δ</sub> = 0</b>. Record the line current, the loss and the sending-end voltage.', test: () => S.d4rows.some((r) => ex324(r) && r.C === 0) },
    { t: '<b>Example 3.24</b>: first calculate the C<sub>Δ</sub> that makes the pf at the load bus <b>0.95 lagging</b>, then set it and record.', test: () => S.d4rows.some((r) => ex324(r) && !r.lead && r.pfb >= 0.945 && r.pfb <= 0.955) },
    { t: 'Find and record the C<sub>Δ</sub> that <b>minimizes</b> the line loss (pf ≥ 0.995).', test: () => S.d4rows.some((r) => ex324(r) && r.pfb >= 0.995) },
    { t: 'Deliberately <b>overcompensate</b> (pf leading) and record: did the loss increase again?', test: () => S.d4rows.some((r) => ex324(r) && r.lead && r.pfb < 0.97) },
    { t: 'Record <b>at least 6</b> different C<sub>Δ</sub> values with the same load and turn on the <b>theoretical curve</b>.', test: () => new Set(S.d4rows.filter(ex324).map((r) => r.C)).size >= 6 && !!S.fl.d4theo },
  ]);
  numq('d4', '#d4Q', { id: 'd4q1', q: 'What line current in A did you measure at C<sub>Δ</sub> = 0?', answer: 480e3 / (Math.sqrt(3) * 600 * 0.8), tol: 0.5, unit: 'A', explain: 'I<sub>L</sub> = 480 000/(√3·600·0.8) = 577.35 A.', hint: 'Analyzer I<sub>L</sub>.' });
  numq('d4', '#d4Q', { id: 'd4q2', q: 'Example 3.21: what is the line voltage at the sending end in V?', answer: 619.2, tol: 0.5, unit: 'V', explain: 'V<sub>s</sub> = 346.41 + (0.005 + j0.025)(461.9 − j346.4) = 357.5∠1.57° V ⇒ V<sub>L</sub> = 619.2 V.', hint: 'Analyzer sending end.' });
  numq('d4', '#d4Q', { id: 'd4q3', q: 'Example 3.24: what total Q<sub>C</sub> in kVAR is required for pf = 0.95?', answer: 480 * (0.75 - Math.tan(Math.acos(0.95))), tol: 1, unit: 'kVAR', explain: 'Q<sub>C</sub> = P(tan θ<sub>1</sub> − tan θ<sub>2</sub>) = 480(0.75 − 0.3287) = 202.2 kVAR.', hint: 'In the power triangle only the height changes.' });
  numq('d4', '#d4Q', { id: 'd4q4', q: 'What branch capacitance C<sub>Δ</sub> in µF does the Δ bank need for this?', answer: 202.2e3 / (3 * 600 * 600 * w50) * 1e6, tol: 1.5, unit: 'µF', explain: 'Q<sub>C</sub> = 3 V<sub>L</sub>² ω C<sub>Δ</sub> ⇒ C<sub>Δ</sub> = 202 200/(3·600²·314.16) = 596 µF. A Y-connected bank would need 3 times as much.', hint: 'In Δ each capacitor sees V<sub>L</sub>.' });
  numq('d4', '#d4Q', { id: 'd4q5', q: 'At pf = 0.95, to how many kW did the line loss drop?', answer: 3 * Math.pow(480e3 / (Math.sqrt(3) * 600 * 0.95), 2) * 0.005 / 1e3, tol: 2, unit: 'kW', explain: 'I<sub>L</sub> = 486.2 A ⇒ 3·486.2²·0.005 = 3.55 kW (5.0 kW before): a 29% saving.', hint: 'Analyzer P<sub>line</sub>.' });
  mcq('d4', '#d4Q', { id: 'd4q6', q: 'What did you observe with overcompensation?', opts: ['The loss dropped to zero', 'The pf became leading; the line current and the loss increased again', 'The active power increased', 'Nothing changed'], correct: 1, explain: 'The minimum current occurs at pf = 1; excess capacitance makes the line carry capacitive reactive current. This is why compensation panels are stepped and automatic (reactive power relay).', hint: 'To the right of the minimum in the plot.' });

  const REP = { hafta: 13, konu: 'Y–Δ connection, Δ–Y transformation, three-phase power, total instantaneous power, line loss and power factor correction (Sections 3.4–3.5)',
    tables: [['Experiment 1 · Phase and line currents in a Δ load', '#d1tab'], ['Experiment 2 · Y and Δ connection', '#d2tab'], ['Experiment 3 · Three-phase power', '#d3tab'], ['Experiment 4 · Power factor correction', '#d4tab']],
    canv: () => [D1.sc.cv, D3.sc.cv, $('#d4plot')], svgs: () => [$('#d1ph'), $('#d4tri')] };

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

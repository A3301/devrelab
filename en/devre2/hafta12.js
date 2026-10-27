/* Devre Kuramı II · Hafta 12 — Üç fazlı kaynaklar ve Y–Y bağlantı (Bölüm 3.1–3.3) */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd2h12';
  const S = Object.assign({ answers: {}, steps: {}, st: {}, page: 'giris', fl: {}, d1rows: [], d2rows: [], d3rows: [], d4rows: [] }, Lab.store.load(KEY));
  if (!S.seqX) S.seqX = Math.random() < 0.5 ? 'abc' : 'acb'; // bilinmeyen kaynağın faz sırası
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
  const PH = ['#e0a800', '#1597c9', '#d6336c']; // a, b, c renkleri (açık zeminde)
  const PHs = ['#f2d21b', '#27c4f0', '#ff6b8a']; // osiloskop renkleri

  /* ================= ÖN BİLGİ · dönen fazör animasyonu ================= */
  const ob = { run: true, seq: 'abc', t: 0, last: null, sum: false };
  const obc = $('#obAnim'), obg = obc.getContext('2d');
  $('#obPlay').onclick = () => { ob.run = !ob.run; $('#obPlay').textContent = ob.run ? '❚❚ Pause' : '▶ Play'; };
  $('#obSeq').onclick = () => { ob.seq = ob.seq === 'abc' ? 'acb' : 'abc'; $('#obSeq').textContent = 'Sequence: ' + ob.seq; };
  $('#obSum').onchange = () => { ob.sum = $('#obSum').checked; };
  function obTick(ts) {
    if (ob.last == null) ob.last = ts;
    const dt = (ts - ob.last) / 1000; ob.last = ts;
    if (ob.run) ob.t += dt * 0.5; // yavaşlatılmış: 0,5 Hz’lik görsel dönüş
    const g = obg, W = obc.width, H = obc.height, cxp = 135, cyp = H / 2, R = 100, w = 2 * Math.PI * 0.5;
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#ccd'; g.beginPath(); g.arc(cxp, cyp, R, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(cxp - R - 15, cyp); g.lineTo(cxp + R + 15, cyp); g.moveTo(cxp, cyp - R - 15); g.lineTo(cxp, cyp + R + 15); g.stroke();
    const ang = [0, ob.seq === 'abc' ? -120 : 120, ob.seq === 'abc' ? 120 : -120], x0 = 290, x1 = W - 10, Tsh = 2.2;
    g.strokeStyle = '#ccd'; g.beginPath(); g.moveTo(x0, cyp); g.lineTo(x1, cyp); g.stroke();
    g.font = '13px Segoe UI'; g.fillStyle = '#555'; g.fillText('time →', x1 - 60, cyp + 16);
    const th = w * ob.t;
    ang.forEach((a, k) => {
      const ph = th + a * D2R, px = cxp + R * Math.cos(ph), py = cyp - R * Math.sin(ph);
      g.strokeStyle = PH[k]; g.fillStyle = PH[k]; g.lineWidth = 3;
      g.beginPath(); g.moveTo(cxp, cyp); g.lineTo(px, py); g.stroke(); g.beginPath(); g.arc(px, py, 5, 0, 7); g.fill();
      g.fillText('V' + 'abc'[k], px + 8 * Math.cos(ph), py - 8 * Math.sin(ph));
      // izdüşüm çizgisi (Re ekseni = kosinüs). Dalga sağda: yatay eksen zaman, düşey değer = R cos
      g.lineWidth = 2.2; g.beginPath();
      for (let i = 0; i <= 300; i++) { const x = x0 + (i / 300) * (x1 - x0), tt = ob.t - (i / 300) * Tsh, y = cyp - R * Math.cos(w * tt + a * D2R); i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
      const yNow = cyp - R * Math.cos(ph); g.setLineDash([3, 3]); g.lineWidth = 1; g.beginPath(); g.moveTo(cxp + R * Math.cos(ph), cyp - R * Math.sin(ph)); g.lineTo(cxp + R * Math.cos(ph), cyp); g.stroke(); g.setLineDash([]);
      g.beginPath(); g.arc(x0, yNow, 4, 0, 7); g.fill();
    });
    if (ob.sum) { g.strokeStyle = '#222'; g.lineWidth = 2; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(x0, cyp); g.lineTo(x1, cyp); g.stroke(); g.setLineDash([]); g.fillStyle = '#222'; g.fillText('v_a + v_b + v_c = 0 (at every instant)', x0 + 8, cyp - 8); }
    g.fillStyle = '#333'; g.fillText('Phasors rotate counter-clockwise; waves = horizontal projection (Re{·}). Sequence: ' + ob.seq, 10, 18);
  }

  /* ================= ÖN HAZIRLIK ================= */
  numq('onhaz', '#preQ', { id: 'p1', q: '1) Example 3.1: A 30 kW resistive load is supplied from a 380 V (line) three-phase 3-wire line. What is the line current (A)?', answer: 30000 / (Math.sqrt(3) * 380), tol: 1, unit: 'A', explain: 'I<sub>L</sub> = P/(√3·V<sub>L</sub>·cos θ) = 30 000/(√3·380) = 45.58 A.', hint: 'P = √3 V<sub>L</sub> I<sub>L</sub> cos θ, cos θ = 1.' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) In the same example, if each conductor has resistance R<sub>ℓ</sub> = 0.1 Ω, what is the total loss (W) in the three lines?', answer: 3 * Math.pow(30000 / (Math.sqrt(3) * 380), 2) * 0.1, tol: 1.5, unit: 'W', explain: '3·45.58²·0.1 = 623 W. With a single-phase supply (2 conductors, 78.95 A) the loss would be 1247 W: three-phase carries the same power with half the loss.', hint: '3 I<sub>L</sub>² R<sub>ℓ</sub>' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) In the Turkish low-voltage grid the phase voltage is 230 V. What is the line (phase-to-phase) voltage (V)?', answer: 230 * Math.sqrt(3), tol: 0.5, unit: 'V', explain: '230·√3 = 398.4 V ≈ 400 V. 230 V at the socket, 400 V at the terminals of a three-phase motor.', hint: 'V<sub>L</sub> = √3 V<sub>φ</sub>' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) Example 3.5: How many poles does a hydroelectric generator rotating at 125 rpm on a 50 Hz grid have?', answer: 48, tol: 0, abs: 0.4, unit: 'poles', explain: 'p = 120 f / n = 120·50/125 = 48 poles. A two-pole steam turbine, by contrast, runs at 3000 rpm.', hint: 'n = 120 f / p' });
  mcq('onhaz', '#preQ', { id: 'p5', q: '5) Example 3.4: v<sub>a</sub> = 100cos(ωt − 20°), v<sub>b</sub> = 100cos(ωt + 100°), v<sub>c</sub> = 100cos(ωt − 140°) V. What is the phase sequence?', opts: ['abc (positive)', 'acb (negative)', 'Unbalanced, sequence undefined'], correct: 1, explain: 'θ<sub>b</sub> − θ<sub>a</sub> = +120°: b leads a by 120° ⇒ the phase that peaks after a is c: acb. Swapping the cables of two phases reverses the sequence.', hint: 'Subtract the angle of a from that of b: if −120°, it is abc.' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) In the abc sequence, if V<sub>an</sub> = V<sub>m</sub>∠0°, which is V<sub>bn</sub>?', opts: ['V<sub>m</sub>∠+120°', 'V<sub>m</sub>∠−120°', 'V<sub>m</sub>∠−30°', 'V<sub>m</sub>∠+30°'], correct: 1, explain: 'In abc each following phase lags the previous one by 120°: V<sub>bn</sub> = V<sub>m</sub>∠−120°, V<sub>cn</sub> = V<sub>m</sub>∠+120°. (The “common mistake” in the slides.)', hint: 'Lagging = negative angle.' });

  /* ================= DENEY 1 · Üç faz ve faz sırası ================= */
  const D1 = (() => {
    const st = { dirty: true };
    def('d1Vp', 50); def('d1f', 50); def('d1src', 'A'); def('d1sw', false); def('d1lamp', false);
    const box = $('#d1inst');
    const gen = inst(box, 'ADJUSTABLE THREE-PHASE SOURCE · isolation transformer'); const gL = lcd(gen.el, 'V<sub>φ</sub> setting (rms)', 'V', 120);
    const kV = new Lab.Knob(gen.c, { label: 'V_φ', min: 0, max: 230, step: 5, value: S.d1Vp, dark: true, size: 56, fmt: (v) => num(v, 0) + ' V', onChange: (v) => { S.d1Vp = v; save(); st.dirty = true; } });
    new Lab.Knob(gen.c, { label: 'f', list: [50, 60], value: S.d1f, dark: true, size: 40, fmt: (v) => v + ' Hz', onChange: (v) => { S.d1f = v; save(); st.dirty = true; } });
    const sw = inst(box, 'CONNECTION PANEL', false);
    toggle2(sw.c, 'Source A (labelled abc)', 'Source X (unlabelled)', S.d1src === 'X', (v) => { S.d1src = v ? 'X' : 'A'; save(); st.dirty = true; });
    const bSw = segBtn(sw.c, 'swap b ↔ c cables', S.d1sw); bSw.onclick = () => { S.d1sw = !S.d1sw; bSw.classList.toggle('on', S.d1sw); save(); st.dirty = true; };
    // faz sırası göstergesi (kondansatör + iki lamba, yıldız noktası boşta)
    const ind = inst(box, 'PHASE-SEQUENCE INDICATOR · C + 2 lamps', false);
    const bL = segBtn(ind.c, 'Connect indicator', S.d1lamp); bL.onclick = () => { S.d1lamp = !S.d1lamp; bL.classList.toggle('on', S.d1lamp); save(); st.dirty = true; };
    const lsv = E('svg', { viewBox: '0 0 220 90', width: 220, height: 90 }); ind.el.insertBefore(lsv, ind.c);
    const lampG = [];
    [['a', 'C', 30], ['b', 'L1', 110], ['c', 'L2', 190]].forEach(([p, n, x], k) => {
      sch.t(lsv, x, 14, p + ' phase', 'lbl').style.fontSize = '11px';
      if (k === 0) { E('path', { d: `M${x},20 v18 M${x - 12},38 h24 M${x - 12},45 h24 M${x},45 v20`, stroke: '#333', 'stroke-width': 2, fill: 'none' }, lsv); }
      else { const gl = E('circle', { cx: x, cy: 44, r: 19, fill: '#ffd34d', opacity: 0 }, lsv); E('circle', { cx: x, cy: 44, r: 12, fill: '#f8f8f0', stroke: '#333', 'stroke-width': 2 }, lsv); E('path', { d: `M${x - 7},38 l14,12 M${x + 7},38 l-14,12`, stroke: '#333', 'stroke-width': 1.5 }, lsv); lampG.push(gl); }
      sch.t(lsv, x, 82, n, 'lbl').style.fontSize = '11px';
    });
    const sc = mkOsc($('#d1scope'), { chs: [{ n: 'v_an', c: PHs[0] }, { n: 'v_bn', c: PHs[1] }, { n: 'v_cn', c: PHs[2] }], groups: [{ l: 'V/div', v: 50, u: 'V' }], t: 2e-3 });
    // şema
    const g = $('#d1sch');
    const ctr = [150, 130], ends = [[150, 40], [72, 175], [228, 175]];
    ends.forEach((p, k) => { sch.w(g, [ctr, p]); const m = [(ctr[0] + p[0]) / 2, (ctr[1] + p[1]) / 2]; sch.src(g, m[0], m[1], 16); sch.t(g, m[0] + (k === 0 ? 26 : k === 1 ? -22 : 24), m[1] + 4, 'e' + 'abc'[k], 'lbl'); });
    sch.dot(g, ctr[0], ctr[1]); sch.t(g, ctr[0] + 14, ctr[1] + 4, 'n', 'lbl', 'start');
    const yT = [50, 90, 130, 170], xT = 560;
    sch.w(g, [[150, 40], [150, 30], [400, 30], [400, yT[0]], [xT, yT[0]]]);
    sch.w(g, [[72, 175], [72, 220], [330, 220], [330, yT[1]], [380, yT[1]]]);
    sch.w(g, [[228, 175], [228, 200], [350, 200], [350, yT[2]], [380, yT[2]]]);
    sch.w(g, [[150, 130], [150, 250], [420, 250], [420, yT[3]], [xT, yT[3]]]);
    const swG = E('g', {}, g);
    ['a', 'b', 'c', 'n'].forEach((p, k) => { sch.term(g, xT, yT[k]); sch.t(g, xT + 14, yT[k] + 5, p, 'val', 'start'); });
    const tSrc = sch.t(g, 150, 285, '', 'val');
    sch.t(g, 650, 70, 'CH1: a–n', 'lbl').style.fill = PH[0]; sch.t(g, 650, 110, 'CH2: b–n', 'lbl').style.fill = PH[1]; sch.t(g, 650, 150, 'CH3: c–n', 'lbl').style.fill = PH[2];
    sch.t(g, 650, 190, '(differential probe)', 'lbl').style.fontSize = '11px';
    const effSeq = () => { let s = S.d1src === 'A' ? 'abc' : S.seqX; if (S.d1sw) s = s === 'abc' ? 'acb' : 'abc'; return s; };
    const w = () => 2 * Math.PI * S.d1f;
    function update() {
      if (!st.dirty && !(st.sc && st.sc.dirty)) return; st.dirty = false; if (st.sc) st.sc.dirty = false;
      gL(num(S.d1Vp, 0));
      swG.innerHTML = '';
      if (S.d1sw) { sch.w(swG, [[380, yT[1]], [430, yT[1]], [480, yT[2]], [xT, yT[2]]]); sch.w(swG, [[380, yT[2]], [430, yT[2]], [480, yT[1]], [xT, yT[1]]]); }
      else { sch.w(swG, [[380, yT[1]], [xT, yT[1]]]); sch.w(swG, [[380, yT[2]], [xT, yT[2]]]); }
      tSrc.textContent = S.d1src === 'A' ? 'Source A (label: abc)' : 'Source X (sequence unknown)';
      const V = src3(S.d1Vp, effSeq());
      sc.draw({ f: V.map((z) => sig(z, w())), w: w(), trig: cang(V[0]), rms: V.map(cabs) });
      // gösterge
      if (S.d1lamp && S.d1Vp > 0) {
        const R = 1000, Zc = cx(0, -1 / (2 * Math.PI * 50 * 1e-6 * 3.183));
        const r = solveYY(V, [cx(0), cx(0), cx(0)], [Zc, cx(R), cx(R)], null);
        [1, 2].forEach((k, j) => lampG[j].setAttribute('opacity', clamp(Math.pow(cabs(r.VL[k]) / 400, 2), 0, 1).toFixed(3)));
        if (S.d1Vp >= 50) { if (S.d1src === 'A') flag('lampA'); else { flag('lampX'); if (effSeq() === 'abc') flag('lampXabc'); } }
      } else lampG.forEach((l) => l.setAttribute('opacity', 0));
    }
    const T = table('d1tab', 'd1rows', (r) => [r.src === 'A' ? 'A' : 'X', r.sw ? 'yes' : '—', num(r.Vp, 0), r.f, num(r.dt * 1e3, 3), num(r.va, 1), num(r.vb, 1)],
      'hafta12_deney1.csv', ['source', 'b-c swapped', 'Vphi (V)', 'f (Hz)', 'dt (ms)', 'v_a(A) (V)', 'v_b(B) (V)'], (r) => [r.src, r.sw ? 1 : 0, r.Vp, r.f, +(r.dt * 1e3).toFixed(4), +r.va.toFixed(2), +r.vb.toFixed(2)]);
    function rec() {
      if (!sc.cur.on) return Lab.toast('First turn on CURSOR: put A on a v<sub>an</sub> peak and B on a v<sub>bn</sub> peak.');
      const pk = Math.SQRT2 * S.d1Vp, va = sc.val(0, sc.cur.a), vb = sc.val(1, sc.cur.b);
      const ok = S.d1Vp > 0 && va > 0.97 * pk && vb > 0.97 * pk;
      S.d1rows.push({ src: S.d1src, sw: S.d1sw, seq: effSeq(), Vp: S.d1Vp, f: S.d1f, dt: sc.curDt(), va, vb, ok }); save(); T.draw();
      Lab.toast(ok ? 'Recorded: Δt = ' + eng(sc.curDt(), 's') : 'Recorded, but the cursors are not exactly on the peaks: A → CH1 peak, B → CH2 peak.');
    }
    $('#d1rec').onclick = rec; $('#d1del').onclick = () => { S.d1rows.pop(); save(); T.draw(); }; $('#d1csv').onclick = T.csv; T.draw();
    st.update = update; st.rec = rec; st.sc = sc; st.effSeq = effSeq;
    return st;
  })();
  XP.d1 = D1;
  const d1good = (r) => { if (!r.ok) return false; const T = 1 / r.f, x = ((r.dt % T) + T) % T; return near(x, T / 3, 0.03 * T) || near(x, 2 * T / 3, 0.03 * T); };
  steps('d1', [
    { t: 'Select <b>Source A</b> and set V<sub>φ</sub> to <b>at least 100 V</b>; with all three channels on, see the three sine waves. Set V/div and TIME/div so that at least one period fits.', test: () => S.d1src === 'A' && S.d1Vp >= 100 && D1.sc.chs.every((c) => c.on) && D1.sc.tdiv * 10 >= 1 / S.d1f },
    { t: 'Put CURSOR A on a <b>v<sub>an</sub> peak</b> and B on the first <b>v<sub>bn</sub> peak</b> after it, then record (R).', test: () => S.d1rows.some((r) => r.src === 'A' && !r.sw && d1good(r)) },
    { t: 'Connect the <b>phase-sequence indicator</b> to Source A (V<sub>φ</sub> ≥ 50 V). Which lamp is brighter?', test: () => !!S.fl.lampA },
    { t: 'Switch to <b>Source X</b>; make and record the same Δt measurement with the oscilloscope, and connect the indicator too.', test: () => S.d1rows.some((r) => r.src === 'X' && d1good(r)) && !!S.fl.lampX },
    { t: 'If necessary, swap the <b>b ↔ c</b> cables to bring Source X to the <b>abc</b> sequence and verify with the indicator.', test: () => !!S.fl.lampXabc && S.d1src === 'X' && D1.effSeq() === 'abc' },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: 'Source A, 50 Hz: what Δt (ms) did you measure from a v<sub>an</sub> peak to the first following v<sub>bn</sub> peak?', answer: 20 / 3, tol: 3, unit: 'ms', explain: 'T = 20 ms; 120° ⇒ T/3 = 6.67 ms.', hint: 'The Δt in the table; make sure you measured at 50 Hz.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'What phase difference (degrees) corresponds to this Δt?', answer: 120, tol: 2, unit: '°', explain: 'θ = 360°·Δt/T = 360·6.67/20 = 120°.', hint: 'θ = 360°·Δt·f' });
  mcq('d1', '#d1Q', { id: 'd1q3', q: 'What is the phase sequence of Source X (cables not swapped)?', opts: ['abc (positive sequence)', 'acb (negative sequence)'], correct: S.seqX === 'abc' ? 0 : 1, explain: 'Your measurement is correct: if b peaks T/3 after a it is abc; if c peaks (b’s peak comes 2T/3 later) it is acb.', hint: 'After the a peak, does b or c peak first? Compare the indicator lamps with Source A.' });
  mcq('d1', '#d1Q', { id: 'd1q4', q: 'With the capacitor on phase a, which lamp was brighter in the <b>abc</b> sequence?', opts: ['The lamp on phase b (L1)', 'The lamp on phase c (L2)', 'Both equally bright'], correct: 0, explain: 'With X<sub>C</sub> = R the star point shifts: V<sub>L1</sub> ≈ 1.5V<sub>φ</sub>, V<sub>L2</sub> ≈ 0.4V<sub>φ</sub>. When the sequence is acb the brightnesses swap: that is the indicator.', hint: 'Observe with Source A.' });
  numq('d1', '#d1Q', { id: 'd1q5', q: 'Example 3.3: abc, v<sub>b</sub>(t) = 311cos(314t − 110°) V. What is v<sub>a</sub> (V) at t = 0?', answer: 311 * Math.cos(10 * D2R), tol: 0.5, unit: 'V', explain: 'In abc, a leads b by 120°: θ<sub>a</sub> = −110° + 120° = +10°; v<sub>a</sub>(0) = 311cos10° = 306.3 V.', hint: 'First find the angle of v<sub>a</sub>.' });
  numq('d1', '#d1Q', { id: 'd1q6', q: 'In the same example, what is the sum (V) of the three voltages at t = 0?', answer: 0, tol: 0, abs: 0.5, unit: 'V', explain: 'In a balanced system v<sub>a</sub> + v<sub>b</sub> + v<sub>c</sub> = 0 holds at every instant (306.3 − 106.4 − 199.9 = 0).', hint: 'Balanced three-phase.' });

  /* ================= DENEY 2 · Faz ve hat gerilimleri ================= */
  const D2 = (() => {
    const st = { dirty: true };
    def('d2Vp', 230); def('d2seq', 'abc'); def('d2p', 'a'); def('d2m', 'n'); def('d2c1', 'an'); def('d2c2', 'ab');
    const box = $('#d2inst');
    const gen = inst(box, 'THREE-PHASE SOURCE · 50 Hz');
    new Lab.Knob(gen.c, { label: 'V_φ', min: 0, max: 230, step: 5, value: S.d2Vp, dark: true, size: 54, fmt: (v) => num(v, 0) + ' V', onChange: (v) => { S.d2Vp = v; save(); st.dirty = true; } });
    toggle2(gen.c, 'abc', 'acb', S.d2seq === 'acb', (v) => { S.d2seq = v ? 'acb' : 'abc'; save(); st.dirty = true; });
    const dm = inst(box, 'TRUE-RMS DMM · V~ 750 V', false); const dL = lcd(dm.el, 'V AC (rms)', 'V', 140);
    const P4 = [['a', 'a'], ['b', 'b'], ['c', 'c'], ['n', 'n']];
    selBox(dm.c, '+ (red) lead', P4, S.d2p, (v) => { S.d2p = v; save(); st.dirty = true; });
    selBox(dm.c, '− (COM) lead', P4, S.d2m, (v) => { S.d2m = v; save(); st.dirty = true; });
    const pr = inst(box, 'PROBE SELECTION', false);
    const PR = ['an', 'bn', 'cn', 'ab', 'bc', 'ca'].map((p) => [p, 'v<sub>' + p + '</sub>']);
    selBox(pr.c, 'CH1', PR, S.d2c1, (v) => { S.d2c1 = v; save(); st.dirty = true; });
    selBox(pr.c, 'CH2', PR, S.d2c2, (v) => { S.d2c2 = v; save(); st.dirty = true; });
    const sc = mkOsc($('#d2scope'), { chs: [{ n: 'CH1', c: PHs[0] }, { n: 'CH2', c: PHs[1] }], groups: [{ l: 'V/div', v: 100, u: 'V' }], t: 2e-3 });
    const w = 2 * Math.PI * 50;
    const pt = (V, p) => (p === 'n' ? cx(0) : V['abc'.indexOf(p)]);
    const pair = (V, s) => csub(pt(V, s[0]), pt(V, s[1]));
    function update() {
      if (!st.dirty && !(st.sc && st.sc.dirty)) return; st.dirty = false; if (st.sc) st.sc.dirty = false;
      const V = src3(S.d2Vp, S.d2seq), Vm = pair(V, S.d2p + S.d2m);
      dL(num(cabs(Vm), 1));
      const Z1 = pair(V, S.d2c1), Z2 = pair(V, S.d2c2);
      sc.draw({ f: [sig(Z1, w), sig(Z2, w)], w, trig: cang(Z1), rms: [cabs(Z1), cabs(Z2)], names: ['v_' + S.d2c1, 'v_' + S.d2c2] });
      const it = V.map((z, k) => ({ z, c: PH[k], l: 'V' + 'abc'[k] + 'n' }));
      if (S.d2p !== S.d2m) it.push({ z: Vm, o: pt(V, S.d2m), c: '#e07a10', dash: '6 4', l: 'DMM' });
      phasors($('#d2ph'), it, { max: S.d2Vp * 1.05 || 1 });
    }
    const T = table('d2tab', 'd2rows', (r) => [r.seq, num(r.Vp, 0), r.p, num(r.Vm, 1), 'v<sub>' + r.c1 + '</sub>/v<sub>' + r.c2 + '</sub>', r.dt == null ? '—' : num(r.dt * 1e3, 3)],
      'hafta12_deney2.csv', ['sequence', 'Vphi (V)', 'DMM leads', 'V (V)', 'CH1/CH2', 'dt (ms)'], (r) => [r.seq, r.Vp, r.p, +r.Vm.toFixed(2), r.c1 + '/' + r.c2, r.dt == null ? '' : +(r.dt * 1e3).toFixed(4)]);
    function rec() {
      const V = src3(S.d2Vp, S.d2seq), Z1 = pair(V, S.d2c1), Z2 = pair(V, S.d2c2);
      let dt = null, ok = false;
      if (sc.cur.on) { dt = sc.curDt(); ok = S.d2Vp > 0 && sc.val(0, sc.cur.a) > 0.97 * Math.SQRT2 * cabs(Z1) && curPhaseOK(sc, Z1, Z2, w); }
      S.d2rows.push({ seq: S.d2seq, Vp: S.d2Vp, p: S.d2p + '–' + S.d2m, Vm: cabs(pair(V, S.d2p + S.d2m)), c1: S.d2c1, c2: S.d2c2, dt, ok }); save(); T.draw();
      Lab.toast('Recorded: DMM ' + num(cabs(pair(V, S.d2p + S.d2m)), 1) + ' V' + (dt != null ? ', Δt = ' + eng(dt, 's') + (ok ? '' : ' (cursors not on peaks)') : ''));
    }
    $('#d2rec').onclick = rec; $('#d2del').onclick = () => { S.d2rows.pop(); save(); T.draw(); }; $('#d2csv').onclick = T.csv; T.draw();
    st.update = update; st.rec = rec; st.sc = sc;
    return st;
  })();
  XP.d2 = D2;
  const hasP = (r, a, b) => r.p === a + '–' + b || r.p === b + '–' + a;
  steps('d2', [
    { t: 'V<sub>φ</sub> = <b>230 V</b>, sequence <b>abc</b>. Connect the DMM between <b>a–n</b> and record (R).', test: () => S.d2rows.some((r) => r.Vp === 230 && hasP(r, 'a', 'n')) },
    { t: 'Move the DMM to <b>a–b</b> and record. What is the ratio V<sub>ab</sub>/V<sub>an</sub>?', test: () => S.d2rows.some((r) => r.Vp === 230 && hasP(r, 'a', 'b')) },
    { t: 'Also record the <b>b–c</b> and <b>c–a</b> voltages: are all three equal?', test: () => S.d2rows.some((r) => r.Vp === 230 && hasP(r, 'b', 'c')) && S.d2rows.some((r) => r.Vp === 230 && hasP(r, 'c', 'a')) },
    { t: 'CH1 = v<sub>an</sub>, CH2 = v<sub>ab</sub> (abc). Put CURSOR A on a v<sub>an</sub> peak and B on the <b>nearest</b> v<sub>ab</sub> peak, then record.', test: () => S.d2rows.some((r) => r.seq === 'abc' && r.c1 === 'an' && r.c2 === 'ab' && r.ok) },
    { t: 'Set the sequence to <b>acb</b> and repeat the same measurement: is v<sub>ab</sub> leading or lagging this time?', test: () => S.d2rows.some((r) => r.seq === 'acb' && r.c1 === 'an' && r.c2 === 'ab' && r.ok) },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'What V<sub>ab</sub> (V) did you measure at V<sub>φ</sub> = 230 V?', answer: 230 * Math.sqrt(3), tol: 0.5, unit: 'V', explain: '√3·230 = 398.4 V.', hint: 'The DMM a–b reading.' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'From your measurements, what is the ratio V<sub>L</sub>/V<sub>φ</sub>?', answer: Math.sqrt(3), tol: 0.5, unit: '', explain: 'The ratio is √3 = 1.732: the difference of two equal phasors 120° apart.', hint: 'V<sub>ab</sub>/V<sub>an</sub>' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 'What Δt (ms) did you measure in abc (from a v<sub>an</sub> peak to the nearest v<sub>ab</sub> peak, with sign)?', answer: -20 / 12, tol: 4, unit: 'ms', explain: 'The v<sub>ab</sub> peak comes before v<sub>an</sub> by 1.67 ms: Δt = −1.67 ms ⇒ 30° leading.', hint: 'If B is to the left of A, Δt is negative.' });
  mcq('d2', '#d2Q', { id: 'd2q4', q: 'In the abc sequence, relative to v<sub>an</sub>, v<sub>ab</sub> is:', opts: ['30° leading', '30° lagging', '120° leading', 'In phase'], correct: 0, explain: 'V<sub>ab</sub> = √3 V<sub>an</sub>∠+30° (abc).', hint: 'The one whose peak comes first is leading.' });
  mcq('d2', '#d2Q', { id: 'd2q5', q: 'In the acb sequence, relative to v<sub>an</sub>, v<sub>ab</sub> is:', opts: ['30° leading', '30° lagging', '90° lagging', 'In phase'], correct: 1, explain: 'In acb, V<sub>ab</sub> = √3 V<sub>an</sub>∠−30°. A common mistake in the slides: writing +30° for the negative sequence.', hint: 'The sign of Δt in your acb measurement.' });
  numq('d2', '#d2Q', { id: 'd2q6', q: 'Example 3.6: V<sub>an</sub> = 220∠0° V (abc). What is the angle (degrees) of V<sub>bc</sub>?', answer: -90, tol: 0, abs: 1, unit: '°', explain: 'V<sub>bc</sub> = √3·220∠(−120° + 30°) = 381∠−90° V.', hint: 'V<sub>bc</sub> = √3 V<sub>bn</sub>∠+30°' });

  /* ================= DENEY 3 · Dengeli Y–Y ve tek-faz eşdeğer ================= */
  const Zg0 = cx(0.2, 0.5), Zl0 = cx(0.8, 1.5);
  const D3 = (() => {
    const st = { dirty: true };
    def('d3Vp', 120); def('d3R', 20); def('d3X', 0); def('d3zg', true); def('d3zl', true); def('d3neu', true); def('d3vp', 'AN'); def('d3c1', 'ea');
    const box = $('#d3inst');
    const gen = inst(box, 'GENERATOR (Z<sub>g</sub> = 0.2 + j0.5 Ω/phase)');
    new Lab.Knob(gen.c, { label: 'E_φ', min: 0, max: 240, step: 1, value: S.d3Vp, dark: true, size: 50, fmt: (v) => num(v, 0) + ' V', onChange: (v) => { S.d3Vp = v; save(); st.dirty = true; } });
    const ld = inst(box, 'LOAD BOX · all phases equal', false);
    new Lab.Knob(ld.c, { label: 'R', min: 1, max: 100, step: 0.5, value: S.d3R, size: 50, fmt: (v) => num(v, 1) + ' Ω', onChange: (v) => { S.d3R = v; save(); st.dirty = true; } });
    new Lab.Knob(ld.c, { label: 'X', min: -60, max: 60, step: 0.5, value: S.d3X, size: 50, fmt: (v) => num(v, 1) + ' Ω', onChange: (v) => { S.d3X = v; save(); st.dirty = true; } });
    const sw = inst(box, 'SWITCHES', false);
    toggle2(sw.c, 'Z<sub>g</sub> off', 'Z<sub>g</sub> on', S.d3zg, (v) => { S.d3zg = v; save(); st.dirty = true; });
    toggle2(sw.c, 'No line', 'Line 0.8+j1.5', S.d3zl, (v) => { S.d3zl = v; save(); st.dirty = true; });
    toggle2(sw.c, 'Neutral open', 'Neutral connected', S.d3neu, (v) => { S.d3neu = v; save(); st.dirty = true; });
    const am = inst(box, 'CLAMP AMMETERS (rms)');
    const aL = ['I<sub>aA</sub>', 'I<sub>bB</sub>', 'I<sub>cC</sub>', 'I<sub>0</sub> (neutral)'].map((l) => lcd(am.el, l, 'A', 105));
    const vm = inst(box, 'VOLTMETER (rms)', false); const vL = lcd(vm.el, 'V', 'V', 120);
    selBox(vm.c, 'Measurement point', [['AN', 'load phase: A–N'], ['AB', 'load line: A–B'], ['an', 'generator terminal: a–n'], ['ab', 'generator terminal: a–b'], ['Nn', 'neutral shift: N–n']], S.d3vp, (v) => { S.d3vp = v; save(); st.dirty = true; });
    const pr = inst(box, 'OSCILLOSCOPE PROBES', false);
    selBox(pr.c, 'CH1 (voltage)', [['ea', 'e<sub>a</sub> (generator reference output)'], ['AN', 'v<sub>AN</sub> (load)']], S.d3c1, (v) => { S.d3c1 = v; save(); st.dirty = true; });
    const sc = mkOsc($('#d3scope'), { chs: [{ n: 'CH1', c: PHs[0] }, { n: 'i_aA', c: '#7ee08a', g: 1 }], groups: [{ l: 'V/div', v: 50, u: 'V' }, { l: 'A/div', v: 1, u: 'A', list: [0.1, 0.2, 0.5, 1, 2, 5, 10] }], t: 2e-3 });
    // şema
    const g = $('#d3sch'), yy = [40, 100, 160], yN = 230;
    sch.t(g, 50, 20, 'Generator', 'lbl');
    yy.forEach((y, k) => {
      sch.src(g, 50, y, 15); sch.w(g, [[35, y], [20, y], [20, yN]]); sch.t(g, 50, y + 30, 'e' + 'abc'[k], 'lbl').style.fontSize = '11px';
      sch.w(g, [[65, y], [80, y]]); sch.zH(g, 80, 140, y); sch.w(g, [[140, y], [200, y]]); sch.term(g, 200, y); sch.t(g, 200, y - 10, 'abc'[k], 'lbl');
      sch.w(g, [[200, y], [250, y]]); sch.zH(g, 250, 340, y); sch.w(g, [[340, y], [430, y]]); sch.t(g, 430, y - 10, 'ABC'[k], 'lbl');
      sch.w(g, [[430, y], [500, y]]); sch.zH(g, 500, 580, y); sch.w(g, [[580, y], [620, y], [620, yN - 30]]);
      sch.meter(g, 395, y, 'A');
    });
    sch.t(g, 110, 25, 'Z<tspan font-size="10">g</tspan>', 'lbl'); sch.t(g, 295, 25, 'Z<tspan font-size="10">ℓ</tspan> (line)', 'lbl'); const tZ = sch.t(g, 540, 25, '', 'lbl');
    sch.w(g, [[620, yN - 30], [620, yN]]); sch.dot(g, 620, yN - 30); sch.t(g, 640, yN - 26, 'N', 'val', 'start');
    sch.w(g, [[20, yN], [300, yN]]); const swN = sch.sw(g, 300, 340, yN); sch.w(g, [[340, yN], [620, yN]]); sch.meter(g, 450, yN, 'A'); sch.t(g, 20, yN + 22, 'n', 'val');
    const tNeu = sch.t(g, 320, yN + 24, '', 'lbl'), tZg = sch.t(g, 110, 195, '', 'lbl'), tZl = sch.t(g, 295, 195, '', 'lbl');
    const w = 2 * Math.PI * 50;
    let R = null;
    const solve = () => {
      const Vs = src3(S.d3Vp, 'abc'), Zs = cadd(S.d3zg ? Zg0 : cx(0), S.d3zl ? Zl0 : cx(0)), ZL = cx(S.d3R, S.d3X);
      const r = solveYY(Vs, [Zs, Zs, Zs], [ZL, ZL, ZL], S.d3neu ? cx(1e-3) : null);
      r.Vs = Vs; r.Vg = r.I.map((i, k) => csub(Vs[k], cmul(S.d3zg ? Zg0 : cx(0), i)));
      return r;
    };
    const vpt = (r, p) => ({ AN: r.VL[0], AB: csub(r.VT[0], r.VT[1]), an: r.Vg[0], ab: csub(r.Vg[0], r.Vg[1]), Nn: r.VN }[p]);
    function update() {
      if (!st.dirty && !(st.sc && st.sc.dirty)) return; st.dirty = false; if (st.sc) st.sc.dirty = false;
      R = solve();
      R.I.forEach((i, k) => aL[k](num(cabs(i), 3))); aL[3](num(cabs(R.I0), 3));
      vL(num(cabs(vpt(R, S.d3vp)), 2));
      swN(S.d3neu); tNeu.textContent = S.d3neu ? 'neutral connected' : 'neutral OPEN';
      tZ.textContent = 'Z = ' + num(S.d3R, 1) + (S.d3X >= 0 ? ' + j' : ' − j') + num(Math.abs(S.d3X), 1) + ' Ω';
      tZg.textContent = S.d3zg ? '' : '(bypassed)'; tZl.textContent = S.d3zl ? '' : '(bypassed)';
      const Z1 = S.d3c1 === 'ea' ? R.Vs[0] : R.VL[0];
      sc.draw({ f: [sig(Z1, w), sig(R.I[0], w)], w, trig: cang(Z1), rms: [cabs(Z1), cabs(R.I[0])], names: [S.d3c1 === 'ea' ? 'e_a' : 'v_AN', 'i_aA'] });
      const mV = Math.max(1, ...R.VL.map(cabs)), mI = Math.max(1e-6, ...R.I.map(cabs)), k = 0.7 * mV / mI;
      const it = R.VL.map((z, q) => ({ z, c: PH[q], l: 'V' + 'ABC'[q] + 'N' }));
      R.I.forEach((z, q) => it.push({ z: csc(z, k), c: PH[q], dash: '5 3', w: 2, l: 'I' + 'abc'[q] }));
      if (cabs(R.I0) > 1e-3 * mI) it.push({ z: csc(R.I0, k), c: '#333', dash: '2 2', l: 'I0' });
      phasors($('#d3ph'), it, { max: mV * 1.05 });
    }
    const T = table('d3tab', 'd3rows', (r) => [num(r.Vp, 0), num(r.R, 1) + (r.X >= 0 ? '+j' : '−j') + num(Math.abs(r.X), 1), (r.zg ? 'Z<sub>g</sub> ' : '') + (r.zl ? 'Z<sub>ℓ</sub>' : ''), r.neu ? 'connected' : 'open', num(r.Ia, 3), num(r.Ib, 3), num(r.Ic, 3), num(r.I0, 3), r.vp, num(r.Vm, 2), r.dt == null ? '—' : num(r.dt * 1e3, 3)],
      'hafta12_deney3.csv', ['Vphi', 'R', 'X', 'Zg', 'Zl', 'neutral', 'IaA', 'IbB', 'IcC', 'I0', 'V point', 'V (V)', 'dt (ms)'], (r) => [r.Vp, r.R, r.X, r.zg ? 1 : 0, r.zl ? 1 : 0, r.neu ? 1 : 0, +r.Ia.toFixed(4), +r.Ib.toFixed(4), +r.Ic.toFixed(4), +r.I0.toFixed(4), r.vp, +r.Vm.toFixed(3), r.dt == null ? '' : +(r.dt * 1e3).toFixed(4)]);
    function rec() {
      const r = solve(); let dt = null, ok = false;
      const Z1 = S.d3c1 === 'ea' ? r.Vs[0] : r.VL[0];
      if (sc.cur.on) { dt = sc.curDt(); ok = sc.val(0, sc.cur.a) > 0.97 * Math.SQRT2 * cabs(Z1) && curPhaseOK(sc, Z1, r.I[0], w); }
      S.d3rows.push({ Vp: S.d3Vp, R: S.d3R, X: S.d3X, zg: S.d3zg, zl: S.d3zl, neu: S.d3neu, Ia: cabs(r.I[0]), Ib: cabs(r.I[1]), Ic: cabs(r.I[2]), I0: cabs(r.I0), vp: S.d3vp, Vm: cabs(vpt(r, S.d3vp)), c1: S.d3c1, dt, ok }); save(); T.draw();
      Lab.toast('Recorded: I<sub>aA</sub> = ' + num(cabs(r.I[0]), 3) + ' A');
    }
    $('#d3rec').onclick = rec; $('#d3del').onclick = () => { S.d3rows.pop(); save(); T.draw(); }; $('#d3csv').onclick = T.csv; T.draw();
    st.update = update; st.rec = rec; st.sc = sc;
    return st;
  })();
  XP.d3 = D3;
  const ex311 = (r) => r.Vp === 120 && r.R === 39 && r.X === 28 && r.zg && r.zl;
  steps('d3', [
    { t: 'Set up <b>Example 3.11</b>: E<sub>φ</sub> = 120 V, load <b>39 + j28 Ω</b>, Z<sub>g</sub> and line impedance in circuit, neutral connected.', test: () => ex311({ Vp: S.d3Vp, R: S.d3R, X: S.d3X, zg: S.d3zg, zl: S.d3zl }) && S.d3neu },
    { t: 'Record the readings of the four clamp ammeters (R). How large is the neutral current?', test: () => S.d3rows.some((r) => ex311(r) && r.neu) },
    { t: '<b>Open the neutral</b> and record again. Did the line currents change?', test: () => S.d3rows.some((r) => ex311(r) && !r.neu) },
    { t: 'Set the voltmeter to the <b>load phase</b> (A–N) voltage and record; compare with the generator terminal (a–n).', test: () => S.d3rows.some((r) => ex311(r) && r.vp === 'AN') && S.d3rows.some((r) => ex311(r) && r.vp === 'an') },
    { t: 'Set the voltmeter to the <b>load line</b> (A–B) voltage and record.', test: () => S.d3rows.some((r) => ex311(r) && r.vp === 'AB') },
    { t: 'CH1 = e<sub>a</sub>, CH2 = i<sub>aA</sub>: put CURSOR A on an e<sub>a</sub> peak and B on the nearest i<sub>aA</sub> peak, then record.', test: () => S.d3rows.some((r) => ex311(r) && r.c1 === 'ea' && r.ok) },
  ]);
  numq('d3', '#d3Q', { id: 'd3q1', q: 'Example 3.11: what |I<sub>aA</sub>| (A) did you measure? First calculate it with the single-phase equivalent circuit, then compare.', answer: 2.4, tol: 1, unit: 'A', explain: 'Z<sub>total</sub> = (0.2+0.8+39) + j(0.5+1.5+28) = 40 + j30 = 50∠36.87° Ω; I<sub>aA</sub> = 120/50 = 2.4 A.', hint: 'Phase a: E / (Z<sub>g</sub> + Z<sub>ℓ</sub> + Z).' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'According to your oscilloscope measurement, by how many degrees does i<sub>aA</sub> lag e<sub>a</sub>?', answer: 36.87, tol: 4, unit: '°', explain: '∠Z<sub>total</sub> = arctan(30/40) = 36.87°. Δt ≈ 2.05 ms ⇒ 360·2.05/20 ≈ 36.9°.', hint: 'θ = 360°·|Δt|/T' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'What is the load phase voltage |V<sub>AN</sub>| (V)?', answer: 115.22, tol: 0.6, unit: 'V', explain: 'V<sub>AN</sub> = (39+j28)·2.4∠−36.87° = 115.22∠−1.19° V. The source had 120 V: the difference dropped across the line and internal impedance.', hint: 'Voltmeter A–N.' });
  numq('d3', '#d3Q', { id: 'd3q4', q: 'What is the load line voltage |V<sub>AB</sub>| (V)?', answer: 115.22 * Math.sqrt(3), tol: 0.6, unit: 'V', explain: '√3·115.22 = 199.58 V; its angle is −1.19° + 30° = 28.81°.', hint: 'Voltmeter A–B.' });
  numq('d3', '#d3Q', { id: 'd3q5', q: 'What is the generator terminal voltage |V<sub>an</sub>| (V)?', answer: 118.9, tol: 0.5, unit: 'V', explain: 'V<sub>an</sub> = 120 − (0.2+j0.5)·I<sub>aA</sub> = 118.90∠−0.32° V.', hint: 'Subtract the drop across the internal impedance.' });
  mcq('d3', '#d3Q', { id: 'd3q6', q: 'What happened when the neutral was opened in the balanced Y–Y? (Example 3.8: “whatever Z<sub>0</sub> is”)', opts: ['The line currents increased', 'No current or voltage changed; V<sub>N</sub> = 0 and I<sub>0</sub> = 0', 'The load voltages increased by a factor of √3', 'The neutral voltage became V<sub>φ</sub>'], correct: 1, explain: 'In a balanced circuit V<sub>N</sub> = Σ(V<sub>i</sub>Y)/(3Y + Y<sub>0</sub>) = 0, because ΣV<sub>i</sub> = 0. That is why solving phase a on its own (single-phase equivalent) is sufficient.', hint: 'Compare the ammeter readings.' });

  /* ================= DENEY 4 · Dengesiz yük ve nötr kopması ================= */
  const D4 = (() => {
    const st = { dirty: true };
    def('d4Vp', 120); def('d4R', [20, 20, 10]); def('d4neu', true);
    const box = $('#d4inst');
    const gen = inst(box, 'THREE-PHASE SOURCE · abc · 50 Hz');
    new Lab.Knob(gen.c, { label: 'V_φ', min: 0, max: 230, step: 1, value: S.d4Vp, dark: true, size: 50, fmt: (v) => num(v, 0) + ' V', onChange: (v) => { S.d4Vp = v; save(); st.dirty = true; } });
    toggle2(gen.c, 'Neutral BROKEN', 'Neutral connected', S.d4neu, (v) => { S.d4neu = v; save(); st.dirty = true; });
    const ld = inst(box, 'THREE SEPARATE RESISTIVE LOADS (Y)', false);
    const RL = [5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100, 150, 200];
    ['R_A', 'R_B', 'R_C'].forEach((l, k) => new Lab.Knob(ld.c, { label: l, list: RL, value: S.d4R[k], size: 46, fmt: (v) => v + ' Ω', onChange: (v) => { S.d4R[k] = v; save(); st.dirty = true; } }));
    const vm = inst(box, 'VOLTMETERS (across load, rms)');
    const vL = ['V<sub>AN′</sub>', 'V<sub>BN′</sub>', 'V<sub>CN′</sub>', 'V<sub>N′n</sub> (shift)'].map((l) => lcd(vm.el, l, 'V', 100));
    const am = inst(box, 'CLAMP AMMETERS (rms)', false);
    const aL = ['I<sub>aA</sub>', 'I<sub>bB</sub>', 'I<sub>cC</sub>', 'I<sub>0</sub>'].map((l) => lcd(am.el, l, 'A', 90));
    // şema: kaynak yıldızı, yük yıldızı (lambalar), nötr anahtarı
    const g = $('#d4sch'), yy = [50, 110, 170], yN = 240, glow = [], ovT = [];
    yy.forEach((y, k) => {
      sch.src(g, 60, y, 15); sch.w(g, [[45, y], [25, y], [25, yN]]); sch.t(g, 60, y - 22, 'v' + 'abc'[k] + 'n', 'lbl').style.fontSize = '11px';
      sch.w(g, [[75, y], [400, y]]); sch.meter(g, 200, y, 'A'); sch.t(g, 400, y - 10, 'ABC'[k], 'lbl');
      glow.push(E('circle', { cx: 450, cy: y, r: 22, fill: '#ffd34d', opacity: 0 }, g));
      sch.zH(g, 400, 500, y); sch.w(g, [[500, y], [560, y], [560, yN - 40]]);
      ovT.push(sch.t(g, 450, y + 26, '', 'lbl')); ovT[k].style.fill = '#c62828'; ovT[k].style.fontSize = '11px'; ovT[k].style.fontWeight = 700;
    });
    sch.dot(g, 560, yN - 40); sch.t(g, 575, yN - 36, 'N′', 'val', 'start');
    sch.w(g, [[560, yN - 40], [560, yN], [420, yN]]); const swN = sch.sw(g, 380, 420, yN); sch.w(g, [[380, yN], [25, yN]]); sch.meter(g, 200, yN, 'A'); sch.t(g, 25, yN + 22, 'n', 'val');
    const tN = sch.t(g, 400, yN + 24, '', 'lbl'), tR = yy.map((y) => sch.t(g, 450, y - 14, '', 'lbl'));
    const plot = new Lab.Plot($('#d4plot'), { xlabel: 'R_A  (Ω)  (neutral broken, R_B and R_C fixed)', ylabel: 'V_phase / V_φ' });
    let R = null;
    const solve = (Rv = S.d4R, neu = S.d4neu, Vp = S.d4Vp) => solveYY(src3(Vp, 'abc'), [cx(0), cx(0), cx(0)], Rv.map((r) => cx(r)), neu ? cx(1e-3) : null);
    function drawPlot() {
      const rows = S.d4rows.filter((r) => !r.neu && r.RB === S.d4R[1] && r.RC === S.d4R[2] && r.Vp > 0), ser = [];
      if ($('#d4theo').checked) {
        [0, 1, 2].forEach((k) => { const pts = []; for (let i = 0; i <= 60; i++) { const ra = 5 * Math.pow(40, i / 60); const r = solve([ra, S.d4R[1], S.d4R[2]], false, 1); pts.push([ra, cabs(r.VL[k])]); } ser.push({ pts, line: true, color: PH[k], dash: [6, 4] }); });
      }
      [0, 1, 2].forEach((k) => ser.push({ pts: rows.map((r) => [r.RA, [r.VA, r.VB, r.VC][k] / r.Vp]), dots: true, color: PH[k] }));
      plot.draw(ser, [0, 200], [0, 1.8]);
    }
    $('#d4theo').onchange = () => { if ($('#d4theo').checked) flag('d4theo'); drawPlot(); };
    function update() {
      if (!st.dirty && !(st.sc && st.sc.dirty)) return; st.dirty = false; if (st.sc) st.sc.dirty = false;
      R = solve();
      R.VL.forEach((v, k) => { vL[k](num(cabs(v), 1)); const ratio = S.d4Vp ? cabs(v) / S.d4Vp : 0; glow[k].setAttribute('opacity', clamp(0.15 + 0.5 * ratio * ratio, 0, 1) * (S.d4Vp ? 1 : 0)); ovT[k].textContent = ratio > 1.1 ? '⚠ OVERVOLTAGE' : ratio < 0.85 && S.d4Vp ? 'undervoltage' : ''; ovT[k].style.fill = ratio > 1.1 ? '#c62828' : '#b26a00'; tR[k].textContent = 'R' + 'ABC'[k] + ' = ' + S.d4R[k] + ' Ω'; });
      vL[3](num(cabs(R.VN), 1));
      R.I.forEach((i, k) => aL[k](num(cabs(i), 2))); aL[3](num(cabs(R.I0), 2));
      swN(S.d4neu); tN.textContent = S.d4neu ? 'neutral connected' : 'neutral BROKEN';
      const Vs = src3(S.d4Vp, 'abc');
      const it = Vs.map((z, k) => ({ z, c: '#bbb', w: 1.5, l: 'abc'[k] }));
      R.VL.forEach((z, k) => it.push({ z, o: R.VN, c: PH[k], l: 'V' + 'ABC'[k] + 'N′' }));
      phasors($('#d4ph'), it, { max: Math.max(1, S.d4Vp) * 1.6, pts: [{ z: cx(0), l: 'n' }, { z: R.VN, l: 'N′', c: '#c62828' }] });
      drawPlot();
    }
    const T = table('d4tab', 'd4rows', (r) => [num(r.Vp, 0), r.RA, r.RB, r.RC, r.neu ? 'connected' : 'broken', num(r.VA, 1), num(r.VB, 1), num(r.VC, 1), num(r.VN, 1), num(r.I0, 2)],
      'hafta12_deney4.csv', ['Vphi', 'RA', 'RB', 'RC', 'neutral', 'VAN', 'VBN', 'VCN', 'VNn', 'I0'], (r) => [r.Vp, r.RA, r.RB, r.RC, r.neu ? 1 : 0, +r.VA.toFixed(2), +r.VB.toFixed(2), +r.VC.toFixed(2), +r.VN.toFixed(2), +r.I0.toFixed(3)]);
    function rec() {
      const r = solve();
      S.d4rows.push({ Vp: S.d4Vp, RA: S.d4R[0], RB: S.d4R[1], RC: S.d4R[2], neu: S.d4neu, VA: cabs(r.VL[0]), VB: cabs(r.VL[1]), VC: cabs(r.VL[2]), VN: cabs(r.VN), I0: cabs(r.I0) }); save(); T.draw(); drawPlot();
      Lab.toast('Recorded: V<sub>N′n</sub> = ' + num(cabs(r.VN), 1) + ' V');
    }
    $('#d4rec').onclick = rec; $('#d4del').onclick = () => { S.d4rows.pop(); save(); T.draw(); drawPlot(); }; $('#d4csv').onclick = T.csv; T.draw();
    st.update = update; st.rec = rec;
    return st;
  })();
  XP.d4 = D4;
  const ex39 = (r) => r.Vp === 120 && r.RA === 20 && r.RB === 20 && r.RC === 10;
  steps('d4', [
    { t: '<b>Example 3.9</b>: V<sub>φ</sub> = 120 V, R<sub>A</sub> = R<sub>B</sub> = 20 Ω, R<sub>C</sub> = 10 Ω, <b>neutral connected</b>. Record: does current flow in the neutral?', test: () => S.d4rows.some((r) => ex39(r) && r.neu) },
    { t: 'With the same load, <b>break the neutral</b> and record. Which lamp got brighter, which dimmed?', test: () => S.d4rows.some((r) => ex39(r) && !r.neu) },
    { t: 'With the neutral broken, <b>balance</b> the load (three equal resistors) and record: what happened to the shift?', test: () => S.d4rows.some((r) => !r.neu && r.RA === r.RB && r.RB === r.RC && r.Vp > 0) },
    { t: 'With the neutral broken, find and record a load condition that makes the voltage on one phase <b>greater than 125% of V<sub>φ</sub></b> (the result of a broken neutral in a household installation!).', test: () => S.d4rows.some((r) => !r.neu && r.Vp > 0 && Math.max(r.VA, r.VB, r.VC) > 1.25 * r.Vp) },
    { t: 'With R<sub>B</sub>, R<sub>C</sub> fixed, record R<sub>A</sub> at <b>at least 5 different</b> values (neutral broken) and turn on the <b>theoretical curves</b>.', test: () => { const b = S.d4rows.filter((r) => !r.neu && r.Vp > 0 && r.RB === S.d4R[1] && r.RC === S.d4R[2]); return new Set(b.map((r) => r.RA)).size >= 5 && !!S.fl.d4theo; } },
  ]);
  numq('d4', '#d4Q', { id: 'd4q1', q: 'In Example 3.9 with the neutral broken, what is the star-point shift |V<sub>N′n</sub>| (V)?', answer: 30, tol: 1, unit: 'V', explain: 'V<sub>N</sub> = (V<sub>a</sub>/20 + V<sub>b</sub>/20 + V<sub>c</sub>/10)/(1/20+1/20+1/10) = 30∠120° V.', hint: 'The general V<sub>N</sub> formula; the balanced simplification does not apply.' });
  numq('d4', '#d4Q', { id: 'd4q2', q: 'In the same case, what is the load voltage of phase C, |V<sub>CN′</sub>| (V)?', answer: 90, tol: 1, unit: 'V', explain: 'V<sub>CN′</sub> = 120∠120° − 30∠120° = 90∠120° V: the heavily loaded phase sees a <b>low</b> voltage.', hint: 'Voltmeter reading.' });
  numq('d4', '#d4Q', { id: 'd4q3', q: 'What is the load voltage of phase A, |V<sub>AN′</sub>| (V)?', answer: Math.hypot(135, 25.98), tol: 1, unit: 'V', explain: 'V<sub>AN′</sub> = 120 − 30∠120° = 135 − j25.98 ⇒ 137.5 V: the lightly loaded phases see an <b>over</b>voltage.', hint: 'Voltmeter reading.' });
  numq('d4', '#d4Q', { id: 'd4q4', q: 'With the neutral intact (Example 3.9), what is the neutral current |I<sub>0</sub>| (A)?', answer: 6, tol: 1, unit: 'A', explain: 'I<sub>0</sub> = 6∠0° + 6∠−120° + 12∠120° = 6∠120° A.', hint: 'The neutral ammeter.' });
  mcq('d4', '#d4Q', { id: 'd4q5', q: 'In a Y system with unbalanced load, why is the neutral conductor not fused and not switched on its own?', opts: ['The neutral current is always zero', 'If the neutral breaks the star point shifts; some phases burn appliances with overvoltage', 'A fuse is more expensive on the neutral', 'The neutral is only for earthing'], correct: 1, explain: 'As you saw in the experiment, the lightly loaded phase can see ~115–150% voltage. Therefore the neutral must be continuous and sound.', hint: 'Look at the voltmeters with the neutral broken.' });
  mcq('d4', '#d4Q', { id: 'd4q6', q: 'What did you observe when the load was made fully balanced with the neutral broken?', opts: ['V<sub>N′n</sub> = 0, each phase V<sub>φ</sub>: the neutral is not needed', 'V<sub>N′n</sub> = V<sub>φ</sub>', 'The currents became zero', 'One phase was short-circuited'], correct: 0, explain: 'With a balanced load ΣV<sub>i</sub> = 0, so V<sub>N</sub> = 0; that is why balanced motors are supplied with 3 wires.', hint: 'V<sub>N′n</sub> in your balanced row.' });

  const REP = { hafta: 12, konu: 'Three-phase sources, phase sequence, phase/line voltages, balanced and unbalanced Y–Y connection (Sections 3.1–3.3)',
    tables: [['Experiment 1 · Phase-sequence measurements', '#d1tab'], ['Experiment 2 · Phase and line voltages', '#d2tab'], ['Experiment 3 · Balanced Y–Y (Example 3.11)', '#d3tab'], ['Experiment 4 · Unbalanced load, broken neutral', '#d4tab']],
    canv: () => [D1.sc.cv, D2.sc.cv, D3.sc.cv, $('#d4plot')], svgs: () => [$('#d2ph'), $('#d3ph'), $('#d4ph')] };

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
      <table class="data" style="width:auto"><tr><th>Full name</th><td class="l">${S.st.name || ''}</td><th>Student ID</th><td class="l">${S.st.no || ''}</td><th>Group</th><td class="l">${S.st.group || ''}</td><th>Date</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Summary</h3>
      <p>Lab-sheet steps completed: <b>${sOk}/${sTot}</b> · Correct answers: <b>${ok}/${tot}</b> · Score: <b>${Math.round((50 * sOk) / Math.max(1, sTot) + (50 * ok) / Math.max(1, tot))}/100</b></p>
      <h3>Answers</h3>
      <table class="data"><thead><tr><th>Section</th><th>Question</th><th>Answer</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      ${REP.tables.map(([t, id]) => `<h3>${t}</h3>${tb(id)}`).join('')}
      <h3>Graphs and diagrams</h3>
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

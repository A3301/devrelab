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
    w.innerHTML = `<div class="brand"><span>${o.brand || 'DSO-4C · Dört kanallı osiloskop · diferansiyel problar'}</span><span><span class="led on g"></span> RUN · tetik CH1 ↑</span></div>
      <div class="row" style="align-items:flex-start;flex-wrap:nowrap"><canvas width="640" height="400" style="width:100%;max-width:640px;touch-action:none"></canvas>
      <div style="min-width:175px"><div class="ctrls"></div><div class="row btns" style="margin:6px 0;gap:4px"></div><div class="meas"></div></div></div>`;
    host.appendChild(w);
    const cv = w.querySelector('canvas'), g = cv.getContext('2d'), sk = w.querySelector('.ctrls'), bt = w.querySelector('.btns'), me = w.querySelector('.meas');
    const self = { cv, dirty: true, tdiv: o.t, chs: o.chs.map((c) => Object.assign({ on: true }, c)), gd: o.groups.map((x) => x.v), cur: { on: false, a: 2.5, b: 4, drag: null }, src: null };
    o.groups.forEach((gr, i) => new Lab.Knob(sk, { label: gr.l, list: gr.list || VDIV, value: gr.v, dark: true, size: 38, fmt: (v) => eng(v, gr.u), onChange: (v) => { self.gd[i] = v; self.dirty = true; } }));
    self.kt = new Lab.Knob(sk, { label: 'ZAMAN/d', list: TDIV, value: o.t, dark: true, size: 38, fmt: (v) => eng(v, 's'), onChange: (v) => { self.tdiv = v; self.dirty = true; } });
    self.chs.forEach((c, k) => { const b = segBtn(bt, 'CH' + (k + 1), true); b.style.borderBottom = '3px solid ' + c.c; c.btn = b; b.onclick = () => { c.on = !c.on; b.classList.toggle('on', c.on); self.dirty = true; }; });
    const bc = segBtn(bt, 'İMLEÇ', false); bc.onclick = () => { self.cur.on = !self.cur.on; bc.classList.toggle('on', self.cur.on); self.dirty = true; };
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
      g.fillStyle = '#9fe0b0'; g.fillText(o.groups.map((gr, i) => gr.l.replace('/d', '') + ' ' + eng(self.gd[i], gr.u) + '/d').join('  ') + '   ' + eng(self.tdiv, 's') + '/d', 8, H - 8);
      g.fillStyle = '#f2d21b'; g.fillText('T▼', dx - 8, 28);
      if (self.cur.on) {
        g.strokeStyle = '#ff7cf0'; g.setLineDash([5, 4]);
        ['a', 'b'].forEach((q) => { const X = (self.cur[q] / 10) * W; g.beginPath(); g.moveTo(X, 0); g.lineTo(X, H); g.stroke(); g.fillStyle = '#ff7cf0'; g.fillText(q.toUpperCase(), X + 3, H - 24); });
        g.setLineDash([]);
      }
      let h = '';
      self.chs.forEach((c, k) => { if (c.on && s.rms) h += `<span style="color:${c.c}">CH${k + 1}</span> ${s.mlab || 'rms'} ${eng(s.rms[k], o.groups[c.g || 0].u)}<br>`; });
      if (self.cur.on) {
        h += `<span style="color:#ff7cf0">İMLEÇ</span> t<sub>A</sub> ${eng(self.tAt(self.cur.a), 's')} · t<sub>B</sub> ${eng(self.tAt(self.cur.b), 's')}<br>Δt = t<sub>B</sub>−t<sub>A</sub> = <b>${eng(self.tAt(self.cur.b) - self.tAt(self.cur.a), 's')}</b><br>`;
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
      if (!S.steps[id] && ok) { S.steps[id] = true; save(); Lab.toast('✔ Adım tamamlandı: ' + s.t.replace(/<[^>]+>/g, '').slice(0, 70)); progress(); }
      lis[i].classList.toggle('done', !!S.steps[id]);
    });
  }
  const qids = {};
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
      if (dots[i]) dots[i].classList.toggle('done', done);
    });
  }
  const mcq = (pg, el, o) => { (qids[pg] = qids[pg] || []).push(o.id); Lab.mcq($(el), o); };
  const numq = (pg, el, o) => { (qids[pg] = qids[pg] || []).push(o.id); Lab.numq($(el), o); };
  [['stName', 'name'], ['stNo', 'no'], ['stGroup', 'group'], ['stDate', 'date'], ['stComment', 'comment']].forEach(([id, k]) => {
    const e = $('#' + id); e.value = S.st[k] || (k === 'date' ? new Date().toLocaleDateString('tr-TR') : '');
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
    if (tot) { g.strokeStyle = '#222'; g.lineWidth = 3; g.beginPath(); for (let i = 0; i <= N; i++) { const x = (i / N) * span + ob.t * 6, y = y0 - (f(0, x) + f(1, x) + f(2, x)) * sc * 0.5 - sc * 0.5; i ? g.lineTo(L + (i / N) * (R - L), y) : g.moveTo(L, y); } g.stroke(); g.fillStyle = '#222'; g.fillText('p_T = p_a + p_b + p_c = 3 V_φ I_φ cos θ  (sabit!)', L + 10, 22); }
    g.fillStyle = '#333'; g.fillText('Her faz gücü 2ω ile titreşir ve ' + (th > 0 ? 'kısa süre negatif olabilir' : 'hiç negatif olmaz') + '; üçünün toplamı sabittir.', L + 10, H - 6);
  }

  /* ================= ÖN HAZIRLIK ================= */
  numq('onhaz', '#preQ', { id: 'p1', q: '1) Örnek 3.7: Z<sub>Δ</sub> = 27 + j36 Ω olan dengeli Δ yükün eşdeğer Y kolunun genliği |Z<sub>Y</sub>| kaç Ω’dur?', answer: 15, tol: 1, unit: 'Ω', explain: 'Z<sub>Y</sub> = Z<sub>Δ</sub>/3 = 9 + j12 = 15∠53,13° Ω.', hint: 'Z<sub>Y</sub> = Z<sub>Δ</sub>/3' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) Örnek 3.18: Z = 30 + j40 Ω’luk üç yük 400 V’a <b>Y</b> bağlanıyor. Faz akımı kaç A’dir?', answer: 400 / Math.sqrt(3) / 50, tol: 1, unit: 'A', explain: 'V<sub>φ</sub> = 400/√3 = 230,9 V, |Z| = 50 Ω ⇒ I<sub>φ</sub> = I<sub>L</sub> = 4,62 A.', hint: 'Y’de V<sub>φ</sub> = V<sub>L</sub>/√3.' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) Örnek 3.25: Y bağlı motor, V<sub>L</sub> = 400 V, P<sub>T</sub> = 15 kW, pf = 0,85 geri. Hat akımı kaç A’dir?', answer: 15000 / (Math.sqrt(3) * 400 * 0.85), tol: 1, unit: 'A', explain: 'I<sub>L</sub> = P<sub>T</sub>/(√3 V<sub>L</sub> cos θ) = 25,47 A.', hint: 'P<sub>T</sub> = √3 V<sub>L</sub> I<sub>L</sub> cos θ' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) Örnek 3.26: Δ yükte V<sub>L</sub> = 380 V, I<sub>L</sub> = 20 A, P<sub>T</sub> = 10 kW ölçülmüş. Güç faktörü kaçtır?', answer: 10000 / (Math.sqrt(3) * 380 * 20), tol: 1, unit: '', explain: 'S<sub>T</sub> = √3·380·20 = 13,16 kVA ⇒ pf = 10/13,16 = 0,760.', hint: 'pf = P/S' });
  mcq('onhaz', '#preQ', { id: 'p5', q: '5) Örnek 3.23: aynı 2 MW’ı aynı hattan 6 kV yerine 12 kV ile taşırsak hat kaybı nasıl değişir?', opts: ['Yarıya iner', 'Dörtte birine iner', 'Değişmez', 'İki katına çıkar'], correct: 1, explain: 'I<sub>L</sub> ∝ 1/V<sub>L</sub>, kayıp ∝ I<sub>L</sub>² ⇒ P<sub>6</sub>/P<sub>12</sub> = 4. Enerji iletiminde yüksek gerilimin nedeni budur.', hint: '3 I<sub>L</sub>² R<sub>ℓ</sub>' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) Dengeli Δ yükte (abc) hat akımı I<sub>aA</sub> ile faz akımı I<sub>AB</sub> arasındaki ilişki nedir?', opts: ['I<sub>aA</sub> = I<sub>AB</sub>', 'I<sub>aA</sub> = √3 I<sub>AB</sub>∠−30°', 'I<sub>aA</sub> = √3 I<sub>AB</sub>∠+30°', 'I<sub>aA</sub> = I<sub>AB</sub>/√3'], correct: 1, explain: 'I<sub>aA</sub> = I<sub>AB</sub> − I<sub>CA</sub> = √3 I<sub>AB</sub>∠−30° (acb’de ∠+30°).', hint: 'A düğümünde KCL.' });

  /* ================= DENEY 1 · Δ yükte faz ve hat akımları ================= */
  const D1 = (() => {
    const st = { dirty: true };
    def('d1Vp', 120); def('d1seq', 'abc'); def('d1R', 24); def('d1X', 18); def('d1open', false);
    const box = $('#d1inst');
    const gen = inst(box, 'Y KAYNAK · ideal · 50 Hz');
    new Lab.Knob(gen.c, { label: 'V_an', min: 0, max: 230, step: 1, value: S.d1Vp, dark: true, size: 50, fmt: (v) => num(v, 0) + ' V', onChange: (v) => { S.d1Vp = v; save(); st.dirty = true; } });
    toggle2(gen.c, 'abc', 'acb', S.d1seq === 'acb', (v) => { S.d1seq = v ? 'acb' : 'abc'; save(); st.dirty = true; });
    const ld = inst(box, 'Δ YÜK · her kol', false);
    new Lab.Knob(ld.c, { label: 'R', min: 1, max: 100, step: 0.5, value: S.d1R, size: 48, fmt: (v) => num(v, 1) + ' Ω', onChange: (v) => { S.d1R = v; save(); st.dirty = true; } });
    new Lab.Knob(ld.c, { label: 'X', min: -60, max: 60, step: 0.5, value: S.d1X, size: 48, fmt: (v) => num(v, 1) + ' Ω', onChange: (v) => { S.d1X = v; save(); st.dirty = true; } });
    toggle2(ld.c, 'CA kolu bağlı', 'CA kolu KOPUK', S.d1open, (v) => { S.d1open = v; save(); st.dirty = true; });
    const am = inst(box, 'PENS AMPERMETRELER · hat');
    const aL = ['I<sub>aA</sub>', 'I<sub>bB</sub>', 'I<sub>cC</sub>'].map((l) => lcd(am.el, l, 'A', 95));
    const ak = inst(box, 'AMPERMETRELER · Δ kolları', false);
    const kL = ['I<sub>AB</sub>', 'I<sub>BC</sub>', 'I<sub>CA</sub>'].map((l) => lcd(ak.el, l, 'A', 95));
    const vm = inst(box, 'VOLTMETRE', false); const vL = lcd(vm.el, 'V<sub>AB</sub> (yük kolu)', 'V', 110);
    const sc = mkOsc($('#d1scope'), { chs: [{ n: 'i_AB', c: PHs[0] }, { n: 'i_aA', c: '#7ee08a' }], groups: [{ l: 'A/d', v: 5, u: 'A', list: [0.5, 1, 2, 5, 10, 20] }], t: 2e-3, brand: 'DSO · akım probları (1 V/A)' });
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
    const T = table('d1tab', 'd1rows', (r) => [r.seq, num(r.Vp, 0), zs(r.R, r.X), r.open ? 'kopuk' : 'bağlı', num(r.Ia, 2), num(r.Ib, 2), num(r.Ic, 2), num(r.Iab, 2), num(r.Ibc, 2), num(r.Ica, 2), num(r.VAB, 1), r.dt == null ? '—' : num(r.dt * 1e3, 3)],
      'hafta13_deney1.csv', ['sira', 'Van', 'R', 'X', 'CA kopuk', 'IaA', 'IbB', 'IcC', 'IAB', 'IBC', 'ICA', 'VAB', 'dt (ms)'], (r) => [r.seq, r.Vp, r.R, r.X, r.open ? 1 : 0, +r.Ia.toFixed(3), +r.Ib.toFixed(3), +r.Ic.toFixed(3), +r.Iab.toFixed(3), +r.Ibc.toFixed(3), +r.Ica.toFixed(3), +r.VAB.toFixed(2), r.dt == null ? '' : +(r.dt * 1e3).toFixed(4)]);
    function rec() {
      const r = solve(); let dt = null, ok = false;
      if (sc.cur.on) { dt = sc.curDt(); ok = cabs(r.Ik[0]) > 0 && sc.val(0, sc.cur.a) > 0.97 * Math.SQRT2 * cabs(r.Ik[0]) && curPhaseOK(sc, r.Ik[0], r.I[0], w50); }
      S.d1rows.push({ seq: S.d1seq, Vp: S.d1Vp, R: S.d1R, X: S.d1X, open: S.d1open, Ia: cabs(r.I[0]), Ib: cabs(r.I[1]), Ic: cabs(r.I[2]), Iab: cabs(r.Ik[0]), Ibc: cabs(r.Ik[1]), Ica: cabs(r.Ik[2]), VAB: cabs(r.VL[0]), dt, ok }); save(); T.draw();
      Lab.toast('Kaydedildi' + (dt != null && !ok ? ' (imleçler tepelerde değil: A → i<sub>AB</sub> tepesi, B → en yakın i<sub>aA</sub> tepesi)' : ''));
    }
    $('#d1rec').onclick = rec; $('#d1del').onclick = () => { S.d1rows.pop(); save(); T.draw(); }; $('#d1csv').onclick = T.csv; T.draw();
    st.update = update; st.rec = rec; st.sc = sc;
    return st;
  })();
  XP.d1 = D1;
  const ex314 = (r) => r.Vp === 120 && r.R === 24 && r.X === 18 && !r.open;
  steps('d1', [
    { t: '<b>Örnek 3.14</b>: V<sub>an</sub> = 120 V, abc, Z<sub>Δ</sub> = <b>24 + j18 Ω</b>. Hat ve kol akımlarını kaydedin (R).', test: () => S.d1rows.some((r) => ex314(r) && r.seq === 'abc') },
    { t: 'İMLEÇ A’yı i<sub>AB</sub> tepesine, B’yi <b>en yakın</b> i<sub>aA</sub> tepesine koyup kaydedin. Hat akımı kol akımından ileride mi geride mi?', test: () => S.d1rows.some((r) => !r.open && r.seq === 'abc' && r.ok) },
    { t: 'Sırayı <b>acb</b> yapıp aynı zaman ölçümünü tekrarlayın.', test: () => S.d1rows.some((r) => !r.open && r.seq === 'acb' && r.ok) },
    { t: 'Kol empedansını değiştirerek <b>en az üç farklı</b> dengeli yükte kaydedin: I<sub>L</sub>/I<sub>φ</sub> oranı değişiyor mu?', test: () => new Set(S.d1rows.filter((r) => !r.open).map((r) => r.R + '/' + r.X)).size >= 3 },
    { t: '<b>CA kolunu koparın</b> (Örnek 3.14 yükü) ve kaydedin: hangi hat akımı değişmedi, hangisi değişti?', test: () => S.d1rows.some((r) => r.Vp === 120 && r.R === 24 && r.X === 18 && r.open) },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: 'Örnek 3.14: ölçtüğünüz hat akımı |I<sub>aA</sub>| kaç A’dir?', answer: 12, tol: 1, unit: 'A', explain: 'Z<sub>Y</sub> = Z<sub>Δ</sub>/3 = 8 + j6 = 10∠36,87° Ω ⇒ I<sub>aA</sub> = 120/10 = 12∠−36,87° A.', hint: 'Hat ampermetresi; tek-faz eşdeğerle de hesaplayın.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'Kol (faz) akımı |I<sub>AB</sub>| kaç A’dir?', answer: 12 / Math.sqrt(3), tol: 1, unit: 'A', explain: 'V<sub>AB</sub> = 207,85∠30° V; I<sub>AB</sub> = 207,85/30 = 6,93∠−6,87° A = 12/√3.', hint: 'I<sub>φ</sub> = I<sub>L</sub>/√3' });
  numq('d1', '#d1Q', { id: 'd1q3', q: 'abc’de osiloskoptan: i<sub>aA</sub>, i<sub>AB</sub>’den kaç derece geridedir?', answer: 30, tol: 4, unit: '°', explain: 'Δt = +1,67 ms (B, A’nın sağında) ⇒ 30° geride: I<sub>aA</sub> = √3 I<sub>AB</sub>∠−30°.', hint: 'θ = 360°·Δt/T' });
  mcq('d1', '#d1Q', { id: 'd1q4', q: 'acb sırasında ölçümünüz neyi gösterdi?', opts: ['i<sub>aA</sub>, i<sub>AB</sub>’den 30° ileride', 'i<sub>aA</sub>, i<sub>AB</sub>’den 30° geride', 'Aynı fazda', '90° geride'], correct: 0, explain: 'acb’de I<sub>aA</sub> = √3 I<sub>AB</sub>∠+30°: gerilimdeki ±30° kuralının akımdaki ikizi.', hint: 'acb satırınızdaki Δt’nin işareti.' });
  numq('d1', '#d1Q', { id: 'd1q5', q: 'CA kolu koptuğunda |I<sub>bB</sub>| kaç A oldu?', answer: 12, tol: 1, unit: 'A', explain: 'I<sub>CA</sub> = 0 ⇒ I<sub>aA</sub> = I<sub>AB</sub> = 6,93 A, I<sub>cC</sub> = −I<sub>BC</sub> = 6,93 A, ama I<sub>bB</sub> = I<sub>BC</sub> − I<sub>AB</sub> = √3·6,93 = 12 A: B hattı hâlâ iki kolu besler.', hint: 'B düğümünde KCL.' });
  mcq('d1', '#d1Q', { id: 'd1q6', q: 'Dengeli Δ yükte hat ve kol akımı genlik oranı neden hep √3 çıktı?', opts: ['Kol empedansına bağlı bir tesadüf', 'Hat akımı, 120° aralı iki eşit kol akımının farkıdır', 'Hat gerilimi √3 kat olduğu için', 'Ampermetre hatası'], correct: 1, explain: 'I<sub>aA</sub> = I<sub>AB</sub> − I<sub>CA</sub>: fazör panelindeki gri kesikli ok. Gerilimde V<sub>L</sub> = √3V<sub>φ</sub> ile aynı geometri.', hint: 'Fazör panelindeki yapıyı inceleyin.' });

  /* ================= DENEY 2 · Δ–Y dönüşümü, Y mi Δ mı? ================= */
  const D2 = (() => {
    const st = { dirty: true };
    def('d2VL', 400); def('d2R', 30); def('d2X', 40); def('d2c', 'Y'); def('d2lcr', false);
    const box = $('#d2inst');
    const gen = inst(box, 'ŞEBEKE · abc · 50 Hz');
    new Lab.Knob(gen.c, { label: 'V_L', list: [230, 380, 400], value: S.d2VL, dark: true, size: 46, fmt: (v) => v + ' V', onChange: (v) => { S.d2VL = v; save(); st.dirty = true; } });
    toggle2(gen.c, 'Şebeke', 'LCR köprüsü (enerjisiz)', S.d2lcr, (v) => { S.d2lcr = v; save(); st.dirty = true; });
    const ld = inst(box, 'ÜÇ ÖZDEŞ SARGI (motor klemens kutusu)', false);
    new Lab.Knob(ld.c, { label: 'R', min: 1, max: 100, step: 1, value: S.d2R, size: 46, fmt: (v) => num(v, 0) + ' Ω', onChange: (v) => { S.d2R = v; save(); st.dirty = true; } });
    new Lab.Knob(ld.c, { label: 'X', min: 0, max: 100, step: 1, value: S.d2X, size: 46, fmt: (v) => num(v, 0) + ' Ω', onChange: (v) => { S.d2X = v; save(); st.dirty = true; } });
    toggle2(ld.c, 'Y (yıldız)', 'Δ (üçgen)', S.d2c === 'D', (v) => { S.d2c = v ? 'D' : 'Y'; save(); st.dirty = true; });
    const ms = inst(box, 'ÖLÇÜMLER');
    const mL = [lcd(ms.el, 'I<sub>L</sub> hat', 'A', 100), lcd(ms.el, 'I<sub>φ</sub> sargı', 'A', 100), lcd(ms.el, 'V<sub>φ</sub> sargı', 'V', 100), lcd(ms.el, 'P<sub>T</sub> (wattmetre)', 'W', 110)];
    const lc = inst(box, 'LCR KÖPRÜSÜ · A–B uçları, 50 Hz', false); const zL = lcd(lc.el, '|Z<sub>AB</sub>|', 'Ω', 100), zA = lcd(lc.el, 'θ', '°', 70);
    const g = $('#d2sch'); const gg = E('g', {}, g);
    function drawSch() {
      gg.innerHTML = '';
      const T = [[60, 60], [60, 140], [60, 220]];
      T.forEach((p, k) => { sch.term(gg, p[0], p[1]); sch.t(gg, p[0] - 20, p[1] + 5, 'ABC'[k], 'val'); });
      if (S.d2c === 'Y') {
        const N = [340, 140];
        T.forEach((p, k) => { sch.w(gg, [p, [140, p[1]]]); sch.zL(gg, 140, p[1], N[0], N[1]); });
        sch.dot(gg, N[0], N[1]); sch.t(gg, N[0] + 12, N[1] + 5, 'N (yıldız noktası)', 'lbl', 'start');
      } else {
        const P = [[300, 50], [230, 230], [370, 230]];
        T.forEach((p, k) => sch.w(gg, [p, [150, p[1]], [150 + k * 15, p[1]], P[k]]));
        sch.zL(gg, P[0][0], P[0][1], P[1][0], P[1][1]); sch.zL(gg, P[1][0], P[1][1], P[2][0], P[2][1]); sch.zL(gg, P[2][0], P[2][1], P[0][0], P[0][1]);
        P.forEach((p) => sch.dot(gg, p[0], p[1]));
      }
      sch.t(gg, 480, 40, S.d2c === 'Y' ? 'Y bağlı: sargıda V<tspan font-size="10">L</tspan>/√3' : 'Δ bağlı: sargıda V<tspan font-size="10">L</tspan>', 'lbl', 'start');
      sch.t(gg, 480, 64, 'Z = ' + zs(S.d2R, S.d2X) + ' Ω', 'lbl', 'start');
      sch.t(gg, 480, 88, S.d2lcr ? 'LCR köprüsü A–B arasında (şebeke ayrık)' : 'Şebeke bağlı', 'lbl', 'start');
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
      'hafta13_deney2.csv', ['baglanti', 'VL', 'R', 'X', 'IL', 'Iphi', 'Vphi', 'P (W)', '|Zab|', 'aci'], (r) => [r.c, r.lcr ? 'LCR' : r.VL, r.R, r.X, r.lcr ? '' : +r.IL.toFixed(3), r.lcr ? '' : +r.Iph.toFixed(3), r.lcr ? '' : +r.Vph.toFixed(2), r.lcr ? '' : +r.P.toFixed(1), r.lcr ? +r.Zm.toFixed(3) : '', r.lcr ? +r.Za.toFixed(2) : '']);
    function rec() {
      const r = solve();
      S.d2rows.push({ c: S.d2c, VL: S.d2VL, lcr: S.d2lcr, R: S.d2R, X: S.d2X, IL: r.IL, Iph: r.Iph, Vph: r.Vph, P: r.P, Zm: cabs(r.Zab), Za: cang(r.Zab) }); save(); T.draw();
      Lab.toast('Kaydedildi: ' + (S.d2c === 'Y' ? 'Y' : 'Δ') + (S.d2lcr ? ' · LCR' : ' · I<sub>L</sub> = ' + num(r.IL, 2) + ' A'));
    }
    $('#d2rec').onclick = rec; $('#d2del').onclick = () => { S.d2rows.pop(); save(); T.draw(); }; $('#d2csv').onclick = T.csv; T.draw();
    st.update = update; st.rec = rec;
    return st;
  })();
  XP.d2 = D2;
  const z3040 = (r) => r.R === 30 && r.X === 40;
  steps('d2', [
    { t: '<b>Örnek 3.18</b>: Z = 30 + j40 Ω, V<sub>L</sub> = 400 V, <b>Y</b> bağlayıp kaydedin.', test: () => S.d2rows.some((r) => z3040(r) && r.c === 'Y' && !r.lcr && r.VL === 400) },
    { t: 'Aynı sargıları <b>Δ</b> bağlayıp kaydedin. Hat akımı ve güç kaç katına çıktı?', test: () => S.d2rows.some((r) => z3040(r) && r.c === 'D' && !r.lcr && r.VL === 400) },
    { t: 'Şebekeyi ayırıp <b>LCR köprüsünü</b> A–B arasına bağlayın; Δ ve Y bağlantıda uçtan görülen empedansı kaydedin.', test: () => S.d2rows.some((r) => z3040(r) && r.c === 'D' && r.lcr) && S.d2rows.some((r) => z3040(r) && r.c === 'Y' && r.lcr) },
    { t: '<b>Örnek 3.16</b>: Z = 12 + j16 Ω, V<sub>L</sub> = 400 V; Δ ve Y bağlantının ikisini de kaydedin.', test: () => ['Y', 'D'].every((c) => S.d2rows.some((r) => r.R === 12 && r.X === 16 && r.c === c && !r.lcr && r.VL === 400)) },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'Örnek 3.18, Δ bağlantı: hat akımı kaç A’dir?', answer: 8 * Math.sqrt(3), tol: 1, unit: 'A', explain: 'Δ’da V<sub>φ</sub> = 400 V ⇒ I<sub>φ</sub> = 8 A, I<sub>L</sub> = √3·8 = 13,86 A (Y’de 4,62 A).', hint: 'Hat ampermetresi.' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'Ölçümlerinize göre P<sub>Δ</sub>/P<sub>Y</sub> oranı kaçtır?', answer: 3, tol: 1, unit: '', explain: 'Δ’da sargı gerilimi √3 kat ⇒ güç (√3)² = 3 kat: 5760 W / 1920 W.', hint: 'İki satırın P değerlerini bölün.' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 'LCR köprüsü Δ bağlı sargılarda A–B arasında |Z<sub>AB</sub>| kaç Ω gösterdi?', answer: 50 * 2 / 3, tol: 1, unit: 'Ω', explain: 'Z<sub>AB</sub> = Z ∥ 2Z = (2/3)Z = 33,3 Ω. Eşdeğer Y’de Z<sub>AB</sub> = 2Z<sub>Y</sub> ⇒ Z<sub>Y</sub> = Z<sub>Δ</sub>/3 ✓', hint: 'Doğrudan okuma.' });
  numq('d2', '#d2Q', { id: 'd2q4', q: 'Bu LCR okumasından eşdeğer Y kol empedansının genliği |Z<sub>Y</sub>| kaç Ω’dur?', answer: 50 / 3, tol: 1, unit: 'Ω', explain: 'Z<sub>Y</sub> = Z<sub>AB</sub>/2 = 16,7 Ω = 50/3.', hint: 'Y’de A–B arasında iki kol seridir.' });
  numq('d2', '#d2Q', { id: 'd2q5', q: 'Örnek 3.16: 12 + j16 Ω sargılar Δ bağlıyken hat akımı kaç A’dir?', answer: 20 * Math.sqrt(3), tol: 1, unit: 'A', explain: 'I<sub>AB</sub> = 400/20 = 20 A, I<sub>aA</sub> = 34,64 A; Y’de 11,55 A; oran 3.', hint: '|Z| = 20 Ω' });
  mcq('d2', '#d2Q', { id: 'd2q6', q: 'Yıldız–üçgen yol vermede motor neden önce Y bağlanır?', opts: ['Dönüş yönünü değiştirmek için', 'Kalkışta hat akımını (ve momenti) üçte birine indirmek için', 'Güç faktörünü 1 yapmak için', 'Nötr iletkenine akım akıtmak için'], correct: 1, explain: 'Ölçtüğünüz gibi Y’de hat akımı Δ’nın 1/3’üdür; motor hızlanınca Δ’ya geçilir ve tam güç alınır.', hint: 'I<sub>L,Y</sub> / I<sub>L,Δ</sub>' });

  /* ================= DENEY 3 · Üç fazlı güç ve anlık toplam güç ================= */
  const Zg0 = cx(0.2, 0.5), Zl0 = cx(0.8, 1.5);
  const D3 = (() => {
    const st = { dirty: true };
    def('d3Vp', 120); def('d3R', 39); def('d3X', 28); def('d3zg', true); def('d3zl', true); def('d3un', 0); def('d3pt', 'L');
    const box = $('#d3inst');
    const gen = inst(box, 'GENERATÖR · Z<sub>g</sub> = 0,2 + j0,5 Ω');
    new Lab.Knob(gen.c, { label: 'E_φ', min: 0, max: 240, step: 1, value: S.d3Vp, dark: true, size: 46, fmt: (v) => num(v, 0) + ' V', onChange: (v) => { S.d3Vp = v; save(); st.dirty = true; } });
    toggle2(gen.c, 'Z<sub>g</sub> yok', 'Z<sub>g</sub> var', S.d3zg, (v) => { S.d3zg = v; save(); st.dirty = true; });
    toggle2(gen.c, 'Hat yok', 'Hat 0,8+j1,5', S.d3zl, (v) => { S.d3zl = v; save(); st.dirty = true; });
    const ld = inst(box, 'Y YÜK (4 telli)', false);
    new Lab.Knob(ld.c, { label: 'R', min: 1, max: 100, step: 0.5, value: S.d3R, size: 46, fmt: (v) => num(v, 1) + ' Ω', onChange: (v) => { S.d3R = v; save(); st.dirty = true; } });
    new Lab.Knob(ld.c, { label: 'X', min: -60, max: 60, step: 0.5, value: S.d3X, size: 46, fmt: (v) => num(v, 1) + ' Ω', onChange: (v) => { S.d3X = v; save(); st.dirty = true; } });
    new Lab.Knob(ld.c, { label: 'C fazı R ±', min: -50, max: 200, step: 10, value: S.d3un, size: 40, fmt: (v) => (v > 0 ? '+' : '') + v + ' %', onChange: (v) => { S.d3un = v; save(); st.dirty = true; } });
    const pa = inst(box, 'GÜÇ ANALİZÖRÜ · 3 faz toplam');
    const pL = [lcd(pa.el, 'P', 'W', 105), lcd(pa.el, 'Q', 'VAR', 105), lcd(pa.el, '|S|', 'VA', 105), lcd(pa.el, 'pf', '', 80)];
    selBox(pa.c, 'Bağlantı noktası', [['L', 'yük uçları (A, B, C)'], ['G', 'generatör uçları (a, b, c)'], ['E', 'iç emk (ideal kaynak)']], S.d3pt, (v) => { S.d3pt = v; save(); st.dirty = true; });
    const sc = mkOsc($('#d3scope'), { chs: [{ n: 'p_a', c: PHs[0] }, { n: 'p_b', c: PHs[1] }, { n: 'p_c', c: PHs[2] }, { n: 'p_T', c: '#ffffff' }], groups: [{ l: 'W/d', v: 200, u: 'W', list: [20, 50, 100, 200, 500, 1000] }], t: 2e-3, brand: 'DSO · MATH: p = v·i (yük fazları) · tetik v_AN ↑' });
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
      pL[0](num(Sm.re, 1)); pL[1](num(Sm.im, 1)); pL[2](num(cabs(Sm), 1)); pL[3](cabs(Sm) ? num(Sm.re / cabs(Sm), 3) + (Sm.im > 1e-6 ? ' geri' : Sm.im < -1e-6 ? ' ileri' : '') : '—');
      const fv = r.VL.map((v) => sig(v, w50)), fi = r.I.map((i) => sig(i, w50)), fp = [0, 1, 2].map((k) => (t) => fv[k](t) * fi[k](t));
      sc.draw({ f: [...fp, (t) => fp[0](t) + fp[1](t) + fp[2](t)], w: w50, trig: cang(r.VL[0]), mlab: 'ort.', rms: [...[0, 1, 2].map((k) => cmul(r.VL[k], conj(r.I[k])).re), r.S.L.re] });
      tbl.innerHTML = '<tr><th></th><th>a</th><th>b</th><th>c</th></tr>' + ['|V<sub>φ</sub>| yük (V)', '|I| (A)'].map((h, j) => `<tr><td class="l">${h}</td>${[0, 1, 2].map((k) => `<td>${num(cabs(j ? r.I[k] : r.VL[k]), 2)}</td>`).join('')}</tr>`).join('');
    }
    const T = table('d3tab', 'd3rows', (r) => [num(r.Vp, 0), zs(r.R, r.X), r.un ? (r.un > 0 ? '+' : '') + r.un + ' %' : '—', (r.zg ? 'Z<sub>g</sub> ' : '') + (r.zl ? 'Z<sub>ℓ</sub>' : ''), { L: 'yük', G: 'generatör', E: 'emk' }[r.pt], num(r.P, 1), num(r.Q, 1), num(r.S, 1), num(r.pf, 3), r.rip == null ? '—' : num(r.rip, 1)],
      'hafta13_deney3.csv', ['Ephi', 'R', 'X', 'dengesizlik %', 'Zg', 'Zl', 'nokta', 'P', 'Q', 'S', 'pf', 'pT dalgalanma (W)'], (r) => [r.Vp, r.R, r.X, r.un, r.zg ? 1 : 0, r.zl ? 1 : 0, r.pt, +r.P.toFixed(2), +r.Q.toFixed(2), +r.S.toFixed(2), +r.pf.toFixed(4), r.rip == null ? '' : +r.rip.toFixed(2)]);
    function rec() {
      const r = solve(), Sm = r.S[S.d3pt];
      let rip = null;
      if (sc.cur.on && sc.chOn(3)) rip = Math.abs(sc.val(3, sc.cur.b) - sc.val(3, sc.cur.a));
      S.d3rows.push({ Vp: S.d3Vp, R: S.d3R, X: S.d3X, un: S.d3un, zg: S.d3zg, zl: S.d3zl, pt: S.d3pt, P: Sm.re, Q: Sm.im, S: cabs(Sm), pf: cabs(Sm) ? Sm.re / cabs(Sm) : 0, rip, pa: sc.cur.on && sc.chOn(0) ? sc.val(0, sc.cur.a) : null }); save(); T.draw();
      Lab.toast('Kaydedildi: P = ' + num(Sm.re, 1) + ' W' + (rip != null ? ', |p<sub>T</sub>(B) − p<sub>T</sub>(A)| = ' + num(rip, 1) + ' W' : ''));
    }
    $('#d3rec').onclick = rec; $('#d3del').onclick = () => { S.d3rows.pop(); save(); T.draw(); }; $('#d3csv').onclick = T.csv; T.draw();
    st.update = update; st.rec = rec; st.sc = sc; st.solve = solve;
    return st;
  })();
  XP.d3 = D3;
  const ex319 = (r) => r.Vp === 120 && r.R === 39 && r.X === 28 && r.zg && r.zl && !r.un;
  steps('d3', [
    { t: '<b>Örnek 3.19</b>: E<sub>φ</sub> = 120 V, yük 39 + j28 Ω, Z<sub>g</sub> ve hat devrede, dengeli. Güç analizörünü <b>yük uçlarına</b> bağlayıp kaydedin.', test: () => S.d3rows.some((r) => ex319(r) && r.pt === 'L') },
    { t: 'Analizörü <b>generatör uçlarına</b> ve <b>iç emk</b>’ya taşıyıp ikisini de kaydedin: aradaki fark nereye gitti?', test: () => S.d3rows.some((r) => ex319(r) && r.pt === 'G') && S.d3rows.some((r) => ex319(r) && r.pt === 'E') },
    { t: 'Osiloskopta dört kanal açık, en az bir periyot görünür olsun. İMLEÇ A ve B’yi p<sub>T</sub> üzerinde <b>farklı iki ana</b> koyup kaydedin (dengeli).', test: () => S.d3rows.some((r) => !r.un && r.rip != null && r.Vp > 0) && D3.sc.chs.every((c) => c.on) },
    { t: 'C fazı direncini değiştirerek yükü <b>dengesiz</b> yapın (≥ %50); p<sub>T</sub> artık sabit mi? İmleçlerle tepe–çukur farkını kaydedin.', test: () => S.d3rows.some((r) => Math.abs(r.un) >= 50 && r.rip != null && r.rip > 1) },
    { t: 'Dengeli, <b>X = 0</b> (saf direnç) bir yükte kaydedin: pf ve tek faz gücünün en küçük değeri ne oldu?', test: () => S.d3rows.some((r) => !r.un && r.X === 0 && r.pt === 'L') },
  ]);
  numq('d3', '#d3Q', { id: 'd3q1', q: 'Örnek 3.19: yükün toplam aktif gücü kaç W’tır?', answer: 3 * 2.4 * 2.4 * 39, tol: 1, unit: 'W', explain: 'P = 3·|I|²·R = 3·2,4²·39 = 673,9 W.', hint: 'Analizör yük uçlarında.' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'Yükün toplam reaktif gücü kaç VAR’dır?', answer: 3 * 2.4 * 2.4 * 28, tol: 1, unit: 'VAR', explain: 'Q = 3·2,4²·28 = 483,8 VAR (endüktif).', hint: 'Analizör yük uçlarında.' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'Generatör uçları ile yük uçları arasındaki P farkı (toplam hat kaybı) kaç W’tır?', answer: 3 * 2.4 * 2.4 * 0.8, tol: 2, unit: 'W', explain: 'P<sub>hat</sub> = 3·2,4²·0,8 = 13,8 W. emk ile generatör ucu farkı da iç kayıptır: 3·2,4²·0,2 = 3,46 W.', hint: 'İki kaydın P farkı.' });
  numq('d3', '#d3Q', { id: 'd3q4', q: 'İç emk’nın verdiği görünür güç |S| kaç VA’dır?', answer: 864, tol: 1, unit: 'VA', explain: 'S = 3·120·2,4∠36,87° = 691,2 + j518,4 VA ⇒ 864 VA.', hint: 'Analizör “iç emk”.' });
  numq('d3', '#d3Q', { id: 'd3q5', q: 'Dengeli Örnek 3.19 yükünde tek faz gücü p<sub>a</sub>(t)’nin en büyük değeri kaç W’tır? (İmleçle ölçün.)', answer: 115.22 * 2.4 * (1 + Math.cos(Math.atan2(28, 39))), tol: 2, unit: 'W', explain: 'p<sub>a</sub> = V I cos θ + V I cos(2ωt − θ) ⇒ maks = V I (1 + cos θ) = 276,5·(1 + 0,812) = 501 W; ortalaması 224,6 W.', hint: 'CH1 tepesine imleç.' });
  mcq('d3', '#d3Q', { id: 'd3q6', q: 'Dengeli yükte p<sub>T</sub>(t) neden sabittir ve bunun pratik önemi nedir?', opts: ['Gerilimlerin toplamı sıfır olduğu için güç de sıfırdır', '2ω’lık titreşim terimleri 120° aralı olduğundan birbirini götürür; motor milinde titreşimsiz sabit moment elde edilir', 'Hat empedansı titreşimi süzer', 'Yalnızca saf dirençte sabittir'], correct: 1, explain: 'p<sub>T</sub> = 3V<sub>φ</sub>I<sub>φ</sub>cos θ. Tek fazlı motorlar 100 Hz’de titreşir, üç fazlılar düzgün döner. (Sunumdaki sık hata: “toplam sıfır, güç de sıfır”.)', hint: 'Dengeli ve dengesiz kayıtlarınızdaki dalgalanmayı karşılaştırın.' });

  /* ================= DENEY 4 · Hat kaybı ve pf düzeltmesi ================= */
  const D4 = (() => {
    const st = { dirty: true };
    def('d4P', 480); def('d4pf', 0.8); def('d4C', 0);
    const VL = 600, Zl = cx(0.005, 0.025), VAN = cx(VL / Math.sqrt(3));
    const box = $('#d4inst');
    const ld = inst(box, 'FABRİKA YÜKÜ · V<sub>L</sub> = 600 V (yük barasında sabit)');
    new Lab.Knob(ld.c, { label: 'P', list: [120, 240, 360, 480, 600], value: S.d4P, dark: true, size: 46, fmt: (v) => v + ' kW', onChange: (v) => { S.d4P = v; save(); st.dirty = true; } });
    new Lab.Knob(ld.c, { label: 'pf (geri)', min: 0.6, max: 1, step: 0.01, value: S.d4pf, dark: true, size: 46, fmt: (v) => num(v, 2), onChange: (v) => { S.d4pf = v; save(); st.dirty = true; } });
    const cb = inst(box, 'Δ KONDANSATÖR BANKASI', false);
    new Lab.Knob(cb.c, { label: 'C_Δ (kol başına)', min: 0, max: 1500, step: 1, value: S.d4C, size: 60, fmt: (v) => num(v, 0) + ' µF', onChange: (v) => { S.d4C = v; save(); st.dirty = true; } });
    const ms = inst(box, 'ENERJİ ANALİZÖRLERİ');
    const mL = [lcd(ms.el, 'I<sub>L</sub> hat', 'A', 100), lcd(ms.el, 'pf yük barası', '', 100), lcd(ms.el, 'P<sub>hat</sub> kaybı', 'kW', 100), lcd(ms.el, 'Q<sub>hat</sub>', 'kVAR', 100), lcd(ms.el, 'V<sub>L</sub> gönderen uç', 'V', 100), lcd(ms.el, 'pf gönderen uç', '', 100)];
    const plot = new Lab.Plot($('#d4plot'), { xlabel: 'C_Δ  (µF)', ylabel: 'P_hat  (kW)' });
    const solve = (C = S.d4C, P = S.d4P, pf = S.d4pf) => {
      const Pp = P * 1e3 / 3, Qp = Pp * Math.tan(Math.acos(pf));
      const Iload = conj(cdiv(cx(Pp, Qp), VAN)), Ic = cmul(cx(0, w50 * 3 * C * 1e-6), VAN); // Δ C ⇒ Y eşdeğeri 3C
      const I = cadd(Iload, Ic), Vs = cadd(VAN, cmul(Zl, I)), Sb = cmul(VAN, conj(I)), Ss = cmul(Vs, conj(I));
      return { I: cabs(I), pfb: Sb.re / cabs(Sb), lead: Sb.im < 0, Pl: 3 * cabs(I) ** 2 * Zl.re, Ql: 3 * cabs(I) ** 2 * Zl.im, VLs: cabs(Vs) * Math.sqrt(3), pfs: Ss.re / cabs(Ss), leads: Ss.im < 0 };
    };
    const tag = (l) => (l ? ' ileri' : ' geri');
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
      sch.t(s, x0 + P * k / 2, y0 + 18, 'P (kW)', 'lbl'); sch.t(s, x0 + P * k + 18, y0 - Q1 * k + 12, 'Q₁', 'lbl', 'start'); sch.t(s, x0 + P * k + 18, y0 - (Q1 + Q2) * k / 2, 'Q<tspan font-size="10">C</tspan>', 'lbl', 'start').style.fill = '#1a8a4a'; sch.t(s, x0 + 8, 20, 'Güç üçgeni: kesikli = düzeltme öncesi S₁, siyah = sonrası S₂', 'lbl', 'start').style.fontSize = '11px';
    }
    function update() {
      if (!st.dirty && !(st.sc && st.sc.dirty)) return; st.dirty = false; if (st.sc) st.sc.dirty = false;
      const r = solve();
      mL[0](num(r.I, 1)); mL[1](num(r.pfb, 3) + tag(r.lead)); mL[2](num(r.Pl / 1e3, 2)); mL[3](num(r.Ql / 1e3, 2)); mL[4](num(r.VLs, 1)); mL[5](num(r.pfs, 3) + tag(r.leads));
      tri(); drawPlot();
    }
    const T = table('d4tab', 'd4rows', (r) => [r.P, num(r.pf, 2), num(r.C, 0), num(r.I, 1), num(r.pfb, 3) + tag(r.lead), num(r.Pl / 1e3, 2), num(r.VLs, 1)],
      'hafta13_deney4.csv', ['P (kW)', 'pf yuk', 'C_delta (uF)', 'IL (A)', 'pf bara', 'P hat (kW)', 'VL gonderen (V)'], (r) => [r.P, r.pf, r.C, +r.I.toFixed(2), +(r.lead ? -r.pfb : r.pfb).toFixed(4), +(r.Pl / 1e3).toFixed(3), +r.VLs.toFixed(2)]);
    function rec() { const r = solve(); S.d4rows.push(Object.assign({ P: S.d4P, pf: S.d4pf, C: S.d4C }, r)); save(); T.draw(); drawPlot(); Lab.toast('Kaydedildi: C<sub>Δ</sub> = ' + S.d4C + ' µF, P<sub>hat</sub> = ' + num(r.Pl / 1e3, 2) + ' kW'); }
    $('#d4rec').onclick = rec; $('#d4del').onclick = () => { S.d4rows.pop(); save(); T.draw(); drawPlot(); }; $('#d4csv').onclick = T.csv; T.draw();
    st.update = update; st.rec = rec;
    return st;
  })();
  XP.d4 = D4;
  const ex324 = (r) => r.P === 480 && near(r.pf, 0.8, 1e-6);
  steps('d4', [
    { t: '<b>Örnek 3.21–3.22</b>: 480 kW, pf = 0,8 geri, <b>C<sub>Δ</sub> = 0</b>. Hat akımını, kaybı ve gönderen uç gerilimini kaydedin.', test: () => S.d4rows.some((r) => ex324(r) && r.C === 0) },
    { t: '<b>Örnek 3.24</b>: yük barasında pf’yi <b>0,95 geri</b> yapacak C<sub>Δ</sub>’yı önce hesaplayın, sonra ayarlayıp kaydedin.', test: () => S.d4rows.some((r) => ex324(r) && !r.lead && r.pfb >= 0.945 && r.pfb <= 0.955) },
    { t: 'Hat kaybını <b>en aza</b> indiren C<sub>Δ</sub>’yı bulup kaydedin (pf ≥ 0,995).', test: () => S.d4rows.some((r) => ex324(r) && r.pfb >= 0.995) },
    { t: 'Bilerek <b>aşırı kompanzasyon</b> yapın (pf ileri) ve kaydedin: kayıp yeniden arttı mı?', test: () => S.d4rows.some((r) => ex324(r) && r.lead && r.pfb < 0.97) },
    { t: 'Aynı yükte <b>en az 6</b> farklı C<sub>Δ</sub> kaydedin ve <b>teorik eğriyi</b> açın.', test: () => new Set(S.d4rows.filter(ex324).map((r) => r.C)).size >= 6 && !!S.fl.d4theo },
  ]);
  numq('d4', '#d4Q', { id: 'd4q1', q: 'C<sub>Δ</sub> = 0’da ölçtüğünüz hat akımı kaç A’dir?', answer: 480e3 / (Math.sqrt(3) * 600 * 0.8), tol: 0.5, unit: 'A', explain: 'I<sub>L</sub> = 480 000/(√3·600·0,8) = 577,35 A.', hint: 'Analizör I<sub>L</sub>.' });
  numq('d4', '#d4Q', { id: 'd4q2', q: 'Örnek 3.21: gönderen uçtaki hat gerilimi kaç V’tur?', answer: 619.2, tol: 0.5, unit: 'V', explain: 'V<sub>s</sub> = 346,41 + (0,005 + j0,025)(461,9 − j346,4) = 357,5∠1,57° V ⇒ V<sub>L</sub> = 619,2 V.', hint: 'Analizör gönderen uç.' });
  numq('d4', '#d4Q', { id: 'd4q3', q: 'Örnek 3.24: pf = 0,95 için gereken toplam Q<sub>C</sub> kaç kVAR’dır?', answer: 480 * (0.75 - Math.tan(Math.acos(0.95))), tol: 1, unit: 'kVAR', explain: 'Q<sub>C</sub> = P(tan θ<sub>1</sub> − tan θ<sub>2</sub>) = 480(0,75 − 0,3287) = 202,2 kVAR.', hint: 'Güç üçgeninde yalnız yükseklik değişir.' });
  numq('d4', '#d4Q', { id: 'd4q4', q: 'Bunun için Δ bankanın kol kapasitesi C<sub>Δ</sub> kaç µF’tır?', answer: 202.2e3 / (3 * 600 * 600 * w50) * 1e6, tol: 1.5, unit: 'µF', explain: 'Q<sub>C</sub> = 3 V<sub>L</sub>² ω C<sub>Δ</sub> ⇒ C<sub>Δ</sub> = 202 200/(3·600²·314,16) = 596 µF. Y bağlı olsaydı 3 katı gerekirdi.', hint: 'Δ’da her kondansatör V<sub>L</sub> görür.' });
  numq('d4', '#d4Q', { id: 'd4q5', q: 'pf = 0,95’te hat kaybı kaç kW’a indi?', answer: 3 * Math.pow(480e3 / (Math.sqrt(3) * 600 * 0.95), 2) * 0.005 / 1e3, tol: 2, unit: 'kW', explain: 'I<sub>L</sub> = 486,2 A ⇒ 3·486,2²·0,005 = 3,55 kW (önce 5,0 kW): %29 tasarruf.', hint: 'Analizör P<sub>hat</sub>.' });
  mcq('d4', '#d4Q', { id: 'd4q6', q: 'Aşırı kompanzasyonda ne gözlediniz?', opts: ['Kayıp sıfıra indi', 'pf ileri oldu; hat akımı ve kayıp yeniden arttı', 'Aktif güç arttı', 'Hiçbir şey değişmedi'], correct: 1, explain: 'En küçük akım pf = 1’de olur; fazla kondansatör kapasitif reaktif akım taşıtır. Bu yüzden kompanzasyon panoları kademeli ve otomatik (reaktif güç rölesi) yapılır.', hint: 'Grafikteki minimumun sağı.' });

  const REP = { hafta: 13, konu: 'Y–Δ bağlantı, Δ–Y dönüşümü, üç fazlı güç, anlık toplam güç, hat kaybı ve güç faktörü düzeltmesi (Bölüm 3.4–3.5)',
    tables: [['Deney 1 · Δ yükte faz ve hat akımları', '#d1tab'], ['Deney 2 · Y ve Δ bağlantı', '#d2tab'], ['Deney 3 · Üç fazlı güç', '#d3tab'], ['Deney 4 · Güç faktörü düzeltmesi', '#d4tab']],
    canv: () => [D1.sc.cv, D3.sc.cv, $('#d4plot')], svgs: () => [$('#d1ph'), $('#d4tri')] };

  /* ================= RAPOR ================= */
  function buildReport() {
    const sec = { onhaz: 'Ön Hazırlık', d1: 'Deney 1', d2: 'Deney 2', d3: 'Deney 3', d4: 'Deney 4' };
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
      <h2 style="margin:0">Devre Kuramı II · Sanal Laboratuvar · Hafta ${REP.hafta} Raporu</h2>
      <p><b>Konu:</b> ${REP.konu}</p>
      <table class="data" style="width:auto"><tr><th>Ad Soyad</th><td class="l">${S.st.name || ''}</td><th>No</th><td class="l">${S.st.no || ''}</td><th>Grup</th><td class="l">${S.st.group || ''}</td><th>Tarih</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Özet</h3>
      <p>Tamamlanan föy adımı: <b>${sOk}/${sTot}</b> · Doğru yanıt: <b>${ok}/${tot}</b> · Puan: <b>${Math.round((50 * sOk) / Math.max(1, sTot) + (50 * ok) / Math.max(1, tot))}/100</b></p>
      <h3>Yanıtlar</h3>
      <table class="data"><thead><tr><th>Bölüm</th><th>Soru</th><th>Yanıt</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      ${REP.tables.map(([t, id]) => `<h3>${t}</h3>${tb(id)}`).join('')}
      <h3>Grafikler ve diyagramlar</h3>
      <div>${REP.canv().map(img).join(' ')}</div><div>${REP.svgs().map(svgImg).join(' ')}</div>
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

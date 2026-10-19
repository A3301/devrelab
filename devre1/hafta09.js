/* Devre Kuramı I · Hafta 9 — RL ve RC Devrelerinin Doğal Tepkisi (Bölüm 3.1–3.2) */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd1h09';
  const S = Object.assign({ answers: {}, steps: {}, st: {}, page: 'giris', f: {}, d1rows: [], d2rows: [], d3rows: [], d4rows: [] }, Lab.store.load(KEY));
  if (S.seed == null) S.seed = Math.floor(Math.random() * 1e9);
  const TARGETS = [2.2e-3, 4.7e-3, 6.8e-3, 15e-3, 33e-3, 68e-3];
  if (S.d3target == null) S.d3target = TARGETS[S.seed % TARGETS.length];
  Lab.answers = S.answers;
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => Lab.store.save(KEY, S), 300); };
  Lab.onAnswer = () => { save(); progress(); };
  const near = (a, b, t) => Math.abs(a - b) <= t;
  const par = (a, b) => (!isFinite(a) ? b : !isFinite(b) ? a : (a * b) / (a + b));
  // tohumlu sözde rastgele (öğrenciye özgü tolerans)
  const rnd = (k) => { let x = (S.seed ^ Math.imul(k | 0, 2654435761)) >>> 0; x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 100000) / 100000; };
  const Cact = (c) => c * (1 + (rnd(Math.round(Math.log(c) * 1000)) * 2 - 1) * (c >= 1e-6 ? 0.2 : 0.05));
  const RPROBE = 1e7, RDMM = 1e7;
  const ms = (t) => num(t * 1e3, 2);

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
  function chk(parent, html, val, on) {
    const l = document.createElement('label'); l.style.cssText = 'font-size:11px;display:block;margin-top:4px';
    l.innerHTML = `<input type="checkbox" ${val ? 'checked' : ''}> ${html}`; parent.appendChild(l);
    const i = l.firstChild; i.onchange = () => on(i.checked); return i;
  }

  /* ---------- şema yardımcıları ---------- */
  const sch = {
    w: (g, pts) => E('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'w' }, g),
    dot: (g, x, y) => E('circle', { cx: x, cy: y, r: 3.5, class: 'node' }, g),
    t: (g, x, y, s, cls = 'lbl', anchor = 'middle') => { const e = E('text', { x, y, class: cls, 'text-anchor': anchor }, g); e.innerHTML = s; return e; },
    rH(g, x1, x2, y) { const n = 6, L = 8, step = (x2 - x1 - 2 * L) / n; let d = `M${x1},${y} h${L}`; for (let i = 0; i < n; i++) d += ` l${step / 2},${i % 2 ? 7 : -7} l${step / 2},${i % 2 ? -7 : 7}`; d += ` L${x2},${y}`; return E('path', { d, class: 'w' }, g); },
    rV(g, x, y1, y2) { const n = 6, L = 8, step = (y2 - y1 - 2 * L) / n; let d = `M${x},${y1} v${L}`; for (let i = 0; i < n; i++) d += ` l${i % 2 ? 7 : -7},${step / 2} l${i % 2 ? -7 : 7},${step / 2}`; d += ` L${x},${y2}`; return E('path', { d, class: 'w' }, g); },
    gnd(g, x, y) { E('path', { d: `M${x},${y} v8 M${x - 11},${y + 8} h22 M${x - 7},${y + 13} h14 M${x - 3},${y + 18} h6`, class: 'w' }, g); },
    src(g, x, y, r = 20) { E('circle', { cx: x, cy: y, r, class: 'w', fill: '#fff' }, g); sch.t(g, x, y - 4, '+'); sch.t(g, x, y + 13, '−'); },
    term(g, x, y) { E('circle', { cx: x, cy: y, r: 4.5, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g); },
    capV(g, x, y1, y2) { const m = (y1 + y2) / 2; E('path', { d: `M${x},${y1} V${m - 5} M${x - 16},${m - 5} h32 M${x - 16},${m + 5} h32 M${x},${m + 5} V${y2}`, class: 'w' }, g); },
    indV(g, x, y1, y2) { const m = (y1 + y2) / 2, h = 64, s = m - h / 2; let d = `M${x},${y1} V${s}`; for (let i = 0; i < 4; i++) d += ` a9,8 0 0,1 0,16`; d += ` V${y2}`; return E('path', { d, class: 'w' }, g); },
    diodeUp(g, x, y1, y2) { const m = (y1 + y2) / 2; return E('path', { d: `M${x},${y2} V${m + 8} M${x - 10},${m + 8} h20 l-10,-15 z M${x - 10},${m - 7} h20 M${x},${m - 7} V${y1}`, class: 'w', fill: '#fff' }, g); },
    blade: (g) => E('line', { class: 'w', 'stroke-width': 3 }, g),
  };
  const setLine = (l, x1, y1, x2, y2) => { l.setAttribute('x1', x1); l.setAttribute('y1', y1); l.setAttribute('x2', x2); l.setAttribute('y2', y2); };

  /* ================= OSİLOSKOP (tek atış) ================= */
  const VDIV = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500];
  const TDIV = [1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2, 2e-2, 5e-2, 0.1, 0.2, 0.5, 1];
  const POSL = []; for (let p = -4; p <= 4.001; p += 0.5) POSL.push(+p.toFixed(1));
  const PRE = 1; // ön tetik (bölme)
  function mkScope(box, o) {
    const self = { armed: false, cap: null, dirty: true, tanOn: false };
    const d = document.createElement('div'); d.className = 'inst dark scopewrap'; d.style.cssText = 'flex:1;min-width:420px';
    d.innerHTML = `<div class="brand"><span>DSO-2C · Dijital Osiloskop · ${o.title || ''}</span><span><span class="led"></span> <span class="st">STOP</span></span></div>
      <div class="row" style="align-items:flex-start;flex-wrap:nowrap"><canvas width="640" height="400" style="width:100%;max-width:640px"></canvas>
      <div style="min-width:170px;max-width:200px"><div class="ctrls"></div><div class="row bt" style="margin:6px 0;gap:4px"></div><div class="meas"></div></div></div>
      <div style="font-size:11px;color:#9aa3b0;margin-top:4px">${o.note || ''}</div>`;
    box.appendChild(d);
    const cv = d.querySelector('canvas'), ctr = d.querySelector('.ctrls'), bt = d.querySelector('.bt'), meas = d.querySelector('.meas'), led = d.querySelector('.led'), st = d.querySelector('.st');
    const sc = new Lab.Scope(cv); self.scope = sc; self.canvas = cv;
    const set = () => (self.dirty = true);
    const K = (label, list, val, f, fmt) => { f(val); return new Lab.Knob(ctr, { label, list, value: val, dark: true, size: 40, fmt, onChange: (v) => { f(v); set(); } }); };
    self.k1 = K('CH1 V/d', VDIV, o.v1, (v) => (sc.ch[0].vdiv = v), (v) => eng(v, 'V'));
    self.k2 = K('CH2 V/d', VDIV, o.v2, (v) => (sc.ch[1].vdiv = v), (v) => eng(v, 'V'));
    self.kt = K('ZAMAN/d', TDIV, o.t, (v) => (sc.tdiv = v), (v) => eng(v, 's'));
    self.p1 = K('CH1 konum', POSL, o.p1 ?? -3, (v) => (sc.ch[0].pos = v), (v) => num(v, 1) + ' d');
    self.p2 = K('CH2 konum', POSL, o.p2 ?? -3, (v) => (sc.ch[1].pos = v), (v) => num(v, 1) + ' d');
    const B = (txt, on, f) => { const b = document.createElement('button'); b.className = 'seg-btn' + (on ? ' on' : ''); b.textContent = txt; b.onclick = () => { f(b); set(); }; bt.appendChild(b); return b; };
    B('CH1', true, (b) => { sc.ch[0].on = !sc.ch[0].on; b.classList.toggle('on', sc.ch[0].on); });
    B('CH2', true, (b) => { sc.ch[1].on = !sc.ch[1].on; b.classList.toggle('on', sc.ch[1].on); });
    self.curBtn = B('İMLEÇ', false, (b) => { sc.cur.on = !sc.cur.on; b.classList.toggle('on', sc.cur.on); });
    if (o.tan != null) self.tanBtn = B('TEĞET', false, (b) => { self.tanOn = !self.tanOn; b.classList.toggle('on', self.tanOn); });
    self.armBtn = B('SINGLE', false, () => self.arm());
    self.armBtn.style.background = '#6b4e00'; self.armBtn.style.color = '#ffd76a';
    sc.cur.a = PRE; sc.cur.b = PRE + 2;
    function status() {
      led.className = 'led' + (self.armed ? ' on' : self.cap ? ' on g' : '');
      st.textContent = self.armed ? 'ARMED · tetik bekleniyor' : self.cap ? "TRIG’D · STOP" : 'STOP';
    }
    self.arm = () => { self.armed = true; status(); Lab.toast('Osiloskop kuruldu (SINGLE). Şimdi anahtarı çevirin.'); };
    // src: {gen(ts)->[y1,y2], tan:{ch,v0,slope,vf}}
    self.trigger = (src) => { if (!self.armed) return false; self.armed = false; self.cap = src; self.cap.seed = Math.random() * 1e6; status(); set(); return true; };
    const n = 1000;
    function build() {
      const T = sc.tdiv * 10, ts = new Float64Array(n);
      for (let i = 0; i < n; i++) ts[i] = (i / (n - 1)) * T - PRE * sc.tdiv;
      const [a, b] = self.cap.gen(ts);
      let s = self.cap.seed | 0;
      const nz = () => { s = (Math.imul(s, 1103515245) + 12345) | 0; return ((s >>> 8) % 1000) / 1000 - 0.5; };
      for (let i = 0; i < n; i++) { a[i] += nz() * 0.03 * sc.ch[0].vdiv; b[i] += nz() * 0.03 * sc.ch[1].vdiv; }
      self.ts = ts; return { n, y: [a, b] };
    }
    sc.onMeasure = () => overlay();
    function overlay() {
      const g = sc.g, W = cv.width, H = cv.height, dy = H / 8, T = sc.tdiv * 10;
      const X = (t) => ((t + PRE * sc.tdiv) / T) * W;
      g.fillStyle = '#ff9a3c'; g.font = 'bold 12px Consolas'; g.fillText('T▼', X(0) - 8, 12);
      const c = self.cap;
      if (self.tanOn && c && c.tan) {
        const k = c.tan.ch, ch = sc.ch[k], Y = (v) => H / 2 - (v / ch.vdiv + ch.pos) * dy;
        const tEnd = c.tan.slope ? (c.tan.vf - c.tan.v0) / c.tan.slope : T;
        g.strokeStyle = '#ff9a3c'; g.lineWidth = 1.5; g.setLineDash([7, 5]);
        g.beginPath(); g.moveTo(X(0), Y(c.tan.v0)); g.lineTo(X(Math.min(tEnd, T * 2)), Y(c.tan.v0 + c.tan.slope * Math.min(tEnd, T * 2))); g.stroke();
        g.setLineDash([2, 4]); g.beginPath(); g.moveTo(0, Y(c.tan.vf)); g.lineTo(W, Y(c.tan.vf)); g.stroke(); g.setLineDash([]);
      }
      if (!c) { g.fillStyle = '#9fe0b0'; g.font = '15px Segoe UI'; g.fillText(self.armed ? 'Tetik bekleniyor… anahtarı çevirin (S)' : 'SINGLE ile kurun, sonra anahtarı çevirin', 150, H / 2 - 20); }
      showMeas();
    }
    function showMeas() {
      const v = self.curv();
      if (!v) { meas.innerHTML = sc.cur.on ? 'İmleç için önce bir olay yakalayın.' : 'İMLEÇ kapalı.'; return; }
      const f = (x, k) => eng(x, k === 1 && o.ch2unit ? o.ch2unit : 'V');
      meas.innerHTML = `<span style="color:#ff7cf0">İMLEÇ</span><br>t<sub>A</sub> ${eng(v.tA, 's')} · t<sub>B</sub> ${eng(v.tB, 's')}<br>Δt ${eng(v.tB - v.tA, 's')}` +
        `<br><span style="color:#f2d21b">CH1</span> A: ${f(v.y1A, 0)}<br>B: ${f(v.y1B, 0)} · B/A ${num(v.y1B / v.y1A, 3)}` +
        `<br><span style="color:#27c4f0">CH2</span> A: ${f(v.y2A, 1)}<br>B: ${f(v.y2B, 1)} · B/A ${num(v.y2B / v.y2A, 3)}`;
    }
    self.curv = () => {
      if (!sc.cur.on || !self.cap || !sc.data) return null;
      const T = sc.tdiv * 10, ia = Math.round((sc.cur.a / 10) * (n - 1)), ib = Math.round((sc.cur.b / 10) * (n - 1)), y = sc.data.y;
      return { tA: (sc.cur.a / 10) * T - PRE * sc.tdiv, tB: (sc.cur.b / 10) * T - PRE * sc.tdiv, y1A: y[0][ia], y1B: y[0][ib], y2A: y[1][ia], y2B: y[1][ib] };
    };
    self.draw = () => {
      if (sc.cur.drag) self.dirty = true;
      if (!self.dirty) return; self.dirty = false;
      if (self.cap) sc.draw(build()); else { sc.data = null; sc.draw(); overlay(); }
    };
    status();
    return self;
  }

  /* ================= RC TEZGÂHI (A: şarj, B: boşalma) ================= */
  function RCBench(pfx, cfg) {
    const self = { pos: 'A', vC: 0, dmm: false, last: null };
    const box = $('#' + pfx + 'inst');
    const ps = inst(box, 'DC GÜÇ KAYNAĞI · V<sub>g</sub>'); const psL = lcd(ps.el, 'V · mA', '', 150);
    const kV = new Lab.Knob(ps.c, { label: 'V_g', min: 0, max: 30, step: 0.1, value: cfg.Vg, dark: true, fmt: (v) => num(v, 1) + ' V' });
    const rb = inst(box, 'DİRENÇ KUTUSU', false);
    const kR1 = new Lab.Knob(rb.c, { label: 'R1 (şarj)', list: cfg.R1list, value: cfg.R1, fmt: Lab.ohm });
    const kR = new Lab.Knob(rb.c, { label: 'R (boşalma)', list: cfg.Rlist, value: cfg.R, fmt: Lab.ohm });
    const cb = inst(box, 'KONDANSATÖR KUTUSU', false);
    const kC = new Lab.Knob(cb.c, { label: 'C (nominal)', list: cfg.Clist, value: cfg.C, fmt: (v) => eng(v, 'F') + (v >= 1e-6 ? ' elk.' : '') });
    const sw = inst(box, 'ANAHTAR S · DMM', false); const dL = lcd(sw.el, 'DMM · v<sub>C</sub> (DC)', 'V', 120);
    const swB = document.createElement('button'); swB.className = 'btn'; swB.style.cssText = 'width:150px;padding:10px 6px;font-weight:700'; sw.c.appendChild(swB);
    chk(sw.c, 'DMM kapasitöre bağlı (10 MΩ)', false, (v) => (self.dmm = v));
    const btxt = () => (swB.innerHTML = self.pos === 'A' ? 'S: A (şarj)<br><small>çevir → B (t = 0)</small>' : 'S: B (boşalma)<br><small>çevir → A</small>');
    swB.onclick = () => self.toggle();
    // şema
    const g = $('#' + pfx + 'sch');
    sch.src(g, 60, 150); sch.w(g, [[60, 130], [60, 70], [100, 70]]); sch.rH(g, 100, 190, 70); sch.w(g, [[190, 70], [262, 70]]); sch.w(g, [[60, 170], [60, 200]]); sch.gnd(g, 60, 200);
    sch.term(g, 262, 70); sch.term(g, 338, 70); sch.t(g, 262, 56, 'A'); sch.t(g, 338, 56, 'B');
    sch.w(g, [[338, 70], [430, 70]]); sch.rV(g, 430, 70, 200); sch.gnd(g, 430, 200);
    const blade = sch.blade(g); sch.dot(g, 300, 112); sch.t(g, 318, 118, 'S', 'lbl', 'start');
    sch.w(g, [[300, 112], [300, 135]]); sch.capV(g, 300, 135, 185); sch.w(g, [[300, 185], [300, 200]]); sch.gnd(g, 300, 200);
    sch.dot(g, 300, 128); sch.w(g, [[300, 128], [240, 128]]); sch.term(g, 236, 128); sch.t(g, 230, 132, 'CH1', 'lbl', 'end').style.fill = '#b8960a';
    E('path', { d: 'M440,110 h22 m-6,-5 l6,5 l-6,5', class: 'w' }, g); sch.t(g, 470, 114, 'CH2: i<tspan font-size="10" dy="3">R</tspan>', 'lbl', 'start').style.fill = '#1592b8';
    sch.t(g, 26, 155, 'V<tspan font-size="10" dy="3">g</tspan>');
    const tVg = sch.t(g, 88, 160, '', 'val', 'start'), tR1 = sch.t(g, 145, 52, ''), tR = sch.t(g, 446, 150, '', 'lbl', 'start'), tC = sch.t(g, 322, 165, '', 'lbl', 'start'), tVc = sch.t(g, 322, 182, '', 'val', 'start'), tTau = sch.t(g, 600, 40, '', 'val');
    const tState = sch.t(g, 600, 62, '', 'val');
    sch.t(g, 600, 225, 'prob ×10 = 10 MΩ ‖ C', 'lbl').style.fill = '#777';

    const P = () => {
      const C = Cact(kC.value), RL = self.dmm ? par(RPROBE, RDMM) : RPROBE;
      return { Vg: kV.value, R1: kR1.value, R: kR.value, Cn: kC.value, C, RL, tc: par(kR1.value, RL) * C, vfc: (kV.value * RL) / (kR1.value + RL), td: par(kR.value, RL) * C };
    };
    self.P = P;
    self.update = (dt) => {
      const p = P();
      const tau = self.pos === 'A' ? p.tc : p.td, tgt = self.pos === 'A' ? p.vfc : 0;
      self.vC = tgt + (self.vC - tgt) * Math.exp(-dt / tau);
      const iS = self.pos === 'A' ? (p.Vg - self.vC) / p.R1 : 0;
      psL(`${num(p.Vg, 1)} V · ${num(iS * 1e3, 2)} mA`);
      dL(num(self.vC, Math.abs(self.vC) < 10 ? 3 : 2));
      btxt(); swB.classList.toggle('warn', self.pos === 'B');
      self.pos === 'A' ? setLine(blade, 300, 112, 264, 74) : setLine(blade, 300, 112, 336, 74);
      tVg.textContent = num(p.Vg, 1) + ' V'; tR1.textContent = 'R1 = ' + Lab.ohm(p.R1); tR.textContent = 'R = ' + Lab.ohm(p.R);
      tC.textContent = 'C = ' + eng(p.Cn, 'F'); tVc.textContent = 'v_C = ' + num(self.vC, 2) + ' V';
      tState.textContent = self.pos === 'A' ? 'A: kapasitör doluyor' : 'B: kapasitör R üzerinden boşalıyor';
      tTau.textContent = '';
      self.p = p;
    };
    self.toggle = () => {
      const p = P(), old = self.pos, V0 = self.vC;
      self.pos = old === 'A' ? 'B' : 'A';
      const dis = self.pos === 'B', tau = dis ? p.td : p.tc, vf = dis ? 0 : p.vfc;
      const src = {
        kind: dis ? 'dis' : 'chg', V0, tau, R: p.R, Cn: p.Cn, R1: p.R1,
        gen(ts) {
          const a = new Float64Array(ts.length), b = new Float64Array(ts.length);
          for (let i = 0; i < ts.length; i++) {
            const t = ts[i];
            if (t < 0) { a[i] = V0; b[i] = old === 'B' ? (V0 / p.R) * 1e3 : 0; }
            else { const v = vf + (V0 - vf) * Math.exp(-t / tau); a[i] = v; b[i] = dis ? (v / p.R) * 1e3 : 0; }
          }
          return [a, b];
        },
        tan: { ch: 0, v0: V0, slope: (vf - V0) / tau, vf },
      };
      if (self.scope && self.scope.trigger(src)) { self.last = src; S.f[pfx + 'cap'] = (S.f[pfx + 'cap'] || 0) + 1; if (self.onCap) self.onCap(src); save(); Lab.toast(dis ? '✔ Boşalma yakalandı (TRIG\'D).' : '✔ Şarj olayı yakalandı.'); }
      else if (dis) Lab.toast('Anahtar B\'ye çevrildi. Osiloskop kurulu değildi: olay kaydedilmedi. (Önce SINGLE)');
    };
    Object.assign(self, { kV, kR1, kR, kC });
    return self;
  }

  /* ================= RL TEZGÂHI ================= */
  const LLIST = [0.01, 0.047, 0.1, 0.18, 0.2, 0.47, 1];
  const RCOIL = { 0.01: 0.4, 0.047: 0.9, 0.1: 1.2, 0.18: 1.6, 0.2: 1.8, 0.47: 3.3, 1: 6.8 };
  const ILIM = 5;
  function RLBench(pfx, cfg) {
    const self = { closed: true, i: 0, diode: false, real: cfg.real, ohm: false, last: null };
    const box = $('#' + pfx + 'inst');
    const ps = inst(box, 'DC GÜÇ KAYNAĞI · V<sub>s</sub>', true, '<span class="led" id="' + pfx + 'cc"></span> CC'); const psL = lcd(ps.el, 'V · A (sınır 5 A)', '', 150);
    const kV = new Lab.Knob(ps.c, { label: 'V_s', min: 0, max: 30, step: 0.1, value: cfg.Vs, dark: true, fmt: (v) => num(v, 1) + ' V' });
    const rb = inst(box, 'GÜÇ DİRENÇLERİ', false);
    const kRa = new Lab.Knob(rb.c, { label: cfg.names[0], list: cfg.Ra, value: cfg.Ra0, fmt: Lab.ohm });
    const kRb = new Lab.Knob(rb.c, { label: cfg.names[1], list: cfg.Rb, value: cfg.Rb0, fmt: (v) => (isFinite(v) ? Lab.ohm(v) : 'açık') });
    const kRc = cfg.Rc ? new Lab.Knob(rb.c, { label: cfg.names[2], list: cfg.Rc, value: cfg.Rc0, fmt: Lab.ohm }) : { value: 0 };
    const lb = inst(box, 'BOBİN SETİ', false);
    const kL = new Lab.Knob(lb.c, { label: 'L', list: LLIST, value: cfg.L0, fmt: (v) => eng(v, 'H') });
    const rTxt = document.createElement('div'); rTxt.style.cssText = 'font-size:11px;margin-top:2px'; lb.c.appendChild(rTxt);
    chk(lb.c, 'Gerçek bobin (r<sub>L</sub>)', cfg.real, (v) => (self.real = v));
    if (cfg.diode) chk(lb.c, 'Serbest geçiş diyotu (1N4007)', false, (v) => (self.diode = v));
    const sw = inst(box, 'ANAHTAR S', false);
    const swB = document.createElement('button'); swB.className = 'btn'; swB.style.cssText = 'width:150px;padding:10px 6px;font-weight:700'; sw.c.appendChild(swB);
    swB.onclick = () => self.toggle();
    let ohmL;
    if (cfg.ohm) {
      const om = inst(box, 'OHMMETRE · bobin uçları', false); ohmL = lcd(om.el, 'Ω (bobin sökülü)', 'Ω', 120);
      const ob = document.createElement('button'); ob.className = 'seg-btn'; ob.textContent = 'Bobini sök + ölç'; om.c.appendChild(ob);
      ob.onclick = () => { self.ohm = !self.ohm; ob.classList.toggle('on', self.ohm); ob.textContent = self.ohm ? 'Bobini geri tak' : 'Bobini sök + ölç'; if (self.ohm) self.i = 0; };
    }
    // şema
    const g = $('#' + pfx + 'sch');
    sch.src(g, 60, 150); sch.w(g, [[60, 130], [60, 70], [96, 70]]); sch.term(g, 100, 70); sch.term(g, 150, 70); const blade = sch.blade(g);
    sch.t(g, 125, 52, 'S'); sch.w(g, [[154, 70], [180, 70]]); sch.rH(g, 180, 260, 70); sch.w(g, [[260, 70], [330, 70]]); sch.dot(g, 330, 70);
    sch.w(g, [[60, 170], [60, 210]]); sch.gnd(g, 60, 210); sch.t(g, 26, 155, 'V<tspan font-size="10" dy="3">s</tspan>');
    const gRb = E('g', {}, g), gD = E('g', {}, g);
    sch.w(gRb, [[330, 70], [330, 95]]); sch.rV(gRb, 330, 95, 185); sch.w(gRb, [[330, 185], [330, 210]]); sch.gnd(g, 330, 210);
    const gRbOpen = E('g', {}, g); sch.w(gRbOpen, [[330, 70], [330, 110]]); sch.w(gRbOpen, [[330, 170], [330, 210]]); sch.t(gRbOpen, 340, 145, 'açık', 'lbl', 'start').style.fill = '#c62828';
    sch.w(gD, [[330, 70], [400, 70], [400, 100]]); sch.diodeUp(gD, 400, 100, 180); sch.w(gD, [[400, 180], [400, 210], [330, 210]]);
    sch.w(g, [[330, 70], [470, 70]]);
    const gRc = E('g', {}, g); sch.rH(gRc, 470, 550, 70); const gRc0 = E('g', {}, g); sch.w(gRc0, [[470, 70], [550, 70]]);
    sch.w(g, [[550, 70], [620, 70], [620, 95]]); sch.indV(g, 620, 95, 185); sch.w(g, [[620, 185], [620, 210]]); sch.gnd(g, 620, 210);
    E('path', { d: 'M640,110 v22 m-5,-6 l5,6 l5,-6', class: 'w' }, g); sch.t(g, 648, 124, 'CH2: i<tspan font-size="10" dy="3">L</tspan>', 'lbl', 'start').style.fill = '#1592b8';
    sch.w(g, [[330, 70], [330, 40], [300, 40]]); sch.term(g, 296, 40); sch.t(g, 290, 44, 'CH1: v<tspan font-size="10" dy="3">düğüm</tspan>', 'lbl', 'end').style.fill = '#b8960a';
    const tVs = sch.t(g, 88, 160, '', 'val', 'start'), tRa = sch.t(g, 220, 52, ''), tRb = sch.t(g, 270, 145, '', 'lbl', 'end'), tRc = sch.t(g, 510, 52, ''), tL = sch.t(g, 640, 160, '', 'lbl', 'start'), tI = sch.t(g, 640, 180, '', 'val', 'start');
    const tVn = sch.t(g, 340, 30, '', 'val', 'start'), tMsg = sch.t(g, 520, 238, '', 'val');
    const gOhm = E('g', {}, g); E('rect', { x: 596, y: 88, width: 70, height: 104, fill: '#fff', stroke: '#e07a10', 'stroke-dasharray': '4 3' }, gOhm); sch.t(gOhm, 631, 145, 'Ω-metre', 'lbl').style.fill = '#e07a10';

    const P = () => {
      const L = kL.value, r = self.real ? RCOIL[L] : 0;
      return { Vs: kV.value, Ra: kRa.value, Rb: kRb.value, Rc: kRc.value, L, r, diode: self.diode };
    };
    self.P = P;
    // kalıcı (kapalı) durumda kaynak akımı sınırı
    const vsEff = (p) => {
      const Rbr = p.Rc + p.r, Rtot = p.Ra + par(p.Rb, Rbr), Is = p.Vs / Rtot;
      return Is > ILIM ? { v: p.Vs * (ILIM / Is), cc: true } : { v: p.Vs, cc: false };
    };
    const iss = (p) => { const vs = vsEff(p).v, Vth = isFinite(p.Rb) ? (vs * p.Rb) / (p.Ra + p.Rb) : vs, Rth = par(p.Ra, p.Rb); return Vth / (Rth + p.Rc + p.r); };
    const vb = (p, i, arcR) => {
      if (p.diode && i > 0) return Math.min(isFinite(p.Rb) ? i * p.Rb : 1e9, 0.7 + 0.05 * i);
      if (isFinite(p.Rb)) return i * p.Rb;
      return i > 0 ? i * arcR : 0;
    };
    const deriv = (p, i, closed, arcR) => {
      if (closed) { const vs = vsEff(p).v, Vth = isFinite(p.Rb) ? (vs * p.Rb) / (p.Ra + p.Rb) : vs, Rth = par(p.Ra, p.Rb); return (Vth - (Rth + p.Rc + p.r) * i) / p.L; }
      return -((p.Rc + p.r) * i + vb(p, i, arcR)) / p.L;
    };
    const vNode = (p, i, closed, arcR) => {
      if (closed) { const vs = vsEff(p).v; return isFinite(p.Rb) ? (vs / p.Ra - i) / (1 / p.Ra + 1 / p.Rb) : vs - i * p.Ra; }
      return -vb(p, i, arcR);
    };
    const pathless = (p) => !isFinite(p.Rb) && !p.diode;
    const stepI = (p, i, closed, arcR, dt) => {
      const Rt = closed ? par(p.Ra, p.Rb) + p.Rc + p.r : p.Rc + p.r + (isFinite(p.Rb) ? p.Rb : p.diode ? 0.05 : arcR);
      const tau = p.L / Math.max(Rt, 1e-3), hmax = tau / 40;
      const nst = Math.min(20000, Math.max(1, Math.ceil(dt / hmax))), h = dt / nst;
      for (let k = 0; k < nst; k++) {
        const k1 = deriv(p, i, closed, arcR), k2 = deriv(p, i + (h * k1) / 2, closed, arcR), k3 = deriv(p, i + (h * k2) / 2, closed, arcR), k4 = deriv(p, i + h * k3, closed, arcR);
        let ni = i + (h * (k1 + 2 * k2 + 2 * k3 + k4)) / 6;
        if (!closed && ((p.diode && !isFinite(p.Rb)) || pathless(p)) && ni < 0) ni = 0;
        i = ni;
      }
      return i;
    };
    let arcRnow = 1e6;
    self.update = (dt) => {
      const p = P(); self.p = p;
      if (self.ohm) { self.i = 0; }
      else self.i = stepI(p, self.i, self.closed, arcRnow, Math.min(dt, 0.1));
      const ve = vsEff(p), vn = self.ohm ? 0 : vNode(p, self.i, self.closed, arcRnow);
      const Is = self.closed && !self.ohm ? (ve.v - vn) / p.Ra : 0;
      psL(`${num(self.closed ? ve.v : p.Vs, 1)} V · ${num(Is, 2)} A`);
      $('#' + pfx + 'cc').classList.toggle('on', self.closed && ve.cc);
      swB.innerHTML = self.closed ? 'S: KAPALI<br><small>aç → t = 0</small>' : 'S: AÇIK<br><small>kapat</small>';
      swB.classList.toggle('warn', !self.closed);
      self.closed ? setLine(blade, 104, 70, 146, 70) : setLine(blade, 104, 70, 142, 46);
      gRb.style.display = isFinite(p.Rb) ? '' : 'none'; gRbOpen.style.display = isFinite(p.Rb) ? 'none' : '';
      gD.style.display = p.diode ? '' : 'none'; gRc.style.display = p.Rc ? '' : 'none'; gRc0.style.display = p.Rc ? 'none' : '';
      gOhm.style.display = self.ohm ? '' : 'none';
      rTxt.innerHTML = 'r<sub>L</sub> = ' + num(RCOIL[p.L], 1) + ' Ω';
      tVs.textContent = num(p.Vs, 1) + ' V'; tRa.textContent = cfg.names[0] + ' = ' + Lab.ohm(p.Ra); tRb.textContent = cfg.names[1] + ' = ' + (isFinite(p.Rb) ? Lab.ohm(p.Rb) : '∞');
      tRc.textContent = p.Rc ? cfg.names[2] + ' = ' + Lab.ohm(p.Rc) : ''; tL.textContent = 'L = ' + eng(p.L, 'H') + (p.r ? ' (r = ' + num(p.r, 1) + ' Ω)' : '');
      tI.textContent = 'i_L = ' + num(self.i, 3) + ' A'; tVn.textContent = 'v = ' + num(vn, 2) + ' V';
      tMsg.textContent = self.closed && ve.cc ? 'Kaynak akım sınırında (CC)!' : '';
      if (ohmL) {
        if (!self.ohm) ohmL('—');
        else if (self.closed && p.Vs > 0.05) { ohmL('HATA'); if (!self.ohmWarn) { Lab.toast('Ohmmetre enerjili devrede ölçüm yapamaz! Önce anahtarı açın ya da kaynağı söndürün (V_s = 0).', 4500); self.ohmWarn = true; } }
        else { self.ohmWarn = false; const R = p.Rc + (self.closed ? par(p.Ra, p.Rb) : p.Rb); ohmL(isFinite(R) ? num(R, 2) : 'O.L'); self.ohmR = R; self.ohmOpen = !self.closed; }
      }
    };
    self.toggle = () => {
      if (self.ohm) { Lab.toast('Önce bobini geri takın.'); return; }
      const p = P(), wasClosed = self.closed, I0 = self.i;
      self.closed = !self.closed;
      const nowClosed = self.closed;
      let arcR = 1e6;
      if (!nowClosed && pathless(p) && I0 > 0.01) {
        const vpk = Math.min(I0 * Math.sqrt(p.L / 1e-10), 1500); arcR = vpk / I0;
        S.f[pfx + 'arc'] = true; save();
        Lab.toast(`⚡ ARK! Bobin akımının yolu yok: anahtar kontaklarında ≈${num(vpk, 0)} V. Gerçek devrede kontak yanar, yarı iletkenler delinir.`, 6000);
      } else if (!nowClosed && I0 > 0.01) {
        const vpk = vb(p, I0, arcR);
        if (vpk > 60) Lab.toast(`Dikkat: anahtar açılırken düğüm −${num(vpk, 0)} V’a sıçradı; kontaklar arasında ≈${num(vpk + p.Vs, 0)} V var.`, 4500);
      }
      arcRnow = arcR;
      const vn0 = vNode(p, I0, wasClosed, arcR);
      const src = {
        kind: nowClosed ? 'on' : 'off', I0, p: Object.assign({}, p), vn0p: vNode(p, I0, nowClosed, arcR), arc: arcR < 1e6,
        gen(ts) {
          const a = new Float64Array(ts.length), b = new Float64Array(ts.length);
          let i = I0, t = 0;
          for (let k = 0; k < ts.length; k++) {
            const tk = ts[k];
            if (tk < 0) { a[k] = vn0; b[k] = I0; continue; }
            i = stepI(p, i, nowClosed, arcR, tk - t); t = tk;
            a[k] = vNode(p, i, nowClosed, arcR); b[k] = i;
          }
          return [a, b];
        },
        tan: { ch: 1, v0: I0, slope: deriv(p, I0, nowClosed, arcR), vf: nowClosed ? iss(p) : 0 },
      };
      if (self.scope && self.scope.trigger(src)) {
        self.last = src; if (!nowClosed) { S.f[pfx + 'cap'] = (S.f[pfx + 'cap'] || 0) + 1; if (p.diode && I0 > 0.05) S.f[pfx + 'dio'] = true; }
        if (self.onCap) self.onCap(src); save(); if (!src.arc) Lab.toast('✔ Olay yakalandı (TRIG\'D).');
      } else if (!nowClosed && !src.arc) Lab.toast('Anahtar açıldı. Osiloskop kurulu değildi: olay kaydedilmedi. (Önce SINGLE)');
    };
    self.iss = () => iss(P());
    Object.assign(self, { kV, kRa, kRb, kRc, kL });
    self.i = iss(P());
    return self;
  }

  /* ================= GEZİNME / İLERLEME ================= */
  const pages = ['giris', 'onbilgi', 'onhaz', 'd1', 'd2', 'd3', 'd4', 'rapor'];
  function go(p) {
    S.page = p; save();
    $$('section.page').forEach((s) => s.classList.toggle('active', s.id === p));
    $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.p === p));
    const B = benches[p]; if (B) B.scope.dirty = true;
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
  numq('onhaz', '#preQ', { id: 'p1', q: '1) Örnek 3.1: V<sub>s</sub> = 24 V, R<sub>1</sub> = 12 Ω, L = 200 mH, R = 10 Ω. Anahtar uzun süre kapalı kaldıktan sonra t = 0\'da açılıyor. I<sub>0</sub> kaç amperdir?', answer: 2, unit: 'A', explain: 'Kalıcı durumda bobin kısa devredir ve R\'yi de kısa devre eder: I<sub>0</sub> = 24/12 = 2 A.', hint: 'Kalıcı durumda bobin nasıl davranır? R\'den akım geçer mi?' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) Aynı devrede zaman sabiti τ kaç ms\'dir?', answer: 20, unit: 'ms', explain: 'τ = L/R = 0,2/10 = 20 ms. R<sub>1</sub> anahtarla birlikte devreden çıktığı için τ\'ya girmez.', hint: 'τ\'yu anahtar AÇILDIKTAN sonraki devreden bulun.' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) t = 20 ms\'de bobin akımı kaç amperdir?', answer: 0.736, tol: 1, unit: 'A', explain: 'i = 2e<sup>−1</sup> = 0,736 A; enerjinin ise yalnızca %13,5\'i kalmıştır.', hint: 't = τ anında e<sup>−1</sup> = 0,368.' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) Örnek 3.2: V<sub>g</sub> = 100 V, R<sub>1</sub> = 20 kΩ, C = 0,5 µF, R = 80 kΩ. Boşalmanın zaman sabiti kaç ms\'dir?', answer: 40, unit: 'ms', explain: 'τ = RC = 80 k × 0,5 µ = 40 ms.', hint: 'Kapasitörün t &gt; 0\'da gördüğü direnç hangisi?' });
  numq('onhaz', '#preQ', { id: 'p5', q: '5) Örnek 3.3: V<sub>0</sub> = 100 V, τ = 40 ms. Gerilim kaç ms\'de 24 V\'a iner?', answer: 57.1, tol: 1.5, unit: 'ms', explain: 't = τ ln(100/24) = 40 × 1,427 = 57,1 ms = 1,43τ.', hint: '100e<sup>−t/τ</sup> = 24 eşitliğinde iki yanın ln\'ini alın.' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) Örnek 3.1\'de anahtar açılmadan hemen önce bobin gerilimi 0 V\'tur. Açıldıktan hemen sonra bobin gerilimi nedir?', opts: ['Yine 0 V; gerilim de sıçramaz', '−20 V; akım aynı kaldığı için', '24 V; kaynak gerilimi', 'Belirsiz'], correct: 1, explain: 'i(0<sup>+</sup>) = 2 A, R\'den geçer: v<sub>R</sub> = 20 V, KVL ile v<sub>L</sub> = −20 V. Süreklilik yalnızca akım içindir.', hint: 'Hangi büyüklük süreklidir: bobin akımı mı, bobin gerilimi mi?' });
  mcq('onhaz', '#preQ', { id: 'p7', q: '7) Aynı R ve C ile biri 100 V\'a, diğeri 10 V\'a yüklenen iki kapasitör boşalıyor. Hangisi daha çabuk yarılanır?', opts: ['100 V\'luk', '10 V\'luk', 'İkisi aynı sürede yarılanır', 'C\'ye bağlıdır'], correct: 2, explain: 't<sub>½</sub> = τ ln2 = 0,693τ; V<sub>0</sub> oranda sadeleşir.', hint: 'V<sub>0</sub>e<sup>−t/τ</sup> = V<sub>0</sub>/2 eşitliğini çözün.' });

  /* ================= DENEY 1 · RC boşalması ================= */
  const RL1 = [1e3, 2.2e3, 4.7e3, 10e3, 20e3, 47e3];
  const RL2 = [10e3, 22e3, 40e3, 47e3, 80e3, 100e3, 220e3, 470e3, 1e6];
  const CL1 = [0.1e-6, 0.22e-6, 0.47e-6, 0.5e-6, 1e-6, 2.2e-6, 4.7e-6, 10e-6];
  const D1 = RCBench('d1', { Vg: 0, R1: 20e3, R: 80e3, C: 0.5e-6, R1list: RL1, Rlist: RL2, Clist: CL1 });
  D1.scope = mkScope($('#d1scope'), { title: 'CH1 v<sub>C</sub> · CH2 i<sub>R</sub>', v1: 2, v2: 0.05, t: 0.01, tan: 0, ch2unit: 'mA', note: 'CH1: ×10 prob (10 MΩ) kapasitör üstünde · CH2: akım probu, 1 V ≙ 1 mA (değerler mA olarak gösterilir) · İlk bölme ön tetiktir.' });
  function recTable(key, cols, map) {
    const tb = $('#' + key + 'tab tbody');
    tb.innerHTML = S[key + 'rows'].map((r, i) => `<tr><td>${i + 1}</td>${map(r).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
    tb.parentElement.parentElement.scrollTop = 1e6;
  }
  const d1map = (r) => [r.kind === 'dis' ? 'boşalma' : 'şarj', Lab.ohm(r.R), eng(r.Cn, 'F'), num(r.V0, 2), ms(r.tA), ms(r.tB), ms(r.tB - r.tA), num(r.vB / r.vA, 3)];
  const d1table = () => recTable('d1', 0, d1map);
  function d1rec() {
    const v = D1.scope.curv(), c = D1.scope.cap;
    if (!v) return Lab.toast('Önce bir olay yakalayın ve İMLEÇ\'i açın.');
    S.d1rows.push({ kind: c.kind, R: c.R, Cn: c.Cn, V0: c.V0, tau: c.tau, tA: v.tA, tB: v.tB, vA: v.y1A, vB: v.y1B }); save(); d1table();
    Lab.toast(`Kaydedildi: Δt = ${ms(v.tB - v.tA)} ms, v_B/v_A = ${num(v.y1B / v.y1A, 3)}`);
  }
  $('#d1rec').onclick = d1rec;
  $('#d1del').onclick = () => { S.d1rows.pop(); save(); d1table(); };
  $('#d1csv').onclick = () => Lab.downloadCSV('hafta9_deney1.csv', ['#', 'olay', 'R (ohm)', 'C nom (F)', 'V0 (V)', 'tA (ms)', 'tB (ms)', 'dt (ms)', 'vB/vA'], S.d1rows.map((r, i) => [i + 1, r.kind, r.R, r.Cn, +r.V0.toFixed(3), +(r.tA * 1e3).toFixed(3), +(r.tB * 1e3).toFixed(3), +((r.tB - r.tA) * 1e3).toFixed(3), +(r.vB / r.vA).toFixed(4)]));
  d1table();
  const ex32 = () => D1.kR1.value === 20e3 && D1.kR.value === 80e3 && D1.kC.value === 0.5e-6;
  const isTauRow = (r) => r.kind === 'dis' && Math.abs(r.tA) < 0.03 * r.tau && near(r.vB / r.vA, 0.368, 0.025);
  steps('d1', [
    { t: 'Örnek 3.2 elemanlarını seçin: <b>R<sub>1</sub> = 20 kΩ, R = 80 kΩ, C = 0,5 µF</b>; kaynağı <b>10 V</b> yapın (tezgâh kaynağı 30 V\'a kadar; ders örneğindeki 100 V yerine).', test: () => ex32() && near(D1.kV.value, 10, 0.05) },
    { t: 'Anahtar A\'dayken kapasitörün dolmasını bekleyin: DMM ≈ 10 V göstermeli (en az 5R<sub>1</sub>C = 50 ms).', test: () => D1.pos === 'A' && D1.p && D1.vC > 0.99 * D1.p.vfc && D1.vC > 5 },
    { t: 'Osiloskobu <b>SINGLE</b> ile kurun (<kbd>A</kbd>), sonra anahtarı <b>B</b>\'ye çevirin (<kbd>S</kbd>). Boşalma ekranda donmalı.', test: () => (S.f.d1cap || 0) > 0 && D1.scope.cap && D1.scope.cap.kind === 'dis' },
    { t: 'ZAMAN/d\'yi tüm boşalma (≈5τ) ekrana sığacak biçimde seçin; <b>TEĞET</b>\'i açıp sıfır çizgisini kestiği anı okuyun.', test: () => D1.scope.cap && D1.scope.tanOn && D1.scope.scope.tdiv * 9 >= 4 * D1.scope.cap.tau && D1.scope.scope.tdiv * 9 <= 20 * D1.scope.cap.tau },
    { t: '<b>%36,8 yöntemi:</b> İMLEÇ A\'yı t = 0\'a, B\'yi v<sub>B</sub>/v<sub>A</sub> ≈ 0,368 noktasına koyup kaydedin (<kbd>R</kbd>).', test: () => S.d1rows.some(isTauRow) },
    { t: 'R\'yi ya da C\'yi değiştirip deneyi yineleyin; <b>farklı</b> bir τ için de %36,8 ölçümü kaydedin.', test: () => { const L = S.d1rows.filter(isTauRow); return L.some((r) => Math.abs(r.tau - L[0].tau) > 0.1 * L[0].tau); } },
  ]);
  const tau32 = () => par(80e3, RPROBE) * Cact(0.5e-6);
  numq('d1', '#d1Q', { id: 'd1q1', q: 'Elemanların <b>nominal</b> değerleriyle (R = 80 kΩ, C = 0,5 µF) τ kaç ms\'dir?', answer: 40, tol: 1, unit: 'ms', explain: 'τ = RC = 40 ms.', hint: 'τ = RC; kΩ × µF = ms.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'Osiloskopta <b>ölçtüğünüz</b> τ kaç ms\'dir (R = 80 kΩ, C = 0,5 µF)?', answer: tau32, tol: 4, unit: 'ms', explain: 'Ölçülen değer nominalden kondansatör toleransı (±%5) ve prob yükü kadar farklıdır.', hint: '%36,8 noktasının zamanını ya da teğetin sıfırı kestiği anı okuyun.' });
  D1.scope.ansScale = 1;
  numq('d1', '#d1Q', { id: 'd1q3', q: 'V<sub>0</sub> = 10 V, R = 80 kΩ iken boşalma akımının t = 0<sup>+</sup> değeri kaç mA\'dir? (CH2\'de görün.)', answer: 0.125, tol: 2, unit: 'mA', explain: 'i(0<sup>+</sup>) = V<sub>0</sub>/R = 0,125 mA; t = 0<sup>−</sup>\'da 0 idi: akım sıçradı, gerilim sıçramadı.', hint: 'Gerilim sürekli: v(0<sup>+</sup>) = V<sub>0</sub>; Ohm yasası.' });
  mcq('d1', '#d1Q', { id: 'd1q4', q: 'Teğet yöntemi ile %36,8 yönteminin verdiği τ değerleri için ne söylenebilir?', opts: ['Teğet her zaman 2τ verir', 'İkisi de aynı τ\'yu verir; teğet başlangıç eğimi −V<sub>0</sub>/τ\'dan gelir', '%36,8 yöntemi yalnızca RL devrelerinde geçerlidir', 'Teğet yöntemi V<sub>0</sub>\'a bağlı olarak değişir'], correct: 1, explain: 'dv/dt(0) = −V<sub>0</sub>/τ; bu eğimle giden doğru tam τ anında sıfıra varır.', hint: 'Başlangıç eğimini türev alarak bulun.' });
  mcq('d1', '#d1Q', { id: 'd1q5', q: 'R = 1 MΩ, C = 1 µF ile hesaplanan τ = 1 s iken ölçülen τ ≈ 0,91 s (DMM de bağlıysa daha da az) çıkıyor. En olası neden?', opts: ['Osiloskop zaman tabanı hatalı', 'Prob (10 MΩ) ve DMM (10 MΩ) boşalma direncine paralel girer, eşdeğer R küçülür', 'Kapasitör ters bağlanmış', 'Anahtarın direnci τ\'yu büyütür'], correct: 1, explain: '1 MΩ ‖ 10 MΩ = 0,909 MΩ. Yüksek empedanslı devrelerde ölçü aletinin yükü ihmal edilemez. (Elektrolitik toleransı da ±%20 ekler.)', hint: 'Ölçü aletinin giriş direnci nereye bağlı?' });
  numq('d1', '#d1Q', { id: 'd1q6', q: 'Örnek 3.3: Boşalma süresini yarıya indirmek için C = 0,5 µF ile R kaç kΩ olmalıdır?', answer: 40, unit: 'kΩ', explain: 'τ<sub>yeni</sub> = 20 ms = R × 0,5 µF → R = 40 kΩ. Kutuda 40 kΩ var; deneyip doğrulayın!', hint: 'Süre τ ile doğru orantılıdır.' });

  /* ================= DENEY 2 · RL doğal tepki ================= */
  const D2 = RLBench('d2', { Vs: 0, Ra: [6, 12, 22, 47], Ra0: 12, Rb: [4.7, 10, 22, 47, 100, 220, 470, 1000, Infinity], Rb0: 10, L0: 0.2, real: true, diode: true, names: ['R1', 'R'] });
  D2.scope = mkScope($('#d2scope'), { title: 'CH1 v<sub>düğüm</sub> · CH2 i<sub>L</sub>', v1: 10, v2: 0.5, t: 0.005, p1: 0, p2: -3, tan: 1, ch2unit: 'A', note: 'CH1: düğüm gerilimi (×10 prob) · CH2: akım probu 1 V ≙ 1 A (değerler A olarak gösterilir) · TEĞET akım (CH2) eğrisine çizilir.' });
  const d2map = (r) => [eng(r.L, 'H'), isFinite(r.Rb) ? Lab.ohm(r.Rb) : '∞', r.diode ? 'var' : '—', num(r.I0, 3), num(r.vn0, 1), ms(r.tA), ms(r.tB), num(r.iB / r.iA, 3)];
  const d2table = () => recTable('d2', 0, d2map);
  function d2rec() {
    const v = D2.scope.curv(), c = D2.scope.cap;
    if (!v) return Lab.toast('Önce bir olay yakalayın ve İMLEÇ\'i açın.');
    if (c.kind !== 'off') return Lab.toast('Bu deneyde anahtarın AÇILMA olayını kaydedin.');
    S.d2rows.push({ L: c.p.L, r: c.p.r, Rb: c.p.Rb, Rc: c.p.Rc, diode: c.p.diode, I0: c.I0, vn0: c.vn0p, tA: v.tA, tB: v.tB, iA: v.y2A, iB: v.y2B }); save(); d2table();
    Lab.toast(`Kaydedildi: Δt = ${ms(v.tB - v.tA)} ms, i_B/i_A = ${num(v.y2B / v.y2A, 3)}`);
  }
  $('#d2rec').onclick = d2rec;
  $('#d2del').onclick = () => { S.d2rows.pop(); save(); d2table(); };
  $('#d2csv').onclick = () => Lab.downloadCSV('hafta9_deney2.csv', ['#', 'L (H)', 'R (ohm)', 'diyot', 'I0 (A)', 'v(0+) (V)', 'tA (ms)', 'tB (ms)', 'iB/iA'], S.d2rows.map((r, i) => [i + 1, r.L, isFinite(r.Rb) ? r.Rb : 'acik', r.diode ? 'var' : 'yok', +r.I0.toFixed(4), +r.vn0.toFixed(2), +(r.tA * 1e3).toFixed(3), +(r.tB * 1e3).toFixed(3), +(r.iB / r.iA).toFixed(4)]));
  d2table();
  const ex31 = () => { const p = D2.p; return p && near(p.Vs, 24, 0.05) && p.Ra === 12 && p.Rb === 10 && p.L === 0.2 && !p.diode; };
  const tauRowRL = (r) => Math.abs(r.tA) < 1e-4 + 0.03 * r.tB && near(r.iB / r.iA, 0.368, 0.025);
  steps('d2', [
    { t: 'Örnek 3.1: <b>V<sub>s</sub> = 24 V, R<sub>1</sub> = 12 Ω, L = 200 mH, R = 10 Ω</b>, diyot yok. Anahtar kapalıyken akımın oturmasını bekleyin (ideal bobinde i<sub>L</sub> = 2 A; gerçek bobinde r<sub>L</sub> = 1,8 Ω yüzünden ≈ 1,5 A).', test: () => ex31() && D2.closed && Math.abs(D2.i - D2.iss()) < 0.01 * D2.iss() },
    { t: 'SINGLE ile kurup anahtarı <b>açın</b>. CH1\'de düğüm geriliminin 0\'dan negatife <b>sıçradığını</b>, CH2\'de akımın <b>sürekli</b> kaldığını görün.', test: () => (S.f.d2cap || 0) > 0 && D2.scope.cap && D2.scope.cap.kind === 'off' && D2.scope.cap.p.Rb === 10 },
    { t: 'İMLEÇ A\'yı t = 0\'a, B\'yi i<sub>B</sub>/i<sub>A</sub> ≈ 0,368\'e koyup kaydedin. τ, L/R = 20 ms mi, yoksa bobin direnci yüzünden daha mı kısa?', test: () => S.d2rows.some((r) => r.Rb === 10 && tauRowRL(r)) },
    { t: 'R\'yi <b>47 Ω ya da daha büyük</b> yapıp ölçümü yineleyin ve kaydedin: τ kısaldı mı, gerilim sıçraması büyüdü mü?', test: () => S.d2rows.some((r) => isFinite(r.Rb) && r.Rb >= 47 && !r.diode && tauRowRL(r)) },
    { t: 'R\'yi <b>açık</b> yapıp (diyot yok) anahtarı açın: ark uyarısını görün. Sonra <b>serbest geçiş diyotunu</b> takıp olayı yakalayın: sönüm nasıl değişti?', test: () => S.f.d2arc && S.f.d2dio },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'Örnek 3.1 (R = 10 Ω) anahtar açıldığı anda düğüm gerilimi (R\'nin üst ucu) kaç volta sıçrar? <i>(ideal bobin, I<sub>0</sub> = 2 A)</i>', answer: -20, tol: 1, unit: 'V', explain: 'v(0<sup>+</sup>) = −I<sub>0</sub>R = −20 V. Akım R\'den yukarı doğru geçer.', hint: 'Bobin akımı R\'den hangi yönde akar?' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'Gerçek bobin (200 mH, r<sub>L</sub> = 1,8 Ω) ve R = 10 Ω için τ kaç ms\'dir?', answer: (0.2 / 11.8) * 1e3, tol: 2, unit: 'ms', explain: 'τ = L/(R + r<sub>L</sub>) = 0,2/11,8 = 16,9 ms. Ölçümünüz bunu doğrulamalı.', hint: 'Sönüm çevriminde r<sub>L</sub> ile R seridir.' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 't = τ anında bobinde başlangıç enerjisinin yüzde kaçı kalır?', answer: 13.5, tol: 2, unit: '%', explain: 'w ∝ i<sup>2</sup> → e<sup>−2</sup> = 0,135.', hint: 'Enerji akımın karesiyle orantılı.' });
  numq('d2', '#d2Q', { id: 'd2q4', q: 'İdeal bobin, I<sub>0</sub> = 2 A, L = 200 mH. Başlangıçta depolanan enerji kaç joule\'dür?', answer: 0.4, tol: 1, unit: 'J', explain: '½LI<sub>0</sub><sup>2</sup> = 0,5 × 0,2 × 4 = 0,4 J; tamamı R\'de ısıya dönüşür.', hint: 'w = ½Li<sup>2</sup>' });
  mcq('d2', '#d2Q', { id: 'd2q5', q: 'R = 10 Ω yerine R = 100 Ω kullanılırsa ne olur?', opts: ['τ büyür, gerilim sıçraması küçülür', 'τ küçülür (hızlı söner), ama anahtar açılırken gerilim −200 V\'a sıçrar', 'Hiçbir şey değişmez', 'I<sub>0</sub> küçülür'], correct: 1, explain: 'τ = L/R; v(0<sup>+</sup>) = −I<sub>0</sub>R. Hızlı kesme ile düşük gerilim arasında tasarım dengesi vardır (ders notu: kontak arkı).', hint: 'I<sub>0</sub> eski devreden gelir; R yalnızca t &gt; 0 devresinde.' });
  mcq('d2', '#d2Q', { id: 'd2q6', q: 'Serbest geçiş diyotu takıldığında akım neden daha <b>yavaş</b> söner?', opts: ['Diyot akımı artırır', 'Bobin gerilimi ≈ 0,7 V\'ta sınırlanır; di/dt = −v/L küçük kalır, enerji ancak yavaşça harcanır', 'Diyot bobinin endüktansını büyütür', 'Diyot kaynağı yeniden bağlar'], correct: 1, explain: 'Gerilim küçük → di/dt küçük. Bu yüzden rölelerde hızlı bırakma istenirse diyota seri bir direnç ya da zener eklenir.', hint: 'v = L di/dt; v küçükse di/dt?' });

  /* ================= DENEY 3 · τ tasarımı ve ln ================= */
  const E12 = []; [1e3, 1e4, 1e5].forEach((d) => [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2].forEach((m) => E12.push(+(m * d).toPrecision(3)))); E12.push(1e6);
  const CL3 = [10e-9, 22e-9, 47e-9, 0.1e-6, 0.22e-6, 0.47e-6, 1e-6, 2.2e-6, 4.7e-6, 10e-6, 22e-6, 47e-6, 100e-6];
  const D3 = RCBench('d3', { Vg: 12, R1: 1e3, R: 10e3, C: 0.1e-6, R1list: [100, 470, 1e3, 2.2e3], Rlist: E12, Clist: CL3 });
  D3.scope = mkScope($('#d3scope'), { title: 'CH1 v<sub>C</sub> · CH2 i<sub>R</sub>', v1: 2, v2: 0.5, t: 0.002, tan: 0, ch2unit: 'mA', note: 'Kaydet (R), B imlecindeki zamanı ve CH1 değerini nokta tablosuna ekler.' });
  D3.onCap = (c) => { if (c.kind === 'dis') { S.d3cap = (S.d3cap || 0) + 1; S.d3tau = c.tau; S.d3RCn = c.R * c.Cn; S.d3win = D3.scope.scope.tdiv * 9; save(); } };
  $('#d3target').innerHTML = `<b>Hedef:</b> boşalma zaman sabiti <b>τ = ${eng(S.d3target, 's')}</b> (nominal değerlerle ±%5 içinde). Şarj için küçük bir R<sub>1</sub> seçin ki kapasitör çabuk dolsun.`;
  const d3plot = new Lab.Plot($('#d3plot'), { xlabel: 't  (ms)', ylabel: 'ln(v / V0)' });
  const d3pts = () => S.d3rows.filter((r) => r.cap === S.d3cap && r.v > 0 && r.t >= 0);
  function d3fit() {
    const L = d3pts(); if (L.length < 2) return null;
    const X = L.map((r) => r.t * 1e3), Y = L.map((r) => Math.log(r.v / r.V0)), n = L.length;
    const mx = X.reduce((a, b) => a + b, 0) / n, my = Y.reduce((a, b) => a + b, 0) / n;
    const sxx = X.reduce((s, x) => s + (x - mx) ** 2, 0); if (sxx < 1e-12) return null;
    const m = X.reduce((s, x, i) => s + (x - mx) * (Y[i] - my), 0) / sxx;
    const ssr = Y.reduce((s, y, i) => s + (y - (my + m * (X[i] - mx))) ** 2, 0), sst = Y.reduce((s, y) => s + (y - my) ** 2, 0);
    return { m, b: my - m * mx, n, r2: sst ? 1 - ssr / sst : 1, tmax: Math.max(...X) };
  }
  function d3draw() {
    const L = d3pts(), f = d3fit();
    const pts = L.map((r) => [r.t * 1e3, Math.log(r.v / r.V0)]);
    const xm = Math.max(1e-3, ...pts.map((p) => p[0]), (S.d3tau || S.d3target) * 3e3) * 1.05, ym = Math.min(-1, ...pts.map((p) => p[1])) * 1.1;
    const ser = [{ pts, dots: true, color: '#0b5cad' }];
    if (f) ser.push({ pts: [[0, f.b], [xm, f.b + f.m * xm]], line: true, color: '#0b5cad', width: 1.5 });
    if ($('#d3theo').checked && S.d3RCn) ser.push({ pts: [[0, 0], [xm, -xm / (S.d3RCn * 1e3)]], line: true, color: '#e07a10', dash: [6, 4] });
    d3plot.draw(ser, [0, xm], [ym, 0.2]);
    $('#d3fit').innerHTML = f ? `En küçük kareler (${f.n} nokta, son kayıt): <b>eğim m = ${num(f.m, 4)} 1/ms</b> · kesim ${num(f.b, 3)} · R² = ${num(f.r2, 4)}. τ’yu eğimden siz hesaplayın.` : 'Son yakalanan boşalmadan en az 2 nokta kaydedin (B imlecini eğri boyunca gezdirin).';
  }
  $('#d3theo').onchange = d3draw;
  const d3map = (r) => [ms(r.t), num(r.v, 3), num(r.v / r.V0, 4), r.v > 0 ? num(Math.log(r.v / r.V0), 4) : '—'];
  const d3table = () => { recTable('d3', 0, (r) => d3map(r)); d3draw(); };
  function d3rec() {
    const v = D3.scope.curv(), c = D3.scope.cap;
    if (!v) return Lab.toast('Önce bir boşalma yakalayın ve İMLEÇ\'i açın.');
    if (c.kind !== 'dis') return Lab.toast('Bu deneyde boşalma (A → B) olayını kullanın.');
    S.d3rows.push({ cap: S.d3cap, t: v.tB, v: v.y1B, V0: c.V0 }); save(); d3table();
    Lab.toast(`Nokta eklendi: t = ${ms(v.tB)} ms, v = ${num(v.y1B, 3)} V`);
  }
  $('#d3rec').onclick = d3rec;
  $('#d3del').onclick = () => { S.d3rows.pop(); save(); d3table(); };
  $('#d3csv').onclick = () => Lab.downloadCSV('hafta9_deney3.csv', ['#', 'kayit', 't (ms)', 'v (V)', 'V0 (V)', 'ln(v/V0)'], S.d3rows.map((r, i) => [i + 1, r.cap, +(r.t * 1e3).toFixed(4), +r.v.toFixed(4), +r.V0.toFixed(4), r.v > 0 ? +Math.log(r.v / r.V0).toFixed(5) : '']));
  d3table();
  const d3design = () => near(D3.kR.value * D3.kC.value, S.d3target, 0.05 * S.d3target);
  steps('d3', [
    { t: 'R ve C\'yi seçerek <b>nominal RC</b>\'yi hedef τ\'nun ±%5\'i içine getirin (birden çok doğru çözüm var).', test: d3design },
    { t: 'R<sub>1</sub>C ≪ hedef τ olacak bir R<sub>1</sub> seçip kapasitörü doldurun, sonra boşalmayı yakalayın. Kayıt penceresi (9 bölme) <b>en az 5τ</b> olsun.', test: () => S.d3cap && S.d3RCn && near(S.d3RCn, S.d3target, 0.05 * S.d3target) && S.d3win >= 5 * S.d3RCn },
    { t: 'B imlecini 0 ile ≈3τ arasında gezdirerek <b>en az 6 nokta</b> kaydedin (<kbd>R</kbd>).', test: () => { const L = d3pts(); return L.length >= 6 && Math.max(...L.map((r) => r.t)) > 2 * S.d3tau; } },
    { t: 'Grafikteki eğimden τ\'yu hesaplayın ve soruları yanıtlayın.', test: () => ['d3q1', 'd3q2'].every((q) => S.answers[q] && S.answers[q].ok) },
  ]);
  numq('d3', '#d3Q', { id: 'd3q1', q: 'ln grafiğinin eğiminden bulduğunuz τ kaç ms\'dir?', answer: () => (S.d3tau || S.d3target) * 1e3, tol: 5, unit: 'ms', explain: 'τ = −1/m. Nominal RC ile farkı kondansatör toleransından gelir.', hint: 'ln(v/V<sub>0</sub>) = −t/τ → eğim m = −1/τ (m birimi 1/ms ise τ ms çıkar).' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'Hedef τ için 5τ kuralına göre tepki kaç ms\'de “bitmiş” sayılır?', answer: () => 5 * S.d3target * 1e3, tol: 1, unit: 'ms', explain: '5τ sonra başlangıç değerinin %0,7\'si kalır.', hint: '5 × τ' });
  numq('d3', '#d3Q', { id: 'd3q3', q: '5τ anında başlangıç geriliminin yüzde kaçı kalır?', answer: 100 * Math.exp(-5), tol: 5, unit: '%', explain: 'e<sup>−5</sup> = 0,0067 → %0,67.', hint: 'e<sup>−5</sup>' });
  mcq('d3', '#d3Q', { id: 'd3q4', q: 'Neden ln(v/V<sub>0</sub>) – t grafiği bir doğrudur ve bu ne işe yarar?', opts: ['Çünkü v doğrusal azalır', 'ln(e<sup>−t/τ</sup>) = −t/τ; üstel model doğruysa noktalar doğru üzerinde olur, eğim −1/τ\'dur ve tüm noktalar birlikte kullanılır', 'Çünkü ln gürültüyü yok eder', 'Yalnızca RC devrelerinde böyledir'], correct: 1, explain: 'Doğrusallaştırma hem modeli test eder (R² ≈ 1) hem de τ\'yu tek noktaya bağlı kalmadan bulur.', hint: 'ln ile e<sup>x</sup> birbirinin tersidir.' });
  mcq('d3', '#d3Q', { id: 'd3q5', q: 'Aynı τ\'yu R = 1 MΩ, C = küçük yerine R = 1 kΩ, C = büyük ile de elde edebilirsiniz. Ölçüm açısından hangisi daha az hatalıdır?', opts: ['1 MΩ: büyük direnç daha doğru', '1 kΩ: prob/DMM (10 MΩ) yükü ihmal edilebilir; ama büyük C elektrolitikse tolerans (±%20) ve kutup dikkati gerekir', 'Fark yoktur', 'Her ikisi de prob yüzünden aynı hatayı yapar'], correct: 1, explain: 'Tasarım bir ödünleşimdir: yük hatası ↔ kondansatör toleransı ve boyutu.', hint: 'R ‖ 10 MΩ ne zaman R\'den belirgin farklıdır?' });

  /* ================= DENEY 4 · R_Th ile τ ================= */
  const D4 = RLBench('d4', { Vs: 0, Ra: [2, 4, 8, 12], Ra0: 4, Rb: [6, 12, 24, 47], Rb0: 12, Rc: [2, 6, 12, 22], Rc0: 6, L0: 0.18, real: false, diode: false, ohm: true, names: ['Ra', 'Rb', 'Rc'] });
  D4.scope = mkScope($('#d4scope'), { title: 'CH1 v<sub>düğüm</sub> · CH2 i<sub>L</sub>', v1: 10, v2: 0.5, t: 0.002, p1: 0, p2: -3, tan: 1, ch2unit: 'A', note: 'CH2: akım probu 1 V ≙ 1 A. Ohmmetre için “Bobini sök + ölç”.' });
  const d4map = (r) => [Lab.ohm(r.Ra), Lab.ohm(r.Rb), Lab.ohm(r.Rc), eng(r.L, 'H'), num(r.I0, 3), ms(r.tA), ms(r.tB), num(r.iB / r.iA, 3)];
  const d4table = () => recTable('d4', 0, d4map);
  function d4rec() {
    const v = D4.scope.curv(), c = D4.scope.cap;
    if (!v) return Lab.toast('Önce bir olay yakalayın ve İMLEÇ\'i açın.');
    if (c.kind !== 'off') return Lab.toast('Anahtarın AÇILMA olayını kaydedin.');
    S.d4rows.push({ Ra: c.p.Ra, Rb: c.p.Rb, Rc: c.p.Rc, L: c.p.L, r: c.p.r, I0: c.I0, tA: v.tA, tB: v.tB, iA: v.y2A, iB: v.y2B }); save(); d4table();
    Lab.toast(`Kaydedildi: Δt = ${ms(v.tB - v.tA)} ms`);
  }
  $('#d4rec').onclick = d4rec;
  $('#d4del').onclick = () => { S.d4rows.pop(); save(); d4table(); };
  $('#d4csv').onclick = () => Lab.downloadCSV('hafta9_deney4.csv', ['#', 'Ra', 'Rb', 'Rc', 'L (H)', 'I0 (A)', 'tA (ms)', 'tB (ms)', 'iB/iA'], S.d4rows.map((r, i) => [i + 1, r.Ra, r.Rb, r.Rc, r.L, +r.I0.toFixed(4), +(r.tA * 1e3).toFixed(3), +(r.tB * 1e3).toFixed(3), +(r.iB / r.iA).toFixed(4)]));
  d4table();
  const ex37 = () => { const p = D4.p; return p && near(p.Vs, 24, 0.05) && p.Ra === 4 && p.Rb === 12 && p.Rc === 6 && p.L === 0.18; };
  const d4tau = D4rows => D4rows.filter(tauRowRL);
  steps('d4', [
    { t: 'Örnek 3.7: <b>V<sub>s</sub> = 24 V, R<sub>a</sub> = 4 Ω, R<sub>b</sub> = 12 Ω, R<sub>c</sub> = 6 Ω, L = 180 mH</b> (ideal bobin). Anahtar kapalı, akım oturmuş: i<sub>L</sub> ≈ 2 A mı?', test: () => ex37() && D4.closed && !D4.ohm && Math.abs(D4.i - D4.iss()) < 0.01 * D4.iss() },
    { t: 'Anahtarı açın, bobin akımı sönsün; sonra <b>bobini söküp ohmmetreyle</b> uçlardan görülen direnci ölçün (t &gt; 0 devresi).', test: () => { if (D4.ohm && D4.ohmOpen && ex37()) S.f.d4ohm = true; return !!S.f.d4ohm; } },
    { t: 'Bobini geri takın, anahtarı kapatıp akımın oturmasını bekleyin. SINGLE ile kurup anahtarı açın; τ\'yu %36,8 yöntemiyle ölçüp kaydedin.', test: () => S.d4rows.some((r) => r.Ra === 4 && r.Rb === 12 && r.Rc === 6 && r.L === 0.18 && tauRowRL(r)) },
    { t: '<b>Yalnızca R<sub>a</sub></b>\'yı değiştirip ölçümü yineleyin: I<sub>0</sub> değişti mi, τ değişti mi?', test: () => { const L = d4tau(S.d4rows); return L.some((a) => L.some((b) => a.Rb === b.Rb && a.Rc === b.Rc && a.L === b.L && a.Ra !== b.Ra)); } },
    { t: '<b>R<sub>b</sub></b>\'yi değiştirip ölçümü yineleyin. Hangi direnç(ler) τ\'yu belirliyor?', test: () => { const L = d4tau(S.d4rows); return L.some((a) => L.some((b) => a.Ra === b.Ra && a.Rc === b.Rc && a.L === b.L && a.Rb !== b.Rb)); } },
  ]);
  numq('d4', '#d4Q', { id: 'd4q1', q: 'Örnek 3.7: anahtar açılmadan önce bobin akımı I<sub>0</sub> kaç amperdir?', answer: 2, tol: 1, unit: 'A', explain: '6 ‖ 12 = 4 Ω; kaynak akımı 24/8 = 3 A; akım bölücü: 3 × 12/18 = 2 A.', hint: 't &lt; 0: bobin kısa devre, akım bölücü.' });
  numq('d4', '#d4Q', { id: 'd4q2', q: 't &gt; 0 devresinde bobinin uçlarından görülen R<sub>Th</sub> kaç ohmdur?', answer: 18, tol: 1, unit: 'Ω', explain: 'Kaynak kolu koptu: 6 Ω ve 12 Ω seri → 18 Ω.', hint: 'Anahtar açıkken R<sub>a</sub> devrede mi?' });
  numq('d4', '#d4Q', { id: 'd4q3', q: 'τ kaç ms\'dir?', answer: 10, tol: 1.5, unit: 'ms', explain: 'τ = 0,18/18 = 10 ms.', hint: 'τ = L/R<sub>Th</sub>' });
  numq('d4', '#d4Q', { id: 'd4q4', q: 't = 10 ms\'de bobin akımı kaç amperdir?', answer: 0.736, tol: 1.5, unit: 'A', explain: 'i = 2e<sup>−1</sup> = 0,736 A.', hint: 't = τ' });
  mcq('d4', '#d4Q', { id: 'd4q5', q: 'Anahtar kapalıyken (V<sub>s</sub> = 0, kaynak kısa devre) ohmmetre 6 + 4‖12 = 9 Ω okuyor. Bu değerle τ hesaplamak neden yanlıştır?', opts: ['Ohmmetre yanlış ölçer', 'Bu, anahtarlamadan ÖNCEKİ devrenin direnci; τ, tepkinin sürdüğü SONRAKİ devreden (6 + 12 = 18 Ω) alınır', 'Kaynak söndürülmemiştir', 'Bobin direnci eklenmemiştir'], correct: 1, explain: 'Ders notundaki sık hata: “I<sub>0</sub> eski devreden, τ yeni devreden.”', hint: 'Tepki hangi devrede sürüyor?' });
  mcq('d4', '#d4Q', { id: 'd4q6', q: 'Yalnızca R<sub>a</sub>\'yı değiştirdiğinizde ölçümlerde ne gözlediniz?', opts: ['τ değişti, I<sub>0</sub> aynı kaldı', 'I<sub>0</sub> değişti, τ aynı kaldı', 'İkisi de değişti', 'Hiçbiri değişmedi'], correct: 1, explain: 'R<sub>a</sub> yalnızca t &lt; 0 devresinde (başlangıç koşulunda) rol oynar.', hint: 'Tablonuzdaki I<sub>0</sub> ve Δt sütunlarını karşılaştırın.' });

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
    const f = d3fit();
    const html = `
      <h2 style="margin:0">Devre Kuramı I · Sanal Laboratuvar · Hafta 9 Raporu</h2>
      <p><b>Konu:</b> RL ve RC devrelerinin doğal tepkisi — süreklilik, zaman sabiti, %36,8 ve teğet yöntemi, R<sub>Th</sub> ile τ</p>
      <table class="data" style="width:auto"><tr><th>Ad Soyad</th><td class="l">${S.st.name || ''}</td><th>No</th><td class="l">${S.st.no || ''}</td><th>Grup</th><td class="l">${S.st.group || ''}</td><th>Tarih</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Özet</h3>
      <p>Tamamlanan föy adımı: <b>${sOk}/${sTot}</b> · Doğru yanıt: <b>${ok}/${tot}</b> · Puan: <b>${Math.round((50 * sOk) / sTot + (50 * ok) / tot)}/100</b></p>
      <h3>Yanıtlar</h3>
      <table class="data"><thead><tr><th>Bölüm</th><th>Soru</th><th>Yanıt</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Deney 1 · RC boşalması</h3>${tab('d1tab')}
      <h3>Deney 2 · RL doğal tepki</h3>${tab('d2tab')}
      <h3>Deney 3 · τ tasarımı (hedef ${eng(S.d3target, 's')})</h3>
      ${f ? `<p>ln grafiği: eğim m = ${num(f.m, 4)} 1/ms, R² = ${num(f.r2, 4)} (${f.n} nokta).</p>` : ''}${tab('d3tab')}
      <h3>Deney 4 · R<sub>Th</sub> ile τ</h3>${tab('d4tab')}
      <h3>Osiloskop kayıtları ve grafik</h3>
      <div>${img(D1.scope.canvas)} ${img(D2.scope.canvas)}</div>
      <div>${img(D4.scope.canvas)} ${img($('#d3plot'))}</div>
      <h3>Öğrenci yorumu</h3>
      <p style="white-space:pre-wrap;border:1px solid #ccc;padding:8px;min-height:60px">${(S.st.comment || '').replace(/</g, '&lt;')}</p>`;
    $('#reportPreview').innerHTML = html; $('#report').innerHTML = html;
  }
  $('#printBtn').onclick = () => { buildReport(); window.print(); };
  $('#resetBtn').onclick = () => { if (confirm('Bu haftaya ait tüm ölçüm, yanıt ve ilerleme silinsin mi?')) { localStorage.removeItem('devrelab:' + KEY); location.reload(); } };

  /* ================= klavye / döngü ================= */
  const benches = { d1: D1, d2: D2, d3: D3, d4: D4 };
  const recs = { d1: d1rec, d2: d2rec, d3: d3rec, d4: d4rec };
  $('#helpBtn').onclick = () => $('#helpModal').classList.add('show');
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (e.key === 'Escape') $('#helpModal').classList.remove('show');
    if (e.altKey && /^[0-7]$/.test(e.key)) { go(pages[+e.key]); e.preventDefault(); return; }
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.key === '?') $('#helpModal').classList.add('show');
    const B = benches[S.page];
    if (!B) return;
    if (e.key === 'r' || e.key === 'R') recs[S.page]();
    if (e.key === 's' || e.key === 'S') { B.toggle(); e.preventDefault(); }
    if (e.key === 'a' || e.key === 'A') B.scope.arm();
  });
  let last = performance.now();
  function loop() {
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
    const B = benches[S.page];
    if (B) { B.update(dt); B.scope.draw(); evalSteps(S.page); }
    requestAnimationFrame(loop);
  }
  // başlangıçta kapasitörler/bobinler kalıcı durumda
  Object.values(benches).forEach((B) => B.update(0));
  ['d1', 'd2', 'd3', 'd4'].forEach(evalSteps);
  go(S.page); progress(); loop();
})();

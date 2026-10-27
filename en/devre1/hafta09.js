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
    d.innerHTML = `<div class="brand"><span>DSO-2C · Digital Oscilloscope · ${o.title || ''}</span><span><span class="led"></span> <span class="st">STOP</span></span></div>
      <div class="row" style="align-items:flex-start;flex-wrap:nowrap"><canvas width="640" height="400" style="width:100%;max-width:640px"></canvas>
      <div style="min-width:170px;max-width:200px"><div class="ctrls"></div><div class="row bt" style="margin:6px 0;gap:4px"></div><div class="meas"></div></div></div>
      <div style="font-size:11px;color:#9aa3b0;margin-top:4px">${o.note || ''}</div>`;
    box.appendChild(d);
    const cv = d.querySelector('canvas'), ctr = d.querySelector('.ctrls'), bt = d.querySelector('.bt'), meas = d.querySelector('.meas'), led = d.querySelector('.led'), st = d.querySelector('.st');
    const sc = new Lab.Scope(cv); self.scope = sc; self.canvas = cv;
    const set = () => (self.dirty = true);
    const K = (label, list, val, f, fmt) => { f(val); return new Lab.Knob(ctr, { label, list, value: val, dark: true, size: 40, fmt, onChange: (v) => { f(v); set(); } }); };
    self.k1 = K('CH1 V/div', VDIV, o.v1, (v) => (sc.ch[0].vdiv = v), (v) => eng(v, 'V'));
    self.k2 = K('CH2 V/div', VDIV, o.v2, (v) => (sc.ch[1].vdiv = v), (v) => eng(v, 'V'));
    self.kt = K('TIME/div', TDIV, o.t, (v) => (sc.tdiv = v), (v) => eng(v, 's'));
    self.p1 = K('CH1 position', POSL, o.p1 ?? -3, (v) => (sc.ch[0].pos = v), (v) => num(v, 1) + ' d');
    self.p2 = K('CH2 position', POSL, o.p2 ?? -3, (v) => (sc.ch[1].pos = v), (v) => num(v, 1) + ' d');
    const B = (txt, on, f) => { const b = document.createElement('button'); b.className = 'seg-btn' + (on ? ' on' : ''); b.textContent = txt; b.onclick = () => { f(b); set(); }; bt.appendChild(b); return b; };
    B('CH1', true, (b) => { sc.ch[0].on = !sc.ch[0].on; b.classList.toggle('on', sc.ch[0].on); });
    B('CH2', true, (b) => { sc.ch[1].on = !sc.ch[1].on; b.classList.toggle('on', sc.ch[1].on); });
    self.curBtn = B('CURSOR', false, (b) => { sc.cur.on = !sc.cur.on; b.classList.toggle('on', sc.cur.on); });
    if (o.tan != null) self.tanBtn = B('TANGENT', false, (b) => { self.tanOn = !self.tanOn; b.classList.toggle('on', self.tanOn); });
    self.armBtn = B('SINGLE', false, () => self.arm());
    self.armBtn.style.background = '#6b4e00'; self.armBtn.style.color = '#ffd76a';
    sc.cur.a = PRE; sc.cur.b = PRE + 2;
    function status() {
      led.className = 'led' + (self.armed ? ' on' : self.cap ? ' on g' : '');
      st.textContent = self.armed ? 'ARMED · waiting for trigger' : self.cap ? "TRIG’D · STOP" : 'STOP';
    }
    self.arm = () => { self.armed = true; status(); Lab.toast('Oscilloscope armed (SINGLE). Now toggle the switch.'); };
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
      if (!c) { g.fillStyle = '#9fe0b0'; g.font = '15px Segoe UI'; g.fillText(self.armed ? 'Waiting for trigger… toggle the switch (S)' : 'Arm with SINGLE, then toggle the switch', 150, H / 2 - 20); }
      showMeas();
    }
    function showMeas() {
      const v = self.curv();
      if (!v) { meas.innerHTML = sc.cur.on ? 'Capture an event first to use the cursors.' : 'CURSOR off.'; return; }
      const f = (x, k) => eng(x, k === 1 && o.ch2unit ? o.ch2unit : 'V');
      meas.innerHTML = `<span style="color:#ff7cf0">CURSOR</span><br>t<sub>A</sub> ${eng(v.tA, 's')} · t<sub>B</sub> ${eng(v.tB, 's')}<br>Δt ${eng(v.tB - v.tA, 's')}` +
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
    const ps = inst(box, 'DC POWER SUPPLY · V<sub>g</sub>'); const psL = lcd(ps.el, 'V · mA', '', 150);
    const kV = new Lab.Knob(ps.c, { label: 'V_g', min: 0, max: 30, step: 0.1, value: cfg.Vg, dark: true, fmt: (v) => num(v, 1) + ' V' });
    const rb = inst(box, 'RESISTOR BOX', false);
    const kR1 = new Lab.Knob(rb.c, { label: 'R1 (charge)', list: cfg.R1list, value: cfg.R1, fmt: Lab.ohm });
    const kR = new Lab.Knob(rb.c, { label: 'R (discharge)', list: cfg.Rlist, value: cfg.R, fmt: Lab.ohm });
    const cb = inst(box, 'CAPACITOR BOX', false);
    const kC = new Lab.Knob(cb.c, { label: 'C (nominal)', list: cfg.Clist, value: cfg.C, fmt: (v) => eng(v, 'F') + (v >= 1e-6 ? ' elec.' : '') });
    const sw = inst(box, 'SWITCH S · DMM', false); const dL = lcd(sw.el, 'DMM · v<sub>C</sub> (DC)', 'V', 120);
    const swB = document.createElement('button'); swB.className = 'btn'; swB.style.cssText = 'width:150px;padding:10px 6px;font-weight:700'; sw.c.appendChild(swB);
    chk(sw.c, 'DMM connected to capacitor (10 MΩ)', false, (v) => (self.dmm = v));
    const btxt = () => (swB.innerHTML = self.pos === 'A' ? 'S: A (charge)<br><small>toggle → B (t = 0)</small>' : 'S: B (discharge)<br><small>toggle → A</small>');
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
    sch.t(g, 600, 225, 'probe ×10 = 10 MΩ ‖ C', 'lbl').style.fill = '#777';

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
      tState.textContent = self.pos === 'A' ? 'A: capacitor charging' : 'B: capacitor discharging through R';
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
      if (self.scope && self.scope.trigger(src)) { self.last = src; S.f[pfx + 'cap'] = (S.f[pfx + 'cap'] || 0) + 1; if (self.onCap) self.onCap(src); save(); Lab.toast(dis ? '✔ Discharge captured (TRIG’D).' : '✔ Charging event captured.'); }
      else if (dis) Lab.toast('Switch moved to B. The oscilloscope was not armed: event not recorded. (SINGLE first)');
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
    const ps = inst(box, 'DC POWER SUPPLY · V<sub>s</sub>', true, '<span class="led" id="' + pfx + 'cc"></span> CC'); const psL = lcd(ps.el, 'V · A (limit 5 A)', '', 150);
    const kV = new Lab.Knob(ps.c, { label: 'V_s', min: 0, max: 30, step: 0.1, value: cfg.Vs, dark: true, fmt: (v) => num(v, 1) + ' V' });
    const rb = inst(box, 'POWER RESISTORS', false);
    const kRa = new Lab.Knob(rb.c, { label: cfg.names[0], list: cfg.Ra, value: cfg.Ra0, fmt: Lab.ohm });
    const kRb = new Lab.Knob(rb.c, { label: cfg.names[1], list: cfg.Rb, value: cfg.Rb0, fmt: (v) => (isFinite(v) ? Lab.ohm(v) : 'open') });
    const kRc = cfg.Rc ? new Lab.Knob(rb.c, { label: cfg.names[2], list: cfg.Rc, value: cfg.Rc0, fmt: Lab.ohm }) : { value: 0 };
    const lb = inst(box, 'INDUCTOR SET', false);
    const kL = new Lab.Knob(lb.c, { label: 'L', list: LLIST, value: cfg.L0, fmt: (v) => eng(v, 'H') });
    const rTxt = document.createElement('div'); rTxt.style.cssText = 'font-size:11px;margin-top:2px'; lb.c.appendChild(rTxt);
    chk(lb.c, 'Real inductor (r<sub>L</sub>)', cfg.real, (v) => (self.real = v));
    if (cfg.diode) chk(lb.c, 'Freewheeling diode (1N4007)', false, (v) => (self.diode = v));
    const sw = inst(box, 'SWITCH S', false);
    const swB = document.createElement('button'); swB.className = 'btn'; swB.style.cssText = 'width:150px;padding:10px 6px;font-weight:700'; sw.c.appendChild(swB);
    swB.onclick = () => self.toggle();
    let ohmL;
    if (cfg.ohm) {
      const om = inst(box, 'OHMMETER · inductor terminals', false); ohmL = lcd(om.el, 'Ω (inductor removed)', 'Ω', 120);
      const ob = document.createElement('button'); ob.className = 'seg-btn'; ob.textContent = 'Remove inductor + measure'; om.c.appendChild(ob);
      ob.onclick = () => { self.ohm = !self.ohm; ob.classList.toggle('on', self.ohm); ob.textContent = self.ohm ? 'Reinsert inductor' : 'Remove inductor + measure'; if (self.ohm) self.i = 0; };
    }
    // şema
    const g = $('#' + pfx + 'sch');
    sch.src(g, 60, 150); sch.w(g, [[60, 130], [60, 70], [96, 70]]); sch.term(g, 100, 70); sch.term(g, 150, 70); const blade = sch.blade(g);
    sch.t(g, 125, 52, 'S'); sch.w(g, [[154, 70], [180, 70]]); sch.rH(g, 180, 260, 70); sch.w(g, [[260, 70], [330, 70]]); sch.dot(g, 330, 70);
    sch.w(g, [[60, 170], [60, 210]]); sch.gnd(g, 60, 210); sch.t(g, 26, 155, 'V<tspan font-size="10" dy="3">s</tspan>');
    const gRb = E('g', {}, g), gD = E('g', {}, g);
    sch.w(gRb, [[330, 70], [330, 95]]); sch.rV(gRb, 330, 95, 185); sch.w(gRb, [[330, 185], [330, 210]]); sch.gnd(g, 330, 210);
    const gRbOpen = E('g', {}, g); sch.w(gRbOpen, [[330, 70], [330, 110]]); sch.w(gRbOpen, [[330, 170], [330, 210]]); sch.t(gRbOpen, 340, 145, 'open', 'lbl', 'start').style.fill = '#c62828';
    sch.w(gD, [[330, 70], [400, 70], [400, 100]]); sch.diodeUp(gD, 400, 100, 180); sch.w(gD, [[400, 180], [400, 210], [330, 210]]);
    sch.w(g, [[330, 70], [470, 70]]);
    const gRc = E('g', {}, g); sch.rH(gRc, 470, 550, 70); const gRc0 = E('g', {}, g); sch.w(gRc0, [[470, 70], [550, 70]]);
    sch.w(g, [[550, 70], [620, 70], [620, 95]]); sch.indV(g, 620, 95, 185); sch.w(g, [[620, 185], [620, 210]]); sch.gnd(g, 620, 210);
    E('path', { d: 'M640,110 v22 m-5,-6 l5,6 l5,-6', class: 'w' }, g); sch.t(g, 648, 124, 'CH2: i<tspan font-size="10" dy="3">L</tspan>', 'lbl', 'start').style.fill = '#1592b8';
    sch.w(g, [[330, 70], [330, 40], [300, 40]]); sch.term(g, 296, 40); sch.t(g, 290, 44, 'CH1: v<tspan font-size="10" dy="3">node</tspan>', 'lbl', 'end').style.fill = '#b8960a';
    const tVs = sch.t(g, 88, 160, '', 'val', 'start'), tRa = sch.t(g, 220, 52, ''), tRb = sch.t(g, 270, 145, '', 'lbl', 'end'), tRc = sch.t(g, 510, 52, ''), tL = sch.t(g, 640, 160, '', 'lbl', 'start'), tI = sch.t(g, 640, 180, '', 'val', 'start');
    const tVn = sch.t(g, 340, 30, '', 'val', 'start'), tMsg = sch.t(g, 520, 238, '', 'val');
    const gOhm = E('g', {}, g); E('rect', { x: 596, y: 88, width: 70, height: 104, fill: '#fff', stroke: '#e07a10', 'stroke-dasharray': '4 3' }, gOhm); sch.t(gOhm, 631, 145, 'Ω-meter', 'lbl').style.fill = '#e07a10';

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
      swB.innerHTML = self.closed ? 'S: CLOSED<br><small>open → t = 0</small>' : 'S: OPEN<br><small>close</small>';
      swB.classList.toggle('warn', !self.closed);
      self.closed ? setLine(blade, 104, 70, 146, 70) : setLine(blade, 104, 70, 142, 46);
      gRb.style.display = isFinite(p.Rb) ? '' : 'none'; gRbOpen.style.display = isFinite(p.Rb) ? 'none' : '';
      gD.style.display = p.diode ? '' : 'none'; gRc.style.display = p.Rc ? '' : 'none'; gRc0.style.display = p.Rc ? 'none' : '';
      gOhm.style.display = self.ohm ? '' : 'none';
      rTxt.innerHTML = 'r<sub>L</sub> = ' + num(RCOIL[p.L], 1) + ' Ω';
      tVs.textContent = num(p.Vs, 1) + ' V'; tRa.textContent = cfg.names[0] + ' = ' + Lab.ohm(p.Ra); tRb.textContent = cfg.names[1] + ' = ' + (isFinite(p.Rb) ? Lab.ohm(p.Rb) : '∞');
      tRc.textContent = p.Rc ? cfg.names[2] + ' = ' + Lab.ohm(p.Rc) : ''; tL.textContent = 'L = ' + eng(p.L, 'H') + (p.r ? ' (r = ' + num(p.r, 1) + ' Ω)' : '');
      tI.textContent = 'i_L = ' + num(self.i, 3) + ' A'; tVn.textContent = 'v = ' + num(vn, 2) + ' V';
      tMsg.textContent = self.closed && ve.cc ? 'Supply at current limit (CC)!' : '';
      if (ohmL) {
        if (!self.ohm) ohmL('—');
        else if (self.closed && p.Vs > 0.05) { ohmL('ERROR'); if (!self.ohmWarn) { Lab.toast('An ohmmeter cannot measure in an energized circuit! First open the switch or turn off the source (V_s = 0).', 4500); self.ohmWarn = true; } }
        else { self.ohmWarn = false; const R = p.Rc + (self.closed ? par(p.Ra, p.Rb) : p.Rb); ohmL(isFinite(R) ? num(R, 2) : 'O.L'); self.ohmR = R; self.ohmOpen = !self.closed; }
      }
    };
    self.toggle = () => {
      if (self.ohm) { Lab.toast('Reinsert the inductor first.'); return; }
      const p = P(), wasClosed = self.closed, I0 = self.i;
      self.closed = !self.closed;
      const nowClosed = self.closed;
      let arcR = 1e6;
      if (!nowClosed && pathless(p) && I0 > 0.01) {
        const vpk = Math.min(I0 * Math.sqrt(p.L / 1e-10), 1500); arcR = vpk / I0;
        S.f[pfx + 'arc'] = true; save();
        Lab.toast(`⚡ ARC! The inductor current has no path: ≈${num(vpk, 0)} V across the switch contacts. In a real circuit the contacts burn and semiconductors break down.`, 6000);
      } else if (!nowClosed && I0 > 0.01) {
        const vpk = vb(p, I0, arcR);
        if (vpk > 60) Lab.toast(`Caution: when the switch opened the node jumped to −${num(vpk, 0)} V; there is ≈${num(vpk + p.Vs, 0)} V across the contacts.`, 4500);
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
        if (self.onCap) self.onCap(src); save(); if (!src.arc) Lab.toast('✔ Event captured (TRIG’D).');
      } else if (!nowClosed && !src.arc) Lab.toast('Switch opened. The oscilloscope was not armed: event not recorded. (SINGLE first)');
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
      if (!S.steps[id] && s.test()) { S.steps[id] = true; save(); Lab.toast('✔ Step completed: ' + s.t.replace(/<[^>]+>/g, '').slice(0, 70)); progress(); }
      lis[i].classList.toggle('done', !!S.steps[id]);
    });
  }
  const qids = { onhaz: [], d1: [], d2: [], d3: [], d4: [] };
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

  /* ================= ÖN HAZIRLIK ================= */
  numq('onhaz', '#preQ', { id: 'p1', q: '1) Example 3.1: V<sub>s</sub> = 24 V, R<sub>1</sub> = 12 Ω, L = 200 mH, R = 10 Ω. After being closed for a long time, the switch opens at t = 0. What is I<sub>0</sub> in amperes?', answer: 2, unit: 'A', explain: 'In steady state the inductor is a short circuit and also shorts R: I<sub>0</sub> = 24/12 = 2 A.', hint: 'How does an inductor behave in steady state? Does current flow through R?' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) What is the time constant τ of the same circuit in ms?', answer: 20, unit: 'ms', explain: 'τ = L/R = 0.2/10 = 20 ms. R<sub>1</sub> leaves the circuit together with the switch, so it does not enter τ.', hint: 'Find τ from the circuit AFTER the switch opens.' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) What is the inductor current at t = 20 ms in amperes?', answer: 0.736, tol: 1, unit: 'A', explain: 'i = 2e<sup>−1</sup> = 0.736 A; only 13.5% of the energy remains.', hint: 'At t = τ, e<sup>−1</sup> = 0.368.' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) Example 3.2: V<sub>g</sub> = 100 V, R<sub>1</sub> = 20 kΩ, C = 0.5 µF, R = 80 kΩ. What is the time constant of the discharge in ms?', answer: 40, unit: 'ms', explain: 'τ = RC = 80 k × 0.5 µ = 40 ms.', hint: 'Which resistance does the capacitor see for t &gt; 0?' });
  numq('onhaz', '#preQ', { id: 'p5', q: '5) Example 3.3: V<sub>0</sub> = 100 V, τ = 40 ms. After how many ms does the voltage fall to 24 V?', answer: 57.1, tol: 1.5, unit: 'ms', explain: 't = τ ln(100/24) = 40 × 1.427 = 57.1 ms = 1.43τ.', hint: 'Take the ln of both sides of 100e<sup>−t/τ</sup> = 24.' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) In Example 3.1 the inductor voltage is 0 V just before the switch opens. What is the inductor voltage just after it opens?', opts: ['Still 0 V; voltage does not jump either', '−20 V; because the current stays the same', '24 V; the source voltage', 'Undetermined'], correct: 1, explain: 'i(0<sup>+</sup>) = 2 A flows through R: v<sub>R</sub> = 20 V, and by KVL v<sub>L</sub> = −20 V. Continuity applies only to the current.', hint: 'Which quantity is continuous: inductor current or inductor voltage?' });
  mcq('onhaz', '#preQ', { id: 'p7', q: '7) Two capacitors with the same R and C, one charged to 100 V and the other to 10 V, are discharging. Which one halves faster?', opts: ['The 100 V one', 'The 10 V one', 'Both halve in the same time', 'It depends on C'], correct: 2, explain: 't<sub>½</sub> = τ ln2 = 0.693τ; V<sub>0</sub> cancels in the ratio.', hint: 'Solve V<sub>0</sub>e<sup>−t/τ</sup> = V<sub>0</sub>/2.' });

  /* ================= DENEY 1 · RC boşalması ================= */
  const RL1 = [1e3, 2.2e3, 4.7e3, 10e3, 20e3, 47e3];
  const RL2 = [10e3, 22e3, 40e3, 47e3, 80e3, 100e3, 220e3, 470e3, 1e6];
  const CL1 = [0.1e-6, 0.22e-6, 0.47e-6, 0.5e-6, 1e-6, 2.2e-6, 4.7e-6, 10e-6];
  const D1 = RCBench('d1', { Vg: 0, R1: 20e3, R: 80e3, C: 0.5e-6, R1list: RL1, Rlist: RL2, Clist: CL1 });
  D1.scope = mkScope($('#d1scope'), { title: 'CH1 v<sub>C</sub> · CH2 i<sub>R</sub>', v1: 2, v2: 0.05, t: 0.01, tan: 0, ch2unit: 'mA', note: 'CH1: ×10 probe (10 MΩ) across the capacitor · CH2: current probe, 1 V ≙ 1 mA (values shown in mA) · The first division is pre-trigger.' });
  function recTable(key, cols, map) {
    const tb = $('#' + key + 'tab tbody');
    tb.innerHTML = S[key + 'rows'].map((r, i) => `<tr><td>${i + 1}</td>${map(r).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
    tb.parentElement.parentElement.scrollTop = 1e6;
  }
  const d1map = (r) => [r.kind === 'dis' ? 'discharge' : 'charge', Lab.ohm(r.R), eng(r.Cn, 'F'), num(r.V0, 2), ms(r.tA), ms(r.tB), ms(r.tB - r.tA), num(r.vB / r.vA, 3)];
  const d1table = () => recTable('d1', 0, d1map);
  function d1rec() {
    const v = D1.scope.curv(), c = D1.scope.cap;
    if (!v) return Lab.toast('First capture an event and turn on the CURSOR.');
    S.d1rows.push({ kind: c.kind, R: c.R, Cn: c.Cn, V0: c.V0, tau: c.tau, tA: v.tA, tB: v.tB, vA: v.y1A, vB: v.y1B }); save(); d1table();
    Lab.toast(`Recorded: Δt = ${ms(v.tB - v.tA)} ms, v_B/v_A = ${num(v.y1B / v.y1A, 3)}`);
  }
  $('#d1rec').onclick = d1rec;
  $('#d1del').onclick = () => { S.d1rows.pop(); save(); d1table(); };
  $('#d1csv').onclick = () => Lab.downloadCSV('hafta9_deney1.csv', ['#', 'event', 'R (ohm)', 'C nom (F)', 'V0 (V)', 'tA (ms)', 'tB (ms)', 'dt (ms)', 'vB/vA'], S.d1rows.map((r, i) => [i + 1, r.kind, r.R, r.Cn, +r.V0.toFixed(3), +(r.tA * 1e3).toFixed(3), +(r.tB * 1e3).toFixed(3), +((r.tB - r.tA) * 1e3).toFixed(3), +(r.vB / r.vA).toFixed(4)]));
  d1table();
  const ex32 = () => D1.kR1.value === 20e3 && D1.kR.value === 80e3 && D1.kC.value === 0.5e-6;
  const isTauRow = (r) => r.kind === 'dis' && Math.abs(r.tA) < 0.03 * r.tau && near(r.vB / r.vA, 0.368, 0.025);
  steps('d1', [
    { t: 'Select the Example 3.2 components: <b>R<sub>1</sub> = 20 kΩ, R = 80 kΩ, C = 0.5 µF</b>; set the supply to <b>10 V</b> (the bench supply goes up to 30 V; instead of the 100 V in the lecture example).', test: () => ex32() && near(D1.kV.value, 10, 0.05) },
    { t: 'With the switch at A, wait for the capacitor to charge: the DMM should show ≈ 10 V (at least 5R<sub>1</sub>C = 50 ms).', test: () => D1.pos === 'A' && D1.p && D1.vC > 0.99 * D1.p.vfc && D1.vC > 5 },
    { t: 'Arm the oscilloscope with <b>SINGLE</b> (<kbd>A</kbd>), then toggle the switch to <b>B</b> (<kbd>S</kbd>). The discharge should freeze on the screen.', test: () => (S.f.d1cap || 0) > 0 && D1.scope.cap && D1.scope.cap.kind === 'dis' },
    { t: 'Choose TIME/div so that the whole discharge (≈5τ) fits on the screen; turn on <b>TANGENT</b> and read the moment it crosses the zero line.', test: () => D1.scope.cap && D1.scope.tanOn && D1.scope.scope.tdiv * 9 >= 4 * D1.scope.cap.tau && D1.scope.scope.tdiv * 9 <= 20 * D1.scope.cap.tau },
    { t: '<b>36.8% method:</b> put CURSOR A at t = 0 and B at the point v<sub>B</sub>/v<sub>A</sub> ≈ 0.368, then record (<kbd>R</kbd>).', test: () => S.d1rows.some(isTauRow) },
    { t: 'Change R or C and repeat the experiment; record a 36.8% measurement for a <b>different</b> τ as well.', test: () => { const L = S.d1rows.filter(isTauRow); return L.some((r) => Math.abs(r.tau - L[0].tau) > 0.1 * L[0].tau); } },
  ]);
  const tau32 = () => par(80e3, RPROBE) * Cact(0.5e-6);
  numq('d1', '#d1Q', { id: 'd1q1', q: 'With the <b>nominal</b> component values (R = 80 kΩ, C = 0.5 µF), what is τ in ms?', answer: 40, tol: 1, unit: 'ms', explain: 'τ = RC = 40 ms.', hint: 'τ = RC; kΩ × µF = ms.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'What is the τ you <b>measured</b> on the oscilloscope in ms (R = 80 kΩ, C = 0.5 µF)?', answer: tau32, tol: 4, unit: 'ms', explain: 'The measured value differs from the nominal by the capacitor tolerance (±5%) and the probe loading.', hint: 'Read the time of the 36.8% point or the moment the tangent crosses zero.' });
  D1.scope.ansScale = 1;
  numq('d1', '#d1Q', { id: 'd1q3', q: 'With V<sub>0</sub> = 10 V and R = 80 kΩ, what is the discharge current at t = 0<sup>+</sup> in mA? (See it on CH2.)', answer: 0.125, tol: 2, unit: 'mA', explain: 'i(0<sup>+</sup>) = V<sub>0</sub>/R = 0.125 mA; at t = 0<sup>−</sup> it was 0: the current jumped, the voltage did not.', hint: 'Voltage is continuous: v(0<sup>+</sup>) = V<sub>0</sub>; Ohm’s law.' });
  mcq('d1', '#d1Q', { id: 'd1q4', q: 'What can be said about the τ values given by the tangent method and the 36.8% method?', opts: ['The tangent always gives 2τ', 'Both give the same τ; the tangent comes from the initial slope −V<sub>0</sub>/τ', 'The 36.8% method is valid only for RL circuits', 'The tangent method varies with V<sub>0</sub>'], correct: 1, explain: 'dv/dt(0) = −V<sub>0</sub>/τ; a line with this slope reaches zero exactly at τ.', hint: 'Find the initial slope by differentiating.' });
  mcq('d1', '#d1Q', { id: 'd1q5', q: 'With R = 1 MΩ, C = 1 µF the calculated τ = 1 s, but the measured τ ≈ 0.91 s (even less if the DMM is also connected). Most likely reason?', opts: ['The oscilloscope time base is wrong', 'The probe (10 MΩ) and DMM (10 MΩ) are in parallel with the discharge resistor, reducing the equivalent R', 'The capacitor is connected in reverse', 'The switch resistance increases τ'], correct: 1, explain: '1 MΩ ‖ 10 MΩ = 0.909 MΩ. In high-impedance circuits instrument loading cannot be neglected. (Electrolytic tolerance adds ±20% as well.)', hint: 'Where is the instrument’s input resistance connected?' });
  numq('d1', '#d1Q', { id: 'd1q6', q: 'Example 3.3: To halve the discharge time with C = 0.5 µF, what must R be in kΩ?', answer: 40, unit: 'kΩ', explain: 'τ<sub>new</sub> = 20 ms = R × 0.5 µF → R = 40 kΩ. The box has 40 kΩ; try it and verify!', hint: 'The time is directly proportional to τ.' });

  /* ================= DENEY 2 · RL doğal tepki ================= */
  const D2 = RLBench('d2', { Vs: 0, Ra: [6, 12, 22, 47], Ra0: 12, Rb: [4.7, 10, 22, 47, 100, 220, 470, 1000, Infinity], Rb0: 10, L0: 0.2, real: true, diode: true, names: ['R1', 'R'] });
  D2.scope = mkScope($('#d2scope'), { title: 'CH1 v<sub>node</sub> · CH2 i<sub>L</sub>', v1: 10, v2: 0.5, t: 0.005, p1: 0, p2: -3, tan: 1, ch2unit: 'A', note: 'CH1: node voltage (×10 probe) · CH2: current probe 1 V ≙ 1 A (values shown in A) · TANGENT is drawn on the current (CH2) curve.' });
  const d2map = (r) => [eng(r.L, 'H'), isFinite(r.Rb) ? Lab.ohm(r.Rb) : '∞', r.diode ? 'yes' : '—', num(r.I0, 3), num(r.vn0, 1), ms(r.tA), ms(r.tB), num(r.iB / r.iA, 3)];
  const d2table = () => recTable('d2', 0, d2map);
  function d2rec() {
    const v = D2.scope.curv(), c = D2.scope.cap;
    if (!v) return Lab.toast('First capture an event and turn on the CURSOR.');
    if (c.kind !== 'off') return Lab.toast('In this experiment record the switch OPENING event.');
    S.d2rows.push({ L: c.p.L, r: c.p.r, Rb: c.p.Rb, Rc: c.p.Rc, diode: c.p.diode, I0: c.I0, vn0: c.vn0p, tA: v.tA, tB: v.tB, iA: v.y2A, iB: v.y2B }); save(); d2table();
    Lab.toast(`Recorded: Δt = ${ms(v.tB - v.tA)} ms, i_B/i_A = ${num(v.y2B / v.y2A, 3)}`);
  }
  $('#d2rec').onclick = d2rec;
  $('#d2del').onclick = () => { S.d2rows.pop(); save(); d2table(); };
  $('#d2csv').onclick = () => Lab.downloadCSV('hafta9_deney2.csv', ['#', 'L (H)', 'R (ohm)', 'diode', 'I0 (A)', 'v(0+) (V)', 'tA (ms)', 'tB (ms)', 'iB/iA'], S.d2rows.map((r, i) => [i + 1, r.L, isFinite(r.Rb) ? r.Rb : 'open', r.diode ? 'yes' : 'no', +r.I0.toFixed(4), +r.vn0.toFixed(2), +(r.tA * 1e3).toFixed(3), +(r.tB * 1e3).toFixed(3), +(r.iB / r.iA).toFixed(4)]));
  d2table();
  const ex31 = () => { const p = D2.p; return p && near(p.Vs, 24, 0.05) && p.Ra === 12 && p.Rb === 10 && p.L === 0.2 && !p.diode; };
  const tauRowRL = (r) => Math.abs(r.tA) < 1e-4 + 0.03 * r.tB && near(r.iB / r.iA, 0.368, 0.025);
  steps('d2', [
    { t: 'Example 3.1: <b>V<sub>s</sub> = 24 V, R<sub>1</sub> = 12 Ω, L = 200 mH, R = 10 Ω</b>, no diode. With the switch closed, wait for the current to settle (i<sub>L</sub> = 2 A for an ideal inductor; ≈ 1.5 A for the real inductor because of r<sub>L</sub> = 1.8 Ω).', test: () => ex31() && D2.closed && Math.abs(D2.i - D2.iss()) < 0.01 * D2.iss() },
    { t: 'Arm with SINGLE and <b>open</b> the switch. See on CH1 that the node voltage <b>jumps</b> from 0 to a negative value, and on CH2 that the current stays <b>continuous</b>.', test: () => (S.f.d2cap || 0) > 0 && D2.scope.cap && D2.scope.cap.kind === 'off' && D2.scope.cap.p.Rb === 10 },
    { t: 'Put CURSOR A at t = 0 and B at i<sub>B</sub>/i<sub>A</sub> ≈ 0.368, then record. Is τ equal to L/R = 20 ms, or shorter because of the winding resistance?', test: () => S.d2rows.some((r) => r.Rb === 10 && tauRowRL(r)) },
    { t: 'Set R to <b>47 Ω or larger</b>, repeat the measurement and record it: did τ get shorter, did the voltage jump get larger?', test: () => S.d2rows.some((r) => isFinite(r.Rb) && r.Rb >= 47 && !r.diode && tauRowRL(r)) },
    { t: 'Set R to <b>open</b> (no diode) and open the switch: see the arc warning. Then insert the <b>freewheeling diode</b> and capture the event: how did the decay change?', test: () => S.f.d2arc && S.f.d2dio },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'Example 3.1 (R = 10 Ω): at the moment the switch opens, to how many volts does the node voltage (top terminal of R) jump? <i>(ideal inductor, I<sub>0</sub> = 2 A)</i>', answer: -20, tol: 1, unit: 'V', explain: 'v(0<sup>+</sup>) = −I<sub>0</sub>R = −20 V. The current flows upward through R.', hint: 'In which direction does the inductor current flow through R?' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'For the real inductor (200 mH, r<sub>L</sub> = 1.8 Ω) and R = 10 Ω, what is τ in ms?', answer: (0.2 / 11.8) * 1e3, tol: 2, unit: 'ms', explain: 'τ = L/(R + r<sub>L</sub>) = 0.2/11.8 = 16.9 ms. Your measurement should confirm this.', hint: 'In the decay loop r<sub>L</sub> and R are in series.' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 'At t = τ, what percentage of the initial energy remains in the inductor?', answer: 13.5, tol: 2, unit: '%', explain: 'w ∝ i<sup>2</sup> → e<sup>−2</sup> = 0.135.', hint: 'Energy is proportional to the square of the current.' });
  numq('d2', '#d2Q', { id: 'd2q4', q: 'Ideal inductor, I<sub>0</sub> = 2 A, L = 200 mH. What is the initially stored energy in joules?', answer: 0.4, tol: 1, unit: 'J', explain: '½LI<sub>0</sub><sup>2</sup> = 0.5 × 0.2 × 4 = 0.4 J; all of it is turned into heat in R.', hint: 'w = ½Li<sup>2</sup>' });
  mcq('d2', '#d2Q', { id: 'd2q5', q: 'What happens if R = 100 Ω is used instead of R = 10 Ω?', opts: ['τ increases, the voltage jump decreases', 'τ decreases (faster decay), but the voltage jumps to −200 V when the switch opens', 'Nothing changes', 'I<sub>0</sub> decreases'], correct: 1, explain: 'τ = L/R; v(0<sup>+</sup>) = −I<sub>0</sub>R. There is a design trade-off between fast turn-off and low voltage (lecture notes: contact arcing).', hint: 'I<sub>0</sub> comes from the old circuit; R is only in the t &gt; 0 circuit.' });
  mcq('d2', '#d2Q', { id: 'd2q6', q: 'Why does the current decay more <b>slowly</b> when a freewheeling diode is fitted?', opts: ['The diode increases the current', 'The inductor voltage is clamped at ≈ 0.7 V; di/dt = −v/L stays small, so the energy is dissipated only slowly', 'The diode increases the inductance', 'The diode reconnects the source'], correct: 1, explain: 'Small voltage → small di/dt. That is why, when fast release is needed in relays, a resistor or zener is added in series with the diode.', hint: 'v = L di/dt; if v is small, what is di/dt?' });

  /* ================= DENEY 3 · τ tasarımı ve ln ================= */
  const E12 = []; [1e3, 1e4, 1e5].forEach((d) => [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2].forEach((m) => E12.push(+(m * d).toPrecision(3)))); E12.push(1e6);
  const CL3 = [10e-9, 22e-9, 47e-9, 0.1e-6, 0.22e-6, 0.47e-6, 1e-6, 2.2e-6, 4.7e-6, 10e-6, 22e-6, 47e-6, 100e-6];
  const D3 = RCBench('d3', { Vg: 12, R1: 1e3, R: 10e3, C: 0.1e-6, R1list: [100, 470, 1e3, 2.2e3], Rlist: E12, Clist: CL3 });
  D3.scope = mkScope($('#d3scope'), { title: 'CH1 v<sub>C</sub> · CH2 i<sub>R</sub>', v1: 2, v2: 0.5, t: 0.002, tan: 0, ch2unit: 'mA', note: 'Record (R) adds the time at cursor B and the CH1 value to the point table.' });
  D3.onCap = (c) => { if (c.kind === 'dis') { S.d3cap = (S.d3cap || 0) + 1; S.d3tau = c.tau; S.d3RCn = c.R * c.Cn; S.d3win = D3.scope.scope.tdiv * 9; save(); } };
  $('#d3target').innerHTML = `<b>Target:</b> discharge time constant <b>τ = ${eng(S.d3target, 's')}</b> (within ±5% using nominal values). Choose a small R<sub>1</sub> for charging so that the capacitor charges quickly.`;
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
    $('#d3fit').innerHTML = f ? `Least squares (${f.n} points, last record): <b>slope m = ${num(f.m, 4)} 1/ms</b> · intercept ${num(f.b, 3)} · R² = ${num(f.r2, 4)}. Compute τ from the slope yourself.` : 'Record at least 2 points from the last captured discharge (move cursor B along the curve).';
  }
  $('#d3theo').onchange = d3draw;
  const d3map = (r) => [ms(r.t), num(r.v, 3), num(r.v / r.V0, 4), r.v > 0 ? num(Math.log(r.v / r.V0), 4) : '—'];
  const d3table = () => { recTable('d3', 0, (r) => d3map(r)); d3draw(); };
  function d3rec() {
    const v = D3.scope.curv(), c = D3.scope.cap;
    if (!v) return Lab.toast('First capture a discharge and turn on the CURSOR.');
    if (c.kind !== 'dis') return Lab.toast('In this experiment use the discharge (A → B) event.');
    S.d3rows.push({ cap: S.d3cap, t: v.tB, v: v.y1B, V0: c.V0 }); save(); d3table();
    Lab.toast(`Point added: t = ${ms(v.tB)} ms, v = ${num(v.y1B, 3)} V`);
  }
  $('#d3rec').onclick = d3rec;
  $('#d3del').onclick = () => { S.d3rows.pop(); save(); d3table(); };
  $('#d3csv').onclick = () => Lab.downloadCSV('hafta9_deney3.csv', ['#', 'record', 't (ms)', 'v (V)', 'V0 (V)', 'ln(v/V0)'], S.d3rows.map((r, i) => [i + 1, r.cap, +(r.t * 1e3).toFixed(4), +r.v.toFixed(4), +r.V0.toFixed(4), r.v > 0 ? +Math.log(r.v / r.V0).toFixed(5) : '']));
  d3table();
  const d3design = () => near(D3.kR.value * D3.kC.value, S.d3target, 0.05 * S.d3target);
  steps('d3', [
    { t: 'Choose R and C to bring the <b>nominal RC</b> within ±5% of the target τ (there are several correct solutions).', test: d3design },
    { t: 'Choose an R<sub>1</sub> such that R<sub>1</sub>C ≪ target τ and charge the capacitor, then capture the discharge. The record window (9 divisions) should be <b>at least 5τ</b>.', test: () => S.d3cap && S.d3RCn && near(S.d3RCn, S.d3target, 0.05 * S.d3target) && S.d3win >= 5 * S.d3RCn },
    { t: 'Move cursor B between 0 and ≈3τ and record <b>at least 6 points</b> (<kbd>R</kbd>).', test: () => { const L = d3pts(); return L.length >= 6 && Math.max(...L.map((r) => r.t)) > 2 * S.d3tau; } },
    { t: 'Compute τ from the slope of the plot and answer the questions.', test: () => ['d3q1', 'd3q2'].every((q) => S.answers[q] && S.answers[q].ok) },
  ]);
  numq('d3', '#d3Q', { id: 'd3q1', q: 'What is the τ you found from the slope of the ln plot, in ms?', answer: () => (S.d3tau || S.d3target) * 1e3, tol: 5, unit: 'ms', explain: 'τ = −1/m. The difference from the nominal RC comes from the capacitor tolerance.', hint: 'ln(v/V<sub>0</sub>) = −t/τ → slope m = −1/τ (if m is in 1/ms, τ comes out in ms).' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'For the target τ, after how many ms is the response considered “finished” according to the 5τ rule?', answer: () => 5 * S.d3target * 1e3, tol: 1, unit: 'ms', explain: 'After 5τ, 0.7% of the initial value remains.', hint: '5 × τ' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'At 5τ, what percentage of the initial voltage remains?', answer: 100 * Math.exp(-5), tol: 5, unit: '%', explain: 'e<sup>−5</sup> = 0.0067 → 0.67%.', hint: 'e<sup>−5</sup>' });
  mcq('d3', '#d3Q', { id: 'd3q4', q: 'Why is the ln(v/V<sub>0</sub>) – t plot a straight line, and what is it good for?', opts: ['Because v decreases linearly', 'ln(e<sup>−t/τ</sup>) = −t/τ; if the exponential model is correct the points lie on a line, the slope is −1/τ and all points are used together', 'Because ln removes noise', 'It is so only in RC circuits'], correct: 1, explain: 'Linearization both tests the model (R² ≈ 1) and finds τ without relying on a single point.', hint: 'ln and e<sup>x</sup> are inverses of each other.' });
  mcq('d3', '#d3Q', { id: 'd3q5', q: 'You can obtain the same τ with R = 1 kΩ, C = large instead of R = 1 MΩ, C = small. Which gives less measurement error?', opts: ['1 MΩ: a large resistor is more accurate', '1 kΩ: probe/DMM (10 MΩ) loading is negligible; but if the large C is electrolytic, mind its tolerance (±20%) and polarity', 'There is no difference', 'Both make the same error because of the probe'], correct: 1, explain: 'Design is a trade-off: loading error ↔ capacitor tolerance and size.', hint: 'When is R ‖ 10 MΩ noticeably different from R?' });

  /* ================= DENEY 4 · R_Th ile τ ================= */
  const D4 = RLBench('d4', { Vs: 0, Ra: [2, 4, 8, 12], Ra0: 4, Rb: [6, 12, 24, 47], Rb0: 12, Rc: [2, 6, 12, 22], Rc0: 6, L0: 0.18, real: false, diode: false, ohm: true, names: ['Ra', 'Rb', 'Rc'] });
  D4.scope = mkScope($('#d4scope'), { title: 'CH1 v<sub>node</sub> · CH2 i<sub>L</sub>', v1: 10, v2: 0.5, t: 0.002, p1: 0, p2: -3, tan: 1, ch2unit: 'A', note: 'CH2: current probe 1 V ≙ 1 A. For the ohmmeter use “Remove inductor + measure”.' });
  const d4map = (r) => [Lab.ohm(r.Ra), Lab.ohm(r.Rb), Lab.ohm(r.Rc), eng(r.L, 'H'), num(r.I0, 3), ms(r.tA), ms(r.tB), num(r.iB / r.iA, 3)];
  const d4table = () => recTable('d4', 0, d4map);
  function d4rec() {
    const v = D4.scope.curv(), c = D4.scope.cap;
    if (!v) return Lab.toast('First capture an event and turn on the CURSOR.');
    if (c.kind !== 'off') return Lab.toast('Record the switch OPENING event.');
    S.d4rows.push({ Ra: c.p.Ra, Rb: c.p.Rb, Rc: c.p.Rc, L: c.p.L, r: c.p.r, I0: c.I0, tA: v.tA, tB: v.tB, iA: v.y2A, iB: v.y2B }); save(); d4table();
    Lab.toast(`Recorded: Δt = ${ms(v.tB - v.tA)} ms`);
  }
  $('#d4rec').onclick = d4rec;
  $('#d4del').onclick = () => { S.d4rows.pop(); save(); d4table(); };
  $('#d4csv').onclick = () => Lab.downloadCSV('hafta9_deney4.csv', ['#', 'Ra', 'Rb', 'Rc', 'L (H)', 'I0 (A)', 'tA (ms)', 'tB (ms)', 'iB/iA'], S.d4rows.map((r, i) => [i + 1, r.Ra, r.Rb, r.Rc, r.L, +r.I0.toFixed(4), +(r.tA * 1e3).toFixed(3), +(r.tB * 1e3).toFixed(3), +(r.iB / r.iA).toFixed(4)]));
  d4table();
  const ex37 = () => { const p = D4.p; return p && near(p.Vs, 24, 0.05) && p.Ra === 4 && p.Rb === 12 && p.Rc === 6 && p.L === 0.18; };
  const d4tau = D4rows => D4rows.filter(tauRowRL);
  steps('d4', [
    { t: 'Example 3.7: <b>V<sub>s</sub> = 24 V, R<sub>a</sub> = 4 Ω, R<sub>b</sub> = 12 Ω, R<sub>c</sub> = 6 Ω, L = 180 mH</b> (ideal inductor). Switch closed, current settled: is i<sub>L</sub> ≈ 2 A?', test: () => ex37() && D4.closed && !D4.ohm && Math.abs(D4.i - D4.iss()) < 0.01 * D4.iss() },
    { t: 'Open the switch and let the inductor current decay; then <b>remove the inductor and use the ohmmeter</b> to measure the resistance seen from its terminals (t &gt; 0 circuit).', test: () => { if (D4.ohm && D4.ohmOpen && ex37()) S.f.d4ohm = true; return !!S.f.d4ohm; } },
    { t: 'Reinsert the inductor, close the switch and wait for the current to settle. Arm with SINGLE and open the switch; measure τ by the 36.8% method and record it.', test: () => S.d4rows.some((r) => r.Ra === 4 && r.Rb === 12 && r.Rc === 6 && r.L === 0.18 && tauRowRL(r)) },
    { t: 'Change <b>only R<sub>a</sub></b> and repeat the measurement: did I<sub>0</sub> change, did τ change?', test: () => { const L = d4tau(S.d4rows); return L.some((a) => L.some((b) => a.Rb === b.Rb && a.Rc === b.Rc && a.L === b.L && a.Ra !== b.Ra)); } },
    { t: 'Change <b>R<sub>b</sub></b> and repeat the measurement. Which resistor(s) determine τ?', test: () => { const L = d4tau(S.d4rows); return L.some((a) => L.some((b) => a.Ra === b.Ra && a.Rc === b.Rc && a.L === b.L && a.Rb !== b.Rb)); } },
  ]);
  numq('d4', '#d4Q', { id: 'd4q1', q: 'Example 3.7: what is the inductor current I<sub>0</sub> before the switch opens, in amperes?', answer: 2, tol: 1, unit: 'A', explain: '6 ‖ 12 = 4 Ω; source current 24/8 = 3 A; current divider: 3 × 12/18 = 2 A.', hint: 't &lt; 0: inductor is a short circuit, current divider.' });
  numq('d4', '#d4Q', { id: 'd4q2', q: 'In the t &gt; 0 circuit, what is R<sub>Th</sub> seen from the inductor terminals, in ohms?', answer: 18, tol: 1, unit: 'Ω', explain: 'The source branch is disconnected: 6 Ω and 12 Ω in series → 18 Ω.', hint: 'Is R<sub>a</sub> in the circuit when the switch is open?' });
  numq('d4', '#d4Q', { id: 'd4q3', q: 'What is τ in ms?', answer: 10, tol: 1.5, unit: 'ms', explain: 'τ = 0.18/18 = 10 ms.', hint: 'τ = L/R<sub>Th</sub>' });
  numq('d4', '#d4Q', { id: 'd4q4', q: 'What is the inductor current at t = 10 ms in amperes?', answer: 0.736, tol: 1.5, unit: 'A', explain: 'i = 2e<sup>−1</sup> = 0.736 A.', hint: 't = τ' });
  mcq('d4', '#d4Q', { id: 'd4q5', q: 'With the switch closed (V<sub>s</sub> = 0, source shorted) the ohmmeter reads 6 + 4‖12 = 9 Ω. Why is it wrong to compute τ with this value?', opts: ['The ohmmeter measures wrongly', 'This is the resistance of the circuit BEFORE switching; τ is taken from the circuit AFTER switching, in which the response continues (6 + 12 = 18 Ω)', 'The source has not been deactivated', 'The winding resistance has not been added'], correct: 1, explain: 'A common mistake in the lecture notes: “I<sub>0</sub> from the old circuit, τ from the new circuit.”', hint: 'In which circuit does the response take place?' });
  mcq('d4', '#d4Q', { id: 'd4q6', q: 'What did you observe in the measurements when you changed only R<sub>a</sub>?', opts: ['τ changed, I<sub>0</sub> stayed the same', 'I<sub>0</sub> changed, τ stayed the same', 'Both changed', 'Neither changed'], correct: 1, explain: 'R<sub>a</sub> plays a role only in the t &lt; 0 circuit (the initial condition).', hint: 'Compare the I<sub>0</sub> and Δt columns of your table.' });

  /* ================= RAPOR ================= */
  function buildReport() {
    const sec = { onhaz: 'Pre-lab', d1: 'Experiment 1', d2: 'Experiment 2', d3: 'Experiment 3', d4: 'Experiment 4' };
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
      <h2 style="margin:0">Circuit Theory I · Virtual Laboratory · Week 9 Report</h2>
      <p><b>Topic:</b> natural response of RL and RC circuits — continuity, time constant, 36.8% and tangent methods, τ from R<sub>Th</sub></p>
      <table class="data" style="width:auto"><tr><th>Full name</th><td class="l">${S.st.name || ''}</td><th>Student ID</th><td class="l">${S.st.no || ''}</td><th>Group</th><td class="l">${S.st.group || ''}</td><th>Date</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Summary</h3>
      <p>Lab-sheet steps completed: <b>${sOk}/${sTot}</b> · Correct answers: <b>${ok}/${tot}</b> · Score: <b>${Math.round((50 * sOk) / sTot + (50 * ok) / tot)}/100</b></p>
      <h3>Answers</h3>
      <table class="data"><thead><tr><th>Section</th><th>Question</th><th>Answer</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Experiment 1 · RC discharge</h3>${tab('d1tab')}
      <h3>Experiment 2 · RL natural response</h3>${tab('d2tab')}
      <h3>Experiment 3 · τ design (target ${eng(S.d3target, 's')})</h3>
      ${f ? `<p>ln plot: slope m = ${num(f.m, 4)} 1/ms, R² = ${num(f.r2, 4)} (${f.n} points).</p>` : ''}${tab('d3tab')}
      <h3>Experiment 4 · τ from R<sub>Th</sub></h3>${tab('d4tab')}
      <h3>Oscilloscope records and plot</h3>
      <div>${img(D1.scope.canvas)} ${img(D2.scope.canvas)}</div>
      <div>${img(D4.scope.canvas)} ${img($('#d3plot'))}</div>
      <h3>Student discussion</h3>
      <p style="white-space:pre-wrap;border:1px solid #ccc;padding:8px;min-height:60px">${(S.st.comment || '').replace(/</g, '&lt;')}</p>`;
    $('#reportPreview').innerHTML = html; $('#report').innerHTML = html;
  }
  $('#printBtn').onclick = () => { buildReport(); window.print(); };
  $('#resetBtn').onclick = () => { if (confirm('Delete all measurements, answers and progress for this week?')) { localStorage.removeItem('devrelab-en:' + KEY); location.reload(); } };

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

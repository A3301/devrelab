/* Devre Kuramı I · Hafta 10 — Basamak Tepkisi ve Genel Çözüm Yöntemi (Bölüm 3.3–3.4) */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd1h10';
  const S = Object.assign({ answers: {}, steps: {}, st: {}, page: 'giris', f: {}, d1rows: [], d2rows: [], d4rows: [], d4log: [] }, Lab.store.load(KEY));
  if (S.seed == null) S.seed = Math.floor(Math.random() * 1e9);
  const TARGETS = [0.5, 0.75, 2, 3, 5, 6]; // E12 R × C listesiyle ±%5 içinde ulaşılabilir
  if (S.d4target == null || !TARGETS.includes(S.d4target)) S.d4target = TARGETS[S.seed % TARGETS.length];
  Lab.answers = S.answers;
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => Lab.store.save(KEY, S), 300); };
  Lab.onAnswer = () => { save(); progress(); };
  const near = (a, b, t) => Math.abs(a - b) <= t;
  const par = (a, b) => (!isFinite(a) ? b : !isFinite(b) ? a : (a * b) / (a + b));
  const rnd = (k) => { let x = (S.seed ^ Math.imul(k | 0, 2654435761)) >>> 0; x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 100000) / 100000; };
  // kondansatör toleransı: film ±%5, elektrolitik (≥1 µF) ±%20 — öğrenciye özgü sabit sapma
  const Cact = (c) => c * (1 + (rnd(Math.round(Math.log(c) * 1000)) * 2 - 1) * (c >= 1e-6 ? 0.2 : 0.05));
  const ms = (t) => num(t * 1e3, 2);
  const RGEN = 50;
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
    self.setLive = (src) => { self.cap = src; self.armed = false; set(); led.className = 'led on g'; st.textContent = 'AUTO · RUN'; };
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

  /* ================= GEZİNME / İLERLEME ================= */
  const pages = ['giris', 'onbilgi', 'onhaz', 'd1', 'd2', 'd3', 'd4', 'rapor'];
  function go(p) {
    S.page = p; save();
    $$('section.page').forEach((s) => s.classList.toggle('active', s.id === p));
    $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.p === p));
    const B = benches[p]; if (B && B.scope) B.scope.dirty = true;
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


  function recTable(key, map) {
    const tb = $('#' + key + 'tab tbody');
    tb.innerHTML = S[key + 'rows'].map((r, i) => `<tr><td>${i + 1}</td>${map(r).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
    tb.parentElement.parentElement.scrollTop = 1e6;
  }

  /* ================= ÖN HAZIRLIK ================= */
  numq('onhaz', '#preQ', { id: 'p1', q: '1) Örnek 3.4: V<sub>s</sub> = 24 V, R = 2 Ω, L = 200 mH, I<sub>0</sub> = −8 A. Akımın son değeri I<sub>s</sub> kaç amperdir?', answer: 12, unit: 'A', explain: 'Kalıcı durumda bobin kısa devre: I<sub>s</sub> = 24/2 = 12 A.', hint: 'Kalıcı durumda bobin nasıl davranır?' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) Aynı devrede akımın sıfırdan geçtiği an kaç ms\'dir?', answer: 51.1, tol: 1.5, unit: 'ms', explain: 'i = 12 − 20e<sup>−10t</sup> = 0 → t = ln(20/12)/10 = 51,1 ms.', hint: 'Önce i(t) = I<sub>s</sub> + (I<sub>0</sub> − I<sub>s</sub>)e<sup>−t/τ</sup> yazın, τ = L/R.' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) Örnek 3.5: V<sub>s</sub> = 40 V, R = 40 kΩ, C = 0,5 µF, V<sub>0</sub> = 10 V. Gerilim kaç ms\'de 30 V olur?', answer: 22, tol: 2, unit: 'ms', explain: 'v = 40 − 30e<sup>−50t</sup> = 30 → t = ln3/50 = 22 ms ≈ 1,1τ.', hint: 'τ = RC = 20 ms.' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) Örnek 3.5\'te t = 0<sup>+</sup>\'da kapasitör akımı kaç mA\'dir?', answer: 0.75, tol: 1, unit: 'mA', explain: 'i(0<sup>+</sup>) = (40 − 10)/40 k = 0,75 mA.', hint: 'R\'nin uçları arasındaki gerilim t = 0<sup>+</sup>\'da nedir?' });
  numq('onhaz', '#preQ', { id: 'p5', q: '5) Örnek 3.6: 60 V, 20 Ω seri, 60 Ω paralel, C = 25 µF. τ kaç µs\'dir?', answer: 375, tol: 1, unit: 'µs', explain: 'R<sub>Th</sub> = 20‖60 = 15 Ω; τ = 15 × 25 µ = 375 µs.', hint: 'Kaynağı kısa devre yapıp kapasitörün uçlarından bakın.' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) Bir öğrenci Örnek 3.4 için i(t) = 12 − 8e<sup>−10t</sup> yazıyor. Hata nedir?', opts: ['τ yanlış', 'Katsayı I<sub>0</sub> değil (I<sub>0</sub> − I<sub>s</sub>) = −20 olmalı; yazılan ifade t = 0\'da 4 A verir', 'Son değer yanlış', 'Hata yok'], correct: 1, explain: 'Doğrusu i = 12 − 20e<sup>−10t</sup> A; t = 0\'da −8 A verir.', hint: 't = 0 koyup kontrol edin.' });
  mcq('onhaz', '#preQ', { id: 'p7', q: '7) Anahtar t = 0\'da kapanıyor. x(∞) için hangi devre çözülür?', opts: ['Anahtarlamadan önceki devre', 'Anahtarlamadan sonraki devre, kalıcı durumda', 'Kaynakların söndürüldüğü devre', 'İkisinin ortalaması'], correct: 1, explain: 'x(0<sup>+</sup>): önceki devre; x(∞): sonraki devre; τ: sonraki devre, kaynaklar söndürülmüş.', hint: '“Son” değer ne zamanki devreye aittir?' });

  /* ================= DENEY 1 · RC + kare dalga ================= */
  const D1 = (() => {
    const self = { uni: true };
    const box = $('#d1inst');
    const fg = inst(box, 'FG-100 FONKSİYON ÜRETECİ · 50 Ω'); const fgL = lcd(fg.el, 'KARE · f · V<sub>pp</sub>', '', 190);
    const mb = document.createElement('div'); mb.className = 'row'; mb.style.cssText = 'gap:4px;margin-bottom:4px';
    mb.innerHTML = '<button class="seg-btn on" data-m="1">0 / +V</button><button class="seg-btn" data-m="0">±V/2</button>'; fg.el.insertBefore(mb, fg.c);
    $$('button', mb).forEach((b) => (b.onclick = () => { self.uni = b.dataset.m === '1'; $$('button', mb).forEach((x) => x.classList.toggle('on', x === b)); }));
    const kf = new Lab.Knob(fg.c, { label: 'Frekans', min: 1, max: 20000, log: true, value: 1000, dark: true, fmt: (v) => eng(v, 'Hz') });
    const ka = new Lab.Knob(fg.c, { label: 'Genlik', min: 0.5, max: 10, step: 0.1, value: 5, dark: true, fmt: (v) => num(v, 1) + ' Vpp' });
    const rb = inst(box, 'DİRENÇ · KONDANSATÖR', false);
    const kR = new Lab.Knob(rb.c, { label: 'R', list: [100, 220, 470, 1e3, 2.2e3, 4.7e3, 10e3, 22e3, 47e3, 100e3], value: 10e3, fmt: Lab.ohm });
    const kC = new Lab.Knob(rb.c, { label: 'C (nominal)', list: [10e-9, 22e-9, 47e-9, 0.1e-6, 0.22e-6, 0.47e-6, 1e-6, 2.2e-6, 10e-6], value: 0.1e-6, fmt: (v) => eng(v, 'F') + (v >= 1e-6 ? ' elk.' : '') });
    self.scope = mkScope($('#d1scope'), { title: 'CH1 üreteç çıkışı · CH2 v<sub>C</sub>', v1: 2, v2: 1, t: 2e-3, p1: -3, p2: -3, tan: 1, note: 'Sürekli çalışma, yükselen kenarda tetik (T▼). İMLEÇ değerlerini kullanarak %10 ve %90 noktalarını bulun.' });
    const g = $('#d1sch');
    E('circle', { cx: 70, cy: 130, r: 22, class: 'w', fill: '#fff' }, g); E('path', { d: 'M58,136 v-12 h8 v12 h8 v-12', class: 'w' }, g);
    sch.w(g, [[70, 108], [70, 60], [100, 60]]); sch.rH(g, 100, 170, 60); sch.t(g, 135, 45, '50 Ω (iç)').style.fill = '#777';
    E('rect', { x: 40, y: 30, width: 150, height: 160, fill: 'none', stroke: '#999', 'stroke-dasharray': '5 4', rx: 6 }, g); sch.t(g, 115, 205, 'fonksiyon üreteci', 'lbl').style.fill = '#777';
    sch.w(g, [[170, 60], [260, 60]]); sch.dot(g, 230, 60); sch.w(g, [[230, 60], [230, 30], [290, 30]]); sch.term(g, 294, 30); sch.t(g, 302, 34, 'CH1', 'lbl', 'start').style.fill = '#b8960a';
    sch.rH(g, 260, 360, 60); sch.w(g, [[360, 60], [440, 60], [440, 95]]); sch.capV(g, 440, 95, 150); sch.w(g, [[440, 150], [440, 180]]); sch.gnd(g, 440, 180);
    sch.dot(g, 440, 60); sch.w(g, [[440, 60], [520, 60]]); sch.term(g, 524, 60); sch.t(g, 532, 64, 'CH2 (v<tspan font-size="10" dy="3">C</tspan><tspan dy="-3">)</tspan>', 'lbl', 'start').style.fill = '#1592b8';
    sch.w(g, [[70, 152], [70, 180]]); sch.gnd(g, 70, 180);
    const tR = sch.t(g, 310, 45, ''), tC = sch.t(g, 462, 128, '', 'lbl', 'start'), tTau = sch.t(g, 640, 120, '', 'val'), tG = sch.t(g, 640, 150, '', 'val');
    let key = '';
    self.update = () => {
      const f = kf.value, Vpp = ka.value, R = kR.value, Cn = kC.value, C = Cact(Cn), tau = (R + RGEN) * C;
      const Vh = self.uni ? Vpp : Vpp / 2, Vl = self.uni ? 0 : -Vpp / 2, T = 1 / f, h = T / 2, a = Math.exp(-h / tau);
      const x = (Vl + Vh * a) / (1 + a), y = Vh + (x - Vh) * a;
      fgL(`${eng(f, 'Hz')} · ${num(Vpp, 1)} Vpp`);
      tR.textContent = 'R = ' + Lab.ohm(R); tC.textContent = 'C = ' + eng(Cn, 'F');
      tG.textContent = self.uni ? 'kare 0 / +' + num(Vpp, 1) + ' V' : 'kare ±' + num(Vpp / 2, 2) + ' V';
      tTau.textContent = '(T/2) : RC = ' + num(h / (R * Cn), 2);
      const k = [f, Vpp, R, Cn, self.uni].join('|');
      if (k !== key || self.scope.armed) {
        if (!self.uni && Cn >= 1e-6 && k !== key) { Lab.toast('⚠ Elektrolitik kondansatör simetrik kare dalgayla ters kutuplanıyor! 0/+V moduna geçin.', 4500); S.f.d1rev = true; }
        key = k;
        self.scope.setLive({
          gen(ts) {
            const A = new Float64Array(ts.length), B = new Float64Array(ts.length);
            for (let i = 0; i < ts.length; i++) {
              const ph = ((ts[i] % T) + T) % T; let vs, vc;
              if (ph < h) { vs = Vh; vc = Vh + (x - Vh) * Math.exp(-ph / tau); } else { vs = Vl; vc = Vl + (y - Vl) * Math.exp(-(ph - h) / tau); }
              A[i] = vs - (RGEN * (vs - vc)) / (R + RGEN); B[i] = vc;
            }
            return [A, B];
          },
          tan: { ch: 1, v0: x, slope: (Vh - x) / tau, vf: Vh },
        });
      }
      self.c = { f, Vpp, R, Cn, tau, Vh, Vl, x, y, ratio: h / (R * Cn) };
    };
    self.toggle = () => {};
    Object.assign(self, { kf, ka, kR, kC });
    return self;
  })();
  const d1map = (r) => [eng(r.f, 'Hz'), Lab.ohm(r.R), eng(r.Cn, 'F'), num(r.ratio, 2), num(r.vmin, 3), num(r.vmax, 3), ms(r.tA), ms(r.tB), num(r.vA, 3), num(r.vB, 3)];
  const d1table = () => recTable('d1', d1map);
  function d1rec() {
    const v = D1.scope.curv(), c = D1.c;
    if (!v) return Lab.toast('İMLEÇ\'i açın; A ve B imleçlerini v<sub>C</sub> eğrisine yerleştirin.');
    S.d1rows.push({ f: c.f, R: c.R, Cn: c.Cn, ratio: c.ratio, vmin: c.x, vmax: c.y, Vh: c.Vh, Vl: c.Vl, tA: v.tA, tB: v.tB, vA: v.y2A, vB: v.y2B }); save(); d1table();
    Lab.toast(`Kaydedildi: Δt = ${ms(v.tB - v.tA)} ms`);
  }
  $('#d1rec').onclick = d1rec;
  $('#d1del').onclick = () => { S.d1rows.pop(); save(); d1table(); };
  $('#d1csv').onclick = () => Lab.downloadCSV('hafta10_deney1.csv', ['#', 'f (Hz)', 'R', 'C nom', '(T/2)/RC', 'vC min', 'vC max', 'tA (ms)', 'tB (ms)', 'vC(A)', 'vC(B)'], S.d1rows.map((r, i) => [i + 1, +r.f.toPrecision(4), r.R, r.Cn, +r.ratio.toFixed(3), +r.vmin.toFixed(4), +r.vmax.toFixed(4), +(r.tA * 1e3).toFixed(4), +(r.tB * 1e3).toFixed(4), +r.vA.toFixed(4), +r.vB.toFixed(4)]));
  d1table();
  const isTr = (r) => { const s = r.Vh - r.Vl; return r.ratio >= 5 && near((r.vA - r.Vl) / s, 0.1, 0.025) && near((r.vB - r.Vl) / s, 0.9, 0.025) && r.tB > r.tA; };
  steps('d1', [
    { t: '<b>R = 10 kΩ, C = 0,1 µF</b> (τ ≈ 1 ms), üreteç <b>0/+V, 5 Vpp</b>. Frekansı T/2 ≥ 5τ olacak şekilde seçin (f ≤ 100 Hz): v<sub>C</sub> her yarım periyotta tam dolup boşalmalı.', test: () => { const c = D1.c; return c && c.R === 10e3 && c.Cn === 0.1e-6 && D1.uni && near(c.Vpp, 5, 0.05) && c.ratio >= 5; } },
    { t: 'İMLEÇ A\'yı yükselen kenarda v<sub>C</sub>\'nin <b>%10</b>\'una, B\'yi <b>%90</b>\'ına koyup kaydedin: t<sub>r</sub> = t<sub>B</sub> − t<sub>A</sub>.', test: () => S.d1rows.some(isTr) },
    { t: 'Frekansı <b>T/2 ≈ τ</b> olacak şekilde artırın ((T/2):RC 0,7–1,5) ve bir kayıt alın: v<sub>C</sub> artık son değere ulaşamıyor.', test: () => S.d1rows.some((r) => r.ratio >= 0.7 && r.ratio <= 1.5) },
    { t: 'Frekansı <b>T/2 ≤ 0,1τ</b> yapın ve bir kayıt alın: v<sub>C</sub> ortalama değerin çevresinde küçük bir üçgen.', test: () => S.d1rows.some((r) => r.ratio <= 0.1) },
    { t: 'Aynı C ile R\'yi değiştirip (ör. 22 kΩ) yükselme süresini yeniden ölçün ve kaydedin.', test: () => S.d1rows.some((r) => isTr(r) && r.R !== 10e3) },
  ]);
  numq('d1', '#d1Q', { id: 'd1q1', q: 'R = 10 kΩ, C = 0,1 µF ile ölçtüğünüz %10–%90 yükselme süresi kaç ms\'dir?', answer: () => 2.197 * (10e3 + RGEN) * Cact(0.1e-6) * 1e3, tol: 5, unit: 'ms', explain: 't<sub>r</sub> = τ ln9 ≈ 2,2τ; τ = (R + 50 Ω)C. Nominalden farkı kondansatör toleransıdır.', hint: 'Tablodaki t<sub>B</sub> − t<sub>A</sub>.' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'Ölçtüğünüz t<sub>r</sub>\'den τ kaç ms çıkar?', answer: () => (10e3 + RGEN) * Cact(0.1e-6) * 1e3, tol: 5, unit: 'ms', explain: 'τ = t<sub>r</sub>/ln9 = t<sub>r</sub>/2,197.', hint: 't<sub>r</sub> = τ ln(0,9/0,1)' });
  numq('d1', '#d1Q', { id: 'd1q3', q: '0/+5 V kare dalga, T/2 ≪ τ: v<sub>C</sub> yaklaşık hangi değerin çevresinde dalgalanır (V)?', answer: 2.5, tol: 3, unit: 'V', explain: 'Kapasitör giriş dalgasının ortalamasına (DC bileşenine) oturur: 2,5 V.', hint: 'Kare dalganın ortalaması.' });
  numq('d1', '#d1Q', { id: 'd1q4', q: 'τ = 1 ms, 5 Vpp, f = 10 kHz için v<sub>C</sub>\'nin tepeden tepeye dalgalanması yaklaşık kaç mV\'tur?', answer: 125, tol: 6, unit: 'mV', explain: 'ΔV ≈ V<sub>pp</sub>·T/(4τ) = 5 × 0,1 ms / 4 ms = 125 mV. Akım ≈ sabit (V<sub>pp</sub>/2)/R, C\'yi T/2 boyunca doğrusal doldurur: integral alma.', hint: 'Yarım periyotta akım ≈ (V<sub>pp</sub>/2)/R, ΔV = iΔt/C.' });
  mcq('d1', '#d1Q', { id: 'd1q5', q: 'R = 100 Ω, C = 10 µF seçildiğinde ölçülen τ, RC = 1 ms\'den yaklaşık %50 büyük çıkıyor. Neden?', opts: ['Osiloskop hatası', 'Üretecin 50 Ω iç direnci R ile seri: τ = 150 Ω × 10 µF = 1,5 ms (artı elektrolitik toleransı)', 'Kapasitör ters bağlı', 'Frekans çok düşük'], correct: 1, explain: 'Kaynağın iç direnci τ\'daki R<sub>Th</sub>\'nin parçasıdır. Ayrıca ±%20 elektrolitik toleransı eklenir.', hint: 'C\'nin uçlarından bakınca hangi dirençleri görürsünüz?' });

  /* ================= DENEY 2 · RL basamak ================= */
  const LLIST = [0.01, 0.047, 0.1, 0.18, 0.2, 0.47, 1];
  const RCOIL = { 0.01: 0.4, 0.047: 0.9, 0.1: 1.2, 0.18: 1.6, 0.2: 1.8, 0.47: 3.3, 1: 6.8 };
  const ILIM2 = 15;
  const D2 = (() => {
    const self = { on: false, i: 0, real: false };
    const box = $('#d2inst');
    const ps = inst(box, 'DC KAYNAK · V<sub>s</sub> (sınır 15 A)', true, '<span class="led" id="d2cc"></span> CC'); const psL = lcd(ps.el, 'V · A', '', 150);
    const kV = new Lab.Knob(ps.c, { label: 'V_s', min: 0, max: 30, step: 0.1, value: 24, dark: true, fmt: (v) => num(v, 1) + ' V' });
    const cs = inst(box, 'ÖN KOŞUL AKIM KAYNAĞI'); const csL = lcd(cs.el, 'I<sub>0</sub>', 'A', 90);
    const kI = new Lab.Knob(cs.c, { label: 'I_0', min: -10, max: 15, step: 0.5, value: 0, dark: true, fmt: (v) => num(v, 1) + ' A' });
    const rb = inst(box, 'GÜÇ DİRENCİ · BOBİN', false);
    const kR = new Lab.Knob(rb.c, { label: 'R', list: [2, 4.7, 10, 22, 47], value: 2, fmt: Lab.ohm });
    const kL = new Lab.Knob(rb.c, { label: 'L', list: LLIST, value: 0.2, fmt: (v) => eng(v, 'H') });
    chk(rb.c, 'Gerçek bobin (r<sub>L</sub>)', false, (v) => (self.real = v));
    const sw = inst(box, 'AKTARMA ANAHTARI', false);
    const swB = document.createElement('button'); swB.className = 'btn'; swB.style.cssText = 'width:160px;padding:10px 6px;font-weight:700'; sw.c.appendChild(swB);
    swB.onclick = () => self.toggle();
    self.scope = mkScope($('#d2scope'), { title: 'CH1 v<sub>L</sub> · CH2 i<sub>L</sub>', v1: 10, v2: 5, t: 0.02, p1: 0, p2: 0, tan: 1, ch2unit: 'A', note: 'CH2: akım probu 1 V ≙ 1 A. TEĞET akım eğrisine çizilir ve son değer çizgisini τ\'da keser.' });
    const g = $('#d2sch');
    E('circle', { cx: 80, cy: 130, r: 22, class: 'w', fill: '#fff' }, g); E('path', { d: 'M80,145 v-28 m-6,8 l6,-8 l6,8', class: 'w' }, g); sch.t(g, 46, 134, 'I<tspan font-size="10" dy="3">0</tspan>', 'lbl', 'end');
    sch.w(g, [[80, 108], [80, 60], [250, 60]]); sch.w(g, [[80, 152], [80, 190]]); sch.gnd(g, 80, 190);
    sch.src(g, 470, 130); sch.w(g, [[470, 110], [470, 60], [440, 60]]); sch.rH(g, 360, 440, 60); sch.w(g, [[360, 60], [350, 60]]); sch.w(g, [[470, 150], [470, 190]]); sch.gnd(g, 470, 190);
    sch.term(g, 254, 60); sch.term(g, 346, 60); const blade = sch.blade(g); sch.dot(g, 300, 95);
    sch.w(g, [[300, 95], [300, 115]]); sch.indV(g, 300, 115, 180); sch.w(g, [[300, 180], [300, 190]]); sch.gnd(g, 300, 190);
    E('path', { d: 'M318,120 v22 m-5,-6 l5,6 l5,-6', class: 'w' }, g); sch.t(g, 326, 136, 'CH2: i<tspan font-size="10" dy="3">L</tspan>', 'lbl', 'start').style.fill = '#1592b8';
    sch.w(g, [[300, 105], [240, 105]]); sch.term(g, 236, 105); sch.t(g, 230, 109, 'CH1: v<tspan font-size="10" dy="3">L</tspan>', 'lbl', 'end').style.fill = '#b8960a';
    sch.t(g, 500, 134, 'V<tspan font-size="10" dy="3">s</tspan>', 'lbl', 'start');
    const tR = sch.t(g, 400, 45, ''), tL = sch.t(g, 326, 165, '', 'lbl', 'start'), tI = sch.t(g, 640, 100, '', 'val'), tV = sch.t(g, 640, 125, '', 'val'), tSt = sch.t(g, 640, 75, '', 'val');
    const P = () => {
      const L = kL.value, r = self.real ? RCOIL[L] : 0, Rt = kR.value + r, Is0 = kV.value / Rt;
      return { Vs: kV.value, R: kR.value, L, r, I0: kI.value, tau: L / Rt, Is: Math.min(Is0, ILIM2), cc: Is0 > ILIM2 };
    };
    self.P = P;
    self.update = (dt) => {
      const p = (self.p = P());
      if (!self.on) self.i = p.I0; else self.i = p.Is + (self.i - p.Is) * Math.exp(-dt / p.tau);
      const vL = self.on ? (p.cc ? p.Is * (p.R + p.r) : p.Vs) - self.i * p.R : self.i * p.r;
      psL(`${num(p.Vs, 1)} V · ${num(self.on ? self.i : 0, 2)} A`); csL(num(p.I0, 1));
      $('#d2cc').classList.toggle('on', self.on && p.cc);
      swB.innerHTML = self.on ? 'BOBİN → V<sub>s</sub>–R<br><small>ön koşula döndür</small>' : 'BOBİN → I<sub>0</sub> kaynağı<br><small>çevir → t = 0</small>';
      swB.classList.toggle('warn', self.on);
      self.on ? setLine(blade, 300, 95, 344, 62) : setLine(blade, 300, 95, 256, 62);
      tR.textContent = 'R = ' + Lab.ohm(p.R); tL.textContent = 'L = ' + eng(p.L, 'H') + (p.r ? ' (r = ' + num(p.r, 1) + ' Ω)' : '');
      tI.textContent = 'i_L = ' + num(self.i, 3) + ' A'; tV.textContent = 'v_L = ' + num(vL, 2) + ' V';
      tSt.textContent = self.on ? (p.cc ? 'Kaynak akım sınırında (CC)!' : 'basamak tepkisi sürüyor') : 'ön koşul: i_L = I_0';
    };
    self.toggle = () => {
      const p = P();
      if (self.on) { self.on = false; Lab.toast('Bobin yeniden ön koşul akım kaynağına aktarıldı (i_L = I_0).'); return; }
      self.on = true;
      if (p.cc) Lab.toast('Kaynak 15 A akım sınırına girdi: son değer V_s/R olamaz. R\'yi büyütün ya da V_s\'yi düşürün.', 4500);
      const Vs = p.cc ? p.Is * (p.R + p.r) : p.Vs, I0 = p.I0;
      const src = {
        p, I0, Is: p.Is, tau: p.tau,
        gen(ts) {
          const A = new Float64Array(ts.length), B = new Float64Array(ts.length);
          for (let k = 0; k < ts.length; k++) {
            const t = ts[k];
            if (t < 0) { A[k] = I0 * p.r; B[k] = I0; } else { const i = p.Is + (I0 - p.Is) * Math.exp(-t / p.tau); B[k] = i; A[k] = Vs - i * p.R; }
          }
          return [A, B];
        },
        tan: { ch: 1, v0: I0, slope: (p.Is - I0) / p.tau, vf: p.Is },
      };
      if (self.scope.trigger(src)) { S.f.d2cap = (S.f.d2cap || 0) + 1; save(); Lab.toast('✔ Basamak tepkisi yakalandı.'); }
      else Lab.toast('Bobin V_s–R koluna aktarıldı. Osiloskop kurulu değildi: olay kaydedilmedi. (Önce SINGLE)');
    };
    Object.assign(self, { kV, kI, kR, kL });
    return self;
  })();
  const d2map = (r) => [num(r.Vs, 1), Lab.ohm(r.R), eng(r.L, 'H'), num(r.I0, 1), ms(r.tA), ms(r.tB), num(r.iA, 3), num(r.iB, 3), num(r.vA, 2)];
  const d2table = () => recTable('d2', d2map);
  function d2rec() {
    const v = D2.scope.curv(), c = D2.scope.cap;
    if (!v) return Lab.toast('Önce bir basamak tepkisi yakalayın ve İMLEÇ\'i açın.');
    S.d2rows.push({ Vs: c.p.Vs, R: c.p.R, L: c.p.L, r: c.p.r, I0: c.I0, Is: c.Is, tau: c.tau, tA: v.tA, tB: v.tB, iA: v.y2A, iB: v.y2B, vA: v.y1A }); save(); d2table();
    Lab.toast(`Kaydedildi: t_B = ${ms(v.tB)} ms, i_B = ${num(v.y2B, 3)} A`);
  }
  $('#d2rec').onclick = d2rec;
  $('#d2del').onclick = () => { S.d2rows.pop(); save(); d2table(); };
  $('#d2csv').onclick = () => Lab.downloadCSV('hafta10_deney2.csv', ['#', 'Vs (V)', 'R (ohm)', 'L (H)', 'I0 (A)', 'tA (ms)', 'tB (ms)', 'iA (A)', 'iB (A)', 'vL(A) (V)'], S.d2rows.map((r, i) => [i + 1, r.Vs, r.R, r.L, r.I0, +(r.tA * 1e3).toFixed(3), +(r.tB * 1e3).toFixed(3), +r.iA.toFixed(4), +r.iB.toFixed(4), +r.vA.toFixed(3)]));
  d2table();
  const ex34 = (p) => p && near(p.Vs, 24, 0.05) && p.R === 2 && p.L === 0.2 && !p.r;
  const t0row = (r) => Math.abs(r.tA) < 0.02 * r.tau;
  const tauRow = (r) => t0row(r) && near((r.iB - r.Is) / (r.iA - r.Is), 0.368, 0.025);
  steps('d2', [
    { t: 'Örnek 3.4: <b>V<sub>s</sub> = 24 V, R = 2 Ω, L = 200 mH</b> (ideal bobin), ön koşul <b>I<sub>0</sub> = −8 A</b>.', test: () => ex34(D2.p) && D2.p.I0 === -8 },
    { t: 'SINGLE ile kurup bobini V<sub>s</sub>–R koluna aktarın (<kbd>S</kbd>). CH1\'de v<sub>L</sub>(0<sup>+</sup>)\'ı okuyun: kaynaktan büyük mü?', test: () => D2.scope.cap && ex34(D2.scope.cap.p) && D2.scope.cap.I0 === -8 },
    { t: 'A imlecini t = 0\'a, B imlecini akımın <b>sıfırdan geçtiği</b> ana koyup kaydedin.', test: () => S.d2rows.some((r) => ex34(r) && r.I0 === -8 && t0row(r) && Math.abs(r.iB) < 0.15) },
    { t: 'B imlecini kalan farkın %36,8\'ine (i<sub>B</sub> − I<sub>s</sub> = 0,368(I<sub>0</sub> − I<sub>s</sub>)) koyup τ\'yu ölçün; TEĞET ile karşılaştırın.', test: () => S.d2rows.some((r) => ex34(r) && tauRow(r)) },
    { t: 'Yalnızca I<sub>0</sub>\'ı değiştirerek (ör. 0, 6, 14 A) en az <b>üç farklı I<sub>0</sub></b> için τ ölçümü kaydedin.', test: () => { const L = S.d2rows.filter((r) => ex34(r) && tauRow(r)); return new Set(L.map((r) => r.I0)).size >= 3; } },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'Örnek 3.4\'te τ kaç ms\'dir?', answer: 100, tol: 1, unit: 'ms', explain: 'τ = L/R = 0,2/2 = 100 ms.', hint: 'τ = L/R' });
  numq('d2', '#d2Q', { id: 'd2q2', q: 'v<sub>L</sub>(0<sup>+</sup>) kaç volttur?', answer: 40, tol: 1, unit: 'V', explain: 'v<sub>L</sub>(0<sup>+</sup>) = V<sub>s</sub> − I<sub>0</sub>R = 24 − (−8)(2) = 40 V.', hint: 'KVL: v<sub>L</sub> = V<sub>s</sub> − iR, i(0<sup>+</sup>) = I<sub>0</sub>.' });
  numq('d2', '#d2Q', { id: 'd2q3', q: 'Ölçtüğünüz sıfır geçiş anı kaç ms\'dir?', answer: 51.1, tol: 3, unit: 'ms', explain: 't = τ ln[(I<sub>0</sub> − I<sub>s</sub>)/(0 − I<sub>s</sub>)] = 0,1 ln(20/12) = 51,1 ms.', hint: 'Tablodaki i<sub>B</sub> ≈ 0 satırının t<sub>B</sub> değeri.' });
  numq('d2', '#d2Q', { id: 'd2q4', q: 'I<sub>0</sub> = 14 A olsaydı t = 100 ms\'de akım kaç amper olurdu?', answer: 12 + 2 * Math.exp(-1), tol: 1, unit: 'A', explain: 'i = 12 + (14 − 12)e<sup>−1</sup> = 12,74 A. Akım bu kez yukarıdan iner.', hint: 'Aynı formül, I<sub>0</sub> = 14.' });
  mcq('d2', '#d2Q', { id: 'd2q5', q: 'Farklı I<sub>0</sub> değerleriyle yaptığınız ölçümlerin ortak özelliği nedir?', opts: ['Hepsi aynı anda 12 A\'e ulaşır', 'Hepsi aynı τ ile yaklaşır; farkın %63,2\'si her seferinde bir τ\'da kapanır', 'Büyük başlayan daha hızlı oturur', 'Negatif başlayan 12 A\'e ulaşamaz'], correct: 1, explain: 'τ yalnızca devre elemanlarına bağlıdır; başlangıç değeri yalnızca katsayıyı değiştirir.', hint: 'Ölçtüğünüz τ değerlerini karşılaştırın.' });

  /* ================= DENEY 3 · Dört adımlı yöntem ================= */
  const C36 = { Vs: 60, R1: 20, R2: 60, C: 25e-6, V0: 0, id: 0 };
  function newCirc() {
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    let V0; do { V0 = Math.round(Math.random() * 30 - 8); } while (V0 === 0);
    return { Vs: pick([12, 15, 24, 30]), R1: pick([1e3, 2.2e3, 4.7e3, 10e3]), R2: pick([2.2e3, 4.7e3, 10e3, 22e3]), C: pick([1e-6, 2.2e-6, 4.7e-6, 10e-6]), V0, id: (S.d3c ? S.d3c.id : 0) + 1 };
  }
  if (!S.d3c) S.d3c = Object.assign({}, C36);
  if (!S.wiz) S.wiz = {};
  const cv3 = () => { const c = S.d3c; return { x0: c.V0, xf: (c.Vs * c.R2) / (c.R1 + c.R2), tau: par(c.R1, c.R2) * c.C, iC0: ((c.Vs * c.R2) / (c.R1 + c.R2) - c.V0) / par(c.R1, c.R2) }; };
  const D3 = (() => {
    const self = { closed: false, vC: S.d3c.V0 };
    const box = $('#d3inst');
    const cb = inst(box, 'DEVRE KARTI', false); const cL = lcd(cb.el, 'Kart no', '', 80);
    const nb = document.createElement('button'); nb.className = 'btn sec small'; nb.textContent = 'Yeni devre (rastgele)'; cb.c.appendChild(nb);
    const ob = document.createElement('button'); ob.className = 'btn sec small'; ob.textContent = 'Örnek 3.6'; cb.c.appendChild(ob);
    const setC = (c) => { S.d3c = c; S.wiz = {}; self.closed = false; self.vC = c.V0; save(); self.scope.cap = null; self.scope.dirty = true; wizRender(); plotDraw(); Lab.toast('Yeni devre kartı takıldı. Değerleri şemadan okuyun.'); };
    nb.onclick = () => setC(newCirc()); ob.onclick = () => setC(Object.assign({}, C36, { id: (S.d3c.id || 0) + 1 }));
    const sw = inst(box, 'ANAHTAR S', false);
    const swB = document.createElement('button'); swB.className = 'btn'; swB.style.cssText = 'width:150px;padding:10px 6px;font-weight:700'; sw.c.appendChild(swB);
    swB.onclick = () => self.toggle();
    self.scope = mkScope($('#d3scope'), { title: 'CH1 v<sub>C</sub> · CH2 i<sub>C</sub>', v1: 10, v2: 1, t: 1e-4, p1: -2, p2: -2, ch2unit: 'A', note: 'CH2: akım probu 1 V ≙ 1 A. Kaydı yakaladıktan sonra sihirbazdan “Eğrimi çiz” deyin.' });
    const g = $('#d3sch');
    sch.src(g, 60, 130); sch.w(g, [[60, 110], [60, 60], [96, 60]]); sch.term(g, 100, 60); sch.term(g, 150, 60); const blade = sch.blade(g); sch.t(g, 125, 44, 'S');
    sch.w(g, [[154, 60], [180, 60]]); sch.rH(g, 180, 270, 60); sch.w(g, [[270, 60], [460, 60]]); sch.dot(g, 330, 60); sch.dot(g, 430, 60);
    sch.w(g, [[60, 150], [60, 190]]); sch.gnd(g, 60, 190);
    sch.rV(g, 330, 60, 190); sch.gnd(g, 330, 190); sch.w(g, [[430, 60], [430, 100]]); sch.capV(g, 430, 100, 160); sch.w(g, [[430, 160], [430, 190]]); sch.gnd(g, 430, 190);
    sch.w(g, [[460, 60], [520, 60]]); sch.term(g, 524, 60); sch.t(g, 532, 64, 'CH1', 'lbl', 'start').style.fill = '#b8960a';
    sch.t(g, 26, 135, 'V<tspan font-size="10" dy="3">s</tspan>');
    const tVs = sch.t(g, 88, 140, '', 'val', 'start'), tR1 = sch.t(g, 225, 44, ''), tR2 = sch.t(g, 346, 130, '', 'lbl', 'start'), tC = sch.t(g, 452, 125, '', 'lbl', 'start'), tV0 = sch.t(g, 452, 145, '', 'val', 'start'), tVc = sch.t(g, 640, 110, '', 'val');
    const tPre = sch.t(g, 640, 140, '', 'lbl');
    self.update = (dt) => {
      const c = S.d3c, v = cv3();
      if (!self.closed) self.vC = c.V0; else self.vC = v.xf + (self.vC - v.xf) * Math.exp(-dt / v.tau);
      cL(String(c.id));
      swB.innerHTML = self.closed ? 'S: KAPALI<br><small>aç (ön şarja dön)</small>' : 'S: AÇIK<br><small>kapat → t = 0</small>';
      swB.classList.toggle('warn', self.closed);
      self.closed ? setLine(blade, 104, 60, 146, 60) : setLine(blade, 104, 60, 142, 36);
      tVs.textContent = c.Vs + ' V'; tR1.textContent = 'R1 = ' + Lab.ohm(c.R1); tR2.textContent = 'R2 = ' + Lab.ohm(c.R2); tC.textContent = 'C = ' + eng(c.C, 'F');
      tV0.textContent = 'ön şarj V0 = ' + num(c.V0, 1) + ' V'; tVc.textContent = 'v_C = ' + num(self.vC, 2) + ' V';
      tPre.textContent = self.closed ? '' : 'ön şarj kaynağı bağlı';
    };
    self.toggle = () => {
      if (self.closed) { self.closed = false; Lab.toast('Anahtar açıldı; ön şarj kaynağı kapasitörü yeniden V0\'a getirdi.'); return; }
      self.closed = true;
      const c = Object.assign({}, S.d3c), v = cv3(), V0 = self.vC;
      const src = {
        circ: c,
        gen(ts) {
          const A = new Float64Array(ts.length), B = new Float64Array(ts.length);
          for (let k = 0; k < ts.length; k++) { const t = ts[k]; if (t < 0) { A[k] = V0; B[k] = 0; } else { const e = Math.exp(-t / v.tau); A[k] = v.xf + (V0 - v.xf) * e; B[k] = ((v.xf - V0) / par(c.R1, c.R2)) * e; } }
          return [A, B];
        },
        tan: { ch: 0, v0: V0, slope: (v.xf - V0) / v.tau, vf: v.xf },
      };
      if (self.scope.trigger(src)) { S.f['d3cap' + c.id] = true; save(); Lab.toast('✔ Basamak tepkisi yakalandı.'); }
      else Lab.toast('Anahtar kapandı. Osiloskop kurulu değildi. (Önce SINGLE)');
    };
    return self;
  })();
  // sihirbaz
  const WZ = [
    ['x0', '1 · x(0<sup>+</sup>) = v<sub>C</sub>(0<sup>+</sup>)', 'V', 'Anahtarlamadan ÖNCEKİ devre: kapasitör ön şarj kaynağına bağlı. Süreklilik: v<sub>C</sub>(0<sup>+</sup>) = v<sub>C</sub>(0<sup>−</sup>).'],
    ['xf', '2 · x(∞) = v<sub>C</sub>(∞)', 'V', 'SONRAKİ devre, kalıcı durum: C açık devre; R<sub>1</sub>–R<sub>2</sub> gerilim bölücü.'],
    ['tau', '3 · τ = R<sub>Th</sub>C', 'ms', 'SONRAKİ devre, V<sub>s</sub> kısa devre: C\'nin uçlarından R<sub>1</sub>‖R<sub>2</sub> görünür.'],
  ];
  function wizRender() {
    const w = S.wiz;
    $('#wiz').innerHTML = WZ.map(([k, lab, u, hint]) => `<div class="q"><div class="qt">${lab}</div><div class="row"><input type="text" size="9" id="wz_${k}" value="${w[k] != null ? String(w[k]).replace('.', ',') : ''}"> <span>${u}</span> <button class="btn small" data-k="${k}">Kontrol et</button></div><div class="fb ${w[k + 'ok'] ? 'ok' : w[k] != null ? 'bad' : ''}">${w[k + 'ok'] ? '✔ Doğru.' : w[k] != null ? '✘ Tekrar düşünün: ' + hint : '<span style="color:#667">' + hint + '</span>'}</div></div>`).join('') +
      `<div class="q"><div class="qt">4 · Yerine koy: v<sub>C</sub>(t) = x<sub>f</sub> + [x(0) − x<sub>f</sub>] e<sup>−t/τ</sup></div><div id="wzExpr" style="font:15px Consolas;margin:6px 0"></div><button class="btn small" id="wzPlot">Eğrimi ölçümün üstüne çiz</button></div>`;
    $$('#wiz button[data-k]').forEach((b) => (b.onclick = () => {
      const k = b.dataset.k, v = Lab.parse($('#wz_' + k).value);
      if (!isFinite(v)) return Lab.toast('Geçerli bir sayı girin.');
      const t = cv3(), ref = k === 'tau' ? t.tau * 1e3 : t[k];
      S.wiz[k] = v; S.wiz[k + 'ok'] = Math.abs(v - ref) <= Math.abs(ref) * 0.02 + 0.05 * (k === 'tau' ? 0 : 1); save(); wizRender();
    }));
    const W = S.wiz;
    $('#wzExpr').innerHTML = W.x0 != null && W.xf != null && W.tau != null ? `v<sub>C</sub>(t) = ${num(W.xf, 2)} + (${num(W.x0 - W.xf, 2)}) e<sup>−t/${num(W.tau, 3)} ms</sup> V` : 'Önce üç değeri girin.';
    $('#wzPlot').onclick = () => { if (W.x0 == null || W.xf == null || W.tau == null) return Lab.toast('Önce üç değeri girin.'); if (!D3.scope.cap || D3.scope.cap.circ.id !== S.d3c.id) return Lab.toast('Önce bu devre kartının basamak tepkisini yakalayın (SINGLE + S).'); plotDraw(true); };
  }
  const p3 = new Lab.Plot($('#d3plot'), { xlabel: 't  (ms)', ylabel: 'v_C  (V)' });
  function plotDraw(user) {
    const sc = D3.scope, ser = [];
    let msg = '';
    if (sc.cap && sc.scope.data && sc.cap.circ.id === S.d3c.id) {
      const ts = sc.ts, y = sc.scope.data.y[0], pts = [];
      for (let i = 0; i < ts.length; i += 5) pts.push([ts[i] * 1e3, y[i]]);
      ser.push({ pts, line: true, color: '#c9a400', width: 3 });
      const W = S.wiz;
      if ((user || S.wiz.drawn) && W.x0 != null) {
        const up = [], tauS = W.tau / 1e3; let se = 0, n = 0;
        for (let i = 0; i < ts.length; i++) { const t = ts[i]; const m = t < 0 ? W.x0 : W.xf + (W.x0 - W.xf) * Math.exp(-t / tauS); if (i % 5 === 0) up.push([t * 1e3, m]); if (t >= 0) { se += (m - y[i]) ** 2; n++; } }
        ser.push({ pts: up, line: true, color: '#0b5cad', dash: [6, 4], width: 2 });
        const span = Math.max(Math.abs(cv3().xf - sc.cap.circ.V0), 1e-6), err = (100 * Math.sqrt(se / n)) / span;
        S.wiz.drawn = true; S.wiz.err = err; S.wiz.errId = S.d3c.id;
        if (err < 3) { S.f['d3fit' + S.d3c.id] = true; if (S.d3c.V0 !== 0) S.f.d3fitV0 = true; if (S.d3c.Vs === 60 && S.d3c.R1 === 20 && S.d3c.R2 === 60) S.f.d3fit36 = true; }
        save();
        msg = `Sizin eğriniz (mavi kesikli) ile ölçüm (sarı) arasındaki RMS fark: <b>%${num(err, 2)}</b> (son değere göre). ${err < 3 ? '✔ Örtüşüyor!' : 'Hangi adım yanlış olabilir? Eğrinin başlangıcına, son değerine ve eğimine bakın.'}`;
        if (user) Lab.toast(err < 3 ? '✔ Eğriniz ölçümle örtüşüyor.' : 'Eğri ölçümle örtüşmüyor; adımları gözden geçirin.');
      }
      p3.draw(ser);
    } else { p3.draw([{ pts: [] }], [0, 1], [0, 1]); msg = 'Bu devre kartı için henüz kayıt yok.'; }
    $('#d3err').innerHTML = msg;
  }
  wizRender();
  steps('d3', [
    { t: '<b>Örnek 3.6</b> kartıyla (60 V, 20 Ω, 60 Ω, 25 µF, V<sub>0</sub> = 0) sihirbazın ilk üç adımını doğru tamamlayın.', test: () => S.d3c.Vs === 60 && S.d3c.R1 === 20 && S.wiz.x0ok && S.wiz.xfok && S.wiz.tauok },
    { t: 'SINGLE ile kurup anahtarı kapatın; ZAMAN/d\'yi ≈5τ ekrana sığacak şekilde ayarlayın.', test: () => D3.scope.cap && D3.scope.cap.circ.Vs === 60 && D3.scope.cap.circ.R1 === 20 && D3.scope.scope.tdiv * 9 >= 4 * 375e-6 },
    { t: '“Eğrimi ölçümün üstüne çiz” ile kendi eğrinizi çizin: fark <b>%3\'ün altında</b> olmalı.', test: () => !!S.f.d3fit36 },
    { t: '<b>Yeni devre</b> alın (V<sub>0</sub> ≠ 0, örneğin negatif ön şarj) ve aynı dört adımı tamamlayıp eğrinizi ölçümle örtüştürün.', test: () => !!S.f.d3fitV0 },
  ]);
  numq('d3', '#d3Q', { id: 'd3q1', q: 'Örnek 3.6: V<sub>Th</sub> kaç volttur?', answer: 45, tol: 1, unit: 'V', explain: '60 × 60/80 = 45 V.', hint: 'Kapasitörü söküp açık devre gerilimini bulun.' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'Örnek 3.6: kapasitör akımı i<sub>C</sub>(0<sup>+</sup>) kaç amperdir?', answer: 3, tol: 2, unit: 'A', explain: 'Boş kapasitör t = 0<sup>+</sup>\'da kısa devre gibidir: V<sub>Th</sub>/R<sub>Th</sub> = 45/15 = 3 A. CH2\'de görün.', hint: 'v<sub>C</sub>(0<sup>+</sup>) = 0 iken R<sub>Th</sub>\'den geçen akım.' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'Örnek 3.6: gerilim kaç µs\'de 40 V olur?', answer: 824, tol: 1.5, unit: 'µs', explain: 't = τ ln(45/5) = 375 × 2,197 = 824 µs ≈ 2,2τ. İmleçle doğrulayın.', hint: '45(1 − e<sup>−t/τ</sup>) = 40' });
  numq('d3', '#d3Q', { id: 'd3q4', q: 'Şu anki devre kartınızda kapasitör gerilimi kaç volta oturur?', answer: () => cv3().xf, tol: 1, unit: 'V', explain: 'x<sub>f</sub> = V<sub>s</sub>R<sub>2</sub>/(R<sub>1</sub> + R<sub>2</sub>).', hint: 'Sihirbazın 2. adımı.' });
  mcq('d3', '#d3Q', { id: 'd3q5', q: 'Sihirbazda τ\'yu R<sub>1</sub>C (R<sub>2</sub>\'yi unutarak) girerseniz eğriniz ölçüme göre nasıl görünür?', opts: ['Başlangıç değeri yanlış olur', 'Son değer yanlış olur', 'Başlangıç ve son değer doğru, ama eğri ölçümden daha yavaş oturur (τ büyük)', 'Eğri hiç değişmez'], correct: 2, explain: 'R<sub>1</sub> &gt; R<sub>1</sub>‖R<sub>2</sub>; τ büyür. Her adımın hatası eğrinin farklı bir yerini bozar: x(0) başlangıcı, x<sub>f</sub> sonu, τ eğimi.', hint: 'Hangi parametre eğrinin hızını belirler?' });

  /* ================= DENEY 4 · Zamanlayıcı ================= */
  const E12 = []; [1e3, 1e4, 1e5].forEach((d) => [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2].forEach((m) => E12.push(+(m * d).toPrecision(3)))); E12.push(1e6);
  const CL4 = [1e-6, 2.2e-6, 4.7e-6, 10e-6, 22e-6, 47e-6, 100e-6, 220e-6, 470e-6];
  const D4 = (() => {
    const self = { run: false, t: 0, vC: 0, fired: false, relay: false, diode: true, log: [] };
    const box = $('#d4inst');
    const ps = inst(box, 'DC KAYNAK · V<sub>s</sub>'); const psL = lcd(ps.el, 'V<sub>s</sub> · V<sub>th</sub> = ⅔V<sub>s</sub>', '', 150);
    const kV = new Lab.Knob(ps.c, { label: 'V_s', min: 5, max: 15, step: 0.5, value: 12, dark: true, fmt: (v) => num(v, 1) + ' V' });
    const rc = inst(box, 'ZAMANLAMA ELEMANLARI', false);
    const kR = new Lab.Knob(rc.c, { label: 'R', list: E12, value: 100e3, fmt: Lab.ohm });
    const kC = new Lab.Knob(rc.c, { label: 'C (elk.)', list: CL4, value: 10e-6, fmt: (v) => eng(v, 'F') });
    const ob = inst(box, 'ÇIKIŞ', false);
    const mb = document.createElement('div'); mb.className = 'row'; mb.style.gap = '4px';
    mb.innerHTML = '<button class="seg-btn on" data-o="led">LED</button><button class="seg-btn" data-o="relay">Röle</button>'; ob.c.appendChild(mb);
    $$('button', mb).forEach((b) => (b.onclick = () => { self.relay = b.dataset.o === 'relay'; $$('button', mb).forEach((x) => x.classList.toggle('on', x === b)); }));
    chk(ob.c, 'Röle bobininde 1N4007', true, (v) => (self.diode = v));
    const tm = inst(box, 'KRONOMETRE · KONTROL'); const tL = lcd(tm.el, 'süre', 's', 110); const vL = lcd(tm.el, 'DMM v<sub>C</sub>', 'V', 110);
    const sB = document.createElement('button'); sB.className = 'btn'; sB.style.cssText = 'width:130px;font-weight:700'; tm.c.appendChild(sB);
    const dB = document.createElement('button'); dB.className = 'btn sec small'; dB.textContent = 'C\'yi boşalt'; tm.c.appendChild(dB);
    sB.onclick = () => self.toggle();
    dB.onclick = () => { if (self.run) return Lab.toast('Önce durdurun.'); self.vC = 0; Lab.toast('Kapasitör 100 Ω üzerinden boşaltıldı: v_C = 0.'); };
    const g = $('#d4sch');
    sch.src(g, 50, 130); sch.w(g, [[50, 110], [50, 50], [86, 50]]); sch.term(g, 90, 50); sch.term(g, 140, 50); const blade = sch.blade(g); sch.t(g, 115, 34, 'BAŞLAT');
    sch.w(g, [[144, 50], [170, 50]]); sch.rH(g, 170, 250, 50); sch.w(g, [[250, 50], [290, 50]]); sch.dot(g, 290, 50); sch.w(g, [[290, 50], [290, 90]]); sch.capV(g, 290, 90, 150); sch.w(g, [[290, 150], [290, 200]]); sch.gnd(g, 290, 200);
    sch.w(g, [[50, 150], [50, 200]]); sch.gnd(g, 50, 200);
    sch.w(g, [[290, 50], [360, 50], [360, 80], [380, 80]]);
    E('path', { d: 'M380,60 L380,140 L450,100 Z', class: 'w', fill: '#f4f7ff' }, g); sch.t(g, 390, 85, '+'); sch.t(g, 390, 128, '−');
    sch.w(g, [[380, 120], [350, 120], [350, 160]]); sch.t(g, 345, 178, 'V_th = ⅔V_s', 'lbl', 'middle').style.fontSize = '11px';
    sch.w(g, [[450, 100], [500, 100]]); sch.rH(g, 500, 560, 100); sch.w(g, [[560, 100], [600, 100]]);
    E('circle', { cx: 618, cy: 100, r: 16, class: 'w', fill: '#fff' }, g); sch.t(g, 618, 104, 'Q', 'lbl');
    const led = E('circle', { cx: 690, cy: 60, r: 14, fill: '#3a1010', stroke: '#222' }, g); sch.t(g, 690, 36, 'LED / röle', 'lbl');
    const relayG = E('g', {}, g); E('rect', { x: 668, y: 110, width: 44, height: 50, fill: '#fff', stroke: '#222' }, relayG); sch.t(relayG, 690, 140, 'RÖLE', 'lbl').style.fontSize = '10px';
    const dioG = E('g', {}, g); sch.diodeUp(dioG, 735, 110, 160); sch.w(dioG, [[735, 110], [712, 110]]); sch.w(dioG, [[735, 160], [712, 160]]);
    sch.w(g, [[618, 84], [618, 60], [676, 60]]); sch.w(g, [[618, 116], [618, 200]]); sch.gnd(g, 618, 200);
    const tR = sch.t(g, 210, 34, ''), tC = sch.t(g, 312, 125, '', 'lbl', 'start'), tVc = sch.t(g, 312, 145, '', 'val', 'start'), tVs = sch.t(g, 78, 140, '', 'val', 'start');
    const plot = new Lab.Plot($('#d4plot'), { xlabel: 't  (s)', ylabel: 'v_C  (V)' });
    self.drawPlot = () => {
      const L = S.d4log, Vs = kV.value, tm = Math.max(1, ...L.map((p) => p[0])) * 1.05;
      plot.draw([{ pts: [[0, (2 / 3) * Vs], [tm, (2 / 3) * Vs]], line: true, color: '#c62828', dash: [5, 4], width: 1.5 }, { pts: L, line: true, color: '#0b5cad' }], [0, tm], [Math.min(0, ...L.map((p) => p[1])), 15.5]);
    };
    let pt = 0;
    self.update = (dt) => {
      const Vs = kV.value, R = kR.value, Cn = kC.value, C = Cact(Cn), Vth = (2 / 3) * Vs;
      if (self.run) {
        self.t += dt; self.vC = Vs + (self.vC - Vs) * Math.exp(-dt / (R * C));
        pt += dt; if (pt > 0.03) { pt = 0; S.d4log.push([+self.t.toFixed(3), +self.vC.toFixed(4)]); if (S.d4log.length > 3000) S.d4log.shift(); self.drawPlot(); }
        if (!self.fired && self.vC >= Vth) {
          self.fired = true; self.td = self.t;
          S.d4last = { R, Cn, Vs, V0: self.V0, out: self.relay ? 'röle' : 'LED', diode: self.diode, td: self.t }; save();
          Lab.toast(`${self.relay ? 'Röle çekti' : 'LED yandı'}: t_d = ${num(self.t, 3)} s. Kaydetmek için R.`);
        }
      }
      psL(`${num(Vs, 1)} V · ${num(Vth, 2)} V`); tL(num(self.fired ? self.td : self.t, 3)); vL(num(self.vC, 3));
      sB.innerHTML = self.run ? 'DURDUR' : 'BAŞLAT (S)'; sB.classList.toggle('warn', self.run);
      self.run ? setLine(blade, 94, 50, 136, 50) : setLine(blade, 94, 50, 132, 26);
      led.setAttribute('fill', self.fired && !self.relay ? '#ff3b30' : self.fired ? '#2fae4a' : '#3a1010');
      led.style.filter = self.fired ? 'drop-shadow(0 0 8px ' + (self.relay ? '#2fae4a' : '#ff3b30') + ')' : '';
      relayG.style.display = self.relay ? '' : 'none'; dioG.style.display = self.relay && self.diode ? '' : 'none';
      tR.textContent = 'R = ' + Lab.ohm(R); tC.textContent = 'C = ' + eng(Cn, 'F'); tVc.textContent = 'v_C = ' + num(self.vC, 2) + ' V'; tVs.textContent = num(Vs, 1) + ' V';
      self.c = { Vs, R, Cn };
    };
    self.toggle = () => {
      if (!self.run) { self.run = true; self.t = 0; self.fired = false; self.V0 = self.vC; S.d4log = [[0, +self.vC.toFixed(4)]]; pt = 0; if (self.vC > 0.05) Lab.toast(`Dikkat: kapasitör boşaltılmadı, v_C(0) = ${num(self.vC, 2)} V.`); return; }
      self.run = false;
      if (self.fired && self.relay) {
        if (!self.diode) { S.f.d4spike = true; Lab.toast('⚡ Röle bırakılırken bobin gerilimi transistörün kollektöründe ≈ +300 V tepe yaptı (V<sub>s</sub> değerinin çok üstünde): gerçek devrede transistör delinirdi! Diyotu takın.', 6000); }
        else { S.f.d4relay = true; Lab.toast('Röle bıraktı; diyot bobin gerilimini ≈ 0,7 V\'ta tuttu.'); }
      }
      save(); self.drawPlot();
    };
    Object.assign(self, { kV, kR, kC });
    return self;
  })();
  $('#d4target').innerHTML = `<b>Hedef gecikme:</b> başlat düğmesinden çıkışın devreye girmesine kadar <b>t<sub>d</sub> = ${num(S.d4target, 2)} s</b> (nominal değerlerle ±%5).`;
  const d4map = (r) => [Lab.ohm(r.R), eng(r.Cn, 'F'), num(r.Vs, 1), num(r.V0, 2), r.out + (r.out === 'röle' ? (r.diode ? ' + diyot' : ' (diyotsuz)') : ''), num(r.td, 3)];
  const d4table = () => recTable('d4', d4map);
  function d4rec() {
    const L = S.d4last; if (!L) return Lab.toast('Önce bir deneme yapın: çıkış devreye girene kadar bekleyin.');
    if (S.d4rows.length && S.d4rows[S.d4rows.length - 1].tdRaw === L.td) return Lab.toast('Bu deneme zaten kaydedildi.');
    S.d4rows.push(Object.assign({ tdRaw: L.td }, L)); save(); d4table(); Lab.toast(`Kaydedildi: t_d = ${num(L.td, 3)} s`);
  }
  $('#d4rec').onclick = d4rec;
  $('#d4del').onclick = () => { S.d4rows.pop(); save(); d4table(); };
  $('#d4csv').onclick = () => Lab.downloadCSV('hafta10_deney4.csv', ['#', 'R (ohm)', 'C nom (F)', 'Vs (V)', 'V0 (V)', 'cikis', 'td (s)'], S.d4rows.map((r, i) => [i + 1, r.R, r.Cn, r.Vs, +r.V0.toFixed(3), r.out, +r.td.toFixed(4)]));
  d4table(); D4.drawPlot();
  const okDesign = (R, Cn) => near(R * Cn * Math.log(3), S.d4target, 0.05 * S.d4target);
  steps('d4', [
    { t: 'R ve C\'yi seçerek nominal gecikmeyi (RC ln3) hedefin ±%5\'i içine getirin.', test: () => D4.c && okDesign(D4.c.R, D4.c.Cn) },
    { t: 'C\'yi boşaltıp zamanlayıcıyı başlatın; çıkış devreye girince kaydedin (<kbd>R</kbd>). Ölçülen gecikme hedeften ne kadar saptı?', test: () => S.d4rows.some((r) => okDesign(r.R, r.Cn) && r.V0 < 0.05) },
    { t: 'Durdurun ve C\'yi <b>boşaltmadan</b> yeniden başlatın (V<sub>0</sub> &gt; 1 V); kaydedin. Gecikme neden kısaldı?', test: () => S.d4rows.some((r) => r.V0 > 1) },
    { t: 'Aynı R ve C ile <b>V<sub>s</sub>\'yi değiştirip</b> (C boş) bir deneme daha kaydedin: gecikme değişti mi?', test: () => S.d4rows.some((a) => a.V0 < 0.05 && S.d4rows.some((b) => b.V0 < 0.05 && b.R === a.R && b.Cn === a.Cn && b.Vs !== a.Vs)) },
    { t: 'Çıkışı <b>röle</b> yapın; diyotlu olarak röle çektikten sonra durdurun. (İsterseniz diyotsuz da deneyin.)', test: () => !!S.f.d4relay },
  ]);
  numq('d4', '#d4Q', { id: 'd4q1', q: 'R = 100 kΩ, C = 10 µF, V<sub>0</sub> = 0, V<sub>th</sub> = ⅔V<sub>s</sub> için nominal gecikme kaç saniyedir?', answer: Math.log(3), tol: 1, unit: 's', explain: 't<sub>d</sub> = RC ln3 = 1 × 1,0986 = 1,10 s.', hint: 'V<sub>s</sub>(1 − e<sup>−t/RC</sup>) = ⅔V<sub>s</sub>' });
  numq('d4', '#d4Q', { id: 'd4q2', q: 'Tasarımınızla (C boşken) ölçtüğünüz gecikme kaç saniyedir?', answer: () => { const r = S.d4rows.find((x) => okDesign(x.R, x.Cn) && x.V0 < 0.05); return r ? r.td : NaN; }, tol: 3, unit: 's', explain: 'Hedeften sapma elektrolitik kondansatörün ±%20 toleransından gelir; gerçek tasarımda R\'nin bir kısmı trimpotla kalibre edilir.', hint: 'Tablodaki tasarım satırınızın t<sub>d</sub> değeri.' });
  numq('d4', '#d4Q', { id: 'd4q3', q: 'Kapasitör V<sub>s</sub>/3 ile başlarsa gecikme, boş başlangıca göre kaç katına iner?', answer: Math.log(2) / Math.log(3), tol: 2, unit: '×', explain: 't<sub>d</sub> = RC ln[(V<sub>s</sub> − V<sub>s</sub>/3)/(V<sub>s</sub>/3)] = RC ln2; oran ln2/ln3 = 0,631.', hint: 'x(0) ≠ 0 ile genel formül.' });
  mcq('d4', '#d4Q', { id: 'd4q4', q: 'V<sub>s</sub>\'yi değiştirdiğinizde (C boş) gecikme neden neredeyse aynı kaldı?', opts: ['Ölçüm hatası', 'Eşik V<sub>s</sub>\'nin sabit oranı (⅔V<sub>s</sub>): t<sub>d</sub> = RC ln3, V<sub>s</sub> sadeleşir', 'V<sub>s</sub> τ\'yu değiştirmez ama eşik sabit 8 V\'tur', 'Kondansatör V<sub>s</sub>\'ye bağlı değildir'], correct: 1, explain: '555 zamanlayıcı da aynı ilkeyle beslemeden bağımsız gecikme üretir.', hint: 'Formülde V<sub>s</sub> nerede?' });
  mcq('d4', '#d4Q', { id: 'd4q5', q: 'Röle bobinine ters paralel diyot ne işe yarar?', opts: ['Röleyi hızlandırır', 'Transistör kesime girince bobin akımına yol verir, bobin gerilimini ≈0,7 V\'ta sınırlar ve transistörü korur', 'LED\'i korur', 'Kondansatörü boşaltır'], correct: 1, explain: 'Hafta 9\'daki RL doğal tepkisi: akım yolu yoksa v = L di/dt çok büyür.', hint: 'Bobin akımı sıçrayabilir mi?' });

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
    const W = S.wiz, c = S.d3c;
    const html = `
      <h2 style="margin:0">Devre Kuramı I · Sanal Laboratuvar · Hafta 10 Raporu</h2>
      <p><b>Konu:</b> Basamak tepkisi ve genel çözüm yöntemi — kare dalga, RL basamak, dört adımlı yöntem, zamanlayıcı tasarımı</p>
      <table class="data" style="width:auto"><tr><th>Ad Soyad</th><td class="l">${S.st.name || ''}</td><th>No</th><td class="l">${S.st.no || ''}</td><th>Grup</th><td class="l">${S.st.group || ''}</td><th>Tarih</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Özet</h3>
      <p>Tamamlanan föy adımı: <b>${sOk}/${sTot}</b> · Doğru yanıt: <b>${ok}/${tot}</b> · Puan: <b>${Math.round((50 * sOk) / sTot + (50 * ok) / tot)}/100</b></p>
      <h3>Yanıtlar</h3>
      <table class="data"><thead><tr><th>Bölüm</th><th>Soru</th><th>Yanıt</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Deney 1 · RC ve kare dalga</h3>${tab('d1tab')}
      <h3>Deney 2 · RL basamak tepkisi</h3>${tab('d2tab')}
      <h3>Deney 3 · Dört adımlı yöntem</h3>
      <p>Son devre kartı: V<sub>s</sub> = ${c.Vs} V, R<sub>1</sub> = ${Lab.ohm(c.R1)}, R<sub>2</sub> = ${Lab.ohm(c.R2)}, C = ${eng(c.C, 'F')}, V<sub>0</sub> = ${num(c.V0, 1)} V · Girilen: x(0) = ${W.x0 ?? '—'} V, x<sub>f</sub> = ${W.xf ?? '—'} V, τ = ${W.tau ?? '—'} ms${W.err != null ? ' · RMS fark %' + num(W.err, 2) : ''}</p>
      <h3>Deney 4 · Zamanlayıcı (hedef ${num(S.d4target, 2)} s)</h3>${tab('d4tab')}
      <h3>Osiloskop kayıtları ve grafikler</h3>
      <div>${img(D1.scope.canvas)} ${img(D2.scope.canvas)}</div>
      <div>${img($('#d3plot'))} ${img($('#d4plot'))}</div>
      <h3>Öğrenci yorumu</h3>
      <p style="white-space:pre-wrap;border:1px solid #ccc;padding:8px;min-height:60px">${(S.st.comment || '').replace(/</g, '&lt;')}</p>`;
    $('#reportPreview').innerHTML = html; $('#report').innerHTML = html;
  }
  $('#printBtn').onclick = () => { buildReport(); window.print(); };
  $('#resetBtn').onclick = () => { if (confirm('Bu haftaya ait tüm ölçüm, yanıt ve ilerleme silinsin mi?')) { localStorage.removeItem('devrelab:' + KEY); location.reload(); } };

  /* ================= klavye / döngü ================= */
  const benches = { d1: D1, d2: D2, d3: D3, d4: D4 };
  const recs = { d1: d1rec, d2: d2rec, d3: () => {}, d4: d4rec };
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
    if ((e.key === 'a' || e.key === 'A') && B.scope) B.scope.arm();
  });
  let last = performance.now(), d3drawn = null;
  function loop() {
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
    // zamanlayıcı arka planda da işlesin
    D4.update(S.page === 'd4' ? dt : 0);
    if (D4.run && S.page !== 'd4') D4.update(dt);
    const B = benches[S.page];
    if (B) {
      if (B !== D4) B.update(dt);
      if (B.scope) B.scope.draw();
      if (B === D3 && D3.scope.cap !== d3drawn && D3.scope.scope.data) { d3drawn = D3.scope.cap; plotDraw(false); }
      evalSteps(S.page);
    }
    requestAnimationFrame(loop);
  }
  Object.values(benches).forEach((B) => B.update(0));
  ['d1', 'd2', 'd3', 'd4'].forEach(evalSteps);
  go(S.page); progress(); loop();
})();

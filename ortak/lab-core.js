/* Devre Kuramı Sanal Laboratuvarı — ortak çekirdek (çevrimdışı, bağımlılıksız) */
(function () {
  'use strict';
  const Lab = (window.Lab = {});
  const SVGNS = 'http://www.w3.org/2000/svg';

  /* ---------- yardımcılar ---------- */
  Lab.$ = (s, r = document) => r.querySelector(s);
  Lab.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  Lab.clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  Lab.svg = function (tag, attrs = {}, parent) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  // Türkçe ondalık virgülüyle sayı
  Lab.num = (v, d = 2) => (isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');
  Lab.parse = (s) => parseFloat(String(s).trim().replace(/\s/g, '').replace(',', '.'));
  // Mühendislik gösterimi: 0,00025 A -> "250 µA"
  Lab.eng = function (v, unit = '', sig = 3) {
    if (!isFinite(v)) return '—';
    if (v === 0) return '0 ' + unit;
    const pre = [[1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];
    const a = Math.abs(v);
    let p = pre.find((q) => a >= q[0] * 0.9995) || pre[pre.length - 1];
    const x = v / p[0];
    const d = Math.max(0, sig - 1 - Math.floor(Math.log10(Math.abs(x) || 1)));
    return x.toFixed(d).replace('.', ',') + ' ' + p[1] + unit;
  };
  Lab.ohm = (r) => (r >= 1e9 ? '∞' : Lab.eng(r, 'Ω', 3).replace(/(,\d*?)0+ /, '$1 ').replace(', ', ' '));

  Lab.toast = function (msg, ms = 2600) {
    let t = Lab.$('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    const now = Date.now();
    if (t._until > now && ms < t._ms) return; // önemli bir uyarıyı kısa mesajla örtme
    t.innerHTML = msg; t.classList.add('show'); t._until = now + ms; t._ms = ms;
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), ms);
  };

  /* ---------- kalıcı durum (localStorage) ---------- */
  Lab.store = {
    key: 'devrelab',
    load(k) { try { return JSON.parse(localStorage.getItem(this.key + ':' + k)) || {}; } catch (e) { return {}; } },
    save(k, o) { try { localStorage.setItem(this.key + ':' + k, JSON.stringify(o)); } catch (e) {} },
  };

  /* ---------- döner düğme ---------- */
  // opts: {label, min, max, value, step, log, list, fmt, size, dark, onChange}
  Lab.Knob = class {
    constructor(parent, o) {
      this.o = Object.assign({ size: 54, step: 0, log: false, fmt: (v) => Lab.num(v, 2) }, o);
      const s = this.o.size;
      const wrap = (this.el = document.createElement('div'));
      wrap.className = 'knob'; wrap.tabIndex = 0;
      wrap.setAttribute('role', 'slider');
      wrap.setAttribute('aria-label', o.label || 'düğme');
      wrap.title = 'Sürükle / tekerlek / ok tuşları · Shift: ince ayar · Çift tık: değer yaz';
      if (o.label) { const l = document.createElement('div'); l.className = 'kl'; l.textContent = o.label; wrap.appendChild(l); }
      const svg = Lab.svg('svg', { width: s, height: s, viewBox: '-50 -50 100 100' });
      const defs = Lab.svg('defs', {}, svg);
      const gid = 'kg' + Math.random().toString(36).slice(2, 8);
      const g = Lab.svg('radialGradient', { id: gid, cx: '35%', cy: '30%', r: '75%' }, defs);
      const dark = this.o.dark;
      Lab.svg('stop', { offset: '0', 'stop-color': dark ? '#6b717b' : '#ffffff' }, g);
      Lab.svg('stop', { offset: '1', 'stop-color': dark ? '#15181c' : '#8e949d' }, g);
      for (let i = 0; i <= 10; i++) {
        const a = ((-135 + 27 * i) * Math.PI) / 180;
        Lab.svg('line', { x1: 44 * Math.sin(a), y1: -44 * Math.cos(a), x2: 49 * Math.sin(a), y2: -49 * Math.cos(a), stroke: dark ? '#ccd' : '#333', 'stroke-width': i % 5 ? 2 : 3.5 }, svg);
      }
      Lab.svg('circle', { r: 38, fill: '#000', opacity: 0.25, cy: 3 }, svg);
      Lab.svg('circle', { r: 37, fill: `url(#${gid})`, class: 'ring', stroke: '#222', 'stroke-width': 1 }, svg);
      for (let i = 0; i < 24; i++) {
        const a = (i * 15 * Math.PI) / 180;
        Lab.svg('line', { x1: 33 * Math.sin(a), y1: 33 * Math.cos(a), x2: 37 * Math.sin(a), y2: 37 * Math.cos(a), stroke: '#000', opacity: 0.25 }, svg);
      }
      this.ptr = Lab.svg('line', { x1: 0, y1: -10, x2: 0, y2: -31, stroke: dark ? '#fff' : '#c00', 'stroke-width': 5, 'stroke-linecap': 'round' }, svg);
      wrap.appendChild(svg);
      this.vEl = document.createElement('div'); this.vEl.className = 'kv'; wrap.appendChild(this.vEl);
      parent.appendChild(wrap);
      this.set(this.o.value, true);
      this._bind(svg);
    }
    // normalize konumu 0..1
    _toP(v) {
      const o = this.o;
      if (o.list) { let i = o.list.indexOf(v); if (i < 0) i = o.list.reduce((b, x, j) => (Math.abs(x - v) < Math.abs(o.list[b] - v) ? j : b), 0); return i / (o.list.length - 1); }
      if (o.log) return Math.log(v / o.min) / Math.log(o.max / o.min);
      return (v - o.min) / (o.max - o.min);
    }
    _fromP(p) {
      const o = this.o; p = Lab.clamp(p, 0, 1);
      if (o.list) return o.list[Math.round(p * (o.list.length - 1))];
      let v = o.log ? o.min * Math.pow(o.max / o.min, p) : o.min + p * (o.max - o.min);
      if (o.step) v = Math.round(v / o.step) * o.step;
      return +v.toPrecision(10);
    }
    set(v, silent) {
      const o = this.o;
      if (!o.list) v = Lab.clamp(v, o.min, o.max);
      this.p = this._toP(v); this.value = o.list ? this._fromP(this.p) : v;
      this.ptr.setAttribute('transform', `rotate(${-135 + 270 * this.p})`);
      this.vEl.textContent = o.fmt(this.value);
      this.el.setAttribute('aria-valuenow', this.value);
      if (!silent && o.onChange) o.onChange(this.value);
    }
    _nudge(n, fine) {
      const o = this.o;
      if (o.list) { const i = Lab.clamp(Math.round(this.p * (o.list.length - 1)) + n, 0, o.list.length - 1); this.set(o.list[i]); return; }
      if (o.step && !o.log) { this.set(this.value + n * o.step * (fine ? 0.1 : 1)); return; }
      this.set(this._fromP(this.p + n * (fine ? 0.002 : 0.01)));
    }
    _bind(svg) {
      let y0, p0;
      svg.addEventListener('pointerdown', (e) => { svg.setPointerCapture(e.pointerId); y0 = e.clientY; p0 = this.p; this.el.focus(); e.preventDefault(); });
      svg.addEventListener('pointermove', (e) => {
        if (y0 == null) return;
        const k = e.shiftKey ? 0.0008 : 0.005;
        const np = Lab.clamp(p0 + (y0 - e.clientY) * k, 0, 1);
        const v = this._fromP(np);
        if (v !== this.value) this.set(v);
        if (!this.o.list) this.p = np;
      });
      const up = () => { y0 = null; };
      svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
      svg.addEventListener('wheel', (e) => { e.preventDefault(); this._nudge(e.deltaY < 0 ? 1 : -1, e.shiftKey); }, { passive: false });
      this.el.addEventListener('keydown', (e) => {
        const m = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 }[e.key];
        if (m) { this._nudge(m, e.shiftKey); e.preventDefault(); e.stopPropagation(); }
        if (e.key === 'Home') { this.set(this._fromP(0)); e.preventDefault(); }
        if (e.key === 'End') { this.set(this._fromP(1)); e.preventDefault(); }
      });
      svg.addEventListener('dblclick', () => {
        if (this.o.list) return;
        const s = prompt(`${this.o.label || 'Değer'} (${this.o.min} … ${this.o.max}):`, String(this.value).replace('.', ','));
        if (s != null && isFinite(Lab.parse(s))) this.set(Lab.parse(s));
      });
    }
  };

  /* ---------- ideal / gerçek op-amp çözücü ----------
     vp = p0 + p1·vo , vn = n0 + n1·vo  (geri besleme doğrusal)
     m = {A, vsatP, vsatN, vos}, prev = önceki vo (pozitif geri beslemede bellek)  */
  Lab.opamp = function (p0, p1, n0, n1, m, prev = 0) {
    const d0 = p0 - n0 + (m.vos || 0), k = p1 - n1, A = m.A;
    const clip = (v) => Lab.clamp(v, m.vsatN, m.vsatP);
    let vo, mode;
    if (k <= 0) { // negatif geri besleme ya da açık çevrim: tek ve kararlı çözüm
      const lin = (A * d0) / (1 - A * k);
      vo = clip(lin); mode = vo === lin ? 'doğrusal' : 'doyum';
    } else { // pozitif geri besleme: kararlı noktalar yalnızca ±Vsat
      const okP = d0 + k * m.vsatP > 0, okN = d0 + k * m.vsatN < 0;
      if (okP && okN) vo = prev >= 0 ? m.vsatP : m.vsatN;
      else vo = okP ? m.vsatP : m.vsatN;
      mode = 'doyum (pozitif GB)';
    }
    return { vo, vp: p0 + p1 * vo, vn: n0 + n1 * vo, mode };
  };

  /* ---------- osiloskop ---------- */
  Lab.Scope = class {
    constructor(canvas, o = {}) {
      this.c = canvas; this.g = canvas.getContext('2d');
      this.ch = [{ vdiv: 0.5, on: true, pos: 0, color: '#f2d21b', name: 'CH1' }, { vdiv: 5, on: true, pos: 0, color: '#27c4f0', name: 'CH2' }];
      this.tdiv = 2e-4; this.cur = { on: false, a: 3, b: 6, drag: null };
      this.data = null;
      const pos = (e) => { const r = this.c.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * 10; };
      canvas.addEventListener('pointerdown', (e) => {
        if (!this.cur.on) return;
        const x = pos(e); this.cur.drag = Math.abs(x - this.cur.a) < Math.abs(x - this.cur.b) ? 'a' : 'b';
        canvas.setPointerCapture(e.pointerId); this.cur[this.cur.drag] = Lab.clamp(x, 0, 10); this.draw();
      });
      canvas.addEventListener('pointermove', (e) => { if (this.cur.drag) { this.cur[this.cur.drag] = Lab.clamp(pos(e), 0, 10); this.draw(); } });
      canvas.addEventListener('pointerup', () => (this.cur.drag = null));
      this.onMeasure = o.onMeasure;
    }
    // data: {n, y:[Float64Array ch1, Float64Array ch2]} — n örnek, 10 bölme boyunca
    draw(data) {
      if (data) this.data = data;
      const g = this.g, W = this.c.width, H = this.c.height, dx = W / 10, dy = H / 8;
      g.fillStyle = '#06140c'; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(120,200,140,.18)'; g.lineWidth = 1;
      for (let i = 1; i < 10; i++) { g.beginPath(); g.moveTo(i * dx, 0); g.lineTo(i * dx, H); g.stroke(); }
      for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(0, i * dy); g.lineTo(W, i * dy); g.stroke(); }
      g.strokeStyle = 'rgba(120,200,140,.4)';
      for (let i = 0; i < 50; i++) { g.beginPath(); g.moveTo(i * dx / 5, H / 2 - 3); g.lineTo(i * dx / 5, H / 2 + 3); g.stroke(); }
      for (let i = 0; i < 40; i++) { g.beginPath(); g.moveTo(W / 2 - 3, i * dy / 5); g.lineTo(W / 2 + 3, i * dy / 5); g.stroke(); }
      const d = this.data; if (!d) return;
      this.ch.forEach((c, k) => {
        if (!c.on) return;
        const y = d.y[k]; g.strokeStyle = c.color; g.lineWidth = 2; g.shadowColor = c.color; g.shadowBlur = 6;
        g.beginPath();
        for (let i = 0; i < d.n; i++) {
          const X = (i / (d.n - 1)) * W, Y = H / 2 - ((y[i] / c.vdiv) + c.pos) * dy;
          i ? g.lineTo(X, Lab.clamp(Y, -2, H + 2)) : g.moveTo(X, Lab.clamp(Y, -2, H + 2));
        }
        g.stroke(); g.shadowBlur = 0;
        g.fillStyle = c.color; g.font = 'bold 12px Consolas';
        const yy = H / 2 - c.pos * dy; g.fillText((k + 1) + '▶', 2, Lab.clamp(yy + 4, 10, H - 2));
      });
      g.font = '12px Consolas'; g.fillStyle = '#9fe0b0';
      g.fillText(`${this.ch[0].on ? 'CH1 ' + Lab.eng(this.ch[0].vdiv, 'V') + '/d' : ''}   ${this.ch[1].on ? 'CH2 ' + Lab.eng(this.ch[1].vdiv, 'V') + '/d' : ''}   ${Lab.eng(this.tdiv, 's')}/d`, 8, H - 8);
      if (this.cur.on) {
        g.strokeStyle = '#ff7cf0'; g.setLineDash([5, 4]);
        ['a', 'b'].forEach((k) => { const X = (this.cur[k] / 10) * W; g.beginPath(); g.moveTo(X, 0); g.lineTo(X, H); g.stroke(); });
        g.setLineDash([]);
      }
      if (this.onMeasure) this.onMeasure(this.measure());
    }
    measure() {
      const d = this.data; if (!d) return null;
      const T = this.tdiv * 10, res = { ch: [] };
      d.y.forEach((y) => {
        let mx = -Infinity, mn = Infinity;
        for (const v of y) { if (v > mx) mx = v; if (v < mn) mn = v; }
        const mid = (mx + mn) / 2, cr = [];
        let hi = 0;
        for (let i = 1; i < d.n; i++) { if (y[i - 1] < mid && y[i] >= mid) cr.push(i); if (y[i] > mid) hi++; }
        let f = NaN, duty = NaN;
        if (cr.length >= 2 && mx - mn > 1e-9) {
          const per = ((cr[cr.length - 1] - cr[0]) / (cr.length - 1) / (d.n - 1)) * T; f = 1 / per;
          let h = 0, tot = 0; for (let i = cr[0]; i < cr[cr.length - 1]; i++) { tot++; if (y[i] > mid) h++; }
          duty = (100 * h) / tot;
        }
        // 10–90 % yükselme süresi (ilk yükselen kenar)
        let tr = NaN;
        if (mx - mn > 1e-6) {
          const l10 = mn + 0.1 * (mx - mn), l90 = mn + 0.9 * (mx - mn);
          for (let i = 1; i < d.n; i++) if (y[i - 1] < l10 && y[i] >= l10) {
            for (let j = i; j < d.n; j++) if (y[j] >= l90) { tr = ((j - i) / (d.n - 1)) * T; break; }
            break;
          }
        }
        res.ch.push({ vpp: mx - mn, max: mx, min: mn, f, duty, tr });
      });
      if (this.cur.on) {
        const ia = Math.round((this.cur.a / 10) * (d.n - 1)), ib = Math.round((this.cur.b / 10) * (d.n - 1));
        res.cur = { dt: ((this.cur.b - this.cur.a) / 10) * T, v2a: d.y[1][ia], v2b: d.y[1][ib], v1a: d.y[0][ia], v1b: d.y[0][ib] };
      }
      return res;
    }
  };

  /* ---------- XY grafik ---------- */
  Lab.Plot = class {
    constructor(canvas, o = {}) { this.c = canvas; this.g = canvas.getContext('2d'); this.o = o; }
    draw(series, xr, yr) {
      const g = this.g, W = this.c.width, H = this.c.height, L = 62, R = 14, T = 14, B = 42;
      g.clearRect(0, 0, W, H); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
      const all = series.flatMap((s) => s.pts);
      if (!xr) { const xs = all.map((p) => p[0]); xr = xs.length ? [Math.min(...xs), Math.max(...xs)] : [-1, 1]; }
      if (!yr) { const ys = all.map((p) => p[1]); yr = ys.length ? [Math.min(...ys), Math.max(...ys)] : [-1, 1]; }
      if (xr[0] === xr[1]) xr = [xr[0] - 1, xr[1] + 1];
      if (yr[0] === yr[1]) yr = [yr[0] - 1, yr[1] + 1];
      const X = (x) => L + ((x - xr[0]) / (xr[1] - xr[0])) * (W - L - R), Y = (y) => H - B - ((y - yr[0]) / (yr[1] - yr[0])) * (H - T - B);
      const ticks = (a, b) => { const s = Math.pow(10, Math.floor(Math.log10((b - a) / 5))); const m = [1, 2, 5, 10].find((k) => (b - a) / (k * s) <= 8) * s; const r = []; for (let v = Math.ceil(a / m) * m; v <= b + 1e-12; v += m) r.push(+v.toPrecision(12)); return r; };
      g.font = '11px Segoe UI'; g.strokeStyle = '#e4e8ef'; g.fillStyle = '#556';
      ticks(xr[0], xr[1]).forEach((v) => { g.beginPath(); g.moveTo(X(v), T); g.lineTo(X(v), H - B); g.stroke(); g.textAlign = 'center'; g.fillText(Lab.num(v, Math.abs(v) < 10 && v % 1 ? 1 : 0).replace(',0', ''), X(v), H - B + 14); });
      ticks(yr[0], yr[1]).forEach((v) => { g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(W - R, Y(v)); g.stroke(); g.textAlign = 'right'; g.fillText(Lab.num(v, Math.abs(v) < 10 && v % 1 ? 1 : 0).replace(',0', ''), L - 5, Y(v) + 4); });
      g.strokeStyle = '#99a'; g.lineWidth = 1.2;
      if (xr[0] < 0 && xr[1] > 0) { g.beginPath(); g.moveTo(X(0), T); g.lineTo(X(0), H - B); g.stroke(); }
      if (yr[0] < 0 && yr[1] > 0) { g.beginPath(); g.moveTo(L, Y(0)); g.lineTo(W - R, Y(0)); g.stroke(); }
      g.strokeRect(L, T, W - L - R, H - T - B);
      g.fillStyle = '#223'; g.font = '12px Segoe UI'; g.textAlign = 'center';
      g.fillText(this.o.xlabel || '', (L + W - R) / 2, H - 8);
      g.save(); g.translate(14, (T + H - B) / 2); g.rotate(-Math.PI / 2); g.fillText(this.o.ylabel || '', 0, 0); g.restore();
      series.forEach((s) => {
        g.strokeStyle = g.fillStyle = s.color || '#0b5cad'; g.lineWidth = s.width || 2;
        if (s.dash) g.setLineDash(s.dash);
        if (s.line) { g.beginPath(); s.pts.forEach((p, i) => (i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1])))); g.stroke(); }
        g.setLineDash([]);
        if (s.dots) s.pts.forEach((p) => { g.beginPath(); g.arc(X(p[0]), Y(p[1]), 4, 0, 7); g.fill(); });
      });
    }
  };

  /* ---------- sorular ---------- */
  // Çoktan seçmeli: {id, q, opts[], correct(index), explain}
  Lab.answers = {};
  Lab.onAnswer = null;
  Lab.mcq = function (parent, o) {
    const d = document.createElement('div'); d.className = 'q'; d.dataset.qid = o.id;
    d.innerHTML = `<div class="qt">${o.q}</div>` + o.opts.map((t, i) => `<label><input type="radio" name="${o.id}" value="${i}"> ${String.fromCharCode(65 + i)}) ${t}</label>`).join('') + `<button class="btn small">Kontrol et</button><div class="fb"></div>`;
    parent.appendChild(d);
    const fb = d.querySelector('.fb');
    const show = (v) => {
      const ok = v === o.correct;
      fb.className = 'fb ' + (ok ? 'ok' : 'bad');
      fb.innerHTML = (ok ? '✔ Doğru. ' : '✘ Yanlış. ') + (ok || o.explainAlways ? o.explain || '' : 'Tekrar düşünün: ' + (o.hint || ''));
      Lab.answers[o.id] = { q: o.q, a: o.opts[v], ok };
      Lab.onAnswer && Lab.onAnswer();
    };
    d.querySelector('button').onclick = () => { const r = d.querySelector('input:checked'); if (!r) return Lab.toast('Bir seçenek işaretleyin.'); show(+r.value); };
    if (Lab.answers[o.id]) { const i = o.opts.indexOf(Lab.answers[o.id].a); if (i >= 0) { d.querySelectorAll('input')[i].checked = true; show(i); } }
  };
  // Sayısal: {id, q, answer(number|fn), tol(%), unit, explain}
  Lab.numq = function (parent, o) {
    const d = document.createElement('div'); d.className = 'q'; d.dataset.qid = o.id;
    d.innerHTML = `<div class="qt">${o.q}</div><div class="row"><input type="text" size="10" placeholder="sayı"> <span>${o.unit || ''}</span><button class="btn small">Kontrol et</button></div><div class="fb"></div>`;
    parent.appendChild(d);
    const inp = d.querySelector('input'), fb = d.querySelector('.fb');
    const check = () => {
      const v = Lab.parse(inp.value); if (!isFinite(v)) return Lab.toast('Geçerli bir sayı girin (ondalık için virgül kullanabilirsiniz).');
      const c = typeof o.answer === 'function' ? o.answer() : o.answer;
      const ok = Math.abs(v - c) <= Math.abs(c) * (o.tol ?? 2) / 100 + (o.abs || 0);
      fb.className = 'fb ' + (ok ? 'ok' : 'bad');
      fb.innerHTML = ok ? '✔ Doğru. ' + (o.explain || '') : '✘ Beklenen değerden uzak. ' + (o.hint || '');
      Lab.answers[o.id] = { q: o.q, a: inp.value + ' ' + (o.unit || ''), ok, ref: Lab.num(c, 3) };
      Lab.onAnswer && Lab.onAnswer();
    };
    d.querySelector('button').onclick = check;
    inp.addEventListener('keydown', (e) => e.key === 'Enter' && check());
    if (Lab.answers[o.id]) { inp.value = Lab.answers[o.id].a.split(' ')[0]; check(); }
  };

  /* ---------- CSV indir ---------- */
  Lab.downloadCSV = function (name, header, rows) {
    const txt = '﻿' + [header, ...rows].map((r) => r.map((x) => (typeof x === 'number' ? String(x).replace('.', ',') : x)).join(';')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' })); a.download = name; a.click();
  };
})();



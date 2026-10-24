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
  // Kullanım: sürükle (yukarı/sağa = artır) · − / + düğmeleri (basılı tut = hızlı) · düğmeye ya da değere dokun = değer yaz / listeden seç
  // · fare tekerleği · ok tuşları · Shift = ince ayar
  const coarse = window.matchMedia && matchMedia('(pointer:coarse)').matches;
  const labelHTML = (s) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])).replace(/_(\{([^}]*)\}|[A-Za-z0-9ıİçÇğĞöÖşŞüÜ]+)/g, (m, a, b) => `<sub>${b != null ? b : a}</sub>`);
  Lab.knobs = [];
  Lab.Knob = class {
    constructor(parent, o) {
      this.o = Object.assign({ size: 54, step: 0, log: false, fmt: (v) => Lab.num(v, 2) }, o);
      const s = coarse ? Math.max(this.o.size, 56) : this.o.size;
      const wrap = (this.el = document.createElement('div'));
      wrap.className = 'knob' + (this.o.dark ? ' kdark' : ''); wrap.tabIndex = 0;
      wrap.setAttribute('role', 'slider');
      wrap.setAttribute('aria-label', o.label || 'düğme');
      if (o.label) { const l = document.createElement('div'); l.className = 'kl'; l.innerHTML = labelHTML(o.label); wrap.appendChild(l); }
      const svg = Lab.svg('svg', { width: s, height: s, viewBox: '-50 -50 100 100' });
      Lab.svg('title', {}, svg).textContent = 'Çevirmek için yukarı/aşağı sürükleyin · değer yazmak için dokunun';
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
      // değer yayı: düğmenin nerede olduğunu uzaktan da gösterir
      this.arc = Lab.svg('path', { fill: 'none', stroke: '#2f9bff', 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.9 }, svg);
      Lab.svg('circle', { r: 38, fill: '#000', opacity: 0.25, cy: 3 }, svg);
      Lab.svg('circle', { r: 37, fill: `url(#${gid})`, class: 'ring', stroke: '#222', 'stroke-width': 1 }, svg);
      for (let i = 0; i < 24; i++) {
        const a = (i * 15 * Math.PI) / 180;
        Lab.svg('line', { x1: 33 * Math.sin(a), y1: 33 * Math.cos(a), x2: 37 * Math.sin(a), y2: 37 * Math.cos(a), stroke: '#000', opacity: 0.25 }, svg);
      }
      this.ptr = Lab.svg('line', { x1: 0, y1: -10, x2: 0, y2: -31, stroke: dark ? '#fff' : '#c00', 'stroke-width': 5, 'stroke-linecap': 'round' }, svg);
      wrap.appendChild(svg);
      const row = document.createElement('div'); row.className = 'krow';
      const mk = (cls, txt, title) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = txt; b.title = title; b.tabIndex = -1; row.appendChild(b); return b; };
      this.bDn = mk('kb', '−', 'Azalt (basılı tutun: hızlı)');
      this.vEl = mk('kv', '', 'Değeri yazmak / seçmek için dokunun');
      this.bUp = mk('kb', '+', 'Artır (basılı tutun: hızlı)');
      wrap.appendChild(row);
      parent.appendChild(wrap);
      Lab.knobs.push(this);
      this.set(this.o.value, true);
      this._bind(svg);
    }
    // normalize konumu 0..1
    _toP(v) {
      const o = this.o;
      if (o.list) { let i = o.list.indexOf(v); if (i < 0) i = o.list.reduce((b, x, j) => (Math.abs(x - v) < Math.abs(o.list[b] - v) ? j : b), 0); return o.list.length > 1 ? i / (o.list.length - 1) : 0; }
      if (o.max === o.min) return 0;
      if (o.log) return Math.log(v / o.min) / Math.log(o.max / o.min);
      return (v - o.min) / (o.max - o.min);
    }
    _fromP(p) {
      const o = this.o; p = Lab.clamp(p, 0, 1);
      if (o.list) return o.list[Math.round(p * (o.list.length - 1))];
      let v = o.log ? o.min * Math.pow(o.max / o.min, p) : o.min + p * (o.max - o.min);
      if (o.step) v = Math.round(v / o.step) * o.step;
      return +Lab.clamp(v, o.min, o.max).toPrecision(10);
    }
    set(v, silent) {
      const o = this.o;
      if (!o.list) v = Lab.clamp(v, o.min, o.max);
      if (!silent) Lab.effectWatch.before(this);
      this.p = Lab.clamp(this._toP(v), 0, 1); this.value = o.list ? this._fromP(this.p) : v;
      this.ptr.setAttribute('transform', `rotate(${-135 + 270 * this.p})`);
      const a0 = (-135 * Math.PI) / 180, a1 = ((-135 + 270 * this.p) * Math.PI) / 180, R = 44;
      this.arc.setAttribute('d', this.p > 0.002 ? `M${R * Math.sin(a0)},${-R * Math.cos(a0)} A${R},${R} 0 ${this.p > 2 / 3 ? 1 : 0} 1 ${R * Math.sin(a1)},${-R * Math.cos(a1)}` : '');
      this.vEl.textContent = o.fmt(this.value);
      this.el.setAttribute('aria-valuenow', this.value);
      this.el.setAttribute('aria-valuetext', this.vEl.textContent);
      if (!silent) { if (o.onChange) o.onChange(this.value); Lab.effectWatch.after(this); }
      if (Lab.Knob.pop && Lab.Knob.pop.knob === this) Lab.Knob.pop.sync();
    }
    _nudge(n, fine) {
      const o = this.o;
      if (o.list) { const i = Lab.clamp(Math.round(this.p * (o.list.length - 1)) + n, 0, o.list.length - 1); if (o.list[i] !== this.value) this.set(o.list[i]); return; }
      if (o.step && !o.log) { const st = o.step * (fine ? 0.1 : 1); this.set(+(Math.round((this.value + n * st) / st) * st).toPrecision(10)); return; }
      // adımsız düğme: değeri en az bir gösterim basamağı değiştir
      let q = this.p, v = this.value, k = 0;
      do { q = Lab.clamp(q + n * (fine ? 0.002 : 0.01), 0, 1); v = this._fromP(q); } while (o.fmt(v) === o.fmt(this.value) && q > 0 && q < 1 && ++k < 50);
      this.set(v);
    }
    _bind(svg) {
      let x0, y0, p0, moved = false, cap = null;
      svg.addEventListener('pointerdown', (e) => {
        if (e.button > 0) return;
        cap = e.pointerId; svg.setPointerCapture(e.pointerId); x0 = e.clientX; y0 = e.clientY; p0 = this.p; moved = false;
        this.el.focus({ preventScroll: true }); this.el.classList.add('drag'); e.preventDefault();
      });
      svg.addEventListener('pointermove', (e) => {
        if (cap !== e.pointerId) return;
        const d = (e.clientX - x0) - (e.clientY - y0);
        if (!moved && Math.abs(e.clientX - x0) + Math.abs(e.clientY - y0) < 5) return;
        moved = true;
        const k = (e.shiftKey ? 0.0008 : coarse ? 0.004 : 0.005);
        const np = Lab.clamp(p0 + d * k, 0, 1);
        const v = this._fromP(np);
        if (v !== this.value) this.set(v);
        if (!this.o.list) this.p = np;
      });
      const up = (e) => {
        if (cap !== e.pointerId) return;
        cap = null; this.el.classList.remove('drag');
        if (!moved && e.type === 'pointerup') Lab.Knob.edit(this);
        if (moved) Lab.coach.done();
      };
      svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
      svg.addEventListener('wheel', (e) => { e.preventDefault(); this._nudge(e.deltaY < 0 ? 1 : -1, e.shiftKey); }, { passive: false });
      this.el.addEventListener('keydown', (e) => {
        const m = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10, '+': 1, '-': -1 }[e.key];
        if (m) { this._nudge(m, e.shiftKey); e.preventDefault(); e.stopPropagation(); }
        if (e.key === 'Home') { this.set(this._fromP(0)); e.preventDefault(); }
        if (e.key === 'End') { this.set(this._fromP(1)); e.preventDefault(); }
        if (e.key === 'Enter' || e.key === ' ') { Lab.Knob.edit(this); e.preventDefault(); }
      });
      // − / + : dokun = bir adım, basılı tut = tekrar (giderek hızlanır)
      [[this.bDn, -1], [this.bUp, 1]].forEach(([b, n]) => {
        let t1, t2, cnt;
        const stop = () => { clearTimeout(t1); clearInterval(t2); t1 = t2 = null; };
        b.addEventListener('pointerdown', (e) => {
          if (e.button > 0) return;
          e.preventDefault(); stop(); cnt = 0; const fine = e.shiftKey;
          this._nudge(n, fine); Lab.coach.done();
          t1 = setTimeout(() => { t2 = setInterval(() => { cnt++; this._nudge(n * (cnt > 25 && !this.o.list ? 5 : 1), fine); }, 70); }, 380);
        });
        ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach((ev) => b.addEventListener(ev, stop));
        b.addEventListener('contextmenu', (e) => e.preventDefault());
      });
      this.vEl.addEventListener('click', () => Lab.Knob.edit(this));
    }
  };

  // SI önekli sayı: "4,7k" → 4700, "600µ" → 6e-4, "1e-3" → 0,001
  const PREF = { p: 1e-12, n: 1e-9, u: 1e-6, µ: 1e-6, μ: 1e-6, m: 1e-3, k: 1e3, K: 1e3, M: 1e6, G: 1e9 };
  Lab.parseSI = function (s) {
    const m = String(s).trim().replace(/−/g, '-').replace(/\s+/g, '').match(/^([-+]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[-+]?\d+)?)([pnuµμmkKMG])?/i);
    if (!m) return { v: NaN };
    const v = parseFloat(m[1].replace(',', '.'));
    return { v, pre: m[2] && PREF[m[2]] != null ? PREF[m[2]] : null };
  };
  // fmt çıktısını sayı + birim olarak ayır: "−j24 mΩ" gibi biçimler için null döner
  const splitFmt = (t) => {
    const m = String(t).replace(/−/g, '-').replace(/^\s*([-+])j/, '$1').match(/^\s*[±%×~≈]?\s*([-+]?\d+(?:,\d+)?)\s*(\S*)\s*$/);
    if (!m) return null;
    const u = m[2], pre = u.length > 1 && PREF[u[0]] != null && !/^(mm|min)$/.test(u) ? u[0] : '';
    const dec = (m[1].split(',')[1] || '').length;
    return { n: parseFloat(m[1].replace(',', '.')), dec, unit: u, pre, base: u.slice(pre.length), mult: pre ? PREF[pre] : 1 };
  };
  // ham değer ↔ temel birim oranı (ör. "mV" ölçekli düğme için 1e-3); tutarsızsa null (ham sayı yazılır)
  function unitScale(k) {
    const o = k.o, probe = [0, 0.37, 0.5, 0.81, 1].map((p) => k._fromP(p)).concat([o.min, o.max]).filter((v) => v);
    const it = probe.map((v) => ({ v, s: splitFmt(o.fmt(v)) })).filter((x) => x.s && isFinite(x.s.n) && x.s.n !== 0);
    if (!it.length) return null;
    const ref = it.reduce((a, b) => (Math.abs(b.s.n) * 10 ** b.s.dec > Math.abs(a.s.n) * 10 ** a.s.dec ? b : a));
    const f = (ref.s.n * ref.s.mult) / ref.v;
    // gösterimin yuvarlama payı içinde tutarlı mı?
    for (const { v, s } of it) if (Math.abs(s.n * s.mult - f * v) > 0.5 * 10 ** -s.dec * s.mult * 1.05 + 1e-15) return null;
    return f;
  }
  // düğmenin aralığında görülen birimler (ör. µVpp, mVpp, Vpp)
  function unitList(k) {
    const seen = new Map();
    for (let i = 0; i <= 40; i++) { const s = splitFmt(k.o.fmt(k._fromP(i / 40))); if (s && s.n !== 0 && !seen.has(s.unit)) seen.set(s.unit, s); }
    return [...seen.values()].sort((a, b) => a.mult - b.mult);
  }

  /* ---------- değer penceresi (düğmeye/değere dokununca) ---------- */
  Lab.Knob.edit = function (k) {
    let P = Lab.Knob.pop;
    if (!P) {
      const el = document.createElement('div'); el.className = 'kpop no-print'; el.setAttribute('role', 'dialog');
      document.body.appendChild(el);
      P = Lab.Knob.pop = { el, knob: null };
      P.close = () => { el.classList.remove('show'); P.knob = null; };
      document.addEventListener('pointerdown', (e) => { if (P.knob && !el.contains(e.target) && !P.knob.el.contains(e.target)) P.close(); }, true);
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && P.knob) { const kk = P.knob; P.close(); kk.el.focus(); } });
      window.addEventListener('resize', () => P.knob && P.place());
      P.place = () => {
        const r = P.knob.el.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight, vw = innerWidth, vh = innerHeight;
        let x = r.left + r.width / 2 - w / 2, y = r.bottom + 8;
        if (y + h > vh - 8) y = Math.max(8, r.top - h - 8);
        el.style.left = Lab.clamp(x, 8, Math.max(8, vw - w - 8)) + 'px'; el.style.top = Lab.clamp(y, 8, Math.max(8, vh - h - 8)) + 'px';
      };
    }
    P.knob = k; Lab.coach.done();
    const o = k.o, el = P.el, title = labelHTML(o.label || 'Değer');
    if (o.list) {
      el.innerHTML = `<div class="kp-h"><b>${title}</b><button type="button" class="kp-x" title="Kapat">×</button></div>
        <div class="kp-sub">Bir değer seçin:</div><div class="kp-list">${o.list.map((v, i) => `<button type="button" data-i="${i}">${o.fmt(v)}</button>`).join('')}</div>`;
      el.querySelectorAll('.kp-list button').forEach((b) => (b.onclick = () => { k.set(o.list[+b.dataset.i]); P.close(); k.el.focus({ preventScroll: true }); }));
      P.sync = () => el.querySelectorAll('.kp-list button').forEach((b) => b.classList.toggle('on', o.list[+b.dataset.i] === k.value));
    } else {
      const f = unitScale(k), units = f != null ? unitList(k) : [];
      const base = units.length ? units[0].base : '';
      const uSel = units.length > 1 ? `<select class="kp-us" aria-label="Birim">${units.map((u, i) => `<option value="${i}">${u.unit}</option>`).join('')}</select>` : `<span class="kp-u">${units.length ? units[0].unit : ''}</span>`;
      el.innerHTML = `<div class="kp-h"><b>${title}</b><button type="button" class="kp-x" title="Kapat">×</button></div>
        <div class="kp-sub">Aralık: ${o.fmt(o.min)} … ${o.fmt(o.max)}</div>
        <div class="kp-in"><button type="button" class="kb" data-n="-1">−</button><input type="text" inputmode="decimal" autocomplete="off" spellcheck="false">${uSel}<button type="button" class="kb" data-n="1">+</button></div>
        <input type="range" min="0" max="1000" step="1" class="kp-r" aria-label="${(o.label || '').replace(/"/g, '')}">
        <div class="kp-msg"></div>
        <div class="kp-b"><span class="kp-tip">${units.length > 1 ? 'Birimi yandan seçin ya da yazın: 4,7k · 600µ · 2m' : 'Ondalık için virgül kullanın.'}</span><button type="button" class="btn small kp-ok">Uygula</button></div>`;
      const inp = el.querySelector('input[type=text]'), sel = el.querySelector('.kp-us'), rg = el.querySelector('.kp-r'), msg = el.querySelector('.kp-msg');
      const selMult = () => (sel ? units[+sel.value].mult : units.length ? units[0].mult : 1);
      P.sync = () => {
        if (document.activeElement !== inp && document.activeElement !== sel) {
          const c = f != null ? splitFmt(o.fmt(k.value)) : null;
          inp.value = c ? String(c.n).replace('.', ',') : String(+k.value.toPrecision(8)).replace('.', ',');
          if (sel && c) { const i = units.findIndex((u) => u.unit === c.unit); if (i >= 0) sel.value = i; }
        }
        rg.value = Math.round(k.p * 1000);
      };
      // yazılan metni ham düğme değerine çevir (mult: birim çarpanı)
      const toRaw = (t, mult) => {
        if (f == null) return t.pre != null ? t.v * t.pre : t.v;
        const useTyped = t.pre != null && !(base[0] === 'm' && t.pre === 1e-3);
        return (t.v * (useTyped ? t.pre : mult)) / f;
      };
      const fin = (v) => { if (o.step && !o.log) v = Math.round(v / o.step) * o.step; return +v.toPrecision(10); };
      const eps = (Math.abs(o.max - o.min) || 1) * 1e-9;
      const inRange = (v) => v >= o.min - eps && v <= o.max + eps;
      const apply = () => {
        const t = Lab.parseSI(inp.value);
        if (!isFinite(t.v)) { msg.textContent = 'Geçerli bir sayı yazın (ondalık için virgül kullanabilirsiniz).'; return false; }
        const v = fin(toRaw(t, selMult()));
        if (!inRange(v)) {
          msg.innerHTML = `Aralık dışında: en az ${o.fmt(o.min)}, en çok ${o.fmt(o.max)}.`;
          // başka bir birimle yazılmış olabilir mi? (ör. kHz yerine Hz)
          if (t.pre == null && sel) {
            const alt = units.map((u, i) => ({ u, i, v: fin(toRaw(t, u.mult)) })).find((a) => inRange(a.v));
            if (alt) {
              msg.innerHTML += ` <button type="button" class="btn small sec kp-alt">${String(t.v).replace('.', ',')} ${alt.u.unit} mı?</button>`;
              msg.querySelector('.kp-alt').onclick = () => { sel.value = alt.i; if (apply()) P.close(); };
            }
          }
          // işaret unutulmuş olabilir (ör. kapasitif reaktans negatiftir)
          if (!msg.querySelector('.kp-alt') && t.v > 0 && inRange(fin(toRaw({ v: -t.v, pre: t.pre }, selMult())))) {
            msg.innerHTML += ` <button type="button" class="btn small sec kp-alt">−${inp.value.trim()} mı?</button>`;
            msg.querySelector('.kp-alt').onclick = () => { inp.value = '-' + inp.value.trim(); if (apply()) P.close(); };
          }
          return false;
        }
        msg.textContent = ''; k.set(Lab.clamp(v, o.min, o.max)); inp.blur(); if (sel) sel.blur(); P.sync(); return true;
      };
      if (sel) sel.addEventListener('change', () => { msg.textContent = ''; inp.focus(); });
      inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { if (apply()) { P.close(); k.el.focus({ preventScroll: true }); } } if (e.key === 'Escape') { P.close(); k.el.focus(); } });
      inp.addEventListener('input', () => (msg.textContent = ''));
      rg.addEventListener('input', () => { k.set(k._fromP(rg.value / 1000)); if (!o.list) k.p = rg.value / 1000; });
      el.querySelector('.kp-ok').onclick = () => { if (apply()) P.close(); };
      el.querySelectorAll('.kp-in .kb').forEach((b) => (b.onclick = () => k._nudge(+b.dataset.n)));
    }
    el.querySelector('.kp-x').onclick = () => P.close();
    P.sync(); el.classList.add('show'); P.place();
    if (!o.list && !coarse) { const i = el.querySelector('input[type=text]'); i.focus(); i.select(); }
    else { const b = el.querySelector('.kp-list .on'); if (b) b.scrollIntoView({ block: 'nearest' }); }
  };

  /* ---------- "düğme çevrildi ama hiçbir şey değişmedi" ipucu ---------- */
  Lab.effectWatch = (() => {
    const shown = new WeakSet(); let lastHint = 0;
    // bölümdeki görünür metin (düğme etiketleri hariç) + tuvaller
    const snap = (sec) => {
      let s = '';
      const w = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, { acceptNode: (n) => (n.nodeType === 1 && n.classList.contains('knob') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        if (n.nodeType === 3) s += n.nodeValue;
        else if (n.tagName === 'CANVAS' && n.offsetParent) { try { const d = n.toDataURL(); s += d.length + d.slice(-64); } catch (x) {} }
      }
      return s;
    };
    return {
      before(k) {
        if (k._eff || shown.has(k)) return;
        const sec = k.el.closest('section.page'); if (!sec || !k.el.offsetParent) return;
        k._eff = { sec, s: snap(sec) };
      },
      after(k) {
        if (!k._eff) return;
        clearTimeout(k._effT);
        k._effT = setTimeout(() => {
          const e = k._eff; k._eff = null;
          if (!e || snap(e.sec) !== e.s || Date.now() - lastHint < 15000) return;
          shown.add(k); lastHint = Date.now();
          const off = [...e.sec.querySelectorAll('button')].some((b) => b.offsetParent && /KAPALI|SINGLE|BAŞLAT|ÇALIŞTIR/i.test(b.textContent));
          Lab.toast(`ℹ <b>${labelHTML(k.o.label || 'Düğme')}</b> değişti ama ekranda henüz bir sonuç görünmüyor. ` +
            (off ? 'Cihazın <b>ÇIKIŞ / SINGLE / BAŞLAT</b> düğmesine basmanız gerekebilir. ' : '') +
            'Doğru bağlantı/mod seçili mi? Föydeki sıradaki adıma bakın.', 6500);
        }, 900);
      },
    };
  })();

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
      canvas.addEventListener('pointercancel', () => (this.cur.drag = null));
      this.onMeasure = o.onMeasure;
    }
    // data: {n, y:[Float64Array ch1, Float64Array ch2]} — n örnek, 10 bölme boyunca
    draw(data) {
      if (data) this.data = data;
      this.c.style.touchAction = this.cur.on ? 'none' : ''; // dokunmatik ekranda imleç sürüklerken sayfa kaymasın
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
    const url = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  /* ---------- ilk kullanım rehberi: düğmeler nasıl çevrilir ---------- */
  const flag = { get: (k) => { try { return localStorage.getItem('devrelab:ui:' + k); } catch (e) { return null; } }, set: (k) => { try { localStorage.setItem('devrelab:ui:' + k, '1'); } catch (e) {} } };
  Lab.coach = {
    el: null, knob: null,
    done() { flag.set('coach'); this.hide(); },
    hide() { if (this.el) this.el.remove(); if (this.knob) this.knob.el.classList.remove('coach'); this.el = this.knob = null; },
    show(force) {
      if (!force && flag.get('coach')) return;
      const sec = document.querySelector('section.page.active'); if (!sec) return;
      const vis = (e) => { const r = e.getBoundingClientRect(); return e.offsetParent && r.width && r.top > 50 && r.bottom < innerHeight - 110; };
      const all = [...sec.querySelectorAll('.knob')].filter((e) => e.offsetParent);
      const k = all.find(vis) || (force && all[0]); if (!k) return;
      if (force && !vis(k)) k.scrollIntoView({ block: 'center' });
      this.hide();
      const el = (this.el = document.createElement('div')); el.className = 'coachbox no-print';
      el.innerHTML = `<b>Cihaz düğmeleri nasıl kullanılır?</b>
        <ol><li>Düğmeyi <b>yukarı / aşağı sürükleyin</b> (sağa / sola da olur)</li>
        <li>ya da altındaki <b>−</b> / <b>+</b> düğmelerine basın — basılı tutarsanız hızlanır</li>
        <li><b>Tam değer</b> için düğmeye ya da değerine <b>dokunun</b>: değeri yazın veya listeden seçin</li></ol>
        <div style="text-align:right"><button type="button" class="btn small">Anladım</button></div>`;
      document.body.appendChild(el);
      this.knob = { el: k }; k.classList.add('coach');
      el.querySelector('button').onclick = () => this.done();
      const r = k.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
      let y = r.bottom + 10; if (y + h > innerHeight - 100) y = Math.max(8, r.top - h - 10);
      el.style.left = Lab.clamp(r.left + r.width / 2 - w / 2, 8, Math.max(8, innerWidth - w - 8)) + scrollX + 'px'; el.style.top = y + scrollY + 'px';
    },
  };

  /* ---------- sıradaki föy adımı çubuğu (ekranın altında) ---------- */
  function stepBar() {
    const bar = document.createElement('div'); bar.className = 'stepbar no-print'; bar.setAttribute('aria-live', 'polite');
    document.body.appendChild(bar);
    let key = '', mini = false, lastSec = null;
    const strip = (h) => h.replace(/<(?!\/?(b|sub|sup|kbd|i)\b)[^>]+>/g, '');
    function tick() {
      const sec = document.querySelector('section.page.active');
      const ol = sec && sec.querySelector('ol.steps');
      const lis = ol ? [...ol.children] : [];
      if (!sec || !lis.length) { bar.classList.remove('show'); document.body.classList.remove('has-stepbar'); return; }
      if (sec !== lastSec) { lastSec = sec; Lab.coach.hide(); }
      if (!Lab.coach.el) Lab.coach.show();
      const i = lis.findIndex((l) => !l.classList.contains('done')), n = lis.length;
      const k = sec.id + '|' + i + '|' + mini;
      if (k === key) return;
      const changed = key && key.split('|')[0] === sec.id && key.split('|')[1] !== String(i);
      key = k;
      document.body.classList.add('has-stepbar'); bar.classList.add('show'); bar.classList.toggle('mini', mini);
      if (mini) bar.innerHTML = `<button type="button" class="sb-open">▲ Sıradaki adım (${i < 0 ? n : i}/${n})</button>`;
      else if (i < 0) bar.innerHTML = `<span class="sb-n ok">✓ ${n}/${n}</span><span class="sb-t">Bu deneyin tüm föy adımları tamamlandı. Şimdi aşağıdaki <b>soruları</b> yanıtlayın.</span><button type="button" class="sb-go" data-go="q">Sorulara git</button><button type="button" class="sb-x" title="Küçült">▼</button>`;
      else bar.innerHTML = `<span class="sb-n">Adım ${i + 1}/${n}</span><span class="sb-t">${strip(lis[i].innerHTML)}</span><button type="button" class="sb-go" data-go="f">Föyü göster</button><button type="button" class="sb-x" title="Küçült">▼</button>`;
      if (changed) { bar.classList.remove('flash'); void bar.offsetWidth; bar.classList.add('flash'); }
      const go = bar.querySelector('.sb-go');
      if (go) go.onclick = () => { const t = go.dataset.go === 'q' ? sec.querySelector('.q') : lis[Math.max(0, i)]; if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'center' }); t.classList.add('hl'); setTimeout(() => t.classList.remove('hl'), 1800); } };
      const x = bar.querySelector('.sb-x'); if (x) x.onclick = () => { mini = true; tick(); };
      const op = bar.querySelector('.sb-open'); if (op) op.onclick = () => { mini = false; tick(); };
    }
    setInterval(tick, 500); tick();
  }

  /* ---------- deney sayfalarına kısa kullanım şeridi ---------- */
  function benchTips() {
    document.querySelectorAll('section.page').forEach((sec) => {
      const b = sec.querySelector('.bench'); if (!b || !sec.querySelector('.knob') || sec.querySelector('.benchtip')) return;
      const t = document.createElement('div'); t.className = 'benchtip no-print';
      t.innerHTML = '<b>Düğme:</b> sürükleyin ya da <b>− / +</b> basın · <b>Tam değer:</b> düğmeye dokunun · <b>Ölçüm:</b> “Kaydet (R)” · Ne yapacağınızı alttaki <b>Sıradaki adım</b> çubuğu söyler. <a href="#" class="tipmore">Nasıl?</a>';
      b.parentNode.insertBefore(t, b);
      t.querySelector('.tipmore').onclick = (e) => { e.preventDefault(); Lab.coach.show(true); };
    });
  }
  // tek dosya sürümünde sayfa document.write ile açılır ve 'load' olayı gelmeyebilir: ilk gelen olayda bir kez başlat
  let booted = false;
  const boot = () => { if (booted) return; booted = true; stepBar(); benchTips(); };
  if (document.readyState !== 'loading') setTimeout(boot, 0);
  else { document.addEventListener('DOMContentLoaded', boot); window.addEventListener('load', boot); }
})();

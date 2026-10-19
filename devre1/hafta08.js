/* Devre Kuramı I · Hafta 8 — Ara Sınav Haftası: Uygulamalı Sınav (Bölüm 1 + 2) */
(function () {
  'use strict';
  const { $, $$, svg: E, num, eng, clamp } = Lab;
  const KEY = 'd1h08';
  const S = Object.assign({ answers: {}, steps: {}, st: {}, page: 'giris',
    d1: { sc: null, hist: [], rows: [], probe: 4, tpEver: [], vpvn: false },
    d2: { sen: null, rows: [], d: null },
    d3: { sc: null, hist: [], curUsed: false },
    exam: null, exams: [] }, Lab.store.load(KEY));
  Lab.answers = S.answers;
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => Lab.store.save(KEY, S), 300); };
  Lab.onAnswer = () => { save(); progress(); };

  /* ---------- ortak yardımcılar ---------- */
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const rnd = (a, b, d = 2) => +(a + Math.random() * (b - a)).toFixed(d);
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const VS = 13.5; // gerçekçi 741 doyumu, ±15 V
  const ohm = Lab.ohm;

  function inst(parent, brand, dark = true, right = '') {
    const d = document.createElement('div'); d.className = 'inst' + (dark ? ' dark' : '');
    d.innerHTML = `<div class="brand"><span>${brand}</span><span>${right}</span></div><div class="ctrls"></div>`;
    parent.appendChild(d); return { el: d, c: d.querySelector('.ctrls') };
  }
  function lcd(parent, label, unit, w = 150) {
    const d = document.createElement('div'); d.className = 'lcd'; d.style.minWidth = w + 'px'; d.style.marginBottom = '6px';
    d.innerHTML = `<div class="lab">${label}</div><span class="big">0</span><span class="unit">${unit}</span>`;
    parent.insertBefore(d, parent.querySelector('.ctrls'));
    const b = d.querySelector('.big'), u = d.querySelector('.unit'), l = d.querySelector('.lab');
    return (t, un, lab) => { b.textContent = t; if (un != null) u.textContent = un; if (lab != null) l.innerHTML = lab; };
  }

  /* ---------- şema yardımcıları (hafta01 ile aynı) ---------- */
  const sch = {
    w: (g, pts) => E('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'w' }, g),
    dot: (g, x, y) => E('circle', { cx: x, cy: y, r: 3.5, class: 'node' }, g),
    t: (g, x, y, s, cls = 'lbl', anchor = 'middle') => { const e = E('text', { x, y, class: cls, 'text-anchor': anchor }, g); e.innerHTML = s; return e; },
    rH(g, x1, x2, y) { const n = 6, L = 8, step = (x2 - x1 - 2 * L) / n; let d = `M${x1},${y} h${L}`; for (let i = 0; i < n; i++) d += ` l${step / 2},${i % 2 ? 7 : -7} l${step / 2},${i % 2 ? -7 : 7}`; d += ` L${x2},${y}`; E('path', { d, class: 'w' }, g); },
    rV(g, x, y1, y2) { const n = 6, L = 8, step = (y2 - y1 - 2 * L) / n; let d = `M${x},${y1} v${L}`; for (let i = 0; i < n; i++) d += ` l${i % 2 ? 7 : -7},${step / 2} l${i % 2 ? -7 : 7},${step / 2}`; d += ` L${x},${y2}`; E('path', { d, class: 'w' }, g); },
    gnd(g, x, y) { E('path', { d: `M${x},${y} v8 M${x - 11},${y + 8} h22 M${x - 7},${y + 13} h14 M${x - 3},${y + 18} h6`, class: 'w' }, g); },
    src(g, x, y, r = 20, kind = 'dc') {
      E('circle', { cx: x, cy: y, r, class: 'w', fill: '#fff' }, g);
      if (kind === 'ac') E('path', { d: `M${x - 10},${y} q5,-12 10,0 t10,0`, class: 'w' }, g);
      else { sch.t(g, x, y - 4, '+', 'lbl'); sch.t(g, x, y + 13, '−', 'lbl'); }
    },
    term(g, x, y) { E('circle', { cx: x, cy: y, r: 4.5, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g); },
    opamp(g, x, yt, h = 110, w = 120) { E('path', { d: `M${x},${yt} L${x},${yt + h} L${x + w},${yt + h / 2} Z`, class: 'w', fill: '#f4f7ff' }, g); },
  };
  const sub = (a, b) => `${a}<tspan font-size="10" dy="3">${b}</tspan><tspan dy="-3"> </tspan>`;

  /* ================= GEZİNME / İLERLEME ================= */
  const pages = ['giris', 'onbilgi', 'onhaz', 'd1', 'd2', 'd3', 'd4', 'rapor'];
  function go(p) {
    S.page = p; save();
    $$('section.page').forEach((s) => s.classList.toggle('active', s.id === p));
    $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.p === p));
    if (p === 'd3') D3.dirty = true;
    if (p === 'rapor') buildReport();
    window.scrollTo(0, 0);
  }
  $$('#nav button').forEach((b) => (b.onclick = () => go(b.dataset.p)));

  const stepDefs = {};
  function steps(key, list) {
    stepDefs[key] = list;
    $('#' + key + 'steps').innerHTML = list.map((s) => `<li>${s.t}</li>`).join('');
  }
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
  numq('onhaz', '#preQ', { id: 'p1', q: '1) Evirmeyen yükselteç: R<sub>s</sub> = 10 kΩ, R<sub>f</sub> = 47 kΩ, v<sub>g</sub> = 0,8 V. v<sub>o</sub> kaç volttur?', answer: 4.56, tol: 1, unit: 'V', explain: '(1 + 4,7) × 0,8 = 4,56 V; ±15 V içinde.', hint: 'Kazanç 1 + R<sub>f</sub>/R<sub>s</sub>.' });
  numq('onhaz', '#preQ', { id: 'p2', q: '2) Aynı devrede R<sub>s</sub> yerine yanlışlıkla 1 kΩ takılırsa v<sub>o</sub> kaç volt olur (ders kabulü, doyum ±15 V)?', answer: 15, tol: 1, unit: 'V', explain: '(1 + 47) × 0,8 = 38,4 V hesaplanır ama çıkış +15 V\'ta doyar.', hint: 'Önce ideal sonucu hesaplayın, sonra beslemeyle karşılaştırın.' });
  numq('onhaz', '#preQ', { id: 'p3', q: '3) Fark yükselteci: R<sub>1</sub> = R<sub>3</sub> = 10 kΩ, R<sub>2</sub> = R<sub>4</sub> = 100 kΩ; v<sub>b</sub> − v<sub>a</sub> = 50 mV. v<sub>o</sub> kaç volttur?', answer: 0.5, tol: 1, unit: 'V', explain: '(100/10) × 50 mV = 0,5 V. Ortak mod gerilimi (ör. 2,5 V) oranlar eşitse çıkışa geçmez.', hint: 'v<sub>o</sub> = (R<sub>2</sub>/R<sub>1</sub>)(v<sub>b</sub> − v<sub>a</sub>)' });
  numq('onhaz', '#preQ', { id: 'p4', q: '4) Örnek 2.1: L = 200 mH bobinin akımı 6 ms\'de 0\'dan 3 A\'e doğrusal artıyor. Bobin gerilimi kaç volttur?', answer: 100, tol: 1, unit: 'V', explain: 'v = L di/dt = 0,2 × (3/0,006) = 100 V, sabit.', hint: 'Eğim = 3 A / 6 ms = 500 A/s.' });
  numq('onhaz', '#preQ', { id: 'p5', q: '5) Örnek 2.9: C = 2 µF kapasitörün gerilimi 3 ms\'de 0\'dan 6 V\'a doğrusal artıyor. Akım kaç mA\'dir?', answer: 4, tol: 1, unit: 'mA', explain: 'i = C dv/dt = 2×10⁻⁶ × 2000 = 4 mA.', hint: 'Eğim 2000 V/s.' });
  mcq('onhaz', '#preQ', { id: 'p6', q: '6) Bir elemanın gerilimi üçgen dalga, akımı kare dalga ise eleman hangisidir?', opts: ['Direnç', 'Bobin', 'Kapasitör', 'Belirlenemez'], correct: 2, explain: 'i = C dv/dt: üçgenin eğimi sabit → akım her yarım periyotta sabit (kare).', hint: 'Hangi elemanda akım, gerilimin türeviyle orantılıdır?' });

  /* ================= GÖREV 1 · ARIZA BUL ================= */
  const FAULTS = [
    ['ok', 'Arıza yok — kart doğru çalışıyor'],
    ['swap', 'Op-amp girişleri ters bağlanmış (+ ve − yer değiştirmiş)'],
    ['rfopen', 'R_f kopuk (açık devre)'],
    ['cap', 'Besleme dekuplaj elektrolitiği (C1) ters takılmış'],
    ['wrongR', 'Yanlış değerli direnç takılmış (renk kodu hatası)'],
  ];
  const FEXPL = {
    ok: 'Besleme ±15 V, v<sub>p</sub> = v<sub>n</sub> ve v<sub>o</sub>/v<sub>g</sub> = 5,7: kart sağlam. “Arıza yok” demek de bir teşhistir!',
    swap: 'v<sub>n</sub> = v<sub>g</sub> (kaynak eviren uçta), v<sub>p</sub> ise çıkıştan bölücüyle geliyor ve çıkış doyumda: geri besleme <b>pozitif</b>. v<sub>p</sub> = v<sub>o</sub>·R<sub>s</sub>/(R<sub>s</sub>+R<sub>f</sub>) ilişkisi bunu ele verir.',
    rfopen: 'v<sub>n</sub> ≈ 0 (R<sub>s</sub> üzerinden toprağa çekiliyor, yalnızca polarma akımı kadar mV), v<sub>p</sub> = v<sub>g</sub> &gt; 0 ve çıkış +V<sub>sat</sub>: geri besleme yolu yok, op-amp açık çevrimde karşılaştırıcı gibi çalışıyor.',
    cap: '+V<sub>CC</sub> bacağı 15 V yerine yaklaşık 2 V, kaynak CC (akım sınırı) konumunda: ters elektrolitik kaynağı kısa devre ediyor. Op-amp beslemesiz kaldığı için v<sub>p</sub> ≠ v<sub>n</sub>.',
    wrongR: 'Besleme ve sanal kısa devre normalse ama kazanç 5,7 değilse direnç değeri yanlıştır: R<sub>f</sub> = R<sub>s</sub>(v<sub>o</sub>/v<sub>n</sub> − 1). Doyumdaki kartta v<sub>n</sub> = v<sub>o</sub>·R<sub>s</sub>/(R<sub>s</sub>+R<sub>f</sub>) ile hangi direncin değiştiğini bulabilirsiniz.',
  };
  const TPN = ['TP1 · v<sub>g</sub> (kaynak)', 'TP2 · bacak 3 (+)', 'TP3 · bacak 2 (−)', 'TP4 · bacak 6 (v<sub>o</sub>)', 'TP5 · bacak 7 (+V<sub>CC</sub>)', 'TP6 · bacak 4 (−V<sub>CC</sub>)'];
  const TPT = ['TP1 vg', 'TP2 pin3', 'TP3 pin2', 'TP4 vo', 'TP5 +Vcc', 'TP6 -Vcc'];

  const D1 = (() => {
    const self = {};
    const Rs0 = 1e4, Rf0 = 4.7e4, RL = 1e4, IB = 80e-9, IQ = 1.7e-3;
    function newSc() {
      const prev = S.d1.sc && S.d1.sc.f;
      let f; do { f = pick(['ok', 'swap', 'swap', 'rfopen', 'rfopen', 'cap', 'cap', 'wrongR', 'wrongR']); } while (f === prev && Math.random() < 0.8);
      S.d1.sc = { f, vg: rnd(0.3, 1.1, 2), sub: Math.random() < 0.5 ? 'rf' : 'rs', rail: rnd(1.6, 2.4, 2), n: S.d1.hist.length + 1, meas: [], done: false };
      save();
    }
    if (!S.d1.sc) newSc();
    function compute(sc = S.d1.sc) {
      let Rs = Rs0, Rf = Rf0, railP = 15, railN = -15, cc = false;
      const vg = sc.vg;
      if (sc.f === 'wrongR') { if (sc.sub === 'rf') Rf = 4.7e3; else Rs = 1e3; }
      const G = 1 + Rf / Rs, k = Rs / (Rs + Rf);
      let p3, p2, vo;
      if (sc.f === 'swap') { vo = -VS; p2 = vg; p3 = vo * k; }
      else if (sc.f === 'rfopen') { p3 = vg; p2 = IB * Rs; vo = VS; }
      else if (sc.f === 'cap') { railP = sc.rail; cc = true; p3 = vg; vo = Math.max(0.05, Math.min(G * vg, railP - 1.4)); p2 = vo * k; }
      else { p3 = vg; vo = clamp((G * vg) / (1 + G / 1e5), -VS, VS); p2 = vo * k; }
      const io = vo / RL + (sc.f === 'rfopen' ? 0 : vo / (Rs + Rf));
      const Ip = cc ? 0.5 : IQ + Math.max(0, io), In = IQ + Math.max(0, -io);
      return { tp: [vg, p3, p2, vo, railP, railN], Ip, In, cc };
    }
    // --- tezgâh
    const box = $('#d1inst');
    const ps = inst(box, 'SİMETRİK DC KAYNAK', true, '<span class="led" id="d1cc"></span> CC');
    const psP = lcd(ps.el, '+ KANAL', 'V', 120), psN = lcd(ps.el, '− KANAL', 'V', 120);
    const psI = document.createElement('div'); psI.style.cssText = 'font:12px Consolas;color:#ffb04a'; ps.c.appendChild(psI);
    const dc = inst(box, 'AYARLI DC KAYNAK · v<sub>g</sub>'); const dcL = lcd(dc.el, 'AYAR', 'V', 110);
    const dm = inst(box, 'DMM · DC V', false, '10 MΩ giriş'); const dmL = lcd(dm.el, '—', 'V', 170);
    const dmInfo = document.createElement('div'); dmInfo.style.cssText = 'font-size:11px;max-width:180px'; dmInfo.innerHTML = 'Siyah uç: COM (toprak). Kırmızı ucu şemadaki bir TP\'ye tıklayarak değdirin.'; dm.c.appendChild(dmInfo);

    // --- şema
    const g = $('#d1sch');
    sch.src(g, 70, 215); sch.w(g, [[70, 195], [70, 185], [300, 185]]); sch.w(g, [[70, 235], [70, 255]]); sch.gnd(g, 70, 255);
    sch.t(g, 36, 220, sub('v', 'g'));
    sch.opamp(g, 300, 100); sch.t(g, 312, 130, '−'); sch.t(g, 312, 190, '+');
    sch.t(g, 296, 120, '2', 'lbl', 'end').setAttribute('style', 'font-size:10px'); sch.t(g, 296, 180, '3', 'lbl', 'end').setAttribute('style', 'font-size:10px');
    sch.w(g, [[300, 125], [230, 125]]); sch.dot(g, 230, 125);
    sch.rH(g, 130, 230, 125); sch.w(g, [[130, 125], [130, 140]]); sch.gnd(g, 130, 140); sch.t(g, 180, 110, sub('R', 's') + '10 kΩ');
    sch.w(g, [[230, 125], [230, 50], [280, 50]]); sch.rH(g, 280, 400, 50); sch.w(g, [[400, 50], [470, 50], [470, 155]]); sch.t(g, 340, 36, sub('R', 'f') + '47 kΩ');
    sch.w(g, [[420, 155], [560, 155]]); sch.dot(g, 470, 155); sch.rV(g, 560, 155, 255); sch.gnd(g, 560, 255); sch.t(g, 576, 210, sub('R', 'L') + '10 kΩ', 'lbl', 'start');
    sch.w(g, [[360, 128], [360, 80], [440, 80], [440, 92]]);
    E('path', { d: 'M428,92 h24 M428,100 q12,-5 24,0', class: 'w' }, g); sch.w(g, [[440, 98], [440, 112]]); sch.gnd(g, 440, 112);
    sch.t(g, 424, 96, '+', 'lbl', 'end').setAttribute('style', 'font-size:11px'); sch.t(g, 456, 128, 'C1', 'lbl', 'start').setAttribute('style', 'font-size:11px');
    sch.t(g, 352, 76, '+15 V · 7', 'lbl', 'end');
    sch.w(g, [[360, 182], [360, 250]]); sch.t(g, 368, 262, '−15 V · 4', 'lbl', 'start');
    sch.t(g, 650, 40, 'C1 = 100 µF / 25 V', 'lbl').setAttribute('style', 'font-size:11px;fill:#777');
    const tpPos = [[150, 185], [270, 185], [265, 125], [520, 155], [360, 100], [360, 230]];
    const tpEls = tpPos.map(([x, y], i) => {
      const t = E('g', { class: 'tp' }, g);
      E('circle', { cx: x, cy: y, r: 7 }, t);
      sch.t(t, x + (i === 4 ? -12 : 0), y - (i === 5 ? -22 : 11), 'TP' + (i + 1), '', i === 4 ? 'end' : 'middle');
      t.addEventListener('click', () => probe(i));
      return t;
    });
    const tMsg = sch.t(g, 600, 300, '', 'val'); tMsg.setAttribute('style', 'fill:#c62828;font-size:12px');
    function probe(i) {
      S.d1.probe = i;
      const sc = S.d1.sc; if (!sc.meas.includes(i)) sc.meas.push(i);
      if (!S.d1.tpEver.includes(i)) S.d1.tpEver.push(i);
      if (sc.meas.includes(1) && sc.meas.includes(2)) S.d1.vpvn = true;
      save(); self.tick = 0;
    }
    // --- teşhis
    $('#d1diag').innerHTML = '<option value="">— teşhisinizi seçin —</option>' + FAULTS.map(([k, t]) => `<option value="${k}">${t.replace('R_f', 'Rf')}</option>`).join('');
    function score() {
      const h = S.d1.hist, ok = h.filter((x) => x.ok).length;
      $('#d1score').textContent = `Doğru teşhis: ${ok}/${h.length}`;
      $('#d1card').textContent = 'Kart #' + S.d1.sc.n;
    }
    $('#d1go').onclick = () => {
      const sc = S.d1.sc, v = $('#d1diag').value;
      if (sc.done) return Lab.toast('Bu kart teşhis edildi. “Yeni kart” ile devam edin.');
      if (!v) return Lab.toast('Bir teşhis seçin.');
      if (sc.meas.length < 2) return Lab.toast('Ölçmeden teşhis olmaz: en az iki test noktası ölçün.');
      const ok = v === sc.f; sc.done = true;
      S.d1.hist.push({ n: sc.n, f: sc.f, g: v, ok, nm: sc.meas.length, vg: sc.vg, sub: sc.sub });
      const name = FAULTS.find((x) => x[0] === sc.f)[1];
      $('#d1fb').innerHTML = (ok ? '<b style="color:#1a8a4a">✔ Doğru teşhis.</b> ' : `<b style="color:#c62828">✘ Yanlış.</b> Gerçek arıza: <b>${name}</b>. `) + FEXPL[sc.f] + (sc.f === 'wrongR' ? ` (Bu kartta ${sc.sub === 'rf' ? 'R<sub>f</sub> yerine 4,7 kΩ' : 'R<sub>s</sub> yerine 1 kΩ'} takılıydı.)` : '');
      save(); score(); progress();
    };
    $('#d1next').onclick = () => { if (!S.d1.sc.done && S.d1.sc.meas.length && !confirm('Bu kartı teşhis etmeden geçmek istiyor musunuz?')) return; newSc(); $('#d1diag').value = ''; $('#d1fb').innerHTML = 'Yeni kart takıldı. Önce ölçün: en az iki test noktası.'; score(); };
    // --- tablo
    const tbody = $('#d1tab tbody');
    function table() { tbody.innerHTML = S.d1.rows.map((r, i) => `<tr><td>${i + 1}</td><td>#${r.n}</td><td class="l">${TPN[r.tp]}</td><td>${num(r.v, 3)}</td></tr>`).join(''); tbody.parentElement.parentElement.scrollTop = 1e6; }
    self.rec = () => { const v = self.reading; if (v == null) return; S.d1.rows.push({ n: S.d1.sc.n, tp: S.d1.probe, v }); save(); table(); Lab.toast(`Kaydedildi: ${TPT[S.d1.probe]} = ${num(v, 3)} V`); };
    $('#d1rec').onclick = self.rec;
    $('#d1del').onclick = () => { S.d1.rows.pop(); save(); table(); };
    $('#d1csv').onclick = () => Lab.downloadCSV('hafta8_gorev1.csv', ['#', 'kart', 'nokta', 'V'], S.d1.rows.map((r, i) => [i + 1, r.n, TPT[r.tp], +r.v.toFixed(4)]));
    self.tick = 0;
    self.update = () => {
      const c = compute(), sc = S.d1.sc;
      psP(num(c.tp[4], 2)); psN(num(c.tp[5], 2));
      psI.textContent = `+ ${num(c.Ip * 1e3, 1)} mA   − ${num(c.In * 1e3, 1)} mA`;
      $('#d1cc').classList.toggle('on', c.cc);
      dcL(num(sc.vg, 2));
      tpEls.forEach((t, i) => t.classList.toggle('sel', i === S.d1.probe));
      if (self.tick-- <= 0) { // ~4 Hz yenileme, gürültülü okuma
        self.tick = 15;
        const v = c.tp[S.d1.probe];
        self.reading = v * (1 + 3e-4 * gauss()) + 2e-4 * gauss();
        dmL(num(self.reading, Math.abs(self.reading) >= 10 ? 2 : 3), 'V', TPN[S.d1.probe]);
      }
      tMsg.textContent = c.cc ? 'Kaynak CC: akım sınırında!' : '';
    };
    table(); score();
    if (S.d1.sc.done) $('#d1fb').innerHTML = 'Bu kart teşhis edildi. “Yeni kart” ile devam edin.';
    self.compute = compute;
    return self;
  })();

  const d1ok = () => S.d1.hist.filter((h) => h.ok).length;
  steps('d1', [
    { t: 'Herhangi bir kartta önce <b>beslemeyi</b> doğrulayın: TP5 (+V<sub>CC</sub>) ve TP6 (−V<sub>CC</sub>) noktalarını ölçün.', test: () => S.d1.tpEver.includes(4) && S.d1.tpEver.includes(5) },
    { t: 'Aynı kartta <b>v<sub>p</sub> ve v<sub>n</sub></b>\'yi (TP2, TP3) ölçüp sanal kısa devrenin geçerli olup olmadığına bakın.', test: () => S.d1.vpvn },
    { t: 'En az <b>6 ölçümü</b> tabloya kaydedin (<kbd>R</kbd>).', test: () => S.d1.rows.length >= 6 },
    { t: '<b>3 kartı</b> doğru teşhis edin.', test: () => d1ok() >= 3 },
    { t: 'Toplam en az <b>6 kart</b> teşhis edin ve başarı oranınızı <b>%80</b>\'in üstüne çıkarın (son 6 kart).', test: () => { const h = S.d1.hist.slice(-6); return h.length >= 6 && h.filter((x) => x.ok).length >= 5; } },
  ]);
  mcq('d1', '#d1Q', { id: 'd1q1', q: 'Bir kartta v<sub>p</sub> = 0,6 V, v<sub>n</sub> ≈ 0,8 mV ve v<sub>o</sub> = +13,5 V ölçüldü; besleme ±15 V. En olası arıza hangisidir?', opts: ['Girişler ters bağlı', 'R<sub>f</sub> kopuk', 'C1 ters takılmış', 'Kart sağlam'], correct: 1, explain: 'v<sub>n</sub>, R<sub>s</sub> üzerinden toprağa çekilmiş (yalnızca 80 nA × 10 kΩ); geri besleme olmadığı için op-amp doyumda.', hint: 'Çıkış +13,5 V iken v<sub>n</sub> neden yükselmiyor?' });
  numq('d1', '#d1Q', { id: 'd1q2', q: 'Bir kartta v<sub>n</sub> = v<sub>p</sub> = 0,50 V ve v<sub>o</sub> = 0,735 V ölçüldü (R<sub>s</sub> = 10 kΩ doğru). Takılı R<sub>f</sub> kaç kΩ\'dur?', answer: 4.7, tol: 2, unit: 'kΩ', explain: 'R<sub>f</sub> = R<sub>s</sub>(v<sub>o</sub>/v<sub>n</sub> − 1) = 10 × 0,47 = 4,7 kΩ: 47 kΩ\'luk sarı-mor-turuncu yerine 4,7 kΩ\'luk sarı-mor-kırmızı takılmış olabilir.', hint: 'v<sub>o</sub> = (1 + R<sub>f</sub>/R<sub>s</sub>) v<sub>n</sub>' });
  mcq('d1', '#d1Q', { id: 'd1q3', q: 'Girişleri ters bağlı kartta (v<sub>g</sub> eviren uçta) çıkış −13,5 V\'ta. Bacak 3\'te kaç volt ölçmeyi beklersiniz?', opts: ['v<sub>g</sub>', '0 V', '−13,5 × 10/57 ≈ −2,37 V', '+13,5 V'], correct: 2, explain: 'Bacak 3 artık R<sub>f</sub>–R<sub>s</sub> bölücüsünün orta noktasıdır: v<sub>p</sub> = v<sub>o</sub>R<sub>s</sub>/(R<sub>s</sub>+R<sub>f</sub>).', hint: 'Bacak 3 hangi düğüme bağlı kaldı?' });
  mcq('d1', '#d1Q', { id: 'd1q4', q: 'Arıza ararken neden ilk olarak 7 ve 4 numaralı bacaklar ölçülür?', opts: ['Gelenek olduğu için', 'Beslemesi olmayan op-ampın diğer bütün ölçümleri anlamsızdır; en geniş arıza sınıfını tek ölçümle eler', 'Diğer bacaklar ölçülemez', 'Bacak 7 en yüksek gerilimdir'], correct: 1, explain: 'Önce enerji, sonra geri besleme, en son değerler: her ölçüm bir arıza sınıfını eler.', hint: 'Op-amp enerjisini nereden alır?' });
  mcq('d1', '#d1Q', { id: 'd1q5', q: 'Ters takılan elektrolitik kondansatörün tipik belirtisi hangisidir?', opts: ['Çıkış gerilimi iki katına çıkar', 'Kaynak akım sınırına (CC) girer, besleme gerilimi çöker, kondansatör ısınır', 'Hiçbir belirti olmaz', 'Op-amp karşılaştırıcıya dönüşür ama besleme normal kalır'], correct: 1, explain: 'Ters polarmada oksit tabaka iletir, büyük kaçak akım akar; kondansatör ısınır, şişer, patlayabilir.', hint: 'Kaynak ekranındaki CC lambasına bakın.' });

  /* ================= GÖREV 2 · TASARIM ================= */
  const E12 = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
  const RV = []; [1e3, 1e4, 1e5].forEach((m) => E12.forEach((v) => RV.push(Math.round(v * m)))); RV.push(1e6);
  const D2 = (() => {
    const self = {};
    function newSen() { S.d2.sen = { S: pick([25, 40, 50, 80, 100]) * 1e-3, Ri: pick([1e3, 2.2e3, 4.7e3, 1e4]), Vcm: 2.5 }; save(); }
    if (!S.d2.sen) newSen();
    if (!S.d2.d) S.d2.d = { R1: 1e4, R2: 1e4, R3: 1e4, R4: 1e4, Rs: 1e4, Rf: 1e4, buf: true };
    const ids = ['R1', 'R2', 'R3', 'R4', 'Rs', 'Rf'];
    ids.forEach((k) => {
      const s = $('#d2' + k); s.innerHTML = RV.map((v) => `<option value="${v}">${ohm(v)}</option>`).join('');
      s.value = String(S.d2.d[k]); s.onchange = () => { S.d2.d[k] = +s.value; save(); };
    });
    $('#d2buf').checked = S.d2.d.buf; $('#d2buf').onchange = (e) => { S.d2.d.buf = e.target.checked; save(); };

    function calc(x, d = S.d2.d) {
      const s = S.d2.sen, vd = s.S * x, va = s.Vcm + vd / 2, vb = s.Vcm - vd / 2, Ri = d.buf ? 0 : s.Ri;
      const vp = (va * d.R4) / (Ri + d.R3 + d.R4), R1e = d.R1 + Ri;
      let v1 = vp * (1 + d.R2 / R1e) - (vb * d.R2) / R1e;
      // fark katı: + girişe va (R3–R4), − girişe vb (R1–R2); çıkış = k (va − vb)
      const sat1 = Math.abs(v1) > VS; v1 = clamp(v1, -VS, VS);
      let vo = (1 + d.Rf / d.Rs) * v1; const sat2 = Math.abs(vo) > VS; vo = clamp(vo, -VS, VS);
      return { vd, v1, vo, sat1, sat2 };
    }
    // --- tezgâh
    const box = $('#d2inst');
    const sn = inst(box, 'SENSÖR SİMÜLATÖRÜ', true, 'köprü çıkışı');
    const snL = lcd(sn.el, 'v<sub>d</sub> = v<sub>a</sub> − v<sub>b</sub>', 'mV', 130);
    const kx = new Lab.Knob(sn.c, { label: 'Büyüklük', min: 0, max: 100, step: 1, value: 50, dark: true, fmt: (v) => '%' + num(v, 0) });
    const snInfo = document.createElement('div'); snInfo.style.cssText = 'font-size:11px;line-height:1.5;margin-left:6px'; sn.c.appendChild(snInfo);
    const dm1 = inst(box, 'DMM-1 · fark katı çıkışı', false); const dm1L = lcd(dm1.el, 'DC V', 'V', 130);
    const dm2 = inst(box, 'DMM-2 · v<sub>o</sub>', false); const dm2L = lcd(dm2.el, 'DC V', 'V', 130);
    const ps = inst(box, 'BESLEME', true); const psL = lcd(ps.el, 'TÜM KATLAR', 'V', 90); psL('±15,0');

    // --- şema
    const g = $('#d2sch');
    function drawSch() {
      g.innerHTML = '';
      const d = S.d2.d, s = S.d2.sen;
      E('rect', { x: 14, y: 70, width: 70, height: 140, rx: 6, fill: '#fff8e6', stroke: '#b26a00' }, g);
      sch.t(g, 49, 64, 'Sensör'); sch.t(g, 49, 146, 'köprü').setAttribute('style', 'font-size:11px;fill:#777');
      sch.t(g, 92, 102, 'a', 'lbl', 'start'); sch.t(g, 92, 192, 'b', 'lbl', 'start');
      sch.t(g, 49, 228, sub('R', 'i') + ohm(s.Ri)).setAttribute('style', 'font-size:11px');
      // tamponlar
      const buf = (x, y) => { sch.opamp(g, x, y - 25, 50, 50); sch.t(g, x + 8, y - 8, '+'); sch.t(g, x + 8, y + 18, '−'); };
      if (d.buf) {
        sch.w(g, [[84, 110], [130, 110]]); buf(130, 110); sch.w(g, [[180, 110], [215, 110]]);
        sch.w(g, [[84, 180], [130, 180]]); buf(130, 180); sch.w(g, [[180, 180], [215, 180]]);
        sch.t(g, 155, 76, 'tampon').setAttribute('style', 'font-size:11px;fill:#777');
      } else {
        sch.w(g, [[84, 110], [215, 110]]); sch.w(g, [[84, 180], [215, 180]]);
        sch.t(g, 150, 146, 'tampon yok').setAttribute('style', 'font-size:11px;fill:#c62828');
      }
      // fark katı: a → R3 → p, R4 p→toprak ; b → R1 → n, R2 n→çıkış
      sch.rH(g, 215, 290, 180); sch.t(g, 252, 205, sub('R', '3') + ohm(d.R3)).setAttribute('style', 'font-size:11px');
      sch.rH(g, 215, 290, 110); sch.t(g, 252, 96, sub('R', '1') + ohm(d.R1)).setAttribute('style', 'font-size:11px');
      // a üstte gelir ama + girişe gitmeli: çapraz bağlantı yerine etiket
      sch.t(g, 200, 104, 'b', 'lbl').setAttribute('style', 'font-size:11px;fill:#0b5cad');
      sch.t(g, 200, 174, 'a', 'lbl').setAttribute('style', 'font-size:11px;fill:#0b5cad');
      sch.w(g, [[290, 110], [340, 110]]); sch.w(g, [[290, 180], [340, 180]]); sch.dot(g, 310, 110); sch.dot(g, 310, 180);
      sch.rV(g, 310, 180, 250); sch.gnd(g, 310, 250); sch.t(g, 318, 230, sub('R', '4') + ohm(d.R4), 'lbl', 'start').setAttribute('style', 'font-size:11px');
      sch.opamp(g, 340, 90, 110, 100); sch.t(g, 350, 114, '−'); sch.t(g, 350, 184, '+');
      sch.w(g, [[310, 110], [310, 40], [340, 40]]); sch.rH(g, 340, 420, 40); sch.w(g, [[420, 40], [460, 40], [460, 145]]);
      sch.t(g, 380, 26, sub('R', '2') + ohm(d.R2)).setAttribute('style', 'font-size:11px');
      sch.w(g, [[440, 145], [560, 145]]); sch.dot(g, 460, 145); sch.t(g, 470, 138, sub('v', '1'), 'lbl', 'start');
      // evirmeyen kat
      sch.opamp(g, 560, 95, 100, 100); sch.t(g, 570, 154, '+'); sch.t(g, 570, 119, '−');
      sch.w(g, [[560, 115], [535, 115], [535, 225]]); sch.dot(g, 535, 225); sch.rV(g, 535, 225, 280);
      E('path', { d: 'M535,280 v0', class: 'w' }, g); sch.gnd(g, 535, 280);
      sch.t(g, 525, 262, sub('R', 's') + ohm(d.Rs), 'lbl', 'end').setAttribute('style', 'font-size:11px');
      sch.w(g, [[535, 225], [580, 225]]); sch.rH(g, 580, 680, 225); sch.w(g, [[680, 225], [700, 225], [700, 145]]);
      sch.t(g, 630, 248, sub('R', 'f') + ohm(d.Rf)).setAttribute('style', 'font-size:11px');
      sch.w(g, [[660, 145], [740, 145]]); sch.dot(g, 700, 145); sch.term(g, 740, 145); sch.t(g, 740, 130, sub('v', 'o'));
      // 535,115 → 535,225 dikey hat 145’teki v1 hattını kesmez (v1 hattı 560’ta biter)
      sch.w(g, [[535, 145], [560, 145]]);
    }
    // v1 hattını + girişe bağlamak için düzeltme: 440→560 hattı zaten 145’te + girişe gider (+ işareti 154’te)
    snInfo.innerHTML = '';
    self.updSen = () => { const s = S.d2.sen; snInfo.innerHTML = `Tam ölçek S = <b>${num(s.S * 1e3, 0)} mV</b><br>Ortak mod 2,5 V<br>R<sub>i</sub> = ${ohm(s.Ri)} (her uç)`; };
    self.updSen();
    let schKey = '';
    self.update = () => {
      const k = JSON.stringify(S.d2.d) + S.d2.sen.Ri; if (k !== schKey) { schKey = k; drawSch(); }
      const c = calc(kx.value / 100);
      snL(num(c.vd * 1e3, 2)); dm1L(num(c.v1, 3)); dm2L(num(c.vo, 3));
      self.live = c;
    };
    const plot = new Lab.Plot($('#d2plot'), { xlabel: 'ölçülen büyüklük  (%)', ylabel: 'v_o  (V)' });
    let lastCurve = [];
    function drawPlot() {
      plot.draw([{ pts: [[0, 0], [100, 10]], line: true, color: '#e07a10', dash: [6, 4] }, { pts: [[0, 9.6], [100, 9.6]], line: true, color: '#cfd6e0', width: 1 }, { pts: lastCurve, line: true, color: '#0b5cad', width: 2.5 }], [0, 100], [-2, 14]);
    }
    self.evaluate = () => {
      const d = Object.assign({}, S.d2.d), s = S.d2.sen;
      lastCurve = []; let sat = false;
      for (let x = 0; x <= 1.0001; x += 0.05) { const c = calc(x, d); lastCurve.push([x * 100, c.vo]); if (c.sat1 || c.sat2) sat = true; }
      const v0 = calc(0, d).vo, v1 = calc(1, d).vo, G1 = d.R2 / d.R1, G2 = 1 + d.Rf / d.Rs;
      const why = [];
      if (Math.abs(v0) > 0.15) why.push(`%0’da çıkış ${num(v0, 3)} V (≤ 0,15 V olmalı) — ${Math.abs(d.R2 / d.R1 - d.R4 / d.R3) > 1e-9 ? 'R<sub>2</sub>/R<sub>1</sub> ≠ R<sub>4</sub>/R<sub>3</sub>: ortak mod sızıyor' : (d.buf ? 'ortak mod sızıntısı' : 'iç direnç kolları dengesiz yüklüyor')}`);
      if (Math.abs(v1 - 10) > 0.4) why.push(`%100’de çıkış ${num(v1, 3)} V (9,6–10,4 V olmalı)`);
      if (sat) why.push('en az bir kat doyuma giriyor');
      if (G1 > 100 || G2 > 100) why.push(`kat kazancı 100’ü aşıyor (fark katı ${num(G1, 1)}, evirmeyen ${num(G2, 1)}) — GBW = 1 MHz ile bant 10 kHz’in altına düşer`);
      const pass = !why.length;
      S.d2.rows.push({ S: s.S, Ri: s.Ri, buf: d.buf, R1: d.R1, R2: d.R2, R3: d.R3, R4: d.R4, Rs: d.Rs, Rf: d.Rf, v0, v1, pass });
      save(); table(); drawPlot();
      $('#d2verdict').innerHTML = pass
        ? `<b style="color:#1a8a4a">✔ UYGUN.</b> v<sub>o</sub>(%0) = ${num(v0, 3)} V, v<sub>o</sub>(%100) = ${num(v1, 3)} V (hata %${num(Math.abs(v1 - 10) * 10, 1)}). Kat kazançları: ${num(G1, 2)} × ${num(G2, 2)}.`
        : `<b style="color:#c62828">✘ UYGUN DEĞİL.</b><br>• ${why.join('<br>• ')}`;
      Lab.toast(pass ? '✔ Tasarım hedefe uyuyor.' : '✘ Tasarım hedefe uymuyor.');
    };
    $('#d2eval').onclick = self.evaluate;
    $('#d2new').onclick = () => { if (!confirm('Yeni bir sensör seçilsin mi? (Tablodaki kayıtlar kalır.)')) return; newSen(); self.updSen(); schKey = ''; Lab.toast('Yeni sensör: S = ' + num(S.d2.sen.S * 1e3, 0) + ' mV, R_i = ' + ohm(S.d2.sen.Ri)); };
    const tbody = $('#d2tab tbody');
    function table() {
      tbody.innerHTML = S.d2.rows.map((r, i) => `<tr><td>${i + 1}</td><td>${num(r.S * 1e3, 0)}</td><td>${ohm(r.Ri)}</td><td>${r.buf ? 'var' : 'yok'}</td><td>${ohm(r.R1)}/${ohm(r.R2)}</td><td>${ohm(r.R3)}/${ohm(r.R4)}</td><td>${ohm(r.Rs)}/${ohm(r.Rf)}</td><td>${num(r.v0, 3)}</td><td>${num(r.v1, 3)}</td><td>${r.pass ? '✔' : '✘'}</td></tr>`).join('');
      tbody.parentElement.parentElement.scrollTop = 1e6;
    }
    $('#d2csv').onclick = () => Lab.downloadCSV('hafta8_gorev2.csv', ['#', 'S (mV)', 'Ri', 'tampon', 'R1', 'R2', 'R3', 'R4', 'Rs', 'Rf', 'vo(0)', 'vo(100)', 'sonuc'], S.d2.rows.map((r, i) => [i + 1, r.S * 1e3, r.Ri, r.buf ? 'var' : 'yok', r.R1, r.R2, r.R3, r.R4, r.Rs, r.Rf, +r.v0.toFixed(4), +r.v1.toFixed(4), r.pass ? 'uygun' : 'degil']));
    table(); drawPlot();
    self.plotCanvas = $('#d2plot'); self.kx = kx;
    return self;
  })();

  const sameR = (a, b) => ['R1', 'R2', 'R3', 'R4', 'Rs', 'Rf'].every((k) => a[k] === b[k]);
  steps('d2', [
    { t: 'Sensörünüz için gereken <b>toplam kazancı</b> hesaplayıp ilk soruyu yanıtlayın.', test: () => S.answers.d2q1 && S.answers.d2q1.ok },
    { t: 'Kazancı iki kata bölün (her biri ≤ 100). Tamponlar takılıyken <b>UYGUN</b> sonucu veren bir tasarım bulun.', test: () => S.d2.rows.some((r) => r.pass && r.buf) },
    { t: 'Uygun tasarımınızın aynısını <b>tamponları çıkararak</b> değerlendirin. %0 ve %100 çıkışları nasıl değişti?', test: () => S.d2.rows.some((r) => !r.buf && S.d2.rows.some((q) => q.pass && q.buf && q.S === r.S && q.Ri === r.Ri && sameR(q, r))) },
    { t: 'Tamponlar takılıyken büyüklük düğmesini <b>%100</b>\'e getirip DMM-2\'de 10 V civarını görün.', test: () => S.d2.d.buf && D2.live && D2.kx.value === 100 && Math.abs(D2.live.vo - 10) < 0.4 },
    { t: '<b>Farklı dirençlerle ikinci</b> bir uygun tasarım bulun (en az 2 uygun tasarım).', test: () => { const p = S.d2.rows.filter((r) => r.pass); return p.some((a) => p.some((b) => !sameR(a, b))); } },
  ]);
  numq('d2', '#d2Q', { id: 'd2q1', q: 'Sensörünüzün tam ölçek çıkışını (S) 10 V\'a çıkarmak için gereken toplam kazanç kaçtır? (S değerini sensör simülatöründen okuyun.)', answer: () => 10 / S.d2.sen.S, tol: 1, unit: '', explain: 'G = 10 V / S. Ör. S = 50 mV → 200 = 10 × 20.', hint: 'G = (hedef tam ölçek) / (sensör tam ölçeği); birimleri eşitleyin.' });
  mcq('d2', '#d2Q', { id: 'd2q2', q: 'Fark katında R<sub>2</sub>/R<sub>1</sub> ≠ R<sub>4</sub>/R<sub>3</sub> seçilirse %0\'da (v<sub>d</sub> = 0) çıkış neden sıfır olmaz?', opts: ['Sensör bozuktur', 'Her iki uçtaki 2,5 V ortak mod gerilimi tam sönmez ve kazançla çarpılıp çıkışa geçer', 'Op-amp doyuma girer', 'Evirmeyen kat ofset üretir'], correct: 1, explain: 'Ortak mod reddi, iki kolun oranlarının eşitliğine bağlıdır. Küçük bir dengesizlik × büyük kazanç = büyük hata.', hint: 'v<sub>a</sub> = v<sub>b</sub> = 2,5 V iken v<sub>1</sub>\'i hesaplayın.' });
  mcq('d2', '#d2Q', { id: 'd2q3', q: 'Tamponlar çıkarıldığında tasarımın bozulmasının asıl nedeni nedir?', opts: ['Tampon kazanç sağlıyordu', 'Sensör iç direnci R<sub>1</sub>\'e ve R<sub>3</sub>\'e seri eklenir; kol oranları ve kazanç değişir (yükleme etkisi)', 'Besleme yetmez', 'Tampon olmadan op-amp karşılaştırıcı olur'], correct: 1, explain: 'Tamponun giriş direnci çok büyük, çıkış direnci çok küçüktür: kaynağı yüklemez.', hint: 'Fark katının giriş direnci sonsuz mudur?' });
  mcq('d2', '#d2Q', { id: 'd2q4', q: 'Toplam kazanç 250 iken neden tek kat yerine iki kat (ör. 10 × 25) tercih edilir?', opts: ['Daha az direnç kullanılır', 'GBW sabit olduğu için tek kat 250 kazançta bant ≈ 4 kHz\'e düşer; iki katta her kat ≥ 40 kHz bant verir', 'Doyum ortadan kalkar', 'Tek katla 250 kazanç elde edilemez'], correct: 1, explain: 'Örnek 1.10\'daki fikir: kazanç × bant = GBW; ardışık katlarda her kat kendi bandını taşır.', hint: 'f<sub>3dB</sub> = GBW / A<sub>v</sub>' });
  numq('d2', '#d2Q', { id: 'd2q5', q: 'Tamponlu bir tasarımda fark katı R<sub>1</sub> = R<sub>3</sub> = 10 kΩ, R<sub>2</sub> = R<sub>4</sub> = 100 kΩ, evirmeyen kat R<sub>s</sub> = 1 kΩ, R<sub>f</sub> = 18 kΩ. Sensör tam ölçeği 50 mV ise %100\'de v<sub>o</sub> kaç volttur?', answer: 9.5, tol: 1, unit: 'V', explain: '10 × 19 × 50 mV = 9,5 V. (R<sub>f</sub>/R<sub>s</sub> değil 1 + R<sub>f</sub>/R<sub>s</sub> = 19!)', hint: '(R<sub>2</sub>/R<sub>1</sub>)(1 + R<sub>f</sub>/R<sub>s</sub>) S' });

  /* ================= GÖREV 3 · DALGA BİÇİMİ TANIMA ================= */
  const ELS = [['R', 'Direnç (R)'], ['L', 'Bobin (L)'], ['C', 'Kapasitör (C)'], ['INT', 'Op-amp integral alıcı'], ['DIFF', 'Op-amp türev alıcı']];
  const EQS = ['v = R i', 'v = L di/dt', 'i = L dv/dt', 'i = C dv/dt', 'v = C di/dt', 'v<sub>o</sub> = −(1/RC) ∫ v<sub>g</sub> dt', 'v<sub>o</sub> = −RC dv<sub>g</sub>/dt'];
  const EQOF = { R: 0, L: 1, C: 3, INT: 5, DIFF: 6 };
  const tri = (t, f) => (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * f * t));
  const sq = (x) => (x >= 0 ? 1 : -1);
  const D3 = (() => {
    const self = { dirty: true };
    function gen() {
      const kind = pick(['Ltri', 'Ctri', 'Lsin', 'Csin', 'Rsin', 'INT', 'INT', 'DIFF']);
      const sc = { kind, n: S.d3.hist.length + 1, done: false };
      if (kind === 'Ltri') { const L = pick([10, 22, 47, 100]) * 1e-3; Object.assign(sc, { el: 'L', L, Ip: rnd(2, 10, 1) * 1e-3, f: pick([1000, 2000, 5000]), r: +(pick([0.5, 1, 1.5]) * L * 100).toFixed(1) }); }
      if (kind === 'Ctri') { Object.assign(sc, { el: 'C', C: pick([0.1, 0.22, 0.47, 1]) * 1e-6, Vp: rnd(1, 5, 1), f: pick([200, 500, 1000]) }); }
      if (kind === 'Lsin') { const L = pick([10, 22, 47, 100]) * 1e-3; Object.assign(sc, { el: 'L', L, Ip: rnd(2, 10, 1) * 1e-3, f: pick([1000, 2000, 5000]), r: +(pick([0.5, 1, 1.5]) * L * 100).toFixed(1) }); }
      if (kind === 'Csin') { Object.assign(sc, { el: 'C', C: pick([0.1, 0.22, 0.47, 1]) * 1e-6, Vp: rnd(1, 5, 1), f: pick([200, 500, 1000]) }); }
      if (kind === 'Rsin') { Object.assign(sc, { el: 'R', R: pick([100, 220, 470, 1000]), Ip: rnd(2, 10, 1) * 1e-3, f: pick([200, 500, 1000, 2000]) }); }
      if (kind === 'INT') { let p; do { Object.assign(sc, { el: 'INT', Vm: pick([1, 2, 5]), f: pick([100, 200, 500, 1000]), RC: pick([1e4, 2.2e4, 4.7e4]) * pick([0.01, 0.022, 0.047, 0.1]) * 1e-6 }); p = sc.Vm / (2 * sc.f * sc.RC); } while (p < 1 || p > 20); }
      if (kind === 'DIFF') { let a; do { Object.assign(sc, { el: 'DIFF', Vp: pick([1, 2]), f: pick([100, 200, 500]), RC: pick([1e4, 2.2e4, 4.7e4]) * pick([0.01, 0.022, 0.047, 0.1]) * 1e-6 }); a = sc.RC * 4 * sc.Vp * sc.f; } while (a < 0.5 || a > 12); }
      S.d3.sc = sc; save(); setupUI(); autoScale(); self.dirty = true;
    }
    // sinyal fonksiyonları: [ch1(t), ch2(t)]
    function sig(sc, t) {
      const w = 2 * Math.PI * sc.f, Rsh = 100;
      switch (sc.kind) {
        case 'Ltri': { const i = sc.Ip * tri(t, sc.f), di = sc.Ip * 4 * sc.f * sq(Math.cos(w * t)); return [sc.L * di + sc.r * i, Rsh * i]; }
        case 'Ctri': { const v = sc.Vp * tri(t, sc.f), i = sc.C * sc.Vp * 4 * sc.f * sq(Math.cos(w * t)); return [v, Rsh * i]; }
        case 'Lsin': { const i = sc.Ip * Math.sin(w * t); return [sc.r * i + w * sc.L * sc.Ip * Math.cos(w * t), Rsh * i]; }
        case 'Csin': { const v = sc.Vp * Math.sin(w * t); return [v, Rsh * w * sc.C * sc.Vp * Math.cos(w * t)]; }
        case 'Rsin': { const i = sc.Ip * Math.sin(w * t); return [sc.R * i, Rsh * i]; }
        case 'INT': { const T = 1 / sc.f, ph = ((t % T) + T) % T, gI = ph < T / 2 ? ph : T - ph; return [sc.Vm * sq(Math.sin(w * t)), -(sc.Vm / sc.RC) * (gI - T / 4)]; }
        case 'DIFF': { return [sc.Vp * tri(t, sc.f), -sc.RC * sc.Vp * 4 * sc.f * sq(Math.cos(w * t))]; }
      }
      return [0, 0];
    }
    function answer(sc) {
      if (sc.el === 'R') return { v: sc.R, unit: 'Ω', ask: 'Direnç değeri R =' };
      if (sc.el === 'L') return { v: sc.L * 1e3, unit: 'mH', ask: 'Endüktans L =' };
      if (sc.el === 'C') return { v: sc.C * 1e6, unit: 'µF', ask: 'Kapasite C =' };
      return { v: sc.RC * 1e3, unit: 'ms', ask: 'Zaman sabiti RC =' };
    }
    // --- osiloskop
    const VL = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10];
    const TL = [1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3];
    const scope = new Lab.Scope($('#scope'), { onMeasure: (m) => meas(m) });
    const kc = $('#scopeKnobs');
    const k1 = new Lab.Knob(kc, { label: 'CH1 V/d', list: VL, value: 1, dark: true, size: 46, fmt: (v) => eng(v, 'V'), onChange: (v) => { scope.ch[0].vdiv = v; self.dirty = true; } });
    const k2 = new Lab.Knob(kc, { label: 'CH2 V/d', list: VL, value: 1, dark: true, size: 46, fmt: (v) => eng(v, 'V'), onChange: (v) => { scope.ch[1].vdiv = v; self.dirty = true; } });
    const kt = new Lab.Knob(kc, { label: 'Zaman/d', list: TL, value: 2e-4, dark: true, size: 46, fmt: (v) => eng(v, 's'), onChange: (v) => { scope.tdiv = v; self.dirty = true; } });
    const kp1 = new Lab.Knob(kc, { label: 'CH1 konum', min: -4, max: 4, step: 0.1, value: 0, dark: true, size: 40, fmt: (v) => num(v, 1), onChange: (v) => { scope.ch[0].pos = v; self.dirty = true; } });
    const kp2 = new Lab.Knob(kc, { label: 'CH2 konum', min: -4, max: 4, step: 0.1, value: 0, dark: true, size: 40, fmt: (v) => num(v, 1), onChange: (v) => { scope.ch[1].pos = v; self.dirty = true; } });
    const bestV = (a) => VL.find((v) => a / v <= 3.2) || 10;
    function autoScale() {
      const sc = S.d3.sc, T = 1 / sc.f; let m1 = 0, m2 = 0;
      for (let i = 0; i < 400; i++) { const y = sig(sc, (i / 400) * T); m1 = Math.max(m1, Math.abs(y[0])); m2 = Math.max(m2, Math.abs(y[1])); }
      k1.set(bestV(m1)); k2.set(bestV(m2)); kt.set(TL.find((t) => t * 10 >= 2 * T) || 5e-3);
    }
    $('#ch1on').onclick = (e) => { scope.ch[0].on = !scope.ch[0].on; e.target.classList.toggle('on', scope.ch[0].on); self.dirty = true; };
    $('#ch2on').onclick = (e) => { scope.ch[1].on = !scope.ch[1].on; e.target.classList.toggle('on', scope.ch[1].on); self.dirty = true; };
    $('#curon').onclick = (e) => { scope.cur.on = !scope.cur.on; e.target.classList.toggle('on', scope.cur.on); if (scope.cur.on) { S.d3.curUsed = true; save(); } self.dirty = true; };
    $('#scope').addEventListener('pointermove', () => { if (scope.cur.drag) self.dirty = true; });
    function meas(m) {
      if (!m) return;
      const f = (x) => (isFinite(x) ? eng(x, 'Hz') : '—');
      let h = `CH1 Vpp ${eng(m.ch[0].vpp, 'V')}<br>CH1 f ${f(m.ch[0].f)}<br>CH2 Vpp ${eng(m.ch[1].vpp, 'V')}<br>CH2 f ${f(m.ch[1].f)}`;
      if (m.cur) h += `<br><span style="color:#ff7cf0">Δt ${eng(m.cur.dt, 's')}<br>CH1 a/b ${num(m.cur.v1a, 3)} / ${num(m.cur.v1b, 3)}<br>CH2 a/b ${num(m.cur.v2a, 3)} / ${num(m.cur.v2b, 3)}</span>`;
      $('#scopeMeas').innerHTML = h;
    }
    const noise = new Float64Array(1200).map(() => gauss());
    self.update = () => {
      if (!self.dirty) return; self.dirty = false;
      const sc = S.d3.sc, n = 1200, y1 = new Float64Array(n), y2 = new Float64Array(n), Tw = 10 * scope.tdiv;
      for (let i = 0; i < n; i++) { const y = sig(sc, (i / (n - 1)) * Tw); y1[i] = y[0] + 0.004 * scope.ch[0].vdiv * noise[i]; y2[i] = y[1] + 0.004 * scope.ch[1].vdiv * noise[(i * 7) % n]; }
      scope.draw({ n, y: [y1, y2] });
    };
    // --- kara kutu şeması
    function drawSch() {
      const g = $('#d3sch'); g.innerHTML = ''; const sc = S.d3.sc, opa = sc.el === 'INT' || sc.el === 'DIFF';
      if (!opa) {
        sch.src(g, 80, 100, 22, 'ac'); sch.t(g, 80, 146, 'üreteç').setAttribute('style', 'font-size:11px;fill:#777');
        sch.w(g, [[80, 78], [80, 40], [360, 40], [360, 60]]); E('rect', { x: 330, y: 60, width: 60, height: 80, rx: 6, fill: '#fff4e2', stroke: '#b26a00', 'stroke-width': 2 }, g);
        sch.t(g, 360, 108, '?', 'val').setAttribute('style', 'font-size:30px;font-weight:700;fill:#b26a00');
        sch.w(g, [[360, 140], [360, 160]]); sch.rV(g, 360, 160, 190); sch.t(g, 372, 180, 'R<tspan font-size="10" dy="3">ş</tspan><tspan dy="-3"> 100 Ω</tspan>', 'lbl', 'start');
        sch.w(g, [[80, 122], [80, 190], [360, 190]]); sch.dot(g, 360, 160);
        sch.t(g, 470, 70, 'CH1 → kutunun iki ucu: v(t)', 'lbl', 'start').setAttribute('style', 'fill:#b89a00;font-size:12px;font-weight:700');
        sch.t(g, 470, 170, 'CH2 → şönt: 100·i(t)', 'lbl', 'start').setAttribute('style', 'fill:#1596c0;font-size:12px;font-weight:700');
        E('path', { d: 'M460,66 L395,66 M460,166 L370,160', stroke: '#999', 'stroke-dasharray': '4 3' }, g);
      } else {
        sch.src(g, 70, 110, 20, 'ac'); sch.w(g, [[70, 90], [70, 70], [150, 70]]); sch.w(g, [[70, 130], [70, 160]]); sch.gnd(g, 70, 160);
        E('rect', { x: 150, y: 30, width: 260, height: 130, rx: 8, fill: '#fff4e2', stroke: '#b26a00', 'stroke-width': 2 }, g);
        sch.t(g, 280, 90, 'op-amp + R + C', 'val').setAttribute('style', 'font-size:15px;fill:#b26a00');
        sch.t(g, 280, 112, 'bağlantısı gizli', 'lbl').setAttribute('style', 'font-size:12px;fill:#b26a00');
        sch.w(g, [[410, 95], [480, 95]]); sch.term(g, 480, 95);
        sch.t(g, 520, 70, 'CH1 → giriş v_g', 'lbl', 'start').setAttribute('style', 'fill:#b89a00;font-size:12px;font-weight:700');
        sch.t(g, 520, 120, 'CH2 → çıkış v_o', 'lbl', 'start').setAttribute('style', 'fill:#1596c0;font-size:12px;font-weight:700');
      }
    }
    function setupUI() {
      const sc = S.d3.sc, a = answer(sc);
      $('#d3el').innerHTML = ELS.map(([k, t]) => `<label style="display:block;font-size:14px"><input type="radio" name="d3el" value="${k}"> ${t}</label>`).join('');
      $('#d3eq').innerHTML = EQS.map((t, i) => `<label style="display:block;font-size:14px"><input type="radio" name="d3eq" value="${i}"> ${t}</label>`).join('');
      $('#d3ask').textContent = 'Değer: (elemanı seçince sorulan büyüklük)';
      $('#d3unit').textContent = '';
      $('#d3val').value = '';
      $$('input[name=d3el]').forEach((r) => (r.onchange = () => { const b = answer({ el: r.value, R: 0, L: 0, C: 0, RC: 0 }); $('#d3ask').textContent = b.ask; $('#d3unit').textContent = b.unit; }));
      $('#d3no').textContent = 'Ekran #' + sc.n;
      $('#d3fb').innerHTML = sc.done ? 'Bu ekran yanıtlandı. “Yeni ekran” ile devam edin.' : 'Ekranı inceleyin; imleçlerle eğim ve zaman ölçün.';
      drawSch(); score(); void a;
    }
    function score() {
      const h = S.d3.hist; $('#d3score').textContent = `Tam doğru: ${h.filter((x) => x.okEl && x.okEq && x.okVal).length}/${h.length}`;
    }
    $('#d3go').onclick = () => {
      const sc = S.d3.sc; if (sc.done) return Lab.toast('Bu ekran yanıtlandı. “Yeni ekran” ile devam edin.');
      const re = $('input[name=d3el]:checked'), rq = $('input[name=d3eq]:checked'), v = Lab.parse($('#d3val').value);
      if (!re || !rq) return Lab.toast('Eleman ve denklem seçin.');
      if (!isFinite(v)) return Lab.toast('Değeri sayı olarak girin.');
      const a = answer(sc), okEl = re.value === sc.el, okEq = +rq.value === EQOF[sc.el], okVal = okEl && Math.abs(v - a.v) <= 0.06 * a.v;
      sc.done = true; S.d3.hist.push({ n: sc.n, kind: sc.kind, el: sc.el, gEl: re.value, okEl, okEq, okVal, v, ref: a.v, unit: a.unit });
      const nm = ELS.find((x) => x[0] === sc.el)[1];
      const why = {
        Ltri: 'Akım üçgen, gerilim (hafif eğik) kare: v = L di/dt. L = V<sub>kare</sub> / (4 I<sub>p</sub> f); eğiklik bobinin iç direncinden.',
        Ctri: 'Gerilim üçgen, akım kare: i = C dv/dt. C = I<sub>kare</sub> / (4 V<sub>p</sub> f).',
        Lsin: 'Gerilim akımdan 90° önde (bobin). L = V<sub>m</sub> / (ω I<sub>m</sub>).',
        Csin: 'Akım gerilimden 90° önde (kapasitör). C = I<sub>m</sub> / (ω V<sub>m</sub>).',
        Rsin: 'Akım ve gerilim aynı fazda: R = V<sub>m</sub>/I<sub>m</sub>.',
        INT: 'Kare giriş → üçgen çıkış, giriş pozitifken çıkış azalıyor: integral alıcı. RC = V<sub>m</sub>(T/2) / ΔV<sub>o,pp</sub>.',
        DIFF: 'Üçgen giriş → kare çıkış, eğim pozitifken çıkış negatif: türev alıcı. RC = |V<sub>o</sub>| / (4 V<sub>p</sub> f).',
      }[sc.kind];
      $('#d3fb').innerHTML = `${okEl ? '✔' : '✘'} Eleman · ${okEq ? '✔' : '✘'} Denklem · ${okVal ? '✔' : '✘'} Değer<br>Doğrusu: <b>${nm}</b>, ${EQS[EQOF[sc.el]]}, ${a.ask} <b>${num(a.v, a.v < 1 ? 3 : a.v < 100 ? 2 : 0)} ${a.unit}</b>. ${why}`;
      save(); score(); progress();
    };
    $('#d3next').onclick = () => gen();
    if (!S.d3.sc) gen(); else { setupUI(); autoScale(); }
    self.scope = scope;
    return self;
  })();

  const d3full = () => S.d3.hist.filter((h) => h.okEl && h.okEq).length;
  steps('d3', [
    { t: '<b>İMLEÇ</b>\'i açıp bir yarım periyodu (Δt) ölçün; düğmelerle ölçekleri ayarlayın.', test: () => S.d3.curUsed },
    { t: '<b>3 ekranda</b> elemanı ve denklemi doğru tanıyın.', test: () => d3full() >= 3 },
    { t: 'En az <b>2 ekranda</b> değeri de (±%6) doğru hesaplayın.', test: () => S.d3.hist.filter((h) => h.okVal).length >= 2 },
    { t: 'Bir <b>integral alıcı</b> ekranını doğru tanıyın (ısınma: bir sonraki bölümün konusu).', test: () => S.d3.hist.some((h) => h.el === 'INT' && h.okEl && h.okEq) },
    { t: 'Toplam en az <b>8 ekran</b> çözün, son 8\'in en az 6\'sında eleman+denklem doğru olsun.', test: () => { const h = S.d3.hist.slice(-8); return h.length >= 8 && h.filter((x) => x.okEl && x.okEq).length >= 6; } },
  ]);
  mcq('d3', '#d3Q', { id: 'd3q1', q: 'Sinüzoidal sürekli durumda bir kapasitörde akım ile gerilim arasındaki faz ilişkisi nedir?', opts: ['Aynı fazda', 'Akım gerilimden 90° önde', 'Akım gerilimden 90° geride', '180° zıt'], correct: 1, explain: 'i = C dv/dt: sinüsün türevi kosinüs, çeyrek periyot önde (Örnek 2.10).', hint: 'sin\'in türevi nedir?' });
  numq('d3', '#d3Q', { id: 'd3q2', q: 'Ekranda üçgen akım (tepe 5 mA, f = 1 kHz) ve ±0,94 V kare gerilim görülüyor. L kaç mH\'dir?', answer: 47, tol: 2, unit: 'mH', explain: 'di/dt = 4 I<sub>p</sub> f = 20 A/s → L = 0,94 / 20 = 47 mH.', hint: 'Üçgenin eğimi: 2I<sub>p</sub> değişim yarım periyotta.' });
  numq('d3', '#d3Q', { id: 'd3q3', q: 'İntegral alıcı: R = 10 kΩ, C = 0,1 µF, girişe t = 0\'da 1 V DC uygulanıyor, v<sub>o</sub>(0) = 0. t = 2 ms\'de v<sub>o</sub> kaç volttur?', answer: -2, tol: 1, unit: 'V', explain: 'v<sub>o</sub> = −(1/RC)·V·t = −(1/1 ms)(1 V)(2 ms) = −2 V. Rampa eksi yönde.', hint: 'RC = 1 ms; eviren yapı.' });
  mcq('d3', '#d3Q', { id: 'd3q4', q: 'Bobinde ani değişemeyen büyüklük hangisidir?', opts: ['Gerilim', 'Akım', 'Her ikisi', 'Hiçbiri'], correct: 1, explain: 'Akım ani değişseydi di/dt → ∞, v → ∞ olurdu. Bu yüzden bobin akımını aniden kesmek kıvılcım yaratır.', hint: 'v = L di/dt' });
  mcq('d3', '#d3Q', { id: 'd3q5', q: 'Op-amp integral alıcıda geri besleme yolunda hangi eleman bulunur?', opts: ['Direnç', 'Kapasitör', 'Bobin', 'Diyot'], correct: 1, explain: 'Girişte R, geri beslemede C: i = v<sub>g</sub>/R kapasitörü yükler, v<sub>o</sub> = −(1/RC)∫v<sub>g</sub>dt.', hint: 'Akımı biriktiren eleman hangisi?' });

  /* ================= GÖREV 4 · SÜRELİ DENEME SINAVI ================= */
  const EXDUR = 40 * 60;
  const kO = (r) => ohm(r);
  const GENS = [
    () => { const A = pick([5e4, 1e5, 2e5]), V = pick([12, 15]), d = pick([20, 50, 60, 80, -40, -200, 300, 1000]); return { q: `A = ${num(A / 1e3, 0)}×10³, besleme ±${V} V, v<sub>p</sub> − v<sub>n</sub> = ${d} µV. v<sub>o</sub> kaç V?`, a: clamp(A * d * 1e-6, -V, V), u: 'V' }; },
    () => { const A = pick([5e4, 1e5, 2e5]), V = pick([10, 12, 15]); return { q: `A = ${num(A / 1e3, 0)}×10³, besleme ±${V} V. Doğrusal bölgenin sınırı |v<sub>p</sub> − v<sub>n</sub>| kaç µV?`, a: (V / A) * 1e6, u: 'µV' }; },
    () => { const Rs = pick([1e3, 2e3, 4.7e3, 1e4]), Rf = pick([1e4, 2.2e4, 4.7e4, 1e5]), vg = rnd(-1.5, 1.5, 2) || 0.5; return { q: `Eviren yükselteç: R<sub>s</sub> = ${kO(Rs)}, R<sub>f</sub> = ${kO(Rf)}, v<sub>g</sub> = ${num(vg, 2)} V, ±15 V. v<sub>o</sub> kaç V?`, a: clamp((-Rf / Rs) * vg, -15, 15), u: 'V' }; },
    () => { const Rs = pick([1e3, 2.2e3, 4.7e3, 1e4]), Rf = pick([1e4, 2.2e4, 3.3e4, 4.7e4]), vg = rnd(0.1, 1.2, 2); return { q: `Evirmeyen yükselteç: R<sub>s</sub> = ${kO(Rs)}, R<sub>f</sub> = ${kO(Rf)}, v<sub>g</sub> = ${num(vg, 2)} V, ±15 V. v<sub>o</sub> kaç V?`, a: clamp((1 + Rf / Rs) * vg, -15, 15), u: 'V' }; },
    () => { const Rf = pick([2e4, 4.7e4, 1e5]), Ra = pick([1e4, 2e4]), Rb = pick([1e4, 4.7e4, 5e4]), va = rnd(-1, 1, 1) || 0.3, vb = rnd(-1, 1, 1) || -0.4; return { q: `Toplayan: R<sub>f</sub> = ${kO(Rf)}, R<sub>a</sub> = ${kO(Ra)}, R<sub>b</sub> = ${kO(Rb)}, v<sub>a</sub> = ${num(va, 1)} V, v<sub>b</sub> = ${num(vb, 1)} V, ±15 V. v<sub>o</sub> kaç V?`, a: clamp(-Rf * (va / Ra + vb / Rb), -15, 15), u: 'V', abs: 0.02 }; },
    () => { const R1 = pick([1e3, 5e3, 1e4]), k = pick([2, 5, 10, 20]), va = rnd(0.5, 2, 2), vb = +(va + rnd(-0.4, 0.4, 2)).toFixed(2); return { q: `Fark yükselteci, R<sub>1</sub> = R<sub>3</sub> = ${kO(R1)}, R<sub>2</sub> = R<sub>4</sub> = ${kO(k * R1)}; v<sub>a</sub> = ${num(va, 2)} V (eviren tarafı), v<sub>b</sub> = ${num(vb, 2)} V. v<sub>o</sub> kaç V?`, a: clamp(k * (vb - va), -15, 15), u: 'V', abs: 0.02 }; },
    () => { const Rs = pick([1e3, 2e3, 5e3]), Rf = pick([2e4, 5e4, 1e5]), V = pick([12, 15]); return { q: `Eviren yükselteç, R<sub>s</sub> = ${kO(Rs)}, R<sub>f</sub> = ${kO(Rf)}, ±${V} V. Doyuma girmeden uygulanabilecek en büyük |v<sub>g</sub>| kaç V?`, a: (V * Rs) / Rf, u: 'V' }; },
    () => { const G = pick([1, 2]) * 1e6, A = pick([10, 20, 50, 100, 200]); return { q: `GBW = ${num(G / 1e6, 0)} MHz olan op-ampla kazancı ${A} olan bir katın bant genişliği kaç kHz?`, a: G / A / 1e3, u: 'kHz' }; },
    () => { const SR = pick([0.5, 1, 13]), Vm = pick([2, 5, 10]); return { q: `SR = ${num(SR, 1)} V/µs, çıkış tepe değeri V<sub>m</sub> = ${Vm} V. Bozulmasız sinüs için en yüksek frekans kaç kHz?`, a: (SR * 1e6) / (2 * Math.PI * Vm) / 1e3, u: 'kHz' }; },
    () => { const Rs = 1e4, Rf = pick([2e4, 5e4, 1e5]), RL = pick([1e3, 2e3, 5e3]), vg = pick([-1, -0.5, 0.5, 1]); const vo = (-Rf / Rs) * vg; return { q: `Örnek 1.11 benzeri: R<sub>s</sub> = 10 kΩ, R<sub>f</sub> = ${kO(Rf)}, R<sub>L</sub> = ${kO(RL)}, v<sub>g</sub> = ${num(vg, 1)} V (ideal). Op-amp çıkış ucu akımının büyüklüğü |i<sub>o</sub>| kaç mA?`, a: (Math.abs(vo) / RL + Math.abs(vo) / Rf) * 1e3, u: 'mA' }; },
    () => { const L = pick([50, 100, 200, 500]), I = pick([1, 2, 3, 5]), t = pick([2, 4, 5, 10]); return { q: `L = ${L} mH bobinin akımı ${t} ms içinde 0’dan ${I} A’e doğrusal artıyor. Bobin gerilimi kaç V?`, a: (L * 1e-3 * I) / (t * 1e-3), u: 'V' }; },
    () => { const L = pick([20, 50, 100, 200]), I = rnd(0.5, 4, 1); return { q: `L = ${L} mH bobinden ${num(I, 1)} A akım geçiyor. Depolanan enerji kaç mJ?`, a: 0.5 * L * I * I, u: 'mJ' }; },
    () => { const C = pick([1, 2, 4.7, 10]), V = pick([5, 6, 10, 12]), t = pick([1, 2, 3, 5]); return { q: `C = ${num(C, 1)} µF kapasitörün gerilimi ${t} ms’de 0’dan ${V} V’a doğrusal artıyor. Akım kaç mA?`, a: (C * V) / t, u: 'mA' }; },
    () => { const C = pick([100, 220, 330, 470]), V = pick([9, 12, 18, 24]); return { q: `C = ${C} µF kapasitör ${V} V’a yüklü. Depolanan enerji kaç mJ?`, a: 0.5 * C * 1e-6 * V * V * 1e3, u: 'mJ' }; },
    () => { const a = pick([2, 3, 4, 6]), b = pick([3, 6, 12]), c = pick([4, 12]); return { q: `${a} µF, ${b} µF ve ${c} µF kapasitörler <b>seri</b> bağlı. Eşdeğer kapasite kaç µF?`, a: 1 / (1 / a + 1 / b + 1 / c), u: 'µF' }; },
    () => { const a = pick([10, 20, 30, 60]), b = pick([15, 30, 60]), c = pick([20, 40]); return { q: `${a} mH, ${b} mH ve ${c} mH bobinler <b>paralel</b> bağlı (bağlaşım yok). Eşdeğer endüktans kaç mH?`, a: 1 / (1 / a + 1 / b + 1 / c), u: 'mH' }; },
    () => { const I = pick([1, 2, 5]), C = pick([1, 2, 10]), t = pick([2, 5, 10]); return { q: `Başlangıçta boş C = ${C} µF kapasitör ${I} mA sabit akımla ${t} ms boyunca dolduruluyor. Son gerilim kaç V?`, a: (I * 1e-3 * t * 1e-3) / (C * 1e-6), u: 'V' }; },
    () => { const L = pick([0.05, 0.1, 0.2]), Im = pick([1, 2, 3]), w = pick([100, 500, 1000]); return { q: `L = ${num(L, 2)} H bobin akımı i(t) = ${Im} sin(${w}t) A. Gerilimin tepe değeri kaç V?`, a: w * L * Im, u: 'V' }; },
    () => { const L1 = pick([4, 9, 16, 25]), L2 = pick([4, 9, 16, 36]), k = pick([0.25, 0.5, 0.8, 0.9]); return { q: `L<sub>1</sub> = ${L1} mH, L<sub>2</sub> = ${L2} mH, bağlaşım katsayısı k = ${num(k, 2)}. Karşılıklı endüktans M kaç mH?`, a: k * Math.sqrt(L1 * L2), u: 'mH' }; },
    () => { const R = pick([1e4, 2e4, 1e5]), C = pick([0.1, 0.47, 1]), V = pick([0.5, 1, 2]), t = pick([1, 2, 5]); const RC = R * C * 1e-6; return { q: `İntegral alıcı: R = ${kO(R)}, C = ${num(C, 2)} µF, v<sub>o</sub>(0) = 0, girişe ${num(V, 1)} V DC uygulanıyor. t = ${t} ms’de v<sub>o</sub> kaç V? (±15 V)`, a: clamp((-V * t * 1e-3) / RC, -15, 15), u: 'V', abs: 0.01 }; },
  ];
  const D4 = (() => {
    const self = {};
    const box = $('#exBox');
    function render() {
      const ex = S.exam;
      if (!ex) { box.innerHTML = '<p class="lead" style="margin:0">Henüz başlatılmış bir sınav yok.</p>'; return; }
      box.innerHTML = `<h3 style="margin-top:0">Deneme #${ex.no} ${ex.done ? `· <span class="badge ${ex.score >= 60 ? 'ok' : 'bad'}">Puan ${ex.score}/100</span>` : ''}</h3>` +
        ex.qs.map((q, i) => {
          const r = ex.res ? ex.res[i] : null;
          return `<div class="exq ${r == null ? '' : r ? 'ok' : 'bad'}"><b>${i + 1})</b> ${q.q}<div class="row" style="margin-top:4px"><input type="text" size="10" data-i="${i}" value="${(ex.resp[i] || '').replace(/"/g, '')}" ${ex.done ? 'disabled' : ''}> <span>${q.u}</span>${ex.done ? ` <span style="font-size:13px">${r ? '✔' : '✘ doğrusu ' + num(q.a, Math.abs(q.a) >= 100 ? 1 : 3)}</span>` : ''}</div></div>`;
        }).join('');
      $$('#exBox input').forEach((inp) => inp.addEventListener('input', () => { ex.resp[+inp.dataset.i] = inp.value; save(); }));
    }
    function hist() {
      $('#exHist tbody').innerHTML = S.exams.map((h, i) => `<tr><td>${i + 1}</td><td class="l">${h.date}</td><td>${h.score}</td><td>${Math.floor(h.used / 60)}:${String(h.used % 60).padStart(2, '0')}</td></tr>`).join('') || '<tr><td colspan="4" class="l">—</td></tr>';
    }
    function start() {
      if (S.exam && !S.exam.done && !confirm('Süren sınav iptal edilip yenisi başlatılsın mı?')) return;
      const qs = GENS.map((f) => f()).map((q) => Object.assign(q, { a: +q.a.toPrecision(6) }));
      qs.sort(() => Math.random() - 0.5);
      S.exam = { no: S.exams.length + 1, qs, resp: [], start: Date.now(), done: false };
      save(); render(); Lab.toast('Sınav başladı: 20 soru, 40 dakika. Başarılar!');
    }
    function finish(auto) {
      const ex = S.exam; if (!ex || ex.done) return;
      if (!auto && !confirm('Sınavı bitirip puanlamak istiyor musunuz?')) return;
      ex.res = ex.qs.map((q, i) => { const v = Lab.parse(ex.resp[i] || ''); return isFinite(v) && Math.abs(v - q.a) <= Math.abs(q.a) * 0.02 + (q.abs || 0.001); });
      ex.score = 5 * ex.res.filter(Boolean).length; ex.done = true;
      const used = Math.min(EXDUR, Math.round((Date.now() - ex.start) / 1000));
      S.exams.push({ date: new Date().toLocaleString('tr-TR'), score: ex.score, used });
      save(); render(); hist(); progress();
      Lab.toast((auto ? 'Süre doldu! ' : '') + 'Puanınız: ' + ex.score + '/100', 5000);
    }
    $('#exStart').onclick = start;
    $('#exFinish').onclick = () => finish(false);
    self.tick = () => {
      const ex = S.exam, el = $('#exTimer');
      if (!ex || ex.done) { el.textContent = '40:00'; el.classList.remove('low'); return; }
      const left = Math.max(0, EXDUR - Math.floor((Date.now() - ex.start) / 1000));
      el.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
      el.classList.toggle('low', left < 300);
      if (left <= 0) finish(true);
    };
    render(); hist();
    return self;
  })();
  steps('d4', [
    { t: 'Bir deneme sınavı <b>başlatın</b>.', test: () => !!S.exam },
    { t: 'En az bir sınavı <b>bitirip puanlatın</b>; yanlışlarınızın doğru değerlerini inceleyin.', test: () => S.exams.length >= 1 },
    { t: 'Bir denemede en az <b>60</b> puan alın.', test: () => S.exams.some((h) => h.score >= 60) },
    { t: 'Bir denemede en az <b>80</b> puanı <b>30 dakikadan kısa</b> sürede alın.', test: () => S.exams.some((h) => h.score >= 80 && h.used < 1800) },
  ]);

  /* ================= RAPOR ================= */
  function buildReport() {
    const sec = { onhaz: 'Ön Hazırlık', d1: 'Görev 1', d2: 'Görev 2', d3: 'Görev 3', d4: 'Görev 4' };
    let tot = 0, ok = 0;
    const qrows = Object.entries(qids).map(([pg, ids]) => ids.map((id) => {
      const a = S.answers[id]; tot++; if (a && a.ok) ok++;
      const q = $(`[data-qid="${id}"] .qt`); const qt = q ? q.innerHTML : id;
      return `<tr><td class="l">${sec[pg]}</td><td class="l">${qt}</td><td class="l">${a ? a.a : '—'}</td><td>${a ? (a.ok ? '✔' : '✘') : '—'}</td></tr>`;
    }).join('')).join('');
    let sTot = 0, sOk = 0;
    Object.keys(stepDefs).forEach((k) => stepDefs[k].forEach((_, i) => { sTot++; if (S.steps[k + '_' + i]) sOk++; }));
    const fn = (k) => (FAULTS.find((x) => x[0] === k) || ['', '—'])[1];
    const h1 = S.d1.hist.map((h) => `<tr><td>#${h.n}</td><td class="l">${fn(h.f)}</td><td class="l">${fn(h.g)}</td><td>${h.nm}</td><td>${h.ok ? '✔' : '✘'}</td></tr>`).join('');
    const h3 = S.d3.hist.map((h) => `<tr><td>#${h.n}</td><td class="l">${(ELS.find((x) => x[0] === h.el) || [])[1]}</td><td class="l">${(ELS.find((x) => x[0] === h.gEl) || [])[1]}</td><td>${num(h.v, 3)} / ${num(h.ref, 3)} ${h.unit}</td><td>${h.okEl && h.okEq ? '✔' : '✘'} ${h.okVal ? '✔' : '✘'}</td></tr>`).join('');
    const best = S.exams.reduce((m, h) => Math.max(m, h.score), 0);
    const img = (c) => { try { return `<img src="${c.toDataURL()}" style="width:48%;border:1px solid #ccc">`; } catch (e) { return ''; } };
    const html = `
      <h2 style="margin:0">Devre Kuramı I · Sanal Laboratuvar · Hafta 8 Raporu</h2>
      <p><b>Konu:</b> Ara sınav haftası — arıza bulma, sensör arabirimi tasarımı, dalga biçimi tanıma, süreli deneme sınavı (Bölüm 1–2)</p>
      <table class="data" style="width:auto"><tr><th>Ad Soyad</th><td class="l">${S.st.name || ''}</td><th>No</th><td class="l">${S.st.no || ''}</td><th>Grup</th><td class="l">${S.st.group || ''}</td><th>Tarih</th><td class="l">${S.st.date || ''}</td></tr></table>
      <h3>Özet</h3>
      <p>Föy adımı: <b>${sOk}/${sTot}</b> · Doğru yanıt: <b>${ok}/${tot}</b> · Arıza teşhisi: <b>${d1ok()}/${S.d1.hist.length}</b> · Dalga biçimi (eleman+denklem): <b>${d3full()}/${S.d3.hist.length}</b> · Uygun tasarım: <b>${S.d2.rows.filter((r) => r.pass).length}</b> · En iyi deneme sınavı: <b>${best}/100</b> (${S.exams.length} deneme)</p>
      <p>Uygulama puanı: <b>${Math.round((40 * sOk) / sTot + (30 * ok) / tot + 0.3 * best)}/100</b></p>
      <h3>Yanıtlar</h3>
      <table class="data"><thead><tr><th>Bölüm</th><th>Soru</th><th>Yanıt</th><th></th></tr></thead><tbody>${qrows}</tbody></table>
      <h3>Görev 1 · Arıza teşhisleri</h3>
      <table class="data"><thead><tr><th>Kart</th><th>Gerçek arıza</th><th>Teşhis</th><th>Ölçülen nokta</th><th></th></tr></thead><tbody>${h1}</tbody></table>
      <h3>Görev 2 · Değerlendirilen tasarımlar</h3>
      <table class="data"><thead>${$('#d2tab thead').innerHTML}</thead><tbody>${$('#d2tab tbody').innerHTML}</tbody></table>
      <h3>Görev 3 · Dalga biçimi yanıtları</h3>
      <table class="data"><thead><tr><th>Ekran</th><th>Gerçek</th><th>Yanıt</th><th>Değer (siz / doğru)</th><th>Tanıma · Değer</th></tr></thead><tbody>${h3}</tbody></table>
      <h3>Görev 4 · Deneme sınavları</h3>
      <table class="data"><thead><tr><th>#</th><th>Tarih</th><th>Puan</th><th>Süre</th></tr></thead><tbody>${$('#exHist tbody').innerHTML}</tbody></table>
      <h3>Grafikler</h3>
      <div>${img(D2.plotCanvas)} ${img($('#scope'))}</div>
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
    if (e.key === 'r' || e.key === 'R') { if (S.page === 'd1') D1.rec(); if (S.page === 'd2') D2.evaluate(); }
  });

  let lastT = 0;
  function loop(now) {
    if (S.page === 'd1') { D1.update(); evalSteps('d1'); }
    if (S.page === 'd2') { D2.update(); evalSteps('d2'); }
    if (S.page === 'd3') { D3.update(); evalSteps('d3'); }
    if (now - lastT > 250) { lastT = now; D4.tick(); if (S.page === 'd4') evalSteps('d4'); }
    requestAnimationFrame(loop);
  }
  ['d1', 'd2', 'd3', 'd4'].forEach(evalSteps);
  go(S.page); progress(); requestAnimationFrame(loop);
})();

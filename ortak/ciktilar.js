/* Föy katmanı: deney künyesi, DÖÇ–PÇ matrisi, tartışma alanları, PÇ başarı raporu.
   Hafta sayfası, bu dosyadan ÖNCE window.CIKTI = {...} tanımlar (bkz. hafta01.html). */
(function () {
  'use strict';
  const C = window.CIKTI; if (!C) return;
  const MC = [
    ['Mühendislik Bilgisi', 'Matematik, fen bilimleri, temel mühendislik, bilgisayarla hesaplama ve disipline özgü bilgi; bunları karmaşık mühendislik problemlerinde kullanabilme.'],
    ['Problem Analizi', 'Karmaşık mühendislik problemlerini temel bilim, matematik ve mühendislik bilgisiyle (BM Sürdürülebilir Kalkınma Amaçlarını gözeterek) tanımlama, formüle etme ve analiz.'],
    ['Mühendislik Tasarımı', 'Karmaşık problemlere gerçekçi kısıt ve koşulları gözeterek yaratıcı çözümler; sistem, süreç, cihaz veya ürün tasarlama.'],
    ['Teknik ve Araçların Kullanımı', 'Tahmin ve modelleme dahil uygun teknik, kaynak ve modern mühendislik/bilişim araçlarını sınırlamalarının farkında olarak seçme ve kullanma.'],
    ['Araştırma ve İnceleme', 'Literatür araştırması, deney tasarlama, deney yapma, veri toplama, sonuçları analiz etme ve yorumlama.'],
    ['Mühendislik Uygulamalarının Küresel Etkisi', 'Topluma, sağlık ve güvenliğe, ekonomiye, sürdürülebilirlik ve çevreye etkiler; hukuksal sonuçlar konusunda farkındalık.'],
    ['Mühendislik Etiği', 'Meslek ilkelerine uygun davranma, etik sorumluluk; ayrımcılık yapmadan, tarafsız ve kapsayıcı olma.'],
    ['Bireysel ve Takım Çalışması', 'Bireysel olarak ve disiplin içi/çok disiplinli takımlarda etkin çalışabilme.'],
    ['Sözlü ve Yazılı İletişim', 'Hedef kitleyi dikkate alarak teknik konularda sözlü ve yazılı etkin iletişim.'],
    ['Proje Yönetimi', 'Proje yönetimi ve ekonomik yapılabilirlik; girişimcilik ve yenilikçilik farkındalığı.'],
    ['Yaşam Boyu Öğrenme', 'Bağımsız ve sürekli öğrenme, yeni teknolojilere uyum, teknolojik değişimlerle ilgili sorgulayıcı düşünme.'],
  ];
  const $ = (s, r = document) => r.querySelector(s);
  const TK = 'devrelab:cikti:' + C.key;
  let T = {}; try { T = JSON.parse(localStorage.getItem(TK)) || {}; } catch (e) {}
  const saveT = () => { try { localStorage.setItem(TK, JSON.stringify(T)); } catch (e) {} };
  const badge = (n) => `<span class="pill" title="PÇ-${n} ${MC[n - 1][0]}: ${MC[n - 1][1]}" style="background:#e6f0fb;color:#0b5cad;font-weight:700">PÇ-${n}</span>`;
  const esc = (s) => String(s || '').replace(/</g, '&lt;');

  /* --- Giriş: DÖÇ–PÇ matrisi --- */
  const gir = $('#giris');
  if (gir && C.doc) {
    const d = document.createElement('div'); d.className = 'card';
    d.innerHTML = `<h3 style="margin-top:0">Ders öğrenme çıktıları ve program çıktılarına katkı matrisi</h3>
      <p style="font-size:13px;color:var(--muted);margin:0 0 8px">${esc(C.ders)} · Hafta ${C.hafta}. Her deney aşağıdaki ders öğrenme çıktılarına (DÖÇ) ve program çıktılarına (PÇ) katkı sağlar; başarı düzeyi raporda PÇ bazında ölçülür.</p>
      <div style="overflow-x:auto"><table class="data"><thead><tr><th>DÖÇ</th><th style="text-align:left">Bu haftanın sonunda öğrenci…</th>${MC.map((_, i) => `<th title="${MC[i][0]}">${i + 1}</th>`).join('')}</tr></thead><tbody>
      ${C.doc.map((o) => `<tr><td>${o.id}</td><td class="l">${o.t}</td>${MC.map((_, i) => `<td style="text-align:center">${o.mc.includes(i + 1) ? '●' : ''}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div>
      <details style="margin-top:8px;font-size:13px"><summary>Program çıktıları (PÇ-1 … PÇ-11)</summary><ol style="line-height:1.6">${MC.map((m) => `<li><b>${m[0]}:</b> ${m[1]}</li>`).join('')}</ol></details>`;
    gir.appendChild(d);
  }

  /* --- Her deney: künye (üstte) + veri/analiz/tartışma (altta) --- */
  Object.entries(C.deneyler || {}).forEach(([pid, k], idx) => {
    const sec = document.getElementById(pid); if (!sec) return;
    const kun = document.createElement('div'); kun.className = 'card'; kun.style.borderLeft = '5px solid #0b5cad';
    kun.innerHTML = `<div class="row" style="justify-content:space-between"><b>Deney künyesi</b><span>${k.mc.map(badge).join('')}</span></div>
      <table class="data" style="margin-top:8px">
        <tr><td class="l" style="width:170px"><b>1. Amaç</b></td><td class="l">${k.amac}</td></tr>
        <tr><td class="l"><b>2. İlgili DÖÇ</b></td><td class="l">${(k.doc || []).map((id) => { const o = (C.doc || []).find((x) => x.id === id); return `<b>${id}</b> ${o ? o.t : ''}`; }).join('<br>')}</td></tr>
        <tr><td class="l"><b>3. Ön hazırlık</b></td><td class="l">${k.onhaz || 'Ön Bilgi ve Ön Hazırlık bölümleri; ilgili ders notu kısımları.'}</td></tr>
        <tr><td class="l"><b>4. Araç ve gereçler</b></td><td class="l">${k.gerec}</td></tr>
        <tr><td class="l"><b>5. Güvenlik ve risk</b> ${badge(6)}</td><td class="l">${k.guvenlik}</td></tr>
        <tr><td class="l"><b>6. Deney adımları</b></td><td class="l">Aşağıdaki föy; adımlar doğru uygulandıkça otomatik işaretlenir.</td></tr>
        <tr><td class="l"><b>7. Veri ve analiz</b></td><td class="l">${k.veri || 'Ölçüm tablosu, grafik ve sayısal sorular.'}</td></tr>
        <tr><td class="l"><b>8. Değerlendirme</b></td><td class="l">Föy adımları %40 · sorular %40 · tartışma (yazılı iletişim, ${badge(9)}) %20</td></tr>
      </table>`;
    const h = sec.querySelector('.lead'); (h || sec.firstElementChild).after(kun);
    const tar = document.createElement('div'); tar.className = 'card';
    tar.innerHTML = `<h3 style="margin-top:0">9. Sonuç ve tartışma ${badge(9)} ${badge(11)}</h3>
      <p style="font-size:13px;color:var(--muted);margin:0 0 6px">${k.tartisma || 'Ölçümlerinizi teoriyle karşılaştırın; farkların kaynaklarını (eleman toleransı, ölçü aleti, model varsayımları) tartışın; gerçek bir uygulamada nasıl kullanılacağını yazın.'}</p>
      <textarea rows="4" style="width:100%;font:inherit;padding:8px;border:1px solid var(--line);border-radius:6px" placeholder="En az 3 cümle..."></textarea>
      <div style="font-size:12px;color:var(--muted)" class="wc"></div>`;
    sec.appendChild(tar);
    const ta = tar.querySelector('textarea'), wc = tar.querySelector('.wc');
    const upd = () => { const n = (ta.value.match(/[^.!?]+[.!?]/g) || []).length; wc.textContent = n + ' cümle' + (n >= 3 ? ' ✓' : ''); };
    ta.value = T[pid] || ''; upd();
    ta.addEventListener('input', () => { T[pid] = ta.value; saveT(); upd(); });
  });

  /* --- Rapor: PÇ başarı tablosu (rapor her yenilendiğinde eklenir) --- */
  function mcTable() {
    let S = {}; try { S = JSON.parse(localStorage.getItem('devrelab:' + C.key)) || {}; } catch (e) {}
    const steps = S.steps || {}, ans = S.answers || {};
    const acc = MC.map(() => ({ n: 0, ok: 0 }));
    const add = (list, ok) => list.forEach((m) => { acc[m - 1].n++; if (ok) acc[m - 1].ok++; });
    // sorular: sayfasına göre
    document.querySelectorAll('section.page').forEach((sec) => {
      const k = (C.deneyler || {})[sec.id];
      const qm = sec.id === 'onhaz' ? [1] : k ? k.mc.filter((m) => m <= 3) : null;
      if (!qm || !qm.length) return;
      sec.querySelectorAll('[data-qid]').forEach((q) => add(qm, ans[q.dataset.qid] && ans[q.dataset.qid].ok));
      if (k) sec.querySelectorAll('ol.steps li').forEach((_, i) => add(k.mc.filter((m) => m >= 4 && m !== 9), steps[sec.id + '_' + i]));
      if (k) add([9], ((T[sec.id] || '').match(/[^.!?]+[.!?]/g) || []).length >= 3);
    });
    const rows = acc.map((a, i) => a.n ? `<tr><td>PÇ-${i + 1}</td><td class="l">${MC[i][0]}</td><td>${a.ok}/${a.n}</td><td>%${Math.round((100 * a.ok) / a.n)}</td><td class="l">${a.ok / a.n >= 0.7 ? '✔ Sağlandı' : a.ok / a.n >= 0.5 ? '~ Kısmen' : '✘ Geliştirilmeli'}</td></tr>` : '').join('');
    const tart = Object.entries(C.deneyler || {}).map(([pid]) => T[pid] ? `<p><b>${(document.querySelector(`#${pid} h2`) || {}).textContent || pid}:</b> ${esc(T[pid])}</p>` : '').join('');
    return `<div class="ciktiRep"><h3>Program çıktıları başarı düzeyi</h3>
      <p style="font-size:12px">Başarı ölçütü: ≥ %70 sağlandı, %50–69 kısmen. Ölçme araçları: ön hazırlık ve deney soruları (PÇ-1–3), föy adımları (PÇ-4, 5, 6, 8), tartışma metni (PÇ-9).</p>
      <table class="data"><thead><tr><th>Çıktı</th><th>Tanım</th><th>Kanıt</th><th>Başarı</th><th>Durum</th></tr></thead><tbody>${rows}</tbody></table>
      <h3>Deney tartışmaları</h3>${tart || '<p>—</p>'}</div>`;
  }
  ['#reportPreview', '#report'].forEach((sel) => {
    const el = $(sel); if (!el) return;
    new MutationObserver(() => { if (!el.querySelector('.ciktiRep')) el.insertAdjacentHTML('beforeend', mcTable()); }).observe(el, { childList: true });
  });
})();

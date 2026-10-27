/* Lab-sheet layer: experiment summary, CLO–PO matrix, discussion fields, PO achievement report.
   The week page defines window.CIKTI = {...} BEFORE this file (see week01.html). */
(function () {
  'use strict';
  const C = window.CIKTI; if (!C) return;
  const MC = [
    ['Engineering Knowledge', 'Knowledge of mathematics, natural sciences, basic engineering, computing and discipline-specific topics; ability to apply this knowledge to complex engineering problems.'],
    ['Problem Analysis', 'Ability to identify, formulate and analyse complex engineering problems using basic science, mathematics and engineering knowledge (considering the UN Sustainable Development Goals).'],
    ['Engineering Design', 'Ability to design creative solutions to complex problems — systems, processes, devices or products — under realistic constraints and conditions.'],
    ['Use of Techniques and Tools', 'Ability to select and use appropriate techniques, resources and modern engineering/IT tools, including estimation and modelling, while aware of their limitations.'],
    ['Research and Investigation', 'Ability to carry out literature research, design and conduct experiments, collect data, and analyse and interpret results.'],
    ['Global Impact of Engineering Practice', 'Awareness of the effects on society, health and safety, the economy, sustainability and the environment; awareness of legal consequences.'],
    ['Engineering Ethics', 'Acting in line with professional principles and ethical responsibility; being impartial, non-discriminatory and inclusive.'],
    ['Individual and Team Work', 'Ability to work effectively individually and in intra-disciplinary and multi-disciplinary teams.'],
    ['Oral and Written Communication', 'Ability to communicate effectively on technical topics, orally and in writing, considering the target audience.'],
    ['Project Management', 'Project management and economic feasibility; awareness of entrepreneurship and innovation.'],
    ['Lifelong Learning', 'Independent and continuous learning, adapting to new technologies, and critical thinking about technological change.'],
  ];
  const $ = (s, r = document) => r.querySelector(s);
  const TK = 'devrelab-en:cikti:' + C.key;
  let T = {}; try { T = JSON.parse(localStorage.getItem(TK)) || {}; } catch (e) {}
  const saveT = () => { try { localStorage.setItem(TK, JSON.stringify(T)); } catch (e) {} };
  const badge = (n) => `<span class="pill" title="PO-${n} ${MC[n - 1][0]}: ${MC[n - 1][1]}" style="background:#e6f0fb;color:#0b5cad;font-weight:700">PO-${n}</span>`;
  const esc = (s) => String(s || '').replace(/</g, '&lt;');

  /* --- Introduction: CLO–PO matrix --- */
  const gir = $('#giris');
  if (gir && C.doc) {
    const d = document.createElement('div'); d.className = 'card';
    d.innerHTML = `<h3 style="margin-top:0">Course learning outcomes and their contribution to program outcomes</h3>
      <p style="font-size:13px;color:var(--muted);margin:0 0 8px">${esc(C.ders)} · Week ${C.hafta}. Each experiment contributes to the course learning outcomes (CLO) and program outcomes (PO) below; achievement is measured per PO in the report.</p>
      <div style="overflow-x:auto"><table class="data"><thead><tr><th>CLO</th><th style="text-align:left">By the end of this week the student…</th>${MC.map((_, i) => `<th title="${MC[i][0]}">${i + 1}</th>`).join('')}</tr></thead><tbody>
      ${C.doc.map((o) => `<tr><td>${o.id}</td><td class="l">${o.t}</td>${MC.map((_, i) => `<td style="text-align:center">${o.mc.includes(i + 1) ? '●' : ''}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div>
      <details style="margin-top:8px;font-size:13px"><summary>Program outcomes (PO-1 … PO-11)</summary><ol style="line-height:1.6">${MC.map((m) => `<li><b>${m[0]}:</b> ${m[1]}</li>`).join('')}</ol></details>`;
    gir.appendChild(d);
  }

  /* --- Each experiment: summary (top) + data/analysis/discussion (bottom) --- */
  Object.entries(C.deneyler || {}).forEach(([pid, k], idx) => {
    const sec = document.getElementById(pid); if (!sec) return;
    const kun = document.createElement('div'); kun.className = 'card'; kun.style.borderLeft = '5px solid #0b5cad';
    kun.innerHTML = `<div class="row" style="justify-content:space-between"><b>Experiment summary</b><span>${k.mc.map(badge).join('')}</span></div>
      <table class="data" style="margin-top:8px">
        <tr><td class="l" style="width:170px"><b>1. Objective</b></td><td class="l">${k.amac}</td></tr>
        <tr><td class="l"><b>2. Related CLO</b></td><td class="l">${(k.doc || []).map((id) => { const o = (C.doc || []).find((x) => x.id === id); return `<b>${id}</b> ${o ? o.t : ''}`; }).join('<br>')}</td></tr>
        <tr><td class="l"><b>3. Preparation</b></td><td class="l">${k.onhaz || 'Background and Pre-lab sections; the related parts of the lecture notes.'}</td></tr>
        <tr><td class="l"><b>4. Equipment</b></td><td class="l">${k.gerec}</td></tr>
        <tr><td class="l"><b>5. Safety and risks</b> ${badge(6)}</td><td class="l">${k.guvenlik}</td></tr>
        <tr><td class="l"><b>6. Procedure</b></td><td class="l">The lab sheet below; steps are ticked automatically when done correctly.</td></tr>
        <tr><td class="l"><b>7. Data and analysis</b></td><td class="l">${k.veri || 'Measurement table, graph and numerical questions.'}</td></tr>
        <tr><td class="l"><b>8. Assessment</b></td><td class="l">Lab-sheet steps 40% · questions 40% · discussion (written communication, ${badge(9)}) 20%</td></tr>
      </table>`;
    const h = sec.querySelector('.lead'); (h || sec.firstElementChild).after(kun);
    const tar = document.createElement('div'); tar.className = 'card';
    tar.innerHTML = `<h3 style="margin-top:0">9. Results and discussion ${badge(9)} ${badge(11)}</h3>
      <p style="font-size:13px;color:var(--muted);margin:0 0 6px">${k.tartisma || 'Compare your measurements with theory; discuss the sources of the differences (component tolerance, instrument, model assumptions); describe how this would be used in a real application.'}</p>
      <textarea rows="4" style="width:100%;font:inherit;padding:8px;border:1px solid var(--line);border-radius:6px" placeholder="At least 3 sentences..."></textarea>
      <div style="font-size:12px;color:var(--muted)" class="wc"></div>`;
    sec.appendChild(tar);
    const ta = tar.querySelector('textarea'), wc = tar.querySelector('.wc');
    const upd = () => { const n = (ta.value.match(/[^.!?]+[.!?]/g) || []).length; wc.textContent = n + (n === 1 ? ' sentence' : ' sentences') + (n >= 3 ? ' ✓' : ''); };
    ta.value = T[pid] || ''; upd();
    ta.addEventListener('input', () => { T[pid] = ta.value; saveT(); upd(); });
  });

  /* --- Report: PO achievement table (added each time the report is rebuilt) --- */
  function mcTable() {
    let S = {}; try { S = JSON.parse(localStorage.getItem('devrelab-en:' + C.key)) || {}; } catch (e) {}
    const steps = S.steps || {}, ans = S.answers || {};
    const acc = MC.map(() => ({ n: 0, ok: 0 }));
    const add = (list, ok) => list.forEach((m) => { acc[m - 1].n++; if (ok) acc[m - 1].ok++; });
    // questions: by page
    document.querySelectorAll('section.page').forEach((sec) => {
      const k = (C.deneyler || {})[sec.id];
      const qm = sec.id === 'onhaz' ? [1] : k ? k.mc.filter((m) => m <= 3) : null;
      if (!qm || !qm.length) return;
      sec.querySelectorAll('[data-qid]').forEach((q) => add(qm, ans[q.dataset.qid] && ans[q.dataset.qid].ok));
      if (k) sec.querySelectorAll('ol.steps li').forEach((_, i) => add(k.mc.filter((m) => m >= 4 && m !== 9), steps[sec.id + '_' + i]));
      if (k) add([9], ((T[sec.id] || '').match(/[^.!?]+[.!?]/g) || []).length >= 3);
    });
    const rows = acc.map((a, i) => a.n ? `<tr><td>PO-${i + 1}</td><td class="l">${MC[i][0]}</td><td>${a.ok}/${a.n}</td><td>${Math.round((100 * a.ok) / a.n)}%</td><td class="l">${a.ok / a.n >= 0.7 ? '✔ Achieved' : a.ok / a.n >= 0.5 ? '~ Partly' : '✘ Needs improvement'}</td></tr>` : '').join('');
    const tart = Object.entries(C.deneyler || {}).map(([pid]) => T[pid] ? `<p><b>${(document.querySelector(`#${pid} h2`) || {}).textContent || pid}:</b> ${esc(T[pid])}</p>` : '').join('');
    return `<div class="ciktiRep"><h3>Program outcome achievement</h3>
      <p style="font-size:12px">Criterion: ≥ 70% achieved, 50–69% partly. Measures: pre-lab and experiment questions (PO-1–3), lab-sheet steps (PO-4, 5, 6, 8), discussion text (PO-9).</p>
      <table class="data"><thead><tr><th>Outcome</th><th>Description</th><th>Evidence</th><th>Achievement</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
      <h3>Experiment discussions</h3>${tart || '<p>—</p>'}</div>`;
  }
  ['#reportPreview', '#report'].forEach((sel) => {
    const el = $(sel); if (!el) return;
    new MutationObserver(() => { if (!el.querySelector('.ciktiRep')) el.insertAdjacentHTML('beforeend', mcTable()); }).observe(el, { childList: true });
  });
})();

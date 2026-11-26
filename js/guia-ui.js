// Pinta la guía práctica por pestañas. Los datos viven en guia.js.
import { REVISED, CAUSES, TESTS, TREATMENTS, ST, TIPS, PLACES, PAPERS } from './guia.js';

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const src = (list) => list.length
  ? `<p class="g-src">Fuente: ${list.map(([l, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(l)}</a>`).join('')}</p>`
  : '<span class="g-tag">Consejo general</span>';

function causeCard(c, done) {
  return `<li class="g-card"><h3>${esc(c.name)}</h3><p>${esc(c.text)}</p>
    <p class="g-test">Cómo se mira: ${esc(c.test)}.</p>${src(c.src)}
    <label class="g-check"><input type="checkbox" data-cause="${esc(c.id)}"${done[c.id] ? ' checked' : ''}> Ya me lo han mirado</label></li>`;
}
const card = (x, tag = '') => `<li class="g-card">${tag}<h3>${esc(x.name)}</h3><p>${esc(x.text)}</p>${src(x.src)}</li>`;

const TABS = [
  { id: 'causas', label: 'Causas a descartar', intro: 'Muchas veces la fibra pequeña tiene una causa que se puede tratar. Marca las que ya te han mirado y te saldrán en el informe para el médico.',
    html: () => { const done = store.get('causes', {}); return CAUSES.map((c) => causeCard(c, done)).join(''); } },
  { id: 'pruebas', label: 'Pruebas', intro: 'Qué pruebas se usan para confirmar la fibra pequeña y qué mide cada una.', html: () => TESTS.map((x) => card(x)).join('') },
  { id: 'tratamientos', label: 'Tratamientos', intro: 'Lo que se usa hoy para el dolor y en qué punto está cada cosa. La elección siempre es con tu médico.',
    html: () => TREATMENTS.map((x) => card(x, `<span class="g-tag ${x.st}">${esc(ST[x.st])}</span>`)).join('') },
  { id: 'dia', label: 'Día a día', intro: 'Pequeños cuidados que ayudan a vivir mejor con la neuropatía.', html: () => TIPS.map((x) => card(x)).join('') },
  { id: 'donde', label: 'Dónde acudir', intro: 'Hospitales de referencia y apoyos. Para ir a un centro de referencia hace falta que te derive tu médico.', html: () => PLACES.map((x) => card(x)).join('') },
  { id: 'tramites', label: 'Trámites', intro: 'Papeles que pueden ayudarte si la enfermedad te limita en el día a día o en el trabajo.', html: () => PAPERS.map((x) => card(x)).join('') },
];

function show(i, focus) {
  const tabs = [...document.querySelectorAll('#gTabs .tab')];
  tabs.forEach((t, j) => { t.setAttribute('aria-selected', j === i); t.tabIndex = j === i ? 0 : -1; });
  const panel = document.getElementById('gPanel');
  panel.setAttribute('aria-labelledby', tabs[i].id);
  panel.innerHTML = `<p class="g-intro">${esc(TABS[i].intro)}</p><ul class="g-list">${TABS[i].html()}</ul>`;
  if (focus) tabs[i].focus();
}

export function initGuia() {
  const bar = document.getElementById('gTabs');
  if (!bar) return;
  bar.innerHTML = TABS.map((t) => `<button class="tab" role="tab" id="tab-${t.id}" aria-controls="gPanel">${esc(t.label)}</button>`).join('');
  const tabs = [...bar.children];
  tabs.forEach((t, i) => { t.onclick = () => show(i); });
  bar.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(document.activeElement), n = tabs.length;
    const k = { ArrowRight: i + 1, ArrowLeft: i - 1 + n, Home: n, End: n - 1 }[e.key];
    if (i < 0 || k === undefined) return;
    e.preventDefault(); show(k % n, true);
  });
  document.getElementById('gPanel').addEventListener('change', (e) => {
    const id = e.target.dataset.cause;
    if (!id) return;
    const done = store.get('causes', {});
    if (e.target.checked) done[id] = true; else delete done[id];
    store.set('causes', done);
  });
  document.getElementById('gDate').textContent = REVISED;
  show(0);
}

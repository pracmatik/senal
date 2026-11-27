// Diario de síntomas y preparación de la visita al médico.
// Todo se guarda solo en este navegador (localStorage); nada sale del aparato.
import { CAUSES, QUESTIONS } from './guia.js';
import { cleanBody, diaryZones, bodyStats, bodyLines, kindSplit } from './zonas.js?v=17';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
};
const iso = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const nice = (s) => new Date(s + 'T12:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

const GROUPS = {
  zones: ['Pies', 'Piernas', 'Manos', 'Brazos', 'Cara', 'Tronco', 'Todo el cuerpo'],
  kinds: ['Quemazón', 'Hormigueo', 'Pinchazos', 'Descargas', 'Entumecimiento', 'Picor', 'Dolor al roce'],
  other: ['Mareo al levantarme', 'Sudor raro', 'Digestión', 'Cansancio', 'Ojos o boca secos', 'Palpitaciones'],
  triggers: ['Calor', 'Frío', 'Estrés', 'Ejercicio', 'Estar de pie', 'Roce de ropa o sábanas', 'Poco sueño', 'Comida o alcohol'],
};
export const PAIN = ['Sin dolor', 'Muy leve', 'Leve', 'Molesto', 'Molesto', 'Moderado', 'Moderado', 'Fuerte', 'Muy fuerte', 'Intenso', 'El peor que imagino'];

let diary = store.get('diary', {});

// Mapa de dolor en el cuerpo (dolor.js): se guarda dentro del mismo día del diario, en el campo body
export const getBody = (date) => cleanBody(diary[date]?.body);
export const allDiary = () => diary;
let bodyPicture = null; // dolor.js lo rellena: devuelve la foto del muñeco para el resumen
export const setBodyPicture = (fn) => { bodyPicture = fn; };
export function saveBody(date, body) {
  const clean = cleanBody(body) || [];
  const top = Math.max(0, ...clean.map((b) => b.i)), fresh = !diary[date];
  diary[date] = diary[date]
    ? { ...diary[date], body: clean }
    : { pain: top, zones: diaryZones(clean), kinds: [], other: [], triggers: [], sleep: '', note: '', body: clean };
  const ok = persist();
  render();
  if ($('#dForm').date.value === date) { if (fresh) fill(date); else $('#dSave').textContent = 'Actualizar este día'; }
  return ok;
}

export function initDiario() {
  const form = $('#dForm');
  for (const [g, opts] of Object.entries(GROUPS)) {
    $(`[data-group="${g}"]`, form).insertAdjacentHTML('beforeend', opts.map((o) =>
      `<label class="pick"><input type="checkbox" name="${g}" value="${esc(o)}"><span>${esc(o)}</span></label>`).join(''));
  }
  form.date.max = iso(); form.date.value = iso();
  form.pain.oninput = () => showPain(form.pain.value);
  form.date.onchange = () => fill(form.date.value);
  form.onsubmit = (e) => { e.preventDefault(); save(form); };
  $('#dList').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.edit) { fill(b.dataset.edit); form.scrollIntoView({ block: 'start' }); }
    if (b.dataset.del && confirm(`¿Borrar el registro del ${nice(b.dataset.del)}? No se puede deshacer.`)) { delete diary[b.dataset.del]; persist(); render(); }
  };
  $('#dExport').onclick = exportCopy;
  $('#dImport').onchange = importCopy;
  initVisit();
  fill(iso()); render();
}

function showPain(v) {
  $('#painNum').textContent = v;
  $('#painWord').textContent = PAIN[v];
  $('#dForm').style.setProperty('--pain', v / 10);
}

function fill(date) {
  const f = $('#dForm'), e = diary[date] || {};
  f.date.value = date;
  f.pain.value = e.pain ?? 3; showPain(f.pain.value);
  f.querySelectorAll('input[type=checkbox]').forEach((c) => (c.checked = (e[c.name] || []).includes(c.value)));
  f.querySelectorAll('input[name=sleep]').forEach((r) => (r.checked = r.value === (e.sleep || '')));
  f.note.value = e.note || '';
  $('#dSave').textContent = diary[date] ? 'Actualizar este día' : 'Guardar el día';
  document.dispatchEvent(new CustomEvent('diariodate', { detail: date }));
}

function save(f) {
  const pick = (n) => [...f.querySelectorAll(`input[name=${n}]:checked`)].map((c) => c.value);
  const date = f.date.value;
  if (!date || date > iso()) return msg('Elige un día que no sea futuro.');
  diary[date] = { pain: +f.pain.value, zones: pick('zones'), kinds: pick('kinds'), other: pick('other'), triggers: pick('triggers'), sleep: f.sleep.value, note: f.note.value.trim().slice(0, 300),
    ...(diary[date]?.body ? { body: diary[date].body } : {}) }; // el mapa del cuerpo se conserva
  if (!persist()) return msg('No se ha podido guardar. Puede que el navegador esté en modo privado.');
  msg(`Guardado el ${nice(date)}.`); fill(date); render();
}

const persist = () => store.set('diary', diary);
function msg(t) { const m = $('#dMsg'); m.textContent = t; clearTimeout(msg.t); msg.t = setTimeout(() => (m.textContent = ''), 5000); }

const lastDays = (n) => Object.keys(diary).filter((d) => d >= iso(new Date(Date.now() - (n - 1) * 864e5))).sort();

function stats(days) {
  const es = days.map((d) => diary[d]);
  if (!es.length) return null;
  const avg = es.reduce((s, e) => s + e.pain, 0) / es.length;
  const count = (k) => {
    const m = {};
    es.forEach((e) => (e[k] || []).forEach((v) => (m[v] = (m[v] || 0) + 1)));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };
  const worst = days.reduce((a, d) => (diary[d].pain > diary[a].pain ? d : a), days[0]);
  const bad = es.filter((e) => e.sleep === 'mal').length;
  return { n: es.length, avg, worst, zones: count('zones'), kinds: count('kinds'), other: count('other'), triggers: count('triggers'), bad };
}

function chartSVG(days, w = 640, h = 200) {
  const n = days.length;
  if (n < 2) return '<p class="d-empty">Cuando tengas dos días apuntados verás aquí tu gráfica.</p>';
  const first = new Date(days[0] + 'T12:00'), span = Math.max(1, (new Date(days[n - 1] + 'T12:00') - first) / 864e5);
  const X = (d) => 36 + ((new Date(d + 'T12:00') - first) / 864e5 / span) * (w - 52), Y = (v) => 14 + (10 - v) * ((h - 40) / 10);
  const pts = days.map((d) => `${X(d).toFixed(1)},${Y(diary[d].pain).toFixed(1)}`);
  const grid = [0, 5, 10].map((v) => `<line x1="36" x2="${w - 10}" y1="${Y(v)}" y2="${Y(v)}"/><text x="8" y="${Y(v) + 4}">${v}</text>`).join('');
  const dots = days.map((d, i) => `<circle cx="${pts[i].split(',')[0]}" cy="${pts[i].split(',')[1]}" r="4"><title>${nice(d)}: ${diary[d].pain}</title></circle>`).join('');
  return `<svg class="d-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Dolor de cada día, del 0 al 10">
    <g class="g">${grid}</g><polyline points="${pts.join(' ')}"/>${dots}
    <text x="36" y="${h - 6}">${nice(days[0])}</text><text x="${w - 10}" y="${h - 6}" text-anchor="end">${nice(days[n - 1])}</text></svg>`;
}

const top = (arr, k = 3) => arr.slice(0, k).map(([v, c]) => `${v} (${c} ${c === 1 ? 'día' : 'días'})`).join(', ');

function render() {
  const days = lastDays(30), s = stats(days);
  $('#dChart').innerHTML = chartSVG(days);
  $('#dStats').innerHTML = s ? `<p>En los últimos 30 días has apuntado <b>${s.n} ${s.n === 1 ? 'día' : 'días'}</b>. Dolor medio <b>${s.avg.toFixed(1)}</b> de 10. El peor día fue el ${nice(s.worst)}.</p>
    ${s.triggers.length ? `<p>Lo que más lo empeora: ${esc(top(s.triggers))}.</p>` : ''}`
    : '<p>Todavía no hay días apuntados. Empieza por hoy.</p>';
  const all = Object.keys(diary).sort().reverse().slice(0, 14);
  $('#dList').innerHTML = all.map((d) => `<li><span class="d-dot" style="--v:${diary[d].pain / 10}">${diary[d].pain}</span>
    <span>${nice(d)}${diary[d].note ? ` · ${esc(diary[d].note.slice(0, 50))}` : ''}</span>
    <button data-edit="${d}" aria-label="Cambiar el ${nice(d)}">Cambiar</button><button data-del="${d}" aria-label="Borrar el ${nice(d)}">Borrar</button></li>`).join('');
}

function exportCopy() {
  const blob = new Blob([JSON.stringify({ diary, causes: store.get('causes', []), qs: store.get('qs', []), myqs: store.get('myqs', '') })], { type: 'application/json' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `mi-diario-${iso()}.json` });
  a.click(); URL.revokeObjectURL(a.href);
}

async function importCopy(e) {
  const file = e.target.files[0]; e.target.value = '';
  if (!file) return;
  try {
    const j = JSON.parse(await file.text());
    if (!j || typeof j.diary !== 'object') throw new Error();
    const ok = Object.entries(j.diary).filter(([d, v]) => /^\d{4}-\d{2}-\d{2}$/.test(d) && v && Number.isInteger(v.pain) && v.pain >= 0 && v.pain <= 10)
      .map(([d, v]) => { const { body, ...rest } = v, b = cleanBody(body); return [d, b ? { ...rest, body: b } : rest]; });
    diary = { ...diary, ...Object.fromEntries(ok) };
    if (Array.isArray(j.causes)) store.set('causes', j.causes);
    if (Array.isArray(j.qs)) store.set('qs', j.qs);
    if (typeof j.myqs === 'string') store.set('myqs', j.myqs.slice(0, 2000));
    persist(); render(); initVisit(); fill($('#dForm').date.value);
    msg(`Copia recuperada: ${ok.length} días.`);
  } catch { msg('Ese archivo no es una copia del diario.'); }
}

// Preparar la visita: preguntas a elegir y un informe que se imprime o se guarda en PDF
function initVisit() {
  const chosen = new Set(store.get('qs', []));
  $('#qList').innerHTML = QUESTIONS.map((q, i) => `<label class="q"><input type="checkbox" value="${i}" ${chosen.has(i) ? 'checked' : ''}><span>${esc(q)}</span></label>`).join('');
  $('#qList').onchange = () => store.set('qs', [...$('#qList').querySelectorAll('input:checked')].map((c) => +c.value));
  const my = $('#myQs'); my.value = store.get('myqs', '');
  my.oninput = () => store.set('myqs', my.value.slice(0, 2000));
  const name = $('#vName'); name.value = store.get('vname', '');
  name.oninput = () => store.set('vname', name.value.slice(0, 80));
  $('#vPrint').onclick = printReport;
}

// Dónde duele según el mapa del cuerpo: foto del muñeco con las zonas teñidas y lista de las más frecuentes
function bodySection(n) {
  const st = bodyStats(diary, iso(new Date(Date.now() - (n - 1) * 864e5)));
  if (!st.days) return '';
  const list = (arr) => `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  const pics = bodyPicture?.(n) || [];
  const split = kindSplit(st);
  return `<h2>Dónde duele (mapa del cuerpo)</h2>
    <p>${st.days} ${st.days === 1 ? 'día' : 'días'} con el mapa rellenado. ${st.zones.length ? 'Cuanto más rojo, más días ha dolido esa zona.' : 'En esos días no marcó ninguna zona.'}</p>
    <div class="r-body"><div class="pm-pics">${pics.map((src, i) => `<img src="${src}" alt="Muñeco ${i ? 'de espaldas' : 'de frente'} con las zonas dolorosas en rojo">`).join('')}</div>${st.zones.length ? list(bodyLines(st, 8)) : ''}</div>
    ${split ? `<p><b>Tipo de dolor:</b> ${esc(split)}.</p>` : ''}`;
}

function printReport() {
  const n = +$('#vDays').value, days = lastDays(n), s = stats(days);
  const done = new Set(Object.keys(store.get('causes', {})));
  const qs = store.get('qs', []).map((i) => QUESTIONS[i]).filter(Boolean);
  const mine = store.get('myqs', '').split('\n').map((x) => x.trim()).filter(Boolean);
  const list = (arr) => arr.length ? `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p>Nada apuntado.</p>';
  const name = store.get('vname', '');
  $('#informe').innerHTML = `
    <h1>Resumen para la consulta${name ? `: ${esc(name)}` : ''}</h1>
    <p class="r-meta">Preparado el ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}. Periodo: últimos ${n} días. Datos apuntados por el paciente en su diario.</p>
    ${s ? `<h2>Dolor</h2><p>${s.n} días apuntados. Dolor medio ${s.avg.toFixed(1)} de 10. Peor día: ${nice(s.worst)} (${diary[s.worst].pain} de 10). Noches de mal sueño: ${s.bad}.</p>
    ${chartSVG(days, 640, 180)}
    <h2>Síntomas más frecuentes</h2>
    <p><b>Dónde:</b> ${esc(top(s.zones, 5)) || 'sin datos'}.</p><p><b>Cómo es:</b> ${esc(top(s.kinds, 5)) || 'sin datos'}.</p>
    <p><b>Otros:</b> ${esc(top(s.other, 5)) || 'ninguno'}.</p><p><b>Lo empeora:</b> ${esc(top(s.triggers, 5)) || 'sin datos'}.</p>
    <h2>Notas del periodo</h2>${list(days.filter((d) => diary[d].note).map((d) => `${nice(d)}: ${diary[d].note}`))}`
    : '<p>No hay días apuntados en este periodo.</p>'}
    ${bodySection(n)}
    <h2>Causas que ya me han mirado</h2>${list(CAUSES.filter((c) => done.has(c.id)).map((c) => c.name))}
    <h2>Causas que quiero preguntar si se han descartado</h2>${list(CAUSES.filter((c) => !done.has(c.id)).map((c) => `${c.name} (${c.test})`))}
    <h2>Mis preguntas</h2>${list([...qs, ...mine])}
    <p class="r-foot">Hecho con DjCJA, pracmatik.github.io/senal. Es un registro personal, no un informe médico.</p>`;
  document.body.classList.add('printing');
  const done2 = () => { document.body.classList.remove('printing'); removeEventListener('afterprint', done2); };
  addEventListener('afterprint', done2);
  print();
}

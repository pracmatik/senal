// Mapa de dolor en el muñeco: se toca una zona (o se elige en la lista), se cuenta cómo es y se guarda en el diario.
// Debajo, resumen de los últimos días con las zonas teñidas según los días que han dolido.
import { getBody, saveBody, allDiary, setBodyPicture, PAIN } from './diario.js?v=17';
import { animateFigures, paintFigure, pickZone, turnFigure, figureYaw, snapshotFigure } from './figura.js?v=23';
import { PAIN_ZONES, PAIN_BY, PAIN_GROUPS, KINDS, CAUSES, PAIN_LIMIT, zoneName, bodyStats, bodyLines, kindSplit } from './zonas.js?v=17';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const iso = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const nice = (s) => new Date(s + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

const RED = 0xdc2630, AMBER = 0xffb02e;
const S = { date: iso(), sel: new Map(), hover: '', dirty: false, days: 14, fig: null, heat: null, ready: false };

/* ---------- pintar el muñeco ---------- */
function paintMap() {
  if (!S.fig?._fig) return;
  const paint = {};
  if (S.hover && !S.sel.has(S.hover)) paint[S.hover] = { c: AMBER, o: 0.5 };
  for (const z of S.sel.keys()) paint[z] = { c: RED, o: 0.74, p: true };
  paintFigure(S.fig, paint);
}

// De amarillo (pocos días) a rojo oscuro (casi todos los días)
const heatColor = (f) => {
  const a = [255, 194, 71], b = [176, 18, 26], m = a.map((x, i) => Math.round(x + (b[i] - x) * Math.min(1, f)));
  return (m[0] << 16) | (m[1] << 8) | m[2];
};
function paintHeat(node, st) {
  if (!node?._fig) return;
  const paint = {};
  for (const s of st.zones) paint[s.z] = { c: heatColor(s.freq), o: 0.5 + 0.3 * s.freq };
  paintFigure(node, paint);
}

/* ---------- zonas elegidas ---------- */
function toggle(id, on = !S.sel.has(id)) {
  if (!PAIN_BY[id]) return;
  if (on && !S.sel.has(id)) S.sel.set(id, { z: id, t: '', i: 5, c: [], x: '' });
  if (!on) S.sel.delete(id);
  S.dirty = true;
  renderChips(); renderDetail(); paintMap();
  status(on ? `${zoneName(id)} marcada. Más abajo cuentas cómo es.` : `${zoneName(id)} quitada.`);
}

function status(t) { const el = $('#pmStatus'); if (el) el.textContent = t; }
function msg(t) { const m = $('#pmMsg'); m.textContent = t; clearTimeout(msg.t); msg.t = setTimeout(() => (m.textContent = ''), 6000); }

function renderChips() {
  $('#pmChips').innerHTML = PAIN_GROUPS.map((g, gi) => `<fieldset class="pm-group"><legend>${g}</legend><div>${PAIN_ZONES.filter((z) => z.group === gi).map((z) =>
    `<button type="button" class="chip pm-chip${S.sel.has(z.id) ? ' on' : ''}" data-z="${z.id}" aria-pressed="${S.sel.has(z.id)}">${esc(z.n)}</button>`).join('')}</div></fieldset>`).join('');
}

function cardHTML(b) {
  const z = PAIN_BY[b.z];
  return `<fieldset class="pm-zone" data-z="${b.z}">
    <legend>${esc(z.n)}</legend>
    <button type="button" class="pm-x" data-del="${b.z}" aria-label="Quitar ${esc(z.n)}">Quitar</button>
    <p class="pm-q">¿Cómo es este dolor?</p>
    <div class="pm-opts">${KINDS.map(([k, l]) => `<label class="pick"><input type="radio" name="k-${b.z}" value="${k}" ${b.t === k ? 'checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div>
    <label class="pm-int"><span class="pm-q">Cuánto duele</span>
      <span class="pm-int-row"><input type="range" min="0" max="10" step="1" value="${b.i}" data-int><output>${b.i}</output></span>
      <span class="pm-word"></span></label>
    <p class="pm-q">¿Qué crees que lo ha causado?</p>
    <div class="pm-opts">${CAUSES.map((c) => `<label class="pick"><input type="checkbox" value="${esc(c)}" ${b.c.includes(c) ? 'checked' : ''}><span>${esc(c)}</span></label>`).join('')}</div>
    <input type="text" class="pm-free" maxlength="120" placeholder="Otra cosa, si quieres contarla" aria-label="Otra causa de ${esc(z.n)}" value="${esc(b.x)}">
  </fieldset>`;
}

function renderDetail() {
  const box = $('#pmDetail'), have = new Set([...box.children].map((c) => c.dataset.z));
  have.forEach((z) => { if (!S.sel.has(z)) $(`[data-z="${z}"]`, box)?.remove(); });
  for (const b of S.sel.values()) if (!have.has(b.z)) { box.insertAdjacentHTML('beforeend', cardHTML(b)); intWord($(`[data-z="${b.z}"]`, box)); }
  $('#pmEmpty').hidden = S.sel.size > 0;
  $('#pmJump').hidden = S.sel.size === 0;
  $('#pmCount').textContent = S.sel.size ? `${S.sel.size} ${S.sel.size === 1 ? 'zona marcada' : 'zonas marcadas'}` : '';
  $('#pmDirty').hidden = !S.dirty;
}

function intWord(card) {
  const i = +$('[data-int]', card).value;
  $('output', card).textContent = i;
  $('.pm-word', card).textContent = PAIN[i] + (i >= PAIN_LIMIT ? '. Hoy la rutina evitará lo que cargue esta zona.' : '');
}

function onDetail(e) {
  const card = e.target.closest('.pm-zone');
  if (!card) return;
  const b = S.sel.get(card.dataset.z);
  if (e.target.closest('[data-del]')) return toggle(card.dataset.z, false);
  if (e.target.matches('input[type=radio]')) b.t = e.target.value;
  else if (e.target.matches('[data-int]')) { b.i = +e.target.value; intWord(card); }
  else if (e.target.matches('input[type=checkbox]')) b.c = [...card.querySelectorAll('input[type=checkbox]:checked')].map((c) => c.value);
  else if (e.target.matches('.pm-free')) b.x = e.target.value.slice(0, 120);
  else return;
  S.dirty = true; $('#pmDirty').hidden = false;
}

/* ---------- guardar y cargar ---------- */
function load(date) {
  const had = S.dirty;
  S.date = date; S.dirty = false;
  S.sel = new Map((getBody(date) || []).map((b) => [b.z, { ...b }]));
  $('#pmDate').value = date; $('#pmDetail').innerHTML = '';
  renderChips(); renderDetail(); paintMap();
  if (had) msg('Los cambios sin guardar del día anterior se han descartado.');
}

function save(empty = false) {
  if (empty) S.sel.clear();
  const ok = saveBody(S.date, [...S.sel.values()]);
  if (!ok) return msg('No se ha podido guardar. Puede que el navegador esté en modo privado.');
  S.dirty = false;
  if (empty) { $('#pmDetail').innerHTML = ''; renderChips(); paintMap(); }
  renderDetail(); renderSummary();
  const day = S.date === iso() ? 'hoy' : `el ${nice(S.date)}`;
  msg(S.sel.size ? `Guardado ${day}: ${S.sel.size} ${S.sel.size === 1 ? 'zona' : 'zonas'}.` : `Guardado: ${day} no te duele nada.`);
  document.dispatchEvent(new CustomEvent('dolorchange'));
}

/* ---------- resumen de los últimos días ---------- */
const since = (n) => iso(new Date(Date.now() - (n - 1) * 864e5));
function renderSummary() {
  const st = bodyStats(allDiary(), since(S.days));
  paintHeat(S.heat, st);
  $('#pmSumList').innerHTML = st.days
    ? (st.zones.length ? `<ol class="pm-rank">${bodyLines(st).map((l, i) => `<li><span class="pm-dot" style="--f:${st.zones[i].freq}"></span>${esc(l)}.</li>`).join('')}</ol>
        <p class="pm-split">Tipo de dolor: ${esc(kindSplit(st))}.</p>`
        : `<p>En los ${st.days} ${st.days === 1 ? 'día' : 'días'} que rellenaste el mapa no marcaste ninguna zona.</p>`)
    : '<p>Todavía no has guardado ningún mapa. Cuando lo hagas, aquí verás qué zonas duelen más.</p>';
  document.querySelectorAll('[data-days]').forEach((b) => { b.classList.toggle('on', +b.dataset.days === S.days); b.setAttribute('aria-pressed', +b.dataset.days === S.days); });
  $('#pmLegend').hidden = !st.zones.length;
}

// Para el resumen del médico: muñeco de frente y de espaldas con las zonas del periodo
function picture(n) {
  if (!S.heat?._fig) return [];
  const keep = figureYaw(S.heat), out = [];
  paintHeat(S.heat, bodyStats(allDiary(), since(n)));
  for (const yaw of [0, 180]) { turnFigure(S.heat, yaw); const src = snapshotFigure(S.heat); if (src) out.push(src); }
  turnFigure(S.heat, keep); renderSummary();
  return out;
}

/* ---------- girar y mirar ---------- */
function sides() {
  const y = ((figureYaw(S.fig) % 360) + 360) % 360, front = y <= 60 || y >= 300, back = y >= 120 && y <= 240;
  const [l, r] = $$sides();
  l.hidden = r.hidden = !front && !back;
  l.textContent = front ? 'Tu derecha' : 'Tu izquierda'; r.textContent = front ? 'Tu izquierda' : 'Tu derecha';
  const t = $('#pmTurn'); t.textContent = back ? 'Ver de frente' : 'Ver de espaldas';
}
const $$sides = () => [$('.pm-l'), $('.pm-r')];

function turnTo(target) {
  const from = figureYaw(S.fig), t0 = performance.now();
  const step = (now) => {
    const k = still ? 1 : Math.min(1, (now - t0) / 450), e = 0.5 - Math.cos(Math.PI * k) / 2, y = from + (target - from) * e;
    turnFigure(S.fig, y); turnFigure(S.heat, y); sides();
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function initFigure() {
  if (S.ready) return;
  S.ready = true;
  S.fig = $('#pmFig'); S.heat = $('#pmHeat');
  animateFigures($('#dolor'));
  if (S.fig.classList.contains('fig-off')) { $('#pmStage').classList.add('no-gl'); return; }
  S.fig.querySelector('canvas')?.setAttribute('aria-label', 'Muñeco con el cuerpo entero. Toca una zona para marcarla. También puedes elegirla en la lista de zonas. Arrastra para girarlo.');
  S.heat.querySelector('canvas')?.setAttribute('aria-label', 'Muñeco con las zonas de dolor de los últimos días teñidas, más rojo cuantos más días.');
  let down = null, raf = 0;
  S.fig.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  S.fig.addEventListener('pointerup', (e) => {
    const d = down; down = null; sides();
    if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8 && performance.now() - d.t < 700) {
      const z = pickZone(S.fig, e.clientX, e.clientY);
      if (z) toggle(z);
    }
  });
  for (const t of ['pointercancel', 'pointerleave']) S.fig.addEventListener(t, () => { down = null; if (S.hover) { S.hover = ''; $('#pmHover').textContent = ''; paintMap(); } });
  S.fig.addEventListener('pointermove', (e) => {
    if (down || e.pointerType === 'touch' || raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const z = pickZone(S.fig, e.clientX, e.clientY) || '';
      if (z === S.hover) return;
      S.hover = z; S.fig.style.cursor = z ? 'pointer' : ''; $('#pmHover').textContent = z ? zoneName(z) : ''; paintMap();
    });
  });
  paintMap(); renderSummary(); sides();
}

export function initDolor() {
  if (!$('#dolor')) return;
  S.date = iso();
  renderChips();
  $('#pmDate').max = iso();
  $('#pmChips').addEventListener('click', (e) => { const b = e.target.closest('[data-z]'); if (b) toggle(b.dataset.z); });
  $('#pmDetail').addEventListener('input', onDetail);
  $('#pmDetail').addEventListener('click', onDetail);
  $('#pmSave').onclick = () => save();
  $('#pmNone').onclick = () => save(true);
  $('#pmTurn').onclick = () => turnTo(figureYaw(S.fig) > 90 && figureYaw(S.fig) < 270 ? 0 : 180);
  $('#pmJump').onclick = () => $('#pmDetail').scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' });
  document.querySelectorAll('[data-days]').forEach((b) => { b.onclick = () => { S.days = +b.dataset.days; renderSummary(); }; });
  $('#pmDate').onchange = (e) => {
    const f = $('#dForm').date;
    if (!e.target.value || e.target.value > iso()) { e.target.value = S.date; return; }
    f.value = e.target.value; f.onchange?.();
  };
  document.addEventListener('diariodate', (e) => { if (e.detail !== S.date || !S.ready) load(e.detail); });
  document.addEventListener('viewchange', (e) => { if (e.detail === 'v-diario') initFigure(); });
  setBodyPicture(picture);
  load($('#dForm').date.value || iso());
  renderSummary();
  if (!$('#v-diario').hidden) initFigure();
}

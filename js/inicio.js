// Portada: saludo según la hora, cómo te encuentras, rutina de hoy, consejo del día y diario
import { TIPS, EXERCISES } from './rutina-datos.js?v=17';
import { todaySummary } from './rutina.js?v=23';
import { animateFigures } from './figura.js?v=23';

const $ = (s, el = document) => el.querySelector(s);
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const iso = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const BY = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

const MOODS = [
  [1, 'Muy mal', 'M8 17c2-2.5 6-2.5 8 0', 'Lo siento. Hoy la rutina es muy corta y siempre sentado o tumbado. Si te duele más de lo normal, descansa y apúntalo en el diario.'],
  [2, 'Mal', 'M8.5 16.5c2-1.3 5-1.3 7 0', 'Vamos con calma. Te he dejado una rutina suave, sin estar de pie.'],
  [3, 'Regular', 'M8.5 15.5h7', 'Un día normal. Una rutina corta te puede dejar algo mejor.'],
  [4, 'Bien', 'M8.5 14.5c2 1.5 5 1.5 7 0', 'Me alegro. Hoy puedes añadir algún ejercicio de equilibrio.'],
  [5, 'Muy bien', 'M8 14c2 3 6 3 8 0', 'Genial. Aprovecha, pero sin pasarte: mañana también cuenta.'],
];
const THEME_PILL = { fuerza: 'Fuerza y equilibrio', movilidad: 'Estirar y circular', calma: 'Calma' };
const TIP_START = Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);
let tipIdx = TIP_START % TIPS.length;

function greet() {
  const h = new Date().getHours();
  const word = h >= 6 && h < 14 ? 'Buenos días' : h >= 14 && h < 21 ? 'Buenas tardes' : 'Buenas noches';
  $('#helloWord').textContent = word;
  document.documentElement.dataset.daypart = h >= 6 && h < 14 ? 'dia' : h >= 14 && h < 21 ? 'tarde' : 'noche';
  const d = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#todayDate').textContent = d.charAt(0).toUpperCase() + d.slice(1);
}

const face = (path) => `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><circle class="eye" cx="9" cy="10" r="1.1"/><circle class="eye" cx="15" cy="10" r="1.1"/><path d="${path}"/></svg>`;

function initMoods() {
  const box = $('#moods');
  box.innerHTML = MOODS.map(([v, label, path]) =>
    `<button type="button" role="radio" aria-checked="false" data-mood="${v}" class="mood m${v}">${face(path)}<span>${label}</span></button>`).join('');
  const show = () => {
    const v = store.get('animo', {})[iso()];
    box.querySelectorAll('[data-mood]').forEach((b) => b.setAttribute('aria-checked', String(+b.dataset.mood === v)));
    $('#moodReply').textContent = v ? MOODS[v - 1][3] : '';
    $('#moodQ').textContent = v ? 'Hoy te encuentras así. Puedes cambiarlo cuando quieras.' : '¿Cómo te encuentras hoy?';
  };
  box.onclick = (ev) => {
    const b = ev.target.closest('[data-mood]'); if (!b) return;
    const all = store.get('animo', {}); all[iso()] = +b.dataset.mood; store.set('animo', all);
    show(); document.dispatchEvent(new CustomEvent('moodchange'));
  };
  box.onkeydown = (ev) => {
    if (!/Arrow(Left|Right|Up|Down)/.test(ev.key)) return;
    const bs = [...box.querySelectorAll('[data-mood]')], i = bs.indexOf(document.activeElement);
    const n = bs[(i + (/Right|Down/.test(ev.key) ? 1 : -1) + bs.length) % bs.length];
    ev.preventDefault(); n.focus(); n.click();
  };
  show();
}

function renderTip() {
  const t = TIPS[tipIdx];
  $('#todayTip').textContent = t.t;
  $('#tipKind').textContent = t.k.charAt(0).toUpperCase() + t.k.slice(1);
  $('#todayTipSrc').innerHTML = (t.src || []).map(([n, u]) => `Fuente: <a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)}</a>`).join(' ');
}

function renderRoutine() {
  const s = todaySummary();
  $('#homeTheme').textContent = s.pill || THEME_PILL[s.key] || '';
  $('#homeRutina').innerHTML = `${s.n} ejercicios, unos <b>${s.min} minutos</b>`;
  const figs = $('#homeFigs');
  figs.innerHTML = s.ids.slice(0, 4).map((id) => `<figure><div data-fig="${esc(id)}"></div><figcaption>${esc(BY[id]?.n || '')}</figcaption></figure>`).join('');
  animateFigures(figs);
}

function renderDiary() {
  const diary = store.get('diary', {}), days = Object.keys(diary).sort();
  if (!days.length) return;
  const last = days.at(-1), e = diary[last];
  const when = last === iso() ? 'Hoy' : new Date(last).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#homeDiary').textContent = `${when.charAt(0).toUpperCase() + when.slice(1)} apuntaste un dolor de ${e.pain ?? '?'} sobre 10. Llevas ${days.length} ${days.length === 1 ? 'día apuntado' : 'días apuntados'}.`;
}

export function initInicio() {
  greet(); initMoods(); renderTip(); renderRoutine(); renderDiary();
  $('#tipNext').onclick = () => { tipIdx = (tipIdx + 1) % TIPS.length; renderTip(); };
  document.addEventListener('rutinachange', renderRoutine);
  document.addEventListener('moodchange', renderRoutine);
  animateFigures($('.hello-stage'));
  setInterval(greet, 6e5);
}

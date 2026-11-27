// Rutina diaria a medida: elige ejercicios según el tiempo disponible, cómo se encuentra hoy y lo hecho los días anteriores.
// Perfil fijo de Christian: camina con molestias, dolor fuerte en los pies, permiso médico. Por eso casi todo es sentado o tumbado.
import { EXERCISES } from './rutina-datos.js?v=15';
import { animateFigures } from './figura.js?v=15';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
};
const iso = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const dayAgo = (n) => iso(new Date(Date.now() - n * 864e5));
const BY = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
const mins = (sec) => Math.max(1, Math.round(sec / 60));

const THEMES = {
  fuerza: { goals: ['fuerza', 'equilibrio'], text: 'Hoy toca fuerza suave y equilibrio.' },
  movilidad: { goals: ['flexibilidad', 'circulación'], text: 'Hoy toca estirar y mover la circulación.' },
  calma: { goals: ['relajación', 'respiración', 'flexibilidad'], text: 'Hoy toca calma: estiramientos suaves y relajación.' },
};
const WEEK = ['calma', 'fuerza', 'movilidad', 'fuerza', 'movilidad', 'fuerza', 'movilidad'];
const WARM = ['marcha-rodillas-sentado', 'tobillo-punta-flexion-sentado', 'circulos-tobillo-sentado', 'dedos-pies-abrir-cerrar', 'marcha-sitio-sentado'];
const SHORT_COOL = ['inclinar-cuello-sentado', 'giro-cuello-sentado', 'pecho-abrir-sentado'];
const ORDER = { sit: 1, stand: 0, lie: 2 };

function seeded(str) {
  let h = 1779033703;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 3432918353) >>> 0;
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0; return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}

const rules = (mood) => ({ level: mood <= 2 ? 1 : 2, standCap: mood >= 4 ? 2 : 0, theme: mood <= 2 ? 'calma' : WEEK[new Date().getDay()] });
const allowed = (e, r, total) => e.l <= r.level && (e.p !== 'stand' || r.standCap > 0) && e.p !== 'walk' && e.sec <= Math.max(130, total * 0.45);

export function buildPlan(min, mood, date = iso()) {
  const total = min * 60, r = rules(mood), rnd = seeded(`${date}-${min}-${mood}`);
  const recent = new Set([1, 2].flatMap((n) => store.get('rutinaLog', {})[dayAgo(n)]?.ids || []));
  const score = (e) => rnd() + (recent.has(e.id) ? 1 : 0);
  const pickFrom = (ids) => ids.map((id) => BY[id]).filter((e) => allowed(e, r, total)).sort((a, b) => score(a) - score(b))[0];
  const warm = pickFrom(WARM);
  const cool = total >= 900 ? BY['resp-abdominal-sentado'] : pickFrom(SHORT_COOL.filter((id) => id !== warm?.id));
  const plan = [warm, cool].filter(Boolean), used = new Set(plan.map((e) => e.id));
  let room = total - plan.reduce((s, e) => s + e.sec, 0), stand = 0;
  const pool = EXERCISES.filter((e) => !used.has(e.id) && allowed(e, r, total)).map((e) => [score(e), e]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const fits = (e) => e.sec <= room + 30 && (e.p !== 'stand' || stand < r.standCap);
  for (const pass of [(e) => e.g.some((g) => THEMES[r.theme].goals.includes(g)), () => true]) {
    for (const e of pool) {
      if (used.has(e.id) || !pass(e) || !fits(e)) continue;
      plan.push(e); used.add(e.id); room -= e.sec; if (e.p === 'stand') stand++;
    }
  }
  return { date, min, mood, theme: r.theme, ids: order(plan, warm, cool).map((e) => e.id) };
}

function order(plan, warm, cool) {
  const main = plan.filter((e) => e !== warm && e !== cool).sort((a, b) => ORDER[a.p] - ORDER[b.p]);
  let end = cool;
  if (cool?.id === 'resp-abdominal-sentado' && main.at(-1)?.p === 'lie' && !main.includes(BY['resp-abdominal-tumbado'])) end = BY['resp-abdominal-tumbado'];
  return [warm, ...main, end].filter(Boolean);
}

function swapFor(plan, i, mood) {
  const cur = BY[plan.ids[i]], r = rules(mood), have = new Set(plan.ids);
  const opts = EXERCISES.filter((e) => !have.has(e.id) && allowed(e, { ...r, standCap: 0 }, plan.min * 60) && e.l <= cur.l);
  opts.sort((a, b) => (b.g.some((g) => cur.g.includes(g)) - a.g.some((g) => cur.g.includes(g))) || Math.abs(a.sec - cur.sec) - Math.abs(b.sec - cur.sec));
  return opts[0];
}

// Estado del día
const S = { plan: null, mood: 3 };
const todayMood = () => store.get('animo', {})[iso()] ?? 3;

function defaultMinutes() {
  const log = store.get('rutinaLog', {}), y = log[dayAgo(1)];
  const base = store.get('rutinaMin', 15);
  return y?.feel === 'peor' ? Math.max(5, Math.round(y.min * 0.7)) : base;
}

function current() {
  const saved = store.get('rutinaHoy', null), mood = todayMood();
  const min = saved?.date === iso() ? saved.min : defaultMinutes();
  if (saved?.date === iso() && saved.mood === mood && saved.min === min) return saved;
  const plan = buildPlan(min, mood);
  store.set('rutinaHoy', plan);
  return plan;
}

const totalSec = (plan) => plan.ids.reduce((s, id) => s + BY[id].sec, 0);
export const todaySummary = () => { const p = current(); return { min: mins(totalSec(p)), n: p.ids.length, ids: p.ids, theme: THEMES[p.theme].text, key: p.theme }; };

function itemHTML(e, i) {
  return `<li class="r-item" data-i="${i}">
    <div class="r-fig" data-fig="${e.id}"></div>
    <div class="r-body">
      <p class="r-meta"><span class="r-num">${i + 1}</span><span class="tag">${{ sit: 'Sentado', lie: 'Tumbado', stand: 'De pie, con apoyo' }[e.p]}</span><span class="tag">${mins(e.sec)} min</span></p>
      <h3>${esc(e.n)}</h3>
      <p class="r-dose">${esc(e.d)}</p>
      <details><summary>Cómo se hace</summary><ol>${e.s.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>${e.safe ? `<p class="r-safe">${esc(e.safe)}</p>` : ''}
        <p class="g-src">Fuente: ${e.src.map(([l, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(l.split(',')[0])}</a>`).join('')}</p></details>
      <button class="r-swap" type="button" data-swap="${i}">Cambiar por otro</button>
    </div></li>`;
}

function render() {
  S.plan = current(); S.mood = todayMood();
  const p = S.plan, ex = p.ids.map((id) => BY[id]);
  $('#rMin').value = p.min;
  $('#rSummary').innerHTML = `Te llevará <strong>unos ${mins(totalSec(p))} minutos</strong>, con ${ex.length} ejercicios.`;
  $('#rTheme').textContent = THEMES[p.theme].text + (S.mood <= 2 ? ' Como hoy no estás bien, todo es suave.' : '');
  const y = store.get('rutinaLog', {})[dayAgo(1)];
  $('#rPace').hidden = y?.feel !== 'peor';
  $('#rList').innerHTML = ex.map(itemHTML).join('');
  animateFigures($('#rList'));
  renderProgress();
  document.dispatchEvent(new CustomEvent('rutinachange'));
}

function setMinutes(v) {
  const min = Math.min(60, Math.max(5, Math.round(+v || 15)));
  store.set('rutinaMin', min);
  store.set('rutinaHoy', buildPlan(min, todayMood()));
  render();
}

function renderProgress() {
  const log = store.get('rutinaLog', {}), days = [...Array(7)].map((_, i) => dayAgo(6 - i));
  const vals = days.map((d) => log[d]?.min || 0), max = Math.max(30, ...vals), week = vals.reduce((a, b) => a + b, 0);
  const W = 300, H = 120, bw = 28, gap = (W - bw * 7) / 6;
  const bars = days.map((d, i) => {
    const h = Math.round((vals[i] / max) * (H - 30)), x = Math.round(i * (bw + gap));
    const lab = new Date(d + 'T12:00').toLocaleDateString('es-ES', { weekday: 'narrow' }).toUpperCase();
    return `<rect x="${x}" y="${H - 22 - h}" width="${bw}" height="${Math.max(h, 3)}" rx="8" class="${vals[i] ? 'on' : ''} ${i === 6 ? 'today' : ''}"/>
      ${vals[i] ? `<text x="${x + bw / 2}" y="${H - 28 - h}" class="v">${vals[i]}</text>` : ''}<text x="${x + bw / 2}" y="${H - 4}" class="d">${lab}</text>`;
  }).join('');
  $('#rWeek').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Minutos de ejercicio de los últimos 7 días">${bars}</svg>`;
  let streak = 0;
  for (let n = log[iso()] ? 0 : 1; log[dayAgo(n)]; n++) streak++;
  $('#rStats').innerHTML = `<strong>${week} min</strong> esta semana de una meta general de 150. ${streak > 1 ? `Llevas <strong>${streak} días seguidos</strong>.` : 'Lo que hagas cuenta, aunque sea poco.'}`;
  const pct = Math.min(1, week / 150);
  $('#rRing').style.setProperty('--p', pct);
}

// Reproductor paso a paso
const P = { i: 0, left: 0, run: false, timer: 0, done: [] };

function speak(text) {
  if (!store.get('voz', false) || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.lang = 'es-ES'; u.rate = 0.95; speechSynthesis.speak(u);
}

function showStep() {
  const ids = S.plan.ids, e = BY[ids[P.i]], dlg = $('#player');
  P.left = e.sec; P.run = true;
  dlg.querySelector('.p-bar').innerHTML = ids.map((_, j) => `<i class="${j < P.i ? 'done' : j === P.i ? 'now' : ''}"></i>`).join('');
  dlg.querySelector('.p-count').textContent = `${P.i + 1} de ${ids.length}`;
  dlg.querySelector('.p-fig').innerHTML = `<div data-fig="${e.id}"></div>`;
  animateFigures(dlg.querySelector('.p-fig'));
  dlg.querySelector('.p-name').textContent = e.n;
  dlg.querySelector('.p-dose').textContent = e.d;
  dlg.querySelector('.p-steps').innerHTML = e.s.map((s) => `<li>${esc(s)}</li>`).join('');
  dlg.querySelector('.p-safe').textContent = e.safe || '';
  dlg.querySelector('.p-prev').disabled = P.i === 0;
  dlg.querySelector('.p-next').textContent = P.i === ids.length - 1 ? 'Terminar' : 'Hecho, siguiente';
  dlg.querySelector('.p-end').hidden = true; dlg.querySelector('.p-main').hidden = false;
  tick(); speak(`${e.n}. ${e.d}`);
}

function tick() {
  const e = BY[S.plan.ids[P.i]], dlg = $('#player');
  const m = Math.floor(P.left / 60), s = String(P.left % 60).padStart(2, '0');
  dlg.querySelector('.p-time').textContent = `${m}:${s}`;
  dlg.querySelector('.p-ring').style.setProperty('--p', 1 - P.left / e.sec);
  dlg.querySelector('.p-pause').textContent = P.run ? 'Pausa' : 'Seguir';
}

function startClock() {
  clearInterval(P.timer);
  P.timer = setInterval(() => {
    if (!P.run) return;
    P.left = Math.max(0, P.left - 1); tick();
    if (P.left === 0) { P.run = false; navigator.vibrate?.(200); speak('Tiempo cumplido'); tick(); }
  }, 1000);
}

function next(step) {
  if (step > 0) P.done.push(S.plan.ids[P.i]);
  P.i += step;
  if (P.i >= S.plan.ids.length) return finish();
  showStep();
}

function finish() {
  clearInterval(P.timer); speechSynthesis?.cancel?.();
  const dlg = $('#player');
  dlg.querySelector('.p-main').hidden = true; dlg.querySelector('.p-end').hidden = false;
  dlg.querySelector('.p-bar').innerHTML = S.plan.ids.map(() => '<i class="done"></i>').join('');
  dlg.querySelector('.p-count').textContent = 'Terminado';
  animateFigures(dlg.querySelector('.p-end'));
}

function saveFeel(feel) {
  const log = store.get('rutinaLog', {}), done = [...new Set(P.done)];
  const sec = done.reduce((s, id) => s + (BY[id]?.sec || 0), 0);
  const prev = log[iso()] || { min: 0, ids: [] };
  log[iso()] = { min: prev.min + mins(sec), ids: [...new Set([...prev.ids, ...done])], feel };
  store.set('rutinaLog', log);
  $('#player').close(); render();
  const msg = { mejor: 'Apuntado. Te ha sentado bien: mañana seguimos.', igual: 'Apuntado. Mañana te propongo otra variedad.', peor: 'Apuntado. Mañana te propondré menos tiempo. Si mañana sigues peor, coméntalo con tu médico.' }[feel];
  $('#rMsg').textContent = msg;
}

function openPlayer() {
  const dlg = $('#player');
  P.i = 0; P.done = [];
  dlg.showModal(); showStep(); startClock();
}

function initPlayer() {
  const dlg = $('#player');
  dlg.querySelector('.p-close').onclick = () => dlg.close();
  dlg.addEventListener('close', () => { clearInterval(P.timer); if ('speechSynthesis' in window) speechSynthesis.cancel(); });
  dlg.querySelector('.p-next').onclick = () => next(1);
  dlg.querySelector('.p-prev').onclick = () => next(-1);
  dlg.querySelector('.p-pause').onclick = () => { P.run = !P.run; tick(); };
  dlg.querySelector('.p-swap').onclick = () => {
    const alt = swapFor(S.plan, P.i, S.mood);
    if (!alt) return;
    S.plan.ids[P.i] = alt.id; store.set('rutinaHoy', S.plan); showStep();
  };
  const voice = dlg.querySelector('.p-voice');
  const setVoice = (on) => { store.set('voz', on); voice.setAttribute('aria-pressed', on); voice.textContent = on ? 'Voz activada' : 'Activar voz'; };
  setVoice(store.get('voz', false));
  voice.onclick = () => setVoice(!store.get('voz', false));
  dlg.querySelectorAll('[data-feel]').forEach((b) => { b.onclick = () => saveFeel(b.dataset.feel); });
}

export function initRutina() {
  if (!$('#rutina')) return;
  const input = $('#rMin');
  input.addEventListener('change', () => setMinutes(input.value));
  document.querySelectorAll('[data-min]').forEach((b) => { b.onclick = () => setMinutes(b.dataset.min); });
  $('#rLess').onclick = () => setMinutes(+input.value - 5);
  $('#rMore').onclick = () => setMinutes(+input.value + 5);
  document.querySelectorAll('[data-start]').forEach((b) => { b.onclick = openPlayer; });
  $('#rList').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-swap]'); if (!b) return;
    const alt = swapFor(S.plan, +b.dataset.swap, S.mood);
    if (!alt) { b.textContent = 'No hay otro parecido'; return; }
    S.plan.ids[+b.dataset.swap] = alt.id; store.set('rutinaHoy', S.plan); render();
  });
  document.addEventListener('moodchange', render);
  initPlayer(); render();
}

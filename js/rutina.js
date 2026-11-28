// Rutina diaria a medida: elige ejercicios según el tiempo disponible, cómo se encuentra hoy, lo hecho los días anteriores,
// las zonas que Christian quiere trabajar y el dolor que apunta en el mapa del diario.
// Perfil fijo de Christian: camina con molestias, dolor fuerte en los pies, permiso médico. Por eso casi todo es sentado o tumbado.
import { EXERCISES } from './rutina-datos.js?v=17';
import { animateFigures } from './figura.js?v=23';
import { TRAIN, TRAIN_BY, PAIN_BY, zoneName, painToday } from './zonas.js?v=17';

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
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

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

// avoid: zonas de rutina que hoy no se cargan porque duelen fuerte. Con dolor de pie, cadera o rodilla tampoco se está de pie.
const rules = (mood, date = iso(), pain = null) => ({
  level: mood <= 2 ? 1 : 2, standCap: mood >= 4 && !pain?.stand ? 2 : 0,
  theme: mood <= 2 ? 'calma' : WEEK[new Date(`${date}T12:00`).getDay()], avoid: pain?.train || new Set(),
});
const allowed = (e, r, total) => e.l <= r.level && (e.p !== 'stand' || r.standCap > 0) && e.p !== 'walk' && e.sec <= Math.max(130, total * 0.45) && !e.z.some((z) => r.avoid.has(z));
const covers = (e, z) => e.z.includes(z);

// Quién bloquea a este ejercicio hoy: la zona con dolor fuerte que carga (o null)
function blockedBy(e, pain) {
  const hit = (pain?.items || []).find((b) => PAIN_BY[b.z].train.some((t) => covers(e, t)) || (e.p === 'stand' && PAIN_BY[b.z].stand));
  return hit ? hit.z : null;
}

/* ---------- qué se ha trabajado ---------- */
// Por cada zona: ejercicios hechos en los últimos 7 días, días distintos y hace cuántos días fue la última vez (14 días de memoria)
function history(today = iso()) {
  const log = store.get('rutinaLog', {}), zl = store.get('rutinaZonas', {}), out = Object.fromEntries(TRAIN.map((z) => [z.id, { n: 0, days: 0, last: null }]));
  for (let d = 0; d < 14; d++) {
    const day = iso(new Date(new Date(`${today}T12:00`).getTime() - d * 864e5));
    const counts = zl[day] || (log[day]?.ids || []).reduce((c, id) => { (BY[id]?.z || []).forEach((z) => { c[z] = (c[z] || 0) + 1; }); return c; }, {});
    for (const [z, n] of Object.entries(counts)) {
      const h = out[z]; if (!h || !n) continue;
      if (d < 7) { h.n += n; h.days++; }
      h.last = h.last === null ? d : Math.min(h.last, d);
    }
  }
  return out;
}

// Zonas con ejercicios posibles hoy, de la menos trabajada a la más trabajada
function leastTrained(hist, r, total, rnd) {
  return TRAIN.filter((z) => EXERCISES.some((e) => allowed(e, r, total) && covers(e, z.id)))
    .map((z) => ({ z: z.id, n: hist[z.id].n, days: hist[z.id].days, last: hist[z.id].last, t: rnd() }))
    .sort((a, b) => a.n - b.n || (b.last ?? 99) - (a.last ?? 99) || a.t - b.t);
}

/* ---------- el plan ---------- */
function pick(min, mood, date, zones, r) {
  const total = min * 60, rnd = seeded(`${date}-${min}-${mood}`);
  const recent = new Set([1, 2].flatMap((n) => store.get('rutinaLog', {})[dayAgo(n)]?.ids || []));
  const hit = (e) => zones.some((z) => covers(e, z));
  const score = (e) => rnd() + (recent.has(e.id) ? 1 : 0) - (hit(e) ? 1 : 0);
  const pickFrom = (ids) => ids.map((id) => BY[id]).filter((e) => allowed(e, r, total)).sort((a, b) => score(a) - score(b))[0];
  let warm = pickFrom(WARM), cool = total >= 900 ? BY['resp-abdominal-sentado'] : pickFrom(SHORT_COOL.filter((id) => id !== warm?.id));
  const plan = [warm, cool].filter(Boolean), used = new Set(plan.map((e) => e.id));
  let room = total - plan.reduce((s, e) => s + e.sec, 0), stand = 0;
  const pool = EXERCISES.filter((e) => !used.has(e.id) && allowed(e, r, total)).map((e) => [score(e), e]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const fits = (e) => !used.has(e.id) && e.sec <= room + 30 && (e.p !== 'stand' || stand < r.standCap);
  const take = (e) => { plan.push(e); used.add(e.id); room -= e.sec; if (e.p === 'stand') stand++; };
  // 1) cada zona elegida entra al menos una vez; si no cabe, se quita el calentamiento o el final que no la trabajen
  for (const z of zones) {
    if (plan.some((e) => covers(e, z))) continue;
    let c = pool.find((e) => covers(e, z) && fits(e));
    for (const d of [warm, cool]) {
      if (c || !d || zones.some((zz) => covers(d, zz))) continue;
      plan.splice(plan.indexOf(d), 1); used.delete(d.id); room += d.sec;
      if (d === warm) warm = undefined; else cool = undefined;
      c = pool.find((e) => covers(e, z) && fits(e));
    }
    if (c) take(c);
  }
  // 2) el resto del tiempo: primero lo de las zonas elegidas y del tema del día, luego lo demás
  const goal = (e) => e.g.some((g) => THEMES[r.theme].goals.includes(g));
  for (const pass of [(e) => hit(e) && goal(e), hit, goal, () => true]) for (const e of pool) if (pass(e) && fits(e)) take(e);
  return order(plan, warm, cool).map((e) => e.id);
}

// opt.zones: zonas que elige Christian · opt.pain: dolor de hoy (painToday). Sin zonas elegidas se propone la menos trabajada.
export function buildPlan(min, mood, date = iso(), opt = {}) {
  const total = min * 60, pain = opt.pain?.items?.length ? opt.pain : null, r = rules(mood, date, pain);
  const chosen = (opt.zones || []).filter((z) => TRAIN_BY[z]);
  const hist = history(date), top = chosen.length ? null : leastTrained(hist, r, total, seeded(`${date}-zona`))[0];
  const auto = top ? { z: top.z, last: top.last, first: Object.values(hist).every((h) => h.last === null) } : null, zones = chosen.length ? chosen : auto ? [auto.z] : [];
  const ids = pick(min, mood, date, zones, r);
  const skipped = pain ? pick(min, mood, date, zones, rules(mood, date, null)).filter((id) => !ids.includes(id) && blockedBy(BY[id], pain)).map((id) => ({ id, by: blockedBy(BY[id], pain) })) : [];
  const missing = zones.filter((z) => !ids.some((id) => covers(BY[id], z))).map((z) => ({ z, why: whyMissing(z, mood, date, total, pain) }));
  return { date, min, mood, theme: r.theme, ids, zones: chosen, auto, zk: chosen.join(), pk: pain?.key || '', skipped, missing };
}

// Por qué no hay ejercicios de una zona hoy: dolor, ánimo bajo o poco tiempo
function whyMissing(z, mood, date, total, pain) {
  const some = (r, t) => EXERCISES.some((e) => covers(e, z) && allowed(e, r, t));
  if (!some(rules(mood, date, pain), total) && some(rules(mood, date, null), total)) return 'dolor';
  if (!some(rules(5, date, null), total)) return 'tiempo';
  return some(rules(mood, date, null), total) ? 'otro' : 'animo';
}

function order(plan, warm, cool) {
  const main = plan.filter((e) => e !== warm && e !== cool).sort((a, b) => ORDER[a.p] - ORDER[b.p]);
  let end = cool;
  if (cool?.id === 'resp-abdominal-sentado' && main.at(-1)?.p === 'lie' && !main.includes(BY['resp-abdominal-tumbado'])) end = BY['resp-abdominal-tumbado'];
  return [warm, ...main, end].filter(Boolean);
}

function swapFor(plan, i, mood) {
  const cur = BY[plan.ids[i]], r = rules(mood, plan.date, painNow()), have = new Set(plan.ids);
  const opts = EXERCISES.filter((e) => !have.has(e.id) && allowed(e, { ...r, standCap: 0 }, plan.min * 60) && e.l <= cur.l);
  const near = (e) => (e.z.some((z) => cur.z.includes(z)) ? 2 : 0) + (e.g.some((g) => cur.g.includes(g)) ? 1 : 0);
  opts.sort((a, b) => near(b) - near(a) || Math.abs(a.sec - cur.sec) - Math.abs(b.sec - cur.sec));
  return opts[0];
}

// Estado del día
const S = { plan: null, mood: 3 };
const todayMood = () => store.get('animo', {})[iso()] ?? 3;
const painNow = () => painToday(store.get('diary', {}), iso());
const todayZones = () => { const z = store.get('rutinaElige', null); return z?.date === iso() ? z.zones.filter((x) => TRAIN_BY[x]) : []; };
const planOpt = () => ({ zones: todayZones(), pain: painNow() });

function defaultMinutes() {
  const log = store.get('rutinaLog', {}), y = log[dayAgo(1)];
  const base = store.get('rutinaMin', 15);
  return y?.feel === 'peor' ? Math.max(5, Math.round(y.min * 0.7)) : base;
}

function current() {
  const saved = store.get('rutinaHoy', null), mood = todayMood(), o = planOpt();
  const min = saved?.date === iso() ? saved.min : defaultMinutes();
  if (saved?.date === iso() && saved.mood === mood && saved.min === min && (saved.zk || '') === o.zones.join() && (saved.pk || '') === (o.pain.items.length ? o.pain.key : '')) return saved;
  const plan = buildPlan(min, mood, iso(), o);
  store.set('rutinaHoy', plan);
  return plan;
}

const totalSec = (plan) => plan.ids.reduce((s, id) => s + BY[id].sec, 0);
const pillText = (p) => { const n = (p.zones?.length ? p.zones : p.auto ? [p.auto.z] : []).map((z) => TRAIN_BY[z].n); return n.length ? n.slice(0, 2).join(' · ') + (n.length > 2 ? ` · +${n.length - 2}` : '') : ''; };
export const todaySummary = () => { const p = current(); return { min: mins(totalSec(p)), n: p.ids.length, ids: p.ids, theme: THEMES[p.theme].text, key: p.theme, pill: pillText(p) }; };

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
  $('#rTheme').textContent = (p.zones?.length ? `Hoy trabajas ${lista(p.zones.map((z) => TRAIN_BY[z].lc))}.` : THEMES[p.theme].text) + (S.mood <= 2 ? ' Como hoy no estás bien, todo es suave.' : '');
  renderZones(p);
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
  store.set('rutinaHoy', buildPlan(min, todayMood(), iso(), planOpt()));
  render();
}

/* ---------- qué quiere trabajar hoy ---------- */
const lista = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} y ${a.at(-1)}`);
const WHY = {
  dolor: (z) => `Hoy no te propongo ${z.lc}: te duele esa zona.`,
  animo: (z) => `Hoy no hay ejercicios de ${z.lc} lo bastante suaves. Los dejamos para otro día.`,
  tiempo: (z) => `Con este tiempo no cabe ningún ejercicio de ${z.lc}. Prueba con más minutos.`,
  otro: (z) => `No me ha cabido ${z.lc} en este tiempo. Prueba con más minutos o elige menos zonas.`,
};

function autoText(a) {
  const z = TRAIN_BY[a.z];
  if (a.first) return `Hoy te propongo ${z.lc} para empezar. Si prefieres otra cosa, elígela arriba.`;
  if (a.last === null) return `Hoy te propongo ${z.lc}, hace más de dos semanas que no ${z.pron} trabajas.`;
  if (a.last <= 2) return `Hoy te propongo ${z.lc}, es de lo que menos has trabajado esta semana.`;
  return `Hoy te propongo ${z.lc}, hace ${a.last} días que no ${z.pron} trabajas.`;
}

function skippedText(p) {
  const names = [...new Set((p.skipped || []).map((x) => BY[x.id].n))];
  if (!names.length) return '';
  const shown = names.slice(0, 3).concat(names.length > 3 ? [`${names.length - 3} más`] : []);
  const where = [...new Set(p.skipped.map((x) => zoneName(x.by).toLowerCase()))];
  return `Hoy me salto ${names.length === 1 ? 'un ejercicio' : `${names.length} ejercicios`} porque cargan zonas que te duelen fuerte hoy (${lista(where)}): ${shown.join('; ')}.`;
}

function renderZones(p) {
  const box = $('#rZoneChips'), focus = box.contains(document.activeElement) ? document.activeElement.dataset.z : '', chosen = new Set(p.zones || []);
  box.innerHTML = TRAIN.map((z) => `<button type="button" class="chip${chosen.has(z.id) ? ' on' : ''}" data-z="${z.id}" aria-pressed="${chosen.has(z.id)}">${esc(z.n)}</button>`).join('');
  if (focus) $(`[data-z="${focus}"]`, box)?.focus({ preventScroll: true });
  const notes = [p.auto ? autoText(p.auto) : '', ...(p.missing || []).map((m) => WHY[m.why](TRAIN_BY[m.z]))].filter(Boolean);
  $('#rZoneMsg').textContent = notes.join(' ');
  const sk = skippedText(p);
  $('#rSkip').textContent = sk; $('#rSkip').hidden = !sk;
  renderNudge(p);
}

// Aviso suave: si en la última semana se repitieron las mismas zonas y alguna quedó sin trabajar, se ofrece añadirla
function renderNudge(p) {
  const box = $('#rNudge'), h = history(), r = rules(S.mood, iso(), painNow());
  const repeated = Object.values(h).some((x) => x.days >= 3), fresh = p.auto || (p.zones || []).some((z) => h[z].n === 0);
  const c = repeated && !fresh && leastTrained(h, r, p.min * 60, seeded(`${iso()}-aviso`)).find((x) => x.n === 0 && !p.ids.some((id) => covers(BY[id], x.z)));
  box.hidden = !c;
  if (!c) return;
  const z = TRAIN_BY[c.z];
  $('#rNudgeText').textContent = `Llevas una semana sin trabajar ${z.def}. ¿Hoy toca?`;
  const b = $('#rNudgeAdd'); b.textContent = `Añadir ${z.lc} a hoy`; b.dataset.z = c.z;
}

function setZones(zones) {
  const list = [...new Set(zones)].filter((z) => TRAIN_BY[z]);
  store.set('rutinaElige', { date: iso(), zones: list });
  store.set('rutinaHoy', buildPlan(S.plan?.min || defaultMinutes(), todayMood(), iso(), planOpt()));
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

// Anota qué zonas se han trabajado hoy (cuántos ejercicios de cada una). Se guardan 60 días.
function saveZones(done) {
  const zl = store.get('rutinaZonas', {}), day = zl[iso()] || {}, old = iso(new Date(Date.now() - 60 * 864e5));
  for (const id of done) for (const z of BY[id]?.z || []) day[z] = (day[z] || 0) + 1;
  zl[iso()] = day;
  for (const d of Object.keys(zl)) if (d < old) delete zl[d];
  store.set('rutinaZonas', zl);
}

function saveFeel(feel) {
  const log = store.get('rutinaLog', {}), done = [...new Set(P.done)];
  const sec = done.reduce((s, id) => s + (BY[id]?.sec || 0), 0);
  const prev = log[iso()] || { min: 0, ids: [] };
  log[iso()] = { min: prev.min + mins(sec), ids: [...new Set([...prev.ids, ...done])], feel };
  store.set('rutinaLog', log);
  saveZones(done);
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
  $('#rZoneChips').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-z]'); if (!b) return;
    const cur = todayZones();
    setZones(cur.includes(b.dataset.z) ? cur.filter((z) => z !== b.dataset.z) : [...cur, b.dataset.z]);
  });
  $('#rNudgeAdd').onclick = (ev) => setZones([...(S.plan.zones.length ? S.plan.zones : S.plan.auto ? [S.plan.auto.z] : []), ev.currentTarget.dataset.z]);
  document.addEventListener('dolorchange', render);
  document.addEventListener('moodchange', render);
  initPlayer(); render();
}

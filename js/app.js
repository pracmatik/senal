import { initChat } from './chat.js';
import { BASE_GLOSSARY } from './glossary.js';

const $ = (s, el = document) => el.querySelector(s);
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (d) => { const x = new Date(d); return isNaN(x) ? '' : x.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }); };

const STAGES = {
  laboratorio: [1, 'Laboratorio'], animales: [2, 'En animales'], personas_inicial: [3, 'En personas, estudio pequeño'],
  personas_grande: [3, 'En personas, estudio grande'], ensayo_abierto: [3, 'Ensayo en personas'], aprobado: [4, 'Aprobado'],
  revision: [0, 'Revisión de varios estudios'], preprint: [0, 'Sin revisar todavía'], noticia: [0, 'Noticia'], no_verificado: [0, 'Fase no indicada'],
};
const TOPIC = { sfn: 'Fibra pequeña', dolor: 'Dolor neuropático', ips: 'Células iPS', neuro: 'Sistema nervioso', otros: 'Otros campos' };

let DATA = { items: [] }, favs = new Set(store.get('favs', [])), filter = 'all', query = '', shown = 12;
const lastVisit = store.get('lastVisit', null);

function stageHTML(stage) {
  const [n, label] = STAGES[stage] || STAGES.no_verificado;
  const bars = [1, 2, 3, 4].map((i) => `<i class="${i < n ? 'on' : i === n ? 'cur' : ''}"></i>`).join('');
  return `<div class="stage"><div class="track ${n ? '' : 'off'}" aria-hidden="true">${bars}</div>${esc(label)}</div>`;
}

function itemHTML(x, compact) {
  const isNew = lastVisit && x.added > lastVisit.slice(0, 10);
  const terms = (x.glossary || []).map((g) => `<dt>${esc(g.term)}:</dt> <dd>${esc(g.plain)}</dd>`).join('');
  const share = `https://wa.me/?text=${encodeURIComponent(`${x.title_es}. ${x.summary_es} ${location.origin + location.pathname}#n-${x.id}`)}`;
  return `<li class="item" id="n-${esc(x.id)}" data-id="${esc(x.id)}">
    <button class="item-btn" aria-expanded="false">
      <span class="item-date">${fmtDate(x.date && x.date.length > 4 ? x.date : x.added)}${isNew ? '<span class="new">Nuevo para ti</span>' : ''}</span>
      <span><span class="item-title" role="heading" aria-level="3">${esc(x.title_es)}</span>
        <span class="item-sum">${esc(x.summary_es)}</span>
        ${compact ? '' : `<span class="item-topic">${TOPIC[x.topic] || ''}</span>`}</span>
      ${compact ? '' : stageHTML(x.stage)}
    </button>
    <div class="detail"><div><div class="detail-in">
      ${compact ? stageHTML(x.stage) : ''}
      <div><h4>Qué se ha hecho</h4><p>${esc(x.what)}</p></div>
      ${x.why ? `<div><h4>Por qué puede importar</h4><p>${esc(x.why)}</p></div>` : ''}
      ${x.missing ? `<div><h4>Qué falta por saber</h4><p>${esc(x.missing)}</p></div>` : ''}
      ${terms ? `<dl class="terms">${terms}</dl>` : ''}
      <p class="orig">Fuente: ${esc(x.source)}${x.who ? `, ${esc(x.who)}` : ''}. Título original: ${esc(x.title_orig)}</p>
      <div class="actions">
        <a class="src" href="${esc(x.url)}" target="_blank" rel="noopener">Leer la fuente original</a>
        <button data-act="fav" aria-pressed="${favs.has(x.id)}">${favs.has(x.id) ? 'Guardada' : 'Guardar'}</button>
        <button data-act="listen">Escuchar</button>
        <a href="${share}" target="_blank" rel="noopener">Enviar por WhatsApp</a>
        <button data-act="ask">Preguntar sobre esto</button>
      </div>
    </div></div></div>
  </li>`;
}

const byNewest = (a, b) => (b.added || '').localeCompare(a.added || '') || (b.date || '').localeCompare(a.date || '');
const papers = () => DATA.items.filter((x) => x.kind !== 'trial').sort(byNewest);

function renderMain() {
  const q = query.toLowerCase();
  let list = papers().filter((x) => x.topic === 'sfn' || x.topic === 'dolor');
  if (filter === 'fav') list = papers().filter((x) => favs.has(x.id));
  else if (filter !== 'all') list = list.filter((x) => x.topic === filter);
  if (q) list = papers().filter((x) => `${x.title_es} ${x.summary_es} ${x.what} ${x.title_orig}`.toLowerCase().includes(q));
  // La fibra pequeña va siempre primero dentro del mismo día
  list.sort((a, b) => byNewest(a, b) || (a.topic === 'sfn' ? -1 : 1));
  const el = $('#list-main');
  el.innerHTML = list.slice(0, shown).map((x) => itemHTML(x)).join('') ||
    `<li class="empty">${filter === 'fav' ? 'Aún no has guardado ninguna noticia. Abre una y pulsa Guardar.' : 'No hay noticias que coincidan. Prueba con otra palabra.'}</li>`;
  $('#more-main').hidden = list.length <= shown;
  $('#count').textContent = list.length ? `Mostrando ${Math.min(shown, list.length)} de ${list.length} noticias${q ? ` con ${query}` : ''}.` : '';
}

function renderList(sel, topics, max = 8) {
  const list = papers().filter((x) => topics.includes(x.topic)).slice(0, max);
  $(sel).innerHTML = list.map((x) => itemHTML(x, sel !== '#list-ips')).join('') || '<li class="empty">Hoy no hay novedades en este apartado.</li>';
}

function renderTrials() {
  const active = new Set(DATA.activeTrials || []);
  const eu = /Spain|France|Germany|Italy|Netherlands|Belgium|Portugal|Denmark|Sweden|Norway|Finland|Austria|Switzerland|United Kingdom|Ireland|Poland|Czech/i;
  const list = DATA.items.filter((x) => x.kind === 'trial' && active.has(x.id))
    .sort((a, b) => (eu.test((b.countries || []).join()) - eu.test((a.countries || []).join())));
  $('#list-trials').innerHTML = list.slice(0, 9).map((x) => {
    const c = x.countries || [];
    const spain = c.includes('Spain');
    return `<li class="trial"><h3>${esc(x.title_es)}</h3><p>${esc(x.summary_es)}</p>
      <p class="where">${spain ? '<b>Con centros en España.</b> ' : eu.test(c.join()) ? '<b>Con centros en Europa.</b> ' : ''}${c.length ? `Países: ${esc(c.slice(0, 6).join(', '))}${c.length > 6 ? ' y más' : ''}.` : ''}</p>
      <a href="${esc(x.url)}" target="_blank" rel="noopener">Ver requisitos y contacto</a></li>`;
  }).join('') || '<li class="trial"><p>Ahora mismo no hay ensayos abiertos registrados.</p></li>';
}

function renderGlossary() {
  const map = new Map(BASE_GLOSSARY.map((g) => [g.term.toLowerCase(), g]));
  DATA.items.forEach((x) => (x.glossary || []).forEach((g) => { if (map.size < 60 && !map.has(g.term.toLowerCase())) map.set(g.term.toLowerCase(), g); }));
  $('#glossary').innerHTML = [...map.values()].sort((a, b) => a.term.localeCompare(b.term, 'es'))
    .map((g) => `<div><dt>${esc(g.term)}</dt><dd>${esc(g.plain)}</dd></div>`).join('');
}

function renderStatus() {
  const up = new Date(DATA.updated);
  const today = new Date().toDateString() === up.toDateString();
  const hour = up.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const n = DATA.items.filter((x) => x.added === DATA.updated?.slice(0, 10) && x.kind !== 'trial').length;
  $('#heroDate').innerHTML = isNaN(up) ? 'No se han podido cargar las noticias. Vuelve a intentarlo en un rato.'
    : `${today ? `Actualizado hoy a las ${hour}` : `Última actualización el ${fmtDate(up)}`}. <b>${n} ${n === 1 ? 'novedad' : 'novedades'}</b> en la última revisión.`;
  $('#status').textContent = isNaN(up) ? '' : `Última revisión de fuentes: ${up.toLocaleString('es-ES')}. Noticias guardadas: ${papers().length}.`;
}

function renderAll() {
  renderMain(); renderTrials(); renderGlossary(); renderStatus();
  renderList('#list-ips', ['ips']); renderList('#list-neuro', ['neuro']); renderList('#list-otros', ['otros'], 6);
}

function toggle(li) {
  const open = !li.classList.contains('open');
  li.classList.toggle('open', open);
  $('.item-btn', li).setAttribute('aria-expanded', open);
}

function onListClick(e) {
  const li = e.target.closest('.item');
  if (!li) return;
  const x = DATA.items.find((i) => i.id === li.dataset.id);
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (e.target.closest('.item-btn')) return toggle(li);
  if (act === 'fav') {
    favs.has(x.id) ? favs.delete(x.id) : favs.add(x.id);
    store.set('favs', [...favs]);
    e.target.setAttribute('aria-pressed', favs.has(x.id)); e.target.textContent = favs.has(x.id) ? 'Guardada' : 'Guardar';
  }
  if (act === 'listen') listen(x, e.target);
  if (act === 'ask') window.dispatchEvent(new CustomEvent('ask', { detail: `Sobre esta noticia: ${x.title_es}. ¿Qué significa para un paciente y qué más se sabe?` }));
}

function listen(x, btn) {
  if (!('speechSynthesis' in window)) return;
  if (speechSynthesis.speaking) { speechSynthesis.cancel(); btn.textContent = 'Escuchar'; return; }
  const u = new SpeechSynthesisUtterance(`${x.title_es}. ${x.summary_es} ${x.what} ${x.why || ''} ${x.missing || ''}`);
  u.lang = 'es-ES'; u.rate = 0.95; u.onend = () => (btn.textContent = 'Escuchar');
  speechSynthesis.speak(u); btn.textContent = 'Parar';
}

function initTips() {
  const tip = $('#tip');
  let owner = null;
  const show = (b) => {
    owner = b; tip.textContent = b.dataset.tip; tip.hidden = false; b.setAttribute('aria-expanded', 'true');
    b.setAttribute('aria-describedby', 'tip');
    const r = b.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = `${Math.max(16, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 16))}px`;
    tip.style.top = `${r.bottom + h + 12 > innerHeight ? r.top - h - 10 : r.bottom + 10}px`;
    requestAnimationFrame(() => tip.classList.add('show'));
  };
  const hide = () => { if (owner) owner.setAttribute('aria-expanded', 'false'); owner = null; tip.classList.remove('show'); tip.hidden = true; };
  document.querySelectorAll('.info').forEach((b) => {
    b.setAttribute('aria-label', 'Ayuda: ' + b.dataset.tip.slice(0, 60));
    b.setAttribute('aria-expanded', 'false');
    b.addEventListener('mouseenter', () => show(b)); b.addEventListener('mouseleave', hide);
    b.addEventListener('focus', () => show(b)); b.addEventListener('blur', hide);
    b.addEventListener('click', (e) => { e.stopPropagation(); owner === b ? hide() : show(b); });
  });
  document.addEventListener('click', hide); addEventListener('scroll', hide, { passive: true });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && hide());
}

function initPrefs() {
  const root = document.documentElement, sizes = ['m', 'l', 'xl'];
  const apply = () => { root.dataset.size = store.get('size', 'm'); const t = store.get('theme', null); t ? (root.dataset.theme = t) : delete root.dataset.theme; };
  apply();
  $('#fontBtn').onclick = () => { store.set('size', sizes[(sizes.indexOf(store.get('size', 'm')) + 1) % 3]); apply(); };
  $('#themeBtn').onclick = () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    store.set('theme', dark ? 'light' : 'dark'); apply(); document.dispatchEvent(new Event('themechange'));
  };
}

function initControls() {
  document.querySelectorAll('.chip').forEach((c) => c.onclick = () => {
    document.querySelectorAll('.chip').forEach((o) => o.classList.toggle('on', o === c));
    filter = c.dataset.f; shown = 12; renderMain();
  });
  let t; $('#q').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { query = e.target.value.trim(); renderMain(); }, 200); });
  $('#more-main').onclick = () => { shown += 12; renderMain(); };
  ['#list-main', '#list-ips', '#list-neuro', '#list-otros'].forEach((s) => $(s).addEventListener('click', onListClick));
  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { $('.skin').classList.add('seen'); o.disconnect(); } }, { threshold: .4 }).observe($('.skin'));
}

// Barra de progreso, sección activa en el menú, botón de subir y atajo del buscador
function initNav() {
  const links = [...document.querySelectorAll('.bar-nav a')], bar = $('#progress'), top = $('#toTop');
  const spy = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    links.forEach((a) => { const on = a.getAttribute('href') === `#${e.target.id}`; a.classList.toggle('on', on); if (on) a.scrollIntoView({ block: 'nearest', inline: 'nearest' }); });
  }), { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((a) => { const s = document.querySelector(a.getAttribute('href')); if (s) spy.observe(s); });
  spy.observe($('.hero'));
  let q = false;
  const upd = () => {
    q = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', max > 0 ? (scrollY / max).toFixed(4) : 0);
    top.hidden = scrollY < innerHeight;
  };
  addEventListener('scroll', () => { if (!q) { q = true; requestAnimationFrame(upd); } }, { passive: true });
  upd();
  top.onclick = () => { scrollTo({ top: 0 }); $('.brand').focus({ preventScroll: true }); };
  document.addEventListener('keydown', (e) => {
    if (e.key !== '/' || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    e.preventDefault(); $('#q').scrollIntoView({ block: 'center' }); $('#q').focus({ preventScroll: true });
  });
}

function openFromHash() {
  const li = location.hash.startsWith('#n-') && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (li) { toggle(li); li.scrollIntoView({ block: 'center' }); }
  else if (location.hash.length > 1) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
}

async function load() {
  try {
    const r = await fetch(`data/news.json?v=${new Date().toISOString().slice(0, 13)}`);
    if (!r.ok) throw new Error(r.status);
    DATA = await r.json();
  } catch { DATA = { items: [], updated: null }; }
  renderAll(); openFromHash();
  store.set('lastVisit', new Date().toISOString());
}

initPrefs(); initTips(); initControls(); initNav(); initChat(); load();
import('./nerve.js?v=9').then((m) => m.mountNerve($('#nerve'))).catch(() => {});

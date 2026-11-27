// Movimiento de la web, con tres familias y nada más:
// 1) los titulares suben línea a línea desde su máscara, al ritmo del scroll;
// 2) los bloques de texto y listas aparecen con un desplazamiento corto;
// 3) las figuras (muñecos, piel) se asientan desde una escala mínima.
// Todo es opcional: si las librerías no cargan o se pide menos movimiento, la web se queda quieta y entera.
const CDN = 'https://cdn.jsdelivr.net/npm/';
const SRC = [
  `${CDN}gsap@3.15.1/index.js`,
  `${CDN}gsap@3.15.1/ScrollTrigger.js`,
  `${CDN}gsap@3.15.1/SplitText.js`,
  `${CDN}lenis@1.3.29/dist/lenis.mjs`,
];
const HEADS = '.view-head h2, .block-head h2, .home-grid .card-head h2, .about > h2, .pm-head h3';
const BLOCKS = [
  '.view-intro', '.block-intro', '.home-grid > .card > :not(.card-head)', '.r-zones', '.r-top > .card', '.r-item', '.r-safety',
  '.news > .item', '.trial', '.g-card', '.pm', '.d-form', '.d-side', '.visit', '.explain-text > *', '.glossary dl > *',
  '.cols > div', '.filters', '.about > p', '.block-side > p',
].join(',');
const FIGS = '.mini-figs figure, .skin';

const root = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const release = () => root.classList.remove('m-wait');

let gsap, ST, Split, lenis = null, heroRun = null, booted = false;

export async function initMotion() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { release(); return null; }
  try {
    const mods = await Promise.all(SRC.map((u) => import(u)));
    [gsap, ST, Split] = mods.slice(0, 3).map((m) => m.default);
    gsap.registerPlugin(ST, Split);
    lenis = startLenis(mods[3].default);
    root.classList.add('has-motion');
    ST.config({ ignoreMobileResize: true });
    indicators(); magnetic(); backdrop(); feedback(); watch();
    document.addEventListener('viewchange', (e) => onView(e.detail));
    await onView(root.dataset.page || 'inicio');
    booted = true;
    document.fonts?.ready.then(() => { moveIndicators(true); ST.refresh(); });
    return lenis;
  } catch (err) {
    console.warn('Movimiento desactivado, la web sigue igual:', err);
    release();
    if (gsap) gsap.set('[data-rv], .hello-text > *, .hello-stage, .view, .split-line', { clearProps: 'opacity,transform' });
    return null;
  }
}

function startLenis(Lenis) {
  const l = new Lenis({
    autoRaf: false, lerp: 0.1, wheelMultiplier: 0.9,
    prevent: (node) => !!node.closest?.('dialog, .chat, [data-lenis-prevent]'),
  });
  l.on('scroll', ST.update);
  gsap.ticker.add((t) => l.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  return l;
}

// Cambio de pantalla: el contenido aparece en su sitio (el vídeo de fondo ya se funde por su cuenta)
async function onView(id) {
  const view = document.getElementById(id);
  if (!view) return;
  moveIndicators(!booted);
  lenis?.resize();
  if (id === 'inicio') await hero(booted);
  else {
    release();
    if (booted) gsap.fromTo(view, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out', clearProps: 'opacity' });
  }
  headings(view); reveal(view);
  if (id === 'rutina') rutinaNumbers();
  if (id === 'inicio') countUp($('#homeRutina b'), ' minutos');
  requestAnimationFrame(() => ST.refresh());
}

// Saludo: fecha, el titular línea a línea, luego la pregunta y la escala de caras
async function hero(again) {
  const h1 = $('#hello');
  if (!h1) return release();
  if (!again && !root.classList.contains('m-wait')) return; // llegó tarde: no esconder lo que ya se ve
  if (!again) await Promise.race([document.fonts?.ready, sleep(900)]);
  heroRun?.progress(1);
  const split = Split.create(h1, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
  release();
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => split.revert() });
  tl.from('#todayDate', { opacity: 0, x: -12, duration: 0.8 }, 0)
    .from(split.lines, { yPercent: 108, duration: 1.25, stagger: 0.11 }, 0.1)
    .from('.hello-stage', { opacity: 0, scale: 0.97, duration: 1.6, clearProps: 'transform' }, 0.25)
    .from('#moodQ', { opacity: 0, y: 10, duration: 0.8 }, '-=0.9')
    .from('#moods', { opacity: 0, y: 14, duration: 0.8, ease: 'power3.out', clearProps: 'transform' }, '-=0.65')
    .from('#moodReply, .hello-pain', { opacity: 0, duration: 0.6 }, '-=0.4');
  if (again) tl.timeScale(1.8);
  heroRun = tl;
}

// Titulares: cada línea sube desde su máscara mientras el titular entra en pantalla, ligada al scroll
function headings(scope) {
  $$(HEADS, scope).forEach((h) => {
    if (h.dataset.split || !h.offsetParent) return;
    h.dataset.split = '1';
    Split.create(h, {
      type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
      onSplit: (self) => gsap.from(self.lines, {
        yPercent: 104, ease: 'none', stagger: 0.12,
        scrollTrigger: { trigger: h, start: 'top 97%', end: 'top 70%', scrub: 0.5 },
      }),
    });
  });
}

// Bloques y figuras: entran una vez, con un escalonado corto entre vecinas
function reveal(scope) {
  const pick = (sel) => $$(sel, scope).filter((el) => !el.dataset.rv && !el.closest('[hidden], .hello, dialog') && el.offsetParent);
  const blocks = pick(BLOCKS), figs = pick(FIGS);
  if (blocks.length) {
    blocks.forEach((el) => { el.dataset.rv = 'wait'; });
    gsap.set(blocks, { opacity: 0, y: 18 });
    ST.batch(blocks, { start: 'top 94%', once: true, onEnter: (b) => show(b, { y: 0 }, 0.05) });
  }
  if (figs.length) {
    figs.forEach((el) => { el.dataset.rv = 'wait'; });
    gsap.set(figs, { opacity: 0, scale: 0.965 });
    ST.batch(figs, { start: 'top 96%', once: true, onEnter: (b) => show(b, { scale: 1, duration: 1.3, ease: 'expo.out' }, 0.06) });
  }
}

function show(els, to = {}, stagger = 0) {
  els.forEach((el) => { el.dataset.rv = 'in'; });
  gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger, overwrite: true, clearProps: 'transform,opacity', ...to });
}

// Lo que se pinta después (noticias, rutina, guía, diario) también entra con movimiento
function watch() {
  let t;
  new MutationObserver(() => {
    clearTimeout(t);
    t = setTimeout(() => {
      const view = $('.view:not([hidden])');
      if (view) reveal(view);
      ST.refresh();
    }, 160);
  }).observe($('#main'), { childList: true, subtree: true });
  // Quien navega con teclado nunca llega a algo invisible
  document.addEventListener('focusin', (e) => {
    const el = e.target.closest?.('[data-rv="wait"]');
    if (el) show([el]);
  });
}

function countUp(el, suffix) {
  const n = parseInt(el?.textContent, 10);
  if (!el || !(n > 0)) return;
  const o = { v: 0 };
  gsap.to(o, { v: n, duration: 1.4, delay: 0.5, ease: 'power3.out', onUpdate: () => { el.textContent = `${Math.round(o.v)}${suffix}`; } });
}

function rutinaNumbers() {
  const ring = $('#rRing');
  const p = parseFloat(ring?.style.getPropertyValue('--p')) || 0;
  if (ring && p > 0) {
    ring.style.transition = 'none';
    gsap.fromTo(ring, { '--p': 0 }, { '--p': p, duration: 1.6, delay: 0.2, ease: 'expo.out', onComplete: () => { ring.style.transition = ''; } });
  }
  countUp($('#rStats strong'), ' min');
}

// Raya bajo la pestaña abierta: fina arriba en ordenador, cobalto sobre el icono en el móvil
function indicators() {
  $$('.bar-nav, .tabbar').forEach((nav) => {
    const ind = document.createElement('span');
    ind.className = 'nav-ind'; ind.setAttribute('aria-hidden', 'true');
    nav.prepend(ind);
  });
  addEventListener('resize', () => moveIndicators(true));
}

function moveIndicators(instant) {
  $$('.nav-ind').forEach((ind) => {
    const a = ind.parentElement.querySelector('a.on');
    if (!a || !a.offsetWidth) return gsap.set(ind, { opacity: 0 });
    gsap.to(ind, { x: a.offsetLeft, y: a.offsetTop, width: a.offsetWidth, height: a.offsetHeight, opacity: 1, duration: instant ? 0 : 0.6, ease: 'expo.out' });
  });
}

// Botones principales: con ratón se dejan atraer un poco, como algo con peso
function magnetic() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  $$('.btn.primary, .ask-fab').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' }), y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * 0.12); y((e.clientY - r.top - r.height / 2) * 0.18);
    });
    el.addEventListener('pointerleave', () => { x(0); y(0); });
  });
}

// Fondo: el vídeo se acerca un poco y sube despacio al bajar, para dar profundidad sin distraer
function backdrop() {
  const media = $('.bgv-media');
  if (!media || root.classList.contains('bgv-still')) return;
  gsap.fromTo(media, { scale: 1.06, yPercent: 0 }, { scale: 1, yPercent: -3, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 1 } });
  if ($('.hello-fig')) {
    gsap.to('.hello-fig', { yPercent: -6, ease: 'none', scrollTrigger: { trigger: '.hello', start: 'top top', end: 'bottom top', scrub: true } });
  }
}

// Respuesta al tocar: la cara elegida se asienta y el número de minutos se recoloca al cambiar
function feedback() {
  document.addEventListener('moodchange', () => {
    const svg = $('#moods [aria-checked="true"] svg');
    if (svg) gsap.fromTo(svg, { scale: 0.86 }, { scale: 1, duration: 0.5, ease: 'power3.out' });
    gsap.fromTo('#moodReply', { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
  });
  const pop = () => gsap.fromTo('#rMin', { y: 6, opacity: 0.4 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });
  $('.stepper')?.addEventListener('click', (e) => e.target.closest('button') && pop());
  $('.r-chips')?.addEventListener('click', (e) => e.target.closest('.chip') && pop());
  $('#rMin')?.addEventListener('change', pop);
}

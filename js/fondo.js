// Vídeo de fondo de cada pantalla, bajo un velo del color del papel para que el texto se lea igual.
// Solo se carga el vídeo de la pantalla abierta; al cambiar de pantalla se funden y el anterior se pausa.
// Con menos movimiento pedido o ahorro de datos se enseña la foto fija, sin vídeo.
const BY_VIEW = { rutina: 'rutina', 'v-diario': 'diario', noticias: 'noticias', aprender: 'aprender' };
const BY_PART = { dia: 'manana', tarde: 'tarde', noche: 'noche' };
const root = document.documentElement;
const still = matchMedia('(prefers-reduced-motion: reduce)').matches || !!navigator.connection?.saveData;

let box = null, current = null;
const layers = new Map();

// Misma franja horaria que el saludo de la portada (lo marca inicio.js en la página)
function partOfDay() {
  if (BY_PART[root.dataset.daypart]) return BY_PART[root.dataset.daypart];
  const h = new Date().getHours();
  return h >= 6 && h < 14 ? 'manana' : h >= 14 && h < 21 ? 'tarde' : 'noche';
}

const nameFor = (view) => (view === 'inicio' ? partOfDay() : BY_VIEW[view]);

function build(name) {
  const poster = `media/${name}.jpg`;
  if (still) {
    const img = new Image();
    img.alt = ''; img.decoding = 'async'; img.src = poster;
    return img;
  }
  const v = document.createElement('video');
  v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
  v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
  v.preload = 'metadata'; v.poster = poster; v.disablePictureInPicture = true;
  v.src = `media/${name}${innerWidth < 768 ? '-movil' : ''}.mp4`;
  return v;
}

function play(el) {
  if (el?.tagName !== 'VIDEO' || document.hidden) return;
  el.play()?.catch(() => {}); // si el navegador no deja reproducir, se queda la foto fija
}

function show(view) {
  const name = nameFor(view);
  if (!name || name === current) return;
  current = name;
  let el = layers.get(name);
  if (!el) { el = build(name); el.className = 'bgv-layer'; layers.set(name, el); box.append(el); }
  requestAnimationFrame(() => {
    layers.forEach((o, k) => {
      const on = k === name;
      o.classList.toggle('on', on);
      if (!on && o.tagName === 'VIDEO') setTimeout(() => k !== current && o.pause(), 1200);
    });
    play(el);
  });
}

export function initFondo() {
  box = document.querySelector('.bgv-media');
  if (!box) return;
  root.classList.toggle('bgv-still', still);
  document.addEventListener('viewchange', (e) => show(e.detail));
  document.addEventListener('visibilitychange', () => {
    const el = layers.get(current);
    if (el?.tagName !== 'VIDEO') return;
    document.hidden ? el.pause() : play(el);
  });
  // El saludo cambia de franja cada 10 minutos: si toca, cambia también el vídeo de la portada
  setInterval(() => { if (root.dataset.page === 'inicio') show('inicio'); }, 6e5);
  show(root.dataset.page || 'inicio');
}

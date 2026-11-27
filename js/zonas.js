// Zonas del cuerpo. Dos listas que se hablan entre sí:
// 1) zonas del mapa de dolor (lo que se toca en el muñeco) y 2) zonas de la rutina (lo que se quiere trabajar).
// Sin pantalla: solo datos y cuentas, para poder probarlo fuera del navegador.

export const PAIN_LIMIT = 6; // desde este dolor (0 a 10) la rutina evita lo que carga esa zona

const pair = (k, i, d, group, train, stand = false) => [
  { id: `${k}-i`, k, side: 'i', n: i, group, train, stand },
  { id: `${k}-d`, k, side: 'd', n: d, group, train, stand },
];
const one = (id, n, group, train) => ({ id, k: id, side: '', n, group, train, stand: false });

// train: zonas de rutina que carga ese dolor · stand: si además se evita estar de pie
export const PAIN_GROUPS = ['Cuello y espalda', 'Brazos y manos', 'Caderas y piernas', 'Pies'];
export const PAIN_ZONES = [
  one('cuello', 'Cuello', 0, ['cuello']),
  one('espalda-alta', 'Espalda alta', 0, ['espalda']),
  one('lumbar', 'Zona lumbar', 0, ['espalda']),
  ...pair('hombro', 'Hombro izquierdo', 'Hombro derecho', 1, ['cuello', 'brazos']),
  ...pair('codo', 'Codo izquierdo', 'Codo derecho', 1, ['brazos']),
  ...pair('muneca', 'Muñeca izquierda', 'Muñeca derecha', 1, ['brazos', 'manos']),
  ...pair('mano', 'Mano y dedos izquierda', 'Mano y dedos derecha', 1, ['manos']),
  ...pair('cadera', 'Cadera izquierda', 'Cadera derecha', 2, ['cadera'], true),
  ...pair('rodilla', 'Rodilla izquierda', 'Rodilla derecha', 2, ['piernas'], true),
  ...pair('tobillo', 'Tobillo izquierdo', 'Tobillo derecho', 3, ['pies'], true),
  ...pair('pie', 'Pie izquierdo (planta)', 'Pie derecho (planta)', 3, ['pies'], true),
  ...pair('dedos-pie', 'Dedos del pie izquierdo', 'Dedos del pie derecho', 3, ['pies'], true),
]; // group es la posición en PAIN_GROUPS
export const PAIN_BY = Object.fromEntries(PAIN_ZONES.map((z) => [z.id, z]));
export const zoneName = (id) => PAIN_BY[id]?.n || id;

export const KINDS = [
  ['articulacion', 'De la articulación'],
  ['nervios', 'De los nervios (quemazón, hormigueo, pinchazos)'],
  ['nose', 'No lo sé'],
];
export const KIND_SHORT = { articulacion: 'articulación', nervios: 'nervios', nose: 'sin saber' };
export const CAUSES = ['He pisado mal', 'Me he dado un golpe', 'He andado mucho', 'He dormido mal', 'Frío o calor', 'Sin motivo claro'];

// Para crear un día nuevo desde el mapa: a qué casilla de «Dónde» del diario corresponde cada zona
const DIARY_ZONE = { cuello: 'Tronco', 'espalda-alta': 'Tronco', lumbar: 'Tronco', hombro: 'Brazos', codo: 'Brazos', muneca: 'Manos', mano: 'Manos',
  cadera: 'Piernas', rodilla: 'Piernas', tobillo: 'Pies', pie: 'Pies', 'dedos-pie': 'Pies' };
export const diaryZones = (body) => [...new Set((body || []).map((b) => DIARY_ZONE[PAIN_BY[b.z]?.k]).filter(Boolean))];

// Zonas de la rutina. lc: cómo se dice en una frase · def: con artículo · pron: «las trabajas»
export const TRAIN = [
  { id: 'pies', n: 'Pies y tobillos', lc: 'pies y tobillos', def: 'los pies y los tobillos', pron: 'los' },
  { id: 'piernas', n: 'Piernas', lc: 'piernas', def: 'las piernas', pron: 'las' },
  { id: 'cadera', n: 'Cadera', lc: 'cadera', def: 'la cadera', pron: 'la' },
  { id: 'espalda', n: 'Espalda', lc: 'espalda', def: 'la espalda', pron: 'la' },
  { id: 'cuello', n: 'Cuello y hombros', lc: 'cuello y hombros', def: 'el cuello y los hombros', pron: 'los' },
  { id: 'brazos', n: 'Brazos', lc: 'brazos', def: 'los brazos', pron: 'los' },
  { id: 'manos', n: 'Manos y dedos', lc: 'manos y dedos', def: 'las manos y los dedos', pron: 'las' },
  { id: 'equilibrio', n: 'Equilibrio', lc: 'equilibrio', def: 'el equilibrio', pron: 'lo' },
  { id: 'calma', n: 'Respiración y calma', lc: 'respiración y calma', def: 'la respiración y la calma', pron: 'la' },
];
export const TRAIN_BY = Object.fromEntries(TRAIN.map((z) => [z.id, z]));
export const trainList = (ids) => ids.map((id) => TRAIN_BY[id]?.lc).filter(Boolean).join(', ');

/* ---------- dolor de hoy ---------- */
export function cleanBody(raw) {
  if (!Array.isArray(raw)) return undefined;
  const seen = new Set();
  return raw.filter((b) => b && PAIN_BY[b.z] && !seen.has(b.z) && seen.add(b.z)).map((b) => ({
    z: b.z,
    t: KINDS.some(([k]) => k === b.t) ? b.t : 'nose',
    i: Number.isInteger(b.i) ? Math.min(10, Math.max(0, b.i)) : 5,
    c: (Array.isArray(b.c) ? b.c : []).filter((c) => CAUSES.includes(c)),
    x: typeof b.x === 'string' ? b.x.trim().slice(0, 120) : '',
  }));
}

// Lo que hoy duele fuerte y, por tanto, la rutina debe evitar
export function painToday(diary, date) {
  const body = cleanBody(diary?.[date]?.body) || [];
  const items = body.filter((b) => b.i >= PAIN_LIMIT).sort((a, b) => b.i - a.i);
  const train = new Set(items.flatMap((b) => PAIN_BY[b.z].train));
  const stand = items.some((b) => PAIN_BY[b.z].stand);
  return { items, train, stand, key: items.map((b) => `${b.z}${b.i}`).sort().join(',') };
}

/* ---------- resumen de varios días ---------- */
// Cuenta, para cada zona, en cuántos días apuntados salió, con qué fuerza y de qué tipo.
export function bodyStats(diary, from, to = '9999-12-31') {
  const days = Object.keys(diary || {}).filter((d) => d >= from && d <= to && Array.isArray(diary[d]?.body)).sort();
  const by = {};
  for (const d of days) {
    for (const b of cleanBody(diary[d].body)) {
      const s = (by[b.z] ||= { z: b.z, days: 0, sum: 0, max: 0, kinds: { articulacion: 0, nervios: 0, nose: 0 } });
      s.days++; s.sum += b.i; s.max = Math.max(s.max, b.i); s.kinds[b.t]++;
    }
  }
  const zones = Object.values(by).map((s) => ({ ...s, avg: s.sum / s.days, freq: s.days / days.length }))
    .sort((a, b) => b.days - a.days || b.avg - a.avg);
  const kinds = { articulacion: 0, nervios: 0, nose: 0 };
  zones.forEach((s) => { for (const k in kinds) kinds[k] += s.kinds[k]; });
  return { days: days.length, zones, kinds, total: zones.reduce((n, s) => n + s.days, 0) };
}

const num = (n) => n.toFixed(1).replace('.', ',');
export function bodyLines(st, max = 6) {
  return st.zones.slice(0, max).map((s) => {
    const main = Object.entries(s.kinds).sort((a, b) => b[1] - a[1])[0];
    return `${zoneName(s.z)}: ${s.days} de ${st.days} ${st.days === 1 ? 'día apuntado' : 'días apuntados'}, intensidad media ${num(s.avg)} de 10${main[1] ? `, sobre todo ${KIND_SHORT[main[0]]}` : ''}`;
  });
}
export function kindSplit(st) {
  if (!st.total) return '';
  return Object.entries(st.kinds).filter(([, n]) => n).sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${KIND_SHORT[k]} ${Math.round((n / st.total) * 100)} %`).join(', ');
}

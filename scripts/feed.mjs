// Crea data/avisos.xml: un canal de avisos (RSS) solo con lo importante de fibra pequeña y dolor
// neuropático: ensayos con centros en España o Europa y tratamientos aprobados o estudios grandes.
import { readFile, writeFile } from 'node:fs/promises';
import { isImportant } from '../js/avisos-regla.js';

const SITE = 'https://pracmatik.github.io/senal/';
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

const data = JSON.parse(await readFile(new URL('../data/news.json', import.meta.url), 'utf8'));
const items = data.items.filter(isImportant).sort((a, b) => b.added.localeCompare(a.added)).slice(0, 40);
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>Señal: avisos importantes</title><link>${SITE}</link><language>es-ES</language>
<description>Ensayos con centros en España o Europa y tratamientos aprobados sobre fibra pequeña y dolor neuropático.</description>
${items.map((x) => `<item><title>${esc(x.title_es)}</title><link>${SITE}#n-${esc(x.id)}</link><guid isPermaLink="false">${esc(x.id)}</guid><pubDate>${new Date(x.added + 'T06:00:00Z').toUTCString()}</pubDate><description>${esc(x.summary_es)}</description></item>`).join('\n')}
</channel></rss>`;
await writeFile(new URL('../data/avisos.xml', import.meta.url), xml);
console.log(`Avisos: ${items.length}`);

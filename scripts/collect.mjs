// Recogida diaria: busca novedades, las resume en castellano llano (vía n8n) y actualiza data/news.json.
// Si algo falla, termina en rojo (código 1) para que GitHub avise; nunca borra lo que ya había.
import { readFile, writeFile } from 'node:fs/promises';
import { TOPICS, CAPS, CAPS_BACKFILL } from './sources.mjs';
import * as F from './fetchers.mjs';

const FILE = new URL('../data/news.json', import.meta.url);
const { N8N_RESUMIR_URL: URL_IA, N8N_KEY: KEY } = process.env;
if (!URL_IA || !KEY) { console.error('Faltan N8N_RESUMIR_URL o N8N_KEY'); process.exit(1); }

const errors = [];
const tryIt = async (label, fn) => { try { return await fn(); } catch (e) { errors.push(`${label}: ${e.message}`); return []; } };
const normTitle = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 70);

async function gather(backfill) {
  const days = backfill ? 60 : 7, caps = backfill ? CAPS_BACKFILL : CAPS, out = {};
  for (const [topic, s] of Object.entries(TOPICS)) {
    const parts = [];
    if (s.pubmed) parts.push(await tryIt(`PubMed ${topic}`, () => F.pubmed(topic, s.pubmed, days, caps[topic] * 2)));
    if (s.europepmc) parts.push(await tryIt(`EuropePMC ${topic}`, () => F.europepmc(topic, s.europepmc, days, 6)));
    if (s.mx) parts.push(await tryIt(`MedicalXpress ${topic}`, () => F.medicalxpress(topic, s.mx, 8)));
    for (const u of s.rss || []) parts.push(await tryIt(`RSS ${u}`, () => F.rss(topic, u, 10)));
    // Alterna fuentes para que ninguna acapare el cupo del día
    const list = [];
    for (let i = 0; parts.some((p) => p[i]); i++) parts.forEach((p) => p[i] && list.push(p[i]));
    out[topic] = list;
  }
  out.trials = [
    ...await tryIt('Ensayos SFN', () => F.trials('sfn', TOPICS.sfn.trials, 8)),
    ...await tryIt('Ensayos dolor', () => F.trials('dolor', TOPICS.dolor.trials, 10)),
  ];
  return { out, caps };
}

function pickNew(groups, caps, seen) {
  const picked = [];
  for (const [g, list] of Object.entries(groups)) {
    let n = 0;
    for (const c of list) {
      const t = normTitle(c.title);
      if (n >= caps[g] || seen.has(c.id) || seen.has(t)) continue;
      seen.add(c.id); seen.add(t); picked.push(c); n++;
    }
  }
  return picked;
}

async function summarize(batch) {
  for (let i = 0; i < 2; i++) {
    const r = await fetch(URL_IA, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-neuro-key': KEY },
      body: JSON.stringify({ items: batch.map(({ countries, phase, ...b }) => b) }),
    }).catch((e) => ({ ok: false, status: e.message }));
    const body = r.ok ? await r.text() : '';
    try { const j = JSON.parse(body); if (Array.isArray(j.items) && j.items.length) return j.items; } catch {}
    console.warn(`Lote fallido (intento ${i + 1}): ${r.status} ${body.slice(0, 120)}`);
  }
  throw new Error(`no se pudo resumir un lote de ${batch.length}`);
}

function valid(s) {
  return s && s.keep && [s.title_es, s.summary_es, s.what].every((x) => typeof x === 'string' && x.length > 10);
}

async function main() {
  const prev = JSON.parse(await readFile(FILE, 'utf8').catch(() => '{"items":[]}'));
  const backfill = prev.items.length === 0 || process.env.BACKFILL === '1';
  const seen = new Set([...(prev.seen || []), ...prev.items.flatMap((x) => [x.id, normTitle(x.title_orig || '')])]);
  const { out, caps } = await gather(backfill);
  const fresh = pickNew(out, caps, seen);
  console.log(`Candidatos nuevos: ${fresh.length}`);

  const today = new Date().toISOString().slice(0, 10), added = [], rejected = [];
  for (let i = 0; i < fresh.length; i += 8) {
    const batch = fresh.slice(i, i + 8);
    const res = await tryIt('Resumen IA', () => summarize(batch));
    for (const s of res) {
      const src = batch.find((b) => b.id === s.id);
      if (!src) continue;
      if (!valid(s)) { rejected.push(src.id); continue; }
      added.push({
        id: src.id, topic: src.topic, kind: src.kind, source: src.source, url: src.url, date: src.date, added: today,
        title_orig: src.title, countries: src.countries, phase: src.phase,
        stage: s.stage, title_es: s.title_es, summary_es: s.summary_es, what: s.what, why: s.why, missing: s.missing, who: s.who, glossary: s.glossary,
      });
    }
  }
  const cutoff = new Date(Date.now() - 180 * 864e5).toISOString().slice(0, 10);
  const items = [...added, ...prev.items].filter((x) => x.added >= cutoff).slice(0, 900);
  const activeTrials = out.trials.map((t) => t.id);
  const data = {
    updated: new Date().toISOString(), added_today: added.length,
    activeTrials: activeTrials.length ? activeTrials : prev.activeTrials || [],
    seen: [...new Set([...(prev.seen || []), ...rejected])].slice(-3000),
    errors, items,
  };
  await writeFile(FILE, JSON.stringify(data));
  console.log(`Añadidas ${added.length}. Total ${items.length}. Errores: ${errors.length}`);
  errors.forEach((e) => console.error(' - ' + e));
  if (errors.length && added.length === 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });

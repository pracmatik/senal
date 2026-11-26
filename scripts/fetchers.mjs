// Lectores de cada fuente. Devuelven candidatos con la misma forma:
// { id, kind, topic, source, url, date, title, text, extra }
const UA = { 'user-agent': 'neuro-avances/1.0 (lector de noticias medicas)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, type = 'text') {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(url, { headers: UA }).catch((e) => ({ ok: false, status: e.message }));
    if (r.ok) return type === 'json' ? r.json() : r.text();
    await sleep(1500 * (i + 1));
    if (i === 2) throw new Error(`${url.slice(0, 90)} respondió ${r.status}`);
  }
}

const decode = (s = '') => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
  .replace(/\s+/g, ' ').trim();
const tag = (xml, t) => { const m = xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? decode(m[1]) : ''; };
const iso = (d) => { const x = new Date(d); return isNaN(x) ? '' : x.toISOString().slice(0, 10); };

export async function pubmed(topic, term, days, max) {
  const base = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
  const s = await get(`${base}esearch.fcgi?db=pubmed&retmode=json&sort=pub_date&retmax=${max}&datetype=edat&reldate=${days}&term=${encodeURIComponent(term + ' AND hasabstract')}`, 'json');
  const ids = s.esearchresult?.idlist || [];
  if (!ids.length) return [];
  await sleep(400);
  const xml = await get(`${base}efetch.fcgi?db=pubmed&retmode=xml&id=${ids.join(',')}`);
  return xml.split('<PubmedArticle>').slice(1).map((a) => {
    const pmid = tag(a, 'PMID');
    const types = [...a.matchAll(/<PublicationType[^>]*>([^<]+)</g)].map((m) => m[1]).join(', ');
    const abs = [...a.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)].map((m) => decode(m[1])).join(' ');
    const y = tag(a.split('<PubDate>')[1] || '', 'Year');
    return {
      id: `pmid:${pmid}`, kind: 'paper', topic, source: tag(a, 'Title') || 'PubMed',
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`, date: y, title: tag(a, 'ArticleTitle'),
      text: abs, extra: `Tipo de publicación: ${types}`,
    };
  }).filter((x) => x.title && x.text);
}

export async function europepmc(topic, query, days, max) {
  const from = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  const q = `${query} AND FIRST_PDATE:[${from} TO 3000-01-01]`;
  const r = await get(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&resultType=core&pageSize=${max}&sort=P_PDATE_D%20desc&query=${encodeURIComponent(q)}`, 'json');
  return (r.resultList?.result || []).filter((x) => x.abstractText).map((x) => ({
    id: x.doi ? `doi:${x.doi.toLowerCase()}` : `epmc:${x.id}`, kind: 'preprint', topic,
    source: x.bookOrReportDetails?.publisher || 'Preprint', url: x.doi ? `https://doi.org/${x.doi}` : `https://europepmc.org/article/${x.source}/${x.id}`,
    date: x.firstPublicationDate || '', title: decode(x.title), text: decode(x.abstractText),
    extra: 'Preprint: todavía no revisado por otros científicos',
  }));
}

export async function rss(topic, url, max, filter) {
  const xml = await get(url);
  return xml.split(/<item[\s>]/).slice(1).map((it) => ({
    id: `url:${tag(it, 'link').replace(/[?#].*$/, '').replace(/\/$/, '')}`, kind: 'news', topic,
    source: new URL(url).hostname.replace('www.', ''), url: tag(it, 'link'),
    date: iso(tag(it, 'pubDate')), title: tag(it, 'title'), text: tag(it, 'description'), extra: '',
  })).filter((x) => x.title && (!filter || filter.test(`${x.title} ${x.text}`))).slice(0, max);
}

export const medicalxpress = (topic, q, max) =>
  rss(topic, `https://medicalxpress.com/rss-feed/search/?search=${encodeURIComponent(q)}&s=0`, max);

export async function trials(topic, cond, max) {
  const url = `https://clinicaltrials.gov/api/v2/studies?format=json&pageSize=${max * 3}&sort=LastUpdatePostDate:desc&filter.overallStatus=RECRUITING,NOT_YET_RECRUITING&query.cond=${encodeURIComponent(cond)}`;
  const r = await get(url, 'json');
  const want = new RegExp(cond.split(' ').slice(0, 2).join('|'), 'i');
  return (r.studies || []).map((s) => s.protocolSection).filter((p) => want.test(JSON.stringify(p.conditionsModule || {})))
    .map((p) => {
      const locs = p.contactsLocationsModule?.locations || [];
      const countries = [...new Set(locs.map((l) => l.country).filter(Boolean))];
      return {
        id: `nct:${p.identificationModule.nctId}`, kind: 'trial', topic,
        source: 'ClinicalTrials.gov', url: `https://clinicaltrials.gov/study/${p.identificationModule.nctId}`,
        date: p.statusModule?.lastUpdatePostDateStruct?.date || '', title: p.identificationModule.briefTitle,
        text: (p.descriptionModule?.briefSummary || '').slice(0, 2000),
        extra: `Fase: ${(p.designModule?.phases || []).join(', ') || 'no indicada'}. Países: ${countries.join(', ') || 'no indicados'}. Estado: ${p.statusModule?.overallStatus}`,
        countries, phase: (p.designModule?.phases || []).join(', '),
      };
    }).slice(0, max);
}

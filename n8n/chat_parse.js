// Why Code: extrae el texto y las fuentes citadas (anotaciones) de la respuesta de OpenAI y separa respuesta corta y ampliación.
const res = $input.first().json;
const fail = { blocked: false, error: true, answer: 'No he podido buscar ahora mismo. Prueba de nuevo en unos minutos.', more: '', sources: [] };
if (res.error) return [{ json: { ...fail, detail: JSON.stringify(res.error).slice(0, 300) } }];
let text = '';
const sources = [];
for (const o of res.output || []) {
  for (const c of o.content || []) {
    if (c.type !== 'output_text') continue;
    text += c.text;
    for (const a of c.annotations || []) {
      if (a.type === 'url_citation' && a.url && !sources.some((s) => s.url === a.url)) {
        sources.push({ url: a.url.replace(/[?&]utm_source=openai/, ''), title: a.title || new URL(a.url).hostname });
      }
    }
  }
}
text = text.replace(/\s*\(\[[^\]]*\]\([^)]*\)\)/g, '').replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1').replace(/\*\*/g, '').trim();
if (!text) return [{ json: { ...fail, detail: 'sin texto' } }];
const [answer, ...rest] = text.split('===MAS===');
return [{ json: { blocked: false, answer: answer.trim(), more: rest.join(' ').trim(), sources: sources.slice(0, 8) } }];

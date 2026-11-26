// Why Code: la respuesta de OpenAI llega como texto JSON dentro de output[]; hay que extraerla y validarla.
const res = $input.first().json;
const expected = $('Validar entrada').first().json.expected;
if (res.status && res.status !== 'completed') {
  throw new Error(`OpenAI no terminó la respuesta: ${res.status} ${JSON.stringify(res.incomplete_details || {})}`);
}
let text = res.output_text || '';
if (!text && Array.isArray(res.output)) {
  for (const o of res.output) {
    for (const c of o.content || []) if (c.type === 'output_text') text += c.text;
  }
}
let parsed;
try { parsed = JSON.parse(text); } catch (e) { throw new Error('La IA devolvió un JSON ilegible'); }
const items = (parsed.items || []).filter((x) => expected.includes(x.id));
if (items.length === 0) throw new Error('La IA no devolvió ningún elemento reconocible');
return [{ json: { items, model: res.model, usage: res.usage || null } }];

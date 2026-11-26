// Why Code: valida la entrada externa y construye el cuerpo de la petición a OpenAI (prompt + esquema estricto).
const body = $input.first().json.body || {};
const items = Array.isArray(body.items) ? body.items : null;
if (!items || items.length < 1 || items.length > 10) {
  throw new Error('Entrada inválida: items debe ser una lista de 1 a 10 elementos');
}
const clean = items.map((it, i) => {
  if (!it || typeof it.id !== 'string' || typeof it.title !== 'string') {
    throw new Error(`Elemento ${i} inválido: faltan id o title`);
  }
  return {
    id: it.id.slice(0, 120),
    kind: String(it.kind || 'news').slice(0, 20),
    topic: String(it.topic || '').slice(0, 20),
    source: String(it.source || '').slice(0, 80),
    date: String(it.date || '').slice(0, 20),
    title: it.title.slice(0, 400),
    text: String(it.text || '').slice(0, 2500),
    extra: String(it.extra || '').slice(0, 600),
  };
});

const system = `Eres el redactor de una web en castellano de España que explica avances médicos a personas sin formación médica (pacientes con polineuropatía de fibra pequeña y dolor neuropático, y sus familias).
Para cada elemento recibes el título y el texto original (normalmente en inglés). Escribe SOLO con lo que dice ese texto; nunca añadas datos de memoria.
Reglas:
- Lenguaje llano, frases cortas, sin jerga. Si un término técnico es inevitable, explícalo entre paréntesis en 3 a 6 palabras.
- Nada de exagerar: prohibido "cura", "milagro", "revolucionario", "esperanza para todos". Di qué se probó, en quién y qué falta.
- Nunca des dosis ni consejos personales.
- stage: el nivel real de la prueba según el texto. Si no se puede saber, "no_verificado". Para ensayos clínicos que buscan voluntarios usa "ensayo_abierto".
- keep=false si no es un avance o hallazgo real del tema (por ejemplo: anuncio comercial, opinión sin datos, tema ajeno a la medicina, texto vacío).
- title_es: máximo 90 caracteres, informativo, sin dos puntos de titular de prensa.
- summary_es: 1 o 2 frases, máximo 230 caracteres. Es lo primero que lee la persona.
- what: qué se ha hecho (2 o 3 frases). why: por qué podría importar a un paciente (1 o 2 frases). missing: qué NO demuestra todavía o qué falta (1 o 2 frases).
- who: institución y país si aparecen en el texto; si no, cadena vacía.
- glossary: hasta 3 términos difíciles que hayas usado, con su explicación de 6 a 15 palabras.
- Para ensayos (kind=trial): what explica qué se prueba y en quién; why, qué podría aportar; missing, requisitos generales o "consulta los requisitos en el enlace".`;

const item = {
  type: 'object', additionalProperties: false,
  required: ['id', 'keep', 'title_es', 'summary_es', 'what', 'why', 'missing', 'stage', 'who', 'glossary'],
  properties: {
    id: { type: 'string' },
    keep: { type: 'boolean' },
    title_es: { type: 'string' },
    summary_es: { type: 'string' },
    what: { type: 'string' },
    why: { type: 'string' },
    missing: { type: 'string' },
    stage: { type: 'string', enum: ['laboratorio', 'animales', 'personas_inicial', 'personas_grande', 'aprobado', 'revision', 'preprint', 'noticia', 'ensayo_abierto', 'no_verificado'] },
    who: { type: 'string' },
    glossary: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['term', 'plain'], properties: { term: { type: 'string' }, plain: { type: 'string' } } } },
  },
};

const model = typeof body.model === 'string' && /^gpt-[\w.-]+$/.test(body.model) ? body.model : 'gpt-5-mini';
return [{
  json: {
    expected: clean.map((c) => c.id),
    request: {
      model,
      reasoning: { effort: 'low' },
      max_output_tokens: 9000,
      input: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(clean) },
      ],
      text: { format: { type: 'json_schema', name: 'noticias', strict: true, schema: { type: 'object', additionalProperties: false, required: ['items'], properties: { items: { type: 'array', items: item } } } } },
    },
  },
}];

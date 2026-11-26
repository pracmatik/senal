// Why Code: valida la entrada pública, aplica límites diarios (por persona y total) con estado entre ejecuciones y arma la petición.
const LIMIT_IP = 15, LIMIT_TOTAL = 250;
const { body = {}, headers = {} } = $input.first().json;
const q = typeof body.question === 'string' ? body.question.trim() : '';
const blocked = (answer) => [{ json: { blocked: true, answer, more: '', sources: [] } }];
if (body.web) return blocked('No se ha podido enviar la pregunta.');
if (q.length < 3 || q.length > 600) return blocked('Escribe una pregunta de entre 3 y 600 caracteres.');

const st = $getWorkflowStaticData('global');
const today = new Date().toISOString().slice(0, 10);
if (st.day !== today) { st.day = today; st.total = 0; st.ips = {}; }
const ip = String(headers['x-forwarded-for'] || headers['x-real-ip'] || 'desconocida').split(',')[0].trim();
let h = 5381;
for (const ch of ip + today) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0;
const key = 'k' + h.toString(36);
if ((st.ips[key] || 0) >= LIMIT_IP) return blocked('Has llegado al máximo de preguntas de hoy. Vuelve mañana.');
if ((st.total || 0) >= LIMIT_TOTAL) return blocked('El chat ha llegado a su límite de hoy. Vuelve mañana.');
st.ips[key] = (st.ips[key] || 0) + 1;
st.total = (st.total || 0) + 1;

const history = (Array.isArray(body.history) ? body.history : []).slice(-6)
  .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
  .map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }));

const instructions = `Eres el asistente de una web en castellano de España sobre avances médicos, centrada en la polineuropatía de fibra pequeña, el dolor neuropático, el sistema nervioso y la reprogramación celular (factores de Yamanaka, células iPS). Fecha de hoy: ${today}.
Antes de responder, BUSCA en la web. Prioriza fuentes fiables y actuales: PubMed, revistas médicas revisadas, ClinicalTrials.gov, EMA, FDA, AEMPS, NIH/NINDS, sociedades médicas y hospitales universitarios. Contrasta al menos dos fuentes independientes cuando sea posible. Prefiere lo publicado en los últimos 2 años y dilo si algo es antiguo.
Cómo responder:
- El lector se llama Christian. Tutéale siempre y llámale por su nombre con naturalidad, normalmente una vez al empezar la respuesta corta (por ejemplo: Christian, ...), sin repetirlo en cada frase.
- Castellano llano, para alguien sin formación médica. Sin jerga; si un término es inevitable, explícalo entre paréntesis.
- Primero una respuesta corta y directa: 2 a 4 frases.
- Luego una línea que contenga solo ===MAS=== y después una ampliación de 1 a 3 párrafos breves (qué se sabe, qué tan probado está, qué falta).
- Di siempre en qué fase está cada cosa (laboratorio, animales, ensayo en personas, aprobado).
- No inventes. Si no encuentras información fiable, dilo claramente.
- Nunca des diagnósticos, dosis ni consejos de tratamiento personales; sugiere hablarlo con su médico. Ante síntomas graves o urgencia, indica llamar al 112.
- Sin viñetas ni negritas ni enlaces en el texto: las fuentes se muestran aparte.
- Si la pregunta no tiene que ver con la salud o la medicina, responde amablemente que este chat solo trata esos temas.`;

return [{
  json: {
    blocked: false,
    request: {
      model: 'gpt-5.6-luna',
      reasoning: { effort: 'low' },
      max_output_tokens: 3000,
      max_tool_calls: 4,
      tools: [{ type: 'web_search' }],
      instructions,
      input: [...history, { role: 'user', content: q }],
    },
  },
}];

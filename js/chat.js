const ENDPOINT = 'https://n8n-mcp-n8n.2slval.easypanel.host/webhook/neuro-chat';
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paras = (t) => t.split(/\n+/).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('');

export function initChat() {
  const chat = document.getElementById('chat'), fab = document.getElementById('askFab');
  const log = document.getElementById('chatLog'), form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const history = [];
  let busy = false;

  const open = (text) => {
    chat.hidden = false; fab.hidden = true; fab.setAttribute('aria-expanded', 'true');
    if (text) input.value = text;
    input.focus();
  };
  const close = () => { chat.hidden = true; fab.hidden = false; fab.setAttribute('aria-expanded', 'false'); fab.focus(); };
  fab.onclick = () => open();
  document.getElementById('askHero').onclick = () => open();
  document.getElementById('chatClose').onclick = close;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !chat.hidden) close(); });
  window.addEventListener('ask', (e) => open(e.detail));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });

  const add = (cls, html) => {
    const d = document.createElement('div');
    d.className = `msg ${cls}`; d.innerHTML = html;
    log.append(d); log.scrollTop = log.scrollHeight;
    return d;
  };

  function renderAnswer(el, r) {
    const srcs = (r.sources || []).map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`).join('');
    el.className = 'msg bot';
    el.innerHTML = paras(r.answer) + (r.more ? '<button class="expand">Ampliar</button><div class="more-text" hidden></div>' : '') +
      (srcs ? `<div class="srcs"><span>Fuentes consultadas:</span>${srcs}</div>` : '');
    const btn = el.querySelector('.expand');
    if (btn) btn.onclick = () => { const m = el.querySelector('.more-text'); m.innerHTML = paras(r.more); m.hidden = false; btn.remove(); log.scrollTop = log.scrollHeight; };
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q || busy) return;
    busy = true; input.value = '';
    log.querySelector('.chat-hint')?.remove();
    add('me', esc(q));
    const wait = add('wait bot', 'Buscando en fuentes médicas, puede tardar unos 20 segundos');
    try {
      const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 90000);
      const res = await fetch(ENDPOINT, {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctrl.signal,
        body: JSON.stringify({ question: q, history, web: form.web.value }),
      });
      clearTimeout(t);
      const r = await res.json();
      if (!r.answer) throw new Error('vacía');
      renderAnswer(wait, r);
      if (!r.error) history.push({ role: 'user', content: q }, { role: 'assistant', content: r.answer });
    } catch {
      wait.className = 'msg bot';
      wait.textContent = 'No he podido conectar para responder. Revisa tu conexión y vuelve a intentarlo en un momento.';
    }
    busy = false;
  });
}

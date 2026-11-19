// Testler ve çevrimdışı demo için Gemini ve OpenAI API'lerini taklit eden küçük sunucu.
// Gerçek bir model değildir; önceden yazılmış cevaplar döner.
import http from 'node:http';

function cannedReply(question, provider) {
  const q = question.toLocaleLowerCase('tr');
  if (q.includes('randevu') || q.includes('implant')) {
    return 'İmplant, eksik dişin yerine çene kemiğine yerleştirilen titanyum bir vida ve üzerine yapılan kalıcı dişten oluşur. Size uygun olup olmadığını muayenede hekimimiz değerlendirir. İsterseniz hemen randevu talebi oluşturabiliriz.\n[RANDEVU]';
  }
  if (q.includes('sigorta')) {
    return 'Anlaşmalı sigorta bilgisi elimde yok. En doğru bilgiyi 0 (212) 000 00 00 numarasından alabilirsiniz.';
  }
  return `Merhaba! Ben Kaptan Ark (${provider}). Size nasıl yardımcı olabilirim?`;
}

export function startMockAI(port = 0) {
  const requests = [];
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = raw ? JSON.parse(raw) : {};
      requests.push({ url: req.url, headers: req.headers, body });
      const send = (status, data) => {
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(data));
      };
      const delay = Number(process.env.MOCK_DELAY_MS ?? 0);
      setTimeout(() => {
        if (req.url.includes(':generateContent')) {
          if (req.headers['x-goog-api-key'] === 'quota') return send(429, { error: { code: 429, message: 'quota' } });
          const last = body.contents?.at(-1)?.parts?.map((p) => p.text).join(' ') ?? '';
          return send(200, {
            candidates: [{ content: { role: 'model', parts: [{ text: cannedReply(last, 'gemini') }] }, finishReason: 'STOP' }],
          });
        }
        if (req.url === '/v1/chat/completions') {
          const last = body.messages?.at(-1)?.content ?? '';
          return send(200, { choices: [{ index: 0, message: { role: 'assistant', content: cannedReply(last, 'openai') } }] });
        }
        send(404, { error: 'not_found' });
      }, delay);
    });
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port, requests })));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { port } = await startMockAI(Number(process.env.MOCK_PORT ?? 4020));
  console.log(`Sahte yapay zeka API: http://127.0.0.1:${port}`);
}

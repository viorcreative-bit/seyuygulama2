// Testler ve çevrimdışı demo için Claude Messages API'sini taklit eden küçük sunucu.
// Gerçek bir model değildir: önceden yazılmış senaryoya göre araç çağırır ve cevap verir.
import express from 'express';

function lastUser(messages) {
  for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === 'user') return messages[i];
  return null;
}

function textOf(message) {
  if (!message) return '';
  if (typeof message.content === 'string') return message.content;
  return message.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join(' ');
}

function toolResults(message) {
  if (!message || typeof message.content === 'string') return [];
  return message.content.filter((b) => b.type === 'tool_result');
}

function findToolUse(messages, id) {
  for (const m of messages) {
    if (m.role !== 'assistant' || typeof m.content === 'string') continue;
    const block = m.content.find((b) => b.type === 'tool_use' && b.id === id);
    if (block) return block;
  }
  return null;
}

let counter = 0;
const id = (p) => `${p}_mock_${++counter}`;

function reply(model, content, stop_reason = 'end_turn') {
  return {
    id: id('msg'),
    type: 'message',
    role: 'assistant',
    model,
    content,
    stop_reason,
    stop_sequence: null,
    stop_details: null,
    usage: { input_tokens: 100, output_tokens: 40, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
  };
}

function nextWorkday(fromDate) {
  const d = new Date(`${fromDate}T00:00:00Z`);
  do d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() === 0);
  return d.toISOString().slice(0, 10);
}

/** Senaryo: soruya göre ya araç çağırır ya da metin döner. */
export function respond(body) {
  const { model, messages, system } = body;
  const today = /(\d{4}-\d{2}-\d{2}) = .*\(bugün\)/.exec(typeof system === 'string' ? system : JSON.stringify(system))?.[1];
  const user = lastUser(messages);
  const results = toolResults(user);

  if (results.length) {
    const call = findToolUse(messages, results[0].tool_use_id);
    const data = JSON.parse(typeof results[0].content === 'string' ? results[0].content : results[0].content[0].text);
    if (call?.name === 'check_availability') {
      const day = data.days.find((d) => d.slots.length);
      if (!day) return reply(model, [{ type: 'text', text: 'Maalesef yakın tarihlerde boş saat göremedim.' }]);
      const slots = day.slots.slice(0, 3).join(', ');
      return reply(model, [
        {
          type: 'text',
          text: `${day.label} için uygun saatler: ${slots}. Hangisi size uyar? Randevu için ad soyad ve telefon numaranızı da paylaşır mısınız?`,
        },
      ]);
    }
    if (call?.name === 'create_appointment') {
      if (!data.ok) return reply(model, [{ type: 'text', text: `Randevu oluşturulamadı: ${data.error}` }]);
      const a = data.appointment;
      return reply(model, [
        {
          type: 'text',
          text: `Harika! Randevunuz oluşturuldu 🎉 Kodunuz: ${a.code}. ${a.date} ${a.time} saatinde sizi bekliyoruz, lütfen 10 dakika erken gelin.`,
        },
      ]);
    }
    return reply(model, [{ type: 'text', text: 'Tamamdır.' }]);
  }

  const text = textOf(user).toLocaleLowerCase('tr');
  if (/onayl|evet/.test(text)) {
    // Önceki bot mesajındaki ilk saati seç
    const prev = [...messages].reverse().find((m) => m.role === 'assistant' && textOf(m).includes('uygun saatler'));
    const time = /(\d{2}:\d{2})/.exec(textOf(prev))?.[1] ?? '10:00';
    return reply(
      model,
      [
        { type: 'text', text: 'Randevunuzu oluşturuyorum.' },
        {
          type: 'tool_use',
          id: id('toolu'),
          name: 'create_appointment',
          input: {
            full_name: 'Ayşe Yılmaz',
            phone: '0532 123 45 67',
            date: nextWorkday(today),
            time,
            service: 'Diş Taşı Temizliği',
          },
        },
      ],
      'tool_use',
    );
  }
  if (/randevu|müsait|boş/.test(text)) {
    return reply(
      model,
      [{ type: 'tool_use', id: id('toolu'), name: 'check_availability', input: { start_date: nextWorkday(today), days: 2 } }],
      'tool_use',
    );
  }
  if (/saat|açık/.test(text)) {
    return reply(model, [
      {
        type: 'text',
        text: 'Hafta içi 09:00–19:00, cumartesi 09:00–15:00 arası açığız; pazar günleri kapalıyız. Öğle arası 12:30–13:30. Size randevu ayarlamamı ister misiniz?',
      },
    ]);
  }
  if (/hizmet/.test(text)) {
    return reply(model, [
      {
        type: 'text',
        text: 'Muayene, diş taşı temizliği, beyazlatma, implant, zirkonyum kaplama, lamina, kanal tedavisi, dolgu, ortodonti ve çocuk diş hekimliği gibi pek çok hizmetimiz var. Hangisiyle ilgileniyorsunuz? 😊',
      },
    ]);
  }
  return reply(model, [
    {
      type: 'text',
      text: 'İmplant, eksik dişin yerine çene kemiğine yerleştirilen titanyum bir vida ve üzerine yapılan kalıcı dişten oluşur. Size uygun olup olmadığını muayenede hekimimiz değerlendirir. Muayene randevusu ayarlayayım mı?',
    },
  ]);
}

export function startMockAnthropic(port = 0) {
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  const requests = [];
  app.post('/v1/messages', (req, res) => {
    requests.push({ headers: req.headers, body: req.body });
    setTimeout(() => res.json(respond(req.body)), Number(process.env.MOCK_DELAY_MS ?? 0));
  });
  return new Promise((resolve) => {
    const server = app.listen(port, () => resolve({ server, port: server.address().port, requests }));
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { port } = await startMockAnthropic(Number(process.env.MOCK_PORT ?? 4010));
  console.log(`Sahte Claude API: http://localhost:${port}`);
}

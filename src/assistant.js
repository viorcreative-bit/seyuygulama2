import Anthropic from '@anthropic-ai/sdk';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { buildSystemPrompt } from './prompt.js';

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Tarih, YYYY-MM-DD biçiminde');

function slim(record) {
  const { code, fullName, service, date, time, status } = record;
  return { code, fullName, service, date, time, status };
}

/** Randevu araçları. `events` bu tur içinde oluşan randevuyu arayüze iletmek için doldurulur. */
function makeTools(scheduler, events) {
  return [
    betaZodTool({
      name: 'check_availability',
      description:
        'Kliniğin boş randevu saatlerini getirir. Ziyaretçiye saat önermeden önce mutlaka çağır. ' +
        'start_date gününden başlayarak `days` gün boyunca her gün için boş saatleri ve kapalı günlerin sebebini döndürür. ' +
        'Bugünün geçmiş saatleri listede yer almaz.',
      inputSchema: z.object({
        start_date: DATE,
        days: z.number().int().min(1).max(14).optional().describe('Kaç gün kontrol edilsin (1-14). Varsayılan 1.'),
      }),
      run: async ({ start_date, days }) => {
        const now = scheduler.now();
        const result = await scheduler.availability(start_date, days ?? 1);
        return JSON.stringify({ current_date: now.date, current_time: now.time, days: result });
      },
    }),
    betaZodTool({
      name: 'create_appointment',
      description:
        'Randevuyu kaydeder. Yalnızca ziyaretçi özetlenen bilgileri (hizmet, tarih, saat, ad soyad, telefon) açıkça onayladıktan sonra çağır. ' +
        'Saat check_availability sonucunda boş görünen bir saat olmalı.',
      inputSchema: z.object({
        full_name: z.string().min(3).max(80).describe('Hastanın adı ve soyadı'),
        phone: z.string().min(7).max(25).describe('Cep telefonu, ör. 0532 123 45 67 veya +44 7700 900123'),
        date: DATE,
        time: z.string().regex(/^\d{2}:\d{2}$/).describe('Saat, SS:DD biçiminde, ör. 14:30'),
        service: z.string().min(2).max(80).describe('Hizmet adı, ör. "Muayene ve Kontrol"'),
        note: z.string().max(300).optional().describe('Varsa şikâyet veya ek not'),
      }),
      run: async (input) => {
        const result = await scheduler.book({
          fullName: input.full_name,
          phone: input.phone,
          date: input.date,
          time: input.time,
          service: input.service,
          note: input.note,
        });
        if (!result.ok) return JSON.stringify({ ok: false, error: result.error });
        events.appointment = slim(result.record);
        return JSON.stringify({ ok: true, appointment: slim(result.record) });
      },
    }),
    betaZodTool({
      name: 'cancel_appointment',
      description: 'Randevu kodu ve telefon numarası eşleşen aktif randevuyu iptal eder. Önce ziyaretçiden iptal onayı al.',
      inputSchema: z.object({
        code: z.string().min(4).max(20).describe('Randevu kodu, ör. ARK-7KQ2M9'),
        phone: z.string().min(7).max(25),
      }),
      run: async ({ code, phone }) => {
        const result = await scheduler.cancel({ code, phone });
        if (!result.ok) return JSON.stringify({ ok: false, error: result.error });
        events.cancelled = slim(result.record);
        return JSON.stringify({ ok: true, appointment: slim(result.record) });
      },
    }),
    betaZodTool({
      name: 'find_appointment',
      description: 'Randevu kodu ve telefon numarasıyla randevu bilgisini getirir.',
      inputSchema: z.object({
        code: z.string().min(4).max(20),
        phone: z.string().min(7).max(25),
      }),
      run: async ({ code, phone }) => {
        const result = await scheduler.lookup({ code, phone });
        return JSON.stringify(result.ok ? { ok: true, appointment: slim(result.record) } : result);
      },
    }),
  ];
}

export class ChatError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_SESSIONS = 5000;
const MAX_HISTORY = 120; // araç çağrıları dahil mesaj sayısı

export function createAssistant({ clinic, scheduler, client = new Anthropic(), model, effort = 'low', configured = true }) {
  const sessions = new Map();

  setInterval(() => {
    const cutoff = Date.now() - SESSION_TTL_MS;
    for (const [id, s] of sessions) if (s.updatedAt < cutoff && !s.busy) sessions.delete(id);
  }, 10 * 60 * 1000).unref();

  function session(id) {
    let s = sessions.get(id);
    if (!s) {
      if (sessions.size >= MAX_SESSIONS) {
        const oldest = [...sessions.entries()].sort((a, b) => a[1].updatedAt - b[1].updatedAt)[0];
        if (oldest) sessions.delete(oldest[0]);
      }
      s = { messages: [], busy: false, updatedAt: Date.now() };
      sessions.set(id, s);
    }
    return s;
  }

  async function chat(sessionId, text) {
    if (!configured) {
      throw new ChatError(
        'not_configured',
        'Yapay zeka bağlantısı henüz kurulmamış. Sunucuda ANTHROPIC_API_KEY ayarlanmalı.',
        503,
      );
    }
    const s = session(sessionId);
    if (s.busy) throw new ChatError('busy', 'Bir önceki mesajınızı yanıtlıyorum, lütfen bekleyin.', 429);
    if (s.messages.length >= MAX_HISTORY) {
      throw new ChatError('too_long', 'Sohbet çok uzadı. Lütfen yeni bir sohbet başlatın.', 409);
    }
    s.busy = true;
    s.updatedAt = Date.now();
    const events = {};
    try {
      const messages = [...s.messages, { role: 'user', content: text }];
      const runner = client.beta.messages.toolRunner({
        model,
        max_tokens: 16000,
        system: buildSystemPrompt(clinic, scheduler.now().date),
        tools: makeTools(scheduler, events),
        messages,
        output_config: { effort },
        cache_control: { type: 'ephemeral' },
        // Bir istek güvenlik filtresine takılırsa sunucu tarafında uygun modelle yeniden dener.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        max_iterations: 8,
        thread: false,
      });
      const final = await runner.runUntilDone();

      if (final.stop_reason === 'refusal') {
        // Reddedilen turu geçmişe eklemiyoruz; sohbet önceki haliyle devam eder.
        return {
          reply: `Bu konuda yardımcı olamıyorum. Kliniğimiz ve diş sağlığıyla ilgili her soruda buradayım. İsterseniz ${clinic.phone} numarasından da bize ulaşabilirsiniz.`,
          ...events,
        };
      }

      const history = [...runner.params.messages];
      if (history.at(-1)?.role !== 'assistant') history.push({ role: 'assistant', content: final.content });
      s.messages = history;

      let reply = final.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      if (!reply) {
        reply = events.appointment
          ? `Randevunuz oluşturuldu. Randevu kodunuz: ${events.appointment.code}`
          : 'Üzgünüm, bir aksilik oldu. Sorunuzu biraz farklı sorabilir misiniz?';
      }
      return { reply, ...events };
    } catch (err) {
      if (err instanceof ChatError) throw err;
      if (err instanceof Anthropic.AuthenticationError) {
        throw new ChatError('not_configured', 'Yapay zeka bağlantısı yapılandırılmamış (API anahtarı geçersiz).', 503);
      }
      if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.InternalServerError) {
        throw new ChatError('unavailable', 'Şu an çok yoğunum, birkaç saniye sonra tekrar dener misiniz?', 503);
      }
      if (err instanceof Anthropic.APIError) {
        console.error('Claude API hatası:', err.status, err.message);
        throw new ChatError('upstream', 'Yapay zeka servisine ulaşılamadı. Lütfen biraz sonra tekrar deneyin.', 502);
      }
      console.error('Sohbet hatası:', err);
      throw new ChatError('internal', 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.', 500);
    } finally {
      s.busy = false;
      s.updatedAt = Date.now();
    }
  }

  function reset(sessionId) {
    const s = sessions.get(sessionId);
    if (s && !s.busy) sessions.delete(sessionId);
  }

  return { chat, reset };
}

// Kayıtlı sesler: Kaptan Ark'ın sabit cümleleri bir kez gerçek bir insan sesiyle kaydedilir.
// Kayıt varsa o çalınır; yoksa cihazın konuşma motoru metni okur.

/**
 * Kaydedilecek cümleler. `text` okunacak metindir; ekranda görünen yazı bazı adımlarda
 * daha ayrıntılı olabilir (ör. seçilen tarih), sesli hali her durumda uyacak şekilde genel tutuldu.
 */
export const PHRASES = [
  { id: 'welcome', group: 'Karşılama', text: (c) => welcomeOf(c) },
  { id: 'greeting', group: 'Karşılama', text: (c) => `Merhaba! Ben ${c.assistantName ?? 'Kaptan Ark'}. Size nasıl yardımcı olabilirim?` },
  { id: 'poke1', group: 'Maskota dokununca', text: () => 'Merhaba! Size nasıl yardımcı olabilirim?' },
  { id: 'poke2', group: 'Maskota dokununca', text: () => 'Bugün dişlerinizi fırçaladınız mı?' },
  { id: 'poke3', group: 'Maskota dokununca', text: () => 'Randevu almak için bana yazmanız yeterli!' },
  { id: 'poke4', group: 'Maskota dokununca', text: (c) => `${c.assistantName ?? 'Kaptan Ark'} göreve hazır! Sorularınızı bekliyorum.` },

  { id: 'booking_service', group: 'Randevu', text: () => 'Tabii, hemen randevu talebi oluşturalım! Hangi hizmet için gelmek istersiniz?' },
  { id: 'booking_day', group: 'Randevu', text: () => 'Harika! Hangi gün size uygun?' },
  { id: 'booking_time', group: 'Randevu', text: () => 'Hangi saat size uygun? Kesin onayı ekibimiz WhatsApp üzerinden verecek.' },
  { id: 'booking_name', group: 'Randevu', text: () => 'Son iki adım! Adınızı ve soyadınızı yazar mısınız?' },
  { id: 'booking_phone', group: 'Randevu', text: () => 'Teşekkürler! Size ulaşabilmemiz için telefon numaranızı yazar mısınız?' },
  { id: 'booking_summary', group: 'Randevu', text: () => 'Bilgileriniz hazır! WhatsApp ile gönder düğmesine basın, talebiniz kliniğimize iletilsin.' },
  { id: 'booking_sent', group: 'Randevu', text: () => 'Harika! Mesajı göndermeniz yeterli. Ekibimiz en kısa sürede size dönüş yapacak. Sağlıklı gülüşler!' },
  { id: 'booking_cancel', group: 'Randevu', text: () => 'Tamam, randevu talebini iptal ettim. Başka bir konuda yardımcı olabilir miyim?' },

  { id: 'hours', group: 'Bilgi', text: () => 'Çalışma saatlerimizi ekrana yazdım. Size uygun bir gün için randevu talebi oluşturabilirim.' },
  { id: 'location', group: 'Bilgi', text: () => 'Adresimizi ekrana yazdım. Yol tarifi için haritaya dokunabilirsiniz.' },
  { id: 'contact', group: 'Bilgi', text: () => 'İletişim bilgilerimiz ekranda. Dilerseniz hemen arayabilir ya da WhatsApp\'tan yazabilirsiniz.' },
  { id: 'services', group: 'Bilgi', text: () => 'Hizmetlerimizi ekrana yazdım. Hangisi hakkında bilgi almak istersiniz?' },
  { id: 'service_info', group: 'Bilgi', text: () => 'Bu tedavi hakkındaki bilgileri ekrana yazdım. Size en uygun tedaviyi muayenede hekimimiz belirler.' },
  { id: 'price', group: 'Bilgi', text: () => 'Tedavi ücretleri, muayenede ağız yapınıza göre hazırlanan tedavi planından sonra netleşir. Muayene için randevu talebi oluşturmamı ister misiniz?' },
  { id: 'cancel_info', group: 'Bilgi', text: () => 'Randevunuzu iptal etmek ya da değiştirmek için bize WhatsApp\'tan yazabilir veya telefonla ulaşabilirsiniz.' },

  { id: 'emergency', group: 'Sağlık', text: () => 'Geçmiş olsun! Yüzünüzde ya da boynunuzda hızla büyüyen şişlik, nefes alma veya yutkunma güçlüğü, durmayan kanama ya da ciddi bir darbe varsa lütfen hemen 112\'yi arayın. Şiddetli diş ağrısı için bizi hemen arayabilirsiniz.' },
  { id: 'pain', group: 'Sağlık', text: () => 'Geçmiş olsun! Ağrının sebebini en doğru şekilde muayenede anlayabiliriz. Ağrınız şiddetliyse bizi hemen arayın.' },

  { id: 'thanks', group: 'Sohbet', text: () => 'Rica ederim! Başka bir sorunuz olursa buradayım. Sağlıklı gülüşler dilerim.' },
  { id: 'bye', group: 'Sohbet', text: () => 'Görüşmek üzere! Sağlıklı gülüşler dilerim.' },
  { id: 'unknown', group: 'Sohbet', text: () => 'Bu soruyu tam anlayamadım. Aşağıdaki konularda hemen yardımcı olabilirim; dilerseniz bizi arayabilirsiniz.' },
];

export function welcomeOf(clinic) {
  return (
    clinic.welcome ??
    `${clinic.shortName ?? clinic.name}'e hoş geldiniz! Ben ${clinic.assistantName}. Sorularınızı yanıtlayabilir, randevu talebinizi hemen oluşturabilirim. Size nasıl yardımcı olayım?`
  );
}

export function phraseText(id, clinic) {
  const p = PHRASES.find((x) => x.id === id);
  return p ? p.text(clinic) : null;
}

const BLOCK_RE = /(<script type="application\/json" id="voice-recordings">)[\s\S]*?(<\/script>)/;

/** Sayfa kaynağındaki kayıt bloğunu yeni kayıtlarla değiştirir. */
export function embedRecordings(html, recordings) {
  if (!BLOCK_RE.test(html)) throw new Error('Sayfada kayıt bölümü (voice-recordings) bulunamadı.');
  const json = JSON.stringify(recordings).replace(/</g, '\\u003c');
  return html.replace(BLOCK_RE, (_, open, close) => `${open}${json}${close}`);
}

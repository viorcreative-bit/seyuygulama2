// Sesli okuma için metin hazırlama (tarayıcının konuşma motoruna gitmeden önce).

export function detectLang(text) {
  if (/[çğıöşüİ]/i.test(text)) return 'tr';
  if (/\b(the|you|your|and|appointment|hello|thank)\b/i.test(text)) return 'en';
  return 'tr';
}

/** Emoji, bağlantı ve işaretleri temizler; yanlış okunan kelimeleri düzeltir. */
export function speechText(text) {
  return (
    String(text ?? '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
      .replace(/[•*#_`>]/g, ' ')
      // Büyük harfli "ARK" harf harf okunmasın, "ark" diye okunsun.
      .replace(/\bARK\b/g, 'Ark')
      // Türkçede "Ark." "arkeoloji" kısaltmasıdır; cümle sonundaki "Ark." öyle okunmasın.
      .replace(/\b(ark)\.(?=\s|$)/gi, '$1!')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/** Uzun metni parçalara böler (bazı tarayıcılar uzun cümleleri yarıda keser). */
export function chunk(text) {
  const parts = text.match(/[^.!?…\n]+[.!?…]*\s*/g) ?? [text];
  const out = [];
  let cur = '';
  for (const p of parts) {
    if ((cur + p).length > 180 && cur) {
      out.push(cur.trim());
      cur = '';
    }
    cur += p;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

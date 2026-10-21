/*
 * Firebase bağlantı bilgileri (fiyat yönetim paneli ve canlı fiyatlar için).
 *
 * Firebase konsolu → Proje ayarları (dişli simgesi) → Genel → "Uygulamalarınız" altındaki
 * web uygulamasının yapılandırmasından "apiKey" ve "projectId" değerlerini buraya yazın.
 * Bu değerler gizli değildir; güvenliği Firestore kuralları (firestore.rules) sağlar.
 *
 * Boş bırakılırsa site menu.js'teki fiyatlarla çalışır, panel kurulum talimatını gösterir.
 */
window.NONNA_FIREBASE = {
  apiKey: "",
  projectId: "",

  // Panele bu kullanıcı adıyla girilir; Firebase'deki şu e-posta hesabına karşılık gelir.
  // "Şifremi unuttum" bağlantısı bu e-posta adresine gönderilir.
  adminUser: "admin",
  adminEmail: "viorcreative@gmail.com"
};

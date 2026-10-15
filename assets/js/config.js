/*
 * Lazio Tekstil site ayarları
 * ---------------------------------------------------------------
 * Firma bilgileri, kargo ve ödeme ayarları burada tek yerden yönetilir.
 * Köşeli parantez [ ] içindeki değerler yayından önce doldurulmalıdır.
 */
window.LAZIO_CONFIG = {
  siteName: "Lazio Tekstil",
  siteUrl: "https://www.laziotekstil.com",

  company: {
    legalName: "[Ticari unvan]",
    address: "[Açık adres]",
    phone: "+90 5XX XXX XX XX",
    email: "info@laziotekstil.com",
    mersis: "[MERSİS no]",
    taxOffice: "[Vergi dairesi]",
    taxNumber: "[Vergi no]",
    kep: "[KEP adresi]",
    workingHours: "Hafta içi 09.00–18.00, cumartesi 09.00–14.00",
    // Google Haritalar > Paylaş > Harita yerleştir bölümündeki src adresi
    mapEmbedUrl: "",
  },

  // WhatsApp numarası: yalnızca rakam, ülke koduyla (ör. 905321234567)
  whatsapp: "905000000000",

  social: {
    instagram: "",
    facebook: "",
    tiktok: "",
  },

  shipping: {
    fee: 89.9,
    freeThreshold: 1500,
    carrier: "[Kargo firması]",
    dispatchTime: "1–3 iş günü",
  },

  payment: {
    bankTransfer: {
      enabled: true,
      bank: "[Banka adı]",
      holder: "[Hesap sahibi]",
      iban: "TR00 0000 0000 0000 0000 0000 00",
    },
    cashOnDelivery: {
      enabled: true,
      fee: 49.9,
    },
  },

  // Siparişler bir sunucuya gönderilecekse adresi buraya yazın (JSON POST).
  // Boş bırakılırsa sipariş, müşterinin WhatsApp'ından firmaya iletilir.
  orderEndpoint: "",

  returnDays: 14,

  wholesale: {
    minQuantity: "Model başına 300 adet",
    leadTime: "Numune onayından sonra 3–5 hafta",
  },
};

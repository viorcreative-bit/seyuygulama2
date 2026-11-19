<?php
// Kaptan Ark yapay zeka ayarları.
// Bu dosya PHP çalıştıran bir sunucuda dışarıdan okunamaz. PHP desteklemeyen bir yere
// (ör. GitHub Pages, Netlify) YÜKLEMEYİN; orada anahtar herkese görünür olur.

return [
    // 'gemini' veya 'openai'
    'provider' => 'gemini',

    // Google Gemini anahtarı: https://aistudio.google.com/apikey
    'gemini_api_key' => '',
    'gemini_model' => 'gemini-flash-latest',

    // OpenAI anahtarı: https://platform.openai.com/api-keys
    'openai_api_key' => '',
    'openai_model' => 'gpt-4o-mini',

    // Widget başka bir alan adından çağrılıyorsa o adresi yazın, ör. ['https://www.arkdental.com']
    'allowed_origins' => [],

    // Kötüye kullanıma karşı sınırlar
    'per_minute_limit' => 15,   // aynı ziyaretçiden dakikada en fazla mesaj
    'daily_limit' => 1500,      // tüm ziyaretçiler için günlük en fazla mesaj (fatura güvencesi)
];

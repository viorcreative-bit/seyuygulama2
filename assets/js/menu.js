/*
 * Nonna by Big Mamma's Bahçeşehir — menü verisi
 * Kaynak: Nonna Cafe menü kataloğu (menu.pdf)
 *
 * Fiyat değiştirmek için ilgili ürünün `p` değerini güncellemeniz yeterli.
 *   n   : ürün adı
 *   p   : fiyat (₺)
 *   d   : açıklama (isteğe bağlı)
 *   tag : küçük not, ör. "2 kişilik" (isteğe bağlı)
 *   img : assets/img klasöründeki fotoğrafın adı, uzantısız (isteğe bağlı)
 */
window.NONNA_MENU = [
  {
    id: "kahvaltilar",
    title: "Kahvaltılar",
    banner: ["serpme-kahvalti"],
    note: "Kahvaltımız hafta içi ve hafta sonu 15.00'e kadar mevcuttur. Serpme kahvaltıda 10 yaş ve altı çocuklar ücretsizdir.",
    sections: [
      {
        items: [
          { n: "Serpme Kahvaltı", tag: "kişi başı", p: 590, img: "serpme-kahvalti",
            d: "Ezine beyaz peynir, dil peyniri, çeçil peyniri, taze kaşar, burgu peyniri, bal, kaymak, yeşil ve siyah zeytin, limon reçeli, çilek reçeli, Nutella, sahanda sucuk, sahanda yumurta, sigara böreği, ızgara hellim, acuka, domates soslu biber, pişi, domates, salatalık ve kuru meyveler." },
          { n: "Ev Usulü Kahvaltı", tag: "1 kişilik", p: 490, img: "ev-usulu-kahvalti",
            d: "Beyaz peynir, dil peyniri, taze kaşar, çeçil peyniri, bal, kaymak, siyah ve yeşil zeytin, limon reçeli, çilek reçeli, Nutella, sigara böreği, jambon, sahanda yumurta, domates, salatalık." },
          { n: "Sıcak Kahvaltı", tag: "1 kişilik", p: 410, img: "sicak-kahvalti",
            d: "Izgara sucuk, sigara böreği, ızgara hellim, sote patates, pişi, sosis, yumurtalı ekmek, domates, salatalık." }
        ]
      },
      {
        title: "Yumurtalar",
        items: [
          { n: "Sahanda Göz Yumurta", p: 269, d: "İki adet köy yumurtası, tereyağında." },
          { n: "Sahanda Sucuklu Göz Yumurta", p: 299, d: "İki adet köy yumurtası ve dana sucuk." },
          { n: "Sahanda Peynirli Göz Yumurta", p: 279, d: "İki adet köy yumurtası, beyaz peynir ve tereyağı." },
          { n: "Sahanda Kavurmalı Göz Yumurta", p: 325, d: "İki adet köy yumurtası, dana kavurma ve tereyağı." }
        ]
      },
      {
        title: "Omletler",
        note: "Akdeniz yeşillikleri, domates ve salatalık ile servis edilir.",
        items: [
          { n: "Sade Omlet", p: 240 },
          { n: "Kaşarlı Omlet", p: 260 },
          { n: "Mantarlı Omlet", p: 270 },
          { n: "Sebzeli Omlet", p: 300 },
          { n: "Karışık Omlet", p: 350 }
        ]
      },
      {
        title: "Menemenler",
        items: [
          { n: "Sade Menemen", p: 325 },
          { n: "Kaşarlı Menemen", p: 345 },
          { n: "Sucuklu Menemen", p: 365 },
          { n: "Karışık Menemen", p: 375 },
          { n: "Kavurmalı Menemen", p: 390 }
        ]
      }
    ]
  },
  {
    id: "baslangiclar",
    title: "Başlangıçlar",
    banner: ["dedikodu-sepeti", "borek-tabagi"],
    sections: [
      {
        items: [
          { n: "Günün Çorbası", p: 190, img: "gunun-corbasi", d: "Günün çorbasını garsonumuza sorabilirsiniz." },
          { n: "Dedikodu Sepeti", p: 399, img: "dedikodu-sepeti", d: "Kaşık patates, sosis, sigara böreği, mozzarella peyniri, cajun tavuk, soğan halkası, sos eşliğinde." },
          { n: "Cajun Tavuk", p: 449, d: "Cajun baharatı ile marine edilmiş çıtır tavuk parçaları, patates tava ve sos eşliğinde." },
          { n: "Frankfurt Sosis", p: 499, d: "Cheddarlı ve acılı seçeneğiyle Frankfurt sosis, yanında patates tava ve sos." },
          { n: "Soğan Halkası Tabağı", p: 299, d: "Patates ve sos eşliğinde." },
          { n: "Kokteyl Sosis Tabağı", p: 449, d: "Patates ve sos eşliğinde." },
          { n: "Etli Pazı Sarma", p: 449, d: "Bir Nonna klasiği." },
          { n: "Börek Tabağı", p: 449, img: "borek-tabagi", d: "Beğendili börek, paçanga böreği, sigara böreği ve bahar böreği, yoğurt sos ile." },
          { n: "Patates Tava", p: 300, d: "Sos eşliğinde." },
          { n: "Elma Dilimli Patates", p: 300, d: "Sos eşliğinde." }
        ]
      }
    ]
  },
  {
    id: "gozlemeler",
    title: "Gözlemeler",
    banner: ["kasarli-gozleme"],
    note: "Tüm gözlemeler mevsim yeşillikleri ve zeytin ile servis edilir.",
    sections: [
      {
        items: [
          { n: "Kaşarlı Gözleme", p: 349, img: "kasarli-gozleme" },
          { n: "Kaşarlı Patatesli Gözleme", p: 379 },
          { n: "Beyaz Peynirli Gözleme", p: 389, img: "beyaz-peynirli-gozleme" },
          { n: "Nonna Karışık Gözleme", p: 499 },
          { n: "Kaşarlı Kavurmalı Gözleme", p: 549 }
        ]
      }
    ]
  },
  {
    id: "tostlar",
    title: "Tostlar",
    banner: ["beyaz-peynirli-kepekli-tost"],
    note: "Tüm tostlar Akdeniz yeşillikleri ve patates tava ile servis edilir.",
    sections: [
      {
        items: [
          { n: "Kaşarlı Tost", p: 329 },
          { n: "Beyaz Peynirli Kepekli Tost", p: 350, img: "beyaz-peynirli-kepekli-tost" },
          { n: "Kaşarlı Sucuklu Tost", p: 399, img: "kasarli-sucuklu-tost" },
          { n: "Kavurmalı Kaşarlı Tost", p: 499 }
        ]
      }
    ]
  },
  {
    id: "salatalar",
    title: "Salatalar",
    banner: ["nonna-special-salata"],
    sections: [
      {
        items: [
          { n: "Nonna Special Salata", p: 519, img: "nonna-special-salata", d: "Akdeniz yeşillikleri, kokteyl domates, Çengelköy salatalık, mısır, kuru üzüm, kuru kayısı, kuru incir, ceviz, tulum peyniri, nar ekşili sos ile." },
          { n: "Somon Salata", p: 599, d: "Akdeniz yeşillikleri üzerine fesleğen ve soya sosla marine edilmiş somon, kokteyl domates, kapari çiçeği, Çengelköy salatalık ve mısır ile." },
          { n: "Ilık Biftek Salata", p: 599, d: "Körpe roka yaprakları üzerine marine edilmiş, sotelenmiş dana bonfile dilimleri, kokteyl domates, parmesan peyniri, krema ve soya sosu ile." },
          { n: "Deniz Mahsullü Salata", p: 499, d: "Akdeniz yeşillikleri üzerine kalamar, karides, kapari çiçeği, mısır, kokteyl domates, Çengelköy salatalık, fesleğen ve soya sos ile." },
          { n: "Ton Balıklı Salata", p: 499, d: "Akdeniz yeşillikleri üzerine ton balığı, kokteyl domates, Çengelköy salatalık, dilim siyah zeytin, kapari çiçeği, mısır, yağ ve limon sos ile." },
          { n: "Sezar Salata", tag: "tavuklu", p: 499, d: "Göbek marul yaprakları üzerine ızgara tavuk göğsü, kruton, parmesan peyniri ve sezar sos." },
          { n: "Cajun Sezar Salata", p: 429, img: "cajun-sezar-salata", d: "Göbek marul yaprakları üzerine çıtır tavuk parçaları, kruton, parmesan peyniri ve sezar sos ile." },
          { n: "Chefin Salatası", p: 379, img: "chefin-salatasi", d: "İnce kıyım marul yaprakları, domates, salatalık, mısır, dilim zeytin, kuru soğan, kızarmış patates, cajun tavuk parçaları, Nonna spesiyal sos ile." },
          { n: "Roka Salata", p: 349, img: "roka-salata", d: "İnce doğranmış körpe roka yaprakları, kokteyl domates, parmesan peyniri, zeytinyağı ve limon sos ile." },
          { n: "Çoban Salata", p: 349, d: "Küp doğranmış organik domates, Çengelköy salatalık, yeşil biber, kuru soğan, maydanoz, yağ ve limon sos ile." }
        ]
      }
    ]
  },
  {
    id: "makarnalar",
    title: "Makarna ve Mantı",
    banner: ["dort-peynirli-ravioli"],
    quote: "Makarnanın hikâyesi eskiye dayanır ama verdiği mutluluk hep yenidir.",
    sections: [
      {
        title: "Makarnalar",
        items: [
          { n: "Spagetti Bolonez", p: 549, img: "spagetti-bolonez", d: "Dana kıyma, domates sos ve parmesan ile." },
          { n: "Fettucini Alfredo", p: 569, d: "Tavuk bonfile dilimleri, kültür mantarı, krema ve parmesan peyniri ile." },
          { n: "Fettucini Carbonara", p: 539, d: "Dana jambon, kültür mantarı, krema ve parmesan peyniri ile." },
          { n: "Penne Arabiata", p: 499, d: "İtalyan klasiği: fesleğenli acı domates sos, parmesan peyniri, roka yaprakları ve zeytin ile." },
          { n: "Penne Turco", p: 699, img: "penne-turco", d: "Bonfile dilimleri, fesleğen, parmesan peyniri, süzme yoğurt ve krema sos ile." },
          { n: "Dört Peynirli Ravioli", p: 549, img: "dort-peynirli-ravioli", d: "Ev yapımı ravioli, dört peynir dolgusu, krema, parmesan peyniri ve domates sos ile." },
          { n: "Karidesli Spagetti", p: 649, img: "karidesli-spagetti", d: "Karides, krema ve parmesan peyniri ile." },
          { n: "Deniz Mahsullü Spagetti", p: 599, d: "Kalamar, karides ve fesleğenli domates sos ile." }
        ]
      },
      {
        title: "Mantılar",
        items: [
          { n: "Kayseri Mantı", p: 499, d: "Süzme yoğurt ve acı sos ile." },
          { n: "Çıtır Mantı", p: 499, d: "Süzme yoğurt ve acı sos ile." }
        ]
      }
    ]
  },
  {
    id: "noodle",
    title: "Noodle",
    banner: ["deniz-mahsullu-noodle", "etli-noodle"],
    quote: "Bir kâse noodle, dünyanın karmaşasında küçük bir mola; sade ama her lokmada huzur.",
    sections: [
      {
        items: [
          { n: "Sebzeli Noodle", p: 399, img: "sebzeli-noodle", d: "Mantar, soğan, kabak, havuç, susam, brokoli, renkli biberler, susam yağı, sweet chili ve soya sosu ile." },
          { n: "Tavuklu Noodle", p: 449, d: "Jülyen doğranmış tavuk, mantar, soğan, kabak, havuç, susam, brokoli, renkli biberler, susam yağı, sweet chili ve soya sosu ile." },
          { n: "Deniz Mahsullü Noodle", p: 599, img: "deniz-mahsullu-noodle", d: "Karides, kalamar, kabak, havuç, susam, renkli biberler, susam yağı, sweet chili ve soya sosu ile." },
          { n: "Etli Noodle", p: 649, img: "etli-noodle", d: "Jülyen doğranmış biftek dilimleri, mantar, soğan, kabak, havuç, susam, brokoli, renkli biberler, susam yağı, sweet chili ve soya sosu ile." }
        ]
      }
    ]
  },
  {
    id: "pizzalar",
    title: "Pizzalar",
    banner: ["mozaik-pizza", "deniz-mahsullu-pizza"],
    quote: "Pizza, Napoli'nin dar sokaklarında doğup tüm dünyayı fetheden bir lezzet mirasıdır; her dilimde tarihin sıcak izi vardır.",
    sections: [
      {
        items: [
          { n: "Margarita Pizza", p: 449, img: "margarita-pizza", d: "Domates sos, mozzarella peyniri ve fesleğen sos ile." },
          { n: "Vejetaryen Pizza", p: 499, d: "Domates sos, mozzarella peyniri ve mevsim sebzeleri ile." },
          { n: "Mozaik Pizza", p: 549, img: "mozaik-pizza", d: "Sucuk, salam, jambon, mantar, zeytin, mısır, biber ve domates sos ile." },
          { n: "Chicken Texas Pizza", p: 549, d: "Barbekü tavuk, soğan, kırmızı biber ve jalapeno biberi ile." },
          { n: "Pizza Milano", p: 569, d: "Domates sos, mozzarella peyniri, jambon ve mantar ile." },
          { n: "4 Peynirli Pizza", p: 599, img: "dort-peynirli-pizza", d: "Domates sos, mozzarella, cheddar, rokfor ve parmesan peyniri ile." },
          { n: "Ton Balıklı Pizza", p: 629, d: "Domates sos, mozzarella peyniri, renkli biberler, mısır, zeytin, soğan ve ton balığı ile." },
          { n: "Deniz Mahsullü Pizza", p: 629, img: "deniz-mahsullu-pizza", d: "Domates sos, mozzarella peyniri, kalamar, karides, somon ve körpe roka yaprakları ile." },
          { n: "Pizza Turco", p: 699, d: "Domates sos, mozzarella peyniri, yeşil biber, kavurma, soğan ve cherry domates ile." },
          { n: "Frankfurt Sosisli Pizza", p: 749, img: "frankfurt-sosisli-pizza", d: "Frankfurt sosis, mozzarella peyniri, domates sos, kavurma, roka, kırmızı biber ve parmesan peyniri." }
        ]
      }
    ]
  },
  {
    id: "pideler",
    title: "Pideler",
    banner: ["sucuklu-kasarli-pide"],
    quote: "Pide, Anadolu'nun taş fırınlarında doğan kadim bir lezzettir; her lokmasında toprağın, emeğin ve geleneğin izi saklıdır.",
    note: "Tüm pideler mevsim yeşillikleri ile servis edilir.",
    sections: [
      {
        items: [
          { n: "Kaşarlı Pide", p: 499 },
          { n: "Sucuklu Kaşarlı Pide", p: 529, img: "sucuklu-kasarli-pide" },
          { n: "Kuşbaşılı Kaşarlı Pide", p: 699, img: "kusbasili-kasarli-pide" },
          { n: "Kavurmalı Kaşarlı Pide", p: 699 }
        ]
      }
    ]
  },
  {
    id: "burgerler",
    title: "Burgerler",
    banner: ["nonna-calzone-burger", "alaturka-burger"],
    quote: "Kökeni geleneksel köfte ekmek anlayışına dayansa da hamburger, modern dünyanın en ikonik lezzeti olarak geçmişi bugüne taşır.",
    sections: [
      {
        items: [
          { n: "Nonna Calzone Burger", p: 699, img: "nonna-calzone-burger", d: "Dana burger, sucuk, pastırma, jambon, karamelize soğan ve mantar, cheddar peyniri, patates tava ve binada sos ile." },
          { n: "Nonna Special Chef Burger", p: 699, d: "Dana burger, dana lokum, dana jambon, karamelize soğan, mantar, cheddar peyniri, patates tava ve binada sos ile." },
          { n: "Alaturka Burger", p: 599, img: "alaturka-burger", d: "Dana burger, sucuk, kaşar, cheddar peyniri, domates, turşu, marul yaprakları, patates tava ve binada sos ile." },
          { n: "Mantar Burger", p: 599, img: "mantar-burger", d: "150 gr dana burger, karamelize mantar, soğan, eritilmiş cheddar peyniri, domates, turşu, marul yaprağı, patates tava ve binada sos ile." },
          { n: "Cheese Burger", p: 599, d: "Dana burger, domates, turşu, marul yaprakları, cheddar peyniri, patates tava ve binada sos ile." },
          { n: "Chicken Burger", p: 499, d: "Panelenmiş çıtır tavuk, domates, turşu, marul yaprağı, patates tava ve binada sos ile." }
        ]
      }
    ]
  },
  {
    id: "wrap-quesadilla",
    title: "Wrap ve Quesadilla",
    banner: ["tavuklu-acili-quesadilla", "etli-wrap"],
    sections: [
      {
        items: [
          { n: "Tavuklu Wrap", p: 429, d: "Tortilla ekmeği içinde tavuk parçaları, renkli biberler, mantar, soğan; patates tava ve binada sos ile." },
          { n: "Köfteli Wrap", p: 549, d: "Tortilla ekmeği içinde ızgara köfte parçaları, renkli biberler, mantar, soğan; patates tava ve binada sos ile." },
          { n: "Etli Wrap", p: 649, img: "etli-wrap", d: "Tortilla ekmeği içinde biftek parçaları, renkli biberler, mantar, soğan; patates tava ve binada sos ile." },
          { n: "Tavuklu Acılı Quesadilla", p: 449, img: "tavuklu-acili-quesadilla", d: "Tortilla arasında renkli biberler, mantar, soğan, jalapeno biberi, tavuk parçaları, mozzarella peyniri; soslar ve patates tava ile." },
          { n: "Etli Acılı Quesadilla", p: 699, img: "etli-acili-quesadilla", d: "Tortilla arasında renkli biberler, mantar, soğan, jalapeno biberi, bonfile parçaları, mozzarella peyniri; soslar ve patates tava ile." }
        ]
      }
    ]
  },
  {
    id: "beyaz-etler",
    title: "Beyaz Etler",
    banner: ["pilic-kulbasti", "kori-soslu-tavuk"],
    sections: [
      {
        items: [
          { n: "Dağ Kekikli Piliç Izgara", p: 499, d: "Taze baharatlarla marine edilmiş ızgara tavuk göğsü, patates püresi ve mevsim sebzeleri ile." },
          { n: "Piliç Külbastı", p: 499, img: "pilic-kulbasti", d: "Taze baharatlarla marine edilmiş ızgara tavuk külbastı, patates püresi ve mevsim sebzeleri ile." },
          { n: "Tavuk Şinitzel", p: 499, d: "Panelenmiş çıtır tavuk bonfile, jasmine pilavı, patates tava ve gökkuşağı salata ile." },
          { n: "Barbekü Soslu Tavuk", p: 499, d: "Piliç but ızgara, jasmine pilavı, patates tava ve gökkuşağı salata ile." },
          { n: "Izgara Kanat", p: 519, img: "izgara-kanat", d: "Pirinç pilavı, patates tava, köz domates ve biber ile." },
          { n: "Nonna Mantarlı Şinitzel", p: 529, d: "Çıtır şinitzel üzerine beşamel mantar sos ve eritilmiş mozzarella peyniri; patates tava ve gökkuşağı salata ile." },
          { n: "Köri Soslu Tavuk", p: 529, img: "kori-soslu-tavuk", d: "Köri sos ve krema ile sotelenmiş piliç göğüs parçaları, renkli biberler, mantar; patates tava, jasmine pilavı ve gökkuşağı salata ile." },
          { n: "Chili Soslu Tavuk", tag: "acılı", p: 529, img: "chili-soslu-tavuk", d: "Piliç göğüs parçaları, mantar, renkli biberler, soğan, jalapeno biberi, soya sosu; jasmine pilavı, patates tava ve gökkuşağı salata ile." }
        ]
      }
    ]
  },
  {
    id: "deniz-mahsulleri",
    title: "Deniz Mahsulleri",
    banner: ["karides-guvec", "somon-izgara"],
    quote: "Karides, okyanusların berrak sularından sofralarımıza uzanan eşsiz bir deniz lezzetidir; her lokmasında denizin hafifliği, doğanın tazeliği hissedilir.",
    sections: [
      {
        items: [
          { n: "Levrek Tava", p: 649, img: "levrek-tava", d: "Patates sote, soğan ve roka ile." },
          { n: "Somon Izgara", p: 699, img: "somon-izgara", d: "Patates sote, soğan ve roka ile." },
          { n: "Karides Güveç", p: 699, img: "karides-guvec", d: "Tereyağında sotelenmiş karides; domates, biber, soğan, sarımsak ve mantar ile." },
          { n: "Bütün Çipura Izgara", p: 799, d: "Patates sote, soğan ve roka ile." }
        ]
      }
    ]
  },
  {
    id: "fajitalar",
    title: "Fajitalar",
    banner: ["combo-fajita"],
    note: "Fajitalar renkli biberler, jalapeno biberi, avokado sos ve sour cream sos ile servis edilir.",
    sections: [
      {
        items: [
          { n: "Tavuklu Fajita", p: 499, img: "tavuklu-fajita", d: "Izgara tavuk dilimleri." },
          { n: "Combo Fajita", p: 649, img: "combo-fajita", d: "Izgara tavuk ve dana bonfile dilimleri." },
          { n: "Etli Fajita", p: 799, img: "etli-fajita", d: "Izgara dana bonfile dilimleri." }
        ]
      }
    ]
  },
  {
    id: "kirmizi-etler",
    title: "Kırmızı Etler",
    banner: ["kuzu-incik", "antrikot"],
    sections: [
      {
        items: [
          { n: "Izgara Köfte", p: 599, d: "Pirinç pilavı, patates tava, gökkuşağı salata, köz domates ve biber ile." },
          { n: "Lübnan Kebabı", p: 849, img: "lubnan-kebabi", d: "Tortillaya sarılmış zırhta çekilmiş köfteler, soğan, roka, domates, kornişon turşusu, közlenmiş biber, tereyağı ve yoğurt sos ile." },
          { n: "Kuzu İncik", p: 999, img: "kuzu-incik", d: "Fırınlanmış patates püresi yatağında, demiglace sos ile." },
          { n: "Saç Tava", tag: "200 gr", p: 1099, d: "Minik et parçaları, domates, biber ve kuru soğan; pirinç pilavı ile." },
          { n: "Çoban Kavurma", tag: "200 gr", p: 1099, img: "coban-kavurma", d: "Domates, biber, mantar ve soğan ile harmanlanmış; pirinç pilavı ile." },
          { n: "Izgara Bonfile", tag: "200 gr", p: 1199, d: "Patates tava ve sebze sote; seçime göre mantar sos, café de Paris sos, hardal sos veya pepper sos ile." },
          { n: "Izgara Lokum Bonfile", tag: "200 gr", p: 1249, d: "Bonfile lokum parçaları, kumpir patates, köz domates ve biber; seçime göre mantar sos veya café de Paris sos ile." },
          { n: "Antrikot", tag: "250 gr", p: 1299, img: "antrikot", d: "Izgara süt dana antrikot, haşlanmış sebze, sote patates, köz domates ve biber ile." },
          { n: "Kuzu Pirzola", p: 1499, d: "Patates püresi, domates ve biber ile." },
          { n: "Izgara Dana Pirzola", p: 1499, d: "Patates tava ve mevsim sebzeleri ile." }
        ]
      }
    ]
  },
  {
    id: "tatlilar",
    title: "Tatlılar",
    banner: ["san-sebastian", "karayip-katlari"],
    sections: [
      {
        items: [
          { n: "San Sebastian", p: 499, img: "san-sebastian", d: "Çikolata sos veya frambuaz sos ile." },
          { n: "Karayip Katları", p: 599, img: "karayip-katlari", d: "Antep fıstığı kaplamalı vanilyalı dondurma, brownie keki ve çikolata sos eşliğinde." },
          { n: "Waffle", p: 499, img: "waffle" },
          { n: "Profiterol", p: 449, img: "profiterol" },
          { n: "Antep Katmer", p: 449, img: "antep-katmer" },
          { n: "Brownie", p: 429, img: "brownie", d: "Dondurma ile." },
          { n: "Sufle", p: 429, d: "Dondurma ve vanilya sos ile." },
          { n: "Kızarmış Dondurma", p: 399 },
          { n: "Magnolia", p: 359, d: "Muzlu veya çilekli." },
          { n: "Tiramisu", p: 359 },
          { n: "Sütlaç", p: 329 },
          { n: "Cup Dondurma", p: 299 },
          { n: "Mevsim Meyve Tabağı", tag: "2 kişilik", p: 499 },
          { n: "Lux Çerez", p: 499 }
        ]
      }
    ]
  },
  {
    id: "kahveler",
    title: "Kahveler",
    banner: ["white-chocolate-mocha", "turk-kahvesi", "salep"],
    sections: [
      {
        items: [
          { n: "Espresso", p: 184, img: "espresso" },
          { n: "Double Espresso", p: 200 },
          { n: "Americano", p: 210 },
          { n: "Macchiato", p: 210 },
          { n: "Cappuccino", p: 210 },
          { n: "Flat White", p: 210 },
          { n: "Latte", p: 210 },
          { n: "Nescafe", p: 210, d: "Sütlü veya sade." },
          { n: "Filtre Kahve", p: 220 },
          { n: "Aromalı Latte", p: 240, d: "Fındık, vanilya veya karamel." },
          { n: "Sıcak Çikolata", p: 250 },
          { n: "White Chocolate Mocha", p: 250, img: "white-chocolate-mocha" }
        ]
      },
      {
        title: "Türk kahvesi ve salep",
        items: [
          { n: "Türk Kahvesi", p: 140, img: "turk-kahvesi" },
          { n: "Damla Sakızlı Türk Kahvesi", p: 145 },
          { n: "Sütlü Türk Kahvesi", p: 145 },
          { n: "Menengiç Kahvesi", p: 145 },
          { n: "Dibek Kahvesi", p: 145 },
          { n: "Duble Damla Sakızlı Kahve", p: 210 },
          { n: "Klasik Salep", p: 220, img: "salep" },
          { n: "Damla Sakızlı Salep", p: 230 }
        ]
      },
      {
        title: "Soğuk kahveler",
        items: [
          { n: "Ice Americano", p: 240 },
          { n: "Ice Latte", p: 250 },
          { n: "Affogato", p: 250 },
          { n: "Ice Mocha", p: 260 },
          { n: "Ice White Mocha", p: 260 }
        ]
      }
    ]
  },
  {
    id: "caylar",
    title: "Çay ve Bitki Çayları",
    banner: ["cay", "kis-cayi", "bitki-cayi"],
    sections: [
      {
        items: [
          { n: "Çay", p: 75, img: "cay" },
          { n: "Fincan Çay", p: 120 },
          { n: "Kış Çayı", p: 250, img: "kis-cayi" },
          { n: "Bitki Çayı", p: 250, img: "bitki-cayi" },
          { n: "Elma Tarçın", p: 250 },
          { n: "Rezene", p: 250 },
          { n: "Yeşil Çay", p: 250 },
          { n: "Ihlamur", p: 250 },
          { n: "Orman Meyveli", p: 250 },
          { n: "Nane Limon", p: 250 },
          { n: "Ada Çayı", p: 250 },
          { n: "Papatya", p: 250 }
        ]
      }
    ]
  },
  {
    id: "soguk-icecekler",
    title: "Soğuk İçecekler",
    banner: ["cilekli-milkshake", "cikolatali-frappe", "oreo-milkshake"],
    sections: [
      {
        items: [
          { n: "Frozen Çeşitleri", p: 260, d: "Çilek, yeşil elma, nane limon, karpuz, mango, şeftali, muz, kavun, karadut, böğürtlen." },
          { n: "Frape Çeşitleri", p: 260, img: "cikolatali-frappe", d: "Çikolata, karamel, vanilya." },
          { n: "Smoothie Çeşitleri", p: 260, d: "Çilek, karpuz, mango, kavun, kırmızı orman meyveleri, kivi, şeftali, muz." },
          { n: "Milkshake Çeşitleri", p: 270, img: "cilekli-milkshake", d: "Çilek, vanilya, çikolata, karamel, mango, muz, Oreo." }
        ]
      }
    ]
  },
  {
    id: "kokteyller",
    title: "Kokteyller",
    banner: ["cinderella", "blue-siesta", "buzlu-mor-ruya", "mojito"],
    note: "Tüm kokteyllerimiz alkolsüzdür.",
    sections: [
      {
        items: [
          { n: "Mojito", p: 345, img: "mojito", d: "Taze nane yaprağı, limon suyu, mojito şurubu, esmer şeker, Sprite, sade soda." },
          { n: "Blue Garden", p: 345, d: "Elma şurubu, şeftali şurubu, limon suyu, Red Bull." },
          { n: "Sunset", p: 345, d: "Çilek şurubu, muz şurubu, portakal suyu." },
          { n: "Strawberry Aphrodisia", p: 345, d: "Nar şurubu, limon suyu, çilek püresi, sade soda." },
          { n: "Blue Siesta", p: 345, img: "blue-siesta", d: "Limon suyu, turunç şurubu, tekila şurubu, Sprite." },
          { n: "Sex on the Beach", p: 345, d: "Nar şurubu, şeftali şurubu, tekila şurubu, portakal suyu, ananas suyu." },
          { n: "Havana", p: 345, d: "Nar şurubu, karadut püresi, patlamış nane, Red Bull." },
          { n: "Changer", p: 345, d: "Limon suyu, böğürtlen püresi, patlamış nane, vişne suyu, sade soda." },
          { n: "Cool Lime", p: 345, d: "Limon suyu, patlamış nane, cool lime, lime şurubu, Sprite." },
          { n: "Cinderella", p: 345, img: "cinderella", d: "Limon suyu, nar şurubu, portakal suyu, ananas suyu." },
          { n: "Buzlu Mor Rüya", p: 345, img: "buzlu-mor-ruya", d: "Nar şurubu, turunç şurubu, limon suyu, Sprite." },
          { n: "Summer Fresh", p: 499 }
        ]
      }
    ]
  },
  {
    id: "mesrubatlar",
    title: "Meşrubat ve Vitamin Bar",
    banner: ["limonata", "nar-suyu", "mesrubatlar"],
    sections: [
      {
        title: "Meşrubatlar",
        items: [
          { n: "Coca-Cola", p: 140 },
          { n: "Coca-Cola Zero", p: 140 },
          { n: "Fanta", p: 140 },
          { n: "Sprite", p: 140 },
          { n: "Schweppes", p: 140, d: "Mandalina, bitter limon." },
          { n: "Cappy", p: 140, d: "Vişne, şeftali, kayısı, karışık." },
          { n: "Lipton Ice Tea", p: 140, d: "Şeftali, limon, mango, karpuz, nane." },
          { n: "Churchill", p: 120 },
          { n: "Meyveli Soda", p: 120 },
          { n: "Ayran", p: 110, d: "Naneli." },
          { n: "Soda", p: 110, d: "Sade, çilek, karpuz, limon, elma." }
        ]
      },
      {
        title: "Vitamin bar",
        items: [
          { n: "Limonata", p: 195, img: "limonata", d: "Çilek, nane, yeşil elma, mango." },
          { n: "Portakal Suyu", p: 250 },
          { n: "Elma Suyu", p: 250 },
          { n: "Havuç Suyu", p: 250 },
          { n: "Nar Suyu", p: 290, img: "nar-suyu" },
          { n: "Ginger Detox", p: 300 },
          { n: "Multi Vitamin", p: 499 },
          { n: "Ananas Kokteyl", p: 699 }
        ]
      }
    ]
  },
  {
    id: "nargile",
    title: "Nargile",
    banner: ["nargile"],
    sections: [
      {
        items: [
          { n: "Klasik Tatlar", p: 725, d: "Elma, portakal, nane, böğürtlen, kola, çilek, kavun, şeftali, karpuz, karamel." },
          { n: "Jibiar Tobacco", p: 735, d: "Master mix, tiramisu, dejavu, polombir, lime peach, bisküvi, fındık, ice kola, turkish mastik, ananas, vanilya." },
          { n: "Adalya Tobacco", p: 735, d: "Lady killer, love66, ice bombom, pişmiş şeftali, mandalina, mango tango, moscow, swiss bombom, izmir romantik." },
          { n: "Special Tatlar", p: 745, d: "Exotic, summer breeze, moet, kahveci, kaktüs, cheesecake." },
          { n: "Al Fakher Tobacco", p: 755, d: "Çift elma, üzüm, cappuccino, vivident sakız, tarçın sakız, damla sakız, okyanus, yaban mersini, limon." },
          { n: "Nakla Tobacco", p: 755, d: "Cappuccino, elma, şeftali." },
          { n: "Premium Tobacco", p: 795, d: "Pinkman, dominick, pink floyd, irish cream, absolute zero, dejaflue, infinity, marvella, tatlı cadı, rich rich, ladyfinger." },
          { n: "Pinkman", p: 895 },
          { n: "Nonna Premium", p: 1195 }
        ]
      },
      {
        title: "Ekstralar",
        items: [
          { n: "Marpuç", p: 60 },
          { n: "Buzlu Marpuç", p: 100 },
          { n: "Extra Lüle", p: 425 },
          { n: "Gold Lüle", p: 455 }
        ]
      }
    ]
  }
];

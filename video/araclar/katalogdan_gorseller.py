#!/usr/bin/env python3
"""Güçlü Group kataloğundaki (PDF) görselleri video için çıkarır: video/gorseller/

Kullanım: python3 araclar/katalogdan_gorseller.py Guclu_Group_Katalog.pdf

pdfimages (poppler-utils) ve Pillow gerekir. Görseller kataloğun sayfa/sıra
numarasına göre adlandırılır; katalog değişirse aşağıdaki eşleştirme güncellenmelidir.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

KOK = Path(__file__).resolve().parent.parent
HEDEF = KOK / "gorseller"
EN_BUYUK = 2400

# (sayfa, sıra) -> dosya adı
FOTOGRAFLAR = {
    (2, 6): "giris-maket.jpg",
    (4, 7): "rakamlar.jpg",
    (7, 11): "hakkimizda-ekip.jpg",
    (8, 14): "yonetim-aile.jpg",
    (9, 15): "marka-degeri.jpg",
    (11, 18): "baskan-huseyin-celik.jpg",
    (12, 19): "kalite.jpg",
    (14, 21): "cevre.jpg",
    (17, 25): "is-guvenligi.jpg",
    (47, 91): "tecrube.jpg",
    (63, 107): "kapanis.jpg",
    (18, 28): "kat-konut.jpg",
    (30, 56): "kat-altyapi.jpg",
    (42, 86): "kat-karayolu.jpg",
    (50, 94): "kat-restorasyon.jpg",
    (58, 102): "kat-avm.jpg",
    # konut ve rezidans
    (20, 30): "p-bahcesehir-konut-1.jpg", (20, 31): "p-bahcesehir-konut-2.jpg", (20, 32): "p-bahcesehir-konut-3.jpg",
    (21, 33): "p-almata-1.jpg", (21, 34): "p-almata-2.jpg", (21, 35): "p-almata-3.jpg",
    (22, 36): "p-loza-1.jpg", (22, 37): "p-loza-2.jpg", (22, 38): "p-loza-3.jpg",
    (23, 39): "p-loza-4.jpg", (24, 42): "p-loza-5.jpg", (25, 43): "p-loza-6.jpg",
    (26, 44): "p-kaspi-1.jpg", (26, 45): "p-kaspi-2.jpg", (26, 46): "p-kaspi-3.jpg",
    (27, 47): "p-cimkent-1.jpg", (27, 48): "p-cimkent-2.jpg", (27, 49): "p-cimkent-3.jpg",
    (28, 50): "p-prag-1.jpg", (28, 51): "p-prag-2.jpg", (28, 52): "p-prag-3.jpg",
    (29, 53): "p-kiptas-1.jpg", (29, 54): "p-kiptas-2.jpg", (29, 55): "p-kiptas-3.jpg",
    # altyapı
    (32, 58): "p-bahcesehir-altyapi-1.jpg", (32, 59): "p-bahcesehir-altyapi-2.jpg", (32, 60): "p-bahcesehir-altyapi-3.jpg",
    (33, 61): "p-atiksu-tunel-1.jpg", (33, 62): "p-atiksu-tunel-2.jpg", (33, 63): "p-atiksu-tunel-3.jpg",
    (34, 64): "p-iski-tunel-1.jpg", (34, 65): "p-iski-tunel-2.jpg", (34, 66): "p-iski-tunel-3.jpg",
    (36, 70): "p-deniz-desarj-1.jpg", (36, 71): "p-deniz-desarj-2.jpg", (36, 72): "p-deniz-desarj-3.jpg",
    (38, 78): "p-corlu-1.jpg", (38, 79): "p-corlu-2.jpg", (38, 80): "p-corlu-3.jpg", (39, 83): "p-corlu-4.jpg",
    (40, 84): "p-tuzla-1.jpg",
    (41, 85): "p-kilis-1.jpg",
    # karayolu ve çevre düzenleme
    (44, 88): "p-besikduzu-1.jpg",
    (45, 89): "p-canakkale-1.jpg",
    (46, 90): "p-taksim-1.jpg",
    (48, 92): "p-sultanahmet-1.jpg", (49, 93): "p-sultanahmet-2.jpg",
    # restorasyon
    (52, 96): "p-sadabad-1.jpg",
    (53, 97): "p-bahcesehir-camii-1.jpg",
    (54, 98): "p-fransiz-hapishanesi-1.jpg",
    (55, 99): "p-istanbul-surlari-1.jpg",
    (56, 100): "p-fethi-pasa-1.jpg",
    (57, 101): "p-coban-mustafa-pasa-1.jpg",
    # avm
    (60, 104): "p-karatay-avm-1.jpg",
}

# Beyaz logolar: katalogdaki maske (siyah zemin üzerinde beyaz) saydamlık olarak kullanılır.
MASKELER = {
    (1, 5): "logo-beyaz.png",
    (63, 109): "35-yil-beyaz.png",
    (23, 41): "loza-logo.png",
    (35, 68): "isveren-iski.png",
    (37, 74): "isveren-euas.png",
    (37, 76): "isveren-ibb.png",
    (39, 82): "isveren-sanayi.png",
}


def maske_png(kaynak, hedef, olcek=4):
    """Maskeyi büyütüp kenarlarını keskinleştirerek beyaz, saydam PNG üretir."""
    m = Image.open(kaynak).convert("L")
    m = m.resize((m.width * olcek, m.height * olcek), Image.LANCZOS)
    m = m.point(lambda v: max(0, min(255, (v - 80) * 255 // 95)))
    beyaz = Image.new("RGBA", m.size, (255, 255, 255, 0))
    beyaz.putalpha(m)
    beyaz = beyaz.crop(m.getbbox())
    beyaz.save(hedef, optimize=True)


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    pdf = Path(sys.argv[1])
    HEDEF.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as gecici:
        subprocess.run(["pdfimages", "-j", "-p", str(pdf), f"{gecici}/i"], check=True)
        dosyalar = {}
        for f in Path(gecici).iterdir():
            _, sayfa, sira = f.stem.split("-")
            dosyalar[(int(sayfa), int(sira))] = f

        for anahtar, ad in FOTOGRAFLAR.items():
            im = Image.open(dosyalar[anahtar]).convert("RGB")
            if max(im.size) > EN_BUYUK:
                im.thumbnail((EN_BUYUK, EN_BUYUK), Image.LANCZOS)
            im.save(HEDEF / ad, quality=90, optimize=True)

        for anahtar, ad in MASKELER.items():
            maske_png(dosyalar[anahtar], HEDEF / ad)

        # faaliyet haritası: renkli harita + ayrı saydamlık maskesi
        harita = Image.open(dosyalar[(6, 9)]).convert("RGB")
        harita.putalpha(Image.open(dosyalar[(6, 10)]).convert("L"))
        harita.save(HEDEF / "harita.png", optimize=True)

    print(f"{len(FOTOGRAFLAR) + len(MASKELER) + 1} görsel -> {HEDEF}")


if __name__ == "__main__":
    main()

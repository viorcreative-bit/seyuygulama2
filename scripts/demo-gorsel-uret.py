# Demo aşçılar için yemek illüstrasyonları üretir (Python + Pillow gerekir).
# Çıktı: demo-veri/gorseller/*.jpg  — Bu görseller GERÇEK fotoğraf değildir, yalnızca demo amaçlıdır.
import math, random, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

BOY = 1200  # çizim boyu, sonra 800'e küçültülür (kenar yumuşatma için)
CIKTI = Path(__file__).resolve().parent.parent / 'demo-veri' / 'gorseller'

def tabak(d, cx, cy, r, ic=(250, 246, 238), kenar=(226, 218, 204)):
    d.ellipse((cx - r - 10, cy - r + 2, cx + r + 10, cy + r + 20), fill=(0, 0, 0, 40))  # gölge
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=kenar)
    d.ellipse((cx - r * .92, cy - r * .92, cx + r * .92, cy + r * .92), fill=ic)
    d.ellipse((cx - r * .62, cy - r * .62, cx + r * .62, cy + r * .62), outline=(236, 229, 216), width=4)

def yaprak(d, x, y, boy, aci, renk):
    a = math.radians(aci)
    ucx, ucy = x + math.cos(a) * boy, y + math.sin(a) * boy
    mx, my = (x + ucx) / 2, (y + ucy) / 2
    nx, ny = -math.sin(a) * boy * .28, math.cos(a) * boy * .28
    d.polygon([(x, y), (mx + nx, my + ny), (ucx, ucy), (mx - nx, my - ny)], fill=renk)

def maydanoz(d, rnd, cx, cy, r, adet=10, boy=40):
    for _ in range(adet):
        a = rnd.uniform(0, 6.28); k = rnd.uniform(0, r)
        yaprak(d, cx + math.cos(a) * k, cy + math.sin(a) * k, boy, rnd.uniform(0, 360), (rnd.randint(40, 80), rnd.randint(130, 170), rnd.randint(40, 70)))

def pilav(d, rnd, cx, cy, R):
    tabak(d, cx, cy, R)
    for _ in range(900):
        a = rnd.uniform(0, 6.28); k = (rnd.random() ** .6) * R * .6
        x, y = cx + math.cos(a) * k, cy + math.sin(a) * k - (R * .6 - k) * .15
        c = rnd.choice([(255, 250, 235), (250, 238, 200), (244, 226, 170), (255, 255, 250)])
        d.ellipse((x - 9, y - 4, x + 9, y + 4), fill=c)
    for _ in range(14):
        x, y = cx + rnd.uniform(-R * .4, R * .4), cy + rnd.uniform(-R * .35, R * .35)
        d.ellipse((x - 9, y - 9, x + 9, y + 9), fill=rnd.choice([(150, 90, 40), (60, 60, 60), (200, 150, 70)]))
    maydanoz(d, rnd, cx, cy - R * .1, R * .3, 8)

def kofte(d, rnd, cx, cy, R):
    tabak(d, cx, cy, R)
    for i in range(7):
        a = i / 7 * 6.28 + .3; x, y = cx + math.cos(a) * R * .38, cy + math.sin(a) * R * .38
        d.ellipse((x - 100, y - 54, x + 100, y + 54), fill=(120, 70, 38))
        d.ellipse((x - 90, y - 46, x + 82, y + 38), fill=(150, 92, 52))
        for _ in range(7):
            d.line((x + rnd.randint(-70, 60), y + rnd.randint(-30, 30), x + rnd.randint(-60, 70), y + rnd.randint(-30, 30)), fill=(95, 55, 30), width=4)
    for i in range(5):
        x, y = cx + rnd.uniform(-R * .5, R * .5), cy + R * .62 + rnd.uniform(-20, 20)
        d.ellipse((x - 50, y - 50, x + 50, y + 50), fill=(204, 52, 40)); d.ellipse((x - 34, y - 34, x + 34, y + 34), fill=(232, 90, 70))
    maydanoz(d, rnd, cx, cy, R * .5, 7)

def corba(d, rnd, cx, cy, R, renk=(224, 120, 40)):
    tabak(d, cx, cy, R, ic=(240, 236, 226))
    d.ellipse((cx - R * .55, cy - R * .55, cx + R * .55, cy + R * .55), fill=(250, 250, 246))
    d.ellipse((cx - R * .48, cy - R * .48, cx + R * .48, cy + R * .48), fill=renk)
    for k in range(5):
        d.arc((cx - R * (.12 + .07 * k), cy - R * (.12 + .07 * k), cx + R * (.12 + .07 * k), cy + R * (.12 + .07 * k)), 20 + 40 * k, 200 + 40 * k, fill=(255, 220, 160), width=7)
    d.ellipse((cx - 28, cy - 28, cx + 28, cy + 28), fill=(255, 245, 225))
    maydanoz(d, rnd, cx + 20, cy - 10, R * .22, 7, 30)
    d.pieslice((cx + R * .5, cy - R * .78, cx + R * 1.0, cy - R * .28), 90, 270, fill=(250, 220, 70))

def baklava(d, rnd, cx, cy, R):
    tabak(d, cx, cy, R)
    for gx in range(-1, 2):
        for gy in range(-1, 2):
            x, y = cx + gx * 190 + gy * 40, cy + gy * 175 - gx * 20
            d.polygon([(x - 90, y), (x, y - 70), (x + 90, y), (x, y + 70)], fill=(214, 152, 56))
            d.polygon([(x - 78, y), (x, y - 58), (x + 78, y), (x, y + 58)], fill=(233, 182, 78))
            for k in range(-2, 3):
                d.line((x - 50 + k * 22, y + 30, x + 10 + k * 22, y - 40), fill=(205, 140, 48), width=3)
            d.ellipse((x - 16, y - 12, x + 16, y + 12), fill=(120, 170, 70))

def sarma(d, rnd, cx, cy, R):
    tabak(d, cx, cy, R)
    for row in range(-2, 3):
        for i in range(4):
            x = cx - 170 + i * 115 + (row % 2) * 40; y = cy + row * 96
            d.ellipse((x - 62, y - 34, x + 62, y + 34), fill=(70, 110, 40))
            d.ellipse((x - 54, y - 28, x + 50, y + 22), fill=(104, 150, 58))
            d.line((x - 40, y, x + 40, y), fill=(70, 110, 40), width=3)
    d.ellipse((cx + R * .35, cy + R * .45, cx + R * .75, cy + R * .85), fill=(250, 220, 70))

def manti(d, rnd, cx, cy, R):
    tabak(d, cx, cy, R, ic=(244, 238, 228))
    for _ in range(46):
        a = rnd.uniform(0, 6.28); k = (rnd.random() ** .55) * R * .62
        x, y = cx + math.cos(a) * k, cy + math.sin(a) * k
        d.polygon([(x - 26, y + 18), (x + 26, y + 18), (x, y - 26)], fill=(240, 214, 160))
    d.ellipse((cx - R * .5, cy - R * .5, cx + R * .5, cy + R * .5), fill=(252, 250, 244))
    for _ in range(46):
        a = rnd.uniform(0, 6.28); k = (rnd.random() ** .55) * R * .62
        x, y = cx + math.cos(a) * k, cy + math.sin(a) * k
        d.polygon([(x - 24, y + 16), (x + 24, y + 16), (x, y - 24)], fill=(238, 208, 150))
    for _ in range(26):
        a = rnd.uniform(0, 6.28); k = rnd.uniform(0, R * .5)
        d.ellipse((cx + math.cos(a) * k - 10, cy + math.sin(a) * k - 10, cx + math.cos(a) * k + 10, cy + math.sin(a) * k + 10), fill=(196, 50, 30))
    maydanoz(d, rnd, cx, cy, R * .35, 8, 28)

def salata(d, rnd, cx, cy, R):
    tabak(d, cx, cy, R, ic=(244, 240, 230))
    for _ in range(46):
        a = rnd.uniform(0, 6.28); k = (rnd.random() ** .5) * R * .68
        yaprak(d, cx + math.cos(a) * k, cy + math.sin(a) * k, rnd.randint(70, 110), rnd.uniform(0, 360), (rnd.randint(60, 110), rnd.randint(150, 195), rnd.randint(60, 90)))
    for _ in range(9):
        a = rnd.uniform(0, 6.28); k = rnd.uniform(0, R * .5); x, y = cx + math.cos(a) * k, cy + math.sin(a) * k
        d.ellipse((x - 42, y - 42, x + 42, y + 42), fill=(206, 50, 38)); d.ellipse((x - 28, y - 28, x + 28, y + 28), fill=(232, 96, 78))
    for _ in range(7):
        a = rnd.uniform(0, 6.28); k = rnd.uniform(0, R * .55); x, y = cx + math.cos(a) * k, cy + math.sin(a) * k
        d.ellipse((x - 34, y - 34, x + 34, y + 34), fill=(150, 200, 110)); d.ellipse((x - 24, y - 24, x + 24, y + 24), fill=(218, 238, 190))
    for _ in range(9):
        a = rnd.uniform(0, 6.28); k = rnd.uniform(0, R * .5); x, y = cx + math.cos(a) * k, cy + math.sin(a) * k
        d.ellipse((x - 14, y - 11, x + 14, y + 11), fill=(40, 34, 40))

def balik(d, rnd, cx, cy, R):
    tabak(d, cx, cy, R * 1.05, ic=(246, 244, 238))
    d.ellipse((cx - 330, cy - 120, cx + 270, cy + 120), fill=(166, 176, 188))
    d.ellipse((cx - 300, cy - 100, cx + 250, cy + 96), fill=(196, 206, 214))
    d.polygon([(cx + 240, cy), (cx + 400, cy - 120), (cx + 400, cy + 120)], fill=(150, 162, 176))
    d.ellipse((cx - 260, cy - 40, cx - 224, cy - 4), fill=(30, 30, 30))
    for k in range(9):
        d.arc((cx - 200 + k * 36, cy - 80, cx - 120 + k * 36, cy + 80), 280, 80, fill=(140, 152, 164), width=4)
    for i in range(3):
        x, y = cx - 180 + i * 190, cy + 190
        d.ellipse((x - 62, y - 62, x + 62, y + 62), fill=(246, 214, 70)); d.ellipse((x - 46, y - 46, x + 46, y + 46), fill=(252, 238, 150))
    maydanoz(d, rnd, cx + 60, cy - 170, 90, 9, 34)

def sis(d, rnd, cx, cy, R):
    tabak(d, cx, cy, R * 1.05, ic=(242, 226, 190))
    for k in range(3):
        y = cy - 150 + k * 150
        d.line((cx - 380, y, cx + 380, y), fill=(190, 190, 195), width=8)
        for i in range(7):
            x = cx - 330 + i * 110
            d.rounded_rectangle((x - 46, y - 36, x + 46, y + 36), 14, fill=(122, 64, 32)); d.rounded_rectangle((x - 38, y - 30, x + 30, y + 22), 12, fill=(158, 90, 46))
    for i in range(4):
        x, y = cx - 200 + i * 130, cy + 270
        d.ellipse((x - 60, y - 40, x + 60, y + 40), outline=(190, 120, 190), width=14)
    for i in range(3):
        x = cx + R * .55 + i * 24; d.ellipse((x - 44, cy + R * .5, x + 44, cy + R * .5 + 88), fill=(204, 52, 40))

def menemen(d, rnd, cx, cy, R):
    d.ellipse((cx - R - 20, cy - R - 10, cx + R + 20, cy + R + 30), fill=(0, 0, 0, 80))
    d.ellipse((cx - R, cy - R, cx + R, cy + R), fill=(58, 58, 62)); d.ellipse((cx - R * .9, cy - R * .9, cx + R * .9, cy + R * .9), fill=(214, 82, 48))
    for _ in range(60):
        a = rnd.uniform(0, 6.28); k = rnd.random() * R * .8
        d.ellipse((cx + math.cos(a) * k - 22, cy + math.sin(a) * k - 22, cx + math.cos(a) * k + 22, cy + math.sin(a) * k + 22), fill=rnd.choice([(248, 214, 70), (236, 96, 54), (130, 160, 60)]))
    d.rectangle((cx + R * .85, cy - 26, cx + R * 1.5, cy + 26), fill=(58, 58, 62))
    maydanoz(d, rnd, cx, cy, R * .5, 8, 34)

def borek(d, rnd, cx, cy, R):
    tabak(d, cx, cy, R)
    for ring in range(6):
        r = R * (.62 - ring * .1)
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(190, 120, 50), width=22)
        d.ellipse((cx - r + 10, cy - r + 10, cx + r - 10, cy + r - 10), outline=(228, 168, 82), width=12)
    for _ in range(40):
        a = rnd.uniform(0, 6.28); k = rnd.random() * R * .6
        d.ellipse((cx + math.cos(a) * k - 6, cy + math.sin(a) * k - 6, cx + math.cos(a) * k + 6, cy + math.sin(a) * k + 6), fill=(255, 250, 235))

def sutlac(d, rnd, cx, cy, R):
    tabak(d, cx, cy, R * .85, ic=(245, 244, 240))
    d.ellipse((cx - R * .55, cy - R * .55, cx + R * .55, cy + R * .55), fill=(214, 120, 70)); d.ellipse((cx - R * .48, cy - R * .48, cx + R * .48, cy + R * .48), fill=(252, 246, 232))
    d.ellipse((cx - R * .4, cy - R * .4, cx + R * .4, cy + R * .4), fill=(246, 232, 196))
    for _ in range(260):
        a = rnd.uniform(0, 6.28); k = rnd.random() * R * .4
        d.ellipse((cx + math.cos(a) * k - 5, cy + math.sin(a) * k - 5, cx + math.cos(a) * k + 5, cy + math.sin(a) * k + 5), fill=(178, 108, 60))
    for k in range(3):
        d.line((cx - 60 + k * 60, cy - 100, cx - 20 + k * 60, cy + 100), fill=(160, 90, 50), width=7)

def fasulye(d, rnd, cx, cy, R):
    tabak(d, cx, cy, R, ic=(240, 236, 226))
    d.ellipse((cx - R * .7, cy - R * .7, cx + R * .7, cy + R * .7), fill=(176, 84, 40))
    for _ in range(170):
        a = rnd.uniform(0, 6.28); k = (rnd.random() ** .6) * R * .62
        x, y = cx + math.cos(a) * k, cy + math.sin(a) * k
        d.ellipse((x - 26, y - 14, x + 26, y + 14), fill=(246, 240, 224)); d.ellipse((x - 22, y - 10, x + 14, y + 8), fill=(255, 252, 240))
    for _ in range(14):
        x, y = cx + rnd.uniform(-R * .5, R * .5), cy + rnd.uniform(-R * .5, R * .5)
        d.ellipse((x - 20, y - 20, x + 20, y + 20), fill=(196, 110, 50))
    maydanoz(d, rnd, cx - 80, cy + 60, R * .25, 7, 30)

YEMEKLER = {
    'pilav': pilav, 'kofte': kofte, 'corba': corba, 'baklava': baklava, 'sarma': sarma, 'manti': manti,
    'salata': salata, 'balik': balik, 'sis': sis, 'menemen': menemen, 'borek': borek, 'sutlac': sutlac, 'fasulye': fasulye,
}
ZEMINLER = [(122, 86, 58), (90, 64, 48), (168, 132, 96), (60, 52, 50), (196, 170, 130), (112, 74, 52), (84, 96, 80), (150, 100, 80)]

def uret(yemek, tohum, dosya):
    rnd = random.Random(tohum)
    z = ZEMINLER[tohum % len(ZEMINLER)]
    im = Image.new('RGBA', (BOY, BOY), z + (255,))
    d = ImageDraw.Draw(im, 'RGBA')
    for y in range(0, BOY, 38):  # ahşap/masa dokusu
        d.line((0, y, BOY, y + rnd.randint(-6, 6)), fill=(255, 255, 255, 14 if y % 76 else 8), width=3)
    for _ in range(80):
        x, y = rnd.randint(0, BOY), rnd.randint(0, BOY)
        d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=(0, 0, 0, 22))
    cx, cy = BOY // 2 + rnd.randint(-30, 30), BOY // 2 + rnd.randint(-30, 30)
    YEMEKLER[yemek](d, rnd, cx, cy, 470)
    # vinyet
    v = Image.new('L', (BOY, BOY), 0); vd = ImageDraw.Draw(v)
    vd.ellipse((-200, -200, BOY + 200, BOY + 200), fill=255); v = v.filter(ImageFilter.GaussianBlur(220))
    koyu = Image.new('RGBA', (BOY, BOY), (0, 0, 0, 120)); im = Image.composite(im, Image.alpha_composite(im, koyu), v)
    im.convert('RGB').resize((800, 800), Image.LANCZOS).save(dosya, quality=82)


# ---------------------------------------------------------------------------
# Demo aşçı verisi ve SQL üretimi
# ---------------------------------------------------------------------------
import uuid, zlib, datetime

SUPABASE_TABAN = 'https://skuqzizpjtfwgfidksws.supabase.co/storage/v1/object/public/fotograflar/demo/'
import json as _json
SURUM = _json.loads((Path(__file__).resolve().parent.parent / 'src' / 'yasal' / 'metinler.json').read_text(encoding='utf-8'))['surum']

# ad, uzmanlıklar, semtler, fiyat, günler, tanıtım, yemekler(4), yorum sayısı
ASCILAR = [
    ('Ayşe Demir', ['Ege', 'Türk mutfağı', 'Diyet'], ['Kadıköy', 'Moda', 'Ataşehir'], 5200, ['Pazartesi', 'Salı', 'Çarşamba'], 'Ege mutfağının zeytinyağlılarını ve mevsim yemeklerini evinizde taze taze hazırlıyorum. On iki yıllık deneyimim var.', ['sarma', 'salata', 'borek', 'corba'], 8),
    ('Mehmet Kaya', ['Antep', 'Türk mutfağı'], ['Şişli', 'Beşiktaş', 'Levent'], 6500, ['Perşembe', 'Cuma', 'Cumartesi'], 'Gaziantepliyim; kebabın, köftenin ve baklavanın en doğrusunu biliyorum. Haftalık menüler hazırlarım.', ['kofte', 'sis', 'baklava', 'corba'], 6),
    ('Zeynep Arslan', ['Vegan', 'Diyet'], ['Üsküdar', 'Kadıköy'], 4800, ['Pazartesi', 'Çarşamba', 'Cuma'], 'Beslenme danışmanlığı geçmişimle vegan ve düşük kalorili, doyurucu menüler hazırlıyorum.', ['salata', 'corba', 'fasulye', 'pilav'], 5),
    ('Hasan Çelik', ['Çocuk yemekleri', 'Tatlı ve pasta'], ['Bakırköy', 'Yeşilköy'], 4500, ['Salı', 'Perşembe'], 'Çocukların sevdiği, besleyici ve renkli yemekler. Alerji ve seçici yeme konusunda deneyimliyim.', ['manti', 'sutlac', 'pilav', 'kofte'], 7),
    ('Elif Yıldız', ['Deniz ürünleri', 'Karadeniz'], ['Sarıyer', 'Beşiktaş', 'Bebek'], 7000, ['Çarşamba', 'Cuma', 'Pazar'], 'Karadeniz kökenli bir ailede büyüdüm. Balık ve deniz ürünlerini taptaze, en sade ve lezzetli haliyle pişiririm.', ['balik', 'pilav', 'salata', 'corba'], 4),
    ('Fatma Şahin', ['Türk mutfağı'], ['Kadıköy', 'Maltepe', 'Kartal'], 4200, ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe'], 'Anne eli değmiş gibi ev yemekleri: kuru fasulye, pilav, sarma ve sütlaç. Evinizde yemek kokusu eksik olmasın.', ['fasulye', 'pilav', 'sarma', 'sutlac'], 6),
    ('Kemal Öztürk', ['Karadeniz', 'Türk mutfağı'], ['Beyoğlu', 'Şişli', 'Kâğıthane'], 5000, ['Pazartesi', 'Cuma', 'Cumartesi'], 'Trabzonluyum; mısır ekmeği, hamsi ve çorba benim işim. Doyurucu ve geleneksel menüler.', ['balik', 'corba', 'pilav', 'menemen'], 3),
    ('Selin Aydın', ['Tatlı ve pasta'], ['Nişantaşı', 'Etiler', 'Beşiktaş'], 5500, ['Cumartesi', 'Pazar'], 'Pastacılık eğitimi aldım. Ev yemeklerinin yanına tatlı ve börek ikramı eklemekten keyif alırım.', ['baklava', 'sutlac', 'borek', 'manti'], 5),
    ('Murat Koç', ['Antep', 'Türk mutfağı'], ['Ataşehir', 'Üsküdar', 'Ümraniye'], 6000, ['Salı', 'Perşembe', 'Cumartesi'], 'Izgaranın ve kebabın ustasıyım; salata ve mezelerle tam bir sofra kurarım.', ['sis', 'kofte', 'salata', 'baklava'], 6),
    ('Gül Erdem', ['Diyet', 'Vegan'], ['Kadıköy', 'Moda', 'Fenerbahçe'], 5300, ['Pazartesi', 'Çarşamba', 'Perşembe'], 'Diyetisyenlerle çalışan bir aşçıyım. Porsiyon ve kalori hedefinize uygun, lezzetli menüler hazırlarım.', ['salata', 'corba', 'fasulye', 'menemen'], 2),
    ('Ahmet Polat', ['Türk mutfağı'], ['Bakırköy', 'Zeytinburnu', 'Fatih'], 4000, ['Salı', 'Çarşamba', 'Cuma'], 'Klasik Türk mutfağı: köfte, pilav, kuru fasulye ve taze salata. Sade ve bol yemek.', ['kofte', 'pilav', 'fasulye', 'salata'], 7),
    ('Esra Güneş', ['Ege', 'Türk mutfağı'], ['Beşiktaş', 'Ortaköy', 'Sarıyer'], 5800, ['Pazartesi', 'Perşembe', 'Cuma'], 'İzmirliyim; otlu, zeytinyağlı ve deniz kokulu Ege sofralarını İstanbul evlerine getiriyorum.', ['sarma', 'borek', 'salata', 'balik'], 4),
    ('Burak Yılmaz', ['Deniz ürünleri'], ['Kadıköy', 'Caddebostan', 'Bostancı'], 6800, ['Çarşamba', 'Cuma'], 'Balıkçı ailesinden geliyorum. Taze balık, kalamar ve karides; sunumu da şık.', ['balik', 'salata', 'pilav', 'corba'], 3),
    ('Naz Tekin', ['Çocuk yemekleri'], ['Ataşehir', 'Kozyatağı', 'Kadıköy'], 4600, ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe'], 'İki çocuk annesiyim; çocuklar için sağlıklı, eğlenceli ve alerjene dikkat eden yemekler hazırlıyorum.', ['manti', 'sutlac', 'menemen', 'pilav'], 5),
    ('Orhan Başaran', ['Karadeniz', 'Türk mutfağı'], ['Üsküdar', 'Çengelköy', 'Beykoz'], 4900, ['Cuma', 'Cumartesi', 'Pazar'], 'Rizeli bir aşçıyım. Sıcak çorbalar, fasulye ve mısır unlu lezzetlerle sofranızı ısıtırım.', ['corba', 'fasulye', 'pilav', 'menemen'], 0),
    ('Derya Aksoy', ['Vegan'], ['Beyoğlu', 'Cihangir', 'Şişli'], 5400, ['Pazartesi', 'Salı', 'Cuma'], 'Bitkisel mutfakta Türk lezzetlerini yeniden yorumluyorum; et ve süt ürünü kullanmadan doyurucu yemekler.', ['salata', 'sarma', 'fasulye', 'corba'], 3),
    ('İbrahim Kurt', ['Antep'], ['Esenyurt', 'Başakşehir', 'Bakırköy'], 5600, ['Perşembe', 'Cuma', 'Cumartesi'], 'Antep usulü yemekler: yuvalama, kebap, mantı ve fıstıklı baklava. Büyük sofralar için ideal.', ['sis', 'kofte', 'manti', 'baklava'], 4),
    ('Seda Çakır', ['Türk mutfağı', 'Diyet'], ['Kadıköy', 'Göztepe', 'Acıbadem'], 5100, ['Salı', 'Çarşamba', 'Perşembe'], 'Hafif ama doyurucu ev yemekleri. Haftalık plan yapar, alışverişi listeye göre ben tamamlarım.', ['corba', 'salata', 'borek', 'pilav'], 6),
    ('Cem Özkan', ['Türk mutfağı', 'Ege'], ['Beşiktaş', 'Levent', 'Etiler'], 6200, ['Pazartesi', 'Çarşamba', 'Cumartesi'], 'Otel mutfaklarında on yıl çalıştım; şimdi evlerde çalışıyorum. Sunumuma ve temizliğe çok dikkat ederim.', ['balik', 'sarma', 'salata', 'pilav'], 3),
    ('Nilay Karaca', ['Tatlı ve pasta', 'Çocuk yemekleri'], ['Maltepe', 'Kartal', 'Pendik'], 4400, ['Cumartesi', 'Pazar'], 'Tatlı yapmaya bayılırım; baklava, sütlaç ve börekle misafir sofralarını da renklendiririm.', ['baklava', 'sutlac', 'borek', 'manti'], 2),
]
# Demo aşçıların (kurgusal kişiler) avatarı: K = kadın, E = erkek avatar; kendi içinde sırayla dağıtılır.
def _avatarlar(cinsiyetler):
    sayac = {'K': 0, 'E': 0}
    sonuc = []
    for c in cinsiyetler:
        sayac[c] += 1
        sonuc.append(('kadin' if c == 'K' else 'erkek') + str((sayac[c] - 1) % 3 + 1))
    return sonuc
AVATAR_ANAHTAR = _avatarlar('KEKEKKEKEKEKEKEKEKEK')

MUSTERILER = ['Ali Veli', 'Selin Kaya', 'Can Öztürk', 'Deniz Arı', 'Burcu Sönmez', 'Emre Tuna', 'Pınar Gür', 'Volkan Ece']
YORUM5 = ['Harika yemekler, çok temiz ve düzenli çalıştı. Kesinlikle tavsiye ederim.', 'Bütün hafta eve gelince sıcak yemek bulmak müthiş bir rahatlıktı.', 'Lezzet ve sunum mükemmeldi, misafirlerimiz bayıldı.', 'Çok güler yüzlü, işini bilen biri. Tekrar çağıracağım.', 'Alerji konusunda çok dikkatliydi, içim rahattı.', 'Mutfağı derli toplu bıraktı, yemekler ev yapımı tadındaydı.', 'Çocuklarım bile tabaklarını bitirdi, teşekkürler.', 'Zamanında geldi, planladığı gibi hazırladı, her şey çok güzeldi.', 'Menü çeşitliliği süperdi, her gün farklı bir lezzet.', 'Fiyatına göre inanılmaz kaliteli bir hizmet.']
YORUM4 = ['Yemekler güzeldi, sadece biraz geç geldi.', 'Genel olarak çok memnun kaldık, tuzu biraz azdı.', 'Lezzetliydi, porsiyonlar bol. Tekrar çalışırım.', 'Temiz ve düzenli, yemekler güzeldi.', 'İyi bir deneyimdi, menüyü biraz daha çeşitlendirebilir.', 'Güvenilir ve işinin ehli.']
YORUM3 = ['Yemekler fena değildi ama beklentimin biraz altında kaldı.', 'İyiydi, fakat zamanlama konusunda iletişim zayıftı.', 'Ortalama bir deneyim, geliştirilebilir.']
CEVAP = ['Güzel yorumunuz için çok teşekkür ederim, tekrar görüşmek dileğiyle!', 'Memnun kalmanıza sevindim, afiyet olsun.', 'Teşekkür ederim, geri bildiriminizi dikkate alacağım.', 'Değerlendirmeniz için teşekkürler, çok mutlu oldum.']

def sq(x):
    return "'" + str(x).replace("'", "''") + "'"

def dizi(liste):
    return "array[" + ", ".join(sq(x) for x in liste) + "]::text[]" if liste else "'{}'::text[]"

def uid(onek, i):
    return f"dddddddd-0000-4000-8000-{onek}{i:09d}"

YEMEK_BILGI = {
    'pilav': ('Tereyağlı şehriyeli pilav', 'pirinç, tereyağı, şehriye, tavuk suyu, tuz'),
    'kofte': ('Izgara köfte', 'dana kıyma, soğan, galeta unu, maydanoz, kimyon, karabiber, tuz'),
    'corba': ('Mercimek çorbası', 'kırmızı mercimek, soğan, havuç, patates, tereyağı, limon, pul biber'),
    'baklava': ('Fıstıklı baklava', 'yufka, antep fıstığı, tereyağı, şeker, su, limon'),
    'sarma': ('Zeytinyağlı yaprak sarma', 'asma yaprağı, pirinç, soğan, zeytinyağı, nane, dereotu, limon'),
    'manti': ('El açması mantı', 'un, yumurta, dana kıyma, soğan, yoğurt, sarımsak, tereyağı, pul biber'),
    'salata': ('Mevsim salatası', 'marul, domates, salatalık, roka, zeytinyağı, nar ekşisi, limon'),
    'balik': ('Fırında levrek', 'levrek, zeytinyağı, limon, dereotu, domates, biber, tuz'),
    'sis': ('Tavuk şiş', 'tavuk göğsü, yoğurt, zeytinyağı, kekik, sarımsak, biber salçası'),
    'menemen': ('Soğanlı menemen', 'yumurta, domates, yeşil biber, soğan, tereyağı, tuz, pul biber'),
    'borek': ('Ispanaklı su böreği', 'yufka, ıspanak, beyaz peynir, yumurta, süt, tereyağı'),
    'sutlac': ('Fırın sütlaç', 'süt, pirinç, şeker, nişasta, vanilya'),
    'fasulye': ('Kuru fasulye', 'kuru fasulye, soğan, salça, tereyağı, pul biber, tuz'),
}

def sql_uret():
    rnd = random.Random(2026)
    sat = []
    a = sat.append
    a("-- Aşçım Gelsin DEMO VERİSİ: 20 örnek aşçı, 8 örnek müşteri, örnek talepler ve yorumlar.")
    a("-- DİKKAT: Bunlar gerçek kişiler değildir; yayından önce demo_veri_sil.sql ile silinmelidir.")
    a("-- Görseller: demo-veri/gorseller klasöründeki dosyalar Storage'da fotograflar/demo/ klasörüne yüklenmiş olmalı.")
    a("-- Supabase panelinde SQL Editor'e yapıştırıp Run'a bas. Tekrar çalıştırmak güvenlidir (önce eski demo verisi silinir).\n")
    a("delete from auth.users where id::text like 'dddddddd-%';\n")
    kullanicilar = []
    for i, x in enumerate(ASCILAR, 1):
        kullanicilar.append((uid('000', i), f"9000000{i:04d}"))
    for i, x in enumerate(MUSTERILER, 1):
        kullanicilar.append((uid('001', i), f"9000001{i:04d}"))
    satir = []
    for uuid_, tel in kullanicilar:
        satir.append(f"({sq(uuid_)}::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', {sq(tel)}, now(), extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), '{{\"provider\":\"phone\",\"providers\":[\"phone\"]}}'::jsonb, '{{\"sifre_var\":true,\"demo\":true}}'::jsonb, now(), now(), '', '', '', '')")
    a("insert into auth.users (id, instance_id, aud, role, phone, phone_confirmed_at, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change) values\n" + ",\n".join(satir) + ";\n")
    # profiller
    satir = []
    for i, x in enumerate(ASCILAR, 1):
        foto = SUPABASE_TABAN.replace('/demo/', '/avatar/') + AVATAR_ANAHTAR[i - 1] + '.png'
        satir.append(f"({sq(uid('000', i))}::uuid, 'asci', {sq(x[0])}, {sq('+9000000' + f'{i:04d}')}, {sq(foto)}, {sq(SURUM)})")
    for i, ad in enumerate(MUSTERILER, 1):
        satir.append(f"({sq(uid('001', i))}::uuid, 'musteri', {sq(ad)}, {sq('+9000001' + f'{i:04d}')}, null, {sq(SURUM)})")
    a("insert into public.profiles (id, rol, ad, telefon, fotograf, kvkk_onay_surumu) values\n" + ",\n".join(satir) + ";\n")
    satir = []
    for i, x in enumerate(ASCILAR, 1):
        satir.append(f"({sq(uid('000', i))}::uuid, {sq(x[5])}, {dizi(x[1])}, {dizi(x[2])}, {x[3]}, {dizi(x[4])}, true, now() - interval '{i} days')")
    a("insert into public.asci_profilleri (profil_id, tanitim, uzmanliklar, semtler, baslangic_fiyati, musait_gunler, onayli_mi, guncelleme_tarihi) values\n" + ",\n".join(satir) + ";\n")
    satir = []
    for i, x in enumerate(ASCILAR, 1):
        for k in (1, 2, 3):
            satir.append(f"({sq(uid('000', i))}::uuid, {sq(SUPABASE_TABAN + f'asci{i:02d}-{k}.jpg')}, {k - 1})")
    a("insert into public.asci_fotograflari (asci_id, adres, sira) values\n" + ",\n".join(satir) + ";\n")
    satir = []
    for i, x in enumerate(ASCILAR, 1):
        for k, anahtar in enumerate(x[6]):
            ad, mal = YEMEK_BILGI[anahtar]
            satir.append(f"({sq(uid('000', i))}::uuid, {sq(ad)}, {sq(mal)}, {k})")
    a("-- Aşçı yemekleri ve malzemeleri (schema_16.sql çalıştırılmışsa eklenir)")
    a("do $$ begin if to_regclass('public.asci_yemekleri') is not null then insert into public.asci_yemekleri (asci_id, ad, malzemeler, sira) values\n" + ",\n".join(satir) + "; end if; end $$;\n")
    # talepler + yorumlar
    talepler, yorumlar = [], []
    for i, x in enumerate(ASCILAR, 1):
        for j in range(x[7]):
            tid = str(uuid.UUID(int=rnd.getrandbits(128), version=4))
            musteri = rnd.randint(1, len(MUSTERILER))
            gun = rnd.randint(6, 75)
            semt = rnd.choice(x[2])
            talepler.append(f"({sq(tid)}::uuid, {sq(uid('001', musteri))}::uuid, {sq(uid('000', i))}::uuid, {sq(semt)}, now() - interval '{gun} days', {rnd.choice([2, 3, 4, 4, 5, 6])}, {dizi(x[1][:1])}, 'tamamlandi', now() - interval '{gun + 7} days')")
            yildiz = rnd.choices([5, 4, 3], weights=[62, 30, 8])[0]
            metin = rnd.choice({5: YORUM5, 4: YORUM4, 3: YORUM3}[yildiz])
            cevap = sq(rnd.choice(CEVAP)) if rnd.random() < .45 else 'null'
            cevap_t = f"now() - interval '{max(gun - 2, 1)} days'" if cevap != 'null' else 'null'
            yorumlar.append(f"({sq(tid)}::uuid, {sq(uid('001', musteri))}::uuid, {sq(uid('000', i))}::uuid, {yildiz}, {sq(metin)}, {cevap}, {cevap_t}, now() - interval '{max(gun - 1, 1)} days')")
    a("insert into public.talepler (id, musteri_id, asci_id, semt, tarih, kisi_sayisi, mutfak_tercihleri, durum, olusturma_tarihi) values\n" + ",\n".join(talepler) + ";\n")
    a("insert into public.yorumlar (talep_id, musteri_id, asci_id, yildiz, yorum, asci_cevabi, cevap_tarihi, olusturma_tarihi) values\n" + ",\n".join(yorumlar) + ";\n")
    reklam = []
    for i, (marka, baslik, alt, _) in enumerate(REKLAMLAR, 1):
        reklam.append(f"({sq('DEMO ' + marka + ' kampanyası')}, {sq(marka)}, {sq(SUPABASE_TABAN + f'reklam-{i}.jpg')}, 'https://example.com/', {i})")
    a("-- Demo reklam banner'ları (schema_13.sql çalıştırılmışsa eklenir)")
    a("do $$ begin if to_regclass('public.reklamlar') is not null then delete from public.reklamlar where baslik like 'DEMO %'; insert into public.reklamlar (baslik, reklamveren, gorsel_adres, hedef_adres, sira) values\n" + ",\n".join(reklam) + "; end if; end $$;\n")
    return "\n".join(sat)

REKLAMLAR = [
    ('DEMO Market', 'Haftalık alışverişin kapında', 'Taze sebze, meyve ve et ürünlerinde ilk siparişe %10 indirim', ((231, 76, 60), (120, 20, 20))),
    ('DEMO Mutfak', 'Mutfak ekipmanlarında %20 indirim', 'Tencere, tava ve bıçak setleri bu hafta indirimde', ((52, 152, 219), (20, 50, 90))),
    ('DEMO Çiftlik', 'Köy yumurtası ve doğal süt', 'Çiftlikten sofranıza, haftalık abonelik fırsatı', ((46, 160, 90), (16, 70, 40))),
]

def reklam_uret(i, marka, baslik, alt, renkler, dosya):
    from PIL import ImageFont
    W, H = 1200, 300
    im = Image.new('RGB', (W, H), renkler[1])
    d = ImageDraw.Draw(im)
    for x in range(W):
        t = x / W
        d.line((x, 0, x, H), fill=tuple(int(renkler[0][k] * (1 - t) + renkler[1][k] * t) for k in range(3)))
    for cx, cy, r in [(1020, 70, 190), (1130, 250, 120), (900, 280, 70)]:
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=tuple(min(255, c + 70) for c in renkler[0]), width=4)
    def font(boy, kalin=True):
        for yol in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if kalin else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
                    '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf' if kalin else '/usr/share/fonts/dejavu/DejaVuSans.ttf']:
            try:
                return ImageFont.truetype(yol, boy)
            except OSError:
                pass
        return ImageFont.load_default()
    d.text((60, 52), marka.upper(), font=font(30), fill=(255, 235, 150))
    d.text((60, 104), baslik, font=font(54), fill=(255, 255, 255))
    d.text((60, 190), alt, font=font(28, False), fill=(255, 245, 235))
    d.rounded_rectangle((W - 250, H - 62, W - 24, H - 20), 20, fill=(0, 0, 0))
    d.text((W - 238, H - 55), 'DEMO REKLAM', font=font(24), fill=(255, 220, 90))
    im.save(dosya, quality=85)

if __name__ == '__main__':
    CIKTI.mkdir(parents=True, exist_ok=True)
    for f in CIKTI.glob('*.jpg'):
        f.unlink()
    adet = 0
    for i, x in enumerate(ASCILAR, 1):
        for k, yemek in enumerate(x[6]):
            uret(yemek, zlib.crc32(f'{i}-{k}-{yemek}'.encode()) % 100000, CIKTI / f'asci{i:02d}-{k}.jpg')
            adet += 1
    for i, (marka, baslik, alt, renkler) in enumerate(REKLAMLAR, 1):
        reklam_uret(i, marka, baslik, alt, renkler, CIKTI / f'reklam-{i}.jpg')
        adet += 1
    sql = Path(__file__).resolve().parent.parent / 'supabase' / 'demo_veri.sql'
    sql.write_text(sql_uret(), encoding='utf-8')
    (sql.parent / 'demo_veri_sil.sql').write_text(
        "-- Demo verisini siler (örnek aşçılar, müşteriler, talepler, yorumlar). Gerçek kullanıcılara dokunmaz.\n"
        "delete from auth.users where id::text like 'dddddddd-%';\n"
        "do $$ begin if to_regclass('public.reklamlar') is not null then delete from public.reklamlar where baslik like 'DEMO %'; end if; end $$;\n"
        "-- Ardından Storage > fotograflar > demo klasörünü de silmeyi unutma.\n", encoding='utf-8')
    print(f'{adet} gorsel ve SQL dosyalari uretildi')

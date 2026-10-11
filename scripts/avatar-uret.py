# Kayıt ekranındaki 6 avatarı çizer: assets/avatars/*.png  (python3 scripts/avatar-uret.py)
from PIL import Image, ImageDraw
import math, os

S = 1024          # çizim boyutu (sonra 512'ye küçültülür)
CIKTI = os.path.join(os.path.dirname(__file__), '..', 'assets', 'avatars')
os.makedirs(CIKTI, exist_ok=True)

def yeni(zemin):
    im = Image.new('RGB', (S, S), zemin)
    return im, ImageDraw.Draw(im)

def omuz(d, renk, yaka=None):
    d.ellipse((120, 700, 904, 1300), fill=renk)  # omuzlar
    if yaka:
        d.polygon([(420, 700), (604, 700), (512, 830)], fill=yaka)

def boyun(d, ten):
    d.rounded_rectangle((440, 590, 584, 760), 40, fill=ten)

def yuz(d, ten, golge):
    d.ellipse((312, 250, 712, 700), fill=ten)             # yüz
    d.ellipse((290, 450, 336, 540), fill=ten)             # kulaklar
    d.ellipse((688, 450, 734, 540), fill=ten)

def ifade(d, goz=(40, 50, 60), gulus=(120, 50, 50), kas=(60, 40, 30), yanak=None):
    for x in (430, 594):
        d.ellipse((x - 22, 468, x + 22, 520), fill=goz)
        d.ellipse((x - 8, 478, x + 2, 490), fill=(255, 255, 255))
        d.arc((x - 40, 420, x + 40, 470), 200, 340, fill=kas, width=12)
    d.arc((432, 520, 592, 640), 25, 155, fill=gulus, width=14)   # gülümseme
    d.ellipse((498, 540, 526, 560), fill=None, outline=None)
    if yanak:
        for x in (392, 632):
            d.ellipse((x - 34, 560, x + 34, 600), fill=yanak)

def kaydet(im, ad):
    im.resize((512, 512), Image.LANCZOS).save(os.path.join(CIKTI, ad + '.png'), optimize=True)

# ---- Kadın 1: uzun koyu kahve saç, kırmızı üst, sarı zemin
im, d = yeni((254, 192, 16))
saç = (70, 40, 30); ten = (240, 200, 170)
d.ellipse((250, 200, 774, 900), fill=saç)                    # arka saç
omuz(d, (163, 9, 9)); boyun(d, (220, 175, 145)); yuz(d, ten, None)
d.pieslice((300, 210, 724, 560), 180, 360, fill=saç)         # kâkül/üst
d.polygon([(312, 400), (450, 270), (700, 330), (712, 420), (600, 330)], fill=saç)
ifade(d, yanak=(240, 160, 150))
kaydet(im, 'kadin1')

# ---- Kadın 2: topuz, açık kahve saç, turuncu zemin, hardal üst
im, d = yeni((236, 120, 80))
saç = (150, 95, 55); ten = (232, 186, 150)
d.ellipse((410, 90, 614, 290), fill=saç)                     # topuz
omuz(d, (254, 192, 16)); boyun(d, (210, 165, 130)); yuz(d, ten, None)
d.pieslice((300, 220, 724, 560), 180, 360, fill=saç)
d.polygon([(312, 420), (360, 300), (512, 250), (664, 300), (712, 420), (690, 330), (512, 290), (334, 330)], fill=saç)
ifade(d, yanak=(235, 150, 130))
kaydet(im, 'kadin2')

# ---- Kadın 3: başörtülü, pembe/gül başörtü, krem zemin
im, d = yeni((255, 240, 215))
ten = (238, 196, 160); ortu = (190, 70, 90)
omuz(d, ortu)
d.ellipse((240, 190, 784, 830), fill=ortu)                   # örtü dış
d.rounded_rectangle((260, 600, 764, 860), 120, fill=ortu)
d.ellipse((330, 290, 694, 690), fill=ten)                    # yüz
d.pieslice((330, 270, 694, 520), 180, 360, fill=ortu)        # alın üstü örtü
ifade(d, yanak=(240, 160, 150))
kaydet(im, 'kadin3')

# ---- Erkek 1: kısa siyah saç, mavi gömlek, krem zemin
im, d = yeni((250, 232, 200))
saç = (35, 30, 30); ten = (225, 180, 145)
omuz(d, (50, 90, 140), (255, 248, 231)); boyun(d, (205, 160, 125)); yuz(d, ten, None)
d.pieslice((306, 230, 718, 520), 180, 360, fill=saç)
d.rectangle((306, 360, 330, 450), fill=saç); d.rectangle((694, 360, 718, 450), fill=saç)
ifade(d, kas=(35, 30, 30))
kaydet(im, 'erkek1')

# ---- Erkek 2: kısa saç + sakal, kırmızı zemin, koyu yeşil üst
im, d = yeni((196, 60, 50))
saç = (60, 40, 25); ten = (214, 165, 128)
omuz(d, (50, 100, 70)); boyun(d, (195, 148, 112)); yuz(d, ten, None)
d.pieslice((306, 230, 718, 520), 180, 360, fill=saç)
# sakal
d.pieslice((312, 440, 712, 760), 0, 180, fill=saç)
d.ellipse((432, 560, 592, 640), fill=ten)                    # ağız çevresi
ifade(d, kas=saç, gulus=(150, 70, 70))
kaydet(im, 'erkek2')

# ---- Erkek 3: bıyıklı, gözlüklü, sarı zemin, bordo üst
im, d = yeni((254, 192, 16))
saç = (90, 90, 95); ten = (232, 190, 155)
omuz(d, (120, 25, 35), (255, 248, 231)); boyun(d, (215, 172, 138)); yuz(d, ten, None)
d.pieslice((306, 240, 718, 500), 180, 360, fill=saç)
ifade(d, kas=saç)
for x in (430, 594):                                          # gözlük
    d.ellipse((x - 62, 440, x + 62, 548), outline=(40, 40, 45), width=12)
d.line((492, 490, 532, 490), fill=(40, 40, 45), width=12)
d.polygon([(420, 560), (512, 540), (604, 560), (570, 590), (512, 575), (454, 590)], fill=saç)  # bıyık
kaydet(im, 'erkek3')
print('6 avatar üretildi:', os.path.abspath(CIKTI))

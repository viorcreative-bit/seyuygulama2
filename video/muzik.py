#!/usr/bin/env python3
"""Tanıtım videosu için fon müziği üretir: out/muzik.wav

Kullanım: python3 muzik.py out/zamanlama.json
(render.mjs bu dosyayı sahne.js'in zaman çizelgesinden üretip bu betiği kendisi çağırır.)

Akorlar her 4 vuruşta ve her sahne başında değişir; vuruş yoğunluğu, geçiş sesleri ve
darbeler sahne türüne göre yerleştirilir. Sahneler eklenip çıkarılsa da müzik uyum sağlar.
Yalnızca numpy gerekir.
"""
import json
import sys
import wave
from pathlib import Path

import numpy as np

KOK = Path(__file__).resolve().parent
SR = 48000
rng = np.random.default_rng(11)

# Sahne türüne göre yoğunluk: 0 yalnız pad, 1 yarım tempo davul, 1.5 tam tempo, 2 tam tempo + bas darbeleri
YOGUNLUK = {
    "giris": 0, "logo": 0.5, "rakamlar": 1, "hakkimizda": 1, "harita": 1, "baskan": 0.5,
    "degerler": 1, "ara": 1.5, "kategori": 2, "proje": 2, "yonetim": 1, "kapanis": 0,
}
DARBE = {"logo": 0.7, "rakamlar": 0.45, "baskan": 0.35, "ara": 0.4, "kategori": 0.6, "yonetim": 0.4, "kapanis": 0.8}
AKORLAR = [
    ("A1", ["A2", "E3", "A3", "C4", "E4"]),
    ("F1", ["F2", "C3", "F3", "A3", "C4"]),
    ("C2", ["C3", "G3", "C4", "E4", "G4"]),
    ("G1", ["G2", "D3", "G3", "B3", "D4"]),
]
ARPEJ = [["A3", "C4", "E4", "B4"], ["F3", "A3", "C4", "E4"], ["G3", "C4", "E4", "G4"], ["G3", "B3", "D4", "A4"]]


def frekans(nota):
    adlar = {"C": -9, "C#": -8, "D": -7, "D#": -6, "E": -5, "F": -4, "F#": -3,
             "G": -2, "G#": -1, "A": 0, "A#": 1, "B": 2}
    ad, oktav = nota[:-1], int(nota[-1])
    return 440.0 * 2 ** ((adlar[ad] + 12 * (oktav - 4)) / 12)


class Miks:
    def __init__(self, sure):
        self.n = int(sure * SR)
        self.kuru = np.zeros((2, self.n))
        self.yanki = np.zeros((2, self.n))

    def ekle(self, bas, sinyal, kazanc=1.0, pan=0.0, yanki=0.0):
        """sinyal: tek kanal; pan -1 (sol) .. 1 (sağ)."""
        i0 = int(bas * SR)
        if i0 >= self.n:
            return
        if i0 < 0:
            sinyal, i0 = sinyal[-i0:], 0
        sinyal = sinyal[: self.n - i0]
        sol, sag = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        for k, g in ((0, sol), (1, sag)):
            self.kuru[k, i0:i0 + len(sinyal)] += sinyal * kazanc * g
            if yanki:
                self.yanki[k, i0:i0 + len(sinyal)] += sinyal * kazanc * g * yanki


def zarf(n, atak, birakma):
    e = np.ones(n)
    a, r = min(int(atak * SR), n), min(int(birakma * SR), n)
    if a:
        e[:a] = np.linspace(0, 1, a) ** 2
    if r:
        e[n - r:] *= np.linspace(1, 0, r) ** 2
    return e


def alcak_gecir(x, kesim):
    n = len(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    return np.fft.irfft(np.fft.rfft(x) / np.sqrt(1 + (f / kesim) ** 4), n)


def pad(m, notalar, bas, bit, kazanc, parlaklik, atak=0.5):
    birakma = 0.9
    n = int((bit - bas + birakma) * SR)
    t = np.arange(n) / SR
    for nota in notalar:
        f = frekans(nota)
        for detune, pan in ((-7, -0.6), (0, 0.0), (7, 0.6)):
            fd = f * 2 ** (detune / 1200)
            s = np.zeros(n)
            for h in range(1, 9):
                if fd * h > 8000:
                    break
                s += np.sin(2 * np.pi * fd * h * t + rng.uniform(0, 2 * np.pi)) / h * np.exp(-(h - 1) / parlaklik)
            s *= zarf(n, atak, birakma) * (1 + 0.06 * np.sin(2 * np.pi * 0.23 * t + pan))
            m.ekle(bas, s, kazanc / len(notalar), pan, yanki=0.45)


def mizrap(m, nota, bas, kazanc, pan):
    n = int(1.2 * SR)
    t = np.arange(n) / SR
    f = frekans(nota)
    s = sum(np.sin(2 * np.pi * f * h * t) * np.exp(-t * (5 + 3 * h)) / h for h in range(1, 6))
    s *= zarf(n, 0.004, 0.05)
    m.ekle(bas, s, kazanc, pan, yanki=0.5)


def davul(m, bas, kazanc):
    n = int(0.55 * SR)
    t = np.arange(n) / SR
    f = 46 + 110 * np.exp(-t * 30)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6.5)
    tik = rng.standard_normal(n) * np.exp(-t * 400) * 0.25
    m.ekle(bas, s + alcak_gecir(tik, 3500), kazanc, 0.0, yanki=0.05)


def zil(m, bas, kazanc):
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    g = rng.standard_normal(n)
    g = np.diff(np.diff(g, prepend=0), prepend=0)
    m.ekle(bas, g * np.exp(-t * 60) * 0.35, kazanc, 0.25, yanki=0.1)


def bas_nota(m, nota, bas, sure, kazanc, sonum=1.5):
    n = int((sure + 0.3) * SR)
    t = np.arange(n) / SR
    f = frekans(nota)
    s = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)) * np.exp(-t * sonum)
    s *= zarf(n, 0.01, 0.3)
    m.ekle(bas, s, kazanc, 0.0)


def darbe(m, bas, kazanc):
    n = int(2.6 * SR)
    t = np.arange(n) / SR
    f = 42 + 50 * np.exp(-t * 3)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.0)
    gurultu = alcak_gecir(rng.standard_normal(n), 600) * np.exp(-t * 4) * 1.6
    m.ekle(bas, s + gurultu, kazanc, 0.0, yanki=0.35)


def yukselen(m, bas, bit, kazanc):
    n = int((bit - bas) * SR)
    t = np.arange(n) / SR
    x = t / t[-1]
    koyu = alcak_gecir(rng.standard_normal(n), 350)
    acik = np.diff(rng.standard_normal(n), prepend=0) * 0.4
    s = (koyu * (1 - x) + acik * x) * x ** 2.2
    ton = np.sin(2 * np.pi * np.cumsum(180 + 520 * x ** 2) / SR) * 0.25 * x ** 2
    m.ekle(bas, s + ton, kazanc, 0.0, yanki=0.3)


def hisirti(m, merkez, kazanc, sure=1.0, soldan_saga=True):
    """Ekrandaki silme geçişiyle aynı yönde geçen rüzgâr sesi."""
    n = int(sure * SR)
    t = np.arange(n) / SR
    beyaz = rng.standard_normal(n)
    g = alcak_gecir(beyaz, 2600) - alcak_gecir(beyaz, 270)
    e = np.exp(-((t - sure / 2) / (sure * 0.2)) ** 2)
    x = t / sure if soldan_saga else 1 - t / sure
    i0 = int((merkez - sure / 2) * SR)
    if i0 < 0 or i0 >= m.n:
        return
    for k, kanal in ((0, np.cos(x * np.pi / 2)), (1, np.sin(x * np.pi / 2))):
        seg = (g * e * kanal * kazanc)[: m.n - i0]
        m.kuru[k, i0:i0 + len(seg)] += seg
        m.yanki[k, i0:i0 + len(seg)] += seg * 0.3


def can(m, nota, bas, kazanc, pan):
    n = int(2.5 * SR)
    t = np.arange(n) / SR
    f = frekans(nota)
    s = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2.01 * f * t)
         + 0.15 * np.sin(2 * np.pi * 3.98 * f * t) * np.exp(-t * 4)) * np.exp(-t * 1.8)
    m.ekle(bas, s * zarf(n, 0.003, 0.2), kazanc, pan, yanki=0.6)


def yuksek_gecir(x, kesim=38.0):
    """Duyulmayan alt bası atıp tavan payı kazanmak için yumuşak yüksek geçiren filtre."""
    n = x.shape[1]
    f = np.fft.rfftfreq(n, 1 / SR)
    yanit = 1 / np.sqrt(1 + (kesim / np.maximum(f, 1e-3)) ** 8)
    return np.fft.irfft(np.fft.rfft(x, axis=1) * yanit, n, axis=1)


def yanki_uygula(x, sure=2.4):
    n_ir = int(sure * SR)
    t = np.arange(n_ir) / SR
    cikis = np.zeros_like(x)
    boy = 1 << int(np.ceil(np.log2(x.shape[1] + n_ir)))
    for k in range(2):
        ir = rng.standard_normal(n_ir) * np.exp(-t * 3.2)
        ir = alcak_gecir(ir, 5000)
        ir /= np.sqrt(np.sum(ir ** 2))
        y = np.fft.irfft(np.fft.rfft(x[k], boy) * np.fft.rfft(ir, boy), boy)
        cikis[k] = y[: x.shape[1]]
    return cikis


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    cizelge = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    v = 60 / cizelge["bpm"]
    sahneler = cizelge["sahneler"]
    B = cizelge["toplam"]
    m = Miks(B)

    # Her sahneyi 4 vuruşluk parçalara böl; her parça bir akor.
    akor_sirasi = 0
    for i, s in enumerate(sahneler):
        tur, bas, sure = s["tur"], s["bas"], s["sure"]
        yog = YOGUNLUK.get(tur, 1)
        son_sahne = i == len(sahneler) - 1
        t = bas
        while t < bas + sure - 1e-6:
            bit = min(t + 4 * v, bas + sure)
            kok, notalar = AKORLAR[akor_sirasi % 4]
            arpej = ARPEJ[akor_sirasi % 4]
            if son_sahne:
                kok, notalar, bit = "C2", ["C3", "G3", "D4", "E4", "G4"], B - 0.6
            atak = 2.5 if tur == "giris" else 0.4
            pad(m, notalar, t, bit, 0.22 if yog < 1 else 0.25, 2.5 + 1.2 * yog, atak=atak)
            vurus_sayisi = round((bit - t) / v)
            for b in range(vurus_sayisi):
                tb = t + b * v
                if yog >= 0.5 and not son_sahne:
                    for yarim in range(2):
                        mizrap(m, arpej[(2 * b + yarim) % 4], tb + yarim * v / 2, 0.055 if yog < 2 else 0.045,
                               -0.4 if (2 * b + yarim) % 2 else 0.4)
                if yog >= 1.5 or (yog >= 1 and b % 2 == 0):
                    davul(m, tb, 0.6)
                if yog >= 1.5:
                    zil(m, tb + v / 2, 0.5)
                if yog >= 2:
                    bas_nota(m, kok, tb, v / 2, 0.15, sonum=7)
                    bas_nota(m, kok, tb + v / 2, v / 2, 0.12, sonum=7)
            if 1 <= yog < 2:
                bas_nota(m, kok, t, bit - t, 0.14, sonum=0.4)
            if son_sahne:
                bas_nota(m, kok, t, bit - t, 0.18, sonum=0.5)
                break
            akor_sirasi += 1
            t = bit

        if tur in DARBE:
            darbe(m, bas, DARBE[tur])
        # geçiş sesleri ekrandaki geçişle aynı anda, sahne sınırına ortalanmış
        gecis, gs = s.get("gecis"), s.get("gecisSuresi", 0)
        if gecis == "mavi":
            yukselen(m, bas - gs / 2, bas, 0.07)
        elif gecis == "yumusak":
            hisirti(m, bas, 0.12, sure=gs, soldan_saga=i % 2 == 0)

    # Önemli anlardan önce yükselen efekt, logolarda çanlar
    ilk_kategori = next((s for s in sahneler if s["tur"] == "kategori"), None)
    for s in sahneler:
        if s["tur"] in ("logo", "kapanis"):
            yukselen(m, s["bas"] - 1.8, s["bas"], 0.16)
            for k, nota in enumerate(["E5", "G5", "C6"]):
                can(m, nota, s["bas"] + 0.5 + k * 0.14, 0.08, (-0.4, 0.0, 0.4)[k])
            for k, nota in enumerate(["D6", "E6", "G6"]):
                can(m, nota, s["bas"] + 2.1 + k * 0.12, 0.045, (0.5, -0.2, 0.2)[k])
    if ilk_kategori:
        yukselen(m, ilk_kategori["bas"] - 2.4, ilk_kategori["bas"], 0.12)

    karisim = yuksek_gecir(m.kuru + yanki_uygula(m.yanki) * 0.9)
    # yalnızca anlık tepeleri yumuşatacak kadar sıkıştır, sonra -1 dBFS'e getir
    karisim /= np.percentile(np.abs(karisim), 99.9)
    karisim = np.tanh(karisim * 0.8) / np.tanh(0.8)
    karisim /= np.max(np.abs(karisim)) / 0.89
    n = karisim.shape[1]
    giris = int(0.3 * SR)
    karisim[:, :giris] *= np.linspace(0, 1, giris)
    cikis = int(1.5 * SR)
    karisim[:, n - cikis:] *= np.linspace(1, 0, cikis) ** 1.5

    hedef = KOK / "out" / "muzik.wav"
    hedef.parent.mkdir(exist_ok=True)
    with wave.open(str(hedef), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((karisim.T * 32767).astype("<i2").tobytes())
    print(hedef)


if __name__ == "__main__":
    main()

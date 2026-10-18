#!/usr/bin/env python3
"""Tanıtım videosu için fon müziği üretir: out/muzik.wav

Vuruşlar, geçiş efektleri ve akorlar config.json'daki "zamanlama" değerlerine göre
yerleştirilir; sahne süreleri değişirse müzik de kendiliğinden uyum sağlar.
Yalnızca numpy gerekir.
"""
import json
import wave
from pathlib import Path

import numpy as np

KOK = Path(__file__).resolve().parent
SR = 48000
rng = np.random.default_rng(11)


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


def pad(m, notalar, bas, bit, kazanc, parlaklik, atak=0.6):
    birakma = 0.9
    n = int((bit - bas + birakma) * SR)
    t = np.arange(n) / SR
    for nota in notalar:
        f = frekans(nota)
        for detune, pan in ((-7, -0.6), (0, 0.0), (7, 0.6)):
            fd = f * 2 ** (detune / 1200)
            s = np.zeros(n)
            for h in range(1, 11):
                if fd * h > 9000:
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


def hisirti(m, merkez, kazanc):
    """Soldan sağa geçen silme geçişi için rüzgâr sesi."""
    sure = 1.1
    n = int(sure * SR)
    t = np.arange(n) / SR
    beyaz = rng.standard_normal(n)
    g = alcak_gecir(beyaz, 2600) - alcak_gecir(beyaz, 270)
    e = np.exp(-((t - sure / 2) / 0.22) ** 2)
    x = t / sure
    bas = merkez - sure / 2
    i0 = int(bas * SR)
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
    cfg = json.loads((KOK / "config.json").read_text(encoding="utf-8"))
    z = cfg["zamanlama"]
    G, Y, HZ, D, L, B = z["giris"], z["yukselis"], z["hizmetler"], z["degerler"], z["logo"], z["bitis"]
    v = 60 / z["bpm"]
    m = Miks(B)

    # akorlar
    orta_y, orta_h = (Y + HZ) / 2, (HZ + D) / 2
    pad(m, ["A2", "E3", "B3", "C4"], G, Y, 0.20, 2.0, atak=2.5)
    pad(m, ["F2", "C3", "E3", "A3"], Y, orta_y, 0.24, 3.0)
    pad(m, ["G2", "D3", "G3", "B3"], orta_y, HZ, 0.24, 3.4)
    pad(m, ["A2", "E3", "A3", "C4"], HZ, orta_h, 0.24, 4.0)
    pad(m, ["F2", "C3", "F3", "A3"], orta_h, D, 0.24, 4.4)
    kelime_sayisi = len(cfg["sahneler"]["degerler"]["kelimeler"])
    slot = (L - D) / kelime_sayisi
    deger_akorlari = [["C3", "G3", "C4", "E4"], ["G2", "D3", "G3", "B3"], ["F2", "C3", "F3", "A3"], ["A2", "E3", "A3", "C4"]]
    deger_koklari = ["C2", "G1", "F1", "A1"]
    for i in range(kelime_sayisi):
        pad(m, deger_akorlari[i % 4], D + i * slot, D + (i + 1) * slot, 0.26, 4.6, atak=0.15)
    pad(m, ["C3", "G3", "D4", "E4", "G4"], L, B - 0.6, 0.30, 5.0, atak=0.3)

    # giriş ve yükseliş boyunca arpej
    arpejler = [(G, Y, ["A3", "C4", "E4", "B4"]), (Y, orta_y, ["F3", "A3", "C4", "E4"]), (orta_y, HZ - v, ["G3", "B3", "D4", "G4"])]
    for bas, bit, notalar in arpejler:
        i = 0
        t = bas + v
        while t < bit:
            mizrap(m, notalar[i % 4], t, 0.06 if bas == G else 0.07, -0.4 if i % 2 else 0.4)
            t += v / 2
            i += 1

    # bas
    bas_nota(m, "F1", Y, orta_y - Y, 0.16, sonum=0.25)
    bas_nota(m, "G1", orta_y, HZ - orta_y, 0.16, sonum=0.25)
    t, i = HZ, 0
    while t < D - 0.01:
        bas_nota(m, "A1" if t < orta_h else "F1", t, v / 2, 0.15, sonum=7)
        t += v / 2
        i += 1
    for i in range(kelime_sayisi):
        t = D + i * slot
        while t < D + (i + 1) * slot - 0.01:
            bas_nota(m, deger_koklari[i % 4], t, v, 0.16, sonum=4)
            t += v
    bas_nota(m, "C2", L, B - L, 0.18, sonum=0.6)

    # ritim
    t = Y
    while t < HZ - v * 1.5:
        davul(m, t, 0.55)
        t += 2 * v
    t = HZ
    while t < D - 0.01:
        davul(m, t, 0.6)
        zil(m, t + v / 2, 0.5)
        t += v
    t = D
    while t < L - 2 * v:
        davul(m, t, 0.62)
        zil(m, t + v / 2, 0.55)
        t += v

    # geçiş efektleri
    yukselen(m, HZ - 1.6, HZ, 0.10)
    hisirti(m, HZ, 0.5)
    yukselen(m, L - 1.8, L, 0.16)
    for t, g in ((Y, 0.55), (HZ, 0.7), (D, 0.6), (L, 0.8)):
        darbe(m, t, g)
    for i in range(1, kelime_sayisi):
        darbe(m, D + i * slot, 0.4)

    # logo: kuleler yükselirken çanlar, parlama anında ışıltı
    for i, nota in enumerate(["E5", "G5", "C6"]):
        can(m, nota, L + 0.35 + i * 0.14, 0.09, (-0.4, 0.0, 0.4)[i])
    for i, nota in enumerate(["D6", "E6", "G6"]):
        can(m, nota, L + 2.3 + i * 0.12, 0.05, (0.5, -0.2, 0.2)[i])

    karisim = yuksek_gecir(m.kuru + yanki_uygula(m.yanki) * 0.9)
    # yalnızca anlık tepeleri yumuşatacak kadar sıkıştır, sonra -1 dBFS'e getir
    karisim /= np.percentile(np.abs(karisim), 99.9)
    karisim = np.tanh(karisim * 0.8) / np.tanh(0.8)
    karisim /= np.max(np.abs(karisim)) / 0.89
    n = karisim.shape[1]
    giris = int(0.3 * SR)
    karisim[:, :giris] *= np.linspace(0, 1, giris)
    cikis = int(1.2 * SR)
    karisim[:, n - cikis:] *= np.linspace(1, 0, cikis) ** 1.5

    hedef = KOK / "out" / "muzik.wav"
    hedef.parent.mkdir(exist_ok=True)
    veri = (karisim.T * 32767).astype("<i2").tobytes()
    with wave.open(str(hedef), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(veri)
    print(hedef)


if __name__ == "__main__":
    main()

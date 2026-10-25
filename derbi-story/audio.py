"""Hikâye için 15 sn'lik stadyum temalı ses: tribün uğultusu, bum-bum-alkış ritmi,
bas, geçiş "whoosh"ları ve vuruş efektleri. Zamanlar story.js'teki sahnelerle eşleşir.

Kullanım: python3 audio.py out/audio.wav
"""
import sys
import wave

import numpy as np

SR = 44100
DUR = 15.0
N = int(SR * DUR)
rng = np.random.default_rng(7)

CUTS = [2.5, 3.5, 4.5, 5.5, 6.5, 8.0, 9.5, 11.0, 11.5]
BEAT_START, BEAT_END = 1.0, 11.0


def band(x, lo, hi, soft=0.15):
    """FFT tabanlı yumuşak kenarlı bant geçiren filtre."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo > 0:
        m *= 1 / (1 + (lo / np.maximum(f, 1e-6)) ** (2 / soft))
    if hi < SR / 2:
        m *= 1 / (1 + (f / hi) ** (2 / soft))
    return np.fft.irfft(X * m, len(x))


def env_exp(n, decay):
    return np.exp(-np.arange(n) / SR / decay)


def add(buf, sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    buf[0, i:i + len(sig)] += sig * gain * l * 1.414
    buf[1, i:i + len(sig)] += sig * gain * r * 1.414


def kick():
    n = int(0.45 * SR)
    tt = np.arange(n) / SR
    f = 48 + 110 * np.exp(-tt * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-tt * 7)
    click = band(rng.standard_normal(n), 1500, 8000) * np.exp(-tt * 300) * 0.4
    return np.tanh((s + click) * 1.6)


def clap():
    n = int(0.35 * SR)
    tt = np.arange(n) / SR
    noise = band(rng.standard_normal(n), 900, 4200)
    e = np.zeros(n)
    for k, d in enumerate([0.0, 0.011, 0.022]):
        i = int(d * SR)
        e[i:] += np.exp(-(tt[: n - i]) * (90 if k < 2 else 18))
    s = noise * e
    return s / np.max(np.abs(s))


def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR)
    s = band(rng.standard_normal(n), 7000, 16000) * env_exp(n, 0.06 if open_ else 0.012)
    return s / np.max(np.abs(s))


def impact(big=True):
    n = int((2.2 if big else 1.2) * SR)
    tt = np.arange(n) / SR
    f = 32 + 80 * np.exp(-tt * 4)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * (1.6 if big else 3))
    body = band(rng.standard_normal(n), 40, 900) * np.exp(-tt * 9)
    crash = band(rng.standard_normal(n), 3000, 14000) * np.exp(-tt * (1.4 if big else 3)) * 0.35
    s = np.tanh(sub * 1.4 + body * 0.6) + crash
    return s / np.max(np.abs(s))


def whoosh(length=0.42):
    n = int(length * SR)
    tt = np.arange(n) / SR
    noise = rng.standard_normal(n)
    lo = band(noise, 300, 2500)
    hi = band(noise, 2500, 12000)
    p = tt / length
    s = lo * (1 - p) + hi * p
    s *= p ** 2.2
    return s / np.max(np.abs(s))


def saw_add(freq, n, harmonics=8, detune=0.0):
    tt = np.arange(n) / SR
    s = np.zeros(n)
    for h in range(1, harmonics + 1):
        s += np.sin(2 * np.pi * freq * h * tt * (1 + detune)) / h
    return s


def main(out):
    buf = np.zeros((2, N))
    t = np.arange(N) / SR

    # --- tribün uğultusu (stereo, yavaş dalgalanan)
    for ch in range(2):
        crowd = band(rng.standard_normal(N), 180, 2400)
        crowd /= np.max(np.abs(crowd))
        mod = 0.75 + 0.25 * np.interp(t, np.linspace(0, DUR, 40), rng.random(40))
        swell = np.ones(N) * 0.35
        swell += np.interp(t, [0, 1.0, 1.05, 2.4, 3.0], [0.1, 0.6, 1.0, 0.55, 0.4])
        swell += np.interp(t, [11.3, 11.5, 12.6, 15], [0, 0.8, 0.35, 0.1])
        fade_in = np.clip(t / 0.6, 0, 1)
        buf[ch] += crowd * mod * swell * fade_in * 0.16

    # --- giriş: yükselen gerilim ve isimlerin "whoosh"u
    add(buf, whoosh(0.95), 0.05, 0.35)
    add(buf, whoosh(0.3), 0.2, 0.45, -0.5)
    add(buf, whoosh(0.3), 0.45, 0.45, 0.5)

    # --- vuruşlar
    add(buf, impact(True), 1.0, 0.95)
    add(buf, impact(False), 8.0, 0.6)
    add(buf, impact(True), 11.5, 0.95)

    # --- bum-bum-alkış ritmi (120 BPM) + hi-hat
    K, C = kick(), clap()
    step = 0.25
    i = 0
    tb = BEAT_START
    while tb < BEAT_END - 1e-6:
        pos = i % 4
        if pos in (0, 1):
            add(buf, K, tb, 0.85)
        elif pos == 2:
            add(buf, C, tb, 0.42, -0.1)
            add(buf, C, tb + 0.004, 0.3, 0.2)
        if tb >= 2.5:
            add(buf, hat(), tb, 0.13, 0.35)
            add(buf, hat(), tb + 0.125, 0.08, 0.35)
            if pos == 3:
                add(buf, hat(True), tb, 0.1, -0.3)
        tb += step
        i += 1

    # --- bitişe trampet rulosu
    tr = 11.0
    for k in range(10):
        add(buf, C, tr + k * 0.05, 0.12 + 0.03 * k, (-1) ** k * 0.2)

    # --- bas (A A F G) ve akor vuruşları
    notes = [55.0, 55.0, 43.65, 49.0]
    for k, tb in enumerate(np.arange(2.5, BEAT_END, 1.0)):
        n = int(1.0 * SR)
        tt = np.arange(n) / SR
        b = saw_add(notes[k % 4], n, 6) * np.minimum(1, tt / 0.01) * (0.6 + 0.4 * np.exp(-tt * 3))
        # kick'e yer açmak için ritmik "duck"
        duck = 1 - 0.6 * np.exp(-((tt % 0.25)) * 18) * ((tt % 1.0) < 0.5)
        add(buf, b * duck, tb, 0.22)
    chord = [220.0, 261.63, 329.63]
    for tb in np.arange(2.5, BEAT_END, 2.0):
        n = int(0.6 * SR)
        tt = np.arange(n) / SR
        s = sum(saw_add(f, n, 7, d) for f in chord for d in (-0.004, 0.004))
        s = band(s, 120, 3500) * np.exp(-tt * 5)
        add(buf, s / np.max(np.abs(s)), tb, 0.2)

    # --- geçişler
    for c in CUTS:
        if c in (11.5,):
            continue
        add(buf, whoosh(0.38), c - 0.38, 0.32, 0.3 if int(c * 2) % 2 else -0.3)

    # --- final öncesi yükselen ses
    n = int(1.2 * SR)
    tt = np.arange(n) / SR
    f = 180 * (8 ** (tt / 1.2))
    riser = np.sin(2 * np.pi * np.cumsum(f) / SR) * (tt / 1.2) ** 2 * 0.5
    riser += band(rng.standard_normal(n), 2000, 12000) * (tt / 1.2) ** 3 * 0.6
    add(buf, riser, 10.3, 0.35)

    # --- kapanış pedi
    n = int(3.5 * SR)
    tt = np.arange(n) / SR
    pad = np.zeros(n)
    for fr in (110.0, 164.81, 220.0, 261.63, 329.63):
        vib = 1 + 0.003 * np.sin(2 * np.pi * 5 * tt)
        pad += np.sin(2 * np.pi * fr * tt * vib) + 0.3 * np.sin(4 * np.pi * fr * tt)
    pad *= np.minimum(1, tt / 0.4) * np.clip((3.5 - tt) / 1.4, 0, 1)
    add(buf, pad / np.max(np.abs(pad)), 11.5, 0.22)
    # finalde yavaşlayan kalp atışı gibi kick
    for tb in (12.0, 13.0, 14.0):
        add(buf, K, tb, 0.45)

    # --- master
    fade = np.clip((DUR - t) / 0.5, 0, 1)
    buf *= fade
    buf = np.tanh(buf * 1.15)
    buf /= np.max(np.abs(buf)) / 0.9
    pcm = (buf.T * 32767).astype(np.int16)
    with wave.open(out, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'out/audio.wav')

"""Durağan bir görselden yavaş kamera hareketli (yakınlaşma / kaydırma) 1080p video üretir.

Kullanım: python hareket.py GORSEL CIKTI.mp4 SURE BASLA_X,BASLA_Y,BASLA_Z BITIS_X,BITIS_Y,BITIS_Z

X ve Y görsel üzerindeki odak noktasıdır (0-1), Z yakınlaşmadır (1 = görselin tamamı).
"""
import math
import subprocess
import sys

import numpy as np
from PIL import Image, ImageOps

W, H, FPS = 1920, 1080, 30


def kare_penceresi(img_w, img_h, x, y, z):
    # 16:9 pencere, görselin dışına taşmayacak şekilde
    pw = min(img_w, img_h * W / H) / z
    ph = pw * H / W
    cx = min(max(x * img_w, pw / 2), img_w - pw / 2)
    cy = min(max(y * img_h, ph / 2), img_h - ph / 2)
    return cx - pw / 2, cy - ph / 2, pw, ph


def yumusak(t):
    # yarısı doğrusal, yarısı yavaş başlayıp yavaş biten geçiş
    return 0.5 * t + 0.5 * (0.5 - 0.5 * math.cos(math.pi * t))


def main():
    kaynak, cikti, sure = sys.argv[1], sys.argv[2], float(sys.argv[3])
    a = [float(v) for v in sys.argv[4].split(",")]
    b = [float(v) for v in sys.argv[5].split(",")]

    img = ImageOps.exif_transpose(Image.open(kaynak)).convert("RGB")
    # alt piksel hareket için önce iki kat büyüt
    img = img.resize((img.width * 2, img.height * 2), Image.LANCZOS)
    iw, ih = img.size

    kareler = int(round(sure * FPS))
    ff = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow",
         "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", cikti],
        stdin=subprocess.PIPE,
    )
    for i in range(kareler):
        p = yumusak(i / max(1, kareler - 1))
        x, y, z = (a[k] + (b[k] - a[k]) * p for k in range(3))
        left, top, pw, ph = kare_penceresi(iw, ih, x, y, z)
        sx, sy = pw / W, ph / H
        kare = img.transform((W, H), Image.AFFINE, (sx, 0, left, 0, sy, top), Image.BICUBIC)
        ff.stdin.write(np.asarray(kare).tobytes())
    ff.stdin.close()
    if ff.wait():
        sys.exit("ffmpeg başarısız")


if __name__ == "__main__":
    main()

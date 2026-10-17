"""Gerçek bir video parçasını sayfa süresine uydurur, kendi sesini atar ve sayfanın sesini ekler.

Kullanım: python klip.py KAYNAK.mp4 SES.wav CIKTI.mp4 SURE [BASLANGIC_SN]

Kaynak sayfa süresinden kısaysa en fazla yarı hıza kadar yavaşlatılır, yine yetmezse son kare
bekletilir; uzunsa BASLANGIC_SN'den itibaren gereken kadarı alınır.
"""
import json
import subprocess
import sys


def sure_oku(yol):
    cikti = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", yol],
        check=True, capture_output=True, text=True,
    ).stdout
    return float(json.loads(cikti)["format"]["duration"])


def main():
    kaynak, ses, cikti, sure = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
    bas = float(sys.argv[5]) if len(sys.argv) > 5 else 0.0
    eldeki = sure_oku(kaynak) - bas
    hiz = min(1.0, max(0.5, eldeki / sure))  # 1 = normal, 0.5 = yarı hız
    filtre = (
        f"[0:v]trim=start={bas},setpts=(PTS-STARTPTS)/{hiz},"
        f"tpad=stop_mode=clone:stop_duration={sure},trim=duration={sure},"
        "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,format=yuv420p[v]"
    )
    subprocess.run(
        ["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", kaynak, "-i", ses,
         "-filter_complex", filtre, "-map", "[v]", "-map", "1:a",
         "-c:v", "libx264", "-preset", "slow", "-crf", "19",
         "-c:a", "aac", "-b:a", "192k", "-t", str(sure), "-movflags", "+faststart", cikti],
        check=True,
    )
    print(f"{cikti}: {sure:.2f} sn, hız {hiz:.2f}")


if __name__ == "__main__":
    main()

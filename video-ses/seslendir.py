"""seslendirme-metni.tsv'deki satırları Microsoft Edge'in Türkçe sinir ağı sesiyle okur.

Kullanım: python seslendir.py CIKTI_KLASORU [SES] [HIZ]
Örnek:   python seslendir.py ses/emel tr-TR-EmelNeural -4%
"""
import asyncio
import os
import pathlib
import sys

import certifi

# vekil sunucunun sertifikasına güven (edge-tts certifi paketini kullanıyor)
_ca = os.environ.get("SSL_CERT_FILE") or "/root/.ccr/ca-bundle.crt"
if os.path.exists(_ca):
    certifi.where = lambda: _ca

import edge_tts  # noqa: E402

METIN = pathlib.Path(__file__).with_name("seslendirme-metni.tsv")


async def main():
    cikti = pathlib.Path(sys.argv[1])
    ses = sys.argv[2] if len(sys.argv) > 2 else "tr-TR-EmelNeural"
    hiz = sys.argv[3] if len(sys.argv) > 3 else "-4%"
    cikti.mkdir(parents=True, exist_ok=True)
    vekil = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    for satir in METIN.read_text(encoding="utf-8").splitlines():
        # isteğe bağlı üçüncü sütun o satırın sesini belirler (ör. öğretmen sözlerinde erkek ses)
        sayfa, metin, *satir_sesi = satir.split("\t")
        hedef = cikti / f"vo_{sayfa}.mp3"
        await edge_tts.Communicate(
            metin, satir_sesi[0] if satir_sesi else ses, rate=hiz, proxy=vekil
        ).save(str(hedef))
        print(hedef)


if __name__ == "__main__":
    asyncio.run(main())

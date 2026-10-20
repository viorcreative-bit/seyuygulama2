#!/usr/bin/env python3
"""
Instagram'daki son gönderileri siteye aktarır.

GitHub Actions (.github/workflows/site.yml) bu betiği düzenli olarak çalıştırır:
  1. Instagram API'den son gönderileri alır.
  2. Görselleri küçültüp assets/instagram/ klasörüne kaydeder.
  3. Site için assets/js/instagram.js dosyasını yazar.

Gerekli ortam değişkenleri:
  INSTAGRAM_TOKEN   Instagram API (Instagram ile giriş) uzun ömürlü erişim anahtarı
İsteğe bağlı:
  GH_SECRETS_PAT    Anahtar yenilendiğinde yeni değeri INSTAGRAM_TOKEN secret'ına
                    yazabilmek için "Secrets: write" izinli GitHub token'ı
  REFRESH_TOKEN=1   Anahtarı bu çalıştırmada yenilemeye zorlar
"""
import base64
import datetime as dt
import io
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMG_DIR = ROOT / "assets" / "instagram"
DATA_FILE = ROOT / "assets" / "js" / "instagram.js"
GRAPH = os.environ.get("INSTAGRAM_GRAPH_URL", "https://graph.instagram.com")
LIMIT = 12
MAX_SIDE = 720
FIELDS = ("id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,"
          "children{media_type,media_url,thumbnail_url}")


class ApiError(Exception):
    pass


def log(msg):
    print(msg, flush=True)


def summary(msg):
    """Mesajı hem loga hem de GitHub Actions çalıştırma özetine yazar."""
    log(msg)
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if path:
        with open(path, "a", encoding="utf-8") as f:
            f.write(msg + "\n\n")


def request(url, params=None, headers=None, method="GET", body=None, raw=False):
    if params:
        url += ("&" if "?" in url else "?") + urllib.parse.urlencode(params)
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            payload = res.read()
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")
        try:
            detail = json.loads(detail).get("error", {}).get("message", detail)
        except (ValueError, AttributeError):
            pass
        raise ApiError(f"HTTP {e.code}: {detail}") from None
    except urllib.error.URLError as e:
        raise ApiError(f"Bağlantı hatası: {e.reason}") from None
    if raw:
        return payload
    return json.loads(payload) if payload else {}


def save_secret(value):
    """Yenilenen anahtarı INSTAGRAM_TOKEN secret'ına yazar (GH_SECRETS_PAT varsa)."""
    pat = os.environ.get("GH_SECRETS_PAT")
    repo = os.environ.get("GITHUB_REPOSITORY")
    if not pat or not repo:
        return False
    from nacl import encoding, public

    headers = {
        "Authorization": f"Bearer {pat}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    base = f"https://api.github.com/repos/{repo}/actions/secrets"
    key = request(base + "/public-key", headers=headers)
    box = public.SealedBox(public.PublicKey(key["key"].encode(), encoding.Base64Encoder()))
    encrypted = base64.b64encode(box.encrypt(value.encode())).decode()
    request(base + "/INSTAGRAM_TOKEN", headers=headers, method="PUT",
            body={"encrypted_value": encrypted, "key_id": key["key_id"]})
    return True


def refresh_token(token):
    """Uzun ömürlü anahtarın süresini 60 gün uzatır. Hata olursa eski anahtarla devam eder."""
    try:
        res = request(GRAPH + "/refresh_access_token",
                      {"grant_type": "ig_refresh_token", "access_token": token})
    except ApiError as e:
        # Anahtar 24 saatten yeniyse Instagram yenilemeye izin vermez; bu normaldir.
        log(f"Anahtar yenilenmedi, mevcut anahtarla devam ediliyor ({e}).")
        return token
    new = res.get("access_token") or token
    days = int(res.get("expires_in", 0)) // 86400
    log(f"Anahtar yenilendi, {days} gün geçerli.")
    if new != token:
        try:
            saved = save_secret(new)
        except Exception as e:  # secret yazılamasa da gönderiler güncellenmeye devam etsin
            saved = False
            log(f"Secret güncellenemedi: {e}")
        if saved:
            log("Yeni anahtar INSTAGRAM_TOKEN secret'ına kaydedildi.")
        else:
            summary("::warning::Instagram yeni bir erişim anahtarı verdi ama kaydedilemedi. "
                    "60 gün içinde INSTAGRAM_TOKEN secret'ını yenileyin ya da README'deki "
                    "GH_SECRETS_PAT adımını uygulayın.")
    return new


def image_url(m):
    kind = m.get("media_type")
    if kind == "VIDEO":
        return m.get("thumbnail_url")
    if kind == "CAROUSEL_ALBUM":
        for child in (m.get("children") or {}).get("data", []):
            url = child.get("thumbnail_url") if child.get("media_type") == "VIDEO" else child.get("media_url")
            if url:
                return url
    return m.get("media_url")


def alt_text(caption):
    """Açıklamanın ilk satırından, etiketler ayıklanmış kısa bir alternatif metin üretir."""
    first = (caption or "").strip().split("\n")[0]
    first = re.sub(r"[#@][\w.çğıöşüÇĞİÖŞÜ]+", "", first)
    first = re.sub(r"\s+", " ", first).strip(" .,-–")
    if len(first) > 140:
        first = first[:140].rsplit(" ", 1)[0] + "…"
    return first or "Nonna Instagram gönderisi"


def store_image(url, dest):
    """Görseli indirip küçültür. (genişlik, yükseklik) döndürür."""
    from PIL import Image

    if not dest.exists():
        data = request(url, raw=True)
        im = Image.open(io.BytesIO(data)).convert("RGB")
        im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
        im.save(dest, "JPEG", quality=80, optimize=True, progressive=True)
    with Image.open(dest) as im:
        return im.size


def write_data(posts):
    content = (
        "/* Bu dosya scripts/instagram_sync.py tarafından otomatik oluşturulur; elle düzenlemeyin. */\n"
        "window.NONNA_INSTAGRAM = "
        + json.dumps({"posts": posts}, ensure_ascii=False, indent=2)
        + ";\n"
    )
    old = DATA_FILE.read_text(encoding="utf-8") if DATA_FILE.exists() else ""
    if content != old:
        DATA_FILE.write_text(content, encoding="utf-8")
        return True
    return False


def main():
    token = os.environ.get("INSTAGRAM_TOKEN", "").strip()
    if not token:
        summary("Instagram henüz bağlanmadı: INSTAGRAM_TOKEN secret'ı yok. "
                "Site Instagram bölümü olmadan yayınlanıyor. Kurulum için README'ye bakın.")
        return 0

    now = dt.datetime.now(dt.timezone.utc)
    if os.environ.get("REFRESH_TOKEN") == "1" or now.hour < 3:
        token = refresh_token(token)

    try:
        res = request(GRAPH + "/me/media", {"fields": FIELDS, "limit": LIMIT, "access_token": token})
    except ApiError as e:
        summary(f"::error::Instagram gönderileri alınamadı: {e}. "
                "Anahtarın süresi dolmuş olabilir; README'deki adımlarla INSTAGRAM_TOKEN secret'ını yenileyin.")
        return 1

    IMG_DIR.mkdir(parents=True, exist_ok=True)
    posts, keep = [], set()
    for m in res.get("data", []):
        url = image_url(m)
        if not url or not m.get("permalink"):
            continue
        name = re.sub(r"[^0-9A-Za-z_]", "", str(m["id"])) + ".jpg"
        try:
            w, h = store_image(url, IMG_DIR / name)
        except Exception as e:
            log(f"{m['id']} görseli alınamadı, atlanıyor: {e}")
            continue
        keep.add(name)
        posts.append({
            "id": str(m["id"]),
            "link": m["permalink"],
            "img": "assets/instagram/" + name,
            "w": w,
            "h": h,
            "type": m.get("media_type", "IMAGE"),
            "date": (m.get("timestamp") or "")[:10],
            "alt": alt_text(m.get("caption")),
        })

    for old in IMG_DIR.glob("*.jpg"):
        if old.name not in keep:
            old.unlink()

    changed = write_data(posts)
    summary(f"Instagram: {len(posts)} gönderi alındı" + (", site güncellendi." if changed else ", değişiklik yok."))
    return 0


if __name__ == "__main__":
    sys.exit(main())

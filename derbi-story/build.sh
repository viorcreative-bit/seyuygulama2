#!/usr/bin/env bash
# Tüm kareleri çizer, sesi üretir ve Instagram hikâyesi için MP4'ü oluşturur.
set -euo pipefail
cd "$(dirname "$0")"

FRAMES="${FRAMES_DIR:-$(mktemp -d)}"
mkdir -p "$FRAMES" out

node render.js "$FRAMES"
python3 audio.py out/audio.wav

# Instagram hikâyesi: 1080x1920, 30 fps, H.264 + AAC
ffmpeg -y -v error -framerate 30 -i "$FRAMES/f_%04d.jpg" -i out/audio.wav \
  -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -profile:v high -level 4.1 \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k -ar 44100 \
  -movflags +faststart -shortest out/derbi-story.mp4

# Sessiz sürüm (müziği Instagram'dan eklemek isteyenler için)
ffmpeg -y -v error -i out/derbi-story.mp4 -c:v copy -an out/derbi-story-sessiz.mp4

# Kapak/önizleme görseli
ffmpeg -y -v error -ss 2.3 -i out/derbi-story.mp4 -frames:v 1 out/kapak.jpg

rm -rf "$FRAMES" out/audio.wav
echo "Hazır: $(pwd)/out/derbi-story.mp4"

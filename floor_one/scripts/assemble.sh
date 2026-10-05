#!/usr/bin/env bash
# FLOOR/ONE - codificación final con FFmpeg. Uso: scripts/assemble.sh COMP_DIR OUT_BASENAME [crf]
# Genera: OUT.mp4 (H.264 High, yuv420p, 30 fps CFR, AAC 320k 48 kHz) con duración exacta de 900 fotogramas.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="$1"; OUT="$2"; CRF="${3:-16}"
ffmpeg -v error -y -framerate 30 -start_number 1 -i "$SRC/f_%04d.png" -i audio/mix.wav \
  -map 0:v -map 1:a -frames:v 900 \
  -c:v libx264 -preset slow -crf "$CRF" -pix_fmt yuv420p -profile:v high -tune film \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -r 30 -fps_mode cfr \
  -c:a aac -b:a 320k -ar 48000 -t 30.000 -movflags +faststart "$OUT.mp4"
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames,duration,sample_rate -of compact "$OUT.mp4"

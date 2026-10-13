#!/usr/bin/env bash
# Generates the interview sample media locally (no binaries are committed):
#   interview.mp4 (synthetic talking-head stand-in + macOS `say` Korean voice), interview.srt, broll-1/2.mp4
# usage: bash skills/reelforge-shorts/scripts/make-sample.sh [outDir]   (default: skills/reelforge-shorts/examples/interview/media)
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$HERE/examples/interview/media}"
mkdir -p "$OUT"; cd "$OUT"
VOICE="${SAMPLE_VOICE:-Yuna}"
LINES=(
  "스케일링은 보통 일 년에 한 번 받으시면 됩니다."
  "잇몸이 약한 분은 육 개월마다 점검받는 게 좋아요."
  "양치할 때 피가 난다면 잇몸 염증 신호일 수 있습니다."
  "치석은 칫솔질로는 제거되지 않아서 치과에서 관리해야 해요."
)
SUBS=(
  "스케일링은 보통 1년에 한 번 받으시면 됩니다."
  "잇몸이 약한 분은 6개월마다 점검받는 게 좋아요."
  "양치할 때 피가 난다면 잇몸 염증 신호일 수 있습니다."
  "치석은 칫솔질로는 제거되지 않아서 치과에서 관리해야 해요."
)
: > concat.txt; : > interview.srt; t=0
fmt(){ awk -v s="$1" 'BEGIN{h=int(s/3600);m=int((s%3600)/60);x=s-h*3600-m*60;printf "%02d:%02d:%06.3f",h,m,x}' | tr . ,; }
for i in "${!LINES[@]}"; do
  say -v "$VOICE" -o "l$i.aiff" "${LINES[$i]}"
  ffmpeg -v error -y -i "l$i.aiff" -af "apad=pad_dur=0.35" -ar 48000 -ac 2 "l$i.wav"
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "l$i.wav")
  e=$(awk -v a="$t" -v b="$d" 'BEGIN{print a+b}')
  printf '%d\n%s --> %s\n원장: %s\n\n' $((i+1)) "$(fmt "$t")" "$(fmt "$e")" "${SUBS[$i]}" >> interview.srt
  echo "file 'l$i.wav'" >> concat.txt; t=$e
done
ffmpeg -v error -y -f concat -safe 0 -i concat.txt -c:a pcm_s16le voice.wav
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 voice.wav)
# 16:9 stand-in A-roll (warm backdrop + "speaker" disc that pulses) so the 9:16 crop path is exercised
ffmpeg -v error -y -f lavfi -i "gradients=s=1920x1080:c0=0x3b4a5a:c1=0x8a7766:x0=0:y0=0:x1=1920:y1=1080:d=$D:speed=0.02,format=yuv420p" \
  -i voice.wav -filter_complex "[0:v]drawbox=x=0:y=0:w=0:h=0[b];color=c=0xf2d7c2:s=360x360:d=$D,format=rgba,geq=r='r(X,Y)':a='if(lt(hypot(X-180,Y-180),170+8*sin(T*9)),255,0)'[disc];[b][disc]overlay=780:300:shortest=1[v]" \
  -map "[v]" -map 1:a -c:v libx264 -preset veryfast -crf 20 -c:a aac -r 30 -t "$D" interview.mp4 2>/dev/null \
  || ffmpeg -v error -y -f lavfi -i "gradients=s=1920x1080:c0=0x3b4a5a:c1=0x8a7766:d=$D:speed=0.02,format=yuv420p" -i voice.wav \
       -map 0:v -map 1:a -c:v libx264 -preset veryfast -crf 20 -c:a aac -r 30 -t "$D" interview.mp4
ffmpeg -v error -y -f lavfi -i "mandelbrot=s=1280x720:rate=30" -t 3 -c:v libx264 -pix_fmt yuv420p broll-1.mp4
ffmpeg -v error -y -f lavfi -i "testsrc2=s=1280x720:rate=30" -t 3 -c:v libx264 -pix_fmt yuv420p broll-2.mp4
rm -f l*.aiff l*.wav concat.txt voice.wav
echo "✓ sample media → $OUT (interview.mp4 ${D}s, interview.srt, broll-1.mp4, broll-2.mp4)"

#!/usr/bin/env bash
set -euo pipefail

# Generates lightweight MP3 fixtures for listening QA without committing binary assets.
# Requires ffmpeg to be installed locally.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_DIR="$ROOT_DIR/public/placement/audio"
SAMPLE_DIR="$ROOT_DIR/public/audio"

mkdir -p "$OUTPUT_DIR" "$SAMPLE_DIR"

ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 5 -c:a libmp3lame -b:a 96k "$SAMPLE_DIR/sample-listening.mp3"
ffmpeg -f lavfi -i sine=frequency=440:sample_rate=44100 -t 12 -c:a libmp3lame -b:a 96k "$OUTPUT_DIR/section1_q1.mp3"
ffmpeg -f lavfi -i sine=frequency=660:sample_rate=44100 -t 10 -c:a libmp3lame -b:a 96k "$OUTPUT_DIR/section1_q2.mp3"

echo "Generated sample-listening.mp3 (5s ambience)"
echo "Generated section1_q1.mp3 (12s tone)"
echo "Generated section1_q2.mp3 (10s tone)"

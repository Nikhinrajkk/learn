#!/usr/bin/env bash
set -e

OUT="public/hls"
DURATION=20

rm -rf "$OUT"
mkdir -p "$OUT"

echo "Generating HLS segments (this may take a minute)..."

ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "testsrc=duration=${DURATION}:size=1920x1080:rate=24" \
  -f lavfi -i "sine=frequency=440:duration=${DURATION}" \
  -filter_complex \
  "[0:v]split=4[v1][v2][v3][v4]; \
   [v1]scale=1920:1080[v1080]; \
   [v2]scale=1280:720[v720]; \
   [v3]scale=854:480[v480]; \
   [v4]scale=640:360[v360]" \
  -map "[v1080]" -map 1:a \
  -map "[v720]"  -map 1:a \
  -map "[v480]"  -map 1:a \
  -map "[v360]"  -map 1:a \
  -c:v libx264 -c:a aac -b:a 128k \
  -b:v:0 5000k -maxrate:v:0 5350k -bufsize:v:0 7500k \
  -b:v:1 2800k -maxrate:v:1 2996k -bufsize:v:1 4200k \
  -b:v:2 1400k -maxrate:v:2 1498k -bufsize:v:2 2100k \
  -b:v:3 800k  -maxrate:v:3 856k  -bufsize:v:3 1200k \
  -g 48 -keyint_min 48 \
  -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2 v:3,a:3" \
  -master_pl_name master.m3u8 \
  -f hls \
  -hls_time 4 \
  -hls_playlist_type vod \
  -hls_segment_filename "${OUT}/%v/segment_%03d.ts" \
  "${OUT}/%v/playlist.m3u8"

# Fix bandwidth order — test pattern compresses oddly; ABR needs 1080p > 720p > 480p > 360p
cat > "${OUT}/master.m3u8" <<'EOF'
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=5350000,AVERAGE-BANDWIDTH=5000000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2"
0/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2996000,AVERAGE-BANDWIDTH=2800000,RESOLUTION=1280x720,CODECS="avc1.64001f,mp4a.40.2"
1/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1498000,AVERAGE-BANDWIDTH=1400000,RESOLUTION=854x480,CODECS="avc1.64001e,mp4a.40.2"
2/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=856000,AVERAGE-BANDWIDTH=800000,RESOLUTION=640x360,CODECS="avc1.64001e,mp4a.40.2"
3/playlist.m3u8
EOF
{
  "0": "1080p",
  "1": "720p",
  "2": "480p",
  "3": "360p"
}
EOF

echo "Done. Files written to ${OUT}/"

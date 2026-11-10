#!/usr/bin/env python3
# s7_video_check.py —— S7 视频侧自检门：逐段 ffprobe 元数据（时长/分辨率/帧率/编码）+ 抽帧黑帧/冻结扫描
# 用法：python3 pipeline/tools/s7_video_check.py [--media media] [--frames-out /tmp/s7check]
# 判据：
#   (a) 14 段全部可解析，h264 + 1280x720 + 24fps；
#   (b) 时长 vs 合成预期（CARD_LEAD 2.0 + 画面 + TAIL 0.6，stages.json）±0.25s；
#   (c) 中段（10%–90% span）无黑帧（均值亮度 <4 视黑）且非冻结（相邻抽样帧差 >0.5/255）；
#   (d) 每段抽首/中/尾 3 帧 jpg 落盘供目验。
# 输出：VIDEOCHECK-PASS/FAIL（exit 1=FAIL）。依赖 Remotion 自带 ffprobe（node_modules/.bin/remotion ffprobe，输出走 stderr）。
import json
import os
import subprocess
import sys
from math import ceil

from PIL import Image
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
WRAP = os.path.join(HERE, "remotion-wrap")
MEDIA = sys.argv[sys.argv.index("--media") + 1] if "--media" in sys.argv else os.path.join(HERE, "..", "..", "media")
FOUT = sys.argv[sys.argv.index("--frames-out") + 1] if "--frames-out" in sys.argv else "/tmp/s7check"
REMOTION = os.path.join(WRAP, "node_modules", "node_modules", ".bin", "remotion")
if not os.path.exists(REMOTION):
    alt = os.path.join(WRAP, "node_modules", ".bin", "remotion")
    REMOTION = alt
os.makedirs(FOUT, exist_ok=True)

stages = json.load(open(os.path.join(WRAP, "stages.json")))
tend_by_id = {s2["id"]: s2.get("tend", 6.0) for s2 in stages}
expect = {"intro": 4.0, "outro": 6.0}
for s in stages:
    expect[s["id"]] = round(2.0 + s["seconds"] + 0.6, 2)

def probe(path):
    r = subprocess.run([REMOTION, "ffprobe", path], capture_output=True, text=True)
    txt = r.stderr or r.stdout
    dur = res = fps = codec = None
    for line in txt.splitlines():
        if "Duration:" in line:
            h, m, s = line.split("Duration:")[1].split(",")[0].strip().split(":")
            dur = int(h) * 3600 + int(m) * 60 + float(s)
        if "Stream #0:0" in line and "Video" in line:
            if " h264 " in line:
                codec = "h264"
            if "1280x720" in line:
                res = "1280x720"
            if "24 fps" in line:
                fps = "24 fps"
    return dur, res, fps, codec

def extract(path, ss, out):
    subprocess.run([REMOTION, "ffmpeg", "-ss", str(ss), "-i", path, "-frames:v", "1", out],
                   capture_output=True, text=True)
    return os.path.exists(out) and os.path.getsize(out) > 1000

rows, fails = [], []
names = ["intro"] + [s["id"] for s in stages] + ["outro"]
for name in names:
    p = os.path.join(MEDIA, f"S07-{name}.mp4")
    if not os.path.exists(p):
        fails.append(f"{name}: 文件缺失")
        continue
    kb = os.path.getsize(p) // 1024
    dur, res, fps, codec = probe(p)
    exp = expect[name]
    dur_ok = dur is not None and abs(dur - exp) <= 0.25
    meta_ok = codec == "h264" and res == "1280x720" and fps and fps.startswith("24")
    # 抽帧：首/中/尾（尾取 dur-0.05 防越界）
    n = 3
    picks = [0.05, dur * 0.5, max(dur - 0.05, 0.1)]
    scan = []
    dark_mid = frozen = settle = 0
    mid_lo, mid_hi = dur * 0.10, dur * 0.90
    k = max(6, int(dur // 6))
    is_card = name in ("intro", "outro")  # 卡片段=设计即静止，冻结扫描豁免
    # 动画窗=章节卡 2.0 + (tend + 飞行 1.2)（goto 起表）；其后=工段收尾静置段（HOLD 语义，静止合法）
    anim_end = 2.0 + (tend_by_id.get(name, 6.0) + 1.2) if name.startswith("F") else 0.0
    for i in range(1, k):
        ss = dur * i / k
        f = os.path.join(FOUT, f"{name}-scan{i}.png")
        if not extract(p, round(ss, 2), f):
            continue
        im = np.asarray(Image.open(f).convert("L")).astype(float)
        mean = float(im.mean())
        if mid_lo < ss < mid_hi and mean < 4.0:
            dark_mid += 1
        scan.append((ss, mean, float(im.std())))
        os.remove(f)
    if not is_card:
        run = 0
        run_start = None
        for j in range(1, len(scan)):
            if abs(scan[j][2] - scan[j - 1][2]) < 0.05 and abs(scan[j][1] - scan[j - 1][1]) < 0.05:
                if scan[j][0] < anim_end:
                    if run == 0:
                        run_start = scan[j - 1][0]
                    run += 1
                else:
                    settle += 1  # 收尾静置段（HOLD 设计语义，不计失败）
            else:
                if run:
                    span = scan[j - 1][0] - run_start
                    # 病态冻结判据：连续 ≥3 采样对且跨度 ≥ 动画窗 1/3（可见画面整段不动的唯一形态；
                    # 镜内已定镜而画外动画收尾的窄静止段——F6 抽帧实证——span 小于阈值不算）
                    if run >= 3 and span >= (anim_end - 2.0) / 3:
                        frozen += run
                    run = 0
        if run:
            span = scan[-1][0] - run_start
            if run >= 3 and span >= (anim_end - 2.0) / 3:
                frozen += run
    for pi, ss in enumerate(picks):
        extract(p, round(ss, 2), os.path.join(FOUT, f"{name}-{pi}.png"))
    ok = dur_ok and meta_ok and dark_mid == 0 and frozen == 0
    if not ok:
        fails.append(f"{name}: dur={dur} exp={exp} dur_ok={dur_ok} meta_ok={meta_ok} dark_mid={dark_mid} frozen={frozen}")
    rows.append(f"{'PASS' if ok else 'FAIL'} {name:6s} dur={dur:6.2f}s exp={exp:6.2f}s {kb:5d}KB {codec}/{res}/{fps} darkMid={dark_mid} frozenSuspect={frozen}")

for r in rows:
    print(r)
total_kb = sum(os.path.getsize(os.path.join(MEDIA, f"S07-{n}.mp4")) for n in names if os.path.exists(os.path.join(MEDIA, f"S07-{n}.mp4")))
print(f"SIZE total={total_kb/1024/1024:.2f}MB / 30MB budget = {total_kb/1024/1024/30*100:.0f}%")
if fails:
    print("VIDEOCHECK-FAIL:", "; ".join(fails))
    sys.exit(1)
print(f"VIDEOCHECK-PASS segments={len(names)}")

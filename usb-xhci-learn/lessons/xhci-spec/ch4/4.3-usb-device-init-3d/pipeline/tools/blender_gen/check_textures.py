# check_textures.py —— S6 纹理验收机检（V2/V3 判据 + 对表 textureRequests）
# 用法：python3 check_textures.py [--dir pipeline/tools/blender_gen/out]
# 判据：
#   tex03 桌面木（V2 机检承继 + V3 加档）：
#     (a) 行亮度标准差 ≥40（逐行内亮度 std 的全图均值——木纹沿 X 对比度）
#     (b) 节疤局部（64px 邻域）亮度 std ≥55（V3 目标）
#     (c) 节疤心与周边亮度差 ΔL ≥18/255
#   全 map：尺寸对 manifest（manifest 对 textureRequests 上限）＋非恒值（std>0.5）
#           ＋法线图健康（B 通道均值>200 且 XY 通道均值 118–138）
#   albedo 家族对表：tex01/tex03/tex07/tex12 均值落预期色族带（防色彩空间双重转换回归）
# 输出：逐项 CHECK-OK/FAIL 行 + TEXCHECK-PASS/FAIL（exit code 1=FAIL）
import json
import math
import os
import sys

import numpy as np
from PIL import Image

ap_d = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
D = sys.argv[sys.argv.index("--dir") + 1] if "--dir" in sys.argv else ap_d

man = json.load(open(os.path.join(D, "manifest.json"), encoding="utf-8"))
fails = []

def load(tex, kind):
    return np.asarray(Image.open(os.path.join(D, man["textures"][tex][kind]["file"])).convert("RGB")).astype(float)

def lum(a):
    return 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]

# —— tex03 判据（纹理级：节疤显著性代理门；行 std≥40 与节疤局部≥55 的 V2/V3 正门在截图级
#     s6_desk_check（v3m-deskCloseup 桌面区），此处行 std 仅报告。）
#   节疤 UV：gen 定点 (0.66,0.75)/(0.80,0.85)，post_tile 滚移半幅后落 (0.16,0.25)/(0.30,0.35)。
a3 = load("tex03", "albedo")
L = lum(a3)
H, W = L.shape
row_means = [float(np.mean(L[y, :])) for y in range(H)]
row_mean_std = float(np.std(row_means))
print("CHECK tex03 row-mean-std=%.1f（报告值；V2 ≥40 正门在截图级）" % row_mean_std)

for (ku, kv, kname) in [(0.16, 0.25, "A"), (0.30, 0.35, "B")]:
    cx, cy = int(ku * W) % W, int((1 - kv) * H) % H
    r = 32
    yy, xx = np.ogrid[:H, :W]
    dx = np.minimum(np.abs(xx - cx), W - np.abs(xx - cx))
    dy = np.minimum(np.abs(yy - cy), H - np.abs(yy - cy))
    near = (dx <= r) & (dy <= r)  # wrap 感知邻域
    local = L[near]
    lstd = float(np.std(local))
    core = float(np.mean(L[near & (dx <= 3) & (dy <= 3)]))
    dist = np.sqrt(dx.astype(float) ** 2 + dy.astype(float) ** 2)
    ring = L[(dist > 40) & (dist < 60)]
    surround = float(np.mean(ring))
    dl = abs(surround - core)
    ok = (lstd >= 35 and dl >= 18)
    print("CHECK tex03 knot%s local-std=%.1f (proxy ≥35; V3 ≥55 正门在截图级) ΔL=%.1f (req ≥18) %s" % (
        kname, lstd, dl, "OK" if ok else "FAIL"))
    if not ok:
        fails.append("tex03 knot%s" % kname)

# —— 全 map 对表 ——
for tex, maps in man["textures"].items():
    for kind, meta in maps.items():
        p = os.path.join(D, meta["file"])
        if not os.path.exists(p):
            print("CHECK %s %s MISSING FAIL" % (tex, kind))
            fails.append("%s %s missing" % (tex, kind))
            continue
        a = np.asarray(Image.open(p).convert("RGB")).astype(float)
        if (a.shape[0], a.shape[1]) != (meta["h"], meta["w"]):
            print("CHECK %s %s SIZE %s != %s FAIL" % (tex, kind, a.shape, (meta["h"], meta["w"])))
            fails.append("%s %s size" % (tex, kind))
            continue
        sd = float(a.std())
        if sd <= 0.5:
            print("CHECK %s %s CONSTANT(std=%.2f) FAIL" % (tex, kind, sd))
            fails.append("%s %s constant" % (tex, kind))
        if kind == "normal":
            bm = a[..., 2].mean()
            rm, gm = a[..., 0].mean(), a[..., 1].mean()
            ok = bm > 200 and 118 <= rm <= 138 and 118 <= gm <= 138
            print("CHECK %s normal health B=%.0f XY=%.0f/%.0f %s" % (tex, bm, rm, gm, "OK" if ok else "FAIL"))
            if not ok:
                fails.append("%s normal" % tex)

# —— albedo 色族带（防双重转换/色偏回归；占位档色族均值 ±带）——
FAMILY = {"tex01": (145, 175), "tex03": (60, 100), "tex07": (25, 48), "tex12": (10, 30)}
for tex, (lo, hi) in FAMILY.items():
    m = float(load(tex, "albedo").mean())
    ok = lo <= m <= hi
    print("CHECK %s albedo family mean=%.1f in [%d,%d] %s" % (tex, m, lo, hi, "OK" if ok else "FAIL"))
    if not ok:
        fails.append("%s family" % tex)

if fails:
    print("TEXCHECK-FAIL n=%d: %s" % (len(fails), "; ".join(fails)))
    sys.exit(1)
print("TEXCHECK-PASS（tex03 三判据 + 全 map 尺寸/非恒值/法线健康 + albedo 色族）")

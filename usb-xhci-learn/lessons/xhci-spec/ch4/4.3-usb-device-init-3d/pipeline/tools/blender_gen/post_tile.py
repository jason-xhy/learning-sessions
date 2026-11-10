# post_tile.py —— S6 烘焙贴图平铺化修复 + 数据图抗色带微抖动（系统 python3 + PIL/numpy）
# 用法：python3 post_tile.py [--dir pipeline/tools/blender_gen/out] [--fade 0.08]
# 消费：gen_textures.py 产出的 out/*.png + manifest.json（textures[].tileable 标记）
# 平铺化=滚移中缝法（roll-by-half + 中缝带与原图交叉渐变）：非周期噪声的硬接缝移到图中央并用
#   fade% 带宽渐变抹平，四边全部来自原图内部列/行 → wrap 连续性成立；特征整体平移半幅（特征位置
#   语义无关紧要，安全区设计仍成立）。法线图混合后重归一化。
# rough/ao 数据图加 ±0.6 级均匀微抖动（绝对值域窄区间 8-bit 抗色带）。
# 输出：就地覆写 out/*.png（首次处理前备份至 out/raw/），stdout 打 TILE-OK 行
import argparse
import json
import os
import shutil

import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("--dir", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "out"))
ap.add_argument("--fade", type=float, default=0.04)
ap.add_argument("--restore", action="store_true", help="从 raw/ 恢复已处理件后重做（防二次混合）")
args = ap.parse_args()
D = args.dir
fade = args.fade

with open(os.path.join(D, "manifest.json"), "r", encoding="utf-8") as f:
    man = json.load(f)

raw_dir = os.path.join(D, "raw")
os.makedirs(raw_dir, exist_ok=True)

def blend_wrap(arr, fade):
    """滚移中缝法：roll 半幅 → 原接缝落到中央 → 中央 fade 带内 rolled×(1-t)+orig×t 交叉渐变"""
    h, w = arr.shape[:2]
    out = np.roll(arr, w // 2, axis=1)
    out = np.roll(out, h // 2, axis=0)
    bx = max(2, int(w * fade))
    by = max(2, int(h * fade))
    cx, cy = w // 2, h // 2
    for i in range(bx):
        t = (i + 1) / (bx + 1)
        col_r = out[:, cx - bx + i]
        col_o = arr[:, cx - bx + i]
        out[:, cx - bx + i] = (1 - t) * col_r + t * col_o
    for i in range(by):
        t = (i + 1) / (by + 1)
        row_r = out[cy - by + i, :]
        row_o = arr[cy - by + i, :]
        out[cy - by + i, :] = (1 - t) * row_r + t * row_o
    return out

n_tiled = n_dither = 0
for tex, maps in man["textures"].items():
    for kind, meta in maps.items():
        p = os.path.join(D, meta["file"])
        if not os.path.exists(p):
            print("TILE-MISSING", meta["file"])
            continue
        img = Image.open(p)
        if args.restore:
            raw_p0 = os.path.join(raw_dir, meta["file"])
            if os.path.exists(raw_p0):
                shutil.copy2(raw_p0, p)
                img = Image.open(p)
        arr = np.asarray(img).astype(np.float64)
        is_normal = kind == "normal"
        is_data = kind in ("rough", "ao")
        changed = False
        if meta.get("tileable"):
            raw_p = os.path.join(raw_dir, meta["file"])
            if not os.path.exists(raw_p):
                shutil.copy2(p, raw_p)
            arr = blend_wrap(arr, fade)
            if is_normal:
                mid = 127.5
                n = arr - mid
                ln = np.sqrt(np.sum(n * n, axis=2, keepdims=True))
                arr = mid + n / np.maximum(ln, 1e-6) * mid
            changed = True
            n_tiled += 1
        if is_data:
            raw_p = os.path.join(raw_dir, meta["file"])
            if not os.path.exists(raw_p):
                shutil.copy2(p, raw_p)
            rng = np.random.default_rng(20261111)
            arr = np.clip(arr + rng.uniform(-0.6, 0.6, arr.shape), 0, 255)
            changed = True
            n_dither += 1
        if changed:
            out = Image.fromarray(arr.clip(0, 255).astype(np.uint8), mode="RGB" if arr.ndim == 3 else "L")
            if out.mode != img.mode:
                out = out.convert(img.mode)
            out.save(p, optimize=True)
        print("TILE-OK %s %s%s%s" % (meta["file"], "wrap " if meta.get("tileable") else "",
                                     "renorm " if is_normal else "", "dither" if is_data else ""))

print("POST-DONE tiled=%d dithered=%d（raw 备份=%s）" % (n_tiled, n_dither, raw_dir))

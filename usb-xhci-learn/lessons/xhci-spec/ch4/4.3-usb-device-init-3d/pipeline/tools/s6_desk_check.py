# s6_desk_check.py —— S6 截图级桌面质感机检（V2/V3 双口径；承 EVIDENCE「木纹行亮度标准差 40–59，平光面 <10」V2 口径
#   + S6-评分 2026-11-11 重标定路径：V3 灯光 rig 下 row-mean-std 为死判据（判别力 1.0×，实测 v3m/v3k=1.06×），
#   V3 截图级判据=「木纹可见+节疤突出」三判据（纹理级代理门 check_textures.py 仍为主门，本脚本为放大目验的机检佐证）
# 用法：
#   V2 口径（默认，兼容复现）：python3 s6_desk_check.py --shot shots/v3m-deskCloseup.png --crop 0.18,0.52,0.64,0.40
#   V3 口径（重标定）：        python3 s6_desk_check.py --mode v3 --shot shots/v3m-deskCloseup.png \
#                               --crop 0.03,0.615,0.67,0.135 --knot-region 0.538,0.518,0.152,0.165
# 判据：
#   V2: (a) 行亮度标准差 ≥--row-req(40)；(b) 节疤局部 std ≥--knot-req(55)（crop/region 内最暗 64px 滑窗）
#   V3: (a) gradY-mean ≥--grady-req(1.2)（桌面带垂直梯度均值=横向木纹能量）；(b) 各向异性 gradY/gradX ≥--aniso-req(20)
#       （木纹方向性）；(c) 节疤区 64px 最优窗 std ≥--knot-v3-req(4.0)（区域窗搜索单=std 最大窗，免坐标标定）；
#       row-mean-std 仅报告不作门
# crop/knot-region 参数=相对比例 (x0,y0,w,h)，按 deskCloseup 构图标定（scorer 实测帧 1448×908 上
#   桌面带=0.03,0.615,0.67,0.135；节疤搜索区=x780–1000,y470–620→0.538,0.518,0.152,0.165）
# 输出：DESKCHECK-PASS/FAIL（V2）/ DESKCHECK-V3-PASS/FAIL（exit 1=FAIL）
import argparse

import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("--shot", required=True)
ap.add_argument("--crop", default="0.06,0.57,0.52,0.26")
ap.add_argument("--mode", default="v2", choices=["v2", "v3"], help="v2=行std+节疤std 原判据；v3=重标定三判据（gradY/aniso/暗窗）")
ap.add_argument("--row-req", type=float, default=40.0)
ap.add_argument("--knot-req", type=float, default=55.0)
ap.add_argument("--grady-req", type=float, default=1.2, help="v3：gradY-mean 门")
ap.add_argument("--aniso-req", type=float, default=20.0, help="v3：各向异性 gradY/gradX 门")
ap.add_argument("--knot-v3-req", type=float, default=4.0, help="v3：节疤 64px 暗窗 std 门")
ap.add_argument("--knot-win", type=int, default=64)
ap.add_argument("--knot-region", default="", help="节疤暗窗搜索区相对比例 x0,y0,w,h（空=整个 crop 内搜）")
ap.add_argument("--knot-at", default="", help="截图绝对坐标 x,y[,x,y...]——节疤定点测量（滚移后落点按机位标定）；空=暗窗搜索")
a = ap.parse_args()

im = Image.open(a.shot).convert("RGB")
W, H = im.size
x0, y0, w, h = [float(v) for v in a.crop.split(",")]
box = (int(x0 * W), int(y0 * H), int((x0 + w) * W), int((y0 + h) * H))
c = np.asarray(im.crop(box)).astype(float)
L = 0.2126 * c[..., 0] + 0.7152 * c[..., 1] + 0.0722 * c[..., 2]

row_means = L.mean(axis=1)
row_std = float(np.std(row_means))

# 节疤暗窗搜索区（v2 原形态=整个 crop；--knot-region 在两口径下均可用）
def knot_window(Lsrc, ox=0, oy=0):
    k = a.knot_win
    ys, xs = Lsrc.shape
    if a.knot_region:
        rx, ry, rw, rh = [float(v) for v in a.knot_region.split(",")]
        sub = Lsrc[max(0, int(ry * H) - oy):max(0, int((ry + rh) * H) - oy),
                   max(0, int(rx * W) - ox):max(0, int((rx + rw) * W) - ox)]
    else:
        sub = Lsrc
    sy, sx = sub.shape
    best = None
    for y in range(0, max(1, sy - k), 8):
        for x in range(0, max(1, sx - k), 8):
            m = float(sub[y:y + k, x:x + k].mean())
            if best is None or m < best[0]:
                best = (m, y, x)
    _, ky, kx = best
    return float(sub[ky:ky + k, kx:kx + k].std()), ox + kx, oy + ky

if a.mode == "v3":
    # 重标定三判据（S6-评分 2026-11-11 实测表）：gradY/gradX=一阶差分幅度均值（垂直/水平梯度能量，
    # 施于 --crop 桌面带）；节疤暗窗=施于全帧 --knot-region（区域独立于 crop——scorer 搜索区 y470–620
    # 部分超出桌面带 y≥558，两窗分立测量）
    gradY = float(np.abs(np.diff(L, axis=0)).mean())
    gradX = float(np.abs(np.diff(L, axis=1)).mean())
    aniso = gradY / max(gradX, 1e-9)
    Lfull = np.asarray(im).astype(float)
    Lfull = 0.2126 * Lfull[..., 0] + 0.7152 * Lfull[..., 1] + 0.0722 * Lfull[..., 2]
    kreg = a.knot_region or "0.538,0.518,0.152,0.165"
    rx, ry, rw, rh = [float(v) for v in kreg.split(",")]
    sub = Lfull[int(ry * H):int((ry + rh) * H), int(rx * W):int((rx + rw) * W)]
    k = a.knot_win
    sy, sx = sub.shape
    best = None
    for y in range(0, sy - k, 8):
        for x in range(0, sx - k, 8):
            s = float(sub[y:y + k, x:x + k].std())
            if best is None or s > best[0]:
                best = (s, y, x)  # 最优窗=std 最大窗（scorer 实测口径：节疤处 std 峰，v3k 空桌面拦在门外）
    kstd, ky, kx = best
    print("DESKCHECK-V3 gradY-mean=%.3f (req ≥%.2f) gradX=%.3f aniso=%.1f (req ≥%.0f) crop=%s" % (gradY, a.grady_req, gradX, aniso, a.aniso_req, box))
    print("DESKCHECK-V3 knot-win-std=%.2f (req ≥%.1f) at frame(%d,%d) win=%d region=%s" % (kstd, a.knot_v3_req, int(rx * W) + kx, int(ry * H) + ky, k, sub.shape[::-1]))
    print("DESKCHECK-V3 row-mean-std=%.2f (报告值，不作门——重标定后判别力 1.0×)" % row_std)
    ok = gradY >= a.grady_req and aniso >= a.aniso_req and kstd >= a.knot_v3_req
    print("DESKCHECK-V3-%s" % ("PASS" if ok else "FAIL"))
    raise SystemExit(0 if ok else 1)

print("DESKCHECK row-mean-std=%.1f (req ≥%.0f) crop=%s" % (row_std, a.row_req, box))

if a.knot_at:
    pts = [int(v) for v in a.knot_at.split(",")]
    imf = np.asarray(im.convert("RGB")).astype(float)
    Lf = 0.2126 * imf[..., 0] + 0.7152 * imf[..., 1] + 0.0722 * imf[..., 2]
    vals = []
    for i in range(0, len(pts), 2):
        kx, ky = pts[i], pts[i + 1]
        vals.append(float(Lf[ky - 32:ky + 32, kx - 32:kx + 32].std()))
    kstd = max(vals)
    print("DESKCHECK knot-local-std=%.1f (req ≥%.0f) knots-at=%s" % (kstd, a.knot_req, a.knot_at))
else:
    kstd, kx, ky = knot_window(L, box[0], box[1])
    print("DESKCHECK knot-local-std=%.1f (req ≥%.0f) at (%d,%d)" % (kstd, a.knot_req, kx, ky))

ok = row_std >= a.row_req and kstd >= a.knot_req
print("DESKCHECK-%s" % ("PASS" if ok else "FAIL"))
raise SystemExit(0 if ok else 1)

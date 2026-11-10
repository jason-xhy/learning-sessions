# compress_textures.py —— S6 纹理压缩择优 + 预算循环（系统 python3 + PIL）
# 用法：python3 compress_textures.py [--dir .../out] [--budget-b64 1450000]
# 策略（S6-设计 ②③）：
#   albedo/emissive → JPEG q86 subsampling=0（保拉丝/木纹细节）vs WebP q85 择小
#   normal → WebP lossless vs PNG 择小（XY 双数据通道禁 4:2:0 色度抽样）
#   rough/ao → 灰度 PNG vs WebP q88 择小（PNG 在 1.3× 内优先——防数据图有损伪影）
# 预算循环：base64 总量 ≤ --budget-b64（默认 1.45MB，留硬门 1.5MB 余量）；
#   降级梯（逐级叠加直到达标，每步打印 DEGRADE 行）：
#   ① rough/ao 强制 WebP q80 ② 小件 albedo q80 ③ hero albedo q78
#   ④ 砍 tex01/tex07 ao（policy 砍序：先小件 ao）⑤ 非主角 normal→JPEG4:4:4 q92
#   ⑥ 主角 normal→JPEG4:4:4 q92（最后手段）
# 输出：out/web/<tex>_<kind>.<ext> + manifest.json 追加 "web" 段（file/mime/bytes）+ BUDGET 行
import base64
import io
import json
import os
import sys

import numpy as np
from PIL import Image

def argof(n, d):
    return sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d

D = argof("--dir", os.path.join(os.path.dirname(os.path.abspath(__file__)), "out"))
BUDGET = int(argof("--budget-b64", "1450000"))
WEB = os.path.join(D, "web")
os.makedirs(WEB, exist_ok=True)

man = json.load(open(os.path.join(D, "manifest.json"), encoding="utf-8"))
IMGS = {}
for tex, maps in man["textures"].items():
    for kind, meta in maps.items():
        IMGS[(tex, kind)] = Image.open(os.path.join(D, meta["file"])).convert("RGB")

def enc(img, fmt, **kw):
    buf = io.BytesIO()
    img.save(buf, format=fmt, **kw)
    return buf.getvalue()

def pick(cands):
    best = None
    for data, mime, ext in cands:
        if best is None or len(data) < len(best[0]):
            best = (data, mime, ext)
    return best

def encode_map(tex, kind, mode):
    img = IMGS[(tex, kind)]
    key = (tex, kind)
    if mode == "albedo_pass1":
        j = enc(img, "JPEG", quality=86, subsampling=0, optimize=True)
        w = enc(img, "WEBP", quality=85, method=6)
        return pick([(j, "image/jpeg", "jpg"), (w, "image/webp", "webp")])
    if mode == "albedo_small_q80":
        j = enc(img, "JPEG", quality=80, subsampling=0, optimize=True)
        w = enc(img, "WEBP", quality=78, method=6)
        return pick([(j, "image/jpeg", "jpg"), (w, "image/webp", "webp")])
    if mode == "albedo_hero_q78":
        j = enc(img, "JPEG", quality=78, subsampling=0, optimize=True)
        w = enc(img, "WEBP", quality=75, method=6)
        return pick([(j, "image/jpeg", "jpg"), (w, "image/webp", "webp")])
    if mode == "normal":
        w = enc(img, "WEBP", lossless=True, method=6)
        p = enc(img, "PNG", optimize=True)
        return pick([(w, "image/webp", "webp"), (p, "image/png", "png")])
    if mode == "normal_jpeg":
        j = enc(img, "JPEG", quality=92, subsampling=0, optimize=True)
        return (j, "image/jpeg", "jpg")
    if mode == "data":
        g = img.convert("L")
        p = enc(g, "PNG", optimize=True)
        w = enc(g, "WEBP", quality=88, method=6)
        if len(p) <= len(w) * 1.3:
            return (p, "image/png", "png")
        return (w, "image/webp", "webp")
    if mode == "data_webp80":
        g = img.convert("L")
        w = enc(g, "WEBP", quality=80, method=6)
        return (w, "image/webp", "webp")
    raise ValueError(mode)

ALBEDO_KINDS = {"albedo", "emissive"}
SMALL = {"tex05", "tex06", "tex08", "tex09", "tex10", "tex11", "tex12"}
HERO_ALBEDO = {"tex01", "tex03", "tex07", "tex02", "tex04"}
NORMAL_HAVE = [t for t in man["textures"] if "normal" in man["textures"][t]]

def run_pass(degrade):
    out = {}
    total = 0
    for (tex, kind) in IMGS:
        if kind in ALBEDO_KINDS:
            mode = "albedo_pass1"
            if degrade >= 2 and tex in SMALL:
                mode = "albedo_small_q80"
            if degrade >= 3 and tex in HERO_ALBEDO:
                mode = "albedo_hero_q78"
        elif kind == "normal":
            if degrade >= 6 or (degrade >= 5 and tex not in ("tex01", "tex03")):
                mode = "normal_jpeg"
            else:
                mode = "normal"
        else:  # rough / ao
            if degrade >= 1:
                mode = "data_webp80"
            else:
                mode = "data"
        if kind == "ao" and degrade >= 4 and tex in ("tex01", "tex07"):
            continue  # 砍序：先砍 hero ao
        data, mime, ext = encode_map(tex, kind, mode)
        fn = "%s_%s.%s" % (tex, kind, ext)
        with open(os.path.join(WEB, fn), "wb") as f:
            f.write(data)
        b64len = (len(data) + 2) // 3 * 4
        out.setdefault(tex, {})[kind] = {"file": "web/" + fn, "mime": mime, "bytes": len(data), "b64": b64len}
        total += b64len
    return out, total

degrade = 0
web, total = run_pass(degrade)
print("BUDGET pass0 total_b64=%d (budget %d)" % (total, BUDGET))
while total > BUDGET and degrade < 6:
    degrade += 1
    web, total = run_pass(degrade)
    print("DEGRADE step=%d total_b64=%d" % (degrade, total))
man["web"] = web
# env 全景：JPEG q82（低频渐变+光斑，有损安全）
if man.get("env") and os.path.exists(os.path.join(D, man["env"]["file"])):
    ev = Image.open(os.path.join(D, man["env"]["file"])).convert("RGB")
    j = enc(ev, "JPEG", quality=82, subsampling=1, optimize=True)
    fn = "env_equirect.jpg"
    with open(os.path.join(WEB, fn), "wb") as f:
        f.write(j)
    b64len = (len(j) + 2) // 3 * 4
    web["env"] = {"file": "web/" + fn, "mime": "image/jpeg", "bytes": len(j), "b64": b64len}
    total += b64len
    print("BUDGET env b64=%d" % b64len)
man["meta"]["budget"] = {"total_b64": total, "budget_b64": BUDGET, "degrade_steps": degrade}
with open(os.path.join(D, "manifest.json"), "w", encoding="utf-8") as f:
    json.dump(man, f, ensure_ascii=False, indent=1)
for tex, maps in web.items():
    if "b64" in maps:
        continue  # env 单件条目（直接含 b64）
    s = sum(m["b64"] for m in maps.values())
    print("BUDGET %s b64=%d %s" % (tex, s, " ".join("%s:%dB(%s)" % (k, v["bytes"], v["mime"].split("/")[1]) for k, v in maps.items())))
print("COMPRESS-DONE total_b64=%d degrade=%d %s" % (total, degrade, "OVER" if total > 1536000 else "OK"))

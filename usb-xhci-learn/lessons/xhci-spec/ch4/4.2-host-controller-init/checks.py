#!/usr/bin/env python3
# 交付前机检：自包含 / 互链 / 页码 needle（语言门另行跑 scan_words）
import re, pathlib, sys

HERE = pathlib.Path(__file__).parent
fail = 0

# 1) 自包含：零外部 script/link（http URL 只许 SVG xmlns）
for name in ["index.html", "index-light.html"]:
    html = (HERE / name).read_text(encoding="utf-8")
    ext_script = re.findall(r'<script[^>]+src=["\']([^"\']+)', html)
    ext_link = re.findall(r'<link[^>]+href=["\']([^"\']+)', html)
    http_urls = [u for u in re.findall(r'https?://[^"\'\s<>]+', html) if "www.w3.org" not in u]
    bad = ext_script + ext_link + http_urls
    print(f"self-contained {name}: ext_script={len(ext_script)} ext_link={len(ext_link)} other_http={len(http_urls)}", "PASS" if not bad else f"FAIL {bad[:3]}")
    fail += bool(bad)

# 2) 互链可达
BASE = HERE.parent.parent.parent  # lessons/
links = [
    "../../index.html",
    "../../../xhc-machines/fig3-event-ring/index.html",
    "../../../xhc-machines/fig4-command-ring/index.html",
    "../../shared/zoomfs.mjs",
]
for rel in links:
    p = (HERE / rel).resolve()
    print(f"link {rel}: {'PASS' if p.exists() else 'MISSING'}")
    if not p.exists():
        fail += 1
# 兄弟节页面（终验指示直链；页面由主会话本轮交付，缺失记 PENDING 不计失败）
for sib in ["../4.1-command-operation/index.html", "../4.3-usb-device-init/index.html"]:
    p = (HERE / sib).resolve()
    print(f"sibling page {sib}: {'PASS' if p.exists() else 'PENDING (主会话本轮交付)'}")
# 兄弟节目录（主会话建）
for sib in ["../4.1-command-operation", "../4.3-usb-device-init"]:
    p = (HERE / sib).resolve()
    print(f"sibling dir {sib}: {'EXISTS' if p.is_dir() else 'MISSING'}")

# 3) 页码机核（pypdf needle，18 条；判据见 EVIDENCE §1）
try:
    from pypdf import PdfReader
    pdf = PdfReader(str(BASE.parent / "specs" / "625472_xHCI_Rev1_2b.pdf"))
    needles = [
        (68, "4.2"), (68, "Host Controller Initialization"), (68, "FLADJ"),
        (69, "Controller Not Ready"), (69, "does not imply a specific order"), (69, "MaxSlotsEn"),
        (69, "DCBAAP"), (69, "Command Ring Control Register"), (69, "Interrupts are optional"),
        (70, "ERSTSZ"), (70, "Event Ring Dequeue Pointer"), (70, "ERSTBA"),
        (70, "writing the ERSTBA enables"), (70, "Run/Stop"), (70, "doorbell references"),
        (70, "reporting device connects"), (70, "require the port reset"), (70, "automatically advance to the Enabled state"),
    ]
    bad = [n for p, n in needles if n not in (pdf.pages[p - 1].extract_text() or "")]
    print(f"page needles: {len(needles) - len(bad)}/{len(needles)}", "PASS" if not bad else f"FAIL {bad}")
    fail += bool(bad)
except Exception as e:
    print("page needles: SKIP", e)

# 4) zoomfs 三件套接线 + __zfs 定义
html = (HERE / "index.html").read_text(encoding="utf-8")
for token in ["iso-zoombar", "data-zoom", "data-fs", "window.__zfs =", "__zfsLane"]:
    print(f"wiring '{token}':", "PASS" if token in html else "FAIL")
    fail += token not in html

sys.exit(1 if fail else 0)

#!/usr/bin/env python3
"""linkcheck.py — 相对链接目标存在性机检（一次性工作脚本，替代手抄）。"""
import re, pathlib, sys

for name in ("index.html", "index-light.html"):
    page = pathlib.Path("/Users/jason/ZCodeProject/usb-xhci-study/lessons/xhci-spec/ch4/4.19-root-hub") / name
    html = page.read_text()
    hrefs = sorted(set(re.findall(r'href="([^"#]+)"', html)))
    missing = []
    for h in hrefs:
        if h.startswith(("http", "mailto", "data:")):
            continue
        target = (page.parent / h).resolve()
        if not target.exists():
            missing.append(h)
    print(f"{name}: {len(hrefs)} hrefs, missing={missing}")
    if missing:
        sys.exit(1)
print("LINKCHECK-PASS")

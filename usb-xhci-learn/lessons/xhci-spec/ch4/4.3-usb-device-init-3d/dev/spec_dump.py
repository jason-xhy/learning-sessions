#!/usr/bin/env python3
"""施工期判据采集 2：全量提取 p71-77 文本 + 定位 Parameter Error 判据页。只打印不写。"""
from pypdf import PdfReader

PDF = "/Users/jason/ZCodeProject/usb-xhci-study/specs/625472_xHCI_Rev1_2b.pdf"
r = PdfReader(PDF)

for p in (71, 72, 73):
    t = (r.pages[p - 1].extract_text() or "").replace("\n \n", "\n")
    print(f"===== PAGE {p} =====")
    print(t)
    print()

print("===== Parameter Error in completion-code table (p225-245) =====")
for p in range(225, 246):
    t = r.pages[p - 1].extract_text() or ""
    if "Parameter Error" in t:
        i = t.index("Parameter Error")
        print(f"p{p}: ...{t[max(0,i-120):i+80]!r}...")

print("===== Address Device input-context validation (p76-80 context) =====")
for p in (76, 77, 78):
    t = r.pages[p - 1].extract_text() or ""
    for kw in ("Parameter Error", "Input Context", "A0", "A1"):
        i = t.find(kw)
        if i >= 0:
            print(f"p{p} {kw!r}: ...{t[max(0,i-100):i+100]!r}...")

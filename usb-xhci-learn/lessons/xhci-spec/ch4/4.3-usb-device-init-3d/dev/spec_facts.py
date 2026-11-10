#!/usr/bin/env python3
"""施工期判据采集：pypdf 提取 §4.3 域关键页文本，核对引文 needle 与字段值出处。
只读规范 PDF，输出事实行，不写任何交付文件。"""
from pypdf import PdfReader

PDF = "/Users/jason/ZCodeProject/usb-xhci-study/specs/625472_xHCI_Rev1_2b.pdf"
r = PdfReader(PDF)

NEEDLES = [
    (71, "Current Connect Status (CCS)"),
    (71, "Connect Status Change (CSC)"),
    (72, "the PLS field to be U0"),
    (72, "preparing it for a SET_ADDRESS request"),
    (72, "first 8 bytes of the USB Device Descriptor"),
    (72, "bMaxPacketSize0"),
    (72, "Enable Slot Command"),
    (75, "selected by the host controller"),
    (75, "4.3.2"),
    (76, "Block Set Address Request (BSR)"),
    (76, "Enabled to the Addressed state"),
    (76, "4.3.3"),
    (76, "Default state"),
    (74, "from Address to Configured"),
    (74, "Configure Endpoint Command"),
    (73, "0100h"),
    (73, "Length = 8"),
    (76, "CErr"),
    (76, "Max Packet Size"),
    (77, "BSR"),
    (77, "Enabled to the Default"),
]
print("== needle check ==")
for p, needle in NEEDLES:
    t = r.pages[p - 1].extract_text() or ""
    print(f"p{p} {'OK ' if needle in t else 'MISS'} {needle!r}")

print("== Parameter Error scan (p60-100) ==")
for p in range(60, 101):
    t = r.pages[p - 1].extract_text() or ""
    if "Parameter Error" in t:
        i = t.index("Parameter Error")
        print(f"p{p}: ...{t[max(0,i-60):i+40]!r}...")

print("== p71-72 PLS context ==")
for p in (71, 72):
    t = r.pages[p - 1].extract_text() or ""
    for needle in ("'7'", "Polling", "Disabled"):
        i = t.find(needle)
        while i >= 0:
            print(f"p{p} {needle!r}: ...{t[max(0,i-90):i+90]!r}...")
            i = t.find(needle, i + 1)
            break

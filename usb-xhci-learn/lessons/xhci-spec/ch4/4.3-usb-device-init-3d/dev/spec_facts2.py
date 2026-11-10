#!/usr/bin/env python3
"""施工期判据采集 3：断行安全短 needle + Parameter Error 定义行定位。只打印。"""
from pypdf import PdfReader

PDF = "/Users/jason/ZCodeProject/usb-xhci-study/specs/625472_xHCI_Rev1_2b.pdf"
r = PdfReader(PDF)

NEEDLES = [
    (71, "4.3 USB Device Initialization"),
    (71, "Port Status Change Event"),
    (71, "0' to '1' transition of Port Status Change Event Generation"),
    (72, "field shall be '7' (Polling)"),
    (72, "field to be U0 ('0')"),
    (72, "preparing it for a"),
    (72, "Enable Slot"),
    (72, "first 8 bytes of the"),
    (72, "USB Device Descriptor"),
    (73, "wValue = 0100h"),
    (73, "bmRequestType = 80h"),
    (73, "IDT) = 1"),
    (74, "from Address to Configured"),
    (74, "Configure Endpoint"),
    (74, "SET_CONFIGURATION"),
    (74, "Note: The maximum"),
    (75, "4.3.2 Enable Slot Command"),
    (75, "Enable Slot Command returns a Slot ID"),
    (75, "Output Device Context"),
    (76, "4.3.3 Address Device Command"),
    (76, "cleared to '0'"),
    (76, "Root Hub Port Number"),
    (76, "Route String"),
    (76, "Context Entries"),
    (76, "Max Burst"),
    (76, "CErr"),
    (76, "Interval"),
    (76, "Mult"),
    (77, "Enabled to the Addressed"),
    (77, "BSR"),
    (77, "Default state"),
    (77, "4.3.4"),
    (78, "4.3.5 Configure Endpoint"),
]
print("== needle check 2 ==")
bad = 0
for p, needle in NEEDLES:
    t = r.pages[p - 1].extract_text() or ""
    hit = needle in t
    bad += 0 if hit else 1
    print(f"p{p} {'OK ' if hit else 'MISS'} {needle!r}")
print("misses:", bad)

print("== 'Parameter is invalid' scan p90-110 / p230-270 ==")
for rng in (range(90, 111), range(230, 271)):
    for p in rng:
        t = r.pages[p - 1].extract_text() or ""
        if "Parameter is invalid" in t or ("Parameter Error" in t and "invalid" in t):
            for kw in ("Parameter is invalid", "Parameter Error"):
                i = t.find(kw)
                while i >= 0:
                    print(f"p{p} {kw!r}: ...{t[max(0,i-110):i+60]!r}...")
                    i = t.find(kw, i + 1)
                    break

print("== p80 Parameter Error context ==")
t = r.pages[79].extract_text() or ""
i = t.find("Parameter Error")
print(t[max(0, i - 400):i + 200])

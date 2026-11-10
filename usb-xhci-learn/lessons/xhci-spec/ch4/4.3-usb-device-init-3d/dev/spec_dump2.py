#!/usr/bin/env python3
"""施工期判据采集 4：p75-78 全文 + p95-102 Parameter Error 定位 + 引文逐字核对。只打印。"""
from pypdf import PdfReader

PDF = "/Users/jason/ZCodeProject/usb-xhci-study/specs/625472_xHCI_Rev1_2b.pdf"
r = PdfReader(PDF)

for p in (75, 76, 77, 78):
    t = (r.pages[p - 1].extract_text() or "")
    print(f"===== PAGE {p} =====")
    print(t[:4200])
    print()

print("===== p95-102 Parameter Error =====")
for p in range(95, 103):
    t = r.pages[p - 1].extract_text() or ""
    i = t.find("Parameter Error")
    while i >= 0:
        print(f"p{p}: ...{t[max(0,i-260):i+60]!r}...")
        i = t.find("Parameter Error", i + 1)

print("===== quote verbatim check (curly-quote aware) =====")
Q = [
    (71, "When the xHC detects a device attach, it shall set the Current Connect Status (CCS) and Connect Status Change (CSC) flags to ‘1’."),
    (72, "The completion of the port reset shall cause the PORTSC register PRC and PED flags to be set (‘1’), the PR flag to be cleared (‘0’), and the PLS field to be U0 (‘0’)."),
    (72, "The reset operation sets the USB2 device into the Default state, preparing it for a SET_ADDRESS request."),
    (72, "After the port successfully reaches the Enabled state, system software shall obtain a Device Slot for the newly attached device using an Enable Slot Command"),
    (76, "The Enable Slot Command returns a Slot ID that is selected by the host controller."),
    (76, "cleared to ‘0’"),
    (77, "Successful completion of the Address Device Command with BSR = ‘0’ shall transition the Device Slot from the Enabled to the Addressed state."),
    (74, "The successful completion of both operations is required to advance the state of the USB device from Address to Configured and xHC Device Slot from Addressed to Configured."),
    (72, "For FS devices, system software should initially read the first 8 bytes of the USB Device Descriptor to retrieve the value of the bMaxPacketSize0 field"),
]
for p, q in Q:
    t = r.pages[p - 1].extract_text() or ""
    t2 = t.replace("\n", " ").replace("  ", " ")
    print(f"p{p} {'OK ' if q in t2 else 'MISS'} {q[:70]!r}")

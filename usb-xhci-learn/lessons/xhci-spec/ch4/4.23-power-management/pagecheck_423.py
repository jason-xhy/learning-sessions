#!/usr/bin/env python3
# §4.23 页码机核（pypdf needle 对；needle 先在提取文本现场核对）
import subprocess, sys

CHECKS = [
    (310, "4.23 Power Management"), (310, "Core power may be switched off"),
    (310, "4.23.1"), (310, "Power Wells"),
    (311, "transition from the PCI PM D3hot state to the D0 state"),
    (311, "Light Host Controller Reset (LHCRST)"),
    (311, "4.23.2"), (312, "and save their state"),
    (312, "Restore State flags may only be set"),
    (312, "Force Save Context Capability"),
    (312, "Controller Save State (CSS)"),
    (312, "Remove Core Well power"),
    (313, "Controller Restore State (CRS)"),
    (313, "PORTSC, PORTPMSC, and PORTLI"),
    (313, "Restart each of the previously Running endpoints"),
    (314, "4.23.2.1"), (314, "not covered by a Save or Restore"),
    (314, "Error (SRE) flag in the USBSTS"),
    (315, "Refer to Appendix A."),
    (315, "shall support Link Power Management"),
    (315, "4.23.4"), (315, "4.23.5"),
    (316, "Table 4-12: LPM State Mapping"),
    (317, "shall never report a U1 state"),
    (317, "4.23.5.1.1"),
    (318, "4.23.5.1.1.1"), (318, "Hardware LPM Capability (HLC)"),
    (319, "Hardware LPM Enable (HLE)"),
    (320, "shall be mandatory for all"),
    (324, "Max Exit Latency field in the Slot Context"),
    (325, "TL1ExitLatency1 = BESL + TL1ExitDevRecovery"),
    (325, "4.23.5.2.1"),
    (326, "4.23.5.2.2"), (326, "The CMC flag in the HCCPARAMS2"),
    (327, "4.24 Host Controller Management"),
    (557, "Table A-1: xHCI Support for Power Management States"),
    (557, "in the USB suspended state before exiting the D0 state"),
    (558, "Power State Transitions"),
    (252, "4.15"), (254, "4.15.1.1"),
]

args = ["python3", "scripts/xhci_spec_pagecheck.py"]
for pg, nd in CHECKS:
    args += [str(pg), nd]
sys.exit(subprocess.call(args))

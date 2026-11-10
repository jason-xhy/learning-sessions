#!/usr/bin/env python3.9
"""quote_verify.py —— S5 一次性：原文对照六条（stages.js QUOTES）逐字核验 vs 规范提取文本。
用法（study 仓根）: /usr/local/bin/python3.9 lessons/xhci-spec/ch4/4.3-usb-device-init-3d/dev/quote_verify.py
依赖: /tmp/spec-audit-txt/xhci-1.2b.txt（scripts/xhci_spec_extract.py 重产）。
判据: 每条 quote 的 en 段（按 " / " 拆分）去除全部空白后必须为对应首引页（src 首个 pNN）文本的子串。
一次性粘合脚本（PIPELINE §6：不进 tools/，S5-记录登记「一次性」）。"""
import re
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[5]  # study 仓根（dev→课→ch4→xhci-spec→lessons→仓根）
STAGES = ROOT / "lessons/xhci-spec/ch4/4.3-usb-device-init-3d/src/stages.js"
EXTRACT = pathlib.Path("/tmp/spec-audit-txt/xhci-1.2b.txt")

src = STAGES.read_text(encoding="utf-8")
m = re.search(r"const QUOTES = \[(.*?)\n  \];", src, re.S)
block = m.group(1)
quotes = []
for qm in re.finditer(r"\{ en: (\".*?\"), zh: (\".*?\"), src: (\".*?\") \}", block, re.S):
    en, zh, s = qm.group(1), qm.group(2), qm.group(3)
    quotes.append((eval(en), eval(zh), eval(s)))  # noqa: S307 - 本仓受控数据件

pages = {}
for pm in re.finditer(r"===== \[PAGE (\d+)\] =====\n(.*?)(?====== \[PAGE |\Z)", EXTRACT.read_text(encoding="utf-8"), re.S):
    pages[int(pm.group(1))] = pm.group(2)

ok = True
for en, zh, s in quotes:
    first_page = int(re.search(r"p(\d+)", s).group(1))
    norm = lambda t: re.sub(r"[\s*]+", "", t).strip("“”")
    page_norm = norm(pages.get(first_page, ""))
    for seg in en.split(" / "):
        hit = norm(seg) in page_norm
        if not hit:
            # 跨页兜底：src 的 pNN–MM/pNN·MM 区间展开逐页找
            alt = []
            for rng in re.findall(r"p([\d]+[–\-—·,\d]*)", s):
                nums = re.findall(r"\d+", rng)
                if nums:
                    a, b = int(nums[0]), int(nums[-1])
                    alt.extend(range(a, b + 1))
            hit = any(norm(seg) in norm(pages.get(p, "")) for p in alt)
        print(("QUOTE-OK  " if hit else "QUOTE-MISS") + f" p{first_page} {seg[:58]!r}")
        ok = ok and hit
print("QUOTE-VERIFY-PASS" if ok else "QUOTE-VERIFY-FAIL")
raise SystemExit(0 if ok else 1)

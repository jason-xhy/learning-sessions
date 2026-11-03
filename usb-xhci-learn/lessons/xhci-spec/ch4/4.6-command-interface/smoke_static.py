#!/usr/bin/env python3
"""smoke_static.py — §4.6 表格节静态冒烟（SECTION-BRIEF §2.3 非 generator 节口径）。

双主题（dark/light）：console=0 + 页面标题在场 + 17 行命令总表行数机核；
截图：全页全景 / 命令总表卡特写 / 390px 全页，各 ×2 主题，落 shots/。
用法：python3 smoke_static.py
末行 TABLE-SMOKE-PASS / TABLE-SMOKE-FAIL。
"""
import pathlib
import sys

from playwright.sync_api import sync_playwright

SEC = pathlib.Path("/Users/jason/ZCodeProject/usb-xhci-study/lessons/xhci-spec/ch4/4.6-command-interface")


def main() -> int:
    ok = True
    (SEC / "shots").mkdir(exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome")
        for theme in ("dark", "light"):
            name = "index-light.html" if theme == "light" else "index.html"
            pg = b.new_page(viewport={"width": 1500, "height": 1000})
            errs = []
            pg.on("pageerror", lambda e, errs=errs: errs.append(str(e)))
            pg.on("console", lambda m, errs=errs: errs.append(m.text) if m.type == "error" else None)
            pg.goto((SEC / name).as_uri())
            pg.wait_for_timeout(600)
            ok_theme = True
            rows = pg.locator(".xsp-card:has(h2:text('17 条命令总表')) table.xsp-tb tr").count()
            cards = pg.locator(".xsp-card").count()
            if errs:
                print(f"FAIL [{theme}] console: {errs[:3]}")
                ok_theme = False
            # 总表 17 条命令 + 1 表头行
            if rows != 18:
                print(f"FAIL [{theme}] 命令总表行数={rows}（期望 18=表头+17）")
                ok_theme = False
            if cards != 6:  # 要义 / 原文对照 / 四环节 / 总表 / 分组 / 相关
                print(f"FAIL [{theme}] 卡片数={cards}（期望 6）")
                ok_theme = False
            pg.screenshot(path=str(SEC / f"shots/table-overview-{theme}.png"), full_page=True)
            card = pg.locator(".xsp-card:has(h2:text('17 条命令总表'))")
            card.scroll_into_view_if_needed()
            pg.wait_for_timeout(250)
            card.screenshot(path=str(SEC / f"shots/table-cmds-{theme}.png"))
            pg.set_viewport_size({"width": 390, "height": 844})
            pg.wait_for_timeout(400)
            pg.screenshot(path=str(SEC / f"shots/table-390-{theme}.png"), full_page=True)
            print(f"[{theme}] PASS console={len(errs)} cards={cards} cmd-rows={rows}")
            ok = ok and ok_theme
            pg.close()
        b.close()
    print("TABLE-SMOKE-PASS" if ok else "TABLE-SMOKE-FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())

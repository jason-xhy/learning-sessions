#!/usr/bin/env python3
"""smoke_state.py — §4.19 机器页冒烟（anatomy 机器形态：双 iso-stage）。

双主题（dark/light）：console=0 + zoombar ×2 + window.__zfs/__zfsState 存活 + .iso-stage 恰 2 个
+ __fig419/__fig42 探针 API 在场；截图：全页全景 / 状态机总览卡 / 机器卡 / 390px 全页，各 ×2 主题，落 shots/。
用法：python3 smoke_state.py   （任意目录运行，路径按仓库锚定）
末行 STATE-SMOKE-PASS / STATE-SMOKE-FAIL。
"""
import pathlib
import sys

from playwright.sync_api import sync_playwright

SEC = pathlib.Path("/Users/jason/ZCodeProject/usb-xhci-study/lessons/xhci-spec/ch4/4.19-root-hub")


def main() -> int:
    ok = True
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome")
        for theme in ("dark", "light"):
            name = "index-light.html" if theme == "light" else "index.html"
            pg = b.new_page(viewport={"width": 1500, "height": 1000})
            errs = []
            pg.on("pageerror", lambda e, errs=errs: errs.append(str(e)))
            pg.on("console", lambda m, errs=errs: errs.append(m.text) if m.type == "error" else None)
            pg.goto((SEC / name).as_uri())
            pg.wait_for_timeout(700)
            ok_theme = True
            zbar = pg.locator(".iso-zoombar").count()
            zfs = pg.evaluate("() => typeof window.__zfs === 'object' && typeof window.__zfsState === 'object'")
            n_stage = pg.locator(".iso-stage").count()
            api = pg.evaluate("() => typeof window.__fig419?.playTo === 'function' && window.__fig42 === window.__fig419")
            if errs:
                print(f"FAIL [{theme}] console: {errs[:3]}")
                ok_theme = False
            if zbar != 2:
                print(f"FAIL [{theme}] zoombar 数量={zbar}（期望 2）")
                ok_theme = False
            if not zfs:
                print(f"FAIL [{theme}] window.__zfs/__zfsState 未存活")
                ok_theme = False
            if n_stage != 2:
                print(f"FAIL [{theme}] .iso-stage 数量={n_stage}（期望 2）")
                ok_theme = False
            if not api:
                print(f"FAIL [{theme}] __fig419/__fig42 探针 API 缺席")
                ok_theme = False
            pg.screenshot(path=str(SEC / f"shots/page-{theme}.png"), full_page=True)
            stg = pg.locator(".iso-stage").first
            stg.scroll_into_view_if_needed()
            pg.wait_for_timeout(250)
            stg.screenshot(path=str(SEC / f"shots/state-diagram-{theme}.png"))
            mstg = pg.locator(".fig-wrap .iso-stage")
            mstg.scroll_into_view_if_needed()
            pg.wait_for_timeout(250)
            mstg.screenshot(path=str(SEC / f"shots/machine-{theme}.png"))
            pg.set_viewport_size({"width": 390, "height": 844})
            pg.wait_for_timeout(400)
            pg.screenshot(path=str(SEC / f"shots/phone-390-{theme}.png"), full_page=True)
            print(f"[{theme}] {'PASS' if ok_theme else 'FAIL'} console={len(errs)} zoombar={zbar} zfs={zfs} stage={n_stage} api={api}")
            ok = ok and ok_theme
            pg.close()
        b.close()
    print("STATE-SMOKE-PASS" if ok else "STATE-SMOKE-FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())

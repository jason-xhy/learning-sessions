#!/usr/bin/env python3
"""ink_check.py — 文字墨迹四角 SAT 求交（getBBox×getScreenCTM；4.14 先例的补偿机检）。一次性诊断。"""
import json
import pathlib

from playwright.sync_api import sync_playwright

SEC = pathlib.Path("/Users/jason/ZCodeProject/usb-xhci-study/lessons/xhci-spec/ch4/4.19-root-hub")

INK_JS = r"""
(() => {
  const svg = document.querySelectorAll('.iso-stage')[1].querySelector('svg');
  const ts = [...svg.querySelectorAll('text')].filter(t => t.textContent.trim());
  const polys = ts.map(t => {
    const b = t.getBBox(), m = t.getScreenCTM();
    const pt = (x, y) => { const q = svg.createSVGPoint(); q.x = x; q.y = y; const w = q.matrixTransform(m); return [w.x, w.y]; };
    return { t, p: [pt(b.x, b.y), pt(b.x + b.width, b.y), pt(b.x + b.width, b.y + b.height), pt(b.x, b.y + b.height)] };
  });
  const sat = (A, B) => {
    for (const poly of [A.p, B.p]) {
      for (let i = 0; i < poly.length; i++) {
        const x1 = poly[i][0], y1 = poly[i][1];
        const x2 = poly[(i + 1) % poly.length][0], y2 = poly[(i + 1) % poly.length][1];
        const nx = y2 - y1, ny = x1 - x2;
        let minA = 1e9, maxA = -1e9, minB = 1e9, maxB = -1e9;
        for (const q of A.p) { const d = q[0] * nx + q[1] * ny; if (d < minA) minA = d; if (d > maxA) maxA = d; }
        for (const q of B.p) { const d = q[0] * nx + q[1] * ny; if (d < minB) minB = d; if (d > maxB) maxB = d; }
        if (maxA < minB || maxB < minA) return false;
      }
    }
    return true;
  };
  const out = [];
  for (let i = 0; i < polys.length; i++)
    for (let j = i + 1; j < polys.length; j++)
      if (sat(polys[i], polys[j]))
        out.push(polys[i].t.textContent.slice(0, 14) + ' × ' + polys[j].t.textContent.slice(0, 14));
  return out;
})()
"""

FRAMES = [(0, 4600), (1, 7000), (3, 9000), (5, 7200), (8, 9000)]

with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome")
    for theme in ("index.html", "index-light.html"):
        pg = b.new_page(viewport={"width": 1500, "height": 1000})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto((SEC / theme).as_uri())
        pg.wait_for_function("() => !!window.__fig419")
        pg.evaluate("() => window.__fig419.pause()")
        pg.wait_for_timeout(800)
        for fr, wait in FRAMES:
            pg.evaluate(f"() => window.__fig419.playTo({fr})")
            pg.wait_for_timeout(wait)
            hits = pg.evaluate(INK_JS)
            print(f"{theme} F{fr}: {len(hits)} ink-overlaps" + (" -> " + " | ".join(hits[:6]) if hits else ""))
        print(f"{theme} pageerrors={errs[:2]}")
        pg.close()
    b.close()

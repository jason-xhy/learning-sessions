#!/usr/bin/env python3
"""audit_arrows.py — §4.5 状态图箭头触边机核（teach 箭头落位判据：端点距盒边 ≤2.5px）。

解析 index.html 的 SVG：.st-box rect（5 态盒）+ .st-edge path（8 迁移边），
对每条边取首末坐标点，算到所有盒 4 条边线段的最小距离，全 ≤2.5px 判 PASS。
用法：python3 audit_arrows.py [index.html|index-light.html]
末行 ARROW-EDGE-PASS / ARROW-EDGE-FAIL。
"""
import re
import sys

TOL = 2.5


def seg_dist(px, py, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    wx, wy = px - ax, py - ay
    t = max(0.0, min(1.0, (wx * vx + wy * vy) / (vx * vx + vy * vy or 1)))
    dx, dy = px - (ax + t * vx), py - (ay + t * vy)
    return (dx * dx + dy * dy) ** 0.5


def main() -> int:
    fn = sys.argv[1] if len(sys.argv) > 1 else "index.html"
    html = open(fn, encoding="utf-8").read()
    boxes = [(float(m[0]), float(m[1]), float(m[2]), float(m[3]))
             for m in re.findall(r'<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" rx="10"/>', html)]
    assert len(boxes) == 5, f"期望 5 个状态盒，实得 {len(boxes)}"
    edges = re.findall(r'<path d="((?:M[\d.,-]+(?: L[\d.,-]+)+))" class="st-edge"', html)
    assert len(edges) == 8, f"期望 8 条迁移边，实得 {len(edges)}"
    ok = True
    worst = 0.0
    for i, d in enumerate(edges, 1):
        pts = [(float(m[1]), float(m[2])) for m in re.findall(r"([M L])([\d.]+),([\d.]+)", " " + d)]
        ends = [pts[0], pts[-1]]
        for (px, py) in ends:
            best, hit = 1e9, None
            for (x, y, w, h) in boxes:
                for (ax, ay, bx, by) in ((x, y, x + w, y), (x + w, y, x + w, y + h),
                                         (x, y + h, x + w, y + h), (x, y, x, y + h)):
                    dd = seg_dist(px, py, ax, ay, bx, by)
                    if dd < best:
                        best, hit = dd, (x, y)
            worst = max(worst, best)
            mark = "OK" if best <= TOL else "MISS"
            if best > TOL:
                ok = False
            print(f"edge{i} 端点({px:g},{py:g}) → 最近盒{hit} 距边 {best:.2f}px {mark}")
    print(f"最差触边偏差 {worst:.2f}px（门限 ≤{TOL}px）· 盒 5 · 边 {len(edges)}")
    print("ARROW-EDGE-PASS" if ok else "ARROW-EDGE-FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())

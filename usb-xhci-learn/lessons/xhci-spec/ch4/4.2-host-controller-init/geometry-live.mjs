// 动件几何（build 生成初始姿态入审计；同一源码内联进页面驱动 live 帧）
// 旋钮 / 计数轮 / 数字窗 / R/S 闸刀 / 小闸刀 / 桁架滑车 / 卡库叠卡 / 飞行卡
export function makeLiveGeo(k, G, D) {
  const P = D.P;
  const at = (p) => k.iso(p, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const Ln = (d, style) => k.lineSvg(d, style);
  const f2 = (v) => Math.round(v * 100) / 100;
  const FT = (m, text, size, tone = "mid", anchor = "start") => k.faceTextSvg(m, text, { size, tone, anchor });
  function planeMatrix(o, ex, ey) {
    const p0 = at(o), px = at(G.add3(o, ex)), py = at(G.add3(o, ey));
    return `matrix(${f2(px[0] - p0[0])} ${f2(px[1] - p0[1])} ${f2(py[0] - p0[0])} ${f2(py[1] - p0[1])} ${f2(p0[0])} ${f2(p0[1])})`;
  }
  const faceM = (x, y, z) => planeMatrix([x, y, z], [1, 0, 0], [0, 0, -1]);
  const vtext = (x, y, z, text, size, tone = "mid", anchor = "start") => FT(faceM(x, y, z), text, size, tone, anchor);
  const FACE = D.face; const PF = D.pf; // 面板前面（y 大侧）

  // ---- 旋钮（竖直面，轴沿 -y 凸出柜面；ang 为指针角，0=竖直向上） ----
  function knobSvg(cx, ang, r = 4.6) {
    const F = G.frameOf([cx, PF + 2.7, 79], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    const a = (ang * Math.PI) / 180;
    const p1 = [cx + 1.6 * Math.sin(a), PF + 2.6, 79 + 1.6 * Math.cos(a)];
    const p2 = [cx + (r - 0.9) * Math.sin(a), PF + 2.6, 79 + (r - 0.9) * Math.cos(a)];
    return S(G.disc(0, 3.6, r, F, P, { steps: 26, bevel: 0.25 }), { tone: "hi" })
      + S(G.disc(0, 1.6, r * 0.42, F, P, { steps: 18 }), { tone: "lo" })
      + Ln(G.ribsOf(F, 1.4, r - 0.5, r, 16, P, { fade: [0.1, 0.55] }).map((rb) => rb.d).join(""), { tone: "lo" })
      + Ln(k.pathOf([at(p1), at(p2)]), { tone: "hi", "stroke-width": 1.1 });
  }

  // ---- ERSTSZ 计数轮数字窗（pos 0..3，带滚过动画用小数位） ----
  function wheelWinSvg(pos) {
    const cx = D.cellX[2];
    const w = 8.4, y0 = 77.4, y1 = 88.4;   // 窗（柜面上）
    const cell = 11 / 4;                    // 带：4 位数字竖排，每位高 11/4
    const off = pos * cell;
    let g = `<g clip-path="url(#erszclip)">`;
    for (let i = -1; i <= 4; i++) {
      const z = y1 + i * cell - off - 4.4;
      g += vtext(cx, PF + 0.4, z, String(Math.max(0, Math.min(9, i))), 8.25, i === Math.round(pos) ? "hi" : "lo", "middle");
    }
    g += `</g>`;
    g += Ln(k.pathOf([
      [cx - w / 2, PF + 0.3, y0], [cx + w / 2, PF + 0.3, y0],
      [cx + w / 2, PF + 0.3, y1], [cx - w / 2, PF + 0.3, y1],
    ].map((p) => at(p)), true), { tone: "lo" });
    return `<defs><clipPath id="erszclip"><path d="${k.pathOf([[cx - w / 2, PF + 0.5, y0], [cx + w / 2, PF + 0.5, y0], [cx + w / 2, PF + 0.5, y1], [cx - w / 2, PF + 0.5, y1]].map(at), true)}"/></clipPath></defs>` + g;
  }

  // ---- MaxSlotsEn 数字窗（n=0 空；点亮后显数字+格） ----
  function numWinSvg(n) {
    const cx = D.cellX[1] + 7;
    let g = Ln(k.pathOf([[cx - 5.5, PF + 0.3, 76.4], [cx + 5.5, PF + 0.3, 76.4], [cx + 5.5, PF + 0.3, 85.4], [cx - 5.5, PF + 0.3, 85.4]].map((p) => at(p)), true), { tone: "lo" });
    if (n > 0) g += vtext(cx, PF + 0.4, 78.4, String(n), 7.5, "hi", "middle");
    return g;
  }

  // ---- R/S 大闸刀杆（t=0 OFF 上翘 → t=1 ON 压触点） ----
  function rsArmSvg(t) {
    const pitch = ((46 - 48 * t) * Math.PI) / 180;
    const [hx, hy, hz] = [D.rs.hinge[0], D.rs.hinge[1], D.rs.z + 17.6];
    const L = 62;
    const tip = [hx + L * Math.cos(pitch), hy, hz + L * Math.sin(pitch)];
    const mid = [hx + (L - 9) * Math.cos(pitch), hy, hz + (L - 9) * Math.sin(pitch)];
    return S(k.cylinder(D.rs.hinge[0], D.rs.hinge[1], 2.4, D.rs.z + 6, 9, P, 16, 0.3), { tone: "mid" })
      + Ln(k.pathOf([at([hx, hy, hz]), at(mid)]), { tone: "hi", "stroke-width": 2.2 })
      + Ln(k.pathOf([at(mid), at(tip)]), { tone: "hi", "stroke-width": 4 })
      + S(G.sphereOf([hx, hy, hz], 2.3, P), { tone: "mid" })
      + S(G.sphereOf([tip[0], tip[1], tip[2]], 2.6, P), { tone: "hi", lit: true });
  }

  // ---- 小闸刀（INTE/IE）杆：t=0 OFF → t=1 ON（铰点在铰柱前端面） ----
  function swArmSvg(cx, t) {
    const pitch = ((34 - 44 * t) * Math.PI) / 180;
    const [hx, hy, hz] = [cx - 4, PF + 5.6, 80.5];
    const L = 9.4;
    const tip = [hx + L * Math.cos(pitch), hy, hz + L * Math.sin(pitch)];
    return Ln(k.pathOf([at([hx, hy, hz]), at(tip)]), { tone: "hi", "stroke-width": 2.4 })
      + S(G.sphereOf([tip[0], tip[1], tip[2]], 1.5, P), { tone: "hi", lit: true });
  }

  // ---- 飞行卡 / 落位卡（同一造型：底板 + 底部拉耳 + 刻字 + 测试点） ----
  // 2026-11-05 遮挡修复轮：卡体与刻字拆开（cardBodySvg / cardTextSvg）——卡体保持 settle
  // 深度序（滑车/拉线互遮不变），刻字统一入页尾 textlayer（rail0/rail1/wire 分段按 bbox
  // 盖字=探针 FAIL；字面本体在 rail 前方 8+ 世界单位，纯 bbox 伪影，置尾零视觉损失）。
  function cardBodySvg(x, yFace, z, def) {
    const plan = { x, y: yFace - D.cardT, w: D.cardW, d: D.cardT, r: 0.8 };
    let g = S(k.slabOf(plan, z, D.cardH, P, 2, 0.3), { tone: "hi" });
    g += S(k.slabOf({ x: x + D.cardW / 2 - 4, y: yFace - 1.8, w: 8, d: 1.6, r: 0.5 }, z, 2.6, P, 2, 0.2), { tone: "mid" });
    g += k.dotsSvg([[x + 2.6, yFace + 0.2, z + D.cardH - 2.2], [x + D.cardW - 2.6, yFace + 0.2, z + D.cardH - 2.2]].map((p) => at(p)), { size: 0.42 });
    return g;
  }
  function cardTextSvg(x, yFace, z, def) {
    return vtext(x + D.cardW / 2, yFace + 0.05, z + D.cardH - 6.2, def.name, 8.2, "hi", "middle")
      + vtext(x + D.cardW / 2, yFace + 0.05, z + 4.2, def.sub, 4.4, "mid", "middle");
  }
  function cardSvg(x, yFace, z, def) {
    return cardBodySvg(x, yFace, z, def) + cardTextSvg(x, yFace, z, def);
  }

  // ---- 卡库叠卡（n 张平叠，托盘上方留缝） ----
  function magStackSvg(n) {
    if (n <= 0) return "";
    let g = "";
    for (let i = 0; i < n; i++) {
      const z = 37.8 + i * 2.3;
      g += S(k.slabOf({ x: D.mag.x, y: D.mag.y + (i % 2) * 0.5, w: D.mag.w - 4, d: D.mag.d - 6, r: 0.8 }, z, 1.5, P, 2, 0.2), { tone: i === n - 1 ? "hi" : "mid" });
    }
    return g;
  }

  // ---- 桁架滑车（x 水平位；drop 吊杆伸出量；push 插入推进量） ----
  // 2026-11-03 修复轮：飞行卡自滑车 svg 拆出为独立深度项（flyCardPos + live 每帧按深度插入 DOM 序）
  function trolleySvg(x, drop, push = 0) {
    const zCar = 63;
    let g = S(k.slabOf({ x: x - 6.5, y: D.beamY - 4.5, w: 13, d: 9, r: 1.4 }, zCar, 14, P, 3, 0.4), { tone: "hi" })
      + Ln(k.pathOf([at([x, D.beamY - 3, zCar]), at([x, D.beamY - 3, zCar - drop])]), { tone: "mid", "stroke-width": 1.8 });
    // 夹爪（两条小臂）
    const zg = zCar - drop;
    g += S(k.slabOf({ x: x - 15, y: D.beamY - 4, w: 4, d: 2, r: 0.5 }, zg - 2.5, 3.4, P, 2), { tone: "mid" })
      + S(k.slabOf({ x: x + 11, y: D.beamY - 4, w: 4, d: 2, r: 0.5 }, zg - 2.5, 3.4, P, 2), { tone: "mid" });
    return g;
  }

  // ---- 飞行卡位姿（与修前 trolleySvg 内嵌卡完全同式：吊在爪下，push 推进） ----
  function flyCardPos(x, drop, push) {
    const zg = 63 - drop;
    return { x: x - D.cardW / 2, yFace: D.beamY - 5.4 - push, z: zg - D.cardH + 2.2 };
  }

  return { knobSvg, wheelWinSvg, numWinSvg, rsArmSvg, swArmSvg, cardSvg, cardBodySvg, cardTextSvg, magStackSvg, trolleySvg, flyCardPos, vtext, faceM };
}

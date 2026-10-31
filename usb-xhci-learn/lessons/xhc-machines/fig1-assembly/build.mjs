// Fig 1 「总装流水线：一颗 URB 的三工位之旅」 —— anatomy Hero 交互机
//
// 概念：长条总装台，三工位 = xHCI 驱动（文书台）· xHC 控制器（总装机）· USB 设备（终端灯箱）。
//  文书台：URB 工作单落进件槽，调用栈牌 4 块自下而上点亮（urb.c:375 → hcd.c:1516 → xhci.c:1620 →
//    xhci-ring.c:3774，行号为 d9008e061539 实勘，见 EVIDENCE.md）。
//  总装机：冲压龙门把每颗 TRB 位域刻度卡逐格打号（DW0/DW1/DW2 一冲、DW3 二冲——§4.11 @p189
//    原子写规则的机器件）；环形轨道 4 槽 + 所有权色带（Cycle bit）+ 双针指示仪（ENQ/DEQ）+
//    弹簧门铃（DB Target=1 EP0）；上下料龙门负责把冲好的夹具放入槽位（F3）与取走已执行托盘（F4）。
//  灯箱：三盏包序灯 SETUP → DATA1(18B) → STATUS；底铭牌刻「环与 TRB 对设备不可见」。
//  细缆连灯箱，回执管沿台后回文书台顶回执栏。
// 零件清单（约 130 实体）：台板+4 脚+标尺条+铭牌；文书台（台身/台面/进件槽/出料唇/栈牌架/4 铭牌/回执栏）；
//  输送道（2 导轨+9 板条+端挡）；压机（2 立柱+横梁+旋钮+压头[动]）；环床（床身/内外轨/4 隔板/4 色带弧/
//  出料托盘）；指示仪（座柱/表盘/刻度）；门铃（座/管/簧/钮[动]/刻牌）；龙门（2 立柱+轨道+滑车/臂/杆/吸盘[动]）；
//  灯箱（基座/塔身/顶盖/帽顶/3 窗/3 灯/长铭牌）；细缆（缆+2 法兰+2 端口座）；回执管（管+2 法兰+2 鞍箍+2 支柱）；
//  3×TD 夹具（基座/双耳/托盘/刻度卡[动]）；URB 工作单[动]；回执小卡[动]。
// 判据：位域值/章节号/行号全部实勘（xHCI 1.2b / USB 2.0 / 内核 d9008e061539），逐条见 EVIDENCE.md。
// 演示样例：控制读 GET_DESCRIPTOR(Config) wLength=18 → 规范口径 3 个 Stage TD（§6.4.1.2 @p429），
//  xhci_queue_ctrl_tx 实码 num_trbs = 2 + (len>0) = 3 颗 TRB（无 Event Data TRB；合同 §2 原列
//  「4 个 TRB」已按 §5 契约修订登记更正为 3）。

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "/Users/jason/.zcode/skills/anatomy/kit/iso-kit.mjs";
import * as G from "/Users/jason/.zcode/skills/anatomy/kit/lathe.mjs";
import * as A from "/Users/jason/.zcode/skills/anatomy/kit/audit.mjs";
import { tubePieces, tubeSvg, crossingsOf } from "/Users/jason/.zcode/skills/anatomy/kit/tube.mjs";
import { kitScript } from "/Users/jason/.zcode/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

const W = 1040;
const H = 680;
const AZIMUTH = 31;
const ELEVATION = 35;

// ---------- 世界布局 ----------
const PLATE = { x: -218, y: -54, w: 436, d: 108, r: 8 };
const PLATE_H = 14;
const FOOT_H = 6;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [-218, -54, 62], [-218, 54, 62], [218, -54, 62], [218, 54, 62],
  ],
  W, H, { pad: 12, azimuth: AZIMUTH, elevation: ELEVATION },
);
const V = k.towardViewer(P);
const KS = G.scaleOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const f2 = (v) => Math.round(v * 100) / 100;
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const deg = (d) => (d * Math.PI) / 180;
const pol = (r, a) => [C[0] + r * Math.cos(deg(a)), C[1] + r * Math.sin(deg(a))];

const R = A.recorder(P);
const record = R.solid;
function put(name, ref, svg, shapes = [], { bias = 0, ...rest } = {}) {
  return R.put({ name, at: ref, bias, svg, shapes, piece: "rig", ...rest });
}
function box(name, [x0, y0, z0], [x1, y1, z1], style = {}, { r = 0.6, steps = 2, bevel = 0, extra = "", inner = "", bias = 0 } = {}) {
  const plan = { x: x0, y: y0, w: x1 - x0, d: y1 - y0, r };
  const shape = record(A.slab(plan, z0, z1 - z0, { name }, steps));
  put(name, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2],
    S(k.slabOf(plan, z0, z1 - z0, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape], { bias });
  return shape;
}
function col(name, cx, cy, r, z0, z1, style = {}, { steps = 20, extra = "", inner = "", bias = 0 } = {}) {
  const shape = record(A.cylinder(cx, cy, r, z0, z1 - z0, { name }));
  put(name, [cx, cy, (z0 + z1) / 2],
    S(k.cylinder(cx, cy, r, z0, z1 - z0, P, steps), { tone: "mid", ...style, inner }) + extra, [shape], { bias });
  return shape;
}
function centreOf(ring) {
  let x = 0, y = 0;
  for (const p of ring) { x += p[0]; y += p[1]; }
  return [x / ring.length, y / ring.length];
}
function extruded(name, ring, z, h, style = {}, { convex = true, extra = "", inner = "", bias = 0 } = {}) {
  const shape = record(A.extruded(ring, z, h, { name }));
  const c = centreOf(ring);
  put(name, [c[0], c[1], z + h / 2],
    S(k.extrude(ring, z, h, P, { convex }), { tone: "mid", ...style, inner }) + extra, [shape], { bias });
  return shape;
}
// 竖直面（法线 +y）文字矩阵
function frontMatrix(o) {
  const p0 = at(o);
  const px = at([o[0] + 1, o[1], o[2]]);
  const py = at([o[0], o[1], o[2] - 1]);
  return `matrix(${f2(px[0] - p0[0])} ${f2(px[1] - p0[1])} ${f2(py[0] - p0[0])} ${f2(py[1] - p0[1])} ${f2(p0[0])} ${f2(p0[1])})`;
}
const frontText = (o, text, { size = 2, tone = "mid", anchor = "middle" } = {}) =>
  k.faceTextSvg(frontMatrix(o), text, { size: size * KS, tone, anchor });
const topText = (o, text, { size = 2, tone = "mid", anchor = "middle" } = {}) =>
  k.faceTextSvg(k.topMatrix(o, o[2], P), text, { size: size * KS, tone, anchor });

// 环几何参数（先于使用定义）
const C = [4, -10];
const RIN = 20.5, ROUT = 34.5;             // 槽道内外半径
const RAIL_T = 2.5;                        // 轨高
const SLOT_ANG = [180, 90, 0, 270];        // 槽 0..3 方位角
const SLOT_R = 27.5;                       // 槽中心半径
const SLOT_POS = SLOT_ANG.map((a) => pol(SLOT_R, a));
const SLOT_TAN = SLOT_ANG.map((a) => a + 90); // 夹具朝向（切向）
const DIV_ANG = [135, 45, 315, 225];       // 隔板方位
function sectorRing(r0, r1, a0, a1, steps = 10) {
  const ring = [];
  for (let i = 0; i <= steps; i++) ring.push(pol(r0, a0 + ((a1 - a0) * i) / steps));
  for (let i = steps; i >= 0; i--) ring.push(pol(r1, a0 + ((a1 - a0) * i) / steps));
  return ring;
}
function radialRect(a, r0, r1, halfW) {
  const ca = Math.cos(deg(a)), sa = Math.sin(deg(a));
  const px = (r, w) => [C[0] + r * ca - w * sa, C[1] + r * sa + w * ca];
  return [px(r0, -halfW), px(r1, -halfW), px(r1, halfW), px(r0, halfW)];
}

// ---------- 基座台板 ----------
const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`);
for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
  back.push(S(k.cylinder(x, y, 8, -PLATE_H - FOOT_H, 2, P, 28), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 6, -PLATE_H - FOOT_H + 2, FOOT_H - 2, P, 28), { tone: "mid" }));
}
back.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: Ln(k.sideSeam(PLATE, -5, P, 8), { tone: "faint" }) }));
back.push(Ln(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
const plateScrews = k.corners(PLATE, 10);
back.push(Ln(plateScrews.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
back.push(Dots(plateScrews.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
record(A.slab(PLATE, -PLATE_H, PLATE_H, { name: "stand.plate", ground: true }, 8));
const STRIP = { x: -198, y: 46, w: 300, d: 6, r: 1 };
back.push(S(k.slabOf(STRIP, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
const stripTicks = k.topTicks(STRIP.x + 4, STRIP.x + STRIP.w - 4, 4, 5, STRIP.y, 0.6, [1.8, 3.4], P);
back.push(Ln(stripTicks.minor, { tone: "lo" }), Ln(stripTicks.major, { tone: "mid" }));
const BLABEL = { x: 148, y: 30, w: 34, d: 14, r: 1.2 };
back.push(S(k.slabOf(BLABEL, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
back.push(Ln(k.planOutline(k.insetPlan(BLABEL, 1.4), 0.8, P, 3), { tone: "faint" }));
back.push(Ln([24, 15, 19].map((w, i) => k.lineOnTop([BLABEL.x + 4, BLABEL.y + 3.2 + i * 3.4], [BLABEL.x + 4 + w, BLABEL.y + 3.2 + i * 3.4], 0.8, P)).join(""), { tone: "lo", free: true }));
back.push(Dots([at([BLABEL.x + BLABEL.w - 2.6, BLABEL.y + 2.6, 0.8]), at([BLABEL.x + BLABEL.w - 2.6, BLABEL.y + BLABEL.d - 2.6, 0.8])], { size: 0.45 }));

// ---------- 工位一：文书台（xHCI 驱动） ----------
const DESK = { x: -206, y: -30, w: 82, d: 60, r: 3 };
const DESK_TOP = 23;
box("desk.body", [DESK.x, DESK.y, 0], [DESK.x + DESK.w, DESK.y + DESK.d, 20], { tone: "mid" }, {
  r: 3, steps: 3, bevel: 0.8,
  inner: Ln(k.sideSeam(DESK, 6, P, 3) + k.sideSeam(DESK, 14, P, 3), { tone: "faint" }),
  extra: Ln(path3([[-198, 30.02, 3], [-198, 30.02, 12], [-172, 30.02, 12], [-172, 30.02, 3], [-198, 30.02, 3]], true), { tone: "lo" }) +
    Ln(path3([[-169, 30.02, 3], [-169, 30.02, 12], [-143, 30.02, 12], [-143, 30.02, 3], [-169, 30.02, 3]], true), { tone: "lo" }) +
    Ln(path3([[-198, 30.04, 7.4], [-172, 30.04, 7.4]]), { tone: "mid" }) +
    Ln(path3([[-169, 30.04, 7.4], [-143, 30.04, 7.4]]), { tone: "mid" }),
});
box("desk.top", [DESK.x - 4, DESK.y - 4, 20], [DESK.x + DESK.w + 4, DESK.y + DESK.d + 4, DESK_TOP], { tone: "hi" }, { r: 3, steps: 3, bevel: 0.5 });
const deskScrews = [[DESK.x, DESK.y], [DESK.x + DESK.w, DESK.y], [DESK.x, DESK.y + DESK.d], [DESK.x + DESK.w, DESK.y + DESK.d]];
put("desk.screws", [DESK.x + DESK.w / 2, DESK.y + DESK.d / 2, DESK_TOP],
  Dots(deskScrews.map(([x, y]) => at([x + 2, y + 2, DESK_TOP])), { size: 0.5, tone: "mid" }),
  deskScrews.map(([x, y]) => record(A.ball([x + 2, y + 2, DESK_TOP], 0.4, { name: "desk.screw" }))), { bias: 0.1 });
// 进件槽：暗色面板 + 刻线框
const SLOT = { x: -180, y: 14, w: 28, d: 18, r: 2 };
box("desk.slot", [SLOT.x, SLOT.y, DESK_TOP], [SLOT.x + SLOT.w, SLOT.y + SLOT.d, DESK_TOP + 0.5], { tone: "lo", crease: "none" }, {
  r: 2, steps: 4,
  extra: Ln(k.planOutline(k.insetPlan(SLOT, 1.2), DESK_TOP + 0.55, P, 4), { tone: "lo" }) +
    Dots([[SLOT.x - 1.2, SLOT.y - 1.2], [SLOT.x + SLOT.w + 1.2, SLOT.y - 1.2], [SLOT.x - 1.2, SLOT.y + SLOT.d + 1.2], [SLOT.x + SLOT.w + 1.2, SLOT.y + SLOT.d + 1.2]].map(([x, y]) => at([x, y, DESK_TOP + 0.5])), { size: 0.4, tone: "mid" }),
});
// 工位铭牌（台面刻牌）
put("desk.label", [-165, 30, 15.5],
  frontText([-165, 30.06, 15.5], "xHCI 驱动", { size: 3.2, tone: "hi" }),
  [record(A.box([-180, 29.9, 13.9], [-150, 30, 17.1], { name: "desk.label" }))], { bias: 0.08 });
// 调用栈牌
const BOARD = { x: -204, y: -28, w: 28, d: 3, r: 1 };
box("stack.board", [BOARD.x, BOARD.y, DESK_TOP], [BOARD.x + BOARD.w, BOARD.y + BOARD.d, 58], { tone: "lo" }, { r: 1, steps: 2 });
const STACK_FUNCS = [
  { fn: "usb_submit_urb", file: "drivers/usb/core/urb.c:375" },
  { fn: "usb_hcd_submit_urb", file: "drivers/usb/core/hcd.c:1516" },
  { fn: "xhci_urb_enqueue", file: "drivers/usb/host/xhci.c:1620" },
  { fn: "xhci_queue_ctrl_tx", file: "drivers/usb/host/xhci-ring.c:3774" },
];
STACK_FUNCS.forEach((sf, i) => {
  const z0 = 25.5 + i * 8.0;
  const plan = { x: BOARD.x, y: BOARD.y + BOARD.d, w: 26, d: 1.4, r: 0.5 };
  const st = record(A.slab(plan, z0, 7.2, { name: `stack.plaque` }));
  const dir = sf.file.replace(/\/[^/]+$/, "/");
  const base = sf.file.split("/").pop();
  put(`stack.plaque${i}`, [BOARD.x + 13, BOARD.y + BOARD.d, z0 + 3.6],
    `<g class="ac-plaque" data-plaque="${i}">` +
    S(k.slabOf(plan, z0, 7.2, P, 2, 0.3), { tone: "hi", crease: "lo" }) +
    k.faceTextSvg(frontMatrix([BOARD.x + 1.6, BOARD.y + BOARD.d + 1.42, z0 + 5.4]), sf.fn, { size: 2.5 * KS, tone: "hi", anchor: "start" }) +
    k.faceTextSvg(frontMatrix([BOARD.x + 1.6, BOARD.y + BOARD.d + 1.42, z0 + 3.1]), dir, { size: 1.6 * KS, tone: "mid", anchor: "start" }) +
    k.faceTextSvg(frontMatrix([BOARD.x + 1.6, BOARD.y + BOARD.d + 1.42, z0 + 1.2]), base, { size: 1.9 * KS, tone: "mid", anchor: "start" }) +
    `</g>`, [st], { bias: 0.3 });
});
// 回执栏
box("rack.tray", [-146, 2, DESK_TOP], [-124, 18, DESK_TOP + 3.4], { tone: "hi" }, { r: 1.4, steps: 3, bevel: 0.4 });
box("rack.lip", [-124, 1, DESK_TOP], [-122.5, 19, DESK_TOP + 5.6], { tone: "mid" }, { r: 0.8 });

// ---------- 输送道（台前 y 34..42） ----------
const CONV_Y0 = 34, CONV_Y1 = 42;
box("conv.rail.s", [-204, CONV_Y0, 0], [-42, CONV_Y0 + 2.5, 3.2], { tone: "mid" }, { r: 1 });
box("conv.rail.n", [-204, CONV_Y1 - 2.5, 0], [-42, CONV_Y1, 3.2], { tone: "mid" }, { r: 1 });
box("conv.stop.w", [-205.4, CONV_Y0 - 0.5, 0], [-203.8, CONV_Y1 + 0.5, 4.5], { tone: "mid" }, { r: 1, bevel: 0.4 });
for (let i = 0; i < 13; i++) {
  const x = -198 + i * 12;
  box("conv.slat", [x, CONV_Y0 + 2.5, 0], [x + 6, CONV_Y1 - 2.5, 1], { tone: "lo" }, { r: 0.4, steps: 1 });
}

// ---------- 冲压龙门（跨输送道） ----------
col("press.col.s", -74, 28.5, 3, 0, 42);
col("press.col.n", -74, 47.5, 3, 0, 42);
box("press.beam", [-96, 26, 42], [-52, 50, 47.5], { tone: "mid" }, { r: 2, bevel: 0.6, extra: Ln(k.sideSeam({ x: -96, y: 26, w: 44, d: 24, r: 2 }, 44.5, P, 2), { tone: "faint" }) });
{
  const F = { o: [-58, 26, 44.8], a: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] };
  const shape = record(A.disc(F, 0, 1.6, 1.8, { name: "press.knob" }));
  put("press.knob", [-58, 25.2, 44.8],
    S(G.disc(0, 1.6, 1.8, F, P, { steps: 20 }), { tone: "hi" }) +
    Ln(k.knurl(-58, 24.6, 1.8, 43.4, 46.2, 14, P), { tone: "lo" }), [shape], { bias: 0.2 });
}

// ---------- 总装机环床 ----------
const BED = { x: -40, y: -50, w: 88, d: 80, r: 6 };
box("ring.bed", [BED.x, BED.y, 0], [BED.x + BED.w, BED.y + BED.d, 7], { tone: "lo" }, { r: 6, steps: 4, bevel: 1, inner: Ln(k.sideSeam(BED, 3, P, 4), { tone: "faint" }) });
const bedScrews = k.corners(BED, 8);
put("bed.screws", [C[0], C[1], 7], Dots(bedScrews.map(([x, y]) => at([x, y, 7])), { size: 0.5, tone: "mid" }),
  bedScrews.map(([x, y]) => record(A.ball([x, y, 7], 0.4, { name: "bed.screw" }))), { bias: 0.1 });
// 内外轨各拆两个半弧件（单件环 vs 4 隔板会深度互锁；接缝落在东/西两点）
[[-90, 90], [90, 270]].forEach(([a0, a1], h) => {
  extruded(`ring.rail.inner${h}`, sectorRing(18, RIN, a0, a1, 24), 7, RAIL_T, { tone: "hi" }, { convex: false });
  extruded(`ring.rail.outer${h}`, sectorRing(ROUT, 37, a0, a1, 24), 7, RAIL_T, { tone: "hi" }, { convex: false });
});
// 槽道刻度：槽中心刻线（r 21.5..33.5，4 根）+ 槽号刻字
{
  const ticks = SLOT_ANG.map((a) => {
    const c = Math.cos(deg(a)), s = Math.sin(deg(a));
    const p = (r) => [C[0] + r * c, C[1] + r * s];
    return k.lineOnTop(p(20.7), p(34.3), 7.02, P);
  }).join("");
  const labels = SLOT_ANG.map((a, i) =>
    topText([...pol(30.8, a), 7.02], String(i), { size: 3.2, tone: "mid" })).join("");
  put("ring.slotmarks", [C[0], C[1], 7], Ln(ticks, { tone: "lo" }) + labels,
    [record(A.box([C[0] - 34, C[1] - 34, 7], [C[0] + 34, C[1] + 34, 7.04], { name: "ring.slotmarks" }))], { bias: 0.06 });
}
// 槽位隔板（4 根，槽界处）
DIV_ANG.forEach((a) => extruded("ring.divider", radialRect(a, 22.5, 33.7, 0.8), 7, 2.0, { tone: "mid" }, { extra: Dots([[0, -0.3], [0, 0.3]].map(([w]) => {
  const ca = Math.cos(deg(a)), sa = Math.sin(deg(a));
  return at([C[0] + 27.5 * ca - w * sa, C[1] + 27.5 * sa + w * ca, 9.02]);
}), { size: 0.4, tone: "hi" }) }));
// 所有权色带（外轨顶 4 段弧，Cycle bit 的机器件）
SLOT_ANG.forEach((a, i) => {
  const ring = sectorRing(35.2, 36.4, a + 9, a + 81, 12);
  const st = record(A.extruded(ring, 9.5, 0.8, { name: `ring.band` }));
  put(`ring.band${i}`, [...centreOf(ring), 9.9],
    `<g class="ac-band" data-band="${i}">` + S(k.extrude(ring, 9.5, 0.8, P, { convex: false }), { tone: "mid" }) + `</g>`, [st], { bias: 0.12 });
});
// 出料托盘（台面东端）
box("out.pallet", [49, -16, 0], [59, -4, 2.5], { tone: "mid" }, { r: 1.2, bevel: 0.4, extra: Ln(k.planOutline(k.insetPlan({ x: 49, y: -16, w: 10, d: 12, r: 1.2 }, 1), 2.5, P, 3), { tone: "faint" }) });
box("out.lip", [47.5, -17, 0], [49, -3, 4.2], { tone: "lo" }, { r: 0.8 });
// 出料托盘刻牌
box("out.label", [50.5, -2.2, 0], [58, 2.2, 0.8], { tone: "lo", crease: "none" }, {
  r: 0.6, steps: 2,
  extra: topText([54.2, 0.4, 0.82], "已执行", { size: 2.4, tone: "mid" }),
});

// ---------- 双针指示仪（ENQ/DEQ 指针牌） ----------
col("dial.foot", -47, -10, 4.5, 0, 1.4, { tone: "lo" }, { steps: 28 });
col("dial.post", -47, -10, 3, 1.4, 14);
{
  const F = { o: [-47, -10, 14], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] };
  const shape = record(A.disc(F, 0, 5, 6.5, { name: "dial.puck" }));
  put("dial.puck", [-47, -10, 16.5],
    S(k.cylinder(-47, -10, 6.5, 14, 5, P, 48, 0.8), { tone: "hi" }) +
    Ln(k.knurl(-47, -10, 6.5, 16.6, 19, 64, P, 0.3), { tone: "lo" }) +
    Ln(k.sideArc(-47, -10, 6.5, 16.6, P, 40), { tone: "faint" }), [shape], { bias: 0.15 });
}
{
  const z = 19;
  const bezel = k.ring(-47, -10, 5.4, z, P, 48);
  const t = Array.from({ length: 4 }, (_, i) => {
    const a = deg(SLOT_ANG[i]);
    const p0 = [-47 + 3.6 * Math.cos(a), -10 + 3.6 * Math.sin(a)];
    const p1 = [-47 + 5.2 * Math.cos(a), -10 + 5.2 * Math.sin(a)];
    return k.lineOnTop(p0, p1, z, P);
  }).join("");
  const labels = SLOT_ANG.map((a, i) => {
    const r = 2.9;
    return topText([-47 + r * Math.cos(deg(a)), -10 + r * Math.sin(deg(a)), z], String(i), { size: 2.4, tone: "mid" });
  }).join("");
  put("dial.face", [-47, -10, z], Ln(bezel + t, { tone: "lo" }) + labels +
    Ln(k.ring(-47, -10, 1.1, z, P, 16), { tone: "mid" }) +
    topText([-47, -13.6, z], "ENQ", { size: 2.0, tone: "mid" }) +
    topText([-47, -6.4, z], "DEQ", { size: 2.0, tone: "mid" }),
    [record(A.disc({ o: [-47, -10, 14], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] }, 4.9, 5.05, 6.1, { name: "dial.face" }))], { bias: 0.2 });
}

// ---------- 门铃（弹簧钮 + 刻牌） ----------
box("bell.base", [40, 2, 7], [47, 10, 12], { tone: "mid" }, { r: 1.4, steps: 3, bevel: 0.4 });
box("bell.plate", [26, 20, 7], [47, 26, 7.8], { tone: "lo", crease: "none" }, { r: 0.8, steps: 2 });
put("bell.engrave", [32, 30, 3.2],
  frontText([32, 30.06, 3.9], "门铃 Doorbell · DB Target=1 (EP0)", { size: 2.1, tone: "hi" }),
  [record(A.box([17, 29.9, 1.4], [47, 30, 4.6], { name: "bell.engrave" }))], { bias: 0.08 });
// 床身前缘刻度（东段）
const bedTicks = k.sideTicks(8, 44, 2, 5, 30, 7, [1.2, 2.2], P, "x");
put("bed.faceticks", [26, 30, 6],
  Ln(bedTicks.minor, { tone: "lo" }) + Ln(bedTicks.major, { tone: "mid" }),
  [record(A.box([8, 29.9, 4.6], [44, 30, 7], { name: "bed.faceticks" }))], { bias: 0.08 });
// 门铃簧（线材，动件压缩）与钮（动件）在 live 重绘，静置参数入 DATA
// 环床工位铭牌（南缘西段）
box("bed.label", [-39, 22, 7], [-15, 28, 8], { tone: "lo", crease: "none" }, {
  r: 1, steps: 2,
  extra: Ln(k.planOutline(k.insetPlan({ x: -39, y: 22, w: 24, d: 6, r: 1 }, 1.2), 8, P, 2), { tone: "faint" }) +
    topText([-27, 25.6, 8.02], "xHC 控制器", { size: 3.4, tone: "hi" }),
});

// ---------- 上下料龙门（轨道静，滑车/臂/杆/吸盘动） ----------
col("gantry.col.w", -38, 14, 2.5, 7, 26);
col("gantry.col.e", 46, 14, 2.5, 7, 26);
box("gantry.rail", [-44, 12, 26], [60, 16, 30], { tone: "mid" }, { r: 1.2, bevel: 0.4, extra: Dots([[-40, 14], [42, 14]].map(([x, y]) => at([x, y, 30])), { size: 0.45, tone: "hi" }) });
// 端挡（搭接轨道端头）
box("gantry.stop.w", [-45.4, 12, 26], [-43.6, 16, 31], { tone: "lo" }, { r: 0.6 });
box("gantry.stop.e", [59.6, 12, 26], [61.4, 16, 31], { tone: "lo" }, { r: 0.6 });

// ---------- 终端灯箱（USB 设备） ----------
box("box.plinth", [106, -20, 0], [198, 26, 6], { tone: "lo" }, { r: 3, steps: 3, bevel: 0.6 });
box("box.tower", [114, -14, 6], [190, 20, 38], { tone: "mid" }, {
  r: 3, steps: 3, bevel: 0.8,
  inner: Ln(k.sideSeam({ x: 114, y: -14, w: 76, d: 34, r: 3 }, 10, P, 3) + k.sideSeam({ x: 114, y: -14, w: 76, d: 34, r: 3 }, 32, P, 3), { tone: "faint" }),
  extra: Ln(path3([[119, 20.02, 31.5], [185, 20.02, 31.5]]), { tone: "lo", free: true }) +
    Ln(path3([[119, 20.02, 9.5], [185, 20.02, 9.5]]), { tone: "lo", free: true }) +
    Dots([[121, 20.02, 33.5], [183, 20.02, 33.5], [121, 20.02, 8], [183, 20.02, 8]].map((p3) => at(p3)), { size: 0.4, tone: "mid" }),
});
box("box.roof", [110, -18, 38], [194, 24, 42], { tone: "mid" }, { r: 3, steps: 3, bevel: 0.6 });
col("box.cap", 152, 3, 3.5, 42, 45.5, { tone: "hi" }, { steps: 24 });
const LAMPS = [
  { x0: 126, x1: 138, label: "SETUP" },
  { x0: 142, x1: 154, label: "DATA1 · 18B" },
  { x0: 158, x1: 170, label: "STATUS" },
];
LAMPS.forEach((lp, i) => {
  const z0 = 13, z1 = 29;
  const face = 20;
  const quad = [[lp.x0, face, z0], [lp.x1, face, z0], [lp.x1, face, z1], [lp.x0, face, z1]];
  const recess = quad.map(([x, y, zz]) => [x, y - 1.6, zz]);
  const walls = [];
  for (const [a, b] of [[0, 1], [2, 3]]) {
    const A2 = quad[a], B2 = quad[b];
    const normal = a === 0 ? [0, 1, 0] : [0, -1, 0];
    walls.push({ tone: G.toneOf(normal, P), d: path3([A2, B2, [B2[0], B2[1] - 1.6, B2[2]], [A2[0], A2[1] - 1.6, A2[2]]], true) });
  }
  const topWall = { tone: G.toneOf([0, 0, 1], P), d: path3([quad[3], quad[2], [quad[2][0], quad[2][1] - 1.6, quad[2][2]], [quad[3][0], quad[3][1] - 1.6, quad[3][2]]], true) };
  put(`box.lamp${i}`, [(lp.x0 + lp.x1) / 2, face, (z0 + z1) / 2],
    walls.map((w) => `<path class="iso-shade" data-shade="${w.tone === 4 ? 3 : w.tone}" d="${w.d}"/>`).join("") +
    `<path class="iso-shade" data-shade="${topWall.tone === 4 ? 3 : topWall.tone}" d="${topWall.d}"/>` +
    `<path class="ac-void" d="${path3(recess, true)}"/>` +
    `<g class="ac-lamp" data-lamp="${i}"><path class="ac-bulb" d="${path3([[lp.x0 + 2.2, face - 1.85, z0 + 5], [lp.x1 - 2.2, face - 1.85, z0 + 5], [lp.x1 - 2.2, face - 1.85, z0 + 12], [lp.x0 + 2.2, face - 1.85, z0 + 12]], true)}"/></g>` +
    Ln(path3(quad, true), { tone: "lo" }) +
    k.faceTextSvg(frontMatrix([(lp.x0 + lp.x1) / 2, face + 0.05, z0 - 3.0]), lp.label, { size: 2.2 * KS, tone: "hi" }),
    [record(A.box([lp.x0, face - 0.1, z0], [lp.x1, face, z1], { name: `box.lamp` }))], { bias: 10 });
});
// 灯箱铭牌（塔面）+ 长铭牌（基座面）
box("box.devlabel", [134, 20, 32], [170, 21, 36], { tone: "lo", crease: "none" }, {
  r: 0.4, steps: 1,
  extra: frontText([152, 21.06, 34.4], "USB 设备", { size: 4.0, tone: "hi" }),
});
box("box.nameplate", [118, 26, 1.4], [186, 27.2, 4.8], { tone: "lo", crease: "none" }, {
  r: 0.6, steps: 2,
  extra: frontText([152, 27.26, 3.6], "环与 TRB 对设备不可见 —— 设备只见令牌/数据/握手包", { size: 2.4, tone: "hi" }),
});

// ---------- 缆线与回执管 ----------
function cable(name, points, r, { tone = "mid", bend = 4, rims = [r, r], gaps = [], maxLength = 14, rings } = {}) {
  const route = G.fillet(points, Math.max(bend, r * 2.6), 10, { P, tube: r });
  R.route(name, route, r, { gaps, rims, limp: true, piece: "rig" });
  tubePieces(route, r, P, { maxLength, spacing: 1, gaps, ...(rings ? { rings } : {}) }).forEach((piece, index) =>
    put(`${name}:${index}`, piece.mid, tubeSvg(piece, { tone }), [A.tube(piece.points, piece.radii)], { bias: 0.05, attrs: ` data-route="${name}"` }));
  return route;
}
// 细缆：环床东面端口座 → 灯箱西面端口座（缆端落在座端面）
{
  const F1 = { o: [48, -4, 8], a: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] };
  const boss1 = record(A.disc(F1, 0, 3.5, 2.2, { name: "cableport.mach" }));
  put("cableport.mach", [49.75, -4, 8], S(G.disc(0, 3.5, 2.2, F1, P, { steps: 20 }), { tone: "mid" }) +
    Ln(k.ring(51.5, -4, 1.5, 8.01, P, 20), { tone: "faint" }), [boss1], { bias: 0.1 });
  const F2 = { o: [114, 0, 19], a: [-1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] };
  const boss2 = record(A.disc(F2, 0, 3.5, 2.2, { name: "cableport.box" }));
  put("cableport.box", [112.25, 0, 19], S(G.disc(0, 3.5, 2.2, F2, P, { steps: 20 }), { tone: "mid" }) +
    Ln(k.ring(110.5, 0, 1.5, 19.01, P, 20), { tone: "faint" }), [boss2], { bias: 0.1 });
  cable("cable.bus", [[51.5, -4, 8], [58, -4, 8.4], [68, -6, 10], [84, -4, 13], [98, -2, 16], [103, 0, 19], [110.5, 0, 19]], 0.7,
    { rims: [2.2, 2.2], rings: { pitch: 2.2, twist: 0, fade: [0.1, 0.55] } });
}
// 回执管：环床后 → 台后 → 文书台回执栏
col("tube.stub", 18, -48, 1.6, 7, 12);
const RECEIPT_ROUTE = G.fillet([[18, -48, 12], [18, -48, 15.5], [18, -53, 24], [18, -53, 44], [-136, -53, 44], [-136, -40, 39], [-136, 4, 33], [-136, 10, 29.6], [-136, 10, 26.4]], 5, 10, { P, tube: 0.9 });
{
  const total = G.pathLength(RECEIPT_ROUTE);
  const clamps = [[-62, -53, 42.6], [2, -53, 42.6]];
  col("tube.pylon0", -62, -53, 1.2, 0, 42.6);
  col("tube.pylon1", 2, -53, 1.2, 0, 42.6);
  const gaps = [];
  clamps.forEach((cl, i) => {
    const st = record(A.box([cl[0] - 2.8, -54, cl[2]], [cl[0] - 1.0, -52, cl[2] + 1.6], { name: `tube.clamp${i}`, owner: "tube.receipt" }));
    put(`tube.clamp${i}`, [cl[0] - 1.9, -53, cl[2] + 0.8],
      S(k.slabOf({ x: cl[0] - 2.8, y: -54, w: 1.8, d: 2, r: 0.4 }, cl[2], 1.6, P, 2, 0.3), { tone: "mid" }) +
      Ln(k.sideSeam({ x: cl[0] - 2.8, y: -54, w: 1.8, d: 2, r: 0.4 }, cl[2] + 1.1, P, 2), { tone: "faint" }), [st], { bias: 0.1 });
  });
  const endF = { o: [-136, 10, 26.4], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] };
  const fl1 = record(A.disc(endF, 0, 1.2, 1.7, { name: "tube.flange1", owner: "tube.receipt" }));
  put("tube.flange1", [-136, 10, 27], S(G.disc(0, 1.2, 1.7, endF, P, { steps: 24, bevel: 0.3 }), { tone: "hi" }), [fl1], { bias: 0.12 });
  R.route("tube.receipt", RECEIPT_ROUTE, 0.9, { gaps: [...gaps, [total - 1.2, total]], rims: [1.6, 1.7], limp: true, piece: "rig" });
  tubePieces(RECEIPT_ROUTE, 0.9, P, { maxLength: 18, spacing: 1, gaps: [...gaps, [total - 1.2, total]] }).forEach((piece, index) =>
    put(`tube.receipt:${index}`, piece.mid, tubeSvg(piece, { tone: "mid" }), [A.tube(piece.points, piece.radii)], { bias: 0.05, attrs: ` data-route="tube.receipt"` }));
}

// ---------- 位域刻度卡（预建于本地平面系，live 以矩阵安放） ----------
const CELL_W = 0.9;
const T_U0 = -13.5;               // 32 格刻度起点
const ROW_V = [3.0, 1.0, -1.0, -3.0];  // DW0..DW3
function cellU(b) { return T_U0 + b * CELL_W; }
function cardBase(defs) {
  // defs: { header, foot, bytes:[[..4],[..4]]|null, dw2:{len, tdsize, lenV, tdV}, dw3:[{b0,b1,cls,v}...], cyc:"0"|"1"|"none" }
  const parts = [];
  const line = (u0, v0, u1, v1, tone = "lo") =>
    Ln(k.lineOnTop([u0, v0, 0], [u1, v1, 0], 0, P), { tone });
  // 行基线 + 刻度
  ROW_V.forEach((v, r) => {
    parts.push(line(T_U0, v, T_U0 + 32 * CELL_W, v, "lo"));
    for (let b = 0; b <= 32; b++) {
      const major = b % 8 === 0;
      const h = major ? 0.9 : 0.55;
      parts.push(line(cellU(b), v, cellU(b), v + h, major ? "mid" : "lo"));
    }
    if (r === 0 || r === 3)
      parts.push(`<text class="ac-cardtext" data-tone="mid" x="${f2(at([T_U0 - 2.9, v, 0])[0])}" y="${f2(at([T_U0 - 2.9, v, 0])[1] + 0.5 * KS)}" font-size="${f2(1.6 * KS)}" text-anchor="middle">DW${r}</text>`);
  });
  // 字节刻字：DW0 行上方主刻度处标最高位位号（31/23/15/7），字节边界即主刻度
  ["31", "23", "15", "7"].forEach((t, i) => {
    const u = cellU(i * 8);
    parts.push(`<text class="ac-cardtext" data-tone="lo" x="${f2(at([u + 0.15, 4.15, 0])[0])}" y="${f2(at([u + 0.15, 4.15, 0])[1] + 0.4 * KS)}" font-size="${f2(1.7 * KS)}" text-anchor="middle">${t}</text>`);
  });
  // 底行：DW0/DW1 内容摘要（setup=线上字节序；data=DMA；status=零）
  if (defs.header) parts.push(`<text class="ac-cardtext" data-tone="hi" x="${f2(at([2, -4.9, 0])[0])}" y="${f2(at([2, -4.9, 0])[1])}" font-size="${f2(2.0 * KS)}" text-anchor="middle">${defs.header}</text>`);
  // DW2 长度带
  const dw2v = ROW_V[2];
  if (defs.dw2) {
    const u0 = cellU(defs.dw2.len[0]), u1 = cellU(defs.dw2.len[1] + 1);
    parts.push(`<path class="ac-cell" data-c="on" d="${k.pathOf([[u0, dw2v - 0.8], [u1, dw2v - 0.8], [u1, dw2v + 0.8], [u0, dw2v + 0.8]].map((p) => at(p)), true)}"/>`);
    parts.push(`<text class="ac-cardtext" data-tone="hi" x="${f2(at([(u0 + u1) / 2, dw2v + 0.15, 0])[0])}" y="${f2(at([(u0 + u1) / 2, dw2v + 0.15, 0])[1] + 0.45 * KS)}" font-size="${f2(1.9 * KS)}" text-anchor="middle">${defs.dw2.lenV}</text>`);
    if (defs.dw2.tdsize) {
      const t0 = cellU(defs.dw2.tdsize[0]), t1 = cellU(defs.dw2.tdsize[1] + 1);
      parts.push(`<path class="ac-cell" data-c="off" d="${k.pathOf([[t0, dw2v - 0.8], [t1, dw2v - 0.8], [t1, dw2v + 0.8], [t0, dw2v + 0.8]].map((p) => at(p)), true)}"/>`);
      parts.push(`<text class="ac-cardtext" data-tone="mid" x="${f2(at([(t0 + t1) / 2, dw2v + 0.15, 0])[0])}" y="${f2(at([(t0 + t1) / 2, dw2v + 0.15, 0])[1] + 0.45 * KS)}" font-size="${f2(1.9 * KS)}" text-anchor="middle">${defs.dw2.tdV}</text>`);
    }
  }
  // DW3 位格
  const dw3v = ROW_V[3];
  (defs.dw3 || []).forEach((c0) => {
    const u0 = cellU(c0.b0), u1 = cellU(c0.b1 + 1);
    parts.push(`<path class="ac-cell" data-c="${c0.cls}" d="${k.pathOf([[u0, dw3v - 0.8], [u1, dw3v - 0.8], [u1, dw3v + 0.8], [u0, dw3v + 0.8]].map((p) => at(p)), true)}"/>`);
    if (c0.v) parts.push(`<text class="ac-cardtext" data-tone="hi" x="${f2(at([(u0 + u1) / 2, dw3v + 0.15, 0])[0])}" y="${f2(at([(u0 + u1) / 2, dw3v + 0.15, 0])[1] + 0.45 * KS)}" font-size="${f2(1.9 * KS)}" text-anchor="middle">${c0.v}</text>`);
  });
  if (defs.cyc === "1" || defs.cyc === "0") {
    const u0 = cellU(0), u1 = cellU(1);
    parts.push(`<path class="ac-cell" data-c="cyc" data-on="${defs.cyc}" d="${k.pathOf([[u0, dw3v - 0.8], [u1, dw3v - 0.8], [u1, dw3v + 0.8], [u0, dw3v + 0.8]].map((p) => at(p)), true)}"/>`);
    parts.push(`<text class="ac-cardtext" data-tone="hi" x="${f2(at([(u0 + u1) / 2, dw3v + 0.15, 0])[0])}" y="${f2(at([(u0 + u1) / 2, dw3v + 0.15, 0])[1] + 0.45 * KS)}" font-size="${f2(1.9 * KS)}" text-anchor="middle">${defs.cyc}</text>`);
  }
  return parts.join("");
}
// 三张卡：各冲压阶段的预建变体（s0 空卡 / s1 一冲 DW0-DW2 / s2 二冲 DW3 / setup 专有 s3 Cycle 发布）
const SETUP_DW3 = [
  { b0: 6, b1: 6, cls: "on", v: "1" },      // IDT=1
  { b0: 10, b1: 15, cls: "on", v: "2" },    // Type=2
  { b0: 16, b1: 17, cls: "on", v: "3" },    // TRT=3 (IN)
];
const DATA_DW3 = [
  { b0: 2, b1: 2, cls: "on", v: "1" },      // ISP=1
  { b0: 10, b1: 15, cls: "on", v: "3" },    // Type=3
  { b0: 16, b1: 16, cls: "on", v: "1" },    // DIR=IN
];
const STATUS_DW3 = [
  { b0: 5, b1: 5, cls: "on", v: "1" },      // IOC=1
  { b0: 10, b1: 15, cls: "on", v: "4" },    // Type=4
  { b0: 16, b1: 16, cls: "off", v: "0" },   // DIR=OUT
];
const CARD_DEFS = {
  setup: {
    header: "80 06 00 02 00 00 12 00",
    dw2: { len: [0, 16], lenV: "LEN 8" },
    stages: {
      s1: cardBase({ header: "80 06 00 02 00 00 12 00", dw2: { len: [0, 16], lenV: "LEN 8" } }),
      s2: cardBase({ header: "80 06 00 02 00 00 12 00", dw2: { len: [0, 16], lenV: "LEN 8" }, dw3: SETUP_DW3, cyc: "0", foot: null }),
      s3: cardBase({ header: "80 06 00 02 00 00 12 00", dw2: { len: [0, 16], lenV: "LEN 8" }, dw3: SETUP_DW3, cyc: "1", foot: null }),
    },
  },
  data: {
    header: "→ 18B 缓冲 DMA 地址",
    dw2: { len: [0, 16], lenV: "LEN 18", tdsize: [17, 21], tdV: "TD 0" },
    stages: {
      s1: cardBase({ header: "→ 18B 缓冲 DMA 地址", dw2: { len: [0, 16], lenV: "LEN 18", tdsize: [17, 21], tdV: "TD 0" } }),
      s2: cardBase({ header: "→ 18B 缓冲 DMA 地址", dw2: { len: [0, 16], lenV: "LEN 18", tdsize: [17, 21], tdV: "TD 0" }, dw3: DATA_DW3, cyc: "1", foot: null }),
    },
  },
  status: {
    header: "0 · 0",
    dw2: { len: [0, 16], lenV: "LEN 0" },
    stages: {
      s1: cardBase({ header: "0 · 0", dw2: { len: [0, 16], lenV: "LEN 0" } }),
      s2: cardBase({ header: "0 · 0", dw2: { len: [0, 16], lenV: "LEN 0" }, dw3: STATUS_DW3, cyc: "1", foot: null }),
    },
  },
};
// s0 空卡三张共用
const CARD_BLANK = cardBase({});
// data/status 的 Cycle 在 s2 已是 1：入环发布（s3）与 s2 同版
const CARD_GROUPS = {
  setup: { s0: CARD_BLANK, ...CARD_DEFS.setup.stages },
  data: { s0: CARD_BLANK, ...CARD_DEFS.data.stages, s3: CARD_DEFS.data.stages.s2 },
  status: { s0: CARD_BLANK, ...CARD_DEFS.status.stages, s3: CARD_DEFS.status.stages.s2 },
};

// URB 工作单（竖插进件槽的立卡：内容画在竖直面，行距不受俯视压缩）
const URB_CARD = (() => {
  const t = (z, str, size, tone) =>
    k.faceTextSvg(frontMatrix([-166, 30.6, z]), str, { size: size * KS, tone, anchor: "middle" });
  return t(38.2, "URB 工作单", 3.0, "hi") +
    t(34.6, "GET_DESCRIPTOR", 2.0, "hi") +
    t(31.2, "Config · wLength=18", 1.6, "hi") +
    t(28.2, "usb_submit_urb", 2.0, "hi");
})();

// ---------- settle / 排序 ----------
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);

// 动件层的插入位：在 press.col.n（输送道北立柱）之前——夹具过道要被北立柱/前弧轨压住
const colNIndex = R.items.findIndex((it) => it.name === "press.col.n");
const groups = R.items.map((item) => `<g class="it" data-name="${item.name}"${item.attrs ?? ""}>${item.svg}</g>`);
groups.splice(colNIndex, 0, `<g data-part="fixtures"></g>`);

// ---------- 页面组装 ----------
const fixturePlans = {
  base: { x: -20, y: -6, w: 40, d: 12, r: 2 },
  earN: { x: -13, y: 5, w: 26, d: 2, r: 0.6 },
  earS: { x: -13, y: -7, w: 26, d: 2, r: 0.6 },
  tray: { x: -19.5, y: -5.2, w: 39, d: 10.4, r: 1.4 },
  card: { x: -19, y: -6, w: 38, d: 12, r: 1.2 },
  cardZ: [4.5, 5.3],
};
// 夹具随卡角度安放的仿射基（局部平面 → 屏幕系）
const ORIG = at([0, 0, 0]);
const BX = [at([1, 0, 0])[0] - ORIG[0], at([1, 0, 0])[1] - ORIG[1]];
const BY = [at([0, 1, 0])[0] - ORIG[0], at([0, 1, 0])[1] - ORIG[1]];
const BZ = [at([0, 0, 1])[0] - ORIG[0], at([0, 0, 1])[1] - ORIG[1]];

const DATA = {
  P, KS, ORIG, BX, BY, BZ,
  fixturePlans,
  cards: CARD_GROUPS,
  urbCard: URB_CARD,
  slots: SLOT_POS.map((p, i) => ({ x: p[0], y: p[1], ang: SLOT_TAN[i] })),
  dial: { c: [-47, -10], z: 19.05, slotAng: SLOT_ANG },
  press: { head: { x0: -94, x1: -54, y0: 32, y1: 44, r: 2 }, restZ: 36, stampZ: 8.6, stop: [-74, 38] },
  bell: { c: [43.5, 6], baseTop: 12, capR: 2.4, capH: 1.8, restCap: 14.2, pressCap: 13.4 },
  gantry: { railY: 14, railZ: 26, armZ: 24, carriage: { hw: 5, hd: 2 }, padR: 3.2 },
  receipt: { route: RECEIPT_ROUTE.map((p) => p.map(f2)) },
  slotsZ: 7, convZ: 3.2, palletZ: 2.5, palletPos: [54, -10],
  fixtureRest: [[-110, 38], [-152, 38], [-194, 38]],
  stampStop: [-74, 38], stampQueue: [-48, -60, -74],
  urbSlot: [-166, 15, DESK_TOP + 0.55],
};

const CSS = readFileSync(join(HERE, "fig1.css"), "utf8");
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));

const svg = k.figureSvg({
  width: W,
  height: H,
  label: "总装流水线：一座三工位机器演示 xHCI 驱动把一颗 URB 装配成三颗 TRB（Setup/Data/Status）放入传输环并敲门铃，xHC 逐槽取件，USB 设备只见包序灯。空格步进，数字键直选帧。",
  body: [...back, `<g class="ac-rig">${groups.join("")}</g>`, `<g data-part="actors-head"></g><g data-part="actors-bell"></g><g data-part="actors-dial"></g><g data-part="actors-gantry"></g><g data-part="actors-cards"></g>`],
});

const body =
  `<style>${CSS}</style>` +
  k.plateHtml({
    fig: "Fig 1",
    title: "总装流水线 · 一颗 URB 的三工位之旅",
    hint: "空格/→ 步进 · ← 回退 · 0-5 直选帧 · 自动巡游",
    readout: "TD 装配 0/3 · 门铃 0 · 包序 0/3",
    keys: [
      { mark: "lit", label: "当前动作部件（压头/夹具/龙门/门铃/回执）" },
      { mark: "raised", label: "TD 夹具与 TRB 托盘：软件冲压产物，黄铜色" },
      { mark: "edge", label: "所有权色带与 Cycle 格：蓝=本轮 C=1（xHC 可取）" },
      { mark: "dim", label: "双针指示仪：亮针 ENQ · 暗针 DEQ（0/1/2/3 槽位）" },
    ],
    caption: "一颗 URB 被拆成 TD 夹具上的 TRB 托盘：软件冲压，硬件取件，设备只见包。（GET_DESCRIPTOR(Config) wLength=18 → Setup TD + Data TD + Status TD；门铃 DB Target=1 即 EP0；包序 SETUP→DATA1→STATUS 只出现在灯箱。）",
    body: `<div class="iso-stage ac-stage" tabindex="0" role="group" aria-label="总装流水线动画：空格或右箭头步进一帧，左箭头回退，数字 0 到 5 直选帧。">${svg}<span class="ac-sr" role="status" aria-live="polite" data-status></span></div>`,
  });

const page = k.pageHtml({ title: "Fig 1 · 总装流水线", theme: THEME, body, script: kitScript() + LIVE, width: 1060 });
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} items`, `scale ${KS.toFixed(3)}`);

A.auditOrExit(R, P, {});

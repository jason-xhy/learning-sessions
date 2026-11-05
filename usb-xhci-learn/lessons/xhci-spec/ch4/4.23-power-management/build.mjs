// §4.23 电源管理 —— anatomy 机器「电源井配电台」+ 静态泳道总览卡 + 表格卡
// 判据：xHCI 1.2b §4.23 p310–326（断言逐条见 EVIDENCE.md）；Appendix A p557–558；
//   §4.24 起于 p327（现场核）。
// 概念一句话：台顶两口井柜供着 xHC——Core 井闸刀一拉，寄存器面板熄灭回默认、
//   D 态转筒走 D3hot→D3cold，Aux 井灯不灭（PME 唤醒上下文活过断电）；
//   软件侧三份镜像（寄存器十组/xHC 内部态/内存镜像）进镜像柜，
//   CSS/CRS 双旗只在停机态可推；唤醒回 D0 后寄存器先写回、Restore 后执行，
//   写 CRCR 合闸 R/S='1' 复跑；链路浅低功耗（U1/U2·MEL）是运行期支线。
import { readFileSync, writeFileSync } from "node:fs";
import { zoomBarHtml, zoomFsCss, zoomFsScript } from "../../shared/zoomfs.mjs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "/Users/jason/.zcode/skills/anatomy/kit/iso-kit.mjs";
import * as G from "/Users/jason/.zcode/skills/anatomy/kit/lathe.mjs";
import * as A from "/Users/jason/.zcode/skills/anatomy/kit/audit.mjs";
import { tubePieces, tubeSvg } from "/Users/jason/.zcode/skills/anatomy/kit/tube.mjs";
import { kitScript } from "/Users/jason/.zcode/skills/anatomy/scripts/inline-kit.mjs";
import { makeLiveGeo } from "./geometry-live.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

// ================= camera / world =================
const W = 920, H = 640, AZ = 33, EL = 33;

const PLATE = { x: -218, y: -118, w: 436, d: 224, r: 8 };
const PLATE_H = 12, FOOT_H = 5;

// 文书台（xHCI 驱动）：x -212..-136, y -92..-4
const DESK = { x: -212, y: -92, w: 76, d: 88, r: 3 };
// 写入面板（台面后沿立板）：CSS 旗 / CRS 旗 / 端子柱
const PANEL = { x: -208, y: -88, w: 64, d: 3, r: 1 };
const PANEL_FACE = -84.95;
// 镜像柜（台前地面立柜：三抽屉——寄存器/内部态/内存镜像；不立台面，避免挡卡槽）
const CAB = { x: -126, y: 8, w: 52, d: 24, r: 2 };
// 注记牌（中段北带）：链路态映射；两口井复位纪律板立台顶东段（4.19 board.bits 先例）
const BOARD1 = { x: -126, y: -92, w: 76, d: 3, r: 1 };
const BOARD2 = { x: 42, y: -100, w: 46, d: 3, r: 1 };
// 总控台（xHC）：x -40..96, y -104..36, z 12..96（台沿 lid 至 99）
const CON = { x: -40, y: -104, w: 136, d: 140, r: 3 };
const FACE_Y = 36.05;
// 台顶两口井柜：Core（西，带闸刀）/ Aux（东，常在）；出卡口居中南移
const WELL_CORE = { x: -38, y: -98, w: 26, d: 14, r: 2 };
const WELL_AUX = { x: 6, y: -98, w: 26, d: 14, r: 2 };
// MEL 教学锚牌（台前）
const ANC = { x: -8, y: 46, w: 64, d: 1.6, r: 0.8 };
// 总线链路（台身右面 → 设备左面，y=-16 带）
const LINK = { x0: 98, x1: 156, y: -16, z: 26 };
// 设备试验盒（右）
const BOX = { px: 150, py: -56, pw: 64, pd: 112, tx: 158, ty: -48, tw: 48, td: 96 };
const BOX_FACE = 48.05;

// ================= projection / helpers =================
const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
   ...k.boxCorners({ x: CON.x - 3, y: CON.y - 3, w: CON.w + 6, d: CON.d + 6, r: 2 }, 96, 3),
   [-38, -98, 134], [-12, -98, 134], [6, -98, 130], [32, -98, 130],
   [-30, -79, 125], [19, -79, 117], [12, -68, 108], [-60, -112, 109], [56, -90, 112], [52, -112, 114],
   [130, 23, 64], [146, 40, 34], [218, 106, 72], [214, 61, 34],
   [-215, -95, 67], [-215, -1, 36], [-126, -89, 58], [46, -96, 114], [24, -108, 114], [-40, -118, 114], [-126, 8, 47], [-74, 32, 47], [156, -8, 30]],
  W, H, { pad: 16, azimuth: AZ, elevation: EL },
);
const KS = G.scaleOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const f2 = (v) => Math.round(v * 100) / 100;
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], a[1], 0], P));
const FT = (m, text, size, tone = "mid", anchor = "start") => k.faceTextSvg(m, text, { size, tone, anchor });
function planeMatrix(o, ex, ey) {
  const p0 = at(o), px = at(G.add3(o, ex)), py = at(G.add3(o, ey));
  return `matrix(${f2(px[0] - p0[0])} ${f2(px[1] - p0[1])} ${f2(py[0] - p0[0])} ${f2(py[1] - p0[1])} ${f2(p0[0])} ${f2(p0[1])})`;
}
const faceM = (x, y, z) => planeMatrix([x, y, z], [1, 0, 0], [0, 0, -1]); // +y 竖直面文字
const vtext = (x, y, z, text, size, tone = "mid", anchor = "start") => FT(faceM(x, y, z), text, size, tone, anchor);
const topText = (o, z, text, size, tone = "mid", anchor = "middle") => FT(k.topMatrix(o, z, P, "x"), text, size, tone, anchor);
function screwDots(plan, inset, z) {
  return Dots(k.corners(plan, inset).map(([x, y]) => at([x, y, z])), { size: 0.5 });
}

// ================= live 数据（wires 路线后补） =================
const DATA = {
  P, KS, W, H,
  faceY: FACE_Y, boxFaceY: BOX_FACE, panelFaceY: PANEL_FACE,
  states: ["D0", "D1", "D2", "D3hot", "D3cold"],
  regs: ["USBCMD", "DNCTRL", "DCBAAP", "CONFIG", "ERSTSZ", "ERSTBA", "ERDP", "IMAN", "IMOD", "VTIO"],
  drawerNames: ["① 寄存器镜像", "② 内部态", "③ 内存镜像"],
  drum: { x0: -37, x1: -11, z0: 58, z1: 82 },
  regwin: { x0: -7, x1: 37, z0: 58, z1: 82 },
  lamps: [
    { key: "sss", x: 44, name: "SSS", sub: "保存中" },
    { key: "rss", x: 55, name: "RSS", sub: "恢复中" },
    { key: "sre", x: 66, name: "SRE", sub: "存毁查" },
    { key: "rs", x: 77, name: "R-S", sub: "Run 门" },
    { key: "pme", x: 88, name: "PME", sub: "唤醒" },
  ],
  note: { x0: -34, x1: 34, z0: 28, z1: 52 },
  flagCss: { px: -198, pz: 46 },
  flagCrs: { px: -158, pz: 46 },
  blade: { hx: -31, hy: -83.95, hz: 108, r: 8, aOn: 42, aOff: -34 },
  wcard: { x: -208, y: -50, w: 20, z: 35, h: 17 },
  tray: { x: -160, y: -51, z: 42.2 },
  cab: { x0: -124.4, x1: -75.6, faceY: 32.95, rows: [40.6, 30.2, 19.8] },
  dev: { win: { x0: 164, x1: 188, z0: 36, z1: 58 }, btn: { x: 197, z: 46 } },
  wirePaths: {},   // 后补：write / ev / link
};
const geo = makeLiveGeo(k, G, DATA);

// ================= recorder =================
const R = A.recorder(P);
const record = R.solid;
function put(name, ref, svg, shapes = [], { bias = 0, ...rest } = {}) {
  return R.put({ name, at: ref, bias, svg, shapes, piece: "bench", ...rest });
}
function slab(name, plan, z, h, style = {}, { steps = 4, bevel = 0, extra = "", inner = "", bias = 0 } = {}) {
  const shape = record(A.slab(plan, z, h, { name }, steps));
  put(name, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2],
    S(k.slabOf(plan, z, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape], { bias });
  return shape;
}
function cyl(name, cx, cy, r, z, h, style = {}, { steps = 20, bevel = 0, extra = "", inner = "", bias = 0 } = {}) {
  const shape = record(A.cylinder(cx, cy, r, z, h, { name }, steps));
  put(name, [cx, cy, z + h / 2], S(k.cylinder(cx, cy, r, z, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape], { bias });
  return shape;
}

// 贴面文字/窗组收集（无实体形状的 markup，组装时入 labels 层——静态实体之后、actors 之前）
const labels = [];
const labelText = (svg) => { labels.push(svg); };

// ================= base =================
const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`);
for (const [x, y] of byDepth(k.corners(PLATE, 26))) {
  back.push(S(k.cylinder(x, y, 7.5, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 5.8, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
}
{
  const svg = S(k.slabOf(PLATE, 0, PLATE_H, P, 8, 1.6), { tone: "lo", inner: Ln(k.sideSeam(PLATE, 7, P, 8), { tone: "faint" }) })
    + Ln(k.planOutline(k.insetPlan(PLATE, 5), PLATE_H, P), { tone: "lo" })
    + Ln(k.corners(PLATE, 11).map(([x, y]) => k.ring(x, y, 2.2, PLATE_H, P, 16)).join(""), { tone: "lo" })
    + Dots(k.corners(PLATE, 11).map(([x, y]) => at([x, y, PLATE_H])), { size: 0.5 });
  put("stand.plate", [0, 0, PLATE_H / 2], svg, [record(A.slab(PLATE, 0, PLATE_H, { name: "stand.plate", ground: true }, 8))]);
}
{ // 标尺条 + 铭牌（板前右段）
  const strip = { x: 156, y: 66, w: 58, d: 6.5, r: 1 };
  const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4.4, 5, strip.y + 0.8, PLATE_H + 0.6, [2, 3.6], P);
  slab("stand.ruler", strip, PLATE_H, 0.6, { tone: "lo", crease: "none" },
    { steps: 3, extra: Ln(t.minor, { tone: "lo" }) + Ln(t.major, { tone: "mid" }) });
  const lab = { x: 40, y: 92, w: 34, d: 12, r: 1.2 };
  slab("stand.label", lab, PLATE_H, 0.8, { tone: "lo", crease: "none" },
    { steps: 3, extra: Ln(k.planOutline(k.insetPlan(lab, 1.6), PLATE_H + 0.8, P, 3), { tone: "faint" })
      + Ln([20, 14, 17].map((w2, i) => k.lineOnTop([lab.x + 4, lab.y + 4 + i * 3.4], [lab.x + 4 + w2, lab.y + 4 + i * 3.4], PLATE_H + 0.8, P)).join(""), { tone: "lo", free: true })
      + Dots([[lab.x + lab.w - 2.8, lab.y + 2.8], [lab.x + lab.w - 2.8, lab.y + lab.d - 2.8]].map(([x, y]) => at([x, y, PLATE_H + 0.8])), { size: 0.45 }) });
}

// ================= 文书台（xHCI 驱动） =================
{
  slab("desk.body", DESK, PLATE_H, 18, { tone: "mid" }, { steps: 4, bevel: 0.6, inner: Ln(k.sideSeam(DESK, 16, P, 4), { tone: "faint" }) });
  const topPlan = { x: DESK.x - 3, y: DESK.y - 3, w: DESK.w + 6, d: DESK.d + 6, r: 2 };
  slab("desk.top", topPlan, 30, 3, { tone: "mid" },
    { steps: 4, bevel: 0.4, extra: Ln(k.planOutline(k.insetPlan(topPlan, 3), 33, P, 4), { tone: "lo" }) });
  // 台前铭牌（板实体嵌入台身前缘；文字入 labels 层）
  const mp = { x: -210, y: -4.2, w: 66, d: 1.6, r: 0.6 };
  put("desk.title", [mp.x + mp.w / 2, -2.8, 21],
    S(k.slabOf(mp, 12, 18, P, 2, 0.3), { tone: "hi", crease: "none" }),
    [record(A.slab(mp, 12, 18, { name: "desk.title" }, 2))], { bias: 0.1 });
  labelText(vtext(mp.x + 4, mp.y + mp.d + 0.05, 26.5, "xHCI 驱动", 9, "drv")
    + vtext(mp.x + 4, mp.y + mp.d + 0.05, 19.5, "规范原文称", 5.0, "mid")
    + vtext(mp.x + 4, mp.y + mp.d + 0.05, 13.4, "system software", 5.0, "mid"));
}
// 写入面板（立板）+ CSS/CRS 双旗 + 写入拉线端子柱
{
  slab("panel.body", PANEL, 33, 31, { tone: "mid" }, { steps: 2, extra: screwDots({ x: PANEL.x + 3, y: PANEL.y + 0.4, w: PANEL.w - 6, d: PANEL.d - 0.8 }, 2, 64) });
  // 双旗：铰盘（实体）+ 推上触点垫（实体）；旗臂 live 重建（labels 层）
  for (const [nm, spec] of [["css", DATA.flagCss], ["crs", DATA.flagCrs]]) {
    const lpF = G.frameOf([spec.px, PANEL_FACE + 0.05, spec.pz], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    put(`flag.${nm}.hinge`, [spec.px, PANEL_FACE + 1.2, spec.pz],
      S(G.disc(0, 1.3, 2.4, lpF, P, { steps: 16, bevel: 0.2 }), { tone: "mid" })
      + Ln(G.circleOf(lpF, 1.3, 2.4, P, 16), { tone: "lo" }),
      [record(A.disc(lpF, 0, 1.3, 2.4, { name: `flag.${nm}.hinge`, owner: "panel.body" }))], { bias: 0.25 });
    const upA = (46 * Math.PI) / 180;
    const cp = [spec.px + 10.5 * Math.cos(upA), PANEL_FACE + 0.05, spec.pz + 10.5 * Math.sin(upA)];
    const cpF = G.frameOf(cp, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    put(`flag.${nm}.contact`, [cp[0], PANEL_FACE + 1.1, cp[2]],
      S(G.disc(0, 1.0, 1.8, cpF, P, { steps: 14, bevel: 0.2 }), { tone: "hi" }),
      [record(A.disc(cpF, 0, 1.0, 1.8, { name: `flag.${nm}.contact`, owner: "panel.body" }))], { bias: 0.25 });
    labelText(`<g data-part="flag-${nm}">${geo.flagSvg(0, spec)}</g>`);
  }
  labelText(
    vtext(-206, PANEL_FACE + 0.05, 62.0, "CSS 旗 · Save State（p312）", 3.6, "hi")
    + vtext(-206, PANEL_FACE + 0.05, 55.0, "CRS 旗 · Restore（p313）", 3.6, "hi")
    + vtext(-206, PANEL_FACE + 0.05, 37.5, "两旗只在停机态可置（p312）", 3.6, "lo"));
  // 写入拉线端子柱（面板顶）
  cyl("panel.term", -176, -86.5, 1.2, 64, 3, { tone: "mid" }, { steps: 12, bevel: 0.2, extra: Ln(k.ring(-176, -86.5, 0.5, 67, P, 10), { tone: "lo" }) + Dots([at([-176, -86.5, 67])], { size: 0.4, tone: "hi" }) });
}
// 存档/恢复卡槽（写入动作卡；卡 live 控制）
{
  slab("slot.base", { x: -210, y: -58, w: 24, d: 17.4, r: 1 }, 33, 2.2, { tone: "lo" }, { steps: 2, extra: Ln(k.planOutline(k.insetPlan({ x: -210, y: -58, w: 24, d: 17.4, r: 1 }, 2), 35.2, P, 3), { tone: "faint" }) });
  slab("slot.lip", { x: -210, y: -40.6, w: 24, d: 3.6, r: 1 }, 33, 5, { tone: "mid" }, { steps: 2 });
  put("wcard", [-198, -49, 43.5], `<g data-part="wcard" style="display:none"></g>`,
    [record(A.slab({ x: DATA.wcard.x, y: DATA.wcard.y, w: DATA.wcard.w, d: 2, r: 0.5 }, DATA.wcard.z, DATA.wcard.h, { name: "wcard", owner: "slot.base" }, 2))], { bias: 0.2 });
  labelText(topText([-196, -36.5], 33.02, "存档/恢复 卡槽", 4.4, "lo"));
}
// 事件匣（PME# 事件回执落位）
slab("tray.event", { x: -182, y: -64, w: 44, d: 26, r: 1.4 }, 33, 3.6, { tone: "hi" }, { steps: 3, bevel: 0.4 });
slab("tray.event.lip", { x: -138, y: -65, w: 1.6, d: 28, r: 0.6 }, 33, 5.2, { tone: "mid" });
labelText(topText([-166, -36.5], 33.02, "事件匣", 5.4, "mid"));
// 镜像柜（台侧地面三抽屉立柜：寄存器镜像 / xHC 内部态 / 内存镜像）
{
  slab("cab.body", CAB, PLATE_H, 34, { tone: "mid" }, { steps: 3, bevel: 0.5, inner: Ln(k.sideSeam(CAB, 42, P, 3), { tone: "faint" }) });
  const rows = [[36.0, "cab.d1"], [25.6, "cab.d2"], [15.2, "cab.d3"]];
  for (const [zb, nm] of rows) {
    slab(nm, { x: -124.4, y: 31.6, w: 48.8, d: 1.4, r: 0.6 }, zb, 9.2, { tone: "hi", crease: "none" },
      { steps: 2, bias: 0.18, extra: Dots([[-124.4 + 48.8 / 2, 32.3, zb + 4.6]].map((p) => at(p)), { size: 0.45 }) });
  }
  labelText(topText([-78, 20], 46.02, "镜像柜 · 软件保存", 4.2, "lo", "end")
    + `<g data-part="drawers">${geo.drawerSvg([{ on: 0 }, { on: 0 }, { on: 0 }])}</g>`);
}

// ================= 注记牌两块（中段立板） =================
{
  slab("board.lpm", BOARD1, PLATE_H, 46, { tone: "lo" }, { steps: 2 });
  labelText(
    vtext(BOARD1.x + 3, BOARD1.y + BOARD1.d + 0.05, PLATE_H + 40, "链路态映射（Table 4-12）", 6.0, "hi")
    + vtext(BOARD1.x + 3, BOARD1.y + BOARD1.d + 0.05, PLATE_H + 32, "On＝L0↔U0 跑包 · Off＝L3 断 VBus", 4.0, "mid")
    + vtext(BOARD1.x + 3, BOARD1.y + BOARD1.d + 0.05, PLATE_H + 24.4, "细粒度 U1：回 On <~10 μs", 4.0, "mid")
    + vtext(BOARD1.x + 3, BOARD1.y + BOARD1.d + 0.05, PLATE_H + 17.6, "粗粒度 L1(Sleep)↔U2：~1 ms 互映", 4.0, "mid")
    + vtext(BOARD1.x + 3, BOARD1.y + BOARD1.d + 0.05, PLATE_H + 10.8, "Suspend＝L2↔U3＝USB 挂起正式名", 4.0, "mid")
    + vtext(BOARD1.x + 3, BOARD1.y + BOARD1.d + 0.05, PLATE_H + 4.6, "（p316–317）", 3.6, "lo"));
  // 井复位纪律板退役：内容并入两口井柜立面刻字（上文）——台顶地面注记让空给事件管东绕
}

// ================= 总控台（xHC） =================
{
  slab("con.body", CON, PLATE_H, 84, { tone: "mid" }, { steps: 4, bevel: 0.8, inner: Ln(k.sideSeam(CON, 60, P, 4), { tone: "faint" }) });
  slab("con.lid", { x: CON.x - 3, y: CON.y - 3, w: CON.w + 6, d: CON.d + 6, r: 2 }, 96, 3, { tone: "mid" },
    { steps: 4, bevel: 0.5, extra: screwDots({ x: CON.x - 1, y: CON.y - 1, w: CON.w + 2, d: CON.d + 2 }, 8, 99) });
  // 台顶：PME# 出卡口 + 事件出口短管 + 散注（井柜另立，见下节）
  slab("con.evslot", { x: -6, y: -84, w: 30, d: 16, r: 1 }, 99, 2.6, { tone: "lo" }, { steps: 2 });
  cyl("con.evstub", 38, -72, 1.8, 99, 5, { tone: "lo" }, { steps: 18 });
  labelText(
    topText([-30, -78], 99.02, "PW-1", 4.0, "lo")
    + topText([9, -76], 101.62, "PME# 出卡口", 4.2, "lo", "start")
    + topText([38, -62], 99.02, "事件出口", 3.6, "lo", "middle")
    + topText([52, -100], 99.02, "电源井对 · 供 xHC（p310）", 4.2, "lo", "start"));
  // 前立面：D 态转筒窗 + 寄存器面板窗 + 五灯 + 注记窗 + 铭牌（窗组随文字入 labels 层）
  labelText(
    `<g data-part="drum">${geo.drumSvg(0)}</g>`
    + `<g data-part="regwin">${geo.regSvg(1)}</g>`
    + `<g data-part="note" style="display:none"></g>`
    + vtext(-35, FACE_Y, 88.6, "PCI 功耗态", 3.0, "lo")
    + vtext(42, FACE_Y, 88.0, "xHC · 电源管理", 5.4, "hc"));
  // 五灯：SSS / RSS / SRE / R-S / PME（标签行独立）
  const faceLamp = (name, x, z, lampKey, lab, sub, nameZ = 80, subZ = 59) => {
    const seatF = G.frameOf([x, FACE_Y + 0.05, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    put(`${name}.seat`, [x, FACE_Y + 1.2, z],
      S(G.disc(0, 2.2, 2.8, seatF, P, { steps: 20, bevel: 0.2 }), { tone: "lo" })
      + Ln(G.circleOf(seatF, 2.2, 2.8, P, 20), { tone: "lo" }),
      [record(A.disc(seatF, 0, 2.2, 2.8, { name: `${name}.seat`, owner: "con.body" }))], { bias: 0.3 });
    const lf = G.frameOf([x, FACE_Y + 2.4, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    put(`${name}.dome`, [x, FACE_Y + 3.6, z + 0.4],
      `<g class="lamp" data-lamp="${lampKey}">` + S(G.solidOf([[0, 0.2], [1, 2, 1], [2.2, 2.6, 1], [3, 2, 1], [3.4, 0.3]], lf, P, { steps: 20 }), { tone: "hi" }) + `</g>`,
      [record(A.solid(lf, [[0, 0.2], [1, 2, 1], [2.2, 2.6, 1], [3, 2, 1], [3.4, 0.3]], { name: `${name}.dome`, owner: `${name}.seat` }))], { bias: 0.4 });
    labelText(vtext(x, FACE_Y, nameZ, lab, 4.0, "mid", "middle") + vtext(x, FACE_Y, subZ, sub, 3.2, "lo", "middle"));
  };
  for (const L of DATA.lamps) faceLamp(L.key, L.x, 72, L.key, L.name, L.sub);
  // 写入拉线端子（左面端子凸台：外端面 x=-42.2）
  const wf = G.frameOf([-40, 0, 58], [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
  put("con.writein", [-41.2, 0, 58], S(G.disc(0, 3.4, 2, wf, P, { steps: 18, bevel: 0.3 }), { tone: "mid" })
    + Ln(G.circleOf(wf, 3.4, 2, P, 18), { tone: "lo" }),
    [record(A.disc(wf, 0, 3.4, 2, { name: "con.writein", owner: "con.body" }))], { bias: 0.2 });
}

// ================= 台顶两口井柜（Core 可断 / Aux 常在） =================
{
  // Core 井柜（西）：柜身 + 供电灯（座+罩）+ 供电闸刀（铰盘+通/断触点；臂 live 重建）
  slab("well.core", WELL_CORE, 99, 34, { tone: "mid" }, { steps: 2, extra: screwDots({ x: WELL_CORE.x + 2.5, y: WELL_CORE.y + 0.6, w: WELL_CORE.w - 5, d: WELL_CORE.d - 1.2 }, 1.8, 132.4) });
  const wfF = G.frameOf([-18, -83.9, 114], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  put("well.core.lseat", [-18, -82.7, 114],
    S(G.disc(0, 2.2, 2.8, wfF, P, { steps: 18, bevel: 0.2 }), { tone: "lo" })
    + Ln(G.circleOf(wfF, 2.2, 2.8, P, 18), { tone: "lo" }),
    [record(A.disc(wfF, 0, 2.2, 2.8, { name: "well.core.lseat", owner: "well.core" }))], { bias: 0.3 });
  const wlF = G.frameOf([-18, -83.9 + 2.15, 114.4], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  put("well.core.ldome", [-18, -80.5, 114.8],
    `<g class="lamp" data-lamp="corep">` + S(G.solidOf([[0, 0.2], [1, 2, 1], [2.2, 2.6, 1], [3, 2, 1], [3.4, 0.3]], wlF, P, { steps: 18 }), { tone: "hi" }) + `</g>`,
    [record(A.solid(wlF, [[0, 0.2], [1, 2, 1], [2.2, 2.6, 1], [3, 2, 1], [3.4, 0.3]], { name: "well.core.ldome", owner: "well.core.lseat" }))], { bias: 0.4 });
  const hbF = G.frameOf([DATA.blade.hx, DATA.blade.hy + 0.05, DATA.blade.hz], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  put("well.core.hinge", [DATA.blade.hx, DATA.blade.hy + 1.1, DATA.blade.hz],
    S(G.disc(0, 1.2, 2.2, hbF, P, { steps: 16, bevel: 0.2 }), { tone: "mid" })
    + Ln(G.circleOf(hbF, 1.2, 2.2, P, 16), { tone: "lo" }),
    [record(A.disc(hbF, 0, 1.2, 2.2, { name: "well.core.hinge", owner: "well.core" }))], { bias: 0.3 });
  for (const [nm, deg] of [["on", DATA.blade.aOn], ["off", DATA.blade.aOff]]) {
    const a = (deg * Math.PI) / 180;
    const cx = DATA.blade.hx + DATA.blade.r * Math.cos(a);
    const cz = DATA.blade.hz + DATA.blade.r * Math.sin(a);
    const cF = G.frameOf([cx, DATA.blade.hy + 0.05, cz], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    put(`well.core.${nm}`, [cx, DATA.blade.hy + 1.0, cz],
      S(G.disc(0, 0.9, 1.6, cF, P, { steps: 14, bevel: 0.2 }), { tone: nm === "on" ? "hi" : "lo" }),
      [record(A.disc(cF, 0, 0.9, 1.6, { name: `well.core.${nm}`, owner: "well.core" }))], { bias: 0.3 });
  }
  labelText(
    `<g data-part="coreblade">${geo.bladeSvg(DATA.blade.aOn)}</g>`
    + vtext(-36.5, -83.9, 130.8, "Core 井 · 可断", 4.2, "hi")
    + vtext(-36.5, -83.9, 125.2, "HW Reset/HCRST/", 3.0, "mid")
    + vtext(-36.5, -83.9, 120.2, "D3hot→D0 → 回默认", 3.0, "mid")
    + vtext(-14.8, -83.9, 113.6, "通", 3.2, "mid")
    + vtext(-14.8, -83.9, 103.2, "断", 3.2, "lo"));
  // Aux 井柜（东）：柜身 + 供电灯 + 常在铭（无闸刀——AC 期间不断）
  slab("well.aux", WELL_AUX, 99, 30, { tone: "mid" }, { steps: 2, extra: screwDots({ x: WELL_AUX.x + 2.5, y: WELL_AUX.y + 0.6, w: WELL_AUX.w - 5, d: WELL_AUX.d - 1.2 }, 1.8, 128.4) });
  const afF = G.frameOf([27.5, -83.9, 103], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  put("well.aux.lseat", [27.5, -82.7, 103],
    S(G.disc(0, 2.2, 2.8, afF, P, { steps: 18, bevel: 0.2 }), { tone: "lo" })
    + Ln(G.circleOf(afF, 2.2, 2.8, P, 18), { tone: "lo" }),
    [record(A.disc(afF, 0, 2.2, 2.8, { name: "well.aux.lseat", owner: "well.aux" }))], { bias: 0.3 });
  const alF = G.frameOf([27.5, -83.9 + 2.15, 103.4], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  put("well.aux.ldome", [27.5, -80.5, 103.8],
    `<g class="lamp" data-lamp="auxp">` + S(G.solidOf([[0, 0.2], [1, 2, 1], [2.2, 2.6, 1], [3, 2, 1], [3.4, 0.3]], alF, P, { steps: 18 }), { tone: "hi" }) + `</g>`,
    [record(A.solid(alF, [[0, 0.2], [1, 2, 1], [2.2, 2.6, 1], [3, 2, 1], [3.4, 0.3]], { name: "well.aux.ldome", owner: "well.aux.lseat" }))], { bias: 0.4 });
  labelText(
    vtext(8.5, -83.9, 126.2, "Aux 井 · 常在", 4.2, "hi")
    + vtext(8.5, -83.9, 120.4, "AC 期间常在（p310）", 3.0, "mid")
    + vtext(8.5, -83.9, 115.2, "PME 唤醒上下文在此", 3.0, "mid")
    + vtext(8.5, -83.9, 110.2, "初次上电/HCRST 复位", 3.0, "mid"));
}

// ================= MEL 教学锚牌（台前） =================
{
  slab("mel.anchor", ANC, PLATE_H, 24, { tone: "lo" }, { steps: 2 });
  labelText(
    vtext(ANC.x + 3, ANC.y + ANC.d + 0.05, PLATE_H + 18.5, "Max Exit Latency（p324–326）", 5.0, "hi")
    + vtext(ANC.x + 3, ANC.y + ANC.d + 0.05, PLATE_H + 11.5, "路径最坏退出延迟 · 一个值兜住整条路径", 4.0, "mid")
    + vtext(ANC.x + 3, ANC.y + ANC.d + 0.05, PLATE_H + 5.5, "MEL='0'＝无电源管理 · SS Isoch 提前 MEL μs 发 PING", 3.8, "mid"));
}

// ================= 总线链路（xHC 端口 → 设备） =================
{
  const bf = G.frameOf([96, LINK.y, LINK.z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  put("link.portA", [97.5, LINK.y, LINK.z], S(G.disc(0, 2, 2, bf, P, { steps: 18, bevel: 0.3 }), { tone: "mid" })
    + Ln(G.circleOf(bf, 2, 2, P, 18), { tone: "lo" }),
    [record(A.disc(bf, 0, 2, 2, { name: "link.portA", owner: "con.body" }))], { bias: 0.2 });
  const df = G.frameOf([158, LINK.y, LINK.z], [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
  put("link.portB", [156.5, LINK.y, LINK.z], S(G.disc(0, 2, 2, df, P, { steps: 18, bevel: 0.3 }), { tone: "mid" })
    + Ln(G.circleOf(df, 2, 2, P, 18), { tone: "faint" }),
    [record(A.disc(df, 0, 2, 2, { name: "link.portB", owner: "box.tower" }))], { bias: 0.2 });
  slab("link.bed", { x: LINK.x0, y: LINK.y - 4, w: LINK.x1 - LINK.x0, d: 8, r: 1.2 }, LINK.z, 2.5, { tone: "lo" }, { steps: 3 });
  slab("link.lipN", { x: LINK.x0, y: LINK.y - 5.6, w: LINK.x1 - LINK.x0, d: 1.6, r: 0.6 }, LINK.z + 2.5, 1.6, { tone: "mid" }, { steps: 2 });
  slab("link.lipS", { x: LINK.x0, y: LINK.y + 4, w: LINK.x1 - LINK.x0, d: 1.6, r: 0.6 }, LINK.z + 2.5, 1.6, { tone: "mid" }, { steps: 2 });
  for (const px of [118, 136]) {
    cyl("link.post", px, LINK.y, 2, PLATE_H, LINK.z - PLATE_H, { tone: "mid", crease: "none" },
      { steps: 14, extra: Ln(k.sideArc(px, LINK.y, 2, 20, P, 10), { tone: "faint" }) });
  }
  labelText(
    topText([122, -7], PLATE_H + 0.02, "总线链路", 4.6, "mid")
    + topText([122, 0.5], PLATE_H + 0.02, "信令与数据走行", 3.8, "lo"));
}

// ================= 设备试验盒（右） =================
{
  slab("box.plinth", { x: BOX.px, y: BOX.py, w: BOX.pw, d: BOX.pd, r: 3 }, PLATE_H, 6, { tone: "lo" }, { steps: 3, bevel: 0.6 });
  const tw = { x: BOX.tx, y: BOX.ty, w: BOX.tw, d: BOX.td, r: 3 };
  slab("box.tower", tw, PLATE_H + 6, 46, { tone: "mid" },
    { steps: 3, bevel: 0.8, inner: Ln(k.sideSeam(tw, 40, P, 3), { tone: "faint" }) });
  slab("box.roof", { x: BOX.tx - 4, y: BOX.ty - 4, w: BOX.tw + 8, d: BOX.td + 8, r: 3 }, PLATE_H + 52, 4, { tone: "mid" }, { steps: 3, bevel: 0.6 });
  cyl("box.cap", BOX.tx + BOX.tw / 2, BOX.ty + BOX.td / 2, 3.4, PLATE_H + 56, 3.5, { tone: "hi" }, { steps: 24 });
  labelText(
    topText([170, 26], PLATE_H + 56.02, "USB 设备 · 唤醒方", 6.2, "dev")
    + topText([170, 15], PLATE_H + 56.02, "远程唤醒发 resume/LFPS", 4.2, "mid"));
  // 设备链路态窗 + PME 唤醒钮（窗组随文字入 labels 层）
  labelText(
    `<g data-part="devwin">${geo.devWinSvg("U0 跑包", "数据包往返")}</g>`
    + `<g data-part="pmebtn">${geo.pmeBtnSvg(0)}</g>`
    + vtext(197, BOX_FACE, 31, "唤醒钮", 4.2, "lo", "middle"));
  // 教学锚长铭牌（基座前立牌）
  const np = { x: 152, y: 58, w: 62, d: 3, r: 1 };
  put("box.nameplate", [np.x + np.w / 2, np.y + np.d / 2, 14],
    S(k.slabOf(np, PLATE_H, 22, P, 2), { tone: "lo", crease: "none" })
    + Ln(path3([[np.x + 2, np.y + np.d + 0.05, PLATE_H + 2], [np.x + np.w - 2, np.y + np.d + 0.05, PLATE_H + 2]], false), { tone: "faint", free: true })
    + Dots([[np.x + 2.6, np.y + np.d + 0.2, PLATE_H + 19.4], [np.x + np.w - 2.6, np.y + np.d + 0.2, PLATE_H + 19.4]].map((p) => at(p)), { size: 0.45 }),
    [record(A.slab(np, PLATE_H, 22, { name: "box.nameplate" }, 2))], { bias: 0.15 });
  labelText(
    vtext(np.x + 3, np.y + np.d + 0.05, PLATE_H + 16.5, "只见链路信令与 VBus", 5.6, "dev")
    + vtext(np.x + 3, np.y + np.d + 0.05, PLATE_H + 9.5, "端口挂起时序归 §4.15（互链）", 4.0, "mid")
    + vtext(np.x + 3, np.y + np.d + 0.05, PLATE_H + 3.2, "寄存器/Save 对设备不可见", 3.8, "mid"));
}

// ================= 线缆（写入拉线 / 事件回流管） =================
// 端点落位（audit 判据）：写入拉线两端=面板端子柱顶/总控台左面端子凸台外端面（rim 落面过
// terminals）；事件管两端=台顶短管口/事件匣内底（rim 落面）；链路票据路径为直线段。
const WIRE_WRITE = [[-176, -86.5, 68.5], [-158, -78, 79], [-120, -66, 93], [-72, -56, 102], [-48, -38, 101], [-48, -4, 84], [-47, 4, 68], [-46.5, 2, 60], [-44.1, 0, 58]];
const TUBE_EV = [[38, -72, 104], [38, -72, 110], [46, -96, 112], [24, -108, 113], [-40, -118, 113], [-140, -106, 103], [-178, -88, 86], [-176, -64, 58], [-168, -49, 46], [-168, -49, 36.7]];
const LINK_RUN = [[100, LINK.y, LINK.z + 3.5], [154, LINK.y, LINK.z + 3.5]];
{
  {
    const route = G.fillet(WIRE_WRITE, 4, 10, { P, tube: 0.55 });
    R.route("wire.write", route, 0.55, { piece: "bench", limp: true, tips: [null, null], ends: [false, false] });
    tubePieces(route, 0.55, P, { maxLength: 16 }).forEach((piece, index) => {
      put(`wire.write:${index}`, piece.mid, tubeSvg(piece, { tone: "lo" }), [A.tube(piece.points, piece.radii)], { bias: 0.05, route: "wire.write", chunk: index });
    });
  }
  {
    const route = G.fillet(TUBE_EV, 5, 10, { P, tube: 0.9 });
    R.route("tube.ev", route, 0.9, { piece: "bench", rims: [1.7, 1.7], limp: true });
    tubePieces(route, 0.9, P, { maxLength: 18 }).forEach((piece, index) => {
      put(`tube.ev:${index}`, piece.mid, tubeSvg(piece, { tone: "mid" }), [A.tube(piece.points, piece.radii)], { bias: 0.05, route: "tube.ev", chunk: index });
    });
  }
}
DATA.wirePaths = { write: WIRE_WRITE.map((p) => p.map(f2)), ev: TUBE_EV.map((p) => p.map(f2)), link: LINK_RUN.map((p) => p.map(f2)) };

// 飞行 PME# 事件卡（出卡口上方 home；live 重建）
put("ev.fly", [-6, -76, 108], `<g data-part="evfly" style="display:none"></g>`,
  [record(A.slab({ x: -15, y: -80, w: 18, d: 2.6, r: 0.7 }, 101.6, 12, { name: "ev.fly", owner: "con.evslot" }, 2))], { bias: 0.3 });

// ================= settle + assemble =================
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const itemG = (it) => `<g class="it" data-name="${it.name}"${it.attrs ?? ""}>${it.svg}</g>`;
const seq = R.items.map(itemG);
seq.push(`<g class="fb-labels">${labels.join("")}</g>`);
seq.push(`<g data-part="actors-tokens"></g><g data-part="actors-events"></g>`);
const svg = k.figureSvg({
  width: W, height: H,
  label: "电源井配电台：左文书台是 xHCI 驱动（规范称 system software）——CSS/CRS 双旗（只在停机态可置）、镜像柜存三份镜像（寄存器十组/xHC 内部态/内存镜像）；中总控台是 xHC——PCI 功耗态转筒（D0/D1/D2/D3hot/D3cold）、寄存器面板窗、SSS/RSS/SRE/R-S/PME 五灯；台顶两口井柜供着 xHC——Core 井带供电闸刀可断（断电=寄存器回默认）、Aux 井常在（PME 唤醒上下文活过断电）；右试验盒是设备——链路态窗与 PME 唤醒钮；票据走链路=resume/LFPS 信令，PME# 事件卡经出卡口入事件匣。",
  body: [...back, `<g class="fb-stage">${seq.join("")}</g>`].join(""),
});

// ================= figure CSS =================
const DRV = THEME === "light" ? "#2d5fb3" : "#7c9ff0";
const HC = THEME === "light" ? "#8a5f14" : "#d9a860";
const DEV = THEME === "light" ? "#2f7a3d" : "#86bd7a";
const CSS = `
.fb-stage { --lamp-glow: ${THEME === "light" ? "#d98428" : "#ffb45e"}; --lamp-ink: ${THEME === "light" ? "#c96a12" : "#ffd9a0"}; --hc-glow: ${HC}; }
.iso-face-text[data-tone="drv"] { fill: ${DRV}; }
.iso-face-text[data-tone="hc"] { fill: ${HC}; }
.iso-face-text[data-tone="dev"] { fill: ${DEV}; }
.fb-stage .lamp path { fill: var(--anatomy-shade-2); transition: fill 300ms; }
.fb-stage .lamp.on path { fill: var(--lamp-ink); }
.fb-stage .lamp.on { filter: drop-shadow(0 0 6px var(--lamp-glow)); }
.fb-stage .lamp.on.blink { animation: fb-blink 1.4s ease-in-out infinite; }
@keyframes fb-blink { 0%, 100% { filter: drop-shadow(0 0 3px var(--lamp-glow)); } 50% { filter: drop-shadow(0 0 8px var(--lamp-glow)); } }
.fb-stage .it.lit .iso-solid > path { stroke: ${HC}; }
.fb-stage .it.lit { filter: drop-shadow(0 0 4px ${HC}55); }
@media (prefers-reduced-motion: reduce) { .fb-stage * { transition: none !important; animation: none !important; } }
`;

// ================= 泳道静态图（页面级平面 SVG：三列时间线；骨架版步进模式退役由机器接管，总览保留） =================
function laneSvg() {
  const LW = 1280;
  const LANES = { sw: 230, hc: 650, dev: 1070 };
  const BOXW = 330;
  const rows = [
    { n: 1, pg: "p312·p557", sw: ["停端点（Stop Endpoint）· 命令环收讫", "全部 Enabled 端口置 USB 挂起（§4.15）", "R/S='0' 停机——两旗的可置前提"], hc: ["端点回写上下文入内存", "（TR Dequeue Ptr、DCS 等）"], note: ["FSC='1'（xHCI 1.1/1.2 强制）也要确保未收 Stop 的 Running 端点在 R/S 清 0 前已 Idle（p312 步 4）"] },
    { n: 2, pg: "p312", sw: ["按序读十组寄存器并保存：", "USBCMD…VTIO（存档步 5）"], hc: ["寄存器状态可读走"] },
    { n: 3, pg: "p312", sw: ["写 USBCMD：CSS='1'（Save State）", "等 USBSTS.SSS → '0'"], hc: ["内部槽/端点/流状态", "存入内存（步 6–7）"], ev: { from: "sw", to: "hc", lines: ["CSS='1'"] } },
    { n: 4, pg: "p312", sw: ["存内存镜像：SPR='1' 先存 Scratchpad", "再存 DCBAA/Contexts/命令环/事件环"], note: ["整棵结构树由软件保存；Restore 要求回到同一物理地址，否则未定义行为（p312 Note / p314 Note）"] },
    { n: 5, pg: "p310–312", note: ["断电＝移除 Core 井电（步 10）→ D3hot → D3cold；Core 井寄存器在 Chip HW Reset / HCRST / D3hot→D0 回默认；Aux 井仅初次上电 / HCRST 复位——PME 唤醒上下文活过断电；进 D3cold 的方法属平台级（p311 Note）"] },
    { n: 6, pg: "p254–255·p557", dev: ["远程唤醒：发 resume 信令（USB2）", "/ LFPS（USB3）——§4.15.2.1"], hc: ["xHC 按 PCI PM 规则断言 PME#", "保留芯片上下文"], ev: { from: "dev", to: "hc", lines: ["唤醒信令"], dashed: true }, note: ["主机侧亦可发起：若软件在进 D3cold 前决定重启，Restore 操作非必需（p313）"] },
    { n: 7, pg: "p312–313·p558", sw: ["镜像回原物理地址（软件）"], hc: ["上电回 D0：D3hot→D0 内部复位", "按序写回九组：DNCTRL…VTIO", "（无 USBCMD）"], note: ["硬规则：寄存器先写回、Restore 后执行——Restore 会盖掉复位默认值（p313 Note）；PMCSR.PME_Status/PME_En 保持（A.1.1 p558）"] },
    { n: 8, pg: "p313–314", sw: ["写 USBCMD：CRS='1'（Restore State）", "等 USBSTS.RSS → '0' → 查 SRE"], hc: ["恢复内部状态（RCS、", "Enabled Device Slots 等）"], ev: { from: "sw", to: "hc", lines: ["CRS='1'"] }, note: ["保存态损坏→SRE='1'、Restore 终止、RSS 清 '0'；Save 后先 Run 再 Restore 也在完成时报 SRE（仅 Aux 井保住才报，p314 Note）"] },
    { n: 9, pg: "p313–317·p324", sw: ["命令环重初始化（Cycle 对齐 RCS）", "写 CRCR → R/S='1' 合闸", "走拓扑初始化 PORTSC/PORTPMSC/PORTLI", "逐端点门铃重启"], hc: ["xHC 复跑；寄存器面板复得"], dev: ["设备应仍挂接、USB 地址不变"], note: ["端口态不在 Save/Restore 覆盖内（p314 Note）；运行期支线＝链路 LPM：U1/U2 浅态（Table 4-12 p316–317）+ Max Exit Latency 调度（p324–326）"] },
  ];
  let y = 128;
  const laid = rows.map((r) => {
    const hs = ["sw", "hc", "dev"].filter((l) => r[l]).map((l) => 26 + r[l].length * 21);
    const boxH = hs.length ? Math.max(...hs) : 26;
    const noteH = r.note ? 22 + r.note.length * 17 + 10 : 0;
    const at_ = { ...r, y, boxH };
    y += boxH / 2 + 30 + Math.max(noteH, 26) + boxH / 2 + 8;
    return at_;
  });
  const footNote = ["恢复后端口状态由软件重走（Save/Restore 不覆盖根集线器端口，p314 Note）；设备状态变动时修补责任在软件（p315）", "PCI 功耗态（Table A-1 p557）：D0 必需 · D1/D2 可选（USB 睡眠态）· D3hot 必需（深 USB 睡眠）· D3cold 必需（全睡，下游挂起或断电）；出 D0 前全部 Enabled 下游端口置 USB 挂起（p557）"];
  const footY = y + 6;
  const LH = footY + 30 + footNote.length * 18 + 16;
  let g = "";
  for (const [id, x] of Object.entries(LANES)) {
    g += `<rect x="${x - 150}" y="36" width="300" height="52" rx="8" class="lane-bg lane-edge c-${id}"/>`
      + `<text x="${x}" y="61" class="lane-name c-${id}" text-anchor="middle">${id === "sw" ? "xHCI 驱动" : id === "hc" ? "xHC 控制器" : "设备"}</text>`
      + `<text x="${x}" y="80" class="lane-sub" text-anchor="middle">${id === "sw" ? "system software（系统软件）" : id === "hc" ? "the xHC" : "USB device"}</text>`
      + `<line x1="${x}" y1="88" x2="${x}" y2="${footY - 16}" class="lane-life"/>`;
  }
  laid.forEach((r) => {
    const cy = r.y;
    g += `<circle cx="34" cy="${cy - r.boxH / 2 + 4}" r="17" class="numbg"/><text x="34" y="${cy - r.boxH / 2 + 9.5}" class="num" text-anchor="middle">${r.n}</text>`;
    for (const lane of ["sw", "hc", "dev"]) {
      if (!r[lane]) continue;
      const x = LANES[lane], w = BOXW, h = 26 + r[lane].length * 21;
      const by = cy - r.boxH / 2;
      g += `<rect x="${x - w / 2}" y="${by}" width="${w}" height="${h}" rx="8" class="box c-${lane}"/>`;
      r[lane].forEach((ln, j) => { g += `<text x="${x}" y="${by + 23 + j * 21}" class="box-t${j === 0 ? " b" : ""}" text-anchor="middle">${ln}</text>`; });
      g += `<text x="${x + w / 2 - 10}" y="${by + 16}" class="box-p" text-anchor="end">${r.pg}</text>`;
    }
    if (r.ev) {
      const a = LANES[r.ev.from], b = LANES[r.ev.to];
      const start = a < b ? a + BOXW / 2 + 6 : a - BOXW / 2 - 6;
      const end = a < b ? b - BOXW / 2 - 6 : b + BOXW / 2 + 6;
      const mid = (a + b) / 2;
      const ay = cy + r.boxH / 2 + 20;
      r.ev.lines.forEach((ln, j) => { g += `<text x="${mid}" y="${ay - 9 + j * 16}" class="arr-t" text-anchor="middle">${ln}</text>`; });
      g += `<line x1="${start}" y1="${ay}" x2="${end}" y2="${ay}" class="arr${r.ev.dashed ? " dash" : ""}" marker-end="url(#arrh)"/>`;
    }
    if (r.note) {
      const nw = 940, nh = 22 + r.note.length * 17;
      const ny = cy + r.boxH / 2 + 34;
      g += `<rect x="${LW / 2 - nw / 2}" y="${ny}" width="${nw}" height="${nh}" rx="6" class="notebox"/>`;
      r.note.forEach((ln, j) => { g += `<text x="${LW / 2}" y="${ny + 16 + j * 17}" class="note-t" text-anchor="middle">${ln}</text>`; });
    }
  });
  const nw2 = 1180, nh2 = 26 + footNote.length * 18;
  g += `<rect x="${LW / 2 - nw2 / 2}" y="${footY}" width="${nw2}" height="${nh2}" rx="6" class="notebox"/>`;
  footNote.forEach((ln, j) => { g += `<text x="${LW / 2}" y="${footY + 20 + j * 18}" class="note-t" text-anchor="middle">${ln}</text>`; });
  return `<svg id="lane-svg" viewBox="0 0 ${LW} ${LH}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="§4.23 电源管理三方泳道总览：系统挂起与恢复主线九步（停端点、存寄存器、Save State、存镜像、断 Core 井、唤醒 PME、回 D0 写回、Restore State、重启），底部注记与 PCI 功耗态表">
<defs><marker id="arrh" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="arr-head"/></marker></defs>
<style>
.lane-bg { fill: var(--anatomy-paper); }
.lane-edge { stroke-width: 2.5; fill: var(--anatomy-paper); }
.c-sw { stroke: ${DRV}; }
.c-hc { stroke: ${HC}; }
.c-dev { stroke: ${DEV}; }
.lane-name { font: 700 21px var(--anatomy-ui, sans-serif); }
.lane-name.c-sw { fill: ${DRV}; }
.lane-name.c-hc { fill: ${HC}; }
.lane-name.c-dev { fill: ${DEV}; }
.lane-sub { font: 500 14px var(--anatomy-ui, sans-serif); fill: var(--anatomy-muted); }
.lane-life { stroke: var(--anatomy-line-mid, #456); stroke-width: 1.3; stroke-dasharray: 3 6; }
.box { fill: ${THEME === "light" ? "#f4f2ee" : "#232327"}; stroke-width: 1.6; }
.box-t { font: 500 16px var(--anatomy-ui, sans-serif); fill: var(--anatomy-line-hi); }
.box-t.b { font-weight: 700; }
.box-p { font: 500 13px var(--anatomy-mono, monospace); fill: var(--anatomy-line-mid); }
.numbg { fill: var(--anatomy-shade-2); stroke: var(--anatomy-line-mid); stroke-width: 1.2; }
.num { font: 700 17px var(--anatomy-ui, sans-serif); fill: var(--anatomy-text); }
.arr { stroke: ${THEME === "light" ? "#33333a" : "#d8d8dc"}; stroke-width: 2.4; fill: none; }
.arr.dash { stroke-dasharray: 6 5; }
.arr-head { fill: ${THEME === "light" ? "#33333a" : "#d8d8dc"}; }
.arr-t { font: 500 14.5px var(--anatomy-ui, sans-serif); fill: var(--anatomy-line-mid); }
.notebox { fill: none; stroke: ${THEME === "light" ? "#5a5a62" : "#a8a8b0"}; stroke-width: 1.6; stroke-dasharray: 8 6; }
.note-t { font: 500 14.5px var(--anatomy-ui, sans-serif); fill: ${THEME === "light" ? "#5a5a62" : "#a8a8b0"}; }
</style>${g}</svg>`;
}

// ================= 页面 =================
const navHtml = `
<nav class="spec-nav">
  <a href="../../index.html">← 规范目录</a>
  <span class="nav-title">§4.23 电源管理</span>
  <span class="nav-sib">
    <a href="../4.22-xhci-extended-capabilities/index.html" title="§4.22 xHCI 扩展能力">上一节 §4.22</a>
    <a href="../4.24-host-controller-management/index.html" title="§4.24 主机控制器管理">下一节 §4.24</a>
  </span>
</nav>
<p class="spec-ref">xHCI 1.2b §4.23 Power Management · p310–326 · §4.23.1 Power Wells p310 / §4.23.2 xHCI Power Management p311 / §4.23.2.1 Save and Restore Operations p314 / §4.23.3 PCI Power Management p315 / §4.23.4 USB Power Management p315 / §4.23.5 USB Link Power Management p315–326 · Appendix A p557–558（页码已机核，见 EVIDENCE.md）</p>`;

const proseHtml = `
<section class="spec-block">
  <h2>规范要义</h2>
  <p>本节把散在规范各处的电源机制收拢成一张总图。xHC 有两口电源井：<b>Core 井</b>（核心逻辑）与 <b>Aux 井</b>（辅助供电，若支持）——Core 井可被系统关断，Aux 井从上电起常在（§4.23.1 p310）。本页「xHCI 驱动」即规范原文所称 system software（系统软件）。软件要把 xHC 停电再续命，靠一对 USBCMD 控制位：<b>Save State（CSS）</b>与 <b>Restore State（CRS）</b>——寄存器读得走的状态直接存档；寄存器看不见的内部状态（如 ERDP 关联的 Ring Cycle State、已启用的 Device Slots 集合）也必须一起保存恢复，且两旗只在停机态（R/S='0'）可置（p311–312）。</p>
  <p>井的规则决定「什么会复位、什么能活过断电」：Core 井内存寄存器在 Chip Hardware Reset、HCRST、D3hot→D0 转换时回默认；Aux 井只在初次上电或 HCRST 时复位——PME 唤醒上下文因此能活过 Core 井断电（p310–311）。PCI 侧 D0→D3hot→D3cold 的功耗态迁移（Appendix A，§4.23.3 所指）加上 Save/Restore 两个操作，构成系统挂起→唤醒→恢复的完整主线（本页泳道图与机器）；软件出 D0 前还必须先把全部 Enabled 下游端口置 USB 挂起（p557）。端口级挂起/恢复的时序细节在 <a href="../4.15-suspend-resume/index.html">§4.15</a>；运行期更浅的链路低功耗态（USB2 L1 / USB3 U1·U2）由 <b>§4.23.5</b> 管理——根集线器端口 LPM 机制（Table 4-12 状态映射）＋ Slot Context <b>Max Exit Latency</b> 调度机制，后者以一个最坏唤醒延迟值供 xHC 对 SS Isoch 提前发 PING 唤链（p324–326）。§4.23.4 本身只做指路：USB2/USB3 细节归各自规范，USB PD 走 ACPI（p315）。</p>
  <p>下方机器「电源井配电台」以 D3 进出＋寄存器丢失恢复为主线：台顶两口井柜供着 xHC——Core 井闸刀一拉，寄存器面板熄灭回默认、D 态转筒走 D3hot→D3cold、Aux 井灯不灭；软件侧镜像柜存三份镜像（寄存器十组 / xHC 内部态 / 内存镜像），CSS/CRS 双旗只在停机态可推；唤醒回 D0 后寄存器先写回、Restore 后执行，写 CRCR 合闸 R/S='1' 复跑。链路 LPM（U1/U2·MEL）以对照帧与注记板承载，端口挂起时序互链 §4.15 不在本机复现。</p>
</section>`;

const quoteHtml = `
<section class="spec-block">
  <h2>原文对照</h2>
  <blockquote><p class="q">“When system software decides to power down the xHC with the intent of resuming operation at a later time, it shall read the xHC registers and save their state.”</p><p class="cite">(xHCI 1.2b §4.23.2 p311)</p><p class="zh">停电前的总纲：寄存器状态读出保存，上电回 Run 前全部写回——Save/Restore 这对操作的存在理由。</p></blockquote>
  <blockquote><p class="q">“The Save State and Restore State flags may only be set when the xHC is Stopped (Run/Stop (R/S) = ‘0’).”</p><p class="cite">(xHCI 1.2b §4.23.2 p312)</p><p class="zh">两旗（CSS/CRS）只在停机态可置——挂起/恢复的入口门槛。</p></blockquote>
  <blockquote><p class="q">“Note: The state of a Root Hub port is not covered by a Save or Restore operation.”</p><p class="cite">(xHCI 1.2b §4.23.2.1 p314 Note)</p><p class="zh">根集线器端口不在 Save/Restore 覆盖内——端口与拓扑由软件在恢复时重走（恢复步 9）。</p></blockquote>
  <blockquote><p class="q">“Note: xHC implementations shall support Link Power Management for all USB protocols that it supports.”</p><p class="cite">(xHCI 1.2b §4.23.5 p315–316)</p><p class="zh">LPM 不是可选项：xHC 支持的每种 USB 协议都必须支持链路电源管理——具体特性看 Supported Protocol Capability（§7.2.2.1.3）。</p></blockquote>
  <blockquote><p class="q">“It is not practical for the xHC to track the state of every link in the USB topology, so the Max Exit Latency field in the Slot Context identifies the worst case exit latency for the links and hubs between the xHC and the device when scheduling transfers to power managed devices.”</p><p class="cite">(xHCI 1.2b §4.23.5.2 p324)</p><p class="zh">xHC 不逐链路跟踪状态——用 Slot Context 的 Max Exit Latency 一个最坏值兜住整条路径，调度按它留余量。</p></blockquote>
</section>`;

const laneCard = k.plateHtml({
  fig: "流程",
  title: "§4.23 系统挂起与恢复主线：三方泳道总览",
  hint: "放大看小框文字 · 全屏后滚轮浏览",
  readout: "9 步 · p310–p558",
  keys: [
    { mark: "raised", label: "实线箭头＝软件写入流；虚线＝设备唤醒流（resume/LFPS→PME#，p254–255/p557）" },
    { mark: "dim", label: "虚线注记框＝机制补充：FSC/Idle、镜像物理地址、两口井复位纪律、SRE 出错面、LPM 支线（p310–326）" },
    { mark: "edge", label: "设备泳道＝唤醒方：只见链路信令与 VBus；端口挂起时序归 §4.15（互链不复现）" },
  ],
  caption: "挂起主线：停端点→读寄存器→CSS→存镜像→断 Core 井进 D3；唤醒 PME 回 D0→镜像回原址→写回九组→CRS→写 CRCR 合闸；端口态不在覆盖内，由软件重走。",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="§4.23 电源管理三方泳道总览图，九步，可放大平移。">${laneSvg()}<span role="status" aria-live="polite" data-status></span></div>` + zoomBarHtml("放大看框内文字 · 全屏后滚轮浏览"),
});

const machineCtlHtml = `<div class="fig-ctl" role="toolbar" aria-label="动画控制条">
  <button type="button" data-act="prev">◀ 上一帧</button>
  <button type="button" data-act="next">下一帧 ▶</button>
  <button type="button" data-act="tour" aria-pressed="false">自动巡游</button>
  <button type="button" data-act="reset">⟲ 复位</button>
  <span class="fig-ctl-hint">键盘：空格/点击步进 · ← → 换帧 · Home 回全景 · A 巡游</span>
</div>`;

const figCard = k.plateHtml({
  fig: "§4.23 动画",
  title: "电源井配电台：断 Core 井进 D3，镜像柜三份保命，Restore 回 D0",
  hint: "控制条步进/巡游 · 点击或空格步进 · ← → 换帧 · Home 回全景 · A 巡游",
  readout: "步 0/11 · 井 Core 开 · xHC D0 · 旗 — · 镜像 0/3",
  keys: [
    { mark: "lit", label: "台顶两口井柜＝电源井对（p310）：Core 井带供电闸刀可断（断电=移除 Core Well，p312 步 10）；Aux 井常在——PME 唤醒上下文活过断电（p310–311）" },
    { mark: "raised", label: "镜像柜三抽屉＝软件保存的三份镜像：寄存器十组（存档步 5）/ xHC 内部态（CSS 存 RCS·Enabled Slots）/ 内存镜像（DCBAA·Contexts·环，p312）——Restore 须回同一物理地址（p314 Note）" },
    { mark: "edge", label: "CSS/CRS 双旗＝USBCMD 控制位，只在停机态可置（p312）；SSS/RSS=完成判据（转 '0'），SRE=保存态损坏报错（p313–314）；寄存器面板窗=Core 井内存寄存器（断电回默认 p311）" },
    { mark: "dim", label: "D 态转筒＝PCI 功耗态（Table A-1 p557）；PME 唤醒=设备发 resume/LFPS（§4.15.2.1）→ xHC 断言 PME#（p557）；链路 LPM（U1/U2·MEL）见 F10 对照帧与注记板" },
  ],
  caption: "电源井配电台的铁律：寄存器先写回、Restore 后执行——Restore 会盖掉复位默认值（p313 Note）；两口井复位条件不同，决定哪些状态能活过断电（p310–311）。",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-valuenow="1" aria-label="电源井配电台，十二帧：全景、停端点停机、读寄存器、Save State、存内存镜像、断 Core 井、唤醒 PME、上电回 D0、Restore State、重启复跑、链路 LPM 对照、MEL 读数巡回。点击或空格步进。">${svg}<span role="status" aria-live="polite" data-status></span></div>` + machineCtlHtml + zoomBarHtml(),
});

const tableHtml = `
<section class="spec-block">
  <h2>电源井 · PCI 功耗态 · 链路电源状态对照（§4.23.1 · Appendix A · Table 4-12）</h2>
  <table class="xsp-tb">
  <tr><th>项</th><th>Core 井（核心供电）</th><th>Aux 井（辅助供电）</th><th>页</th></tr>
  <tr><td><b>供电形态</b></td><td>可被系统关断</td><td>AC 供电期间常在（若支持）</td><td class="mono">p310</td></tr>
  <tr><td><b>内存寄存器复位</b></td><td>Chip Hardware Reset · HCRST='1' · D3hot→D0</td><td>Aux 井初次上电 · HCRST='1'</td><td class="mono">p310–311</td></tr>
  <tr><td><b>配置空间复位</b></td><td>系统（Core 井）硬件复位 · D3hot→D0</td><td>Aux 井初次上电</td><td class="mono">p311</td></tr>
  <tr><td><b>轻复位 LHCRST 后</b></td><td>不在 Aux 井内的 Operational/Runtime 回默认</td><td>全部保持复位前原值</td><td class="mono">p311</td></tr>
  <tr><td><b>例外/边界</b></td><td>D3cold 断 Core 井的方法属平台级，规范不管</td><td>USB Legacy Support Capability 寄存器不循 Aux 复位规则</td><td class="mono">p311</td></tr>
  </table>
  <table class="xsp-tb">
  <tr><th>PCI PM 功耗态（Table A-1）</th><th>规范要求</th><th>语义</th><th>页</th></tr>
  <tr><td><b>D0</b></td><td>必需</td><td>全醒——全部逻辑全功率，向后兼容</td><td class="mono">p557</td></tr>
  <tr><td><b>D1</b></td><td>可选</td><td>USB 睡眠态，总线主控能力关，全部 USB 端口挂起；回 D0 延迟低</td><td class="mono">p557</td></tr>
  <tr><td><b>D2</b></td><td>可选</td><td>USB 睡眠态，总线主控能力关，全部 USB 端口挂起</td><td class="mono">p557</td></tr>
  <tr><td><b>D3hot</b></td><td>必需</td><td>深 USB 睡眠态，总线主控能力关，全部 USB 端口挂起</td><td class="mono">p557</td></tr>
  <tr><td><b>D3cold</b></td><td>必需</td><td>全睡——下游设备挂起或断电（取决于实现的下游供电能力）</td><td class="mono">p557</td></tr>
  </table>
  <p>注：软件出 D0 前必须把全部 Enabled 下游端口置 USB 挂起；xHC 按 PCI PM 规范断言 PME# 并保留芯片上下文（均 p557）；D3hot→D0 转换伴随内部复位，PMCSR.PME_Status/PME_En 必须保持（A.1.1 p558）。</p>
  <table class="xsp-tb">
  <tr><th>链路态族（Table 4-12）</th><th>USB2 编码</th><th>USB3 编码</th><th>语义</th><th>页</th></tr>
  <tr><td><b>On</b></td><td class="mono">L0</td><td class="mono">U0</td><td>正常运行——全部包通信都在此态</td><td class="mono">p316</td></tr>
  <tr><td><b>细粒度 LPM</b></td><td class="mono">无</td><td class="mono">U1</td><td>低退出延迟待机——回 On 快于 ~10 μs</td><td class="mono">p316</td></tr>
  <tr><td><b>粗粒度 LPM</b></td><td class="mono">L1（Sleep）</td><td class="mono">U2</td><td>中等退出延迟待机——回 On 约 ~1 ms；L1↔U2 因同为约 1 ms 量级而互映</td><td class="mono">p316</td></tr>
  <tr><td><b>Suspend</b></td><td class="mono">L2</td><td class="mono">U3</td><td>深省电=USB 挂起的正式名；VBUS 保持；退出经远程唤醒/resume/复位/拔出</td><td class="mono">p316</td></tr>
  <tr><td><b>Off</b></td><td class="mono">L3</td><td class="mono">未定义</td><td>无数据信令；VBUS 断</td><td class="mono">p317</td></tr>
  </table>
  <p>注：PLS 字段报告当前链路态、解释随 Port Speed 而变——LS/FS/HS 端口永不报 U1（p317）；USB2 软件发起 L1=写 PLS='2' 起 LPM 事务，L1S 记 ACK=Success / NYET=Not Yet / STALL=Not Supported（后两者置 PLC 出端口状态变化事件，p317–318）；硬件控制 LPM（HLC/HLE）由 LPM Timer 超时自动进 L1，HIRD/BESL 两法、BESL 自 xHCI 1.1/1.2 起强制（§4.23.5.1.1.1 p318–324）。</p>
</section>
<section class="spec-block">
  <h2>Save/Restore 流程要点表（§4.23.2–4.23.2.1）</h2>
  <table class="xsp-tb">
  <tr><th>阶段</th><th>要点</th><th>页</th></tr>
  <tr><td><b>共同前提</b></td><td>Save State/Restore State 只在停机态（R/S='0'）可置；寄存器可见状态与内部状态（ERDP 关联的 RCS、Enabled Device Slots 等）都要保存恢复</td><td class="mono">p311–312</td></tr>
  <tr><td><b>存前停活动</b></td><td>Stop Endpoint 停 Running:Busy 端点；FSC='0' 实现连 Running:Idle 也停（xHCI 1.1/1.2 起强制 FSC='1'）；命令环 Stopped（CRR='0'）或空、完成事件收讫</td><td class="mono">p312</td></tr>
  <tr><td><b>存寄存器</b></td><td>按序读 USBCMD、DNCTRL、DCBAAP、CONFIG、ERSTSZ、ERSTBA、ERDP、IMAN、IMOD、VTIO；CSS='1'→等 SSS='0'</td><td class="mono">p312</td></tr>
  <tr><td><b>存内存镜像</b></td><td>SPR='1' 且 Max Scratchpad Buffers&gt;'0' 先存 Scratchpad；再存 DCBAA/Contexts 等被引用结构（整棵树+命令环/事件环+Scratchpad 归软件保存）</td><td class="mono">p312</td></tr>
  <tr><td><b>断电</b></td><td>移除 Core 井电；内部状态有效到进 D3cold 为止</td><td class="mono">p312–313</td></tr>
  <tr><td><b>上电恢复</b></td><td>Core 井上电→镜像回原物理地址→按序写回 DNCTRL…VTIO→CRS='1'→等 RSS='0'（次序硬规则：寄存器先写回、Restore 后执行）</td><td class="mono">p312–313</td></tr>
  <tr><td><b>重启</b></td><td>命令环重初始化（Cycle 对齐 RCS）→写 CRCR 重启→R/S='1'→走拓扑初始化 PORTSC/PORTPMSC/PORTLI→逐端点门铃重启</td><td class="mono">p313</td></tr>
  <tr><td><b>出错与边界</b></td><td>SRE 检查：保存态损坏→SRE='1'、Restore 终止、RSS 清 0；Save 后先 Run 再 Restore→Restore 完成时报 SRE（Aux 井保住才报）；端口态不在覆盖内；镜像必须回同一物理地址；未进 D3cold 就重启则 Restore 非必需</td><td class="mono">p313–315</td></tr>
  </table>
</section>`;

const linksHtml = `
<section class="spec-block">
  <h2>相关</h2>
  <ul class="links">
    <li><a href="../4.22-xhci-extended-capabilities/index.html">§4.22 xHCI 扩展能力</a>（上一节）——USB Legacy Support 能力=Aux 井复位规则的例外所在</li>
    <li><a href="../4.24-host-controller-management/index.html">§4.24 主机控制器管理</a>（下一节）——xHC 管理面的相邻节</li>
    <li><a href="../4.15-suspend-resume/index.html">§4.15 挂起与恢复</a>——主线两处互链：出 D0 前的端口选择性挂起（Wr PLS=U3+LWS）与设备发起唤醒（resume/LFPS→PME#）的端口级时序展开</li>
    <li><a href="../4.20-scratchpad-buffers/index.html">§4.20 暂存缓冲区</a>——SPR 位与 Scratchpad 镜像的保存边界</li>
    <li><a href="../4.2-host-controller-init/index.html">§4.2 主机控制器初始化</a>——HCRST 复位语义（两口井复位条件的公共项）与 R/S 合闸次序</li>
    <li><a href="../4.21-pci-express/index.html">§4.21 PCI Express</a>——BME 停机时序（同为断电前的软件前置）</li>
    <li><a href="../../index.html">§5.4.1 USBCMD（待建）</a>——CSS/CRS/LHCRST 位定义；<a href="../../index.html">§5.4.2 USBSTS（待建）</a>——SSS/RSS/SRE 状态位；<a href="../../index.html">§5.4.9 PORTPMSC（待建）</a>——L1S/HLE/RWE/BESL 字段；<a href="../../index.html">Appendix A xHCI PCI 电源管理接口（待建）</a>——D 状态迁移与 PME 全貌</li>
  </ul>
</section>`;

const footerHtml = `<footer class="spec-foot">判据：xHCI 1.2b（625472 Rev 1.2b）§4.23 p310–326 · 引文逐字核对，证据见 <a href="EVIDENCE.md">EVIDENCE.md</a> · 生成于 2026-11-04</footer>`;

const pageCss = `
<style>
${CSS}${zoomFsCss()}
.spec-nav { display: flex; align-items: baseline; gap: 18px; flex-wrap: wrap; padding: 18px 6px 6px; }
.spec-nav a { color: var(--anatomy-muted); text-decoration: none; font-size: 15px; }
.spec-nav a:hover { color: var(--anatomy-text); text-decoration: underline; }
.nav-title { font-size: 24px; font-weight: 700; color: var(--anatomy-text); }
.nav-sib { margin-left: auto; display: flex; gap: 16px; }
.spec-ref { color: var(--anatomy-muted); font: 500 14px var(--anatomy-mono, monospace); padding: 0 6px 14px; margin: 0; }
.spec-block { padding: 10px 6px 4px; }
.spec-block h2 { font-size: 20px; color: var(--anatomy-text); margin: 14px 0 10px; }
.spec-block p { font-size: 16.5px; line-height: 1.75; color: var(--anatomy-text); margin: 0 0 12px; max-width: 68em; }
.spec-block p b { color: var(--anatomy-text); }
blockquote { margin: 0 0 14px; padding: 10px 16px; border-left: 3px solid var(--anatomy-line-mid); background: var(--anatomy-shade0); border-radius: 0 6px 6px 0; }
blockquote p.q { font: 500 15px/1.6 var(--anatomy-mono, monospace); color: var(--anatomy-text); margin: 0 0 4px; }
blockquote p.cite { font: 500 12.5px var(--anatomy-mono, monospace); color: var(--anatomy-muted); margin: 0 0 6px; }
blockquote p.zh { font-size: 15.5px; line-height: 1.6; color: var(--anatomy-line-hi); margin: 0; }
ul.links { list-style: none; padding: 0; margin: 0; }
ul.links li { padding: 7px 0; border-bottom: 1px dashed var(--anatomy-line-lo); }
ul.links a { color: var(--anatomy-text); font-size: 16px; text-decoration: underline; text-underline-offset: 3px; }
ul.links li { color: var(--anatomy-muted); font-size: 15px; }
.spec-foot { color: var(--anatomy-muted); font: 500 13px var(--anatomy-mono, monospace); padding: 22px 6px 30px; }
.fig-ctl { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 4px 6px 2px; }
.fig-ctl button { font: 500 13px var(--anatomy-ui, system-ui, sans-serif); color: var(--anatomy-muted); background: transparent; border: 1px solid var(--anatomy-line-mid, #456); border-radius: 4px; padding: 4px 12px; cursor: pointer; }
.fig-ctl button[aria-pressed="true"] { color: var(--anatomy-text); border-color: var(--anatomy-text); }
.fig-ctl button:hover { border-color: var(--anatomy-text); }
.fig-ctl .fig-ctl-hint { color: var(--anatomy-muted); font: 500 12px var(--anatomy-mono, monospace); }
@media print { .fig-ctl { display: none; } }
table.xsp-tb { border-collapse: collapse; width: 100%; max-width: 90em; margin: 6px 0 10px; }
table.xsp-tb th { text-align: left; font: 600 14.5px var(--anatomy-ui, sans-serif); color: var(--anatomy-text); border-bottom: 2px solid var(--anatomy-line-mid); padding: 8px 10px; }
table.xsp-tb td { font: 400 14.5px/1.7 var(--anatomy-ui, sans-serif); color: var(--anatomy-line-hi); border-bottom: 1px dashed var(--anatomy-line-lo); padding: 8px 10px; vertical-align: top; }
table.xsp-tb td.mono { font: 500 12.5px var(--anatomy-mono, monospace); color: var(--anatomy-muted); white-space: nowrap; }
</style>`;

const body = pageCss + navHtml + proseHtml + quoteHtml + `<div class="lane-wrap">` + laneCard + `</div>` + `<div class="fig-wrap">` + figCard + `</div>` + tableHtml + footerHtml;

// zoomfs：两实例 scoped（第二实例不覆盖 window.__zfs）
const zoomFor = (ix, focus, winName) => zoomFsScript({ focus })
  .replace('document.querySelector(".iso-stage")', `document.querySelectorAll(".iso-stage")[${ix}]`)
  .replace('document.querySelector(".iso-zoombar")', `document.querySelectorAll(".iso-zoombar")[${ix}]`)
  .replace("window.__zfs =", `window.${winName} =`);

const geoSource = readFileSync(join(HERE, "geometry-live.mjs"), "utf8").replace(/^export /gm, "");
const geoScript = `const makeLiveGeo = ${geoSource.replace("function makeLiveGeo", "function makeLiveGeo")};\n`;
const latheSource = readFileSync("/Users/jason/.zcode/skills/anatomy/kit/lathe.mjs", "utf8")
  .replace(/^import .*$/m, "")
  .replace(/^export /gm, "");
const latheScript = `const G = (() => {${latheSource}\nreturn { viewOf, scaleOf, frameAlong, frameOf, pointOf, disc, ringBand, sphereOf, prismOf, circleOf, arcOf, ribsOf, dot3, add3, sub3, mul3, unit3, cross3, len3 };})();\n`;
const live = readFileSync(join(HERE, "live.mjs"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const script = kitScript() + latheScript + geoScript + live
  + zoomFor(0, ["#lane-svg .notebox"], "__zfsLane")
  + zoomFor(1, ['[data-name="con.body"]', '[data-name="well.core"]'], "__zfs");

const page = k.pageHtml({ title: "§4.23 电源管理 · xHCI 规范对照学习", theme: THEME, body, script, width: 1500 });
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} items`, `scale ${KS.toFixed(3)}`);

A.auditOrExit(R, P, {});

// §4.19 根集线器 —— anatomy 机器「根集线器枢纽台」+ 静态状态机总览卡 + 表格卡
// 判据：xHCI 1.2b §4.19 p272–303（断言逐条见 EVIDENCE.md）；§4.20 起于 p303。
// 概念一句话：端口状态转筒走到哪一格，变化位灯排按跳变点亮哪几盏；七位 OR 起来
//   过 HCH 门成为 PSCEG，0→1 跳变推一张端口状态变化事件卡入事件匣；
//   驱动读 PORTSC、写 '1' 清位——位全清 PSCEG 归零，该口才再开闸收下一事件。
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
// 写入面板（台面后沿立板）：清位拉杆 + 说明刻字
const PANEL = { x: -208, y: -88, w: 64, d: 3, r: 1 };
const PANEL_FACE = -84.95;
// PORTSC 读数条（台面平嵌——低平件不遮挡写入卡槽/事件匣；读数窗入 labels 层）
const PSC = { x: -210, y: -33, w: 64, d: 20, r: 1 };
// 注记牌两块（中段）：USB3 对照 / 变化位纪律
const BOARD1 = { x: -126, y: -92, w: 76, d: 3, r: 1 };
const BOARD2 = { x: -126, y: -26, w: 76, d: 3, r: 1 };
// 总控台（xHC）：x -40..96, y -104..36, z 12..96（台沿 lid 至 99）
const CON = { x: -40, y: -104, w: 136, d: 140, r: 3 };
const FACE_Y = 36.05;
// 教学锚牌（台前：读清才再开闸）
const ANC = { x: -8, y: 46, w: 60, d: 1.6, r: 0.8 };
// 总线链路（台身右面 → 设备左面，y=-16 带）
const LINK = { x0: 98, x1: 156, y: -16, z: 26 };
// 设备试验盒（右）
const BOX = { px: 150, py: -56, pw: 64, pd: 112, tx: 158, ty: -48, tw: 48, td: 96 };
const BOX_FACE = 48.05;

// ================= projection / helpers =================
const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
   ...k.boxCorners({ x: CON.x - 3, y: CON.y - 3, w: CON.w + 6, d: CON.d + 6, r: 2 }, 96, 3),
   [-218, -118, 109], [-60, -112, 109], [-70, -62, 102], [-47, -40, 102], [-36, -96, 125], [10, -93, 125], [60, -96, 132], [99, -93, 132],
   [130, 23, 64], [146, 40, 34], [218, 106, 72], [214, 61, 34],
   [-215, -95, 67], [-215, -1, 36], [-126, -23, 58], [156, 48, 60]],
  W, H, { pad: 16, azimuth: AZ, elevation: EL },
);
const KS = G.scaleOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const f2 = (v) => Math.round(v * 100) / 100;
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
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
  states: ["Disconnected", "Disabled", "Reset", "Enabled·U0", "U3", "Resume", "Powered-off"],
  pls: ["RxDetect", "Polling", "Undefined", "U0", "U3", "Resume", "Disabled"],
  drum: { x0: -37, x1: 1, z0: 56, z1: 80 },
  lamps: [
    { key: "csc", x: 10, name: "CSC", sub: "连接" },
    { key: "pec", x: 22.5, name: "PEC", sub: "使能" },
    { key: "wrc", x: 35, name: "WRC", sub: "温复位" },
    { key: "occ", x: 47.5, name: "OCC", sub: "过流" },
    { key: "prc", x: 60, name: "PRC", sub: "复位" },
    { key: "plc", x: 72.5, name: "PLC", sub: "链路态" },
    { key: "cec", x: 85, name: "CEC", sub: "配置错" },
  ],
  psceg: { x0: 8, x1: 78, z0: 26, z1: 54 },
  hch: { x: 89, z: 40 },
  note: { x0: -34.5, x1: -38 + 46, faceY: -92.95, z0: 99, z1: 124 },
  portsc: { x0: -207, y0: -33 },
  lever: { px: -166, pz: 46 },
  wcard: { x: -208, y: -50, w: 20, z: 35, h: 17 },
  tray: { x: -160, y: -51, z: 42.2 },
  carr: { xA: 104, xD: 148, y: -16, zTop: 28.5 },
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
  labelText(vtext(mp.x + 4, mp.y + mp.d + 0.05, 25.1, "xHCI 驱动", 9, "drv")
    + vtext(mp.x + 4, mp.y + mp.d + 0.05, 17.4, "规范称 system software", 6, "mid"));
}
// 写入面板（立板）+ 清位拉杆 + 写入拉线端子柱
{
  slab("panel.body", PANEL, 33, 31, { tone: "mid" }, { steps: 2, extra: screwDots({ x: PANEL.x + 3, y: PANEL.y + 0.4, w: PANEL.w - 6, d: PANEL.d - 0.8 }, 2, 64) });
  // 清位拉杆：铰盘（实体）+ 压下触点垫（实体）；臂 live 重建
  const lpF = G.frameOf([DATA.lever.px, PANEL_FACE + 0.05, DATA.lever.pz], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  put("lever.hinge", [DATA.lever.px, PANEL_FACE + 1.2, DATA.lever.pz],
    S(G.disc(0, 1.4, 2.6, lpF, P, { steps: 16, bevel: 0.2 }), { tone: "mid" })
    + Ln(G.circleOf(lpF, 0, 2.6, P, 16), { tone: "lo" }),
    [record(A.disc(lpF, 0, 1.4, 2.6, { name: "lever.hinge", owner: "panel.body" }))], { bias: 0.25 });
  const cpF = G.frameOf([-154.5, PANEL_FACE + 0.05, 44.4], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  put("lever.contact", [-154.5, PANEL_FACE + 1.1, 44.4],
    S(G.disc(0, 1.1, 1.9, cpF, P, { steps: 14, bevel: 0.2 }), { tone: "hi" }),
    [record(A.disc(cpF, 0, 1.1, 1.9, { name: "lever.contact", owner: "panel.body" }))], { bias: 0.25 });
  labelText(`<g data-part="lever">${geo.leverSvg(0)}</g>`);
  labelText(
    vtext(-206, PANEL_FACE + 0.05, 60.8, "清位闸：写 '1' 清变化位（p291）", 3.8, "hi")
    + vtext(-206, PANEL_FACE + 0.05, 55.6, "清零才再开闸（p293）", 3.6, "lo")
    + vtext(-206, PANEL_FACE + 0.05, 38.6, "PORTSC 写入经此闸下达", 3.6, "lo"));
  // 写入拉线端子柱（面板顶）
  cyl("panel.term", -176, -86.5, 1.2, 64, 3, { tone: "mid" }, { steps: 12, bevel: 0.2, extra: Ln(k.ring(-176, -86.5, 0.5, 67, P, 10), { tone: "lo" }) + Dots([at([-176, -86.5, 67])], { size: 0.4, tone: "hi" }) });
}
// 写入卡槽（PORTSC 写入动作卡；卡 live 控制）
{
  slab("slot.base", { x: -210, y: -58, w: 24, d: 17.4, r: 1 }, 33, 2.2, { tone: "lo" }, { steps: 2, extra: Ln(k.planOutline(k.insetPlan({ x: -210, y: -58, w: 24, d: 17.4, r: 1 }, 2), 35.2, P, 3), { tone: "faint" }) });
  slab("slot.lip", { x: -210, y: -40.6, w: 24, d: 3.6, r: 1 }, 33, 5, { tone: "mid" }, { steps: 2 });
  put("wcard", [-198, -49, 43.5], `<g data-part="wcard" style="display:none"></g>`,
    [record(A.slab({ x: DATA.wcard.x, y: DATA.wcard.y, w: DATA.wcard.w, d: 2, r: 0.5 }, DATA.wcard.z, DATA.wcard.h, { name: "wcard", owner: "slot.base" }, 2))], { bias: 0.2 });
  labelText(topText([-196, -36.5], 33.02, "写入卡槽", 4.4, "lo"));
}
// 事件匣（端口状态变化事件回执落位）
slab("tray.event", { x: -182, y: -64, w: 44, d: 26, r: 1.4 }, 33, 3.6, { tone: "hi" }, { steps: 3, bevel: 0.4 });
slab("tray.event.lip", { x: -138, y: -65, w: 1.6, d: 28, r: 0.6 }, 33, 5.2, { tone: "mid" });
labelText(topText([-160, -36.5], 33.02, "事件匣", 5.4, "mid"));
// PORTSC 读数条（台面平嵌低平件；读数行入 labels 层 live 重建）
{
  slab("desk.portsc", PSC, 33, 0.8, { tone: "hi", crease: "none" },
    { steps: 3, extra: Ln(k.planOutline(k.insetPlan(PSC, 1.6), 33.8, P, 3), { tone: "faint" }) });
  labelText(`<g data-part="portsc">${geo.portscSvg(DATA.pls[0], [1, 0, 0, 0], "—", "—")}</g>`);
}

// ================= 注记牌两块（中段立板） =================
{
  slab("board.usb3", BOARD1, PLATE_H, 46, { tone: "lo" }, { steps: 2 });
  labelText(
    vtext(BOARD1.x + 3, BOARD1.y + BOARD1.d + 0.05, PLATE_H + 39.6, "USB3 对照（p279–294）", 5.8, "hi")
    + vtext(BOARD1.x + 3, BOARD1.y + BOARD1.d + 0.05, PLATE_H + 32, "attach 训练成功自动 Enabled·U0", 4.0, "mid")
    + vtext(BOARD1.x + 3, BOARD1.y + BOARD1.d + 0.05, PLATE_H + 24.4, "在场判据＝Polling→U0（p294）", 4.0, "mid")
    + vtext(BOARD1.x + 3, BOARD1.y + BOARD1.d + 0.05, PLATE_H + 17.6, "Disabled＝写 PED='1' 的禁用态", 4.0, "mid")
    + vtext(BOARD1.x + 3, BOARD1.y + BOARD1.d + 0.05, PLATE_H + 10.8, "复位可失败退 Disconnected（WRC）", 4.0, "mid")
    + vtext(BOARD1.x + 3, BOARD1.y + BOARD1.d + 0.05, PLATE_H + 4.6, "Connect Detect＝远端终端电阻（p293）", 3.8, "lo"));
  // 变化位纪律板迁台顶东段（board.bits）——中段南槽让空，避开立面窗组的屏幕带
}

// ================= 总控台（xHC · 根集线器） =================
{
  slab("con.body", CON, PLATE_H, 84, { tone: "mid" }, { steps: 4, bevel: 0.8, inner: Ln(k.sideSeam(CON, 60, P, 4), { tone: "faint" }) });
  slab("con.lid", { x: CON.x - 3, y: CON.y - 3, w: CON.w + 6, d: CON.d + 6, r: 2 }, 96, 3, { tone: "mid" },
    { steps: 4, bevel: 0.5, extra: screwDots({ x: CON.x - 1, y: CON.y - 1, w: CON.w + 2, d: CON.d + 2 }, 8, 99) });
  // 台顶：出卡口 + 事件出口短管 + 注记立板（台面平刻）；铭牌刻立面（顶面长文会斜带扫过中段低板）
  labelText(
    topText([-54, -98], 99.02, "RH-1", 4.0, "lo")
    + topText([36, -66], 99.02, "端口状态变化事件 出卡口", 4.2, "lo", "start"));
  slab("con.evslot", { x: 18, y: -84, w: 30, d: 16, r: 1 }, 99, 2.6, { tone: "lo" }, { steps: 2 });
  cyl("con.evstub", 56, -72, 1.8, 99, 5, { tone: "lo" }, { steps: 18 });
  // 注记立板（台顶西段；帧相关机制句 ≤3 行）
  slab("con.noteboard", { x: -36, y: -96, w: 46, d: 3, r: 1 }, 99, 25, { tone: "lo" }, { steps: 2, extra: screwDots({ x: -33, y: -95.4, w: 40, d: 1.8 }, 1.6, 123) });
  // 变化位纪律立板（台顶东段——中段让位给立面窗组；帧 F9 点亮）
  slab("board.bits", { x: 60, y: -96, w: 39, d: 3, r: 1 }, 99, 32, { tone: "lo" }, { steps: 2, extra: screwDots({ x: 63, y: -95.4, w: 33, d: 1.8 }, 1.6, 129) });
  labelText(
    vtext(63, -92.95, 127.6, "变化位与读清纪律", 3.8, "hi")
    + vtext(63, -92.95, 120.6, "写 '1' 清 · HCRST 亦可清", 3.4, "mid")
    + vtext(63, -92.95, 113.6, "位全清才再开闸（p293）", 3.4, "mid")
    + vtext(63, -92.95, 106.6, "读 PORTSC 与事件环", 3.4, "mid")
    + vtext(63, -92.95, 100.4, "无一致性保证（p292）", 3.4, "mid"));
  // 前立面：转筒窗 + PSCEG 门控窗 + 铭牌（窗组随文字入 labels 层）
  labelText(
    `<g data-part="drum">${geo.drumSvg(0)}</g>`
    + `<g data-part="psceg">${geo.pscegSvg([0, 0, 0, 0, 0, 0, 0], 0, false)}</g>`
    + `<g data-part="note" style="display:none"></g>`
    + vtext(40, FACE_Y, 87.6, "xHC · 根集线器", 5.4, "hc")
    + vtext(-37, FACE_Y, 85.2, "演示端口 · USB2 口 1", 4.2, "lo")
    + vtext(38, FACE_Y, 20.4, "根集线器每口一套 PORTSC（p291）", 3.8, "lo"));
  // 变化位灯排（七位）+ HCH 灯（标签行独立——CEC 灯在最东，HCH 标签不与它同带）
  const faceLamp = (name, x, z, lampKey, lab, sub, nameZ = 77.8, subZ = 56.6) => {
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
  for (const L of DATA.lamps) faceLamp(L.key, L.x, 70, L.key, L.name, L.sub);
  faceLamp("hch", DATA.hch.x, DATA.hch.z, "hch", "HCH", "Run 门", 47.5, 32.5);
  // 写入拉线端子（左面端子凸台：外端面 x=-42.2）
  const wf = G.frameOf([-40, 0, 58], [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
  put("con.writein", [-41.2, 0, 58], S(G.disc(0, 3.4, 2, wf, P, { steps: 18, bevel: 0.3 }), { tone: "mid" })
    + Ln(G.circleOf(wf, 3.4, 2, P, 18), { tone: "lo" }),
    [record(A.disc(wf, 0, 3.4, 2, { name: "con.writein", owner: "con.body" }))], { bias: 0.2 });
}

// ================= 教学锚牌（台前：读清才再开闸） =================
{
  slab("hub.anchor", ANC, PLATE_H, 16, { tone: "lo" }, { steps: 2 });
  labelText(
    vtext(ANC.x + 3, ANC.y + ANC.d + 0.05, PLATE_H + 11.4, "读清才再开闸", 5.4, "hi")
    + vtext(ANC.x + 3, ANC.y + ANC.d + 0.05, PLATE_H + 5.4, "PSCEG=0 才再收事件（p293）", 4.0, "mid"));
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
    topText([122, -7], PLATE_H + 0.02, "总线链路（演示 USB2）", 4.6, "mid")
    + topText([122, 0.5], PLATE_H + 0.02, "插头滑车＝设备插拔", 3.8, "lo"));
}
// 插头滑车（attach/detach 行走；home=未插停靠设备侧 x=148）
{
  const c = DATA.carr;
  const bodyPlan = { x: c.xD - 5, y: c.y - 4, w: 10, d: 8, r: 1 };
  const nf = G.frameOf([c.xD - 5, c.y, c.zTop + 4.7], [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
  put("carr", [c.xD, c.y, c.zTop + 4.7], `<g data-part="carr">${geo.carriageSvg(c.xD)}</g>`,
    [record(A.slab(bodyPlan, c.zTop, 9.5, { name: "carr.body", owner: "link.bed" }, 2)),
     record(A.disc(nf, 0, 1.6, 1.7, { name: "carr.plug", owner: "link.bed" }))], { bias: 0.35 });
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
    topText([170, 26], PLATE_H + 56.02, "USB 设备 · 插拔与唤醒之源", 6.2, "dev")
    + topText([170, 15], PLATE_H + 56.02, "只感到 VBus 与总线信令", 4.2, "mid"));
  // 设备窗 + 唤醒钮（窗组随文字入 labels 层）
  labelText(
    `<g data-part="devwin">${geo.devWinSvg("未上电", "无 VBus")}</g>`
    + `<g data-part="wakebtn">${geo.wakeBtnSvg(0)}</g>`
    + vtext(197, BOX_FACE, 31, "唤醒钮", 4.2, "lo", "middle"));
  // 教学锚长铭牌（基座前立牌）
  const np = { x: 152, y: 58, w: 62, d: 3, r: 1 };
  put("box.nameplate", [np.x + np.w / 2, np.y + np.d / 2, 14],
    S(k.slabOf(np, PLATE_H, 22, P, 2), { tone: "lo", crease: "none" })
    + Ln(path3([[np.x + 2, np.y + np.d + 0.05, PLATE_H + 2], [np.x + np.w - 2, np.y + np.d + 0.05, PLATE_H + 2]], false), { tone: "faint", free: true })
    + Dots([[np.x + 2.6, np.y + np.d + 0.2, PLATE_H + 19.4], [np.x + np.w - 2.6, np.y + np.d + 0.2, PLATE_H + 19.4]].map((p) => at(p)), { size: 0.45 }),
    [record(A.slab(np, PLATE_H, 22, { name: "box.nameplate" }, 2))], { bias: 0.15 });
  labelText(
    vtext(np.x + 3, np.y + np.d + 0.05, PLATE_H + 16.5, "插拔与上电之源", 5.6, "dev")
    + vtext(np.x + 3, np.y + np.d + 0.05, PLATE_H + 9.5, "只见插拔与总线信令", 4.0, "mid")
    + vtext(np.x + 3, np.y + np.d + 0.05, PLATE_H + 3.2, "PORTSC/变化位对设备不可见", 3.8, "mid"));
}

// ================= 线缆（写入拉线 / 事件回流管） =================
// 端点落位（audit 判据）：写入拉线两端=面板端子柱顶/总控台左面端子凸台外端面（rim 落面过
// terminals）；事件管两端=台顶短管口/事件匣内底（rim 落面）；链路票据路径为直线段。
const WIRE_WRITE = [[-176, -86.5, 68.5], [-158, -78, 79], [-120, -66, 93], [-72, -56, 102], [-48, -38, 101], [-48, -4, 84], [-47, 4, 68], [-46.5, 2, 60], [-44.1, 0, 58]];
const TUBE_EV = [[56, -72, 104], [56, -72, 107], [30, -108, 109], [-60, -112, 109], [-140, -106, 103], [-178, -88, 86], [-176, -64, 58], [-168, -49, 46], [-168, -49, 36.7]];
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

// 飞行事件卡（出卡口上方 home；live 重建）
put("ev.fly", [33, -76, 108], `<g data-part="evfly" style="display:none"></g>`,
  [record(A.slab({ x: 24, y: -80, w: 18, d: 2.6, r: 0.7 }, 101.6, 12, { name: "ev.fly", owner: "con.evslot" }, 2))], { bias: 0.3 });

// ================= settle + assemble =================
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const itemG = (it) => `<g class="it" data-name="${it.name}"${it.attrs ?? ""}>${it.svg}</g>`;
const seq = R.items.map(itemG);
seq.push(`<g class="fb-labels">${labels.join("")}</g>`);
seq.push(`<g data-part="actors-tokens"></g><g data-part="actors-events"></g>`);
const svg = k.figureSvg({
  width: W, height: H,
  label: "根集线器枢纽台：左文书台是 xHCI 驱动（规范称 system software）——读 PORTSC、写 '1' 清变化位；中总控台是 xHC——根集线器每个端口一套 PORTSC，端口状态转筒显 Disconnected/Disabled/Reset/Enabled·U0/U3/Resume/Powered-off，变化位灯排 CSC/PEC/WRC/OCC/PRC/PLC/CEC 按跳变点亮，七位 OR 过 HCH 门成 PSCEG，0→1 跳变推端口状态变化事件卡经出卡口入事件匣；右试验盒是设备——插头滑车走总线链路＝插拔，唤醒钮发 resume 信令；PORTSC 与变化位对设备不可见。",
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

// ================= 状态机总览卡（骨架版状态图沿用——坐标与审计不变，配色随主题内联） =================
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const BW = 170, BH = 74;
const P2 = 10, P3 = 750;
const DOM = { x: 288, y: 294, w: 194, h: 246 };
const USB2_BOXES = [
  { id: "dis", name: "Disconnected", zh: "PLS=RxDetect", sig: "PP,CCS,PED,PR=1,0,0,0", x: 40, y: 36 },
  { id: "po", name: "Powered-off", zh: "PLS=Disabled", sig: "PP,CCS,PED,PR=0,0,0,0", x: 500, y: 36 },
  { id: "dis2", name: "Disabled", zh: "PLS=Polling", sig: "PP,CCS,PED,PR=1,1,0,0", x: 40, y: 186 },
  { id: "u0", name: "U0（活动）", zh: "PLS=U0 · Enabled 子态", sig: "PP,CCS,PED,PR=1,1,1,0", x: 300, y: 306 },
  { id: "u3", name: "U3（挂起）", zh: "PLS=U3 · Enabled 子态", sig: "PP,CCS,PED,PR=1,1,1,0", x: 300, y: 446 },
];
const USB3_BOXES = [
  { id: "dis", name: "Disconnected", zh: "PLS=RxDetect", sig: "PP,CCS,PED,PR=1,0,0,0", x: 40, y: 36 },
  { id: "po", name: "Powered-off", zh: "PLS=Disabled/RxDetect", sig: "PP,CCS,PED,PR=0,0,0,0", x: 500, y: 36 },
  { id: "dis2", name: "Disabled", zh: "PLS=Disabled", sig: "PP,CCS,PED,PR=1,0,0,0", x: 40, y: 186 },
  { id: "u0", name: "U0（活动）", zh: "PLS=U0 · Enabled 子态", sig: "PP,CCS,PED,PR=1,1,1,0", x: 300, y: 306 },
  { id: "u3", name: "U3（挂起）", zh: "PLS=U3 · Enabled 子态", sig: "PP,CCS,PED,PR=1,1,1,0", x: 300, y: 446 },
];
const USB2_EDGES = [
  { d: "M125,110 L125,186", dash: false, labels: [
    ["连接检测 CCS='1' · CSC='1'", 133, 132, "st-cond", "start"], ["p274", 133, 148, "st-pg", "start"]] },
  { d: "M210,223 L385,223 L385,306", dash: false, labels: [
    ["复位主线 · 经 Reset 态", 214, 188, "st-cond", "start"],
    ["Wr(PR='1') → Reset", 214, 204, "st-cond", "start"],
    ["复位完成自动迁入 · PED/PRC='1'", 214, 218, "st-cond", "start"]] },
  { d: "M320,306 L320,260 L210,260", dash: false, labels: [
    ["Wr(PED='1') / Port_Error", 312, 276, "st-cond", "end"], ["USB2 置 PEC='1' · p275", 312, 292, "st-cond", "end"]] },
  { d: "M470,343 L530,343 L530,483 L470,483", dash: false, labels: [
    ["挂起 Wr(PLS=U3+LWS='1')", 538, 400, "st-cond", "start"], ["p275–276", 538, 416, "st-pg", "start"]] },
  { d: "M300,483 L240,483 L240,343 L300,343", dash: false, labels: [
    ["主机 Wr(PLS=Resume+LWS)", 232, 396, "st-cond", "end"],
    ["→Resume（软件计时）", 232, 412, "st-cond", "end"],
    ["Wr(PLS=U0+LWS)→RExit→U0", 232, 428, "st-cond", "end"],
    ["设备唤醒→Resume · PLC='1'", 232, 444, "st-cond", "end"],
    ["p277–278", 232, 460, "st-pg", "end"]] },
  { d: "M455,306 L455,160 L585,160 L585,110", dash: true, labels: [
    ["任一态（大泡）", 520, 138, "st-cond", "middle"], ["PP='0' / OCA='1'", 520, 154, "st-cond", "middle"]] },
  { d: "M500,73 L210,73", dash: false, labels: [
    ["Wr(PP='1')", 355, 64, "st-cond", "middle"]] },
];
const USB3_EDGES = [
  { d: "M200,110 L200,150 L385,150 L385,306", dash: false, labels: [
    ["连接检测→Polling→训练+配置成功→U0", 208, 126, "st-cond", "start"],
    ["训练成功迁入 · CSC='1' · p279", 208, 142, "st-cond", "start"]] },
  { d: "M65,186 L65,110", dash: false, labels: [
    ["Wr(PLS=RxDetect+LWS='1')", 73, 166, "st-cond", "start"], ["或 HCRST · p279", 73, 182, "st-cond", "start"]] },
  { d: "M320,306 L320,260 L210,260", dash: false, labels: [
    ["Wr(PED='1')", 312, 276, "st-cond", "end"], ["任一态除 Powered-off · p279", 312, 292, "st-cond", "end"]] },
  { d: "M470,343 L530,343 L530,483 L470,483", dash: false, labels: [
    ["挂起 Wr(PLS=U3+LWS='1')", 538, 400, "st-cond", "start"], ["p286", 538, 416, "st-pg", "start"]] },
  { d: "M300,483 L240,483 L240,343 L300,343", dash: false, labels: [
    ["主机 Wr(PLS=U0+LWS)→U3Exit", 232, 396, "st-cond", "end"],
    ["（LFPS 握手成功）→U0", 232, 412, "st-cond", "end"],
    ["设备唤醒→Resume→RExit", 232, 428, "st-cond", "end"],
    ["PLC='1' · p289–290", 232, 444, "st-cond", "end"]] },
  { d: "M455,306 L455,160 L585,160 L585,110", dash: true, labels: [
    ["任一态（大泡）", 520, 138, "st-cond", "middle"], ["PP='0' / OCA='1'", 520, 154, "st-cond", "middle"]] },
  { d: "M500,73 L210,73", dash: false, labels: [
    ["Wr(PP='1') 或 HCRST", 355, 64, "st-cond", "middle"]] },
];
function panelBoxesSvg(boxes, ox, CL) {
  return boxes.map((b) => `
  <g class="st-box st-${b.id}${b.id === "u0" ? " st-u0" : ""}">
    <rect x="${b.x + ox}" y="${b.y}" width="${BW}" height="${BH}" rx="10"/>
    <text x="${b.x + ox + BW / 2}" y="${b.y + 26}" class="st-name">${esc(b.name)}</text>
    <text x="${b.x + ox + BW / 2}" y="${b.y + 47}" class="st-zh">${esc(b.zh)}</text>
    <text x="${b.x + ox + BW / 2}" y="${b.y + 65}" class="st-sig">${esc(b.sig)}</text>
  </g>`).join("");
}
function shiftPath(d, ox) {
  return d.replace(/([ML])(\d+),(\d+)/g, (_, c, x, y) => `${c}${+x + ox},${+y}`);
}
function panelEdgesSvg(edges, ox) {
  return edges.map((e) =>
    `<path d="${shiftPath(e.d, ox)}" class="st-edge"${e.dash ? ' stroke-dasharray="7 5"' : ""} marker-end="url(#st-mk)"/>` +
    e.labels.map(([t, x, y, cls, anch]) =>
      `<text x="${x + ox}" y="${y}" class="${cls}" text-anchor="${anch}">${esc(t)}</text>`).join("")
  ).join("");
}
function panelFrameSvg(ox, title) {
  return `<rect x="${DOM.x + ox}" y="${DOM.y}" width="${DOM.w}" height="${DOM.h}" rx="10" class="st-domain"/>
  <text x="${DOM.x + ox + DOM.w - 4}" y="536" class="st-zh" text-anchor="end">Enabled 子态域</text>
  <circle cx="${26 + ox}" cy="73" r="4" class="st-dot"/>
  <path d="M${30 + ox},73 L${40 + ox},73" class="st-entry" marker-end="url(#st-mk)"/>
  <text x="${355 + ox}" y="24" class="st-title" text-anchor="middle">${esc(title)}</text>`;
}
function stateSvg() {
  const INK = THEME === "light" ? "#33333a" : "#d8d8dc";
  const EDGE = THEME === "light" ? "#5a5a62" : "#a8a8b0";
  const TXT = THEME === "light" ? "#1f1f24" : "#e8e8ec";
  const MUT = THEME === "light" ? "#6b6350" : "#a0a0a8";
  const BLUE = THEME === "light" ? "#2d5fb3" : "#7c9ff0";
  const defs = `<defs><marker id="st-mk" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="st-mk-fill"/></marker></defs>`;
  const body = defs +
    `<path d="M745,15 L745,525" class="st-div"/>` +
    panelFrameSvg(P2, "USB2 端口状态机 · Figure 4-25（p273）") +
    panelBoxesSvg(USB2_BOXES, P2) + panelEdgesSvg(USB2_EDGES, P2) +
    panelFrameSvg(P3, "USB3 端口状态机 · Figure 4-27（p278）") +
    panelBoxesSvg(USB3_BOXES, P3) + panelEdgesSvg(USB3_EDGES, P3) +
    `<text x="750" y="556" class="st-legend" text-anchor="middle">实线=主线迁移 · 虚线=任一态大泡迁移（→Powered-off） · ●=初始态（Disconnected）</text>
  <text x="750" y="574" class="st-legend" text-anchor="middle">盒内=PLS + 信号态 PP,CCS,PED,PR · Wr(f=v)=软件写 PORTSC · f=v=字段自动迁移（记法 p272）</text>`;
  return `<svg id="state-svg" viewBox="0 0 1500 596" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="根集线器端口状态机概览：USB2 与 USB3 两栏同构六态骨架与主线迁移（全图细节归 §4.19.1 原图 Figure 4-25 p273 · Figure 4-27 p278）">
<style>
.st-box rect { fill: ${THEME === "light" ? "#f4f2ee" : "#232327"}; stroke: ${EDGE}; stroke-width: 1.8; }
.st-name { font: 700 17px var(--anatomy-ui, sans-serif); fill: ${TXT}; text-anchor: middle; }
.st-zh { font: 500 14px var(--anatomy-ui, sans-serif); fill: ${TXT}; text-anchor: middle; }
.st-sig { font: 400 12.5px var(--anatomy-mono, monospace); fill: ${MUT}; text-anchor: middle; }
.st-edge { stroke: ${BLUE}; stroke-width: 2; fill: none; }
.st-mk-fill { fill: ${BLUE}; }
.st-domain { fill: none; stroke: ${EDGE}; stroke-width: 1.2; stroke-dasharray: 5 4; }
.st-entry { stroke: ${TXT}; stroke-width: 2; fill: none; }
.st-dot { fill: ${TXT}; }
.st-div { stroke: ${THEME === "light" ? "#c9c9cf" : "#3a3a40"}; stroke-width: 1; stroke-dasharray: 4 6; }
.st-title { font: 600 15px var(--anatomy-ui, sans-serif); fill: ${TXT}; }
.st-cond { font: 500 13.5px var(--anatomy-mono, monospace); fill: ${TXT}; }
.st-pg { font: 400 12.5px var(--anatomy-mono, monospace); fill: ${MUT}; }
.st-legend { font: 400 12.5px var(--anatomy-ui, sans-serif); fill: ${MUT}; }
</style>${body}</svg>`;
}

// ================= 页面 =================
const navHtml = `
<nav class="spec-nav">
  <a href="../../index.html">← 规范目录</a>
  <span class="nav-title">§4.19 根集线器</span>
  <span class="nav-sib">
    <a href="../4.18-transfer-attributes/index.html" title="§4.18 传输属性">上一节 §4.18</a>
    <a href="../4.20-scratchpad-buffers/index.html" title="§4.20 Scratchpad Buffers">下一节 §4.20</a>
  </span>
</nav>
<p class="spec-ref">xHCI 1.2b §4.19 Root Hub · p272–303 · §4.19.1 Root Hub Port State Machines p272 · §4.19.2 Port Status Change Generation p291 · §4.19.3 Connect Status Change Reporting p294（页码已机核，见 EVIDENCE.md）</p>`;

const proseHtml = `
<section class="spec-block">
  <h2>规范要义</h2>
  <p>根集线器（Root Hub）不是一颗真的 hub 芯片：xHC 在内部为「每个物理连接器 × 每种协议」各给一套端口寄存器来模拟 hub 行为——USB2（LS/FS/HS）与 USB3（Enhanced SuperSpeed）两种连接类型的 PORTSC 数量可以不等，由 xHCI Supported Protocol Capability（§7.2）声明归属（§4.19.7 p300）。本页「xHCI 驱动」即规范原文所称 system software（系统软件）。端口状态机的记法是三行一组：<b>状态名 + Port Link State（PLS）+ 信号态</b>，信号态四元组 = PP, CCS, PED, PR（p272）；进入某态时信号态被强制成该态定义值（p272 Note）。两台状态机的初始态都是 Disconnected（p273/p278）；图只示意进出条件，<b>各态的文字定义才是权威</b>（p273 Note）；状态机只引用 PLC 这一个 change bit，其余六个的置位规则归 §4.19.2（p273）。</p>
  <p>同一副骨架，两族语义在三处岔开。<b>Disabled 含义不同</b>：USB2 的 Disabled 是连接已检出、等待复位的态（PLS=Polling · 1,1,0,0，Figure 4-25 p273），USB3 的 Disabled 是软件写 PED='1' 得到的链路禁用态（PLS=Disabled · 1,0,0，Figure 4-27 p278）——同名两义，读到 PORTSC 值时先看协议族。<b>Enabled 到达方式不同</b>：USB2 只有端口复位一条路（Disabled→Reset→完成自动迁入，PED/PRC='1'，p274）且复位永不失败（p299 Note）；USB3 在 attach 后由链路训练+配置成功<b>自动</b>迁入 Enabled·U0（p279/p281），其复位（PR/WPR/HCRST）反而可能失败退回 Disconnected（p283）。<b>挂起/恢复路径不同</b>：两族都把 U0 与 U3 作为 Enabled 子态，挂起同写 Wr(PLS=U3+LWS='1')；恢复时 USB2 主机要写两段（先 PLS=Resume、Resume 时长由软件计时，再 PLS=U0），USB3 主机一段写 PLS=U0 走 LFPS 握手，且设备不许拒绝主机的恢复（p290）。电源域是公共底座：Wr(PP='0') 或过流把任一态打进 Powered-off（大泡，p272 原注）。</p>
  <p>事件面是本节的另一半。PORTSC 有<b>七个状态变化位</b>——CSC / PEC / WRC / OCC / PRC / PLC / CEC（p291），由硬件或软件条件置位，置位后保持到系统软件<b>写 '1' 清除</b>或 Chip Hardware Reset / HCRST（p291）。每口的变化位 OR 在一起、经 HCHalted（HCH）门控，形成内部信号 PSCEG；<b>PSCEG 的 0→1 跳变才产生 Port Status Change Event</b>——不是「某位=1 就发事件」（p293），且一口的事件在它的全部变化位清零之前被阻塞（PSCEG 回 0 才再开闸，p293 Note）；软件读 PORTSC 与事件环之间没有一致性保证（p292 Note）。attach 上报走三步（§4.19.3 p294）：CCS='1' → CSC='1' → PSCEG 0→1 时投 Port Status Change Event TRB（Port ID 定位端口、Completion Code=Success、Cycle bit=当前生产者态）；驱动解析事件后读该口 PORTSC，用 CSC=1、CCS=1 判出「这是一次插入」。在场判据两族不同：USB2 = PLS 从 RxDetect 迁到 Polling（软件随后必须复位端口才到 U0），USB3 = PLS 从 Polling 迁到 U0（训练成功即在场，p294）。下方机器「根集线器枢纽台」的主线教学点正在此：变化位置位≠事件，读清才再开闸。</p>
</section>`;

const quoteHtml = `
<section class="spec-block">
  <h2>原文对照</h2>
  <blockquote><p class="q">“Signal State values are: Port Power (PP), Current Connect Status (CCS), Port Enabled/Disabled (PED), and Port Reset (PR)”</p><p class="cite">(xHCI 1.2b §4.19.1 p272)</p><p class="zh">信号态四元组 = PP, CCS, PED, PR——状态盒第三行四个数的出处。</p></blockquote>
  <blockquote><p class="q">“When the Reset operation completes (PR = ‘0’), the port shall automatically advance to the Enabled state, setting PED and PRC to ‘1’.”</p><p class="cite">(xHCI 1.2b §4.19.1.1.4 p274)</p><p class="zh">USB2 复位完成自动迁入 Enabled 并置 PED/PRC——USB2 到 Enabled 只此一条路。</p></blockquote>
  <blockquote><p class="q">“A write to the PORTSC register with the PED field set to ‘1’ shall transition the port, from any state except Powered-off, to the Disabled state.”</p><p class="cite">(xHCI 1.2b §4.19.1.2.1 p279)</p><p class="zh">USB3 的 Disabled=软件写 PED='1' 可从（除 Powered-off 外）任一态进入——与 USB2 的 Disabled 完全两义。</p></blockquote>
  <blockquote><p class="q">“There are seven status change bits in the PORTSC register Connect Status Change (CSC), Port Enabled/Disabled Change (PEC), Warm Port Reset Change (WRC), Over-current Change (OCC), Port Reset Change (PRC), Port Link State Change (PLC), and Port Config Error Change (CEC)”</p><p class="cite">(xHCI 1.2b §4.19.2 p291)</p><p class="zh">七个状态变化位的清单原文——机器灯排七盏的出处；PPC 是电源开关能力旗标（p294），不是变化位。</p></blockquote>
  <blockquote><p class="q">“When set, these bits remain set until cleared by a system software write to the PORTSC register with the appropriate status change bit(s) set to ‘1’, or the assertion of a Chip Hardware Reset or HCRST.”</p><p class="cite">(xHCI 1.2b §4.19.2 p291)</p><p class="zh">读清纪律：变化位保持到软件写 '1' 清除（或整机复位/HCRST）——清位闸的出处。</p></blockquote>
  <blockquote><p class="q">“A port shall generate a Port Status Change Event when there is ‘0’ to ‘1’ transition of the PSCEG signal.”</p><p class="cite">(xHCI 1.2b §4.19.2 p293)</p><p class="zh">PSCEG 0→1 跳变才发端口状态变化事件——变化位置位本身不等于发事件。</p></blockquote>
  <blockquote><p class="q">“For a USB2 Protocol port, “device presence” is indicated by the PORTSC PLS field transitioning from the RxDetect to the Polling state.”</p><p class="cite">(xHCI 1.2b §4.19.3 p294)</p><p class="zh">USB2 口「设备在场」= PLS 从 RxDetect 迁到 Polling；软件随后复位端口把它送进 U0。</p></blockquote>
  <blockquote><p class="q">“For a USB3 Protocol port, “device presence” is indicated by the PORTSC PLS field transitioning from the Polling to the U0 state.”</p><p class="cite">(xHCI 1.2b §4.19.3 p294)</p><p class="zh">USB3 口「设备在场」= PLS 从 Polling 迁到 U0——训练成功才算在场，与 USB2 判据不同。</p></blockquote>
</section>`;

const stateCard = k.plateHtml({
  fig: "总览",
  title: "根集线器端口状态机概览：USB2 vs USB3",
  hint: "放大看框内文字 · 全屏后滚轮浏览",
  readout: "两栏同构 · 5 态 + Enabled 子态域 · p272–278",
  keys: [
    { mark: "raised", label: "实线=主线迁移 · 虚线=任一态大泡迁移（→Powered-off，条件 PP='0'/OCA='1'，p272/p274/p279）" },
    { mark: "dim", label: "全图细节（USB2 Test Mode、USB3 Compliance/Error/Loopback/Polling/DbC、两族 Enabled 子态机）归 §4.19.1 原图 Figure 4-25 至 4-33（p273–289）" },
    { mark: "edge", label: "盒内三行=状态名+PLS+信号态四元组；Wr(f=v)=软件写 PORTSC（记法 p272）" },
  ],
  caption: "两栏同一六态骨架，语义在 Disabled 含义、Enabled 到达方式与恢复路径三处岔开；机器卡演示的是 USB2 栏主线（插入→复位→U0→U3→唤醒→拔出→过流）。",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="根集线器端口状态机概览：USB2 与 USB3 两栏对比，可放大平移。">${stateSvg()}<span role="status" aria-live="polite" data-status></span></div>` + zoomBarHtml("放大看框内文字 · 全屏后滚轮浏览"),
});

const machineCtlHtml = `<div class="fig-ctl" role="toolbar" aria-label="动画控制条">
  <button type="button" data-act="prev">◀ 上一帧</button>
  <button type="button" data-act="next">下一帧 ▶</button>
  <button type="button" data-act="tour" aria-pressed="false">自动巡游</button>
  <button type="button" data-act="reset">⟲ 复位</button>
  <span class="fig-ctl-hint">键盘：空格/点击步进 · ← → 换帧 · Home 回全景 · A 巡游</span>
</div>`;

const figCard = k.plateHtml({
  fig: "§4.19 动画",
  title: "根集线器枢纽台：变化位点亮 → PSCEG 出事件 → 驱动读清",
  hint: "控制条步进/巡游 · 点击或空格步进 · ← → 换帧 · Home 回全景 · A 巡游",
  readout: "步 0/10 · 端口 Disconnected · 变化位 0/7 · 事件 0",
  keys: [
    { mark: "lit", label: "变化位灯排＝PORTSC 七个状态变化位（CSC/PEC/WRC/OCC/PRC/PLC/CEC，p291）：亮＝已置位，置位条件见副签（连接跳变/仅 USB2 使能错/温复位完成/过流/复位完成/PLS 迁移/配置错）" },
    { mark: "raised", label: "PSCEG 窗＝七位 OR 过 HCH 门（p293）：0→1 跳变推一张事件卡；位全清前该口事件阻塞——读清才再开闸（p291/p293）" },
    { mark: "edge", label: "插头滑车＝设备插拔；事件卡经出卡口走事件管入事件匣，Port ID 定位端口（p292/p294）；驱动侧 PORTSC 读数窗与写入卡槽（Wr 经清位闸）" },
    { mark: "dim", label: "演示样例：USB2 端口 1（示例值）· FS 设备；USB3 差异见对照板与总览图（p279–294）；PPC=电源开关能力旗标非变化位（p294）" },
  ],
  caption: "根集线器枢纽台的铁律：变化位置位≠事件——PSCEG 0→1 才发端口状态变化事件；驱动读 PORTSC、写 '1' 清位，位全清 PSCEG 归零，该口才再开闸（p291–293）。",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-valuenow="1" aria-label="根集线器枢纽台，十一帧：全景、插入、驱动读清、端口复位、USB3 对照、挂起、设备唤醒、拔出、过流对照、七位纪律、读数巡回。点击或空格步进。">${svg}<span role="status" aria-live="polite" data-status></span></div>` + machineCtlHtml + zoomBarHtml(),
});

const tableHtml = `
<section class="spec-block">
  <h2>§4.19 九小节导览（p272–303）</h2>
  <table class="xsp-tb">
  <tr><th>小节</th><th>一句话要点</th><th>页</th></tr>
  <tr><td><b>4.19.1 Root Hub Port State Machines</b></td><td>USB2 / USB3 两台端口状态机全图与逐态进出条件；记法=状态名+PLS+信号态（PP,CCS,PED,PR）；图只示意、文字定义为权威；只引用 PLC，其余 change bit 归 4.19.2</td><td class="mono">p272–291</td></tr>
  <tr><td><b>4.19.2 Port Status Change Generation</b></td><td>七个变化位（CSC/PEC/WRC/OCC/PRC/PLC/CEC）OR 后经 HCHalted 门控成 PSCEG；0→1 跳变才发 Port Status Change Event；全部位清零前该口事件被阻塞；读 PORTSC 与事件环无一致性保证</td><td class="mono">p291–293</td></tr>
  <tr><td><b>4.19.3 Connect Status Change Reporting</b></td><td>attach 上报三步：CCS='1' → CSC='1' → PSCEG 0→1 时发事件 TRB（Port ID 定位端口）；USB2 在场=PLS RxDetect→Polling（软件随后复位），USB3 在场=PLS Polling→U0</td><td class="mono">p294</td></tr>
  <tr><td><b>4.19.4 Port Power</b></td><td>PPC 声明是否支持电源开关；无论支持与否 Chip Hardware Reset / HCRST 后 VBus 自动上电，初始态=Disconnected；PP='0' 强制 Powered-off；xHC 未运行（HCH='0' 前）端口即可上报连接；4.19.4.1 = U1/U2 Timeout 四组合的 Enabled U0 伪态</td><td class="mono">p294–298</td></tr>
  <tr><td><b>4.19.5 Port Reset</b></td><td>Wr(PR='1')：置 PR 清 PED→发复位信令；成功收场 PLS=U0·PED='1'·PRC='1'·Port Speed=设备速度，失败收场 PLS=RxDetect·Speed=Undefined('0')·CCS='0'（仅 USB3 会失败）；PR 1→0 后设备在 Default 态；4.19.5.1 Warm Reset（WPR/WRC 仅 USB3，USB2 口 RsvdZ）</td><td class="mono">p298–299</td></tr>
  <tr><td><b>4.19.6 Port Test Modes</b></td><td>仅 USB2 口支持五种测试模式（Test_J_State/Test_K_State/Test_Packet/Test_Force_Enable/Test_SE0_NAK），USB3 口无；同一时刻至多一口在测（否则未定义）；测试序列：禁用全部 Device Slot→全口 Disabled(PP='0')→R/S='0' 等 HCH='1'→写 PORTPMSC 的 Port Test Control</td><td class="mono">p299–300</td></tr>
  <tr><td><b>4.19.7 Port Routing and Control</b></td><td>每种连接类型一套 PORTSC（USB2 口=PORTSC+USB2 PORTPMSC，USB3 口=PORTSC+USB3 PORTPMSC+PORTLI）；Supported Protocol Capability 定端口归属；端口编号 1..MaxPorts（HCSPARAMS1）；Figure 4-35 路由例（Offset/Count）；同物理连接器的 PP 引脚 OR 在一起</td><td class="mono">p300–302</td></tr>
  <tr><td><b>4.19.8 Cold Attach Status</b></td><td>USB3 口 CCS 要训练到 U0 才置位——D3 低功耗态时钟停摆时报不了；CAS 代位：远端终端电阻检出+D3 低功耗+LTSSM 非 Error/U3/Disabled 三条件齐才置 '1'，不是通用在场指示；CAS 跳变拉起 CSC；唤醒后对 CAS='1' 的口发 WPR，WPR 清 CAS；USB2 口恒 '0'</td><td class="mono">p302–303</td></tr>
  <tr><td><b>4.19.9 Port Speed</b></td><td>SSP capable hub 对 GetStatus(PORT_SPEED) 恒回 '0'（=5Gb/s）保 legacy 驱动不乱；真实速度走 GetStatus(EXT_PORT_SPEED)；SSP 设备在 SET_ADDRESS 后必须发 Sublink Speed Device Notification TP，让 xHC 知道真实速度</td><td class="mono">p303</td></tr>
  </table>
  <p>（小节页码=各节标题在提取文本中的起始页；4.19.1 内部含 USB2 顶层/子态图与 USB3 顶层/子态图共九张 Figure。）</p>
</section>
<section class="spec-block">
  <h2>USB2 vs USB3 端口差异对照（避雷三条入表）</h2>
  <table class="xsp-tb">
  <tr><th>维度</th><th>USB2 协议端口</th><th>USB3 协议端口</th><th>判据页</th></tr>
  <tr><td><b>Disabled 态含义</b>（同名两义）</td><td>连接检出后的<b>待复位态</b>：PLS=Polling，信号 1,1,0,0（设备已接、CCS='1'，等软件复位）</td><td><b>链路禁用态</b>：PLS=Disabled，信号 1,0,0,0；软件写 PED='1' 可从除 Powered-off 外任一态进入；出口=Wr(PLS=RxDetect+LWS) 或 HCRST 回 Disconnected</td><td class="mono">p273 · p279</td></tr>
  <tr><td><b>Enabled 到达方式</b></td><td><b>仅经端口复位</b>：Disabled→Reset（Wr(PR='1')）→完成（PR='0'）自动迁入，PED/PRC='1'；Port Speed 随复位检出</td><td><b>attach 自动</b>：连接检测→Polling→训练+配置成功（Downstream Config Successful）自动迁入 Enabled·U0，置 CSC='1'；复位完成同样可到达</td><td class="mono">p274 · p279 · p281 · p295</td></tr>
  <tr><td><b>复位路径与可失败性</b></td><td>仅 PR='1' 一种；<b>永不失败</b>（规范原文：USB2 protocol ports never fail the bus reset sequence）；WPR/WRC 位为 RsvdZ</td><td>PR（Hot）/ WPR（Warm）/ HCRST 三入口；<b>可失败</b>→退 Disconnected：PLS=RxDetect('5')、PR='0'、PRC='1'、Port Speed=Undefined('0')、CCS='0'；Hot 转 Warm 置 WRC；Warm=Hot 全部功能+链路重训（Rx.Detect 起、更耗时）</td><td class="mono">p283 · p298–299</td></tr>
  <tr><td><b>挂起进入（两族同写）</b></td><td>Wr(PLS=U3+LWS='1')→U3Entry（xHC 停总线挂起设备）→U3（Idle）；U3C·U3E='1' 时置 PLC（U3 Entry complete，p275–276）</td><td>Wr(PLS=U3+LWS='1')→U3' 子态机 U3Entry→收到 LAU 进 U3；U3C·U3E='1' 时置 PLC（p286 · p289）</td><td class="mono">p275–276 · p286 · p289</td></tr>
  <tr><td><b>主机恢复</b></td><td>两段写：U3→Resume（Wr(PLS=Resume+LWS)）→<b>Resume 时长由软件计时</b>（按 USB2 规范保证恢复序列完成）→Wr(PLS=U0+LWS)→RExit→U0</td><td>一段写：Wr(PLS=U0+LWS)→U3Exit（LTSSM Recovery，LFPS 握手）→U0；<b>设备不许拒绝主机的恢复</b>（p290 Note）</td><td class="mono">p277–278 · p289–290</td></tr>
  <tr><td><b>设备唤醒</b></td><td>U3→Resume（xHC 发恢复信令）·PLC='1'（Wakeup signaling from a device）</td><td>U3→Resume→RExit·PLC='1'（Wakeup signaling from a device）</td><td class="mono">p277 · p289</td></tr>
  <tr><td><b>连接在场判据</b>（4.19.3）</td><td>PLS 从 RxDetect 迁到 Polling 即「设备在场」；软件随后<b>必须复位端口</b>才到 U0</td><td>PLS 从 Polling 迁到 U0 才「设备在场」（训练成功即在场，无需软件复位）</td><td class="mono">p294</td></tr>
  <tr><td><b>端口级独有</b></td><td>Test Mode 态：五种测试模式（4.19.6）；测试前提=R/S='0' 且 HCH='1'</td><td>Compliance / Error / Loopback 态与 Warm Reset（WPR/WRC）；Polling 子态机（Training/CfgExcg/DbC，DbC 需 Debug Capability 支持）</td><td class="mono">p279–284 · p299–300</td></tr>
  </table>
  <p>（本表逐行对页取自 §4.19.1–4.19.6 原文；「不混写」三行=DESIGN 避雷清单的端口侧落点：Disabled 两义、USB2 复位必经 vs USB3 attach 自动、复位可失败性。）</p>
</section>`;

const linksHtml = `
<section class="spec-block">
  <h2>相关</h2>
  <ul class="links">
    <li><a href="../4.18-transfer-attributes/index.html">§4.18 传输属性</a>（上一节）——事件环上与端口事件同行的传输事件</li>
    <li><a href="../4.20-scratchpad-buffers/index.html">§4.20 Scratchpad Buffers</a>（下一节）——xHC 内部数据区的相邻节</li>
    <li><a href="../4.2-host-controller-init/index.html">§4.2 主机控制器初始化</a>——端口的上电与上报起点：PP 自动上电、MaxSlotsEn 延迟 PP 特性使端口可在 xHC 运行前就报 CCS/CSC='1'（p294–295）</li>
    <li><a href="../4.3-usb-device-init/index.html">§4.3 USB 设备初始化</a>——USB2 复位完成（PED/PRC='1'·Port Speed）即枚举主线由此起步</li>
    <li><a href="../4.4-device-detach/index.html">§4.4 设备拔出</a>——disconnect detect（CCS='0'）在状态机里的去向（Disconnected·CSC='1'）</li>
    <li><a href="../4.15-suspend-resume/index.html">§4.15 挂起与恢复</a>——U3/Resume 的写入计数轮与恢复两路完整展开（本页状态机侧的姊妹节）</li>
    <li><a href="../4.17-interrupters/index.html">§4.17 中断器</a>——Port Status Change Event 经事件环与中断送达软件侧的投递通道</li>
    <li><a href="../../index.html">§5.4.8 PORTSC（待建）</a>——七变化位与 PLS/LWS/PED 字段定义；<a href="../../index.html">§4.6 命令接口（待建）</a>——HCRST 的命令面</li>
  </ul>
</section>`;

const footerHtml = `<footer class="spec-foot">判据：xHCI 1.2b（625472 Rev 1.2b）§4.19 p272–303 · 引文逐字核对，证据见 <a href="EVIDENCE.md">EVIDENCE.md</a> · 生成于 2026-11-04</footer>`;

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
blockquote { margin: 0 0 14px; padding: 10px 16px; border-left: 3px solid var(--anatomy-line-mid, #456); background: var(--anatomy-shade-0); border-radius: 0 6px 6px 0; }
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

const body = pageCss + navHtml + proseHtml + quoteHtml + `<div class="state-wrap">` + stateCard + `</div>` + `<div class="fig-wrap">` + figCard + `</div>` + tableHtml + footerHtml;

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
const latheScript = `const G = (() => {${latheSource}\nreturn { viewOf, scaleOf, frameAlong, frameOf, pointOf, disc, ringBand, sphereOf, solidOf, prismOf, circleOf, arcOf, ribsOf, dot3, add3, sub3, mul3, unit3, cross3, len3 };})();\n`;
const live = readFileSync(join(HERE, "live.mjs"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const script = kitScript() + latheScript + geoScript + live
  + zoomFor(0, [".st-u0"], "__zfsState")
  + zoomFor(1, ['[data-name="con.body"]', '[data-name="desk.body"]'], "__zfs");

const page = k.pageHtml({ title: "§4.19 根集线器 · xHCI 规范对照学习", theme: THEME, body, script, width: 1500 });
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} items`, `scale ${KS.toFixed(3)}`);

A.auditOrExit(R, P, {});

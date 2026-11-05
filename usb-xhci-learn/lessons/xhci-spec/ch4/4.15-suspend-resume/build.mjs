// §4.15 挂起与恢复 —— anatomy 机器「端口电源闸台」+ 静态泳道图 + 表格卡
// 判据：xHCI 1.2b §4.15 p252–258（断言逐条见 EVIDENCE.md）；§4.16 起于 p258。
// 概念一句话：一条总线链路从 xHC 端口通到设备，链路中段立一柄三位闸刀
//   （上位 U0 跑包 / 中位 Resume 恢复中 / 下位 U3 挂起）；软件唯一手柄是
//   文书台上的 PLS 写入计数轮（0/3/15）+ LWS 拉杆——不压拉杆写不进；
//   写入值与端口状态鼓读数在 suspend 信令在途期间不同（≤10 ms）；
//   设备自发 LFPS 唤醒、xHC 评估发信令并出端口状态变化事件卡，
//   但从不自动把闸推回 U0。
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
// 写入面板（台面后沿立板）：PLS 写入计数轮 / TDRSMDN 计数轮 / LWS 拉杆
const PANEL = { x: -208, y: -88, w: 64, d: 3, r: 1 };
const PANEL_FACE = -84.95;
// 命令卡槽 / 事件匣 / 门铃钮（台面前段）
// 注记牌两块（中段）：USB2 差异 / 整机挂起次序
const BOARD1 = { x: -126, y: -92, w: 76, d: 3, r: 1 };
const BOARD2 = { x: -126, y: -26, w: 76, d: 3, r: 1 };
// 总控台（xHC）：x -40..96, y -104..36, z 12..96（台沿 lid 至 99）
const CON = { x: -40, y: -104, w: 136, d: 140, r: 3 };
const FACE_Y = 36.05;
// 三位闸刀（链路南侧，基座 x 100..146）
const GATE = { base: { x: 100, y: 6, w: 46, d: 34, r: 2 }, hinge: [110, 23], z: 42, r: 27, aU0: 54, aRe: 6, aU3: -40 };
// 总线链路（台身右面 → 设备左面，y=-16 带）
const LINK = { x0: 98, x1: 156, y: -16, z: 26 };
// 设备试验盒（右）
const BOX = { px: 150, py: -56, pw: 64, pd: 112, tx: 158, ty: -48, tw: 48, td: 96 };
const BOX_FACE = 48.05;

// ================= projection / helpers =================
const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
   ...k.boxCorners({ x: CON.x - 3, y: CON.y - 3, w: CON.w + 6, d: CON.d + 6, r: 2 }, 96, 3),
   [-218, -118, 109], [-60, -112, 109], [-70, -62, 102], [-47, -40, 102],
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
  states: ["U0", "U1", "U2", "U3", "U3Exit", "Resume"],
  drum: { x0: -37, x1: -5, z0: 54, z1: 78 },
  psceg: { x0: 38, x1: 58, z0: 58, z1: 76 },
  evalw: { x0: 62, x1: 90, z0: 58, z1: 76 },
  note: { x0: 58, x1: 94, z0: 24, z1: 48 },
  ep: { x0: -37, x1: -9, z0: 26, z1: 46 },
  dial: { x0: -206, x1: -188, z0: 44, z1: 58 },
  timer: { x0: -170, x1: -152, z0: 44, z1: 58 },
  lever: { px: -179, pz: 42 },
  bell: { x: -148, y: -24, z: 35.05 },
  cmd: { x: -208, y: -50, w: 20, z: 35, h: 17 },
  gate: { hx: GATE.hinge[0], hy: GATE.hinge[1], hz: GATE.z, r: 18.2, aU0: GATE.aU0, aRe: GATE.aRe, aU3: GATE.aU3 },
  dev: { linkWin: { x0: 164, x1: 188, z0: 36, z1: 58 }, btn: { x: 197, z: 46 } },
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
{ // 标尺条 + 铭牌（板前右段，闸刀东侧）
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
// 写入面板（立板）+ PLS 计数轮窗 / TDRSMDN 计数轮窗 / LWS 拉杆 / 写入拉线端子柱
{
  slab("panel.body", PANEL, 33, 31, { tone: "mid" }, { steps: 2, extra: screwDots({ x: PANEL.x + 3, y: PANEL.y + 0.4, w: PANEL.w - 6, d: PANEL.d - 0.8 }, 2, 64) });
  // LWS 拉杆：铰盘（实体）+ 压下触点垫（实体）；臂 live 重建
  const lpF = G.frameOf([DATA.lever.px, PANEL_FACE + 0.05, DATA.lever.pz], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  put("lever.hinge", [DATA.lever.px, PANEL_FACE + 1.2, DATA.lever.pz],
    S(G.disc(0, 1.4, 2.6, lpF, P, { steps: 16, bevel: 0.2 }), { tone: "mid" })
    + Ln(G.circleOf(lpF, 0, 2.6, P, 16), { tone: "lo" }),
    [record(A.disc(lpF, 0, 1.4, 2.6, { name: "lever.hinge", owner: "panel.body" }))], { bias: 0.25 });
  const cpF = G.frameOf([-166.8, PANEL_FACE + 0.05, 40.4], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  put("lever.contact", [-166.8, PANEL_FACE + 1.1, 40.4],
    S(G.disc(0, 1.1, 1.9, cpF, P, { steps: 14, bevel: 0.2 }), { tone: "hi" }),
    [record(A.disc(cpF, 0, 1.1, 1.9, { name: "lever.contact", owner: "panel.body" }))], { bias: 0.25 });
  labelText(`<g data-part="lever">${geo.leverSvg(0)}</g>`);
  labelText(
    vtext(-206, PANEL_FACE + 0.05, 60.8, "PLS 写入计数轮", 4.2, "hi")
    + vtext(-170, PANEL_FACE + 0.05, 60.8, "TDRSMDN ≥20 ms（USB2）", 3.6, "mid")
    + vtext(-206, PANEL_FACE + 0.05, 38.6, "LWS 拉杆：不压写不进 PLS", 3.6, "lo")
    + vtext(-206, PANEL_FACE + 0.05, 34.6, "仅 Enabled 态端口：PED='1' · PLS<'3'", 3.6, "lo")
    + `<g data-part="dial">${geo.dialSvg(0)}</g>`
    + `<g data-part="timer">${geo.timerSvg(-1)}</g>`);
  // 写入拉线端子柱（面板顶）
  cyl("panel.term", -176, -86.5, 1.2, 64, 3, { tone: "mid" }, { steps: 12, bevel: 0.2, extra: Ln(k.ring(-176, -86.5, 0.5, 67, P, 10), { tone: "lo" }) + Dots([at([-176, -86.5, 67])], { size: 0.4, tone: "hi" }) });
}
// 命令卡槽（Stop Endpoint SP='1'；卡 live 控制）
{
  slab("slot.base", { x: -210, y: -58, w: 24, d: 17.4, r: 1 }, 33, 2.2, { tone: "lo" }, { steps: 2, extra: Ln(k.planOutline(k.insetPlan({ x: -210, y: -58, w: 24, d: 17.4, r: 1 }, 2), 35.2, P, 3), { tone: "faint" }) });
  slab("slot.lip", { x: -210, y: -40.6, w: 24, d: 3.6, r: 1 }, 33, 5, { tone: "mid" }, { steps: 2 });
  put("cmd.card", [-193, -49, 43.5], `<g data-part="cmd" style="display:none">${geo.cmdCardSvg(1)}</g>`,
    [record(A.slab({ x: DATA.cmd.x, y: DATA.cmd.y, w: DATA.cmd.w, d: 2, r: 0.5 }, DATA.cmd.z, DATA.cmd.h, { name: "cmd.card", owner: "slot.base" }, 2))], { bias: 0.2 });
  labelText(topText([-196, -37.5], 33.02, "Stop Endpoint 卡槽", 4.4, "lo"));
}
// 事件匣（端口状态变化事件回执落位）
slab("tray.event", { x: -182, y: -64, w: 44, d: 26, r: 1.4 }, 33, 3.6, { tone: "hi" }, { steps: 3, bevel: 0.4 });
slab("tray.event.lip", { x: -138, y: -65, w: 1.6, d: 28, r: 0.6 }, 33, 5.2, { tone: "mid" });
labelText(topText([-160, -34], 33.02, "事件匣", 5.4, "mid"));
// 端点门铃钮（台面朝上；钮 live 重建）
{
  cyl("bell.seat", DATA.bell.x, DATA.bell.y, 3, 33, 2, { tone: "lo" }, { steps: 16 });
  put("bell.btn", [DATA.bell.x, DATA.bell.y, 36],
    `<g data-part="bellbtn">${geo.bellBtnSvg(0)}</g>`,
    [record(A.ring(G.frameOf([DATA.bell.x, DATA.bell.y, DATA.bell.z], [0, 0, 1], [1, 0, 0], [0, 1, 0]), 0, 0.85, 2.2, 4.2, { name: "bell.btn", owner: "bell.seat" }))], { bias: 0.3 });
  labelText(topText([-148, -13.5], 33.02, "端点门铃", 4.6, "lo"));
}

// ================= 注记牌两块（中段立板） =================
{
  slab("board.usb2", BOARD1, PLATE_H, 46, { tone: "lo" }, { steps: 2 });
  labelText(
    vtext(BOARD1.x + 3, BOARD1.y + BOARD1.d + 0.05, PLATE_H + 40, "USB2 端口差异", 6.4, "hi")
    + vtext(BOARD1.x + 3, BOARD1.y + BOARD1.d + 0.05, PLATE_H + 32, "恢复信令＝resume 信令（非 LFPS 握手）", 4.2, "mid")
    + vtext(BOARD1.x + 3, BOARD1.y + BOARD1.d + 0.05, PLATE_H + 24.4, "xHC 1 ms（TURSM）内反射到全部", 4.2, "mid")
    + vtext(BOARD1.x + 3, BOARD1.y + BOARD1.d + 0.05, PLATE_H + 17.6, "Enabled 端口并维持到转 U0", 4.2, "mid")
    + vtext(BOARD1.x + 3, BOARD1.y + BOARD1.d + 0.05, PLATE_H + 10.8, "软件 TDRSMDN ≥20 ms 计满才写 '0'", 4.2, "mid")
    + vtext(BOARD1.x + 3, BOARD1.y + BOARD1.d + 0.05, PLATE_H + 4.6, "（p255–256）", 3.6, "lo"));
  slab("board.bus", BOARD2, PLATE_H, 46, { tone: "lo" }, { steps: 2 });
  labelText(
    vtext(BOARD2.x + 3, BOARD2.y + BOARD2.d + 0.05, PLATE_H + 40, "整机挂起次序（p252）", 6.4, "hi")
    + vtext(BOARD2.x + 3, BOARD2.y + BOARD2.d + 0.05, PLATE_H + 32, "选择性挂起全部 Enabled 端口", 4.2, "mid")
    + vtext(BOARD2.x + 3, BOARD2.y + BOARD2.d + 0.05, PLATE_H + 24.4, "USBCMD R/S='0' 关控制器", 4.2, "mid")
    + vtext(BOARD2.x + 3, BOARD2.y + BOARD2.d + 0.05, PLATE_H + 17.6, "经 PCI PM 降 xHC 功耗态", 4.2, "mid")
    + vtext(BOARD2.x + 3, BOARD2.y + BOARD2.d + 0.05, PLATE_H + 10.8, "唤醒后：时钟稳定 → R/S='1'", 4.2, "mid")
    + vtext(BOARD2.x + 3, BOARD2.y + BOARD2.d + 0.05, PLATE_H + 4.6, "→ 逐端口写 PLS='0' 恢复", 4.2, "mid"));
}

// ================= 总控台（xHC） =================
{
  slab("con.body", CON, PLATE_H, 84, { tone: "mid" }, { steps: 4, bevel: 0.8, inner: Ln(k.sideSeam(CON, 60, P, 4), { tone: "faint" }) });
  slab("con.lid", { x: CON.x - 3, y: CON.y - 3, w: CON.w + 6, d: CON.d + 6, r: 2 }, 96, 3, { tone: "mid" },
    { steps: 4, bevel: 0.5, extra: screwDots({ x: CON.x - 1, y: CON.y - 1, w: CON.w + 2, d: CON.d + 2 }, 8, 99) });
  // 台顶铭牌 + 出卡口 + 事件出口短管
  labelText(
    topText([-30, 24], 99.02, "xHC 控制器 · 端口电源管理", 9, "hc")
    + topText([-30, 12], 99.02, "端口链接状态机 · 评估与上报", 6, "mid", "start"));
  slab("con.evslot", { x: 18, y: -84, w: 30, d: 16, r: 1 }, 99, 2.6, { tone: "lo" }, { steps: 2 });
  labelText(topText([36, -66], 99.02, "端口状态变化事件 出卡口", 4.2, "lo", "start"));
  cyl("con.evstub", 56, -72, 1.8, 99, 5, { tone: "lo" }, { steps: 18 });
  // 前立面：转筒窗 + 三灯（PED/PLC/R/S）+ PSCEG/评估/端点/注记窗（窗组随文字入 labels 层）
  labelText(
    `<g data-part="drum">${geo.drumSvg(0)}</g>`
    + vtext(-37, FACE_Y, 80.6, "端口链接状态 · PLS 读数", 4.4, "lo")
    + `<g data-part="psceg">${geo.pscegSvg(0)}</g>`
    + `<g data-part="evalw">${geo.evalSvg(0)}</g>`
    + `<g data-part="epwin">${geo.epWinSvg(1)}</g>`
    + `<g data-part="note" style="display:none"></g>`
    + vtext(38, FACE_Y, 50.4, "演示端口：根集线器 SS 端口（USB3）", 4.2, "lo"));
  const faceLamp = (name, x, z, lampKey, lab) => {
    const seatF = G.frameOf([x, FACE_Y + 0.05, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    put(`${name}.seat`, [x, FACE_Y + 1.2, z],
      S(G.disc(0, 2.2, 2.8, seatF, P, { steps: 20, bevel: 0.2 }), { tone: "lo" })
      + Ln(G.circleOf(seatF, 2.2, 2.8, P, 20), { tone: "lo" }),
      [record(A.disc(seatF, 0, 2.2, 2.8, { name: `${name}.seat`, owner: "con.body" }))], { bias: 0.3 });
    const lf = G.frameOf([x, FACE_Y + 2.4, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    put(`${name}.dome`, [x, FACE_Y + 3.6, z + 0.4],
      `<g class="lamp" data-lamp="${lampKey}">` + S(G.solidOf([[0, 0.2], [1, 2, 1], [2.2, 2.6, 1], [3, 2, 1], [3.4, 0.3]], lf, P, { steps: 20 }), { tone: "hi" }) + `</g>`,
      [record(A.solid(lf, [[0, 0.2], [1, 2, 1], [2.2, 2.6, 1], [3, 2, 1], [3.4, 0.3]], { name: `${name}.dome`, owner: `${name}.seat` }))], { bias: 0.4 });
    labelText(vtext(x, FACE_Y, 51.5, lab, 4.2, "lo", "middle"));
  };
  faceLamp("ped", 0, 64, "ped", "PED");
  faceLamp("plc", 14, 64, "plc", "PLC");
  faceLamp("rs", 28, 64, "rs", "R/S");
  labelText(vtext(2, FACE_Y, 46.2, "端口链接态变化", 3.4, "lo"));
  // 写入拉线端子（左面端子凸台：外端面 x=-42.2）
  const wf = G.frameOf([-40, 0, 58], [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
  put("con.writein", [-41.2, 0, 58], S(G.disc(0, 3.4, 2, wf, P, { steps: 18, bevel: 0.3 }), { tone: "mid" })
    + Ln(G.circleOf(wf, 3.4, 2, P, 18), { tone: "lo" }),
    [record(A.disc(wf, 0, 3.4, 2, { name: "con.writein", owner: "con.body" }))], { bias: 0.2 });
}

// ================= 三位闸刀（端口电源闸） =================
{
  const b = GATE.base;
  slab("gate.base", b, PLATE_H, 8, { tone: "mid" }, { steps: 4, bevel: 0.5, extra: screwDots(b, 3.4, 20) });
  cyl("gate.post", GATE.hinge[0], GATE.hinge[1], 2.4, 20, 22, { tone: "mid", crease: "none" },
    { steps: 18, extra: Ln([26, 34].map((z) => k.sideArc(GATE.hinge[0], GATE.hinge[1], 2.4, z, P, 12)).join(""), { tone: "faint" }) });
  // 三个触点柱（上位 U0 / 中位 Resume / 下位 U3；柱心在闸臂延伸线上，半径 21.5）
  const rad = (deg) => (deg * Math.PI) / 180;
  for (const [nm, deg] of [["u0", GATE.aU0], ["re", GATE.aRe], ["u3", GATE.aU3]]) {
    const px = GATE.hinge[0] + 21.5 * Math.cos(rad(deg));
    const top = GATE.z + 21.5 * Math.sin(rad(deg));
    cyl(`gate.${nm}`, px, GATE.hinge[1], 1.8, 20, top - 20, { tone: "hi" }, { steps: 14, bevel: 0.25 });
  }
  // 闸臂（live 每帧重建；home=上位 U0 46°）
  const a0 = (GATE.aU0 * Math.PI) / 180;
  const ballC = [GATE.hinge[0], GATE.hinge[1], GATE.z + 1.5];   // 记录位：球切在铰柱顶（演出位随 live）
  put("gate.blade", [GATE.hinge[0] + 10, GATE.hinge[1], GATE.z + 12],
    `<g data-part="blade">${geo.bladeSvg(GATE.aU0)}</g>`,
    [record(A.ball(ballC, 1.5, { name: "gate.blade.ball", owner: "gate.post" })),
     record(A.prism(G.frameAlong([ballC[0] + 1.2 * Math.cos(a0), GATE.hinge[1], ballC[2] + 1.2 * Math.sin(a0)], [Math.cos(a0), 0, Math.sin(a0)]), [[-1.1, -1.1], [1.1, -1.1], [1.1, 1.1], [-1.1, 1.1]], 0, 15.8, { name: "gate.blade.beam", owner: "gate.post" }))], { bias: 0.5 });
  labelText(
    topText([122.5, 37.5], 20.02, "U0", 4.0, "hi")
    + topText([127.5, 33.2], 20.02, "U3", 4.0, "mid")
    + topText([136.5, 37.5], 20.02, "Resume", 3.6, "mid")
    + topText([123, 12.5], 20.02, "三位闸刀 · 端口电源态", 4.6, "hi", "start"));
  // 教学锚立牌（闸座南缘）
  const np = { x: 102, y: 38.4, w: 40, d: 1.6, r: 0.8 };
  slab("gate.anchor", np, 20, 14, { tone: "lo" }, { steps: 2 });
  labelText(
    vtext(np.x + 2, np.y + np.d + 0.05, 29.5, "xHC 不自动回 U0", 5.4, "hi")
    + vtext(np.x + 2, np.y + np.d + 0.05, 22.8, "回 U0＝软件写 PLS（p253）", 4.2, "mid"));
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
  for (const px of [112, 144]) {
    cyl("link.post", px, LINK.y, 2, PLATE_H, LINK.z - PLATE_H, { tone: "mid", crease: "none" },
      { steps: 14, extra: Ln(k.sideArc(px, LINK.y, 2, 20, P, 10), { tone: "faint" }) });
  }
  labelText(
    topText([120, -7], PLATE_H + 0.02, "总线链路（USB3）", 4.6, "mid")
    + topText([120, 0.5], PLATE_H + 0.02, "U0＝跑包 · 挂起＝安静", 3.8, "lo"));
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
    topText([170, 26], PLATE_H + 56.02, "USB 设备 · 唤醒方", 7.5, "dev")
    + topText([170, 15], PLATE_H + 56.02, "远程唤醒＝发 resume 信令 / LFPS", 4.6, "mid"));
  // 链路电源态窗 + 唤醒钮（窗组随文字入 labels 层）
  labelText(
    `<g data-part="devlink">${geo.devLinkSvg("U0")}</g>`
    + `<g data-part="wakebtn">${geo.wakeBtnSvg(0)}</g>`
    + vtext(193, BOX_FACE, 31, "唤醒钮", 4.2, "lo"));
  // 教学锚长铭牌（基座前立牌）
  const np = { x: 152, y: 58, w: 62, d: 3, r: 1 };
  put("box.nameplate", [np.x + np.w / 2, np.y + np.d / 2, 14],
    S(k.slabOf(np, PLATE_H, 22, P, 2), { tone: "lo", crease: "none" })
    + Ln(path3([[np.x + 2, np.y + np.d + 0.05, PLATE_H + 2], [np.x + np.w - 2, np.y + np.d + 0.05, PLATE_H + 2]], false), { tone: "faint", free: true })
    + Dots([[np.x + 2.6, np.y + np.d + 0.2, PLATE_H + 19.4], [np.x + np.w - 2.6, np.y + np.d + 0.2, PLATE_H + 19.4]].map((p) => at(p)), { size: 0.45 }),
    [record(A.slab(np, PLATE_H, 22, { name: "box.nameplate" }, 2))], { bias: 0.15 });
  labelText(
    vtext(np.x + 3, np.y + np.d + 0.05, PLATE_H + 16.5, "只见总线信令", 5.6, "dev")
    + vtext(np.x + 3, np.y + np.d + 0.05, PLATE_H + 9.5, "挂起＝链路安静 恢复＝信令唤醒", 4.0, "mid")
    + vtext(np.x + 3, np.y + np.d + 0.05, PLATE_H + 3.2, "PORTSC/事件对设备不可见", 3.8, "mid"));
}

// ================= 线缆（写入拉线 / 事件回流管） =================
// 端点落位（audit 判据）：写入拉线两端=面板端子柱顶/总控台左面端子凸台外端面（rim 落面过
// terminals）；事件管两端=台顶短管口/事件匣内底（rim 落面）；链路票据路径为直线段。
const WIRE_WRITE = [[-176, -86.5, 68.5], [-158, -78, 79], [-120, -66, 93], [-72, -56, 102], [-48, -38, 101], [-48, -4, 84], [-47, 4, 68], [-46.5, 2, 60], [-44.1, 0, 58]];
const TUBE_EV = [[56, -72, 104], [56, -72, 107], [30, -108, 109], [-60, -112, 109], [-140, -106, 103], [-178, -88, 86], [-176, -64, 58], [-168, -49, 46], [-168, -49, 36.7]];
const LINK_RUN = [[100, LINK.y, LINK.z + 3.5], [154, LINK.y, LINK.z + 3.5]];
const wireChunks = [];
{
  {
    const route = G.fillet(WIRE_WRITE, 4, 10, { P, tube: 0.55 });
    R.route("wire.write", route, 0.55, { piece: "bench", limp: true, tips: [null, null], ends: [false, false] });
    tubePieces(route, 0.55, P, { maxLength: 16 }).forEach((piece, index) => {
      wireChunks.push({ name: `wire.write:${index}`, pts: piece.points.map((p) => p.map(f2)) });
      put(`wire.write:${index}`, piece.mid, tubeSvg(piece, { tone: "lo" }), [A.tube(piece.points, piece.radii)], { bias: 0.05, route: "wire.write", chunk: index });
    });
  }
  {
    const route = G.fillet(TUBE_EV, 5, 10, { P, tube: 0.9 });
    R.route("tube.ev", route, 0.9, { piece: "bench", rims: [1.7, 1.7], limp: true });
    tubePieces(route, 0.9, P, { maxLength: 18 }).forEach((piece, index) => {
      wireChunks.push({ name: `tube.ev:${index}`, pts: piece.points.map((p) => p.map(f2)) });
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
  label: "端口电源闸台：左文书台是 xHCI 驱动（规范称 system software）——拨 PLS 写入计数轮（0/3/15）、压 LWS 拉杆把写值送进 PORTSC，Stop Endpoint 命令卡先停端点；中总控台是 xHC——端口链接状态转筒与三位闸刀显 U0/U1/U2/U3/U3Exit/Resume，PLC 灯与 PSCEG 计数轮管端口状态变化事件出卡，评估窗管 PLS 写入的评估节拍；链路上票据走行＝总线信令（数据包/suspend 信令/LFPS）；右试验盒是设备——只见总线信令，远程唤醒可自发 LFPS。",
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
.stoken .iso-face-text[data-tone="tk"] { fill: ${HC}; }
@media (prefers-reduced-motion: reduce) { .fb-stage * { transition: none !important; animation: none !important; } }
`;

// ================= 泳道静态图（页面级平面 SVG：三列时间线；步进模式退役由机器接管，总览保留） =================
function laneSvg() {
  const LW = 1280;
  const LANES = { sw: 230, hc: 650, dev: 1070 };
  const BOXW = 330;
  const rows = [
    { n: 1, pg: "p254", sw: ["停端点：Stop Endpoint 命令 SP='1'", "（功能挂起：停 function 端点后", "再发 SetFeature(FUNCTION_SUSPEND)）"], hc: ["设备全部端点 → Stopped"], note: ["恢复后软件写端点门铃逐个重启（§4.15.1.1 / §4.15.1.2 p254）"] },
    { n: 2, pg: "p253–254", sw: ["写 PORTSC：PLS='3' + LWS='1'", "仅限 Enabled 态端口", "（PED='1'、PLS&lt;'3'）"], hc: ["评估写入：立即或微帧/帧边界", "（至少每帧一次；立即也要等", "当前事务完成）"], ev: { from: "sw", to: "hc", lines: ["PLS 写入"] } },
    { n: 3, pg: "p253–254", hc: ["发 suspend 信令 → 完成（≤10 ms）", "PLS 读数 → U3", "U3E='1'：置 PLC → PSCEG 0→1", "→ 端口状态变化事件"], dev: ["收 suspend 信令 → 挂起", "（链路安静）"], ev: { from: "hc", to: "dev", lines: ["suspend 信令"] } },
    { n: 4, pg: "p253", hc: ["挂起态驻留——xHC 从不自动把", "Resume/U3 端口转回 U0"], note: ["U3 转换完成前不得降功耗、不得恢复；U3C：PLS→U3 即置 PLC 出事件，免轮询免 ~15 ms 定时器（p254）"] },
    { n: 5, pg: "p254–255", dev: ["远程唤醒设备自发信令", "resume（USB2）/ LFPS（USB3）"], hc: ["端口 U3→Resume（PLS='15'）+ PLC", "→ PSCEG 0→1 → 事件", "（USB3 检测 LFPS 即转；xHC", "未获指示不回应 LFPS）"], ev: { from: "dev", to: "hc", lines: ["唤醒信令"], dashed: true } },
    { n: 6, pg: "p255", sw: ["读事件 Port ID → 读 PORTSC", "（PLC='1'、PLS=Resume＝设备发起）", "USB3：写 PLS='0' 指示 xHC 发 LFPS", "USB2：计满 TDRSMDN（≥20 ms）写 '0'"], hc: ["USB3：应答 LFPS——握手完成", "USB2：xHC 1 ms（TURSM）内反射", "到全部 Enabled 端口并维持"] },
    { n: 7, pg: "p255–256", hc: ["U3→U0（PLS='0'）+ PLC", "→ PSCEG 0→1 → 端口状态变化事件"], dev: ["进 U0——立即收包"], ev: { from: "hc", to: "sw", lines: ["U3→U0 事件"], dashed: true }, note: ["转 U0 前确认 xHC 在 Run（R/S='1'）——保证发 ITP 并立即收包（p255 Note）；随后写端点门铃重启（SP 停的端点）"] },
    { n: 8, pg: "p255–256", sw: ["主机发起（端口已挂起 PED='1'、PLS='3'）", "USB3：写 '0' → U3Exit 子态", "xHC 立即发 LFPS", "USB2：写 '15' → xHC 1 ms 内发信令", "TDRSMDN 从写 '15' 起算，计满写 '0'"], hc: ["信令完成 → U0 + PLC → 事件", "（U1/U2 低功耗态写 '0' 亦转 U0）"] },
  ];
  let y = 128;
  const laid = rows.map((r) => {
    const hs = ["sw", "hc", "dev"].filter((l) => r[l]).map((l) => 26 + r[l].length * 21);
    const boxH = Math.max(...hs);
    const noteH = r.note ? 22 + r.note.length * 17 + 10 : 0;
    const at_ = { ...r, y, boxH };
    y += boxH / 2 + 30 + Math.max(noteH, 26) + boxH / 2 + 8;
    return at_;
  });
  const footNote = ["整机挂起次序（p252）：选择性挂起全部 Enabled 端口 → USBCMD R/S='0' 关控制器 → 经 PCI PM 降 xHC 功耗态；唤醒事件后时钟稳定确认 → R/S='1' → 逐端口写 PLS='0' 恢复", "Wakeup Events（§4.15.2.3 p256–257）：远程唤醒/连接/拔出/过流皆可唤系统；端口恢复不受唤醒使能位限制（A port resume is not gated by a Wake Enable flag，Table 4-10 p257）"];
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
  return `<svg id="lane-svg" viewBox="0 0 ${LW} ${LH}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="§4.15 挂起与恢复三方泳道总览：挂起主线四步、设备发起与主机发起两路恢复、USB2/USB3 差异注记，共 8 步">
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
  <span class="nav-title">§4.15 挂起与恢复</span>
  <span class="nav-sib">
    <a href="../4.14-transfer-scheduling/index.html" title="§4.14 传输环管理">上一节 §4.14</a>
    <a href="../4.16-bandwidth-management/index.html" title="§4.16 带宽管理">下一节 §4.16</a>
  </span>
</nav>
<p class="spec-ref">xHCI 1.2b §4.15 Suspend-Resume · p252–258 · §4.15.1 Port Suspend p253 / §4.15.2 Port Resume p254 · §4.15.2.1 Device Initiated p254 / §4.15.2.2 Host Initiated p255 / §4.15.2.3 Wakeup Events p256（页码已机核，见 EVIDENCE.md）</p>`;

const proseHtml = `
<section class="spec-block">
  <h2>规范要义</h2>
  <p>xHC 给每个根集线器端口一套与 USB Hub 等价的挂起/恢复模型（p252）——本页「xHCI 驱动」即规范原文所称 system software（系统软件）。USB3 链路有自己的电源状态阶梯 <b>U0/U1/U2/U3</b>：U0 正常跑包，U3 是端口挂起态，U1/U2 是更浅的低功耗链路态；软件把单个端口置挂起即<b>选择性挂起</b>（Selective Suspend，每个 PORTSC 都支持）。规范把软件发起的恢复称 <b>Resume Events/Actions</b>（恢复事件/动作），总线发起的称 <b>Wake-up Events</b>（唤醒事件）——后者两类来源：远程唤醒设备发 resume 信令/LFPS（xHC 必须响应并按需唤醒系统），连接/拔出/过流（敏感度可用 PORTSC 每端口控制位开关）。挂起整条总线按次序：全部 Enabled 端口选择性挂起 → USBCMD.R/S='0' 关控制器 → 经 PCI PM 降 xHC 功耗态；唤醒后先确认时钟稳定再置 R/S='1'、逐端口写 PLS='0'（p252）。</p>
  <p>挂起动作＝<b>写 PORTSC 的 PLS='3'</b>，只许对 Enabled 态端口（PED='1'、PLS<'3'）做，且必须带 <b>LWS='1'</b>（p253–254）。写入与生效之间有时间差：xHC 可立即评估也可等微帧/帧边界（至少每帧一次），立即评估也要等当前事务完成；<b>suspend 信令送达设备之前 PLS 读数不变（最长 10 ms）</b>——软件必须等 U3 转换完成才能把 xHC 放进低功耗态或发起恢复。等法有两难（轮询占处理器、OS 定时器 ~15 ms 太慢），<b>U3 Entry Capability（U3C）</b>解决：PLS 跳到 U3 即置 PLC 出端口状态变化事件（HCCPARAMS2.U3C='1' 时用 CONFIG.U3E='1' 打开；xHCI 1.1/1.2 起 U3C='1' 强制，p254）。挂起前还要用 <b>Stop Endpoint 命令（SP='1'）</b>停掉设备端点（§4.15.1.1 选择性挂起停全部端点；§4.15.1.2 功能挂起按 function 停后再发 SetFeature(FUNCTION_SUSPEND)，p254）。下方机器「端口电源闸台」的主线教学点正在此：写入计数轮与端口状态鼓在信令在途期间读数不同。</p>
  <p>恢复分两条路：<b>设备发起</b>（§4.15.2.1）——设备发 resume 信令（USB2）/LFPS（USB3），端口 U3→Resume（PLS='15'）、PLC='1'→端口状态变化事件；软件读 PORTSC 后按协议族收尾——USB3 写 PLS='0' 让 xHC 应答 LFPS 完成握手（xHC 未获指示前不回应 LFPS），USB2 由软件计满 TDRSMDN（≥20 ms，从转 Resume 通知起算）后写 '0'，xHC 检测到信令后 1 ms（TURSM）内反射到全部 Enabled 端口。<b>主机发起</b>（§4.15.2.2）——USB3 直接写 PLS='0'（端口进 U3Exit 子态，xHC 立即发 LFPS）；USB2 写 '15'（xHC 1 ms 内发信令，TDRSMDN 从写 '15' 起算，计满写 '0'）；对 U1/U2 低功耗态端口写 '0' 亦转 U0。两条硬规则：<b>把 Resume 端口转 U0 前必须确认 R/S='1'</b>（保证设备进 U0 时 xHC 能发 ITP 并立即收包，p255 Note）；<b>xHC 从不自动把 Resume/U3 端口拉回 U0</b>（p253 Note）。恢复完成的统一回执：PLS='0'、PLC='1' 再出一次端口状态变化事件（p256）。</p>
</section>`;

const quoteHtml = `
<section class="spec-block">
  <h2>原文对照</h2>
  <blockquote><p class="q">“System software places individual ports into suspend mode by writing a ‘3’ into the appropriate PORTSC register Port Link State (PLS) field (refer to section 5.4.8).”</p><p class="cite">(xHCI 1.2b §4.15.1 p253)</p><p class="zh">挂起动作＝写 PORTSC 的 PLS='3'——前提是端口在 Enabled 态（下一句：should only set PLS='3' when the port is Enabled）。</p></blockquote>
  <blockquote><p class="q">“Software shall stop all endpoints of a device using the Stop Endpoint Command and setting the Suspend (SP) flag to ‘1’ prior to selectively suspending a device.”</p><p class="cite">(xHCI 1.2b §4.15.1.1 p254)</p><p class="zh">选择性挂起前先停端点：Stop Endpoint 命令带 SP='1'；恢复后软件写端点门铃重启（p254）。</p></blockquote>
  <blockquote><p class="q">“The U3 Entry Capability (U3C) eliminates these delays by asserting PLC when there is a transition of PLS to U3, where the assertion of PLC generates a Port Status Change Event.”</p><p class="cite">(xHCI 1.2b §4.15.1 p254)</p><p class="zh">U3C 免轮询免定时器：PLS→U3 即置 PLC 出事件——xHCI 1.1/1.2 起强制（同页 Note）。</p></blockquote>
  <blockquote><p class="q">“Note that an LFPS Handshake is required for a USB3 U3 wakeup. A device generates LFPS to initiate the resume process.”</p><p class="cite">(xHCI 1.2b §4.15.2.1 p255，原文 Handshake 后带脚注号 52，引文剔除)</p><p class="zh">USB3 的 U3 唤醒必须走 LFPS 握手——设备先发 LFPS 发起恢复；xHC 在软件指示前不得回应 LFPS 让握手完成（p255）。</p></blockquote>
  <blockquote><p class="q">“A U3 to U0 transition of the PLS field shall cause the Port Link State Change (PLC) bit to transition from ‘0’ to ‘1’.”</p><p class="cite">(xHCI 1.2b §4.15.2.2 p256)</p><p class="zh">恢复完成的统一回执：PLS 从 U3 变 U0 必置 PLC——PSCEG 0→1 即出端口状态变化事件。</p></blockquote>
  <blockquote><p class="q">“The xHC shall not automatically transition a root hub port from the Resume or U3 state to the U0 state.”</p><p class="cite">(xHCI 1.2b §4.15 p253 Note)</p><p class="zh">Resume/U3 端口回 U0 只能由软件驱动——xHC 没有自动恢复路径（xHC 转 D0 后亦然）。</p></blockquote>
</section>`;

const laneCard = k.plateHtml({
  fig: "流程",
  title: "§4.15 挂起与恢复主线：三方泳道总览",
  hint: "放大看小框文字 · 全屏后滚轮浏览",
  readout: "8 步 · p252–p258",
  keys: [
    { mark: "raised", label: "实线箭头＝写流/总线信令；虚线＝事件回执流与唤醒信令（p252–256）" },
    { mark: "dim", label: "虚线注记框＝机制补充：端点重启、U3C 免轮询、R/S='1' 前提、整机次序（p252/p254/p255）" },
    { mark: "edge", label: "设备泳道＝唤醒方：只见总线信令，挂起＝链路安静；远程唤醒可自发 resume/LFPS（p253–255）" },
  ],
  caption: "挂起一条主线（停端点 → 写 PLS='3' → suspend 信令 → U3）；恢复两条路（设备发起唤醒信令、主机发起写 PLS），完成时统一 U3→U0 并出端口状态变化事件。",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="§4.15 挂起与恢复三方泳道总览图，八步，可放大平移。">${laneSvg()}<span role="status" aria-live="polite" data-status></span></div>` + zoomBarHtml("放大看框内文字 · 全屏后滚轮浏览"),
});

const machineCtlHtml = `<div class="fig-ctl" role="toolbar" aria-label="动画控制条">
  <button type="button" data-act="prev">◀ 上一帧</button>
  <button type="button" data-act="next">下一帧 ▶</button>
  <button type="button" data-act="tour" aria-pressed="false">自动巡游</button>
  <button type="button" data-act="reset">⟲ 复位</button>
  <span class="fig-ctl-hint">键盘：空格/点击步进 · ← → 换帧 · Home 回全景 · A 巡游</span>
</div>`;

const figCard = k.plateHtml({
  fig: "§4.15 动画",
  title: "端口电源闸台：写 PLS='3' 进挂起，两路恢复回 U0",
  hint: "控制条步进/巡游 · 点击或空格步进 · ← → 换帧 · Home 回全景 · A 巡游",
  readout: "步 0/11 · 写入 PLS 0 · 端口 U0 · 端点 Running",
  keys: [
    { mark: "lit", label: "三位闸刀＝端口电源态：上位 U0 跑包 / 中位 Resume / 下位 U3——xHC 从不自动把闸推回 U0（p253 Note）" },
    { mark: "raised", label: "PLS 写入计数轮（0/3/15）+ LWS 拉杆＝软件唯一手柄：不压拉杆写不进 PLS（p254）；信令在途期间写入值≠状态鼓读数（≤10 ms，p253–254）" },
    { mark: "edge", label: "票据走链路＝总线信令：suspend 信令送达＝挂起生效、LFPS＝USB3 恢复握手、数据包＝U0 跑动（p253–256）" },
    { mark: "dim", label: "演示样例：根集线器 SS 端口（USB3 主线）；USB2 差异（TURSM 反射/TDRSMDN 计时）见注记板与泳道第 6–8 步" },
  ],
  caption: "端口电源闸台的铁律：挂起与恢复的唯一手柄是软件写 PLS（带 LWS='1'）——xHC 评估、发信令、置 PLC 出事件，但从不自动回 U0。",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="端口电源闸台，十二帧：全景、停端点、写挂起、评估与 suspend 信令、链路安静、设备发起唤醒、软件指示、恢复完成、门铃重启、USB2 对照、主机发起、读数巡回。点击或空格步进。">${svg}<span role="status" aria-live="polite" data-status></span></div>` + machineCtlHtml + zoomBarHtml(),
});

const tableHtml = `
<section class="spec-block">
  <h2>PLS 迁移要点表（§4.15.1–4.15.2 · 每行带页码）</h2>
  <table class="xsp-tb">
  <tr><th>PLS 写入/读值</th><th>含义</th><th>谁发起 · 谁置位</th><th>页</th></tr>
  <tr><td><b>'3'（U3）</b></td><td>挂起态</td><td>软件写入发起挂起（仅限 Enabled 态端口，LWS='1' 必置）；suspend 信令完成后 PLS 才真变 U3（最长 10 ms）</td><td class="mono">p253–254</td></tr>
  <tr><td><b>'15'（Resume）</b></td><td>恢复进行中</td><td>设备发起：xHC 检测到 resume 信令/LFPS 后置；主机发起（USB2）：软件写入发起</td><td class="mono">p254–255 · p256</td></tr>
  <tr><td><b>'0'（U0）</b></td><td>正常活动态</td><td>软件写入发起恢复——USB3 直接发起/应答 LFPS；USB2 在 TDRSMDN 计满后写；对 U1/U2 低功耗态端口写 '0' 亦转 U0</td><td class="mono">p255–256</td></tr>
  <tr><td><b>U3Exit（子态）</b></td><td>USB3 主机发起恢复的过渡</td><td>软件写 PLS='0' 后端口进入；xHC 立即发 LFPS 到设备</td><td class="mono">p256</td></tr>
  <tr><td><b>PED='1'、PLS<'3'</b></td><td>端口 Enabled（未挂起）判据</td><td>软件读 PORTSC 判定：可挂起（p254）/ 已恢复（p256–257）；主机发起恢复的前提则是已挂起（PED='1'、PLS='3'，p255）</td><td class="mono">p254 · p255–257</td></tr>
  </table>
  <p>注：§4.15.2.3 Wakeup Events（p256–257）——USB2 端口检测到 resume 信令后，xHC 在 1 ms（TURSM）内向全部 Enabled 端口反射并维持到软件把端口转 U0；USB3 检测到合规 LFPS（满足 USB3 规范 Table 6-22 的 t12–t10）即转 Resume 并置 PLC。Table 4-10（p257–258）按 WDE/WCE/WOE 三类唤醒使能给出各唤醒事件后的 PLS/CCS/PED/OCA/USBSTS.PCD 状态——注记「A port resume is not gated by a Wake Enable flag」：端口恢复不受唤醒使能位限制（p257）。规范步号伪影（§4.15.2.1 从"10."起、§4.15.2.2 从"14."起）未照抄，本页用自有规范化步号并逐框带页码。</p>
</section>`;

const linksHtml = `
<section class="spec-block">
  <h2>相关</h2>
  <ul class="links">
    <li><a href="../4.14-transfer-scheduling/index.html">§4.14 传输环管理</a>（上一节）——Stop Endpoint 命令的执行模型</li>
    <li><a href="../4.16-bandwidth-management/index.html">§4.16 带宽管理</a>（下一节）——端口恢复后重新评估带宽的邻居节</li>
    <li><a href="../4.7-doorbells/index.html">§4.7 门铃</a>——恢复后写端点门铃重启（SP 停的端点）</li>
    <li><a href="../4.17-interrupters/index.html">§4.17 中断器</a>——端口状态变化事件到中断的通路</li>
    <li><a href="../4.2-host-controller-init/index.html">§4.2 主机控制器初始化</a>——USBCMD.R/S 与启动次序</li>
    <li><a href="../4.19-root-hub/index.html">§4.19 根集线器</a>——端口状态机视角（Resume 态与 PSCEG 事件生成在其域内）</li>
    <li><a href="../../index.html">§5.4.8 PORTSC（待建）</a>——PLS/LWS/PED 字段定义；<a href="../../index.html">§3.3.8 Stop Endpoint（待建）</a>——SP 停端点细则</li>
  </ul>
</section>`;

const footerHtml = `<footer class="spec-foot">判据：xHCI 1.2b（625472 Rev 1.2b）§4.15 p252–258 · 引文逐字核对，证据见 <a href="EVIDENCE.md">EVIDENCE.md</a> · 生成于 2026-11-04</footer>`;

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
  + zoomFor(1, ['[data-name="gate.base"]', '[data-name="con.body"]'], "__zfs");

const page = k.pageHtml({ title: "§4.15 挂起与恢复 · xHCI 规范对照学习", theme: THEME, body, script, width: 1500 });
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} items`, `scale ${KS.toFixed(3)}`);

A.auditOrExit(R, P, {});

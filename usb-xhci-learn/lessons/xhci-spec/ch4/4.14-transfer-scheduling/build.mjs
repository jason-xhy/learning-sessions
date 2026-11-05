// §4.14 传输环管理 —— anatomy 机器「调度轮转台」+ 整页
// 判据：xHCI 1.2b §4.14 p232–251；§4.14.1 General Scheduling Model p233 /
//   §4.14.1.1 System Bus Bandwidth p234 / §4.14.2 Periodic p235 /
//   §4.14.2.1 Isoch p237（.1.4 IST p242）/ §4.14.3 Interrupt p243 /
//   §4.14.4 Asynchronous p245（.1 SS Burst p251）。
// 机器概念：一台调度轮转台——驱动把三类端点的传输环备好 TD 卡、写端点门铃；
//   xHC 按帧微帧节拍（MFINDEX 窗 + 微帧标尺）轮转取卡：周期表卡架挂 Isoch/Interrupt
//   端点卡（每 ESIT 一个服务机会 SO），异步轮转盘上 Bulk/Control 卡座被指针轮转点名
//   （round-robin，每过一遍表一个 SO）；SOPC 递减归零换端点；设备只按端点类型收发
//   USB 事务。三方：文书台（xHCI 驱动）/ 总控台（xHC）/ 试验盒（设备）。
// 演示样例（登记 EVIDENCE）：SS 总线。EP1 IN Isoch（Interval 3→ESIT 1ms、MaxBurst 3、
//   Mult 1→MSOPC 8、wBytesPerInterval 8192B）；EP2 IN Interrupt（Interval 4→ESIT 2ms、
//   MSOPC 1、wBytesPerInterval 1024B）；EP3 OUT Bulk（MaxBurst 7→MSOPC 8、
//   MSTrS=1024×8=8192B）；EP0 Control（MPS 512）；IST=2 微帧（规范自举例 p242）。
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
// 门铃台立板（文书台上）
const BELL = { px: -174, py: -62, pw: 38, pd: 3, z0: 36, z1: 58 };
// 传输环架（主机内存：三类端点各一条环）：x -130..-36, y -98..-2
const RACK = { x: -130, y: -98, w: 94, d: 96, r: 2 };
const RINGS = {
  iso:  { x0: -128, x1: -100, y0: -92, y1: -14 },
  intr: { x0: -99,  x1: -71,  y0: -92, y1: -14 },
  bulk: { x0: -70,  x1: -38,  y0: -92, y1: -14 },
};
const RING_Z = 16; // 环床面（床身 z 16..18，TD 卡 z 18..31）
// 端点上下文表格卡（环架后沿立板：驱动翻译描述符的结果）
const EPP = { x: -128, y: -97.5, w: 90, d: 3, r: 1, z0: RING_Z, z1: 46 };
// 总控台（xHC）：x -34..118, y -104..36, z 12..96
const CON = { x: -34, y: -104, w: 152, d: 140, r: 3 };
const FACE_Y = 36.05;
// 台顶件（z 99 起）：微帧标尺 / 周期表卡架 / 异步轮转盘
const BELT = { x: -30, y: -94, w: 62, d: 7, r: 1 };        // 微帧标尺条（32 刻度）
const BTICK0 = -28, BTICK_N = 32, BTICK_U = 1.84;           // 刻度起点/数/间距
const PRACK = { x: -30, y: -86, w: 60, d: 52 };             // 周期表卡架（Isoch+Interrupt）
const DIAL = { cx: 76, cy: -58, rDisc: 27, seatR: 21 };     // 异步轮转盘
const DIALZARM = 130.5;                                     // 指针臂扫过高度（高于卡座顶 127.6）
const SEATS = [ // 卡座方位角（度，0=+y 正前顺时针）
  { a: 0,   x: 76,     y: -37,   kind: "bulk" },
  { a: 120, x: 57.8,   y: -68.5, kind: "ctrl" },
  { a: 240, x: 94.2,   y: -68.5, kind: "empty" },
];
// 设备试验盒
const BOX = { px: 126, py: -56, pw: 88, pd: 112, tx: 134, ty: -48, tw: 72, td: 96 };

const ringCX = (key) => (RINGS[key].x0 + RINGS[key].x1) / 2;

// ================= projection / helpers =================
const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
   [-218, -118, 55], [218, 106, 55],
   [-100, 78, 103], [116, 78, 103],
   [-30, -110, 112], [-196, -60, 46], [214, 58, 38], [-130, -98, 56],
   [76, -58, 134], [-16, -86, 130], [26, -86, 130], [104, -70, 106]],
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

// live 数据（wires 路线后补）
const DATA = {
  P, KS, W, H,
  faceY: FACE_Y, boxFaceY: BOX.ty + BOX.td + 0.05,
  mfwin: { x0: -30, x1: 34, z0: 64, z1: 92 },
  sopcwin: { x0: 38, x1: 116, z0: 64, z1: 92 },
  bell: { btnX: -149, faceY: BELL.py + BELL.pd + 0.05, btnZ: 47 },
  belt: { x0: BTICK0, unit: BTICK_U, n: BTICK_N, y: BELT.y, d: BELT.d, z: PLATE_H + 87 + 2.0 + 0.05 },
  dial: { cx: DIAL.cx, cy: DIAL.cy, rArm: 19, zArm: DIALZARM, seats: SEATS },
  rings: RINGS, ringZ: RING_Z,
  devwins: { deviso: { x0: 136, x1: 158 }, devintr: { x0: 161, x1: 183 }, devbulk: { x0: 186, x1: 206 } },
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
function box(name, [x0, y0, z0], [x1, y1, z1], style = {}, { r = 0.6, steps = 2, bevel = 0, extra = "", inner = "", bias = 0 } = {}) {
  return slab(name, { x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, z0, z1 - z0, style, { steps, bevel, extra, inner, bias });
}
function cyl(name, cx, cy, r, z, h, style = {}, { steps = 20, bevel = 0, extra = "", bias = 0 } = {}) {
  const shape = record(A.cylinder(cx, cy, r, z, h, { name }, steps));
  put(name, [cx, cy, z + h / 2], S(k.cylinder(cx, cy, r, z, h, P, steps, bevel), { tone: "mid", ...style }) + extra, [shape], { bias });
  return shape;
}

// 贴面文字收集（无实体形状的 markup，组装时入 labels 层——静态实体之后、actors 之前）
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
  const strip = { x: -196, y: 92, w: 158, d: 6.5, r: 1 };
  const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4.4, 5, strip.y + 0.8, PLATE_H + 0.6, [2, 3.6], P);
  slab("stand.ruler", strip, PLATE_H, 0.6, { tone: "lo", crease: "none" },
    { steps: 3, extra: Ln(t.minor, { tone: "lo" }) + Ln(t.major, { tone: "mid" }) });
  const lab = { x: 40, y: 90, w: 34, d: 12, r: 1.2 };
  slab("stand.label", lab, PLATE_H, 0.8, { tone: "lo", crease: "none" },
    { steps: 3, extra: Ln(k.planOutline(k.insetPlan(lab, 1.6), PLATE_H + 0.8, P, 3), { tone: "faint" })
      + Ln([20, 14, 17].map((w2, i) => k.lineOnTop([lab.x + 4, lab.y + 4 + i * 3.4], [lab.x + 4 + w2, lab.y + 4 + i * 3.4], PLATE_H + 0.8, P)).join(""), { tone: "lo", free: true })
      + Dots([[lab.x + lab.w - 2.8, lab.y + 2.8], [lab.x + lab.w - 2.8, lab.y + lab.d - 2.8]].map(([x, y]) => at([x, y, PLATE_H + 0.8])), { size: 0.45 }) });
}

// ================= 文书台（xHCI 驱动） =================
{
  slab("desk.body", DESK, PLATE_H, 18, { tone: "mid" }, { steps: 4, bevel: 0.6, inner: Ln(k.planOutline(k.insetPlan(DESK, 3), 16, P, 4), { tone: "faint" }) });
  const topPlan = { x: DESK.x - 3, y: DESK.y - 3, w: DESK.w + 6, d: DESK.d + 6, r: 2 };
  slab("desk.top", topPlan, 30, 3, { tone: "mid" },
    { steps: 4, bevel: 0.4, extra: Ln(k.planOutline(k.insetPlan(topPlan, 3), 33, P, 4), { tone: "lo" }) });
  // 台前铭牌（板实体嵌入台身前缘 0.2 + 文字入 labels 层）
  const mp = { x: -210, y: -4.2, w: 66, d: 1.6, r: 0.6 };
  put("desk.title", [mp.x + mp.w / 2, -2.8, 21],
    S(k.slabOf(mp, 12, 18, P, 2, 0.3), { tone: "hi", crease: "none" }),
    [record(A.slab(mp, 12, 18, { name: "desk.title" }, 2))], { bias: 0.1 });
  labelText(vtext(mp.x + 4, mp.y + mp.d + 0.05, 26.2, "xHCI 驱动", 9, "drv")
    + vtext(mp.x + 4, mp.y + mp.d + 0.05, 16.6, "规范称 system software", 5.2, "mid"));
}
// 描述符/TD 卡堆（三片一 item；铭随文字入 labels 层）
{
  let g = "", shapes = [];
  for (let i = 0; i < 3; i++) {
    const plan = { x: -206, y: -88 + i * 0.3, w: 22, d: 20, r: 0.8 };
    shapes.push(record(A.slab(plan, 33 + i * 0.5, 1.4, { name: "tdstack", owner: "desk.top" }, 2)));
    g += S(k.slabOf(plan, 33 + i * 0.5, 1.4, P, 2), { tone: i === 2 ? "hi" : "lo", crease: "none" });
  }
  put("tdstack", [-195, -78, 34.5], g, shapes, { bias: 0.2 });
}
labelText(topText([-199, -65.4], 33.02, "描述符与 TD 卡堆", 4.2, "mid"));
// 事件匣（匣体+东唇一 item）
{
  const plan = { x: -208, y: -62, w: 26, d: 22, r: 1.4 };
  const lip = { x: -182, y: -63, w: 1.6, d: 24, r: 0.6 };
  put("tray.event", [-195, -51, 36],
    S(k.slabOf(plan, 33, 3.6, P, 3, 0.4), { tone: "hi" }) + S(k.slabOf(lip, 33, 5.2, P, 2), { tone: "mid" }),
    [record(A.slab(plan, 33, 3.6, { name: "tray.event", owner: "desk.top" }, 3)),
     record(A.slab(lip, 33, 5.2, { name: "tray.event.lip", owner: "desk.top" }, 2))], { bias: 0.2 });
}
labelText(topText([-195, -36.4], 33.02, "事件匣", 5.4, "mid"));
// 门铃台（台座 + 立板 + 门铃钮）
{
  slab("bell.base", { x: BELL.px, y: BELL.py - 2, w: BELL.pw, d: BELL.pd + 6, r: 1.2 }, 33, 3, { tone: "lo" }, { steps: 2 });
  slab("bell.panel", { x: BELL.px, y: BELL.py, w: BELL.pw, d: BELL.pd, r: 1 }, BELL.z0, BELL.z1 - BELL.z0, { tone: "mid" },
    { steps: 2, extra: screwDots({ x: BELL.px + 2, y: BELL.py + 0.4, w: BELL.pw - 4, d: BELL.pd - 0.8 }, 3, BELL.z1) });
  labelText(
    vtext(BELL.px + 3.5, DATA.bell.faceY, BELL.z1 - 3.8, "端点门铃", 5.8, "hi")
    + vtext(DATA.bell.btnX, DATA.bell.faceY, BELL.z0 + 1.4, "按铃", 3.8, "lo", "middle"));
  put("bell.btn", [DATA.bell.btnX, BELL.py + 2, DATA.bell.btnZ],
    `<g data-part="bellbtn">${geo.bellBtnSvg(0)}</g>`,
    [record(A.ring(G.frameOf([DATA.bell.btnX, DATA.bell.faceY + 0.05, DATA.bell.btnZ], [0, 1, 0], [1, 0, 0], [0, 0, 1]), 0, 0.85, 2.2, 4.2, { name: "bell.btn", owner: "bell.panel" }))], { bias: 0.3 });
}

// ================= 传输环架（主机内存：三类端点的传输环） =================
slab("rack.plat", RACK, PLATE_H, 4, { tone: "lo" }, { steps: 3, bevel: 0.4 });
for (const [key, rb] of Object.entries(RINGS)) {
  const bed = { x: rb.x0, y: rb.y0 + 2, w: rb.x1 - rb.x0, d: rb.y1 - rb.y0 - 4, r: 1.6 };
  // TD 槽位刻线（两条闭合槽框，卡未挂时可见）
  let slots = "";
  for (let s = 0; s < 2; s++) {
    const sx = rb.x0 + 3 + s * 13;
    slots += Ln(path3([[sx + 0.4, rb.y1 - 10.1, RING_Z + 2.05], [sx + 10.6, rb.y1 - 10.1, RING_Z + 2.05], [sx + 10.6, rb.y1 - 4.9, RING_Z + 2.05], [sx + 0.4, rb.y1 - 4.9, RING_Z + 2.05]], true), { tone: "lo" });
  }
  slab(`ring.${key}`, bed, RING_Z, 2, { tone: "mid" },
    { steps: 2, extra: Ln(k.planOutline(k.insetPlan(bed, 1.6), RING_Z + 2, P, 3), { tone: "faint" }) });
  put(`ring.${key}.slots`, [(rb.x0 + rb.x1) / 2, rb.y1 - 7.5, RING_Z + 2],
    slots, [record(A.box([rb.x0, rb.y1 - 10.6, RING_Z + 2], [rb.x1, rb.y1 - 4.4, RING_Z + 2.2], { name: `ring.${key}.slots`, owner: `ring.${key}` }))], { bias: 0.1 });
}
// 环名铭（平台前条；Interval/MaxBurst 值已刻在端点上下文表格卡与端点卡上）+ 就绪灯
labelText(
  topText([-114, -7.5], PLATE_H + 4.02, "Isoch EP1", 4.2, "mid")
  + topText([-85, -7.5], PLATE_H + 4.02, "Intr EP2", 4.2, "mid")
  + topText([-54, -7.5], PLATE_H + 4.02, "Bulk EP3", 4.2, "mid"));
{
  const lamp = (name, x, lampKey) => {
    cyl(`${name}.seat`, x, -13.2, 2.4, PLATE_H + 4, 1.4, { tone: "lo" }, { steps: 16 });
    const lf = G.frameOf([x, -13.2, PLATE_H + 5.4], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    put(`${name}.dome`, [x, -13.2, PLATE_H + 7],
      `<g class="lamp" data-lamp="${lampKey}">` + S(G.solidOf([[0, 0.2], [1, 2.2, 1], [2.2, 2.6, 1], [3, 2, 1], [3.4, 0.3]], lf, P, { steps: 20 }), { tone: "hi" }) + `</g>`,
      [record(A.solid(lf, [[0, 0.2], [1, 2.2, 1], [2.2, 2.6, 1], [3, 2, 1], [3.4, 0.3]], { name: `${name}.dome`, owner: `${name}.seat` }))], { bias: 0.3 });
  };
  lamp("ringlamp.iso", -104, "ringiso");
  lamp("ringlamp.intr", -77, "ringintr");
  lamp("ringlamp.bulk", -50, "ringbulk");
}
// IST 领先量刻组（Isoch 环前：取卡位/挂卡位 + ≥IST 括弧；纯刻线入 labels 层，live 点亮 .istbar）
{
  const y = -12.6, z = PLATE_H + 4.03;
  labelText(
    Ln(path3([[-122.5, y, z], [-122.5, y - 2.2, z]], false), { tone: "mid" })
    + Ln(path3([[-110.5, y, z], [-110.5, y - 2.2, z]], false), { tone: "mid" })
    + Ln(path3([[-122.5, y - 1.4, z], [-110.5, y - 1.4, z]], false), { tone: "lo", className: "istbar" })
    + topText([-116.5, -17.2], PLATE_H + 4.02, "≥IST 领先", 4.2, "lo"));
}
// 端点上下文表格卡（环架后沿立板；文字入 labels 层）
{
  slab("epp.panel", EPP, EPP.z0, EPP.z1 - EPP.z0, { tone: "mid" }, { steps: 2 });
  labelText(
    vtext(EPP.x + 3, EPP.y + EPP.d + 0.05, EPP.z1 - 3.6, "Endpoint Context（p232）", 4.4, "hi")
    + vtext(EPP.x + 3, EPP.y + EPP.d + 0.05, EPP.z1 - 9.4, "EP1 Isoch · Int 3 · MPS 1024 · Burst 3 · Mult 1", 2.9, "lo")
    + vtext(EPP.x + 3, EPP.y + EPP.d + 0.05, EPP.z1 - 14.2, "EP2 Intr · Int 4 · wBytesPerInterval 1024", 2.9, "lo")
    + vtext(EPP.x + 3, EPP.y + EPP.d + 0.05, EPP.z1 - 19.0, "EP3 Bulk OUT · MPS 1024 · MaxBurst 7", 2.9, "lo")
    + vtext(EPP.x + 3, EPP.y + EPP.d + 0.05, EPP.z1 - 23.8, "EP0 Control · MPS 512", 2.9, "lo")
    + vtext(EPP.x + 3, EPP.y + EPP.d + 0.05, EPP.z1 - 28.6, "IST=2 µF（p242）", 2.9, "mid"));
}

// ================= 总控台（xHC 控制器） =================
{
  slab("con.body", CON, PLATE_H, 84, { tone: "mid" }, { steps: 4, bevel: 0.8, inner: Ln(k.sideSeam(CON, 60, P, 4), { tone: "faint" }) });
  slab("con.lid", { x: CON.x - 3, y: CON.y - 3, w: CON.w + 6, d: CON.d + 6, r: 2 }, 96, 3, { tone: "mid" },
    { steps: 4, bevel: 0.5, extra: screwDots({ x: CON.x - 1, y: CON.y - 1, w: CON.w + 2, d: CON.d + 2 }, 8, 99) });
  // 台顶铭牌（顶面前条，避开台顶件）+ 三只旗灯（NRDY/ERDY/连续流）落台顶前条
  labelText(
    topText([-28, 33], 99.02, "xHC 控制器", 9, "hc")
    + topText([-28, 22.5], 99.02, "两张调度表 · 帧微帧节拍", 5.6, "mid", "start"));
  {
    const lidLamp = (name, x, lampKey, txt) => {
      cyl(`${name}.seat`, x, 24, 2.2, 99, 1.2, { tone: "lo" }, { steps: 16 });
      const lf = G.frameOf([x, 24, 100.2], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
      put(`${name}.dome`, [x, 24, 101.6],
        `<g class="lamp" data-lamp="${lampKey}">` + S(G.solidOf([[0, 0.2], [1, 2, 1], [2.2, 2.4, 1], [2.8, 1.8, 1], [3.2, 0.3]], lf, P, { steps: 18 }), { tone: "hi" }) + `</g>`,
        [record(A.solid(lf, [[0, 0.2], [1, 2, 1], [2.2, 2.4, 1], [2.8, 1.8, 1], [3.2, 0.3]], { name: `${name}.dome`, owner: `${name}.seat` }))], { bias: 0.35 });
      labelText(topText([x, 17.4], 99.02, txt, 3.8, "lo"));
    };
    lidLamp("fc.nrdy", 72, "nrdy", "NRDY");
    lidLamp("fc.erdy", 92, "erdy", "ERDY");
    lidLamp("fc.cont", 112, "cont", "连续流");
  }
  // 立面窗组（live 重建窗内内容；窗组随文字入 labels 层）+ 带宽列（右侧）
  labelText(
    `<g data-part="mfwin">${geo.mindexWinSvg(null, null)}</g>`
    + `<g data-part="sopcwin">${geo.sopcWinSvg(null)}</g>`
    + vtext(62, FACE_Y, 56, "周期带宽（p236）", 3.6, "hi", "start")
    + vtext(62, FACE_Y, 49.5, "预留合计 8.7 MB/s（公式 p236）", 2.9, "mid", "start")
    + vtext(62, FACE_Y, 43, "SS/FS ≤90% 帧 · HS ≤80% 微帧", 2.9, "lo", "start")
    + vtext(62, FACE_Y, 37, "剩余带宽归异步（Best Effort）", 2.8, "lo", "start"));
  // 收铃口（左面端子）
  {
    const bf = G.frameOf([-34, 14, 50], [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
    put("con.bellin", [-35.6, 14, 50], S(G.disc(0, 3, 2, bf, P, { steps: 18, bevel: 0.3 }), { tone: "mid" })
      + Ln(G.circleOf(bf, 3, 2, P, 18), { tone: "lo" }),
      [record(A.disc(bf, 0, 3, 2, { name: "con.bellin" }))], { bias: 0.2 });
    labelText(topText([-33, 12], 99.02, "收铃口", 4.6, "lo", "start"));
  }
  // 事件出口（台顶后段短管）
  cyl("con.evstub", 108, -96, 1.8, 99, 5, { tone: "lo" }, { steps: 18 });
  labelText(topText([108, -90], 99.02, "事件出口", 4.6, "lo"));
  // 线缆出口（右面端子凸台：外端面 x=121）
  {
    const bf = G.frameOf([118, -16, 26], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    put("con.busport", [119.5, -16, 26], S(G.disc(0, 3, 2, bf, P, { steps: 18, bevel: 0.3 }), { tone: "mid" })
      + Ln(G.circleOf(bf, 3, 2, P, 18), { tone: "faint" }),
      [record(A.disc(bf, 0, 3, 2, { name: "con.busport", owner: "con.body" }))], { bias: 0.2 });
  }
}

// ================= 台顶件一：微帧标尺（MIT 节拍） =================
{
  slab("belt.strip", BELT, 99, 2, { tone: "lo" }, { steps: 3 });
  // 微帧刻度（32 格，从条后沿挂到条面内）+ ESIT 高标（每 8：Isoch 1ms；每 16 双高标：Interrupt 2ms）
  let minor = "";
  for (let i = 0; i <= BTICK_N; i++) {
    const x = BTICK0 + i * BTICK_U;
    const isEsit = i % 8 === 0, isEsit2 = i % 16 === 0;
    const h = isEsit2 ? 4.0 : isEsit ? 3.4 : 1.8;
    minor += Ln(path3([[x, BELT.y, 101.05], [x, BELT.y + h, 101.05]], false), { tone: isEsit2 ? "hi" : isEsit ? "mid" : "lo" });
  }
  labelText(minor
    + topText([36, -96.6], 99.02, "微帧标尺（p235）· MIT=125µs", 3.6, "lo", "start")
    + topText([36, -100.8], 99.02, "高标每 8 格=Isoch ESIT 1ms · 每 16 格=Interrupt ESIT 2ms", 3.2, "lo", "start"));
  put("belt.mark", [BTICK0, BELT.y, 101],
    `<g data-part="mfmark">${geo.mfMarkSvg(BTICK0)}</g>`,
    [record(A.box([BTICK0 - 0.6, BELT.y - 4, 101], [BTICK0 + 0.6, BELT.y + 5, 102.4], { name: "belt.mark", owner: "belt.strip" }))], { bias: 0.3 });
}

// ================= 台顶件二：周期表卡架（Pipe Schedule · Isoch+Interrupt） =================
{
  const F = { x: PRACK.x, y: PRACK.y, w: PRACK.w, d: PRACK.d, r: 1 };
  slab("prack.floor", F, 99, 3, { tone: "lo" }, { steps: 3 });
  slab("prack.back", { x: F.x, y: F.y, w: F.w, d: 3.4, r: 0.8 }, 102, 26, { tone: "mid" }, { steps: 2 });
  box("prack.wallW", [F.x, F.y + 3.4, 102], [F.x + 2.6, F.y + F.d, 126], { tone: "mid" }, { r: 0.8 });
  box("prack.wallE", [F.x + F.w - 2.6, F.y + 3.4, 102], [F.x + F.w, F.y + F.d, 126], { tone: "mid" }, { r: 0.8 });
  labelText(
    topText([-80, 84], PLATE_H + 0.06, "周期表 · Isoch+Interrupt（p233）· 每 ESIT 一个 SO", 2.8, "hi", "start")
    + topText([40, 84], PLATE_H + 0.06, "异步表 · Control+Bulk · round-robin（p245–246）", 2.8, "hi", "start"));
  // 端点卡（live 控制；初始 F0 隐藏）——卡体入 item、刻字入 labels 尾层（防后画的
  // prack.wallE / dial.hubcol bbox 盖字，2026-11-05 遮挡修复轮）
  put("epc.iso", [-14, -80, 114], `<g data-ep="iso" style="display:none">${geo.epCardBodySvg("iso", -14, -82.2, 102, 24, 24)}</g>`,
    [record(A.slab({ x: -26, y: -82.2, w: 24, d: 4, r: 0.6 }, 102, 24, { name: "epc.iso", owner: "prack.floor" }, 2))], { bias: 0.2 });
  labelText(`<g data-eptext="iso" style="display:none">${geo.epCardTextSvg("iso", -14, -82.2, 102, 24, 24)}</g>`);
  put("epc.intr", [14, -80, 114], `<g data-ep="intr" style="display:none">${geo.epCardBodySvg("intr", 14, -82.2, 102, 24, 24)}</g>`,
    [record(A.slab({ x: 2, y: -82.2, w: 24, d: 4, r: 0.6 }, 102, 24, { name: "epc.intr", owner: "prack.floor" }, 2))], { bias: 0.2 });
  labelText(`<g data-eptext="intr" style="display:none">${geo.epCardTextSvg("intr", 14, -82.2, 102, 24, 24)}</g>`);
  // Active 灯 + SO 灯（卡架底板前条）
  const rackLamp = (name, x, lampKey, txt) => {
    cyl(`${name}.seat`, x, -60, 2.2, 102, 1.2, { tone: "lo" }, { steps: 16 });
    const lf = G.frameOf([x, -60, 103.2], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    put(`${name}.dome`, [x, -60, 104.6],
      `<g class="lamp" data-lamp="${lampKey}">` + S(G.solidOf([[0, 0.2], [1, 2, 1], [2.2, 2.4, 1], [2.8, 1.8, 1], [3.2, 0.3]], lf, P, { steps: 18 }), { tone: "hi" }) + `</g>`,
      [record(A.solid(lf, [[0, 0.2], [1, 2, 1], [2.2, 2.4, 1], [2.8, 1.8, 1], [3.2, 0.3]], { name: `${name}.dome`, owner: `${name}.seat` }))], { bias: 0.35 });
    labelText(topText([x, -54.4], 102.02, txt, 3.6, "lo"));
  };
  rackLamp("act.iso", -22, "actiso", "Active");
  rackLamp("so.iso", -8, "soiso", "SO");
  rackLamp("act.intr", 8, "actintr", "Active");
  rackLamp("so.intr", 22, "sointr", "SO");
}

// ================= 台顶件三：异步轮转盘（Pipe Schedule · Control+Bulk · round-robin） =================
{
  const { cx, cy, rDisc, seatR } = DIAL;
  // 盘体（圆柱 + 周缘刻度 + 座位方位标）——盘面刻度随 build 静态
  let ticks = "";
  for (let i = 0; i < 24; i++) {
    const a = (i * 15 * Math.PI) / 180;
    const r0 = rDisc - 1.2, r1 = rDisc - (i % 8 === 0 ? 4.4 : 2.6);
    ticks += Ln(path3([[cx + r0 * Math.sin(a), cy + r0 * Math.cos(a), 105.4], [cx + r1 * Math.sin(a), cy + r1 * Math.cos(a), 105.4]], false), { tone: i % 8 === 0 ? "mid" : "lo" });
  }
  put("dial.disc", [cx, cy, 101.5],
    S(k.cylinder(cx, cy, rDisc, 99, 6, P, 40, 0.4), { tone: "mid" }) + ticks,
    [record(A.cylinder(cx, cy, rDisc, 99, 6, { name: "dial.disc", owner: "con.lid" }, 40))], { bias: 0.2 });
  // 中心立柱（独立深度项：柱体高过卡座，与后卡座遮挡方向和盘体相反）
  put("dial.hubcol", [cx, cy, 118],
    S(k.cylinder(cx, cy, 3.2, 105, 25.5, P, 16, 0.3), { tone: "mid" }),
    [record(A.cylinder(cx, cy, 3.2, 105, 25.5, { name: "dial.hubcol", owner: "dial.disc" }, 16))], { bias: 0.6 });
  // 指针臂（独立深度项：横臂在卡座上方扫过，settle 才能与端点卡正确互遮）
  {
    const tipY = cy + 19;
    const domeF = G.frameOf([cx, tipY, DIALZARM + 0.6], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    put("dial.arm", [cx, cy + 10, DIALZARM],
      `<g data-part="dialarm">${geo.dialArmSvg(0, 0)}</g>`,
      [record(A.prism(G.frameAlong([cx, cy, DIALZARM], [0, 1, 0]), [[-0.7, 0], [0.7, 0], [0.7, 1.4], [-0.7, 1.4]], 0, 19.5, { name: "dial.arm", owner: "dial.hubcol" })),
       record(A.solid(domeF, [[0, 0.2], [1, 2, 1], [2.2, 2.5, 1], [3, 1.9, 1], [3.4, 0.3]], { name: "dial.sotip", owner: "dial.arm" }))], { bias: 1.2 });
  }
  labelText();
  // 卡座 ×3（盘缘方位座；端点卡 live 落座）
  SEATS.forEach((seat, i) => {
    const cplan = { x: seat.x - 8, y: seat.y - 5, w: 16, d: 10, r: 1.2 };
    slab(`dial.seat${i}`, cplan, 105, 2.6, { tone: "lo" }, { steps: 2 });
    if (seat.kind !== "empty") {
      put(`epc.${seat.kind}`, [seat.x, seat.y, 118], `<g data-ep="${seat.kind}" style="display:none">${geo.epCardBodySvg(seat.kind, seat.x, seat.y - 2, 107.6, 15, 20, true)}</g>`,
        [record(A.slab({ x: seat.x - 7.5, y: seat.y - 2, w: 15, d: 4, r: 0.6 }, 107.6, 20, { name: `epc.${seat.kind}`, owner: `dial.seat${i}` }, 2))], { bias: 0.25 });
      labelText(`<g data-eptext="${seat.kind}" style="display:none">${geo.epCardTextSvg(seat.kind, seat.x, seat.y - 2, 107.6, 15, 20, true)}</g>`);
    } else {
      labelText(topText([seat.x, seat.y + 1.4], 107.62, "空位 …", 3.6, "lo"));
    }
    // Active 灯（卡座前缘；座+罩一 item）
    {
      const lx = seat.x, ly = seat.y - 7.4;
      const lf = G.frameOf([lx, ly, 106.1], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
      put(`dlamp${i}`, [lx, ly, 106.6],
        S(k.cylinder(lx, ly, 2.0, 105, 1.1, P, 14), { tone: "lo" })
        + `<g class="lamp" data-lamp="act${seat.kind}">` + S(G.solidOf([[0, 0.2], [1, 1.8, 1], [2, 2.2, 1], [2.6, 1.6, 1], [3, 0.3]], lf, P, { steps: 16 }), { tone: "hi" }) + `</g>`,
        [record(A.cylinder(lx, ly, 2.0, 105, 1.1, { name: `dlamp${i}.seat`, owner: "dial.disc" }, 14)),
         record(A.solid(lf, [[0, 0.2], [1, 1.8, 1], [2, 2.2, 1], [2.6, 1.6, 1], [3, 0.3]], { name: `dlamp${i}.dome`, owner: `dlamp${i}.seat` }))], { bias: 0.35 });
      labelText(topText([seat.x, seat.y - 11.4], 105.02, seat.kind === "bulk" || seat.kind === "ctrl" ? "Active" : "", 3.4, "lo"));
    }
  });
  // 「下一个」标记（被周期打断时记住下一个该轮的管道 · p245；台面平刻、指向前卡座）
  labelText(`<g data-part="nextmark" style="display:none">`
    + Ln(path3([[73, -27.0, 99.05], [79, -27.0, 99.05], [76, -30.4, 99.05]], true), { tone: "hi" })
    + topText([66.5, -28.2], 99.15, "下一个", 3.2, "hi") + `</g>`);
}

// ================= TD 卡（三条环上的传输描述符；live 控制） =================
{
  const mk = (ring, slot) => {
    const rb = RINGS[ring];
    const plan = { x: rb.x0 + 3 + slot * 13, y: rb.y1 - 9.5, w: 11, d: 4.4, r: 0.5 };
    put(`td.${ring}.${slot}`, [rb.x0 + 3 + slot * 13 + 5.5, rb.y1 - 7.3, RING_Z + 8],
      `<g data-td="${ring}-${slot}" style="display:none">${geo.tdCardBodySvg(ring, slot, 1)}</g>`,
      [record(A.slab(plan, RING_Z + 2.05, 13, { name: `td.${ring}.${slot}`, owner: `ring.${ring}` }, 2))], { bias: 0.2 });
    labelText(`<g data-tdtext="${ring}-${slot}" style="display:none">${geo.tdCardTextSvg(ring, slot, 1)}</g>`);
  };
  mk("iso", 0); mk("iso", 1);
  mk("intr", 0); mk("intr", 1);
  mk("bulk", 0); mk("bulk", 1);
}

// ================= 设备试验盒 =================
{
  slab("box.plinth", { x: BOX.px, y: BOX.py, w: BOX.pw, d: BOX.pd, r: 3 }, PLATE_H, 6, { tone: "lo" }, { steps: 3, bevel: 0.6 });
  const tw = { x: BOX.tx, y: BOX.ty, w: BOX.tw, d: BOX.td, r: 3 };
  slab("box.tower", tw, PLATE_H + 6, 46, { tone: "mid" },
    { steps: 3, bevel: 0.8, inner: Ln(k.sideSeam(tw, 40, P, 3), { tone: "faint" }) });
  slab("box.roof", { x: BOX.tx - 4, y: BOX.ty - 4, w: BOX.tw + 8, d: BOX.td + 8, r: 3 }, PLATE_H + 52, 4, { tone: "mid" }, { steps: 3, bevel: 0.6 });
  cyl("box.cap", BOX.tx + BOX.tw / 2, BOX.ty + BOX.td / 2, 3.4, PLATE_H + 56, 3.5, { tone: "hi" }, { steps: 24 });
  // 塔铭牌（顶面）
  labelText(
    topText([152, 8], PLATE_H + 56.02, "USB 设备 · 三类端点", 7.5, "dev")
    + topText([152, -2], PLATE_H + 56.02, "Isoch IN · Interrupt IN · Bulk OUT", 4.6, "mid"));
  // 三端点收发窗（live 只重建窗值组 -v；窗框/标题随文字入 labels 层）
  const win = (x0, x1, part, title) => {
    const y = DATA.boxFaceY, z0 = 36, z1 = 58;
    labelText(`<g data-part="${part}">` + Ln(k.pathOf([[x0, y + 0.3, z0], [x1, y + 0.3, z0], [x1, y + 0.3, z1], [x0, y + 0.3, z1]].map(at), true), { tone: "lo" })
      + vtext((x0 + x1) / 2, y + 0.4, z1 - 3.2, title, 3.8, "mid", "middle")
      + `<g data-part="${part}-v">` + vtext((x0 + x1) / 2, y + 0.4, z0 + 6.2, "—", 4.6, "lo", "middle") + `</g></g>`);
  };
  win(136, 158, "deviso", "Isoch IN");
  win(161, 183, "devintr", "Intr IN");
  win(186, 206, "devbulk", "Bulk OUT");
  labelText(vtext(170, DATA.boxFaceY, 62.4, "NRDY/ERDY 流控票据走总线缆", 3.4, "lo", "middle"));
  // 教学锚长铭牌（基座前立牌，嵌入基座前缘 0.2；文字入 labels 层防塔顶盖字）
  {
    const np = { x: 128, y: 55.8, w: 88, d: 3, r: 1 };
    put("box.nameplate", [np.x + np.w / 2, np.y + np.d / 2, 14],
      S(k.slabOf(np, PLATE_H, 24, P, 2), { tone: "lo", crease: "none" })
      + Ln(path3([[np.x + 2, np.y + np.d + 0.05, PLATE_H + 2], [np.x + np.w - 2, np.y + np.d + 0.05, PLATE_H + 2]], false), { tone: "faint", free: true })
      + Dots([[np.x + 2.6, np.y + np.d + 0.2, PLATE_H + 21.4], [np.x + np.w - 2.6, np.y + np.d + 0.2, PLATE_H + 21.4]].map((p) => at(p)), { size: 0.45 }),
      [record(A.slab(np, PLATE_H, 24, { name: "box.nameplate" }, 2))], { bias: 0.15 });
    labelText(
      vtext(np.x + 4, np.y + np.d + 0.05, PLATE_H + 18.2, "调度全在主机侧", 6.2, "dev")
      + vtext(np.x + 4, np.y + np.d + 0.05, PLATE_H + 9.6, "设备只见 USB 事务——", 4.6, "mid")
      + vtext(np.x + 4, np.y + np.d + 0.05, PLATE_H + 3.8, "调度表·SO·ESIT·IST 是 xHC 内部概念", 4.6, "mid"));
  }
  // 线缆端口座（西面端子凸台：外端面 x=131）
  {
    const bf = G.frameOf([BOX.tx, -16, 30], [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
    put("box.busport", [BOX.tx - 1.5, -16, 30], S(G.disc(0, 3, 2, bf, P, { steps: 18, bevel: 0.3 }), { tone: "mid" })
      + Ln(G.circleOf(bf, 3, 2, P, 18), { tone: "faint" }),
      [record(A.disc(bf, 0, 3, 2, { name: "box.busport", owner: "box.tower" }))], { bias: 0.2 });
  }
}

// ================= 线缆（门铃拉线 / 总线缆 / 事件回流管） =================
// 端点落位（audit 判据）与 4.12 同口径：总线缆两端 exactly 在端口凸台外端面（rim 落凸台
// 端面圆过 terminals）；门铃拉线 ends=false 只求 clearance；事件管两端垂直贴挂载面。
const WIRE_BELL = [[-159, -60.5, 58.9], [-152, -50, 61.5], [-120, -38, 63], [-80, -18, 63], [-48, 4, 58], [-44, 14, 50.6], [-37.4, 14, 50]];
const CABLE_BUS = [[121, -16, 26], [124, -16, 26], [126, -27, 27.5], [129, -25, 29], [128, -16, 30], [131, -16, 30]];
const TUBE_EV = [[108, -96, 104], [108, -96, 107], [104, -102, 109], [60, -110, 109], [-30, -110, 109], [-110, -110, 105], [-168, -102, 90], [-186, -78, 66], [-192, -56, 48], [-196, -49, 46], [-196, -49, 36.7]];
const wireChunks = [];
{
  { // 门铃拉线（文书台门铃 → 总控台收铃口）
    const route = G.fillet(WIRE_BELL, 2.6, 8, { P, tube: 0.55 });
    R.route("wire.bell", route, 0.55, { piece: "bench", limp: true, tips: [null, null], ends: [false, false] });
    tubePieces(route, 0.55, P, { maxLength: 16 }).forEach((piece, index) => {
      wireChunks.push({ name: `wire.bell:${index}`, pts: piece.points.map((p) => p.map(f2)) });
      put(`wire.bell:${index}`, piece.mid, tubeSvg(piece, { tone: "lo" }), [A.tube(piece.points, piece.radii)], { bias: 0.05, route: "wire.bell", chunk: index });
    });
  }
  { // 总线缆（总控台 ↔ 设备：USB 事务通道；rim=端环即接头）
    const route = G.fillet(CABLE_BUS, 3.6, 10, { P, tube: 0.7 });
    R.route("cable.bus", route, 0.7, { piece: "bench", rims: [2, 2], limp: true });
    tubePieces(route, 0.7, P, { maxLength: 14, spacing: 1 }).forEach((piece, index) => {
      wireChunks.push({ name: `cable.bus:${index}`, pts: piece.points.map((p) => p.map(f2)) });
      put(`cable.bus:${index}`, piece.mid, tubeSvg(piece, { tone: "mid" }), [A.tube(piece.points, piece.radii)], { bias: 0.05, route: "cable.bus", chunk: index });
    });
  }
  { // 事件回流管（总控台事件出口 → 文书台事件匣；rim=端环即管口）
    const route = G.fillet(TUBE_EV, 5, 10, { P, tube: 0.9 });
    R.route("tube.ev", route, 0.9, { piece: "bench", rims: [1.7, 1.7], limp: true });
    tubePieces(route, 0.9, P, { maxLength: 18, spacing: 1 }).forEach((piece, index) => {
      wireChunks.push({ name: `tube.ev:${index}`, pts: piece.points.map((p) => p.map(f2)) });
      put(`tube.ev:${index}`, piece.mid, tubeSvg(piece, { tone: "mid" }), [A.tube(piece.points, piece.radii)], { bias: 0.05, route: "tube.ev", chunk: index });
    });
  }
}
DATA.wirePaths = { bell: WIRE_BELL.map((p) => p.map(f2)), bus: CABLE_BUS.map((p) => p.map(f2)), ev: TUBE_EV.map((p) => p.map(f2)) };

// ================= 台面平刻注记（live 显隐；环空摘出 / 连续流打断） =================
{
  const noteBox = (x0, y0, w, h) => Ln(path3([[x0, y0, PLATE_H + 0.05], [x0 + w, y0, PLATE_H + 0.05], [x0 + w, y0 + h, PLATE_H + 0.05], [x0, y0 + h, PLATE_H + 0.05]], true), { tone: "faint" });
  labelText(`<g data-note="err" style="display:none">` + noteBox(-78, 64, 190, 15)
    + topText([-75, 75.4], PLATE_H + 0.06, "IN 环空=Ring Overrun · OUT=Underrun → 摘出周期表 · 再写门铃放回（p238）", 2.8, "hi", "start")
    + topText([-75, 69.2], PLATE_H + 0.06, "TD 超 Max ESIT Payload → Bandwidth Overrun · 截断推进 · 管道保持 Active（p238）", 2.6, "mid", "start") + `</g>`);
  labelText(`<g data-note="def" style="display:none">` + noteBox(-78, 47, 190, 15)
    + topText([-75, 58.4], PLATE_H + 0.06, "单端点在表：SOPC 可超 MSOPC 连续流 · 第二端点入表即打断 · 回 MSOPC 限（p246）", 2.8, "hi", "start")
    + topText([-75, 52.2], PLATE_H + 0.06, "SS Deferred（NRDY）→ 流控标记 · 等 ERDY 回表（p251）", 2.6, "mid", "start") + `</g>`);
}

// ================= settle + assemble =================
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const itemG = (it) => `<g class="it" data-name="${it.name}"${it.attrs ?? ""}>${it.svg}</g>`;
const seq = R.items.map(itemG);
// 组序（2026-11-05 遮挡修复轮）：items（settle 判深画家序，线缆/轮转盘互遮既证配对不动）
// → 票据/事件卡体 → 票据/事件刻字（两遍渲染消同层票互盖）→ labels（含 TD/端点卡刻字，
// 置于 actors 之后——事件卡飞越文书台上空曾盖 labels 文字）。labels 内只有线与文字
// （无填充 path），后置不构成任何遮挡者。
seq.push(`<g data-part="actors-tokens"></g><g data-part="actors-events"></g><g data-part="actor-texts"></g>`);
seq.push(`<g class="fb-labels">${labels.join("")}</g>`);
const svg = k.figureSvg({
  width: W, height: H,
  label: "调度轮转台：左侧文书台是 xHCI 驱动（规范称 system software）——把描述符翻成 Endpoint Context、给三类端点的传输环挂 TD 卡、写端点门铃；中间总控台是 xHC——MFINDEX 窗按 MIT=125µs 推进微帧节拍，周期表卡架上的 Isoch/Interrupt 端点卡每 ESIT 得一个服务机会（Isoch 恰一枚 TD），异步轮转盘的指针按 round-robin 轮转点名 Bulk/Control 卡座（每过一遍表一个 SO，SOPC 递减归零换端点）；右侧试验盒是设备——只按端点类型收发 USB 事务，调度表/SO/ESIT/IST 都是 xHC 内部概念。",
  body: [...back, `<g class="fb-stage">${seq.join("")}</g>`].join(""),
});

// ================= figure CSS =================
const DRV = THEME === "light" ? "#2d5fb3" : "#7c9ff0";
const HC = THEME === "light" ? "#8a5f14" : "#d9a860";
const DEV = THEME === "light" ? "#2f7a3d" : "#86bd7a";
const ERR = THEME === "light" ? "#b0392f" : "#e08a80";
const CSS = `
.fb-stage { --lamp-glow: ${THEME === "light" ? "#d98428" : "#ffb45e"}; --lamp-ink: ${THEME === "light" ? "#c96a12" : "#ffd9a0"}; }
.iso-face-text[data-tone="drv"] { fill: ${DRV}; }
.iso-face-text[data-tone="hc"] { fill: ${HC}; }
.iso-face-text[data-tone="dev"] { fill: ${DEV}; }
.iso-face-text[data-tone="err"] { fill: ${ERR}; }
.fb-stage .lamp path { fill: var(--anatomy-shade-2); transition: fill 300ms; }
.fb-stage .lamp.on path { fill: var(--lamp-ink); }
.fb-stage .lamp.on { filter: drop-shadow(0 0 6px var(--lamp-glow)); }
.fb-stage .istbar { stroke: var(--anatomy-lo); stroke-width: 1.4; transition: stroke 300ms; }
.fb-stage .istbar.lit { stroke: ${HC}; filter: drop-shadow(0 0 4px ${HC}); }
.fb-stage .epcard .iso-solid > path { transition: stroke 300ms; }
.fb-stage .epcard.hot .iso-solid > path { stroke: ${HC}; }
.stoken .iso-face-text[data-tone="tk"] { fill: ${HC}; }
.stoken.tk-hc .iso-face-text { fill: ${HC}; }
.stoken.tk-drv .iso-face-text { fill: ${DRV}; }
.stoken.tk-dev .iso-face-text { fill: ${DEV}; }
@media (prefers-reduced-motion: reduce) { .fb-stage * { transition: none !important; } }
`;

// ================= 泳道静态图（页面级平面 SVG；步进模式退役由机器接管，总览保留） =================
function laneSvg() {
  const LW = 1180, LH = 1130;
  const stepH = 58, gap = 18;
  const drv = { x: 20, y: 70, w: 540, h: 668 };
  const hc = { x: 610, y: 70, w: 550, h: 668 };
  const dev = { x: 20, y: Math.max(drv.y + drv.h, hc.y + hc.h) + 34, w: 1140, h: 170 };
  const steps = [
    { t: "1 · 翻译描述符 → Endpoint Context", t2: "Interval / MPS / Max Burst Size / Mult · 组 TD 上传输环", p: "p232", hc: "xHC 用 MPS/MaxBurst 管理 USB 事务（环在主机内存）" },
    { t: "2 · 写端点门铃（Running 态端点）", t2: "→ 入 Pipe Schedule=Active · 环空或退出 Running 即摘出", p: "p232", hc: "每 BI 两张表：周期（Isoch+Interrupt）/ 异步（Control+Bulk）" },
    { t: "3 · SO：每过一遍表一个服务机会", t2: "MSOPC=(MaxBurst+1)(Mult+1) · SOPC 递减归零换端点", p: "p233–234", hc: "SO 内 1–3 笔 USB 事务 · 单端点在表可超 MSOPC 连续流" },
    { t: "4 · 周期带宽按 Max ESIT Payload 预留", t2: "Reserved=MaxESITPayload/(2^Interval×0.000125) MB/s", p: "p235–236", hc: "SS/FS ≤90% 帧 · HS ≤80% 微帧 · 剩余归异步" },
    { t: "5 · Isoch：每 ESIT 恰处理一枚 Isoch TD", t2: "SOPC=min(TDPC,MSOPC) · ESIT 全对齐 MIT 边界", p: "p237", hc: "xHC 可在 ESIT 内任意时刻调度 · TD 须有机会在 ESIT 内完成" },
    { t: "6 · Isoch 环空 → Overrun/Underrun", t2: "摘出周期表 · 再写门铃放回 · TD 超限=Bandwidth Overrun 截断推进", p: "p238", hc: "管道保持 Active · 空环 OUT 发零长 DP 消耗该 TD" },
    { t: "7 · IST：挂 TRB 领先 xHC ≥IST", t2: "HCSPARAMS2 · bit[3]=0 微帧/=1 帧 · 读 MFINDEX 恒加 1 微帧", p: "p242", hc: "不满足 → 部分成形 Isoch TD=未定义行为" },
    { t: "8 · Interrupt：每 ESIT 恰一个 SO", t2: "空闲后首笔事务 ≤IST+ESIT · TD 可超 Max ESIT Payload 跨多 ESIT", p: "p243", hc: "SS NRDY → 无限期等 ERDY（超时归软件）· ERDY→IN ≤2×ESIT" },
    { t: "9 · 异步：round-robin 轮转保公平", t2: "MSTrS=MPS×(MaxBurst+1) · 被周期打断 → 记住下一个该轮的管道", p: "p245–246", hc: "控制传输每 Stage=独立 Async TD · 可分属不同 SO" },
    { t: "10 · 回执：Transfer Event 写事件环", t2: "Overrun/Underrun · Missed Service · Bandwidth Overrun 按完成码报", p: "p232 · p238–240", hc: "软件读事件环 · 环空的端点再写门铃重新入表" },
  ];
  const dBoxX = 66, dBoxW = 430;
  const hBoxX = 664, hBoxW = 440;
  const dY = (i) => drv.y + 62 + i * (stepH + gap);
  const hY = (i) => hc.y + 62 + i * (stepH + gap);
  let g = "";
  const lane = (r, label, cls) =>
    `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="14" class="lane-bg"/>` +
    `<rect x="${r.x + 3}" y="${r.y + 3}" width="${r.w - 6}" height="${r.h - 6}" rx="12" class="lane-edge ${cls}"/>` +
    `<text x="${r.x + 22}" y="${r.y + 42}" class="lane-name ${cls}">${label}</text>`;
  g += lane(drv, "xHCI 驱动", "c-drv");
  g += `<text x="${drv.x + 150}" y="${drv.y + 42}" class="lane-sub">规范称 system software（系统软件）</text>`;
  g += lane(hc, "xHC 控制器", "c-hc");
  g += lane(dev, "设备（经 USB 事务被动参与）", "c-dev");
  steps.forEach((s, i) => {
    const y = dY(i);
    g += `<rect x="${dBoxX}" y="${y}" width="${dBoxW}" height="${stepH}" rx="8" class="box c-drv"/>`;
    if (s.t2) {
      g += `<text x="${dBoxX + 16}" y="${y + 23}" class="box-t">${s.t}</text>`;
      g += `<text x="${dBoxX + 16}" y="${y + 44}" class="box-s">${s.t2}</text>`;
    } else {
      g += `<text x="${dBoxX + 16}" y="${y + 36}" class="box-t">${s.t}</text>`;
    }
    g += `<text x="${dBoxX + dBoxW - 12}" y="${y + 21}" class="box-p">${s.p}</text>`;
    const hy = hY(i);
    g += `<rect x="${hBoxX}" y="${hy}" width="${hBoxW}" height="${stepH}" rx="8" class="box c-hc"/>`;
    g += `<text x="${hBoxX + 16}" y="${hy + 36}" class="box-t">${s.hc}</text>`;
    g += `<line x1="${dBoxX + dBoxW + 2}" y1="${y + stepH / 2}" x2="${hBoxX - 2}" y2="${hy + stepH / 2}" class="arr" marker-end="url(#arrh)"/>`;
  });
  // 设备泳道注记框 + 两条箭头（三端点收发 → xHC）
  const dBox = { x: 60, y: dev.y + 50, w: 660, h: 104 };
  g += `<rect x="${dBox.x}" y="${dBox.y}" width="${dBox.w}" height="${dBox.h}" rx="10" class="box c-dev"/>`;
  g += `<text x="${dBox.x + 22}" y="${dBox.y + 40}" class="box-t">设备只见 USB 事务——Isoch 数据、Interrupt NRDY/ERDY、Bulk/Control 收发（p243–245）</text>`;
  g += `<text x="${dBox.x + 22}" y="${dBox.y + 70}" class="box-s">Pipe Schedule / SO / ESIT / IST / MSOPC 都是 xHC 内部概念；SS 中断端点 NRDY 流控后 xHC 无限期等 ERDY、超时归软件（p244）</text>`;
  g += `<line x1="${dBox.x + 240}" y1="${dBox.y - 2}" x2="${hBoxX + 170}" y2="${hY(7) + stepH + 2}" class="arr dash" marker-end="url(#arrh)"/>`;
  g += `<line x1="${dBox.x + 470}" y1="${dBox.y - 2}" x2="${hBoxX + 340}" y2="${hY(8) + stepH + 2}" class="arr dash" marker-end="url(#arrh)"/>`;
  return `<svg id="lane-svg" viewBox="0 0 ${LW} ${LH}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="§4.14 传输环管理三方泳道总览：驱动侧十步，xHC 侧两张调度表与三类服务时机，设备泳道按端点类型收发">
<defs><marker id="arrh" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="arr-head"/></marker></defs>
<style>
.lane-bg { fill: var(--anatomy-paper); }
.lane-edge { fill: none; stroke-width: 2.5; }
.c-drv { stroke: ${DRV}; }
.c-hc { stroke: ${HC}; }
.c-dev { stroke: ${DEV}; }
.lane-name { font: 700 21px var(--anatomy-ui, sans-serif); }
.lane-name.c-drv { fill: ${DRV}; }
.lane-name.c-hc { fill: ${HC}; }
.lane-name.c-dev { fill: ${DEV}; }
.lane-sub { font: 500 14px var(--anatomy-ui, sans-serif); fill: var(--anatomy-muted); }
.box { fill: ${THEME === "light" ? "#f4f2ee" : "#232327"}; stroke-width: 1.6; }
.box-t { font: 600 16px var(--anatomy-ui, sans-serif); fill: var(--anatomy-line-hi); }
.box-s { font: 500 14.5px var(--anatomy-ui, sans-serif); fill: var(--anatomy-line-mid); }
.box-p { font: 500 13px var(--anatomy-mono, monospace); fill: var(--anatomy-line-mid); text-anchor: end; }
.arr { stroke: ${THEME === "light" ? "#33333a" : "#d8d8dc"}; stroke-width: 2.4; fill: none; }
.arr.dash { stroke-dasharray: 6 5; }
.arr-head { fill: ${THEME === "light" ? "#33333a" : "#d8d8dc"}; }
</style>${g}</svg>`;
}

// ================= 页面 =================
const navHtml = `
<nav class="spec-nav">
  <a href="../../index.html">← 规范目录</a>
  <span class="nav-title">§4.14 传输环管理（Managing Transfer Rings）</span>
  <span class="nav-sib">
    <a href="../4.13-device-notifications/index.html" title="§4.13 设备通知">上一节 §4.13</a>
    <a href="../4.15-suspend-resume/index.html" title="§4.15 挂起与恢复">下一节 §4.15</a>
  </span>
</nav>
<p class="spec-ref">xHCI 1.2b §4.14 Managing Transfer Rings · p232–251 · §4.14.1 General Scheduling Model p233 / §4.14.2 Periodic Transfer Ring Scheduling p235 / §4.14.3 Interrupt Transfer Ring Scheduling p243 / §4.14.4 Asynchronous Transfer Ring Scheduling p245（页码已机核，见 EVIDENCE.md）</p>`;

const proseHtml = `
<section class="spec-block">
  <h2>规范要义</h2>
  <p>本节是 xHC 与传输环打交道的总纲：软件（本页「xHCI 驱动」即规范原文所称 system software（系统软件））把设备端点描述符（含 SuperSpeed Endpoint Companion 描述符）翻译成 Endpoint Context 的 <b>Interval、Max Packet Size、Max Burst Size、Mult</b> 四个字段，xHC 用它们安排 USB 事务；TD 允许把不连续的主机内存缓冲拼成一段连续数据，<b>TD Transfer Size=TD 内全部 TRB 的 Transfer Length 之和</b>，IN 管道可被设备以 Short Packet 截断——xHC 退役该 TD 并推进到下一 TD 或 Enqueue Pointer（Cycle bit 翻转处），先到先算。端点是否被服务由 <b>Pipe Schedule</b>（调度表）决定：<b>Active=在表上、Inactive=不在表上</b>——Running 态端点被写门铃即激活入表，环空或退出 Running 即被摘出，再写一次门铃可重新入表。</p>
  <p>调度按 <b>Bus Instance（BI）</b> 组织：一个 BI 代表一份该速度下的单位总线带宽，Total Available Bandwidth 按经验至少比标称速率低 20%，且多个根集线器端口可共享一份 BI（映射对软件不可见）。xHC 每个 BI 典型维护<b>两张 Pipe Schedule</b>——周期表（Isoch+Interrupt）与异步表（Control+Bulk）；每过一遍表，每个端点拿到一个 <b>Service Opportunity（SO）</b>：一块用于搬包的时间，内含 1–3 笔 USB 事务，最多排 MSOPC=(Max Burst Size+1)×(Mult+1) 个 DP。周期管道由 Address Device / Configure Endpoint 命令严格看管，占用不超过 Total Available Bandwidth 的限定百分比（SS/FS 每帧 ≤90%、HS 每微帧 ≤80%，p236），剩下的带宽全归异步管道——异步端点是 <b>Best Effort</b>，投递延迟无上界。系统总线带宽也按同一思路管理：Average TRB Length 是关键指标，系统带宽不足时 Configure Endpoint 同样会被 Bandwidth Error 拒绝（§4.14.1.1 p234）。</p>
  <p>三类端点的差异集中在<b>服务时机</b>：Isoch 端点 Active 时 xHC <b>每 ESIT 恰好处理一枚 Isoch TD</b>（ESIT=2^Interval×125µs，全对齐 MIT 边界），软件挂 TRB 必须领先 xHC 至少 IST（HCSPARAMS2 里的等时调度提前量）；Interrupt 端点把 Interval 当节流/截止参数，每 ESIT 一个 SO、空闲后首笔事务最迟 IST+ESIT 内上总线，TD 可以超过 Max ESIT Payload 而跨多个 ESIT 完成；Bulk/Control 走异步表 <b>round-robin 轮转</b>——多端点时每个 SO 限 MSOPC 个包，只剩一个端点时可连续流。下方机器「调度轮转台」把四小节做成一台可步进的调度机：写门铃入表、微帧节拍取 TD、异步指针轮转点名、环空摘出与重新入表。</p>
</section>`;

const quoteHtml = `
<section class="spec-block">
  <h2>原文对照</h2>
  <blockquote><p class="q">“An endpoint is considered Active when it is on the xHC’s Pipe Schedule, and Inactive if it is not. Ringing the Doorbell of an endpoint in the Running state will activate it, and the xHC shall place the endpoint in its Pipe Schedule.”</p><p class="cite">(xHCI 1.2b §4.14 p232)</p><p class="zh">在表=Active、摘出=Inactive；激活与重新激活都由写门铃触发——门铃是软件驱动调度表的唯一入口。</p></blockquote>
  <blockquote><p class="q">“An xHC will typically maintain two Pipe Schedules per Bus Instance, one for periodic pipes (Isoch and Interrupt endpoints) and another for async pipes (Control and Bulk).”</p><p class="cite">(xHCI 1.2b §4.14.1 p233)</p><p class="zh">每个 BI 一张周期表、一张异步表——三类端点由此分道。</p></blockquote>
  <blockquote><p class="q">“If an Isoch Endpoint Context is Active, the xHC shall process one Isoch TD from its Transfer Ring each ESIT.”</p><p class="cite">(xHCI 1.2b §4.14.2.1 p237)</p><p class="zh">等时调度的节拍器：每 ESIT 恰一枚 Isoch TD；环里没 TD 可取就报 Ring Overrun（IN）/Ring Underrun（OUT）并摘出周期表（p238）。</p></blockquote>
  <blockquote><p class="q">“The value of this field indicates to system software the minimum distance (in time) that it is required to stay ahead of the host controller while adding TRBs in order to have the host controller process them at the correct time.”</p><p class="cite">(xHCI 1.2b §4.14.2.1.4 p242)</p><p class="zh">IST 是软件必须领先 xHC 的最小时间量——不满足会遇到部分成形的 Isoch TD（未定义行为，p242 Note）。</p></blockquote>
  <blockquote><p class="q">“To ensure fairness across the pipes in the async schedule, the xHC shall schedule Service Opportunities for each Async Pipe using a round-robin algorithm.”</p><p class="cite">(xHCI 1.2b §4.14.4 p245)</p><p class="zh">异步侧的公平由规范强制：round-robin 轮转，每过一遍表一个 SO。</p></blockquote>
</section>`;

const laneCard = k.plateHtml({
  fig: "流程",
  title: "§4.14 传输环管理主线：三方泳道总览",
  hint: "放大看小框文字 · 全屏后滚轮浏览",
  readout: "驱动侧 10 步 · xHC 侧两张调度表 · 设备按端点类型收发",
  keys: [
    { mark: "raised", label: "实线箭头＝命令/数据流；虚线＝设备侧事务与流控（p232–251）" },
    { mark: "edge", label: "设备泳道：调度全在主机侧——设备只见 USB 事务，NRDY 流控后等 ERDY（p243–245）" },
    { mark: "dim", label: "步进动画由下方机器卡接管（泳道卡保留总览形态）" },
  ],
  caption: "同一入场主线（翻译上下文→组 TD→写门铃→入表），差异在服务时机：Isoch 每 ESIT 一 TD、Interrupt 每 ESIT 一 SO、异步 round-robin。",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="§4.14 传输环管理三方泳道总览图，可放大平移。">${laneSvg()}<span role="status" aria-live="polite" data-status></span></div>` + zoomBarHtml("放大看框内文字 · 全屏后滚轮浏览"),
});

const machineCtlHtml = `<div class="fig-ctl" role="toolbar" aria-label="动画控制条">
  <button type="button" data-act="prev">◀ 上一帧</button>
  <button type="button" data-act="next">下一帧 ▶</button>
  <button type="button" data-act="tour" aria-pressed="false">自动巡游</button>
  <button type="button" data-act="reset">⟲ 复位</button>
  <span class="fig-ctl-hint">键盘：空格/点击步进 · ← → 换帧 · Home 回全景 · A 巡游</span>
</div>`;

const figCard = k.plateHtml({
  fig: "§4.14 动画",
  title: "调度轮转台：两张调度表的轮转全程",
  hint: "控制条步进/巡游 · 点击或空格步进 · ← → 换帧 · Home 回全景 · A 巡游",
  readout: "步 0/10 · µFrame — · 轮转 — · Active 0/4",
  keys: [
    { mark: "lit", label: "MFINDEX 窗+微帧标尺＝按 MIT=125µs 推进的帧微帧节拍；ESIT=2^Interval×125µs 全对齐 MIT 边界（p235·p237 Figure 4-21）" },
    { mark: "raised", label: "周期表卡架＝Isoch/Interrupt 端点卡每 ESIT 一个 SO（Isoch 恰一枚 TD p237 / Intr 一个 SO p243）；异步轮转盘指针＝round-robin 每过一遍表一个 SO（p245）" },
    { mark: "edge", label: "SO=搬包时间块 · 1–3 USB 事务/SO · SOPC 归零换下一端点（p233–234）；票据沿总线缆走＝USB 事务，事件卡沿回流管入事件匣（p232·p238）" },
    { mark: "dim", label: "IST=2 µF（p242 自举例）：挂 TRB 领先 xHC ≥IST · 读 MFINDEX 恒加 1 微帧 · 部分成形 Isoch TD=未定义行为" },
    { mark: "dim", label: "演示样例：SS 总线四端点——Isoch(Int 3·MSOPC 8)/Interrupt(Int 4·MSOPC 1)/Bulk(MaxBurst 7)/Control(MPS 512)" },
  ],
  caption: "环空的 Isoch 端点被摘出周期表（Ring Overrun/Underrun），再写一次门铃即放回（p238）——Active 与 Inactive 的进出都由门铃与环状态决定。",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="调度轮转台，十一帧：全景、翻译挂环、门铃入表、SO 与包计数、周期节拍、环空与再入表、IST 领先量、中断端点流控、异步轮转、连续流与打断、读数巡回。点击或空格步进。">${svg}<span role="status" aria-live="polite" data-status></span></div>` + machineCtlHtml + zoomBarHtml(),
});

const tableHtml = `
<section class="spec-block">
  <h2>三类端点调度对比（§4.14.1–4.14.4 · 按条文归纳，每行带页码）</h2>
  <table class="xsp-tb">
  <tr><th>端点类型</th><th>调度时机（服务节奏）</th><th>带宽来源</th><th>门铃语义</th><th>页</th></tr>
  <tr><td><b>Isoch（周期）</b></td><td>Active 时每 ESIT 恰处理一枚 Isoch TD；xHC 可在 ESIT 内任意时刻调度，但整个 TD 须有机会在 ESIT 内完成；每 SO 排包数=min(TDPC, MSOPC)；环空→摘出周期表</td><td>按 Max ESIT Payload 预留（Reserved Bandwidth 公式）；SS/FS ≤90% 帧、HS ≤80% 微帧</td><td>写门铃激活入表；Ring Overrun/Underrun 摘出后再写门铃放回周期表</td><td class="mono">p235–242</td></tr>
  <tr><td><b>Interrupt（周期）</b></td><td>每 ESIT 恰一个 SO；空闲端点被写门铃后首笔事务最迟 IST+ESIT 上总线；应 ≤1 TD/ESIT 且每 ESIT ≤1×Max ESIT Payload（TD 可跨多个 ESIT）；短包终止 IN TD、下一 TD 等下一 ESIT</td><td>同周期预留口径；重试可用满 MSOPC，超额不得影响其它端点已保证的带宽</td><td>写门铃激活入表（首笔事务时限 IST+ESIT）；SS 侧 NRDY 流控后等设备 ERDY</td><td class="mono">p243–245</td></tr>
  <tr><td><b>Bulk / Control（异步）</b></td><td>Best Effort、round-robin 轮转，每过一遍异步表一个 SO；多端点时每 SO 限 MSOPC 个包，仅剩一个端点可连续流；控制的每个 Stage 是独立 Async TD、可分属不同 SO</td><td>无预留——只用周期管道未占用的带宽（p234）</td><td>通用语义：Running 态端点写门铃激活/重新激活（p232）；SS 流控（Deferred）端点等 ERDY 回表（p251）</td><td class="mono">p245–251</td></tr>
  </table>
</section>
<section class="spec-block">
  <h2>调度关键量与公式（每行带页码；PDF 提取把上标扁平化，指数以 ^ 标注）</h2>
  <table class="xsp-tb">
  <tr><th>量 / 公式</th><th>语义</th><th>页</th></tr>
  <tr><td class="mono">MSOPC = (Max Burst Size +1) × (Mult + 1)</td><td>一个 SO 内 xHC 最多排的 DP 数（由端点上下文字段决定）</td><td class="mono">p233</td></tr>
  <tr><td class="mono">TDPC / TRPC</td><td>搬完一个 TD 所需包数（部分/零长包计 1）/ 环上全部 TD 的 TDPC 之和</td><td class="mono">p233</td></tr>
  <tr><td class="mono">SOPC</td><td>一个 SO 实际排的包数：SO 起点初始化、逐事务/重试递减，归零即转下一端点；可小于 MSOPC，表中仅一个端点时可超</td><td class="mono">p233–234</td></tr>
  <tr><td class="mono">ESIT = 2^Interval × 125 µs</td><td>端点服务间隔时间——全部对齐 MIT 边界（MFINDEX 按 MIT=125µs 推进）</td><td class="mono">p235</td></tr>
  <tr><td class="mono">Max ESIT Payload（USB2）= Max Packet Size × (Max Burst Size + 1)</td><td>每 ESIT 最大周期载荷（USB2 周期端点的软件算法）</td><td class="mono">p236</td></tr>
  <tr><td class="mono">Max ESIT Payload（SS · ISO Companion=0）= wBytesPerInterval</td><td>取自 SuperSpeed Endpoint Companion 描述符</td><td class="mono">p236</td></tr>
  <tr><td class="mono">Max ESIT Payload（SS · ISO Companion=1）= dwBytesPerInterval</td><td>取自 SuperSpeedPlus Isochronous Endpoint Companion 描述符</td><td class="mono">p236</td></tr>
  <tr><td class="mono">Reserved Bandwidth (MBytes/s) = Max ESIT Payload / (2^Interval × 0.000125)</td><td>周期端点的带宽预留计算——可以常年用不满</td><td class="mono">p236</td></tr>
  <tr><td class="mono">Max Allowed ESIT Payload 上限</td><td>FS Interrupt 64B · FS Isoch 1KB · HS Interrupt 3KB · HS Isoch 3KB · SS Interrupt 3KB · SS Isoch 48KB</td><td class="mono">p236</td></tr>
  <tr><td class="mono">IST 编码（HCSPARAMS2）</td><td>bit[3]=0 → 不晚于 IST[2:0] 微帧；bit[3]=1 → 不晚于 IST[2:0] 帧（值 2=提前 2 微帧；软件读 MFINDEX 后恒加 1 个微帧扣读延迟）</td><td class="mono">p242</td></tr>
  <tr><td class="mono">Max Service Transfer Size = Max Packet Size × (Max Burst Size + 1)</td><td>异步管道一个 SO 最多搬的数据量；不足一个 TD 时分多个 SO 搬</td><td class="mono">p245</td></tr>
  <tr><td class="mono">TD Residue = TD Transfer Size − Max Packet Size × ROUNDDOWN(TD Transfer Size / Max Packet Size)</td><td>TD 末包尺寸——xHC 拼接 TRB 缓冲，除末包外全按 Max Packet Size 搬</td><td class="mono">p251</td></tr>
  <tr><td class="mono">Average TRB Length</td><td>系统总线带宽指标=平均 TD Transfer Size ÷ 平均 TD 内 TRB 数（含 Link/No Op/Event Data）；初值参考 Control 8B / Interrupt 1KB / Bulk、Isoch 3KB</td><td class="mono">p234–235</td></tr>
  </table>
  <p>注：IST 约束（Isoch 挂 TRB 至少提前 IST）与 Interrupt 首笔事务的 IST+ESIT 上限同出 HCSPARAMS2 的 IST 字段（p242）；Table 4-8（USB2，p246–248）/ Table 4-9（USB3，p248–250）给出按端点响应的逐行 Pipe Action，本页不逐行转写。</p>
</section>`;

const linksHtml = `
<section class="spec-block">
  <h2>相关</h2>
  <ul class="links">
    <li><a href="../4.7-doorbells/index.html">§4.7 门铃</a>——端点门铃寄存器与 DB Target（机器的按铃=激活入表的唯一入口）</li>
    <li><a href="../4.8-endpoint/index.html">§4.8 端点</a>——Endpoint Context 的 Interval / Max Burst Size / Mult / CErr 字段</li>
    <li><a href="../4.9-trb-ring/index.html">§4.9 TRB 环</a>——传输环与 Cycle 翻转（TD 卡挂取的环基础）</li>
    <li><a href="../4.10-trb-handling/index.html">§4.10 TRB 处理</a>——Transfer Event 与短包/错误分支（回执去向）</li>
    <li><a href="../4.16-bandwidth-management/index.html">§4.16 带宽管理</a>——Configure Endpoint 预留与 Bandwidth Error（周期表 90%/80% 限位的命令侧）</li>
    <li><a href="../4.17-interrupters/index.html">§4.17 中断器</a>——事件回执到中断的通路</li>
    <li><a href="../../../xhc-machines/fig3-event-ring/index.html">四机课 Fig3 回执登记机</a>——事件环的生产与消费</li>
    <li><a href="../../index.html">§5.3.4 HCSPARAMS2（待建）</a>——IST 字段定义；<a href="../../index.html">§6.2.3.8 Max ESIT Payload（待建）</a>；<a href="../../index.html">§4.11.2.5 MFINDEX 用法（待建）</a></li>
  </ul>
</section>`;

const footerHtml = `<footer class="spec-foot">判据：xHCI 1.2b（625472 Rev 1.2b）§4.14 p232–251 · 引文逐字核对，证据见 <a href="EVIDENCE.md">EVIDENCE.md</a> · 生成于 2026-11-04</footer>`;

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
const latheScript = `const G = (() => {${latheSource}\nreturn { viewOf, scaleOf, frameAlong, frameOf, pointOf, disc, ringBand, sphereOf, prismOf, circleOf, arcOf, ribsOf, dot3, add3, sub3, mul3, unit3, cross3, len3, solidOf };})();\n`;
const live = readFileSync(join(HERE, "live.mjs"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const script = kitScript() + latheScript + geoScript + live
  + zoomFor(0, ["#lane-svg"], "__zfsLane")
  + zoomFor(1, ['[data-name="dial.disc"]', '[data-name="con.body"]'], "__zfs");

const page = k.pageHtml({ title: "§4.14 传输环管理（Managing Transfer Rings） · xHCI 规范对照学习", theme: THEME, body, script, width: 1500 });
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} items`, `scale ${KS.toFixed(3)}`);

A.auditOrExit(R, P, {});

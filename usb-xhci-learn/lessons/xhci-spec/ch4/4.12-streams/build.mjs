// §4.12 流（Streams）——anatomy 机器「流查表台」+ 整页
// 判据：xHCI 1.2b §4.12 p218–228；§4.12.1 xHCI Stream Protocol p219–223、
//   §4.12.2 Stream ID Management p223–225、§4.12.2.1 Stream Array Bounds Checking p225–227、
//   §4.12.3 Evaluate Next TRB (ENT) p227–228（页码现场核：§4.13 起于 p229）。
// 机器概念：一张带索引卡笼的查表台——驱动按流 ID 挂环按铃，xHC 的读卡滑车沿
//   主流卡笼走到 PSID 格位读流上下文卡（SCT=1 指传输环 / SCT=3 指辅流卡笼），
//   把搬数路由到对应流的环；设备只认共享 bulk 管道与包头 Stream ID，包边界切流；
//   存流状态前先查 ENT。三方：文书台（xHCI 驱动）/ 总控台（xHC）/ 试验盒（设备）。
// 演示样例（登记 EVIDENCE）：EP1 IN Bulk 端点，MaxPStreams=3（照 Figure 4-20 例）
//   → 主数组 16 格；流 1（PSID 1·SSID 0·SCT 1）与流 18（PSID 2·SSID 1 → 主格 2
//   SCT 3 → 辅数组 2 格 1·SCT 0）；越界演示 SID 0 / SID 17（P1·S1 命中 SCT 1 环格）。
import { execFileSync } from "node:child_process";
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
const WS = "/Users/jason/ZCodeProject/usb-xhci-study";
const THEME = process.argv.includes("--light") ? "light" : "dark";

// ---------- 代码走读卡（CODE-STEPPER 量产轮，2026-11-04；渲染单一事实源=scripts/stepper_builder.py，行号零誊抄） ----------
const stepperHtml = execFileSync("python3", [
  join(WS, "scripts/stepper_builder.py"), "render_block",
  join(WS, "lessons-data/stepper_412x.json"),
], { encoding: "utf8" });
const courseCss = readFileSync(join(WS, "assets/course.css"), "utf8");
const cssSeg = (a, b) => {
  const i = courseCss.indexOf(a);
  const j = courseCss.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error(`course.css 段标记缺失: ${a.slice(0, 30)}`);
  return courseCss.slice(i, j);
};
const stepperCss = cssSeg("/* ===== 代码步进放映机", "/* ===== 右缘批注")
  .replace(/\/\*[\s\S]*?\*\//g, "");  // 剥段内注释：资产注释不进交付件（载体三分），兼减字节
const stepperJs = readFileSync(join(WS, "assets/codestepper.js"), "utf8");

// ================= camera / world =================
const W = 920, H = 640, AZ = 33, EL = 33;

const PLATE = { x: -218, y: -118, w: 436, d: 224, r: 8 };
const PLATE_H = 12, FOOT_H = 5;

// 文书台（xHCI 驱动）：x -212..-136, y -92..-4
const DESK = { x: -212, y: -92, w: 76, d: 88, r: 3 };
// 门铃台立板（文书台上）
const BELL = { px: -178, py: -62, pw: 38, pd: 3, z0: 36, z1: 58 };
// 流环架（主机内存）：x -130..-36, y -98..-2
const RACK = { x: -130, y: -98, w: 94, d: 96, r: 2 };
const RINGS = {
  r1:  { x0: -128, x1: -98, y0: -92, y1: -14 },
  r18: { x0: -97, x1: -67, y0: -92, y1: -14 },
  rg:  { x0: -66, x1: -36, y0: -92, y1: -14 },
};
const RING_Z = 16; // 环床面（床身 z 16..18，TRB 卡 z 18..31）
// EP 上下文指针牌（环架后沿立板）
const EP = { x: -128, y: -97.5, w: 92, d: 3, r: 1, z0: RING_Z, z1: 52, wx0: -78, wx1: -46, wz0: 33, wz1: 47 };
// 主流卡笼（16 格 = 2^(MaxPStreams+1)，MaxPStreams=3；Figure 4-20 p224 例）
const CAGE = { x0: -25, cell: 8, frame: { x: -27, y: 40, w: 132, d: 28, r: 1 }, z0: 15.05, z1: 40.05 };
// 辅流卡笼 2（4 格 + 省略号——不断言容量：SCT 容量编码在 Table 6-13，§6.2.3 域）
const SEC = { x0: -88, cell: 12, frame: { x: -90, y: 40, w: 50, d: 28, r: 1 }, z0: 15.05, z1: 40.05 };
const CARD_Y0 = 44.4, CARD_D = 4.4; // 卡片立位（贴卡笼背墙前缘）
// 门架 + 读卡滑车（梁抬高到 z 96 避开总控台面仪表带；滑车吊在梁下）
const RAIL = { y: 73, z: 96 };
const TROLLEY_HOME = 106;
// 总控台（xHC）：x -34..118, y -104..36, z 12..96
const CON = { x: -34, y: -104, w: 152, d: 140, r: 3 };
const FACE_Y = 36.05;
// 设备试验盒
const BOX = { px: 126, py: -56, pw: 88, pd: 112, tx: 134, ty: -48, tw: 72, td: 96 };

// 流上下文卡（主卡笼四张 + 空卡；Figure 4-20 p224 例值）
const CTX_DEFS = [
  { idx: 0, sct: 3, to: "辅0" },
  { idx: 1, sct: 1, to: "环1" },
  { idx: 2, sct: 3, to: "辅2" },
  { idx: 15, sct: 1, to: "环15" },
];
const GHOST_IDX = 5; // TR Dequeue Ptr=0 空卡格（p226：SCT=Transfer Ring → 按空环拒 NoStream）

const cellCX = (i) => CAGE.x0 + CAGE.cell * i + CAGE.cell / 2;
const secCX = (i) => SEC.x0 + SEC.cell * i + SEC.cell / 2;

// ================= projection / helpers =================
const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
   [-218, -118, 55], [218, 106, 55],
   [-100, 78, 103], [116, 78, 103],
   [-30, -110, 110], [-196, -60, 46], [214, 58, 38], [-130, -98, 54]],
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
  P, KS, W, H, maxPs: 3, psidMask: 15,
  spsmNames: ["Disabled", "Idle", "Prime Pipe", "Start Stream", "Move Data"],
  faceY: FACE_Y, boxFaceY: BOX.ty + BOX.td + 0.05,
  drum: { x0: -26, x1: 14, z0: 78, z1: 94 },
  capwin: { x0: 20, x1: 44, z0: 78, z1: 94 },
  splitwin: { x0: 40, x1: 88, z0: 56, z1: 72 },
  cswin: { x0: 140, x1: 168, z0: 36, z1: 58 },
  swwin: { x0: 174, x1: 204, z0: 36, z1: 58 },
  bell: { dialX: -166, btnX: -149, faceY: BELL.py + BELL.pd + 0.05, dialZ0: 40, btnZ: 47 },
  cage: { x0: CAGE.x0, cell: CAGE.cell, z0: CAGE.z0, z1: CAGE.z1, y1: CARD_Y0 + CARD_D },
  sec: { x0: SEC.x0, cell: SEC.cell, z0: SEC.z0, z1: SEC.z1, y1: CARD_Y0 + CARD_D },
  ghostIdx: GHOST_IDX,
  ep: { faceY: EP.y + EP.d + 0.05, wx0: EP.wx0, wx1: EP.wx1, wz0: EP.wz0, wz1: EP.wz1 },
  rings: RINGS, ringZ: RING_Z,
  rail: { y: RAIL.y - 5, z: RAIL.z },
  trolleyHome: TROLLEY_HOME,
  flags: [{ x: -24, key: "ippv", t: "IPPV" }, { x: -6, key: "dbpv", t: "DBPV" }, { x: 12, key: "lfcv", t: "LFCV" }, { x: 30, key: "dsicv", t: "DSICV" }],
  cellCX1: cellCX(1), cellCX2: cellCX(2), secCX1: secCX(1),
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
  // 台前铭牌（板实体嵌入台身前缘 0.2、顶面与台面底相齐 + 文字入 labels 层）
  const mp = { x: -210, y: -4.2, w: 66, d: 1.6, r: 0.6 };
  put("desk.title", [mp.x + mp.w / 2, -2.8, 21],
    S(k.slabOf(mp, 12, 18, P, 2, 0.3), { tone: "hi", crease: "none" }),
    [record(A.slab(mp, 12, 18, { name: "desk.title" }, 2))], { bias: 0.1 });
  labelText(vtext(mp.x + 4, mp.y + mp.d + 0.05, 25.1, "xHCI 驱动", 9, "drv")
    + vtext(mp.x + 4, mp.y + mp.d + 0.05, 17.4, "规范称 system software", 6, "mid"));
}
// TD 卡堆（铭随文字入 labels 层）
for (let i = 0; i < 3; i++) {
  slab("tdstack", { x: -206, y: -88 + i * 0.3, w: 22, d: 20, r: 0.8 }, 33 + i * 0.5, 1.4, { tone: i === 2 ? "hi" : "lo", crease: "none" }, { steps: 2 });
}
labelText(topText([-195, -65.4], 33.02, "TD 卡堆", 5.4, "mid"));
// 事件匣
slab("tray.event", { x: -208, y: -62, w: 26, d: 22, r: 1.4 }, 33, 3.6, { tone: "hi" }, { steps: 3, bevel: 0.4 });
slab("tray.event.lip", { x: -182, y: -63, w: 1.6, d: 24, r: 0.6 }, 33, 5.2, { tone: "mid" });
labelText(topText([-195, -36.4], 33.02, "事件匣", 5.4, "mid"));
// 门铃台（台座 + 立板 + 计数轮窗 + 门铃钮）
{
  slab("bell.base", { x: BELL.px, y: BELL.py - 2, w: BELL.pw, d: BELL.pd + 6, r: 1.2 }, 33, 3, { tone: "lo" }, { steps: 2 });
  slab("bell.panel", { x: BELL.px, y: BELL.py, w: BELL.pw, d: BELL.pd, r: 1 }, BELL.z0, BELL.z1 - BELL.z0, { tone: "mid" },
    { steps: 2, extra: screwDots({ x: BELL.px + 2, y: BELL.py + 0.4, w: BELL.pw - 4, d: BELL.pd - 0.8 }, 3, BELL.z1) });
  labelText(
    vtext(BELL.px + 3.5, DATA.bell.faceY, BELL.z1 - 4.1, "门铃 · DB Stream ID", 5.8, "hi")
    + vtext(DATA.bell.dialX, DATA.bell.faceY, BELL.z0 + 1.4, "计数轮", 3.8, "lo", "middle")
    + vtext(DATA.bell.btnX, DATA.bell.faceY, BELL.z0 + 1.4, "按铃", 3.8, "lo", "middle")
    + `<g data-part="belldial">${geo.dialSvg(0)}</g>`);
  put("bell.btn", [DATA.bell.btnX, BELL.py + 2, DATA.bell.btnZ],
    `<g data-part="bellbtn">${geo.bellBtnSvg(0)}</g>`,
    [record(A.ring(G.frameOf([DATA.bell.btnX, DATA.bell.faceY + 0.05, DATA.bell.btnZ], [0, 1, 0], [1, 0, 0], [0, 0, 1]), 0, 0.85, 2.2, 4.2, { name: "bell.btn", owner: "bell.panel" }))], { bias: 0.3 });
}

// ================= 流环架（主机内存：各流的传输环） =================
slab("rack.plat", RACK, PLATE_H, 4, { tone: "lo" }, { steps: 3, bevel: 0.4 });
for (const [key, rb] of Object.entries(RINGS)) {
  const bed = { x: rb.x0, y: rb.y0 + 2, w: rb.x1 - rb.x0, d: rb.y1 - rb.y0 - 4, r: 1.6 };
  const ghost = key === "rg";
  // TRB 槽位刻线（三条闭合槽框，卡未挂时可见；幽灵床槽线并入床本体省一项）
  let slots = "";
  for (let s = 0; s < 3; s++) {
    const sx = rb.x0 + 2 + s * 9;
    slots += Ln(path3([[sx + 0.4, rb.y1 - 9.4, RING_Z + 2.05], [sx + 7.4, rb.y1 - 9.4, RING_Z + 2.05], [sx + 7.4, rb.y1 - 4.4, RING_Z + 2.05], [sx + 0.4, rb.y1 - 4.4, RING_Z + 2.05]], true), { tone: ghost ? "faint" : "lo" });
  }
  if (ghost) {
    slab(`ring.${key}`, bed, RING_Z, 2, { tone: "lo", crease: "none" },
      { steps: 2, extra: Ln(k.planOutline(k.insetPlan(bed, 1.6), RING_Z + 2, P, 3), { tone: "faint", dashed: true }) + slots });
  } else {
    slab(`ring.${key}`, bed, RING_Z, 2, { tone: "mid" },
      { steps: 2, extra: Ln(k.planOutline(k.insetPlan(bed, 1.6), RING_Z + 2, P, 3), { tone: "faint" }) });
    put(`ring.${key}.slots`, [(rb.x0 + rb.x1) / 2, rb.y1 - 7, RING_Z + 2],
      slots, [record(A.box([rb.x0, rb.y1 - 10, RING_Z + 2], [rb.x1, rb.y1 - 4, RING_Z + 2.2], { name: `ring.${key}.slots`, owner: `ring.${key}` }))], { bias: 0.1 });
  }
}
// 环名铭（平台前条）+ 就绪灯（平台前条、避开 TRB 槽位带；座+罩照 4.2 端口灯形制）
labelText(
  topText([-113, -6.5], PLATE_H + 4.02, "流 1 环", 5.4, "mid")
  + topText([-82, -6.5], PLATE_H + 4.02, "流 18 环", 5.4, "mid")
  + topText([-51, -6.5], PLATE_H + 4.02, "…", 5.4, "lo"));
{
  const lamp = (name, x, lampKey) => {
    cyl(`${name}.seat`, x, -11.5, 2.4, PLATE_H + 4, 1.4, { tone: "lo" }, { steps: 16 });
    const lf = G.frameOf([x, -11.5, PLATE_H + 5.4], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    put(`${name}.dome`, [x, -11.5, PLATE_H + 7],
      `<g class="lamp" data-lamp="${lampKey}">` + S(G.solidOf([[0, 0.2], [1, 2.2, 1], [2.2, 2.6, 1], [3, 2, 1], [3.4, 0.3]], lf, P, { steps: 20 }), { tone: "hi" }) + `</g>`,
      [record(A.solid(lf, [[0, 0.2], [1, 2.2, 1], [2.2, 2.6, 1], [3, 2, 1], [3.4, 0.3]], { name: `${name}.dome`, owner: `${name}.seat` }))], { bias: 0.3 });
  };
  lamp("ringlamp.r1", -104, "r1");
  lamp("ringlamp.r18", -73, "r18");
}
// EP 上下文指针牌（环架后沿立板；指针窗入 labels 层）
{
  slab("ep.panel", EP, EP.z0, EP.z1 - EP.z0, { tone: "mid" }, { steps: 2 });
  labelText(
    vtext(EP.x + 3, DATA.ep.faceY, EP.z1 - 3.9, "EP1 IN 端点上下文", 5.6, "hi")
    + vtext((EP.wx0 + EP.wx1) / 2, DATA.ep.faceY, EP.wz1 + 2.4, "TR Dequeue 指针", 4.4, "mid", "middle")
    + `<g data-part="epwin">${geo.epPtrSvg(0)}</g>`);
}

// ================= 主流卡笼 + 辅流卡笼 =================
function cageOf(name, CG) {
  const F = CG.frame;
  slab(`${name}.floor`, F, PLATE_H, 3, { tone: "lo" }, { steps: 3 });
  slab(`${name}.back`, { x: F.x, y: F.y, w: F.w, d: 3.4, r: 0.8 }, PLATE_H + 3, 31, { tone: "mid" }, { steps: 2 });
  box(`${name}.wallW`, [F.x, F.y + 3.4, PLATE_H + 3], [F.x + 2.6, F.y + F.d, PLATE_H + 34], { tone: "mid" }, { r: 0.8 });
  box(`${name}.wallE`, [F.x + F.w - 2.6, F.y + 3.4, PLATE_H + 3], [F.x + F.w, F.y + F.d, PLATE_H + 34], { tone: "mid" }, { r: 0.8 });
  slab(`${name}.lip`, { x: F.x + 2.6, y: F.y + F.d - 3, w: F.w - 5.2, d: 3, r: 0.8 }, PLATE_H + 3, 6, { tone: "mid" }, { steps: 2 });
  // 背墙格位刻线 + 格号（空格可见；卡在位处被卡遮住属正常层次）
  let grid = "", nums = "";
  for (let i = 0; i < CG.n; i++) {
    const x0 = CG.x0 + CG.cell * i;
    grid += Ln(path3([[x0 + 0.6, F.y + 3.45, PLATE_H + 4], [x0 + CG.cell - 0.6, F.y + 3.45, PLATE_H + 4], [x0 + CG.cell - 0.6, F.y + 3.45, PLATE_H + 32], [x0 + 0.6, F.y + 3.45, PLATE_H + 32]], true), { tone: "faint" });
    nums += vtext(x0 + CG.cell / 2, F.y + 3.5, PLATE_H + 33.4, String(i), 3.8, "lo", "middle");
  }
  labelText(grid + nums);
}
cageOf("cage", CAGE);
cageOf("sec", SEC);
// 卡笼标题刻在各自前唇面（y=68.05）
labelText(
  vtext(CAGE.x0 + 1.5, 68.05, 16.2, "主流数组 · 16 格 = 2^(MaxPStreams+1)", 4.6, "hi")
  + vtext(CAGE.x0 + 84, 68.05, 16.2, "MaxPStreams=3", 4.2, "lo")
  + vtext(SEC.x0 + 1.5, 68.05, 16.2, "辅流数组 2（SCT=3）", 4.6, "hi")
  + vtext(SEC.x0 + 38, 68.05, 16.2, "…", 4.6, "lo"));
// 格 2 → 辅流卡笼 2 的查表通道（板顶刻槽线；live 点亮；两端落在两笼底板前立面 y=68）
{
  const ch = path3([[cellCX(2), 67.9, PLATE_H + 0.05], [cellCX(2), 73.5, PLATE_H + 0.05], [secCX(1), 73.5, PLATE_H + 0.05], [secCX(1), 67.9, PLATE_H + 0.05]], false);
  put("secpath", [cellCX(2), 71, PLATE_H],
    Ln(ch, { tone: "lo", className: "secpath" }),
    [record(A.box([secCX(1) - 1, 68, PLATE_H], [cellCX(2) + 1, 74, PLATE_H + 0.2], { name: "secpath", ground: true }))], { bias: 0.05 });
}
// 流上下文卡（四张 + 空卡；卡足立在笼底板上；display/hot 类由 live 控制；初始 F0 隐藏）
// 2026-11-05 遮挡修复轮：卡体入 item 深度序不变；刻字拆入 labels 尾层
// （后画的 gantry.beam / cage.wallE / cage.lip / sec.lip bbox 盖字的探针 FAIL 全消）。
for (const def of CTX_DEFS) {
  const plan = { x: CAGE.x0 + def.idx * CAGE.cell + 1.4, y: CARD_Y0, w: CAGE.cell - 2.8, d: CARD_D, r: 0.5 };
  put(`ctx.${def.idx}`, [cellCX(def.idx), CARD_Y0 + CARD_D / 2, (CAGE.z0 + CAGE.z1) / 2],
    `<g data-cell="${def.idx}" style="display:none">` + geo.ctxCardBodySvg(def.idx, def.sct, def.to) + `</g>`,
    [record(A.slab(plan, CAGE.z0, CAGE.z1 - CAGE.z0, { name: `ctx.${def.idx}`, owner: "cage.floor" }, 2))], { bias: 0.2 });
  labelText(`<g data-celltext="${def.idx}" style="display:none">` + geo.ctxCardTextSvg(def.idx, def.sct, def.to) + `</g>`);
}
{
  const plan = { x: CAGE.x0 + GHOST_IDX * CAGE.cell + 1.4, y: CARD_Y0, w: CAGE.cell - 2.8, d: CARD_D, r: 0.5 };
  put(`ctx.ghost`, [cellCX(GHOST_IDX), CARD_Y0 + CARD_D / 2, (CAGE.z0 + CAGE.z1) / 2],
    `<g data-cell="${GHOST_IDX}" style="display:none">` + geo.ghostCardBodySvg() + `</g>`,
    [record(A.slab(plan, CAGE.z0, CAGE.z1 - CAGE.z0, { name: "ctx.ghost", owner: "cage.floor" }, 2))], { bias: 0.2 });
  labelText(`<g data-celltext="${GHOST_IDX}" style="display:none">` + geo.ghostCardTextSvg() + `</g>`);
}
// 辅流卡（格 1：SCT=0 → 环 18）
{
  const plan = { x: SEC.x0 + 1 * SEC.cell + 1.6, y: CARD_Y0, w: SEC.cell - 3, d: CARD_D, r: 0.5 };
  put(`secctx.1`, [secCX(1), CARD_Y0 + CARD_D / 2, (SEC.z0 + SEC.z1) / 2],
    `<g data-sec="1" style="display:none">` + geo.secCardBodySvg(1, "环18") + `</g>`,
    [record(A.slab(plan, SEC.z0, SEC.z1 - SEC.z0, { name: "secctx.1", owner: "sec.floor" }, 2))], { bias: 0.2 });
  labelText(`<g data-sectext="1" style="display:none">` + geo.secCardTextSvg(1, "环18") + `</g>`);
}
// TRB 卡（两环各三张：流 1 = N / N+ENT / ED；流 18 = N+ENT / ED / 空；live 控制）
{
  const mk = (ring, slot, kind) => {
    const rb = RINGS[ring];
    const plan = { x: rb.x0 + 2 + slot * 9, y: rb.y1 - 9, w: 7.8, d: 4.2, r: 0.5 };
    put(`trb.${ring}.${slot}`, [rb.x0 + 2 + slot * 9 + 3.9, rb.y1 - 7, RING_Z + 8],
      `<g data-trb="${ring}-${slot}" style="display:none">${geo.trbBodySvg(ring, slot, kind, 1)}</g>`,
      [record(A.slab(plan, RING_Z + 2.05, 13, { name: `trb.${ring}.${slot}`, owner: `ring.${ring}` }, 2))], { bias: 0.2 });
    labelText(`<g data-trbtext="${ring}-${slot}" style="display:none">${geo.trbTextSvg(ring, slot, kind, 1)}</g>`);
  };
  mk("r1", 0, "N"); mk("r1", 1, "E"); mk("r1", 2, "D");
  mk("r18", 0, "E"); mk("r18", 1, "D");
}

// ================= 门架 + 读卡滑车 =================
{
  for (const [px, nm] of [[-96, 0], [114, 1]]) {
    cyl(`gantry.foot${nm}`, px, RAIL.y, 5, PLATE_H, 3, { tone: "lo" }, { steps: 22 });
    cyl(`gantry.post${nm}`, px, RAIL.y, 2.4, PLATE_H + 3, RAIL.z - PLATE_H - 3, { tone: "mid", crease: "none" },
      { steps: 18, extra: Ln([40, 60, 80].map((z) => k.sideArc(px, RAIL.y, 2.4, z, P, 12)).join(""), { tone: "faint" }) });
  }
  slab("gantry.beam", { x: -100, y: RAIL.y - 5, w: 216, d: 10, r: 2 }, RAIL.z, 6, { tone: "mid" }, { steps: 4, bevel: 0.4 });
  slab("gantry.stop", { x: 116, y: RAIL.y - 5, w: 4, d: 10, r: 0.8 }, RAIL.z - 2, 10, { tone: "lo" }, { steps: 2 });
  put("trolley", [TROLLEY_HOME, RAIL.y, RAIL.z - 4], `<g data-part="trolley">${geo.trolleySvg(TROLLEY_HOME, 0)}</g>`,
    [record(A.slab({ x: TROLLEY_HOME - 6, y: RAIL.y - 10, w: 12, d: 10, r: 1.4 }, RAIL.z - 9, 9, { name: "trolley" }, 3)),
     record(A.cylinder(TROLLEY_HOME, RAIL.y - 8.2, 0.9, RAIL.z - 16.5, 7.5, { name: "trolley.probe", owner: "trolley" }, 12))], { bias: 1 });
  labelText(topText([-96, RAIL.y + 9], PLATE_H + 0.02, "读卡滑车", 5.4, "lo"));
}

// ================= 总控台（xHC 控制器） =================
{
  slab("con.body", CON, PLATE_H, 84, { tone: "mid" }, { steps: 4, bevel: 0.8, inner: Ln(k.sideSeam(CON, 60, P, 4), { tone: "faint" }) });
  slab("con.lid", { x: CON.x - 3, y: CON.y - 3, w: CON.w + 6, d: CON.d + 6, r: 2 }, 96, 3, { tone: "mid" },
    { steps: 4, bevel: 0.5, extra: screwDots({ x: CON.x - 1, y: CON.y - 1, w: CON.w + 2, d: CON.d + 2 }, 8, 99) });
  // 台顶铭牌（顶面 topMatrix，避竖直面斜切）
  labelText(
    topText([-28, 26], 99.02, "xHC 控制器", 9, "hc")
    + topText([-28, 16], 99.02, "流数组 · 查表路由", 6, "mid", "start"));
  // xSPSM 转筒窗 + 捕获窗 + 拆位窗（live 重建窗内内容；窗组随文字入 labels 层）
  labelText(
    `<g data-part="spsm">${geo.drumSvg(0)}</g>`
    + vtext(DATA.drum.x0 + 0.5, FACE_Y, DATA.drum.z1 + 1.9, "xSPSM 状态（Figure 4-19）", 4.2, "lo")
    + `<g data-part="capwin">${geo.capWinSvg(null)}</g>`
    + vtext(DATA.capwin.x0 - 1.5, FACE_Y, DATA.capwin.z1 + 1.9, "捕获 DB Stream ID（可选）", 4.2, "lo")
    + `<g data-part="splitwin">${geo.splitWinSvg(null)}</g>`);
  // 旗标灯排（四只去抖动旗灯 + 端点灯；座盘+罩照 4.2 erlamp 形制）
  const faceLamp = (name, x, z, lampKey, labelText_) => {
    const seatF = G.frameOf([x, FACE_Y + 0.05, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    put(`${name}.seat`, [x, FACE_Y + 1.2, z],
      S(G.disc(0, 2.2, 2.8, seatF, P, { steps: 20, bevel: 0.2 }), { tone: "lo" })
      + Ln(G.circleOf(seatF, 2.2, 2.8, P, 20), { tone: "lo" }),
      [record(A.disc(seatF, 0, 2.2, 2.8, { name: `${name}.seat`, owner: "con.body" }))], { bias: 0.3 });
    const lf = G.frameOf([x, FACE_Y + 2.4, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    put(`${name}.dome`, [x, FACE_Y + 3.6, z + 0.4],
      `<g class="lamp" data-lamp="${lampKey}">` + S(G.solidOf([[0, 0.2], [1, 2, 1], [2.2, 2.6, 1], [3, 2, 1], [3.4, 0.3]], lf, P, { steps: 20 }), { tone: "hi" }) + `</g>`,
      [record(A.solid(lf, [[0, 0.2], [1, 2, 1], [2.2, 2.6, 1], [3, 2, 1], [3.4, 0.3]], { name: `${name}.dome`, owner: `${name}.seat` }))], { bias: 0.4 });
    labelText(vtext(x, FACE_Y, labelText_[1], labelText_[0], 4, "lo", "middle"));
  };
  for (const f of DATA.flags) faceLamp(`flag.${f.key}`, f.x, 64.6, f.key, [f.t, 57.4]);
  faceLamp("epstate", 102, 64.6, "epstate", ["端点 Running", 57.4]);
  faceLamp("ent", 88, 50.5, "ent", ["ENT 检查", 45.4]);
  // HID 闸刀（端点上下文 HID 位：=1 禁主机主导 Idle→Move Data；底座凸出台面）
  {
    const hx = -22, cxx = -14, by = FACE_Y + 0.0;
    slab("hid.base", { x: -28, y: CON.y + CON.d, w: 34, d: 2.6, r: 0.8 }, 44, 8, { tone: "lo" }, { steps: 2 });
    const hF = G.frameOf([hx, by + 2.65, 50.5], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    put("hid.hinge", [hx, by + 3.4, 50.5], S(G.disc(0, 3.2, 1.5, hF, P, { steps: 14, bevel: 0.2 }), { tone: "mid" }),
      [record(A.disc(hF, 0, 3.2, 1.5, { name: "hid.hinge", owner: "hid.base" }))], { bias: 0.2 });
    const cF = G.frameOf([cxx, by + 2.65, 50.5], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    put("hid.contact", [cxx, by + 3.4, 50.5], S(G.disc(0, 2.2, 1.3, cF, P, { steps: 14, bevel: 0.2 }), { tone: "hi" }),
      [record(A.disc(cF, 0, 2.2, 1.3, { name: "hid.contact", owner: "hid.base" }))], { bias: 0.2 });
    put("hid.arm", [hx + 6, by + 4, 51.5], `<g data-part="hidarm">${geo.swArmSvg(hx, 0, by + 3.15, 50.6)}</g>`,
      [record(A.prism(G.frameAlong([hx + 1.2, by + 3.2, 50.7], [Math.cos(0.59), 0, Math.sin(0.59)]), [[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]], 0, 8.6, { name: "hid.arm", owner: "hid.hinge" }))], { bias: 0.4 });
    labelText(vtext(-27, FACE_Y, 43.2, "HID 闸（=1 禁主机主导）", 4.2, "lo"));
  }
  // （ENT 灯已并入 faceLamp 排；此处仅剩越界检查注记牌）
  // 收铃口（左面端子）
  {
    const bf = G.frameOf([-34, 14, 50], [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
    put("con.bellin", [-35.6, 14, 50], S(G.disc(0, 3, 2, bf, P, { steps: 18, bevel: 0.3 }), { tone: "mid" })
      + Ln(G.circleOf(bf, 3, 2, P, 18), { tone: "lo" }),
      [record(A.disc(bf, 0, 3, 2, { name: "con.bellin" }))], { bias: 0.2 });
    labelText(topText([-30, 24], 99.02, "收铃口", 4.6, "lo"));
  }
  // 事件出口（台顶后段短管）
  cyl("con.evstub", 30, -96, 1.8, 99, 5, { tone: "lo" }, { steps: 18 });
  labelText(topText([30, -90], 99.02, "事件出口", 4.6, "lo"));
  // 线缆出口（右面端子凸台：外端面 x=121）
  {
    const bf = G.frameOf([118, -16, 26], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    put("con.busport", [119.5, -16, 26], S(G.disc(0, 3, 2, bf, P, { steps: 18, bevel: 0.3 }), { tone: "mid" })
      + Ln(G.circleOf(bf, 3, 2, P, 18), { tone: "faint" }),
      [record(A.disc(bf, 0, 3, 2, { name: "con.busport", owner: "con.body" }))], { bias: 0.2 });
  }
  // 越界检查注记牌（F9 显现；立牌在总控台面与卡笼背墙之间的窄带）
  put("con.errnote", [80, 37.5, PLATE_H + 11],
    `<g data-note="err" style="display:none">` + S(k.slabOf({ x: 46, y: 36.6, w: 66, d: 1.6, r: 1 }, PLATE_H, 22, P, 2), { tone: "lo", crease: "none" })
    + vtext(48, 38.25, PLATE_H + 18.6, "SID 0 / SID 17 → Invalid Stream ID Error", 4.2, "hi")
    + vtext(48, 38.25, PLATE_H + 13.0, "SCT 不符 → Invalid Stream Type Error · 停端点", 4.2, "mid")
    + vtext(48, 38.25, PLATE_H + 7.4, "Set TR DP 越界 → 完成码 TRB Error（p226）", 4.2, "mid") + `</g>`,
    [record(A.slab({ x: 46, y: 36.6, w: 66, d: 1.6, r: 1 }, PLATE_H, 22, { name: "con.errnote", owner: "stand.plate" }, 2))], { bias: 0.2 });
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
    topText([152, 8], PLATE_H + 56.02, "USB 设备 · 选流方", 7.5, "dev")
    + topText([152, -2], PLATE_H + 56.02, "CStream 由设备定 · 包边界可切流", 4.6, "mid"));
  // CStream 窗 + 切流窗（live 重建；窗组随文字入 labels 层）
  labelText(
    `<g data-part="cstream">${geo.cstreamSvg(null)}</g>`
    + `<g data-part="devswitch">${geo.switchSvg(null)}</g>`
    + vtext(140, DATA.boxFaceY, 62.4, "NRDY(Stream n)=流控票据 · 出口在总线缆", 4.2, "lo"));
  // 教学锚长铭牌（基座前立牌，嵌入基座前缘 0.2；文字入 labels 层防塔顶盖字）
  {
    const np = { x: 128, y: 55.8, w: 88, d: 3, r: 1 };
    put("box.nameplate", [np.x + np.w / 2, np.y + np.d / 2, 14],
      S(k.slabOf(np, PLATE_H, 24, P, 2), { tone: "lo", crease: "none" })
      + Ln(path3([[np.x + 2, np.y + np.d + 0.05, PLATE_H + 2], [np.x + np.w - 2, np.y + np.d + 0.05, PLATE_H + 2]], false), { tone: "faint", free: true })
      + Dots([[np.x + 2.6, np.y + np.d + 0.2, PLATE_H + 21.4], [np.x + np.w - 2.6, np.y + np.d + 0.2, PLATE_H + 21.4]].map((p) => at(p)), { size: 0.45 }),
      [record(A.slab(np, PLATE_H, 24, { name: "box.nameplate" }, 2))], { bias: 0.15 });
    labelText(
      vtext(np.x + 4, np.y + np.d + 0.05, PLATE_H + 17.6, "全部流共享一条 bulk 管道", 6.2, "dev")
      + vtext(np.x + 4, np.y + np.d + 0.05, PLATE_H + 10.4, "设备只见包头 Stream ID——", 4.8, "mid")
      + vtext(np.x + 4, np.y + np.d + 0.05, PLATE_H + 5.2, "环与流数组在主机内存", 4.8, "mid"));
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
// 端点落位（audit 判据）：总线缆两端 exactly 在端口凸台外端面（rim 环 r2 落在凸台端面圆上过
// terminals）；门铃拉线两端不检 terminals（ends=false），只求 clearance ≥0.28——起点贴面板顶、
// 终点轴向对准收铃口凸台外端面留 0.4；事件管两端垂直进/出（rim 平面贴挂载面）。
const WIRE_BELL = [[-159, -60.5, 58.9], [-152, -50, 61.5], [-120, -38, 63], [-80, -18, 63], [-48, 4, 58], [-44, 14, 50.6], [-37.4, 14, 50]];
const CABLE_BUS = [[121, -16, 26], [124, -16, 26], [126, -27, 27.5], [129, -25, 29], [128, -16, 30], [131, -16, 30]];
const TUBE_EV = [[30, -96, 104], [30, -96, 107], [22, -105, 109], [-30, -110, 109], [-110, -110, 105], [-168, -102, 90], [-186, -78, 66], [-192, -56, 48], [-196, -49, 46], [-196, -49, 36.7]];
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
  { // 总线缆（总控台 ↔ 设备：bulk 管道；rim=端环即接头）
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

// ================= settle + assemble =================
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const itemG = (it) => `<g class="it" data-name="${it.name}"${it.attrs ?? ""}>${it.svg}</g>`;
const seq = R.items.map(itemG);
// 组序（2026-11-05 遮挡修复轮）：items（settle 判深画家序，滑车/线缆互遮既证配对不动）
// → 票据/事件卡体 → 票据/事件刻字（两遍渲染消同层票互盖）→ labels（含卡笼/TRB 刻字，
// 置于 actors 之后——门铃票据飞越总控台立面曾盖转筒窗文字）。labels 内只有线与文字
// （无填充 path），后置不构成任何遮挡者。
seq.push(`<g data-part="actors-tokens"></g><g data-part="actors-events"></g><g data-part="actor-texts"></g>`);
seq.push(`<g class="fb-labels">${labels.join("")}</g>`);
const svg = k.figureSvg({
  width: W, height: H,
  label: "流查表台：左侧文书台是 xHCI 驱动（规范称 system software）——把 TD 卡挂上各条流的传输环、拨 DB Stream ID 计数轮按门铃；中间总控台是 xHC——读卡滑车沿主流卡笼按 PSID 格位读流上下文卡（SCT=1 指传输环、SCT=3 转辅流卡笼），xSPSM 状态转筒与四只去抖动旗灯管门铃节奏，存流状态前先查 ENT；右侧试验盒是设备——只见共享 bulk 管道与包头 Stream ID，CStream 由它定、包边界可切流。",
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
.fb-stage .lamp[data-lamp="epstate"].halt path { fill: ${ERR}; }
.fb-stage .lamp[data-lamp="epstate"].halt { filter: drop-shadow(0 0 6px ${ERR}); }
.fb-stage .secpath { stroke: var(--anatomy-lo); transition: stroke 300ms; }
.fb-stage .secpath.lit { stroke: ${HC}; filter: drop-shadow(0 0 4px ${HC}); }
.sctx.hot .iso-solid > path { stroke: ${HC}; }
.stoken .iso-face-text[data-tone="tk"] { fill: ${HC}; }
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
    { t: "1 · 开流：Configure Endpoint（MaxPStreams>0）", p: "p219–220", hc: "EP 上下文指针 → 主流数组 · xSPSM → Disabled" },
    { t: "2 · 给流 1 / 流 18 的环挂 TD", t2: "末位 Event Data TRB 的前一传输 TRB 置 ENT", p: "p218–219", hc: "（环在主机内存，xHC 只读）" },
    { t: "3 · 写端点门铃 · DB Stream ID=1", p: "p220 · p223", hc: "捕获 DB Stream ID（可选 DSICV）" },
    { t: "4 · 查表路由：PSID 索引主流数组", t2: "格 1 SCT=1 → 环 1；格 2 SCT=3 → 辅数组 2 格 1（SSID 索引）", p: "p222 · p224", hc: "读流上下文卡：TR Dequeue 指针 → 那条流的环" },
    { t: "5 · xSPSM 去抖动（Idle 门铃算法）", t2: "IPPV 限每 Idle 一次 Prime Pipe · DBPV 补记 · LFCV 流控按住 · HID=0 才主机起 Move Data", p: "p220–221", hc: "命中 → Move Data；否则 Prime Pipe" },
    { t: "6 · Prime Pipe：通报设备", p: "p220", hc: "宿主缓冲已更新/新增 → 设备转 Idle" },
    { t: "7 · 数据沿共享 bulk 管道搬动", p: "p218–219", hc: "当前流 CStream 的环在搬数" },
    { t: "8 · 设备包边界切流 1 → 18", t2: "NRDY(Stream 1) 流控 → LFCV=1", p: "p219 · p221", hc: "包头 SID 18 拆 PSID 2·SSID 1 → 辅数组 2 → 环 18" },
    { t: "9 · 存流状态：先查 ENT", t2: "ENT=1 → 先执行 Event Data TRB 再存；存 TR Dequeue 指针·DCS（SEC=1 加存 Stopped EDTLA）", p: "p218 · p227–228", hc: "流 1 退出 Move Data 即存态（p218）" },
    { t: "10 · 回执与撤流", t2: "Transfer Event 写事件环；Stop Endpoint（§3.3.8）/ Set TR Dequeue Pointer（§4.6.10）", p: "p218–219 · p223", hc: "越界流 ID → Invalid Stream ID / Type Error · 停端点（p225–227）" },
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
  g += lane(dev, "设备（选流方）", "c-dev");
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
    g += `<text x="${hBoxX + 16}" y="${y === hy ? hy + 36 : hy + 36}" class="box-t">${s.hc}</text>`;
    g += `<line x1="${dBoxX + dBoxW + 2}" y1="${y + stepH / 2}" x2="${hBoxX - 2}" y2="${hy + stepH / 2}" class="arr" marker-end="url(#arrh)"/>`;
  });
  // 设备泳道注记框 + 两条箭头（选流/切流 → xHC；NRDY 流控）
  const dBox = { x: 60, y: dev.y + 50, w: 640, h: 104 };
  g += `<rect x="${dBox.x}" y="${dBox.y}" width="${dBox.w}" height="${dBox.h}" rx="10" class="box c-dev"/>`;
  g += `<text x="${dBox.x + 22}" y="${dBox.y + 40}" class="box-t">设备定 CStream——按包头 Stream ID 选流，包边界可切流（p218–219）</text>`;
  g += `<text x="${dBox.x + 22}" y="${dBox.y + 70}" class="box-s">全部流共享一条 bulk 管道：当前流停转（Stall）全体流一起停；设备只见包头 Stream ID，环与流数组在主机内存</text>`;
  g += `<line x1="${dBox.x + 200}" y1="${dBox.y - 2}" x2="${hBoxX + 160}" y2="${hY(7) + stepH + 2}" class="arr dash" marker-end="url(#arrh)"/>`;
  g += `<line x1="${dBox.x + 430}" y1="${dBox.y - 2}" x2="${hBoxX + 330}" y2="${hY(8) + stepH + 2}" class="arr dash" marker-end="url(#arrh)"/>`;
  g += `<text x="${dBox.x + dBox.w + 20}" y="${dBox.y + 46}" class="box-s">NRDY(Stream n)=流控（p221）</text>`;
  return `<svg id="lane-svg" viewBox="0 0 ${LW} ${LH}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="§4.12 流协议三方泳道总览：驱动侧十步，xHC 侧查表与去抖动，设备泳道选流与切流">
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
  <span class="nav-title">§4.12 流（Streams）</span>
  <span class="nav-sib">
    <a href="../4.11-trbs/index.html" title="§4.11 TRB（传输请求块）">上一节 §4.11</a>
    <a href="../4.13-device-notifications/index.html" title="§4.13 设备通知">下一节 §4.13</a>
  </span>
</nav>
<p class="spec-ref">xHCI 1.2b §4.12 Streams · p218–228 · §4.12.1 xHCI Stream Protocol · §4.12.2 Stream ID Management · §4.12.3 Evaluate Next TRB (ENT)（页码已机核，见 EVIDENCE.md）</p>`;

const proseHtml = `
<section class="spec-block">
  <h2>规范要义</h2>
  <p>流（Streams）给 SS Bulk 端点扩容传输环：标准端点只配一条 Transfer Ring，开了流的端点最多可挂 <b>65533 条</b>（Stream ID 0、FFFEh=Prime、FFFFh=No Stream 保留——p218 脚注 39）。开流后端点上下文的 TR Dequeue Pointer 改指<b>流上下文数组</b>（Stream Context Array），流 ID（Stream ID）索引进数组，每个流上下文再各持一个 TR Dequeue Pointer 指向自己的传输环。三方分工一句话：xHCI 驱动（本页泳道「xHCI 驱动」即规范原文所称 system software（系统软件））备好各条流的环并写门铃，xHC 按 Stream ID 索引流上下文、推进流协议状态机，哪条流活跃（当前流 CStream）由设备决定。</p>
  <p>门铃不是随按随动——xHC 用流协议状态机（xSPSM：Disabled/Idle/Prime Pipe/Start Stream/Move Data，Figure 4-19）配一套<b>去抖动旗标</b>决定每次门铃的效果：IPPV 把 Prime Pipe 压到每进一次 Idle 只发一次；DBPV 补记非 Idle 期的门铃，一回 Idle 立即补发；LFCV 记住设备用 NRDY(Stream n) 流控过当前流，之后不再为它主动搬数；可选的 DSICV 捕获门铃里的流 ID，省一次查环。<b>HID=1</b> 时主机主导的 Idle→Move Data 转移整体关闭——有的用法让设备全权选流更高效；xHC 也可因内部资源限制按 HID=1 运行。</p>
  <p>流 ID 管理走<b>层级数组</b>：主流数组 2<sup>MaxPStreams+1</sup> 项（开辅流时上限 256 项即 MaxPStreams=7；Linear 模式上限 64K 项），Stream ID 拆低位 PSID 与高位 SSID——SSID=0 落主数组直指传输环（SCT=1），非 0 落辅流数组。越界检查是 xHC 的义务：SID=0 或超出数组大小回 <b>Invalid Stream ID Error</b>、SCT 类型不符回 <b>Invalid Stream Type Error</b>，均停端点；Set TR Dequeue Pointer 命令越界则以完成码 TRB Error 报告。设备切流可能落在 TD 中途——xHC 存流状态前先看 <b>ENT</b> 旗标：置位就把后随的 Event Data TRB 执行完再存，免得「数据移完、TD 悬着」把等完成的软件锁死。下方机器「流查表台」把这三小节做成一台可步进的查表机：开流换指针、门铃查表路由、切流再查、存态先查 ENT。</p>
</section>`;

const quoteHtml = `
<section class="spec-block">
  <h2>原文对照</h2>
  <blockquote><p class="q">“Streams extend the number of Transfer Rings that may be accessible to a SS Bulk USB endpoint. A standard endpoint defines a single Transfer Ring.”</p><p class="cite">(xHCI 1.2b §4.12 p218)</p><p class="zh">流把单环端点扩成流数组——上限 65533 条（脚注 39：SID 0、65534=Prime、65535=No Stream 保留）。</p></blockquote>
  <blockquote><p class="q">“The USB device determines which Stream is active at any time, that is, which Stream Context Transfer Ring is being used to move data.”</p><p class="cite">(xHCI 1.2b §4.12 p218)</p><p class="zh">选流权在设备——xHC 只按包头流 ID 备好各条流上下文，活跃的那条叫 CStream。</p></blockquote>
  <blockquote><p class="q">“Reliably determining whether a Stream Context is active or not, is a Device Class responsibility. There is no xHCI defined method.”</p><p class="cite">(xHCI 1.2b §4.12 p219)</p><p class="zh">流上下文是否活跃没有 xHCI 统一判法——空环或带外机制，判定责任归设备类协议（UASP 例见同页）。</p></blockquote>
  <blockquote><p class="q">“Stream Array bounds checking shall be supported by the xHCI. This feature ensures that an invalid Stream ID presented by a device or a Set TR Dequeue Pointer Command shall not cause the xHC to reference host memory that it doesn’t have access to.”</p><p class="cite">(xHCI 1.2b §4.12.2.1 p225)</p><p class="zh">越界检查是 xHCI 的强制义务——坏流 ID 不许变成越权内存访问。</p></blockquote>
  <blockquote><p class="q">“System software shall set the ENT flag in the last Transfer TRB before a terminating Event Data TRB in a TD. This action ensures the timely execution of an Event Data TRB if the Transfer Ring is flow controlled.”</p><p class="cite">(xHCI 1.2b §4.12.3 p228)</p><p class="zh">ENT 用法立法：TD 末尾是 Event Data TRB 时，前一个传输 TRB 必须置 ENT——防流控期 TD 悬挂。</p></blockquote>
</section>`;

const laneCard = k.plateHtml({
  fig: "流程",
  title: "§4.12 流协议主线：三方泳道总览",
  hint: "放大看小框文字 · 全屏后滚轮浏览",
  readout: "驱动侧 10 步 · xHC 侧查表与去抖动 · 设备选流切流",
  keys: [
    { mark: "raised", label: "实线箭头＝写/通报流；虚线＝设备侧状态与流控（p218–228）" },
    { mark: "edge", label: "设备泳道：选流权在设备——CStream 由它定、包边界可切流；全部流共享一条 bulk 管道（p218–219）" },
    { mark: "dim", label: "步进动画由下方机器卡接管（泳道卡保留总览形态）" },
  ],
  caption: "一条流的全程：挂环 → 带流 ID 门铃 → 去抖动起跑 → 设备选流切流 → 存状态回执。",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="§4.12 流协议三方泳道总览图，可放大平移。">${laneSvg()}<span role="status" aria-live="polite" data-status></span></div>` + zoomBarHtml("放大看框内文字 · 全屏后滚轮浏览"),
});

const machineCtlHtml = `<div class="fig-ctl" role="toolbar" aria-label="动画控制条">
  <button type="button" data-act="prev">◀ 上一帧</button>
  <button type="button" data-act="next">下一帧 ▶</button>
  <button type="button" data-act="tour" aria-pressed="false">自动巡游</button>
  <button type="button" data-act="reset">⟲ 复位</button>
  <span class="fig-ctl-hint">键盘：空格/点击步进 · ← → 换帧 · Home 回全景 · A 巡游</span>
</div>`;

const figCard = k.plateHtml({
  fig: "§4.12 动画",
  title: "流查表台：流 ID 的查表路由全程",
  hint: "控制条步进/巡游 · 点击或空格步进 · ← → 换帧 · Home 回全景 · A 巡游",
  readout: "步 0/10 · xSPSM — · CStream — · 端点 Running",
  keys: [
    { mark: "lit", label: "读卡滑车＝xHC 按 PSID 格位读流上下文卡：SCT=1 指传输环、SCT=3 转辅流卡笼（p222·p224）" },
    { mark: "raised", label: "四只旗灯＝去抖动旗标 IPPV/DBPV/LFCV/DSICV + HID 闸（p220–221）；转筒窗＝xSPSM 五态（Figure 4-19 p220）" },
    { mark: "edge", label: "票据沿总线缆走＝共享 bulk 管道上的包头 Stream ID 与 NRDY 流控（p218–219·p221）" },
    { mark: "dim", label: "演示样例：EP1 IN·MaxPStreams=3 → 16 格（Figure 4-20 例）；流 18=PSID 2·SSID 1 经辅数组 2" },
  ],
  caption: "存流状态前先查 ENT：置位就先把后随的 Event Data TRB 执行完再存——免得 TD 悬着把软件锁死（p227–228）。",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="流查表台，十一帧：全景、开流、挂环、门铃、查表路由、搬数与补记、设备切流、存状态查 ENT、回执、越界检查、读数巡回。点击或空格步进。">${svg}<span role="status" aria-live="polite" data-status></span></div>` + machineCtlHtml + zoomBarHtml(),
});

const tableHtml = `
<section class="spec-block">
  <h2>流协议要点（§4.12 · 按条文归纳）</h2>
  <table class="xsp-tb">
  <tr><th>要点</th><th>内容</th><th>页</th></tr>
  <tr><td><b>扩容上限</b></td><td>单 SS Bulk 端点最多 65533 条流；SID 0、FFFEh（Prime）、FFFFh（No Stream）保留；Linear 模式主数组 64K 项（末两项同为保留）</td><td class="mono">p218 脚注 39 · p225</td></tr>
  <tr><td><b>选流权</b></td><td>流选择由 USB 设备驱动——可在包边界切流；xHC 按包内 Stream ID 索引流上下文数组取流上下文</td><td class="mono">p219 · p222</td></tr>
  <tr><td><b>SID 编码（层级模式）</b></td><td>Stream ID 拆低位 PSID（索引主流数组）+ 高位 SSID（索引辅流数组）；分界由 MaxPStreams 定</td><td class="mono">p224</td></tr>
  <tr><td><b>数组大小</b></td><td>主流数组 2<sup>MaxPStreams+1</sup> 项；开辅流时上限 256 项（MaxPStreams=7）；MaxPStreams ≤ 描述符 MaxStreams；实现上限由 HCCPARAMS1.MaxPSASize 定、辅流支持由 NSS 位定</td><td class="mono">p223–225</td></tr>
  <tr><td><b>SCT 流上下文类型</b></td><td>主数组：SCT=1→传输环、SCT=2–7→辅流数组（容量随值编码）；辅数组内 SCT=0→传输环；辅流启用时主流数组 0 号项必须指辅数组（SCT>1）——SCT=0/1 未定义行为</td><td class="mono">p224–227</td></tr>
  <tr><td><b>去抖动旗标</b></td><td>IPPV 限每个 Idle 态一次 Prime Pipe；DBPV 补记非 Idle 期门铃、回 Idle 立即补发；LFCV 记 NRDY(Stream n) 流控后禁主动搬数；DSICV 可选捕获 DB Stream ID</td><td class="mono">p220–221</td></tr>
  <tr><td><b>HID</b></td><td>HID=1 禁主机主导 Idle→Move Data（设备全权选流）；xHC 也可因内部资源限制按 HID=1 运行</td><td class="mono">p221–222 · p223</td></tr>
  <tr><td><b>越界检查</b></td><td>SID=0 或 ≥ 主数组大小 → Invalid Stream ID Error、停端点；SCT 不符 → Invalid Stream Type Error、停端点；TR Dequeue Ptr=0：SCT=环按空环拒（NoStream 响应）、SCT=辅数组报 Invalid Stream Type Error；Set TR Dequeue Pointer 命令越界 → 完成码 TRB Error</td><td class="mono">p225–227</td></tr>
  <tr><td><b>共享管道</b></td><td>全部流共用同一 bulk 管道——CStream 停转（Stall）全体流一起停；无归因 TRB 的停转事件：TRB Pointer/Length=0、走 Slot Context Interrupter Target 指的事件环</td><td class="mono">p218–219 · p222</td></tr>
  <tr><td><b>active 判定</b></td><td>空环或带外机制得知不会被选为 CStream = non-active；可靠判定属 Device Class 职责、无 xHCI 方法；进 Stopped 后 CStream 不暴露——非空环只能带外判</td><td class="mono">p219</td></tr>
  </table>
</section>`;

const linksHtml = `
<section class="spec-block">
  <h2>相关</h2>
  <ul class="links">
    <li><a href="../4.11-trbs/index.html">§4.11 TRB（传输请求块）</a>——Event Data TRB 与 ENT 位定义（机器「先执行 ED 卡再存态」的位依据）</li>
    <li><a href="../4.7-doorbells/index.html">§4.7 门铃</a>——端点门铃与 DB Stream ID 字段（机器的计数轮按铃）</li>
    <li><a href="../4.8-endpoint/index.html">§4.8 端点</a>——EP Context 的 MaxPStreams/HID 字段与 EP State</li>
    <li><a href="../4.9-trb-ring/index.html">§4.9 TRB 环</a>——传输环与门铃取环（流=给一个端点配一排环）</li>
    <li><a href="../4.17-interrupters/index.html">§4.17 中断器</a>——事件环去向（Slot Context Interrupter Target）</li>
    <li><a href="../../index.html">§4.6.10 Set TR Dequeue Pointer 命令（待建）</a>——撤流与越界报错入口</li>
  </ul>
</section>`;

const footerHtml = `<footer class="spec-foot">判据：xHCI 1.2b（625472 Rev 1.2b）§4.12 p218–228 · 引文逐字核对，证据见 <a href="EVIDENCE.md">EVIDENCE.md</a> · 生成于 2026-11-04</footer>`;

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
/* 代码走读卡（rings3）：course.css 走读段整体内联 + 纸面卡变量垫片——走读卡固定
   浅色纸面（读代码的场景材质），双主题同形；变量映射到板内中性色。 */
${stepperCss}
.stepper { --line: #c9c4b2; --ink: #1f1c14; --muted: #6b675a; --accent: #8a5f14; --good: #2f7a3d;
  font-family: var(--anatomy-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans CJK SC", sans-serif);
  color: #1f1c14; }
.xsp-walknote { font-family: var(--anatomy-ui, system-ui, sans-serif); font-size: 14.5px; line-height: 1.75; color: var(--anatomy-muted); margin: 10px 2px 0; }
</style>`;

// 代码走读卡块（CODE-STEPPER 量产轮）：walknote+stepper 在 body 尾段（footer 之前）；
//   CSS 进 pageCss style 块、JS 拼进 module script（4.2/4.3 同款——勿用 page.replace("</body>")
//   后注入：kit 源码内嵌 pageHtml 模板含字面 </body>，首个命中落在 module 脚本内部，
//   codestepper 反引号提前闭合 kit 模板串 → 整页 JS 崩，2026-11-05 4.12 实锤）。
const walkHtml = `<section class="spec-block walkcard">
<h2>代码走读：流运行时全链（bulk 流端点）</h2>
<p class="xsp-walknote">本节泳道步 2–4 与步 10 在真实内核代码里的样子——UAS 类驱动给 bulk OUT URB 标 stream_id=1 起步（uas.c），xhci_urb_enqueue 过流过渡防御与 bulk 分发，xhci_queue_bulk_tx 按「槽/端点/流 ID」三元组选出流 1 的环（流 ID 越界在驱动侧先拦一道），TD 挂环、Normal TRB 写入、首 TRB cycle 位放行并按门铃（DB Target=DCI 2 · DB Stream ID=1）；随后 xHC 查主流数组格 1 路由到流 1 的环、取走 TRB，数据带包头流 ID 上共享 bulk 管道；回执侧的 Transfer Event 不带流 ID——驱动按事件里的 TRB DMA 地址查基树归环（xhci_dma_to_transfer_ring），TD 摘链、URB 交还。TD 计数口径挑明：规范按传输阶段记 TD、内核 struct xhci_td 按 URB 记——本例一个 bulk URB 一颗 Normal TRB=一个内核 TD，两个口径重合。命令环本链全程静默：开流的 Configure Endpoint（usb_alloc_streams → xhci_alloc_streams 建流上下文数组与逐流环）在链外已走完，形态见 §4.5 走读卡。ENT 如实注记：内核此基线不为 bulk TD 排 Event Data TRB、也不置 ENT——§4.12.3 的义务与语义见要点表与本节机器 F7。</p>
` + stepperHtml + `\n</section>`;
const body = pageCss + navHtml + proseHtml + quoteHtml + `<div class="lane-wrap">` + laneCard + `</div>` + `<div class="fig-wrap">` + figCard + `</div>` + tableHtml + walkHtml + footerHtml;

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
const script = kitScript() + stepperJs + latheScript + geoScript + live
  + zoomFor(0, ["#lane-svg"], "__zfsLane")
  + zoomFor(1, ['[data-name="cage.back"]', '[data-name="con.body"]'], "__zfs");

const page = k.pageHtml({ title: "§4.12 流（Streams） · xHCI 规范对照学习", theme: THEME, body, script, width: 1500 });
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} items`, `scale ${KS.toFixed(3)}`);

A.auditOrExit(R, P, {});

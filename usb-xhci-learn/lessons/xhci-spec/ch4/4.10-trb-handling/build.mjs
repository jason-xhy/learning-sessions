// §4.10 主机控制器 TRB 处理 —— anatomy 机器「TRB 处理台」+ 静态泳道图 + 表格卡
// 判据：xHCI 1.2b §4.10 p170–188（断言逐条见 EVIDENCE.md）
// 概念一句话：TRB 卡列成一排在传输环卡轨上，取卡滑车逐卡验过 Cycle 位，
//   执行滑车沿数据导轨在设备收件口与内存储物柜之间搬数据票据；
//   完工后按结局冲压出 Transfer Event 回执卡落事件环轨道——IOC 灯亮必出卡，
//   错误无视三灯必出卡且 HALT 大闸落下锁停卡轨。
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { zoomBarHtml, zoomFsCss, zoomFsScript } from "../../shared/zoomfs.mjs";
import * as k from "/Users/jason/.zcode/skills/anatomy/kit/iso-kit.mjs";
import * as G from "/Users/jason/.zcode/skills/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "/Users/jason/.zcode/skills/anatomy/kit/tube.mjs";
import * as A from "/Users/jason/.zcode/skills/anatomy/kit/audit.mjs";
import { kitScript } from "/Users/jason/.zcode/skills/anatomy/scripts/inline-kit.mjs";
import { makeLiveGeo } from "./geometry-live.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

// ================= camera =================
const W = 920, H = 620, AZ = 45, EL = 30;

// ================= world =================
// 底板 / 驱动文书台（左）/ xHC 处理主机（中：卡轨+滑车+灯排+冲压位+储物柜+闸）
// / 数据导轨门架（右）/ 设备试验盒（右前）/ 事件环轨道（中前）
const PLATE = { x: -220, y: -175, w: 445, d: 340, r: 9 };
const PLATE_H = 12, FOOT_H = 5;

// 驱动文书台：x -212..-118, y -150..-8
const DESK = { x: -212, y: -150, w: 94, d: 142, r: 1.6 };
const INBOX_X = [-206, -168, -130];           // 收件匣三格中心（Success/Short/Error）
const IRQ = { x: -165, y: -34 };              // 中断灯（台后段）
const LEVERS = [-196, -140];                  // 拉杆排（门铃/Reset Endpoint）

// xHC 处理主机：x -100..120, y -160..26；台身 z 0..26，台面顶 z 26
const HOST = { x: -100, y: -160, w: 220, d: 186, r: 2 };   // y -160..26
const TOP = 26;
// 传输环卡轨（台面前段）：双轨 y -62..-50，卡行 x -86..109（6 卡，节距 33）
const RAIL_Y = -62, RAIL_D = 12;
const TRB_X = [-86, -53, -20, 13, 46, 79];    // 卡左缘：A B C(末位IOC) D(ISP) E(出错位) L(Link)
const TRB_W = 30, TRB_H = 34, TRB_T = 3;      // 卡宽/卡高（z 向）/厚
const RAIL_X0 = -96, RAIL_X1 = 110;           // 轨道范围（右端挡 111..116，卡尾 109）
// 标志灯排（IOC/ISP/BEI）+ EP State 读数板：y -90..-72 行
const FLAG_X = [-78, -48, -18], FLAG_Y = -84;
const EPS = { x: 22, y: -96, w: 74, d: 22, r: 1.2 };       // EP State 读数板（立）
// 事件冲压位（台面左后）：x -88..-30, y -136..-102
const STAMP = { x: -88, y: -136, w: 58, d: 34, r: 2 };
// 内存储物柜（台面右后）：x 52..116, y -136..-100，三格
const MEM = { x: 52, y: -136, w: 64, d: 36, r: 2 };
const MEM_CX = [58, 76, 94];
// HALT 大闸（台前右段，骑在台面前缘上）：底座 x 80..132, y -34..-4（右缘与导轨 x138 间隙 6）
const HALT = { base: { x: 80, y: -34, w: 52, d: 30, r: 2 }, hinge: [88, -12], contact: [124, -12], z: TOP };
// 数据导轨（沿 y 轴 x=141）：设备收件口 y 56 → 储物柜顶 y -100；门架跨轨
const DRAIL = { x: 141, y0: -100, y1: 56 };
const GATE = { posts: [[129, -64], [153, -64]], beamY: -64, beamZ: TOP + 45 };
// 设备试验盒（右前）：x 150..206, y 58..150
const DEV = { x: 150, y: 58, w: 56, d: 92, r: 2 };
// 事件环轨道（主机台前底板）：x -96..28, y 46..112；三卡位 + 出口朝驱动
const EVR = { x: -96, y: 46, w: 124, d: 66 };
const EV_X = [-88, -54, -20], EV_W = 30;
// 注记牌（台左侧底板 / 台前左）
const NOTE_ISO = { x: -204, y: 30, w: 84, d: 4, r: 0.8 };   // 等时例外
const NOTE_ERR = { x: -92, y: 36, w: 96, d: 4, r: 0.8 };    // 错误必出事件

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...k.boxCorners(HOST, TOP, 36),
   [-212, 14, 48], [-118, -150, 46], [DEV.x + DEV.w, DEV.y + DEV.d, 40],
   [HALT.hinge[0], HALT.hinge[1], TOP + 26], [141, DRAIL.y0, 46],
   [141, GATE.beamY, GATE.beamZ + 6],
   [EVR.x + EVR.w, EVR.y + EVR.d, 22], [-204, 30, 40], [-92, 40, 40],
   [HOST.x, HOST.y - 6, TOP + 26], [141, 66, 44]],
  W, H, { pad: 26, azimuth: AZ, elevation: EL },
);
const V = G.viewOf(P), KS = G.scaleOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const f2 = (v) => Math.round(v * 100) / 100;
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], a[1], 0], P));
const FT = (m, text, size, tone = "mid", anchor = "start") => k.faceTextSvg(m, text, { size, tone, anchor });
function planeMatrix(o, ex, ey) {
  const p0 = at(o), px = at(G.add3(o, ex)), py = at(G.add3(o, ey));
  return `matrix(${f2(px[0] - p0[0])} ${f2(px[1] - p0[1])} ${f2(py[0] - p0[0])} ${f2(py[1] - p0[1])} ${f2(p0[0])} ${f2(p0[1])})`;
}
const faceM = (x, y, z) => planeMatrix([x, y, z], [1, 0, 0], [0, 0, -1]); // +y 竖直面文字
const vtext = (x, y, z, text, size, tone = "mid", anchor = "start") => FT(faceM(x, y, z), text, size, tone, anchor);
function screwDots(plan, inset, z) {
  return Dots(k.corners(plan, inset).map(([x, y]) => at([x, y, z])), { size: 0.5 });
}

// TRB 卡定义（DATA 与几何共用；live 同源）
// 末位 IOC：TD1 的 C 卡；D2=短包位（ISP）；E=出错位；L=Link
const TRB_DEFS = [
  { key: "trbA", name: "TRB·IN", sub: "数据 · Len 24", flag: "" },
  { key: "trbB", name: "TRB·IN", sub: "数据 · Len 24", flag: "" },
  { key: "trbC", name: "TRB·末位", sub: "IOC=1", flag: "IOC" },
  { key: "trbD", name: "TRB·IN", sub: "数据 · ISP=1", flag: "ISP" },
  { key: "trbE", name: "TRB·IN", sub: "数据 · TD3", flag: "" },
  { key: "trbL", name: "Link", sub: "回卷 · 翻 Cycle", flag: "" },
];
// 事件卡定义（CC 卡面）
const EV_DEFS = [
  { key: "ev0", cc: "Success", len: "Len 48", src: "C" },
  { key: "ev1", cc: "Short Packet", len: "Len 残余", src: "D2" },
  { key: "ev2", cc: "Stall Error", len: "Len 24", src: "E" },
];

// live 数据（先于动件几何）
const DATA = {
  P, KS, W, H,
  trbDefs: TRB_DEFS, trbX: TRB_X, trbW: TRB_W, trbH: TRB_H, trbT: TRB_T, railY: RAIL_Y, top: TOP,
  flagX: FLAG_X, flagY: FLAG_Y,
  stamp: { x: STAMP.x, y: STAMP.y, w: STAMP.w, d: STAMP.d },
  mem: { x: MEM.x, y: MEM.y, w: MEM.w, d: MEM.d, cx: MEM_CX },
  drail: { x: DRAIL.x, y0: DRAIL.y0, y1: DRAIL.y1 },
  dev: { x: DEV.x, y: DEV.y, w: DEV.w, d: DEV.d },
  evDefs: EV_DEFS, evX: EV_X, evW: EV_W,
  evZ: PLATE_H + 6.4, evFaceY: EVR.y + EVR.d - 12.4,   // 事件卡底高 / 卡前面 y（与实体记录一致）
  halt: { hinge: HALT.hinge, contact: HALT.contact, z: HALT.z },
  inboxX: INBOX_X, inboxY: DESK.y + 10, irq: { x: IRQ.x, y: IRQ.y },
};
const geo = makeLiveGeo(k, G, DATA);

// ================= recorder =================
const R = A.recorder(P);
const record = R.solid;
function put(name, ref, svg, shapes = [], { bias = 0, ...rest } = {}) {
  return R.put({ name, at: ref, bias, svg, shapes, piece: "bench", ...rest });
}
function slab(name, plan, z, h, style = {}, { steps = 4, bevel = 0, extra = "", inner = "", bias = 0, ref } = {}) {
  const shape = record(A.slab(plan, z, h, { name }, steps));
  put(name, ref ?? [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2],
    S(k.slabOf(plan, z, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape], { bias });
  return shape;
}
function cyl(name, cx, cy, r, z, h, style = {}, { steps = 24, bevel = 0, extra = "", inner = "", bias = 0 } = {}) {
  const shape = record(A.cylinder(cx, cy, r, z, h, { name }, steps));
  put(name, [cx, cy, z + h / 2], S(k.cylinder(cx, cy, r, z, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape], { bias });
  return shape;
}

// 贴面文字/刻线收集（无实体形状的 markup，组装时最后绘制，不进审计）
const overlays = [];
const faceText = (svg) => { overlays.push(svg); };
// 铭牌/面向观众文字层（遮挡修复纪律 2026-11-03）：组装序＝静态实体之后、actors 动态组之前
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
{ // 标尺条 + 铭牌（驱动台前方底板——避开事件环 ERDP 立牌的屏幕投影带）
  const strip = { x: -212, y: 126, w: 92, d: 6.5, r: 1 };
  const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4.4, 5, strip.y + 0.8, PLATE_H + 0.6, [2, 3.6], P);
  slab("stand.ruler", strip, PLATE_H, 0.6, { tone: "lo", crease: "none" },
    { steps: 3, extra: Ln(t.minor, { tone: "lo" }) + Ln(t.major, { tone: "mid" }) });
  const lab = { x: -118, y: 124, w: 34, d: 12, r: 1.2 };
  slab("stand.label", lab, PLATE_H, 0.8, { tone: "lo", crease: "none" },
    { steps: 3, extra: Ln(k.planOutline(k.insetPlan(lab, 1.6), PLATE_H + 0.8, P, 3), { tone: "faint" })
      + Ln([20, 14, 17].map((w2, i) => k.lineOnTop([lab.x + 4, lab.y + 4 + i * 3.4], [lab.x + 4 + w2, lab.y + 4 + i * 3.4], PLATE_H + 0.8, P)).join(""), { tone: "lo", free: true })
      + Dots([[lab.x + lab.w - 2.8, lab.y + 2.8], [lab.x + lab.w - 2.8, lab.y + lab.d - 2.8]].map(([x, y]) => at([x, y, PLATE_H + 0.8])), { size: 0.45 }) });
}

// ================= xHC 处理主机（台身 + 台面） =================
{
  const seam = k.sideSeam(HOST, 14, P, 4);
  slab("host.body", HOST, PLATE_H, TOP - PLATE_H, { tone: "mid" },
    { steps: 4, bevel: 0.8, extra: Ln(k.corners(HOST, 7).map(([x, y]) => k.ring(x, y, 2, PLATE_H + 3, P, 14)).join(""), { tone: "lo" }), inner: Ln(seam, { tone: "faint" }) });
  // 台面顶板（沿略出）
  const tp = { x: HOST.x - 3, y: HOST.y - 3, w: HOST.w + 6, d: HOST.d + 6, r: 2.4 };
  slab("host.top", tp, TOP, 3, { tone: "mid" },
    { steps: 4, bevel: 0.5, extra: Ln(k.planOutline(k.insetPlan(tp, 3), TOP + 3, P, 4), { tone: "lo" }) + screwDots({ x: HOST.x - 1, y: HOST.y - 1, w: HOST.w + 2, d: HOST.d + 2 }, 8, TOP + 3) });
  // 侧面（+x）通风刻槽：闭合
  const vents = [10, 16, 22].map((z) => k.pathOf(
    [[HOST.x + HOST.w + 3.05, -140, z], [HOST.x + HOST.w + 3.05, -100, z], [HOST.x + HOST.w + 3.05, -100, z + 2.6], [HOST.x + HOST.w + 3.05, -140, z + 2.6]].map((p) => at(p)), true)).join("");
  faceText(Ln(vents, { tone: "faint" }));
  // 台前檐机制句（台面前缘上沿，topMatrix 水平面）
  labelText(
    FT(k.topMatrix([-94, -44], TOP + 3.1, P, "x"), "取 TRB → 验 Cycle → 执行 → 评结局", 6.4, "hi")
    + FT(k.topMatrix([14, -44], TOP + 3.1, P, "x"), "事件生成必伴随中断", 6.4, "hi"));
}
// 主机铭牌（台顶后沿立牌）——板留实体序，文字入 labels 层
{
  const mp = { x: -56, y: -158, w: 116, d: 6, r: 1 };
  slab("host.title", mp, TOP + 3, 17, { tone: "hi" }, { steps: 2 });
  labelText(vtext(mp.x + 5, mp.y + mp.d + 0.05, TOP + 9.4, "xHC 控制器 · TRB 处理台", 8.6, "hi")
    + vtext(mp.x + 5, mp.y + mp.d + 0.05, TOP + 1.8, "规范称 the xHC", 5.4, "mid"));
}

// ================= 传输环卡轨 + TRB 卡行 =================
{
  // 双轨（前后两条 + 端挡）
  for (const [i, yy] of [[0, RAIL_Y - RAIL_D + 3], [1, RAIL_Y - 3]]) {
    slab(`ring.rail${i}`, { x: RAIL_X0, y: yy, w: RAIL_X1 - RAIL_X0, d: 4.5, r: 1.2 }, TOP + 3, 4, { tone: "mid" }, { steps: 3, bevel: 0.3 });
  }
  slab("ring.stopL", { x: RAIL_X0 - 6, y: RAIL_Y - RAIL_D + 2, w: 5, d: RAIL_D + 2, r: 1 }, TOP + 3, 9, { tone: "lo" }, { steps: 2 });
  slab("ring.stopR", { x: RAIL_X1 + 1, y: RAIL_Y - RAIL_D + 2, w: 5, d: RAIL_D + 2, r: 1 }, TOP + 3, 9, { tone: "lo" }, { steps: 2 });
  // 槽位浅框刻线（闭合）
  let ghost = "";
  for (const x of TRB_X) {
    ghost += Ln(k.pathOf([
      [x + 1.2, RAIL_Y - RAIL_D + 3.2, TOP + 7.1], [x + TRB_W - 1.2, RAIL_Y - RAIL_D + 3.2, TOP + 7.1],
      [x + TRB_W - 1.2, RAIL_Y - RAIL_D + 3.2, TOP + 7.1 + TRB_H - 2.4], [x + 1.2, RAIL_Y - RAIL_D + 3.2, TOP + 7.1 + TRB_H - 2.4],
    ].map((p) => at(p)), true), { tone: "mid" });
  }
  faceText(ghost);
  faceText(FT(k.topMatrix([RAIL_X0 + 2, RAIL_Y - RAIL_D - 3], TOP + 3.1, P, "x"), "传输环（EP · IN 端点）", 6.2, "lo")
    + FT(k.topMatrix([RAIL_X1 - 34, RAIL_Y - RAIL_D - 3], TOP + 3.1, P, "x"), "驱动生产 · xHC 消费", 5, "lo"));
  // 六张 TRB 卡（live 控制 done/active 态；静态 svg 入审计）
  for (let i = 0; i < TRB_DEFS.length; i++) {
    const def = TRB_DEFS[i], x = TRB_X[i];
    put(`trb.${def.key}`, [x + TRB_W / 2, RAIL_Y - RAIL_D + 3, TOP + 7 + TRB_H / 2],
      `<g data-trb="${def.key}">` + geo.trbCardSvg(x, def, 0) + `</g>`,
      [record(A.slab({ x, y: RAIL_Y - RAIL_D + 3, w: TRB_W, d: TRB_T, r: 0.8 }, TOP + 7, TRB_H, { name: `trb.${def.key}` }, 2))],
      { bias: 0.3 });
  }
  // 取卡滑车（Dequeue 指针；初始位=首卡上方，车底贴卡顶；live 每帧重建）
  put("dq.car", [TRB_X[0] + TRB_W / 2, RAIL_Y - 8, TOP + 7 + TRB_H + 5], `<g data-part="dqcar">${geo.dqCarSvg(TRB_X[0] + TRB_W / 2, 0)}</g>`,
    [record(A.slab({ x: TRB_X[0] + TRB_W / 2 - 9, y: RAIL_Y - 13, w: 18, d: 10, r: 1.4 }, TOP + 7 + TRB_H, 10, { name: "dq.car" }, 3))], { bias: 0.9 });
}

// ================= 标志灯排（IOC/ISP/BEI）+ EP State 读数板 =================
{
  for (const [i, [nm]] of [["IOC"], ["ISP"], ["BEI"]].entries()) {
    const cx = FLAG_X[i];
    // 灯座竖直站在台面上（轴向 +z，底 z=台面顶+0.05 贴面）
    const seatF = G.frameOf([cx, FLAG_Y, TOP + 3.05], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    put(`flag.${nm}.seat`, [cx, FLAG_Y, TOP + 4.2],
      S(G.disc(0, 0, 4.2, seatF, P, { steps: 24, bevel: 0.25 }), { tone: "lo" })
      + Ln(G.circleOf(seatF, 0, 4.2, P, 24), { tone: "lo" }),
      [record(A.disc(seatF, 0, 0, 4.2, { name: `flag.${nm}.seat` }))], { bias: 0.3 });
    const lampF = G.frameOf([cx, FLAG_Y, TOP + 3.05], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    put(`flag.${nm}.dome`, [cx, FLAG_Y, TOP + 5.6],
      `<g data-part="flag-${nm.toLowerCase()}" class="lamp">` + S(G.solidOf([[0, 0.2], [1, 2, 1], [2.1, 2.5, 1], [2.9, 2, 1], [3.4, 0.3]], lampF, P, { steps: 20 }), { tone: "hi" }) + `</g>`,
      [record(A.solid(lampF, [[0, 0.2], [1, 2, 1], [2.1, 2.5, 1], [2.9, 2, 1], [3.4, 0.3]], { name: `flag.${nm}.dome` }))], { bias: 0.4 });
    labelText(FT(k.topMatrix([cx - 6, FLAG_Y - 6.5], TOP + 3.1, P, "x"), nm, 6.4, i === 0 ? "hi" : "mid"));
  }
  labelText(FT(k.topMatrix([RAIL_X0 + 2, FLAG_Y - 5.5], TOP + 3.1, P, "x"), "标志灯排", 6.2, "lo")
    + FT(k.topMatrix([RAIL_X0 + 2, FLAG_Y - 12.5], TOP + 3.1, P, "x"), "置位＝该 TRB 要求事件", 4.8, "lo"));
  // EP State 读数板（立板 + 数码窗）
  slab("eps.board", EPS, TOP + 3, 26, { tone: "lo" }, { steps: 3 });
  faceText(`<g data-part="epswin">${geo.epsWinSvg("Running")}</g>`
    + vtext(EPS.x + 5, EPS.y + 0.05, TOP + 23.4, "EP State", 6.6, "mid")
    + vtext(EPS.x + 5, EPS.y + 0.05, TOP + 4.4, "端点态", 4.6, "lo"));
}

// ================= 事件冲压位（左后） =================
{
  slab("stamp.base", STAMP, TOP + 3, 12, { tone: "mid" }, { steps: 4, bevel: 0.5, extra: screwDots(STAMP, 3, TOP + 15) });
  // 冲头导柱两根（柱在冲头板后沿 y 带）+ 冲头（live 重建；板窄于柱距，顶贴顶座）
  for (const gx of [STAMP.x + 8, STAMP.x + STAMP.w - 8]) {
    const i = gx === STAMP.x + 8 ? 0 : 1;
    cyl(`stamp.guide${i}`, gx, STAMP.y + STAMP.d - 6, 1.5, TOP + 15, 26, { tone: "mid", crease: "none" },
      { steps: 14, extra: Ln(k.sideArc(gx, STAMP.y + STAMP.d - 6, 1.5, TOP + 26, P, 10), { tone: "faint" }) });
  }
  put("stamp.head", [STAMP.x + STAMP.w / 2, STAMP.y + STAMP.d - 4, TOP + 37], `<g data-part="stamphead">${geo.stampHeadSvg(0)}</g>`,
    [record(A.slab({ x: STAMP.x + 14, y: STAMP.y + STAMP.d - 8, w: STAMP.w - 28, d: 6, r: 1 }, TOP + 33, 8, { name: "stamp.head" }, 2))], { bias: 1.3 });
  // 冲压顶座（横跨两导柱顶：冲头 home 顶面贴其底）
  slab("stamp.cross", { x: STAMP.x + 4, y: STAMP.y + STAMP.d - 10, w: STAMP.w - 8, d: 8, r: 1 }, TOP + 41, 3, { tone: "mid" },
    { steps: 3, bevel: 0.4, extra: screwDots({ x: STAMP.x + 4, y: STAMP.y + STAMP.d - 10, w: STAMP.w - 8, d: 8 }, 2, TOP + 44) });
  // 出卡口（朝 -x 侧立面小托板）
  slab("stamp.chute", { x: STAMP.x - 14, y: STAMP.y + 4, w: 14, d: 26, r: 1 }, TOP + 15, 3, { tone: "lo" }, { steps: 2 });
  labelText(vtext(STAMP.x + 2, STAMP.y + STAMP.d + 0.05, TOP + 27, "Transfer Event 冲压", 5.8, "hi")
    + vtext(STAMP.x + 2, STAMP.y + STAMP.d + 0.05, TOP + 21, "出卡＝事件入环", 4.8, "mid"));
}

// ================= 内存储物柜（右后） =================
{
  slab("mem.body", MEM, TOP + 3, 26, { tone: "mid" }, { steps: 4, bevel: 0.6 });
  // 三格刻线（竖线沿柜前面 y=-100 侧贯通柜体全高：两端落柜底/柜顶沿）
  let gl = "";
  for (const gx of [MEM.x + 21.4, MEM.x + 42.8]) {
    gl += Ln(k.pathOf([[gx, MEM.y + MEM.d - 0.1, TOP + 3.2], [gx, MEM.y + MEM.d - 0.1, TOP + 28.8]].map((p) => at(p))), { tone: "faint" });
  }
  faceText(gl + Ln(k.planOutline(k.insetPlan(MEM, 1.6), TOP + 29, P, 3), { tone: "faint" }));
  labelText(vtext(MEM.x + 2, MEM.y + 0.05, TOP + 24.4, "内存储物柜 · 数据缓冲", 5.8, "hi"));
  faceText(`<g data-part="memcells">${geo.memCellsSvg([0, 0, 0])}</g>`);
}

// ================= 票据托盘（台面中段：冲压位与储物柜之间的走道，滑车中转落票处） =================
{
  const tray = { x: 12, y: -134, w: 34, d: 24, r: 1.8 };
  slab("tray", tray, TOP + 3, 2.4, { tone: "lo" }, { steps: 3, bevel: 0.3,
    extra: Ln(k.planOutline(k.insetPlan(tray, 2), TOP + 5.4, P, 3), { tone: "faint" })
      + Dots(k.corners(tray, 2.6).map(([x, y]) => at([x, y, TOP + 5.4])), { size: 0.4 }) });
  labelText(FT(k.topMatrix([tray.x + 1, tray.y + tray.d + 3], TOP + 3.1, P, "x"), "票据托盘", 5.4, "lo"));
}

// ================= HALT 大闸（台前右段） =================
{
  const b = HALT.base;
  slab("halt.base", b, HALT.z + 3, 6, { tone: "mid" }, { steps: 4, bevel: 0.5, extra: screwDots(b, 3, HALT.z + 9) });
  cyl("halt.post", HALT.hinge[0], HALT.hinge[1], 2.4, HALT.z + 9, 6, { tone: "mid" }, { steps: 18, bevel: 0.3 });
  cyl("halt.contact", HALT.contact[0], HALT.contact[1], 2.1, HALT.z + 9, 6.5, { tone: "hi" }, { steps: 18, bevel: 0.3 });
  // 闸臂：球心在铰柱顶上方相切（z 41 柱顶 + 2.2 球半径 = 43.2）
  put("halt.arm", [(HALT.hinge[0] + HALT.contact[0]) / 2, HALT.hinge[1], HALT.z + 18], `<g data-part="haltarm">${geo.haltArmSvg(0)}</g>`,
    [record(A.ball([HALT.hinge[0], HALT.hinge[1], HALT.z + 17.2], 2.2, { name: "halt.arm.ball" })),
     record(A.prism(G.frameAlong([HALT.hinge[0] + 2.1 * Math.cos((50 * Math.PI) / 180), HALT.hinge[1], HALT.z + 17.2 + 2.1 * Math.sin((50 * Math.PI) / 180)], [Math.cos((50 * Math.PI) / 180), 0, Math.sin((50 * Math.PI) / 180)]), [[-1.7, -1.7], [1.7, -1.7], [1.7, 1.7], [-1.7, 1.7]], 0, 36, { name: "halt.arm.beam" }))], { bias: 0.4 });
  faceText(
    FT(k.topMatrix([HALT.hinge[0] + 5, HALT.base.y + HALT.base.d - 4], HALT.z + 9.1, P, "x"), "HALT 大闸", 6.4, "mid")
    + FT(k.topMatrix([HALT.hinge[0] - 2, HALT.contact[1] + 9], HALT.z + 9.1, P, "x"), "OFF", 5, "lo")
    + FT(k.topMatrix([HALT.contact[0] - 5, HALT.contact[1] + 9], HALT.z + 9.1, P, "x"), "ON", 5, "hi")
    + FT(k.topMatrix([HALT.hinge[0] - 4, HALT.base.y - 8], HALT.z + 9.1, P, "x"), "落下＝端点 Halted", 4.8, "lo")
    + FT(k.topMatrix([HALT.hinge[0] - 4, HALT.base.y - 14.5], HALT.z + 9.1, P, "x"), "停在出错 TRB 上（p176）", 4.4, "lo"));
}

// ================= 数据导轨 + 门架（右列；门架柱落底板——台面右缘 x123 外） =================
{
  // 导轨：沿 y 长轨一条 + 支柱两根（落底板撑轨）
  slab("drail.rail", { x: DRAIL.x - 2.6, y: DRAIL.y0, w: 5.2, d: DRAIL.y1 - DRAIL.y0, r: 1.2 }, TOP + 8, 4, { tone: "mid" }, { steps: 3, bevel: 0.4 });
  for (const py of [-56, 34]) {
    const i = py === -56 ? 0 : 1;
    cyl(`drail.pillar${i}`, DRAIL.x, py, 2, PLATE_H, TOP + 8 - PLATE_H, { tone: "mid", crease: "none" },
      { steps: 14, extra: Ln(k.sideArc(DRAIL.x, py, 2, 22, P, 10), { tone: "faint" }) });
  }
  faceText(Ln(k.topTicks(DRAIL.y0 + 6, DRAIL.y1 - 6, 6, 5, DRAIL.x + 3.4, TOP + 12.1, [2, 3.4], P, "y").minor, { tone: "lo" }));
  // 门架双柱 + 梁（柱落底板：z 12..71，梁 z 71..76 高跨导轨）
  for (let i = 0; i < GATE.posts.length; i++) {
    const [px, py] = GATE.posts[i];
    cyl(`gate.foot${i}`, px, py, 4.6, PLATE_H, 4, { tone: "lo" }, { steps: 20 });
    cyl(`gate.post${i}`, px, py, 2.3, PLATE_H + 4, 55, { tone: "mid", crease: "none" },
      { steps: 16, extra: Ln([16, 26, 40].map((z) => k.sideArc(px, py, 2.3, z, P, 10)).join(""), { tone: "faint" }) });
  }
  slab("gate.beam", { x: GATE.posts[0][0] - 2, y: GATE.beamY - 5, w: GATE.posts[1][0] - GATE.posts[0][0] + 4, d: 10, r: 2 }, GATE.beamZ, 5, { tone: "mid" }, { steps: 3, bevel: 0.4 });
  // 刻字放梁右端外侧（避开台面储物柜票据堆的屏幕投影带）
  labelText(
    FT(k.topMatrix([GATE.posts[1][0] + 4, GATE.beamY], GATE.beamZ + 5.1, P, "x"), "数据导轨", 5.8, "mid")
    + FT(k.topMatrix([GATE.posts[1][0] + 4, GATE.beamY - 7], GATE.beamZ + 5.1, P, "x"), "IN 端点收包", 4.8, "lo"));
  // 执行滑车（live 每帧重建；初始位=储物柜端）
  put("exe.car", [DRAIL.x, DRAIL.y0 + 8, TOP + 12], `<g data-part="execar">${geo.exeCarSvg(DRAIL.y0 + 8, 0)}</g>`,
    [record(A.slab({ x: DRAIL.x - 7, y: DRAIL.y0 + 2, w: 14, d: 12, r: 1.6 }, TOP + 12, 9, { name: "exe.car" }, 3))], { bias: 1.1 });
}

// ================= 驱动文书台（左） =================
{
  const seamD = k.sideSeam(DESK, 16, P, 4);
  slab("desk.body", DESK, PLATE_H, 20, { tone: "mid" }, { steps: 4, bevel: 0.6, inner: Ln(seamD, { tone: "faint" }) });
  const topPlan = { x: DESK.x - 3, y: DESK.y - 3, w: DESK.w + 6, d: DESK.d + 6, r: 2 };
  slab("desk.top", topPlan, 32, 3, { tone: "mid" },
    { steps: 4, bevel: 0.4, extra: Ln(k.planOutline(k.insetPlan(topPlan, 3), 35, P, 4), { tone: "lo" }) });
  // 收件匣三格（台面前段）
  for (const [i, [nm, label]] of [["success", "Success"], ["short", "Short Packet"], ["err", "Stall Error"]].entries()) {
    const cx = INBOX_X[i];
    slab(`inbox.${nm}`, { x: cx - 16, y: DESK.y + 6, w: 32, d: 34, r: 1.2 }, 35, 8, { tone: "lo" }, { steps: 3, bevel: 0.3 });
    faceText(`<g data-part="inbox-${nm}">${geo.inboxSvg(cx, DATA.inboxY, 0)}</g>`
      + vtext(cx - 13, DESK.y + 40.2, 40, nm === "success" ? "Success" : nm === "short" ? "Short" : "Error", 5.2, "mid"));
  }
  faceText(FT(k.topMatrix([DESK.x + 4, DESK.y - 5.5], 35.1, P, "x"), "收件匣 · 按 Completion Code 分派", 5.2, "lo"));
  // 中断灯（台后段；座底缘贴台面 35）+ 拉杆两根
  const seatF = G.frameOf([IRQ.x, IRQ.y + 0.1, 39.6], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  put("irq.seat", [IRQ.x, IRQ.y + 1.2, 39.6], S(G.disc(0, 2.2, 4.6, seatF, P, { steps: 22, bevel: 0.25 }), { tone: "lo" }),
    [record(A.disc(seatF, 0, 2.2, 4.6, { name: "irq.seat" }))], { bias: 0.3 });
  const lf = G.frameOf([IRQ.x, IRQ.y + 2.2, 39.6], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  put("irq.dome", [IRQ.x, IRQ.y + 3.6, 40.2],
    `<g data-part="irqlamp" class="lamp">` + S(G.solidOf([[0, 0.2], [1, 2, 1], [2.1, 2.5, 1], [2.9, 2, 1], [3.3, 0.3]], lf, P, { steps: 18 }), { tone: "hi" }) + `</g>`,
    [record(A.solid(lf, [[0, 0.2], [1, 2, 1], [2.1, 2.5, 1], [2.9, 2, 1], [3.3, 0.3]], { name: "irq.dome" }))], { bias: 0.4 });
  labelText(vtext(IRQ.x + 8, IRQ.y + 3.5, 45, "中断灯", 5.8, "mid")
    + vtext(IRQ.x + 8, IRQ.y + 3.5, 39.2, "事件必伴随中断", 4.6, "lo"));
  for (let i = 0; i < LEVERS.length; i++) {
    const x = LEVERS[i];
    cyl(`lever${i}.seat`, x, DESK.y + DESK.d - 16, 2.6, 35, 2, { tone: "lo" }, { steps: 16 });
    put(`lever${i}.knob`, [x, DESK.y + DESK.d - 16, 39.5], `<g data-part="lever${i}">` +
      S(k.cylinder(x, DESK.y + DESK.d - 16, 1.6, 37, 3.4, P, 16, 0.25), { tone: "hi", lit: i === 0 })
      + Ln(k.knurl(x, DESK.y + DESK.d - 16, 1.6, 37, 40.4, 14, P), { tone: "lo" }) + `</g>`,
      [record(A.cylinder(x, DESK.y + DESK.d - 16, 1.6, 37, 3.4, { name: `lever${i}.knob` }, 16))], { bias: 0.2 });
  }
  faceText(vtext(LEVERS[0] - 4, DESK.y + DESK.d - 12.5, 39.4, "门铃", 5, "lo")
    + vtext(LEVERS[1] - 4, DESK.y + DESK.d - 12.5, 39.4, "Reset EP", 4.6, "lo"));
  // 台前铭牌：xHCI 驱动——板留实体序（bias 0：audit 判 host.top 屏幕更近，铭牌先画），文字入 labels 层
  const mp = { x: -210, y: -5.8, w: 88, d: 1.6, r: 0.6 };
  put("desk.title", [mp.x + mp.w / 2, DESK.y + DESK.d + 1.4, 22],
    S(k.slabOf(mp, 12, 20, P, 2, 0.3), { tone: "hi", crease: "none" }),
    [record(A.slab(mp, 12, 20, { name: "desk.title" }, 2))], { bias: 0 });
  labelText(vtext(mp.x + mp.w - 4, mp.y + mp.d + 0.05, 22.1, "xHCI 驱动", 9, "hi", "end")
    + vtext(mp.x + mp.w - 4, mp.y + mp.d + 0.05, 14.1, "规范称 system software", 6, "mid", "end"));
}

// ================= 中断拉线（冲压位 → 台后沿空中 → 台右外侧下行 → 横越台前 → 驱动台中断灯） =================
{
  const route = G.fillet([
    [STAMP.x + 4, STAMP.y + STAMP.d + 2, TOP + 30], [-30, -146, TOP + 34], [40, -154, TOP + 34],
    [122, -154, TOP + 32], [135, -140, TOP + 30], [135, -16, TOP + 24], [60, -2, TOP + 22], [-90, 0, TOP + 21], [-140, -8, TOP + 19.6], [-176, -24, TOP + 19.4], [-176, -38, TOP + 19.6], [-172, -40.2, TOP + 19.4], [-172, -40.2, TOP + 14.3],
  ], 3.2, 7, { P, tube: 0.55 });
  R.route("wire.irq", route, 0.55, { piece: "bench", limp: true, tips: [null, null], ends: [false, false] });
  tubePieces(route, 0.55, P, { maxLength: 20 }).forEach((piece, index) => {
    put(`wire.irq:${index}`, piece.mid, tubeSvg(piece, { tone: "lo" }), [A.tube(piece.points, piece.radii)], { bias: 0.05, route: "wire.irq", chunk: index });
  });
  cyl("wire.irq.term", -172, IRQ.y - 6.2, 0.9, 35.1, 4.6, { tone: "mid" }, { steps: 12, bevel: 0.2, bias: 0.08,
    extra: Ln(k.ring(-172, IRQ.y - 6.2, 0.5, 39.8, P, 12), { tone: "lo" }) + Dots([at([-172, IRQ.y - 6.2, 39.8])], { size: 0.4, tone: "hi" }) });
}

// ================= 事件环轨道（主机台前底板） =================
{
  slab("evr.bed", { x: EVR.x, y: EVR.y, w: EVR.w, d: EVR.d, r: 2 }, PLATE_H, 3, { tone: "lo" }, { steps: 3 });
  for (const yy of [EVR.y + 8, EVR.y + EVR.d - 12]) {
    const i = yy === EVR.y + 8 ? 0 : 1;
    slab(`evr.rail${i}`, { x: EVR.x + 4, y: yy, w: EVR.w - 8, d: 4, r: 1 }, PLATE_H + 3, 3.4, { tone: "mid" }, { steps: 3, bevel: 0.3 });
  }
  slab("evr.stopL", { x: EVR.x - 2, y: EVR.y + 6, w: 5, d: EVR.d - 12, r: 1 }, PLATE_H + 3, 7, { tone: "lo" }, { steps: 2 });
  faceText(FT(k.topMatrix([EVR.x + 6, EVR.y + EVR.d + 2.5], PLATE_H + 3.1, P, "x"), "事件环轨道 · Transfer Event 排队（图例小注：实为环形，本台取一段示意）", 5.2, "lo"));
  // 三张事件卡位（live 控制；静态位=display none，槽位刻线闭合）
  let ghost = "";
  for (const x of EV_X) {
    ghost += Ln(k.pathOf([
      [x + 1.2, EVR.y + EVR.d - 12.6, PLATE_H + 6.4], [x + EV_W - 1.2, EVR.y + EVR.d - 12.6, PLATE_H + 6.4],
      [x + EV_W - 1.2, EVR.y + EVR.d - 12.6, PLATE_H + 6.4 + 20], [x + 1.2, EVR.y + EVR.d - 12.6, PLATE_H + 6.4 + 20],
    ].map((p) => at(p)), true), { tone: "mid" });
  }
  faceText(ghost);
  for (let i = 0; i < EV_DEFS.length; i++) {
    const def = EV_DEFS[i], x = EV_X[i];
    put(`ev.${def.key}`, [x + EV_W / 2, EVR.y + EVR.d - 12, PLATE_H + 6.4 + 13],
      `<g data-ev="${def.key}" style="display:none">` + geo.evCardSvg(x, EVR.y + EVR.d - 12.4, def) + `</g>`,
      [record(A.slab({ x, y: EVR.y + EVR.d - 12.4, w: EV_W, d: 2.6, r: 0.7 }, PLATE_H + 6.4, 20, { name: `ev.${def.key}` }, 2))],
      { bias: 0.35 });
  }
  // ERDP 指针卡（贴轨道右端；立牌底延到轨道床顶支撑）
  put("evr.erdp", [EVR.x + EVR.w - 12, EVR.y + 26, PLATE_H + 8],
    `<g data-part="erdp">${geo.erdpSvg()}</g>`,
    [record(A.slab({ x: EVR.x + EVR.w - 20, y: EVR.y + 26, w: 16, d: 8, r: 1 }, PLATE_H + 3, 13.4, { name: "evr.erdp" }, 2))], { bias: 0.3 });
  // 冲压出卡飞行动画组（独立深度项：默认隐藏，live 每帧重建内容；home 位姿=出卡口上方）
  put("ev.fly", [STAMP.x - 4, STAMP.y + 20, TOP + 20], `<g data-part="evfly" style="display:none"></g>`,
    [record(A.slab({ x: STAMP.x - 12, y: STAMP.y + 12, w: EV_W, d: 2.6, r: 0.7 }, TOP + 18, 20, { name: "ev.fly" }, 2))], { bias: 0.3 });
}

// ================= 设备试验盒（右前） =================
{
  slab("dev.box", DEV, PLATE_H, 24, { tone: "mid" }, { steps: 4, bevel: 0.7 });
  slab("dev.lid", { x: DEV.x - 2, y: DEV.y - 2, w: DEV.w + 4, d: DEV.d + 4, r: 2 }, PLATE_H + 24, 2.6, { tone: "mid" },
    { steps: 4, bevel: 0.4, extra: screwDots(DEV, 4, PLATE_H + 26.6) });
  // 收件口（盒顶朝上，接导轨末端）：口座凸出盒顶
  const portF = G.frameOf([DEV.x + DEV.w / 2 - 14, DEV.y + 8, PLATE_H + 26.7], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  put("dev.port", [DEV.x + DEV.w / 2 - 14, DEV.y + 8, PLATE_H + 28],
    S(G.disc(0, 2, 6, portF, P, { steps: 22, bevel: 0.25 }), { tone: "lo" })
    + Ln(G.circleOf(portF, 2, 6, P, 22), { tone: "lo" }),
    [record(A.disc(portF, 0, 2, 6, { name: "dev.port" }))], { bias: 0.3 });
  faceText(FT(k.topMatrix([DEV.x + DEV.w / 2 - 22, DEV.y + 14], PLATE_H + 26.7, P, "x"), "收件口", 5.4, "lo"));
  // 设备状态灯（盒顶中段）：就绪/STALL
  const lx = DEV.x + DEV.w / 2 + 12, ly = DEV.y + 40;
  const seatF2 = G.frameOf([lx, ly, PLATE_H + 26.6], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  put("dev.lamp.seat", [lx, ly, PLATE_H + 27], S(G.disc(0, 2.2, 4.2, seatF2, P, { steps: 20, bevel: 0.25 }), { tone: "lo" }),
    [record(A.disc(seatF2, 0, 2.2, 4.2, { name: "dev.lamp.seat" }))], { bias: 0.3 });
  const lf2 = G.frameOf([lx, ly, PLATE_H + 28.4], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  put("dev.lamp.dome", [lx, ly, PLATE_H + 30],
    `<g data-part="devlamp" class="lamp stall">` + S(G.solidOf([[0, 0.2], [1.1, 2, 1], [2.2, 2.4, 1], [3, 2, 1], [3.4, 0.3]], lf2, P, { steps: 18 }), { tone: "hi" }) + `</g>`,
    [record(A.solid(lf2, [[0, 0.2], [1.1, 2, 1], [2.2, 2.4, 1], [3, 2, 1], [3.4, 0.3]], { name: "dev.lamp.dome" }))], { bias: 0.4 });
  labelText(FT(k.topMatrix([lx - 8, ly - 7], PLATE_H + 26.7, P, "x"), "状态灯", 5.4, "lo"));
  // 待发数据票据列（盒顶）：三张
  faceText(`<g data-part="devtickets">${geo.devTicketsSvg(3)}</g>`);
  // 盒前铭牌（文字入 labels 层）
  labelText(vtext(DEV.x + 3, DEV.y + DEV.d + 0.05, PLATE_H + 17, "设备 · 数据面对端", 6.6, "dev")
    + vtext(DEV.x + 3, DEV.y + DEV.d + 0.05, PLATE_H + 9.4, "只见 USB 包与握手", 5.4, "mid")
    + vtext(DEV.x + 3, DEV.y + DEV.d + 0.05, PLATE_H + 3.4, "环/TRB/事件对设备不可见", 4.6, "lo"));
}

// ================= 注记牌（等时例外 / 错误必出事件） =================
{
  slab("note.iso", NOTE_ISO, PLATE_H - 0.2, 30, { tone: "lo" }, { steps: 2 });
  labelText(
    vtext(NOTE_ISO.x + 3, NOTE_ISO.y + 0.05, PLATE_H + 23, "等时端点例外", 7.2, "hi")
    + vtext(NOTE_ISO.x + 3, NOTE_ISO.y + 0.05, PLATE_H + 16.4, "无握手 · 从不停机", 5.4, "mid")
    + vtext(NOTE_ISO.x + 3, NOTE_ISO.y + 0.05, PLATE_H + 10.6, "错误只出事件 继续下一 ESIT", 4.6, "lo")
    + vtext(NOTE_ISO.x + 3, NOTE_ISO.y + 0.05, PLATE_H + 5, "（p176 · p183–186）", 4.4, "lo"));
  slab("note.err", NOTE_ERR, PLATE_H - 0.2, 30, { tone: "lo" }, { steps: 2 });
  labelText(
    vtext(NOTE_ERR.x + 3, NOTE_ERR.y + 0.05, PLATE_H + 23, "错误必出事件", 7.2, "hi")
    + vtext(NOTE_ERR.x + 3, NOTE_ERR.y + 0.05, PLATE_H + 16.4, "无视 IOC/ISP 标志", 5.4, "mid")
    + vtext(NOTE_ERR.x + 3, NOTE_ERR.y + 0.05, PLATE_H + 10.6, "CC 指明错误 · 端点 Halted", 4.6, "lo")
    + vtext(NOTE_ERR.x + 3, NOTE_ERR.y + 0.05, PLATE_H + 5, "（p175–176）", 4.4, "lo"));
}

// ================= settle + assemble =================
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
// labels 层插入点：铭牌文字的已知遮挡者最靠后一个之后（台身/台面/门架梁/设备盒全家/
// 两块铭牌板/轨道床——labels 文字组必须在自家板与邻近大实体之后、actors 之前）
const LABEL_AFTER = ["host.body", "host.top", "desk.top", "gate.beam", "dev.box", "dev.lid", "dev.port", "dev.lamp.seat", "dev.lamp.dome", "desk.title", "host.title", "evr.bed"];
let labelCut = 0;
R.items.forEach((it, i) => { if (LABEL_AFTER.includes(it.name)) labelCut = Math.max(labelCut, i + 1); });
const itemG = (it) => `<g class="it" data-name="${it.name}"${it.attrs ?? ""}>${it.svg}</g>`;
const seq = R.items.map(itemG);
seq.splice(labelCut, 0, `<g class="fb-labels">${labels.join("")}</g>`);
const svg = k.figureSvg({
  width: W, height: H,
  label: "TRB 处理台：左列六张 TRB 卡排在传输环卡轨上，取卡滑车逐卡验 Cycle 位，执行滑车沿右侧数据导轨在设备收件口与内存储物柜之间搬数据票据；台左后是 Transfer Event 冲压位——按结局冲出事件回执卡落到台前的事件环轨道，中断拉线牵亮驱动台的中断灯；台前右是 HALT 大闸，错误时落下锁停卡轨。",
  body: [...back, `<g class="fb-stage">${seq.join("")}</g>`, ...overlays].join(""),
});

// ================= figure CSS =================
const CSS = `
.fb-stage { --lamp-glow: ${THEME === "light" ? "#d98428" : "#ffb45e"}; --lamp-ink: ${THEME === "light" ? "#c96a12" : "#ffd9a0"};
  --stall-glow: ${THEME === "light" ? "#c23a3a" : "#ff6b5e"}; --stall-ink: ${THEME === "light" ? "#a92626" : "#ffc9c2"}; }
.fb-stage .lamp path { fill: var(--anatomy-shade-2); transition: fill 300ms; }
.fb-stage .lamp.on path { fill: var(--lamp-ink); }
.fb-stage .lamp.on { filter: drop-shadow(0 0 8px var(--lamp-glow)) drop-shadow(0 0 3px var(--lamp-glow)); }
.fb-stage .lamp.stall.on path { fill: var(--stall-ink); }
.fb-stage .lamp.stall.on { filter: drop-shadow(0 0 8px var(--stall-glow)) drop-shadow(0 0 3px var(--stall-glow)); }
@media (prefers-reduced-motion: reduce) { .fb-stage .lamp { animation: none; } }
.fb-stage .lamp.on.blink { animation: fb-blink 1.4s ease-in-out infinite; }
@keyframes fb-blink { 0%, 100% { filter: drop-shadow(0 0 3px var(--lamp-glow)); } 50% { filter: drop-shadow(0 0 8px var(--lamp-glow)); } }
.fb-stage .trb-done path { opacity: .55; }
.fb-stage .trb-done text { opacity: .55; }
.fb-stage [data-trb], .fb-stage [data-ev] { transition: opacity 400ms ease; }
.fb-dev { fill: ${THEME === "light" ? "#2f7a3d" : "#86bd7a"}; }
.fb-drv { fill: ${THEME === "light" ? "#2d5fb3" : "#7c9ff0"}; }
.fb-hc { fill: ${THEME === "light" ? "#8a5f14" : "#d9a860"}; }
`;

// ================= 泳道静态图（页面级平面 SVG：三列时间线，动态行距） =================
function laneSvg() {
  const LW = 1280;
  const LANES = { sw: 230, hc: 650, dev: 1070 };
  const BOXW = 330;
  const rows = [
    { n: 1, pg: "p187", sw: ["组 TD 写入传输环", "末 TRB 置 IOC=1"], hc: ["xHC 按 Dequeue Pointer 取 TRB", "验 Cycle 位"], ev: { from: "sw", to: "hc", lines: ["门铃启动取环（§4.7）"] } },
    { n: 2, pg: "p172–173", hc: ["按 Max Packet Size 切包执行", "TD Transfer Size＝Σ各 TRB Length"], dev: ["IN 端点：发包递数据"], ev: { from: "dev", to: "hc", lines: ["USB 包（数据面）"] } },
    { n: 3, pg: "p175", sw: ["IOC=1 → TD 完成事件", "回收 TD 占用的环空间"], hc: ["分支① 正常完成", "CC=Success · Length=已传字节"], ev: { from: "hc", to: "sw", dashed: true, lines: ["Transfer Event 写入事件环"] } },
    { n: 4, pg: "p170", sw: ["中断唤醒（可选：轮询）"], hc: ["事件生成必伴随对宿主中断", "突发由中断节流吸收（§4.17）"], ev: { from: "hc", to: "sw", dashed: true, lines: ["中断"] } },
    { n: 5, pg: "p171", sw: ["读事件环 按 CC 分派", "TRB Pointer＝追平 Dequeue 副本"], hc: ["事件卡含 Device ID / EP ID", "与源 TRB 地址"], ev: { from: "hc", to: "sw", dashed: true, lines: ["事件位置信息"] } },
    { n: 6, pg: "p171", hc: ["分支② 短包：收到＜期望", "ISP/IOC 置位的 TRB 才出事件", "CC=Short Packet · Length=残余"], dev: ["发的包短于期望"], ev: { from: "dev", to: "hc", lines: ["短包"] }, note: ["短包后 xHC 自动推进到下一 TD 首 TRB（p171）", "BEI=1 可压掉短包事件的中断（p187）"] },
    { n: 7, pg: "p175–176", sw: ["恢复：Reset Endpoint 命令", "清设备侧 halt → 写门铃重启"], hc: ["分支③ 错误：无视标志必出事件", "CC=Stall Error · 端点 Halted", "停在出错 TRB · Set TR Dequeue Ptr 推进"], dev: ["回 STALL（USB2 PID", "/ USB3 LMP）"], ev: { from: "dev", to: "hc", lines: ["STALL"] }, note: ["恢复两步顺序强制：Reset EP 成功且 halt 清除后才准写门铃（p177 Note）"] },
    { n: 8, pg: "p176 · p183–186", hc: ["等时端点：无握手从不停机", "Missed Service / Ring Overrun /", "Underrun 都只出事件"], dev: ["等时端点不出 STALL"], note: ["等时错误后继续下一 ESIT（§4.10.2.8 / §4.10.3）"] },
  ];
  // 动态布局：每行高 = max 框高 + 箭头带（26）+ 间距；注记框入行间
  let y = 128;
  const laid = rows.map((r) => {
    const hs = ["sw", "hc", "dev"].filter((l) => r[l]).map((l) => 26 + r[l].length * 21);
    const boxH = Math.max(...hs);
    const noteH = r.note ? 22 + r.note.length * 17 + 10 : 0;
    const at = { ...r, y, boxH };
    y += boxH / 2 + 30 + Math.max(noteH, 26) + boxH / 2 + 8;
    return at;
  });
  const LH = y + 18;
  let g = "";
  for (const [id, x] of Object.entries(LANES)) {
    g += `<rect x="${x - 150}" y="36" width="300" height="52" rx="8" class="lane-bg lane-edge c-${id}"/>`
      + `<text x="${x}" y="61" class="lane-name c-${id}" text-anchor="middle">${id === "sw" ? "xHCI 驱动" : id === "hc" ? "xHC 控制器" : "设备"}</text>`
      + `<text x="${x}" y="80" class="lane-sub" text-anchor="middle">${id === "sw" ? "system software（系统软件）" : id === "hc" ? "the xHC" : "USB device"}</text>`
      + `<line x1="${x}" y1="88" x2="${x}" y2="${LH - 14}" class="lane-life"/>`;
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
      const nw = 880, nh = 22 + r.note.length * 17;
      const ny = cy + r.boxH / 2 + 34;
      g += `<rect x="${LW / 2 - nw / 2}" y="${ny}" width="${nw}" height="${nh}" rx="6" class="notebox"/>`;
      r.note.forEach((ln, j) => { g += `<text x="${LW / 2}" y="${ny + 16 + j * 17}" class="note-t" text-anchor="middle">${ln}</text>`; });
    }
  });
  return `<svg id="lane-svg" viewBox="0 0 ${LW} ${LH}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="§4.10 TRB 处理三方泳道：取环执行、正常/短包/错误三分支、事件回环与等时例外，共 8 步">
<defs><marker id="arrh" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="arr-head"/></marker></defs>
<style>
.lane-bg { fill: var(--anatomy-paper); }
.lane-edge { stroke-width: 2.5; fill: var(--anatomy-paper); }
.c-sw { stroke: ${THEME === "light" ? "#2d5fb3" : "#7c9ff0"}; }
.c-hc { stroke: ${THEME === "light" ? "#8a5f14" : "#d9a860"}; }
.c-dev { stroke: ${THEME === "light" ? "#2f7a3d" : "#86bd7a"}; }
.lane-name { font: 700 21px var(--anatomy-ui, sans-serif); }
.lane-name.c-sw { fill: ${THEME === "light" ? "#2d5fb3" : "#7c9ff0"}; }
.lane-name.c-hc { fill: ${THEME === "light" ? "#8a5f14" : "#d9a860"}; }
.lane-name.c-dev { fill: ${THEME === "light" ? "#2f7a3d" : "#86bd7a"}; }
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
  <span class="nav-title">§4.10 主机控制器 TRB 处理</span>
  <span class="nav-sib">
    <a href="../4.9-trb-ring/index.html" title="§4.9 TRB 环">上一节 §4.9</a>
    <a href="../4.11-trbs/index.html" title="§4.11 TRB（传输请求块）">下一节 §4.11</a>
  </span>
</nav>
<p class="spec-ref">xHCI 1.2b §4.10 Host Controller TRB Handling · p170–188 · §4.10.1 传输 TRB / §4.10.2 错误 / §4.10.3 事件 / §4.10.4 IOC 标志（页码已机核，见 EVIDENCE.md）</p>`;

const proseHtml = `
<section class="spec-block">
  <h2>规范要义</h2>
  <p>传输执行是 xHC 的日常主业务：全配置 xHC 最多 255 台设备 × 每台 31 个端点 × 30 个端点可开 64K Streams——最坏约 <b>5 亿条传输环</b>，xHC 必须高效上报几百上千条环的完成状态，载体就是事件环上的 <b>Transfer Event TRB</b>。xHC 在一条 Transfer TRB 关联的传输完成时，评估完成状态与 TRB 标志，决定要不要为它生成事件：<b>IOC=1 就生成事件</b>，且事件一生成必伴随对宿主的中断；事件的 Completion Code 与 Length 字段如实回传源 TRB 的完成状态。下面这台「TRB 处理台」把这条主线开成一镜：取卡验 Cycle → 沿数据导轨搬票据 → 按结局冲出事件回执卡。（本页「xHCI 驱动」即规范原文所称 system software（系统软件）。）</p>
  <p>三种结局、三种事件策略：<b>正常完成</b>只有 IOC=1 的 TRB 出事件（惯例是 TD 末 TRB 一枚，即 TD 完成事件——它同时宣告 TD 占用的环空间可回收）；<b>短包</b>（实际收到的字节少于 TRB 期望）只有在 ISP 或 IOC 置位的 TRB 上才出事件，Completion Code=Short Packet、Length=未写入数据缓冲的残余字节数，且 xHC 自动推进到下一 TD；<b>错误</b>无视 IOC/ISP 一律出事件，需停机的错误把端点打到 Halted、xHC 停在出错 TRB 上，恢复两步（Reset Endpoint 命令 + 软件清设备侧 halt）都成功后才准写门铃重启环。<b>等时端点是例外族</b>：没有握手，从不停机——错误、未服务（Missed Service Error）、环空转（Ring Overrun/Underrun）都只出事件，随后继续下一 ESIT。</p>
  <p>§4.10.4 的通用规则一句话：IOC 置位就生成事件；想知道 TD 何时完成，就在 TD 末 TRB 置 IOC。短包事件可用 BEI 压掉中断；软件也可借 IOC 做及时的 Dequeue Pointer 更新，缩短错误恢复时间。标志组合逐条语义与错误分类见下方两张表格卡。</p>
</section>`;

const quoteHtml = `
<section class="spec-block">
  <h2>原文对照</h2>
  <blockquote><p class="q">“If upon transfer completion of a TRB the Interrupt On Completion (IOC) flag is set, the xHC shall generate a Transfer Event TRB.”</p><p class="cite">(xHCI 1.2b §4.10.1 p170)</p><p class="zh">IOC=1 是「必出事件」的最强信号——事件还必伴随对宿主的中断（同页 Note）。</p></blockquote>
  <blockquote><p class="q">“A Short Packet will trigger the generation of a Transfer Event TRB on the Event Ring if the Interrupt-on-Short (ISP) or Interrupt On Completion (IOC) flags are set in the TRB that the Short Packet was detected on.”</p><p class="cite">(xHCI 1.2b §4.10.1 p171)</p><p class="zh">短包不必然出事件——ISP/IOC 置位的 TRB 上才出；Length=残余字节数。</p></blockquote>
  <blockquote><p class="q">“The detection of an error during a USB transfer shall always generate a Transfer Event, irrespective of whether the Interrupt-on-Short Packet (ISP) or Interrupt On Completion (IOC) flags are set in the Transfer TRB.”</p><p class="cite">(xHCI 1.2b §4.10.2 p175)</p><p class="zh">错误是唯一无视标志组合的事件源——Completion Code 指明错误条件。</p></blockquote>
  <blockquote><p class="q">“All Transfer Ring error conditions force the state of the associated endpoint to Halted and require system software intervention to recover.”</p><p class="cite">(xHCI 1.2b §4.10.2 p176)</p><p class="zh">传输环错误一律停机等软件——例外是等时端点（同页：无握手、不停机）。</p></blockquote>
  <blockquote><p class="q">“The general rule for how the xHC should handle the IOC flag is simple: if the IOC flag is set, then generate an event.”</p><p class="cite">(xHCI 1.2b §4.10.4 p187)</p><p class="zh">IOC 语义的总纲：置位即出事件——例外（事件环满、PAE=0）见下方组合表。</p></blockquote>
</section>`;

const laneCard = k.plateHtml({
  fig: "流程",
  title: "§4.10 一条传输 TRB 的主线与三分支：三方泳道",
  hint: "放大看小框文字 · 全屏后滚轮浏览",
  readout: "8 步 · p170–p188",
  keys: [
    { mark: "raised", label: "实线箭头＝命令/数据流（含 USB 包与 STALL）；虚线＝事件回执流与中断（p170–176）" },
    { mark: "dim", label: "虚线注记框＝机制补充：短包自动推进/BEI、恢复两步顺序、等时例外（p171/177/183–186）" },
    { mark: "edge", label: "设备泳道＝数据面对端：只见 USB 包与握手，环/TRB/事件对设备不可见" },
  ],
  caption: "取卡执行是主线，三种结局分三支：正常看 IOC、短包看 ISP/IOC、错误必出事件且停机；等时端点另立例外族。",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="§4.10 TRB 处理三方泳道流程图，八步，可放大平移。">${laneSvg()}<span role="status" aria-live="polite" data-status></span></div>` + zoomBarHtml("放大看框内文字 · 全屏后滚轮浏览"),
});

const machineCtlHtml = `<div class="fig-ctl" role="toolbar" aria-label="动画控制条">
  <button type="button" data-act="prev">◀ 上一帧</button>
  <button type="button" data-act="next">下一帧 ▶</button>
  <button type="button" data-act="tour" aria-pressed="false">自动巡游</button>
  <button type="button" data-act="reset">⟲ 复位</button>
  <span class="fig-ctl-hint">键盘：空格/点击步进 · ← → 换帧 · Home 回全景 · A 巡游</span>
</div>`;

const figCard = k.plateHtml({
  fig: "§4.10 动画",
  title: "TRB 处理台：取卡 → 执行 → 三分支 → 事件回环",
  hint: "控制条步进/巡游 · 点击或空格步进 · ← → 换帧 · Home 回全景 · A 巡游",
  readout: "帧 1/10 · EP Running · 事件 0 · 中断 0",
  keys: [
    { mark: "lit", label: "冲压出的回执卡＝Transfer Event TRB：卡面 CC/Length 如实回传源 TRB 完成状态（p170–171）" },
    { mark: "raised", label: "标志灯排 IOC/ISP/BEI：置位才要求事件（短包）；错误无视三灯必出卡（p171/175）" },
    { mark: "edge", label: "HALT 大闸落下＝端点 Halted、xHC 停在出错 TRB 上（p175–176）；恢复两步后写门铃重启" },
  ],
  caption: "处理台的铁律：IOC 灯亮必出卡；短包看 ISP/IOC；错误无视灯必出卡且落闸停机——等时端点永不落闸。",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="TRB 处理台，十帧：全景、取卡验 Cycle、执行搬票据、末卡完成出卡、事件入环中断、驱动分派、短包分支、错误停机、恢复两步、等时注记。点击或空格步进。">${svg}<span role="status" aria-live="polite" data-status></span></div>` + machineCtlHtml + zoomBarHtml(),
});

const tablesHtml = `
<div class="xsp-card"><h2>IOC/ISP/BEI 标志组合语义（§4.10.4 p187–188 · 按条文归纳）</h2>
<p>§4.10 本身没有位组合表（本节仅有的原文表格=Table 4-5 p178、Table 4-6 p183，见下一张卡）——下表逐条归纳 §4.10.1/§4.10.4 条文，每行附页码。</p>
<table class="xsp-tb">
<tr><th>标志组合</th><th>xHC 行为</th><th>页</th></tr>
<tr><td class="mono">IOC=1（任意 TRB）</td><td>该 TRB 完成即生成 Transfer Event——通用规则；例外=事件环满等</td><td class="mono">p187</td></tr>
<tr><td class="mono">IOC=1 在 TD 末 TRB</td><td>TD 完成事件：告知 TD 全部完成，占用的传输环空间可回收</td><td class="mono">p187</td></tr>
<tr><td class="mono">ISP=1 且 IOC=0（末 TRB）</td><td>收到短包才出事件（CC=Short Packet）；缓冲被收满则不出事件</td><td class="mono">p187</td></tr>
<tr><td class="mono">同一 TRB 同时置 ISP+IOC</td><td>ISP 冗余（但允许）——IOC 恒生成事件</td><td class="mono">p175 Note</td></tr>
<tr><td class="mono">BEI=1</td><td>Short Packet 事件不产生中断</td><td class="mono">p187</td></tr>
<tr><td class="mono">Event Data TRB IOC=1 · PAE=0</td><td>仅第一个 Event Data TRB 出事件；推进途中后续 Event Data TRB 的 IOC 被忽略</td><td class="mono">p188 Note</td></tr>
<tr><td class="mono">Link TRB IOC=1</td><td>出事件：CC=Success、TRB Transfer Count=0（TD 内所有 Link TRB 都被解析，p173）</td><td class="mono">p175</td></tr>
<tr><td class="mono">出错（任意标志组合）</td><td>必出事件：CC=错误码——错误不理会 IOC/ISP</td><td class="mono">p175</td></tr>
</table></div>
<div class="xsp-card"><h2>§4.10.2 错误分类要点（§4.10.2.1–4.10.2.8 · Table 4-5 p178 · Table 4-6 p183）</h2>
<table class="xsp-tb">
<tr><th>错误</th><th>触发</th><th>端点后果 / 恢复</th><th>页</th></tr>
<tr><td><b>Stall Error</b></td><td>设备回 STALL（USB2 PID / USB3 LMP）——function 不能收发或控制请求不支持；xHC 自己永不回 STALL</td><td>EP State→Halted；两步恢复：Reset Endpoint 命令 + 软件清设备侧 halt</td><td class="mono">p176</td></tr>
<tr><td><b>TRB Error</b></td><td>TRB 字段越界或格式错误——纯驱动侧错误</td><td>应迁移到 Error 态（§4.8.3）；实现也可直接 HCE</td><td class="mono">p177</td></tr>
<tr><td><b>USB Transaction Error</b></td><td>事务失败：CRC/DPP 错、Timeout、Bad PID（Table 4-5）</td><td>Isoch 立即报错不停机；其余 CErr 次重试后放弃并 Halted</td><td class="mono">p178</td></tr>
<tr><td><b>Babble Detected Error</b></td><td>设备发数超预期（TD/Frame/Packet Babble）</td><td>CC=Babble Detected Error+停机；Frame Babble 另禁根端口；不计 CErr</td><td class="mono">p179–180</td></tr>
<tr><td><b>Data Buffer Error</b></td><td>收超限/发欠载——主机内存访问延迟所致，不属事务错误</td><td>不计 CErr；非等时 IN 不回握手（逼重发）；OUT 故意损坏包尾</td><td class="mono">p180</td></tr>
<tr><td><b>Host System Error (HSE)</b></td><td>灾难性系统错误（PCI 奇偶错/Master Abort/Target Abort）</td><td>xHC 清 R/S 停止执行；双方认定系统完整性已失——可恢复的内部错误走 HCE（§4.24.1）</td><td class="mono">p181–182</td></tr>
<tr><td><b>等时端点通则</b></td><td>无握手——错误只以 Completion Code 报告（§4.10.2.8）</td><td>从不停机：推进下一 ESIT/TD；Missed Service Error / Ring Overrun / Ring Underrun 亦然</td><td class="mono">p176 · p183–186</td></tr>
</table>
<p>Table 4-5（p178 逐行转写）：USB2 CRC 或 USB3 DPP 错→重试 CErr→USB Transaction；Timeout→CErr（USB2）/N/A（USB3）→USB Transaction；USB2 Bad PID→CErr→USB Transaction；Babble→N/A→Babble Detected Error；Buffer Error→N/A→Data Buffer Error。</p>
<p>Table 4-6（p183 逐行转写，CErr 管理）：Transaction Error→减计数；Stalled / Data Buffer Error / Babble Detected→不减（停机类自动终止重试）；No Error→重置回 CErr（起始值 00b 除外）。另：Slot Context Speed=FS/LS 时禁编 CErr=0——组合未定义（p183 Note）。</p></div>`;

const linksHtml = `
<section class="spec-block">
  <h2>相关</h2>
  <ul class="links">
    <li><a href="../4.9-trb-ring/index.html">§4.9 TRB 环</a>——传输环/Cycle/链接 TRB 的取环机制（本台卡轨的环语义）</li>
    <li><a href="../4.7-doorbells/index.html">§4.7 门铃</a>——端点门铃启动取 TRB；停机恢复的最后一步也是写门铃</li>
    <li><a href="../4.8-endpoint/index.html">§4.8 端点</a>——EP State（Running/Stopped/Halted/Error）与 CErr 字段</li>
    <li><a href="../4.11-trbs/index.html">§4.11 TRB（传输请求块）</a>——Transfer Event TRB / Event Data TRB / PAE 位定义</li>
    <li><a href="../4.17-interrupters/index.html">§4.17 中断器</a>——中断节流与事件环到向量的映射</li>
    <li><a href="../../../xhc-machines/fig3-event-ring/index.html">四机课 Fig3 回执登记机</a>——事件环的生产与消费</li>
    <li><a href="../../index.html">§4.11.4.7 Reset Endpoint 命令（待建）</a>——停机恢复第一步；<a href="../../index.html">§4.11.2.2 控制端点错误处理（待建）</a>——控制管道的恢复细则</li>
  </ul>
</section>`;

const footerHtml = `<footer class="spec-foot">判据：xHCI 1.2b（625472 Rev 1.2b）§4.10 p170–188 · 引文逐字核对，证据见 <a href="EVIDENCE.md">EVIDENCE.md</a> · 生成于 2026-11-04</footer>`;

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
.xsp-card { background: var(--anatomy-paper, #171f2a); border: 1px solid var(--anatomy-line-mid, #2a3444); border-radius: 8px; padding: 16px 22px; margin: 14px 6px; }
.xsp-card h2 { font-size: 18px; margin: 2px 0 8px; color: var(--anatomy-text); }
.xsp-card p { margin: 8px 0; line-height: 1.9; color: var(--anatomy-text); font-size: 16px; }
.xsp-card table.xsp-tb { width: 100%; border-collapse: collapse; margin: 10px 0 4px; }
.xsp-card table.xsp-tb th { font-size: 14px; color: var(--anatomy-muted); text-align: left; border-bottom: 1.5px solid var(--anatomy-line-mid, #456); padding: 5px 8px; }
.xsp-card table.xsp-tb td { font-size: 15px; color: var(--anatomy-text); border-bottom: 1px dashed var(--anatomy-line-lo, #334); padding: 6px 8px; vertical-align: top; }
.xsp-card table.xsp-tb td.mono { font-family: var(--anatomy-mono, monospace); font-size: 13px; }
</style>`;

const body = pageCss + navHtml + proseHtml + quoteHtml + `<div class="lane-wrap">` + laneCard + `</div>` + `<div class="fig-wrap">` + figCard + `</div>` + tablesHtml + footerHtml;

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
const latheScript = `const G = (() => {${latheSource}\nreturn { viewOf, scaleOf, frameAlong, frameOf, pointOf, disc, sphereOf, prismOf, circleOf, arcOf, ribsOf, dot3, add3, sub3, mul3, unit3, cross3, len3 };})();\n`;
const live = readFileSync(join(HERE, "live.mjs"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const script = kitScript() + latheScript + geoScript + live
  + zoomFor(0, ["#lane-svg .notebox"], "__zfsLane")
  + zoomFor(1, ['[data-name="ring.rail0"]', '[data-name="host.top"]'], "__zfs");

const page = k.pageHtml({ title: "§4.10 主机控制器 TRB 处理 · xHCI 规范对照学习", theme: THEME, body, script, width: 1500 });
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} items`, `scale ${KS.toFixed(3)}`);

A.auditOrExit(R, P, { allow: [["wire.irq", "wire.irq.term"]], crowd: [["wire.irq", "wire.irq.term"]] });

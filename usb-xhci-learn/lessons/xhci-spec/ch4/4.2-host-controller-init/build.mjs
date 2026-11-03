// §4.2 主机控制器初始化——anatomy Figure「启机配电台」+ 整页
// 判据：xHCI 1.2b（625472）§4.2 p68–70；画面断言逐条见 EVIDENCE.md
import { readFileSync, writeFileSync } from "node:fs";
import { zoomBarHtml, zoomFsCss, zoomFsScript } from "../../shared/zoomfs.mjs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "/Users/jason/.zcode/skills/anatomy/kit/iso-kit.mjs";
import * as G from "/Users/jason/.zcode/skills/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "/Users/jason/.zcode/skills/anatomy/kit/tube.mjs";
import * as A from "/Users/jason/.zcode/skills/anatomy/kit/audit.mjs";
import { kitScript } from "/Users/jason/.zcode/skills/anatomy/scripts/inline-kit.mjs";
import { makeLiveGeo } from "./geometry-live.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

// ================= camera =================
const W = 800, H = 560, AZ = 45, EL = 30;

// ================= world =================
// 底板 / 主机仓柜 / 卡笼 / 控件排 / R/S 闸刀 / 桁架 / 文书台 / 端口灯排 / 注记牌
const PLATE = { x: -205, y: -150, w: 370, d: 300, r: 9 };
const PLATE_H = 12, FOOT_H = 5;
const CNT = { x: -25, y: -142, w: 175, d: 120, r: 1.6 };   // 主机仓柜体 x -25..150, y -142..-22
const FACE = -22;                                            // 柜面（+y 朝观众）
const PANEL = { x: -21, y: -22, w: 167, d: 1.8, r: 1 };     // 贴柜面的深色仪表面板（底面 y=-22 恰贴柜面）
const CAB_Z = 12, CAB_TOP = 100;

// 卡笼：三条横轨 + 两行三列卡（28 宽 × 18 高，厚 3）
const RAIL_Y = -20.5;                                        // 轨面（卡背贴其前）
const CAGE_X = [-5, 33, 71];                                 // 列左缘
const CAGE_ROW_Z = [42, 18];                                 // 行底（行0=42..60，行1=18..36）
const CARD_W = 28, CARD_H = 18, CARD_T = 3;                  // 卡宽/高/厚
const RAILS_Z = [[62, 4], [38, 4], [14, 4]];                 // 轨 [z, 高]：上 62..66 / 中 38..42 / 下 14..18

// 控件排（柜面上部，z 72..96，六格）
const CELL_X = [-10, 16, 42, 68, 94, 120];                   // 格中心

// R/S 大闸刀（柜顶）
const RS = { base: { x: 58, y: -92, w: 80, d: 46, r: 2 }, hinge: [66, -69], contact: [130, -69], z: CAB_TOP };

// 桁架（双柱门架：柱在文书台前方底板，梁横跨台面与柜前）
const POSTS = [[-176, 2], [-64, 2]];
const BEAM = { x: -180, y: -4, w: 285, d: 12, r: 2 };        // y -4..8, z 77..83, x -180..105
const TROLLEY_HOME = -90;

// 文书台（xHCI 驱动操作位）
const DESK = { x: -195, y: -102, w: 92, d: 96, r: 1.6 };     // x -195..-103, y -102..-6
const MAG = { x: -190, y: -70, w: 34, d: 26 };               // 卡库
const LEVERS = [-130, -120, -110];                           // 拉杆排 x

// 端口灯排（台前下沿，设备区）
const BAR = { x: -44, y: 104, w: 200, d: 38, r: 2 };
const PORTS_X = [62, 92, 122, 148];                          // 4 灯：U2 U2 SS SS

// 注记牌（顺序自由）
const NOTE = { x: -196, y: 58, w: 78, d: 4, r: 0.8 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...k.boxCorners(CNT, CAB_Z, 0),
   [0, 0, 118], [-116, -16, 84], [BEAM.x + BEAM.w, BEAM.y, 84],
   [BAR.x + BAR.w, BAR.y + BAR.d, 30], [-196, 62, 46], ...POSTS.map(([x, y]) => [x, y, 14])],
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

// 卡定义（DATA 与几何共用；live 同源）
const CARD_DEFS = [
  { key: "dcbaap", col: 0, row: 0, name: "DCBAAP", sub: "64 位地址 → DCBAA", page: "p69" },
  { key: "crcr", col: 1, row: 0, name: "CRCR", sub: "命令环首 TRB 地址", page: "p69" },
  { key: "seg", col: 2, row: 0, name: "事件环段", sub: "Event Ring Segment", page: "p69" },
  { key: "erdp", col: 0, row: 1, name: "ERDP", sub: "首段起点地址", page: "p70" },
  { key: "erstba", col: 1, row: 1, name: "ERSTBA", sub: "段表基地址", page: "p70" },
  { key: "msix", col: 2, row: 1, name: "MSI-X 表", sub: "向量 0", page: "p69" },
];
const cardX = (col) => CAGE_X[col];
const cardZ = (row) => CAGE_ROW_Z[row];
const CARD_Y = -17; // 卡前面（刻画面）；卡背 y=-20 与轨前缘相接

// live 数据（先于动件几何）
const DATA = {
  P, KS, W, H,
  cardDefs: CARD_DEFS,
  cageX: CAGE_X, rowZ: CAGE_ROW_Z, cardY: CARD_Y, cardW: CARD_W, cardH: CARD_H, cardT: CARD_T,
  cellX: CELL_X, face: FACE, pf: PANEL.y + PANEL.d,
  mag: { x: MAG.x, y: MAG.y, w: MAG.w, d: MAG.d },
  trolleyHome: TROLLEY_HOME, beamY: BEAM.y + 6,
  rs: { hinge: RS.hinge, contact: RS.contact, z: RS.z },
  ports: PORTS_X,
  portY: 123, plateTop: PLATE_H, barTop: PLATE_H + 6,
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
{ // 标尺条 + 铭牌（柜前右段底板）
  const strip = { x: -195, y: 96, w: 158, d: 6.5, r: 1 };
  const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4.4, 5, strip.y + 0.8, PLATE_H + 0.6, [2, 3.6], P);
  slab("stand.ruler", strip, PLATE_H, 0.6, { tone: "lo", crease: "none" },
    { steps: 3, extra: Ln(t.minor, { tone: "lo" }) + Ln(t.major, { tone: "mid" }) });
  const lab = { x: -30, y: 80, w: 34, d: 12, r: 1.2 };
  slab("stand.label", lab, PLATE_H, 0.8, { tone: "lo", crease: "none" },
    { steps: 3, extra: Ln(k.planOutline(k.insetPlan(lab, 1.6), PLATE_H + 0.8, P, 3), { tone: "faint" })
      + Ln([20, 14, 17].map((w2, i) => k.lineOnTop([lab.x + 4, lab.y + 4 + i * 3.4], [lab.x + 4 + w2, lab.y + 4 + i * 3.4], PLATE_H + 0.8, P)).join(""), { tone: "lo", free: true })
      + Dots([[lab.x + lab.w - 2.8, lab.y + 2.8], [lab.x + lab.w - 2.8, lab.y + lab.d - 2.8]].map(([x, y]) => at([x, y, PLATE_H + 0.8])), { size: 0.45 }) });
}

// ================= 主机仓柜体 =================
{
  const seam = k.sideSeam(CNT, 66, P, 4);
  slab("cabinet.lower", CNT, CAB_Z, 54, { tone: "mid" },
    { steps: 4, bevel: 0.8, extra: Ln(k.corners(CNT, 7).map(([x, y]) => k.ring(x, y, 2, CAB_Z + 3, P, 14)).join(""), { tone: "lo" }) });
  slab("cabinet.upper", CNT, CAB_Z + 54, 32, { tone: "mid" },
    { steps: 4, bevel: 0.8, inner: Ln(seam, { tone: "faint" }) });
  // 柜顶盖 + 螺丝（盖沿略出柜身，顶面 z=100）
  slab("cabinet.lid", { x: CNT.x - 3, y: CNT.y - 3, w: CNT.w + 6, d: CNT.d + 6, r: 2 }, 98, 2, { tone: "mid" },
    { steps: 4, bevel: 0.5, extra: screwDots({ x: CNT.x - 1, y: CNT.y - 1, w: CNT.w + 2, d: CNT.d + 2 }, 8, 100) });
  // 侧面（+x）通风槽：闭合刻槽
  const vents = [74, 80, 86].map((z) => k.pathOf(
    [[CNT.x + CNT.w + 0.05, -100, z], [CNT.x + CNT.w + 0.05, -64, z], [CNT.x + CNT.w + 0.05, -64, z + 2.6], [CNT.x + CNT.w + 0.05, -100, z + 2.6]].map((p) => at(p)), true)).join("");
  faceText(Ln(vents, { tone: "faint" }));
  // 柜面仪表面板
  slab("panel.face", PANEL, 16, 80, { tone: "lo" },
    { steps: 4, extra: Ln(k.planOutline(k.insetPlan(PANEL, 1.4), 96, P, 3), { tone: "faint" })
      + screwDots(PANEL, 3, 96) });
}
// 柜铭牌（柜顶左部立牌）
{
  const mp = { x: -20, y: -40, w: 74, d: 5, r: 1 };
  slab("cabinet.title", mp, CAB_TOP, 8, { tone: "hi" },
    { steps: 2, extra: vtext(mp.x + 5, mp.y + 0.05, CAB_TOP + 5.6, "xHC 控制器", 6.4, "hi")
      + vtext(mp.x + 5, mp.y + 0.05, CAB_TOP + 1.8, "寄存器面板 · 根集线器在其内", 4.2, "mid") });
}

// ================= 卡笼（三轨 + 六卡位） =================
{
  for (let i = 0; i < RAILS_Z.length; i++) {
    const [z, h] = RAILS_Z[i];
    const rail = { x: -11, y: -20.2, w: 112, d: 6.5, r: 1.4 };
    slab(`cage.rail${i}`, rail, z, h, { tone: "mid" }, { steps: 3, bevel: 0.3 });
  }
  // 轨端挡块
  for (const ex of [-17, 103]) {
    slab(`cage.stop${ex}`, { x: ex, y: -20.2, w: 4, d: 6.5, r: 0.8 }, RAILS_Z[0][0], 4, { tone: "lo" });
    slab(`cage.stopb${ex}`, { x: ex, y: -20.2, w: 4, d: 6.5, r: 0.8 }, 16, 4, { tone: "lo" });
  }
}

// ---- 卡片（build 时六张落位卡 display:none，live 按帧点亮；飞行卡由 live 重建） ----
{
  // 空槽位浅框（未插卡时可见的槽位刻线，闭合线框无端点）
  let ghost = "";
  for (const def of CARD_DEFS) {
    const x = cardX(def.col), z = cardZ(def.row);
    ghost += Ln(k.pathOf([
      [x + 1.2, CARD_Y + 0.2, z + 1.2], [x + CARD_W - 1.2, CARD_Y + 0.2, z + 1.2],
      [x + CARD_W - 1.2, CARD_Y + 0.2, z + CARD_H - 1.2], [x + 1.2, CARD_Y + 0.2, z + CARD_H - 1.2],
    ].map((p) => at(p)), true), { tone: "mid" });
  }
  faceText(ghost);
  // 六张落位卡（live 控制 display；静态 svg 入审计）
  for (const def of CARD_DEFS) {
    const x = cardX(def.col), z = cardZ(def.row);
    put(`card.${def.key}`, [x + CARD_W / 2, -20, z + CARD_H / 2],
      `<g data-card="${def.key}" style="display:none">` + geo.cardSvg(x, CARD_Y, z, def) + `</g>`,
      [record(A.slab({ x, y: CARD_Y - CARD_T, w: CARD_W, d: CARD_T, r: 0.8 }, z, CARD_H, { name: `card.${def.key}` }, 2))],
      { bias: 0.35 });
  }
}

// ================= 控件排（柜面上部六格；基线 PF=面板前面） =================
const PF = PANEL.y + PANEL.d;   // -20.2
// 标签檐（控件下方水平薄板，topMatrix 刻格名——水平面文字不斜切）
{
  const apron = { x: -23, y: -20.2, w: 156, d: 7.4, r: 1 };
  slab("panel.apron", apron, 66, 4, { tone: "lo" },
    { steps: 3, extra: Ln(k.planOutline(k.insetPlan(apron, 1), 70, P, 3), { tone: "faint" }) + screwDots(apron, 2.5, 70) });
  const label = (x, text, size = 5, tone = "mid") => FT(k.topMatrix([x, -19.4], 70.1, P, "x"), text, size, tone, "middle");
  faceText(
    label(CELL_X[0], "USBSTS · CNR") + label(CELL_X[1], "CONFIG · MaxSlotsEn")
    + label(CELL_X[2], "ERSTSZ 段数") + label(CELL_X[3], "Interval")
    + label(CELL_X[4], "INTE") + label(CELL_X[5], "IE")
    + FT(k.topMatrix([CELL_X[0], -17.6], 70.1, P, "x"), "等 CNR=0 再动寄存器", 4.2, "lo", "middle")
    + FT(k.topMatrix([CELL_X[5], -17.6], 70.1, P, "x"), "中断可选 · 可轮询", 4.2, "lo", "middle")
    + FT(k.topMatrix([CELL_X[5], -16.2], 70.1, P, "x"), "事件环", 4.2, "lo", "middle"));
}
// 格分组刻线：系统配置(格1-2) / 事件环组(格3) / 中断组(格4-6)
{
  const grp = (x0, x1) => Ln(k.pathOf([[x0, PF + 0.3, 71.2], [x1, PF + 0.3, 71.2], [x1, PF + 0.3, 97.5], [x0, PF + 0.3, 97.5]].map((p) => at(p)), true), { tone: "faint" });
  faceText(grp(-23, 29) + grp(29, 81) + grp(81, 133));
}
// 格1：USBSTS · CNR 就绪灯（座盘 + 罩，轴沿 +y 凸出面板）
{
  const cx = CELL_X[0];
  const seatF = G.frameOf([cx, PF + 0.1, 77.4], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  put("cnr.seat", [cx, PF + 1.4, 77.4],
    S(G.disc(0, 2.6, 5.6, seatF, P, { steps: 28, bevel: 0.3 }), { tone: "lo" })
    + Ln(G.circleOf(seatF, 2.6, 5.6, P, 28), { tone: "lo" }),
    [record(A.disc(seatF, 0, 2.6, 5.6, { name: "cnr.seat" }))], { bias: 0.3 });
  const lampF = G.frameOf([cx, PF + 2.8, 77.4], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  put("cnr.dome", [cx, PF + 4.5, 78],
    `<g data-part="cnrdome" class="lamp">` + S(G.solidOf([[0, 0.2], [1.6, 3.4, 1], [3.4, 4.2, 1], [4.6, 3.4, 1], [5.2, 0.4]], lampF, P, { steps: 26 }), { tone: "hi" }) + `</g>`,
    [record(A.solid(lampF, [[0, 0.2], [1.6, 3.4, 1], [3.4, 4.2, 1], [4.6, 3.4, 1], [5.2, 0.4]], { name: "cnr.dome" }))], { bias: 0.4 });
  faceText("");
}
// 格2：CONFIG · MaxSlotsEn 旋钮（动：live 重建）
{
  const cx = CELL_X[1];
  const seatF = G.frameOf([cx, PF + 0.1, 79], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  put("cfg.seat", [cx, PF + 1.4, 79], S(G.disc(0, 2.6, 6.6, seatF, P, { steps: 28, bevel: 0.25 }), { tone: "lo" }),
    [record(A.disc(seatF, 0, 2.6, 6.6, { name: "cfg.seat" }))], { bias: 0.3 });
  put("cfg.knob", [cx, PF + 4.5, 79], `<g data-part="cfgknob">${geo.knobSvg(cx, 0)}</g>`,
    [record(A.disc(G.frameOf([cx, PF + 2.7, 79], [0, 1, 0], [1, 0, 0], [0, 0, 1]), 0, 3.6, 4.6, { name: "cfg.knob" }))], { bias: 0.45 });
  faceText(`<g data-part="cfgwin">${geo.numWinSvg(0)}</g>`);
}
// 格3：ERSTSZ 计数轮 + 事件环启用灯（动：live 重建数字带）
{
  const cx = CELL_X[2];
  slab("ersz.frame", { x: cx - 8.4, y: PF, w: 16.8, d: 1.8, r: 0.8 }, 76, 12.5, { tone: "lo" }, { steps: 2 });
  faceText(`<g data-part="erszwin">${geo.wheelWinSvg(0)}</g>`);
  // 事件环启用灯（ERSTBA 写入即亮）
  const lx = cx + 11.6;
  const seatF2 = G.frameOf([lx, PF + 0.1, 80.6], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  put("erlamp.seat", [lx, PF + 1.2, 80.6], S(G.disc(0, 2.2, 2.6, seatF2, P, { steps: 18, bevel: 0.2 }), { tone: "lo" }),
    [record(A.disc(seatF2, 0, 2.2, 2.6, { name: "erlamp.seat" }))], { bias: 0.3 });
  const lf = G.frameOf([lx, PF + 2.4, 80.6], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  put("erlamp.dome", [lx, PF + 3.6, 81],
    `<g data-part="erlamp" class="lamp">` + S(G.solidOf([[0, 0.2], [1, 2, 1], [2.2, 2.6, 1], [3, 2, 1], [3.4, 0.3]], lf, P, { steps: 20 }), { tone: "hi" }) + `</g>`,
    [record(A.solid(lf, [[0, 0.2], [1, 2, 1], [2.2, 2.6, 1], [3, 2, 1], [3.4, 0.3]], { name: "erlamp.dome" }))], { bias: 0.4 });
  faceText(vtext(lx, PF + 0.4, 74.6, "事件环", 4, "lo", "middle")
    + vtext(lx, PF + 0.4, 71.8, "启用", 4, "lo", "middle"));
}
// 格4：Interval 节流旋钮（动）
{
  const cx = CELL_X[3];
  const seatF = G.frameOf([cx, PF + 0.1, 79], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  put("itv.seat", [cx, PF + 1.4, 79], S(G.disc(0, 2.6, 5.8, seatF, P, { steps: 26, bevel: 0.25 }), { tone: "lo" }),
    [record(A.disc(seatF, 0, 2.6, 5.8, { name: "itv.seat" }))], { bias: 0.3 });
  put("itv.knob", [cx, PF + 4.2, 79], `<g data-part="itvknob">${geo.knobSvg(cx, 0, 4)}</g>`,
    [record(A.disc(G.frameOf([cx, PF + 2.75, 79], [0, 1, 0], [1, 0, 0], [0, 0, 1]), 0, 3.6, 4, { name: "itv.knob" }))], { bias: 0.45 });
  faceText("");
}
// 格5/6：INTE / IE 小闸刀（动：live 重建杆）
{
  for (const [i, key, label] of [[5, "inte", "INTE"], [6, "ie", "IE"]]) {
    const cx = CELL_X[i - 1];
    slab(`sw.${key}.base`, { x: cx - 6.5, y: PF, w: 13, d: 1.8, r: 0.8 }, 76.5, 7.5, { tone: "lo" }, { steps: 2 });
    const hF = G.frameOf([cx - 4, PF + 1.8, 80.2], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    put(`sw.${key}.hinge`, [cx - 4, PF + 3.4, 80.2], S(G.disc(0, 3.2, 1.5, hF, P, { steps: 14, bevel: 0.2 }), { tone: "mid" }),
      [record(A.disc(hF, 0, 3.2, 1.5, { name: `sw.${key}.hinge` }))], { bias: 0.2 });
    const cF = G.frameOf([cx + 4.2, PF + 1.8, 80.2], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    put(`sw.${key}.contact`, [cx + 4.2, PF + 2.9, 80.2], S(G.disc(0, 2.2, 1.3, cF, P, { steps: 14, bevel: 0.2 }), { tone: "hi" }),
      [record(A.disc(cF, 0, 2.2, 1.3, { name: `sw.${key}.contact` }))], { bias: 0.2 });
    const swDir = [Math.cos((34 * Math.PI) / 180), 0, Math.sin((34 * Math.PI) / 180)];
    put(`sw.${key}.arm`, [cx, PF + 5, 82], `<g data-part="sw-${key}">${geo.swArmSvg(cx, 0)}</g>`,
      [record(A.prism(G.frameAlong([cx - 4, PF + 4.7, 80.5], swDir), [[-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9]], 0, 9.4, { name: `sw.${key}.arm`, owner: `sw.${key}.hinge` }))], { bias: 0.4 });
    faceText("");
  }
}

// ================= R/S 大闸刀（柜顶） =================
{
  const b = RS.base;
  slab("rs.base", b, RS.z, 6, { tone: "mid" }, { steps: 4, bevel: 0.5, extra: screwDots(b, 3, RS.z + 6) });
  // 接线柱（两静触点背后的端子）
  cyl("rs.post", RS.hinge[0], RS.hinge[1], 2.6, RS.z + 6, 9, { tone: "mid" }, { steps: 18, bevel: 0.3 });
  cyl("rs.contact", RS.contact[0], RS.contact[1], 2.2, RS.z + 6, 6.5, { tone: "hi" }, { steps: 18, bevel: 0.3 });
  put("rs.arm", [(RS.hinge[0] + RS.contact[0]) / 2, RS.hinge[1], RS.z + 12], `<g data-part="rsarm">${geo.rsArmSvg(0)}</g>`,
    [record(A.ball([RS.hinge[0], RS.hinge[1], RS.z + 17.6], 2.6, { name: "rs.arm.ball" })),
     record(A.prism(G.frameAlong([RS.hinge[0] + 2.45 * Math.cos((46 * Math.PI) / 180), RS.hinge[1], RS.z + 17.6 + 2.45 * Math.sin((46 * Math.PI) / 180)], [Math.cos((46 * Math.PI) / 180), 0, Math.sin((46 * Math.PI) / 180)]), [[-2, -2], [2, -2], [2, 2], [-2, 2]], 0, 59.5, { name: "rs.arm.beam" }))], { bias: 0.4 });
  // 底座刻字
  faceText(
    FT(k.topMatrix([RS.hinge[0] + 16, RS.hinge[1] + 9], RS.z + 6.1, P, "x"), "USBCMD · R/S 总闸", 4.6, "mid")
    + FT(k.topMatrix([RS.hinge[0] - 2, RS.contact[1] + 12], RS.z + 6.1, P, "x"), "OFF", 4.2, "lo")
    + FT(k.topMatrix([RS.contact[0] - 4, RS.contact[1] + 12], RS.z + 6.1, P, "x"), "ON", 4.2, "hi")
    + FT(k.topMatrix([RS.hinge[0] + 14, RS.hinge[1] - 12], RS.z + 6.1, P, "x"), "R/S=1 后 xHC 才开始接受门铃", 4.2, "lo"));
}

// ================= 桁架（双柱门架：梁横跨台面与柜前） =================
{
  for (let i = 0; i < POSTS.length; i++) {
    const [px, py] = POSTS[i];
    cyl(`gantry.foot${i}`, px, py, 5.2, PLATE_H, 3, { tone: "lo" }, { steps: 22 });
    cyl(`gantry.post${i}`, px, py, 2.6, PLATE_H + 3, 59.5, { tone: "mid", crease: "none" },
      { steps: 18, extra: Ln([30, 44, 58].map((z) => k.sideArc(px, py, 2.6, z, P, 12)).join(""), { tone: "faint" }) });
    cyl(`gantry.cap${i}`, px, py, 3.4, 74.5, 2.5, { tone: "mid" }, { steps: 20, bevel: 0.25 });
  }
  slab("gantry.beam", BEAM, 77, 6, { tone: "mid" }, { steps: 4, bevel: 0.4 });
  slab("gantry.stop", { x: BEAM.x + BEAM.w, y: BEAM.y, w: 4, d: BEAM.d, r: 0.8 }, 75, 10, { tone: "lo" }, { steps: 2 });
  // 滑车（动：live 重建；初始位入审计：车体 + 两夹爪臂）
  put("trolley", [TROLLEY_HOME, BEAM.y + 6, 70], `<g data-part="trolley">${geo.trolleySvg(TROLLEY_HOME, 0, null)}</g>`,
    [record(A.slab({ x: TROLLEY_HOME - 6.5, y: BEAM.y + 1.5, w: 13, d: 9, r: 1.4 }, 63, 14, { name: "trolley" }, 3)),
     record(A.slab({ x: TROLLEY_HOME - 15, y: BEAM.y + 2, w: 12, d: 2, r: 0.5 }, 62.5, 3.4, { name: "trolley.jawL", owner: "trolley" }, 2)),
     record(A.slab({ x: TROLLEY_HOME + 3, y: BEAM.y + 2, w: 12, d: 2, r: 0.5 }, 62.5, 3.4, { name: "trolley.jawR", owner: "trolley" }, 2))], { bias: 1 });
}

// ================= 文书台（xHCI 驱动操作位） =================
{
  const seamD = k.sideSeam(DESK, 24, P, 4);
  slab("desk.body", DESK, PLATE_H, 20, { tone: "mid" }, { steps: 4, bevel: 0.6, inner: Ln(seamD, { tone: "faint" }) });
  // 抽屉线 + 拉手点
  faceText(
    Ln([[-186, DESK.y + DESK.d + 0.05, 22], [-112, DESK.y + DESK.d + 0.05, 22]].map((p) => at(p)), { tone: "lo" })
    + Dots([[-176, DESK.y + DESK.d + 0.2, 18.6], [-148, DESK.y + DESK.d + 0.2, 18.6], [-120, DESK.y + DESK.d + 0.2, 18.6]].map((p) => at(p)), { size: 0.55 }));
  slab("desk.top", { x: DESK.x - 3, y: DESK.y - 3, w: DESK.w + 6, d: DESK.d + 6, r: 2 }, 32, 3, { tone: "mid" },
    { steps: 4, bevel: 0.4, extra: Ln(k.planOutline(k.insetPlan({ x: DESK.x - 3, y: DESK.y - 3, w: DESK.w + 6, d: DESK.d + 6 }, 3), 35, P, 4), { tone: "lo" }) });
  // 台前铭牌：xHCI 驱动（底面贴台身前面 y=-6）
  const mp = { x: -186, y: -6.2, w: 56, d: 1.6, r: 0.6 };
  put("desk.title", [mp.x + 28, DESK.y + DESK.d + 1.3, 26],
    S(k.slabOf(mp, 22, 7, P, 2, 0.3), { tone: "hi", crease: "none" })
    + vtext(mp.x + 3, mp.y + mp.d + 0.05, 27.6, "xHCI 驱动", 6.2, "hi")
    + vtext(mp.x + 3, mp.y + mp.d + 0.05, 23.2, "规范称 system software", 4, "mid"),
    [record(A.slab(mp, 22, 7, { name: "desk.title" }, 2))], { bias: 0.1 });
}
// 卡库（叠卡 + 托盘）
{
  const m = { x: MAG.x, y: MAG.y, w: MAG.w, d: MAG.d, r: 1 };
  slab("mag.tray", { x: m.x - 2, y: m.y - 2, w: m.w + 4, d: m.d + 4, r: 1.2 }, 35, 1.2, { tone: "lo" }, { steps: 2 });
  put("mag.stack", [m.x + m.w / 2, m.y + m.d / 2, 38],
    `<g data-part="magstack">${geo.magStackSvg(6)}</g>`,
    [record(A.slab(m, 36.2, 16, { name: "mag.stack" }, 2))], { bias: 0.2 });
  faceText(vtext(m.x + 1, m.y - 2.4, 42.5, "待插卡 ×6", 4.2, "lo"));
}
// 拉杆排（三只小拉杆）
{
  for (let i = 0; i < LEVERS.length; i++) {
    const x = LEVERS[i];
    cyl(`lever${i}.seat`, x, -34, 2.8, 35, 2, { tone: "lo" }, { steps: 18 });
    put(`lever${i}.knob`, [x, -34, 39.5], `<g data-part="lever${i}">` +
      S(k.cylinder(x, -34, 1.7, 37, 3.6, P, 16, 0.25), { tone: "hi", lit: i === 0 })
      + Ln(k.knurl(x, -34, 1.7, 37, 40.6, 14, P), { tone: "lo" }) + `</g>`,
      [record(A.cylinder(x, -34, 1.7, 37, 3.6, { name: `lever${i}.knob` }, 16))], { bias: 0.2 });
  }
  faceText(vtext(LEVERS[0] - 3, -30.6, 38.6, "旋钮/闸刀", 4, "lo")
    + vtext(LEVERS[0] - 3, -30.6, 35.6, "拉线手柄", 4, "lo"));
}

// ================= 拉线（两条 Bowden 线：拉杆排 → R/S 底座端子 / CONFIG 格端子） =================
{
  // 线1：拉杆0 → 台前空中 → 桁架右侧外 → 柜顶 → R/S 底座右缘竖端子柱上方
  const route1 = G.fillet([
    [LEVERS[0], -30, 37], [LEVERS[0], -6, 38], [-64, -2, 40], [95, -2, 40],
    [158, -2, 56], [158, -46, 100], [158, -69, 107.6], [139, -69, 107.25],
  ], 2.6, 8, { P, tube: 0.7 });
  R.route("wire.rs", route1, 0.7, { piece: "bench", limp: true, tips: [null, null], ends: [false, false] });
  tubePieces(route1, 0.7, P, { maxLength: 20 }).forEach((piece, index) =>
    put(`wire.rs:${index}`, piece.mid, tubeSvg(piece, { tone: "lo" }), [A.tube(piece.points, piece.radii)], { bias: 0.05, route: "wire.rs", chunk: index }));
  cyl("wire.rs.term", 139, -69, 1.2, RS.z, 5, { tone: "mid" }, { steps: 14, bevel: 0.2,
    extra: Ln(k.ring(139, -69, 0.62, RS.z + 5.05, P, 12), { tone: "lo" }) + Dots([at([139, -69, RS.z + 5.05])], { size: 0.42, tone: "hi" }) });
  // 线2：拉杆1 → 抬高跨过 rs 线 → 梁前 y=13 带 → 柜面顶部上方横带 → 格间缝下降 → CONFIG 格旁竖端子柱上方
  const route2 = G.fillet([
    [LEVERS[1], -30, 40], [-96, -12, 42], [-60, 13, 50], [-26, 13, 52],
    [-24, -17, 64], [-24, -16, 100.9], [26, -16, 100.9], [26, -16, 77], [26, -19.2, 75.3],
  ], 4, 7, { P, tube: 0.55 });
  R.route("wire.cfg", route2, 0.55, { piece: "bench", limp: true, tips: [null, null], ends: [false, false] });
  tubePieces(route2, 0.55, P, { maxLength: 18 }).forEach((piece, index) =>
    put(`wire.cfg:${index}`, piece.mid, tubeSvg(piece, { tone: "lo" }), [A.tube(piece.points, piece.radii)], { bias: 0.05, route: "wire.cfg", chunk: index }));
  cyl("wire.cfg.term", 26, -19.2, 0.9, 70.3, 3.9, { tone: "mid" }, { steps: 12, bevel: 0.2,
    extra: Ln(k.ring(26, -19.2, 0.5, 74.25, P, 12), { tone: "lo" }) + Dots([at([26, -19.2, 74.25])], { size: 0.4, tone: "hi" }) });
}

// ================= 端口灯排（设备区） =================
{
  slab("portbar", BAR, PLATE_H, 6, { tone: "mid" }, { steps: 4, bevel: 0.5, extra: screwDots(BAR, 4, PLATE_H + 6) });
  // 设备区注记立牌（左端）
  const np = { x: -38, y: BAR.y + 2, w: 78, d: 3.4, r: 1 };
  slab("portbar.note", np, PLATE_H + 6, 34, { tone: "lo" }, { steps: 2 });
  faceText(
    vtext(np.x + 4, np.y + 0.05, PLATE_H + 36, "设备区 · 根集线器端口", 4.6, "dev")
    + vtext(np.x + 4, np.y + 0.05, PLATE_H + 30.6, "本流程不参与——", 4.2, "mid")
    + vtext(np.x + 4, np.y + 0.05, PLATE_H + 26.2, "R/S=1 后端口才开始上报连接", 4.2, "mid"));
  // 四灯：U2 U2 SS SS
  for (let i = 0; i < 4; i++) {
    const x = PORTS_X[i], isSS = i >= 2;
    cyl(`port${i}.seat`, x, 123, 4.6, PLATE_H + 6, 5, { tone: "lo" }, { steps: 22, bevel: 0.3 });
    const lampF = G.frameOf([x, 123, PLATE_H + 11], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    put(`port${i}.dome`, [x, 123, PLATE_H + 14],
      `<g data-part="port${i}" class="lamp${isSS ? " blink" : ""}">` +
      S(G.solidOf([[0, 0.2], [1.4, 2.8, 1], [3, 3.4, 1], [4.2, 2.6, 1], [4.8, 0.3]], lampF, P, { steps: 24 }), { tone: "hi" }) + `</g>`,
      [record(A.solid(lampF, [[0, 0.2], [1.4, 2.8, 1], [3, 3.4, 1], [4.2, 2.6, 1], [4.8, 0.3]], { name: `port${i}.dome` }))], { bias: 0.3 });
    faceText(FT(k.topMatrix([x - 4, 117], PLATE_H + 6.1, P, "x"), isSS ? "SS" : "USB2", 4, "lo"));
  }
  faceText(FT(k.topMatrix([BAR.x + 6, BAR.y + BAR.d - 8], PLATE_H + 6.1, P, "x"), "端口灯排：USB2 两灯＝等待端口复位 · SS 两灯＝自动检测中", 4, "lo"));
}

// ================= 顺序自由注记牌 =================
{
  slab("note.board", NOTE, PLATE_H - 0.2, 32.2, { tone: "lo" }, { steps: 2 });
  faceText(
    vtext(NOTE.x + 4, NOTE.y + 0.05, PLATE_H + 27.5, "中间各步顺序自由", 4.8, "hi")
    + vtext(NOTE.x + 4, NOTE.y + 0.05, PLATE_H + 22.5, "全部完成须在 R/S=1 前", 4.2, "mid")
    + vtext(NOTE.x + 4, NOTE.y + 0.05, PLATE_H + 17.5, "（p69 Note）", 4.2, "lo"));
}

// ================= settle + assemble =================
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const groups = R.items.map((it) => `<g class="it" data-name="${it.name}"${it.attrs ?? ""}>${it.svg}</g>`);
const svg = k.figureSvg({
  width: W, height: H,
  label: "启机配电台：左侧文书台是 xHCI 驱动（规范称 system software）的操作位，卡库里六张寄存器卡经桁架滑车吊运插进右侧 xHC 主机仓的卡笼；柜面上部是 USBSTS 就绪灯（CNR）、CONFIG 槽数旋钮、ERSTSZ 计数轮、Interval 节流旋钮与 INTE/IE 两道闸，柜顶是 USBCMD 的 R/S 总闸；台前下沿是根集线器端口灯排——本流程无设备参与，R/S=1 后端口才开始上报连接。",
  body: [...back, `<g class="fb-stage">${groups.join("")}</g>`, ...overlays].join(""),
});

// ================= figure CSS =================
const CSS = `
.fb-stage { --lamp-glow: ${THEME === "light" ? "#d98428" : "#ffb45e"}; --lamp-ink: ${THEME === "light" ? "#c96a12" : "#ffd9a0"}; }
.fb-stage .lamp path { fill: var(--anatomy-shade2); transition: fill 300ms; }
.fb-stage .lamp.on path { fill: var(--lamp-ink); }
.fb-stage .lamp.on { filter: drop-shadow(0 0 6px var(--lamp-glow)); }
@media (prefers-reduced-motion: reduce) { .fb-stage .lamp.blink { animation: none; } .fb-stage .lamp.blink.on { opacity: 1; } }
.fb-stage .lamp.blink.on { animation: fb-blink 1.6s ease-in-out infinite; }
@keyframes fb-blink { 0%, 100% { filter: drop-shadow(0 0 2px var(--lamp-glow)); } 50% { filter: drop-shadow(0 0 7px var(--lamp-glow)); } }
.fb-dev { fill: ${THEME === "light" ? "#2f7a3d" : "#86bd7a"}; }
.fb-drv { fill: ${THEME === "light" ? "#2d5fb3" : "#7c9ff0"}; }
`;

// ================= 泳道静态图（页面级平面 SVG：左右泳道 + 底部设备横条） =================
function laneSvg() {
  const LW = 1180, LH = 1040;
  const stepH = 60, gap = 20;
  const drv = { x: 20, y: 70, w: 530, h: 654 };
  const hc = { x: 610, y: 70, w: 550, h: 700 };
  const dev = { x: 20, y: Math.max(drv.y + drv.h, hc.y + hc.h) + 36, w: 1140, h: 190 };
  const steps = [
    { t: "1 · 等 USBSTS.CNR=0 再写寄存器", p: "p69", hc: "读 USBSTS（CNR 位）", dash: true },
    { t: "2 · 写 CONFIG.MaxSlotsEn", p: "p69", hc: "CONFIG：启用设备槽" },
    { t: "3 · 写 DCBAAP（64 位地址）", p: "p69", hc: "DCBAAP → DCBAA" },
    { t: "4 · 写 CRCR（命令环首 TRB 地址）", p: "p69", hc: "CRCR：命令环起点" },
    { t: "5 · 事件环四件", t2: "段 / ERSTSZ / ERDP / ERSTBA", p: "p69–70", hc: "写 ERSTBA ＝ 启用事件环" },
    { t: "6 · 中断四件", t2: "MSI-X 表 / Interval / INTE / IE", p: "p69–70", hc: "中断器就绪（可选：轮询）" },
    { t: "7 · 写 USBCMD R/S=1", p: "p70", hc: "xHC 开始接受门铃" },
  ];
  const dBoxX = 66, dBoxW = 420;
  const hBoxX = 664, hBoxW = 440;
  const dY = (i) => drv.y + 66 + i * (stepH + gap);
  const hY = (i) => hc.y + 66 + i * (stepH + gap);
  let g = "";
  const lane = (r, label, cls, lx) =>
    `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="14" class="lane-bg"/>` +
    `<rect x="${r.x + 3}" y="${r.y + 3}" width="${r.w - 6}" height="${r.h - 6}" rx="12" class="lane-edge ${cls}"/>` +
    `<text x="${lx}" y="${r.y + 44}" class="lane-name ${cls}">${label}</text>`;
  g += lane(drv, "xHCI 驱动", "c-drv", drv.x + 22);
  g += `<text x="${drv.x + 150}" y="${drv.y + 44}" class="lane-sub">规范称 system software（系统软件）</text>`;
  g += lane(hc, "xHC 控制器", "c-hc", hc.x + 22);
  g += lane(dev, "设备", "c-dev", dev.x + 22);
  steps.forEach((s, i) => {
    const y = dY(i);
    g += `<rect x="${dBoxX}" y="${y}" width="${dBoxW}" height="${stepH}" rx="8" class="box c-drv"/>`;
    if (s.t2) {
      g += `<text x="${dBoxX + 16}" y="${y + 25}" class="box-t">${s.t}</text>`;
      g += `<text x="${dBoxX + 16}" y="${y + 46}" class="box-s">${s.t2}</text>`;
    } else {
      g += `<text x="${dBoxX + 16}" y="${y + 38}" class="box-t">${s.t}</text>`;
    }
    g += `<text x="${dBoxX + dBoxW - 12}" y="${y + 22}" class="box-p">${s.p}</text>`;
    const hy = hY(i);
    g += `<rect x="${hBoxX}" y="${hy}" width="${hBoxW}" height="${stepH}" rx="8" class="box c-hc"/>`;
    g += `<text x="${hBoxX + 16}" y="${hy + 38}" class="box-t">${s.hc}</text>`;
    g += `<line x1="${dBoxX + dBoxW + 2}" y1="${y + stepH / 2}" x2="${hBoxX - 2}" y2="${hy + stepH / 2}" class="arr${s.dash ? " dash" : ""}" marker-end="url(#arrh)"/>`;
  });
  // 顺序自由组虚框（括步骤 2–6 的驱动框；规范 p69 Note）——画在框后，避免被填充覆盖
  const fy0 = dY(1) - 14, fy1 = dY(5) + stepH + 14;
  g += `<rect x="52" y="${fy0}" width="${dBoxX + dBoxW - 52 + 14}" height="${fy1 - fy0}" rx="10" class="grp-free"/>`;
  g += `<text x="60" y="${fy0 - 10}" class="grp-note">顺序自由组：先后自由，全部完成须在 R/S=1 之前（p69 Note）</text>`;
  g += `<rect id="grp-free-anchor" x="52" y="${fy0}" width="8" height="8" fill="none" stroke="none"/>`;
  // 步骤 8：xHC 端口开始上报连接 → 设备泳道注记框（虚线＝状态上报）
  const y8 = hY(7);
  g += `<rect x="${hBoxX}" y="${y8}" width="${hBoxW}" height="${stepH}" rx="8" class="box c-hc"/>`;
  g += `<text x="${hBoxX + 16}" y="${y8 + 38}" class="box-t">8 · 端口开始上报连接</text>`;
  g += `<text x="${hBoxX + hBoxW - 12}" y="${y8 + 22}" class="box-p">p70</text>`;
  const dBox = { x: 320, y: dev.y + 52, w: 560, h: 118 };
  g += `<rect x="${dBox.x}" y="${dBox.y}" width="${dBox.w}" height="${dBox.h}" rx="10" class="box dash c-dev"/>`;
  g += `<text x="${dBox.x + 22}" y="${dBox.y + 46}" class="box-t">本流程不参与</text>`;
  g += `<text x="${dBox.x + 22}" y="${dBox.y + 82}" class="box-s">端口在 R/S=1 后才上报连接；设备插入后的登记流程见 §4.3</text>`;
  g += `<line x1="${hBoxX + hBoxW / 2}" y1="${y8 + stepH + 2}" x2="${dBox.x + dBox.w / 2}" y2="${dBox.y - 2}" class="arr dash" marker-end="url(#arrh)"/>`;
  return `<svg id="lane-svg" viewBox="0 0 ${LW} ${LH}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="§4.2 初始化三方泳道流程图：驱动侧七个步骤框，xHC 侧对应寄存器框与端口上报框，设备泳道整注不参与">
<defs><marker id="arrh" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="arr-head"/></marker></defs>
<style>
.lane-bg { fill: var(--anatomy-paper); }
.lane-edge { fill: none; stroke-width: 2.5; }
.c-drv { stroke: ${THEME === "light" ? "#2d5fb3" : "#7c9ff0"}; }
.c-hc { stroke: ${THEME === "light" ? "#8a5f14" : "#d9a860"}; }
.c-dev { stroke: ${THEME === "light" ? "#2f7a3d" : "#86bd7a"}; }
.lane-name { font: 700 21px var(--anatomy-ui, sans-serif); }
.lane-name.c-drv { fill: ${THEME === "light" ? "#2d5fb3" : "#7c9ff0"}; }
.lane-name.c-hc { fill: ${THEME === "light" ? "#8a5f14" : "#d9a860"}; }
.lane-name.c-dev { fill: ${THEME === "light" ? "#2f7a3d" : "#86bd7a"}; }
.lane-sub { font: 500 14px var(--anatomy-ui, sans-serif); fill: var(--anatomy-muted); }
.box { fill: ${THEME === "light" ? "#f4f2ee" : "#232327"}; stroke-width: 1.6; }
.box.dash { stroke-dasharray: 8 6; }
.box-t { font: 600 16px var(--anatomy-ui, sans-serif); fill: var(--anatomy-line-hi); }
.box-s { font: 500 14.5px var(--anatomy-ui, sans-serif); fill: var(--anatomy-line-mid); }
.box-p { font: 500 13px var(--anatomy-mono, monospace); fill: var(--anatomy-line-mid); text-anchor: end; }
.grp-free { fill: none; stroke: ${THEME === "light" ? "#5a5a62" : "#a8a8b0"}; stroke-width: 1.8; stroke-dasharray: 9 6; }
.grp-note { font: 500 14.5px var(--anatomy-ui, sans-serif); fill: ${THEME === "light" ? "#5a5a62" : "#a8a8b0"}; }
.arr { stroke: ${THEME === "light" ? "#33333a" : "#d8d8dc"}; stroke-width: 2.4; fill: none; }
.arr.dash { stroke-dasharray: 6 5; }
.arr-head { fill: ${THEME === "light" ? "#33333a" : "#d8d8dc"}; }
</style>${g}</svg>`;
}

// ================= 页面 =================
const navHtml = `
<nav class="spec-nav">
  <a href="../../index.html">← 规范目录</a>
  <span class="nav-title">§4.2 主机控制器初始化</span>
  <span class="nav-sib">
    <a href="../4.1-command-operation/index.html" title="§4.1 命令操作">上一节 §4.1</a>
    <a href="../4.3-usb-device-init/index.html" title="§4.3 USB 设备初始化">下一节 §4.3</a>
  </span>
</nav>
<p class="spec-ref">xHCI 1.2b §4.2 Host Controller Initialization · p68–70（页码已机核，见 EVIDENCE.md）</p>`;

const proseHtml = `
<section class="spec-block">
  <h2>规范要义</h2>
  <p>xHCI 驱动（规范原文称 system software，系统软件）把 xHC 当一面寄存器面板来配置：先等 <b>USBSTS</b> 的 <b>CNR</b> 位清零——硬件复位未完成期间写任何 Operational/Runtime 寄存器都被禁止；此后给 <b>CONFIG.MaxSlotsEn</b> 定槽位数、把 <b>DCBAAP</b> 指到设备上下文基地址数组、把 <b>CRCR</b> 指到命令环首 TRB，再把事件环四件（段、ERSTSZ、ERDP、ERSTBA）与中断四件（MSI-X 表、Interval、INTE、IE）装配到位。</p>
  <p>中间各步的先后顺序规范不强制（p69 Note），但必须全部在 <b>USBCMD 的 R/S 位置 1</b> 之前完成；R/S=1 之后 xHC 才开始接受门铃引用，根集线器端口也从这时起上报设备连接。</p>
  <p>中断是可选件——xHC 可以靠轮询事件环运行（p69 脚注 7，MSI-X 只是本节的示例机制）。端口到 Enabled 态的路径按协议族分叉：USB2（LS/FS/HS）端口必须走端口复位，SS 端口检测到成功 attach 后自动进入 Enabled（p70）。</p>
</section>`;

const quoteHtml = `
<section class="spec-block">
  <h2>原文对照</h2>
  <blockquote><p class="q">“When the system boots, the host controller is enumerated, assigned a base address for the xHC register space, and the system software sets the Frame Length Adjustment (FLADJ) register to a system-specific value.”</p><p class="cite">(xHCI 1.2b §4.2 p68)</p><p class="zh">开机时主机控制器被枚举并分配寄存器基址，驱动把 FLADJ 设为系统特定值——初始化从这里开始。</p></blockquote>
  <blockquote><p class="q">“After Chip Hardware Reset wait until the Controller Not Ready (CNR) flag in the USBSTS is ‘0’ before writing any xHC Operational or Runtime registers.”</p><p class="cite">(xHCI 1.2b §4.2 p69)</p><p class="zh">芯片硬件复位后，必须等 USBSTS 的 CNR 为 0 才能写任何 Operational/Runtime 寄存器——CNR 灯不灭，手不能动。</p></blockquote>
  <blockquote><p class="q">“Note: This text does not imply a specific order for the following operations, however these operations shall be completed before setting the USBCMD register Run/Stop (R/S) bit to ‘1’.”</p><p class="cite">(xHCI 1.2b §4.2 p69)</p><p class="zh">后续各步不隐含特定顺序，但都必须在 USBCMD 的 R/S 位置 1 之前完成——顺序自由，终点唯一。</p></blockquote>
  <blockquote><p class="q">“Write the USBCMD to turn the host controller ON via setting the Run/Stop (R/S) bit to ‘1’. This operation allows the xHC to begin accepting doorbell references.”</p><p class="cite">(xHCI 1.2b §4.2 p70)</p><p class="zh">写 USBCMD 把 R/S 位置 1 打开主机控制器；此后 xHC 才开始接受门铃引用。</p></blockquote>
  <blockquote><p class="q">“At this point, the host controller is up and running and the Root Hub ports will begin reporting device connects, etc., and system software may begin enumerating devices.”</p><p class="cite">(xHCI 1.2b §4.2 p70)</p><p class="zh">至此主机控制器投入运行，根集线器端口开始上报设备连接等事件，驱动可以开始枚举设备（进入 §4.3）。</p></blockquote>
</section>`;

const laneCard = k.plateHtml({
  fig: "流程",
  title: "§4.2 初始化步骤：三方泳道",
  hint: "放大看小框文字 · 全屏后滚轮浏览",
  readout: "驱动侧 7 步 · xHC 侧对应寄存器 · 设备泳道不参与",
  keys: [
    { mark: "raised", label: "实线箭头＝写/读寄存器；虚线＝事件与状态上报（p69–70）" },
    { mark: "dim", label: "虚线大框＝顺序自由组：先后自由，全部完成须在 R/S=1 之前（p69 Note）" },
    { mark: "edge", label: "设备泳道整注不参与：端口在 R/S=1 后才上报连接（p70）" },
  ],
  caption: "驱动把一面寄存器面板逐项配好，最后合闸；设备此刻还只是灯排上的未来观众。",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="§4.2 初始化三方泳道流程图，可放大平移。">${laneSvg()}<span role="status" aria-live="polite" data-status></span></div>` + zoomBarHtml("放大看框内文字 · 全屏后滚轮浏览"),
});

const figCard = k.plateHtml({
  fig: "§4.2 动画",
  title: "启机配电台：主机控制器初始化",
  hint: "点击或空格步进 · ← → 换帧 · Home 回全景 · A 巡游",
  readout: "启动步 0/7 · CNR 0 · R/S 0 · 端口活动 0/4",
  keys: [
    { mark: "lit", label: "滑车吊运的寄存器卡＝驱动写入的配置：DCBAAP/CRCR/事件环段/ERDP/ERSTBA/MSI-X 表（p69–70）" },
    { mark: "raised", label: "CNR 就绪灯＝USBSTS.CNR：亮＝未就绪禁写，灭后才可动手（p69）" },
    { mark: "edge", label: "R/S 总闸合上＝USBCMD R/S=1：xHC 开始接受门铃，端口灯排苏醒（p70）" },
  ],
  caption: "配电台的铁律：CNR 灯不灭手不动；中间各步顺序自由、终点唯一——R/S 总闸最后合。",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="启机配电台，八帧：全景、等 CNR 清零、配槽与 DCBAA、命令环起点、事件环登记、中断链、合闸、读数巡回。点击或空格步进。">${svg}<span role="status" aria-live="polite" data-status></span></div>` + zoomBarHtml(),
});

const linksHtml = `
<section class="spec-block">
  <h2>相关</h2>
  <ul class="links">
    <li><a href="../../index.html">§4.3 USB 设备初始化</a>——R/S=1 后端口上报连接，设备登记从那里开始（建设中）</li>
    <li><a href="../../../xhc-machines/fig3-event-ring/index.html">Fig3 回执登记机</a>——事件环的生产与消费（本节装配的正是它的段表与指针）</li>
    <li><a href="../../../xhc-machines/fig4-command-ring/index.html">Fig4 订单柜台</a>——命令环与它的回执（本节的 CRCR 给它定起点）</li>
    <li><a href="../../index.html">§4.7 门铃</a>——R/S=1 后 xHC 才开始接受的门铃（待建）</li>
  </ul>
</section>`;

const footerHtml = `<footer class="spec-foot">判据：xHCI 1.2b（625472 Rev 1.2b）· 证据见 <a href="EVIDENCE.md">EVIDENCE.md</a> · 生成于 2026-11-03</footer>`;

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
</style>`;

const body = pageCss + navHtml + proseHtml + quoteHtml + `<div class="lane-wrap">` + laneCard + `</div>` + `<div class="fig-wrap">` + figCard + `</div>` + linksHtml + footerHtml;

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
  + zoomFor(0, ["#grp-free-anchor"], "__zfsLane")
  + zoomFor(1, ['[data-name="cage.rail1"]', '[data-name="panel.face"]'], "__zfs");

const page = k.pageHtml({ title: "§4.2 主机控制器初始化 · xHCI 规范对照", theme: THEME, body, script, width: 1500 });
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} items`, `scale ${KS.toFixed(3)}`);

A.auditOrExit(R, P, { allow: [["wire.rs", "wire.rs.term"], ["wire.cfg", "wire.cfg.term"]], crowd: [["wire.rs", "wire.rs.term"], ["wire.cfg", "wire.cfg.term"]] });

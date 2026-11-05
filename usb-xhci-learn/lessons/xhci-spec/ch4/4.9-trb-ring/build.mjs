// §4.9 TRB 环 —— anatomy 机器「环运转台」+ 整页（2026-11-05 自含化改造：去互链、本节自建三模式机器）
// 判据：xHCI 1.2b §4.9 p149–170（4.9.1 p151 / 4.9.2 p152 / 4.9.3 p160 / 4.9.4 p161）；
//   EHB/DESI 位判据取自 §5.5.2.3.3 p393（Table 5-42）。引文六条逐字（自旧 table_page 量产件移植）。
// 机器概念：一台环形卡柜运转台——9 槽环轨（8 数据 TRB 槽 + 第 9 槽 Link TRB）悬在四柱上，
//   中央立柱顶出双针：压卡头针＝入队指针（生产方推进、写 Cycle=PCS）、取卡钳针＝出队指针
//   （消费方比对 Cycle=CCS 相等才执行）；过 Link 槽（Toggle Cycle=1）双方各翻一次 PCS/CCS；
//   前面板模式钮三档切传输环/命令环/事件环——命令环单 TRB 无 Chain、门铃 0、CRCR 管起点；
//   事件环方向反转（xHC 生产/驱动消费），出队指针落成物理寄存器 ERDP，分段走 ERST。
// 接线铁律（2026-11-05 4.12 实锤坑）：body 拼进 k.pageHtml({body, script}) 参数、样式进页面
//   自己的 <style> 块——禁止对 pageHtml 产物做 page.replace("</body>", …) 后注入（kit 源码
//   内嵌 pageHtml 模板串含字面 </body>，首个命中落在 module 脚本内部，注入即整页 JS 崩）。
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
const W = 980, H = 690, AZ = 33, EL = 32;
const PLATE = { x: -215, y: -125, w: 430, d: 250, r: 9 };
const PLATE_H = 12, FOOT_H = 5;
const C = [0, -8];                                   // 环心
const RING = { rIn: 56, rOut: 74, z0: 18, z1: 26, mid: 65 };
const rad = (d) => (d * Math.PI) / 180;
const SLOT_ANG = Array.from({ length: 9 }, (_, i) => 90 - 40 * i); // 槽 0 在前，顺时针，槽 8＝Link 在前左
const SLOT_POS = SLOT_ANG.map((a) => [C[0] + RING.mid * Math.cos(rad(a)), C[1] + RING.mid * Math.sin(rad(a))]);
const CARD = { z0: 28.5, zTop: 44.5, z1: 46.2 };
const NEEDLE = {
  enq: { z0: 48.4, z1: 49.8, tipR: 72 },
  deq: { z0: 54.4, z1: 55.8, tipR: 72 },
  hubR: 2.2,
};
// 前低控台（收窄至 x+40：投影 bbox 不进前卡文字带——遮挡探针实证定位）
const PANEL = { x: -80, y: 80, w: 120, d: 18, r: 2, z1: 21.5, faceY: 98.05, btnZ: 17.5,
  btns: [{ x: -66 }, { x: -50 }, { x: -34 }],
  wins: { enq: { x: -20, z0: 13.5, z1: 20.5 }, deq: { x: -5, z0: 13.5, z1: 20.5 }, pcs: { x: 9, z0: 13.5, z1: 20.5 }, ccs: { x: 23, z0: 13.5, z1: 20.5 } },
  lamps: { empty: { x: 34, z: 19 }, full: { x: 34, z: 15.2 } } };
// 左：驱动文书台
const DESK = { x: -205, y: -70, w: 68, d: 132, r: 3 };
const BELL = { base: { x: -180, y: 20, w: 40, d: 12, r: 1.2 }, panel: { x: -178, y: 26, w: 36, d: 3, r: 1 }, z0: 33, z1: 52, faceY: 29.05,
  dial: { x0: -176, x1: -160, z0: 37, z1: 46 }, btn: { x: -150, z: 42 } };
const TRAY = { x: -160, y: -60, w: 26, d: 20, r: 1.4 };
// 右：xHC 总控台
const CON = { x: 137, y: -70, w: 68, d: 132, r: 3, bodyZ: 38, lidZ: 41, faceY: 62.05,
  crcr: { x0: 141, x1: 169, z0: 22, z1: 36 }, erdp: { x0: 173, x1: 201, z0: 22, z1: 36 } };
// Toggle Cycle 小闸（Link 槽外角）
const d8 = [Math.cos(rad(130)), Math.sin(rad(130))], p8 = [-d8[1], d8[0]];
const TOGGLE = { x: C[0] + 71 * d8[0] + 7.5 * p8[0], y: C[1] + 71 * d8[1] + 7.5 * p8[1], z0: 28.5, z1: 32.5, baseAng: 80 };
// 通知缆（门铃信号去程 / 完成事件与中断回程 / ERDP 写入去程）
const WIRE = [[-155, 65.9, 16], [-155, 74, 14.2], [-155, 107, 13.2], [155, 107, 13.2], [155, 74, 14.2], [155, 65.9, 16]];

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
   [-215, -125, 60], [215, 125, 60], [0, 76, 33], [0, 107, 16],
   [-208, 65, 52], [-142, -73, 52], [134, -73, 41], [206, 65, 41],
   [-80, 60, 46], [80, -76, 46], [0, 74, 26], [0, -90, 26]],
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
const FLOOR = { o: [0, 0, 0], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] };
const FBED = { o: [C[0], C[1], 0], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] };

// live 数据（wires 路线后补）
const DATA = {
  P, KS, W, H, C,
  ring: RING, slots: SLOT_POS.map(([x, y]) => [x, y]),
  card: CARD, needle: NEEDLE,
  panel: { faceY: PANEL.faceY, btns: PANEL.btns, btnZ: PANEL.btnZ, wins: PANEL.wins, lamps: PANEL.lamps },
  bell: { faceY: BELL.faceY, dial: BELL.dial, btn: BELL.btn },
  con: { faceY: 63.65, crcr: CON.crcr, erdp: CON.erdp },
  desk: { tray: { x: TRAY.x + TRAY.w / 2, y: TRAY.y + TRAY.d / 2 } },
  toggle: TOGGLE,
  wire: WIRE.map((p) => p.map(f2)),
  modeNames: ["传输环", "命令环", "事件环"],
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

// 贴面文字收集（markup，组装时入 labels 层）
const labels = [];
const labelText = (svg) => { labels.push(svg); };

// ================= 底座 =================
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
    + screwDots(PLATE, 11, PLATE_H);
  put("stand.plate", [0, 0, PLATE_H / 2], svg, [record(A.slab(PLATE, 0, PLATE_H, { name: "stand.plate", ground: true }, 8))]);
}
{ // 标尺条（后沿左）+ 铭牌（后沿右）+ 台名刻字（前沿左）
  const strip = { x: -170, y: -111, w: 130, d: 6.5, r: 1 };
  const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4.4, 5, strip.y + 0.8, PLATE_H + 0.6, [2, 3.6], P);
  slab("stand.ruler", strip, PLATE_H, 0.6, { tone: "lo", crease: "none" },
    { steps: 3, extra: Ln(t.minor, { tone: "lo" }) + Ln(t.major, { tone: "mid" }) });
  const lab = { x: 118, y: -112, w: 66, d: 11, r: 1.2 };
  slab("stand.label", lab, PLATE_H, 0.8, { tone: "lo", crease: "none" },
    { steps: 3, extra: Ln(k.planOutline(k.insetPlan(lab, 1.6), PLATE_H + 0.8, P, 3), { tone: "faint" })
      + Ln([20, 14, 17].map((w2, i) => k.lineOnTop([lab.x + 4, lab.y + 4 + i * 3.4], [lab.x + 4 + w2, lab.y + 4 + i * 3.4], PLATE_H + 0.8, P)).join(""), { tone: "lo", free: true })
      + Dots([[lab.x + lab.w - 2.8, lab.y + 2.8], [lab.x + lab.w - 2.8, lab.y + lab.d - 2.8]].map(([x, y]) => at([x, y, PLATE_H + 0.8])), { size: 0.45 }) });
  labelText(topText([-150, 118], PLATE_H + 0.02, "环运转台 · Ring Turntable", 4.6, "mid", "start"));
}

// ================= 环形卡柜（TRB 环） =================
for (const aDeg of [110, -10, -90, -170]) { // 四柱（避开 9 槽位角）
  const px = C[0] + RING.mid * Math.cos(rad(aDeg)), py = C[1] + RING.mid * Math.sin(rad(aDeg));
  cyl(`ring.post.${aDeg}`, px, py, 3.2, PLATE_H, RING.z0 - PLATE_H, { tone: "mid" }, { steps: 18 });
}
{
  const bed = S(G.ringBand(RING.z0, RING.z1, RING.rIn, RING.rOut, FBED, P), { tone: "mid" })
    + Ln(G.circleOf(FBED, RING.z1 + 0.02, RING.rOut, P), { tone: "lo" })
    + Ln(G.circleOf(FBED, RING.z1 + 0.02, RING.rIn, P), { tone: "lo" });
  put("ringbed", [C[0], C[1], (RING.z0 + RING.z1) / 2], bed, [record(A.ring(FBED, RING.z0, RING.z1, RING.rIn, RING.rOut, { name: "ringbed" }))]);
  labelText(Dots(Array.from({ length: 24 }, (_, i) => {
    const a = rad(i * 15);
    return at([C[0] + 71.4 * Math.cos(a), C[1] + 71.4 * Math.sin(a), RING.z1 + 0.02]);
  }), { size: 0.55, tone: "lo" }));
}
// 9 个卡槽座（径向条；槽 8＝Link 特型）
for (let i = 0; i < 9; i++) {
  const d = [Math.cos(rad(SLOT_ANG[i])), Math.sin(rad(SLOT_ANG[i]))];
  const p = [-d[1], d[0]];
  const corner = (r, hw) => [C[0] + r * d[0] + hw * p[0], C[1] + r * d[1] + hw * p[1]];
  const poly = [corner(56.5, 9.5), corner(73.5, 9.5), corner(73.5, -9.5), corner(56.5, -9.5)];
  put(`socket.${i}`, [SLOT_POS[i][0], SLOT_POS[i][1], 27.2],
    S(G.prismOf(FLOOR, poly, RING.z1, RING.z1 + 2.5, P), { tone: i === 8 ? "mid" : "lo", crease: "none" }),
    [record(A.prism(FLOOR, poly, RING.z1, RING.z1 + 2.5, { name: `socket.${i}`, owner: "ringbed" }))], { bias: 0.1 });
  // 槽号 + 刻线（刻在台面外圈 r82——针尖 r72 与盾牌 bbox 之外，指针永不遮号）
  const npos = [C[0] + 82 * d[0], C[1] + 82 * d[1]];
  labelText(Ln(path3([[C[0] + 75.5 * d[0], C[1] + 75.5 * d[1], PLATE_H + 0.02], [C[0] + 78.5 * d[0], C[1] + 78.5 * d[1], PLATE_H + 0.02]]), { tone: "lo" })
    + topText(npos, PLATE_H + 0.02, String(i), 3.6, "lo"));
}
// 回绕点列（Link 槽 → 槽 0；live 点亮）
{
  const pts = [];
  for (let j = 0; j <= 6; j++) {
    const a = rad(121.5 - j * 3.75);
    pts.push(at([C[0] + 57.2 * Math.cos(a), C[1] + 57.2 * Math.sin(a), RING.z1 + 0.02]));
  }
  const tip = at([C[0] + 57.2 * Math.cos(rad(95)), C[1] + 57.2 * Math.sin(rad(95)), RING.z1 + 0.02]);
  labelText(`<g class="wrapdots">${Dots(pts, { size: 1.0, tone: "lo" })}${Dots([tip], { size: 1.8, tone: "lo" })}</g>`);
}
// Toggle Cycle 小闸（Link 槽外角；live 扳动）
put("toggle", [TOGGLE.x, TOGGLE.y, 30.5], `<g data-part="toggle">${geo.toggleSvg(0, 0)}</g>`,
  [record(A.cylinder(TOGGLE.x, TOGGLE.y, 1.3, TOGGLE.z0, TOGGLE.z1 - TOGGLE.z0, { name: "toggle", owner: "socket.8" }, 14)),
   record(A.prism({ o: [TOGGLE.x, TOGGLE.y, TOGGLE.z0 + 2.2], a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] },
     [[-0.6, -0.6], [Math.cos(rad(TOGGLE.baseAng)) * 4.8 - 0.6, Math.sin(rad(TOGGLE.baseAng)) * 4.8 - 0.6], [Math.cos(rad(TOGGLE.baseAng)) * 4.8 + 0.6, Math.sin(rad(TOGGLE.baseAng)) * 4.8 + 0.6], [-0.6, 0.6]], -0.6, 0.6, { name: "toggle.arm", owner: "toggle" }))],
  { bias: 0.2 });

// ================= 中央立柱 + 双针 =================
cyl("hub.plinth", C[0], C[1], 9, PLATE_H, 2, { tone: "lo" }, { steps: 26 });
cyl("hub.column", C[0], C[1], 6, PLATE_H + 2, 12, { tone: "mid" }, { steps: 22 });
cyl("hub.drum", C[0], C[1], 10.5, 26, 14, { tone: "mid" }, { steps: 30 });
labelText(Dots(Array.from({ length: 16 }, (_, i) => {
  const a = rad(i * 22.5 + 11);
  return at([C[0] + 10.5 * Math.cos(a), C[1] + 10.5 * Math.sin(a), 39.5]);
}), { size: 0.5, tone: "lo" }));
cyl("hub.shaft", C[0], C[1], 2.2, 40, 16, { tone: "mid" }, { steps: 18 });
{
  const FF = { o: [C[0], C[1], 0], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] };
  const prof = [[56, 0], [55.6, 1.4], [56.6, 2.4], [58.2, 3.0], [59.6, 0.6], [59.8, 0]];
  put("hub.finial", [C[0], C[1], 58], S(G.solidOf(prof, FF, P, { steps: 26 }), { tone: "hi" }),
    [record(A.solid(FF, prof, { name: "hub.finial", owner: "hub.shaft" }))], { bias: 0.3 });
}
// 双针（静止位＝槽 0；build 生成形状入审计，live 逐帧重建）
function needleShapes(which, angDeg) {
  const nz = which === "enq" ? NEEDLE.enq : NEEDLE.deq;
  const d = [Math.cos(rad(angDeg)), Math.sin(rad(angDeg))], p = [-d[1], d[0]];
  const w = (r, hw) => [C[0] + r * d[0] + hw * p[0], C[1] + r * d[1] + hw * p[1]];
  // 梁／配重臂独立且梁分三段（与 geometry-live.needleSvg 同形）
  const hwAt = (r) => 2.4 + (1.2 - 2.4) * (r - 2.0) / (nz.tipR - 2.0);
  const shapes = [];
  for (const [r0, r1] of [[2.0, 26], [26, 50], [50, nz.tipR]]) {
    shapes.push(A.prism(FLOOR, [w(r0, hwAt(r0)), w(r1, hwAt(r1)), w(r1, -hwAt(r1)), w(r0, -hwAt(r0))].map(([x, y]) => [x, y]), nz.z0, nz.z1, { name: `needle.${which}` }));
  }
  shapes.push(A.prism(FLOOR, [w(-2.0, 2.4), w(-15, 3.0), w(-15, -3.0), w(-2.0, -2.4)].map(([x, y]) => [x, y]), nz.z0, nz.z1, { name: `needle.${which}.arm`, owner: `needle.${which}` }));
  const cb = w(-16.5, 0);
  shapes.push(A.cylinder(cb[0], cb[1], 4.2, nz.z0 - 0.2, nz.z1 - nz.z0 + 0.4, { name: `needle.${which}.cw`, owner: `needle.${which}` }));
  shapes.push(A.prism(FLOOR, [w(64, 0.45), w(68.5, 0.45), w(68.5, -0.45), w(64, -0.45)].map(([x, y]) => [x, y]), nz.z1, nz.z1 + 1.2, { name: `needle.${which}.shield`, owner: `needle.${which}` }));
  if (which === "enq") {
    for (const r of [63.5, 66.5]) {
      const q = w(r, 1.8);
      shapes.push(A.cylinder(q[0], q[1], 0.8, 48.0, 0.7, { name: `needle.enq.rod`, owner: "needle.enq" }));
    }
    shapes.push(A.prism(FLOOR, [w(61.5, 2.5), w(68.5, 2.5), w(68.5, -2.5), w(61.5, -2.5)].map(([x, y]) => [x, y]), 46.9, 48.3, { name: "needle.enq.foot", owner: "needle.enq" }));
  } else {
    shapes.push(A.prism(FLOOR, [w(61.5, 9.5), w(68.5, 9.5), w(68.5, -9.5), w(61.5, -9.5)].map(([x, y]) => [x, y]), nz.z0 - 1.2, nz.z0, { name: "needle.deq.yoke", owner: "needle.deq" }));
    for (const t of [8.2, -8.2]) {
      const q = w(65, t);
      shapes.push(A.cylinder(q[0], q[1], 0.8, 46.9, nz.z0 - 1.2 - 46.9, { name: "needle.deq.claw", owner: "needle.deq" }));
    }
  }
  return shapes;
}
// 双针是逐帧动件（live 每帧重建）：形状入 R.solids 供支撑/间距审计，但不进静态画家序
// （径向梁跨环轨前后景深区，单键画家序必出环；绘制序恒在 actors 顶层——双针 z ≥ 46.9
// 高于全部静件（卡顶 46.2），钟顶饰 z 56+ 只在柱心 r ≤ 3.2 与针根无屏面交，4× 截图核）。
for (const sh of needleShapes("enq", 90)) record(sh);
for (const sh of needleShapes("deq", 90)) record(sh);

// TRB 卡 ×9（display:none；live 注入内容）
for (let i = 0; i < 9; i++) {
  const [cx, cy] = SLOT_POS[i];
  put(`card.${i}`, [cx, cy, 37], `<g data-card="${i}" style="display:none"></g>`,
    [record(A.box([cx - 7, cy - 1.8, CARD.z0], [cx + 7, cy + 1.8, CARD.z1], { name: `card.${i}`, owner: `socket.${i}` }))], { bias: 0.2 });
}

// ================= 前低控台（三键模式钮 + 读数窗 + 空/满） =================
slab("panel.body", { x: PANEL.x, y: PANEL.y, w: PANEL.w, d: PANEL.d, r: PANEL.r }, PLATE_H, PANEL.z1 - PLATE_H, { tone: "mid" },
  { steps: 3, bevel: 0.5, extra: screwDots({ x: PANEL.x + 3, y: PANEL.y + 3, w: PANEL.w - 6, d: PANEL.d - 6 }, 5, PANEL.z1) });
{
  const y = PANEL.faceY;
  for (const [ix, b] of PANEL.btns.entries()) {
    const kF = G.frameOf([b.x, y + 0.05, PANEL.btnZ], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    put(`panel.btn${ix}`, [b.x, y + 1.2, PANEL.btnZ], S(G.disc(0, 0.4, 3.0, kF, P, { steps: 22, bevel: 0.2 }), { tone: "lo" })
      + Ln(G.circleOf(kF, 0.4, 3.0, P, 22), { tone: "lo" }),
      [record(A.disc(kF, 0, 0.4, 3.0, { name: `panel.btn${ix}`, owner: "panel.body" }))], { bias: 0.2 });
  }
  labelText(
    vtext(PANEL.btns[0].x, y, 13.2, "传输", 2.6, "lo", "middle")
    + vtext(PANEL.btns[1].x, y, 13.2, "命令", 2.6, "lo", "middle")
    + vtext(PANEL.btns[2].x, y, 13.2, "事件", 2.6, "lo", "middle")
    + `<g data-part="knob">${geo.knobSvg(0)}</g>`
    + `<g data-part="win-enq">${geo.winSvg("enq", "槽 0")}</g>`
    + `<g data-part="win-deq">${geo.winSvg("deq", "槽 0")}</g>`
    + `<g data-part="win-pcs">${geo.winSvg("pcs", 1)}</g>`
    + `<g data-part="win-ccs">${geo.winSvg("ccs", 1)}</g>`);
}
// 空/满窗（立柱鼓面）
labelText(`<g data-part="st-empty">${geo.stateWinSvg("empty", 0)}</g>`
  + `<g data-part="st-full">${geo.stateWinSvg("full", 0)}</g>`);

// ================= 驱动文书台（左，蓝） =================
slab("desk.body", DESK, PLATE_H, 15, { tone: "mid" }, { steps: 4, bevel: 0.6, inner: Ln(k.planOutline(k.insetPlan(DESK, 3), 24, P, 4), { tone: "faint" }) });
slab("desk.top", { x: DESK.x - 3, y: DESK.y - 3, w: DESK.w + 6, d: DESK.d + 6, r: 2.5 }, 27, 3, { tone: "mid" },
  { steps: 4, bevel: 0.4, extra: Ln(k.planOutline(k.insetPlan({ x: DESK.x - 3, y: DESK.y - 3, w: DESK.w + 6, d: DESK.d + 6, r: 2.5 }, 3), 30, P, 4), { tone: "lo" }) });
labelText(topText([-171, 54], 30.02, "xHCI 驱动 · 生产侧", 6.6, "drv") + topText([-171, 45], 30.02, "规范称 system software", 4, "mid"));
for (let i = 0; i < 3; i++) {
  slab(`tdstack.${i}`, { x: -196, y: -52 + i * 0.3, w: 22, d: 18, r: 0.8 }, 30 + i * 0.5, 1.4, { tone: i === 2 ? "hi" : "lo", crease: "none" }, { steps: 2 });
}
labelText(topText([-185, -28], 32.02, "TD 卡堆", 4.2, "mid"));
slab("desk.tray", TRAY, 30, 3.6, { tone: "hi" }, { steps: 3, bevel: 0.4 });
slab("desk.tray.lip", { x: TRAY.x + 2, y: TRAY.y + TRAY.d, w: TRAY.w - 4, d: 1.6, r: 0.6 }, 30, 5.2, { tone: "mid" });
labelText(topText([-147, -44], 33.62, "事件匣", 4.2, "mid"));
{ // 门铃台
  slab("bell.base", BELL.base, 30, 3, { tone: "lo" }, { steps: 2 });
  slab("bell.panel", BELL.panel, BELL.z0, BELL.z1 - BELL.z0, { tone: "mid" }, { steps: 2, extra: screwDots({ x: BELL.panel.x + 2, y: BELL.panel.y + 0.4, w: BELL.panel.w - 4, d: BELL.panel.d - 0.8 }, 3, BELL.z1) });
  labelText(
    vtext(BELL.panel.x + 2.5, BELL.faceY, BELL.z1 - 3.4, "门铃 · 通知缆", 4.4, "hi")
    + `<g data-part="dbdial">${geo.dbDialSvg(null)}</g>`
    + vtext(BELL.btn.x, BELL.faceY, BELL.btn.z - 5.2, "按铃", 3.4, "lo", "middle"));
  put("bell.btn", [BELL.btn.x, BELL.panel.y + 2, BELL.btn.z], `<g data-part="bellbtn">${geo.bellBtnSvg(0)}</g>`,
    [record(A.ring(G.frameOf([BELL.btn.x, BELL.faceY + 0.05, BELL.btn.z], [0, 1, 0], [1, 0, 0], [0, 0, 1]), 0, 0.85, 2.4, 3.0, { name: "bell.btn", owner: "bell.panel" }))], { bias: 0.3 });
}
{ // 通知缆端口（文书台前立面）
  const bf = G.frameOf([-155, 62.05, 16], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  put("desk.port", [-155, 63.2, 16], S(G.disc(0, 2.6, 2.0, bf, P, { steps: 18, bevel: 0.3 }), { tone: "mid" })
    + Ln(G.circleOf(bf, 2.6, 2.0, P, 18), { tone: "lo" }),
    [record(A.disc(bf, 0, 2.6, 2.0, { name: "desk.port", owner: "desk.body" }))], { bias: 0.2 });
}

// ================= xHC 总控台（右，金） =================
slab("con.body", CON, PLATE_H, CON.bodyZ - PLATE_H, { tone: "mid" }, { steps: 4, bevel: 0.8, inner: Ln(k.sideSeam(CON, 34, P, 4), { tone: "faint" }) });
slab("con.lid", { x: CON.x - 3, y: CON.y - 3, w: CON.w + 6, d: CON.d + 6, r: 2.5 }, CON.bodyZ, 3, { tone: "mid" },
  { steps: 4, bevel: 0.5, extra: screwDots({ x: CON.x - 1, y: CON.y - 1, w: CON.w + 2, d: CON.d + 2 }, 8, CON.lidZ) });
labelText(topText([171, 28], CON.lidZ + 0.02, "xHC 控制器", 7.2, "hc") + topText([171, 18], CON.lidZ + 0.02, "消费侧 · 指针寄存器", 4, "mid"));
{ // CRCR / ERDP 寄存器牌（凸装：0.15 嵌体、1.55 出立面）
  for (const [key, rg] of [["crcr", CON.crcr], ["erdp", CON.erdp]]) {
    const plan = { x: rg.x0, y: 61.9, w: rg.x1 - rg.x0, d: 1.7, r: 0.8 };
    slab(`con.${key}`, plan, rg.z0, rg.z1 - rg.z0, { tone: "mid" }, { steps: 2, inner: Ln(k.planOutline(k.insetPlan(plan, 1), rg.z1, P, 3), { tone: "faint" }) });
    labelText(vtext(rg.x0 + 1.5, 63.65, rg.z1 - 2.8, key.toUpperCase() + " · " + (key === "crcr" ? "命令环" : "事件环"), 3.2, "hi")
      + `<g data-part="reg-${key}">${geo.regSvg(key, null)}</g>`);
  }
}
{ // 中断灯（事件环模式点亮）
  const lx = 152, ly = -55;
  cyl("con.irqseat", lx, ly, 2.4, CON.lidZ, 1.4, { tone: "lo" }, { steps: 16 });
  const lf = G.frameOf([lx, ly, CON.lidZ + 1.4], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  put("con.irq", [lx, ly, CON.lidZ + 2.8], `<g class="lamp" data-lamp="irq">` + S(G.solidOf([[0, 0.2], [1, 2, 1], [2.2, 2.6, 1], [3, 2, 1], [3.4, 0.3]], lf, P, { steps: 20 }), { tone: "hi" }) + `</g>`,
    [record(A.solid(lf, [[0, 0.2], [1, 2, 1], [2.2, 2.6, 1], [3, 2, 1], [3.4, 0.3]], { name: "con.irq", owner: "con.irqseat" }))], { bias: 0.3 });
  labelText(topText([lx, ly + 9], CON.lidZ + 0.02, "中断", 4, "lo"));
}
{ // 通知缆端口（总控台前立面）
  const bf = G.frameOf([155, 62.05, 16], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  put("con.port", [155, 63.2, 16], S(G.disc(0, 2.6, 2.0, bf, P, { steps: 18, bevel: 0.3 }), { tone: "mid" })
    + Ln(G.circleOf(bf, 2.6, 2.0, P, 18), { tone: "lo" }),
    [record(A.disc(bf, 0, 2.6, 2.0, { name: "con.port", owner: "con.body" }))], { bias: 0.2 });
}

// ================= 模式注记牌（命令环 / 事件环） =================
function notePlate(name, x, lines) {
  const plan = { x, y: 82.2, w: 58, d: 1.8, r: 1 };
  put(name, [x + 29, 83.1, 23], `<g data-note="${name === "note.cmd" ? "cmd" : "evt"}" style="display:none">`
    + S(k.slabOf(plan, PLATE_H, 22, P, 2), { tone: "mid" })
    + Ln(k.planOutline(k.insetPlan(plan, 1.2), PLATE_H + 22, P, 3), { tone: "lo" })
    + Dots([[x + 3, 84.3, PLATE_H + 20], [x + 55, 84.3, PLATE_H + 20]].map((p) => at(p)), { size: 0.45 })
    + lines.map((l, i) => vtext(x + 3, 84.05, PLATE_H + 17.8 - i * 5.0, l[0], l[1], l[2] || "start")).join("") + `</g>`,
    [record(A.slab(plan, PLATE_H, 22, { name }, 2))], { bias: 0.15 });
}
notePlate("note.cmd", -142, [
  ["命令环 · 全规范仅一条", "hi"], ["单命令单 TRB · 无 Chain", "mid"],
  ["门铃 0 · DB Target=0", "mid"], ["停机 CRR=0 写 CRCR 重载出队针", "lo"],
]);
notePlate("note.evt", 84, [
  ["事件环 · 方向反转", "hi"], ["xHC 生产 · 驱动消费", "mid"],
  ["出队针＝物理寄存器 ERDP", "mid"], ["段表 ERST · 每段 ≥16 TRB", "lo"],
]);

// ================= 通知缆（门铃/完成事件/中断/写 ERDP） =================
{
  const route = G.fillet(WIRE, 3.2, 9, { P, tube: 0.6 });
  R.route("wire.notify", route, 0.6, { piece: "bench", limp: true, tips: [null, null], ends: [false, false] });
  tubePieces(route, 0.6, P, { maxLength: 18 }).forEach((piece, index) => {
    put(`wire.notify:${index}`, piece.mid, tubeSvg(piece, { tone: "lo" }), [A.tube(piece.points, piece.radii)], { bias: 0.05, route: "wire.notify", chunk: index });
  });
}

// ================= settle + assemble =================
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const itemG = (it) => `<g class="it" data-name="${it.name}"${it.attrs ?? ""}>${it.svg}</g>`;
const seq = R.items.map(itemG);
seq.push(`<g class="fb-labels">${labels.join("")}</g>`);
seq.push(`<g data-part="needle-enq" data-role="drv">${geo.needleSvg("enq", 90, 0)}</g>`);
seq.push(`<g data-part="needle-deq" data-role="hc">${geo.needleSvg("deq", 90, 0)}</g>`);
seq.push(`<g data-part="actors-tokens"></g><g data-part="actors-events"></g>`);
const svg = k.figureSvg({
  width: W, height: H,
  label: "环运转台：一台三模式机器——中央立柱顶出双针，压卡头针＝入队指针（生产方推进、写 Cycle 位＝PCS），取卡钳针＝出队指针（消费方比对 Cycle 位＝CCS，相等才执行）；9 槽环轨上 8 槽数据 TRB 加第 9 槽 Link TRB（Toggle Cycle=1：过槽双方各翻一次 PCS/CCS）；前面板模式钮切传输环/命令环/事件环——命令环单 TRB 无 Chain、门铃 0、CRCR 管起点；事件环方向反转（xHC 生产/驱动消费），出队指针落成物理寄存器 ERDP，分段走 ERST（每段 ≥16 TRB）。",
  body: [...back, `<g class="fb-stage">${seq.join("")}</g>`].join(""),
});

// ================= figure CSS =================
const DRV = THEME === "light" ? "#2d5fb3" : "#7c9ff0";
const HC = THEME === "light" ? "#8a5f14" : "#d9a860";
const CSS = `
.fb-stage { --lamp-glow: ${THEME === "light" ? "#d98428" : "#ffb45e"}; --lamp-ink: ${THEME === "light" ? "#c96a12" : "#ffd9a0"}; }
.iso-face-text[data-tone="drv"] { fill: ${DRV}; }
.iso-face-text[data-tone="hc"] { fill: ${HC}; }
.fb-stage .lamp path { fill: var(--anatomy-shade-2); transition: fill 300ms; }
.fb-stage .lamp.on path { fill: var(--lamp-ink); }
.fb-stage .lamp.on { filter: drop-shadow(0 0 6px var(--lamp-glow)); }
.fb-stage [data-part="needle-enq"] .nshield > path, .fb-stage [data-part="needle-deq"] .nshield > path { fill: var(--anatomy-shade-1); }
.fb-stage [data-part="needle-enq"][data-role="drv"] .nshield > path, .fb-stage [data-part="needle-deq"][data-role="drv"] .nshield > path { fill: ${DRV}; }
.fb-stage [data-part="needle-enq"][data-role="hc"] .nshield > path, .fb-stage [data-part="needle-deq"][data-role="hc"] .nshield > path { fill: ${HC}; }
.fb-stage .wrapdots circle { fill: var(--anatomy-lo); transition: fill 300ms, r 300ms; }
.fb-stage .wrapdots.lit circle { fill: ${HC}; filter: drop-shadow(0 0 7px ${HC}); transform-box: fill-box; transform-origin: center; transform: scale(1.9); }
.fb-stage [data-card].hot .iso-solid > path { stroke: ${HC}; }
.tok rect { fill: var(--anatomy-paper); stroke: var(--anatomy-line-mid); }
.tok.drv rect { stroke: ${DRV}; }
.tok.hc rect { stroke: ${HC}; }
.tok text { font: 600 6.5px var(--anatomy-ui, sans-serif); fill: var(--anatomy-line-hi); }
.tok.drv text { fill: ${DRV}; }
.tok.hc text { fill: ${HC}; }
.tcard rect { fill: ${THEME === "light" ? "#f4f2ee" : "#232327"}; stroke: ${HC}; }
.tcard text { font: 600 5px var(--anatomy-ui, sans-serif); fill: ${HC}; }
@media (prefers-reduced-motion: reduce) { .fb-stage * { transition: none !important; } }
`;

// ================= 页面（prose/quotes/三表自旧 table_page 量产件逐字移植） =================
const navHtml = `
<div class="xsp-nav">
  <a href="../../index.html">← 规范目录</a>
  <span class="ttl">§4.9 TRB 环</span>
  <a href="../4.8-endpoint/index.html">← 上一节 §4.8 端点</a>
</div>
<p class="xsp-specref">xHCI 1.2b §4.9 TRB Ring（4.9.1 传输描述符 · 4.9.2 传输环管理 · 4.9.3 命令环管理 · 4.9.4 事件环管理）· p149–170</p>`;

const proseHtml = `<div class="xsp-card"><h2>规范要义</h2>
<p>一条 <b>TRB 环</b>＝TRB 数据结构的<b>循环队列</b>，在生产者与消费者之间传递工作项——Work Item 由 1 个以上 TRB 组成，既可以是「待执行的操作」，也可以是「已执行的结果」（p149–150）。环分三种——<b>传输环 / 事件环 / 命令环</b>——各自的 TRB 类型集互不通用，但共用同一套底层机制与 TRB 模板（p150）。方向一句话：传输环与命令环由驱动生产、xHC 消费；事件环倒过来，xHC 生产、驱动消费（规范原文称 system software（系统软件））。三环机制的动态画面见本节机器「环运转台」——环几何、Cycle 位置标记、Link TRB 回绕与生产/消费双指针逐帧演进。</p>
<p>指针与位置标记：<b>传输环、命令环的 Enqueue / Dequeue 指针都不是物理寄存器</b>——xHC 与软件各自维护镜像副本（facsimile），入队位置由 Cycle bit 的翻转标记（p150 Note、p153）；<b>事件环只有出队指针是物理寄存器 ERDP</b>（Runtime 寄存器，p150 Note），入队指针 EREP 只是 xHC 内部变量（p164 Table 4-4）。初建或重初始化时全环 TRB 清 0，代表空队列（p151）；生产者按 PCS 值写 Cycle bit，消费者拿 CCS 比对——相等才可执行（p153、p157）。空＝Dequeue 等于 Enqueue；满＝Enqueue+1 等于 Dequeue，这个 +1 必须把 Link TRB 算进去（p151、p156）。</p>
<p>条目与分段：<b>TD（传输描述符）＝1 个以上 TRB</b>，除最后一颗外全部置 Chain bit；命令/事件 TRB 没有 Chain bit，命令描述符与事件描述符单 TRB 成项（p151、p152 Note）。显式造一个零长 USB 事务＝单 Transfer TRB 且 Transfer Length=0（p151）。环可以分段：Link TRB 把多段连成一环，环可跨页、可动态伸缩，但不得跨 64KB 边界（p151、p154–155）；事件环的分段走<b>事件环段表（ERST）</b>，每段至少 16 个 TRB（p161–163）。命令环的独有约束：全规范只有一条命令环（§4.1 p68）、由 CRCR 管理（p150）、禁多 TRB TD（p160）。</p>
</div>`;

const quotesHtml = `<div class="xsp-card"><h2>原文对照</h2>
<div class="xsp-q"><div class="en">“A TRB (Transfer Request Block) Ring defines a queue, which is used to transfer Work Items between producer and consumer entities”</div>
<div class="zh">TRB 环就是一个队列——生产者与消费者之间传递工作项的通道。</div><div class="src">xHCI 1.2b §4.9 p149</div></div>
<div class="xsp-q"><div class="en">“There are 3 basic types or TRB Rings; Transfer, Event, and Command. Each type of ring defines an exclusive set of TRB data structures; however they all employ the underlying TRB Ring mechanism to organize their work items and the basic TRB template.”</div>
<div class="zh">环分三种：传输、事件、命令——TRB 类型集各自独占，底层机制与 TRB 模板共用。</div><div class="src">xHCI 1.2b §4.9 p150</div></div>
<div class="xsp-q"><div class="en">“If the Dequeue Pointer equals the Enqueue Pointer, then the TRB Ring is empty. If the "Enqueue Pointer + 1" = Dequeue Pointer, then the ring is full.”</div>
<div class="zh">空＝Dequeue 等于 Enqueue；满＝Enqueue+1 等于 Dequeue——+1 要把 Link TRB 算进去。</div><div class="src">xHCI 1.2b §4.9 p151</div></div>
<div class="xsp-q"><div class="en">“The Cycle bit field in a TRB identifies the location of the Enqueue Pointer in a Transfer Ring, eliminating the need to define a physical Enqueue Pointer register.”</div>
<div class="zh">Cycle bit 就是入队指针的位置标记——省掉一个物理 Enqueue 寄存器。</div><div class="src">xHCI 1.2b §4.9.2 p153</div></div>
<div class="xsp-q"><div class="en">“If the Producer encounters a Toggle Cycle flag set in a Link TRB it shall toggle the state of its PCS flag. If the Consumer encounters a Toggle Cycle flag set in a Link TRB it shall toggle the state of its CCS flag.”</div>
<div class="zh">遇 Toggle Cycle=1 的 Link TRB：生产者翻 PCS、消费者翻 CCS——回绕后双方的期望值各自翻转。</div><div class="src">xHCI 1.2b §4.9.2 p154</div></div>
<div class="xsp-q"><div class="en">“A fundamental difference between an Event Ring and a Transfer or Command Ring is that the xHC is the producer and system software is the consumer of Event TRBs.”</div>
<div class="zh">事件环与另两种环的根本差别：xHC 生产、系统软件消费。</div><div class="src">xHCI 1.2b §4.9.4 p161</div></div>
</div>`;

const cardsHtml = `
<div class="xsp-card"><h2>三环对照表：生产者 / 指针寄存器 / 空 / 满 / 门铃</h2>
<table class="xsp-tb">
<tr><th>环</th><th>生产者 → 消费者</th><th>指针的物理形态</th><th>空判据</th><th>满判据</th><th>门铃</th></tr>
<tr><td><b>传输环</b> Transfer Ring<br>（§4.9.2 p152–156）</td>
<td>驱动（host）→ xHC：producer (host) 在 Enqueue 处放、consumer (xHC) 在 Dequeue 处取（p152）；与 USB 管道 1:1（p150）</td>
<td>两根指针均非物理寄存器（p150 Note）；软件私有副本初值写进 Endpoint/Stream Context 的 TR Dequeue Pointer 字段（p153）；xHC 消费进度经 Transfer Event 的 TRB Pointer 字段报回（p153）</td>
<td>xHC 取 TRB 时见 Cycle bit 翻转 → 空（p153）</td>
<td>软件负责：推进 Enqueue 将等于 Dequeue 即满——不指向 Link TRB 时 +16 比对；指向时与 Ring Segment Pointer 比对（p156，总判据 p151）</td>
<td>设备上下文门铃（Doorbell 1–255，1:1 对应槽；DB Target/DB Stream ID 指明哪个传输环）——工作放上传输环后写（§4.7 p142）</td></tr>
<tr><td><b>命令环</b> Command Ring<br>（§4.9.3 p160–161）</td>
<td>驱动 → xHC；全规范仅一条命令环（§4.1 p68）</td>
<td>CRCR（Command Ring Control Register，Operational Registers，p150）；停机（CRR=0）时写 CRCR → 以 Command Ring Pointer 重载出队指针（p160）；消费进度经 Command Completion 事件上报（p160）</td>
<td>同传输环：Dequeue＝Enqueue，入队位置由 Cycle bit 翻转定义（p160）</td>
<td>管理其余方面与传输环一致（p160「All other aspects … identical」）</td>
<td>门铃寄存器 0，DB Target=0（Host Controller Command）（p160）</td></tr>
<tr><td><b>事件环</b> Event Ring<br>（§4.9.4 p161–170）</td>
<td>xHC → 驱动：根本差别在方向倒转（p161）；每个中断器各配一条事件环（p161）</td>
<td>仅出队指针是物理寄存器 ERDP（p150 Note、p161）；入队指针 EREP＝xHC 内部变量（p164 Table 4-4）</td>
<td>ERDP 所指 Event TRB 的 Cycle bit ≠ CCS → 环空；软件把 ERDP 写到该 TRB 地址宣告清空（p161 及其 Note）</td>
<td>xHC 侧：EREP+16＝ERDP 即满——特意留一格，给 Event Ring Full Error 腾位（p166–167 步 12–17、p167）</td>
<td>无门铃——xHC 写环后发中断，软件从中断处接着消费（p161）</td></tr>
</table>
<p>（TRB 统一规格：16 字节/颗（p151）；TRB 类型按环配额见规范 Table 6-91/6-92，p151 Note）</p></div>
<div class="xsp-card"><h2>Link TRB 与回绕要点表</h2>
<table class="xsp-tb">
<tr><th>要点</th><th>规范判据</th><th>页码</th></tr>
<tr><td>段尾定则</td><td>Ring Segment 的最后一颗 TRB 恒为 Link TRB；Link TRB 提供 64 位 Ring Segment Pointer 指向下一段</td><td class="mono">p155</td></tr>
<tr><td>单段成环</td><td>环尾插一颗指回环首的 Link TRB 即成环；多颗 Link TRB 可把多个段连成一环</td><td class="mono">p154</td></tr>
<tr><td>出队推进</td><td>xHC 每取一颗 +16 字节；下一颗若是 Cycle bit 有效的 Link TRB → 出队指针自动跳到其 Ring Segment Pointer 指向的段首</td><td class="mono">p156</td></tr>
<tr><td>入队推进</td><td>软件每写一颗推进一次：+16，或遇 Link TRB 重载为 Ring Segment Pointer；每过环一圈靠写 Cycle bit 完成翻转</td><td class="mono">p153、p156</td></tr>
<tr><td>Toggle Cycle</td><td>Link TRB 的 Toggle Cycle=1：生产者翻 PCS、消费者翻 CCS；Cycle bit 翻转发生在 Link TRB 与其指向段的首 TRB 之间</td><td class="mono">p154、p158 Note</td></tr>
<tr><td>初始化</td><td>全环 TRB 的 Cycle bit 清 0（p151、p157）；PCS 与 CCS 置 1（p157）；传输环 CCS 初值取 Endpoint Context DCS、命令环取 CRCR 的 RCS、事件环恒 1（p157 Note）</td><td class="mono">p151、p157</td></tr>
<tr><td>几何边界</td><td>环可大于一页但不得跨 64KB 边界（p151）；Link TRB 使环可跨页、可动态伸缩（p154）；TR Dequeue Pointer 与 Link TRB 不要求对齐页首（p158 Note）</td><td class="mono">p151、p154、p158</td></tr>
<tr><td>增缩段</td><td>只许生产者改自己拥有的 Link TRB（p158 Note、p160）；扩段两法：新段 Cycle bit 全清 0 并改两端 Toggle Cycle 标志，或新段全置 1（p159–160）</td><td class="mono">p158–160</td></tr>
</table></div>
<div class="xsp-card"><h2>事件环管理要点表</h2>
<table class="xsp-tb">
<tr><th>要点</th><th>规范判据</th><th>页码</th></tr>
<tr><td>事件环段表（ERST）</td><td>Base Address/Size 对的数组，每项定义一个段；ERST(0) 由 ERSTBA 指向；表项数＝ERSTSZ；0..ERSTSZ−1 的表项在 HCH=0 期间禁改</td><td class="mono">p161、p169 Note</td></tr>
<tr><td>段消费次序</td><td>xHC 按表项序填段，写入数超过 ERST.Size 即换下一段；ERST 本身按循环队列使用——取到 ERST(ERSTSZ−1) 后回绕 ERST(0)</td><td class="mono">p162</td></tr>
<tr><td>建环次序</td><td>先清 0 各段并填好 ERST 各项 → 写 ERSTSZ 与 ERDP（初值＝ERST(0).BaseAddress）→ 写 ERSTBA，事件环状态机进 Start 态；每段 Size ≥16</td><td class="mono">p162–163</td></tr>
<tr><td>ERDP 写法</td><td>写「最后处理的 Event TRB」地址（含「见失配即环空」情形）；两次连续写不得同值；尽量攒批——例如至少处理 4 条事件再写一次</td><td class="mono">p163、p165</td></tr>
<tr><td>EHB / DESI（ERDP 寄存器位）</td><td>EHB＝Event Handler Busy：IP 置 1 时硬件置 1，软件写 ERDP 时清 0（RW1C）；DESI＝出队所在段索引低 3 位，供 xHC 跳过查满加速入队</td><td class="mono">§5.5.2.3.3 p393（Table 5-42）</td></tr>
<tr><td>PCS / CCS</td><td>双方初值 1，各自回绕到环首时翻转；PCS 仅在事件环回绕到环首时翻转</td><td class="mono">p161、p164 Note</td></tr>
<tr><td>满的代价</td><td>判满留一格（p167）；主事件环满 → 全部命令/传输环停；副环满 → 可只停指向它的传输环；虚拟化下副环满不得拖停命令环/主环/其它副环（p168）；被堵的事件环可拖累其它事件环上端点的推进（p164 Note）</td><td class="mono">p164、p167–168</td></tr>
<tr><td>Primary / Secondary</td><td>MaxIntrs 定中断器数：0 号＝Primary，其余＝Secondary；副环只许 5 类事件 TRB（Transfer / Bandwidth Request / Device Notification / Host Controller / Vendor defined 可选）；Transfer TRB 的 Interrupter Target 非 0 即定向副环</td><td class="mono">p170</td></tr>
</table></div>`;

const machineCtlHtml = `<div class="fig-ctl" role="toolbar" aria-label="动画控制条">
  <button type="button" data-act="prev">◀ 上一帧</button>
  <button type="button" data-act="next">下一帧 ▶</button>
  <button type="button" data-act="mode">模式 ⏭</button>
  <button type="button" data-act="tour" aria-pressed="false">自动巡游</button>
  <button type="button" data-act="reset">⟲ 复位</button>
  <span class="fig-ctl-hint">键盘：空格/点击步进 · ← → 换帧 · M 切模式 · Home 回全景 · A 巡游</span>
</div>`;

const figCard = k.plateHtml({
  fig: "§4.9 机器",
  title: "环运转台：三环共用一套环机制",
  hint: "控制条步进/巡游 · 模式钮在画面控台 · ← → 换帧 · M 切模式",
  readout: "帧 0/12 · 传输环 · Enq 槽0 · Deq 槽0 · PCS 1 · CCS 1",
  keys: [
    { mark: "lit", label: "双针＝两根指针：压卡头针＝入队（生产方推进、卡顶翻牌写 Cycle=PCS），取卡钳针＝出队（消费方比对 Cycle=CCS 相等才执行）（p152–153）" },
    { mark: "raised", label: "过 Link 槽（Toggle Cycle=1）回绕：双方各翻一次 PCS/CCS——第二圈照常运转（p154）；空＝双针重合、满＝入队+1 撞上出队（+1 跨过 Link 槽算）（p151）" },
    { mark: "edge", label: "模式钮三档：传输环（驱动→xHC，端点门铃）/ 命令环（单 TRB 无 Chain · 门铃 0 · CRCR 管起点）/ 事件环（xHC→驱动 · 中断唤醒 · 写 ERDP · ERST 分段）（p160·p161）" },
    { mark: "dim", label: "设备不参与：环机制全部在主机内存里运转，设备只见总线上的包（p150）；命令环全规范仅一条（§4.1 p68）" },
  ],
  caption: "读数在前面板：Enq/Deq 槽号、PCS/CCS 期望值、空/满窗——p151 的两条判据在台上直接读出。",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="环运转台，十三帧三模式：传输环九帧（建环、生产、消费、Link 回绕双翻、第二圈、空、满），命令环两帧，事件环两帧。点击或空格步进。">${svg}<span role="status" aria-live="polite" data-status></span></div>` + machineCtlHtml + zoomBarHtml("放大看卡面文字 · 全屏后滚轮浏览 · 键盘 + − 0 F"),
});

const footerHtml = `<p class="xsp-foot">判据：xHCI 1.2b（625472 Rev 1.2b）§4.9 p149–170（EHB/DESI 位判据 §5.5.2.3.3 p393）· 引文逐字核对，证据见 <a href="EVIDENCE.md">EVIDENCE.md</a> · 生成于 2026-11-05</p>`;

const pageCss = `<style>
${CSS}${zoomFsCss()}
:root { --font-ui: -apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans CJK SC", "Segoe UI", sans-serif; --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace; }
.xsp-nav { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; margin: 4px 0 2px; font-family: var(--font-ui); font-size: 14px; color: var(--anatomy-muted); }
.xsp-nav .ttl { font-size: 20px; font-weight: 700; color: var(--anatomy-text); }
.xsp-nav a { color: var(--anatomy-link, #9cc3e0); text-decoration: none; } .xsp-nav a:hover { text-decoration: underline; }
.xsp-specref { font-family: var(--font-mono); font-size: 12.5px; color: var(--anatomy-muted); margin: 0 0 14px; }
.xsp-card { background: var(--anatomy-paper, #171f2a); border: 1px solid var(--anatomy-line-mid, #2a3444); border-radius: 8px; padding: 16px 22px; margin: 14px 0; }
.xsp-card h2 { font-family: var(--font-ui); font-size: 18px; margin: 2px 0 8px; color: var(--anatomy-text); }
.xsp-card p { margin: 8px 0; line-height: 1.95; color: var(--anatomy-text); font-size: 16.5px; }
.xsp-card p b { color: var(--anatomy-text); }
.xsp-card table.xsp-tb { width: 100%; border-collapse: collapse; margin: 10px 0 4px; font-family: var(--font-ui); }
.xsp-card table.xsp-tb th { font-size: 14px; color: var(--anatomy-muted); text-align: left; border-bottom: 1.5px solid var(--anatomy-line-mid, #456); padding: 5px 8px; }
.xsp-card table.xsp-tb td { font-size: 15px; color: var(--anatomy-text); border-bottom: 1px dashed var(--anatomy-line-lo, #334); padding: 6px 8px; vertical-align: top; }
.xsp-card table.xsp-tb td.mono { font-family: var(--font-mono); font-size: 13px; }
.xsp-card li { color: var(--anatomy-text); font-size: 16px; line-height: 1.9; margin: 4px 0 4px 18px; }
.xsp-q { margin: 12px 0; padding: 10px 16px; border-left: 3px solid var(--anatomy-line-hi, #556); }
.xsp-q .en { font-family: var(--font-ui); font-style: italic; color: var(--anatomy-muted); font-size: 14.5px; line-height: 1.8; }
.xsp-q .zh { color: var(--anatomy-text); font-size: 15.5px; margin-top: 4px; }
.xsp-q .src { font-family: var(--font-mono); font-size: 12px; color: var(--anatomy-muted); }
.xsp-foot { font-family: var(--font-ui); font-size: 13px; color: var(--anatomy-muted); margin-top: 18px; }
.xsp-foot a { color: var(--anatomy-link, #9cc3e0); }
.fig-wrap { margin: 6px 0; }
.fig-ctl { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 4px 6px 2px; }
.fig-ctl button { font: 500 13px var(--font-ui); color: var(--anatomy-muted); background: transparent; border: 1px solid var(--anatomy-line-mid, #456); border-radius: 4px; padding: 4px 12px; cursor: pointer; }
.fig-ctl button[aria-pressed="true"] { color: var(--anatomy-text); border-color: var(--anatomy-text); }
.fig-ctl button:hover { border-color: var(--anatomy-text); }
.fig-ctl .fig-ctl-hint { color: var(--anatomy-muted); font: 500 12px var(--font-mono, monospace); }
@media print { .fig-ctl { display: none; } }
@media (max-width: 900px){.xsp-card table.xsp-tb{display:block;overflow-x:auto}}
</style>`;

const body = pageCss + navHtml + proseHtml + quotesHtml + `<div class="fig-wrap">` + figCard + `</div>` + cardsHtml + footerHtml;

// 脚本拼接（body/script 走 pageHtml 参数——勿用 replace("</body>") 后注入，4.12 实锤坑）
const geoSource = readFileSync(join(HERE, "geometry-live.mjs"), "utf8").replace(/^export /gm, "");
const geoScript = `const makeLiveGeo = ${geoSource};\n`;
const latheSource = readFileSync("/Users/jason/.zcode/skills/anatomy/kit/lathe.mjs", "utf8")
  .replace(/^import .*$/m, "")
  .replace(/^export /gm, "");
const latheScript = `const G = (() => {${latheSource}\nreturn { viewOf, scaleOf, frameAlong, frameOf, pointOf, disc, ringBand, sphereOf, prismOf, circleOf, arcOf, ribsOf, dot3, add3, sub3, mul3, unit3, cross3, len3 };})();\n`;
const live = readFileSync(join(HERE, "live.mjs"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const script = kitScript() + latheScript + geoScript + live
  + zoomFsScript({ focus: ['[data-name="ringbed"]', '[data-name="stand.plate"]'] });

const page = k.pageHtml({ title: "§4.9 TRB 环 · xHCI 规范对照学习", theme: THEME, body, script, width: 1500 });
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} items`, `scale ${KS.toFixed(3)}`);

A.auditOrExit(R, P, {});

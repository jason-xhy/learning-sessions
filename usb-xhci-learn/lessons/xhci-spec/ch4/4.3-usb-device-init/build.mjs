// §4.3 USB 设备初始化 —— anatomy Hero「设备登记流水线」+ 整页（DESIGN §5.3）
//
// 概念：一张长台上的登记流水线，三工位三方分工：
//  左＝文书台（xHCI 驱动）：命令单、输入上下文表格卡、事件匣、描述符收件匣；
//  中＝总控台（xHC 控制器）：PORTSC 读数板（CCS/CSC/PR/PRC/PED 五信号灯 + PLS 数码窗 + 速度窗）、
//    Device Slot 槽位窗、命令单收件口（命令环）+ 寄存器写口、门铃 0/门铃 1、事件出口、线缆出口；
//  右＝设备试验盒（USB 设备）：Powered/Default/Address/Configured 四态灯 + 票据带（收到的 USB 请求票据串）。
//  总控台与试验盒之间一条总线缆——USB 请求票据沿缆行走，这是设备视角的唯一通道；
//  事件卡沿台后回流管回到文书台事件匣。动了什么＝谁在发令/谁在执行/设备看见了什么。
// 零件清单（静态实体 ~140，Hero 级）：
//  基座（台板、4 地脚×2 段、标尺条、铭牌、4 角螺钉）；文书台（台身、台面、4 螺钉、台铭牌、
//  表格卡架背板+顶夹×2、输入上下文表格卡、事件匣+唇、收件匣+唇、命令单堆×3、两匣铭牌、单堆铭牌）；
//  输送轨道（2 导轨、端挡×2、14 板条）；DCBAA 索引架（底、背板、3 隔条、2 侧壁、铭牌、格号、
//  输出上下文卡[F4 插入]）；EP0 传输环台（环床、2 侧轨、3 隔板、就绪灯、铭牌、TRB 小卡×3）；
//  总控台（台身、台面、4 螺钉、台铭牌、命令收件口、寄存器写口、PORTSC 板+5 信号灯+PLS 窗+速度窗、
//  槽位窗、门铃 0 座+导柱+刻牌、门铃 1 座+导柱+刻牌、事件出口管座+刻牌、线缆出口座）；
//  挂钩柱+球头；试验盒（基座、塔身、顶盖、帽顶、四态灯窗×4、票据带轨道+挂夹×4、塔铭牌、
//  票据带铭牌、长铭牌[教学锚]、线缆端口座）；总线缆（环纹缆）；事件回流管（管节、终点法兰、
//  2 鞍箍+支柱）；动件（fig1/fig2 先例不入静态审计）：命令单×4、寄存器写卡、事件卡×9、票据×6、
//  门铃钮×2+簧、表格卡字段、读数窗文字、输出上下文卡飞行、描述符卡×2、TRB 小卡、待接垂缆。
// 判据：xHCI 1.2b §4.3 p71–80（字段值/页码全部现场核对，见 EVIDENCE.md）。
// 演示样例：FS 设备插 USB2 根端口 1；Slot ID=1 与新地址 1 为示例值（xHC 自选，§4.3.2 p75/§4.6.5 p97）。

import { readFileSync, writeFileSync } from "node:fs";
import { zoomBarHtml, zoomFsCss, zoomFsScript } from "../../shared/zoomfs.mjs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "/Users/jason/.zcode/skills/anatomy/kit/iso-kit.mjs";
import * as G from "/Users/jason/.zcode/skills/anatomy/kit/lathe.mjs";
import * as A from "/Users/jason/.zcode/skills/anatomy/kit/audit.mjs";
import { tubePieces, tubeSvg } from "/Users/jason/.zcode/skills/anatomy/kit/tube.mjs";
import { kitScript } from "/Users/jason/.zcode/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

const W = 920;
const H = 640;
const AZIMUTH = 31;
const ELEVATION = 35;

// ---------- 世界布局 ----------
const PLATE = { x: -218, y: -54, w: 436, d: 108, r: 8 };
const PLATE_H = 14;
const FOOT_H = 6;
const CONS_TOP = 34;
const CONS_TOPT = CONS_TOP + 3.5; // 总控台面（37.5）

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [-218, -54, 62], [218, 54, 62], [-200, -30, 60], [198, 26, 46], [-90, -53, 51],
  ],
  W, H, { pad: 12, azimuth: AZIMUTH, elevation: ELEVATION },
);
const KS = G.scaleOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const f2 = (v) => Math.round(v * 100) / 100;
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

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
const STRIP = { x: -196, y: 46, w: 252, d: 6, r: 1 };
back.push(S(k.slabOf(STRIP, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
const stripTicks = k.topTicks(STRIP.x + 4, STRIP.x + STRIP.w - 4, 4, 5, STRIP.y, 0.6, [1.8, 3.4], P);
back.push(Ln(stripTicks.minor, { tone: "lo" }), Ln(stripTicks.major, { tone: "mid" }));
const BLABEL = { x: 62, y: 28, w: 34, d: 14, r: 1.2 };
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
put("desk.label", [-165, 30, 15.5],
  frontText([-165, 30.06, 15.5], "xHCI 驱动", { size: 4.85, tone: "hi" }),
  [record(A.box([-180, 29.9, 13.9], [-150, 30, 17.1], { name: "desk.label" }))], { bias: 0.08, label: 1 });

// 表格卡架 + 输入上下文表格卡（字段填充为动件）
box("formboard", [-198, -26.5, DESK_TOP], [-162, -23.2, 58], { tone: "lo" }, {
  r: 0.8, steps: 2,
  extra: Ln(path3([[-196, -23.12, DESK_TOP + 2], [-196, -23.12, 56], [-164, -23.12, 56], [-164, -23.12, DESK_TOP + 2], [-196, -23.12, DESK_TOP + 2]], true), { tone: "faint" }),
});
for (const zx of [-195.5, -164.5]) {
  col(`formclip`, zx, -22.5, 0.7, 57.6, 59.8, { tone: "hi" }, { steps: 10 });
}
const FORM = { x: -195, y: -23.2, w: 30, d: 1.6, r: 0.8 };
{
  const cell = (x0, w, z0, h, id, val, label) => {
    const cz = z0 + h / 2;
    return `<g class="xu-cell" data-fill="0" data-cell="${id}">` +
      `<path class="xu-box" d="${path3([[FORM.x + x0, -21.54, z0], [FORM.x + x0 + w, -21.54, z0], [FORM.x + x0 + w, -21.54, z0 + h], [FORM.x + x0, -21.54, z0 + h], [FORM.x + x0, -21.54, z0]], true)}"/>` +
      k.faceTextSvg(frontMatrix([FORM.x + x0 + w / 2, -21.5, cz]), val, { size: 2.4 * KS, tone: "hi", anchor: "middle" }) +
      `</g>` +
      k.faceTextSvg(frontMatrix([FORM.x + x0 + w / 2, -21.5, z0 + h + 1.0]), label, { size: 1.7 * KS, tone: "mid", anchor: "middle" });
  };
  const t = (x, z, s, size, tone) => k.faceTextSvg(frontMatrix([x, -21.5, z]), s, { size: size * KS, tone, anchor: "middle" });
  // 盒内序：格子框/格注先画，标题类文字最后画——格框斜投影 bbox 不压标题
  const svg =
    S(k.slabOf(FORM, DESK_TOP + 2, 32.5, P, 2, 0.4), { tone: "hi", crease: "lo" }) +
    cell(1, 12.6, 45.6, 4.6, "a0", "1", "A0") +
    cell(16.2, 12.6, 45.6, 4.6, "a1", "1", "A1") +
    cell(1, 8.6, 37.0, 4.2, "sport", "1", "端口") +
    cell(10.8, 8.6, 37.0, 4.2, "sroute", "0", "Route") +
    cell(20.6, 8.4, 37.0, 4.2, "sentries", "1", "Entries") +
    cell(1, 6.6, 28.4, 4.2, "etype", "Ctrl", "类型") +
    cell(8.4, 6.6, 28.4, 4.2, "mps", "8", "MPS") +
    cell(15.8, 6.6, 28.4, 4.2, "dcs", "1", "DCS") +
    cell(23.2, 5.8, 28.4, 4.2, "cerr", "3", "CErr") +
    t(FORM.x + 15, 42.8, "Slot Context", 2.2, "mid") +
    t(FORM.x + 15, 34.2, "EP0 Context", 2.2, "mid") +
    t(FORM.x + 15, 25.6, "MPS＝端口速度默认值", 1.8, "mid") +
    t(FORM.x + 15, 54.6, "输入上下文", 3.0, "hi") +
    t(FORM.x + 15, 51.9, "Input Context", 1.9, "mid");
  put("desk.formcard", [FORM.x + 15, -22.4, DESK_TOP + 18], svg,
    [record(A.slab(FORM, DESK_TOP + 2, 32.5, { name: "desk.formcard" }, 2))], { bias: 0.3, label: 1 });
}
// 事件匣与收件匣
box("tray.event", [-152, 6, DESK_TOP], [-128, 24, DESK_TOP + 3.4], { tone: "hi" }, { r: 1.4, steps: 3, bevel: 0.4 });
box("tray.event.lip", [-128, 5, DESK_TOP], [-126.5, 25, DESK_TOP + 5.4], { tone: "mid" }, { r: 0.8 });
// 事件匣标签：平放桌面、匣前方（y≈31）——匣沿/北立面/匣内事件卡的斜投影 bbox
// 都会与更近的标签位相交，匣前桌面是实测无遮挡位
put("tray.event.tag", [-140, 31, DESK_TOP],
  topText([-140, 31, DESK_TOP + 0.02], "事件匣", { size: 4.0, tone: "mid" }),
  [record(A.box([-152, 29, DESK_TOP], [-128, 33, DESK_TOP + 0.15], { name: "tray.event.tag" }))], { bias: 0.1, label: 1 });
box("tray.desc", [-152, -20, DESK_TOP], [-128, -2, DESK_TOP + 3.4], { tone: "hi" }, { r: 1.4, steps: 3, bevel: 0.4 });
box("tray.desc.lip", [-128, -21, DESK_TOP], [-126.5, -1, DESK_TOP + 5.4], { tone: "mid" }, { r: 0.8 });
put("tray.desc.tag", [-147, -0.4, DESK_TOP],
  topText([-147, -0.6, DESK_TOP + 3.42], "收件匣（描述符）", { size: 3.3, tone: "mid" }),
  [record(A.box([-152, -2.4, DESK_TOP + 3.4], [-128, -0.2, DESK_TOP + 3.6], { name: "tray.desc.tag" }))], { bias: 0.1, label: 1 });
// 命令单堆（待发单据）
for (let i = 0; i < 3; i++) {
  box("slipstack", [-196, 6 + i * 0.3, DESK_TOP + i * 0.5], [-174, 22 + i * 0.3, DESK_TOP + 0.5 + i * 0.5], { tone: i === 2 ? "hi" : "lo", crease: "none" }, { r: 0.8, steps: 2 });
}
put("slipstack.tag", [-185, 23.6, DESK_TOP],
  topText([-185, 24.4, DESK_TOP + 2.0], "命令单", { size: 4.6, tone: "mid" }),
  [record(A.box([-196, 22.4, DESK_TOP + 1.5], [-174, 24.8, DESK_TOP + 1.72], { name: "slipstack.tag" }))], { bias: 0.1, label: 1 });

// ---------- 输送轨道（软件 → xHC 通道） ----------
const CONV_Y0 = 34, CONV_Y1 = 42;
box("conv.rail.s", [-204, CONV_Y0, 0], [-13.4, CONV_Y0 + 2.5, 3.2], { tone: "mid" }, { r: 1 });
box("conv.rail.n", [-204, CONV_Y1 - 2.5, 0], [-13.4, CONV_Y1, 3.2], { tone: "mid" }, { r: 1 });
box("conv.stop.w", [-205.4, CONV_Y0 - 0.5, 0], [-203.8, CONV_Y1 + 0.5, 4.5], { tone: "mid" }, { r: 1, bevel: 0.4 });
box("conv.stop.e", [-12.8, CONV_Y0 - 0.5, 0], [-11.2, CONV_Y1 + 0.5, 4.5], { tone: "mid" }, { r: 1, bevel: 0.4 });
for (let i = 0; i < 14; i++) {
  const x = -198 + i * 13.4;
  box("conv.slat", [x, CONV_Y0 + 2.5, 0], [x + 6, CONV_Y1 - 2.5, 1], { tone: "lo" }, { r: 0.4, steps: 1 });
}

// ---------- DCBAA 索引架 ----------
const OUTCTX = { planX: -114.85, planY: -25, w: 4.2, d: 12, z: 3, cx: -112.75, cy: -19 };
{
  box("dcbaa.base", [-118, -30, 0], [-90, -6, 3], { tone: "lo" }, { r: 1.2, steps: 2, bevel: 0.4 });
  box("dcbaa.back", [-116, -30, 3], [-92, -27.4, 26], { tone: "mid" }, { r: 0.8, steps: 2 });
  for (const x of [-110, -104, -98]) {
    box("dcbaa.div", [x - 0.4, -27.4, 3], [x + 0.4, -9, 23], { tone: "mid" }, { r: 0.3, steps: 1 });
  }
  box("dcbaa.endw", [-115.9, -27.4, 3], [-115.1, -9, 23], { tone: "mid" }, { r: 0.3, steps: 1 });
  box("dcbaa.ende", [-92.9, -27.4, 3], [-92.1, -9, 23], { tone: "mid" }, { r: 0.3, steps: 1 });
  put("dcbaa.label", [-104, -27.4, 12],
    frontText([-104, -27.32, 22.0], "DCBAA", { size: 3.9, tone: "hi" }),
    [record(A.box([-116, -27.5, 19.6], [-92, -27.3, 24.4], { name: "dcbaa.label" }))], { bias: 0.08, label: 1 });
  // 副铭迁到基座前脸：留在背板会落进 1 号格输出上下文卡（动件）的斜投影 bbox
  put("dcbaa.sublabel", [-104, -5.94, 1.5],
    frontText([-104, -5.94, 1.5], "软件装载 · xHC 只读", { size: 1.4, tone: "mid" }),
    [record(A.box([-114, -6.06, 0.4], [-94, -5.94, 2.6], { name: "dcbaa.sublabel" }))], { bias: 0.08, label: 1 });
  put("dcbaa.nums", [-104, -7.4, 3],
    ["1", "2", "3", "4"].map((n, i) => topText([-112.75 + i * 5.75, -7.4, 3.02], n, { size: 3.0, tone: "mid" })).join(""),
    [record(A.box([-118, -8.8, 3], [-90, -6, 3.2], { name: "dcbaa.nums" }))], { bias: 0.06, label: 1 });
  // 输出上下文卡（静态按就位姿态入审计；画面由动件层绘制）
  const plan = { x: OUTCTX.planX, y: OUTCTX.planY, w: OUTCTX.w, d: OUTCTX.d, r: 0.6 };
  const shape = record(A.slab(plan, OUTCTX.z, 13, { name: "dcbaa.card" }, 2));
  put("dcbaa.card", [OUTCTX.cx, OUTCTX.cy, OUTCTX.z + 6.5],
    `<g data-hide="outctx" style="display:none">` +
    S(k.slabOf(plan, OUTCTX.z, 13, P, 2, 0.3), { tone: "hi", crease: "lo" }) + `</g>`, [shape], { bias: 0.2 });
}

// ---------- EP0 传输环台 ----------
const EP0 = { x: -84, y: 6, w: 38, d: 22, r: 2 };
const EP0_CENTERS = [-78.8, -70.4, -62, -52.4];
{
  box("ep0.bed", [EP0.x, EP0.y, 0], [EP0.x + EP0.w, EP0.y + EP0.d, 2.5], { tone: "lo" }, { r: 2, steps: 3, bevel: 0.5 });
  box("ep0.rail.s", [EP0.x + 1, EP0.y + 1.2, 2.5], [EP0.x + EP0.w - 1, EP0.y + 3.2, 5], { tone: "mid" }, { r: 0.6 });
  box("ep0.rail.n", [EP0.x + 1, EP0.y + EP0.d - 3.2, 2.5], [EP0.x + EP0.w - 1, EP0.y + EP0.d - 1.2, 5], { tone: "mid" }, { r: 0.6 });
  for (const x of EP0_CENTERS.slice(1, 4)) {
    box("ep0.div", [x - 3.8 - 0.4, EP0.y + 4.2, 2.5], [x - 3.8 + 0.4, EP0.y + EP0.d - 4.2, 4.2], { tone: "mid" }, { r: 0.3, steps: 1 });
  }
  put("ep0.label", [EP0.x + 19, EP0.y + EP0.d + 2, 0],
    topText([EP0.x + 19, EP0.y + EP0.d + 2.6, 0.02], "EP0 传输环", { size: 3.7, tone: "hi" }),
    [record(A.box([EP0.x, EP0.y + EP0.d + 0.6, 0], [EP0.x + EP0.w, EP0.y + EP0.d + 4.4, 0.15], { name: "ep0.label" }))], { bias: 0.06, label: 1 });
  // 就绪灯（环上架后点亮）：小立柱装在环床东端槽 4 区
  box("ep0.readyblock", [-51.2, 15.3, 2.5], [-48.8, 18.7, 4.9], { tone: "mid" }, { r: 0.5, steps: 2, bevel: 0.3 });
  {
    const bx0 = -51, bx1 = -49, bz0 = 3.2, bz1 = 4.4, bf = 18.7;
    put("ep0.ready", [-50, bf, 3.8],
      `<path class="xhp-void" d="${path3([[bx0, bf - 0.02, bz0], [bx1, bf - 0.02, bz0], [bx1, bf - 0.02, bz1], [bx0, bf - 0.02, bz1]], true)}"/>` +
      `<g class="xhp-lamp" data-lamp="ep0ready"><path class="xhp-bulb" d="${path3([[bx0 + 0.4, bf - 0.06, bz0 + 0.35], [bx1 - 0.4, bf - 0.06, bz0 + 0.35], [bx1 - 0.4, bf - 0.06, bz1 - 0.35], [bx0 + 0.4, bf - 0.06, bz1 - 0.35]], true)}"/></g>` +
      Ln(path3([[bx0, bf, bz0], [bx1, bf, bz0], [bx1, bf, bz1], [bx0, bf, bz1], [bx0, bf, bz0]], true), { tone: "lo" }) +
      topText([-50, 17, 4.92], "就绪", { size: 2.2, tone: "mid" }),
      [record(A.box([bx0, bf - 0.1, bz0], [bx1, bf, bz1], { name: "ep0.ready" }))], { bias: 13, label: 1 });
  }
  // TRB 小卡（静态就位姿态入审计；画面由动件层绘制）
  ["S", "D", "St"].forEach((lab, i) => {
    const cx = EP0_CENTERS[i];
    const plan = { x: cx - 3.4, y: EP0.y + 5.7, w: 6.8, d: 10.6, r: 0.8 };
    const shape = record(A.slab(plan, 2.5, 2.2, { name: `ep0.trb${i}` }, 2));
    put(`ep0.trb${i}`, [cx, EP0.y + 11, 3.6],
      `<g data-hide="trb${i}" style="display:none">` +
      S(k.slabOf(plan, 2.5, 2.2, P, 2, 0.3), { tone: "hi", crease: "lo" }) + `</g>`, [shape], { bias: 0.2 });
  });
}

// ---------- 工位二：总控台（xHC 控制器） ----------
const CONS = { x: -40, y: -50, w: 132, d: 80, r: 4 };
{
  box("cons.body", [CONS.x, CONS.y, 0], [CONS.x + CONS.w, CONS.y + CONS.d, CONS_TOP], { tone: "mid" }, {
    r: 4, steps: 3, bevel: 0.8,
    inner: Ln(k.sideSeam(CONS, 10, P, 3) + k.sideSeam(CONS, 30, P, 3), { tone: "faint" }),
  });
  box("cons.top", [CONS.x - 2, CONS.y - 2, CONS_TOP], [CONS.x + CONS.w + 2, CONS.y + CONS.d + 2, CONS_TOPT], { tone: "hi" }, { r: 3, steps: 3, bevel: 0.5 });
  const cScrews = [[CONS.x + 3, CONS.y + 3], [CONS.x + CONS.w - 3, CONS.y + 3], [CONS.x + 3, CONS.y + CONS.d - 3], [CONS.x + CONS.w - 3, CONS.y + CONS.d - 3]];
  put("cons.screws", [CONS.x + CONS.w / 2, CONS.y + CONS.d / 2, CONS_TOPT],
    Dots(cScrews.map(([x, y]) => at([x, y, CONS_TOPT])), { size: 0.5, tone: "mid" }),
    cScrews.map(([x, y]) => record(A.ball([x, y, CONS_TOPT], 0.4, { name: "cons.screw" }))), { bias: 0.1 });
  put("cons.label", [26, 30, 32.2],
    frontText([26, 30.06, 32.2], "xHC 控制器", { size: 4.85, tone: "hi" }),
    [record(A.box([0, 29.9, 30.4], [52, 30, 34], { name: "cons.label" }))], { bias: 0.08, label: 1 });

  const F = 30;
  // —— 命令单收件口（命令环）+ 寄存器写口（薄板贴面） ——
  const faceSlot = (name, x0, x1, label, labelSize, labelZ) => {
    const plan = { x: x0, y: 29.94, w: x1 - x0, d: 0.12, r: 0.6 };
    const shape = record(A.slab(plan, 3.5, 6, { name }, 3));
    // 2026-11-03 遮挡修复：去掉薄板填充（保留框线与记录形状）——填充板 22 世界宽的
    // 斜投影 bbox 下垂会盖住上方 PORTSC 信号灯标签
    put(name, [(x0 + x1) / 2, 30, 6.5],
      Ln(path3([[x0 - 1, 30.04, 2.8], [x0 - 1, 30.04, 10.2], [x1 + 1, 30.04, 10.2], [x1 + 1, 30.04, 2.8], [x0 - 1, 30.04, 2.8]], true), { tone: "mid", className: "xhp-intake-frame" }) +
      frontText([(x0 + x1) / 2, 30.1, labelZ], label, { size: labelSize, tone: "mid" }),
      [shape], { bias: 13, label: 1 });
  };
  faceSlot("cons.intake", -32, -10, "命令环 · 收件口", 2.1, 11.0);
  faceSlot("cons.wreg", -6, 4, "寄存器口", 3.2, 1.9);

  // —— PORTSC 读数板 ——
  {
    const plan = { x: -36, y: 29.94, w: 54, d: 0.12, r: 1 };
    const shape = record(A.slab(plan, 12.8, 16.8, { name: "portsc.board" }, 3));
    put("portsc.board", [-9, 30, 21.2],
      S(k.slabOf(plan, 12.8, 16.8, P, 3), { tone: "lo", crease: "none" }) +
      frontText([-36, 30.06, 28.4], "PORTSC", { size: 4.8, tone: "hi", anchor: "start" }),
      [shape], { bias: 0.1, label: 1 });
    // 「端口 1」拆独立文字项：板面 slab 的 AABB 下垂会盖住同板右侧文字（分层发射序里
    // 置于五信号灯/数码窗之后）
    put("portsc.port", [10, 30, 28.4],
      frontText([18, 30.06, 28.4], "端口 1", { size: 3.8, tone: "mid", anchor: "end" }),
      [record(A.box([4, 29.9, 26.6], [20, 30, 30.2], { name: "portsc.port" }))], { bias: 13, label: 1 });
  }
  const FLAGS = ["CCS", "CSC", "PR", "PRC", "PED"];
  const flagTextSvg = [];
  FLAGS.forEach((fl, i) => {
    const x0 = -33.8 + i * 10.3, x1 = x0 + 8.4;
    const z0 = 19.8, z1 = 26;
    const quad = [[x0, F, z0], [x1, F, z0], [x1, F, z1], [x0, F, z1]];
    const recess = quad.map(([x, y, z]) => [x, y - 1.6, z]);
    const walls = [];
    for (const [a, b] of [[0, 1], [2, 3]]) {
      const A2 = quad[a], B2 = quad[b];
      const normal = a === 0 ? [0, 1, 0] : [0, -1, 0];
      walls.push({ tone: G.toneOf(normal, P), d: path3([A2, B2, [B2[0], B2[1] - 1.6, B2[2]], [A2[0], A2[1] - 1.6, A2[2]]], true) });
    }
    const cap0 = { tone: G.toneOf([0, 0, 1], P), d: path3([quad[3], quad[2], [quad[2][0], quad[2][1] - 1.6, quad[2][2]], [quad[3][0], quad[3][1] - 1.6, quad[3][2]]], true) };
    const cap1 = { tone: G.toneOf([0, 0, -1], P), d: path3([quad[0], quad[1], [quad[1][0], quad[1][1] - 1.6, quad[1][2]], [quad[0], quad[1][1] - 1.6, quad[1][2]]], true) };
    // 灯窗实体与灯名刻字分拆两件（层序里先全体实体、后全体刻字——斜投影 bbox 不再互盖）
    put(`portsc.${fl}`, [(x0 + x1) / 2, F, (z0 + z1) / 2],
      walls.map((w) => `<path class="iso-shade" data-shade="${w.tone === 4 ? 3 : w.tone}" d="${w.d}"/>`).join("") +
      `<path class="iso-shade" data-shade="${cap0.tone === 4 ? 3 : cap0.tone}" d="${cap0.d}"/>` +
      `<path class="iso-shade" data-shade="${cap1.tone === 4 ? 3 : cap1.tone}" d="${cap1.d}"/>` +
      `<path class="xhp-void" d="${path3(recess, true)}"/>` +
      `<g class="xhp-lamp" data-flag="${fl.toLowerCase()}"><path class="xhp-bulb" d="${path3([[x0 + 1.4, F - 1.8, z0 + 1.1], [x1 - 1.4, F - 1.8, z0 + 1.1], [x1 - 1.4, F - 1.8, z1 - 1.1], [x0 + 1.4, F - 1.8, z1 - 1.1]], true)}"/></g>` +
      Ln(path3(quad, true), { tone: "lo" }),
      [record(A.box([x0, F - 0.1, z0], [x1, F, z1], { name: `portsc.${fl}` }))], { bias: 12, label: 1 });
    flagTextSvg.push(frontText([(x0 + x1) / 2, F + 0.02, 18.5], fl, { size: 2.8, tone: "mid" }));
  });
  put("portsc.flagtext", [-8, 30, 18.5], flagTextSvg.join(""),
    [record(A.box([-34.5, 29.9, 16.4], [14.5, 30, 20.6], { name: "portsc.flagtext" }))], { bias: 12, label: 1 });
  // 数码窗（实体与读数文字分拆两件）
  const win = (name, x0, x1, label, dataKey, initVal) => {
    const z0 = 13.4, z1 = 17.8;
    const quad = [[x0, F, z0], [x1, F, z0], [x1, F, z1], [x0, F, z1]];
    const recess = quad.map(([x, y, z]) => [x, y - 1.4, z]);
    const walls = [];
    for (const [a, b] of [[0, 1], [2, 3]]) {
      const A2 = quad[a], B2 = quad[b];
      const normal = a === 0 ? [0, 1, 0] : [0, -1, 0];
      walls.push({ tone: G.toneOf(normal, P), d: path3([A2, B2, [B2[0], B2[1] - 1.4, B2[2]], [A2[0], A2[1] - 1.4, A2[2]]], true) });
    }
    const cap0 = { tone: G.toneOf([0, 0, 1], P), d: path3([quad[3], quad[2], [quad[2][0], quad[2][1] - 1.4, quad[2][2]], [quad[3][0], quad[3][1] - 1.4, quad[3][2]]], true) };
    const cap1 = { tone: G.toneOf([0, 0, -1], P), d: path3([quad[0], quad[1], [quad[1][0], quad[1][1] - 1.4, quad[1][2]], [quad[0], quad[1][1] - 1.4, quad[1][2]]], true) };
    put(name, [(x0 + x1) / 2, F, (z0 + z1) / 2],
      walls.map((w) => `<path class="iso-shade" data-shade="${w.tone === 4 ? 3 : w.tone}" d="${w.d}"/>`).join("") +
      `<path class="iso-shade" data-shade="${cap0.tone === 4 ? 3 : cap0.tone}" d="${cap0.d}"/>` +
      `<path class="iso-shade" data-shade="${cap1.tone === 4 ? 3 : cap1.tone}" d="${cap1.d}"/>` +
      `<path class="xhp-void" d="${path3(recess, true)}"/>` +
      Ln(path3(quad, true), { tone: "lo" }),
      [record(A.box([x0, F - 0.1, z0], [x1, F, z1], { name }))], { bias: 12, label: 1 });
    put(`${name}.t`, [(x0 + x1) / 2, F, (z0 + z1) / 2],
      `<text class="xhp-win" data-win="${dataKey}" transform="${frontMatrix([(x0 + x1) / 2, F - 1.45, z1 - 0.9])}" font-size="${f2(2.0 * KS)}" text-anchor="middle">${label}</text>` +
      `<text class="xhp-win" data-win="${dataKey}-v" transform="${frontMatrix([(x0 + x1) / 2, F - 1.45, z0 + 1.4])}" font-size="${f2(3.5 * KS)}" text-anchor="middle">${initVal}</text>`,
      [record(A.box([x0, F - 0.06, z0], [x1, F, z1], { name: `${name}.t` }))], { bias: 12, label: 1 });
  };
  win("portsc.pls", -34, -22, "PLS", "pls", "—");
  win("portsc.speed", -18, -4, "Speed", "speed", "—");

  // —— Device Slot 槽位窗 ——
  {
    const x0 = 24, x1 = 58, z0 = 12.8, z1 = 29.6;
    const quad = [[x0, F, z0], [x1, F, z0], [x1, F, z1], [x0, F, z1]];
    const recess = quad.map(([x, y, z]) => [x, y - 1.5, z]);
    const walls = [];
    for (const [a, b] of [[0, 1], [2, 3]]) {
      const A2 = quad[a], B2 = quad[b];
      const normal = a === 0 ? [0, 1, 0] : [0, -1, 0];
      walls.push({ tone: G.toneOf(normal, P), d: path3([A2, B2, [B2[0], B2[1] - 1.5, B2[2]], [A2[0], A2[1] - 1.5, A2[2]]], true) });
    }
    const cap0 = { tone: G.toneOf([0, 0, 1], P), d: path3([quad[3], quad[2], [quad[2][0], quad[2][1] - 1.5, quad[2][2]], [quad[3][0], quad[3][1] - 1.5, quad[3][2]]], true) };
    const cap1 = { tone: G.toneOf([0, 0, -1], P), d: path3([quad[0], quad[1], [quad[1][0], quad[1][1] - 1.5, quad[1][2]], [quad[0][0], quad[0][1] - 1.5, quad[0][2]]], true) };
    put("slot.win", [(x0 + x1) / 2, F, (z0 + z1) / 2],
      walls.map((w) => `<path class="iso-shade" data-shade="${w.tone === 4 ? 3 : w.tone}" d="${w.d}"/>`).join("") +
      `<path class="iso-shade" data-shade="${cap0.tone === 4 ? 3 : cap0.tone}" d="${cap0.d}"/>` +
      `<path class="iso-shade" data-shade="${cap1.tone === 4 ? 3 : cap1.tone}" d="${cap1.d}"/>` +
      `<path class="xhp-void" d="${path3(recess, true)}"/>` +
      frontText([41, F - 0.02, 28.0], "Device Slot", { size: 2.35, tone: "hi" }) +
      `<text class="xhp-win" data-win="slot" transform="${frontMatrix([41, F - 1.55, 22.2])}" font-size="${f2(3.2 * KS)}" text-anchor="middle">—</text>` +
      frontText([41, F - 0.02, 15.4], "ID 1 · 示例", { size: 2.2, tone: "mid" }) +
      Ln(path3(quad, true), { tone: "lo" }),
      [record(A.box([x0, F - 0.1, z0], [x1, F, z1], { name: "slot.win" }))], { bias: 12, label: 1 });
  }

  // —— 门铃 0 / 门铃 1 ——
  const bell = (name, cx, cy, plate) => {
    box(`${name}.base`, [cx - 4, cy - 4, CONS_TOPT], [cx + 4, cy + 4, CONS_TOPT + 3.5], { tone: "mid" }, { r: 1.4, steps: 3, bevel: 0.4 });
    col(`${name}.guide`, cx, cy, 1.4, CONS_TOPT + 3.5, CONS_TOPT + 6.5, { tone: "lo" }, { steps: 16 });
    const py = cy + 8;
    const lines = Array.isArray(plate) ? plate : [[plate, 0]];
    const size = Array.isArray(plate) ? 1.8 : 3.0;
    put(`${name}.plate`, [cx - 4, py, CONS_TOPT],
      lines.map(([txt, dy]) => topText([cx - 4, py + dy, CONS_TOPT + 0.02], txt, { size, tone: "hi" })).join(""),
      [record(A.box([cx - 19, py - 4.6, CONS_TOPT], [cx + 11, py + 4.6, CONS_TOPT + 0.15], { name: `${name}.plate` }))], { bias: 0.06, label: 1 });
  };
  bell("bell0", 58, 16, "门铃 0 · DB Target=0");
  bell("bell1", 78, 2, [["门铃 1", -2.6], ["DB Target=1 · EP0", 2.6]]);

  // —— 事件出口管座 ——
  col("evstub", 8, -46, 1.8, CONS_TOPT, CONS_TOPT + 4.5, { tone: "lo" }, { steps: 20 });
  put("evstub.tag", [8, -42.2, CONS_TOPT],
    topText([8, -42.2, CONS_TOPT + 0.02], "事件出口", { size: 4.6, tone: "mid" }),
    [record(A.box([-2, -43.8, CONS_TOPT], [18, -40.6, CONS_TOPT + 0.15], { name: "evstub.tag" }))], { bias: 0.06, label: 1 });

  // —— 线缆出口（东面端口座） ——
  const CF = { o: [92, 0, 8], a: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] };
  const bossC = record(A.disc(CF, 0, 3.5, 2.2, { name: "cableport.cons" }));
  put("cableport.cons", [93.75, 0, 8], S(G.disc(0, 3.5, 2.2, CF, P, { steps: 20 }), { tone: "mid" }) +
    Ln(k.ring(95.5, 0, 1.5, 8.01, P, 20), { tone: "faint" }), [bossC], { bias: 0.1 });
}

// ---------- 挂钩柱（缆端待接位） ----------
col("hook", 100, -16, 0.8, 0, 2.9, { tone: "lo" }, { steps: 12 });
put("hook.knob", [100, -16, 4.0],
  S(G.sphereOf([100, -16, 4.0], 1.1, P, { steps: 16 }), { tone: "mid" }),
  [record(A.ball([100, -16, 4.0], 1.1, { name: "hook.knob" }))], { bias: 0.2 });

// ---------- 工位三：设备试验盒（USB 设备） ----------
{
  box("box.plinth", [106, -20, 0], [198, 26, 6], { tone: "lo" }, { r: 3, steps: 3, bevel: 0.6 });
  box("box.tower", [114, -14, 6], [190, 20, 38], { tone: "mid" }, {
    r: 3, steps: 3, bevel: 0.8,
    inner: Ln(k.sideSeam({ x: 114, y: -14, w: 76, d: 34, r: 3 }, 10, P, 3) + k.sideSeam({ x: 114, y: -14, w: 76, d: 34, r: 3 }, 32, P, 3), { tone: "faint" }),
  });
  box("box.roof", [110, -18, 38], [194, 24, 42], { tone: "mid" }, { r: 3, steps: 3, bevel: 0.6 });
  col("box.cap", 152, 3, 3.5, 42, 45.5, { tone: "hi" }, { steps: 24 });

  // 四态灯
  const BF = 20;
  const DEVLAMPS = [
    { key: "powered", label: "Powered", z: 29.5 },
    { key: "default", label: "Default", z: 23.5 },
    { key: "address", label: "Address", z: 17.5 },
    { key: "configured", label: "Configured", z: 11.5 },
  ];
  DEVLAMPS.forEach((dp) => {
    const x0 = 118, x1 = 128, z0 = dp.z - 2.8, z1 = dp.z + 2.8;
    const quad = [[x0, BF, z0], [x1, BF, z0], [x1, BF, z1], [x0, BF, z1]];
    const recess = quad.map(([x, y, z]) => [x, y - 1.6, z]);
    const walls = [];
    for (const [a, b] of [[0, 1], [2, 3]]) {
      const A2 = quad[a], B2 = quad[b];
      const normal = a === 0 ? [0, 1, 0] : [0, -1, 0];
      walls.push({ tone: G.toneOf(normal, P), d: path3([A2, B2, [B2[0], B2[1] - 1.6, B2[2]], [A2[0], A2[1] - 1.6, A2[2]]], true) });
    }
    const cap0 = { tone: G.toneOf([0, 0, 1], P), d: path3([quad[3], quad[2], [quad[2][0], quad[2][1] - 1.6, quad[2][2]], [quad[3][0], quad[3][1] - 1.6, quad[3][2]]], true) };
    const cap1 = { tone: G.toneOf([0, 0, -1], P), d: path3([quad[0], quad[1], [quad[1][0], quad[1][1] - 1.6, quad[1][2]], [quad[0][0], quad[0][1] - 1.6, quad[0][2]]], true) };
    put(`box.lamp.${dp.key}`, [(x0 + x1) / 2, BF, dp.z],
      walls.map((w) => `<path class="iso-shade" data-shade="${w.tone === 4 ? 3 : w.tone}" d="${w.d}"/>`).join("") +
      `<path class="iso-shade" data-shade="${cap0.tone === 4 ? 3 : cap0.tone}" d="${cap0.d}"/>` +
      `<path class="iso-shade" data-shade="${cap1.tone === 4 ? 3 : cap1.tone}" d="${cap1.d}"/>` +
      `<path class="xhp-void" d="${path3(recess, true)}"/>` +
      `<g class="xhp-lamp" data-lamp="dev-${dp.key}"><path class="xhp-bulb" d="${path3([[x0 + 1.2, BF - 1.8, z0 + 1.1], [x1 - 1.2, BF - 1.8, z0 + 1.1], [x1 - 1.2, BF - 1.8, z1 - 1.1], [x0 + 1.2, BF - 1.8, z1 - 1.1]], true)}"/></g>` +
      Ln(path3(quad, true), { tone: "lo" }) +
      frontText([140, BF + 0.02, dp.z + 0.8], dp.label, { size: 2.0, tone: "mid" }),
      [record(A.box([x0, BF - 0.1, z0], [x1, BF, z1], { name: `box.lamp.${dp.key}` }))], { bias: 10, label: 1 });
  });
  put("box.devlabel", [143, 20, 34.8],
    frontText([143, 20.06, 34.8], "USB 设备", { size: 4.85, tone: "hi" }),
    [record(A.box([126, 19.9, 33.2], [160, 20, 36.4], { name: "box.devlabel" }))], { bias: 0.08, label: 1 });

  // 票据带（凸出塔面的轨道 + 挂夹）
  box("box.rail", [166, 20, 10], [170.4, 21.4, 34], { tone: "lo" }, { r: 0.6, steps: 2 });
  for (let i = 0; i < 4; i++) {
    const z = 13.2 + i * 6;
    box("box.clip", [166.8, 21.4, z - 0.5], [169.6, 22.4, z + 0.5], { tone: "mid" }, { r: 0.4, steps: 1 });
  }
  put("box.rail.tag", [183, 20, 36.2],
    frontText([183, 20.06, 36.2], "票据带", { size: 2.2, tone: "mid" }),
    [record(A.box([176.5, 19.9, 35.0], [189.5, 20, 37.2], { name: "box.rail.tag" }))], { bias: 0.06, label: 1 });

  // 长铭牌：教学锚
  {
    const plan = { x: 110, y: 26.0, w: 84, d: 1.2, r: 0.6 };
    const shape = record(A.slab(plan, 1.2, 4, { name: "box.nameplate" }, 2));
    put("box.nameplate", [152, 26.6, 3.2],
      S(k.slabOf(plan, 1.2, 4, P, 2), { tone: "lo", crease: "none" }) +
      frontText([152, 27.26, 2.9], "只见 USB 请求与总线事件——槽/环/上下文对设备不可见", { size: 1.76, tone: "hi" }),
      [shape], { bias: 0.1, label: 1 });
  }
  // 线缆端口座（西面）
  const DF = { o: [114, 0, 19], a: [-1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] };
  const bossD = record(A.disc(DF, 0, 3.5, 2.2, { name: "cableport.box" }));
  put("cableport.box", [112.25, 0, 19], S(G.disc(0, 3.5, 2.2, DF, P, { steps: 20 }), { tone: "mid" }) +
    Ln(k.ring(110.5, 0, 1.5, 19.01, P, 20), { tone: "faint" }), [bossD], { bias: 0.1 });
}

// ---------- 总线缆（接通形态；待接垂缆为动件） ----------
const CABLE_PLUGGED = [[95.5, 0, 8], [98.5, 0, 8], [102.5, -2, 10.5], [107, 0, 15.5], [108, 0, 19], [110.5, 0, 19]];
{
  const route = G.fillet(CABLE_PLUGGED, 4.2, 10, { P, tube: 0.7 });
  R.route("cable.bus", route, 0.7, { rims: [2.2, 2.2], limp: true, piece: "rig" });
  tubePieces(route, 0.7, P, { maxLength: 14, spacing: 1, rings: { pitch: 2.2, twist: 0, fade: [0.1, 0.55] } }).forEach((piece, index) =>
    put(`cable.bus:${index}`, piece.mid, tubeSvg(piece, { tone: "mid" }), [A.tube(piece.points, piece.radii)], { bias: 0.05, attrs: ` data-route="cable.bus"` }));
}

// ---------- 事件回流管（总控台 → 文书台事件匣） ----------
const TUBE_ROUTE = G.fillet([
  [8, -46, CONS_TOPT + 4.5], [8, -46, 44.6], [7, -49, 47.6], [2, -52, 49.6], [-40, -53, 50.4], [-120, -53, 50.4],
  [-150, -53, 49], [-150, -40, 40], [-150, -6, 30], [-147, 8, 28.8], [-147, 11, 28.6], [-147, 11, 26.4],
], 5, 10, { P, tube: 0.9 });
{
  const total = G.pathLength(TUBE_ROUTE);
  const clamps = [[-40, -53, 48.9], [-120, -53, 48.9]];
  clamps.forEach((cl, i) => {
    col(`tube.pylon${i}`, cl[0], cl[1], 1.1, 0, cl[2]);
    const cplan = { x: cl[0] - 2.6, y: -54, w: 1.7, d: 2, r: 0.4 };
    const st = record(A.box([cl[0] - 2.6, -54, cl[2]], [cl[0] - 0.9, -52, cl[2] + 1.6], { name: `tube.clamp${i}`, owner: "tube.event" }));
    put(`tube.clamp${i}`, [cl[0] - 1.75, -53, cl[2] + 0.8],
      S(k.slabOf(cplan, cl[2], 1.6, P, 2, 0.3), { tone: "mid" }) +
      Ln(k.sideSeam(cplan, cl[2] + 1.1, P, 2), { tone: "faint" }), [st], { bias: 0.1 });
  });
  const endF = { o: [-147, 11, 26.4], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] };
  const fl1 = record(A.disc(endF, 0, 1.2, 1.7, { name: "tube.flange", owner: "tube.event" }));
  put("tube.flange", [-147, 11, 26.9], S(G.disc(0, 1.2, 1.7, endF, P, { steps: 24, bevel: 0.3 }), { tone: "hi" }), [fl1], { bias: 0.12 });
  R.route("tube.event", TUBE_ROUTE, 0.9, { gaps: [[total - 1.2, total]], rims: [1.6, 1.7], limp: true, piece: "rig" });
  tubePieces(TUBE_ROUTE, 0.9, P, { maxLength: 18, spacing: 1, gaps: [[total - 1.2, total]] }).forEach((piece, index) =>
    put(`tube.event:${index}`, piece.mid, tubeSvg(piece, { tone: "mid" }), [A.tube(piece.points, piece.radii)], { bias: 0.05, attrs: ` data-route="tube.event"` }));
}

// ---------- settle / 排序 ----------
// 2026-11-03 遮挡修复：文字类 items（label:1）整体提到最后、actors 六组之前——
// 画家算法下铭牌/标签不再被后画的不透明实体面板（desk.top/conv.rail/cons.body/
// box.tower/box.roof/portsc.board 等）盖住；item.key 与 audit 不受发射序影响。
// label 层内部不用 settle key 序（约束链会把 portsc.board 抬到 bias 13 项之上），
// 改用显式分层：板面载体 → 信号灯/数码窗/槽位窗 → 台铭牌与端口标签 → 长铭牌 → 其余按 key。
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const LABEL_TIER = new Map([
  ["portsc.board", 0],
  ["portsc.CCS", 1], ["portsc.CSC", 1], ["portsc.PR", 1], ["portsc.PRC", 1], ["portsc.PED", 1],
  ["portsc.pls", 1], ["portsc.speed", 1],
  ["portsc.flagtext", 2], ["portsc.pls.t", 2], ["portsc.speed.t", 2], ["slot.win", 2],
  ["cons.label", 3], ["portsc.port", 3],
  ["box.nameplate", 4],
]);
// 其余 label items 默认 tier 5（nameplate 之后：长铭牌板 AABB 不再盖设备灯标签）
const labelTier = (it) => LABEL_TIER.get(it.name) ?? 5;
const solidGroups = R.items.filter((it) => !it.label).map((item) => `<g class="it" data-name="${item.name}"${item.attrs ?? ""}>${item.svg}</g>`);
const labelGroups = R.items.filter((it) => it.label)
  .map((it, i) => ({ it, i }))
  .sort((a, b) => labelTier(a.it) - labelTier(b.it) || a.i - b.i)
  .map(({ it }) => `<g class="it" data-name="${it.name}"${it.attrs ?? ""}>${it.svg}</g>`);
const groups = [...solidGroups, ...labelGroups];

// ---------- 机器 SVG 与卡片 ----------
const machineSvg = k.figureSvg({
  width: W,
  height: H,
  label: "设备登记流水线：三工位机器演示一台 FS 设备从插入到配置完工的登记全程——文书台发命令单，总控台执行并在总线缆上代发 USB 请求票据，试验盒只见票据与状态灯。空格步进，数字键直选帧。",
  body: [...back, `<g class="xhp-rig">${groups.join("")}</g>`,
    `<g data-part="actors-cards"></g><g data-part="actors-tickets"></g><g data-part="actors-slips"></g><g data-part="actors-events"></g><g data-part="actors-bells"></g><g data-part="actors-fx"></g>`],
});

// ---------- 动画数据 ----------
const ORIG = at([0, 0, 0]);
const BX = [at([1, 0, 0])[0] - ORIG[0], at([1, 0, 0])[1] - ORIG[1]];
const BY = [at([0, 1, 0])[0] - ORIG[0], at([0, 1, 0])[1] - ORIG[1]];
const BZ = [at([0, 0, 1])[0] - ORIG[0], at([0, 0, 1])[1] - ORIG[1]];
const DATA_ = {
  P, KS, ORIG, BX, BY, BZ,
  cable: CABLE_PLUGGED.map((p) => p.map(f2)),
  tube: TUBE_ROUTE.map((p) => p.map(f2)),
  bossCons: [95.5, 0, 8],
  bossBox: [110.5, 0, 19],
  hook: [100, -16, 5.2],
  consTop: CONS_TOPT,
  bells: {
    b0: { x: 58, y: 16, rest: CONS_TOPT + 6.5, press: CONS_TOPT + 5.4 },
    b1: { x: 78, y: 2, rest: CONS_TOPT + 6.5, press: CONS_TOPT + 5.4 },
  },
  slipPath: [[-193, 38, 4.2], [-16, 38, 4.2], [-16, 30.9, 6.4]],
  writePath: [[-193, 38, 4.2], [-20, 38, 4.2], [-1, 33.5, 5.2], [-1, 30.9, 6.6]],
  evTray: { x: -142, y: 17.5, z: 26.6 },
  descTray: { x: -140, y: -11, z: 26.6 },
  descFrom: [58, 10, CONS_TOPT + 1.3],
  outctxFrom: [-166, 14, 24.4],
  outctxTo: { planX: OUTCTX.planX, planY: OUTCTX.planY, z: OUTCTX.z, cx: OUTCTX.cx, cy: OUTCTX.cy },
  trbSlots: EP0_CENTERS.slice(0, 3).map((cx) => ({ x: cx, y: EP0.y + 11, z: 2.5 })),
  railClips: [13.2, 19.2, 25.2, 31.2],
  formFields: ["a0", "a1", "sport", "sroute", "sentries", "etype", "mps", "dcs", "cerr"],
  durs: [4.5, 7.7, 7, 7, 9.1, 8.4, 9.1, 9.8, 7, 9.1, 9.8, 6.3],
};

// ---------- 三方流程图（静态 SVG，12 步） ----------
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const FX_W = 1560, FX_H = 1740;
const FX_LANES = { sw: 240, hc: 780, dev: 1290 };
const FX_BOXW = { sw: 360, hc: 360, dev: 330 };
const FX_EDGE = {
  swR: FX_LANES.sw + FX_BOXW.sw / 2, hcL: FX_LANES.hc - FX_BOXW.hc / 2,
  hcR: FX_LANES.hc + FX_BOXW.hc / 2, devL: FX_LANES.dev - FX_BOXW.dev / 2,
};
const FX_STEPS = [
  {
    n: "F0", pg: "p71",
    hc: { lines: ["USB2 根端口 1：Disconnected", "PP=1 上电，等待插入"], pg: "p71" },
    dev: { lines: ["未连接"], pg: "p71" },
  },
  {
    n: "F1", pg: "p71",
    sw: { lines: ["读事件环：端口状态变化事件", "解析 Port ID → 端口 1"], pg: "p71" },
    hc: { lines: ["插入检出：CCS=1 · CSC=1", "端口 → Disabled（USB2）", "PSCEG 0→1 触发事件"], pg: "p71" },
    dev: { lines: ["上电（Powered）", "只感到上电，别无所见"], pg: "p71·72" },
    arrows: [{ from: "hc", to: "sw", ev: true, lines: ["端口状态变化事件"], pg: "p71" }],
  },
  {
    n: "F2", pg: "p71·72",
    sw: { lines: ["读 PORTSC：CCS=1", "写 PORTSC.PR=1 发起复位"], pg: "p71·72" },
    hc: { lines: ["收到寄存器写", "端口复位进行中"], pg: "p72" },
    arrows: [{ from: "sw", to: "hc", lines: ["寄存器写 PR=1"], pg: "p72" }],
  },
  {
    n: "F3", pg: "p72·75",
    sw: { lines: ["收到端口事件（PRC）"], pg: "p72" },
    hc: { lines: ["复位完成：PRC=1 · PED=1", "PR=0 · PLS=U0（0）", "Port Speed=FS"], pg: "p72·75" },
    dev: { lines: ["Powered → Default", "备好收 SET_ADDRESS"], pg: "p72" },
    arrows: [{ from: "hc", to: "sw", ev: true, lines: ["端口状态变化事件", "（PRC）"], pg: "p72" }],
  },
  {
    n: "F4", pg: "p72·75·76",
    sw: { lines: ["Enable Slot 命令单入命令环", "按门铃 0（DB Target=0）", "DCBAA 1 号格挂输出上下文", "（表项由软件装载）"], pg: "p72·76" },
    hc: { lines: ["回 Slot ID=1（示例，xHC 自选）", "槽 → Enabled"], pg: "p75" },
    arrows: [
      { from: "sw", to: "hc", dy: -16, lines: ["Enable Slot 命令"], pg: "p72" },
      { from: "hc", to: "sw", ev: true, dy: 16, lines: ["命令完成事件", "（Slot ID=1）"], pg: "p75" },
    ],
  },
  {
    n: "F5", pg: "p75·76",
    sw: { lines: ["填输入上下文：A0=1 · A1=1", "Slot：端口 1 · Route String=0", "Entries=1", "EP0：Control · MPS=8 · DCS=1 · CErr=3", "EP0 传输环就绪"], pg: "p75·76" },
  },
  {
    n: "F6", pg: "p76·97",
    sw: { lines: ["Address Device（BSR=0）", "入命令环 · 按门铃 0"], pg: "p76" },
    hc: { lines: ["总线上代发 SET_ADDRESS", "请求发往地址 0 · 新地址 xHC 自选", "槽 Enabled → Addressed"], pg: "p76·87·97" },
    dev: { lines: ["Default → Address", "第一次收到 USB 请求", "（发请求的是 xHC，不是驱动）"], pg: "p76·97" },
    arrows: [
      { from: "sw", to: "hc", dy: -16, lines: ["Address Device", "命令"], pg: "p76" },
      { from: "hc", to: "dev", tk: true, dy: 0, lines: ["SET_ADDRESS 票据"], pg: "p76·97" },
      { from: "hc", to: "sw", ev: true, dy: 16, lines: ["命令完成事件"], pg: "p76" },
    ],
  },
  {
    n: "F7", pg: "p72·73·74",
    sw: { lines: ["GET_DESCRIPTOR 前 8 字节：", "Setup/Data/Status 三 TRB 入 EP0 环", "按门铃 1（DB Target=1）"], pg: "p72·73·74" },
    hc: { lines: ["代发控制读事务"], pg: "p73" },
    dev: { lines: ["回 8 字节描述符", "bMaxPacketSize0=8"], pg: "p72·73" },
    arrows: [
      { from: "sw", to: "hc", dy: -16, lines: ["三 TRB + 门铃 1"], pg: "p73·74" },
      { from: "hc", to: "dev", tk: true, dy: -14, lines: ["GET_DESCRIPTOR", "（前 8 字节）"], pg: "p73" },
      { from: "dev", to: "hc", tk: true, dy: 12, lines: ["8 字节数据"], pg: "p73" },
      { from: "hc", to: "sw", ev: true, dy: 16, lines: ["传输事件"], pg: "p74" },
    ],
    note: { lines: ["仅 FS 必走此步；LS/HS/SS 默认包长 8/64/512 可跳过（p72）"], pg: "p72" },
  },
  {
    n: "F8", pg: "p74",
    sw: { lines: ["Evaluate Context（A1=1）", "回读 bMaxPacketSize0=8", "（与默认一致；若不同则更新 MPS）"], pg: "p74" },
    hc: { lines: ["EP0 Max Packet Size 更新生效"], pg: "p74" },
    arrows: [
      { from: "sw", to: "hc", dy: -16, lines: ["Evaluate Context 命令"], pg: "p74" },
      { from: "hc", to: "sw", ev: true, dy: 16, lines: ["命令完成事件"], pg: "p74" },
    ],
  },
  {
    n: "F9", pg: "p74",
    sw: { lines: ["GET_DESCRIPTOR 读完整描述符", "Device/Configuration Descriptor", "描述符入收件匣"], pg: "p74" },
    hc: { lines: ["代发控制读事务"], pg: "p74" },
    dev: { lines: ["回完整描述符"], pg: "p74" },
    arrows: [
      { from: "hc", to: "dev", tk: true, dy: -14, lines: ["GET_DESCRIPTOR", "（完整）"], pg: "p74" },
      { from: "dev", to: "hc", tk: true, dy: 12, lines: ["描述符数据"], pg: "p74" },
      { from: "hc", to: "sw", ev: true, dy: 16, lines: ["传输事件"], pg: "p74" },
    ],
  },
  {
    n: "F10", pg: "p74·77·88",
    sw: { lines: ["Configure Endpoint 命令单", "SET_CONFIGURATION 事务入 EP0 环", "双操作同成，缺一不可"], pg: "p74·77" },
    hc: { lines: ["槽 Addressed → Configured", "（Configure Endpoint · DC=0）"], pg: "p77·88" },
    dev: { lines: ["Address → Configured", "收到 SET_CONFIGURATION"], pg: "p74" },
    arrows: [
      { from: "sw", to: "hc", dy: -16, lines: ["Configure Endpoint", "+ SET_CONFIGURATION"], pg: "p74" },
      { from: "hc", to: "dev", tk: true, dy: 0, lines: ["SET_CONFIGURATION", "票据"], pg: "p74·77" },
      { from: "hc", to: "sw", ev: true, dy: 16, lines: ["命令完成+传输事件"], pg: "p74" },
    ],
  },
  {
    n: "F11", pg: "p74·78",
    sw: { lines: ["完工：各 EP 传输环可调度 TD", "管道全通"], pg: "p74·78" },
  },
];

function fxBoxSvg(lane, def, y) {
  const x = FX_LANES[lane], w = FX_BOXW[lane];
  const h = 26 + def.lines.length * 21;
  return `<g class="xfp-bx xfp-${lane}">
    <rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="8" class="xfp-box"/>
    ${def.lines.map((ln, j) => `<text x="${x}" y="${y - h / 2 + 23 + j * 21}" class="xfp-t1">${esc(ln)}</text>`).join("")}
    <text x="${x + w / 2 - 10}" y="${y - h / 2 + 17}" class="xfp-pg" text-anchor="end">${esc(def.pg)}</text>
  </g>`;
}
function fxArrowSvg(ar, y) {
  // 按列序取边：起点=出发列朝目标侧的边，终点=目标列朝出发侧的边（方向感由 marker-end 承载）
  const ORDER = { sw: 0, hc: 1, dev: 2 };
  const EDGE_L = { sw: FX_LANES.sw - FX_BOXW.sw / 2, hc: FX_LANES.hc - FX_BOXW.hc / 2, dev: FX_LANES.dev - FX_BOXW.dev / 2 };
  const EDGE_R = { sw: FX_LANES.sw + FX_BOXW.sw / 2, hc: FX_LANES.hc + FX_BOXW.hc / 2, dev: FX_LANES.dev + FX_BOXW.dev / 2 };
  const start = ORDER[ar.from] < ORDER[ar.to] ? EDGE_R[ar.from] : EDGE_L[ar.from];
  const end = ORDER[ar.from] < ORDER[ar.to] ? EDGE_L[ar.to] : EDGE_R[ar.to];
  const fromLane = ar.from;
  const mk = ar.ev ? `xfp-mk-ev-${fromLane}` : `xfp-mk-${fromLane}`;
  const cls = `xfp-ln xfp-${fromLane}${ar.ev ? " xfp-ev" : ""}`;
  const yy = y + (ar.dy || 0);
  const mid = (start + end) / 2;
  const n = ar.lines.length;
  return `<g class="xfp-ar">
    ${ar.lines.map((ln, j) => `<text x="${mid}" y="${yy - 10 - (n - 1 - j) * 18}" class="xfp-t2${ar.tk ? " xfp-tk" : ""}" text-anchor="middle">${esc(ln)}</text>`).join("")}
    <line x1="${start}" y1="${yy}" x2="${end}" y2="${yy}" class="${cls}" marker-end="url(#${mk})"/>
  </g>`;
}
const flowBody = `
<defs>
  ${["sw", "hc", "dev"].map((lane) => `<marker id="xfp-mk-${lane}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="xfp-fill-${lane}"/></marker>`).join("")}
  ${["sw", "hc", "dev"].map((lane) => `<marker id="xfp-mk-ev-${lane}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="xfp-fill-${lane}"/></marker>`).join("")}
</defs>
${Object.entries(FX_LANES).map(([id, x]) => `
  <g class="xfp-lanehdr xfp-${id}">
    <rect x="${x - 160}" y="36" width="320" height="54" rx="8" class="xfp-hdr"/>
    <text x="${x}" y="60" class="xfp-hdr-t" text-anchor="middle">${id === "sw" ? "xHCI 驱动" : id === "hc" ? "xHC 控制器" : "USB 设备"}</text>
    <text x="${x}" y="80" class="xfp-hdr-s" text-anchor="middle">${id === "sw" ? "system software（系统软件）" : id === "hc" ? "the xHC" : "USB device"}</text>
  </g>
  <line x1="${x}" y1="90" x2="${x}" y2="1690" class="xfp-life"/>`).join("")}
${FX_STEPS.map((st, i) => {
    const y = 158 + i * 134;
    let g = `<g class="xfp-row">`;
    g += `<circle cx="34" cy="${y}" r="17" class="xfp-numbg"/><text x="34" y="${y + 4.5}" class="xfp-num" text-anchor="middle">${st.n}</text>`;
    for (const lane of ["sw", "hc", "dev"]) if (st[lane]) g += fxBoxSvg(lane, st[lane], y);
    for (const ar of st.arrows || []) g += fxArrowSvg(ar, y);
    if (st.note) {
      const w = 780, h = 34;
      g += `<rect x="${FX_W / 2 - w / 2}" y="${y + 50}" width="${w}" height="${h}" rx="6" class="xfp-notebox"/>` +
        st.note.lines.map((ln, j) => `<text x="${FX_W / 2}" y="${y + 50 + 22 + j * 17}" class="xfp-fignote" text-anchor="middle">${esc(ln)}</text>`).join("");
    }
    return g + `</g>`;
  }).join("")}
<text x="34" y="1700" class="xfp-fignote">实线＝命令 / 请求流 · 虚线＝事件流 · 绿色＝沿总线行走的 USB 请求票据（设备视角的唯一通道）· 每框角标规范页码</text>`;
const flowSvg = k.figureSvg({
  width: FX_W, height: FX_H,
  label: "USB 设备初始化三方流程：12 步从端口等待到配置完工，驱动左列、xHC 中列、设备右列",
  body: flowBody,
});

// ---------- 页面 ----------
const CSS = readFileSync(join(HERE, "43.css"), "utf8");
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA_));

const navHtml = `
<div class="d3-nav">
  <a href="../../index.html">← 规范目录</a>
  <a href="../4.2-host-controller-init/index.html">← 上一节 §4.2 主机控制器初始化</a>
  <span class="ttl">§4.3 USB 设备初始化</span>
  <span>下一节 §4.4 设备移除（待建）</span>
</div>
<p class="d3-specref">xHCI 1.2b §4.3 USB Device Initialization · p71–80（§4.3.1–§4.3.8 含）</p>`;

const proseHtml = `
<div class="d3-card"><h2>规范要义</h2>
<p>一台设备插入根端口后，登记走一条固定主线：检出插入（USB2 端口先进 Disabled 态）→ 软件写 PORTSC.PR=1 做端口复位——USB2 必须由软件发起，复位完成看 PRC=1、PED=1、PR=0、PLS=U0 四个信号，Port Speed 同时指示设备速度 → Enable Slot 取设备槽 → 软件填输入上下文（A0=1、A1=1）并装载 DCBAA 表项、架好 EP0 传输环 → Address Device（BSR=0）让 xHC 在总线上发 SET_ADDRESS → FS 设备先读描述符前 8 字节拿 bMaxPacketSize0，需要时用 Evaluate Context 更新 EP0 Max Packet Size → 读完整描述符 → Configure Endpoint 与 SET_CONFIGURATION 两个操作都成功，设备与槽同时进 Configured。</p>
<p>三方各管一段：数据结构全由软件准备——输入上下文、EP0 传输环、DCBAA 表项都是软件装载、xHC 只读；xHC 执行命令，并在需要时于总线上代发 USB 请求（SET_ADDRESS、GET_DESCRIPTOR、SET_CONFIGURATION）；设备从头到尾只看见 USB 请求与总线事件，槽/环/上下文对它不可见。规范原文称软件侧为 system software（系统软件），本页统一写「xHCI 驱动」。</p>
<p>三处分支最易混：其一，USB3 端口插入轮询成功自动到 Enabled，USB2 端口必须软件复位才能到 Enabled，且两族的 Disabled 态含义不同；其二，8 字节描述符读取只有 FS 设备必走，LS/HS/SS 默认包长 8/64/512 可跳过；其三，BSR=1 是 legacy 设备分支——先在 Default 态通信、xHC 被禁止发 SET_ADDRESS，成功后槽进 Default 而不是 Addressed。多级拓扑另有逐层要求：每一层的 hub 与 TT 完全初始化后才能处理下一层。</p></div>`;

const quotesHtml = `
<div class="d3-card"><h2>原文对照</h2>
<div class="d3-q"><div class="en">“When the xHC detects a device attach, it shall set the Current Connect Status (CCS) and Connect Status Change (CSC) flags to ‘1’.”</div>
<div class="zh">插入由 xHC 检出：CCS 与 CSC 同时置 1。</div><div class="src">xHCI 1.2b §4.3 步 1 p71</div></div>
<div class="d3-q"><div class="en">“The completion of the port reset shall cause the PORTSC register PRC and PED flags to be set (‘1’), the PR flag to be cleared (‘0’), and the PLS field to be U0 (‘0’). The reset operation sets the USB2 device into the Default state, preparing it for a SET_ADDRESS request.”</div>
<div class="zh">USB2 复位完成是四信号组合：PRC=1、PED=1、PR=0、PLS=U0；复位把设备送入 Default 态，备好收 SET_ADDRESS。</div><div class="src">xHCI 1.2b §4.3 步 3.b p72</div></div>
<div class="d3-q"><div class="en">“After the port successfully reaches the Enabled state, system software shall obtain a Device Slot for the newly attached device using an Enable Slot Command” / “The Enable Slot Command returns a Slot ID that is selected by the host controller.”</div>
<div class="zh">端口到 Enabled 后软件发 Enable Slot 取槽；Slot ID 由 xHC 自选，放在命令完成事件里交回。</div><div class="src">xHCI 1.2b §4.3 步 4 p72 · §4.3.2 p75</div></div>
<div class="d3-q"><div class="en">“system software shall issue an Address Device Command with the Block Set Address Request (BSR) flag cleared to ‘0’” / “Successful completion of the Address Device Command with BSR = ‘0’ shall transition the Device Slot from the Enabled to the Addressed state.”</div>
<div class="zh">主线编址：Address Device 带 BSR=0，成功后槽 Enabled→Addressed、设备 Default→Address；SET_ADDRESS 由 xHC 在总线上代发。</div><div class="src">xHCI 1.2b §4.3.4 p76–77</div></div>
<div class="d3-q"><div class="en">“For LS, HS, and SS devices; 8, 64, and 512 bytes, respectively, are the only packet sizes allowed for the Default Control Endpoint, so step a may be skipped. For FS devices, system software should initially read the first 8 bytes of the USB Device Descriptor to retrieve the value of the bMaxPacketSize0 field”</div>
<div class="zh">8 字节读取仅 FS 必走：LS/HS/SS 默认包长 8/64/512 已定，可跳过；FS 先读描述符前 8 字节取 bMaxPacketSize0。</div><div class="src">xHCI 1.2b §4.3 步 7 p72</div></div>
<div class="d3-q"><div class="en">“The successful completion of both operations is required to advance the state of the USB device from Address to Configured and xHC Device Slot from Addressed to Configured.”</div>
<div class="zh">到 Configured 需要双操作同成：Configure Endpoint 命令成功且 SET_CONFIGURATION 请求成功，缺一不可。</div><div class="src">xHCI 1.2b §4.3 步 10 p74 · §4.3.5 p77</div></div></div>`;

const notesHtml = `
<div class="d3-card"><h2>分支注记</h2><div class="d3-notes">
<div class="d3-note"><h3>USB3 端口：自动 Enabled</h3>
<p>USB3 协议端口插入后进入 Polling：轮询成功自动到 Enabled（PED=1、PR=0、PLS=0），失败回 Disconnected。注意两族的 Disabled 态不同义——USB3 指 DSPORT.Disabled（USB3 规范图 10-9），USB2 指 USB2 规范 Disabled 态（图 11-10）。<br/><span class="pg">xHCI 1.2b §4.3 p71–72</span></p></div>
<div class="d3-note"><h3>BSR=1：legacy 设备分支</h3>
<p>个别 legacy 设备需要先在 Default 态通信再编址：Address Device 带 BSR=1——EP0 先启用，但 xHC 被禁止发 SET_ADDRESS；成功后槽 Enabled→Default（主线 BSR=0 成功是 Enabled→Addressed）。<br/><span class="pg">xHCI 1.2b §4.3.4 p76–77</span></p></div>
<div class="d3-note"><h3>hub 与 TT：逐层初始化</h3>
<p>多级拓扑必须从根集线器起，把每一层的 hub 与 TT 完全初始化后再处理下一层，否则 xHC 行为未定义。<br/><span class="pg">xHCI 1.2b §4.3 p74 Note</span></p></div>
</div></div>`;

const linksHtml = `
<div class="d3-card"><h2>互链</h2>
<p><a href="../../../xhc-machines/fig1-assembly/index.html">四机课 Fig1 总装流水线</a>——TRB 装配机器（Setup/Data/Status 三段控制传输的位域卡）；<a href="../../../xhc-machines/fig4-command-ring/index.html">Fig4 命令环机器</a>——命令环与命令完成事件（§4.6.1）；<a href="../../../xhc-machines/fig2-transfer-ring/index.html">Fig2 传输环分度台</a>——EP0 传输环的生产与消费。</p>
<p><a href="../4.1-command-operation/index.html">§4.1 命令操作</a>——命令模型（命令环 + 门铃 0 + 命令完成事件）；<a href="../4.2-host-controller-init/index.html">§4.2 主机控制器初始化</a>——R/S=1 后端口开始上报连接，本节从此接手；<a href="../../../0009-xhc-transfer-drama.html">0009 传输三视角课</a>——控制传输三段的包序视角。§4.4 设备移除（待建）。</p></div>`;

const machineBody = `<div class="iso-stage xhp-stage" tabindex="0" role="group" aria-label="设备登记流水线动画，十二帧：从端口等待到配置完工。空格或右箭头步进，数字键直选帧。">${machineSvg}<span class="xhp-sr" role="status" aria-live="polite" data-status></span></div>` + zoomBarHtml("放大看 PORTSC 读数板 / 表格卡 / 票据 · 放大后拖动平移（触屏双指）· 全屏后滚轮上下看 · 键盘 + − 0 F");

const body =
  `<style>${CSS}${zoomFsCss()}
.xfp-numbg { fill: var(--anatomy-shade-2); stroke: var(--anatomy-mid); stroke-width: 1.2; }
.xfp-notebox { fill: var(--xhp-note-bg); stroke: var(--anatomy-mid); stroke-dasharray: 5 4; stroke-width: 1.4; }
</style>` +
  navHtml + proseHtml + quotesHtml + notesHtml +
  k.plateHtml({
    fig: "§4.3 · 流程",
    title: "USB 设备初始化三方流程（12 步 · FS · USB2 根端口 1）",
    hint: "可放大看框内文字 · 可全屏 · 虚线=事件流",
    readout: "12 步 · p71–p80",
    keys: [],
    caption: "三列＝三方视角：左列软件动作、中列 xHC 动作、右列设备所见。绿色箭头＝沿总线行走的 USB 请求票据——它们只出现在中列与右列之间。",
    body: `<div class="iso-stage" tabindex="0" role="img" aria-label="USB 设备初始化三方流程图，十二步">${flowSvg}</div>` + zoomBarHtml("放大看框内文字 · 全屏后滚轮上下看 · 键盘 + − 0 F"),
  }) +
  k.plateHtml({
    fig: "§4.3 · 动画",
    title: "设备登记流水线 · 一台 FS 设备的三方登记全程",
    hint: "空格/→ 步进 · ← 回退 · 0-9 直选帧 · Q/W 选 F10/F11 · R 复位 · A 自动",
    readout: "设备 未接 · 槽 — · PLS — · 事件 0",
    keys: [
      { mark: "lit", label: "当前动作部件：命令单 / 票据 / 事件卡 / 门铃钮" },
      { mark: "raised", label: "PORTSC 读数板：CCS/CSC/PR/PRC/PED 五信号灯 + PLS 数码窗 + 速度窗" },
      { mark: "edge", label: "票据（绿色）＝沿总线缆行走的 USB 请求——设备视角的唯一通道" },
      { mark: "dim", label: "事件卡（琥珀色）＝沿事件环回到文书台的完成通知" },
    ],
    caption: "演示样例：FS 设备插入 USB2 根端口 1。Slot ID=1 与新地址 1 为示例值（均由 xHC 自选）；主线 BSR=0；8 字节描述符读取仅 FS 必走；到 Configured 需 Configure Endpoint 与 SET_CONFIGURATION 双操作同成。",
    body: machineBody,
  }) +
  linksHtml + `
<p class="d3-foot">判据：xHCI 1.2b（625472 Rev 1.2b）§4.3 p71–80 · 引文逐字核对，证据见 <a href="EVIDENCE.md">EVIDENCE.md</a> · 生成于 2026-11-03</p>`;

// 双 .iso-stage：第二实例（机器台）用选择器补丁绑定
const zfsFlow = zoomFsScript({ focus: [] });
const zfsMach = zoomFsScript({ focus: ['[data-name="portsc.board"]'] })
  .replace('document.querySelector(".iso-stage")', 'document.querySelectorAll(".iso-stage")[1]')
  .replace('document.querySelector(".iso-zoombar")', 'document.querySelectorAll(".iso-zoombar")[1]');

const script = kitScript() + LIVE + zfsFlow + zfsMach;
const page = k.pageHtml({ title: "§4.3 USB 设备初始化 · xHCI 规范对照学习", theme: THEME, body, script, width: 1500 });
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} items`, `scale ${KS.toFixed(3)}`);

A.auditOrExit(R, P, {});

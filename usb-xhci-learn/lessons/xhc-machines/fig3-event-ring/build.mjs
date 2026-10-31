// Fig3 回执登记机：事件环的生产与消费（Hero）
// 判据：xHCI 1.2b（625472）+ linux d9008e061539；画面断言逐条见 EVIDENCE.md
// 机器：邮局分拣环形台 16 槽（Table 6-95 合法段大小下限）。
//   xHC 投递头（生产者）压入 Transfer Event 回执并敲响 MSI-X 电磁铃；
//   软件取件窗口（消费者）核对色带（Cycle==CCS）收卡、拨 ERDP 牌、回写 ERDP 寄存器——
//   指针所有权与传输环（Fig2）反转：ERDP 在软件手里。
// 空槽 Cycle 位=0（dma_pool_zalloc 清零，§4.9.2.2 "initialized to '0'"），CCS 初值恒 1（§4.9.4）；
// 消费不擦除：收回执后槽内残留 cyc=1 原样保留（actionflow-0007 修正口径）。
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "/Users/jason/.zcode/skills/anatomy/kit/iso-kit.mjs";
import * as G from "/Users/jason/.zcode/skills/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "/Users/jason/.zcode/skills/anatomy/kit/tube.mjs";
import * as A from "/Users/jason/.zcode/skills/anatomy/kit/audit.mjs";
import { kitScript } from "/Users/jason/.zcode/skills/anatomy/scripts/inline-kit.mjs";
import { makeGeo } from "./geometry.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

const W = 820;
const H = 580;
const AZIMUTH = 45;
const ELEVATION = 45;

// ---------- 世界布局（与 Fig2 同一套物理：同基座/同台/同环轨，指针牌换边） ----------
const BASE = { x: -182, y: -134, w: 424, d: 274, r: 10 };
const BASE_H = 11;
const FOOT_H = 5;
const T = [-56, -12];
const R_TABLE = 96;
const TABLE_Z = 24, TABLE_H = 8, TOP = TABLE_Z + TABLE_H;
const PR = 72;
const A0 = 80;
const MAST_TOP = TOP + 38;
const BOOM_Z = 60.5;
const HEAD_PARK = 50.2;
const WAY_MIN = 35;
const RAIL_R = 90, RAIL_Z = 46, RAIL_TOP = 49.5, RAIL_MID = (RAIL_Z + RAIL_TOP) / 2;
const POST_B = [130, 185, 245, 315];          // 环轨立柱方位（避开取件窗口工作弧 80–125°）
const BELL = [-152, 102];                     // 铃柱（Fig2 门铃位）
const BELL_STRIKE_B = -26;                    // 铃锤方位（指向投递头）
const REG = [-159.7, 48.4];                   // ERDP 寄存器面板（台外，角不进台面；右半被 F4 亭体遮挡=真实景深，教学行在铃立牌）
const REG_N_B = AZIMUTH + 12;                 // 面板法线方位（面向观者）
const ERST = [-163.6, 18.9];                  // ERST 索引牌
const JUNCTION = [-124, 82];                  // 接线盒
const CARD_B = 59;                            // 卡面法线方位角
const CARD_O = [150, 98, 78];
const CARD_EX = [Math.sin((CARD_B * Math.PI) / 180), -Math.cos((CARD_B * Math.PI) / 180), 0];

const L = { T, PR, TOP, A0, AZIMUTH, ELEVATION, BOOM_Z, HEAD_PARK, WAY_MIN, RAIL_TOP, MAST_TOP, BELL, BELL_STRIKE_B, REG, REG_N_B, ERST, CARD_O, CARD_EX };

const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [T[0] - R_TABLE, T[1] - R_TABLE, TABLE_Z], [T[0] + R_TABLE, T[1] + R_TABLE, TABLE_Z],
    [T[0], T[1], MAST_TOP + 12],
    [T[0] - 114, T[1] - 114, 56], [T[0] + 114, T[1] + 114, 56],
    [BELL[0] - 11, BELL[1] - 11, 0], [BELL[0] + 11, BELL[1] + 11, 30],
    [REG[0] - 20, REG[1] - 20, 0], [REG[0] + 20, REG[1] + 20, 50],
    [CARD_O[0] - 90 * CARD_EX[0], CARD_O[1] - 90 * CARD_EX[1], CARD_O[2] + 66],
    [CARD_O[0] + 90 * CARD_EX[0], CARD_O[1] + 90 * CARD_EX[1], CARD_O[2] - 66],
  ],
  W, H, { pad: 24, azimuth: AZIMUTH, elevation: ELEVATION },
);

const geo = makeGeo(k, G, P, L);
const { at, S, Ln, Dots } = geo;
const KS = G.scaleOf(P);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const bearingDeg = (i) => (A0 + i * 22.5);

const R = A.recorder(P);
let OWNER = null; // 当前装配名：同装配的 shape 互免 sunk 判定
const record = (shape) => {
  if (OWNER && !shape.owner) shape.owner = OWNER;
  return R.solid(shape);
};
function put(name, ref, svg, shapes = [], { bias = 0, ...rest } = {}) {
  return R.put({ name, at: ref, bias, svg, shapes, piece: "rig", ...rest });
}

// ---------- 帧状态（真值同源） ----------
// enq/deq=槽号；cards=槽号→回执 Cycle 位；ip=IMAN.IP；ehb=ERDP.EHB；reg=ERDP 寄存器指针窗；
// stack=窗口柜台已收回执数；vals=位域卡是否出值。
// F2 敲铃（IP 置 1 → EHB 同步置 1，§5.5.2.3.3）；F4 写 ERDP（EHB 写 1 清 0），F3 起 IP 已被软件确认清除
//（内核 xhci_handle_events 入口即清 IP，xhci-ring.c:3101）。
const FRAMES = [
  { enq: 0, deq: 0, pcs: 1, ccs: 1, cards: {}, ip: 0, ehb: 0, reg: 0, stack: 0, vals: false },
  { enq: 2, deq: 0, pcs: 1, ccs: 1, cards: { 0: 1, 1: 1 }, ip: 0, ehb: 0, reg: 0, stack: 0, vals: true },
  { enq: 2, deq: 0, pcs: 1, ccs: 1, cards: { 0: 1, 1: 1 }, ip: 1, ehb: 1, reg: 0, stack: 0, vals: true },
  { enq: 2, deq: 2, pcs: 1, ccs: 1, cards: {}, ip: 1, ehb: 1, reg: 0, stack: 2, vals: true },
  { enq: 2, deq: 2, pcs: 1, ccs: 1, cards: {}, ip: 0, ehb: 0, reg: 2, stack: 2, vals: true },
  { enq: 2, deq: 2, pcs: 1, ccs: 1, cards: {}, ip: 0, ehb: 0, reg: 2, stack: 2, vals: true },
];
const PHASES = ["空环待命", "已投递 · 待铃", "铃响 · 中断挂起", "取件中", "回写寄存器", "静默 · 环空"];

// ---------- 基座（静态背层） ----------
const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P)}"/>`);
for (const [x, y] of byDepth(k.corners(BASE, 22))) {
  back.push(S(k.cylinder(x, y, 7.5, -BASE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 5.8, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
}
back.push(S(k.slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.4), { tone: "mid", inner: Ln(k.sideSeam(BASE, -4.5, P, 8), { tone: "faint" }) }));
back.push(Ln(k.planOutline(k.insetPlan(BASE, 5), 0, P), { tone: "lo" }));
const plateScrews = k.corners(BASE, 10);
back.push(Ln(plateScrews.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
back.push(Dots(plateScrews.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
record(A.slab(BASE, -BASE_H, BASE_H, { name: "stand.base", ground: true }, 8));

// 台前刻度带 + 铭牌
const STRIP = { x: -152, y: BASE.y + BASE.d - 14, w: 254, d: 6.4, r: 1 };
back.push(S(k.slabOf(STRIP, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
{
  const ticks = k.topTicks(STRIP.x + 4, STRIP.x + STRIP.w - 4, 4.6, 5, STRIP.y + 0.8, 0.6, [1.8, 3.4], P);
  back.push(Ln(ticks.minor, { tone: "lo" }), Ln(ticks.major, { tone: "mid" }));
}
const LABEL = { x: -210, y: BASE.y + BASE.d - 33, w: 34, d: 14, r: 1.2 };
back.push(S(k.slabOf(LABEL, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
back.push(Ln(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P, 3), { tone: "faint" }));
back.push(Ln([22, 15, 18].map((w, i) => k.lineOnTop([LABEL.x + 4, LABEL.y + 3.6 + i * 3.4], [LABEL.x + 4 + w, LABEL.y + 3.6 + i * 3.4], 0.8, P)).join(""), { tone: "lo", free: true }));
back.push(Dots([at([LABEL.x + LABEL.w - 2.8, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.8, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.45 }));

// ---------- 中央立柱 + 圆分度台（立柱在台面处断开为两件：台下柱身 / 台上毂座+桅杆） ----------
let MAST_SHAPE = null;
OWNER = "column";
{
  const lower = record(A.cylinder(T[0], T[1], 8.5, 0, TABLE_Z, { name: "column.lower" }));
  put("column", [T[0], T[1], 12],
    S(k.cylinder(T[0], T[1], 8.5, 0, TABLE_Z, P, 36), { tone: "mid" }) +
    Ln([10, 18].map((z) => k.sideArc(T[0], T[1], 8.5, z, P, 20)).join(""), { tone: "faint" }),
    [lower]);
}
{
  OWNER = "mast";
  // 桅杆在投递头毂（z58-64.5）处断成两段：毂后段画在毂之前，毂上段画在毂之后
  const collar = record(A.cylinder(T[0], T[1], 11, TOP, 4, { name: "column.collar" }));
  MAST_SHAPE = record(A.cylinder(T[0], T[1], 4.6, TOP + 4, 58 - TOP - 4, { name: "mast.lower" }));
  put("mast", [T[0], T[1], 44],
    S(k.cylinder(T[0], T[1], 11, TOP, 4, P, 32), { tone: "lo" }) +
    S(k.cylinder(T[0], T[1], 4.6, TOP + 4, 58 - TOP - 4, P, 24), { tone: "mid", crease: "none" }) +
    Ln([TOP + 8, TOP + 18].map((z) => k.sideArc(T[0], T[1], 4.6, z, P, 14)).join(""), { tone: "faint" }),
    [collar, MAST_SHAPE]);
  const mastB = record(A.cylinder(T[0], T[1], 4.6, 68.5, MAST_TOP - 68.5, { name: "mast.upper" }));
  const cap = record(A.cylinder(T[0], T[1], 5.4, MAST_TOP, 2.6, { name: "mast.cap" }));
  put("mast.top", [T[0], T[1], MAST_TOP - 4],
    S(k.cylinder(T[0], T[1], 4.6, 68.5, MAST_TOP - 68.5, P, 24), { tone: "mid", crease: "none" }) +
    S(k.cylinder(T[0], T[1], 5.4, MAST_TOP, 2.6, P, 28), { tone: "mid" }),
    [mastB, cap]);
}
let TABLE_SHAPE = null;
{
  const F = G.frameOf([T[0], T[1], 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  OWNER = "table";
  TABLE_SHAPE = record(A.cylinder(T[0], T[1], R_TABLE, TABLE_Z, TABLE_H, { name: "table" }));
  put("table", [T[0], T[1], TABLE_Z + 4],
    `<g class="fb-tab">` +
    S(k.cylinder(T[0], T[1], R_TABLE, TABLE_Z, TABLE_H, P, 96, 0.8), { tone: "hi", crease: "lo" }) +
    Ln(G.arcOf(F, TABLE_H, R_TABLE - 3.4, P, { trim: 0.2 }), { tone: "faint" }) +
    `</g>`,
    [TABLE_SHAPE]);
}

// ---------- 16 槽坑 + 色带（深度序插入 item 表） ----------
const POCKETS = [];
for (let i = 0; i < 16; i++) POCKETS.push(i);
const SLOT_NUMS = (() => {
  const nums = [];
  for (const i of [0, 4, 8, 12]) {
    const b = geo.slotBearing(i) + 0.3;
    const p = [T[0] + 87 * Math.cos(b), T[1] + 87 * Math.sin(b)];
    nums.push(k.faceTextSvg(k.topMatrix(p, TOP + 0.1, P, "x"), String(i), { size: 4.6, tone: "mid", anchor: "middle" }));
  }
  return nums.join("");
})();

// ---------- MSI-X 电磁铃（柱 + 铃碗 + 电磁铁箱 + 铭牌 + IP 灯） ----------
let COILBOX_SHAPE = null;
{
  const bell = geo.bellStatic();
  const coilC = bell.coilC;
  OWNER = "bell";
  const postShape = record(A.cylinder(BELL[0], BELL[1], 8.5, 0, 18, { name: "bell.post" }));
  COILBOX_SHAPE = record(A.slab({ x: coilC[0] - 3.6, y: coilC[1] - 3.6, w: 7.2, d: 7.2, r: 1.2 }, 10.5, 11, { name: "bell.coilbox", seated: true, cut: [postShape] }, 2));
  put("bell", [BELL[0], BELL[1], 12],
    bell.svg,
    [
      postShape,
      // 铃碗托架（柱顶 18 → 碗底 20.1）与铃碗
      record(A.disc(G.frameAlong([BELL[0], BELL[1], 17.9], [0, 0, 1]), 0, 2.2, 4.2, { name: "bell.bracket" })),
      record(A.solid(G.frameAlong([BELL[0], BELL[1], 20.1], [0, 0, 1]), bell.dome, { name: "bell.dome" })),
      COILBOX_SHAPE,
    ],
    { bias: 0.3 });
  // MSI-X 立牌（lo 底 + hi 墨大字，dark 1x 可读；IP 灯在牌上）
  const sign = geo.bellSignStatic();
  put("bellsign", [sign.sp[0], sign.sp[1], 10.4],
    sign.svg,
    [
      record(A.prism(sign.Fp, sign.plinth, 0, 2.2, { name: "bellsign.plinth" })),
      record(A.prism(sign.F, sign.poly, 0, 2.2, { name: "bellsign.panel" })),
    ],
    { bias: 0.35 });
  // 铃锤（动件：击碗角 0→1）
  OWNER = "hammer";
  const h0 = geo.hammerParts(0);
  const hinge = record(A.disc(G.frameAlong(h0.pivot, h0.rest), -1.6, 1.6, 1.9, { name: "hammer.hinge", seated: true, cut: [COILBOX_SHAPE] }));
  put("hammer", h0.pivot,
    `<g data-part="hammer">${geo.hammerSvg(0)}</g>`,
    [
      hinge,
      record(A.prism(h0.F, [[-0.62, -0.62], [0.62, -0.62], [0.62, 0.62], [-0.62, 0.62]], 0, h0.len, { name: "hammer.arm", seated: true, cut: [COILBOX_SHAPE] })),
      record(A.ball(h0.tip, 1.1, { name: "hammer.ball" })),
    ],
    { bias: 0.5 });
}
// 接线盒 + 铃磁铁箱出线（缆端落在盒左侧面）
{
  OWNER = "junction";
  const jx = JUNCTION[0], jy = JUNCTION[1];
  put("junction", [jx, jy, 3],
    S(k.slabOf({ x: jx - 4.4, y: jy - 3.2, w: 8.8, d: 6.4, r: 1 }, 0, 5.6, P, 2, 0.4), { tone: "lo" }) +
    Dots([at([jx - 2.8, jy - 1.8, 5.6]), at([jx + 2.8, jy + 1.8, 5.6])], { size: 0.4 }),
    [record(A.slab({ x: jx - 4.4, y: jy - 3.2, w: 8.8, d: 6.4, r: 1 }, 0, 5.6, { name: "junction" }, 2))]);
  const dir = [Math.cos((L.BELL_STRIKE_B * Math.PI) / 180), Math.sin((L.BELL_STRIKE_B * Math.PI) / 180)];
  const coilC = [BELL[0] + 12.1 * dir[0], BELL[1] + 12.1 * dir[1]];
  const route = G.fillet([[coilC[0], coilC[1], 10.5], [coilC[0], coilC[1], 6.5], [coilC[0] + 1.5, coilC[1] - 5, 3.2], [jx - 8, jy + 0.5, 2.6], [jx - 4.4, jy + 0.5, 2.6]], 3.2, 8, { P, tube: 0.62 });
  R.route("wire.bell", route, 0.62, { piece: "rig", limp: true, tips: [[coilC[0], coilC[1], 10.5], [jx - 4.4, jy + 0.5, 2.6]] });
  tubePieces(route, 0.62, P, { maxLength: 18 }).forEach((piece, index) =>
    put(`wire.bell:${index}`, piece.mid, tubeSvg(piece, { tone: "lo" }), [A.tube(piece.points, piece.radii)], { bias: 0.05, route: "wire.bell", chunk: index }));
}

// ---------- ERDP 寄存器面板 + EHB 旗 ----------
{
  OWNER = "reg";
  const rp = geo.registerPanelStatic();
  put("regpanel", [REG[0], REG[1], 20],
    rp.svg,
    [
      record(A.prism(rp.Fp, rp.plinth, 0, 3, { name: "reg.plinth" })),
      record(A.prism(rp.F, rp.poly, 0, 2.6, { name: "reg.panel" })),
      record(A.disc(rp.portF, 0, 1.3, 1.35, { name: "reg.port" })),
    ],
    { bias: 0.4 });
  const piv = geo.ehbPivot();
  const nb = (L.REG_N_B * Math.PI) / 180;
  const n = [Math.cos(nb), Math.sin(nb), 0];
  // 旗座小凸台（面板顶）
  put("ehb.base", piv,
    S(k.cylinder(piv[0] - 2.2 * n[0], piv[1] - 2.2 * n[1], 1.2, 37, 1.3, P, 16), { tone: "lo" }),
    [record(A.cylinder(piv[0] - 2.2 * n[0], piv[1] - 2.2 * n[1], 1.2, 37, 1.3, { name: "ehb.post" }))],
    { bias: 0.3 });
  put("ehb.flag", piv,
    `<g data-part="ehbflag">${geo.ehbFlagSvg(0)}</g>`,
    [record(A.box([piv[0] - 2.6, piv[1] - 2.6, 38], [piv[0] + 5.4, piv[1] + 5.4, 45.6], { name: "ehb.flagbox" }))],
    { bias: 0.5 });
}

// ---------- ERST 索引牌 ----------
{
  OWNER = "erst";
  const ep = geo.erstPlateStatic();
  put("erst", [ERST[0], ERST[1], 11],
    ep.svg,
    [
      record(A.prism(ep.Fp, ep.plinth, 0, 2.2, { name: "erst.plinth" })),
      record(A.prism(ep.F, ep.poly, 0, 2.2, { name: "erst.plate" })),
    ],
    { bias: 0.3 });
}

// ---------- 位域刻度卡架 ----------
{
  OWNER = "cardstand";
  const nbC = (CARD_B * Math.PI) / 180;
  const nC = [Math.cos(nbC), Math.sin(nbC)];
  const w2 = geo.CARD.w / 2 + 2.4, h2 = geo.CARD.h / 2 + 2.4;
  const F = { o: [CARD_O[0] - w2 * CARD_EX[0], CARD_O[1] - w2 * CARD_EX[1], CARD_O[2] + h2], a: [Math.cos((CARD_B * Math.PI) / 180), Math.sin((CARD_B * Math.PI) / 180), 0], u: CARD_EX, v: [0, 0, 1] };
  const poly = [[0, 0], [geo.CARD.w + 4.8, 0], [geo.CARD.w + 4.8, -(geo.CARD.h + 4.8)], [0, -(geo.CARD.h + 4.8)]];
  const CARDPANEL_SHAPE = record(A.prism(F, poly, -2.4, 0, { name: "card.panel" }));
  const standX = CARD_O[0] - 66 * CARD_EX[0] - 2 * nC[0];
  const sy = CARD_O[1] - 66 * CARD_EX[1] - 2 * nC[1];
  put("cardstand", [standX, sy, 30],
    S(k.cylinder(standX, sy, 4.6, 0, 3, P, 24), { tone: "lo" }) +
    S(k.cylinder(standX, sy, 2.2, 3, CARD_O[2] + 2, P, 16), { tone: "mid", crease: "none" }),
    [
      record(A.cylinder(standX, sy, 4.6, 0, 3, { name: "cardstand.foot" })),
      record(A.cylinder(standX, sy, 2.2, 3, CARD_O[2] + 2, { name: "cardstand.post", seated: true, cut: [CARDPANEL_SHAPE] })),
    ]);
  put("cardpanel", [CARD_O[0], CARD_O[1], CARD_O[2]],
    S(G.prismOf(F, poly, -2.4, 0, P), { tone: "lo" }),
    [CARDPANEL_SHAPE],
    { bias: 0.3 });
  // 卡纸（面板前的薄棱柱，覆盖位域刻度内容）
  const paperPoly = [[1.4, -1.4], [geo.CARD.w - 1.4, -1.4], [geo.CARD.w - 1.4, -(geo.CARD.h - 1.4)], [1.4, -(geo.CARD.h - 1.4)]];
  put("card", [CARD_O[0], CARD_O[1], CARD_O[2]],
    `<g data-part="cardface">${geo.cardSvg(geo.EVENT_CARD)}</g>`,
    [record(A.prism(F, paperPoly, 0, 0.3, { name: "card.paper" }))],
    { bias: 0.5 });
}

OWNER = null;
// ---------- 消费者环轨 + 4 立柱 ----------
{
  const route = [];
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    route.push([T[0] + RAIL_R * Math.cos(a), T[1] + RAIL_R * Math.sin(a), RAIL_MID]);
  }
  R.route("rail", route, 1.75, { piece: "rig", closed: true, tips: [null, null] });
  tubePieces(route, 1.75, P, { closed: true, maxLength: 22, stripes: false }).forEach((piece, index) =>
    put(`rail:${index}`, piece.mid, tubeSvg(piece, { tone: "mid" }), [A.tube(piece.points, piece.radii)], { bias: 0.1, route: "rail", chunk: index }));
  OWNER = "rail";
  for (const deg of POST_B) {
    const b = (deg * Math.PI) / 180;
    const px = T[0] + 104 * Math.cos(b), py = T[1] + 104 * Math.sin(b);
    const inner = RAIL_R + 1.75; // 臂内端贴到轨管外缘（轨被立柱持住）
    const armRing = [];
    const N = 8;
    for (let s = 0; s <= N; s++) armRing.push([px - (104 - inner) * (s / N) * Math.cos(b) - 2 * Math.sin(b), py - (104 - inner) * (s / N) * Math.sin(b) + 2 * Math.cos(b)]);
    for (let s = N; s >= 0; s--) armRing.push([px - (104 - inner) * (s / N) * Math.cos(b) + 2 * Math.sin(b), py - (104 - inner) * (s / N) * Math.sin(b) - 2 * Math.cos(b)]);
    put(`rail.post${deg}`, [px, py, RAIL_Z / 2],
      S(k.cylinder(px, py, 3.4, 0, RAIL_Z, P, 24), { tone: "lo" }) +
      S(k.extrude(armRing, RAIL_Z, 4.6, P, { convex: true, bevel: 0.3 }), { tone: "mid" }) +
      Dots([at([px, py, 0.1])], { size: 0.5 }),
      [
        record(A.cylinder(px, py, 3.4, 0, RAIL_Z, { name: `rail.post` })),
        record(A.extruded(armRing, RAIL_Z, 4.6, { name: `rail.arm` })),
      ]);
  }
}

// ---------- 触发索（投递头 → 铃锤；F0 姿态入审计，实时随方位重建） ----------
{
  const armMid0 = geo.hammerMid(0);
  const route0 = G.fillet(geo.cordRoute(bearingDeg(0) * Math.PI / 180, armMid0), 8, 10, { P, tube: 0.62 });
  R.route("cord", route0, 0.62, { piece: "rig", limp: true, tips: [route0[0], route0[route0.length - 1]] });
  if (process.argv.includes("--dbg")) {
    const rt = R.tubes.find((t) => t.name === "cord");
    console.log("DBG cord route0[0..2]:", JSON.stringify(route0.slice(0, 3)));
    console.log("DBG cord tube pts[0..2]:", JSON.stringify(rt.points.slice(0, 3)), "tipAxes:", JSON.stringify(rt.tipAxes));
  }
  tubePieces(route0, 0.62, P, { maxLength: 26 }).forEach((piece, index) =>
    put(`cord:${index}`, piece.mid, `<g class="fb-cord" data-part="cord${index}">${tubeSvg(piece, { tone: "lo" })}</g>`, [A.tube(piece.points, piece.radii)], { bias: 0.05, route: "cord", chunk: index }));
}

// ---------- 回写缆（取件窗口挂柱底 → ERDP 寄存器面板进缆口；F0 姿态入审计） ----------
{
  const nb = (L.REG_N_B * Math.PI) / 180;
  const n = [Math.cos(nb), Math.sin(nb), 0];
  const PORT = [REG[0] + 2.6 * n[0], REG[1] + 2.6 * n[1], 7];
  const nbR = (L.REG_N_B * Math.PI) / 180;
  const route0 = G.fillet(geo.cableRoute(bearingDeg(0) * Math.PI / 180, PORT, [Math.cos(nbR), Math.sin(nbR), 0]), 3.2, 8, { P, tube: 0.62 });
  R.route("wcable", route0, 0.62, { piece: "rig", limp: true, tips: [route0[0], PORT] });
  tubePieces(route0, 0.62, P, { maxLength: 24 }).forEach((piece, index) =>
    put(`wcable:${index}`, piece.mid, `<g class="fb-wcab" data-part="wcab${index}">${tubeSvg(piece, { tone: "lo" })}</g>`, [A.tube(piece.points, piece.radii)], { bias: 0.05, route: "wcable", chunk: index }));
  DATA_PORT = PORT;
}
var DATA_PORT;

// ---------- 活动件（F0 姿态入审计） ----------
{
  const b0 = geo.slotBearing(0);
  // 旋臂根部（桅杆后侧，画在桅杆之前）——独立 item 解 Painter 互锁
  OWNER = "producer";
  const rootShapes = geo.producerRootParts(b0).map((p, i) => record(A.prism(p.F, p.poly, p.s0, p.s1, { name: `producer.root${i}` })));
  const hubDir = [Math.cos(b0), Math.sin(b0)];
  rootShapes.push(record(A.cylinder(T[0] + 2 * hubDir[0], T[1] + 2 * hubDir[1], 7, 58, 6.5, { name: "producer.hub", seated: true, cut: [MAST_SHAPE] })));
  put("producer.root", [T[0] + 10 * Math.cos(b0), T[1] + 10 * Math.sin(b0), BOOM_Z + 3],
    `<g data-part="producerroot">${geo.producerRootSvg(b0)}</g>`,
    rootShapes,
    { bias: 1 });
  // 旋臂身（桅杆前侧）
  const parts = geo.producerParts(b0, HEAD_PARK);
  parts.push(geo.tieRod(b0));
  const shapes = parts.map((p, i) => record(A.prism(p.F, p.poly, p.s0, p.s1, { name: `producer.p${i}` })));
  for (const [i, plate] of geo.PRODUCER_FLAGS(b0).entries()) {
    shapes.push(record(A.extruded(plate.ring, plate.top, 1.2, { name: `producer.flag${i}` })));
  }

  put("producer", [T[0] + 40 * Math.cos(b0), T[1] + 40 * Math.sin(b0), BOOM_Z + 2],
    `<g data-part="producer">${geo.producerSvg(b0, HEAD_PARK, { enqLabel: 0, pcs: 1 })}</g>`,
    shapes,
    { bias: 2 });
  // 取件窗口：轨上件（拖板/挂柱/取件臂/旗，画在轨管之后）与轨下件（柜台/顶檐/取件头）
  OWNER = "booth";
  const topShapes = geo.boothTopParts(b0).map((p, i) => record(A.prism(p.F, p.poly, p.s0, p.s1, { name: `booth.top${i}`, ...(i === 0 ? { touch: ["rail"] } : {}) })));
  for (const [i, plate] of geo.BOOTH_FLAGS(b0).entries()) {
    topShapes.push(record(A.extruded(plate.ring, plate.top, 1.2, { name: `booth.flag${i}` })));
  }
  put("booth.top", [T[0] + 92 * Math.cos(b0), T[1] + 92 * Math.sin(b0), RAIL_TOP + 3],
    `<g data-part="boothtop">${geo.boothTopSvg(b0, { erdp: 0 })}</g>`,
    topShapes,
    { bias: 2.4 });
  const cshapes = geo.boothParts(b0, 38.5).map((p, i) => record(A.prism(p.F, p.poly, p.s0, p.s1, { name: `booth.p${i}` })));
  put("booth", [T[0] + 90 * Math.cos(b0), T[1] + 90 * Math.sin(b0), 40],
    `<g data-part="booth">${geo.boothSvg(b0, { ccs: 1, stack: 0, zb: 38.5 })}</g>`,
    cshapes,
    { bias: 2.2 });
  OWNER = null;
}

// ---------- 审计 + 排序 + 槽坑插入 ----------
if (process.argv.includes("--dbg")) {
  for (const it of R.items) {
    for (const sh of it.shapes ?? []) {
      const b = A.boundsOf(sh);
      if ([b.min, b.max].flat().some((v) => v == null || Number.isNaN(v) || !Number.isFinite(v))) {
        console.log("DBG NaN bounds:", it.name, sh.name, sh.kind, JSON.stringify(b));
        if (sh.F) console.log("   F:", JSON.stringify({ o: sh.F.o, a: sh.F.a, u: sh.F.u, v: sh.F.v }), "s", sh.s0, sh.s1, "poly0", JSON.stringify(sh.poly?.[0]));
      }
    }
  }
  const wc = R.tubes.find((t) => t.name === "wcable");
  const boss = R.solids.find((s2) => s2.name === "reg.port");
  console.log("DBG wcable tips:", JSON.stringify(wc.tips), "owner:", wc.owner);
  console.log("DBG boss:", boss && boss.name, "sdf@tip:", boss ? A.sdf(boss, wc.tips[1]).toFixed(3) : "MISSING");
  const bo = R.items.find((it) => it.name === "booth");
  console.log("DBG booth shapes:", bo.shapes.map((s2) => s2.name).join(","));
}
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
{
  const order = POCKETS.slice().sort(
    (a, b) => k.depthOf([geo.slotCentre(a)[0], geo.slotCentre(a)[1], TOP], P) - k.depthOf([geo.slotCentre(b)[0], geo.slotCentre(b)[1], TOP], P),
  );
  const tableIdx = R.items.findIndex((it) => it.name === "table");
  const baseKey = R.items[tableIdx].key;
  const chunk = order.map((i, kx) => ({
    name: `pocket.${i}`,
    key: baseKey + 0.02 + kx * 0.001,
    svg: geo.pocketSvg(i) + geo.bandSvg(i) + `<g data-part="tray" data-slot="${i}"></g>`,
    attrs: "",
  }));
  chunk.push({
    name: "table.dress",
    key: baseKey + 0.02 + 16 * 0.001,
    svg: geo.tableDress() + SLOT_NUMS,
    attrs: "",
  });
  R.items.splice(tableIdx + 1, 0, ...chunk);
}

// ---------- 组装 ----------
const groups = R.items.map((item) => `<g class="it" data-name="${item.name}"${item.attrs ?? ""}>${item.svg}</g>`);
const svg = k.figureSvg({
  width: W,
  height: H,
  label:
    "邮局分拣环形台上的十六槽事件环：xHC 投递头（生产者）把 Transfer Event 回执压入槽位并敲响 MSI-X 电磁铃；软件取件窗口（消费者）核对槽沿 Cycle 色带收卡、拨动自己的 ERDP 牌并回写 ERDP 寄存器——指针所有权与传输环反转。",
  body: [...back, `<g class="fb-rig">${groups.join("")}</g>`].join(""),
});

// ---------- 实时脚本数据 ----------
const DATA = {
  P,
  T, A0,
  BOOM_Z, HEAD_PARK,
  hammerPivot: geo.HAMMER_PIVOT,
  bellStrikeB: BELL_STRIKE_B,
  regPort: DATA_PORT,
  regN: [Math.cos((REG_N_B * Math.PI) / 180), Math.sin((REG_N_B * Math.PI) / 180), 0],
  frames: FRAMES,
  phases: PHASES,
  cardNormal: geo.EVENT_CARD,
  cardO: CARD_O, cardEx: CARD_EX,
};

const geoSource = readFileSync(join(HERE, "geometry.mjs"), "utf8").replace(/^export /gm, "");
const latheSource = readFileSync("/Users/jason/.zcode/skills/anatomy/kit/lathe.mjs", "utf8")
  .replace(/^import .*$/m, "")
  .replace(/^export /gm, "");
const latheScript = `const G = (() => {${latheSource}\nreturn { viewOf, lightOf, scaleOf, toneOf, frameAlong, frameOf, pointOf, radialOf, tangentOf, disc, ringBand, prismOf, sphereOf, solidOf, bandsOf, arcOf, circleOf, fadeOf, ribsOf, dotsOf, fillet, resample, pathLength, cut, pointAlong, tangentAlong, spiral, dot3, add3, sub3, mul3, unit3, cross3, len3, lerp3, add3, sub3, mul3, unit3, cross3, len3 };})();\n`;
const tubeSource = readFileSync("/Users/jason/.zcode/skills/anatomy/kit/tube.mjs", "utf8").replace(/^import [^;]*;/gm, "").replace(/^export /gm, "");
const tubeScript = `const { tubePieces, tubeSvg, ringsSvg } = (() => {${tubeSource}\nreturn { tubePieces, tubeSvg, ringsSvg };})();\n`;
const geoScript = `const makeGeoFn = ${geoSource.replace(/^export function makeGeo/, "function makeGeo")}\n;const makeGeo = makeGeoFn;\n`;

const LIVE = `
const D = ${JSON.stringify(DATA)};
const K = { iso, pathOf, solidSvg, lineSvg, dotsSvg, roundedPlan, insetPlan, extrude, cylinder, knurl, sideArc };
const L = { T: D.T, PR: 72, TOP: 32, A0: D.A0, AZIMUTH: 45, ELEVATION: 45, BOOM_Z: D.BOOM_Z, HEAD_PARK: D.HEAD_PARK, WAY_MIN: 35, RAIL_TOP: 49.5, BELL: [-152, 102], BELL_STRIKE_B: D.bellStrikeB, REG: [-159.7, 48.4], REG_N_B: 57, ERST: [-163.6, 18.9], CARD_O: D.cardO, CARD_EX: D.cardEx };
const geo = makeGeo(K, G, D.P, L);
const stage = document.querySelector(".iso-stage");
const svgRoot = stage.querySelector("svg");
const $ = (sel) => svgRoot.querySelector(sel);
const $$ = (sel) => svgRoot.querySelectorAll(sel);
const readout = document.querySelector("[data-readout]");
const statusEl = document.querySelector("[data-status]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const frames = D.frames;
const SLOT_BEARING = (i) => geo.slotBearing(i);
const CORD_N = ${R.items.filter((it) => String(it.name).startsWith("cord:")).length};
const WCAB_N = ${R.items.filter((it) => String(it.name).startsWith("wcable:")).length};

let frame = 0;
let anim = null;
let state = snapshot(0);
let dispE = SLOT_BEARING(0), dispD = SLOT_BEARING(0);
let dispHead = D.HEAD_PARK, dispZb = 39.5, dispEhb = 0;
let wcabSig = "", hammerSig = "x", ehbSig = "";

function snapshot(i) {
  const f = frames[i];
  return {
    enq: f.enq, deq: f.deq, pcs: f.pcs, ccs: f.ccs,
    cards: { ...f.cards }, ip: f.ip, ehb: f.ehb, reg: f.reg,
    stack: f.stack, vals: f.vals,
    headZ: D.HEAD_PARK, zb: 38.5,
    bearingE: null, bearingD: null,
    carry: false, compare: false, fly: null,
    strikeAt: 0, writeAt: 0,
  };
}

function bearingOf(x, fallback) { return x != null ? x : fallback; }

function cordChunks(bearing, armAngle) {
  const armMid = geo.hammerMid(armAngle);
  const route = G.fillet(geo.cordRoute(bearing, armMid), 8, 10, { P: D.P, tube: 0.62 });
  return tubePieces(route, 0.62, D.P, { maxLength: 26 });
}
function wcabChunks(bearing) {
  const route = G.fillet(geo.cableRoute(bearing, D.regPort, D.regN), 3.2, 8, { P: D.P, tube: 0.62 });
  return tubePieces(route, 0.62, D.P, { maxLength: 24 });
}

function render(s, dt) {
  const dtn = dt || 0.016;
  // 投递头（xHC · 生产者）：方位/冲压头高度指数趋近
  const targetE = bearingOf(s.bearingE, SLOT_BEARING(s.enq));
  dispE += (targetE - dispE) * (1 - Math.exp(-dtn / 0.16));
  dispHead += (s.headZ - dispHead) * (1 - Math.exp(-dtn / 0.1));
  $('[data-part="producerroot"]').innerHTML = geo.producerRootSvg(dispE);
  $('[data-part="producer"]').innerHTML = geo.producerSvg(dispE, dispHead, { enqLabel: s.enq, pcs: s.pcs });
  // 铃锤角（击碗包络）+ 触发索
  const age = s.strikeAt ? (performance.now() - s.strikeAt) / 1000 : 1e9;
  const burst = s.strikeAt ? Math.min(1, sm(0, 0.055, age)) * Math.exp(-Math.max(0, age - 0.055) / 0.34) : 0;
  const hammerAngle = still.matches ? 0 : burst;
  const hSig = dispE.toFixed(2) + ":" + hammerAngle.toFixed(3);
  if (hSig !== hammerSig) {
    hammerSig = hSig;
    $('[data-part="hammer"]').innerHTML = geo.hammerSvg(hammerAngle);
    const pieces = cordChunks(dispE, hammerAngle);
    pieces.forEach((pc, i) => {
      const el = $('[data-part="cord' + i + '"]');
      if (el) el.innerHTML = tubeSvg(pc, { tone: "lo" });
    });
  }
  const gong = $('[data-part="gong"]');
  if (gong) { const c = burst > 0.12 ? "fb-hit" : ""; if (gong.getAttribute("class") !== c) gong.setAttribute("class", c); }
  // 取件窗口（软件 · 消费者）
  const targetD = bearingOf(s.bearingD, SLOT_BEARING(s.deq));
  dispD += (targetD - dispD) * (1 - Math.exp(-dtn / 0.16));
  dispZb += (s.zb - dispZb) * (1 - Math.exp(-dtn / 0.1));
  // 飞行中的回执（口袋 → 柜台）
  let flySpec = null;
  if (s.fly) {
    const el = performance.now() - s.fly.t0;
    let x, y, z;
    if (el < 150) {
      const t = el / 150, e2 = t * t;
      x = s.fly.a[0] + (s.fly.b[0] - s.fly.a[0]) * e2 * 0.5;
      y = s.fly.a[1] + (s.fly.b[1] - s.fly.a[1]) * e2 * 0.5;
      z = s.fly.a[2] + (s.fly.mid - s.fly.a[2]) * e2;
    } else {
      const t = Math.min(1, (el - 150) / 220);
      x = s.fly.a[0] + (s.fly.b[0] - s.fly.a[0]) * (0.5 + 0.5 * t);
      y = s.fly.a[1] + (s.fly.b[1] - s.fly.a[1]) * (0.5 + 0.5 * t);
      z = s.fly.mid + (s.fly.b[2] - s.fly.mid) * t;
    }
    flySpec = { x, y, z, cyc: s.fly.cyc };
  }
  $('[data-part="boothtop"]').innerHTML = geo.boothTopSvg(dispD, { erdp: s.deq });
  $('[data-part="booth"]').innerHTML = geo.boothSvg(dispD, { ccs: s.ccs, stack: s.stack, zb: dispZb, carry: s.carry, compare: s.compare, fly: flySpec });
  // 回写缆
  const wSig = dispD.toFixed(2);
  if (wSig !== wcabSig) {
    wcabSig = wSig;
    const pieces = wcabChunks(dispD);
    pieces.forEach((pc, i) => {
      const el = $('[data-part="wcab' + i + '"]');
      if (el) el.innerHTML = tubeSvg(pc, { tone: "lo" });
    });
  }
  // 槽内回执
  for (let i = 0; i < 15; i++) {
    const g = $('[data-part="tray"][data-slot="' + i + '"]');
    if (!g) continue;
    const cyc = s.cards[i];
    const html = cyc === undefined || cyc === null ? "" : "<g>" + geo.receiptSvg(i, cyc) + "</g>";
    if (g.innerHTML !== html) g.innerHTML = html;
  }
  // 色带（消费不擦除：cards 里没有的槽回 0）
  $$(".fb-band").forEach((el) => {
    const slot = Number(el.getAttribute("data-slot"));
    const cyc = slot in s.cards ? s.cards[slot] : 0;
    const v = String(cyc);
    if (el.getAttribute("data-cyc") !== v) el.setAttribute("data-cyc", v);
  });
  // IP 灯 / EHB 旗 / 寄存器指针窗 / 写入闪
  const lamp = $('[data-part="iplamp"]');
  if (lamp) { const c = s.ip ? "fb-iplamp on" : "fb-iplamp"; if (lamp.getAttribute("class") !== c) lamp.setAttribute("class", c); }
  // 占位：iplamp 在 fb-plate 作用域内，.on 规则见 CSS
  dispEhb += (s.ehb - dispEhb) * (1 - Math.exp(-dtn / 0.14));
  const eSig = dispEhb.toFixed(3);
  if (eSig !== ehbSig) {
    ehbSig = eSig;
    $('[data-part="ehbflag"]').innerHTML = geo.ehbFlagSvg(dispEhb);
  }
  const regval = $('[data-part="regval"]');
  if (regval && regval.textContent !== "槽 " + s.reg) regval.textContent = "槽 " + s.reg;
  const wAge = s.writeAt ? (performance.now() - s.writeAt) / 1000 : 1e9;
  const wOn = s.writeAt && wAge < 0.5;
  $$(".fb-wcab").forEach((el) => {
    const c = "fb-wcab" + (wOn ? " on" : "");
    if (el.getAttribute("class") !== c) el.setAttribute("class", c);
  });
  const rf = $('[data-part="regface"]');
  if (rf) { const c = "fb-regface" + (wOn ? " fb-litflash" : ""); if (rf.getAttribute("class") !== c) rf.setAttribute("class", c); }
  // 卡面
  const face = $('[data-part="cardface"]');
  if (face) {
    const key = s.vals ? 1 : 0;
    if (face.getAttribute("data-key") !== String(key)) {
      const spec = D.cardNormal;
      const shown = s.vals ? spec : { ...spec, rows: spec.rows.map((r) => ({ ...r, cells: r.cells.map((c) => (c.val !== undefined ? { ...c, val: "–" } : c)) })) };
      face.innerHTML = geo.cardSvg(shown);
      face.setAttribute("data-key", String(key));
    }
  }
  // 读数与 aria
  const pending = s.enq - s.deq;
  const text = "未取回执 " + pending + " · ERDP 槽 " + s.deq + " · 生产轮色 " + s.pcs + " · " + D.phases[frame];
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", "第 " + (frame + 1) + "/6 帧：" + text);
}

function sm(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

function playTo(i) {
  const from = { ...state, cards: { ...state.cards } };
  const to = snapshot(i);
  anim = { from, to, t0: performance.now(), dur: 2300, cues: cuesFor(from, to, i), fired: new Set() };
  frame = i;
  statusEl.textContent = "第 " + (i + 1) + " 帧";
}

function cuesFor(from, to, fi) {
  const cues = [];
  const apply = (t, fn) => cues.push({ at: t, apply: fn });
  const stampSlots = Object.keys(to.cards).map(Number).filter((kk) => from.cards[kk] !== to.cards[kk]).sort((a, b) => a - b);
  // F0→F1：xHC 投递（压回执 → ENQ 推进；IOC 命中生成事件，§4.11.3.1）
  const n = stampSlots.length;
  stampSlots.forEach((slot, i) => {
    const t = 0.04 + (i * 0.6) / Math.max(n, 1);
    apply(t, (s2) => { s2.headZ = 36.6; });
    apply(t + 0.06, (s2) => { s2.cards[slot] = to.cards[slot]; });
    apply(t + 0.09, (s2) => { s2.headZ = D.HEAD_PARK; s2.enq = slot + 1; });
  });
  if (stampSlots.length && to.vals !== from.vals) apply(0.66, (s2) => { s2.vals = to.vals; });
  // F1→F2：投递完成 → 触发索拽铃锤击碗；IP 置 1 → EHB 同步置 1（§5.5.2.3.3）
  if (to.ip && !from.ip) {
    apply(0.08, (s2) => { s2.strikeAt = performance.now(); });
    apply(0.14, (s2) => { s2.ip = 1; s2.ehb = 1; });
  }
  // F2→F3：软件对色收卡（cycle==CCS 才收，§4.9.4）；收后推进 ERDP
  const gone = Object.keys(from.cards).filter((kk) => !(kk in to.cards)).map(Number).sort((a, b) => a - b);
  if (gone.length) {
    const seq = [
      { slot: gone[0], t0: 0.05 },
      gone[1] != null ? { slot: gone[1], t0: 0.45 } : null,
    ].filter(Boolean);
    seq.forEach((st, ix) => {
      const t = st.t0;
      apply(t, (s2) => { s2.compare = true; });
      apply(t + 0.07, (s2) => { s2.compare = false; s2.zb = 35.3; });
      apply(t + 0.13, (s2) => { s2.carry = true; delete s2.cards[st.slot]; s2.zb = 39.5; });
      apply(t + 0.20, (s2) => {
        const a = geo.slotCentre(st.slot);
        const bD = bearingOf(s2.bearingD, SLOT_BEARING(s2.deq));
        const dir = [Math.cos(bD), Math.sin(bD)];
        const tan = [-dir[1], dir[0]];
        const b = [D.T[0] + 91 * dir[0] + 2.2 * tan[0], D.T[1] + 91 * dir[1] + 2.2 * tan[1]];
        s2.fly = { t0: performance.now(), a: [a[0], a[1], 34.3], mid: 46, b: [b[0], b[1], 34.7 + s2.stack * 2.5], cyc: 1 };
        s2.carry = false;
      });
      apply(t + 0.32, (s2) => { s2.stack = ix + 1; s2.fly = null; });
      if (ix < seq.length - 1) apply(t + 0.34, (s2) => { s2.deq = st.slot + 1; });
    });
    apply(0.78, (s2) => { s2.deq = to.deq; });
  }
  // F3→F4：软件写 ERDP（指针窗更新 + 缆闪），EHB 写 1 清 0，IP 已确认
  if (to.reg !== from.reg) {
    apply(0.10, (s2) => { s2.reg = to.reg; s2.writeAt = performance.now(); });
    apply(0.30, (s2) => { s2.ehb = 0; });
    apply(0.45, (s2) => { s2.ip = 0; });
  }
  return cues;
}

let last = 0, raf = 0, visible = false, touring = !still.matches, idleTimer = 0, tourTimer = 0;
const TOUR_DWELL = 3.4;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (anim) {
    const t = Math.min(1, (now - anim.t0) / anim.dur);
    const s = { ...anim.to, cards: { ...anim.from.cards } };
    s.enq = anim.from.enq;
    s.deq = anim.from.deq;
    s.stack = anim.from.stack;
    s.reg = anim.from.reg;
    anim.cues.forEach((cue) => {
      if (t >= cue.at) cue.apply(s);
    });
    state = s;
    if (t >= 1) { state = snapshot(frame); anim = null; }
  }
  if (touring && !anim) {
    tourTimer += dt;
    if (tourTimer > TOUR_DWELL) { tourTimer = 0; playTo((frame + 1) % frames.length); }
  }
  render(state, dt);
  const moving = anim || (touring && !still.matches);
  raf = visible && moving ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!raf && visible) { last = 0; raf = requestAnimationFrame(tick); } };
const arm = () => { touring = false; clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; tourTimer = 0; run(); }, 3600); run(); };
const step = (dir) => { arm(); playTo(Math.min(frames.length - 1, Math.max(0, frame + dir))); };
new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointerdown", () => { arm(); playTo((frame + 1) % frames.length); });
stage.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); step(1); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
  else if (e.key === "Home") { arm(); playTo(0); }
  else if (e.key === "Escape") { touring = false; run(); }
});
window.__fig3 = { step, playTo, pause: () => { touring = false; clearTimeout(idleTimer); }, stateOf: () => state, frameOf: () => frame };
render(state, 0.016);
`;

// ---------- 页面 ----------
const CSS = `
.fb-pocket { fill: var(--fb-pocket); stroke: none; }
.fb-tab .iso-top { fill: var(--fb-tabletop); }
.fb-tab .iso-shade[data-shade="3"] { fill: color-mix(in srgb, var(--fb-tabletop) 86%, white); }
.fb-band { transition: fill 260ms; }
.fb-band[data-cyc="0"] { fill: var(--fb-cyc0); }
.fb-band[data-cyc="1"] { fill: var(--fb-cyc1); }
.fb-cyc { transition: fill 260ms; }
.fb-cyc[data-cyc="0"] { fill: var(--fb-cyc0); }
.fb-cyc[data-cyc="1"] { fill: var(--fb-cyc1); }
.fb-chip { stroke: var(--anatomy-line-lo); stroke-width: 0.4; }
.fb-chip[data-cyc="0"] { fill: var(--fb-cyc0); }
.fb-chip[data-cyc="1"] { fill: var(--fb-cyc1); }
.fb-cmplamp { fill: color-mix(in srgb, var(--anatomy-paper) 70%, var(--anatomy-line-lo)); stroke: var(--anatomy-line-lo); stroke-width: 0.4; }
.fb-cmplamp.on { fill: var(--fb-ok); filter: drop-shadow(0 0 4px var(--fb-ok)); }
.fb-iplamp { fill: color-mix(in srgb, var(--anatomy-paper) 70%, var(--anatomy-line-lo)); stroke: var(--anatomy-line-lo); stroke-width: 0.4; }
.fb-iplamp.on { fill: var(--fb-lamp); filter: drop-shadow(0 0 5px var(--fb-lamp)); }
[data-part="gong"].fb-hit path { filter: drop-shadow(0 0 6px var(--fb-lamp)); }
.fb-ehb { fill: color-mix(in srgb, var(--anatomy-paper) 80%, var(--anatomy-line-mid)); stroke: var(--anatomy-line-lo); stroke-width: 0.5; }
.fb-ehb.up { fill: var(--fb-lamp); stroke: var(--anatomy-line-mid); }
.fb-wcab.on path { filter: drop-shadow(0 0 4px var(--fb-lamp)); }
.fb-regface.fb-litflash text { fill: var(--fb-lamp); }
.fb-face { fill: var(--fb-face); stroke: var(--anatomy-line-lo); stroke-width: 0.5; }
.fb-arrow { fill: var(--fb-arrow); }
.fb-sign { font: 700 4.6px var(--anatomy-ui, sans-serif); fill: var(--anatomy-line-hi); letter-spacing: 0.2; }
.fb-sign2 { font-size: 3.4px; font-weight: 500; }
.fb-sign-sm { font: 500 3.7px var(--anatomy-ui, sans-serif); fill: var(--anatomy-line-hi); }
.fb-card { fill: var(--fb-card); stroke: var(--anatomy-line-lo); stroke-width: 0.6; }
.fb-cell { fill: var(--fb-cell); stroke: var(--anatomy-line-lo); stroke-width: 0.4; }
.fb-cell.fb-dim { fill: var(--fb-celldim); stroke: var(--anatomy-line-lo); stroke-width: 0.3; }
.fb-title { font: 600 6.2px var(--anatomy-ui, sans-serif); fill: var(--anatomy-line-hi); letter-spacing: 0.3; }
.fb-sub { font: 500 3.4px var(--anatomy-ui, sans-serif); fill: var(--anatomy-line-hi); }
.fb-off { font: 500 3.4px var(--anatomy-ui, sans-serif); fill: var(--anatomy-line-hi); }
.fb-bit { font: 500 2.9px var(--anatomy-ui, sans-serif); fill: var(--anatomy-line-hi); }
.fb-cellname { font: 500 3.1px var(--anatomy-ui, sans-serif); fill: var(--anatomy-line-hi); }
.fb-cellname.fb-tiny { font-size: 2.3px; }
.fb-val { font: 600 4.6px var(--anatomy-ui, sans-serif); fill: var(--anatomy-line-hi); }
.fb-rule { stroke: var(--anatomy-line-lo); stroke-width: 0.5; fill: none; }
.fb-foot { font: 500 3.7px var(--anatomy-ui, sans-serif); fill: var(--anatomy-line-hi); }
.fb-eng { font: 600 5px var(--anatomy-ui, sans-serif); fill: var(--anatomy-line-hi); }
.fb-eng2 { font: 500 3.2px var(--anatomy-ui, sans-serif); fill: var(--anatomy-line-hi); }
/* 面板/铭牌作用域：lo 底 + hi 墨（dark 1x 可读基线，同 Fig2 铭牌） */
.fb-plate text, .fb-plate circle { fill: var(--anatomy-line-hi); }
.fb-plate .fb-iplamp { stroke: var(--anatomy-line-lo); }
.fb-plate .fb-iplamp.on { fill: var(--fb-lamp); stroke: var(--anatomy-line-mid); }
/* 聚焦框只在键盘可达时显示（不进交付截图） */
.iso-stage:focus { outline: none; }
.iso-stage:focus-visible { outline: 1px solid var(--anatomy-muted); outline-offset: 6px; }
`;
const pageCss = `
<style>
${CSS}
.iso, .iso[data-theme="dark"] {
  --fb-tabletop: #26262a;
  --fb-pocket: color-mix(in srgb, var(--fb-tabletop) 55%, black);
  --fb-cyc1: #d99a3d;
  --fb-cyc0: #5b87a6;
  --fb-face: var(--anatomy-shade2);
  --fb-arrow: var(--anatomy-line-hi);
  --fb-card: color-mix(in srgb, var(--anatomy-paper) 88%, white);
  --fb-cell: color-mix(in srgb, var(--anatomy-paper) 80%, white);
  --fb-celldim: color-mix(in srgb, var(--anatomy-paper) 86%, black);
  --fb-lamp: #ff9d3c;
  --fb-ok: #6fbf7a;
}
.iso[data-theme="light"] {
  --fb-tabletop: #e9e2d4;
  --fb-cyc1: #b26f12;
  --fb-cyc0: #3f708f;
  --fb-lamp: #e06818;
  --fb-ok: #2f8f4a;
}
</style>`;

const body =
  pageCss +
  k.plateHtml({
    fig: "Fig 3",
    title: "回执登记机：事件环的生产与消费",
    hint: "点击或空格步进 · ← → 换帧 · Home 回空环",
    readout: "未取回执 0 · ERDP 槽 0 · 生产轮色 1 · 空环待命",
    keys: [
      { mark: "lit", label: "投递头（xHC·生产者）只写回执与 ENQ；取件窗口（软件·消费者）只收回执、推进 ERDP 并回写寄存器——方向与传输环相反（§4.9.4）" },
      { mark: "raised", label: "槽沿色带=槽内 Cycle 残留：xHC 以 PCS 色写入，空槽为 0；消费不擦除，旧残留与新轮错色自动失效（§4.9.2.2/§4.9.4）" },
      { mark: "edge", label: "回执卡=Transfer Event 位域（§6.4.2.1）；电磁铃=MSI-X 中断（IMAN IP/IE §5.5.2.1）；EHB 旗=ERDP bit3 RW1C（§5.5.2.3.3）" },
    ],
    caption: "事件环方向反转：xHC 生产、软件消费；ERDP 这根指针反过来握在软件手里。",
    body: `<div class="iso-stage" tabindex="0" role="group" aria-label="事件环登记机，六帧：空环、xHC 投递回执、MSI-X 敲铃、软件对色取件、ERDP 签收回写、静默。点击或按空格步进。">${svg}<span role="status" aria-live="polite" data-status></span></div>`,
  });

const script =
  kitScript() +
  latheScript +
  tubeScript +
  geoScript +
  `window.__G = G;\n` +
  LIVE;

const page = k.pageHtml({ title: "Fig3 回执登记机：事件环的生产与消费", theme: THEME, body, script, width: 850 });
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} items`, `scale ${KS.toFixed(3)}`);

A.auditOrExit(R, P, {
  // 8× 目检（/tmp/fig3-s8.png，2026-10-31）：producer 旗面/横臂与 booth 顶檐/拖板
  // 在 z 向相隔 ≥14、径向相隔 ≥0.4，屏幕上为 1.2px² 级投影边界混叠，非真实互锁。
  allow: [["producer", "booth"], ["producer", "booth.top"]],
});

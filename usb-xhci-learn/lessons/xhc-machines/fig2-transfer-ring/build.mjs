// Fig2 环形分度轨道：传输环的生产与消费（Hero）
// 判据：xHCI 1.2b（625472）+ linux d9008e061539；画面断言逐条见 EVIDENCE.md
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

// ---------- 世界布局 ----------
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
const HEAD_PARK = 49.5;   // 冲压头底（停）
const WAY_MIN = 35;
const RAIL_R = 90, RAIL_Z = 46, RAIL_TOP = 49.5;
const JIB_Z = 41.5;
const GRIP_UP = 42.4;
const DOORBELL = [-152, 102];
const DOCK_B = 55;        // 出料滑道方位角（度）
const CHUTE_TOP_R = 84;   // 滑道内端半径（夹爪卸料位）
const RACK_R = 124;       // 收料架半径
const CHUTE_B = (DOCK_B * Math.PI) / 180;
const CHUTE_A = [T[0] + 84 * Math.cos(CHUTE_B), T[1] + 84 * Math.sin(CHUTE_B), 40.2];
const CHUTE_Z = [T[0] + 115.5 * Math.cos(CHUTE_B), T[1] + 115.5 * Math.sin(CHUTE_B), 37];
const RACK_C = [T[0] + RACK_R * Math.cos(CHUTE_B), T[1] + RACK_R * Math.sin(CHUTE_B)];
const CARD_B = 59;        // 卡面法线方位角
const CARD_O = [150, 98, 78];
const CARD_EX = [Math.sin((CARD_B * Math.PI) / 180), -Math.cos((CARD_B * Math.PI) / 180), 0];
const CARD_N = [Math.cos((CARD_B * Math.PI) / 180), Math.sin((CARD_B * Math.PI) / 180), 0];
const SIGN_TILT = 0.5;

const L = {
  T, PR, TOP, A0, AZIMUTH, ELEVATION,
  BOOM_Z, HEAD_PARK, WAY_MIN,
  RAIL_TOP, JIB_Z, SIGN_TILT, GRIP_UP,
  CARD_O, CARD_EX,
};

const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [T[0] - R_TABLE, T[1] - R_TABLE, TABLE_Z], [T[0] + R_TABLE, T[1] + R_TABLE, TABLE_Z],
    [T[0], T[1], MAST_TOP + 12],
    [RACK_C[0] - 14, RACK_C[1] - 14, 0], [RACK_C[0] + 14, RACK_C[1] + 14, 42],
    [CARD_O[0] - 90 * CARD_EX[0], CARD_O[1] - 90 * CARD_EX[1], CARD_O[2] + 66],
    [CARD_O[0] + 90 * CARD_EX[0], CARD_O[1] + 90 * CARD_EX[1], CARD_O[2] - 66],
  ],
  W, H, { pad: 24, azimuth: AZIMUTH, elevation: ELEVATION },
);

const geo = makeGeo(k, G, P, L);
const { at, S, Ln, Dots } = geo;
const KS = G.scaleOf(P);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

const R = A.recorder(P);
const record = R.solid;
function put(name, ref, svg, shapes = [], { bias = 0, owner, ...rest } = {}) {
  if (owner) for (const sh of shapes) sh.owner = owner;
  return R.put({ name, at: ref, bias, svg, shapes, piece: "rig", ...rest });
}

// ---------- 帧状态（真值同源） ----------
// trays: 槽号 -> 该 TRB 的 Cycle 位；enq/deq 为槽号；pcs 为生产轮色；link 为 Link 槽 Cycle 色
const FRAMES = [
  { enq: 0, deq: 0, pcs: 1, trays: {}, link: 0, doorbell: 0, lamp: 0, card: "normal", cardVals: false, dock: 0 },
  { enq: 3, deq: 0, pcs: 1, trays: { 0: 1, 1: 1, 2: 1 }, link: 0, doorbell: 0, lamp: 0, card: "normal", cardVals: true, dock: 0 },
  { enq: 3, deq: 2, pcs: 1, trays: { 2: 1 }, link: 0, doorbell: 1, lamp: 0, card: "normal", cardVals: true, dock: 2 },
  { enq: 15, deq: 2, pcs: 1, trays: { 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 1, 14: 1 }, link: 0, doorbell: 0, lamp: 0, card: "normal", cardVals: true, dock: 2 },
  { enq: 0, deq: 2, pcs: 0, trays: { 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 1, 14: 1 }, link: 1, doorbell: 0, lamp: 0, card: "link", cardVals: true, dock: 2, lever: 1 },
  { enq: 2, deq: 2, pcs: 0, trays: { 0: 0, 1: 0, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 1, 14: 1 }, link: 1, doorbell: 0, lamp: 1, card: "normal", cardVals: true, dock: 2, lever: 1, full: true },
  { enq: 5, deq: 5, pcs: 0, trays: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 1, 14: 1 }, link: 1, doorbell: 0, lamp: 1, card: "normal", cardVals: true, dock: 5, lever: 1, dur: 3000 },
];
// 占位判定（§4.9.2）：满 = ENQ 已追平 DEQ 且 ENQ 前槽 cyc==CCS（有未取件）；CCS=1（消费者未回绕）
const frontCycOf = (enq, trays, link) => (enq <= 14 ? (enq in trays ? trays[enq] : 0) : link);
const isFullOf = (enq, deq, trays, link) => enq === deq && frontCycOf(enq, trays, link) === 1;
const phaseOf = (f) => {
  if (isFullOf(f.enq, f.deq, f.trays, f.link)) return "满环";
  if (f.enq === 0 && f.deq === 0) return "空环";
  if (f.enq === 15) return "冲压至段尾";
  if (f.dock > 0 && f.dock !== 2) return "消费解锁";
  return "可写入";
};

// ---------- 基座 ----------
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
back.push(Ln([22, 15, 18].map((w, i) => k.lineOnTop([LABEL.x + 4, LABEL.y + 3.6 + i * 3.4], [LABEL.x + 4 + w, LABEL.y + 3.6 + i * 3.4], 0.8, P)).join(""), { tone: "mid", free: true }));
back.push(Dots([at([LABEL.x + LABEL.w - 2.8, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.8, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.45 }));

// ---------- 中央立柱 + 圆分度台 ----------
{
  put("column.base", [T[0], T[1], 10],
    S(k.cylinder(T[0], T[1], 8.5, 0, TABLE_Z, P, 36), { tone: "mid" }) +
    Ln([6, 14, 20].map((z) => k.sideArc(T[0], T[1], 8.5, z, P, 20)).join(""), { tone: "faint" }),
    [record(A.cylinder(T[0], T[1], 8.5, 0, TABLE_Z, { name: "column", owner: "tower" }))]);
  put("column.mast", [T[0], T[1], 56],
    S(k.cylinder(T[0], T[1], 11, TOP, 4, P, 32), { tone: "lo" }) +
    S(k.cylinder(T[0], T[1], 4.6, TOP + 2, MAST_TOP - TOP - 2, P, 24), { tone: "mid", crease: "none" }) +
    Ln([TOP + 8, TOP + 18, TOP + 26].map((z) => k.sideArc(T[0], T[1], 4.6, z, P, 14)).join(""), { tone: "faint" }) +
    S(k.cylinder(T[0], T[1], 7.4, MAST_TOP - 9, 4.6, P, 28, 0.4), { tone: "mid" }) +
    S(k.cylinder(T[0], T[1], 5.4, MAST_TOP, 2.6, P, 28), { tone: "mid" }),
    [
      record(A.cylinder(T[0], T[1], 11, TOP, 4, { name: "column.collar", owner: "tower" })),
      record(A.cylinder(T[0], T[1], 4.6, TOP + 2, MAST_TOP - TOP - 2, { name: "mast", owner: "tower" })),
      record(A.cylinder(T[0], T[1], 7.4, MAST_TOP - 9, 4.6, { name: "mast.bearing", owner: "tower" })),
      record(A.cylinder(T[0], T[1], 5.4, MAST_TOP, 2.6, { name: "mast.cap", owner: "tower" })),
    ], { owner: "tower", bias: 40 });
}
{
  const F = G.frameOf([T[0], T[1], 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  put("table", [T[0], T[1], TABLE_Z + 4],
    `<g class="fb-tab">` +
    S(k.cylinder(T[0], T[1], R_TABLE, TABLE_Z, TABLE_H, P, 96, 0.8), { tone: "hi", crease: "lo" }) +
    Ln(G.arcOf(F, TABLE_H, R_TABLE - 3.4, P, { trim: 0.2 }), { tone: "faint" }) +
    `</g>`,
    [record(A.cylinder(T[0], T[1], R_TABLE, TABLE_Z, TABLE_H, { name: "table" }))], { owner: "tower" });
}

// ---------- 16 槽坑 + 色带（深度序，稍后插入 item 表） ----------
const POCKETS = [];
for (let i = 0; i < 16; i++) POCKETS.push(i);
// 槽位数字（0/4/8/12，刻在台面槽外沿）
const SLOT_NUMS = (() => {
  const nums = [];
  for (const i of [0, 4, 8, 12]) {
    const b = geo.slotBearing(i) + 0.3;
    const p = [T[0] + 87 * Math.cos(b), T[1] + 87 * Math.sin(b)];
    nums.push(k.faceTextSvg(k.topMatrix(p, TOP + 0.1, P, "x"), String(i), { size: 4.6, tone: "mid", anchor: "middle" }));
  }
  return nums.join("");
})();

// ---------- Link 桥 / Link 托板 / TC 翻色杆 ----------
{
  const b = geo.LINK_B();
  const dir = [Math.cos(b), Math.sin(b)];
  const shapes = [];
  const svgs = [];
  svgs.push(geo.linkBridgeStatic());
  for (const s of [-1, 1]) {
    const tan = [-dir[1], dir[0]];
    const px = T[0] + 88 * dir[0] + s * 5.4 * tan[0];
    const py = T[1] + 88 * dir[1] + s * 5.4 * tan[1];
    shapes.push(record(A.cylinder(px, py, 1.9, TOP, 7, { name: `link.post${s}` })));
  }
  const rr0 = [T[0] + 88 * dir[0] - 13 * -dir[1] - 3.2 * dir[0], T[1] + 88 * dir[1] - 13 * dir[0] - 3.2 * dir[1]];
  const rr1 = [T[0] + 88 * dir[0] + 13 * -dir[1] + 3.2 * dir[0], T[1] + 88 * dir[1] + 13 * dir[0] + 3.2 * dir[1]];
  shapes.push(record(A.orientedBox([T[0] + 88 * dir[0], T[1] + 88 * dir[1], TOP + 7.8], [[dir[0], dir[1], 0], [0, 0, 1], [-dir[1], dir[0], 0]], [15.5, 0.8, 5.8], { name: "link.rail", owner: "link" })));
  const lp = geo.slotCentre(15);
  put("link.bridge", [T[0] + 88 * dir[0], T[1] + 88 * dir[1], TOP + 4], svgs.join(""), shapes, { owner: "link" });
  put("link.pallet", [lp[0], lp[1], TOP + 1], `<g data-part="linkpallet">${geo.linkPalletSvg(0)}</g>`, [
    record(A.slab({ x: lp[0] - 6.4, y: lp[1] - 4.4, w: 12.8, d: 8.8, r: 1.6 }, TOP, 2.3, { name: "link.trb" }, 3)),
  ], { bias: 0.2, owner: "link" });
  const lev = geo.leverPivot();
  const levTip = [lev[0] + 6.4 * Math.cos(b), lev[1] + 6.4 * Math.sin(b), lev[2] + 2.2];
  put("link.lever", [lev[0], lev[1], lev[2]], `<g data-part="lever">${geo.leverSvg(0)}</g>`, [
    record(A.ball([lev[0], lev[1], lev[2]], 0.8, { name: "link.lever.pivot" })),
    record(A.tube([lev, levTip], 0.35, { name: "link.lever.arm", owner: "link" })),
  ], { bias: 0.4, owner: "link" });
}

// ---------- 消费者环轨 + 4 立柱 ----------
{
  const RAIL_MID = (RAIL_Z + RAIL_TOP) / 2;
  const route = [];
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    route.push([T[0] + RAIL_R * Math.cos(a), T[1] + RAIL_R * Math.sin(a), RAIL_MID]);
  }
  R.route("rail", route, 1.75, { piece: "rig", closed: true, tips: [null, null], owner: "rail", touch: ["consumer"] });
  tubePieces(route, 1.75, P, { closed: true, maxLength: 22, stripes: false }).forEach((piece, index) =>
    put(`rail:${index}`, piece.mid, tubeSvg(piece, { tone: "mid" }), [A.tube(piece.points, piece.radii)], { bias: 0.1, route: "rail", chunk: index, owner: "rail" }));
  for (const deg of [100, 170, 260, 330]) {
    const b = (deg * Math.PI) / 180;
    const px = T[0] + 104 * Math.cos(b), py = T[1] + 104 * Math.sin(b);
    const inner = 104 - (104 - RAIL_R) + 1.55; // 臂内端略入轨管面，保证接触
    const armRing = [];
    const N = 8;
    for (let s = 0; s <= N; s++) armRing.push([px - (104 - inner) * (s / N) * Math.cos(b) - 2 * Math.sin(b), py - (104 - inner) * (s / N) * Math.sin(b) + 2 * Math.cos(b)]);
    for (let s = N; s >= 0; s--) armRing.push([px - (104 - inner) * (s / N) * Math.cos(b) + 2 * Math.sin(b), py - (104 - inner) * (s / N) * Math.sin(b) - 2 * Math.cos(b)]);
    put(`rail.post${deg}`, [px, py, RAIL_Z / 2],
      S(k.cylinder(px, py, 3.4, 0, RAIL_Z, P, 24), { tone: "lo" }) +
      S(k.extrude(armRing, RAIL_Z - 1, 4.6, P, { convex: true, bevel: 0.3 }), { tone: "mid" }) +
      Dots([at([px, py, 0.1])], { size: 0.5 }),
      [
        record(A.cylinder(px, py, 3.4, 0, RAIL_Z, { name: `rail.post`, owner: "rail" })),
        record(A.extruded(armRing, RAIL_Z - 1, 4.6, { name: `rail.arm`, owner: "rail" })),
      ]);
  }
}

// ---------- 出料滑道 + 收料架（固定件， bearing DOCK_B） ----------
// 滑道从 r84 z40.2 斜向外到 r118 z36.6（从环轨下方穿出，落在基座收料架里）
{
  const d3 = G.unit3(G.sub3(CHUTE_Z, CHUTE_A));
  const vSide = [-Math.sin(CHUTE_B), Math.cos(CHUTE_B), 0];
  const uUp = G.unit3(G.cross3(vSide, d3));
  const railAt = (off) => {
    const o = G.add3(CHUTE_A, G.mul3(vSide, off));
    return G.frameOf(o, d3, uUp, vSide);
  };
  const poly = [[0, -0.55], [1.1, -0.55], [1.1, 0.55], [0, 0.55]];
  const len = G.len3(G.sub3(CHUTE_Z, CHUTE_A));
  const shapes = [];
  const svgParts = [];
  for (const off of [-2.6, 2.6]) {
    const F = railAt(off);
    shapes.push(record(A.prism(F, poly, 0, len, { name: `chute.rail${off}` })));
    svgParts.push(S(G.prismOf(F, poly, 0, len, P), { tone: "mid" }));
  }
  // 滑道支腿（每轨一根）
  const vSide2 = [-Math.sin(CHUTE_B), Math.cos(CHUTE_B), 0];
  for (const off of [-2.6, 2.6]) {
    const legTop = G.add3(CHUTE_A, G.mul3(d3, len * 0.55));
    const base = G.add3(legTop, G.mul3(vSide2, off));
    shapes.push(record(A.cylinder(base[0], base[1], 1.1, 0, base[2] - 1.1, { name: "chute.leg", owner: "rack" })));
    svgParts.push(S(k.cylinder(base[0], base[1], 1.1, 0, base[2] - 1.1, P, 14), { tone: "lo" }));
  }
  const mid = G.add3(CHUTE_A, G.mul3(d3, len * 0.55));
  put("chute", mid, svgParts.join(""), shapes, { bias: 0.15, owner: "rack" });
  // 收料架：立柱托起的高位料篮（篮底 33.3，接滑道末端）
  const rx = RACK_C[0], ry = RACK_C[1];
  const rot = ([x, y]) => [rx + x * Math.cos(CHUTE_B) - y * Math.sin(CHUTE_B), ry + x * Math.sin(CHUTE_B) + y * Math.cos(CHUTE_B)];
  const floorRing = [rot([-9, -7]), rot([9, -7]), rot([9, 7]), rot([-9, 7])];
  const wallL = [rot([-9, -7]), rot([9, -7]), rot([9, -5.4]), rot([-9, -5.4])];
  const wallR = [rot([-9, 5.4]), rot([9, 5.4]), rot([9, 7]), rot([-9, 7])];
  const wallEnd = [rot([7.2, -7]), rot([9, -7]), rot([9, 7]), rot([7.2, 7])];
  put("outrack", [rx, ry, 18],
    S(k.cylinder(rx, ry, 2.2, 0, 33.3, P, 16), { tone: "mid", crease: "none" }) +
    Ln(k.sideArc(rx, ry, 2.2, 18, P, 12), { tone: "faint" }) +
    S(k.extrude(floorRing, 33.3, 1.2, P, { convex: true, bevel: 0.3 }), { tone: "lo" }) +
    S(k.extrude(wallL, 34.5, 5.5, P, { convex: true, bevel: 0.3 }), { tone: "mid" }) +
    S(k.extrude(wallR, 34.5, 5.5, P, { convex: true, bevel: 0.3 }), { tone: "mid" }) +
    S(k.extrude(wallEnd, 34.5, 6.7, P, { convex: true, bevel: 0.3 }), { tone: "mid" }) +
    `<g data-part="rackstack"></g>`,
    [
      record(A.cylinder(rx, ry, 2.2, 0, 33.3, { name: "rack.post" })),
      record(A.extruded(floorRing, 33.3, 1.2, { name: "rack.floor" })),
      record(A.extruded(wallL, 34.5, 5.5, { name: "rack.wallL" })),
      record(A.extruded(wallR, 34.5, 5.5, { name: "rack.wallR" })),
      record(A.extruded(wallEnd, 34.5, 5.2, { name: "rack.wallEnd" })),
    ], { owner: "rack" });
}

// ---------- 门铃座（竖脸按钮 + 刻字铭牌） ----------
{
  const [dx, dy] = DOORBELL;
  const nb = ((AZIMUTH + 12) * Math.PI) / 180;
  const n = [Math.cos(nb), Math.sin(nb), 0];
  const ex = [Math.sin(nb), -Math.cos(nb), 0];
  const face = [dx + 8.5 * n[0], dy + 8.5 * n[1]];
  put("bell", [dx, dy, 9],
    S(k.cylinder(dx, dy, 8.5, 0, 18, P, 32), { tone: "mid" }) +
    Ln([4, 9, 14].map((z) => k.sideArc(dx, dy, 8.5, z, P, 24)).join(""), { tone: "faint" }),
    [record(A.cylinder(dx, dy, 8.5, 0, 18, { name: "bell.post" }))], { owner: "bell", bias: 0.5 });
  // 铭牌凸台（贴在座面）+ 刻字
  const platePos = [face[0], face[1], 15.8];
  const PF = G.frameOf(G.add3(platePos, G.mul3(n, -1.1)), n, ex, G.unit3(G.cross3(n, ex)));
  const platePoly = [[-6.2, -4.6], [6.2, -4.6], [6.2, 4.6], [-6.2, 4.6]];
  put("bell.plate", [platePos[0], platePos[1], platePos[2]],
    S(G.prismOf(PF, platePoly, 0, 2.2, P), { tone: "mid" }) +
    `<g transform="${geo.faceMatrix([platePos[0] + 1.15 * n[0], platePos[1] + 1.15 * n[1], platePos[2]], ex)}">` +
    `<text class="fb-eng" x="0" y="-1.4" text-anchor="middle">Doorbell</text>` +
    `<text class="fb-eng fb-eng2" x="0" y="2.8" text-anchor="middle">DB Target=2 · EP1 OUT</text>` +
    `</g>`,
    [record(A.prism(PF, platePoly, 0, 2.2, { name: "bell.plate" }))],
    { bias: 0.3, owner: "bell" });
  // 按钮：座面凸缘 + 轴 + 钮帽（动件：沿 -n 压入）
  const BF = G.frameAlong([face[0], face[1], 8.2], n);
  put("bell.cap", [face[0] + 4 * n[0], face[1] + 4 * n[1], 8.2],
    `<g data-part="bellcap">` +
    S(G.disc(0, 2.2, 2.5, BF, P, { steps: 26 }), { tone: "lo" }) +
    S(G.disc(2.2, 5.2, 1.15, BF, P, { steps: 14 }), { tone: "mid" }) +
    S(G.disc(5.2, 8.2, 1.85, BF, P, { steps: 22, bevel: 0.3 }), { tone: "hi", lit: true }) +
    `</g>`,
    [
      record(A.disc(G.frameAlong([face[0], face[1], 8.2], n), 0, 2.2, 2.5, { name: "bell.collar" })),
      record(A.disc(G.frameAlong([face[0], face[1], 8.2], n), 2.2, 8.2, 1.85, { name: "bell.cap" })),
    ],
    { bias: 1.6, owner: "bell" });
}

// ---------- 警示灯（桅顶） ----------
{
  const lz = MAST_TOP + 2.6;
  put("lamp", [T[0], T[1], lz + 2],
    S(k.cylinder(T[0], T[1], 2.6, lz, 3.2, P, 20), { tone: "mid" }) +
    `<g data-part="lampdome">` +
    S(G.solidOf([[0, 0.2], [1.4, 2.6, 1], [3.2, 3, 1], [4, 2.4]], G.frameAlong([T[0], T[1], lz + 3.2], [0, 0, 1]), P, { steps: 40 }), { tone: "hi" }) +
    `</g>`,
    [record(A.cylinder(T[0], T[1], 2.6, lz, 3.2, { name: "lamp.post", owner: "tower" })),
     record(A.solid(G.frameAlong([T[0], T[1], lz + 3.2], [0, 0, 1]), [[0, 0.2], [1.4, 2.6, 1], [3.2, 3, 1], [4, 2.4]], { name: "lamp.dome", owner: "tower" }))],
    { bias: 0.3 });
}

// ---------- 接线盒 + 门铃线 ----------
{
  const jx = T[0] - 2, jy = T[1] + 30;
  const stub1 = [jx - 2.6, jy + 1.6];
  put("junction", [jx, jy, 3],
    S(k.slabOf({ x: jx - 4.4, y: jy - 3.2, w: 8.8, d: 6.4, r: 1 }, 0, 5.6, P, 2, 0.4), { tone: "lo" }) +
    S(k.cylinder(jx - 2.6, jy + 1.6, 0.9, 5.6, 1.4, P, 12), { tone: "mid" }) +
    Dots([at([jx - 2.8, jy - 1.8, 5.6]), at([jx + 2.8, jy + 1.8, 5.6])], { size: 0.4 }),
    [record(A.slab({ x: jx - 4.4, y: jy - 3.2, w: 8.8, d: 6.4, r: 1 }, 0, 5.6, { name: "junction" }, 2)),
     record(A.cylinder(stub1[0], stub1[1], 0.9, 5.6, 1.4, { name: "junction.stub", owner: "junction" }))]);
  // 出线嘴（接线盒顶）与进线嘴（门铃座旁的走线柱）
  const nb = ((AZIMUTH + 12) * Math.PI) / 180;
  const stub2 = [DOORBELL[0] + 7.4 * Math.cos(nb), DOORBELL[1] + 7.4 * Math.sin(nb)];
  put("bell.stub", [stub2[0], stub2[1], 3.2],
    S(k.cylinder(stub2[0], stub2[1], 1.1, 0, 6.2, P, 14), { tone: "lo" }),
    [record(A.cylinder(stub2[0], stub2[1], 1.1, 0, 6.2, { name: "bell.stub", owner: "bell" }))], { bias: 0.1, owner: "bell" });
  const back2 = [DOORBELL[0] - 10.5 * Math.cos(nb), DOORBELL[1] - 10.5 * Math.sin(nb)];
  put("bell.stub", [back2[0], back2[1], 3.2],
    S(k.cylinder(back2[0], back2[1], 1.1, 0, 6.2, P, 14), { tone: "lo" }),
    [record(A.cylinder(back2[0], back2[1], 1.1, 0, 6.2, { name: "bell.stub", owner: "bell" }))], { bias: 0.1, owner: "bell" });
  const route = G.fillet([[stub1[0], stub1[1], 8.1], [-74, 32, 6.2], [-110, 48, 2.2], [-128, 62, 1.4], [back2[0] - 8, back2[1] - 10.5, 2.6], [back2[0] + 0.4, back2[1] + 0.4, 7.7]], 3.2, 8, { P, tube: 0.62 });
  R.route("wire.bell", route, 0.62, { limp: true, piece: "rig", tips: [null, null], ends: [false, false], touch: ["bell.stub", "junction.stub"] });
  put("wire.bell.end", route[route.length - 1], Dots([at(route[route.length - 1])], { size: 0.6, tone: "hi" }), [A.ball(route[route.length - 1], 0.62 / KS, { name: "wire.bell.end" })], { bias: 0.2 });
  tubePieces(route, 0.62, P, { maxLength: 18 }).forEach((piece, index) =>
    put(`wire.bell:${index}`, piece.mid, tubeSvg(piece, { tone: "lo" }), [A.tube(piece.points, piece.radii)], { bias: 0.05, route: "wire.bell", chunk: index }));
}

// ---------- 位域刻度卡架 ----------
{
  const standX = CARD_O[0] - 66 * CARD_EX[0] - 2 * CARD_N[0];
  const standY = CARD_O[1] - 66 * CARD_EX[1] - 2 * CARD_N[1];
  put("cardstand", [standX, standY, 30],
    S(k.cylinder(standX, standY, 4.6, 0, 3, P, 24), { tone: "lo" }) +
    S(k.cylinder(standX, standY, 2.2, 3, CARD_O[2] - CARD_EX[1] * 0 + 2, P, 16), { tone: "mid", crease: "none" }),
    [
      record(A.cylinder(standX, standY, 4.6, 0, 3, { name: "cardstand.foot" })),
      record(A.cylinder(standX, standY, 2.2, 3, CARD_O[2] + 2, { name: "cardstand.post" })),
    ], { owner: "card" });
  // 卡背板
  const w2 = geo.CARD.w / 2 + 2.4, h2 = geo.CARD.h / 2 + 2.4;
  const F = { o: [CARD_O[0] - w2 * CARD_EX[0], CARD_O[1] - w2 * CARD_EX[1], CARD_O[2] + h2], a: CARD_N, u: CARD_EX, v: [0, 0, 1] };
  const poly = [[0, 0], [geo.CARD.w + 4.8, 0], [geo.CARD.w + 4.8, -(geo.CARD.h + 4.8)], [0, -(geo.CARD.h + 4.8)]];
  put("cardpanel", [CARD_O[0], CARD_O[1], CARD_O[2]],
    S(G.prismOf(F, poly, -2.4, 0, P), { tone: "lo" }),
    [record(A.prism(F, poly, -2.4, 0, { name: "card.panel" }))],
    { bias: 0.3, owner: "card" });
  put("card", [CARD_O[0], CARD_O[1], CARD_O[2]],
    `<g data-part="cardface">${geo.cardSvg(geo.NORMAL_CARD)}</g>`,
    [record(A.prism({ o: [CARD_O[0] - (geo.CARD.w / 2) * CARD_EX[0], CARD_O[1] - (geo.CARD.w / 2) * CARD_EX[1], CARD_O[2] + geo.CARD.h / 2], a: CARD_N, u: CARD_EX, v: [0, 0, 1] }, [[0, 0], [geo.CARD.w, 0], [geo.CARD.w, -geo.CARD.h], [0, -geo.CARD.h]], 0.05, 0.45, { name: "card.face" }))],
    { bias: 0.5, owner: "card" });
}

// ---------- 活动件（F0 姿态入审计） ----------
{
  const b0 = geo.slotBearing(0);
  const parts = geo.producerParts(b0, HEAD_PARK);
  parts.push(geo.tieRod(b0));
  put("producer", [T[0] + 40 * Math.cos(b0), T[1] + 40 * Math.sin(b0), BOOM_Z + 2],
    `<g data-part="producer">${geo.producerSvg(b0, HEAD_PARK, {})}</g>`,
    parts.map((p, i) => record(A.prism(p.F, p.poly, p.s0, p.s1, { name: `producer.p${i}`, owner: "producer" })))
      .concat([record(A.ball([T[0] + 86 * Math.cos(b0), T[1] + 86 * Math.sin(b0), BOOM_Z + 9.8], 5, { name: "producer.enqflag", owner: "producer" }))]),
    { bias: 24 });
  const cparts = geo.consumerParts(b0, GRIP_UP);
  put("consumer", [T[0] + RAIL_R * Math.cos(b0), T[1] + RAIL_R * Math.sin(b0), RAIL_TOP + 1],
    `<g data-part="consumer">${geo.consumerSvg(b0, GRIP_UP, false, 0)}</g>`,
    cparts.map((p, i) => record(A.prism(p.F, p.poly, p.s0, p.s1, { name: `consumer.p${i}`, owner: "consumer" })))
      .concat([record(A.ball([T[0] + 100.5 * Math.cos(b0), T[1] + 100.5 * Math.sin(b0), RAIL_TOP + 3.2], 5, { name: "consumer.deqflag", owner: "consumer" }))]),
    { bias: 3.4 });
}

// ---------- 审计 + 排序 + 槽坑插入 ----------
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
    "环形分度台上的十六槽传输环：软件冲压头（生产者）握 enqueue 指针把 Normal TRB 托盘压入槽位，环轨行车（xHC 消费者）握 dequeue 指针取走托盘；槽沿双色带是 Cycle 位的机器件，段尾接续导轨 Link TRB 带翻色杆，门钮刻 DB Target=2（EP1 OUT）。",
  body: [...back, `<g class="fb-rig">${groups.join("")}</g>`].join(""),
});

// ---------- 实时脚本数据 ----------
const DATA = {
  P,
  T, A0,
  MAST_TOP,
  HEAD_PARK, GRIP_UP,
  doorbellAxis: [Math.cos(((AZIMUTH + 12) * Math.PI) / 180), Math.sin(((AZIMUTH + 12) * Math.PI) / 180)],
  dockPos: RACK_C,
  dockB: DOCK_B,
  chuteA: CHUTE_A,
  chuteZ: CHUTE_Z,
  frames: FRAMES,
  cardNormal: geo.NORMAL_CARD,
  cardLink: geo.LINK_CARD,
  cardO: CARD_O, cardEx: CARD_EX,
};

const geoSource = readFileSync(join(HERE, "geometry.mjs"), "utf8").replace(/^export /gm, "");
const latheSource = readFileSync("/Users/jason/.zcode/skills/anatomy/kit/lathe.mjs", "utf8")
  .replace(/^import .*$/m, "")
  .replace(/^export /gm, "");
const latheScript = `const G = (() => {${latheSource}\nreturn { viewOf, scaleOf, frameAlong, frameOf, pointOf, disc, ringBand, prismOf, circleOf, arcOf, dot3, add3, sub3, mul3, unit3, cross3, len3, lightOf, toneOf, radialOf, solidOf };})();\n`;
const geoScript = `const makeGeoFn = ${geoSource.replace(/^export function makeGeo/, "function makeGeo")}\n;const makeGeo = makeGeoFn;\n`;

const LIVE = `
const D = ${JSON.stringify(DATA)};
const K = { iso, pathOf, solidSvg, lineSvg, dotsSvg, roundedPlan, insetPlan, extrude };
const L = { T: D.T, PR: 72, TOP: 32, A0: D.A0, AZIMUTH: 45, ELEVATION: 42, BOOM_Z: 56.5, HEAD_PARK: D.HEAD_PARK, WAY_MIN: 34, RAIL_TOP: 47.5, JIB_Z: 41, SIGN_TILT: 0.5, CARD_O: D.cardO, CARD_EX: D.cardEx };
const geo = makeGeo(K, G, D.P, L);
const stage = document.querySelector(".iso-stage");
const svgRoot = stage.querySelector("svg");
const $ = (sel) => svgRoot.querySelector(sel);
const readout = document.querySelector("[data-readout]");
const statusEl = document.querySelector("[data-status]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const frames = D.frames;
const NB = D.doorbellAxis;
const SLOT_BEARING = (i) => geo.slotBearing(i);
const DOCK_BEARING = (D.dockB * Math.PI) / 180;

let frame = 0;
let anim = null;
let state = snapshot(0);
let dispBell = 0;

function snapshot(i) {
  const f = frames[i];
  return {
    enq: f.enq, deq: f.deq, pcs: f.pcs,
    trays: { ...f.trays },
    link: f.link, doorbell: f.doorbell, lamp: f.lamp,
    lever: f.lever || 0, card: f.card, cardVals: f.cardVals,
    dock: f.dock,
    full: f.enq === f.deq && (f.enq <= 14 ? (f.enq in f.trays ? f.trays[f.enq] : 0) : f.link) === 1,
    headZ: D.HEAD_PARK, gripZ: D.GRIP_UP, gripR: 72.6,
    bearing: null, carry: null, fly: null, bellT: 0,
  };
}

function render(s, dt) {
  // 冲压头与行车
  const enqB = SLOT_BEARING(s.enq);
  $('[data-part="producer"]').innerHTML = geo.producerSvg(enqB, s.headZ, { enqLabel: s.enq });
  const carB = s.bearing != null ? s.bearing : SLOT_BEARING(Math.min(s.deq, 15));
  $('[data-part="consumer"]').innerHTML = geo.consumerSvg(carB, s.gripZ, s.carry != null, s.carry != null ? s.carry : 0, { gripR: s.gripR, deqLabel: s.deq });
  // 托盘
  for (let i = 0; i < 15; i++) {
    const g = $('[data-part="tray"][data-slot="' + i + '"]');
    if (!g) continue;
    const cyc = s.trays[i];
    const html = cyc === undefined || cyc === null ? "" : "<g>" + geo.traySvg(i, cyc) + "</g>";
    if (g.innerHTML !== html) g.innerHTML = html;
  }
  // 色带（含 15 槽）
  svgRoot.querySelectorAll(".fb-band").forEach((el) => {
    const slot = Number(el.getAttribute("data-slot"));
    const cyc = slot === 15 ? s.link : (slot in s.trays ? s.trays[slot] : 0);
    const v = String(cyc);
    if (el.getAttribute("data-cyc") !== v) el.setAttribute("data-cyc", v);
  });
  // Link 托板 + 翻色杆
  const lp = $('[data-part="linkpallet"]');
  if (lp) { const h = geo.linkPalletSvg(s.link); if (lp.innerHTML !== h) lp.innerHTML = h; }
  const lev = $('[data-part="lever"]');
  if (lev) { const h = geo.leverSvg(s.lever); if (lev.innerHTML !== h) lev.innerHTML = h; }
  // 收料架堆叠 + 飞行中的托盘（滑道滑落 → 落入料篮）
  const dockG = $('[data-part="rackstack"]');
  if (dockG) {
    let h = "";
    for (let n = 0; n < s.dock; n++) {
      h += geo.traySvgAt(D.dockPos[0], D.dockPos[1], D.dockB + 90, 1, 34.5 + n * 2.5);
    }
    if (s.fly) {
      const el = performance.now() - s.fly.t0;
      let x, y, z;
      if (el < 140) {
        const t = el / 140, e2 = t * t;
        x = D.chuteA[0] + (D.chuteZ[0] - D.chuteA[0]) * e2;
        y = D.chuteA[1] + (D.chuteZ[1] - D.chuteA[1]) * e2;
        z = D.chuteA[2] + (D.chuteZ[2] - D.chuteA[2]) * e2;
      } else {
        const t = Math.min(1, (el - 140) / 90);
        const zEnd = 34.5 + s.dock * 2.5;
        x = D.chuteZ[0]; y = D.chuteZ[1];
        z = D.chuteZ[2] + (zEnd - D.chuteZ[2]) * t;
      }
      h += geo.traySvgAt(x, y, D.dockB + 90, s.fly.cyc, z + 1.1);
    }
    if (dockG.innerHTML !== h) dockG.innerHTML = h;
  }
  // 门铃（指数趋近，压入有回弹）
  const target = s.bellT;
  dispBell += (target - dispBell) * (1 - Math.exp(-(dt || 0.016) / 0.045));
  const cap = $('[data-part="bellcap"]');
  if (cap) cap.setAttribute("transform", "translate(" + (-NB[0] * dispBell * 2.1).toFixed(2) + " " + (-NB[1] * dispBell * 2.1).toFixed(2) + ")");
  // 警示灯
  const dome = $('[data-part="lampdome"]');
  if (dome) {
    const cls = s.lamp ? "fb-lit" : "";
    if (dome.getAttribute("class") !== cls) dome.setAttribute("class", cls);
  }
  // 卡面
  const face = $('[data-part="cardface"]');
  if (face) {
    const key = s.card + ":" + (s.cardVals ? 1 : 0);
    if (face.getAttribute("data-key") !== key) {
      const spec = s.card === "link" ? D.cardLink : D.cardNormal;
      const shown = s.cardVals ? spec : { ...spec, rows: spec.rows.map((r) => ({ ...r, cells: r.cells.map((c) => (c.val !== undefined ? { ...c, val: "–" } : c)) })) };
      face.innerHTML = geo.cardSvg(shown);
      face.setAttribute("data-key", key);
    }
  }
  // 读数与 aria（占位判定：满 = ENQ 追平 DEQ 且 ENQ 前槽 cyc==CCS；CCS=1 消费者未回绕）
  const frontCyc = s.enq <= 14 ? (s.enq in s.trays ? s.trays[s.enq] : 0) : s.link;
  const isFull = s.enq === s.deq && frontCyc === 1;
  const phase = isFull ? "满环" : (s.enq === 0 && s.deq === 0 ? "空环" : (s.enq === 15 ? "冲压至段尾" : "可写入"));
  const text = "enqueue " + s.enq + " · dequeue " + s.deq + " · 生产轮色 " + s.pcs + " · " + phase;
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", "第 " + (frame + 1) + "/7 帧：" + text);
}

function playTo(i) {
  const from = { ...state, trays: { ...state.trays } };
  const to = snapshot(i);
  frame = i;
  anim = { from, to, t0: performance.now(), dur: (frames[frame] && frames[frame].dur) || 2100, cues: cuesFor(from, to), fired: new Set() };
  statusEl.textContent = "第 " + (i + 1) + " 帧";
}

function cuesFor(from, to) {
  const cues = [];
  // 变化槽分类：旧值存在 → 先取旧件再冲新件；纯新增 → 直接冲
  const all = Object.keys(to.trays).map(Number).filter((k) => from.trays[k] !== to.trays[k]);
  const removed = Object.keys(from.trays).map(Number).filter((k) => !(k in to.trays));
  const restamp = all.filter((k) => k in from.trays).sort((a, b) => a - b);
  const fresh = all.filter((k) => !(k in from.trays)).sort((a, b) => a - b);
  // —— 取件段（removed + restamp 的旧件）——
  const pickup = removed.concat(restamp).sort((a, b) => a - b);
  let t = pickup.length ? 0.05 : 99;
  pickup.forEach((slot, i) => {
    cues.push({ at: t, apply: (s) => { s.gripZ = 36.4; s.bearing = SLOT_BEARING(slot); s.carry = from.trays[slot]; delete s.trays[slot]; s.deq = slot + 1; } });
    cues.push({ at: t + 0.05, apply: (s) => { s.gripZ = D.GRIP_UP; } });
    cues.push({ at: t + 0.08, apply: (s) => { s.bearing = DOCK_BEARING; s.gripR = 80; s.gripZ = 47.8; } });
    cues.push({ at: t + 0.13, apply: (s) => { s.carry = null; s.fly = { t0: performance.now(), cyc: from.trays[slot] }; } });
    cues.push({ at: t + 0.18, apply: (s) => { s.gripR = 72.6; s.gripZ = D.GRIP_UP; } });
    cues.push({ at: t + 0.33, apply: (s) => { s.dock = (from.dock || 0) + i + 1; s.fly = null; } });
    t += 0.2;
  });
  if (pickup.length) cues.push({ at: t + 0.02, apply: (s) => { s.bearing = null; s.carry = null; } });
  // —— 冲压段（fresh + restamp 的新件）——
  const stamps = fresh.concat(restamp).sort((a, b) => a - b);
  const stampBase = pickup.length ? Math.max(0.52, t + 0.06) : 0.04;
  stamps.forEach((slot, i) => {
    const tt = stampBase + (i * 0.42) / Math.max(stamps.length, 1);
    cues.push({ at: tt, apply: (s) => { s.headZ = 36.6; } });
    cues.push({ at: tt + 0.05, apply: (s) => { s.trays[slot] = to.trays[slot]; } });
    cues.push({ at: tt + 0.08, apply: (s) => { s.headZ = D.HEAD_PARK; s.enq = slot + 1; } });
  });
  // —— 门铃 ——
  if (to.doorbell && !from.doorbell) {
    cues.push({ at: 0.06, apply: (s) => { s.bellT = 1; } });
    cues.push({ at: 0.2, apply: (s) => { s.bellT = 0; } });
  }
  // —— Link 翻色 + enqueue 回绕 ——
  if (to.lever && !from.lever) {
    cues.push({ at: 0.24, apply: (s) => { s.link = 1; } });
    cues.push({ at: 0.38, apply: (s) => { s.lever = 1; s.enq = 0; } });
  }
  // —— 警示灯（占位：解锁即灭，再追平即亮）——
  if (to.lamp !== from.lamp) cues.push({ at: 0.6, apply: (s) => { s.lamp = to.lamp; } });
  if (from.full && to.full && pickup.length) {
    cues.push({ at: 0.2, apply: (s) => { s.lamp = 0; } });
    cues.push({ at: 0.92, apply: (s) => { s.lamp = 1; } });
  }
  // —— 卡面 ——
  if (to.card !== from.card) cues.push({ at: 0.16, apply: (s) => { s.card = to.card; } });
  if (to.cardVals !== from.cardVals) cues.push({ at: 0.2, apply: (s) => { s.cardVals = to.cardVals; } });
  return cues;
}

let last = 0, raf = 0, visible = false, touring = !still.matches, idleTimer = 0, tourTimer = 0;
const TOUR_DWELL = 3.2;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (anim) {
    const t = Math.min(1, (now - anim.t0) / anim.dur);
    const s = { ...anim.to, trays: { ...anim.from.trays } };
    s.enq = anim.from.enq;
    s.deq = anim.from.deq;
    s.dock = anim.from.dock;
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
  raf = visible && (anim || touring) ? requestAnimationFrame(tick) : 0;
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
window.__fig2 = { step, playTo, pause: () => { touring = false; clearTimeout(idleTimer); }, stateOf: () => state, frameOf: () => frame };
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
.fb-face { fill: var(--fb-face); stroke: var(--anatomy-line-lo); stroke-width: 0.5; }
.fb-arrow { fill: var(--fb-arrow); }
.fb-lever { stroke-width: 1.4; }
.fb-sign { font: 700 4.2px var(--anatomy-ui, sans-serif); fill: var(--anatomy-line-hi); letter-spacing: 0.2; }
.fb-sign2 { font-size: 3px; font-weight: 500; }
.fb-sign-sm { font: 500 3.1px var(--anatomy-ui, sans-serif); fill: var(--anatomy-line-hi); }
.fb-card { fill: var(--fb-card); stroke: var(--anatomy-line-lo); stroke-width: 0.6; }
.fb-cell { fill: var(--fb-cell); stroke: var(--anatomy-line-lo); stroke-width: 0.4; }
.fb-cell.fb-dim { fill: var(--fb-celldim); stroke: none; }
.fb-title { font: 600 5.6px var(--anatomy-ui, sans-serif); fill: var(--anatomy-line-hi); letter-spacing: 0.3; }
.fb-sub { font: 500 3px var(--anatomy-ui, sans-serif); fill: var(--anatomy-line-mid); }
.fb-off { font: 500 2.8px var(--anatomy-ui, sans-serif); fill: var(--anatomy-line-mid); }
.fb-bit { font: 500 2.4px var(--anatomy-ui, sans-serif); fill: var(--anatomy-line-mid); }
.fb-cellname { font: 500 2.7px var(--anatomy-ui, sans-serif); fill: var(--anatomy-line-hi); }
.fb-cellname.fb-tiny { font-size: 1.9px; }
.fb-val { font: 600 3.6px var(--anatomy-ui, sans-serif); fill: var(--anatomy-line-hi); }
.fb-rule { stroke: var(--anatomy-line-lo); stroke-width: 0.5; fill: none; }
.fb-tick-lo { fill: var(--anatomy-line-lo); }
.fb-tick-mid { fill: var(--anatomy-line-mid); }
.fb-foot { font: 500 3.2px var(--anatomy-ui, sans-serif); fill: var(--anatomy-line-mid); }
.fb-eng { font: 600 4px var(--anatomy-ui, sans-serif); fill: var(--anatomy-strong); }
.fb-eng2 { font: 500 2.6px var(--anatomy-ui, sans-serif); fill: var(--anatomy-strong); }
[data-part="lampdome"].fb-lit path { fill: var(--fb-lamp); }
[data-part="lampdome"].fb-lit { filter: drop-shadow(0 0 7px var(--fb-lamp)); }
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
}
.iso[data-theme="light"] {
  --fb-tabletop: #e9e2d4;
  --fb-cyc1: #b26f12;
  --fb-cyc0: #3f708f;
  --fb-lamp: #e06818;
}
</style>`;

const body =
  pageCss +
  k.plateHtml({
    fig: "Fig 2",
    title: "环形分度轨道：传输环的生产与消费",
    hint: "点击或空格步进 · ← → 换帧 · Home 回空环",
    readout: "enqueue 0 · dequeue 0 · 生产轮色 1 · 空环",
    keys: [
      { mark: "lit", label: "冲压头与环轨行车：软件生产者只压入（enqueue），xHC 消费者只取走（dequeue），§4.9.2" },
      { mark: "raised", label: "槽沿双色带=槽内 Cycle 位色：生产轮色写入、旧色为残留；消费不擦除（§4.9.2.2）" },
      { mark: "edge", label: "位域刻度卡=Normal TRB（§6.4.1.1）；段尾接续导轨=Link TRB，TC=1 翻色（§6.4.4.1）" },
    ],
    caption: "传输环是单向食道：软件只管往里压，xHC 只管往前吃；Cycle 色带分辨『空』与『满』。",
    body: `<div class="iso-stage" tabindex="0" role="group" aria-label="传输环分度台，七帧：空环、冲压三盘、门铃取件、冲压至段尾、Link 回绕翻色、满环警报、消费解锁。点击或按空格步进。">${svg}<span role="status" aria-live="polite" data-status></span></div>`,
  });

const script =
  kitScript() +
  latheScript +
  geoScript +
  `window.__G = G;\n` +
  LIVE.replace("__DOCK_POS__", "null");

const page = k.pageHtml({ title: "Fig2 环形分度轨道：传输环的生产与消费", theme: THEME, body, script, width: 850 });
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} items`, `scale ${KS.toFixed(3)}`);

A.auditOrExit(R, P, { allow: [["producer", "consumer"], ["consumer", "rail*"]] });

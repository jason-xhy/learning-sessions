import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "/Users/jason/.zcode/skills/anatomy/kit/iso-kit.mjs";
import * as G from "/Users/jason/.zcode/skills/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "/Users/jason/.zcode/skills/anatomy/kit/tube.mjs";
import * as A from "/Users/jason/.zcode/skills/anatomy/kit/audit.mjs";
import { kitScript } from "/Users/jason/.zcode/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

// ================= camera =================
const W = 720, H = 460, AZ = 45, EL = 30;

// ================= world =================
const PLATE = { x: -150, y: -85, w: 300, d: 175, r: 8 };
const PLATE_H = 10, FOOT_H = 5;
const CNT = { x: -128, y: -72, w: 256, d: 150, r: 1.2 };
const CNT_Z0 = 10, CNT_MID = 30, CNT_Z1 = 48, TOP_H = 6;
const TOPZ = CNT_Z1 + TOP_H;                       // 54, counter top surface
const WIN = { y0: -22, y1: 6, z0: 32, z1: 44 };    // receipt window on +x face (x=128)

const RING = { cx: 8, cy: 6, platR: 50, railIn: 34.5, railOut: 48, slotR: 41 };
const SLOT_N = 8, TH0 = 135, LINK_SLOT = 7;
const slotPt = (i, rad = RING.slotR) => {
  const a = ((TH0 + i * 45) * Math.PI) / 180;
  return [RING.cx + rad * Math.cos(a), RING.cy + rad * Math.sin(a)];
};
const SLOT = Array.from({ length: SLOT_N }, (_, i) => slotPt(i));

const CRCR = { plinth: { x: 74, y: -70, w: 44, d: 18, r: 1.2 }, px: 78, py: -66, pw: 38, pd: 7, pz0: 58, pz1: 84 };
const DCB = { x: -118, y: -72, w: 48, d: 22, r: 1.2, z0: TOPZ, z1: 84 };
const CLIP = { hx: -116, hy: 62, hw: 26, hd: 5, hz1: 92 };
const STAMP = { ped: { x: -83, y: 46, w: 10, d: 10, r: 1 }, px: -78, py: 51 };
const MAG = { x: -106, y: 36, w: 15, d: 10, r: 1 };               // tray magazine
const BELL = { x: -64, y: 62, w: 14, d: 12, r: 2, cx: -57, cy: 68 };
const LEG = { x: -46, y: 66, w: 30, d: 5, r: 1, z1: 70 };
const READ = { x: -50, y: 56, w: 42, d: 8, r: 1.2, z1: 96 };
const DESK = { x: 72, y: -22, w: 26, d: 24, r: 1.5 };
const WICK = { x: 8, w: 26 };
const JIB = { armZ: 100, armH: 4.5, r0: 6, r1: 84, parkA: -8.7, parkR: 78.9, cruiseZ: 44 };
const DOC_SLOT = { x: -48, y: 26, w: 9, d: 6, r: 1 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...k.boxCorners(CNT, CNT_Z0, 0),
   [RING.cx - RING.platR, RING.cy - RING.platR, 0], [RING.cx + RING.platR, RING.cy + RING.platR, 0],
   [0, 0, 112], [-128, 78, 0], [128, -72, 0]],
  W, H, { pad: 26, azimuth: AZ, elevation: EL },
);
const V = G.viewOf(P), KS = G.scaleOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const f2 = (v) => Math.round(v * 100) / 100;
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const FT = (m, text, size, tone = "mid", anchor = "start") => k.faceTextSvg(m, text, { size, tone, anchor });
function planeMatrix(o, ex, ey) {
  const p0 = at(o), px = at(G.add3(o, ex)), py = at(G.add3(o, ey));
  return `matrix(${f2(px[0] - p0[0])} ${f2(px[1] - p0[1])} ${f2(py[0] - p0[0])} ${f2(py[1] - p0[1])} ${f2(p0[0])} ${f2(p0[1])})`;
}
const faceM = (x, y, z) => planeMatrix([x, y, z], [1, 0, 0], [0, 0, -1]);
const vtext = (x, y, z, text, size, tone = "mid", anchor = "start") => FT(faceM(x, y, z), text, size, tone, anchor);
function screwDots(plan, inset, z) {
  return Dots(k.corners(plan, inset).map(([x, y]) => at([x, y, z])), { size: 0.5 });
}

// ================= recorder =================
const R = A.recorder(P);
const record = R.solid;
function put(name, ref, svg, shapes = [], { bias = 0, ...rest } = {}) {
  return R.put({ name, at: ref, bias, svg, shapes, piece: "counter", ...rest });
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

// ================= base =================
const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`);
for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
  back.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
}
{
  const svg = S(k.slabOf(PLATE, 0, PLATE_H, P, 8, 1.6), { tone: "lo", inner: Ln(k.sideSeam(PLATE, 6, P, 8), { tone: "faint" }) })
    + Ln(k.planOutline(k.insetPlan(PLATE, 5), PLATE_H, P), { tone: "lo" })
    + Ln(k.corners(PLATE, 10).map(([x, y]) => k.ring(x, y, 2.2, PLATE_H, P, 16)).join(""), { tone: "lo" })
    + screwDots(PLATE, 10, PLATE_H);
  put("stand.plate", [0, 0, PLATE_H / 2], svg, [record(A.slab(PLATE, 0, PLATE_H, { name: "stand.plate", ground: true }, 8))]);
}
{
  const strip = { x: -110, y: 79, w: 96, d: 6.5, r: 1 };
  const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, PLATE_H + 0.6, [2, 3.6], P);
  const svg = S(k.slabOf(strip, PLATE_H, 0.6, P, 3), { tone: "lo", crease: "none" })
    + Ln(t.minor, { tone: "lo" }) + Ln(t.major, { tone: "mid" })
    + FT(k.topMatrix([strip.x + 4, strip.y + 3.4], PLATE_H + 0.6, P, "x"), "MMIO 门铃 · DMA 环 · 事件环", 2.1, "lo");
  put("stand.ruler", [strip.x + strip.w / 2, strip.y + 3, PLATE_H + 0.3], svg, [record(A.slab(strip, PLATE_H, 0.6, { name: "stand.ruler" }, 3))]);
}
{
  const lab = { x: 96, y: 79.5, w: 30, d: 9.5, r: 1.2 };
  const svg = S(k.slabOf(lab, PLATE_H, 0.8, P, 3), { tone: "lo", crease: "none" })
    + Ln(k.planOutline(k.insetPlan(lab, 1.6), PLATE_H + 0.8, P, 3), { tone: "faint" })
    + Ln([20, 14, 17].map((w, i) => k.lineOnTop([lab.x + 4, lab.y + 3.6 + i * 3], [lab.x + 4 + w, lab.y + 3.6 + i * 3], PLATE_H + 0.8, P)).join(""), { tone: "lo", free: true })
    + Dots([[lab.x + lab.w - 2.6, lab.y + 2.4], [lab.x + lab.w - 2.6, lab.y + lab.d - 2.4]].map(([x, y]) => at([x, y, PLATE_H + 0.8])), { size: 0.45 });
  put("stand.label", [lab.x + 15, lab.y + 6.5, PLATE_H + 0.4], svg, [record(A.slab(lab, PLATE_H, 0.8, { name: "stand.label" }, 3))]);
}

// ================= counter body =================
{
  const upL = { x: CNT.x, y: CNT.y, w: CNT.w, d: WIN.y0 - CNT.y, r: CNT.r };
  const upR = { x: CNT.x, y: WIN.y1, w: CNT.w, d: CNT.y + CNT.d - WIN.y1, r: CNT.r };
  const seam = k.sideSeam(CNT, CNT_MID, P, 4);
  const rivets = Dots(Array.from({ length: 15 }, (_, i) => at([-116 + i * 16.5, CNT.y + CNT.d + 0.05, CNT_Z0 + 4])), { size: 0.45, tone: "lo" });
  const faceplate = { x: -118, y: CNT.y + CNT.d, w: 26, d: 1.4, r: 0.6 };
  put("counter.lower", [0, 0, (CNT_Z0 + CNT_MID) / 2],
    S(k.slabOf(CNT, CNT_Z0, CNT_MID - CNT_Z0, P, 4, 0.8), { tone: "mid" })
    + rivets
    + S(k.slabOf(faceplate, 14, 9, P, 2, 0.3), { tone: "lo", crease: "none" })
    + Ln(k.planOutline(k.insetPlan(faceplate, 1.2), 23, P, 2), { tone: "faint" })
    + Ln([18, 13, 15].map((w, i) => k.lineOnTop([-114, CNT.y + CNT.d + 1.4], [-114 + w, CNT.y + CNT.d + 1.4], 16.5 + i * 2.4, P)).join(""), { tone: "lo", free: true }),
    [record(A.slab(CNT, CNT_Z0, CNT_MID - CNT_Z0, { name: "counter.lower" }, 4)),
     record(A.slab(faceplate, 14, 9, { name: "counter.faceplate" }, 2))]);
  const m = WIN;
  const cavity = { x: 118, y: m.y0, w: 10, d: m.y1 - m.y0, r: 0.8 };
  const f = [[128, m.y0, m.z0], [128, m.y1, m.z0], [128, m.y1, m.z1], [128, m.y0, m.z1]];
  const walls = `
    <path class="iso-shade" data-shade="1" d="${k.pathOf([at(f[0]), at([118, m.y0, m.z0]), at([118, m.y0, m.z1]), at(f[3])], true)}"/>
    <path class="iso-shade" data-shade="0" d="${k.pathOf([at(f[0]), at([118, m.y0, m.z0]), at([118, m.y1, m.z0]), at(f[1])], true)}"/>`;
  const winSvg = S(k.slabOf(cavity, m.z0, m.z1 - m.z0, P, 3), { tone: "lo", flat: true })
    + walls
    + Ln(k.pathOf(f.map((p) => at(p)), true), { tone: "lo" })
    + S(k.slabOf({ x: 128, y: -11.4, w: 4, d: 6.8, r: 0.8 }, 35, 6, P, 2, 0.3), { tone: "mid" })
    + `<circle class="fx-glow" data-glow="win" cx="${at([126, m.y0 + 4, m.z0 + 2])[0]}" cy="${at([126, m.y0 + 4, m.z0 + 2])[1]}" r="${f2(1.5 * KS)}"/>`
    + vtext(131, m.y1 + 3, 40, "回执 → Fig3 登记机", 2.4, "mid");
  put("counter.upper", [0, 0, (CNT_MID + CNT_Z1) / 2],
    S(k.slabOf(upL, CNT_MID, CNT_Z1 - CNT_MID, P, 4, 0.8), { tone: "mid", inner: Ln(seam, { tone: "faint" }) })
    + S(k.slabOf(upR, CNT_MID, CNT_Z1 - CNT_MID, P, 4, 0.8), { tone: "mid", inner: Ln(seam, { tone: "faint" }) })
    + winSvg,
    [record(A.slab(upL, CNT_MID, CNT_Z1 - CNT_MID, { name: "counter.upperL" }, 4)),
     record(A.slab(upR, CNT_MID, CNT_Z1 - CNT_MID, { name: "counter.upperR" }, 4)),
     record(A.slab(cavity, m.z0, m.z1 - m.z0, { name: "counter.window" }, 3)),
     record(A.slab({ x: 128, y: -11.4, w: 4, d: 6.8, r: 0.8 }, 35, 6, { name: "counter.winport" }, 2))]);
  const grooves = [
    { x: -78, y: 38.5, w: 46, d: 5, r: 2.5 },
    { x: -106.5, y: 26, w: 62, d: 5, r: 2.5 },
    { x: -106.5, y: -46, w: 5, d: 74.5, r: 2.5 },
  ].map((g) => k.planOutline(g, TOPZ, P, 3)).join("");
  put("counter.top", [0, 0, TOPZ + TOP_H / 2],
    S(k.slabOf(CNT, CNT_Z1, TOP_H, P, 6, 1), { tone: "mid" })
    + Ln(k.planOutline(k.insetPlan(CNT, 4), TOPZ, P, 6), { tone: "lo" })
    + Ln(grooves, { tone: "faint" })
    + screwDots(CNT, 9, TOPZ),
    [record(A.slab(CNT, CNT_Z1, TOP_H, { name: "counter.top" }, 6))]);
}
// (window recess is merged into counter.upper below, so the recess and its
//  opening are one painter's item — no interlock between wall and cavity)
{ // receipt duct: straight run from the window port boss to a riser box on the plate edge
  const route = [[132, -8, 38], [142.5, -8, 38]];
  R.route("duct", route, 2.6, { piece: "counter" });
  tubePieces(route, 2.6, P, { maxLength: 14, spacing: 1.1 }).forEach((piece, i) =>
    put(`duct:${i}`, piece.mid, tubeSvg(piece, { tone: "mid" }), [A.tube(piece.points, piece.radii)], { bias: 0.05, route: "duct", chunk: i }));
  const box = { x: 142.5, y: -12.5, w: 7.5, d: 9, r: 1 };
  slab("duct.box", box, PLATE_H, 34, { tone: "lo" },
    { extra: Ln(k.planOutline(k.insetPlan(box, 1.5), PLATE_H + 34, P, 2), { tone: "faint" })
      + Ln(G.circleOf(G.frameOf([142.5, -8, 38], [1, 0, 0], [0, 1, 0], [0, 0, 1]), 0, 3.4, P, 28), { tone: "lo" })
      + screwDots(box, 2.2, PLATE_H + 34) });
}

// ================= DCBAA cabinet =================
{
  const body = { x: DCB.x, y: DCB.y, w: DCB.w, d: DCB.d, r: DCB.r };
  const fy = DCB.y + DCB.d;
  const CELLW = 6.6, GAP = 0.8, X0 = DCB.x + 2.6;
  let cells = "";
  for (let i = 0; i < 6; i++) {
    const x0 = X0 + i * (CELLW + GAP);
    const pts = [[x0, fy, 60], [x0 + CELLW, fy, 60], [x0 + CELLW, fy, 74], [x0, fy, 74]];
    cells += `<path class="iso-cavity" d="${k.pathOf(pts.map((p) => at(p)), true)}"/>`;
    cells += vtext(x0 + CELLW / 2, fy + 0.05, 71.8, String(i), 2.4, i === 1 ? "hi" : "mid", "middle");
    if (i === 0) cells += vtext(x0 + CELLW / 2, fy + 0.05, 63.5, "Scratchpad", 1.5, "lo", "middle");
    if (i >= 2) cells += vtext(x0 + CELLW / 2, fy + 0.05, 63.5, "0", 2.1, "lo", "middle");
  }
  const nameplate = { x: DCB.x + 7, y: fy, w: 34, d: 1.6, r: 0.6 };
  const svg = S(k.slabOf(body, DCB.z0, DCB.z1 - DCB.z0, P, 4, 0.8), { tone: "mid", inner: Ln(k.sideSeam(body, 76, P, 4), { tone: "faint" }) })
    + S(k.slabOf(k.insetPlan(body, 1.2), DCB.z1, 2, P, 4, 0.4), { tone: "lo" })
    + cells
    + S(k.slabOf(nameplate, 78, 1.4, P, 2), { tone: "hi", crease: "none" })
    + vtext(DCB.x + 24, fy + 1.65, 81.2, "DCBAA · 槽号→上下文地址", 2.2, "mid", "middle")
    + screwDots(body, 4, TOPZ);
  put("dcb.body", [DCB.x + 24, DCB.y + 11, (DCB.z0 + DCB.z1) / 2], svg,
    [record(A.slab(body, DCB.z0, DCB.z1 - DCB.z0, { name: "dcb.body" }, 4)),
     record(A.slab(k.insetPlan(body, 1.2), DCB.z1, 2, { name: "dcb.top" }, 4)),
     record(A.slab(nameplate, 78, 1.4, { name: "dcb.plate" }, 2))]);
  const lampF = G.frameOf([-76, DCB.y + 11, DCB.z1 + 2], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  put("dcb.lamp", [-76, DCB.y + 11, DCB.z1 + 3.4],
    S(G.solidOf([[0, 1.6], [1.2, 1.6], [1.6, 2.1, 1], [2.6, 2.2, 1]], lampF, P, { steps: 20 }), { tone: "hi" })
    + `<circle class="fx-glow" data-glow="addr" cx="${at([-76, DCB.y + 11, DCB.z1 + 4.6])[0]}" cy="${at([-76, DCB.y + 11, DCB.z1 + 4.6])[1]}" r="${f2(2.6 * KS)}"/>`
    + vtext(-76, DCB.y + 11 - 2.6, DCB.z1 + 1.4, "已编址", 1.9, "lo", "middle"),
    [record(A.solid(lampF, [[0, 1.6], [1.2, 1.6], [1.6, 2.1, 1], [2.6, 2.2, 1]], { name: "dcb.lamp" }))], { bias: 0.3 });
}

// ================= CRCR plaque =================
{
  const pl = CRCR, face = pl.py + pl.pd;
  const names = ["RCS", "CS", "CA", "CRR"], bits = ["0", "1", "2", "3"];
  let cells = "";
  for (let i = 0; i < 4; i++) {
    const x0 = 80 + i * 6.6;
    cells += Ln(k.pathOf([[x0, face, 70], [x0 + 6, face, 70], [x0 + 6, face, 78], [x0, face, 78]].map((p) => at(p)), true), { tone: "lo" });
    cells += vtext(x0 + 3, face + 0.05, 76.2, names[i], 2.0, "mid", "middle");
    cells += vtext(x0 + 3, face + 0.05, 71.2, bits[i], 1.7, "lo", "middle");
  }
  cells += vtext(86.6, face + 0.05, 68.2, "RW1S", 1.4, "lo", "middle");
  cells += vtext(99.8, face + 0.05, 68.2, "RW1S", 1.4, "lo", "middle");
  cells += vtext(96, face + 0.05, 64.5, "Ring Pointer 63:6", 1.9, "mid", "middle");
  cells += vtext(97, face + 0.05, 81.6, "CRCR", 2.6, "hi", "middle");
  const plaque = { x: pl.px, y: pl.py, w: pl.pw, d: pl.pd, r: 1 };
  put("crcr.plaque", [pl.px + 16, pl.py + 3.5, (pl.pz0 + pl.pz1) / 2],
    S(k.slabOf(plaque, pl.pz0, pl.pz1 - pl.pz0, P, 3, 0.6), { tone: "mid" }) + cells,
    [record(A.slab(plaque, pl.pz0, pl.pz1 - pl.pz0, { name: "crcr.plaque" }, 3))]);
  slab("crcr.plinth", pl.plinth, TOPZ, 4, { tone: "lo" }, { extra: screwDots(pl.plinth, 3.5, TOPZ + 4) });
  const knobF = G.frameOf([83, face, 73.4], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const kc = at([83, face + 4.06, 73.4]);
  put("crcr.knob", [83, face + 2, 73.4],
    S(G.disc(0, 4, 1.9, knobF, P, { steps: 24, bevel: 0.25 }), { tone: "hi" })
    + Ln(G.ribsOf(knobF, 1, 3.5, 1.9, 18, P, { fade: [0.12, 0.6] }).map((r) => r.d).join(""), { tone: "lo" })
    + `<circle class="fx-cyc" cx="${f2(kc[0])}" cy="${f2(kc[1])}" r="${f2(1.35 * KS)}"/>`,
    [record(A.disc(knobF, 0, 4, 1.9, { name: "crcr.knob" }))], { bias: 0.2 });
  const lampF = G.frameOf([103, face, 73.4], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  put("crcr.crr", [103, face + 1.3, 73.4],
    S(G.solidOf([[0, 1.4], [0.9, 1.4], [1.3, 1.1, 1], [2.1, 0.7, 1], [2.4, 0]], lampF, P, { steps: 20 }), { tone: "hi" })
    + `<circle class="fx-glow on" data-glow="crr" cx="${at([103, face + 1.8, 73.4])[0]}" cy="${at([103, face + 1.8, 73.4])[1]}" r="${f2(2.0 * KS)}"/>`,
    [record(A.solid(lampF, [[0, 1.4], [0.9, 1.4], [1.3, 1.1, 1], [2.1, 0.7, 1], [2.4, 0]], { name: "crcr.crr", owner: "crcr.crr" })),
     record(A.ball([103, face + 1.6, 73.4], 1.6, { name: "crcr.crr.glow", owner: "crcr.crr" }))], { bias: 0.25 });
  // 警示立牌：立在铭牌顶面（z 84），与 CRR 行 / Pointer 行空间分离
  const lock = { x: 100, y: face - 4.2, w: 12, d: 3.6, r: 0.8 };
  const lf = face + 0.05; // front face of the lock plate
  const lockSvg = S(k.slabOf(lock, 84, 11, P, 2, 0.4), { tone: "hi" })
    + Ln(k.planOutline(k.insetPlan(lock, 1), 95, P, 2), { tone: "faint" })
    + Ln([88.6, 90.6].map((z, i) => k.lineOnTop([101.6, lf], [i ? 108.4 : 110, lf], z, P)).join(""), { tone: "lo", free: true })
    + vtext(106, lf + 0.05, 93.2, "CRR=1", 1.8, "mid", "middle")
    + vtext(106, lf + 0.05, 90.2, "写入被忽略", 1.8, "mid", "middle");
  put("crcr.lock", [106, face - 2.4, 89.5], lockSvg, [record(A.slab(lock, 84, 11, { name: "crcr.lock" }, 2))], { bias: 0.3 });
}

// ================= clipboard =================
{
  {
    const hold = { x: CLIP.hx, y: CLIP.hy, w: CLIP.hw, d: CLIP.hd, r: 1 };
    const clipbar = { x: CLIP.hx + 6, y: 63, w: 14, d: 4, r: 1 };
    put("clip.holder", [CLIP.hx + 13, CLIP.hy + 2.5, (TOPZ + CLIP.hz1) / 2],
      S(k.slabOf(hold, TOPZ, CLIP.hz1 - TOPZ, P, 3, 0.5), { tone: "lo" })
      + Ln(k.planOutline(k.insetPlan(hold, 2), TOPZ, P, 3), { tone: "faint" })
      + S(k.slabOf(clipbar, CLIP.hz1, 3.5, P, 2, 0.4), { tone: "hi" }),
      [record(A.slab(hold, TOPZ, CLIP.hz1 - TOPZ, { name: "clip.holder" }, 3)),
       record(A.slab(clipbar, CLIP.hz1, 3.5, { name: "clip.clamp" }, 2))]);
  }
  slab("clip.foot", { x: CLIP.hx + 2, y: CLIP.hy - 9, w: 22, d: 9, r: 1 }, TOPZ, 3.5, { tone: "lo" });
  const clipbar = { x: CLIP.hx + 6, y: 70.2, w: 14, d: 3.4, r: 1 };
}

// ================= stamp press =================
{
  slab("stamp.ped", STAMP.ped, TOPZ, 6, { tone: "mid" }, { extra: screwDots(STAMP.ped, 2.5, TOPZ + 6) });
  cyl("stamp.pillar", STAMP.px, STAMP.py, 2.6, TOPZ + 6, 8, { tone: "mid", crease: "none" },
    { extra: Ln([64, 70].map((z) => k.sideArc(STAMP.px, STAMP.py, 2.6, z, P, 14)).join(""), { tone: "faint" }) });
  const head = { x: STAMP.px - 9, y: STAMP.py - 9, w: 18, d: 18, r: 1.2 };
  put("stamp.head", [STAMP.px, STAMP.py, TOPZ + 16.25], S(k.slabOf(head, TOPZ + 14, 4.5, P, 3, 0.4), { tone: "hi" }),
    [record(A.slab(head, TOPZ + 14, 4.5, { name: "stamp.head" }, 3))], { bias: 0.3 });
  const mag = [0, 1, 2].map((i) => k.planOutline({ x: MAG.x + i, y: MAG.y + i, w: 15, d: 10, r: 1 }, TOPZ, P, 3)).join("");
  put("stamp.mag", [MAG.x + 8, MAG.y + 5, TOPZ + 0.05], Ln(mag, { tone: "faint" }),
    [record(A.slab(MAG, TOPZ, 0.1, { name: "stamp.mag" }, 2))], { bias: 0.05 });
}

// ================= doorbell + legend =================
{
  const bellPlan = { x: BELL.x, y: BELL.y, w: BELL.w, d: BELL.d, r: BELL.r };
  put("bell.base", [BELL.cx, BELL.cy, TOPZ + 2.5],
    S(k.slabOf(bellPlan, TOPZ, 5, P, 3, 0.5), { tone: "lo" })
    + Ln(k.ring(BELL.cx, BELL.cy, 4.6, TOPZ + 5, P, 24), { tone: "lo" })
    + screwDots(bellPlan, 2.5, TOPZ + 5)
    + vtext(BELL.cx, BELL.y + BELL.d + 0.06, TOPZ + 1.7, "0 号门铃", 2.1, "mid", "middle"),
    [record(A.slab(bellPlan, TOPZ, 5, { name: "bell.base" }, 3))]);
  const domeF = G.frameOf([BELL.cx, BELL.cy, TOPZ + 5], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  put("bell.dome", [BELL.cx, BELL.cy, TOPZ + 7],
    `<g data-part="belldome">` + S(G.solidOf([[0, 0], [0, 3.9], [1.2, 4.1, 1], [2.8, 3.2, 1], [3.6, 1.6, 1], [4, 0, 1]], domeF, P, { steps: 26 }), { tone: "hi", lit: true }) + `</g>`,
    [record(A.solid(domeF, [[0, 0], [0, 3.9], [1.2, 4.1, 1], [2.8, 3.2, 1], [3.6, 1.6, 1], [4, 0, 1]], { name: "bell.dome" }))], { bias: 0.3 });
  const lp = { x: LEG.x - 4, y: LEG.y, w: LEG.w, d: LEG.d, r: 1 }, lface = LEG.y + LEG.d; // 71, front face
  let rows = "";
  rows += Ln(k.pathOf([[-48, lface, 56], [-20, lface, 56], [-20, lface, 68], [-48, lface, 68]].map((p) => at(p)), true), { tone: "lo" });
  rows += Ln(k.pathOf([[-48, lface, 61.4], [-20, lface, 61.4]].map((p) => at(p)), true), { tone: "faint" });
  rows += Ln(k.lineOnTop([-43, lface + 0.06], [-30, lface + 0.06], 66.2, P) + k.lineOnTop([-43, lface + 0.06], [-34, lface + 0.06], 63.4, P), { tone: "lo", free: true });
  rows += Ln(k.lineOnTop([-43, lface + 0.06], [-30, lface + 0.06], 59.2, P) + k.lineOnTop([-43, lface + 0.06], [-34, lface + 0.06], 56.6, P), { tone: "lo", free: true });
  rows += vtext(-42.6, lface + 0.1, 66, "0 号门铃＝命令环", 1.9, "mid");
  rows += vtext(-42.6, lface + 0.1, 63.3, "Target 0＝命令门铃", 1.75, "mid");
  rows += vtext(-42.6, lface + 0.1, 58.8, "1–255＝设备门铃", 1.9, "mid");
  rows += vtext(-42.6, lface + 0.1, 56.2, "Target 0＝保留 · 1＝EP0", 1.75, "mid");
  rows += `<g class="fx-flash" data-flash="row0"><path class="fx-hl" d="${k.pathOf([[-47.4, lface + 0.02, 62], [-20.6, lface + 0.02, 62], [-20.6, lface + 0.02, 68.4], [-47.4, lface + 0.02, 68.4]].map((p) => at(p)), true)}"/></g>`;
  put("bell.legend", [LEG.x + 15, LEG.y + 2.5, 62], S(k.slabOf(lp, TOPZ, LEG.z1 - TOPZ, P, 3, 0.5), { tone: "lo" }) + rows + screwDots(lp, 2.2, TOPZ),
    [record(A.slab(lp, TOPZ, LEG.z1 - TOPZ, { name: "bell.legend" }, 3))]);
}

// ================= bit-field reader =================
{
  const rp = { x: READ.x, y: READ.y, w: READ.w, d: READ.d, r: READ.r }, face = READ.y + READ.d;
  const screen = [[-48, face, 60], [-18, face, 60], [-18, face, 92], [-48, face, 92]];
  const svg = S(k.slabOf(rp, TOPZ, READ.z1 - TOPZ, P, 4, 0.6), { tone: "mid", inner: Ln(k.sideSeam(rp, 88, P, 4), { tone: "faint" }) })
    + S(k.slabOf(k.insetPlan(rp, 1), READ.z1, 1.6, P, 4, 0.3), { tone: "lo" })
    + `<path class="fx-screenbg" d="${k.pathOf(screen.map((p) => at(p)), true)}"/>`
    + Ln(k.pathOf(screen.map((p) => at(p)), true), { tone: "lo" })
    + vtext(-33, face + 0.05, 94.4, "命令 TRB 位域验卡", 2.4, "mid", "middle")
    + screwDots(rp, 3, TOPZ);
  put("reader", [READ.x + 21, READ.y + 4, (TOPZ + READ.z1) / 2], svg,
    [record(A.slab(rp, TOPZ, READ.z1 - TOPZ, { name: "reader" }, 4)),
     record(A.slab(k.insetPlan(rp, 1), READ.z1, 1.6, { name: "reader.cap" }, 4))]);
}

// ================= command ring =================
{
  cyl("ring.plat", RING.cx, RING.cy, 51, TOPZ, 2, { tone: "lo" },
    { steps: 72, extra: Ln(k.ring(RING.cx, RING.cy, 48.5, TOPZ + 2, P, 72), { tone: "faint" }) });
  const RF = G.frameOf([RING.cx, RING.cy, TOPZ + 2], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  // each rail is two half-annuli (seams between pads), so far/near arcs order cleanly against pads
  const halfRing = (a0, a1, rIn, rOut, steps = 28) => {
    const outer = [], inner = [];
    for (let i = 0; i <= steps; i++) {
      const a = ((a0 + (a1 - a0) * (i / steps)) * Math.PI) / 180;
      outer.push([RING.cx + rOut * Math.cos(a), RING.cy + rOut * Math.sin(a)]);
      inner.push([RING.cx + rIn * Math.cos(a), RING.cy + rIn * Math.sin(a)]);
    }
    return [...outer, ...inner.reverse()];
  };
  const railHalf = (name, a0, a1, rIn, rOut, steps) => {
    const poly = halfRing(a0, a1, rIn, rOut, steps);
    const shape = record(A.extruded(poly, TOPZ + 2, 3.5, { name }));
    const midA = ((a0 + a1) / 2 * Math.PI) / 180;
    put(name, [RING.cx + (rIn + rOut) / 2 * Math.cos(midA), RING.cy + (rIn + rOut) / 2 * Math.sin(midA), TOPZ + 3.75],
      S(k.extrude(poly, TOPZ + 2, 3.5, P, { convex: false, bevel: 0.3 }), { tone: "mid" }), [shape]);
  };
  railHalf("ring.railIn.far", 112.5, 247.5, 30, 31.8);
  railHalf("ring.railIn.near", 247.5, 472.5, 30, 31.8);
  railHalf("ring.railOut.far", 112.5, 247.5, 48.6, 50.4);
  railHalf("ring.railOut.near", 247.5, 472.5, 48.6, 50.4);
  cyl("ring.hub", RING.cx, RING.cy, 9, TOPZ + 2, 8, { tone: "mid" },
    { steps: 36, extra: Ln(k.sideArc(RING.cx, RING.cy, 9, TOPZ + 7, P, 24), { tone: "faint" })
      + Dots(Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 + 0.26;
        return at([RING.cx + Math.cos(a) * 6.4, RING.cy + Math.sin(a) * 6.4, TOPZ + 10]);
      }), { size: 0.45 }) });
  cyl("ring.cap", RING.cx, RING.cy, 5.5, TOPZ + 10, 2, { tone: "mid" }, { steps: 24 });
  cyl("ring.post", RING.cx, RING.cy, 3.4, TOPZ + 12, 34, { tone: "mid", crease: "none" },
    { extra: Ln([78, 88, 98].map((z) => k.sideArc(RING.cx, RING.cy, 3.4, z, P, 16)).join(""), { tone: "faint" }) });
  for (let i = 0; i < SLOT_N; i++) {
    const [x, y] = SLOT[i];
    const pad = { x: x - 4, y: y - 4, w: 8, d: 8, r: 1.4 };
    const isLink = i === LINK_SLOT;
    const tabPlan = { x: x - 4, y: y - 1.1, w: 8, d: 1.9, r: 0.5 };
    const extra = isLink
      ? S(k.slabOf(tabPlan, TOPZ + 4.5, 7.5, P, 2, 0.3), { tone: "hi" })
        + vtext(x, y - 1.2, TOPZ + 9.7, "Link·TC=1", 1.9, "mid", "middle")
        + Ln(k.lineOnTop([x + 2.3, y + 2], [x + 2.3, y + 4.2], TOPZ + 4.55, P), { tone: "hi", free: "end" })
      : vtext(x, y - 4.15, TOPZ + 4.3, String(i), 2.0, "lo", "middle");
    const shapes = [record(A.slab(pad, TOPZ + 2, 2.5, { name: `ring.pad${i}` }, 2))];
    if (isLink) shapes.push(record(A.slab(tabPlan, TOPZ + 4.5, 7.5, { name: `ring.pad${i}.tab` }, 2)));
    put(`ring.pad${i}`, [x, y, TOPZ + 6.75],
      S(k.slabOf(pad, TOPZ + 2, 2.5, P, 2, 0), { tone: "hi" }) + extra, shapes,
      { bias: 0.02 * (SLOT_N - i) });
  }
}

// ================= teller desk =================
{
  slab("desk", DESK, TOPZ, 9, { tone: "mid" },
    { extra: Ln(k.planOutline(k.insetPlan(DESK, 3), TOPZ + 9, P, 4), { tone: "faint" }) + screwDots(DESK, 4, TOPZ + 9) });
  slab("desk.stampbase", { x: 74, y: -18, w: 9, d: 7, r: 0.8 }, TOPZ + 9, 2.5, { tone: "lo" });
  cyl("desk.stampillar", 78.5, -14.5, 1.8, TOPZ + 11.5, 7, { tone: "mid", crease: "none" });
  const dhead = { x: 78.5 - 5.5, y: -14.5 - 5.5, w: 11, d: 11, r: 1 };
  put("desk.head", [78.5, -14.5, TOPZ + 20.5], S(k.slabOf(dhead, TOPZ + 18.5, 4, P, 3, 0.4), { tone: "hi" }),
    [record(A.slab(dhead, TOPZ + 18.5, 4, { name: "desk.head" }, 3))], { bias: 0.3 });
  slab("desk.tray", { x: 88, y: -14, w: 8, d: 8, r: 1 }, TOPZ + 9, 3, { tone: "lo" },
    { extra: Ln(k.planOutline(k.insetPlan({ x: 88, y: -14, w: 8, d: 8, r: 1 }, 1.4), TOPZ + 12, P, 2), { tone: "faint" }) });
  slab("desk.paper", { x: 66, y: 8, w: 12, d: 9, r: 0.8 }, TOPZ, 1.1, { tone: "hi" }, { steps: 2 });
  slab("desk.paper2", { x: 66.8, y: 8.8, w: 12, d: 9, r: 0.8 }, TOPZ + 1.1, 1.0, { tone: "hi" }, { steps: 2 });
  const penF = G.frameOf([61.5, 21, TOPZ + 0.8], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  put("desk.pen", [61.5, 21, TOPZ + 0.8], S(G.disc(-4.5, 4.5, 0.7, penF, P, { steps: 14 }), { tone: "lo" }),
    [record(A.disc(penF, -4.5, 4.5, 0.7, { name: "desk.pen" }))]);
}

// ================= wicket grille =================
{
  const wp = { x: WICK.x, y: 69, w: WICK.w, d: 9, r: 1 };
  put("wicket.base", [WICK.x + 13, 73.5, TOPZ + 1], S(k.slabOf(wp, TOPZ, 2, P, 3), { tone: "lo" }),
    [record(A.slab(wp, TOPZ, 2, { name: "wicket.base" }, 3))]);
  const rodXs = [-9, -4.5, 0, 4.5, 9];
  put("wicket.rods", [WICK.x + 13, 73.5, TOPZ + 10],
    rodXs.map((rx) => S(k.cylinder(WICK.x + 13 + rx, 73.5, 0.8, TOPZ + 2, 16, P, 12), { tone: "mid", crease: "none" })).join(""),
    rodXs.map((rx) => record(A.cylinder(WICK.x + 13 + rx, 73.5, 0.8, TOPZ + 2, 16, { name: "wicket.rod" }, 12))));
  slab("wicket.rail", { x: WICK.x, y: 71.5, w: WICK.w, d: 4, r: 1 }, TOPZ + 18, 2.5, { tone: "mid" });
}

// ================= document slot =================
{
  const dsp = { x: DOC_SLOT.x, y: DOC_SLOT.y, w: DOC_SLOT.w, d: DOC_SLOT.d, r: 1 };
  put("docslot", [DOC_SLOT.x + 4.5, DOC_SLOT.y + 3, TOPZ + 0.8],
    S(k.slabOf(dsp, TOPZ, 1.6, P, 2, 0.3), { tone: "lo" })
    + Ln(k.planOutline(k.insetPlan(dsp, 1.6), TOPZ + 1.6, P, 2), { tone: "faint" }),
    [record(A.slab(dsp, TOPZ, 1.6, { name: "docslot" }, 2))]);
}

// ================= settle + assemble =================
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const indexOf = (name) => R.items.findIndex((it) => it.name === name);
const groups = R.items.map((it) => `<g class="it" data-name="${it.name}"${it.attrs ?? ""}>${it.svg}</g>`);
const slots = new Map();
slots.set(indexOf("reader"), (s) => s + `<g data-part="readercard"></g>`);
slots.set(indexOf("clip.holder"), (s) => s + `<g data-part="clippage"></g>`);
slots.set(indexOf("ring.post"), (s) => s + `<g data-part="residue"></g><g data-part="trays"></g><g data-part="pointers"></g>`);
slots.set(indexOf("desk.pen"), (s) => s + `<g data-part="jibarm"></g><g data-part="jibgrip"></g>`);
slots.set(R.items.length - 1, (s) => s + `<g data-part="flights"></g>`);
const bodySvg = groups.map((g, i) => (slots.has(i) ? slots.get(i)(g) : g)).join("");

// ================= page CSS =================
const CSS = `
.fx-stage{--fx-card:#1d1d1d;--fx-screen:#262626;--fx-lbl2:#9a9a9e;--cyc:${THEME === "light" ? "#a3660f" : "#e0a63f"};--cyc0:${THEME === "light" ? "#54707f" : "#7fa3b8"};--warm:${THEME === "light" ? "#c77b1a" : "#ffd27a"}}
[data-theme="light"] .fx-stage{--fx-card:#fcfcfa;--fx-screen:#e3e3df;--fx-lbl2:#67676c}
.fx-stage[data-round="0"]{--cyc:${THEME === "light" ? "#54707f" : "#7fa3b8"}}
.fx-cyc{fill:var(--cyc);stroke:var(--anatomy-lo);stroke-width:.3}
.fx-glow{fill:var(--warm);opacity:0;transition:opacity .45s var(--anatomy-ease)}
.fx-glow.on{opacity:.85}
.fx-hl{fill:var(--warm);opacity:0;transition:opacity .35s var(--anatomy-ease)}
.fx-flash.on .fx-hl{opacity:.3}
.fx-cardbg{fill:var(--fx-card,#1d1d1d);stroke:var(--anatomy-mid);stroke-width:.35}
.fx-screenbg{fill:var(--fx-screen,#262626);stroke:var(--anatomy-lo);stroke-width:.35}
.fx-ruler{stroke:var(--anatomy-lo);stroke-width:.45;fill:none}
.fx-tick{stroke:var(--anatomy-lo);stroke-width:.4}
.fx-tickM{stroke:var(--anatomy-mid);stroke-width:.5}
.fx-span{fill:none;stroke:var(--anatomy-mid);stroke-width:.5}
.fx-spanb{fill:var(--anatomy-shade-2);stroke:var(--anatomy-mid);stroke-width:.45}
.fx-lbl{font:2.15px var(--anatomy-mono);fill:var(--anatomy-mid)}
.fx-lbl2{font:1.8px var(--anatomy-mono);fill:var(--fx-lbl2,#9a9a9e)}
.fx-cyb{fill:var(--cyc);stroke:var(--anatomy-lo);stroke-width:.3}
.fx-res{stroke:var(--cyc);stroke-width:1.5;opacity:.45}
.fx-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
`;

// ================= prebuilt live markup =================
function bitCardSVG(kind) {
  const M = planeMatrix([-47.6, READ.y + READ.d - 0.1, 91.6], [1, 0, 0], [0, 0, -1]);
  const ux = (b) => 6.2 + (b / 32) * 20.4;
  const vy = (row) => 7.6 + row * 5.4;              // row 0 = DW3 (top), yb = ruler line
  const NAME = { 9: "T9 Enable Slot", 11: "T11 Address Device", 12: "T12 Config Endpoint" }[kind];
  let g = `<g data-card="${kind}" style="display:none"><g transform="${M}">`;
  g += `<rect x="0.4" y="0.4" width="27.6" height="30.2" rx="1" class="fx-cardbg"/>`;
  g += `<text class="fx-lbl" x="1.6" y="4.2">${NAME}</text>`;
  g += `<text class="fx-lbl2" x="1.6" y="6.4">15:10＝Type · bit0＝C</text>`;
  for (let row = 0; row < 4; row++) {
    const y = vy(row), yb = y + 2.6;
    g += `<text class="fx-lbl2" x="0.9" y="${yb + 0.6}">DW${3 - row}</text>`;
    g += `<line x1="${ux(0)}" y1="${yb}" x2="${ux(32)}" y2="${yb}" class="fx-ruler"/>`;
    for (let b = 0; b <= 32; b += 4) {
      const major = b % 8 === 0;
      g += `<line x1="${ux(b)}" y1="${yb}" x2="${ux(b)}" y2="${yb - (major ? 2.1 : 1.0)}" class="${major ? "fx-tickM" : "fx-tick"}"/>`;
    }
    if (row < 3) g += `<line x1="1.0" y1="${yb + 2.6}" x2="27.4" y2="${yb + 2.6}" class="fx-tick" stroke-dasharray="0.8 1.4"/>`;
  }
  const y3 = vy(0) + 2.6;
  g += `<rect x="${ux(0) - 0.15}" y="${y3 + 0.5}" width="${ux(1) - ux(0) + 0.3}" height="1.6" class="fx-cyb"/>`;
  g += `<rect x="${ux(10)}" y="${y3 - 2.2}" width="${ux(16) - ux(10)}" height="2.1" class="fx-spanb"/>`;
  g += `<text class="fx-lbl2" x="${(ux(10) + ux(16)) / 2}" y="${y3 - 0.55}" text-anchor="middle">${kind}</text>`;
  if (kind === 9) {
    g += `<rect x="${ux(16)}" y="${y3 - 2.2}" width="${ux(21) - ux(16)}" height="2.1" class="fx-spanb"/>`;
    g += `<text class="fx-lbl2" x="${(ux(16) + ux(21)) / 2}" y="${y3 - 0.55}" text-anchor="middle">0</text>`;
    g += `<text class="fx-lbl2" x="${ux(10)}" y="${vy(1) + 4.8}">ST@20:16＝0</text>`;
  } else {
    g += `<circle cx="${ux(9)}" cy="${y3}" r="0.75" class="fx-cyb"/>`;
    g += `<text class="fx-lbl2" x="${ux(2)}" y="${vy(1) + 4.8}">${kind === 11 ? "BSR@9＝0" : "DC@9＝0"}</text>`;
    g += `<rect x="${ux(24)}" y="${y3 - 2.2}" width="${ux(32) - ux(24)}" height="2.1" class="fx-spanb"/>`;
    g += `<text class="fx-lbl2" x="${(ux(24) + ux(32)) / 2}" y="${y3 - 0.55}" text-anchor="middle">1</text>`;
    g += `<text class="fx-lbl2" x="${ux(10)}" y="${vy(1) + 6.6}">SID@24-31＝1</text>`;
    const y01 = vy(2) + 2.6;
    g += `<path class="fx-span" d="M${ux(0)} ${y01 - 3.4} V${y01 - 4.6} H${ux(32)} V${y01 - 3.4}"/>`;
    g += `<text class="fx-lbl2" x="${ux(1)}" y="${y01 - 5.2}">Input Context Pointer 63:4 · 16B 对齐</text>`;
  }
  g += `</g></g>`;
  return g;
}
const CARDS = [bitCardSVG(9), bitCardSVG(11), bitCardSVG(12)].join("");

function clipPageSVG(page) {
  const M2 = planeMatrix([CLIP.hx + 1, 70.5, 85.6], [1, 0, 0], [0, 0, -1]);
  const rows = page === "addr"
    ? [["A0 A1", "输入控制上下文"], ["槽上下文", "Route · Ctx=1"], ["EP 上下文 0", "EP Type=Control"]]
    : [["A2 A3", "输入控制上下文"], ["EP 上下文 1 OUT", "DCI 2 · A2"], ["EP 上下文 1 IN", "DCI 3 · A3"]];
  let g = `<g data-page="${page}" style="display:none"><g transform="${M2}">`;
  g += `<rect x="0.4" y="0.4" width="23" height="23.6" rx="0.8" class="fx-cardbg"/>`;
  rows.forEach((r, i) => {
    const y = 5 + i * 7.2;
    g += `<rect x="1.8" y="${y - 2.8}" width="20.2" height="6" rx="0.6" class="fx-spanb"/>`;
    g += `<text class="fx-lbl" x="2.6" y="${y + 0.2}">${r[0]}</text>`;
    g += `<text class="fx-lbl2" x="2.6" y="${y + 2.4}">${r[1]}</text>`;
  });
  g += `</g></g>`;
  return g;
}
const PAGES = clipPageSVG("addr") + clipPageSVG("cfg");
const BOARD = S(k.slabOf({ x: CLIP.hx + 0.5, y: 67, w: 25, d: 3.4, r: 0.8 }, 60, 24, P, 3, 0.5), { tone: "mid" })
  + Ln(k.planOutline(k.insetPlan({ x: CLIP.hx + 0.5, y: 67, w: 25, d: 3.4, r: 0.8 }, 0.9), 84, P, 3), { tone: "lo" });

function receiptSVG() {
  const M = planeMatrix([126, -20.5, 45.5], [0, 1, 0], [0, 0, -1]);
  let g = `<g data-part="receipt" style="display:none"><g transform="${M}">`;
  g += `<rect x="0.4" y="0.4" width="21" height="17" rx="0.8" class="fx-cardbg"/>`;
  g += `<text class="fx-lbl" x="1.6" y="4.2">Command Completion</text>`;
  g += `<text class="fx-lbl2" x="1.6" y="6.8">Type 33（DW3[15:10]）</text>`;
  g += `<text class="fx-lbl2" x="1.6" y="9.6">CC 1 · Success（DW2[31:24]）</text>`;
  g += `<text class="fx-lbl2" x="1.6" y="12.4">Slot ID 1（DW3[31:24]）</text>`;
  g += `<text class="fx-lbl2" x="1.6" y="15.2" data-r="trb">Command TRB Pointer → 0 槽</text>`;
  g += `</g></g>`;
  return g;
}
function plateSVG() {
  const M = planeMatrix([0, 0, 4.6], [1, 0, 0], [0, 0, -1]);
  let g = `<g data-part="addrplate" style="display:none"><g transform="${M}">`;
  g += `<rect x="-3.7" y="0.4" width="7.4" height="8.4" rx="0.7" class="fx-cardbg"/>`;
  g += `<text class="fx-lbl" x="-3.2" y="3.2">设备上下文</text>`;
  g += `<text class="fx-lbl2" x="-3.2" y="5.6">地址 · 1 号格</text>`;
  g += `<rect x="-3.2" y="6.6" width="6.4" height="1.1" class="fx-cyb"/>`;
  g += `</g></g>`;
  return g;
}
function traySVG(c) {
  const type = [0, 9, 11, 12][c];
  const name = ["", "Enable Slot", "Address Device", "Configure Endpoint"][c];
  let g = `<g data-tray="${c}" style="display:none">`;
  g += S(k.slabOf({ x: -5, y: -4, w: 10, d: 8, r: 0.8 }, 0, 1.5, P, 2, 0.3), { tone: "mid" });
  g += S(k.slabOf({ x: -4.2, y: -3, w: 8.4, d: 6, r: 0.5 }, 1.5, 0.6, P, 2, 0.25), { tone: "hi" });
  g += `<g data-etch style="display:none">`;
  g += FT(k.topMatrix([-3.8, -1.4], 2.14, P, "x"), `T${type} ${name}`, 1.55, "mid");
  g += `</g>`;
  g += `<g transform="${k.topMatrix([-4, -2.2], 2.14, P, "x")}"><rect class="fx-cyb" x="0" y="0" width="8" height="0.9"/></g>`;
  g += `</g>`;
  return g;
}
const TRAYS = [1, 2, 3].map((c) => traySVG(c)).join("");
function pointerSVG(kind) {
  const h = kind === "enq" ? 8 : 15;
  return `<g data-ptr="${kind}" style="display:none">`
    + S(k.cylinder(0, 0, 0.9, 0, h, P, 10), { tone: "mid", crease: "none" })
    + S(k.slabOf({ x: -4, y: -1, w: 8, d: 2, r: 0.5 }, h, 7, P, 2, 0.3), { tone: "hi" })
    + `<g transform="${planeMatrix([-4, -1.05, h + 6.4], [1, 0, 0], [0, 0, -1])}">`
    + `<text class="fx-lbl" x="1.1" y="4.4">${kind === "enq" ? "ENQ" : "DEQ"}</text></g>`
    + `</g>`;
}
const PTRS = pointerSVG("enq") + pointerSVG("deq");
const RESIDUES = SLOT.slice(0, 3).map(([x, y], i) =>
  `<path class="iso-line fx-res" data-res="${i}" style="display:none" d="${k.lineOnTop([x - 3.2, y + 3.2], [x + 3.2, y + 3.2], TOPZ + 4.55, P)}"/>`).join("");
const GRIP = S(k.slabOf({ x: -5.5, y: -2.2, w: 11, d: 4.4, r: 1 }, 0, 3, P, 2, 0.4), { tone: "hi", lit: true })
  + S(k.slabOf({ x: -4.6, y: -1.6, w: 2.2, d: 3.2, r: 0.6 }, -5, 5, P, 2, 0.3), { tone: "mid" })
  + S(k.slabOf({ x: 2.4, y: -1.6, w: 2.2, d: 3.2, r: 0.6 }, -5, 5, P, 2, 0.3), { tone: "mid" });

// ================= figure =================
const svg = k.figureSvg({
  width: W, height: H,
  label: "xHCI 命令环订单柜台：软件在下单窗口把命令 TRB 冲压成托盘滑入 8 槽命令环，台心旋臂吊代表 xHC 取件办结，回执卡从侧窗进入通往 Fig3 事件环登记机的管道，设备上下文地址牌沿暗槽挂进 DCBAA 编号储物柜；CRCR 铭牌带 CRR 运行灯、RCS 翻色旋钮与「运行中写入被忽略」小锁牌。",
  body: back.join("") + `<g class="fx-stage" data-round="1">${bodySvg}</g>`,
});

// ================= data for the live page =================
const DATA = {
  P, KS,
  plateLatched: process.argv.includes("--plate"),
  SLOT: SLOT.map((p) => p.map(f2)),
  slotA: Array.from({ length: SLOT_N }, (_, i) => TH0 + i * 45),
  cx: RING.cx, cy: RING.cy,
  ptrR: 55.5, enqR: 60.5,
  jib: { ...JIB, postTop: TOPZ + 46, deskA: -8.7, deskR: 78.9 },
  topz: TOPZ, armZ: JIB.armZ,
  bell: { cx: BELL.cx, cy: BELL.cy },
  stampHead: { px: STAMP.px, py: STAMP.py, zUp: TOPZ + 14, zDn: TOPZ + 2.5 },
  deskHead: { px: 78.5, py: -14.5, zUp: TOPZ + 18.5, zDn: TOPZ + 9.5 },
  mag: [[MAG.x + 7.5, MAG.y + 5], [MAG.x + 8.5, MAG.y + 6], [MAG.x + 9.5, MAG.y + 7]],
  stampPt: [-78, 41], readPt: [-33, 41],
  deskDrop: [86, -6],
  winMouth: [126, -8, 38], ductIn: [132, -8, 38],
  docStart: [-43.5, 28.5], docCorner: [-104, 28.5], docElbow: [-104, -44], docCell: [-104.7, DCB.y + DCB.d - 0.6, 67],
  knob: { c: [83, CRCR.py + CRCR.pd + 4.06, 73.4], r: 1.55 },
  cells: { board: BOARD, cards: CARDS, pages: PAGES, receipt: receiptSVG(), plate: plateSVG(), trays: TRAYS, ptrs: PTRS, residues: RESIDUES, grip: GRIP },
};

// ================= page =================
const body = k.plateHtml({
  fig: "Fig 4",
  title: "订单柜台：命令环与它的回执",
  hint: "点击步进 · 空格巡游 · ←→ 帧",
  readout: "命令 0 · 完成 0 · RCS 色 1",
  keys: [
    { mark: "lit", label: "当前命令托盘与回执：Cycle 色标随生产轮翻色" },
    { mark: "raised", label: "命令环 8 槽（7 号＝Link TRB，TC=1）；台心旋臂吊＝xHC 取件" },
    { mark: "edge", label: "CRCR：CRR 运行灯 · RCS 旋钮 · 运行中写入被忽略" },
    { mark: "dim", label: "DCBAA 储物柜（0 号格＝Scratchpad，未分配格＝0）" },
  ],
  caption: "命令环：软件下单、xHC 办结；办结回执走事件环，账本（设备上下文）挂进 DCBAA。",
  body: `<style>${CSS}</style><div class="iso-stage fx-wrap" tabindex="0" role="group" aria-label="命令环订单柜台：点击步进帧序，空格巡游，左右箭头切帧。">${svg}<span class="fx-sr" role="status" aria-live="polite" data-status></span></div>`,
});

const latheSource = readFileSync("/Users/jason/.zcode/skills/anatomy/kit/lathe.mjs", "utf8")
  .replace(/^import .*$/m, "")
  .replace(/^export /gm, "");
const latheScript = `const G = (() => {${latheSource}\nreturn { viewOf, scaleOf, frameAlong, frameOf, pointOf, disc, sphereOf, prismOf, circleOf, arcOf, dot3, add3, sub3, mul3, unit3, cross3, len3, lightOf, toneOf, radialOf };})();\n`;
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));

const page = k.pageHtml({ title: "Fig4 订单柜台：命令环与它的回执", theme: THEME, body, script: kitScript() + latheScript + LIVE, width: 760 });
writeFileSync(join(HERE, THEME === "light" ? "index-light.html" : "index.html"), page);
console.log("wrote", THEME === "light" ? "index-light.html" : "index.html", `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} items`, `scale ${KS.toFixed(3)}`);
A.auditOrExit(R, P, {});

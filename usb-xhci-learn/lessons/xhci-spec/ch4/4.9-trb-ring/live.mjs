// §4.9 环运转台——13 帧三模式步进/巡游（判据见 EVIDENCE.md；帧模型与画面断言同源）
// 模式：0 传输环（F0–F8）/ 1 命令环（F9–F10）/ 2 事件环（F11–F12）。
// 窗口.__fig49 = { playTo, pause, stateOf, frameOf }（遮挡探针按序探测可直接驱动）。
(() => {
const D = __DATA__;
const K = { iso, pathOf, solidSvg, lineSvg, dotsSvg, slabOf, cylinder, ring, sideArc, topMatrix, faceTextSvg, lineOnTop, corners, planOutline, insetPlan, extrude, depthOf };
const geo = makeLiveGeo(K, G, D);

const stages = document.querySelectorAll(".iso-stage");
const stage = stages[stages.length - 1];
const svgRoot = stage.querySelector("svg");
const $ = (sel) => svgRoot.querySelector(sel);
const $$ = (sel) => svgRoot.querySelectorAll(sel);
const readout = stage.closest(".iso-figure").querySelector("[data-readout]");
const statusEl = stage.querySelector("[data-status]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const modeNames = D.modeNames;
const shieldOf = (mode) => (mode === 2 ? { e: "hc", d: "drv" } : { e: "drv", d: "hc" });

// ---- 帧终态（同源真值；演出过程由 cues 驱动） ----
const C = (k, st, cyc) => ({ k, st, cyc });
const F = (o) => Object.assign({
  mode: 0, enq: 0, deq: 0, pcs: 1, ccs: 1,
  cards: Array(9).fill(null), toggle: 0, wrapLit: 0, empty: 0, full: 0, irq: 0,
  crcr: null, erdp: null, db: null, tray: 0, noteCmd: 0, noteEvt: 0,
}, o);
const FRAMES = [
  F({}),                                                                                          // F0 全景
  F({ cards: [null, null, null, null, null, null, null, null, C("L", 1, 0)] }),                    // F1 建环
  F({ cards: [C("NC", 1, 1), C("NC", 1, 1), C("ED", 1, 1), null, null, null, null, null, C("L", 1, 0)], enq: 3 }), // F2 生产 TD
  F({ cards: [C("NC", 2, 1), C("NC", 2, 1), C("ED", 2, 1), null, null, null, null, null, C("L", 1, 0)], enq: 3, deq: 3, tray: 1 }), // F3 门铃与消费
  F({ cards: [C("NC", 2, 1), C("NC", 2, 1), C("ED", 2, 1), C("NC", 1, 1), C("NC", 1, 1), C("NC", 1, 1), C("NC", 1, 1), C("ED", 1, 1), C("L", 1, 1)], enq: 0, deq: 3, pcs: 0, toggle: 1, wrapLit: 1, tray: 1 }), // F4 Link 回绕·PCS 翻转
  F({ cards: [C("NC", 2, 1), C("NC", 2, 1), C("ED", 2, 1), C("NC", 2, 1), C("NC", 2, 1), C("NC", 2, 1), C("NC", 2, 1), C("ED", 2, 1), C("L", 1, 1)], enq: 0, deq: 0, pcs: 0, ccs: 0, toggle: 1, wrapLit: 1, tray: 2 }), // F5 出队过 Link·CCS 翻转
  F({ cards: [C("N", 2, 0), C("NC", 2, 1), C("ED", 2, 1), C("NC", 2, 1), C("NC", 2, 1), C("NC", 2, 1), C("NC", 2, 1), C("ED", 2, 1), C("L", 1, 1)], enq: 1, deq: 1, pcs: 0, ccs: 0, toggle: 1 }), // F6 第二圈
  F({ cards: [C("N", 2, 0), C("NC", 2, 1), C("ED", 2, 1), C("NC", 2, 1), C("NC", 2, 1), C("NC", 2, 1), C("NC", 2, 1), C("ED", 2, 1), C("L", 1, 1)], enq: 1, deq: 1, pcs: 0, ccs: 0, toggle: 1, empty: 1 }), // F7 空
  F({ cards: [C("N", 2, 0), C("NC", 1, 0), C("NC", 1, 0), C("NC", 1, 0), C("NC", 1, 0), C("NC", 1, 0), C("NC", 1, 0), C("ED", 1, 0), C("L", 1, 0)], enq: 0, deq: 1, pcs: 1, ccs: 0, full: 1, wrapLit: 1, tray: 2 }), // F8 满
  F({ mode: 1, cards: [C("CMD", 1, 1), null, null, null, null, null, null, null, C("L", 1, 0)], enq: 1, db: 0, noteCmd: 1, crcr: ["CRCR · CRR=1", "起点＝槽 0"] }), // F9 命令环投递
  F({ mode: 1, cards: [C("CMD", 2, 1), null, null, null, null, null, null, null, C("L", 1, 0)], enq: 1, deq: 1, db: 0, noteCmd: 1, tray: 1, crcr: ["CRCR · CRR=1", "出队→槽 1 报回"] }), // F10 命令完成
  F({ mode: 2, cards: [C("EV1", 2, 1), C("EV2", 2, 1), C("EV1", 2, 1), null, null, null, null, null, C("SEG", 1, -1)], enq: 3, deq: 3, irq: 1, noteEvt: 1, tray: 1, erdp: ["ERDP · 已处理→槽 3", "EHB→0"] }), // F11 事件环反向
  F({ mode: 2, cards: [C("EV1", 2, 1), C("EV2", 2, 1), C("EV1", 2, 1), null, null, null, null, null, C("SEG", 1, -1)], enq: 3, deq: 3, noteEvt: 1, tray: 1, erdp: ["ERDP＝物理寄存器", "EHB→0 · DESI＝0"] }), // F12 ERST 分段
];
// 模式切换帧的「入场前态」：先 applyAll 前态，再由 cues 演到终态
const PRE = {
  9: F({ mode: 1, cards: [null, null, null, null, null, null, null, null, C("L", 1, 0)], noteCmd: 1, crcr: ["CRCR · CRR=1", "起点＝槽 0"] }),
  11: F({ mode: 2, cards: [null, null, null, null, null, null, null, null, C("SEG", 1, -1)], noteEvt: 1 }),
};
const DUR = [3200, 3600, 6400, 6800, 7400, 5800, 4800, 4200, 6800, 4600, 4600, 8800, 4400];
const NAMES = ["全景 · 三环共用一套机构", "建环：清 0 与 Link", "生产：压入一颗 TD", "门铃与消费", "Link 回绕 · PCS 翻转", "出队过 Link · CCS 翻转", "第二圈：双翻后照常", "空：双针重合", "满：入队+1＝出队", "命令环：单 TRB · 门铃 0", "命令完成回执", "事件环：方向反转 · ERDP", "ERST 分段：每段 ≥16"];
const PG = ["p149", "p151·p157", "p151–153", "p152–153", "p154–155", "p154·p156", "p154", "p153·p156", "p151·p156", "p160", "p160", "p150·p161", "p161–163"];
const NARR = [
  "环形卡柜就是 TRB 环：9 槽循环使用——8 槽数据 TRB，第 9 槽是 Link TRB。蓝侧压卡头针＝入队指针，金侧取卡钳针＝出队指针；前面板的模式钮在传输、命令、事件三环间切换。",
  "建环：全环 TRB 清 0，代表空队列；PCS 与 CCS 都置 1。末槽装上 Link TRB，负责把环接回槽 0（p151、p157）。",
  "驱动生产一颗 TD＝3 张卡：前两张 Chain=1 串成串、末张 Event Data。每写一张，卡顶 Cycle 位＝PCS＝1，入队针推进一格（p151–153）。",
  "按端点门铃后 xHC 开始消费：出队针读卡顶 Cycle 位，与 CCS 相等才执行；执行进度由 Transfer Event 沿通知缆回报驱动。出队追上入队＝环空（p152–153）。",
  "继续生产写满后半圈：入队针走到 Link 槽，装入队位置重载回槽 0；Link 的 Toggle Cycle=1 把 PCS 翻成 0（p154–155）。",
  "出队针也追到 Link 槽：CCS 翻成 0，出队位置跳回槽 0——回绕一次，双方的期望值各自翻转一次（p154、p156）。",
  "第二圈：新写入的 Cycle 位＝0，恰好等于翻转后的 CCS——比对依旧相等，执行照常，环照常运转（p154）。",
  "空判据：出队针在槽 1 读到上一圈留下的 Cycle 位 1，与翻转后的 CCS=0 不等——这是入队针留下的「未到」标记；双针重合，环空，停等下一次门铃（p153、p156）。",
  "满判据：驱动再压 7 张填满后半圈，入队针绕过 Link 回到槽 0——再推一格就撞上槽 1 的出队针（这个 +1 已把 Link 槽跨过去算）＝环满，生产停，等回执腾位（p151、p156）。",
  "切到命令环：机构同向、判据同套；差别是命令描述符单 TRB（无 Chain）、全规范仅此一条环、由 CRCR 管起点；写门铃 0（DB Target=0）触发消费（p160、§4.1 p68）。",
  "命令执行完：Command Completion 事件写事件环、报告出队位置；停机（CRR=0）时写 CRCR 可把出队指针重载回环起点（p160）。",
  "切到事件环，方向反转：xHC 压入（生产）、驱动取走（消费）；无门铃——xHC 写完发中断唤醒驱动；处理完把 ERDP 写到已处理位置，出队指针是三环中唯一落成物理寄存器的指针（p150 Note、p161）。",
  "事件环分段走 ERST：Base Address/Size 成对定义段，每段至少 16 个 TRB，段表自身按循环队列回绕；写 ERDP 同时清 EHB 位（p161–163）。",
];

// ---- 通知缆折线行走 ----
const ORIG = K.iso([0, 0, 0], D.P);
const dAt = (p) => { const s = K.iso(p, D.P); return [s[0] - ORIG[0], s[1] - ORIG[1]]; };
const pathInfo = (pts) => {
  const segs = []; let total = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1], pts[i + 1][2] - pts[i][2]);
    segs.push([pts[i], pts[i + 1], l]); total += l;
  }
  return { segs, total };
};
const WIRE = pathInfo(D.wire);
const alongWire = (t) => {
  let d = Math.max(0, Math.min(1, t)) * WIRE.total;
  for (const [a, b, l] of WIRE.segs) {
    if (d <= l) { const u = l ? d / l : 0; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u + 2.4]; }
    d -= l;
  }
  const b = WIRE.segs[WIRE.segs.length - 1][1];
  return [b[0], b[1], b[2] + 2.4];
};

// ---- 状态 ----
let frame = 0, anim = null, snapNext = false;
let state = snapshot(0);
let tokens = [];
const ang = { e: 90, d: 90 };       // 连续针角（deg，向前＝递减）
const angSeen = { e: 0, d: 8 };     // 上次对齐过的槽号（供步进推算）
const drop = { e: 0, d: 0 };
const dropT = { e: 0, d: 0 };
function snapshot(i) {
  const f = FRAMES[i];
  return {
    mode: f.mode, enq: f.enq, deq: f.deq, pcs: f.pcs, ccs: f.ccs,
    cards: f.cards.map((c) => (c ? { ...c } : null)),
    toggle: f.toggle, wrapLit: f.wrapLit, empty: f.empty, full: f.full, irq: f.irq,
    crcr: f.crcr && [...f.crcr], erdp: f.erdp && [...f.erdp], db: f.db,
    tray: f.tray, noteCmd: f.noteCmd, noteEvt: f.noteEvt,
    bellT: 0, bellTT: 0, hot: -1,
  };
}
function applyAll(s, f) {
  s.mode = f.mode; s.enq = f.enq; s.deq = f.deq; s.pcs = f.pcs; s.ccs = f.ccs;
  s.cards = f.cards.map((c) => (c ? { ...c } : null));
  s.toggle = f.toggle; s.wrapLit = f.wrapLit; s.empty = f.empty; s.full = f.full; s.irq = f.irq;
  s.crcr = f.crcr && [...f.crcr]; s.erdp = f.erdp && [...f.erdp]; s.db = f.db;
  s.tray = f.tray; s.noteCmd = f.noteCmd; s.noteEvt = f.noteEvt; s.hot = -1;
}
const slotAng = (i) => 90 - 40 * i;

// ---- 帧间演出 ----
function cuesFor(from, to) {
  const cues = [];
  const add = (at, apply) => cues.push({ at, apply });
  const jump = (f) => add(0.12, (s) => { applyAll(s, f); snapNext = true; });
  switch (toIdx) {
    case 1: { // 建环
      add(0.25, (s) => { s.cards[8] = C("L", 1, 0); });
      break;
    }
    case 2: { // 生产 TD
      add(0.12, (s) => { dropT.e = 1; });
      add(0.26, (s) => { s.cards[0] = C("NC", 1, 1); dropT.e = 0; s.enq = 1; });
      add(0.4, (s) => { dropT.e = 1; });
      add(0.54, (s) => { s.cards[1] = C("NC", 1, 1); dropT.e = 0; s.enq = 2; });
      add(0.68, (s) => { dropT.e = 1; });
      add(0.84, (s) => { s.cards[2] = C("ED", 1, 1); dropT.e = 0; s.enq = 3; });
      break;
    }
    case 3: { // 门铃与消费
      add(0.06, (s) => { s.bellTT = 1; });
      add(0.14, (s) => { s.bellTT = 0; tokens.push({ kind: "bell", rev: false, t: 0 }); });
      add(0.3, (s) => { dropT.d = 1; });
      add(0.44, (s) => { s.cards[0].st = 2; dropT.d = 0; s.deq = 1; });
      add(0.56, (s) => { dropT.d = 1; });
      add(0.68, (s) => { s.cards[1].st = 2; dropT.d = 0; s.deq = 2; });
      add(0.78, (s) => { dropT.d = 1; });
      add(0.88, (s) => { s.cards[2].st = 2; dropT.d = 0; s.deq = 3; tokens.push({ kind: "ccl", rev: true, t: 0 }); s.tray = 1; });
      break;
    }
    case 4: { // Link 回绕·PCS 翻转
      add(0.1, (s) => { dropT.e = 1; });
      add(0.2, (s) => { s.cards[3] = C("NC", 1, 1); dropT.e = 0; s.enq = 4; });
      add(0.3, (s) => { dropT.e = 1; });
      add(0.39, (s) => { s.cards[4] = C("NC", 1, 1); dropT.e = 0; s.enq = 5; });
      add(0.48, (s) => { dropT.e = 1; });
      add(0.56, (s) => { s.cards[5] = C("NC", 1, 1); dropT.e = 0; s.enq = 6; });
      add(0.64, (s) => { dropT.e = 1; });
      add(0.71, (s) => { s.cards[6] = C("NC", 1, 1); dropT.e = 0; s.enq = 7; });
      add(0.77, (s) => { dropT.e = 1; });
      add(0.83, (s) => { s.cards[7] = C("ED", 1, 1); dropT.e = 0; s.enq = 8; });
      add(0.9, (s) => { s.wrapLit = 1; s.cards[8] = C("L", 1, 1); s.enq = 0; });
      add(0.96, (s) => { s.pcs = 0; s.toggle = 1; });
      break;
    }
    case 5: { // 出队过 Link·CCS 翻转
      add(0.12, (s) => { dropT.d = 1; });
      add(0.2, (s) => { s.cards[3].st = 2; dropT.d = 0; s.deq = 4; });
      add(0.28, (s) => { dropT.d = 1; });
      add(0.35, (s) => { s.cards[4].st = 2; dropT.d = 0; s.deq = 5; });
      add(0.42, (s) => { dropT.d = 1; });
      add(0.48, (s) => { s.cards[5].st = 2; dropT.d = 0; s.deq = 6; });
      add(0.54, (s) => { dropT.d = 1; });
      add(0.59, (s) => { s.cards[6].st = 2; dropT.d = 0; s.deq = 7; });
      add(0.64, (s) => { dropT.d = 1; });
      add(0.69, (s) => { s.cards[7].st = 2; dropT.d = 0; s.deq = 8; });
      add(0.78, (s) => { s.ccs = 0; s.deq = 0; tokens.push({ kind: "ccl", rev: true, t: 0 }); });
      add(0.9, (s) => { s.tray = 2; });
      break;
    }
    case 6: { // 第二圈
      add(0.14, (s) => { dropT.e = 1; });
      add(0.3, (s) => { s.cards[0] = C("N", 1, 0); dropT.e = 0; s.enq = 1; });
      add(0.5, (s) => { dropT.d = 1; });
      add(0.66, (s) => { s.cards[0].st = 2; dropT.d = 0; s.deq = 1; });
      break;
    }
    case 7: { // 空
      add(0.3, (s) => { s.empty = 1; });
      add(0.5, (s) => { s.hot = 1; });
      break;
    }
    case 8: { // 满
      add(0.08, (s) => { dropT.e = 1; });
      add(0.15, (s) => { s.cards[1] = C("NC", 1, 0); dropT.e = 0; s.enq = 2; });
      add(0.22, (s) => { dropT.e = 1; });
      add(0.28, (s) => { s.cards[2] = C("NC", 1, 0); dropT.e = 0; s.enq = 3; });
      add(0.34, (s) => { dropT.e = 1; });
      add(0.4, (s) => { s.cards[3] = C("NC", 1, 0); dropT.e = 0; s.enq = 4; });
      add(0.46, (s) => { dropT.e = 1; });
      add(0.51, (s) => { s.cards[4] = C("NC", 1, 0); dropT.e = 0; s.enq = 5; });
      add(0.56, (s) => { dropT.e = 1; });
      add(0.61, (s) => { s.cards[5] = C("NC", 1, 0); dropT.e = 0; s.enq = 6; });
      add(0.66, (s) => { dropT.e = 1; });
      add(0.71, (s) => { s.cards[6] = C("NC", 1, 0); dropT.e = 0; s.enq = 7; });
      add(0.76, (s) => { dropT.e = 1; });
      add(0.81, (s) => { s.cards[7] = C("ED", 1, 0); dropT.e = 0; s.enq = 8; });
      add(0.88, (s) => { s.wrapLit = 1; s.cards[8] = C("L", 1, 0); s.enq = 0; });
      add(0.94, (s) => { s.pcs = 1; s.toggle = 0; s.full = 1; });
      break;
    }
    case 9: { // 命令环（模式切换：前态入场再演出）
      jump(PRE[9]);
      add(0.3, (s) => { s.bellTT = 1; s.db = 0; });
      add(0.38, (s) => { s.bellTT = 0; tokens.push({ kind: "bell", rev: false, t: 0 }); });
      add(0.56, (s) => { dropT.e = 1; });
      add(0.68, (s) => { s.cards[0] = C("CMD", 1, 1); dropT.e = 0; s.enq = 1; });
      break;
    }
    case 10: { // 命令完成
      add(0.2, (s) => { dropT.d = 1; });
      add(0.38, (s) => { s.cards[0].st = 2; dropT.d = 0; s.deq = 1; });
      add(0.5, (s) => { tokens.push({ kind: "ccl", rev: true, t: 0 }); s.tray = 1; });
      add(0.68, (s) => { s.crcr = ["CRCR · CRR=1", "出队→槽 1 报回"]; });
      break;
    }
    case 11: { // 事件环（模式切换：前态入场再演出）
      jump(PRE[11]);
      add(0.14, (s) => { dropT.e = 1; });
      add(0.22, (s) => { s.cards[0] = C("EV1", 1, 1); dropT.e = 0; s.enq = 1; });
      add(0.3, (s) => { dropT.e = 1; });
      add(0.38, (s) => { s.cards[1] = C("EV2", 1, 1); dropT.e = 0; s.enq = 2; });
      add(0.45, (s) => { dropT.e = 1; });
      add(0.52, (s) => { s.cards[2] = C("EV1", 1, 1); dropT.e = 0; s.enq = 3; });
      add(0.6, (s) => { s.irq = 1; tokens.push({ kind: "irq", rev: true, t: 0 }); });
      add(0.66, (s) => { dropT.d = 1; });
      add(0.72, (s) => { s.cards[0].st = 2; dropT.d = 0; s.deq = 1; });
      add(0.78, (s) => { dropT.d = 1; });
      add(0.83, (s) => { s.cards[1].st = 2; dropT.d = 0; s.deq = 2; });
      add(0.88, (s) => { dropT.d = 1; });
      add(0.92, (s) => { s.cards[2].st = 2; dropT.d = 0; s.deq = 3; tokens.push({ kind: "erdp", rev: false, t: 0 }); });
      break;
    }
    case 12: { // ERST 分段
      add(0.25, (s) => { s.erdp = ["ERDP＝物理寄存器", "EHB→0 · DESI＝0"]; });
      add(0.45, (s) => { s.irq = 0; s.tray = 1; });
      break;
    }
  }
  return cues;
}

// ---- 渲染 ----
const tokenLayer = $('[data-part="actors-tokens"]');
const eventLayer = $('[data-part="actors-events"]');
const dispCache = {};
function render(s, dt) {
  const ease = 1 - Math.exp(-(dt || 0.016) / 0.12);
  // 针角：按 state.enq/deq 沿环向前推（多槽一气扫过）
  for (const key of ["e", "d"]) {
    const slot = key === "e" ? s.enq : s.deq;
    const seenKey = key === "e" ? "enq" : "deq";
    if (snapNext) { ang[key] = slotAng(slot); angSeen[key] = slot; }
    const steps = (slot - angSeen[key] + 9) % 9;
    if (steps > 0) { ang[key] -= 40 * steps; angSeen[key] = slot; }
  }
  snapNext = false;
  drop.e += (dropT.e - drop.e) * ease;
  drop.d += (dropT.d - drop.d) * ease;
  const sh = shieldOf(s.mode);
  for (const [key, sel, which] of [["e", '[data-part="needle-enq"]', "enq"], ["d", '[data-part="needle-deq"]', "deq"]]) {
    const el = $(sel);
    if (!el) continue;
    const a = Math.round(ang[key] * 20) / 20, dp = Math.round(drop[key] * 20) / 20;
    const sig = a + "|" + dp + "|" + sh[key];
    if (dispCache["n" + key] !== sig) {
      el.innerHTML = geo.needleSvg(which, a, dp);
      el.setAttribute("data-role", sh[key]);
      dispCache["n" + key] = sig;
    }
  }
  // 门铃钮
  s.bellT += (s.bellTT - s.bellT) * ease;
  const bb = $('[data-part="bellbtn"]');
  if (bb) { const h = geo.bellBtnSvg(Math.round(s.bellT * 20) / 20); if (dispCache.bell !== h) { bb.innerHTML = h; dispCache.bell = h; } }
  // 卡
  for (let i = 0; i < 9; i++) {
    const el = $('[data-card="' + i + '"]');
    if (!el) continue;
    const c = s.cards[i];
    const show = c ? "" : "none";
    const sig = c ? c.k + c.st + c.cyc : "x";
    if (dispCache["cd" + i] !== sig) {
      el.style.display = show;
      if (c) el.innerHTML = geo.cardSvg(i, c.k, c.st, c.cyc);
      dispCache["cd" + i] = sig;
    }
    const hot = s.hot === i;
    if (dispCache["ch" + i] !== hot) { el.classList.toggle("hot", hot); dispCache["ch" + i] = hot; }
  }
  // 读数窗 / 旋钮 / 空/满 / 寄存器牌 / DB 窗 / 小闸 / 回绕点
  const win = (sel, html) => { const el = $(sel); if (el && dispCache[sel] !== html) { el.innerHTML = html; dispCache[sel] = html; } };
  win('[data-part="win-enq"]', geo.winSvg("enq", "槽 " + s.enq));
  win('[data-part="win-deq"]', geo.winSvg("deq", "槽 " + s.deq));
  win('[data-part="win-pcs"]', geo.winSvg("pcs", s.pcs));
  win('[data-part="win-ccs"]', geo.winSvg("ccs", s.ccs));
  win('[data-part="knob"]', geo.knobSvg(s.mode));
  win('[data-part="st-empty"]', geo.stateWinSvg("empty", s.empty));
  win('[data-part="st-full"]', geo.stateWinSvg("full", s.full));
  win('[data-part="reg-crcr"]', geo.regSvg("crcr", s.crcr));
  win('[data-part="reg-erdp"]', geo.regSvg("erdp", s.erdp));
  win('[data-part="dbdial"]', geo.dbDialSvg(s.db));
  win('[data-part="toggle"]', geo.toggleSvg(s.toggle, s.wrapLit));
  const wEl = $(".wrapdots");
  if (wEl && dispCache.wrap !== s.wrapLit) { wEl.classList.toggle("lit", !!s.wrapLit); dispCache.wrap = s.wrapLit; }
  const irqEl = $('[data-lamp="irq"]');
  if (irqEl && dispCache.irq !== s.irq) { irqEl.classList.toggle("on", !!s.irq); dispCache.irq = s.irq; }
  const nCmd = $('[data-note="cmd"]'), nEvt = $('[data-note="evt"]');
  if (nCmd && dispCache.nCmd !== s.noteCmd) { nCmd.style.display = s.noteCmd ? "" : "none"; dispCache.nCmd = s.noteCmd; }
  if (nEvt && dispCache.nEvt !== s.noteEvt) { nEvt.style.display = s.noteEvt ? "" : "none"; dispCache.nEvt = s.noteEvt; }
  // 票据
  let tk = "";
  for (const t of tokens) {
    const p = alongWire(t.rev ? 1 - t.t : t.t);
    const [dx, dy] = dAt(p);
    tk += `<g transform="translate(${dx.toFixed(2)},${dy.toFixed(2)})">` + geo.tokenSvg(t.kind) + `</g>`;
  }
  if (dispCache.tokens !== tk) { tokenLayer.innerHTML = tk; dispCache.tokens = tk; }
  // 事件匣回执卡
  let ev = "";
  for (let i = 0; i < s.tray; i++) {
    const [dx, dy] = dAt([D.desk.tray.x - 8 + i * 7, D.desk.tray.y + 2 - i * 1.5, 34]);
    ev += `<g transform="translate(${dx.toFixed(2)},${dy.toFixed(2)})">` + geo.trayCardSvg("事件") + `</g>`;
  }
  if (dispCache.tray !== ev) { eventLayer.innerHTML = ev; dispCache.tray = ev; }
  // 读数
  const text = "帧 " + frame + "/12 · " + modeNames[s.mode] + " · Enq 槽" + s.enq + " · Deq 槽" + s.deq + " · PCS " + s.pcs + " · CCS " + s.ccs + (s.empty ? " · 空" : "") + (s.full ? " · 满" : "");
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", "第 " + (frame + 1) + "/13 帧：" + NAMES[frame] + "。" + NARR[frame] + "（" + PG[frame] + "）");
}

function playTo(i) {
  const prev = frame;
  frame = Math.max(0, Math.min(FRAMES.length - 1, i));
  const to = FRAMES[frame];
  tokens = [];
  anim = null;
  if (still.matches) {
    state = snapshot(frame);
    snapNext = true; dropT.e = 0; dropT.d = 0;
  } else {
    anim = { t0: performance.now(), dur: DUR[frame], cues: buildCues(prev, frame, to) };
  }
  statusEl.textContent = "第 " + (frame + 1) + "/13 帧 · " + NAMES[frame] + " · " + PG[frame];
  run();
}
// cuesFor 依赖帧号；此处闭包打包（避免函数体内引用未定义变量）
let toIdx = 0, fromIdx = 0;
function buildCues(prev, cur, to) {
  fromIdx = prev; toIdx = cur;
  const from = FRAMES[prev];
  if (cur < prev || cur - prev > 1 || to.mode !== from.mode) {
    const cues = [{ at: 0.12, apply: (s) => { applyAll(s, to); snapNext = true; } }];
    // 模式切换帧：先落前态再演出
    if (to.mode !== from.mode && PRE[cur]) {
      cues.length = 0;
      cues.push({ at: 0.1, apply: (s) => { applyAll(s, PRE[cur]); snapNext = true; } });
      cuesFor(from, to).forEach((c) => { if (c.at > 0.11) cues.push(c); });
    }
    return cues;
  }
  return cuesFor(from, to);
}

// ---------- 主循环 ----------
let last = 0, raf = 0, visible = false, touring = !still.matches, idleTimer = 0, tourTimer = 0;
const TOUR_DWELL = 5.5;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (anim) {
    const t = Math.min(1, (now - anim.t0) / anim.dur);
    anim.cues.forEach((cue) => { if (!cue.fired && t >= cue.at) { cue.fired = true; cue.apply(state); } });
    for (const tk of tokens) tk.t = Math.min(1, tk.t + dt / 1.15);
    tokens = tokens.filter((tk) => tk.t < 1);
    if (t >= 1) { state = snapshot(frame); anim = null; }
  }
  if (touring && !anim) {
    tourTimer += dt;
    if (tourTimer > TOUR_DWELL) { tourTimer = 0; playTo((frame + 1) % FRAMES.length); }
  }
  render(state, dt);
  raf = visible && (anim || touring) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!raf && visible) { last = 0; raf = requestAnimationFrame(tick); } };
function syncTourBtn() {
  const box = stage.closest(".iso-figure");
  const btn = box && box.querySelector('.fig-ctl [data-act="tour"]');
  if (btn) btn.setAttribute("aria-pressed", String(!!touring));
}
const arm = () => { touring = false; clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; tourTimer = 0; syncTourBtn(); run(); }, 3600); syncTourBtn(); run(); };
const step = (dir) => { arm(); playTo(frame + dir); };
const MODE_FIRST = [0, 9, 11];
const cycleMode = () => {
  arm();
  const cur = FRAMES[frame].mode;
  playTo(MODE_FIRST[(cur + 1) % 3]);
};
new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointerdown", () => { arm(); playTo((frame + 1) % FRAMES.length); });
stage.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); step(1); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
  else if (e.key === "Home") { arm(); playTo(0); }
  else if (e.key === "m" || e.key === "M") { cycleMode(); }
  else if (e.key === "a" || e.key === "A") { touring = !still.matches; tourTimer = 0; syncTourBtn(); run(); }
  else if (e.key === "Escape") { touring = false; clearTimeout(idleTimer); syncTourBtn(); run(); }
});
const ctlBox = stage.closest(".iso-figure").querySelector(".fig-ctl");
if (ctlBox) ctlBox.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const act = b.dataset.act;
  if (act === "next") step(1);
  else if (act === "prev") step(-1);
  else if (act === "reset") { arm(); playTo(0); }
  else if (act === "mode") cycleMode();
  else if (act === "tour") {
    if (touring) { touring = false; clearTimeout(idleTimer); run(); }
    else { touring = !still.matches; tourTimer = 0; clearTimeout(idleTimer); run(); }
    syncTourBtn();
  }
});
syncTourBtn();
window.__fig49 = {
  step, playTo, cycleMode,
  pause: () => { touring = false; clearTimeout(idleTimer); },
  stateOf: () => ({ mode: modeNames[state.mode], enq: state.enq, deq: state.deq, pcs: state.pcs, ccs: state.ccs, empty: state.empty, full: state.full, frame }),
  frameOf: () => frame,
};
render(state, 0.016);
})();

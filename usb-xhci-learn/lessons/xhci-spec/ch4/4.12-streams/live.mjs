// §4.12 流查表台——十一帧步进/巡游（判据见 EVIDENCE.md；帧模型与画面断言同源）
// 窗口.__fig412 为主名；__fig42 为板块探针兼容别名（occlusion/ctl 探针只认 fig42/fig43 API）。
(() => {
const D = __DATA__;
const K = { iso, pathOf, solidSvg, lineSvg, dotsSvg, slabOf, cylinder, ring, sideArc, topMatrix, faceTextSvg, lineOnTop, corners, planOutline, insetPlan, extrude, depthOf };
const geo = makeLiveGeo(K, G, D);

const stages = document.querySelectorAll(".iso-stage");
const stage = stages[stages.length - 1];           // 动画卡是第二个 stage
const svgRoot = stage.querySelector("svg");
const $ = (sel) => svgRoot.querySelector(sel);
const $$ = (sel) => svgRoot.querySelectorAll(sel);
const readout = stage.closest(".iso-figure").querySelector("[data-readout]");
const statusEl = stage.querySelector("[data-status]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

// ---- 帧终态（同源真值；演出过程由 cues 驱动） ----
// trbs: ring-slot -> 1 在环 / 2 已执行；cards: 主卡笼格号；spsm: null 未开流 / 0..4 五态
const F = (o) => Object.assign({ cards: [], ghost: 0, secCard: 0, epPtr: 0, rings: [], trbs: {}, dial: 0, spsm: null,
  captured: null, split: null, cstream: null, switchV: null, ippv: 0, dbpv: 0, lfcv: 0, dsicv: 0,
  ent: 0, secLit: 0, halt: 0, err: 0, events: 0 }, o);
const ALL_TRB = { "r1-0": 1, "r1-1": 1, "r1-2": 1, "r18-0": 1, "r18-1": 1 };
const FRAMES = [
  F({ step: 0 }),                                                                                    // F0 全景
  F({ step: 1, cards: [0, 1, 2, 15], ghost: 1, secCard: 1, epPtr: 1, spsm: 0 }),                      // F1 开流
  F({ step: 2, cards: [0, 1, 2, 15], ghost: 1, secCard: 1, epPtr: 1, spsm: 0, rings: ["r1", "r18"], trbs: ALL_TRB }), // F2 备环挂 TD
  F({ step: 3, cards: [0, 1, 2, 15], ghost: 1, secCard: 1, epPtr: 1, spsm: 1, rings: ["r1", "r18"], trbs: ALL_TRB, dial: 1, captured: 1, dsicv: 1, ippv: 1 }), // F3 首铃 Prime Pipe→Idle
  F({ step: 4, cards: [0, 1, 2, 15], ghost: 1, secCard: 1, epPtr: 1, spsm: 4, rings: ["r1", "r18"], trbs: ALL_TRB, dial: 1, captured: 1, dsicv: 1, ippv: 1, cstream: 1 }), // F4 查表→Move Data
  F({ step: 5, cards: [0, 1, 2, 15], ghost: 1, secCard: 1, epPtr: 1, spsm: 4, rings: ["r1", "r18"], trbs: ALL_TRB, dial: 1, captured: 1, dsicv: 1, ippv: 1, cstream: 1, dbpv: 1 }), // F5 搬数中再铃→DBPV
  F({ step: 6, cards: [0, 1, 2, 15], ghost: 1, secCard: 1, epPtr: 1, spsm: 4, rings: ["r1", "r18"], trbs: ALL_TRB, dial: 1, captured: 1, dsicv: 1, ippv: 1, cstream: 18, switchV: 1, lfcv: 1, split: 18, secLit: 1 }), // F6 设备切流 18
  F({ step: 7, cards: [0, 1, 2, 15], ghost: 1, secCard: 1, epPtr: 1, spsm: 2, rings: ["r1", "r18"], trbs: { "r1-0": 2, "r1-1": 2, "r1-2": 2, "r18-0": 1, "r18-1": 1 }, dial: 1, captured: 1, dsicv: 1, ippv: 1, cstream: 18, switchV: 1, lfcv: 1, split: 18, secLit: 1, ent: 1, dbpv: 1 }), // F7 存态前查 ENT
  F({ step: 8, cards: [0, 1, 2, 15], ghost: 1, secCard: 1, epPtr: 1, spsm: 2, rings: ["r1", "r18"], trbs: { "r1-0": 2, "r1-1": 2, "r1-2": 2, "r18-0": 1, "r18-1": 1 }, dial: 1, captured: 1, dsicv: 1, ippv: 1, cstream: 18, switchV: 1, lfcv: 1, split: 18, secLit: 1, ent: 1, dbpv: 1, events: 1 }), // F8 回执
  F({ step: 9, cards: [0, 1, 2, 15], ghost: 1, secCard: 1, epPtr: 1, spsm: 2, rings: ["r1", "r18"], trbs: { "r1-0": 2, "r1-1": 2, "r1-2": 2, "r18-0": 1, "r18-1": 1 }, dial: 1, captured: 1, dsicv: 1, ippv: 1, cstream: 18, switchV: 1, lfcv: 1, split: 18, secLit: 1, ent: 1, dbpv: 1, events: 1, halt: 1, err: 1 }), // F9 越界检查
  F({ step: 10, cards: [0, 1, 2, 15], ghost: 1, secCard: 1, epPtr: 1, spsm: 1, rings: ["r1", "r18"], trbs: { "r1-0": 2, "r1-1": 2, "r1-2": 2, "r18-0": 1, "r18-1": 1 }, dial: 1, captured: 1, dsicv: 1, ippv: 1, cstream: 18, switchV: 1, lfcv: 1, split: 18, secLit: 1, ent: 1, dbpv: 1, events: 1 }), // F10 读数巡回
];
const DUR = [3300, 4500, 4800, 6600, 6600, 4800, 7200, 6900, 3900, 6600, 3000];
const NAMES = ["全景", "开流（Configure Endpoint）", "备环挂 TD", "门铃 DB Stream ID=1", "查表路由 → Move Data", "搬数与 DBPV 补记", "设备包边界切流 18", "存流状态前查 ENT", "回执入事件匣", "越界与类型检查", "读数巡回"];

// ---- 折线行走（票据/事件卡沿电缆） ----
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
const PATHS = { bell: pathInfo(D.wirePaths.bell), bus: pathInfo(D.wirePaths.bus), ev: pathInfo(D.wirePaths.ev) };
const alongPath = (info, t) => {
  let d = Math.max(0, Math.min(1, t)) * info.total;
  for (const [a, b, l] of info.segs) {
    if (d <= l) { const u = l ? d / l : 0; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u + 2.6]; }
    d -= l;
  }
  const b = info.segs[info.segs.length - 1][1];
  return [b[0], b[1], b[2] + 2.6];
};

let frame = 0, anim = null;
let state = snapshot(0);
let tokens = [];       // {kind, path, from0, t0, t1, at}（from0: t=0 在折线 0 端还是 1 端）
function snapshot(i) {
  const f = FRAMES[i];
  return {
    step: f.step, cards: new Set(f.cards), ghost: f.ghost, secCard: f.secCard, epPtr: f.epPtr,
    rings: new Set(f.rings), trbs: Object.assign({}, f.trbs), dial: f.dial, spsm: f.spsm,
    captured: f.captured, split: f.split, cstream: f.cstream, switchV: f.switchV,
    ippv: f.ippv, dbpv: f.dbpv, lfcv: f.lfcv, dsicv: f.dsicv,
    ent: f.ent, secLit: f.secLit, halt: f.halt, err: f.err, events: f.events,
    bellT: 0, bellTT: 0, drumPos: f.spsm == null ? -1 : f.spsm,
    probe: { x: D.trolleyHome, tx: D.trolleyHome, drop: 0, dropT: 0 },
  };
}
const applyAll = (s, f) => {
  s.cards = new Set(f.cards); s.ghost = f.ghost; s.secCard = f.secCard; s.epPtr = f.epPtr;
  s.rings = new Set(f.rings); s.trbs = Object.assign({}, f.trbs); s.dial = f.dial; s.spsm = f.spsm;
  s.captured = f.captured; s.split = f.split; s.cstream = f.cstream; s.switchV = f.switchV;
  s.ippv = f.ippv; s.dbpv = f.dbpv; s.lfcv = f.lfcv; s.dsicv = f.dsicv;
  s.ent = f.ent; s.secLit = f.secLit; s.halt = f.halt; s.err = f.err; s.events = f.events;
};

// ---------- 帧间演出 ----------
function cuesFor(from, to) {
  const cues = [];
  const add = (at, apply) => cues.push({ at, apply });
  if (to.step < from.step) {  // 回退/复位：一次性归到目标终态（探针 playTo 任意帧亦走此路）
    add(0.15, (s) => { applyAll(s, to); s.probe.tx = D.trolleyHome; s.probe.dropT = 0; s.drumPos = to.spsm == null ? -1 : to.spsm; });
    if (to.step >= 3) add(0.45, (s) => { s.probe.tx = D.cellCX1; });
    if (to.step >= 6) add(0.6, (s) => { s.probe.tx = D.secCX1; s.probe.dropT = 40; });
    return cues;
  }
  const d = to.step - from.step;
  if (d > 1) { add(0.15, (s) => applyAll(s, to)); return cues; }  // 跳帧：直接落终态
  switch (to.step) {
    case 1: { // 开流
      add(0.12, (s) => { s.epPtr = 1; });
      add(0.3, (s) => { s.cards.add(0); s.cards.add(2); });
      add(0.42, (s) => { s.cards.add(1); s.cards.add(15); s.ghost = 1; s.secCard = 1; });
      add(0.68, (s) => { s.spsm = 0; s.drumPos = 0; });
      break;
    }
    case 2: { // 备环挂 TD
      add(0.15, (s) => { s.rings.add("r1"); });
      add(0.3, (s) => { s.trbs["r1-0"] = 1; s.trbs["r1-1"] = 1; s.trbs["r1-2"] = 1; });
      add(0.5, (s) => { s.rings.add("r18"); });
      add(0.65, (s) => { s.trbs["r18-0"] = 1; s.trbs["r18-1"] = 1; });
      break;
    }
    case 3: { // 门铃：拨轮→按铃→铃卡走线→捕获→Prime Pipe→票据到设备→Idle
      add(0.08, (s) => { s.dial = 1; });
      add(0.16, (s) => { s.bellTT = 1; });
      add(0.24, (s) => { s.bellTT = 0; tokens.push({ kind: "bell", path: "bell", rev: false, t: 0 }); });
      add(0.55, (s) => { s.captured = 1; s.dsicv = 1; });
      add(0.6, (s) => { s.spsm = 2; s.drumPos = 2; tokens.push({ kind: "prime", path: "bus", rev: false, t: 0 }); });
      add(0.88, (s) => { s.spsm = 1; s.drumPos = 1; s.ippv = 1; });
      break;
    }
    case 4: { // 查表路由：滑车到格 1 → 读卡 → Move Data
      add(0.1, (s) => { s.probe.tx = D.cellCX1; });
      add(0.32, (s) => { s.probe.dropT = 40; });
      add(0.5, (s) => { hotCells(s, [1]); });
      add(0.62, (s) => { s.spsm = 4; s.drumPos = 4; s.cstream = 1; tokens.push({ kind: "data", path: "bus", rev: true, t: 0 }); });
      break;
    }
    case 5: { // 搬数中再铃 → DBPV 补记
      add(0.12, (s) => { s.bellTT = 1; });
      add(0.2, (s) => { s.bellTT = 0; tokens.push({ kind: "bell2", path: "bell", rev: false, t: 0 }); });
      add(0.5, (s) => { s.dbpv = 1; });
      add(0.6, (s) => { tokens.push({ kind: "data", path: "bus", rev: true, t: 0 }); });
      break;
    }
    case 6: { // 设备切流：NRDY→LFCV；SID 18 拆位；滑车格 2→辅格 1
      add(0.08, (s) => { tokens.push({ kind: "nrdy", path: "bus", rev: true, t: 0 }); });
      add(0.34, (s) => { s.lfcv = 1; s.switchV = 1; s.cstream = 18; });
      add(0.42, (s) => { tokens.push({ kind: "sid18", path: "bus", rev: true, t: 0 }); });
      add(0.62, (s) => { s.split = 18; });
      add(0.5, (s) => { s.probe.dropT = 0; });
      add(0.58, (s) => { s.probe.tx = D.cellCX2; });
      add(0.72, (s) => { s.probe.dropT = 40; hotCells(s, [2]); });
      add(0.86, (s) => { s.secLit = 1; s.probe.tx = D.secCX1; tokens.push({ kind: "data18", path: "bus", rev: true, t: 0 }); });
      break;
    }
    case 7: { // 存态前查 ENT：ED 卡执行 → Idle → DBPV 强制补发 Prime Pipe
      add(0.1, (s) => { s.trbs["r1-0"] = 2; s.trbs["r1-1"] = 2; s.probe.dropT = 0; });
      add(0.22, (s) => { s.ent = 1; });
      add(0.4, (s) => { s.trbs["r1-2"] = 2; });
      add(0.55, (s) => { s.spsm = 1; s.drumPos = 1; s.ippv = 0; });
      add(0.72, (s) => { s.spsm = 2; s.drumPos = 2; s.ippv = 1; tokens.push({ kind: "prime", path: "bus", rev: false, t: 0 }); });
      add(0.9, (s) => { s.probe.tx = D.trolleyHome; });
      break;
    }
    case 8: { // 回执：Event Data Transfer Event 沿事件管入事件匣
      add(0.12, (s) => { tokens.push({ kind: "ev", path: "ev", rev: false, t: 0 }); });
      add(0.7, (s) => { s.events = 1; });
      break;
    }
    case 9: { // 越界与类型检查：SID 0 / SID 17 → 停端点；空卡格 NoStream；Set TR DP → TRB Error
      add(0.1, (s) => { tokens.push({ kind: "err0", path: "bus", rev: true, t: 0 }); });
      add(0.34, (s) => { s.halt = 1; });
      add(0.42, (s) => { tokens.push({ kind: "err17", path: "bus", rev: true, t: 0 }); });
      add(0.62, (s) => { s.err = 1; hotCells(s, [1, 5]); });
      break;
    }
    case 10: { // 读数巡回：端点恢复 Running（复位须 Set TR Dequeue Pointer——§4.6.10）
      add(0.3, (s) => { s.halt = 0; s.err = 0; hotCells(s, []); });
      add(0.55, (s) => { s.spsm = 1; s.drumPos = 1; });
      break;
    }
    case 0: { // 回全景（巡游环绕）
      add(0.4, (s) => applyAll(s, FRAMES[0]));
      break;
    }
  }
  return cues;
}
// 卡笼热格（查表命中高亮）；hotList 空=清
let hotList = [];
function hotCells(s, list) {
  hotList = list;
  s._hot = list;
}

// ---------- 渲染 ----------
const tokenLayer = $('[data-part="actors-tokens"]');
const eventLayer = $('[data-part="actors-events"]');
const actorTextLayer = $('[data-part="actor-texts"]');   // 票据/事件刻字层（2026-11-05 遮挡修复轮）
const dispCache = {};
function render(s, dt) {
  const ease = 1 - Math.exp(-(dt || 0.016) / 0.12);
  // 滑车连续趋近
  const pr = s.probe;
  pr.x += (pr.tx - pr.x) * ease;
  pr.drop += (pr.dropT - pr.drop) * ease;
  const tr = $('[data-part="trolley"]');
  const trHtml = geo.trolleySvg(pr.x, pr.drop);
  if (tr.innerHTML !== trHtml) tr.innerHTML = trHtml;
  // 门铃钮
  s.bellT += (s.bellTT - s.bellT) * ease;
  const bb = $('[data-part="bellbtn"]');
  const bbHtml = geo.bellBtnSvg(s.bellT);
  if (bb.innerHTML !== bbHtml) bb.innerHTML = bbHtml;
  // 转筒滚向目标态
  const drumT = s.spsm == null ? -1 : s.spsm;
  s.drumPos += (drumT - s.drumPos) * (1 - Math.exp(-(dt || 0.016) / 0.18));
  const dr = $('[data-part="spsm"]');
  const drHtml = geo.drumSvg(Math.round(s.drumPos * 100) / 100);
  if (dr.innerHTML !== drHtml) dr.innerHTML = drHtml;
  // 各数码/文字窗
  const win = (sel, html) => { const el = $(sel); if (el && el.innerHTML !== html) el.innerHTML = html; };
  win('[data-part="capwin"]', geo.capWinSvg(s.captured));
  win('[data-part="splitwin"]', geo.splitWinSvg(s.split));
  win('[data-part="cstream"]', geo.cstreamSvg(s.cstream));
  win('[data-part="devswitch"]', geo.switchSvg(s.switchV));
  win('[data-part="epwin"]', geo.epPtrSvg(s.epPtr));
  win('[data-part="belldial"]', geo.dialSvg(s.dial));
  // 卡笼卡（卡体在 item 序、刻字在 labels 尾层，同步显隐）
  for (const idx of [0, 1, 2, 5, 15]) {
    const key = "cell" + idx;
    const show = (idx === 5 ? s.ghost : s.cards.has(idx)) ? "" : "none";
    if (dispCache[key + "d"] !== show) {
      const el = $('[data-cell="' + idx + '"]');
      if (el) el.style.display = show;
      const te = $('[data-celltext="' + idx + '"]');
      if (te) te.style.display = show;
      dispCache[key + "d"] = show;
    }
    const el = $('[data-cell="' + idx + '"]');
    const hot = (s._hot || []).includes(idx) ? true : false;
    if (el && dispCache[key + "h"] !== hot) { el.classList.toggle("hot", hot); dispCache[key + "h"] = hot; }
  }
  const secEl = $('[data-sec="1"]');
  const secTEl = $('[data-sectext="1"]');
  if (secEl) {
    const show = s.secCard ? "" : "none";
    if (dispCache.secd !== show) { secEl.style.display = show; dispCache.secd = show; }
    if (secTEl && secTEl.style.display !== show) secTEl.style.display = show;
    const hot = !!s.secLit;
    if (dispCache.sech !== hot) { secEl.classList.toggle("hot", hot); dispCache.sech = hot; }
  }
  const spEl = $(".secpath");
  if (spEl && dispCache.seclit !== s.secLit) { spEl.classList.toggle("lit", !!s.secLit); dispCache.seclit = s.secLit; }
  // TRB 卡（态变化时重建；卡体在 item 序、刻字在 labels 尾层）
  const kinds = { "r1-0": "N", "r1-1": "E", "r1-2": "D", "r18-0": "E", "r18-1": "D" };
  for (const key of Object.keys(kinds)) {
    const [ring, slot] = key.split("-");
    const el = $('[data-trb="' + key + '"]');
    const te = $('[data-trbtext="' + key + '"]');
    const st = s.trbs[key] || 0;
    if (dispCache[key] !== st) {
      const show = st ? "" : "none";
      if (el) { el.style.display = show; el.innerHTML = geo.trbBodySvg(ring, slot, kinds[key], st); }
      if (te) { te.style.display = show; te.innerHTML = geo.trbTextSvg(ring, slot, kinds[key], st); }
      dispCache[key] = st;
    }
  }
  // 灯（类切换）
  const lamps = { ippv: s.ippv, dbpv: s.dbpv, lfcv: s.lfcv, dsicv: s.dsicv, ent: s.ent, r1: s.rings.has("r1"), r18: s.rings.has("r18") };
  for (const [key, on] of Object.entries(lamps)) {
    const el = $('[data-lamp="' + key + '"]');
    if (el && dispCache["L" + key] !== on) { el.classList.toggle("on", !!on); dispCache["L" + key] = on; }
  }
  const epEl = $('[data-lamp="epstate"]');
  if (epEl) {
    const running = s.step >= 1 && !s.halt;
    if (dispCache.Lep !== running + "-" + s.halt) {
      epEl.classList.toggle("on", running);
      epEl.classList.toggle("halt", !!s.halt);
      dispCache.Lep = running + "-" + s.halt;
    }
  }
  // 越界注记牌
  const errEl = $('[data-note="err"]');
  if (errEl && dispCache.errnote !== s.err) { errEl.style.display = s.err ? "" : "none"; dispCache.errnote = s.err; }
  // 票据行走（两遍渲染：全部卡体入 actors 层，全部刻字入 actor-texts 尾层——
  // 同层票互盖时刻字仍在最上，2026-11-05 遮挡修复轮）
  let tk = "", tt2 = "";
  for (const t of tokens) {
    const info = PATHS[t.path];
    const tt = t.rev ? 1 - t.t : t.t;
    const p = alongPath(info, tt);
    const [dx, dy] = dAt(p);
    const tr = `translate(${dx.toFixed(2)},${dy.toFixed(2)})`;
    if (t.kind === "ev") {
      tk += `<g transform="${tr}">` + geo.eventBodySvg() + `</g>`;
      tt2 += `<g transform="${tr}">` + geo.eventTextSvg("Transfer Event") + `</g>`;
    } else {
      tk += `<g transform="${tr}">` + geo.tokenBodySvg(t.kind) + `</g>`;
      tt2 += `<g transform="${tr}">` + geo.tokenTextSvg(t.kind) + `</g>`;
    }
  }
  if (dispCache.tokens !== tk) { tokenLayer.innerHTML = tk; dispCache.tokens = tk; }
  // 事件匣内的回执卡（体在 actors-events 层、字并入 actor-texts 尾层）
  let ev = "";
  for (let i = 0; i < s.events; i++) {
    const [dx, dy] = dAt([-198 + i * 6, -51 + i * 3, 38.5]);
    ev += `<g transform="translate(${dx.toFixed(2)},${dy.toFixed(2)})">` + geo.eventBodySvg() + `</g>`;
    tt2 += `<g transform="translate(${dx.toFixed(2)},${dy.toFixed(2)})">` + geo.eventTextSvg("Transfer Event") + `</g>`;
  }
  if (dispCache.trayev !== ev) { eventLayer.innerHTML = ev; dispCache.trayev = ev; }
  if (dispCache.tokenTexts !== tt2) { actorTextLayer.innerHTML = tt2; dispCache.tokenTexts = tt2; }
  // 读数
  const spsmTxt = s.spsm == null ? "—" : D.spsmNames[s.spsm];
  const text = "步 " + s.step + "/10 · xSPSM " + spsmTxt + " · CStream " + (s.cstream == null ? "—" : s.cstream) + " · 端点 " + (s.halt ? "Halted" : s.step >= 1 ? "Running" : "未配置");
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", "第 " + (frame + 1) + "/11 帧：" + NAMES[frame] + "。" + text);
}

function playTo(i) {
  const from = { step: state.step };
  frame = Math.max(0, Math.min(FRAMES.length - 1, i));
  const to = FRAMES[frame];
  tokens = [];
  anim = { t0: performance.now(), dur: DUR[frame], cues: cuesFor(from, to) };
  statusEl.textContent = "第 " + (frame + 1) + "/11 帧 · " + NAMES[frame];
  run();  // 自启（4.2 裁处修复先例：外部 playTo 落在 tick 停止窗时补拉起）
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
    for (const tk of tokens) tk.t = Math.min(1, tk.t + dt / 1.1);
    tokens = tokens.filter((tk) => tk.t < 1);
    if (t >= 1) { state = snapshot(frame); hotList = state._hot || (frame === 4 ? [1] : frame === 6 ? [2] : frame === 9 ? [1, 5] : []); state._hot = hotList; anim = null; }
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
new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointerdown", () => { arm(); playTo((frame + 1) % FRAMES.length); });
stage.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); step(1); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
  else if (e.key === "Home") { arm(); playTo(0); }
  else if (e.key === "a" || e.key === "A") { touring = !still.matches; tourTimer = 0; syncTourBtn(); run(); }
  else if (e.key === "Escape") { touring = false; clearTimeout(idleTimer); syncTourBtn(); run(); }
});
// 控制条（四钮；键盘行为全部保留）
const ctlBox = stage.closest(".iso-figure").querySelector(".fig-ctl");
if (ctlBox) ctlBox.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const act = b.dataset.act;
  if (act === "next") step(1);
  else if (act === "prev") step(-1);
  else if (act === "reset") { arm(); playTo(0); }
  else if (act === "tour") {
    if (touring) { touring = false; clearTimeout(idleTimer); run(); }
    else { touring = !still.matches; tourTimer = 0; clearTimeout(idleTimer); run(); }
    syncTourBtn();
  }
});
syncTourBtn();
window.__fig412 = { step, playTo, pause: () => { touring = false; clearTimeout(idleTimer); }, stateOf: () => ({ step: state.step, spsm: state.spsm, cstream: state.cstream, halt: state.halt }), frameOf: () => frame };
// 板块探针兼容别名（xhci_spec_occlusion_probe / ctl_probe 只认 __fig42/__fig43 取帧表达式）
window.__fig42 = window.__fig412;
render(state, 0.016);
})();

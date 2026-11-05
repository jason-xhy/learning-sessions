// §4.14 调度轮转台——十一帧步进/巡游（判据见 EVIDENCE.md；帧模型与画面断言同源）
// 窗口.__fig414 为主名；__fig42 为板块探针兼容别名（occlusion/ctl 探针只认 fig42/fig43 API）。
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
// td: "<ring>-<slot>" -> 0 无 / 1 待取 / 2 已完成 / 3 跨 ESIT 进行中
// mf: 累计微帧数（uf=mf%8 · Frame=0x300+floor(mf/8) · 读线位置=mf%32）
// dial: 轮转盘指针座位号（0=Bulk 前 / 1=Control / 2=空位）；sopc: SO 计数窗
const F = (o) => Object.assign({ td: {}, eps: [], act: { iso: 0, intr: 0, bulk: 0, ctrl: 0 },
  mf: null, dial: 0, serving: null, sopc: null, nrdy: 0, erdy: 0, cont: 0,
  istLit: 0, err: 0, def: 0, events: 0, nextMark: 0 }, o);
const TD_ALL = { "iso-0": 1, "iso-1": 1, "intr-0": 1, "intr-1": 1, "bulk-0": 1, "bulk-1": 1 };
const EPS_ALL = ["iso", "intr", "bulk", "ctrl"];
const ACT_ALL = { iso: 1, intr: 1, bulk: 1, ctrl: 1 };
const SOPC_BULK_DONE = { ep: "Bulk", msopc: 8, sopc: 0, sub: "MSTrS 8192B ≥ TD → 一个 SO 搬完（p245）" };
const FRAMES = [
  F({ step: 0 }),                                                                                    // F0 全景
  F({ step: 1, td: Object.assign({}, TD_ALL) }),                                                     // F1 翻译挂环
  F({ step: 2, td: Object.assign({}, TD_ALL), eps: EPS_ALL, act: Object.assign({}, ACT_ALL) }),      // F2 门铃入表
  F({ step: 3, td: { "iso-0": 1, "iso-1": 1, "intr-0": 1, "intr-1": 1, "bulk-0": 2, "bulk-1": 1 },
    eps: EPS_ALL, act: Object.assign({}, ACT_ALL), mf: 4, dial: 0, serving: "bulk",
    sopc: Object.assign({}, SOPC_BULK_DONE) }),                                                      // F3 SO 与 SOPC
  F({ step: 4, td: { "iso-0": 2, "iso-1": 1, "intr-0": 1, "intr-1": 1, "bulk-0": 2, "bulk-1": 1 },
    eps: EPS_ALL, act: Object.assign({}, ACT_ALL), mf: 10, dial: 0 }),                               // F4 周期节拍
  F({ step: 5, td: Object.assign({}, TD_ALL), eps: EPS_ALL, act: Object.assign({}, ACT_ALL),
    mf: 26, dial: 0, events: 1, err: 1 }),                                                           // F5 环空与再入表
  F({ step: 6, td: Object.assign({}, TD_ALL), eps: EPS_ALL, act: Object.assign({}, ACT_ALL),
    mf: 31, dial: 0, events: 1, err: 1, istLit: 1 }),                                                // F6 IST 领先量
  F({ step: 7, td: { "iso-0": 1, "iso-1": 1, "intr-0": 3, "intr-1": 1, "bulk-0": 2, "bulk-1": 1 },
    eps: EPS_ALL, act: Object.assign({}, ACT_ALL), mf: 37, dial: 0, events: 1, err: 1, istLit: 1,
    erdy: 1 }),                                                                                      // F7 中断 NRDY/ERDY
  F({ step: 8, td: { "iso-0": 2, "iso-1": 1, "intr-0": 3, "intr-1": 1, "bulk-0": 2, "bulk-1": 2 },
    eps: EPS_ALL, act: Object.assign({}, ACT_ALL), mf: 45, dial: 0, serving: "bulk", events: 1, err: 1,
    istLit: 1, erdy: 1, sopc: { ep: "Bulk", msopc: 8, sopc: 0, sub: "每过一遍表一个 SO（p246）" } }), // F8 异步轮转
  F({ step: 9, td: { "iso-0": 2, "iso-1": 1, "intr-0": 3, "intr-1": 1, "bulk-0": 2, "bulk-1": 2 },
    eps: EPS_ALL, act: Object.assign({}, ACT_ALL), mf: 53, dial: 0, serving: "bulk", events: 1, err: 1,
    istLit: 1, erdy: 1, def: 1,
    sopc: { ep: "Bulk", msopc: 8, sopc: 8, sub: "第二端点入表 → 回 MSOPC 限" } }),                    // F9 连续流与打断
  F({ step: 10, td: { "iso-0": 2, "iso-1": 1, "intr-0": 3, "intr-1": 1, "bulk-0": 2, "bulk-1": 2 },
    eps: EPS_ALL, act: Object.assign({}, ACT_ALL), mf: 53, dial: 0, events: 1 }),                    // F10 读数巡回
];
const DUR = [3200, 4200, 4600, 6600, 6600, 7200, 4600, 6900, 6900, 6600, 3000];
const NAMES = ["全景", "翻译描述符 · 挂 TD", "写门铃入表=Active", "SO 与 SOPC 包计数", "周期节拍：每 ESIT 一枚 TD",
  "环空摘出与再入表", "IST 领先量", "中断端点：NRDY/ERDY", "异步轮转 round-robin", "连续流与打断", "读数巡回"];

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
let tokens = [];       // {kind, path, rev, t}
function snapshot(i) {
  const f = FRAMES[i];
  return {
    step: f.step, td: Object.assign({}, f.td), eps: new Set(f.eps), act: Object.assign({}, f.act),
    mf: f.mf, dial: f.dial, serving: f.serving, sopc: f.sopc ? Object.assign({}, f.sopc) : null,
    nrdy: f.nrdy, erdy: f.erdy, cont: f.cont, istLit: f.istLit, err: f.err, def: f.def, events: f.events,
    bellT: 0, bellTT: 0, dialAngle: D.dial.seats[f.dial].a,
    devIso: f.step >= 4 ? 1 : 0, devIntr: f.step >= 7 ? 1 : 0, devBulk: f.step >= 3 ? 1 : 0,
    nextMark: 0,
  };
}
const applyAll = (s, f) => {
  s.td = Object.assign({}, f.td); s.eps = new Set(f.eps); s.act = Object.assign({}, f.act);
  s.mf = f.mf; s.dial = f.dial; s.serving = f.serving; s.sopc = f.sopc ? Object.assign({}, f.sopc) : null;
  s.nrdy = f.nrdy; s.erdy = f.erdy; s.cont = f.cont; s.istLit = f.istLit; s.err = f.err; s.def = f.def; s.events = f.events;
  s.devIso = f.step >= 4 ? 1 : 0; s.devIntr = f.step >= 7 ? 1 : 0; s.devBulk = f.step >= 3 ? 1 : 0;
};
// 微帧步进 cue 链（把 mf 从 a 匀到 b）
const mfCues = (cues, add, a, b, at0, at1) => {
  const n = b - a;
  if (n <= 0) { add(at0, (s) => { s.mf = b; }); return; }
  for (let i = 1; i <= n; i++) add(at0 + ((at1 - at0) * i) / n, (s) => { s.mf = a + i; });
};

// ---------- 帧间演出 ----------
function cuesFor(from, to) {
  const cues = [];
  const add = (at, apply) => cues.push({ at, apply });
  if (to.step < from.step) {  // 回退/复位：一次性归到目标终态（探针 playTo 任意帧亦走此路）
    add(0.15, (s) => { applyAll(s, to); s.dialAngle = D.dial.seats[to.dial].a; });
    return cues;
  }
  const d = to.step - from.step;
  if (d > 1) { add(0.15, (s) => applyAll(s, to)); return cues; }  // 跳帧：直接落终态
  switch (to.step) {
    case 1: { // 翻译挂环：TD 卡落三条环
      add(0.15, (s) => { s.td["iso-0"] = 1; s.td["iso-1"] = 1; });
      add(0.4, (s) => { s.td["intr-0"] = 1; s.td["intr-1"] = 1; });
      add(0.62, (s) => { s.td["bulk-0"] = 1; s.td["bulk-1"] = 1; });
      break;
    }
    case 2: { // 门铃：按铃 → 铃卡走线 → 四张端点卡落两张表 → Active 灯亮
      add(0.1, (s) => { s.bellTT = 1; });
      add(0.18, (s) => { s.bellTT = 0; tokens.push({ kind: "bell", path: "bell", rev: false, t: 0 }); });
      add(0.48, (s) => { s.eps.add("iso"); s.eps.add("intr"); s.act.iso = 1; s.act.intr = 1; });
      add(0.66, (s) => { s.eps.add("bulk"); s.eps.add("ctrl"); s.act.bulk = 1; s.act.ctrl = 1; });
      break;
    }
    case 3: { // SO 与 SOPC：MFINDEX 起跳 → 指针点名 Bulk → SOPC 8→0 → 数据票据到设备
      mfCues(cues, add, 0, 4, 0.08, 0.4);
      add(0.42, (s) => { s.sopc = { ep: "Bulk", msopc: 8, sopc: 8, sub: "SO=搬包时间块 · 1–3 USB 事务" }; });
      add(0.5, (s) => { tokens.push({ kind: "datab", path: "bus", rev: false, t: 0 }); });
      add(0.62, (s) => { if (s.sopc) s.sopc.sopc = 5; });
      add(0.74, (s) => { if (s.sopc) s.sopc.sopc = 2; tokens.push({ kind: "datab", path: "bus", rev: false, t: 0 }); });
      add(0.88, (s) => { s.sopc = Object.assign({}, SOPC_BULK_DONE); s.td["bulk-0"] = 2; s.devBulk = 1; });
      break;
    }
    case 4: { // 周期节拍：微帧推进跨 ESIT(8) → Isoch SO → 取一枚 TD → 数据回主机
      mfCues(cues, add, 4, 8, 0.1, 0.5);
      add(0.52, (s) => { /* ESIT 边界 */ });
      add(0.56, (s) => { s.sopc = { ep: "Isoch", msopc: 8, sopc: 8, sub: "SOPC=min(TDPC,MSOPC)（p237）" }; });
      add(0.62, (s) => { tokens.push({ kind: "datai", path: "bus", rev: true, t: 0 }); });
      mfCues(cues, add, 8, 10, 0.7, 0.86);
      add(0.9, (s) => { s.td["iso-0"] = 2; s.devIso = 1; s.sopc = null; });
      break;
    }
    case 5: { // 环空：跨 16 取第二枚 → 跨 24 环空 Ring Overrun → 摘出 → 再门铃放回
      mfCues(cues, add, 10, 16, 0.06, 0.26);
      add(0.3, (s) => { s.td["iso-1"] = 2; tokens.push({ kind: "datai", path: "bus", rev: true, t: 0 }); });
      mfCues(cues, add, 16, 24, 0.36, 0.52);
      add(0.56, (s) => { s.act.iso = 0; s.eps.delete("iso"); s.err = 1; });
      add(0.62, (s) => { tokens.push({ kind: "ev", path: "ev", rev: false, t: 0 }); });
      add(0.78, (s) => { s.bellTT = 1; });
      add(0.84, (s) => { s.bellTT = 0; tokens.push({ kind: "bell2", path: "bell", rev: false, t: 0 }); });
      add(0.92, (s) => { s.act.iso = 1; s.eps.add("iso"); s.td["iso-0"] = 1; s.td["iso-1"] = 1; });
      break;
    }
    case 6: { // IST 领先量：Isoch 环前括弧点亮 · 微帧缓进
      add(0.12, (s) => { s.istLit = 1; });
      mfCues(cues, add, 26, 31, 0.2, 0.8);
      break;
    }
    case 7: { // 中断：跨 32(Interrupt ESIT) → SO → TD 跨 ESIT → NRDY 流控 → ERDY 恢复
      add(0.06, (s) => { s.mf = 31; });
      mfCues(cues, add, 31, 32, 0.08, 0.16);
      add(0.2, (s) => { s.sopc = { ep: "Interrupt", msopc: 1, sopc: 1, sub: "每 ESIT 恰一个 SO（p243）" }; s.td["intr-0"] = 3; });
      add(0.3, (s) => { tokens.push({ kind: "nrdy", path: "bus", rev: true, t: 0 }); s.nrdy = 1; });
      mfCues(cues, add, 32, 35, 0.38, 0.56);
      add(0.62, (s) => { tokens.push({ kind: "erdy", path: "bus", rev: true, t: 0 }); });
      add(0.72, (s) => { s.nrdy = 0; s.erdy = 1; });
      mfCues(cues, add, 35, 37, 0.76, 0.86);
      add(0.9, (s) => { tokens.push({ kind: "datax", path: "bus", rev: true, t: 0 }); s.devIntr = 1; s.sopc = null; });
      break;
    }
    case 8: { // 异步轮转：指针转 Control(SO) → 周期 ESIT(40) 打断记「下一个」 → 恢复转 Bulk(SO)
      add(0.1, (s) => { s.dial = 1; });
      add(0.26, (s) => { s.sopc = { ep: "Control", msopc: 1, sopc: 1, sub: "每 Stage=独立 Async TD" }; tokens.push({ kind: "datac", path: "bus", rev: false, t: 0 }); });
      add(0.38, (s) => { if (s.sopc) s.sopc.sopc = 0; });
      mfCues(cues, add, 37, 40, 0.42, 0.52);
      add(0.56, (s) => { s.nextMark = 1; s.td["iso-0"] = 2; });  // 周期打断：记住下一个该轮的（p245）
      mfCues(cues, add, 40, 44, 0.6, 0.7);
      add(0.74, (s) => { s.nextMark = 0; s.dial = 0; });
      add(0.84, (s) => { s.sopc = { ep: "Bulk", msopc: 8, sopc: 8, sub: "每过一遍表一个 SO（p246）" }; tokens.push({ kind: "datab", path: "bus", rev: false, t: 0 }); });
      add(0.94, (s) => { s.sopc.sopc = 0; s.td["bulk-1"] = 2; });
      break;
    }
    case 9: { // 连续流：Control 环完撤卡 → 单端点连续流（SOPC>MSOPC）→ 再门铃打断回限
      add(0.12, (s) => { s.eps.delete("ctrl"); s.act.ctrl = 0; });
      add(0.24, (s) => { s.cont = 1; s.sopc = { ep: "Bulk", msopc: 8, sopc: 12, sub: "单端点在表：可连续流（p246）", over: 1 }; });
      add(0.36, (s) => { tokens.push({ kind: "datab", path: "bus", rev: false, t: 0 }); });
      add(0.48, (s) => { tokens.push({ kind: "datab", path: "bus", rev: false, t: 0 }); });
      mfCues(cues, add, 45, 49, 0.4, 0.56);
      add(0.6, (s) => { s.bellTT = 1; });
      add(0.66, (s) => { s.bellTT = 0; tokens.push({ kind: "bell2", path: "bell", rev: false, t: 0 }); });
      add(0.76, (s) => { s.eps.add("ctrl"); s.act.ctrl = 1; s.cont = 0; s.def = 1;
        s.sopc = { ep: "Bulk", msopc: 8, sopc: 8, sub: "第二端点入表 → 回 MSOPC 限" }; });
      mfCues(cues, add, 49, 53, 0.8, 0.94);
      break;
    }
    case 10: { // 读数巡回：注记收起 · 指针回位
      add(0.3, (s) => { s.err = 0; s.def = 0; s.istLit = 0; s.sopc = null; s.serving = null; });
      break;
    }
    case 0: { // 回全景（巡游环绕）
      add(0.4, (s) => applyAll(s, FRAMES[0]));
      break;
    }
  }
  return cues;
}

// ---------- 渲染 ----------
const tokenLayer = $('[data-part="actors-tokens"]');
const eventLayer = $('[data-part="actors-events"]');
const actorTextLayer = $('[data-part="actor-texts"]');   // 票据/事件刻字层（2026-11-05 遮挡修复轮）
const dispCache = {};
function render(s, dt) {
  const ease = 1 - Math.exp(-(dt || 0.016) / 0.12);
  // 门铃钮
  s.bellT += (s.bellTT - s.bellT) * ease;
  const bb = $('[data-part="bellbtn"]');
  const bbHtml = geo.bellBtnSvg(s.bellT);
  if (bb.innerHTML !== bbHtml) bb.innerHTML = bbHtml;
  // 微帧读线 + MFINDEX 窗（mf 离散步进——MFINDEX 每微帧推进一格，真值形态）
  const mkX = s.mf == null ? D.belt.x0 : D.belt.x0 + (s.mf % D.belt.n) * D.belt.unit;
  const mk = $('[data-part="mfmark"]');
  const mkHtml = geo.mfMarkSvg(Math.round(mkX * 100) / 100);
  if (mk.innerHTML !== mkHtml) mk.innerHTML = mkHtml;
  const uf = s.mf == null ? null : s.mf % 8;
  const fr = s.mf == null ? null : 0x300 + Math.floor(s.mf / 8);
  const win = (sel, html) => { const el = $(sel); if (el && el.innerHTML !== html) el.innerHTML = html; };
  win('[data-part="mfwin"]', geo.mindexWinSvg(fr, uf));
  win('[data-part="sopcwin"]', geo.sopcWinSvg(s.sopc));
  // 轮转盘指针（连续趋近目标座位方位角）
  const seatA = D.dial.seats[s.dial].a;
  s.dialAngle += (seatA - s.dialAngle) * ease;
  const arm = $('[data-part="dialarm"]');
  const armHtml = geo.dialArmSvg(Math.round(s.dialAngle * 10) / 10, s.serving === "bulk" || s.serving === "ctrl" ? 1 : 0);
  if (arm.innerHTML !== armHtml) arm.innerHTML = armHtml;
  // 端点卡（display + hot；卡体与尾层刻字同步显隐）
  for (const key of ["iso", "intr", "bulk", "ctrl"]) {
    const el = $('[data-ep="' + key + '"]');
    const show = s.eps.has(key) ? "" : "none";
    if (dispCache["ep" + key] !== show) {
      if (el) el.style.display = show;
      const te = $('[data-eptext="' + key + '"]');
      if (te) te.style.display = show;
      dispCache["ep" + key] = show;
    }
    const hot = s.serving === key;
    if (el && dispCache["eph" + key] !== hot) { el.classList.toggle("hot", hot); dispCache["eph" + key] = hot; }
  }
  // 「下一个」标记
  const nm = $('[data-part="nextmark"]');
  if (nm && dispCache.nextmark !== !!s.nextMark) { nm.style.display = s.nextMark ? "" : "none"; dispCache.nextmark = !!s.nextMark; }
  // TD 卡（态变化时重建；卡体在 item 序、刻字在 labels 尾层）
  for (const key of Object.keys({ "iso-0": 1, "iso-1": 1, "intr-0": 1, "intr-1": 1, "bulk-0": 1, "bulk-1": 1 })) {
    const [ring, slot] = key.split("-");
    const el = $('[data-td="' + key + '"]');
    const te = $('[data-tdtext="' + key + '"]');
    const st = s.td[key] || 0;
    if (dispCache[key] !== st) {
      const show = st ? "" : "none";
      if (el) { el.style.display = show; el.innerHTML = geo.tdCardBodySvg(ring, slot, st); }
      if (te) { te.style.display = show; te.innerHTML = geo.tdCardTextSvg(ring, slot, st); }
      dispCache[key] = st;
    }
  }
  // 灯（类切换）
  const lamps = {
    ringiso: (s.td["iso-0"] || 0) > 0 && (s.td["iso-0"] !== 2 || (s.td["iso-1"] || 0) > 0 && s.td["iso-1"] !== 2),
    ringintr: ((s.td["intr-0"] || 0) === 1 || (s.td["intr-0"] || 0) === 3 || (s.td["intr-1"] || 0) === 1),
    ringbulk: ((s.td["bulk-0"] || 0) === 1 || (s.td["bulk-1"] || 0) === 1),
    actiso: !!s.act.iso, actintr: !!s.act.intr, actbulk: !!s.act.bulk, actctrl: !!s.act.ctrl,
    soiso: s.serving === "iso", sointr: s.serving === "intr",
    nrdy: !!s.nrdy, erdy: !!s.erdy, cont: !!s.cont,
  };
  for (const [key, on] of Object.entries(lamps)) {
    const el = $('[data-lamp="' + key + '"]');
    if (el && dispCache["L" + key] !== on) { el.classList.toggle("on", !!on); dispCache["L" + key] = on; }
  }
  // IST 括弧点亮
  const ib = $(".istbar");
  if (ib && dispCache.ist !== !!s.istLit) { ib.classList.toggle("lit", !!s.istLit); dispCache.ist = !!s.istLit; }
  // 注记牌
  const errEl = $('[data-note="err"]');
  if (errEl && dispCache.errnote !== s.err) { errEl.style.display = s.err ? "" : "none"; dispCache.errnote = s.err; }
  const defEl = $('[data-note="def"]');
  if (defEl && dispCache.defnote !== s.def) { defEl.style.display = s.def ? "" : "none"; dispCache.defnote = s.def; }
  // 设备三窗值
  const dw = (part, txt, tone) => {
    const el = $('[data-part="' + part + '-v"]');
    if (!el) return;
    const html = geo.vtext((D.devwins[part].x0 + D.devwins[part].x1) / 2, D.boxFaceY + 0.4, 42.2, txt, 4.6, tone, "middle");
    if (dispCache[part] !== txt) { el.innerHTML = html; dispCache[part] = txt; }
  };
  dw("deviso", s.devIso ? "8KB/ESIT" : "—", s.devIso ? "dev" : "lo");
  dw("devintr", s.devIntr ? (s.nrdy ? "NRDY" : "NRDY→ERDY") : "—", s.devIntr ? "dev" : "lo");
  dw("devbulk", s.devBulk ? "DP ×8" : "—", s.devBulk ? "dev" : "lo");
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
      tt2 += `<g transform="${tr}">` + geo.eventTextSvg("Ring Overrun") + `</g>`;
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
    tt2 += `<g transform="translate(${dx.toFixed(2)},${dy.toFixed(2)})">` + geo.eventTextSvg("Ring Overrun") + `</g>`;
  }
  if (dispCache.trayev !== ev) { eventLayer.innerHTML = ev; dispCache.trayev = ev; }
  if (dispCache.tokenTexts !== tt2) { actorTextLayer.innerHTML = tt2; dispCache.tokenTexts = tt2; }
  // 读数
  const rot = s.serving === "bulk" ? "Bulk" : s.serving === "ctrl" ? "Control" : "—";
  const nAct = s.act.iso + s.act.intr + s.act.bulk + s.act.ctrl;
  const text = "步 " + s.step + "/10 · µFrame " + (uf == null ? "—" : uf) + " · 轮转 " + rot + " · Active " + nAct + "/4";
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
window.__fig414 = { step, playTo, pause: () => { touring = false; clearTimeout(idleTimer); }, stateOf: () => ({ step: state.step, serving: state.serving, mf: state.mf, dial: state.dial, act: Object.assign({}, state.act) }), frameOf: () => frame };
// 板块探针兼容别名（xhci_spec_occlusion_probe / ctl_probe 只认 __fig42/__fig43 取帧表达式）
window.__fig42 = window.__fig414;
render(state, 0.016);
})();

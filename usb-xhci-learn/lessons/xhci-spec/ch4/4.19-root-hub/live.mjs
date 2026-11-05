// §4.19 根集线器枢纽台——十一帧步进/巡游（判据见 EVIDENCE.md；帧模型与画面断言同源）
// 窗口.__fig419 为主名；__fig42 为板块探针兼容别名（occlusion/ctl 探针只认 fig42/fig43 API）。
// 可见性门控＝document.hidden（4.10 修法：探针/无头视口外 IO 盲区会让 rAF 永不跑）。
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
// port: 0 Disconnected/1 Disabled/2 Reset/3 Enabled·U0/4 U3/5 Resume/6 Powered-off
// bits: 已置变化位对象；plug: 1=未插（车停设备侧）/0=已插；wcard: 0 隐/1 在位/2 已执行
// evSub: 最新入匣事件卡文案；devSt/devSub 设备窗；speed: Port Speed 读数
const F = (o) => Object.assign({ step: 0, port: 0, bits: {}, events: 0, evSub: null,
  plug: 1, wcard: 0, devSt: "未上电", devSub: "无 VBus", speed: "—", board: null, anchor: 0, note: [] }, o);
const FRAMES = [
  F({}),                                                                                                          // F0 全景（Disconnected 等待）
  F({ step: 1, port: 1, bits: { csc: 1 }, events: 1, evSub: "CSC·插入", plug: 0, devSt: "已上电", devSub: "VBus 在",
      note: ["插入三步（p294）", "CCS='1' → CSC='1'", "→ PSCEG 0→1 发事件"] }),                                       // F1 插入
  F({ step: 2, port: 1, events: 1, plug: 0, wcard: 1, devSt: "已上电", devSub: "VBus 在",
      note: ["驱动读清（p291）", "Port ID=1 · CSC=1", "写 '1' 清位 → 再开闸"] }),              // F2 驱动读清
  F({ step: 3, port: 3, events: 2, evSub: "PRC·复位完成", plug: 0, wcard: 2, devSt: "已上电", devSub: "复位后 Default", speed: "FS",
      note: ["复位完成自动迁入", "Enabled：PED/PRC='1'", "Speed=FS（p274/298）"] }),                          // F3 端口复位
  F({ step: 4, port: 3, events: 2, plug: 0, wcard: 2, devSt: "已上电", devSub: "复位后 Default", speed: "FS", board: "usb3",
      note: ["USB3：attach 训练成功", "自动 Enabled·U0", "（Polling→U0 p294）"] }),                        // F4 USB3 对照
  F({ step: 5, port: 4, events: 3, evSub: "PLC·挂起", plug: 0, wcard: 2, devSt: "挂起中", devSub: "链路安静", speed: "FS",
      note: ["挂起＝Wr(PLS=U3+LWS)", "PLS 迁移置 PLC", "（p275–276）"] }),                                           // F5 挂起（终态已读清）
  F({ step: 6, port: 5, events: 4, evSub: "PLC·Resume", plug: 0, wcard: 2, devSt: "已上电", devSub: "发 resume 信令", speed: "FS",
      note: ["设备唤醒 U3→Resume", "置 PLC（p277）", "回 U0 写法归 §4.15"] }),                            // F6 设备唤醒
  F({ step: 7, port: 0, events: 5, evSub: "CSC·拔出", plug: 1, wcard: 2, devSt: "未上电", devSub: "无 VBus", speed: "FS",
      note: ["拔出（p274）", "CCS='0' · CSC='1'", "读出 CSC=1＋CCS=0"] }),                                // F7 拔出
  F({ step: 8, port: 0, events: 6, evSub: "OCC·过流", plug: 1, wcard: 2, devSt: "未上电", devSub: "无 VBus", speed: "FS",
      note: ["过流或 PP='0'（p274）", "任一态→Powered-off", "Wr(PP='1')→Disconnected"] }),    // F8 过流对照
  F({ step: 9, port: 0, events: 6, plug: 1, wcard: 2, devSt: "未上电", devSub: "无 VBus", speed: "FS", board: "bits",
      note: ["七位（p291）：CSC/PEC", "/WRC/OCC/PRC/PLC/CEC", "写 '1' 清（p291/293）"] }),                    // F9 七位纪律
  F({ step: 10, port: 0, events: 6, plug: 1, wcard: 2, devSt: "未上电", devSub: "无 VBus", speed: "FS", anchor: 1,
      note: ["读清才再开闸", "变化位＝逐口事件闸门", "（p292–293）"] }),                                              // F10 读数巡回
];
const DUR = [3000, 5400, 4800, 7200, 4200, 5400, 5400, 6000, 7200, 4200, 3000];
const NAMES = ["全景", "插入（attach）", "驱动读清", "端口复位", "USB3 对照", "挂起（U3）", "设备唤醒", "拔出（detach）", "过流对照", "七位纪律", "读数巡回"];
const BIT_KEYS = ["csc", "pec", "wrc", "occ", "prc", "plc", "cec"];
const SIG = [[1, 0, 0, 0], [1, 1, 0, 0], [1, 1, 0, 1], [1, 1, 1, 0], [1, 1, 1, 0], [1, 1, 1, 0], [0, 0, 0, 0]];

// ---- 折线行走（票据沿写入线/事件管/链路） ----
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
const PATHS = { write: pathInfo(D.wirePaths.write), ev: pathInfo(D.wirePaths.ev), link: pathInfo(D.wirePaths.link) };
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
    step: f.step, port: f.port, bits: { ...f.bits }, events: f.events, evSub: f.evSub,
    plug: f.plug, wcard: f.wcard, wcardL: null, devSt: f.devSt, devSub: f.devSub, speed: f.speed,
    board: f.board, anchor: f.anchor, note: f.note.slice(),
    drumPos: f.port, plugX: f.plug ? D.carr.xD : D.carr.xA,
    leverT: 0, leverTT: 0, wakeT: 0, wakeTT: 0,
    sent: BIT_KEYS.some((b) => f.bits[b]),   // 帧终态：位仍置＝本波事件已出（阻塞中）
  };
}
const applyAll = (s, f) => {
  s.step = f.step; s.port = f.port; s.bits = { ...f.bits }; s.events = f.events; s.evSub = f.evSub;
  s.plug = f.plug; s.wcard = f.wcard; s.devSt = f.devSt; s.devSub = f.devSub; s.speed = f.speed;
  s.board = f.board; s.anchor = f.anchor; s.note = f.note.slice();
  s.drumPos = f.port;
};
const anyBit = (s) => BIT_KEYS.some((b) => s.bits[b]);

// ---------- 帧间演出 ----------
function cuesFor(from, to) {
  const cues = [];
  const add = (at, apply) => cues.push({ at, apply });
  add(0.08, (s) => { s.note = to.note.slice(); });
  if (to.step < from.step || to.step - from.step > 1) {  // 回退/复位/跳帧：一次性归到目标终态
    add(0.15, (s) => { applyAll(s, to); s.plugX = to.plug ? D.carr.xD : D.carr.xA; s.wcardL = null; });
    return cues;
  }
  const evPush = (s, sub) => { if (!s.sent) { s.sent = true; tokens.push({ kind: "ev", sub, path: "ev", rev: false, t: 0 }); } };
  switch (to.step) {
    case 1: { // 插入：滑车走链路 → CCS=1 → Disabled(Polling)+CSC → PSCEG 0→1 → 事件卡
      add(0.14, (s) => { s.plug = 0; });
      add(0.34, (s) => { s.devSt = "已上电"; s.devSub = "VBus 在"; s.port = 1; s.bits = { csc: 1 }; });
      add(0.58, (s) => { evPush(s, "CSC·插入"); s.events = 1; s.evSub = "CSC·插入"; });
      break;
    }
    case 2: { // 读清：读 PORTSC → 写 '1' 清位 → PSCEG 归 0
      add(0.15, (s) => { s.wcard = 1; s.wcardL = "读 PORTSC|CSC=1 · CCS=1"; });
      add(0.42, (s) => { s.leverTT = 1; });
      add(0.52, (s) => { s.leverTT = 0; tokens.push({ kind: "clr", path: "write", rev: false, t: 0 }); });
      add(0.68, (s) => { s.bits = {}; s.wcard = 2; s.wcardL = "写 '1'|已清 CSC"; s.sent = false; });
      break;
    }
    case 3: { // 复位：Wr(PR='1') → Reset → 复位信令 → 自动 Enabled·U0 + PRC + Speed → 事件卡 → 读清
      add(0.1, (s) => { s.wcard = 1; s.wcardL = "Wr PR='1'|端口复位"; });
      add(0.2, (s) => { s.leverTT = 1; });
      add(0.28, (s) => { s.leverTT = 0; tokens.push({ kind: "wrPR", path: "write", rev: false, t: 0 }); });
      add(0.38, (s) => { s.port = 2; s.wcard = 2; tokens.push({ kind: "reset", path: "link", rev: false, t: 0 }); });
      add(0.58, (s) => { s.port = 3; s.bits = { prc: 1 }; s.speed = "FS"; s.devSub = "复位后 Default"; });
      add(0.72, (s) => { evPush(s, "PRC·复位完成"); s.events = 2; s.evSub = "PRC·复位完成"; });
      add(0.88, (s) => { s.bits = {}; s.wcardL = "写 '1'|已清 PRC"; s.sent = false; });
      break;
    }
    case 4: break;  // USB3 对照：注记板点亮
    case 5: { // 挂起：Wr(PLS=U3+LWS) → U3 + PLC → 事件卡 → 读清
      add(0.1, (s) => { s.wcard = 1; s.wcardL = "Wr PLS=U3|+LWS='1'"; });
      add(0.2, (s) => { s.leverTT = 1; });
      add(0.28, (s) => { s.leverTT = 0; tokens.push({ kind: "wrU3", path: "write", rev: false, t: 0 }); });
      add(0.52, (s) => { s.port = 4; s.devSt = "挂起中"; s.devSub = "链路安静"; s.bits = { plc: 1 }; });
      add(0.68, (s) => { evPush(s, "PLC·挂起"); s.events = 3; s.evSub = "PLC·挂起"; });
      add(0.86, (s) => { s.bits = {}; s.wcardL = "写 '1'|已清 PLC"; s.sent = false; });
      break;
    }
    case 6: { // 设备唤醒：唤醒钮 → resume 信令 → Resume + PLC → 事件卡 → 读清
      add(0.12, (s) => { s.wakeTT = 1; s.devSub = "发 resume 信令"; });
      add(0.22, (s) => { s.wakeTT = 0; tokens.push({ kind: "resume", path: "link", rev: true, t: 0 }); });
      add(0.5, (s) => { s.port = 5; s.devSt = "已上电"; s.bits = { plc: 1 }; });
      add(0.66, (s) => { evPush(s, "PLC·Resume"); s.events = 4; s.evSub = "PLC·Resume"; });
      add(0.84, (s) => { s.bits = {}; s.wcardL = "写 '1'|已清 PLC"; s.sent = false; });
      break;
    }
    case 7: { // 拔出：滑车拔出 → CCS=0 → Disconnected + CSC → 事件卡 → 读清
      add(0.12, (s) => { s.plug = 1; });
      add(0.4, (s) => { s.port = 0; s.bits = { csc: 1 }; s.devSt = "未上电"; s.devSub = "无 VBus"; });
      add(0.58, (s) => { evPush(s, "CSC·拔出"); s.events = 5; s.evSub = "CSC·拔出"; });
      add(0.76, (s) => { s.bits = {}; s.wcardL = "写 '1'|已清 CSC"; s.sent = false; });
      break;
    }
    case 8: { // 过流：OCC 置位 → Powered-off → 事件卡 → 读清 → Wr(PP='1') 回 Disconnected
      add(0.14, (s) => { s.port = 6; s.bits = { occ: 1 }; });
      add(0.34, (s) => { evPush(s, "OCC·过流"); s.events = 6; s.evSub = "OCC·过流"; });
      add(0.5, (s) => { s.bits = {}; s.wcard = 1; s.wcardL = "写 '1'|已清 OCC"; s.sent = false; });
      add(0.64, (s) => { s.leverTT = 1; });
      add(0.72, (s) => { s.leverTT = 0; tokens.push({ kind: "wrPP", path: "write", rev: false, t: 0 }); s.wcard = 2; s.wcardL = "Wr PP='1'|重新上电"; });
      add(0.9, (s) => { s.port = 0; });
      break;
    }
    case 9: break;  // 七位纪律：注记板点亮
    case 10: break; // 读数巡回：锚牌点亮
    case 0: { // 回全景（巡游环绕）
      add(0.4, (s) => { applyAll(s, FRAMES[0]); s.plugX = D.carr.xD; s.drumPos = 0; s.wcardL = null; s.sent = false; });
      break;
    }
  }
  return cues;
}

// ---------- 渲染 ----------
const tokenLayer = $('[data-part="actors-tokens"]');
const eventLayer = $('[data-part="actors-events"]');
const dispCache = {};
function render(s, dt) {
  const ease = 1 - Math.exp(-(dt || 0.016) / 0.12);
  const win = (sel, html) => { const el = $(sel); if (el && el.innerHTML !== html) el.innerHTML = html; };
  // 连续趋近：状态鼓/滑车/拉杆/钮
  s.drumPos += (s.port - s.drumPos) * (1 - Math.exp(-(dt || 0.016) / 0.18));
  const plugT = s.plug ? D.carr.xD : D.carr.xA;
  s.plugX += (plugT - s.plugX) * (1 - Math.exp(-(dt || 0.016) / 0.3));
  win('[data-part="drum"]', geo.drumSvg(Math.round(s.drumPos * 100) / 100));
  win('[data-part="carr"]', geo.carriageSvg(Math.round(s.plugX * 10) / 10));
  const bitsArr = BIT_KEYS.map((b) => !!s.bits[b]);
  const psceg = anyBit(s) ? 1 : 0;
  win('[data-part="psceg"]', geo.pscegSvg(bitsArr, psceg, s.sent));
  const bitsTxt = bitsArr.filter(Boolean).length ? BIT_KEYS.filter((b) => s.bits[b]).join(",").toUpperCase() : "—";
  win('[data-part="portsc"]', geo.portscSvg(D.pls[s.port], SIG[s.port], s.speed, bitsTxt));
  win('[data-part="devwin"]', geo.devWinSvg(s.devSt, s.devSub));
  s.leverT += (s.leverTT - s.leverT) * ease;
  win('[data-part="lever"]', geo.leverSvg(Math.round(s.leverT * 100) / 100));
  s.wakeT += (s.wakeTT - s.wakeT) * ease;
  win('[data-part="wakebtn"]', geo.wakeBtnSvg(Math.max(0, Math.round(s.wakeT * 100) / 100)));
  // 注记窗（display + 内容）
  const noteEl = $('[data-part="note"]');
  if (noteEl) {
    const show = s.note.length ? "" : "none";
    if (dispCache.noteD !== show) { noteEl.style.display = show; dispCache.noteD = show; }
    const html = s.note.length ? geo.noteWinSvg(s.note) : "";
    if (dispCache.noteH !== html) { noteEl.innerHTML = html; dispCache.noteH = html; }
  }
  // 写入卡
  const cmdEl = $('[data-part="wcard"]');
  if (cmdEl) {
    const label = s.wcardL || (s.wcard === 2 ? "写入卡|已执行" : null);
    if (s.wcard && label) {
      const [l1, l2] = label.split("|");
      const key = s.wcard + "|" + label;
      if (dispCache.wcard !== key) { cmdEl.style.display = ""; cmdEl.innerHTML = geo.wcardSvg(l1, l2, s.wcard); dispCache.wcard = key; }
    } else if (dispCache.wcard !== "none") { cmdEl.style.display = "none"; dispCache.wcard = "none"; }
  }
  // 灯（类切换）：七变化位 + HCH——键必须覆盖全量（位清零后键消失也要走到 toggle off）
  const lamps = {};
  for (const b of BIT_KEYS) lamps[b] = !!s.bits[b];
  lamps.hch = 1;
  for (const [key, on] of Object.entries(lamps)) {
    const el = $('[data-lamp="' + key + '"]');
    if (el && dispCache["L" + key] !== on) { el.classList.toggle("on", !!on); dispCache["L" + key] = on; }
  }
  const blinkEl = $('[data-lamp="plc"]');
  if (blinkEl && dispCache.plcBlink !== anyBit(s)) { blinkEl.classList.toggle("blink", anyBit(s)); dispCache.plcBlink = anyBit(s); }
  // 注记板/锚牌高亮
  for (const key of ["usb3", "bits"]) {
    const el = $('[data-name="board.' + key + '"]');
    if (el) {
      const lit = s.board === key ? 1 : 0;
      if (dispCache["B" + key] !== lit) { el.classList.toggle("lit", !!lit); dispCache["B" + key] = lit; }
    }
  }
  {
    const el = $('[data-name="hub.anchor"]');
    if (el) {
      const lit = s.anchor ? 1 : 0;
      if (dispCache.anchorLit !== lit) { el.classList.toggle("lit", !!lit); dispCache.anchorLit = lit; }
    }
  }
  // 票据行走
  let tk = "";
  for (const t of tokens) {
    if (t.kind === "ev") continue;
    const info = PATHS[t.path];
    const tt = t.rev ? 1 - t.t : t.t;
    const p = alongPath(info, tt);
    const [dx, dy] = dAt(p);
    tk += `<g transform="translate(${dx.toFixed(2)},${dy.toFixed(2)})">` + geo.tokenSvg(t.kind) + `</g>`;
  }
  if (dispCache.tokens !== tk) { tokenLayer.innerHTML = tk; dispCache.tokens = tk; }
  // 事件管上的飞行事件卡 + 事件匣内最新回执卡（匣内只摆最新一张，计次在读数行）
  let evFly = "";
  for (const t of tokens) {
    if (t.kind !== "ev") continue;
    const p = alongPath(PATHS.ev, t.t);
    const [dx, dy] = dAt(p);
    evFly += `<g transform="translate(${dx.toFixed(2)},${dy.toFixed(2)})">` + geo.eventCardSvg(t.sub) + `</g>`;
  }
  let ev = "";
  if (s.events > 0 && s.evSub) {
    const [dx, dy] = dAt([D.tray.x, D.tray.y, D.tray.z]);
    ev += `<g transform="translate(${dx.toFixed(2)},${dy.toFixed(2)})">` + geo.eventCardSvg(s.evSub) + `</g>`;
  }
  const evAll = ev + evFly;
  if (dispCache.trayev !== evAll) { eventLayer.innerHTML = evAll; dispCache.trayev = evAll; }
  // 读数
  const nBits = bitsArr.filter(Boolean).length;
  const text = "步 " + s.step + "/10 · 端口 " + D.states[s.port] + " · 变化位 " + nBits + "/7 · 事件 " + s.events;
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", "第 " + (frame + 1) + "/11 帧：" + NAMES[frame] + "。" + text);
}

function playTo(i) {
  const from = { step: state.step };
  frame = Math.max(0, Math.min(FRAMES.length - 1, i));
  const to = FRAMES[frame];
  tokens = [];
  tourTimer = 0;
  anim = { t0: performance.now(), dur: DUR[frame], cues: cuesFor(from, to) };
  // cuesFor 闭包内 evPush 依赖进入帧前的 sent 状态：回退/跳帧时先清 sent
  if (to.step < from.step || to.step - from.step > 1) state.sent = false;
  statusEl.textContent = "第 " + (frame + 1) + "/11 帧 · " + NAMES[frame];
  run();  // 自启（4.2 裁处修复先例：外部 playTo 落在 tick 停止窗时补拉起）
}

// ---------- 主循环（可见性＝document.hidden；IO 仅作回视口唤醒） ----------
let last = 0, raf = 0, touring = !still.matches, idleTimer = 0, tourTimer = 0;
const TOUR_DWELL = 5.5;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (anim) {
    const t = Math.min(1, (now - anim.t0) / anim.dur);
    anim.cues.forEach((cue) => { if (!cue.fired && t >= cue.at) { cue.fired = true; cue.apply(state); } });
    if (t >= 1) { state = snapshot(frame); anim = null; }
  }
  for (const tk of tokens) tk.t = Math.min(1, tk.t + dt / 1.15);
  tokens = tokens.filter((tk) => tk.t < 1);
  if (touring && !anim) {
    tourTimer += dt;
    if (tourTimer > TOUR_DWELL) { tourTimer = 0; playTo((frame + 1) % FRAMES.length); }
  }
  render(state, dt);
  raf = !document.hidden && (anim || touring || tokens.length) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!raf && !document.hidden) { last = 0; raf = requestAnimationFrame(tick); } };
function syncTourBtn() {
  const box = stage.closest(".iso-figure");
  const btn = box && box.querySelector('.fig-ctl [data-act="tour"]');
  if (btn) btn.setAttribute("aria-pressed", String(!!touring));
}
const arm = () => { touring = false; clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; tourTimer = 0; syncTourBtn(); run(); }, 3600); syncTourBtn(); run(); };
const step = (dir) => { arm(); playTo(frame + dir); };
new IntersectionObserver((es) => { if (es[es.length - 1].isIntersecting) run(); }, { rootMargin: "120px 0px" }).observe(stage);
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
window.__fig419 = {
  step, playTo, pause: () => { touring = false; clearTimeout(idleTimer); },
  stateOf: () => ({ step: state.step, port: D.states[state.port], bits: BIT_KEYS.filter((b) => state.bits[b]), events: state.events, dev: state.devSt, plugAttached: !state.plug, board: state.board }),
  frameOf: () => frame,
};
// 板块探针兼容别名（xhci_spec_occlusion_probe / ctl_probe 只认 __fig42/__fig43 取帧表达式）
window.__fig42 = window.__fig419;
render(state, 0.016);
})();

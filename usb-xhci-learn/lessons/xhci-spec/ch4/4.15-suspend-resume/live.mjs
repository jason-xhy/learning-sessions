// §4.15 端口电源闸台——十二帧步进/巡游（判据见 EVIDENCE.md；帧模型与画面断言同源）
// 窗口.__fig415 为主名；__fig42 为板块探针兼容别名（occlusion/ctl 探针只认 fig42/fig43 API）。
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
// dial: 写入 PLS 值 0/3/15；port: 端口态索引 0=U0 3=U3 4=U3Exit 5=Resume；
// ep: 1 Running / 0 Stopped；cmd: 0 隐 / 1 在位 / 2 已停端点；board: 高亮注记板
const F = (o) => Object.assign({ step: 0, dial: 0, port: 0, ep: 1, cmd: 0, events: 0,
  plc: 0, psceg: 0, timer: -1, board: null, linkOn: 1, devSt: "U0", note: [] }, o);
const FRAMES = [
  F({}),                                                                                                                    // F0 全景（U0 跑包）
  F({ step: 1, cmd: 1, ep: 0, note: ["Stop Endpoint SP='1' 停端点", "恢复后须写端点门铃重启（p254）"] }),                     // F1 停端点
  F({ step: 2, dial: 3, cmd: 2, ep: 0, note: ["写入≠读数：suspend 信令完成前", "PLS 读数不变（≤10 ms，p253–254）"] }),          // F2 写挂起
  F({ step: 3, dial: 3, cmd: 2, ep: 0, port: 3, events: 1, plc: 1, psceg: 1, linkOn: 0, devSt: "U3",
      note: ["U3C：PLS→U3 即置 PLC 出事件", "（U3E='1'，免轮询免定时器 p254）"] }),                                            // F3 评估与信令→U3
  F({ step: 4, dial: 3, cmd: 2, ep: 0, port: 3, events: 1, plc: 1, psceg: 1, linkOn: 0, devSt: "U3",
      note: ["xHC 从不自动把 Resume/U3", "转回 U0（p253 Note）"] }),                                                          // F4 链路安静
  F({ step: 5, dial: 3, cmd: 2, ep: 0, port: 5, events: 2, plc: 1, psceg: 1, linkOn: 0, devSt: "U3",
      note: ["xHC 未获软件指示不回应 LFPS", "——握手悬着（p255）"] }),                                                          // F5 设备发起
  F({ step: 6, dial: 0, cmd: 2, ep: 0, port: 5, events: 2, plc: 0, psceg: 0, linkOn: 0, devSt: "U3",
      note: ["USB3：写 PLS='0'＝指示 xHC", "发 LFPS 完成握手（p255）"] }),                                                      // F6 软件指示
  F({ step: 7, dial: 0, cmd: 2, ep: 0, port: 0, events: 3, plc: 1, psceg: 1, linkOn: 1, devSt: "U0",
      note: ["R/S='1' 才准 Resume→U0", "——保 ITP 与立即收包（p255）"] }),                                                       // F7 恢复完成
  F({ step: 8, dial: 0, cmd: 2, ep: 1, events: 3, plc: 0, psceg: 0, linkOn: 1, devSt: "U0",
      note: ["SP 停的端点不自启——", "写端点门铃逐个重启（p254）"] }),                                                           // F8 门铃重启
  F({ step: 9, dial: 0, cmd: 2, ep: 1, events: 3, plc: 0, psceg: 0, linkOn: 1, devSt: "U0", timer: 1, board: "usb2",
      note: ["USB2：xHC 1 ms（TURSM）内反射到", "全部 Enabled 端口（p255–256）"] }),                                             // F9 USB2 对照
  F({ step: 10, dial: 0, cmd: 2, ep: 1, events: 4, plc: 1, psceg: 1, linkOn: 1, devSt: "U0",
      note: ["USB3 主机发起：写 '0'→U3Exit→LFPS；", "U1/U2 写 '0' 亦转 U0（p255–256）"] }),                                      // F10 主机发起
  F({ step: 11, dial: 0, cmd: 2, ep: 1, events: 4, plc: 0, psceg: 0, linkOn: 1, devSt: "U0", board: "bus",
      note: ["整机挂起：全端口选择性挂起→R/S='0'", "→PCI PM 降态；唤醒后 R/S='1'（p252）"] }),                                    // F11 读数巡回
];
const DUR = [3000, 4200, 4800, 7200, 4200, 6000, 5400, 6000, 3600, 5400, 7200, 3000];
const NAMES = ["全景", "停端点（Stop Endpoint·SP='1'）", "写挂起（PLS='3'+LWS）", "评估与 suspend 信令", "链路安静（U3）", "设备发起唤醒（LFPS）", "软件指示（写 PLS='0'）", "恢复完成（U0）", "门铃重启端点", "USB2 对照（TDRSMDN）", "主机发起恢复", "读数巡回"];
const GATE_ANGLE = { 0: D.gate.aU0, 3: D.gate.aU3, 4: 20, 5: D.gate.aRe };

// ---- 折线行走（票据沿链路/写入线/事件管） ----
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
let tokens = [];       // {kind, sub?, path, rev, t}
function snapshot(i) {
  const f = FRAMES[i];
  return {
    step: f.step, dial: f.dial, port: f.port, ep: f.ep, cmd: f.cmd, events: f.events,
    plc: f.plc, psceg: f.psceg, timer: f.timer, board: f.board, linkOn: f.linkOn,
    devSt: f.devSt, note: f.note.slice(),
    dialPos: ["0", "3", "15"].indexOf(String(f.dial)),
    drumPos: f.port, gateA: GATE_ANGLE[f.port] ?? D.gate.aU0,
    leverT: 0, leverTT: 0, bellT: 0, bellTT: 0, wakeT: 0, wakeTT: 0, evalM: 0,
  };
}
const applyAll = (s, f) => {
  s.step = f.step; s.dial = f.dial; s.port = f.port; s.ep = f.ep; s.cmd = f.cmd; s.events = f.events;
  s.plc = f.plc; s.psceg = f.psceg; s.timer = f.timer; s.board = f.board; s.linkOn = f.linkOn;
  s.devSt = f.devSt; s.note = f.note.slice();
  s.dialPos = ["0", "3", "15"].indexOf(String(f.dial));
};

// ---------- 帧间演出 ----------
function cuesFor(from, to) {
  const cues = [];
  const add = (at, apply) => cues.push({ at, apply });
  add(0.08, (s) => { s.note = to.note.slice(); });
  if (to.step < from.step || to.step - from.step > 1) {  // 回退/复位/跳帧：一次性归到目标终态
    add(0.15, (s) => { applyAll(s, to); s.drumPos = to.port; s.gateA = GATE_ANGLE[to.port] ?? D.gate.aU0; });
    return cues;
  }
  switch (to.step) {
    case 1: { // 停端点：命令卡入槽 → 端点 Stopped
      add(0.15, (s) => { s.cmd = 1; });
      add(0.5, (s) => { s.cmd = 2; s.ep = 0; });
      break;
    }
    case 2: { // 写挂起：计数轮→3 + LWS 压杆 + 写入票走线（状态鼓不动）
      add(0.12, (s) => { s.dial = 3; });
      add(0.3, (s) => { s.leverTT = 1; });
      add(0.4, (s) => { s.leverTT = 0; tokens.push({ kind: "write3", path: "write", rev: false, t: 0 }); });
      break;
    }
    case 3: { // 评估节拍 → suspend 信令 → 设备暗 → U3 落闸 → PLC/PSCEG → 事件卡
      add(0.1, (s) => { s.evalM = 0.3; });
      add(0.26, (s) => { s.evalM = 0.75; tokens.push({ kind: "suspend", path: "link", rev: false, t: 0 }); });
      add(0.48, (s) => { s.evalM = 1; });
      add(0.6, (s) => { s.devSt = "U3"; s.linkOn = 0; });
      add(0.7, (s) => { s.port = 3; });
      add(0.8, (s) => { s.plc = 1; s.psceg = 1; tokens.push({ kind: "ev", sub: "PLS→U3", path: "ev", rev: false, t: 0 }); });
      break;
    }
    case 4: break;  // 链路安静：仅注记切换
    case 5: { // 设备发起：唤醒钮 → LFPS 票 → Resume(15) → 事件卡
      add(0.12, (s) => { s.wakeTT = 1; });
      add(0.22, (s) => { s.wakeTT = 0; tokens.push({ kind: "lfps", path: "link", rev: true, t: 0 }); });
      add(0.52, (s) => { s.port = 5; });
      add(0.62, (s) => { s.plc = 1; s.psceg = 1; tokens.push({ kind: "ev", sub: "PLS=15 Resume", path: "ev", rev: false, t: 0 }); });
      break;
    }
    case 6: { // 软件定位与指示：读事件 Port ID→写 PLS='0'+LWS → xHC 应答 LFPS
      add(0.15, (s) => { s.plc = 0; s.psceg = 0; });
      add(0.3, (s) => { s.dial = 0; s.leverTT = 1; });
      add(0.4, (s) => { s.leverTT = 0; tokens.push({ kind: "write0", path: "write", rev: false, t: 0 }); });
      add(0.62, (s) => { tokens.push({ kind: "lfpsack", path: "link", rev: false, t: 0 }); });
      break;
    }
    case 7: { // 恢复完成：LFPS 应答到设备 → U0 抬闸 → 跑包恢复 → 事件卡
      add(0.3, (s) => { s.devSt = "U0"; s.linkOn = 1; });
      add(0.48, (s) => { s.port = 0; });
      add(0.62, (s) => { s.plc = 1; s.psceg = 1; tokens.push({ kind: "ev", sub: "U3→U0", path: "ev", rev: false, t: 0 }); });
      break;
    }
    case 8: { // 门铃重启端点
      add(0.15, (s) => { s.bellTT = 1; });
      add(0.26, (s) => { s.bellTT = 0; tokens.push({ kind: "bell", path: "write", rev: false, t: 0 }); });
      add(0.55, (s) => { s.ep = 1; });
      break;
    }
    case 9: { // USB2 对照：注记板亮 + TDRSMDN 计数轮计满
      add(0.14, (s) => { s.timer = 0.18; });
      add(0.34, (s) => { s.timer = 0.52; });
      add(0.56, (s) => { s.timer = 0.82; });
      add(0.74, (s) => { s.timer = 1; });
      break;
    }
    case 10: { // 主机发起：快放再挂起 → 写 '0' → U3Exit → xHC 立即发 LFPS → U0 → 事件卡
      add(0.1, (s) => { s.dial = 3; s.leverTT = 1; });
      add(0.18, (s) => { s.leverTT = 0; tokens.push({ kind: "write3", path: "write", rev: false, t: 0 }); });
      add(0.3, (s) => { s.port = 3; s.devSt = "U3"; s.linkOn = 0; });
      add(0.46, (s) => { s.dial = 0; s.leverTT = 1; });
      add(0.54, (s) => { s.leverTT = 0; tokens.push({ kind: "write0", path: "write", rev: false, t: 0 }); });
      add(0.62, (s) => { s.port = 4; tokens.push({ kind: "lfps", path: "link", rev: false, t: 0 }); });
      add(0.8, (s) => { s.port = 0; s.devSt = "U0"; s.linkOn = 1; });
      add(0.9, (s) => { s.plc = 1; s.psceg = 1; tokens.push({ kind: "ev", sub: "U3→U0", path: "ev", rev: false, t: 0 }); });
      break;
    }
    case 11: { // 读数巡回：整机次序板亮
      add(0.2, (s) => { s.plc = 0; s.psceg = 0; });
      break;
    }
    case 0: { // 回全景（巡游环绕）
      add(0.4, (s) => { applyAll(s, FRAMES[0]); s.drumPos = 0; s.gateA = D.gate.aU0; });
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
  // 连续趋近：计数轮/状态鼓/闸角/拉杆/钮/评估标记
  s.dialPos += ((["0", "3", "15"].indexOf(String(s.dial))) - s.dialPos) * ease;
  s.drumPos += (s.port - s.drumPos) * (1 - Math.exp(-(dt || 0.016) / 0.18));
  const gateT = GATE_ANGLE[s.port] ?? D.gate.aU0;
  s.gateA += (gateT - s.gateA) * (1 - Math.exp(-(dt || 0.016) / 0.16));
  win('[data-part="drum"]', geo.drumSvg(Math.round(s.drumPos * 100) / 100));
  win('[data-part="dial"]', geo.dialSvg(Math.round(s.dialPos * 100) / 100));
  win('[data-part="blade"]', geo.bladeSvg(Math.round(s.gateA * 10) / 10));
  win('[data-part="psceg"]', geo.pscegSvg(s.psceg));
  win('[data-part="epwin"]', geo.epWinSvg(s.ep));
  win('[data-part="evalw"]', geo.evalSvg(Math.round(s.evalM * 100) / 100));
  win('[data-part="timer"]', geo.timerSvg(s.timer < 0 ? -1 : Math.round(s.timer * 100) / 100));
  win('[data-part="devlink"]', geo.devLinkSvg(s.devSt));
  s.leverT += (s.leverTT - s.leverT) * ease;
  win('[data-part="lever"]', geo.leverSvg(Math.round(s.leverT * 100) / 100));
  s.bellT += (s.bellTT - s.bellT) * ease;
  win('[data-part="bellbtn"]', geo.bellBtnSvg(Math.max(0, Math.round(s.bellT * 100) / 100)));
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
  // 命令卡
  const cmdEl = $('[data-part="cmd"]');
  if (cmdEl) {
    const st = s.cmd;
    if (dispCache.cmd !== st) { cmdEl.style.display = st ? "" : "none"; cmdEl.innerHTML = geo.cmdCardSvg(st); dispCache.cmd = st; }
  }
  // 灯（类切换）
  const lamps = { ped: 1, plc: s.plc, rs: 1 };
  for (const [key, on] of Object.entries(lamps)) {
    const el = $('[data-lamp="' + key + '"]');
    if (el && dispCache["L" + key] !== on) { el.classList.toggle("on", !!on); dispCache["L" + key] = on; }
  }
  const plcEl = $('[data-lamp="plc"]');
  if (plcEl && dispCache.plcBlink !== s.step) {
    plcEl.classList.toggle("blink", s.step === 3 || s.step === 5 || s.step === 7 || s.step === 10);
    dispCache.plcBlink = s.step;
  }
  // 注记板高亮
  for (const key of ["usb2", "bus"]) {
    const el = $('[data-name="board.' + key + '"]');
    if (el) {
      const lit = s.board === key ? 1 : 0;
      if (dispCache["B" + key] !== lit) { el.classList.toggle("lit", !!lit); dispCache["B" + key] = lit; }
    }
  }
  // 票据行走
  let tk = "";
  for (const t of tokens) {
    const info = PATHS[t.path];
    const tt = t.rev ? 1 - t.t : t.t;
    const p = alongPath(info, tt);
    const [dx, dy] = dAt(p);
    tk += `<g transform="translate(${dx.toFixed(2)},${dy.toFixed(2)})">` + (t.kind === "ev" ? geo.eventCardSvg(t.sub) : geo.tokenSvg(t.kind)) + `</g>`;
  }
  if (dispCache.tokens !== tk) { tokenLayer.innerHTML = tk; dispCache.tokens = tk; }
  // 事件匣内的回执卡
  let ev = "";
  const evSubs = ["PLS→U3", "PLS=15 Resume", "U3→U0", "U3→U0"];
  if (s.events > 0) {   // 匣内只摆最新一张（计次在读数行），避免卡叠卡遮字
    const i = Math.min(s.events, 4) - 1;
    const [dx, dy] = dAt([-160, -51, 42.2]);
    ev += `<g transform="translate(${dx.toFixed(2)},${dy.toFixed(2)})">` + geo.eventCardSvg(evSubs[i]) + `</g>`;
  }
  if (dispCache.trayev !== ev) { eventLayer.innerHTML = ev; dispCache.trayev = ev; }
  // 读数
  const portTxt = D.states[s.port];
  const text = "步 " + s.step + "/11 · 写入 PLS " + s.dial + " · 端口 " + portTxt + " · 端点 " + (s.ep ? "Running" : "Stopped");
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", "第 " + (frame + 1) + "/12 帧：" + NAMES[frame] + "。" + text);
}

function playTo(i) {
  const from = { step: state.step };
  frame = Math.max(0, Math.min(FRAMES.length - 1, i));
  const to = FRAMES[frame];
  tokens = [];
  tourTimer = 0;
  anim = { t0: performance.now(), dur: DUR[frame], cues: cuesFor(from, to) };
  statusEl.textContent = "第 " + (frame + 1) + "/12 帧 · " + NAMES[frame];
  run();  // 自启（4.2 裁处修复先例：外部 playTo 落在 tick 停止窗时补拉起）
}

// ---------- 主循环（可见性＝document.hidden；IO 仅作回视口唤醒） ----------
let last = 0, raf = 0, touring = !still.matches, idleTimer = 0, tourTimer = 0, spawnTimer = 0;
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
  // U0 跑包：链路活跃时周期发数据包票据（reduced-motion 不发）
  if (!still.matches && anim && state.linkOn && !tokens.some((tk) => tk.path === "link")) {
    spawnTimer += dt;
    if (spawnTimer > 1.15) { spawnTimer = 0; tokens.push({ kind: "data", path: "link", rev: (frame * 7) % 2 === 0, t: 0 }); }
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
window.__fig415 = { step, playTo, pause: () => { touring = false; clearTimeout(idleTimer); }, stateOf: () => ({ step: state.step, dial: state.dial, port: D.states[state.port], ep: state.ep, events: state.events }), frameOf: () => frame };
// 板块探针兼容别名（xhci_spec_occlusion_probe / ctl_probe 只认 __fig42/__fig43 取帧表达式）
window.__fig42 = window.__fig415;
render(state, 0.016);
})();

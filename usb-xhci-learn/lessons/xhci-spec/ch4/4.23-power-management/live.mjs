// §4.23 电源井配电台——十二帧步进/巡游（判据见 EVIDENCE.md；帧模型与画面断言同源）
// 窗口.__fig423 为主名；__fig42 为板块探针兼容别名（occlusion/ctl 探针只认 fig42/fig43 API）。
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
// dstate: 0 D0/1 D1/2 D2/3 D3hot/4 D3cold；core: Core 井供电 1/0；rs: R/S Run 1/0
// css/crs: 双旗置位；regs: 寄存器面板有值 1/回默认 0
// img: 三抽屉 [寄存器,内部态,内存镜像] 0 关/1 开；imgTag: 抽屉三行状态注记
// devSt/devSub 设备窗；evSub 最新入匣事件卡；pme: PME 灯
const F = (o) => Object.assign({
  step: 0, dstate: 0, core: 1, rs: 1, regs: 1, css: 0, crs: 0,
  img: [0, 0, 0], imgTags: ["—", "—", "—"],
  devSt: "U0 跑包", devSub: "数据包往返", evSub: null, events: 0, pme: 0,
  wcard: 0, board: null, anchor: 0, note: [],
}, o);
const FRAMES = [
  F({ note: ["两口井：Core 可断 · Aux 常在（p310）", "D0 全运行 · 寄存器面板有值"] }),                                                                    // F0 全景
  F({ step: 1, rs: 0, wcard: 2, devSub: "端点停 · 端口已挂起（§4.15）",
      note: ["停端点→命令环收讫→R/S='0'", "（p312 步 1–3 · p557）"] }),                                                                                  // F1 停端点停机
  F({ step: 2, rs: 0, wcard: 2, img: [1, 0, 0], imgTags: ["十组按序", "—", "—"],
      note: ["存档步 5：按序读十组", "USBCMD…VTIO（p312）"] }),                                                                                          // F2 读寄存器
  F({ step: 3, rs: 0, css: 1, wcard: 2, img: [1, 1, 0], imgTags: ["十组按序", "RCS·槽集", "—"],
      note: ["CSS='1' → 等 SSS→'0'（p312）", "xHC 内部态存入（步 6–7）"] }),                                                                            // F3 Save State
  F({ step: 4, rs: 0, css: 1, wcard: 2, img: [1, 1, 1], imgTags: ["十组按序", "RCS·槽集", "DCBAA·环"],
      note: ["软件保存整棵结构树（p312 Note）", "Restore 须回同一物理地址（p314）"] }),                                                                   // F4 存内存镜像
  F({ step: 5, core: 0, rs: 0, css: 1, dstate: 4, regs: 0, wcard: 2, img: [1, 1, 1], imgTags: ["十组按序", "RCS·槽集", "DCBAA·环"],
      devSt: "挂起/断电", devSub: "下游随 D3 挂起或断电",
      note: ["断 Core 井 → D3hot→D3cold（步 10）", "Core 井寄存器回默认 · Aux 活（p310–311）"] }),                                                       // F5 断 Core 井
  F({ step: 6, core: 0, rs: 0, css: 1, dstate: 4, regs: 0, wcard: 2, img: [1, 1, 1], imgTags: ["十组按序", "RCS·槽集", "DCBAA·环"],
      devSt: "发唤醒信令", devSub: "resume/LFPS → PME#", pme: 1, events: 1, evSub: "PME# 唤醒",
      note: ["xHC 按 PCI PM 规则断言 PME#", "（p557）Aux 井上下文活过断电"] }),                                                                           // F6 唤醒
  F({ step: 7, core: 1, rs: 0, css: 1, dstate: 0, regs: 1, wcard: 2, img: [1, 1, 1], imgTags: ["十组按序", "RCS·槽集", "已回原址"],
      devSt: "等待恢复", devSub: "镜像已回原址",
      note: ["D3cold→D0：内部复位（p558）", "写回 DNCTRL…VTIO 九组（p313）"] }),                                                                          // F7 上电回 D0
  F({ step: 8, rs: 0, css: 1, crs: 1, dstate: 0, core: 1, regs: 1, wcard: 2, img: [1, 1, 1], imgTags: ["已写回", "已恢复", "已回原址"],
      devSt: "等待恢复", devSub: "内部态已恢复",
      note: ["CRS='1' → 等 RSS→'0' → 查 SRE", "寄存器先写回 · Restore 后执行（p313）"] }),                                                               // F8 Restore State
  F({ step: 9, rs: 1, css: 1, crs: 1, dstate: 0, core: 1, regs: 1, wcard: 2, img: [1, 1, 1], imgTags: ["已写回", "已恢复", "已回原址"],
      devSt: "U0 恢复", devSub: "跑包恢复 · 门铃重启端点",
      note: ["写 CRCR 命令环重启 → R/S='1'", "端口态不在覆盖内·软件重走（p314）"] }),                                                                     // F9 重启复跑
  F({ step: 10, rs: 1, css: 1, crs: 1, dstate: 0, core: 1, regs: 1, wcard: 2, img: [1, 1, 1], imgTags: ["已写回", "已恢复", "已回原址"],
      devSt: "U0 跑包", devSub: "LPM 浅态 U1/U2 可往返", board: "lpm",
      note: ["U1 <~10 μs · L1↔U2 ~1 ms", "（Table 4-12 p316）挂起 U3 归 §4.15"] }),                                                                       // F10 链路 LPM 对照
  F({ step: 11, rs: 1, css: 1, crs: 1, dstate: 0, core: 1, regs: 1, wcard: 2, img: [1, 1, 1], imgTags: ["已写回", "已恢复", "已回原址"],
      devSt: "U0 跑包", devSub: "MEL 一个值兜住路径", anchor: 1,
      note: ["MEL：最坏退出延迟兜住路径（p324）", "SS Isoch 提前 MEL μs 发 PING（p325）"] }),                                                             // F11 MEL 读数巡回
];
const DUR = [3000, 4800, 5400, 6600, 4800, 7200, 5400, 6600, 7200, 5400, 4200, 3000];
const NAMES = ["全景", "停端点停机", "读寄存器", "Save State", "存内存镜像", "断 Core 井", "唤醒 PME", "上电回 D0", "Restore State", "重启复跑", "链路 LPM 对照", "MEL 读数巡回"];
const LAMP_KEYS = ["sss", "rss", "sre", "rs", "pme", "corep", "auxp"];

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
    step: f.step, dstate: f.dstate, core: f.core, rs: f.rs, regs: f.regs, css: f.css, crs: f.crs,
    img: f.img.slice(), imgTags: f.imgTags.slice(),
    devSt: f.devSt, devSub: f.devSub, evSub: f.evSub, events: f.events, pme: f.pme,
    wcard: f.wcard, wcardL: null, board: f.board, anchor: f.anchor, note: f.note.slice(),
    drumPos: f.dstate, coreBladeT: f.core ? 0 : 1, cssT: f.css, crsT: f.crs, pmeT: 0, regTag: D.states[f.dstate],
    evSent: false, sssOn: false, rssOn: false,
  };
}
const applyAll = (s, f) => {
  s.step = f.step; s.dstate = f.dstate; s.core = f.core; s.rs = f.rs; s.regs = f.regs; s.css = f.css; s.crs = f.crs;
  s.img = f.img.slice(); s.imgTags = f.imgTags.slice();
  s.devSt = f.devSt; s.devSub = f.devSub; s.evSub = f.evSub; s.events = f.events; s.pme = f.pme;
  s.wcard = f.wcard; s.board = f.board; s.anchor = f.anchor; s.note = f.note.slice();
  s.drumPos = f.dstate; s.coreBladeT = f.core ? 0 : 1; s.cssT = f.css; s.crsT = f.crs; s.pmeT = 0;
  s.regTag = D.states[f.dstate]; s.sssOn = false; s.rssOn = false;
};

// ---------- 帧间演出 ----------
function cuesFor(from, to) {
  const cues = [];
  const add = (at, apply) => cues.push({ at, apply });
  add(0.08, (s) => { s.note = to.note.slice(); });
  if (to.step < from.step || to.step - from.step > 1) {  // 回退/复位/跳帧：一次性归到目标终态
    add(0.15, (s) => { applyAll(s, to); s.wcardL = null; });
    return cues;
  }
  const evPush = (s, sub) => { if (!s.evSent) { s.evSent = true; tokens.push({ kind: "ev", sub, path: "ev", rev: false, t: 0 }); } };
  switch (to.step) {
    case 1: { // 停端点停机：Stop Endpoint 卡 → 令牌走线 → R/S='0'
      add(0.12, (s) => { s.wcard = 1; s.wcardL = "Stop Endpoint|停端点"; });
      add(0.26, (s) => { tokens.push({ kind: "stop", path: "write", rev: false, t: 0 }); });
      add(0.5, (s) => { s.wcard = 2; s.wcardL = "R/S='0'|停机"; s.rs = 0; });
      break;
    }
    case 2: { // 读寄存器：十组按序抄录 → 抽屉 1 开
      add(0.12, (s) => { s.wcard = 1; s.wcardL = "读寄存器|十组按序"; });
      add(0.3, (s) => { s.regs = 2; });   // 抄录中（面板高亮档）
      add(0.62, (s) => { s.img = [1, 0, 0]; s.imgTags = ["十组按序", "—", "—"]; s.regs = 1; s.wcard = 2; });
      break;
    }
    case 3: { // Save State：CSS 旗推上 → 令牌走线 → SSS 亮 → 灭（完成）→ 抽屉 2 开
      add(0.1, (s) => { s.wcard = 1; s.wcardL = "CSS='1'|Save State"; });
      add(0.22, (s) => { s.css = 1; tokens.push({ kind: "css", path: "write", rev: false, t: 0 }); });
      add(0.42, (s) => { s.sssOn = true; });
      add(0.66, (s) => { s.sssOn = false; s.img = [1, 1, 0]; s.imgTags = ["十组按序", "RCS·槽集", "—"]; s.wcard = 2; });
      break;
    }
    case 4: break;  // 存内存镜像：抽屉 3 开（软件自己保存，不走线）
    case 5: { // 断 Core 井：闸刀拉下 → Core 灯灭 → D3hot → D3cold → 面板回默认
      add(0.14, (s) => { s.core = 0; });
      add(0.34, (s) => { s.dstate = 3; s.regTag = "D3hot"; });
      add(0.56, (s) => { s.dstate = 4; s.regTag = "D3cold"; });
      add(0.72, (s) => { s.regs = 0; s.devSt = "挂起/断电"; s.devSub = "下游随 D3 挂起或断电"; });
      break;
    }
    case 6: { // 唤醒：PME 钮压下 → resume/LFPS 票据走链路（设备→xHC）→ PME 灯亮 → PME# 事件卡入匣
      add(0.12, (s) => { s.pmeT = 1; s.devSt = "发唤醒信令"; s.devSub = "resume/LFPS → PME#"; });
      add(0.24, (s) => { s.pmeT = 0; tokens.push({ kind: "resume", path: "link", rev: true, t: 0 }); });
      add(0.5, (s) => { s.pme = 1; evPush(s, "PME# 唤醒"); s.events = 1; s.evSub = "PME# 唤醒"; });
      break;
    }
    case 7: { // 上电回 D0：Core 闸刀合 → Core 灯亮 → D3cold→D0 → 抽屉 3 回原址 → 寄存器写回
      add(0.12, (s) => { s.core = 1; });
      add(0.3, (s) => { s.dstate = 0; s.regTag = "D0"; s.pme = 0; });
      add(0.48, (s) => { s.wcard = 1; s.wcardL = "写回寄存器|DNCTRL…VTIO"; tokens.push({ kind: "regw", path: "write", rev: false, t: 0 }); });
      add(0.72, (s) => { s.regs = 1; s.imgTags = ["已写回", "RCS·槽集", "已回原址"]; s.wcard = 2; s.devSt = "等待恢复"; s.devSub = "镜像已回原址"; });
      break;
    }
    case 8: { // Restore State：CRS 旗推上 → 令牌走线 → RSS 亮 → 灭（完成）→ 抽屉 2 已恢复
      add(0.1, (s) => { s.wcard = 1; s.wcardL = "CRS='1'|Restore State"; });
      add(0.22, (s) => { s.crs = 1; tokens.push({ kind: "crs", path: "write", rev: false, t: 0 }); });
      add(0.42, (s) => { s.rssOn = true; });
      add(0.68, (s) => { s.rssOn = false; s.imgTags = ["已写回", "已恢复", "已回原址"]; s.wcard = 2; s.devSub = "内部态已恢复"; });
      break;
    }
    case 9: { // 重启：写 CRCR → R/S='1' 合闸 → 设备 U0 恢复跑包
      add(0.12, (s) => { s.wcard = 1; s.wcardL = "写 CRCR|命令环重启"; });
      add(0.26, (s) => { tokens.push({ kind: "crcr", path: "write", rev: false, t: 0 }); });
      add(0.44, (s) => { tokens.push({ kind: "rs1", path: "write", rev: false, t: 0 }); });
      add(0.58, (s) => { s.rs = 1; s.wcard = 2; });
      add(0.74, (s) => { s.devSt = "U0 恢复"; s.devSub = "跑包恢复 · 门铃重启端点"; tokens.push({ kind: "data", path: "link", rev: false, t: 0 }); });
      break;
    }
    case 10: { // 链路 LPM 对照：设备窗浅态往返演示（U1→U2→U0），注记板点亮
      add(0.28, (s) => { s.devSt = "U1 浅待"; s.devSub = "回 On <~10 μs"; });
      add(0.52, (s) => { s.devSt = "U2 待"; s.devSub = "回 On ~1 ms"; });
      add(0.76, (s) => { s.devSt = "U0 跑包"; s.devSub = "LPM 浅态 U1/U2 可往返"; });
      break;
    }
    case 11: break; // MEL 读数巡回：锚牌点亮
    case 0: { // 回全景（巡游环绕）
      add(0.4, (s) => { applyAll(s, FRAMES[0]); s.wcardL = null; s.evSent = false; });
      break;
    }
  }
  if (to.step === 4) {
    add(0.3, (s) => { s.img = [1, 1, 1]; s.imgTags = ["十组按序", "RCS·槽集", "DCBAA·环"]; });
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
  // 连续趋近：转筒/闸刀/双旗/钮
  s.drumPos += (s.dstate - s.drumPos) * (1 - Math.exp(-(dt || 0.016) / 0.18));
  s.coreBladeT += ((s.core ? 0 : 1) - s.coreBladeT) * (1 - Math.exp(-(dt || 0.016) / 0.22));
  s.cssT += (s.css - s.cssT) * ease;
  s.crsT += (s.crs - s.crsT) * ease;
  s.pmeT += (0 - s.pmeT) * ease;   // 唤醒钮压下为瞬时，渲染期回落
  win('[data-part="drum"]', geo.drumSvg(Math.round(s.drumPos * 100) / 100));
  const bladeA = D.blade.aOn + (D.blade.aOff - D.blade.aOn) * Math.max(0, Math.min(1, s.coreBladeT));
  win('[data-part="coreblade"]', geo.bladeSvg(Math.round(bladeA * 10) / 10));
  win('[data-part="flag-css"]', geo.flagSvg(Math.max(0, Math.round(s.cssT * 100) / 100), D.flagCss));
  win('[data-part="flag-crs"]', geo.flagSvg(Math.max(0, Math.round(s.crsT * 100) / 100), D.flagCrs));
  // 寄存器面板（regs: 1 有值 / 0 回默认 / 2 抄录中）
  const regsOn = s.regs >= 1;
  win('[data-part="regwin"]', geo.regSvg(regsOn));
  // 镜像柜抽屉
  win('[data-part="drawers"]', geo.drawerSvg(s.img.map((on, i) => ({ on, tag: s.imgTags[i] }))));
  // 设备窗 + PME 钮
  win('[data-part="devwin"]', geo.devWinSvg(s.devSt, s.devSub));
  win('[data-part="pmebtn"]', geo.pmeBtnSvg(Math.max(0, Math.round(s.pmeT * 100) / 100)));
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
  // 灯（类切换）——键必须覆盖全量（含井柜双灯；s.sssOn/s.rssOn 为演出瞬态）
  const lamps = {};
  lamps.sss = !!s.sssOn; lamps.rss = !!s.rssOn; lamps.sre = false; lamps.rs = !!s.rs; lamps.pme = !!s.pme;
  lamps.corep = !!s.core; lamps.auxp = true;
  for (const key of LAMP_KEYS) {
    const el = $('[data-lamp="' + key + '"]');
    if (el && dispCache["L" + key] !== lamps[key]) { el.classList.toggle("on", lamps[key]); dispCache["L" + key] = lamps[key]; }
  }
  const blinkEl = $('[data-lamp="corep"]');
  if (blinkEl && dispCache.coreBlink !== !s.core) { blinkEl.classList.toggle("blink", !s.core); dispCache.coreBlink = !s.core; }
  // 注记板/锚牌高亮
  {
    const el = $('[data-name="board.lpm"]');
    if (el) {
      const lit = s.board === "lpm" ? 1 : 0;
      if (dispCache.boardLit !== lit) { el.classList.toggle("lit", !!lit); dispCache.boardLit = lit; }
    }
  }
  {
    const el = $('[data-name="mel.anchor"]');
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
  // 事件管上的飞行 PME# 卡 + 事件匣内最新卡（匣内只摆最新一张，计次在读数行）
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
  const flags = (s.css ? "CSS" : "") + (s.crs ? (s.css ? "+" : "") + "CRS" : "");
  const text = "步 " + s.step + "/11 · 井 Core " + (s.core ? "开" : "断") + " · xHC " + D.states[s.dstate] + " · 旗 " + (flags || "—") + " · 镜像 " + s.img.filter(Boolean).length + "/3";
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
window.__fig423 = {
  step, playTo, pause: () => { touring = false; clearTimeout(idleTimer); },
  stateOf: () => ({ step: state.step, dstate: D.states[state.dstate], core: !!state.core, rs: !!state.rs, regs: state.regs >= 1, css: !!state.css, crs: !!state.crs, drawers: state.img.filter(Boolean).length, dev: state.devSt, events: state.events, board: state.board }),
  frameOf: () => frame,
};
// 板块探针兼容别名（xhci_spec_occlusion_probe / ctl_probe 只认 __fig42/__fig43 取帧表达式）
window.__fig42 = window.__fig423;
render(state, 0.016);
})();

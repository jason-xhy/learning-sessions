// §4.10 TRB 处理台——十帧步进/巡游（判据见 EVIDENCE.md）
// 探针约定：window.__fig42 暴露 playTo/frameOf（xhci_spec_occlusion_probe.py /
//   xhci_spec_ctl_probe.py 只认 __fig42/__fig43 名——本节复用 __fig42 名，别名 __fig410 同指）
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

// 帧终态（同源真值；演出过程由 cues 驱动）
// dqIx: Dequeue 滑车所在卡的序号（0..5，-1=回 home）；trbDone: 完成卡集合；
// evOn: 事件环上已落位卡；inbox: 收件匣三格各 n 张；memCells: 储物柜三格票据；
// devTix: 设备待发票据；eps: EP State；halt: HALT 闸；devLamp: 设备状态灯（STALL）
const FRAMES = [
  { n: "全景静止", dqIx: -1, trbDone: [], evOn: [], inbox: [0, 0, 0], memCells: [0, 0, 0], devTix: 3, eps: "Running", halt: 0, devLamp: 0 },
  { n: "取卡验 Cycle", dqIx: 0, cyc: 1, trbDone: [], evOn: [], inbox: [0, 0, 0], memCells: [0, 0, 0], devTix: 3, eps: "Running", halt: 0, devLamp: 0 },
  { n: "执行搬数据票据", dqIx: 1, trbDone: ["trbA"], evOn: [], inbox: [0, 0, 0], memCells: [1, 1, 0], devTix: 1, eps: "Running", halt: 0, devLamp: 0 },
  { n: "末卡完成 IOC=1", dqIx: 2, trbDone: ["trbA", "trbB", "trbC"], evOn: ["ev0"], inbox: [0, 0, 0], memCells: [1, 1, 1], devTix: 0, eps: "Running", halt: 0, devLamp: 0, ioc: 1, stamp: 1 },
  { n: "事件入环 中断响", dqIx: 2, trbDone: ["trbA", "trbB", "trbC"], evOn: ["ev0"], inbox: [0, 0, 0], memCells: [1, 1, 1], devTix: 0, eps: "Running", halt: 0, devLamp: 0, ioc: 1, irq: 1, evN: 1 },
  { n: "驱动收卡分派", dqIx: 2, trbDone: ["trbA", "trbB", "trbC"], evOn: [], inbox: [1, 0, 0], memCells: [1, 1, 1], devTix: 0, eps: "Running", halt: 0, devLamp: 0, ioc: 1, evN: 1 },
  { n: "短包分支 ISP", dqIx: 3, trbDone: ["trbA", "trbB", "trbC", "trbD"], evOn: [], inbox: [1, 1, 0], memCells: [1, 1, 1], devTix: 0, eps: "Running", halt: 0, devLamp: 0, ioc: 1, isp: 1, evN: 2, stamp: 1, irq: 1 },
  { n: "错误分支 落闸停机", dqIx: 4, trbDone: ["trbA", "trbB", "trbC", "trbD"], evOn: [], inbox: [1, 1, 1], memCells: [1, 1, 1], devTix: 0, eps: "Halted", halt: 1, devLamp: 1, ioc: 1, isp: 1, evN: 3, stamp: 1, irq: 1 },
  { n: "恢复两步 复位", dqIx: 4, trbDone: ["trbA", "trbB", "trbC", "trbD"], evOn: [], inbox: [1, 1, 1], memCells: [1, 1, 1], devTix: 0, eps: "Running", halt: 0, devLamp: 0, ioc: 1, isp: 1, evN: 3, reset: 1 },
  { n: "等时例外注记", dqIx: -1, trbDone: ["trbA", "trbB", "trbC", "trbD"], evOn: [], inbox: [1, 1, 1], memCells: [1, 1, 1], devTix: 0, eps: "Running", halt: 0, devLamp: 0, ioc: 1, isp: 1, evN: 3, iso: 1 },
];
// 帧速（对齐 4.2 修订后节奏 ×1.5 档）
const DUR = [3000, 4200, 6000, 5400, 4800, 4500, 6300, 6600, 6000, 3600];

const dqX = (ix) => (ix < 0 ? D.trbX[0] - 34 : D.trbX[ix]) + D.trbW / 2;
const slotOf = (key) => D.evDefs.findIndex((d) => d.key === key);
let frame = 0;
let anim = null;
let state = snapshot(0);

function snapshot(i) {
  const f = FRAMES[i];
  return {
    dqIx: f.dqIx, cyc: 0, trbDone: new Set(f.trbDone), evOn: new Set(f.evOn),
    inbox: [...f.inbox], memCells: [...f.memCells], devTix: f.devTix, eps: f.eps,
    halt: f.halt || 0, devLamp: f.devLamp || 0,
    ioc: f.ioc || 0, isp: f.isp || 0, bei: 0, irq: f.irq || 0, stamp: 0,
    evN: f.evN || 0, iso: f.iso || 0, reset: f.reset || 0,
    fly: null, // { def, from:[x,y,z], to:[x,y,z], t } 冲压出卡飞行动画
  };
}

// ---------- 渲染 ----------
let dispIrq = -1, dispDev = -1, dispEps = "";
function render(s, dt) {
  const ease = 1 - Math.exp(-(dt || 0.016) / 0.12);
  // 取卡滑车（含验位压头）：目标 x 连续趋近
  if (s.dqTx === undefined) s.dqTx = dqX(s.dqIx);
  s.dqTx += (dqX(s.dqIx) - s.dqTx) * ease;
  if (s.drop === undefined) s.drop = 0;
  s.drop += ((s.cyc ? 1 : 0) - s.drop) * ease;
  const dq = $('[data-part="dqcar"]');
  const dqHtml = geo.dqCarSvg(s.dqTx, s.drop);
  if (dq.innerHTML !== dqHtml) dq.innerHTML = dqHtml;
  // TRB 卡完成态
  for (const def of D.trbDefs) {
    const el = $('[data-trb="' + def.key + '"]');
    if (!el) continue;
    const on = s.trbDone.has(def.key);
    if (el.classList.contains("trb-done") !== on) el.classList.toggle("trb-done", on);
  }
  // 冲压头
  if (s.st === undefined) s.st = 0;
  s.st += ((s.stamp ? 1 : 0) - s.st) * ease;
  const sh = $('[data-part="stamphead"]');
  const shHtml = geo.stampHeadSvg(s.st ?? 0);
  if (sh.innerHTML !== shHtml) sh.innerHTML = shHtml;
  // 执行滑车（y 从设备口 DRAIL.y1-12 到储物柜端 DRAIL.y0+8）
  if (s.carY === undefined) s.carY = D.drail.y0 + 8;
  const carTarget = s.carGo ? D.drail.y1 - 14 : D.drail.y0 + 8;
  s.carY += (carTarget - s.carY) * ease;
  const car = $('[data-part="execar"]');
  const carHtml = geo.exeCarSvg(s.carY, s.carN || 0);
  if (car.innerHTML !== carHtml) car.innerHTML = carHtml;
  // 储物柜格 + 设备票据
  const mc = $('[data-part="memcells"]');
  const mcHtml = geo.memCellsSvg(s.memCells);
  if (mc.innerHTML !== mcHtml) mc.innerHTML = mcHtml;
  const dt2 = $('[data-part="devtickets"]');
  const dtHtml = geo.devTicketsSvg(s.devTix);
  if (dt2.innerHTML !== dtHtml) dt2.innerHTML = dtHtml;
  // HALT 闸臂
  s.haltT = s.haltT ?? 0;
  s.haltT += (s.halt - s.haltT) * ease;
  const ha = $('[data-part="haltarm"]');
  const haHtml = geo.haltArmSvg(s.haltT);
  if (ha.innerHTML !== haHtml) ha.innerHTML = haHtml;
  // EP State 窗
  if (dispEps !== s.eps) {
    const w = $('[data-part="epswin"]');
    if (w) w.innerHTML = geo.epsWinSvg(s.eps);
    dispEps = s.eps;
  }
  // 灯（类切换）
  const lamps = [["ioc", s.ioc], ["isp", s.isp], ["bei", s.bei]];
  for (const [nm, on] of lamps) {
    const el = $('[data-part="flag-' + nm + '"]');
    if (el && el.classList.contains("on") !== !!on) el.classList.toggle("on", !!on);
  }
  const irqEl = $('[data-part="irqlamp"]');
  if (dispIrq !== s.irq) { irqEl.classList.toggle("on", !!s.irq); dispIrq = s.irq; }
  const devEl = $('[data-part="devlamp"]');
  if (dispDev !== s.devLamp) { devEl.classList.toggle("on", !!s.devLamp); dispDev = s.devLamp; }
  // 事件卡（环上落位 or 飞行中）
  for (const def of D.evDefs) {
    const el = $('[data-ev="' + def.key + '"]');
    if (!el) continue;
    const show = s.evOn.has(def.key);
    const disp = show ? "" : "none";
    if (el.style.display !== disp) el.style.display = disp;
  }
  const fly = $('[data-part="evfly"]');
  if (s.fly) {
    const t = s.fly.t;
    const x = s.fly.from[0] + (s.fly.to[0] - s.fly.from[0]) * t;
    const y = s.fly.from[1] + (s.fly.to[1] - s.fly.from[1]) * t;
    const z = s.fly.from[2] + (s.fly.to[2] - s.fly.from[2]) * t;
    fly.innerHTML = geo.evFlySvg(x, y, z, s.fly.def);
    fly.style.display = "";
    s.fly.t = Math.min(1, t + (dt || 0.016) / 0.9);
    if (s.fly.t >= 1) { s.evOn.add(s.fly.def.key); s.fly = null; fly.style.display = "none"; }
  } else if (fly && fly.style.display !== "none") fly.style.display = "none";
  // 收件匣
  for (const [i, nm] of [["0", "success"], ["1", "short"], ["2", "err"]].map(([i, nm]) => [i, nm])) {
    const el = $('[data-part="inbox-' + nm + '"]');
    if (!el) continue;
    const html = geo.inboxSvg(D.inboxX[+i], D.inboxY, s.inbox[+i]);
    if (el.innerHTML !== html) el.innerHTML = html;
  }
  // 读数
  const text = "帧 " + (frame + 1) + "/" + FRAMES.length + " · EP " + s.eps + " · 事件 " + (s.evN) + " · 中断 " + (s.evN);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", "第 " + (frame + 1) + "/" + FRAMES.length + " 帧：" + FRAMES[frame].n + "。" + text);
}

// ---------- 帧间演出 ----------
const CHUTE = [D.stamp.x - 12, D.stamp.y + 14, D.top + 18];   // 冲压位出卡口
const EV_SLOT_Z = D.evZ;                                 // 事件环卡槽底高
function cuesFor(from, to) {
  const cues = [];
  const s0 = (o) => Object.assign({ apply() {} }, o);
  // 从 from 快照推出当前数值字段
  // （snapshot 字段全量在 FRAMES；from/to 都取终态对比）
  // 冲压出卡：新增 evOn（从无到有）→ 演出 fly
  const added = [...to.evOn].filter((c) => !from.evOn.includes(c));
  if (added.length) {
    for (const key of added) {
      const def = D.evDefs[slotOf(key)];
      cues.push({ at: 0.12, apply: (s) => { s.stamp = 1; } });
      cues.push({ at: 0.30, apply: (s) => { s.fly = { def, from: CHUTE, to: [D.evX[slotOf(key)], D.evFaceY, D.evZ], t: 0 }; } });
      cues.push({ at: 0.66, apply: (s) => { s.stamp = 0; } });
      cues.push({ at: 0.78, apply: (s) => { s.irq = 1; } });     // 事件生成必伴随中断
      cues.push({ at: 0.90, apply: (s) => { s.irq = 0; } });
    }
  }
  // 新完成卡：执行滑车往返搬票据
  const doneAdded = to.trbDone.filter((c) => !from.trbDone.includes(c));
  if (doneAdded.length) {
    cues.push({ at: 0.06, apply: (s) => { s.carGo = 1; } });      // 去设备
    cues.push({ at: 0.34, apply: (s) => { s.carN = to.devTix === undefined ? 1 : Math.max(1, (from.devTix ?? 3) - (to.devTix ?? 0) || 1); } });
    cues.push({ at: 0.42, apply: (s) => { s.carGo = 0; } });      // 回储物柜
    cues.push({ at: 0.72, apply: (s) => {
      s.carN = 0;
      s.memCells = [...to.memCells];
      s.devTix = to.devTix;
    } });
  }
  // 验 Cycle：帧含 cyc=1 → 压头下压
  if (to.cyc) cues.push({ at: 0.22, apply: (s) => { s.cyc = 1; } }, { at: 0.55, apply: (s) => { s.cyc = 0; } });
  // 标志灯
  if ((to.ioc || 0) !== (from.ioc || 0) && to.ioc) cues.push({ at: 0.15, apply: (s) => { s.ioc = 1; } });
  if ((to.isp || 0) !== (from.isp || 0) && to.isp) cues.push({ at: 0.10, apply: (s) => { s.isp = 1; } });
  // HALT 闸 / 设备灯 / EP State
  if (to.halt !== from.halt && to.halt) cues.push({ at: 0.55, apply: (s) => { s.halt = 1; s.eps = to.eps; s.devLamp = 1; } });
  if (from.halt && !to.halt) {
    cues.push({ at: 0.35, apply: (s) => { s.eps = "Stopped"; } });   // Reset Endpoint：Halted→Stopped
    cues.push({ at: 0.55, apply: (s) => { s.devLamp = 0; } });       // 软件清设备侧 halt
    cues.push({ at: 0.78, apply: (s) => { s.halt = 0; s.eps = "Running"; } }); // 写门铃重启
  }
  if (!from.halt && !to.halt && to.eps !== from.eps) cues.push({ at: 0.3, apply: (s) => { s.eps = to.eps; } });
  // 收件匣变化（事件卡由环入匣）
  if (to.inbox.some((v, i) => v !== from.inbox[i])) {
    cues.push({ at: 0.85, apply: (s) => { s.inbox = [...to.inbox]; } });
  }
  return cues.map(s0);
}

function playTo(i) {
  const from = {
    trbDone: [...state.trbDone], evOn: [...state.evOn], inbox: [...state.inbox],
    devTix: state.devTix, halt: state.halt, eps: state.eps, ioc: state.ioc, isp: state.isp,
  };
  frame = Math.max(0, Math.min(FRAMES.length - 1, i));
  const to = FRAMES[frame];
  // 演出从当前视觉态出发（state 不提前落终态：cues 在 tick 中逐步推进，收尾才 snapshot）
  anim = { from, to, t0: performance.now(), dur: DUR[frame], cues: cuesFor(from, to) };
  statusEl.textContent = "第 " + (frame + 1) + "/" + FRAMES.length + " 帧 · " + to.n;
  run();
}

// ---------- 主循环 ----------
// 可见性：文档可见即渲染（rAF 只在 anim/touring 时跑，静止自然停）；IO 仅用于回视口唤醒。
// （探针/无头场景机器卡常在视口外，IO 关断会让逐帧探针探不到动态帧——2026-11-04 本节实测）
let last = 0, raf = 0, visible = !document.hidden, touring = !still.matches, idleTimer = 0, tourTimer = 0;
const TOUR_DWELL = 5.5;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (anim) {
    const t = Math.min(1, (now - anim.t0) / anim.dur);
    anim.cues.forEach((cue) => { if (t >= cue.at) cue.apply(state); });
    if (t >= 1) {
      // 收尾：fly 未完的立即落位
      if (state.fly) { state.evOn.add(state.fly.def.key); state.fly = null; }
      state = snapshot(frame);
      anim = null;
    }
  }
  if (touring && !anim) {
    tourTimer += dt;
    if (tourTimer > TOUR_DWELL) { tourTimer = 0; playTo((frame + 1) % FRAMES.length); }
  }
  render(state, dt);
  raf = visible && (anim || touring) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!raf && visible) { last = 0; raf = requestAnimationFrame(tick); } };
// 控制条状态同步（懒查询：arm 在接线前也可能执行，避免 TDZ）
function syncTourBtn() {
  const box = stage.closest(".iso-figure");
  const btn = box && box.querySelector('.fig-ctl [data-act="tour"]');
  if (btn) btn.setAttribute("aria-pressed", String(!!touring));
}
const arm = () => { touring = false; clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; tourTimer = 0; syncTourBtn(); run(); }, 3600); syncTourBtn(); run(); };
const step = (dir) => { arm(); playTo(frame + dir); };
document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) run(); });
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
// 控制条（照 4.2/4.3 门：可视步进按钮与键盘并存）
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
window.__fig42 = { step, playTo, pause: () => { touring = false; clearTimeout(idleTimer); }, stateOf: () => ({ eps: state.eps, evN: state.evN, halt: state.halt, dqIx: state.dqIx, trbDone: [...state.trbDone], evOn: [...state.evOn] }), frameOf: () => frame };
window.__fig410 = window.__fig42;
render(state, 0.016);
})();

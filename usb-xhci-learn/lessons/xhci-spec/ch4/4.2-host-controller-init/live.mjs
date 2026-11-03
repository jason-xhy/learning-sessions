// §4.2 启机配电台——八帧步进/巡游（判据见 EVIDENCE.md）
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
// step：读数 n/7；cards：已落位卡；slots：MaxSlotsEn 示例值；erstsz：段表项数（示例 1 段）
const FRAMES = [
  { step: 0, cards: [] },
  { step: 1, cards: [], cnrFlash: 1 },
  { step: 2, cards: ["dcbaap"], slots: 4 },
  { step: 3, cards: ["dcbaap", "crcr"], slots: 4 },
  { step: 4, cards: ["dcbaap", "crcr", "seg", "erdp", "erstba"], slots: 4, erstsz: 1 },
  { step: 5, cards: ["dcbaap", "crcr", "seg", "erdp", "erstba", "msix"], slots: 4, erstsz: 1 },
  { step: 6, cards: ["dcbaap", "crcr", "seg", "erdp", "erstba", "msix"], slots: 4, erstsz: 1, rs: 1 },
  { step: 7, cards: ["dcbaap", "crcr", "seg", "erdp", "erstba", "msix"], slots: 4, erstsz: 1, rs: 1 },
];
// 帧速（2026-11-03 用户反馈轮）：原 [2200,2400,3000,2400,4200,3600,2600,2000] 全值 ×1.5
const DUR = [3300, 3600, 4500, 3600, 6300, 5400, 3900, 3000];

const magTop = () => ({ x: D.mag.x + (D.mag.w - 4) / 2, z: 36.6 + magN * 2.3 });
const slotOf = (key) => {
  const def = D.cardDefs.find((c) => c.key === key);
  return { x: D.cageX[def.col] + D.cardW / 2, z: D.rowZ[def.row] };
};

let frame = 0;
let anim = null;
let magN = 6;
let state = snapshot(0);

function snapshot(i) {
  const f = FRAMES[i];
  return {
    step: f.step, cards: new Set(f.cards), slots: f.slots || 0, erstsz: f.erstsz || 0, rs: f.rs || 0,
    cnr: 0,
    erLamp: f.erstsz ? 1 : 0,
    inte: f.step >= 5 ? 1 : 0, ie: f.step >= 5 ? 1 : 0,
    cfgAng: f.slots ? 132 : 0,
    itvAng: f.step >= 5 ? 96 : 0,
    portsOn: f.rs ? 4 : 0,
    arm: { x: D.trolleyHome, tx: D.trolleyHome, drop: 0, dropT: 0, card: null, push: 0, pushT: 0 },
  };
}

// ---------- 飞行卡独立深度项（2026-11-03 老问题修复轮） ----------
// 修前：卡嵌在滑车 svg 内、随滑车 item 的 settle 序绘制——越过前置拉线分段（wire.rs:1-5 /
// wire.cfg:0-4 在滑车之前）时卡画在线上、线被截断。正解：卡拆独立组，每帧按真实 3D 位置
// 对拉线分段采样做视线 ray-box 判深（视轴 = depthOf 方向 [0.612,0.612,0.5]）：
//   线样品 τ 区间整段在样品之后（t1<-0.01）→ 线在卡前 → 卡组移到该分段之前（线盖卡）；
//   τ 区间整段在样品之前（t0> 0.01）→ 卡在线前 → 卡组移到该分段之后（卡盖线）。
const flyInner = $('[data-part="flycard"]');
const flyWrap = flyInner.closest(".it");
const itemOrder = [...svgRoot.querySelectorAll(".fb-stage .it")].filter((el) => el !== flyWrap);
const itemByName = new Map(itemOrder.map((el) => [el.getAttribute("data-name"), el]));
const trolleyRef = itemByName.get("trolley");
const defaultFlyRef = itemOrder[itemOrder.indexOf(trolleyRef) + 1] || null;
const VIEW = [Math.SQRT1_2 * Math.cos(Math.PI / 6), Math.SQRT1_2 * Math.cos(Math.PI / 6), 0.5];
const wireSamples = (D.wires || []).map((w) => {
  const pts = [];
  for (let i = 0; i + 1 < w.pts.length; i++) {
    const [x0, y0, z0] = w.pts[i], [x1, y1, z1] = w.pts[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0), n = Math.max(1, Math.ceil(len / 2.5));
    for (let j = 0; j < n; j++) pts.push([x0 + (x1 - x0) * j / n, y0 + (y1 - y0) * j / n, z0 + (z1 - z0) * j / n]);
  }
  pts.push(w.pts[w.pts.length - 1]);
  return { name: w.name, pts, idx: itemOrder.indexOf(itemByName.get(w.name)) };
});
function slabTau(p, lo, hi) {
  let t0 = -Infinity, t1 = Infinity;
  for (let i = 0; i < 3; i++) {
    const v = VIEW[i];
    let u0 = (lo[i] - p[i]) / v, u1 = (hi[i] - p[i]) / v;
    if (u0 > u1) { const t = u0; u0 = u1; u1 = t; }
    if (u0 > t0) t0 = u0;
    if (u1 < t1) t1 = u1;
    if (t0 > t1) return null;
  }
  return [t0, t1];
}
function placeFly(lo, hi) {
  let maxBehind = -1, minFront = Infinity;
  for (const w of wireSamples) {
    if (w.idx < 0) continue;
    let wireFront = false, cardFront = false;
    for (const p of w.pts) {
      const t = slabTau(p, lo, hi);
      if (!t) continue;
      if (t[1] < -0.01) wireFront = true;
      else cardFront = true;
      if (wireFront && cardFront) break;
    }
    if (wireFront && cardFront) continue; // 同分段双态（贴穿容差）：不动该分段
    if (wireFront) { if (w.idx < minFront) minFront = w.idx; }
    else if (cardFront) { if (w.idx > maxBehind) maxBehind = w.idx; }
  }
  let ref;
  if (minFront < Infinity && (maxBehind < 0 || maxBehind + 1 <= minFront)) ref = itemOrder[minFront];
  else if (maxBehind >= 0 && minFront === Infinity) ref = itemOrder[maxBehind + 1] || null;
  else if (minFront < Infinity) ref = itemOrder[minFront]; // 冲突兜底：以「线盖卡」优先
  else ref = defaultFlyRef;
  const parent = flyWrap.parentNode;
  if (ref && ref !== flyWrap) parent.insertBefore(flyWrap, ref);
  else if (!ref) parent.appendChild(flyWrap);
}
function renderFly(a) {
  if (!a.card) { if (flyInner.style.display !== "none") flyInner.style.display = "none"; return; }
  const def = D.cardDefs.find((c) => c.key === a.card);
  const pos = geo.flyCardPos(a.x, a.drop, a.push);
  const html = geo.cardSvg(pos.x, pos.yFace, pos.z, def);
  if (flyInner.innerHTML !== html) flyInner.innerHTML = html;
  flyInner.style.display = "";
  placeFly([pos.x, pos.yFace - D.cardT, pos.z], [pos.x + D.cardW, pos.yFace, pos.z + D.cardH]);
}

// ---------- 渲染 ----------
let dispCnr = -1, dispLamp = -1;
function render(s, dt) {
  // 机械手连续趋近（指数跟随）
  const a = s.arm;
  const ease = 1 - Math.exp(-(dt || 0.016) / 0.12);
  a.x += (a.tx - a.x) * ease;
  a.drop += (a.dropT - a.drop) * ease;
  a.push += (a.pushT - a.push) * ease;
  const tr = $('[data-part="trolley"]');
  const trHtml = geo.trolleySvg(a.x, a.drop, a.push);
  if (tr.innerHTML !== trHtml) tr.innerHTML = trHtml;
  renderFly(a);
  // 卡库叠层
  const mg = $('[data-part="magstack"]');
  const mgHtml = geo.magStackSvg(magN);
  if (mg.innerHTML !== mgHtml) mg.innerHTML = mgHtml;
  // 旋钮 / 数字窗 / 计数轮
  const kn = $('[data-part="cfgknob"]');
  const knHtml = geo.knobSvg(D.cellX[1], s.cfgAng);
  if (kn.innerHTML !== knHtml) kn.innerHTML = knHtml;
  const wn = $('[data-part="cfgwin"]');
  const wnHtml = geo.numWinSvg(s.slots);
  if (wn.innerHTML !== wnHtml) wn.innerHTML = wnHtml;
  const ik = $('[data-part="itvknob"]');
  const ikHtml = geo.knobSvg(D.cellX[3], s.itvAng, 4);
  if (ik.innerHTML !== ikHtml) ik.innerHTML = ikHtml;
  const wh = $('[data-part="erszwin"]');
  const whHtml = geo.wheelWinSvg(s.erstsz);
  if (wh.innerHTML !== whHtml) wh.innerHTML = whHtml;
  // 闸刀
  const rsA = $('[data-part="rsarm"]');
  const rsHtml = geo.rsArmSvg(s.rs);
  if (rsA.innerHTML !== rsHtml) rsA.innerHTML = rsHtml;
  for (const key of ["inte", "ie"]) {
    const el = $('[data-part="sw-' + key + '"]');
    const cx = D.cellX[key === "inte" ? 4 : 5];
    const html = geo.swArmSvg(cx, s[key]);
    if (el.innerHTML !== html) el.innerHTML = html;
  }
  // 灯（类切换）
  const cnrEl = $('[data-part="cnrdome"]');
  if (dispCnr !== s.cnr) { cnrEl.classList.toggle("on", !!s.cnr); dispCnr = s.cnr; }
  const erEl = $('[data-part="erlamp"]');
  if (dispLamp !== s.erLamp) { erEl.classList.toggle("on", !!s.erLamp); dispLamp = s.erLamp; }
  // 端口灯：on 数量 = portsOn（前 n 个亮）
  $$('[data-part^="port"]').forEach((el, i) => {
    const on = i < s.portsOn;
    if (el.classList.contains("on") !== on) el.classList.toggle("on", on);
  });
  // 落位卡
  for (const def of D.cardDefs) {
    const el = $('[data-card="' + def.key + '"]');
    if (!el) continue;
    const show = s.cards.has(def.key) ? "" : "none";
    if (el.style.display !== show) el.style.display = show;
  }
  // 读数
  const text = "启动步 " + s.step + "/7 · CNR " + (s.cnr ? 1 : 0) + " · R/S " + (s.rs ? 1 : 0) + " · 端口活动 " + s.portsOn + "/4";
  if (readout.textContent !== text) readout.textContent = text;
  const names = ["全景", "等 CNR 清零", "配槽与 DCBAA", "命令环起点", "事件环登记", "中断链", "合闸 R/S=1", "读数巡回"];
  stage.setAttribute("aria-valuetext", "第 " + (frame + 1) + "/8 帧：" + names[frame] + "。" + text);
}

// ---------- 帧间演出 ----------
function cuesFor(from, to) {
  const cues = [];
  const s0 = (o) => Object.assign({ apply() {} }, o);
  // CNR：每帧演出都从当前基线出发；F1 目标帧演「亮→灭」
  if (to.step === 1) {
    cues.push({ at: 0.08, apply: (s) => { s.cnr = 1; } });        // 复位后 CNR=1（未就绪）
    cues.push({ at: 0.62, apply: (s) => { s.cnr = 0; } });        // CNR=0，可以动手
  }
  if (from.step === 1 && to.step === 0) {
    cues.push({ at: 0.5, apply: (s) => { s.cnr = 1; s.rs = 0; s.portsOn = 0; } });
    cues.push({ at: 0.85, apply: (s) => { s.cnr = 0; } });
  }
  // 新增卡：逐张吊运（时段按帧长比例）
  const added = to.cards.filter((c) => !from.cards.includes(c));
  const removed = from.cards.filter((c) => !to.cards.includes(c));
  let t = 0.06;
  const span = added.length > 1 ? 0.62 : 0.5;
  for (const key of added) {
    const home = magTop();
    const slot = slotOf(key);
    cues.push({ at: t, apply: (s) => { s.arm.tx = home.x; s.arm.dropT = 0; s.arm.pushT = 0; } });
    cues.push({ at: t + 0.1, apply: (s) => { s.arm.dropT = 20; } });
    cues.push({ at: t + 0.18, apply: (s) => { s.arm.card = key; magN -= 1; } });
    cues.push({ at: t + 0.22, apply: (s) => { s.arm.dropT = 4; s.arm.tx = slot.x; } });
    cues.push({ at: t + span - 0.08, apply: (s) => { s.arm.pushT = 7; } });
    cues.push({ at: t + span, apply: (s) => { s.cards.add(key); s.arm.card = null; s.arm.pushT = 0; } });
    t = span + 0.08;
  }
  if (removed.length) {
    cues.push({ at: 0.7, apply: (s) => { for (const key of removed) s.cards.delete(key); magN += removed.length; s.arm.tx = D.trolleyHome; s.arm.card = null; } });
  }
  if (added.length) cues.push({ at: Math.min(0.94, t + 0.04), apply: (s) => { s.arm.tx = D.trolleyHome; s.arm.dropT = 0; } });
  // MaxSlotsEn 旋钮（F2）
  if (to.slots && to.slots !== from.slots) {
    cues.push({ at: 0.66, apply: (s) => { s.cfgAng = 132; s.slots = to.slots; } });
  }
  if (from.slots && !to.slots) cues.push({ at: 0.4, apply: (s) => { s.cfgAng = 0; s.slots = 0; } });
  // 事件环组（F4）：计数轮 + 启用灯（ERSTBA 落位后）
  if (to.erstsz && to.erstsz !== from.erstsz) {
    cues.push({ at: 0.55, apply: (s) => { s.erstsz = 1; } });
    cues.push({ at: 0.72, apply: (s) => { s.erLamp = 1; } });
  }
  if (from.erstsz && !to.erstsz) cues.push({ at: 0.5, apply: (s) => { s.erstsz = 0; s.erLamp = 0; } });
  // 中断组（F5）：Interval 旋钮 + INTE + IE
  if (to.step >= 5 && from.step < 5) {
    cues.push({ at: 0.68, apply: (s) => { s.itvAng = 96; } });
    cues.push({ at: 0.78, apply: (s) => { s.inte = 1; } });
    cues.push({ at: 0.86, apply: (s) => { s.ie = 1; } });
  }
  if (from.step >= 5 && to.step < 5) {
    cues.push({ at: 0.5, apply: (s) => { s.itvAng = 0; s.inte = 0; s.ie = 0; } });
  }
  // 合闸（F6→F7 之间在 F6 帧演出）：R/S 杆 + 端口灯
  if (to.rs && to.rs !== from.rs) {
    cues.push({ at: 0.5, apply: (s) => { s.rs = 1; } });
    cues.push({ at: 0.62, apply: (s) => { s.portsOn = 4; } });
  }
  if (from.rs && !to.rs) {
    cues.push({ at: 0.45, apply: (s) => { s.rs = 0; s.portsOn = 0; } });
  }
  return cues.map(s0);
}

function playTo(i) {
  const from = { cards: [...state.cards], step: state.step, slots: state.slots, erstsz: state.erstsz, rs: state.rs };
  frame = Math.max(0, Math.min(FRAMES.length - 1, i));
  const to = FRAMES[frame];
  anim = { from, to, t0: performance.now(), dur: DUR[frame], cues: cuesFor(from, to) };
  const names = ["全景静止", "上电等就绪", "配置槽位与 DCBAA", "命令环起点", "事件环登记", "中断链", "合闸", "读数巡回"];
  statusEl.textContent = "第 " + (frame + 1) + "/8 帧 · " + names[frame];
  // 自启（2026-11-03 裁处修复）：外部直接 __fig42.playTo(n) 落在 tick 停止窗
  // （巡游关+上一动画收尾，raf=0）时，anim 已建但循环无人拉起——此处补一次 run()，
  // raf 在跑时 no-op；可见性不可用时仍由 IntersectionObserver 回 visible 再拉起。
  run();
}

// ---------- 主循环 ----------
let last = 0, raf = 0, visible = false, touring = !still.matches, idleTimer = 0, tourTimer = 0;
const TOUR_DWELL = 5.5;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (anim) {
    const t = Math.min(1, (now - anim.t0) / anim.dur);
    const s = state;
    anim.cues.forEach((cue) => { if (t >= cue.at) cue.apply(s); });
    if (t >= 1) {
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
const arm = () => { touring = false; clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; tourTimer = 0; run(); }, 3600); run(); };
const step = (dir) => { arm(); playTo(frame + dir); };
new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointerdown", () => { arm(); playTo((frame + 1) % FRAMES.length); });
stage.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); step(1); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
  else if (e.key === "Home") { arm(); playTo(0); }
  else if (e.key === "a" || e.key === "A") { touring = !still.matches; tourTimer = 0; run(); }
  else if (e.key === "Escape") { touring = false; run(); }
});
window.__fig42 = { step, playTo, pause: () => { touring = false; clearTimeout(idleTimer); }, stateOf: () => ({ step: state.step, cards: [...state.cards], rs: state.rs }), frameOf: () => frame, armOf: () => ({ x: +state.arm.x.toFixed(1), drop: +state.arm.drop.toFixed(1), push: +state.arm.push.toFixed(1), card: state.arm.card }) };
render(state, 0.016);
})();

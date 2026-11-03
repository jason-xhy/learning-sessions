// §4.3 设备登记流水线 —— 12 帧步进动画（帧状态纯函数 + DOM 增量更新）
// 帧序对应 DESIGN §5.3 F0–F11；数值断言见 EVIDENCE.md。
const D = __DATA__;
const P = D.P;
const stage = document.querySelector(".xhp-stage");
const svg = stage.querySelector("svg");
const $$ = (s) => [...svg.querySelectorAll(s)];
const readout = stage.closest(".iso-figure").querySelector("[data-readout]");
const statusEl = document.querySelector(".xhp-stage [data-status]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

const ORIG = D.ORIG, BX = D.BX, BY = D.BY, BZ = D.BZ;
const f2 = (v) => Math.round(v * 100) / 100;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (t) => { const x = clamp01(t); return x * x * (3 - 2 * x); };
const seg = (p, a, b) => ease((p - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const isoPt = (p) => iso(p, P);
const worldTranslate = (p) => {
  const sx = ORIG[0] + BX[0] * p[0] + BY[0] * p[1] + BZ[0] * p[2];
  const sy = ORIG[1] + BX[1] * p[0] + BY[1] * p[1] + BZ[1] * p[2];
  return `translate(${f2(sx - ORIG[0])} ${f2(sy - ORIG[1])})`;
};

// ---- 路径采样器 ----
function mkPath(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
  const total = cum[cum.length - 1];
  return { total, at(t) {
    const s = clamp01(t) * total;
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const u = cum[i] > cum[i - 1] ? (s - cum[i - 1]) / (cum[i] - cum[i - 1]) : 0;
    return lerp3(pts[i - 1], pts[i], u);
  } };
}
const CABLE = mkPath(D.cable);
const TUBE = mkPath(D.tube);
const SLIP_PATH = mkPath(D.slipPath);
const WRITE_PATH = mkPath(D.writePath);

// ---- 卡片绘制（缓存） ----
const SW = "var(--xhp-sw)", HC = "var(--xhp-hc)", DEV = "var(--xhp-dev)";
const cardCache = new Map();
function cached(key, fn) { if (!cardCache.has(key)) cardCache.set(key, fn()); return cardCache.get(key); }

// 平放卡（在水平面 XY 上，绕局部原点构建，用 worldTranslate 安放；文字贴卡面沿长轴）
// 2026-11-03 遮挡修复：卡面与文字分离产出（solid/text 两段）——落位堆叠时先发全部卡面、
// 后发全部文字：相邻卡沿方位角的斜投影 bbox 会把邻卡文字误判成被盖（探针按 AABB 求交），
// 卡面间保持真实间隙 + 文字后发，停留态不盖字。
function flatCardParts(plan, h, lines, stripe) {
  let solid = solidSvg(slabOf(plan, 0, h, P, 2, 0.3), { tone: "hi", crease: "lo" });
  if (stripe) {
    const sp = { x: plan.x + 0.6, y: plan.y + 0.8, w: 1.3, d: plan.d - 1.6, r: 0.5 };
    solid += `<path d="${pathOf([isoPt([sp.x, sp.y, h]), isoPt([sp.x + sp.w, sp.y, h]), isoPt([sp.x + sp.w, sp.y + sp.d, h]), isoPt([sp.x, sp.y + sp.d, h])], true)}" style="fill:${stripe}"/>`;
  }
  const cx = plan.x + plan.w / 2, cy = plan.y + plan.d / 2;
  let text = "";
  lines.forEach((ln) => {
    text += `<text class="xhp-cardtext" data-tone="${ln.tone || "hi"}" transform="${topMatrix([cx, cy + ln.dy, 0], h + 0.04, P)}" font-size="${f2(ln.size * D.KS)}" text-anchor="middle">${ln.t}</text>`;
  });
  return { solid, text };
}
function flatCardSvg(plan, h, lines, stripe) {
  const p = flatCardParts(plan, h, lines, stripe);
  return p.solid + p.text;
}
// 立卡（竖直面 +y，frontText 平面）
function frontCardSvg(x0, yF, z0, w, h, thick, lines, stripe) {
  const plan = { x: x0, y: yF, w, d: thick, r: 0.5 };
  let s = solidSvg(slabOf(plan, z0, h, P, 2, 0.3), { tone: "hi", crease: "lo" });
  if (stripe) {
    s += `<path d="${pathOf([isoPt([x0 + 0.5, yF + thick + 0.02, z0]), isoPt([x0 + 1.5, yF + thick + 0.02, z0]), isoPt([x0 + 1.5, yF + thick + 0.02, z0 + h]), isoPt([x0 + 0.5, yF + thick + 0.02, z0 + h])], true)}" style="fill:${stripe}"/>`;
  }
  lines.forEach((ln) => {
    const o = [x0 + w / 2, yF + thick + 0.06, z0 + ln.dz];
    const p0 = isoPt(o), px = isoPt([o[0] + 1, o[1], o[2]]), py = isoPt([o[0], o[1], o[2] - 1]);
    s += `<text class="xhp-cardtext" data-tone="${ln.tone || "hi"}" transform="matrix(${f2(px[0] - p0[0])} ${f2(px[1] - p0[1])} ${f2(py[0] - p0[0])} ${f2(py[1] - p0[1])} ${f2(p0[0])} ${f2(p0[1])})" font-size="${f2(ln.size * D.KS)}" text-anchor="middle">${ln.t}</text>`;
  });
  return s;
}
// 票据带挂卡：平板票贴塔面（y=20 面 +0.06），自挂夹下缘垂挂（四夹 z 间距 6，
// 卡高 5.2 → 卡间留真实 z 间隙）；solid/text 分离，draw 侧先发卡面后发文字。
const TKC_X0 = 153, TKC_W = 23, TKC_H = 5.2;
const ticketClipParts = (l1, l2, zTop) => cached("tkc:" + l1 + zTop, () => {
  const z0 = zTop - TKC_H - 0.2;
  const quad = [[TKC_X0, 20.06, z0], [TKC_X0 + TKC_W, 20.06, z0], [TKC_X0 + TKC_W, 20.06, z0 + TKC_H], [TKC_X0, 20.06, z0 + TKC_H]];
  const solid = `<path d="${pathOf(quad.map(isoPt), true)}" style="fill:var(--anatomy-hi)"/>` +
    `<path d="${pathOf([isoPt([TKC_X0 + 0.8, 20.08, z0 + 0.5]), isoPt([TKC_X0 + 2.0, 20.08, z0 + 0.5]), isoPt([TKC_X0 + 2.0, 20.08, z0 + TKC_H - 0.5]), isoPt([TKC_X0 + 0.8, 20.08, z0 + TKC_H - 0.5])], true)}" style="fill:${DEV}"/>` +
    `<path d="${pathOf(quad.map(isoPt), true)}" style="fill:none;stroke:var(--anatomy-lo);stroke-width:0.8"/>`;
  let text = "";
  [[l1, z0 + TKC_H - 1.7, "dev", 1.85], [l2, z0 + 1.1, "mid", 1.8]].forEach(([t, z, tone, size]) => {
    const o = [TKC_X0 + TKC_W / 2, 20.1, z];
    const p0 = isoPt(o), px = isoPt([o[0] + 1, o[1], o[2]]), py = isoPt([o[0], o[1], o[2] - 1]);
    text += `<text class="xhp-cardtext" data-tone="${tone}" transform="matrix(${f2(px[0] - p0[0])} ${f2(px[1] - p0[1])} ${f2(py[0] - p0[0])} ${f2(py[1] - p0[1])} ${f2(p0[0])} ${f2(p0[1])})" font-size="${f2(size * D.KS)}" text-anchor="middle">${t}</text>`;
  });
  return { solid, text };
});
const slipSvg = (l1, l2) => cached("slip:" + l1, () =>
  flatCardSvg({ x: -11.5, y: -5, w: 23, d: 10, r: 1 }, 1, [
    { t: l1, dy: -1.5, size: 2.0 }, { t: l2, dy: 1.8, size: 1.6, tone: "mid" },
  ], SW));
const writeSvg = (l1, l2) => cached("write:" + l1, () =>
  flatCardSvg({ x: -5.5, y: -4, w: 11, d: 8, r: 0.8 }, 0.9, [
    { t: l1, dy: -1.2, size: 2.2 }, { t: l2, dy: 1.5, size: 1.7, tone: "mid" },
  ], HC));
// 事件卡：堆叠时被上层同格卡盖住的卡只留卡背（无字），顶层卡带「事件 n」
const evCardParts = (l1, l2) => cached("evc:" + l1 + l2, () =>
  flatCardParts({ x: -5.5, y: -4.4, w: 11, d: 8.8, r: 0.8 }, 0.9, [
    { t: l1, dy: -1.6, size: 2.8 }, { t: l2, dy: 1.8, size: 2.4, tone: "mid" },
  ], HC));
const evBlank = () => cached("evb", () => flatCardParts({ x: -5.5, y: -4.4, w: 11, d: 8.8, r: 0.8 }, 0.9, [], HC).solid);
const evSvg = (l1, l2) => { const p = evCardParts(l1, l2); return p.solid + p.text; };
const ticketSvg = (l1, l2) => cached("tk:" + l1 + l2, () =>
  flatCardSvg({ x: -11, y: -4.5, w: 22, d: 9, r: 0.9 }, 1, [
    { t: l1, dy: -1.5, size: 2.0, tone: "dev" }, { t: l2, dy: 1.6, size: 1.6, tone: "mid" },
  ], DEV));
const descCardParts = (l1, l2) => cached("dsc:" + l1, () =>
  flatCardParts({ x: -5.75, y: -4.4, w: 11.5, d: 8.8, r: 0.9 }, 1, [
    { t: l1, dy: -1.6, size: 1.9 }, { t: l2, dy: 1.8, size: 1.3, tone: "mid" },
  ], SW));
const OC_LINES = [
  { t: "输", dz: 12.2, size: 2.0 }, { t: "出", dz: 9.7, size: 2.0 }, { t: "上", dz: 7.2, size: 2.0 },
  { t: "下", dz: 4.7, size: 2.0 }, { t: "文", dz: 2.2, size: 2.0 },
];
const outctxFlySvg = () => cached("outctxFly", () => frontCardSvg(-2.7, -6, 0, 5.4, 13, 12, OC_LINES));
const outctxRestSvg = () => cached("outctxRest", () => frontCardSvg(D.outctxTo.planX, D.outctxTo.planY, D.outctxTo.z, 5.4, 13, 12, OC_LINES));
const trbSvg = (lab) => cached("trb:" + lab, () => {
  const plan = { x: -3.4, y: -6.9, w: 6.8, d: 13.8, r: 0.8 };
  return solidSvg(slabOf(plan, 0, 2.2, P, 2, 0.3), { tone: "hi", crease: "lo" }) +
    `<text class="xhp-cardtext" transform="${topMatrix([0, 0, 0], 2.26, P)}" font-size="${f2(3.2 * D.KS)}" text-anchor="middle">${lab}</text>`;
});

// ---- DOM refs ----
const layers = {};
for (const key of ["actors-cards", "actors-tickets", "actors-slips", "actors-events", "actors-bells", "actors-fx"]) {
  layers[key] = svg.querySelector(`[data-part="${key}"]`);
}
const flagEls = {};
for (const f of ["ccs", "csc", "pr", "prc", "ped"]) {
  const el = svg.querySelector(`[data-flag="${f}"]`);
  flagEls[f] = el ? el.closest(".xhp-lamp") : null;
}
const winEls = { pls: svg.querySelector('[data-win="pls"]'), speed: svg.querySelector('[data-win="speed"]'), slot: svg.querySelector('[data-win="slot"]') };
const devLamps = {};
for (const key of ["powered", "default", "address", "configured"]) devLamps[key] = svg.querySelector(`[data-lamp="dev-${key}"]`);
const ep0Ready = svg.querySelector('[data-lamp="ep0ready"]');
const formCells = {};
for (const id of D.formFields) formCells[id] = svg.querySelector(`[data-cell="${id}"]`);
const cablePluggedEls = $$('[data-route="cable.bus"]');
const intakeEl = svg.querySelector('[data-name="cons.intake"]');

const cableDroop = document.createElementNS("http://www.w3.org/2000/svg", "g");
layers["actors-fx"].appendChild(cableDroop);
const readBracket = document.createElementNS("http://www.w3.org/2000/svg", "g");
{
  const c = [[-37, 12], [19, 12], [19, 30.2], [-37, 30.2]];
  const L = 4;
  const segs = [];
  for (let i = 0; i < 4; i++) {
    const a = c[i], b = c[(i + 1) % 4];
    const dx = Math.sign(b[0] - a[0]), dy = Math.sign(b[1] - a[1]);
    const p1 = isoPt([a[0] + dx * L, a[1] + dy * L, 30.12]);
    const p2 = isoPt([a[0], a[1], 30.12]);
    const p3 = isoPt([b[0] - dx * L, b[1] - dy * L, 30.12]);
    segs.push(`M ${f2(p1[0])} ${f2(p1[1])} L ${f2(p2[0])} ${f2(p2[1])} L ${f2(p3[0])} ${f2(p3[1])}`);
  }
  readBracket.innerHTML = `<path class="xhp-bracket xhp-pulse" d="${segs.join(" ")}"/>`;
  readBracket.style.display = "none";
  layers["actors-fx"].appendChild(readBracket);
}
const bellEls = {};
for (const key of ["b0", "b1"]) {
  const b = D.bells[key];
  const cap = document.createElementNS("http://www.w3.org/2000/svg", "g");
  cap.innerHTML = solidSvg(cylinder(0, 0, 2.4, 0, 1.8, P, 26, 0.4), { tone: "hi" }) +
    dotsSvg([isoPt([0, 0, 1.8])], { size: 0.9, tone: "hi" });
  const spring = document.createElementNS("http://www.w3.org/2000/svg", "g");
  layers["actors-bells"].appendChild(spring);
  layers["actors-bells"].appendChild(cap);
  bellEls[key] = { cap, spring, b };
}
function helixSvg(c, r, z0, z1, turns) {
  const n = Math.max(24, Math.round(turns * 22));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = t * turns * Math.PI * 2;
    pts.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), z0 + (z1 - z0) * t]);
  }
  return lineSvg(pathOf(pts.map((p) => isoPt(p))), { tone: "lo" }) +
    dotsSvg([isoPt(pts[0]), isoPt(pts[pts.length - 1])], { size: 0.5, tone: "mid" });
}
const trbLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
layers["actors-cards"].appendChild(trbLayer);
const ocLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
layers["actors-cards"].appendChild(ocLayer);

// ---- 帧状态（纯函数） ----
const FRAME_NAMES = [
  "F0 全景：端口等待，试验盒未接线",
  "F1 插入：CCS=1/CSC=1，端口状态变化事件到文书台",
  "F2 查端口：读 PORTSC，写 PR=1 发起端口复位",
  "F3 复位完成：PRC/PED 置位，设备入 Default 态",
  "F4 取槽：Enable Slot，Slot ID=1，DCBAA 装载",
  "F5 槽初始化：填输入上下文，EP0 传输环就绪",
  "F6 编址：Address Device，总线上第一张票据 SET_ADDRESS",
  "F7 问尺寸：GET_DESCRIPTOR 前 8 字节（仅 FS 必走）",
  "F8 更新上下文：Evaluate Context，MPS 更新生效",
  "F9 读档案：完整描述符入收件匣",
  "F10 配置：Configure Endpoint + SET_CONFIGURATION 双操作同成",
  "F11 完工：EP 环可调度，管道全通",
];
const DUR = D.durs;

function baseState() {
  return {
    plug: 0, plugT: 0,
    flags: { ccs: 0, csc: 0, pr: 0, prc: 0, ped: 0 },
    pls: "—", speed: "—", slot: "—", dev: "off",
    ep0ready: 0, trbs: 0, trbsVariant: 3, trbsDrop: 1,
    filled: {}, mpsHot: 0,
    outctx: 0, outctxT: 1,
    slip: null, write: null,
    events: [], evCount: 0,
    ticket: null, clips: [],
    descs: [],
    bell0: 0, bell1: 0, ringPulse: 0, readBracket: 0,
    resetPulse: null, done: 0,
  };
}

function computeState(frame, p) {
  const st = baseState();
  // —— 持久事实（按帧号累积；帧内子动作覆盖瞬时值） ——
  if (frame >= 1) { st.plug = 1; st.flags.ccs = 1; st.flags.csc = 1; st.pls = "7"; st.dev = "powered"; st.evCount = 1; }
  if (frame >= 3) { st.flags.prc = 1; st.flags.ped = 1; st.pls = "U0"; st.speed = "FS"; st.dev = "default"; st.evCount = 2; }
  if (frame >= 4) { st.slot = "Enabled"; st.outctx = 1; st.evCount = 3; }
  if (frame >= 5) { st.filled = { a0: 1, a1: 1, sport: 1, sroute: 1, sentries: 1, etype: 1, mps: 1, dcs: 1, cerr: 1 }; st.ep0ready = 1; }
  if (frame >= 6) { st.slot = "Addressed"; st.dev = "address"; st.clips = [0]; st.evCount = 4; }
  if (frame >= 7) { st.clips = [0, 1]; st.evCount = 5; }
  if (frame >= 8) { st.evCount = 6; }
  if (frame >= 9) { st.clips = [0, 1, 2]; st.evCount = 7; }
  if (frame >= 10) { st.slot = "Configured"; st.dev = "configured"; st.clips = [0, 1, 2, 3]; st.evCount = 9; }
  if (frame >= 11) { st.done = 1; }

  if (frame === 1) {
    st.plug = p >= 0.22 ? 1 : 0;
    st.plugT = seg(p, 0.04, 0.22);
    st.flags.ccs = p >= 0.24 ? 1 : 0;
    st.flags.csc = p >= 0.24 ? 1 : 0;
    st.pls = p >= 0.24 ? "7" : "—";
    st.dev = p >= 0.28 ? "powered" : "off";
    st.events = [{ l1: "端口事件", l2: "CSC · 端口 1", t: seg(p, 0.42, 0.86), landed: p >= 0.86 }];
    st.evCount = p >= 0.86 ? 1 : 0;
  } else if (frame === 2) {
    st.readBracket = p < 0.22 ? 1 : 0;
    st.write = { l1: "PORTSC", l2: "PR=1", t: seg(p, 0.28, 0.62) };
    st.flags.pr = p >= 0.64 ? 1 : 0;
    st.pls = p >= 0.64 ? "复位" : "7";
    if (p >= 0.7) st.resetPulse = { t: p < 0.82 ? seg(p, 0.7, 0.82) * 0.5 : 0.5 + seg(p, 0.82, 0.94) * 0.5 };
  } else if (frame === 3) {
    const done = p >= 0.06;
    st.flags.prc = done ? 1 : 0;
    st.flags.ped = done ? 1 : 0;
    st.pls = done ? "U0" : "复位";
    st.speed = done ? "FS" : "—";
    st.dev = p >= 0.2 ? "default" : "powered";
    st.events = [{ l1: "端口事件", l2: "PRC", t: seg(p, 0.4, 0.84), landed: p >= 0.84 }];
    st.evCount = p >= 0.84 ? 2 : 1;
  } else if (frame === 4) {
    st.slip = { l1: "Enable Slot", l2: "命令单", t: seg(p, 0.02, 0.3) };
    st.ringPulse = p >= 0.28 && p < 0.5 ? 1 : 0;
    st.bell0 = p >= 0.3 && p < 0.5 ? seg(p, 0.3, 0.36) - seg(p, 0.44, 0.5) : 0;
    st.events = [{ l1: "命令完成", l2: "Slot ID=1", t: seg(p, 0.5, 0.82), landed: p >= 0.82 }];
    st.outctx = p >= 0.84 ? 1 : 0;
    st.outctxT = seg(p, 0.84, 0.97);
    st.slot = p >= 0.9 ? "Enabled" : "—";
    st.evCount = p >= 0.82 ? 3 : 2;
  } else if (frame === 5) {
    const times = { a0: 0.04, a1: 0.12, sport: 0.22, sroute: 0.3, sentries: 0.38, etype: 0.5, mps: 0.58, dcs: 0.66, cerr: 0.74 };
    for (const id of Object.keys(times)) st.filled[id] = p >= times[id] ? 1 : 0;
    st.ep0ready = p >= 0.86 ? 1 : 0;
  } else if (frame === 6) {
    st.slip = { l1: "Address Device", l2: "BSR=0", t: seg(p, 0.02, 0.3) };
    st.ringPulse = p >= 0.28 && p < 0.5 ? 1 : 0;
    st.bell0 = p >= 0.3 && p < 0.5 ? seg(p, 0.3, 0.36) - seg(p, 0.44, 0.5) : 0;
    st.ticket = { l1: "SET_ADDRESS", l2: "新地址 1·示例", t: seg(p, 0.5, 0.78), done: p >= 0.78 };
    st.clips = p >= 0.78 ? [0] : [];
    st.dev = p >= 0.8 ? "address" : "default";
    st.slot = p >= 0.8 ? "Addressed" : "Enabled";
    st.events = [{ l1: "命令完成", l2: "编址", t: seg(p, 0.8, 0.98), landed: p >= 0.98 }];
    st.evCount = p >= 0.98 ? 4 : 3;
  } else if (frame === 7) {
    st.trbs = p >= 0.02 && p < 0.8 ? 3 : 0;
    st.trbsDrop = seg(p, 0.02, 0.24);
    st.bell1 = p >= 0.26 && p < 0.46 ? seg(p, 0.26, 0.32) - seg(p, 0.4, 0.46) : 0;
    if (p < 0.56) st.ticket = { l1: "GET_DESCRIPTOR", l2: "前 8 字节", t: seg(p, 0.3, 0.52), done: p >= 0.52 };
    else if (p < 0.78) st.ticket = { l1: "回 8 字节", l2: "bMaxPacketSize0=8", t: 1 - seg(p, 0.56, 0.76) };
    st.clips = p >= 0.52 ? [0, 1] : [0];
    st.mpsHot = p >= 0.78 ? 1 : 0;
    st.events = [{ l1: "传输事件", l2: "Status 完成", t: seg(p, 0.8, 0.98), landed: p >= 0.98 }];
    st.evCount = p >= 0.98 ? 5 : 4;
  } else if (frame === 8) {
    st.slip = { l1: "Evaluate Context", l2: "A1=1", t: seg(p, 0.02, 0.3) };
    st.ringPulse = p >= 0.28 && p < 0.5 ? 1 : 0;
    st.bell0 = p >= 0.3 && p < 0.5 ? seg(p, 0.3, 0.36) - seg(p, 0.44, 0.5) : 0;
    st.mpsHot = p >= 0.5 ? 1 : 0;
    st.events = [{ l1: "命令完成", l2: "Evaluate", t: seg(p, 0.58, 0.92), landed: p >= 0.92 }];
    st.evCount = p >= 0.92 ? 6 : 5;
  } else if (frame === 9) {
    st.trbs = p >= 0.02 && p < 0.8 ? 3 : 0;
    st.trbsDrop = seg(p, 0.02, 0.2);
    st.bell1 = p >= 0.22 && p < 0.4 ? seg(p, 0.22, 0.28) - seg(p, 0.34, 0.4) : 0;
    if (p < 0.52) st.ticket = { l1: "GET_DESCRIPTOR", l2: "完整描述符", t: seg(p, 0.3, 0.5), done: p >= 0.5 };
    else if (p < 0.72) st.ticket = { l1: "回描述符", l2: "Device+Config", t: 1 - seg(p, 0.52, 0.7) };
    st.clips = p >= 0.5 ? [0, 1, 2] : [0, 1];
    st.descs = p >= 0.72 ? [
      { l1: "Device", l2: "Descriptor", t: seg(p, 0.72, 0.88) },
      { l1: "Config", l2: "Descriptor", t: seg(p, 0.78, 0.94) },
    ] : [];
    st.events = [{ l1: "传输事件", l2: "描述符完成", t: seg(p, 0.8, 0.98), landed: p >= 0.98 }];
    st.evCount = p >= 0.98 ? 7 : 6;
  } else if (frame === 10) {
    st.slip = { l1: "Configure Endpoint", l2: "命令单", t: seg(p, 0.02, 0.26) };
    st.ringPulse = p >= 0.24 && p < 0.44 ? 1 : 0;
    st.bell0 = p >= 0.26 && p < 0.44 ? seg(p, 0.26, 0.32) - seg(p, 0.38, 0.44) : 0;
    st.trbs = p >= 0.3 && p < 0.8 ? 2 : 0;
    st.trbsVariant = 2;
    st.trbsDrop = seg(p, 0.3, 0.44);
    st.bell1 = p >= 0.46 && p < 0.62 ? seg(p, 0.46, 0.52) - seg(p, 0.56, 0.62) : 0;
    st.ticket = { l1: "SET_CONFIGURATION", l2: "选配置", t: seg(p, 0.5, 0.68), done: p >= 0.68 };
    st.clips = p >= 0.68 ? [0, 1, 2, 3] : [0, 1, 2];
    st.dev = p >= 0.74 ? "configured" : "address";
    st.slot = p >= 0.74 ? "Configured" : "Addressed";
    st.events = [
      { l1: "命令完成", l2: "Config EP", t: seg(p, 0.76, 0.93), landed: p >= 0.93 },
      { l1: "传输事件", l2: "SET_CONF", t: seg(p, 0.8, 0.97), landed: p >= 0.97 },
    ];
    st.evCount = p >= 0.97 ? 9 : p >= 0.93 ? 8 : 7;
  } else if (frame === 11) {
    st.done = 1;
  }
  return st;
}

// ---- 绘制 ----
const DEV_NAMES = { off: "未接", powered: "Powered", default: "Default", address: "Address", configured: "Configured" };
const TK_TEXTS = [
  ["SET_ADDRESS", "新地址 1·示例"],
  ["GET_DESC", "前 8 字节"],
  ["GET_DESC", "完整描述符"],
  ["SET_CONF", "选配置"],
];

function draw(st) {
  // 缆形态：接通（静态环纹缆）vs 待接（动垂缆）
  for (const el of cablePluggedEls) el.style.display = st.plug ? "" : "none";
  const droopSvg = st.plug ? "" : (() => {
    const a = D.bossCons, hk = D.hook, bx = D.bossBox;
    const end = st.plugT > 0 ? lerp3(hk, bx, st.plugT) : hk;
    const m1 = lerp3(a, end, 0.38); m1[2] -= 2.6 * (1 - st.plugT);
    const m2 = lerp3(a, end, 0.72); m2[2] -= 1.3 * (1 - st.plugT);
    const pts = [a, m1, m2, end].map((q) => isoPt(q));
    let dd = `M ${f2(pts[0][0])} ${f2(pts[0][1])}`;
    for (let i = 1; i < pts.length; i++) dd += ` Q ${f2((pts[i - 1][0] + pts[i][0]) / 2)} ${f2((pts[i - 1][1] + pts[i][1]) / 2)} ${f2(pts[i][0])} ${f2(pts[i][1])}`;
    return `<path d="${dd}" style="fill:none;stroke:var(--anatomy-mid);stroke-width:1.6"/>` +
      `<circle cx="${f2(pts[3][0])}" cy="${f2(pts[3][1])}" r="2" style="fill:var(--anatomy-lo)"/>`;
  })();
  if (cableDroop.innerHTML !== droopSvg) cableDroop.innerHTML = droopSvg;

  // 信号灯 / 数码窗 / 槽位窗 / 设备灯 / EP0 就绪灯
  for (const f of Object.keys(st.flags)) if (flagEls[f]) flagEls[f].setAttribute("data-on", String(st.flags[f]));
  if (winEls.pls && winEls.pls.textContent !== st.pls) winEls.pls.textContent = st.pls;
  if (winEls.speed && winEls.speed.textContent !== st.speed) winEls.speed.textContent = st.speed;
  if (winEls.slot && winEls.slot.textContent !== st.slot) winEls.slot.textContent = st.slot;
  for (const key of Object.keys(devLamps)) {
    const el = devLamps[key];
    if (!el) continue;
    el.setAttribute("data-on", String(st.dev === key ? 1 : 0));
    el.setAttribute("data-grn", "1");
  }
  if (ep0Ready) ep0Ready.setAttribute("data-on", String(st.ep0ready));

  // 表格卡字段
  for (const id of Object.keys(formCells)) {
    const el = formCells[id];
    if (!el) continue;
    el.setAttribute("data-fill", String(st.filled[id] ? 1 : 0));
    el.setAttribute("data-hot", String(id === "mps" && st.mpsHot ? 1 : 0));
  }
  if (intakeEl) intakeEl.setAttribute("data-ring", String(st.ringPulse));
  readBracket.style.display = st.readBracket ? "" : "none";

  // 门铃钮与簧
  for (const key of ["b0", "b1"]) {
    const { cap, spring, b } = bellEls[key];
    const press = key === "b0" ? st.bell0 : st.bell1;
    const z = lerp(b.rest, b.press, clamp01(press));
    cap.setAttribute("transform", worldTranslate([b.x, b.y, z]));
    const sp = helixSvg([b.x, b.y], 2.0, D.consTop + 4.5, z - 0.1, 4);
    if (spring.innerHTML !== sp) spring.innerHTML = sp;
  }

  // 命令单 / 寄存器写卡
  {
    let h = "";
    if (st.slip && st.slip.t < 1) {
      const pos = SLIP_PATH.at(st.slip.t);
      const op = st.slip.t > 0.93 ? f2(1 - (st.slip.t - 0.93) / 0.07) : 1;
      h += `<g transform="${worldTranslate(pos)}" opacity="${op}">${slipSvg(st.slip.l1, st.slip.l2)}</g>`;
    }
    if (st.write && st.write.t < 1) {
      const pos = WRITE_PATH.at(st.write.t);
      const op = st.write.t > 0.93 ? f2(1 - (st.write.t - 0.93) / 0.07) : 1;
      h += `<g transform="${worldTranslate(pos)}" opacity="${op}">${writeSvg(st.write.l1, st.write.l2)}</g>`;
    }
    if (layers["actors-slips"].innerHTML !== h) layers["actors-slips"].innerHTML = h;
  }

  // 票据（沿缆行走 + 挂票据带 + 复位脉冲；挂卡先发卡面、后发文字）
  {
    let h = "", ht = "";
    if (st.ticket && !st.ticket.done) {
      const pos = CABLE.at(clamp01(st.ticket.t));
      h += `<g transform="${worldTranslate([pos[0], pos[1], pos[2] + 2.1])}">${ticketSvg(st.ticket.l1, st.ticket.l2)}</g>`;
    }
    st.clips.forEach((ix) => {
      const p = ticketClipParts(TK_TEXTS[ix][0], TK_TEXTS[ix][1], D.railClips[ix] + 0.5);
      h += p.solid;
      ht += p.text;
    });
    if (st.resetPulse) {
      const pos = CABLE.at(st.resetPulse.t);
      const pt = isoPt([pos[0], pos[1], pos[2] + 2.4]);
      h += `<circle cx="${f2(pt[0])}" cy="${f2(pt[1])}" r="2.4" style="fill:none;stroke:var(--xhp-hc);stroke-width:1.2"/><circle cx="${f2(pt[0])}" cy="${f2(pt[1])}" r="0.9" style="fill:var(--xhp-hc)"/>`;
    }
    const all = h + ht;
    if (layers["actors-tickets"].innerHTML !== all) layers["actors-tickets"].innerHTML = all;
  }

  // 事件卡（沿回流管 + 事件匣 2×2 格 × z 层堆叠；被同格上层卡盖住的卡只留卡背，
  // 文字统一后发——停留态不盖字）
  {
    let h = "", ht = "";
    st.events.forEach((ev) => {
      if (ev.landed) return;
      h += `<g transform="${worldTranslate(TUBE.at(ev.t))}">${evSvg(ev.l1, ev.l2)}</g>`;
    });
    for (let i = 0; i < st.evCount; i++) {
      const col = i % 2, row = Math.floor(i / 2) % 2, lay = Math.floor(i / 4);
      const at = [D.evTray.x - 4.5 + col * 13.1, D.evTray.y - 0.1 - row * 8.4, D.evTray.z + lay * 1.05];
      const tr = `<g transform="${worldTranslate(at)}">`;
      if (i + 4 < st.evCount) h += tr + evBlank() + `</g>`;
      else {
        const p = evCardParts("事件", String(i + 1));
        h += tr + p.solid + `</g>`;
        ht += tr + p.text + `</g>`;
      }
    }
    const all = h + ht;
    if (layers["actors-events"].innerHTML !== all) layers["actors-events"].innerHTML = all;
  }

  // 描述符卡（总控台顶 → 收件匣对角双卡位；卡面先行、文字后发）
  {
    let h = "", ht = "";
    st.descs.forEach((dc) => {
      const t = clamp01(dc.t);
      const to = dc.l1 === "Device" ? [-146.6, -8.2, D.descTray.z] : [-133.4, -14.4, D.descTray.z];
      const pos = lerp3(D.descFrom, to, t);
      pos[2] += Math.sin(Math.PI * t) * 7;
      const p = descCardParts(dc.l1, dc.l2);
      const tr = `<g transform="${worldTranslate(pos)}">`;
      h += tr + p.solid + `</g>`;
      ht += tr + p.text + `</g>`;
    });
    const all = h + ht;
    if (!draw._descLayer) { draw._descLayer = document.createElementNS("http://www.w3.org/2000/svg", "g"); layers["actors-cards"].insertBefore(draw._descLayer, trbLayer); }
    if (draw._descLayer.innerHTML !== all) draw._descLayer.innerHTML = all;
  }

  // TRB 小卡（EP0 环台槽位，落下动画）
  {
    let h = "";
    const labels = st.trbsVariant === 2 ? ["S", "St"] : ["S", "D", "St"];
    for (let i = 0; i < st.trbs; i++) {
      const slot = D.trbSlots[i];
      const drop = clamp01(st.trbsDrop);
      const z = slot.z + (1 - drop) * 8;
      h += `<g transform="${worldTranslate([slot.x, slot.y, z])}">${trbSvg(labels[i])}</g>`;
    }
    if (trbLayer.innerHTML !== h) trbLayer.innerHTML = h;
  }

  // 输出上下文卡（F4 飞行插入 DCBAA 1 号格）
  {
    let h = "";
    if (st.outctx && st.outctxT < 1) {
      const to = [D.outctxTo.cx, D.outctxTo.cy, 0];
      const pos = lerp3(D.outctxFrom, [to[0], to[1], D.outctxTo.z], st.outctxT);
      pos[2] += Math.sin(Math.PI * st.outctxT) * 6;
      h += `<g transform="${worldTranslate(pos)}">${outctxFlySvg()}</g>`;
    } else if (st.outctx) {
      h += outctxRestSvg();
    }
    if (ocLayer.innerHTML !== h) ocLayer.innerHTML = h;
  }

  // 读数
  const ro = `设备 ${DEV_NAMES[st.dev] || st.dev} · 槽 ${st.slot} · PLS ${st.pls} · 事件 ${st.evCount}` + (st.done ? " · 完工" : "");
  if (readout.textContent !== ro) readout.textContent = ro;
}

// ---- 帧机 ----
let frame = 0, p = 0;
let mode = still.matches ? "hold" : "tour";
let last = 0, visible = false, raf = 0;
let quietTimer = 0;

function arm() {
  clearTimeout(quietTimer);
  quietTimer = setTimeout(() => { if (!still.matches) { mode = "tour"; run(); } }, 8000);
}
function setFrame(f, pp = 0) {
  frame = Math.max(0, Math.min(11, f));
  p = Math.max(0, Math.min(1, pp));
  draw(computeState(frame, p));
  statusEl.textContent = FRAME_NAMES[frame];
}
function next() { setFrame((frame + 1) % 12, 0); mode = still.matches ? "hold" : "play"; arm(); run(); }
function prev() { setFrame((frame + 11) % 12, 1); mode = "hold"; arm(); run(); }

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (mode !== "hold" && !still.matches) {
    p += dt / DUR[frame];
    if (p >= 1) {
      if (mode === "tour") { frame = (frame + 1) % 12; p = 0; statusEl.textContent = FRAME_NAMES[frame]; }
      else { p = 1; mode = "hold"; }
    }
  }
  draw(computeState(frame, p));
  raf = visible && mode !== "hold" ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!raf && visible) { last = 0; raf = requestAnimationFrame(tick); } };
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "120px 0px" }).observe(stage);

stage.addEventListener("pointerdown", () => { next(); });
stage.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "ArrowRight") { e.preventDefault(); next(); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
  else if (/^[0-9]$/.test(e.key)) { setFrame(Number(e.key)); mode = still.matches ? "hold" : "play"; arm(); run(); }
  else if (e.key === "q" || e.key === "Q") { setFrame(10); mode = "play"; arm(); run(); }
  else if (e.key === "w" || e.key === "W") { setFrame(11); mode = "play"; arm(); run(); }
  else if (e.key === "r" || e.key === "R") { setFrame(0); mode = "hold"; arm(); run(); }
  else if (e.key === "a" || e.key === "A") { mode = still.matches ? "hold" : "tour"; p = 0; run(); }
});
document.addEventListener("visibilitychange", () => { if (!document.hidden) run(); });

window.__fig43 = {
  setFrame(f, pp) { setFrame(f, pp); mode = "hold"; run(); },
  get frame() { return frame; },
  get p() { return p; },
  state() { return computeState(frame, p); },
};

setFrame(0, 0);
run();

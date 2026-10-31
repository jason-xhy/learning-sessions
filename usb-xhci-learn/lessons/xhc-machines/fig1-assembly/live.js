const D = __DATA__;
const P = D.P;
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const $ = (s) => svg.querySelector(s);
const readout = document.querySelector("[data-readout]");
const statusEl = document.querySelector("[data-status]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

const ORIG = D.ORIG, BX = D.BX, BY = D.BY, BZ = D.BZ;
const TAU = Math.PI * 2;
const f2 = (v) => Math.round(v * 100) / 100;
const ease = (t) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };
const seg = (p, a, b) => ease((p - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const lerp2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const angLerp = (a, b, t) => { let d = ((b - a) % 360 + 540) % 360 - 180; return a + d * t; };

// ---- 二维仿射（局部平面系 → 屏幕） ----
function mul2(A, B) {
  return [
    [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
    [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]],
  ];
}
function inv2(M) {
  const d = M[0][0] * M[1][1] - M[0][1] * M[1][0];
  return [[M[1][1] / d, -M[0][1] / d], [-M[1][0] / d, M[0][0] / d]];
}
function planMatrix(ang, cx, cy, z) {
  const a = (ang * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const M = [[BX[0], BY[0]], [BX[1], BY[1]]];
  const A = mul2(mul2(M, [[c, -s], [s, c]]), inv2(M));
  const tx = ORIG[0] + M[0][0] * cx + M[0][1] * cy + BZ[0] * z - (A[0][0] * ORIG[0] + A[0][1] * ORIG[1]);
  const ty = ORIG[1] + M[1][0] * cx + M[1][1] * cy + BZ[1] * z - (A[1][0] * ORIG[0] + A[1][1] * ORIG[1]);
  return `matrix(${f2(A[0][0])} ${f2(A[1][0])} ${f2(A[0][1])} ${f2(A[1][1])} ${f2(tx)} ${f2(ty)})`;
}
const worldTranslate = (dx, dy, dz) => `translate(${f2(BX[0] * dx + BY[0] * dy + BZ[0] * dz)} ${f2(BX[1] * dx + BY[1] * dy + BZ[1] * dz)})`;

// ---- DOM refs ----
const fxLayer = $('[data-part="fixtures"]');
for (let i = 0; i < 3; i++) {
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("data-fx", String(i));
  fxLayer.appendChild(g);
}
const headLayer = $('[data-part="actors-head"]');
const bellLayer = $('[data-part="actors-bell"]');
const dialLayer = $('[data-part="actors-dial"]');
const gantryLayer = $('[data-part="actors-gantry"]');
const cardsLayer = $('[data-part="actors-cards"]');
const bandEls = [0, 1, 2, 3].map((i) => $(`[data-band="${i}"]`));
const lampEls = [0, 1, 2].map((i) => $(`[data-lamp="${i}"]`));
const plaqueEls = [0, 1, 2, 3].map((i) => $(`[data-plaque="${i}"]`));

// 预建卡内容组
const cardEls = {};
for (const type of ["setup", "data", "status"]) {
  for (const st of Object.keys(D.cards[type])) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("data-card", `${type}-${st}`);
    g.style.display = "none";
    g.innerHTML = D.cards[type][st];
    cardsLayer.appendChild(g);
    cardEls[`${type}-${st}`] = g;
  }
}
// URB 工作单（立插进件槽的竖卡：预建于终位，落差用纯 z 平移）
const urbEl = document.createElementNS("http://www.w3.org/2000/svg", "g");
{
  const URB_Z0 = 23.9;
  const slab = { x: -184, y: 29.8, w: 36, d: 1.4, r: 1 };
  urbEl.innerHTML =
    `<g class="ac-urbcard">` +
    solidSvg(slabOf(slab, URB_Z0, 15.6, P, 2, 0.4), { tone: "hi", crease: "lo" }) +
    `</g>` +
    `<g class="ac-lit">` +
    solidSvg(slabOf({ x: -184.6, y: 29.7, w: 37.2, d: 1.6, r: 1 }, URB_Z0, 1.5, P, 2, 0.3), { tone: "mid", crease: "none" }) +
    `</g>` + D.urbCard;
  urbEl.style.display = "none";
  cardsLayer.appendChild(urbEl);
}
// 回执小卡
const rcptEl = document.createElementNS("http://www.w3.org/2000/svg", "g");
{
  const plan = { x: -4.5, y: -3, w: 9, d: 6, r: 1 };
  const t = (u, v, s, size) => {
    const sc = iso([u, v, 0], P);
    return `<text class="ac-cardtext" data-tone="hi" x="${f2(sc[0])}" y="${f2(sc[1] + 0.45 * D.KS)}" font-size="${f2(size * D.KS)}" text-anchor="middle">${s}</text>`;
  };
  rcptEl.innerHTML = `<g class="ac-lit">` + solidSvg(slabOf(plan, -0.4, 0.4, P, 2, 0.3), { tone: "hi", crease: "lo" }) + `</g>` +
    t(0, 0.8, "回执", 2.4) + t(0, -1.4, "TD完成", 2.0);
  rcptEl.style.display = "none";
  cardsLayer.appendChild(rcptEl);
}
// 压头导杆（变长度：重绘）
const rodsEl = document.createElementNS("http://www.w3.org/2000/svg", "g");
headLayer.appendChild(rodsEl);
// 压头（纯 z 平移：预建于 z=0，含冲压硬质垫板）
const headEl = document.createElementNS("http://www.w3.org/2000/svg", "g");
{
  const H = D.press.head;
  const plan = { x: H.x0, y: H.y0, w: H.x1 - H.x0, d: H.y1 - H.y0, r: H.r };
  const z0 = -6; // 预建时底面在 -6，平移 z 为头底面高度
  headEl.innerHTML =
    `<g class="ac-head">` +
    solidSvg(slabOf(plan, z0 + 1.1, 4.9, P, 3, 0.8), { tone: "mid", crease: "lo" }) +
    solidSvg(slabOf({ x: H.x0 + 1.5, y: H.y0 + 1.5, w: H.x1 - H.x0 - 3, d: H.y1 - H.y0 - 3, r: 1 }, z0, 1.1, P, 2, 0.3), { tone: "hi", crease: "none" }) +
    `</g>`;
  headLayer.appendChild(headEl);
}
// 门铃钮帽（纯 z 平移）
const capEl = document.createElementNS("http://www.w3.org/2000/svg", "g");
{
  const B = D.bell;
  capEl.innerHTML = `<g data-part="bell-cap"><g data-part="bell-flash">` +
    solidSvg(cylinder(0, 0, B.capR, 0, B.capH, P, 28, 0.4), { tone: "hi" }) +
    dotsSvg([iso([0, 0, B.capH], P)], { size: 1, tone: "hi" }) + `</g></g>`;
  bellLayer.appendChild(capEl);
}
// 龙门滑车（纯 x 平移）
const carEl = document.createElementNS("http://www.w3.org/2000/svg", "g");
{
  const G = D.gantry;
  carEl.innerHTML = `<g data-part="carriage">` +
    solidSvg(slabOf({ x: -G.carriage.hw, y: 12.5, w: G.carriage.hw * 2, d: 3, r: 0.8 }, G.railZ, 5, P, 2, 0.5), { tone: "hi", crease: "lo" }) +
    dotsSvg([iso([-G.carriage.hw + 1.4, 14, G.railZ + 5], P), iso([G.carriage.hw - 1.4, 14, G.railZ + 5], P)], { size: 0.45, tone: "mid" }) +
    `</g>`;
  gantryLayer.appendChild(carEl);
}
// 臂/杆/吸盘（变长度：重绘）
const armEl = document.createElementNS("http://www.w3.org/2000/svg", "g");
gantryLayer.appendChild(armEl);
// 指示仪双针（重绘）
const needleEl = document.createElementNS("http://www.w3.org/2000/svg", "g");
dialLayer.appendChild(needleEl);
// 门铃簧（长度变：重绘）
const coilEl = document.createElementNS("http://www.w3.org/2000/svg", "g");
bellLayer.appendChild(coilEl);

function helixSvg(c, r, z0, z1, turns, tone) {
  const n = Math.max(24, Math.round(turns * 22));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = t * turns * TAU;
    pts.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), z0 + (z1 - z0) * t]);
  }
  const d = pathOf(pts.map((p) => iso(p, P)));
  return lineSvg(d, { tone }) +
    dotsSvg([iso(pts[0], P), iso(pts[pts.length - 1], P)], { size: 0.55, tone: "mid" });
}
function needleSvg(ang, r, tone) {
  const c = D.dial.c, z = D.dial.z;
  const a = (ang * Math.PI) / 180;
  const dx = Math.cos(a), dy = Math.sin(a);
  const tail = [c[0] - dx * 1.3, c[1] - dy * 1.3];
  const tip = [c[0] + dx * r, c[1] + dy * r];
  return lineSvg(lineOnTop(tail, tip, z, P), { tone }) +
    dotsSvg([iso([tail[0], tail[1], z], P), iso([tip[0], tip[1], z], P)], { size: 0.5, tone: tone === "lit" ? "hi" : "mid" });
}

// ---- 夹具重绘 ----
const FX = D.fixturePlans;
const fxSig = ["", "", ""];
const fxPos = [[0, 0], [0, 0], [0, 0]];
function drawFixture(i, type, ang, pos, zb, stage, lit) {
  const sig = `${ang}|${f2(pos[0])}|${f2(pos[1])}|${f2(zb)}|${stage}|${lit ? 1 : 0}`;
  const el = $(`[data-fx="${i}"]`);
  const cardEl = cardEls[`${type}-${stage}`];
  if (!el || !cardEl) {
    for (const key of Object.keys(cardEls)) {
      if (key.startsWith(type + "-")) cardEls[key].style.display = "none";
    }
    return;
  }
  const show = sig !== fxSig[i];
  if (show) {
    const rot = (plan) => {
      const a = (ang * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a);
      return roundedPlan(plan, 3).map(([u, v]) => [pos[0] + u * co - v * si, pos[1] + u * si + v * co]);
    };
    const ex = (plan, z0, h, tone) => solidSvg(extrude(rot(plan), zb + z0, h, P, { convex: true }), { tone });
    el.innerHTML = `<g class="ac-fixture${lit ? " ac-lit" : ""}">` +
      `<g class="fx-brass">` + ex(FX.base, 0, 2.5, "mid") + ex(FX.earN, 0, 3.6, "mid") + ex(FX.earS, 0, 3.6, "mid") + ex(FX.tray, 2.5, 2, "mid") + `</g>` +
      ex(FX.card, 4.5, 0.8, "hi") + `</g>`;
    fxSig[i] = sig;
  }
  fxPos[i] = pos;
  // 卡内容：显示对应阶段，其余隐藏
  for (const key of Object.keys(cardEls)) {
    if (key.startsWith(type + "-")) cardEls[key].style.display = "none";
  }
  cardEl.style.display = "";
  cardEl.setAttribute("transform", planMatrix(ang, pos[0], pos[1], zb + FX.cardZ[1] + 0.03));
}

// ---- 回执管路径采样 ----
const RCPT = (() => {
  const pts = D.receipt.route;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]);
    cum.push(cum[i - 1] + d);
  }
  const total = cum[cum.length - 1];
  return { cum, total, at(t) {
    const s = t * total;
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const t0 = cum[i - 1], t1 = cum[i];
    const u = t1 > t0 ? (s - t0) / (t1 - t0) : 0;
    return lerp3(pts[i - 1], pts[i], u);
  } };
})();
function lerp3(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

// ---- 状态（纯函数） ----
const REST = D.fixtureRest;
const STOP = D.stampStop;
const QUEUE = D.stampQueue;
const SLOTS = D.slots;
const CONV_Z = D.convZ, SLOT_Z = D.slotsZ, CARR_Z = 16;
const STACK_Z = (i) => D.palletZ + i * 5.6;
const FX_TYPES = ["setup", "data", "status"];
const HEAD_REST = D.press.restZ, HEAD_STAMP = D.press.stampZ;
const FRAME_NAMES = [
  "F0 静止全景", "F1 文书台：URB 入槽 · 调用栈点亮", "F2 冲压台：3 颗 TRB 位域卡打号",
  "F3 入环与门铃：DB Target=1 (EP0)", "F4 xHC 取件：包序灯亮", "F5 完成回流：回执返台",
];

function pressZat(p, t0) {
  // 一记冲压：0-0.5 下落，0.5-1 回升
  if (p < 0 || p >= 1) return HEAD_REST;
  return p < 0.5 ? lerp(HEAD_REST, HEAD_STAMP, ease(p * 2)) : lerp(HEAD_STAMP, HEAD_REST, ease((p - 0.5) * 2));
}

function computeState(frame, p) {
  const st = {
    fx: REST.map((r, i) => ({ pos: [r[0], r[1]], ang: 0, zb: CONV_Z, stage: "s0", lit: false, type: FX_TYPES[i] })),
    head: HEAD_REST, carriage: 0, armY: 14, padZ: 24.1, carried: -1,
    enq: 180, deq: 180, bellCap: D.bell.restCap, bellFlash: false,
    bands: [0, 0, 0, 0], lamps: [0, 0, 0], plaques: [0, 0, 0, 0],
    urbZ: -1, urbVis: false, rcpt: -1, rcptVis: false, rcptLand: false,
    td: 0, bells: 0, packets: 0, done: false,
  };
  if (frame === 1) {
    st.urbVis = true;
    st.urbZ = p < 0.12 ? lerp(40, D.urbSlot[2], ease(p / 0.12)) : D.urbSlot[2];
    [0.15, 0.32, 0.49, 0.66].forEach((t, i) => { if (p >= t) st.plaques[i] = 1; });
  } else if (frame >= 2) {
    st.urbVis = true;
    st.urbZ = D.urbSlot[2];
    st.plaques = [1, 1, 1, 1];
  }
  if (frame === 2) {
    // 三夹具依次上冲压位、两记冲压、前进排队
    const plan = [
      { from: REST[0][0], stamps: [0.07, 0.13], leave: 0.19, to: QUEUE[0] },
      { from: REST[1][0], stamps: [0.31, 0.37], leave: 0.43, to: QUEUE[1] },
      { from: REST[2][0], stamps: [0.55, 0.61], leave: null, to: STOP[0] },
    ];
    plan.forEach((c, i) => {
      const fx = st.fx[i];
      if (p < c.stamps[0]) {
        fx.pos[0] = lerp(c.from, STOP[0], seg(p, i === 0 ? 0 : [0, 0.24, 0.48][i], c.stamps[0]));
        fx.lit = p > [0, 0.24, 0.48][i] && p < c.stamps[1] + 0.06;
      } else if (p < c.stamps[1]) {
        fx.pos[0] = STOP[0];
        fx.lit = true;
        fx.stage = "s1";
      } else if (c.leave === null || p < c.leave) {
        fx.pos[0] = STOP[0];
        fx.stage = "s2";
        fx.lit = p < (c.stamps[1] + 0.06);
      } else {
        fx.pos[0] = lerp(STOP[0], c.to, seg(p, c.leave, c.leave + 0.05));
        fx.stage = "s2";
      }
    });
    st.head = p < 0.07 ? HEAD_REST
      : p < 0.19 ? pressZat((p - 0.07) / 0.12, 0)
      : p < 0.31 ? HEAD_REST
      : p < 0.43 ? pressZat((p - 0.31) / 0.12, 0)
      : p < 0.55 ? HEAD_REST
      : p < 0.67 ? pressZat((p - 0.55) / 0.12, 0)
      : HEAD_REST;
    st.td = (p >= 0.19 ? 1 : 0) + (p >= 0.43 ? 1 : 0) + (p >= 0.67 ? 1 : 0);
  } else if (frame === 3) {
    st.td = 3;
    st.fx.forEach((fx, i) => { fx.stage = "s2"; fx.pos = [QUEUE[i], STOP[1]]; });
    const CYC = 0.28;
    for (let i = 0; i < 3; i++) {
      const t0 = i * CYC, q = (p - t0) / CYC;
      if (q < 0 || q >= 1) continue;
      const fx = st.fx[i];
      const from = [QUEUE[i], STOP[1]];
      const slot = SLOTS[i];
      const fromX = i === 0 ? 0 : SLOTS[i - 1].x;
      const fromArm = i === 0 ? 14 : SLOTS[i - 1].y;
      fx.lit = q > 0.3 && q < 0.78;
      if (q < 0.18) st.carriage = lerp(fromX, from[0], seg(q, 0, 0.18));
      else if (q < 0.25) { st.carriage = from[0]; st.armY = lerp(fromArm, from[1], seg(q, 0.18, 0.25)); }
      else if (q < 0.32) { st.carriage = from[0]; st.armY = from[1]; st.padZ = lerp(24.1, CONV_Z + 5.4, seg(q, 0.25, 0.32)); }
      else if (q < 0.38) { st.carried = i; fx.pos = from; fx.ang = 0; fx.zb = lerp(CONV_Z, CARR_Z, seg(q, 0.32, 0.38)); st.carriage = from[0]; st.armY = from[1]; st.padZ = fx.zb + 5.4; }
      else if (q < 0.65) {
        const m = seg(q, 0.38, 0.65);
        st.carried = i;
        fx.pos = lerp2(from, [slot.x, slot.y], m);
        fx.ang = angLerp(0, slot.ang, m);
        fx.zb = CARR_Z;
        st.carriage = lerp(from[0], slot.x, m);
        st.armY = lerp(from[1], slot.y, m);
        st.padZ = CARR_Z + 5.4;
      } else if (q < 0.74) {
        st.carried = i;
        fx.pos = [slot.x, slot.y]; fx.ang = slot.ang;
        fx.zb = lerp(CARR_Z, SLOT_Z, seg(q, 0.65, 0.74));
        st.carriage = slot.x; st.armY = slot.y; st.padZ = fx.zb + 5.4;
      } else if (q < 0.78) {
        // 释放：色带翻色 · Cycle 发布 · ENQ 推进
        st.carried = -1;
        fx.pos = [slot.x, slot.y]; fx.ang = slot.ang; fx.zb = SLOT_Z; fx.stage = "s3";
        st.bands[i] = 1;
        st.carriage = slot.x; st.armY = slot.y;
        st.enq = angLerp(D.dial.slotAng[i], D.dial.slotAng[i + 1] ?? 270, seg(q, 0.74, 0.78));
      } else {
        st.bands[i] = 1;
        st.enq = D.dial.slotAng[i + 1] ?? 270;
        st.carriage = slot.x; st.armY = slot.y;
        st.padZ = lerp(SLOT_Z + 5.4, 24.1, seg(q, 0.78, 0.9));
      }
      break; // 一帧内只有当前循环在动，之前循环已就位
    }
    // 早于当前循环的夹具已在槽内（stage s3）
    const doneIdx = Math.min(3, Math.floor(p / CYC));
    for (let i = 0; i < doneIdx; i++) {
      const fx = st.fx[i];
      const slot = SLOTS[i];
      const rel = i * CYC + 0.74 * CYC;
      if (p >= rel) { fx.pos = [slot.x, slot.y]; fx.ang = slot.ang; fx.zb = SLOT_Z; fx.stage = "s3"; }
      else { fx.pos = [slot.x, slot.y]; fx.ang = slot.ang; fx.zb = CARR_Z; fx.stage = "s2"; }
      st.bands[i] = p >= rel ? 1 : 0;
    }
    if (p >= 3 * CYC) {
      st.enq = 270;
      for (let i = 0; i < 3; i++) { const slot = SLOTS[i]; Object.assign(st.fx[i], { pos: [slot.x, slot.y], ang: slot.ang, zb: SLOT_Z, stage: "s3", lit: false }); st.bands[i] = 1; }
      st.carriage = SLOTS[2].x; st.armY = SLOTS[2].y; st.padZ = 24.1;
    }
    // 门铃
    if (p >= 0.86) {
      const q = (p - 0.86) / 0.14;
      st.bellCap = q < 0.3 ? lerp(D.bell.restCap, D.bell.pressCap, ease(q / 0.3))
        : q < 0.6 ? D.bell.pressCap
        : lerp(D.bell.pressCap, D.bell.restCap, ease((q - 0.6) / 0.4));
      st.bells = q >= 0.3 ? 1 : 0;
      st.bellFlash = q >= 0.25 && q < 0.75;
    }
  } else if (frame === 4) {
    st.td = 3; st.bells = 1;
    st.enq = 270;
    for (let i = 0; i < 3; i++) { const slot = SLOTS[i]; Object.assign(st.fx[i], { pos: [slot.x, slot.y], ang: slot.ang, zb: SLOT_Z, stage: "s3" }); st.bands[i] = 1; }
    const CYC = 0.30;
    for (let i = 0; i < 3; i++) {
      const t0 = i * CYC, q = (p - t0) / CYC;
      if (q < 0 || q >= 1) continue;
      const fx = st.fx[i];
      const slot = SLOTS[i];
      const drop = [D.palletPos[0], D.palletPos[1]];
      const fromX = i === 0 ? 0 : D.palletPos[0];
      const fromArm = i === 0 ? 14 : D.palletPos[1];
      fx.lit = q > 0.2 && q < 0.72;
      if (q < 0.15) st.carriage = lerp(fromX, slot.x, seg(q, 0, 0.15));
      else if (q < 0.21) { st.carriage = slot.x; st.armY = lerp(fromArm, slot.y, seg(q, 0.15, 0.21)); }
      else if (q < 0.26) { st.carriage = slot.x; st.armY = slot.y; st.padZ = lerp(24.1, SLOT_Z + 5.4, seg(q, 0.21, 0.26)); }
      else if (q < 0.33) {
        // 读脉冲：包序灯亮 · 色带褪回旧色 · DEQ 推进
        st.carriage = slot.x; st.armY = slot.y; st.padZ = SLOT_Z + 5.4;
        if (q >= 0.24) { st.lamps[i] = 1; st.packets = i + 1; st.bands[i] = 0; st.deq = D.dial.slotAng[i + 1] ?? 270; }
      } else if (q < 0.39) {
        st.carried = i; fx.zb = lerp(SLOT_Z, CARR_Z, seg(q, 0.33, 0.39));
        st.carriage = slot.x; st.armY = slot.y; st.padZ = fx.zb + 5.4;
      } else if (q < 0.60) {
        const m = seg(q, 0.39, 0.60);
        st.carried = i;
        fx.pos = lerp2([slot.x, slot.y], drop, m);
        fx.ang = angLerp(slot.ang, 0, m);
        fx.zb = CARR_Z;
        st.carriage = lerp(slot.x, drop[0], m);
        st.armY = lerp(slot.y, drop[1], m);
        st.padZ = CARR_Z + 5.4;
      } else if (q < 0.68) {
        st.carried = i;
        fx.pos = drop; fx.ang = 0;
        fx.zb = lerp(CARR_Z, STACK_Z(i), seg(q, 0.60, 0.68));
        st.carriage = drop[0]; st.armY = drop[1]; st.padZ = fx.zb + 5.4;
      } else if (q < 0.72) {
        st.carried = -1;
        fx.pos = drop; fx.ang = 0; fx.zb = STACK_Z(i);
        st.carriage = drop[0]; st.armY = drop[1];
        st.padZ = lerp(STACK_Z(i) + 5.4, 24.1, seg(q, 0.68, 0.72));
      } else {
        st.padZ = 24.1;
        st.carriage = drop[0]; st.armY = drop[1];
      }
      break;
    }
    const doneIdx = Math.min(3, Math.floor(p / CYC));
    for (let i = 0; i < doneIdx; i++) {
      const fx = st.fx[i];
      const consumed = p >= i * CYC + 0.72 * CYC;
      if (consumed) { fx.pos = [D.palletPos[0], D.palletPos[1]]; fx.ang = 0; fx.zb = STACK_Z(i); fx.lit = false; }
      st.lamps[i] = 1;
      if (consumed) st.bands[i] = 0;
      st.packets = Math.max(st.packets, i + 1);
    }
    if (p >= 3 * CYC) {
      for (let i = 0; i < 3; i++) { Object.assign(st.fx[i], { pos: [D.palletPos[0], D.palletPos[1]], ang: 0, zb: STACK_Z(i), lit: false }); st.bands[i] = 0; st.lamps[i] = 1; }
      st.packets = 3; st.deq = 270;
      st.carriage = lerp(D.palletPos[0], 0, seg(p, 0.9, 1));
      st.armY = lerp(D.palletPos[1], 14, seg(p, 0.9, 1));
      st.carried = -1; st.padZ = 24.1;
    }
  } else if (frame === 5) {
    st.td = 3; st.bells = 1; st.packets = 3;
    st.enq = 270; st.deq = 270;
    for (let i = 0; i < 3; i++) {
      Object.assign(st.fx[i], { pos: [D.palletPos[0], D.palletPos[1]], ang: 0, zb: STACK_Z(i), stage: "s3" });
      st.bands[i] = 0; st.lamps[i] = 1;
    }
    st.plaques = [1, 1, 1, 1];
    st.urbVis = true; st.urbZ = D.urbSlot[2];
    if (p < 0.55) { st.rcptVis = true; st.rcpt = ease(p / 0.55); }
    else if (p < 0.62) { st.rcptVis = true; st.rcpt = 1; st.rcptLand = true; }
    else { st.rcptVis = true; st.rcpt = 1; st.rcptLand = true; st.done = true; }
    st.carriage = 0; st.armY = 14; st.padZ = 24.1;
  }
  return st;
}

// ---- 绘制 ----
let cur = { sig: "" };
function draw(st, frame, p) {
  // 夹具
  for (let i = 0; i < 3; i++) {
    const fx = st.fx[i];
    drawFixture(i, fx.type, fx.ang, fx.pos, fx.zb, fx.stage, fx.lit);
  }
  // 被搬运夹具的绘制次序已在 fixtures 层；龙门
  carEl.setAttribute("transform", worldTranslate(st.carriage, 0, 0));
  const G = D.gantry;
  const armY0 = st.armY < 14 ? 12.5 : 15.5;
  const armLen = Math.abs(st.armY - armY0);
  let armSvg = "";
  if (armLen > 1.5) {
    const y0 = Math.min(armY0, st.armY), y1 = Math.max(armY0, st.armY);
    armSvg += solidSvg(slabOf({ x: st.carriage - 1.6, y: y0, w: 3.2, d: y1 - y0, r: 0.8 }, G.armZ, 3, P, 2, 0.4), { tone: "mid", crease: "lo" });
  }
  if (st.padZ < 23.4) {
    const stemTop = G.armZ, stemBot = st.padZ + 0.9;
    if (stemBot < stemTop - 0.5) {
      armSvg += solidSvg(cylinder(st.carriage, st.armY, 1.1, stemBot, stemTop - stemBot, P, 14), { tone: "mid" });
    }
    armSvg += solidSvg(cylinder(st.carriage, st.armY, G.padR, st.padZ, 0.9, P, 24, 0.3), { tone: "hi", crease: "none" });
  }
  armEl.innerHTML = armSvg;
  // 压头与其导杆
  headEl.setAttribute("transform", worldTranslate(0, 0, st.head + 6));
  {
    const H = D.press.head;
    const zTop = st.head + 6;
    let rods = "";
    if (42 - zTop > 0.6) {
      for (const gy of [34, 42]) {
        rods += solidSvg(cylinder(-90, gy, 0.9, zTop, 42 - zTop, P, 12), { tone: "mid" });
      }
    }
    rodsEl.innerHTML = rods;
  }
  // 门铃
  capEl.setAttribute("transform", worldTranslate(D.bell.c[0], D.bell.c[1], st.bellCap));
  const B = D.bell;
  coilEl.innerHTML = helixSvg(B.c, 1.7, B.baseTop, st.bellCap - 0.15, 4, "lo");
  capEl.querySelector("[data-part='bell-flash']").classList.toggle("ac-flash", st.bellFlash);
  // 双针
  needleEl.innerHTML = needleSvg(st.enq, 5.2, "lit") + needleSvg(st.deq, 3.9, "mid");
  // URB 工作单（立卡：终位已在预建内，落差纯 z 平移）
  urbEl.style.display = st.urbVis ? "" : "none";
  if (st.urbVis) urbEl.setAttribute("transform", worldTranslate(0, 0, st.urbZ - 23.9));
  // 回执小卡
  rcptEl.style.display = st.rcptVis ? "" : "none";
  if (st.rcptVis) {
    const pos = st.rcptLand ? [-129.5, 10, 26.9] : RCPT.at(st.rcpt);
    rcptEl.setAttribute("transform", worldTranslate(pos[0], pos[1], pos[2] + 1.05));
  }
  // 色带 / 灯 / 栈牌
  st.bands.forEach((v, i) => { if (bandEls[i]) bandEls[i].setAttribute("data-on", String(v)); });
  st.lamps.forEach((v, i) => { if (lampEls[i]) lampEls[i].setAttribute("data-on", String(v)); });
  st.plaques.forEach((v, i) => { if (plaqueEls[i]) plaqueEls[i].setAttribute("data-lit", String(v)); });
  // 读数
  const ro = `TD 装配 ${st.td}/3 · 门铃 ${st.bells} · 包序 ${st.packets}/3` + (st.done ? " · 完成 1" : "");
  if (readout.textContent !== ro) readout.textContent = ro;
  const sig = `${frame}|${Math.round(p * 200)}`;
  if (sig !== cur.sig) {
    cur.sig = sig;
    stage.setAttribute("aria-valuetext", `${FRAME_NAMES[frame]} — ${ro}`);
  }
}

// ---- 帧机 ----
const DUR = [3, 5, 12, 14, 12, 6];
let frame = 0, p = 0;
let mode = still.matches ? "hold" : "tour";   // tour | play | hold
let last = 0, visible = false, raf = 0;
let quietTimer = 0;

function armTour() {
  clearTimeout(quietTimer);
  quietTimer = setTimeout(() => { if (!still.matches) { mode = "tour"; run(); } }, 4000);
}
function setFrame(f, pp = 0) {
  frame = Math.max(0, Math.min(5, f));
  p = Math.max(0, Math.min(1, pp));
  draw(computeState(frame, p), frame, p);
  statusEl.textContent = FRAME_NAMES[frame];
}
function next() { setFrame((frame + 1) % 6, 0); mode = still.matches ? "hold" : "play"; armTour(); run(); }
function prev() { setFrame((frame + 5) % 6, 1); mode = "hold"; armTour(); run(); }

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (mode !== "hold" && !calm) {
    p += dt / DUR[frame];
    if (p >= 1) {
      if (mode === "tour") { frame = (frame + 1) % 6; p = 0; statusEl.textContent = FRAME_NAMES[frame]; }
      else { p = 1; mode = "hold"; }
    }
  }
  draw(computeState(frame, p), frame, p);
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
  else if (/^[0-5]$/.test(e.key)) { setFrame(Number(e.key)); mode = still.matches ? "hold" : "play"; armTour(); run(); }
});
document.addEventListener("visibilitychange", () => { if (!document.hidden) run(); });

// 驱动钩子（drive.mjs 用）
window.__fig1 = {
  setFrame(f, pp) { setFrame(f, pp); mode = "hold"; run(); },
  get frame() { return frame; },
  get p() { return p; },
  state() { return computeState(frame, p); },
};

setFrame(0, 0);
statusEl.textContent = FRAME_NAMES[0];
run();

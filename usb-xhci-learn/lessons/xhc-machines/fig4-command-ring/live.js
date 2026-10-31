// Fig4 订单柜台 — live script（数据由 build.mjs 注入下方 D）
const D = __DATA__;
const P = D.P, KS = D.KS, RAD = Math.PI / 180;
const SLOT_R = 41;

const stage = document.querySelector(".fx-stage");
const svgEl = stage.closest("svg");
const q = (s) => svgEl.querySelector(s);
const wrap = document.querySelector(".fx-wrap");
const readout = document.querySelector("[data-readout]");
const statusEl = document.querySelector("[data-status]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

const elCards = q('[data-part="readercard"]');
const elClip = q('[data-part="clippage"]');
const elRes = q('[data-part="residue"]');
const elTrays = q('[data-part="trays"]');
const elPtrs = q('[data-part="pointers"]');
const elArm = q('[data-part="jibarm"]');
const elGrip = q('[data-part="jibgrip"]');
const elFlights = q('[data-part="flights"]');

elCards.innerHTML = D.cells.cards;
elClip.innerHTML = D.cells.board + D.cells.pages;
elRes.innerHTML = D.cells.residues;
elTrays.innerHTML = D.cells.trays;
elPtrs.innerHTML = D.cells.ptrs;
elGrip.innerHTML = D.cells.grip;
elFlights.innerHTML = D.cells.receipt + D.cells.plate;

const elBell = q('[data-part="belldome"]').closest("[data-name]");
const elStampHead = q('[data-name="stamp.head"]');
const elDeskHead = q('[data-name="desk.head"]');
const elReceipt = q('[data-part="receipt"]');
const elPlate = q('[data-part="addrplate"]');
const trays = [null, q('[data-tray="1"]'), q('[data-tray="2"]'), q('[data-tray="3"]')];
const ptrs = { enq: q('[data-ptr="enq"]'), deq: q('[data-ptr="deq"]') };
const cards = { 9: q('[data-card="9"]'), 11: q('[data-card="11"]'), 12: q('[data-card="12"]') };
const pages = { addr: q('[data-page="addr"]'), cfg: q('[data-page="cfg"]') };
const residues = [q('[data-res="0"]'), q('[data-res="1"]'), q('[data-res="2"]')];
const glow = (k) => q('[data-glow="' + k + '"]');
const flash = q('[data-flash="row0"]');

// ---------- helpers ----------
const seg = (t, a, b) => (t <= a ? 0 : t >= b ? 1 : (t - a) / (b - a));
const ease = (u) => u * u * (3 - 2 * u);
const lerp = (a, b, u) => a + (b - a) * u;
const mix3 = (A, B, u) => [lerp(A[0], B[0], u), lerp(A[1], B[1], u), lerp(A[2], B[2], u)];
const isoP = (p) => iso(p, P);
const pol = (aDeg, r) => [D.cx + r * Math.cos(aDeg * RAD), D.cy + r * Math.sin(aDeg * RAD)];

// ---------- jib keyframes ----------
const J = D.jib;
const DESK = [J.deskA, J.deskR, J.cruiseZ];
function jibKeys(fr, t) {
  if (fr <= 1) return DESK.slice();
  const s = fr === 2 ? 0 : fr === 3 ? 1 : 2;
  const A = [D.slotA[s], SLOT_R, J.cruiseZ];
  if (fr === 2) {
    if (t < 0.18) return mix3(DESK, A, ease(seg(t, 0.02, 0.18)));
    if (t < 0.24) return [D.slotA[s], SLOT_R, lerp(J.cruiseZ, 67, ease(seg(t, 0.18, 0.24)))];
    if (t < 0.40) return mix3(A, [J.deskA, J.deskR, 67], ease(seg(t, 0.24, 0.40)));
    if (t < 0.46) return [J.deskA, J.deskR, lerp(67, 69.5, ease(seg(t, 0.40, 0.46)))];
    if (t < 0.54) return [J.deskA, J.deskR, lerp(69.5, J.cruiseZ, ease(seg(t, 0.46, 0.54)))];
    return DESK.slice();
  }
  const t0 = fr === 3 ? 0.66 : 0.64, t1 = fr === 3 ? 0.78 : 0.76;
  const t2 = t1 + 0.06, t3 = fr === 3 ? 0.93 : 0.92, t4 = t3 + 0.03, t5 = Math.min(1, t4 + 0.04);
  if (t < t1) return mix3(DESK, A, ease(seg(t, t0, t1)));
  if (t < t2) return [D.slotA[s], SLOT_R, lerp(J.cruiseZ, 67, ease(seg(t, t1, t2)))];
  if (t < t3) return mix3(A, [J.deskA, J.deskR, 67], ease(seg(t, t2, t3)));
  if (t < t4) return [J.deskA, J.deskR, lerp(67, 69.5, ease(seg(t, t3, t4)))];
  return [J.deskA, J.deskR, lerp(69.5, J.cruiseZ, ease(seg(t, t4, t5)))];
}

// ---------- tray state machine ----------
const HOME = (c) => [...D.mag[c - 1], D.topz + 0.75 + 1.65 * (c - 1)];
const STAMKP = () => [...D.stampPt, D.topz + 0.75];
const READP = () => [...D.readPt, D.topz + 0.75];
const SLOTP = (c) => [...D.SLOT[c - 1], D.topz + 4.5];
const DESKP = () => [...D.deskDrop, D.topz + 10.5];
function pathLegs(c, fr) {
  const H = HOME(c), ST = STAMKP(), RD = READP(), SL = SLOTP(c);
  if (c === 1 && fr === 1) return [
    { t0: 0.02, t1: 0.14, from: H, to: ST },
    { t0: 0.24, t1: 0.36, from: ST, to: RD },
    { t0: 0.46, t1: 0.58, from: RD, to: SL, arc: 7 },
  ];
  if (c === 2 && fr === 3) return [
    { t0: 0.06, t1: 0.16, from: H, to: ST },
    { t0: 0.26, t1: 0.36, from: ST, to: RD },
    { t0: 0.46, t1: 0.56, from: RD, to: SL, arc: 7 },
  ];
  if (c === 3 && fr === 4) return [
    { t0: 0.06, t1: 0.16, from: H, to: ST },
    { t0: 0.26, t1: 0.36, from: ST, to: RD },
    { t0: 0.44, t1: 0.54, from: RD, to: SL, arc: 7 },
  ];
  return null;
}
function trayState(c, fr, t) {
  const st = { p: HOME(c), vis: true, etch: false, op: 1 };
  const CARRY = fr === 2 ? [0.24, 0.40, 0.46] : fr === 3 ? [0.84, 0.93, 0.96] : fr === 4 ? [0.82, 0.92, 0.95] : null;
  if (c === 1 && fr > 2) return { p: DESKP(), vis: false, etch: true, op: 0 };
  if (c === 2 && fr > 3) return { p: DESKP(), vis: false, etch: true, op: 0 };
  if (c === 3 && fr === 0) return { p: DESKP(), vis: false, etch: true, op: 0 };
  if (fr === 0 || pathLegs(c, fr) === null) {
    if (CARRY === null) return st; // 在料架上待命
  }
  const legs = pathLegs(c, fr);
  if (legs) {
    let p = legs[0].from;
    for (const L of legs) {
      if (t >= L.t0) {
        const u = ease(seg(t, L.t0, L.t1));
        p = mix3(L.from, L.to, u);
        if (L.arc) p = [p[0], p[1], p[2] + Math.sin(u * Math.PI) * L.arc];
      }
    }
    st.p = p;
    if (t >= (c === 1 ? 0.18 : 0.20)) st.etch = true;
    return st;
  }
  if (CARRY) {
    const [g0, g1, drop] = CARRY;
    const keys = jibKeys(fr, t);
    if (t < g0) { st.p = SLOTP(c); st.etch = true; return st; }
    if (t < g1) {
      const xy = pol(keys[0], keys[1]);
      st.p = [xy[0], xy[1], keys[2] - 4.5];
      st.etch = true;
      return st;
    }
    if (t < drop) {
      const u = ease(seg(t, g1, drop));
      st.p = [...D.deskDrop, lerp(D.topz + 4.25, D.topz + 10.5, u)];
      st.etch = true;
      return st;
    }
    st.p = DESKP();
    st.etch = true;
    const fade0 = fr === 2 ? 0.80 : 0.965, fade1 = fr === 2 ? 0.90 : 1.0;
    st.op = 1 - ease(seg(t, fade0, fade1));
    if (st.op <= 0.01) st.vis = false;
    return st;
  }
  return st;
}

// ---------- presses / receipt / plate ----------
function bellP(t, a, b, c) { return ease(seg(t, a, b)) * (1 - ease(seg(t, b, c))); }
function stampPress(fr, t) {
  if (fr === 1) return bellP(t, 0.14, 0.19, 0.26);
  if (fr === 3 || fr === 4) return bellP(t, 0.16, 0.21, 0.28);
  return 0;
}
function deskPress(fr, t) {
  if (fr === 2) return bellP(t, 0.46, 0.51, 0.58);
  if (fr === 3) return bellP(t, 0.93, 0.955, 0.99);
  if (fr === 4) return bellP(t, 0.92, 0.945, 0.98);
  return 0;
}
let plateLatched = !!D.plateLatched; // 截图/审计辅助：直挂 1 号格（正常构建为 false）
function plateState(fr, t) {
  if (fr > 2 || (fr === 2 && t >= 0.97)) plateLatched = true;
  if (fr < 2 && !plateLatched) return { on: false };
  if (plateLatched) return { on: true, p: [...D.docCell, 0], op: 1 };
  if (t < 0.60) return { on: false };
  const u1 = ease(seg(t, 0.60, 0.74)), u2 = ease(seg(t, 0.74, 0.86)), u3 = ease(seg(t, 0.86, 0.97));
  const A = [...D.docStart, 58], B = [D.docCorner[0], D.docCorner[1], 58], C = [D.docElbow[0], D.docElbow[1], 58], E = D.docCell;
  let p;
  if (u3 > 0) p = mix3(C, E, u3);
  else if (u2 > 0) p = mix3(B, C, u2);
  else p = mix3(A, B, u1);
  const lift = u3 > 0 ? Math.sin(u3 * Math.PI) * 3 : 0;
  return { on: true, p: [p[0], p[1], p[2] + lift], op: ease(Math.min(1, u1 * 4)) };
}

// ---------- pose ----------
function pose(fr, t) {
  const S = {
    jib: jibKeys(fr, t),
    trays: [null, trayState(1, fr, t), trayState(2, fr, t), trayState(3, fr, t)],
    enq: 0, deq: 0, bell: 0, flash: false,
    stamp: stampPress(fr, t), dstamp: deskPress(fr, t),
    receipt: { on: false, rise: 0, enter: 0, k: 0 },
    win: false, card: 0, board: { up: 0, page: null },
  };
  if (fr === 1) {
    S.enq = ease(seg(t, 0.60, 0.68));
    S.bell = bellP(t, 0.70, 0.76, 0.82);
    S.flash = t >= 0.70 && t <= 0.88;
    S.card = t >= 0.30 ? 9 : 0;
  }
  if (fr === 2) {
    S.deq = ease(seg(t, 0.88, 0.96));
    S.receipt = { on: t >= 0.54 && t <= 0.98, rise: ease(seg(t, 0.54, 0.66)), enter: ease(seg(t, 0.86, 0.97)), k: 0 };
    S.win = S.receipt.on;
  }
  if (fr === 3) {
    S.board = { up: ease(seg(t, 0.02, 0.10)), page: "addr" };
    S.enq = 1 + ease(seg(t, 0.48, 0.54));
    S.bell = bellP(t, 0.56, 0.62, 0.68);
    S.flash = t >= 0.56 && t <= 0.74;
    S.card = t >= 0.30 ? 11 : 0;
    S.deq = 1 + ease(seg(t, 0.94, 1.0));
    S.receipt = { on: t >= 0.84, rise: ease(seg(t, 0.84, 0.93)), enter: ease(seg(t, 0.97, 1.05)), k: 1 };
    S.win = S.receipt.on;
  }
  if (fr === 4) {
    S.board = { up: 1, page: "cfg" };
    S.enq = 2 + ease(seg(t, 0.46, 0.52));
    S.bell = bellP(t, 0.54, 0.60, 0.66);
    S.flash = t >= 0.54 && t <= 0.72;
    S.card = t >= 0.30 ? 12 : 0;
    S.deq = 2 + ease(seg(t, 0.92, 1.0));
    S.receipt = { on: t >= 0.86, rise: ease(seg(t, 0.86, 0.94)), enter: ease(seg(t, 0.98, 1.06)), k: 2 };
    S.win = S.receipt.on;
  }
  return S;
}

// ---------- latched state ----------
let curCmds = 0, curDone = 0;
const RES = [false, false, false];
let round = 1, addrLatched = false;
function latch(fr, t) {
  if (fr === 1 && t >= 0.58) curCmds = Math.max(curCmds, 1);
  if (fr === 2 && t >= 0.46) { RES[0] = true; curDone = Math.max(curDone, 1); }
  if (fr === 3 && t >= 0.56) curCmds = Math.max(curCmds, 2);
  if (fr === 3 && t >= 0.96) { RES[1] = true; curDone = Math.max(curDone, 2); addrLatched = true; }
  if (fr === 4 && t >= 0.46) curCmds = Math.max(curCmds, 3);
  if (fr === 4 && t >= 0.95) { RES[2] = true; curDone = Math.max(curDone, 3); }
}
function flipRound() {
  round = round === 1 ? 0 : 1;
  curCmds = 0; curDone = 0;
}

// ---------- apply ----------
let lastArmKey = "";
function apply(S, fr, t) {
  for (let c = 1; c <= 3; c++) {
    const st = S.trays[c], el = trays[c];
    if (!st || !st.vis) { el.setAttribute("style", "display:none"); continue; }
    el.setAttribute("style", "opacity:" + (Math.round(st.op * 100) / 100));
    const mv = translateAlong(P, st.p);
    if (mv && mv !== "translate(0 0)") el.setAttribute("transform", mv); else el.removeAttribute("transform");
    el.querySelector("[data-etch]").setAttribute("style", st.etch ? "" : "display:none");
  }
  const ep = pol(135 + 45 * S.enq, D.enqR);
  const dp = pol(135 + 45 * S.deq, D.ptrR);
  ptrs.enq.setAttribute("transform", translateAlong(P, [ep[0], ep[1], D.topz]) || "");
  ptrs.deq.setAttribute("transform", translateAlong(P, [dp[0], dp[1], D.topz]) || "");
  // jib arm + trolley collar
  const [ja, jr, jz] = S.jib;
  const key = ja.toFixed(1) + "/" + jr.toFixed(1);
  if (key !== lastArmKey) {
    lastArmKey = key;
    const a = ja * RAD, ax = [Math.cos(a), Math.sin(a), 0];
    const F = G.frameAlong([D.cx, D.cy, D.armZ], ax);
    const arm = G.prismOf(F, [[-2.2, 0], [2.2, 0], [2.2, 4.5], [-2.2, 4.5]], D.jib.r0, Math.max(D.jib.r1, jr + 4), P);
    const CF = G.frameAlong([D.cx + ax[0] * jr, D.cy + ax[1] * jr, D.armZ + 1.2], ax);
    let html = solidSvg(arm, { tone: "mid" });
    html += solidSvg(G.disc(-2.4, 2.4, 3.4, CF, P, { steps: 22 }), { tone: "mid" });
    elArm.innerHTML = html;
  }
  // gripper + cables
  const gp = pol(ja, jr);
  const gm = translateAlong(P, [gp[0], gp[1], jz]);
  if (gm && gm !== "translate(0 0)") elGrip.setAttribute("transform", gm); else elGrip.removeAttribute("transform");
  let cables = elGrip.querySelector("[data-cables]");
  if (!cables) {
    cables = document.createElementNS("http://www.w3.org/2000/svg", "g");
    cables.setAttribute("data-cables", "");
    elGrip.insertBefore(cables, elGrip.firstChild);
  }
  const c1 = isoP([gp[0], gp[1], D.armZ + 0.6]);
  const e1 = isoP([gp[0] - Math.cos(ja * RAD) * 4.4, gp[1] - Math.sin(ja * RAD) * 4.4, jz + 2.6]);
  const e2 = isoP([gp[0] + Math.cos(ja * RAD) * 4.4, gp[1] + Math.sin(ja * RAD) * 4.4, jz + 2.6]);
  cables.innerHTML = wireSvg([c1[0], c1[1]], [e1[0], e1[1]], { tone: "lo", size: 1 })
    + wireSvg([c1[0], c1[1]], [e2[0], e2[1]], { tone: "lo", size: 1 });
  // bell + stamp heads
  setT(elBell, [0, 0, -2.1 * S.bell]);
  setT(elStampHead, [0, 0, -3.5 * S.stamp]);
  setT(elDeskHead, [0, 0, -3.5 * S.dstamp]);
  flash.classList.toggle("on", S.flash);
  // reader card
  for (const k of [9, 11, 12]) cards[k].setAttribute("style", S.card === k ? "" : "display:none");
  // clipboard
  setT(elClip, [0, 0, 8 * S.board.up]);
  pages.addr.setAttribute("style", S.board.page === "addr" ? "" : "display:none");
  pages.cfg.setAttribute("style", S.board.page === "cfg" ? "" : "display:none");
  // residues
  residues.forEach((el, i) => el.setAttribute("style", RES[i] ? "" : "display:none"));
  // receipt
  if (S.receipt.on) {
    elReceipt.setAttribute("style", "");
    elReceipt.querySelector('[data-r="trb"]').textContent = "Command TRB Pointer → " + S.receipt.k + " 槽";
    const dy = isoP([0, 0, -9])[1] * (1 - S.receipt.rise);
    const a0 = isoP(D.winMouth), a1 = isoP(D.ductIn);
    const tx = (a1[0] - a0[0]) * S.receipt.enter, ty = (a1[1] - a0[1]) * S.receipt.enter + dy;
    const sc = 1 - 0.85 * S.receipt.enter;
    elReceipt.setAttribute("transform", "translate(" + tx.toFixed(1) + " " + ty.toFixed(1) + ") scale(" + sc.toFixed(3) + ")");
    elReceipt.setAttribute("opacity", String(Math.round((1 - S.receipt.enter * 0.95) * 100) / 100));
  } else elReceipt.setAttribute("style", "display:none");
  // address plate
  const PS = plateState(fr, t);
  if (PS.on) {
    elPlate.setAttribute("style", "opacity:" + (Math.round(PS.op * 100) / 100));
    const mv = translateAlong(P, PS.p);
    if (mv && mv !== "translate(0 0)") elPlate.setAttribute("transform", mv); else elPlate.removeAttribute("transform");
  } else elPlate.setAttribute("style", "display:none");
  // lamps
  glow("win").classList.toggle("on", S.win);
  glow("addr").classList.toggle("on", addrLatched);
  glow("crr").classList.add("on");
  // RCS knob flips colour with the round (stage data-round drives --cyc)
  stage.setAttribute("data-round", String(round));
}
function setT(el, w) {
  const m = translateAlong(P, w);
  if (m && m !== "translate(0 0)") el.setAttribute("transform", m); else el.removeAttribute("transform");
}

// ---------- engine ----------
const FRAME_T = [2.4, 8.0, 11.0, 14.0, 12.0];
const FRAME_NAME = ["F0 全景", "F1 投单 Enable Slot", "F2 执行与回执", "F3 大单 Address Device", "F4 配置端点 Configure Endpoint"];
let fr = 0, t = 0, playing = false, tour = !still.matches, last = 0, visible = false, frame = 0;

function step(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if ((tour && !still.matches) || playing) {
    t += dt / FRAME_T[fr];
    if (t >= 1) {
      if (fr === 4) flipRound();
      fr = (fr + 1) % 5;
      t = 0;
      if (!tour) playing = false;
      announce();
    }
  }
  latch(fr, t);
  apply(pose(fr, Math.min(t, 1)), fr, t);
  const text = "命令 " + curCmds + " · 完成 " + curDone + " · RCS 色 " + round;
  if (readout.textContent !== text) readout.textContent = text;
  frame = visible && ((tour && !still.matches) || playing || t < 1) ? requestAnimationFrame(step) : 0;
}
function announce() {
  statusEl.textContent = FRAME_NAME[fr];
  wrap.setAttribute("aria-label", "命令环订单柜台，当前" + FRAME_NAME[fr] + "。点击步进，空格巡游，左右箭头切帧。");
}
function kick() { if (!frame && visible) { last = 0; frame = requestAnimationFrame(step); } }
function readoutNow() {
  wrap.dataset.dbg = "n=" + (wrap.dataset.clicked || 0) + " fr=" + fr + " t=" + (Math.round(t * 100) / 100) + " cmds=" + curCmds + " click=1";
  const text = "命令 " + curCmds + " · 完成 " + curDone + " · RCS 色 " + round;
  if (readout.textContent !== text) readout.textContent = text;
}
function nextFrame() {
  tour = false;
  if (t > 0 && t < 1) {
    t = 1; playing = false;
    latch(fr, 1); apply(pose(fr, 1), fr, 1);
    readoutNow();
    if (fr === 0) { fr = 1; t = 0; playing = true; announce(); } // F0 是静景：直接接 F1
    return;
  }
  if (fr === 4) flipRound();
  fr = (fr + 1) % 5; t = 0; playing = true;
  readoutNow();
  announce(); kick();
}
function prevFrame() {
  tour = false; playing = false;
  if (fr === 0) { fr = 4; } else fr -= 1;
  t = 1;
  announce(); kick();
}
wrap.addEventListener("click", () => {
  wrap.dataset.clicked = String(Number(wrap.dataset.clicked || 0) + 1);
  try { nextFrame(); } catch (err) { wrap.dataset.err = String(err); }
});
wrap.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); nextFrame(); }
  else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); prevFrame(); }
  else if (e.key === " ") { e.preventDefault(); tour = !tour && !still.matches; kick(); }
  else if (e.key === "Escape") { tour = false; kick(); }
});
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) kick();
}, { rootMargin: "120px 0px" }).observe(wrap);
if (still.matches) tour = false;
announce();
apply(pose(0, 0), 0, 0);
kick();

// §4.9 环运转台——动件几何（build 生成初始姿态入审计；同一源码内联进页面驱动 live 帧）
// 双针（入队压卡头针 / 出队取卡钳针）/ TRB 卡与顶翻牌 / 模式旋钮与读数窗 /
// CRCR·ERDP 寄存器牌 / 门铃钮与 DB Target 窗 / Toggle Cycle 小闸 / 票据与回执卡。
// 卡片类函数只产 svg 本体；data-* 包装组由 build/live 负责（display 与类切换）。
export function makeLiveGeo(k, G, D) {
  const P = D.P;
  const at = (p) => k.iso(p, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const Ln = (d, style) => k.lineSvg(d, style);
  const Dots = (pts, style) => k.dotsSvg(pts, style);
  const f2 = (v) => Math.round(v * 100) / 100;
  const FT = (m, text, size, tone = "mid", anchor = "start") => k.faceTextSvg(m, text, { size, tone, anchor });
  function planeMatrix(o, ex, ey) {
    const p0 = at(o), px = at(G.add3(o, ex)), py = at(G.add3(o, ey));
    return `matrix(${f2(px[0] - p0[0])} ${f2(px[1] - p0[1])} ${f2(py[0] - p0[0])} ${f2(py[1] - p0[1])} ${f2(p0[0])} ${f2(p0[1])})`;
  }
  const faceM = (x, y, z) => planeMatrix([x, y, z], [1, 0, 0], [0, 0, -1]); // +y 竖直面文字
  const vtext = (x, y, z, text, size, tone = "mid", anchor = "start") => FT(faceM(x, y, z), text, size, tone, anchor);
  const topText = (o, z, text, size, tone = "mid", anchor = "middle") => FT(k.topMatrix(o, z, P, "x"), text, size, tone, anchor);
  const winFrame = (x0, x1, z0, z1, y) =>
    Ln(k.pathOf([[x0, y + 0.3, z0], [x1, y + 0.3, z0], [x1, y + 0.3, z1], [x0, y + 0.3, z1]].map(at), true), { tone: "lo" });
  const rad = (deg) => (deg * Math.PI) / 180;
  const dirOf = (deg) => [Math.cos(rad(deg)), Math.sin(rad(deg))];
  const FLOOR = { o: [0, 0, 0], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] };

  // ---- TRB 卡（含顶翻牌；cyc=-1 无翻牌；st: 1 在环待执行 / 2 已执行） ----
  const KIND = {
    NC: ["Normal", "C=1"], N: ["Normal", ""], ED: ["Event Data", ""],
    L: ["Link", "TC=1"], CMD: ["No Op", "命令"], EV1: ["Xfer Event", "事件"],
    EV2: ["Port Status", "事件"], SEG: ["段尾", "ERST"],
  };
  function cardSvg(i, kind, st, cyc) {
    const [cx, cy] = D.slots[i];
    const c = D.card;
    const plan = { x: cx - 7, y: cy - 1.8, w: 14, d: 3.6, r: 0.5 };
    const done = st === 2;
    const link = kind === "L" || kind === "SEG";
    let g = S(k.slabOf(plan, c.z0, c.zTop - c.z0, P, 2, 0.4), { tone: done ? "lo" : link ? "hi" : "mid", crease: "none" });
    const fy = cy + 1.85;
    const [t1, t2] = KIND[kind] || ["TRB", ""];
    g += vtext(cx, fy, c.zTop - 6.4, t1, 2.5, done ? "lo" : link ? "hi" : "mid", "middle");
    if (t2) g += vtext(cx, fy, c.zTop - 10.6, t2, 2.5, "lo", "middle");
    if (done) g += vtext(cx, fy, c.z0 + 7.5, "毕", 5.2, "hi", "middle");
    if (cyc === 0 || cyc === 1) {
      const fp = { x: cx - 3.5, y: cy - 1.6, w: 7, d: 3.2, r: 0.3 };
      g += S(k.slabOf(fp, c.zTop, c.z1 - c.zTop, P, 1, 0.2), { tone: cyc === 1 ? "hi" : "lo", crease: "none" });
      g += topText([cx, cy], c.z1 + 0.02, String(cyc), 3.0, cyc === 1 ? "hi" : "lo");
    }
    return g;
  }

  // ---- 双针（入队=压卡头 / 出队=取卡钳；angDeg 槽角；drop 0..1 下压；enq/deq 决定层高） ----
  function needleSvg(which, angDeg, drop) {
    const nz = which === "enq" ? D.needle.enq : D.needle.deq; // {z0,z1,tipR}
    drop = drop || 0;
    const d2 = dirOf(angDeg), p2 = [-d2[1], d2[0]];
    const C = D.C;
    const w = (r, hw) => [C[0] + r * d2[0] + hw * p2[0], C[1] + r * d2[1] + hw * p2[1]];
    // 梁／配重臂独立且梁分三段拼装（不穿轴；分段件 bbox 窄——遮挡探针 bbox 近似下不误盖槽号）
    const hwAt = (r) => 2.4 + (1.2 - 2.4) * (r - 2.0) / (nz.tipR - 2.0);
    let g = "";
    for (const [r0, r1] of [[2.0, 26], [26, 50], [50, nz.tipR]]) {
      g += S(G.prismOf(FLOOR, [w(r0, hwAt(r0)), w(r1, hwAt(r1)), w(r1, -hwAt(r1)), w(r0, -hwAt(r0))], nz.z0, nz.z1, P), { tone: "mid" });
    }
    g += S(G.prismOf(FLOOR, [w(-2.0, 2.4), w(-15, 3.0), w(-15, -3.0), w(-2.0, -2.4)], nz.z0, nz.z1, P), { tone: "mid" });
    const cb = w(-16.5, 0);
    g += S(k.cylinder(cb[0], cb[1], 4.2, nz.z0 - 0.2, nz.z1 - nz.z0 + 0.4, P, 24), { tone: "mid" });
    // 角色盾牌（生产方/消费方归属；颜色由 data-role CSS 定；窄条小盾——bbox 不外甩）
    g += S(G.prismOf(FLOOR, [w(64, 0.45), w(68.5, 0.45), w(68.5, -0.45), w(64, -0.45)], nz.z1, nz.z1 + 1.2, P), { tone: "mid", className: "nshield" });
    if (which === "enq") {
      // 压卡头：两导杆 + 压脚（drop 下压）
      const dz = drop * 3.4;
      for (const r of [63.5, 66.5]) {
        const q = w(r, 1.8);
        g += S(k.cylinder(q[0], q[1], 0.8, 48.0 - dz, 0.7, P, 12), { tone: "lo" });
      }
      const fz0 = 46.9 - dz;
      g += S(G.prismOf(FLOOR, [w(61.5, 2.5), w(68.5, 2.5), w(68.5, -2.5), w(61.5, -2.5)], fz0, fz0 + 1.4, P), { tone: "hi" });
    } else {
      // 取卡钳：横轭 + 双爪（drop 下探）
      const dz = drop * 3.4;
      g += S(G.prismOf(FLOOR, [w(61.5, 9.5), w(68.5, 9.5), w(68.5, -9.5), w(61.5, -9.5)], nz.z0 - 1.2, nz.z0, P), { tone: "mid" });
      for (const t of [8.2, -8.2]) {
        const q = w(65, t);
        g += S(k.cylinder(q[0], q[1], 0.8, 46.9 - dz, nz.z0 - 1.2 - (46.9 - dz), P, 12), { tone: "lo" });
      }
    }
    return g;
  }

  // ---- 模式三键（传输/命令/事件；seat 与刻名静态，平贴点亮环 live——不凸出免遮刻名） ----
  function knobSvg(modeIx) {
    const y = D.panel.faceY, b = D.panel.btns[modeIx];
    const f = G.frameOf([b.x, y + 0.5, D.panel.btnZ], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    return Ln(G.circleOf(f, 0, 2.6, P, 20), { tone: "hi" })
      + Dots([at([b.x, y + 0.55, D.panel.btnZ])], { size: 1.0, tone: "hi" });
  }

  // ---- 读数窗（Enq/Deq/PCS/CCS：窗内两行——上行标签、下行数值） ----
  const WIN_LABEL = { enq: "入队", deq: "出队", pcs: "PCS", ccs: "CCS" };
  function winSvg(key, val) {
    const wd = D.panel.wins[key], y = D.panel.faceY;
    return winFrame(wd.x - 6.5, wd.x + 6.5, wd.z0, wd.z1, y)
      + vtext(wd.x, y + 0.4, wd.z1 - 1.9, WIN_LABEL[key], 2.5, "lo", "middle")
      + vtext(wd.x, y + 0.4, wd.z0 + 4.2, String(val), 5.0, "hi", "middle");
  }

  // ---- 空/满窗（控台窄柱位，上下叠放；ON 时高亮） ----
  function stateWinSvg(key, on) {
    const lp = D.panel.lamps[key], y = D.panel.faceY;
    return winFrame(lp.x - 4.2, lp.x + 4.2, lp.z - 1.7, lp.z + 1.7, y)
      + vtext(lp.x, y + 0.4, lp.z - 0.8, key === "empty" ? "空" : "满", 3.2, on ? "hi" : "lo", "middle");
  }

  // ---- CRCR / ERDP 寄存器牌内容（两行值） ----
  function regSvg(key, lines) {
    const rg = D.con[key], y = D.con.faceY;
    if (!lines) return vtext((rg.x0 + rg.x1) / 2, y + 0.4, (rg.z0 + rg.z1) / 2 - 1.5, "—", 4, "lo", "middle");
    return vtext(rg.x0 + 1.5, y + 0.4, rg.z1 - 3.4, lines[0], 3.1, "hi")
      + vtext(rg.x0 + 1.5, y + 0.4, rg.z1 - 7.6, lines[1], 3.1, "mid")
      + (lines[2] ? vtext(rg.x0 + 1.5, y + 0.4, rg.z1 - 11.8, lines[2], 3.1, "mid") : "");
  }

  // ---- 门铃：DB Target 数码窗 + 按钮（t 0..1 按下） ----
  function dbDialSvg(v) {
    const dw = D.bell.dial, y = D.bell.faceY;
    return winFrame(dw.x0, dw.x1, dw.z0, dw.z1, y)
      + vtext((dw.x0 + dw.x1) / 2, y + 0.4, dw.z0 + 1.6, "DB Target", 2.6, "lo", "middle")
      + vtext((dw.x0 + dw.x1) / 2, y + 0.4, dw.z0 + 5.4, v == null ? "—" : String(v), 5.6, v == null ? "lo" : "hi", "middle");
  }
  function bellBtnSvg(t) {
    const b = D.bell.btn, y = D.bell.faceY;
    const f = G.frameOf([b.x, y + 0.05, b.z - t * 1.1], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    return S(G.disc(0, 2.4 + t * 0.7, 3.0, f, P, { steps: 18, bevel: 0.3 }), { tone: "hi" })
      + Ln(G.circleOf(f, 2.4 + t * 0.7, 3.0, P, 18), { tone: "lo" });
  }

  // ---- Toggle Cycle 小闸（Link 槽外侧；v 0/1 扳向；lit 高亮） ----
  function toggleSvg(v, lit) {
    const t = D.toggle;
    const a = rad(t.baseAng - v * 70);
    const dx = Math.cos(a) * 4.8, dz = Math.sin(a) * 4.8;
    const FA = { o: [t.x, t.y, t.z0 + 2.2], a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] };
    let g = S(k.cylinder(t.x, t.y, 1.3, t.z0, t.z1 - t.z0, P, 14), { tone: "mid" });
    g += S(G.prismOf(FA, [[0, -0.6], [dx, dz - 0.6], [dx, dz + 0.6], [0, 0.6]], -0.6, 0.6, P), { tone: lit ? "hi" : "mid" });
    return g;
  }

  // ---- 票据（沿通知缆行走） ----
  function tokenSvg(kind) {
    const spec = {
      bell: ["门铃", "drv"], ccl: ["完成事件", "hc"], irq: ["中断", "hc"], erdp: ["写 ERDP", "drv"],
    }[kind] || ["·", "mid"];
    return `<g class="tok ${spec[1]}"><rect x="-7" y="-4.5" width="14" height="9" rx="1.6"/><text x="0" y="1.6" text-anchor="middle">${spec[0]}</text></g>`;
  }

  // ---- 事件匣内的回执卡 ----
  function trayCardSvg(label) {
    return `<g class="tcard"><rect x="-6.5" y="-8" width="13" height="16" rx="1.4"/><text x="0" y="-2.2" text-anchor="middle">${label}</text><text x="0" y="3.4" text-anchor="middle">回执</text></g>`;
  }

  return { cardSvg, needleSvg, knobSvg, winSvg, stateWinSvg, regSvg, dbDialSvg, bellBtnSvg, toggleSvg, tokenSvg, trayCardSvg };
}

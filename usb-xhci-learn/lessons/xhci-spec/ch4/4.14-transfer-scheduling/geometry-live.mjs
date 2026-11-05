// §4.14 调度轮转台——动件几何（build 生成初始姿态入审计；同一源码内联进页面驱动 live 帧）
// MFINDEX 窗 / SO 计数窗 / 门铃钮 / 轮转盘指针 / 节拍读线 / 端点卡 / TD 卡 / 票据 / 事件卡
// 卡片类函数只产 svg 本体；data-* 包装组由 build/live 负责（display 与 hot 类切换）。
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
  const winFrame = (x0, x1, z0, z1, y) =>
    Ln(k.pathOf([[x0, y + 0.3, z0], [x1, y + 0.3, z0], [x1, y + 0.3, z1], [x0, y + 0.3, z1]].map(at), true), { tone: "lo" });

  // ---- MFINDEX 窗（µFrame 0–7 · Frame 递增；Figure 4-21 分区刻在窗沿） ----
  function mindexWinSvg(fr, uf) {
    const { x0, x1, z0, z1 } = D.mfwin, y = D.faceY, cx = (x0 + x1) / 2;
    let g = winFrame(x0, x1, z0, z1, y)
      + vtext(cx, y + 0.4, z1 - 3.4, "MFINDEX · MIT=125µs", 4, "lo", "middle");
    if (fr == null) {
      g += vtext(cx, y + 0.4, z0 + 14.4, "—", 5.4, "lo", "middle");
    } else {
      g += vtext(cx, y + 0.4, z0 + 14.4, "Frame 0x" + fr.toString(16).toUpperCase().padStart(4, "0") + " · µFrame " + uf, 4.6, "hi", "middle");
      g += vtext(cx, y + 0.4, z0 + 6.4, "Frame Index 13:3 ∣ µFrame Index 2:0", 3.0, "lo", "middle");
    }
    return g;
  }

  // ---- SO 计数窗（MSOPC/SOPC；null=「—」） ----
  function sopcWinSvg(s) {
    const { x0, x1, z0, z1 } = D.sopcwin, y = D.faceY, cx = (x0 + x1) / 2;
    let g = winFrame(x0, x1, z0, z1, y)
      + vtext(cx, y + 0.4, z1 - 3.4, "SO 计数 · MSOPC=(MaxBurst+1)(Mult+1)", 3.4, "lo", "middle");
    if (s == null) {
      g += vtext(cx, y + 0.4, z0 + 14.6, "—", 4.6, "lo", "middle")
        + vtext(cx, y + 0.4, z0 + 6.6, "SO=搬包时间块 · 1–3 USB 事务/SO", 3.2, "lo", "middle");
    } else {
      g += vtext(cx, y + 0.4, z0 + 14.6, s.ep + " · MSOPC " + s.msopc + " · SOPC " + s.sopc, 4.6, s.over ? "err" : "hi", "middle");
      g += vtext(cx, y + 0.4, z0 + 6.6, (s.over ? ">MSOPC 连续流 · " : "") + s.sub, 3.2, s.over ? "err" : "lo", "middle");
    }
    return g;
  }

  // ---- 门铃钮（面板立面按铃；t 0=抬起 1=压下；环形钮圈 + 中心柱塞） ----
  function bellBtnSvg(t) {
    const b = D.bell;
    const F = G.frameOf([b.btnX, b.faceY + 0.05 - t * 0.9, b.btnZ], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    return S(G.ringBand(0, 0.6, 2.6, 4.2, F, P, { steps: 22, bevel: 0.2 }), { tone: "lo" })
      + S(G.disc(0.05, 0.8, 2.2, F, P, { steps: 20, bevel: 0.3 }), { tone: "hi", lit: true });
  }

  // ---- 轮转盘指针臂（横臂扫过卡座上方；中心柱由 build 静态画；angleDeg 0=正北(+y)顺时针；on=服务灯亮） ----
  function dialArmSvg(angleDeg, on) {
    const d = D.dial;
    const a = (angleDeg * Math.PI) / 180;
    const dir = [Math.sin(a), Math.cos(a)];
    const root = [d.cx + 3.2 * dir[0], d.cy + 3.2 * dir[1], d.zArm];
    const tip = [d.cx + d.rArm * dir[0], d.cy + d.rArm * dir[1], d.zArm];
    let g = Ln(k.pathOf([at(root), at(tip)]), { tone: "hi", "stroke-width": 3.2 })
      + S(G.sphereOf([tip[0], tip[1], d.zArm], 1.6, P), { tone: "hi" });
    const lf = G.frameOf([tip[0], tip[1], d.zArm + 0.9], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    g += `<g class="lamp${on ? " on" : ""}" data-lamp="dialso">` + S(G.solidOf([[0, 0.2], [1, 2, 1], [2.2, 2.5, 1], [3, 1.9, 1], [3.4, 0.3]], lf, P, { steps: 18 }), { tone: "hi" }) + `</g>`;
    return g;
  }

  // ---- 节拍读线（跨微帧标尺条边到边滑动；x=世界 x 位置） ----
  function mfMarkSvg(x) {
    const b = D.belt;
    return Ln(k.pathOf([at([x, b.y, b.z + 0.05]), at([x, b.y + b.d, b.z + 0.05])]), { tone: "hi", "stroke-width": 1.6 })
      + S(G.sphereOf([x, b.y + 2.2, b.z + 1.0], 1.0, P), { tone: "hi", lit: true });
  }

  // ---- 端点卡（Pipe Schedule 条目；kind: iso/intr/bulk/ctrl；绝对定位 (x,y,z0)+宽高；compact=轮转盘短字） ----
  const EP_TEXT = {
    iso:  { t: "EP1 Isoch IN", rows: ["Int 3 · MSOPC 8", "8KB/ESIT"], ts: 3.3, rs: 2.7, c: null },
    intr: { t: "EP2 Intr IN", rows: ["Int 4 · MSOPC 1", "TD 跨 ESIT"], ts: 3.3, rs: 2.7, c: null },
    bulk: { t: "EP3 OUT Bulk", rows: ["MaxBurst 7 · MSOPC 8", "MSTrS 8192B"], ts: 3.3, rs: 2.7,
            c: { t: "EP3 Bulk", rows: ["MaxBurst 7", "MSOPC 8"], ts: 2.9, rs: 2.2 } },
    ctrl: { t: "EP0 Control", rows: ["MPS 512 · MSOPC 1", "每 Stage 一 TD"], ts: 3.3, rs: 2.7,
            c: { t: "EP0 Ctrl", rows: ["MPS 512", "Stage=TD"], ts: 2.9, rs: 2.2 } },
  };
  function epCardBodySvg(kind, x, y, z0, w, h, compact) {
    const e0 = EP_TEXT[kind];
    const e = compact && e0.c ? e0.c : e0;
    const plan = { x: x - w / 2, y, w, d: 4, r: 0.6 };
    return `<g class="epcard">` + S(k.slabOf(plan, z0, h, P, 2, 0.25), { tone: "mid", crease: "lo" }) + `</g>`;
  }
  function epCardTextSvg(kind, x, y, z0, w, h, compact) {
    const e0 = EP_TEXT[kind];
    const e = compact && e0.c ? e0.c : e0;
    const ts = Math.min(e.ts, w / 4.2), rs = Math.min(e.rs, w / 5.6);
    const yF = y + 4 + 0.05;
    let g = vtext(x, yF, z0 + h - 3.0, e.t, ts, "hi", "middle");
    e.rows.forEach((r, i) => {
      g += vtext(x, yF, z0 + h - 7.4 - i * 4.4, r, rs, "lo", "middle");
    });
    return g;
  }
  function epCardSvg(kind, x, y, z0, w, h, compact) {
    return epCardBodySvg(kind, x, y, z0, w, h, compact) + epCardTextSvg(kind, x, y, z0, w, h, compact);
  }

  // ---- TD 卡（传输环上的传输描述符；state: 1 待取 / 2 已完成 / 3 跨 ESIT 进行中） ----
  // 2026-11-05 遮挡修复轮：卡体/刻字拆开——体留 item 深度序，字入 labels 尾层
  // （con.body/con.lid/wire.bell 分段后画 bbox 盖字的探针 FAIL 全消）。
  function tdCardBodySvg(ring, slot, state) {
    if (!state) return "";
    const rb = D.rings[ring], z0 = D.ringZ + 2.05;
    const w = 11, h = 13;
    const x = rb.x0 + 3 + slot * 13;
    const plan = { x, y: rb.y1 - 9.5, w, d: 4.4, r: 0.5 };
    const done = state === 2;
    return S(k.slabOf(plan, z0, h, P, 2, 0.2), { tone: done ? "lo" : "hi", crease: "lo" });
  }
  function tdCardTextSvg(ring, slot, state) {
    if (!state) return "";
    const rb = D.rings[ring], z0 = D.ringZ + 2.05;
    const w = 11, h = 13;
    const x = rb.x0 + 3 + slot * 13;
    const done = state === 2, part = state === 3;
    const cx = x + w / 2, yF = rb.y1 - 5.1 + 0.05;
    let g = vtext(cx, yF, z0 + h - 3.4, done ? "✓" : "TD", 4.6, done ? "lo" : "hi", "middle");
    if (part) g += vtext(cx, yF, z0 + 4.2, "跨 ESIT", 2.8, "hc", "middle");
    else if (done) g += vtext(cx, yF, z0 + 4.0, "已取", 2.8, "lo", "middle");
    return g;
  }
  function tdCardSvg(ring, slot, state) {
    return tdCardBodySvg(ring, slot, state) + tdCardTextSvg(ring, slot, state);
  }

  // ---- 小票据卡（沿总线/拉线行走的令牌；以原点为参考构建，live 平移） ----
  // 2026-11-05 遮挡修复轮：体/字拆开——live 两遍渲染（先全部票体、后全部票字），
  // 消同层票互盖（F7 NRDY+ERDY 同层时后票卡体盖前票刻字的探针 FAIL）。
  function tokenSvg(kind) {
    return tokenBodySvg(kind) + tokenTextSvg(kind);
  }
  function tokenBodySvg(kind) {
    const spec = {
      bell:   { cls: "tk-drv" }, bell2: { cls: "tk-drv" },
      datai:  { cls: "tk-dev" }, datax: { cls: "tk-dev" },
      datab:  { cls: "tk-hc" },  datac: { cls: "tk-hc" },
      nrdy:   { cls: "tk-dev" }, erdy: { cls: "tk-dev" },
    }[kind];
    const w = 14, h = 11;
    const plan = { x: -w / 2, y: -2.3, w, d: 4.4, r: 0.6 };
    return `<g class="stoken ${spec.cls}">` + S(k.slabOf(plan, -h / 2, h, P, 2, 0.2), { tone: "hi", crease: "lo" }) + `</g>`;
  }
  function tokenTextSvg(kind) {
    const spec = {
      bell:   { l1: "门铃", l2: "Running EP", tone: "drv" },
      bell2:  { l1: "门铃", l2: "重新入表", tone: "drv" },
      datai:  { l1: "数据", l2: "Isoch IN", tone: "dev" },
      datax:  { l1: "数据", l2: "Intr IN", tone: "dev" },
      datab:  { l1: "DP", l2: "Bulk OUT", tone: "hc" },
      datac:  { l1: "数据", l2: "Control", tone: "hc" },
      nrdy:   { l1: "NRDY", l2: "Intr 流控", tone: "dev" },
      erdy:   { l1: "ERDY", l2: "就绪", tone: "dev" },
    }[kind];
    const h = 11;
    return vtext(0, 2.15, h / 2 - 3.4, spec.l1, 3.8, "hi", "middle")
      + vtext(0, 2.15, -h / 2 + 4.4, spec.l2, 3.8, spec.tone, "middle");
  }

  // ---- 事件卡（沿事件回流管入事件匣的回执） ----
  function eventBodySvg() {
    const w = 17, h = 11;
    const plan = { x: -w / 2, y: -2.2, w, d: 4.2, r: 0.6 };
    return `<g class="stoken tk-ev">` + S(k.slabOf(plan, -h / 2, h, P, 2, 0.2), { tone: "hi", crease: "lo" }) + `</g>`;
  }
  function eventTextSvg(label) {
    const h = 11;
    return vtext(0, 1.95, h / 2 - 3.2, "Transfer Event", 3.4, "hi", "middle")
      + vtext(0, 1.95, -h / 2 + 4.2, label, 3.0, "mid", "middle");
  }
  function eventCardSvg(label) {
    return eventBodySvg() + eventTextSvg(label);
  }

  return { mindexWinSvg, sopcWinSvg, bellBtnSvg, dialArmSvg, mfMarkSvg, epCardSvg, epCardBodySvg, epCardTextSvg, tdCardSvg, tdCardBodySvg, tdCardTextSvg, tokenSvg, tokenBodySvg, tokenTextSvg, eventCardSvg, eventBodySvg, eventTextSvg, vtext, faceM };
}

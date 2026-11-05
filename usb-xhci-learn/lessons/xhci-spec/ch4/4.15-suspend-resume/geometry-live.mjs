// §4.15 端口电源闸台——动件几何（build 生成初始姿态入审计；同一源码内联进页面驱动 live 帧）
// 端口链接状态转筒 / PLS 写入计数轮 / TDRSMDN 计数轮 / LWS 拉杆 / 评估窗 / PSCEG 窗 /
// 端点窗 / 注记窗 / 设备链路窗 / 唤醒钮 / 门铃钮 / 闸臂 / 票据 / 事件卡 / 命令卡
// 卡片类函数只产 svg 本体；data-* 包装组由 build/live 负责（display 与类切换）。
export function makeLiveGeo(k, G, D) {
  const P = D.P;
  const at = (p) => k.iso(p, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const Ln = (d, style) => k.lineSvg(d, style);
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

  // ---- 端口链接状态转筒窗（0 U0/1 U1/2 U2/3 U3/4 U3Exit/5 Resume；演示经 U0·U3·Resume·U3Exit） ----
  function drumSvg(pos) {
    const { x0, x1, z0, z1 } = D.drum, y = D.faceY;
    const band = z1 - z0 - 3;
    let g = `<g clip-path="url(#drumclip)">`;
    for (let i = 0; i < D.states.length; i++) {
      if (Math.abs(i - pos) > 1.3) continue;   // 只渲染窗口邻域表项（被裁剪表项的 rect 会假参与遮挡探针）
      const base = z1 - 1.5 - (i - pos) * band;
      g += vtext(x0 + 2.5, y + 0.4, base - 0.6, D.states[i], 6.4, i === Math.round(pos) ? "hi" : "lo");
    }
    g += `</g>`;
    return `<defs><clipPath id="drumclip"><path d="${k.pathOf([[x0, y + 0.5, z0], [x1, y + 0.5, z0], [x1, y + 0.5, z1], [x0, y + 0.5, z1]].map(at), true)}"/></clipPath></defs>`
      + g + winFrame(x0, x1, z0, z1, y);
  }

  // ---- PLS 写入计数轮（写入值 0/3/15——PORTSC PLS 字段软件侧写入；pos 0..2 连续） ----
  const DIAL_VALS = ["0", "3", "15"];
  function dialSvg(pos) {
    const { x0, x1, z0, z1 } = D.dial, y = D.panelFaceY;
    const band = z1 - z0 - 3;
    let g = `<g clip-path="url(#dialclip)">`;
    for (let i = 0; i < DIAL_VALS.length; i++) {
      if (Math.abs(i - pos) > 1.3) continue;   // 同上：只渲染窗口邻域表项
      const base = z1 - 1.5 - (i - pos) * band;
      g += vtext((x0 + x1) / 2, y + 0.4, base - 0.6, DIAL_VALS[i], 8, i === Math.round(pos) ? "hi" : "lo", "middle");
    }
    g += `</g>`;
    return `<defs><clipPath id="dialclip"><path d="${k.pathOf([[x0, y + 0.5, z0], [x1, y + 0.5, z0], [x1, y + 0.5, z1], [x0, y + 0.5, z1]].map(at), true)}"/></clipPath></defs>`
      + g + winFrame(x0, x1, z0, z1, y);
  }

  // ---- TDRSMDN 计数轮（USB2 恢复计时 ≥20 ms；t<0=— 未在计） ----
  function timerSvg(t) {
    const { x0, x1, z0, z1 } = D.timer, y = D.panelFaceY;
    let g = winFrame(x0, x1, z0, z1, y);
    if (t == null || t < 0) {
      g += vtext((x0 + x1) / 2, y + 0.4, (z0 + z1) / 2 - 1.6, "—", 7, "lo", "middle");
    } else {
      const w = x1 - x0 - 5, zb = z0 + 4.6;
      g += vtext((x0 + x1) / 2, y + 0.4, z1 - 3.6, "≥ 20 ms", 4.6, t >= 1 ? "hi" : "mid", "middle");
      g += Ln(k.pathOf([at([x0 + 2.5, y + 0.4, zb]), at([x1 - 2.5, y + 0.4, zb])]), { tone: "lo" });
      if (t > 0.02) g += Ln(k.pathOf([at([x0 + 2.5, y + 0.4, zb]), at([x0 + 2.5 + w * Math.min(1, t), y + 0.4, zb])]), { tone: "hi", "stroke-width": 2.2 });
    }
    return g;
  }

  // ---- LWS 拉杆（写入门控：t 0=抬起 1=压下——不压下写不进 PLS 字段 p254） ----
  function leverSvg(t) {
    const { px, pz } = D.lever, y = D.panelFaceY;
    const pitch = ((-52 + 62 * t) * Math.PI) / 180;
    const L = 11.5;
    const tip = [px + L * Math.cos(pitch), y + 0.05, pz + L * Math.sin(pitch)];
    return Ln(k.pathOf([at([px, y + 0.05, pz]), at(tip)]), { tone: "hi", "stroke-width": 2.6 })
      + S(G.sphereOf([tip[0], tip[1], tip[2]], 1.5, P), { tone: "hi", lit: t > 0.6 });
  }

  // ---- 评估窗（xHC 评估 PLS 写入：立即 · 或微帧/帧边界，至少每帧一次 p253；m 0..1 节拍标记） ----
  function evalSvg(m) {
    const { x0, x1, z0, z1 } = D.evalw, y = D.faceY;
    let g = winFrame(x0, x1, z0, z1, y);
    g += vtext(x0 + 1.6, y + 0.4, z1 - 4.2, "PLS 写入评估", 4.2, "hi");
    g += vtext(x0 + 1.6, y + 0.4, z1 - 9.4, "立即 · 或帧边界", 3.8, "lo");
    g += vtext(x0 + 1.6, y + 0.4, z1 - 14.2, "（至少每帧一次）", 3.4, "lo");
    const zb = z0 + 4.2, xA = x0 + 3, xB = x1 - 3;
    g += Ln(k.pathOf([at([xA, y + 0.4, zb]), at([xB, y + 0.4, zb])]), { tone: "lo" });
    for (let i = 0; i <= 4; i++) {
      const tx = xA + ((xB - xA) * i) / 4;
      g += Ln(k.pathOf([at([tx, y + 0.4, zb]), at([tx, y + 0.4, zb + 2.4])]), { tone: i === 4 ? "mid" : "lo" });
    }
    if (m != null && m > 0) {
      const mx = xA + (xB - xA) * Math.min(1, m);
      g += S(G.sphereOf([mx, y + 0.5, zb + 1.1], 1.1, P), { tone: "hi", lit: m >= 1 });
    }
    return g;
  }

  // ---- PSCEG 窗（0→1 跳变才产生端口状态变化事件 §4.19.2） ----
  function pscegSvg(v) {
    const { x0, x1, z0, z1 } = D.psceg, y = D.faceY;
    return winFrame(x0, x1, z0, z1, y)
      + vtext(x0 + 1.8, y + 0.4, z1 - 4.4, "PSCEG", 4.2, "hi")
      + vtext((x0 + x1) / 2, y + 0.4, (z0 + z1) / 2 - 1.8, String(v), 7.5, v ? "hi" : "lo", "middle")
      + vtext(x0 + 1.8, y + 0.4, z0 + 3.4, "0→1 出事件", 3.2, "lo");
  }

  // ---- 端点窗（Stop Endpoint(SP='1') 停 → 门铃重启 §4.15.1.1） ----
  function epWinSvg(run) {
    const { x0, x1, z0, z1 } = D.ep, y = D.faceY;
    return winFrame(x0, x1, z0, z1, y)
      + vtext(x0 + 1.8, y + 0.4, z1 - 4.4, "端点", 4.2, "hi")
      + vtext((x0 + x1) / 2, y + 0.4, (z0 + z1) / 2 - 1.6, run ? "Running" : "Stopped", 6.4, run ? "hi" : "lo", "middle")
      + vtext(x0 + 1.8, y + 0.4, z0 + 3.6, "SP 停 · 门铃启", 3.2, "lo");
  }

  // ---- 常驻注记窗（帧相关机制句，最多两行） ----
  function noteWinSvg(lines) {
    const { x0, x1, z0, z1 } = D.note, y = D.faceY;
    let g = winFrame(x0, x1, z0, z1, y);
    (lines || []).forEach((ln, i) => {
      g += vtext(x0 + 1.8, y + 0.4, z1 - 5.6 - i * 8.6, ln, 4.2, i === 0 ? "hi" : "mid");
    });
    return g;
  }

  // ---- 设备链路电源态窗（设备侧看到的链接态） ----
  function devLinkSvg(st) {
    const { x0, x1, z0, z1 } = D.dev.linkWin, y = D.boxFaceY, cx = (x0 + x1) / 2;
    return winFrame(x0, x1, z0, z1, y)
      + vtext(cx, y + 0.4, z1 - 4.6, "链路电源态", 4.2, "mid", "middle")
      + vtext(cx, y + 0.4, z1 - 14.6, st || "—", 9, st === "U0" ? "dev" : "lo", "middle");
  }

  // ---- 设备唤醒钮（面板立面；t 0=抬起 1=压下） ----
  function wakeBtnSvg(t) {
    const b = D.dev.btn;
    const F = G.frameOf([b.x, D.boxFaceY + 0.05 - t * 0.9, b.z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    return S(G.ringBand(0, 0.6, 2.4, 4.0, F, P, { steps: 22, bevel: 0.2 }), { tone: "lo" })
      + S(G.disc(0.05, 0.8, 2.0, F, P, { steps: 20, bevel: 0.3 }), { tone: "hi", lit: t > 0.4 });
  }

  // ---- 文书台端点门铃钮（台面朝上；t 0=抬起 1=压下） ----
  function bellBtnSvg(t) {
    const b = D.bell;
    const F = G.frameOf([b.x, b.y, b.z - t * 0.9], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    return S(G.ringBand(0, 0.6, 2.4, 4.2, F, P, { steps: 22, bevel: 0.2 }), { tone: "lo" })
      + S(G.disc(0.05, 0.8, 2.1, F, P, { steps: 20, bevel: 0.3 }), { tone: "hi", lit: t > 0.4 });
  }

  // ---- 闸臂（三位闸刀：角度→U0 46° / Resume 8° / U3 -32°；端球切触点柱内侧，命中点亮） ----
  function bladeSvg(aDeg) {
    const g = D.gate;
    const a = (aDeg * Math.PI) / 180;
    const tip = [g.hx + g.r * Math.cos(a), g.hy, g.hz + g.r * Math.sin(a)];
    const mid = [g.hx + 7 * Math.cos(a), g.hy, g.hz + 7 * Math.sin(a)];
    const seated = [g.aU0, g.aRe, g.aU3].some((t) => Math.abs(t - aDeg) < 3);
    return Ln(k.pathOf([at([g.hx, g.hy, g.hz]), at(mid)]), { tone: "mid", "stroke-width": 4.2 })
      + Ln(k.pathOf([at(mid), at([tip[0] - 1.2 * Math.cos(a), g.hy, tip[2] - 1.2 * Math.sin(a)])]), { tone: "hi", "stroke-width": 2.8 })
      + S(G.sphereOf([tip[0], g.hy, tip[2]], 1.5, P), { tone: "hi", lit: seated });
  }

  // ---- 小票据卡（沿链路/写入线/事件管行走的令牌；以原点为参考构建，live 平移） ----
  function tokenSvg(kind) {
    const spec = {
      data: { l1: "数据包", l2: "U0 跑动", cls: "tk-hc", tone: "hc" },
      suspend: { l1: "suspend", l2: "信令", cls: "tk-hc", tone: "hc" },
      lfps: { l1: "LFPS", l2: "唤醒", cls: "tk-dev", tone: "dev" },
      lfpsack: { l1: "LFPS", l2: "应答", cls: "tk-hc", tone: "hc" },
      write3: { l1: "PLS='3'", l2: "写入", cls: "tk-drv", tone: "drv" },
      write0: { l1: "PLS='0'", l2: "写入", cls: "tk-drv", tone: "drv" },
      write15: { l1: "PLS='15'", l2: "写入", cls: "tk-drv", tone: "drv" },
      bell: { l1: "门铃", l2: "端点重启", cls: "tk-drv", tone: "drv" },
    }[kind];
    const w = 14, h = 11;
    const plan = { x: -w / 2, y: -2.3, w, d: 4.4, r: 0.6 };
    let g = S(k.slabOf(plan, -h / 2, h, P, 2, 0.2), { tone: "hi", crease: "lo" });
    g += vtext(0, 2.15, h / 2 - 3.4, spec.l1, 3.8, "hi", "middle");
    g += vtext(0, 2.15, -h / 2 + 4.4, spec.l2, 3.8, spec.tone, "middle");
    return `<g class="stoken ${spec.cls}">` + g + `</g>`;
  }

  // ---- 事件卡（端口状态变化事件——沿事件管入事件匣的回执） ----
  function eventCardSvg(sub) {
    const w = 17, h = 11;
    const plan = { x: -w / 2, y: -2.2, w, d: 4.2, r: 0.6 };
    let g = S(k.slabOf(plan, -h / 2, h, P, 2, 0.2), { tone: "hi", crease: "lo" });
    g += vtext(0, 1.95, h / 2 - 3.2, "端口状态变化", 3.2, "hi", "middle");
    g += vtext(0, 1.95, -h / 2 + 4.2, sub, 3.2, "mid", "middle");
    return `<g class="stoken tk-ev">` + g + `</g>`;
  }

  // ---- Stop Endpoint 命令卡（SP='1'；state 1 在位 2 已执行） ----
  function cmdCardSvg(state) {
    const c = D.cmd;
    const plan = { x: c.x, y: c.y, w: c.w, d: 2, r: 0.5 };
    const done = state === 2;
    let g = S(k.slabOf(plan, c.z, c.h, P, 2, 0.2), { tone: done ? "lo" : "hi", crease: "lo" });
    g += vtext(c.x + c.w / 2, c.y + 2.05, c.z + c.h - 4.0, "Stop Endpoint", 3.4, done ? "lo" : "hi", "middle");
    g += vtext(c.x + c.w / 2, c.y + 2.05, c.z + 4.6, done ? "已停端点" : "SP='1'", 3.8, done ? "lo" : "hi", "middle");
    return g;
  }

  return { drumSvg, dialSvg, timerSvg, leverSvg, evalSvg, pscegSvg, epWinSvg, noteWinSvg, devLinkSvg, wakeBtnSvg, bellBtnSvg, bladeSvg, tokenSvg, eventCardSvg, cmdCardSvg, vtext, faceM };
}

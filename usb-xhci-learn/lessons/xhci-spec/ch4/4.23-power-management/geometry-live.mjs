// §4.23 电源井配电台——动件几何（build 生成初始姿态入审计；同一源码内联进页面驱动 live 帧）
// PCI 功耗态转筒（D0..D3cold）/ 寄存器面板窗（十组名+亮灭态）/ 镜像柜三抽屉 / CSS·CRS 双旗 /
// Core 井闸刀臂 / 写入卡 / 设备链路态窗 / PME 唤醒钮 / 注记窗 / 票据 / PME# 事件卡
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

  // ---- PCI 功耗态转筒窗（0 D0/1 D1/2 D2/3 D3hot/4 D3cold；演示经 D0→D3hot→D3cold→D0） ----
  // 窗宽 26：最长态名 D3cold（6 字符）×5.8×0.55≈19.1 内含边距放下（宽度预算先算后写）。
  function drumSvg(pos) {
    const { x0, x1, z0, z1 } = D.drum, y = D.faceY;
    const band = z1 - z0 - 3;
    let g = `<g clip-path="url(#drumclip423)">`;
    for (let i = 0; i < D.states.length; i++) {
      if (Math.abs(i - pos) > 1.3) continue;   // 只渲染窗口邻域表项（被裁剪表项的 rect 会假参与遮挡探针）
      const base = z1 - 1.5 - (i - pos) * band;
      if (base < z0 + 0.8 || base > z1 - 0.8) continue;   // 只渲染窗内表项（窗外被裁剪项仍会进 getBBox 假参与墨迹 SAT）
      g += vtext(x0 + 2.0, y + 0.4, base - 0.6, D.states[i], 5.8, i === Math.round(pos) ? "hi" : "lo");
    }
    g += `</g>`;
    return `<defs><clipPath id="drumclip423"><path d="${k.pathOf([[x0, y + 0.5, z0], [x1, y + 0.5, z0], [x1, y + 0.5, z1], [x0, y + 0.5, z1]].map(at), true)}"/></clipPath></defs>`
      + g + winFrame(x0, x1, z0, z1, y);
  }

  // ---- 寄存器面板窗（十组寄存器名三行；on=亮（有值/已写回）0=回默认（灰）） ----
  function regSvg(on) {
    const { x0, x1, z0, z1 } = D.regwin, y = D.faceY;
    let g = winFrame(x0, x1, z0, z1, y);
    g += vtext(x0 + 1.6, y + 0.4, z1 - 3.8, "寄存器面板 · Core 井", 4.0, "hi");
    const rows = [[0, 1, 2], [3, 4, 5], [6, 7, 8, 9]];
    rows.forEach((row, ri) => {
      g += vtext(x0 + 1.6, y + 0.4, z1 - 10.4 - ri * 5.8, row.map((i) => D.regs[i]).join(" "), 3.4, on ? "mid" : "lo");
    });
    return g;
  }

  // ---- 镜像柜三抽屉（软件保存的三份镜像；drawer=[{on,tag}] ×3，实体抽屉面板在 build 记录） ----
  function drawerSvg(states) {
    const c = D.cab;
    let g = "";
    c.rows.forEach((zc, i) => {
      const st = states[i] || { on: 0, tag: "—" };
      g += vtext(c.x0 + 2.2, c.faceY, zc + 2.6, D.drawerNames[i], 3.4, "mid");
      g += vtext(c.x1 - 1.8, c.faceY, zc + 2.6, st.on ? st.tag : "空", 3.2, st.on ? "hi" : "lo", "end");
      g += Ln(k.pathOf([at([c.x0 + 2.2, c.faceY - 0.35, zc - 2.9]), at([c.x1 - 2.0, c.faceY - 0.35, zc - 2.9])]), { tone: st.on ? "hi" : "lo", "stroke-width": st.on ? 2.2 : 1.2, free: true });
    });
    return g;
  }

  // ---- CSS / CRS 双旗（USBCMD 控制位：t 0=落下 1=推上=置位；两旗只在停机态可置 p312） ----
  function flagSvg(t, f) {
    const { px, pz } = f || D.flagCss, y = D.panelFaceY;
    const pitch = ((-46 + 92 * t) * Math.PI) / 180;
    const L = 10.5;
    const tip = [px + L * Math.cos(pitch), y + 0.05, pz + L * Math.sin(pitch)];
    return Ln(k.pathOf([at([px, y + 0.05, pz]), at(tip)]), { tone: "hi", "stroke-width": 2.4 })
      + S(G.sphereOf([tip[0], tip[1], tip[2]], 1.3, P), { tone: "hi", lit: t > 0.6 });
  }

  // ---- Core 井闸刀臂（供电闸：aDeg 上 +42°=通 / 下 -34°=断；端球切触点柱） ----
  function bladeSvg(aDeg) {
    const g = D.blade;
    const a = (aDeg * Math.PI) / 180;
    const tip = [g.hx + g.r * Math.cos(a), g.hy, g.hz + g.r * Math.sin(a)];
    const seated = [g.aOn, g.aOff].some((t) => Math.abs(t - aDeg) < 3);
    return Ln(k.pathOf([at([g.hx, g.hy, g.hz]), at([tip[0] - 1.0 * Math.cos(a), g.hy, tip[2] - 1.0 * Math.sin(a)])]), { tone: "hi", "stroke-width": 2.8 })
      + S(G.sphereOf([tip[0], g.hy, tip[2]], 1.4, P), { tone: "hi", lit: seated });
  }

  // ---- 写入卡（面板写入动作卡；state 1 在位 2 已执行） ----
  function wcardSvg(l1, l2, state) {
    const c = D.wcard;
    const plan = { x: c.x, y: c.y, w: c.w, d: 2, r: 0.5 };
    const done = state === 2;
    let g = S(k.slabOf(plan, c.z, c.h, P, 2, 0.2), { tone: done ? "lo" : "hi", crease: "lo" });
    g += vtext(c.x + c.w / 2, c.y + 2.05, c.z + c.h - 4.0, l1, 3.4, done ? "lo" : "hi", "middle");
    g += vtext(c.x + c.w / 2, c.y + 2.05, c.z + 4.6, l2, 3.8, done ? "lo" : "hi", "middle");
    return g;
  }

  // ---- 设备链路态窗（设备侧只见总线信令与链路态） ----
  function devWinSvg(st, sub) {
    const { x0, x1, z0, z1 } = D.dev.win, y = D.boxFaceY, cx = (x0 + x1) / 2;
    return winFrame(x0, x1, z0, z1, y)
      + vtext(cx, y + 0.4, z1 - 4.4, "链路态 · 设备侧", 4.2, "mid", "middle")
      + vtext(cx, y + 0.4, z1 - 13.2, st, 6.4, st.startsWith("U0") ? "dev" : "lo", "middle")
      + vtext(cx, y + 0.4, z0 + 3.4, sub, 3.4, "lo", "middle");
  }

  // ---- PME 唤醒钮（设备试验盒立面；t 0=抬起 1=压下） ----
  function pmeBtnSvg(t) {
    const b = D.dev.btn;
    const F = G.frameOf([b.x, D.boxFaceY + 0.05 - t * 0.9, b.z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    return S(G.ringBand(0, 0.6, 2.4, 4.0, F, P, { steps: 22, bevel: 0.2 }), { tone: "lo" })
      + S(G.disc(0.05, 0.8, 2.0, F, P, { steps: 20, bevel: 0.3 }), { tone: "hi", lit: t > 0.4 });
  }

  // ---- 帧注记窗（xHC 立面下带，最多三行；行宽 ≤40 世界） ----
  function noteWinSvg(lines) {
    const { x0, x1, z0, z1 } = D.note, y = D.faceY;
    let g = winFrame(x0, x1, z0, z1, y);
    (lines || []).forEach((ln, i) => {
      g += vtext(x0 + 1.6, y + 0.4, z1 - 5.0 - i * 6.8, ln, i === 0 ? 4.0 : 3.6, i === 0 ? "hi" : "mid");
    });
    return g;
  }

  // ---- 小票据卡（沿写入线/链路行走的令牌；以原点为参考构建，live 平移） ----
  function tokenSvg(kind) {
    const spec = {
      stop: { l1: "Stop Endpoint", l2: "停端点", cls: "tk-drv", tone: "drv" },
      css: { l1: "CSS='1'", l2: "Save State", cls: "tk-drv", tone: "drv" },
      crs: { l1: "CRS='1'", l2: "Restore", cls: "tk-drv", tone: "drv" },
      regw: { l1: "写回寄存器", l2: "九组", cls: "tk-drv", tone: "drv" },
      crcr: { l1: "写 CRCR", l2: "命令环重启", cls: "tk-drv", tone: "drv" },
      rs1: { l1: "R/S='1'", l2: "合闸", cls: "tk-drv", tone: "drv" },
      resume: { l1: "resume/LFPS", l2: "唤醒信令", cls: "tk-dev", tone: "dev" },
      data: { l1: "数据包", l2: "U0 跑动", cls: "tk-hc", tone: "hc" },
    }[kind];
    const w = 14, h = 11;
    const plan = { x: -w / 2, y: -2.3, w, d: 4.4, r: 0.6 };
    let g = S(k.slabOf(plan, -h / 2, h, P, 2, 0.2), { tone: "hi", crease: "lo" });
    g += vtext(0, 2.15, h / 2 - 3.4, spec.l1, 3.8, "hi", "middle");
    g += vtext(0, 2.15, -h / 2 + 4.4, spec.l2, 3.8, spec.tone, "middle");
    return `<g class="stoken ${spec.cls}">` + g + `</g>`;
  }

  // ---- PME# 事件卡（xHC 按 PCI PM 规则断言 PME#——沿事件管入事件匣） ----
  function eventCardSvg(sub) {
    const w = 17, h = 12.5;
    const plan = { x: -w / 2, y: -2.2, w, d: 4.2, r: 0.6 };
    let g = S(k.slabOf(plan, -h / 2, h, P, 2, 0.2), { tone: "hi", crease: "lo" });
    g += vtext(0, 1.95, h / 2 - 3.4, "PME#", 3.4, "hi", "middle");
    g += vtext(0, 1.95, -h / 2 + 4.4, sub, 3.2, "mid", "middle");
    return `<g class="stoken tk-ev">` + g + `</g>`;
  }

  return { drumSvg, regSvg, drawerSvg, flagSvg, bladeSvg, wcardSvg, devWinSvg, pmeBtnSvg, noteWinSvg, tokenSvg, eventCardSvg, vtext, faceM };
}

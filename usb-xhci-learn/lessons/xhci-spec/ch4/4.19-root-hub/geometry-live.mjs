// §4.19 根集线器枢纽台——动件几何（build 生成初始姿态入审计；同一源码内联进页面驱动 live 帧）
// 端口状态转筒 / 变化位灯排（DOM 类切换）/ PSCEG 门控窗 / PORTSC 读数窗 / 注记窗 /
// 清位拉杆 / 写入卡 / 插头滑车 / 设备窗 / 唤醒钮 / 票据 / 事件卡
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

  // ---- 端口状态转筒窗（0 Disconnected/1 Disabled/2 Reset/3 Enabled·U0/4 U3/5 Resume/6 Powered-off） ----
  // 窗宽 38：最长态名 Disconnected（12 字符）在 5.2 号内含边距放下；PLS 读数在台面 PORTSC 读数条（避免同行超宽）。
  function drumSvg(pos) {
    const { x0, x1, z0, z1 } = D.drum, y = D.faceY;
    const band = z1 - z0 - 3;
    let g = `<g clip-path="url(#drumclip419)">`;
    for (let i = 0; i < D.states.length; i++) {
      if (Math.abs(i - pos) > 1.3) continue;   // 只渲染窗口邻域表项（被裁剪表项的 rect 会假参与遮挡探针）
      const base = z1 - 1.5 - (i - pos) * band;
      g += vtext(x0 + 1.4, y + 0.4, base - 0.6, D.states[i], 5.2, i === Math.round(pos) ? "hi" : "lo");
    }
    g += `</g>`;
    return `<defs><clipPath id="drumclip419"><path d="${k.pathOf([[x0, y + 0.5, z0], [x1, y + 0.5, z0], [x1, y + 0.5, z1], [x0, y + 0.5, z1]].map(at), true)}"/></clipPath></defs>`
      + g + winFrame(x0, x1, z0, z1, y);
  }

  // ---- PSCEG 门控窗（七变化位 OR → HCH 门 → PSCEG 值；bits=[csc..cec] 布尔，sent=本波已出事件） ----
  function pscegSvg(bits, psceg, blocked) {
    const { x0, x1, z0, z1 } = D.psceg, y = D.faceY;
    let g = winFrame(x0, x1, z0, z1, y);
    g += vtext(x0 + 1.6, y + 0.4, z1 - 3.6, "变化位 OR · HCH 门控（p293）", 3.8, "hi");
    for (let i = 0; i < bits.length; i++) {
      const bx = x0 + 4.5 + i * 7.2;
      g += S(G.sphereOf([bx, y + 0.6, z1 - 11.5], 1.05, P), { tone: bits[i] ? "hi" : "lo", lit: bits[i] });
    }
    g += vtext(x1 - 2.2, y + 0.4, z1 - 13.8, String(psceg), 7.0, psceg ? "hi" : "lo", "end");
    g += vtext(x1 - 2.2, y + 0.4, z1 - 21.4, "PSCEG", 3.0, "lo", "end");
    g += vtext(x0 + 1.6, y + 0.4, z0 + 11.2, "0→1 出事件（p293）", 3.4, "mid");
    g += vtext(x0 + 1.6, y + 0.4, z0 + 3.6, blocked ? "位未清＝阻塞再上报（p293）" : "位全清 → PSCEG=0 → 再开闸", 3.2, "lo");
    return g;
  }

  // ---- PORTSC 读数条（文书台台面平嵌：PLS+Speed / 信号态 / 已置变化位） ----
  const topText = (o, z, text, size, tone = "mid", anchor = "middle") => FT(k.topMatrix(o, z, P, "x"), text, size, tone, anchor);
  function portscSvg(pls, sig, speed, bitsTxt) {
    const { x0, y0 } = D.portsc;
    return topText([x0, y0 + 3.2], 33.9, "PORTSC 读数", 4.4, "hi", "start")
      + topText([x0, y0 + 8.4], 33.9, "PLS " + pls + " · Speed " + speed, 4.0, "mid", "start")
      + topText([x0, y0 + 13.4], 33.9, "PP,CCS,PED,PR=" + sig.join(","), 3.4, "mid", "start")
      + topText([x0, y0 + 17.6], 33.9, "变化位 " + bitsTxt, 3.4, "lo", "start");
  }

  // ---- 帧注记立板（台顶西段竖直面，最多三行；行宽 ≤42 世界） ----
  function noteWinSvg(lines) {
    const { x0, x1, z0, z1, faceY } = D.note, y = faceY;
    let g = winFrame(x0, x1, z0, z1, y);
    (lines || []).forEach((ln, i) => {
      g += vtext(x0 + 1.6, y + 0.4, z1 - 5.4 - i * 8.4, ln, i === 0 ? 4.2 : 3.8, i === 0 ? "hi" : "mid");
    });
    return g;
  }

  // ---- 清位拉杆（写 '1' 清变化位的门控手柄；t 0=抬起 1=压下） ----
  function leverSvg(t) {
    const { px, pz } = D.lever, y = D.panelFaceY;
    const pitch = ((-52 + 62 * t) * Math.PI) / 180;
    const L = 11.5;
    const tip = [px + L * Math.cos(pitch), y + 0.05, pz + L * Math.sin(pitch)];
    return Ln(k.pathOf([at([px, y + 0.05, pz]), at(tip)]), { tone: "hi", "stroke-width": 2.6 })
      + S(G.sphereOf([tip[0], tip[1], tip[2]], 1.5, P), { tone: "hi", lit: t > 0.6 });
  }

  // ---- 写入卡（PORTSC 写入动作卡；state 1 在位 2 已执行） ----
  function wcardSvg(l1, l2, state) {
    const c = D.wcard;
    const plan = { x: c.x, y: c.y, w: c.w, d: 2, r: 0.5 };
    const done = state === 2;
    let g = S(k.slabOf(plan, c.z, c.h, P, 2, 0.2), { tone: done ? "lo" : "hi", crease: "lo" });
    g += vtext(c.x + c.w / 2, c.y + 2.05, c.z + c.h - 4.0, l1, 3.4, done ? "lo" : "hi", "middle");
    g += vtext(c.x + c.w / 2, c.y + 2.05, c.z + 4.6, l2, 3.8, done ? "lo" : "hi", "middle");
    return g;
  }

  // ---- 插头滑车（沿总线链路行走：cx=车心 x；尾线回设备端口凸台） ----
  function carriageSvg(cx) {
    const c = D.carr;
    const body = { x: cx - 5, y: c.y - 4, w: 10, d: 8, r: 1 };
    let g = S(k.slabOf(body, c.zTop, 9.5, P, 2, 0.4), { tone: "hi", crease: "lo" });
    const nf = G.frameOf([cx - 5, c.y, c.zTop + 4.7], [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
    g += S(G.disc(0, 1.6, 1.7, nf, P, { steps: 14, bevel: 0.2 }), { tone: "mid" })
      + Ln(G.circleOf(nf, 0, 1.7, P, 14), { tone: "lo" });
    g += Ln(k.pathOf([at([cx + 5, c.y, c.zTop + 4.7]), at([156.5, c.y, c.zTop + 4.7])]), { tone: "mid", "stroke-width": 1.6 });
    return `<g data-part="carr-inner">` + g + `</g>`;
  }

  // ---- 设备窗（设备侧只见 VBus 与总线信令） ----
  function devWinSvg(st, sub) {
    const { x0, x1, z0, z1 } = D.dev.win, y = D.boxFaceY, cx = (x0 + x1) / 2;
    return winFrame(x0, x1, z0, z1, y)
      + vtext(cx, y + 0.4, z1 - 4.4, "设备侧", 4.2, "mid", "middle")
      + vtext(cx, y + 0.4, z1 - 13.2, st, 6.4, st === "未上电" ? "lo" : "dev", "middle")
      + vtext(cx, y + 0.4, z0 + 3.4, sub, 3.4, "lo", "middle");
  }

  // ---- 设备唤醒钮（面板立面；t 0=抬起 1=压下） ----
  function wakeBtnSvg(t) {
    const b = D.dev.btn;
    const F = G.frameOf([b.x, D.boxFaceY + 0.05 - t * 0.9, b.z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    return S(G.ringBand(0, 0.6, 2.4, 4.0, F, P, { steps: 22, bevel: 0.2 }), { tone: "lo" })
      + S(G.disc(0.05, 0.8, 2.0, F, P, { steps: 20, bevel: 0.3 }), { tone: "hi", lit: t > 0.4 });
  }

  // ---- 小票据卡（沿写入线/链路行走的令牌；以原点为参考构建，live 平移） ----
  function tokenSvg(kind) {
    const spec = {
      wrPR: { l1: "Wr PR='1'", l2: "复位写入", cls: "tk-drv", tone: "drv" },
      wrU3: { l1: "Wr PLS=U3", l2: "+LWS='1'", cls: "tk-drv", tone: "drv" },
      wrPP: { l1: "Wr PP='1'", l2: "上电写入", cls: "tk-drv", tone: "drv" },
      clr: { l1: "写 '1'", l2: "清变化位", cls: "tk-drv", tone: "drv" },
      reset: { l1: "复位信令", l2: "总线", cls: "tk-hc", tone: "hc" },
      resume: { l1: "resume", l2: "唤醒信令", cls: "tk-dev", tone: "dev" },
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

  return { drumSvg, pscegSvg, portscSvg, noteWinSvg, leverSvg, wcardSvg, carriageSvg, devWinSvg, wakeBtnSvg, tokenSvg, eventCardSvg, vtext, faceM };
}

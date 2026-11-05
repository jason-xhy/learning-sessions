// §4.12 流查表台——动件几何（build 生成初始姿态入审计；同一源码内联进页面驱动 live 帧）
// 读卡滑车 / xSPSM 转筒窗 / 捕获窗 / 拆位窗 / DB Stream ID 计数轮 / 门铃钮 / TRB 卡 / 票据 / 事件卡
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

  // ---- xSPSM 状态转筒窗（-1 未配置 / 0 Disabled/1 Idle/2 Prime Pipe/3 Start Stream/4 Move Data） ----
  function drumSvg(pos) {
    const { x0, x1, z0, z1 } = D.drum, y = D.faceY;
    const band = z1 - z0 - 3;
    let g = `<g clip-path="url(#spsmclip)">`;
    if (pos < 0) {
      g += vtext(x0 + 2.5, y + 0.4, z1 - 1.5 - 0.6, "未配置", 6.4, "lo");
    } else {
      for (let i = 0; i < 5; i++) {
        const base = z1 - 1.5 - (i - pos) * band;
        g += vtext(x0 + 2.5, y + 0.4, base - 0.6, D.spsmNames[i], 6.4, i === Math.round(pos) ? "hi" : "lo");
      }
    }
    g += `</g>`;
    return `<defs><clipPath id="spsmclip"><path d="${k.pathOf([[x0, y + 0.5, z0], [x1, y + 0.5, z0], [x1, y + 0.5, z1], [x0, y + 0.5, z1]].map(at), true)}"/></clipPath></defs>`
      + g + winFrame(x0, x1, z0, z1, y);
  }

  // ---- 捕获窗（DB Stream ID 捕获值：null=「—」） ----
  function capWinSvg(v) {
    const { x0, x1, z0, z1 } = D.capwin, y = D.faceY;
    return winFrame(x0, x1, z0, z1, y)
      + vtext((x0 + x1) / 2, y + 0.4, z0 + 3.4, v == null ? "—" : String(v), 8, v == null ? "lo" : "hi", "middle");
  }

  // ---- 拆位窗（Stream ID → PSID·SSID；null=「—」） ----
  function splitWinSvg(sid) {
    const { x0, x1, z0, z1 } = D.splitwin, y = D.faceY;
    let g = winFrame(x0, x1, z0, z1, y);
    if (sid == null) {
      g += vtext(x0 + 2, y + 0.4, z1 - 5.0, "SID 拆位", 4.2, "lo");
      g += vtext(x0 + 2, y + 0.4, z1 - 11.4, "—", 6, "lo");
    } else {
      const psid = sid & D.psidMask, ssid = sid >> (D.maxPs + 1);
      g += vtext(x0 + 2, y + 0.4, z1 - 5.0, `SID ${sid} 拆位`, 4.2, "lo");
      g += vtext(x0 + 2, y + 0.4, z1 - 12.0, `PSID ${psid} · SSID ${ssid}`, 5.4, "hi");
    }
    return g;
  }

  // ---- 设备 CStream 数码窗 ----
  function cstreamSvg(v) {
    const { x0, x1, z0, z1 } = D.cswin, y = D.boxFaceY, cx = (x0 + x1) / 2;
    return winFrame(x0, x1, z0, z1, y)
      + vtext(cx, y + 0.4, z1 - 6.4, "CStream", 4.2, "mid", "middle")
      + vtext(cx, y + 0.4, z1 - 15.6, v == null ? "—" : String(v), 9, v == null ? "lo" : "dev", "middle");
  }

  // ---- 设备切流指示窗 ----
  function switchSvg(v) {
    const { x0, x1, z0, z1 } = D.swwin, y = D.boxFaceY, cx = (x0 + x1) / 2;
    let g = winFrame(x0, x1, z0, z1, y)
      + vtext(cx, y + 0.4, z1 - 6.2, "包边界切流", 4.2, "mid", "middle");
    g += v == null
      ? vtext(cx, y + 0.4, z1 - 14.8, "—", 6.4, "lo", "middle")
      : vtext(cx, y + 0.4, z1 - 15.2, "1 ⇄ 18", 6.4, "dev", "middle");
    return g;
  }

  // ---- 文书台门铃：DB Stream ID 计数轮窗（0/1） ----
  function dialSvg(n) {
    const b = D.bell, w = 9.6, z0 = b.dialZ0, z1 = z0 + 9;
    return winFrame(b.dialX - w / 2, b.dialX + w / 2, z0, z1, b.faceY - 0.1)
      + vtext(b.dialX, b.faceY + 0.4, z0 + 3.4, String(n), 7.5, n > 0 ? "hi" : "lo", "middle");
  }

  // ---- 门铃钮（面板立面按铃；t 0=抬起 1=压下；环形钮圈 + 中心柱塞） ----
  function bellBtnSvg(t) {
    const b = D.bell;
    const F = G.frameOf([b.btnX, b.faceY + 0.05 - t * 0.9, b.btnZ], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    return S(G.ringBand(0, 0.6, 2.6, 4.2, F, P, { steps: 22, bevel: 0.2 }), { tone: "lo" })
      + S(G.disc(0.05, 0.8, 2.2, F, P, { steps: 20, bevel: 0.3 }), { tone: "hi", lit: true });
  }

  // ---- 读卡滑车（吊在门架梁下：x 水平位；drop 吊缆+探针伸出量 0..40） ----
  function trolleySvg(x, drop) {
    const ry = D.rail.y, rz = D.rail.z;
    const zb = rz - 9;               // 车底（吊点）
    const zt = zb - drop;            // 探针顶
    let g = S(k.slabOf({ x: x - 6, y: ry - 5, w: 12, d: 10, r: 1.4 }, zb, 9, P, 3, 0.4), { tone: "hi" })
      + Ln(k.pathOf([at([x, ry - 3, zb]), at([x, ry - 3, zt])]), { tone: "mid", "stroke-width": 1.4 });
    g += S(k.cylinder(x, ry - 3.2, 0.9, zt - 7.5, 7.5, P, 12, 0.2), { tone: "mid" })
      + S(G.sphereOf([x, ry - 3.2, zt - 7.9], 1.3, P), { tone: "hi", lit: drop > 4 });
    return g;
  }

  // ---- 流上下文卡（主卡笼；卡足立笼底；无包装组） ----
  // 2026-11-05 遮挡修复轮：体/字拆开——体留 item 深度序（读卡滑车/卡笼墙互遮不变），
  // 字入 labels 尾层（gantry.beam / cage.wallE / cage.lip 后画 bbox 盖字的探针 FAIL 全消）。
  function ctxCardBodySvg(idx, sct, to) {
    const cg = D.cage;
    const x = cg.x0 + idx * cg.cell + 1.4, w = cg.cell - 2.8;
    const plan = { x, y: cg.y1 - 4.4, w, d: 4.4, r: 0.5 };
    return S(k.slabOf(plan, cg.z0, cg.z1 - cg.z0, P, 2, 0.25), { tone: "mid", crease: "lo" });
  }
  function ctxCardTextSvg(idx, sct, to) {
    const cg = D.cage;
    const x = cg.x0 + idx * cg.cell + 1.4, w = cg.cell - 2.8;
    const z = cg.z0, h = cg.z1 - cg.z0;
    const cx = x + w / 2, yF = cg.y1 + 0.05;
    return vtext(cx, yF, z + h - 2.6, String(idx), 5.0, "mid", "middle")
      + vtext(cx, yF, z + h - 8.8, `SCT ${sct}`, 3.6, "lo", "middle")
      + vtext(cx, yF, z + 2.8, to, 3.2, "lo", "middle");
  }
  function ctxCardSvg(idx, sct, to) {
    return ctxCardBodySvg(idx, sct, to) + ctxCardTextSvg(idx, sct, to);
  }

  // ---- 辅流卡（辅流卡笼；无包装组） ----
  function secCardBodySvg(idx, to) {
    const sg = D.sec;
    const x = sg.x0 + idx * sg.cell + 1.6, w = sg.cell - 3;
    const plan = { x, y: sg.y1 - 4.4, w, d: 4.4, r: 0.5 };
    return S(k.slabOf(plan, sg.z0, sg.z1 - sg.z0, P, 2, 0.25), { tone: "mid", crease: "lo" });
  }
  function secCardTextSvg(idx, to) {
    const sg = D.sec;
    const x = sg.x0 + idx * sg.cell + 1.6, w = sg.cell - 3;
    const z = sg.z0, h = sg.z1 - sg.z0;
    const cx = x + w / 2, yF = sg.y1 + 0.05;
    return vtext(cx, yF, z + h - 2.8, String(idx), 4.6, "mid", "middle")
      + vtext(cx, yF, z + 3.0, to, 3.2, "lo", "middle");
  }
  function secCardSvg(idx, to) {
    return secCardBodySvg(idx, to) + secCardTextSvg(idx, to);
  }

  // ---- 空卡（TR Dequeue Ptr=0 的格：SCT 1 但无环可指——p226 越界帧用） ----
  function ghostCardBodySvg() {
    const cg = D.cage;
    const x = cg.x0 + D.ghostIdx * cg.cell + 1.4, w = cg.cell - 2.8;
    const plan = { x, y: cg.y1 - 4.4, w, d: 4.4, r: 0.5 };
    return S(k.slabOf(plan, cg.z0, cg.z1 - cg.z0, P, 2, 0.25), { tone: "lo", crease: "none" });
  }
  function ghostCardTextSvg() {
    const cg = D.cage, idx = D.ghostIdx;
    const x = cg.x0 + idx * cg.cell + 1.4, w = cg.cell - 2.8;
    const z = cg.z0, h = cg.z1 - cg.z0;
    const cx = x + w / 2, yF = cg.y1 + 0.05;
    return vtext(cx, yF, z + h - 2.6, String(idx), 5.0, "mid", "middle")
      + vtext(cx, yF, z + h - 8.8, "SCT 1", 3.6, "lo", "middle")
      + vtext(cx, yF, z + 2.8, "Ptr=0", 3.0, "lo", "middle");
  }
  function ghostCardSvg() {
    return ghostCardBodySvg() + ghostCardTextSvg();
  }

  // ---- EP 上下文指针窗（0=单条传输环 / 1=主流数组） ----
  function epPtrSvg(mode) {
    const ep = D.ep, cx = (ep.wx0 + ep.wx1) / 2;
    let g = winFrame(ep.wx0, ep.wx1, ep.wz0, ep.wz1, ep.faceY - 0.1)
      + vtext(cx, ep.faceY + 0.4, ep.wz1 - 5.2, "TR Dequeue 指针", 4.4, "mid", "middle");
    g += mode === 0
      ? vtext(cx, ep.faceY + 0.4, ep.wz1 - 13.4, "单条传输环", 7, "lo", "middle")
      : vtext(cx, ep.faceY + 0.4, ep.wz1 - 13.4, "主流数组", 7, "hi", "middle");
    return g;
  }

  // ---- TRB 卡（流环上的传输请求块；state: 1 在环 2 已执行） ----
  // kind: "N"=Normal / "E"=Normal+ENT / "D"=Event Data
  // 2026-11-05 遮挡修复轮：体/字拆开（体留 item 序，字入 labels 尾层——
  // con.body/con.lid/wire.bell 分段后画 bbox 盖字全消）。
  function trbBodySvg(ring, slot, kind, state) {
    if (!state) return "";
    const rb = D.rings[ring], z0 = D.ringZ + 2.05;
    const w = 7.8, h = 13;
    const x = rb.x0 + 2 + slot * 9;
    const plan = { x, y: rb.y1 - 9, w, d: 4.2, r: 0.5 };
    const done = state === 2;
    return S(k.slabOf(plan, z0, h, P, 2, 0.2), { tone: done ? "lo" : "hi", crease: "lo" });
  }
  function trbTextSvg(ring, slot, kind, state) {
    if (!state) return "";
    const rb = D.rings[ring], z0 = D.ringZ + 2.05;
    const w = 7.8, h = 13;
    const x = rb.x0 + 2 + slot * 9;
    const done = state === 2;
    const cx = x + w / 2, yF = rb.y1 - 4.8 + 0.05;
    let g = "";
    if (kind === "E") {
      g += vtext(cx, yF, z0 + h - 3.8, "N", 5, done ? "lo" : "hi", "middle");
      g += vtext(cx, yF, z0 + 4.4, "ENT", 3.4, done ? "lo" : "hi", "middle");
    } else if (kind === "N") {
      g += vtext(cx, yF, z0 + h - 3.8, "N", 5, done ? "lo" : "hi", "middle");
    } else {
      g += vtext(cx, yF, z0 + h - 3.8, done ? "✓" : "ED", 4.6, "hi", "middle");
      if (done) g += vtext(cx, yF, z0 + 4.2, "已执行", 3.0, "hi", "middle");
    }
    return g;
  }
  function trbSvg(ring, slot, kind, state) {
    return trbBodySvg(ring, slot, kind, state) + trbTextSvg(ring, slot, kind, state);
  }

  // ---- 小票据卡（沿总线/拉线/事件管行走的令牌；以原点为参考构建，live 平移） ----
  // 2026-11-05 遮挡修复轮：体/字拆开——live 两遍渲染（先全部票体、后全部票字）。
  function tokenSvg(kind) {
    return tokenBodySvg(kind) + tokenTextSvg(kind);
  }
  function tokenBodySvg(kind) {
    const cls = {
      prime: "tk-hc", sid18: "tk-dev", data: "tk-dev", data18: "tk-dev", nrdy: "tk-dev",
      bell: "tk-drv", bell2: "tk-drv", err0: "tk-err", err17: "tk-err", trbdp: "tk-err",
    }[kind];
    const w = 14, h = 11;
    const plan = { x: -w / 2, y: -2.3, w, d: 4.4, r: 0.6 };
    return `<g class="stoken ${cls}">` + S(k.slabOf(plan, -h / 2, h, P, 2, 0.2), { tone: "hi", crease: "lo" }) + `</g>`;
  }
  function tokenTextSvg(kind) {
    const spec = {
      prime: { l1: "Prime", l2: "缓冲已更新", tone: "hc" },
      sid18: { l1: "包头", l2: "SID 18", tone: "dev" },
      data: { l1: "数据", l2: "流 1", tone: "dev" },
      data18: { l1: "数据", l2: "流 18", tone: "dev" },
      nrdy: { l1: "NRDY", l2: "流 1", tone: "dev" },
      bell: { l1: "门铃", l2: "SID 1", tone: "drv" },
      bell2: { l1: "门铃", l2: "SID 1", tone: "drv" },
      err0: { l1: "SID 0", l2: "保留", tone: "err" },
      err17: { l1: "SID 17", l2: "P1·S1", tone: "err" },
      trbdp: { l1: "Set TR", l2: "DP 越界", tone: "err" },
    }[kind];
    const h = 11;
    return vtext(0, 2.15, h / 2 - 3.4, spec.l1, 3.8, "hi", "middle")
      + vtext(0, 2.15, -h / 2 + 4.4, spec.l2, 3.8, spec.tone, "middle");
  }

  // ---- 事件卡（入事件匣的回执） ----
  function eventBodySvg() {
    const w = 16, h = 11;
    const plan = { x: -w / 2, y: -2.2, w, d: 4.2, r: 0.6 };
    return `<g class="stoken tk-ev">` + S(k.slabOf(plan, -h / 2, h, P, 2, 0.2), { tone: "hi", crease: "lo" }) + `</g>`;
  }
  function eventTextSvg(label) {
    const h = 11;
    return vtext(0, 1.95, h / 2 - 3.2, "Event Data", 3.6, "hi", "middle")
      + vtext(0, 1.95, -h / 2 + 4.2, label, 3.2, "mid", "middle");
  }
  function eventCardSvg(label) {
    return eventBodySvg() + eventTextSvg(label);
  }

  // ---- HID 小闸刀臂（t 0=OFF → 1=ON） ----
  function swArmSvg(hx, t, hy, hz) {
    const pitch = ((34 - 44 * t) * Math.PI) / 180;
    const L = 8.8;
    const y = hy ?? D.faceY + 4.2, z = hz ?? 50.8;
    const tip = [hx + L * Math.cos(pitch), y, z + L * Math.sin(pitch)];
    return Ln(k.pathOf([at([hx, y, z]), at(tip)]), { tone: "hi", "stroke-width": 2.2 })
      + S(G.sphereOf([tip[0], tip[1], tip[2]], 1.3, P), { tone: "hi", lit: t > 0.5 });
  }

  return { drumSvg, capWinSvg, splitWinSvg, cstreamSvg, switchSvg, dialSvg, bellBtnSvg, trolleySvg, ctxCardSvg, ctxCardBodySvg, ctxCardTextSvg, secCardSvg, secCardBodySvg, secCardTextSvg, ghostCardSvg, ghostCardBodySvg, ghostCardTextSvg, epPtrSvg, trbSvg, trbBodySvg, trbTextSvg, tokenSvg, tokenBodySvg, tokenTextSvg, eventCardSvg, eventBodySvg, eventTextSvg, swArmSvg, vtext, faceM };
}

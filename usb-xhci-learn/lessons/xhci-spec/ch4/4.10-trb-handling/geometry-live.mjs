// 动件几何（build 生成初始姿态入审计；同一源码内联进页面驱动 live 帧）
// TRB 卡 / 取卡滑车 / 冲压头 / 执行滑车与数据票据 / HALT 闸臂 / EP State 窗 /
// 内存储物柜格 / 事件回执卡 / 收件匣 / 设备票据列 / ERDP 指针卡
export function makeLiveGeo(k, G, D) {
  const P = D.P;
  const at = (p) => k.iso(p, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const Ln = (d, style) => k.lineSvg(d, style);
  const FT = (m, text, size, tone = "mid", anchor = "start") => k.faceTextSvg(m, text, { size, tone, anchor });
  function planeMatrix(o, ex, ey) {
    const p0 = at(o), px = at(G.add3(o, ex)), py = at(G.add3(o, ey));
    const f = (v) => Math.round(v * 100) / 100;
    return `matrix(${f(px[0] - p0[0])} ${f(px[1] - p0[1])} ${f(py[0] - p0[0])} ${f(py[1] - p0[1])} ${f(p0[0])} ${f(p0[1])})`;
  }
  const faceM = (x, y, z) => planeMatrix([x, y, z], [1, 0, 0], [0, 0, -1]);
  const vtext = (x, y, z, text, size, tone = "mid", anchor = "start") => FT(faceM(x, y, z), text, size, tone, anchor);
  const TOP = D.top;

  // ---- TRB 卡（竖立骑轨：底板 + 拉耳 + 卡面刻字 + 旗标位；done=1 加完成杠） ----
  function trbCardSvg(x, def, done) {
    const z = TOP + 7, yF = D.railY - D.trbT;   // 卡前面（面向观众 -y）
    let g = S(k.slabOf({ x, y: yF, w: D.trbW, d: D.trbT, r: 0.8 }, z, D.trbH, P, 2, 0.3), { tone: "hi" });
    g += vtext(x + D.trbW / 2, yF + 0.05, z + D.trbH - 12, def.name, 6.8, "hi", "middle");
    g += vtext(x + D.trbW / 2, yF + 0.05, z + 10.4, def.sub, 4.2, "mid", "middle");
    if (def.flag) {
      const fl = def.flag === "IOC" ? "IOC=1" : "ISP=1";
      g += vtext(x + D.trbW / 2, yF + 0.05, z + 4.6, fl, 5.2, "hi", "middle");
    } else {
      g += k.dotsSvg([[x + 2.4, yF + 0.2, z + D.trbH - 2], [x + D.trbW - 2.4, yF + 0.2, z + D.trbH - 2]].map((p) => at(p)), { size: 0.4 });
    }
    if (done) g += Ln(k.pathOf([[x + 2.5, yF + 0.05, z + D.trbH - 8.6], [x + D.trbW - 2.5, yF + 0.05, z + D.trbH - 8.6]].map(at)), { tone: "hi", "stroke-width": 1.6, free: true });
    return g;
  }

  // ---- 取卡滑车（Dequeue 指针：车体骑卡行上方（底贴卡顶）+ 验位压头 drop 0..1 下压） ----
  function dqCarSvg(cx, drop) {
    const yC = D.railY - 8, zC = D.top + 7 + D.trbH;   // 车底=卡顶
    let g = S(k.slabOf({ x: cx - 9, y: yC - 5, w: 18, d: 10, r: 1.4 }, zC, 8, P, 3, 0.4), { tone: "hi" });
    g += S(k.slabOf({ x: cx - 12.5, y: yC - 4, w: 4, d: 8, r: 0.6 }, zC - 4, 4.5, P, 2), { tone: "mid" });
    g += S(k.slabOf({ x: cx + 8.5, y: yC - 4, w: 4, d: 8, r: 0.6 }, zC - 4, 4.5, P, 2), { tone: "mid" });
    // 验位压头（竖杆 + 触盘，drop 下压探向卡面）
    const hz = zC - 4 - drop * 9;
    g += Ln(k.pathOf([at([cx, yC - 4, zC - 2]), at([cx, yC - 4.2, hz + 2.4])]), { tone: "mid", "stroke-width": 1.7 });
    g += S(G.disc(0, 1.1, 3.4, G.frameOf([cx, yC - 4.6, hz], [0, 1, 0], [1, 0, 0], [0, 0, 1]), P, { steps: 16, bevel: 0.2 }), { tone: "hi" });
    g += vtext(cx - 13, yC - 9.6, zC + 4, "Dequeue", 4.6, "lo");
    return g;
  }

  // ---- 冲压头（t 0 抬起（顶贴冲压顶座底）→ 1 压到出卡口上方） ----
  function stampHeadSvg(t) {
    const cx = D.stamp.x + D.stamp.w / 2, yB = D.stamp.y + D.stamp.d - 4;
    const z = D.top + 33 - t * 16;
    let g = S(k.slabOf({ x: D.stamp.x + 14, y: yB, w: D.stamp.w - 28, d: 6, r: 1 }, z, 8, P, 2, 0.3), { tone: "hi" });
    // 行程导杆（板顶 → 顶座底，随行程显现）
    g += Ln(k.pathOf([at([D.stamp.x + 16, yB + 3, z + 8]), at([D.stamp.x + 16, yB + 3, D.top + 41])]), { tone: "mid", "stroke-width": 1.4 });
    g += Ln(k.pathOf([at([D.stamp.x + D.stamp.w - 16, yB + 3, z + 8]), at([D.stamp.x + D.stamp.w - 16, yB + 3, D.top + 41])]), { tone: "mid", "stroke-width": 1.4 });
    return g;
  }

  // ---- 事件回执卡（竖立：卡面 CC + Length；z 指定底高——轨道位=D.evZ） ----
  function evCardSvg(x, yFace, def, z = D.evZ) {
    let g = S(k.slabOf({ x, y: yFace, w: D.evW, d: 2.6, r: 0.7 }, z, 20, P, 2, 0.25), { tone: "hi" });
    g += vtext(x + D.evW / 2, yFace + 0.05, z + 14.2, def.cc, 4.6, "hi", "middle");
    g += vtext(x + D.evW / 2, yFace + 0.05, z + 7.8, def.len, 4, "mid", "middle");
    g += vtext(x + D.evW / 2, yFace + 0.05, z + 2.6, "Transfer Event", 3.4, "lo", "middle");
    return g;
  }
  // 事件卡的「冲压出卡途中」姿态（在冲压位出卡口上方空中，live 用渐移插值）
  function evFlySvg(x, y, z, def) {
    return evCardSvg(x, y, def, z);
  }

  // ---- ERDP 指针卡（贴轨道右端的小立牌；底延到轨道床顶，与实体记录同位） ----
  function erdpSvg() {
    const px = D.evX.length ? D.evX[D.evX.length - 1] + 28 : 0;
    const ey = D.evFaceY - 27;                    // = EVR.y+26，与实体记录一致
    let g = S(k.slabOf({ x: px, y: ey, w: 16, d: 2.2, r: 0.8 }, D.evZ - 3.4, 13.4, P, 2, 0.2), { tone: "hi" });
    g += vtext(px + 8, ey + 0.05, D.evZ + 1.4, "ERDP", 5, "hi", "middle");
    return g;
  }

  // ---- 执行滑车（沿 y 导轨：车体 + 抓臂 + 抓着的数据票据 n 张） ----
  function exeCarSvg(y, nTicket) {
    const x = D.drail.x;
    let g = S(k.slabOf({ x: x - 7, y: y - 6, w: 14, d: 12, r: 1.6 }, D.top + 12, 9, P, 3, 0.4), { tone: "hi" });
    g += Ln(k.pathOf([at([x - 4.5, y - 6, D.top + 13]), at([x - 4.5, y + 6, D.top + 13])]), { tone: "lo", "stroke-width": 1.2 });
    g += Ln(k.pathOf([at([x + 4.5, y - 6, D.top + 13]), at([x + 4.5, y + 6, D.top + 13])]), { tone: "lo", "stroke-width": 1.2 });
    for (let i = 0; i < nTicket; i++) {
      g += ticketSvg(x + 5.5, y + 4 - i * 4.2, D.top + 21);
    }
    return g;
  }
  // ---- 数据票据（薄卡一张） ----
  function ticketSvg(x, y, z) {
    return S(k.slabOf({ x, y, w: 8, d: 5, r: 0.6 }, z, 1.8, P, 2, 0.15), { tone: "hi" });
  }
  // ---- 设备待发票据列（盒顶右段 n 张叠放；盒顶=PLATE_H+26.6=38.6） ----
  function devTicketsSvg(n) {
    const bx = D.dev.x + 34, by = D.dev.y + 18;
    let g = "";
    for (let i = 0; i < n; i++) {
      g += S(k.slabOf({ x: bx, y: by, w: 9, d: 6, r: 0.6 }, 38.8 + i * 2.1, 1.8, P, 2, 0.15), { tone: "hi" });
    }
    return g;
  }

  // ---- 内存储物柜格内容（cells=[n0,n1,n2] 每格票据数） ----
  function memCellsSvg(cells) {
    let g = "";
    for (let i = 0; i < cells.length; i++) {
      const cx = D.mem.cx[i];
      for (let j = 0; j < cells[i]; j++) {
        g += S(k.slabOf({ x: cx, y: D.mem.y + 4, w: 9, d: 6, r: 0.6 }, D.top + 4.5 + j * 2.1, 1.8, P, 2, 0.15), { tone: "hi" });
      }
    }
    return g;
  }

  // ---- EP State 数码窗（文字态 Running/Halted/Stopped） ----
  function epsWinSvg(state) {
    const bx = 22 + 4, by = -96; // EPS 板前面
    const tone = state === "Halted" ? "hi" : state === "Stopped" ? "mid" : "hi";
    return vtext(26, by + 0.05, D.top + 12.4, state, 8.4, tone);
  }

  // ---- HALT 闸臂（t 0 OFF 上翘 → 1 ON 压触点；球心=铰柱顶上方相切 z+17.2） ----
  function haltArmSvg(t) {
    const pitch = ((50 - 52 * t) * Math.PI) / 180;
    const [hx, hy, hz] = [D.halt.hinge[0], D.halt.hinge[1], D.halt.z + 17.2];
    const L = 36;
    const tip = [hx + L * Math.cos(pitch), hy, hz + L * Math.sin(pitch)];
    const mid = [hx + (L - 8) * Math.cos(pitch), hy, hz + (L - 8) * Math.sin(pitch)];
    return S(k.cylinder(D.halt.hinge[0], D.halt.hinge[1], 2.2, D.halt.z + 9, 9, P, 16, 0.3), { tone: "mid" })
      + Ln(k.pathOf([at([hx, hy, hz]), at(mid)]), { tone: "hi", "stroke-width": 2.2 })
      + Ln(k.pathOf([at(mid), at(tip)]), { tone: "hi", "stroke-width": 3.8 })
      + S(G.sphereOf([hx, hy, hz], 2.2, P), { tone: "mid" })
      + S(G.sphereOf([tip[0], tip[1], tip[2]], 2.5, P), { tone: "hi", lit: true });
  }

  // ---- 收件匣内容（n=卡数：竖卡落入匣内） ----
  function inboxSvg(cx, yTop, n) {
    let g = "";
    for (let j = 0; j < n; j++) {
      g += S(k.slabOf({ x: cx - 9 + j * 9, y: yTop + 4, w: 8, d: 2.2, r: 0.6 }, 43, 14, P, 2, 0.2), { tone: "hi" });
    }
    return g;
  }

  return { trbCardSvg, dqCarSvg, stampHeadSvg, evCardSvg, evFlySvg, erdpSvg, exeCarSvg, ticketSvg, devTicketsSvg, memCellsSvg, epsWinSvg, haltArmSvg, inboxSvg, vtext, faceM };
}

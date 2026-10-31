// Fig2 环形分度轨道 —— node 构建与页面实时共用的绘图件
// 传入 k（iso-kit）、G（lathe）、P（投影）、L（布局常量）；只画形状，不决定时机。
export function makeGeo(k, G, P, L) {
  const V = G.viewOf(P);
  const at = (p) => k.iso(p, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const Ln = (d, style) => k.lineSvg(d, style);
  const Dots = (points, style) => k.dotsSvg(points, style);
  const T = L.T;
  const PR = L.PR;
  const TOP = L.TOP;
  const DEG = Math.PI / 180;

  // 任意竖直面文字/面板矩阵
  function faceMatrix(o, ex) {
    const p0 = at(o);
    const px = at(G.add3(o, ex));
    const py = at([o[0], o[1], o[2] - 1]);
    const v = (x) => x.toFixed(4);
    return `matrix(${v(px[0] - p0[0])} ${v(px[1] - p0[1])} ${v(py[0] - p0[0])} ${v(py[1] - p0[1])} ${p0[0].toFixed(2)} ${p0[1].toFixed(2)})`;
  }

  // ---------- 槽位 ----------
  const slotBearing = (i) => (L.A0 + i * 22.5) * DEG;
  const slotDir = (i) => [Math.cos(slotBearing(i)), Math.sin(slotBearing(i))];
  const slotCentre = (i) => [T[0] + PR * slotDir(i)[0], T[1] + PR * slotDir(i)[1]];

  // 槽坑：台面上的切向凹腔（内嵌 flat 件）+ 沿口刻线（外端没入色带）
  function pocketSvg(i) {
    const [cx, cy] = slotCentre(i);
    const dir = slotDir(i);
    const tan = [-dir[1], dir[0]];
    const HL = 7.6, HW = 5.3;
    const corner = (su, sv) => [cx + su * HL * tan[0] + sv * HW * dir[0], cy + su * HL * tan[1] + sv * HW * dir[1]];
    const ring = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
    const floorD = k.pathOf(ring.map((p) => at([p[0], p[1], TOP])), true);
    const edgeD = k.pathOf(ring.map((p) => at([p[0], p[1], TOP + 0.06])), true);
    const ticks = [];
    for (const su of [-1, 0, 1]) {
      const a = [cx + su * HL * tan[0] + HW * dir[0], cy + su * HL * tan[1] + HW * dir[1]];
      const b = [cx + su * HL * tan[0] + (HW + 2.8) * dir[0], cy + su * HL * tan[1] + (HW + 2.8) * dir[1]];
      ticks.push(k.pathOf([at([a[0], a[1], TOP + 0.06]), at([b[0], b[1], TOP + 0.06])]));
    }
    return (
      `<path class="fb-pocket" d="${floorD}"/>` +
      Ln(edgeD, { tone: "lo" }) +
      Ln(ticks.join(""), { tone: "lo" })
    );
  }

  // 所有权色带：槽外沿的闭合扇环（无开口线头）
  function bandSvg(i) {
    const b0 = slotBearing(i) - 0.135, b1 = slotBearing(i) + 0.135;
    const r0 = 78.6, r1 = 82.4;
    const N = 7;
    const pts = [];
    for (let s = 0; s <= N; s++) {
      const a = b0 + (b1 - b0) * (s / N);
      pts.push([T[0] + r0 * Math.cos(a), T[1] + r0 * Math.sin(a)]);
    }
    for (let s = N; s >= 0; s--) {
      const a = b0 + (b1 - b0) * (s / N);
      pts.push([T[0] + r1 * Math.cos(a), T[1] + r1 * Math.sin(a)]);
    }
    const d = k.pathOf(pts.map((p) => at([p[0], p[1], TOP + 0.09])), true);
    return `<path class="fb-band" data-slot="${i}" d="${d}"/>`;
  }

  // ---------- TRB 托盘（按世界坐标摆放：绕槽心旋转的圆角板） ----------
  function traySvgAt(cx, cy, bearingDeg, cyc, z = TOP, opts = {}) {
    const local = { x: -6.4, y: -4.4, w: 12.8, d: 8.8, r: 1.6 };
    const th = (bearingDeg) * DEG;
    const rot = ([x, y]) => [cx + x * Math.cos(th) - y * Math.sin(th), cy + x * Math.sin(th) + y * Math.cos(th)];
    const ring = k.roundedPlan(local, 3).map(rot);
    const inner = k.roundedPlan(k.insetPlan(local, 1.6), 3).map(rot);
    const out = [];
    out.push(S(k.extrude(ring, z, 2.3, P, { convex: true, bevel: 0.4 }), { tone: "hi", crease: "lo", ...(opts.lit ? { lit: true } : {}) }));
    out.push(Ln(k.pathOf(inner.map((p) => at([p[0], p[1], z + 2.3])), true), { tone: "lo" }));
    const dot = at([cx, cy, z + 2.35]);
    out.push(`<circle class="fb-cyc" data-cyc="${cyc}" cx="${dot[0].toFixed(2)}" cy="${dot[1].toFixed(2)}" r="1.8"/>`);
    const rules = [];
    for (const u of [-3.4, 0, 3.4]) {
      const p = rot([u, -3.2]);
      const q = rot([u, 3.2]);
      rules.push(k.pathOf([at([p[0], p[1], z + 2.32]), at([q[0], q[1], z + 2.32])]));
    }
    out.push(Ln(rules.join(""), { tone: "lo", free: true }));
    return out.join("");
  }
  const traySvg = (i, cyc, opts = {}) => {
    const [cx, cy] = slotCentre(i);
    return traySvgAt(cx, cy, (slotBearing(i) * 180) / Math.PI + 90, cyc, TOP, opts);
  };

  // ---------- Link 接续导轨（15→0 边界桥） ----------
  const LINK_B = () => slotBearing(15) + 0.16;
  function linkBridgeStatic() {
    const b = LINK_B();
    const dir = [Math.cos(b), Math.sin(b)];
    const tan = [-dir[1], dir[0]];
    const out = [];
    for (const s of [-1, 1]) {
      const px = T[0] + 88 * dir[0] + s * 5.4 * tan[0];
      const py = T[1] + 88 * dir[1] + s * 5.4 * tan[1];
      out.push(S(k.cylinder(px, py, 1.9, TOP, 7, P, 20), { tone: "mid" }));
      out.push(Dots([at([px, py, TOP + 7])], { size: 0.45 }));
    }
    const r0 = [T[0] + 88 * dir[0] - 13 * tan[0] - 3.2 * dir[0], T[1] + 88 * dir[1] - 13 * tan[1] - 3.2 * dir[1]];
    const r1 = [T[0] + 88 * dir[0] + 13 * tan[0] + 3.2 * dir[0], T[1] + 88 * dir[1] + 13 * tan[1] + 3.2 * dir[1]];
    out.push(
      S(
        k.slabOf({ x: Math.min(r0[0], r1[0]), y: Math.min(r0[1], r1[1]), w: Math.abs(r1[0] - r0[0]), d: Math.abs(r1[1] - r0[1]), r: 2 }, TOP + 7, 1.6, P, 4, 0.4),
        { tone: "mid" },
      ),
    );
    return out.join("");
  }
  // Link 托板：坐在 15 槽坑里，两端有链片记号
  function linkPalletSvg(cyc, opts = {}) {
    const [cx, cy] = slotCentre(15);
    const a = slotBearing(15) + Math.PI / 2;
    const rot = ([x, y]) => [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)];
    const ring = k.roundedPlan({ x: -6.4, y: -4.4, w: 12.8, d: 8.8, r: 1.6 }, 3).map(rot);
    const out = [];
    out.push(S(k.extrude(ring, TOP, 2.3, P, { convex: true, bevel: 0.4 }), { tone: "hi", crease: "lo", ...(opts.lit ? { lit: true } : {}) }));
    const tabs = [];
    for (const u of [-3.8, 3.8]) {
      const quad = [[u - 1.1, -1.1], [u + 1.1, -1.1], [u + 1.1, 1.1], [u - 1.1, 1.1]].map(([x, y]) => {
        const w = rot([x, y]);
        return at([w[0], w[1], TOP + 2.3]);
      });
      tabs.push(k.pathOf(quad, true));
    }
    out.push(Ln(tabs.join(""), { tone: "lo" }));
    const dot = at([cx, cy, TOP + 2.35]);
    out.push(`<circle class="fb-cyc" data-cyc="${cyc}" cx="${dot[0].toFixed(2)}" cy="${dot[1].toFixed(2)}" r="1.8"/>`);
    return out.join("");
  }
  // TC 翻色杆：angle 0 收平 / 1 翻起
  function leverPivot() {
    const b = LINK_B();
    const lp = slotCentre(15);
    return [T[0] + 96 * Math.cos(b) - 3 * Math.sin(b), T[1] + 96 * Math.sin(b) + 3 * Math.cos(b), TOP + 8.6];
  }
  function leverSvg(angle) {
    const p = leverPivot();
    const b = LINK_B();
    const dir = [Math.cos(b), Math.sin(b)];
    const len = 6.4;
    const tip = [p[0] + dir[0] * len, p[1] + dir[1] * len, p[2] + angle * 2.2];
    return (
      Ln(k.pathOf([at(p), at(tip)]), { tone: "lit", free: "end", class: "fb-lever" }) +
      Dots([at(p)], { size: 0.8, tone: "hi" })
    );
  }

  // ---------- 生产者旋臂 + 冲压头 ----------
  // 返回各件的 (frame, polygon, s0, s1) 供 G.prismOf 画、A.prism 记录
  function producerParts(bearing, headBottom) {
    const dir = [Math.cos(bearing), Math.sin(bearing), 0];
    const tan = [-dir[1], dir[0], 0];
    const F = (r0) => G.frameOf([T[0] + r0 * dir[0], T[1] + r0 * dir[1], 0], dir, [0, 0, 1], tan);
    const parts = [];
    const add = (r0, len, z0, z1, w, style) => parts.push({ F: F(r0), poly: [[z0, -w], [z1, -w], [z1, w], [z0, w]], s0: 0, s1: len, style, centre: [T[0] + (r0 + len / 2) * dir[0], T[1] + (r0 + len / 2) * dir[1], (z0 + z1) / 2] });
    add(7.6, 58.9, L.BOOM_Z, L.BOOM_Z + 7, 2.9, { tone: "mid" });          // 旋臂主梁（内端坐在轴承座上）
    add(7.6, 58.9, L.BOOM_Z + 7, L.BOOM_Z + 8, 1.1, { tone: "hi" });       // 梁顶脊条
    add(60, 6, L.HEAD_PARK + 7, L.BOOM_Z + 7, 3.2, { tone: "lo" });        // 滑道上段
    add(60, 6, 32, L.HEAD_PARK, 3.2, { tone: "lo" });               // 滑道下段（落到台面）
    add(58.5, 10, L.HEAD_PARK + 7, L.BOOM_Z + 11, 5.4, { tone: "mid" });   // 头座（滑道顶的罩壳）
    add(60.5, 20, headBottom, headBottom + 7, 7.4, { tone: "hi" });        // 冲压头
    add(67.5, 13, headBottom - 1.4, headBottom, 5, { tone: "hi" });        // 底板
    add(66, 20, L.BOOM_Z + 7, L.BOOM_Z + 8.4, 1.2, { tone: "mid" });       // 指针旗横臂
    return parts;
  }
  // 桁架拉杆：mast 顶到臂端的细圆杆
  function tieRod(bearing) {
    const dir = [Math.cos(bearing), Math.sin(bearing)];
    const a = [T[0] + 6 * dir[0], T[1] + 6 * dir[1], L.BOOM_Z - 1.5];
    const b = [T[0] + 60 * dir[0], T[1] + 60 * dir[1], L.BOOM_Z + 7];
    const d = G.unit3(G.sub3(b, a));
    const len = G.len3(G.sub3(b, a));
    const F = G.frameAlong(a, d);
    const poly = [[-0.55, -0.55], [0.55, -0.55], [0.55, 0.55], [-0.55, 0.55]];
    return { F, poly, s0: 0, s1: len, style: { tone: "mid" }, centre: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2] };
  }
  // 平置小旗（俯读），文字沿旗面长边；变体：直接给世界中心
  function flagSvgAtWrap(bearing, c, top, label, opts = {}) {
    return flagSvgCore(bearing, c, top, label, "", opts);
  }
  function flagSvg(bearing, radius, top, label, sub, opts = {}) {
    const dir = [Math.cos(bearing), Math.sin(bearing)];
    const c = [T[0] + radius * dir[0], T[1] + radius * dir[1]];
    return flagSvgCore(bearing, c, top, label, sub, opts);
  }
  function flagSvgCore(bearing, c, top, label, sub, opts = {}) {
    const w = opts.w || 10, d = opts.d || 3.9;
    const plan = { x: -w, y: -d, w: w * 2, d: d * 2, r: 1.2 };
    const th = bearing + Math.PI / 2;
    const rot = ([x, y]) => [c[0] + x * Math.cos(th) - y * Math.sin(th), c[1] + x * Math.sin(th) + y * Math.cos(th)];
    const ring = k.roundedPlan(plan, 3).map(rot);
    const o = rot([-w + 0.8, -d + 0.9]);
    const cls = opts.cls || "fb-sign";
    const svg =
      S(k.extrude(ring, top, 1.2, P, { convex: true, bevel: 0.3 }), { tone: "hi" }) +
      `<g transform="${faceMatrix([o[0], o[1], top + 1.25], [Math.sin(th), -Math.cos(th), 0])}">` +
      `<text class="${cls}" x="0" y="0" text-anchor="start">${label}</text>` +
      (sub ? `<text class="${cls} fb-sign2" x="0" y="3.9" text-anchor="start">${sub}</text>` : "") +
      `</g>`;
    return svg;
  }
  function producerSvg(bearing, headBottom, opts = {}) {
    const parts = producerParts(bearing, headBottom);
    parts.push(tieRod(bearing));
    const out = parts.map((p) => S(G.prismOf(p.F, p.poly, p.s0, p.s1, P), p.style)).join("");
    const dir = [Math.cos(bearing), Math.sin(bearing)];
    const tan = [-dir[1], dir[0]];
    // 臂端下指箭头（闭合三角，指向当前槽）
    const base = [T[0] + 86 * dir[0], T[1] + 86 * dir[1], L.BOOM_Z - 1.6];
    const a0 = [base[0] - 2.8 * tan[0], base[1] - 2.8 * tan[1], base[2]];
    const a1 = [base[0] + 2.8 * tan[0], base[1] + 2.8 * tan[1], base[2]];
    const arrow = `<path class="fb-arrow" d="${k.pathOf([at(a0), at(a1), at([base[0], base[1], base[2] - 4.4])], true)}"/>`;
    return (
      out + arrow +
      flagSvg(bearing, 86, L.BOOM_Z + 8.6, "ENQ · " + (opts.enqLabel != null ? opts.enqLabel : ""), "") +
      flagSvg(bearing, 34, L.BOOM_Z + 8.6, "软件 · 生产者", "", { w: 10.5, d: 3, cls: "fb-sign-sm" })
    );
  }

  // ---------- 消费者环轨行车 ----------
  // 件列表与 consumerSvg 的棱柱一一对应，供构建侧 A.prism 记录
  function consumerParts(bearing, gripZ, gripR = 72.6) {
    const dir = [Math.cos(bearing), Math.sin(bearing), 0];
    const tan = [-dir[1], dir[0], 0];
    const F = (r0) => G.frameOf([T[0] + r0 * dir[0], T[1] + r0 * dir[1], 0], dir, [0, 0, 1], tan);
    const defs = [
      [86.4, 7.2, L.RAIL_TOP, L.RAIL_TOP + 3.4, 4.4, { tone: "mid" }],
      [93.8, 2.4, 41.5, L.RAIL_TOP + 3.4, 3, { tone: "mid" }],
      [gripR + 5.4, 93.8 - gripR - 5.4, 41.5, 45.5, 1.9, { tone: "mid" }],
      [gripR - 7, 14, gripZ, gripZ + 3.4, 10.2, { tone: "hi" }],
      [gripR - 4.2, 9, 33.5, gripZ, 7.1, { tone: "hi" }],
    ];
    const parts = defs.map(([r0, len, z0, z1, w, style]) => ({ F: F(r0), poly: [[z0, -w], [z1, -w], [z1, w], [z0, w]], s0: 0, s1: len, style, centre: [T[0] + (r0 + len / 2) * dir[0], T[1] + (r0 + len / 2) * dir[1], (z0 + z1) / 2] }));
    const FF = G.frameOf([T[0] + (gripR - 4.2) * dir[0], T[1] + (gripR - 4.2) * dir[1], 0], dir, [0, 0, 1], tan);
    parts.push({ F: FF, poly: [[33.5, -8.15], [gripZ, -8.15], [gripZ, -7.1], [33.5, -7.1]], s0: 0, s1: 9, style: { tone: "hi" }, centre: [T[0] + gripR * dir[0], T[1] + gripR * dir[1], (33.5 + gripZ) / 2] });
    return parts;
  }
  function consumerSvg(bearing, gripZ, carrying, cyc, opts = {}) {
    const gripR = opts.gripR != null ? opts.gripR : 72.6;
    const deqLabel = opts.deqLabel != null ? opts.deqLabel : "";
    const dir = [Math.cos(bearing), Math.sin(bearing)];
    const tan = [-dir[1], dir[0]];
    const out = [];
    const prism = (r0, len, z0, z1, w, style) => {
      const F = G.frameOf([T[0] + r0 * dir[0], T[1] + r0 * dir[1], 0], dir, [0, 0, 1], tan);
      out.push(S(G.prismOf(F, [[z0, -w], [z1, -w], [z1, w], [z0, w]], 0, len, P), style));
    };
    prism(86.4, 7.2, L.RAIL_TOP, L.RAIL_TOP + 3.4, 4.4, { tone: "mid" });
    prism(93.8, 2.4, 41.5, L.RAIL_TOP + 3.4, 3, { tone: "mid" });
    prism(gripR + 5.4, 93.8 - gripR - 5.4, 41.5, 45.5, 1.9, { tone: "mid" });
    prism(gripR - 1.5, 3, 41.5, gripZ + 3.4, 1.2, { tone: "lo" });
    prism(gripR - 7, 14, gripZ, gripZ + 3.4, 10.2, { tone: "hi", ...(carrying ? { lit: true } : {}) });
    // 两指（横梁头下缘垂下，贴住托盘两侧壁）
    prism(gripR - 4.2, 9, 33.5, gripZ, 8, { tone: "hi" });
    {
      const FN = G.frameOf([T[0] + (gripR - 4.2) * dir[0], T[1] + (gripR - 4.2) * dir[1], 0], dir, [0, 0, 1], tan);
      out.push(S(G.prismOf(FN, [[33.5, -8.15], [gripZ, -8.15], [gripZ, -7.1], [33.5, -7.1]], 0, 9, P), { tone: "hi" }));
    }
    // dequeue 下指箭头 + 旗
    const base = [T[0] + 100.5 * dir[0], T[1] + 100.5 * dir[1], L.RAIL_TOP + 1.4];
    const a0 = [base[0] - 2.8 * tan[0], base[1] - 2.8 * tan[1], base[2]];
    const a1 = [base[0] + 2.8 * tan[0], base[1] + 2.8 * tan[1], base[2]];
    out.push(`<path class="fb-arrow" d="${k.pathOf([at(a0), at(a1), at([base[0], base[1], base[2] - 4.4])], true)}"/>`);
    out.push(flagSvg(bearing, 100.5, L.RAIL_TOP + 2, "DEQ · " + deqLabel, ""));
    out.push(flagSvg(bearing, 107.5, L.RAIL_TOP + 2, "xHC · 消费者", "", { w: 10.5, d: 3, cls: "fb-sign-sm" }));
    // 夹持中的托盘
    if (carrying) {
      const c = [T[0] + gripR * dir[0], T[1] + gripR * dir[1]];
      out.push(traySvgAt(c[0], c[1], (bearing * 180) / Math.PI + 90, cyc, gripZ - 6.5, { lit: true }));
    }
    return out.join("");
  }

  // ---------- 位域刻度卡 ----------
  const CARD = { w: 148, h: 118 };
  const tickX = (b) => -CARD.w / 2 + 14 + (31 - b) * ((CARD.w - 28) / 31);
  function rowTicks(yBottom) {
    const minor = [], major = [];
    for (let b = 0; b <= 31; b++) {
      const x = tickX(b);
      const top = yBottom - (b % 8 === 0 ? 3.2 : 1.9);
      const w = b % 8 === 0 ? 0.9 : 0.5;
      const dd = `<rect class="fb-tick-${b % 8 === 0 ? "mid" : "lo"}" x="${(x - w / 2).toFixed(2)}" y="${top.toFixed(2)}" width="${w}" height="${(yBottom - top).toFixed(2)}"/>`;
      (b % 8 === 0 ? major : minor).push(dd);
    }
    return { minor, major };
  }
  const cellX = (hi, lo) => [tickX(hi) - 1.2, tickX(lo) + 1.2];
  function cardSvg(spec) {
    const out = [];
    const m = faceMatrix(L.CARD_O, L.CARD_EX);
    out.push(`<g transform="${m}">`);
    out.push(`<rect class="fb-card" x="${-CARD.w / 2}" y="${-CARD.h / 2}" width="${CARD.w}" height="${CARD.h}" rx="3"/>`);
    out.push(`<text class="fb-title" x="0" y="${-CARD.h / 2 + 8}" text-anchor="middle">${spec.title}</text>`);
    out.push(`<text class="fb-sub" x="0" y="${-CARD.h / 2 + 13}" text-anchor="middle">${spec.sub}</text>`);
    const rowY0 = -CARD.h / 2 + 17;
    const rowH = 18.6;
    spec.rows.forEach((row, r) => {
      const y = rowY0 + r * rowH;
      out.push(`<text class="fb-off" x="${-CARD.w / 2 + 3}" y="${y - 1.2}">${row.offset}</text>`);
      const cellsTop = y + 8.6;
      const t = rowTicks(cellsTop);
      out.push(t.minor.join(""));
      out.push(t.major.join(""));
      [31, 23, 15, 7].forEach((b) => out.push(`<text class="fb-bit" x="${tickX(b)}" y="${cellsTop - 4.4}" text-anchor="middle">${b}</text>`));
      row.cells.forEach((c) => {
        const [x0, x1] = cellX(c.hi, c.lo);
        out.push(`<rect class="fb-cell ${c.dim ? "fb-dim" : ""}" x="${x0.toFixed(2)}" y="${cellsTop.toFixed(2)}" width="${(x1 - x0).toFixed(2)}" height="5.8" rx="0.7"/>`);
        const mid = (x0 + x1) / 2;
        if (c.name && x1 - x0 > 13) out.push(`<text class="fb-cellname" x="${mid.toFixed(2)}" y="${(cellsTop + 4.2).toFixed(2)}" text-anchor="middle">${c.name}</text>`);
        else if (c.name) out.push(`<text class="fb-cellname fb-tiny" x="${mid.toFixed(2)}" y="${(cellsTop + 4.1).toFixed(2)}" text-anchor="middle">${c.name}</text>`);
        if (c.val !== undefined) out.push(`<text class="fb-val" x="${mid.toFixed(2)}" y="${(cellsTop + 9.2).toFixed(2)}" text-anchor="middle">${c.val}</text>`);
      });
    });
    const fy = rowY0 + 4 * rowH + 1.4;
    out.push(`<path class="fb-rule" d="M${-CARD.w / 2} ${fy}H${CARD.w / 2}"/>`);
    (spec.footer || []).forEach((line, i) => {
      out.push(`<text class="fb-foot" x="${-CARD.w / 2 + 3}" y="${fy + 5.6 + i * 5.8}">${line}</text>`);
    });
    out.push(`</g>`);
    return out.join("");
  }

  const NORMAL_CARD = {
    title: "Normal TRB · Type 1",
    sub: "EP1 OUT bulk · 6144 B · 单 TRB TD",
    rows: [
      { offset: "03-00H", cells: [{ hi: 31, lo: 0, name: "Data Buffer Pointer Lo", val: "" }] },
      { offset: "07-04H", cells: [{ hi: 31, lo: 0, name: "Data Buffer Pointer Hi", val: "" }] },
      {
        offset: "0B-08H",
        cells: [
          { hi: 31, lo: 22, name: "Intr Target", val: "0" },
          { hi: 21, lo: 17, name: "TD Size", val: "0" },
          { hi: 16, lo: 0, name: "TRB Transfer Length", val: "6144" },
        ],
      },
      {
        offset: "0F-0CH",
        cells: [
          { hi: 31, lo: 16, dim: true },
          { hi: 15, lo: 10, name: "TRB Type", val: "1" },
          { hi: 9, lo: 7, dim: true },
          { hi: 6, lo: 6, name: "IDT", val: "0" },
          { hi: 5, lo: 5, name: "IOC", val: "1" },
          { hi: 4, lo: 4, name: "CH", val: "0" },
          { hi: 3, lo: 1, dim: true },
          { hi: 0, lo: 0, name: "C", val: "1" },
        ],
      },
    ],
    footer: [
      "TD Size=本 TRB 之后该 TD 剩余 MPS 包数 · 单 TRB TD 恒 0",
      "满:ENQ 前槽 cyc=CCS(有未取件) · 空:DEQ=ENQ 且 cyc≠CCS",
    ],
  };
  const LINK_CARD = {
    title: "Link TRB · Type 6",
    sub: "段尾接续导轨 · TC=1 回绕翻色",
    rows: [
      { offset: "03-00H", cells: [{ hi: 31, lo: 0, name: "Ring Segment Pointer Lo", val: "" }] },
      { offset: "07-04H", cells: [{ hi: 31, lo: 0, name: "Ring Segment Pointer Hi", val: "→ 段首 0 槽" }] },
      {
        offset: "0B-08H",
        cells: [
          { hi: 31, lo: 22, name: "Intr Target", val: "0" },
          { hi: 21, lo: 0, dim: true },
        ],
      },
      {
        offset: "0F-0CH",
        cells: [
          { hi: 31, lo: 16, dim: true },
          { hi: 15, lo: 10, name: "TRB Type", val: "6" },
          { hi: 9, lo: 6, dim: true },
          { hi: 5, lo: 5, name: "IOC", val: "0" },
          { hi: 4, lo: 4, name: "CH", val: "0" },
          { hi: 3, lo: 2, dim: true },
          { hi: 1, lo: 1, name: "TC", val: "1" },
          { hi: 0, lo: 0, name: "C", val: "1" },
        ],
      },
    ],
    footer: NORMAL_CARD.footer,
  };

  // 台面修饰：同心工艺环 + 中心毂环（让大台面有可读的机加纹理）
  function tableDress() {
    const F = G.frameOf([T[0], T[1], 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    const arcs = [42, 58].map((r) => k.ring(T[0], T[1], r, TOP + 0.07, P, 72)).join("");
    const hub = k.ring(T[0], T[1], 14.5, TOP + 0.07, P, 40);
    const bolts = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.26;
      bolts.push(at([T[0] + 18 * Math.cos(a), T[1] + 18 * Math.sin(a), TOP + 0.08]));
    }
    return Ln(arcs, { tone: "faint" }) + Ln(hub, { tone: "lo" }) + Dots(bolts, { size: 0.5, tone: "lo" });
  }

  return {
    at, S, Ln, Dots, V, faceMatrix, DEG,
    slotBearing, slotDir, slotCentre,
    pocketSvg, bandSvg, traySvg, traySvgAt, tableDress,
    linkBridgeStatic, linkPalletSvg, leverSvg, leverPivot, LINK_B,
    producerParts, tieRod, producerSvg, consumerParts, consumerSvg, flagSvg, flagSvgAtWrap,
    cardSvg, NORMAL_CARD, LINK_CARD, CARD,
  };
}

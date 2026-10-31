// Fig3 回执登记机：事件环的生产与消费 —— node 构建与页面实时共用的绘图件
// 传入 k（iso-kit）、G（lathe）、P（投影）、L（布局常量）；只画形状，不决定时机。
//
// 机器 = 邮局分拣环形台（16 槽，Table 6-95 合法段大小下限）：
//   · 生产者 = xHC 盖章投递头（旋臂冲压头，握 ENQ 牌 + PCS 色窗）
//   · 消费者 = 软件 取件窗口（环轨亭子，握 ERDP 牌 + CCS 色窗，沿色带核对 Cycle==CCS 才收）
//   · MSI-X 电磁铃（铃碗 + 电磁铁 + 铃锤，铃锤经触发索连着投递头）+ IP 灯
//   · ERDP 寄存器面板（63:4 指针窗 + DESI 2:0 + bit3 EHB RW1C 旗），软件经回写缆写它——方向与传输环相反
//   · ERST 索引牌（事件环无 Link TRB，段由 ERST 定义，§4.9.4/§6.5）
//   · 回执 = Event TRB 位域刻度卡（§6.4.2.1）
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

  // 竖直面文字/面板矩阵（面外法线 n 由方位角给出）
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

  // 槽坑：台面上的切向凹腔 + 沿口刻线（外端没入色带）
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

  // 所有权色带：槽外沿的闭合扇环（无开口线头）。色带=槽内 Cycle 位残留（§4.9.2.2/§4.9.4）
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

  // ---------- 回执（Event TRB 小卡，信封式：翻盖折线 + Cycle 色标） ----------
  function receiptSvgAt(cx, cy, bearingDeg, cyc, z = TOP, opts = {}) {
    const local = { x: -6.4, y: -4.4, w: 12.8, d: 8.8, r: 1.6 };
    const th = (bearingDeg) * DEG;
    const rot = ([x, y]) => [cx + x * Math.cos(th) - y * Math.sin(th), cy + x * Math.sin(th) + y * Math.cos(th)];
    const ring = k.roundedPlan(local, 3).map(rot);
    const inner = k.roundedPlan(k.insetPlan(local, 1.6), 3).map(rot);
    const out = [];
    out.push(S(k.extrude(ring, z, 2.3, P, { convex: true, bevel: 0.4 }), { tone: "hi", crease: "lo", ...(opts.lit ? { lit: true } : {}) }));
    out.push(Ln(k.pathOf(inner.map((p) => at([p[0], p[1], z + 2.3])), true), { tone: "lo" }));
    // 信封翻盖：外沿的闭合三角折线（Type 32 回执的记号）
    const f0 = rot([-5.6, 4.35]), f1 = rot([0, 1.4]), f2 = rot([5.6, 4.35]);
    out.push(Ln(k.pathOf([at([f0[0], f0[1], z + 2.32]), at([f1[0], f1[1], z + 2.32]), at([f2[0], f2[1], z + 2.32])]), { tone: "lo", free: "start" }));
    const dot = at([cx, cy, z + 2.35]);
    out.push(`<circle class="fb-cyc" data-cyc="${cyc}" cx="${dot[0].toFixed(2)}" cy="${dot[1].toFixed(2)}" r="1.8"/>`);
    const rules = [];
    for (const u of [-3.4, 0, 3.4]) {
      const p = rot([u, -3.2]);
      const q = rot([u, -0.6]);
      rules.push(k.pathOf([at([p[0], p[1], z + 2.32]), at([q[0], q[1], z + 2.32])]));
    }
    out.push(Ln(rules.join(""), { tone: "lo", free: true }));
    return out.join("");
  }
  const receiptSvg = (i, cyc, opts = {}) => {
    const [cx, cy] = slotCentre(i);
    return receiptSvgAt(cx, cy, (slotBearing(i) * 180) / Math.PI + 90, cyc, TOP, opts);
  };

  // ---------- 生产者：xHC 盖章投递头（旋臂 + 冲压头 + ENQ 旗 + PCS 色窗） ----------
  // 径向框架一律用 3D 轴（2D dir 混入 3D 数学会让棱柱 z=NaN——fig2 家族的暗坑，勿复现）
  const dir3Of = (bearing) => [Math.cos(bearing), Math.sin(bearing), 0];
  const tan3Of = (d3) => [-d3[1], d3[0], 0];
  // 旗子平置铭板（俯读）的闭环轮廓，供 svg 与审计记录共用
  function flagRing(bearing, radius, w, d) {
    const dir = [Math.cos(bearing), Math.sin(bearing)];
    const c = [T[0] + radius * dir[0], T[1] + radius * dir[1]];
    const plan = { x: -w, y: -d, w: w * 2, d: d * 2, r: 1.2 };
    const th = bearing + Math.PI / 2;
    const rot = ([x, y]) => [c[0] + x * Math.cos(th) - y * Math.sin(th), c[1] + x * Math.sin(th) + y * Math.cos(th)];
    return k.roundedPlan(plan, 3).map(rot);
  }
  function flagParts(bearing, entries) {
    return entries.map((e) => ({ ring: flagRing(bearing, e.radius, e.w, e.d), top: e.top }));
  }
  function producerRootParts(bearing) {
    // 旋臂根部（桅杆之后侧）：毂 + 梁根 + 脊条根——独立 item，桅杆画在它与臂身之间
    const dir = dir3Of(bearing);
    const tan = tan3Of(dir);
    const F = (r0) => G.frameOf([T[0] + r0 * dir[0], T[1] + r0 * dir[1], 0], dir, [0, 0, 1], tan);
    return [
      { F: F(6), poly: [[L.BOOM_Z, -2.9], [L.BOOM_Z + 7, -2.9], [L.BOOM_Z + 7, 2.9], [L.BOOM_Z, 2.9]], s0: 0, s1: 12 },
      { F: F(9), poly: [[L.BOOM_Z + 7, -1.1], [L.BOOM_Z + 8, -1.1], [L.BOOM_Z + 8, 1.1], [L.BOOM_Z + 7, 1.1]], s0: 0, s1: 9 },
    ];
  }
  function producerRootSvg(bearing) {
    const parts = producerRootParts(bearing);
    const dir = dir3Of(bearing);
    const hubC = [T[0] + 2 * dir[0], T[1] + 2 * dir[1]];
    return (
      S(k.cylinder(hubC[0], hubC[1], 7, 58, 6.5, P, 24), { tone: "lo" }) +
      parts.map((p) => S(G.prismOf(p.F, p.poly, p.s0, p.s1, P), { tone: "mid" })).join("")
    );
  }
  function producerParts(bearing, headBottom) {
    const dir = dir3Of(bearing);
    const tan = tan3Of(dir);
    const F = (r0) => G.frameOf([T[0] + r0 * dir[0], T[1] + r0 * dir[1], 0], dir, [0, 0, 1], tan);
    const parts = [];
    const add = (r0, len, z0, z1, w, style) => parts.push({ F: F(r0), poly: [[z0, -w], [z1, -w], [z1, w], [z0, w]], s0: 0, s1: len, style, centre: [T[0] + (r0 + len / 2) * dir[0], T[1] + (r0 + len / 2) * dir[1], (z0 + z1) / 2] });
    add(18, 48, L.BOOM_Z, L.BOOM_Z + 7, 2.9, { tone: "mid" });             // 旋臂主梁（桅杆前侧段）
    add(18, 48, L.BOOM_Z + 7, L.BOOM_Z + 8, 1.1, { tone: "hi" });          // 梁顶脊条
    add(60, 6, L.HEAD_PARK + 7, L.BOOM_Z + 7, 3.2, { tone: "lo" });        // 滑道上段
    add(60, 6, L.WAY_MIN, L.HEAD_PARK, 3.2, { tone: "lo" });               // 滑道下段
    add(58.5, 10, L.HEAD_PARK + 7, L.BOOM_Z + 11, 5.4, { tone: "mid" });   // 头座（滑道顶罩壳）
    add(60.5, 20, headBottom, headBottom + 7, 7.4, { tone: "hi" });        // 冲压头
    add(67.5, 13, headBottom - 1.4, headBottom, 5, { tone: "hi" });        // 盖章底板
    add(66, 20, L.BOOM_Z + 8, L.BOOM_Z + 9.4, 1.2, { tone: "mid" });       // 指针旗横臂
    return parts;
  }
  const PRODUCER_FLAGS = (bearing) => flagParts(bearing, [
    { radius: 86, top: L.BOOM_Z + 7.4, w: 10, d: 3.9 },
    { radius: 34, top: L.BOOM_Z + 7.4, w: 10.5, d: 3 },
  ]);
  function tieRod(bearing) {
    const dir = [Math.cos(bearing), Math.sin(bearing)];
    const a = [T[0] + 5 * dir[0], T[1] + 5 * dir[1], L.MAST_TOP + 2.5];
    const b = [T[0] + 60 * dir[0], T[1] + 60 * dir[1], L.BOOM_Z + 8.1];
    const d = G.unit3(G.sub3(b, a));
    const len = G.len3(G.sub3(b, a));
    const F = G.frameAlong(a, d);
    const poly = [[-0.55, -0.55], [0.55, -0.55], [0.55, 0.55], [-0.55, 0.55]];
    return { F, poly, s0: 0, s1: len, style: { tone: "mid" }, centre: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2] };
  }
  // 平置小旗（俯读），文字沿旗面长边
  function flagSvg(bearing, radius, top, label, sub, opts = {}) {
    const dir = [Math.cos(bearing), Math.sin(bearing)];
    const c = [T[0] + radius * dir[0], T[1] + radius * dir[1]];
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
      (opts.chip ? `<circle class="fb-chip" data-cyc="${opts.chip}" cx="${(w - 3.2).toFixed(1)}" cy="1.2" r="1.5"/>` : "") +
      (sub ? `<text class="${cls} fb-sign2" x="0" y="3.9" text-anchor="start">${sub}</text>` : "") +
      `</g>`;
    return svg;
  }
  function producerSvg(bearing, headBottom, opts = {}) {
    const parts = producerParts(bearing, headBottom);
    parts.push(tieRod(bearing));
    const dir = dir3Of(bearing);
    const tan = tan3Of(dir);
    const out =
      parts.map((p) => S(G.prismOf(p.F, p.poly, p.s0, p.s1, P), p.style)).join("");
    // 臂端下指箭头（闭合三角，指向当前槽）
    const base = [T[0] + 86 * dir[0], T[1] + 86 * dir[1], L.BOOM_Z - 1.6];
    const a0 = [base[0] - 2.8 * tan[0], base[1] - 2.8 * tan[1], base[2]];
    const a1 = [base[0] + 2.8 * tan[0], base[1] + 2.8 * tan[1], base[2]];
    const arrow = `<path class="fb-arrow" d="${k.pathOf([at(a0), at(a1), at([base[0], base[1], base[2] - 4.4])], true)}"/>`;
    return (
      out + arrow +
      flagSvg(bearing, 86, L.BOOM_Z + 7.4, "ENQ · " + (opts.enqLabel != null ? opts.enqLabel : ""), "", { chip: opts.pcs }) +
      flagSvg(bearing, 34, L.BOOM_Z + 7.4, "xHC · 生产者", "", { w: 10.5, d: 3, cls: "fb-sign-sm" })
    );
  }

  // ---------- 触发索（投递头滑座顶 → 环外导索点 → 铃锤臂中点） ----------
  // 返回 3D 折线；bearing=投递头当前方位，armMid=铃锤臂中点世界坐标
  function cordRoute(bearing, mid) {
    // 起点落在头座顶面（法向 +z，竖直段离面），终点沿臂侧面法向着床
    const dir = dir3Of(bearing);
    const p = (r, bDeg, z) => [T[0] + r * Math.cos(bDeg * DEG), T[1] + r * Math.sin(bDeg * DEG), z];
    const start = [T[0] + 66.6 * dir[0], T[1] + 66.6 * dir[1], 71.5];
    const end = G.add3(mid.at, G.mul3(mid.normal, 0.62));
    const preEnd = G.add3(end, G.mul3(mid.normal, 7));
    return [
      start,
      [start[0], start[1], 78.4],
      [start[0] - 3.6, start[1] - 3.6, 78.4],
      [-90, 75, 60],
      preEnd,
      end,
    ];
  }

  // ---------- 消费者：软件取件窗口（环轨亭子 + 取件臂 + ERDP 牌 + CCS 色窗） ----------
  // 件列表与 boothSvg/boothTopSvg 的棱柱一一对应，供构建侧 A.prism 记录
  // 轨上件（拖板/挂柱/取件臂/旗）与轨下件（柜台/顶檐/取件头）拆成两个 item：
  // 拖板在轨管上方（前），轨下件在轨管下方（后）—— Painter 序可解。
  // zb = 取件头底（38.5 收起 / 35.3 下探）
  const BOOTH_FLAGS = (bearing) => flagParts(bearing, [
    { radius: 103.5, top: L.RAIL_TOP + 3.2, w: 10, d: 3 },
    { radius: 114, top: L.RAIL_TOP + 3.2, w: 10.5, d: 3 },
  ]);
  function boothTopParts(bearing) {
    const dir = dir3Of(bearing);
    const tan = tan3Of(dir);
    const F = (r0) => G.frameOf([T[0] + r0 * dir[0], T[1] + r0 * dir[1], 0], dir, [0, 0, 1], tan);
    const defs = [
      [86.4, 7.2, L.RAIL_TOP, L.RAIL_TOP + 3.4, 4.4, { tone: "mid" }],        // 环轨拖板
      [81, 15, 51.8, 55, 1.9, { tone: "mid" }],                               // 取件臂（轨上方伸向台内）
      [96, 8, 52.5, 53.7, 1.5, { tone: "mid" }],                              // 旗子悬臂
      [104, 7.5, 52.5, 53.7, 1.5, { tone: "mid" }],                           // 名牌旗悬臂
      [95.8, 2.4, 46, L.RAIL_TOP + 3.4, 3, { tone: "mid" }],                  // 挂柱上段（轨管 z 带外侧）
    ];
    const parts = defs.map(([r0, len, z0, z1, w, style]) => ({ F: F(r0), poly: [[z0, -w], [z1, -w], [z1, w], [z0, w]], s0: 0, s1: len, style, centre: [T[0] + (r0 + len / 2) * dir[0], T[1] + (r0 + len / 2) * dir[1], (z0 + z1) / 2] }));
    return parts;
  }
  function boothParts(bearing, zb) {
    const dir = dir3Of(bearing);
    const tan = tan3Of(dir);
    const F = (r0) => G.frameOf([T[0] + r0 * dir[0], T[1] + r0 * dir[1], 0], dir, [0, 0, 1], tan);
    const defs = [
      [95.8, 2.4, 34.7, 46, 3, { tone: "mid" }],                              // 挂柱下段（轨外 4.0 净距，轨管 z 带处断开）
      [84, 11.2, 33.5, 34.7, 8, { tone: "mid" }],                             // 柜台
      [94.6, 1.6, 34.7, 42.8, 8, { tone: "mid" }],                            // 背墙
      [84, 11.2, 42.8, 44.0, 8.4, { tone: "mid" }],                           // 顶檐（轨下 2.0 净距）
      [84.6, 10, 41.6, 42.8, 8.4, { tone: "hi" }],                            // 窗楣（取件口上沿）
      [73.5, 11.3, zb, zb + 9, 4.2, { tone: "hi" }],                          // 取件头（滑动）
      [82.2, 1.1, 47.5, 51.8, 1.1, { tone: "lo" }],                           // 取件头导杆（头上，顶到臂底面 51.8）
    ];
    const parts = defs.map(([r0, len, z0, z1, w, style]) => ({ F: F(r0), poly: [[z0, -w], [z1, -w], [z1, w], [z0, w]], s0: 0, s1: len, style, centre: [T[0] + (r0 + len / 2) * dir[0], T[1] + (r0 + len / 2) * dir[1], (z0 + z1) / 2] }));
    // 取件头两侧指板（±tan 夹住回执长边）
    for (const s of [-1, 1]) {
      const Fo = G.frameOf([T[0] + 74.5 * dir[0] + s * 4.4 * tan[0], T[1] + 74.5 * dir[1] + s * 4.4 * tan[1], 0], dir, [0, 0, 1], tan);
      parts.push({ F: Fo, poly: [[zb, -0.5], [zb + 7, -0.5], [zb + 7, 0.5], [zb, 0.5]], s0: -1.2, s1: 1.2, style: { tone: "hi" }, centre: [T[0] + 74.5 * dir[0] + s * 4.4 * tan[0], T[1] + 74.5 * dir[1] + s * 4.4 * tan[1], zb + 3.5] });
    }
    return parts;
  }
  function boothTopSvg(bearing, opts = {}) {
    const erdp = opts.erdp != null ? opts.erdp : "";
    const out = [];
    const dir = dir3Of(bearing);
    const tan = tan3Of(dir);
    const prism = (r0, len, z0, z1, w, style) => {
      const F = G.frameOf([T[0] + r0 * dir[0], T[1] + r0 * dir[1], 0], dir, [0, 0, 1], tan);
      out.push(S(G.prismOf(F, [[z0, -w], [z1, -w], [z1, w], [z0, w]], 0, len, P), style));
    };
    prism(86.4, 7.2, L.RAIL_TOP, L.RAIL_TOP + 3.4, 4.4, { tone: "mid" });
    prism(81, 15, 51.8, 55, 1.9, { tone: "mid" });
    prism(96, 8, 52.5, 53.7, 1.5, { tone: "mid" });
    prism(104, 7.5, 52.5, 53.7, 1.5, { tone: "mid" });
    prism(95.8, 2.4, 46, L.RAIL_TOP + 3.4, 3, { tone: "mid" });
    // 窗口小旗：ERDP 牌（软件手里！）、名牌
    out.push(flagSvg(bearing, 103.5, L.RAIL_TOP + 3.2, "ERDP · " + erdp, ""));
    out.push(flagSvg(bearing, 114, L.RAIL_TOP + 3.2, "软件 · 消费者", "", { w: 10.5, d: 3, cls: "fb-sign-sm" }));
    return out.join("");
  }
  function boothSvg(bearing, opts = {}) {
    const ccs = opts.ccs != null ? opts.ccs : 1;
    const carrying = !!opts.carry;
    const zb = opts.zb != null ? opts.zb : 38.5;
    const out = [];
    const dir = dir3Of(bearing);
    const tan = tan3Of(dir);
    const prism = (r0, len, z0, z1, w, style) => {
      const F = G.frameOf([T[0] + r0 * dir[0], T[1] + r0 * dir[1], 0], dir, [0, 0, 1], tan);
      out.push(S(G.prismOf(F, [[z0, -w], [z1, -w], [z1, w], [z0, w]], 0, len, P), style));
    };
    prism(93.8, 2.4, 34.7, L.RAIL_TOP + 3.4, 3, { tone: "mid" });
    prism(95.8, 2.4, 34.7, 46, 3, { tone: "mid" });
    prism(84, 11.2, 33.5, 34.7, 8, { tone: "mid" });
    prism(94.6, 1.6, 34.7, 42.8, 8, { tone: "mid" });
    prism(84, 11.2, 42.8, 44.0, 8.4, { tone: "mid" });
    prism(84.6, 10, 41.6, 42.8, 8.4, { tone: "hi" });
    prism(70, 11.5, zb, zb + 9, 4.2, { tone: "hi", ...(carrying ? { lit: true } : {}) });
    prism(82.2, 1.1, 47.5, 51.8, 1.1, { tone: "lo" });
    for (const s of [-1, 1]) {
      const Fo = G.frameOf([T[0] + 74.5 * dir[0] + s * 4.4 * tan[0], T[1] + 74.5 * dir[1] + s * 4.4 * tan[1], 0], dir, [0, 0, 1], tan);
      out.push(S(G.prismOf(Fo, [[zb, -0.5], [zb + 7, -0.5], [zb + 7, 0.5], [zb, 0.5]], -1.2, 1.2, P), { tone: "hi" }));
    }
    // 柜台上：CCS 对色小窗（软件侧轮次）
    const cc = [T[0] + 89 * dir[0], T[1] + 89 * dir[1]];
    out.push(`<g transform="${faceMatrix([cc[0] - 4 * tan[0], cc[1] - 4 * tan[1], 34.72], tan)}">` +
      `<text class="fb-sign-sm" x="0" y="3.2" text-anchor="start">CCS · ${ccs}</text></g>`);
    out.push(`<circle class="fb-chip" data-cyc="${ccs}" cx="${at([cc[0] + 4.6 * tan[0], cc[1] + 4.6 * tan[1], 35.2])[0].toFixed(2)}" cy="${at([cc[0] + 4.6 * tan[0], cc[1] + 4.6 * tan[1], 35.2])[1].toFixed(2)}" r="1.5"/>`);
    // 对色结果灯（取件比对瞬间亮绿）
    const lampP = [T[0] + 94.6 * dir[0] - 3 * tan[0], T[1] + 94.6 * dir[1] - 3 * tan[1], 45.4];
    out.push(`<circle class="fb-cmplamp${opts.compare ? " on" : ""}" cx="${at([lampP[0], lampP[1], lampP[2]])[0].toFixed(2)}" cy="${at([lampP[0], lampP[1], lampP[2]])[1].toFixed(2)}" r="1.1"/>`);
    // 已收回执堆叠（柜台台面）
    const n = opts.stack || 0;
    for (let i = 0; i < n; i++) {
      const sc = [T[0] + 91 * dir[0] + 2.2 * tan[0], T[1] + 91 * dir[1] + 2.2 * tan[1]];
      out.push(receiptSvgAt(sc[0], sc[1], (bearing * 180) / Math.PI + 90, 1, 34.7 + i * 2.5));
    }
    // 取件头夹着的回执（提起瞬间可见）
    if (carrying) {
      out.push(receiptSvgAt(T[0] + 72.6 * dir[0], T[1] + 72.6 * dir[1], (bearing * 180) / Math.PI + 90, 1, zb - 2.6, { lit: true }));
    }
    // 飞行中的回执（槽 → 柜台）
    if (opts.fly) {
      const f = opts.fly;
      out.push(receiptSvgAt(f.x, f.y, (bearing * 180) / Math.PI + 90, f.cyc, f.z, { lit: true }));
    }
    return out.join("");
  }

  // ---------- 回写缆（窗口挂柱底 → 台外低走 → ERDP 寄存器面板进缆口） ----------
  // 出柜口先在台面上方越出 r96，再台外 r112 低走，避开台面与环轨立柱
  function cableRoute(bearing, port, regN) {
    const p = (r, bDeg, z) => [T[0] + r * Math.cos(bDeg * DEG), T[1] + r * Math.sin(bDeg * DEG), z];
    const dir = dir3Of(bearing);
    const start = [T[0] + 97.6 * dir[0], T[1] + 97.6 * dir[1], 34.7];
    const pts = [
      start,
      [start[0], start[1], 31],
      p(99.5, (bearing * 180) / Math.PI + 3, 22),
      p(101, (bearing * 180) / Math.PI + 4, 15),
    ];
    const b0 = (bearing * 180) / Math.PI + 4.5, b1 = 138;
    const N = 8;
    for (let s = 1; s <= N; s++) {
      const b = b0 + (b1 - b0) * (s / N);
      pts.push(p(112, b, 12));
    }
    // 面板前方绕行（始终在面板面法向正侧），沿法向滑入进缆口
    pts.push(p(95, 141, 11));
    pts.push(p(97, 149, 10));
    pts.push([port[0] + regN[0] * 5, port[1] + regN[1] * 5, 7]);
    pts.push(port);
    return pts;
  }

  // ---------- ERDP 寄存器面板（台基立式铭板，面向观者） ----------
  // 位置：L.REG（世界坐标），面板法线 L.REG_N_B（方位角，指向观者一侧）
  function registerPanelStatic() {
    const [rx, ry] = L.REG;
    const nb = L.REG_N_B * DEG;
    const n = [Math.cos(nb), Math.sin(nb), 0];
    const ex = [Math.sin(nb), -Math.cos(nb), 0];
    const Fp = G.frameOf([rx, ry, 0], [0, 0, 1], ex, n);
    const plinth = [[-23, -8], [23, -8], [23, 8], [-23, 8]];
    const F = G.frameOf([rx - 1.3 * n[0], ry - 1.3 * n[1], 20], n, ex, [0, 0, -1]);
    const poly = [[-21, -17], [21, -17], [21, 17], [-21, 17]];
    const face = [rx + 1.35 * n[0], ry + 1.35 * n[1], 20];
    // 进缆口凸座（面板正面下部，回写缆端点落其端面）
    const portF = G.frameAlong([rx + 1.3 * n[0], ry + 1.3 * n[1], 7], n);
    const svg =
      S(G.prismOf(Fp, plinth, 0, 3, P), { tone: "lo" }) +
      S(G.prismOf(F, poly, 0, 2.6, P), { tone: "lo" }) +
      S(G.disc(0, 1.3, 1.35, portF, P, { steps: 20 }), { tone: "lo" }) +
      `<g class="fb-plate" data-part="regface" transform="${faceMatrix([face[0], face[1], face[2]], ex)}">` +
      `<text class="fb-eng" x="-20" y="-13.4" text-anchor="start">ERDP 寄存器</text>` +
      `<text class="fb-eng2" style="font-size:3.1px" x="0" y="-9.4" text-anchor="middle">Event Ring Dequeue Pointer</text>` +
      `<text class="fb-off" x="20" y="-13.4" text-anchor="end">§5.5.2.3.3</text>` +
      `<rect class="fb-cell" x="-20" y="-6.8" width="17.6" height="11" rx="1"/>` +
      `<text class="fb-off" x="-18.8" y="-3.2" text-anchor="start">63:4 指针</text>` +
      `<text class="fb-val" data-part="regval" x="-11.2" y="2.8" text-anchor="middle">槽 0</text>` +
      `<text class="fb-off" x="1.4" y="-3.2" text-anchor="start">DESI 2:0</text>` +
      `<text class="fb-val" x="10.4" y="2.8" text-anchor="middle">0</text>` +
      `<text class="fb-off" x="-20" y="7.8" text-anchor="start">bit3 EHB · RW1C</text>` +
      `<text class="fb-eng2" x="-20" y="14.2" text-anchor="start">写入方向：软件 → 寄存器</text>` +
      `</g>`;
    return { svg, F, poly, Fp, plinth, portF };
  }
  // EHB 旗：0=落（旗面垂下） 1=竖（IP=1 时置位，软件写 ERDP 时写 1 清 0）
  function ehbBase() {
    const [rx, ry] = L.REG;
    const nb = L.REG_N_B * DEG;
    const n = [Math.cos(nb), Math.sin(nb), 0];
    return [rx + 2.2 * n[0], ry + 2.2 * n[1]];
  }
  function ehbPivot() {
    const b = ehbBase();
    return [b[0], b[1], 38.2];
  }
  function ehbFlagSvg(v) {
    const p = ehbPivot();
    const nb = L.REG_N_B * DEG;
    const n = [Math.cos(nb), Math.sin(nb), 0];
    const dir = G.unit3([0.42 * n[0], 0.42 * n[1], 0.91]);
    const tip = G.add3(p, G.mul3(dir, 7.5 - 3.8 * v));
    const tip2 = G.add3(tip, [0, 0, -2.8 + 1.4 * v]);
    return (
      Ln(k.pathOf([at(p), at(tip)]), { tone: "lo" }) +
      `<path class="fb-ehb${v > 0.5 ? " up" : ""}" d="${k.pathOf([at(p), at(tip), at(tip2)], true)}"/>`
    );
  }

  // ---------- MSI-X 电磁铃（柱 + 铃碗 + 电磁铁 + 铃锤 + 铭牌 + IP 灯） ----------
  const BP = L.BELL;                       // 铃柱底
  const STRIKE_B = L.BELL_STRIKE_B;        // 铃锤方位（指向投递头一侧）
  const bellDir = () => [Math.cos(STRIKE_B * DEG), Math.sin(STRIKE_B * DEG), 0];
  const HAMMER_PIVOT = [BP[0] + 12.1 * bellDir()[0], BP[1] + 12.1 * bellDir()[1], 21.5];
  const GONG_AXIS = [BP[0], BP[1]];
  const DOME_Z = 20.1;
  function bellStatic() {
    const Fz = G.frameOf([BP[0], BP[1], 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    // 铃碗：圆顶 profile（dr/ds 单调，平滑无拐点）
    const dome = [[0, 1.2], [1.6, 4.6, 1], [3.6, 7.8, 1], [5.2, 9.4, 1], [6.4, 10.1, 1], [7.2, 10.3]];
    const dF = G.frameAlong([BP[0], BP[1], DOME_Z], [0, 0, 1]);
    const dir = bellDir();
    const coilC = [BP[0] + 12.1 * dir[0], BP[1] + 12.1 * dir[1]];
    const svg =
      S(k.cylinder(BP[0], BP[1], 8.5, 0, 18, P, 32), { tone: "mid" }) +
      Ln([4, 9, 14].map((z) => k.sideArc(BP[0], BP[1], 8.5, z, P, 24)).join(""), { tone: "faint" }) +
      // 铃碗托架 + 碗
      S(G.disc(0, 2.2, 4.2, G.frameAlong([BP[0], BP[1], DOME_Z - 2.2], [0, 0, 1]), P, { steps: 28 }), { tone: "lo" }) +
      `<g data-part="gong">` +
      S(G.solidOf(dome, dF, P, { steps: 72 }), { tone: "hi" }) +
      Ln(G.arcOf(Fz, DOME_Z + 7.2, 10.3, P, { trim: 0.2 }), { tone: "lo" }) +
      `</g>` +
      // 碗顶敲击帽 + 沿口铆点
      S(G.disc(0, 1.4, 1.7, G.frameAlong([BP[0], BP[1], DOME_Z + 7.2], [0, 0, 1]), P, { steps: 20, bevel: 0.3 }), { tone: "lo" }) +
      Dots(G.dotsOf(dF, 5.8, 8.9, 10, P, { fade: [0.05, 0.5] }), { size: 0.42, tone: "lo" }) +
      // 电磁铁箱（绕线 + 端子）
      S(k.slabOf({ x: coilC[0] - 3.6, y: coilC[1] - 3.6, w: 7.2, d: 7.2, r: 1.2 }, 10.5, 11, P, 2, 0.5), { tone: "mid" }) +
      Ln(k.knurl(coilC[0], coilC[1], 3.7, 12.2, 19.2, 12, P, 0.5), { tone: "lo" }) +
      Dots([at([coilC[0] - 2.2, coilC[1] - 2.2, 21.5]), at([coilC[0] + 2.2, coilC[1] + 2.2, 21.5])], { size: 0.45 });
    return { svg, dome, dF, Fz, coilC };
  }
  // MSI-X 立牌（独立字牌：lo 底 + hi 墨大字，dark 1x 可读；顶 19.8 不碰碗 20.1）
  function bellSignStatic() {
    const nb = (L.AZIMUTH + 12) * DEG;
    const n = [Math.cos(nb), Math.sin(nb), 0];
    const ex = [Math.sin(nb), -Math.cos(nb), 0];
    const sp = [BP[0] + 13 * n[0] - 4 * ex[0], BP[1] + 13 * n[1] - 4 * ex[1]];
    const Fp = G.frameOf([sp[0], sp[1], 0], [0, 0, 1], ex, n);
    const plinth = [[-17, -6], [17, -6], [17, 6], [-17, 6]];
    const F = G.frameOf([sp[0] - 1.1 * n[0], sp[1] - 1.1 * n[1], 10.4], n, ex, [0, 0, -1]);
    const poly = [[-16, -9.4], [16, -9.4], [16, 9.4], [-16, 9.4]];
    const face = [sp[0] + 1.15 * n[0], sp[1] + 1.15 * n[1], 10.4];
    const svg =
      S(G.prismOf(Fp, plinth, 0, 2.2, P), { tone: "lo" }) +
      S(G.prismOf(F, poly, 0, 2.2, P), { tone: "lo" }) +
      `<g class="fb-plate" transform="${faceMatrix([face[0], face[1], face[2]], ex)}">` +
      `<text class="fb-eng" style="font-size:4.2px" x="0" y="-5.2" text-anchor="middle">MSI-X 中断</text>` +
      `<text class="fb-eng2" style="font-size:3.4px" x="0" y="-1" text-anchor="middle">铃响唤软件</text>` +
      `<text class="fb-off" style="font-size:2.9px" x="0" y="3" text-anchor="middle">IMAN IP/IE · IP 挂起</text>` +
      `<text class="fb-off" style="font-size:2.9px" x="0" y="6.5" text-anchor="middle">写回：软件 → ERDP</text>` +
      `<circle class="fb-iplamp" data-part="iplamp" cx="12.6" cy="-5.2" r="1.6"/>` +
      `</g>`;
    return { svg, F, poly, Fp, plinth, sp };
  }
  // 铃锤：rest=抬起背向，1=击碗（球心落在碗沿面外 1.35）。angle∈[0,1]
  function hammerParts(angle) {
    const pivot = HAMMER_PIVOT;
    const dir = bellDir();
    const ballC = [GONG_AXIS[0] + 7.94 * dir[0], GONG_AXIS[1] + 7.94 * dir[1], 22.72];
    const strike = G.unit3(G.sub3(ballC, pivot));
    const rest = G.unit3(G.add3(G.mul3(dir, 0.82), [0, 0, 0.58]));
    const d = G.unit3(G.add3(G.mul3(strike, angle), G.mul3(rest, 1 - angle)));
    const len = G.len3(G.sub3(ballC, pivot));
    const tip = G.add3(pivot, G.mul3(d, len));
    const F = G.frameAlong(pivot, d);
    return { pivot, d, len, tip, F, rest, strike, ballC };
  }
  function hammerSvg(angle) {
    const h = hammerParts(angle);
    const out = [];
    // 衔铁臂（沿击打轴的方杆，截面 1.24×1.24）+ 铰盘 + 锤头球 + 复位簧圈
    out.push(S(G.prismOf(h.F, [[-0.62, -0.62], [0.62, -0.62], [0.62, 0.62], [-0.62, 0.62]], 0, h.len, P), { tone: "hi" }));
    out.push(S(G.disc(-1.6, 1.6, 1.9, G.frameAlong(h.pivot, h.d), P, { steps: 24 }), { tone: "lo" }));
    out.push(S(G.sphereOf(h.tip, 1.1, P), { tone: "hi" }));
    const arcs = [];
    for (const s of [2.4, 3.1, 3.8]) arcs.push(G.arcOf(h.F, s, 1.05, P, { trim: 0.2 }));
    out.push(Ln(arcs.join(""), { tone: "lo" }));
    return out.join("");
  }
  function hammerMid(angle) {
    // 触索着床点：臂侧面（沿臂轴 0.4 处，外移半臂宽落在侧面），及侧面外法向
    const h = hammerParts(angle);
    const at = G.add3(h.pivot, G.mul3(h.d, h.len * 0.52));
    const side = G.unit3(G.cross3(h.d, [0, 0, 1]));
    return { at, side, normal: side };
  }

  // ---------- 位域刻度卡：Transfer Event TRB（§6.4.2.1 Tables 6-37/38/39） ----------
  const CARD = { w: 148, h: 118 };
  const tickX = (b) => -CARD.w / 2 + 14 + (31 - b) * ((CARD.w - 28) / 31);
  function rowTicks(yBottom) {
    const minor = [], major = [];
    for (let b = 0; b <= 31; b++) {
      const x = tickX(b);
      const top = yBottom - (b % 8 === 0 ? 3.2 : 1.9);
      const dd = k.pathOf([[x, top], [x, yBottom]]);
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
      out.push(Ln(t.minor.join(""), { tone: "lo" }));
      out.push(Ln(t.major.join(""), { tone: "mid" }));
      // 行基线：两端落在 b=31 / b=0 的刻度线上（互相生根）
      out.push(Ln(k.pathOf([[tickX(31), cellsTop], [tickX(0), cellsTop]]), { tone: "lo" }));
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

  const EVENT_CARD = {
    title: "Transfer Event TRB · Type 32",
    sub: "xHC 生产 · 软件消费 · §6.4.2.1",
    rows: [
      { offset: "03-00H", cells: [{ hi: 31, lo: 0, name: "TRB Pointer Lo", val: "→ 产生事件的 TRB" }] },
      { offset: "07-04H", cells: [{ hi: 31, lo: 0, name: "TRB Pointer Hi", val: "16B 对齐 · ED=0" }] },
      {
        offset: "0B-08H",
        cells: [
          { hi: 31, lo: 24, name: "Comp Code", val: "1" },
          { hi: 23, lo: 0, name: "TRB Transfer Length", val: "0" },
        ],
      },
      {
        offset: "0F-0CH",
        cells: [
          { hi: 31, lo: 24, name: "Slot ID", val: "1" },
          { hi: 23, lo: 21, dim: true },
          { hi: 20, lo: 16, name: "EP ID", val: "2" },
          { hi: 15, lo: 10, name: "TRB Type", val: "32" },
          { hi: 9, lo: 3, dim: true },
          { hi: 2, lo: 2, name: "ED", val: "0" },
          { hi: 1, lo: 1, dim: true },
          { hi: 0, lo: 0, name: "C", val: "1" },
        ],
      },
    ],
    footer: [
      "ED=0：Pointer=产生事件的 TRB 地址（16B 对齐）；ED=1 时为 64 位 Event Data",
      "CC=1 Success（Table 6-90）· 残量=未传字节数 · EP ID=DCI（EP1 OUT=2）",
      "cycle==CCS 才收、收后推进 ERDP；槽内残留不擦除（§4.9.4）",
    ],
  };

  // ---------- 台面修饰：同心工艺环 + 中心毂环 ----------
  function tableDress() {
    const F = G.frameOf([T[0], T[1], 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    const arcs = [42, 58].map((r) => G.arcOf(F, TOP + 0.07, r, P, { least: -1 })).join("");
    const hub = k.ring(T[0], T[1], 14.5, TOP + 0.07, P, 40);
    const bolts = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.26;
      bolts.push(at([T[0] + 18 * Math.cos(a), T[1] + 18 * Math.sin(a), TOP + 0.08]));
    }
    return Ln(arcs, { tone: "faint" }) + Ln(hub, { tone: "lo" }) + Dots(bolts, { size: 0.5, tone: "lo" });
  }

  // ---------- ERST 索引牌（立式小铭板：事件环无 Link TRB，段由 ERST 定义） ----------
  function erstPlateStatic() {
    const [ex0, ey0] = L.ERST;
    const nb = (L.AZIMUTH + 26) * DEG;
    const n = [Math.cos(nb), Math.sin(nb), 0];
    const ex = [Math.sin(nb), -Math.cos(nb), 0];
    const Fp = G.frameOf([ex0, ey0, 0], [0, 0, 1], ex, n);
    const plinth = [[-15, -6], [15, -6], [15, 6], [-15, 6]];
    const F = G.frameOf([ex0 - 1.1 * n[0], ey0 - 1.1 * n[1], 12.7], n, ex, [0, 0, -1]);
    const poly = [[-13.5, -10.5], [13.5, -10.5], [13.5, 10.5], [-13.5, 10.5]];
    const face = [ex0 + 1.15 * n[0], ey0 + 1.15 * n[1], 12.7];
    const svg =
      S(G.prismOf(Fp, plinth, 0, 2.2, P), { tone: "lo" }) +
      S(G.prismOf(F, poly, 0, 2.2, P), { tone: "lo" }) +
      `<g class="fb-plate" transform="${faceMatrix([face[0], face[1], face[2]], ex)}">` +
      `<text class="fb-eng2" style="font-size:3px" x="-12.4" y="-5.6" text-anchor="start">ERST 段表 · 1 项</text>` +
      `<text class="fb-off" style="font-size:2.9px" x="-12.4" y="-0.6" text-anchor="start">段0 · 64B 对齐 · 大小 16</text>` +
      `<text class="fb-off" style="font-size:2.9px" x="-12.4" y="4.2" text-anchor="start">事件环无 Link TRB</text>` +
      `<text class="fb-off" style="font-size:2.9px" x="-12.4" y="8.6" text-anchor="start">回绕=换下一条表项</text>` +
      `</g>`;
    return { svg, F, poly, Fp, plinth };
  }

  return {
    bellSignStatic,
    at, S, Ln, Dots, V, faceMatrix, DEG,
    slotBearing, slotDir, slotCentre,
    pocketSvg, bandSvg, receiptSvg, receiptSvgAt, tableDress,
    producerRootParts, producerRootSvg, producerParts, PRODUCER_FLAGS, tieRod, producerSvg, flagSvg, flagParts,
    boothTopParts, boothTopSvg, boothParts, BOOTH_FLAGS, boothSvg,
    cordRoute, cableRoute,
    registerPanelStatic, ehbBase, ehbPivot, ehbFlagSvg,
    bellStatic, hammerSvg, hammerParts, hammerMid, HAMMER_PIVOT, BP,
    cardSvg, EVENT_CARD, CARD,
    erstPlateStatic,
  };
}

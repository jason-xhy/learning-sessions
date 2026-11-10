/* scene.js —— V3「xHC 启机车间」构件函数库（几何全消费 DSL：X43_DSL.sceneGraph/rings/cable/corridor）
 * 三区（文书台/总控台/试验盒）+ 机柜上方三环（命令环·唯一/事件环·回执/EP0 传输环）
 * + USB 实体缆方波信号 + 空中走廊 + DMA 光束/中断闪线/ERDP 小旗/AO 接触阴影/FS 闸口。
 * 质感：程序化 canvas 纹理占位（S6 注入口=X43D.mat userData.texRequest）；屏显文字运行时 canvas 贴图（零外部资源）。 */
const X43Scene = (() => {
  const D = X43D, T = THREE;
  const E = (id) => D.D.sceneGraph.entities.find((e) => e.id === id);
  const root = { group: null };
  const screens = {};
  const movers = [];
  let instant = false;
  let particlesOn = true;
  let frontWall = null;
  let camRef = null;
  const rings = {};            // ringCmd / ringEvt / ringEp0
  const bells = { knobs: {}, press: {} };
  let devGroup = null, plateFlipG = null, domeMat = null, devLampDots = {}, portRing = null;
  let resetBtn = null, bsrGrp = null, bsrAngle = 0, bsrTarget = 0;
  let triggerLever = null, triggerPullT = 1;
  let cableMesh = null, cableCurve = null, portPlug = null, dangMesh = null, plugHead = null;
  let waveG = null, waveMesh = null, waveArrowA = null, waveArrowB = null;
  let irqMesh = null, pollTrolley = null;
  let eventBoxLid = null, outctxCard = null, dcbaaWindow = null, dcbaaBeam = null;
  let descCards = [], tray8Grp = null, inboxGrp = null;
  let breath = null, breathe3T = -1;
  let epMounted = false;
  let fsGateGrp = null;
  const corridorCurve = new T.CatmullRomCurve3(X43D.D.corridor.curve.points.map((p) => new T.Vector3(p[0], p[1], p[2])));
  const state = {
    flags: { ccs: 0, csc: 0, pr: 0, prc: 0, ped: 0 },
    pls: "—", speed: "—", slot: "—", mps: "—",
    dev: "off", formFilled: 0, ep0: 0, dcbaa: 0,
    devScreen: "—— 待机 ——",
    devIn: false, devAddr: 0, receipts: 0, bsr: "0",
    slotLamp: "Disabled", epSlotsLit: 0,
  };

  // ---------- 小工具 ----------
  function box(w, h, d, m, x, y, z, shadow) {
    const o = new T.Mesh(new T.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z);
    if (shadow !== false) { o.castShadow = true; o.receiveShadow = true; }
    return o;
  }
  function rbox(w, h, d, r, m, x, y, z) {
    const seg = 3;
    const geo = new T.BoxGeometry(w, h, d, seg, seg, seg);
    const pos = geo.attributes.position;
    const hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r;
    for (let i = 0; i < pos.count; i++) {
      const x0 = pos.getX(i), y0 = pos.getY(i), z0 = pos.getZ(i);
      const cx = Math.max(-hw, Math.min(hw, x0)), cy = Math.max(-hh, Math.min(hh, y0)), cz = Math.max(-hd, Math.min(hd, z0));
      const dx = x0 - cx, dy = y0 - cy, dz = z0 - cz;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len > 1e-9) { const s = r / len; pos.setXYZ(i, cx + dx * s, cy + dy * s, cz + dz * s); }
    }
    geo.computeVertexNormals();
    const o = new T.Mesh(geo, m);
    o.position.set(x, y, z);
    o.castShadow = true; o.receiveShadow = true;
    return o;
  }
  function cyl(rt, rb, h, m, x, y, z, seg) {
    const o = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg || 20), m);
    o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true;
    return o;
  }
  function aoDisc(r, x, y, z, parent) {
    const c = D.cnv(128, 128), ctx = c.getContext("2d");
    const gr = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
    gr.addColorStop(0, "rgba(0,0,0,0.46)"); gr.addColorStop(0.6, "rgba(0,0,0,0.22)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gr; ctx.fillRect(0, 0, 128, 128);
    const o = new T.Mesh(new T.PlaneGeometry(r * 2, r * 2), new T.MeshBasicMaterial({ map: D.texOf(c), transparent: true, depthWrite: false }));
    o.rotation.x = -Math.PI / 2; o.position.set(x, y, z);
    (parent || root.group).add(o);
    return o;
  }
  function makeScreen(name, w, h, px, py, drawFn) {
    const canvas = D.cnv(px, py);
    const tex = D.texOf(canvas);
    tex.anisotropy = 4;
    const mesh = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex }));
    screens[name] = { tex, canvas, ctx: canvas.getContext("2d"), draw: drawFn, px, py };
    return mesh;
  }
  function repaint(name) {
    const s = screens[name];
    if (!s) return;
    s.draw(s.ctx, s.px, s.py, state);
    s.tex.needsUpdate = true;
  }
  function plateMesh(text, w, h, opts) {
    const o = opts || {};
    const c = D.cnv(512, Math.max(64, Math.round(512 * h / w)));
    const ctx = c.getContext("2d");
    ctx.fillStyle = o.bg || "#10151b"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = o.edge || "#3a4652"; ctx.lineWidth = 4; ctx.strokeRect(3, 3, c.width - 6, c.height - 6);
    // S5 修复：自适应字号——长文案原样以固定 fs 绘制会超出 512px 画布被两侧裁（灯排牌头「Enabled」被裁实锤），
    // 逐行测量后按画布宽收缩 fs（下限 14），布局不变只缩字。
    let fs = o.fs || 40;
    const lines0 = String(text).split("\n");
    const maxW = c.width - 24;
    const fit = (size) => {
      ctx.font = `600 ${size}px ${D.MONO}`;
      return Math.max(...lines0.map((ln) => ctx.measureText(ln).width));
    };
    while (fs > 14 && fit(fs) > maxW) fs -= 1;
    ctx.font = `600 ${fs}px ${D.MONO}`;
    ctx.fillStyle = o.color || "#e8d5b0";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    lines0.forEach((ln, i) => ctx.fillText(ln, c.width / 2, c.height / 2 + (i - (lines0.length - 1) / 2) * fs * 1.25 + 2));
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: D.texOf(c) }));
    m.userData.plate3d = String(text).replace(/\n/g, " ").slice(0, 24); // 探针标：3D 内牌注（label_probe 投影互叠检测）
    return m;
  }
  function screenBase(c, px, py, title, accent) {
    c.fillStyle = "#0d1319"; c.fillRect(0, 0, px, py);
    c.strokeStyle = "#3a4652"; c.lineWidth = 4; c.strokeRect(6, 6, px - 12, py - 12);
    if (title) {
      c.fillStyle = accent || "#d9a860"; c.font = `600 30px ${D.MONO}`;
      c.textAlign = "left"; c.textBaseline = "top";
      c.fillText(title, 22, 16);
    }
  }

  // ---------- 地板与区带 ----------
  function buildWorld(g) {
    const floor = E("floor");
    const fg = D.entityGeo(floor);
    const m = new T.MeshStandardMaterial({ color: new T.Color(D.flatMap.floorBase), metalness: 0.5, roughness: 0.42 });
    m.userData.texRequest = "tex07";
    if (!D.applyTexData(m, "tex07")) m.map = texFactoryFloor(fg.sx, fg.sz); // S6 回灌优先，占位保底
    m.aoMapIntensity = 0.9;
    const mesh = new T.Mesh(new T.PlaneGeometry(fg.sx, fg.sz), m);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(fg.cx, (fg.cy + fg.sy / 2), fg.cz);
    mesh.receiveShadow = true;
    g.add(mesh);
    for (const id of ["bandSwPlane", "bandHcPlane", "bandDevPlane"]) {
      const b = E(id);
      const bg = D.entityGeo(b);
      const p = new T.Mesh(new T.PlaneGeometry(bg.sx, bg.sz), new T.MeshBasicMaterial({ color: new T.Color(D.flatMap[b.material]) }));
      p.rotation.x = -Math.PI / 2;
      p.position.set(bg.cx, 0.06, bg.cz);
      g.add(p);
    }
  }
  function texFactoryFloor(w, d) {
    // tex07 地板环氧（程序化占位）：网格线 1.2wu + 三处灯池亮斑
    const px = 1024, py = 512, c = D.cnv(px, py).getContext("2d");
    c.fillStyle = "#1a212b"; c.fillRect(0, 0, px, py);
    const stepX = 1.2 / w * px, stepY = 1.2 / d * py;
    c.strokeStyle = "#2a3646"; c.lineWidth = 1;
    for (let x = 0; x <= px; x += stepX) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, py); c.stroke(); }
    for (let y = 0; y <= py; y += stepY) { c.beginPath(); c.moveTo(0, y); c.lineTo(px, y); c.stroke(); }
    const pools = [[0.44, 0.5, 90], [0.2, 0.5, 80], [0.72, 0.5, 72]]; // UV 比例：机柜顶/吊灯/设备射灯
    for (const [u, v, r] of pools) {
      const gr = c.createRadialGradient(u * px, v * py, 4, u * px, v * py, r);
      gr.addColorStop(0, "rgba(198,210,226,0.16)");
      gr.addColorStop(0.6, "rgba(160,170,184,0.06)");
      gr.addColorStop(1, "rgba(160,170,184,0)");
      c.fillStyle = gr; c.fillRect(u * px - r, v * py - r, r * 2, r * 2);
    }
    return D.texOf(c.canvas);
  }

  // ---------- 灯光（sceneGraph.lights 五条 + 基础光） ----------
  function buildLights(g) {
    g.add(new T.AmbientLight(0x8899aa, 0.5));
    g.add(new T.HemisphereLight(0x35404d, 0x14100c, 0.5));
    const key = new T.DirectionalLight(0xfff1dc, 1.35);
    key.position.set(10, 22, 16);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -26; key.shadow.camera.right = 26;
    key.shadow.camera.top = 26; key.shadow.camera.bottom = -24;
    key.shadow.bias = -0.0015;
    g.add(key);
    const warmWhite = 0xffe8c8; // 暖白档（吊灯/顶灯 color=null 兜底）
    const lampPools = []; // 灯池呼吸（LAMP_BREATH ±8%）
    const mkPoint = (color, intensity, dist, pos) => {
      const L = new T.PointLight(color, intensity, dist, 2);
      L.position.set(pos[0], pos[1], pos[2]);
      g.add(L);
      return L;
    };
    const pendant = E("pendantLamp"), topLamp = E("topLamp");
    const pg = D.entityGeo(pendant), tg = D.entityGeo(topLamp);
    const lampMat = (r) => {
      const m = new T.MeshStandardMaterial({ color: 0xd8dce2, roughness: 0.3, metalness: 0.0, emissive: new T.Color(0xffe8c8), emissiveIntensity: 0.85 });
      m.userData.texRequest = "tex11";
      return m;
    };
    const pm = lampMat(pg.radius);
    const pSphere = new T.Mesh(new T.SphereGeometry(pg.radius, 18, 14), pm);
    pSphere.position.set(pg.cx, pg.cy, pg.cz);
    g.add(pSphere);
    const tm = lampMat(tg.radius);
    const tSphere = new T.Mesh(new T.SphereGeometry(tg.radius, 18, 14), tm);
    tSphere.position.set(tg.cx, tg.cy, tg.cz);
    g.add(tSphere);
    lampPools.push(mkPoint(warmWhite, 22, 20, [pg.cx, pg.cy, pg.cz]));
    lampPools.push(mkPoint(warmWhite, 20, 24, [tg.cx, tg.cy, tg.cz]));
    const spot = D.D.sceneGraph.lights.find((l) => l.id === "lightDeviceSpot");
    lampPools.push(mkPoint(0xdce6f4, 20, 26, spot.pos));
    const rim1 = D.D.sceneGraph.lights.find((l) => l.id === "lightDeskRim");
    mkPoint(new T.Color(rim1.color), rim1.intensity, 34, rim1.pos);
    const rim2 = D.D.sceneGraph.lights.find((l) => l.id === "lightDevRim");
    const rp = D.ref(rim2.pos);
    mkPoint(new T.Color(rim2.color), rim2.intensity, 30, rp);
    // 三环层面补光（可读性；S5 暗部层次：F0 全景顶区环辨识度低——光强 24→44 并下压近环带）
    const ringL = new T.PointLight(0xa9c4ef, 44, 26, 2);
    ringL.position.set(0.5, 14.8, 8.5);
    g.add(ringL);
    // 桌面行南向正面补光（S5 暗部层次：桌面道具群剪影感——吊灯/北向 rim 照顶面，道具南立面无光）
    const deskFill = new T.PointLight(0xaebfd8, 16, 24, 2);
    deskFill.position.set(-15, 5.5, 9);
    g.add(deskFill);
    // 柜面灯池（对齐 V2 基线：暖主灯+内照+低位冷灯；柜体 cx=1.0 平移）
    const warmFace = new T.PointLight(0xd9a860, 16, 16, 2);
    warmFace.position.set(1, 6.5, 4);
    g.add(warmFace);
    const inner = new T.PointLight(0xffe2b0, 40, 13, 2);
    inner.position.set(1, 5.2, 1.6);
    g.add(inner);
    const innerLo = new T.PointLight(0xbfd0e8, 14, 9, 2);
    innerLo.position.set(2.5, 1.8, 1.7);
    g.add(innerLo);
    root.lampPools = lampPools;
    root.lampBreathBase = lampPools.map((L) => L.intensity);
  }

  // ---------- 左区：文书台 ----------
  function buildDesk(g) {
    const top = E("deskTop"), geo = D.entityGeo(top);
    const deskMat = D.mat("mDeskWood");
    const topMesh = rbox(geo.sx, geo.sy, geo.sz, 0.08, deskMat, geo.cx, geo.cy, geo.cz);
    g.add(topMesh);
    const legs = D.ref("derived:d22");
    for (const [lx, ly, lz] of legs.legCenters) g.add(box(legs.legSection[0], 2.7, legs.legSection[1], deskMat, lx, ly, lz));
    // 命令单打印机（命令单出口 F4/F6/F8）
    const pr = E("printer"), prg = D.entityGeo(pr);
    const prGrp = new T.Group();
    prGrp.add(rbox(prg.sx, prg.sy, prg.sz, 0.09, D.mat(D.ref(pr.material)), 0, prg.sy / 2, 0));
    prGrp.add(box(prg.sx * 0.8, 0.1, 0.4, D.mat("screenBg"), 0, prg.sy - 0.02, prg.sz * 0.15));
    prGrp.add(box(prg.sx * 0.9, 0.07, prg.sz * 0.5, D.mat("slotSteel"), 0, prg.sy * 0.42, prg.sz * 0.42));
    prGrp.position.set(prg.cx, prg.cy - prg.sy / 2, prg.cz);
    g.add(prGrp);
    root.printerTop = new T.Vector3(prg.cx, prg.cy + prg.sy / 2 + 0.05, prg.cz);
    for (let i = 0; i < 3; i++) g.add(box(1.15, 0.035, 0.68, D.mat("mCardPaper"), prg.cx + 0.2, prg.cy - prg.sy / 2 + 0.03 + i * 0.045, prg.cz + 0.6));
    // 表格卡钢卡座（F5 主道具：两页表格卡）
    const ch = E("cardHolder"), chg = D.entityGeo(ch);
    g.add(box(chg.sx, chg.sy, chg.sz, D.mat(D.ref(ch.material)), chg.cx, chg.cy, chg.cz));
    const form = makeScreen("form", 2.3, 2.7, 460, 540, drawForm);
    form.position.set(chg.cx, chg.cy + chg.sy / 2 + 1.38, chg.cz + 0.25);
    form.rotation.x = -0.07;
    g.add(form);
    g.add(box(chg.sx + 0.1, 0.1, 0.24, D.mat("slotSteel"), chg.cx, chg.cy + chg.sy / 2 + 0.02, chg.cz + 0.3));
    root.formAnchor = new T.Vector3(chg.cx, chg.cy + chg.sy / 2 + 0.1, chg.cz);
    // 8 字节接收缓冲托盘（绿边）
    const tr = E("tray8"), trg = D.entityGeo(tr);
    tray8Grp = new T.Group();
    const trayMat = D.mat(D.ref(tr.material).split("+")[0]);
    tray8Grp.add(box(trg.sx, trg.sy, trg.sz, trayMat, 0, trg.sy / 2, 0));
    tray8Grp.add(box(trg.sx + 0.06, 0.07, trg.sz + 0.06, new T.MeshStandardMaterial({ color: new T.Color(D.flatMap.devGreen), roughness: 0.5 }), 0, trg.sy - 0.03, 0));
    tray8Grp.position.set(trg.cx, trg.cy - trg.sy / 2, trg.cz);
    g.add(tray8Grp);
    root.trayTop = new T.Vector3(trg.cx, trg.cy + trg.sy / 2 + 0.05, trg.cz);
    // 描述符收件匣
    const ib = E("inbox"), ibg = D.entityGeo(ib);
    inboxGrp = new T.Group();
    inboxGrp.add(box(ibg.sx, ibg.sy, ibg.sz, D.mat(D.ref(ib.material).split("+")[0]), 0, ibg.sy / 2, 0));
    inboxGrp.add(box(ibg.sx - 0.16, 0.06, ibg.sz - 0.16, D.mat("mCardPaper"), 0, ibg.sy + 0.03, 0));
    inboxGrp.add(box(ibg.sx, 0.3, 0.07, D.mat("cardEdge"), 0, ibg.sy / 2, -ibg.sz / 2));
    inboxGrp.add(box(ibg.sx, 0.3, 0.07, D.mat("cardEdge"), 0, ibg.sy / 2, ibg.sz / 2));
    inboxGrp.position.set(ibg.cx, ibg.cy - ibg.sy / 2, ibg.cz);
    g.add(inboxGrp);
    root.inboxTop = new T.Vector3(ibg.cx, ibg.cy + ibg.sy / 2 + 0.06, ibg.cz);
    // 事件匣（走廊落点+开匣动画）
    const eb = E("eventBox"), ebg = D.entityGeo(eb);
    const ebGrp = new T.Group();
    ebGrp.add(box(ebg.sx, ebg.sy, ebg.sz, D.mat(D.ref(eb.material).split("+")[0]), 0, ebg.sy / 2, 0));
    ebGrp.add(box(ebg.sx - 0.16, 0.06, ebg.sz - 0.16, D.mat("mCardPaper"), 0, ebg.sy + 0.03, 0));
    eventBoxLid = box(ebg.sx + 0.04, 0.07, ebg.sz + 0.04, D.mat("cardEdge"), 0, ebg.sy + 0.12, -ebg.sz / 2 - 0.02);
    ebGrp.add(eventBoxLid);
    ebGrp.position.set(ebg.cx, ebg.cy - ebg.sy / 2, ebg.cz);
    g.add(ebGrp);
    root.eventBoxGrp = ebGrp;
    const land = D.ref(X43D.D.corridor.landingTarget);
    root.eventBoxTop = new T.Vector3(land[0], land[1] + 0.06, land[2]);
    // 状态窗（后墙板，自发光 0.35）
    const sw = E("statusWindow"), swg = D.entityGeo(sw);
    const swBoard = box(swg.sx, swg.sy, 0.08, new T.MeshStandardMaterial({ color: 0x1a2029, roughness: 0.5, emissive: new T.Color(0x223041), emissiveIntensity: 0.35 }), swg.cx, swg.cy, swg.cz);
    g.add(swBoard);
    const swScreen = makeScreen("statusWin", swg.sx - 0.2, swg.sy - 0.16, 512, 176, drawStatusWin);
    swScreen.position.set(swg.cx, swg.cy, swg.cz + 0.05);
    g.add(swScreen);
    root.statusWinPos = new T.Vector3(swg.cx, swg.cy, swg.cz);
    // AO 接触阴影（d20 桌面盘）
    const ao = D.ref("derived:d20");
    aoDisc(ao.deskDiskR, ao.deskDiskPos[0], 3.02, ao.deskDiskPos[2], g);
  }
  function drawForm(c, px, py, st) {
    screenBase(c, px, py, "输入上下文", "#7c9ff0");
    c.textBaseline = "middle";
    const filled = st.formFilled || 0;
    const cells = [
      ["A0", "1"], ["A1", "1"],
      ["端口号", "1"], ["Route String", "0"], ["Context Entries", "1"],
      ["EP Type", "Control"], ["MPS", "8"], ["Max Burst", "0"], ["TR Deq", "环首段"],
      ["DCS", "1"], ["Interval", "0"], ["MaxPStreams", "0"], ["Mult", "0"], ["CErr", "3"],
    ];
    const cellBox = (i, x, y, w) => {
      const [k, v] = cells[i];
      const on = filled > i;
      c.strokeStyle = on ? "#7c9ff0" : "#46566a"; c.lineWidth = 2;
      c.strokeRect(x, y - 14, w, 28);
      c.fillStyle = "#8d99a6"; c.font = `500 17px ${D.MONO}`; c.textAlign = "left";
      c.fillText(k, x + 6, y);
      if (on) { c.fillStyle = "#e2edff"; c.font = `600 17px ${D.MONO}`; c.textAlign = "right"; c.fillText(v, x + w - 6, y); }
    };
    let y = 88;
    const tagRow = (tag, idxs, cols) => {
      c.fillStyle = "#7c9ff0"; c.font = `600 22px ${D.MONO}`; c.textAlign = "left";
      c.fillText(tag, 26, y); y += 26;
      const w = Math.floor((px - 60) / cols) - 8;
      idxs.forEach((ci2, j) => cellBox(ci2, 26 + (j % cols) * (w + 8), y + (Math.floor(j / cols)) * 34, w));
      y += Math.ceil(idxs.length / cols) * 34 + 8;
    };
    tagRow("输入控制 · A0/A1（TICK_CHECK）", [0, 1], 2);
    tagRow("Slot Context（CELL_FILL）", [2, 3, 4], 3);
    tagRow("EP0 Context（CELL_FILL 九格）", [5, 6, 7, 8, 9, 10, 11, 12, 13], 3);
    c.fillStyle = "#748393"; c.font = `500 17px ${D.MONO}`; c.textAlign = "left";
    c.fillText("Route String 不含端口号（p75 脚注 8）· MPS=端口速度默认〔样例 FS=8〕", 26, py - 22);
  }
  function drawStatusWin(c, px, py, st) {
    screenBase(c, px, py, null);
    c.font = `600 34px ${D.MONO}`; c.textAlign = "left"; c.textBaseline = "middle";
    const rows = [["USBCMD", "R/S=1", "#9fe08f"], ["MaxSlotsEn", "已配置", "#cfe0ff"], ["DCBAAP", "→ DCBAA", "#cfe0ff"]];
    rows.forEach(([k, v, col], i) => {
      c.fillStyle = "#8d99a6"; c.font = `500 24px ${D.MONO}`;
      c.fillText(k, 26, 40 + i * 46);
      c.fillStyle = col; c.font = `700 30px ${D.MONO}`;
      c.fillText(v, 190, 40 + i * 46);
    });
  }

  // ---------- 中区：xHC 总控台 ----------
  function buildCabinet(g) {
    const cab = E("cabinet"), cg = D.entityGeo(cab);
    const steel = D.mat("mCabinetSteel");
    const W = cg.sx, Hh = cg.sy, Dp = cg.sz;
    const cx = cg.cx, cz = cg.cz;
    const cabGrp = new T.Group();
    cabGrp.add(box(W, 0.5, Dp, steel, cx, 0.25, cz));
    cabGrp.add(box(W, Hh, 0.3, steel, cx, Hh / 2, cz - Dp / 2 + 0.15)); // 背墙
    cabGrp.add(box(0.3, Hh, Dp, steel, cx - W / 2 + 0.15, Hh / 2, cz));
    cabGrp.add(box(0.3, Hh, Dp, steel, cx + W / 2 - 0.15, Hh / 2, cz));
    frontWall = box(W - 0.2, Hh - 0.4, 0.14, steel, cx, Hh / 2, cz + Dp / 2 - 0.07);
    frontWall.visible = false; // 剖视默认开（剖口朝镜头）
    cabGrp.add(frontWall);
    cabGrp.add(box(W - 0.2, 0.1, 0.1, new T.MeshStandardMaterial({ color: new T.Color(D.flatMap.hcAmber), roughness: 0.42 }), cx, 0.62, cz + Dp / 2 - 0.05));
    g.add(cabGrp);
    const corn = E("cornice"), cornG = D.entityGeo(corn);
    g.add(box(cornG.sx, cornG.sy, cornG.sz, D.mat(D.ref(E("cornice").material)), cornG.cx, cornG.cy, cornG.cz));
    // —— DCBAA 格架（d06：2 行×4 列，上行 0..3 下行 4..7） ——
    const dg = E("dcbaaGrid"), dgg = D.entityGeo(dg);
    const d6 = D.ref("derived:d06");
    const gridGrp = new T.Group();
    gridGrp.add(box(dgg.sx, dgg.sy, 0.1, D.mat("mGridPlastic"), 0, 0, 0));
    const colC = [], rowC = [];
    for (let j = 0; j < 4; j++) colC.push(-4.8 + d6.colW * (j + 0.5));
    for (let kk = 0; kk < 2; kk++) rowC.push(5.2 + d6.rowH * (kk + 0.5));
    const cellMeshes = [];
    for (let kk = 0; kk < 2; kk++) for (let j = 0; j < 4; j++) {
      const n = kk * 4 + j;
      const isOne = n === 1;
      const cu = box(d6.colW - 0.14, d6.rowH - 0.18, 0.5, new T.MeshStandardMaterial({
        color: new T.Color(isOne ? "#d9a860" : "#232c38"), roughness: 0.5, metalness: 0.3,
        transparent: true, opacity: isOne ? 0.5 : 1,
      }), colC[j] - dgg.cx, rowC[kk] - dgg.cy, 0.1);
      gridGrp.add(cu);
      cellMeshes.push({ n, mesh: cu });
    }
    dcbaaWindow = new T.Mesh(new T.BoxGeometry(0.5, 0.14, 0.08), new T.MeshStandardMaterial({ color: 0x39414c, emissive: new T.Color(0xd9a860), emissiveIntensity: 0 }));
    dcbaaWindow.position.set(dgg.cx + dgg.sx / 2 + 0.3, dgg.cy - dgg.sy / 2 + 0.2, 2.42);
    gridGrp.add(dcbaaWindow.clone());
    dcbaaWindow = gridGrp.children[gridGrp.children.length - 1];
    for (let kk = 0; kk < 2; kk++) {
      const strip = makeScreen("dcbaaNums" + kk, dgg.sx - 0.3, 0.26, 420, 46, (c, px, py) => {
        c.clearRect(0, 0, px, py);
        c.fillStyle = "#e8d5b0"; c.font = `600 30px ${D.MONO}`; c.textAlign = "center"; c.textBaseline = "middle";
        for (let j = 0; j < 4; j++) c.fillText(String(kk * 4 + j), (j + 0.5) * px / 4, py / 2);
      });
      strip.position.set(0, rowC[kk] - dgg.cy - d6.rowH / 2 + 0.16, 0.3);
      gridGrp.add(strip);
    }
    // 输出上下文卡（1 号格内，F4 后可见）
    outctxCard = box(0.6, 0.5, 0.3, new T.MeshStandardMaterial({ color: new T.Color(D.flatMap.driveBlue), roughness: 0.5, emissive: new T.Color(D.flatMap.driveBlue), emissiveIntensity: 0.5 }), colC[1] - dgg.cx, rowC[0] - dgg.cy, 0.16);
    outctxCard.visible = false;
    gridGrp.add(outctxCard);
    gridGrp.position.set(dgg.cx, dgg.cy, dgg.cz);
    g.add(gridGrp);
    root.cell1Pos = new T.Vector3(colC[1], rowC[0], dgg.cz + 0.35);
    const plate = plateMesh(E("dcbaaGrid").plates[0].text, 2.6, 0.3, { fs: 34, color: "#f3e9cf", bg: "#0b0f14" });
    plate.position.set(dgg.cx, dgg.cy + dgg.sy / 2 - 0.18, 2.66); // 贴格架上缘（与灯排牌注垂直错开，消 3D 牌注互叠）
    g.add(plate);
    // —— 槽态灯排（d05：5 灯，首灯双色芯） ——
    const d5 = D.ref("derived:d05");
    const lampOn = { Disabled: D.flatMap.slotLampDisabled, Enabled: D.flatMap.hcAmber, Default: "#e8eef7", Addressed: D.flatMap.driveBlue, Configured: D.flatMap.devGreen };
    const lampOff = D.flatMap.lampOff;
    root.slotLamps = [];
    d5.centersX.forEach((x, i) => {
      const isDual = i === 0;
      const mm = new T.MeshStandardMaterial({ color: new T.Color(lampOff), roughness: 0.35, emissive: new T.Color(lampOff), emissiveIntensity: 0.6 });
      const dome = new T.Mesh(new T.SphereGeometry(d5.r, 16, 12), mm);
      dome.position.set(x, d5.y, d5.z);
      g.add(dome);
      root.slotLamps.push({ mesh: dome, mat: mm, dual: isDual, role: i === 0 ? "slot" : ["", "Default", "Addressed", "Configured"][i] });
    });
    // S5 修复（复评残留：牌头「Enabled」被裁实锤=文案超 512px 画布两侧裁+首灯球贴头）：两行排布（「——」处折行）+
    // 板缩窄至 3.1wu（x[-1.55,1.55]，让开格架牌 x[-4.2,-1.6]）+中心下移 0.12（首灯球投影间隙 8→17px，F7 最紧机位）。
    const lampPlate = plateMesh(D.D.materials.lampRowPlate.text.replace("——", "——\n"), 3.1, 0.46, { fs: 24, color: "#eef3f9", bg: "#0b0f14", edge: "#3d4a35" });
    lampPlate.position.set(0, d5.y - 0.78, 2.74); // 灯下前移提亮（z+0.34）；两行板与格架牌 7.65 底、首灯球 8.1 底双向留隙
    g.add(lampPlate);
    // —— PORTSC 双读数屏 ——
    const ps = E("portscScreens");
    for (const child of ps.children) {
      const cb = D.entityGeo({ bbox: child.bbox, pos: null });
      const scr = makeScreen(child.id, cb.sx - 0.1, cb.sy - 0.1, 480, 480, child.id === "portscUsb2" ? drawPortsc2 : drawPortsc3);
      scr.position.set(cb.cx, cb.cy, 2.46);
      g.add(scr);
      g.add(box(cb.sx, cb.sy, 0.08, new T.MeshStandardMaterial({ color: 0x11161d, roughness: 0.4, metalness: 0.2 }), cb.cx, cb.cy, 2.4));
    }
    // PSCEG 拉线扳机（F1 triggerPull）
    triggerLever = new T.Group();
    const lv = box(0.08, 0.5, 0.08, D.mat("mKnobAlu"), 0, 0.22, 0);
    triggerLever.add(lv);
    const lvBall = new T.Mesh(new T.SphereGeometry(0.07, 10, 8), new T.MeshStandardMaterial({ color: new T.Color(D.flatMap.irqLine), roughness: 0.4 }));
    lvBall.position.set(0, 0.5, 0);
    triggerLever.add(lvBall);
    triggerLever.position.set(6.3, 5.6, 2.46);
    triggerLever.rotation.z = 0.9;
    g.add(triggerLever);
    // —— 复位按钮 ——
    const rb = E("resetButton"), rbg = D.entityGeo(rb);
    resetBtn = new T.Group();
    resetBtn.add(cyl(rbg.radius + 0.06, rbg.radius + 0.1, 0.1, D.mat("mKnobAlu"), 0, 0.04, 0, 22));
    const rbtn = cyl(rbg.radius, rbg.radius, 0.16, new T.MeshStandardMaterial({ color: new T.Color(D.flatMap.alarmRed), roughness: 0.4, metalness: 0.12, emissive: new T.Color(D.flatMap.alarmRed), emissiveIntensity: 0.12 }), 0, 0.14, 0, 20);
    resetBtn.add(rbtn);
    resetBtn.position.set(rbg.cx, rbg.cy, rbg.cz);
    root.resetBtnBtn = rbtn;
    g.add(resetBtn);
    // —— 门铃排（d02：0 号大 + 1..7 小；d03 两块分刻牌） ——
    const d02 = D.ref("derived:d02");
    const knobMat = D.mat("mKnobAlu");
    const mkKnob = (x, r, role) => {
      const kgrp = new T.Group();
      kgrp.add(cyl(r + 0.05, r + 0.08, 0.08, knobMat, 0, 0.03, 0, 22));
      const knob = cyl(r, r, 0.14, knobMat, 0, 0.12, 0, 20);
      kgrp.add(knob);
      const cap = new T.Mesh(new T.SphereGeometry(r * 0.55, 14, 10), new T.MeshStandardMaterial({
        color: new T.Color(role === 0 ? D.flatMap.hcAmber : role === 1 ? D.flatMap.devGreen : "#4a5561"),
        roughness: 0.35, emissive: new T.Color(role === 0 ? D.flatMap.hcAmber : role === 1 ? D.flatMap.devGreen : "#000000"),
        emissiveIntensity: role <= 1 ? 0.28 : 0,
      }));
      cap.position.set(0, 0.2, 0);
      kgrp.add(cap);
      kgrp.position.set(x, 1.7, 2.4);
      kgrp.userData = { role, baseY: 1.7, knobMesh: knob, guide: role === 1 };
      bells.knobs[role] = kgrp;
      g.add(kgrp);
      return kgrp;
    };
    mkKnob(d02.knob0Pos[0], d02.knob0R, 0);
    d02.centers1234567.forEach((x, i) => mkKnob(x, d02.smallR, i + 1));
    const pA = D.ref("derived:d03.plateA"), pB = D.ref("derived:d03.plateB");
    const plateA = plateMesh(E("doorbellRow").plates[0].text, 1.3, 0.2, { fs: 24 });
    plateA.position.set(pA[0], pA[1] + 0.14, pA[2]); // 垂直错层（d03 y2.6 上阶）——消两牌物理交叠
    g.add(plateA);
    const plateB = plateMesh(E("doorbellRow").plates[1].text, 1.3, 0.2, { fs: 24 });
    plateB.position.set(pB[0], pB[1] - 0.14, pB[2]); // 下阶
    g.add(plateB);
    // —— BSR 两位旋钮 ——
    const bk = E("bsrKnob"), bkg = D.entityGeo(bk);
    bsrGrp = new T.Group();
    bsrGrp.add(cyl(bkg.radius + 0.06, bkg.radius + 0.1, 0.08, knobMat, 0, 0.03, 0, 24));
    const bknob = cyl(bkg.radius, bkg.radius, 0.16, knobMat, 0, 0.12, 0, 22);
    bsrGrp.add(bknob);
    const bmark = box(0.06, 0.05, bkg.radius * 0.8, new T.MeshStandardMaterial({ color: new T.Color(D.flatMap.hcAmber), emissive: new T.Color(D.flatMap.hcAmber), emissiveIntensity: 0.5 }), 0, 0.21, bkg.radius * 0.4);
    bsrGrp.add(bmark);
    bsrGrp.position.set(bkg.cx, bkg.cy, bkg.cz);
    g.add(bsrGrp);
    const bp = plateMesh(E("bsrKnob").plates[0].text, 2.3, 0.22, { fs: 22 });
    bp.position.set(bkg.cx - 0.2, bkg.cy - 0.72, 2.6); // 旋钮下方（HTML lbl-bsr 在上方 3.0，消同位重复）
    g.add(bp);
    // —— 根端口排 ×4（d19） ——
    const ports = E("ports");
    root.portBlocks = [];
    for (const pdef of ports.children) {
      const pg = D.entityGeo(pdef);
      const blk = box(pg.sx, pg.sy, pg.sz, D.mat("mCabinetSteel"), pg.cx, pg.cy, pg.cz);
      g.add(blk);
      g.add(box(0.16, pg.sy * 0.5, pg.sz * 0.6, D.mat("screenBg"), pg.cx + pg.sx / 2 - 0.02, pg.cy, pg.cz));
      const pl = plateMesh(pdef.plate, 0.52, 0.15, { fs: 30 });
      pl.rotation.y = Math.PI / 2.6; // 朝东南（主视角可读；纯东向=掠射面）
      pl.position.set(pg.cx + pg.sx / 2 + 0.05, pg.cy + 0.26, pg.cz + 0.08);
      g.add(pl);
      root.portBlocks.push({ id: pdef.id, family: pdef.family, mesh: blk });
    }
    portRing = new T.Mesh(new T.TorusGeometry(0.4, 0.055, 10, 26), new T.MeshStandardMaterial({ color: new T.Color(D.flatMap.devGreen), emissive: new T.Color(D.flatMap.devGreen), emissiveIntensity: 1.1, roughness: 0.4 }));
    portRing.position.set(8.0, 1.8, 0.65);
    portRing.rotation.y = Math.PI / 2;
    portRing.visible = false;
    g.add(portRing);
    // —— 卡库抽屉（d13，柜内） ——
    const cd = E("cardDrawer"), cdg = D.entityGeo(cd);
    const drawerGrp = new T.Group();
    drawerGrp.add(box(cdg.sx, cdg.sy, cdg.sz, D.mat("mCabinetSteel"), 0, 0, 0));
    drawerGrp.add(box(cdg.sx - 0.06, cdg.sy - 0.2, 0.06, new T.MeshStandardMaterial({ color: 0x5a6572, roughness: 0.4, metalness: 0.6 }), 0, 0, cdg.sz / 2));
    drawerGrp.add(box(0.2, 0.06, cdg.sz * 0.7, D.mat("mKnobAlu"), cdg.sx / 2, 0, 0));
    drawerGrp.position.set(cdg.cx, cdg.cy, cdg.cz);
    g.add(drawerGrp);
    root.drawerGrp = drawerGrp;
    root.drawerHome = drawerGrp.position.clone();
    aoDisc(6.6, cx, 0.045, cz, g);
  }
  function drawPortsc2(c, px, py, st) {
    screenBase(c, px, py, "PORTSC · 端口 1（USB2）");
    const F = ["CCS", "CSC", "PR", "PRC", "PED"];
    const onCol = "#ffb24d", offCol = "#242e38";
    c.font = `600 26px ${D.MONO}`; c.textAlign = "left"; c.textBaseline = "middle";
    let x = 40;
    for (const f of F) {
      c.fillStyle = "#8d99a6"; c.textAlign = "center"; c.fillText(f, x + 30, 96);
      c.beginPath(); c.arc(x + 30, 138, 17, 0, Math.PI * 2);
      c.fillStyle = st.flags[f.toLowerCase()] ? onCol : offCol; c.fill(); // state.flags 键为小写（S5 修复：原读 st.flags[f] 大写键永空=五点常暗）
      c.strokeStyle = "#3a4652"; c.lineWidth = 2; c.stroke();
      x += 84;
    }
    c.textAlign = "left"; c.font = `600 24px ${D.MONO}`;
    c.fillStyle = "#8d99a6"; c.fillText("PLS", 44, 218);
    c.fillStyle = "#ffd9a0"; c.font = `700 40px ${D.MONO}`;
    c.fillText(st.pls, 44, 266);
    c.fillStyle = "#8d99a6"; c.font = `600 24px ${D.MONO}`;
    c.fillText("Speed", 210, 218);
    c.fillStyle = "#9fe08f"; c.font = `700 40px ${D.MONO}`;
    c.fillText(st.speed, 210, 266);
    c.font = `500 22px ${D.MONO}`;
    c.fillStyle = "#5b6875";
    c.fillText("端口 2 · USB3（另屏）", 44, 360);
    c.fillText("端口 3/4 · 未接", 44, 396);
    c.fillStyle = "#4a5561"; c.font = `500 19px ${D.MONO}`;
    c.fillText("复位按钮在本屏下方——写 PR=1 发起端口复位", 44, py - 30);
  }
  function drawPortsc3(c, px, py, st) {
    screenBase(c, px, py, "PORTSC · 端口 2（USB3）", "#86bd7a");
    c.font = `500 24px ${D.MONO}`; c.textAlign = "left"; c.textBaseline = "middle";
    c.fillStyle = "#8d99a6";
    c.fillText("USB3 端口插入后进入 Polling：", 40, 120);
    c.fillText("轮询成功自动 Enabled（无复位帧）", 40, 158);
    const rows = [["PED", st.flags.pedUsb3 ? "1" : "0"], ["PR", "0"], ["PLS", st.plsUsb3 || "—"]];
    rows.forEach(([k, v], i) => {
      c.fillStyle = "#8d99a6"; c.font = `600 24px ${D.MONO}`;
      c.fillText(k, 40, 240 + i * 52);
      c.fillStyle = "#cfe0ff"; c.font = `700 30px ${D.MONO}`;
      c.fillText(v, 150, 240 + i * 52);
    });
    c.fillStyle = "#4a5561"; c.font = `500 19px ${D.MONO}`;
    c.fillText("两族 Disabled 态不同义（p71 Note）", 40, py - 34);
  }

  // ---------- 门架 + 三环 ----------
  function buildGantry(g) {
    const gan = E("gantry");
    const d09 = D.ref("derived:d09");
    const railMat = D.mat("mRailSteel");
    const ganGrp = new T.Group();
    for (const px of gan.posts.xs) for (const pz of gan.posts.zs) {
      ganGrp.add(box(d09.postSection[0], D.ref(gan.posts.y[1]), d09.postSection[1], railMat, px, D.ref(gan.posts.y[1]) / 2, pz));
    }
    for (const y of gan.beams.layerYs) for (const [z0, z1] of d09.beamZ) {
      ganGrp.add(box(d09.beamX[1] - d09.beamX[0], d09.postSection[1], d09.postSection[0], railMat, (d09.beamX[0] + d09.beamX[1]) / 2, y, (z0 + z1) / 2));
    }
    g.add(ganGrp);
    root.gantryGrp = ganGrp;
    // FS 支线闸口（d26）——独立材质（gateLight 点亮不波及门架钢）
    const fsg = E("fsGate");
    const f26 = D.ref(fsg.bbox);
    fsGateGrp = new T.Group();
    const gateMat = new T.MeshStandardMaterial({ color: new T.Color("#8fa3b8"), metalness: 0.8, roughness: 0.3, emissive: new T.Color("#000000"), emissiveIntensity: 0 });
    gateMat.userData.texRequest = "tex02";
    fsGateGrp.add(box(0.14, f26.size[1], 0.3, gateMat, f26.pos[0] - f26.size[0] / 2 + 0.1, f26.pos[1], f26.pos[2]));
    fsGateGrp.add(box(0.14, f26.size[1], 0.3, gateMat, f26.pos[0] + f26.size[0] / 2 - 0.1, f26.pos[1], f26.pos[2]));
    fsGateGrp.add(box(f26.size[0], 0.14, 0.3, gateMat, f26.pos[0], f26.pos[1] + f26.size[1] / 2 - 0.1, f26.pos[2]));
    const gplate = plateMesh(fsg.plate.text, 2.6, 0.26, { fs: 22 });
    gplate.position.set(f26.pos[0], f26.pos[1] - f26.size[1] / 2 - 0.18, f26.pos[2] + 0.1); // 门架下方（HTML lbl-fs-gate 在上方，消同位重复）
    fsGateGrp.add(gplate);
    fsGateGrp.userData.lit = false;
    g.add(fsGateGrp);
  }

  const RING_DEFS = [
    { key: "ringCmd", accentFlat: "hcAmber", accent: "#d9a860", y: 10.0 },
    { key: "ringEp0", accentFlat: "devGreen", accent: "#86bd7a", y: 11.8 },
    { key: "ringEvt", accentFlat: "driveBlue", accent: "#7c9ff0", y: 13.6 },
  ];
  function buildRings(g) {
    const C = D.ringCommon;
    const railMat = new T.MeshStandardMaterial({ color: new T.Color(C.railColor), metalness: 0.75, roughness: 0.3 });
    const slotMat = () => new T.MeshStandardMaterial({ color: new T.Color(C.deckColor), roughness: 0.42, metalness: 0.66 }); // 每环独立（epSlotsAllLit 只点亮本环）
    const linkMat = new T.MeshStandardMaterial({ color: new T.Color(C.linkSlotBase), roughness: 0.38, metalness: 0.3, emissive: new T.Color(C.linkSlotBase), emissiveIntensity: 0.25 });
    for (const def of RING_DEFS) {
      const y = def.y;
      const grp = new T.Group();
      const torus = new T.Mesh(new T.TorusGeometry(C.radius, C.tubeRadius, 10, 96), railMat);
      torus.rotation.x = Math.PI / 2;
      torus.position.set(C.center[0], y, C.center[1]);
      torus.castShadow = true;
      grp.add(torus);
      // 12 卡槽（slot0=Link 琥珀槽底）
      const slats = [];
      for (let i = 0; i < C.slots; i++) {
        const link = i === C.linkSlot;
        const p = D.slotPos(i, y);
        const s = new T.Mesh(new T.BoxGeometry(0.5, 0.06, 0.3), link ? linkMat : slotMat());
        s.position.set(p[0], y + 0.1, p[2]);
        s.rotation.y = -Math.atan2(Math.cos((Math.PI / 180) * 30 * i), Math.sin((Math.PI / 180) * 30 * i));
        grp.add(s);
        slats.push(s);
      }
      // Link 回绕弧（slot11→拱顶 d30→slot0，三点 CatmullRom）
      const apex = D.linkArcApex(y);
      const p11 = D.slotPos(11, y), p0 = D.slotPos(0, y);
      const arcCurve = new T.CatmullRomCurve3([new T.Vector3(p11[0], p11[1], p11[2]), new T.Vector3(apex[0], apex[1], apex[2]), new T.Vector3(p0[0], p0[1], p0[2])]);
      const arc = new T.Mesh(new T.TubeGeometry(arcCurve, 32, 0.05, 8), new T.MeshStandardMaterial({ color: new T.Color(C.linkSlotBase), emissive: new T.Color(C.linkSlotBase), emissiveIntensity: 0.22, roughness: 0.4 }));
      grp.add(arc);
      // Link 小牌（plateLink 原文）
      const lp = plateMesh(C.plateLink.text, 1.9, 0.2, { fs: 30, color: "#e8d5b0" });
      lp.position.set(apex[0] - 0.4, y + 0.42, apex[2] + 1.3);
      lp.rotation.x = -0.35;
      grp.add(lp);
      // 读指针小旗（每环一支；事件环旗=ERDP 推进）
      const flagGrp = new T.Group();
      const pole = cyl(0.022, 0.022, 0.62, new T.MeshStandardMaterial({ color: 0x8fa3b8, metalness: 0.8, roughness: 0.3 }), 0, 0.31, 0, 8);
      flagGrp.add(pole);
      const cloth = new T.Mesh(new T.BufferGeometry(), new T.MeshBasicMaterial({ color: new T.Color(def.accent), side: T.DoubleSide }));
      cloth.geometry.setAttribute("position", new T.BufferAttribute(new Float32Array([
        0, 0.62, 0, 0.3, 0.55, 0, 0, 0.48, 0,
      ]), 3));
      cloth.geometry.computeVertexNormals();
      flagGrp.add(cloth);
      grp.add(flagGrp);
      const ring = {
        key: def.key, def, y, grp, slats, arcCurve,
        objs: [], static: [], stepT: 0, stepDur: D.base("STEP"), stepAnim: Math.min(0.34, D.base("STEP") * 0.3),
        flag: flagGrp, flagSlot: def.key === "ringEvt" ? 6 : 3, flagPrev: def.key === "ringEvt" ? 6 : 3, flagAnimT: 1, cruise: false,
      };
      rings[def.key] = ring;
      g.add(grp);
    }
    // DCBAA 1 号格 → EP0 slot5 指针光束（细，F5 后显示）
    const cell1 = root.cell1Pos;
    const s5 = D.slotPos(5, 11.8);
    dcbaaBeam = new T.Mesh(new T.CylinderGeometry(0.028, 0.028, 1, 6, 1, true), new T.MeshBasicMaterial({ color: new T.Color(D.flatMap.dmaBlue), transparent: true, opacity: 0.3 }));
    const bv = new T.Vector3(s5[0], s5[1], s5[2]).sub(cell1);
    dcbaaBeam.scale.y = bv.length();
    dcbaaBeam.position.copy(cell1).addScaledVector(bv, 0.5);
    dcbaaBeam.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), bv.clone().normalize());
    dcbaaBeam.visible = false;
    g.add(dcbaaBeam);
  }

  // TRB 卡（billboard：每帧 lookAt 相机，仅 +z 面贴字）
  function makeTrbCard(label, cyc, accent) {
    const c = D.cnv(320, 144), ctx = c.getContext("2d");
    const draw = () => {
      ctx.fillStyle = "#141c26"; ctx.fillRect(0, 0, 320, 144);
      ctx.strokeStyle = accent; ctx.lineWidth = 6; ctx.strokeRect(5, 5, 310, 134);
      ctx.fillStyle = "#f3efe4"; ctx.font = `600 36px ${D.MONO}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      const lines = String(label).split("·").map((s) => s.trim());
      lines.slice(0, 2).forEach((ln, i) => ctx.fillText(ln, 16, 40 + i * 38));
      ctx.fillStyle = cyc ? "#9fe08f" : "#ffb24d";
      ctx.font = `600 30px ${D.MONO}`;
      ctx.fillText("cycle=" + cyc, 16, 118);
    };
    draw();
    const tex = D.texOf(c);
    const face = new T.MeshBasicMaterial({ map: tex });
    const side = new T.MeshStandardMaterial({ color: 0x222b36, roughness: 0.55, metalness: 0.3 });
    const size = D.ringCommon.cardSize;
    const m = new T.Mesh(new T.BoxGeometry(size[0], size[1], size[2]), [side, side, side, side, face, side]);
    m.userData.setCycle = (v) => { cyc = v; draw(); tex.needsUpdate = true; };
    m.userData.trb = true;
    return m;
  }
  function ringSlotAngle(i) { return (Math.PI / 180) * 30 * i; }
  function ringPoint(r, i) {
    const a = ringSlotAngle(i);
    return new T.Vector3(D.ringCommon.center[0] + D.ringCommon.radius * Math.cos(a), r.y, -D.ringCommon.radius * Math.sin(a));
  }
  function ringAdvance(r) {
    for (const o of r.objs) {
      o.prev = o.slot;
      o.slot = (o.slot + 1) % D.ringCommon.slots;
      o.animT = 0;
      if (o.slot === 0 && !o.slat) {
        o.wrap = true;
        if (o.mesh.userData.setCycle) {
          o.cyc = o.cyc ? 0 : 1;
          o.mesh.userData.setCycle(o.cyc); // 过弧 cycle 翻色（PCS=1 绿 ↔ 0 琥珀）
        }
      }
    }
    // 读指针小旗同步步进（事件环旗=ERDP，另行触发）
    if (r.key !== "ringEvt") { r.flagPrev = r.flagSlot; r.flagSlot = (r.flagSlot + 1) % D.ringCommon.slots; r.flagAnimT = 0; }
  }
  function erdpAdvance() {
    const r = rings.ringEvt;
    r.flagPrev = r.flagSlot;
    r.flagSlot = (r.flagSlot + 1) % D.ringCommon.slots;
    r.flagAnimT = 0;
  }
  function updateRings(dt) {
    for (const key of Object.keys(rings)) {
      const r = rings[key];
      r.stepT += dt;
      if (r.stepT >= r.stepDur) { r.stepT -= r.stepDur; ringAdvance(r); }
      if (camRef) for (const s of r.static) s.lookAt(camRef.position);
      for (let i = r.objs.length - 1; i >= 0; i--) {
        const o = r.objs[i];
        o.animT = Math.min(1, o.animT + dt / r.stepAnim);
        const from = o.prev, to = o.slot;
        const k = o.animT < 1 ? (o.animT < 0.5 ? 2 * o.animT * o.animT : 1 - Math.pow(-2 * o.animT + 2, 2) / 2) : 1;
        if (o.wrap) {
          // 走 Link 回绕弧（slot11→拱顶→slot0）
          const u = Math.min(1, o.animT);
          const p = r.arcCurve.getPointAt(u);
          o.mesh.position.set(p.x, p.y + 0.14, p.z);
          if (camRef) o.mesh.lookAt(camRef.position);
          if (o.animT >= 1) o.wrap = false;
        } else {
          const theta = ringSlotAngle(from) + (ringSlotAngle(to) - ringSlotAngle(from)) * k;
          o.mesh.position.set(
            D.ringCommon.center[0] + D.ringCommon.radius * Math.cos(theta),
            r.y + 0.42,
            -D.ringCommon.radius * Math.sin(theta)
          );
          if (o.slat) o.mesh.rotation.y = Math.atan2(Math.cos(theta), -Math.sin(theta));
          else if (camRef) o.mesh.lookAt(camRef.position);
        }
        // 演示卡走完一格即撤（动手台通道）
        if (o.once && o.animT >= 1) {
          r.objs.splice(i, 1);
          if (o.onEnd) o.onEnd();
          continue;
        }
        // 事件卡到 slot6 脱离 → 走走廊
        if (o.evtRide !== undefined && o.animT >= 1 && o.slot === 6 && !o.left) {
          o.left = true;
          r.objs.splice(i, 1);
          if (o.onEnd) o.onEnd(o.mesh);
        }
      }
      // 小旗插值
      r.flagAnimT = Math.min(1, r.flagAnimT + dt / r.stepAnim);
      const fk = r.flagAnimT < 1 ? (r.flagAnimT < 0.5 ? 2 * r.flagAnimT * r.flagAnimT : 1 - Math.pow(-2 * r.flagAnimT + 2, 2) / 2) : 1;
      const fa = ringSlotAngle(r.flagPrev != null ? r.flagPrev : r.flagSlot) + (ringSlotAngle(r.flagSlot) - ringSlotAngle(r.flagPrev != null ? r.flagPrev : r.flagSlot)) * fk;
      const liftY = r.y + 0.2;
      r.flag.position.set(
        D.ringCommon.center[0] + D.ringCommon.radius * Math.cos(fa),
        liftY,
        -D.ringCommon.radius * Math.sin(fa)
      );
    }
  }
  // 环上入卡/出卡/清卡（instant 支持静态落位）
  function ringEnq(rKey, label, slot, accent) {
    const r = rings[rKey];
    if (!r || !particlesOn) return null;
    const card = makeTrbCard(label, 1, accent || "#8fb4ff");
    r.grp.add(card);
    if (!instant) {
      r.objs.push({ mesh: card, slat: false, slot: slot ?? 0, prev: slot ?? 0, animT: 1, cyc: 1 });
    } else {
      const p = ringPoint(r, slot ?? 0);
      card.position.set(p[0], r.y + 0.42, p[2]);
      r.static.push(card);
    }
    return card;
  }
  function ringDeq(rKey) {
    const r = rings[rKey];
    if (!r) return;
    if (instant) {
      const s = r.static.shift();
      if (s) r.grp.remove(s);
      return;
    }
    const card = r.objs.find((x) => !x.slat);
    if (!card) return;
    r.objs.splice(r.objs.indexOf(card), 1);
    dwellFade(card.mesh, 0.15, 0.5, r.grp);
  }
  function ringClear(rKey) {
    const r = rings[rKey];
    if (!r) return;
    if (instant) {
      for (const s of r.static) r.grp.remove(s);
      r.static.length = 0;
      return;
    }
    for (const card of r.objs.filter((x) => !x.slat)) {
      r.objs.splice(r.objs.indexOf(card), 1);
      dwellFade(card.mesh, 0.15, 0.5, r.grp);
    }
  }
  function setRingCruise(on) {
    for (const key of Object.keys(rings)) rings[key].stepDur = on ? D.base("IDLE_STEP") : D.base("STEP");
  }
  function ringFlowEp0() { // F11 演示性流转：EP0 环放一张演示卡
    if (state._flowCard) return;
    state._flowCard = ringEnq("ringEp0", "演示 · TD", 5, "#b9e3ac");
  }

  // ---------- 右区：设备试验盒 ----------
  function buildDevice(g) {
    const shell = E("deviceShell"), sg = D.entityGeo(shell);
    devGroup = new T.Group();
    const shellMat = D.mat("mDevicePlastic");
    const shellMesh = rbox(sg.sx, sg.sy, sg.sz, 0.12, shellMat, sg.cx, sg.cy, sg.cz);
    devGroup.add(shellMesh);
    const cover = E("topCover"), cvg = D.entityGeo(cover);
    const coverMesh = new T.Mesh(new T.BoxGeometry(cvg.sx, cvg.sy, cvg.sz), new T.MeshStandardMaterial({ color: 0xa9cec2, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.26, side: T.DoubleSide, depthWrite: false }));
    coverMesh.position.set(cvg.cx, cvg.cy, cvg.cz);
    devGroup.add(coverMesh);
    // 四态灯排（d07）
    const d07 = D.ref("derived:d07");
    const lampCols = { Powered: D.flatMap.lampPowered, Default: "#e8eef7", Addressed: D.flatMap.driveBlue, Configured: D.flatMap.devGreen };
    d07.centersX.forEach((x, i) => {
      const role = d07.order[i];
      const mm = new T.MeshStandardMaterial({ color: new T.Color(D.flatMap.lampOff), roughness: 0.4, emissive: new T.Color(D.flatMap.lampOff), emissiveIntensity: 0.3 });
      const dome = new T.Mesh(new T.SphereGeometry(d07.r, 16, 12), mm);
      dome.position.set(x, d07.y, d07.z);
      devGroup.add(dome);
      const lbl = plateMesh(role, 0.62, 0.16, { fs: 34, color: "#b9c4ce" });
      lbl.position.set(x, d07.y - 0.4, d07.z + 0.02);
      devGroup.add(lbl);
      devLampDots[role] = { mesh: dome, mat: mm };
    });
    // 收件屏
    const scr = E("deviceScreen"), scg = D.entityGeo(scr);
    const scrMesh = makeScreen("devScreen", scg.sx - 0.06, scg.sy - 0.06, 560, 270, (c, px, py, st) => {
      screenBase(c, px, py, "USB 收件屏", "#86bd7a");
      c.font = `600 44px ${D.MONO}`; c.textAlign = "left"; c.textBaseline = "middle";
      c.fillStyle = "#d7e8cf";
      c.fillText(String(st.devScreen).slice(0, 16), 30, 120);
      c.fillStyle = "#5f7a55"; c.font = `500 26px ${D.MONO}`;
      c.fillText("只见 USB 请求与总线事件", 30, 200);
    });
    scrMesh.position.set(scg.cx, scg.cy, scg.cz + 0.05);
    devGroup.add(scrMesh);
    // 铭牌（Y 翻 180°：正面/背面）
    const np = E("namePlate"), npg = D.entityGeo(np);
    plateFlipG = new T.Group();
    const mkPlateFace = (text, sub) => {
      const c = D.cnv(620, 130), ctx = c.getContext("2d");
      ctx.fillStyle = "#1c231d"; ctx.fillRect(0, 0, 620, 130);
      ctx.strokeStyle = "#3d4a35"; ctx.lineWidth = 4; ctx.strokeRect(4, 4, 612, 122);
      ctx.fillStyle = "#cfe0c4"; ctx.font = `600 52px ${D.MONO}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(text, 310, sub ? 46 : 65);
      if (sub) { ctx.font = `500 24px ${D.MONO}`; ctx.fillStyle = "#8fa383"; ctx.fillText(sub.slice(0, 30), 310, 100); }
      return new T.Mesh(new T.PlaneGeometry(npg.sx - 0.04, npg.sy - 0.04), new T.MeshBasicMaterial({ map: D.texOf(c) }));
    };
    const front = mkPlateFace(np.front, null);
    const back = mkPlateFace(np.back, np.subtitle);
    back.rotation.y = Math.PI;
    plateFlipG.add(front); plateFlipG.add(back);
    plateFlipG.position.set(npg.cx, npg.cy, npg.cz);
    devGroup.add(plateFlipG);
    // 顶灯罩（emissive 换色）
    const dome = E("domeLamp"), dm = D.entityGeo(dome);
    domeMat = new T.MeshStandardMaterial({ color: new T.Color(D.flatMap.lampPowered), roughness: 0.3, emissive: new T.Color("#000000"), emissiveIntensity: 0 });
    domeMat.userData.texRequest = "tex11";
    D.applyTexData(domeMat, "tex11", { skip: ["emissiveMap"] }); // 发光色由工段动画驱动，静态 emissiveMap 不接（S6 设计偏差记录）
    const domeMesh = new T.Mesh(new T.SphereGeometry(dm.radius, 18, 14), domeMat);
    domeMesh.position.set(dm.cx, dm.cy, dm.cz);
    devGroup.add(domeMesh);
    // AO 盘（d20 设备盘，随滑入）
    const ao = D.ref("derived:d20");
    aoDisc(ao.deviceDiskR, ao.deviceDiskPos[0] - sg.cx, 0.02 - (sg.cy - sg.sy / 2), ao.deviceDiskPos[2], devGroup);
    // 设备侧悬垂缆+插头（随设备整体滑入；F1 插头推入后接通全程缆）
    const dangPts = [
      new T.Vector3(sg.cx - sg.sx / 2 + 0.1, 1.2, 0.55),
      new T.Vector3(sg.cx - sg.sx / 2 - 0.6, 0.7, 0.9),
      new T.Vector3(sg.cx - sg.sx / 2 - 1.4, 0.4, 1.0),
    ];
    dangMesh = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(dangPts), 30, 0.09, 10), D.mat("mCableRubber"));
    dangMesh.castShadow = true;
    devGroup.add(dangMesh);
    const plugPts = [
      new T.Vector3(sg.cx - sg.sx / 2 + 0.1, 1.2, 0.55),
      new T.Vector3(sg.cx - sg.sx / 2 - 0.06, 1.2, 0.55),
    ];
    const flange = rbox(0.14, 0.5, 0.5, 0.04, D.mat("mPlugMetal"), sg.cx - sg.sx / 2 + 0.12, 1.2, 0.55);
    devGroup.add(flange);
    for (const dz of [-0.12, 0.12]) {
      const term = cyl(0.035, 0.035, 0.22, D.mat("mPlugMetal"), sg.cx - sg.sx / 2 - 0.02, 1.2, 0.55 + dz, 10);
      term.rotation.z = Math.PI / 2;
      devGroup.add(term);
    }
    plugHead = rbox(0.42, 0.34, 0.34, 0.06, D.mat("mPlugMetal"), sg.cx - sg.sx / 2 - 0.25, 1.2, 0.55);
    plugHead.userData.home = plugHead.position.clone();
    devGroup.add(plugHead);
    devGroup.position.set(0, 0, 0);
    g.add(devGroup);
    root.devGroup = devGroup;
    root.devShellWestFace = sg.cx - sg.sx / 2;
    root.plugPortWorld = new T.Vector3(8.15, 1.8, 0.65);
    root.devPortWorld = new T.Vector3(13.7, 1.2, 0.55);
    setDeviceOffstage(true);
  }
  function setDeviceOffstage(off) {
    const d23 = D.ref("derived:d23");
    state.devIn = !off;
    const target = off ? d23.from[0] : d23.to[0];
    devGroup.position.x = target - 15.4 + 15.4; // 组本体建在世界坐标，平移量=画外差
    devGroup.position.x = off ? d23.from[0] - 15.4 : 0;
    if (off) hideCable();
  }
  function hideCable() {
    if (cableMesh) cableMesh.visible = false;
    if (portPlug) portPlug.visible = false;
    if (portRing) { portRing.visible = false; }
    if (dangMesh) dangMesh.visible = true;
    if (plugHead) { plugHead.visible = true; plugHead.position.copy(plugHead.userData.home); }
    if (waveG) waveG.visible = false;
  }

  // ---------- USB 实体缆（全程管缆+端口侧插头+方波信号段） ----------
  function buildCable(g) {
    const cb = X43D.D.cable;
    cableCurve = new T.CatmullRomCurve3(cb.curve.points.map((p) => new T.Vector3(p[0], p[1], p[2])));
    cableMesh = new T.Mesh(new T.TubeGeometry(cableCurve, 64, cb.curve.tubeRadius, 10), D.mat("mCableRubber"));
    cableMesh.castShadow = true;
    cableMesh.visible = false;
    g.add(cableMesh);
    root.cableLen = cableCurve.getLength(); // d29：运行时按实长排程
    // 端口侧插头（嵌 port1）
    const pp = cb.plugs.port.at;
    portPlug = rbox(0.34, 0.3, 0.3, 0.05, D.mat("mPlugMetal"), pp[0] - 0.1, pp[1], pp[2]);
    portPlug.visible = false;
    g.add(portPlug);
    // 方波信号段（段长 2.2、半周期 0.28、8 齿、振幅 ±0.16、管径 0.055）
    const seg = cb.signal.segment;
    const pts = [];
    const segLen = seg.length;
    const half = seg.halfPeriod;
    let wx = 0, amp = seg.amplitude;
    pts.push(new T.Vector3(0, amp, 0));
    while (wx + half <= segLen) {
      wx += half;
      pts.push(new T.Vector3(wx, amp, 0));
      amp = -amp;
      pts.push(new T.Vector3(wx, amp, 0));
    }
    pts.push(new T.Vector3(segLen, amp, 0));
    const path = new T.CurvePath();
    for (let i = 0; i < pts.length - 1; i++) path.add(new T.LineCurve3(pts[i], pts[i + 1]));
    waveMesh = new T.Mesh(new T.TubeGeometry(path, 120, seg.tubeRadius, 6), new T.MeshBasicMaterial({ color: new T.Color(X43D.D.cable.signal.colors.idle), transparent: true, opacity: 0.9 }));
    const arrows = cb.signal.arrows;
    waveArrowA = new T.Mesh(new T.ConeGeometry(arrows.coneRadius, arrows.coneLength, 10), new T.MeshBasicMaterial({ color: new T.Color(X43D.D.cable.signal.colors.idle) }));
    waveArrowA.rotation.z = -Math.PI / 2;
    waveArrowA.position.set(-0.2, 0, 0);
    waveArrowB = new T.Mesh(new T.ConeGeometry(arrows.coneRadius, arrows.coneLength, 10), new T.MeshBasicMaterial({ color: new T.Color(X43D.D.cable.signal.colors.idle) }));
    waveArrowB.rotation.z = -Math.PI / 2;
    waveArrowB.position.set(segLen + 0.2, 0, 0);
    waveG = new T.Group();
    waveG.add(waveMesh); waveG.add(waveArrowA); waveG.add(waveArrowB);
    waveG.visible = false;
    waveG.userData.len = segLen;
    g.add(waveG);
  }
  // 方波游动（速率 4.5×k；运行时按曲线实长=d29 兜底）
  function waveRun(dir, color, onDone) {
    if (instant || !particlesOn) { if (onDone) onDone(); return; }
    waveG.visible = true;
    const col = new T.Color(color);
    waveMesh.material.color = col;
    waveArrowA.material.color = col;
    waveArrowB.material.color = col;
    movers.push({ wave: { dir, t: 0, dur: root.cableLen / D.base("WAVE_SPEED") }, onDone });
  }
  function waveIdleStart() {
    if (instant || !particlesOn) return;
    waveG.visible = true;
    const col = new T.Color(X43D.D.cable.signal.colors.idle);
    waveMesh.material.color = col;
    waveArrowA.material.color = col;
    waveArrowB.material.color = col;
    if (!movers.some((m) => m.idleWave)) movers.push({ idleWave: { t: 0 } });
  }
  function updateWave(dt) {
    // 空闲微光慢漂（有传输方波时让位）
    const waveActive = movers.some((x) => x.wave);
    for (let i = movers.length - 1; i >= 0; i--) {
      const m = movers[i];
      if (m.idleWave) {
        if (waveActive) continue;
        m.idleWave.t += dt * 0.4;
        const u = 0.08 + (Math.sin(m.idleWave.t) * 0.5 + 0.5) * 0.5;
        placeWaveAt(u, 1);
        continue;
      }
      if (m.wave) {
        m.wave.t += dt / m.wave.dur;
        const k = Math.min(m.wave.t, 1);
        const u = m.wave.dir > 0 ? 0.06 + k * 0.88 : 0.94 - k * 0.88;
        placeWaveAt(u, m.wave.dir);
        if (m.wave.t >= 1) {
          movers.splice(i, 1);
          waveG.visible = false;
          if (m.onDone) m.onDone();
        }
      }
    }
  }
  function placeWaveAt(u, dir) {
    const uC = Math.min(Math.max(u, 0), 1);
    const p = cableCurve.getPointAt(uC);
    const tan = cableCurve.getTangentAt(uC);
    waveG.position.set(p.x, p.y + 0.18, p.z);
    // 本地 +X=前进向：θ = atan2(−tz·dir, tx·dir)
    waveG.rotation.set(0, Math.atan2(-tan.z * dir, tan.x * dir), 0);
  }

  // ---------- 空中走廊 ----------
  function corridorAssertions() {
    // 单口径（主会话 2026-11-10 裁定 a，scene.dsl.json corridor.assertions 已随 S3 补丁落地）：
    // 爬升段=自起点至净距首次 ≥1.2 wu 之处（只要求 y 单调上升）；巡航段=自该点起至落地 ≥1.2 wu；
    // 全局=全程 y≥4.0 + 西行段（x≤−7.5）方允许降高。
    const pts = [];
    const N = 220;
    const arc = corridorCurve.getLength();
    for (let i = 0; i <= N; i++) pts.push(corridorCurve.getPointAt(i / N));
    let distOk = true, yMono = true, yGlobal = true, descentOk = true;
    let clearArc = 0, climbArc = 0;
    let accLen = 0;
    for (let i = 1; i < pts.length; i++) {
      accLen += pts[i].distanceTo(pts[i - 1]);
      const p = pts[i];
      let best = 1e9;
      for (const rd of RING_DEFS) {
        const dx = p.x - D.ringCommon.center[0], dz = p.z - D.ringCommon.center[1];
        const dr = Math.sqrt(dx * dx + dz * dz);
        const gap = Math.abs(dr - D.ringCommon.radius);
        const dy = Math.abs(p.y - rd.y);
        const dist = Math.sqrt(gap * gap + dy * dy) - D.ringCommon.tubeRadius;
        if (dist < best) best = dist;
      }
      const climbing = clearArc === 0;
      if (climbing) {
        climbArc = accLen;
        if (pts[i].y < pts[i - 1].y - 1e-4) yMono = false; // 爬升段 y 单调上升
        if (best >= 1.2) clearArc = accLen; // 爬升段终点=巡航段起点
      } else if (best < 1.2 - 1e-6) {
        distOk = false; // 巡航段 ≥1.2 wu
      }
      if (p.y < 4.0 - 1e-6) yGlobal = false;
      if (p.x > -7.5 && i > 1 && pts[i - 1].y - p.y > 0.02) descentOk = false; // 未过西线就降高（采样容差 0.02 wu）
    }
    return { arcLen: Math.round(arc * 100) / 100, clearArc: Math.round(clearArc * 100) / 100, climbArc: Math.round(climbArc * 100) / 100, distOk, yMono, yGlobal, descentOk, pass: distOk && yMono && yGlobal && descentOk };
  }

  // ---------- FX：DMA 光束/中断闪线/轮询滑车/AO/走廊卡链 ----------
  function buildFx(g) {
    const ib = E("irqFlashLine");
    const a = ib.from, b = D.ref(ib.to);
    const va = new T.Vector3(a[0], a[1], a[2]), vb = new T.Vector3(b[0], b[1], b[2]);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    irqMesh = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, len, 6, 1, true), new T.MeshBasicMaterial({ color: new T.Color(ib.color), transparent: true, opacity: 0 }));
    irqMesh.position.copy(va).addScaledVector(dir, 0.5);
    irqMesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.clone().normalize());
    irqMesh.visible = false;
    g.add(irqMesh);
    root.irqLine = { a: va, b: vb };
    // 轮询滑车（同线滑行读取）
    pollTrolley = new T.Group();
    pollTrolley.add(box(0.16, 0.1, 0.1, new T.MeshStandardMaterial({ color: new T.Color(ib.color), roughness: 0.4, emissive: new T.Color(ib.color), emissiveIntensity: 0.4 }), 0, 0, 0));
    pollTrolley.visible = false;
    g.add(pollTrolley);
  }
  function irqFlashRun() {
    if (instant || !particlesOn || !irqMesh) return;
    irqMesh.visible = true;
    movers.push({ mesh: irqMesh, irq: { t: 0, dur: D.dur("IRQ_FLASH") * 3 } }); // 0.25s×3 次/事件
  }
  function pollTrolleyRun() {
    if (instant || !particlesOn) return;
    pollTrolley.visible = true;
    movers.push({ trolley: { t: 0, dur: D.dur("POLL_TROLLEY") } });
  }
  function dmaBeamRun(from, to, dur) {
    if (instant || !particlesOn) return;
    const v0 = from.clone ? from.clone() : new T.Vector3(from[0], from[1], from[2]);
    const v1 = to.clone ? to.clone() : new T.Vector3(to[0], to[1], to[2]);
    const dir = v1.clone().sub(v0);
    const len = dir.length();
    const cylM = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, len, 8, 1, true), new T.MeshBasicMaterial({ color: new T.Color(D.flatMap.dmaBlue), transparent: true, opacity: 0 }));
    cylM.position.copy(v0).addScaledVector(dir, 0.5);
    cylM.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.clone().normalize());
    const dot = new T.Mesh(new T.SphereGeometry(0.12, 12, 10), new T.MeshBasicMaterial({ color: 0x9dbcf5 }));
    dot.position.copy(v0);
    root.group.add(cylM); root.group.add(dot);
    movers.push({ mesh: cylM, beam: { from: v0, to: v1, dot, t: 0, dur }, rm: true, extra: dot });
  }
  const usePoints = () => D.ref("derived:d25");

  // ---------- 流转卡（画布 540×224、标题 36px、小标 28px「起 ▸ … ｜ 终 ▸ …」） ----------
  function makeFlowCard(label, from, to, bg, fg) {
    const c = D.cnv(540, 224), ctx = c.getContext("2d");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 540, 224);
    ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 5; ctx.strokeRect(5, 5, 530, 214);
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    const lines = String(label).split("·").map((s) => s.trim()).slice(0, 2);
    ctx.fillStyle = fg; ctx.font = `600 36px ${D.MONO}`;
    lines.forEach((ln, i) => ctx.fillText(ln, 24, 40 + i * 44));
    ctx.font = `600 28px ${D.MONO}`;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    const route = `起 ▸ ${from || "…"} ｜ 终 ▸ ${to || "…"}`;
    ctx.fillText(route.slice(0, 24), 24, 150);
    if (route.length > 24) ctx.fillText(route.slice(24, 48), 24, 190);
    const tex = D.texOf(c);
    const face = new T.MeshBasicMaterial({ map: tex });
    const side = new T.MeshStandardMaterial({ color: bg, roughness: 0.6 });
    const m = new T.Mesh(new T.BoxGeometry(1.52, 0.66, 0.02), [side, side, side, side, face, side]);
    m.castShadow = true;
    m.userData.flow = true;
    return m;
  }
  function makeCard(label, w, h, bg, fg) {
    const c = D.cnv(256, 96), ctx = c.getContext("2d");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 256, 96);
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 4; ctx.strokeRect(4, 4, 248, 88);
    ctx.fillStyle = fg; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `600 28px ${D.MONO}`;
    const lines = String(label).split("·").map((s) => s.trim());
    if (lines.length <= 2) lines.forEach((ln, i) => ctx.fillText(ln.slice(0, 14), 128, lines.length === 1 ? 48 : 34 + i * 30));
    else { ctx.font = `600 22px ${D.MONO}`; lines.forEach((ln, i) => ctx.fillText(ln.slice(0, 14), 128, 20 + i * 26)); }
    const tex = D.texOf(c);
    const side = new T.MeshStandardMaterial({ color: bg, roughness: 0.6 });
    const m = new T.Mesh(new T.BoxGeometry(w, h, 0.02), [side, side, side, side, new T.MeshBasicMaterial({ map: tex }), new T.MeshBasicMaterial({ map: tex })]);
    m.castShadow = true;
    return m;
  }
  function flyAlong(mesh, pts, dur, onDone, arc) {
    if (instant || !particlesOn) { if (onDone) onDone(); return; }
    const curve = new T.CatmullRomCurve3(pts.map((p) => new T.Vector3(p[0], p[1], p[2])));
    movers.push({ mesh, curve, t: 0, dur, onDone, arc: arc || 0, rm: true });
    mesh.visible = true;
  }
  function dwellFade(mesh, holdSec, fadeSec, parent) {
    movers.push({ mesh, dwell: holdSec, fadeDur: fadeSec, t: 0, rm: true, parent: parent || root.group });
  }

  // 事件卡全链：事件环 slot1 入 → 步进 5 格 → slot6 脱离 → 走廊 → 悬浮点 → 落点 d15 → hold → fade
  function evCard(o) {
    const label = (o && o.label) || "事件";
    const alarm = label.indexOf("Parameter Error") >= 0 || label.indexOf("参数错误") >= 0;
    if (instant || !particlesOn) { if (o && o.toDesk) receiptsBump(); return; }
    const card = makeFlowCard(label, o && o.from, o && o.to, alarm ? D.flatMap.alarmRed : D.flatMap.hcAmber, alarm ? "#2b0808" : "#241503");
    root.group.add(card);
    const r = rings.ringEvt;
    const startSlot = 1;
    const p = ringPoint(r, startSlot);
    card.position.set(p.x, r.y + 0.42, p.z);
    const finish = () => {
      const p6 = ringPoint(r, 6);
      const hover = corridorCurve.getPointAt(1);
      const land = D.ref(X43D.D.corridor.landingTarget);
      const mid1 = corridorCurve.getPointAt(0.35);
      const mid2 = corridorCurve.getPointAt(0.75);
      flyAlong(card, [
        [p6.x, r.y + 0.42, p6.z],
        [mid1.x, mid1.y, mid1.z], [mid2.x, mid2.y, mid2.z],
        [hover.x, hover.y, hover.z],
      ], D.dur("FLY_WALK"), () => {
        // 悬浮点 → 落点（CORRIDOR_LAND）→ 开匣+ERDP 推进 → HOLD → FADE
        flyAlong(card, [[hover.x, hover.y, hover.z], [land[0], land[1] + 0.1, land[2]]], D.dur("CORRIDOR_LAND"), () => {
          if (o && o.toDesk) receiptsBump();
          openEventBox();
          dwellFade(card, D.dur("HOLD"), D.dur("FADE"));
        });
      });
    };
    r.objs.push({ mesh: card, slat: false, slot: startSlot, prev: startSlot, animT: 1, evtRide: true, onEnd: finish });
  }
  function openEventBox() {
    if (instant) { eventBoxLid.rotation.x = -1.5; erdpAdvance(); return; }
    movers.push({ lid: { t: 0, dur: D.ref("derived:d14") } });
  }
  function receiptsBump() {
    state.receipts += 1;
  }

  // ---------- 动作集（DSL moves 的 do 名 → 实现；movers 库，主线+动手台共用） ----------
  const A = {
    // F1
    deviceSlideIn() {
      state.devIn = true;
      if (instant) { setDeviceOffstage(false); return; }
      movers.push({ slide: { t: 0, dur: D.dur("DEV_SLIDE_IN") } });
    },
    plugPush() {
      if (cableMesh && cableMesh.visible) return;
      state.devIn = true;
      if (instant) {
        if (dangMesh) dangMesh.visible = false;
        if (plugHead) plugHead.visible = false;
        if (cableMesh) cableMesh.visible = true;
        if (portPlug) portPlug.visible = true;
        if (portRing) portRing.visible = true;
        return;
      }
      movers.push({ plug: { t: 0, dur: D.dur("PLUG_PUSH") } });
    },
    portLight() {
      if (portRing) { portRing.visible = true; portRing.material.emissiveIntensity = 0.9; }
    },
    triggerPull() {
      if (instant) { triggerLever.rotation.z = -0.9; return; }
      movers.push({ trigger: { t: 0, dur: D.dur("TRIGGER_PULL") } });
    },
    portFlags(f) { Object.assign(state.flags, f); repaint("portscUsb2"); },
    pls(o) { state.pls = o.v; repaint("portscUsb2"); },
    speed(o) { state.speed = o.v; repaint("portscUsb2"); },
    // F2
    lineFlash() {
      if (instant || !particlesOn) return;
      movers.push({ lineFlash: { t: 0, dur: D.dur("LINE_FLASH") } });
    },
    buttonPress() {
      if (instant) { pressBtn(root.resetBtnBtn); return; }
      movers.push({ resetPress: { t: 0, dur: D.dur("RESET_PRESS") } });
    },
    // F3
    signalQuad(o) {
      const order = (o && o.order) || ["PRC=1", "PED=1", "PR=0", "PLS=U0"];
      const map = { "PRC=1": { prc: 1 }, "PED=1": { ped: 1 }, "PR=0": { pr: 0 }, "PLS=U0": null };
      const iv = D.dur("SIG_INTERVAL");
      order.forEach((sig, i) => {
        setTimeout(() => {
          if (sig === "PLS=U0") A.pls({ v: "U0" });
          else A.portFlags(map[sig]);
        }, (instant ? 0 : i * iv * 1000));
      });
    },
    breathe() {
      if (instant) return;
      breathe3T = 0; // 3 周期正弦包络
    },
    // F4
    cmdFly(o) {
      const label = (o && o.card) || "命令单";
      const from = root.printerTop;
      const to = ringPoint(rings.ringCmd, 7);
      if (instant || !particlesOn) { ringEnq("ringCmd", label, 7, "#8fb4ff"); return; }
      const card = makeCard(label, 1.0, 0.4, "#ece7da", "#1c2b52");
      root.group.add(card);
      flyAlong(card, [
        [from.x, from.y, from.z],
        [(from.x + to.x) / 2, Math.max(from.y, to.y) + 1.2, (from.z + to.z) / 2],
        [to.x, to.y + 0.42, to.z],
      ], D.dur("CMD_FLY"), () => {
        root.group.remove(card);
        ringEnq("ringCmd", label, 7, "#8fb4ff");
      });
    },
    bellPress(o) {
      const role = (o && o.target === "bell1") ? 1 : 0;
      if (instant) { pressKnob(role); return; }
      bells.press[role] = 1; // 压下+回弹（BELL_PRESS）
      const knob = bells.knobs[role];
      if (knob) knob.userData.pressT = 0;
    },
    drawerPick() {
      if (instant) { root.drawerGrp.position.z = root.drawerHome.z; state.dcbaa = 1; return; }
      movers.push({ drawer: { t: 0, dur: D.dur("DRAWER_PICK") } });
    },
    gridHang() {
      if (instant) { outctxCard.visible = true; state.dcbaa = 1; return; }
      const from = root.formAnchor;
      const to = root.cell1Pos;
      const m = box(0.55, 0.1, 0.36, D.mat("mCardPaper"), from.x, from.y + 0.2, from.z + 0.3);
      root.group.add(m);
      flyAlong(m, [
        [from.x, from.y + 0.2, from.z + 0.3],
        [(from.x + to.x) / 2, Math.max(from.y, to.y) + 2.4, (from.z + to.z) / 2 + 0.6],
        [to.x, to.y, to.z],
      ], D.dur("GRID_HANG"), () => {
        root.group.remove(m);
        outctxCard.visible = true;
        state.dcbaa = 1;
      });
    },
    lampSwitch(o) {
      const t = (o && o.target) || "";
      if (t.indexOf("slotLampRow") >= 0 || t.indexOf("槽") >= 0) {
        const m = t.match(/([A-Za-z]+)→([A-Za-z]+)/) || t.match(/:\s*(\w+)→(\w+)/);
        const to = m ? m[2] : (o && o.to) || "Enabled";
        setSlotLamp(to);
      }
      if (t.indexOf("deviceLampRow") >= 0 || t.indexOf("设备") >= 0) {
        const m = t.match(/([A-Za-z]+)→([A-Za-z]+)/);
        const to = m ? m[2] : (o && o.to) || "Default";
        setDevLamp(to);
      }
    },
    dcbaaWindowOn() {
      if (dcbaaWindow) dcbaaWindow.material.emissiveIntensity = 1.2;
    },
    // F5
    tickCheck(o) {
      state.formFilled = Math.max(state.formFilled, 2);
      repaint("form");
    },
    cellFill(o) {
      state.formFilled += (o && o.cells && o.cells.length) || 1;
      repaint("form");
    },
    ringMount() {
      epMounted = true;
      dcbaaBeam.visible = true;
      if (instant) return;
      movers.push({ mount: { t: 0, dur: D.dur("RING_MOUNT") } });
    },
    dcbaaNote() { state.dcbaa = 1; },
    // F6
    bsrTurn(o) {
      const to = (o && o.to) || "0";
      state.bsr = to;
      bsrTarget = to === "1" ? -1.1 : 0;
      if (instant) bsrGrp.rotation.y = bsrTarget;
    },
    ticketEast(o) {
      const text = (o && o.text) || "USB 请求";
      state.devScreen = text;
      repaint("devScreen");
      waveRun(1, X43D.D.cable.signal.colors.east);
      if (instant || !particlesOn) return;
      const m = makeFlowCard(text, "xHC · 端口 1", "设备 · 收件屏", D.flatMap.devGreen, "#12240e");
      root.group.add(m);
      flyAlong(m, [
        [8.2, 2.2, 0.8], [9.8, 1.6, 1.1], [11.2, 1.3, 1.1], [12.6, 1.5, 0.9], [13.55, 1.35, 0.6],
      ], root.cableLen / D.base("WAVE_SPEED"), () => {
        dwellFade(m, Math.max(1.0, D.dur("HOLD") * 0.5), D.dur("FADE") * 0.7);
      });
    },
    ticketWest(o) {
      const text = (o && o.text) || "数据";
      waveRun(-1, X43D.D.cable.signal.colors.west);
      if (instant || !particlesOn) return;
      const m = makeFlowCard(text, "设备", "xHC → 托盘", D.flatMap.devGreen, "#12240e");
      root.group.add(m);
      flyAlong(m, [
        [13.55, 1.35, 0.6], [12.6, 1.5, 0.9], [11.2, 1.3, 1.1], [9.8, 1.6, 1.1], [8.3, 2.1, 0.8],
      ], root.cableLen / D.base("WAVE_SPEED"), () => {
        dwellFade(m, Math.max(1.0, D.dur("HOLD") * 0.5), D.dur("FADE") * 0.7);
      });
    },
    domeColor(o) {
      const inten = (o && o.emissive) || 1.9;
      if (instant) { domeMat.emissive.set(new T.Color(D.flatMap.devGreen)); domeMat.emissiveIntensity = inten / 3; return; }
      movers.push({ dome: { t: 0, dur: D.dur("DOME_COLOR"), inten } });
    },
    plateFlip() {
      if (instant) { plateFlipG.rotation.y = Math.PI; return; }
      movers.push({ plateFlip: { t: 0, dur: D.dur("PLATE_FLIP"), from: plateFlipG.rotation.y, to: plateFlipG.rotation.y + Math.PI } });
    },
    flipHold() { /* 时序由 stages 编译排入（停留防背面镜像） */ },
    mpsFlash() {
      state.mps = "8";
      if (instant) return;
      movers.push({ mpsFlash: { t: 0, dur: D.ref("derived:d14") } });
    },
    // F7
    gateLight() {
      fsGateGrp.userData.lit = true;
      fsGateGrp.traverse((o) => { if (o.material && o.material.emissive) { o.material.emissive = new T.Color(D.flatMap.devGreen); o.material.emissiveIntensity = 0.5; } });
    },
    dmaBeam(o) {
      const up = usePoints();
      const toEp0 = o && o.to === "ep0";
      const seg = toEp0 ? up.f7Write : up.f4Cmd;
      dmaBeamRun(seg.from, seg.to, D.dur("DMA_BEAM"));
    },
    trbPlace(o) {
      const cards = (o && o.cards) || [];
      const slotOf = ["Setup", "Data", "Status"];
      cards.forEach((label, i) => {
        const slot = 5 + i;
        const short = String(label).split("「")[0] || slotOf[i];
        const fields = String(label).indexOf("「") >= 0 ? "·" + String(label).split("「")[1].split("」")[0] : "";
        const place = () => ringEnq("ringEp0", short + fields.replace(/·/g, "·"), slot, "#b9e3ac");
        if (instant) { place(); return; }
        setTimeout(place, i * D.dur("TRB_PLACE") * 1000);
      });
    },
    dmaFlash() {
      const up = usePoints();
      dmaBeamRun(up.f7Reply.from, up.f7Reply.to, D.dur("DMA_BEAM") * 0.6);
    },
    trayPop() {
      if (instant) return;
      movers.push({ trayPop: { t: 0, dur: D.dur("TRAY_POP") } });
    },
    // F9
    tdFast() {
      ringEnq("ringEp0", "GET_DESC·完整", 5, "#b9e3ac");
    },
    inboxStack() {
      if (instant) { stackDesc(2); return; }
      for (let i = 0; i < 2; i++) {
        setTimeout(() => stackDesc(1), i * D.dur("INBOX_STACK") * 1000);
      }
    },
    // F10
    dualFly(o) {
      const lanes = (o && o.lanes) || [];
      if (instant || !particlesOn) return;
      lanes.forEach((ln, i) => {
        const zOff = ln.zOffset || 0.8 + i * 0.4;
        if (ln.route === "cable east") {
          const m = makeCard(ln.card.split("（")[0], 1.0, 0.4, D.flatMap.devGreen, "#12240e");
          root.group.add(m);
          flyAlong(m, [
            [8.2, 2.2 + zOff * 0.3, 0.8 + zOff * 0.3], [10.5, 1.5 + zOff * 0.3, 1.1 + zOff * 0.2], [13.4, 1.5, 0.7],
          ], D.dur("DUAL_FLY"), () => dwellFade(m, 1.0, D.dur("FADE") * 0.7));
          waveRun(1, X43D.D.cable.signal.colors.east);
        } else {
          const from = root.printerTop;
          const to = ringPoint(rings.ringCmd, 7);
          const m = makeCard(ln.card.split("（")[0], 1.0, 0.4, "#ece7da", "#1c2b52");
          root.group.add(m);
          flyAlong(m, [
            [from.x, from.y, from.z],
            [(from.x + to.x) / 2, Math.max(from.y, to.y) + 0.4 + zOff, (from.z + to.z) / 2 + zOff * 0.4],
            [to.x, to.y + 0.42, to.z],
          ], D.dur("DUAL_FLY"), () => {
            root.group.remove(m);
            ringEnq("ringCmd", ln.card.split("（")[0], 7, "#8fb4ff");
          });
        }
      });
    },
    epSlotsAllLit() {
      state.epSlotsLit = 1;
      const r = rings.ringEp0;
      r.slats.forEach((s, i) => { if (i !== 0) s.material.emissive = new T.Color(D.flatMap.devGreen), s.material.emissiveIntensity = 0.35; });
    },
    // F11
    ringFlow() { ringFlowEp0(); },
    // 常驻态
    waveIdle() { waveIdleStart(); },
    ringIdleCruise() { setRingCruise(true); },
    dmaBeamIdle() {
      const up = usePoints();
      if (movers.some((m) => m.idleBeam)) return;
      const v0 = new T.Vector3(up.f4Cmd.from[0], up.f4Cmd.from[1], up.f4Cmd.from[2]);
      const v1 = new T.Vector3(up.f4Cmd.to[0], up.f4Cmd.to[1], up.f4Cmd.to[2]);
      const dir = v1.clone().sub(v0);
      const m = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, dir.length(), 6, 1, true), new T.MeshBasicMaterial({ color: new T.Color(D.flatMap.dmaBlue), transparent: true, opacity: 0.1 }));
      m.position.copy(v0).addScaledVector(dir, 0.5);
      m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.clone().normalize());
      root.group.add(m);
      movers.push({ idleBeam: { mesh: m } });
    },
    lampBreath() { /* 常驻：update() 内 LAMP_BREATH 正弦 */ },
    // 事件
    evCard,
    irqFlash() { irqFlashRun(); },
    pollTrolley() { pollTrolleyRun(); },
    slip(o) { /* 试错用空表格卡 */ 
      const label = (o && o.label) || "Address Device · 输入上下文为空";
      state.formFilled = 0;
      repaint("form");
      A.cmdFly({ card: label });
    },
    blankForm() { state.formFilled = 0; repaint("form"); },
  };
  function setSlotLamp(v) {
    state.slotLamp = v;
    for (const L of root.slotLamps || []) {
      if (!L.dual) {
        const on = L.role === v;
        L.mat.color.set(new T.Color(on ? { Default: "#e8eef7", Addressed: D.flatMap.driveBlue, Configured: D.flatMap.devGreen }[L.role] || D.flatMap.lampOff : D.flatMap.lampOff));
        L.mat.emissive.set(new T.Color(on ? L.mat.color.getHex() : D.flatMap.lampOff));
      } else {
        // 双色灯第一芯灰/第二芯琥珀
        const on = v === "Enabled";
        L.mat.color.set(new T.Color(v === "Disabled" ? D.flatMap.slotLampDisabled : on ? D.flatMap.hcAmber : D.flatMap.lampOff));
        L.mat.emissive.set(new T.Color(L.mat.color.getHex()));
      }
    }
  }
  function setDevLamp(v) {
    state.dev = v;
    for (const k of Object.keys(devLampDots)) {
      const on = state.dev === k;
      const dot = devLampDots[k];
      const cols = { Powered: D.flatMap.lampPowered, Default: "#e8eef7", Addressed: D.flatMap.driveBlue, Configured: D.flatMap.devGreen };
      dot.mat.color.set(new T.Color(on ? cols[k] : D.flatMap.lampOff));
      dot.mat.emissive.set(new T.Color(on ? cols[k] : "#000000"));
      dot.mat.emissiveIntensity = on ? 0.9 : 0;
    }
  }
  function pressKnob(role) {
    const k = bells.knobs[role];
    if (k) { k.userData.pressT = 0; }
  }
  function pressBtn(btn) {
    if (btn) btn.position.y = 0.08;
  }
  function stackDesc(n) {
    for (let i = 0; i < n; i++) {
      const c = box(0.9, 0.06, 0.55, D.mat("mCardPaper"), root.inboxTop.x + (descCards.length % 2 - 0.5) * 0.18, root.inboxTop.y + descCards.length * 0.07, root.inboxTop.z);
      root.group.add(c);
      descCards.push(c);
    }
    state.devScreen = "描述符数据已交付";
    repaint("devScreen");
  }

  // ---------- 每帧 ----------
  function update(dt, elapsed) {
    updateRings(dt);
    updateWave(dt);
    // 灯池呼吸（LAMP_BREATH ±8% 正弦）
    const bp = D.base("LAMP_BREATH");
    const breathK = 1 + Math.sin((elapsed % bp) / bp * Math.PI * 2) * 0.08;
    root.lampPools.forEach((L, i) => { L.intensity = root.lampBreathBase[i] * breathK; });
    // 门铃按压回弹
    for (const roleStr of Object.keys(bells.knobs)) {
      const role = Number(roleStr);
      const kgrp = bells.knobs[role];
      if (kgrp.userData.pressT !== undefined) {
        kgrp.userData.pressT += dt / D.dur("BELL_PRESS");
        const t = kgrp.userData.pressT;
        const dip = t < 0.5 ? t * 2 : (1 - t) * 2;
        kgrp.children[1].position.y = 0.12 - dip * 0.06;
        if (t >= 1) { kgrp.children[1].position.y = 0.12; delete kgrp.userData.pressT; }
      }
      // L1 引导呼吸高亮（bell1）
      if (kgrp.userData.guide && kgrp.userData.guideOn) {
        const cap = kgrp.children[2];
        cap.material.emissiveIntensity = 0.5 + Math.abs(Math.sin(elapsed * 3.2)) * 0.9;
      }
    }
    // 复位按钮按压
    if (root.resetBtnBtn && root.resetBtnBtn.position.y < 0.14) {
      root.resetBtnBtn.position.y = Math.min(0.14, root.resetBtnBtn.position.y + dt * 0.5);
    }
    // BSR 旋钮拧动
    if (bsrGrp && Math.abs(bsrGrp.rotation.y - bsrTarget) > 0.01) {
      bsrGrp.rotation.y += Math.sign(bsrTarget - bsrGrp.rotation.y) * Math.min(dt / D.dur("BSR_TURN") * 1.2, Math.abs(bsrTarget - bsrGrp.rotation.y));
    }
    // 扳机拉线
    if (triggerLever) {
      for (let i = movers.length - 1; i >= 0; i--) {
        const m = movers[i];
        if (m.trigger) {
          m.trigger.t += dt / m.trigger.dur;
          const k = Math.min(m.trigger.t, 1);
          triggerLever.rotation.z = 0.9 - 1.8 * Math.sin(k * Math.PI);
          if (m.trigger.t >= 1) { triggerLever.rotation.z = 0.9; movers.splice(i, 1); }
        }
      }
    }
    // 呼吸灯 3 周期
    if (breathe3T >= 0) {
      breathe3T += dt;
      const total = D.dur("BREATHE_3CYC");
      if (portRing && portRing.visible) {
        portRing.material.emissiveIntensity = 0.3 + Math.abs(Math.sin(breathe3T / total * Math.PI * 3)) * 1.5;
      }
      if (breathe3T >= total) {
        breathe3T = -1;
        if (portRing) portRing.material.emissiveIntensity = 0.9;
      }
    }
    // movers 主循环
    for (let i = movers.length - 1; i >= 0; i--) {
      const m = movers[i];
      if (m.slide) {
        m.slide.t += dt / m.slide.dur;
        const k = Math.min(m.slide.t, 1);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        const d23 = D.ref("derived:d23");
        const x0 = d23.from[0] - 15.4, x1 = 0;
        devGroup.position.x = x0 + (x1 - x0) * e;
        if (m.slide.t >= 1) { devGroup.position.x = 0; movers.splice(i, 1); }
        continue;
      }
      if (m.plug) {
        m.plug.t += dt / m.plug.dur;
        const k = Math.min(m.plug.t, 1);
        const d24 = D.ref("derived:d24");
        const home = plugHead.userData.home;
        const tgt = root.plugPortWorld.clone().sub(devGroup.position);
        plugHead.position.lerpVectors(home, tgt, k);
        plugHead.position.y += Math.sin(k * Math.PI) * d24;
        if (m.plug.t >= 1) {
          dangMesh.visible = false;
          plugHead.visible = false;
          cableMesh.visible = true;
          portPlug.visible = true;
          portRing.visible = true;
          movers.splice(i, 1);
        }
        continue;
      }
      if (m.beam) {
        const b = m.beam;
        b.t += dt / b.dur;
        const k = Math.min(b.t, 1);
        m.mesh.material.opacity = Math.sin(Math.PI * Math.min(k, 1)) * 0.6;
        const u = k < 0.5 ? k * 2 : (1 - k) * 2;
        b.dot.position.lerpVectors(b.from, b.to, u);
        if (b.t >= 1) { root.group.remove(m.mesh); root.group.remove(b.dot); movers.splice(i, 1); }
        continue;
      }
      if (m.irq) {
        m.irq.t += dt / m.irq.dur;
        const k = Math.min(m.irq.t, 1);
        m.mesh.material.opacity = (0.18 + Math.abs(Math.sin(k * Math.PI * 9)) * 0.72) * Math.sin(Math.PI * k);
        if (m.irq.t >= 1) { m.mesh.visible = false; m.mesh.material.opacity = 0; movers.splice(i, 1); }
        continue;
      }
      if (m.trolley) {
        m.trolley.t += dt / m.trolley.dur;
        const k = Math.min(m.trolley.t, 1);
        pollTrolley.position.lerpVectors(root.irqLine.a, root.irqLine.b, k);
        if (m.trolley.t >= 1) { pollTrolley.visible = false; movers.splice(i, 1); }
        continue;
      }
      if (m.lineFlash) {
        m.lineFlash.t += dt / m.lineFlash.dur;
        const k = Math.min(m.lineFlash.t, 1);
        // 读线闪：状态窗→USB2 屏 的临时亮线
        if (!m.fl) {
          const a = root.statusWinPos, b = new T.Vector3(1.8, 6.8, 2.4);
          const dir = b.clone().sub(a);
          const l = new T.Mesh(new T.CylinderGeometry(0.018, 0.018, dir.length(), 6, 1, true), new T.MeshBasicMaterial({ color: new T.Color(D.flatMap.driveBlue), transparent: true, opacity: 0 }));
          l.position.copy(a).addScaledVector(dir, 0.5);
          l.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.clone().normalize());
          root.group.add(l);
          m.fl = l;
        }
        m.fl.material.opacity = Math.sin(Math.PI * k) * 0.8;
        if (m.lineFlash.t >= 1) { root.group.remove(m.fl); movers.splice(i, 1); }
        continue;
      }
      if (m.resetPress) {
        m.resetPress.t += dt / m.resetPress.dur;
        const k = Math.min(m.resetPress.t, 1);
        root.resetBtnBtn.position.y = 0.14 - Math.sin(k * Math.PI) * 0.06;
        if (m.resetPress.t >= 1) { root.resetBtnBtn.position.y = 0.14; movers.splice(i, 1); }
        continue;
      }
      if (m.drawer) {
        m.drawer.t += dt / m.drawer.dur;
        const k = Math.min(m.drawer.t, 1);
        root.drawerGrp.position.z = root.drawerHome.z + Math.sin(Math.min(k * 2, 1) * Math.PI) * 0.5;
        if (m.drawer.t >= 0.5 && !m.picked) { m.picked = true; }
        if (m.drawer.t >= 1) { root.drawerGrp.position.z = root.drawerHome.z; movers.splice(i, 1); }
        continue;
      }
      if (m.mount) {
        m.mount.t += dt / m.mount.dur;
        const k = Math.min(m.mount.t, 1);
        rings.ringEp0.grp.position.y = -(1 - k) * 0.6; // 中层横梁旋出上架（RING_MOUNT）
        if (m.mount.t >= 1) { rings.ringEp0.grp.position.y = 0; movers.splice(i, 1); }
        continue;
      }
      if (m.lid) {
        m.lid.t += dt / m.lid.dur;
        const k = Math.min(m.lid.t, 1);
        eventBoxLid.rotation.x = -1.5 * k; // 开匣（d14 微动作档）
        if (m.lid.t >= 1) { erdpAdvance(); movers.splice(i, 1); }
        continue;
      }
      if (m.mpsFlash) {
        m.mpsFlash.t += dt / m.mpsFlash.dur;
        const k = Math.min(m.mpsFlash.t, 1);
        // MPS 格翻新高亮：表格卡 MPS 格闪两拍
        const s = screens.form;
        if (s) {
          s.ctx.fillStyle = `rgba(217,168,96,${0.35 * Math.abs(Math.sin(k * Math.PI * 2))})`;
          s.ctx.fillRect(216, 254, 210, 34);
          s.tex.needsUpdate = true;
        }
        if (m.mpsFlash.t >= 1) { repaint("form"); movers.splice(i, 1); }
        continue;
      }
      if (m.dome) {
        m.dome.t += dt / m.dome.dur;
        const k = Math.min(m.dome.t, 1);
        domeMat.emissive.set(new T.Color(k < 0.5 ? D.flatMap.lampPowered : D.flatMap.devGreen));
        domeMat.emissiveIntensity = (m.dome.inten / 3) * k;
        if (m.dome.t >= 1) movers.splice(i, 1);
        continue;
      }
      if (m.plateFlip) {
        m.plateFlip.t += dt / m.plateFlip.dur;
        const k = Math.min(m.plateFlip.t, 1);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        plateFlipG.rotation.y = m.plateFlip.from + (m.plateFlip.to - m.plateFlip.from) * e;
        if (m.plateFlip.t >= 1) { plateFlipG.rotation.y = m.plateFlip.to; movers.splice(i, 1); }
        continue;
      }
      if (m.trayPop) {
        m.trayPop.t += dt / m.trayPop.dur;
        const k = Math.min(m.trayPop.t, 1);
        tray8Grp.position.y = (m.trayPop.baseY !== undefined ? m.trayPop.baseY : (m.trayPop.baseY = tray8Grp.position.y)) + Math.sin(k * Math.PI) * 0.22;
        if (m.trayPop.t >= 1) { tray8Grp.position.y = m.trayPop.baseY; movers.splice(i, 1); }
        continue;
      }
      if (m.hold !== undefined) {
        m.hold -= dt;
        if (m.hold <= 0) { m.fading = true; m.t = 0; delete m.hold; }
        continue;
      }
      if (m.fading) {
        m.t += dt / m.fadeDur;
        const op = Math.max(0, 1 - m.t);
        const matsArr = m.mesh.material.length ? m.mesh.material : [m.mesh.material];
        if (!m.fadeInit) { matsArr.forEach((mm) => { mm.transparent = true; }); m.fadeInit = true; }
        matsArr.forEach((mm) => { mm.opacity = op; });
        if (m.t >= 1) { (m.parent || root.group).remove(m.mesh); movers.splice(i, 1); }
        continue;
      }
      if (!m.curve) continue;
      m.t += dt / m.dur;
      const u = Math.min(m.t, 1);
      let p;
      try { p = m.curve.getPointAt(u); } catch (err) {
        window.__moverErr = { keys: Object.keys(m).join("+"), u, t: m.t, dur: m.dur, pts: m.curve.points ? m.curve.points.map((q) => q && [q.x, q.y, q.z]) : String(m.curve) };
        throw err;
      }
      let y = p.y;
      if (m.arc) y += Math.sin(u * Math.PI) * m.arc;
      m.mesh.position.set(p.x, y, p.z);
      if (m.mesh.userData.flow && camRef) m.mesh.lookAt(camRef.position);
      if (m.t >= 1) {
        if (m.rm !== false) root.group.remove(m.mesh);
        movers.splice(i, 1);
        if (m.onDone) m.onDone();
      }
    }
  }

  // ---------- 复位 ----------
  function reset() {
    state.flags = { ccs: 0, csc: 0, pr: 0, prc: 0, ped: 0 };
    state.pls = "—"; state.speed = "—"; state.slot = "—"; state.mps = "—";
    state.dev = "off"; state.formFilled = 0; state.ep0 = 0; state.dcbaa = 0;
    state.devScreen = "—— 待机 ——";
    state.devIn = false; state.devAddr = 0; state.receipts = 0; state.bsr = "0";
    state.slotLamp = "Disabled"; state.epSlotsLit = 0;
    for (const m of movers.slice()) {
      if (m.mesh && m.rm) {
        (m.parent || root.group).remove(m.mesh);
        if (m.extra) root.group.remove(m.extra);
      }
    }
    movers.length = 0;
    breath = null; breathe3T = -1;
    for (const key of Object.keys(rings)) {
      const r = rings[key];
      for (const o of r.objs) r.grp.remove(o.mesh);
      for (const s of r.static) r.grp.remove(s);
      r.static.length = 0; r.objs.length = 0;
      r.flagSlot = r.key === "ringEvt" ? 6 : 3; r.flagPrev = r.flagSlot; r.flagAnimT = 1;
      r.stepDur = D.base("STEP");
      r.grp.position.y = 0;
    }
    state._flowCard = null;
    setDeviceOffstage(true);
    if (outctxCard) outctxCard.visible = false;
    if (dcbaaWindow) dcbaaWindow.material.emissiveIntensity = 0;
    if (dcbaaBeam) dcbaaBeam.visible = false;
    descCards.forEach((c) => root.group.remove(c));
    descCards.length = 0;
    epMounted = false;
    if (eventBoxLid) { eventBoxLid.rotation.x = 0; }
    if (irqMesh) { irqMesh.visible = false; irqMesh.material.opacity = 0; }
    if (pollTrolley) pollTrolley.visible = false;
    if (domeMat) { domeMat.emissive.set(new T.Color("#000000")); domeMat.emissiveIntensity = 0; }
    if (plateFlipG) plateFlipG.rotation.y = 0;
    if (bsrGrp) { bsrGrp.rotation.y = 0; bsrTarget = 0; }
    if (triggerLever) triggerLever.rotation.z = 0.9;
    if (fsGateGrp) {
      fsGateGrp.userData.lit = false;
      fsGateGrp.traverse((o) => { if (o.material && o.material.emissive) { o.material.emissiveIntensity = 0; } });
    }
    const rEp0 = rings.ringEp0;
    rEp0.slats.forEach((s, i) => { if (i !== 0) { s.material.emissive = new T.Color("#000000"); s.material.emissiveIntensity = 0; } });
    setSlotLamp("Disabled");
    setDevLamp("off");
    Object.keys(screens).forEach((k) => repaint(k));
  }

  // ---------- 装配 ----------
  function build(THREE_, scene) {
    const g = new T.Group();
    root.group = g;
    buildWorld(g);
    buildLights(g);
    buildDesk(g);
    buildCabinet(g);
    buildGantry(g);
    buildRings(g);
    buildDevice(g);
    buildCable(g);
    buildFx(g);
    scene.add(g);
    Object.keys(screens).forEach((k) => repaint(k));
    setSlotLamp("Disabled");
    setDevLamp("off");
    return { group: g, corridorCheck: corridorAssertions() };
  }

  // ---------- 标签锚点导出（X43D.labels → main overlay；erdp 动态） ----------
  function labelAnchors() {
    return D.labels.map((l) => {
      let anchor = l.anchor;
      if (l.id === "lbl-erdp") anchor = "dynamic";
      else anchor = D.deep(anchor);
      return { id: l.id, text: l.text, anchor, barClass: l.barClass, host: l.host, neighbors: l.neighbors };
    });
  }
  function erdpFlagPos() {
    const r = rings.ringEvt;
    const p = ringPoint(r, r.flagSlot);
    return [p.x, p.y + 0.9, p.z];
  }
  // 3D 点选（L1 双入口）：门铃旋钮 raycast
  function pickKnob(ndc, camera) {
    const ray = new T.Raycaster();
    ray.setFromCamera(ndc, camera);
    const objs = Object.keys(bells.knobs).map((k) => bells.knobs[k]);
    const hits = ray.intersectObjects(objs, true);
    if (!hits.length) return null;
    let o = hits[0].object;
    while (o && objs.indexOf(o) < 0) o = o.parent;
    return o ? o.userData.role : null;
  }
  function setGuide(on) {
    const k = bells.knobs[1];
    if (k) k.userData.guideOn = on;
  }

  // ---------- 动手台演示通道（同一 movers 库；判分不写回主线状态） ----------
  function demoEp0Step() {
    // L1 反馈：EP0 环示例卡启动一格步进（STEP）
    const r = rings.ringEp0;
    if (!particlesOn) return;
    const card = makeTrbCard("示例·TD", 1, "#b9e3ac");
    r.grp.add(card);
    const p = ringPoint(r, 5);
    card.position.set(p.x, r.y + 0.42, p.z);
    if (instant) { r.grp.remove(card); return; }
    r.objs.push({
      mesh: card, slat: false, slot: 6, prev: 5, animT: 0,
      once: true, onEnd: () => dwellFade(card, 0.8, 0.5, r.grp),
    });
  }
  function demoSlotReceipt() {
    // L3-T1 结局演示 Slot ID=1 回执（toDesk=false——回执计数不写回主线）
    evCard({ label: "命令完成事件 · Slot ID=1", toDesk: false, from: "xHC · Enable Slot", to: "事件环 → 驱动读取（演示）" });
  }
  function demoBsr(i) {
    // L3-T2 BSR 双分支各自结局演示（演示后恢复主线灯态——判分不写回主线）
    const saved = state.slotLamp;
    if (i === 0) {
      setSlotLamp("Addressed");
      A.ticketEast({ text: "SET_ADDRESS · 地址=1（演示）" });
    } else {
      setSlotLamp("Default");
    }
    setTimeout(() => setSlotLamp(saved), X43D.dur("HOLD") * 1000);
  }

  return {
    build, update, actions: A, reset, state, screens,
    rings, ringEnq, ringDeq, ringClear, setRingCruise, ringFlowEp0, erdpAdvance,
    setSlotLamp, setDevLamp, receiptsBump, openEventBox,
    labelAnchors, erdpFlagPos, pickKnob, setGuide,
    demoEp0Step, demoSlotReceipt, demoBsr,
    fsGateLit: () => !!(fsGateGrp && fsGateGrp.userData.lit),
    moversDebug: () => movers.map((m) => Object.keys(m).join("+") + (m.curve ? (":pts=" + (m.curve.points ? m.curve.points.length : "?") + " t=" + m.t + " dur=" + m.dur) : "")),
    setCameraRef(cam) { camRef = cam; },
    setInstant(v) { instant = v; },
    setParticles(v) { particlesOn = v; },
    setCutaway(v) { if (frontWall) frontWall.visible = !v; },
    corridorCurve,
  };
})();

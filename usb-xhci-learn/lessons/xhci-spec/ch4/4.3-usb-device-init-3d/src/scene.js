/* scene.js —— 「xHC 启机车间」三区全程序化建模（设计档 §3）
 * 左区 文书台（xHCI 驱动）/ 中区 xHC 总控台（剖视机柜，剖口朝 +Z 镜头侧）/ 右区 设备试验盒。
 * 屏显文字用运行时 canvas 贴图（零外部资源）；标签锚点导出给 HTML overlay。 */
const X43Scene = (() => {
  let T; // THREE namespace
  const root = { group: null };
  const screens = {};       // name -> {tex, canvas, draw}
  const lamps = {};         // portsc flag lamp meshes (port 1)
  const devLampDots = {};   // device 4 lamps
  const movers = [];        // flying objects
  const belt = { slats: [], curve: null, speed: 0.35 };
  let instant = false;      // 快进模式：动作只落状态，不生成飞行动件
  let particlesOn = true;   // 票据与传送带粒子开关
  let frontWall = null;     // 剖视开关：关=实心前墙，开=剖口朝镜头
  const bells = { b0: null, b1: null, press: {} };
  let cableDangling = null, cablePlugged = null, plugHead = null, portRing = null;
  let resetRing = null;
  const trbCards = [];
  let outctxCard = null, descCards = [];
  let epReadyLamp = null, epReadyGlow = null;
  let portStrip = null;
  const state = {
    flags: { ccs: 0, csc: 0, pr: 0, prc: 0, ped: 0 },
    pls: "—", speed: "—", slot: "—", mps: "—",
    dev: "off", formFilled: 0, ep0: 0, dcbaa: 0,
    devScreen: "—— 待机 ——",
  };

  // ---------- 材质 ----------
  function mats() {
    return {
      floor: new T.MeshStandardMaterial({ color: 0x161b21, roughness: 0.96, metalness: 0.05 }),
      desk: new T.MeshStandardMaterial({ color: 0x5d4936, roughness: 0.78, metalness: 0.08 }),
      deskTop: new T.MeshStandardMaterial({ color: 0x6e563e, roughness: 0.6, metalness: 0.1 }),
      cab: new T.MeshStandardMaterial({ color: 0x39414c, roughness: 0.55, metalness: 0.45 }),
      cabIn: new T.MeshStandardMaterial({ color: 0x36404b, roughness: 0.62, metalness: 0.28 }),
      panel: new T.MeshStandardMaterial({ color: 0x1d232b, roughness: 0.5, metalness: 0.35 }),
      amber: new T.MeshStandardMaterial({ color: 0xd9a860, roughness: 0.45, metalness: 0.3 }),
      amberEm: new T.MeshStandardMaterial({ color: 0xd9a860, roughness: 0.4, metalness: 0.2, emissive: 0xd9a860, emissiveIntensity: 0.25 }),
      paper: new T.MeshStandardMaterial({ color: 0xece7da, roughness: 0.85 }),
      green: new T.MeshStandardMaterial({ color: 0x86bd7a, roughness: 0.5, metalness: 0.15 }),
      blue: new T.MeshStandardMaterial({ color: 0x7c9ff0, roughness: 0.5, metalness: 0.2 }),
      dark: new T.MeshStandardMaterial({ color: 0x14181d, roughness: 0.9 }),
      steel: new T.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.35, metalness: 0.7 }),
      redBtn: new T.MeshStandardMaterial({ color: 0xc94f43, roughness: 0.4, metalness: 0.1 }),
      glass: new T.MeshStandardMaterial({ color: 0x9fc4b8, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.24, side: T.DoubleSide }),
      core: new T.MeshStandardMaterial({ color: 0x2f3a35, roughness: 0.6, metalness: 0.25 }),
      alarm: new T.MeshStandardMaterial({ color: 0xe05252, roughness: 0.5, emissive: 0xe05252, emissiveIntensity: 0.3 }),
    };
  }

  // ---------- 小工具 ----------
  function box(w, h, d, mat, x, y, z, shadow) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (shadow !== false) { m.castShadow = true; m.receiveShadow = true; }
    return m;
  }
  function cyl(rt, rb, h, mat, x, y, z, seg) {
    const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg || 20), mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  // 运行时 canvas 贴图屏
  function makeScreen(name, w, h, px, py, drawFn) {
    const canvas = document.createElement("canvas");
    canvas.width = px; canvas.height = py;
    const tex = new T.CanvasTexture(canvas);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 4;
    const mat = new T.MeshBasicMaterial({ map: tex });
    const mesh = new T.Mesh(new T.PlaneGeometry(w, h), mat);
    screens[name] = { tex, canvas, ctx: canvas.getContext("2d"), draw: drawFn, px, py };
    return mesh;
  }
  function repaint(name) {
    const s = screens[name];
    if (!s) return;
    s.draw(s.ctx, s.px, s.py, state);
    s.tex.needsUpdate = true;
  }
  const MONO = '"SF Mono","Cascadia Code",Consolas,"PingFang SC","Microsoft YaHei",monospace';
  function screenBase(c, px, py, title) {
    c.fillStyle = "#10151b"; c.fillRect(0, 0, px, py);
    c.strokeStyle = "#3a4652"; c.lineWidth = 4; c.strokeRect(6, 6, px - 12, py - 12);
    if (title) {
      c.fillStyle = "#d9a860"; c.font = `600 30px ${MONO}`;
      c.textAlign = "left"; c.textBaseline = "top";
      c.fillText(title, 22, 16);
    }
  }

  // ---------- 左区：文书台 ----------
  function buildDesk(g) {
    const desk = new T.Group();
    const top = box(7.6, 0.42, 4.9, mats().deskTop, 0, 2.72, 0);
    desk.add(top);
    for (const [lx, lz] of [[-3.5, -2.1], [3.5, -2.1], [-3.5, 2.1], [3.5, 2.1]]) {
      desk.add(box(0.32, 2.5, 0.32, mats().desk, lx, 1.25, lz));
    }
    desk.add(box(6.8, 0.18, 0.3, mats().desk, 0, 1.9, -2.0)); // 背挡条
    // 命令单打印口（小机身 + 出单槽）
    const pr = new T.Group();
    pr.add(box(1.7, 1.15, 1.25, mats().cab, -0.0, 0.58, 0));
    pr.add(box(1.3, 0.1, 0.5, mats().dark, 0, 0.98, 0.15)); // 顶槽
    pr.add(box(1.45, 0.07, 0.72, mats().steel, 0, 0.62, 0.72)); // 出单托板
    pr.position.set(-2.9, 2.93, -0.9);
    desk.add(pr);
    // 命令单堆（3 张薄纸）
    for (let i = 0; i < 3; i++) desk.add(box(1.15, 0.035, 0.68, mats().paper, -1.15, 2.96 + i * 0.045, -0.75));
    // 输入上下文表格卡（立式 canvas 屏）
    const form = makeScreen("form", 2.2, 2.7, 400, 480, drawForm);
    form.position.set(0.1, 4.25, 0.2);
    form.rotation.x = -0.06;
    desk.add(form);
    desk.add(box(2.35, 0.1, 0.28, mats().steel, 0.1, 2.98, 0.2)); // 卡座
    // 事件匣 + 描述符收件匣（浅盘）
    desk.add(buildTray(-1.35, -1.25, 1.35, 0.95));  // 事件匣（北侧）
    desk.add(buildTray(-1.35, 0.35, 1.35, 0.95));   // 收件匣（南侧）
    // 台面留白（区名由 HTML 区标承载，不设镜像风险牌）
    desk.add(box(1.5, 0.06, 0.5, mats().amber, -2.2, 2.96, 1.55));
    desk.position.set(-14, 0, 0.9);
    g.add(desk);
    // 事件匣 / 收件匣世界坐标（供事件卡落点）
    root.trayEventW = new T.Vector3(-14 - 1.35 + 0.5, 3.15, 0.9 - 1.25 + 0.35);
    root.trayDescW = new T.Vector3(-14 - 1.35 + 0.5, 3.15, 0.9 + 0.35 + 0.35);
    root.formW = new T.Vector3(-14 + 0.1, 4.3, 0.9 + 0.2);
  }
  function buildTray(x, z, w, d) {
    const t = new T.Group();
    const m = mats().cabIn;
    t.add(box(w, 0.08, d, m, 0, 0.04, 0));
    t.add(box(w, 0.3, 0.07, m, 0, 0.15, -d / 2));
    t.add(box(w, 0.3, 0.07, m, 0, 0.15, d / 2));
    t.add(box(0.07, 0.3, d, m, -w / 2, 0.15, 0));
    t.add(box(0.07, 0.3, d, m, w / 2, 0.15, 0));
    t.position.set(x, 2.93, z);
    return t;
  }
  function drawForm(c, px, py, st) {
    screenBase(c, px, py, "输入上下文");
    c.font = `500 24px ${MONO}`; c.textAlign = "left"; c.textBaseline = "middle";
    const filled = st.formFilled || 0;
    const cells = [
      ["A0", "1"], ["A1", "1"],
      ["端口", "1"], ["Route", "0"], ["Entries", "1"],
      ["类型", "Ctrl"], ["MPS", "8"], ["DCS", "1"], ["CErr", "3"],
    ];
    const labels = ["输入控制", "Slot Context", "", "EP0 Context"];
    let y = 92;
    let ci = 0;
    const row = (name, vals, tag) => {
      if (tag) { c.fillStyle = "#7c9ff0"; c.font = `600 23px ${MONO}`; c.fillText(tag, 26, y); y += 34; }
      c.fillStyle = "#8d99a6"; c.font = `500 23px ${MONO}`;
      c.fillText(name, 26, y);
      let x = 118;
      for (const v of vals) {
        const on = ci < filled;
        c.strokeStyle = on ? "#7c9ff0" : "#46566a"; c.lineWidth = 2;
        c.strokeRect(x, y - 16, 52, 32);
        if (on) { c.fillStyle = "#e2edff"; c.font = `600 22px ${MONO}`; c.textAlign = "center"; c.fillText(v, x + 26, y + 1); c.textAlign = "left"; }
        x += 56; ci++;
      }
      y += 44;
    };
    row("控制", [cells[0][1], cells[1][1]], "输入控制 · A0/A1");
    row("Slot", [cells[2][1], cells[3][1], cells[4][1]], "Slot Context");
    row("EP0", [cells[5][1], cells[6][1], cells[7][1], cells[8][1]], "EP0 Context");
    c.fillStyle = "#5b6875"; c.font = `500 20px ${MONO}`;
    c.fillText("MPS=端口速度默认值（FS=8）", 34, py - 56);
  }

  // ---------- 中区：xHC 总控台（剖视） ----------
  function buildCabinet(g) {
    const cab = new T.Group();
    const W = 11, D = 4, H = 9;
    // 外壳：底/背/左右/顶，剖口朝 +Z
    cab.add(box(W, 0.5, D, mats().cab, 0, 0.25, 0));
    cab.add(box(W, H, 0.35, mats().cab, 0, H / 2, -D / 2 + 0.175)); // 背墙
    cab.add(box(0.35, H, D, mats().cab, -W / 2 + 0.175, H / 2, 0));
    cab.add(box(0.35, H, D, mats().cab, W / 2 - 0.175, H / 2, 0));
    cab.add(box(W, 0.4, D, mats().cab, 0, H - 0.2, 0));
    // 前墙（剖视关=实心；剖视开=隐藏，剖口朝 +Z 镜头侧）
    frontWall = box(W - 0.3, H - 0.5, 0.14, mats().cab, 0, H / 2, D / 2 - 0.07);
    frontWall.visible = false;
    cab.add(frontWall);
    // 剖口沿边琥珀条（剖视记号）
    cab.add(box(W, 0.12, 0.12, mats().amber, 0, 0.56, D / 2 - 0.06));
    // 内部层板
    cab.add(box(W - 0.9, 0.18, D - 0.9, mats().cabIn, 0, 0.5, 0));   // 底层台板
    cab.add(box(5.4, 0.16, 2.6, mats().cabIn, 2.6, 3.05, 0.1));      // 命令层台板
    // —— 寄存器面板墙（背墙面板 + 两块屏） ——
    cab.add(box(8.2, 3.6, 0.18, mats().panel, -1.2, 6.9, -D / 2 + 0.55));
    const portsc = makeScreen("portsc", 4.6, 2.9, 640, 400, drawPortsc);
    portsc.position.set(-2.6, 6.9, -D / 2 + 0.66);
    cab.add(portsc);
    const stat = makeScreen("stat", 2.5, 3.2, 380, 560, drawStat);
    stat.position.set(1.15, 7.05, -D / 2 + 0.66);
    cab.add(stat);
    // —— DCBAA 信箱格架（底层左侧 2×4，编号 0..7 行优先） ——
    const dc = new T.Group();
    dc.add(box(4.4, 2.9, 0.9, mats().panel, 0, 1.45, 0));
    for (let r = 0; r < 2; r++) for (let col = 0; col < 4; col++) {
      const cu = box(0.92, 0.82, 0.72, mats().cabIn, -1.5 + col * 1.0, 0.75 + r * 1.0, 0.12);
      dc.add(cu);
    }
    const numStrip = (vals) => (c, px, py) => {
      c.clearRect(0, 0, px, py);
      c.fillStyle = "#d9a860"; c.font = `600 36px ${MONO}`; c.textAlign = "center"; c.textBaseline = "middle";
      vals.forEach((v, i) => c.fillText(v, 28 + i * 100, py / 2));
    };
    const nums0 = makeScreen("dcbaaNums0", 4.0, 0.24, 400, 46, numStrip(["0", "1", "2", "3"]));
    nums0.position.set(0, 0.2, 0.48);
    dc.add(nums0);
    const nums1 = makeScreen("dcbaaNums1", 4.0, 0.24, 400, 46, numStrip(["4", "5", "6", "7"]));
    nums1.position.set(0, 1.2, 0.48);
    dc.add(nums1);
    // 1 号格输出上下文卡（初始隐藏；行优先：1 号=下行左起第 2 格）
    outctxCard = box(0.78, 0.66, 0.5, new T.MeshStandardMaterial({ color: 0x7c9ff0, roughness: 0.5, emissive: 0x7c9ff0, emissiveIntensity: 0.6 }), -0.5, 0.75, 0.16);
    outctxCard.visible = false;
    dc.add(outctxCard);
    dc.position.set(-3.1, 0.59, 0.15);
    cab.add(dc);
    // —— EP0 传输环台（底层右侧） ——
    const ep = new T.Group();
    ep.add(cyl(1.25, 1.35, 0.18, mats().panel, 0, 0.09, 0, 32));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      ep.add(box(0.06, 0.3, 0.5, mats().steel, Math.cos(a) * 0.85, 0.24, Math.sin(a) * 0.85));
    }
    ["S", "D", "St"].forEach((lab, i) => {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const card = box(0.52, 0.07, 0.34, mats().paper, Math.cos(a) * 0.82, 0.26, Math.sin(a) * 0.82);
      card.rotation.y = -a;
      card.visible = false;
      trbCards.push(card); ep.add(card);
    });
    epReadyLamp = cyl(0.09, 0.09, 0.12, new T.MeshStandardMaterial({ color: 0x39414c, roughness: 0.4 }), 1.0, 0.3, -0.9, 12);
    ep.add(epReadyLamp);
    ep.position.set(1.7, 0.6, 0.2);
    cab.add(ep);
    // —— 命令层：命令收件口 + 门铃排 ——
    const cnt = new T.Group();
    cnt.add(box(4.9, 0.14, 1.9, mats().cab, 0, 0.07, 0));
    cnt.add(box(0.9, 0.22, 0.6, mats().dark, -2.0, 0.2, -0.4)); // 命令环收件口（暗槽）
    const cntLabel = makeScreen("cntLabel", 1.9, 0.32, 340, 58, (c, px, py) => {
      c.fillStyle = "#10151b"; c.fillRect(0, 0, px, py);
      c.fillStyle = "#d9a860"; c.font = `600 30px ${MONO}`; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText("命令环 · 收件口", px / 2, py / 2);
    });
    cntLabel.position.set(-2.0, 0.42, -0.35); cntLabel.rotation.x = -0.5;
    cnt.add(cntLabel);
    // 门铃 0（大按钮）
    const b0 = new T.Group();
    b0.add(cyl(0.3, 0.36, 0.1, mats().steel, 0, 0.05, 0, 24));
    const b0btn = cyl(0.22, 0.22, 0.16, mats().redBtn, 0, 0.16, 0, 20);
    b0.add(b0btn);
    b0.position.set(1.75, 0.14, 0.45);
    bells.b0 = b0btn; cnt.add(b0);
    // EP 门铃小按钮排（Target=1 为 EP0）
    for (let i = 0; i < 4; i++) {
      const s = cyl(0.09, 0.09, 0.09, i === 0 ? mats().amberEm : mats().steel, 2.5 + i * 0.34, 0.18, 0.45, 14);
      if (i === 0) bells.b1 = s;
      cnt.add(s);
    }
    // 门铃合刻牌（双行，立于计数器后缘——避免两块刻牌世界坐标重叠）
    const b1l = makeScreen("b1l", 2.3, 0.66, 440, 128, (c, px, py) => {
      c.fillStyle = "#10151b"; c.fillRect(0, 0, px, py);
      c.strokeStyle = "#3a4652"; c.lineWidth = 3; c.strokeRect(3, 3, px - 6, py - 6);
      c.fillStyle = "#e8d5b0"; c.font = `600 34px ${MONO}`; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText("门铃 0 · DB Target=0", px / 2, 38);
      c.fillText("EP 门铃 · Target=1 为 EP0", px / 2, 92);
    });
    b1l.position.set(1.6, 0.5, -0.68); b1l.rotation.x = -1.05;
    cnt.add(b1l);
    cnt.position.set(1.9, 3.15, 0.1);
    cab.add(cnt);
    // —— 事件环传送带（中层椭圆环带） ——
    const beltPts = [];
    const bx0 = -3.4, bx1 = 3.0, bz0 = -0.9, bz1 = 1.0, cy = 5.15;
    const oval = new T.Shape();
    // 用参数点构 CatmullRom 闭环（圆角矩形）
    const corner = 0.7;
    const rectPts = [
      [bx0 + corner, bz0], [bx1 - corner, bz0], [bx1, bz0 + corner], [bx1, bz1 - corner],
      [bx1 - corner, bz1], [bx0 + corner, bz1], [bx0, bz1 - corner], [bx0, bz0 + corner],
    ].map(([x, z]) => new T.Vector3(x, cy, z));
    belt.curve = new T.CatmullRomCurve3(rectPts, true, "catmullrom", 0.35);
    const beltTube = new T.Mesh(new T.TubeGeometry(belt.curve, 120, 0.09, 10, true), mats().dark);
    cab.add(beltTube);
    for (let i = 0; i < 14; i++) {
      const slat = box(0.34, 0.05, 0.2, mats().amber, 0, cy, 0, false);
      slat.castShadow = false;
      belt.slats.push(slat);
      cab.add(slat);
    }
    // 带支架
    for (const px of [-3.0, 0, 2.6]) cab.add(box(0.1, 1.35, 0.1, mats().steel, px, 4.4, 0.05));
    // —— 根端口排（东外壁，朝 +X） ——
    portStrip = makeScreen("ports", 2.6, 0.5, 400, 80, (c, px, py) => {
      c.fillStyle = "#10151b"; c.fillRect(0, 0, px, py);
      c.fillStyle = "#d9a860"; c.font = `600 42px ${MONO}`; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText("根端口 1 · 2 · 3 · 4", px / 2, py / 2);
    });
    portStrip.position.set(W / 2 + 0.02, 3.6, 0.2);
    portStrip.rotation.y = Math.PI / 2;
    cab.add(portStrip);
    for (let i = 0; i < 4; i++) {
      const s = box(0.5, 0.5, 0.5, mats().panel, W / 2 + 0.18, 2.0, 1.5 - i * 1.0);
      cab.add(s);
      cab.add(box(0.2, 0.3, 0.3, mats().dark, W / 2 + 0.3, 2.0, 1.5 - i * 1.0));
    }
    portRing = new T.Mesh(new T.TorusGeometry(0.36, 0.05, 10, 28), new T.MeshStandardMaterial({ color: 0x86bd7a, emissive: 0x86bd7a, emissiveIntensity: 0.9, roughness: 0.4 }));
    portRing.position.set(W / 2 + 0.34, 2.0, 1.5);
    portRing.rotation.y = Math.PI / 2;
    portRing.visible = false;
    cab.add(portRing);
    // 顶沿装饰条（区名由 HTML 区标承载）
    cab.add(box(3.2, 0.1, 0.5, mats().amber, 0, H + 0.05, 1.15));
    g.add(cab);
    root.cabinet = cab;
  }
  function drawPortsc(c, px, py, st) {
    screenBase(c, px, py, "PORTSC · 根端口");
    const F = ["CCS", "CSC", "PR", "PRC", "PED"];
    const lampOn = "#ffb24d", lampOff = "#242e38";
    // 行 1：端口 1 五字段灯
    c.font = `600 26px ${MONO}`; c.textAlign = "left"; c.textBaseline = "middle";
    c.fillStyle = "#8d99a6"; c.fillText("端口 1", 26, 96);
    let x = 128;
    for (const f of F) {
      c.fillStyle = "#8d99a6"; c.textAlign = "center"; c.fillText(f, x + 26, 96);
      c.beginPath(); c.arc(x + 26, 134, 14, 0, Math.PI * 2);
      c.fillStyle = st.flags[f] ? lampOn : lampOff; c.fill();
      c.strokeStyle = "#3a4652"; c.lineWidth = 2; c.stroke();
      x += 68;
    }
    // 行 2：PLS / Speed 数码窗
    c.textAlign = "left"; c.font = `600 24px ${MONO}`;
    c.fillStyle = "#8d99a6"; c.fillText("PLS", 40, 204);
    c.fillStyle = "#ffd9a0"; c.font = `700 34px ${MONO}`;
    c.fillText(st.pls, 40, 246);
    c.fillStyle = "#8d99a6"; c.font = `600 24px ${MONO}`;
    c.fillText("Speed", 170, 204);
    c.fillStyle = "#9fe08f"; c.font = `700 34px ${MONO}`;
    c.fillText(st.speed, 170, 246);
    // 行 3-5：端口 2-4
    c.font = `500 26px ${MONO}`;
    for (let i = 2; i <= 4; i++) {
      c.fillStyle = "#5b6875"; c.textAlign = "left";
      const ry = 190 + (i - 1) * 50;
      c.fillText(`端口 ${i}`, 300, ry);
      c.fillText("未接", 400, ry);
    }
    c.fillStyle = "#4a5561"; c.font = `500 20px ${MONO}`;
    c.fillText("字段灯：CCS/CSC/PR/PRC/PED · 数码窗：PLS/Speed", 26, py - 26);
  }
  function drawStat(c, px, py, st) {
    screenBase(c, px, py, "状态窗");
    c.font = `500 23px ${MONO}`; c.textAlign = "left"; c.textBaseline = "middle";
    const rows = [
      ["USBCMD", "R/S=1", "#9fe08f"],
      ["MaxSlotsEn", "已配置", "#cfe0ff"],
      ["DCBAAP", "→ DCBAA", "#cfe0ff"],
      ["Device Slot", st.slot, st.slot === "—" ? "#5b6875" : "#ffd9a0"],
      ["EP0 MPS", st.mps, st.mps === "—" ? "#5b6875" : "#cfe0ff"],
      ["回执", String(st.receipts ?? 0), "#ffd9a0"],
    ];
    let y = 92;
    for (const [k, v, col] of rows) {
      c.fillStyle = "#8d99a6"; c.fillText(k, 24, y);
      c.fillStyle = col; c.font = `700 25px ${MONO}`;
      c.fillText(v, 24, y + 36);
      c.font = `500 23px ${MONO}`;
      y += 80;
    }
  }

  // ---------- 右区：设备试验盒 ----------
  function buildDevice(g) {
    const dev = new T.Group();
    dev.add(box(3.2, 0.35, 2.6, mats().cab, 0, 0.18, 0)); // 底座
    // 半透明外壳
    const shell = box(2.5, 2.2, 2.0, mats().glass, 0, 1.45, 0);
    dev.add(shell);
    dev.add(box(1.55, 1.4, 1.15, mats().core, 0, 1.28, 0)); // 内芯
    // 状态灯面板（canvas 屏）
    const lp = makeScreen("devLamps", 1.6, 1.7, 280, 340, drawDevLamps);
    lp.position.set(-0.3, 1.62, 1.01);
    dev.add(lp);
    // 四盏实体灯罩（与屏对应的小凸窗）
    const cols = { powered: 0x8d99a6, default: 0x8d99a6, address: 0x8d99a6, configured: 0x8d99a6 };
    ["powered", "default", "address", "configured"].forEach((k, i) => {
      const mat = new T.MeshStandardMaterial({ color: 0x39414c, roughness: 0.4, emissive: 0x000000 });
      const dome = new T.Mesh(new T.SphereGeometry(0.11, 16, 12), mat);
      dome.position.set(0.85, 2.15 - i * 0.38, 1.02);
      devLampDots[k] = { mesh: dome, mat };
      dev.add(dome);
    });
    // 收件屏
    const scr = makeScreen("devScreen", 2.1, 0.56, 560, 150, (c, px, py, st) => {
      screenBase(c, px, py, null);
      c.fillStyle = "#86bd7a"; c.font = `600 28px ${MONO}`; c.textAlign = "left"; c.textBaseline = "middle";
      c.fillText("USB 收件屏", 20, 30);
      c.fillStyle = "#d7e8cf"; c.font = `600 32px ${MONO}`;
      c.fillText(st.devScreen || "—— 待机 ——", 20, 76);
      c.fillStyle = "#5f7a55"; c.font = `500 22px ${MONO}`;
      c.fillText("只见 USB 请求与总线事件", 20, 122);
    });
    scr.position.set(0, 0.42, 1.02);
    dev.add(scr);
    // 底座铭牌
    const plate = makeScreen("devPlate", 2.4, 0.36, 430, 70, (c, px, py) => {
      c.fillStyle = "#1c231d"; c.fillRect(0, 0, px, py);
      c.fillStyle = "#cfe0c4"; c.font = `600 40px ${MONO}`; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText("USB 设备 · 试验盒", px / 2, py / 2 + 2);
    });
    plate.position.set(0, 0.38, 1.32); plate.rotation.x = -Math.PI / 2 - 0.25;
    dev.add(plate);
    // 西侧线缆端口座
    dev.add(cyl(0.24, 0.28, 0.3, mats().steel, -1.3, 1.35, 0.5, 18).rotateZ(Math.PI / 2));
    dev.position.set(13, 0, 0.9);
    g.add(dev);
    root.devPort = new T.Vector3(13 - 1.45, 1.35, 0.9 + 0.5);
  }
  function drawDevLamps(c, px, py, st) {
    screenBase(c, px, py, "状态灯");
    const rows = [["powered", "Powered"], ["default", "Default"], ["address", "Address"], ["configured", "Configured"]];
    c.font = `600 30px ${MONO}`; c.textAlign = "left"; c.textBaseline = "middle";
    rows.forEach(([k, label], i) => {
      const on = st.dev === k;
      c.beginPath(); c.arc(44, 96 + i * 66, 15, 0, Math.PI * 2);
      c.fillStyle = on ? "#9fe08f" : "#242e38"; c.fill();
      c.strokeStyle = on ? "#c2ecb4" : "#3a4652"; c.lineWidth = 2.5; c.stroke();
      c.fillStyle = on ? "#d7e8cf" : "#5b6875";
      c.fillText(label, 76, 96 + i * 66);
    });
  }

  // ---------- 总线缆 ----------
  function buildCable(g) {
    const devP = root.devPort;
    const port1 = new T.Vector3(5.85, 2.0, 1.5);
    const dangPts = [devP, new T.Vector3(devP.x - 0.9, 0.5, devP.z + 0.5), new T.Vector3(devP.x - 1.9, 0.16, devP.z + 0.8), new T.Vector3(devP.x - 2.6, 0.1, devP.z + 0.7)];
    const plugPts = [port1, new T.Vector3(7.4, 1.3, 1.5), new T.Vector3(9.4, 0.6, 1.25), new T.Vector3(11.2, 0.95, 1.0), devP];
    root.cableCurve = new T.CatmullRomCurve3(plugPts);
    cableDangling = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(dangPts), 40, 0.09, 10), mats().dark);
    cableDangling.castShadow = true;
    cablePlugged = new T.Mesh(new T.TubeGeometry(root.cableCurve, 60, 0.09, 10), mats().dark);
    cablePlugged.castShadow = true;
    cablePlugged.visible = false;
    plugHead = box(0.34, 0.3, 0.3, mats().steel, devP.x - 2.6, 0.24, devP.z + 0.7);
    g.add(cableDangling); g.add(cablePlugged); g.add(plugHead);
    // 复位脉冲环
    resetRing = new T.Mesh(new T.TorusGeometry(0.22, 0.045, 10, 24), new T.MeshStandardMaterial({ color: 0xffb24d, emissive: 0xffb24d, emissiveIntensity: 1 }));
    resetRing.visible = false;
    g.add(resetRing);
  }

  // ---------- 地面/灯光 ----------
  function buildWorld(g) {
    const floor = new T.Mesh(new T.PlaneGeometry(90, 50), mats().floor);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    g.add(floor);
    const grid = new T.GridHelper(90, 60, 0x272e36, 0x1b2127);
    grid.position.y = 0.015;
    g.add(grid);
  }
  function buildLights(g) {
    g.add(new T.AmbientLight(0x8899aa, 0.55));
    g.add(new T.HemisphereLight(0x35404d, 0x14100c, 0.55));
    const key = new T.DirectionalLight(0xfff1dc, 1.5);
    key.position.set(10, 22, 16);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -24; key.shadow.camera.right = 24;
    key.shadow.camera.top = 24; key.shadow.camera.bottom = -24;
    key.shadow.bias = -0.0015;
    g.add(key);
    const warm = new T.PointLight(0xd9a860, 18, 16, 2);
    warm.position.set(0, 6.5, 4);
    g.add(warm);
    const inner = new T.PointLight(0xffe2b0, 40, 13, 2); // 机柜内部补光（剖视可读）
    inner.position.set(0, 5.2, 1.6);
    g.add(inner);
    const innerLo = new T.PointLight(0xbfd0e8, 14, 9, 2);
    innerLo.position.set(1.5, 1.8, 1.7);
    g.add(innerLo);
    const deskL = new T.PointLight(0x9fbef5, 16, 14, 2);
    deskL.position.set(-14, 6, 3);
    g.add(deskL);
    const devL = new T.PointLight(0x86bd7a, 6, 10, 2);
    devL.position.set(13, 4, 3);
    g.add(devL);
    // 两翼侧后补光（deep-dark 基调内的层次保底：物件外形可辨、不靠标签猜内容）
    const deskRim = new T.PointLight(0xaebfd8, 26, 34, 2);
    deskRim.position.set(-19, 7.5, -3);
    g.add(deskRim);
    const devRim = new T.PointLight(0xb9d8ae, 18, 26, 2);
    devRim.position.set(17.5, 6.5, -2.5);
    g.add(devRim);
  }

  // ---------- 飞行动件 ----------
  function makeCard(label, w, h, bg, fg, sub) {
    const cnv = document.createElement("canvas");
    cnv.width = 256; cnv.height = 96;
    const c = cnv.getContext("2d");
    c.fillStyle = bg; c.fillRect(0, 0, 256, 96);
    c.strokeStyle = "rgba(255,255,255,0.35)"; c.lineWidth = 4; c.strokeRect(4, 4, 248, 88);
    c.fillStyle = fg; c.textAlign = "center"; c.textBaseline = "middle";
    c.font = `600 30px ${MONO}`;
    const lines = String(label).split("·").map((s) => s.trim());
    if (lines.length <= 2) lines.forEach((ln, i) => c.fillText(ln, 128, lines.length === 1 ? 48 : 34 + i * 30));
    else { c.font = `600 24px ${MONO}`; lines.forEach((ln, i) => c.fillText(ln, 128, 20 + i * 26)); }
    const tex = new T.CanvasTexture(cnv);
    tex.colorSpace = T.SRGBColorSpace;
    const m = new T.Mesh(new T.BoxGeometry(w, h, 0.02), [
      new T.MeshStandardMaterial({ color: bg, roughness: 0.6 }),
      new T.MeshStandardMaterial({ color: bg, roughness: 0.6 }),
      new T.MeshStandardMaterial({ color: bg, roughness: 0.6 }),
      new T.MeshStandardMaterial({ color: bg, roughness: 0.6 }),
      new T.MeshBasicMaterial({ map: tex }),
      new T.MeshBasicMaterial({ map: tex }),
    ]);
    m.castShadow = true;
    return m;
  }
  function flyAlong(mesh, pts, dur, onDone, arc) {
    if (instant || !particlesOn) { if (onDone) onDone(); return; }
    const curve = new T.CatmullRomCurve3(pts.map((p) => new T.Vector3(...p)));
    movers.push({ mesh, curve, t: 0, dur, onDone, arc: arc || 0 });
    mesh.visible = true;
  }
  function spawnCard(label, bg, fg, w, h, pts, dur, onDone) {
    if (instant || !particlesOn) { if (onDone) onDone(); return null; }
    const m = makeCard(label, w, h, bg, fg);
    root.group.add(m);
    flyAlong(m, pts, dur, () => { root.group.remove(m); if (onDone) onDone(); });
    return m;
  }

  // ---------- 动作实现 ----------
  const A = {
    cablePlug() {
      if (cablePlugged.visible) return;
      if (instant) {
        plugHead.visible = false;
        cableDangling.visible = false;
        cablePlugged.visible = true;
        portRing.visible = true;
        return;
      }
      const head = plugHead.clone();
      root.group.add(head);
      plugHead.visible = false;
      cableDangling.visible = false;
      flyAlong(head, [[plugHead.position.x, 0.24, plugHead.position.z], [8.6, 1.1, 1.3], [root.devPort.x + 0.4, 1.3, root.devPort.z], [5.95, 2.0, 1.5]], 0.9, () => {
        root.group.remove(head);
        cablePlugged.visible = true;
        portRing.visible = true;
      });
    },
    portFlags(f) { Object.assign(state.flags, f); repaint("portsc"); },
    pls(o) { state.pls = o.v; repaint("portsc"); },
    speed(o) { state.speed = o.v; repaint("portsc"); },
    devLamp(o) {
      state.dev = o.v;
      for (const k of Object.keys(devLampDots)) {
        const on = state.dev === k;
        devLampDots[k].mat.emissive.set(on ? 0x86bd7a : 0x000000);
        devLampDots[k].mat.emissiveIntensity = on ? 0.9 : 0;
        devLampDots[k].mat.color.set(on ? 0x9fe08f : 0x39414c);
      }
      repaint("devLamps");
    },
    slotLamp(o) { state.slot = o.v; repaint("stat"); },
    mps(o) { state.mps = o.v; repaint("stat"); },
    portRead() {
      const m = screens.portsc;
      // 读括号闪亮：短促提亮整个屏
      m.flash = 0.9;
    },
    regWrite() {
      spawnCard("寄存器写 · PR=1", "#7c9ff0", "#0e1630", 0.85, 0.32, [
        [-13.4, 3.4, 1.6], [-9, 4.3, 1.2], [-5.4, 4.4, 0.8], [-1.6, 4.2, 0.4], [1.15, 5.4, -0.9],
      ], 1.5);
    },
    resetPulse() {
      if (!cablePlugged.visible || instant) return;
      resetRing.visible = true;
      movers.push({ mesh: resetRing, curve: root.cableCurve, t: 0, dur: 1.3, ring: true, onDone: () => { resetRing.visible = false; } });
    },
    slip(o) {
      const label = (o && o.label) || "命令单";
      spawnCard(label, "#ece7da", "#1c2b52", 0.95, 0.36, [
        [-16.3, 3.7, 0.0], [-13, 4.25, 0.5], [-8, 4.45, 0.4], [-5.2, 4.2, 0.3], [-3.2, 3.6, 0.1], [-0.5, 3.6, -0.3],
      ], 1.8);
    },
    slipPrep(o) {
      if (instant) return;
      // 备好命令单：单据停在打印口托板上
      const label = (o && o.label) || "Address Device";
      const m = makeCard(label, 0.95, 0.36, "#ece7da", "#1c2b52");
      m.position.set(-16.3, 3.75, 0.0);
      m.rotation.x = 0.08;
      root.group.add(m);
      movers.push({ mesh: m, hold: 3.4 });
    },
    bell0() { bells.press.b0 = 0.28; },
    bell1() { bells.press.b1 = 0.28; },
    evCard(o) {
      const label = (o && o.label) || "事件";
      if (instant || !particlesOn) { if (o && o.toDesk) receiptsBump(); return; }
      const alarm = label.indexOf("参数错误") >= 0;
      const bg = alarm ? "#e05252" : "#d9a860";
      const fg = alarm ? "#2b0808" : "#241503";
      // 上带 → 随带走 → 西端出 → 沿回流管到文书台事件匣
      const t0 = belt.curve.getPointAt(0.06);
      const card = makeCard(label, 0.72, 0.28, bg, fg);
      root.group.add(card);
      card.position.set(t0.x, t0.y + 0.18, t0.z);
      movers.push({ mesh: card, belt: true, bt: 0.0, btDur: 4.2, onDone: () => {
        flyAlong(card, [[-3.4, 5.32, 0.05], [-6.5, 5.6, 0.4], [-10, 5.0, 1.1], [root.trayEventW.x, root.trayEventW.y, root.trayEventW.z]], 1.6, () => {
          if (o && o.toDesk) receiptsBump();
        });
      } });
    },
    ticketOut(o) {
      state.devScreen = o.text || "USB 请求";
      repaint("devScreen");
      spawnCard(o.text || "USB 请求", "#86bd7a", "#12240e", 0.8, 0.3, [[5.9, 2.0, 1.5], [7.6, 1.5, 1.5], [9.6, 0.9, 1.25], [11.4, 1.2, 1.0], [12.2, 1.7, 0.9]], 1.7, () => {
        // 到达设备：收件屏已更新
      });
    },
    ticketIn(o) {
      spawnCard(o.text || "数据", "#a8d29c", "#12240e", 0.8, 0.3, [[12.2, 1.7, 0.9], [11.4, 1.2, 1.0], [9.6, 0.9, 1.25], [7.6, 1.5, 1.5], [5.9, 2.0, 1.5]], 1.7, () => {
        state.devScreen = "已回数据 · 见描述符收件匣";
        repaint("devScreen");
      });
    },
    outctxFly() {
      if (instant) { outctxCard.visible = true; state.dcbaa = 1; return; }
      const m = box(0.55, 0.1, 0.36, mats().blue, -13.9, 3.3, 1.1);
      root.group.add(m);
      flyAlong(m, [[-13.9, 3.3, 1.1], [-10, 4.0, 0.6], [-6, 3.2, 0.2], [-3.9, 1.8, 0.2], [-3.62, 1.3, 0.5]], 1.8, () => {
        root.group.remove(m);
        outctxCard.visible = true;
        state.dcbaa = 1;
      });
    },
    formFill(o) { state.formFilled = o.n; repaint("form"); },
    ep0Ready() { state.ep0 = 1; epReadyGlow = 1.2; },
    trbPlace(o) {
      const idx = (o.n || 1) - 1;
      if (trbCards[idx]) trbCards[idx].visible = true;
    },
    trbClear() { trbCards.forEach((c) => (c.visible = false)); },
    descTray() {
      for (let i = 0; i < 2; i++) {
        const c = box(0.9, 0.06, 0.55, mats().paper, root.trayDescW.x + (i - 0.5) * 0.2, root.trayDescW.y + i * 0.07, root.trayDescW.z);
        c.visible = true;
        root.group.add(c);
        descCards.push(c);
      }
      state.devScreen = "描述符数据已交付";
      repaint("devScreen");
    },
    epLights() {
      epReadyGlow = 1.6;
      state.devScreen = "管道全通 · 各 EP 环可调度";
      repaint("devScreen");
    },
    alarmEvent() {
      A.evCard({ label: "命令完成事件·Completion Code=Parameter Error（参数错误）", toDesk: true });
    },
  };

  let receipts = 0;
  function receiptsBump() {
    receipts += 1;
    state.receipts = receipts;
    repaint("stat");
  }

  // ---------- 标签锚点（HTML overlay 用） ----------
  const labels = [
    { id: "zone-sw", text: "xHCI 驱动 · 文书台", p: [-14.5, 7.1, 0.3], cls: "zone" },
    { id: "lbl-form", text: "输入上下文表格卡", p: [-13.3, 5.8, 1.05], cls: "item" },
    { id: "lbl-tray", text: "事件匣", p: [-16.5, 3.75, -0.95], cls: "item" },
    { id: "lbl-desc", text: "描述符收件匣", p: [-15.0, 2.85, 1.8], cls: "item" },
    { id: "zone-hc", text: "xHC 控制器 · 总控台", p: [0, 10.4, 1.2], cls: "zone" },
    { id: "lbl-portsc", text: "PORTSC 读数屏", p: [-2.6, 8.85, -1.4], cls: "item" },
    { id: "lbl-dcbaa", text: "DCBAA 格架 · 软件装载", p: [-3.1, 3.1, 0.7], cls: "item" },
    { id: "lbl-ep0", text: "EP0 传输环", p: [1.7, 1.95, 1.6], cls: "item" },
    { id: "lbl-belt", text: "事件环传送带", p: [-2.3, 5.7, 1.05], cls: "item" },
    { id: "lbl-bells", text: "命令收件口 · 门铃排", p: [1.9, 4.5, 1.2], cls: "item" },
    { id: "lbl-ports", text: "根端口排", p: [6.2, 3.3, 0.2], cls: "item" },
    { id: "lbl-cable", text: "总线缆 · USB 请求唯一通道", p: [8.8, 1.4, 1.6], cls: "item" },
    { id: "zone-dev", text: "USB 设备 · 试验盒", p: [13, 4.7, 1.4], cls: "zone" },
    { id: "lbl-plate", text: "只见 USB 请求与总线事件——槽/环/上下文对设备不可见", p: [11.8, 3.2, 2.3], cls: "plate" },
  ];

  // ---------- 每帧 ----------
  function update(dt, elapsed) {
    // 传送带滑板
    if (belt.curve) {
      const n = belt.slats.length;
      for (let i = 0; i < n; i++) {
        const u = ((i / n) + elapsed * belt.speed * 0.02) % 1;
        const p = belt.curve.getPointAt(u);
        belt.slats[i].position.copy(p);
        const tan = belt.curve.getTangentAt(u);
        belt.slats[i].rotation.y = Math.atan2(tan.x, tan.z);
      }
    }
    // 飞行动件
    for (let i = movers.length - 1; i >= 0; i--) {
      const m = movers[i];
      if (m.hold !== undefined) {
        m.hold -= dt;
        if (m.hold <= 0) { root.group.remove(m.mesh); movers.splice(i, 1); }
        continue;
      }
      if (m.belt) {
        m.bt += dt / m.btDur;
        const u = 0.94 - m.bt * 0.88;
        const p = belt.curve.getPointAt(Math.max(u, 0.06));
        m.mesh.position.set(p.x, p.y + 0.18, p.z);
        if (m.bt >= 1) {
          movers.splice(i, 1);
          if (m.onDone) m.onDone(); // 续程由 onDone 接管（flyAlong 沿回流管）
        }
        continue;
      }
      m.t += dt / m.dur;
      const u = Math.min(m.t, 1);
      const p = m.curve.getPointAt(u);
      let y = p.y;
      if (m.arc) y += Math.sin(u * Math.PI) * m.arc;
      m.mesh.position.set(p.x, y, p.z);
      if (m.ring) { m.mesh.rotation.x += dt * 6; m.mesh.rotation.z = Math.PI / 2; }
      else if (m.mesh.material && m.mesh.material.length) m.mesh.rotation.y = Math.sin(u * 6) * 0.1;
      if (m.t >= 1) {
        if (m.ring) m.mesh.visible = false;
        else root.group.remove(m.mesh);
        movers.splice(i, 1);
        if (m.onDone) m.onDone();
      }
    }
    // 门铃按压回弹
    for (const k of Object.keys(bells.press)) {
      const v = bells.press[k];
      const mesh = bells[k === "b0" ? "b0" : "b1"];
      if (mesh) mesh.scale.y = 1 - Math.max(v, 0) * 1.6;
      bells.press[k] = Math.max(0, v - dt * 1.4);
    }
    // 就绪灯呼吸
    if (epReadyLamp) {
      epReadyLamp.material.emissive = new T.Color(0x86bd7a);
      epReadyLamp.material.emissiveIntensity = (state.ep0 ? 0.55 : 0.05) + Math.sin(elapsed * 2.2) * 0.12 + (epReadyGlow || 0);
    }
    // 读屏闪烁
    const ps = screens.portsc;
    if (ps.flash > 0) {
      ps.flash -= dt * 1.6;
      ps.canvas.style = ps.canvas.style; // noop
      const boost = Math.max(ps.flash, 0);
      if (boost > 0) {
        const c = ps.ctx;
        c.fillStyle = `rgba(124,159,240,${0.18 * boost})`;
        c.fillRect(0, 0, ps.px, ps.py);
        ps.tex.needsUpdate = true;
      } else repaint("portsc");
    }
  }

  // ---------- 复位 ----------
  function reset() {
    state.flags = { ccs: 0, csc: 0, pr: 0, prc: 0, ped: 0 };
    state.pls = "—"; state.speed = "—"; state.slot = "—"; state.mps = "—";
    state.dev = "off"; state.formFilled = 0; state.ep0 = 0; state.dcbaa = 0;
    state.devScreen = "—— 待机 ——";
    receipts = 0; state.receipts = 0;
    for (const m of movers.slice()) {
      if (m.mesh !== resetRing) root.group.remove(m.mesh);
    }
    movers.length = 0;
    cablePlugged.visible = false;
    cableDangling.visible = true;
    plugHead.visible = true;
    portRing.visible = false;
    outctxCard.visible = false;
    trbCards.forEach((c) => (c.visible = false));
    descCards.forEach((c) => root.group.remove(c));
    descCards.length = 0;
    epReadyGlow = 0;
    Object.keys(screens).forEach((k) => repaint(k));
  }

  function build(THREE, scene) {
    T = THREE;
    const g = new T.Group();
    root.group = g;
    buildWorld(g);
    buildLights(g);
    buildDesk(g);
    buildCabinet(g);
    buildDevice(g);
    buildCable(g);
    scene.add(g);
    Object.keys(screens).forEach((k) => repaint(k));
    return { labels, group: g };
  }

  return {
    build, update, actions: A, reset, labels, state, screens, receiptsBump,
    setInstant(v) { instant = v; },
    setParticles(v) {
      particlesOn = v;
      belt.slats.forEach((s) => (s.visible = v));
    },
    setCutaway(v) { if (frontWall) frontWall.visible = !v; },
    blankForm() { state.formFilled = 0; repaint("form"); },
  };
})();

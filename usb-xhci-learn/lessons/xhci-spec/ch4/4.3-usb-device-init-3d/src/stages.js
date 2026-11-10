/* stages.js —— V3 工段编译器：timeline.stages（DSL）→ [t,fn,arg] 步序 + 预设/变体 + 面板内容
 * 时长全部取 X43D（timeline.params，速度模型 /k ×k 贯通）；工段总时长不写死（d31）。
 * state[]/flow[] 的规范语义值逐字渲染（含 s1 锚）；variants/branches/contrastCards 照 DSL branches。 */
const X43Stages = (() => {
  const D = X43D;
  const DSLST = D.D.timeline.stages;

  // 每工段活指标（从 DSL state[] 语义值推导；回执 n=累计到Desk事件卡数）
  const METRICS = {
    F0: { dev: "未接", slot: "—", pls: "—", receipts: 0, hot: [] },
    F1: { dev: "Powered", devNote: "已上电", slot: "—", pls: "7", receipts: 1, hot: ["pls"] },
    F2: { dev: "Powered", devNote: "已上电", slot: "—", pls: "复位", receipts: 1, hot: ["pls"] },
    F3: { dev: "Default", devNote: "默认态", slot: "—", pls: "U0", receipts: 2, hot: ["pls", "dev"] },
    F4: { dev: "Default", devNote: "默认态", slot: "Enabled", slotNote: "已使能", pls: "U0", receipts: 3, hot: ["slot", "receipts"] },
    F5: { dev: "Default", devNote: "默认态", slot: "Enabled", slotNote: "已使能", pls: "U0", receipts: 3, hot: [] },
    F6: { dev: "Address", devNote: "已编址", slot: "Addressed", slotNote: "已编址", pls: "U0", receipts: 4, hot: ["dev", "slot"] },
    F7: { dev: "Address", devNote: "已编址", slot: "Addressed", slotNote: "已编址", pls: "U0", receipts: 5, hot: ["receipts"] },
    F8: { dev: "Address", devNote: "已编址", slot: "Addressed", slotNote: "已编址", pls: "U0", receipts: 6, hot: ["receipts"] },
    F9: { dev: "Address", devNote: "已编址", slot: "Addressed", slotNote: "已编址", pls: "U0", receipts: 7, hot: ["receipts"] },
    F10: { dev: "Configured", devNote: "已配置", slot: "Configured", slotNote: "已配置", pls: "U0", receipts: 8, hot: ["dev", "slot"] },
    F11: { dev: "Configured", devNote: "已配置", slot: "Configured", slotNote: "已配置", pls: "U0", receipts: 8, hot: ["receipts"] },
  };

  // RuntimeStatus 活文案（逐字出自 DSL state[]/moves 语义）
  const RUNTIME = {
    F0: "端口 1 上电待检（PP='1'，Disconnected）——等待设备插入；三环空转慢巡航",
    F1: "设备滑入 → 插头推入端口 1 → 端口灯亮：Disabled（USB2）· CCS=1 · CSC=1 → PSCEG 0→1 跳变 → 事件卡生成",
    F2: "驱动读 PORTSC（CCS=1 确认插入）→ 写 PR=1：端口复位开始（注意：读见变化位 ≠ 事件已入环，p292 Note）",
    F3: "复位完成四信号：PRC=1 · PED=1 · PR=0 · PLS=U0；Port Speed=FS；设备 Powered→Default",
    F4: "Enable Slot 命令单入命令环 slot 7 → 按 DB Target=0 → 回执 Slot ID=1（示例，xHC 自选）→ 输出上下文挂 DCBAA 1 号格",
    F5: "Input Context 两页表格卡填格（A0=1·A1=1 / Slot 三格 / EP0 九格）→ EP0 传输环上架（xhci-mem.c:1010）",
    F6: "Address Device（BSR=0）→ xHC 代发 SET_ADDRESS 东行 → 设备 Default→Address、槽 Enabled→Addressed",
    F7: "GET_DESCRIPTOR 三 TRB 依次写入 EP0 环（cycle 从 PCS=1 起）→ 按 DB Target=1 → 8 字节回包西行 → bMaxPacketSize0=8 读出",
    F8: "Evaluate Context（A1=1）→ EP0 MPS 更新生效=8 → 事件环回执",
    F9: "GET_DESCRIPTOR 完整描述符：三段 TD 快速版 → 回包西行 → 描述符卡叠入收件匣（交给 Class Driver）",
    F10: "Configure Endpoint 命令 + SET_CONFIGURATION 请求双票据并行（航线 z 分层）——双操作同成才升级（p74）",
    F11: "管道全通：EP0 环持续流动、缆方波空闲微光、四态灯 Configured 绿亮——初始化完成",
  };

  const bell = (target) => ({ do: "bellPress", target: target === 1 ? "bell1" : "bell0" });

  // 变体步序（branches.overrides 的语义展开；数值全部出自 DSL/S1 已核值）
  const VARIANT_STEPS = {
    usb3_F1: () => [
      [0.4, "deviceSlideIn", {}],
      [2.9, "plugPush", {}],
      [3.9, "portLight", {}],
      [4.5, "portFlags", { ccs: 1, pedUsb3: 1 }],
      [4.5, "pls", { v: "0" }],
      [4.5, "speed", { v: "SS" }],
      [4.5, "lampSwitch", { target: "deviceLampRow: →Default", to: "Default" }],
      [5.0, "say", { t: "USB3 端口 Polling→Enabled 自动（PED=1 · PR=0 · PLS=0）——无 Disabled 帧、无软件复位" }],
      [5.4, "evCard", { label: "端口状态变化事件", toDesk: true, from: "PORTSC · PSCEG 0→1", to: "事件环 → 驱动读取" }],
      [6.0, "irqFlash", {}],
      [7.0, "done", {}],
    ],
    bsr1_F6: () => [
      [0.5, "bsrTurn", { to: "1" }],
      [1.4, "cmdFly", { card: "Address Device · BSR=1" }],
      [3.1, "bellPress", { target: "bell0" }],
      [3.6, "say", { t: "Address Device（BSR=1）：EP0 先启用，xHC 被禁止发 SET_ADDRESS" }],
      [4.0, "evCard", { label: "命令完成事件 · Success", toDesk: true, from: "xHC 命令完成", to: "事件环 → 驱动读取" }],
      [4.6, "irqFlash", {}],
      [5.0, "lampSwitch", { target: "slotLampRow: Enabled→Default", to: "Default" }],
      [5.6, "say", { t: "槽 Enabled→Default（BSR=1 单分支结局）——通信后需再发 BSR=0 补编址（p76–77）" }],
      [7.2, "done", {}],
    ],
    linux_F8: () => [
      [0.5, "bsrTurn", { to: "0" }],
      [1.4, "cmdFly", { card: "Address Device · BSR=0 补编址" }],
      [3.1, "bellPress", { target: "bell0" }],
      [3.6, "ticketEast", { text: "SET_ADDRESS · 地址=1（xHC 代发）" }],
      [5.2, "domeColor", { emissive: 1.9 }],
      [5.8, "plateFlip", {}],
      [6.6, "flipHold", {}],
      [7.0, "lampSwitch", { target: "deviceLampRow: Default→Address", to: "Address" }],
      [7.0, "lampSwitch", { target: "slotLampRow: Default→Addressed", to: "Addressed" }],
      [7.4, "say", { t: "BSR=0 补编址完成：槽 Default→Addressed。驱动不重写 EP0 MPS（初值按速度一次写入——xhci-mem.c:1125–1128）" }],
      [7.8, "evCard", { label: "命令完成事件 · Success", toDesk: true, from: "xHC 命令完成", to: "事件环 → 驱动读取" }],
      [8.4, "irqFlash", {}],
      [10.6, "done", {}],
    ],
  };

  // 主线步序编译（12 工段；时长=X43D.base）
  function compileSteps(id) {
    const B = (p) => D.base(p);
    let t = 0;
    const steps = [];
    const push = (fn, arg) => steps.push([Math.round(t * 100) / 100, fn, arg || {}]);
    const adv = (dt) => { t += dt; };
    const say = (tt) => push("say", { t: tt });

    if (id === "F0") {
      push("waveIdle", {}); push("ringIdleCruise", {}); push("dmaBeamIdle", {}); push("lampBreath", {});
      say("三区三方同场：文书台（驱动）· 总控台（xHC）· 试验盒（设备）；三环慢巡航，缆方波空闲微光");
      adv(0.4); push("done", {});
      return steps;
    }
    if (id === "F1") {
      adv(0.4); push("deviceSlideIn", {}); adv(B("DEV_SLIDE_IN"));
      push("plugPush", {}); adv(B("PLUG_PUSH"));
      push("portLight", {}); adv(B("PORT_LIGHT"));
      push("triggerPull", {}); adv(B("TRIGGER_PULL"));
      push("portFlags", { ccs: 1, csc: 1 }); push("pls", { v: "7" });
      push("lampSwitch", { target: "deviceLampRow: →Powered", to: "Powered" });
      say("插头到位：端口 1 → Disabled（USB2）· CCS=1 · CSC=1；PSCEG 0→1 跳变才产生事件（p71/p292）");
      adv(0.5);
      push("evCard", { label: "端口状态变化事件", toDesk: true, from: "PORTSC · PSCEG 0→1 跳变（p71）", to: "事件环 → 驱动读取 · Port Status Change Event" });
      adv(0.4); push("irqFlash", {});
      adv(1.4); push("done", {});
      return steps;
    }
    if (id === "F2") {
      adv(0.4); push("lineFlash", {}); adv(B("LINE_FLASH"));
      say("驱动读 PORTSC：CCS=1 确认插入（读见变化位 ≠ 事件已入环——p292 Note 同步性警告）");
      adv(0.6); push("buttonPress", {}); adv(B("RESET_PRESS"));
      push("portFlags", { pr: 1 }); push("pls", { v: "复位" });
      say("软件写 PR=1：端口复位开始（p75 §4.3.1 步 1）；PLS 屏显「复位」文字非数值（规范未给，不造数）");
      adv(1.2); push("done", {});
      return steps;
    }
    if (id === "F3") {
      adv(0.4); push("breathe", {}); adv(0.2);
      push("signalQuad", { order: ["PRC=1", "PED=1", "PR=0", "PLS=U0"] }); adv(B("SIG_INTERVAL") * 4);
      push("speed", { v: "FS" });
      push("lampSwitch", { target: "deviceLampRow: Powered→Default", to: "Default" });
      say("复位完成四信号：PRC=1 · PED=1 · PR=0 · PLS=U0（一个不能少）；Port Speed=FS；复位把设备送入 Default 态（p72）");
      adv(0.4);
      push("evCard", { label: "端口状态变化事件（PRC）", toDesk: true, from: "复位完成 · PSCEG 0→1", to: "事件环 → 驱动读取 · PRC=1" });
      adv(0.4); push("irqFlash", {});
      adv(1.6); push("done", {});
      return steps;
    }
    if (id === "F4") {
      adv(0.5); push("cmdFly", { card: "Enable Slot" }); adv(B("CMD_FLY"));
      push("bellPress", { target: "bell0" }); adv(B("BELL_PRESS"));
      push("drawerPick", {}); adv(B("DRAWER_PICK"));
      say("Enable Slot 命令单入环 slot 7 → 按 DB Target=0（命令门铃）→ xHC 抽空白槽卡");
      adv(0.3);
      push("evCard", { label: "命令完成事件 · Slot ID=1", toDesk: true, from: "xHC · 自选 Slot ID=1（p75）", to: "事件环 → 驱动读取" });
      adv(0.4); push("irqFlash", {});
      push("gridHang", {}); adv(B("GRID_HANG"));
      push("lampSwitch", { target: "slotLampRow: Disabled→Enabled（双色灯切芯）", to: "Enabled" });
      push("dcbaaWindowOn", {});
      say("回执 Slot ID=1（示例值）；输出上下文卡飞挂 DCBAA 1 号格——表项由软件装载（xHC 只读，p76 步 7）");
      adv(1.0); push("done", {});
      return steps;
    }
    if (id === "F5") {
      adv(0.5); push("tickCheck", { target: "inputCtx.A0/A1" }); adv(B("TICK_CHECK"));
      say("输入控制上下文 A0=1 · A1=1（Slot 与 EP0 同时受影响，p75–76）");
      for (let i = 0; i < 3; i++) { push("cellFill", { target: "slotCard", cells: ["1"], n: i }); adv(B("CELL_FILL")); }
      say("Slot Context：端口号 1 · Route String=0（不含端口号，脚注 8）· Context Entries=1");
      for (let i = 0; i < 9; i++) { push("cellFill", { target: "ep0Card", cells: ["1"] }); adv(B("CELL_FILL")); }
      push("ringMount", {}); adv(B("RING_MOUNT"));
      push("dcbaaNote", {});
      say("EP0 Context 九格填毕（MPS=按端口速度默认〔样例 FS=8〕·TR Deq=环首段·DCS=1·CErr=3）；EP0 传输环上架（xhci-mem.c:1010）");
      adv(1.2); push("done", {});
      return steps;
    }
    if (id === "F6") {
      adv(0.5); push("bsrTurn", { to: "0" }); adv(B("BSR_TURN"));
      push("cmdFly", { card: "Address Device · BSR=0（BSR 位与 Slot ID 同在 word3）" }); adv(B("CMD_FLY"));
      push("bellPress", { target: "bell0" }); adv(B("BELL_PRESS"));
      say("Address Device（BSR=0）入命令环——第一个 USB 请求来自 xHC，不是驱动（教学锚）");
      adv(0.3);
      push("ticketEast", { text: "SET_ADDRESS · 地址=1（xHC 代发）" });
      adv(1.4);
      push("domeColor", { emissive: 1.9 }); adv(B("DOME_COLOR"));
      push("plateFlip", {}); adv(B("PLATE_FLIP"));
      push("flipHold", {}); adv(B("FLIP_HOLD"));
      push("lampSwitch", { target: "deviceLampRow: Default→Address", to: "Address" });
      push("lampSwitch", { target: "slotLampRow: Enabled→Addressed", to: "Addressed" });
      say("SET_ADDRESS 已送达：设备 Default→Address（顶灯换色·铭牌翻面地址 1）；槽 Enabled→Addressed（p77）");
      adv(0.4);
      push("evCard", { label: "命令完成事件 · Success（p74）", toDesk: true, from: "Address Device · BSR=0", to: "事件环 → 驱动读取" });
      adv(0.4); push("irqFlash", {});
      adv(1.6); push("done", {});
      return steps;
    }
    if (id === "F7") {
      adv(0.4); push("gateLight", {});
      push("dmaBeam", { to: "ep0" });
      adv(0.3);
      push("trbPlace", { target: "ringEp0.slot5/6/7", cards: ["Setup·TRT=3 IDT=1 IOC=0", "Data·DIR=1 Len=8", "Status·DIR=0 IOC=1"] });
      adv(B("TRB_PLACE") * 3 + B("DMA_BEAM"));
      push("bellPress", { target: "bell1" }); adv(B("BELL_PRESS"));
      say("三 TRB 写入 EP0 环（DMA 可见写，cycle 从 PCS=1 起）→ 按 DB Target=1（EP0，DCI=1）");
      adv(0.3);
      push("ticketEast", { text: "GET_DESCRIPTOR · 请求" });
      adv(1.5);
      push("ticketWest", { text: "8 字节 · bMaxPacketSize0=8" });
      adv(1.5);
      push("dmaFlash", {});
      push("trayPop", {}); adv(B("TRAY_POP"));
      say("8 字节回包落托盘（bMaxPacketSize0=8 读出）——仅 FS 必走此步（LS/HS/SS 8/64/512 直接绕行，p72）");
      adv(0.4);
      push("evCard", { label: "传输事件 · Status 段（IOC=1）· Success", toDesk: true, from: "设备 · 8 字节回包", to: "事件环 → 驱动读取 · Status 段" });
      adv(0.4); push("irqFlash", {});
      adv(1.6); push("done", {});
      return steps;
    }
    if (id === "F8") {
      adv(0.5); push("cmdFly", { card: "Evaluate Context · A1=1" }); adv(B("CMD_FLY"));
      push("bellPress", { target: "bell0" }); adv(B("BELL_PRESS"));
      push("mpsFlash", {}); adv(D.ref("derived:d14"));
      say("Evaluate Context（A1=1）：EP0 MPS 格翻新高亮——更新生效=8（p74 步 ix/x）");
      adv(0.3);
      push("evCard", { label: "命令完成事件 · Success", toDesk: true, from: "Evaluate Context · A1=1", to: "事件环 → 驱动读取" });
      adv(0.4); push("irqFlash", {});
      adv(1.6); push("done", {});
      return steps;
    }
    if (id === "F9") {
      adv(0.5); push("tdFast", {});
      adv(0.5); push("ticketWest", { text: "GET_DESCRIPTOR · 完整描述符" });
      adv(1.6); push("inboxStack", {}); adv(B("INBOX_STACK"));
      say("描述符卡叠入收件匣（叠卡翻摞）——交给 Class Driver 注记；描述符字节数 S1 未给，不造数");
      adv(0.4);
      push("evCard", { label: "传输事件 · Success", toDesk: true, from: "GET_DESCRIPTOR · 完整描述符", to: "事件环 → 驱动读取" });
      adv(0.4); push("irqFlash", {});
      adv(1.6); push("done", {});
      return steps;
    }
    if (id === "F10") {
      adv(0.5);
      push("dualFly", { lanes: [
        { card: "Configure Endpoint 命令单（DC=0）", route: "printer→ringCmd.slot7", zOffset: 0.8 },
        { card: "SET_CONFIGURATION 请求票据", route: "cable east", zOffset: 1.2 },
      ] });
      adv(B("DUAL_FLY"));
      push("lampSwitch", { target: "deviceLampRow: Address→Configured（绿）", to: "Configured" });
      push("lampSwitch", { target: "slotLampRow: Addressed→Configured", to: "Configured" });
      push("epSlotsAllLit", {});
      say("双操作同成才升级，缺一不可（p74）：设备 Address→Configured · 槽 Addressed→Configured 同步翻转；EP 环全槽点亮可调度");
      adv(0.4);
      push("evCard", { label: "命令完成 + 传输事件 · 双成功", toDesk: true, from: "Configure Endpoint + SET_CONFIGURATION", to: "事件环 → 驱动读取" });
      adv(0.4); push("irqFlash", {});
      adv(1.6); push("done", {});
      return steps;
    }
    if (id === "F11") {
      push("ringFlow", {});
      push("waveIdle", {}); push("ringIdleCruise", {}); push("lampBreath", {});
      say("初始化完成：管道全通（EP0 环演示性流转）——试着做几道自测题，或切分支预设对比观察");
      adv(0.6); push("done", {});
      return steps;
    }
    throw new Error("未知工段 " + id);
  }

  function variantStepsFor(presetId, stageId) {
    const key = presetId + "_" + stageId;
    if (VARIANT_STEPS[key]) return VARIANT_STEPS[key]();
    return null;
  }

  // ---------- 预设（timeline.branches 全量接线） ----------
  const BR = D.D.timeline.branches;
  const PRESETS = BR.chips.map((c) => ({
    id: c.id,
    name: c.label,
    tag: c.tag || "",
    skip: c.id === "hs" ? [7, 8] : c.id === "usb3" ? [2, 3, 7, 8] : [],
  }));
  const CONTRAST = BR.contrastCards;

  // ---------- 面板内容编译（DSL panel 分区 + s1 锚逐字） ----------
  function stageCards(id) {
    const st = DSLST.find((s) => s.id === id);
    const cards = [];
    const pts = String(st.panel || "").split("；").map((s) => s.trim()).filter(Boolean);
    cards.push({ h3: "本工段要点", p: pts.map((p) => "· " + p).join("<br>") });
    if (st.state && st.state.length) {
      cards.push({
        h3: "场景状态（规范语义值）",
        p: st.state.map((s) => {
          const txt = s.set || (s.do === "receipt" ? "回执 " + s.value : s.do === "readout" ? "读出 " + s.value : s.text || "");
          return "· " + txt + (s.s1 ? " <span class='x43-anchor'>[" + s.s1 + "]</span>" : "");
        }).join("<br>"),
      });
    }
    if (st.flow && st.flow.length) {
      cards.push({
        h3: "流转路径",
        p: st.flow.map((f) => "· 起 ▸ " + f.from + "　终 ▸ " + f.to).join("<br>"),
      });
    }
    if (st.teachingAnchor) cards.push({ h3: "三方教学锚", p: st.teachingAnchor, anchorCard: true });
    if (st.physical) cards.push({ h3: "物理动作感瞬间", p: st.physical });
    if (st.panel && st.panel.indexOf("MPS 三口径") >= 0) {
      cards.push({ h3: "MPS 三口径（三者不互冒）", p: "规范规则：读 bMaxPacketSize0 更新（p72/p98）· 样例值：FS=8 · 驱动初猜：64（xhci-mem.c:1125–1128）" });
    }
    return cards;
  }

  const FIELD_CARDS = [
    {
      h3: "GET_DESCRIPTOR(Device) · 前 8 字节 · 三 TRB 字段组",
      note: "控制读 Status 段方向=OUT（DIR=0）",
      rows: [
        ["Setup Stage TRB", "TRT=IN Data Stage(3) · Length=8 · IDT=1 · IOC=0 · bmRequestType=80h · bRequest=6 · wValue=0100h · wIndex=0 · wLength=8"],
        ["Data Stage TRB", "DIR=1 · Length=8 · CH=0 · IOC=0 · IDT=0"],
        ["Status Stage TRB", "DIR=0 · Length=0 · CH=0 · IOC=1 · IDT=0 · Buffer=0"],
      ],
      src: "xHCI 1.2b §4.3 步 7.a p73（S1 §3.2 逐值）",
    },
    {
      h3: "EP0 Context 九字段",
      note: "Max Packet Size=按端口速度默认值（FS=8 / HS=64 / SS=512）",
      rows: [
        ["EP Type / MPS", "Control / 按端口速度默认〔样例 8〕"],
        ["Max Burst / CErr", "0 / 3"],
        ["TR Dequeue Ptr / DCS", "EP0 传输环首段 / 1"],
        ["Interval / MaxPStreams / Mult", "0 / 0 / 0"],
      ],
      src: "xHCI 1.2b §4.3.3 p76（S1 §5.1 表）",
    },
    {
      h3: "槽状态五行表（Table 4-1）",
      note: "Enabled 与 Disabled 共用编码 '0'——看 DCBAA 指针是否有效分辨（p87）",
      header: ["槽态", "设备态", "可提交?", "已编址?", "地址", "DCBAA 指针", "状态名"],
      rows: D.D.panel.tabs.fields.fieldCards.find((f) => f.id === "slotStates").rows,
      src: "xHCI 1.2b §6.2 Table 4-1 p85–86（S1 §6.2 五行全值）",
    },
  ];

  const NUMERIC_TABLE = D.D.panel.tabs.fields.numericTable;
  const PRINCIPLES = [
    { h3: "三方各管一段（流程原理）", p: "数据结构全由软件准备：输入上下文、EP0 传输环、DCBAA 表项都是软件装载、xHC 只读；xHC 执行命令，需要时在总线上代发 USB 请求；设备只看见 USB 请求与总线事件——槽/环/上下文对它不可见。" },
    { h3: "「Linux 实路径」与规范建议路径（三点差异）", p: "BSR=1 先通信 · BSR=0 后编址 · 不重写 MPS（S1 §6.3，hub.c:5056–5061/4785–4790；Evaluate Context 不在枚举链）。切到该预设可在 F6/F7/F8 看到注记卡。" },
    { h3: "中断（可选）与轮询", p: "事件环有事件待取时可用中断通知驱动，也可以轮询事件环运行（p69 脚注 7）——本台闪线与轮询滑车双形态并存，中断不是唯一形态。" },
    { h3: "hub 与 TT：逐层初始化", p: "多级拓扑必须从根集线器起，把每一层的 hub 与 TT 完全初始化后再处理下一层，否则 xHC 行为未定义（p74 Note）——本台只演示根端口直连设备。" },
  ];

  // 原文对照六条（S5 定稿：en 各段逐字核验=规范提取文本，dev/quote_verify.py QUOTE-VERIFY-PASS；
  // 段间「/」=规范同页非连续句（quote 2 两句在 p72 不相邻，故拆段））
  const QUOTES = [
    { en: "“When the xHC detects a device attach, it shall set the Current Connect Status (CCS) and Connect Status Change (CSC) flags to ‘1’.”", zh: "插入由 xHC 检出：CCS 与 CSC 同时置 1。", src: "xHCI 1.2b §4.3 步 1 p71" },
    { en: "“The completion of the port reset shall cause the PORTSC register PRC and PED flags to be set (‘1’), the PR flag to be cleared (‘0’), and the PLS field to be U0 (‘0’).” / “The reset operation sets the USB2 device into the Default state, preparing it for a SET_ADDRESS request.”", zh: "USB2 复位完成是四信号组合：PRC=1、PED=1、PR=0、PLS=U0；复位把设备送入 Default 态，备好收 SET_ADDRESS。", src: "xHCI 1.2b §4.3 步 3.b p72" },
    { en: "“After the port successfully reaches the Enabled state, system software shall obtain a Device Slot for the newly attached device using an Enable Slot Command” / “The Enable Slot Command returns a Slot ID that is selected by the host controller.”", zh: "端口到 Enabled 后软件发 Enable Slot 取槽；Slot ID 由 xHC 自选，放在命令完成事件里交回。", src: "xHCI 1.2b §4.3 步 4 p72 · §4.3.2 p75" },
    { en: "“system software shall issue an Address Device Command with the Block Set Address Request (BSR) flag cleared to ‘0’” / “Successful completion of the Address Device Command with BSR = ‘0’ shall transition the Device Slot from the Enabled to the Addressed state.”", zh: "主线编址：Address Device 带 BSR=0，成功后槽 Enabled→Addressed、设备 Default→Address；SET_ADDRESS 由 xHC 在总线上代发。", src: "xHCI 1.2b §4.3.4 p76–77" },
    { en: "“For LS, HS, and SS devices; 8, 64, and 512 bytes, respectively, are the only packet sizes allowed for the Default Control Endpoint, so step a may be skipped. For FS devices, system software should initially read the first 8 bytes of the USB Device Descriptor to retrieve the value of the bMaxPacketSize0 field”", zh: "8 字节读取仅 FS 必走：LS/HS/SS 默认包长 8/64/512 已定，可跳过；FS 先读描述符前 8 字节取 bMaxPacketSize0。", src: "xHCI 1.2b §4.3 步 7 p72" },
    { en: "“The successful completion of both operations is required to advance the state of the USB device from Address to Configured and xHC Device Slot from Addressed to Configured.”", zh: "到 Configured 需要双操作同成：Configure Endpoint 命令成功且 SET_CONFIGURATION 请求成功，缺一不可。", src: "xHCI 1.2b §4.3 步 10 p74 · §4.3.5 p77" },
  ];

  // 自测题 5 题（S5 定稿：按 §K 递进阶梯出题——F0 认知→工段顺序→分支差异→试错→动手台经验；
  // 字段值/页码全引 S1 已核值，零发明；题面与解析不新增语言门计数（豁免词零新增））
  const QUIZ = [
    { q: "命令完成事件走哪条环，交回给软件？", opts: ["原命令环——原路返回", "事件环", "EP0 传输环"], ans: 1, why: "所有命令都以命令完成事件在事件环上报完成（p60）；全规范仅一条命令环（p68 原句 There is only one Command Ring）——完成事件绝不回命令环；EP0 传输环只走该槽的传输。" },
    { q: "Enable Slot 之后、Address Device 之前，软件必须先等到什么？", opts: ["无须等待——两条命令可以连发", "本槽的命令完成事件（Slot ID 随事件交回）", "设备的 8 字节回包"], ans: 1, why: "§4.3.2（p75）：须等本槽命令完成事件才可对同槽发后续命令；Slot ID 由 xHC 自选（p75）。8 字节读取是编址之后 FS 才走的支线（p72）。" },
    { q: "Address Device 带 BSR=1 且成功，设备槽进入哪个状态？", opts: ["Enabled → Addressed", "Enabled → Default", "保持 Enabled 不变"], ans: 1, why: "BSR=1：EP0 先启用但 xHC 被禁止发 SET_ADDRESS，成功后槽 Enabled→Default（p76–77）；主线 BSR=0 才是 Enabled→Addressed，通信后需再发 BSR=0 补编址（p76–77 Note）。" },
    { q: "F5 试错：输入上下文未填就抢发 Address Device，xHC 会？", opts: ["照常编址，交回 Slot ID", "回 Completion Code=Parameter Error，输出上下文不变", "把设备直接送入 Default 态"], ans: 1, why: "命令执行前校验输入上下文有效——无效上下文→Parameter Error，输出上下文卡不动（p100；S1 §7.2 条 10）。这正是「先填表后编址」顺序的存在理由。" },
    { q: "门铃分刻：EP0 传输的门铃是哪一个？", opts: ["门铃 0 · DB Target=0", "门铃 1 · DB Target=1（DCI=1）", "任意门铃都行"], ans: 1, why: "命令门铃=0 号（DB Target=0）；EP0 门铃=DB Target=1——DCI=(端点号×2)+1（p82–83；xhci.h:313–314）。两块分刻牌分开刻。" },
  ];

  const GROUPS = [
    { id: "g0", name: "总览", stages: [0] },
    { id: "g1", name: "连接", stages: [1, 2, 3] },
    { id: "g2", name: "登记", stages: [4, 5, 6] },
    { id: "g3", name: "配置", stages: [7, 8, 9, 10] },
    { id: "g4", name: "完工", stages: [11] },
  ];
  const SPEEDS = D.D.meta.speedModel.k.map((v) => ({ id: String(v), label: v + "×", v }));
  const META = D.D.meta.dsl;

  return {
    compileSteps, variantStepsFor, METRICS, RUNTIME, PRESETS, CONTRAST, GROUPS, SPEEDS, META,
    stageCards, FIELD_CARDS, NUMERIC_TABLE, PRINCIPLES, QUOTES, QUIZ,
    stageCount: DSLST.length,
  };
})();

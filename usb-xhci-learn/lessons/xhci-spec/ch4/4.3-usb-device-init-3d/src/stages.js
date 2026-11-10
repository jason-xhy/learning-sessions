/* stages.js —— 12 工段数据（设计档 §5：heeli 工段记录结构 {id,title,camera,metrics,cards,runtime}）
 * 内容唯一取材源：现行 4.3 页 build.mjs（12 帧帧序 / 六条引文 / 示例值 / 分支卡）。
 * 演示样例：FS 设备插 USB2 根端口 1；Slot ID=1 为示例值（xHC 自选，§4.3.2 p75 / §4.6.5 p97）。
 * 每条 steps: [时刻s, 动作名, 参数…]；动作解释器在 main.js。 */
const X43_META = {
  eyebrow: "xHCI 规范对照学习 · §4.3",
  title: "USB 设备初始化 · xHC 启机车间",
  subtitle: "一台全速（FS）设备插入 USB2 根端口 1，从插入到配置完工的登记全程",
  specref: "xHCI 1.2b §4.3 USB Device Initialization · p71–80",
};

const X43_GROUPS = [
  { id: "g0", name: "总览", stages: [0] },
  { id: "g1", name: "连接", stages: [1, 2, 3] },
  { id: "g2", name: "登记", stages: [4, 5, 6] },
  { id: "g3", name: "配置", stages: [7, 8, 9, 10] },
  { id: "g4", name: "完工", stages: [11] },
];

/* 预设 chips（设计档 §5 增补）：语义诚实映射避雷清单——
 * FS=教学全分支；HS/SS 跳过 8 字节读取与 Evaluate Context；USB3 attach 自动 Enabled、无端口复位帧；
 * BSR=1 legacy：先在 Default 态通信、xHC 被禁止发 SET_ADDRESS，通信完成后再用 BSR=0 编址（§4.3.4 p76–77）。 */
const X43_PRESETS = [
  { id: "fs", name: "全速设备 · 教学全分支", speed: "FS", mps: "8" },
  { id: "hs", name: "高速设备", speed: "HS", mps: "64", skip: [7, 8], variant: { 3: "hs" } },
  { id: "usb3", name: "USB3 设备", speed: "SS", mps: "512", skip: [2, 3, 7, 8], variant: { 1: "usb3" } },
  { id: "bsr1", name: "BSR=1 legacy", speed: "FS", mps: "8", skip: [], variant: { 6: "bsr1", 10: "bsr1" } },
];

const X43_CAM0 = { pos: [6.8, 12, 39], tgt: [6.8, 3.0, 0] };

const X43_STAGES = [
  {
    id: "F0", n: 0, group: 0, title: "总览", dur: 6,
    camera: { pos: [6.8, 12, 39], tgt: [6.8, 3.0, 0] },
    metrics: { dev: "未接", slot: "—", pls: "—", receipts: 0, hot: [] },
    runtime: "端口 1 上电待检（PP=1）——等待设备插入",
    cards: [
      { h3: "三方一台", p: "左区文书台是 xHCI 驱动（规范原文称 system software，系统软件）：写寄存器、发命令单、收事件回执；中区 xHC 总控台执行命令、维护端口与槽；右区设备试验盒从头到尾只看见 USB 请求与总线事件——槽、环、上下文对它不可见。" },
      { h3: "演示样例", p: "FS 设备插入 USB2 根端口 1（教学最全分支：必须走端口复位，也必走 8 字节描述符读取）。Slot ID=1 与新地址 1 为示例值，实际由 xHC 自选。" },
      { h3: "主线一览", p: "检出插入 → 软件做端口复位 → Enable Slot 取槽 → 填输入上下文 → Address Device 编址 → 读描述符 → Configure Endpoint 与 SET_CONFIGURATION 双操作同成。用底栏工段条或「单步」逐段走。" },
    ],
    steps: [],
  },
  {
    id: "F1", n: 1, group: 1, title: "插入检测", dur: 9,
    camera: { pos: [7.6, 4.8, 14.2], tgt: [10.4, 2.2, 0.5] },
    metrics: { dev: "Powered", devNote: "已上电", slot: "—", pls: "7", receipts: 1, hot: ["pls"] },
    runtime: "设备插入端口 1 → 端口进 Disabled（USB2）→ CCS=1 · CSC=1 → 端口状态变化事件发出",
    cards: [
      { h3: "xHC 检出插入", p: "USB2 协议端口收到设备后前进到 Disabled 态（USB2 规范的 Disabled 态），同时把 Current Connect Status（CCS）与 Connect Status Change（CSC）置 1。注意：USB3 端口与 USB2 端口的 Disabled 态含义不同——USB3 指 DSPORT.Disabled，涉及时分开表述。" },
      { h3: "事件怎么回家", p: "CSC 置 1 若造成 PSCEG（Port Status Change Event Generation）0→1 跳变，xHC 才生成一个端口状态变化事件——是跳变触发事件，不是状态位等于 1 就有事件。事件卡沿事件环传送带流向文书台的事件匣。" },
      { h3: "设备看见什么", p: "设备这一侧只感到上电（Powered），别无所见——插入检测是 xHC 与端口电气层的事。" },
    ],
    steps: [
      [0.4, "cablePlug", {}],
      [1.2, "say", { t: "设备插入：端口 1 电气检测中…" }],
      [2.2, "portFlags", { ccs: 1, csc: 1 }],
      [2.2, "pls", { v: "7" }],
      [2.2, "devLamp", { v: "powered" }],
      [3.2, "say", { t: "CCS=1 · CSC=1 已点亮；PSCEG 0→1 → 端口状态变化事件入事件环" }],
      [3.6, "evCard", { label: "端口状态变化事件", toDesk: true }],
      [6.8, "done", {}],
    ],
  },
  {
    id: "F2", n: 2, group: 1, title: "查端口", dur: 8,
    camera: { pos: [1.2, 7.6, 10.5], tgt: [-0.6, 6.6, -1.4] },
    metrics: { dev: "Powered", devNote: "已上电", slot: "—", pls: "复位", receipts: 1, hot: ["pls"] },
    runtime: "软件读 PORTSC（CCS=1）→ 写 PR=1 发起端口复位",
    cards: [
      { h3: "读 PORTSC", p: "驱动读事件环拿到端口状态变化事件，按 Port ID 找到端口 1，再读它的 PORTSC 寄存器：CCS=1 确认是插入而不是拔出。" },
      { h3: "写 PR=1", p: "USB2 端口必须由软件发起端口复位才能到 Enabled——这与 USB3 端口 attach 成功自动到 Enabled 是两条路径，不得混同。驱动向 PORTSC 的 PR 位写 1，复位脉冲发向端口。" },
      { h3: "复位期间", p: "PORTSC 的 PLS 显示「复位」是文字提示不是数值——规范未给 USB2 复位期间的 PLS 数值，此处不造数。" },
    ],
    steps: [
      [0.4, "portRead", {}],
      [1.6, "say", { t: "读 PORTSC：CCS=1，确认为插入事件" }],
      [2.6, "regWrite", {}],
      [3.4, "portFlags", { pr: 1 }],
      [3.4, "pls", { v: "复位" }],
      [4.2, "say", { t: "写 PR=1：端口复位进行中（USB2 必须软件复位）" }],
      [4.6, "resetPulse", {}],
      [7.2, "done", {}],
    ],
  },
  {
    id: "F3", n: 3, group: 1, title: "端口复位完成", dur: 9,
    camera: { pos: [4.6, 6.4, 13], tgt: [3.2, 3.6, 0.6] },
    metrics: { dev: "Default", devNote: "默认态", slot: "—", pls: "U0", receipts: 2, hot: ["pls", "dev"] },
    runtime: "复位完成：PRC=1 · PED=1 · PR=0 · PLS=U0；Port Speed=FS；设备 Powered → Default",
    cards: [
      { h3: "四信号判据", p: "复位完成是四个信号的组合：PRC=1、PED=1、PR=0、PLS=U0（'0'）——一个不能少。PRC 置 1 造成 PSCEG 0→1 跳变，再产生一个端口状态变化事件回到驱动。" },
      { h3: "速度自报", p: "成功复位后，PORTSC 的 Port Speed 字段指示所接设备的速度——这里读出 FS。演示样例的 MPS 由此定为 8。" },
      { h3: "设备进入 Default", p: "复位把 USB2 设备送入 Default 态，备好收 SET_ADDRESS——设备灯从 Powered 跳到 Default。" },
    ],
    steps: [
      [0.4, "portFlags", { pr: 0, prc: 1, ped: 1 }],
      [0.4, "pls", { v: "U0" }],
      [0.4, "speed", { v: "FS" }],
      [1.2, "devLamp", { v: "default" }],
      [2.0, "say", { t: "复位完成四信号：PRC=1 · PED=1 · PR=0 · PLS=U0；Port Speed=FS" }],
      [2.6, "evCard", { label: "端口状态变化事件（PRC）", toDesk: true }],
      [6.4, "done", {}],
    ],
  },
  {
    id: "F4", n: 4, group: 2, title: "取槽", dur: 11,
    camera: { pos: [-2.2, 6.0, 10.8], tgt: [-1.4, 3.7, -0.2] },
    metrics: { dev: "Default", devNote: "默认态", slot: "Enabled", slotNote: "已使能", pls: "U0", receipts: 3, hot: ["slot", "receipts"] },
    runtime: "Enable Slot 命令单入命令环 → 按门铃 0 → 回执 Slot ID=1 → DCBAA 1 号格挂输出上下文",
    cards: [
      { h3: "一条命令环", p: "全规范只有一条命令环。驱动把 Enable Slot 命令单放上命令环，写门铃寄存器 0（DB Target=0，Host Controller Command）——它与 EP0 门铃（DB Target=1）语义不同，本台分开刻。" },
      { h3: "Slot ID=1（示例）", p: "端口到 Enabled 后，软件用 Enable Slot 命令为设备取一个设备槽；命令完成事件带回 Slot ID，由 xHC 自选——本演示固定示例值 1。成功后槽进 Enabled 态。" },
      { h3: "DCBAA 表项谁装载", p: "输出上下文卡由软件挂进设备上下文基地址数组（DCBAA）的 1 号格——表项由软件装载，xHC 只读。" },
    ],
    steps: [
      [0.5, "slip", { label: "Enable Slot" }],
      [2.2, "bell0", {}],
      [2.8, "say", { t: "Enable Slot 命令单沿命令环送达，门铃 0（DB Target=0）按下" }],
      [4.4, "evCard", { label: "命令完成事件 · Slot ID=1", toDesk: true }],
      [6.6, "slotLamp", { v: "Enabled" }],
      [7.4, "outctxFly", {}],
      [9.4, "say", { t: "回执 Slot ID=1（xHC 自选，示例值）；输出上下文已挂 DCBAA 1 号格（软件装载）" }],
      [10.4, "done", {}],
    ],
  },
  {
    id: "F5", n: 5, group: 2, title: "槽初始化", dur: 12,
    camera: { pos: [-10.2, 5.2, 9.8], tgt: [-13.4, 3.4, 0.8] },
    metrics: { dev: "Default", devNote: "默认态", slot: "Enabled", slotNote: "已使能", pls: "U0", receipts: 3, hot: [] },
    runtime: "填输入上下文（A0=1 · A1=1）→ EP0 传输环上架 → 备好 Address Device 命令单",
    cards: [
      { h3: "输入上下文置位", p: "软件分配输入上下文并全部清 0，再把输入控制上下文的 A0 与 A1 同时置 1——Slot Context 与 EP0 Context 都受本命令影响。" },
      { h3: "Slot Context 填格", p: "Root Hub Port Number=1（端口号）；Route String=0（根端口直连，Route String 不含端口号）；Context Entries=1。" },
      { h3: "EP0 Context 填格", p: "EP Type=Control；Max Packet Size=按端口速度的默认值（FS=8）；Max Burst=0；TR Dequeue Pointer=EP0 传输环首段；DCS=1；Interval=0；MaxPStreams=0；Mult=0；CErr=3。EP0 传输环上架后就绪灯亮。" },
      { h3: "试错入口", p: "此刻数据结构已备好。想看错误路径？点下方「试错：不填上下文直接编址」——用一张空表格卡抢发 Address Device，看 xHC 怎么回执。" },
    ],
    steps: [
      [0.6, "formFill", { n: 2 }],
      [1.8, "say", { t: "输入控制上下文：A0=1 · A1=1（Slot 与 EP0 同时受影响）" }],
      [2.6, "formFill", { n: 5 }],
      [4.2, "formFill", { n: 9 }],
      [5.8, "ep0Ready", {}],
      [6.6, "say", { t: "EP0 传输环上架，就绪灯亮；输入上下文九格填毕" }],
      [7.4, "slipPrep", { label: "Address Device" }],
      [11.4, "done", {}],
    ],
  },
  {
    id: "F6", n: 6, group: 2, title: "编址", dur: 12,
    camera: { pos: [8.2, 4.4, 13.6], tgt: [7.6, 2.4, 0.6] },
    metrics: { dev: "Address", devNote: "已编址", slot: "Addressed", slotNote: "已编址", pls: "U0", receipts: 4, hot: ["dev", "slot"] },
    runtime: "Address Device（BSR=0）→ xHC 在总线上代发 SET_ADDRESS → 设备 Default→Address、槽 Enabled→Addressed",
    cards: [
      { h3: "BSR=0 主线", p: "软件发 Address Device 命令并把 BSR（Block Set Address Request）标志清 0——这是主线编址。成功后设备槽从 Enabled 进 Addressed 态。" },
      { h3: "谁在发请求", p: "在总线上代发 SET_ADDRESS（新地址=1，示例值）的是 xHC，不是驱动——设备第一次收到 USB 请求，票据沿总线缆走到试验盒。" },
      { h3: "设备视角", p: "设备只看见一张 SET_ADDRESS 请求票据与自己的状态灯变化（Default→Address）；命令、槽、上下文它一概看不见。" },
    ],
    steps: [
      [0.5, "slip", { label: "Address Device · BSR=0" }],
      [2.4, "bell0", {}],
      [3.0, "say", { t: "Address Device（BSR=0）入命令环，门铃 0 按下" }],
      [4.2, "ticketOut", { text: "SET_ADDRESS · 地址=1" }],
      [6.2, "devLamp", { v: "address" }],
      [6.6, "slotLamp", { v: "Addressed" }],
      [7.2, "evCard", { label: "命令完成事件", toDesk: true }],
      [8.4, "say", { t: "SET_ADDRESS 已送达：设备 Default→Address；槽 Enabled→Addressed" }],
      [11.4, "done", {}],
    ],
  },
  {
    id: "F7", n: 7, group: 3, title: "问尺寸", dur: 13,
    camera: { pos: [4.5, 5.6, 12.8], tgt: [3.0, 3.4, 0.4] },
    metrics: { dev: "Address", devNote: "已编址", slot: "Addressed", slotNote: "已编址", pls: "U0", receipts: 5, hot: ["receipts"] },
    runtime: "GET_DESCRIPTOR 前 8 字节：Setup/Data/Status 三 TRB 入 EP0 环 → 门铃 1 → 回 8 字节票据",
    cards: [
      { h3: "仅 FS 必走", p: "LS/HS/SS 设备的 Default Control Endpoint 只允许 8/64/512 字节包，默认值已定，这一步可跳过；FS 设备必须先读 USB Device Descriptor 前 8 字节取 bMaxPacketSize0。" },
      { h3: "三 TRB 入环", p: "控制读需要 Setup Stage TD、Data Stage TD、Status Stage TD 依次入 EP0 传输环，然后按门铃 1（DB Target=1，EP0）——与命令门铃 0 语义不同。" },
      { h3: "读回什么", p: "试验盒回一张 8 字节描述符票据：bMaxPacketSize0=8。字段逐值见面板「规范字段卡」折叠节（Setup/Data/Status 三 TRB 字段组）。" },
    ],
    steps: [
      [0.5, "trbPlace", { n: 1, label: "Setup" }],
      [1.6, "trbPlace", { n: 2, label: "Data" }],
      [2.6, "trbPlace", { n: 3, label: "Status" }],
      [3.4, "bell1", {}],
      [4.0, "say", { t: "三 TRB 入 EP0 传输环，按门铃 1（DB Target=1 · EP0）" }],
      [4.8, "ticketOut", { text: "GET_DESCRIPTOR(Device) · 前 8 字节" }],
      [7.4, "ticketIn", { text: "8 字节 · bMaxPacketSize0=8" }],
      [9.6, "evCard", { label: "传输事件", toDesk: true }],
      [10.6, "say", { t: "8 字节描述符回执：bMaxPacketSize0=8（仅 FS 必走此步）" }],
      [11.9, "trbClear", {}],
      [12.4, "done", {}],
    ],
  },
  {
    id: "F8", n: 8, group: 3, title: "更新上下文", dur: 9,
    camera: { pos: [-3.2, 5.0, 9.8], tgt: [-0.6, 3.2, 0] },
    metrics: { dev: "Address", devNote: "已编址", slot: "Addressed", slotNote: "已编址", pls: "U0", receipts: 6, hot: ["receipts"] },
    runtime: "Evaluate Context（A1=1）→ EP0 Max Packet Size 更新生效",
    cards: [
      { h3: "回读与更新", p: "驱动回读 8 字节里的 bMaxPacketSize0=8——与端口速度默认值一致；若不同，就把新值填进输入上下文（A1=1，只影响 EP0 Context），用 Evaluate Context 命令告知 xHC。" },
      { h3: "生效即完成", p: "命令成功后 EP0 的 Max Packet Size 更新生效——上下文是软件与 xHC 之间的数据结构，设备不知道也不需要知道。" },
    ],
    steps: [
      [0.5, "slip", { label: "Evaluate Context" }],
      [2.2, "bell0", {}],
      [3.0, "say", { t: "Evaluate Context（A1=1）：EP0 Max Packet Size 更新生效" }],
      [4.0, "evCard", { label: "命令完成事件", toDesk: true }],
      [6.6, "mps", { v: "8" }],
      [7.4, "done", {}],
    ],
  },
  {
    id: "F9", n: 9, group: 3, title: "读档案", dur: 11,
    camera: { pos: [9.6, 4.2, 12.8], tgt: [9.8, 2.4, 0.6] },
    metrics: { dev: "Address", devNote: "已编址", slot: "Addressed", slotNote: "已编址", pls: "U0", receipts: 7, hot: ["receipts"] },
    runtime: "GET_DESCRIPTOR 读完整 Device/Configuration Descriptor → 描述符入收件匣",
    cards: [
      { h3: "读全描述符", p: "拿准 EP0 包长后，驱动再发 GET_DESCRIPTOR 读完整 Device Descriptor 与 Configuration Descriptor——设备配置全貌由此到手。" },
      { h3: "收件匣", p: "描述符数据沿总线缆回到 xHC，再作为传输事件回到驱动，落入文书台的描述符收件匣——下一工段配置参数就从这里取。" },
    ],
    steps: [
      [0.5, "ticketOut", { text: "GET_DESCRIPTOR(Device·Config)" }],
      [3.0, "ticketIn", { text: "完整描述符数据" }],
      [5.2, "descTray", {}],
      [5.6, "evCard", { label: "传输事件", toDesk: true }],
      [7.2, "say", { t: "完整描述符入收件匣——配置参数备齐" }],
      [10.4, "done", {}],
    ],
  },
  {
    id: "F10", n: 10, group: 3, title: "配置", dur: 13,
    camera: { pos: [3.0, 6.0, 14.6], tgt: [2.6, 3.0, 0.4] },
    metrics: { dev: "Configured", devNote: "已配置", slot: "Configured", slotNote: "已配置", pls: "U0", receipts: 9, hot: ["dev", "slot"] },
    runtime: "Configure Endpoint 命令 + SET_CONFIGURATION 请求：双操作同成 → 设备与槽同时进 Configured",
    cards: [
      { h3: "双操作同成", p: "驱动发出 Configure Endpoint 命令（配置各 Endpoint 的传输环与上下文），并向设备发 SET_CONFIGURATION 请求——两个操作都成功，设备才从 Address 进 Configured、槽从 Addressed 进 Configured。缺一不可。" },
      { h3: "两条通路", p: "命令走命令环与门铃 0（软件与 xHC 的管理通道）；SET_CONFIGURATION 是 USB 请求，由 xHC 在总线上代发，沿总线缆走到设备——两条通路在同一段时间轴上推进。" },
      { h3: "hub 拓扑提醒", p: "多级拓扑必须从根集线器起，把每一层的 hub 与 TT 完全初始化后再处理下一层（p74 Note）——本台只演示根端口直连设备。" },
    ],
    steps: [
      [0.5, "slip", { label: "Configure Endpoint" }],
      [2.2, "bell0", {}],
      [2.8, "say", { t: "Configure Endpoint 命令入命令环；SET_CONFIGURATION 请求并行上路" }],
      [3.2, "ticketOut", { text: "SET_CONFIGURATION" }],
      [5.6, "devLamp", { v: "configured" }],
      [6.0, "slotLamp", { v: "Configured" }],
      [6.6, "evCard", { label: "命令完成 + 传输事件", toDesk: true }],
      [8.0, "say", { t: "双操作同成：设备 Address→Configured；槽 Addressed→Configured" }],
      [12.4, "done", {}],
    ],
  },
  {
    id: "F11", n: 11, group: 4, title: "完工巡检", dur: 8,
    camera: { pos: [6.8, 12, 39], tgt: [6.8, 3.0, 0] },
    metrics: { dev: "Configured", devNote: "已配置", slot: "Configured", slotNote: "已配置", pls: "U0", receipts: 9, hot: ["receipts"] },
    runtime: "各 Endpoint 传输环可调度 TD，管道全通——初始化完成",
    cards: [
      { h3: "管道全通", p: "设备 Configured、槽 Configured、各 Endpoint 传输环可调度传输描述符（TD）——上层驱动随后就能按配置打开接口、收发数据。" },
      { h3: "巡回清点", p: "回执 9 张：端口状态变化事件 2 张、命令完成事件 4 张、传输事件 3 张。试一试上方四个分支预设，或按 ⟲ 复位从头再来。" },
      { h3: "分支速查", p: "USB3 端口 attach 成功自动 Enabled（无端口复位帧）；BSR=1 legacy 分支先在 Default 态通信再编址；hub/TT 逐层初始化要求见 p74 Note——三张分支注记在「流程原理」折叠节。" },
    ],
    steps: [
      [0.6, "epLights", {}],
      [1.4, "say", { t: "初始化完成：设备 Configured · 槽 Configured · 回执 9 张" }],
      [7.4, "done", {}],
    ],
  },
];

/* 预设变体卡（覆盖同名工段的正文/动作增补；不发明新数值） */
const X43_VARIANTS = {
  usb3: {
    1: {
      metrics: { dev: "Default", devNote: "默认态", slot: "—", pls: "U0", receipts: 1, hot: ["pls"] },
      runtime: "USB3 设备插入端口 1 → Polling 成功自动 Enabled（PED=1 · PR=0 · PLS=0）",
      cards: [
        { h3: "USB3：自动 Enabled", p: "USB3 协议端口插入后进入 Polling，轮询成功自动前进到 Enabled（PED=1、PR=0、PLS=0），失败回 Disconnected——与 USB2 必须软件复位是两条路径。" },
        { h3: "Disabled 态分开表述", p: "两族的 Disabled 态不同义：USB3 指 DSPORT.Disabled（USB3 规范图 10-9），USB2 指 USB2 规范 Disabled 态（图 11-10）。" },
      ],
      steps: [
        [0.4, "cablePlug", {}],
        [1.4, "say", { t: "USB3 设备插入：端口进入 Polling…" }],
        [2.6, "portFlags", { ccs: 1, csc: 1, ped: 1 }],
        [2.6, "pls", { v: "U0" }],
        [2.6, "speed", { v: "SS" }],
        [2.6, "devLamp", { v: "default" }],
        [3.6, "evCard", { label: "端口状态变化事件", toDesk: true }],
        [5.2, "say", { t: "轮询成功：端口自动 Enabled（PED=1 · PR=0 · PLS=0）——无软件复位帧" }],
        [8.4, "done", {}],
      ],
    },
  },
  bsr1: {
    6: {
      metrics: { dev: "Default", devNote: "默认态", slot: "Default", slotNote: "默认态", pls: "U0", receipts: 4, hot: ["slot"] },
      runtime: "Address Device（BSR=1）→ EP0 启用，但 xHC 被禁止发 SET_ADDRESS → 槽 Enabled→Default",
      cards: [
        { h3: "BSR=1：legacy 分支", p: "个别 legacy 设备需要先在 Default 态通信再编址：Address Device 带 BSR=1——EP0 先启用，但 xHC 被禁止发 SET_ADDRESS；成功后槽从 Enabled 进 Default 态（主线 BSR=0 成功是 Enabled→Addressed）。" },
        { h3: "设备视角", p: "设备灯停在 Default：没有 SET_ADDRESS 票据上路。通信照常可以开始——编址放到通信完成之后（见「配置」工段前半）。" },
      ],
      steps: [
        [0.5, "slip", { label: "Address Device · BSR=1" }],
        [2.4, "bell0", {}],
        [3.0, "say", { t: "Address Device（BSR=1）：EP0 启用，禁止发 SET_ADDRESS" }],
        [4.2, "slotLamp", { v: "Default" }],
        [5.0, "evCard", { label: "命令完成事件", toDesk: true }],
        [6.4, "say", { t: "槽 Enabled→Default（BSR=1 分支）——先在 Default 态通信，编址后补" }],
        [9.4, "done", {}],
      ],
    },
    10: {
      runtime: "先补编址（BSR=0）再配置：SET_ADDRESS + Configure Endpoint + SET_CONFIGURATION",
      cards: [
        { h3: "先通信后编址", p: "legacy 分支在 Default 态完成描述符通信后，用 BSR=0 的 Address Device 正式编址（§4.3.4 p76–77），再走 Configure Endpoint 与 SET_CONFIGURATION 双操作。" },
        { h3: "双操作同成", p: "编址补齐后，到 Configured 仍是双操作同成：Configure Endpoint 命令成功且 SET_CONFIGURATION 请求成功，缺一不可（p74）。" },
      ],
      steps: [
        [0.5, "slip", { label: "Address Device · BSR=0（补编址）" }],
        [2.2, "bell0", {}],
        [3.2, "ticketOut", { text: "SET_ADDRESS · 地址=1" }],
        [5.0, "devLamp", { v: "address" }],
        [5.4, "slotLamp", { v: "Addressed" }],
        [6.2, "say", { t: "补编址完成：设备 Default→Address、槽 Default→Addressed" }],
        [7.0, "slip", { label: "Configure Endpoint" }],
        [8.8, "bell0", {}],
        [9.4, "ticketOut", { text: "SET_CONFIGURATION" }],
        [11.0, "devLamp", { v: "configured" }],
        [11.4, "slotLamp", { v: "Configured" }],
        [12.0, "evCard", { label: "命令完成 + 传输事件", toDesk: true }],
        [14.0, "say", { t: "双操作同成：设备与槽同时进 Configured（legacy 全程完）" }],
        [16.0, "done", {}],
      ],
    },
  },
};

/* 规范原文对照六条（逐字取自现行 4.3 页，页码 pypdf 门同现行） */
const X43_QUOTES = [
  { en: "“When the xHC detects a device attach, it shall set the Current Connect Status (CCS) and Connect Status Change (CSC) flags to ‘1’.”", zh: "插入由 xHC 检出：CCS 与 CSC 同时置 1。", src: "xHCI 1.2b §4.3 步 1 p71" },
  { en: "“The completion of the port reset shall cause the PORTSC register PRC and PED flags to be set (‘1’), the PR flag to be cleared (‘0’), and the PLS field to be U0 (‘0’). The reset operation sets the USB2 device into the Default state, preparing it for a SET_ADDRESS request.”", zh: "USB2 复位完成是四信号组合：PRC=1、PED=1、PR=0、PLS=U0；复位把设备送入 Default 态，备好收 SET_ADDRESS。", src: "xHCI 1.2b §4.3 步 3.b p72" },
  { en: "“After the port successfully reaches the Enabled state, system software shall obtain a Device Slot for the newly attached device using an Enable Slot Command” / “The Enable Slot Command returns a Slot ID that is selected by the host controller.”", zh: "端口到 Enabled 后软件发 Enable Slot 取槽；Slot ID 由 xHC 自选，放在命令完成事件里交回。", src: "xHCI 1.2b §4.3 步 4 p72 · §4.3.2 p75" },
  { en: "“system software shall issue an Address Device Command with the Block Set Address Request (BSR) flag cleared to ‘0’” / “Successful completion of the Address Device Command with BSR = ‘0’ shall transition the Device Slot from the Enabled to the Addressed state.”", zh: "主线编址：Address Device 带 BSR=0，成功后槽 Enabled→Addressed、设备 Default→Address；SET_ADDRESS 由 xHC 在总线上代发。", src: "xHCI 1.2b §4.3.4 p76–77" },
  { en: "“For LS, HS, and SS devices; 8, 64, and 512 bytes, respectively, are the only packet sizes allowed for the Default Control Endpoint, so step a may be skipped. For FS devices, system software should initially read the first 8 bytes of the USB Device Descriptor to retrieve the value of the bMaxPacketSize0 field”", zh: "8 字节读取仅 FS 必走：LS/HS/SS 默认包长 8/64/512 已定，可跳过；FS 先读描述符前 8 字节取 bMaxPacketSize0。", src: "xHCI 1.2b §4.3 步 7 p72" },
  { en: "“The successful completion of both operations is required to advance the state of the USB device from Address to Configured and xHC Device Slot from Addressed to Configured.”", zh: "到 Configured 需要双操作同成：Configure Endpoint 命令成功且 SET_CONFIGURATION 请求成功，缺一不可。", src: "xHCI 1.2b §4.3 步 10 p74 · §4.3.5 p77" },
];

/* 规范字段卡：GET_DESCRIPTOR 三 TRB 字段组（p73 现场值）+ EP0 上下文初值（§4.3.3 p76） */
const X43_FIELDCARDS = [
  {
    h3: "GET_DESCRIPTOR(Device) · 前 8 字节 · 三 TRB 字段组",
    note: "控制读 Status 段方向=OUT（DIR=0）",
    rows: [
      ["Setup Stage TRB", "TRT=IN Data Stage(3) · Length=8 · IDT=1 · IOC=0 · bmRequestType=80h · bRequest=6 · wValue=0100h · wIndex=0 · wLength=8"],
      ["Data Stage TRB", "DIR=1 · Length=8 · CH=0 · IOC=0 · IDT=0"],
      ["Status Stage TRB", "DIR=0 · Length=0 · CH=0 · IOC=1 · IDT=0 · Buffer=0"],
    ],
    src: "xHCI 1.2b §4.3 步 7.a p73",
  },
  {
    h3: "EP0 上下文初值（输入上下文）",
    note: "Max Packet Size=按端口速度的默认值（FS=8 / HS=64 / SS=512）",
    rows: [
      ["EP Type / MPS", "Control / 按端口速度默认值"],
      ["Max Burst / CErr", "0 / 3"],
      ["TR Dequeue Ptr / DCS", "EP0 传输环首段 / 1"],
      ["Interval / MaxPStreams / Mult", "0 / 0 / 0"],
    ],
    src: "xHCI 1.2b §4.3.3 p76",
  },
  {
    h3: "输入上下文置位与 Slot Context",
    note: "A0=1 且 A1=1——Slot Context 与 EP0 Context 同时受影响",
    rows: [
      ["输入控制上下文", "A0=1 · A1=1"],
      ["Slot Context", "Root Hub Port Number=端口号 · Route String=0（根端口直连；不含端口号）· Context Entries=1"],
    ],
    src: "xHCI 1.2b §4.3.3 p75–76",
  },
];

/* 流程原理折叠节（三方视角注记 + 分支注记三卡） */
const X43_PRINCIPLES = [
  { h3: "三方各管一段", p: "数据结构全由软件准备：输入上下文、EP0 传输环、DCBAA 表项都是软件装载、xHC 只读；xHC 执行命令，需要时在总线上代发 USB 请求；设备只看见 USB 请求与总线事件。规范原文称软件侧为 system software（系统软件），本课件统一写「xHCI 驱动」。" },
  { h3: "USB3 端口：自动 Enabled", p: "USB3 协议端口插入后进入 Polling：轮询成功自动到 Enabled（PED=1、PR=0、PLS=0），失败回 Disconnected。注意两族的 Disabled 态不同义——USB3 指 DSPORT.Disabled（USB3 规范图 10-9），USB2 指 USB2 规范 Disabled 态（图 11-10）。xHCI 1.2b §4.3 p71–72" },
  { h3: "BSR=1：legacy 设备分支", p: "个别 legacy 设备需要先在 Default 态通信再编址：Address Device 带 BSR=1——EP0 先启用，但 xHC 被禁止发 SET_ADDRESS；成功后槽 Enabled→Default（主线 BSR=0 成功是 Enabled→Addressed）。xHCI 1.2b §4.3.4 p76–77" },
  { h3: "hub 与 TT：逐层初始化", p: "多级拓扑必须从根集线器起，把每一层的 hub 与 TT 完全初始化后再处理下一层，否则 xHC 行为未定义。xHCI 1.2b §4.3 p74 Note" },
];

/* 完工自测题（3–5 题，可选件；判据全部来自现行页内容） */
const X43_QUIZ = [
  {
    q: "USB2 端口复位完成的判据是哪一组信号？",
    opts: ["PRC=1 · PED=1 · PR=0 · PLS=U0", "CCS=1 · CSC=1 · PSCEG=1", "PED=1 · PLS=Polling(7)"],
    ans: 0,
    why: "复位完成四信号组合缺一不可：PRC=1、PED=1、PR=0、PLS=U0（'0'）；Port Speed 同时指示设备速度（p72 3.b）。CCS/CSC 是插入检出信号，Polling 是 attach 后的 PLS 显示。",
  },
  {
    q: "「先读描述符前 8 字节取 bMaxPacketSize0」这一步对哪种设备必走？",
    opts: ["LS / HS / SS 设备", "仅 FS 设备", "所有速度都必走"],
    ans: 1,
    why: "LS/HS/SS 的 Default Control Endpoint 只允许 8/64/512 字节包，默认值已定可跳过；仅 FS 设备必走 8 字节读取（p72 步 7）。",
  },
  {
    q: "Address Device 带 BSR=1 且成功，设备槽进入哪个状态？",
    opts: ["Enabled → Addressed", "Enabled → Default", "保持 Enabled 不变"],
    ans: 1,
    why: "BSR=1 是 legacy 设备分支：EP0 先启用但 xHC 被禁止发 SET_ADDRESS，成功后槽 Enabled→Default（p76–77）；主线 BSR=0 成功才是 Enabled→Addressed。",
  },
  {
    q: "设备从 Address 进 Configured，需要哪些操作成功？",
    opts: ["仅 Configure Endpoint 命令成功", "仅 SET_CONFIGURATION 请求成功", "Configure Endpoint 命令成功 且 SET_CONFIGURATION 请求成功"],
    ans: 2,
    why: "双操作同成、缺一不可（p74 步 10 / §4.3.5 p77）——命令与 USB 请求走两条通路，两个都成功状态才前进。",
  },
];

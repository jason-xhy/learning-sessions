// §4.23 电源管理 —— 泳道节（生成器 lane_page.mjs 量产件；骨架版：机器形态留后续会话）
// 判据：xHCI 1.2b §4.23 p310–326（引文五条逐字）；§4.23.1 Power Wells p310–311 /
//   §4.23.2 xHCI Power Management p311–314 / §4.23.2.1 Save and Restore Operations p314–315 /
//   §4.23.3 PCI Power Management p315（指向 Appendix A）/ §4.23.4 USB Power Management p315 /
//   §4.23.5 USB Link Power Management p315–326（Table 4-12 p316–317）；
//   Appendix A p557–558（Table A-1 / A.1.1，§4.23.3 所指）；上界=§4.24 p327（现场核）
// 工艺：_gen/lane_page.mjs + anatomy kit pageHtml + shared/zoomfs.mjs（构建期内联，自包含）
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lanePage } from "../_gen/lane_page.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

const cfg = {
  theme: THEME,
  pageTitle: "§4.23 电源管理 · xHCI 规范对照学习",
  navTitle: "§4.23 电源管理",
  specRef: "xHCI 1.2b §4.23 Power Management · p310–326 · §4.23.1 Power Wells p310 / §4.23.2 xHCI Power Management p311 / §4.23.2.1 Save and Restore Operations p314 / §4.23.3 PCI Power Management p315 / §4.23.4 USB Power Management p315 / §4.23.5 USB Link Power Management p315–326",
  prevHref: "../4.22-xhci-extended-capabilities/index.html", prevLabel: "§4.22 xHCI 扩展能力",
  nextHref: "../4.24-host-controller-management/index.html", nextLabel: "§4.24 主机控制器管理",
  prose: [
    "本节把散在规范各处的电源机制收拢成一张总图。xHC 有两口电源井：<b>Core 井</b>（核心逻辑）与 <b>Aux 井</b>（辅助供电，若支持）——Core 井可被系统关断，Aux 井从上电起常在。本页「xHCI 驱动」即规范原文所称 system software（系统软件）。软件要把 xHC 停电再续命，靠一对 USBCMD 控制位：<b>Save State（CSS）</b>与 <b>Restore State（CRS）</b>——寄存器读得走的状态直接存档；寄存器看不见的内部状态（如 ERDP 关联的 Ring Cycle State、已启用的 Device Slots 集合）也必须一起保存恢复，且两旗只在停机态（R/S=‘0’）可置（p311–312）。",
    '井的规则决定「什么会复位、什么能活过断电」：Core 井内存寄存器在 Chip Hardware Reset、HCRST、D3hot→D0 转换时回默认；Aux 井只在初次上电或 HCRST 时复位——PME 唤醒上下文因此能活过 Core 井断电（p310–311）。PCI 侧 D0→D3hot→D3cold 的功耗态迁移（Appendix A，§4.23.3 所指）加上 Save/Restore 两个操作，构成系统挂起→唤醒→恢复的完整主线（本页泳道图）；软件出 D0 前还必须先把全部 Enabled 下游端口置 USB 挂起（p557）。端口级挂起/恢复的时序细节在 <a href="../4.15-suspend-resume/index.html">§4.15</a>；运行期更浅的链路低功耗态（USB2 L1 / USB3 U1·U2）由 <b>§4.23.5</b> 管理——根集线器端口 LPM 机制（Table 4-12 状态映射）＋ Slot Context <b>Max Exit Latency</b> 调度机制，后者以一个最坏唤醒延迟值供 xHC 对 SS Isoch 提前发 PING 唤链（p324–326）。§4.23.4 本身只做指路：USB2/USB3 细节归各自规范，USB PD 走 ACPI（p315）。',
    "〔注记：<b>本节 anatomy 机器形态留后续会话——本页为流程骨架版</b>：主线泳道＋对照表卡；§4.23.5.1.1.1 硬件控制 LPM（HIRD/BESL、LPM Timer、Table 4-13 编码）与 §4.23.5.2.1/4.23.5.2.2 两个错误完成码的细则以要点＋页码入注记，不逐条展开。〕",
  ],
  quotes: [
    { en: "When system software decides to power down the xHC with the intent of resuming operation at a later time, it shall read the xHC registers and save their state.",
      zh: "停电前的总纲：寄存器状态读出保存，上电回 Run 前全部写回——Save/Restore 这对操作的存在理由。",
      src: "xHCI 1.2b §4.23.2 p311" },
    { en: "The Save State and Restore State flags may only be set when the xHC is Stopped (Run/Stop (R/S) = ‘0’).",
      zh: "两旗（CSS/CRS）只在停机态可置——挂起/恢复的入口门槛。",
      src: "xHCI 1.2b §4.23.2 p312" },
    { en: "Note: The state of a Root Hub port is not covered by a Save or Restore operation.",
      zh: "根集线器端口不在 Save/Restore 覆盖内——端口与拓扑由软件在恢复时重走（恢复步 9）。",
      src: "xHCI 1.2b §4.23.2.1 p314 Note" },
    { en: "Note: xHC implementations shall support Link Power Management for all USB protocols that it supports.",
      zh: "LPM 不是可选项：xHC 支持的每种 USB 协议都必须支持链路电源管理——具体特性看 Supported Protocol Capability（§7.2.2.1.3）。",
      src: "xHCI 1.2b §4.23.5 p315–316" },
    { en: "It is not practical for the xHC to track the state of every link in the USB topology, so the Max Exit Latency field in the Slot Context identifies the worst case exit latency for the links and hubs between the xHC and the device when scheduling transfers to power managed devices.",
      zh: "xHC 不逐链路跟踪状态——用 Slot Context 的 Max Exit Latency 一个最坏值兜住整条路径，调度按它留余量。",
      src: "xHCI 1.2b §4.23.5.2 p324" },
  ],
  figNo: "Fig 4.23",
  figTitle: "系统挂起与恢复：Save State → D3 → 唤醒 → D0 → Restore State",
  figCaption: "挂起主线：停端点→存寄存器→Save State→断 Core 井进 D3；唤醒事件回 D0→恢复镜像与寄存器→Restore State→写 CRCR 重启命令环→R/S=1。端口与拓扑不在覆盖内，由软件重走。骨架版——anatomy 机器形态留后续会话。",
  figAria: "电源管理三方泳道时序图：Stop Endpoint、Save State、PCI D3 断电、PME 唤醒、Restore State、命令环重启与端点门铃",
  tourNarr: "总览模式：完整泳道流程图。主线=系统挂起到运行恢复（步1–9），步10=运行收尾与链路电源管理支线——每框角标规范页码。",
  steps: [
    { kind: "box", at: "sw", lines: ["Stop Endpoint 停 Running:Busy 端点", "FSC=‘0’ 实现：Idle 端点也要停", "命令环 Stopped（CRR=‘0’）或空"], pg: "p312",
      narr: "§4.23.2 存档步1–2：Stop Endpoint 的副作用是上下文回写内存（TR Dequeue Pointer、DCS 等）；FSC（Force Save Context Capability）=‘1’ 自 xHCI 1.1/1.2 起强制（p312 Note）；命令环还要等关联的命令完成事件全部收讫。" },
    { kind: "box", at: "sw", lines: ["端口逐个挂起（§4.15：PLS=U3）", "R/S=‘0’ 停机", "按序读 Operational/Runtime/VTIO"], pg: "p312 · p557",
      narr: "Appendix A p557：软件出 D0 前必须把全部 Enabled 下游端口置 USB 挂起（让下游设备停在低功耗不活动态）；存档步3/5：停机后按序读 USBCMD、DNCTRL、DCBAAP、CONFIG、ERSTSZ、ERSTBA、ERDP、IMAN、IMOD、VTIO 十组寄存器；FSC=‘1’ 时还要确保未收到 Stop Endpoint 的 Running 端点在 R/S 清 0 前已 Idle（步4）。" },
    { kind: "arrow", from: "sw", to: "hc", lines: ["写 USBCMD：CSS=‘1’（Save State）", "等 USBSTS.SSS →‘0’"], pg: "p312",
      narr: "存档步6–7：Controller Save State（CSS）置位后，xHC 把全部内部槽/端点/流状态存入内存；完成判据=Save State Status（SSS）转 ‘0’——完成后应查 SRE（p313 Note）。" },
    { kind: "box", at: "sw", lines: ["SPR=‘1’：存 Scratchpad 镜像", "存 DCBAA、Contexts 等结构", "命令环/事件环一并保存"], pg: "p312",
      narr: "存档步8–9：Max Scratchpad Buffers>‘0’ 且 Scratchpad Restore（SPR）=‘1’ 时先存 Scratchpad 镜像；DCBAA 引用的整棵数据结构树（Device Contexts/Transfer Rings/Stream Arrays 等）、命令环、事件环、Scratchpad 全由系统软件保存（p312 Note）——Restore 要求它们回到同一物理地址，否则未定义行为（p314 Note）。" },
    { kind: "note", lanes: ["sw", "hc"], lines: ["断电=移除 Core 井电（§4.23.2 步10）；进 D3cold 的方法属平台级（p311 Note）", "Core 井内存寄存器：Chip Hardware Reset / HCRST=‘1’ / D3hot→D0 回默认", "Aux 井：仅初次上电 / HCRST=‘1’ 复位——PME 唤醒上下文活过断电", "LHCRST 轻复位：Aux 井全部保持原值（Legacy Support 寄存器是例外）"], pg: "p310–311 · p312",
      narr: "§4.23.1：两口井的复位条件不同，是「哪些状态能活过断电」的分界线——Aux 井内存寄存器只在 Aux 井初次上电或 HCRST 时回默认（p310–311），USB Legacy Support Capability 寄存器例外（p311 Note）；LHCRST（Light Host Controller Reset）只把不在 Aux 井内的 Operational/Runtime 寄存器回默认（p311）；Core 井电压的开关方法（如 D3hot→D3cold）规范不管、走平台级机制（p311 Note）。" },
    { kind: "arrow", from: "dev", to: "hc", ev: true, lines: ["唤醒事件：设备远程唤醒", "（resume 信令/LFPS——§4.15.2.1）", "xHC 按 PCI PM 规则断言 PME#"], pg: "p254–255 · p557",
      narr: "设备发起的恢复信令细节=§4.15.2.1（USB2 resume 信令 / USB3 LFPS，p254–255）；Appendix A p557：xHC 按 PCI PM 规范断言 PME# 并保留芯片上下文；唤醒也可来自主机侧——若软件在进 D3cold 前决定重启，Restore 操作非必需（p313）。" },
    { kind: "box", at: "hc", lines: ["上电回 D0：D3hot→D0 内部复位", "镜像回原物理地址（软件）", "按序写回 DNCTRL…VTIO（9 组）"], pg: "p312–313 · p558",
      narr: "恢复步1–4：Core 井上电→内存镜像（DCBAA/Contexts/Scratchpad）回原物理位置→按序写回 DNCTRL、DCBAAP、CONFIG、ERSTSZ、ERSTBA、ERDP、IMAN、IMOD、VTIO；A.1.1：D3hot→D0 转换 xHC 断言内部复位，PMCSR.PME_Status/PME_En 必须保持（p558）。硬规则：寄存器先写回、Restore 后执行——Restore 会盖掉复位默认值（p313 Note）。" },
    { kind: "arrow", from: "sw", to: "hc", lines: ["写 USBCMD：CRS=‘1’（Restore State）", "等 USBSTS.RSS →‘0’；查 SRE"], pg: "p313",
      narr: "恢复步5：Controller Restore State（CRS）置位，等 Restore State Status（RSS）转 ‘0’；xHC 负责在 Restore 时自查保存态——损坏则 SRE=‘1’、Restore 终止、RSS 清 ‘0’（p314 Note）；Save 后先 Run 再 Restore 的错序同样在 Restore 完成时报 SRE，且仅当 Aux 井全程保住才报（p314 Note）。" },
    { kind: "box", at: "sw", lines: ["重初始化命令环（Cycle 对齐 RCS）", "写 CRCR：命令环重启", "R/S=‘1’ 合闸"], pg: "p313",
      narr: "恢复步6–8：命令环重初始化使 Cycle 位与待写 CRCR 的 RCS 值一致，写 CRCR 即让命令环从指定地址重启；随后 USBCMD.R/S=‘1’ 放行——内部状态（RCS、Enabled Device Slots 等）已由 Restore 恢复（p311–312）。" },
    { kind: "note", lanes: ["sw", "hc", "dev"], lines: ["运行收尾：走拓扑逐个初始化 PORTSC/PORTPMSC/PORTLI，逐端点写门铃重启", "设备：端口态不在 Save/Restore 覆盖内——设备应仍挂接、USB 地址不变", "运行期链路低功耗（§4.23.4–4.23.5）：USB2 L1 / USB3 U1·U2，浅于挂起态 U3", "两机制：端口 LPM（PORTPMSC/PORTHLPMC，Table 4-12 映射）+ Max Exit Latency 调度"], pg: "p313–317",
      narr: "恢复步9–10：软件走 USB 拓扑逐个初始化 xHC 的 PORTSC/PORTPMSC/PORTLI 与外部 hub 口，再逐个写端点门铃重启先前 Running 的端点（p313）；端口态不在 Save/Restore 覆盖内（引文③），设备若在存档与恢复之间变了状态，修补责任在软件（p315）。链路低功耗：xHC 用 PORTSC.PLS 报告链路态、解释随 Port Speed 而变——LS/FS/HS 端口永不报 U1（p317）；USB2 写 PLS=‘2’ 起 LPM 事务，L1S 记 ACK=Success / NYET=Not Yet / STALL=Not Supported（后两者置 PLC 出端口状态变化事件，p317–318）；硬件控制 LPM（HLC/HLE）由每口一个 LPM Timer 超时自动进 L1，HIRD/BESL 两法、BESL 自 xHCI 1.1/1.2 起强制（§4.23.5.1.1.1 p318–320）；调度侧：Max Exit Latency=软件算的路径最坏退出延迟（USB2 取 BESL+10μs，USB3 按 USB3 规范 C.1.5.2），SS Isoch 提前 MEL μs 发 PING——PING_RESPONSE 迟到报 No Ping Response Error（p325–326）；MEL 改动走 Evaluate Context 命令，xHC 判定调度不可靠时报 Max Exit Latency Too Large Error（CMC/CME 门控，p326）。" },
  ],
  legend: [
    { i: "var(--xsp-sw)", t: "xHCI 驱动" },
    { i: "var(--xsp-hc)", t: "xHC 控制器" },
    { i: "var(--xsp-dev)", t: "设备（唤醒事件源）" },
    { t: "实线=命令/写流 · 虚线=事件/唤醒流" },
  ],
  linksHtml: `
<div class="xsp-card"><h2>电源井 · PCI 功耗态 · 链路电源状态对照（§4.23.1 · Appendix A · Table 4-12 · 每行带页码）</h2>
<table class="xsp-tb">
<tr><th>项</th><th>Core 井（核心供电）</th><th>Aux 井（辅助供电）</th><th>页</th></tr>
<tr><td><b>供电形态</b></td><td>可被系统关断</td><td>AC 供电期间常在（若支持）</td><td class="mono">p310</td></tr>
<tr><td><b>内存寄存器复位</b></td><td>Chip Hardware Reset · HCRST=‘1’ · D3hot→D0</td><td>Aux 井初次上电 · HCRST=‘1’</td><td class="mono">p310–311</td></tr>
<tr><td><b>配置空间复位</b></td><td>系统（Core 井）硬件复位 · D3hot→D0</td><td>Aux 井初次上电</td><td class="mono">p311</td></tr>
<tr><td><b>轻复位 LHCRST 后</b></td><td>不在 Aux 井内的 Operational/Runtime 回默认</td><td>全部保持复位前原值</td><td class="mono">p311</td></tr>
<tr><td><b>例外/边界</b></td><td>D3cold 断 Core 井的方法属平台级，规范不管</td><td>USB Legacy Support Capability 寄存器不循 Aux 复位规则</td><td class="mono">p311</td></tr>
</table>
<table class="xsp-tb">
<tr><th>PCI PM 功耗态（Table A-1）</th><th>规范要求</th><th>语义</th><th>页</th></tr>
<tr><td><b>D0</b></td><td>必需</td><td>全醒——全部逻辑全功率，向后兼容</td><td class="mono">p557</td></tr>
<tr><td><b>D1</b></td><td>可选</td><td>USB 睡眠态，总线主控能力关，全部 USB 端口挂起；回 D0 延迟低</td><td class="mono">p557</td></tr>
<tr><td><b>D2</b></td><td>可选</td><td>USB 睡眠态，总线主控能力关，全部 USB 端口挂起</td><td class="mono">p557</td></tr>
<tr><td><b>D3hot</b></td><td>必需</td><td>深 USB 睡眠态，总线主控能力关，全部 USB 端口挂起</td><td class="mono">p557</td></tr>
<tr><td><b>D3cold</b></td><td>必需</td><td>全睡——下游设备挂起或断电（取决于实现的下游供电能力）</td><td class="mono">p557</td></tr>
</table>
<p>注：软件出 D0 前必须把全部 Enabled 下游端口置 USB 挂起；xHC 按 PCI PM 规范断言 PME# 并保留芯片上下文（均 p557）；D3hot→D0 转换伴随内部复位，PMCSR.PME_Status/PME_En 必须保持（A.1.1 p558）。</p>
<table class="xsp-tb">
<tr><th>链路态族（Table 4-12）</th><th>USB2 编码</th><th>USB3 编码</th><th>语义</th><th>页</th></tr>
<tr><td><b>On</b></td><td class="mono">L0</td><td class="mono">U0</td><td>正常运行——全部包通信都在此态</td><td class="mono">p316</td></tr>
<tr><td><b>细粒度 LPM</b></td><td class="mono">无</td><td class="mono">U1</td><td>低退出延迟待机——回 On 快于 ~10 μs</td><td class="mono">p316</td></tr>
<tr><td><b>粗粒度 LPM</b></td><td class="mono">L1（Sleep）</td><td class="mono">U2</td><td>中等退出延迟待机——回 On 约 ~1 ms；L1↔U2 因同为约 1 ms 量级而互映</td><td class="mono">p316</td></tr>
<tr><td><b>Suspend</b></td><td class="mono">L2</td><td class="mono">U3</td><td>深省电=USB 挂起的正式名；VBUS 保持；退出经远程唤醒/resume/复位/拔出</td><td class="mono">p316</td></tr>
<tr><td><b>Off</b></td><td class="mono">L3</td><td class="mono">未定义</td><td>无数据信令；VBUS 断</td><td class="mono">p317</td></tr>
</table>
<p>注：PLS 字段报告当前链路态、解释随 Port Speed 而变——LS/FS/HS 端口永不报 U1（p317）；USB2 软件发起 L1=写 PLS=‘2’ 起 LPM 事务，L1S 记 ACK=Success / NYET=Not Yet / STALL=Not Supported（后两者置 PLC 出端口状态变化事件，p317–318）；硬件控制 LPM（HLC/HLE）由 LPM Timer 超时自动进 L1，HIRD/BESL 两法（§4.23.5.1.1.1 p318–324）。</p>
</div>
<div class="xsp-card"><h2>Save/Restore 流程要点表（§4.23.2–4.23.2.1 · 每行带页码）</h2>
<table class="xsp-tb">
<tr><th>阶段</th><th>要点</th><th>页</th></tr>
<tr><td><b>共同前提</b></td><td>Save State/Restore State 只在停机态（R/S=‘0’）可置；寄存器可见状态与内部状态（ERDP 关联的 RCS、Enabled Device Slots 等）都要保存恢复</td><td class="mono">p311–312</td></tr>
<tr><td><b>存前停活动</b></td><td>Stop Endpoint 停 Running:Busy 端点；FSC=‘0’ 实现连 Running:Idle 也停（xHCI 1.1/1.2 起强制 FSC=‘1’）；命令环 Stopped（CRR=‘0’）或空、完成事件收讫</td><td class="mono">p312</td></tr>
<tr><td><b>存寄存器</b></td><td>按序读 USBCMD、DNCTRL、DCBAAP、CONFIG、ERSTSZ、ERSTBA、ERDP、IMAN、IMOD、VTIO；CSS=‘1’→等 SSS=‘0’</td><td class="mono">p312</td></tr>
<tr><td><b>存内存镜像</b></td><td>SPR=‘1’ 且 Max Scratchpad Buffers&gt;‘0’ 先存 Scratchpad；再存 DCBAA/Contexts 等被引用结构（整棵树+命令环/事件环+Scratchpad 归软件保存）</td><td class="mono">p312</td></tr>
<tr><td><b>断电</b></td><td>移除 Core 井电；内部状态有效到进 D3cold 为止</td><td class="mono">p312–313</td></tr>
<tr><td><b>上电恢复</b></td><td>Core 井上电→镜像回原物理地址→按序写回 DNCTRL…VTIO→CRS=‘1’→等 RSS=‘0’（次序硬规则：寄存器先写回、Restore 后执行）</td><td class="mono">p312–313</td></tr>
<tr><td><b>重启</b></td><td>命令环重初始化（Cycle 对齐 RCS）→写 CRCR 重启→R/S=‘1’→走拓扑初始化 PORTSC/PORTPMSC/PORTLI→逐端点门铃重启</td><td class="mono">p313</td></tr>
<tr><td><b>出错与边界</b></td><td>SRE 检查：保存态损坏→SRE=‘1’、Restore 终止、RSS 清 0；Save 后先 Run 再 Restore→Restore 完成时报 SRE（Aux 井保住才报）；端口态不在覆盖内；镜像必须回同一物理地址；未进 D3cold 就重启则 Restore 非必需</td><td class="mono">p313–315</td></tr>
</table>
</div>
<div class="xsp-card"><h2>相关</h2>
<p><a href="../4.15-suspend-resume/index.html">§4.15 挂起与恢复</a>——主线步2（端口挂起）与步6（设备发起唤醒）的端口级时序展开；<a href="../4.20-scratchpad-buffers/index.html">§4.20 暂存缓冲区</a>——SPR 位与 Scratchpad 镜像的保存边界；<a href="../4.2-host-controller-init/index.html">§4.2 主机控制器初始化</a>——HCRST 复位语义（两口井复位条件的公共项）。</p>
<p><a href="../4.21-pci-express/index.html">§4.21 PCI Express</a>——BME 停机时序（同为断电前的软件前置）；<a href="../4.22-xhci-extended-capabilities/index.html">§4.22 xHCI 扩展能力</a>（上一节）——USB Legacy Support 能力=Aux 井复位规则的例外所在。</p></div>
<div class="xsp-card"><h2>延伸（待建）</h2>
<p><a href="../../index.html">§5.4.1 USBCMD（待建）</a>——CSS/CRS/LHCRST 位定义；<a href="../../index.html">§5.4.2 USBSTS（待建）</a>——SSS/RSS/SRE 状态位；<a href="../../index.html">§5.4.9 PORTPMSC（待建）</a>——L1S/HLE/RWE/BESL 字段；<a href="../../index.html">Appendix A xHCI PCI 电源管理接口（待建）</a>——D 状态迁移与 PME 全貌。</p></div>`,
  footLine: "判据：xHCI 1.2b（625472 Rev 1.2b）§4.23 p310–326 · 引文逐字核对，证据见 <a href=\"EVIDENCE.md\">EVIDENCE.md</a> · 生成于 2026-11-04",
};

const page = lanePage(cfg);
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, (page.length / 1024).toFixed(0) + " KB");

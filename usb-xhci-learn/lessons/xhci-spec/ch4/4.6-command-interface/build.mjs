// §4.6 命令接口 —— 表格节（table_page.mjs 量产件；互链 fig4＋逐命令总表形态）
// 判据：xHCI 1.2b §4.6 p90–142。框架段（§4.6 引言 + §4.6.1/4.6.1.1/4.6.1.2）与
//   §4.6.2–4.6.18 各小节功能句逐字现场核对（/tmp/spec-audit-txt/xhci-1.2b.txt，
//   页标 PAGE 90–142）；页码=各小节起始页，机核见 EVIDENCE.md。
// 呈现：总表（§4.6.2–4.6.18 每命令一行，共 17 条）＋按用途分组互链（已建节直链）。
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tablePage } from "../_gen/table_page.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

// ---------- 17 条命令总表（§4.6.2–4.6.18，规范节序） ----------
// 功能句=各小节首段功能句的缩写（禁凭记忆）；完成事件要点=各小节事件字段/完成码叙述。
const CMDS = [
  ["No Op", "4.6.2", "93", "演练 TRB Ring 机制而不影响任何 xHC 或 USB 设备状态；也可用于回报命令环 Dequeue Pointer 的当前值", "Command Completion Event · Success（其余字段清 ‘0’）；可插在命令环上用于调整 Command TD 的对齐边界"],
  ["Enable Slot", "4.6.3", "94", "取得一个可用设备槽，并使它从 Disabled 进入 Enabled 态", "成功：Slot ID=选中槽号 · Success；无槽可用：Slot ID=‘0’ · No Slots Available Error；命令被中止时 Slot ID 视为无效"],
  ["Disable Slot", "4.6.4", "96", "强制设备槽进入 Disabled 态；典型用途=USB 设备断开时释放槽", "必回完成事件（p96）；槽此前被 Enable 过=Success，否则 Slot Not Enabled Error；完成后软件须把 DCBAA 对应表项清 ‘0’（p97）"],
  ["Address Device", "4.6.5", "97", "使槽 Enabled→Default/Addressed 或 Default→Addressed（走向由 BSR 位定）；xHC 启用 EP0、选设备地址并代发 USB SET_ADDRESS（USB2 发地址 ‘0’，USB3 用 Route String）", "SET_ADDRESS 总线出错=USB Transaction Error 且槽不进 Addressed；成功后 EP0 加入调度列表、EP0 门铃使能"],
  ["Configure Endpoint", "4.6.6", "102", "启用/禁用/重配目标配置关联的端点——三场景：配置设备（与 SET_CONFIGURATION 双操作）、deconfigure（DC=‘1’，禁用除 EP0 外全部端点）、设 Alternate Interface（与 SET_INTERFACE 配合）", "与配套 USB 请求都成功才有效；DC=‘1’ 等价 Drop Context 2–31 全 ‘1’ 且 Input Context Pointer 被忽略"],
  ["Evaluate Context", "4.6.7", "112", "告知 xHC：Device Context 中的特定字段已被软件修改（如编址后读 Device Descriptor 才确定的 Max Packet Size）", "成功后 xHC 按更新后的上下文参数执行；槽 Disabled 时回 Slot Not Enabled Error"],
  ["Reset Endpoint", "4.6.8", "114", "从端点 halted 状态恢复", "端点非 Halted 态=Context State Error 拒绝；成功=Success，EP State→Stopped、门铃重新使能；TSP=‘0’ 复位 Data Toggle/Sequence Number，TSP=‘1’ 保留以重试上一包（p114–115）"],
  ["Stop Endpoint", "4.6.9", "118", "停止 xHC 在端点上执行 TD——软件临时收回 Transfer Ring TD 所有权，或停机前止动 USB 活动", "按时机三选一：TD 之间=Success（FSE 强制 Stopped-Invalid Length 传输事件）；短包已检出且 SPC=‘1’=Stopped-Short Packet；TD 进行中=Stopped——传输事件都先于命令完成事件（p119）"],
  ["Set TR Dequeue Pointer", "4.6.10", "125", "修改 Endpoint/Stream Context 的 TR Dequeue Pointer 字段", "仅限目标端点在 Error 或 Stopped 态执行；越态拒绝回 Context State Error（p126）"],
  ["Reset Device", "4.6.11", "128", "通知 xHC：槽关联的 USB 设备已被复位——槽 Slot State→Default、USB Device Address→‘0’、除 EP0 外全部端点 Disabled", "槽在 Addressed/Configured 态时执行；成功=Success；设备未真复位则后续 Address Device 会失败"],
  ["Force Event（可选规范）", "4.6.12", "130", "VMM 向目标 VF 的事件环注入一个事件 TRB（VMM 向 VM 仿真 xHC 时用；除 Cycle bit 外全拷贝，Cycle 由 xHC 按目标环定）", "VF ID 无效=TRB Error；目标 VF 事件环满=VF Event Ring Full Error（事件被丢弃，软件应重排命令）"],
  ["Negotiate Bandwidth（可选规范）", "4.6.13", "131", "为周期端点发起 Bandwidth Request Events——从系统回收闲置 USB 带宽", "支持=Success、不支持=TRB Error（BNC=‘1’ 的 xHC 必须支持）；全部 Bandwidth Request Events 生成后命令才完成"],
  ["Set Latency Tolerance Value（可选规范）", "4.6.14", "133", "主机软件向 xHC 提供 BELT（Best Effort Latency Tolerance）值——LTR 机制的软件入口", "支持=Success、不支持=TRB Error；LTC=‘0’ 的 xHC 不支持；BELT 值的处理与设备 LTM 值同规"],
  ["Get Port Bandwidth（可选规范）", "4.6.15", "135", "读取每个根集线器端口/外部 hub 下行端口的可用带宽百分比（xHC 写入 Port Bandwidth Context）", "支持=Success、不支持=TRB Error；用于枚举因 Bandwidth Error/Secondary Bandwidth Error 失败后向用户建议拓扑调整"],
  ["Force Header", "4.6.16", "138", "经选定的根集线器端口向 USB 设备发送链路管理包（LMP）或事务包（TP），如 PING TP、Vendor Device Test LMP", "端口号越界=TRB Error；发送失败=Undefined Error；误用可致 xHC 与设备链路状态机失步，恢复或需复位设备/端口/xHC"],
  ["Get Extended Property（可选规范）", "4.6.17", "139", "发现 xHC 支持的特定 Extended Capabilities，并枚举/读取其属性", "GSC=‘1’（HCCPARAMS2）才必须支持；属性由 xHC 写入 Extended Property Context（无需软件预初始化）；范围限 Table 4-3 所列扩展能力"],
  ["Set Extended Property（可选规范）", "4.6.18", "141", "控制 xHC 特定 Extended Capabilities 的属性（Capability Parameter 配置）", "GSC=‘1’ 才支持；支持=Success、不支持=TRB Error；Extended Capability Identifier 只许置一个 bit"],
];
const cmdTable = `<table class="xsp-tb">
<tr><th style="width:15%">命令（规范英文名）</th><th style="width:6%">小节</th><th style="width:5%">页</th><th style="width:42%">功能（依各小节功能句缩写）</th><th style="width:32%">完成事件要点</th></tr>
${CMDS.map(([n, s, p, f, e]) => `<tr><td><b>${n}</b></td><td class="mono">§${s}</td><td class="mono">p${p}</td><td>${f}</td><td>${e}</td></tr>`).join("\n")}
</table>
<p>（页=小节起始页，表可跨页；全部 17 条页码经 pypdf 逐条机核，见 EVIDENCE.md。命令名保留规范英文原名。）</p>`;

// ---------- 按用途分组（标已建节出现处，直链） ----------
const groupTable = `<table class="xsp-tb">
<tr><th style="width:12%">用途组</th><th style="width:24%">命令</th><th style="width:64%">本板块已建节出现处（直链）</th></tr>
<tr><td rowspan="4"><b>槽管理</b></td><td><b>Enable Slot</b></td><td><a href="../4.1-command-operation/index.html">§4.1 命令操作</a>——命令模型的演示命令单；<a href="../4.3-usb-device-init/index.html">§4.3 USB 设备初始化</a>——取槽帧（回 Slot ID 后软件装载 DCBAA 表项）</td></tr>
<tr><td><b>Disable Slot</b></td><td><a href="../4.4-device-detach/index.html">§4.4 设备拔出</a>——拔出后还槽的唯一正解（四态任一退回 Disabled）</td></tr>
<tr><td><b>Address Device</b></td><td><a href="../4.3-usb-device-init/index.html">§4.3 USB 设备初始化</a>——编址帧（BSR=0 主线 / BSR=1 legacy 分支）；<a href="../4.5-device-slot-management/index.html">§4.5 设备槽管理</a>——SET_ADDRESS 请求到命令的映射（§4.5.4）</td></tr>
<tr><td><b>Reset Device</b></td><td><a href="../4.5-device-slot-management/index.html">§4.5 设备槽管理</a>——槽状态机的 Reset Device 合并边（Addressed/Configured→Default，§4.5.3）</td></tr>
<tr><td rowspan="5"><b>端点管理</b></td><td><b>Configure Endpoint</b></td><td><a href="../4.5-device-slot-management/index.html">§4.5 设备槽管理</a>——SET_CONFIGURATION/SET_INTERFACE 的双操作映射（§4.5.4）；<a href="../4.16-bandwidth-management/index.html">§4.16 带宽管理</a>——带宽申请的入口命令</td></tr>
<tr><td><b>Evaluate Context</b></td><td><a href="../4.5-device-slot-management/index.html">§4.5 设备槽管理</a>——输入 Slot Context 初始化例外清单（§4.5.2）</td></tr>
<tr><td><b>Reset Endpoint</b></td><td><a href="../4.8-endpoint/index.html">§4.8 端点</a>——Halted→Stopped 的恢复命令（EP State 状态机）</td></tr>
<tr><td><b>Stop Endpoint</b></td><td><a href="../4.8-endpoint/index.html">§4.8 端点</a>——Running→Stopped 的直接迁移命令</td></tr>
<tr><td><b>Set TR Dequeue Pointer</b></td><td><a href="../4.8-endpoint/index.html">§4.8 端点</a>——Error→Stopped 的恢复命令；<a href="../4.5-device-slot-management/index.html">§4.5 设备槽管理</a>——逐态允许命令表（§4.5.3）</td></tr>
<tr><td rowspan="8"><b>其它</b></td><td><b>No Op</b></td><td>机制本体=<a href="../4.9-trb-ring/index.html">§4.9 TRB 环</a>（§4.9.3 命令环管理）——本板块无单独展开</td></tr>
<tr><td><b>Force Event</b></td><td>虚拟化命令（VMM→VF 事件环），细节归规范第 8 章——本板块未建</td></tr>
<tr><td><b>Negotiate Bandwidth</b></td><td><a href="../4.16-bandwidth-management/index.html">§4.16 带宽管理</a>——Bandwidth Request Events 的发起命令</td></tr>
<tr><td><b>Set Latency Tolerance Value</b></td><td><a href="../4.13-device-notifications/index.html">§4.13 设备通知</a>——LTM/LTR 链路（§4.13.1）里的软件入口（§4.6.14）</td></tr>
<tr><td><b>Get Port Bandwidth</b></td><td><a href="../4.16-bandwidth-management/index.html">§4.16 带宽管理</a>——带宽域与 Bandwidth Error 的查询侧</td></tr>
<tr><td><b>Force Header</b></td><td>USB3 链路管理域（LMP/TP 直发）——本板块未建</td></tr>
<tr><td><b>Get Extended Property</b></td><td><a href="../4.22-xhci-extended-capabilities/index.html">§4.22 xHCI 扩展能力</a>——扩展能力域（属性命令细节归规范第 7 章）</td></tr>
<tr><td><b>Set Extended Property</b></td><td><a href="../4.22-xhci-extended-capabilities/index.html">§4.22 xHCI 扩展能力</a>——同上（GSC=‘1’ 才支持）</td></tr>
</table>
<p>状态修改命令的门铃纪律（p90 Note）：某端点有状态修改命令未决时，软件不得敲该端点的门铃——Configure Endpoint / Evaluate Context / Reset Endpoint / Stop Endpoint / Set TR Dequeue Pointer 影响设备的特定端点，Address Device / Disable Slot / Reset Device 影响设备的全部端点。</p>`;

const cfg = {
  theme: THEME,
  pageTitle: "§4.6 命令接口 · xHCI 规范对照学习",
  navTitle: "§4.6 命令接口",
  specRef: "xHCI 1.2b §4.6 Command Interface · p90–142 · §4.6.1 命令环操作 p91–93 · 命令 17 条（§4.6.2–4.6.18）p93–141",
  prevHref: "../4.5-device-slot-management/index.html", prevLabel: "§4.5 设备槽管理",
  nextHref: "../4.7-doorbells/index.html", nextLabel: "§4.7 门铃",
  prose: [
    "命令接口是软件对 xHC 发号施令的唯一正式通道，由 <b>Command Ring Control Register（CRCR）</b>管理：软件（规范原文称 system software，系统软件）把命令 TRB 放上命令环，然后写主机控制器门铃寄存器（门铃 0，DB Target=0）通知 xHC；xHC 取指执行，并把 <b>Command Completion Event</b> 写到<b>主事件环</b>（Primary Event Ring）回报每条命令的完成状态（p90）。命令执行时间由实现定义；多条命令按入环顺序执行（p91 Note）。命令超时没有硬件兜底——<b>完全由软件负责</b>：超时后软件可按 §4.6.1.2 的机制中止命令（p90 Note）。",
    "命令环运行（§4.6.1 p91–93）三件事。①<b>只有一条</b>：每个 xHC 实例只有一条命令环，其上只允许 Table 6-91 定义的 TRB 类型；命令环上的工作项叫 Command Descriptor（CD），一个 CD 恰为一个命令 TRB。②<b>取指指针在 xHC 手里</b>：Command Ring Dequeue Pointer 是 xHC 内部寄存器，不直接暴露给软件，其值经命令完成事件的 Command TRB Pointer 字段回报；初值来自 CRCR 的 Command Ring Pointer 字段（须在 R/S=1 前设好，且只能在 CRR=‘0’ 的停止态修改）。③<b>停与中止</b>：写 CRCR 的 CS 位=‘1’ 停止取指——当前命令执行完后环停，回一个 Completion Code=Command Ring Stopped 的完成事件，此后环上全部命令的所有权交软件（可增删重排），再写门铃即重启（§4.6.1.1 p92）；写 CRCR 的 CA 位=‘1’ 中止当前命令——被中止命令回 Command Aborted 完成事件，随后也有 Command Ring Stopped 事件（§4.6.1.2 p92–93）。实现注记（p93）：通常只有命令「卡住」才会真被中止——典型如 Address Device 在等 USB 设备对 SET_ADDRESS 的应答，那件事不在 xHC 的控制范围内；软件还应给中止操作本身计时，CRR 迟迟不翻转（例如超 5 秒）就该认定 xHC 有更大的问题，动用 HCRST。",
    "§4.6.2–§4.6.18 共 17 条命令，本页总表逐条给出一行。两条用命令的前提纪律（p90 Note）：其一，命令与其引用的全部数据结构必须由软件保证格式正确——xHC 的校验程度因实现而异，收到非法命令的后果是未定义行为；其二，某端点有状态修改命令未决时不得敲该端点的门铃（分组卡尾注列出了两类影响面）。可选规范命令（Force Event / Negotiate Bandwidth / Set LTV / Get Port Bandwidth / Get·Set Extended Property）的支持与否由各自能力位决定，不支持时以 TRB Error 完成码回执。",
  ],
  quotes: [
    { en: "Software places commands on the Command Ring, then rings the Host Controller Doorbell Register to notify the xHC.",
      zh: "命令投递两步：放上命令环 → 写门铃通知 xHC——§4.1 命令模型的规范出处。",
      src: "xHCI 1.2b §4.6 p90" },
    { en: "Software shall be responsible for all command timeouts. If a command times out, software may abort the command using the mechanism described in section 4.6.1.2.",
      zh: "命令超时全是软件的责任——超时后可按 §4.6.1.2 中止；xHC 侧没有超时兜底。",
      src: "xHCI 1.2b §4.6 Note p90" },
    { en: "Only one Command Ring exists per xHC instance.",
      zh: "每个 xHC 实例只有一条命令环——多条命令环是画不得的。",
      src: "xHCI 1.2b §4.6.1 p91" },
    { en: "The xHC shall generate a Command Completion Event for every command.",
      zh: "每条命令必有 Command Completion Event——命令与回执一一对应，没有「发出去就算」。",
      src: "xHCI 1.2b §4.6.1 p91" },
    { en: "The Primary Event Ring receives all Command Completion Events.",
      zh: "主事件环接收全部命令完成事件——回执走事件环，不回命令环。",
      src: "xHCI 1.2b §4.6.1 p91" },
    { en: "System software may abort the execution of the current command by writing a ‘1’ to the Command Abort (CA) bit of the Command Ring Control register.",
      zh: "中止开关=CRCR 的 CA 位写 ‘1’——当前命令回 Command Aborted，环随后停在 Stopped。",
      src: "xHCI 1.2b §4.6.1.2 p92" },
  ],
  cards: [
    { h2: "§4.6.1 命令环运行四环节：投递 · 回执 · 停止 · 中止",
      html: `<table class="xsp-tb">
<tr><th style="width:10%">环节</th><th style="width:12%">开关/载体</th><th style="width:64%">机制</th><th style="width:14%">页</th></tr>
<tr><td><b>投递</b></td><td>命令环 + 门铃 0</td><td>把命令 TRB 写入命令环（Cycle bit=命令环 PCS）→ 写门铃寄存器 0（DB Target=Host Controller Command，DB Stream ID=‘0’）→ xHC 取指执行，直到环停或取空</td><td class="mono">p91</td></tr>
<tr><td><b>回执</b></td><td>主事件环</td><td>每条命令生成 Command Completion Event：Command TRB Pointer 回指发起命令、Completion Code=完成状态、Slot ID/VF ID 照抄命令 TRB；完成事件按命令在环上的位置有序</td><td class="mono">p91–92</td></tr>
<tr><td><b>停止</b></td><td class="mono">CRCR.CS=‘1’</td><td>当前命令执行完后停止取指，回 Command Ring Stopped；停止期环上命令归软件处置（可删/加/重排），重启=再写门铃（若停机期间改写过 CRCR 指针则从新值起跑）</td><td class="mono">p92</td></tr>
<tr><td><b>中止</b></td><td class="mono">CRCR.CA=‘1’</td><td>当前命令回 Command Aborted 并推进 Dequeue Pointer，随后回 Command Ring Stopped；两命令间隙中止可只有 Stopped 事件；中止后按 §4.6.1.1 重启</td><td class="mono">p92–93</td></tr>
</table>
<p>厂商自定义命令（Vendor Defined TRB Type）也走同一模型：同样用 Command Completion Event TRB 报告完成（p92）。</p>` },
    { h2: "17 条命令总表（§4.6.2–§4.6.18，规范节序）",
      html: cmdTable },
    { h2: "按用途分组：槽管理 / 端点管理 / 其它（标已建节出现处）",
      html: groupTable },
  ],
  linksHtml: `
<div class="xsp-card"><h2>相关</h2>
<p><a href="../../../xhc-machines/fig4-command-ring/index.html">四机课 Fig4 订单柜台（命令环机器）</a>——命令 TRB 投递、门铃 0、命令完成事件回执的全链机器动画（§4.6.1 的机制对照）。</p>
<p><a href="../4.1-command-operation/index.html">§4.1 命令操作</a>——命令模型的八步泳道走查；<a href="../4.9-trb-ring/index.html">§4.9 TRB 环</a>——命令环所属的 TRB 环共性机制（§4.9.3 命令环管理）；<a href="../4.7-doorbells/index.html">§4.7 门铃</a>——门铃 0 与设备门铃的寄存器面展开。</p></div>`,
  footLine: "判据：xHCI 1.2b（625472 Rev 1.2b）§4.6 p90–142 · 引文逐字核对，证据见 <a href=\"EVIDENCE.md\">EVIDENCE.md</a> · 生成于 2026-11-04",
};

const page = tablePage(cfg);
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, (page.length / 1024).toFixed(0) + " KB");

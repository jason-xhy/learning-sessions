// §4.11 TRB（传输请求块）—— 家族地图型表格节（table_page.mjs 量产件）
// 判据：xHCI 1.2b §4.11 p188–218（4.11.1 p188 / 4.11.2 p190 / 4.11.3 p200 / 4.11.4 p202 /
//       4.11.5 p206 / 4.11.6 p210 / 4.11.7 p211 / 4.11.7.1 p213）；
//       BEI 判据 §4.17.5 p268；位级定义 §6.4.1 p427 / §6.4.2 p438 / §6.4.6 Table 6-91 p469。
// 引文六条逐字（见 EVIDENCE.md）。本节是家族地图课：位级细节归 §6.4 与机制课 0006，不逐字段展开。
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tablePage } from "../_gen/table_page.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

const cfg = {
  theme: THEME,
  pageTitle: "§4.11 TRB（传输请求块） · xHCI 规范对照学习",
  navTitle: "§4.11 TRB（传输请求块）",
  specRef: "xHCI 1.2b §4.11 TRBs（4.11.1 TRB Template · 4.11.2 Transfer TRBs · 4.11.3 Event TRBs · 4.11.4 Command TRBs · 4.11.5 Other TRBs · 4.11.6 Vendor Defined TRB Types · 4.11.7 TD Usage Rules）· p188–218",
  prevHref: "", prevLabel: "",
  nextHref: "", nextLabel: "",
  prose: [
    "<b>TRB＝传输请求块</b>（Transfer Request Block，板块既有立法）。本节是 TRB 家族的地图课——规范开场就把定位讲明：这里讨论的是 §6.4 通用数据结构定义<b>之外</b>的属性与用法（引文①）。一颗 TRB 由 <b>Parameter / Status / Control</b> 三组件构成（引文②），格式与内容由 Control 组件里的 <b>TRB Type</b> 字段一锤定音——全家族按它分门别类。位级细节（每个字段的位号、位宽、取值表）不在本节展开：归第 6 章 §6.4 与机制课 0006（先认零件：TRB、TD 与环的几何），本页只给家族地图与使用规则。",
    "家族三大类各住各的环：传输 TRB 住传输环、事件 TRB 住事件环、命令 TRB 住命令环；方向与 §4.9 一致——传输与命令由驱动（规范原文称 system software（系统软件））生产、xHC 消费，事件环倒转：xHC 生产、驱动消费（引文④）。每条命令的完成必有回执——xHC 在事件环上放一颗 Command Completion Event TRB（引文⑤）。三大类之外还有「其它」：Link TRB 把非连续内存段连成环，Event Data TRB 让软件自定义事件内容，厂商还可按 Table 6-91 预留的码位定义私有 TRB（§4.11.6）——本节把它们单独立类。",
    "模板层的规则跨全家族成立：TRB Type 恒在 Control 组件的 bits 10-15，Cycle bit 恒在 bit 0（p188–189）；命令/传输 TRB 建环时由软件全部清 0、此后对 xHC 只读，事件 TRB 反向——xHC 写、软件建环后只读（§4.11.1.1 / §4.11.1.2）。写 TRB 还有原子性纪律：四个 Dword 不做原子写时，必须先写 Parameter 与 Status、最后写 Control，违者行为未定义（p189 Note）。§4.11.7 再给 TD 使用规则——Chain bit 标出 TD 边界、IOC/ISP 管事件生成、TD Fragment 约束 IOC 落点——与 §4.9 的环机制拼在一起，才是 TRB 从写入到回执的完整运转图（三环运转见互链卡的 4.9 节）。",
  ],
  quotes: [
    { en: "This section discusses the properties and uses of TRBs that are outside of the scope of the general data structure descriptions that are provided in section 6.4.",
      zh: "本节讲 TRB 的属性与用法——范围就是 §6.4 数据结构定义之外的部分，位级拆解归第 6 章。",
      src: "xHCI 1.2b §4.11 p188" },
    { en: "A TRB consist of 3 basic components: Parameter, Status, and Control. The following sub-sections identify the properties of each component.",
      zh: "一颗 TRB 三组件：Parameter、Status、Control——模板的骨架。（consist 为规范原文排印原样）",
      src: "xHCI 1.2b §4.11.1 p188" },
    { en: "The Chain bit (CH field in Figure 6-8) may be set to ‘1’ in Normal, Data Stage, Status Stage, and Isoch TRBs to form multi-TRB Transfer Descriptors.",
      zh: "Chain bit 让 Normal / Data Stage / Status Stage / Isoch 四种 TRB 链成多 TRB TD——散列/聚集操作的根基。",
      src: "xHCI 1.2b §4.11.2.1 p190" },
    { en: "The xHC is the producer of all Event TRBs and system software is the consumer.",
      zh: "事件环方向倒转的另一处表述：全部事件 TRB 都由 xHC 生产、系统软件消费。",
      src: "xHCI 1.2b §4.11.3 p201" },
    { en: "For every command, the xHC notifies system software of its completion by placing a Command Completion Event TRB on the Event ring.",
      zh: "每条命令的完成通知都是同一形态——事件环上的一颗 Command Completion Event TRB。",
      src: "xHCI 1.2b §4.11.4 p202" },
    { en: "A Transfer Descriptor (TD) may be composed of 1 or more TRBs. The TRB Chain flag is used identify the TRBs of a TD, where the Chain flag is set in all the TRBs of a TD except the last.",
      zh: "TD 由一颗以上 TRB 组成，Chain flag 置于除最后一颗外的全部 TRB——TD 边界的判据。（used identify 为规范原文排印原样）",
      src: "xHCI 1.2b §4.11.7 p211" },
  ],
  cards: [
    { h2: "TRB 家族总表：三大类 + 其它（行数以规范小节为准）",
      html: `<table class="xsp-tb">
<tr><th>类别</th><th>代表 TRB（英文原名）</th><th>规范小节</th><th>页码</th></tr>
<tr><td><b>传输 TRB</b> Transfer TRBs<br>住传输环；软件生产、xHC 消费（p190）</td>
<td>Normal TRB（4.11.2.1）· Setup Stage / Data Stage / Status Stage TRB（4.11.2.2）· Isoch TRB（4.11.2.3）· No Op Transfer TRB（本节无独立小节，规则见 §4.11.7 p213，位级 §6.4.1.4 p437）</td>
<td>§4.11.2<br>（4.11.2.4 TD Size 与 4.11.2.5 Frame ID 是字段小节，非 TRB 类型）</td>
<td class="mono">p190–200</td></tr>
<tr><td><b>事件 TRB</b> Event TRBs<br>住事件环；xHC 生产、软件消费（p201）；事件描述符（ED）恒为单颗 Event TRB（p200–201）</td>
<td>Transfer Event TRB（4.11.3.1——本节唯一展开的事件 TRB）；其余按 Event Type 分：Command Completion（§6.4.2.2 p440）· Port Status Change（§6.4.2.3 p441）· Bandwidth Request（§6.4.2.4 p443）· Doorbell（§6.4.2.5 p444，虚拟化）· Host Controller（§6.4.2.6 p445）· Device Notification（§6.4.2.7 p446）——副环只许 Transfer / Bandwidth Request / Device Notification 三类（p201）</td>
<td>§4.11.3</td>
<td class="mono">p200–201</td></tr>
<tr><td><b>命令 TRB</b> Command TRBs<br>住命令环；软件生产、xHC 消费；完成回执恒为 Command Completion Event（p202）；Address Device / Configure Endpoint / Evaluate Context 走 Input Context（p202 Note）</td>
<td>No Op（4.11.4.1）· Enable Slot（4.11.4.2）· Disable Slot（4.11.4.3）· Address Device（4.11.4.4）· Configure Endpoint（4.11.4.5）· Evaluate Context（4.11.4.6）· Reset Endpoint（4.11.4.7）· Stop Endpoint（4.11.4.8）· Set TR Dequeue Pointer（4.11.4.9）· Reset Device（4.11.4.10）· Force Event（4.11.4.11，可选）· Negotiate Bandwidth（4.11.4.12，可选）· Set Latency Tolerance Value（4.11.4.13，可选）· Get Port Bandwidth（4.11.4.14，可选）· Force Header（4.11.4.15）· Get Extended Property（4.11.4.16，可选）· Set Extended Property（4.11.4.17，可选）——共 17 种，其中 6 种 Optional Normative</td>
<td>§4.11.4</td>
<td class="mono">p202–206</td></tr>
<tr><td><b>其它 TRB</b><br>不自成一环：Link 与 Event Data 按规则混住传输/命令环；Vendor Defined 按所在环的规则处理</td>
<td>Link TRB（4.11.5.1——段尾与段间连接）· Event Data TRB（4.11.5.2——软件自定义回执，仅传输环）· Vendor Defined TRB Types（4.11.6——码位见 Table 6-91，命令环上视为 No Op p211）</td>
<td>§4.11.5–4.11.6</td>
<td class="mono">p206–211</td></tr>
</table>
<p>（TRB 类型全目录＝规范 Table 6-91，§6.4.6 p469；允许落在传输环的类型随端点类型变——Table 6-92，p472）</p>` },
    { h2: "TRB 模板通用字段速览（§4.11.1 现场核：只列字段名与语义，位宽细节归 §6.4）",
      html: `<table class="xsp-tb">
<tr><th>字段</th><th>一句话语义</th><th>判据页</th><th>位级定义</th></tr>
<tr><td class="mono">TRB Type</td><td>决定整颗 TRB 的格式与内容；恒在 Control 组件 bits 10-15——家族分类的判据</td><td class="mono">p188</td><td class="mono">§6.4.6 Table 6-91 p469</td></tr>
<tr><td class="mono">Cycle (C)</td><td>环的入队位置标记；恒在 Control 组件 bit 0（§4.9 的比对执行规则）</td><td class="mono">p188–189</td><td class="mono">§4.9 p153</td></tr>
<tr><td class="mono">CH (Chain)</td><td>多 TRB TD 内除末颗外全置 1；Normal / Data Stage / Status Stage / Isoch 可用（引文③）；命令环 Link TRB 的 CH 被 xHC 忽略（p207）</td><td class="mono">p189–190、p207</td><td class="mono">§6.4.1</td></tr>
<tr><td class="mono">ENT (Evaluate Next TRB)</td><td>强制 xHC 在调度下一端点前先评估 TD 的下一颗 TRB；不跨 TD，仅 CH=1 时有效</td><td class="mono">p189</td><td class="mono">§4.12.3 / §6.4</td></tr>
<tr><td class="mono">IOC (Interrupt On Completion)</td><td>该 TRB 完成时生成事件；Link TRB 的 IOC 还可用来跟踪 Dequeue Pointer 跨段（p207–208）</td><td class="mono">p190、p207–208</td><td class="mono">§6.4</td></tr>
<tr><td class="mono">ISP (Interrupt-on Short Packet)</td><td>执行中收到短包即生成事件——p190 完成事件三条件之二（IOC / 短包+ISP / 出错）</td><td class="mono">p190</td><td class="mono">§6.4.1</td></tr>
<tr><td class="mono">BEI (Block Event Interrupt)</td><td>事件照放事件环但不发中断——Normal/Isoch Transfer TRB 与 Event Data TRB 支持</td><td class="mono">§4.17.5 p268</td><td class="mono">§6.4.1</td></tr>
<tr><td class="mono">IDT (Immediate Data)</td><td>参数直接内嵌 TRB 本体：Setup Stage TRB 恒 IDT=1 且 Length=8（p192）；TD 内 IDT=1 的必须是唯一传输 TRB（p212）</td><td class="mono">p192、p212</td><td class="mono">§6.4.1.2.1</td></tr>
<tr><td class="mono">Interrupter Target</td><td>事件定向中断器；同一 TD 内全部 TRB 必须同值（p212）；命令环 Link TRB 中被 xHC 忽略（p208 Note）</td><td class="mono">p208、p212</td><td class="mono">§6.4</td></tr>
<tr><td class="mono">TRB Transfer Length</td><td>本 TRB 缓冲区字节数；短包后软件用它累加出实际传输字节数（p212 两法）</td><td class="mono">p212</td><td class="mono">§6.4.1</td></tr>
<tr><td class="mono">TD Size</td><td>软件填的剩余包数估计，帮 xHC 免读 TD 尾部；末颗恒清 0，5 位装不下封顶 31</td><td class="mono">p197–198</td><td class="mono">§6.4.1</td></tr>
<tr><td class="mono">Frame ID / SIA / TBC / TLBPC</td><td>Isoch 专用：目标帧号（SIA=0 才有效）/ 尽快调度 / 突发包计数两字段</td><td class="mono">p195–196、p198</td><td class="mono">§6.4.1.3</td></tr>
<tr><td class="mono">Event Type 相关字段</td><td>事件侧通用规则：Event TRB 的 Parameter / Length / Control 高字全部随 Event Type 变化</td><td class="mono">p201</td><td class="mono">§6.4.2</td></tr>
</table>
<p>（本表只收 §4.11 正文现场出现的通用位；四 Dword 非原子写时先 Parameter/Status 后 Control 的顺序纪律见 p189 Note——要义段 3）</p>` },
    { h2: "TD 使用规则要点（§4.11.7 p211–213 · §4.11.7.1 TD Fragments p213–218）",
      html: `<table class="xsp-tb">
<tr><th>规则点</th><th>规范判据</th><th>页码</th></tr>
<tr><td>TD 组成与 Chain bit</td><td>TD＝1 颗以上 TRB；Chain flag 置于 TD 内除最后一颗外的全部 TRB（引文⑥）——这就是 TD 边界判据</td><td class="mono">p211</td></tr>
<tr><td>TD 跨段</td><td>TD 跨 Ring Segment 边界时可含一颗以上 Link TRB；但 TD Fragment 不得跨段</td><td class="mono">p211、p214</td></tr>
<tr><td>「Transfer TRB」的定义</td><td>Transfer TRB＝§6.4.1 定义的 TRB；Link 与 Event Data TRB 不算 Transfer TRB——各类规则的适用面以此为界</td><td class="mono">p212 Note</td></tr>
<tr><td>IN 端点短包两法（二选一，互斥）</td><td>法一：TD 内全部 TRB 置 ISP、末颗置 IOC——短包或装满都生成 Transfer Event，实际字节数＝各 TRB Transfer Length 之和减去事件的 Length；法二：TD 以 Event Data TRB（IOC=1）收尾、传输 TRB 不置 ISP/IOC——实际字节数直接由 Event Data Transfer Event 的 Length 报出（上限 16,777,215 字节）</td><td class="mono">p212</td></tr>
<tr><td>Event Data TRB 约束</td><td>一颗 TD 内可放多颗；用了它则 TD 内传输 TRB 不得再置 IOC/ISP（两类事件报告互斥）；不得紧跟另一颗 Event Data TRB（p210）；Isoch 环禁独立 Event Data TD（p210）</td><td class="mono">p212、p210</td></tr>
<tr><td>IDT 约束</td><td>TD 内任一 TRB 置 IDT=1，它必须是该 TD 唯一的传输 TRB（可另含一颗 Event Data TRB）</td><td class="mono">p212</td></tr>
<tr><td>Interrupter Target 约束</td><td>同一 TD 全部 TRB 同值；非法值＋该 TRB 生成事件＝未定义行为（虚拟化下不得波及其它 function）</td><td class="mono">p212</td></tr>
<tr><td>Link TRB 禁位</td><td>不得作多 TRB TD 的首颗或末颗；TD 内不得连续两颗 Link TRB（CH 均 1）；单 Link TRB 的 Link TD 可前缀/后缀于 TD</td><td class="mono">p213</td></tr>
<tr><td>No Op 禁位</td><td>No Op Transfer TRB 不得进多 TRB TD——其 CH 恒 0，且前一颗 CH 也必须为 0</td><td class="mono">p213</td></tr>
<tr><td>违规后果</td><td>违反本节要求可能招致 xHC 未定义行为</td><td class="mono">p213</td></tr>
<tr><td>事件与出队指针</td><td>事件不止报完成：软件可在长 TD 中途置 IOC 定期收回 Dequeue Pointer、复用已被消费的 TRB；中途事件无错时报 Success；TD 内任一事件报错即覆盖其它 Success</td><td class="mono">p213</td></tr>
<tr><td>TD Fragment（4.11.7.1）</td><td>MBP＝(Max Burst Size+1)×Max Packet Size；TD＝1 颗以上 Fragment；Fragment 首 TRB 最后写；TRB Packet Boundary＝某传输 TRB 缓冲首字节恰为 USB 包首字节；IOC 每 Fragment 至多一颗，落点限于紧邻包边界前或 Fragment 末颗</td><td class="mono">p213–215</td></tr>
</table>
<p>（p212 短包两法列表在规范 PDF 提取文本中编号从「4.」起——排版伪影，本表用规范化编号并注页码；图 4-16/4-17/4-18 的拼装几何未作画面，机器演示见互链卡 Fig1）</p>` },
  ],
  linksHtml: `
<div class="xsp-card"><h2>互链 · 本节环节的既有机器与课（位级与动态画面不重造）</h2>
<table class="xsp-tb">
<tr><th>本节环节</th><th>机器 / 课</th><th>演示什么</th></tr>
<tr><td>TRB 位级拆解（本表只列字段名，位号与取值全在那边）</td><td><a href="../../../0006-xhc-trb-parts.html">课 0006 · 先认零件：TRB、TD 与环的几何</a></td><td>TRB 全部位级拆解——Parameter/Status/Control 三段与字段逐个拆</td></tr>
<tr><td>Cycle bit 与环机制（模板字段表的比对执行规则）</td><td><a href="../../../0007-xhc-ring-keys.html">课 0007 · 环的运转：环机制与四个控制位</a></td><td>PCS/CCS 与 Cycle bit 的比对执行规则</td></tr>
<tr><td>一颗 TD 的全程（§4.11.7 规则的动态结果）</td><td><a href="../../../0009-xhc-transfer-drama.html">课 0009 · 一场传输的三视角走查</a></td><td>TD 从写入传输环到 Transfer Event 回执的三方走查</td></tr>
<tr><td>TRB 拼装成 TD 的几何（图 4-16/4-17 的机器版）</td><td><a href="../../../xhc-machines/fig1-assembly/index.html">四机课 Fig1 TRB 装配机器</a></td><td>TRB 与 TD 的装配过程</td></tr>
<tr><td>三环与生产/消费方向（家族总表的「住哪个环」列）</td><td><a href="../4.9-trb-ring/index.html">§4.9 TRB 环</a></td><td>传输/命令/事件三环的指针形态、Cycle 位置标记与门铃三张对照表</td></tr>
<tr><td>§4.10 主机控制器 TRB 处理（待建）</td><td><a href="../../index.html">板块目录（待建节指针）</a></td><td>TRB 执行、错误与事件的处理流程</td></tr>
</table>
<p>前后节：<a href="../4.9-trb-ring/index.html">§4.9 TRB 环</a>——TRB 的住址与三环生产/消费方向；<a href="../../index.html">§4.10 主机控制器 TRB 处理（待建）</a>——TRB 执行、错误与事件细节；<a href="../../index.html">§4.12 Streams（待建）</a>——Bulk 端点的多传输环扩展（p218 起）。</p></div>`,
  footLine: "判据：xHCI 1.2b（625472 Rev 1.2b）§4.11 p188–218（BEI 判据 §4.17.5 p268；位级定义 §6.4.1 p427 / §6.4.2 p438 / Table 6-91 p469）· 引文逐字核对，证据见 <a href=\"EVIDENCE.md\">EVIDENCE.md</a> · 生成于 2026-11-04",
};

const page = tablePage(cfg);
// 窄幅适配补丁（构建期注入，不改 _gen/table_page.mjs；照抄 4.9-trb-ring 先例，同 DESIGN 契约修订"构建期补丁"形态）：
// ≤900px 时表格卡内横向滚动（.xsp-tb display:block + overflow-x:auto），页面本体不出横向滚动条——
// 家族总表 4 列的 min-content 宽 > 390px 视口，不补丁则 full-page 截图宽 >390（DESIGN §1.8 390px 门）。
const NARROW_CSS = '<style>@media (max-width: 900px){.xsp-card table.xsp-tb{display:block;overflow-x:auto}}</style>';
const patched = page.includes("</head>") ? page.replace("</head>", NARROW_CSS + "</head>") : page + NARROW_CSS;
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), patched);
console.log("wrote", name, (patched.length / 1024).toFixed(0) + " KB");

// §4.11 TRB（传输请求块）—— 家族地图型表格节（table_page.mjs 量产件）
// 判据：xHCI 1.2b §4.11 p188–218（4.11.1 p188 / 4.11.2 p190 / 4.11.3 p200 / 4.11.4 p202 /
//       4.11.5 p206 / 4.11.6 p210 / 4.11.7 p211 / 4.11.7.1 p213）；
//       BEI 判据 §4.17.5 p268；位级定义 §6.4.1 p427 / §6.4.2 p438 / §6.4.6 Table 6-91 p469。
// 引文六条逐字（见 EVIDENCE.md）。本节是家族地图课：逐字段取值表归 §6.4；
// 四双字位号骨架由本节原生小件「TRB 装配卡座」（arf411）自含演示（2026-11-05 自含化改造），
// 位号判据＝§4.11.1 p188-189（模板：TRB Type 恒 bits 10-15、Cycle 恒 bit 0）
// + §6.4.1.1 Normal TRB Figure 6-8 / Table 6-20~6-22 p427-429（CH=bit4 / IOC=bit5 / IDT=bit6 /
//   BEI=bit9 / Length=16:0 / TD Size=21:17 / Interrupter Target=31:22 / 指针 63:0）。
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tablePage } from "../_gen/table_page.mjs";
import * as k from "/Users/jason/.zcode/skills/anatomy/kit/iso-kit.mjs";
import { kitScript } from "/Users/jason/.zcode/skills/anatomy/scripts/inline-kit.mjs";

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
    "<b>TRB＝传输请求块</b>（Transfer Request Block，板块既有立法）。本节是 TRB 家族的地图课——规范开场就把定位讲明：这里讨论的是 §6.4 通用数据结构定义<b>之外</b>的属性与用法（引文①）。一颗 TRB 由 <b>Parameter / Status / Control</b> 三组件构成（引文②），格式与内容由 Control 组件里的 <b>TRB Type</b> 字段一锤定音——全家族按它分门别类。位级骨架本节自含：四个双字（DW0–DW3）的位号布局见下方「TRB 装配卡座」的机器演示，字段语义配本页速览表逐条对照；逐字段的位宽与取值表仍归第 6 章 §6.4。",
    "家族三大类各住各的环：传输 TRB 住传输环、事件 TRB 住事件环、命令 TRB 住命令环；方向与 §4.9 一致——传输与命令由驱动（规范原文称 system software（系统软件））生产、xHC 消费，事件环倒转：xHC 生产、驱动消费（引文④）。每条命令的完成必有回执——xHC 在事件环上放一颗 Command Completion Event TRB（引文⑤）。三大类之外还有「其它」：Link TRB 把非连续内存段连成环，Event Data TRB 让软件自定义事件内容，厂商还可按 Table 6-91 预留的码位定义私有 TRB（§4.11.6）——本节把它们单独立类。",
    "模板层的规则跨全家族成立：TRB Type 恒在 Control 组件的 bits 10-15，Cycle bit 恒在 bit 0（p188–189）；命令/传输 TRB 建环时由软件全部清 0、此后对 xHC 只读，事件 TRB 反向——xHC 写、软件建环后只读（§4.11.1.1 / §4.11.1.2）。写 TRB 还有原子性纪律：四个 Dword 不做原子写时，必须先写 Parameter 与 Status、最后写 Control，违者行为未定义（p189 Note）——装配卡座 F2 的芯片落位顺序照此排。§4.11.7 再给 TD 使用规则——Chain bit 标出 TD 边界、IOC/ISP 管事件生成、TD Fragment 约束 IOC 落点——与 §4.9 的环机制拼在一起，才是 TRB 从写入到回执的完整运转图（TD 拼装与入环画面见本节装配卡座 F3/F4；三环指针细节见 §4.9）。",
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
<p>（p212 短包两法列表在规范 PDF 提取文本中编号从「4.」起——排版伪影，本表用规范化编号并注页码；图 4-16/4-17/4-18 的拼装几何见本节装配卡座 F3）</p>` },
  ],
  linksHtml: `
<div class="xsp-card"><h2>互链 · 本节环节的既有机器与课（位级与动态画面不重造）</h2>
<table class="xsp-tb">
<tr><th>本节环节</th><th>机器 / 课</th><th>演示什么</th></tr>
<tr><td>TRB 位级拆解（本表只列字段名，位号与取值全在那边）</td><td><a href="../../../0006-xhc-trb-parts.html">课 0006 · 先认零件：TRB、TD 与环的几何</a></td><td>TRB 全部位级拆解——Parameter/Status/Control 三段与字段逐个拆</td></tr>
<tr><td>Cycle bit 与环机制（模板字段表的比对执行规则）</td><td><a href="../../../0007-xhc-ring-keys.html">课 0007 · 环的运转：环机制与四个控制位</a></td><td>PCS/CCS 与 Cycle bit 的比对执行规则</td></tr>
<tr><td>一颗 TD 的全程（§4.11.7 规则的动态结果）</td><td><a href="../../../0009-xhc-transfer-drama.html">课 0009 · 一次控制传输的三视角走读</a></td><td>TD 从写入传输环到 Transfer Event 回执的三方走查</td></tr>
<tr><td>TRB 拼装成 TD 的几何（图 4-16/4-17 的机器版）</td><td><a href="../../../xhc-machines/fig1-assembly/index.html">四机课 Fig1 TRB 装配机器</a></td><td>TRB 与 TD 的装配过程</td></tr>
<tr><td>三环与生产/消费方向（家族总表的「住哪个环」列）</td><td><a href="../4.9-trb-ring/index.html">§4.9 TRB 环</a></td><td>传输/命令/事件三环的指针形态、Cycle 位置标记与门铃三张对照表</td></tr>
<tr><td>§4.10 主机控制器 TRB 处理（待建）</td><td><a href="../../index.html">板块目录（待建节指针）</a></td><td>TRB 执行、错误与事件的处理流程</td></tr>
</table>
<p>前后节：<a href="../4.9-trb-ring/index.html">§4.9 TRB 环</a>——TRB 的住址与三环生产/消费方向；<a href="../../index.html">§4.10 主机控制器 TRB 处理（待建）</a>——TRB 执行、错误与事件细节；<a href="../../index.html">§4.12 Streams（待建）</a>——Bulk 端点的多传输环扩展（p218 起）。</p></div>`,
  footLine: "判据：xHCI 1.2b（625472 Rev 1.2b）§4.11 p188–218（BEI 判据 §4.17.5 p268；位级定义 §6.4.1 p427 / §6.4.2 p438 / Table 6-91 p469）· 引文逐字核对，证据见 <a href=\"EVIDENCE.md\">EVIDENCE.md</a> · 生成于 2026-11-05",
};

// =====================================================================
// arf411 「TRB 装配卡座」—— 原生小 anatomy 件（30-50 零件，构建期注入 tablePage 产物）
// 概念一句话：一台立式写卡机把一颗 16 字节 TRB 卡立起（四行双字＝三组件的模板印刷），
//   字段芯片按「先 Parameter/Status 后 Control」的顺序落到卡面位槽（p189 Note 的写序纪律），
//   装好的小卡排上导轨、用链夹串成 TD（末颗 CH=0+IOC 灯亮），
//   前方环段托盘里 TD 鱼贯入槽、段尾 Link TRB 的回绕线指回段首——环闭合。
// 位号判据（全部现场核自 /tmp/spec-audit-txt/xhci-1.2b.txt）：
//   模板四字/三组件/固定位＝Figure 4-13 §4.11.1 p188（Parameter=03-00H+07-04H、Status=0B-08H、
//     Control=0F-0CH；C=bit0、ENT=bit1、ISP=bit2、TRB Type=bits 10-15）+
//     §4.11.1.1 p188「TRB Type field shall always reside in bits 10-15」+
//     §4.11.1.1 p189「Cycle bit shall always reside in bit 0」；
//   Normal TRB 字段位号＝Figure 6-8 + Table 6-20/21/22 §6.4.1.1 p427-429
//     （DW0/DW1=Data Buffer Pointer 63:0；DW2＝TRB Transfer Length 16:0 + TD Size 21:17 +
//      Interrupter Target 31:22；DW3＝C:0 ENT:1 ISP:2 NS:3 CH:4 IOC:5 IDT:6 RsvdZ:8:7 BEI:9
//      TRB Type:15:10 RsvdZ:31:16）；
//   TD 组成＝§4.11.7 p211（Chain flag 置于除末颗外全部 TRB）；
//   Link 段尾回绕/Toggle Cycle＝§4.11.5.1 p206-207。
// =====================================================================

const AW = 920, AH = 640, AZ = 45, EL = 30;
const PLATE = { x: -178, y: -112, w: 356, d: 224, r: 10 };
const PLATE_H = 12, FOOT_H = 5;

// —— 区 A：模板卡座（左）——
const SLOT = { x: -150, y: -72, w: 148, d: 36, r: 4 };          // 卡槽块 y -72..-36
const CARD = { x0: -145, x1: -9, yF: -48, t: 6, z0: 12, z1: 100 }; // 主卡正面 y=-48
const POSTS = [[-153, -84], [-1, -84]];                            // 立柱
const BAR = { x: -159, y: -92, w: 162, d: 14, r: 3 };              // 顶夹杆
const KNOB = [-77, -85];                                           // 旋钮

// 卡面版图：标签区 + 位槽区（bit0 在右，随规范图 31 左 0 右）
const BZ = { xl: -100, xr: -12, bit: 2.75 };
const bx0 = (b) => BZ.xr - (b + 1) * BZ.bit;   // 位 b 左缘
const bx1 = (b) => BZ.xr - b * BZ.bit;         // 位 b 右缘

// DW3（Control）模板印字位槽：Figure 4-13 印 C/ENT/ISP/TRB Type；Normal TRB 全集（Table 6-22 p428-429）
const DW3_SOCKETS = [
  { lo: 0, hi: 0, tag: "C" }, { lo: 1, hi: 1, tag: "ENT" }, { lo: 2, hi: 2, tag: "ISP" },
  { lo: 3, hi: 3, tag: "NS" }, { lo: 4, hi: 4, tag: "CH" }, { lo: 5, hi: 5, tag: "IOC" },
  { lo: 6, hi: 6, tag: "IDT" }, { lo: 7, hi: 8, tag: "" }, { lo: 9, hi: 9, tag: "BEI" },
  { lo: 10, hi: 15, tag: "TRB Type" }, { lo: 16, hi: 31, tag: "RsvdZ", faint: true },
];
const ROWS = [
  { name: "DW0 第1双字", comp: "Parameter", z0: 22, z1: 37, sockets: [{ lo: 0, hi: 31, tag: "Data Buffer Pointer Lo · 指针 bits 31:0", size: 1.5 }],
    chips: [{ lo: 0, hi: 31, label: "Data Buffer Pointer Lo —— 指针 bits 31:0", size: 1.8 }] },
  { name: "DW1 第2双字", comp: "Parameter", z0: 38, z1: 53, sockets: [{ lo: 0, hi: 31, tag: "Data Buffer Pointer Hi · 指针 bits 63:32", size: 1.5 }],
    chips: [{ lo: 0, hi: 31, label: "Data Buffer Pointer Hi —— 指针 bits 63:32", size: 1.8 }] },
  { name: "DW2 第3双字", comp: "Status", z0: 54, z1: 71,
    sockets: [
      { lo: 0, hi: 16, tag: "TRB Transfer Length 16:0", size: 1.35 },
      { lo: 17, hi: 21, tag: "TD Size 21:17", size: 1.2 },
      { lo: 22, hi: 31, tag: "Interrupter Target 31:22", size: 1.25 },
    ],
    chips: [
      { lo: 0, hi: 16, label: "TRB Transfer Length · bits 16:0", size: 1.5 },
      { lo: 17, hi: 21, label: "TD Size 21:17", size: 1.3 },
      { lo: 22, hi: 31, label: "Interrupter Target 31:22", size: 1.4 },
    ] },
  { name: "DW3 第4双字", comp: "Control", z0: 72, z1: 92, sockets: DW3_SOCKETS.map((s) => ({ ...s, size: s.hi > s.lo ? 1.5 : 1.15 })),
    chips: [
      { lo: 0, hi: 0, tag: "C", size: 1.35 }, { lo: 4, hi: 4, tag: "CH", size: 1.35 },
      { lo: 5, hi: 5, tag: "IOC", size: 1.25 }, { lo: 6, hi: 6, tag: "IDT", size: 1.25 },
      { lo: 9, hi: 9, tag: "BEI", size: 1.15 },
      { lo: 10, hi: 15, label: "TRB Type 10-15", size: 1.45, cls: "arf411-ttype" },
    ] },
];
// F2 芯片落位顺序＝p189 Note 写序纪律：先 Parameter、再 Status、最后 Control
const CHIP_ORDER = [
  { row: 0, i: 0 }, { row: 1, i: 0 },
  { row: 2, i: 0 }, { row: 2, i: 1 }, { row: 2, i: 2 },
  { row: 3, i: 0 }, { row: 3, i: 1 }, { row: 3, i: 2 }, { row: 3, i: 3 }, { row: 3, i: 4 }, { row: 3, i: 5 },
];

// —— 区 B：TD 拼装导轨（右后）——
const RAIL_X0 = 22, RAIL_X1 = 170;
const MINIS = [
  { x0: 34, mark: "CH=1", ch: true }, { x0: 82, mark: "CH=1", ch: true },
  { x0: 130, mark: "CH=0 · IOC=1", ch: false },
];
const MINI_Y = -88, MINI_T = 5, MINI_W = 30, MINI_Z0 = 4, MINI_Z1 = 40;
const LAMP = [176, -70];

// —— 区 C：环段托盘（前）——
const TRAY = { x: -110, y: 44, w: 264, d: 46, r: 5 };
const SLOTS_N = 8, SLOT_DX = 30, SLOT0_X = -93;
const slotX = (i) => SLOT0_X + i * SLOT_DX;
const TOK_SLOTS = [2, 3, 4], LINK_SLOT = 7;

// —— 区 D：控制组（前左）——
const BTNS = [[-166, 76], [-144, 76]], WHEEL = [-122, 76];

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [-159, -92, 126], [-77, -85, 126], [176, -70, 64],
    [-145, -48, 101], [-9, -48, 101], [158, 92, 8], [-176, 104, 10],
  ],
  AW, AH, { pad: 36, azimuth: AZ },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const plane = k.sideMatrix([0, CARD.yF], 0, P, "left");
// 组内文本：只带平面坐标平移（组已有整面矩阵——文本再带全矩阵会双重变换飞出画布）
const ptext = (x, z, text, o = {}) => k.faceTextSvg(`translate(${x} ${-z})`, text, o);
// 卡面（xz 平面）圆角矩形：平面坐标 (u=x, v=-z)，照 desk-computer flat() 先例
const frect = (x0, z0, x1, z1, r = 1, steps = 5) =>
  k.pathOf(k.roundedPlan({ x: x0, y: -z1, w: x1 - x0, d: z1 - z0, r }, steps), true);

// 立卡实体：正面(normal +y)=shade-3、右侧(+x)=shade-0、顶=iso-top（az45 下面/背面不可见）
function cardSolid(x0, yF, z0, x1, z1, t, tone = "mid") {
  const A = at([x0, yF, z0]), B = at([x1, yF, z0]), C = at([x1, yF, z1]), Dp = at([x0, yF, z1]);
  const A2 = at([x0, yF - t, z0]), B2 = at([x1, yF - t, z0]), C2 = at([x1, yF - t, z1]), D2 = at([x0, yF - t, z1]);
  const q = (pts) => k.pathOf(pts, true);
  return `<g class="iso-solid">
<path class="iso-shade" data-shade="0" d="${q([B, C, C2, B2])}"/>
<path class="iso-top" d="${q([Dp, C, C2, D2])}"/>
<path class="iso-shade" data-shade="3" d="${q([A, B, C, Dp])}"/>
<path class="iso-line iso-edge" data-tone="${tone}" d="${q([A, B, C, Dp])}"/>
<path class="iso-line iso-edge" data-tone="${tone}" d="${q([Dp, C, C2, D2])}"/>
<path class="iso-line iso-edge" data-tone="${tone}" d="${q([B, C, C2, B2])}"/>
</g>`;
}

// ---------------- 底板 ----------------
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 9);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // 背缘刻度尺条（仪器感；tick 挂尺条前缘）
  const strip = { x: -150, y: -108, w: 300, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 6, 5, strip.y + 0.6 + strip.d, 0.6, [1.4, 2.8], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  return out.join("");
}

// ---------------- 区 A：模板卡座 + 主卡 ----------------
function dock() {
  const out = [];
  out.push(S(k.slabOf(SLOT, 0, 10, P, 5, 0.8), { tone: "mid" }));                 // 卡槽块
  out.push(L(k.planOutline(k.insetPlan(SLOT, 4), 10, P), { tone: "faint" }));
  // 卡槽缝（主卡落位处，顶面两道线——线端落在块缘轮廓上）
  out.push(L(k.lineOnTop([SLOT.x + 0.4, SLOT.y + 6], [SLOT.x + SLOT.w - 0.4, SLOT.y + 6], 10, P), { tone: "faint" }));
  out.push(L(k.lineOnTop([SLOT.x + 0.4, SLOT.y + SLOT.d - 6], [SLOT.x + SLOT.w - 0.4, SLOT.y + SLOT.d - 6], 10, P), { tone: "faint" }));
  for (const [x, y] of POSTS) {
    out.push(S(k.cylinder(x, y, 4, 10, 108, P, 24), { tone: "mid", crease: "none" }));
    out.push(L(k.sideArc(x, y, 4, 60, P, 12), { tone: "faint" }));
  }
  out.push(S(k.slabOf(BAR, 112, 8, P, 4, 0.6), { tone: "mid" }));
  out.push(D([at([BAR.x + 6, BAR.y + 7, 120]), at([BAR.x + BAR.w - 6, BAR.y + 7, 120])], { size: 0.45 }));
  out.push(S(k.cylinder(KNOB[0], KNOB[1], 5, 120, 6, P, 28), { tone: "mid" }));
  out.push(L(k.knurl(KNOB[0], KNOB[1], 5, 120, 126, 32, P), { tone: "lo" }));
  out.push(D([at([KNOB[0], KNOB[1], 126])], { size: 0.5, tone: "hi" }));
  return out.join("");
}
// 槽块正面（y=-36）平面文字
function ptextAnchor(x, yFace, z, text, o) {
  return k.faceTextSvg(k.sideMatrix([x, yFace], z, P, "left"), text, o);
}
// 底板左前角铭牌板（避开主卡面的大 AABB——遮挡探针按屏幕 AABB 判）
function nameplate() {
  const plate = { x: -162, y: 95, w: 46, d: 9, r: 1.2 };
  return S(k.slabOf(plate, 0, 0.8, P, 3), { tone: "lo", crease: "none" }) +
    k.faceTextSvg(k.topMatrix([plate.x + 8, plate.y + 4.5], 1, P, "x"), "TRB DOCK · 16B", { size: 2.2, tone: "lo" });
}

// 主卡卡面（全部画在 y=CARD.yF 平面内，平面坐标 (x, -z)）
// 发射序分三遍：底槽几何 → 全部文本 → （chips 由 chips() 在其后发射）——
// 遮挡探针按屏幕 AABB + 画家序判，后行 rowband 不得排在前行文本之后（剪切 AABB 会假阳成遮挡）
function cardFace() {
  const geo = [], txt = [];
  // 第一遍：四行底槽 + 位槽虚框 + 标尺几何
  for (const r of ROWS) {
    geo.push(`<path class="arf411-rowband" d="${frect(BZ.xl - 3, r.z0, BZ.xr + 3, r.z1, 1.5)}"/>`);
    for (const s of r.sockets) {
      const x0 = bx0(s.hi), x1 = bx1(s.lo);
      const zTop = r.z1 - 1.8, zBot = r.z0 + 1.8;
      geo.push(`<path class="arf411-socket${s.faint ? " arf411-socketfaint" : ""}" d="${frect(x0 + 0.3, zBot, x1 - 0.3, zTop, 0.6)}"/>`);
    }
  }
  const zR = ROWS[3].z1 + 1.2;
  geo.push(`<path class="iso-line" data-tone="lo" d="M${BZ.xl} ${-zR}L${BZ.xr} ${-zR}"/>`);
  for (let b = 0; b <= 32; b++) {
    const x = BZ.xr - b * BZ.bit;
    const len = b % 4 === 0 ? 2.0 : 1.0;
    geo.push(`<path class="iso-line" data-tone="${b % 4 === 0 ? "mid" : "lo"}" d="M${x} ${-zR}L${x} ${-(zR - len)}"/>`);
  }
  // 第二遍：全部文本（行标签、槽签、位号数字）
  for (const r of ROWS) {
    txt.push(ptext(CARD.x0 + 7, r.z1 - 4.2, r.name, { size: 2.0, tone: "hi" }));
    txt.push(ptext(CARD.x0 + 7, r.z1 - 8.6, r.comp, { size: 1.8, tone: r.comp === "Control" ? "hi" : "mid" }));
    const chipSpans = r.chips.map((c) => `${c.lo}-${c.hi}`);
    for (const s of r.sockets) {
      const tag = s.tag || "";
      if (!tag) continue;
      const x0 = bx0(s.hi), x1 = bx1(s.lo);
      const zTop = r.z1 - 1.8, zBot = r.z0 + 1.8;
      const cx = (x0 + x1) / 2, cz = (zTop + zBot) / 2;
      const covered = chipSpans.includes(`${s.lo}-${s.hi}`);
      const wrap = covered ? `<g class="arf411-socktag" data-sockhide="F2">` : `<g class="arf411-socktag">`;
      txt.push(`${wrap}${ptext(cx, cz + (s.size || 1.2) * 0.36, tag, { size: s.size || 1.2, tone: "lo", anchor: "middle" })}</g>`);
    }
  }
  for (let b = 0; b <= 32; b += 4) {
    if (b < 32) txt.push(ptext(BZ.xr - b * BZ.bit - BZ.bit / 2, zR + 3.4, String(b), { size: 1.4, tone: "lo", anchor: "middle" }));
  }
  txt.push(ptext(BZ.xl + 1.4, zR + 3.4, "31", { size: 1.4, tone: "lo", anchor: "middle" }));
  return { geo: geo.join(""), txt: txt.join("") };
}

// F2 字段芯片（贴在卡面位槽上的实体芯片；落位顺序 CHIP_ORDER＝p189 Note 写序）
// 发射序：全部芯片实体（body 路径自带 data-enter/--arf-d，与组同款隐藏变换）→ 全部组（插脚+文字）——
// 宽芯片实体的剪切 AABB 不得排在其下方行文本之后（遮挡探针按屏幕 AABB 误判）
function chips() {
  const parts = CHIP_ORDER.map(({ row, i }, n) => {
    const c = ROWS[row].chips[i];
    const r = ROWS[row];
    const x0 = bx0(c.hi), x1 = bx1(c.lo);
    const zTop = r.z1 - 2.4, zBot = r.z0 + 2.4;
    const cx = (x0 + x1) / 2, cz = (zTop + zBot) / 2;
    const label = c.label || c.tag;
    const pins = [0.25, 0.5, 0.75].map((f) => {
      const px = x0 + (x1 - x0) * f;
      return `<path class="arf411-chippin" d="M${px} ${-zBot}L${px} ${-(zBot - 1.1)}"/>`;
    }).join("");
    return {
      cls: c.cls || "", body: frect(x0 + 0.35, zBot, x1 - 0.35, zTop, 0.7),
      pins, label, size: c.size || 1.4, cx, cz, delay: 140 + n * 70,
    };
  });
  const bodies = parts.map((p) =>
    `<path class="arf411-chipbody${p.cls ? " " + p.cls + "-body" : ""}" data-enter="F2" style="--arf-d:${p.delay}ms" d="${p.body}"/>`).join("");
  const groups = parts.map((p) =>
    `<g class="arf411-chip${p.cls ? " " + p.cls : ""}" data-enter="F2" style="--arf-d:${p.delay}ms">
${p.pins}
${ptext(p.cx, p.cz + p.size * 0.36, p.label, { size: p.size, tone: "hi", anchor: "middle" })}
</g>`).join("");
  return bodies + groups;
}

// ---------------- 区 B：TD 导轨 + 三小卡 + 链夹 + IOC 灯 ----------------
function miniCard(x0, mark, ch) {
  const face = [];
  // 组内文本同 ptext 规则：平面坐标平移，不带全矩阵
  const fp = (z, text, o) => k.faceTextSvg(`translate(${x0 + 15} ${-z})`, text, { anchor: "middle", ...o });
  for (let i = 0; i < 4; i++) {
    const z = 10 + i * 5.5;
    face.push(`<path class="iso-line" data-tone="${i === 3 ? "mid" : "faint"}" d="M${x0} ${-z}L${x0 + MINI_W} ${-z}"/>`);
  }
  // 顶行（DW3 位）上的 CH/IOC 芯片标记
  const chipX0 = ch ? x0 + 13.5 : x0 + 6, chipX1 = ch ? x0 + 16.5 : x0 + 9;
  face.push(`<path class="arf411-minichip" d="M${chipX0} ${-(10 + 3 * 5.5 - 3.4)}L${chipX1} ${-(10 + 3 * 5.5 - 3.4)}L${chipX1} ${-(10 + 3 * 5.5 - 0.8)}L${chipX0} ${-(10 + 3 * 5.5 - 0.8)}Z"/>`);
  if (!ch) face.push(`<path class="arf411-minichip" d="M${x0 + 20} ${-(10 + 3 * 5.5 - 3.4)}L${x0 + 23.5} ${-(10 + 3 * 5.5 - 3.4)}L${x0 + 23.5} ${-(10 + 3 * 5.5 - 0.8)}L${x0 + 20} ${-(10 + 3 * 5.5 - 0.8)}Z"/>`);
  face.push(fp(36, mark, { size: 1.9, tone: ch ? "mid" : "hi" }));
  return `<g data-enter="F3" style="--arf-d:${MINIS.findIndex((m) => m.x0 === x0) * 150}ms">
${cardSolid(x0, MINI_Y, MINI_Z0, x0 + MINI_W, MINI_Z1, MINI_T, "hi")}
<g transform="${k.sideMatrix([0, MINI_Y], 0, P, "left")}">${face.join("")}</g>
</g>`;
}

function tdZone() {
  const out = [`<g class="arf411-tdzone">`];
  // 导轨双杆 + 端挡
  for (const y of [-99, -80]) {
    out.push(S(k.slabOf({ x: RAIL_X0, y, w: RAIL_X1 - RAIL_X0, d: 5, r: 1 }, 0, 4, P, 3, 0.4), { tone: "mid" }));
  }
  for (const x of [RAIL_X0 - 5, RAIL_X1]) {
    out.push(S(k.slabOf({ x, y: -102, w: 5, d: 32, r: 1.2 }, 0, 9, P, 3, 0.5), { tone: "mid" }));
  }
  out.push(D([at([RAIL_X0 - 2.5, -96, 9]), at([RAIL_X0 - 2.5, -76, 9]), at([RAIL_X1 + 2.5, -96, 9]), at([RAIL_X1 + 2.5, -76, 9])], { size: 0.4 }));
  // 三小卡（F3）
  for (const m of MINIS) out.push(miniCard(m.x0, m.mark, m.ch));
  // 链夹 ×2（F3）：连接前两颗 / 中末颗顶缘
  for (const [i, x] of [[0, 64], [1, 112]]) {
    out.push(`<g class="arf411-clip" data-enter="F3" style="--arf-d:${430 + i * 110}ms">${S(k.slabOf({ x, y: MINI_Y - MINI_T, w: 18, d: 8, r: 2 }, 34, 4, P, 3, 0.5), { tone: "hi" })}
${D([at([x + 3, MINI_Y - MINI_T + 4, 38]), at([x + 15, MINI_Y - MINI_T + 4, 38])], { size: 0.5, tone: "hi" })}</g>`);
  }
  // 末颗 IOC 旗（F3）
  out.push(`<g data-enter="F3" style="--arf-d:600ms">${S(k.slabOf({ x: 136, y: MINI_Y - 1, w: 8, d: 4, r: 1 }, 40, 6, P, 2), { tone: "hi", lit: true })}</g>`);
  // 事件灯：柱 + 灯罩（F3 亮）
  out.push(S(k.cylinder(LAMP[0], LAMP[1], 2.5, 4, 54, P, 16), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(LAMP[0], LAMP[1], 5, 58, 5, P, 28), { tone: "hi", className: "arf411-dome" }));
  out.push(`</g>`);
  // 灯辉（脱离 tdzone，避免 F4 变暗叠加）
  const g = at([LAMP[0], LAMP[1], 62]);
  out.push(`<g class="arf411-glow"><circle cx="${g[0]}" cy="${g[1]}" r="13" fill="var(--anatomy-lit)" opacity="0.08"/><circle cx="${g[0]}" cy="${g[1]}" r="6" fill="var(--anatomy-lit)" opacity="0.4"/></g>`);
  return out.join("");
}

// ---------------- 区 C：环段托盘 ----------------
function tray() {
  const out = [];
  out.push(S(k.slabOf(TRAY, 0, 1.5, P, 4, 0), { tone: "lo", flat: true, crease: "none" })); // 盘底
  for (const rim of [
    { x: TRAY.x - 2, y: TRAY.y - 2, w: TRAY.w + 4, d: 4, r: 1.5 },
    { x: TRAY.x - 2, y: TRAY.y + TRAY.d - 2, w: TRAY.w + 4, d: 4, r: 1.5 },
    { x: TRAY.x - 2, y: TRAY.y - 2, w: 4, d: TRAY.d + 4, r: 1.5 },
    { x: TRAY.x + TRAY.w - 2, y: TRAY.y - 2, w: 4, d: TRAY.d + 4, r: 1.5 },
  ]) {
    out.push(S(k.slabOf(rim, 0, 6, P, 3, 0.5), { tone: "mid" }));
  }
  // 8 个槽位刻线（盘面上闭合槽形——vent 规则：闭合槽，无悬空线端）
  const grooves = [];
  for (let i = 0; i < SLOTS_N; i++) {
    const cx = slotX(i);
    grooves.push(k.pathOf([
      at([cx - 9, TRAY.y + 9, 1.6]), at([cx + 9, TRAY.y + 9, 1.6]),
      at([cx + 9, TRAY.y + TRAY.d - 9, 1.6]), at([cx - 9, TRAY.y + TRAY.d - 9, 1.6]),
    ], true));
  }
  out.push(L(grooves.join(""), { tone: "faint" }));
  // TD 三 token + Link token（F4，鱼贯入槽）
  TOK_SLOTS.forEach((s, i) => {
    const cx = slotX(s);
    out.push(`<g data-enter="F4" style="--arf-d:${i * 160}ms">${S(k.slabOf({ x: cx - 10, y: TRAY.y + 15, w: 20, d: 16, r: 2 }, 1.5, 3, P, 3, 0.4), { tone: "hi" })}</g>`);
  });
  const lx = slotX(LINK_SLOT);
  out.push(`<g class="arf411-linktok" data-enter="F4" style="--arf-d:500ms">${S(k.slabOf({ x: lx - 10, y: TRAY.y + 15, w: 20, d: 16, r: 2 }, 1.5, 3.6, P, 3, 0.4), { tone: "mid" })}
${k.faceTextSvg(k.topMatrix([lx, TRAY.y + 23], 5.2, P, "x"), "LINK", { size: 2.2, tone: "hi", anchor: "middle" })}</g>`);
  // 段尾回绕线（F4）：Link token 背缘 → 绕前缘 → 段首 0 号槽头
  const wpt = (p) => at(p);
  out.push(`<g data-enter="F4" style="--arf-d:680ms">${k.wireSvg(wpt([lx, TRAY.y + 12, 5]), wpt([slotX(0), TRAY.y + 5, 5]), { via: [wpt([lx + 16, TRAY.y + TRAY.d + 12, 8.5]), wpt([-20, TRAY.y + TRAY.d + 13, 8.5])], tone: "hi", size: 1.3 })}</g>`);
  return out.join("");
}

// ---------------- 区 D：控制组 ----------------
function controls() {
  const out = [];
  for (const [x, y] of BTNS) {
    out.push(S(k.cylinder(x, y, 6.5, 0, 4.5, P, 24), { tone: "mid" }));
    out.push(S(k.cylinder(x, y, 5, 4.5, 2.6, P, 24), { tone: "hi" }));
    out.push(L(k.knurl(x, y, 5, 4.5, 7.1, 22, P), { tone: "lo" }));
  }
  const [wx, wy] = WHEEL;
  out.push(S(k.cylinder(wx, wy, 9, 0, 4, P, 36), { tone: "mid" }));
  out.push(L(k.ring(wx, wy, 6.6, 4, P, 28), { tone: "lo" }));
  const ticks = k.radialTicks(wx, wy, 7.6, 4, 1, 4, [1.4, 1.4], P);
  out.push(L(ticks.major, { tone: "mid" }));
  const c = at([wx, wy, 4]);
  out.push(`<g class="arf411-needle" style="transform-origin:${c[0]}px ${c[1]}px">${L(k.lineOnTop([wx, wy], [wx + 6.4, wy], 4.4, P), { tone: "lit" })}${D([c], { size: 0.8, tone: "hi" })}</g>`);
  return out.join("");
}

// ---------------- 装配 SVG ----------------
// 卡面发射序：底槽几何 → 芯片实体 → 全部文本（宽芯片的剪切 AABB 若排在窄文本后会被
// 遮挡探针按屏幕 AABB 误判遮挡；平面内芯片与可见文本本互不重叠，文本在上无副作用）
const face = cardFace();
const widgetSvg = k.figureSvg({
  width: AW, height: AH,
  label: "TRB 装配卡座：四字模板立起、字段芯片落位、三卡拼 TD 入环——方向键或按钮步进四帧",
  body: [
    base(),
    nameplate(),
    dock(),
    `<g class="arf411-rise"><g class="arf411-master">
${cardSolid(CARD.x0, CARD.yF, CARD.z0, CARD.x1, CARD.z1, CARD.t, "hi")}
<g transform="${plane}">
${face.geo}
${chips()}
${face.txt}
</g>
</g></g>`,
    tdZone(),
    tray(),
    controls(),
  ],
});

// ---------------- 帧解说（语言门合规；禁退役词族） ----------------
const FRAMES = [
  { key: "F1", label: "模板四字", pg: "p188 · Figure 4-13（Cycle=bit0 见 p189）",
    narr: "一颗 TRB 就是 16 字节：四张双字卡立起——DW0+DW1 合成 64 位 Parameter、DW2 是 Status、DW3 是 Control。模板只在 Control 上印死位号：Cycle=bit 0、TRB Type=bits 10-15（模板图还印着 ENT=bit 1、ISP=bit 2）；卡面其余是空位槽，等字段芯片落位。" },
  { key: "F2", label: "字段落位", pg: "p427-429 · Figure 6-8 / Table 6-20~6-22",
    narr: "字段芯片落位（以 Normal TRB 为例）：Control 侧 C=bit 0、CH=bit 4、IOC=bit 5、IDT=bit 6、BEI=bit 9、TRB Type=bits 10-15；Status 侧 TRB Transfer Length=bits 16:0、TD Size=bits 21:17、Interrupter Target=bits 31:22；Parameter 侧整两字装 64 位 Data Buffer Pointer。芯片按先 Parameter、再 Status、最后 Control 的顺序落位——这正是 p189 Note 的写序纪律。" },
  { key: "F3", label: "拼装 TD", pg: "p211 · §4.11.7",
    narr: "拼装 TD：TD＝一颗以上 TRB，Chain bit 置于除末颗外的全部 TRB——前两颗 CH=1 连成链，末颗 CH=0 并置 IOC=1；末颗执行完成即生成 Transfer Event 回执（灯亮）。" },
  { key: "F4", label: "入环视角", pg: "p206-207 · §4.11.5.1",
    narr: "入环：装好的 TD 鱼贯进 Ring Segment 的槽序列，段尾必是一颗 Link TRB，其 Ring Segment Pointer 指回段首或下一段——环就此闭合；Toggle Cycle 位至少在一颗 Link TRB 上置起。环的指针运转详见 §4.9。" },
];

// ---------------- 注入三件套：style + div + script ----------------
const widgetStyle = `<style id="arf411-style">
#arf411{--arf-e:cubic-bezier(.32,.72,0,1)}
#arf411 .arf411-stage{outline:none;margin:6px 0 2px}
#arf411 .arf411-bar{display:flex;gap:14px;align-items:flex-start;margin:8px 0 2px}
#arf411 .arf411-btn{font:600 14px var(--font-ui,-apple-system,sans-serif);color:var(--anatomy-text);background:var(--anatomy-face);border:1px solid var(--anatomy-line-mid,#456);border-radius:6px;padding:7px 14px;cursor:pointer}
#arf411 .arf411-btn:hover:not(:disabled){border-color:var(--anatomy-hi)}
#arf411 .arf411-btn:disabled{opacity:.35;cursor:default}
#arf411 .arf411-narr{flex:1;line-height:1.85;font-size:15.5px;color:var(--anatomy-text);min-width:0}
#arf411 .arf411-pg{display:block;font:500 12px var(--anatomy-mono,monospace);color:var(--anatomy-muted);margin-bottom:2px}
#arf411 .arf411-cap{font-size:13px;color:var(--anatomy-muted);line-height:1.8;margin:6px 0 2px}
#arf411 .arf411-fr{font:600 12.5px var(--anatomy-mono,monospace);color:var(--anatomy-muted);white-space:nowrap}
#arf411 .arf411-rowband{fill:var(--anatomy-shade-0);stroke:var(--anatomy-faint);stroke-width:.5}
#arf411 .arf411-socket{fill:none;stroke:var(--anatomy-lo);stroke-width:.5;stroke-dasharray:2 2}
#arf411 .arf411-socketfaint{stroke:var(--anatomy-faint)}
#arf411 .arf411-socktag{visibility:visible;transition:opacity .3s,visibility 0s}
#arf411:not([data-frame="F1"]) .arf411-socktag[data-sockhide="F2"]{opacity:0;visibility:hidden;transition:opacity .3s,visibility 0s .3s}
#arf411 .arf411-chipbody{fill:var(--anatomy-top);stroke:var(--anatomy-mid);stroke-width:.5}
#arf411 .arf411-chippin{stroke:var(--anatomy-lo);stroke-width:.5;fill:none}
#arf411 .arf411-minichip{fill:var(--anatomy-lit);opacity:.85;stroke:none}
#arf411 [data-enter]{visibility:visible;transition:opacity .55s var(--arf-e),transform .6s var(--arf-e),visibility 0s;transition-delay:var(--arf-d,0ms),var(--arf-d,0ms),calc(var(--arf-d,0ms) + .6s)}
#arf411[data-frame="F1"] [data-enter="F2"]{opacity:0;visibility:hidden;transform:translate(30px,24px)}
#arf411[data-frame="F1"] [data-enter="F3"],#arf411[data-frame="F2"] [data-enter="F3"]{opacity:0;visibility:hidden;transform:translateY(18px)}
#arf411[data-frame="F1"] [data-enter="F4"],#arf411[data-frame="F2"] [data-enter="F4"],#arf411[data-frame="F3"] [data-enter="F4"]{opacity:0;visibility:hidden;transform:translateX(-46px)}
#arf411 .arf411-master,#arf411 .arf411-tdzone{transition:opacity .5s var(--arf-e)}
#arf411[data-frame="F3"] .arf411-master,#arf411[data-frame="F4"] .arf411-master,#arf411[data-frame="F4"] .arf411-tdzone{opacity:.78}
@keyframes arf411-rise{from{transform:translateY(26px)}to{transform:none}}
#arf411 .arf411-rise{animation:arf411-rise .8s var(--arf-e) both}
#arf411 .arf411-glow{opacity:0;transition:opacity .5s}
#arf411[data-frame="F3"] .arf411-glow,#arf411[data-frame="F4"] .arf411-glow{opacity:1}
#arf411[data-frame="F3"] .arf411-dome .iso-top,#arf411[data-frame="F4"] .arf411-dome .iso-top{fill:var(--anatomy-lit-top)}
#arf411[data-frame="F3"] .arf411-dome .iso-edge,#arf411[data-frame="F4"] .arf411-dome .iso-edge{stroke:var(--anatomy-lit)}
#arf411[data-frame="F2"] .arf411-ttype-body{fill:var(--anatomy-lit-top);stroke:var(--anatomy-lit)}
#arf411[data-frame="F2"] .arf411-ttype text{fill:var(--anatomy-lit)}
#arf411[data-frame="F3"] .arf411-clip .iso-top{fill:var(--anatomy-lit-top)}
#arf411[data-frame="F3"] .arf411-clip .iso-edge{stroke:var(--anatomy-lit)}
#arf411[data-frame="F4"] .arf411-linktok .iso-top{fill:var(--anatomy-lit-top)}
#arf411[data-frame="F4"] .arf411-linktok .iso-edge{stroke:var(--anatomy-lit)}
#arf411 .arf411-needle{transition:transform .45s var(--arf-e)}
#arf411[data-frame="F1"] .arf411-needle{transform:rotate(0deg)}
#arf411[data-frame="F2"] .arf411-needle{transform:rotate(90deg)}
#arf411[data-frame="F3"] .arf411-needle{transform:rotate(180deg)}
#arf411[data-frame="F4"] .arf411-needle{transform:rotate(270deg)}
@media (prefers-reduced-motion: reduce){#arf411 *{transition:none!important;animation:none!important}}
</style>`;

const widgetHtml = `${widgetStyle}
<div class="xsp-card" id="arf411" data-frame="F1">
<h2>TRB 装配卡座 —— 四字模板 · 字段落位 · 拼 TD · 入环（原生机器演示，←/→ 或按钮步进）</h2>
<div class="arf411-stage iso-stage" tabindex="0" role="group" aria-label="TRB 装配卡座机器演示：方向键步进四帧——模板、字段落位、拼装 TD、入环">${widgetSvg}</div>
<div class="arf411-bar">
<button type="button" class="arf411-btn" data-go="-1">◀ 回退</button>
<div class="arf411-narr"><span class="arf411-fr" data-readout>F1/4 · 模板四字</span><span class="arf411-pg" data-pg>${FRAMES[0].pg}</span><span data-narr>${FRAMES[0].narr}</span></div>
<button type="button" class="arf411-btn" data-go="1">步进 ▶</button>
</div>
<p class="arf411-cap">读数对表：模板与固定位＝§4.11.1 p188（Figure 4-13）+ p189（TRB Type 恒 bits 10-15、Cycle 恒 bit 0）；字段位号＝Normal TRB §6.4.1.1 Figure 6-8 与 Table 6-20/21/22 p427-429；TD 组成与 Chain 规则＝§4.11.7 p211；段尾 Link TRB 与回绕＝§4.11.5.1 p206-207。缩写：C=Cycle、CH=Chain、IOC=Interrupt On Completion、IDT=Immediate Data、BEI=Block Event Interrupt。</p>
</div>`;

// live 脚本：纯 vanilla（kit 运行时经 kitScript() 内联随页，零 import、file:// 可开）
const widgetLive = `
(function () {
  var root = document.getElementById("arf411");
  if (!root || root.dataset.bound) return;
  root.dataset.bound = "1";
  var FR = ${JSON.stringify(FRAMES.map(function (f) { return { label: f.label, pg: f.pg, narr: f.narr }; }))};
  var cur = 0;
  var narr = root.querySelector("[data-narr]");
  var pg = root.querySelector("[data-pg]");
  var ro = root.querySelector("[data-readout]");
  var prev = root.querySelector('[data-go="-1"]');
  var next = root.querySelector('[data-go="1"]');
  var stage = root.querySelector(".arf411-stage");
  function apply() {
    root.dataset.frame = "F" + (cur + 1);
    narr.textContent = FR[cur].narr;
    pg.textContent = FR[cur].pg;
    ro.textContent = "F" + (cur + 1) + "/4 · " + FR[cur].label;
    prev.disabled = cur === 0;
    next.disabled = cur === 3;
    stage.setAttribute("aria-valuenow", String(cur + 1));
  }
  function go(d) { var n = cur + d; if (n < 0 || n > 3) return; cur = n; apply(); }
  prev.addEventListener("click", function () { go(-1); });
  next.addEventListener("click", function () { go(1); });
  stage.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
  });
  apply();
})();
`;

// ---------------- 构建期补丁注入（照 NARROW_CSS 先例；锚点唯一性机检） ----------------
const page = tablePage(cfg);
// ① 窄幅适配补丁（既有，不动）
const NARROW_CSS = '<style>@media (max-width: 900px){.xsp-card table.xsp-tb{display:block;overflow-x:auto}}</style>';
const patched = page.includes("</head>") ? page.replace("</head>", NARROW_CSS + "</head>") : page + NARROW_CSS;

// ② 装配卡座三件套注入：div 锚＝家族总表卡头（唯一标记）；script 锚＝真 </body>（lastIndexOf + 唯一性断言）
const CARD_ANCHOR = '<div class="xsp-card"><h2>TRB 家族总表';
const cardHits = patched.split(CARD_ANCHOR).length - 1;
if (cardHits !== 1) throw new Error("arf411 注入锚不唯一：家族总表卡头命中 " + cardHits + " 次");
const withWidget = patched.replace(CARD_ANCHOR, widgetHtml + "\n" + CARD_ANCHOR);

const bodyCloseCount = withWidget.split("</body>").length - 1;
if (bodyCloseCount !== 1) throw new Error("arf411 script 锚不唯一：</body> 命中 " + bodyCloseCount + " 次");
const kitSrc = kitScript(); // kit 源含字面 </script>（pageHtml 内部同款转义，照抄 dial-indicator 先例路径）
if (widgetLive.includes("</scr" + "ipt")) throw new Error("live 源含 </scr" + "ipt>");
const closeAt = withWidget.lastIndexOf("</body>");
const finalPage = withWidget.slice(0, closeAt) + "<scr" + "ipt>" + kitSrc.replace(/<\/(script)/gi, "<\\/$1") + widgetLive + "</scr" + "ipt>" + withWidget.slice(closeAt);

// ③ 注入后机检（锚点安全铁律）：注入体（kit+live）内零未转义 </script（只有它能终止解析；
//    kit 源 pageHtml 模板串里的字面 <script / </body> / </html> 均在 JS 字符串内，不参与 HTML 解析），
//    注入前基线 </body>/</html> 各恰一次且页内无 <script>（已在前断言）；注入后真闭合仍居页尾。
const injectedBody = kitSrc.replace(/<\/(script)/gi, "<\\/$1") + widgetLive;
if (injectedBody.includes("</scr" + "ipt>")) throw new Error("注入体内残留未转义 </scr" + "ipt>");
if ((withWidget.match(/<\/html>/g) || []).length !== 1) throw new Error("注入前 </html> 基线不唯一");
if (!finalPage.trimEnd().endsWith("</body></html>")) throw new Error("注入后页尾结构异常");
if (!finalPage.trimEnd().endsWith("</body></html>")) throw new Error("页尾结构异常");
const httpN = (finalPage.match(/https?:\/\//g) || []).length;
if (httpN > 2) throw new Error("http(s) 引用超限：" + httpN);

const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), finalPage);
console.log("wrote", name, (finalPage.length / 1024).toFixed(0) + " KB", "| arf411 anchors ok (card x1, body x1, script 1/1)");

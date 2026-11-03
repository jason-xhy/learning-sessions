// §4.15 挂起与恢复 —— 泳道节（生成器 lane_page.mjs 量产件；骨架版：机器形态留后续会话）
// 判据：xHCI 1.2b §4.15 p252–258（引文五条逐字）；§4.15.1 Port Suspend p253 /
//   §4.15.1.1 Selective Suspend p254 / §4.15.1.2 Function Suspend p254 /
//   §4.15.2 Port Resume p254 / §4.15.2.1 Device Initiated p254 / §4.15.2.2 Host Initiated p255 /
//   §4.15.2.3 Wakeup Events p256；Table 4-10 p257–258 只入注记不逐行转写
// 注：任务面提到的 FSC（Force Save Context Capability）属 §4.20/§4.23 区实现注记，
//   §4.15 全节零出现——按 brief「以原文小节为准」不入本节流程（EVIDENCE.md 偏差节）。
// 工艺：_gen/lane_page.mjs + anatomy kit pageHtml + shared/zoomfs.mjs（构建期内联，自包含）
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lanePage } from "../_gen/lane_page.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

const cfg = {
  theme: THEME,
  pageTitle: "§4.15 挂起与恢复 · xHCI 规范对照学习",
  navTitle: "§4.15 挂起与恢复",
  specRef: "xHCI 1.2b §4.15 Suspend-Resume · p252–258 · §4.15.1 Port Suspend p253 / §4.15.2 Port Resume p254 · §4.15.2.1 Device Initiated p254 / §4.15.2.2 Host Initiated p255 / §4.15.2.3 Wakeup Events p256",
  prevHref: "../4.14-transfer-scheduling/index.html", prevLabel: "§4.14 传输环管理",
  nextHref: "../4.16-bandwidth-management/index.html", nextLabel: "§4.16 带宽管理",
  prose: [
    "xHC 给每个根集线器端口一套与 USB Hub 等价的挂起/恢复模型（p252）——本页「xHCI 驱动」即规范原文所称 system software（系统软件）。软件把单个端口置挂起即<b>选择性挂起</b>（Selective Suspend，每个 PORTSC 都支持）；规范把软件发起的恢复称 <b>Resume Events/Actions</b>（恢复事件/动作），把总线发起的称 <b>Wake-up Events</b>（唤醒事件）——后者两类来源：远程唤醒设备发 resume 信令（xHC 必须响应并按需唤醒系统），连接/拔出/过流（敏感度可用 PORTSC 每端口控制位开关）。挂起整条总线按次序来：选择性挂起全部 Enabled 端口 → USBCMD.R/S=‘0’ 关控制器 → 经 PCI PM 降设备功耗态；唤醒事件发生后软件再置 R/S=‘1’（须先确认 xHC 时钟已稳）、逐端口写 PLS=‘0’ 恢复（p252）。",
    "挂起的时序：<b>挂起动作=写 PORTSC 的 PLS=U3（‘3’）</b>，只许对 Enabled 态端口（PED=‘1’、PLS<‘3’）做，且必须带 <b>LWS=‘1’</b>（p253–254）；xHC 可立即评估也可等到微帧/帧边界——至少每帧边界评估一次，立即评估也要等当前事务完成，端口上可能还有几个微帧的活动。<b>suspend 信令送达设备之前 PLS 读数不变（最长 10 ms）</b>；软件必须等 U3 转换完成才能把 xHC 放进低功耗态或发起恢复——轮询 PLS 会占住处理器、OS 定时器（~15 ms）又太慢，<b>U3 Entry Capability（U3C）</b>解此两难：PLS 跳到 U3 即置 PLC 出端口状态变化事件（HCCPARAMS2.U3C=‘1’ 时用 CONFIG.U3E=‘1’ 打开；xHCI 1.1/1.2 起 U3C=‘1’ 强制，p254）。挂起前还要用 <b>Stop Endpoint 命令（SP=‘1’）</b>停掉设备端点（§4.15.1.1 选择性挂起停全部端点 / §4.15.1.2 功能挂起按 function 停后再发 SetFeature(FUNCTION_SUSPEND)，p254）。",
    "恢复分两条路：<b>设备发起</b>——设备发 resume 信令（USB2）/LFPS（USB3），端口 U3→Resume（PLS=‘15’）、PLC=‘1’→端口状态变化事件；软件读 PORTSC 后按协议族收尾——USB3 写 PLS=‘0’ 让 xHC 应答 LFPS 完成握手，USB2 由软件计时 TDRSMDN（≥20 ms）后写 ‘0’（p254–255）。<b>主机发起</b>——USB3 直接写 PLS=‘0’（端口进 U3Exit 子态，xHC 立即发 LFPS），USB2 写 PLS=‘15’（xHC 1 ms 内发信令，软件从写 ‘15’ 起计时，满 TDRSMDN 后写 ‘0’）（p255–256）。两条硬规则：<b>把 Resume 端口转 U0 前必须确认 R/S=‘1’</b>（保证设备进 U0 时 xHC 能发 ITP 并立即收包，p255 Note）；<b>xHC 从不自动把 Resume/U3 端口拉回 U0</b>——转 D0 后这些端口一律要软件驱动（p253 Note）。恢复完成的统一回执：PLS=‘0’、PLC=‘1’ 再出一次端口状态变化事件（p255–256）。〔注记：<b>本节 anatomy 机器形态留后续会话——本页为流程骨架版</b>：主线流程+要点表；§4.15.2.3 Wakeup Events 细则与 Table 4-10（p257–258）入下方表格卡注记，不逐行转写。〕",
  ],
  quotes: [
    { en: "System software places individual ports into suspend mode by writing a ‘3’ into the appropriate PORTSC register Port Link State (PLS) field (refer to section 5.4.8).",
      zh: "挂起动作=写 PORTSC 的 PLS=‘3’——前提是端口在 Enabled 态（下一句：should only set PLS=‘3’ when the port is Enabled）。",
      src: "xHCI 1.2b §4.15.1 p253" },
    { en: "Software shall stop all endpoints of a device using the Stop Endpoint Command and setting the Suspend (SP) flag to ‘1’ prior to selectively suspending a device.",
      zh: "选择性挂起前先停端点：Stop Endpoint 命令带 SP=‘1’；恢复后软件写端点门铃重启（p254）。",
      src: "xHCI 1.2b §4.15.1.1 p254" },
    { en: "Note that an LFPS Handshake is required for a USB3 U3 wakeup. A device generates LFPS to initiate the resume process.",
      zh: "USB3 的 U3 唤醒必须走 LFPS 握手——设备先发 LFPS 发起恢复；xHC 在软件指示前不得回应 LFPS 让握手完成（p255）。",
      src: "xHCI 1.2b §4.15.2.1 p255（原文 Handshake 后带脚注号 52，引文剔除）" },
    { en: "A U3 to U0 transition of the PLS field shall cause the Port Link State Change (PLC) bit to transition from ‘0’ to ‘1’.",
      zh: "恢复完成的统一回执：PLS 从 U3 变 U0 必置 PLC——PSCEG 0→1 即出端口状态变化事件。",
      src: "xHCI 1.2b §4.15.2.2 p256" },
    { en: "The xHC shall not automatically transition a root hub port from the Resume or U3 state to the U0 state.",
      zh: "Resume/U3 端口回 U0 只能由软件驱动——xHC 没有自动恢复路径（xHC 转 D0 后亦然）。",
      src: "xHCI 1.2b §4.15 p253 Note" },
  ],
  figNo: "Fig 4.15",
  figTitle: "挂起与恢复主线：写 PLS=U3 进挂起，两路恢复回 U0",
  figCaption: "挂起一条主线（停端点 → 写 PLS=U3 → suspend 信令 → PLS 转 U3）；恢复两条路（设备发起 resume 信令/LFPS、主机发起写 PLS），完成时统一 U3→U0 并出端口状态变化事件。骨架版——anatomy 机器形态留后续会话。",
  figAria: "挂起与恢复三方时序图：写 PLS=U3 挂起、设备发起与主机发起两路恢复、PLC 与端口状态变化事件",
  tourNarr: "总览模式：完整流程图。挂起一条主线（步1–4），恢复两条路（步5分隔：设备发起 §4.15.2.1 / 主机发起 §4.15.2.2）——每框角标规范页码。",
  steps: [
    { kind: "box", at: "sw", lines: ["挂起前置（§4.15.1.1 选择性挂起）", "Stop Endpoint 命令：SP=‘1’ 停设备全部端点", "确认端口 Enabled：PED=‘1’、PLS<‘3’"], pg: "p254",
      narr: "引文②：选择性挂起前必须先停端点——Stop Endpoint 命令带 SP=‘1’（§4.15.1.2 功能挂起则停 function 关联端点后再发 SetFeature(FUNCTION_SUSPEND)，p254）；恢复后软件要写端点门铃重启（p254）。挂起只许对 Enabled 态端口做（p253–254）。" },
    { kind: "arrow", from: "sw", to: "hc", lines: ["写 PORTSC：PLS=U3（‘3’）", "LWS=‘1’ 必置（PLS 字段写入门控）"], pg: "p253",
      narr: "引文①：挂起动作=把 PLS 写成 ‘3’，只许对 Enabled 态端口做；LWS（Port Link State Write Strobe）不置 ‘1’ 写不进 PLS 字段（p254）。" },
    { kind: "box", at: "hc", lines: ["评估 PLS 写入：立即或帧边界（至少每帧一次）", "等当前事务完成 → 发 suspend 信令", "信令完成前 PLS 保持不变（最长 10 ms）", "PLS→U3：U3E=‘1’ 时置 PLC → 端口状态变化事件"], pg: "p253–254",
      narr: "立即评估也要等当前事务跑完，端口上可能还有几个微帧活动（p253）；suspend 信令送达设备前 PLS 读数不变、最长 10 ms（p253–254）。U3C（HCCPARAMS2）=‘1’ 且 CONFIG.U3E=‘1’ 时，PLS 跳到 U3 即置 PLC 出事件——软件不必轮询也不必等 OS 定时器（p254，xHCI 1.1/1.2 起 U3C=‘1’ 强制）。" },
    { kind: "note", dev: true, lanes: ["dev"], lines: ["设备：收 suspend 信令 → 进挂起", "此后端口无包活动；USB3 设备", "可自发 LFPS 唤醒（引出恢复主线）"], pg: "p253",
      narr: "三方视角：挂起生效=xHC 与设备之间的总线信令完成——设备停在无包活动状态；远程唤醒设备随后可自发 resume 信令/LFPS，xHC 必须响应并按需唤醒系统（p252、p255）。" },
    { kind: "note", lanes: ["sw", "hc"], lines: ["恢复主线（§4.15.2）分两条路：", "设备发起 = Wake-up Event（§4.15.2.1）", "主机发起 = Resume Action（§4.15.2.2）"], pg: "p254",
      narr: "规范把软件发起的恢复称 Resume Events/Actions、总线发起的称 Wake-up Events（p252）；远程唤醒设备发 resume 信令时 xHC 必须响应（p252）。主机发起恢复还有硬前提：端口须已在挂起态（PED=‘1’、PLS=‘3’，p255）。" },
    { kind: "arrow", from: "dev", to: "hc", ev: true, lines: ["设备发起：resume 信令（USB2）/LFPS（USB3）", "→ 端口 U3→Resume：PLS=‘15’、PLC=‘1’", "→ PSCEG 0→1 → 端口状态变化事件"], pg: "p254–255",
      narr: "引文③：USB3 的 U3 唤醒必须走 LFPS 握手——设备发 LFPS 发起恢复，xHC 检测到 LFPS 即把端口转到 Resume 态，但在软件指示前不得回应 LFPS 让握手完成（p255 Note）；USB2 端口检测到 resume 信令后，xHC 在 1 ms（TURSM）内向全部 Enabled 端口反射并维持到软件把端口转 U0（§4.15.2.3 p256）。" },
    { kind: "box", at: "sw", lines: ["收端口状态变化事件 → 读 PORTSC", "PLC=‘1’、PLS=Resume → 判定设备发起", "USB3：写 PLS=‘0’，xHC 应答 LFPS 握手", "USB2：计满 TDRSMDN（≥20 ms）后写 PLS=‘0’"], pg: "p255",
      narr: "软件按事件里的 Port ID 定位端口、读 PORTSC：设备发起的标志=PLC=‘1’ 且 PLS=Resume（p255）；USB3 写 ‘0’ 指示 xHC 发起 LFPS 完成握手，USB2 由软件计时 TDRSMDN≥20 ms——从收到转 Resume 的通知起算，计满后写 ‘0’（p255）。" },
    { kind: "arrow", from: "sw", to: "hc", lines: ["主机发起：写 PLS 直接发起恢复", "USB3：写 ‘0’ → U3Exit，xHC 立即发 LFPS", "USB2：写 ‘15’（Resume）→ xHC 1 ms 内发信令"], pg: "p255–256",
      narr: "主机发起=软件写 PLS：USB3 写 ‘0’ 端口进 U3Exit 子态、xHC 立即发 LFPS（p256）；USB2 写 ‘15’ 端口进 Resume 子态、xHC 1 ms（TURSM）内发恢复信令、软件从写 ‘15’ 起计 TDRSMDN，满后写 ‘0’（p256）。前提：端口已挂起（PED=‘1’、PLS=‘3’）才许主机发起恢复（p255）；对 U1/U2 低功耗态端口写 ‘0’ 同样发起信令转 U0（p255）。" },
    { kind: "box", at: "hc", lines: ["恢复信令完成 → 端口 U3→U0（PLS=‘0’）", "PLC=‘1’ → PSCEG 0→1 → 端口状态变化事件", "前提：R/S=‘1’——保证 ITP 发送与立即收包"], pg: "p255–256",
      narr: "引文④：U3→U0 跳变必置 PLC，PSCEG 0→1 即出端口状态变化事件（中断器 0 未屏蔽则再带一次中断，p256）；转 U0 前软件必须确认 xHC 在 Run（R/S=‘1’）态，设备进 U0 时 xHC 才能发 ITP 并立即收包（p255 Note）——xHC 从不自动把 Resume/U3 端口拉回 U0（p253 Note，引文⑤）。" },
    { kind: "note", dev: true, lanes: ["dev"], lines: ["设备侧收尾：端点仍停着", "软件逐个写端点门铃重启", "（挂起前 SP=‘1’ 停掉的端点）"], pg: "p254",
      narr: "三方视角收尾：SP 停掉的端点不会自己跑起来——恢复后软件写端点门铃逐个重启（§4.15.1.1 p254）；TDRSMDN 计时起点两路不同——设备发起从收到转 Resume 通知起算（p255）、主机发起从软件写 ‘15’ 起算（p256）。" },
  ],
  legend: [
    { i: "var(--xsp-sw)", t: "xHCI 驱动" },
    { i: "var(--xsp-hc)", t: "xHC 控制器" },
    { i: "var(--xsp-dev)", t: "设备（resume 信令源）" },
    { t: "实线=写流/总线信令 · 虚线=事件回执流" },
  ],
  linksHtml: `
<div class="xsp-card"><h2>PLS 迁移要点表（§4.15.1–4.15.2 · 每行带页码）</h2>
<table class="xsp-tb">
<tr><th>PLS 写入/读值</th><th>含义</th><th>谁发起 · 谁置位</th><th>页</th></tr>
<tr><td><b>‘3’（U3）</b></td><td>挂起态</td><td>软件写入发起挂起（仅限 Enabled 态端口，LWS=‘1’ 必置）；suspend 信令完成后 PLS 才真变 U3（最长 10 ms）</td><td class="mono">p253–254</td></tr>
<tr><td><b>‘15’（Resume）</b></td><td>恢复进行中</td><td>设备发起：xHC 检测到 resume 信令/LFPS 后置；主机发起（USB2）：软件写入发起</td><td class="mono">p254–255 · p256</td></tr>
<tr><td><b>‘0’（U0）</b></td><td>正常活动态</td><td>软件写入发起恢复——USB3 直接发起 LFPS；USB2 在 TDRSMDN 计满后写；对 U1/U2 低功耗态端口写 ‘0’ 亦转 U0</td><td class="mono">p255–256</td></tr>
<tr><td><b>U3Exit（子态）</b></td><td>USB3 主机发起恢复的过渡</td><td>软件写 PLS=‘0’ 后端口进入；xHC 立即发 LFPS 到设备</td><td class="mono">p256</td></tr>
<tr><td><b>PED=‘1’、PLS<‘3’</b></td><td>端口 Enabled（未挂起）判据</td><td>软件读 PORTSC 判定：可挂起（p254）/ 已恢复（p256–257）</td><td class="mono">p254 · p256–257</td></tr>
</table>
<p>注：§4.15.2.3 Wakeup Events（p256–257）——USB2 端口检测到 resume 信令后，xHC 在 1 ms（TURSM）内向全部 Enabled 端口反射并维持到软件把端口转 U0；USB3 检测到合规 LFPS 即转 Resume 并置 PLC。Table 4-10（p257–258）按 WDE/WCE/WOE 三类唤醒使能给出各唤醒事件后的 PLS/CCS/PED/OCA/USBSTS.PCD 状态——注记「A port resume is not gated by a Wake Enable flag」：端口恢复不受唤醒使能位限制（p257）。</p>
</div>
<div class="xsp-card"><h2>相关</h2>
<p><a href="../4.14-transfer-scheduling/index.html">§4.14 传输环管理</a>（上一节）——Stop Endpoint 命令的执行模型；<a href="../4.16-bandwidth-management/index.html">§4.16 带宽管理</a>（下一节）——端口恢复后重新评估带宽的邻居节；<a href="../4.7-doorbells/index.html">§4.7 门铃</a>——恢复后写端点门铃重启；<a href="../4.17-interrupters/index.html">§4.17 中断器</a>——端口状态变化事件到中断的通路；<a href="../4.2-host-controller-init/index.html">§4.2 主机控制器初始化</a>——USBCMD.R/S 与启动次序。</p>
<p><a href="../../index.html">§5.4.8 PORTSC（待建）</a>——PLS/LWS/PED 字段定义；<a href="../../index.html">§4.19.1.2.13 Resume 态（待建）</a>——端口链接状态机视角；<a href="../../index.html">§4.19.2 PSCEG（待建）</a>——事件生成跳变；<a href="../../index.html">§3.3.8 Stop Endpoint（待建）</a>——SP 停端点细则。</p></div>`,
  footLine: "判据：xHCI 1.2b（625472 Rev 1.2b）§4.15 p252–258 · 引文逐字核对，证据见 <a href=\"EVIDENCE.md\">EVIDENCE.md</a> · 生成于 2026-11-04",
};

const page = lanePage(cfg);
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, (page.length / 1024).toFixed(0) + " KB");

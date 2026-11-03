# EVIDENCE.md —— §4.15 挂起与恢复（2026-11-04，泳道节量产；骨架版）

**骨架范围声明**：本页为流程骨架版（泳道 10 步 + PLS 要点表），anatomy 机器形态留后续会话（页内 prose 第三段注记已声明）。Table 4-10（p257–258）与 D3/LTSSM Clock Stopped/CAS 整机电源细则只入表格卡注记，不逐行转写；§4.15.2.3 Wakeup Events 细则以表格卡注记承载。

## 逐条断言 → 判据

| 断言（页面位置） | 判据 |
|---|---|
| xHC 给每端口一套与 USB Hub 等价的挂起/恢复模型；软件可挂起/恢复单端口、可参数化对外部 resume 事件的敏感度（prose P1） | §4.15 p252 首段（PAGE-OK `Suspend-Resume`@p252） |
| 术语立法：软件发起恢复=Resume Events/Actions、总线发起=Wake-up Events；唤醒两类来源——远程唤醒设备 resume 信令（xHC 必须响应）、连接/拔出/过流（PORTSC 每端口位开关）（prose P1） | §4.15 p252（PAGE-OK `Wake-up Events`@p252） |
| 选择性挂起=每个 PORTSC 都支持；整机挂起次序=选择性挂起全部 Enabled 端口→USBCMD.R/S=‘0’→PCI PM 降态；唤醒后 R/S=‘1’（时钟稳定确认后）+逐端口写 PLS=‘0’（prose P1） | §4.15 p252（PAGE-OK `Selective suspend is a feature`@p252） |
| D0 转换后 Resume/U3 端口必须软件驱动到 U0，xHC 从不自动转（步9 narr + 引文⑤） | §4.15 p253 Note（PAGE-OK `shall not automatically transition`@p253） |
| 挂起动作=写 PLS=U3（‘3’），仅限 Enabled 态端口；LWS=‘1’ 必置（步2 + 引文①） | §4.15.1 p253–254（PAGE-OK `writing a ‘3’ into`@p253、`PLS < ‘3’`@p254） |
| 评估时机=立即或微帧/帧边界，至少每帧边界评估一次；立即评估也等当前事务完成（步3） | §4.15.1 p253（PAGE-OK `every frame boundary`@p253） |
| suspend 信令完成前 PLS 不变（最长 10 ms）；U3 转换完成前不得进低功耗态/不得恢复（步3 + prose P2） | §4.15.1 p253–254（10 ms 句 PAGE-OK 于 p253 起始跨 p254——页对 p253–254） |
| U3C 机制：PLS→U3 跳变置 PLC 出端口状态变化事件；HCCPARAMS2.U3C=‘1’ 时 CONFIG.U3E=‘1’ 打开；xHCI 1.1/1.2 起 U3C=‘1’ 强制（步3 + prose P2） | §4.15.1 p254（PAGE-OK `U3 Entry Capability`@p254、`Entry Enable (U3E)`@p254、`mandatory for all`@p254） |
| 选择性挂起前 Stop Endpoint（SP=‘1’）停设备全部端点；恢复后软件写端点门铃重启（步1 + 步10 + 引文②） | §4.15.1.1 p254（PAGE-OK `Stop Endpoint Command`@p254） |
| 功能挂起=按 function 停端点 + SetFeature(FUNCTION_SUSPEND)（步1 narr） | §4.15.1.2 p254（PAGE-OK `FUNCTION_SUSPEND`@p254） |
| 设备发起：resume 信令/LFPS 检测→端口 U3→Resume（PLS=‘15’）+PLC=‘1’→PSCEG 0→1→端口状态变化事件（步6） | §4.15.2.1 p254–255（PAGE-OK `Resume state (PLS = ‘15’)`@p254；PLC 置位半句接 p255——页对 p254–255） |
| USB3 U3 唤醒必须 LFPS 握手；设备先发 LFPS；xHC 软件指示前不回应 LFPS（步6 + 引文③，原文脚注 52 剔除） | §4.15.2.1 p255 Note（PAGE-OK `LFPS Handshake`@p255、`generates LFPS to initiate`@p255） |
| 软件读 PORTSC 判设备发起（PLC=‘1’、PLS=Resume）；USB3 写 ‘0’→LFPS 握手；USB2 计满 TDRSMDN（≥20 ms）后写 ‘0’（步7） | §4.15.2.1 p255（PAGE-OK `TDRSMDN`@p255） |
| R/S=‘1’ 前提：转 U0 前确认 Run 态——保证 ITP 发送与立即收包（步9） | §4.15.2.1 p255 Note（PAGE-OK `transmitting ITPs`@p255） |
| 主机发起前提=端口已挂起（PED=‘1’、PLS=‘3’）；对 U1/U2 低功耗态端口写 ‘0’ 亦转 U0（步5 narr + 步8 narr） | §4.15.2.2 p255（PAGE-OK `Host Initiated`@p255、`low power link state`@p255） |
| 主机发起：USB3 写 ‘0’→U3Exit 子态+xHC 立即发 LFPS；USB2 写 ‘15’→xHC 1 ms（TURSM）内发信令（步8） | §4.15.2.2 p255–256（PAGE-OK `U3Exit`@p256） |
| TDRSMDN 计时起点两路不同：设备发起=转 Resume 通知（p255）；主机发起=写 ‘15’（p256）（步10 narr） | §4.15.2.1 p255 / §4.15.2.2 p256（PAGE-OK `start timing TDRSMDN`@p256） |
| 恢复完成：U3→U0 必置 PLC→PSCEG 0→1→端口状态变化事件；中断器 0 未屏蔽则中断（步9 + 引文④） | §4.15.2.2 p255–256（PAGE-OK `A U3 to U0 transition`@p256、`not masked`@p256） |
| Wakeup Events：USB2 检测到 resume 信令后 1 ms（TURSM）内向全部 Enabled 端口反射并维持到转 U0；USB3 合规 LFPS 立即转 Resume+PLC（表格卡注记） | §4.15.2.3 p256（PAGE-OK `reflected downstream`@p256、`Wakeup Events`@p256） |
| PED=‘1’、PLS<‘3’=端口 enabled（未挂起）判据（表格卡末行） | §4.15.1 p254 / §4.15.2.3 p256（PAGE-OK `PLS < ‘3’`@p254、`not suspended`@p256） |
| Table 4-10 按 WDE/WCE/WOE 给出唤醒事件后 PLS/CCS/PED/OCA/PCD 状态；端口恢复不受唤醒使能位限制（表格卡注记） | §4.15.2.3 p257–258（PAGE-OK `Table 4-10`@p257、`not gated by a Wake Enable`@p257） |
| 上界：本节止于 p258（§4.16 Bandwidth Management 同页起） | PAGE-OK `Bandwidth Management`@p258、`4.16`@p258 |

页码机核：PAGECHECK-PASS（33 needle，含节头 6 页全覆盖 + 引文碎片 5 条）。

## 门输出（逐条实跑）

1. 页码机核：`python3 scripts/xhci_spec_pagecheck.py …`（33 needle）→ 末行 **PAGECHECK-PASS**（上表逐条 PAGE-OK；两处断行假阴性已按 pypdf 实际断行形态换短 needle：`PLS < ‘3’`、`mandatory for all`、`Resume state (PLS = ‘15’)` 实在 p254）
2. 语言门：`python3 scripts/scan_words.py retired lessons/xhci-spec/ch4/4.15-suspend-resume/index.html` → `RETIRED-COUNT index.html: total=4 {'回执': 3, '泳道': 1}`；index-light.html 同 total=4 {'回执': 3, '泳道': 1}——残留 family ⊆ 豁免集 {回执,柜台,泳道}，**PASS**（回执×3=引文 zh×2+图例×1；泳道×1=zoomBar 提示）
3. 交互冒烟：`python3 scripts/xhci_spec_lane_smoke.py lessons/xhci-spec/ch4/4.15-suspend-resume 10` → `[dark] PASS console=0` / `[light] PASS console=0` / 末行 **LANE-SMOKE-PASS**（步进计数 3/10、aria-pressed、复位回总览全过）
4. 自包含：`grep -c 'http://\|https://' index.html` = 2（index-light 同 2），命中=SVG `xmlns`（`http://www.w3.org/2000/svg` ×2）→ **PASS**
5. 互链：`../../index.html`、`../4.14-transfer-scheduling/index.html`、`../4.16-bandwidth-management/index.html`、`../4.7-doorbells/index.html`、`../4.17-interrupters/index.html`、`../4.2-host-controller-init/index.html`、`EVIDENCE.md` 全部存在（ls 实测）→ **PASS**；待建节（§5.4.8/§4.19.1.2.13/§4.19.2/§3.3.8）链板块 index.html 并标「待建」
6. shots：6 张（lane-overview/step2/step-end × dark/light，脚本自动落盘）

## shots 清单

| 文件 | 内容 |
|---|---|
| shots/lane-overview-dark.png / lane-overview-light.png | 步进态第 3 步全景（冒烟脚本固有拍法，与 4.14/4.16 一致） |
| shots/lane-step2-dark.png / lane-step2-light.png | 舞台滚动后第 3 步特写 |
| shots/lane-step-end-dark.png / lane-step-end-light.png | 末帧 10/10（设备收尾注记+令牌避让实拍） |

## 已知边界与偏差

1. **FSC 不属本节**：任务面提到「FSC/恢复超时」——FSC（Force Save Context Capability）在规范中属 Save/Restore 相关实现注记区（§4.20 区 IMPLEMENTATION NOTE 与 §4.23 Power Management 正文），**§4.15 全节零出现**（grep 实证）。按 brief「以原文小节为准」不入本节流程；恢复超时如实采用 TURSM（1 ms）/TDRSMDN（20 ms）。
2. 引文③原文 `LFPS Handshake52` 带脚注号 52，引文剔除（页面 src 栏已注明）；§4.15.2.1 Note 的 `Resume state53` 同脚注伪影，未入引文。
3. 规范步号伪影（§4.15.2.1 从"10."起、§4.15.2.2 从"14."起）未照抄——页面用自有规范化步号 1–10 并逐框带页码（DESIGN §2 既有裁定）。
4. overview 截图为步进态（冒烟脚本拍法），总览全景以步进末帧+页内 tour 模式为准。

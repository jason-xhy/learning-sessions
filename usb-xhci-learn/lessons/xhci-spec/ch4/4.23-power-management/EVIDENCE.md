# EVIDENCE.md —— §4.23 电源管理（2026-11-04，泳道节量产；骨架版）

## 0. 骨架范围声明（任务面要求，页内已如实标注）

本节属机器候选节批次（4.10/4.12/4.14/4.15/4.19/4.23）：**本页交付=流程骨架版**——
三方泳道 10 步主线（系统挂起→PCI D3→唤醒→D0→Restore→运行）+ 对照表卡 ×2 +
引文 5 条；**anatomy 机器形态留后续会话**。标注落点：prose 第三段（〔注记：本节
anatomy 机器形态留后续会话——本页为流程骨架版…〕）+ figCaption（「骨架版——anatomy
机器形态留后续会话」）。细则以要点+页码入注记，不逐条展开：§4.23.5.1.1.1 硬件控制
LPM（HIRD/BESL/LPM Timer/Table 4-13 编码，p318–324）、§4.23.5.2.1 No Ping Response
Error（p325–326）、§4.23.5.2.2 Max Exit Latency Too Large Error（p326–327）。

## 1. 节界与页码

- §4.23 Power Management = **p310–326**：TOC 行（提取文本 283–289 行）与正文实测一致；
  正文 4.23 头在 p310（提取文本 17442 行），末小节 4.23.5.2.2 止于 p326（Note 溢至
  p327 属规范排版，非本节内容行）。
- **上界现场核**：§4.24 Host Controller Management 实测起于 p327（PAGECHECK p327
  `'4.24 Host Controller Management'` OK）。
- 小节起始页（TOC 与正文双核）：4.23.1 p310 / 4.23.2 p311 / 4.23.2.1 p314 /
  4.23.3 p315 / 4.23.4 p315 / 4.23.5 p315（4.23.5.1 p316 侧、Table 4-12 p316–317）。

## 2. 逐条断言 → 判据

| 断言（页内落点） | 判据 |
|---|---|
| §4.23 节界 p310–326、上界 §4.24 p327 | TOC + 正文双核；PAGECHECK p310 `'4.23 Power Management'`、p327 `'4.24 Host Controller Management'` 均 OK |
| 两口井供电规则：Core 可被系统关断 / Aux 井 AC 供电期间常在（若支持） | §4.23.1 p310；PAGECHECK p310 `'Core power may be switched off'` OK |
| Core 井内存寄存器复位三条件（Chip Hardware Reset / HCRST / D3hot→D0） | §4.23.1 p311；PAGECHECK p311 `'transition from the PCI PM D3hot state to the D0 state'` OK |
| Aux 井复位两条件（初次上电 / HCRST）+ Legacy Support 寄存器例外 + LHCRST 轻复位行为 | §4.23.1 p310–311 正文；PAGECHECK p311 `'Light Host Controller Reset (LHCRST)'` OK |
| Save State/Restore State 两旗只在停机态（R/S=‘0’）可置；内部状态（RCS、Enabled Device Slots）也须保存恢复 | 引文①②（§4.23.2 p311/p312）；PAGECHECK p312 `'Restore State flags may only be set'` OK |
| 存前停活动：Stop Endpoint 停 Running:Busy；FSC=‘0’ 实现连 Idle 也停（FSC=‘1’ 自 1.1/1.2 强制）；命令环 CRR=‘0’ 或空+完成事件收讫 | §4.23.2 存档步1–2 p312；PAGECHECK p312 `'Force Save Context Capability'` OK |
| 存档步序：十组寄存器按序读（USBCMD…VTIO）→ CSS=‘1’ 等 SSS=‘0’→ SPR=‘1’ 存 Scratchpad→ 存 DCBAA/Contexts→ 断 Core 井电 | §4.23.2 存档步3–10 p312；PAGECHECK p312 `'Controller Save State (CSS)'`、`'Remove Core Well power'` OK |
| 恢复步序：上电→镜像回原物理地址→九组寄存器按序写回（DNCTRL…VTIO，不含 USBCMD）→ CRS=‘1’ 等 RSS=‘0’→ 命令环重初始化+写 CRCR→ R/S=‘1’→ 走拓扑初始化 PORTSC/PORTPMSC/PORTLI→ 逐端点门铃重启 | §4.23.2 恢复步1–10 p312–313；PAGECHECK p313 `'Controller Restore State (CRS)'`、`'PORTSC, PORTPMSC, and PORTLI'`、`'Restart each of the previously Running endpoints'` OK |
| 恢复次序硬规则：寄存器先写回、Restore 后执行（Restore 盖复位默认值） | §4.23.2 p313 Note 正文 |
| 端口态不在 Save/Restore 覆盖内；Restore 时设备应仍挂接、USB 地址不变，否则软件修补 | 引文③（§4.23.2.1 p314 Note）；PAGECHECK p314 `'not covered by a Save or Restore'` OK；p315 正文（提取文本 17707–17711 行） |
| SRE 出错面：保存态损坏→SRE=‘1’+Restore 终止+RSS 清 0；Save 后先 Run 再 Restore→Restore 完成时报 SRE（仅 Aux 井保住才报） | §4.23.2.1 p313–314 Note；PAGECHECK p314 `'Error (SRE) flag in the USBSTS'` OK |
| §4.23.3 本体=指路（Refer to Appendix A）；D0 必需/D1 可选/D2 可选/D3hot 必需/D3cold 必需及各自语义 | §4.23.3 p315；PAGECHECK p315 `'Refer to Appendix A.'` OK；Table A-1 p557；PAGECHECK p557 `'Table A-1: xHCI Support for Power Management States'` OK |
| 出 D0 前软件必须把全部 Enabled 下游端口置 USB 挂起；xHC 按 PCI PM 规范断言 PME#；D3hot→D0 伴随内部复位且 PMCSR.PME_Status/PME_En 保持 | Appendix A p557 + A.1.1 p558；PAGECHECK p557 `'in the USB suspended state before exiting the D0 state'`、p558 `'Power State Transitions'` OK |
| LPM 对 xHC 支持的全部 USB 协议强制 | 引文④（§4.23.5 p315–316）；PAGECHECK p315 `'shall support Link Power Management'` OK |
| Table 4-12 映射：On=L0/U0、细粒度=U1（<~10μs）、粗粒度=L1(Sleep)↔U2（~1ms 互映）、Suspend=L2/U3、Off=L3/未定义；PLS 解释随 Port Speed、LS/FS/HS 永不报 U1 | §4.23.5.1 p316–317；PAGECHECK p316 `'Table 4-12: LPM State Mapping'`、p317 `'shall never report a U1 state'` OK |
| USB2 软件 L1 入口=写 PLS=‘2’ 起 LPM 事务；L1S=Success/Not Yet/Not Supported，后两者置 PLC 出端口状态变化事件 | §4.23.5.1.1 p317–318 正文（提取文本 17844–17889 行）；PAGECHECK p317 `'4.23.5.1.1'` OK |
| 硬件控制 LPM：HLC/HLE/LPM Timer/HIRD 与 BESL 两法；BESL（HLE=‘1’ 且 BLC=‘1’）自 xHCI 1.1/1.2 强制 | §4.23.5.1.1.1 p318–320；PAGECHECK p318 `'4.23.5.1.1.1'`、`'Hardware LPM Capability (HLC)'`，p319 `'Hardware LPM Enable (HLE)'`，p320 `'shall be mandatory for all'` OK |
| MEL=软件算的最坏退出延迟（三成分）；USB2 取 BESL+TL1ExitDevRecovery(10μs)；MEL=‘0’=路径无电源管理 | 引文⑤（§4.23.5.2 p324）；PAGECHECK p324 `'Max Exit Latency field in the Slot Context'`、p325 `'TL1ExitLatency1 = BESL + TL1ExitDevRecovery'` OK |
| No Ping Response Error：SS Isoch 限定；提前 MEL μs 发 PING；PING_RESPONSE 迟到报错、数据丢弃 | §4.23.5.2.1 p325–326 正文；PAGECHECK p325 `'4.23.5.2.1'` OK（S10 narr 注记） |
| Max Exit Latency Too Large Error：Evaluate Context 生成/Configure Endpoint 可选（CMC/CME 门控） | §4.23.5.2.2 p326 正文；PAGECHECK p326 `'4.23.5.2.2'`、`'The CMC flag in the HCCPARAMS2'` OK（S10 narr 注记） |

引文 5 条均逐字取自 `/tmp/spec-audit-txt/xhci-1.2b.txt` 提取文本、断行处按提取文本
保留空格拼接；Q1/Q5 needle 证实所在页（p311/p324），Q2/Q3/Q4 见上表 needle。

## 3. 验收门输出（逐条实测，2026-11-04）

1. 页码机核（40 needle，覆盖五小节头+引文+上界+Appendix A）：
   `PAGECHECK-PASS`（末行；40/40 PAGE-OK——首跑 39/40，`'Save/Restore Error (SRE)'`
   在 pypdf 断行假阴性，改单行 needle `'Error (SRE) flag in the USBSTS'` 后全过）。
2. 语言门：`RETIRED-COUNT index.html: total=6 {'泳道': 6}` /
   `RETIRED-COUNT index-light.html: total=6 {'泳道': 6}`——残留 family ⊆ 豁免集
   {回执,柜台,泳道}，PASS。
3. 交互冒烟：`python3 scripts/xhci_spec_lane_smoke.py lessons/xhci-spec/ch4/4.23-power-management 10`
   → `[dark] PASS console=0` / `[light] PASS console=0` / **`LANE-SMOKE-PASS`**。
4. 自包含：`grep -c 'http://\|https://' index.html index-light.html` → 各 **2**
   （全为 SVG xmlns），PASS。
5. 互链：相对链接目标逐一实测存在（../../index.html、4.15/4.2/4.20/4.21/4.22/4.24
   六节页、EVIDENCE.md）——MISS=0（EVIDENCE.md 随本文件落盘补齐）。
6. zoomfs focus 选择器登记：`['[data-step].xsp-on']`（lane_page.mjs 生成器统一注入）。

## 4. shots 清单（xhci_spec_lane_smoke.py 自动落盘，×2 主题）

- lane-overview-dark.png / lane-overview-light.png（总览全景）
- lane-step2-dark.png / lane-step2-light.png（步进第 2 步）
- lane-step-end-dark.png / lane-step-end-light.png（步进末步+表格卡可见）

## 5. 偏差与坑

1. **任务面描述与原文小节归属的偏差**：任务面把「USB2 L1/USB3 U1/U2/U3 关系」挂在
   §4.23.4——按原文，该映射表（Table 4-12）实体在 **§4.23.5.1**（p316–317）；
   §4.23.4 本体仅三条引用（USB2/USB3 规范、USB PD 走 ACPI，p315）。页面按原文归属：
   映射表入对照卡并标 §4.23.5.1，§4.23.4 以一句指路入 prose。
2. **§4.23.3 是空壳节**：正文仅 "Refer to Appendix A."（p315）——D0/D3/PME 实体内容
   取自 Appendix A p557–558（A.1.1），页内逐条标 p557/p558。
3. **规范疑似笔误不转写**：p318 正文 bullet 把 Timeout/Error 的 L1S 值写作 ‘3’，与
   同页 L1S 结果清单的 Timeout/Error（‘4’）矛盾——页面只采用清单值口径且不写该
   数值（L1S 只列 Success/Not Yet/Not Supported 语义），歧义不入页。
4. **pypdf 断行坑（复发性）**：needle 含 `/` 或跨行词组易假阴性——本次
   `'Save/Restore Error (SRE)'` 实锤（p314 该行在 pypdf 里断成 Save/Restore␣␣Error）；
   判据维持「needle 单行短词、先在提取文本现场核再进 pagecheck」。
5. 设备泳道参与面：主线中设备只在唤醒事件出现（S6 远程唤醒→PME#）与 S10 注记
   （端口态/地址不变假设）——如实呈现，未硬凑戏份。

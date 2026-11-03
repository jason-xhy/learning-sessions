# EVIDENCE.md —— §4.4 设备拔出（2026-11-04，泳道节量产首件）

## 逐条断言 → 判据

| 断言 | 判据 |
|---|---|
| 拔出由 PORTSC 承载：CCS→0、CSC→1 | xHCI 1.2b §4.4 p81（引文①，pagecheck PAGE-OK：`Connection Status (CCS)` / `(CSC) bit` @p81） |
| PSCEG 0→1 跳变才产生 Port Status Change Event | §4.4 p81 句 + §4.19.2 Port Status Change Generation p291（pagecheck PAGE-OK） |
| 确认拔出后软件须对受影响槽发 Disable Slot | §4.4 p81（引文②，pagecheck PAGE-OK `Device Detach`） |
| Disable Slot 命令模型 = 唯一命令环 + 门铃 0 + 必回完成事件 | §4.1 p68（立标节已核）+ §4.6.4 p96（引文③ pagecheck PAGE-OK） |
| Disable Slot 五项回收（禁槽门铃/回收带宽/终止活动/释放资源/槽标记可复用） | §4.6.4 p96 五条 bullet（页码 PAGE-OK `4.6.4`） |
| 软件侧释放 Device Context / 传输环 / 段表内存 | §4.6.4 p96 "software can free the Device Context, Transfer Ring, Stream Context Array, etc." |
| 前置条件：端点 Stopped（或 Running 中 Idle）+ 未决 Transfer Events 已收齐 | §4.6.4 p96 Note |
| 槽位回收后可被 Enable Slot 再分配 | §4.6.4 p96 "available for subsequent reassignment by an Enable Slot Command" + §4.3.2 p75 |
| 设备泳道离场（拔出后设备侧无响应） | §4.4 全文无设备侧动作——三方视角诚实立法（DESIGN §1.7） |

页码机核：`python3 scripts/xhci_spec_pagecheck.py 81 'Connection Status (CCS)' 81 '(CSC) bit' 291 '4.19.2' 81 'Device Detach' 96 '4.6.4' 96 'Disable Slot Command is issued by software to force'` → PAGECHECK-PASS（needle 避 PDF 断行：`Current`/`Connect` 在断行处，用断行后短 needle）。

## 工艺与门

- 生成器：`ch4/_gen/lane_page.mjs`（从 4.1 build.mjs 参数化抽取）——布局推进量=内容高自适应（多行盒不压叠）；箭头激活标记：非 dev 端 UML 窄条贴边（teach 箭头触边判据的同构实现）；总览/步进单卡双模式同源（DESIGN §8 修订#2）。
- 本节 build.mjs 仅数据（分镜 steps/quotes/prose/legend/links），照抄 4.4 改数据即量产。
- 门：语言门 total=9 ⊆ 豁免集（回执3/泳道6——泳道=图表术语字面，回执=§3.2 给定词）；自包含（http URL 仅 SVG xmlns ×2）；console clean ×2 主题；步进交互冒烟 PASS（步 2/10 narr 实测）；页码 PAGECHECK-PASS。
- zoomfs 单实例单舞台接线（无第二 stage）。
- shots：lane-overview/step2/step-end × dark/light 共 6 张。

## 已知边界

- §4.6.4 逐命令展开归 §4.6（待建）——互链卡已挂待建链接到板块目录。
- 走读卡（Disable Slot 代码链）：按 CODE-STEPPER 提案 §3.4 选配清单登记为首批补卡候选，本批不配（量产出页优先）。

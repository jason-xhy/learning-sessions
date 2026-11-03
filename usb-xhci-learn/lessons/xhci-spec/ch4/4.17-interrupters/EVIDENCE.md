# EVIDENCE.md —— §4.17 中断器（2026-11-04，泳道节量产 #7）

## 逐条断言 → 判据

| 断言 | 判据 |
|---|---|
| 中断器=事件与通知的管理单位；≤1024 个（MaxIntrs，至少 1）；组成=IMAN+IMOD+一条事件环 | §4.17 p261（pagecheck PAGE-OK `4.17 Interrupters` + `up to 1024 Interrupters`） |
| 每中断器映射单个 MSI/MSI-X 向量；总开关=USBCMD.INTE | §4.17 p261–262（引文② PAGE-OK `single MSI or MSI-X interrupt vector`——原句跨行，needle 取断行后段） |
| 节流三条件 IMODC=0·IPE=1·EHB=0 → IP=1；IMODI 默认 4000(1ms)、建议 651–5580；重负载合并/轻负载即时 | §4.17.2 p264–267（Figure 4-22/4-23/4-24；脚注 56 EHB 动机） |
| MSI/MSI-X：IP 由 PCI 写完成自动清；INTx#：软件写 IMAN 清 | §4.17.2 p265 |
| Pin：仅中断器 0，其余禁用；MSI：向量=Index MOD MME、Capable≤MaxIntrs、>32 限制；MSI-X：1:1、Table Size=MaxIntrs | §4.17 p261–262 + §4.17.3 p267 |
| 跨事件环不保序 | §4.17 p262 Note（引文③ PAGE-OK） |
| Interrupter Target 三来源（固定 Primary/TRB 字段/Slot Context 字段）；不支持映射则全进中断器 0 | §4.17.1 p263（引文④ PAGE-OK）+ §4.17.4 p267 |
| 设备泳道不参与 | §4.17 全文无设备侧动作 |

页码机核：PAGECHECK-PASS。

## 工艺与门

- 生成器 lane_page.mjs 量产件 #7（泳道+表格卡经 linksHtml 槽拼装——lanePage 无 cards 槽，表格卡走相关卡前置位）。
- 门：语言门 total=5 ⊆ 豁免集（回执1/泳道4）；交互冒烟 LANE-SMOKE-PASS ×2 主题；自包含；截图 6 张。

# EVIDENCE.md —— §4.7 门铃（2026-11-04，泳道节量产 #2）

## 逐条断言 → 判据

| 断言 | 判据 |
|---|---|
| 门铃阵列 ≤256 个 32 位 MMIO 寄存器，按 Device Slot ID 索引，基址 DBOFF | §4.7 p142 首段（pagecheck PAGE-OK `4.7`@p142；DBOFF 归 §5.3.7 引述） |
| 门铃 0 专属主机控制器，唯一合法值 DB Target=0，1–255 保留 | §4.7 p142（引文① pagecheck PAGE-OK） |
| 门铃 1–255 与设备槽 1:1；先挂 TD 后按铃；DB Target/Stream ID 指明传输环 | §4.7 p142（引文② pagecheck PAGE-OK） |
| 无需清除；xHC 内部记录每次写；两条环=两次写 | §4.7 p143（引文③ pagecheck PAGE-OK `two separate Transfer Rings`） |
| 读门铃不返回信息 | §4.7 p143 "Doorbell registers return no information when read." |
| 禁写：槽 Disabled / 端点 Disabled → Endpoint Not Enabled Error 事件（Transfer Event，字段全 0）或忽略 | §4.7 p143 三段（"An Endpoint Not Enabled Error should be generated..." / "The xHC may ignore..."） |
| Halted/Error 端点必忽略 | §4.7 p143（引文④ pagecheck PAGE-OK `ignore doorbell references to endpoints`） |
| 设备泳道不参与 | §4.7 全文无设备侧动作——DESIGN §1.7 立法 |

页码机核：PAGECHECK-PASS（needle 全部避 PDF 断行——`Halted or Error state` 在 p143 断行处，用 `ignore doorbell references to endpoints`）。

## 工艺与门

- 生成器 lane_page.mjs 量产件 #2；本节 build.mjs 纯数据。
- 门：语言门 total=7 ⊆ 豁免集（柜台1=Fig4 订单柜台专名/回执1=图例事件回执流/泳道5=图表术语）——**首轮实锤「旅程」×2 越豁免，当轮改「全程」清零**（量产节文案自查清单 +1：禁 旅程/记账/契约/整桩/那支/本剧/游标/敲门铃）；
- 交互冒烟门（固化=scripts/xhci_spec_lane_smoke.py）：LANE-SMOKE-PASS ×2 主题（console=0、步进计数 3/8、模式钮 aria-pressed、复位回总览、三截图×双主题）。
- 自包含：http URL 仅 SVG xmlns。
- shots：lane-overview/step2/step-end × dark/light 共 6 张。

## 已知边界

- DB Target 全部编码归 Table 5-43（§5.5 门铃寄存器章，后续扩展）；Halted 恢复路径（Reset Endpoint/Set TR Dequeue）归 §4.6.8/§4.6.10（待建）。
- 走读卡：门铃写无代码链必要面（一行 writel）——按提案 §3.4 不配卡。

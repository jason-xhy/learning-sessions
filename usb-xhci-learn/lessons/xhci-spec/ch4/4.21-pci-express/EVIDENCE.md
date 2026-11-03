# EVIDENCE.md —— §4.21 PCI Express（2026-11-04，表格节量产 #1）

## 逐条断言 → 判据

| 断言 | 判据 |
|---|---|
| Normal 模式=单 function 承载全部设备槽；PCIe 设备头空间 xHC 自实现（§5.2） | §4.21.1 p306–307（pagecheck PAGE-OK `4.21 PCI Express`@p306） |
| Virtualization 模式=多 VF，设备槽可独占映射到特定 VF；头空间 VMM 仿真 | §4.21.1 p306（引文③ PAGE-OK `mapped exclusively to a specific Virtual Function`） |
| 关 BME 前须停机：R/S=0 + 验证 HCH=1 | §4.21.2 p307（引文① PAGE-OK `The xHC should be Halted`） |
| 跑着清 BME → 可能 HCE=1 + 立即停机，恢复须 HCRST | §4.21.2 p307（引文② PAGE-OK `will require an HCRST`——原句 `Recovery` 在断行处，needle 取断行后段） |
| FSC 位区分挂起流程 Stop Endpoint 范围（p306 实现注记，跨 §4.23.2 引述） | §4.21 前 IMPLEMENTATION NOTE p306 |

页码机核：PAGECHECK-PASS。

## 工艺与门

- 新模板 `_gen/table_page.mjs` 首件（表格节不做动画，DESIGN 分级）：无 iso-stage/无 zoomfs/无步进，卡片=规范要义+原文对照+两张 xsp-tb 表+相关。
- 门：语言门 total=0；静态冒烟 console=0 ×2 主题 + 截图 table-overview×2 + 390px×2；自包含；页码 PAGECHECK-PASS。

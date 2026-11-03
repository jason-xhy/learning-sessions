# EVIDENCE.md —— §4.18 传输定义与属性（2026-11-04，表格节量产 #4）

## 逐条断言 → 判据

| 断言 | 判据 |
|---|---|
| NS/RO 请求者属性；Enable No Snoop 前提位=Table 7-12 位 11（§5.2.8 PCIe 能力结构） | §4.18.1 p270（pagecheck PAGE-OK `Enable No Snoop bit (Bit Location 11, Table 7-12)`） |
| NS 三重前提（Enable+TRB NS 标志+不需硬件强制一致性）；不保证全事务 NS（须保证地址不在任何缓存） | §4.18.1/§4.18.2 p270（引文①） |
| MSI/消息请求不许 NS | §4.18.1 p270（引文② PAGE-OK `Message Signaled Interrupts, and Message Requests`） |
| Table 4-11=推荐行为，实现可自选；IN/OUT 数据行由 TRB NS 标志动态控制 | §4.18.2 p270 + p271 Note（表格逐行转写自 p270–271 提取文本） |
| payload NS 场景（CPU 未碰过的 IN 缓冲） | §4.18.2.1 p271 |
| scratchpad 归 xHC 独占 → 访问应走 no-snoop DMA | §4.18.2.2 p271–272（引文③ PAGE-OK `exclusively owned by the xHC`） |

页码机核：PAGECHECK-PASS。

## 工艺与门

- table_page.mjs 量产件 #4（Table 4-11 全 12 行 rowspan 转写）；语言门 total=0；静态冒烟 console=0 ×2 + 截图 ×4；自包含；页码 PAGECHECK-PASS。

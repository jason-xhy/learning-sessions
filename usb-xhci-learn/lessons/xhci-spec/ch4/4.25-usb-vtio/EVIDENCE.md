# EVIDENCE.md —— §4.25 USB VTIO（2026-11-04，表格节量产 #3）

## 逐条断言 → 判据

| 断言 | 判据 |
|---|---|
| VTIO=可选能力；多 SW/HW 所有者与访问模型；PCI 例=BDF 当请求者身份 | §4.25 p331 首段（pagecheck PAGE-OK `4.25 USB Virtualization Based Trusted IO`@p331） |
| 备用 DMA-ID：Primary 之外、全系统唯一、不经标准枚举发现、经厂商自定义方法+VTIO 能力寄存器披露 | §4.25 p331（引文① PAGE-OK `an alternate DMA-ID (in addition to the primary DMA-ID)`） |
| 依赖按 function 隔离内存的基础设施（例 Intel VT-d，实现特定）；不同 DMA-ID 结构不共用同一页 | §4.25 p331（引文④ PAGE-OK `same page as defined by the PAGESIZE`——原句 `do not share the / same page` 断行，needle 取断行后段） |
| VTIO ≠ xHCI-IOV：两种能力，用 IOV 须关 VTIO；单 DMA-ID 模式合法 | §4.25 p332（引文② PAGE-OK `capability defined in the xHCI Extended Capabilities`——原句首行断行，needle 取断行后段） |
| 结构×粒度：每控制器/每设备/每端点/每中断器 四类 | §4.25.1.1 p332–333 + §4.25.2 p333 四类列表 |
| 第 6 章数据结构零改动；DBC 结构整体单一控制 | §4.25.1.1 p332 / p333 |
| PCI 重平衡改 DMA-ID → 先 HCRST 再重配 VTIO 寄存器 | §4.25.1.1 p333（引文③ PAGE-OK `Host Controller Reset is issued following such rebalance`） |
| 可信流识别=软件职责（BIOS 指认/VID-PID 白名单） | §4.25.1 p332 |

页码机核：PAGECHECK-PASS。

## 工艺与门

- table_page.mjs 量产件 #3；语言门 total=0；静态冒烟 console=0 ×2 + 截图 ×4；自包含；页码 PAGECHECK-PASS。

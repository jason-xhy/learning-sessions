# EVIDENCE.md —— §4.22 xHCI 扩展能力（2026-11-04，泳道节量产 #5）

## 逐条断言 → 判据

| 断言 | 判据 |
|---|---|
| 交接机制=USBLEGSUP（双信号量，高 16 位 OS/BIOS 各占相邻字节）+ USBLEGCTLSTS（SMI 使能 + USBSTS 子集影子） | §4.22.1 p307（pagecheck PAGE-OK `4.22 xHCI Extended Capabilities`@p307；字段定义归 §7.1.1/§7.1.2） |
| BIOS 取所有权唯一窗口=OS Owned=0；取后不得再抢 | §4.22.1 p308（引文① PAGE-OK `BIOS is only allowed to take ownership` + Note 1 "must never attempt to claim"） |
| OS 发起接管=OS Owned 信号量写 1，等 BIOS Owned 归 0，限时 ≤1 秒 | §4.22.1 p308–309（引文② PAGE-OK @p308；限时句 PAGE-OK `not exceed ‘1’ second`@p309） |
| SMI on OS Ownership Change=BIOS 侧唯一通知；无反向机制 | §4.22.1 p309（"no similar SMI-type of event"） |
| 交接寄存器住 Aux Power 井，掉电回默认值 | §4.22.1 p308（引文③ PAGE-OK `Aux Power well`） |
| 交接前五步建议清单 | §4.22.1 p309 五步 |
| 反向让位（OS 卸载）同走信号量+SMI | §4.22.1 p309（"it shall set the OS Owned semaphore to a ‘0’"） |
| 4.22.2 调试能力→§7.6；4.22.3 虚拟化→第 8 章 | §4.22.2/§4.22.3 p310（一行指针小节） |
| 设备泳道不参与 | §4.22 全文无设备侧动作——DESIGN §1.7 立法 |

页码机核：PAGECHECK-PASS（引文②句跨 PDF 断行 `initiates an / ownership request`——用断行两侧短 needle 分验）。

## 工艺与门

- 生成器 lane_page.mjs 量产件 #5；build.mjs 纯数据（8 步）；软件泳道=两位代理先后在场（BIOS→OS），泳道标签注明。
- 门：语言门 total=5 ⊆ 豁免集（泳道5）；交互冒烟 LANE-SMOKE-PASS ×2 主题（console=0、计数 3/8、复位回总览）；自包含；截图 6 张。

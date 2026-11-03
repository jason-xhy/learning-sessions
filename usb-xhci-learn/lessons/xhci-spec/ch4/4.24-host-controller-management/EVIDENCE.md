# EVIDENCE.md —— §4.24 主机控制器管理（2026-11-04，表格节量产 #2）

## 逐条断言 → 判据

| 断言 | 判据 |
|---|---|
| HCE=只影响 xHC 自身的内部错误；置 1 后 xHC 停止一切活动 | §4.24.1 p327（pagecheck PAGE-OK `4.24.1` + `shall cease all activity`） |
| 软件响应=HCRST=1 复位 + 重新初始化；无响应时主动查 HCE | §4.24.1 p327（引文①） |
| 软错误例=SRAM 奇偶错；硬错误=重初始化后 HCE 立即再亮，软件须打断循环并上报 | §4.24.1 p327 Note（引文② PAGE-OK `to reassert HCE`——原句 `Recovery/reassert` 两处断行，needle 取断行后段） |
| 系统级错误走 HSE（非 HCE） | §4.24.1 p327 Note，细节 §4.10.2.6 |
| 无集成集线器：根端口↔外部端口 1:1 编号对齐，IHI=0 | §4.24.2.1 p328（引文③ PAGE-OK `1:1 mapping between xHC Root Hub ports`；IHI=0 p328） |
| 有集成集线器：至多一层、层级错位仅一种允许形态、同协议连续编号、IHI=1、厂商须给映射描述（Appendix D） | §4.24.2.1 p327–328 四条 bullet |
| USB3 集线器=USB2+Enhanced SS 双集线器逻辑合体 | §4.24.2.1 p328 |
| 嵌入式集线器：外部端口↔连接器不允许层级错位；五级映射描述须由系统提供 | §4.24.2.2 p328–329 |
| 默认映射：外部端口 1 与 n+1 → 连接器 1（USB3 兼容口）以此类推 | §4.24.2.2 p329（引文④ PAGE-OK `shall map to USB connector 1 to form a USB3`） |

页码机核：PAGECHECK-PASS。

## 工艺与门

- table_page.mjs 量产件 #2；语言门 total=0；静态冒烟 console=0 ×2 + 截图 ×4；自包含；页码 PAGECHECK-PASS。

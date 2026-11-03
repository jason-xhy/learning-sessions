# EVIDENCE.md —— §4.1 命令操作页断言清单

页：`index.html`（dark）/ `index-light.html`（light），由 `build.mjs` 生成（2026-11-03）。
规范判据源：`specs/625472_xHCI_Rev1_2b.pdf` + `/tmp/spec-audit-txt/xhci-1.2b.txt`（页标=印刷页=PDF 页，已实测一致）。

## A. 正文与画面断言 → 判据

| # | 断言（画面/正文承载） | 判据出处 | 页码机核 |
|---|---|---|---|
| A1 | 全规范只有一条命令环；xHCI 专用命令与设备槽相关命令共用 | §4.1 p68 原文 "There is only one Command Ring that is used for issuing xHCI specific commands or commands related to Device Slots." | pypdf needle PASS |
| A2 | 命令投递 = 命令 TRB 写入命令环 + 写门铃寄存器 0（DB Target=0，Host Controller Command） | §4.1 p68 原文 "…placing the desired Command TRB(s) on the Command Ring, then ringing the xHC command Doorbell register, that is, writing the Host Controller Command code to the DB Target field of Doorbell register 0" | PASS |
| A3 | 每条命令必有一条 Command Completion Event TRB 回执，走事件环 | §4.1 p68 原文 "All commands result in the generation of a Command Completion Event TRB on the Event Ring." | PASS |
| A4 | 中断可选：MSI-X 或软件轮询事件环 | §4.2 初始化清单脚注 7 p69 "Interrupts are optional. The xHC may be managed by polling Event Rings." | PASS |
| A5 | Enable Slot 回执带 xHC 选定的 Slot ID（步进解说第 6 步示例） | §4.3.2 p75 "The Enable Slot Command returns a Slot ID that is selected by the host controller." | PASS（needle 避断行双验） |
| A6 | xHC 按 CRCR 指针取命令 TRB（时序第 3 步） | §4.2 p69 初始化清单 "Define the Command Ring Dequeue Pointer by programming the CRCR"；§4.6.1 命令环操作 p91 | PASS（A2 同页族） |
| A7 | 设备泳道「本流程不参与」；个别命令由 xHC 代发 USB 请求（见 §4.3） | §4.1 全节无设备参与；§4.3.4 p76 Address Device（BSR=0）由 xHC 发 SET_ADDRESS | PASS（§4.3.4 p76 原文在档） |
| A8 | 演示样例命令 = Enable Slot（无 TRB Type 数值上画面） | 示例值；TRB 字段细节刻意留给 §4.6（页内明写"字段细节见 §4.6"） | N/A（无数值主张） |

## B. 页面元数据

- 页头规范引用：`xHCI 1.2b §4.1 Command Operation · p68` —— pdf_toc 实测 4.1 → p68 ✓
- zoomfs：focus 选择器 `[data-step].xsp-on`（步进模式放大自动居中当前步）；`window.__zfs` 存活（capture readout 佐证缩放控件在位）
- 三方配色：DESIGN §3.3（驱动 #7c9ff0/#2d5fb3 · xHC #d9a860/#8a5f14 · 设备 #86bd7a/#2f7a3d）

## C. 门结果（2026-11-03）

| 门 | 结果 |
|---|---|
| SVG 布局机械检（outside/overlap/fit/arrow） | PASS（dark+light；`check_lesson_svg_layout.py`） |
| 语言门（retired 词族） | PASS（残留=豁免表内 {回执×13, 柜台×1 fig4 专名, 泳道×1}，DESIGN §1.5 豁免立法 2026-11-03） |
| 自包含 | PASS（零外部 script/link） |
| 页码机核 | PASS（A1–A5 七 needle 全过，一处 needle 跨断行假阴性已双验订正） |
| 截图 | dark-tour / dark-step3（步进高亮+令牌）/ light-tour / phone-390，console clean |
| 双主题构建 | PASS（66 KB ×2） |

## D. 施工坑与修订建议（主会话裁决）

1. **契约修订建议（已并入 DESIGN §5.1 执行）**：4.1 页"流程图+动画"合并为单卡双模式
   （总览=完整流程图、步进=动画，同一 SVG 数据同源）。理由：zoomfs 单实例绑定首个
   `.iso-stage`，双卡=第二卡无缩放/全屏；同图同源也避免两张图漂移。**已登记 DESIGN §8。**
2. 时序图箭头端点落在生命线激活标记（UML 惯例窄条矩形）边缘——满足"箭头两端触盒"判据，
   后续泳道页沿用。
3. 令牌元素 getBBox 为本地坐标（transform 不入账）——隐藏元素也要把本地几何放进 viewBox，
   否则布局机械检误报。

## E. 修订轮（2026-11-03 下午，用户反馈：遮挡/帧速/字号）

| 项 | 修前 | 修后 | 验证 |
|---|---|---|---|
| 自动步进帧速 | 1700ms/步 | 3200ms/步 | build.mjs startAuto interval |
| 令牌卡文字 | 12px | 14px | CSS .xsp-token text |
| 泳道标题 | 17px/11.5px | 18px/12.5px | .xsp-hdr-t/.xsp-hdr-s |
| 框内文字 | 15.5/14.5px | 16.5/15.5px | .xsp-t1/.xsp-t2/.xsp-t3 |
| 页码角标 | 11.5px | 12.5px | .xsp-pg |
| **令牌压字** | 固定 `-116px` 偏移：arrow 类元素文字带（ty-44 起）必被压 9px；step1/step5 顶位空间不足撞泳道标题/上一元素页码 | **三候选自选**（bbox 顶上方 12px → 左侧外 → 右侧外，取首个与全部 text getBBox 零交点；clamp 进画布） | token 探针 8/8 步零交集 TOKEN-PROBE-PASS（步进逐台核对令牌与全部 SVG 文字 bbox） |
| shots | — | dark-tour/dark-step1/dark-step3/light-tour/phone-390 复拍 | 2026-11-03 14:32 |
| 语言门 | — | 残留仍=豁免表内 {回执×13, 柜台×1, 泳道×1}，与修前一致 | scan_words retired |

坑：令牌固定偏移的"每类元素逐一验算"方案在 step1（首元素离泳道标题仅 31px）与
step5（上一元素 pg 落在顶位带）两处翻车——垂直空间是否充足取决于上下元素布局，
不可静态假设；三候选自选+全文字交点检测是自愈合方案，布局变化自动适应。

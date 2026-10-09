# USB 2.0 / USB 3.2 / xHCI 中文短课（自学包）

面向内核/驱动工程师的中文课程：以三规范原文为纲、以 Linux 内核实现（行号锚定）为对照，目标是能对 USB 栈补丁做规范章节级的评审。

## 当前进度（每学完一课更新这里——下次打开直奔"当前"）

- 已完成：0001 体系诊断（92%）· 0002 hub 事件链路（4/4，10-08 间隔 13 天重测 4/4 保持）· 0003 双总线根端口（3/3，10-08 重测 3/3 保持）· 0004 TT 与 split（首测 2/4 → 10-08 重测 4/4 补缺闭环）· 0005 TT 缓冲与重试（10-08 首次落档测评 4/4，13 天新角度回测）
- **当前：xHC 线三课已造课（10-09 拆分上线，待测评）——0006 先认零件（提单 TRB 全解：DW0-1 四种身份/DW2/DW3 位表＋槽/TD/段/环＋三层语法＋环几何）→ 0007 环的运转（六站旅程＋cycle 合同＋接缝＋四把钥匙联动七帧＋钻点三"两问两答"同框对照动画：圈界 vs 件界、为什么还要翻圈——来自读者实问，10-09 增补，quiz 扩至 9 题）→ 0008 旅程实战与命运（M4.5 标本九事件＋错误路径全图＋ep_state 十旗标）**
- 在线浏览（GitHub Pages）：全部课程均有单文件版（样式/测验/动画内联，课间链接互通）——[0001 诊断](0001-diagnostic-standalone.html) · [0002 hub 链路](lessons/0002-hub-attach-chain-standalone.html) · [0003 双总线](lessons/0003-dual-bus-root-port-standalone.html) · [0004 TT/split](lessons/0004-tt-split-standalone.html) · [0005 TT 缓冲重试](lessons/0005-tt-buffer-retry-standalone.html) · [0006 先认零件](lessons/0006-xhc-trb-parts-standalone.html) · [0007 环的运转](lessons/0007-xhc-ring-keys-standalone.html) · [0008 旅程实战与命运](lessons/0008-xhc-journey-fate-standalone.html)。（原"0006 一次控制传输的旅程"单课已于 10-09 拆分为 0006/0007/0008 三课，内容全量继承并新增提单/DW0-1 详解）
- 下一课候选：rhub 双根端口课（衔接 0003 双总线）· 命令环深钻（CRCR/停止恢复）

## 快速开始（两条路径）

- **自学模式（无 AI）**：在线直接从 [0001 单文件版](0001-diagnostic-standalone.html) 开始（30 题 7 领域诊断，即时判分，解析即锚点卡）；离线解压包则浏览器打开根目录的 `0001-knowledge-map-diagnostic.html` → 按**分领域得分**对照 `LEARNERS.md` 路由表选课 → 每课末尾测验自检。
- **陪学模式（有 AI 助手）**：解压后跑 `setup.sh`（随私有仓 learning-sessions-plan（tools/learning-sessions/usb-xhci-learn/，公开仓只含交付物）分发）——①把陪学协议幂等合入你的 `AGENTS.md`（不覆盖已有内容）；②从上游拉取开源 `/teach` 技能（网络不通自动回退自学模式）。然后对 AI 工具说"按 AGENTS.md 当我的老师"（ZCode 里 `/teach`），它会先重新诊断你的基线、按缺口定制课程。

## 文件地图

| 路径 | 内容 |
|---|---|
| `0001-knowledge-map-diagnostic.html` | **入口**：知识体系诊断测评 |
| `setup.sh` | 陪学环境一键配置（随私有仓 learning-sessions-plan（tools/learning-sessions/usb-xhci-learn/，公开仓只含交付物）分发） |
| `lessons/` | 0002 起的细节课（每课带检索练习；`*-standalone.html` 为在线单文件版） |
| `reference/` | 速查卡（压缩的考点，可打印） |
| `assets/` | 课程共享样式与测验引擎（**不随公开仓分发**，随私有仓 setup.sh 链路携带；在线浏览用各课 standalone 单文件版） |
| `figures/` | 流程图与波形图 |
| `notes/` | 三规范精读摘要库、传输流程笔记、实现-规范差异分析、核对清单 |
| `docs/TEACHING-PROTOCOL.md` | AI 陪学协议（setup.sh 合入 AGENTS.md 用） |
| `LEARNERS.md` | 学习者指南：两种用法 + 领域→课程路由表 |
| `specs/` | 规范 PDF 存放处（因版权不随包分发，见其中 README） |

## 注意

- 课程中内核行号基于 **Linux v7.3.0**（master@62f4c998b297）的 `drivers/usb/core/hub.c` 等；其它版本需重核。
- `specs/` 下载后按其中 README 的文件名放置，课程内链接即可直接打开规范原文。
- 本包自有内容（课程/笔记/图/清单）以 [MIT](LICENSE) 开源；**规范 PDF 本体受 USB-IF/Intel 版权约束，请勿转发**，一律官方渠道自取。

## Credits & Licenses

本仓内容以 [MIT](LICENSE) 开源，建于以下资源之上：

- [mattpocock/skills](https://github.com/mattpocock/skills)（MIT）——教学框架（MISSION/学习记录/检索练习/先诊断后教学）源自其 `skills/productivity/teach`；本仓不内嵌其代码，接入脚本 `setup.sh` 运行时从上游拉取（脚本随私有仓分发）。
- [Linux kernel](https://github.com/torvalds/linux)（GPLv2）——课件中的源码片段为教学评注性短摘录，行号基线 master@62f4c998b297（v7.3-rc4-75）。
- USB 2.0 / USB 3.2（USB-IF）与 xHCI 1.2（Intel）规范——课件仅引用章节号、时序数字与自撰归纳，不含规范原文与图表；规范 PDF 按 `specs/README.md` 自行获取。

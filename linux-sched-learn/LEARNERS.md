# 学习者指南 · 其他人怎么用这套课程

> 本课程按 teach 工坊模式构建：**知识内容通用，选课路径因人而异**。原作者的课序由他本人的诊断缺口决定；你应当按你自己的诊断结果选课。框架本身就是"先诊断后教学"。

## 两种用法

**① 自学模式（无 AI 助手）**
1. 浏览器打开科目根目录的 `0001-knowledge-map-diagnostic.html`（双击即测，无需翻找），做 **40 题体系诊断**（8 领域 × 5 题，分 P1/P2 两部分可分次做；即时判分，解析就是微型锚点卡——答错的地方解析会给你文档章节与内核行号）。
2. 拿着分领域得分（8 领域各自 x/5），对照下面的**路由表**选课（细节课在 `lessons/`）。
3. 每课末尾有检索练习自检；测验答案位置已轮换，无规律可背。
4. 深究任何主题：先读 `Documentation/scheduler/` 树内文档（基线 commit 见 README），再读 `kernel/sched/` 源码。

**② 陪学模式（有 AI 助手，体验完整）**
解压后跑一次 `bash setup.sh`，它做两件事：①把 `TEACHING-PROTOCOL.md`（陪学协议）**幂等合入**你的 `AGENTS.md`（标记块包裹、不覆盖你已有的内容，`AGENTS_FILE=路径` 可指定别的文件）；②从上游开源仓（github.com/mattpocock/skills）拉取 `/teach` 技能装到 `TEACH_SKILLS_DIR`（默认 `~/.zcode/skills`）——**网络不通则自动回退自学模式**。之后对任意 AI 工具说"按 AGENTS.md 当我的老师"（或 ZCode 里键入 `/teach`）即可开始：陪学会**先重新诊断你的基线**、画你的缺口图、再按缺口定制课程——你的 `MISSION.md` 与 `learning-records/` 会由陪学 agent 与你对齐后新建。

## 领域 → 课程路由表

| 测验答错的领域（各 x/5） | 优先学习 |
|---|---|
| 框架版图（类次序/文件归属/SCX 位置/syscalls） | 课 0001 整体地图（八层）+ 该领域各题解析 |
| 核心机制与时机（NEED_RESCHED/抢占模型/tick/唤醒/挑选） | 课 0001 该领域解析 + core.c 对应锚点 |
| 运行队列（rq 结构族/per-CPU/cfs_rq 层级/放置参照/stop 类） | 课 0001 该领域解析 + sched.h 结构总装区 |
| 公平调度（eligible/树序〔deadline！〕/挑选/nice 权重/流速） | 课 0001 该领域解析 + sched-eevdf.rst |
| 负载跟踪（半衰期/util vs load/结算时机/EAS 判据） | 课 0001 该领域解析 + sched-pelt.c 文档 + sched-capacity.rst |
| 实时 RT（FIFO/RR/优先级体系/节流旋钮/本树默认值） | 课 0001 该领域解析 + sched-rt-group.rst |
| 截止期 DL（三参数/EDF/CBS/类间次序/准入控制） | 课 0001 该领域解析 + sched-deadline.rst |
| 组·拓扑·治理（shares/autogroup/sched_ext/调度域/uclamp） | 课 0001 该领域解析 + sched-domains.rst / sched-util-clamp.rst / sched-ext.rst |

> 细节课随主线敲定持续扩充（EEVDF 深入 / RT-DL 带宽 / PELT-EAS / 组调度 / 负载均衡）；**新增课程必须同步更新本表**。

## 哪些内容通用、哪些是个人的

- **通用（人人可用）**：lessons/ 全部知识内容、assets/ 组件、scripts/ 自检与打包脚本。
- **个人（不入包）**：原作者的 `MISSION.md`、`learning-records/`、`NOTES/RESOURCES/HANDOFF` 均不随包分发；陪学模式下 agent 会与你对齐 Why 后新建你的 MISSION，学习基线从你的 0001 诊断结果起步。

## 维护说明（会话 agent 执行）

新增课程时**必须同步更新本文路由表**；分发打包（`scripts/package-dist.sh`）自动收录本文件。

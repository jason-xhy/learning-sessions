# Linux 内核调度子系统中文短课（自学包）

面向内核工程师的中文课程：以树内文档（`Documentation/scheduler/*.rst`）与内核实现（行号锚定）为双锚，目标是能对 sched 栈补丁做**机制级评审**（指出行为-设计偏差），而不是只靠代码形态判断。

## 快速开始（两条路径）

- **自学模式（无 AI）**：浏览器直接打开根目录的 **`0001-knowledge-map-diagnostic.html`**，做四十题体系诊断（8 领域 × 5 题，分 P1/P2 两部分可分次做；即时判分，解析即锚点卡）→ 按**分领域得分**对照 `LEARNERS.md` 路由表选课（细节课在 `lessons/`）→ 每课末尾测验自检。课程的"课序"是原作者按其个人缺口定的，你按自己的诊断结果选即可。
- **陪学模式（有 AI 助手）**：在科目文件夹里跑 `setup.sh`（随私有仓 learning-sessions-plan（tools/learning-sessions/linux-sched-learn/，公开仓只含交付物）分发）——①把陪学协议幂等合入你的 `AGENTS.md`（不覆盖已有内容）；②从上游拉取开源 `/teach` 技能（网络不通自动回退自学模式）。然后对 AI 工具说"按 AGENTS.md 当我的老师"（ZCode 里 `/teach`），它会先重新诊断你的基线、按缺口定制课程——框架按"先诊断后教学"设计，课序因人而异。

## 文件地图

| 路径 | 内容 |
|---|---|
| `0001-knowledge-map-diagnostic.html` | **入门第一课**：调度子系统八层整体地图 + 40 题体系诊断（8 领域 × 5，根目录，双击即测）。样式与判分引擎已内联——**单文件自包含**，把这个文件单独发给他人，手机浏览器打开即可作答（答题完全离线；解析里的内核文档链接需联网） |
| `lessons/` | 细节课（0002 起，随主线敲定持续扩充） |
| `assets/` | 课程共享样式与测验引擎（勿单独打开） |
| `LEARNERS.md` | 学习者指南 + 领域→课程路由表 |
| `scripts/` | 课目自检、分发打包、setup.sh 源模板（随私有仓 learning-sessions-plan（tools/learning-sessions/linux-sched-learn/，公开仓只含交付物）分发） |

## 注意

- 课程内核行号基于 **Linux master@62f4c998b297**（v7.3-rc4-75）：`git clone https://github.com/torvalds/linux && git checkout 62f4c998b297` 后可本地对照；课程内文档链接也指向该基线的 GitHub 视图。
- 本主题**无规范 PDF 层**——权威 = 树内代码 + `Documentation/scheduler/`（sched-eevdf、sched-deadline、sched-rt-group、sched-bwc、sched-pelt.c 等）+ 设计论文（EEVDF：Stoica 等 1995）。
- 本包内容以 [MIT](LICENSE) 开源。

## Credits & Licenses

本包以 [MIT](LICENSE) 开源，建于以下资源之上：

- [mattpocock/skills](https://github.com/mattpocock/skills)（MIT）——教学框架（MISSION/学习记录/检索练习/先诊断后教学）源自其 `skills/productivity/teach`；本包不内嵌其代码，接入脚本 `setup.sh` 运行时从上游拉取（脚本随私有仓分发）。
- [Linux kernel](https://github.com/torvalds/linux)（GPLv2）——课件中的源码片段为教学评注性短摘录，行号基线 master@62f4c998b297（v7.3-rc4-75）。

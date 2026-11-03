# EVIDENCE.md —— §4.6 命令接口（2026-11-04，表格节量产件；互链 fig4＋逐命令总表形态）

## 逐条断言 → 判据

| 断言（页面位置） | 判据 |
|---|---|
| 命令接口由 CRCR 管理；命令=放上命令环＋写门铃 0；完成事件写主事件环 | §4.6 p90（引文① "Software places commands on the Command Ring…"，pagecheck PAGE-OK `Command Interface` @p90） |
| 命令超时完全由软件负责；超时可按 §4.6.1.2 中止 | §4.6 Note p90（引文②，PAGE-OK `all command timeouts` @p90） |
| 每个 xHC 实例只有一条命令环（避雷清单 §4.1 条对应） | §4.6.1 p91（引文③，PAGE-OK `Only one Command Ring exists` @p91） |
| 每条命令必有 Command Completion Event；Command TRB Pointer 回指命令 TRB | §4.6.1 p91（引文④，PAGE-OK `Command Completion Event for every command` @p91） |
| 主事件环接收全部命令完成事件（回执不走命令环） | §4.6.1 p91（引文⑤，PAGE-OK `Primary Event Ring receives all` @p91） |
| Command Ring Dequeue Pointer=xHC 内部寄存器不暴露；初值=CRCR Command Ring Pointer（R/S=1 前设、仅 CRR=‘0’ 可改） | §4.6.1 p91（原文段逐字核对） |
| 多条命令按入环顺序执行；执行时间实现定义 | §4.6.1 Note p91 |
| CS=‘1’ 停止：当前命令完成后停取指、回 Command Ring Stopped、环上命令所有权交软件、改 CRCR 指针可从新值重启 | §4.6.1.1 p92（原文段逐字核对） |
| CA=‘1’ 中止：被中止命令回 Command Aborted＋推进 Dequeue Pointer＋Command Ring Stopped；两命令间隙中止可能无 Aborted 事件 | §4.6.1.2 p92–93（引文⑥ PAGE-OK `Command Abort (CA) bit` @p92；Note p93） |
| 中止实现注记：只有命令「卡住」才真被中止（例=Address Device 等 SET_ADDRESS 应答）；CRR 不翻转超约 5 秒→按 xHC 大问题动 HCRST | §4.6.1.2 Implementation Note p93（PAGE-OK `5 seconds` @p93） |
| 门铃纪律：端点有状态修改命令未决不得敲该端点门铃；五命令影响特定端点、三命令影响全部端点 | §4.6 Note p90（PAGE-OK `shall not ring the doorbell` @p90） |
| 17 行总表每行功能句（No Op 演练环机制/回报 Dequeue Pointer 等）与完成事件要点（No Slots Available、Slot Not Enabled、USB Transaction Error、Context State Error、VF Event Ring Full、TRB Error 等） | §4.6.2–4.6.18 各小节首段与事件字段段逐字现场核对；页码=各小节起始页，25 needle 全 OK（见下） |
| 可选规范命令（Force Event/Negotiate Bandwidth/Set LTV/Get Port Bandwidth/Get·Set Extended Property）能力位门：BNC·LTC∈HCCPARAMS1、GSC∈HCCPARAMS2；不支持回 TRB Error | §4.6.12 p131 · §4.6.14 p133–134 · §4.6.17 p139 · §4.6.18 p141 |
| 分组卡「已建节出现处」语义对应 | 各目标节正文实核：4.1（Enable Slot 演示命令单）· 4.3（取槽/编址帧）· 4.4（Disable Slot 还槽）· 4.5（§4.5.2 例外清单/§4.5.3 逐态允许命令表/§4.5.4 请求映射）· 4.8（Halted/Error/Running↔Stopped 恢复命令）· 4.13（§4.13.1 LTM/LTR 与 Set LTV）· 4.16（Negotiate Bandwidth/带宽查询）· 4.22（扩展能力域）；链接存在性=check_lesson_links ok=54 missing=0 |
| 命令名保留英文原名 | DESIGN §3.1 术语立法 |
| Table 3-1 命令集摘要仅 15 条（无 Get/Set Extended Property） | Table 3-1 p60–61 逐行核对——本页行数以 §4.6.2–4.6.18 节数为准，不以 Table 3-1 为判据 |

## 页码机核（scripts/xhci_spec_pagecheck.py，25 needle：引文 6 处＋框架 3 处＋总表 17 行页码逐条）

```
PAGE-OK p90 'Command Interface' … PAGE-OK p141 'Set Extended Property'
（p90×3 · p91×3 · p92 · p93×2 · p94 · p96 · p97 · p102 · p112 · p114 · p118 ·
 p125 · p128 · p130 · p131 · p133 · p135 · p138 · p139 · p141）
末行：PAGECHECK-PASS（25/25）
```

## 工艺与门

- 生成器：`ch4/_gen/table_page.mjs`（表格节不做动画，DESIGN 分级；无 iso-stage/zoomfs——zoomfs focus 选择器登记：不适用，本页无舞台）。
- 门：语言门 residual ⊆ 豁免集（回执 6/柜台 1=fig4 专名/泳道 1=图表术语；首轮咬「上环」1 处，当轮改定「写入命令环」）；自包含 `grep -c 'http(s)://'` = **0**（本页无 SVG，优于 ≤2 门）；静态冒烟 TABLE-SMOKE-PASS（playwright channel=chrome，dark/light：console=0、卡片 6、总表行 18=表头+17）；互链 check_lesson_links **missing=0**（ok=54，含跨课 ../../../xhc-machines/fig4-command-ring）。
- shots（6 张，smoke_static.py 自动落）：table-overview-dark/light（全页全景）· table-cmds-dark/light（17 命令总表卡特写）· table-390-dark/light（390px 全页）。
- 页脚判据行＋EVIDENCE 链接按板块模板；导航 prev=§4.5 / next=§4.7（两邻节导航回填归各节自责，本节不越界改动）。

## 已知边界

- 任务书标题两处写「18 条命令」，但枚举「4.6.2 No Op 到 4.6.18」=17 节、用途分组合计亦 17——按枚举执行 17 行；Table 3-1（p60–61）另只列 15 条，不作行数判据。偏差已登记任务报告。
- 总表=功能句缩写＋事件要点，不逐条展开命令流程（任务书口径「18 条命令不逐条展开」）；各命令完整步骤 bullet 归规范 §4.6.2–4.6.18 原文与后续按需建节。
- 页列=小节起始页；跨页要点行内已补注（Reset Endpoint 事件 p114–115、Stop Endpoint 事件分支 p119、Disable Slot DCBAA 清零 p97、Set TR Dequeue Pointer 拒绝码 p126）。
- §4.9 TRB 环当时由另一代理在建（任务书告知「绝不碰」）；本节对 4.9 只读直链（index.html 在场、板块 index 已标已建），未向其目录写入任何文件。
- 能力位 BNC/LTC/GSC 未逐位展开（寄存器面归 §5.3.6/5.3.7 域）；Force Event 细节归规范第 8 章、Force Header 归 USB3 链路规范——页面均已如实标注「本板块未建/归第 7、8 章」。
- 无「待建」链接（全部直链目标已建），无需板块 index 兜底形态。

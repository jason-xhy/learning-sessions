# SECTION-BRIEF —— xhci-spec 第4章量产节作业指导书（子代理必读，2026-11-04 固化）

本文件是第4章量产节（4.5–4.25）的照抄即用作业书。主会话派发时给出「节号+呈现类型+特判项」，
其余按本文执行。**照抄可跑是硬标准**——任何与本文冲突的现场差异，停下来在报告里说明，不要自行发明。

## 0. 通用边界（每次派发都适用）

- 工作目录：`/Users/jason/ZCodeProject/usb-xhci-study`；只许新建/修改：自己节目录
  `lessons/xhci-spec/ch4/<dir>/`（build.mjs、EVIDENCE.md、shots/）。**禁止**：git commit/push、
  动 learning 仓、动板块 index.html/DESIGN.md/提案文档、动 scripts/、动 assets/、动
  _gen/、动其它节目录。目录名用主会话指定的（已按规范节名定好）。
- 判据优先级：xHCI 1.2b 规范原文 > 内核源码 > DESIGN.md。规范文本
  `/tmp/spec-audit-txt/xhci-1.2b.txt`（带 `===== [PAGE n] =====` 页标；丢失则
  `python3 scripts/xhci_spec_extract.py` 重产）。**禁止凭记忆写位号/字段值/章节号/页码**。
- 引文：blockquote 引英文原文短句（≤3 行），逐字取自提取文本、剔除 PDF 伪影
  （重复引用串/断行连字），尾注 `(xHCI 1.2b §x pNN)`；转述放解读侧不进引号。
  **PDF 断行**：引文原文在提取文本里可能断行——保留断行处空格按提取文本逐字。
- 语言：全中文行文；术语走 `lessons/xhci-spec/DESIGN.md` §3.1（规范词对照）+
  `notes/r4-glossary-base.md`；位域名/命令名/TRB 名保留英文官方名。
  **禁用退役词（语言门会咬）**：旅程/记账/契约/整桩/那支/本剧/游标/敲门铃/下钻/
  在飞/硬清/圈界/戏/两本账 等——机制课退役词族全避开；本板块豁免可用=
  回执/柜台（互链专名）/泳道（图表术语）。内层引号用「」。不写 AI 腔
  （让我们/值得注意的是/综上所述/大家）。
- 三方视角固定：xHCI 驱动 / xHC 控制器 / 设备（首用处注「规范原文称 system software
  （系统软件）」——节首 prose 第一段做）。流程不涉设备时设备泳道保留+如实注记
  「不参与——一句原因」，不删泳道、不硬凑戏份。

## 1. 泳道节（呈现=泳道/泳道＋表格）——用生成器

照抄两份成品之一改数据：`ch4/4.4-device-detach/build.mjs`、`ch4/4.7-doorbells/build.mjs`。
- 新建 `ch4/<dir>/build.mjs`：import `../_gen/lane_page.mjs` 的 `lanePage`，填 cfg
  （pageTitle/navTitle/specRef/prev/next/prose/quotes/figNo/figTitle/figCaption/
  tourNarr/steps/legend/linksHtml/footLine）。**steps 图元只许 box/arrow/note 三种**
  （box: at=sw|hc|dev + lines[]；arrow: from/to + lines + ev:true=虚线事件流 +
  thin:true=细线读操作；note: lanes + lines + dev:true=设备注记）。每步带 pg 页码角标 + narr 逐步解说。
- 双主题构建：`cd <dir> && node build.mjs && node build.mjs --light`。
- 泳道＋表格节：表格用 `.xsp-card` 内 `<table class="xsp-tb">`（4.4/4.7 无表格，
  样式已在生成器 CSS 里定义好 th/td/td.mono），表格卡放流程卡之后。

## 2. 验收门（全绿才算完；逐条跑，报告贴末行输出）

1. 页码机核：`python3 scripts/xhci_spec_pagecheck.py <页> <needle> ...` → PAGECHECK-PASS
   （needle 用节号/标题短词，**避 PDF 断行**：跨行处用断行后短 needle）。
2. 语言门：`python3 scripts/scan_words.py retired lessons/xhci-spec/ch4/<dir>/index.html`
   （study 根运行）→ 残留 family ⊆ {回执,柜台,泳道}；light 页同跑。
3. 交互冒烟（泳道节）：`python3 scripts/xhci_spec_lane_smoke.py lessons/xhci-spec/ch4/<dir> <steps 数>`
   → LANE-SMOKE-PASS（console=0 ×2 主题 + 截图自动落 shots/）。
   非 generator 节（状态图/表格）改跑：playwright channel="chrome" 手工冒烟
   （console=0 + zoombar 在场 + 截图 dark/light 全景 + 390px 宽一张）。
4. 自包含：`grep -c 'http://\|https://' index.html` ≤2 且命中全为 SVG xmlns。
5. 互链：页面所有相对链接目标存在（待建节链板块 index.html 并标「待建」）。
6. EVIDENCE.md：逐条断言→判据表 + 页码机核输出 + 门输出 + shots 清单 + 已知边界。

## 3. 产出报告格式

末尾给出：①节号与目录名 ②steps/表格/引文统计 ③各门末行输出 ④新增文件清单
⑤与 brief 的任何偏差及原因 ⑥坑（若有）。**不 commit、不 push、不动共享文件。**

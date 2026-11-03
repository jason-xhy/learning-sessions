# EVIDENCE.md —— §4.12 流（Streams）（2026-11-04，泳道节量产；骨架节系列之二）

## 逐条断言 → 判据

| 断言 | 判据 |
|---|---|
| §4.12 范围=p218–228（任务派单写 p218–229，现场核：§4.13 Device Notifications 起于 p229） | 提取文本 PAGE 229 标下首节=4.13（line 13102）；pagecheck `4.12`@p218、`ENT flag`@p228 全 PAGE-OK |
| 流给 SS Bulk 端点扩容传输环，上限 65533 条；SID 0、FFFEh=Prime、FFFFh=No Stream 保留 | §4.12 p218 首段（pagecheck `single Transfer Ring`@p218）+ 脚注 39（`65534 (Prime)`@p218）+ §4.12.2.1 Note（FFFFh NoStream/FFFEh Prime，p225）。**提取文本伪影**：「6553339」=「65533」+脚注标 39 合并——65536−3=65533 与 64K 环留末两项（p225）互证 |
| 端点上下文 TR Dequeue Pointer→主流数组；Stream ID 索引；流上下文各持 TR Dequeue Pointer→自己的传输环 | §4.12 p218 第 3–4 段（pagecheck `4.12`@p218） |
| 选流权在设备：设备定哪条流活跃（CStream）、可随时切流；xSPSM 协议由 xHC 与设备维护 | §4.12 p218 第 2/5 段（引文② `Stream is active at any time`@p218）+ §4.12.1 p219「Stream selection is driven by a USB device」 |
| 开流=Configure Endpoint 且 MaxPStreams>0 → xSPSM 进 Disabled；EP Context TR Dequeue Pointer→Primary Stream Array | §4.12.1 p220（`MaxPStreams`@p222 同页条文 + xSPSM Disabled 句 p220）+ §4.12.2 p223–224 |
| 去抖动旗标：IPPV（每 Idle 一次 Prime Pipe）、DBPV（补记非 Idle 期门铃）、LFCV（NRDY(Stream n) 流控禁主动搬数）、DSICV（可选捕获 DB Stream ID） | §4.12.1 p220–221（pagecheck `IPPV`@p220、`DBPV`@p222、`LFCV`/`DSICV`@p221；p221 门铃算法 HID 两分支） |
| HID=1 禁主机主导 Idle→Move Data；xHC 可因内部资源限制按 HID=1 运行 | §4.12.1.1 p223（`4.12.1.1`@p223）+ p222 Note（`HID`@p221 算法页） |
| Prime Pipe=告知设备宿主缓冲已修改/新增；首铃 Disabled→Prime Pipe→设备转 Idle | §4.12.1 p220（`Prime Pipe state`@p220 两处） |
| 层级数组：主流数组 2^(MaxPStreams+1) 项；SID 拆低位 PSID+高位 SSID；SSID=0→传输环（SCT=1）、非 0→辅流数组 | §4.12.2 p223–224（`Figure 4-20`@p224、`Secondary Stream ID`@p224）。2^(MaxPStreams+1) 系上标伪影还原：Figure 4-20 例 MaxPStreams=3→主数组 16 项（Context 0..15）、辅流模式上限 MaxPStreams=7→256 项，双双吻合 2^(n+1) |
| 数组上限：辅流模式主数组 256 项（MaxPStreams=7）；Linear 模式 64K 项；MaxPStreams ≤ 描述符 MaxStreams；实现上限=HCCPARAMS1.MaxPSASize、辅流支持=NSS | §4.12.2 p224–225 + §4.12.2.1 p225（`MaxStreams`@p223、`Stream Array bounds checking`@p225） |
| SCT 语义：主数组 SCT=1→传输环、SCT=2–7→辅流数组；辅数组 SCT=0→传输环；辅流启用时主流 0 号项必须 SCT>1（SCT=0/1 未定义行为） | §4.12.2 p224 例 + p225 Note + §4.12.2.1 p226–227 分支（`Invalid Stream Type Error`@p226） |
| 越界检查强制：SID=0 或 ≥ 主数组大小→Invalid Stream ID Error+停端点；SCT 不符→Invalid Stream Type Error+停端点；Set TR Dequeue Pointer 越界→完成码 TRB Error；TR Dequeue Ptr=0 特例（空环拒 NoStream / SSA 报错） | §4.12.2.1 p225–227（引文④ `doesn’t have access to`@p225、`Invalid Stream ID Error`@p226） |
| 共享管道：CStream 停转（Stall）全体流停；无归因 TRB 的事件 TRB Pointer/Length=0、走 Slot Context Interrupter Target | §4.12 p218–219（共享管道段）+ p222 Note（HISPSM/HOSPSM 错误事件句） |
| active 判定无 xHCI 方法，归 Device Class；UASP 例：门铃后 active、命令完成/Abort Task 后 non-active；Stopped 后 CStream 不暴露、非空环只能带外判 | §4.12 p219（引文③ `There is no xHCI`@p219 + UASP 段 + Note 段） |
| ENT：存流状态前查末 TRB 的 ENT，置位则先执行后随 Event Data TRB 再存；软件必须在 TD 末 Event Data TRB 前的传输 TRB 置 ENT；ENT 只在 CH=1 有效、可跨 Link TRB | §4.12.3 p227–228（引文⑤ `ENT flag`@p228、`Evaluate Next TRB`@p227） |
| 停止/撤流入口：Stop Endpoint 影响见 §3.3.8、Set TR Dequeue Pointer 见 §4.6.10 | §4.12.1 尾段 p223（`Stream ID Management`@p223 同页交叉引用句） |
| xSPSM 状态清单（Disabled/Idle/Prime Pipe/Start Stream/Move Data） | Figure 4-19 p220 状态名逐字（提取文本 line 12603–12610） |

## 门输出

1. 页码机核：26 needle 全 PAGE-OK → `PAGECHECK-PASS`（p218–228，引文/节号/字段名/错误码逐条配对）。
2. 语言门：dark/light 各 `total=6 {'回执': 4, '泳道': 2}`——残留 family ⊆ 豁免集{回执,柜台,泳道}，PASS。
3. 交互冒烟：`[dark] PASS console=0` / `[light] PASS console=0` → `LANE-SMOKE-PASS`（10 步，narr='3/10 · …'）。
4. 自包含：`grep -c 'http://\|https://'`=2（dark/light 同），命中全为 `http://www.w3.org/2000/svg` xmlns → PASS。
5. 互链：页内相对链接目标全部存在（唯一缺项=EVIDENCE.md 本文件，写入后即齐）→ MISSING=0。

## shots 清单

lane_smoke 自动落 6 张（≥1280 宽）：shots/lane-overview-dark.png、shots/lane-step2-dark.png、shots/lane-step-end-dark.png（light 三张同名 -light）。视觉抽检另落 2 张总览全亮图：shots/check-top-dark.png、shots/check-top-light.png（S1–S10 全图，用于框宽/箭头/图例目检）。

## 骨架范围声明

**本页为流程骨架版**：三方泳道 10 步主线 + 流协议要点表 + 3 段 prose + 5 条引文。按分级裁定，**本节 anatomy 机器形态留后续会话**——xSPSM 状态机全图（Figure 4-19 逐转移）、越界检查逐分支判定树（p225–227）、门铃算法完整分支（p221）留机器页做位级展开；页内已在 prose 第 3 段以〔注记〕如实标注。

## 已知边界

- 提取文本「6553339」为上标脚注合并伪影，页内取 65533（判据见断言表第 2 行）。
- 「2^MaxPStreams+1」同因上标丢失，按 Figure 4-20 实例（MaxPStreams=3→16 项；=7→256 项）还原为 2^(MaxPStreams+1)。
- LCStream 本板块不展开（USB3 规范 §8.12.1.4.1 定义，页内只作名词引用）。
- 引文④含 U+2019 撇号（doesn’t），按提取文本逐字保留。
- **步骤 7 用 dev 注记而非 dev→hc 箭头**：生成器 defs 只登记了 sw/hc 四种 marker，dev 源箭头会渲染成无头线（4.3/4.4/4.13 的 dev 源箭头同此缺口，非本节独有）——本节按「数据件不发明新图元」纪律改用 dev:true 注记承载设备流控信息；待 lane_page.mjs 补 dev marker 后可改回箭头。
- **步骤 6 设备框显式 w=230**：dev 泳道 x=1120、SVG 宽 1240，默认 340 框宽右溢 50px 被裁——dev 泳道放 box 必须显式给窄宽（本节首版实裁，改 w 后目检过）。
- **生成器 token 缺口（建议主会话修 _gen/）**：lane_page.mjs 框/令牌/激活条填色引用 `var(--anatomy-shade2, #20242c)`（无连字符），而 kit 只定义 `--anatomy-shade-2`（light=#ededea/dark=#151515）——全泳道节 light 主题 box 实际回退深底 #20242c、文字 #57575a（对比度约 2.2）；dark 主题回退值恰近色未暴露。一行 token 修正（shade2→shade-2）惠及全部量产节，本节不改、与既有节保持同观感。
- 首行文字与右上 pg 角标存在约 2px 基线带接触——生成器 boxSvg 固定几何，4.4/4.7/4.10/4.16 同形态，非本节新缺陷。

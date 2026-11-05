# EVIDENCE.md —— §4.14 传输环管理（2026-11-04，anatomy 机器版「调度轮转台」）

判据源：xHCI 1.2b（Document Number 625472, Revision 1.2b）§4.14 p232–251（§4.15 起于 p252）。
规范提取文本 `/tmp/spec-audit-txt/xhci-1.2b.txt`；PDF 本体 `specs/625472_xHCI_Rev1_2b.pdf`。
生成于 2026-11-04。构建：`node build.mjs`（dark→index.html）/ `node build.mjs --light`（→index-light.html），
页宽 1500，自包含。本文件取代同日泳道骨架版（骨架原件在 `backup-20261104/`，sha256 见该目录 SHA256SUMS.txt）。

## 0. 机器概况与主题名

- **机器**：「调度轮转台」——一张带微帧节拍标尺与两张调度表的轮转台。左文书台（xHCI 驱动）：描述符/TD 卡堆 +
  端点门铃 + 事件匣；中总控台（xHC）：台顶三件——微帧标尺条（32 刻度，MIT=125µs，每 8 格 Isoch ESIT 高标、
  每 16 格 Interrupt ESIT 双高标）+ 节拍读线、周期表卡架（Isoch/Interrupt 端点卡 + Active/SO 灯）、异步轮转盘
  （中心立柱 + 指针横臂点名三卡座：Bulk/Control/空位 + 各座 Active 灯 + 「下一个」标记）；立面 MFINDEX 窗
  （Frame/µFrame 分区刻字）+ SO 计数窗（MSOPC/SOPC）+ 周期带宽列；台顶前条 NRDY/ERDY/连续流三灯；台基平刻
  两张调度表题词与两张注记框（环空摘出/连续流打断，live 显隐）；右试验盒（设备）：三端点收发窗
  （Isoch IN/Intr IN/Bulk OUT）+ 教学锚长铭牌；三线：门铃拉线（台→收铃口）、总线缆（USB 事务票据行走）、
  事件回流管（事件出口→事件匣）。
- **主题名**：沿用任务派单建议「调度轮转台」——「轮转」不在机制课退役词族（retired_baseline 与 scan_words
  RETIRED_WORDS 均无此词），对应规范强制的 round-robin 轮转调度（p245）；「调度」为规范语义直译。机器隐喻词
  使用面：总控台/文书台/试验盒/铭牌/标尺条/计数窗/卡架/卡座/端点/灯排/就绪灯/事件匣/票据/拉线/收件口（收铃口）
  ——均属 DESIGN §3.2 清单（含追认）或规范术语字面；「轮转盘/立柱/横臂/读线/卡堆」为机器实件名非隐喻。
- **演示样例（示例值登记）**：SS 总线四端点——EP1 IN Isoch：Interval 3→ESIT=2^3×125µs=1ms、MaxBurst 3、
  Mult 1→MSOPC=(3+1)(1+1)=8、wBytesPerInterval 8192B（SS Isoch 上限 48KB 内）；EP2 IN Interrupt：Interval 4→
  ESIT 2ms、MSOPC 1、wBytesPerInterval 1024B；EP3 OUT Bulk：MaxBurst 7→MSOPC 8、Max Service Transfer Size=
  1024×8=8192B；EP0 Control：MPS 512；IST=2 µF（HCSPARAMS2，规范自举例 p242）。周期预留合计 8.7 MB/s=
  8192/0.001 + 1024/0.002（p236 公式代入）。
- **帧数 11**（F0–F10），DUR [3200,4200,4600,6600,6600,7200,4600,6900,6900,6600,3000] ms，巡游驻留 5.5s；
  **audit items 108**（82 solids · 3 tubes），预算 40–113 内。
- 读数（卡右下，与帧模型同源）：`步 n/10 · µFrame <0-7|—> · 轮转 <Bulk|Control|—> · Active n/4`。

## 1. 页码机核（pypdf needle，全部现场跑）

`python3 scripts/xhci_spec_pagecheck.py 232 "4.14 Managing Transfer Rings" 232 "considered Active when it is on"
233 "General Scheduling Model" 233 "two Pipe Schedules per Bus" 233 "Max Service Opportunity Packet Count"
234 "Average TRB Length" 235 "Periodic Transfer Ring Scheduling" 235 "Microframe Index Register"
236 "Max ESIT Payload in Bytes" 236 "Reserved Bandwidth in MBytes/s" 236 "90% of any frame"
237 "Isochronous Transfer Ring Scheduling" 237 "process one Isoch TD" 238 "Overrun or Ring Underrun"
242 "Isochronous Scheduling Threshold" 243 "Interrupt Transfer Ring Scheduling" 243 "equal to IST + ESIT"
244 "indefinitely for a ERDY" 245 "Asynchronous Transfer Ring Scheduling" 245 "round-robin"
246 "continuously stream packets" 251 "TD Residue" 251 "wait for an ERDY" 252 "4.15 Suspend-Resume"`
→ **27/27 PAGE-OK，PAGECHECK-PASS**（页头 specRef p232–251 与四小节起始页以此为据；骨架版坑 1「公式块页码
须单独 needle 实证」本轮全部单独核过）。

## 2. 机器画面断言 → 判据（每个可见事实）

### 三方工位与铭牌
| 断言（画面） | 判据 |
|---|---|
| 文书台铭牌「xHCI 驱动／规范称 system software」 | 契约 §1.7；p232 "system software shall translate" |
| 总控台铭牌「xHC 控制器 · 两张调度表 · 帧微帧节拍」 | §4.14.1 p233 两张 Pipe Schedule；§4.14.2 p235 MFINDEX/MIT |
| 台基题词「周期表 · Isoch+Interrupt（p233）· 每 ESIT 一个 SO」「异步表 · Control+Bulk · round-robin（p245–246）」 | p233 引文②；p243 "single SO per ESIT"；p245 引文⑤；p246 "one Service Opportunity per pass" |
| 试验盒铭「USB 设备 · 三类端点」+ 教学锚「调度全在主机侧／设备只见 USB 事务——调度表·SO·ESIT·IST 是 xHC 内部概念」 | 设备侧只经 USB 事务参与（p243–245 Table 4-8/4-9 Endpoint Response 列语境）；NRDY/ERDY 流控票据走总线缆（p244） |

### 帧序断言（11 帧）
| 帧 | 画面断言 | 判据 |
|---|---|---|
| F0 | 全景，读数「步 0/10 · µFrame — · 轮转 — · Active 0/4」；窗显「—」；端点卡全部隐藏 | 未写门铃=不在表（Inactive，p232） |
| F1 | 翻译挂环：Endpoint Context 表格卡（四端点字段+IST=2µF）常驻；三条环各挂 2 张 TD 卡 | p232 "translate the device Endpoint Descriptor … into the appropriate Endpoint Context Interval, Max Packet Size, Max Burst Size, and Mult values"；TD=不连续缓冲拼连续数据（p232）；IST 自举例 p242 |
| F2 | 门铃：按铃→铃票据沿拉线→四张端点卡落位（Isoch/Interrupt 上周期卡架、Bulk/Control 入轮转盘卡座）→Active 灯 4/4 | p232 引文①（Running 态写门铃激活入表）；p233 引文②（周期/异步两张表） |
| F3 | SO 与包计数：MFINDEX 窗起跳（Frame 0x0300→0x0300·µFrame 4）＋读线滑到第 4 格；轮转指针点名 Bulk 卡座（服务灯亮）；SO 计数窗「Bulk · MSOPC 8 · SOPC 8→0」；Bulk OUT 票据沿总线缆到设备（DP ×8）；TD1 翻「已取」 | p233 SO 定义（搬包时间块）、MSOPC=(MaxBurst+1)(Mult+1)、SOPC 起点初始化逐事务递减、归零换端点；1–3 USB 事务/SO；p245 MSTrS=1024×(7+1)=8192B ≥ TD → 一个 SO 搬完 |
| F4 | 周期节拍：读线跨第 8 格（ESIT 高标）→Isoch SO 灯亮→取一枚 Isoch TD（TD1 翻已取）→8KB/ESIT 数据票据设备→主机；SO 计数窗「Isoch · SOPC=min(TDPC,MSOPC)」 | p235 引文同节 ESIT=2^Interval×125µs 对齐 MIT 边界；p237 引文③（每 ESIT 恰一枚 Isoch TD）；p237 "SOPC is set to the smaller of TDPC or MSOPC"；MFINDEX 窗分区刻字 Frame Index 13:3 ∣ µFrame Index 2:0（Figure 4-21 p237） |
| F5 | 环空与再入表：读线跨 16 取第二枚 TD；跨 24 环空→Ring Overrun 事件卡沿回流管入事件匣→Isoch 卡摘出周期表（Active 0/4 一拍）→注记框①显三行→再按门铃→Isoch 卡放回（Active 4/4）、TD 重挂 | p238 IN 环空=Ring Overrun / OUT=Underrun→摘出周期表；再写门铃放回；p238 TD 超 Max ESIT Payload→Bandwidth Overrun·截断推进·管道保持 Active |
| F6 | IST 领先量：Isoch 环前「≥IST 领先」括弧点亮（取卡位/挂卡位最小间距）；读线缓进到第 31 格 | p242 引文④（挂 TRB 最小领先量）；bit[3]=0 微帧单位/读 MFINDEX 恒加 1 微帧/部分成形 TD=未定义行为（注记在图例键与表格卡） |
| F7 | 中断端点：读线跨 32（Interrupt ESIT 双高标）→SO 灯亮→Interrupt TD 显「跨 ESIT」态→设备 NRDY 票据→NRDY 灯亮→等→ERDY 票据→ERDY 灯亮→数据票据；设备窗「NRDY→ERDY」 | p243 "single SO per ESIT"、TD 可超 Max ESIT Payload 跨多 ESIT、空闲后首笔 ≤IST+ESIT（表格卡）；p244 NRDY→无限期等 ERDY、超时归软件、ERDY→IN ≤2×ESIT |
| F8 | 异步轮转：指针转 Control 卡座（SO 计数「Control · MSOPC 1 · SOPC 1→0」+ Control 票据）→读线跨 40（周期打断）→「下一个」标记指 Bulk 卡座→恢复→指针回 Bulk（SOPC 8→0）→Bulk TD2 翻已取 | p245 引文⑤ round-robin；p245 "retain an identifier for the next Async Pipe"（被打断记住下一个）；p246 每过一遍表一个 SO；p246 控制 Stage=独立 Async TD（卡面「Stage=TD」） |
| F9 | 连续流与打断：Control 卡离座（Active 3/4）→只剩 Bulk→连续流灯亮→SO 计数「SOPC 12（>MSOPC 连续流）」→票据连发→再门铃→Control 卡回座（4/4）→连续流灯灭→SOPC 回 8→注记框②显（含 SS Deferred 行） | p246 "continuously stream packets"（单端点可超 MSOPC）；p246 "interrupt a continuous stream when a second endpoint is scheduled"；p251 Deferred→流控标记·等 ERDY 回 Pipe Schedule |
| F10 | 读数巡回：注记框收起、SOPC 窗归「—」、指针回 Bulk 座；读数回「步 10/10 · µFrame 5 · Active 4/4」 | 收尾帧；各端点保持 Active（环上仍有 TD） |

### 常驻机构
| 断言 | 判据 |
|---|---|
| MFINDEX 窗分区刻字「Frame Index 13:3 ∣ µFrame Index 2:0」 | Figure 4-21 p237（MFINDEX 寄存器分区） |
| 微帧标尺 32 格 + 每 8 格高标（Isoch ESIT 1ms=Interval 3）+ 每 16 格双高标（Interrupt ESIT 2ms=Interval 4） | p235 ESIT 公式；p238 ESIT 边界=MFINDEX 低位翻 0 |
| 周期带宽列「预留合计 8.7 MB/s（公式 p236）· SS/FS ≤90% 帧 · HS ≤80% 微帧 · 剩余带宽归异步（Best Effort）」 | p236 Reserved Bandwidth 公式代入样例值；p236 90%/80% 句；p234 异步用剩余带宽 |
| SO 计数窗题「SO 计数 · MSOPC=(MaxBurst+1)(Mult+1)」+ 空态副行「SO=搬包时间块 · 1–3 USB 事务/SO」 | p233 |
| 轮转盘卡座「空位 …」 | 不断言卡座数=异步端点数（表上端点数随配置变） |
| 「下一个」三角标（F8 显） | p245 retain an identifier |

### 泳道总览卡（静态）断言
10 步框与页码角标 p232–251 逐条同上判据；设备泳道注记框（只见 USB 事务/NRDY 流控超时归软件）同设备铭牌判据。

### 原文对照五条（正文 blockquote）
英文短句逐字取自提取文本 p232/p233/p237/p242/p245（骨架版已逐字核对，本轮沿用；含 U+2019 撇号按提取文本保留）；
每条尾注 `(xHCI 1.2b §4.14[.1/.2.1/.2.1.4/.4] pNN)` 与 §1 机核对应。

## 3. 泳道去留决定

**保留为静态总览次卡，步进模式退役（机器接管）。** 照抄 4.12 先例，理由：
1. DESIGN §4 页面模板要求「流程图卡 + 动画卡」双卡形态；
2. 骨架页单卡双模式中的步进动画与机器 11 帧重合度高——保留会双份步进交互；总览形态（一屏十步全局）
   是机器逐帧视图给不了的教学视角，保留；
3. 逐速度细则（§4.14.2.1.1–.3 HS Multiplier/SS Mult/Delta Time 等）与 Table 4-8/4-9 逐行 Pipe Action
   在泳道第 5/6 步与两张表格卡保留文字位，机器不逐帧展开（帧数预算）。
实现：泳道卡由 lane_page 生成器改为本 build.mjs 内静态 SVG（同 4.12 laneSvg 形态，三方配色 §3.3 内联）；
lane_smoke 门对本页不再适用（等价替代＝ctl 探针 + 帧序 drive + 遮挡探针三件）。

## 4. 验收门结果（2026-11-04，全绿；命令形态照 4.12 门表）

| 门 | 命令 | 结果 |
|---|---|---|
| audit | `node build.mjs --audit` / `--light --audit` | 双主题 `audit passed`（108 items · 82 solids · 3 tubes；clearance/terminals/support/depth/crowding/stand-in 全 0；3 tubes=门铃拉线/总线缆/事件管，端环 rim 落端口凸台面过 terminals） |
| lines | `anatomy scripts/lines.mjs index[.html/-light.html] --select '.fig-wrap .iso-plate'` | 双主题 `line ends: 0 of 198 ends on 91 lines float` · console clean |
| 遮挡探针 | `python3 scripts/xhci_spec_occlusion_probe.py index[.html/-light.html] --frames 11 --dwell-ms 8000` | 双主题 `OCCLUSION-PASS`（0 命中×11 帧×2 主题） |
| 文字墨迹交叠（本轮新增自查） | drive eval：全 text getBBox+getScreenCTM 四角 SAT 求交 | `ink-overlaps=0`（立面重排三轮：40→13→5→0；工具脚本 ~/.cache/zcode-tmp/inkaudit414.json 一次性，登记见 §9） |
| 控制条探针 | `python3 scripts/xhci_spec_ctl_probe.py <abs>/index[.html/-light.html] fig42` | 双主题 `CTL-PROBE-PASS`（四钮实驱；帧计数取 `window.__fig414.frameOf()`——本页暴露 `__fig414` 主名 + `__fig42` 兼容别名，见 §6 坑 2） |
| 页码机核 | §1 命令 | `PAGECHECK-PASS`（27/27） |
| 语言门 | `python3 scripts/scan_words.py retired index.html / index-light.html`（study 根） | 双主题 `total=13 {'回执': 7, '泳道': 6}`——残留 family ⊆ 豁免表{回执,柜台,泳道}，PASS（回执=§3.2 隐喻词；泳道=泳道图卡图表术语；「对账」「轮次员」等词族零命中——主题名「调度轮转台」自查通过） |
| 交互冒烟 | lane_smoke 不适用（非 generator 页）——等价替代＝ctl 探针 + 帧序 drive + 遮挡探针三件 | ctl PASS ×2 + 帧序真值 11/11 + 遮挡 PASS ×2 |
| 帧序真值 | `drive.mjs index.html --actions steps-frames.json`（首步 scroll 到机器舞台） | 11 帧逐帧正确：F0 Active 0/4 · F1 tdVis=6 · F2 eps=4 act=4 · F3 SOPC 8→0+bulkDone+devBulk=DP ×8 · F4 Frame 0x0301·µFrame 2+isoDone+8KB/ESIT · F5 errNote+trayEv=1+actiso · F6 istLit+rehung=6 · F7 跨 ESIT+erdy=true·nrdy=false+NRDY→ERDY · F8 bulk1Done+SOPC 0 · F9 defNote+cont=false+actctrl+SOPC 8 · F10 notesOff；console clean |
| console | 全部截图 capture/drive 输出 | 每张 console: clean |
| 自包含 | `grep -c 'http://\|https://'` | 双页 3，命中全为 `http://www.w3.org/2000/svg` xmlns → PASS |
| 互链 | 相对链接 realpath 存在性 | 11 链接 ×2 页 missing=[]（4.7/4.8/4.9/4.10/4.16/4.17 各节 index.html + fig3 机器 + 板块 index + EVIDENCE.md；待建节链板块目录并标「待建」） |

## 5. 字号台阶（DESIGN §1.8 修订口径）

等效 px = 世界字号 × KS 1.865 × 页内显示比（1408/920 ≈ 1.53）≈ **世界字号 × 2.854**。

- 主层：工位铭牌主行 9（≈25.7px）/副行 5.2（≈14.8）；MFINDEX 数值 4.6（≈13.1）、SO 计数主行 4.6、
  台顶题「xHC 控制器」9、端点上下文卡题 4.4（≈12.6）、周期卡架端点卡题 3.3（≈9.4——细节层边缘，下方登记）、
  带宽列首行 3.6（≈10.3）、教学锚首行 6.2（≈17.7）、环铭 4.2（≈12）、台基调度表题词 2.8（≈8.0，细节层）。
- **细节层清单**（次级刻字，1× ≥7px 等效、3.2× 档充裕）：周期卡架端点卡行字 2.7（≈7.7）、轮转盘卡面
  题/行 2.9/2.2（≈8.3/6.3——2.2 世界=6.3px 略低于 7px 线，登记为超细层，zoomfs 3.2× 档 20px 可读）、
  TD 卡内字 4.6/2.8、EPP 表格卡行 2.9、微帧标尺图例 3.6/3.2、窗沿小字 3.0–3.4、台基注记框 2.8/2.6、
  灯标签 3.4–3.8、票据两行 3.8、设备窗值 4.6、NRDY 注 3.4、下一标 3.2。
- 正文 16.5px、泳道框字 16px@1×、机器卡注释走 plateHtml 图例（五键）。

## 6. 施工坑（本轮实测）

1. **读图通道半通**：PNG 直传 analyze_image 400（4.12 坑 1 持续）；**sips 转 jpeg（50–60 品质）后通道恢复**——
   两张特写+一张整机共三轮视觉复核成行（DESIGN §7 修订行提过「sips 重编码可救部分」，本轮实锤可救）。
   视觉轮抓到立面长行真交叠（公式行/流控行越窗框），机检三证之外补了文字墨迹 SAT 求交（见门表新行）。
2. **板块探针 API 白名单**：occlusion/ctl 只认 `__fig42/__fig43`——live 末行 `window.__fig42 = window.__fig414`
   过门（照抄 4.12 坑 2）；ctl_probe 需**绝对路径**（相对路径报 ERR_FILE_NOT_FOUND）。
3. **drive eval 要纯表达式** + 首步 `["scroll", ".fig-wrap .iso-stage"]`（IntersectionObserver 不触发=机器不动）；
   另：live 里引用 build 侧的 f2 会 ReferenceError——live 自带 Math.round 截断。
4. **A.disc/G.disc=圆柱凸台**（4.12 坑 4 沿用）；事件管第二点必须正上方（起点 rim 才落 stub 端面过 terminals），
   斜向出管会报 "end not on a mount"。
5. **同一 item 内实体深度方向相反→深度环**：轮转盘中心立柱（高分柱体）与后卡座/端点卡遮挡方向和盘体相反，
   与盘体/指针臂同 item 会引 7 处 cycle——立柱、指针臂各拆独立深度项后清零；指针臂棱柱下沿须**恰坐**柱顶
   （flush），重叠 0.7 即又成环。
6. **kit lines 的「短刻线」豁免线=7px**：微帧标尺 ESIT 双高标 4.6 世界≈7.6px 超 7px 被当普通线双端严检
   （内端悬空 FAIL）；缩到 4.0 世界≈6.6px 回归刻线类（一端生根即过）。刻线外端必须**正落**条体边沿描边
   （y+0.6 偏移 0.6 世界即超容差）。
7. **iso 密排文字的屏幕带交叠**：立面多列文字与环名铭/环架面板行在屏幕上是同斜率平行带，肉眼版式不可靠——
   最终用「getBBox+getScreenCTM 四角 SAT 求交」浏览器实测驱动重排（40→0）；getBoundingClientRect 对
   SVG 矩阵文本框虚高不可用。处置：带宽列独占立面右侧、IST/SO 常识撤入窗题与图例键、两张调度表题词
   平刻台基、注记牌改台面平刻框（立牌会盖立面文字）。
8. **live 子集 G 缺 solidOf**：latheScript 返回表须补 `solidOf`（4.12 子集没有，指针灯罩用到了）。
9. **帧末 snapshot 要带派生态**：设备三窗标志（devIso/devIntr/devBulk）只在 applyAll 里派生、snapshot 漏带
   → 帧动画结束一拍被重置回「—」；snapshot 内按 f.step 派生补齐。

## 7. zoomfs 登记

- 三件套：`zoomBarHtml()` ×2 + `zoomFsCss()`（一次）+ `zoomFsScript()` 两实例 scoped（构建期
  querySelector→querySelectorAll[0/1]；第二实例 window 名 `__zfs`、泳道卡 `__zfsLane`——照抄 4.2/4.12 双实例补丁形态）。
- focus 选择器：泳道卡（stage 0）`["#lane-svg"]`；机器卡（stage 1）
  `['[data-name="dial.disc"]', '[data-name="con.body"]']`（常驻实体，规避 data-part 空组聚焦塌陷坑）。

## 8. shots 清单（2026-11-04 终版重拍，console 全 clean）

machine-dark/light（F0 全景，2836 宽）、frame-01..10-dark（读数逐帧正确，见 §4 帧序真值）、
frame-04-esit-light / frame-08-roundrobin-light（亮主题代表帧）、lane-dark/light、page-dark/light
（1440×6067 全页）、phone-dark-390（390×9616）、phone-machine-390（358 宽机器卡）、reduced-dark
（prefers-reduced-motion）、z-dial-dark/light（轮转盘特写 @4×）、z-periodic-dark/light（周期卡架+微帧标尺
特写 @4×）、z-console-dark（立面窗组特写 @4×）、z-rings-dark（环架+事件匣特写 @4×）、lines-dark/light
（线端环形图）。工作脚本：steps-frames.json（帧序真值）、steps-shots.json / steps-shots-light.json（截图驱动）。

## 9. 已知边界

- 视觉像素级目检本轮经 jpeg 转码通道完成三轮（立面特写/轮转盘特写/整机），机检侧另有遮挡 0 命中+墨迹 SAT 0+
  audit/lines 0 四证；PNG 直传通道仍 400（恢复方法见 §6 坑 1）。
- `__fig42` 别名与 4.2 页同名——两页互不加载无冲突；主会话在两探针登记 fig414 后可移除别名。
- 轮转盘卡面行字 2.2 世界（≈6.3px@1×）为超细层（zoomfs 3.2× 档 20px 可读）——比 §1.8 细节层 7px 线低 0.7px，
  已在 §5 登记；卡宽 15 由卡座间距决定，再放字需改卡座布局。
- 演示样例值（Interval/MaxBurst/Mult/wBytesPerInterval/IST=2）均为公式合法代入或规范自举例，非规范规定值
  （§0 登记）；Max Allowed ESIT Payload 上限表与 Reserved Bandwidth 公式在表格卡，机器画面只显代入结果。
- 帧动画中的微帧推进为分段 cue 驱动（每帧推进若干格），非实时 125µs 时钟——教学节奏优先，窗内数字与读线
  位置始终同源（µT 计数）。
- 文字墨迹 SAT 求交脚本为一次性探索（~/.cache/zcode-tmp/inkaudit414.json+drive），未沉淀为板块脚本——
  建议主会话评估纳入 scripts/（对全部机器页通用；判定纯机械：SAT 求交+阈值，见「遗留」）。

## §10 文字遮挡修复轮（2026-11-05，板块级 occlusion 探针清零）

探针：`scripts/xhci_spec_occlusion_probe.py`（默认 8 帧 dwell 5000ms）。本节基线 **11 处**
（主会话 2026-11-05 跑，~/.cache/zcode-tmp/occ_414.json）→ 终值 **OCCLUSION-PASS（0 处）**
（终版构件复跑，exit 0）。

### 10.1 逐 finding 处置表（手法：刻字绘制序后移 + labels 层后置 + 票据两遍渲染）

| 被盖文字（帧） | 遮挡者 | 手法 |
|---|---|---|
| 「TD」×6 卡（F1–F4） | con.lid / con.body（TD item 32–53 排在两大件 58/61 之前；控制台立面 bbox 罩住环床文字区） | tdCardSvg 拆 tdCardBodySvg/tdCardTextSvg：卡体留 item 深度序，刻字入 labels 尾层（`data-tdtext` 六组，live 与 `data-td` 同步重建/显隐） |
| 「✓」「已取」（F3/F4 已取卡） | con.body / con.lid | 同上 |
| 「跨 ESIT」（F7 td.intr.0） | wire.bell:8（拉线分段 item 50 在卡后） | 同上 |
| 「EP2 Intr IN」「Int 4 · MSOPC 1」「TD 跨 ESIT」（F2 起 epc.intr） | prack.wallE（卡架东墙 item 77 紧随卡 76） | epCardSvg 拆体/字：刻字入 labels（`data-eptext` 四组） |
| 「MPS 512」「Stage=TD」（F2 起 epc.ctrl 轮转盘座） | dial.hubcol（中心柱 89） | 同上 |
| 「描述符与 TD 卡堆」（F5） | actors-events（事件卡飞越文书台上空盖 labels 文字） | labels 层整体移到 actors 之后（labels 内只有线与文字，后置不构成遮挡者） |
| 「Intr 流控」（F7，NRDY 票） | 同层另一票据卡体（NRDY+ERDY 同层时后票盖前票字） | 票据/事件卡两遍渲染：全部卡体入 actors 层、全部刻字入 `actor-texts` 尾层（tokenBody/Text、eventBody/Text 拆分） |

基线另有 F3 「N/ENT/ED」grp=actors-tokens 三条为前版 DOM 残影（本节票面无此三字），终跑零
出现佐证。

### 10.2 机器读数回归（语义零变对表）

FRAMES/snapshot/cues 逐行零触碰；双主题 × 11 帧逐帧驱动实测（gate 报告
~/.cache/zcode-tmp/gate23_report.json）：stateOf 逐帧与 FRAMES 真值全等（F3 serving=bulk/
mf=4/Active 4/4 → F9 serving=bulk/mf=53 → F10 serving=null/mf=53），灯牌逐帧全等（F3「步
3/10 · µFrame 4 · 轮转 Bulk · Active 4/4」…F10「步 10/10 · µFrame 5 · 轮转 — · Active
4/4」），`data-td`/`data-tdtext`、`data-ep`/`data-eptext` 逐帧 display 全等，console/
pageerror 双主题 11 帧 0。

### 10.3 门与产物

- occlusion 探针（默认参数，终版构件复跑）：`OCCLUSION-PASS`（exit 0）；
- scan_words retired：{回执:4, 泳道:6} ⊆ 允许集（首轮曾命中「同框」1——我在 geometry-live
  注释里写的词被源码内联进页面，改「同层」后清零：**内联源码的注释也过语言门**）；
- shots 新增：occ-fix-dark.png（F3 全景）+ occ-fix-rings-zoom.png（环架特写——TD 六卡与
  端点卡刻字全部可读；窗文与台顶铭牌的并读观感为预存相对序，层内文字顺序未变）。

### 10.4 坑实录

- **显隐循环 cache 顺序 bug（门 3 抓获）**：拆组同步显隐写成「body 分支先更新 dispCache、
  text 分支再拿同一 cache 比较」→ 条件永假，刻字组全程 display:none（探针因文字不可见而
  假 PASS）。正解：一个 changed 分支内同时落 body/text 两组成员。教训：**拆组改动必须配
  「两组逐帧 display 全等」断言**（已入 gate23 采集脚本）。
- settle 约束求解把 con.body/con.lid（真实屏叠对：控制台立面确实在环卡之前的视线带上）排在
  TD 卡之后是既证序——不可 bias 反转；文字层置尾才是与探针 bbox 语义相容的解。

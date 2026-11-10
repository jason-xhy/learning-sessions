# S4-build-输出 —— V3 实现清单 / 门结果表 / DSL 忠实度自查表 / 工具通用化台账 / 遗留

产出：2026-11-10 ｜ S4 worker ｜ 对象：`index.html`（单文件自包含）+ `src/`（V3 DSL 驱动引擎）+ `pipeline/tools/`（通用化门工具）
上游：`pipeline/scene.dsl.json`（唯一事实源，只读未改）· S4-需求.md · S4-设计.md。

---

## 1. 实现清单

### 1.1 构建链（build.mjs 重构）
- DSL 注入：构建期读 `pipeline/scene.dsl.json` → `const X43_DSL = {...}` 首段注入；产物字节级可重复（无时间戳）。
- 构建期 DSL 机检：结构计数（38 实体/17 机位/12 工段/36 参数/19 标签/3 环/12 纹理卡/34 derived/材质 pbr12+flat36）+ 全量 `derived:` 引用可解析（含尾随批注形态 `derived:d06（…）`）+ 引用边（材质/机位/参数/标签 host）任一缺失即构建 FAIL。
- three.js 内联变换承 V2（唯一 export{…}→const THREE；REQUIRED 31 符号断言，V3 新增 FogExp2/CurvePath/LineCurve3/Box3/Raycaster）；`node --check` 语法自检。

### 1.2 src/ 六件（全量重写为 DSL 消费形态）
| 件 | 行数约 | 职责 |
|---|---|---|
| `engine.js` | ~230 | X43D：derived 引用解析（`derived:dXX(.path)`，不可解析即 throw=禁发明缺省值）/ 实体几何归一（bbox/pos+size 两形态+zCenter 变体走 d18 板厚）/ 材质工厂（pbr 区间中值+flat 直色+d32 归属展开；**S6 注入口=材质 userData.texRequest→textureRequests id**；null 区间程序化缺省）/ timeline 参数表（/k、×k、HOLD=max(1.2,HOLD_SET/k)、IRQ_FLASH 字符串档特判）/ 17 机位+camAdapt（meta.camAdapt 原值）/ 标签表+d28 左色条 / d01 slot 公式 / d30 拱顶 |
| `scene.js` | ~1900 | 构件函数库：地板（tex07 网格 1.2wu+三灯池）/区带 d21/桌面行（五件修复轮 x 终态+d08 y/z）/状态窗（三行不越界）/DCBAA 格架（d06 2×4 编号+1 号格琥珀+有效性小窗+牌逐字）/槽态灯排（d05 五灯双色芯+牌注原文）/PORTSC 双屏（USB2 五字段灯+PLS+Speed；USB3 屏）/复位钮/门铃排（d02 八钮+d03 两牌逐字）/BSR 旋钮（d04+牌）/端口排（d19 四块+牌）/卡库（d13）/门架（d09）/三环（R4.6 tube0.14 圆心(0.5,y,0)、12 槽 d01、slot0=Link 琥珀、回绕弧 r5.5 拱顶 d30、cycle 翻色 PCS 1↔0、TRB 卡 1.24×0.56×0.06 billboard 仅 +z 贴字、每环读指针小旗〔事件环旗=ERDP 推进〕）/USB 缆（5 控制点 tube0.13+双插头+法兰+端子两枚+方波段 2.2/0.28/8 齿/±0.16/0.055+双箭头锥）/走廊（5 控制点+d15 落点+断言静检）/设备（d23 滑入+d07 四灯+d27 铭牌翻牌 Y180°+副题逐字+domeLamp emissiveSwap+半透明顶盖）/FX（irqFlashLine→d17 闪 3 次+轮询滑车、dmaBeam r0.07 #5f86e8 三用点 d25、AO 盘 d20、FS 闸口 d26+牌逐字）/走廊断言构建期静检（双口径见 §5 遗留） |
| `stages.js` | ~460 | 工段编译器：timeline.stages→[t,fn,arg]（时长全走 timeline.params base；工段总时长不写死=d31）；flow[] 起终小标逐字进流转卡（540×224/36px/28px/「起 ▸…｜终 ▸…」）；state[]→场景状态+面板卡（带 s1 锚逐字）；变体步序（usb3_F1/bsr1_F6/linux_F8）；预设 branches.chips×5+skip（hs=[7,8]、usb3=[2,3,7,8]〔承 V2 契约〕）+contrastCards 三张+noMixRule；面板内容编译（stageCards/字段卡三张含槽态五行表全值/原文对照六条〔S5 定稿槽位〕/数字口径九行/quiz 5 题〔SLOTS-FOR-S5〕） |
| `lab.js` | ~230 | 三关状态机（承 V2 X43Lab 形态）：解耦立法（独立状态机+setRender 钩子/主线照常/判分不写回/同一 movers 库/等待 /k 封顶 6s）；L1 双入口（3D raycast 点旋钮 ∥ 面板按钮）+DSL fail 文案逐字+呼吸高亮引导+demoEp0Step；L2 六步（answers=DSL 逐值、fail 逐字、错选不推进、wIndex=0 固定展示）；L3（L2 徽章=入门票 gate；T1 判分+依据+Slot ID=1 回执演示〔toDesk=false 不写回主线〕；T2 双分支各自结局〔outcome 逐字取 DSL〕不混写；T3 四卡排序 correctOrder=[0,1,2,3]+判分后对照卡）；quiz（≥4/5 可重做，题面=占位稿） |
| `panel.js` | ~470 | 4 tab（讲解/字段与引文/动手台/显示）+活指标四项+RuntimeStatus；播放四键；chips×5；试错按钮（F5 启用）；quiz fold（SLOTS-FOR-S5 标注）；字段卡/引文/数字口径渲染；徽章架；HOLD_SET 滑杆 1.5–4.0 默认 2.0；≤480px 初始折叠+半高贴底 |
| `main.js` | ~520 | 渲染器/自写轨道控件+门铃 raycast 点选（L1 场景侧入口）/17 预置机位+camAdapt/近景 0.9s/标签系统（19 锚点投影+左色条三档+erdp dynamic 随旗+紧凑可见集+绘制偏移消叠）/工段运行时（编译步序+变体+rewind/applyEnd instant）/速度模型（dt×k 贯通）/自动巡游+全线联动/试错（p100 文案）/F0 完整性自检（7 必入画+右缘余量实测）/门 API window.__x43 |
| `style.css` | ~270 | DSL 色板主题（flat 36）；标签左色条三档；徽章架/quiz 槽位标注/HOLD 滑杆/数字口径表样式 |

### 1.3 消费 DSL 分区逐项落点
meta（units/coords/sceneBbox/render fog exp2 0.012+背景渐变/speedModel/camAdapt/ui〔流转卡画布/字号/zoom/细节层〕/derived 34 条全解析）；materials（pbr 12 含 null×2 程序化缺省、flat 36 全用、lampSemantics 9 行点灯、lampRowPlate/contrastPairs 禁令落实〔DMA 铭牌深字 #10151c〕）；sceneGraph（zones 3 区带+区标、entities 38 全建模、lights 5〔null 暖白档兜底〕、labels 19 全投影）；rings（common 全量+3 环+connectionMatrix 语义核对）；cable（curve/plugs/signal 全量；forbidden 红线=无软件 SET_ADDRESS 画法）；corridor（curve/endHover/landingTarget/断言双口径静检）；cameras（17 list+narrow390+f0Check）；timeline（36 参数全接线、12 工段、tour=F0 回巡、branches 全量）；interactions（decouple/L1/L2/L3/quiz/progression）；panel（live/controls/tabs×4/narrow）；textureRequests（12 项=S6 任务书，本环节程序化占位，注入口已留）。

---

## 2. 门结果表（9 门+性能门，逐门证据）

| # | 门 | 结果 | 证据 |
|---|---|---|---|
| 1 | 构建 sha 可重复 | **PASS** | 连续两次 `node build.mjs` sha256 一致：`d9872b17b96d55f96441f3934537d87a8149c03c251faf9bb84cee0c48647ca8`（迭代轮 1 终版：牌注错层+探针补洞+灯池回场+纹理加强+S3 机位同步；GATE1-REPRO-PASS） |
| 2 | 自包含零外链 | **PASS** | `<script src=`/`<link `/`@import`/`url(http` 全 0 命中（资源加载面）；three r160 内联+DSL 内联，运行时零外部请求 |
| 3 | console 双域 clean | **PASS** | `pipeline/tools/console_check.mjs`：加载+12 工段 instant 巡检+F6/F7 动画全步序（含 irqFlash，21s/24s 等待覆盖）+chips×5 切换+互动快链+试错，Runtime.consoleAPICalled+Log.entryAdded 双域 `console: clean`；施工期曾抓出三处运行时异常（E helper 误绑 find/地板 texOf 传 context/`+up` 越域引用压缩名）均已修复复测；corridor 单口径修订后复跑 PASS |
| 4 | 语言门 retired ⊆豁免 | **PASS** | `scan_words.py retired --check pipeline/tools/retired-baseline.json` → RETIRED-PASS total=25；豁免={回执×24（DESIGN §1.5 裁定）∪ 定案×1（DSL d08 basis 数据层残余，S3 数据件只读不改动）}；施工期自咬「对账」×1（main.js 注释）当轮改净为「核对」 |
| 5 | 页码 needle | **PASS** | 18 对全 OK（PAGECHECK-PASS）：p71 CCS/p72 preparing/p73 wValue=0100h/p74 from Address to Configured/p75 4.3.2/p76 cleared to/p77 Enabled to the Addressed/p82 Doorbell/p83 Host Controller Command/p85 Slot State/p86 Disable Slot/p87 Enabled/p97 Address Device/p98 Block Set Address Request/p100 Parameter Error/p292 PSCEG 句/p68 Command Ring/p69 polling——对表文件=`pipeline/tools/needle_pairs.txt`（覆盖 V3 UI 全部页码锚；S5 引文定稿后随更） |
| 6 | shots 全套 | **PASS** | `pipeline/tools/shots.mjs --prefix v3g`：30 件=17 预置机位（cameras.list 驱动）+F4 动画中段+走廊取证（until 轮询卡入走廊中段再摆 corridorProof 机位——v3g-corridor-proof.png 流转卡+起终小标在画）+互动三关各 1（L1 入口/错选拦/L2 六步视图/L3 锁定视图）+quiz 槽位（v3g-quiz-slot.png：5 题折叠节展开可见，题面=五个 DSL topics）+F5 试错红牌+tab 两张+390px×2+F0 右缘 1/3 裁剪人验图；全程 console clean；corridor 单口径修订后整套复跑 PASS（exit 0）；F0 完整性机检 PASS（panorama+full 双模式：7 必入画全 counted、右缘余量 marginWu=15.59 ≥1.0〔铭牌右缘=DSL d27 实算 16.6，见遗留 L2〕） |
| 7 | 标签不叠探针 | **PASS** | `pipeline/tools/label_probe.mjs`：17 机位逐台（a）标签两两 bbox overlap>0.15=0 对（b）DSL labels.neighbors 邻居扩检（entityBoxes Box3 实测投影；host 自身跳过；prose 邻居跳过计数 597——邻居表多为方位描述词，可解析子集已检）；单口径修订后复跑 LABELPROBE-PASS；消叠手段=ERDP 旗默认停 slot6（西端出口=消费位语义）+S4 表现层绘制偏移表（DSL 锚点未动）+FS 闸口牌随亮起出现（F7+） |
| 8 | LAB-CHECK 升级 | **PASS** | `pipeline/tools/lab_check.mjs`（判据值全部读 interactions 分区）：徽章门（无 L2 徽章进 L3=锁）→L1 双错路径（bell0/空槽 fail 文案逐字被拦）+对路径（徽章「门铃上手」）→L2 六步全链（每步先错选拦〔fail 逐字断言〕再按 answer 推进；含 DSL 干扰项 s4 DB Target=0）→徽章「控制读三段齐」（wrong=5 全拦）→L3 T1 错交判分（依据含「命令环唯一」）→对交+Slot ID=1 演示→T2 BSR=1 分支结局逐字（BSR=0 对称实现在案）→T3 错序判分→correctOrder 重排→徽章「值班工程师」→quiz 4/5 通过+重做；LAB-CHECK-PASS（截图 v3lab-L1/L2/L3-done.png） |
| 9 | zoomfs/交互冒烟 | **PASS** | `pipeline/tools/smoke_check.mjs`：键盘 →/←/空格 单步、工段条点选（末段）、复位（回执清零）、回到工位、全屏按钮在案、速度 2×/0.5× 切换、HOLD 滑杆、拖转接管（drag 6 步）；SMOKE-CHECK-PASS |
| 10 | 性能门（新增） | **PASS** | `pipeline/tools/perf_check.mjs`：PERF-CHECK PASS — **wall=150.4s ≤8min** · longtask>100ms=0（ltMax=0ms；PerformanceObserver longtask，巡游相对时间过滤剔除加载期任务 2 件）· stage=11 receipts=14（k=0.5，巡游=timeline.stages 全序列自动推进，STAGE_GAP 排程）；console 全程 clean；环境纪律=必须独占运行（遗留 L7） |

---

## 3. DSL 忠实度自查表（逐分区）

| 分区 | DSL 事实 | V3 落点 | 自查 |
|---|---|---|---|
| meta.render | fov45/窄屏64/断点480/雾 exp2 #10151c 0.012/背景渐变 | 相机 fov 切换+雾+背景逐值 | ✅ |
| meta.speedModel | k{0.5,1,2} 默认 0.5；t=base/k；×k；UI 0.25s；封顶 6s | dt×k 贯通全部 mover/巡游；WAVE_SPEED 速率 ×k 且按缆实长（d29）；HOLD 公式；lab waitMs 封顶 | ✅ |
| meta.derived 34 | d01–d34 | X43D.ref 全解析；构建期机检+运行时 throw 兜底；**零就地发明缺省** | ✅ |
| materials.flat 36 | 色板 | 全量直色使用（地板/区带/卡族/告警族/文字三级） | ✅ |
| materials.pbr 12 | 区间 | 区间中值+程序化 canvas 占位纹理（tex01–12 工厂）；mGridPlastic/mScreenGlass null→保守缺省（遗留 L4 注记）；S6 注入口 userData.texRequest | ✅ |
| lampSemantics 9 | on/off 色 | 设备四灯+槽五灯（首灯双色芯）查表点灯 | ✅ |
| sceneGraph.entities 38 | bbox/pos | 全 38 建模；几何逐条走 DSL/derived（d02–d27） | ✅ |
| sceneGraph.lights 5 | 色/强/位 | 逐条（null 暖白档=DSL colorNote 授权兜底） | ✅ |
| sceneGraph.labels 19 | 锚点/文案/host/邻居 | 逐字投影+左色条 d28 三档+erdp dynamic；文案零改写 | ✅ |
| rings | common+3 环+connectionMatrix | R/槽/弧/cycle/旗/铭牌全按 DSL；entry slot7/slot1、exit slot6、write 5/6/7 与 DSL 一致 | ✅ |
| cable | 5 点/0.13/插头/方波参数/三色/箭头 | 逐值；tickets 与方波同相（卡+波双形）；forbidden 红线未违 | ✅ |
| corridor | 5 点/d15/断言 | 航线+d15 落点+开匣+ERDP+HOLD+FADE 链；断言单口径（裁定 a 已落地，见 §5 L1） | ✅ |
| cameras 17 | pos/tgt/adapt | cam 表全量+camAdapt（panorama k=max(1.5,68/d)+西移 7；closeup 1.16）+f0Check 双模式机检 | ✅ |
| timeline | 36 参数/12 工段/tour/branches | 参数全接线（IRQ_FLASH 字符串档特判）；工段编译+变体 3 组；chips×5+overrides+contrastCards+noMixRule | ✅ |
| interactions | decouple/L1/L2/L3/quiz | §1.2 lab.js 行所述；fail/答案/结局文案逐字 | ✅ |
| panel | live/controls/tabs/narrow | 活指标四项+Runtime；速度/滑杆；4 tab 内容编译自 DSL；窄屏折叠+紧凑标签 [zone-sw,zone-hc,zone-dev,plate] | ✅ |
| textureRequests 12 | S6 任务书 | 本环节程序化占位（12 工厂），注入口 userData.texRequest=id；policy 预算/砍序未动（S6 义务） | ✅（占位态） |

**逐字文本面**：19 标签文本、门铃两牌、BSR 牌、FS 闸口牌、格架牌、灯排牌注、Link 牌、DMA 铭牌（深字禁白字落实）、铭牌正/背面+副题、状态窗三行、DSL state[] 语义值（面板卡带 s1 锚）、flow 起终小标、试错文案（p100）、L1 双 fail、L2 六步 fail+answers、L3 判据/结局/对照卡——渲染层零改写。

---

## 4. 工具通用化台账（pipeline/tools/，本环节新增）

| 工具 | 参数化点 | 被消费 DSL 分区 | 下游复用 |
|---|---|---|---|
| `lib.mjs` | --dsl/--page/--out/--drive/--width/--height 全参；drive 封装+console 双域判据 | （共用库） | 全部工具与后续环节 |
| `shots.mjs` | 机位清单=cameras.list（非写死 17）；工段映射=timeline.stages[].camera；quiz 槽位=panel.tabs；F0 裁剪=f0Check.protocol | cameras/timeline/panel | S5 精修复拍、S6 纹理回灌复拍、S7 取分镜帧 |
| `label_probe.mjs` | 机位=cameras.list；邻居=sceneGraph.labels[].neighbors；阈值 0.15=§I.1 | cameras/sceneGraph.labels/timeline | S5 标签调位复检、S6 回灌复检 |
| `lab_check.mjs` | 判据值全部读 interactions（L1 fail/answers、L2 六步/fail、L3 correctOrder、quiz pass）——两阶段解析页内选项 label | interactions | S5 互动文案/题面定稿后复跑 |
| `console_check.mjs` | 工段数=timeline.stages.length；chips=timeline.branches.chips | timeline/interactions | S5/S6/S7 构建回归 |
| `perf_check.mjs` | k/maxMin 参数化；longtask 巡游相对时间过滤 | meta.speedModel/timeline | S5/S6/S7 构建回归（独占运行） |
| `smoke_check.mjs` | 工段数=timeline.stages.length | timeline/panel | 构建回归 |
| `needle_pairs.txt` | V3 引用面数据件（页⇥needle 18 对） | （S1/S2 引文面） | S5 引文定稿后随更 |
| `retired-baseline.json` | 语言门棘轮基线（回执豁免+DSL 数据层残余） | —— | 语言门 --check 复跑 |

一次性粘合（留 dev/，不通用化）：`dev/label_overlap.mjs`、`dev/lab_check.mjs`（V2 遗存，已被 pipeline/tools 同名件取代，留档作 V2 证据链）；`dev/boxprobe.js`、`dev/smoke.html`、`dev/spec_*.py`（V1/V2 施工探针）。

---

## 5. 遗留与报备（含 DSL 疑似问题）

| # | 级 | 事项 | 处置/指向 |
|---|---|---|---|
| L1 | **已闭环（主会话裁定 a，2026-11-10）** | 原缺口：corridor.assertions 起步豁免段 <1.0 wu 短于样条净距达标点（arc≈1.36），字面巡航断言在 arc 1.0–1.36 段实测净距 0.93 wu <1.2。**处置**：S3 补丁落地新断言（爬升段=自起点至净距首次 ≥1.2 wu 之处、只要求 y 单调上升；巡航段=自该点起至落地 ≥1.2 wu；全局不变）→ S4 `corridorAssertions()` 同轮改单口径（去掉 passLetter/passExempt 双口径）→ 实测 pass=true（clearArc=1.36，distOk/yMono/yGlobal/descentOk 全 true）→ 受影响门复跑全绿：console 双域 PASS / label_probe PASS / shots 30 件 exit 0（走廊取证帧复拍在画）/ 语言门 RETIRED-PASS / sha 复现 PASS | 航线视觉不变；`__x43.corridorCheck()` 单口径 {arcLen,clearArc,climbArc,distOk,yMono,yGlobal,descentOk,pass} |
| L2 | **已闭环（主会话授权顺手修）** | cameras.f0Check.rightMargin 陈旧值 16.1 wu → **16.6 wu**（d27 实算 15.4+2.4/2）已直接修订 scene.dsl.json（JSON 复验可解析）；f0check 用实值报 margin=15.59 wu ≥1.0 | 完成 |
| L3 | DSL 缺口补位（S3-评分⑦ remark 消解） | L2 s1/s2/s6 干扰项池 DSL 未登记（仅 s4 有）——S4 按 S1 同源值自拟（bmRequestType 00h/08h、bRequest 5/8、wValue 0001h/0300h、wLength 64/0、TRT OUT(2)/无(0)、DIR 反向、MPS 64/512），工具按 DSL answer 驱动不受影响 | 建议 S5 回填 DSL interactions（干扰项池结构化） |
| L4 | 纹理占位（计划内） | mGridPlastic/mScreenGlass PBR 区间 null（S2 §F#10/#12 未给）——程序化缺省：格架 #2a3340+tex10 微磨损、屏面 #0d1319+tex12 抗反射微纹理、metal/rough 保守档 | S6 裁定后经 userData.texRequest 注入口替换，构件层零改动 |
| L5 | S5 义务槽位 | quiz 题面 5 题=S4 按 S1 拟的占位稿（面板标注 SLOTS-FOR-S5）；原文对照六条=承 V2 取 S1 原句（面板标注定稿留 S5）；细节层清单（F4 命令环卡/EP0 环字段/格架号/缆插头丝印）已按 meta.ui.detailLayer 登记，7px 层与 zoom 3.2× 在案 | S5 定稿 |
| L6 | 行为面待 S5/S6 | 分支预设视觉差异目前=正文注记卡+变体步序（对照卡/回看卡=面板文字层，符合 noMixRule）；holistic 视觉打磨（环卡面字号/暗部层次）留 S5 精修；纹理质感留 S6 | — |
| L7 | 性能门环境纪律 | perf_check 必须独占运行（与其它 drive 实例并发会拖慢 rAF 致墙钟失真；实测并发轮 8min 超时、独占轮 150.5s） | 已写入工具头注 |
| L8 | 试错回执计数 | 试错的 Parameter Error 事件卡 toDesk=true 计入回执 n（教学口径：驱动确实读取了该事件） | 如需「不计入」口径，S5 一行改动 |

---

## 6. 截图清单（shots/，v3g 前缀 30 件）

17 预置机位（cam-F0…F11/rings/corridorProof/labL1/deviceCloseup/deskCloseup）+ f4-mid（命令环卡+DMA 光束中段）+ corridor-proof（流转卡入走廊中段，起终小标可见）+ lab-L1/-fail/-L2/-L3（动手台三关视图）+ quiz-slot（F11 自测槽位）+ tryerror（Parameter Error 红牌）+ tab-fields/tab-disp + phone390×2 + cam-F0-rightcrop（裁右缘 1/3 人验图）。

---

## 7. 评分回迭代轮 1 记录（2026-11-10，scorer 首轮 FAIL → 修复）

**裁定**：均分 9.03 达线，但 ③纹理质感 8.0 / ⑥遮挡 8.2 <8.5 → FAIL 回自迭代。

### 7.1 修复清单（逐缺陷落点）

| 缺陷 | 修复落点 | 验证 |
|---|---|---|
| ⑥ 3D 牌注互叠（F4/F7/F9，HTML 探针盲区） | ① DCBAA 格架牌下移贴格架面（y7.5/z2.66）与灯排牌注垂直分层；② 门铃分刻牌 A/B 宽 1.7→1.3+垂直错层（d03 y±0.14）消物理交叠；③ BSR 画布牌移旋钮下方（消与 HTML lbl-bsr 同位重复）；④ FS 闸口画布牌移门架下方（消与 lbl-fs-gate 同位重复）；⑤ 端口牌转朝东南（消掠射面） | 探针新增 (c)(d) 检测后逐轮收敛 → LABELPROBE-PASS |
| ⑥ 探针盲区（牌注 vs HTML 不可见） | `label_probe.mjs` 补 3D 内牌注采集（userData.plate3d 标）+两类检测：3D 牌注×HTML 标签、3D 牌注两两（>0.15 报单）；防伪三件：视空间 frustum 检查（viewZ≥-1 剔背面/近面镜像）、掠射小面跳过（<12px/220px²）、视口裁剪（视口外矩形不计数） | 同类盲区杜绝；伪阳性三层过滤后残留真缺陷全部修复 |
| shots 面板滚动位误拍 | tryerror 段前面板 scrollTop 复位+#x43Trap 显式滚入 | tryerror 帧复拍在画 |
| rightcrop 裁整页 | 改 canvas 视区 region shot（两阶段探面板左缘 VR，右 1/3=[VR-cropW,0,cropW,H]），弃 sips 整页裁 | v3j-cam-F0-rightcrop.png 为 3D 区右缘 |
| 390 标签左右缘微裁 | compact 模式标签 x 钳位（±44px，main.js updateLabels） | v3j-phone390 复拍 |
| ③ 柜面灯池倒退 | 柜面三盏内灯回场（暖主 0xd9a860/内照 0xffe2b0/低位 0xbfd0e8，V2 基线值按柜心 x+1 平移） | F4 帧柜面亮度回场（双屏/格架/灯排可读——v3j-cam-F4.png 目检） |
| ③ 木纹/钢板细节 | tex01 钢板：拉丝对比提升+纵向划痕+边框磨损点阵；tex03 木纹：三段明暗渐变底+130 根高对比纹理带+节疤暗心 ΔL 拉大（径向 0.95 暗心+三重暗环+下缘亮反光） | 程序化占位档加强（Blender 大改留 S6） |

### 7.2 S3 机位补丁同步（主会话通知后执行）

- DSL cameras 5 条新基线（F2 z20 远机位/F3 z14.5/F6 tgt 东移/F9 西移/F10 z20）页内经构建期 DSL 注入自动生效（零硬编码——cameras.list 驱动）；f0Check 16.6 授权链随 DSL 字段走。
- 受影响帧全量重拍（v3j 前缀 30 件）；label_probe/console/shots/perf/language/needle 全部复跑 PASS（见 §2 各行证据为终版）。

### 7.3 迭代轮门复跑结果（全绿）

| 门 | 结果 |
|---|---|
| sha 复现 | PASS（`d9872b17…` 两次一致） |
| 语言门 | RETIRED-PASS total=24 ⊆基线 |
| needle | PAGECHECK-PASS 18/18（python3.9 + needle_pairs.txt） |
| console 双域 | CONSOLE-CHECK-PASS |
| label_probe（含 3D 牌注新检测） | LABELPROBE-PASS 17 台 |
| shots | exit 0 · CONSOLE-CLEAN×2 · F0CHECK PASS（margin 15.59） |
| smoke | SMOKE-CHECK-PASS |
| perf | PERF-CHECK PASS wall=150.5s · longtask>100ms=0 |

### 7.4 迭代轮残留（如实登记）

- 灯排牌注左端（"Enabled"首词）在 F4 高机位仍被琥珀灯球部分遮挡——牌注下有格架牌、上移会撞 fsGate 远投影，当前取「灯下前移 z2.74」平衡点；S5 可再调（如灯球径微缩或牌注改 HTML 细节层）。
- 390 紧凑模式下 HTML 标签钳位到 ±44px，边缘标签可能与视口边缘轻微贴边（可读不受影响）。


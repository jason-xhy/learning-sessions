# EVIDENCE.md —— §4.3 USB 设备初始化 3D 实验件断言表

交付：`index.html`（单文件自包含，three.js r160 内联）· 设计档 `notes/43-heeli-3d-design-2026-11-09.md` v2
内容契约：DESIGN.md §5.3（12 帧帧序/演示样例/分支注记三卡/引文六条）原样继承；内容唯一取材源 = 现行 `4.3-usb-device-init/build.mjs`。
判据规范：xHCI 1.2b（625472 Rev 1.2b）。

## 1. 版本与构建

| 断言 | 判据 |
|---|---|
| three.js 版本 = r160（`THREE.REVISION`，页内运行时读出 "160"） | vendor/three.module.min.js 头注释 `Copyright 2010-2023 Three.js Authors` + `const t="160"`；来源 `cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js` |
| three.module.min.js sha256 | `3e690ac7d180b0aadf0891bea39eec643e29e2d3e75c99b18689518665f69ba6`（670681 字节） |
| 构建可重复（字节级一致） | `node build.mjs` 连续两次 sha256 相同：`d3c09af9986317a970656a3251dba7661d1a0ddf5f0ed99df52059abbf3c70c2`（GATE1-REPRO-PASS，复评修复轮后最终版；r7 交付截图集与此构建同源） |
| index.html 体量 | ≈746 KB（three 内联 ≈653KB + 本件 JS/CSS/模板 ≈93KB），设计预算 1.2–1.8MB 内 |
| 内联变换方式 | three 唯一 `export{…}`（416 条导出）→ `const THREE={…}`；构建期断言关键符号在场（Scene/PerspectiveCamera/WebGLRenderer/CanvasTexture/CatmullRomCurve3 等 29 项）+ `node --check` 语法自检 |
| 运行时零外部依赖 | 无 importmap、无动态 import、无外部 script/link/font；OrbitControls 与缓动为自写（~90 行），无 tween.js |

## 2. 内容断言（逐条 → 规范判据）

| 页面/场景断言 | 判据（pypdf needle 实测，PAGECHECK-PASS 18/18） |
|---|---|
| 插入由 xHC 检出：CCS 与 CSC 同时置 1（F1，引文一） | p71 `Current Connect Status (CCS)` OK；引文逐字 = 现行 4.3 页 quotesHtml（曾过现行页门） |
| USB2 端口 attach 后 PLS 显示 "7"（F1 场景屏） | p72 3.b `field shall be` + 上下文 `the PLS field shall be '7' (Polling)`（施工期全句提取核对）；与现行页 F1 显示值一致 |
| USB2 复位完成四信号 PRC=1 · PED=1 · PR=0 · PLS=U0（F3，引文二） | p72 `preparing it for a`（复位完成句所在页）OK；四信号逐值 = 现行页引文原句 |
| 复位后 PORTSC Port Speed 指示设备速度 = FS（F3 场景屏） | p75 Note（现行 EVIDENCE 判据）；演示样例 FS → Speed 显示 FS |
| PLS 复位期间显示「复位」文字非数值（F2） | 规范未给 USB2 复位期间 PLS 数值——不造数（现行页同口径） |
| Enable Slot 回执 Slot ID=1（示例，xHC 自选）（F4，引文三） | p75 `4.3.2 Device Slot Assignment` + `returns a Slot ID that is selected by the host controller` 双 OK |
| DCBAA 1 号格由软件装载、xHC 只读（F4 卡） | 现行页正文与 fig4 契约修订（DESIGN §2 避雷条目）；场景牌「DCBAA 格架 · 软件装载」 |
| 输入上下文 A0=1 且 A1=1（F5 表格卡） | p75 `cleared to` 上下文段（步骤 5：A0/A1 置 1）+ p76 现行判据 |
| Slot Context：端口=1 · Route String=0 · Context Entries=1（F5） | p76 `Root Hub Port Number` OK · p76 `Context Entries` OK；Route String=0（根端口直连）= p75 脚注 8 |
| EP0 Context：Control · MPS=按速度默认（FS=8）· Max Burst=0 · TR Deq=EP0 环首段 · DCS=1 · Interval=0 · MaxPStreams=0 · Mult=0 · CErr=3（F5 卡+字段卡） | p76 `CErr` OK + `Max Packet Size` OK（现行页 §4.3.3 p76 现场值同源） |
| Address Device 带 BSR=0，成功槽 Enabled→Addressed（F6，引文四） | p76 `cleared to` OK + p77 `Enabled to the Addressed` OK |
| 编址后设备 Default→Address（F6 设备灯） | 现行页 F6 帧序；设备灯面板四态 Powered/Default/Addressed/Configured |
| 8 字节描述符读取仅 FS 必走；LS/HS/SS 8/64/512 可跳过（F7，引文五） | p72 `first 8 bytes of the` OK + `bMaxPacketSize0` OK |
| GET_DESCRIPTOR 三 TRB 字段组逐值（字段卡） | p73 `wValue = 0100h` OK + `bmRequestType = 80h` OK（TRT=3/Length=8/IDT=1/IOC=0/DIR=1/0/CH=0/IOC(Status)=1/Buffer=0 全组 = p73 原文） |
| Evaluate Context（A1=1）更新 EP0 MPS 生效（F8） | 现行页 F8 帧序（p74）；不发明新数值 |
| 双操作同成：Configure Endpoint 且 SET_CONFIGURATION（F10，引文六） | p74 `from Address to Configured` OK + p74 `SET_CONFIGURATION` OK |
| hub/TT 逐层初始化（F10 卡） | 现行页分支注记三卡（p74 Note） |
| USB3 端口 attach 自动 Enabled（PED=1·PR=0·PLS=0）、无端口复位帧（预设） | 现行页分支注记卡（p71–72）；两族 Disabled 态分开表述（DSPORT.Disabled vs USB2 Disabled） |
| BSR=1 legacy：EP0 启用、禁止 SET_ADDRESS、槽 Enabled→Default；通信完成后再 BSR=0 编址（预设） | 现行页分支注记卡（§4.3.4 p76–77）；p77 `BSR` OK |
| 试错路径：空输入上下文抢发 Address Device → 命令完成事件 Completion Code=Parameter Error、输出上下文不变 | p100 `Completion Code set to Parameter Error` OK（上下文：命令执行前校验引用上下文有效，无效→Parameter Error 且输出上下文不变）；告警卡文案引用同段语义 |
| PSCEG 0→1 跳变才产生事件（F1 卡） | p71 `0' to '1' transition of Port Status Change Event Generation`（施工期核对）；现行页 F1 同口径 |
| 命令门铃 0（DB Target=0）与 EP0 门铃（DB Target=1）分开刻 | DESIGN §2 避雷条目；场景两块独立刻牌 |
| Slot ID=1 与新地址 1 为示例值 | 现行页声明（xHC 自选，§4.3.2 p75 / §4.6.5 p97） |
| 设备铭牌「只见 USB 请求与总线事件——槽/环/上下文对设备不可见」 | 现行页试验盒长铭牌原句（HTML 标签承载） |
| 状态窗 USBCMD R/S=1 / MaxSlotsEn 已配置 / DCBAAP→DCBAA：不写数值 | §4.2 域内容不越界——只显示状态文字，不造 MaxSlotsEn 数值（避雷清单纪律） |

## 3. 门结果（八门）

| # | 门 | 结果 | 证据 |
|---|---|---|---|
| 1 | 构建可重复 | PASS | 两次 build sha256 一致（§1） |
| 2 | 自包含零外链 | PASS | `<script src=`/`<link`/`@import`/`url(http` 全零；残留 http 串 = W3 xmlns（data URI 内）与 three.js 注释串，非资源加载 |
| 3 | console clean 双域 | PASS | drive.mjs（Runtime.consoleAPICalled + Log.entryAdded 双监听）：加载/12 工段 instant 巡检/动画工段/试错/预设切换全部 `console: clean`；施工期曾抓到 computeBoundingSphere NaN（makeCard 参数序错，已修，见 §5） |
| 4 | 语言门 retired ⊆ 豁免 | PASS | `scan_words.py retired`：total=10 = {回执×10}，回执 ∈ DESIGN §1.5 豁免表；施工期曾咬 上环/同台/契约/取件 各 1-2 处，当轮改净 |
| 5 | 页码 needle | PASS | PAGECHECK-PASS 18/18（§2 表 needle） |
| 6 | shots 门 | PASS | shots/：r7-overview + r7-f00…r7-f11（1440×900 ≥1280 宽，全景+每工段机位）+ r7-phone390.png（390 宽，面板默认收起形态）+ r7-quiz.png；console 于截图全程抓取 clean；评分修复轮后整套 r7 重出（与本表 §1 最终构建同源） |
| 7 | 3D 标签不叠探针 | PASS | dev/label_overlap.mjs：全景+12 工段机位 13 台逐台 bbox 两两求交，overlap>0.15 = 0 对（LABELPROBE-PASS）；探针落新目录 dev/ |
| 8 | EVIDENCE 断言表 | PASS | 本文件 |

豁免（设计档 §7 已登记理由）：SVG 泳道静态图（3D 场景即总览）/ SVG 遮挡探针（CSS2D/HTML overlay 版探针替代）/ lines.mjs（无机器线描）。

## 4. 交互与状态机断言（drive.mjs 行为验证）

| 断言 | 证据 |
|---|---|
| 12 工段 instant 巡检：场景状态随工段推进（cable→flags→设备灯→槽→表格卡→EP0→配置→完工） | shots r6/r7 f00–f11 逐帧；每次 `window.__x43.goto(i,{instant:true})` 后 sceneState 与工段 metrics 同相 |
| 动画播放（F4 实测）：命令单飞行→门铃按压→事件卡上带→输出上下文卡飞挂 1 号格 | shots/r5-f4-mid.png（进行中状态+传送带+回执累计） |
| 试错链（F5）：表格卡清空→Address Device 抢发→红告警卡+重置按钮+运行态红字 | shots/r5-trap.png；runtime = 「命令完成事件：Completion Code=Parameter Error（参数错误）」 |
| 预设 usb3：F2/F3/F7/F8 底栏置灰划线；F1 变体卡+设备灯 Default+端口屏 PED/PLS/Speed | shots/r6-usb3-f1.png |
| 预设 bsr1：F6 变体（无 SET_ADDRESS 票据、槽 Default）；F10 前半补编址 | shots/r6-bsr1-f6.png |
| 预设 hs：F7/F8 置灰 | shots/r6-hs-f6.png |
| 键盘 ←→/空格 单步；底栏五分组+左右箭头翻组 | main.js keydown 绑定；X43_GROUPS 五组 |
| 标签开关/粒子开关/剖视开关/回到工位 | 显示选项 checkboxes → Engine.setLabels/setParticles/setCutaway |
| 全屏大光标（34px） | CSS `:fullscreen` 34px SVG data-URI cursor；默认 22px |

## 5. 施工期缺陷台账（已闭环）

| 缺陷 | 根因 | 修复 |
|---|---|---|
| 屏显 `[object Object]`（状态窗 Device Slot / portsc Speed） | 动作处理器 pls/speed/devLamp/slotLamp/mps 按字符串签名收 `{v:…}` 对象 | 处理器改为解构 `o.v`（Round 2） |
| F5 表格卡只填 4 格 | formFill n 参数按累计口径写成了分组口径 | steps 改 n=2/5/9（Round 2） |
| console 报 computeBoundingSphere NaN（×2，与事件卡骑行同数） | evCard/slipPrep 调 makeCard 时 w/h 位传了色值串（参数序错）→ BoxGeometry(NaN,NaN,0.02)；console 门双域捕获定位 | 调用改为 makeCard(label, w, h, bg, fg) 正序（Round 5） |
| USB3 预设切换静默失效 | 预设 id "ss" 与变体键 "usb3" 不一致 | 预设 id 改 "usb3"（Round 6） |
| BSR=1 预设面板槽态显示主线值 | 变体缺 metrics 覆盖 | 变体加 metrics（usb3.1/bsr1.6）+ metricsOf()（Round 6） |
| 标签对 事件匣×描述符收件匣 全机位 overlap 0.28 | 两锚点 x/y 过近（z 差被透视压缩） | 锚点 x/y 双向拉开（Round 6，探针复跑 PASS） |
| 告警卡需滚动面板才可见 | DOM 序在卡片之后 | 提到 runtime 行之后（Round 6） |
| 桌牌/柜顶牌 canvas 文字镜像疑虑 | 平贴面片观察角问题 | 删除两牌（区名由 HTML 区标承载） |
| **评分门轮（美学 8/9 → 修复 6 项，2026-11-10）** | | |
| P1-1 F0 全景右缘截断（设备铭牌贴边+试验盒出画） | 全景机位 z=32/tgt x=4.4 时右翼超出有效视口（右面板占 28% 宽） | F0/F11 机位拉远西移：pos [1.5,12,39] / tgt [1.5,3,0]——三区全入画；取舍换侧为「左缘桌后角微裁」（P1 优先，按评分门指示） |
| P1-2 两侧暗部层次不足（文书台/试验盒只剩轮廓） | 两翼仅有正面点光，背侧无层次 | scene.js 灯光段补两盏低强度侧后补光（deskRim 0xaebfd8 强度 9 @[-19,7.5,-3]；devRim 0xb9d8ae 强度 7 @[17.5,6.5,-2.5]），deep-dark 基调保持 |
| P2-3 标签样式三级混杂（白底/橙底/深底） | zone/plate 各自独立底色与描边 | 统一白底+左色条分级（琥珀=区标 / 灰=部件 / 绿=教学锚），style.css 单处定义 |
| P2-4 表格卡第 4 格数值偏暗 | 格值色 #cfe0ff 偏暗+第 4 格贴右缘（380px canvas 内格区到 364px） | 值色统一提亮 #e2edff、未填描边提亮 #46566a、canvas 380→400px+格区收进（x118 起/格 52/步 56），右缘留白 ≥60px |
| P2-5 390px 手机帧面板近全遮挡 | 面板 fixed 全高全宽 | ≤480px @media 面板半高贴底（max-height 46vh）+ JS 初始折叠（innerWidth≤480 时 fold(true)，实测 display=none） |
| P2-6 槽态/设备态首用缺中文注（§3.1 立法） | metrics 只有英文态名 | 全部 12 帧+2 变体 metrics 加 dd small 首用注（Powered 已上电 / Default 默认态 / Enabled 已使能 / Address(ed) 已编址 / Configured 已配置） |
| **复评轮（美学 8/9 维持 → 复修，2026-11-10）** | | |
| **自检方法根因（先于修复）**：上轮以全窗 1440px 目检宣布「全入画」——**错**：3D 可见视口 = 1440 − 面板 404 − 右缘 12 ≈ **1024px**（面板左缘实测 x≈1024），设备右部被不透明面板遮挡；标签探针不测「出画截断」 | 视口宽度误判 | 自检协议固化：截图后 sips 裁右缘 1/3 另存人验（`sips -c 900 480 --cropOffset 0 960`）+ 附视口宽度声明；证据 shots/r9-f00.png + r9-f00-rightcrop.png + r9-f00-leftwing.png |
| P1-1 复修（F0 右缘截断，上轮未修复） | 机位 X=1.5 时可见右缘 ≈ X+10.3 = 11.8 < 铭牌右缘 16.1（面板遮挡角 tan=0.422×tan33.54°≈0.28，机距 39） | F0/F11/X43_CAM0 pos/tgt 东移 **X=6.8**（[6.8,12,39]→[6.8,3,0]）：右缘 17.1 > 铭牌 16.1（余量 ~1.0 世界）；左缘 −18.4 < 桌左 −17.8（桌后角保住）——右裁剪图实证：试验盒/四态灯/收件屏全文字/铭牌两行完整、无贴边截断 |
| P1-2 增强（两翼暗部，上轮部分改善） | rim 光 intensity 9/7·decay 2 到达量不足（desk ≈0.15、device ≈0.15） | deskRim 26/d34、devRim 18/d26（到达量 ~0.44/0.39，≈3×/2.6×）——左翼裁剪图实证：打印机/纸堆/双匣/桌腿外形可辨、明暗层次在，deep-dark 基调未破（主对比仍在机柜） |
| P2-3' 390px 标签左右缘裁切 | 部件级标签 14 条在 390px 必然溢出 | JS 紧凑模式（innerWidth≤480 只显 zone+plate，机检可见集=[zone-sw,zone-hc,zone-dev,plate]）+ CSS 字号 0.85×（12.5→10.6px）——r9-phone.png 实证四标签完整无裁切 |
| P2-4' F5 表格卡附注左端微裁 | 附注 baseline py−34 贴卡底，F5 视角被钢卡座（y 2.93–3.03 前伸）遮左端 | 附注上移 py−56 + 起点右移 x26→34——r9-f05.png 实证「MPS=端口速度默认值（FS=8）」全文字完整 |

## 6. 登记项

- 演示样例：FS 设备 · USB2 根端口 1 · Slot ID=1 · 新地址 1（示例值，xHC 自选）。
- 单主题 deep-dark（设计档 §6 决策点：双主题留验收后追加）。
- 评分门（双 10 分制 ≥9）：**终审 PASS（2026-11-10）**——美学 9/10、逻辑 10/10，双维 ≥9；
  三轮轨迹：首轮 FAIL(8/9)→复修 1 FAIL(8/10)→复修 2 PASS(9/10)。P1-1/P1-2 经交付集全景
  两票独立交叉验证达成；逻辑面 11 条数值回溯+避雷七项三轮零回归。
- 门 3 双域实现 = anatomy drive.mjs（Runtime.consoleAPICalled + Log.entryAdded，DESIGN §8 2026-11-04 修订行先例）直接复用。
- 生成于 2026-11-10 · 构建工具 build.mjs 与源码 src/ 同目录（唯一事实源=study 仓本目录）。
- **评分门轮（2026-11-10）**：首轮 FAIL（美学 8/9、逻辑 9/9）→ 6 项修复（§5 台账）→ 复评（美学 8/9 维持、逻辑 10/10）→ **自检方法校准 + 复修 4 项**（P1-1 机位东移 X=6.8 / P1-2 rim 光增强 / P2-3' 窄屏标签紧凑 / P2-4' 附注避遮挡）→ 四门复跑全绿（sha d3c09af9… / shots 重出 / LABELPROBE-PASS / 语言门 ⊆豁免）——终审 PASS（见上登记行）。
- **流程面记录（终审轮，评审侧移交）**：复修轮 2 施工方两张自检裁剪图坐标口径再次错位（按整页 1440 裁而非视口 1024px），本轮判定未采信施工自检、由评审侧独立两票验证坐实——3D 件自检协议方向正确但施工侧执行仍不可靠，后续 3D 件验收以评审侧独立验证为准。随行 P2 打磨 4 条不阻塞交付（边缘余量/两翼材质微调/窄屏气泡/F5 附注右端）。
- **已知简化（主会话终验登记）**：页面零 `<a href>` 互链（契约 §5.3 互链项在新页未做成链接，互链门平凡通过）；上线含 shots//dev//src//vendor/ 全目录（shots 有先例，工具件随包不构成死链——若嫌线上杂可后续收 `_` 前缀目录自动不发布）。
- **自检协议（复评轮固化）**：3D 可见视口宽度 = 窗宽 − 面板宽 − 边距（1440 布局下 ≈1024px）；右缘入画判定 = 裁剪图人验，不以全窗截图/标签探针代替。

# S3-dsl-说明 —— scene.dsl.json schema 逐节说明

产出：2026-11-10 ｜ S3 worker ｜ 对象：`pipeline/scene.dsl.json`（v1.0.0，93.8KB）
依据：S2 主件 §A–§K＋S2-输出 §7 修复轮终态；标签/字段值事实源=S1。本文档是 schema 的字段级约定书：类型/单位/取值来源 § 号/双方消费者读法。

## 0. 全局读法

- **单位**：长度=wu、时间=s、速率=wu/s、角度=deg、颜色=sRGB `#rrggbb`；坐标=右手系 Y 上、+X 东、+Z 南（S2 §A.1）。
- **溯源三级**：① 分区内 `"s2"` 字段=S2 章节（个别标 `S1 §` 表示规范语义值出处）；② 本文档各表=字段级溯源列；③ S2 未给的值全部集中在 `meta.derived[]`（value/formula/basis），正文以字符串 `"derived:dXX"` 引用——**S4/S6 遇到 `derived:` 前缀一律先读 meta.derived 解析，禁止自行发明缺省值**。
- **bbox 语义**：`{x:[a,b], y:[c,d], z:[e,f]}` 开区间（边界相切不算重叠，承 S2 修复轮自检口径）；S2 给区间的件写 bbox、给中心/半径的件写 `pos+size/radius`，两种形态均不换算。
- **文本字段**：`text/front/back/plate.text/flow.from/to/nameplate` 等一律 S2 原文逐字，S4 直接渲染，不改写不精简。
- **机检**：`s3_dsl_check.py`（~/.cache/zcode-tmp/，一次性）已跑 248 项全 PASS：结构计数/五类引用完整性/标签 19 文本逐字对照/数值抽查 ~100 项。

## 1. meta —— 跨消费者口径

| 字段 | 类型/单位 | 来源 | S4 消费 | S6 消费 |
|---|---|---|---|---|
| dsl | 对象（版本/环节/消费者分工/源文档路径） | S3 产物元数据 | 读 consumers 确认取用面 | 同左 |
| units/coords/sceneBbox | 枚举＋区间 wu | §A.1 | 全局坐标系与 bbox 裁剪 | 导入时同口径 |
| render | fov 45/窄屏 64/窄屏断点 480px/全景视宽 1024px/窗宽 1440/面板 404/雾 exp2 #10151c 密度 0.012/背景渐变 | §A.1/§A.3/§A.5 | 相机+雾+背景 | 环境贴图打光参考 |
| speedModel | k∈{0.5,1,2} 默认 0.5；观看层 t=base/k、方波 ×k、UI 固定 0.25s、巡览层固定墙钟、动手台等待封顶 6s | §J.1 | tick 引擎的缩放骨架 | — |
| camAdapt | 全景类（距 ≥30：k=max(1.5,68/d)、目标西移 7）；近景类 k=1.16 | §A.1〔承 V2〕 | 窄屏适配层 | — |
| ui | 流转卡画布 540×224/标题 36px/小标 28px/「起 ▸…｜终 ▸…」格式/白底浮签（左色条=derived:d28）/主层 11px/细节层 7px/zoom 3.2×/细节层清单 | §D 总则/§I.1 条 3/4/§E.3 | HTML 标签与流转卡渲染 | — |
| derived | 34 条（§12 全表） | 见 §12 | 解析引用 | 解析引用 |

## 2. materials —— S6 消费段（＋S4 平色）

### 2.1 pbr[]（12 条，S6 主面）

| 字段 | 类型 | 说明 | 来源 |
|---|---|---|---|
| id | 串 | m 前缀，被 sceneGraph/rings/cable 引用 | S3 命名约定 |
| name | 串 | §E.7 材质名 | §E.7 |
| basecolor | hex 或 [hex,hex] | 单值或区间（桌面木 #6b4a2f–#7d583a）；mGridPlastic/mScreenGlass 为 null（S2 §F#10/#12 未给——S6 裁定，不发明） | §E.7/§F |
| metalness | 数 | 0–1 | §E.7 |
| roughness | [min,max] | 区间；灯罩单值 [0.3,0.3]；地板 0.34–0.50 承 V2 基准 | §E.7 |
| emissive | bool | 仅灯罩 true | §E.7 |
| textureRequest | 串 | → textureRequests.items[].id | §F |

**S6 读法**：每条 pbr=一张材质任务卡（贴图清单去 textureRequests 取，PBR 区间做 bake 校准）；**S4 读法**：纹理未回灌时按 basecolor/metalness/roughness 中值建临时标准材质（回灌后替换）——这是「S6 缺位时 S4 仍可施工」的降级路径。

### 2.2 flat[]（36 条，S4 主面）

| 字段 | 说明 | 来源 |
|---|---|---|
| id/hex/use | 平色/灯语义色/光束/告警/文字三级色，每色 S2 用途原文 | §E.1–E.3/E.5 |

### 2.3 lampSemantics[]（9 行）

设备四态＋槽五态灯的 on/off hex 与备注（Enabled=双色灯第二芯、DCBAA 小窗联动——S1 §6.2 编码复用 '0'，p87）。来源 §E.4。S4 读法：灯排实体的点亮/熄灭查表。

### 2.4 lampRowPlate / contrastPairs

灯排牌注原文（S1 §6.2）；对比度 22 对实测 ≥4.5:1＋白字 on #5f86e8 禁令（S4 的 HTML 铭牌配色约束）。来源 §E.4/§E.6。

## 3. sceneGraph —— 空间实体＋标签探针数据（S4 主面）

### 3.1 zones[]（3）

id/name/bbox/accent。来源 §A.2（左区 bbox x[-19.5,-9.6] 桌高 2.7–3.0；中区柜体 x[-5.5,7.5] z[-2.4,2.4] y[0,9.0]+顶檐 9.0–9.4；右区壳体 x[13.6,17.2] y[0.7,4.4] z[-1.5,1.5]）。S4：区标浮签与地板区带的落位依据。

### 3.2 entities[]（38 条）

| 字段 | 类型 | 说明 | 来源 |
|---|---|---|---|
| id/zone/kind | 串/枚举 | kind ∈ primitive/composite/light/fx | S3 命名约定 |
| shape | 枚举 | box/plane/cyl/sphere/panel/lampRow/group/line/trolley/beam/flag/disk/portal | — |
| bbox 或 pos+size/radius | 区间或数值 | S2 原值或 derived 引用（字符串 `"derived:dXX"`） | §A.2/§A.3＋d08–d27 |
| material | 串 | → materials.id；`derived:d32.*`=归属缺省表 | §E.7＋d32 |
| emissive/flip/translucent 等 | 数/对象 | 实体特有参数（状态窗自发光 0.35=§I.2；铭牌翻牌 Y 180°+FLIP_HOLD=§D F6/§I.2） | 各 s2 标注 |
| texts/plates[].text | 串[] | 状态窗三行/分刻牌/BSR 牌/FS 牌/端口牌/格架牌——S2 原文逐字 | §A.2/§B.2/§B.4/§A.3 |
| notes | 串 | 施工语义（避免 S4 误读） | — |

要点溯源：桌面五件 x 区间=修复轮终态（§A.2/§S2-输出 §7.1：打印机 [-19.3,-17.9]/钢卡座 [-17.5,-16.1]/托盘 [-15.7,-14.6]/收件匣 [-14.2,-12.8]/事件匣 [-11.2,-9.8]，相邻间隙 0.4/0.4/0.4/1.6）；y/z 区间=d08（引修复轮 bbox 自检口径）；门铃排/BSR/复位按钮/格架/双屏/槽态灯排 bbox=§A.2；端口四块 y=1.8/3.0/4.2/5.4 z[0.4,0.9]=§A.3（端口 1=USB2、端口 2=USB3 标注〔场景约定·承 V1〕）；门架=§A.4＋d09 截面；设备四态灯/收件屏/铭牌/顶灯罩=§A.2＋d07/d27/d10。

### 3.3 lights[]（5）

吊灯/机柜顶主灯（暖光定性，hex S2 未给→null 注记，S4 取暖白档）/设备射灯 [17,11,6]/deskRim #aebfd8 强 26 @[-19,7.5,-3]/devRim #b9d8ae 强 18 位置=d11（距 26 wu 推导）。来源 §A.3。

### 3.4 labels[]（19 条，判⑥探针扩检输入）

| 字段 | 说明 | 来源 |
|---|---|---|
| id/text | §I.3 原名与原文（机检已逐字对照 19/19 PASS） | §I.3 |
| anchor | wu 三元组；lbl-erdp=dynamic（随旗） | §I.3 |
| host | 宿主实体/环/缆 id | — |
| barClass | zone/part/anchor → d28 左色条三档 | §E.3＋d28 |
| neighbors | 几何邻居（须测 bbox 交）——探针原逻辑（标签互叠）之外的新维度 | §I.3 |

**S4 读法**：标签探针按 `overlap>0.15=0 对` 判定，neighbors 参与扩检；lbl-tray 锚点 (-15.2,3.8,0) 与邻居（收件匣西壁/卡座东壁）为修复轮终态。

## 4. rings —— 三环（S4 主面）

### 4.1 common

| 字段 | 值 | 来源 |
|---|---|---|
| center | [0.5,0] | §A.4 |
| radius/tubeRadius | 4.6 / 0.14 | §A.4/§B.1 |
| slots/slotArcGap | 12 / 2πR/12≈2.41 wu | §A.4/§B.1 |
| slotFormula/slotWorked | d01 公式＋slot0/1/5/6/7 五个算例 | §A.4 约定推导 |
| cardSize/cardBillboard | [1.24,0.56,0.06]；每帧 lookAt、仅 +z 贴字、断言 fwd·toCam≈1.00 | §B.1/§I.1 条 3 |
| linkSlot/linkSlotBase/linkArc | slot0=Link 槽（琥珀槽底）；弧半径 5.5、拱顶公式=d30、弧上 cycle 翻色（时长=d14） | §B.1 |
| cycleColors | PCS=1 绿 #86bd7a ↔ 0 琥珀 #d9a860，初值 PCS=1 | §B.1＋S1 §4.3（xhci-mem.c:314–329） |
| deckColor/railColor | #5d6875 / #8fa3b8 | §E.2（V2 可辨性修复值） |
| flag | 读指针小旗；步进=STEP；事件环旗=ERDP 推进 | §B.1/§B.3＋S1 §4.4 条 6 |
| clearance | 层间净空 1.8 wu；事件环置顶让位走廊 | §A.4 |

### 4.2 rings[]（3 条，按层高集合无序，id 承载语义）

每环：id/layerY/accent/nameplate/label/entry（slot+方向+来源+param）/exec 或 consumer/bell（target+牌文原文+s1）/cards[]/linked[]（连接建筑元素）；命令环另带 unique+noReceiptOnRing（S1 §4.1 避雷）；事件环另带 steps（slot1 步进 5 格→slot6）/irq（闪线+轮询滑车双形态+S1 §4.5）/erdp/ccWhitelist（Success=p74、Parameter Error=p100）；EP0 环另带 write（slot 5/6/7、DMA、PCS=1 起）/fsGate/dcbaaBeam/tickets。来源 §B.2–B.4/§B.6。

### 4.3 connectionMatrix（3 行）

§B.6 原表逐行（环/入位/出位/建筑元素）。

**S4 读法**：三环几何由 common 公式生成；卡/旗/弧的动画参数查 timeline.params；门铃联动读 bell.plate 与 doorbellRow 实体。

## 5. cable —— 实体缆与信号（S4 主面）

| 字段 | 值 | 来源 |
|---|---|---|
| curve.points | 5 控制点（13.7,1.2,0.55)→…→(8.15,1.8,0.65) | §C.1 原值 |
| curve.tubeRadius/material | 0.13 / mCableRubber | §C.1/§E.7 |
| plugs | 端口侧 at (8.15,1.8,0.65) 嵌 port1；设备侧 (13.7,1.2,0.55)+法兰+端子两枚 | §C.1 |
| signal.segment | 段长 2.2/半周期 0.28/每段 ~8 齿/振幅 ±0.16/管径 0.055 | §C.2 |
| signal.speed | 4.5 wu/s ×k；全程≈1.3s=d29（运行时按曲线实长/速率） | §C.2 |
| signal.colors | 东 #e8b562/西 #86bd7a/空闲 #3d4c61 | §C.2/§E.2 |
| signal.arrows | 首尾各一枚锥体 r0.12 长 0.3，语义=传播方向 | §C.2 |
| signal.semantics | SET_ADDRESS 东（xHC 代发）/GET_DESCRIPTOR 东/8 字节西/SET_CONFIGURATION 东 | §C.2＋S1 |
| signal.forbidden | 软件从不直接向设备发 SET_ADDRESS——禁画法 | S1 §7.2 条 5 |
| signal.disclaimer | 方波教学示意声明（F0 卡注） | §C.2 |
| signal.tickets | 缆上票据与方波同相行进 | §C.2 |

## 6. corridor —— 空中走廊（S4 主面）

| 字段 | 值 | 来源 |
|---|---|---|
| curve.points | 5 控制点 (−4.1,13.6,0)→…→(−11.5,4.1,0.8) | §I.4 原值 |
| endHover/landingTarget | 悬浮点=末点原值；落点=d15（事件匣顶面中心，修复轮坐标推导） | §I.4＋d15 |
| landingParam/then | CORRIDOR_LAND→hold(HOLD)→fade(FADE) | §J.2 |
| assertions | startSeg：自起点（slot 6 卡位）至净距首次达到 1.2 wu 之处的爬升段——豁免净距下限（卡停槽内距轨道 0 属常态）、只查 y 单调上升；cruiseSeg：自该点起至落地——采样点距三环轨道管表面 ≥1.2 wu；global：全程 y≥4.0、西行段 x≤−7.5 方允许降高 | §I.1 条 5/§I.4 原口径（弧长 <1.0 wu 分段）＋**主会话裁定 2026-11-10**：分段点改为「净距首次 ≥1.2 wu」、起步段只查 y 单调升（S4 页内 corridorCheck 随后同步单口径） |
| proofCamera | corridorProof 机位、卡入走廊中段再拍 | §I.2 |

## 7. cameras —— 机位（S4 主面）

- `defaults`：fov 引 meta、飞行=FLY、近景 0.9s〔设计参数〕（§J.2）。
- `list[]`（17 条）：F0–F11＋rings＋corridorProof＋labL1＋deviceCloseup/deskCloseup（后两条 derived 缺省档，取证近景用）。每条 pos/tgt 逐值；给值域的带 posRange；F0/F11 带 tol ±0.5；adapt ∈ panorama/closeup。来源：§D F0–F11（F5/F8 tgt=修复轮终态）/§I.2/§G L1/§A.5。**F2/F3/F6/F9/F10=S4 评分⑥ FAIL 修复补丁机位（主会话授权 2026-11-10，推导判据在各条 derived 注记）**：F2=[-7.0,6.5,20]/[-7.0,5.0,0]（状态窗与 USB2 屏横跨 20 wu，仅远机位可同视野）；F3=[4.8,5.8,14.5]/[3.6,4.4,0.2]（拉远+tgt 上移，四信号读数离上缘留头部空间）；F6=[11.5,5.0,15.5]/[10.5,3.6,0.5]（翻牌/顶灯入画＋BSR 牌免柜棱遮挡）；F9=[-9.5,9.0,15]/[-8.5,7.5,-0.5]（EP0 西段+收件匣同视野）；F10=[8.0,7.0,20]/[7.2,3.8,0.5]（槽态灯排与设备灯排同视野）。补丁机位值域由新基线派生。
- `narrow390`：390px 窄屏加拍（§A.5）。
- `f0Check`：1024px 口径/必入画 7 项/右缘余量 ≥1.0（铭牌右缘 **16.6**——2026-11-10 主会话追认 S4 改值 16.1→16.6；16.6=d27 铭牌宽 2.4 中心 15.4 的几何右缘，S2 §A.5 原 16.1 与之不自洽）/裁右缘 1/3 人验协议/三方验证责任。来源 §A.5＋追认注记（授权链已补记进 DSL rightMargin 字段）。

**S4 读法**：工段切换按 timeline.stages[].camera 取机位，飞行时长 FLY（近景机位 0.9s）；F0/F11 完整性按 f0Check 复拍。

## 8. timeline —— 时间轴状态机（S4 主面）

### 8.1 params[]（36 行=§J.2 全表）

`{id,name,base,at05,at2,rule,note?,use[]}`。rule ∈ `/k`｜`×k`｜`max(1.2, HOLD_SET/k)`；id 与 §J.2 行一一对应（FLY…LAMP_BREATH），数值抽查 35 项 base 全 PASS。UI 固定 0.25s/动手台封顶 6s 在 meta.speedModel（§J.1）。

### 8.2 stages[]（F0–F11）

| 字段 | 说明 | 来源 |
|---|---|---|
| id/step/title/page | 工段号/规范步号（规范化步号，不照抄伪编号）/标题/页码 | §D 各工段＋S1 §1.1 |
| camera | → cameras.list | §D |
| moves[] | 动作原语+param 引用（deviceSlideIn/plugPush/bellPress/cmdFly/dmaBeam/trbPlace/ticketEast/corridorFly…）；param=`derived:` 时先解析 | §D/§J.2 |
| state[] | 读数/灯/槽态变化，规范语义值逐条带 s1 锚（如四信号 PRC=1/PED=1/PR=0/PLS=U0=S1 §2.2） | §D＋S1 |
| flow[] | 流转卡：from/to 小标逐字（S4 直接渲染画布 540×224）＋route 路径模板串 | §D 总则 |
| panel | 面板要点（文案含 S1 锚） | §D |
| physical | 物理动作感瞬间 | §D（意见⑤） |
| occlusion? | 工段级遮挡预案（F4：细节层+关键值 HTML 浮签+billboard） | §I.2 |
| variants? | 预设变体（usb3/hs/ss/bsr1/linux 的覆盖差异） | §D/§B.7 |
| teachingAnchor? | 三方教学锚（F6） | §D F6 |
| tryError? | 试错入口（F5：Parameter Error 红牌+输出上下文卡不动） | §D F5/§H |

工段总时长不写死（d31：S4 播放器按 Σmoves+flow 链排程）。

### 8.3 tour（F12）

自动巡游巡回回 F0，票据与灯保留一拍再清，不占底栏工段位。来源 §D F11 补充。

### 8.4 branches

chips×5（全速〔默认·规范建议路径〕/高速/USB3/BSR=1 legacy/Linux 实路径）＋overrides（每预设的工段差异：hs 置灰 F7/F8；usb3 F1 无 Disabled 帧；bsr1 F6 旋钮 1 位无票据槽态灯→Default；linux=Enable Slot 不变→BSR=1→读 8B→BSR=0 补编址）＋contrastCards（全速 F7/F8 挂「Linux 实路径」对照卡三点差异；linux F8 注记卡原文）＋noMixRule（差异只在注记卡文字层、两卡永不合成）。来源 §B.7/§H。

## 9. interactions —— 动手台三关（S4 主面）

- `decouple`：独立状态机（X43Lab 形态：纯状态机+setRender 钩子）/主线照常可用/判分不写回主线/练习触发同一 movers 库/入口=lab tab/等待封顶 6s。来源 §G/§J.1。
- `L1`：入口卡片「按门铃」/机位 labL1/呼吸高亮引导/inputs（knob1 正确；knob0 与空槽的失败提示逐字）/feedback（BELL_PRESS+STEP+活文案+徽章「门铃上手 ✓」）。来源 §G L1。
- `L2`：六步 s1–s6（选项组+正确值：80h/6/0100h/8/wIndex=0；TRT=3/IDT=1/IOC=0；DIR='1'/Len=8/CH=0；DIR='0'/Len=0/IOC=1/Buffer=0；Setup→Data→Status、PCS=1；DB Target=1 对干扰项 0；Success 回执；新 MPS=8），每步 fail 提示逐字；模式=选项高亮+即时纠错、错选不推进；徽章「控制读三段齐 ✓」；L2 徽章=L3 入门票。来源 §G L2（字段值=S1 §3.2 逐值）。
- `L3`：T1（正确=命令环+DB Target=0+判分依据+Slot ID=1 回执演示）/T2（BSR 双分支各自结局、不混写）/T3（四卡排序，正确序=S1 §6.3 hub.c:5056–5061，判分后展示对照卡）；模式=无高亮无前置提示、统一判分、三任务全对给徽章「值班工程师 ✓」。来源 §G L3。
- `quiz`：F11 讲解 tab，3–5 题 A/B/C，≥4/5 通过可重做；入口=derived:d33（自由进入）；题面 S2 未给原文——S4/S5 自 S1 拟题（topics 6 项带 S1 章节映射）。来源 §K＋S2-评分⑧ remark。
- `progression`：八级阶梯＋f0Gate=d33（不设通过门）＋递进原则。来源 §K。

## 10. panel —— 面板（S4 主面）

| 字段 | 内容 | 来源 |
|---|---|---|
| live | 活指标四项（设备状态/槽状态/PLS/回执 n）+RuntimeStatus 活文案行 | §H |
| controls | 速度选择器 {0.5,1,2} 默认 0.5；停留滑杆 HOLD_SET 1.5–4.0 默认 2.0 | §H/§J.2 |
| tabs.explain | 工段标题+进度/正文卡组/播放控制四键/预设 chips×5/试错按钮（F5 出现）/自测题（F11） | §H |
| tabs.fields | fieldCards 三张（三 TRB 字段组=§3.2 逐值；EP0 九字段=§5.1；槽状态五行表=S1 §6.2 Table 4-1 五行全值，本 DSL 已内嵌）＋quotesSix（6 条，p71–76，取 S1 原句，清单定稿留 S5）＋流程原理＋numericTable 九行（S1 §8.2 口径，本 DSL 已内嵌） | §H＋S1 |
| tabs.lab | L1/L2/L3 卡片+徽章架（已得徽章常亮）+练习区 | §G/§H |
| tabs.display | 剖视/标签/粒子开关+速度选择器+停留滑杆+「回到工位」+窄屏紧凑标签说明 | §H |
| narrow | ≤480px：面板初始折叠+半高贴底；紧凑标签可见集=[zone-sw,zone-hc,zone-dev,plate] | §H |

## 11. textureRequests —— S6 任务书（S6 主面）

- `policy`：程序化生成（Blender 节点+bake）/PNG 导出（albedo sRGB、其余 Non-Color）/尺寸档（hero 1024²、次 512²、小件 256²）/base64 预算 ≤+1.5MB 砍序（先小件 normal/ao 后 hero 面）/做旧三件套判据/验收（近景放大+桌面行亮度标准差 ≥40+V3 节疤局部 ≥55）。来源 §F 通则。
- `items[]`（12 条）：no/id/material（→materials.pbr）/target/maps[]（type+px+注）/aging[]/guidance（Blender 程序化指引原文）。来源 §F 表 #1–#12。

**S6 读法**：逐条=独立任务卡；交付 PNG→压缩 base64（预算与砍序按 policy）；回灌时更新对应 materials.pbr（贴图路径或内嵌数据），PBR 区间做 bake 校准。

## 12. meta.derived 全表（34 条，S2 未给值的唯一合法入口）

| id | 推导值 | 推导式（摘要） | 依据 |
|---|---|---|---|
| d01 | slotPos(i)=[0.5+4.6·cos30°i, y, −4.6·sin30°i] | 俯视自 +X 逆时针 30°/槽 | S2 §A.4（slot0 东/slot6 西/逆时针/R/12 槽） |
| d02 | 门铃布局：knob0 (-4.18,1.7,2.4) r0.42；小钮 r0.28；间距 0.823；centers 7 个 | 行西端+边距 0.2+r；小钮=大钮×2/3；剩余跨度七等分 | S2 §A.2（尺寸未给部分） |
| d03 | 分刻牌锚 A/B | 各自旋钮 x、排顶+0.4、浮签层 z2.6 | S2 §B.2/§B.4 文案原值 |
| d04 | BSR 旋钮 r=0.4 | bbox 组 B y 跨 1.8–2.6 | S2-输出 §7.1 |
| d05 | 槽态灯排：r0.3/y8.4/五格心 | x[-2.6,2.6] 五等分；顺序=S1 §6.2 建模提示 | S2 §A.2＋S1 §6.2 |
| d06 | 格架格心：列宽 0.95/行高 1.2/阅读序编号/牌位 | 面板宽高均分 | S2 §A.2（编号走向缺省） |
| d07 | 设备四灯：r0.24/y3.9/z1.5/格心 4 个 | 壳正面四等分 | S2 §A.2/§E.4 |
| d08 | 桌面件 y/z 区间＋桌深 z[-2.2,2.2] | 修复轮自检用值 | S2-输出 §7.1 |
| d09 | 门架柱截面 0.3×0.3/柱顶 13.8/梁 x[-4.45,5.45]×z±4 | 柱心±0.15 外推 | S2-输出 §7.1 组 C |
| d10 | 吊灯/顶灯 r0.6、顶灯罩 r0.4 | 灯具外廓 | S2-输出 §7.1 组 C |
| d11 | devRim pos [24.5,9.0,23.4] | 设备中心+26·(0.35,0.25,0.90)，模长 26 | S2 §A.3（距 26，方向缺省 rim 位） |
| d12 | 复位按钮 r=0.3 | bbox 组 B x 跨 0.6 | S2-输出 §7.1 |
| d13 | 卡库 bbox x[-5.3,-4.9] y[4.0,5.0] | 贴面近似+z 缺省 | S2 §A.2＋§7.1 组 B |
| d14 | 微动作缺省 0.5s（MPS 翻新高亮/事件匣开匣/Link 翻色共用） | J.2 打勾 0.4 与复位按钮 0.6 算术中值 | S2-评分⑤ P2-1 |
| d15 | 走廊落点 [-10.5,4.2,-0.3] | 事件匣顶面中心（修复轮匣坐标） | S2 §I.4＋§7.1；失配备案见 S3-输出 §7 |
| d16 | 状态窗板 x[-19.6,-16.4] y[4.2,5.4] z=-2.0 | 中心 -18 板宽 3.2 厚 0.08 缺省 | S2 §A.2/§I.2 |
| d17 | 闪线终点 [-16.6,5.2,-1.9] | 状态窗板东上部前方 | S2 §B.3 |
| d18 | 贴面板厚缺省 0.08 wu | 与 TRB 卡厚 0.06 同量级 | S2 §B.1 量级参照 |
| d19 | 端口块凸出 0.35/y 半高 0.2 | 缺省档；y/z 中心为原值 | S2 §A.3 |
| d20 | AO 盘：设备 r1.9/桌面 r1.6 | 水平包围对角半径×0.8 | S2 §I.2 近景×2 |
| d21 | 地板区带：三区 x 外扩 1.0、z[-6,8] | 区带范围缺省 | S2 §E.2 三色 |
| d22 | 桌腿：四角内缩 0.4/截面 0.3 | 缺省档 | S2 §A.2 |
| d23 | 滑入路径：x22→13.6 沿 -X 直线 | 姿态不变 | S2 §A.2/§D F1 |
| d24 | 插头弧顶抬升 0.4 | 直线中点上方缺省 | S2 §C.1〔承 V2〕 |
| d25 | DMA 光束三用点端点 | 卡座/托盘顶面中心→slotPos(7)/slotPos(5) | S2 §B.5＋d01 |
| d26 | FS 闸口 pos/size | 锚点下方 0.6、EP0 西段外侧 | S2 §B.4/§I.3 |
| d27 | 铭牌 2.4×0.5×0.06/收件屏 1.8×0.9×0.08/顶盖 y[4.3,4.4] | 缺省尺寸档 | S2 §A.2（尺寸未给） |
| d28 | 左色条：zone 琥珀/part 灰 #6b7684/anchor 绿＋分类 | 区标 3/教学锚 5/其余部件；灰档复用 E.4 | S2 §E.3/§I.3 |
| d29 | 缆长约 5.9 wu→全程 ~1.3s@1× | 折线+曲率修正；运行时按实长 | S2 §C.2 |
| d30 | Link 弧拱顶 [5.81, y+0.9, −1.42] | slot11/slot0 中分角 15°、半径 5.5 | S2 §B.1（R+0.9 上拱） |
| d31 | 工段时长=Σ动作+flow 链（不写死） | 播放器排程规则 | S2 §D/§J |
| d32 | 桌面件/格架/檐等材质归属缺省表 | §E.7 材质族就近归属 | S2 §E.7 |
| d33 | 行为默认：F0 不设通过门/quiz 自由进入 | scorer 建议显式化 | S2-评分⑧ remark |
| d34 | 柜面浮签层 z=2.6（浮高 0.2） | §I.3 柜面锚点 z 一致性 | S2 §I.3 |

**derived 纪律**：每条=「值+公式+依据」三元组；正文引用只写 `"derived:dXX"`；S4/S6 不得绕过本表自行取缺省值——发现缺口时回 S3 补条目（或报主会话裁定），禁止就地发明。

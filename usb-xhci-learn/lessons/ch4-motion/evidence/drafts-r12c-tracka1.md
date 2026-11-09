# R12 批 C · TrackA-1（§4.11 前六支场景源码+帧表迁移+三门 · 2026-11-09）

> 内容判据全部出自 evidence/spec-411.txt（1707 行=规范 §4.11 全节，页标
> [PAGE 188-218] 行内嵌；行号=切片内行号，引文窗不跨 PAGE 标）。场景文件头
> 注释=逐条引文判据（EN 原文逐字+切片行号+页码）。上屏 EN 引文已机核
> 37/37（空白折叠+直/弯引号字形归一+折行连字符归一后为切片子串，探针
> ~/.cache/zcode-tmp/r12c_quote_check.py）。渲染/部署/smoke_player 归主会话。

## ① xh1101 §4.11 导语+4.11.1 TRB Template+4.11.1.1/.1.2（1377f · beats=53 · pace fast=0 · probe viol=0 · scan ok）

- 上屏论断↔切片行号（spec-411.txt）：
  - 本节定位（chip）："This section discusses the properties and uses of
    TRBs that are outside of the scope of the general data structure
    descriptions that are provided in section 6.4." ← **L2-4**（p188）
  - 模板三组件（chip）："TRBs adhere to the generalized template
    illustrated in Figure 4-13." + "A TRB consist of 3 basic components:
    Parameter, Status, and Control." ← **L7, L27-28**（p188）
  - Figure 4-13 语义重建卡（5 行 trb 卡：Parameter=Dword 0-1 字节
    00-07H / Status=Dword 2 / Control=Dword 3 / TRB Type=bits 10-15 /
    Cycle=bit 0）← 图标签面 **L9-26** + 4 Dwords **L55** + TRB Type
    bits 10-15 **L37-39** + Cycle bit 0 **L48-49**
  - 4.11.1.1 通则（chip）：producer=system software/consumer=xHC +
    建环初始化 ‘0’ + xHC 只读 ← **L31-36**（p188）
  - TRB Type 定格式+C 位定环序（chip）← **L37-39, L46-49**（p188-189）
  - ENT 标志（note）：不预取时强制评估下一 TRB、不跨 TD、CH=‘1’ 才有效
    ← **L50-54**（p189）
  - 原子写 Note（chip）：4 Dwords 非原子写时 Parameter/Status 须先于
    Control 初始化，违者未定义行为 ← **L55-58**（p189）
  - 总线事务 IMPLEMENTATION NOTE（note）：单次原子事务读写、至少 16 字节
    原子读、可 64B 取 4 支 ← **L63-70**（p189）
  - 4.11.1.2 Event 族反转（chip）：xHC 生产/软件消费+初始化 ‘0’+软件只读+
    TRB Type bits 10-15 ← **L73-81**（p189）
  - 两族同构收束（note）：TRB Type 定格式+C 位定 Enqueue、事件环管理见
    §4.11.3 ← **L37-39, L79-84, L85**（p189）
- 档位：任务档 中 800-1400f，实绩 1377f 落档内。

## ② xh1102a §4.11.2 导语+4.11.2.1 Normal TRB（1067f · beats=45 · pace fast=0 · probe viol=0 · scan ok）

- 上屏论断↔切片行号（spec-411.txt；Table 6-91/6-92 降密度全表归 landing）：
  - TD 定义（chip）：工作项=TD（一至多支 Transfer TRB）+软件生产/xHC 消费
    ← **L94-98**（p190）
  - 完成事件条件（chip）："one of 4 conditions"（规范原文计数口径）+
    三条枚举（IOC/短包+ISP/错误）+CC 指 Success 或因由 ← **L99-109**（p190）
  - IOC 惯例（chip）：惯设 TD 末位最小化事件与中断 ← **L110-111**（p190）
  - 环数（note）：MaxPStreams=‘0’ 一环/>‘0’ 多环+表 6-91/6-92 归 landing
    ← **L112-115**（p190）
  - 完成判定唯一通道（chip Note）：只认 Transfer Event、禁 Frame ID/
    MFINDEX 推断 ← **L116-118**（p190）
  - Normal TRB 用途与方向（chip）：Bulk/Interrupt 专用+散聚+Isoch/Data
    stage 补位；方向随端点上下文或前序 Data Stage TRB（"depends on the
    direction defined by"）← **L122-127**（p190-191）
  - Chain 位（chip）：四型可置 ‘1’ 成多 TRB TD、散聚拼虚拟内存页/字节对齐
    ← **L128-131**（p191）
- 档位：任务档 小 450-1000f，实绩 1067f 超上限 67f（+6.7%，xh1001 +7.7%
  先例记档不返工）——判据链（TD 定义/三条件/IOC/环数/唯一通道/用途/链位）
  全覆盖不砍。

## ③ xh1102b §4.11.2.2 控制三阶段 TRB（1860f · beats=72 · pace fast=0 · probe viol=0 · scan ok）

- 上屏论断↔切片行号（spec-411.txt；Figure 4-14 语义重建、Table 4-7 讲
  两代表行全表归 landing）：
  - 三阶段 1:1（chip）：setup/可选 data/终止 status 三阶段与三型 TRB
    1:1 映射 ← **L143-147**（p192）
  - SETUP 8 字节（chip+Figure 4-14 重建卡）：SETUP 包=8 字节结构、映射进
    Setup Stage TRB Parameter；卡五字段 bmRequestType/bRequest/wValue/
    wIndex/wLength ← **L152-155, L156-182**（p192）
  - TD 构成五规则（chip）：环可含 Setup/Status TD 可选 Data；Setup TD=单
    TRB；Data TD=Data Stage TRB 链 0..n Normal/Event Data；Status TD=单
    TRB 可选链 Event Data；一切控制传输 Setup→Status、软件插 Data；
    “No-data” 无 Data TD ← **L185-204**（p192）
  - Setup TRB 三铁律（chip）：IDT=‘1’+Parameter=8 字节+Length=‘8’+软件
    负责取值 ← **L211-220**（p192-193）
  - DIR 一致性（chip）：Data/Status DIR 与 DTD/wLength 对 Table 4-7 一致；
    一对 Setup/Status 间至多一个 Data TD ← **L222-228**（p192-193）
  - Table 4-7 两代表行（卡 3 行）：H2D wLength>0→Data=OUT/Status=IN；
    D2H wLength>0→Data=IN/Status=OUT；wLength=0→无 Data TD/Status=IN
    ← **L239-256**（p193）；DIR Notes（note）：Status DIR=回执方向、Data
    DIR 管全 TD、USB2 定 PID/USB3 走 Status TP ← **L257-267**
  - Data TD 总长（chip）：不连续链 Normal；Length 之和=wLength；非合规
    设备例外；xHC 严格按 TRB Length ← **L268-283**（p193-194）
  - Status 事件三类（chip）：Success/Stall Error/其它错误+Success 语义+
    Stall 语义+超时用 Stop Endpoint 中止 ← **L285-297**（p194）；Busy
    Note（note）：设备忙回 Busy、xHC 无限期等待 ← **L298-301**
  - 不查六条件（note a）：wLength=‘0’ 有 Data TD / 无 Status TD /
    wLength>‘0’ 无 Data TD / 总量≠wLength / Data DIR 不符 / Status DIR
    不符 + 脚注38 TRT 严格指示、wLength 应忽略 ← **L302-332**（p194）
  - 不强查三条件（note b）：Status 不跟 Data、Setup Length≠8；真查则报
    TRB Error ← **L326-346**（p194）
  - SET_ADDRESS 陷阱（chip）：bRequest+bmRequestType 四条件命中→不发 USB、
    报 TRB Error、唯一被拦标准请求、不 stall ← **L348-356**（p194）
  - 中止+错误码+建议（chip+note）：Stop Endpoint 中止+善后；SS STALL TP
    →Stall Error、USB2→USB Transaction Error ← **L358-372**（p194）；
    IMPLEMENTATION NOTE：EHCI 泛化重试/NAK 计 CErr、USB3 NRDY 按
    Transaction Error 重试 CErr 次+STALL halt ← **L375-386**
- 档位：任务档 大 1200-1800f，实绩 1860f 超上限 60f（+3.3% 记档）——12 拍
  判据链全覆盖；pace 两轮定向收紧 80.8s→62.0s（含合并两对紧邻拍）后仍
  +3.3%，判据不砍。

## ④ xh1102c §4.11.2.3 Isoch TRB（1487f · beats=62 · pace fast=0 · probe viol=0 · scan ok）

- 上屏论断↔切片行号（spec-411.txt）：
  - TD 构成（chip）：Isoch TRB 链 0..n Normal、方向随端点上下文
    ← **L395-400**（p195-196）
  - 带宽契约（chip）：描述符四参=QoS 契约、每 Interval 至多 Max ESIT
    Payload 字节、xHCI 通用化四字段+软件换算 ← **L401-416**（p196）
  - 单 Interval+消费节奏（chip）：TD 只活一个 Interval、首 TRB 恒 Isoch、
    >64K/不连续链 Normal、每 Interval 消费一个、IST 前挂环 ← **L417-425**
    （p196）
  - OUT/IN 空环双事件（chip）：OUT=不调度+Underrun；IN=数据丢+Overrun；
    两态都保持 Running+移出 Pipe Schedule ← **L426-437**（p196）
  - 门铃复启（note）：只报首个空环 Interval+下次敲门铃复启 ← **L438-439,
    L448-449**（p196）
  - MSE+三事件格式（chip）：赶不上期限报 MSE+三事件走 Transfer Event TRB
    格式 ← **L450-455**（p196）
  - Frame ID/SIA（chip）：SIA=‘0’ 帧号对 MFINDEX bits 13:3、值域 0-2047、
    SIA=‘1’ 忽略帧号尽快调度 ← **L456-464**（p196）
  - 服务间隔对齐（note）：Interval=‘1’ 2 微帧低位=0 起、‘2’ 4 微帧低两位=0
    起 ← **L465-469**（p196）
  - TBC/TLBPC（公式卡+note）：预告包数免读全 TD；TBC=ROUNDUP(TDPC/
    (MaxBurst+1))−1；TLBPC 余 0→MaxBurst 否则余−1；ETC+ETE 上限 32 否则
    3；LEC 缺席禁开 ETC、LEC=1 ETC=0 上限 64KB 超限作提示 ← **L470-502**
    （p196-197）
- 档位：任务档 中 800-1400f，实绩 1487f 超上限 87f（+6.2%，xh1003 +12.1%
  先例内记档）——pace 两轮收紧 61.0s→49.6s（含合并 OUT/IN 空环一拍）。

## ⑤ xh1102d §4.11.2.4 TD Size（1087f · beats=41 · pace fast=0 · probe viol=0 · scan ok）

- 上屏论断↔切片行号（spec-411.txt）：
  - 定义（chip）：剩余待调度包数+xHC 免读全 TD 估规模 ← **L505-509**（p198）
  - 包数公式+逐 TRB 记账（双 chip+note）：TDPC=ROUNDUP(总量/最大包)；PT(n)=
    ROUNDDOWN(LengthSum(n)/MaxPacket)；Residue(n)=LengthSum(n)−(MaxPacket×
    PT(n))；x/n 定义+Residue 恒小于最大包 ← **L511-528**（p198）
  - 末位置 0+5 位封顶（双 chip）：TDSize(x)=‘0’ 显式收口；TDSize(n)=IF(
    TDPC−PT(n)>31,31,TDPC−PT(n)) ← **L529-533, L539-546**（p198-199）
  - 短包+ETE（note）：末位 Residue>0→收尾 Short Packet；ETE=‘1’ 时 Isoch
    TRB 无此字段 ← **L547-551**（p199）
  - 算例走读（卡）：MaxPacket=1024/总量 5120B/TDPC=5；TRB1 len2048→PT=2
    TDSize=3；TRB2 len2048→PT=4 TDSize=1；TRB3 len1024→PT=5 TDSize=0 ←
    公式 **L511-546** 的代入实例
- 档位：任务档 小 450-1000f，实绩 1087f 超上限 87f（+8.7%，xh1004 +17.7%
  先例内记档）——五公式+短包/ETE 注记+算例全覆盖，合并两对紧邻拍
  （公式+记账、末位 0+封顶）后仍超。

## ⑥ xh1102e §4.11.2.5 Frame ID+.5.1 ESIT Rules+.5.2 Resync（1480f · beats=51 · pace fast=0 · probe viol=0 · scan ok）

- 上屏论断↔切片行号（spec-411.txt）：
  - 定义+上限（双 chip）：帧号定起始帧、SIA=‘0’ 才有效；End Frame ID=
    (MFINDEX+895ms) MOD 2048、为 MSE 管理而设 ← **L555-562**（p199）
  - 下限+取模（chip+note）：Start Frame ID=(MFINDEX+IST+1) MOD 2048、IST
    微帧定义时向上取整到帧界、给足取数时间；模 2048=MFINDEX Frame Index
    位宽 ← **L570-576, L583-584**（p199）
  - 有效帧窗+CFC=1（note+chip）：MSE 丢 TD 后推进重同步、有效窗判跳过/
    执行；CFC=‘1’ 逐 TD 对帧号、1.1/1.2 强制支持 ← **L563-569, L585-599**
    （p199-200）
  - CFC=1 快进+留窗（note）：可快于服务间隔推进；留空窗=帧号间隔、xHC
    暂停直到匹配；软件宜全 TD 设帧号 ← **L589-597**（p200）
  - CFC=0（note）：只认首 TD 帧号、MSE 不终止流→无法判定后续 TD 窗口；
    只在首 TD 设帧号、后续全 SIA=‘1’；留窗须环空触发 Overrun/Underrun
    再重启 ← **L600-616**（p200）
  - ESIT≥1ms（chip）：帧号落 ESIT 边界（4ms→0/4/8/12）；TD 在帧号起的
    ESIT 内任意时刻传（FID=4→Frames 4-7、不早于 4 不晚于 7）← **L617-625,
    L632-637**（p200）
  - ESIT<1ms+重同步（双 note）：同帧同号至多 8 连（250µs→四支一组
    0,0,0,0/1,1,1,1）；帧号翻转处 TD 下一帧首 ESIT 起传+非帧首起流不支持；
    失同步=MSE 后推进到恢复或环尽、跳过 TD 不搬数据但逐支报 MSE；期间
    事件不丢（Link TRB IOC=1→Success、Event Data/Normal IOC=1→MSE）←
    **L638-659, L660-674**（p200-201）
- 档位：任务档裁定 中 800-1400f（R12-SPEC §3 原估巨头档系 TOC 误判
  4.11.2 五型各一小节、实际 .2.2 三型合一——按实际小节边界落中档，偏差
  记档如任务稿预告），实绩 1480f 超上限 80f（+5.7% 记档）——.5/.5.1/.5.2
  三小节判据链全覆盖，合并两对紧邻拍（定义+上限、有效窗+CFC1）后仍超。

## ⑦ 注册·迁移·门禁记录（TrackA-1）

- **renumber 帧表迁移**：12 对倒序 `49=60 48=59 … 38=49` 全过 VERIFY-OK
  （指纹自比对 total/beats/distinct sha256 不变；frames-60=xh1002p 950f/25
  与批 B EVIDENCE 对位核验、frames-49=ch41p beats=38 与 BEATS_EXPECT 对位
  核验）；空洞 38-43 由 scan 新产、44-48/61-62 留波次 2（xh1103-07/
  xh1102dp/xh1102ep）。
- **render.ts**：import 块+scenes 数组扩六支（注释「R12 批 C」，插 xh1004
  之后），56 支与 player.ts orderedSceneKeys glob 序 node 模拟同构自证
  match=true（38-43=xh1101..xh1102e、补丁组 44-55=ch41p..xh1002p）；**未写
  xh1103-07/xh1102dp/xh1102ep**。
- **scripts/pace_audit.py SCENES** 增六项；**scripts/smoke_player.py
  BEATS_EXPECT** 增六键（帧表 distinct gap>=2 机核值：xh1101=53/xh1102a=45/
  xh1102b=72/xh1102c=62/xh1102d=41/xh1102e=51）——BASE_SCENES/PATCH_SCENES
  范围未动（主会话统一扩），BEATS 只登记不验证（smoke_player 未跑）。
- **player.ts 零改动**（glob 自动发现+补丁正则 `^(ch\d+p|xh\d{4}[a-z]?p)\.tsx$`
  对 xh1102a-e 主线名天然不匹配、波次 2 xh1102dp/ep 天然匹配）。
- **引文机核**：上屏 EN 引文 37/37 为切片子串（归一=空白折叠+直/弯引号
  字形归一+折行连字符归一；探针 ~/.cache/zcode-tmp/r12c_quote_check.py）。
  修正三处后达标：xh1102a Normal TRB 方向句补 "the"（L125 原文
  "depends on the direction defined by"）；九处跨 bullet/图题/两公式的拼接
  点补 "…" 省略号分隔（xh1102b 五处/xh1102d 一处/xh1102e 两处/xh1102b
  SETUP 句一处）；“No-data” 引号字形对齐 L200 弯双引号。
- **三门数值表**（文本修正后四支 39/40/42/43 已重扫重探，total/distinct/
  beats 与首轮逐位一致）：

| 场景 | idx | total | distinct | beats | pace fast | probe viol | 档位对账 |
|---|---|---|---|---|---|---|---|
| xh1101 | 38 | 1377 | 138 | 53 | 0 | 0 | 中档 800-1400 落档 |
| xh1102a | 39 | 1067 | 168 | 45 | 0 | 0 | 小档超 67f（+6.7% 记档） |
| xh1102b | 40 | 1860 | 256 | 72 | 0 | 0 | 大档超 60f（+3.3% 记档） |
| xh1102c | 41 | 1487 | 251 | 62 | 0 | 0 | 中档超 87f（+6.2% 记档） |
| xh1102d | 42 | 1087 | 114 | 41 | 0 | 0 | 小档超 87f（+8.7% 记档） |
| xh1102e | 43 | 1480 | 129 | 51 | 0 | 0 | 中档（TOC 误判降档）超 80f（+5.7% 记档） |

- **超档记档口径**（ch4611/xh0803/xh1001/xh1004 先例：判据不砍+三门全绿
  不返工）：超档主因=字幕拍阈值下限（加权字数/5.5+1.0s）对规则清单/公式
  链类内容偏紧（b 六条件清单、d 五公式+算例、c 空环双事件）；已做两轮
  定向收紧（xh1102b 80.8→62.0s、xh1102c 61.0→49.6s）+合并紧邻拍（b2 对/
  c1 对/d2 对/e2 对）后再无低余量可缩空间（末轮 minslack 0.1-0.2 贴
  0.05 容差线）。
- **布局避让带**：全六支沿用批 B 验证参数（chip(1090,265,w1300)/note(1300,
  285/310,w1040)≤4 行/表卡(740,295,w560)≤5 行/收口卡(960,840,w980)/
  bell(1680,565)/双环带 470+655/Interval 标尺 CellStrip(760,560,n7)）——
  probe 首轮即 viol=0×6（含修正后复探×4），零避让重排回合。
- 未动 dist/、未跑 vite build、未 git commit、未动 output/ 既有 mp4、
  未跑 smoke_player、未动 TrackB/TrackC 文件面（build_landing/
  check_landing_code/online_e2e_r6/build_zh_quotes/flowcharts/zh-quotes/
  interactive/smoke_interactive/EVIDENCE.md）。

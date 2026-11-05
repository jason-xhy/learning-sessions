# EVIDENCE.md —— §4.10 主机控制器 TRB 处理（2026-11-04，anatomy 机器版）

**范围声明（机器化施工）**：本页由「流程骨架版」（泳道生成器 lane_page.mjs 量产件，
见 backup-20261104/）升级为 **anatomy 机器形态**——按 DESIGN.md §8 契约修订表
2026-11-04 行「机器候选节（4.10…）先出骨架页、机器形态留后续会话」的追认执行。
现行页面结构对齐 4.2/4.3：正文块（要义+原文对照）+ **静态泳道图卡** + **机器动画卡**
+ 表格卡两张（IOC 组合表 / 错误分类表）+ 互链卡 + 页脚；双主题（index.html=dark、
index-light.html=light）。

## 0. 泳道去留决定（任务要求记录）

**决定：保留泳道静态图卡、退役其步进动画模式。**

- 保留理由：① 板块契约 DESIGN §4 页面模板 c+d 双卡（流程图卡+动画卡）是常态形态，
  4.2/4.3 均双卡并存——泳道图提供「一屏总览三方全程」的对照视角，机器逐帧演示
  与之互补而非替代；② 骨架版泳道 10 步与机器 10 帧内容重合度高，但泳道把
  每步的三方同时性（驱动/xHC/设备同列对齐）展成时间线，机器受视角所限做不到。
- 退役理由（步进模式）：步进动画职能由机器接管（.fig-ctl 控制条 + playTo 帧驱动，
  2026-11-03 步进按钮轮立的门）；泳道卡转为纯静态总览（无令牌/无步进），数据重排为
  8 行时间线（骨架 10 步中「事件入环」与「中断」合并为一行两框、恢复两步合一框组）。
- 表格卡两张（IOC 组合表 + 错误分类表 Table 4-5/4-6 转写）原样保留——纯表格内容，
  机器不覆盖。
- 备份：骨架版全部文件（build.mjs/EVIDENCE.md/index*.html/shots）在
  `backup-20261104/`（改动前 sha256 留存：build 62098e29…、EVIDENCE dbebdb9d…、
  index 82e52f47…/ffede0d2…）。

## 1. 机器概念与零件

**机器名**：「TRB 处理台」——主会话派发任务书建议名，沿用 §5.2「XX台」形态
（4.2「启机配电台」先例）；「处理」非隐喻词，机器隐喻词全部走 DESIGN §3.2 白名单
（卡/回执/轨道/滑车/门架/闸刀/就绪灯（标志灯排·中断灯·状态灯）/读数板/铭牌/收件匣/
票据/端子/拉线/收件口/储物柜/冲压/试验盒/托盘/拉杆）。

**概念一句话**：TRB 卡列成一排在传输环卡轨上，取卡滑车（Dequeue 指针）逐卡验过
Cycle 位，执行滑车沿数据导轨在设备收件口与内存储物柜之间搬数据票据；完工后按结局
在事件冲压位冲出 Transfer Event 回执卡落到事件环轨道——IOC 灯亮必出卡，错误无视
三灯必出卡且 HALT 大闸落下锁停卡轨；每张事件卡经中断拉线牵亮驱动台中断灯。

**概念↔机制映射**（对象即解释）：
| 机器件 | 规范机制 | 页码 |
|---|---|---|
| 六张 TRB 卡（A/B 数据、C 末位 IOC=1、D ISP=1、E 出错位、L Link） | Transfer TRB 与 TD 的组成；末 TRB 置 IOC；Link TRB 回卷翻 Cycle | p187/p173 |
| 取卡滑车+验位压头 | xHC 按 Dequeue Pointer 取 TRB、验 Cycle 位（§4.9 机制，本节引用） | p171 |
| 执行滑车+数据票据+内存储物柜 | IN 端点按 MPS 切包、数据缓冲搬运、TD Transfer Size=Σ Length | p172–173 |
| 标志灯排 IOC/ISP/BEI | 三只 TRB 标志；置位才要求事件（短包） | p171/p187 |
| 事件冲压位+回执卡（CC/Length 卡面） | Transfer Event TRB 生成；CC/Length 如实回传源 TRB 完成状态 | p170–171 |
| 事件环轨道+三回执卡+ERDP 立牌 | 事件环排队；事件含 Device ID/EP ID/源 TRB 地址，兼作 xHC 最新 Dequeue Pointer | p170/p171 |
| 中断拉线+驱动台中断灯 | 事件生成必伴随对宿主中断；突发由中断节流吸收（§4.17） | p170/p171 |
| HALT 大闸（OFF 上翘/ON 压触点） | 错误→端点 Halted、xHC 停在出错 TRB 上 | p175–176 |
| EP State 读数板（Running/Halted/Stopped） | 端点态迁移：错误 Halted → Reset Endpoint 后 Stopped → 门铃后 Running | p176–177 |
| 驱动收件匣三格（Success/Short/Error） | 软件读事件环按 Completion Code 分派 | p171/p187 |
| 设备试验盒+状态灯+收件口+待发票据 | 设备=数据面对端：只见 USB 包与握手 | p176–177 |
| 等时注记牌/错误注记牌 | 等时端点无握手从不停机；错误无视标志必出事件 | p176/p175 |
| 票据托盘 | 台面中段滑车中转位（机械填充件，无文字断言） | — |

**零件统计（audit 口径）**：110 items · 75 solids · 1 tube（中断拉线 34 段）——
基座组（底板/4 地脚×2 件/凹槽/角螺丝/标尺条/铭牌）、主机台（台身/台面顶板/通风刻槽/
铭牌板）、传输环（双轨/两端挡/槽位框/六卡/取卡滑车）、标志灯排（三座+三罩）、
EP State 读数板、事件冲压位（座/双导柱/顶座/冲头/出卡口托板/飞卡组）、内存储物柜
（柜体/格线/动态票据）、票据托盘、HALT 大闸（座/铰柱/触点/闸臂）、数据导轨
（长轨/双支柱/刻度/门架双柱+梁）、驱动台（身/面/铭牌板/收件匣三格/中断灯座+罩/
两拉杆/拉线端子）、设备盒（身/盖/收件口/状态灯座+罩/票据列）、事件环（床/双轨/
端挡/槽位框/三回执卡/ERDP 立牌）、注记牌×2。

## 2. 帧序（10 帧）与逐帧断言

演示样例：一个 bulk IN 端点（IN 方向教学最全：数据面+短包+STALL 都走设备），
同一列卡顺序处理三个 TD：TD1（A+B+C 正常完成）→ TD2（D 短包）→ TD3（E 错误）。
Slot/EP 编号不出现（非本节域）。

| 帧 | 演出 | 断言 | 判据 |
|---|---|---|---|
| F0 全景静止 | 三区铭牌；读数 `EP Running · 事件 0 · 中断 0` | 500M 传输环量级句入页面 prose（不断画面数） | §4.10.1 p170 |
| F1 取卡验 Cycle | 取卡滑车到 A 卡上方、压头下压 | xHC 按 Dequeue Pointer 取 TRB；Cycle 匹配才有效 | p171（Cycle 机制 §4.9 引用） |
| F2 执行搬票据 | 执行滑车设备↔储物柜往返；A/B 完成杠 | IN 端点按 MPS 切包；TD Transfer Size=Σ各 TRB Length；包边界与缓冲边界无对齐假设 | §4.10.1.1 p172–173（两条 Note） |
| F3 末卡完成 | C 卡 IOC 灯亮→冲头下压→回执卡 Success 出卡 | IOC=1 必生成 Transfer Event；CC=Success；末 TRB IOC=TD 完成事件 | p170/p175/p187 |
| F4 事件入环 | 回执卡飞落事件环轨；拉线牵动→中断灯亮 | 事件生成必伴随对宿主中断；突发由中断节流吸收 | p170 Note/p171 |
| F5 驱动分派 | 回执卡入收件匣 Success 格 | 软件读事件环按 CC 分派；TRB Pointer=最新 Dequeue Pointer（追平副本）；TD 环空间可回收 | p171/p187 |
| F6 短包分支 | ISP 灯亮；设备票据短缺（2/3）；出 Short Packet 卡入 Short 格 | ISP/IOC 置位的 TRB 上才出事件；Length=残余；自动推进下一 TD 首 TRB；BEI 可压中断 | p171/p187（BEI 句） |
| F7 错误停机 | 设备状态灯亮（STALL）→Stall Error 卡必出（无视灯）→HALT 闸落下→EP State=Halted；Dequeue 停在 E 卡 | 错误无视 IOC/ISP 必出事件；传输环错误一律 Halted、停在出错 TRB；xHC 永不自己回 STALL | §4.10.2 p175–176 |
| F8 恢复两步 | 拉杆（Reset Endpoint）→EP Halted→Stopped→设备灯灭→闸抬起→Running | 恢复两步顺序强制：Reset EP 成功且设备侧 halt 清除后才准写门铃重启；Halted→Stopped→（门铃）Running | §4.10.2.1 p176–177（p177 Note） |
| F9 等时注记 | 滑车回 home；等时注记牌高亮帧 | 等时端点无握手从不停机；Missed Service/Ring Overrun/Underrun 只出事件继续下一 ESIT | p176/p183–186 |

**读数**：`帧 n/10 · EP Running|Halted|Stopped · 事件 n · 中断 n`——中断计数=事件
生成次数（p170 Note：每事件必伴随中断；BEI 例外的注记在文案层，机器读数按主线计数）。
**帧速 DUR**：[3.0,4.2,6.0,5.4,4.8,4.5,6.3,6.6,6.0,3.6] 秒。

## 3. 逐条断言 → 判据（正文/表格/铭牌全部画面与文字）

| 断言 | 判据 |
|---|---|
| 500M Transfer Rings（255×31×30 端点 64K Streams）；完成状态以 Transfer Event TRB 排队事件环 | §4.10.1 p170（PAGE-OK `Host Controller TRB Handling`/`Interrupt On Completion (IOC) flag is`） |
| IOC=1→必生成 Transfer Event；事件生成必伴随对宿主中断；CC/Length 回传源 TRB 完成状态 | §4.10.1 p170（引文①逐字 + Note 句） |
| 短包：ISP/IOC 置位的 TRB 才出事件；CC=Short Packet；Length=残余；中间 TRB 短包→推进下一 TD 首 TRB；推进途中第一个 Event Data TRB 被执行 | §4.10.1 p171（引文②逐字 + Note） |
| 错误必出事件（无视 ISP/IOC）；CC 指明错误；需 halt 的错误→xHC 停在出错 TRB、端点 Halted、软件用 Set TR Dequeue Pointer 推进 | §4.10.1 p171 + §4.10.2 p175（引文③④逐字） |
| Cycle 翻越处推不到 TD 边界→下次门铃再推 | p171 Note（页面文案点出，机器不画） |
| 事件位置信息=Device ID/EP ID/源 TRB 地址；兼供追平 Dequeue 副本；事件生成可延迟但四条件强制立即 | p171–172 |
| TRB Pointer 提供软件追平依据；通常每 TD 一枚 IOC 足够；Event Lost Error 会 halt 端点 | p172 三条 Note（正文第 3 段+表格卡旁注） |
| TD Transfer Size=Σ Length；IN 每 TD 排 ((TDS−1)/MPS)+1 包、除末包全满包；包边界与缓冲边界无对齐假设 | §4.10.1.1 p172–173（F2 机制句 + PAGE-OK `Short Transfers`） |
| TD 完成事件三来源（IOC 成功/短包/错误）与 TD 完成后事件 CC 同值、Length 语义（Data 类=0/ED 类=EDTLA）；Link TRB IOC 出 Success 事件 Count=0 | p175（表格卡 + PAGE-OK `TD Completion Events are generated`/p173 `All Link TRBs encountered`） |
| 传输环错误一律端点 Halted 需软件介入；等时端点无握手从不停机、继续下一 ESIT | §4.10.2 p176（引文④ + 等时段） |
| Stall：xHC 移出 Pipe Schedule+EP State→Halted+出事件；xHC 永不自己回 STALL；SETUP 回 STALL 亦 halt | §4.10.2.1 p176 |
| 恢复两步：Reset Endpoint（Halted→Stopped、环再启用、门铃后 Running）+软件清设备侧 halt；顺序强制 | p176–177（PAGE-OK `Reset Endpoint Command`） |
| 非控制管道清 halt 走独立控制管道；控制端点=接受下一 SETUP；等时不产生 Stall | §4.10.2.1.1/1.2 p177 |
| TRB Error/USB Transaction（Table 4-5）/Babble/Data Buffer/HSE/CErr（Table 4-6）分类要点 | §4.10.2.2–2.7 p177–183（表格卡逐行 + PAGE-OK p178/p183） |
| 等时：CErr 不适用、错误不停机推进下一 ESIT；Ring Overrun（IN）/Underrun（OUT）环空出事件、端点保持 Running 移出 Pipe Schedule、门铃放回；Missed Service Error 语义 | §4.10.2.8 p183 + §4.10.3.1/3.2 p184–186（PAGE-OK `Ring Overrun and Underrun`/`Missed Service Error`） |
| IOC 通用规则：置位即出事件（例外=事件环满等）；TD 末 TRB 置 IOC=TD 完成宣告、环空间可回收；ISP=1 且 IOC=0 缓冲收满不出事件；BEI 压短包中断；IOC 可作及时 Dequeue 更新 | §4.10.4 p187（引文⑤逐字）+ p188 Note（PAGE-OK `An exception is if the PAE flag`） |
| 设备视角：只见 USB 事务与握手（STALL/短包数据包）；环/TRB/事件对设备不可见 | p176–177（机器铭牌句） |

**引文五条**逐字取自提取文本 p170/p171/p175/p176/p187（尾注 §x pNN 与上表机核对应；
PDF 伪影已剔除；弯引号 '1' 保留提取原样）。

## 4. zoomfs 登记

- 三件套：`zoomBarHtml()` + `zoomFsCss()`（一次）+ `zoomFsScript()`（两实例构建期
  scope 化，照 4.2 模式：`querySelector(".iso-stage")`→`querySelectorAll(...)[ix]`）。
- **focus 选择器登记**：
  - 泳道卡（stage 0，window.__zfsLane）：`["#lane-svg .notebox"]`（第一块注记框锚点）
  - 机器卡（stage 1，window.__zfs）：`['[data-name="ring.rail0"]', '[data-name="host.top"]']`
    （常驻实体，规避 data-part 空组 0×0 rect 聚焦塌陷坑）
- 存活验证：dark drive eval `__zfs.setZoom(3)` → `zoomOf()=3.2`（phone-390-zoom.png）。

## 5. 机器刻字台阶（§1.8 契约追注口径）

- **主层**（≥7 世界单位）：工位铭牌主行 8.6–9（xHC 控制器·TRB 处理台 / xHCI 驱动 /
  设备·数据面对端）；机制句 6.4–8（「取 TRB→验 Cycle→执行→评结局」「事件生成必伴随
  中断」「错误必出事件」「等时端点例外」主行 7.2、EP State 窗 8.4、HALT 大闸 6.4、
  灯名 IOC/ISP/BEI 6.4）。
- **次层**（5–6.5，1× 可辨）：卡名 6.8、卡面旗标 5.2、冲压/储物柜/收件口/中断灯/
  状态灯功能名 5.4–5.8、注记牌副行 5.4、ERDP 5。
- **细节层**（≤5，3.2× 缩放档可读，EVIDENCE 登记清单）：卡面 sub 行 4.2、
  「驱动生产 · xHC 消费」5→4.8 区间、注记牌三行 4.4–4.8、回执卡 CC 4.6/Length 4/
  "Transfer Event" 3.4、HALT 副句 4.4–4.8、事件环小注 5.2、Dequeue 4.6、
  收件匣格名 5.2、「规范称 system software」6（铭牌副行）。等效 px=字号×KS 1.564
  （页内 1500 宽全显时），4× 缩放档下细节层≈4×1.564×3.2≈20px 可读。
- 页面正文 16.5px、泳道框字 16px/页码 13px@1×、表格 14–15px。

## 6. 验收门输出（2026-11-04 实跑，全绿）

| 门 | 命令 | 末行输出 |
|---|---|---|
| audit ×2 | `node build.mjs --audit` / `node build.mjs --light --audit` | `audit passed` ×2（110 items · 75 solids · 1 tube；clearance/terminals/loose/folds/support/depth/through-flight/self-overlap/wobble/saddles/stand-in/crowding 全 0；allow 1 对=拉线端子连接固有） |
| lines ×2 | `scripts/lines.mjs index.html --select '.fig-wrap .iso-plate'`（+light） | `line ends: 0 of 140 ends on 47 lines float` ×2 · console clean ×2（unparseable-d 版 PASS 形态） |
| 遮挡探针 ×2 | `python3 scripts/xhci_spec_occlusion_probe.py <页> --frames 10 --dwell-ms 8000` | `OCCLUSION-PASS` ×2（**逐帧动态探**——见 §8 坑 4：live 可见性改 document.hidden 后探针才真正探到动态帧；首轮探出 dqcar 盖卡名/memcells 盖门架刻字共 4 处，卡名下移+门架刻字移梁右端后清零） |
| 页码机核 | `python3 scripts/xhci_spec_pagecheck.py`（18 needle：p170×2/p171/p172/p173/p175×4/p176/p177/p178/p183/p184/p186/p187/p188） | 全 PAGE-OK → **PAGECHECK-PASS**（p175/p176/p187 首轮 needle 跨 PDF 断行 MISS，改断行后短 needle 全过——brief 判据复现；p188 needle 须用提取文本原断行形 `An exception is if the PAE flag`） |
| 语言门 ×2 | `python3 scripts/scan_words.py retired <页>`（study 根） | total=12 `{回执:8, 泳道:4}` ⊆ 豁免表 {回执, 泳道}（回执=§3.2 白名单；泳道=图表术语）——非豁免命中实收×1/取件×4/车位×1 当轮清零（改「收到＜期望」「取卡滑车」「滑车所在卡的序号」） |
| 控制条探针 ×2 | `python3 scripts/xhci_spec_ctl_probe.py <绝对路径> fig42` | `CTL-PROBE-PASS` ×2（next/prev/tour aria-pressed/reset 四项全 PASS；**注意该脚本相对路径会拼成 file:///lessons/... 404，必须传绝对路径**——共享件缺陷，报主会话） |
| 交互冒烟 | 机器节形态：ctl_probe（上）+ drive 帧驱动（steps-frames.json：playTo(3)/playTo(7) → readout `帧 8/10 · EP Halted · 事件 3 · 中断 3` + stateOf 终态对表 + console clean） | PASS。**lane_smoke 不适用**（生成器泳道专用：本页泳道卡为纯静态 SVG 无步进令牌/无 [data-step] 组，lane_smoke 的步进断言无对象）——按任务书「按本节形态选适用者」以 ctl_probe+drive 替代 |
| console clean | capture/drive 全部 shots 过程 | 每张输出 `console: clean`（双主题；含 --reduced/--width 390/--zoom 变体） |
| 自包含 | `grep -c 'http://\|https://'` | dark/light 各 3，命中全为 `http://www.w3.org/2000/svg` xmlns |
| 互链 | href 存在性脚本 | 12 链接 MISSING=0（4.7/4.8/4.9/4.11/4.17 直链 + 板块 index×3 + fig3 + EVIDENCE.md + 前后节） |
| shots | shots/ 31 张 | 清单见 §7 |

## 7. shots 清单（31 张，console 全 clean）

- 页面全景：page-dark.png / page-light.png（1500 宽整页）
- 机器卡全景：machine-dark.png / machine-light.png
- 泳道卡全景：lane-dark.png / lane-light.png
- 逐帧：frame-01..10-dark.png（10 张，scale 1.4 ≈1970px 宽）+ frame-04/08/09-light.png
- 390：phone-390.png / phone-390-light.png（无横滚）+ phone-390-zoom.png（3.2× 档）
- reduced：reduced-dark.png
- 4× 特写：z-stamp / z-halt / z-flags ×dark/light（6 张，冲压位/HALT 闸/标志灯排区）
- lines 环形图：lines-dark.png / lines-light.png

## 8. 施工坑与绕法（本节实测，通用性已判）

1. **`.entries()` 双层解构陷阱产 NaN（两次踩）**：`for (const [i, gx] of [[0, x], [1, y]].entries())`
   把内层数组整个赋给 gx→几何参数 NaN→item.key=NaN（JSON 序列化为 null）+ MNaN path。
   判据：audit key NaN/lines 报 unparseable d。修法：直接迭代值数组或 entries 解构内层
   `[i, [gx]]`。**通用**（4.2 BUILD-LOG 坑 2 同族——plan 缺 r 与本坑是 MNaN 两大来源）。
2. **sideSeam z 必须在宿主台身高度内**：抄 4.2 的 seam z 值（柜高 86）到我台身高 14
   →seam 悬空浮端 26.79px。判据：lines `iso-line faint in <实体> end Npx from anything`。
   通用：跨节抄参数先对高度。
3. **live 引用已改名 DATA 字段**：DATA.evY 改 evZ/evFaceY 后 cuesFor 残留
   `D.evY + 26`→undefined+26=NaN→evFlySvg 产 MNaN（静态页 clean、**播放才炸**）。
   判据：drive 逐帧扫 `[data-part]` innerHTML 含 NaN。通用：DATA 改名后 grep 全部
   live/geometry 引用。
4. **探针/无头场景的 IntersectionObserver 盲区（板块级发现）**：live 用 IO rootMargin
   120px 控制渲染，机器卡在页面下方（探针 viewport 1000 内不可见）→ tick 永不跑 →
   **occlusion probe 的 playTo 探的只是初始静态帧**（本节修 live 后探针立刻抓出 4 处
   动态遮挡——证明 4.2/4.3 的 OCCLUSION-PASS 很可能只覆盖了 frame 0 姿态）。
   本节修法：可见性改 `document.hidden`（IO 仅作回视口唤醒；rAF 只在 anim/touring
   时跑、静止自然停——「stops offscreen」语义保留）。**建议主会话核查 4.2/4.3**
   （它们仍用 IO 版 live；板块探针脚本加 scroll-into-view 或两节 live 同步本修法）。
5. **playTo 不得提前 snapshot 终态**：初版在 playTo 里 `state = snapshot(frame)`——
   cues 演出从终态出发、全部瞬间跳变（readout 停初值+演出丢失）。正解（4.2 原样）：
   state 不动、cues 在 tick 推进、收尾 `state = snapshot(frame)`。
6. **ctl_probe 相对路径 bug**：脚本 `file://` + 相对路径拼出 `file:///lessons/...` 404
   ——必须传绝对路径（共享件缺陷，报主会话修 `os.path.abspath`）。
7. **occlusion 的 LABEL_AFTER 需含设备全家**：设备铭牌文字层只排在 dev.box 后会被
   后画的 dev.lid/port/lamp 盖（overlap 0.48–1.0）——LABEL_AFTER 枚举到每块后画实体。

## 9. 契约修订建议（报主会话，未动 DESIGN.md）

1. **occlusion probe 的 IO 盲区**（§8 坑 4）：4.2/4.3 历轮 OCCLUSION-PASS 存疑
   （只证 frame 0），建议统一 live 可见性口径后两节复跑探针。
2. **ctl_probe 绝对路径**：`path` 参数过 `os.path.abspath`（§8 坑 6）。
3. **机器节探针 API 名约定**：探针只认 `__fig42/__fig43`——本节复用 `window.__fig42`
   名（playTo/frameOf 形态）+别名 `__fig410`。建议后续机器节（4.12/4.14/4.15/4.19/4.23）
   沿用此约定，或探针脚本改读 `window.__fig*` 通配。
4. **「XX台」机器名形态**：本节「TRB 处理台」沿用 §5.2「启机配电台」形态（任务书
   建议名）——建议 §3.2 追认「处理台」或按「XX台」形态立法。
5. **细节层刻字登记口径**（§5 表）可供后续机器节复用为登记模板。

## 10. 已知边界

1. §4.10.1.1.1/4.10.1.1.2（Event Data TRB 有/无时的短传细则、ISP/IOC/ED/PAE 逐组合
   行为）仍以表格卡归纳，不做位级机器展开（骨架版同边界，属 §4.11 域）。
2. 机器演示用 bulk IN 单端点样例；Interrupter Target/Secondary Event Ring（§4.9.4.3）
   不入镜（§4.17 域）。短包「实收 2/3」以设备票据短缺表达，不刻具体字节数。
3. 完成卡以 0.55 透明度+完成杠退场表达（教学重心在活跃件）；分析器建议的完成杠
   加粗未采纳（属评分门轮可迭代项）。
4. 事件环以一段直轨示意（图例小注已声明「实为环形，本台取一段示意」）——环形全环
   展开属 fig3 回执登记机的教学域。
5. 骨架版 steps 10 步在泳道重排为 8 行（见 §0）；骨架版表格卡内容逐字保留。

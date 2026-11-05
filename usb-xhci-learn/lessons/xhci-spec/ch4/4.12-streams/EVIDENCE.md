# EVIDENCE.md —— §4.12 流（Streams）（2026-11-04，anatomy 机器版「流查表台」）

判据源：xHCI 1.2b（Document Number 625472, Revision 1.2b）§4.12 p218–228（§4.13 起于 p229）。
规范提取文本 `/tmp/spec-audit-txt/xhci-1.2b.txt`；PDF 本体 `specs/625472_xHCI_Rev1_2b.pdf`。
生成于 2026-11-04。构建：`node build.mjs`（dark→index.html）/ `node build.mjs --light`（→index-light.html），
页宽 1500，自包含。本文件取代同日泳道骨架版（骨架原件在 `backup-20261104/`，sha256 见该目录 SHA256SUMS.txt）。

## 0. 机器概况与主题名

- **机器**：「流查表台」——一张带索引卡笼的查表台。左文书台（xHCI 驱动）挂 TD 卡、拨 DB Stream ID
  计数轮按门铃；中总控台（xHC）：主流卡笼 16 格（流上下文卡 SCT=1 指环 / SCT=3 指辅流卡笼）+
  门架读卡滑车（按 PSID 格位读卡路由）+ 辅流卡笼 2 + xSPSM 五态转筒窗 + IPPV/DBPV/LFCV/DSICV
  四旗灯 + HID 闸 + ENT 灯 + 越界注记牌 + 捕获窗/拆位窗；右试验盒（设备）：CStream 数码窗 +
  包边界切流窗 + 教学锚长铭牌；三线：门铃拉线（台→总控台）、总线缆（共享 bulk 管道，票据行走）、
  事件回流管（总控台→事件匣）。
- **主题名变更记录**：任务派单建议「流对账台」——「对账」在机制课退役词族内（retired_baseline.json
  命中），语言门会 FAIL；改用「流查表台」（查表=数组索引查找的技术直语，对应任务描述的「流 ID 查找
  路由」）。机器隐喻词使用面：卡笼/滑车/门架/计数轮/灯排/铭牌/闸刀/就绪灯/托盘(环床)/收件匣(事件匣)/
  票据/回执——均属 DESIGN §3.2 清单（含追认）；「环床/查表」为普通技术词非隐喻。
- **演示样例（示例值登记）**：EP1 IN Bulk 端点，MaxPStreams=3（照规范 Figure 4-20 p224 例）→
  主数组 16 格 = 2^(3+1)；流 1（PSID 1·SSID 0·SCT 1 → 环 1）与流 18（PSID 2·SSID 1 → 主格 2
  SCT 3 → 辅数组 2 格 1·SCT 0 → 环 18；SID 18 = 1×16+2，SSID 高位×2^4+PSID）；DSICV=1（捕获
  DB Stream ID 的实现例）；越界演示 SID 0（保留）与 SID 17（P1·S1 命中 SCT 1 环格但 SSID≠0——
  p226–227 判据）与空卡格 5（TR Dequeue Ptr=0·SCT 1 → 按空环拒 NoStream）。辅流卡笼只画 4 格+
  省略号——不断言辅数组容量（SCT 容量编码在 Table 6-13，§6.2.3 域，本节页未给全）。
- **帧数 11**（F0–F10），DUR [3300,4500,4800,6600,6600,4800,7200,6900,3900,6600,3000] ms，
  巡游驻留 5.5s；**audit items 111**（85 solids · 3 tubes），预算 40–113 内。
- 读数（卡右下，与帧模型同源）：`步 n/10 · xSPSM <态> · CStream <n> · 端点 <Running/Halted/未配置>`。

## 1. 页码机核（pypdf needle，全部现场跑）

`python3 scripts/xhci_spec_pagecheck.py 218 4.12 218 Streams 219 4.12.1 220 "Prime Pipe" 221 IPPV
221 DBPV 221 LFCV 221 DSICV 222 MaxPStreams 223 "Stream ID Management" 224 "Figure 4-20"
224 "Secondary Stream ID" 225 "Stream Array bounds checking" 226 "Invalid Stream ID Error"
227 "Evaluate Next TRB" 228 "ENT flag"` → **16/16 PAGE-OK，PAGECHECK-PASS**。
页头 specRef 的 p218–228 与三条小节题以此为据。

## 2. 机器画面断言 → 判据（每个可见事实）

### 三方工位与铭牌
| 断言（画面） | 判据 |
|---|---|
| 文书台铭牌「xHCI 驱动／规范称 system software」 | 契约 §1.7；p218 "system software" |
| 总控台铭牌「xHC 控制器 · 流数组 · 查表路由」 | §4.12.2 p222–224（TR Dequeue 指针改指数组、SID 索引） |
| 试验盒铭「USB 设备 · 选流方／CStream 由设备定 · 包边界可切流」 | p218 "The USB device determines which Stream is active"；p219 "Stream selection is driven by a USB device … switch Streams on packet boundaries" |
| 长铭牌「全部流共享一条 bulk 管道／设备只见包头 Stream ID——环与流数组在主机内存」 | p218 "all Streams associated with an endpoint share the same bulk pipe"；p219 "managed strictly through manipulation of the packet header Stream ID field"；数组/TRB 在主机内存（xHC DMA 访问，p225 越界检查的对象即 host memory） |

### 帧序断言（11 帧）
| 帧 | 画面断言 | 判据 |
|---|---|---|
| F0 | 全景，读数「步 0/10 · xSPSM — · CStream — · 端点 未配置」；转筒窗「未配置」 | MaxPStreams=0 时为标准端点（p223），尚未开流 |
| F1 | 开流：EP1 IN 端点上下文指针窗「单条传输环」→「主流数组」；卡笼 16 格就位（格 0 SCT3/格 1 SCT1/格 2 SCT3/格 15 SCT1 + 空卡格 5）；转筒→Disabled | p223 MaxPStreams=0 → 指针指传输环；p224 "TR Dequeue Pointer field points to a Primary Stream Array with 2^MaxPStreams+1 entries"；p220 "xSPSM … shall enter the Disabled state when a Configure Endpoint Command is executed and Streams are enabled (MaxPStreams>0)"；SCT 值照 Figure 4-20 例（格 0/2=SCT 3，格 1/15=SCT 1） |
| F2 | 流 1 / 流 18 环床就绪灯亮；流 1 挂 N·N+ENT·ED 三张 TRB 卡，流 18 挂 N+ENT·ED；卡笼标题「主流数组 · 16 格 = 2^(MaxPStreams+1) · MaxPStreams=3」 | p218 每流一条 Transfer Ring、软件挂 TD；p228 "System software shall set the ENT flag in the last Transfer TRB before a terminating Event Data TRB in a TD"（N+ENT 卡即置位形态） |
| F3 | 拨 DB Stream ID 计数轮→1、按铃；门铃票据沿拉线到总控台；捕获窗显 1、DSICV 灯亮；转筒 Disabled→Prime Pipe→Idle；Prime 票据沿总线到设备「缓冲已更新」 | p223 "A doorbell is rung when work is added … The DB Stream ID indicates the specific Stream"；p220 首铃 Disabled→Prime Pipe、设备自动转 Idle；p221 DSICV 可选捕获；p220 Prime Pipe=xHC 通知设备宿主缓冲已修改/新增 |
| F4 | 读卡滑车沿门架到格 1、探针下探、格 1 卡高亮；转筒→Move Data；设备 CStream 窗显 1；数据票据设备→总控台 | p221 Idle 门铃算法：HID=0·DSICV=1·DB SID=LCStream·LFCV=0 → Move Data；p222 xHC 用包内 Stream ID 索引流上下文数组；数据沿共享 bulk 管道（p218） |
| F5 | 搬数中再按铃 → 门铃票据走线、DBPV 灯亮（补记） | p221–222 "DBPV is … set if the doorbell is rung while the xSPSM is in the Start Stream or Move Data states"，回 Idle 立即补发 Prime Pipe |
| F6 | 设备切流窗「1 ⇄ 18」、CStream 18；NRDY(流 1) 票据设备→总控台 → LFCV 灯亮；SID 18 票据 → 拆位窗「PSID 2 · SSID 1」；滑车移格 2 读 SCT 3 → 板顶查表通道亮 → 辅流卡笼 2 格 1 高亮（SCT 0 → 环 18）；数据票据继续 | p219 包边界切流；p221 Move Data 因 NRDY(Stream n) 退出 → LFCV 置位；p224 SID 拆 PSID（低位索引主数组）/SSID（高位索引辅数组）、SCT=3 指辅数组、辅格 SCT=0 指环；SSID≠0 落辅数组 |
| F7 | 流 1 退出 Move Data 即存态：N/N+ENT 卡翻「已执行」态、ENT 灯亮、ED 卡执行（✓ 已执行）→ 存 TR Dequeue 指针·DCS（SEC=1 加存 Stopped EDTLA）；转筒 Idle（IPPV 清 0）→ DBPV 补记强制 Prime Pipe（IPPV=1） | p218 "Stream Context fields are updated with the CStream state when a Stream exits the Move Data state … the Stream Context TR Dequeue Pointer, DCS, and if SEC='1', Stopped EDTLA"；p228 "Before the transitioning a Stream pipe to the Idle state … evaluate the ENT flag … execute the terminating Event Data TRB and complete the TD before saving"（CH+ENT→评估下一 TRB，是 Event Data TRB 则先生成事件再存）；p222 "Idle entered from Start Stream or Move Data → IPPV cleared"；"IPPV=0 且 DBPV=1 → Prime Pipe"（补发）；脚注 40 SEC 对 1.1/1.2 xHC 强制 |
| F8 | Event Data Transfer Event 事件卡沿回流管入事件匣 | p228 ENT 置位使 Event Data TRB 及时执行（生成关联 Event Data Transfer Event）；事件走事件环（板块通例） |
| F9 | 越界检查帧：SID 0 票据 → 停端点（端点灯转 Halted 红）；SID 17（P1·S1）票据 → 同报错；空卡格 5 高亮「Ptr=0」；越界注记牌显三行（SID 0/SID 17 → Invalid Stream ID Error；SCT 不符 → Invalid Stream Type Error·停端点；Set TR DP 越界 → 完成码 TRB Error） | p225 越界检查为 xHCI 强制；p226 SID=0 → Invalid Stream ID Error+停端点；Set TR Dequeue Pointer 越界 → Command Completion Event 完成码 TRB Error；p226 TR Dequeue Ptr=0 且 SCT=Transfer Ring → 按空环拒 NoStream 响应；p227 SCT=1 且 SSID≠0 → Invalid Stream ID Error+停端点（SID 17=P1·S1 例） |
| F10 | 读数巡回：端点恢复 Running、转筒 Idle、其余保持 | 收尾帧；端点从 Halted 复位需 Set TR Dequeue Pointer（§4.6.10，注记牌与泳道第 10 步注明）——帧内不复现命令细节 |

### 常驻机构
| 断言 | 判据 |
|---|---|
| 四旗灯 IPPV/DBPV/LFCV/DSICV + HID 闸（=1 禁主机主导） | p220–221 三影子旗标 + 可选 DSICV；p223 HID=1 禁主机主导 Idle→Move Data；p222 Note xHC 可因内部资源限制按 HID=1 运行（机器画 HID=0 位） |
| 转筒五态 Disabled/Idle/Prime Pipe/Start Stream/Move Data | Figure 4-19 p220 状态名逐字（Start Stream 在窗内列全、本演示不经过） |
| 捕获窗注「可选」 | p221/p223 捕获 DB Stream ID 为可选实现 |
| 拆位窗「SID 拆位」 | p224 PSID/SSID 拆位、边界由 MaxPStreams 定 |
| 幽灵环床「…」 | 主数组 16 格仅演示 4+1 卡，其余为格位刻线（Figure 4-20 亦以 … 省略） |

### 泳道总览卡（静态）断言
10 步框与页码角标 p218–228 逐条同上判据；设备泳道注记框（选流权/共享管道/NRDY 流控）同长铭牌判据；
第 10 步含停止/撤流入口（Stop Endpoint §3.3.8 / Set TR Dequeue Pointer §4.6.10）——p223 交叉引用句。

### 原文对照五条（正文 blockquote）
英文短句逐字取自提取文本 p218/p218/p219/p225/p228（引文④含 U+2019 撇号 doesn't 按提取文本保留）；
每条尾注 `(xHCI 1.2b §4.12[.2.1/.3] pNN)` 与 §1 机核对应。

## 3. 泳道去留决定

**保留为静态总览次卡，步进模式退役（机器接管）。** 理由：
1. DESIGN §4 页面模板本身要求「流程图卡 + 动画卡」双卡形态（4.2/4.3 同构）；
2. 原骨架页的单卡双模式（总览/步进）中，步进动画与机器 11 帧内容重合度高——机器接管后保留会双份
   步进交互；总览形态（一屏十步全局）是机器逐帧视图给不了的教学视角，保留；
3. 停止/撤流（Stop Endpoint/Set TR Dequeue Pointer）与 active 判定、UASP 例等在泳道第 10 步与
   要点表保留文字位，机器不逐帧展开（避免帧数超预算）。
实现：泳道卡由 lane_page 生成器改为本 build.mjs 内静态 SVG（同 4.2 laneSvg 形态，三方配色
§3.3 变量内联）；不再有步进按钮/narr——原 lane_smoke 门对本页不再适用（见 §4 门表说明）。

## 4. 验收门结果（2026-11-04，全绿）

| 门 | 命令 | 结果 |
|---|---|---|
| audit | `node build.mjs --audit` / `--light --audit` | 双主题 `audit passed`（111 items · 85 solids · 3 tubes；clearance/terminals/support/depth/crowding/stand-in 全 0；3 tubes = 门铃拉线/总线缆/事件管，端环 rim 落端口凸台面过 terminals） |
| lines | `anatomy scripts/lines.mjs index.html --select '.fig-wrap .iso-plate'`（两主题，unparseable-d 版） | 双主题 `line ends: 0 of 90 ends on 45 lines float` · console clean |
| 遮挡探针 | `python3 scripts/xhci_spec_occlusion_probe.py index[.html/-light.html] --frames 11 --dwell-ms 8000` | 双主题 `OCCLUSION-PASS`（0 命中；首轮 3 命中——TD 卡堆/事件匣 tag 在实体序被盖、长铭牌首行被塔顶盖——tag 改入 labels 层、铭牌文字拆入 labels 层后清零） |
| 控制条探针 | `python3 scripts/xhci_spec_ctl_probe.py <abs>/index.html fig42` | `CTL-PROBE-PASS`（next/prev/tour aria-pressed/reset 四钮实驱；帧计数取 `window.__fig42.frameOf()`——本页暴露 `__fig412` 主名 + `__fig42` 兼容别名，见 §6 坑 2） |
| 页码机核 | §1 命令 | `PAGECHECK-PASS`（16/16） |
| 语言门 | `python3 scripts/scan_words.py retired index.html / index-light.html`（study 根） | 双主题 `total=16 {'回执': 9, '泳道': 7}`——残留 family ⊆ 豁免表{回执,柜台,泳道}，PASS（回执=§3.2 隐喻词正常使用；泳道=泳道图卡图表术语；「对账」曾在主题名草案中命中，已改名流查表台） |
| 交互冒烟 | lane_smoke 不适用（非 lane_page 生成器页，泳道卡为静态总览、无步进模式）——等价替代＝ctl 探针 + 帧序 drive + 遮挡探针三件 | ctl PASS + 帧序真值 11/11 + 遮挡 PASS |
| 帧序真值 | `drive.mjs index.html --actions steps-frames.json`（先 scroll 到机器舞台） | 11 帧读数逐帧正确：F0 未配置 / F1 Disabled·Running·cards+指针 / F2 5 卡在环 / F3 Idle·捕获 1·IPPV·DSICV / F4 Move Data·CStream 1·格 1 热 / F5 DBPV / F6 CStream 18·拆位 P2·S1·辅格热·通道亮·LFCV / F7 Prime Pipe·ED 已执行·ENT / F8 事件匣 1 卡 / F9 Halted·注记牌·空卡格热 / F10 Idle·Running；console clean |
| console | 全部截图 capture/drive 输出 | 每张 console: clean（零 error/pageerror/SVG 解析错） |
| 自包含 | `grep -c 'http://\|https://'` | 双页 3，命中全为 `http://www.w3.org/2000/svg` xmlns → PASS |
| 互链 | 相对链接 realpath 存在性 | ../../index.html、4.11/4.13/4.7/4.8/4.9/4.17 各节 index.html、EVIDENCE.md 全存在（本节相邻节均已建，直链节页非目录页） |

## 5. 字号台阶（DESIGN §1.8 修订口径）

等效 px = 世界字号 × KS 1.865 × 页内显示比（1408/920 ≈ 1.53）≈ **世界字号 × 2.854**。

- 主层：工位铭牌主行 9（≈25.7px）/副行 6（≈17.1）；CStream 数值 9、捕获窗数值 8、计数轮 7.5、
  转筒态名 6.4（≈18.3）、EP 指针窗值 7、切流窗值 6.4、教学锚首行 6.2、卡笼唇面标题 4.6（≈13.1）、
  旗灯/端点/ENT 标签 4.0–4.2（≈11.4–12）、HID 注 4.2、越界注记牌 4.2、拆位窗值 5.4——全部 ≥11px 等效。
- **细节层清单**（次级刻字，1× 已 ≥7px 等效、3.2× 档充裕）：流上下文卡面（格号 5.0/SCT 3.6/去向
  3.2）、辅流卡面 4.6/3.2、空卡格「Ptr=0」3.0、TRB 卡内字（N/ED 4.6–5.0、ENT 3.4、已执行 3.0）、
  票据两行 3.8、事件卡 3.2–3.6、环名铭 5.4、窗标签（SID 拆位/计数轮/按铃）3.8–4.2、格号墙刻 3.8、
  NRDY 注 4.2、台面散注（读卡滑车/收铃口/事件出口）4.6。
- 正文 16.5px、泳道框字 16px@1×、机器卡注释走 plateHtml 图例。

## 6. 施工坑（本轮实测）

1. **读图通道 400**：本机 4_5v analyze_image 对 PNG/JPEG/小图/本地 URL 全 400（4.2 会话 BUILD-LOG
   坑 8 同款持续故障）——像素目检以「遮挡探针 0 命中 + 帧序 drive 真值 + audit/lines 机检 + 梁带几何
   推导」三证闭环替代（梁与仪表带：投影带推导 sy(梁)∈[-55,-45] 位于转筒窗(-62 以上)与旗灯标签(-32)
   之间无交；AABB 相交为斜平行四边形假警）。
2. **板块探针 API 白名单**：xhci_spec_occlusion_probe 只驱动 `__fig42.playTo`/`__fig43.setFrame`，
   ctl_probe API 表只有 fig42/fig43——本页 live 暴露 `window.__fig412`（主名）+ `window.__fig42`
   （兼容别名，指向同对象）过两门；**建议主会话在两探针登记 fig412 取帧表达式**（scripts/ 共享件，
   本子代理不动）。
3. **drive eval 要纯表达式**：`["eval", "() => x"]` 返回函数对象序列化成 `{}`——须写 `(x, 'ok')`
   形态；且 drive 默认视口不含机器舞台时 IntersectionObserver 不触发、raf 不跑——steps 必须先
   `["scroll", ".fig-wrap .iso-stage"]`（遮挡探针自带滚动无此问题）。
4. **A.disc/G.disc 参数语义**：(F, s0, s1, r)＝沿轴 s0..s1、半径 r 的**圆柱凸台**（非环面）——端子
   凸台外端面即管线 rim 落位点（rim 环半径=凸台半径，tip 恰在外端面 → terminals landed；离面即
   clearance through）。环形件用 G.ringBand/A.ring。误当环面用导致首轮 11 处 audit 失败。
5. **窗户组入 labels 层**：数码窗/转筒窗（纯刻线+文字、无实体）若做成无形状 item 会引深度环——
   随贴面文字入 labels 层（静态实体后、actors 前）即消；live 照常 `[data-part=…]` 查询换内文。

## 7. zoomfs 登记

- 三件套：`zoomBarHtml()` ×2 + `zoomFsCss()`（一次）+ `zoomFsScript()` 两实例 scoped（构建期
  querySelector→querySelectorAll[0/1]；第二实例 window 名 `__zfs`、泳道卡 `__zfsLane`——照抄 4.2
  §3 双实例补丁形态）。
- focus 选择器：泳道卡（stage 0）`["#lane-svg"]`；机器卡（stage 1）
  `['[data-name="cage.back"]', '[data-name="con.body"]']`（常驻实体，规避 data-part 空组聚焦塌陷坑）。

## 8. shots 清单（2026-11-04 重拍，console 全 clean）

machine-dark/light（F0 全景，2836 宽）、frame-01..10-dark（读数逐帧正确，见 §4 帧序真值）、
frame-06-switch-light / frame-09-bounds-light（亮主题代表帧）、lane-dark/light、page-dark/light
（1440×5242 全页）、phone-dark-390（390×6870）、phone-machine-390（358 宽机器卡）、reduced-dark
（prefers-reduced-motion）、z-cage-dark/light（主+辅卡笼特写 @4×）、z-console-dark/light
（仪表带特写 @4×）、z-nameplate-dark（教学锚特写 @4×）、lines-dark/light（线端环形图）。
工作脚本：steps-frames.json（帧序真值）、steps-shots.json / steps-shots-light.json（截图驱动）。

## 9. 已知边界

- 视觉像素级目检本轮由通道故障未能执行（§6 坑 1），三证闭环收案；通道恢复后可补肉眼复核
  （建议先看 z-cage/z-console 四张特写）。
- `__fig42` 别名与 4.2 页同名——两页互不加载无冲突；主会话登记 fig412 后可移除别名（live.mjs 末行）。
- 辅流卡笼 4 格+省略号不断言容量（§0）；Start Stream 态在转筒窗列全但演示不经过（主线无该转移）。
- 提取文本「6553339」上标伪影与 2^(MaxPStreams+1) 还原判据沿骨架版（backup-20261104/EVIDENCE.md
  断言表第 2/15 行），页内取值同源。

## §10 文字遮挡修复轮（2026-11-05，板块级 occlusion 探针清零）

探针：`scripts/xhci_spec_occlusion_probe.py`（默认 8 帧 dwell 5000ms）。本节基线 **24 处**
（走读卡接线修复后新值，~/.cache/zcode-tmp/occ_412.json）→ 终值 **OCCLUSION-PASS（0 处）**
（终版构件复跑，exit 0）。

### 10.1 逐 finding 处置表（手法：刻字绘制序后移 + labels 层后置 + 票据两遍渲染）

| 被盖文字（帧） | 遮挡者 | 手法 |
|---|---|---|
| 「0」「SCT 3」「辅0」「SCT 1」「环1」「2」「辅2」（F1 起主卡笼四卡） | gantry.beam（门架梁 item 109 悬在卡笼上空，216 长梁 bbox 罩住笼面文字带） | ctxCardSvg 拆体/字：卡体留 item 序（读卡滑车/笼墙互遮既证不动），刻字入 labels 尾层（`data-celltext` 五组含空卡，live 与 `data-cell` 同步显隐） |
| 「15」「SCT 1」「环15」（F1 格 15） | cage.wallE（笼东墙 98） | 同上 |
| 「5」「SCT 1」「Ptr=0」（空卡） | cage.lip（前唇 86） | ghostCardSvg 拆体/字，同上 |
| 「1」「环18」（辅流卡） | gantry.beam / sec.lip（辅笼前唇 38） | secCardSvg 拆体/字（`data-sectext`） |
| 「N」「ENT」「ED」（F2 起五张 TRB 卡） | con.lid / con.body / wire.bell:8 / wire.bell:9（环床文字带被控制台与拉线分段 bbox 罩住） | trbSvg 拆体/字：刻字入 labels（`data-trbtext` 五组，live 与 `data-trb` 同步重建/显隐） |
| 「✓」「已执行」（F7 ED 卡） | con.body | 同上 |
| 「Prime Pipe」「Start Stream」「xSPSM 状态（Figure 4-19）」（F3 转筒窗） | actors-tokens（门铃票据飞越总控台立面，票据在 labels 之前） | labels 层整体移到 actors 之后（labels 内只有线与文字——转筒窗/捕获窗/拆位窗组随层后置，永不被票盖） |
| 「N」「ENT」「ED」grp=actors-tokens（基线 F3 三条） | 前版 DOM 残影（本节票面无此三字——token 字表 门铃/Prime/包头/数据/NRDY/SID 0/17/Set TR） | 无需处置，终跑零出现佐证 |

### 10.2 机器读数回归（语义零变对表）

FRAMES/snapshot/cues 逐行零触碰；双主题 × 11 帧逐帧驱动实测（gate 报告
~/.cache/zcode-tmp/gate23_report.json）：stateOf 逐帧与 FRAMES 真值全等（F3 spsm=1 → F4
spsm=4/cstream=1 → F6 cstream=18 → F7 spsm=2 → F9 halt=1 → F10 spsm=1/halt=0），灯牌逐帧
全等（F4「步 4/10 · xSPSM Move Data · CStream 1 · 端点 Running」…F9「…端点 Halted」），
`data-cell`/`data-celltext`、`data-trb`/`data-trbtext`、`data-sec`/`data-sectext` 逐帧
display 全等，console/pageerror 双主题 11 帧 0。

### 10.3 门与产物

- occlusion 探针（默认参数，终版构件复跑）：`OCCLUSION-PASS`（exit 0）；
- scan_words retired：{回执:13, 泳道:10} ⊆ 允许集（零差异——本节注释未引入退役词）；
- shots 新增：occ-fix-dark.png（F4 全景，滑车在格 1 读卡）+ occ-fix-cage-zoom.png（卡笼
  特写——格号/SCT/指向刻字各归卡面无互叠；特写为锚元素外扩 60px 裁切，边缘截断属裁切框）。

### 10.4 坑实录

- **显隐循环 cache 顺序 bug（门 3 抓获，与 4.14 同型）**：cell 循环 body 分支先更新
  dispCache 致 text 分支永假、`data-celltext` 全程隐藏（探针假 PASS）。正解=一个 changed
  分支内同时落两组。**拆组改动必须配两组逐帧 display 全等断言**。
- 主卡笼上方 gantry.beam 与卡笼前唇/东墙的 bbox 罩字均为伪影（梁底 z 90 距卡顶 40.05 有
  50 世界单位；唇/墙在卡侧）——置尾解与 bbox 语义不对抗，位姿零改动。

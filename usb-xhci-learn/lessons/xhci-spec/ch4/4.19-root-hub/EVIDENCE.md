# EVIDENCE.md —— §4.19 根集线器（2026-11-04，anatomy 机器版「根集线器枢纽台」）

**范围声明（机器化施工）**：本页由「状态机骨架版」（table_page 表格节 + 状态机概览卡，原件在
`backup-20261104/`，sha256 见该目录 SHA256SUMS.txt）升级为 **anatomy 机器形态**——按 DESIGN.md §8
修订台账 2026-11-04 行「机器候选节…机器形态留后续会话」的追认执行（4.10/4.12/4.14/4.15 同批）。
现行页面结构对齐 4.14/4.15：正文块（要义+原文对照）+ **静态状态机总览次卡** + **机器动画卡**
（.fig-ctl 控制条）+ 九小节导览表 + USB2/USB3 差异对照表 + 互链卡 + 页脚；双主题
（index.html=dark、index-light.html=light）。

## 0. 机器概况与主题名

- **机器**：「根集线器枢纽台」——任务派单建议名沿用（词表自查：枢纽/台均不在 scan_words
  RETIRED_WORDS 任何词族；机器隐喻词使用面=总控台/文书台/试验盒/铭牌/灯排/事件匣/票据/拉线/拉杆/
  滑车/计数窗（§3.2 清单含追认）；「转筒/立板/读数条/插头」为机器实件名非隐喻）。一台根集线器
  端口枢纽台：左文书台（xHCI 驱动）——PORTSC 读数条（台面平嵌）、写入卡槽（Wr PR='1' / Wr PLS=U3
  +LWS / Wr PP='1' / 写 '1' 清位 四种写入卡）、清位拉杆、事件匣；中总控台（xHC）——立面**端口状态
  转筒窗**（Disconnected/Disabled/Reset/Enabled·U0/U3/Resume/Powered-off）+ **变化位灯排七灯**
  （CSC/PEC/WRC/OCC/PRC/PLC/CEC，副签=连接/使能/温复位/过流/复位/链路态/配置错）+ HCH 灯 +
  **PSCEG 门控窗**（七点 OR 阵列 + PSCEG 0/1 大读数 + 0→1 出事件/位未清阻塞 双态行）；台顶西段
  帧注记立板、东段**变化位纪律立板**（F9 点亮）、出卡口+事件出口短管、立面铭牌「xHC · 根集线器」；
  台前教学锚牌「读清才再开闸」；右试验盒（设备）——插头滑车沿总线链路行走=插拔（attach/detach）、
  设备侧窗（未上电/已上电/挂起中）、唤醒钮、教学锚长铭牌；两线：写入拉线（面板端子柱→总控台左面
  端子凸台）、事件回流管（台顶短管→事件匣）。
- **概念一句话**：端口状态转筒走到哪一格，变化位灯排按跳变点亮哪几盏；七位 OR 起来过 HCH 门成为
  PSCEG，**0→1 跳变**推一张端口状态变化事件卡入事件匣；驱动读 PORTSC、写 '1' 清位——位全清
  PSCEG 归零，该口才再开闸收下一事件。
- **概念↔机制映射**（对象即解释）：

| 机器件 | 规范机制 | 页码 |
|---|---|---|
| 端口状态转筒（七态列全，演示经 Disconnected→Disabled→Reset→Enabled·U0→U3→Resume→Powered-off） | 根集线器端口状态机；初始态=Disconnected | p272–278/p273 |
| 转筒态名+PORTSC 读数条（PLS/PP,CCS,PED,PR/Port Speed） | 记法=状态名+PLS+信号态四元组；进态强制信号态；复位完成 Port Speed=设备速度 | p272 Note/p273/p298 |
| 变化位灯排七灯+副签 | 七个状态变化位及各自置位条件（CSC=CCS 或 CAS 跳变/PEC=仅 USB2 PED 因 Port_Error 1→0/WRC=WPR 1→0/OCC=OCA 0→1/PRC=PR 或 WPR 1→0/PLC=PLS 迁移/CEC=配置错无状态位） | p291–292 |
| PSCEG 门控窗（OR 点阵+大读数+0→1 行） | 变化位 OR 过 HCHalted 门成 PSCEG；0→1 跳变才产生 Port Status Change Event；PSCEG 为内部信号不直接暴露软件 | p292–293 |
| 位未清＝阻塞行 + 台前锚牌「读清才再开闸」 | 一口的事件在全部变化位清零（PSCEG=0）前被阻塞 | p293 Note |
| 写入卡槽四种卡 + 清位拉杆 | Wr(Field=value)=软件写 PORTSC（记法）；变化位写 '1' 清除（保持到软件写 '1' 或 Chip Hardware Reset/HCRST） | p272/p291 |
| 事件出卡口+事件管+事件匣（单卡+读数计次） | Port Status Change Event TRB：TRB Type/Port ID/Completion Code=Success/Cycle bit；软件解析 Port ID 定位端口 | p294 |
| 插头滑车走链路（attach/detach 两向） | connect detect（CCS 0→1）→Disconnected→Disabled 置 CSC；disconnect detect（CCS→0）→Disconnected 置 CSC 清 PR/PED；USB2 Connect Detect=CCS | p274/p293 |
| 设备侧窗+唤醒钮+resume 信令票 | 设备只见 VBus 与总线信令；设备唤醒 U3→Resume 置 PLC（Wakeup signaling from a device） | p277/p289 |
| 复位信令票+Speed=FS 读数 | Wr(PR='1')→Reset→完成自动迁入 Enabled 置 PED/PRC；Port Speed=FS（演示样例） | p274/p298 |
| USB3 对照板（中段北槽） | attach 训练成功自动 Enabled·U0（在场判据 Polling→U0）；Disabled=写 PED='1' 两义；复位可失败退 Disconnected（WRC） | p279–283/p294 |
| 变化位纪律立板（台顶东段，F9 点亮） | 写 '1' 清·HCRST 亦可清；位全清才再开闸；读 PORTSC 与事件环无一致性保证 | p291–293 |

- **零件统计（audit 口径）**：**88 items · 56 solids · 2 tubes**（写入拉线/事件回流管，端环 rim 落
  端子柱顶与端口凸台面过 terminals）——预算 40–113 内。
- **演示样例（登记）**：根集线器 **USB2 端口 1**（示例值）、**FS 设备**——教学最全分支（必须走端口
  复位）；USB3 差异以 F4 对照帧+对照板+差异表承载，不与 USB2 主线混画。回 U0 的两段写法（USB2
  Resume→U0）显式注记「归 §4.15」不在本机复演（p277–278）。
- **派单建议词更正（按原文核定）**：派单写「CSC/PEC/WRC/OCC/PRC/PLC/**PPC** 等」——**PPC 不是变化位**：
  PPC=Port Power Control 能力旗标（声明是否支持端口电源开关，p294）；PORTSC 的七个变化位=
  CSC/PEC/WRC/OCC/PRC/PLC/**CEC**（p291 引文④逐字）。机器灯排按原文七位刻。
- **帧数 11**（F0–F10），DUR [3000,5400,4800,7200,4200,5400,5400,6000,7200,4200,3000] ms，
  巡游驻留 5.5s。
- 读数（卡右下，与帧模型同源）：`步 n/10 · 端口 <Disconnected|Disabled|Reset|Enabled·U0|U3|Resume|Powered-off> · 变化位 n/7 · 事件 n`。

## 1. 页码机核（pypdf needle，全部现场跑）

命令（study 仓根）：
```
python3 scripts/xhci_spec_pagecheck.py 272 "4.19 Root Hub" 272 "Signal State values are" 272 "large bubble" \
273 "Figure 4-25" 273 "The initial state is Disconnected" 274 "advance to the Enabled state" \
274 "A device connect detect" 274 "disconnect detect" 275 "Figure 4-26" 277 "U3Entry" \
278 "Figure 4-27" 279 "from any state except Powered-off" 283 "Powered-off, or Disabled states" \
285 "Figure 4-30" 291 "Port Status Change Generation" 291 "seven status change bits" \
291 "cleared by a system" 291 "or the assertion of a Chip Hardware" 292 "PSCEG" \
292 "no coherency guarantees" 293 "HCHalted" 293 "ORed together and gated" \
294 "Connect Status Change Reporting" 294 "RxDetect to the Polling state" 294 "Polling to the U0 state" \
294 "The CCS bit in the respective" 295 "Enabled U0 States" 298 "Port Reset" 299 "never fail the bus reset" \
300 "Port Routing and Control" 302 "Cold Attach Status" 303 "EXT_PORT_SPEED"
```
→ **33/33 PAGE-OK，PAGECHECK-PASS**。补跑（页内其余被引页的 needle，首轮两条猜测 needle MISS
后按提取文本实串复跑）：
```
python3 scripts/xhci_spec_pagecheck.py 276 "transition the port to the U3Entry" 276 "suspend the device" \
281 "Downstream" 286 "Figure 4-31" 289 "Figure 4-33" 290 "a USB device is not allowed" 290 "LFPS Handshake" \
299 "Warm Port Reset" 299 "Test_SE0_NAK" 300 "at most one port in test mode" 301 "Figure 4-35"
```
→ **10/10 PAGE-OK，PAGECHECK-PASS**（合计 43/43）。页头 specRef 的 p272–303 与三小节起始页以
上两轮为据（4.19.1 p272 / 4.19.2 p291 / 4.19.3 p294；§4.20 起于 p303 由 'EXT_PORT_SPEED'@303
同页侧证；p276/281/286/289/290/299/301 覆盖正文与表格引用的全部其余页）。

## 2. 帧序断言（11 帧）

| 帧 | 画面断言 | 判据 |
|---|---|---|
| F0 全景 | 端口 Disconnected（PLS=RxDetect · 1,0,0,0），滑车未插停靠设备侧，设备窗「未上电」，七灯灭，PSCEG=0「位全清→再开闸」行，HCH 灯 Run | p273/p278 初始态=Disconnected；p294 PP='1' 等 VBus 信令 |
| F1 插入 | 滑车走链路到端口 → CCS 0→1 → 转筒→Disabled（PLS=Polling · 1,1,0,0）+ CSC 灯亮 → PSCEG 0→1 → 事件卡「CSC·插入」经出卡口走事件管入事件匣；设备窗「已上电」；注记「插入三步 CCS→CSC→PSCEG 0→1」 | §4.19.3 p294 三步原文（引文⑦前件）；p274 connect detect→Disabled 置 CSC；p294 USB2 在场=RxDetect→Polling |
| F2 驱动读清 | 读数条 PLS Polling/CCS=1/变化位 CSC → 写入卡「读 PORTSC｜CSC=1·CCS=1」→ 清位拉杆+「写 '1'」票走拉线 → CSC 灯灭、PSCEG 归 0（「位全清→再开闸」）；读数变化位 0/7 | p294 软件解析 Port ID 后读 PORTSC 判 CSC=1+CCS=1=插入；p291 写 '1' 清；p293 位全清再开闸 |
| F3 端口复位 | 写入卡 Wr(PR='1') → 转筒 Disabled→Reset（PR=1）→ 复位信令票走链路 → 完成自动 Enabled·U0（PED=1、PRC 灯亮、读数条 Speed=FS）→ PSCEG→事件卡「PRC·复位完成」→ 读清 | p274 引文②（复位完成自动迁入置 PED/PRC）；p291 PRC=PR 1→0；p298 Port Speed=设备速度（FS=样例） |
| F4 USB3 对照 | 对照板点亮：attach 训练成功自动 Enabled·U0（Polling→U0）/Disabled 两义/复位可失败退 Disconnected（WRC）/Connect Detect=远端终端电阻；演示口保持 U0 不受扰 | p294 引文⑧；p279 引文③；p279–283；p293 USB3 Connect Detect 注 |
| F5 挂起 | 写入卡 Wr(PLS=U3+LWS='1') → 转筒 U0→U3、设备窗「挂起中/链路安静」→ PLC 灯亮 → 事件卡「PLC·挂起」→ 读清 | p275–276（骨架版已核：两族同写 Wr(PLS=U3+LWS='1')；PLS 迁移置 PLC） |
| F6 设备唤醒 | 唤醒钮压下 → resume 信令票 设备→xHC → 转筒 U3→Resume + PLC 灯亮 → 事件卡「PLC·Resume」→ 读清；注记「回 U0 写法归 §4.15」 | p277 设备唤醒 U3→Resume 置 PLC（Device Initiated Resume）；p277–278 两段写法 |
| F7 拔出 | 滑车拔出（反向走链路）→ CCS 1→0 → 转筒→Disconnected（PED 清、CSC 灯亮）→ 事件卡「CSC·拔出」→ 读清；设备窗「未上电」；注记「读出 CSC=1＋CCS=0」 | p274 disconnect detect→Disconnected 置 CSC 清 PR/PED；p294 同法判拔出 |
| F8 过流对照 | OCA 过流 → 转筒任一态→Powered-off（PP=0 · 0,0,0,0）+ OCC 灯亮 → 事件卡「OCC·过流」→ 读清 → 写入卡 Wr(PP='1') → 转筒回 Disconnected | p274 过流/写 PP='0' 任一态→Powered-off；p291 OCC=OCA 0→1；p274 Wr(PP='1') 回 Disconnected |
| F9 七位纪律 | 台顶纪律立板点亮：变化位与读清纪律五行（写 '1' 清·HCRST 亦可清/位全清才再开闸/读 PORTSC 与事件环无一致性保证） | p291（清位纪律）；p293（阻塞）；p292（无一致性保证 Note） |
| F10 读数巡回 | 台前锚牌点亮「读清才再开闸」；读数巡回回 F0 | p292–293（逐口事件闸门） |

**帧序 drive 真值**（§5 门表命令）逐行输出与上表一致：22 条断言（11 终态+11 瞬态 until 锚定）全
true、console clean。瞬态断言用 drive `until` 轮询锚定（超时即 throw，不会假阳）——灯亮瞬态
（csc/prc/plc/occ）与终态读数分开设断言。

## 3. 常驻机构与总览卡断言

| 断言 | 判据 |
|---|---|
| 面板刻字「清位闸：写 '1' 清变化位（p291）／清零才再开闸（p293）」 | p291/p293 |
| 灯排副签七条（连接/使能/温复位/过流/复位/链路态/配置错） | p291–292 逐位定义 |
| HCH 灯（Run 门）常亮 | p293 HCH='0' 且事件环未满才发事件（演示常驻 Run） |
| PSCEG 窗「0→1 出事件（p293）」+「位未清＝阻塞再上报／位全清→PSCEG=0→再开闸」双态行 | p293 引文⑥+两条 Note |
| 立面铭「xHC · 根集线器」+底行「根集线器每口一套 PORTSC（p291）」 | p291 首句；p300（每连接类型一套） |
| 台顶纪律立板五行 | p291–293（§0 表末行） |
| USB3 对照板五行 | p279–294（§0 表） |
| 台前锚牌「读清才再开闸／PSCEG=0 才再收事件（p293）」 | p293 Note |
| 设备锚牌「插拔与上电之源／只见插拔与总线信令／PORTSC/变化位对设备不可见」 | p294（设备只感到 VBus/信令；寄存器/事件在主机侧） |
| 状态机总览卡（两栏同构 5 态+域框+14 边）与骨架版坐标一致（箭头触边审计 28 端点 0.00px） | 骨架版 EVIDENCE 状态/迁移清单（Figure 4-25 p273 / 4-27 p278 现场值），本轮复跑 audit_arrows 双主题 PASS |
| 九小节导览表+差异对照表沿用骨架版逐行判据（含避雷三条） | 骨架版断言表（p272–303 逐行），页码本轮 33 needle 复核覆盖 |

### 原文对照八条（正文 blockquote）
逐字取自提取文本 p272/p274/p279/p291/p291/p293/p294/p294；弯引号 '' 与 "" 按提取文本保留；
每条尾注 `(xHCI 1.2b §x pNN)` 与 §1 机核对应。新增两条（七位清单 p291、清位纪律 p291），
骨架版六条沿用。

## 4. 总览卡去留决定

**保留骨架版状态机概览卡（静态，zoomfs），退役页面级的「机器形态留后续会话」注记**——
4.14/4.15 同款决定：
1. DESIGN §4 模板双卡（流程图/总览卡+动画卡）是板块常态形态；
2. 总览卡是**两族并排的全图地图**（USB2 vs USB3 同构对比、大泡、Enabled 域框），机器是**单演示
   端口的逐帧行程**——互补不重复；骨架版本就无步进模式（纯静态+zoomfs），无可退役交互；
3. 九小节导览与差异对照表继续承载 4.19.4–4.19.9（电源/复位/测试模式/路由/冷连接/速度）——
   机器帧数预算内不逐小节上帧（派单明示）。
实现：总览卡由 table_page 注入改为本 build.mjs 内静态 SVG（骨架版坐标不变，配色随主题内联）；
骨架版 smoke_state.py 适配双舞台（.iso-stage=2、__zfs/__zfsState 双实例、__fig419/__fig42 API）。

## 5. 验收门结果（2026-11-04 实跑，全绿；命令完整可复跑）

| 门 | 命令（完整可复跑） | 末行输出 |
|---|---|---|
| audit ×2 | `node build.mjs --audit` / `node build.mjs --light --audit`（节目录内） | `audit passed` ×2（audit · 2 tubes · 56 solids · 88 items · 1 depth states · 195 overlaps · 195 order rules；clearance/terminals/loose/folds/support/sunk/depth/through/self-overlap/wobble/saddles/stand-in/crowding 全 0） |
| lines ×2 | `node ~/.zcode/skills/anatomy/scripts/lines.mjs index.html --select '.fig-wrap .iso-plate' --out shots/lines-dark.png`（+ index-light.html） | `line ends: 0 of 38 ends on 35 lines float` ×2 · console clean ×2 |
| 文字墨迹 SAT | `python3 ink_check.py`（本节目录；getBBox×getScreenCTM 四角 SAT，帧 0/1/3/5/8 ×双主题） | `ink-overlaps 0` ×10（首轮 30–42——修复链见 §7 坑 2/3/4） |
| 遮挡探针 ×2 | `python3 scripts/xhci_spec_occlusion_probe.py lessons/xhci-spec/ch4/4.19-root-hub/index.html --frames 11 --dwell-ms 8000`（+ index-light.html；study 仓根） | `OCCLUSION-PASS` ×2（首轮 2 命中——修复链见 §7 坑 1） |
| 控制条探针 ×2 | `python3 scripts/xhci_spec_ctl_probe.py /Users/jason/ZCodeProject/usb-xhci-study/lessons/xhci-spec/ch4/4.19-root-hub/index.html fig42`（+ index-light.html） | `CTL-PROBE-PASS` ×2（四钮实驱；帧计数取 `window.__fig419.frameOf()`——本页暴露 `__fig419` 主名 + `__fig42` 兼容别名） |
| 页码机核 | §1 命令 | `PAGECHECK-PASS`（33/33） |
| 语言门 ×2 | `python3 scripts/scan_words.py retired lessons/xhci-spec/ch4/4.19-root-hub/index.html`（+ index-light.html；study 根） | `total=3 {'回执': 3}` ×2——残留 family ⊆ 豁免表 {回执,柜台,泳道}，PASS（回执=§3.2 隐喻词；首轮咬「下一站」×1——linksHtml 改「相邻节」后清零） |
| 帧序真值 | `node ~/.zcode/skills/anatomy/scripts/drive.mjs index.html --actions steps-frames.json` | 22 条断言逐行正确（§2 表）：F0 `步 0/10 · 端口 Disconnected · 变化位 0/7 · 事件 0` / F1 `变化位 1/7 · 事件 1 drum=true tray=CSC·插入 plug=true 阻塞=true` / F2 `cscOff=true 开闸=true` / F3mid `prcOn=true` / F3 `Enabled·U0 prcOff=true tray=PRC·复位完成` / F4 `usb3lit=true` / F5mid `plcOn=true` / F5 `U3 tray=PLC·挂起 dev=挂起中` / F6mid `plcOn=true` / F6 `Resume tray=PLC·Resume` / F7mid `cscOn=true` / F7 `plug=false tray=CSC·拔出 dev=未上电` / F8mid `occOn=true` / F8 `Disconnected tray=OCC·过流` / F9 `bitslit=true` / F10 `anchorLit=true 事件 6`；console clean |
| 交互冒烟 | `python3 smoke_state.py`（机器节双舞台形态） | `STATE-SMOKE-PASS`（dark/light console=0 zoombar=2 zfs=True stage=2 api=True） |
| 自包含 | `grep -c 'http://\|https://' index.html`（+light） | 各 3，命中全为 `http://www.w3.org/2000/svg` xmlns（`grep -o` 复核唯一值）→ PASS |
| 互链 | `python3 linkcheck.py` | `LINKCHECK-PASS`（双页 9 hrefs missing=[]；4.18/4.20/4.2/4.3/4.4/4.15/4.17 直链节页 + 板块 index + EVIDENCE.md；待建节（§5.4.8/§4.6）链板块 index.html 并标「待建」） |
| 箭头触边 ×2 | `python3 audit_arrows.py index.html`（+ index-light.html；节目录内） | `ARROW-EDGE-PASS`（28 端点 0.00px ≤2.5px） |
| shots | §8 清单各命令 | 每张 `console: clean` |

## 6. zoomfs 登记与字号台阶

- 三件套：`zoomBarHtml()` ×2 + `zoomFsCss()`（一次）+ `zoomFsScript()` 两实例 scoped（构建期
  querySelector→querySelectorAll[0/1]；总览卡 `__zfsState`、机器卡 `__zfs`）。
- focus 选择器：总览卡（stage 0）`[".st-u0"]`（骨架版沿用）；机器卡（stage 1）
  `['[data-name="con.body"]', '[data-name="desk.body"]']`（常驻实体，规避 data-part 空组聚焦塌陷）。
- 存活验证：smoke_state 断言 `__zfs`/`__zfsState` 双对象 + drive eval `__zfs.setZoom(3.2)` →
  `phone-390-zoom.png`（readout 行同步截到）。
- 等效 px = 世界字号 × KS 1.638 × 页内显示比（1420/920 ≈ 1.54）≈ **世界字号 × 2.525**：
  - 主层：工位铭牌主行 9（≈22.7px）/副行 6；立面铭「xHC · 根集线器」5.4（≈13.6）；转筒态名 5.2
    （≈13.1）、PSCEG 大读数 7.0（≈17.7）、读数条首二行 4.4/4.0（≈11.1/10.1）、设备窗值 6.4、
    板题 5.8（USB3 板）/3.8（纪律板题，台顶远距件——细节层边缘，下方登记）、锚牌首行 5.4-5.6。
  - 细节层清单（1× ≥7px 等效、3.2× 档充裕）：灯位名 4.0（≈10.1）/副签 3.2（≈8.1）、HCH 标签
    4.0/3.2、读数条三四行 3.4（≈8.6）、PSCEG 窗行 3.0-3.8、注记板行 3.8-4.2、纪律板行 3.4、
    台顶 RH-1 4.0、票据两行 3.8、事件卡 3.2、写入卡 3.4-3.8、台面散注（卡槽/事件匣/链路/出卡口）3.8-4.6。
  - 正文 16.5px、总览卡框字 17/14px、页码 13px@1×、表格 14.5px。

## 7. 施工坑与绕法（本轮实测）

1. **高立板遮挡后方台面件（遮挡探针咬出）**：PORTSC 读数最初做成台面前沿**立板**（板实体
   z 33..59）——在写入卡槽/卡槽铭前方，物理挡视线（探针 2 命中 overlap 0.81/0.77）。修：改台面
   **平嵌读数条**（h 0.8 低平件），任何角度不挡。判据：台面区加高件先查它与北邻（卡槽/事件匣）的
   屏幕带关系。
2. **geometry-live 的 FT 按位传参坑（墨迹检查咬出的真雷）**：build 侧 FT 包装是
   `FT(m, text, size, tone, anchor)→faceTextSvg(m,text,{size,tone,anchor})`，geometry-live 里新写
   的 topText 误把 `{size,tone,anchor}` 对象整个传给按位 `size` → `font-size="[object Object]"`
   → 浏览器回退默认 **16px 巨字**，四条读数行横扫台面。遮挡探针不咬（labels 层文字 vs 实体不在其
   检查域，见坑 5），drive 读数断言也不看字形——只有墨迹 SAT 抓到。修：按位传参。判据：新窗口
   函数写完先 dump `font-size` 属性抽查。
3. **转筒/窗内文字宽度预算**：态名最长 Disconnected（12 字符）在 5.8 号超窗宽（38）被 clip 截尾，
   且同行右对齐 PLS 副标加剧溢出；墨迹 SAT 报 Disconnected×CSC（溢出段扫到灯排区）。修：态名 5.2
   号单行（PLS 读数归台面读数条，窗内不放副列）。判据：**转筒/数码窗的文字预算=最长表项字符数×
   字号×0.55 ≤ 窗宽−边距**，先算后写。
4. **高立面文字带扫低板（结构级）**：立面/台顶的长文在等距投影里是斜带，会横扫中段低板与台面
   铭牌（con 台顶铭 9 号 106 单位的长带与事件匣铭/纪律板题/写入卡槽铭三处相交）。修三步：台顶铭
   改刻**立面**（竖直面文字是窄带）+缩短（「xHC · 根集线器」5.4）；台顶副题行删除；变化位纪律板
   从中段南槽**迁台顶东段立板**（与台顶西段注记板对峙，中段南槽让空）。判据：竖直面（立面窗/立板）
   放长文，水平面（台面/台顶平刻）只放短铭——4.15 的台顶铭能活是因其邻域空，本节台面前方有低板群。
5. **遮挡探针对 labels 层文字的盲区**：探针查「文字 bbox vs DOM 序在后的**实体**」——labels 层
   在全部实体**之后**绘制，故 labels 文字被实体盖/文字互叠/文字溢出窗三类都不在其域内（本轮
   溢出的注记行、font-size 巨字均漏过）。补偿＝文字墨迹 SAT（ink_check.py，4.14 先例的固化版）：
   getBBox×getScreenCTM 四角求交，双主题×5 帧。**建议主会话把 ink_check 升级为板块脚本
   `scripts/xhci_spec_ink_probe.py` 并入机器页交付门**（判定纯机械：SAT 求交+阈值；4.14 当时亦以
   一次性脚本收尾，本节第二次手工重建同型链——固化时机已到）。
6. **drive 帧序真值的无头竞态**：① wall-clock 定点 wait 断言与 rAF 打嗝竞态（F4 零余量断言
   假阴、F6 步号晚一拍）——终态断言余量 ≥DUR+1400ms，瞬态断言改 `until` 轮询锚定（超时 throw，
   不会假阳）；② 同帧复合断言里「同 cue 的两个读数」也会因 until 与 eval 分属两个 CDP 往返而
   貌似矛盾——瞬态断言单一职责化（只断 until 锚定的那一个事实）；③ 转筒 textContent 含邻域表项
   （|i−pos|≤1.3 都渲染）——`includes('Resume')` 在 pos≈4 就真，不能当"已到 Resume"的证据，须以
   readout/stateOf 为准。
7. **live 两个状态机 bug（drive 真值抓出）**：① 灯位熄灭失效——`Object.assign({}, s.bits)` 后
   键消失的灯永不走 toggle off（F2 cscOff=false 实锤）；修为全键循环。② snapshot 的 `sent` 派生
   缺失——帧终态位仍置时应显示「位未清＝阻塞」而非「位全清开闸」；修为
   `sent: BIT_KEYS.some(b=>f.bits[b])`。
8. **视觉通道双路 400（如实标注）**：PNG 直传 analyze_image 400（4.12/4.14/4.15 坑持续），本轮
   sips 重编码 JPEG 后 file:// 与 CDN URL **两条路都 400**（后者是 Read 通道的 URL，非视觉 MCP 的
   可用输入）。美学维以四证闭环代替：遮挡 0 ×2 + 墨迹 SAT 0 ×10 + audit/lines 0 ×2 + 帧序真值
   22/22；shots 留人工过目。
9. **capture.mjs 无 --eval 选项**：缩放截图须走 drive（eval `__zfs.setZoom(3.2)` + shot），
   capture 的 --eval 参数被静默忽略（输出仍 console clean，易误以为已缩放）——判据：缩放截图
   一律 drive 通道。

## 8. shots 清单（35 张，console 全 clean）

- 页面全景：page-dark.png / page-light.png（1500 宽整页）
- 机器卡：machine-dark.png / machine-light.png（F0 全景）
- 总览卡：state-diagram-dark.png / state-diagram-light.png
- 逐帧：frame-01-attach … frame-10-tour-dark（10 张，drive 步进取景）+ frame-03/05/08-light（3 张）
- 390：phone-390-dark.png / phone-390-light.png / phone-machine-390.png / phone-390-zoom.png
  （__zfs.setZoom(3.2)，readout 行同步入画）
- reduced：reduced-dark.png（prefers-reduced-motion）
- 特写 @4×：z-lamps（灯排+PSCEG 窗）/ z-drum（转筒+立面铭）/ z-desk（清位闸+卡槽+事件匣+读数条）/
  z-linkdev（链路+滑车+试验盒+锚牌）/ z-console（立面窗组全幅）× dark/light（10 张）
- lines：lines-dark.png / lines-light.png
- 工作脚本：steps-frames.json（帧序真值）、steps-shots.json / steps-shots-light.json（截图驱动）、
  ink_check.py（墨迹 SAT，§7 坑 5 补偿件）、linkcheck.py（互链存在性）、smoke_state.py（双舞台
  冒烟）、audit_arrows.py（总览卡箭头触边，骨架版沿用）。

## 9. 已知边界与共享件建议（报主会话）

1. **遮挡探针 labels 盲区 + ink_check 固化建议**（§7 坑 5）：`scripts/xhci_spec_ink_probe.py`
   化后并入机器页交付门——本节与 4.14 各自手工重建过同型检查链，且它抓到过遮挡探针必漏的
   font-size 巨字雷；4.12 的 xSPSM 转筒同类溢出风险也在其域内。
2. **水平面长文禁令建议登记为板块级判据**（§7 坑 4）：台顶/台顶平刻长文=斜带扫邻——竖直面放
   长文、水平面只放短铭；4.15 台顶铭存活属邻域空旷的个例，非可复制先例。
3. `__fig42` 别名与 4.2 页同名（4.14/4.15 同款边界，两页互不加载无冲突）；主会话在两探针登记
   `fig419: window.__fig419.frameOf()` 后可移除别名。
4. 机器演示 USB2 端口 1（FS 样例）；USB3 差异/复位失败/CAS（4.19.8）/测试模式（4.19.6）/路由
   （4.19.7）/SSP 速度（4.19.9）不逐帧展开（帧数预算取舍，对照板+导览表+差异表承载）；
   PME# 生成（Figure 4-34 下半）与 Event Ring 满阻塞仅在导览表收口，机器只演事件通路主线。
5. PSCEG 门控窗为机制示意图（OR 点阵+门+读数），非 Figure 4-34 电路图复刻——原图归 p293
   （导览表 4.19.2 行标注）；CEC 无状态位（p292）在灯副签「配置错」+纪律板承载，不另造窗。
6. 视觉像素级目检本轮通道全断（§7 坑 8），四证闭环+shots 人工过目兜底；上线前建议主会话评分轮
   以可用通道补一轮特写目检。

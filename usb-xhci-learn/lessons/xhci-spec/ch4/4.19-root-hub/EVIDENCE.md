# EVIDENCE.md —— §4.19 根集线器（2026-11-04，状态机大图＋表格节 · 骨架版）

## 骨架范围声明

按分级裁定，§4.19 的 anatomy 机器形态**留后续会话**——本页为状态机骨架版：
状态机概览卡（两栏同构六态骨架简版图）＋ 九小节导览表 ＋ USB2/USB3 差异对照表。
全图逐态细节（USB2 的 Reset/Test Mode/Enabled 子态机 U2Entry/U2/U2Exit/U3Entry/Resume/RExit、
USB3 的 Polling 子态机 Training/CfgExcg/DbC、Compliance/Error/Loopback、Enabled 子态机
U1'/U2'/U3'/Recovery）不在本页复刻，归 §4.19.1 原文（p272–291）与原图
Figure 4-25 至 4-33（页内读图注记已标）。

## Figure 编号现场核定（修正派发单猜测）

| Figure | 内容 | 页 |
|---|---|---|
| Figure 4-25 | USB2 Root Hub Port State Machine（顶层六态） | p273 |
| Figure 4-26 | USB2 Root Hub Port **Enabled Substate** Diagram | p275 |
| Figure 4-27 | USB3 Root Hub Port State Machine（顶层九态） | p278 |
| Figure 4-28 | USB3 Polling Substate Diagram | p280 |
| Figure 4-29 | USB3 DbC Substate Diagram | p282 |
| Figure 4-30 | USB3 Enabled Substate Diagram | p285 |
| Figure 4-31/4-32/4-33 | U1' / U2' / U3' Substate Diagram | p286 / p287 / p289 |
| Figure 4-34 | Example Port Change Bit → Port Status Change Event Generation（PSCEG） | p293 |
| Figure 4-35 | Port Routing Example | p301 |

派发单写「Figure 4-26/4-27」为两台顶层机猜测——**实测 USB2 顶层=Figure 4-25（p273），
Figure 4-26 是 USB2 Enabled 子态图（p275）**；本页按实测编号标注。

## 状态图：状态/迁移清单（简版口径）

状态盒（每栏 5 盒 + 1 个 Enabled 子态域虚线框；PLS/信号态取 Figure 4-25 p273 / 4-27 p278 原值）：

| 状态 | USB2（PLS · PP,CCS,PED,PR） | USB3（PLS · PP,CCS,PED,PR） |
|---|---|---|
| Disconnected | RxDetect · 1,0,0,0 | RxDetect · 1,0,0,0 |
| Powered-off | Disabled · 0,0,0,0 | Disabled/RxDetect · 0,0,0,0 |
| Disabled | Polling · 1,1,0,0 | Disabled · 1,0,0,0 |
| U0（Enabled 子态） | U0 · 1,1,1,0 | U0 · 1,1,1,0 |
| U3（Enabled 子态） | U3 · 1,1,1,0 | U3 · 1,1,1,0 |

迁移边（USB2 7 条 + USB3 7 条 = 14 条审计边，全部对页）：

| # | 边（两栏同拓扑位） | USB2 条件 | USB3 条件 |
|---|---|---|---|
| E1 | Disconnected→Disabled / Disconnected→U0 | 连接检测 CCS='1'·CSC='1'（p274） | 连接检测→Polling→训练+配置成功→U0·CSC='1'（p279/p281/p295） |
| E2 | Disabled→U0 / Disabled→Disconnected | 复位主线：Wr(PR='1')→Reset→完成自动迁入·PED/PRC='1'（p274） | Wr(PLS=RxDetect+LWS='1') 或 HCRST（p279） |
| E3 | U0→Disabled | Wr(PED='1') / Port_Error·PEC='1'（p275） | Wr(PED='1')（任一态除 Powered-off）（p279） |
| E4 | U0→U3（挂起） | Wr(PLS=U3+LWS='1')（p275–276） | Wr(PLS=U3+LWS='1')（p286） |
| E5 | U3→U0（恢复） | 主机 Wr(PLS=Resume+LWS)→Resume（软件计时）→Wr(PLS=U0+LWS)→RExit→U0；设备唤醒→Resume·PLC='1'（p277–278） | 主机 Wr(PLS=U0+LWS)→U3Exit（LFPS 握手成功）→U0；设备唤醒→Resume→RExit·PLC='1'（p289–290） |
| E6 | U0⇢Powered-off（大泡虚线） | 任一态·PP='0'/OCA='1'（p274） | 任一态·PP='0'/OCA='1'（p279） |
| E7 | Powered-off→Disconnected | Wr(PP='1')（p274） | Wr(PP='1') 或 HCRST（p279） |

未画（归原图）：USB2 Test Mode、USB3 Compliance/Error/Loopback/Polling 四态、
两族 Enabled 子态机（Figure 4-26 p275 / 4-30 p285）、Polling 子态（4-28 p280）、
DbC 子态（4-29 p282）、U1'/U2'/U3'（4-31/32/33 p286/287/289）、USB2 Disabled→Disconnected
拔出检测边（4.19.1.1.2 p274，脚注 57：Reset 态检不出拔出——表卡未收、注记留原图）。

## 逐条断言 → 判据

| 断言 | 判据 |
|---|---|
| 根集线器=每「连接器×协议」一套 PORTSC；USB2/USB3 数量可不等；归属由 Supported Protocol Capability（§7.2）定 | §4.19.7 p300（pagecheck `Port Routing and Control`@p300；`Figure 4-35`@p301）；端口 1..MaxPorts=HCSPARAMS1（5.3.3，p301 Note）；USB2 口=PORTSC+USB2 PORTPMSC、USB3 口=PORTSC+USB3 PORTPMSC+PORTLI（p300 Note） |
| 状态机记法=状态名+PLS+信号态四元组（PP,CCS,PED,PR）；进入态时信号态强制 | §4.19.1 p272（pagecheck `Signal State values are`@p272；强制 Note p272 原文） |
| 大泡=泡内任一态按条件迁出 | p272（pagecheck `large bubble`@p272；引文逐字） |
| 图只示意、文字定义为权威；状态机只引用 PLC，其余 change bit 归 4.19.2 | §4.19.1 头部两条 Note p273 |
| 初始态=Disconnected（两族） | p273（USB2）/ p278（USB3）原文 "The initial state is Disconnected." |
| USB2 六态与信号态值 | Figure 4-25 p273 现场提取文本（Disabled=Polling·1,1,0,0；Reset=Undefined·1,1,0,1；Enabled=U0,U2,U3,Resume·1,1,1,0；Disconnected=RxDetect·1,0,0,0；Test Mode=Test Mode·1,x,x,0；Powered-off=Disabled·0,0,0,0） |
| USB3 九态与信号态值 | Figure 4-27 p278 现场提取文本（Reset=Undefined·1,1,0,1；Compliance·1,0,0,0；Error=Inactive·1,0,0,0；Loopback=Test Mode·1,0,0,0；Enabled=U0,U1,U2,U3,Resume,Recovery·1,1,1,0；Disabled·1,0,0,0；Disconnected=RxDetect·1,0,0,0；Polling·1,0,0,0；Powered-off=Disabled or RxDetect·0,0,0,0） |
| USB2 Disabled→Reset=Wr(PR='1')（p274）；Reset 完成自动 Enabled·PED/PRC='1' | §4.19.1.1.3–4.19.1.1.4 p274（pagecheck `advance to the Enabled state`@p274；引文逐字） |
| USB2 Enabled→Disabled=Wr(PED='1') 或 Port_Error（PEC='1'） | §4.19.1.1.6 p275（pagecheck `Figure 4-26`@p275） |
| USB3 Disabled=Wr(PED='1') 从除 Powered-off 外任一态进入；出口 RxDetect/HCRST | §4.19.1.2.1 p279（pagecheck `from any state except Powered-off`@p279；引文逐字） |
| USB3 复位入口=PR/WPR/HCRST（除 Disconnected/Powered-off/Disabled 外任一态）；失败→Disconnected | §4.19.1.2.5 p283（pagecheck `Powered-off, or Disabled states`@p283） |
| USB2 复位永不失败；失败收场（USB3）=PLS=RxDetect('5')·PRC='1'·Speed=Undefined('0')·CCS='0' | §4.19.5 p298–299（pagecheck `never fail the bus reset`@p299；成功/失败两张 PORTSC 更新清单 p298 逐字段） |
| Warm Reset=Hot 全部功能+链路重训（Rx.Detect 起、更耗时）；WPR/WRC 仅 USB3、USB2 口 RsvdZ | §4.19.5.1 p299（pagecheck `Warm Port Reset`@p299） |
| 挂起两族同写 Wr(PLS=U3+LWS='1')；USB2 经 U3Entry（U3C·U3E='1' 时 PLC）；USB3 经 U3' 机 U3Entry（收到 LAU 进 U3） | §4.19.1.1.7–4.19.1.1.11 p275–276；§4.19.1.2.10 p286（pagecheck `Figure 4-30`@p285）；§4.19.1.2.13.1 p289 |
| USB2 主机恢复=两段写（Resume→软件计时→U0→RExit）；USB3=一段写 U0→U3Exit（LFPS）；设备不许拒绝主机恢复 | §4.19.1.1.12–4.19.1.1.14 p277–278（Note：Software shall time the duration of the Resume state）；§4.19.1.2.13.2–4.19.1.2.13.5 p289–290（"a USB device is not allowed to reject a resume request from the host"） |
| 设备唤醒两族都置 PLC='1'（Wakeup signaling from a device） | p277（USB2）/ p289（USB3）原文 |
| attach 上报三步（CCS→CSC→PSCEG 0→1 发事件 TRB：Type/Port ID/Success/Cycle bit）；USB2 在场=PLS RxDetect→Polling（软件随后复位）；USB3 在场=Polling→U0 | §4.19.3 p294（pagecheck `Connect Status Change Reporting`@p294、`RxDetect to the Polling state`@p294、`Polling to the U0 state`@p294；引文⑥⑦逐字） |
| 七个变化位 CSC/PEC/WRC/OCC/PRC/PLC/CEC；变化位写 '1' 清零、Chip Hardware Reset/HCRST 亦可清 | §4.19.2 p291（pagecheck `seven status change bits`@p291） |
| PSCEG=变化位 OR 后经 HCHalted 门控；**0→1 跳变才发 Port Status Change Event**；全部位清零前该口事件被阻塞；读 PORTSC 与事件环无一致性保证 | §4.19.2 p291–293（pagecheck `PSCEG`@p292、`HCHalted`@p293；引文⑤逐字 p293；阻塞/一致性两条 Note p292–293） |
| PEC 仅 USB2 口 PED 1→0（Port_Error）；WRC=WPR 1→0；OCC=OCA 0→1；PRC=PR/WPR 1→0；CEC 无对应状态位 | §4.19.2 p291–292 逐位定义原文 |
| PPC 与 VBus 自动上电；初始态=Disconnected；MaxSlotsEn 延迟 PP 特性；xHC 未运行端口即可报连接 | §4.19.4 p294–295（pagecheck `Enabled U0 States`@p295=4.19.4.1 头） |
| USB2 口五种测试模式、USB3 口无；至多一口在测；测试序列四步（禁槽→全口 Disabled→R/S='0' 等 HCH='1'→写 Port Test Control） | §4.19.6 p299–300（pagecheck `Test_SE0_NAK`@p299、`at most one port in test mode`@p300） |
| Cold Attach Status 三条件齐才置位、非通用在场指示；CAS 拉起 CSC；WPR 清 CAS；USB2 口恒 '0' | §4.19.8 p302–303（pagecheck `Cold Attach Status`@p302） |
| SSP：GetStatus(PORT_SPEED) 恒回 '0'（5Gb/s）保 legacy 驱动；真实速度走 EXT_PORT_SPEED；SSP 设备 SET_ADDRESS 后发 Sublink Speed Device Notification TP | §4.19.9 p303（pagecheck `Port Speed`@p303、`EXT_PORT_SPEED`@p303） |
| 本页引文 6 条 | 提取文本逐字核验（Python `re` 全匹配 + 页归属断言，2026-11-04 实跑全 OK：p272×1、p274×1、p279×1、p293×1、p294×2；断行按空格并回） |

## 页码机核（scripts/xhci_spec_pagecheck.py，28 needle）

```
PAGE-OK p272 'Signal State values are'        PAGE-OK p295 'Enabled U0 States'
PAGE-OK p272 'large bubble'                   PAGE-OK p298 'Port Reset'
PAGE-OK p273 'Figure 4-25'                    PAGE-OK p299 'never fail the bus reset'
PAGE-OK p274 'advance to the Enabled state'   PAGE-OK p299 'Warm Port Reset'
PAGE-OK p275 'Figure 4-26'                    PAGE-OK p299 'Test_SE0_NAK'
PAGE-OK p278 'Figure 4-27'                    PAGE-OK p300 'at most one port in test mode'
PAGE-OK p279 'from any state except Powered-off'  PAGE-OK p300 'Port Routing and Control'
PAGE-OK p280 'Figure 4-28'                    PAGE-OK p301 'Figure 4-35'
PAGE-OK p283 'Powered-off, or Disabled states'  PAGE-OK p302 'Cold Attach Status'
PAGE-OK p285 'Figure 4-30'                    PAGE-OK p303 'Port Speed'
PAGE-OK p291 'Port Status Change Generation'  PAGE-OK p303 'EXT_PORT_SPEED'
PAGE-OK p291 'seven status change bits'
PAGE-OK p292 'PSCEG'
PAGE-OK p293 'HCHalted'
PAGE-OK p294 'Connect Status Change Reporting'
PAGE-OK p294 'RxDetect to the Polling state'
PAGE-OK p294 'Polling to the U0 state'
PAGECHECK-PASS
```

## 箭头触边核算（teach 箭头落位判据 ≤2.5px）

机核 `audit_arrows.py`（解析 SVG rect/path 坐标，点到线段最小距离），双主题同坐标各跑一遍：
14 条边 × 2 端点 = 28 端点全部 0.00px（端点按构造精确落在盒/域框边线上）；
审计对象=12 rect（10 状态盒 + 2 Enabled 子态域框）+ 14 条 st-edge；
初始态箭杆（st-entry）与分隔线（st-div）不入审计。

```
ARROW-EDGE-PASS（最差触边偏差 0.00px，门限 ≤2.5px · rect 12 · 边 14；index.html 与 index-light.html 各 PASS）
```

框内文字：状态名 17px、PLS 行 14px（≥14px@1× 达标）、信号态行 12.5px mono（缩放档可读的细节层，
登记于本节）；边标注条件 13.5px mono / 页码 12.5px（框外）。

## zoomfs 三件套登记

- 接线：`.iso-stage`（恰 1 个，role=group + tabindex）包状态机概览 SVG；`zoomBarHtml` 在 plate 内；
  `zoomFsCss`+`zoomFsScript` 以 body 尾 `<style>/<script>` 注入（table_page.mjs 未改，注入点在节内 build.mjs）。
- focus 选择器：`[".st-u0"]`（放大时居中 U0 盒——挂起域枢轴，首栏 USB2 U0 为 DOM 首个命中）。
- `window.__zfs` 存活：冒烟实测 True ×2 主题。

## 门输出汇总

| 门 | 结果 |
|---|---|
| 页码机核 | PAGECHECK-PASS（28 needle，上表） |
| 语言门 | `scan_words.py retired` index.html **total=0**；index-light.html **total=0**（⊆{回执,柜台,泳道} 门限内，实为空；首轮咬出『一站』×1——linksHtml §4.3 链语「枚举主线的第一站」当轮改「枚举主线由此起步」复跑清零） |
| 静态冒烟 | `smoke_state.py`（playwright channel=chrome，1500×1000）：dark/light console=0、zoombar=1、__zfs=True、.iso-stage=1 → **STATE-SMOKE-PASS** |
| 自包含 | `grep -c 'http://\|https://'` index.html=1、index-light.html=1，唯一命中 `http://www.w3.org/2000/svg`（SVG xmlns）✓ |
| 互链 | 8 个相对链接目标全部存在（../../index.html、4.2/4.3/4.4/4.17/4.18/4.20、EVIDENCE.md）；§4.15 待建链指板块 index.html 并标「待建」 ✓ |
| 箭头触边 | ARROW-EDGE-PASS（上节，双主题） |

## shots 清单（shots/）

| 文件 | 内容 |
|---|---|
| state-overview-dark.png / state-overview-light.png | 双主题全页全景（full_page，1500 宽） |
| state-diagram-dark.png / state-diagram-light.png | 状态机概览卡 .iso-stage 特写（双主题目检：两栏标签无压线/压框、对比度成立） |
| state-390-dark.png / state-390-light.png | 390px 宽全页（内容纵排，图可经 zoomfs 放大） |

## 工艺注记

- 形态=table_page.mjs 表格节布局 + 状态机概览卡（照抄 4.5-device-slot-management 先例）：
  状态图卡按 cfg.cards 数组进入（卡序=规范节序 4.19.1 状态图→九小节导览→差异对照）；
  zoomfs 样式/脚本 body 尾注入，`_gen/table_page.mjs` 未改。
- 两栏实现：同一组局部坐标 + 栏原点（USB2 +10 / USB3 +750）平移生成；首轮实踩
  「边路径未加栏偏移」bug（触边审计 10.00px MISS 定位）——已改 shiftPath 对路径坐标统一加偏移，
  复跑 28 端点全 0.00px。教训=坐标平移必须覆盖 path/text/rect 全部图元，单改一类必错位。
- 节内脚本：`audit_arrows.py`（触边机核）、`smoke_state.py`（冒烟）——4.5 固化件的参数化改版
  （rect 12 / 边 14 断言，路径偏移后全局坐标审计）。

## 已知边界

1. **骨架版**：机器形态留后续会话（页内「形态注记」段 + 本文件范围声明双登记）。
2. **简版状态图**：两栏只画主线 7 边 + 大泡虚线；未画态与子态机逐张列出（见状态/迁移清单末行），
   页内读图注记第一条声明「全图归 §4.19.1 原文与原图」。
3. **USB2 Disabled→Disconnected 拔出边未画**（4.19.1.1.2 p274：Disabled/Enabled 态拔出检测→Disconnected；
   脚注 57：Reset 态因主机驱动总线检不出拔出）——非主线、为保两栏边数对齐略去，差异表「Disabled 态含义」行
   与读图注记已给 USB2 Disabled 唯一出口=复位；如机器版扩图建议补画并带脚注 57。
4. **Figure 编号与派发单不同**：USB2 顶层=Figure 4-25（非 4-26）；4-26=USB2 Enabled 子态图——
   已按现场核定标注（见上表）。
5. §4.19.4.1 的 U1/U2 Timeout 四组合、§4.19.7 Figure 4-35 路由例、§4.19.8 D3 前置操作清单
   在导览表一句话要点内收口，未展开成独立表——机器版/后续会话可按需扩。

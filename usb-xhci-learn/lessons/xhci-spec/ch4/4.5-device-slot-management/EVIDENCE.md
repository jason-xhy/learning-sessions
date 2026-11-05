# EVIDENCE.md —— §4.5 设备槽管理（2026-11-04，状态图＋表格节）

## 逐条断言 → 判据

| 断言 | 判据 |
|---|---|
| 槽三组件=DCBAA 表项 + Device Context + 槽门铃寄存器；上限 255 台（非 256，脚注 11 架构保留） | §4.5 p81（pagecheck `comprised of 3 major components`@p81；`Device Slot Management`@p81） |
| Slot ID=访问 DCBAA 与 Doorbell Array 的统一索引 | §4.5 p81 + §4.5 p82（`Doorbell Register exists`@p82） |
| DCBAA 每元素 64-bit 指针→Device Context 基地址 | §4.5 p81 |
| Device Context=32 context 数组（1 Slot + 31 EP）；软件分配全字段清 ‘0’；EP0 恒为 Default Control EP | §4.5 p82（`array of 32 context data structures`@p82；`Figure 4-1: Device Context`@p82） |
| Figure 4-1 布局：000h 起 20h/项，DCI 30/31=3C0h/3E0h，400h–Page Size-1 Reserved | Figure 4-1 p82 现场提取文本（PyMuPDF `/tmp/spec-audit-txt/xhci-1.2b.txt` PAGE 82 块） |
| DCI 编号：Slot=0；Control=端点号×2+1；Isoch/Interrupt/Bulk OUT=×2、IN=×2+1 | §4.5.1 p83（`Device Context Index`@p83） |
| §4.5.2 输入 Slot Context 初始化例外清单（Address Device/Evaluate Context/Configure Endpoint 三组 + Route String/端口号只认第一次 Address Device） | §4.5.2 p83–84（`Slot Context Initialization`@p83） |
| 槽五态 Disabled/Enabled/Default/Addressed/Configured；迁移由命令成功完成驱动；失败不迁移 | §4.5.3 p84–85（`Slot States`@p84、`Slot State Diagram`@p85、`large bubble`@p85） |
| Enabled→Default=Address Device(BSR=‘1’) 成功；Enabled→Addressed=BSR=‘0’ 成功 | §4.5.3.3 p87（`flag cleared to`@p87——**首跑误标 p86，机核 MISS 纠正**；引文④ src=p87） |
| Disabled→Enabled=Enable Slot 成功；Disabled 态门铃禁用、不产生事件、仅许 Enable Slot | §4.5.3.2 p86（`4.5.3.2`@p86） |
| Enabled 逻辑态：Slot State 字段 ‘0’ 双载 Disabled/Enabled；门铃未使能（禁写）；仅许 Address Device/Disable Slot | §4.5.3.3 p86–87（`4.5.3.3`@p86 头 + 正文 p87） |
| Default 态：仅许 6 命令；门铃仅 Control EP0；进入时置 Slot State=Default 且地址 ‘0’；只许一个槽在 Default | §4.5.3.4 p87（`4.5.3.4`@p87） |
| Addressed 态：仅许 8 命令；→Configured=Configure Endpoint(DC=‘0’) 成功；DC=‘1’ 按 No Op 保持；→Default=Reset Device；→Disabled=Disable Slot | §4.5.3.5 p88（`4.5.3.5`@p88、`Deconfigure (DC) flag`@p88） |
| Configured 态：仅许 8 命令；门铃=Control EP0+任何已启用端点；保持原态六命令；deconfigure→Addressed；Reset Device→Default；Disable Slot→Disabled | §4.5.3.6 p88–89（`4.5.3.6`@p88 头 + 正文 p89：`(DC =`@p89、`the Reset Device Command`@p89） |
| Table 4-1 五行编码（USB 设备态/EP 态/地址/DCBAA 指针/Slot State 值） | Table 4-1 p85–86（`Device Slot State Code Definitions`@p85；Table 6-7 与脚注 13 同页） |
| SET_ADDRESS→Address Device(BSR=‘0’) xHC 代发；软件自发 SET_ADDRESS 以 TRB Error 完成 | §4.5.4.1 p89（`4.5.4.1`@p89） |
| SET_CONFIGURATION→Configure Endpoint + SET_CONFIGURATION 双操作；wValue=‘0’ deconfigure=Drop 全 1/Add 全 0 | §4.5.4.2 p89（`SET_CONFIGURATION Request`@p89） |
| SET_INTERFACE→Configure Endpoint + SET_INTERFACE 双操作；不改 EP 参数可省 | §4.5.4.3 p90（`4.5.4.3`@p90、`SET_INTERFACE Request`@p90） |
| GET_DESCRIPTOR(前 8B，仅 FS)→Evaluate Context(A1=‘1’)（§4.5.4 清单外的补充行） | §4.3 步 7a.x p74（`Evaluate Context Command with`@p74） |
| **Configured→Addressed 取 DC=‘1’**：§4.5.3.6 p89 印刷「(DC = ‘0’)」为矛盾值 | §4.6.6 p102（`Deconfigure (DC)`@p102：「Deconfigure (DC) = ‘1’ … transition the Device Slot from the Configured to the Addressed state」）+ §6.4.3.5 Table 6-64 p451（`Table 6-64`@p451：DC 位 9「Set to ‘1’ by software to “deconfigure”」）+ §4.5.3.5 p88（DC=‘1’ 才是 No Op 保持 Addressed）。规范内部矛盾，本页按多数一致侧取 ‘1’ |
| 状态图边集与条件 | §4.5.3.2–4.5.3.6 p86–89 逐边对页（见状态卡读图注记；Figure 4-2 p85 五态名+large bubble 原注） |

## 页码机核（scripts/xhci_spec_pagecheck.py，26 needle）

```
PAGE-OK p81 'Device Slot Management'      PAGE-OK p87 'flag cleared to'
PAGE-OK p81 'comprised of 3 major components'   PAGE-OK p87 '4.5.3.4'
PAGE-OK p82 'array of 32 context data structures'  PAGE-OK p88 '4.5.3.5'
PAGE-OK p82 'Figure 4-1: Device Context'  PAGE-OK p88 'Deconfigure (DC) flag'
PAGE-OK p82 'Doorbell Register exists'    PAGE-OK p88 '4.5.3.6'
PAGE-OK p83 'Device Context Index'        PAGE-OK p89 '(DC ='
PAGE-OK p83 'Slot Context Initialization' PAGE-OK p89 '4.5.4.1'
PAGE-OK p84 'Slot States'                 PAGE-OK p89 'SET_CONFIGURATION Request'
PAGE-OK p85 'Slot State Diagram'          PAGE-OK p89 'the Reset Device Command'
PAGE-OK p85 'Device Slot State Code Definitions'  PAGE-OK p90 '4.5.4.3'
PAGE-OK p85 'large bubble'                PAGE-OK p90 'SET_INTERFACE Request'
PAGE-OK p86 '4.5.3.2'                     PAGE-OK p74 'Evaluate Context Command with'
PAGE-OK p102 'Deconfigure (DC)'           PAGE-OK p451 'Table 6-64'
PAGECHECK-PASS
```

坑：pypdf 与 PyMuPDF 断行不同——`flag cleared to` 在 PyMuPDF 文本里在 p86 块开头出现、
pypdf 归 p87；实核印刷页码后确认 BSR 迁移句在 **p87**（§4.5.3.3 头在 p86），已改正
文与引文④页码。needle 避跨行判据再次成立。

## 箭头触边核算（teach 箭头落位判据 ≤2.5px）

机核 `audit_arrows.py`（解析 SVG rect/path 坐标，点到线段最小距离），双主题同坐标各跑一遍：
8 条边 × 2 端点 = 16 端点全部 0.00px（端点按构造精确落在盒边线上）：

| 边 | 路径 | 端点 → 盒边 |
|---|---|---|
| E1 Disabled→Enabled | M215,330 L345,330 | (215,330)=Disabled 右边；(345,330)=Enabled 左边 |
| E2 Enabled→Default | M420,298 …L505,152 | (420,298)=Enabled 上边；(505,152)=Default 下边 |
| E3 Enabled→Addressed | M470,298 …L860,152 | (470,298)=Enabled 上边；(860,152)=Addressed 下边 |
| E4 Default→Addressed | M635,126 L825,126 | (635,126)=Default 右边；(825,126)=Addressed 左边 |
| E5 Addressed→Configured | M975,126 L1165,126 | (975,126)=Addressed 右边；(1165,126)=Configured 左边 |
| E6 Configured→Addressed | M1240,152 …L940,152 | (1240,152)=Configured 下边；(940,152)=Addressed 下边 |
| E7 Reset（合并） | M1240,88 …L560,88 | (1240,88)=Configured 上边；(560,88)=Default 上边 |
| E8 Disable 大泡 | M1290,152 …L140,362 | (1290,152)=Configured 下边；(140,362)=Disabled 下边 |

```
ARROW-EDGE-PASS（最差触边偏差 0.00px，门限 ≤2.5px · 盒 5 · 边 8；index.html 与 index-light.html 各 PASS）
```

框内文字：状态名 17px、中文注 14px（≥14px@1× 达标）；边标注 cmd 14px / 条件 13.5px / 页码 12.5px（框外）。

## zoomfs 三件套登记

- 接线：`.iso-stage`（恰 1 个，role=group + tabindex）包状态图 SVG；`zoomBarHtml` 在 plate 内；
  `zoomFsCss`+`zoomFsScript` 以 body 尾 `<style>/<script>` 注入（table_page.mjs 未改，注入点在节内 build.mjs）。
- focus 选择器：`[".st-enabled"]`（放大时居中 Enabled 盒——状态机枢轴，自 Disabled 后的第一迁出态）。
- `window.__zfs` 存活：冒烟实测 True ×2 主题。

## 代码走读卡（CODE-STEPPER 量产轮，2026-11-04）

- 数据件：`lessons-data/stepper_45x.json`（marker **X45**，schema usb-xhci-stepper/1，worldKind=rings3，
  **58 帧 / 15 ev op（11 个 ev 帧）/ 9 refs / 55 锚点**）。链选择=**Configure Endpoint 全链（§4.5.4.2 双操作）**：
  usb_set_configuration（message.c）→ usb_hcd_alloc_bandwidth 逐端点 add_endpoint（hcd.c→xhci.c）→
  xhci_check_bandwidth（A 位修整/LAST_CTX）→ xhci_configure_endpoint 投递 CONFIGURE_ENDPOINT TRB（xhci-ring.c
  xhci_queue_configure_endpoint）→ 门铃 0 → xHC 桥帧（评估 add/drop 全部位→DCI3 拷入 Device Context→Slot State
  改写 Configured）→ 中断侧 handle_cmd_completion 消费 → 回线程 result=Success → EP1 环转正 →
  usb_control_msg_send（SET_CONFIGURATION）→ EP0 控制传输两 TRB（Setup+Status）→ 门铃 1 → 总线 SETUP→
  设备票据→Transfer Event→设备灯 Addressed→Configured。**选择理由**：本节主轴=槽状态迁移的命令侧，
  状态图两条 Configure Endpoint 边（DC=0 配置/DC=1 回退）+§4.5.4.2 SET_CONFIGURATION 双操作映射行共同指向
  Configure Endpoint；Reset Device 在状态图中为合并边且 §4.6.6 详述归命令接口节——故取本链（报告注明）。
- 双账本口径（41x 先例）：walknote 与操作二帧注挑明——规范按传输阶段记 TD（Setup/Data/Status），内核
  struct xhci_td 按 URB 记；本链操作二=无数据阶段控制传输（两颗 TRB 一个内核 TD），两个口径在本例重合。
- 集成：本节=tablePage 自绘 build（非 lanePage）——走读块（walknote+stepperHtml）后处理插在互链卡
  `<div class="xsp-card"><h2>相关` 之前（4.17 锚点注入同位）；course.css 走读段+变量垫片/codestepper.js
  并入既有 body 尾注入段；replace 一律函数形态防 `$` 展开（4.17 立法）。构建幂等：sha256 双跑一致。
- 三环账本：`check_rings3_ledger.py` → **LEDGER-PASS**（frames=58 evt_enq=2 cmd_deq=1 ep0_deq=1——
  2==1+1 平衡；设备态 Addressed→Configured 单向；无槽位复活）。EP0 控制传输=两颗 TRB 单 ring_deq
  （消费指针到 TD 末）+单 Transfer Event——与「每 TD 一条完成事件」的实码口径一致。
- 诚实呈现点：①case TRB_CONFIG_EP 命中但 `if (!cmd->completion)` 不成立→xhci_handle_cmd_config_ep 不执行
  （函数体仅 trace，Slot State 归 xHC 维护 p85 Note）；②DCBAA 指针本命令不动（Address Device 时装载，
  原地更新所指内容）；③槽态与设备态各迁各的——命令完成时槽先 Configured、请求完成时设备才 Configured
  （§4.5.4.2 双操作判据）；④换配置 drop 循环/错误码分支本链不走，帧注记如实标注。
- 引文 9 条 verify-refs 全 OK（p88×2/p89/p102/p103×3/p85/p69 脚注 7 空 quote）；**p103 三条为走读卡新增引用页**。

## 门输出汇总（2026-11-04 走读卡轮更新）

| 门 | 结果 |
|---|---|
| 页码机核 | PAGECHECK-PASS（**34 needle**=原 26+走读卡新增 8；`subsequent updates of the Slot State`@p85、`successfully configured`@p89、`Configure Endpoint Command and the`@p88、`Contexts between 1 and 15`@p88、`enable the set of Device Slot endpoints`@p102、`Add Context flag A1`@p103、`explicitly identify to the xHC`@p103、`Drop Context and Add Context flags are evaluated`@p103。坑：`the Configured state due` 跨 pypdf 断行假阴性，改断行后短 needle `Configure Endpoint Command and the`） |
| 语言门 | `scan_words.py retired` ×2 → **total=8 {回执×8} ⊆豁免表**（走读卡文案引入回执=豁免①；首轮 12 处，账本×2/那支×1/主角×1 非豁免当轮改定：双账本口径→计数口径挑明、用的是那支→走该分支、传输环操作的主角→传输环操作见 §4.14） |
| 走读卡-verify | `stepper_builder.py --verify` → VERIFY OK（35 代码步/137 行与 git 62f4c998b297 逐字节一致；frames=58） |
| 走读卡-verify-refs | VERIFY-REFS OK（9 条引用与 PDF 所引页原文一致，去空白子串） |
| 三环账本 | LEDGER-PASS（见走读卡节） |
| 布局探针 | `st_layout_probe.py` ×2 → PROBE-PASS（rings3 段：四区在场/三带等高 100.03 三值相等/零溢出/small=[]） |
| 行为探针 | `xhci_spec_stepper_probe.py index.html` → STEPPER-PROBE-PASS（11 ev 帧 reset 法全 PASS：CFEP 入队/门铃×2/cmd 消费/CCE Slot=1·CC=1/SETUP·STAT 入队/ep0 消费/SET_CONFIGURATION 票据/设备灯→Configured/ERDP×2） |
| console ×2 | 三域（Runtime.console+pageerror+CDP Log.entryAdded）5 帧步进 → **全 0**；另全程 58 帧步进（scroll+逐帧）×2 主题 → 0 条 → CONSOLE-CLEAN-PASS |
| 静态冒烟 | `smoke_state.py` → STATE-SMOKE-PASS（dark/light console=0、zoombar=1、__zfs=True、.iso-stage=1） |
| 自包含 | `grep -E 'src=\|href="http'` ×2 =0；http URL 唯一 `http://www.w3.org/2000/svg`（SVG xmlns）✓ |
| 互链 | check_lesson_links ×2 → PASS（ok=0 missing=0；走读卡未新增 `<a>`，正文互指为纯文本） |
| 箭头触边 | ARROW-EDGE-PASS（走读卡轮复跑仍 0.00px） |
| 幂等 | node build.mjs 双跑 sha256 一致（dark f5fd11dd…→编辑后 6f53a0ad… 双跑同值） |

## shots 清单（shots/）

| 文件 | 内容 |
|---|---|
| state-overview-dark.png / state-overview-light.png | 双主题全页全景（full_page，1500 宽） |
| state-diagram-dark.png / state-diagram-light.png | 状态图卡 .iso-stage 特写（双主题目检：无标签压线/压框、对比度成立） |
| state-390-dark.png / state-390-light.png | 390px 宽全页（内容纵排，图可经 zoomfs 放大） |
| walk-card-dark.png / walk-card-light.png | 走读卡初始帧（reset 后帧 1：三环全空、设备灯 Addressed、命令/事件双环静默） |
| walk-card-end-dark.png / walk-card-end-light.png | 走读卡尾帧（CFEP 已消费/SETUP+STAT 在 EP0 环/CCE+TRFE 双事件卡/SET_CONFIGURATION 票据/设备灯 Configured/ERDP 更新——DOM 对账以行为探针 11 帧断言为准） |

## 工艺注记

- 形态=table_page.mjs 表格节布局 + 状态图卡：状态图卡按 brief「额外 HTML 拼进 linksHtml 前的位置」
  走 cfg.cards 数组（卡序=规范节序 4.5→4.5.1/2→4.5.3→Table 4-1→4.5.4）；zoomfs 样式/脚本 body 尾注入，
  `_gen/table_page.mjs` 未改。
- 走读卡集成（2026-11-04 量产轮）：build.mjs 顶部 execFileSync render_block 直出块 HTML（渲染单一事实源
  =scripts/stepper_builder.py），`_gen/table_page.mjs` 与 `assets/` 均未改。
- 节内脚本：`audit_arrows.py`（触边机核）、`smoke_state.py`（冒烟）——状态图/表格节手工冒烟口径的固化件；
  走读卡门脚本（console/shots/note 扫描）在 `~/.cache/zcode-tmp/`（临时件，不入 scripts/）。

## 已知边界

1. **规范原文矛盾（已登记并取侧）**：§4.5.3.6 p89 印刷 deconfigure 条件为「(DC = ‘0’)」，与
   §4.5.3.5 p88（DC=‘1’ 才是 deconfigure/No Op）、§4.6.6 p102、§6.4.3.5 Table 6-64 p451 三处一致侧矛盾——
   本页取 DC=‘1’，页内注记明示。
2. **合并边两处**（Figure 4-2 原图箭头几何不可从提取文本还原，本图按 §4.5.3 文字逐边重构）：
   ① Disable Slot 四态→Disabled 合并为一个大泡边（对应 p85「large bubble」原注，逐态原文见 p86–89）；
   ② Reset Device 的 Addressed→Default（p88）与 Configured→Default（p89）合并为一条，标注双来源。
3. **保持原态不画自环**：三态的「remain」命令清单以状态卡读图注记列出（p87/p88/p89）。
4. §4.5.4 映射表的 GET_DESCRIPTOR 行是 §4.3 p74 的补充映射，页面已明示「§4.5.4 清单外」。
5. 下一节导航留空（§4.6 命令接口待建，链板块 index.html 并标「待建」）；prev=§4.4（已建）。
6. 走读卡走的是配置方向（DC=0）；DC=1 deconfigure（Configured→Addressed）与 Reset Device 链未走读
   ——状态图卡已画边、帧注记指向 §4.6.6，待命令接口节建卡时补（walk 尾帧注记同）。

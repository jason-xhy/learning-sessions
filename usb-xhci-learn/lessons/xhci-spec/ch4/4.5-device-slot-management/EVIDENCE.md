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

## 门输出汇总

| 门 | 结果 |
|---|---|
| 页码机核 | PAGECHECK-PASS（26 needle，上表） |
| 语言门 | `scan_words.py retired` index.html **total=0**；index-light.html **total=0**（残留 ⊆ {回执,柜台,泳道} 门限内，实为空） |
| 静态冒烟 | `smoke_state.py`（playwright channel=chrome，1500×1000）：dark/light console=0、zoombar=1、__zfs=True、.iso-stage=1 → **STATE-SMOKE-PASS** |
| 自包含 | `grep -c 'http://\|https://'` index.html=1、index-light.html=1，唯一命中 `http://www.w3.org/2000/svg`（SVG xmlns）✓ |
| 互链 | 6 个相对链接目标全部存在（../../index.html、4.1/4.3/4.4/4.7、EVIDENCE.md） |
| 箭头触边 | ARROW-EDGE-PASS（上节） |

## shots 清单（shots/）

| 文件 | 内容 |
|---|---|
| state-overview-dark.png / state-overview-light.png | 双主题全页全景（full_page，1500 宽） |
| state-diagram-dark.png / state-diagram-light.png | 状态图卡 .iso-stage 特写（双主题目检：无标签压线/压框、对比度成立） |
| state-390-dark.png / state-390-light.png | 390px 宽全页（内容纵排，图可经 zoomfs 放大） |

## 工艺注记

- 形态=table_page.mjs 表格节布局 + 状态图卡：状态图卡按 brief「额外 HTML 拼进 linksHtml 前的位置」
  走 cfg.cards 数组（卡序=规范节序 4.5→4.5.1/2→4.5.3→Table 4-1→4.5.4）；zoomfs 样式/脚本 body 尾注入，
  `_gen/table_page.mjs` 未改。
- 节内脚本：`audit_arrows.py`（触边机核）、`smoke_state.py`（冒烟）——状态图/表格节手工冒烟口径的固化件。

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

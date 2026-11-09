# R12 批 C TrackC 交付报告——交互台模块七 m7「TRB 拼装台」（§4.11）

日期：2026-11-09 ｜ 主文件：`interactive/index.html`（m1-m7 单文件）｜ 冒烟：`scripts/smoke_interactive.py`

## 1. m7 台结构（R12-SPEC §5 拍板案落地）

「选 TRB 型 → 点字段置位 → 看 16 字节视图与类型编码 → 非法组合引原文拦截」：

- **Zone A 型选择器**（`#m7-type`）：八型=§4.11 切片实义集合——Normal(1)/Setup Stage(2)/Data Stage(3)/Status Stage(4)/Isoch(5)/Link(6)/Event Data(7)/Transfer Event(32 · 事件环)。头部引文=组件通用规则（typeDef L37-39 / cmdProducer L31-32 / cmdInit0 L33-34 / atomicNote L55-58）。
- **Zone B 字段置位面板**（`[data-m7field]`）：按型异构字段卡（Normal 9 / Setup 7 / Data 10 / Status 7 / Isoch 12 / Link 5 / Event Data 4 / Transfer Event 6=只读预置）；多值字段按切片枚举（TRT 四值 0-3 / TBC 0-3 / TLBPC 0-15 / TD Size 0-31 / Frame ID 0-2047+2048 探针）。型级**上下文选择器**（`[data-m7ctx]`）：data/status=DTD+wLength（Table 4-7 判定行），isoch=MFINDEX Frame Index 模拟（End Frame ID 公式实时展开）。
- **Zone C 16 字节视图**：DW0-DW3 四行=十六进制（8 位）+32 位格/行（亮底=置 1，蓝框=本型定义位段，暗=保留 RsvdZ，悬停 title=字段归属）；类型编码行=编码值+bits 10-15 二进制+内核对照锚；字段溢出（Frame ID=2048）出截断警告条。
- **Zone D 校验**（`[data-m7act="m7-check"]`）：13 条拦截规则+8 条合法完成路径（一句总结+规范锚）+pending（未置全不误报）+should 级注记（不拦截）。
- **深链**：`#m7` / `#m7&trb=<型名>`——型名匹配=key/全名/去 TRB 后缀三形态（大小写归一）；load+hashchange 双挂（R4 坑），预选走 select 改值+buildM7 全链路（R7/R11 批 D 坑）。

## 2. 事实源与口径

- **判据（拦截/总结/注记）唯一事实源**=evidence/spec-411.txt 切片。任务指定段 L29-674 之外，同文件 §4.11.3 Event TRBs（L675-733）/§4.11.5 Link+Event Data（L922-1150）/§4.11.7 TD 使用规则（L1208-1284）为 Link/Event Data/Transfer Event/IDT-CH 规则的判据来源——同一切片文件的延伸段，逐条引文带行号。
- **TRB Type 编码**=内核对照 /Volumes/KernelSrc/linux @d9008e061539 drivers/usb/host/xhci.h TRB_TYPE 枚举（TRB_NORMAL=1 L1106 … TRB_TRANSFER=32 L1154，八型行号逐一入 typecode 行与下表）。
- **字段位段**=内核 xhci.h 掩码（TRB_CYCLE L1047/TRB_ENT L1052/TRB_ISP L1054/TRB_CHAIN L1058/TRB_IOC L1060/TRB_IDT L1062/TRB_DIR_IN L1070/TRB_SIA L1076/TRB_FRAME_ID L1077/TRB_TBC L1080/TRB_TLBPC L1082/TRB_TC L1026/TRB_LEN L1036/TRB_TD_SIZE L1038/TRB_INTR_TARGET L1043/TRB_TO_SLOT_ID L820/TRB_TO_EP_ID L823/EVENT_TRB_LEN L830/COMP_CODE_MASK L833）+ 规范 §6.4 各型表（PDF p427-439，Normal Fig 6-8/Setup 6-9/Data 6-10/Status 6-11/Isoch 6-12/Transfer Event Table 6-39）。**TRT 位段 17:16 与值 0/1/2/3**=规范 §6.4.1.2.1（PDF p431）——内核无 TRT 定义，PDF 为唯一源；值 3 实例锚 spec-43.txt L123。
- **Completion Code 不编值**：编码在 Table 6-90（§6.4.5），§4.11 切片不含——Transfer Event 的 CC 位值示 0+注记「本台不编值」（禁凭记忆写位值铁律的诚实缺省）。
- 引文常量 M7Q/M7Q_SRC 59 条由提取器程序化生成（`~/.cache/zcode-tmp/m7_extract.py`：显式行区间+关键词断言+PAGE 标跨界守卫；归一化=行首 bullet 剥离+单空格连行，与 smoke 对表同构），注入器 `m7_inject.py` 13 锚点 assert count==1 写入（坑 14 ② 配方，不走 Edit 通道）。

## 3. Zone D 拦截规则↔切片行号逐条表（13 条）

| # | 规则 id | 适用型 | 触发组合 | 引文（M7Q key · spec-411.txt 行号） |
|---|---|---|---|---|
| 1 | ent-ch | Normal/Data/Status/Isoch | ENT=‘1’ 且 CH=‘0’ | entCh · L50-54（"the ENT flag is valid only if the Chain bit (CH) is ‘1’"） |
| 2 | setup-idt | Setup | IDT=‘0’ | setupIdt · L212-215（"shall contain immediate data (IDT flag = ‘1’)"） |
| 3 | setup-len8 | Setup | Length≠‘8’ | setupIdt · L212-215（"its Length field shall be set to ‘8’"） |
| 4 | setup-ch | Setup | CH=‘1’ | setupSingle · L189-190（"a single Setup Stage TRB"）+ chMay · L128-129（CH 允许清单不含 Setup） |
| 5 | tds-last | Normal/Data | CH=‘0’（单 TRB TD 即末位）且 TD Size≠‘0’ | tdsLast0 · L529-533（"shall be cleared to '0'"，切片原文用 ASCII 撇号）+ tdsValid · L1266-1267 |
| 6 | idt-only | Normal/Data | IDT=‘1’ 且 CH=‘1’ | idtOnly · L1259-1260（"shall be the only Transfer TRB of the TD"） |
| 7 | fid-range | Isoch | Frame ID>2047 | fiaRange · L461-462（"0 to 2047"） |
| 8 | fid-end | Isoch | SIA=‘0’ 且 Frame ID>(MFINDEX FI+895) MOD 2048（FI=上下文模拟值） | endFid · L558-560（"shall not schedule … greater than the End Frame ID"+公式） |
| 9 | data-dir | Data | DIR 与 Table 4-7 不符 / wLength=‘0’ 仍存在 | dirResp · L222-225（软件一致性义务）+ noChkData0 · L311-312 或 noChkDirData · L321-322 + xhcNotReq · L326-328 + xhcTrbErr · L340-342 |
| 10 | status-dir | Status | DIR 与 Table 4-7 不符 | dirResp · L222-225 + noChkDirStatus · L324-325 + xhcNotReq · L326-328 + xhcTrbErr · L340-342 |
| 11 | evdata-ioc | Event Data | IOC≠‘1’ | evtDataIoc · L1092-1095（"Software shall set the IOC flag in all Event Data TRBs"） |
| 12 | evtRo（改写拦截） | Transfer Event | 任一字段改写 → 拦截+回滚 | evtRo · L77-78（"read-only by system software"）+ evtProducer · L73-74（xHC=生产者） |
| 13 | （规则族守卫） | 全型 | 涉及字段未置位不判——pending 不误报 | 实现层守卫（m7S()），非切片规则 |

**Table 4-7 映射表**（data/status 上下文判定行，行值=切片 L239-256）：H2D/wLen=0→No Data Stage（无 Data Stage TD）/Status=IN；H2D/>0→Data=OUT/Status=IN；D2H/0→No Data Stage/Status=IN；D2H/>0→Data=IN/Status=OUT。**诚实口径**：DIR↔Table 4-7 错配是软件一致性义务，切片明言 xHC "shall NOT check"（L303-304）/"NOT required to check"（L326-328）——拦截框带「xHC 对该错配不查/不要求查（若查则回 TRB Error）」注记。

**显式不拦截（切片无禁令，禁自造规则）**：
- Status Stage IDT=‘1’：§4.11 切片无禁令文本——不拦截，给 RsvdZ 位段表注记（规范 §6.4.1.2.3 Table 6-31 bits 9:6，PDF p434）。
- Isoch TD Size：ETE=‘1’ 弃用语境（etcEte L474-477）——不套 tds-last，仅注记。
- SIA=‘1’+Frame ID≠0：合法（被忽略）——siaIgn L463-464 注记。
- Link TC=‘0’：should 级（linkTc L957）——注记不拦截。

## 4. 合法完成路径（8 型一句总结+规范锚）

| 型 | 总结锚（M7Q key · 行号） |
|---|---|
| Normal | normalUse L122-124 + chMay L128-129 |
| Setup | oneToOne L145-147 + setupIdt L212-215 + setupSingle L189-190 |
| Data | dataTd L191-192 + dirResp L222-225 |
| Status | statusTd L194-195 + stallEvt L285-286 |
| Isoch | isochFirst L417-419 + isochConsume L422-425 + fidValid L555-557 |
| Link | linkPurpose L926-928 + linkEnd L941-942 |
| Event Data | evtDataPurpose L1043-1044 + evtDataIoc L1092-1095 + evtDataTd L1108-1111 |
| Transfer Event | evtRo L77-78 + teNote L116-118（"Software shall only utilize Transfer Events…"） |

## 5. 冒烟扩容（563 → 646，+83）

m7 断言族 84 项（81 项 m7 前缀 + hero/title/footer 登记项），全清单=smoke 日志（2026-11-09 run3，`SMOKE PASS`，ok 计数 646）。分族：

- 台入口/结构（4）：#m7 路由直达、nav 文案、hero 七模块、title/footer 登记
- 选择器隔离回归（4）：.slot=3/[data-field]=21/[data-db]=2 不变，m7 零裸名，与 m3/m5/m6 属性零交叠，tab=7
- **引文对表（1 项覆盖 59 条）**：M7Q 全量 ↔ spec-411.txt 归一化窗口匹配（坑 13 配方内嵌，未命中即 FAIL）
- Zone C 编码（19）：八型类型编码（bits 10-15 二进制+内核对照行号）+八型 DW3 初始十六进制（type<<10；transferEvent=0x01018001 只读预置）+位段着色计数 3 例（normal 44/status 22/TransferEvent 53）+置位联动 DW3=0x431/DW2=0x4A0200+位格 title+setN 计数+位格总数 128
- Zone D 拦截逐条（15）：13 规则各 1-2 项（引文逐字+行号+快照 verdict/intercepts/reverts）+溢出前置红+Table 4-7 当前行高亮/上下文切换联动
- 合法路径×8 + 诚实注记 3（status IDT RsvdZ 不拦截/SIA 忽略/link TC should）
- pending 不误报+重置归零（2）
- 深链 8：#m7、#m7&trb=Isoch（fresh load+选择器同步+预选提示）、hashchange 路径（Link）、前缀匹配（Setup Stage）、未知兜底（未收录提示）、小写 key（eventdata）、无 TRB 后缀（Transfer Event）
- 上下文公式 2：mfindex=1024→End Frame ID 1919 / 切 0→895；TRT 选项四值；M7Q_SRC 行号形态
- 回归抽查 2：m1 初始闪烁不变、m6 台默认剧本+m7 状态独立

**回归**：m1-m6 既有断言全数不破（同次运行 563 项基线全绿）；console/pageerror 零错误。

## 6. 深链实测记录

| 形态 | 结果 |
|---|---|
| `#m7`（fresh load / hashchange） | 直达模块七，默认 Normal |
| `#m7&trb=Isoch`（fresh load） | type=isoch code=5，选择器同步，提示「已按深链预选」 |
| `#m7&trb=Link`（hashchange 同页变 hash） | type=link（load+hashchange 双挂验证） |
| `#m7&trb=Setup%20Stage`（前缀匹配） | type=setup（型名去 TRB 后缀归一） |
| `#m7&trb=eventdata`（小写 key） | type=eventdata |
| `#m7&trb=Transfer%20Event` | type=transferEvent |
| `#m7&trb=Not%20A%20Trb`（未知） | 落回 normal+「未收录」提示 |

## 7. 验证链（交付验收自检）

1. 提取器 59 条全命中（关键词断言+PAGE 标跨界守卫）；`node --check` 抽出 script 块 170030 字符整检 OK。
2. 页面探针：零 console 错误/零 pageerror；八型遍历 DOM 重建无异常；m6 台存活。
3. 布局程序化检查：位格行/16 字节视图/字段卡零横向溢出（1440px 视口）。
4. 冒烟全量 `SMOKE PASS`（646 ok；日志 /tmp/m7_smoke_run3.log，2026-11-09）。截图 shots/m7_normal_ok.png、m7_intercept.png。
5. 禁动面未触碰：src/、public/、smoke_player.py、pace_audit.py、build_landing.py、check_landing_code.py、online_e2e_r6.py、flowcharts/、zh-quotes.json、EVIDENCE.md、drafts/ 均零改动；未跑 vite build；未 git commit。

## 8. 交接与遗留

- **landing 深链入口**（s411 卡 → #m7）：TrackB/主会话接（本任务边界外）。
- 规范原文 "one of 4 conditions"（L99-107 teGen 句）列 3 条——疑似印刷勘误，未上屏（R9④ 口径）；本台 Transfer Event 用 teCond（L709-716，§4.11.3.1 同义三条件列表）替代。
- 提取器/注入器/探针/布局检查脚本：`~/.cache/zcode-tmp/m7_{extract,inject,probe,node_check,layout_check,smoke_splice}.py`（一次性工件，判据已固化进页面常量+冒烟）。

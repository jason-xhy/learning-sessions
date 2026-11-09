# R12 批 C · TrackB 交付草稿（landing s411 大区 11 卡+2 补丁版块+全配套产线 · 2026-11-09）

> 独立交付文件（主会话统一合入 EVIDENCE.md）。配方权威=README 批 A/A-2/A-3/B 四节+EVIDENCE 批 B · TrackB 节+R12-SPEC §4/§9/§11.2-11.3；任务稿两处事实修正见 ③⑤（p193→p192、xhci_ring_prepare_transfer→xhci_get_isoc_start_frame，均现场机核更正）。

## ① 贴码段 13 枚（EXPECTED_SEGMENTS 59→72）

段界=函数闭括号/注释头，git show d9008e061539 机核（预检脚本 ~/.cache/zcode-tmp/r12c_plan.py：与既有 59 段零重叠、段内零摘录热行、十三段互相零重叠——相邻不交四对：sum_trb_lengths 2306-2317 vs finish_td 2263-2303；process_ctrl_td 2322-2412 vs process_isoc_td 2417 起；queue_trb 3246-3264 vs prepare_ring 3270 起；对读段 3501-3545 vs xhci_align_td 3548-3613）：

| 卡 | 段 | 教学咬合 |
|---|---|---|
| xh1101 | xhci-ring.c L3246-3264 `queue_trb` | 4.11.1 TRB 模板四 Dword 通用写入——wmb() 屏障即「Parameter/Status 先于 Control 写入」Note（L55-58）的内核面 |
| xh1102a | xhci-ring.c L3616-3771 `xhci_queue_bulk_tx` | 4.11.2.1 Normal TRB 排队（Bulk/Intr/Scatter-Gather 主路径） |
| xh1102b | xhci-ring.c L2322-2412 `process_ctrl_td` | 4.11.2.2 控制三段 TD 事件处理（排队侧 xhci_queue_ctrl_tx 已归 s43 卡，事件侧为本卡独有面） |
| xh1102c | xhci-ring.c L4095-4286 `xhci_queue_isoc_tx` | 4.11.2.3 Isoch TRB 排队（Frame ID/TBC/TLBPC/TD Size 全在此写入） |
| xh1102d | xhci-ring.c L2306-2317 `sum_trb_lengths` | 4.11.2.4 算式构件「TRB Transfer Length Sum (n)」（L519-520）的内核面；TD Size 统一函数 xhci_td_remainder 留作本卡补丁对读段（避免同函数双段） |
| xh1102e | xhci-ring.c L3985-3999 `xhci_isoc_td_uses_frame_id` | 4.11.2.5 SIA vs Frame ID 取舍（URB_ISO_ASAP→false/首 TD→true/CFC） |
| xh1103 | xhci-ring.c L2590-2614 `handle_transferless_tx_event` | 4.11.3.1「TRB Pointer='0' 不可归因 TRB 事件族」（L717-719，Ring Overrun/Underrun 等）的消费面 |
| xh1104 | xhci.h L1120-1138 命令族枚举 9-17 | 4.11.4 格式族轻片（R12-SPEC §0 重叠面处置）：「TRB 类型表（内核直译）」小节=R10 批 D 先例（seg_h3 卡级覆盖），驱动零调用链 |
| xh1105 | xhci-ring.c L290-312 `inc_enq` | 4.11.5.1 软件侧越 Link TRB 推进（C bit=PCS/段切换=构造规则 L1003-1009 的消费面） |
| xh1106 | xhci-ring.c L4420-4424 `xhci_queue_vendor_command` | 4.11.6 vendor 命令驱动侧唯一发行口（NEC 固件升级） |
| xh1107 | xhci-ring.c L3548-3613 `xhci_align_td` | 4.11.7.1 TD Fragments 内核面（未对齐尾 TRB 拆包对齐=Figure 4-18「Non-aligned TD Fragment」实现形态） |
| xh1102dp 对读段 | xhci-ring.c L3501-3545 `xhci_td_remainder` | f18f8ed2 修复函数基线现行统一形态（注释块逐字复述 §4.11.2.4 算式） |
| xh1102ep 对读段 | xhci-ring.c L4015-4073 `xhci_get_isoc_start_frame` | add8469b 修复面基线现行形态（内含 "see xhci 4.11.2.5" 注释+xhci_frame_in_range 环绕窗判定） |

行 div 3221→3948（+727）。xh1104 选段判定：4.11.4 公共口径无单一对口函数（queue_command 已归 s41 cmd 组）→ 枚举切片+seg_h3 覆盖（批 D 先例），存在性注记入 pbody/extra_note；xh1106 有真实使用函数（xhci_queue_vendor_command）不落缺省。

## ② D1 流程图机核：零目标（EXPECTED_FLOWCHARTS 43 不变）

- grep 切片 "shall perform the following operations"/"shall perform the following"/"following operations:" 全 0 命中（~/.cache/zcode-tmp/r12c_d1_d2.py）；裸编号行 111 处全为图位数字（Figure 4-13 bit 标注 31/16/15/10/9/1/0 类），非算法步骤。
- 逐小节排除理由：4.11.1=组件定义 prose；4.11.2.2 控制环规则 L185-231/「xHC shall NOT check」清单 L303-325=规则 bullet 非算法（批 B「4.10.2.1 halt 两形态 prose 排除」同款）；4.11.2.3 TBC/TLBPC=公式两行（L482/L486-495）；4.11.2.4 TD Size=算式定义（公式非流程）；4.11.2.5/.5.1/.5.2=窗口规则/对齐规则/重同步 prose；4.11.3/.3.1=生成条件 bullet；4.11.4 十七小节=格式互链轻片；4.11.5.1 构造规则 bullet/4.11.5.2 EDTLA 四规则 bullet（L1069-1085）；4.11.6 未识别处置三 bullet；4.11.7 规则清单/4.11.7.1 Fragment 边界规则+图例走读（Figure 4-16/17/18 图体不复引，语义走引文+xhci_align_td 贴码）。
- 结论：flowcharts.json 不加块、EXPECTED_FLOWCHARTS 四处零改动（43 维持）。

## ③ D2 Table 4-7（EXPECTED_TABLES 5→6）

- **页码修正**：任务稿记「p193 单页」——切片页标 L206=[PAGE 192]（表题 L229-表尾 L267 全落 p192=L206-274）与 PDF 页眉「192」双证：**Table 4-7 在印刷页 192**（pymupdf 全文定位，PDF 0-based 191 页；正文命中仅此一页，另一命中 PDF12=TOC）。
- 列结构（/usr/local/bin/python3.9 pymupdf find_tables，只读）：**5 列 6 行**——两级表头（Row1: USB SETUP Data（跨 2 列）/Transfer Type flag (TRT)/Direction flag (DIR)（跨 2 列）；Row2: Data transfer direction (DTD)/wLength/Data Stage TRB/Status Stage TRB）+4 数据行，DTD 两值（Host-to-device/Device-to-host）各 rowspan 2。
- 重建形态：render_spec_table 扩展 `head_rows`（两级表头原始行）；退役窗=(229,267)（caption+表体+两段 Note——Note 归 tabfoot）不上 data-ck；verify_spec_table 全量逐字核验 PASS（t47←L229-L267）；两 Note（Status Stage DIR/Data Stage DIR，USB2 PID 与 USB3 TP 说明）随表重建。
- 挂载：xh1102b 卡 (227,228) main 窗后原位插入（XH_TABLE_AFTER）；TAB_ANCHOR "4-7"→#s411-03。

## ④ 引文窗 122 条（EXPECTED_SPEC 372→494；全 main 窗）

xh1101=13（含 4.11 导语 (2,4)）/xh1102a=6/xh1102b=17/xh1102c=17/xh1102d=7/xh1102e=12/xh1103=6/xh1104=7（轻片：公共口径 2+代表命令 5）/xh1105=15/xh1106=4/xh1107=18。全整行切片、区间不跨 PAGE 标（页标机核：189@L41/190@L87/…/218@L1697，逐窗 page_of(lo)==page_of(hi)==声明页）；唯一命中 count==1 逐窗断言（预检脚本全 PASS）；blockquote 372+122=494=双栏 494。

- **D1 零目标 → 全 main 窗无 full 窗**（「规范算法全文收纳（算法流程图+折叠原文）」小节仅在 full 窗存在时渲染——零算法块卡不挂该头，诚实形态）。
- **5 组跨页续窗按 §9 立法补齐不丢尾步**：(272,274)p192+(280,283)p193（Data Stage 总长=wLength 句）/ (326,328)p193+(340,342)p194（NOT required 检查句）/ (483,488)p196+(494,496)p197（TLBPC 公式 THEN/ELSE 尾）/ (529,533)p197+(540,541)p198（TD Size 5bit 截断尾）/ (1612,1615)p216+(1623,1632)p217（首 TRB 最后写句尾）。
- **重复句不复引**：Figure 4-13/4-14/4-15/4-16/4-17/4-18 图体行（OCR 布局文字）零上屏——图语义走引文说明段与贴码；4.11.4.1-17 逐小节格式句高度重复（"The format of the X Command TRB is defined in section 6.4.3.N"）→ 轻片只引公共口径+5 代表窗，其余互链 4.6 卡不重引。
- 窗位微修一处：xh1101 首窗原计划 (5,7)（含裸节号行）→ **(6,7)**：切片裸节号行在 mapper 号行行走中归属上一节（4.11），窗从号行起会错节 FAIL-ALIGN 实锤——改从标题行走（归 4.11.1，标题前缀回退通道接住），三面（build/checker/plan）同步。

## ⑤ 两补丁版块（XH_PATCHES/XH_PATCH_SEGS 各 +2；EXPECTED_PATCHES 12→14）

1. **xh1102dp 挂 s411-05 卡**（scene=61）：f18f8ed2a9adc41c2d9294b85b6af115829d2af1（Sarah Sharp 2013-01-11，xhci-ring.c 3+/2-，hunks @@-3108,7 xhci_v1_0_td_remainder + @@-3642,7 xhci_queue_isoc_tx，Cc stable 3.0+）。三段文案：背景=§4.11.2.4 TD Size 剩余包数语义（引文 L505-510 逐字）→ 问题=message 数字例逐字（2 additional service opportunities+1020B、3060B 跨 64KB 拆 1276+1784 两 TRB、正解 DIV_ROUND_UP(3060/1020)=3−1=2、旧算式 DIV_ROUND_UP(3060/5116)=1 与 "1 - (1276 / 5116) = 1"）→ 修复=GET_MAX_PACKET() 掩码两处。对读段=**xhci_td_remainder L3501-3545**（2013 名 xhci_v1_0_td_remainder 经 c840d6ce772d 重构为统一函数——照 xh1002p=find_td_by_dma 基线现行形态先例；hunk 头实证修复函数 2013 原名）。
2. **xh1102ep 挂 s411-06 卡**（scene=62）：add8469b3e0031a2e0243dd0d18c555cac8b7eea（Mathias Nyman 2026-08-06，xhci-ring.c 182 行重构+xhci-mem.c 1+xhci.h 7，3 文件 +86/-104，cc: Dylan Robinson/MOTU）。三段文案：背景=Frame ID 窗口语义+mid-stream 提交（L555-576 逐字）→ 问题两支（message 逐字：微帧口径与规范不一致含 "better match how xhci specification section 4.11.2.5 does it"/越窗加 gap 切 SIA 伤设备含 "Some devices can't handle gaps in isochronous transfers"）→ 修复四件（按帧算窗/每 URB 一次校验/越窗只 debug 含 "Only print a debug message"（原文 winow 拼写保真）/首 URB 对齐整帧或 interval 起点）。对读段=**xhci_get_isoc_start_frame L4015-4073**——**任务稿记「xhci_ring_prepare_transfer 内」系误记**：该函数名基线不存在，add8469b 的 hunk 落在 @@-3956,80 帧窗口族+isoc 排队族，现场机核（任务指令「git show 现场机核」）实证基线现行 isoc 窗口校验挂点=xhci_get_isoc_start_frame（注释 "see xhci 4.11.2.5" 原文在场），照更正执行。

## ⑥ s411 大区与导航

- 大区=「§4.11 TRBs 传输请求块 · R12 批 C · 全章最大节 11 卡（4.11.2 五型拆分）+补丁片 xh1102dp/xh1102ep」，挂「环与传输（4.7-4.14）」簇（导航 §4.11 TRB 格式条目）；导语含 11 卡地图+D1 零目标口径+Table 4-7+两补丁口径。
- 卡序=小节序（4.11.1→4.11.2 五拆→4.11.3→4.11.7）；4.11.2.2 卡 extra_note 互链 s43（排队函数 xhci_queue_ctrl_tx 所在）与 s410-01（完成评估）；xh1104 互链 s46-02/05/10 等（§4.6 重叠面 1:1）；deep 链就近既有台（#m1×8/#m6×2——m7 TRB 拼装台为 TrackC 面，待其上线后主会话可升级链）。

## ⑦ sr-todo→sr-ln 翻转与 linkify 扩展（EXPECTED_SR (139,89,23)→(176,106,17)）

- SEC_ANCHOR 增 4.11→#s411 + 4.11.1-4.11.7→#s411-01..11，并加子层精确路由（4.11.2.1-.5/4.11.3.1/4.11.5.1/.5.2/4.11.7.1→所属卡——免祖先回退落 4.11.2→s411-03 近似锚）；TAB_ANCHOR 增 4-7→#s411-03。
- **FIG_ANCHOR 增 4-13..4-18**→所属卡锚（4-13→s411-01/4-14→s411-03/4-15→s411-09/4-16..4-18→s411-11）：六图定义位全在 4.11 切片，旧实现会把章内图误落 sr-out 出界注记。
- **_ref_repl 增「章内未建图/表」分支**：Figure/Table 4-N 未入锚表且 N 为 4 系 → sr-todo（不再一律 sr-out）；Figure 4-21（MFINDEX 图，定义位在 4.14 未建）×2 走此通道。
- 计数：sr-ln 139→176（4.11 族引用翻 ln，EN+ZH 双侧）、sr-out 89→106（新窗 5-8 章引用 section 6.4.x/Table 6-91/9-2/8-7 类）、sr-todo 23→17（批 B 计入的 4.11 未建引用 6 枚翻 ln；新 todo=Figure 4-21×2+4.12.3+4.14.2.1.4+ZH 侧 4.12/4.14）；负向残留扫描=0、嵌套 `<a>`=0（批 B 修二保持）。

## ⑧ zh-quotes 增量（351→473 锚点）

- build_zh_quotes FILES/SEED +("spec-411.txt","4.11")；两步自举（--no-zh 落 EN 页→mapper 消歧→全量重建）。翻译覆盖实证：shard-009 含 4.11/4.11.1/4.11.2、shard-010 含 4.11.3-4.11.7（sub-sub 经 resolve_v2_sec 上溯）。
- **旧 351 锚点逐键 diff 零漂移**（dropped=0/value drift=0/新增 122 全为 spec-411）。
- **mapper 增补一处（加法式）**：标题前缀回退前先剥裸节号行前缀（窗含 "4.11.1 \nTRB Template \n正文" 形态时）；批 B 窗无此形态故零影响（零漂移门实证）。
- 新 122 窗状态：BLOCK 142/RUN 族 160/TRIM 120/TRIM-LOW 50/TITLE+BLOCK 1——TRIM-LOW 为度量保守标记（强 token 整词译出/ZH 段边界宽于 EN 页界窗，批 B ⑧ 同型），零实锤错窗不修；报告留档 ~/.cache/zcode-tmp/r12c_zh_report3.txt。

## ⑨ 场景顺移与 checker/e2e 扩容

- **场景 63 支**：主线 38-48=上表 11 支尾插；补丁组顺移 ch41p..ch45p=49-53、ch4606p/ch4609p/ch4610p=54/55/56、xh0700p/xh0803p/xh0902p=57/58/59、xh1002p=60，xh1102dp/xh1102ep=61/62 纯尾插。全页 scene= 链接同步：s41/s42/s43 补丁钮 38/39/40→49/50/51、s44/s45→52/53、s46 三卡→54/55/56、XH_PATCHES scene 字段+文案内 scene= 注记（57/58/59/60）。
- checker：EXPECTED_SEGMENTS 72/EXPECTED_SPEC 494/EXPECTED_PATCHES 14/EXPECTED_TABLES 6/PLAYER_SCENES range(63)/LOCAL_TARGETS+11 mp4/**MP4_DEPLOY_PENDING=11 枚**（渲染部署后主会话清空复跑零 WARN）/EXPECTED_SR (176,106,17)。
- online_e2e_r6.py 扩容：63 场景名回归（38-48+61/62 新键）+11 mp4+批 C 断言块（11 卡锚/两补丁锚+对读段/Table 4-7/4.11 todo 残留 0/50 场景陈旧口径负向）+计数更新（表 6/sr 176-106-17/qpair·qzh 494/链接区间 25-48 与 49-62）+banner 世系串。html 级本地预检（~/.cache/zcode-tmp/r12c_e2e_html_probe.py，照批 B probe 形态）**ALL PASS**（含 scene=38-48/61/62 各恰一次、顺移 49-60 各恰一次、零嵌套锚、无水印）。

## ⑩ 门禁与遗留

- build_landing **BUILD OK**（--no-zh 两步自举后全量重建）：段 72/行div 3948/hot 85/tipdoc 85/patch 14/blockquote 494/流程图 43=details 43/规范表 6/双栏 494——结构断言与实现一致（blockquote=spec 窗数=双栏数=494）。
- 表格逐字核验 PASS（含 t47←L229-L267 全量单元格/两级表头/脚注）。
- checker（部署树 learning/usb-xhci-learn/lessons/ch4-motion/）**ALL PASS**：spec 494+patch 14 逐字 · 段 72/72 · 摘录 85/85 · 表 6/6 · 流程图 43/43 · 相位 30/30 · ZH 494/494 · 链接自检——WARN 恰 11 枚=MP4_DEPLOY_PENDING 豁免；**--fix 复跑零回填**（页面字节 md5 不变）。
- 段内容逐行复核 72/72 PASS（构建侧独立复核通道）。
- 视觉快检 PNG 抽查全过（AI 视觉判读）：s411 大区顶（标题/导语/11 卡网格/双栏引文 qsrc）· Table 4-7（两级表头+DTD rowspan+两 Note+斑马纹边框完整）· f18f8ed2 补丁版块（phead 完整/git show 逐字/message 数字例在场/无破损）· xh1104 枚举轻片（TRB 类型表 h3+1120-1138 全 19 行对齐渲染）。
- 未跑/未动（禁动面遵守）：未跑 vite build、未 git commit、未动 dist/ 与 output/、未动 TrackA 面（src/scenes、src/render.ts、smoke_player.py、pace_audit.py、public/frames-*）与 TrackC 面（interactive/、smoke_interactive.py）与 EVIDENCE.md；smoke_player/fullwalk 不跑（渲染部署后主会话）。

### 遗留 pending（主会话）

1. 11 枚 mp4 渲染部署（清 MP4_DEPLOY_PENDING 复跑零 WARN）；
2. vite build+部署（cmp 同源）+learning commit+push+线上 e2e（r12c 断言面已就位）；
3. fullwalk 逐拍全检（fullwalk_driver.sh 缺省范围需扩 0-62）+BEATS_EXPECT 11 新键登记；
4. m7 TRB 拼装台上线后可升级 s411 各卡 deep 链（现为就近既有台 #m1/#m6）。

### 沉淀候选（供主会话合入 EVIDENCE 时参考）

- 切片裸节号行归属上一节（mapper 号行行走语义）——含号行的引文窗会错节 FAIL-ALIGN，窗一律从标题行/正文行起；
- 章内未建图表（Figure 4-19+/Table 4-8+，定义位在 4.12+ 未建节）应落 sr-todo 而非 sr-out——批 D 起后续批次引窗含此类引用时沿用 _ref_repl 分支；
- 交付批任务稿的页码/函数名记忆值与切片/PDF 冲突时以「现场机核」为准更正并记档（本批两例：p193→p192、xhci_ring_prepare_transfer→xhci_get_isoc_start_frame）。

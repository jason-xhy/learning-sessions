# EVIDENCE.md —— §4.10 主机控制器 TRB 处理（2026-11-04，泳道节量产；骨架版）

**范围声明（骨架立法）**：本页为 §4.10 的**流程骨架版**——主线泳道 + 要点表格，
按 DESIGN.md §8 契约修订表 2026-11-04 行（机器候选节 4.10/4.12/4.14/4.15/4.19/4.23
本批先出流程骨架页，anatomy 机器形态留后续会话，用户过目后追认或打回）。
页内注记已按任务要求写入 prose 第 3 段与图注（figCaption）。

## 逐条断言 → 判据

| 断言 | 判据 |
|---|---|
| 全配置 xHC 最坏约 5 亿条传输环（255 设备×31 端点×30 端点 64K Streams）；完成状态以 Transfer Event TRB 排队到事件环 | §4.10.1 p170（PAGE-OK `500M Transfer Rings`） |
| IOC=1 → 该 TRB 必生成 Transfer Event；事件生成必伴随对宿主中断；事件 Completion Code/Length 回传源 TRB 完成状态 | §4.10.1 p170（引文①逐字 + PAGE-OK `always generates an interrupt`） |
| TD Transfer Size=Σ各 TRB Length；IN 每 TD 排 ((TD Transfer Size−1)/MPS)+1 包，除末包外全满包；USB 包边界与 TRB 缓冲边界无对齐假设 | §4.10.1.1 p172–173（p173 两条 Note） |
| 短包：ISP/IOC 置位的 TRB 上才出事件，CC=Short Packet、Length=残余；中间 TRB 短包 xHC 自动推进到下一 TD | §4.10.1 p171（引文②逐字） |
| 错误无视 IOC/ISP 必出事件，CC 指明错误；需停机时 xHC 停在出错 TRB，软件用 Set TR Dequeue Pointer 推进 | §4.10.1 p171 + §4.10.2 p175（引文③逐字） |
| 传输环错误一律端点→Halted、需软件介入恢复；等时端点无握手从不停机 | §4.10.2 p176（引文④逐字 + 等时段） |
| Transfer Event 位置信息=Device ID/Endpoint ID/源 TRB 地址，兼供软件追平 Dequeue Pointer 副本 | §4.10.1 p171 |
| 事件突发靠中断节流（§4.17）吸收；BEI=1 短包事件免中断 | §4.10.1 p171（Interrupt Moderation 句）+ §4.10.4 p187（BEI 句） |
| TD 末 TRB 置 IOC=TD 完成事件；TD 占用的环空间随之可回收；短包事件≠TD 完成（除非指向末 TRB） | §4.10.4 p187 + §4.10.1 p171/p174 |
| Stall 恢复两步：①Reset Endpoint 命令 Halted→Stopped ②软件清设备侧 halt（非控制管道走独立控制管道；控制端点=接受下一 SETUP）；先清完才准写门铃 | §4.10.2.1 p176–177（两步流程 + p177 Note；规范步骤号 18./19. 为 PDF 伪影，页内用①②） |
| Stall：xHC 移出 Pipe Schedule+EP State→Halted+出事件；xHC 自己永不回 STALL | §4.10.2.1 p176 |
| TRB Error=字段越界/格式错误（驱动错误）；应迁移 Error 态（§4.8.3），实现也可 HCE | §4.10.2.2 p177 + 脚注 29 |
| USB Transaction Error：Table 4-5（CRC/DPP 错、Timeout、Bad PID→CErr 重试；Babble、Buffer Error→N/A）；Isoch 立即报错不停机，其余 CErr 次后 Halted | §4.10.2.3 p178（Table 4-5 逐行转写进表格卡 + 脚注 32） |
| Babble：TD/Frame/Packet Babble→CC=Babble Detected Error+停机，Frame Babble 另禁根端口，不计 CErr | §4.10.2.4 p179–180（含 §4.10.2.4.1 USB2） |
| Data Buffer Error：收超限/发欠载，主机内存延迟所致；不计 CErr；非等时 IN 不回握手、OUT 损坏包尾 | §4.10.2.5 p180 |
| HSE：灾难性系统错误置 USBSTS.HSE=1，xHC 清 R/S 停执行；双方认定系统完整性已失；可恢复内部错误走 HCE（§4.24.1） | §4.10.2.6 p181–182 |
| CErr 管理：Transaction Error 减计数；Stalled/Data Buffer/Babble 不减；No Error 重置回 CErr（00b 起始除外）；FS/LS 禁 CErr=0 | §4.10.2.7 p183（Table 4-6 逐行转写进表格卡） |
| 等时端点：CErr 不适用、数据事务错误不停机、推进下一 ESIT；Missed Service Error/Ring Overrun/Ring Underrun 语义 | §4.10.2.8 p183–184 + §4.10.3.1/4.10.3.2 p184–186 |
| IOC 组合语义表（8 行）：通用规则「IOC 置位即出事件」+ ISP/BEI/PAE/Link TRB 组合 + 错误无视标志 | §4.10.4 p187–188 条文归纳（p175 Note：同 TRB ISP+IOC 冗余；p173：Link TRB 全解析；p188 Note：PAE=0） |
| 设备视角：只见 USB 事务与握手（STALL/NAK/短包数据包）；等时端点不出 Stall | §4.10.2.1.1 p177 + §4.10.2 p176 |

## 门输出（2026-11-04 实跑）

1. 页码机核：`python3 scripts/xhci_spec_pagecheck.py`（13 needle：p170×3 / p171 / p175 / p176 / p178 / p181 / p183 / p184 / p186 / p187×2）→ **PAGECHECK-PASS**
   （首轮 p171 needle `Short Packet will trigger` 因跨 PDF 断行 MISS，改行内 needle `will trigger the generation` 后全过——教训与 brief 判据一致。）
2. 语言门：`python3 scripts/scan_words.py retired`（dark/light 各跑）→ total=4 `{回执:2, 泳道:2}` ⊆ 豁免集 {回执,柜台,泳道}。
   （首轮咬出 `实收`×2——退役词族实锤，当轮改「实际收到的/收到<期望」后清零。）
3. 交互冒烟：`python3 scripts/xhci_spec_lane_smoke.py lessons/xhci-spec/ch4/4.10-trb-handling 10` →
   `[dark] PASS console=0` / `[light] PASS console=0` → **LANE-SMOKE-PASS**
4. 自包含：`grep -c 'http://\|https://'` = 2（dark）/ 2（light），命中全为 SVG xmlns。
5. 互链：7 个相对链接目标全部存在（4.7/4.8/4.9/4.11/4.17 各节、板块 index、fig3 机器），MISSING=0。

## shots 清单（scripts/xhci_spec_lane_smoke.py 自动落盘）

- shots/lane-overview-dark.png / lane-overview-light.png（总览全景）
- shots/lane-step2-dark.png / lane-step2-light.png（步进第 3 步态）
- shots/lane-step-end-dark.png / lane-step-end-light.png（步进末态）

## 已知边界（骨架范围声明）

1. **机器形态缺位**：本节在机器候选清单内，anatomy 机器留后续会话；页内 prose 第 3 段
   〔注记〕+ 图注已如实标注「本页为流程骨架版」。
2. **不做位级展开**：§4.10.1.1.1/§4.10.1.1.2（Event Data TRB 有/无时的短传细则、
   ISP/IOC/ED/PAE 逐组合行为）只以表格卡归纳要点，逐 TRB 位级行为留 §4.11 TRB 节语境展开。
3. **§4.10.2.4.1/§4.10.2.4.2 协议细节从简**：USB2 Frame Babble 禁根端口、USB3 DPP 超限
   只入表格卡一行，PID Mismatch IMPLEMENTATION NOTE 未展开。
4. **Table 4-5 脚注 30–35 未转写**（PID 码表/DPP 定义/XactErr 即时性/USB3 timeout 语义），
   只取脚注 32 的「Isoch 立即报错、其余 CErr 次后 Halted」入卡。
5. **规范无 IOC 位组合表**：任务面说「§4.10.4 位组合 p185–187 附近表格」——经 pypdf 全文
   扫描实证 §4.10 范围内仅 Table 4-5（p178）/Table 4-6（p183）两表，p185/186/188 无表、
   p187 的 Table 仅 Table 6-90 交叉引用；§4.10 全节无 ZLP/EDI 字样。IOC 组合语义表
   为**按 §4.10.1/§4.10.4 条文逐条归纳**（每行附页码），表前已声明非原文表。
6. 等时调度细节（IST/Valid Frame Window/SIA、§4.11.2.5 重同步）只点到为止——属 §4.11/4.14 域。

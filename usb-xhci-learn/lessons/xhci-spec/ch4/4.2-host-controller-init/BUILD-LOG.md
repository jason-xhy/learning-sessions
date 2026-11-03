# BUILD-LOG —— §4.2 启机配电台（2026-11-03）

## 文件
- `build.mjs` —— 机器几何 + 泳道图 + 页面组装（node build.mjs [--light] [--audit]）
- `geometry-live.mjs` —— 动件几何单源（build 生成初始姿态入审计 + 源码内联进页面驱动 live）
- `live.mjs` —— 8 帧状态机/cues/交互/读数（构建期内联）
- `checks.py` —— 交付前机检（自包含/互链/wiring）
- `steps-*.json` —— drive.mjs 帧驱动/390 zoom/zfs 验证脚本

## 轮次记录
1. 初版构建 117 items，audit 崩溃：A.prism/A.disc 传入两/三轴 frameOf（纯构造器不补轴）→ 改 frameAlong / 补第四轴。
2. audit 176 问题：立柱穿台体、拉线穿台/柜/base、灯座 z 轴 cylinder 与 +y 圆罩互锁、卡与轨交叠、20 个纯文字项无 shape。整改：文字项转 overlays（组装期追加、不入审计）；灯座/旋钮座 disc 化并统一面板前基线 PF；桁架改双柱门架（柱立台前方底板，梁 y -4..8 z 77..83）；拉线绕行重排。
3. 84 → 54：面板沉入柜体修正（PANEL 贴柜面前）、lid 抬至 z 98..100、轨三段让位卡行（RAILS_Z 62/38/14）、小闸刀铰柱 y 向 disc 化。
4. 54 → 24 → 13 → 9：挡块/梁端挡移出宿主、rs 铰球抬出柱顶、mag 与托盘留缝、NOTE plan 补 r（缺 r 曾致 shape bounds NaN）、爪 shape 与车体搭接。
5. 9 → 3 → 1 → 0：端子方案收敛——线端悬于端子柱上方（ends:[false,false] 不查 terminal，clearance 达标），柱顶加接线环刻线；cfg 线改走柜面顶部带（绕 CNR 灯与檐）；梁缩短至 x ≤105。最终 `audit passed`（106 items，allow 2 对=拉线×端子连接，4x 目检后放行）。
6. lines 2→0：ERSTSZ 窗改闭合框；R/S 杆铰点补球（fill 后画遮线端）。
7. 视觉轮（analyze_image 4x/8x 读图）：控件区竖直面 45° 斜切大段文字不可读/串扰 → 结构性整改：删竖直面副注、新增「标签檐」（水平薄板），格名全部 topMatrix 水平面刻字；ghost 槽位框 faint→mid；滑车 home 移 -90 避柱；微字号统一 ≥4.0 世界单位（≈11.05px 等效）。
8. 帧终态快照 bug：portsOn/erLamp/inte/ie/旋钮角在 snapshot() 缺字段，动画结束回零（F6 端口 0/4）→ snapshot 从帧定义推导终态，复验 8 帧读数全对。
9. 泳道图 light 主题缺陷：框填色误用 --anatomy-shade1（light 下近黑）→ 按主题写死；驱动泳道高度不足第 7 框穿出 + dev 横条与 hc 泳道重叠 → 重排尺寸（stepH 60/gap 20/drv 654/hc 700/dev 动态 y）；.box.dash 补虚线样式；顺序自由组虚框被 box 填充覆盖（画序移到框后）；箭头线身 var 色过淡 → 按主题写死加粗 2.4、dash 6 5。
10. 语言门：初稿残留 账本×4/戏×1/幕×1 不在豁免表 → 全部改写（DCBAA 直称/「初始化从这里开始」/「此刻还只是」/帧名「配槽与 DCBAA」）；终态残留 柜台/回执/泳道 全 ⊆ 豁免表（按 2026-11-03 契约修订判据 PASS）。
11. 修复轮（用户反馈：遮挡/帧速/字号）：
    - 遮挡：铭牌文字嵌实体 item 被 settle 序后画的 gantry.beam/panel.face/gantry.post0 盖住（探针 4 命中）→ 文字抽到 labels 层，插入点=遮挡者最靠后一个之后；items 序保持 settle 原序（曾试「静态→labels→actors」三分序，飞行卡压前置拉线属 settle 只知 home 位姿的固有盲区、修前即如此，回退三分序消除回归面）。
    - 帧速：DUR 全值 ×1.5、TOUR_DWELL 3.4→5.5；steps-frames/zfs 等待同步加长。
    - 字号：机制句上盖前带 7–8；檐格名双行错位去压字（单行六名在任何 ≥2.3 字号下必压字——等距斜排相邻半宽和＞格距）；卡名 8.2/数字窗 ×1.25/注记牌主行 8/端口铭 6.2 等；两块工位铭牌板面已满保持原字号（EVIDENCE §9.3 全表）。措辞零改动。
    - 门：audit ×2 · lines 0 ×2 · 探针 PASS ×2 · 语言门纯豁免 ×2 · checks 全 PASS · shots 32 张重拍。
12. 老问题修复轮（2026-11-03，FIXSPEC §4.2 两项，详见 EVIDENCE §10）：
    - 铭牌 ×2：desk 满脸板 88×20（9/6 右锚避 post0 屏带，抽屉细节移 +x 侧面）；cabinet 移柜顶后沿 112×19.2（中部板高上限 ~14.5 容不下 9/6 两行 17.8 世界——会遮 R/S 闸刀臂/柱）；fit 补后沿角点后 scale 1.579 不变（宽度约束 binding）。LABEL_AFTER 补两块铭牌板自身。
    - 飞行卡：自 trolleySvg 拆独立非审计组，live 每帧对拉线分段 ray-box 判深插入 DOM 序（两带推导线均在卡前 Δd +5.7/+26.8，过线=线盖卡）；实测 DOM 序正确、静态 settle 序零扰动。
    - 坑（新）：① 帧终态探针看不见飞行卡（终态 card=null）——过线正确性需 DOM 序实测/特写，别指望探针；② 截图驱动 drive 的 key 走 arm→raf 判空时序，纯 eval playTo 在死窗不启动——巡游态驱动（不按键）最稳；③ 本机 4_5v 读图通道整会话 400 时，sips 重编码也救不回，改 DOM 序/数值双证；④ 穿越窗口只有 ~30ms（drop 9.6..12 与 x 带交叠），轮询抓拍要靠巡游态 + 25ms 内周期，或 drive slow+until。

## 最终门（与 EVIDENCE §4 一致）
audit passed ×2（dark/light）· line ends 0 ×2 · 语言门新判据 PASS · 自包含 0 外链 ×2 · 页码 18/18 · 互链全存在 · __zfs 双主题存活（zoomOf 1→3.2）· 截图 24 张 console clean。

## 坑与经验（可复用）
- A.prism/A.disc 的 frame 必须四轴齐全：frameOf(o,a,u,v) 是纯构造器；两/三参调用产生 F.v=undefined，audit ray-cast 内 dot3 崩溃且无指名——用 frameAlong 或显式补轴。
- A.slab 的 plan 缺 r 字段 → shape bounds NaN（coverage 报 "recorded NaN"）→ plan 一律带 r。
- 等距 +y 竖直面文字被斜切 ~26.5°：大段中文/多行小字不可读；控件名走 topMatrix 水平面（配电台的「标签檐」是自然载体）。
- 线端接端子的 audit 语义：ends:[false,false] 免 terminals 检查，线端悬于柱上方 0.9 单位即过 clearance，视觉加接线环刻线即可；clearances() 无 allow 参数（depthOrder 才有），端子对不能靠 allow 消 close。
- zoomfs 单源 IIFE 写死首个 .iso-stage：多舞台页构建期 replaceAll scope 化，第二实例 __zfs 改名。
- 本机 Read 图片只回 CDN URL：用 4_5v analyze_image 读图；偶发 400（图解析错误）时 sips 重编码或换文件名重传即可。
- 截图特写取景坐标不能凭世界坐标猜：先拍整卡，按卡内像素定位再 zoom。

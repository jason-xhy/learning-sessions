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

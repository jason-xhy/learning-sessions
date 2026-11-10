# §4.3 USB 设备初始化 · 3D 交互课件（xHC 启机车间）

three.js 真 3D + heeli 交互外壳的实验件（设计档 `notes/43-heeli-3d-design-2026-11-09.md` v2）。
现行 2D 页 `../4.3-usb-device-init/` 原样保留，本目录为独立实验位。

## 构建

```
node build.mjs     # 产出单文件 index.html（three.js r160 内联，运行时零外部 script/link/字体）
```

- 产物字节级可重复（无时间戳）。
- three.js vendored：`vendor/three.module.min.js`（r160，sha256 见 EVIDENCE §1）。
- 源码：`src/stages.js`（12 工段数据+预设+引文+字段卡+自测题）/ `src/scene.js`（三区程序化建模）/ `src/panel.js`（面板+底栏）/ `src/main.js`（引擎）/ `src/style.css`。

## 验收（八门）

```
node shots.mjs r7                    # 全景+12 工段机位截图（1440×900）+ console 全程抓取
node dev/label_overlap.mjs           # 3D 标签不叠探针（全景+每工段机位，overlap>0.15 报清单）
python3 scripts/scan_words.py retired index.html          # 语言门（残留 ⊆ {回执,泳道}）
/usr/local/bin/python3.9 scripts/xhci_spec_pagecheck.py …  # 页码 needle（判据对见 EVIDENCE §2）
```

门清单与逐门证据：`EVIDENCE.md` §3。操作行为验证（动画/试错/预设）判据：§4。

## 交互

- 底栏五分组（总览/连接/登记/配置/完工）12 工段；键盘 ←→/空格 单步。
- 播放：单步 ▶ / 自动巡游 / 全线联动运行 / ⟲ 复位。
- 分支预设 chips：全速设备·教学全分支（默认）/ 高速设备（跳 8 字节读取与 Evaluate Context）/ USB3 设备（attach 自动 Enabled，无端口复位帧）/ BSR=1 legacy（先 Default 态通信后编址）。
- 试错：F5 工段点「试错：不填上下文直接编址」→ Parameter Error 回执 + 红告警卡。
- 相机：每工段预置机位+1.2s 缓动飞行；拖转/滚轮/右键平移手动接管，「回到工位」复位。
- 折叠节：显示选项（剖视/标签/粒子/机位）· 流程原理 · 规范原文对照六条 · 规范字段卡 · 完工自测 4 题。

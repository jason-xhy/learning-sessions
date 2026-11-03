# EVIDENCE.md —— §4.13 设备通知（2026-11-04，泳道节量产 #3）

## 逐条断言 → 判据

| 断言 | 判据 |
|---|---|
| USB3 定义 Device Notification Transaction Packet，16 种通知类型；xHC 自处理一部分、可上报一部分 | §4.13 p229 首段（pagecheck PAGE-OK `4.13`@p229；包格式/type 定义归 USB3 spec §7.5.1.6——正文引述） |
| DNCTRL 按位选中要收的类型 → 生成 Device Notification Event | §4.13 p229（引文① PAGE-OK `Device Notification Control (DNCTRL)`） |
| 调试例外：xHC 自处理的类型也可上报 | §4.13 p229 Note 1 |
| 事件路由=该槽 Slot Context Interrupter Target 决定事件环 | §4.13 p229 Note 2（引文② PAGE-OK `Interrupter Target field to` + `determine the Event Ring that shall receive`） |
| LTM：收 USB3 设备 BELT 值→比较→最小值经平台 LTR 转发宿主 | §4.13.1 p229（引文③ PAGE-OK `lowest value to the host platform`）；LTR 在三方泳道之外=平台总线特定（p230 "host-specific ... outside the scope"） |
| xHC 维护 Current BELT（初值 tBELTdefault）+ 每设备 Device BELT；设备拔出后重算 | §4.13.1 p230 bullets + p231 |
| Set LTV 命令=软件自设 Device BELT | §4.13.1 p231（PAGE-OK `Set LTV Command TRB provides a means`）；命令细节归 §4.6.14 |
| TRB 格式归 §6.4.2.7 | §4.13 p229 引述 |

页码机核：PAGECHECK-PASS（needle 避 PDF 断行：两处跨行用断行后短 needle）。

## 工艺与门

- 生成器 lane_page.mjs 量产件 #3；build.mjs 纯数据（7 步）。
- **本节设备泳道真实在场**（设备=通知发起方）——三方视角如实，非遗例外的「不参与」注记节。
- 门：语言门 total=7 ⊆ 豁免集（回执1/泳道6）；交互冒烟 LANE-SMOKE-PASS ×2 主题（console=0、计数 3/7、复位回总览）；自包含（SVG xmlns 除外）；截图 6 张。

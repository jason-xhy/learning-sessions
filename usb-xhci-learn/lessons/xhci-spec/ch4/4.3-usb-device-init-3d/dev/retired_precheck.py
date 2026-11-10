#!/usr/bin/env python3.9
"""retired_precheck.py —— S5 一次性：新增文案串预检语言门退役词（全 RETIRED_WORDS 逐串子串计数）。
用法: /usr/local/bin/python3.9 lessons/xhci-spec/ch4/4.3-usb-device-init-3d/dev/retired_precheck.py
判据: 任何退役词在新串中命中 → 列出；全零才可入构建（豁免词「回执/定案」也按零新增口径，棘轮基线无余量）。"""
import re
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[5]
scan = (ROOT / "scripts" / "scan_words.py").read_text(encoding="utf-8")
m = re.search(r"RETIRED_WORDS = \[(.*?)\]", scan, re.S)
words = re.findall(r'"([^"]+)"', m.group(1))

NEW = [
    # quiz（stages.js QUIZ）
    "命令完成事件走哪条环，交回给软件？",
    "原命令环——原路返回",
    "事件环",
    "EP0 传输环",
    "所有命令都以命令完成事件在事件环上报完成（p60）；全规范仅一条命令环（p68 原句 There is only one Command Ring）——完成事件绝不回命令环；EP0 传输环只走该槽的传输。",
    "Enable Slot 之后、Address Device 之前，软件必须先等到什么？",
    "无须等待——两条命令可以连发",
    "本槽的命令完成事件（Slot ID 随事件交回）",
    "设备的 8 字节回包",
    "§4.3.2（p75）：须等本槽命令完成事件才可对同槽发后续命令；Slot ID 由 xHC 自选（p75）。8 字节读取是编址之后 FS 才走的支线（p72）。",
    "F5 试错：输入上下文未填就抢发 Address Device，xHC 会？",
    "照常编址，交回 Slot ID",
    "回 Completion Code=Parameter Error，输出上下文不变",
    "把设备直接送入 Default 态",
    "命令执行前校验输入上下文有效——无效上下文→Parameter Error，输出上下文卡不动（p100；S1 §7.2 条 10）。这正是「先填表后编址」顺序的存在理由。",
    # L2 干扰项 hint（lab.js）
    "00h=主机到设备（Host-to-Device）——读描述符方向是 Device-to-Host，bmRequestType=80h（p73）",
    "08h 不是 bmRequestType——载荷里 8 是 wLength；方向/类型/接收方合成为 bmRequestType=80h（p73）",
    "bRequest=5 是 SET_ADDRESS 的请求号；GET_DESCRIPTOR 是 bRequest=6（p73）",
    "8 是 wLength（读取长度），不是请求号；GET_DESCRIPTOR bRequest=6（p73）",
    "0001h=Configuration Descriptor（类型 2）；Device Descriptor 是 wValue=0100h（高字节类型 1，p73）",
    "0300h=String Descriptor（类型 3）；Device Descriptor 是 wValue=0100h（p73）",
    "64 是驱动给 FS 的初猜 MPS（xhci-mem.c:1125–1128）；本步只读前 8 字节，wLength=8（p72/p73）",
    "wLength=0 表示无数据段；读前 8 字节须 wLength=8（p73）",
    "TRT=2 是 OUT 方向数据段；GET_DESCRIPTOR 的数据段是 IN——Setup Stage TRT=IN Data Stage(3)（p73）",
    "TRT=0=无数据段；本控制读带 8 字节数据段，Setup Stage TRT=3（p73）",
    "IDT=0=数据在内存缓冲；Setup 载荷内联在 TRB 里，IDT=1（p73）",
    "Setup 段不是终点——IOC=0；只有 Status 段 IOC=1 才在完成时发事件（p73）",
    "控制读的 Data 段方向=IN（DIR='1'，设备→主机）（p73）；Status 段才是 OUT",
    "Len=0 无数据可传；读前 8 字节 Data Stage Len=8（p73）",
    "本次读取长度是 8 字节（p72/p73）；64 是 FS 初猜 MPS，别混入 Data Stage Len",
    "控制读 Status 段方向=OUT（DIR='0'）——与 Data 段方向相反（p73）",
    "IOC=0 完成时不发事件——Status 段 IOC=1 才有 Transfer Event 回（p73/p74）",
    "按的是 EP0 门铃——命令门铃是 DB Target=0（p83）",
    "64=驱动 Address Device 时按速度的初猜（FS=64，xhci-mem.c:1125–1128）；更新 MPS 须按回包末字节 bMaxPacketSize0=8（p98 Note）",
    "512 是 SS 设备的默认包长；样例设备回包末字节 bMaxPacketSize0=8（p98 Note，S1 §3.1）",
    # F2 机位口径卡（main.js）
    "本帧=桌面组与柜面全景观看位：读线/写线闪与复位按钮阻尼下压在此看全景；USB2 屏的 CCS/PR/PLS 读数由 F3 特写承载，本帧屏面呈侧角作语境。",
    # scene.js 注释（构建会内联进 index.html——语言门扫全文件）
    "S5 修复：自适应字号——长文案原样以固定 fs 绘制会超出 512px 画布被两侧裁（灯排牌头「Enabled」被裁实锤）",
    "S5 修复（复评残留：牌头「Enabled」被裁实锤=文案超 512px 画布两侧裁+首灯球贴头）：两行排布（「——」处折行）",
    "S5 暗部层次：F0 全景顶区环辨识度低——光强 24→44 并下压近环带",
    "桌面行南向正面补光（S5 暗部层次：桌面道具群剪影感——吊灯/北向 rim 照顶面，道具南立面无光）",
    "state.flags 键为小写（S5 修复：原读 st.flags[f] 大写键永空=五点常暗）",
]

bad = 0
for s in NEW:
    hits = [w for w in words if w in s]
    if hits:
        bad += 1
        print("HIT " + repr(hits) + " <- " + s[:60])
print("RETIRED-PRECHECK-PASS" if not bad else f"RETIRED-PRECHECK-FAIL ({bad} strings)")
raise SystemExit(0 if not bad else 1)

# 页码机核（DESIGN §1.3）：pypdf needle 全量复核，输出贴 EVIDENCE.md
from pypdf import PdfReader

PDF = "/Users/jason/ZCodeProject/usb-xhci-study/specs/625472_xHCI_Rev1_2b.pdf"
r = PdfReader(PDF)

CHECKS = [
    (68, "4.1", "§4.1 节头（命令操作，上节链接页）"),
    (71, "4.3", "§4.3 节头"),
    (71, "USB Device Initialization", "§4.3 标题"),
    (71, "powered on", "Disconnected 态：端口上电 PP=1 等待"),
    (71, "PSCEG", "PSCEG 0→1 跳变产生端口状态变化事件"),
    (71, "Current Connect Status (CCS)", "attach 置 CCS/CSC"),
    (72, "bMaxPacketSize0", "8 字节描述符句（FS 读前 8B）"),
    (72, "U0", "复位完成 PLS=U0"),
    (72, "Default state, preparing it for a", "复位把设备送入 Default 态"),
    (72, "Enable Slot", "步 4 取槽句"),
    (72, "8, 64, and 512", "LS/HS/SS 默认包长可跳过此步"),
    (73, "bmRequestType = 80h", "Setup TRB bmRequestType=80h"),
    (73, "wValue = 0100h", "Setup TRB wValue=0100h"),
    (73, "TRT) = IN Data Stage (3)", "Setup TRB TRT=IN Data Stage(3)"),
    (73, "bRequest = 6", "bRequest=6 GET_DESCRIPTOR"),
    (73, "wLength = 8", "wLength=8"),
    (73, "Direction (DIR) = ", "Data/Status TRB DIR 字段"),
    (74, "Ring the Device Slots", "步 viii 按门铃（DB Target=Control EP 0）"),
    (74, "Control EP 0", "门铃 DB Target=Control EP 0 Enqueue Pointer Update"),
    (74, "Evaluate Context Command", "步 x Evaluate Context A1=1 更新 MPS"),
    (74, "both operations", "双操作同成句"),
    (74, "4.3.1", "§4.3.1 节头（根端口复位）"),
    (74, "hubs and TTs", "hub/TT 逐层初始化 Note"),
    (74, "fully operational", "步 8/步 12 完工句"),
    (75, "4.3.2", "§4.3.2 节头（设备槽分配）"),
    (75, "4.3.3", "§4.3.3 节头（设备槽初始化）"),
    (75, "selected by the host controller", "Slot ID 由 xHC 自选"),
    (75, "A0 and A1", "A0=1 且 A1=1"),
    (75, "Route String shall equal", "脚注 8：根端口直连 Route String=0"),
    (76, "Context Entries = 1", "Slot Context Context Entries=1"),
    (76, "EP Type = Control", "EP0 Context EP Type=Control"),
    (76, "CErr) = 3", "EP0 Context CErr=3"),
    (76, "Device Context Base", "步 10 软件装载 DCBAA 表项"),
    (76, "4.3.4", "§4.3.4 节头（地址分配）"),
    (76, "BSR) flag cleared", "BSR=0 主线"),
    (77, "BSR flag set to", "BSR=1 legacy 分支（p77）"),
    (77, "blocks", "BSR=1 禁止 xHC 发 SET_ADDRESS"),
    (77, "4.3.5", "§4.3.5 节头（设备配置）"),
    (77, "SET_CONFIGURATION", "SET_CONFIGURATION 请求"),
    (78, "4.3.6", "§4.3.6 节头（设置备用接口）"),
    (78, "may schedule TDs", "双操作完成后可调度 TD"),
    (85, "Table 4-1", "槽态-设备态对照表（Table 4-1 在 p85 起）"),
    (87, "shall transition to the Addressed", "槽 Enabled→Addressed（BSR=0）"),
    (88, "shall transition to the Configured", "槽 Addressed→Configured（Configure Endpoint DC=0）"),
    (97, "4.6.5", "§4.6.5 Address Device 命令"),
    (97, "Address ‘0’", "SET_ADDRESS 请求发往地址 0（USB2）"),
    (97, "select an address", "新地址由 xHC 选定"),
]

fails = 0
for page, needle, what in CHECKS:
    t = r.pages[page - 1].extract_text() or ""
    ok = needle in t
    if not ok:
        fails += 1
    print(f"p{page:3d} {'PASS' if ok else 'FAIL'}  {needle!r:38s} {what}")
print(f"\n{len(CHECKS) - fails}/{len(CHECKS)} needles PASS")

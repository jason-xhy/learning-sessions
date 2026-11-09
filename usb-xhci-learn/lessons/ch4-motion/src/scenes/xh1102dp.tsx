// §4.11.2.4 补丁分帧 —— xhci: Fix TD size for isochronous URBs.（xh1102dp）
// 判据（全部现场 `git -C /Volumes/KernelSrc/linux show f18f8ed2a9adc41` 取原文；
// 面板行=diff 内容逐字，制表符按 2 空格显示）：
//  - commit f18f8ed2a9adc41c2d9294b85b6af115829d2af1（短形 f18f8ed2a9adc41）
//    Sarah Sharp <sarah.a.sharp@linux.intel.com>, 2013-01-11,
//    drivers/usb/host/xhci-ring.c（3 行增/2 行删，Cc stable 3.0+）
//  - message 关键句（原文逐字）：
//    "Isochronous endpoints also encode the number of additional service
//     opportunities in their wMaxPacketSize field. The TD size calculation
//     did not mask off those bits before using the field. This resulted in
//     incorrect TD size information for isochronous TRBs when an URB frame
//     buffer crossed a 64KB boundary."
//    数字例（原文逐字）："an isoc endpoint has 2 additional service
//     opportunites and a max packet size of 1020 bytes" / "a frame transfer
//     buffer contains 3060 bytes" / "one frame buffer crosses a 64KB
//     boundary, and must be split into one 1276 byte TRB, and one 1784 byte
//     TRB." / "For this TD, the number of packets to be transferred is
//     (3060 / 1020), or 3." / 正解 "total packet count = DIV_ROUND_UP
//     (3060 / 1020) = 3" + "3 - (1276 / 1020) = 2" / 旧算 "total packet
//     count = DIV_ROUND_UP (3060 / 5116) = 1" + "1 - (1276 / 5116) = 1"
//    （"opportunites" 为 message 原文拼写）
//  - 修复核心（diff 原文，xhci-ring.c）：xhci_v1_0_td_remainder 的
//    packets_transferred 除数（旧 3111 删 → 新 3111 增）与
//    xhci_queue_isoc_tx 的 total_packet_count 除数（旧 3645 删 → 新
//    3645-3646 增）都从 usb_endpoint_maxp 裸值改为
//    GET_MAX_PACKET(usb_endpoint_maxp(...)) 掩码
//  - 规范锚 evidence/spec-411.txt（§4.11.2.4 p198，L505-533）："The TD Size
//    field of a TRB defines a number of packets that remain to be
//    transferred for a TD after processing all Max Packet Sized packets in
//    the current TRB and all previous TRBs." + "TD Packet count = ROUNDUP(
//    TD Transfer Size / Max Packet Size )"——Max Packet Size 语义=掩码后的
//    真最大包；wMaxPacketSize bits 10-11 的额外服务机会位不是包长
//  - 沿革注记（ch4610p 先例）：修复函数 xhci_v1_0_td_remainder 后经
//    c840d6ce772d 重构统一为 xhci_td_remainder——基线 d9008e061539 现行
//    形态 xhci-ring.c L3501-3545（对读段归 TrackB landing）
import {makeScene2D} from '@motion-canvas/2d';
import {Vector2, waitFor} from '@motion-canvas/core';
import {C, TLx, TLy} from '../lib/theme';
import {
  buildStage,
  lanesIn,
  makeCard,
  cardIn,
  makeChip,
  makeNote,
  makeDiffPanel,
  flash,
  DiffPanelApi,
  StageApi,
} from '../lib/parts';

export default makeScene2D(function* (view) {
  view.fill(C.bg);

  /* ===== 舞台 ===== */
  const stage: StageApi = buildStage(view, {
    section: '§4.11.2.4 补丁',
    zh: '等时 TD Size 掩码',
    en: 'Fix TD size for isochronous URBs',
    cite: 'f18f8ed2a9adc41 · xhci-ring.c',
  });
  yield* lanesIn(stage);

  /* diff 面板（中带主位；行内容 = git show f18f8ed2a9adc41 节选逐字，
     add=新行号 del=旧行号，制表符按 2 空格显示） */
  const panel: DiffPanelApi = makeDiffPanel(view, {
    x: 0, y: TLy(500), w: 1240, maxVisible: 5,
    title: 'drivers/usb/host/xhci-ring.c · commit f18f8ed2a9adc41（节选：两处除数掩码）',
    lines: [
      {no: '', code: '—— xhci_v1_0_td_remainder()（@@ -3108,7 +3108,7 @@）——'},
      {no: '3110', code: '  packets_transferred = (running_total + trb_buff_len) /'},
      {no: '3111', code: '    usb_endpoint_maxp(&urb->ep->desc);', kind: 'del'},
      {no: '3111', code: '    GET_MAX_PACKET(usb_endpoint_maxp(&urb->ep->desc));', kind: 'add'},
      {no: '', code: '—— xhci_queue_isoc_tx()（@@ -3642,7 +3642,8 @@）——'},
      {no: '3644', code: '    total_packet_count = DIV_ROUND_UP(td_len,'},
      {no: '3645', code: '        usb_endpoint_maxp(&urb->ep->desc));', kind: 'del'},
      {no: '3645', code: '        GET_MAX_PACKET(', kind: 'add'},
      {no: '3646', code: '          usb_endpoint_maxp(&urb->ep->desc)));', kind: 'add'},
    ],
  });

  /* ===== 幕① 背景：TD Size 语义 + wMaxPacketSize 复用编码 ===== */
  panel.ref().opacity(1);
  yield* waitFor(0.4);
  yield* panel.highlight(1);
  const bgNote = makeNote(
    view,
    [
      '背景（message 原文+§4.11.2.4）：TD Size=处理完本 TRB 后 TD 还剩的',
      '包数；等时端点的 wMaxPacketSize 字段还编码 additional service',
      'opportunities 位——"The TD size calculation did not mask off',
      'those bits before using the field."',
    ],
    {x: TLx(700), y: TLy(265), w: 1100, tint: C.warn},
  );
  yield* stage.say('TD Size 除数须是真最大包；字段里混着机会位。', '① 冲突');
  bgNote().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.2);
  bgNote().opacity(0);
  yield* waitFor(0.25);

  /* ===== 幕② 问题：数字例——5116 当包长，TD Size 误记 1 ===== */
  yield* stage.say('数字例：3060B 跨 64KB，旧算法把 5116 当包长。', '② diff');
  yield* panel.highlight(2);
  yield* waitFor(0.25);
  yield* waitFor(1.4);
  const logicChip = makeChip(
    view,
    '旧码未掩位：2 次机会位并进包长（1020+2×2048=5116）——首 TRB TD Size 误记 1，正解 3−1=2。',
    {x: TLx(960), y: TLy(200), w: 1720, tint: C.warn, size: 17},
  );
  const exNote = makeNote(
    view,
    [
      '数字例（message 原文）：端点 2 additional service opportunites+最大',
      '包 1020B；帧缓冲 3060B 跨 64KB 拆 1276B+1784B；总包数 (3060/1020)',
      '=3；正解 DIV_ROUND_UP(3060/1020)=3、3−(1276/1020)=2；旧算',
      'DIV_ROUND_UP(3060/5116)=1、1−(1276/5116)=1。（拼写为原文）',
    ],
    {x: TLx(700), y: TLy(265), w: 1100, tint: C.warn},
  );
  logicChip().opacity(0.95);
  exNote().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.6);
  logicChip().opacity(0);
  exNote().opacity(0);
  yield* waitFor(0.25);

  /* ===== 幕③ 修复：GET_MAX_PACKET 掩码两处同修 ===== */
  yield* stage.say('修复：GET_MAX_PACKET 掩码，两处除数同修。', '③ 收尾');
  yield* panel.highlight(3);
  yield* waitFor(0.25);
  yield* waitFor(1.8);
  yield* panel.highlight(7);
  yield* waitFor(0.25);
  yield* waitFor(2.0);
  const specChip = makeChip(
    view,
    '"TD Packet count = ROUNDUP( TD Transfer Size / Max Packet Size )" — §4.11.2.4 p198：Max Packet Size=掩码后的真包长；两处除数统一走 GET_MAX_PACKET（+3/−2，backport 至 stable 3.0+）。',
    {x: TLx(960), y: TLy(850), w: 1720, tint: C.hc, size: 15},
  );
  specChip().opacity(0.95);
  yield* flash(panel.ref, 1);
  yield* waitFor(0.3);
  yield* waitFor(3.8);
  specChip().opacity(0);
  yield* waitFor(0.3);

  const sum = makeCard({
    title: '补丁 · f18f8ed2a9adc41（2013-01）',
    rows: [
      {k: '改动', v: '两处除数套 GET_MAX_PACKET（+3/−2）'},
      {k: '语义', v: 'wMaxPacketSize 掩去额外服务机会位再当包长'},
      {k: '数字例', v: '3060/1020=3 包 · 旧 5116 误得 1 · 正解 2'},
      {k: '沿革', v: '2013 函数后经 c840d6ce772d 统一为 xhci_td_remainder'},
      {k: '现行', v: '基线 d9008e061539 · xhci-ring.c L3501-3545（对读段）'},
    ],
    tint: C.hc,
    w: 880,
    rowSize: 19,
  });
  view.add(sum.node);
  yield* stage.say('除数掩码讲透——现行形态 xhci-ring.c L3501。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(850)));
  yield* waitFor(4.0);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});

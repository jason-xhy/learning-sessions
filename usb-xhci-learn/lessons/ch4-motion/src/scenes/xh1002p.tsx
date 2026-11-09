// §4.10.3 补丁分帧 —— usb: xhci: Handle bogus TRB pointers in Missed Service
// Error events（xh1002p）
// 判据（全部现场 `git -C /Volumes/KernelSrc/linux show 3d9eeb336131` 取原文；
// 面板行=diff 内容逐字，制表符按 2 空格显示）：
//  - commit 3d9eeb336131bc5a174367c384fa00c15c8744fd（短形 3d9eeb336131）
//    Michal Pecio <michal.pecio@gmail.com>, 2026-08-06,
//    drivers/usb/host/xhci-ring.c（18 行：+16/-2）
//  - message 关键句（原文逐字）：
//    "xHCI 1.0 allowed these pointers to be zero. Some Intel chipsets from the
//     era usually set it to zero, but sometimes (apparently) to the next TRB
//     after the one referenced by the previous transfer event on the endpoint."
//    "Usually that's indeed the missed TD, but it may also be the last TRB of
//     a two-TRB TD already completed with Short Packet on its first TRB. Then
//     the driver skips all pending TDs, failing to find a match."
//    "When handling Missed Service Error, scan TD list twice and only really
//     skip TDs in the second pass if the first pass found a match. This won't
//     catch bogus pointers to wrong TDs, but such a bug would be practically
//     impossible to detect automatically and isn't known to exist."
//  - 修复核心（diff 原文，xhci-ring.c）：新增静态辅助 find_td_by_dma（新
//    2600-2609，dma 非零则遍历 td_list 用 trb_in_td 找所属 TD，找不到返回
//    NULL）；handle_tx_event MSE 分支判据从「TRB 指针为 NULL」改为「指针
//    落不进任何 TD」（旧 2794-2795 删、新 2805-2809 增：zero（xHCI 1.0 允许）
//    或 bogus 一律 bail out 留 ep->skip，交给下一个事件收拾）
//  - 规范锚点 evidence/spec-410.txt（§4.10.3.2 MSE，p186 L833-838）："The TRB
//    Pointer field of Missed Service Error Transfer Event shall reference the TRB
//    that was missed and its TRB Transfer Length the residue data bytes in the
//    buffer. Since a Missed Service Error forces a Transfer Event, the Event's
//    TRB Pointer field may not reference a TRB that has its IOC flag set ('1')
//    within the skipped Isoch TD."——被跳 TD 内任意 TRB（含无 IOC 者）皆可为
//    指针落点；§4.10.3.1 pre-1.1 Note（p184 L751-752）"Pre-1.1 xHC
//    implementations clear the TRB Pointer field … to '0'."即"xHCI 1.0 时代
//    指针可为零"的规范出处——两行合读=指针可能零、可能指向被跳 TD 内任意
//    TRB，驱动不得只按字面位置信
//  - 基线现行形态：修复函数在 d9008e061539 演进为带 missed_tds 计数的
//    find_td_by_dma（xhci-ring.c L2632，对读段归 TrackB 落地页）
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
    section: '§4.10.3 补丁',
    zh: 'MSE 事件 bogus 指针',
    en: 'Handle bogus TRB pointers in Missed Service Error events',
    cite: '3d9eeb336131 · xhci-ring.c',
  });
  yield* lanesIn(stage);

  /* diff 面板（中带主位；行内容 = git show 3d9eeb336131 节选逐字，
     add=新行号 del=旧行号，制表符按 2 空格显示） */
  const panel: DiffPanelApi = makeDiffPanel(view, {
    x: 0, y: TLy(500), w: 1240, maxVisible: 5,
    title: 'drivers/usb/host/xhci-ring.c · commit 3d9eeb336131（节选：新增 find_td_by_dma + MSE 分支判据改写）',
    lines: [
      {no: '', code: '—— find_td_by_dma()（新 2600-2609，整块新增）——'},
      {no: '2600', code: '  static struct xhci_td *find_td_by_dma(struct xhci_ring *ep_ring, dma_addr_t dma)', kind: 'add'},
      {no: '2601', code: '  {', kind: 'add'},
      {no: '2602', code: '    struct xhci_td *td;', kind: 'add'},
      {no: '2603', code: '', kind: 'add'},
      {no: '2604', code: '    if (dma)', kind: 'add'},
      {no: '2605', code: '      list_for_each_entry(td, &ep_ring->td_list, td_list)', kind: 'add'},
      {no: '2606', code: '        if (trb_in_td(td, dma))', kind: 'add'},
      {no: '2607', code: '          return td;', kind: 'add'},
      {no: '2608', code: '    return NULL;', kind: 'add'},
      {no: '2609', code: '  }', kind: 'add'},
      {no: '', code: '—— handle_tx_event() MSE 分支（旧 2794-2795 删 → 新 2805-2809 增）——'},
      {no: '2794', code: '  /* If the TRB pointer is NULL, missed TDs will be skipped on the next event */', kind: 'del'},
      {no: '2795', code: '  if (trb_comp_code == COMP_MISSED_SERVICE_ERROR && !ep_trb_dma)', kind: 'del'},
      {no: '2805', code: '  /*', kind: 'add'},
      {no: '2806', code: '   * We don\'t know how many TDs were missed when ep_trb_dma is zero (as permitted by', kind: 'add'},
      {no: '2807', code: '   * xHCI 1.0) or bogus. Bail out leaving ep->skip set, next event will sort it out.', kind: 'add'},
      {no: '2808', code: '   */', kind: 'add'},
      {no: '2809', code: '  if (trb_comp_code == COMP_MISSED_SERVICE_ERROR && !find_td_by_dma(ep_ring, ep_trb_dma))', kind: 'add'},
    ],
  });

  /* ===== 幕① 背景：MSE 指针语义 + xHCI 1.0 允许零 ===== */
  panel.ref().opacity(1);
  yield* waitFor(0.4);
  yield* panel.highlight(0);
  const bgNote = makeNote(
    view,
    [
      '背景（message 原文+规范 p184/p186）：MSE 事件的 TRB Pointer 应指向',
      '被跳过的 TRB；xHCI 1.0 时代允许为零（pre-1.1 更是整体清零）——',
      '当年的 Intel 芯片组通常给零，偶尔却给「上一事件所指 TRB 的下一',
      '个」：多半恰是被 miss 的 TD，但也可能是已用 Short Packet 完成、',
      '双 TRB TD 的最后一个 TRB——一个 bogus 指针。',
    ],
    {x: TLx(700), y: TLy(265), w: 1100, tint: C.warn},
  );
  yield* stage.say('MSE 指针规范上可为零，老硬件还会给 bogus 值。', '① 冲突');
  bgNote().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.4);
  bgNote().opacity(0);
  yield* waitFor(0.25);

  /* ===== 幕② 问题：误信 bogus 指针跳光 pending TD ===== */
  yield* stage.say('旧判据只挡 NULL：bogus 指针一路跳光挂起 TD。', '② diff');
  yield* panel.highlight(12);
  yield* waitFor(0.25);
  yield* waitFor(2.4);
  const logicChip = makeChip(
    view,
    '旧判据只挡 NULL（非零即信）：bogus 指针恰指已完成 TD 的末 TRB 时，pending TD 被一口气 skip 却找不到匹配。',
    {x: TLx(960), y: TLy(200), w: 1720, tint: C.warn, size: 17},
  );
  logicChip().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.6);
  logicChip().opacity(0);
  yield* waitFor(0.25);

  /* ===== 幕③ 修复：双趟扫描，找不到即 bail ===== */
  yield* stage.say('修复：双趟扫描，首趟无匹配就不真跳。', '③ 收尾');
  yield* panel.highlight(1);
  yield* waitFor(0.25);
  yield* waitFor(2.4);
  yield* panel.highlight(18);
  yield* waitFor(0.25);
  yield* waitFor(2.6);
  const specChip = makeChip(
    view,
    '"The TRB Pointer field of Missed Service Error Transfer Event shall reference the TRB that was missed …"——§4.10.3.2 p186：指针合法落点=被跳 TD 内任意 TRB；首趟 find_td_by_dma 无匹配即视同零/bogus——bail out 留 ep->skip，下一事件定夺（scan twice, only really skip on first-pass match）。',
    {x: TLx(960), y: TLy(850), w: 1720, tint: C.hc, size: 15},
  );
  specChip().opacity(0.95);
  yield* flash(panel.ref, 1);
  yield* waitFor(0.3);
  yield* waitFor(4.2);
  specChip().opacity(0);
  yield* waitFor(0.3);

  const sum = makeCard({
    title: '补丁 · 3d9eeb336131（2026-08）',
    rows: [
      {k: '改动', v: 'MSE 分支判据：NULL → 落不进任何 TD'},
      {k: '新增', v: 'find_td_by_dma 双趟扫描辅助（+16）'},
      {k: '对齐', v: '指针可为零/任意被跳 TRB == 规范 p184/186'},
      {k: '堵漏', v: 'bogus 指针不再跳光 pending TD'},
    ],
    tint: C.hc,
    w: 880,
    rowSize: 20,
  });
  view.add(sum.node);
  yield* stage.say('指针不可字面轻信——基线现行形态 xhci-ring.c L2632。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(850)));
  yield* waitFor(4.0);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});

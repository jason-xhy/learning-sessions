// §4.6.10 补丁分帧 —— xhci: Fix hang on back-to-back Set TR Deq Ptr commands.
// 判据（全部现场 `git -C /Volumes/KernelSrc/linux show 0d9f78a92ef5` 取原文，
// 全文落 drafts/patch-48.txt，102 行；面板行=diff 内容逐字，制表符按 2 空格显示）：
//  - commit 0d9f78a92ef5e97d9fe51d9215ebe22f6f0d289d（短形 0d9f78a92ef5）
//    Sarah Sharp <sarah.a.sharp@linux.intel.com>, 2012-06-21,
//    drivers/usb/host/xhci-ring.c（1 文件 +11/-0，hunk @@ -885,6 +885,17 @@，
//    落 update_ring_for_set_deq_completion）；Cc: stable，回移至 3.4+
//  - message 关键句（原文逐字）：
//    "The Microsoft LifeChat 3000 USB headset was causing a very reproducible hang
//     whenever it was plugged in."
//    "xhci_hcd 0000:00:14.0: ERROR Transfer event TRB DMA ptr not part of current TD"
//    "if there are two ring segments, and a TD that ends just before a link TRB …
//     Once that command completed, update_ring_for_set_deq_completion would run again."
//    "The original code would unconditionally increment the software dequeue pointer,
//     which moved the pointer off the ring segment into la-la-land."
//    "Since the deq_seg and the dequeue pointer were out of sync, xhci_trb_virt_to_dma
//     would return NULL. The transfer event would get ignored, the transfer would
//     eventually timeout … the whole machine would hang."
//  - 修复核心（diff 原文）：while 循环前补 last_trb 检查——若软件出队指针停在
//    link TRB 上（上一轮停止恰好停在段尾），先把 deq_seg 前进一段、dequeue 回段首，
//    否则 while 无条件推进会把指针越出段外（la-la-land），deq_seg 与 dequeue 失同步
//  - 函数沿革（诚实注记）：update_ring_for_set_deq_completion 已于 2025-03-06 被
//    856563be98b2 "usb: xhci: remove redundant update_ring_for_set_deq_completion()
//    function" 移除——TRB 与段的出队指针此后直接保存于 queued_deq_seg /
//    queued_deq_ptr 字段，无需再搜；故本支无基线对读段（基线不含修复后形态），
//    分帧走读以 diff 原文为准
//  - 规范锚点 evidence/spec-46.txt（§4.6.10 执行语义，p126 L2197-2202）：
//    "Set the Dequeue Pointer to the value of the New TR Dequeue Pointer field …
//     Invalidate any xHC TDs that may be cached, forcing xHC to fetch Transfer TRBs
//     from memory when the pipe transitions from the Stopped to the Running state."——
//    修的正是「命令完成后软件侧出队指针簿记与硬件实际位置对齐」这一段
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
    section: '§4.6.10 补丁',
    zh: '背靠背换起点挂死',
    en: 'Fix hang on back-to-back Set TR Deq Ptr commands.',
    cite: '0d9f78a92ef5 · xhci-ring.c',
  });
  yield* lanesIn(stage);

  /* diff 面板（中带主位；行内容 = git show 0d9f78a92ef5 节选逐字） */
  const panel: DiffPanelApi = makeDiffPanel(view, {
    x: 0, y: TLy(500), w: 1240, maxVisible: 5,
    title: 'drivers/usb/host/xhci-ring.c · commit 0d9f78a92ef5（节选：link TRB 段尾守卫）',
    lines: [
      {no: '', code: '—— @@ -885,6 +885,17 @@（update_ring_for_set_deq_completion）——'},
      {no: '886', code: '  num_trbs_free_temp = ep_ring->num_trbs_free;'},
      {no: '887', code: '  dequeue_temp = ep_ring->dequeue;'},
      {no: '889', code: '  /* If we get two back-to-back stalls, and the first stalled transfer', kind: 'add'},
      {no: '890', code: '   * ends just before a link TRB, the dequeue pointer will be left on', kind: 'add'},
      {no: '891', code: '   * the link TRB by the code in the while loop.  So we have to update', kind: 'add'},
      {no: '892', code: '   * the dequeue pointer one segment further, or we\'ll jump off', kind: 'add'},
      {no: '893', code: '   * the segment into la-la-land.', kind: 'add'},
      {no: '894', code: '   */', kind: 'add'},
      {no: '895', code: '  if (last_trb(xhci, ep_ring, ep_ring->deq_seg, ep_ring->dequeue)) {', kind: 'add'},
      {no: '896', code: '    ep_ring->deq_seg = ep_ring->deq_seg->next;', kind: 'add'},
      {no: '897', code: '    ep_ring->dequeue = ep_ring->deq_seg->trbs;', kind: 'add'},
      {no: '898', code: '  }', kind: 'add'},
      {no: '901', code: '  while (ep_ring->dequeue != dev->eps[ep_index].queued_deq_ptr) {'},
    ],
  });

  /* ===== 幕① 背景+问题：耳机挂死与越段指针（8 行拆两段分时） ===== */
  panel.ref().opacity(1);
  yield* waitFor(0.4);
  yield* panel.highlight(9);
  const bgNoteA = makeNote(
    view,
    [
      '背景（message 原文）：Microsoft LifeChat 3000 耳机一插就稳定挂死，',
      '日志刷屏 "ERROR Transfer event TRB DMA ptr not part of current TD"。',
      '触发面：双段环 + TD 恰好结束在 link TRB 之前——第一次 stall 后 Set TR Deq',
      '把硬件出队指针停在 link TRB 上；紧接着又一次 stall、又一次 Set TR Deq。',
    ],
    {x: TLx(700), y: TLy(265), w: 1100, tint: C.warn},
  );
  yield* stage.say('背靠背换起点：软件指针一脚踩空。', '① 冲突');
  bgNoteA().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.2);
  bgNoteA().opacity(0);
  yield* waitFor(0.2);
  const bgNoteB = makeNote(
    view,
    [
      '后果链：update_ring_for_set_deq_completion 无条件推进软件指针——越出段外',
      '（la-la-land），deq_seg 与 dequeue 失同步 → virt_to_dma 返回 NULL →',
      '传输事件被忽略 → 超时转 No-Op → 中断上下文死循环 → 整机挂死。',
    ],
    {x: TLx(700), y: TLy(265), w: 1100, tint: C.warn},
  );
  bgNoteB().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  bgNoteB().opacity(0);
  yield* waitFor(0.25);

  /* ===== 幕② diff 走读：段尾守卫 ===== */
  yield* stage.say('修复：link TRB 段尾先跨段再找。', '② diff');
  yield* panel.highlight(11);
  yield* waitFor(0.25);
  yield* waitFor(2.6);
  yield* panel.highlight(13);
  yield* waitFor(0.25);
  yield* waitFor(2.6);
  const logicChip = makeChip(
    view,
    '守卫：软件指针停在段尾 link TRB 时先跨段回段首，再进 while——不再越段扫内存。',
    {x: TLx(960), y: TLy(200), w: 1720, tint: C.hc, size: 17},
  );
  logicChip().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(4.0);
  logicChip().opacity(0);
  yield* waitFor(0.25);

  /* ===== 幕③ 规范收尾 + 沿革注记 ===== */
  const specChip = makeChip(
    view,
    '"Set the Dequeue Pointer … Invalidate any xHC TDs that may be cached…"——§4.6.10 p126：补丁修的=软件簿记与硬件对齐；函数已由 856563be98b2 退役（queued_* 直存），判据=diff 原文。',
    {x: TLx(960), y: TLy(872), w: 1720, tint: C.hc, size: 16},
  );
  yield* stage.say('硬件职责之外，软件簿记也得跟得上。', '③ 收尾');
  specChip().opacity(0.95);
  yield* flash(panel.ref, 1);
  yield* waitFor(0.3);
  yield* waitFor(4.2);
  specChip().opacity(0);
  yield* waitFor(0.3);

  const sum = makeCard({
    title: '补丁 · 0d9f78a92ef5（2012-06）',
    rows: [
      {k: '改动', v: 'while 前补 last_trb 段尾守卫（+11）'},
      {k: '动作', v: '段尾先跨段、dequeue 回段首'},
      {k: '堵漏', v: '越段扫描/失同步/整机挂死'},
      {k: '沿革', v: '2025-03 函数退役（856563be98b2）'},
    ],
    tint: C.hc,
    w: 860,
    rowSize: 20,
  });
  view.add(sum.node);
  yield* stage.say('出队指针簿记与硬件对齐——挂死封死。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(850)));
  yield* waitFor(3.4);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});

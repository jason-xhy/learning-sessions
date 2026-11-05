// §4.1 补丁分帧 —— xhci: make sure TRB is fully written before giving it to the controller
// 判据（全部现场 `git -C /Volumes/KernelSrc/linux show 576667bad341` 取原文，禁凭记忆）：
//  - commit 576667bad341516edc4e18eb85acb0a2b4c9c9d9（注意：R3-SPEC 补丁清单里该 hash
//    末尾多写一个 'c'，真实完整 hash 以 git cat-file 为准=...c9c9d9；短形 576667bad341）
//    Mathias Nyman, 2021-01-15, drivers/usb/host/xhci-ring.c +2
//  - message 关键句（原文逐字）：
//    "If the driver just started writing the next command TRB to the ring when
//     hardware finished the previous TRB, then HW might fetch an incomplete TRB
//     as long as its cycle bit set correctly."
//    "A command TRB is 16 bytes (128 bits) long. Driver writes the command TRB
//     in four 32 bit chunks, with the chunk containing the cycle bit last.
//     This does however not guarantee that chunks actually get written in that order."
//    "Solution is to add a write memory barrier before writing the cycle bit."
//  - 症状（message 原文）："Mismatch between completed Set TR Deq Ptr command &
//    xHCI internal state"（stress testing canceling URBs, 两连 Set TR Dequeue）
//  - diff hunk @@ -2931,6 +2931,8 @@：+注释行 +wmb()，插在 field[3]（含 cycle 位）前
//  - 规范锚点 evidence/spec-41.txt（§4.1 p68 切片）："All xHC commands are issued by
//    placing the desired Command TRB(s) ... on the Command Ring, then ringing the
//    xHC command Doorbell register ..."（上环完成在先 → 门铃在后）
import {makeScene2D} from '@motion-canvas/2d';
import {Vector2, all, waitFor} from '@motion-canvas/core';
import {C, FONT, TLx, TLy} from '../lib/theme';
import {
  buildStage,
  lanesIn,
  makeCard,
  cardIn,
  makeChip,
  makeNote,
  makeDiffPanel,
  DiffPanelApi,
  StageApi,
} from '../lib/parts';

export default makeScene2D(function* (view) {
  view.fill(C.bg);

  /* ===== 舞台 ===== */
  const stage: StageApi = buildStage(view, {
    section: '§4.1 补丁',
    zh: 'TRB 写全再交',
    en: 'make sure TRB is fully written before doorbell',
    cite: '576667bad341 · xhci-ring.c',
  });
  yield* lanesIn(stage);

  /* diff 面板（中带主位；行内容 = git show 576667bad341 hunk 逐字，新文件行号） */
  const panel: DiffPanelApi = makeDiffPanel(view, {
    x: 0, y: TLy(500), w: 1240, maxVisible: 5,
    title: 'drivers/usb/host/xhci-ring.c · queue_trb() · commit 576667bad341（diff +2，新行号）',
    lines: [
      {no: '2931', code: '  trb->field[0] = cpu_to_le32(field1);'},
      {no: '2932', code: '  trb->field[1] = cpu_to_le32(field2);'},
      {no: '2933', code: '  trb->field[2] = cpu_to_le32(field3);'},
      {no: '2934', code: '  /* make sure TRB is fully written before giving it to the controller */', kind: 'add'},
      {no: '2935', code: '  wmb();', kind: 'add'},
      {no: '2936', code: '  trb->field[3] = cpu_to_le32(field4);'},
      {no: '2937', code: ''},
      {no: '2938', code: '  trace_xhci_queue_trb(ring, trb);'},
    ],
  });

  /* 工作位：驱动泳道注记（上）/ 设备泳道规范卡（下） */
  const bgNote = makeNote(
    view,
    [
      '现场（commit message 原文）：stress testing，',
      '多设备并发 + canceling URBs；',
      '两条 Set TR Dequeue 命令背靠背排队。',
    ],
    {x: TLx(1300), y: TLy(290), w: 900, tint: C.driver},
  );

  /* ===== 幕① 背景现场 ===== */
  yield* panel.ref().opacity(1, 0.5);
  yield* panel.highlight(0);
  yield* stage.say(
    '2021 年 1 月压测现场：多设备并发 + 取消 URB，两条 Set TR Dequeue 背靠背排队。',
    '① 背景',
  );
  yield* bgNote().opacity(0.85, 0.4);
  yield* waitFor(9.0); // pace R3: 拍#2 9.7s→10.1s（阈值9.9）
  const errChip = makeChip(
    view,
    '日志刷屏："Mismatch between completed Set TR Deq Ptr command & xHCI internal state"——出环指针被设成乱值。',
    {x: TLx(960), y: TLy(850), w: 1300, tint: C.warn, size: 19},
  );
  yield* stage.say(
    '症状：日志反复刷同一条报错——出环指针被设成乱值（报错原文见下方卡）。',
    '① 背景',
  );
  yield* errChip().opacity(0.95, 0.3);
  yield* waitFor(10.4);
  yield* errChip().opacity(0, 0.3);

  /* ===== 幕② 补丁前错误行为 ===== */
  yield* stage.say(
    '根因在 queue_trb()：TRB 16 字节拆 4 个 32 位块分 4 次 store——块间无顺序保证。',
    '② 根因',
  );
  yield* panel.highlight(5);
  yield* waitFor(9.2);
  const raceChip = makeChip(
    view,
    '4 次 store 乱序到达：含 cycle 位的 field[3] 可能先于 field[0..2] 全局可见（message 原文）。',
    {x: TLx(960), y: TLy(850), w: 1300, tint: C.warn, size: 19},
  );
  yield* stage.say(
    '硬件不等人：前一颗命令一完成，xHC 立刻扫环——只要 cycle 位对，写到一半的 TRB 也照取。',
    '② 根因',
  );
  yield* raceChip().opacity(0.95, 0.3);
  yield* waitFor(7.2);
  yield* raceChip().opacity(0, 0.3);
  yield* stage.say(
    '后果：第二条命令只写了一半就被取走，出环指针指向乱值——压测日志刷屏。',
    '② 根因',
  );
  yield* waitFor(6.8); // pace R3: 拍#6 6.9s→7.5s（阈值7.4）

  /* ===== 幕③ diff 逐行走读 ===== */
  yield* stage.say(
    '补丁只加两行：注释一行，wmb() 写内存屏障一行——插在 cycle 位所在的 field[3] 之前。',
    '③ diff',
  );
  yield* panel.highlight(3);
  yield* panel.highlight(4);
  yield* waitFor(7.4);
  yield* stage.say(
    '走读：field[0..2] 照常写；wmb() 定序；field[3] 翻 cycle 位——翻开即交付。',
    '③ diff',
  );
  yield* panel.highlight(0);
  yield* panel.highlight(1);
  yield* panel.highlight(2);
  yield* panel.highlight(5);
  yield* waitFor(8.4);

  /* ===== 幕④ 补丁后行为 + 规范收尾 ===== */
  const specChip = makeChip(
    view,
    '"All xHC commands are issued by placing the desired Command TRB(s) on the Command Ring, then ringing the xHC command Doorbell register"——§4.1 p68',
    {x: TLx(960), y: TLy(850), w: 1680, tint: C.hc, size: 18},
  );
  yield* stage.say(
    '规范锚点（§4.1 p68）：命令=先把命令 TRB 放上命令环，再敲命令门铃——上环完成在先，门铃在后。',
    '④ 收尾',
  );
  yield* specChip().opacity(0.95, 0.3);
  yield* waitFor(7.9);
  yield* specChip().opacity(0, 0.3);

  const sum = makeCard({
    title: '补丁 · 576667bad341（2021-01）',
    rows: [
      {k: '改动', v: 'cycle 位前 +wmb()'},
      {k: '效果', v: 'doorbell 响时 TRB 必定完整'},
      {k: '机制', v: '写内存屏障定序 4×store'},
    ],
    tint: C.hc,
    w: 700,
    rowSize: 22,
  });
  view.add(sum.node);
  yield* stage.say(
    'wmb() 把"TRB 已完整落内存"钉在 cycle 位翻转之前——门铃节拍从此可信（576667bad341）。',
    '完',
  );
  yield* cardIn(sum, new Vector2(TLx(960), TLy(850)));
  yield* waitFor(9.2);
  yield* all(sum.ref().opacity(0, 0.5), stage.caption().opacity(0, 0.5));
});

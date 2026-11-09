// §4.11.2.5 补丁分帧 —— xhci: fix frame id calculation and checks for isoc
// URBs（xh1102ep）
// 判据（全部现场 `git -C /Volumes/KernelSrc/linux show add8469b3e0031a2e` 取原文；
// 面板行=diff 内容逐字，制表符按 2 空格显示；182 行重构挑代表 hunk 走读）：
//  - commit add8469b3e0031a2e0243dd0d18c555cac8b7eea（短形 add8469b3e0031a2e）
//    Mathias Nyman <mathias.nyman@linux.intel.com>, 2026-08-06,
//    drivers/usb/host/xhci-ring.c 182 行重构 + xhci-mem.c + xhci.h
//    （86 insertions / 104 deletions；基线 d9008e061539 已含修复后形态）
//  - message 关键句（原文逐字）：
//    "Check if the expected frame IDs for a isochronous URB submitted
//     mid stream is within the valid frame time window that xHC controller
//     is capable of queuing TDs."
//    "The range only needs to be checked once per URB as the isoc TDs of an
//     URB are queued in one go with spinlock held and interrupts disabled."
//    "Calculate the valid frame window start and end frame id in frames
//     instead of microframes to better match how xhci specification
//     section 4.11.2.5 does it."
//    "Don't add frame id gaps or change scheduling to SIA mid stream if
//     the start frame is outside the valid frame winow. Only print a debug
//     message. Some devices can't handle gaps in isochronous transfers."
//    （"winow" 为 message 原文拼写）
//    "Calculate a valid start frame for the first URB of a stream, and
//     align it to a full frame, or to interval start if interval is longer
//     than a frame" / "Set urb->start_frame value for every URB"
//  - 修复核心（diff 原文，xhci-ring.c 主 hunk @@ -3956,80 +3956,77 @@）：
//    旧 xhci_get_isoc_frame_id（删）——微帧口径算窗（旧 3993 roundup /
//    旧 3994 rounddown 到微帧 8 倍数再折帧）+ 越窗 -EINVAL 告警（旧 4028
//    "Ignore frame ID field, use SIA bit instead"）→ 新
//    xhci_frame_in_range + xhci_get_isoc_start_frame（增）——MFINDEX_TO_FRAME
//    按帧取窗（新 4001-4003：win_start=(curr_frame+DIV_ROUND_UP_POW2(ist,8)
//    +1)%MAX_FRAMES、win_end=(curr_frame+895)%MAX_FRAMES）、越窗仅
//    xhci_dbg（新 4019/4023 "Ill-timed isoc URB"）；xhci.h 增宏
//    MFINDEX_TO_FRAME/MAX_FRAMES=2048/MAX_UFRAMES（新 294-296）
//  - 规范锚 evidence/spec-411.txt（§4.11.2.5 p199，L555-576）："The Frame ID
//    field of the Isoch TRB … End Frame ID = (Current MFINDEX register
//    value + 895 ms.) MOD 2048 … Start Frame ID = (Current MFINDEX
//    register value + IST + 1) MOD 2048"——合法窗以帧为口径；.5.1 有效窗
//    判跳过/执行（L563-569）
//  - 对读段：基线现行形态=xhci_get_isoc_start_frame（xhci-ring.c L4015-4073，
//    d9008e061539，landing 已挂）
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
    section: '§4.11.2.5 补丁',
    zh: '等时 Frame ID 窗口径',
    en: 'fix frame id calculation and checks for isoc URBs',
    cite: 'add8469b3e0031a2e · xhci-ring.c/xhci.h',
  });
  yield* lanesIn(stage);

  /* diff 面板（中带主位；行内容 = git show add8469b3e0031a2e 节选逐字，
     add=新行号 del=旧行号，制表符按 2 空格显示，\n 为源码字面） */
  const panel: DiffPanelApi = makeDiffPanel(view, {
    x: 0, y: TLy(500), w: 1240, maxVisible: 5,
    title: 'drivers/usb/host/xhci-ring.c + xhci.h · commit add8469b3e0031a2e（节选：182 行重构代表行）',
    lines: [
      {no: '', code: '—— 旧 xhci_get_isoc_frame_id()：微帧算窗+越窗拒收改 SIA（删）——'},
      {no: '3983', code: '   * End Frame ID = (Current MFINDEX register value + 895 ms.) MOD 2048', kind: 'del'},
      {no: '3984', code: '   * Start Frame ID = (Current MFINDEX register value + IST + 1) MOD 2048', kind: 'del'},
      {no: '3993', code: '  start_frame_id = roundup(current_frame_id + ist + 1, 8);', kind: 'del'},
      {no: '3994', code: '  end_frame_id = rounddown(current_frame_id + 895 * 8, 8);', kind: 'del'},
      {no: '4028', code: '    xhci_warn(xhci, "Ignore frame ID field, use SIA bit instead\\n");', kind: 'del'},
      {no: '', code: '—— 新 xhci_get_isoc_start_frame()：帧算窗+越窗仅 debug（增）——'},
      {no: '4001', code: '  curr_frame = MFINDEX_TO_FRAME(mfindex);', kind: 'add'},
      {no: '4002', code: '  win_start = (curr_frame + DIV_ROUND_UP_POW2(ist, 8) + 1) % MAX_FRAMES;', kind: 'add'},
      {no: '4003', code: '  win_end = (curr_frame + 895) % MAX_FRAMES;', kind: 'add'},
      {no: '4019', code: '      xhci_dbg(xhci, "Ill-timed isoc URB %p for start frame %d, range %d-%d\\n",', kind: 'add'},
      {no: '', code: '—— xhci.h：帧换算宏（增）——'},
      {no: '294', code: '#define MFINDEX_TO_FRAME(p)  (((p) >> 3) & 0x7ff)', kind: 'add'},
      {no: '295', code: '#define MAX_FRAMES    2048', kind: 'add'},
    ],
  });

  /* ===== 幕① 背景：Frame ID 合法窗（帧口径） ===== */
  panel.ref().opacity(1);
  yield* waitFor(0.4);
  yield* panel.highlight(1);
  const bgNote = makeNote(
    view,
    [
      '背景（§4.11.2.5 p199）：Frame ID 合法窗按帧——End=(MFINDEX+895ms)',
      'MOD 2048、Start=(MFINDEX+IST+1) MOD 2048；窗口内外决定 TD 跳过',
      '还是执行（.5.1 有效帧窗）——软件投递等时 URB 须落窗内。',
    ],
    {x: TLx(700), y: TLy(265), w: 1100, tint: C.warn},
  );
  yield* stage.say('合法窗按帧定义——这是规范 §4.11.2.5 的口径。', '① 冲突');
  bgNote().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.0);
  bgNote().opacity(0);
  yield* waitFor(0.25);

  /* ===== 幕② 问题：微帧算窗+越窗改 SIA 伤设备 ===== */
  yield* stage.say('旧码微帧算窗；越窗拒收改投 SIA——设备受伤。', '② diff');
  yield* panel.highlight(5);
  yield* waitFor(0.25);
  yield* waitFor(1.6);
  const logicChip = makeChip(
    view,
    '越窗即 -EINVAL 拒收并中途改投 SIA、留下 frame id gap——部分等时设备承受不了间隙。',
    {x: TLx(960), y: TLy(200), w: 1720, tint: C.warn, size: 17},
  );
  const exNote = makeNote(
    view,
    [
      'message 原文："Don\'t add frame id gaps or change scheduling to SIA',
      'mid stream if the start frame is outside the valid frame winow.',
      'Only print a debug message. Some devices can\'t handle gaps in',
      'isochronous transfers."（"winow" 为原文拼写）',
    ],
    {x: TLx(700), y: TLy(265), w: 1100, tint: C.warn},
  );
  logicChip().opacity(0.95);
  exNote().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.4);
  logicChip().opacity(0);
  exNote().opacity(0);
  yield* waitFor(0.25);

  /* ===== 幕③ 修复：帧算窗+每 URB 一验+越窗仅 debug ===== */
  yield* stage.say('修复：按帧算窗，越窗只 debug，首 URB 对齐整帧。', '③ 收尾');
  yield* panel.highlight(8);
  yield* waitFor(0.25);
  yield* waitFor(1.8);
  yield* panel.highlight(9);
  yield* waitFor(0.25);
  yield* waitFor(1.8);
  const specChip = makeChip(
    view,
    '"Calculate the valid frame window start and end frame id in frames instead of microframes to better match how xhci specification section 4.11.2.5 does it."（message 原文逐字）——每 URB 一次范围校验（自旋锁+关中断一次入队）；首 URB 对齐整帧或 interval 起点。',
    {x: TLx(960), y: TLy(850), w: 1720, tint: C.hc, size: 15},
  );
  specChip().opacity(0.95);
  yield* flash(panel.ref, 1);
  yield* waitFor(0.3);
  yield* waitFor(4.2);
  specChip().opacity(0);
  yield* waitFor(0.3);

  const sum = makeCard({
    title: '补丁 · add8469b3e0031a2e（2026-08）',
    rows: [
      {k: '重构', v: 'xhci_get_isoc_frame_id 删 → xhci_get_isoc_start_frame'},
      {k: '口径', v: '微帧算窗 → 帧算窗（MFINDEX_TO_FRAME，§4.11.2.5）'},
      {k: '行为', v: '越窗仅 debug · 不加 gap 不切 SIA · 每 URB 一验'},
      {k: '首 URB', v: '对齐整帧；interval 超帧则对齐 interval 起点'},
      {k: '现行', v: '基线已含修复形态 xhci-ring.c L4015-4073（对读段）'},
    ],
    tint: C.hc,
    w: 880,
    rowSize: 19,
  });
  view.add(sum.node);
  yield* stage.say('窗口径对齐规范——现行形态 xhci-ring.c L4015。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(850)));
  yield* waitFor(4.0);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});

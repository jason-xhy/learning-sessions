// §4.8.3 补丁分帧 —— xhci: Fix incorrect EP_STATE_MASK
// 判据（全部现场 `git -C /Volumes/KernelSrc/linux show dceea67058fe` 取原文，
// 面板行=diff 内容逐字，制表符按 2 空格显示；基线 d9008e061539 行号亲核）：
//  - commit dceea67058fe22075db3aed62d5cb62092be5053（短形 dceea67058fe）
//    Mathias Nyman <mathias.nyman@linux.intel.com>, 2020-06-24,
//    drivers/usb/host/xhci.h（2 行：+1/-1）· Cc: stable
//  - message 关键句（原文逐字）：
//    "EP_STATE_MASK should be 0x7 instead of 0xf
//     xhci spec 6.2.3 shows that the EP state field in the endpoint context data
//     structure consist of bits [2:0].
//     The old value included a bit from the next field which fortunately is a
//      RsvdZ region. So hopefully this hasn't caused too much harm"
//  - 修复核心（diff 原文，xhci.h @@ -716,7 +716,7 @@）：
//    `#define EP_STATE_MASK (0xf)` → `#define EP_STATE_MASK (0x7)`
//    ——0xf（b1111）多罩 bit 3，属 EP State 域（bits[2:0]）之外的邻域位；
//    该位按域布局为 RsvdZ（恒 0），故旧值「幸而无害」。掩码消费者=
//    GET_EP_CTX_STATE(ctx)（基线 L462），从 ep_ctx->ep_info 提取 EP State。
//    对读段=xhci.h L448-L462（注释头域布局+五态 defines+提取宏，基线即含此补丁）
//  - 规范锚点 evidence/spec-48.txt（§4.8.3，p146 L161-L168）：
//    "The current state of an Endpoint Context is identified by its respective
//     Endpoint State (EP State) field. Figure 4-5 defines the Endpoint States."
//    Figure 4-5 五态=Running/Halted/Stopped/Error/Disabled（L164-L168）——
//    五个状态值 0-4 恰好填进三位域 bits[2:0]（5-7 保留）；位宽权威=spec 6.2.3
//    （第 6 章数据结构域布局，出本章界——R12-SPEC §0 章界口径，注记不展开）
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
    section: '§4.8.3 补丁',
    zh: 'EP 状态掩码勘正',
    en: 'Fix incorrect EP_STATE_MASK',
    cite: 'dceea67058fe · xhci.h',
  });
  yield* lanesIn(stage);

  /* diff 面板（中带主位；diff 行=git show dceea67058fe 逐字（2020 年时行号 L719），
     上下文行=基线 d9008e061539 xhci.h L448-L462 域布局注释头与 defines */
  const panel: DiffPanelApi = makeDiffPanel(view, {
    x: 0, y: TLy(500), w: 1240, maxVisible: 5,
    title: 'drivers/usb/host/xhci.h · commit dceea67058fe（+1/-1：掩码 0xf→0x7）',
    lines: [
      {no: '', code: '—— xhci.h EP 状态域注释头（基线 L448-L455 · 域布局即判据）——'},
      {no: '448', code: ' * Endpoint State - bits 0:2'},
      {no: '449', code: ' * 0 - disabled'},
      {no: '450', code: ' * 1 - running'},
      {no: '451', code: ' * 2 - halted due to halt condition - ok to manipulate endpoint ring'},
      {no: '452', code: ' * 3 - stopped'},
      {no: '453', code: ' * 4 - TRB error'},
      {no: '454', code: ' * 5-7 - reserved'},
      {no: '', code: '—— diff（commit dceea67058fe，2020 年时行号 L719）——'},
      {no: '719', code: '#define EP_STATE_MASK    (0xf)', kind: 'del'},
      {no: '719', code: '#define EP_STATE_MASK    (0x7)', kind: 'add'},
      {no: '', code: '—— 五态 defines（基线 L457-L461）与提取宏（L462）——'},
      {no: '457', code: '#define EP_STATE_DISABLED  0'},
      {no: '462', code: '#define GET_EP_CTX_STATE(ctx)  (le32_to_cpu((ctx)->ep_info) & EP_STATE_MASK)'},
    ],
  });

  /* ===== 幕① 背景+问题：掩码多罩一位 ===== */
  panel.ref().opacity(1);
  yield* waitFor(0.4);
  yield* panel.highlight(0);
  const bgNote = makeNote(
    view,
    [
      '背景（message 原文）：EP_STATE_MASK 用来从端点上下文提取 EP State',
      '（GET_EP_CTX_STATE，L462）；旧值 0xf=b1111 把 bit 3 也罩进来——',
      '但该位属 EP State 域（bits[2:0]）之外的邻域位，按域布局是 RsvdZ',
      '（恒 0）——"hopefully this hasn\'t caused too much harm"。',
    ],
    {x: TLx(700), y: TLy(265), w: 1100, tint: C.warn},
  );
  yield* stage.say('掩码比域宽了一位。', '① 冲突');
  bgNote().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.6);
  bgNote().opacity(0);
  yield* waitFor(0.25);

  /* ===== 幕② diff 走读：0xf→0x7 ===== */
  yield* stage.say('修复：掩码收缩到 bits[2:0]。', '② diff');
  yield* panel.highlight(1);
  yield* waitFor(0.25);
  yield* waitFor(2.4);
  yield* panel.highlight(9);
  yield* waitFor(0.25);
  yield* waitFor(2.4);
  const logicChip = makeChip(
    view,
    '一行勘正 0xf→0x7：b0111 恰罩 bits[2:0]；五态 0-4（Disabled/Running/Halted/Stopped/Error）+5-7 保留——注释头 L448「Endpoint State - bits 0:2」与 L454「5-7 reserved」正是域宽双证。',
    {x: TLx(960), y: TLy(200), w: 1720, tint: C.hc, size: 17},
  );
  logicChip().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(4.0);
  logicChip().opacity(0);
  yield* waitFor(0.25);

  /* ===== 幕③ 规范收尾 ===== */
  const specChip = makeChip(
    view,
    '"The current state of an Endpoint Context is identified by its respective Endpoint State (EP State) field. Figure 4-5 defines the Endpoint States."——§4.8.3 p146 L161-162；Figure 4-5 五态（L164-168：Running/Halted/Stopped/Error/Disabled）恰好填满三位域。位宽权威=spec 6.2.3 域布局（第 6 章，出本章界）。',
    {x: TLx(960), y: TLy(850), w: 1720, tint: C.hc, size: 16},
  );
  yield* stage.say('五态住三位——掩码与域布局对齐。', '③ 收尾');
  specChip().opacity(0.95);
  yield* flash(panel.ref, 1);
  yield* waitFor(0.3);
  yield* waitFor(4.2);
  specChip().opacity(0);
  yield* waitFor(0.3);

  const sum = makeCard({
    title: '补丁 · dceea67058fe（2020-06）',
    rows: [
      {k: '改动', v: 'EP_STATE_MASK 0xf→0x7（+1/-1）'},
      {k: '判据', v: 'EP State 域=bits[2:0]（注释头双证）'},
      {k: '对齐', v: '§4.8.3 五态恰填三位域'},
      {k: '实害', v: '多罩位=RsvdZ 恒 0（幸而无害）'},
    ],
    tint: C.hc,
    w: 860,
    rowSize: 20,
  });
  view.add(sum.node);
  yield* stage.say('掩码与状态域对齐。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(850)));
  yield* waitFor(3.4);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});

// §4.8.1 Endpoint Addressing 端点编址 —— xHCI 1.2b p144（R12 批 A）
// 判据（evidence/spec-48.txt，判据唯一事实源）：
//  - "A USB device supports up to 31 endpoints (EPs): for example,15 IN, 15 OUT,
//    and 1 Control. The Default Control EP (0) is a bidirectional EP defined for
//    all USB devices."                                    (L1-5, p143；4.8 节引言)
//  - "An Endpoint Address defined by a USB Endpoint Descriptor allows up to 31
//    possible values, where a 4-bit Endpoint Number is combined with a Direction
//    bit (refer to section 9.6.6 in the USB2 spec)."      (L41-45, p144)
//  - "The xHCI parallels this organization by using the Endpoint Number to select
//    one of 16 Endpoint Context data structure pairs, and the Direction bit to
//    select the IN or OUT Endpoint Context of a pair. Refer to Figure 4-4…"
//                                                                    (L43-46, p144)
//  - Figure 4-4（L14-39）：Slot Context + EP Context 0 BiDir（Direction=N/A）→
//    DCI 0；EP Context 1 OUT/IN → DCI 1/2；…；EP Context 15 OUT/IN
//  - 控制端点特例："per the USB specification, the Direction bit is "ignored" when
//    calculating its Endpoint Address…the xHC shall use the IN (odd) Endpoint
//    Context of the pair to manage bidirectional endpoints." (L47-53, p144)
//  - "For all Endpoint Numbers greater than 0, the xHC shall ignore the OUT (even)
//    Endpoint Context of the pair of any endpoint that declares itself as a
//    bidirectional. Software shall use the IN (odd) Endpoint Context of a pair for
//    managing a Control Endpoint."                        (L58-61, p144)
//  - 附加控制端点："The USB specification allows a device to define additional
//    Control (bidirectional) endpoints, beyond the Default Control Endpoint (EP 0)…
//    the xHCI is capable of supporting additional Control endpoints."
//                                                                    (L54-57, p144)
import {makeScene2D, Rect, Txt} from '@motion-canvas/2d';
import {createRef, Vector2, waitFor} from '@motion-canvas/core';
import {C, FONT, TLx, TLy} from '../lib/theme';
import {
  buildStage,
  lanesIn,
  makeCard,
  cardIn,
  makeChip,
  makeNote,
  makeCellStrip,
  flash,
  CardApi,
  StageApi,
  CellStripApi,
} from '../lib/parts';

type AnyRef = {(): any};

export default makeScene2D(function* (view) {
  view.fill(C.bg);

  /* ===== 片头 ===== */
  const t1 = createRef<Txt>();
  const t2 = createRef<Txt>();
  const t3 = createRef<Txt>();
  view.add(
    <>
      <Txt ref={t1} text={'§4.8.1'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Endpoint Addressing'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={82} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'端点编址 · xHCI 规范第 4 章 · p143–144'}
        x={0} y={TLy(610)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
    </>,
  );
  t1().opacity(1);
  t2().opacity(1);
  yield* waitFor(0.35);
  t3().opacity(1);
  yield* waitFor(0.35);
  yield* waitFor(1.0);
  t1().opacity(0);
  t2().opacity(0);
  t3().opacity(0);
  yield* waitFor(0.3);
  t1().remove(); t2().remove(); t3().remove();

  /* ===== 舞台 ===== */
  const stage: StageApi = buildStage(view, {
    section: '§4.8.1',
    zh: 'Endpoint Addressing',
    en: 'Endpoint Context Addressing · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.8.1 p144',
  });
  yield* lanesIn(stage);

  /* Device Context 结构条（图 4-4 语义重建：Slot + DCI 0..5 抽样） */
  const dci: CellStripApi = makeCellStrip(view, {
    x: TLx(240), y: TLy(552), n: 7, w: 118, h: 60, tint: C.hc,
    labels: ['Slot', 'DCI 0', 'DCI 1', 'DCI 2', 'DCI 3', 'DCI 4', '…'],
  });
  const dTitle = makeChip(
    view,
    'Device Context · Slot Context + 端点上下文对（图 4-4 抽样）',
    {x: TLx(560), y: TLy(606), w: 640, tint: C.hc, size: 15},
  );
  dci.group().opacity(1);
  dTitle().opacity(0.9);
  dci.value[0]().text('槽上下文');
  dci.value[1]().text('EP0 BiDir');
  dci.value[2]().text('EP1 OUT');
  dci.value[3]().text('EP1 IN');
  dci.value[4]().text('EP2 OUT');
  dci.value[5]().text('EP2 IN');
  yield* waitFor(0.25);

  /* ===== ① 31 端点上限 ===== */
  const q1 = makeChip(
    view,
    '"A USB device supports up to 31 endpoints (EPs): for example,15 IN, 15 OUT, and 1 Control. The Default Control EP (0) is a bidirectional EP defined for all USB devices." — §4.8 p143',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.dev, size: 18},
  );
  yield* stage.say('一台设备最多 31 个端点：15 进 15 出加一个控制。', '① / 5');
  q1().opacity(0.95);
  yield* flash(dci.group, 1);
  yield* waitFor(0.3);
  yield* waitFor(3.8);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② USB 地址构成 ===== */
  const q2 = makeChip(
    view,
    '"An Endpoint Address defined by a USB Endpoint Descriptor allows up to 31 possible values, where a 4-bit Endpoint Number is combined with a Direction bit (refer to section 9.6.6 in the USB2 spec)." — §4.8.1 p144',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 18},
  );
  yield* stage.say('USB 地址=4 位端点号加 1 位方向，最多 31 个值。', '② / 5');
  q2().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(4.0);
  q2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ xHCI 映射：号选对、方向选半 ===== */
  const q3 = makeChip(
    view,
    '"The xHCI parallels this organization by using the Endpoint Number to select one of 16 Endpoint Context data structure pairs, and the Direction bit to select the IN or OUT Endpoint Context of a pair." — §4.8.1 p144',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.hc, size: 18},
  );
  yield* stage.say('xHCI 同构映射：端点号选 16 对之一，方向位选对内一半。', '③ / 5');
  q3().opacity(0.95);
  yield* flash(dci.cell[2], 1);
  yield* flash(dci.cell[3], 1);
  yield* waitFor(0.3);
  yield* waitFor(4.2);
  q3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ 控制端点特例：方向位忽略、用 IN（奇） ===== */
  const q4 = makeChip(
    view,
    '"A Control endpoint…is a bidirectional endpoint and, per the USB specification, the Direction bit is "ignored" when calculating its Endpoint Address…the xHC shall use the IN (odd) Endpoint Context of the pair to manage bidirectional endpoints." — §4.8.1 p144',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.warn, size: 17},
  );
  yield* stage.say('控制端点例外：方向位忽略，落座在 IN（奇）格。', '④ / 5');
  q4().opacity(0.95);
  yield* flash(dci.cell[1], 2);
  yield* waitFor(0.3);
  yield* waitFor(4.4);
  q4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ 附加控制端点 ===== */
  const n5 = makeNote(
    view,
    [
      'USB 允许 EP0 之外再声明控制（双向）端点（L54-57）——',
      'xHCI 按同一规则容纳。EP 号大于 0 且声明双向的端点：',
      'xHC 忽略该对的 OUT（偶）上下文（L58-61）；',
      '软件一律用 IN（奇）上下文管理控制端点。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver},
  );
  yield* stage.say('更多控制端点也照此办理：偶格弃用，奇格当家。', '⑤ / 5');
  n5().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.6);
  n5().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.8.1 Endpoint Addressing',
    rows: [
      {k: 'USB 地址', v: '4 位端点号 + 方向位 ≤31 值'},
      {k: 'xHCI 映射', v: '号选 16 对 · 方向选 IN/OUT'},
      {k: 'EP0', v: '双向 · DCI 0 · 方向位忽略'},
      {k: '双向端点', v: '一律用 IN（奇）上下文'},
      {k: '下一支', v: '§4.8.2 Context Initialization'},
    ],
    tint: C.hc,
    w: 940,
    rowSize: 20,
  });
  view.add(sum.node);
  dci.group().opacity(0);
  dTitle().opacity(0);
  yield* stage.say('地址怎么翻译成上下文——下一支：字段怎么填。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.4);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});

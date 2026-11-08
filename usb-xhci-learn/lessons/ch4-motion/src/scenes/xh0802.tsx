// §4.8.2 Endpoint Context Initialization 端点上下文初始化 —— xHCI 1.2b p144-146（R12 批 A）
// 判据（evidence/spec-48.txt，判据唯一事实源）：
//  - 全 0 基线："All fields of an Input Endpoint Context data structure (including
//    the Reserved fields) shall be initialized to '0' with the following
//    exceptions:"                                                    (L64-65, p144)
//  - 4.8.2.1 EP0（L72-87, p145）：EP Type=Control（Table 6-9）；Max Packet Size=
//    Device Descriptor:bMaxPacketSize0（USB2）/2bMaxPacketSize0（USB3），
//    "May be set to Default Endpoint Max Packet Size until USB Device Descriptor
//    is retrieved. An Evaluate Endpoint Command shall be used to modify the value
//    of Max Packet Size when the device slot is in the Addressed state."；CErr=3
//    （3 retries）；TR Dequeue Pointer=已分配传输环首段起址；DCS=1（假定环内 TRB
//    全清 0，该字段反映软件所写有效 TRB 的 Cycle 位态）
//  - 4.8.2.2 一般控制端点（L88-91, p145）：同 EP0，唯一差异
//    "Max Packet Size shall be set to the value of the associated Endpoint
//    Descriptor:wMaxPacketSize."
//  - 4.8.2.3 Bulk（L92-129, p145）：EP Type=Bulk IN/OUT；Max Packet Size=
//    Endpoint Descriptor:wMaxPacketSize；Max Burst Size=USB3 companion:bMaxBurst/
//    USB2 '0'；CErr=3；Streams 启用（companion bmAttributes MaxStreams>0）→
//    分配清零 Primary Stream Array + MaxPStreams=数组尺寸 + TR Dequeue Pointer=
//    数组起址 + HID/LSA 按需；否则 MaxPStreams='0' + TR Dequeue Pointer=环首址；
//    DCS=1；"The Endpoint Context Dequeue Cycle State (DCS) field is not
//    applicable if the Streams are enabled."                (L128-129, p145)
//  - 4.8.2.4 Isoch/Interrupt（L130-158, p145-146）：EP Type=四者之一（Table 6-9）；
//    Max Packet Size=wMaxPacketSize & 07FFh；Max Burst Size=companion:bMaxBurst 或
//    (wMaxPacketSize & 1800h) >> 11；Mult=companion Mult（Interrupt 恒 '0'）；
//    CErr=3（Interrupt）/0（Isoch，"Retries are not performed for Isoch
//    endpoints."）；TR Dequeue Pointer=环首址；DCS=1；Max ESIT Payload → §4.14.2
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
  flash,
  CardApi,
  StageApi,
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
      <Txt ref={t1} text={'§4.8.2'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Endpoint Context 初始化'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={78} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'Endpoint Context Initialization · xHCI 规范第 4 章 · p144–146'}
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
    section: '§4.8.2',
    zh: 'Endpoint Context 初始化',
    en: 'Endpoint Context Initialization · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.8.2 p144–146',
  });
  yield* lanesIn(stage);

  /* Input EP Context 字段卡（左带常驻主角；右侧 chip/note 全部走 x≥780 带） */
  const fld: CardApi = makeCard({
    title: 'Input EP Context',
    rows: [
      {k: 'EP Type', v: '——'},
      {k: 'Max Packet Size', v: '——'},
      {k: 'Max Burst / Mult', v: '——'},
      {k: 'CErr', v: '——'},
      {k: 'TR Dequeue Pointer', v: '——'},
      {k: 'DCS', v: '——'},
      {k: '其余全部+Reserved', v: '清 \'0\''},
    ],
    tint: C.driver,
    w: 440,
    rowSize: 18,
  });
  view.add(fld.node);
  fld.ref().position(new Vector2(TLx(480), TLy(275)));

  /* ===== ① 全 0 基线 ===== */
  const q1 = makeChip(
    view,
    '"All fields of an Input Endpoint Context data structure (including the Reserved fields) shall be initialized to \'0\' with the following exceptions." — §4.8.2 p144',
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver, size: 17},
  );
  yield* stage.say('先立规矩：Input 端点上下文全字段清 0，例外如下。', '① / 6');
  fld.ref().opacity(1);
  q1().opacity(0.95);
  yield* flash(fld.ref, 1);
  yield* waitFor(0.3);
  yield* waitFor(4.0);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② EP0 五件套 ===== */
  yield* stage.say('EP0 五件套：类型、包长、重试、队指针、圈态。', '② / 6');
  fld.row(0)().text('Control（Table 6-9）');
  fld.row(1)().text('bMaxPacketSize0');
  fld.row(4)().text('传输环首段起址');
  fld.row(5)().text('1');
  fld.row(3)().text('3（3 次重试）');
  yield* flash(fld.row(1), 1);
  yield* waitFor(0.3);
  const q2 = makeChip(
    view,
    '"EP Type = Control…Max Packet Size = …Device Descriptor:bMaxPacketSize0…CErr = 3. Enables 3 retries…TR Dequeue Pointer = Start address of the first segment of the previously allocated Transfer Ring…Dequeue Cycle State (DCS) = 1." — §4.8.2.1 p145',
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver, size: 17},
  );
  q2().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(4.8);
  q2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ Max Packet Size 修正路径 ===== */
  const n3 = makeNote(
    view,
    [
      '描述符没读回之前：Max Packet Size 可先放默认端点包长',
      '（L77-78）；设备槽进入 Addressed 态后，用 Evaluate Endpoint',
      '命令修正该值（L79-80）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.hc},
  );
  yield* stage.say('包长先估后修：Addressed 之后 Evaluate 一次到位。', '③ / 6');
  n3().opacity(0.9);
  yield* flash(fld.row(1), 1);
  yield* waitFor(0.3);
  yield* waitFor(4.2);
  n3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ 一般控制端点：唯一差异 ===== */
  const q4 = makeChip(
    view,
    '"Identical to the Default Control Endpoint except that the Max Packet Size shall be set to the value of the associated Endpoint Descriptor:wMaxPacketSize." — §4.8.2.2 p145',
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver, size: 17},
  );
  yield* stage.say('其余控制端点抄 EP0：只有包长换成描述符值。', '④ / 6');
  q4().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.8);
  q4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ Bulk：基本字段 + Streams 分支 ===== */
  yield* stage.say('Bulk：包长、突发、重试三件，另看 Streams 开关。', '⑤ / 6');
  fld.row(0)().text('Bulk IN / OUT');
  fld.row(1)().text('wMaxPacketSize');
  fld.row(2)().text('USB3 companion · USB2 \'0\'');
  fld.row(3)().text('3');
  yield* waitFor(0.3);
  const n5a = makeNote(
    view,
    [
      'Bulk 基本面（L92-102）：Max Packet Size=wMaxPacketSize；',
      'Max Burst=USB3 companion:bMaxBurst、USB2 \'0\'；CErr=3。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver},
  );
  n5a().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  n5a().opacity(0);
  yield* waitFor(0.2);
  const n5b = makeNote(
    view,
    [
      'Streams 启用分支（companion MaxStreams>0，L104-115）：',
      '分配清零 Primary Stream Array → MaxPStreams=数组尺寸 →',
      'TR Dequeue Pointer=数组起址 → HID/LSA 按需初始化。',
      '未启用：MaxPStreams=\'0\'、队指针=环首址、DCS=1；',
      '注意 Streams 启用时 DCS 不适用（L128-129）。',
    ],
    {x: TLx(1300), y: TLy(310), w: 1040, tint: C.hc},
  );
  n5b().opacity(0.9);
  fld.row(5)().text('不适用（Streams 时）');
  yield* waitFor(0.3);
  yield* waitFor(4.6);
  n5b().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑥ Isoch / Interrupt ===== */
  yield* stage.say('Isoch 与 Interrupt：包长截位、Mult、重试各有口径。', '⑥ / 6');
  fld.row(0)().text('Isoch/Interrupt IN/OUT');
  fld.row(1)().text('wMaxPacketSize & 07FFh');
  fld.row(2)().text('companion bMaxBurst');
  fld.row(3)().text('Interrupt 3 / Isoch 0');
  yield* waitFor(0.3);
  const q6 = makeChip(
    view,
    '"Mult = SuperSpeed Endpoint Companion Descriptor:bmAttributes:Mult field. Always \'0\' for Interrupt endpoints…CErr = 0 for Isoch endpoints. Retries are not performed for Isoch endpoints…Max ESIT Payload = Refer to section 4.14.2 for value." — §4.8.2.4 p145-146',
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.dev, size: 16},
  );
  q6().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(5.0);
  q6().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.8.2 Endpoint Context 初始化',
    rows: [
      {k: '基线', v: 'Input EP Context 全 0'},
      {k: 'EP0', v: 'Control · bMaxPacketSize0 · CErr=3 · DCS=1'},
      {k: '控制', v: '同 EP0 · 包长=wMaxPacketSize'},
      {k: 'Bulk', v: 'Burst+Streams 分支 · DCS 不适用时'},
      {k: 'Isoch/Int', v: '&07FFh · Mult · CErr=3/0 · ESIT→4.14.2'},
      {k: '下一支', v: '§4.8.3 Endpoint Context State'},
    ],
    tint: C.hc,
    w: 980,
    rowSize: 19,
  });
  view.add(sum.node);
  fld.ref().opacity(0);
  yield* stage.say('字段填完，端点有了初始形态——下一支看它的状态机。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(4.2);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});

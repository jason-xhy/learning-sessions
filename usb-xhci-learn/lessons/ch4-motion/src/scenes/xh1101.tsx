// §4.11 TRBs 导语 + 4.11.1 TRB Template + 4.11.1.1 Command/Transfer TRB
// Components + 4.11.1.2 Event TRB Components —— xHCI 1.2b p188-190
// （R12 批 C 中档支；Figure 4-13 语义重建不截原图）
// 判据（evidence/spec-411.txt，判据唯一事实源；行号=切片内行号）：
//  - 导语："This section discusses the properties and uses of TRBs that are
//    outside of the scope of the general data structure descriptions that are
//    provided in section 6.4."（L2-4, p188）
//  - 模板："TRBs adhere to the generalized template illustrated in Figure
//    4-13."（L7, p188）；"A TRB consist of 3 basic components: Parameter,
//    Status, and Control. The following sub-sections identify the properties
//    of each component."（L27-28, p188）；Figure 4-13 字段面（L9-26）：
//    Control / ENT / Status / Parameter 四标签 + TRB Type + 字节偏移
//    03-00H / 07-04H / 0B-08H / 0F-0CH（四 Dword 分界）
//  - 4 Dwords/16 字节：Note "If all 4 Dwords of a TRB are not written as an
//    atomic memory operation, then it is required that the Parameter and
//    Status components of a TRB shall be initialized prior to writing the
//    Control Component. Violating this rule shall cause undefined xHC
//    behavior."（L55-58, p189）；IMPLEMENTATION NOTE "at least a 16 byte read
//    transaction would be issued as an atomic operation to fetch a TRB from
//    memory."（L63-66, p189）
//  - 4.11.1.1 通则："Command and Transfer TRB Components adhere to the
//    following general rules, where the producer is system software, and the
//    consumer is the xHC."（L31-32, p188）；"All components of all Command and
//    Transfer TRBs shall be initialized to ‘0’ by the system software when
//    the Command Ring or a Transfer Ring is created."（L33-34）；"All
//    components of all Command and Transfer TRBs shall be treated as
//    read-only by the xHC."（L35-36）；"The format/contents of all Command or
//    Transfer TRB components shall be defined by the Control component TRB
//    Type field. TRB Type field shall always reside in bits 10-15 of the
//    Control component."（L37-39）
//  - Cycle 位："The Enqueue Pointer of a ring is defined by the transition of
//    the Control component Cycle (C) bit in the TRB Ring. Refer to section
//    4.9 for a detailed explanation of Cycle bit operation. Cycle bit shall
//    always reside in bit 0 of the Control component."（L46-49, p189）
//  - ENT："If the xHC does not pre-fetch TRBs the Evaluate Next TRB (ENT)
//    flag forces the xHC to evaluate the next TRB of a TD before advancing
//    to the next endpoint in the Pipe Schedule. The ENT flag does not span
//    TDs, therefore the ENT flag is valid only if the Chain bit (CH) is
//    ‘1’."（L50-54, p189）
//  - 4.11.1.2 Event 通则："Event TRB Components adhere to the following
//    general rules, where the consumer is system software and the producer
//    is the xHC."（L73-74）；init ‘0’（L75-76）；"After Event Ring
//    initialization, all components of Event TRBs shall be treated as
//    read-only by system software."（L77-78）；TRB Type bits 10-15（L79-81）；
//    Enqueue=C 位翻转（L82-84）；"How an Event Ring is managed is described
//    in section 4.11.3."（L85, p189）
import {makeScene2D, Txt} from '@motion-canvas/2d';
import {createRef, Vector2, waitFor} from '@motion-canvas/core';
import {C, FONT, TLx, TLy} from '../lib/theme';
import {
  buildStage,
  lanesIn,
  makeCard,
  cardIn,
  makeRing,
  makeChip,
  makeNote,
  flash,
  CardApi,
  StageApi,
  RingApi,
} from '../lib/parts';

export default makeScene2D(function* (view) {
  view.fill(C.bg);

  /* ===== 片头 ===== */
  const t1 = createRef<Txt>();
  const t2 = createRef<Txt>();
  const t3 = createRef<Txt>();
  view.add(
    <>
      <Txt ref={t1} text={'§4.11'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'TRBs（传输请求块）'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={84} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'TRB 模板与组件通则 · xHCI 规范第 4 章 · p188–190'}
        x={0} y={TLy(610)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
    </>,
  );
  t1().opacity(1);
  t2().opacity(1);
  yield* waitFor(0.35);
  t3().opacity(1);
  yield* waitFor(0.35);
  yield* waitFor(0.6);
  t1().opacity(0);
  t2().opacity(0);
  t3().opacity(0);
  yield* waitFor(0.3);
  t1().remove(); t2().remove(); t3().remove();

  /* ===== 舞台 ===== */
  const stage: StageApi = buildStage(view, {
    section: '§4.11.1',
    zh: 'TRB Template',
    en: 'TRB 模板与组件通则 · 规范第 4 章',
    cite: 'xHCI 1.2b §4.11.1 p188–190',
  });
  yield* lanesIn(stage);

  /* 事件环 + 传输环（C 位定环序 → 事件回执主线） */
  const evt: RingApi = makeRing(view, {
    y: 470, zh: '事件环 Event Ring', en: '',
    note: 'xHC 写完成事件', tint: C.evt, x0: 760, x1: 1450, n: 10,
  });
  const xfer: RingApi = makeRing(view, {
    y: 655, zh: '传输环 Transfer Ring', en: '',
    note: '软件写 TRB', tint: C.driver, x0: 760, x1: 1450, n: 10,
  });
  evt.group().opacity(1);
  xfer.group().opacity(1);
  yield* waitFor(0.2);
  evt.markLink(); xfer.markLink();
  yield* waitFor(0.25);

  /* ===== ① 本节定位 ===== */
  const q1 = makeChip(
    view,
    '"This section discusses the properties and uses of TRBs that are outside of the scope of the general data structure descriptions that are provided in section 6.4." — §4.11 p188',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.hc, size: 17},
  );
  yield* stage.say('TRB=传输请求块：本节讲组件级通用规则。', '① / 8');
  q1().opacity(0.95);
  yield* flash(xfer.group, 1);
  yield* waitFor(0.3);
  yield* waitFor(3.0);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② Figure 4-13 模板重建 ===== */
  const q2 = makeChip(
    view,
    '"TRBs adhere to the generalized template illustrated in Figure 4-13. … A TRB consist of 3 basic components: Parameter, Status, and Control." — §4.11.1 p188',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.hc, size: 17},
  );
  const tpl: CardApi = makeCard({
    title: 'TRB 模板（Figure 4-13 重建）',
    rows: [
      {k: 'Parameter', v: 'Dword 0-1 · 字节 00-07H'},
      {k: 'Status', v: 'Dword 2 · 字节 08-0BH'},
      {k: 'Control', v: 'Dword 3 · 字节 0C-0FH'},
      {k: 'TRB Type', v: 'Control bits 10-15'},
      {k: 'Cycle (C)', v: 'Control bit 0'},
    ],
    tint: C.hc,
    w: 560,
    rowSize: 17,
  });
  view.add(tpl.node);
  yield* stage.say('模板三组件：Parameter、Status、Control。', '② / 8');
  q2().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(1.5);
  q2().opacity(0);
  yield* waitFor(0.2);
  yield* cardIn(tpl, new Vector2(TLx(740), TLy(295)));
  yield* waitFor(2.2);
  tpl.ref().opacity(0);
  yield* waitFor(0.2);
  tpl.ref().remove();

  /* ===== ③ 4.11.1.1 生产者/消费者 + 初始化 ===== */
  const q3 = makeChip(
    view,
    '"Command and Transfer TRB Components adhere to the following general rules, where the producer is system software, and the consumer is the xHC. All components of all Command and Transfer TRBs shall be initialized to ‘0’ by the system software when the Command Ring or a Transfer Ring is created. All components of all Command and Transfer TRBs shall be treated as read-only by the xHC." — §4.11.1.1 p188',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 15},
  );
  yield* stage.say('命令/传输 TRB：软件生产，xHC 只读消费。', '③ / 8');
  q3().opacity(0.95);
  yield* xfer.fill(0, 'TRB', C.driver);
  yield* xfer.enqTo(1);
  yield* waitFor(0.3);
  yield* waitFor(2.7);
  q3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ TRB Type 定格式 + C 位定环序 ===== */
  const q4 = makeChip(
    view,
    '"The format/contents of all Command or Transfer TRB components shall be defined by the Control component TRB Type field. TRB Type field shall always reside in bits 10-15 of the Control component. … The Enqueue Pointer of a ring is defined by the transition of the Control component Cycle (C) bit in the TRB Ring. … Cycle bit shall always reside in bit 0 of the Control component." — §4.11.1.1 p188-189',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.hc, size: 14},
  );
  yield* stage.say('TRB Type 定格式；C 位翻转即入环点。', '④ / 8');
  q4().opacity(0.95);
  yield* xfer.deqTo(0, 0.4);
  yield* xfer.consume(0);
  yield* xfer.deqTo(1, 0.4);
  yield* xfer.enqTo(2);
  yield* waitFor(0.3);
  yield* waitFor(2.0);
  q4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ ENT 标志 ===== */
  const n5 = makeNote(
    view,
    [
      'ENT=Evaluate Next TRB（L50-54）：xHC 不预取时，强制其在',
      '推进到 Pipe Schedule 下一端点前先评估 TD 的下一 TRB。',
      'ENT 不跨 TD——仅 Chain 位 CH=‘1’ 时才有效（§4.12.3 详述）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver},
  );
  yield* stage.say('ENT 让 xHC 预评估下一 TRB，只限链内。', '⑤ / 8');
  n5().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.1);
  n5().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑥ 原子写 + 16 字节总线事务 ===== */
  const q6 = makeChip(
    view,
    '"If all 4 Dwords of a TRB are not written as an atomic memory operation, then it is required that the Parameter and Status components of a TRB shall be initialized prior to writing the Control Component. Violating this rule shall cause undefined xHC behavior." — §4.11.1.1 Note p189',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.warn, size: 16},
  );
  const n6 = makeNote(
    view,
    [
      'IMPLEMENTATION NOTE（L63-70）：硬件以单次原子总线事务读写',
      'TRB——取一支 TRB 至少发 16 字节原子读；可一次 64B 取 4 支。',
      '非原子读写 TRB 可能引发未定义行为。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.hc},
  );
  yield* stage.say('四 Dword 原子写：先 Parameter/Status 后 Control。', '⑥ / 8');
  q6().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.0);
  q6().opacity(0);
  yield* waitFor(0.2);
  n6().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.0);
  n6().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑦ 4.11.1.2 Event TRB 反转 ===== */
  const q7 = makeChip(
    view,
    '"Event TRB Components adhere to the following general rules, where the consumer is system software and the producer is the xHC. All components of all Event TRBs shall be initialized to ‘0’ by the system software when the Event Ring is created. After Event Ring initialization, all components of Event TRBs shall be treated as read-only by system software. … TRB Type field shall always reside in bits 10-15 of the Control component." — §4.11.1.2 p189',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.evt, size: 14},
  );
  yield* stage.say('事件 TRB 反转：xHC 生产，软件只读。', '⑦ / 8');
  q7().opacity(0.95);
  yield* evt.fill(0, 'EV', C.evt);
  yield* evt.enqTo(1);
  yield* waitFor(0.3);
  yield* waitFor(2.7);
  q7().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑧ 两族同构收束 ===== */
  const n8 = makeNote(
    view,
    [
      '两族同构（L37-39 / L79-84）：TRB Type（bits 10-15）定组件格式，',
      'Cycle 位（bit 0）翻转定义环 Enqueue——命令/传输族与事件族共用',
      '同一模板，仅生产者/消费者互换；事件环管理见 §4.11.3（L85）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.evt},
  );
  yield* stage.say('两族共用一模板：Type 定格式、C 位定环序。', '⑧ / 8');
  n8().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.7);
  n8().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.11.1 TRB Template',
    rows: [
      {k: '模板', v: 'Parameter + Status + Control（16 字节/4 Dword）'},
      {k: '命令/传输族', v: '软件生产 · xHC 只读 · 建环先清零'},
      {k: '事件族', v: 'xHC 生产 · 软件只读 · 初始化后锁定'},
      {k: '公共位', v: 'TRB Type bits 10-15 · Cycle bit 0'},
      {k: '下一支', v: '§4.11.2 Transfer TRBs'},
    ],
    tint: C.hc,
    w: 980,
    rowSize: 20,
  });
  view.add(sum.node);
  xfer.group().opacity(0);
  evt.group().opacity(0);
  yield* stage.say('模板讲透——下一支：传输环上的 TD。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(2.8);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});

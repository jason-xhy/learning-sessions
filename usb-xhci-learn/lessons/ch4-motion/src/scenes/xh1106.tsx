// §4.11.6 Vendor Defined TRB Types —— xHCI 1.2b p211-212（R12 批 C 小档支）
// 判据（evidence/spec-411.txt，判据唯一事实源；行号=切片内行号）：
//  - 定义（L1153-1155）："xHC vendors may define proprietary TRB Types using
//    the Vendor Defined TRB Type codes identified in Table 6-91. The Vendor
//    Defined TRB Types may be used to define Command, Event, or Transfer
//    TRBs."
//  - 扩展能力枚举（L1156-1158）："A vendor shall define proprietary xHCI
//    Extended Capability structures using the xHCI Extended Capability
//    Codes identified in Table 7-3 to enumerate any vendor defined TRB types
//    or xHC capabilities."
//  - 未识别处置·传输环（L1161-1166）："On a Transfer Ring, if a Vendor
//    Defined TRB is preceded by a Transfer TRB and the Chain bit (CH) of the
//    Transfer TRB is set (‘1’), then the Vendor Defined TRB is also required
//    to support a valid Chain bit, which the xHC shall evaluate to determine
//    if the end of the TD has been reached. Otherwise, the xHC shall advance
//    past an unrecognized Vendor Defined TRB on a Transfer Ring and shall
//    ignore it."
//  - 未识别处置·命令环/事件环（L1174-1178）："The xHC shall treat Vendor
//    Defined TRBs encountered on a Command Ring like a No Op Command TRB.
//    Software shall advance past and ignore Vendor Defined TRBs encountered
//    on an Event Ring."
//  - 位对齐三 Note（L1179-1187）："All vendor defined TRBs shall define a
//    Cycle (C) bit at the same bit position as defined in all xHCI TRBs and
//    manage it as defined in section 4.9 for the respective ring type. …
//    All vendor defined Event TRBs shall define a Completion Code field at
//    the same bit position as defined in all xHCI Event TRBs … Any vendor
//    defined Transfer TRBs that may be included in a multi-TRB TD, shall
//    define a Chain bit (CH) field at the same bit position as defined in a
//    Normal TRB …"
//  - 命令族（L1188-1190）："xHC vendors may use the Vendor Defined TRB Type
//    codes to define proprietary xHCI commands. All vendor defined commands
//    shall utilize the Command Completion Event TRB to report completions."
//  - 多厂商重码（L1191-1195）："Multiple vendors may define the same xHCI
//    Extended Capability code or Vendor Defined TRB code to perform
//    different operations. All vendor defined xHCI Extended Capability codes
//    and TRB Types shall be qualified by system software with the PCI
//    Configuration Space Header Vendor ID and Subsystem Vendor ID."
//  - 完成码两群（L1196-1207）："Vendors may also define Completion Codes.
//    The Vendor Defined Completion Codes are separated into two groups:
//    error and information. This partitioning allows software to infer the
//    purpose of a Vendor Defined Completion Code even if it does not have
//    vendor specific knowledge. Refer to Table 6-90. If software does not
//    have vendor specific knowledge, Completion Codes in the range defined
//    by Vendor Defined Info codes shall be interpreted identically to a
//    Success Completion Code. If software does not have vendor specific
//    knowledge, Completion Codes in the range defined by Vendor Defined
//    Error codes shall be interpreted as an Undefined Error Completion Code,
//    for example, if a Vendor Defined Error code is reported in a Command
//    Completion Event software shall assume that the associated command did
//    not complete successfully."
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
      <Txt ref={t1} text={'§4.11.6'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Vendor Defined TRB'} x={0} y={TLy(490)}
        fontFamily={FONT.sans} fontSize={68} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'厂商自定义 TRB 类型 · xHCI 规范第 4 章 · p211–212'}
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
    section: '§4.11.6',
    zh: 'Vendor Defined TRB',
    en: '厂商自定义 TRB 类型 · 规范第 4 章',
    cite: 'xHCI 1.2b §4.11.6 p211–212',
  });
  yield* lanesIn(stage);

  /* 传输环 + 命令环（未识别走读道具） */
  const xfer: RingApi = makeRing(view, {
    y: 470, zh: '传输环 Transfer Ring', en: '',
    note: '未识别→评估 CH 后跳过', tint: C.driver, x0: 760, x1: 1450, n: 8,
  });
  const cmd: RingApi = makeRing(view, {
    y: 655, zh: '命令环 Command Ring', en: '',
    note: '未识别→当 No Op', tint: C.hc, x0: 760, x1: 1450, n: 8,
  });
  xfer.group().opacity(1);
  cmd.group().opacity(1);
  yield* waitFor(0.2);
  xfer.markLink();
  yield* waitFor(0.25);

  /* ===== ① 定义与三用途 ===== */
  const q1 = makeChip(
    view,
    '"xHC vendors may define proprietary TRB Types using the Vendor Defined TRB Type codes identified in Table 6-91. The Vendor Defined TRB Types may be used to define Command, Event, or Transfer TRBs." — §4.11.6 p211',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.hc, size: 15},
  );
  yield* stage.say('厂商可拿专用类型码自定义三类 TRB。', '① / 6');
  q1().opacity(0.95);
  yield* xfer.fill(0, 'Vend', C.warn);
  yield* xfer.enqTo(1);
  yield* waitFor(0.3);
  yield* waitFor(2.4);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② 扩展能力枚举与厂商限定 ===== */
  const q2 = makeChip(
    view,
    '"A vendor shall define proprietary xHCI Extended Capability structures using the xHCI Extended Capability Codes identified in Table 7-3 to enumerate any vendor defined TRB types or xHC capabilities. … Multiple vendors may define the same xHCI Extended Capability code or Vendor Defined TRB code to perform different operations. All vendor defined xHCI Extended Capability codes and TRB Types shall be qualified by system software with the PCI Configuration Space Header Vendor ID and Subsystem Vendor ID." — §4.11.6 p211-212',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 13},
  );
  yield* stage.say('自定义须入扩展能力表；同码不同厂——Vendor ID 限定。', '② / 6');
  q2().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(4.4);
  q2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ 未识别三态处置 ===== */
  const q3 = makeChip(
    view,
    '"On a Transfer Ring, if a Vendor Defined TRB is preceded by a Transfer TRB and the Chain bit (CH) of the Transfer TRB is set (‘1’), then the Vendor Defined TRB is also required to support a valid Chain bit, which the xHC shall evaluate to determine if the end of the TD has been reached. Otherwise, the xHC shall advance past an unrecognized Vendor Defined TRB on a Transfer Ring and shall ignore it. … The xHC shall treat Vendor Defined TRBs encountered on a Command Ring like a No Op Command TRB. … Software shall advance past and ignore Vendor Defined TRBs encountered on an Event Ring." — §4.11.6 p211-212',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.warn, size: 12},
  );
  yield* stage.say('未识别三态：传输环评估 CH 跳过/命令环当 No Op/事件环忽略。', '③ / 6');
  q3().opacity(0.95);
  yield* xfer.deqTo(0, 0.4);
  yield* xfer.consume(0);
  yield* cmd.fill(0, 'Vend→NoOp', C.hc);
  yield* cmd.enqTo(1);
  yield* cmd.deqTo(0, 0.4);
  yield* cmd.consume(0);
  yield* waitFor(0.3);
  yield* waitFor(3.0);
  q3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ 位对齐三 Note ===== */
  const n4 = makeNote(
    view,
    [
      '位对齐铁律（L1179-1187）：C 位/Event 完成码位/Transfer 的 CH 位',
      '一律与标准 TRB 同位同管（§4.9/§4.9.4/§4.9.1）——自定义不夺走',
      '环管理语义。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.hc},
  );
  yield* stage.say('自定义不改环语义：三位对齐标准 TRB。', '④ / 6');
  n4().opacity(0.9);
  yield* flash(xfer.group, 1);
  yield* waitFor(0.3);
  yield* waitFor(2.8);
  n4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ 自定义命令族 ===== */
  const q5 = makeChip(
    view,
    '"xHC vendors may use the Vendor Defined TRB Type codes to define proprietary xHCI commands. All vendor defined commands shall utilize the Command Completion Event TRB to report completions." — §4.11.6 p212',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.evt, size: 16},
  );
  yield* stage.say('自定义命令也走 Command Completion Event 回执。', '⑤ / 6');
  q5().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.7);
  q5().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑥ 完成码两群 ===== */
  const f6: CardApi = makeCard({
    title: 'Vendor Defined Completion Codes（Table 6-90）',
    rows: [
      {k: 'Info 群', v: '无厂商知识→按 Success 解读'},
      {k: 'Error 群', v: '无厂商知识→按 Undefined Error 解读'},
      {k: '命令例', v: 'Error 码出现在完成事件=命令未成功'},
    ],
    tint: C.warn,
    w: 560,
    rowSize: 17,
  });
  view.add(f6.node);
  yield* stage.say('完成码两群：Info≈Success；Error≈未成功。', '⑥ / 6');
  yield* cardIn(f6, new Vector2(TLx(740), TLy(295)));
  yield* waitFor(0.3);
  yield* waitFor(2.8);
  f6.ref().opacity(0);
  yield* waitFor(0.2);
  f6.ref().remove();
  yield* waitFor(0.2);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.11.6 Vendor Defined TRB Types',
    rows: [
      {k: '定义', v: 'Table 6-91 专用码自定义 Command/Event/Transfer'},
      {k: '限定', v: '扩展能力表枚举 · PCI Vendor ID+Subsystem 限定'},
      {k: '未识别', v: '传输环评估 CH 跳过 · 命令环当 No Op · 事件环忽略'},
      {k: '完成码', v: 'Info 群≈Success · Error 群≈Undefined Error'},
      {k: '下一支', v: '§4.11.7 TD Usage Rules'},
    ],
    tint: C.hc,
    w: 980,
    rowSize: 20,
  });
  view.add(sum.node);
  xfer.group().opacity(0);
  cmd.group().opacity(0);
  yield* stage.say('厂商扩展面讲透——下一支：TD 使用规则。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.0);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});

// §4.9.1 Transfer Descriptors 传输描述符 —— xHCI 1.2b p151-152（R12 批 A）
// 判据（evidence/spec-49.txt，判据唯一事实源）：
//  - "Transfer Rings support Transfer Descriptors (TDs) that consists of 1 or more
//    TRBs. The TRB Chain (C) bit is set in all but the last TRB of a TD."
//                                                                    (L98-99, p151)
//  - "The xHC shall schedule Max Packet Size USB transactions for all packets
//    associated with a TD, except possibly for the last packet if the TD does not
//    define an integer multiple of Max Packet Size data bytes." (L100-102, p151)
//  - 零长包："To generate a "zero-length" USB transaction, software shall explicitly
//    define a TD with a single Transfer TRB, and its TRB Transfer Length field
//    shall equal '0'. Note that this TD may include non-Transfer TRBs, for example,
//    an Event Data or Link TRB."                          (L103-106, p151)
//  - 半成品 TD："if the xHC is processing a partially formed TD…advancing to the
//    next TD is not possible and the xHC shall stop advancing when it reaches the
//    Enqueue Pointer (that is, the Cycle bit transition)…the next time the doorbell
//    is rung for the endpoint, the xHC shall attempt to advance to the next TD
//    boundary. Note that the xHC shall always interpret the New TR Dequeue Pointer
//    field of a Set TR Dequeue Pointer Command as a pointer to the "next TD"…"
//                                                                    (L115-124, p152)
//  - 判据："A "partially completed TD" is identified by the case where the Chain
//    bit (CH) set to '1' in the TRB referenced by the Dequeue Pointer and advancing
//    the Dequeue Pointer sets it equal to the Enqueue Pointer." (L125-127, p152)
//  - "Command and Event TRBs do not support a Chain bit (CH), so all Command
//    Descriptors (CDs) and Event Descriptors (EDs) only consist of a single TRB."
//                                                                    (L128-129, p152)
//  - Short Packet："If the xHC receives a Short Packet from a device, then it shall
//    retire the current TD…If the EOB flag was set in a short DP received on a SS
//    IN pipe, then the host shall retire the current TD, and wait for an ERDY from
//    the device…"                                              (L130-136, p152)
//  - 多 TRB TD 错误："If an error is detected while processing a multi-TRB TD, the
//    xHC shall generate a Transfer Event for the TRB that the error was detected on
//    with the appropriate error Condition Code, then may advance to the next TD…
//    the Completion Code of a Transfer Event represents the status of the buffer
//    referenced by the Transfer TRB that generated it…" (L137-147, p152)
import {makeScene2D, Rect, Txt} from '@motion-canvas/2d';
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

type AnyRef = {(): any};

export default makeScene2D(function* (view) {
  view.fill(C.bg);

  /* ===== 片头 ===== */
  const t1 = createRef<Txt>();
  const t2 = createRef<Txt>();
  const t3 = createRef<Txt>();
  view.add(
    <>
      <Txt ref={t1} text={'§4.9.1'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Transfer Descriptors'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={80} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'传输描述符 TD · xHCI 规范第 4 章 · p151–152'}
        x={0} y={TLy(610)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
    </>,
  );
  t1().opacity(1);
  t2().opacity(1);
  yield* waitFor(0.3);
  t3().opacity(1);
  yield* waitFor(0.3);
  yield* waitFor(0.7);
  t1().opacity(0);
  t2().opacity(0);
  t3().opacity(0);
  yield* waitFor(0.3);
  t1().remove(); t2().remove(); t3().remove();

  /* ===== 舞台 ===== */
  const stage: StageApi = buildStage(view, {
    section: '§4.9.1',
    zh: 'Transfer Descriptors',
    en: 'Transfer Ring TD 规则 · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.9.1 p151–152',
  });
  yield* lanesIn(stage);

  /* 传输环（主角）+ 事件环（回执参照） */
  const xfer: RingApi = makeRing(view, {
    y: 470, zh: '传输环 Transfer Ring', en: '',
    note: 'TD=TRB 链', tint: C.driver, x0: 760, x1: 1450, n: 10,
  });
  const evt: RingApi = makeRing(view, {
    y: 655, zh: '事件环 Event Ring', en: '',
    note: '回执指向肇事 TRB', tint: C.evt, x0: 760, x1: 1450, n: 10,
  });
  xfer.group().opacity(1);
  evt.group().opacity(1);
  yield* waitFor(0.2);
  xfer.markLink(); evt.markLink();
  yield* waitFor(0.25);

  /* ===== ① TD=TRB 链与 Chain 位 ===== */
  const q1 = makeChip(
    view,
    '"Transfer Rings support Transfer Descriptors (TDs) that consists of 1 or more TRBs. The TRB Chain (C) bit is set in all but the last TRB of a TD." — §4.9.1 p151',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 18},
  );
  yield* stage.say('TD=一串 TRB：除末尾一个，Chain 位全置一。', '① / 7');
  q1().opacity(0.95);
  yield* xfer.fill(0, 'N C1', C.driver);
  yield* xfer.fill(1, 'N C1', C.driver);
  yield* xfer.fill(2, 'N C0', C.driver);
  yield* xfer.enqTo(3);
  yield* waitFor(0.3);
  yield* waitFor(2.6);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② 包调度 ===== */
  const q2 = makeChip(
    view,
    '"The xHC shall schedule Max Packet Size USB transactions for all packets associated with a TD, except possibly for the last packet if the TD does not define an integer multiple of Max Packet Size data bytes." — §4.9.1 p151',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.dev, size: 17},
  );
  yield* stage.say('包按 Max Packet Size 切：末包可以不满。', '② / 7');
  q2().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  q2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ 零长包 ===== */
  const c3: CardApi = makeCard({
    title: '零长包（Zero-Length）',
    rows: [
      {k: '形态', v: '单个 Transfer TRB'},
      {k: 'Transfer Length', v: '\'0\''},
      {k: '可混装', v: 'Event Data / Link TRB'},
    ],
    tint: C.dev,
    w: 460,
    rowSize: 18,
  });
  view.add(c3.node);
  yield* stage.say('零长包是显式声明：单 TRB、长度 0。', '③ / 7');
  yield* cardIn(c3, new Vector2(TLx(1180), TLy(300)));
  yield* waitFor(0.4);
  yield* waitFor(2.6);
  c3.ref().opacity(0);
  yield* waitFor(0.2);
  c3.ref().remove();

  /* ===== ④ 半成品 TD ===== */
  const q4 = makeChip(
    view,
    '"A "partially completed TD" is identified by the case where the Chain bit (CH) set to \'1\' in the TRB referenced by the Dequeue Pointer and advancing the Dequeue Pointer sets it equal to the Enqueue Pointer." — §4.9.1 p152',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.warn, size: 17},
  );
  yield* stage.say('半成品 TD 停在 Cycle 转换：下次门铃续走。', '④ / 7');
  q4().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.0);
  q4().opacity(0);
  yield* waitFor(0.2);
  const n4 = makeNote(
    view,
    [
      'xHC 推进撞到 Enqueue Pointer（Cycle 位转换）即视为环空',
      '（L115-122）；Set TR Dequeue Pointer 的新队指针永远按',
      '"下一 TD" 解释，中止本轮推进（L122-124）。',
    ],
    {x: TLx(290), y: TLy(560), w: 540, tint: C.warn},
  );
  n4().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.0);
  n4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ 命令/事件 TRB 无 Chain 位 ===== */
  const q5 = makeChip(
    view,
    '"Command and Event TRBs do not support a Chain bit (CH), so all Command Descriptors (CDs) and Event Descriptors (EDs) only consist of a single TRB." — §4.9.1 p152',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.hc, size: 18},
  );
  yield* stage.say('命令/事件 TRB 无 Chain 位：描述符恒单格。', '⑤ / 7');
  q5().opacity(0.95);
  yield* evt.fill(0, 'ED', C.evt);
  yield* evt.enqTo(1);
  yield* waitFor(0.3);
  yield* waitFor(3.2);
  q5().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑥ Short Packet ===== */
  const q6 = makeChip(
    view,
    '"If the xHC receives a Short Packet from a device, then it shall retire the current TD. If another TD is defined on the Transfer Ring, the xHC shall advance to it and begin IN transactions." — §4.9.1 p152',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.dev, size: 17},
  );
  yield* stage.say('Short Packet 退休当前 TD，直接推进下一 TD。', '⑥ / 7');
  q6().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.2);
  q6().opacity(0);
  yield* waitFor(0.2);
  const n6 = makeNote(
    view,
    [
      'SS IN 管道收到带 EOB 旗标的短包（L132-136）：退休当前',
      'TD 后原地等设备的 ERDY，再开下一 TD 的 IN 事务。',
    ],
    {x: TLx(290), y: TLy(560), w: 540, tint: C.dev},
  );
  n6().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.4);
  n6().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑦ 多 TRB TD 错误 ===== */
  const q7 = makeChip(
    view,
    '"the Completion Code of a Transfer Event represents the status of the buffer referenced by the Transfer TRB that generated it, however there may be exceptions." — §4.9.1 p152',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.evt, size: 17},
  );
  yield* stage.say('多 TRB TD 出错：事件对检出格，CC 讲缓冲的话。', '⑦ / 7');
  q7().opacity(0.95);
  yield* evt.fill(1, 'Evt', C.evt);
  yield* evt.enqTo(2);
  yield* evt.deqTo(0, 0.4);
  yield* evt.consume(0);
  yield* evt.deqTo(1, 0.4);
  yield* waitFor(0.3);
  yield* waitFor(2.6);
  q7().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.9.1 Transfer Descriptors',
    rows: [
      {k: 'TD', v: '1+ TRB · Chain 位串珠'},
      {k: '包', v: 'MaxPkt 切 · 末包可缺 · 零长显式'},
      {k: '半成品', v: 'Cycle 转换停 · 门铃续 · SetTRDP=下一TD'},
      {k: 'CD/ED', v: '无 Chain · 恒单 TRB'},
      {k: '错误', v: '事件指检出格 · CC=所指缓冲状态'},
      {k: '下一支', v: '§4.9.2 Transfer Ring Management'},
    ],
    tint: C.hc,
    w: 1000,
    rowSize: 19,
  });
  view.add(sum.node);
  yield* stage.say('TD 规矩立完——下一支：环本身怎么管。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.2);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});

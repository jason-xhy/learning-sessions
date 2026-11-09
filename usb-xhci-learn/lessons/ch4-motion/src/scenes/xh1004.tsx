// §4.10.4 IOC Flag 完成中断标志 —— xHCI 1.2b p187-188（R12 批 B 小档支）
// 判据（evidence/spec-410.txt，判据唯一事实源）：
//  - 总规则（L881-884, p187）："The general rule for how the xHC should handle the
//    IOC flag is simple: if the IOC flag is set, then generate an event. There are
//    some exceptions to this rule described in the spec, for example, if the Event
//    Ring is full, but normally this rule should always be applied."
//  - TD 完成回执（L885-889, p187）："If software wants to know when the xHC has
//    completed processing all the TRBs associated with a TD, it must set the IOC
//    flag in the last TRB of TD. The event that the IOC in the last TRB generates
//    informs software that last TRB of the TD is complete, which means that the TD
//    is complete, and that the space on the Transfer Ring that the TD consumed may
//    be reclaimed."
//  - ISP（L890-899, p187）："The ISP flag generates an event only if less data was
//    received, than was specified by a TRB. The TRB Transfer Length field of the
//    Transfer Event that a Short Packet condition generates informs software of the
//    exact number of bytes transferred when the condition was detected. Software
//    may also set the BEI flag if it is not interested in generating an interrupt
//    due to a Short Packet Event. And if the ISP flag is set and IOC flag is not
//    set in the last TRB of TD that received a Short Packet, an event shall not be
//    generated if a Short Packet condition does not occur on that TRB, that is, if
//    the buffer defined by the TRB is completely filled."
//  - 错误形似短包（L900-916, p187-188）："In some cases, the xHC response to an
//    error condition may look very similar to a Short Packet condition, because
//    after the xHC generates an event for either condition, the xHC may
//    automatically advance to the next TD. An example … when a USB Transaction
//    Error is detected during an Isoch IN transfer, where the Isoch pipe does not
//    stall, but advances to the next Isoch TD … however if the event does not
//    point to last TRB of the Isoch TD and the IOC flag is not set in last TRB of
//    the TD with the error, software will have to wait until the next IOC flag is
//    encountered by the endpoint before it can reclaim the Isoch TD that had the
//    error. This may take many milliseconds …"
//  - 多用途总结（L917-921, p188）："In summary, software can not only use the IOC
//    flag to report specific TD completions, but it can also be used to provide
//    timely updates of the Dequeue Pointer position so that TRBs can be reclaimed,
//    to reduce error recovery times, or to allow Transfer Rings to grow or shrink
//    as function of system loading or resource changes."
//  - PAE 例外 Note（L922-927, p188）："An exception is if the PAE flag is cleared
//    ('0'). In this case when a Short Packet occurs, the IOC flag in the first
//    Event Data TRB encountered generates an Event Data Transfer Event and the IOC
//    flag is ignored in subsequent Event Data TRBs …"
//  - 与 m1 交互台 EP0 三段 TD 呼应：m1 自由练习的 EP0 三段 TD（Setup/Data/
//    Status）各段以 IOC 收尾收事件，正是本节"链尾 IOC=TD 完成回执"的交互面。
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
  makeLampRow,
  flash,
  CardApi,
  StageApi,
  RingApi,
  LampApi,
} from '../lib/parts';

export default makeScene2D(function* (view) {
  view.fill(C.bg);

  /* ===== 片头 ===== */
  const t1 = createRef<Txt>();
  const t2 = createRef<Txt>();
  const t3 = createRef<Txt>();
  view.add(
    <>
      <Txt ref={t1} text={'§4.10.4'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'IOC Flag'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={88} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'完成中断标志 · TD 完成回执 · xHCI 规范第 4 章 · p187–188'}
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
    section: '§4.10.4',
    zh: 'IOC Flag',
    en: 'Interrupt On Completion · TD 完成回执',
    cite: 'xHCI 1.2b §4.10.4 p187–188',
  });
  yield* lanesIn(stage);

  /* 事件环 + 传输环 + IOC/ISP/BEI 灯排 */
  const evt: RingApi = makeRing(view, {
    y: 470, zh: '事件环 Event Ring', en: '',
    note: '回执落这里', tint: C.evt, x0: 760, x1: 1450, n: 10,
  });
  const xfer: RingApi = makeRing(view, {
    y: 655, zh: '传输环 Transfer Ring', en: '',
    note: '链尾 IOC 收口', tint: C.driver, x0: 760, x1: 1450, n: 10,
  });
  evt.group().opacity(1);
  xfer.group().opacity(1);
  yield* waitFor(0.2);
  evt.markLink(); xfer.markLink();
  const flags: LampApi[] = makeLampRow(view, {
    x: TLx(620), y: TLy(380), labels: ['IOC', 'ISP', 'BEI'], w: 210,
  });
  for (const f of flags) f.ref().opacity(1);
  yield* waitFor(0.25);

  /* ===== ① 总规则 ===== */
  const q1 = makeChip(
    view,
    '"The general rule for how the xHC should handle the IOC flag is simple: if the IOC flag is set, then generate an event. There are some exceptions to this rule described in the spec, for example, if the Event Ring is full, but normally this rule should always be applied." — §4.10.4 p187',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.hc, size: 17},
  );
  yield* stage.say('总规则一句话：IOC 置位就生成事件。', '① / 6');
  q1().opacity(0.95);
  flags[0].val().text('1');
  yield* flash(flags[0].ref, 1);
  yield* waitFor(0.3);
  yield* waitFor(3.3);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② TD 完成回执 ===== */
  const q2 = makeChip(
    view,
    '"If software wants to know when the xHC has completed processing all the TRBs associated with a TD, it must set the IOC flag in the last TRB of TD. The event that the IOC in the last TRB generates informs software that last TRB of the TD is complete, which means that the TD is complete, and that the space on the Transfer Ring that the TD consumed may be reclaimed." — §4.10.4 p187',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 16},
  );
  yield* stage.say('链尾设 IOC：事件到=TD 完=环空间可回收。', '② / 6');
  q2().opacity(0.95);
  yield* xfer.fill(0, 'N', C.driver);
  yield* xfer.fill(1, 'N IOC=1', C.driver);
  yield* xfer.enqTo(2);
  yield* xfer.deqTo(0, 0.4);
  yield* xfer.consume(0);
  yield* xfer.deqTo(1, 0.4);
  yield* xfer.consume(1);
  yield* xfer.deqTo(2, 0.4);
  yield* evt.fill(0, 'TE', C.evt);
  yield* evt.enqTo(1);
  yield* waitFor(0.3);
  yield* waitFor(2.2);
  q2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ ISP 与 BEI ===== */
  const n3 = makeNote(
    view,
    [
      'ISP（L890-895）：只在实收偏少时生成事件，Length 记确切实收',
      '字节数；不关心短包中断可设 BEI。末 TRB 有 ISP 无 IOC 且缓冲',
      '全填满（无短包）→不生成事件（L896-899）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver},
  );
  yield* stage.say('ISP 管短包侧账：偏少才报，BEI 可免中断。', '③ / 6');
  flags[1].val().text('1');
  flags[2].val().text('1');
  n3().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.7);
  n3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ 错误响应形似短包 ===== */
  const q4 = makeChip(
    view,
    '"An example of this behavior is when a USB Transaction Error is detected during an Isoch IN transfer, where the Isoch pipe does not stall, but advances to the next Isoch TD in preparation for the next Interval. … if the event does not point to last TRB of the Isoch TD and the IOC flag is not set in last TRB of the TD with the error, software will have to wait until the next IOC flag is encountered by the endpoint before it can reclaim the Isoch TD that had the error. This may take many milliseconds" — §4.10.4 p187-188',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.warn, size: 15},
  );
  yield* stage.say('错误也自动推进下一 TD——回收要等下一个 IOC。', '④ / 6');
  q4().opacity(0.95);
  yield* xfer.fill(2, 'err', C.warn);
  yield* xfer.fill(3, 'N', C.driver);
  yield* xfer.enqTo(4);
  yield* waitFor(0.3);
  yield* waitFor(3.5);
  q4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ IOC 多用途 ===== */
  const q5 = makeChip(
    view,
    '"In summary, software can not only use the IOC flag to report specific TD completions, but it can also be used to provide timely updates of the Dequeue Pointer position so that TRBs can be reclaimed, to reduce error recovery times, or to allow Transfer Rings to grow or shrink as function of system loading or resource changes." — §4.10.4 p188',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.hc, size: 16},
  );
  yield* stage.say('IOC 不只报完成：刷 Deq、缩恢复窗、配合环伸缩。', '⑤ / 6');
  q5().opacity(0.95);
  yield* flash(flags[0].ref, 1);
  yield* waitFor(0.3);
  yield* waitFor(3.7);
  q5().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑥ PAE 例外 + EP0 三段 TD 呼应 ===== */
  const n6 = makeNote(
    view,
    [
      'PAE 例外（Note L922-927）：PAE=0 时短包发生，首个 Event Data',
      'TRB 的 IOC 生成事件，推进途中后续 Event Data TRB 的 IOC 被忽略。',
      '呼应交互台 m1 的 EP0 三段 TD：Setup/Data/Status 各段链尾 IOC，',
      '三段事件三笔回执——正是本节回执语义的动手面（#m1）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.evt},
  );
  yield* stage.say('PAE 例外记一条；EP0 三段 TD 到 m1 练。', '⑥ / 6');
  n6().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.6);
  n6().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.10.4 IOC Flag',
    rows: [
      {k: '规则', v: 'IOC=1 → 生成事件（环满例外）'},
      {k: '回执', v: '链尾 IOC=TD 完=环空间可回收'},
      {k: 'ISP/BEI', v: '偏少才报 · Length 记实收 · 免中断'},
      {k: '多用途', v: '刷 Deq · 缩错误恢复窗 · 环伸缩'},
      {k: '动手', v: 'EP0 三段 TD → #m1 交互台'},
    ],
    tint: C.hc,
    w: 940,
    rowSize: 20,
  });
  view.add(sum.node);
  evt.group().opacity(0);
  xfer.group().opacity(0);
  for (const f of flags) f.ref().opacity(0);
  yield* stage.say('IOC 回执讲透——4.10 节收口，下一批 4.11。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.0);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});

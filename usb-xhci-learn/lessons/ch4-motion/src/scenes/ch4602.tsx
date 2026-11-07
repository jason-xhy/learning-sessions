// §4.6.2 No Op 空操作 —— xHCI 1.2b p93-94（最短命令，R10 批 A）
// 判据（evidence/spec-46.txt，判据唯一事实源）：
//  - "The No Op command can be issued by software to exercise the TRB Ring
//    mechanism of the xHC without affecting any xHC or USB Device state, or to
//    report the current value of the Command Ring Dequeue Pointer."
//                                                                    (L170-172, p93)
//  - Note："A No Op Command may be inserted on the Command Ring by software to
//    modify the alignment memory boundaries of Command TDs."  (L173-174, p93)
//  - 格式指路：命令 TRB=§6.4.3.1、完成事件 TRB=§6.4.2.2 (L175-177)
//  - 软件侧："TRB Type = No Op Command (refer to Table 6-91)." (L184)
//    "Clear all other fields of the command TRB to ‘0’." (L192)
//    "Cycle bit = Command Ring’s PCS flag. Refer to section 4.9.2 …" (L194-195)
//    "Write the Host Controller Doorbell with DB Target = Host Controller
//    Command."                                                       (L197-198)
//  - xHC 侧："TRB Type = Command Completion Event (refer to Table 6-91)." (L205)
//    "Command TRB Pointer = The address of the No Op Command TRB." (L207)
//    "Completion Code = Success (refer to Table 6-90)." (L209)
//    "Clear all other fields of the event TRB to ‘0’." (L211)
//    "Cycle bit = Event Ring’s PCS flag."                            (L213)
import {makeScene2D, Rect, Txt, Circle} from '@motion-canvas/2d';
import {createRef, Vector2, waitFor, ThreadGenerator} from '@motion-canvas/core';
import {C, FONT, TLx, TLy} from '../lib/theme';
import {
  buildStage,
  lanesIn,
  makeCard,
  cardIn,
  makeRing,
  makeBell,
  makeChip,
  makeNote,
  flash,
  CardApi,
  StageApi,
  RingApi,
} from '../lib/parts';

type AnyRef = {(): any};

function* fadeOut(refs: AnyRef[], d = 0.2): ThreadGenerator {
  for (const r of refs) r().opacity(0);
  yield* waitFor(d);
  for (const r of refs) {
    try {
      r().remove();
    } catch {
      /* noop */
    }
  }
}

export default makeScene2D(function* (view) {
  view.fill(C.bg);

  /* ===== 片头 ===== */
  const t1 = createRef<Txt>();
  const t2 = createRef<Txt>();
  const t3 = createRef<Txt>();
  view.add(
    <>
      <Txt ref={t1} text={'§4.6.2'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'No Op 空操作'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={88} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'No Op Command · xHCI 规范第 4 章 · p93–94'}
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
    section: '§4.6.2',
    zh: 'No Op 空操作',
    en: 'No Op Command · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.6.2 p93–94',
  });
  yield* lanesIn(stage);

  /* 双环 + 门铃 */
  const cmd: RingApi = makeRing(view, {
    y: 470, zh: '命令环 Command Ring', en: '',
    note: '驱动写入 / xHC 读取', tint: C.driver, x0: 760, x1: 1450, n: 10,
  });
  const evt: RingApi = makeRing(view, {
    y: 655, zh: '事件环 Event Ring', en: '',
    note: 'xHC 写入 / 驱动读取', tint: C.evt, x0: 760, x1: 1450, n: 10,
  });
  cmd.group().opacity(1);
  evt.group().opacity(1);
  yield* waitFor(0.2);
  cmd.markLink(); evt.markLink();
  const bell = makeBell(view, {x: TLx(1680), y: TLy(565)});
  bell.ref().opacity(1);
  yield* waitFor(0.25);

  /* ===== ① 用途：练环机制，零状态副作用 ===== */
  const q1 = makeChip(
    view,
    '"The No Op command can be issued by software to exercise the TRB Ring mechanism of the xHC without affecting any xHC or USB Device state, or to report the current value of the Command Ring Dequeue Pointer." — §4.6.2 p93',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 18},
  );
  const n1 = makeNote(
    view,
    [
      'Note（L173-174）：也可插在命令环上，',
      '调整 Command TD 的对齐内存边界。',
    ],
    {x: TLx(290), y: TLy(560), w: 540, tint: C.dim},
  );
  yield* stage.say('No Op：只练环机制，零状态副作用。', '① / 4');
  q1().opacity(0.95);
  n1().opacity(0.85);
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  q1().opacity(0);
  n1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② 软件侧：摆 No Op TRB ===== */
  const trb: CardApi = makeCard({
    title: 'No Op Command TRB',
    rows: [
      {k: 'TRB Type', v: 'No Op Command'},
      {k: '其余字段', v: '全部清 0'},
      {k: 'Cycle bit', v: '命令环 PCS'},
    ],
    tint: C.driver,
    w: 380,
    rowSize: 20,
  });
  view.add(trb.node);
  yield* cardIn(trb, new Vector2(TLx(590), TLy(290)));
  yield* stage.say('摆 No Op TRB：其余全 0，Cycle=PCS。', '② / 4');
  yield* cmd.fill(0, 'NoOp', C.driver);
  yield* cmd.enqTo(1);
  trb.ref().opacity(0);
  yield* waitFor(0.15);
  trb.ref().remove();
  const q2 = makeChip(
    view,
    '"TRB Type = No Op Command (refer to Table 6-91)." "Clear all other fields of the command TRB to ‘0’." "Cycle bit = Command Ring’s PCS flag." — §4.6.2 p93-94',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 18},
  );
  q2().opacity(0.95);
  yield* waitFor(2.3);
  q2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ 敲门铃 ===== */
  yield* stage.say('写门铃：HC 命令目标。', '③ / 4');
  yield* bell.ring('0');
  yield* waitFor(1.6);
  yield* cmd.deqTo(0, 0.4);
  yield* waitFor(0.2);

  /* ===== ④ 完成事件：CC=Success ===== */
  const c4: CardApi = makeCard({
    title: 'Command Completion Event',
    rows: [
      {k: 'TRB Type', v: 'Command Completion Event'},
      {k: 'TRB Pointer', v: '回指 No Op TRB'},
      {k: 'Completion Code', v: 'Success'},
      {k: '其余字段', v: '清 0'},
      {k: 'Cycle bit', v: '事件环 PCS'},
    ],
    tint: C.evt,
    w: 500,
    rowSize: 18,
  });
  view.add(c4.node);
  const q4 = makeChip(
    view,
    '"Completion Code = Success (refer to Table 6-90)." — §4.6.2 p94',
    {x: TLx(300), y: TLy(560), w: 560, tint: C.evt, size: 17},
  );
  yield* stage.say('回执：CC=Success，指针回指。', '④ / 4');
  yield* cardIn(c4, new Vector2(TLx(1250), TLy(270)));
  yield* evt.fill(0, 'CCE', C.evt);
  yield* evt.enqTo(1);
  q4().opacity(0.95);
  yield* evt.deqTo(0, 0.4);
  yield* evt.consume(0);
  yield* evt.deqTo(1, 0.4);
  yield* waitFor(2.4);
  q4().opacity(0);
  c4.ref().opacity(0);
  yield* waitFor(0.25);
  c4.ref().remove();

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.6.2 No Op',
    rows: [
      {k: '用途', v: '练 TRB 环机制 / 报出队指针'},
      {k: '命令侧', v: 'Type=No Op · 其余 0 · Cycle=PCS'},
      {k: '事件侧', v: 'CC=Success · 指针回指'},
      {k: '下一支', v: '§4.6.3 Enable Slot'},
    ],
    tint: C.hc,
    w: 880,
    rowSize: 20,
  });
  view.add(sum.node);
  bell.ref().opacity(0);
  yield* stage.say('最短命令走完——下一支 Enable Slot。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.2);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});

// §4.9.3 Command Ring Management 命令环管理 —— xHCI 1.2b p160-161（R12 批 A 轻片）
// 定位：命令环受理/执行机制已由 §4.6.1 机制片（ch4601）讲透——本支只讲 4.9.3
// 管理规则增量（口播互链，不重讲职责门）。
// 判据（evidence/spec-49.txt，判据唯一事实源）：
//  - "The operation of a Command Ring is identical to Transfer Rings with the
//    following exceptions:"                                      (L648-650, p160)
//  - 差异一："If the Command Ring Control Register (CRCR) is written while the
//    Command Ring is stopped (CRR = '0') the xHC shall initialize the Command Ring
//    Dequeue Pointer with the value of the Command Ring Pointer field (refer to
//    section 5.4.5)."                                            (L651-654, p160)
//  - 差异二："When the Host Controller Doorbell Register (0) is written by system
//    software, the xHC will evaluate the Command TRB pointed to by the Command Ring
//    Dequeue Pointer. Once started (by a doorbell write), the xHC processes Command
//    TRBs and advances the Command Ring Dequeue Pointer until the ring is empty."
//                                                                    (L656-660, p160)
//  - 差异三："The location of the Command Ring Dequeue Pointer is reported on the
//    Event Ring in Command Completion Events."                   (L662-663, p160)
//  - 差异四："No multi-TRB TDs are allowed on the Command Ring." (L665, p160)
//  - 同构面："Software is responsible for advancing the Enqueue pointer. It does
//    this by toggling the Cycle bit each pass through the Command Ring…A Command
//    Ring is defined as "empty" if the Dequeue Pointer is equal to the Enqueue
//    pointer. The Enqueue Pointer is defined by a Cycle bit transition."
//                                                                    (L669-675, p160)
//  - Note（L682-687, p161）：CCS 初值看 CRCR 的 RCS 位（Table 5-24 指路）；
//    "While the Command Ring is in the Running state (CRR = '1'), it may be Busy
//    (actively processing Command TRBs) or Idle (not processing Command TRBs and
//    waiting for a doorbell ring), that is, CRR is not negated when the Command Ring
//    has completed all queued commands."
import {makeScene2D, Rect, Txt} from '@motion-canvas/2d';
import {createRef, Vector2, waitFor} from '@motion-canvas/core';
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

export default makeScene2D(function* (view) {
  view.fill(C.bg);

  /* ===== 片头 ===== */
  const t1 = createRef<Txt>();
  const t2 = createRef<Txt>();
  const t3 = createRef<Txt>();
  view.add(
    <>
      <Txt ref={t1} text={'§4.9.3'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Command Ring Management'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={68} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'命令环管理 · xHCI 规范第 4 章 · p160–161'}
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
    section: '§4.9.3',
    zh: 'Command Ring Management',
    en: '命令环管理增量 · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.9.3 p160–161',
  });
  yield* lanesIn(stage);

  /* 命令环（主角）+ 事件环 + 门铃 */
  const cmd: RingApi = makeRing(view, {
    y: 470, zh: '命令环 Command Ring', en: '',
    note: '单 TRB 描述符', tint: C.driver, x0: 760, x1: 1450, n: 10,
  });
  const evt: RingApi = makeRing(view, {
    y: 655, zh: '事件环 Event Ring', en: '',
    note: 'CCE 回报 Deq 位置', tint: C.evt, x0: 760, x1: 1450, n: 10,
  });
  cmd.group().opacity(1);
  evt.group().opacity(1);
  yield* waitFor(0.2);
  cmd.markLink(); evt.markLink();
  const bell = makeBell(view, {x: TLx(1680), y: TLy(565)});
  bell.ref().opacity(1);
  yield* waitFor(0.25);

  /* ===== ① 定位：只讲管理增量（互链 4.6.1） ===== */
  const n1 = makeNote(
    view,
    [
      '互链：命令环的受理/执行机制（职责门）已由 §4.6.1 机制片',
      '（ch4601）讲透。本支只讲 4.9.3 的管理规则增量：',
      '运行方式与传输环同构，差异共四条。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.hc},
  );
  yield* stage.say('命令环机制 4.6.1 讲过——这支只讲管理增量。', '① / 6');
  n1().opacity(0.9);
  yield* flash(cmd.group, 1);
  yield* waitFor(0.3);
  yield* waitFor(4.6);
  n1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② 差异一：CRR=0 写 CRCR ===== */
  const q2 = makeChip(
    view,
    '"If the Command Ring Control Register (CRCR) is written while the Command Ring is stopped (CRR = \'0\') the xHC shall initialize the Command Ring Dequeue Pointer with the value of the Command Ring Pointer field." — §4.9.3 p160',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 17},
  );
  yield* stage.say('停着写 CRCR：Deq 直接装 Command Ring Pointer。', '② / 6');
  q2().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(4.0);
  q2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ 差异二：门铃 0 → 执行至环空 ===== */
  const q3 = makeChip(
    view,
    '"Once started (by a doorbell write), the xHC processes Command TRBs and advances the Command Ring Dequeue Pointer until the ring is empty." — §4.9.3 p160',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 18},
  );
  yield* stage.say('敲 0 号门铃：从 Deq 评估执行，直到环空。', '③ / 6');
  q3().opacity(0.95);
  yield* cmd.fill(0, 'NoOp', C.driver);
  yield* cmd.fill(1, 'EnSlot', C.driver);
  yield* cmd.enqTo(2);
  yield* waitFor(0.3);
  yield* waitFor(1.6);
  q3().opacity(0);
  yield* waitFor(0.2);
  yield* bell.ring('0');
  yield* cmd.deqTo(0, 0.4);
  yield* cmd.consume(0);
  yield* cmd.deqTo(1, 0.4);
  yield* cmd.consume(1);
  yield* cmd.deqTo(2, 0.4);
  yield* waitFor(1.0);

  /* ===== ④ 差异三：Deq 经 CCE 回报 ===== */
  const q4 = makeChip(
    view,
    '"The location of the Command Ring Dequeue Pointer is reported on the Event Ring in Command Completion Events." — §4.9.3 p160',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.evt, size: 18},
  );
  yield* stage.say('命令完成事件把 Deq 位置捎回事件环。', '④ / 6');
  q4().opacity(0.95);
  yield* evt.fill(0, 'CCE', C.evt);
  yield* evt.enqTo(1);
  yield* evt.deqTo(0, 0.4);
  yield* evt.consume(0);
  yield* evt.deqTo(1, 0.4);
  yield* waitFor(0.3);
  yield* waitFor(3.0);
  q4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ 差异四：禁多 TRB TD ===== */
  const q5 = makeChip(
    view,
    '"No multi-TRB TDs are allowed on the Command Ring." — §4.9.3 p160',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.warn, size: 18},
  );
  yield* stage.say('命令环禁多 TRB TD：命令描述符恒单格。', '⑤ / 6');
  q5().opacity(0.95);
  yield* flash(cmd.group, 1);
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  q5().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑥ 同构面 + 两个 Note ===== */
  const n6 = makeNote(
    view,
    [
      '同构面（L669-675）：Enq 由软件翻 Cycle 推进；Deq=Enq',
      '（Cycle 转换）即环空。两 Note：CCS 初值看 CRCR 的 RCS 位',
      '（Table 5-24，L682-683）；CRR=1 恒驻留——Busy/Idle 两子态，',
      '命令清空也不会把 CRR 清 0（L684-687）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver},
  );
  yield* stage.say('同构面照抄传输环；CRR=1 恒驻留，Busy/Idle 两子态。', '⑥ / 6');
  n6().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.8);
  n6().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.9.3 Command Ring Management',
    rows: [
      {k: '定位', v: '传输环同构 + 四差异（机制见 4.6.1）'},
      {k: 'CRCR', v: 'CRR=0 写入 → Deq=Ring Pointer'},
      {k: '门铃 0', v: '评估执行至环空 · Deq 经 CCE 回报'},
      {k: 'TD', v: '禁多 TRB · 描述符恒单格'},
      {k: 'CRR', v: '=1 驻留 · Busy/Idle 子态'},
      {k: '下一支', v: '§4.9.4 Event Ring Management'},
    ],
    tint: C.hc,
    w: 1000,
    rowSize: 19,
  });
  view.add(sum.node);
  bell.ref().opacity(0);
  cmd.group().opacity(0);
  evt.group().opacity(0);
  yield* stage.say('命令环增量讲完——下一支：事件环巨头。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.4);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});

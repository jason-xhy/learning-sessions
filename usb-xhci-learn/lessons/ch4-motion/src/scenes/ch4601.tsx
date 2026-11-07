// §4.6.1 Command Ring Operation 命令环运行 —— xHCI 1.2b p91-93（机制片，R10 批 A）
// 判据（evidence/spec-46.txt，判据唯一事实源；CRCR 位布局归 §5.4.5——位值不上屏，画面指路）：
//  - "The Command Ring is a dedicated TRB Ring (refer to section 4.9 for a
//    description of TRB Ring operation), which only allows those TRB types defined
//    in Table 6-91. Only one Command Ring exists per xHC instance."  (L42-44, p91)
//  - "System software is the producer of all Command TRBs and the xHC is the
//    consumer."                                                      (L45-46, p91)
//  - "The Command Ring Dequeue Pointer is an internal register maintained by the
//    xHC, which is not directly exposed to software. Its value is reported in the
//    Command TRB Pointer field of Command Completion Events."        (L47-49, p91)
//  - "The initial value of the Command Ring Dequeue Pointer is defined by the
//    Command Ring Pointer field in the Command Ring Control Register (CRCR),
//    described in section 5.4.5."；"The Command Ring Pointer field may only be
//    modified by software while the Command Ring is stopped, as indicated by the
//    Command Ring Running (CRR) flag equal to ‘0’."                  (L50-57, p91)
//  - "A Work Item on a Command Ring is called a Command Descriptor (CD). … A CD
//    shall be comprised of one Command TRB data structure."          (L58-62, p91)
//  - 发命令两步："1. Placing one or more Command Descriptors on the Command Ring
//    and 2. Ringing the Host Controller Doorbell."                   (L63-67, p91)
//  - "…software shall write the Host Controller Doorbell register (offset 0 in the
//    Doorbell Register Array), asserting the Host Controller Command value in the
//    DB Target field and ‘0’ in the DB Stream ID field."             (L68-71, p91)
//  - "The xHC, upon detecting a Host Controller Command Doorbell ring, shall
//    execute commands until the Command Ring is stopped or empty."   (L72-73, p91)
//  - Note："If multiple commands are posted to the Command Ring, they are executed
//    in order, so a delay may be incurred before a particular command is
//    executed."                                                      (L74-75, p91)
//  - "The xHC shall generate a Command Completion Event for every command. …" +
//    "The Slot ID and VF ID fields shall reflect the values of the respective
//    fields of the Command TRB that initiated the event."            (L76-81, p91)
//  - "The Primary Event Ring receives all Command Completion Events." (L82, p91)
//  - "…shall be ordered with respect to their location in the Command Ring."
//                                                                    (L89-90, p92)
//  - 停环 §4.6.1.1：写 CS 位=执行完当前命令后不再取新 CD；停稳后完成事件
//    CC=Command Ring Stopped、指针=当前出队指针；停止期 CD 归软件（可删/增/重排）；
//    再敲 HC 门铃重启                                                (L100-118, p92)
//  - 中止 §4.6.1.2：写 CA 位=在执行命令以 CC=Command Aborted 完成、出队指针推进；
//    随后生成 CC=Command Ring Stopped 事件                           (L121-136, p92)
//  - 超时软件兜底："Software shall be responsible for all command timeouts."
//    (L31-33, p90)；"If software doesn’t see CRR negated in a timely manner (for
//    example, longer than 5 seconds), then it should assume that there are larger
//    problems with the xHC and assert HCRST."                        (L164-167, p93)
//  - 中止时机注记："Only if a command is “blocked” will it be aborted."+
//    Address Device 等设备应答类命令可能挂起的例                    (L149-157, p93)
import {makeScene2D, Rect, Txt, Circle} from '@motion-canvas/2d';
import {createRef, Vector2, waitFor, all, ThreadGenerator} from '@motion-canvas/core';
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
  makeLampRow,
  makeArrow,
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
      <Txt ref={t1} text={'§4.6.1'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'命令环运行'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={88} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'Command Ring Operation · xHCI 规范第 4 章 · p91–93'}
        x={0} y={TLy(610)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
    </>,
  );
  t1().opacity(1);
  t2().opacity(1);
  yield* waitFor(0.35);
  t3().opacity(1);
  yield* waitFor(0.35);
  yield* waitFor(1.1);
  t1().opacity(0);
  t2().opacity(0);
  t3().opacity(0);
  yield* waitFor(0.3);
  t1().remove(); t2().remove(); t3().remove();

  /* ===== 舞台 ===== */
  const stage: StageApi = buildStage(view, {
    section: '§4.6.1',
    zh: '命令环运行',
    en: 'Command Ring Operation · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.6.1 p91–93',
  });
  yield* lanesIn(stage);

  /* 双环 + 门铃（命令界面常驻道具） */
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

  /* ===== ① 命令环身份 + 生产者/消费者 ===== */
  const c1: CardApi = makeCard({
    title: '命令环三识',
    rows: [
      {k: '环型', v: '专用 TRB Ring（§4.9）'},
      {k: '准入', v: '仅 Table 6-91 的 TRB 型'},
      {k: '数量', v: '每 xHC 实例 1 条'},
      {k: '分工', v: '软件生产 · xHC 消费'},
    ],
    tint: C.driver,
    w: 400,
    rowSize: 19,
  });
  view.add(c1.node);
  c1.ref().position(new Vector2(TLx(250), TLy(275)));
  const q1 = makeChip(
    view,
    '"The Command Ring is a dedicated TRB Ring … which only allows those TRB types defined in Table 6-91. Only one Command Ring exists per xHC instance." — §4.6.1 p91',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 18},
  );
  const n1 = makeNote(
    view,
    [
      '"System software is the producer of all Command TRBs and the xHC is the consumer."（L45-46）',
    ],
    {x: TLx(300), y: TLy(560), w: 560, tint: C.driver},
  );
  yield* stage.say('专用环、单实例；软件生产、xHC 消费。', '① / 9');
  c1.ref().opacity(1);
  q1().opacity(0.95);
  n1().opacity(0.85);
  yield* waitFor(0.3);
  const a1 = makeArrow(
    view,
    new Vector2(TLx(1100), TLy(378)),
    new Vector2(TLx(1100), TLy(424)),
    {color: C.driver},
  );
  a1().opacity(0.9);
  yield* waitFor(3.3);
  q1().opacity(0);
  n1().opacity(0);
  a1().opacity(0);
  yield* waitFor(0.25);
  yield* fadeOut([c1.ref, a1]);

  /* ===== ② CRCR 与出队指针 ===== */
  const c2: CardApi = makeCard({
    title: 'CRCR · 出队指针',
    rows: [
      {k: '出队指针', v: 'xHC 内部持有，不暴露'},
      {k: '上报', v: '完成事件 Command TRB Pointer'},
      {k: '初值', v: 'CRCR 指针域（§5.4.5）'},
      {k: '改写窗口', v: '仅环停止（CRR=0）时'},
    ],
    tint: C.hc,
    w: 520,
    rowSize: 19,
  });
  view.add(c2.node);
  const q2 = makeChip(
    view,
    '"Its value is reported in the Command TRB Pointer field of Command Completion Events." "…may only be modified by software while the Command Ring is stopped…" — §4.6.1 p91',
    {x: TLx(300), y: TLy(560), w: 560, tint: C.hc, size: 17},
  );
  yield* stage.say('初值出自 CRCR（§5.4.5）；停环才可改写。', '② / 9');
  yield* cardIn(c2, new Vector2(TLx(1250), TLy(270)));
  q2().opacity(0.95);
  yield* cmd.deqTo(2, 0.4);
  yield* cmd.deqTo(0, 0.4);
  yield* waitFor(2.5);
  q2().opacity(0);
  c2.ref().opacity(0);
  yield* waitFor(0.25);
  c2.ref().remove();

  /* ===== ③ CD=一个 Command TRB ===== */
  const q3 = makeChip(
    view,
    '"A Work Item on a Command Ring is called a Command Descriptor (CD). … A CD shall be comprised of one Command TRB data structure." — §4.6.1 p91',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 18},
  );
  const ch3 = makeChip(
    view,
    'CD = 1 个 Command TRB（§4.11.3 / §6.4.3）',
    {x: TLx(250), y: TLy(280), w: 360, tint: C.driver, size: 18},
  );
  yield* stage.say('工作项叫 CD，一条=一个 Command TRB。', '③ / 9');
  q3().opacity(0.95);
  ch3().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.4);
  q3().opacity(0);
  ch3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ 两步发命令：摆 TRB + 敲门铃 ===== */
  const trb: CardApi = makeCard({
    title: 'Command TRB',
    rows: [
      {k: 'TRB Type', v: '命令 TRB'},
      {k: '去向', v: '命令环 enq 位'},
      {k: 'Cycle bit', v: '命令环 PCS'},
    ],
    tint: C.driver,
    w: 380,
    rowSize: 20,
  });
  view.add(trb.node);
  yield* cardIn(trb, new Vector2(TLx(590), TLy(290)));
  yield* stage.say('两步：摆 TRB 上环，敲 HC 门铃。', '④ / 9');
  yield* cmd.fill(0, 'CmdTRB', C.driver);
  yield* cmd.enqTo(1);
  trb.ref().opacity(0);
  yield* waitFor(0.15);
  trb.ref().remove();
  const q4 = makeChip(
    view,
    '"…software shall write the Host Controller Doorbell register (offset 0 in the Doorbell Register Array), asserting the Host Controller Command value in the DB Target field and ‘0’ in the DB Stream ID field." — §4.6.1 p91',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 18},
  );
  q4().opacity(0.95);
  yield* bell.ring('0');
  yield* waitFor(2.2);
  q4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ 按序消费直到停或空 ===== */
  const q5 = makeChip(
    view,
    '"The xHC, upon detecting a Host Controller Command Doorbell ring, shall execute commands until the Command Ring is stopped or empty." Note: "If multiple commands are posted to the Command Ring, they are executed in order, so a delay may be incurred…" — §4.6.1 p91',
    {x: TLx(1090), y: TLy(250), w: 1300, tint: C.driver, size: 17},
  );
  yield* stage.say('xHC 连续取用直到停或空；多命令按序。', '⑤ / 9');
  q5().opacity(0.95);
  yield* cmd.deqTo(0, 0.4);
  yield* cmd.consume(0);
  yield* cmd.deqTo(1, 0.4);
  yield* waitFor(2.9);
  q5().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑥ 完成事件三要素 + 主事件环 ===== */
  const c6: CardApi = makeCard({
    title: 'Command Completion Event',
    rows: [
      {k: 'TRB Pointer', v: '回指命令 TRB'},
      {k: 'Completion Code', v: '完成状态'},
      {k: 'Slot ID / VF ID', v: '照抄命令 TRB'},
      {k: '去向', v: '主事件环 · 随环序'},
    ],
    tint: C.evt,
    w: 500,
    rowSize: 19,
  });
  view.add(c6.node);
  const q6 = makeChip(
    view,
    '"The Primary Event Ring receives all Command Completion Events." — §4.6.1 p91',
    {x: TLx(300), y: TLy(560), w: 560, tint: C.evt, size: 17},
  );
  yield* stage.say('每命令必有完成事件：指针回指，CC 报状态。', '⑥ / 9');
  yield* cardIn(c6, new Vector2(TLx(1250), TLy(270)));
  yield* evt.fill(0, 'CCE', C.evt);
  yield* evt.enqTo(1);
  q6().opacity(0.95);
  yield* waitFor(3.2);
  q6().opacity(0);
  c6.ref().opacity(0);
  yield* waitFor(0.25);
  c6.ref().remove();

  /* ===== ⑦ 停环 §4.6.1.1 ===== */
  const lamps = makeLampRow(view, {
    x: TLx(150), y: TLy(545), labels: ['CS', 'CA', 'CRR'], w: 210,
  });
  for (const l of lamps) l.ref().opacity(1);
  yield* all(lamps[2].on(C.ok), lamps[2].set('1'));
  const c7: CardApi = makeCard({
    title: '停环 §4.6.1.1',
    rows: [
      {k: '写 CS=1', v: '执行完当前命令后停取'},
      {k: '停稳事件', v: 'CC=Command Ring Stopped'},
      {k: '事件指针', v: '= 当前出队指针'},
      {k: '重启', v: '再敲 HC 门铃'},
    ],
    tint: C.warn,
    w: 500,
    rowSize: 19,
  });
  view.add(c7.node);
  const ch7 = makeChip(
    view,
    '停止期间：CD 归软件所有（可删 / 增 / 重排）',
    {x: TLx(300), y: TLy(612), w: 520, tint: C.dim, size: 17},
  );
  yield* stage.say('停环：写 CS 位，停稳后报 Ring Stopped。', '⑦ / 9');
  yield* cardIn(c7, new Vector2(TLx(1250), TLy(265)));
  ch7().opacity(0.95);
  yield* all(lamps[0].on(C.warn), lamps[0].set('1'));
  yield* waitFor(0.3);
  yield* lamps[2].off();
  yield* waitFor(2.6);
  ch7().opacity(0);
  c7.ref().opacity(0);
  yield* waitFor(0.25);
  c7.ref().remove();

  /* ===== ⑧ 中止 §4.6.1.2 ===== */
  const c8: CardApi = makeCard({
    title: '中止 §4.6.1.2',
    rows: [
      {k: '写 CA=1', v: '中止当前命令'},
      {k: '事件①', v: 'CC=Command Aborted'},
      {k: '出队指针', v: '推进到下一 TRB'},
      {k: '事件②', v: 'CC=Command Ring Stopped'},
    ],
    tint: C.warn,
    w: 500,
    rowSize: 19,
  });
  view.add(c8.node);
  const ch8 = makeChip(
    view,
    '仅命令“卡死”才需中止（如 Address Device 等设备应答）——实现注记',
    {x: TLx(300), y: TLy(612), w: 560, tint: C.dim, size: 16},
  );
  yield* stage.say('中止：写 CA 位，先报 Aborted。', '⑧ / 9');
  yield* cardIn(c8, new Vector2(TLx(1250), TLy(265)));
  ch8().opacity(0.95);
  yield* all(lamps[1].on(C.warn), lamps[1].set('1'));
  yield* waitFor(0.3);
  yield* lamps[1].off();
  yield* cmd.deqTo(2, 0.4);
  yield* waitFor(2.3);
  ch8().opacity(0);
  c8.ref().opacity(0);
  yield* waitFor(0.25);
  c8.ref().remove();

  /* ===== ⑨ 超时兜底 ===== */
  const n9 = makeNote(
    view,
    [
      '"Software shall be responsible for all command timeouts."（§4.6 p90，L31-33）',
      '"If software doesn’t see CRR negated in a timely manner (for example, longer than 5 seconds), then it should assume that there are larger problems with the xHC and assert HCRST."（§4.6.1 p93）',
    ],
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.warn},
  );
  yield* stage.say('超时软件兜底：CRR 久不归 0 → HCRST。', '⑨ / 9');
  n9().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.6);
  n9().opacity(0);
  yield* waitFor(0.25);
  yield* fadeOut([lamps[0].ref, lamps[1].ref, lamps[2].ref]);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.6.1 命令环运行',
    rows: [
      {k: '身份', v: '专用 TRB 环 · 软件产 xHC 消'},
      {k: '发令', v: '摆 CD 上环 → 敲 HC 门铃'},
      {k: '回执', v: '每命令必有 CCE · 主事件环'},
      {k: '管控', v: 'CS 停环 · CA 中止 · 超时软件兜底'},
    ],
    tint: C.hc,
    w: 900,
    rowSize: 20,
  });
  view.add(sum.node);
  bell.ref().opacity(0);
  yield* stage.say('机制打底——下一支：§4.6.2 No Op。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.2);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});

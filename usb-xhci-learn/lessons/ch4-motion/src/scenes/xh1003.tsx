// §4.10.3 Events 事件族 —— xHCI 1.2b p184-187（R12 批 B 中档支；4.10.3.1 Ring
// Overrun/Underrun + 4.10.3.2 Missed Service Error + 4.10.3.3 Split Transaction
// Error + 4.10.3.4 Short Packet）
// 判据（evidence/spec-410.txt，判据唯一事实源）：
//  - 4.10.3.1 判定（L736-742, p184）："If an Isoch endpoint is Running, the xHC
//    periodically schedules the endpoint as a function of the ESIT. Each ESIT the
//    xHC shall execute one Isoch TD on the endpoint's Transfer Ring. If the Isoch
//    ring is empty when the xHC is ready to perform the transfer, it shall generate
//    a Transfer Event on the Event Ring indicated by the Slot Context Interrupter
//    Target field. An IN Isoch endpoint shall set the Completion Code to Ring
//    Overrun and an OUT Isoch endpoint shall set the Completion Code to Ring
//    Underrun."
//  - 字段口径（L743-750, p184）："the TRB referenced by the Dequeue Pointer is not
//    valid. Ring Underrun and Ring Overrun Transfer Events shall clear the TRB
//    Transfer Length field to '0' and set the TRB Pointer field to the address of
//    the invalid TRB (that is, the value of the Dequeue Pointer where the Overrun
//    or Ring Underrun condition was detected)."；"mandatory for all xHCI 1.1 and
//    xHCI 1.2 compliant xHCs"（L749-750）
//  - pre-1.1 Note（L751-752, p184）："Pre-1.1 xHC implementations clear the TRB
//    Pointer field of a Ring Underrun or Ring Overrun Transfer Event TRB to '0'."
//  - 事件后状态（L759-762, p185）："After a Ring Overrun or Ring Underrun condition
//    is reported the endpoint shall remain in the Running state and be removed from
//    the Pipe Schedule. The endpoint shall be placed back on the Pipe Schedule the
//    next time system software rings the doorbell for the endpoint."
//  - IST 迟到场景（L763-781, p185）："software does not meet the Isochronous
//    Scheduling Threshold (IST) requirement"；SIA 分叉："If the SIA flag is set,
//    then the TD (and all subsequent TDs) will be transferred one ESIT late. If
//    the SIA flag is cleared, then the xHC will inspect the TD's Frame ID,
//    recognize that the TD is not within the current Valid Frame Window, and
//    generate a Missed Service Error"；resync 后续 TD 回正轨
//  - Busy/Idle Note（L788-799, p185）：Running+Busy→环看似空→Overrun/Underrun；
//    Running+Idle→门铃太晚→Missed Service Error
//  - 双事件 Note（L813-823, p186）："A late doorbell ring may result in the
//    generation of two Events; a Ring Overrun or Ring Underrun condition, being
//    followed immediately by a Missed Service Error."
//  - 4.10.3.2 MSE 定义（L826-828, p186）："A Missed Service Error Completion Code
//    indicates that the xHC was unable to complete the data transfer associated
//    with an Isoch TRB within the ESIT. The cause of the error may be due to an
//    Event Ring full condition, excessive DMA latency …"
//  - MSE 数据面（L831-832）："The data associated with the TD in error shall be
//    lost, however for the next ESIT the xHC shall advance to the next Isoch TD
//    and attempt to execute it."
//  - MSE 指针语义（L833-838）："A Missed Service Error shall utilize the Transfer
//    Event TRB format. The TRB Pointer field of Missed Service Error Transfer
//    Event shall reference the TRB that was missed and its TRB Transfer Length the
//    residue data bytes in the buffer. Since a Missed Service Error forces a
//    Transfer Event, the Event's TRB Pointer field may not reference a TRB that
//    has its IOC flag set ('1') within the skipped Isoch TD."
//  - MSE 频率与例外（L839-851）："a Missed Service Error Transfer Event shall be
//    generated for every ESIT missed. The only exception … is if an Event Ring
//    full condition prevents the posting … When the Event Ring full condition
//    clears, the xHC shall post a Missed Service Error Transfer Event for the last
//    Isoch TD (of each Transfer Ring) not completed."；CFC Note（L846-848）；
//    "A Missed Service Error shall not be reported if an Isoch transfer was not
//    completed due to another error condition"（L849-851）
//  - 4.10.3.3 Split Transaction Error（L856-868, p186-187）："This error only
//    applies to USB2 protocol endpoints for reporting an error on a split
//    transaction, for example, that the xHC was unable to schedule a required
//    complete-split transaction of a HS Split Interrupt IN transaction. If a Split
//    Transaction Error is detected, there is the possibility of data loss, and the
//    endpoint shall be halted. Note: Software shall not attempt a Soft Retry to
//    recover from a Split Transaction Error."
//  - 4.10.3.4 Short Packet（L871-878, p187）："A Short Packet Completion Code shall
//    be reported if number of bytes received was less than the TD Transfer Size
//    and the Interrupt-on Short Packet (ISP) or Interrupt on Completion (IOC) flag
//    was set to '1' in the associated Transfer TRB."；Note："If a Short Packet
//    ends between two TRBs, either of them may report a Short Packet Completion
//    Code."（L877-878）
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

export default makeScene2D(function* (view) {
  view.fill(C.bg);

  /* ===== 片头 ===== */
  const t1 = createRef<Txt>();
  const t2 = createRef<Txt>();
  const t3 = createRef<Txt>();
  view.add(
    <>
      <Txt ref={t1} text={'§4.10.3'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Events 事件族'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={84} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'环越界 · Missed Service · Split · Short Packet · p184–187'}
        x={0} y={TLy(610)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
    </>,
  );
  t1().opacity(1);
  t2().opacity(1);
  yield* waitFor(0.35);
  t3().opacity(1);
  yield* waitFor(0.35);
  yield* waitFor(0.9);
  t1().opacity(0);
  t2().opacity(0);
  t3().opacity(0);
  yield* waitFor(0.3);
  t1().remove(); t2().remove(); t3().remove();

  /* ===== 舞台 ===== */
  const stage: StageApi = buildStage(view, {
    section: '§4.10.3',
    zh: 'Events 事件族',
    en: 'Ring Over/Underrun · MSE · Split · Short Packet',
    cite: 'xHCI 1.2b §4.10.3 p184–187',
  });
  yield* lanesIn(stage);

  /* 事件环 + Isoch 传输环 + 门铃（回排演示） */
  const evt: RingApi = makeRing(view, {
    y: 470, zh: '事件环 Event Ring', en: '',
    note: '越界/错过事件', tint: C.evt, x0: 760, x1: 1450, n: 10,
  });
  const iso: RingApi = makeRing(view, {
    y: 655, zh: 'Isoch 传输环', en: '',
    note: 'ESIT 逐拍消费', tint: C.dev, x0: 760, x1: 1450, n: 10,
  });
  evt.group().opacity(1);
  iso.group().opacity(1);
  yield* waitFor(0.2);
  evt.markLink(); iso.markLink();
  const bell = makeBell(view, {x: TLx(1680), y: TLy(565)});
  yield* waitFor(0.25);

  /* ===== ① Overrun / Underrun 判定 ===== */
  const q1 = makeChip(
    view,
    '"If the Isoch ring is empty when the xHC is ready to perform the transfer, it shall generate a Transfer Event on the Event Ring indicated by the Slot Context Interrupter Target field. An IN Isoch endpoint shall set the Completion Code to Ring Overrun and an OUT Isoch endpoint shall set the Completion Code to Ring Underrun." — §4.10.3.1 p184',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.evt, size: 16},
  );
  yield* stage.say('Isoch 环取空：IN 报 Overrun，OUT 报 Underrun。', '① / 8');
  q1().opacity(0.95);
  iso.fill(0, 'TD', C.dev);
  yield* iso.enqTo(1);
  yield* iso.deqTo(0, 0.4);
  yield* iso.consume(0);
  yield* iso.deqTo(1, 0.4);
  yield* evt.fill(0, 'OR/UR', C.evt);
  yield* evt.enqTo(1);
  yield* waitFor(0.3);
  yield* waitFor(2.4);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② 字段口径 + pre-1.1 清零 ===== */
  const n2 = makeNote(
    view,
    [
      '字段口径（L743-750）：被 Deq 指的 TRB 无效——Length 清 0、',
      'TRB Pointer=检测点的 Dequeue Pointer 值。xHCI 1.1/1.2 强制。',
      'pre-1.1 Note（L751-752）：老实现把 TRB Pointer 整个清 0。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.evt},
  );
  yield* stage.say('越界事件记账：Length 清零，指针即 Deq 值。', '② / 8');
  n2().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.2);
  n2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ 事件后状态：Running + 摘排，门铃回排 ===== */
  const q3 = makeChip(
    view,
    '"After a Ring Overrun or Ring Underrun condition is reported the endpoint shall remain in the Running state and be removed from the Pipe Schedule. The endpoint shall be placed back on the Pipe Schedule the next time system software rings the doorbell for the endpoint." — §4.10.3.1 p185',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.hc, size: 16},
  );
  yield* stage.say('报完不 halt：留在 Running 摘出排程，门铃再回排。', '③ / 8');
  q3().opacity(0.95);
  yield* bell.ring('1');
  yield* iso.fill(1, 'TD', C.dev);
  yield* iso.enqTo(2);
  yield* waitFor(0.3);
  yield* waitFor(3.2);
  q3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ IST 迟到 + SIA 分叉 ===== */
  const n4 = makeNote(
    view,
    [
      '迟到场景（L763-781）：软件晚于 IST 投 TD→环空报越界；随后的',
      '门铃送来迟到的 TD——SIA=1：整批顺延一个 ESIT 照传；SIA=0：',
      'xHC 验 Frame ID 不在当前 Valid Frame Window→报 Missed Service',
      'Error，随后尝试重同步（resynchronize）Isoch 管道。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.warn},
  );
  yield* stage.say('迟到投递两走向：SIA 顺延，无 SIA 记一次错过。', '④ / 8');
  n4().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.9);
  n4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ Busy/Idle 与双事件 ===== */
  const n5 = makeNote(
    view,
    [
      'Busy/Idle 判据（L788-799）：Running+Busy→环看似空=越界；',
      'Running+Idle→门铃太晚=MSE。双事件 Note（L813-823）：一次迟到',
      '门铃可连发两件——先越界、紧跟 Missed Service Error。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.hc},
  );
  yield* stage.say('迟到一次可能连报两件：越界在前，MSE 紧跟。', '⑤ / 8');
  n5().opacity(0.9);
  yield* evt.fill(1, 'MSE', C.warn);
  yield* evt.enqTo(2);
  yield* waitFor(0.3);
  yield* waitFor(3.6);
  n5().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑥ 4.10.3.2 MSE 本体与指针语义 ===== */
  const q6 = makeChip(
    view,
    '"A Missed Service Error Completion Code indicates that the xHC was unable to complete the data transfer associated with an Isoch TRB within the ESIT. … The TRB Pointer field of Missed Service Error Transfer Event shall reference the TRB that was missed and its TRB Transfer Length the residue data bytes in the buffer. Since a Missed Service Error forces a Transfer Event, the Event\'s TRB Pointer field may not reference a TRB that has its IOC flag set (\'1\') within the skipped Isoch TD." — §4.10.3.2 p186',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.warn, size: 15},
  );
  yield* stage.say('MSE=ESIT 内没送成：指针指被跳过的 TRB。', '⑥ / 8');
  q6().opacity(0.95);
  yield* iso.fill(2, 'skip', C.warn);
  yield* flash(iso.group, 1);
  yield* waitFor(0.3);
  yield* waitFor(3.3);
  q6().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑦ MSE 频率与例外（为补丁片铺垫） ===== */
  const n7 = makeNote(
    view,
    [
      '每错过一个 ESIT 报一件（L839-841）；唯一例外=事件环满——',
      '满态解除后只为每环最后一个未完成 TD 补报（L842-845）。',
      '他错在先则不报 MSE（L849-851）。注意：事件指针允许指向',
      '被跳 TD 内无 IOC 的 TRB——这一指针语义，补丁片再深挖。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.warn},
  );
  yield* stage.say('一 ESIT 一报，环满只补末件；指针坑见补丁片。', '⑦ / 8');
  n7().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.9);
  n7().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑧ Split Transaction Error + Short Packet ===== */
  const n8a = makeNote(
    view,
    [
      '4.10.3.3 Split Transaction Error（L856-868）：仅 USB2 split 事务',
      '（如 HS Split Interrupt IN 的 complete-split 排不上）——可能丢',
      '数据、端点 halt、禁 Soft Retry（Note L867-868）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.warn},
  );
  const n8b = makeNote(
    view,
    [
      '4.10.3.4 Short Packet（L871-878）：实收少于 TD Transfer Size 且',
      'TRB 带 ISP/IOC=1 → CC=Short Packet；Note：短包恰落在两个',
      'TRB 之间时，两 TRB 任一都可报 Short Packet Completion Code。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.dev},
  );
  yield* stage.say('收官两小事件：split 错 halt，短包看标志位。', '⑧ / 8');
  n8a().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.7);
  n8a().opacity(0);
  yield* waitFor(0.2);
  n8b().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.8);
  n8b().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.10.3 Events',
    rows: [
      {k: '越界', v: 'IN=Overrun · OUT=Underrun · 不 halt'},
      {k: '迟到', v: 'SIA 顺延 / 无 SIA 记 MSE · 可双事件'},
      {k: 'MSE', v: '一 ESIT 一报 · 环满补末件 · 指针语义'},
      {k: 'split/短包', v: 'split=halt 禁重试 · 短包看 ISP/IOC'},
      {k: '下一支', v: '§4.10.4 IOC Flag'},
    ],
    tint: C.hc,
    w: 960,
    rowSize: 20,
  });
  view.add(sum.node);
  evt.group().opacity(0);
  iso.group().opacity(0);
  bell.ref().opacity(0);
  yield* stage.say('事件族四类收口——下一支：IOC 回执语义。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.2);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});

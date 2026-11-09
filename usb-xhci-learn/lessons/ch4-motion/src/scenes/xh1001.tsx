// §4.10.1 Transfer TRBs 传输 TRB 执行 —— xHCI 1.2b p170-175（R12 批 B 中档支，
// 含 4.10.1.1 Short Transfers 双形态 4.10.1.1.1/.1.2）
// 判据（evidence/spec-410.txt，判据唯一事实源）：
//  - 规模与去向："A fully configured host controller can support 255 USB Devices,
//    where each device can declare up to 31 endpoints. 30 of the endpoints may declare
//    up to 64K Streams each. This means that approximately 500M Transfer Rings may
//    exist for a single xHC."（L4-7, p170）；"Transfer Ring completions are queued on
//    Event Rings as Transfer Event TRBs for the host."          (L9-10, p170)
//  - 完成评估："When the data transfer associated with a Transfer TRB is completed,
//    the xHC will evaluate the completion status of the transfer and the Transfer TRB
//    flags to determine whether to generate a Transfer Event TRB for the Transfer
//    TRB."（L12-14, p170）
//  - IOC 规则："If upon transfer completion of a TRB the Interrupt On Completion
//    (IOC) flag is set, the xHC shall generate a Transfer Event TRB. Note the
//    generation of an Event TRB always generates an interrupt to the host. The
//    Completion Code and Length fields of the Transfer Event TRB will reflect the
//    completion status of the Transfer TRB that generated the event."
//                                                                    (L15-19, p170)
//  - Short Packet 触发："A Short Packet will trigger the generation of a Transfer
//    Event TRB on the Event Ring if the Interrupt-on-Short (ISP) or Interrupt On
//    Completion (IOC) flags are set in the TRB that the Short Packet was detected
//    on. The Completion Code field of the Transfer Event shall be set to Short
//    Packet. The Length field of the Transfer Event shall be set to the residual
//    number of bytes not written to the Transfer TRBs' data buffer."
//                                                                    (L28-34, p171)
//  - 中间 TRB 短包推进："A Short Packet may occur on an intermediate TRB of a TD. In
//    this case the xHC shall advance to the first TRB of the next TD after
//    completing the transfer."（L34-36）；Note L37-38："The xHC shall execute the
//    first Event Data TRB encountered while advancing to the end of the Short Packet
//    TD."
//  - 错误必报："The detection of an error during a transfer shall always generate a
//    Transfer Event, irrespective of whether the Interrupt-on-Short or Interrupt On
//    Completion (IOC) flags are set in the Transfer TRB."      (L39-41, p171)
//  - MSE 推进："If a Missed Service Error occurs on an intermediate TRB of a TD of an
//    Isoch endpoint the xHC shall advance to the first TRB of the next TD or the
//    Enqueue Pointer (that is, Cycle bit transition), whichever is encountered
//    first"（L42-45）
//  - halt 三步："When an error condition is encountered which requires an endpoint to
//    halt; the xHC shall stop on the TRB in error, the endpoint shall be halted, and
//    software shall use a Set TR Dequeue Pointer Command to advance the Transfer
//    Ring to the next TD."（L46-49, p171）；Cycle 转换 Note（L50-55）
//  - 事件定位："A Transfer Event TRB identifies the location of the TRB that
//    "generated the event" (the Device ID, Endpoint ID, and address of the source
//    TRB). … The location information also allows the host to update its copy of the
//    Dequeue Pointer for the Transfer Ring that generated the event."
//                                                                    (L56-62, p171)
//  - 立即生成四条件（L65-73, p171-172）：IOC TRB 完成 / ISP TRB 上 Short Packet /
//    任一 Transfer TRB 错误 / 实现相关阈值
//  - TRB Pointer Note（L83-92, p172）：事件 TRB Pointer=xHC Dequeue Pointer 最新值；
//    软件可专用 Event Data TRB 报 TD 完成，但须偶尔设 IOC 刷新 Deq 副本
//  - Event Lost Error Note（L98-102, p172）：无法生成 TD 定义的全部事件时报
//    Event Lost Error 且 halt 端点
//  - 4.10.1.1 定义（L103-112, p172）：TD Transfer Size=TD 内全部 TRB Length 之和；
//    IN 端点排包 ((TD Transfer Size - 1) / Max Packet Size) + 1；除最后一包外全
//    Max Packet Size；实收少于预期=Short Packet 条件
//  - 4.10.1.1.1 Event Data TRB 形态：xHC 两操作（L114-123）——ISP/IOC=1 的 TRB 报
//    CC=Short Packet 事件 + 自动推进 Deq 到下一 TD 开头；推进中遇 Event Data TRB
//    解析（L124-135，IOC=1→Event Data Transfer Event，CC=Short Packet，Length=TD
//    实收）；后续 Event Data TRBs 看 PAE（L136-141）；Link TRB 全解析（L142-145）；
//    无短包时全 TRB 解析（L146-148）；软件配置（L153-160）——Transfer TRB 全清
//    ISP/IOC、Event Data TRB 全设 IOC；PAE 分叉（L166-173）；无短包→最后 Event
//    Data TRB 报 Success（L174-177）；两 bullet（L186-194）
//  - 4.10.1.1.2 无 Event Data TRB 形态：软件配置（L196-202）——ISP 全设（末 TRB
//    可选）+IOC 设在最后 Transfer TRB；短包事件三字段（L203-206）；无短包→末
//    TRB 报 Success+Length=0（L207-210）；仅 ISP 的 TRB 上短包=双事件（L211-217）；
//    判 TD 完成=TRB Pointer 指末 TRB（L218-220）；总字节数公式（L221-224）
//  - TD Completion Event 三条件（L241-255, p175）：IOC+成功→Success；短包+ISP/IOC
//    →Short Packet；错误→强制事件；前事件 CC=Success（ED='0' Length=0 / ED='1'
//    EDTLA 后清零，L256-262）；后事件同 CC 同 Length+PAE/Link 两例外（L263-275）；
//    IOC+ISP 冗余 Note（L276-278）
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

export default makeScene2D(function* (view) {
  view.fill(C.bg);

  /* ===== 片头 ===== */
  const t1 = createRef<Txt>();
  const t2 = createRef<Txt>();
  const t3 = createRef<Txt>();
  view.add(
    <>
      <Txt ref={t1} text={'§4.10.1'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Transfer TRBs'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={84} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'TRB 执行 · Short Transfer 双形态 · xHCI 规范第 4 章 · p170–175'}
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
    section: '§4.10.1',
    zh: 'Transfer TRBs',
    en: 'TRB 执行 · Short Transfer 双形态 · 规范第 4 章',
    cite: 'xHCI 1.2b §4.10.1 p170–175',
  });
  yield* lanesIn(stage);

  /* 事件环 + 传输环（TRB 执行 → 事件生成主线） */
  const evt: RingApi = makeRing(view, {
    y: 470, zh: '事件环 Event Ring', en: '',
    note: 'xHC 写完成事件', tint: C.evt, x0: 760, x1: 1450, n: 10,
  });
  const xfer: RingApi = makeRing(view, {
    y: 655, zh: '传输环 Transfer Ring', en: '',
    note: 'xHC 逐 TRB 执行', tint: C.driver, x0: 760, x1: 1450, n: 10,
  });
  evt.group().opacity(1);
  xfer.group().opacity(1);
  yield* waitFor(0.2);
  evt.markLink(); xfer.markLink();
  yield* waitFor(0.25);

  /* ===== ① 规模与事件去向 ===== */
  const q1 = makeChip(
    view,
    '"A fully configured host controller can support 255 USB Devices, where each device can declare up to 31 endpoints. … approximately 500M Transfer Rings may exist for a single xHC. … Transfer Ring completions are queued on Event Rings as Transfer Event TRBs for the host." — §4.10.1 p170',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.hc, size: 17},
  );
  yield* stage.say('255 设备 × 31 端点 × 64K 流 ≈ 5 亿条传输环。', '① / 9');
  q1().opacity(0.95);
  yield* flash(xfer.group, 1);
  yield* waitFor(0.3);
  yield* waitFor(3.0);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② 完成评估 + IOC 生成 ===== */
  const q2 = makeChip(
    view,
    '"When the data transfer associated with a Transfer TRB is completed, the xHC will evaluate the completion status of the transfer and the Transfer TRB flags to determine whether to generate a Transfer Event TRB for the Transfer TRB. If upon transfer completion of a TRB the Interrupt On Completion (IOC) flag is set, the xHC shall generate a Transfer Event TRB." — §4.10.1 p170',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 16},
  );
  yield* stage.say('完成时评估状态与标志位；IOC=1 必生成事件。', '② / 9');
  q2().opacity(0.95);
  yield* xfer.fill(0, 'N IOC=1', C.driver);
  yield* xfer.enqTo(1);
  yield* xfer.deqTo(0, 0.4);
  yield* xfer.consume(0);
  yield* xfer.deqTo(1, 0.4);
  yield* evt.fill(0, 'TE', C.evt);
  yield* evt.enqTo(1);
  yield* waitFor(0.3);
  yield* waitFor(2.0);
  q2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ Short Packet 触发与推进 ===== */
  const q3 = makeChip(
    view,
    '"A Short Packet will trigger the generation of a Transfer Event TRB on the Event Ring if the Interrupt-on-Short (ISP) or Interrupt On Completion (IOC) flags are set in the TRB that the Short Packet was detected on. The Completion Code field of the Transfer Event shall be set to Short Packet. The Length field … shall be set to the residual number of bytes not written to the Transfer TRBs\' data buffer." — §4.10.1 p171',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.warn, size: 15},
  );
  yield* stage.say('短包：ISP 或 IOC 置位才报，Length 记剩余。', '③ / 9');
  q3().opacity(0.95);
  yield* xfer.fill(1, 'N short', C.warn);
  yield* evt.fill(1, 'SP', C.warn);
  yield* evt.enqTo(2);
  yield* waitFor(0.3);
  yield* waitFor(2.2);
  q3().opacity(0);
  yield* waitFor(0.2);
  const n3 = makeNote(
    view,
    [
      '短包可落在 TD 的中间 TRB（L34-36）：xHC 完成该 TRB 后直接',
      '推进到下一 TD 的首 TRB。推进沿途遇到的第一个 Event Data',
      'TRB 照样执行（Note L37-38）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.warn},
  );
  n3().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.6);
  n3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ 错误必报 + halt 三步 ===== */
  const q4 = makeChip(
    view,
    '"The detection of an error during a transfer shall always generate a Transfer Event, irrespective of whether the Interrupt-on-Short or Interrupt On Completion (IOC) flags are set in the Transfer TRB." — §4.10.1 p171',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.warn, size: 17},
  );
  const n4 = makeNote(
    view,
    [
      '需 halt 的错误（L46-49）：xHC 停在出错 TRB 上、端点置 Halted、',
      '软件用 Set TR Dequeue Pointer 把环推进到下一 TD。Isoch 的 MSE',
      '在中间 TRB 则推进到下一 TD 首或 Enqueue（L42-45）。',
    ],
    {x: TLx(1300), y: TLy(310), w: 1040, tint: C.warn},
  );
  yield* stage.say('错误无视 ISP/IOC 一律报事件；要 halt 的停下等软件。', '④ / 9');
  q4().opacity(0.95);
  yield* xfer.fill(2, 'N err', C.warn);
  yield* evt.fill(2, 'err', C.warn);
  yield* evt.enqTo(3);
  yield* waitFor(0.3);
  yield* waitFor(1.9);
  q4().opacity(0);
  yield* waitFor(0.2);
  n4().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.8);
  n4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ 事件定位与 Deq 副本回填 ===== */
  const q5 = makeChip(
    view,
    '"A Transfer Event TRB identifies the location of the TRB that "generated the event" (the Device ID, Endpoint ID, and address of the source TRB). … The location information also allows the host to update its copy of the Dequeue Pointer for the Transfer Ring that generated the event." — §4.10.1 p171',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.evt, size: 16},
  );
  yield* stage.say('事件自带定位三件：设备、端点、源 TRB 地址。', '⑤ / 9');
  q5().opacity(0.95);
  yield* evt.deqTo(0, 0.4);
  yield* evt.consume(0);
  yield* evt.deqTo(1, 0.4);
  yield* evt.consume(1);
  yield* evt.deqTo(2, 0.4);
  yield* waitFor(0.3);
  yield* waitFor(2.3);
  q5().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑥ 立即生成四条件 + TRB Pointer Note ===== */
  const n6a = makeNote(
    view,
    [
      '四条件强制立即生成事件（L65-73）：① IOC TRB 完成；',
      '② ISP TRB 上发生 Short Packet；③ 任一 Transfer TRB 错误；',
      '④ 实现相关阈值（防 TRB Ring 状态过分滞后）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.hc},
  );
  const n6b = makeNote(
    view,
    [
      'Note（L83-92）：事件 TRB Pointer=xHC Dequeue Pointer 最新值。',
      '软件可只用 Event Data TRB 报 TD 完成，但须偶尔设 IOC 刷新',
      'Deq 副本（除非声明 Event Data TRB）。防 Event Lost（L98-102）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver},
  );
  yield* stage.say('四条件让事件立即发生；指针顺带刷新 Deq 副本。', '⑥ / 9');
  n6a().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.8);
  n6a().opacity(0);
  yield* waitFor(0.2);
  n6b().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.0);
  n6b().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑦ 4.10.1.1 Short Transfers 定义 ===== */
  const n7 = makeNote(
    view,
    [
      '定义（L105-112）：TD Transfer Size=TD 内全部 TRB Length 之和；',
      'IN 端点排包 ((Size−1)/MaxPacket)+1 包，除末包外全 MaxPacket；',
      '实收字节数少于预期=Short Packet 条件。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver},
  );
  yield* stage.say('排包公式定基线，实收偏少即短包。', '⑦ / 9');
  n7().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.2);
  n7().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑧ 4.10.1.1.1 用 Event Data TRB 的短包 ===== */
  const n8a = makeNote(
    view,
    [
      'xHC 两操作（L114-123）：ISP/IOC=1 的 TRB 报 CC=Short Packet',
      '事件；自动把 Deq 推进到下一 TD 开头。推进中遇 Event Data',
      'TRB 即解析（IOC=1→事件，Length=TD 实收；L124-135）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.evt},
  );
  const n8b = makeNote(
    view,
    [
      '软件配置（L153-160）：Transfer TRB 全清 ISP/IOC、Event Data',
      'TRB 全设 IOC。后续 Event Data TRBs 是否解析看 PAE（L166-173）；',
      '无短包则末 Event Data TRB 报 Success+EDTLA（L174-177）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver},
  );
  yield* stage.say('形态一 Event Data TRB：账记在 TD 级，末位收口。', '⑧ / 9');
  xfer.fill(3, 'ED', C.evt);
  yield* xfer.enqTo(4);
  n8a().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.7);
  n8a().opacity(0);
  yield* waitFor(0.2);
  n8b().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.9);
  n8b().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑨ 4.10.1.1.2 不用 Event Data TRB + TD 完成三条件 ===== */
  const n9a = makeNote(
    view,
    [
      '软件配置（L196-202）：ISP 设全部 Transfer TRB（末位可选）、',
      'IOC 只设末位。短包事件 TRB Pointer 指发生 TRB、Length=剩余',
      '（L203-206）；无短包→末 TRB 报 Success+Length=0（L207-210）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver},
  );
  const n9b = makeNote(
    view,
    [
      '仅 ISP 的 TRB 上短包=双事件（L211-217）：短包 TRB 一件+末位',
      'IOC TRB 一件（CC 同为 Short Packet、Length 同值）。',
      'TD 完成判据=TRB Pointer 指向 TD 末 TRB（L218-220）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.warn},
  );
  yield* stage.say('形态二纯 TRB 记账：末位 IOC 收口，指针判完成。', '⑨ / 9');
  n9a().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.8);
  n9a().opacity(0);
  yield* waitFor(0.2);
  n9b().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.8);
  n9b().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.10.1 Transfer TRBs',
    rows: [
      {k: '执行', v: '完成评估+标志位 → 是否生成事件'},
      {k: '短包', v: 'ISP/IOC 触发 · CC=Short Packet · 记剩余'},
      {k: '错误', v: '无视标志必报 · halt 三步待软件'},
      {k: '双形态', v: 'Event Data 记 TD 账 / 纯 TRB 末位收口'},
      {k: '下一支', v: '§4.10.2 Errors'},
    ],
    tint: C.hc,
    w: 980,
    rowSize: 20,
  });
  view.add(sum.node);
  xfer.group().opacity(0);
  evt.group().opacity(0);
  yield* stage.say('TRB 执行讲透——下一支：错误族九小节。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.0);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});

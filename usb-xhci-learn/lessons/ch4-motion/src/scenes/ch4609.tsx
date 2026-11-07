// §4.6.9 Stop Endpoint 停止端点 —— xHCI 1.2b p118-125（R10 批 C 巨头；示例 Slot ID=1 / Endpoint ID=2 为课程示例值）
// 判据（evidence/spec-46.txt L1664-2165，判据唯一事实源）：
//  - 目的与用途："The Stop Endpoint Command is issued by software to stop the xHC
//    execution of the TDs on an endpoint. An endpoint may be stopped by software so that
//    it can temporarily take ownership of Transfer Ring TDs that had previously been
//    passed to the xHC, or to stop USB activity prior to powering down the xHC." (L1666-1669)
//  - 停止期间可改环："While the endpoint is stopped, software may add, delete, or
//    otherwise rearrange TDs on an associated Transfer Ring. For example, this command
//    allows software to insert "high-priority" TDs at the Dequeue Pointer so they will be
//    executed immediately when the ring is restarted, or to "abort" one or more TDs by
//    removing them from the ring."                            (L1670-1674, p118)
//  - 立即停+断点续传："The Stop Endpoint Command is expected to stop endpoint activity as
//    soon as possible, which may mean that it stops in the middle of a TRB. When the
//    endpoint stops, it saves the value of the TR Dequeue Pointer and DCS fields (and
//    possibly other "Opaque" state) in the Endpoint/Stream Context so that it can pick up
//    where it left off the next time its doorbell is rung, for example, if the endpoint
//    stopped after moving the first 1KB of data in a 4KB TRB, then transfer related state
//    maintained by the xHC will allow it to transfer the remaining 3KB of data when the
//    doorbell is rung. If a Set TR Dequeue Pointer Command is issued while an endpoint is
//    in the Stopped state, the transfer related state of the endpoint will be dumped when
//    the Output Endpoint/Stream Context TR Dequeue Pointer and DCS fields are overwritten."
//                                                          (L1675-1687, p118)
//  - 三场景（L1721-1748, p120）：① TD 之间 → FSE："generating a Transfer Event for the
//    endpoint with Condition Code = Stopped - Invalid Length, TRB Pointer = current
//    Dequeue Pointer value, and TRB Transfer Length = 0, then generate a Success Command
//    Completion Event" (L1725-1729)；② SPC='1' 且短包已检出 → "a Transfer Event TRB with
//    its Completion Code set to Stopped - Short Packet and its TRB Transfer Length set to
//    the value of the EDTLA … will precede the Command Completion Event TRB … referred to
//    as a Stopped Transfer Event" (L1731-1738)；③ TD 进行中无短包 → "Completion Code set
//    to Stopped, TRB Pointer = current Dequeue Pointer value, and TRB Transfer Length set
//    to the residual bytes to transfer" (L1740-1748)
//  - 停止期间丢包："While an endpoint is stopped, any USB packets received for it shall be
//    silently dropped by the xHC."                            (L1749-1750, p120)
//  - 软件三选项（L1760-1782, p120）：① Temporarily Stop——"software may restart the
//    stopped ring where it left off by simply ringing its doorbell"；② Aborting——"the
//    Set TR Dequeue Pointer Command may be used to force the xHC to dump any internal
//    state … and restart activity at the new Transfer Ring location"；③ Modifying the
//    order——"software shall first stop the endpoint … If the xHC stopped in the middle of
//    a TD, then that TD may not be modified by software, however any other TDs on the ring
//    may be"
//  - 停止动作（L1792-1816, p120）："The xHC shall stop the USB activity for the pipe."
//    "If a USB IN or OUT transaction is in-flight, it shall be completed." "ERDYs shall be
//    ignored on the pipe for that endpoint." "If LS, FS, or HS, then polling of the pipe
//    shall cease." "The current endpoint Service Opportunity (SO) shall be terminated."
//    "Stop the Transfer Ring activity for the pipe." "Remove the endpoint from the xHC's
//    Pipe Schedule." "Generate a Command Completion Event."
//  - FSE 必发："The xHC shall generate a Stopped Transfer Event every time a Transfer Ring
//    is stopped with a Stop Endpoint Command. This operation is referred to as Force
//    Stopped Event (FSE)."                                   (L1859-1862, p122)
//  - 竞态 Note："A possible race condition may occur if software, thinking an endpoint is
//    in the Running state, issues a Stop Endpoint Command however at the same time the xHC
//    asynchronously transitions the endpoint to the Halted or Error state. In this case, a
//    Context State Error may be generated for the command completion. Software may verify
//    that this case occurred by inspecting the EP State for Halted or Error when a Stop
//    Endpoint Command results in a Context State Error." (L1881-1887, p122)
//  - SP 旗标："If software is issuing the Stop Endpoint Command due to suspending a device
//    or a function on a device, it shall set the Suspend (SP) flag to '1' in the Stop
//    Endpoint Command TRB."                                  (L1789-1791, p120)
//  - 发行（L2038-2068, p123-124）："TRB Type = Stop Endpoint Command" (L2057) / "Endpoint
//    ID = ID of the target endpoint." (L2059) / "Slot ID = ID of the target Device Slot."
//    (L2061) / "Clear all other fields of the command TRB to '0'." (L2063) / "Cycle bit =
//    Command Ring's PCS flag." (L2065) / "Write the Host Controller Doorbell with DB
//    Target = Host Controller Command."                      (L2067-2068, p124)
//  - 完成事件（L2069-2161, p124-125）：打断 TD 先发 Transfer Event（ED='1' 时
//    Parameter=EventData TRB 参数、Length=EDTLA；ED='0' 时 TRB Pointer=被打断 TRB、
//    Length=残余字节；"Completion Code = Stopped" L2100）→ 再发 Command Completion
//    Event："If the Endpoint State (EP State) field equals Running: Stop the USB activity
//    … Stop the Transfer Ring activity … Write Dequeue Pointer value to the Output
//    Endpoint or Stream Context TR Dequeue Pointer field. Write CCS value to the … DCS
//    field. Removed the endpoint from the xHC's Pipe Schedule. Set the Endpoint State (EP
//    State) field to Stopped. Completion Code = Success." (L2129-2145)；EP 非 Running →
//    Context State Error (L2147-2149)；槽态不在三态 → Context State Error (L2151-2153)；
//    槽未使能 → Slot Not Enabled Error (L2155-2157)
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
  const t4 = createRef<Txt>();
  view.add(
    <>
      <Txt ref={t1} text={'§4.6.9'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Stop Endpoint'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={88} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'停止端点 · xHCI 规范第 4 章 · p118–125'}
        x={0} y={TLy(610)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
      <Txt ref={t4} text={'示例：Slot ID=1、Endpoint ID=2（Running 端点）—— 课程示例值'}
        x={0} y={TLy(690)} fontFamily={FONT.sans} fontSize={27} fill={C.faint} />
    </>,
  );
  t1().opacity(1);
  t2().opacity(1);
  yield* waitFor(0.35);
  t3().opacity(1);
  yield* waitFor(0.3);
  t4().opacity(1);
  yield* waitFor(0.3);
  yield* waitFor(0.8);
  t1().opacity(0);
  t2().opacity(0);
  t3().opacity(0);
  t4().opacity(0);
  yield* waitFor(0.3);
  t1().remove(); t2().remove(); t3().remove(); t4().remove();

  /* ===== 舞台 ===== */
  const stage: StageApi = buildStage(view, {
    section: '§4.6.9',
    zh: 'Stop Endpoint',
    en: 'Stop Endpoint Command · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.6.9 p118–125',
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

  /* 端点上下文卡（输出侧；停止后 deq/DCS 写回） */
  const ep: CardApi = makeCard({
    title: 'Endpoint Context（输出侧）',
    rows: [
      {k: 'EP State', v: 'Running'},
      {k: 'TR Deq Ptr + DCS', v: 'xHC 内部'},
      {k: 'Pipe Schedule', v: '在列'},
    ],
    tint: C.hc,
    w: 460,
    rowSize: 21,
  });
  view.add(ep.node);
  ep.ref().position(new Vector2(TLx(230), TLy(270)));
  ep.ref().opacity(1);

  /* ===== ① 目的与用途 ===== */
  const q1 = makeChip(
    view,
    '"The Stop Endpoint Command is issued by software to stop the xHC execution of the TDs on an endpoint. An endpoint may be stopped by software so that it can temporarily take ownership of Transfer Ring TDs that had previously been passed to the xHC, or to stop USB activity prior to powering down the xHC." — §4.6.9 p118',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 16},
  );
  yield* stage.say('Stop Endpoint：把管道的控制权暂时拿回软件手里。', '① / 8');
  q1().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(4.0);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② 立即停+断点续传 ===== */
  const n2 = makeNote(
    view,
    [
      '停得多快？快到可能停在 TRB 中间——但断点必须留下：',
      'TR Dequeue Pointer 与 DCS（可能还有别的 Opaque 状态）写回 Endpoint/Stream Context；',
      '4KB TRB 停在 1KB 处：门铃再敲，xHC 从断点续传剩余 3KB（L1675-1687）；',
      '停止期间若发 Set TR Dequeue Pointer，断点被覆盖=旧进度作废、从新起点重来。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc},
  );
  yield* stage.say('停在 TRB 中间也要记下断点。', '② / 8');
  n2().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.8);
  n2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ 三场景：停的时刻不同，回执就不同 ===== */
  const c3: CardApi = makeCard({
    title: '停在哪里？（L1721-1748）',
    rows: [
      {k: 'TD 之间', v: 'FSE · Stopped-Invalid Len'},
      {k: '短包已检出·SPC=\'1\'', v: 'Stopped-Short Packet'},
      {k: 'TD 进行中·无短包', v: 'Stopped · Len=残余'},
      {k: '共同点', v: 'Stopped Event 先于 CC Event'},
    ],
    tint: C.evt,
    w: 460,
    rowSize: 18,
  });
  view.add(c3.node);
  yield* stage.say('停的时刻不同，回执就不同——三场景各有其表。', '③ / 8');
  yield* cardIn(c3, new Vector2(TLx(1180), TLy(345)));
  yield* waitFor(2.8);
  c3.ref().opacity(0);
  yield* waitFor(0.2);
  c3.ref().remove();
  const q3 = makeChip(
    view,
    '"If the command is executed between TDs, then the xHC shall perform a Force Stopped Event (FSE) operation by generating a Transfer Event for the endpoint with Condition Code = Stopped - Invalid Length, TRB Pointer = current Dequeue Pointer value, and TRB Transfer Length = 0 …" — §4.6.9 p120',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.evt, size: 16},
  );
  q3().opacity(0.95);
  yield* waitFor(3.2);
  q3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ xHC 停止动作 ===== */
  const c4: CardApi = makeCard({
    title: 'xHC 停止动作（L1792-1816）',
    rows: [
      {k: 'in-flight', v: '先完成'},
      {k: 'ERDY / 轮询', v: '忽略 / 收手'},
      {k: 'SS 等 ERDY', v: '清流控'},
      {k: 'SO / Schedule', v: '终止 / 移出'},
    ],
    tint: C.hc,
    w: 460,
    rowSize: 18,
  });
  view.add(c4.node);
  yield* stage.say('停下之前：in-flight 先完成、ERDY 不理、轮询收手。', '④ / 8');
  yield* cardIn(c4, new Vector2(TLx(1180), TLy(345)));
  yield* waitFor(3.6);
  c4.ref().opacity(0);
  yield* waitFor(0.25);
  c4.ref().remove();

  /* ===== ⑤ 软件侧：摆 Stop Endpoint TRB + 敲门铃 ===== */
  const trb: CardApi = makeCard({
    title: 'Stop EP TRB',
    rows: [
      {k: 'TRB Type', v: 'Stop Endpoint'},
      {k: 'Endpoint ID', v: '2（示例）'},
      {k: 'Slot ID', v: '1（示例）'},
      {k: 'SP 旗标', v: '挂起场景=\'1\''},
      {k: 'Cycle bit', v: '命令环 PCS'},
    ],
    tint: C.driver,
    w: 500,
    rowSize: 18,
  });
  view.add(trb.node);
  yield* cardIn(trb, new Vector2(TLx(740), TLy(295)));
  yield* stage.say('摆 Stop Endpoint TRB；挂起场景记得 SP 位置 1。', '⑤ / 8');
  yield* cmd.fill(0, 'StopEP', C.driver);
  yield* cmd.enqTo(1);
  trb.ref().opacity(0);
  yield* waitFor(0.15);
  trb.ref().remove();
  const q5 = makeChip(
    view,
    '"TRB Type = Stop Endpoint Command … Endpoint ID = ID of the target endpoint. Slot ID = ID of the target Device Slot. Clear all other fields of the command TRB to \'0\'. Cycle bit = Command Ring\'s PCS flag. … Write the Host Controller Doorbell with DB Target = Host Controller Command." — §4.6.9 p123-124',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 15},
  );
  q5().opacity(0.95);
  yield* bell.ring('0');
  yield* cmd.deqTo(0, 0.4);
  yield* cmd.consume(0);
  yield* cmd.deqTo(1, 0.4);
  yield* waitFor(2.4);
  q5().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑥ 完成事件双件：Stopped 回执先来 ===== */
  const c6: CardApi = makeCard({
    title: '完成事件 · 双件（L2069-2161）',
    rows: [
      {k: '先', v: 'Transfer Event'},
      {k: '其 CC', v: 'Stopped'},
      {k: '后', v: 'Command Completion'},
      {k: '写回', v: 'DeqPtr+DCS·EP→Stopped'},
    ],
    tint: C.evt,
    w: 460,
    rowSize: 18,
  });
  view.add(c6.node);
  yield* stage.say('两颗事件：Stopped 回执先来，命令完成收尾。', '⑥ / 8');
  yield* cardIn(c6, new Vector2(TLx(1180), TLy(345)));
  yield* evt.fill(0, 'Stop', C.evt);
  yield* evt.enqTo(1);
  yield* evt.deqTo(0, 0.4);
  yield* evt.consume(0);
  yield* evt.fill(1, 'CCE', C.evt);
  yield* evt.enqTo(2);
  yield* evt.deqTo(1, 0.4);
  yield* evt.consume(1);
  yield* evt.deqTo(2, 0.4);
  ep.row(0)().text('Stopped');
  yield* flash(ep.ref, 1);
  ep.row(1)().text('已写回');
  yield* flash(ep.ref, 1);
  ep.row(2)().text('已移出');
  yield* flash(ep.ref, 1);
  yield* waitFor(3.6);
  c6.ref().opacity(0);
  yield* waitFor(0.25);
  c6.ref().remove();

  /* ===== ⑦ 竞态暗礁 ===== */
  const q7 = makeChip(
    view,
    '"A possible race condition may occur if software, thinking an endpoint is in the Running state, issues a Stop Endpoint Command however at the same time the xHC asynchronously transitions the endpoint to the Halted or Error state. In this case, a Context State Error may be generated for the command completion." — §4.6.9 p122',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.warn, size: 16},
  );
  yield* stage.say('竞态暗礁：Context State Error 不一定是真错误。', '⑦ / 8');
  q7().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.8);
  q7().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑧ 软件三选项 ===== */
  const n8 = makeNote(
    view,
    [
      '停下来之后（L1760-1782）：',
      '① 暂停意图——直接敲端点门铃，从断点继续；',
      '② 中止 TD——Set TR Dequeue Pointer 换起点（旧断点作废）；',
      '③ 重排 TD——先看事件环定位停点，停点 TRB 不可改、其余随意，改完再敲门铃。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver},
  );
  yield* stage.say('停之后：直接重启、换起点、还是先重排 TD。', '⑧ / 8');
  n8().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.8);
  n8().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.6.9 Stop Endpoint',
    rows: [
      {k: '用途', v: '停管道拿回控制权（改 TD/插队/中止）'},
      {k: '断点', v: 'Deq Ptr+DCS 写回上下文'},
      {k: '回执', v: 'Stopped Transfer Event 先于 CC'},
      {k: '竞态', v: '异步 Halted/Error → Context State Error'},
      {k: '下一支', v: '§4.6.10 Set TR Dequeue Pointer（本批）'},
    ],
    tint: C.hc,
    w: 920,
    rowSize: 20,
  });
  view.add(sum.node);
  bell.ref().opacity(0);
  ep.ref().opacity(0);
  yield* stage.say('管道停在 Stopped——断点已存，去留由软件。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.4);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});

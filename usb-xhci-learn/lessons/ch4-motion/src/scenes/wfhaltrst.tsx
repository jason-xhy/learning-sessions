// R11 批 C 全链片：halted 端点复位五步 —— §4.6.8 Reset Endpoint + §4.6.10 Set TR
// Dequeue Pointer + Ring Doorbell 端到端合并（示例 Slot ID=1 / Endpoint ID=2 为课程
// 示例值，Bulk 端点非 Control，与 ch4608/ch4610 同值）
// 判据（evidence/spec-46.txt，判据唯一事实源）：
//  - 目的："The Reset Endpoint Command is issued by software to recover from a halted
//    condition on an endpoint."                                     (L1436-1437, p114)
//  - halted 四件套："When a Transfer Ring or Stream is halted; the associated endpoint
//    is removed from the xHC's Pipe Schedule, the Doorbell Register for that pipe is
//    disabled, the state of the associated Endpoint Context is set to Halted, and any
//    subsequent packets received for the endpoint will be silently dropped."
//                                                                    (L1441-1444, p114)
//  - reset-a-pipe 全序列 Note（L1503-1522, p115）：① Reset Endpoint（TSP='0'）
//    (L1509) → ② 设备在 TT 后且 Control/Bulk：CLEAR_TT_BUFFER（L1511-1513）→
//    ③ 非 Control 端点：ENDPOINT_HALT（L1515-1517）→ ④ Set TR Dequeue Pointer，
//    清端点状态+指向起点 TRB（L1519-1520）→ ⑤ Ring Doorbell 重启管道（L1522）
//  - ① 发行："TRB Type = Reset Endpoint Command" (L1542) / TSP (L1544) /
//    "Endpoint ID = ID of the target endpoint." (L1546) / "Slot ID = ID of the target
//    Device Slot." (L1548) / "Cycle bit = Command Ring's PCS flag." (L1552) /
//    "Write the Host Controller Doorbell with DB Target = Host Controller Command
//    (DB Stream ID = '0')."                                         (L1554, p116)
//  - ① 完成三件套："Set the Endpoint Context EP State field to Stopped." (L1481) /
//    "Enable the Doorbell Register for the pipe." (L1483) / CC=Success (L1485)；事件侧
//    EP=Halted → Stopped（L1572-1574）/ 门铃使能（L1580）/ CC=Success（L1582）
//  - ⑤ 管道回归："After the command completes, the Transfer Ring will be reinstated on
//    the xHC's Pipe Schedule the next time its doorbell is rung."  (L1486-1487, p115)
//  - ④ 前提："This command may be executed only if the target endpoint is in the Error
//    or Stopped state."                                             (L2175-2176, p125)
//  - ④ 执行动作："Set the Dequeue Pointer to the value of the New TR Dequeue Pointer
//    field…" (L2197-2198) / "Invalidate any xHC TDs that may be cached…" (L2200-2202) /
//    "Copy the value of the New TR Dequeue Pointer field…to the TR Dequeue Pointer
//    field of the target Endpoint or Stream Context." (L2204-2206) / "Clear any prior
//    transfer state, for example, setting the EDTLA to 0…" (L2208-2209) / CCE+Success
//                                                                    (L2211-2212, p126)
//  - ④ 发行：TRB Type (L2226) / "Endpoint ID = ID of the target endpoint." (L2228) /
//    "Slot ID = ID of the target Device Slot." (L2233) / "New TR Dequeue Pointer = The
//    new TR Dequeue Pointer field value for the target endpoint." (L2235-2236) /
//    "Cycle bit = Command Ring's PCS flag." (L2243) / 敲 DB0（L2251-2252, p127）
//  - ④ 完成事件：EP=Stopped/Error 前提（L2273）；Stream ID='0' 且 MaxPStreams='0' →
//    "Copy the value of the New TR Dequeue Pointer field to the TR Dequeue Pointer
//    field of the target Endpoint Context." + DCS 同拷 + "Completion Code = Success."
//                                                                    (L2293-2303, p127)
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
      <Txt ref={t1} text={'wf · 全链'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'halted 端点复位五步'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={88} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'Reset Endpoint → Set TR Dequeue Pointer → Ring Doorbell'}
        x={0} y={TLy(610)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
      <Txt ref={t4} text={'示例：Slot ID=1、Endpoint ID=2（课程示例值）· 规范 p114-127'}
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
    section: '全链',
    zh: 'halted 端点复位五步',
    en: 'xHCI 1.2b · Reset Endpoint → Set TR Dequeue Pointer → Ring Doorbell',
    cite: '§4.6.8+§4.6.10 p114–127',
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

  /* 端点上下文卡（输出侧；全片翻转对象：Halted→Stopped→Running） */
  const ep: CardApi = makeCard({
    title: 'Endpoint Context（输出侧）',
    rows: [
      {k: 'EP State', v: 'Halted'},
      {k: 'Doorbell', v: '已禁用'},
      {k: 'Pipe Schedule', v: '已移出'},
    ],
    tint: C.hc,
    w: 460,
    rowSize: 21,
  });
  view.add(ep.node);
  ep.ref().position(new Vector2(TLx(230), TLy(300)));
  ep.ref().opacity(1);

  /* ===== 幕① 事故现场：halted 四件套（L1441-1444） ===== */
  const q1 = makeChip(
    view,
    '"When a Transfer Ring or Stream is halted; the associated endpoint is removed from the xHC\'s Pipe Schedule, the Doorbell Register for that pipe is disabled, the state of the associated Endpoint Context is set to Halted, and any subsequent packets received for the endpoint will be silently dropped." — §4.6.8 p114',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.warn, size: 16},
  );
  yield* stage.say('管道 halt 之后，光靠它是不会自己好的。', '① / 6');
  q1().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== 幕② 第①步 Reset Endpoint（TSP='0'，发行 L1542-1554 / 完成三件套 L1572-1582） ===== */
  const trb: CardApi = makeCard({
    title: 'Reset EP TRB',
    rows: [
      {k: 'TRB Type', v: 'Reset Endpoint'},
      {k: 'TSP', v: '\'0\'（\'1\'=SoftRetry）'},
      {k: 'Endpoint ID', v: '2（示例）'},
      {k: 'Slot ID', v: '1（示例）'},
      {k: 'Cycle bit', v: '命令环 PCS'},
    ],
    tint: C.driver,
    w: 500,
    rowSize: 18,
  });
  view.add(trb.node);
  yield* cardIn(trb, new Vector2(TLx(740), TLy(295)));
  yield* stage.say('第①步 Reset Endpoint：复位一根管道要五步——这只是第一步。', '② / 6');
  yield* cmd.fill(0, 'RstEP', C.driver);
  yield* cmd.enqTo(1);
  trb.ref().opacity(0);
  yield* waitFor(0.15);
  trb.ref().remove();
  const q2 = makeChip(
    view,
    '"If the Endpoint State (EP State) field is set to Halted: Set the Endpoint State (EP State) field to Stopped. … Enable the Doorbell register for the endpoint. Completion Code = Success" — §4.6.8 p116',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.evt, size: 15},
  );
  q2().opacity(0.95);
  yield* bell.ring('0');
  yield* cmd.deqTo(0, 0.4);
  yield* cmd.consume(0);
  yield* cmd.deqTo(1, 0.4);
  yield* evt.fill(0, 'CCE', C.evt);
  yield* evt.enqTo(1);
  yield* evt.deqTo(0, 0.4);
  yield* evt.consume(0);
  yield* evt.deqTo(1, 0.4);
  ep.row(0)().text('Stopped');
  yield* flash(ep.ref, 1);
  yield* waitFor(0.4);
  ep.row(1)().text('已使能');
  yield* flash(ep.ref, 1);
  yield* waitFor(2.4);
  q2().opacity(0);
  yield* waitFor(0.25);

  /* ===== 幕③ 第②③步 条件步（对设备侧/TT；L1503-1522 Note 骨架，②=L1511-1513 ③=L1515-1517） ===== */
  const n3a = makeNote(
    view,
    [
      '「复位一根管道」全序列的条件步（Note L1503-1522）：',
      '② 设备在 TT 后且为 Control/Bulk → 向 hub 发 ClearFeature(CLEAR_TT_BUFFER)',
      '③ 非 Control 端点 → 向设备发 ClearFeature(ENDPOINT_HALT)，清设备侧 stall',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc},
  );
  yield* stage.say('第②③步是条件步：只看设备形态——TT 后清 TT 缓冲，非 Control 清 stall。', '③ / 6');
  n3a().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.6);
  n3a().opacity(0);
  yield* waitFor(0.2);
  const n3b = makeNote(
    view,
    [
      '本例 EP2 是 Bulk（非 Control）→ 走 ③ ENDPOINT_HALT，向设备清 stall；',
      '课程示例设为直连（无 TT）→ ② CLEAR_TT_BUFFER 跳过；',
      '这两步管的是设备侧/TT 缓解——xHC 侧的端点账本，交给下一命令。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc},
  );
  n3b().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.6);
  n3b().opacity(0);
  yield* waitFor(0.25);

  /* ===== 幕④ 第④步 Set TR Dequeue Pointer（前提 L2175-2176 / 动作 L2197-2212 / 事件 L2293-2303） ===== */
  const trb4: CardApi = makeCard({
    title: 'SetDeqPtr TRB',
    rows: [
      {k: 'TRB Type', v: 'Set TR Deq Ptr'},
      {k: 'New Deq Ptr', v: 'Transfer Ring 起点 TRB'},
      {k: 'Endpoint ID', v: '2（示例）'},
      {k: 'Slot ID', v: '1（示例）'},
      {k: 'Cycle bit', v: '命令环 PCS'},
    ],
    tint: C.driver,
    w: 500,
    rowSize: 17,
  });
  view.add(trb4.node);
  yield* cardIn(trb4, new Vector2(TLx(740), TLy(295)));
  yield* stage.say('第④步 Set TR Dequeue Pointer：队列头指回起点——xHC 侧的账本在这清。', '④ / 6');
  yield* cmd.fill(1, 'SetDeq', C.driver);
  yield* cmd.enqTo(2);
  trb4.ref().opacity(0);
  yield* waitFor(0.15);
  trb4.ref().remove();
  const n4 = makeNote(
    view,
    [
      'xHC 收令簿记（L2197-2209）：出队指针改写为 TRB 里的 New Deq Ptr；',
      '失效全部缓存 TD——管道回 Running 时强制回内存重取；清残余状态（EDTLA 归 0）；',
      '完成事件把 New Deq Ptr 与 DCS 逐字拷入 Endpoint Context（L2297-2303）。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc},
  );
  n4().opacity(0.9);
  yield* bell.ring('0');
  yield* cmd.deqTo(1, 0.4);
  yield* cmd.consume(1);
  yield* cmd.deqTo(2, 0.4);
  yield* evt.fill(1, 'CCE', C.evt);
  yield* evt.enqTo(2);
  yield* evt.deqTo(1, 0.4);
  yield* evt.consume(1);
  yield* evt.deqTo(2, 0.4);
  yield* waitFor(1.8);
  n4().opacity(0);
  yield* waitFor(0.2);
  const q4 = makeChip(
    view,
    '"If MaxPStreams = \'0\': Copy the value of the New TR Dequeue Pointer field to the TR Dequeue Pointer field of the target Endpoint Context. Copy the value of the Dequeue Cycle State (DCS) field to the Dequeue Cycle State (DCS) field of the target Endpoint Context. … Completion Code = Success." — §4.6.10 p127',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.evt, size: 15},
  );
  q4().opacity(0.95);
  yield* waitFor(3.2);
  q4().opacity(0);
  yield* waitFor(0.25);

  /* ===== 幕⑤ 第⑤步 Ring Doorbell（端点门铃 DB Target=EP ID；管道回归 L1486-1487） ===== */
  const q5 = makeChip(
    view,
    '"After the command completes, the Transfer Ring will be reinstated on the xHC\'s Pipe Schedule the next time its doorbell is rung." — §4.6.8 p115',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc, size: 16},
  );
  yield* stage.say('第⑤步 Ring Doorbell：这回敲的是端点门铃——DB Target=EP ID=2，不是第①步的命令门铃 DB0。', '⑤ / 6');
  yield* bell.ring('2');
  q5().opacity(0.95);
  yield* waitFor(0.3);
  ep.row(2)().text('Running（恢复）');
  yield* flash(ep.ref, 1);
  yield* waitFor(6.6);
  q5().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口：五步全景 + 逐命令走读 ===== */
  const sum: CardApi = makeCard({
    title: '全链 · halted 端点复位五步',
    rows: [
      {k: '①', v: 'Reset EP（TSP=\'0\'）——清账本+失效缓存'},
      {k: '② 仅TT后', v: 'CLEAR_TT_BUFFER'},
      {k: '③ 仅非Control', v: 'ENDPOINT_HALT——清设备侧 stall'},
      {k: '④⑤', v: 'Set TR Dequeue Ptr → Ring Doorbell'},
      {k: '走读', v: '§4.6.8=ch4608 片 · §4.6.10=ch4610 片'},
    ],
    tint: C.hc,
    w: 920,
    rowSize: 18,
  });
  view.add(sum.node);
  bell.ref().opacity(0);
  ep.ref().opacity(0);
  yield* stage.say('五步走完：Halted→Stopped→Running——细节回看 ch4608 与 ch4610 两支片。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(5.4);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});

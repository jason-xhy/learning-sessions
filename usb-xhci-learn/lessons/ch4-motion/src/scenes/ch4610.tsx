// §4.6.10 Set TR Dequeue Pointer 设置传输环出队指针 —— xHCI 1.2b p125-128（R10 批 C；示例 Slot ID=1 / Endpoint ID=2 为课程示例值）
// 判据（evidence/spec-46.txt L2166-2346，判据唯一事实源）：
//  - 目的："The Set TR Dequeue Pointer Command is issued by software to modify the TR
//    Dequeue Pointer field of an Endpoint or Stream Context." (L2168-2169, p125)
//  - 目标寻址："The Slot ID and Endpoint ID fields of the Set TR Dequeue Pointer Command
//    TRB identify the USB device, and the endpoint of that device, that is the target of
//    the command. If Streams are enabled for the endpoint, the Set TR Dequeue Pointer
//    Command TRB Stream ID field identifies the Stream Context that shall be modified."
//                                                          (L2170-2174, p125)
//  - 状态前提："This command may be executed only if the target endpoint is in the Error
//    or Stopped state."                                      (L2175-2176, p125)
//  - 执行动作（L2188-2212, p126）：非 Error/Stopped → "reject the command and generate a
//    Command Completion Event with the Completion Code set to Context State Error"
//    (L2189-2193)；否则 "Set the Dequeue Pointer to the value of the New TR Dequeue
//    Pointer field in the Set TR Dequeue Pointer TRB." (L2197-2198) "Invalidate any xHC
//    TDs that may be cached, forcing xHC to fetch Transfer TRBs from memory when the pipe
//    transitions from the Stopped to the Running state." (L2200-2202) "Clear any prior
//    transfer state, for example, setting the EDTLA to 0, clearing any partially completed
//    USB2 split transactions, etc." (L2208-2209) "Generate a Command Completion Event with
//    the Completion Code set to Success."                    (L2211-2212, p126)
//  - 发行（L2220-2252, p126-127）："TRB Type = Set TR Dequeue Pointer Command" (L2226) /
//    "Endpoint ID = ID of the target endpoint." (L2228) / "Stream ID = ID of the target
//    Stream Context or '0' if MaxPStreams = '0'." (L2230-2231) / "Slot ID = ID of the
//    target Device Slot." (L2233) / "New TR Dequeue Pointer = The new TR Dequeue Pointer
//    field value for the target endpoint." (L2235-2236) / "Dequeue Cycle State (DCS) = The
//    state of the xHCI CCS flag for the TRB pointed to by the TR Dequeue Pointer field."
//    (L2238-2239) / "Cycle bit = Command Ring's PCS flag." (L2243) / "Write the Host
//    Controller Doorbell with DB Target = Host Controller Command."  (L2251-2252, p127)
//  - 完成事件（L2253-2319, p127）：槽使能且 Slot State 三态内 → "If the Endpoint State
//    (EP State) field equals Stopped or Error:" (L2273) → Stream ID 非零：边界检查有效 →
//    "Copy the value of the New TR Dequeue Pointer field to the TR Dequeue Pointer field
//    of the target Stream Context." + DCS 同拷 + "Completion Code = Success"
//    (L2281-2287)；Stream ID 无效 → "Completion Code = TRB Error" (L2289-2291)；
//    Stream ID='0' 且 MaxPStreams='0' → 拷到 Endpoint Context + Success (L2293-2303)；
//    MaxPStreams>'0' → TRB Error (L2305-2307)；EP 非 Stopped/Error → Context State Error
//    (L2309-2311)；槽态不在三态 → Context State Error (L2313-2315)；槽未使能 → Slot Not
//    Enabled Error                                           (L2317-2319, p127)
//  - 时机 Note 三条（p126/128）：部分执行的 TD——"any remaining TRBs in that TD shall not
//    be executed when the endpoints' TR Dequeue Pointer is updated" (L2213-2215, p126)；
//    指向部分完成 TRB——"the xHC shall treat that TRB as the first TRB of the TD. that is,
//    any prior state associated with a partially completed TRB is lost" (L2339-2342,
//    p128)；及时发命令——"software shall issue a Set TR Dequeue Pointer Command for the
//    pipe when the data transfer is terminated, vs. waiting for the next data transfer to
//    be ready"（读-ahead 缓存及时释放）              (L2330-2338, p128)
//  - 与 Reset Endpoint 配合（§4.6.8 L1519-1525, p115）："Issue a Set TR Dequeue Pointer
//    Command, clear the endpoint state and reference the TRB to start. Ring Doorbell to
//    restart the pipe. The Set TR Dequeue Pointer Command resets the state of the endpoint
//    so that the xHC starts transferring data at the beginning of the TRB referenced by
//    the TR Dequeue Pointer (rather than at the location associated with the previous
//    packet that caused the halt) when the doorbell is rung."
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
      <Txt ref={t1} text={'§4.6.10'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Set TR Dequeue Pointer'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={88} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'设置传输环出队指针 · xHCI 规范第 4 章 · p125–128'}
        x={0} y={TLy(610)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
      <Txt ref={t4} text={'示例：Slot ID=1、Endpoint ID=2（Stopped 端点）—— 课程示例值'}
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
    section: '§4.6.10',
    zh: 'Set TR Dequeue Pointer',
    en: 'Set TR Dequeue Pointer Command · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.6.10 p125–128',
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

  /* 端点上下文卡（输出侧；本命令要翻的字段=TR Deq Ptr + DCS） */
  const ep: CardApi = makeCard({
    title: 'Endpoint Context（输出侧）',
    rows: [
      {k: 'EP State', v: 'Stopped'},
      {k: 'TR Deq Ptr', v: '旧值'},
      {k: 'DCS', v: '旧值'},
      {k: '残余状态', v: 'EDTLA / split 态'},
    ],
    tint: C.hc,
    w: 460,
    rowSize: 20,
  });
  view.add(ep.node);
  ep.ref().position(new Vector2(TLx(230), TLy(270)));
  ep.ref().opacity(1);

  /* ===== ① 目的与前提 ===== */
  const q1 = makeChip(
    view,
    '"The Set TR Dequeue Pointer Command is issued by software to modify the TR Dequeue Pointer field of an Endpoint or Stream Context. … This command may be executed only if the target endpoint is in the Error or Stopped state." — §4.6.10 p125',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 17},
  );
  yield* stage.say('设置出队指针：给传输环指定新的起点。', '① / 7');
  q1().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.0);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② xHC 动作三件套 ===== */
  const n2 = makeNote(
    view,
    [
      'xHC 收令三件事（L2197-2212）：出队指针改写为 TRB 里的新值；',
      '失效全部缓存 TD——管道从 Stopped 回 Running 时强制回内存重取；',
      '清干净残余传输状态（EDTLA 归 0、split 事务清零）——然后 CC=Success。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc},
  );
  yield* stage.say('换起点=指针改写+缓存失效+残余清零。', '② / 7');
  n2().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.2);
  n2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ 软件侧：摆 Set TR Dequeue Pointer TRB + 敲门铃 ===== */
  const trb: CardApi = makeCard({
    title: 'SetDeqPtr TRB',
    rows: [
      {k: 'TRB Type', v: 'Set TR Deq Ptr'},
      {k: 'EP / Slot ID', v: '2 / 1（示例）'},
      {k: 'Stream ID', v: '\'0\'（MaxPStreams=\'0\'）'},
      {k: 'New Deq Ptr·DCS', v: '新起点+配套 CCS'},
      {k: 'Cycle bit', v: '命令环 PCS'},
    ],
    tint: C.driver,
    w: 500,
    rowSize: 17,
  });
  view.add(trb.node);
  yield* cardIn(trb, new Vector2(TLx(740), TLy(295)));
  yield* stage.say('摆 TRB：新指针与 DCS 必须配套——指哪、哪的 cycle。', '③ / 7');
  yield* cmd.fill(0, 'SetDeq', C.driver);
  yield* cmd.enqTo(1);
  trb.ref().opacity(0);
  yield* waitFor(0.15);
  trb.ref().remove();
  const q3 = makeChip(
    view,
    '"TRB Type = Set TR Dequeue Pointer Command … Stream ID = ID of the target Stream Context or \'0\' if MaxPStreams = \'0\'. … New TR Dequeue Pointer = The new TR Dequeue Pointer field value for the target endpoint. Dequeue Cycle State (DCS) = The state of the xHCI CCS flag for the TRB pointed to by the TR Dequeue Pointer field. …" — §4.6.10 p126',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 15},
  );
  q3().opacity(0.95);
  yield* bell.ring('0');
  yield* cmd.deqTo(0, 0.4);
  yield* cmd.consume(0);
  yield* cmd.deqTo(1, 0.4);
  yield* waitFor(2.4);
  q3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ 完成事件分支 ===== */
  const c4: CardApi = makeCard({
    title: '完成事件分支（L2273-2319）',
    rows: [
      {k: '受理前提', v: 'Stopped/Error'},
      {k: 'Stream 有效', v: '拷 NewDeq+DCS·Success'},
      {k: 'Stream 无效', v: 'TRB Error'},
      {k: 'EP 非两态', v: 'Context State Error'},
    ],
    tint: C.evt,
    w: 460,
    rowSize: 17,
  });
  view.add(c4.node);
  yield* stage.say('受理前提=端点在 Stopped/Error。', '④ / 7');
  yield* cardIn(c4, new Vector2(TLx(1180), TLy(345)));
  yield* waitFor(2.8);
  c4.ref().opacity(0);
  yield* waitFor(0.2);
  c4.ref().remove();
  const q4 = makeChip(
    view,
    '"If the Endpoint State (EP State) field equals Stopped or Error: If the Stream ID field is non-zero a Stream Context is referenced … If the Stream ID is valid: Copy the value of the New TR Dequeue Pointer field to the TR Dequeue Pointer field of the target Stream Context. … Completion Code = Success … else … Completion Code = TRB Error." — §4.6.10 p127',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.evt, size: 15},
  );
  q4().opacity(0.95);
  yield* evt.fill(0, 'CCE', C.evt);
  yield* evt.enqTo(1);
  yield* evt.deqTo(0, 0.4);
  yield* evt.consume(0);
  yield* evt.deqTo(1, 0.4);
  yield* waitFor(2.8);
  q4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ 输出侧翻转：指针/DCS 换新、残余清零 ===== */
  yield* stage.say('输出侧落账：TR Deq Ptr 与 DCS 换新。', '⑤ / 7');
  ep.row(1)().text('新值');
  yield* flash(ep.ref, 1);
  ep.row(2)().text('新值');
  yield* flash(ep.ref, 1);
  ep.row(3)().text('已清零');
  yield* flash(ep.ref, 1);
  const q5 = makeChip(
    view,
    '"Copy the value of the New TR Dequeue Pointer field to the TR Dequeue Pointer field of the target Endpoint Context. Copy the value of the Dequeue Cycle State (DCS) field to the Dequeue Cycle State (DCS) field of the target Endpoint Context. … Clear any prior transfer state, for example, setting the EDTLA to 0…" — §4.6.10 p126',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc, size: 16},
  );
  q5().opacity(0.95);
  yield* waitFor(3.2);
  q5().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑥ 时机三条 + 与 Reset Endpoint 配合 ===== */
  const n6 = makeNote(
    view,
    [
      '时机三条（p126/128）：部分执行的 TD，剩余 TRB 一律不再执行；',
      '新指针指向部分完成的 TRB=当作 TD 首个 TRB，先前进度作废；',
      '数据传输终止后应尽快发本命令——及时释放 xHC 的读-ahead 缓存。',
      '与 §4.6.8 配合：reset-a-pipe 序列的第 ④ 步正是它（清状态+指起点）。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.warn},
  );
  yield* stage.say('进度作废是语义不是事故——换起点就是从头来。', '⑥ / 7');
  n6().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.0);
  n6().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.6.10 Set TR Dequeue Pointer',
    rows: [
      {k: '用途', v: '改传输环出队指针（Error/Stopped 态）'},
      {k: '动作', v: '改指针+失效缓存+清残余'},
      {k: 'TRB', v: 'New Deq Ptr 与 DCS 配套'},
      {k: '事件', v: 'Stream ID 分支 + CC 四族'},
      {k: '下一支', v: '§4.6.11 Reset Device（已上线）'},
    ],
    tint: C.hc,
    w: 920,
    rowSize: 20,
  });
  view.add(sum.node);
  bell.ref().opacity(0);
  ep.ref().opacity(0);
  yield* stage.say('指针落定——下一记门铃，从新起点跑。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.4);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});

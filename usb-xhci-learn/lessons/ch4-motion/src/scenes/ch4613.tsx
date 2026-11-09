// §4.6.13 Negotiate Bandwidth 带宽协商 —— xHCI 1.2b p131-133（R10 批 D；Optional Normative）
// 判据（evidence/spec-46.txt L2549-2667，判据唯一事实源）：
//  - 目的："The Negotiate Bandwidth Command is used by system software to initiate
//    Bandwidth Request Events for periodic endpoints. This command should be used
//    to recover unused USB bandwidth from the system."  (L2551-2553, p131)
//  - BNC 门："If the BW Negotiation Capability (BNC) bit in the HCCPARAMS1 register
//    is '1', the xHC shall support this command." (L2554-2555, p131)；"This command
//    shall complete with a Success Completion Code if the command is supported, or
//    a TRB Error Completion Code if the command is not supported."
//                                                          (L2556-2557, p131)
//  - 批量发事件："The xHC shall generate Bandwidth Request Events upon the reception
//    of the command to all target periodic endpoints. The command will complete
//    when all Bandwidth Request Events have been generated." (L2564-2566, p132)
//  - 发行（L2572-2587, p131-132）："TRB Type = Negotiate Bandwidth Command (refer
//    to Table 6-91)." (L2578) / "Slot ID = The ID of the slot that requires the
//    bandwidth negotiation." (L2580) / "Clear all other fields of the command TRB
//    to '0'." (L2582) / "Cycle bit = Command Ring's PCS flag." (L2584) / "Write
//    the Host Controller Doorbell with DB Target = Host Controller Command."
//                                                          (L2586-2587)
//  - 执行（L2588-2623, p132）：命令受支持→槽已使能→槽在 Addressed/Configured 态→
//    "For each device, identify the target Event Ring (specified by the Interrupt
//    Target field of the device's Slot Context)." (L2602-2603)；"If there is space
//    on the device's target Event Ring: Insert a Bandwidth Request Event and
//    initialize the following fields: TRB Type = Bandwidth Request Event … Slot ID
//    = ID of the device slot. Completion Code = Success … Cycle bit = Device's
//    target Event Ring's PCS flag." (L2605-2617)；"else // No space on the device's
//    target Event Ring · Skip the device. Completion Code = Success"
//                                                          (L2619-2623)
//  - 错误分支（L2631-2642, p133）：槽不在 Addressed/Configured 态→"Completion Code
//    = Context State Error."；槽未使能→"Completion Code = Slot Not Enabled Error"；
//    命令不受支持→"Completion Code = TRB Error."
//  - 完成事件插 Interrupter 0："Insert a Command Completion Event on the Event Ring
//    of Interrupter 0"                                     (L2644, p133)
//  - Note unsolicited："System software should immediately honor an unsolicited
//    Bandwidth Request Event and free unused USB bandwidth by selecting lower
//    bandwidth alternate configurations or interfaces on the devices that it owns."
//                                                          (L2661-2663, p133)
//  - Note 环满丢弃："If the target Event Ring for a device is full, the Bandwidth
//    Request Event shall be dropped by the xHC."           (L2664-2665, p133)
//  - Note 同槽也发："The xHCI may generate a Bandwidth Request Event for the same
//    slot that a Negotiate Bandwidth Command was issued to." (L2666-2667, p133)
//  - 诚实定位：Linux xHCI 主机驱动不使用（drivers/usb/host/*.c 零发行；xhci.h 仅定义
//    TRB_NEG_BANDWIDTH=19）——教学主体为规范机制本身。
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
      <Txt ref={t1} text={'§4.6.13'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Negotiate Bandwidth'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={88} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'带宽协商 · xHCI 规范第 4 章 · p131–133 · 可选规范项'}
        x={0} y={TLy(610)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
      <Txt ref={t4} text={'诚实定位：Linux xHCI 主机驱动不使用本命令——教学主体为规范机制'}
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
  yield* waitFor(0.7);
  t1().opacity(0);
  t2().opacity(0);
  t3().opacity(0);
  t4().opacity(0);
  yield* waitFor(0.3);
  t1().remove(); t2().remove(); t3().remove(); t4().remove();

  /* ===== 舞台 ===== */
  const stage: StageApi = buildStage(view, {
    section: '§4.6.13',
    zh: 'Negotiate Bandwidth',
    en: 'Negotiate Bandwidth Command · 带宽协商 · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.6.13 p131–133',
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

  /* ===== ① 目的：回收闲置带宽 ===== */
  const q1 = makeChip(
    view,
    '"The Negotiate Bandwidth Command is used by system software to initiate Bandwidth Request Events for periodic endpoints. This command should be used to recover unused USB bandwidth from the system." — §4.6.13 p131',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 17},
  );
  yield* stage.say('带宽协商：向周期端点发请求回收闲置带宽。', '① / 5');
  q1().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② BNC 能力门 ===== */
  const q2 = makeChip(
    view,
    '"If the BW Negotiation Capability (BNC) bit in the HCCPARAMS1 register is \'1\', the xHC shall support this command." "This command shall complete with a Success Completion Code if the command is supported, or a TRB Error Completion Code if the command is not supported." — §4.6.13 p131',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc, size: 16},
  );
  yield* stage.say('BNC=1 才必须支持；不支持报 TRB Error。', '② / 5');
  q2().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.8);
  q2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ 软件侧：摆 Negotiate Bandwidth TRB + 敲门铃 ===== */
  const trb: CardApi = makeCard({
    title: 'NegBw TRB',
    rows: [
      {k: 'TRB Type', v: 'Negotiate Bandwidth'},
      {k: 'Slot ID', v: '待协商槽'},
      {k: '其余字段', v: '清 0'},
      {k: 'Cycle bit', v: '命令环 PCS'},
    ],
    tint: C.driver,
    w: 480,
    rowSize: 19,
  });
  view.add(trb.node);
  yield* cardIn(trb, new Vector2(TLx(740), TLy(295)));
  yield* stage.say('摆协商 TRB：只带 Slot ID。', '③ / 5');
  yield* cmd.fill(0, 'NegBw', C.driver);
  yield* cmd.enqTo(1);
  trb.ref().opacity(0);
  yield* waitFor(0.15);
  trb.ref().remove();
  const q3 = makeChip(
    view,
    '"TRB Type = Negotiate Bandwidth Command (refer to Table 6-91)." "Slot ID = The ID of the slot that requires the bandwidth negotiation." "Clear all other fields of the command TRB to \'0\'." "Cycle bit = Command Ring\'s PCS flag." — §4.6.13 p131-132',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 16},
  );
  q3().opacity(0.95);
  yield* bell.ring('0');
  yield* cmd.deqTo(0, 0.4);
  yield* cmd.consume(0);
  yield* cmd.deqTo(1, 0.4);
  yield* waitFor(2.2);
  q3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ xHC 执行：逐设备找目标环插 Bandwidth Request Event ===== */
  const c4: CardApi = makeCard({
    title: '执行（L2588-2623）',
    rows: [
      {k: '逐设备找目标环', v: '按 Slot Context 中断器'},
      {k: '环有空位', v: '插 BW Request Event'},
      {k: '环满', v: '跳过该设备'},
      {k: 'CC', v: '仍 Success'},
    ],
    tint: C.hc,
    w: 460,
    rowSize: 18,
  });
  view.add(c4.node);
  const n4 = makeNote(
    view,
    [
      '目标设备事件环（按各设备 Slot Context 的',
      'Interrupter Target 点名）：xHC 逐设备插',
      'Bandwidth Request Event（Type/Slot ID/CC）。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.evt},
  );
  yield* stage.say('逐设备插带宽请求事件——环满跳过仍成功。', '④ / 5');
  yield* cardIn(c4, new Vector2(TLx(230), TLy(300)));
  n4().opacity(0.9);
  yield* waitFor(0.4);
  yield* waitFor(2.8);
  c4.ref().opacity(0);
  yield* waitFor(0.2);
  c4.ref().remove();
  n4().opacity(0);
  yield* waitFor(0.2);
  n4().remove();
  const q4 = makeChip(
    view,
    '"For each device, identify the target Event Ring (specified by the Interrupt Target field of the device\'s Slot Context). If there is space on the device\'s target Event Ring: Insert a Bandwidth Request Event … else // No space on the device\'s target Event Ring · Skip the device. Completion Code = Success" — §4.6.13 p132',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc, size: 15},
  );
  q4().opacity(0.95);
  yield* waitFor(2.4);
  q4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ 错误分支 + Note：unsolicited 立即降带宽 ===== */
  const c5: CardApi = makeCard({
    title: '错误分支（L2631-2642）',
    rows: [
      {k: '槽未使能', v: 'Slot Not Enabled Error'},
      {k: '槽态不符', v: 'Context State Error'},
      {k: '命令不支持', v: 'TRB Error'},
    ],
    tint: C.warn,
    w: 460,
    rowSize: 18,
  });
  view.add(c5.node);
  const q5 = makeChip(
    view,
    '"The Slot ID identifies slot not in the Addressed or Configured state · Completion Code = Context State Error." "The slot has not been enabled by an Enable Slot Command · Completion Code = Slot Not Enabled Error" — §4.6.13 p133',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.warn, size: 16},
  );
  yield* stage.say('未使能与槽态不符两族错误兜底。', '⑤ / 5');
  yield* cardIn(c5, new Vector2(TLx(230), TLy(300)));
  q5().opacity(0.95);
  yield* waitFor(2.4);
  c5.ref().opacity(0);
  yield* waitFor(0.2);
  c5.ref().remove();
  q5().opacity(0);
  yield* waitFor(0.25);
  const q6 = makeChip(
    view,
    '"Note: System software should immediately honor an unsolicited Bandwidth Request Event and free unused USB bandwidth by selecting lower bandwidth alternate configurations or interfaces on the devices that it owns." — §4.6.13 p133',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.warn, size: 16},
  );
  q6().opacity(0.95);
  yield* waitFor(2.2);
  q6().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.6.13 Negotiate Bandwidth',
    rows: [
      {k: '用途', v: '发 BW Request Event 回收带宽'},
      {k: '门', v: 'BNC=1 才必须支持'},
      {k: '执行', v: '逐设备插事件·满则跳过仍 Success'},
      {k: '错误', v: '未使能/槽态/不支持 三族'},
      {k: '下一支', v: '§4.6.14 Set Latency Tolerance Value（本批）'},
    ],
    tint: C.hc,
    w: 980,
    rowSize: 20,
  });
  view.add(sum.node);
  bell.ref().opacity(0);
  yield* stage.say('带宽回收机制走完——下一支 Set LTV。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.4);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});

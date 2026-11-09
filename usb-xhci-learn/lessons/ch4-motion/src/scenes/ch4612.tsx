// §4.6.12 Force Event 强制事件 —— xHCI 1.2b p130-131（R10 批 D；Optional Normative）
// 判据（evidence/spec-46.txt L2455-2548，判据唯一事实源）：
//  - 目的："The Force Event Command is used by a VMM to insert an Event TRB in an
//    Event Ring of a target VM when the VMM is emulating an xHC device to a VM.
//    When a Force Event Command is processed by the xHC it shall insert an Event
//    TRB on the target VFs' Event Ring and copy the data pointed to by the Force
//    Event Command, except for the Cycle bit, to the target Event TRB. The xHC
//    shall set the Cycle bit to be consistent with the target VFs' Event Ring."
//                                                          (L2457-2462, p130)
//  - 发行（L2472-2496, p130）："TRB Type = Force Event Command (refer to Table
//    6-91)." (L2482) / "VF ID = ID of the target VF." (L2484) / "VF Interrupter
//    Target = The ID of the target Interrupter assigned to the VF." (L2486-2487) /
//    "Event TRB Pointer = The address of the VF Event TRB." (L2489) / "Clear all
//    other fields of the command TRB to '0'." (L2491) / "Cycle bit = Command
//    Ring's PCS flag." (L2493) / "Write the Host Controller Doorbell with DB
//    Target = Host Controller Command."                    (L2495-2496)
//  - 执行三判（L2503-2543, p131）："If the VF ID is valid: If the VF Interrupter
//    Target is in range for the VF: If the target VF's Event Ring is not full:
//    … Copy all fields of the VF Event TRB except the Cycle bit field to the
//    target VF's Event Ring. Cycle bit = Target VF's Event Ring's PCS flag.
//    Completion Code = Success" (L2512-2527)；"else // The target VF's Event Ring
//    is full · Completion Code = VF Event Ring Full Error." (L2529-2531)；
//    "else // The VF Interrupter Target is not in range for the VF · Completion
//    Code = TRB Error." (L2533-2535)；"else // The VF ID is not valid ·
//    Completion Code = TRB Error."                          (L2537-2539)
//  - Note 释放缓冲："When the command completes, the VMM may release the buffer
//    containing the Event TRB pointed to by the Force Event Command."
//                                                          (L2544-2545, p131)
//  - Note 环满丢弃："The "forced" event shall be dropped if the target Event Ring
//    is full. Software should reschedule a Force Event Command if an VF Event
//    Ring Full Error is returned."                          (L2546-2548, p131)
//  - 诚实定位：Linux xHCI 主机驱动不使用（drivers/usb/host/*.c 对 TRB 类型零发行；
//    xhci.h 仅定义 TRB_FORCE_EVENT=18）——教学主体为规范机制本身。视觉口径：目标
//    VF 事件环用注记卡点名表达，不加第三条环。
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
      <Txt ref={t1} text={'§4.6.12'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Force Event'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={88} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'强制事件 · xHCI 规范第 4 章 · p130–131 · 可选规范项'}
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
    section: '§4.6.12',
    zh: 'Force Event 强制事件',
    en: 'Force Event Command · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.6.12 p130–131',
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

  /* ===== ① 目的：VMM 给目标 VF 的事件环插事件 ===== */
  const q1 = makeChip(
    view,
    '"The Force Event Command is used by a VMM to insert an Event TRB in an Event Ring of a target VM when the VMM is emulating an xHC device to a VM. … copy the data pointed to by the Force Event Command, except for the Cycle bit, to the target Event TRB. The xHC shall set the Cycle bit to be consistent with the target VFs\' Event Ring." — §4.6.12 p130',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 16},
  );
  yield* stage.say('Force Event：VMM 替虚机造事件。', '① / 5');
  q1().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② 软件侧：摆 Force Event TRB + 敲门铃 ===== */
  const trb: CardApi = makeCard({
    title: 'ForceEvt TRB',
    rows: [
      {k: 'TRB Type', v: 'Force Event'},
      {k: 'VF ID', v: '目标 VF'},
      {k: 'VF Interrupter Tgt', v: '目标中断器'},
      {k: 'Event TRB Pointer', v: 'VF Event TRB 地址'},
      {k: 'Cycle bit', v: '命令环 PCS'},
    ],
    tint: C.driver,
    w: 500,
    rowSize: 18,
  });
  view.add(trb.node);
  yield* cardIn(trb, new Vector2(TLx(740), TLy(295)));
  yield* stage.say('摆 Force Event TRB：VF ID + 中断器 + 事件指针。', '② / 5');
  yield* cmd.fill(0, 'ForceEvt', C.driver);
  yield* cmd.enqTo(1);
  trb.ref().opacity(0);
  yield* waitFor(0.15);
  trb.ref().remove();
  const q2 = makeChip(
    view,
    '"TRB Type = Force Event Command (refer to Table 6-91)." "VF ID = ID of the target VF." "VF Interrupter Target = The ID of the target Interrupter assigned to the VF." "Event TRB Pointer = The address of the VF Event TRB." "Write the Host Controller Doorbell with DB Target = Host Controller Command." — §4.6.12 p130',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 15},
  );
  q2().opacity(0.95);
  yield* bell.ring('0');
  yield* cmd.deqTo(0, 0.4);
  yield* cmd.consume(0);
  yield* cmd.deqTo(1, 0.4);
  yield* waitFor(2.2);
  q2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ xHC 执行三判 ===== */
  const c3: CardApi = makeCard({
    title: '执行三判（L2512-2539）',
    rows: [
      {k: 'VF ID 无效', v: 'TRB Error'},
      {k: '中断器越界', v: 'TRB Error'},
      {k: '目标环满', v: 'VF Event Ring Full Error'},
      {k: '三关全过', v: '拷贝 + Success'},
    ],
    tint: C.hc,
    w: 460,
    rowSize: 18,
  });
  view.add(c3.node);
  const q3 = makeChip(
    view,
    '"A Command Completion Event with a TRB Error will be generated if the VF ID of the Force Event Command is not valid." "A VF Event Ring Full Error shall be generated if the Target VF\'s Event Ring is full." — §4.6.12 p130',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.warn, size: 16},
  );
  yield* stage.say('执行三判：两族 TRB Error，环满报 Full。', '③ / 5');
  yield* cardIn(c3, new Vector2(TLx(230), TLy(300)));
  q3().opacity(0.95);
  yield* waitFor(3.2);
  c3.ref().opacity(0);
  yield* waitFor(0.2);
  c3.ref().remove();
  q3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ 完成事件 + 目标 VF 事件环插事件（注记卡点名，不加第三环） ===== */
  const n4 = makeNote(
    view,
    [
      '目标 VF 事件环（按 VF ID + VF Interrupter Target 点名）：',
      'xHC 拷贝 VF Event TRB 全字段——仅 Cycle bit 例外，',
      '按目标环 PCS 重置；完成事件回主事件环。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.evt},
  );
  yield* stage.say('回执 + 往目标 VF 环插事件。', '④ / 5');
  yield* evt.fill(0, 'CCE', C.evt);
  yield* evt.enqTo(1);
  n4().opacity(0.9);
  yield* evt.deqTo(0, 0.4);
  yield* evt.consume(0);
  yield* evt.deqTo(1, 0.4);
  yield* waitFor(2.4);
  n4().opacity(0);
  yield* waitFor(0.2);
  n4().remove();
  const q4 = makeChip(
    view,
    '"If the target VF\'s Event Ring is not full: Insert the VF\'s Event TRB referenced by the Force Event Command Event TRB Pointer into target VF\'s Event Ring … Copy all fields of the VF Event TRB except the Cycle bit field to the target VF\'s Event Ring. Cycle bit = Target VF\'s Event Ring\'s PCS flag. Completion Code = Success" — §4.6.12 p131',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.evt, size: 15},
  );
  q4().opacity(0.95);
  yield* waitFor(2.2);
  q4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ Note：可释放缓冲 / 环满丢弃应重排 ===== */
  const q5 = makeChip(
    view,
    '"Note: When the command completes, the VMM may release the buffer containing the Event TRB pointed to by the Force Event Command." … "The \'forced\' event shall be dropped if the target Event Ring is full. Software should reschedule a Force Event Command if an VF Event Ring Full Error is returned." — §4.6.12 p131',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.warn, size: 16},
  );
  yield* stage.say('环满即丢弃——软件应重排。', '⑤ / 5');
  q5().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  q5().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.6.12 Force Event',
    rows: [
      {k: '用途', v: 'VMM 给目标 VF 事件环插事件'},
      {k: '拷贝', v: '全字段除 Cycle·按目标环 PCS'},
      {k: '三判', v: '两族 TRB Error + 环满 Full'},
      {k: 'Note', v: '完成可释放缓冲·满则重排'},
      {k: '下一支', v: '§4.6.13 Negotiate Bandwidth（本批）'},
    ],
    tint: C.hc,
    w: 920,
    rowSize: 20,
  });
  view.add(sum.node);
  bell.ref().opacity(0);
  yield* stage.say('虚机事件注入——可选规范项第二支。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.4);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});

// §4.6.14 Set Latency Tolerance Value (LTV) —— xHCI 1.2b p133-135（R10 批 D；Optional Normative）
// 判据（evidence/spec-46.txt L2668-2751，判据唯一事实源）：
//  - 定位："Refer to section 4.13.1 for an overview of the xHCI's USB3 Latency
//    Tolerance Messaging (LTM) support. This section describes the Set LTV Command
//    which is one component of the Latency Tolerance Reporting (LTR) mechanism."
//                                                          (L2670-2672, p133)
//  - 用途："The Set LTV Command provides a simple means for host software to provide
//    a Best Effort Latency Tolerance (BELT) value to the xHC. This command is
//    optional normative, however it shall be supported if the xHC also supports a
//    corresponding host interconnect LTR mechanism." (L2673-2676, p133)
//  - BELT 同 LTM 对待："The value of the BELT field in the Set LTV Command TRB shall
//    be treated in exactly the same way as BELT values received from USB3 devices
//    by the xHC. Refer to section 4.13.1."                (L2686-2688, p134)
//  - LTC 门："If the Latency Tolerance Messaging Capability (LTC) bit in the
//    HCCPARAMS1 register is '0', the xHC shall not support this command."
//                                                          (L2691-2692, p134)
//  - 完成码："This command will complete with a Success Completion Code if the
//    command is supported, or a TRB Error Completion Code if the command is not
//    supported."                                           (L2697-2698, p134)
//  - 发行（L2703-2719, p134）："TRB Type = Set Latency Tolerance Value Command
//    (refer to Table 6-91)." (L2709-2710) / "BELT = The Best Effort Latency
//    Tolerance value provided by software." (L2712) / "Clear all other fields of
//    the command TRB to '0'." (L2714) / "Cycle bit = Command Ring's PCS flag."
//    (L2716) / "Write the Host Controller Doorbell with DB Target = Host Controller
//    Command."                                             (L2718-2719)
//  - 执行（L2720-2731, p134）："Record the value of the BELT field as the host
//    defined LTV." (L2723) / "If the value of the BELT field is less than the
//    "current" LTV maintained by the xHC: Set the value of the BELT field as the
//    "current" xHC LTV. Send the host-specific LTM to the host, reporting the new
//    LTV to the system."                                   (L2725-2731)
//  - 完成事件（L2733-2751, p134-135）："Insert a Command Completion Event on the
//    Event Ring of Interrupter 0" (L2733) / "Command TRB Pointer = The address of
//    the Set Latency Tolerance Value Command TRB." (L2744-2745) / "Completion Code
//    = Success (refer to Table 6-90)." (L2747)
//  - 诚实定位：Linux xHCI 主机驱动不使用（drivers/usb/host/*.c 零发行；xhci.h 仅定义
//    TRB_SET_LT=20）——教学主体为规范机制本身。
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
      <Txt ref={t1} text={'§4.6.14'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Set Latency Tolerance Value'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={72} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'设置延迟容忍值（LTV）· xHCI 规范第 4 章 · p133–135 · 可选规范项'}
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
    section: '§4.6.14',
    zh: 'Set LTV 延迟容忍值',
    en: 'Set Latency Tolerance Value Command · LTR 机制组件 · 规范第 4 章',
    cite: 'xHCI 1.2b §4.6.14 p133–135',
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

  /* ===== ① 目的：LTR 机制一环，软件报 BELT ===== */
  const q1 = makeChip(
    view,
    '"The Set LTV Command provides a simple means for host software to provide a Best Effort Latency Tolerance (BELT) value to the xHC." … "The value of the BELT field in the Set LTV Command TRB shall be treated in exactly the same way as BELT values received from USB3 devices by the xHC." — §4.6.14 p133-134',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 16},
  );
  yield* stage.say('LTR 机制一环：软件直接报 BELT 给 xHC。', '① / 4');
  q1().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② 软件侧：摆 Set LTV TRB + 敲门铃 ===== */
  const trb: CardApi = makeCard({
    title: 'SetLTV TRB',
    rows: [
      {k: 'TRB Type', v: 'Set Latency Tolerance Value'},
      {k: 'BELT', v: '软件提供的容忍值'},
      {k: '其余字段', v: '清 0'},
      {k: 'Cycle bit', v: '命令环 PCS'},
    ],
    tint: C.driver,
    w: 500,
    rowSize: 19,
  });
  view.add(trb.node);
  yield* cardIn(trb, new Vector2(TLx(740), TLy(295)));
  yield* stage.say('摆 Set LTV TRB：只带 BELT 值。', '② / 4');
  yield* cmd.fill(0, 'SetLTV', C.driver);
  yield* cmd.enqTo(1);
  trb.ref().opacity(0);
  yield* waitFor(0.15);
  trb.ref().remove();
  const q2 = makeChip(
    view,
    '"TRB Type = Set Latency Tolerance Value Command (refer to Table 6-91)." "BELT = The Best Effort Latency Tolerance value provided by software." "Clear all other fields of the command TRB to \'0\'." "Cycle bit = Command Ring\'s PCS flag." — §4.6.14 p134',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 16},
  );
  q2().opacity(0.95);
  yield* bell.ring('0');
  yield* cmd.deqTo(0, 0.4);
  yield* cmd.consume(0);
  yield* cmd.deqTo(1, 0.4);
  yield* waitFor(2.2);
  q2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ xHC 执行：记录 LTV + 更小才更新并发 host LTM ===== */
  const ltv: CardApi = makeCard({
    title: 'xHC 内部 LTV 簿记',
    rows: [
      {k: 'BELT', v: '记录为主机定义 LTV'},
      {k: '更新条件', v: '小于当前 LTV'},
      {k: '更新动作', v: '置新值 + 发 host LTM'},
    ],
    tint: C.hc,
    w: 460,
    rowSize: 18,
  });
  view.add(ltv.node);
  const q3 = makeChip(
    view,
    '"Record the value of the BELT field as the host defined LTV." "If the value of the BELT field is less than the \'current\' LTV maintained by the xHC: Set the value of the BELT field as the \'current\' xHC LTV. Send the host-specific LTM to the host, reporting the new LTV to the system." — §4.6.14 p134',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc, size: 15},
  );
  yield* stage.say('记录 LTV；更小才更新并发 host LTM。', '③ / 4');
  yield* cardIn(ltv, new Vector2(TLx(230), TLy(300)));
  q3().opacity(0.95);
  yield* waitFor(3.4);
  ltv.ref().opacity(0);
  yield* waitFor(0.2);
  ltv.ref().remove();
  q3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ 完成事件 + LTC 门 ===== */
  const c4: CardApi = makeCard({
    title: '完成事件（L2733-2747）',
    rows: [
      {k: '插到', v: 'Interrupter 0 事件环'},
      {k: 'TRB Pointer', v: '回指 Set LTV TRB'},
      {k: 'Completion Code', v: 'Success'},
    ],
    tint: C.evt,
    w: 460,
    rowSize: 18,
  });
  view.add(c4.node);
  const q4 = makeChip(
    view,
    '"If the Latency Tolerance Messaging Capability (LTC) bit in the HCCPARAMS1 register is \'0\', the xHC shall not support this command." — §4.6.14 p134',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.warn, size: 17},
  );
  yield* stage.say('LTC=0 不支持；完成事件 CC=Success。', '④ / 4');
  yield* cardIn(c4, new Vector2(TLx(230), TLy(300)));
  q4().opacity(0.95);
  yield* evt.fill(0, 'CCE', C.evt);
  yield* evt.enqTo(1);
  yield* evt.deqTo(0, 0.4);
  yield* evt.consume(0);
  yield* evt.deqTo(1, 0.4);
  yield* waitFor(2.2);
  c4.ref().opacity(0);
  yield* waitFor(0.2);
  c4.ref().remove();
  q4().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.6.14 Set Latency Tolerance Value',
    rows: [
      {k: '用途', v: '软件向 xHC 报 BELT（LTR 一环）'},
      {k: '同权', v: '与 USB3 设备 LTM 报来值同法对待'},
      {k: '执行', v: '更小才更新当前 LTV + 发 host LTM'},
      {k: '门', v: 'LTC=0 不支持'},
      {k: '下一支', v: '§4.6.15 Get Port Bandwidth（本批）'},
    ],
    tint: C.hc,
    w: 980,
    rowSize: 20,
  });
  view.add(sum.node);
  bell.ref().opacity(0);
  yield* stage.say('延迟容忍值落地——下一支查端口带宽。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.4);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});

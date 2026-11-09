// §4.6.16 Force Header 强制链路包 —— xHCI 1.2b p138-139（R10 批 D；非 Optional，无「可选规范项」标）
// 判据（evidence/spec-46.txt L2926-3006，判据唯一事实源）：
//  - 用途："The Force Header Command is issued by software to send a Link Management
//    (LMP) or Transaction Packet (TP) to a USB device, through a selected Root Hub
//    Port. For instance, it may be used to send a PING TP or a Vendor Device Test
//    LMP."                                                 (L2928-2931, p138)
//  - 误用警告（本支教学核心）："Inappropriate or incorrect use of this command may
//    cause the xHC link state machines to get out of sync with those on an attached
//    device. Software shall comprehend the possible side effects of the specific
//    headers that are forced on the USB. If a forced header results in undefined
//    behavior by the device or the xHC (for example, a DPH with no DP), software
//    may have to reset the device, a Root Hub port, the xHC, or all of them to
//    restore normal operating conditions."                 (L2932-2938, p138)
//  - xHC 不理解内容："The xHC is not required to comprehend the content of the header
//    being forced. … some TPs may result in Device responses which will not be
//    comprehended by the xHC. It may be necessary to reset the xHC to recover from
//    these conditions."                                    (L2940-2945, p138)
//  - 发行（L2949-2977, p138-139）："TRB Type = Force Header Command (refer to Table
//    6-91)." (L2954) / "Root Hub Port Number = The number of the Root Hub Port that
//    defines the target of the Header packet." (L2956-2957) / "Packet Type = The
//    field identifies the SS packet type." (L2959) / "Header Info = The header Type
//    specific data to send to the target device." (L2962-2963) / "Clear all other
//    fields of the command TRB to '0'." (L2966) / "Cycle bit = Command Ring's PCS
//    flag." (L2974) / 门铃 (L2976-2977)
//  - 执行（L2978-3006, p139）："If the value Root Hub Port Number field is in range:
//    If the Force Header packet was transmitted successfully: Completion Code =
//    Success … else // The Force Header packet was not transmitted successfully ·
//    Completion Code = Undefined Error. … else // The value Root Hub Port Number
//    field is not in range · Completion Code = TRB Error." (L2990-3002)
//  - 诚实定位：Linux xHCI 主机驱动不使用（drivers/usb/host/*.c 零发行；xhci.h 仅定义
//    TRB_FORCE_HEADER=22）——教学主体为规范机制本身，误用警告是本支教学核心。
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

  /* ===== 片头（Force Header 非 Optional Normative，不加「可选规范项」标） ===== */
  const t1 = createRef<Txt>();
  const t2 = createRef<Txt>();
  const t3 = createRef<Txt>();
  const t4 = createRef<Txt>();
  view.add(
    <>
      <Txt ref={t1} text={'§4.6.16'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Force Header'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={88} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'强制链路包 · xHCI 规范第 4 章 · p138–139'}
        x={0} y={TLy(610)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
      <Txt ref={t4} text={'诚实定位：Linux xHCI 主机驱动不使用本命令——误用风险高，教学主体为规范机制'}
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
    section: '§4.6.16',
    zh: 'Force Header',
    en: 'Force Header Command · 强制链路包 · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.6.16 p138–139',
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

  /* ===== ① 用途：向指定 Root Hub 端口发 LMP/TP ===== */
  const q1 = makeChip(
    view,
    '"The Force Header Command is issued by software to send a Link Management (LMP) or Transaction Packet (TP) to a USB device, through a selected Root Hub Port. For instance, it may be used to send a PING TP or a Vendor Device Test LMP." — §4.6.16 p138',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 16},
  );
  yield* stage.say('强制发链路包：LMP/TP 直达指定端口。', '① / 4');
  q1().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② 误用警告（教学核心）：状态机失同步，可能要复位 ===== */
  const q2 = makeChip(
    view,
    '"Inappropriate or incorrect use of this command may cause the xHC link state machines to get out of sync with those on an attached device. … If a forced header results in undefined behavior by the device or the xHC (for example, a DPH with no DP), software may have to reset the device, a Root Hub port, the xHC, or all of them to restore normal operating conditions." — §4.6.16 p138',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.warn, size: 15},
  );
  const q2b = makeChip(
    view,
    '"The xHC is not required to comprehend the content of the header being forced. … some TPs may result in Device responses which will not be comprehended by the xHC. It may be necessary to reset the xHC to recover from these conditions." — §4.6.16 p138',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.warn, size: 16},
  );
  yield* stage.say('误用警告：链路状态机可能失同步——或需复位恢复。', '② / 4');
  q2().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.6);
  q2().opacity(0);
  yield* waitFor(0.2);
  q2b().opacity(0.95);
  yield* waitFor(3.2);
  q2b().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ 软件侧：摆 Force Header TRB + 敲门铃 ===== */
  const trb: CardApi = makeCard({
    title: 'ForceHdr TRB',
    rows: [
      {k: 'TRB Type', v: 'Force Header'},
      {k: 'Root Hub Port', v: '目标端口号'},
      {k: 'Packet Type', v: 'SS 包类型'},
      {k: 'Header Info', v: '类型相关数据'},
      {k: 'Cycle bit', v: '命令环 PCS'},
    ],
    tint: C.driver,
    w: 500,
    rowSize: 18,
  });
  view.add(trb.node);
  yield* cardIn(trb, new Vector2(TLx(740), TLy(295)));
  yield* stage.say('摆 Force Header TRB：端口 + 包类型 + 头数据。', '③ / 4');
  yield* cmd.fill(0, 'ForceHdr', C.driver);
  yield* cmd.enqTo(1);
  trb.ref().opacity(0);
  yield* waitFor(0.15);
  trb.ref().remove();
  const q3 = makeChip(
    view,
    '"TRB Type = Force Header Command … Root Hub Port Number = The number of the Root Hub Port that defines the target of the Header packet." "Packet Type = The field identifies the SS packet type." "Header Info = The header Type specific data to send to the target device." — §4.6.16 p138',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 15},
  );
  q3().opacity(0.95);
  yield* bell.ring('0');
  yield* cmd.deqTo(0, 0.4);
  yield* cmd.consume(0);
  yield* cmd.deqTo(1, 0.4);
  yield* waitFor(2.2);
  q3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ xHC 执行：端口越界 / 发送失败 两族错误 ===== */
  const c4: CardApi = makeCard({
    title: '执行（L2990-3002）',
    rows: [
      {k: '端口在界 + 发送成', v: 'Success'},
      {k: '发送失败', v: 'Undefined Error'},
      {k: '端口越界', v: 'TRB Error'},
    ],
    tint: C.hc,
    w: 460,
    rowSize: 18,
  });
  view.add(c4.node);
  const q4 = makeChip(
    view,
    '"If the value Root Hub Port Number field is in range: If the Force Header packet was transmitted successfully: Completion Code = Success … else // The Force Header packet was not transmitted successfully · Completion Code = Undefined Error. … else · Completion Code = TRB Error." — §4.6.16 p139',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc, size: 15},
  );
  yield* stage.say('端口越界 TRB Error；发送失败 Undefined Error。', '④ / 4');
  yield* cardIn(c4, new Vector2(TLx(230), TLy(300)));
  q4().opacity(0.95);
  yield* evt.fill(0, 'CCE', C.evt);
  yield* evt.enqTo(1);
  yield* evt.deqTo(0, 0.4);
  yield* evt.consume(0);
  yield* evt.deqTo(1, 0.4);
  yield* waitFor(2.4);
  c4.ref().opacity(0);
  yield* waitFor(0.2);
  c4.ref().remove();
  q4().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.6.16 Force Header',
    rows: [
      {k: '用途', v: '向指定 RH 端口发 LMP/TP'},
      {k: '核心警告', v: '误用致状态机失同步或需复位'},
      {k: '发行', v: 'Port + Packet Type + Header Info'},
      {k: '执行', v: '越界 TRB Error·发送失败 Undefined'},
      {k: '下一支', v: '§4.6.17 Get Extended Property（本批）'},
    ],
    tint: C.hc,
    w: 940,
    rowSize: 20,
  });
  view.add(sum.node);
  bell.ref().opacity(0);
  yield* stage.say('双刃命令收好——下一支读扩展属性。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.4);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});

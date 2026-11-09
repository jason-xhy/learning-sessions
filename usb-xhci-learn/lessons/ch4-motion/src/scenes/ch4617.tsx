// §4.6.17 Get Extended Property 读扩展属性 —— xHCI 1.2b p139-141（R10 批 D；Optional Normative）
// 判据（evidence/spec-46.txt L3007-3138，判据唯一事实源）：
//  - 用途："The Get Extended Property Command is used by system software to discover
//    specific Extended Capabilities supported by the xHC, and to enumerate and read
//    specific attributes of those Extended Capabilities." (L3009-3011, p139)
//  - GSC 门："If the Get/Set Extended Property Capability (GSC) bit in the
//    HCCPARAMS2 register is '1', the xHC shall support this command."
//                                                          (L3012-3013, p139)
//  - Context 覆写："…the command may contain a pointer to an Extended Property
//    Context, in which case the xHC shall update the Extended Property Context with
//    the property referenced by the Get Extended Property command. Since the context
//    is overwritten by the xHC, it is not necessary for SW to initialize the context
//    before passing it to the xHC."                        (L3014-3019, p139)
//  - EC Identifier："Each bit in the Extended Capability Identifier represents one
//    specific Extended Capability as defined in Table 4-3." (L3025-3026, p139)；
//    Table 4-3（L3128-3138, p141）："0 · Audio Sideband Extended Capability" /
//    "11:1 · RsvdZ." / "15:12 · Vendor Defined Extended Capability"
//  - 枚举法（本支教学核心，L3114-3126, p141）："In order to discover if the xHC
//    supports specific Extended Capabilities … System Software shall issue a Get
//    Extended Property command with the Extended Capability ID field and the
//    SubType field set to all zeroes." / "…the xHC shall return a Command Completion
//    TRB with a bit set for each supported extended capability in bits [15:0] of the
//    Command Completion Parameter field of the Command Completion Event TRB …
//    multiple bits may be set if multiple capabilities are supported."
//  - 发行（L3052-3074, p140）："TRB Type = Get Extended Property Command" (L3059) /
//    "Extended Capability Identifier = either set to all zeroes … or one bit within
//    the identifier field set to indicate the specific capability …" (L3061-3063) /
//    "Slot ID = Slot ID associated with the command, or all zeroes …" (L3065-3066) /
//    "EP ID = EP ID associated with the command, or all zeroes …" (L3068-3069) /
//    "Subtype = Specific command subtype to be executed." (L3071-3072) / 门铃
//    (L3074)
//  - 执行（L3075-3113, p140-141）：需要时写 Extended Property Context（L3080-3085）；
//    完成事件回 EC Identifier——"If the Get Extended Property Command had the
//    Extended Capability Identifier set to zero, the xHC shall set the bit
//    associated with each supported extended capability" (L3105-3107)；指定位查询→
//    "the xHC shall set that bit in the completion TRB" (L3109-3111)；"Completion
//    Code= Success" (L3113)
//  - 诚实定位：Linux xHCI 主机驱动不使用（drivers/usb/host/*.c 零发行；ext-prop 两支
//    连 TRB 类型定义都没有）——教学主体为规范机制本身。
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
      <Txt ref={t1} text={'§4.6.17'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Get Extended Property'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={80} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'读扩展属性 · xHCI 规范第 4 章 · p139–141 · 可选规范项'}
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
    section: '§4.6.17',
    zh: 'Get Extended Property',
    en: 'Get Extended Property Command · 读扩展属性 · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.6.17 p139–141',
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

  /* ===== ① 用途：发现扩展能力并读属性 ===== */
  const q1 = makeChip(
    view,
    '"The Get Extended Property Command is used by system software to discover specific Extended Capabilities supported by the xHC, and to enumerate and read specific attributes of those Extended Capabilities." — §4.6.17 p139',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 17},
  );
  yield* stage.say('发现扩展能力并读属性——GSC=1 才必须支持。', '① / 5');
  q1().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② GSC 门 + EC Identifier 位图（Table 4-3） ===== */
  const q2 = makeChip(
    view,
    '"If the Get/Set Extended Property Capability (GSC) bit in the HCCPARAMS2 register is \'1\', the xHC shall support this command." "Each bit in the Extended Capability Identifier represents one specific Extended Capability as defined in Table 4-3." — §4.6.17 p139',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc, size: 16},
  );
  const n2 = makeNote(
    view,
    [
      'Table 4-3 · EC Identifier 位图（L3128-3138）：',
      'bit 0 = Audio Sideband；bit 15:12 = Vendor Defined；',
      'bit 11:1 = RsvdZ。置一位即点名一个能力。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc},
  );
  yield* stage.say('EC Identifier 是位图：一位对应一个扩展能力。', '② / 5');
  q2().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.8);
  q2().opacity(0);
  yield* waitFor(0.2);
  n2().opacity(0.9);
  yield* waitFor(2.6);
  n2().opacity(0);
  yield* waitFor(0.2);
  n2().remove();

  /* ===== ③ 枚举法（教学核心）：全 0 发一发 → Parameter[15:0] 按位回报 ===== */
  const q3 = makeChip(
    view,
    '"System Software shall issue a Get Extended Property command with the Extended Capability ID field and the SubType field set to all zeroes." … "the xHC shall return a Command Completion TRB with a bit set for each supported extended capability in bits [15:0] of the Command Completion Parameter field … multiple bits may be set if multiple capabilities are supported." — §4.6.17.3 p141',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.evt, size: 15},
  );
  yield* stage.say('枚举法：全 0 发一发，回参按位报支持能力。', '③ / 5');
  q3().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.8);
  q3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ 软件侧：摆 Get Extended Property TRB + 敲门铃 ===== */
  const trb: CardApi = makeCard({
    title: 'GetExtProp TRB',
    rows: [
      {k: 'TRB Type', v: 'Get Extended Property'},
      {k: 'EC Identifier', v: '全 0=枚举·一位=点名'},
      {k: 'Slot ID / EP ID', v: '按需·否则全 0'},
      {k: 'Subtype', v: '随能力定义'},
      {k: 'Cycle bit', v: '命令环 PCS'},
    ],
    tint: C.driver,
    w: 540,
    rowSize: 18,
  });
  view.add(trb.node);
  yield* cardIn(trb, new Vector2(TLx(740), TLy(295)));
  yield* stage.say('摆查询 TRB：EC ID + Subtype 点名要读的属性。', '④ / 5');
  yield* cmd.fill(0, 'GetExtProp', C.driver);
  yield* cmd.enqTo(1);
  trb.ref().opacity(0);
  yield* waitFor(0.15);
  trb.ref().remove();
  const q4 = makeChip(
    view,
    '"TRB Type = Get Extended Property Command" "Extended Capability Identifier = either set to all zeroes … or one bit within the identifier field set to indicate the specific capability the command is associated with." "Subtype = Specific command subtype to be executed." — §4.6.17.1 p140',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 15},
  );
  q4().opacity(0.95);
  yield* bell.ring('0');
  yield* cmd.deqTo(0, 0.4);
  yield* cmd.consume(0);
  yield* cmd.deqTo(1, 0.4);
  yield* waitFor(2.2);
  q4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ xHC 执行：按需写 Context + 完成事件回位图 ===== */
  const c5: CardApi = makeCard({
    title: '执行（L3075-3113）',
    rows: [
      {k: '需读出属性', v: '写入 Ext Prop Context'},
      {k: 'Context', v: 'xHC 覆写·无需初始化'},
      {k: 'EC ID=全 0', v: '按支持能力置位'},
      {k: 'EC ID=一位', v: '回置该位'},
    ],
    tint: C.evt,
    w: 480,
    rowSize: 18,
  });
  view.add(c5.node);
  const q5 = makeChip(
    view,
    '"If the Extended Capability and SubType referenced by the command require the Extended Property Context to be updated … the xHC shall write the required information to the Extended Property Context location specified by … the Get Extended Property command." "If the Get Extended Property Command had the Extended Capability Identifier set to zero, the xHC shall set the bit associated with each supported extended capability." — §4.6.17.2 p140-141',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.evt, size: 14},
  );
  yield* stage.say('完成事件回 EC 位图；Context 由 xHC 覆写。', '⑤ / 5');
  yield* cardIn(c5, new Vector2(TLx(245), TLy(300)));
  q5().opacity(0.95);
  yield* evt.fill(0, 'CCE', C.evt);
  yield* evt.enqTo(1);
  yield* evt.deqTo(0, 0.4);
  yield* evt.consume(0);
  yield* evt.deqTo(1, 0.4);
  yield* waitFor(2.6);
  c5.ref().opacity(0);
  yield* waitFor(0.2);
  c5.ref().remove();
  q5().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.6.17 Get Extended Property',
    rows: [
      {k: '用途', v: '发现扩展能力并读属性'},
      {k: '门', v: 'GSC=1 才必须支持'},
      {k: '枚举', v: 'EC ID+Subtype 全 0→回参按位报'},
      {k: '执行', v: '按需写 Context·完成回位图'},
      {k: '下一支', v: '§4.6.18 Set Extended Property（本批）'},
    ],
    tint: C.hc,
    w: 960,
    rowSize: 20,
  });
  view.add(sum.node);
  bell.ref().opacity(0);
  yield* stage.say('能力位图查清——下一支写属性，正好对偶。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.4);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});

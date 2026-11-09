// §4.6.18 Set Extended Property 写扩展属性 —— xHCI 1.2b p141-142（R10 批 D；Optional Normative）
// 判据（evidence/spec-46.txt L3139-3181，判据唯一事实源）：
//  - 用途："The Set Extended Property Command is used by System Software to control
//    attributes of specific Extended Capabilities supported by the xHC."
//                                                          (L3141-3142, p141)
//  - GSC 门："If the Get/Set Extended Property Capability (GSC) bit in the
//    HCCPARAMS2 register is '1', the xHC shall support this command."
//                                                          (L3143-3144, p141)
//  - 禁多位置位（本支教学核心）："Software shall not set more than one bit in the
//    Extended Capability Identifier field." (L3159-3160, p142)
//  - EC Identifier 同 Table 4-3："Each bit in the Extended Capability Identifier
//    represents one specific Extended Capability as defined in Table 4-3."
//    (L3156-3157, p142)；"The list of Extended Capabilities allowed to use this
//    command are listed in Table 4-3."                     (L3162-3163, p142)
//  - Subtype："The Set Extended Property Command further contains a Subtype field
//    that defines the specific property within the scope of the Extended
//    Capability."                                          (L3165-3167, p142)
//  - Capability Parameter（本命令要写的东西）："The Set Extended Property Command
//    specifies a Capability Parameter that is used to configure certain aspects of
//    the Extended Capability associated with the Extended Capability specified in
//    the Extended Capability ID."                          (L3175-3177, p142)
//  - 完成码："This command shall complete with a Success Completion Code if the
//    command is supported (that is, GSC bit in the HCCPARAMS2 register is '1'), or
//    a TRB Error Completion Code if the command is not supported."
//                                                          (L3178-3181, p142)
//  - 与 §4.6.17 对偶：Get=读/枚举，Set=写 Capability Parameter（格式定义在 §7.9.2，
//    L3145）。TRB 字段形态沿 §4.6.17.1 发行清单（Type/EC ID/Slot ID/EP ID/Subtype）
//    + Capability Parameter。
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
      <Txt ref={t1} text={'§4.6.18'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Set Extended Property'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={80} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'写扩展属性 · xHCI 规范第 4 章 · p141–142 · 可选规范项'}
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
    section: '§4.6.18',
    zh: 'Set Extended Property',
    en: 'Set Extended Property Command · 写扩展属性 · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.6.18 p141–142',
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

  /* ===== ① 用途：控制扩展能力属性（与 Get 对偶） ===== */
  const q1 = makeChip(
    view,
    '"The Set Extended Property Command is used by System Software to control attributes of specific Extended Capabilities supported by the xHC." "The Set Extended Property Command specifies a Capability Parameter that is used to configure certain aspects of the Extended Capability …" — §4.6.18 p141-142',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 16},
  );
  yield* stage.say('写扩展属性：与上一支 Get 正好对偶。', '① / 3');
  q1().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② 禁多位置位 + GSC 门 ===== */
  const q2 = makeChip(
    view,
    '"Software shall not set more than one bit in the Extended Capability Identifier field." — §4.6.18 p142 · GSC 门："If the Get/Set Extended Property Capability (GSC) bit in the HCCPARAMS2 register is \'1\', the xHC shall support this command." — §4.6.18 p141',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.warn, size: 16},
  );
  yield* stage.say('软件禁置多于一位 EC Identifier。', '② / 3');
  q2().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  q2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ 软件侧：摆 Set TRB + 敲门铃 + 完成事件 ===== */
  const trb: CardApi = makeCard({
    title: 'SetExtProp TRB',
    rows: [
      {k: 'TRB Type', v: 'Set Extended Property'},
      {k: 'EC Identifier', v: '恰置一位'},
      {k: 'Slot ID / EP ID', v: '按需·否则全 0'},
      {k: 'Subtype', v: '点名属性'},
      {k: 'Capability Param', v: '要写的值'},
    ],
    tint: C.driver,
    w: 540,
    rowSize: 18,
  });
  view.add(trb.node);
  yield* cardIn(trb, new Vector2(TLx(740), TLy(295)));
  yield* stage.say('摆 Set TRB：一位 EC ID + Subtype + 参数值。', '③ / 3');
  yield* cmd.fill(0, 'SetExtProp', C.driver);
  yield* cmd.enqTo(1);
  trb.ref().opacity(0);
  yield* waitFor(0.15);
  trb.ref().remove();
  const q3 = makeChip(
    view,
    '"The Set Extended Property Command further contains a Subtype field that defines the specific property within the scope of the Extended Capability." … "This command shall complete with a Success Completion Code if the command is supported (that is, GSC bit in the HCCPARAMS2 register is \'1\'), or a TRB Error Completion Code if the command is not supported." — §4.6.18 p142',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 15},
  );
  q3().opacity(0.95);
  yield* bell.ring('0');
  yield* cmd.deqTo(0, 0.4);
  yield* cmd.consume(0);
  yield* cmd.deqTo(1, 0.4);
  yield* evt.fill(0, 'CCE', C.evt);
  yield* evt.enqTo(1);
  yield* evt.deqTo(0, 0.4);
  yield* evt.consume(0);
  yield* evt.deqTo(1, 0.4);
  yield* waitFor(2.4);
  q3().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.6.18 Set Extended Property',
    rows: [
      {k: '用途', v: '写 Capability Parameter 配置能力'},
      {k: '对偶', v: 'Get 读/枚举 · Set 写'},
      {k: '铁律', v: 'EC Identifier 禁置多于一位'},
      {k: '门', v: 'GSC=1 才必须支持'},
      {k: '下一支', v: '§4.6 十八支全线收官'},
    ],
    tint: C.hc,
    w: 920,
    rowSize: 20,
  });
  view.add(sum.node);
  bell.ref().opacity(0);
  yield* stage.say('扩展属性写完——§4.6 十八支机制线收官。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.4);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});

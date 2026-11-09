// §4.6.15 Get Port Bandwidth 端口带宽查询 —— xHCI 1.2b p135-138（R10 批 D；Optional Normative）
// 判据（evidence/spec-46.txt L2752-2925，判据唯一事实源）：
//  - 用途："The Get Port Bandwidth Command is issued by software to retrieve the
//    percentage of Total Available Bandwidth on each Root Hub Port of the xHC or
//    on the downstream facing ports of an external USB hub. This information can
//    be used by system software to recommend topology changes to the user if they
//    were unable to enumerate a device due to a Bandwidth Error (Root Hub) or
//    Secondary Bandwidth Error (external hub)." (L2754-2759, p135)
//  - BI 概念："An xHC may support multiple USB Bus Instances (BI), where each BI
//    represents a "unit" bandwidth at the speed that the BI supports. Also note
//    that multiple Root Hub ports may be assigned to a single BI." (L2762-2764,
//    p135)；8 端口例："an xHCI implementation that supports 8 ports may provide
//    1 SS BI, 2 HS BIs, and 4 LS/FS BIs. So in this example there are 7 USB BIs,
//    1 SS (5Gb/s), 2 HS (480 Mb/s) and 4 LS/FS (12Mb/s). Any SS device attached
//    to a root hub port shares the SS BI bandwidth." (L2765-2768, p135)
//  - Dev Speed 定 BI："The xHC uses the Device Speed parameter to identify which
//    Bus Instance(s) to use when it calculates the Total Available Bandwidth on
//    that port."                                           (L2797-2798, p136)
//  - Context 覆写："The xHC overwrites the Port Bandwidth Context when it executes
//    the Get Port Bandwidth Command, so software does not need to initialize the
//    context data structure before passing it to the xHC." (L2807-2809, p136)
//  - 零带宽三规则（L2810-2818, p136）："A Root Hub port assigned to the Debug
//    Capability shall report '0' bandwidth available." / "If the Device Speed
//    parameter is LS, FS, or HS, then USB3 (SS) Root Hub ports shall report '0'
//    bandwidth available." / "If the Device Speed parameter is SS, then USB2 Root
//    Hub ports shall report '0' bandwidth available."
//  - Note 报 0=不可用："Software shall consider any port that reports '0' bandwidth
//    available as being unusable."                         (L2819-2820, p136)
//  - 发行（L2851-2877, p137）："TRB Type = Get Port Bandwidth Command (refer to
//    Table 6-91)." (L2858) / "Dev Speed = The bus speed of the target device."
//    (L2860) / "Hub Slot ID = '0' if referencing Root Hub ports (that is, the
//    Primary Bandwidth Domain) …" (L2863-2865) / "Port Bandwidth Context Pointer =
//    The base address of the Port Bandwidth Context data structure." (L2869-2870) /
//    "Cycle bit = Command Ring's PCS flag." (L2874) / 门铃 (L2876-2877)
//  - 执行（L2878-2922, p137-138）："If the Dev Speed field is valid (that is, not
//    equal to Undefined or Reserved): If the Hub Slot ID field = '0': Compute
//    Percentage of Total Available Bandwidth for each Root Hub port based on its
//    Speed. Use the value of the Dev Speed field for ports that do not have
//    devices attached. … Copy the results to the Port Bandwidth Context.
//    Completion Code = Success" (L2890-2908)；"else // The Dev Speed field is not
//    valid · Completion Code = TRB Error." (L2910-2918)
//  - 诚实定位：Linux xHCI 主机驱动不使用（drivers/usb/host/*.c 零发行；xhci.h 仅定义
//    TRB_GET_BW=21）——教学主体为规范机制本身。
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
      <Txt ref={t1} text={'§4.6.15'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Get Port Bandwidth'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={88} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'端口带宽查询 · xHCI 规范第 4 章 · p135–138 · 可选规范项'}
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
    section: '§4.6.15',
    zh: 'Get Port Bandwidth',
    en: 'Get Port Bandwidth Command · 端口带宽查询 · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.6.15 p135–138',
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

  /* ===== ① 用途：枚举失败时建议拓扑调整 ===== */
  const q1 = makeChip(
    view,
    '"The Get Port Bandwidth Command is issued by software to retrieve the percentage of Total Available Bandwidth on each Root Hub Port of the xHC … recommend topology changes to the user if they were unable to enumerate a device due to a Bandwidth Error (Root Hub) or Secondary Bandwidth Error (external hub)." — §4.6.15 p135',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 15},
  );
  yield* stage.say('查每端口可用带宽百分比——枚举失败可建议换口。', '① / 6');
  q1().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(4.0);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② BI 概念：8 端口例 ===== */
  const n2 = makeNote(
    view,
    [
      'Bus Instance（BI）概念：每 BI = 一"单位"带宽；',
      '8 端口例：1 个 SS BI + 2 个 HS BI + 4 个 LS/FS BI = 7 BI；',
      '多端口可共享同一 BI——SS 设备共享 SS BI 带宽。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc},
  );
  const q2 = makeChip(
    view,
    '"An xHC may support multiple USB Bus Instances (BI), where each BI represents a \'unit\' bandwidth at the speed that the BI supports. … an xHCI implementation that supports 8 ports may provide 1 SS BI, 2 HS BIs, and 4 LS/FS BIs. … Any SS device attached to a root hub port shares the SS BI bandwidth." — §4.6.15 p135',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc, size: 15},
  );
  yield* stage.say('BI 概念：多端口共享同一"单位"带宽。', '② / 6');
  n2().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.6);
  n2().opacity(0);
  yield* waitFor(0.2);
  n2().remove();
  q2().opacity(0.95);
  yield* waitFor(2.4);
  q2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ 软件侧：摆 Get Port Bandwidth TRB + 敲门铃 ===== */
  const trb: CardApi = makeCard({
    title: 'GetPortBw TRB',
    rows: [
      {k: 'TRB Type', v: 'Get Port Bandwidth'},
      {k: 'Dev Speed', v: '目标设备速度'},
      {k: 'Hub Slot ID', v: "'0'=主带宽域"},
      {k: 'PB Context Ptr', v: 'Context 基址'},
      {k: 'Cycle bit', v: '命令环 PCS'},
    ],
    tint: C.driver,
    w: 500,
    rowSize: 18,
  });
  view.add(trb.node);
  yield* cardIn(trb, new Vector2(TLx(740), TLy(295)));
  yield* stage.say('摆查询 TRB：Dev Speed 定 BI，Hub Slot 0=主域。', '③ / 6');
  yield* cmd.fill(0, 'GetPortBw', C.driver);
  yield* cmd.enqTo(1);
  trb.ref().opacity(0);
  yield* waitFor(0.15);
  trb.ref().remove();
  const q3 = makeChip(
    view,
    '"TRB Type = Get Port Bandwidth Command … Dev Speed = The bus speed of the target device. … Hub Slot ID = \'0\' if referencing Root Hub ports (that is, the Primary Bandwidth Domain) … Port Bandwidth Context Pointer = The base address of the Port Bandwidth Context data structure." — §4.6.15 p137',
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

  /* ===== ④ xHC 执行：逐端口算百分比 → 拷入 Context ===== */
  const c4: CardApi = makeCard({
    title: '执行（L2878-2922）',
    rows: [
      {k: 'Dev Speed 有效', v: '逐端口算百分比'},
      {k: '无设备端口', v: '按 Dev Speed 算'},
      {k: '结果', v: '拷入 PB Context'},
      {k: 'Dev Speed 无效', v: 'TRB Error'},
    ],
    tint: C.hc,
    w: 460,
    rowSize: 18,
  });
  view.add(c4.node);
  const q4 = makeChip(
    view,
    '"Compute Percentage of Total Available Bandwidth for each Root Hub port based on its Speed. Use the value of the Dev Speed field for ports that do not have devices attached. … Copy the results to the Port Bandwidth Context. Completion Code = Success … else // The Dev Speed field is not valid · Completion Code = TRB Error." — §4.6.15 p137-138',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc, size: 15},
  );
  yield* stage.say('逐端口算百分比拷入 Context；速度无效即报错。', '④ / 6');
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

  /* ===== ⑤ 零带宽三规则 ===== */
  const c5: CardApi = makeCard({
    title: '零带宽三规则（L2810-2818）',
    rows: [
      {k: 'Debug Cap 端口', v: '报 0'},
      {k: '查 LS/FS/HS', v: 'USB3 端口报 0'},
      {k: '查 SS', v: 'USB2 端口报 0'},
    ],
    tint: C.warn,
    w: 460,
    rowSize: 18,
  });
  view.add(c5.node);
  const q5 = makeChip(
    view,
    '"A Root Hub port assigned to the Debug Capability shall report \'0\' bandwidth available." "If the Device Speed parameter is LS, FS, or HS, then USB3 (SS) Root Hub ports shall report \'0\' … If the Device Speed parameter is SS, then USB2 Root Hub ports shall report \'0\' bandwidth available." — §4.6.15 p136',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.warn, size: 15},
  );
  yield* stage.say('零带宽三规则：调试口与跨速口报 0。', '⑤ / 6');
  yield* cardIn(c5, new Vector2(TLx(230), TLy(300)));
  q5().opacity(0.95);
  yield* waitFor(3.2);
  c5.ref().opacity(0);
  yield* waitFor(0.2);
  c5.ref().remove();
  q5().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑥ Note：报 0=不可用 / Context 无需初始化 ===== */
  const q6 = makeChip(
    view,
    '"Note: Software shall consider any port that reports \'0\' bandwidth available as being unusable." — §4.6.15 p136',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.warn, size: 17},
  );
  const q6b = makeChip(
    view,
    '"The xHC overwrites the Port Bandwidth Context when it executes the Get Port Bandwidth Command, so software does not need to initialize the context data structure before passing it to the xHC." — §4.6.15 p136',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc, size: 16},
  );
  yield* stage.say('报 0 的端口视为不可用；Context 由 xHC 覆写。', '⑥ / 6');
  q6().opacity(0.95);
  yield* waitFor(2.0);
  q6().opacity(0);
  yield* waitFor(0.2);
  q6b().opacity(0.95);
  yield* waitFor(2.2);
  q6b().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.6.15 Get Port Bandwidth',
    rows: [
      {k: '用途', v: '查每端口可用带宽百分比'},
      {k: '参数', v: 'Dev Speed 定 BI·Hub Slot 定域'},
      {k: '执行', v: '逐端口算→拷入 Context'},
      {k: '报 0', v: '三规则·视为不可用'},
      {k: '下一支', v: '§4.6.16 Force Header（本批）'},
    ],
    tint: C.hc,
    w: 920,
    rowSize: 20,
  });
  view.add(sum.node);
  bell.ref().opacity(0);
  yield* stage.say('端口带宽一目了然——下一支 Force Header。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.4);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});

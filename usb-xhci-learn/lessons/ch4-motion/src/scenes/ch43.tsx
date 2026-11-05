// §4.3 USB 设备初始化 USB Device Initialization —— xHCI 1.2b p71–80
// 判据（evidence/spec-43.txt，示例=FS 设备插 USB2 根端口、Slot ID=1 为示例值）：
//  - 复位后根端口 Disconnected=PP1 等待 (p71)；USB3 attach 成功自动 Enabled / USB2 进
//    Disabled（两族 Disabled 含义不同 p71 Note）(p71-72)
//  - attach: CCS=1 CSC=1；PSCEG 0→1 才产生 Port Status Change Event (p71 步1)
//  - USB2: attach 后 PED=0 PR=0 PLS=7；软件写 PR=1；完成判据 PRC=1 PED=1 PR=0 PLS=U0(0)；
//    复位把设备送入 Default 态备好收 SET_ADDRESS (p72 3.b)
//  - 复位后 PORTSC Port Speed 指示设备速度 (§4.3.1 p75 Note)
//  - Enable Slot 命令经命令环，Slot ID 由 xHC 自选；成功→槽 Enabled (§4.3.2 p75)
//  - 槽初始化 (§4.3.3 p75-76)：Input Context A0=1 A1=1；Slot Ctx 端口号/Route String=0
//    （根端口直连·不含端口号，脚注8 p75）/Context Entries=1；EP0 Ctx Control/MPS=按端口
//    速度默认（FS=8）/MaxBurst=0/TR Dequeue=EP0 环首段/DCS=1/Interval=0/MaxPStreams=0/
//    Mult=0/CErr=3；DCBAA 表项软件装载 (p76 步10)
//  - Address Device BSR=0：xHC 总线代发 SET_ADDRESS；设备 Default→Address；槽
//    Enabled→Addressed；BSR=1 legacy：先 Default 通信、禁发 SET_ADDRESS，成功→槽→Default
//    (p76, §4.3.4 p76-77)
//  - FS 专属 8 字节读取 (p72 步7 + p73)：Setup(TRT=3/len8/IOC0/IDT1/bmRequestType=80h/
//    bRequest=6/wValue=0100h/wIndex=0/wLength=8) → Data(DIR=1/len8/CH0/IOC0/IDT0/缓冲) →
//    Status(DIR=0/len0/CH0/IOC1/IDT0/Buffer=0)；门铃 DB Target=1（EP0 Enqueue Pointer
//    Update, p74 viii）；Status TRB 的 Transfer Event 回后更新 MPS (p74 ix)
//  - Evaluate Context A1=1 → 新 MPS 生效 (p74 x)；LS/HS/SS=8/64/512 可跳过此段 (p72)
//  - 读完整 Device/Configuration Descriptor (p74 步8)；可选 Evaluate Context A0=1 报
//    Max Exit Latency (p74 步9)
//  - Configure Endpoint + SET_CONFIGURATION 双操作同成才升级：设备 Address→Configured、
//    槽 Addressed→Configured；Configure Endpoint 未成发 SET_CONFIGURATION=未定义行为
//    (p74 步10, §4.3.5 p77-78)
//  - 完工：管道全通，可调度 TD (p74 步12, p78)；hub/TT 逐层初始化 Note (p74)
import {makeScene2D, Rect, Txt, Circle} from '@motion-canvas/2d';
import {createRef, Vector2, all, waitFor} from '@motion-canvas/core';
import {C, FONT, G, TLx, TLy} from '../lib/theme';
import {
  buildStage,
  lanesIn,
  makeCard,
  cardIn,
  makeRing,
  makeBell,
  makeBus,
  makeChip,
  makeNote,
  makeArrow,
  makeLampRow,
  makeCodePanel,
  flash,
  CardApi,
  RingApi,
  BusApi,
  LampApi,
  StageApi,
  CodePanelApi,
} from '../lib/parts';
import excerpts from '../../drafts/code-excerpts.json';

export default makeScene2D(function* (view) {
  view.fill(C.bg);

  /* ===== 片头 ===== */
  const t1 = createRef<Txt>();
  const t2 = createRef<Txt>();
  const t3 = createRef<Txt>();
  view.add(
    <>
      <Txt ref={t1} text={'§4.3'} x={0} y={TLy(370)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'USB 设备初始化'} x={0} y={TLy(510)} fontFamily={FONT.sans}
        fontSize={88} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'USB Device Initialization · xHCI 规范第 4 章 · p71–80'}
        x={0} y={TLy(630)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
    </>,
  );
  yield* all(t1().opacity(1, 0.6), t2().opacity(1, 0.6));
  yield* t3().opacity(1, 0.6);
  yield* waitFor(4.3);
  yield* all(t1().opacity(0, 0.4), t2().opacity(0, 0.4), t3().opacity(0, 0.4));
  t1().remove(); t2().remove(); t3().remove();

  /* ===== 舞台 ===== */
  const stage: StageApi = buildStage(view, {
    section: '§4.3',
    zh: 'USB 设备初始化',
    en: 'USB Device Initialization · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.3 p71–80',
  });
  yield* lanesIn(stage);

  /* 三条环：命令环 / 事件环（xHC 泳道上下缘）+ EP0 传输环（驱动泳道下缘） */
  const cmd = makeRing(view, {
    y: 470, zh: '命令环 Command Ring', en: '',
    note: '系统内存 · 驱动写入 / xHC 读取', tint: C.driver, x0: 760, x1: 1450, n: 10,
  });
  const evt = makeRing(view, {
    y: 660, zh: '事件环 Event Ring', en: '',
    note: '系统内存 · xHC 写入 / 驱动读取', tint: C.evt, x0: 760, x1: 1450, n: 10,
  });
  const ep0 = makeRing(view, {
    y: 298, zh: 'EP0 传输环', en: '',
    note: '系统内存 · 驱动写入 / xHC 读取', tint: C.driver, x0: 760, x1: 1450, n: 10,
  });
  /* 代码栈面板（dev 组，行内容逐字来自 drafts/code-excerpts.json）：
     右列 y 带被泳道标签（169..224 驱动 / 413..468 xHC）夹住，面板落 240..415 净带 */
  const panel: CodePanelApi = makeCodePanel(view, {
    x: TLx(1660), y: TLy(327), w: 420, maxVisible: 3,
    title: 'Linux xhci 驱动 · drivers/usb/core + host',
    lines: (excerpts as any).dev.map((e: any) => ({line: e.line, code: e.code})),
  });
  yield* all(
    cmd.group().opacity(1, 0.5),
    evt.group().opacity(1, 0.5),
    ep0.group().opacity(1, 0.5),
    panel.ref().opacity(1, 0.5),
  );
  cmd.markLink(); evt.markLink(); ep0.markLink();

  /* PORTSC 面板（中带新位：避开 deq 标签带 522..542 与 evt enq 带 592..612） */
  const psc = makeLampRow(view, {
    x: TLx(620), y: TLy(570), labels: ['CCS', 'CSC', 'PED', 'PR', 'PLS', 'Speed'], w: 112,
  });
  for (const l of psc) yield* l.ref().opacity(1, 0.2);

  /* 槽状态卡（中带，与灯排分行错开） */
  const slot = makeCard({
    title: '设备槽状态',
    rows: [{k: '状态', v: '无'}],
    tint: C.hc,
    w: 300,
    rowSize: 20,
  });
  view.add(slot.node);
  // 槽卡 v 文本（574..694）与灯排 0/1 号（564..800）x 互叠、仅靠 y 分不开——整体左移出灯排 x 段
  slot.ref().position(new Vector2(TLx(300), TLy(582)));
  slot.ref().opacity(0);

  /* 设备盒 + 状态灯（设备泳道；铭牌拆为独立注记卡，避免 layout 塌缩） */
  const devBox = createRef<Rect>();
  const devState = createRef<Txt>();
  view.add(
    <Rect ref={devBox} position={[TLx(430), TLy(G.laneDevY + 100)]} width={330} radius={12}
      fill={C.panelHi} stroke={C.dev} lineWidth={2} padding={[14, 16]} layout direction={'column'} gap={8} opacity={0}>
      <Rect layout gap={10} alignItems={'center'}>
        <Circle size={14} fill={C.dev} />
        <Txt text={'USB 设备（全速 FS）'} fontFamily={FONT.sans} fontSize={22}
          fontWeight={700} fill={C.dev} />
      </Rect>
      <Rect layout gap={10}>
        <Txt text={'设备状态'} fontFamily={FONT.sans} fontSize={20} fill={C.dim} />
        <Txt ref={devState} text={'Powered'} fontFamily={FONT.mono} fontSize={20} fill={C.ink} />
      </Rect>
    </Rect>,
  );
  const devNameplate = makeNote(
    view,
    [
      '设备铭牌：只见 USB 请求与总线事件——',
      '槽、环、上下文对设备不可见。',
    ],
    {x: TLx(880), y: TLy(G.laneDevY + 96), w: 560, tint: C.dev},
  );

  /* 总线（x 挪 1360：960 会横穿 evt 出环指针标签带与票据走廊） */
  const bus: BusApi = makeBus(view, {x: TLx(1360), y0: TLy(706), y1: TLy(744)});

  /* 工作位（驱动泳道左侧，瞬态卡公用位） */
  const BENCH = new Vector2(TLx(370), TLy(245));

  yield* all(devBox().opacity(1, 0.5), slot.ref().opacity(1, 0.5), bus.wire().opacity(0.9, 0.5));
  yield* stage.say(
    '示例：全速（FS）设备插入 USB2 根端口 1——这条分支步骤最全。设备此刻只感到上电（Powered）。',
  );
  yield* waitFor(8.0); // pace R3: 拍#2 1.1s→9.1s（阈值9.0）

  /* ===== B0 前提与分叉 ===== */
  const fork = makeNote(
    view,
    [
      '复位后根端口 Disconnected：PP=1 上电等待连接（p71）。',
      'USB3 端口 attach 成功自动到 Enabled；USB2 端口进 Disabled 态（p71–72）。',
      '两族的 Disabled 含义不同（p71 Note）——本例走 USB2 分支。',
    ],
    {x: TLx(1200), y: TLy(G.laneDevY + 96), w: 640, tint: C.dev},
  );
  yield* fork().opacity(0.85, 0.4);
  yield* stage.say('端口在 Disconnected 等待。USB2 与 USB3 的路径从这里分岔（p71–72）。', '前提');
  yield* waitFor(9.4);
  yield* fork().opacity(0, 0.3);
  yield* devNameplate().opacity(0.85, 0.4);

  /* ===== B1 插入 ===== */
  yield* all(psc[0].on(C.ok), psc[0].set('1'));
  yield* all(psc[1].on(C.ok), psc[1].set('1'));
  const evt1 = makeCard({
    title: 'Port Status Change Event',
    rows: [
      {k: '触发', v: 'PSCEG 0→1 跳变'},
      {k: 'Port ID', v: '1'},
      {k: '含义', v: '端口 1 有连接事件'},
    ],
    tint: C.evt,
    w: 380,
  });
  view.add(evt1.node);
  yield* cardIn(evt1, new Vector2(TLx(1600), TLy(570)));
  yield* stage.say(
    'B1 插入：CCS=1、CSC=1。PSCEG 发生 0→1 跳变，xHC 产生端口状态变化事件，写上事件环（p71）。',
    'B1 / 11',
  );
  yield* evt.fill(0, 'PSCE', C.evt);
  yield* evt.enqTo(1);
  evt1.ref().remove();
  yield* evt.deqTo(0);
  yield* evt.consume(0);
  yield* evt.deqTo(1);
  yield* waitFor(5.9); // pace R3: 拍#4 2.6s→8.5s（阈值8.4）

  /* ===== B2 查端口 ===== */
  const rdArrow = makeArrow(
    view,
    new Vector2(TLx(450), TLy(505)),
    new Vector2(TLx(676), TLy(545)),
    {color: C.driver, dash: true},
  );
  yield* rdArrow().opacity(0.85, 0.3);
  yield* stage.say('B2 驱动读 PORTSC：CSC=1——连接事件。USB2 端口要软件发起端口复位（p71–72）。', 'B2 / 11');
  yield* all(psc[3].on(C.warn), psc[3].set('1'));
  yield* waitFor(6.7); // pace R3: 拍#5 0.9s→7.6s（阈值7.5）
  yield* stage.say('写 PORTSC.PR=1，发起端口复位（§4.3.1 p75 步1）。', 'B2 / 11');
  yield* waitFor(6.0);

  /* ===== B3 复位完成 ===== */
  yield* all(psc[3].off(), psc[3].set('0'));
  yield* all(psc[2].on(C.ok), psc[2].set('1'));
  yield* all(psc[4].on(C.ok), psc[4].set('U0'));
  yield* all(psc[5].on(C.hc), psc[5].set('FS'));
  yield* stage.say(
    'B3 复位完成四信号：PRC=1、PED=1、PR=0、PLS=U0——一个不能少；Port Speed 指示 FS（p72、§4.3.1 p75）。',
    'B3 / 11',
  );
  yield* devState().fill(C.dev, 0.2);
  devState().text('Default');
  yield* waitFor(8.2); // pace R3: 拍#7 0.9s→9.1s（阈值9.0）
  yield* stage.say('复位把设备送入 Default 态——备好收 SET_ADDRESS（p72）。', 'B3 / 11');
  yield* waitFor(7.1);
  yield* rdArrow().opacity(0, 0.2);

  /* ===== B4 取槽 ===== */
  const cmd1 = makeCard({
    title: 'Command TRB',
    tag: 'Enable Slot',
    rows: [{k: 'TRB Type', v: 'Enable Slot'}],
    tint: C.driver,
    w: 300,
  });
  view.add(cmd1.node);
  yield* cardIn(cmd1, new Vector2(TLx(380), TLy(400)));
  yield* stage.say('B4 端口 Enabled 后，驱动发 Enable Slot 命令要一个设备槽（p72 步4）。', 'B4 / 11');
  yield* cmd1.ref().position(cmd.cell(0), 0.6);
  yield* cmd.fill(0, 'EnbSlot', C.driver);
  cmd1.ref().remove();
  yield* cmd.enqTo(1);
  yield* cmd.deqTo(0);
  yield* cmd.consume(0);
  yield* cmd.deqTo(1);
  const slotEvt = makeCard({
    title: 'Command Completion Event',
    rows: [{k: 'Slot ID', v: '1（xHC 自选）'}],
    tint: C.evt,
    w: 360,
  });
  view.add(slotEvt.node);
  yield* evt.fill(1, 'CCE', C.evt);
  yield* evt.enqTo(2);
  yield* cardIn(slotEvt, new Vector2(TLx(1600), TLy(570)));
  yield* waitFor(2.7); // pace R3: 拍#9 4.0s→6.7s（阈值6.6）
  yield* stage.say(
    '完成事件带回 Slot ID=1——由 xHC 自选（§4.3.2 p75）。设备槽进入 Enabled。',
    'B4 / 11',
  );
  yield* slot.ref().opacity(0, 0.15);
  slot.row(0)().text('Enabled · Slot ID=1');
  yield* slot.ref().opacity(1, 0.2);
  slotEvt.ref().remove();
  yield* evt.deqTo(1);
  yield* evt.consume(1);
  yield* evt.deqTo(2);
  yield* waitFor(4.1); // pace R3: 拍#10 2.8s→6.9s（阈值6.8）

  /* ===== B5 槽初始化 ===== */
  const ic = makeCard({
    title: 'Input Context（输入上下文）',
    rows: [
      {k: 'A0 / A1', v: '1 / 1（Slot+EP0 受影响）'},
      {k: 'Slot·端口号', v: '1（根端口 1）'},
      {k: 'Slot·Route String', v: '0（根端口直连）'},
      {k: 'Slot·Context Entries', v: '1'},
      {k: 'EP0·类型', v: 'Control'},
      {k: 'EP0·Max Packet Size', v: '8（FS 默认，随端口速度）'},
      {k: 'EP0·TR Dequeue Ptr', v: 'EP0 环首段'},
      {k: 'EP0·DCS / CErr', v: '1 / 3'},
      {k: 'EP0·其余', v: 'MaxBurst=0 Interval=0 MaxPStreams=0 Mult=0'},
    ],
    tint: C.driver,
    w: 560,
    rowSize: 19,
  });
  view.add(ic.node);
  // ic 大卡（H≈332）BENCH 位会顶到页头 en 副标题——单独下移；底行仍让开命令环标签带
  yield* cardIn(ic, new Vector2(TLx(370), TLy(290)));
  yield* ep0.fill(0, '…', C.driver);
  yield* stage.say(
    'B5 槽初始化：填输入上下文（A0=1、A1=1；Route String=0 根端口直连——不含端口号，脚注8 p75），EP0 传输环上架（p75–76）。',
    'B5 / 11',
  );
  yield* waitFor(10.2);
  const dcbaa = makeChip(
    view,
    'DCBAA 1 号格由软件挂上输出上下文指针（p76 步10）——xHC 只读',
    {x: TLx(300), y: TLy(655), w: 420, tint: C.dim, size: 18},
  );
  yield* dcbaa().opacity(0.9, 0.3);
  yield* waitFor(5.1);
  yield* all(ic.ref().opacity(0, 0.3), dcbaa().opacity(0, 0.3));
  ic.ref().remove();

  /* ===== B6 编址 ===== */
  const cmd2 = makeCard({
    title: 'Command TRB',
    tag: 'Address Device',
    rows: [
      {k: 'TRB Type', v: 'Address Device'},
      {k: 'BSR', v: '0（主线）'},
      {k: 'Input Context', v: '指向上面填好的'},
    ],
    tint: C.driver,
    w: 360,
  });
  view.add(cmd2.node);
  yield* cardIn(cmd2, new Vector2(TLx(310), TLy(415)));
  yield* panel.highlight(9);
  yield* stage.say('B6 编址：Address Device（BSR=0）上命令环（§4.3.4 p76）。', 'B6 / 11');
  yield* cmd2.ref().position(cmd.cell(1), 0.6);
  yield* cmd.fill(1, 'AddrDev', C.driver);
  yield* panel.highlight(10);
  cmd2.ref().remove();
  yield* cmd.enqTo(2);
  yield* cmd.deqTo(1);
  yield* cmd.consume(1);
  yield* cmd.deqTo(2);
  yield* waitFor(2.5); // pace R3: 拍#12 3.1s→5.6s（阈值5.5）
  yield* stage.say(
    'xHC 执行：在总线上代发 SET_ADDRESS（地址 1）——设备第一次收到 USB 请求，发请求的是 xHC，不是驱动。',
    'B6 / 11',
  );
  yield* bus.send('SET_ADDRESS(1)', true, C.dev);
  yield* devState().fill(C.ink, 0.2);
  devState().text('Address');
  yield* slot.ref().opacity(0, 0.15);
  slot.row(0)().text('Addressed');
  yield* slot.ref().opacity(1, 0.2);
  yield* panel.highlight(11);
  yield* evt.fill(2, 'CCE', C.evt);
  yield* evt.enqTo(3);
  yield* waitFor(6.3); // pace R3: 拍#13 3.2s→9.5s（阈值9.4）
  yield* stage.say(
    '设备 Default→Address，槽 Enabled→Addressed（BSR=0 成功路径，p76–77）。',
    'B6 / 11',
  );
  yield* evt.deqTo(2);
  yield* evt.consume(2);
  yield* evt.deqTo(3);
  const bsr = makeNote(
    view,
    [
      'legacy 分支：Address Device BSR=1——',
      '先在 Default 态通信、禁止 xHC 发 SET_ADDRESS；',
      '成功后槽→Default（p77）。',
    ],
    {x: TLx(370), y: TLy(245), w: 500, tint: C.warn},
  );
  yield* bsr().opacity(0.85, 0.3);
  yield* waitFor(7.8);
  yield* bsr().opacity(0, 0.3);

  /* ===== B7 问尺寸（FS 专属） ===== */
  yield* panel.highlight(0);
  yield* stage.say(
    'B7 问尺寸——仅 FS 必走：读 Device Descriptor 前 8 字节取 bMaxPacketSize0（LS/HS/SS=8/64/512 可跳过，p72）。',
    'B7 / 11',
  );
  const bell = makeBell(view, {x: TLx(1650), y: TLy(570)});
  yield* bell.ref().opacity(1, 0.3);
  let ep = 0;
  const trbs: [string, {k: string; v: string}[]][] = [
    ['Setup Stage TRB', [
      {k: 'TRT', v: 'IN Data Stage (3)'},
      {k: 'Length / IDT / IOC', v: '8 / 1 / 0'},
      {k: 'bmRequestType', v: '80h'},
      {k: 'bRequest', v: '6 GET_DESCRIPTOR'},
      {k: 'wValue / wIndex / wLength', v: '0100h / 0 / 8'},
    ]],
    ['Data Stage TRB', [
      {k: 'DIR', v: '1（IN）'},
      {k: 'Length / CH / IOC / IDT', v: '8 / 0 / 0 / 0'},
      {k: 'Buffer', v: '描述符接收缓冲'},
    ]],
    ['Status Stage TRB', [
      {k: 'DIR', v: '0（OUT）'},
      {k: 'Length / CH / IOC / IDT', v: '0 / 0 / 1 / 0'},
      {k: 'Buffer', v: '0'},
    ]],
  ];
  const hlBench = [2, 4, 6];
  const hlRing = [3, 5, 7];
  for (const [title, rows] of trbs) {
    const card = makeCard({title, rows, tint: C.driver, w: 430, rowSize: 18});
    view.add(card.node);
    yield* cardIn(card, BENCH);
    yield* panel.highlight(hlBench[ep]);
    yield* card.ref().position(ep0.cell(ep), 0.5);
    yield* ep0.fill(ep, title.split(' ')[0], C.driver);
    card.ref().remove();
    yield* ep0.enqTo(ep + 1);
    yield* panel.highlight(hlRing[ep]);
    ep++;
  }
  yield* bell.ring('1');
  yield* panel.highlight(8);
  yield* waitFor(2.0); // pace R3: 拍#15 7.6s→9.6s（阈值9.5）
  yield* stage.say(
    '三段式控制传输上 EP0 环，敲门铃 DB Target=1——EP0 入环指针更新（p73–74）。',
    'B7 / 11',
  );
  yield* ep0.deqTo(0);
  yield* bus.send('GET_DESCRIPTOR(8B)', true, C.dev);
  yield* bus.send('前 8 字节', false, C.evt);
  yield* ep0.consume(0);
  yield* ep0.deqTo(1);
  yield* evt.fill(3, 'XferEvt', C.evt);
  yield* evt.enqTo(4);
  yield* waitFor(2.6); // pace R3: 拍#16 4.7s→7.3s（阈值7.2）
  yield* stage.say(
    'Status 段的 Transfer Event 回来，带回 bMaxPacketSize0=8（p74）。',
    'B7 / 11',
  );
  yield* evt.deqTo(3);
  yield* evt.consume(3);
  yield* evt.deqTo(4);
  yield* waitFor(4.2); // pace R3: 拍#17 2.2s→6.4s（阈值6.3）

  /* ===== B8 更新上下文 ===== */
  const cmd3 = makeCard({
    title: 'Command TRB',
    tag: 'Evaluate Context',
    rows: [{k: 'A1=1', v: 'EP0 Max Packet Size 更新'}],
    tint: C.driver,
    w: 340,
  });
  view.add(cmd3.node);
  yield* cardIn(cmd3, new Vector2(TLx(380), TLy(400)));
  yield* stage.say(
    'B8 Evaluate Context（A1=1）通知 xHC：EP0 Max Packet Size 换新值，此后传输按新值（p74）。',
    'B8 / 11',
  );
  yield* cmd3.ref().position(cmd.cell(2), 0.6);
  yield* cmd.fill(2, 'EvalCtx', C.driver);
  cmd3.ref().remove();
  yield* cmd.enqTo(3);
  yield* cmd.deqTo(2);
  yield* cmd.consume(2);
  yield* cmd.deqTo(3);
  yield* evt.fill(4, 'CCE', C.evt);
  yield* evt.enqTo(5);
  yield* evt.deqTo(4);
  yield* evt.consume(4);
  yield* evt.deqTo(5);
  yield* waitFor(0.8); // pace R3: 拍#18 7.6s→8.4s（阈值8.3）

  /* ===== B9 读档案 ===== */
  const docs = makeCard({
    title: 'GET_DESCRIPTOR 完整档案',
    rows: [
      {k: 'Device Descriptor', v: '完整读入'},
      {k: 'Configuration Desc.', v: '读入'},
      {k: '通道', v: 'EP0 控制传输'},
    ],
    tint: C.evt,
    w: 430,
  });
  view.add(docs.node);
  yield* cardIn(docs, BENCH);
  yield* panel.highlight(0);
  yield* bus.send('GET_DESCRIPTOR(Device)', true, C.dev);
  yield* bus.send('描述符数据', false, C.evt);
  yield* stage.say(
    'B9 EP0 全面可用：读完整 Device 与 Configuration Descriptor，交给类驱动（p74 步8）。',
    'B9 / 11',
  );
  yield* waitFor(7.1);
  yield* docs.ref().opacity(0, 0.3);
  docs.ref().remove();

  /* ===== B10 配置（双操作同成） ===== */
  const cfg1 = makeCard({
    title: 'Configure Endpoint',
    tag: '命令环',
    rows: [{k: '对象', v: '设备槽（Endpoint Context）'}],
    tint: C.driver,
    w: 380,
  });
  const cfg2 = makeCard({
    title: 'SET_CONFIGURATION',
    tag: 'USB 请求',
    rows: [{k: '通道', v: 'EP0 → 总线'}],
    tint: C.dev,
    w: 340,
  });
  view.add(cfg1.node);
  view.add(cfg2.node);
  yield* cardIn(cfg1, new Vector2(TLx(380), TLy(400)));
  yield* cardIn(cfg2, new Vector2(TLx(1660), TLy(680)));
  yield* stage.say(
    'B10 双操作同成：Configure Endpoint 命令配槽，SET_CONFIGURATION 请求配设备（p74 步10）。',
    'B10 / 11',
  );
  yield* cmd.fill(3, 'CfgEndp', C.driver);
  yield* cmd.enqTo(4);
  yield* cmd.deqTo(3);
  yield* cmd.consume(3);
  yield* cmd.deqTo(4);
  yield* bus.send('SET_CONFIGURATION', true, C.dev);
  yield* evt.fill(5, 'CCE', C.evt);
  yield* evt.enqTo(6);
  const rule = makeChip(
    view,
    '缺一不可：Configure Endpoint 未成功就发 SET_CONFIGURATION = 未定义行为（p78）',
    {x: TLx(1200), y: TLy(890), w: 800, tint: C.warn, size: 19},
  );
  yield* rule().opacity(0.9, 0.3);
  yield* devState().fill(C.dev, 0.2);
  devState().text('Configured');
  yield* slot.ref().opacity(0, 0.15);
  slot.row(0)().text('Configured');
  yield* slot.ref().opacity(1, 0.2);
  yield* waitFor(3.5); // pace R3: 拍#20 5.0s→8.5s（阈值8.4）
  yield* stage.say(
    '双绿：设备 Address→Configured、槽 Addressed→Configured（§4.3.5 p77–78）。',
    'B10 / 11',
  );
  yield* all(cfg1.ref().opacity(0, 0.3), cfg2.ref().opacity(0, 0.3), rule().opacity(0, 0.3));
  cfg1.ref().remove();
  cfg2.ref().remove();
  yield* waitFor(6.0); // pace R3: 拍#21 1.0s→7.0s（阈值6.9）

  /* ===== B11 完工 ===== */
  yield* stage.say(
    'B11 管道全通——可在任意已启用端点的传输环上调度 TD（p74 步12、p78）。',
    'B11 / 11',
  );
  yield* flash(ep0.group, 2);
  yield* waitFor(5.7); // pace R3: 拍#22 1.5s→7.2s（阈值7.1）

  /* ===== 收束：设备视角（outro 清场后总结卡进设备泳道） ===== */
  const sum = makeCard({
    title: '设备视角 vs 槽视角',
    rows: [
      {k: '设备状态', v: 'Powered→Default→Address→Configured'},
      {k: '设备槽状态', v: 'Enabled→Addressed→Configured'},
      {k: '设备看见的', v: '只有 USB 请求与总线事件'},
    ],
    tint: C.dev,
    w: 700,
    rowSize: 23,
  });
  view.add(sum.node);
  yield* all(
    devNameplate().opacity(0, 0.3),
    ...psc.map(l => l.ref().opacity(0, 0.3)),
    slot.ref().opacity(0, 0.3),
    bell.ref().opacity(0, 0.3),
  );
  yield* stage.say(
    '设备全程只见 USB 请求——槽、环、上下文对设备不可见。下一节：设备移除（§4.4）。对照：Linux 内核 d9008e061539 xhci 驱动。',
    '完',
  );
  yield* cardIn(sum, new Vector2(TLx(960), TLy(844)));
  /* hub/TT 注记放 outro 后：右列 y 413..468 是 xHC 泳道标签带，与面板分时复用其净带 */
  const hubNote = makeNote(
    view,
    [
      'hub/TT 拓扑：必须逐层完整初始化（从根集线器起，一层完成再下一层），',
      '否则 xHC 行为未定义（p74 Note）。',
    ],
    {x: TLx(1660), y: TLy(327), w: 380, tint: C.dim},
  );
  yield* panel.ref().opacity(0, 0.3);
  yield* hubNote().opacity(0.85, 0.3);
  yield* waitFor(8.9); // pace R3: 拍#23 10.1s→11.2s（阈值11.2，7.8→8.9）
  yield* all(
    hubNote().opacity(0, 0.3),
    sum.ref().opacity(0, 0.5),
    stage.caption().opacity(0, 0.5),
  );
});

// §4.2 主机控制器初始化 Host Controller Initialization —— xHCI 1.2b p68-70
// 判据（evidence/spec-42.txt）：
//  - 开机：xHC 被 PCI 枚举、分配寄存器空间基地址；软件设 FLADJ 为系统特定值 (p68)
//  - 芯片硬件复位后等 USBSTS.CNR=0 才能写任何 Operational/Runtime 寄存器 (p69)
//  - Note：后续各步顺序不强制，但必须在 USBCMD R/S=1 前全部完成 (p69)
//  - 六步：MaxSlotsEn(CONFIG 5.4.7) / DCBAAP(5.4.6) / CRCR(5.4.5) /
//          事件环（段/ERST/ERSTSZ/ERDP；写 ERSTBA=启用事件环 p70）/
//          中断（MSI-X 表向量0 至少初始化并启用、PBA、Interval(5.5.2.2)、
//          INTE(USBCMD 5.4.1)、IE(5.5.2.1)）
//  - 脚注7：中断可选，xHC 可由软件轮询事件环管理 (p69)
//  - R/S=1 → xHC 开始接受门铃引用；随后根集线器端口开始上报连接 (p70)
//  - USB2(LS/FS/HS) 端口必须端口复位才到 Enabled；SS 端口 attach 成功自动 Enabled (p70)
import {makeScene2D, Rect, Txt, Circle} from '@motion-canvas/2d';
import {createRef, Vector2, all, waitFor} from '@motion-canvas/core';
import {C, FONT, G, TLx, TLy} from '../lib/theme';
import {
  buildStage,
  lanesIn,
  makeCard,
  cardIn,
  makeLampRow,
  makeChip,
  makeNote,
  makeArrow,
  makeCodePanel,
  flash,
  StageApi,
  LampApi,
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
      <Txt ref={t1} text={'§4.2'} x={0} y={TLy(380)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'主机控制器初始化'} x={0} y={TLy(520)} fontFamily={FONT.sans}
        fontSize={88} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'Host Controller Initialization · xHCI 规范第 4 章 · p68–70'}
        x={0} y={TLy(640)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
    </>,
  );
  yield* all(t1().opacity(1, 0.6), t2().opacity(1, 0.6));
  yield* t3().opacity(1, 0.6);
  yield* waitFor(5.4);
  yield* all(t1().opacity(0, 0.4), t2().opacity(0, 0.4), t3().opacity(0, 0.4));
  t1().remove(); t2().remove(); t3().remove();

  /* ===== 舞台 ===== */
  const stage: StageApi = buildStage(view, {
    section: '§4.2',
    zh: '主机控制器初始化',
    en: 'Host Controller Initialization · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.2 p68–70',
  });
  yield* lanesIn(stage);
  const devNote = makeNote(
    view,
    [
      '本流程不涉设备——R/S=1 之前，',
      '端口还没有开始上报连接（p70）。',
      '端口上报后才进入 §4.3 的设备初始化。',
    ],
    {x: TLx(1180), y: TLy(G.laneDevY + 100), w: 800, tint: C.dev},
  );
  yield* devNote().opacity(0.85, 0.5);
  /* 代码栈面板（init 组，行内容逐字来自 drafts/code-excerpts.json）：
     右列 y 169..224 是驱动泳道标签带，面板落其下 240..415 净带 */
  const panel: CodePanelApi = makeCodePanel(view, {
    x: TLx(1660), y: TLy(327), w: 420, maxVisible: 3,
    title: 'Linux xhci 驱动 · drivers/usb/host/xhci.c + xhci-mem.c',
    lines: (excerpts as any).init.map((e: any) => ({line: e.line, code: e.code})),
  });
  yield* panel.ref().opacity(1, 0.4);
  yield* stage.say(
    '系统启动，xHC 就位。本节四个阶段：等就绪、自由组五步、合闸、端口上报。',
  );
  yield* waitFor(6.0); // pace R3: 拍#2 1.4s→7.4s（阈值7.3）

  /* ===== 0) 开机三件事 ===== */
  const boot = makeCard({
    title: '开机前提',
    rows: [
      {k: 'PCI 枚举', v: 'xHC 被系统发现'},
      {k: '寄存器基地址', v: '分配 xHC 寄存器空间'},
      {k: 'FLADJ', v: '帧长调整=系统特定值'},
    ],
    tint: C.driver,
    w: 470,
  });
  view.add(boot.node);
  yield* cardIn(boot, new Vector2(TLx(380), TLy(G.laneDriverY + 118)));
  yield* panel.highlight(0);
  yield* stage.say(
    '开机时 xHC 先被 PCI 枚举、拿到寄存器空间基地址；软件把 FLADJ 设为系统特定值（p68）。',
    '前提',
  );
  yield* waitFor(11.0);

  /* ===== 1) 等 CNR=0 ===== */
  const [cnr] = makeLampRow(view, {x: TLx(1180), y: TLy(G.laneDriverY + 118), labels: ['USBCMD 前：'] , w: 300});
  const cnrLamp = makeCard({
    title: 'USBSTS',
    tag: '状态寄存器',
    rows: [
      {k: 'CNR', v: 'Controller Not Ready'},
      {k: 'CNR=1 期间', v: '禁写任何 Operational/Runtime 寄存器'},
      {k: '动手条件', v: '等 CNR=0'},
    ],
    tint: C.hc,
    w: 500,
  });
  view.add(cnrLamp.node);
  yield* cardIn(cnrLamp, new Vector2(TLx(360), TLy(540)));
  yield* panel.highlight(1);
  void cnr;
  yield* stage.say(
    '芯片硬件复位后先等：USBSTS 的 CNR 位变 0 之前，任何 Operational/Runtime 寄存器都不许写（p69）。',
    '① 等就绪',
  );
  yield* flash(cnrLamp.ref, 2);
  yield* waitFor(9.9);

  /* ===== 顺序自由组框架 ===== */
  const freeBox = createRef<Rect>();
  view.add(
    <Rect
      ref={freeBox}
      position={[TLx(960), TLy(545)]}
      width={1080}
      height={250}
      radius={16}
      stroke={C.edgeHi}
      lineWidth={1.6}
      dash={[10, 8]}
      opacity={0}
    >
      <Txt
        y={-100}
        text={'顺序自由组——先后不强制，但必须全部在 USBCMD R/S=1 之前完成（p69 Note）'}
        fontFamily={FONT.sans}
        fontSize={21}
        fill={C.dim}
      />
    </Rect>,
  );
  yield* all(freeBox().opacity(1, 0.4), cnrLamp.ref().opacity(0, 0.3));
  cnrLamp.ref().remove();

  /* 自由组进度：不再用独立灯排（与框顶注记互叠），改在每张 S 卡内打勾 */
  const lamps: any[] = [];

  /* ===== S1 MaxSlotsEn ===== */
  const s1 = makeCard({
    title: 'S1 · CONFIG.MaxSlotsEn',
    rows: [
      {k: '作用', v: '启用软件要用的设备槽数量'},
      {k: '寄存器', v: 'CONFIG（5.4.7）'},
      {k: '完成', v: ''},
    ],
    tint: C.hc,
    w: 460,
  });
  view.add(s1.node);
  yield* cardIn(s1, new Vector2(TLx(420), TLy(565)));
  yield* panel.highlight(3);
  yield* stage.say('S1：配 CONFIG.MaxSlotsEn，定设备槽数量上限（p69）。', '②·S1 自由组');
  yield* s1.row(2)().text('✓ 已配置');
  yield* waitFor(3.9); // pace R3: 拍#5 1.7s→5.6s（阈值5.5）
  yield* s1.ref().opacity(0, 0.3);
  s1.ref().remove();

  /* ===== S2 DCBAAP ===== */
  const s2 = makeCard({
    title: 'S2 · DCBAAP',
    rows: [
      {k: '作用', v: '指向设备上下文基地址数组 DCBAA'},
      {k: '装载者', v: '软件（xHC 只读）'},
      {k: '寄存器', v: 'DCBAAP（5.4.6）'},
      {k: '完成', v: ''},
    ],
    tint: C.hc,
    w: 460,
  });
  view.add(s2.node);
  yield* cardIn(s2, new Vector2(TLx(420), TLy(565)));
  yield* panel.highlight(5);
  yield* stage.say('S2：DCBAAP 指向 DCBAA——每个设备槽的输出上下文指针由软件装表（p69）。', '②·S2 自由组');
  yield* s2.row(3)().text('✓ 已装载');
  yield* waitFor(5.6); // pace R3: 拍#6 1.7s→7.3s（阈值7.2）
  yield* s2.ref().opacity(0, 0.3);
  s2.ref().remove();

  /* ===== S3 CRCR ===== */
  const s3 = makeCard({
    title: 'S3 · CRCR',
    rows: [
      {k: '作用', v: '命令环起点（首个 TRB 地址）'},
      {k: '寄存器', v: 'CRCR（5.4.5 · Operational）'},
      {k: '完成', v: ''},
    ],
    tint: C.hc,
    w: 460,
  });
  view.add(s3.node);
  yield* cardIn(s3, new Vector2(TLx(420), TLy(565)));
  yield* panel.highlight(4);
  yield* stage.say('S3：CRCR 写入命令环首 TRB 地址——§4.1 的命令通道从这里开始（p69）。', '②·S3 自由组');
  yield* s3.row(2)().text('✓ 已写入');
  yield* waitFor(5.1); // pace R3: 拍#7 1.7s→6.8s（阈值6.7）
  yield* s3.ref().opacity(0, 0.3);
  s3.ref().remove();

  /* ===== S4 事件环 ===== */
  const s4 = makeCard({
    title: 'S4 · 事件环四件套',
    rows: [
      {k: '段', v: 'Event Ring Segment 分配'},
      {k: 'ERST', v: '段表（指向段+段大小）'},
      {k: 'ERSTSZ', v: '段数量'},
      {k: 'ERDP', v: '首段起始地址'},
      {k: 'ERSTBA', v: '段表基地址（写入即启用）'},
    ],
    tint: C.evt,
    w: 500,
  });
  view.add(s4.node);
  yield* cardIn(s4, new Vector2(TLx(430), TLy(555)));
  yield* panel.highlight(6);
  yield* stage.say(
    'S4：事件环四件套依次就位——分配段、建 ERST 段表、写 ERSTSZ 与 ERDP。',
    '②·S4 自由组',
  );
  yield* panel.highlight(7);
  yield* waitFor(6.8);
  const erst = makeChip(
    view,
    '写 ERSTBA 的这一刻，事件环启用（p70 · §4.9.4）',
    {x: TLx(1220), y: TLy(555), w: 560, tint: C.evt, size: 20},
  );
  yield* erst().opacity(1, 0.3);
  yield* panel.highlight(8);
  yield* stage.say('最后写 ERSTBA——写入即启用事件环（p70）。', '②·S4 自由组');
  yield* waitFor(6.8);
  yield* all(s4.ref().opacity(0, 0.3), erst().opacity(0, 0.3));
  s4.ref().remove();

  /* ===== S5 中断链 ===== */
  const s5 = makeCard({
    title: 'S5 · 中断链',
    rows: [
      {k: 'MSI-X 表', v: '向量 0 至少初始化并启用'},
      {k: 'PBA', v: 'Pending Bit Array 就位'},
      {k: 'Interval', v: '中断节流率（5.5.2.2）'},
      {k: 'INTE', v: 'USBCMD 开系统总线中断'},
      {k: 'IE', v: 'Interrupter 开中断（5.5.2.1）'},
    ],
    tint: C.hc,
    w: 500,
  });
  view.add(s5.node);
  yield* cardIn(s5, new Vector2(TLx(430), TLy(555)));
  const irqOpt = makeChip(
    view,
    '中断可选——xHC 可由软件轮询事件环管理（p69 脚注 7）',
    {x: TLx(1290), y: TLy(555), w: 520, tint: C.dim, size: 18},
  );
  yield* irqOpt().opacity(0.9, 0.3);
  yield* stage.say(
    'S5：中断链点亮——MSI-X 表（向量 0 起步）、节流 Interval、INTE、IE 依次打开（p69–70）。',
    '②·S5 自由组',
  );
  yield* waitFor(8.8);
  yield* all(s5.ref().opacity(0, 0.3), irqOpt().opacity(0, 0.3), freeBox().opacity(0, 0.3));
  s5.ref().remove();

  /* ===== 6) R/S=1 ===== */
  const rs = makeCard({
    title: 'USBCMD · R/S',
    tag: '总闸',
    rows: [
      {k: '写 1 效果', v: 'xHC 开始接受门铃引用'},
      {k: '前提', v: '上面六步全部完成'},
    ],
    tint: C.warn,
    w: 460,
  });
  view.add(rs.node);
  yield* cardIn(rs, new Vector2(TLx(420), TLy(545)));
  yield* panel.highlight(10);
  yield* stage.say('合闸：USBCMD R/S=1。从此 xHC 才开始接受门铃引用（p70）。', '③ 合闸');
  yield* flash(rs.ref, 2);
  yield* panel.highlight(11);
  yield* waitFor(9.9);

  /* ===== 7) 端口苏醒 ===== */
  const portBar = createRef<Rect>();
  const portLbl = ['USB2·1', 'USB2·2', 'SS·1', 'SS·2'];
  const portDots = portLbl.map(() => createRef<Circle>());
  view.add(
    <Rect ref={portBar} position={[TLx(1200), TLy(545)]} width={430} radius={12}
      fill={C.panelHi} stroke={C.edge} lineWidth={1.5} padding={[16, 18]} layout gap={26}
      justifyContent={'center'} opacity={0}>
      {portLbl.map((l, i) => (
        <Rect layout gap={8} alignItems={'center'}>
          <Circle ref={portDots[i]} size={16} fill={C.faint} />
          <Txt text={l} fontFamily={FONT.mono} fontSize={19} fill={C.dim} />
        </Rect>
      ))}
    </Rect>,
  );
  const upArrow = makeArrow(
    view,
    new Vector2(TLx(960), TLy(545)),
    new Vector2(TLx(1000), TLy(545)),
    {color: C.ok},
  );
  yield* all(rs.ref().opacity(0, 0.3), portBar().opacity(1, 0.4), upArrow().opacity(0.9, 0.4));
  rs.ref().remove();
  yield* stage.say(
    '控制器运行——根集线器端口开始上报设备连接，软件按 §4.3 枚举设备（p70）。',
    '④ 端口上报',
  );
  for (const d of portDots) {
    yield* d().fill(C.ok, 0.15);
  }
  yield* waitFor(8.8);

  /* ===== 8) USB2 vs SS 分叉 ===== */
  yield* all(portBar().opacity(0, 0.3), upArrow().opacity(0, 0.3));
  const fork = makeNote(
    view,
    [
      'USB2（LS/FS/HS）端口：必须走端口复位才能到 Enabled（p70）；',
      'SS 端口：attach 成功自动到 Enabled（p70）——',
      '两个协议族路径不同，§4.3 分别处理。',
    ],
    {x: TLx(960), y: TLy(560), w: 900, tint: C.warn},
  );
  yield* fork().opacity(0.9, 0.4);
  yield* stage.say(
    '注意分叉：USB2 端口必须软件发起端口复位才 Enabled；SS 端口 attach 成功自动 Enabled（p70）。',
    '④ 协议分叉',
  );
  yield* waitFor(14.0);

  /* ===== 总结 ===== */
  const sum = makeCard({
    title: '§4.2 初始化清单',
    rows: [
      {k: '①', v: '等 USBSTS.CNR=0 p69'},
      {k: '②', v: '顺序自由组六步 p69-70'},
      {k: '③', v: 'USBCMD R/S=1 p70'},
      {k: '④', v: '端口上报连接 p70'},
    ],
    tint: C.hc,
    w: 620,
    rowSize: 23,
  });
  view.add(sum.node);
  yield* all(fork().opacity(0, 0.3), portBar().opacity(0, 0.3), upArrow().opacity(0, 0.3));
  yield* stage.say(
    '下一节：端口上报连接之后，一个 USB 设备如何走完初始化（§4.3）。对照：Linux 内核 d9008e061539 xhci 驱动。',
    '完',
  );
  yield* cardIn(sum, new Vector2(TLx(960), TLy(548)));
  yield* waitFor(14.0);
  yield* all(sum.ref().opacity(0, 0.5), stage.caption().opacity(0, 0.5));
});

// 共享零件库 —— 三方泳道舞台 / TRB 卡 / 环带 / 门铃 / 字幕条
import {
  Rect,
  Txt,
  Line,
  Circle,
  Node,
  View2D,
  RectProps,
  TxtProps,
} from '@motion-canvas/2d';
import {
  createRef,
  Vector2,
  ThreadGenerator,
  tween,
  easeInOutCubic,
  easeOutBack,
  waitFor,
  all,
} from '@motion-canvas/core';
import {C, FONT, G, PARTY, Party, TLx, TLy} from './theme';

export type Ref<T> = {(): T};

/* 文本锚定包装：Txt 无对齐能力（extends Shape），横向对齐由外层 layout Rect 承担 */
function Anchor(props: {
  x?: number;
  y?: number;
  w: number;
  align: 'start' | 'end' | 'center';
  opacity?: number;
  children: any;
}) {
  return (
    <Rect
      position={[props.x ?? 0, props.y ?? 0]}
      width={props.w}
      layout
      justifyContent={props.align}
      opacity={props.opacity ?? 1}
    >
      {props.children}
    </Rect>
  );
}

/* ---------- 舞台：页头 + 三泳道 + 字幕条 ---------- */

export interface StageApi {
  caption: Ref<Txt>;
  step: Ref<Txt>;
  cite: Ref<Txt>;
  lane: Record<Party, Ref<Rect>>;
  laneNote: Record<Party, Ref<Txt>>;
  say(text: string, step?: string): ThreadGenerator;
}

export function buildStage(
  view: View2D,
  opts: {section: string; zh: string; en: string; cite: string},
): StageApi {
  const caption = createRef<Txt>();
  const step = createRef<Txt>();
  const cite = createRef<Txt>();
  const lane = {
    driver: createRef<Rect>(),
    hc: createRef<Rect>(),
    dev: createRef<Rect>(),
  };
  const laneNote = {
    driver: createRef<Txt>(),
    hc: createRef<Txt>(),
    dev: createRef<Txt>(),
  };

  const laneDefs: {p: Party; y: number; h: number}[] = [
    {p: 'driver', y: G.laneDriverY, h: G.laneDriverH},
    {p: 'hc', y: G.laneHcY, h: G.laneHcH},
    {p: 'dev', y: G.laneDevY, h: G.laneDevH},
  ];

  view.add(
    <>
      {/* 三泳道 */}
      {laneDefs.map(({p, y, h}) => (
        <Rect
          ref={lane[p]}
          x={TLx((G.laneX0 + G.laneX1) / 2)}
          y={TLy(y + h / 2)}
          width={G.laneX1 - G.laneX0}
          height={h}
          radius={14}
          fill={C.panel}
          stroke={C.edge}
          lineWidth={1.5}
          opacity={0}
        >
          <Rect
            position={[-(G.laneX1 - G.laneX0) / 2 + 16, 0]}
            width={6}
            height={h - 24}
            radius={3}
            fill={PARTY[p].color}
            opacity={0.9}
          />
          <Anchor
            x={(G.laneX1 - G.laneX0) / 2 - 300}
            y={-h / 2 + 26}
            w={520}
            align={'end'}
          >
            <Txt
              text={PARTY[p].zh}
              fontFamily={FONT.sans}
              fontSize={26}
              fontWeight={700}
              fill={PARTY[p].color}
            />
          </Anchor>
          <Anchor
            x={(G.laneX1 - G.laneX0) / 2 - 300}
            y={-h / 2 + 56}
            w={520}
            align={'end'}
          >
            <Txt
              ref={laneNote[p]}
              text={p === 'driver' ? 'system software（系统软件）' : PARTY[p].en}
              fontFamily={FONT.sans}
              fontSize={19}
              fill={C.faint}
            />
          </Anchor>
        </Rect>
      ))}

      {/* 页头 */}
      <Txt
        text={`${opts.section} · ${opts.zh}`}
        x={TLx(330)}
        y={TLy(62)}
        fontFamily={FONT.sans}
        fontSize={44}
        fontWeight={800}
        fill={C.ink}
      />
      <Txt
        text={opts.en}
        x={TLx(430)}
        y={TLy(106)}
        fontFamily={FONT.mono}
        fontSize={21}
        fill={C.dim}
      />
      <Rect
        x={TLx(G.laneX1 - 190)}
        y={TLy(72)}
        width={380}
        height={52}
        radius={10}
        fill={C.chip}
        stroke={C.edge}
      >
        <Txt
          ref={cite}
          text={opts.cite}
          fontFamily={FONT.mono}
          fontSize={20}
          fill={C.dim}
        />
      </Rect>

      {/* 字幕条 */}
      <Rect
        x={TLx(G.W / 2)}
        y={TLy(G.captionY)}
        width={1840}
        height={92}
        radius={14}
        fill={C.panelHi}
        stroke={C.edge}
      >
        <Rect
          position={[-896, 0]}
          width={8}
          height={60}
          radius={4}
          fill={C.driver}
        />
        <Txt
          ref={caption}
          text={'…'}
          x={-160}
          y={0}
          fontFamily={FONT.sans}
          fontSize={31}
          fontWeight={600}
          fill={C.ink}
        />
        <Txt
          ref={step}
          text={''}
          position={[820, 0]}
          fontFamily={FONT.mono}
          fontSize={24}
          fill={C.faint}
        />
      </Rect>
    </>,
  );

  function* say(text: string, stepText?: string): ThreadGenerator {
    const cap = caption();
    yield* all(cap.opacity(0, 0.25), step().opacity(0, 0.25));
    cap.text(text);
    if (stepText !== undefined) step().text(stepText);
    yield* all(cap.opacity(1, 0.45), step().opacity(1, 0.45));
  }

  return {caption, step, cite, lane, laneNote, say};
}

export function* lanesIn(stage: StageApi): ThreadGenerator {
  yield* all(
    stage.lane.driver().opacity(1, 0.5),
    stage.lane.hc().opacity(1, 0.5),
    stage.lane.dev().opacity(1, 0.5),
  );
}

/* ---------- TRB / 事件 卡片 ---------- */

export interface CardOpts {
  title: string;
  tag?: string;
  rows: {k: string; v: string}[];
  tint: string;
  w?: number;
  rowSize?: number;
  titleSize?: number;
}

export interface CardApi {
  node: Rect;
  ref: Ref<Rect>;
  row(k: number): Ref<Txt>;
}

export function makeCard(o: CardOpts): CardApi {
  const ref = createRef<Rect>();
  const rowRefs = o.rows.map(() => createRef<Txt>());
  const w = o.w ?? 330;
  const rs = o.rowSize ?? 22;
  return {
    ref,
    node: (
      <Rect
        ref={ref}
        width={w}
        radius={12}
        fill={C.panelHi}
        stroke={o.tint}
        lineWidth={2}
        padding={[14, 16]}
        layout
        direction={'column'}
        gap={7}
        opacity={0}
      >
        <Rect layout gap={10} alignItems={'center'}>
          <Rect width={10} height={10} radius={3} fill={o.tint} />
          <Txt
            text={o.title}
            fontFamily={FONT.mono}
            fontSize={o.titleSize ?? 26}
            fontWeight={700}
            fill={o.tint}
          />
          {o.tag ? (
            <Rect radius={7} fill={o.tint} padding={[3, 10]} opacity={0.22}>
              <Txt
                text={o.tag}
                fontFamily={FONT.mono}
                fontSize={rs - 4}
                fill={o.tint}
              />
            </Rect>
          ) : (
            <></>
          )}
        </Rect>
        {o.rows.map((r, i) => (
          <Rect layout gap={10} opacity={0.95}>
            <Txt
              text={r.k}
              fontFamily={FONT.sans}
              fontSize={rs}
              fill={C.dim}
              width={w * 0.46}
            />
            <Txt
              ref={rowRefs[i]}
              text={r.v}
              fontFamily={FONT.mono}
              fontSize={rs}
              fill={C.ink}
            />
          </Rect>
        ))}
      </Rect>
    ),
    row: i => rowRefs[i],
  };
}

export function* cardIn(card: CardApi, pos: Vector2, dur = 0.5): ThreadGenerator {
  card.ref().position(pos);
  yield* all(card.ref().opacity(1, dur), card.ref().scale(0.92, dur));
}

/* ---------- 环带（命令环 / 事件环） ---------- */

export interface RingApi {
  group: Ref<Rect>;
  cell(i: number): Vector2;
  n: number;
  fill(i: number, label: string, tint: string): ThreadGenerator;
  consume(i: number): ThreadGenerator;
  enqTo(i: number, dur?: number): ThreadGenerator;
  deqTo(i: number, dur?: number): ThreadGenerator;
  markLink(): void;
}

export function makeRing(
  view: View2D,
  o: {
    y: number;
    zh: string;
    en: string;
    note: string;
    tint: string;
    n?: number;
    x0?: number;
    x1?: number;
  },
): RingApi {
  const n = o.n ?? 12;
  const x0 = o.x0 ?? G.ringX0;
  const x1 = o.x1 ?? G.ringX1;
  const group = createRef<Rect>();
  const strip = createRef<Rect>();
  const enq = createRef<Rect>();
  const deq = createRef<Rect>();
  const cellNodes: Ref<Rect>[] = [];
  const cellTxts: Ref<Txt>[] = [];
  const usable = x1 - x0 - 28;
  const stepW = usable / n;
  const cellW = Math.min(G.ringCell, stepW - 8);

  view.add(
    <Rect ref={group} opacity={0}>
      <Anchor x={TLx(x0) - 165} y={-12} w={300} align={'end'}>
        <Txt
          text={o.zh}
          fontFamily={FONT.sans}
          fontSize={24}
          fontWeight={700}
          fill={o.tint}
        />
      </Anchor>
      <Anchor x={TLx(x0) - 165} y={20} w={300} align={'end'}>
        <Txt
          text={o.note}
          fontFamily={FONT.sans}
          fontSize={17}
          fill={C.faint}
        />
      </Anchor>
      <Rect
        ref={strip}
        position={[TLx((x0 + x1) / 2), 0]}
        width={x1 - x0}
        height={84}
        radius={12}
        fill={C.panelHi}
        stroke={C.edge}
        lineWidth={1.5}
      />
      {Array.from({length: n}, (_, i) => {
        const cr = createRef<Rect>();
        const tr = createRef<Txt>();
        cellNodes.push(cr);
        cellTxts.push(tr);
        const cx = TLx(x0 + 14 + stepW * i + stepW / 2);
        return (
          <Rect
            ref={cr}
            position={[cx, 0]}
            width={cellW}
            height={cellW}
            radius={8}
            stroke={i === n - 1 ? o.tint : C.edge}
            lineWidth={i === n - 1 ? 1.2 : 1}
            dash={i === n - 1 ? [6, 5] : undefined}
            fill={C.chip}
          >
            <Txt
              ref={tr}
              width={cellW + 6}
              textWrap
              fontFamily={FONT.mono}
              fontSize={cellW > 52 ? 14 : 12}
              fill={o.tint}
              opacity={0}
            />
          </Rect>
        );
      })}
      {/* 入环 / 出环指针 */}
      <Rect
        ref={enq}
        position={[TLx(x0 + 14 + stepW / 2), -58]}
        width={0}
        height={0}
        stroke={o.tint}
      >
        <Line
          points={[
            [0, 0],
            [-9, -14],
            [9, -14],
          ]}
          close
          fill={o.tint}
          y={4}
        />
        <Txt
          x={30}
          y={4}
          text={'入环 enq'}
          fontFamily={FONT.mono}
          fontSize={17}
          fill={o.tint}
        />
      </Rect>
      <Rect ref={deq} position={[TLx(x0 + 14 + stepW / 2), 62]} width={0} height={0}>
        <Line
          points={[
            [0, 0],
            [-9, 14],
            [9, 14],
          ]}
          close
          fill={C.dim}
          y={-4}
        />
        <Txt
          x={30}
          y={-4}
          text={'出环 deq'}
          fontFamily={FONT.mono}
          fontSize={17}
          fill={C.dim}
        />
      </Rect>
    </Rect>,
  );
  group().position(new Vector2(0, TLy(o.y)));

  function cell(i: number): Vector2 {
    const stepW2 = (x1 - x0 - 28) / n;
    return new Vector2(TLx(x0 + 14 + stepW2 * i + stepW2 / 2), 0).add(
      group().position(),
    );
  }

  return {
    group,
    n,
    cell,
    *fill(i, label, tint) {
      const t = cellTxts[i]();
      const c = cellNodes[i]();
      t.text(label);
      c.stroke(tint);
      yield* all(t.opacity(1, 0.25), c.stroke(C.edgeHi, 0.25));
    },
    *consume(i) {
      yield* all(cellTxts[i]().opacity(0.35, 0.3));
      cellNodes[i]().stroke(C.edge);
    },
    *enqTo(i, dur = 0.35) {
      const stepW2 = (x1 - x0 - 28) / n;
      yield* enq().position(
        new Vector2(TLx(x0 + 14 + stepW2 * i + stepW2 / 2), -58),
        dur,
        easeInOutCubic,
      );
    },
    *deqTo(i, dur = 0.35) {
      const stepW2 = (x1 - x0 - 28) / n;
      yield* deq().position(
        new Vector2(TLx(x0 + 14 + stepW2 * i + stepW2 / 2), 62),
        dur,
        easeInOutCubic,
      );
    },
    markLink() {
      cellTxts[n - 1]().text('Link');
      cellTxts[n - 1]().opacity(0.85);
      cellTxts[n - 1]().fill(C.faint);
    },
  };
}

export function* ringIn(ring: RingApi, label: string): ThreadGenerator {
  ring.group().find(Txt)!.text(label);
  yield* ring.group().opacity(1, 0.5);
}

/* ---------- 门铃 / 灯 / 芯片 / 注记 ---------- */

export interface BellApi {
  ref: Ref<Rect>;
  target: Ref<Txt>;
  ring(target: string): ThreadGenerator;
}

export function makeBell(view: View2D, o: {x: number; y: number}): BellApi {
  const ref = createRef<Rect>();
  const target = createRef<Txt>();
  view.add(
    <Rect
      ref={ref}
      position={[o.x, o.y]}
      width={340}
      radius={12}
      fill={C.panelHi}
      stroke={C.hc}
      lineWidth={2}
      padding={[12, 14]}
      layout
      direction={'column'}
      gap={6}
      opacity={0}
    >
      <Rect layout gap={10} alignItems={'center'}>
        <Circle size={14} fill={C.hc} />
        <Txt
          text={'门铃寄存器 0'}
          fontFamily={FONT.sans}
          fontSize={22}
          fontWeight={700}
          fill={C.hc}
        />
        <Txt
          text={'Doorbell 0'}
          fontFamily={FONT.mono}
          fontSize={18}
          fill={C.hc}
        />
      </Rect>
      <Rect layout gap={10}>
        <Txt text={'DB Target'} fontFamily={FONT.sans} fontSize={20} fill={C.dim} />
        <Txt ref={target} text={'—'} fontFamily={FONT.mono} fontSize={20} fill={C.ink} />
      </Rect>
    </Rect>,
  );
  return {
    ref,
    target,
    *ring(t) {
      target().text(t);
      yield* all(
        ref().scale(1.1, 0.12),
        ref().lineWidth(5, 0.12),
      );
      yield* all(ref().scale(1, 0.3), ref().lineWidth(2, 0.3));
    },
  };
}

export interface LampApi {
  ref: Ref<Rect>;
  dot: Ref<Circle>;
  val: Ref<Txt>;
  on(color?: string): ThreadGenerator;
  off(): ThreadGenerator;
  set(text: string): ThreadGenerator;
}

export function makeLampRow(
  view: View2D,
  o: {x: number; y: number; labels: string[]; w?: number},
): LampApi[] {
  const w = o.w ?? 210;
  return o.labels.map((label, idx) => {
    const ref = createRef<Rect>();
    const dot = createRef<Circle>();
    const val = createRef<Txt>();
    view.add(
      <Rect
        ref={ref}
        position={[o.x + idx * (w + 12), o.y]}
        width={w}
        radius={10}
        fill={C.chip}
        stroke={C.edge}
        lineWidth={1.2}
        padding={[10, 12]}
        layout
        gap={10}
        alignItems={'center'}
        opacity={0}
      >
        <Circle ref={dot} size={15} fill={C.faint} />
        <Txt text={label} fontFamily={FONT.mono} fontSize={21} fill={C.dim} />
        <Txt ref={val} text={''} fontFamily={FONT.mono} fontSize={21} fill={C.ink} />
      </Rect>,
    );
    return {
      ref,
      dot,
      val,
      *on(color = C.ok) {
        dot().fill(color);
        yield* dot().scale(1.35, 0.15, easeOutBack);
      },
      *off() {
        yield* dot().scale(1, 0.1);
        dot().fill(C.faint);
      },
      *set(text) {
        yield* val().opacity(0, 0.08);
        val().text(text);
        yield* val().opacity(1, 0.15);
      },
    };
  });
}

export function makeChip(view: View2D, text: string, o: {x: number; y: number; tint?: string; w?: number; size?: number}): Ref<Rect> {
  const ref = createRef<Rect>();
  view.add(
    <Rect
      ref={ref}
      position={[o.x, o.y]}
      width={o.w ?? 520}
      radius={10}
      fill={C.chip}
      stroke={o.tint ?? C.edgeHi}
      lineWidth={1.4}
      padding={[10, 14]}
      opacity={0}
    >
      <Txt
        text={text}
        width={(o.w ?? 520) - 28}
        textWrap
        fontFamily={FONT.sans}
        fontSize={o.size ?? 20}
        fill={o.tint ? o.tint : C.dim}
      />
    </Rect>,
  );
  return ref;
}

/* 虚线注记卡（分叉/规则注记） */
export function makeNote(view: View2D, lines: string[], o: {x: number; y: number; w?: number; tint?: string}): Ref<Rect> {
  const ref = createRef<Rect>();
  view.add(
    <Rect
      ref={ref}
      position={[o.x, o.y]}
      width={o.w ?? 460}
      radius={12}
      fill={'#0d131b'}
      stroke={o.tint ?? C.edgeHi}
      lineWidth={1.4}
      dash={[8, 6]}
      padding={[12, 14]}
      layout
      direction={'column'}
      gap={6}
      opacity={0}
    >
      {lines.map((l, i) => (
        <Txt
          text={l}
          width={(o.w ?? 460) - 28}
          textWrap
          fontFamily={FONT.sans}
          fontSize={19}
          fill={C.dim}
          lineHeight={26}
        />
      ))}
    </Rect>,
  );
  return ref;
}

/* ---------- 代码栈面板（驱动侧真实内核代码，行内容逐字来自 code-excerpts.json） ---------- */

export interface CodePanelApi {
  ref: Ref<Rect>;
  line(i: number): Ref<Txt>;
  highlight(i: number): ThreadGenerator;
}

export function makeCodePanel(
  view: View2D,
  o: {
    x: number;
    y: number;
    w: number;
    title: string;
    lines: {line: number; code: string}[];
    maxVisible?: number;
  },
): CodePanelApi {
  const K = Math.max(1, o.maxVisible ?? 3);
  const inner = o.w - 28;
  const noRefs: Ref<Txt>[] = [];
  const codeRefs: Ref<Txt>[] = [];
  for (let r = 0; r < K; r++) {
    noRefs.push(createRef<Txt>());
    codeRefs.push(createRef<Txt>());
  }
  const ref = createRef<Rect>();
  let scroll = 0;
  const rowSrc: number[] = new Array(K).fill(-1);

  // 窗口重映射：scroll 起的 K 行填进固定行槽（高亮行不在窗口时滚动置顶，末尾夹紧）
  function apply(): void {
    for (let r = 0; r < K; r++) {
      const src = scroll + r;
      const ok = src >= 0 && src < o.lines.length;
      rowSrc[r] = ok ? src : -1;
      noRefs[r]().text(ok ? String(o.lines[src].line) : '');
      codeRefs[r]().text(ok ? o.lines[src].code : '');
    }
  }

  view.add(
    <Rect
      ref={ref}
      position={[o.x, o.y]}
      width={o.w}
      radius={12}
      fill={'#0a0f16'}
      stroke={C.edgeHi}
      lineWidth={1.4}
      padding={[10, 12]}
      layout
      direction={'column'}
      gap={3}
      opacity={0}
    >
      <Txt
        text={o.title}
        width={inner}
        textWrap
        lineHeight={19}
        fontFamily={FONT.mono}
        fontSize={16}
        fill={C.dim}
      />
      {Array.from({length: K}, (_, r) => (
        <Rect layout gap={8} height={36} width={inner} alignItems={'center'}>
          <Txt
            ref={noRefs[r]}
            width={40}
            fontFamily={FONT.mono}
            fontSize={13}
            fill={C.faint}
            opacity={0.8}
          />
          <Txt
            ref={codeRefs[r]}
            width={inner - 48}
            textWrap
            lineHeight={17}
            fontFamily={FONT.mono}
            fontSize={15}
            fill={C.ink}
            opacity={0.8}
          />
        </Rect>
      ))}
    </Rect>,
  );
  apply();

  return {
    ref,
    line: i => {
      const r = rowSrc.indexOf(i);
      return codeRefs[r >= 0 ? r : 0];
    },
    *highlight(i) {
      if (i < scroll || i >= scroll + K) {
        scroll = Math.max(0, Math.min(i, o.lines.length - K));
        apply();
      }
      const tgt = rowSrc.indexOf(i);
      for (let r = 0; r < K; r++) {
        const on = r === tgt;
        noRefs[r]().fill(on ? '#d9a860' : C.faint);
        codeRefs[r]().fill(on ? '#d9a860' : C.ink);
      }
      yield* all(
        ...noRefs.map((nr, r) => nr().opacity(r === tgt ? 1 : 0.45, 0.2)),
        ...codeRefs.map((cr, r) => cr().opacity(r === tgt ? 1 : 0.45, 0.2)),
      );
    },
  };
}

/* ---------- 总线（xHC ↔ 设备） ---------- */

export interface BusApi {
  wire: Ref<Line>;
  send(label: string, down: boolean, tint?: string): ThreadGenerator;
}

export function makeBus(view: View2D, o: {x: number; y0: number; y1: number}): BusApi {
  const wire = createRef<Line>();
  view.add(
    <Line
      ref={wire}
      points={[
        [o.x, o.y0],
        [o.x, o.y1],
      ]}
      stroke={C.dev}
      lineWidth={5}
      opacity={0}
      endArrow
      endSize={14}
    />,
  );
  return {
    wire,
    *send(label, down, tint = C.dev) {
      const ticket = createRef<Rect>();
      view.add(
        <Rect
          ref={ticket}
          position={[o.x, down ? o.y0 : o.y1]}
          radius={8}
          fill={C.chip}
          stroke={tint}
          lineWidth={1.6}
          padding={[6, 12]}
          opacity={0}
        >
          <Txt
            text={label}
            fontFamily={FONT.mono}
            fontSize={18}
            fill={tint}
          />
        </Rect>,
      );
      yield* ticket().opacity(1, 0.15);
      yield* ticket().position(
        new Vector2(o.x, down ? o.y1 : o.y0),
        0.8,
        easeInOutCubic,
      );
      yield* ticket().opacity(0, 0.25);
      ticket().remove();
    },
  };
}

/* ---------- 箭头 ---------- */

export function makeArrow(
  view: View2D,
  from: Vector2,
  to: Vector2,
  o: {color?: string; dash?: boolean; dur?: number} = {},
): Ref<Line> {
  const ref = createRef<Line>();
  view.add(
    <Line
      ref={ref}
      points={[from, to]}
      stroke={o.color ?? C.driver}
      lineWidth={3}
      endArrow
      endSize={13}
      dash={o.dash ? [10, 8] : undefined}
      opacity={0}
    />,
  );
  return ref;
}

export function* flash(ref: Ref<Node>, times = 1): ThreadGenerator {
  for (let i = 0; i < times; i++) {
    yield* ref().opacity(0.35, 0.1);
    yield* ref().opacity(1, 0.15);
  }
}

export function* popIn(ref: Ref<Node>): ThreadGenerator {
  ref().scale(0.7);
  yield* all(ref().opacity(1, 0.2), ref().scale(1, 0.35, easeOutBack));
}

// 渲染驱动页：绕开编辑器 UI，直接驱动 Player + Stage 逐帧出图。
// 单遍策略：跳过 rAF 循环与预重算，reset() 后逐帧 progress()，边走边截帧。
// 用法（vite dev 下）：
//   预览/QC： render.html?scene=0&preview=1&frame=1200
//   出片：   render.html?scene=0&render=1&name=41&fps=30 （帧 POST 到 :9100）
import {
  makeProject,
  Player,
  Stage,
  Vector2,
  Logger,
  ProjectMetadata,
  createSettingsMetadata,
} from '@motion-canvas/core';
import {Txt, Rect, Line, Circle, Node as N2} from '@motion-canvas/2d';
import ch41 from './scenes/ch41?scene';
import ch42 from './scenes/ch42?scene';
import ch43 from './scenes/ch43?scene';
import ch44 from './scenes/ch44?scene';
import ch45 from './scenes/ch45?scene';
// R10 批 A：§4.6 Command Interface 前四支（ch4601..ch4604）插到 ch45 之后
import ch4601 from './scenes/ch4601?scene';
import ch4602 from './scenes/ch4602?scene';
import ch4603 from './scenes/ch4603?scene';
import ch4604 from './scenes/ch4604?scene';
// R10 批 B：ch4605/ch4606/ch4611（Address/Configure/Reset Device 三巨头）顺插 ch4604 后
import ch4605 from './scenes/ch4605?scene';
import ch4606 from './scenes/ch4606?scene';
import ch4611 from './scenes/ch4611?scene';
// R10 批 C：端点批（ch4607..ch4610）按字典序插 ch4606 与 ch4611 之间
import ch4607 from './scenes/ch4607?scene';
import ch4608 from './scenes/ch4608?scene';
import ch4609 from './scenes/ch4609?scene';
import ch4610 from './scenes/ch4610?scene';
// R3 P4：补丁分帧场景接入探针链（TrackA；纯追加，供 render.html 与 P6 全门 probe）
// R10 批 C：清单扩为廿四场景——主线在前（ch41..ch45=0..4、ch4601..ch4604=5..8、
// ch4605/ch4606=9..10、ch4607..ch4610=11..14、ch4611=15）、补丁在后
// （ch41p..ch45p=16..20、ch4606p=21、ch4609p/ch4610p=22..23），
// 与 src/player.ts orderedSceneKeys 比较器语义一致。
import ch41p from './scenes/ch41p?scene';
import ch42p from './scenes/ch42p?scene';
import ch43p from './scenes/ch43p?scene';
import ch44p from './scenes/ch44p?scene';
import ch45p from './scenes/ch45p?scene';
import ch4606p from './scenes/ch4606p?scene';
import ch4609p from './scenes/ch4609p?scene';
import ch4610p from './scenes/ch4610p?scene';

/* ---------- 全帧重叠探针 ---------- */
function worldPos(n: any): {x: number; y: number} {
  let x = 0, y = 0, cur = n;
  while (cur) {
    const p = cur.position ? cur.position() : {x: 0, y: 0};
    x += p.x; y += p.y;
    cur = cur.parent ? cur.parent() : null;
  }
  return {x, y};
}
function bboxOf(n: any): {x0: number; y0: number; x1: number; y1: number} {
  const p = worldPos(n);
  if (typeof n.points === 'function') {
    // Line：点集相对节点原点，包围盒须按点集极值算（size() 中心≠节点 position）
    let x0 = 0, y0 = 0, x1 = 0, y1 = 0, first = true;
    try {
      for (const pt of n.points()) {
        const px = pt.x ?? pt[0] ?? 0, py = pt.y ?? pt[1] ?? 0;
        if (first) { x0 = x1 = px; y0 = y1 = py; first = false; }
        else { x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); }
      }
    } catch { /* noop */ }
    return {x0: p.x + x0, y0: p.y + y0, x1: p.x + x1, y1: p.y + y1};
  }
  let s = {x: 0, y: 0};
  try { s = n.size(); } catch { /* noop */ }
  return {x0: p.x - s.x / 2, y0: p.y - s.y / 2, x1: p.x + s.x / 2, y1: p.y + s.y / 2};
}
function opac(n: any): number {
  let o = 1, cur: any = n;
  while (cur) {
    try { o *= cur.opacity(); } catch { /* noop */ }
    cur = cur.parent ? cur.parent() : null;
  }
  return o;
}
function preview(n: any): string {
  try { return String(n.text()).slice(0, 14); } catch { return '?'; }
}
function isAncestor(a: any, b: any): boolean {
  let cur = b.parent ? b.parent() : null;
  while (cur) {
    if (cur === a) return true;
    cur = cur.parent ? cur.parent() : null;
  }
  return false;
}
function inter(
  a: {x0: number; y0: number; x1: number; y1: number},
  b: {x0: number; y0: number; x1: number; y1: number},
) {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return {w: Math.max(0, w), h: Math.max(0, h)};
}
function segIntersectsRect(
  pts: {x: number; y: number}[],
  closed: boolean,
  r: {x0: number; y0: number; x1: number; y1: number},
): boolean {
  // 折线按弧长采样 32 点入盒判定（bbox 相交会把斜线擦边误报成整宽横穿）
  const segs: [number, number][][] = [];
  for (let i = 0; i < pts.length - 1; i++) segs.push([[i, i + 1] as [number, number]]);
  if (closed && pts.length > 2) segs.push([[pts.length - 1, 0] as [number, number]]);
  const samples: {x: number; y: number}[] = [];
  const idx = (i: number) => pts[i];
  void idx;
  for (let s = 0; s < pts.length - 1; s++) {
    const a = pts[s], b = pts[s + 1];
    for (let t = 0; t <= 8; t++) {
      samples.push({x: a.x + (b.x - a.x) * (t / 8), y: a.y + (b.y - a.y) * (t / 8)});
    }
  }
  if (closed && pts.length > 2) {
    const a = pts[pts.length - 1], b = pts[0];
    for (let t = 0; t <= 8; t++) {
      samples.push({x: a.x + (b.x - a.x) * (t / 8), y: a.y + (b.y - a.y) * (t / 8)});
    }
  }
  void segs;
  return samples.some(
    p => p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1,
  );
}

function probeFrame(root: any, frame: number): any[] {
  const out: any[] = [];
  const texts: any[] = [];
  const icons: any[] = [];
  const visit = (n: any) => {
    if (n instanceof Txt) {
      if (opac(n) >= 0.25) {
        const bb = bboxOf(n);
        if (bb.x1 - bb.x0 > 4 && bb.y1 - bb.y0 > 4) texts.push({n, bb});
      }
    } else if ((n instanceof Rect || n instanceof Circle || n instanceof Line) && opac(n) >= 0.35) {
      const bb = bboxOf(n);
      if (bb.x1 - bb.x0 > 6 && bb.y1 - bb.y0 > 6) icons.push({n, bb});
    }
    for (const c of n.children ? n.children() : []) visit(c);
  };
  visit(root);
  // 文字 ↔ 文字（非祖先后代）
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const A = texts[i], B = texts[j];
      if (isAncestor(A.n, B.n) || isAncestor(B.n, A.n)) continue;
      const it = inter(A.bb, B.bb);
      if (it.w >= 14 && it.h >= 14) {
        out.push({frame, kind: 'T-T', a: preview(A.n), b: preview(B.n),
          ov: `${it.w | 0}x${it.h | 0}`});
      }
    }
  }
  // 文字 ↔ 实体/箭头（非自身祖先；只罚图标级实体或横穿的线，底板级容器不罚）
  for (const T of texts) {
    const tw = T.bb.x1 - T.bb.x0, th = T.bb.y1 - T.bb.y0;
    const tarea = tw * th;
    for (const I of icons) {
      if (isAncestor(I.n, T.n)) continue;
      const it = inter(T.bb, I.bb);
      const cover = (it.w * it.h) / Math.max(1, tarea);
      const iw = I.bb.x1 - I.bb.x0, ih = I.bb.y1 - I.bb.y0;
      const iarea = iw * ih;
      const iconSized = !(I.n instanceof Line) && iarea <= tarea * 4; // 实体不大于文本 4 倍 → 图标/部件级（Line 几何另走 LineX 分支）
      let lineCross = false;
      if (I.n instanceof Line) {
        try {
          const origin = worldPos(I.n);
          const pts = (I.n.points() as any[]).map(p => ({
            x: origin.x + (p.x ?? p[0] ?? 0),
            y: origin.y + (p.y ?? p[1] ?? 0),
          }));
          lineCross = segIntersectsRect(pts, !!I.n.close(), T.bb);
        } catch { /* noop */ }
      }
      if (iconSized && it.w >= 10 && it.h >= 10 && cover >= 0.5) {
        out.push({frame, kind: 'T-S', a: preview(T.n),
          b: I.n instanceof Line ? 'Line' : 'Icon', ov: `${(cover * 100) | 0}%`,
          // 诊断扩展：肇事实体与文本的世界 bbox（底板级容器已在上方过滤，此处均为图标级）
          diag: {
            text: {x0: T.bb.x0, y0: T.bb.y0, x1: T.bb.x1, y1: T.bb.y1},
            shape: {ctor: I.n.constructor.name,
              x0: I.bb.x0, y0: I.bb.y0, x1: I.bb.x1, y1: I.bb.y1},
          }});
      } else if (lineCross) {
        out.push({frame, kind: 'T-S', a: preview(T.n), b: 'LineX', ov: `${it.w | 0}px`});
      }
    }
  }
  // 同帧去重（同对文本只记一次）
  const seen = new Set<string>();
  return out.filter(v => {
    const k = `${v.kind}|${v.a}|${v.b}`;
    if (seen.has(k)) return false;
    // 保留最早帧即可，但同对在不同帧段再犯也值得知道——按 100 帧窗口去重
    const kk = `${k}|${Math.floor(v.frame / 100)}`;
    if (seen.has(kk)) return false;
    seen.add(kk);
    return true;
  });
}

const scenes = [ch41, ch42, ch43, ch44, ch45, ch4601, ch4602, ch4603, ch4604, ch4605, ch4606, ch4607, ch4608, ch4609, ch4610, ch4611, ch41p, ch42p, ch43p, ch44p, ch45p, ch4606p, ch4609p, ch4610p];

const q = new URLSearchParams(location.search);
const sceneIdx = Math.max(0, Math.min(scenes.length - 1, Number(q.get('scene') ?? 0)));
const fps = Number(q.get('fps') ?? 30);
const W = 1920, H = 1080;

const statusEl = document.getElementById('status')!;
const state: any = (window as any).__renderState = {
  ready: false, done: false, frame: -1, total: 0, error: null, phase: 'boot',
};

function setStatus(s: string) {
  statusEl.textContent = s;
  console.log('[render]', s);
}

async function main() {
  state.phase = 'fonts';
  await document.fonts.ready;
  state.phase = 'project';

  const config = makeProject({scenes: [scenes[sceneIdx]]});
  const settings = createSettingsMetadata();
  const project: any = {
    name: 'xhci-ch4',
    ...config,
    plugins: [],
    versions: {},
    settings,
    logger: new Logger(),
  };
  project.meta = new ProjectMetadata(project);
  project.meta.shared.set(settings.defaults.get());
  project.experimentalFeatures = false;

  const player = new Player(project, {
    fps,
    size: new Vector2(W, H),
    resolutionScale: 1,
  });
  (window as any).__p = player;
  player.deactivate(); // 单遍自驱，关掉 rAF 循环

  const stage = new Stage();
  stage.configure({size: new Vector2(W, H), resolutionScale: 1, background: null});
  stage.finalBuffer.id = 'render-canvas';
  document.getElementById('holder')!.appendChild(stage.finalBuffer);
  stage.finalBuffer.style.width = '96vw';
  stage.finalBuffer.style.height = 'auto';

  const playback = (player as any).playback;
  state.phase = 'reset';
  await playback.reset();

  async function step(): Promise<boolean> {
    return await playback.progress();
  }
  async function draw() {
    await stage.render(playback.currentScene, playback.previousScene);
  }

  // ---------- 扫描模式（R4 TrackC）：步进全部帧，按画面内容哈希找变化帧 ----------
  // 每帧 draw 后把 finalBuffer 缩到 480×270 离屏 canvas，对 RGB 字节做 FNV-1a
  // 32 位哈希；与上一帧不同 → 记入 distinct（f 从 0 计，含第 0 帧）。
  // 产物经 scripts/render.py --mode scan 落盘 public/frames-N.json，播放器按表步进。
  if (q.get('scan')) {
    state.phase = 'scan';
    const OFF_W = 480, OFF_H = 270;
    const off = document.createElement('canvas');
    off.width = OFF_W;
    off.height = OFF_H;
    const octx = off.getContext('2d', {willReadFrequently: true})!;
    const frameHash = (): number => {
      octx.clearRect(0, 0, OFF_W, OFF_H);
      octx.drawImage(stage.finalBuffer, 0, 0, OFF_W, OFF_H);
      const d = octx.getImageData(0, 0, OFF_W, OFF_H).data;
      let h = 0x811c9dc5 | 0; // FNV-1a offset basis
      for (let i = 0; i < d.length; i += 4) {
        h = Math.imul(h ^ d[i], 16777619);
        h = Math.imul(h ^ d[i + 1], 16777619);
        h = Math.imul(h ^ d[i + 2], 16777619);
      }
      return h | 0;
    };
    const distinct: number[] = [];
    let lastHash: number | null = null;
    let f = 0;
    let finished = false;
    const t0 = performance.now();
    while (!finished) {
      finished = await step();
      await draw();
      const h = frameHash();
      if (lastHash === null || h !== lastHash) distinct.push(f);
      lastHash = h;
      f++;
      // 与 probe 同节奏：让出宏任务 + 每 300 帧更新状态行
      if (f % 4 === 0) await new Promise(r => setTimeout(r, 0));
      if (f % 300 === 0) {
        state.frame = f;
        setStatus(`scan ${f} distinct=${distinct.length}`);
      }
    }
    state.total = f;
    state.distinct = distinct;
    state.scanMs = Math.round(performance.now() - t0);
    state.ready = true;
    setStatus(`scan done: ${f} frames, ${distinct.length} distinct`);
    return;
  }

  // ---------- 全检探针模式：步进全部帧收集重叠违例 ----------
  if (q.get('probe')) {
    state.phase = 'probe';
    const violations: any[] = [];
    let f = 0;
    let finished = false;
    const t0 = performance.now();
    while (!finished) {
      finished = await step();
      await draw();
      violations.push(...probeFrame(playback.currentScene.getView(), f));
      f++;
      // 每帧让出宏任务，避免微任务链饿死页面事件（goto domcontentloaded）
      if (f % 4 === 0) await new Promise(r => setTimeout(r, 0));
      if (f % 300 === 0) {
        state.frame = f;
        setStatus(`probe ${f} viol=${violations.length}`);
      }
    }
    state.total = f;
    state.violations = violations;
    state.probeMs = Math.round(performance.now() - t0);
    state.ready = true;
    setStatus(`probe done: ${f} frames, ${violations.length} violations`);
    return;
  }

  // ---------- 预览模式：步进到目标帧 ----------
  if (q.get('preview')) {
    const target = Math.max(0, Number(q.get('frame') ?? 0));
    state.phase = 'seek';
    const t0 = performance.now();
    while (playback.frame < target && !playback.finished) {
      await step();
      if (playback.frame % 300 === 0) {
        state.frame = playback.frame;
        setStatus(`seek ${playback.frame}/${target} ${((performance.now() - t0) / 1000) | 0}s`);
      }
    }
    await draw();
    state.frame = playback.frame;
    state.total = playback.frame;
    state.ready = true;
    setStatus(`preview frame ${playback.frame}`);
    return;
  }

  // ---------- 出片模式 ----------
  if (!q.get('render')) {
    setStatus('idle（加 ?render=1 或 ?preview=1&frame=N）');
    return;
  }
  const name = q.get('name') ?? `scene${sceneIdx}`;
  const srv = q.get('srv') ?? 'http://127.0.0.1:9100';

  const r0 = await fetch(`${srv}/start?name=${encodeURIComponent(name)}&fps=${fps}&w=${W}&h=${H}`, {method: 'POST'});
  if (!r0.ok) throw new Error('render server /start failed: ' + (await r0.text()));
  state.phase = 'render';
  setStatus(`rendering ${name}: 0/?`);

  const t0 = performance.now();
  let f = 0;
  let finished = false;
  while (!finished) {
    finished = await step();
    await draw();
    const blob: Blob = await new Promise((res, rej) =>
      stage.finalBuffer.toBlob(b => (b ? res(b) : rej(new Error('toBlob null'))), 'image/png'),
    );
    await fetch(`${srv}/frame`, {
      method: 'POST',
      headers: {'content-type': 'application/octet-stream'},
      body: await blob.arrayBuffer(),
    });
    f++;
    state.frame = f;
    if (f % 30 === 0) {
      const rate = f / ((performance.now() - t0) / 1000);
      setStatus(`rendering ${name}: ${f}（${rate.toFixed(1)} fps）`);
    }
  }
  state.total = f;
  const rEnd = await fetch(`${srv}/end`, {method: 'POST'});
  const info = await rEnd.json();
  state.done = true;
  setStatus(`done ${name}: ${JSON.stringify(info)}`);
}

main().catch(e => {
  state.error = String(e?.stack ?? e);
  setStatus('ERROR: ' + state.error);
  console.error(e);
});

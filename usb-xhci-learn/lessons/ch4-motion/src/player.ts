// 分帧步进播放器 —— 标准 Player（bootstrap 同款装配：logger/meta/settings）+ 逐帧 seek。
// R4 TrackC：若 public/frames-N.json（构建期画面去重表）存在且校验通过，
//   步进控件按表走（相邻步进帧画面必不同，UI 显示 拍 k/m · 帧 x/y）；
//   无表/校验失败 → 回退逐帧模式（完全旧行为）。播放始终是连续逐帧。
// 机制（R3-SPEC 面2）：Player 自带 rAF 更新循环（编辑器同款），onRender 订阅里把
// playback.currentScene 渲染到 Stage；暂停后 requestSeek/requestPreviousFrame/
// requestNextFrame 触发 playback.seek → 下次循环重算并重绘该帧。
// 场景清单动态扫描 src/scenes/*.tsx（import.meta.glob + ?scene 查询，vite 插件自动
// 扫描），排序规则：主线场景在前、补丁场景（chNNp）在后，组内按字典序
//   → ch41,ch42,ch43,ch41p,ch42p,ch43p 对应 ?scene=0..5。
// 场景越界/缺席 → 显示「场景开发中」占位，不硬编码场景数组长度。
import {
  makeProject,
  Player,
  Stage,
  Vector2,
  Logger,
  ProjectMetadata,
  createSettingsMetadata,
} from '@motion-canvas/core';
import {C} from './lib/theme';

const FPS = 30;
const W = 1920;
const H = 1080;

/* ---------- 场景注册表（动态，禁硬编码数量） ---------- */
const sceneLoaders = import.meta.glob('./scenes/*.tsx', {
  query: '?scene',
  import: 'default',
}) as Record<string, () => Promise<any>>;

// 主线在前、补丁（chNNp）在后，组内字典序 → 0=ch41 1=ch42 2=ch43 3=ch41p 4=ch42p 5=ch43p
function orderedSceneKeys(): string[] {
  const isPatch = (key: string) => {
    const base = key.split('/').pop() ?? '';
    return /^ch\d+p\.tsx$/.test(base) ? 1 : 0;
  };
  return Object.keys(sceneLoaders).sort((a, b) => {
    const pa = isPatch(a);
    const pb = isPatch(b);
    if (pa !== pb) return pa - pb;
    return a < b ? -1 : a > b ? 1 : 0;
  });
}

/* ---------- 页面状态（window.__ts 只读冒烟钩子，与 UI 同一状态通路） ---------- */
const state: any = ((window as any).__ts = {
  phase: 'boot',
  ready: false,
  error: null,
  sceneIdx: -1,
  sceneName: '',
  sceneCount: 0,
  frame: 0,
  total: 0,
  paused: true,
  // R4 TrackC：画面内容去重表（public/frames-N.json，构建期扫描产物）。
  // distinct=null → 逐帧模式（完全旧行为）；否则按表步进：相邻步进帧画面必不同。
  distinct: null as number[] | null,
  stepIdx: 0,
  snapshot() {
    return {
      phase: state.phase,
      ready: state.ready,
      error: state.error,
      sceneIdx: state.sceneIdx,
      sceneName: state.sceneName,
      sceneCount: state.sceneCount,
      frame: state.frame,
      total: state.total,
      paused: state.paused,
      distinct: state.distinct ? state.distinct.length : null,
      stepIdx: state.stepIdx,
    };
  },
  // 画布像素统计（只读）：mean=采样点 RGB 均值，opaque=不透明采样点数，hash=内容指纹
  pixelStats(): {mean: number; opaque: number; hash: number} | null {
    const cv = document.getElementById('stage-canvas') as HTMLCanvasElement | null;
    if (!cv) return null;
    const ctx = cv.getContext('2d');
    if (!ctx || !cv.width || !cv.height) return null;
    const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
    let sum = 0;
    let opaque = 0;
    let hash = 0;
    let samples = 0;
    for (let i = 0; i < data.length; i += 4 * 13) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      sum += r + g + b;
      if (a > 0) opaque++;
      hash = (Math.imul(hash, 31) + r + 3 * g + 7 * b + a) | 0;
      samples++;
    }
    return {mean: sum / Math.max(1, samples), opaque, hash};
  },
});

function el(selector: string): HTMLElement {
  return document.querySelector(selector) as HTMLElement;
}

function setStatus(s: string) {
  el('[data-field="status"]').textContent = s;
  console.log('[player]', s);
}

/* ---------- 主题：CSS 变量以 src/lib/theme.ts 令牌为准（player.html 内为回退值） ---------- */
function applyTheme() {
  const vars: Record<string, string> = {
    '--bg': C.bg,
    '--panel': C.panel,
    '--panel-hi': C.panelHi,
    '--edge': C.edge,
    '--edge-hi': C.edgeHi,
    '--ink': C.ink,
    '--dim': C.dim,
    '--faint': C.faint,
    '--driver': C.driver,
    '--hc': C.hc,
    '--dev': C.dev,
    '--evt': C.evt,
    '--chip': C.chip,
  };
  for (const [k, v] of Object.entries(vars)) {
    document.documentElement.style.setProperty(k, v);
  }
}

function showMissing(idx: number, count: number) {
  state.phase = 'missing-scene';
  const box = el('[data-field="missing"]');
  box.hidden = false;
  el('[data-field="missing-hint"]').textContent =
    `?scene=${idx} · 当前可用场景 0..${count - 1}`;
  setStatus(`场景 ${idx} 开发中`);
}

/* ---------- 控件 ---------- */
let dragging = false;

/* ---------- 去重表步进（R4 TrackC；distinct=null 时全部走旧逐帧行为） ---------- */
// stepIdx = distinct 中 ≤frame 的最大下标（distinct 严格递增，二分）
function stepIndexOf(frame: number): number {
  const d = state.distinct;
  if (!d) return 0;
  let lo = 0, hi = d.length - 1, ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (d[mid] <= frame) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

// 上一拍/下一拍：distinct 模式 seek 到 distinct[stepIdx±1]；逐帧模式走原生单帧接口
function stepBy(player: Player, delta: number) {
  const p = player as any;
  if (!state.distinct) {
    if (delta > 0) p.requestNextFrame();
    else p.requestPreviousFrame();
    return;
  }
  const ni = state.stepIdx + delta;
  if (ni < 0 || ni >= state.distinct.length) return;
  p.requestSeek(state.distinct[ni]);
}

// 场景时长已知后拉取去重表；404/校验失败 → 保持 distinct=null（逐帧回退）
async function loadFramesTable(sceneIdx: number, player: Player) {
  try {
    const r = await fetch(`../frames-${sceneIdx}.json`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const d = j?.distinct;
    if (!Array.isArray(d) || d.length < 2 || d[0] !== 0) {
      throw new Error('bad table: distinct 须 [0]==0 且长度≥2');
    }
    for (let i = 1; i < d.length; i++) {
      if (!(d[i] > d[i - 1])) throw new Error(`bad table: @${i} 非严格递增`);
    }
    if (d[d.length - 1] >= state.total) {
      throw new Error(`bad table: 末位 ${d[d.length - 1]} 越界（total=${state.total}，表疑过期）`);
    }
    if (d[d.length - 1] !== state.total - 1) d.push(state.total - 1);
    state.distinct = d;
    state.stepIdx = stepIndexOf(state.frame);
    setStatus(`ready · 去重表 ${d.length} 拍 / ${state.total} 帧`);
  } catch (e) {
    console.log('[player] 去重表不可用，回退逐帧模式：', String(e));
  }
  syncUI(player);
}

function syncUI(player: Player) {
  el('[data-field="frame"]').textContent = String(state.frame);
  el('[data-field="total"]').textContent = String(state.total);
  const slider = el('[data-act="seek"]') as HTMLInputElement;
  const d = state.distinct;
  el('[data-field="mode"]').textContent = d ? '已按画面内容去重，相邻步进画面必不同' : '逐帧';
  el('[data-field="stepwrap"]').hidden = !d;
  if (d) {
    el('[data-field="step"]').textContent = String(state.stepIdx);
    el('[data-field="steps"]').textContent = String(d.length);
  }
  if (!dragging) {
    if (d) {
      slider.max = String(d.length - 1);
      slider.value = String(state.stepIdx);
    } else {
      slider.max = String(Math.max(0, state.total));
      slider.value = String(state.frame);
    }
  }
  (el('[data-act="play"]') as HTMLButtonElement).textContent = state.paused ? '播放' : '暂停';
}

function wireControls(player: Player) {
  const p: any = player;
  const prevBtn = el('[data-act="prev"]') as HTMLButtonElement;
  const playBtn = el('[data-act="play"]') as HTMLButtonElement;
  const nextBtn = el('[data-act="next"]') as HTMLButtonElement;
  const slider = el('[data-act="seek"]') as HTMLInputElement;
  for (const b of [prevBtn, playBtn, nextBtn]) b.disabled = false;
  slider.disabled = false;

  prevBtn.addEventListener('click', e => {
    (e.currentTarget as HTMLButtonElement).blur(); // 让空格/方向键回到全局
    stepBy(player, -1);
  });
  nextBtn.addEventListener('click', e => {
    (e.currentTarget as HTMLButtonElement).blur();
    stepBy(player, 1);
  });
  playBtn.addEventListener('click', e => {
    (e.currentTarget as HTMLButtonElement).blur();
    p.togglePlayback();
  });

  // 进度条：拖动 = 连续 requestSeek（input 事件）；change/blur 结束拖动态。
  // distinct 模式下滑杆值是「拍下标」（0..len-1），映射到 distinct[值]；逐帧模式是帧号。
  slider.addEventListener('input', () => {
    dragging = true;
    if (state.distinct) p.requestSeek(state.distinct[Number(slider.value)]);
    else p.requestSeek(Number(slider.value));
  });
  const endDrag = () => {
    dragging = false;
    syncUI(player);
  };
  slider.addEventListener('change', endDrag);
  slider.addEventListener('pointerup', endDrag);
  slider.addEventListener('blur', endDrag);

  // 键盘：←→ 单步（distinct 模式=上一拍/下一拍），空格播放/暂停；
  // 焦点在 slider 上时方向键走原生行为（同一路径：滑杆值即拍下标）
  window.addEventListener('keydown', e => {
    const target = e.target as HTMLElement;
    const onSlider = target === slider;
    if (e.key === 'ArrowLeft' && !onSlider) {
      e.preventDefault();
      stepBy(player, -1);
    } else if (e.key === 'ArrowRight' && !onSlider) {
      e.preventDefault();
      stepBy(player, 1);
    } else if (e.code === 'Space' && !['BUTTON', 'INPUT'].includes(target.tagName)) {
      e.preventDefault();
      p.togglePlayback();
    }
  });
}

/* ---------- 主流程 ---------- */
async function main() {
  applyTheme();
  const q = new URLSearchParams(location.search);
  const raw = Number(q.get('scene') ?? '0');
  const sceneIdx = Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0;
  state.sceneIdx = sceneIdx;

  const keys = orderedSceneKeys();
  state.sceneCount = keys.length;
  if (sceneIdx >= keys.length) {
    showMissing(sceneIdx, keys.length);
    return;
  }

  state.phase = 'load-scene';
  setStatus(`加载场景 ${sceneIdx}…`);
  const description = await sceneLoaders[keys[sceneIdx]]();
  state.sceneName = description?.name ?? keys[sceneIdx];
  el('[data-field="scene-name"]').textContent = `${state.sceneName}（scene=${sceneIdx}）`;

  state.phase = 'fonts';
  await document.fonts.ready;
  state.phase = 'project';

  // bootstrap 同款装配（与 src/render.ts 逐字同源）
  const config = makeProject({scenes: [description]});
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
    fps: FPS,
    size: new Vector2(W, H),
    resolutionScale: 1,
  });
  (window as any).__p = player;

  const stage = new Stage();
  stage.configure({size: new Vector2(W, H), resolutionScale: 1, background: null});
  stage.finalBuffer.id = 'stage-canvas';
  document.getElementById('holder')!.appendChild(stage.finalBuffer);

  // 渲染通路：Player 更新循环派发 onRender → Stage 画当前场景
  player.onRender.subscribe(async () => {
    const pb: any = player.playback;
    await stage.render(pb.currentScene, pb.previousScene);
  });
  player.onFrameChanged.subscribe(frame => {
    state.frame = frame;
    if (state.distinct) state.stepIdx = stepIndexOf(frame);
    syncUI(player);
  });
  let framesTableTried = false;
  player.onDurationChanged.subscribe(total => {
    state.total = total;
    syncUI(player);
    // 时长已知（recalculate 完成）后拉去重表——仅一次，失败回退逐帧
    if (!framesTableTried && total > 0) {
      framesTableTried = true;
      void loadFramesTable(sceneIdx, player);
    }
  });
  player.onStateChanged.subscribe(s => {
    state.paused = s.paused;
    syncUI(player);
  });

  wireControls(player);
  // 预重算完成后回到第 0 帧：recalculate 会把 playback 推到场景尾，
  // seek(0) 触发场景 reset 并渲染首帧。
  (player as any).requestSeek(0);

  state.ready = true;
  state.phase = 'live';
  setStatus('ready');
}

main().catch(e => {
  state.error = String(e?.stack ?? e);
  state.phase = 'error';
  setStatus('ERROR: ' + state.error);
  console.error(e);
});

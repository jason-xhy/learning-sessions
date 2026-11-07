// 分帧步进播放器 —— 标准 Player（bootstrap 同款装配：logger/meta/settings）+ 逐帧 seek。
// R4 TrackC：若 public/frames-N.json（构建期画面去重表）存在且校验通过，
//   步进控件按表走（相邻步进帧画面必不同，UI 显示 拍 k/m · 帧 x/y）；
//   无表/校验失败 → 回退逐帧模式（完全旧行为）。播放始终是连续逐帧。
// R6 意见①：distinct 表之上再推导「教学拍」beats——distinct[i] 为稳定拍 ⟺
//   distinct[i+1]-distinct[i] >= 2（末项用 total；gap=1 连跑段=动画块）。
//   首拍强制 0、末拍强制 total-1；beats ⊆ distinct ∪ {total-1}。
//   「下一拍」一次点击播完当前动画块（位置/缩放/颜色特效不跨点击）：
//   target 与当前帧距 >1 时置 autoTarget 并播放，onFrameChanged 到点即停；
//   自动播放中再点一次「下一拍」= 跳过（直达 autoTarget 并暂停）。
//   beats 推导失败 → 回退 distinct 旧模式（再退逐帧）。
// 机制（R3-SPEC 面2）：Player 自带 rAF 更新循环（编辑器同款），onRender 订阅里把
// playback.currentScene 渲染到 Stage；暂停后 requestSeek/requestPreviousFrame/
// requestNextFrame 触发 playback.seek → 下次循环重算并重绘该帧。
// 场景清单动态扫描 src/scenes/*.tsx（import.meta.glob + ?scene 查询，vite 插件自动
// 扫描），排序规则：主线场景在前、补丁场景（chNNp）在后，组内按字典序
//   → 主线 ch41..ch45,ch4601..ch4604 在前、补丁 ch41p..ch45p 在后。
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

// 主线在前、补丁（chNNp）在后，组内字典序 → 0=ch41..4=ch45 5=ch4601..8=ch4604 9=ch41p..13=ch45p
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
  // R6：教学拍表（由 distinct 纯推导，无重扫）。beats=null → 回退 distinct 旧模式。
  beats: null as number[] | null,
  beatIdx: 0,
  // R6：自动播放目标帧（「下一拍」点击后走播当前动画块；null=无自动段）。
  autoTarget: null as number | null,
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
      beats: state.beats ? state.beats.length : null,
      beatIdx: state.beatIdx,
      autoTarget: state.autoTarget,
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

// R6：beatIdx = beats 中 ≤frame 的最大下标（beats 严格递增，同款二分）
function beatIndexOf(frame: number): number {
  const b = state.beats;
  if (!b) return 0;
  let lo = 0, hi = b.length - 1, ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (b[mid] <= frame) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

// 上一拍/下一拍。R6 beats 模式：「下一拍」一次点击播完当前动画块（autoTarget 播放
// 到点即停；自动播放中再点=跳过直达）；「上一拍」清 autoTarget 直跳（生成器不可
// 回退，倒退本就是头重放快进）。beats=null → distinct 旧模式；再 null → 逐帧。
function stepBy(player: Player, delta: number) {
  const p = player as any;
  if (!state.beats) {
    if (!state.distinct) {
      if (delta > 0) p.requestNextFrame();
      else p.requestPreviousFrame();
      return;
    }
    const ni = state.stepIdx + delta;
    if (ni < 0 || ni >= state.distinct.length) return;
    p.requestSeek(state.distinct[ni]);
    return;
  }
  if (delta > 0) {
    if (state.autoTarget !== null) {
      // 再点一次「下一拍」= 跳过：暂停并直达自动段目标
      const t = state.autoTarget;
      state.autoTarget = null;
      p.togglePlayback(false);
      p.requestSeek(t);
      return;
    }
    const target = state.beats[state.beatIdx + 1];
    if (target === undefined) return; // 已在末拍
    if (target - state.frame <= 1) {
      p.requestSeek(target); // 相邻拍=稳定态直跳
    } else {
      state.autoTarget = target; // 播放走完当前动画块，onFrameChanged 到点即停
      p.togglePlayback(true);
    }
  } else {
    const wasAuto = state.autoTarget !== null;
    state.autoTarget = null;
    const prev = state.beats[state.beatIdx - 1];
    if (prev === undefined) return;
    if (wasAuto) p.togglePlayback(false); // 自动段被上一拍打断 → 停在直跳落点
    p.requestSeek(prev);
  }
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
    // R6：教学拍推导（纯表推导，无重扫）——distinct[i] 为稳定拍 ⟺ 下一 distinct
    // 距 ≥2（gap=1 连跑段=动画块，块内帧不作停点）；首拍强制 0、末拍强制 total-1。
    const beats: number[] = [];
    for (let i = 0; i < d.length - 1; i++) {
      if (d[i + 1] - d[i] >= 2) beats.push(d[i]);
    }
    beats.push(state.total - 1); // 末拍强制 total-1（末项 gap 恒 1，不入候选）
    if (beats[0] !== 0) beats.unshift(0); // 首拍强制 0
    if (beats.length >= 2) {
      state.beats = beats;
      state.beatIdx = beatIndexOf(state.frame);
      setStatus(`ready · 教学拍 ${beats.length} / 去重表 ${d.length} 拍 / ${state.total} 帧`);
    } else {
      state.beats = null;
      setStatus(`ready · 去重表 ${d.length} 拍 / ${state.total} 帧`);
      console.log('[player] beats 推导失败（<2 拍），回退 distinct 步进模式');
    }
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
  const b = state.beats;
  el('[data-field="mode"]').textContent = b
    ? '按教学拍步进：一次点击播完当前特效（放大/移动/颜色），停在下一次画面稳定处'
    : d
      ? '已按画面内容去重，相邻步进画面必不同'
      : '逐帧';
  const note = document.getElementById('beat-note');
  if (note) note.hidden = !b;
  el('[data-field="stepwrap"]').hidden = !(b || d);
  if (b) {
    el('[data-field="step"]').textContent = String(state.beatIdx);
    el('[data-field="steps"]').textContent = String(b.length);
    (el('[data-act="prev"]') as HTMLButtonElement).textContent = '上一拍';
    (el('[data-act="next"]') as HTMLButtonElement).textContent = '下一拍';
  } else if (d) {
    el('[data-field="step"]').textContent = String(state.stepIdx);
    el('[data-field="steps"]').textContent = String(d.length);
    (el('[data-act="prev"]') as HTMLButtonElement).textContent = '上一帧';
    (el('[data-act="next"]') as HTMLButtonElement).textContent = '下一帧';
  }
  if (!dragging) {
    if (b) {
      slider.max = String(b.length - 1);
      slider.value = String(state.beatIdx);
    } else if (d) {
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
    state.autoTarget = null; // 用户接管播放 → 自动段终止（不再到点即停）
    p.togglePlayback();
  });

  // 进度条：拖动 = 连续 requestSeek（input 事件）；change/blur 结束拖动态。
  // beats 模式下滑杆值是「教学拍下标」（0..len-1），映射到 beats[值]；
  // distinct 回退=去重拍下标；逐帧模式=帧号。拖动即用户接管 → 清 autoTarget。
  slider.addEventListener('input', () => {
    dragging = true;
    state.autoTarget = null;
    if (state.beats) p.requestSeek(state.beats[Number(slider.value)]);
    else if (state.distinct) p.requestSeek(state.distinct[Number(slider.value)]);
    else p.requestSeek(Number(slider.value));
  });
  const endDrag = () => {
    dragging = false;
    syncUI(player);
  };
  slider.addEventListener('change', endDrag);
  slider.addEventListener('pointerup', endDrag);
  slider.addEventListener('blur', endDrag);

  // 键盘：←→ 单步（beats 模式=上一拍/下一拍，自动段语义同按钮），空格播放/暂停；
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
      state.autoTarget = null; // 用户接管播放
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
    if (state.beats) {
      state.beatIdx = beatIndexOf(frame);
      // R6：自动播放段到点即停（frame 可能越过 target → 夹紧回 target）
      if (state.autoTarget !== null && frame >= state.autoTarget) {
        const t = state.autoTarget;
        state.autoTarget = null;
        player.togglePlayback(false);
        if (frame > t) player.requestSeek(t);
      }
    }
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

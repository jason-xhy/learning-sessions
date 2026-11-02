// 画面缩放 + 全屏（2026-11-02 可读性二轮，四机共用）
// 背景：fig3 可读性轮（11-01）只覆盖本机且页宽 980；用户复报「文字还看不清、动画还可以更大」。
// 本模块 = 单一来源：四机 build.mjs 各自 import 后内联进自包含页（构建期拼接，运行时零外部依赖）。
//   zoomBarHtml()  → 缩放条 HTML（4 档缩放 + 全屏按钮 + 提示）
//   zoomFsCss()    → 缩放条/全屏布局 CSS（:fullscreen、-webkit-、fs-pseudo 三通道同规则）
//   zoomFsScript() → 行为 JS（IIFE 自取 .iso-stage/.iso-figure，不依赖宿主变量名；
//                     停巡游按 arm/armTour 名单探测；全屏 = Fullscreen API → webkit → fs-pseudo 兜底）
// 全屏语义：SVG 恒填容器宽（与页内同式，零 JS 分支），全屏只是把容器换成视口
// （页边距/图例退场）——任何窗口下全屏 ≥ 页内 1×，竖向用滚轮平移；>1× 继续乘容器宽（双向平移）。
// 全屏时隐藏图例（.iso-legend）把空间让给舞台；Esc/再点退出；伪全屏兜底 iOS Safari（iPhone 无元素全屏 API）。
// 页面级约定（DESIGN §5 本轮登记）：pageHtml width 统一 1500（fluid min(1500px, 100%-32px)）。

export function zoomBarHtml(hint = "放大看位域卡 / 回执卡 · 放大后拖动平移（触屏双指）· 全屏后滚轮上下看 · 键盘 + − 0 F") {
  const btns = [1, 1.6, 2.4, 3.2]
    .map((z, i) => `<button type="button" data-zoom="${z}" aria-pressed="${i === 0}">${z}×</button>`)
    .join("");
  return `<div class="iso-zoombar" role="toolbar" aria-label="画面缩放与全屏">` +
    btns +
    `<button type="button" data-fs aria-pressed="false">⛶ 全屏</button>` +
    `<span class="iso-zoomhint">${hint}</span></div>`;
}

export function zoomFsCss() {
  return `
/* 画面缩放+全屏（2026-11-02 可读性二轮）：1× 布局不变，>1× 出滚动平移 */
.iso-stage { overflow: auto; scrollbar-width: thin; }
.iso-stage svg { display: block; }
.iso-zoombar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.iso-zoombar button { font: 500 12px var(--anatomy-mono, monospace); color: var(--anatomy-muted); background: transparent; border: 1px solid var(--anatomy-line-mid); border-radius: 3px; padding: 2px 10px; cursor: pointer; }
.iso-zoombar button[aria-pressed="true"] { color: var(--anatomy-text); border-color: var(--anatomy-text); }
.iso-zoomhint { color: var(--anatomy-muted); font-size: 11px; }
.iso-figure:fullscreen, .iso-figure:-webkit-full-screen, .iso-figure.fs-pseudo {
  background: var(--anatomy-page); overflow: auto; margin: 0;
  padding: 12px;
  display: flex; flex-direction: column;
}
.iso-figure.fs-pseudo { position: fixed; inset: 0; z-index: 999; }
.iso-figure:fullscreen .iso-plate, .iso-figure:-webkit-full-screen .iso-plate, .iso-figure.fs-pseudo .iso-plate {
  flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column;
}
.iso-figure:fullscreen .iso-stage, .iso-figure:-webkit-full-screen .iso-stage, .iso-figure.fs-pseudo .iso-stage {
  flex: 1 1 auto; min-height: 280px;
}
.iso-figure:fullscreen .iso-legend, .iso-figure:-webkit-full-screen .iso-legend, .iso-figure.fs-pseudo .iso-legend { display: none; }
@media print {
  .iso-zoombar { display: none; }
  .iso-stage { overflow: visible; }
  .iso-stage svg { width: 100% !important; height: auto !important; }
}
`;
}

export function zoomFsScript({ focus = [] } = {}) {
  return `
// 画面缩放+全屏（shared/zoomfs.mjs 内联）
(() => {
  const stage = document.querySelector(".iso-stage");
  const svgRoot = stage ? stage.querySelector("svg") : null;
  const figureEl = stage ? stage.closest(".iso-figure") : null;
  const zoombar = document.querySelector(".iso-zoombar");
  if (!stage || !svgRoot || !figureEl) return;
  const ZOOMS = [1, 1.6, 2.4, 3.2];
  const FOCUS = ${JSON.stringify(focus)};
  let zoomIx = 0;
  const stopTour = () => { if (typeof arm === "function") arm(); else if (typeof armTour === "function") armTour(); };
  const isFs = () => document.fullscreenElement === figureEl || document.webkitFullscreenElement === figureEl || figureEl.classList.contains("fs-pseudo");
  function centerFocal() {
    let face = null;
    for (const s of FOCUS) { face = document.querySelector(s); if (face) break; }
    const sr = stage.getBoundingClientRect();
    let cx;
    if (face) { const cr = face.getBoundingClientRect(); cx = cr.left - sr.left + stage.scrollLeft + cr.width / 2; }
    else cx = stage.scrollWidth / 2;
    stage.scrollLeft = Math.max(0, Math.min(stage.scrollWidth - stage.clientWidth, cx - stage.clientWidth / 2));
  }
  function applyZoom() {
    svgRoot.style.width = (ZOOMS[zoomIx] * 100) + "%";
    svgRoot.style.height = "auto";
    if (zoombar) {
      zoombar.querySelectorAll("button[data-zoom]").forEach((b, i) => b.setAttribute("aria-pressed", String(i === zoomIx)));
      const fb = zoombar.querySelector("button[data-fs]");
      if (fb) fb.setAttribute("aria-pressed", String(isFs()));
    }
  }
  function setZoom(ix) {
    const prev = zoomIx;
    zoomIx = Math.max(0, Math.min(ZOOMS.length - 1, ix));
    applyZoom();
    if (zoomIx > prev) centerFocal();
  }
  function setPseudo(on) { figureEl.classList.toggle("fs-pseudo", on); applyZoom(); }
  function toggleFs() {
    stopTour();
    if (isFs()) {
      if (figureEl.classList.contains("fs-pseudo")) return setPseudo(false);
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      return;
    }
    if (figureEl.requestFullscreen) figureEl.requestFullscreen().catch(() => setPseudo(true));
    else if (figureEl.webkitRequestFullscreen) figureEl.webkitRequestFullscreen();
    else setPseudo(true);
  }
  if (zoombar) zoombar.addEventListener("click", (e) => {
    const zb = e.target.closest("button[data-zoom]");
    if (zb) { stopTour(); setZoom(ZOOMS.indexOf(Number(zb.dataset.zoom))); return; }
    if (e.target.closest("button[data-fs]")) toggleFs();
  });
  stage.addEventListener("keydown", (e) => {
    if (e.key === "+" || e.key === "=") { e.preventDefault(); stopTour(); setZoom(zoomIx + 1); }
    else if (e.key === "-" || e.key === "_") { e.preventDefault(); stopTour(); setZoom(zoomIx - 1); }
    else if (e.key === "0") { e.preventDefault(); stopTour(); setZoom(0); }
    else if (e.key === "f" || e.key === "F") { e.preventDefault(); toggleFs(); }
  });
  document.addEventListener("fullscreenchange", () => requestAnimationFrame(applyZoom));
  document.addEventListener("webkitfullscreenchange", () => requestAnimationFrame(applyZoom));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && figureEl.classList.contains("fs-pseudo")) setPseudo(false);
  });
  window.addEventListener("resize", () => requestAnimationFrame(applyZoom));
  applyZoom();
  window.__zfs = { setZoom, zoomOf: () => ZOOMS[zoomIx], applyZoom, toggleFs, isFs, ZOOMS };
})();
`;
}

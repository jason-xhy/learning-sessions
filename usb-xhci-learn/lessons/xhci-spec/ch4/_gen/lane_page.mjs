// 泳道节页面生成器 —— xhci-spec 板块第4章次要流程节共享模板（2026-11-04 从 4.1 build.mjs 参数化抽取）
// 契约：DESIGN.md §4 页面统一模板 / §5.1 分镜（单卡双模式=总览流程图+步进动画同图同源）
// 数据面：steps[] = box|arrow|note 三种图元 + narr 逐步解说；泳道固定三方（DESIGN §1.7）。
// 用法见同目录 4.4-device-detach/build.mjs（照抄改数据即可，禁在数据件里发明新图元种类——
//   需要新图元先在本模块登记并过门）。
import * as k from "/Users/jason/.zcode/skills/anatomy/kit/iso-kit.mjs";
import { kitScript } from "/Users/jason/.zcode/skills/anatomy/scripts/inline-kit.mjs";
import { zoomBarHtml, zoomFsCss, zoomFsScript } from "../../shared/zoomfs.mjs";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---------- 布局参数 ----------
const HDR_Y = 40, HDR_H = 54;
const LANES = { sw: 250, hc: 730, dev: 1120 };
const W = 1240;

function laneSvg(cfg) {
  const steps = cfg.steps;
  // 自适应纵向布局：推进量=本步内容高＋间距（box/note=30+n*22；arrow=52+n*20），防多行压叠
  let y = 150;
  const laid = steps.map((st) => {
    const at = { ...st, y };
    const n = st.lines.length;
    const h = st.kind === "arrow" ? Math.max(84, 52 + n * 20) : Math.max(88, 30 + n * 22 + 18);
    y += h;
    return at;
  });
  const LIFE_END = y + 12;
  const H = LIFE_END + 36;
  const body = `
<defs>
  <marker id="xsp-mk-xsp-sw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="xsp-fill-sw"/></marker>
  <marker id="xsp-mk-xsp-hc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="xsp-fill-hc"/></marker>
  <marker id="xsp-mk-ev-xsp-sw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="xsp-fill-hc"/></marker>
  <marker id="xsp-mk-ev-xsp-hc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="xsp-fill-sw"/></marker>
  <marker id="xsp-mk-xsp-dev" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="xsp-fill-dev"/></marker>
  <marker id="xsp-mk-ev-xsp-dev" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="xsp-fill-dev"/></marker>
</defs>
${Object.entries(LANES).map(([id, x]) => `
  <g class="xsp-lanehdr xsp-${id}">
    <rect x="${x - 150}" y="${HDR_Y}" width="300" height="${HDR_H}" rx="8" class="xsp-hdr"/>
    <text x="${x}" y="${HDR_Y + 24}" class="xsp-hdr-t" text-anchor="middle">${id === "sw" ? "xHCI 驱动" : id === "hc" ? "xHC 控制器" : "设备"}</text>
    <text x="${x}" y="${HDR_Y + 44}" class="xsp-hdr-s" text-anchor="middle">${id === "sw" ? "system software" : id === "hc" ? "the xHC" : "USB device"}</text>
  </g>
  <line x1="${x}" y1="${HDR_Y + HDR_H}" x2="${x}" y2="${LIFE_END}" class="xsp-life"/>`).join("")}
${laid.map((st, i) => (st.kind === "box" ? boxSvg(st, i) : st.kind === "arrow" ? arrowSvg(st, i) : noteSvg(st, i))).join("")}
<g id="xsp-token" class="xsp-token" opacity="0"><rect x="566" y="59" width="68" height="22" rx="6"/><text x="600" y="74" text-anchor="middle">令牌</text></g>`;
  const svg = k.figureSvg({
    width: W, height: H,
    label: cfg.figLabel || "三方泳道时序图",
    body,
  });
  return { svg, n: steps.length };
}

function boxSvg(st, i) {
  const x = LANES[st.at], w = st.w || 340, h = 30 + st.lines.length * 22;
  return `<g data-step="${i}" data-tx="${x}" data-ty="${st.y}" class="xsp-item xsp-bx xsp-${st.at}">
    <rect x="${x - w / 2}" y="${st.y - h / 2}" width="${w}" height="${h}" rx="8" class="xsp-box"/>
    ${st.lines.map((ln, j) => `<text x="${x}" y="${st.y - (st.lines.length - 1) * 11 + j * 22}" class="xsp-t1">${esc(ln)}</text>`).join("")}
    <text x="${x + w / 2 - 10}" y="${st.y - h / 2 + 16}" class="xsp-pg" text-anchor="end">${esc(st.pg || "")}</text>
  </g>`;
}
function arrowSvg(st, i) {
  const xA = LANES[st.from], xB = LANES[st.to], mid = (xA + xB) / 2;
  const cls = st.from === "sw" ? "xsp-sw" : st.from === "hc" ? "xsp-hc" : "xsp-dev";
  const mk = st.ev ? `xsp-mk-ev` : `xsp-mk`;
  const dir = xB > xA ? 1 : -1;
  const x1 = xA + 8 * dir, x2 = xB - 8 * dir;
  const tx = x1 + (x2 - x1) * 0.72;
  const tick = (x) => `<rect x="${x - 8}" y="${st.y - 15}" width="16" height="30" rx="4" class="xsp-act xsp-act-${cls === "xsp-sw" ? "sw" : "hc"}"/>`;
  return `<g data-step="${i}" data-tx="${tx}" data-ty="${st.y}" class="xsp-item xsp-ar">
    ${st.lines.map((ln, j) => `<text x="${mid}" y="${st.y - 26 + j * 20 - (st.lines.length - 1) * 4}" class="xsp-t2" text-anchor="middle">${esc(ln)}</text>`).join("")}
    ${st.from === "dev" ? "" : tick(xA)}${st.to === "dev" ? "" : tick(xB)}
    <line x1="${x1}" y1="${st.y}" x2="${x2}" y2="${st.y}" class="xsp-ln ${cls} ${st.ev ? "xsp-ev" : ""} ${st.thin ? "xsp-thin" : ""}" marker-end="url(#${mk}-${cls})"/>
    <text x="${mid}" y="${st.y + 26}" class="xsp-pg" text-anchor="middle">${esc(st.pg || "")}</text>
  </g>`;
}
function noteSvg(st, i) {
  const xs = (st.lanes || ["sw", "hc"]).map((l) => LANES[l]);
  let x0 = Math.min(...xs) - 190, x1 = Math.max(...xs) + 190;
  x0 = Math.max(24, x0); x1 = Math.min(W - 24, x1);
  const w = x1 - x0, h = 30 + st.lines.length * 22;
  const cls = st.dev ? "xsp-dev" : "xsp-note2";
  return `<g data-step="${i}" data-tx="${(x0 + x1) / 2}" data-ty="${st.y}" class="xsp-item xsp-note ${cls}">
    <rect x="${x0}" y="${st.y - h / 2}" width="${w}" height="${h}" rx="8" class="xsp-notebox"/>
    ${st.lines.map((ln, j) => `<text x="${(x0 + x1) / 2}" y="${st.y - h / 2 + 26 + j * 22}" class="xsp-t3">${esc(ln)}</text>`).join("")}
    <text x="${x1 - 10}" y="${st.y - h / 2 + 18}" class="xsp-pg" text-anchor="end">${esc(st.pg || "")}</text>
  </g>`;
}

// ---------- 页面组装 ----------
export function lanePage(cfg) {
  const { svg, n } = laneSvg(cfg);
  const N = n;

  const pageCss = `<style>
${zoomFsCss()}
:root { --font-ui: -apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans CJK SC", "Segoe UI", sans-serif; --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace; }
.iso, .iso[data-theme="dark"] {
  --xsp-sw: #7c9ff0; --xsp-hc: #d9a860; --xsp-dev: #86bd7a; --xsp-lane-ink: #10151d;
  --xsp-note-bg: color-mix(in srgb, var(--anatomy-paper, #171f2a) 94%, #ffffff 6%);
}
.iso[data-theme="light"] {
  --xsp-sw: #2d5fb3; --xsp-hc: #8a5f14; --xsp-dev: #2f7a3d; --xsp-lane-ink: #f4efe3;
  --xsp-note-bg: color-mix(in srgb, var(--anatomy-paper, #fbf7ec) 92%, #000000 8%);
}
.xsp-nav { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; margin: 4px 0 2px; font-family: var(--font-ui); font-size: 14px; color: var(--anatomy-muted); }
.xsp-nav .ttl { font-size: 20px; font-weight: 700; color: var(--anatomy-text); }
.xsp-nav a { color: var(--anatomy-link, #9cc3e0); text-decoration: none; } .xsp-nav a:hover { text-decoration: underline; }
.xsp-specref { font-family: var(--font-mono); font-size: 12.5px; color: var(--anatomy-muted); margin: 0 0 14px; }
.xsp-card { background: var(--anatomy-paper, #171f2a); border: 1px solid var(--anatomy-line-mid, #2a3444); border-radius: 8px; padding: 16px 22px; margin: 14px 0; }
.xsp-card h2 { font-family: var(--font-ui); font-size: 18px; margin: 2px 0 8px; color: var(--anatomy-text); }
.xsp-card p { margin: 8px 0; line-height: 1.95; color: var(--anatomy-text); font-size: 16.5px; }
.xsp-card p b { color: var(--anatomy-text); }
.xsp-card table.xsp-tb { width: 100%; border-collapse: collapse; margin: 10px 0 4px; font-family: var(--font-ui); }
.xsp-card table.xsp-tb th { font-size: 14px; color: var(--anatomy-muted); text-align: left; border-bottom: 1.5px solid var(--anatomy-line-mid, #456); padding: 5px 8px; }
.xsp-card table.xsp-tb td { font-size: 15px; color: var(--anatomy-text); border-bottom: 1px dashed var(--anatomy-line-lo, #334); padding: 6px 8px; vertical-align: top; }
.xsp-card table.xsp-tb td.mono { font-family: var(--font-mono); font-size: 13px; }
.xsp-q { margin: 12px 0; padding: 10px 16px; border-left: 3px solid var(--anatomy-line-hi, #556); }
.xsp-q .en { font-family: var(--font-ui); font-style: italic; color: var(--anatomy-muted); font-size: 14.5px; line-height: 1.8; }
.xsp-q .zh { color: var(--anatomy-text); font-size: 15.5px; margin-top: 4px; }
.xsp-q .src { font-family: var(--font-mono); font-size: 12px; color: var(--anatomy-muted); }
.xsp-hdr { fill: var(--lane, var(--anatomy-shade-2)); stroke: none; }
.xsp-lanehdr.xsp-sw .xsp-hdr { fill: var(--xsp-sw); } .xsp-lanehdr.xsp-hc .xsp-hdr { fill: var(--xsp-hc); } .xsp-lanehdr.xsp-dev .xsp-hdr { fill: var(--xsp-dev); }
.xsp-hdr-t { font: 700 18px var(--font-ui); fill: var(--xsp-lane-ink); }
.xsp-hdr-s { font: 400 12.5px var(--font-mono); fill: var(--xsp-lane-ink); opacity: .82; }
.xsp-life { stroke: var(--anatomy-line-mid, #455); stroke-width: 1.4; stroke-dasharray: 3 6; }
.xsp-box { fill: var(--anatomy-shade-2, #20242c); stroke: var(--lane, #888); stroke-width: 1.8; }
.xsp-bx.xsp-sw .xsp-box { stroke: var(--xsp-sw); } .xsp-bx.xsp-hc .xsp-box { stroke: var(--xsp-hc); } .xsp-bx.xsp-dev .xsp-box { stroke: var(--xsp-dev); }
.xsp-t1 { font: 500 16.5px var(--font-ui); fill: var(--anatomy-text); text-anchor: middle; }
.xsp-t1:first-of-type { font-weight: 700; }
.xsp-t2 { font: 500 15.5px var(--font-ui); fill: var(--anatomy-text); }
.xsp-t3 { font: 500 15.5px var(--font-ui); fill: var(--anatomy-text); text-anchor: middle; }
.xsp-note2 .xsp-t3:first-of-type { font-weight: 700; } .xsp-dev .xsp-t3:first-of-type { font-weight: 700; }
.xsp-pg { font: 400 12.5px var(--font-mono); fill: var(--anatomy-muted); }
.iso[data-theme="light"] .xsp-pg { fill: #6b6350; }
.xsp-notebox { fill: var(--xsp-note-bg); stroke: var(--anatomy-line-mid, #455); stroke-dasharray: 5 4; stroke-width: 1.4; }
.xsp-act { fill: var(--anatomy-shade-2, #20242c); stroke-width: 1.6; }
.xsp-act-sw { stroke: var(--xsp-sw); } .xsp-act-hc { stroke: var(--xsp-hc); }
.xsp-note.xsp-dev .xsp-notebox { stroke: var(--xsp-dev); }
.xsp-ln { stroke-width: 2; } .xsp-ln.xsp-sw { stroke: var(--xsp-sw); } .xsp-ln.xsp-hc { stroke: var(--xsp-hc); } .xsp-ln.xsp-dev { stroke: var(--xsp-dev); }
.xsp-ln.xsp-ev { stroke-dasharray: 7 5; } .xsp-ln.xsp-thin { stroke-width: 1.6; }
.xsp-fill-sw { fill: var(--xsp-sw); } .xsp-fill-hc { fill: var(--xsp-hc); } .xsp-fill-dev { fill: var(--xsp-dev); }
.xsp-item { transition: opacity .35s ease; }
.xsp-item.xsp-dim { opacity: .16; }
.xsp-item.xsp-on .xsp-box { stroke-width: 3.2; filter: drop-shadow(0 0 6px var(--anatomy-line-hi, #fff3)); }
.xsp-token rect { fill: var(--anatomy-shade-2, #20242c); stroke: var(--anatomy-line-hi, #ccc); stroke-width: 1.5; }
.xsp-token text { font: 700 14px var(--font-ui); fill: var(--anatomy-text); }
.xsp-token { transition: transform .5s cubic-bezier(.3,.7,.3,1), opacity .3s; }
.xsp-token.xsp-pulse { animation: xsppl 1.1s ease infinite; }
@keyframes xsppl { 0%,100% { opacity: 1; } 50% { opacity: .55; } }
.xsp-ctl { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 10px; font-family: var(--font-ui); }
.xsp-ctl button { font: 500 13px var(--font-ui); color: var(--anatomy-muted); background: transparent; border: 1px solid var(--anatomy-line-mid, #456); border-radius: 4px; padding: 4px 12px; cursor: pointer; }
.xsp-ctl button[aria-pressed="true"] { color: var(--anatomy-text); border-color: var(--anatomy-text); }
.xsp-ctl button:hover { border-color: var(--anatomy-text); }
.xsp-narr { font-family: var(--font-ui); font-size: 15px; color: var(--anatomy-text); background: var(--anatomy-shade-2, #20242c); border: 1px solid var(--anatomy-line-mid, #456); border-radius: 6px; padding: 10px 14px; margin: 10px 0 0; min-height: 44px; }
.xsp-narr b { color: var(--anatomy-text); }
.xsp-legend { display: flex; gap: 14px; flex-wrap: wrap; font-family: var(--font-ui); font-size: 13.5px; color: var(--anatomy-muted); margin-top: 10px; }
.xsp-legend i { display: inline-block; width: 11px; height: 11px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
.xsp-foot { font-family: var(--font-ui); font-size: 13px; color: var(--anatomy-muted); margin-top: 18px; }
@media print { .xsp-ctl { display: none; } }
</style>`;

  const navHtml = `
<div class="xsp-nav">
  <a href="../../index.html">← 规范目录</a>
  <span class="ttl">${esc(cfg.navTitle)}</span>
  ${cfg.nextHref ? `<a href="${cfg.nextHref}">下一节 ${esc(cfg.nextLabel)} →</a>` : ""}
  ${cfg.prevHref ? `<a href="${cfg.prevHref}">← 上一节 ${esc(cfg.prevLabel)}</a>` : ""}
</div>
<p class="xsp-specref">${esc(cfg.specRef)}</p>`;

  const proseHtml = `<div class="xsp-card"><h2>规范要义</h2>
${cfg.prose.map((p) => `<p>${p}</p>`).join("\n")}</div>`;

  const quotesHtml = cfg.quotes.length ? `<div class="xsp-card"><h2>原文对照</h2>
${cfg.quotes.map((q) => `<div class="xsp-q"><div class="en">“${esc(q.en)}”</div>
<div class="zh">${q.zh}</div><div class="src">${esc(q.src)}</div></div>`).join("")}</div>` : "";

  const ctlHtml = `
<div class="xsp-ctl">
  <button type="button" data-mode="tour" aria-pressed="true">总览（流程图）</button>
  <button type="button" data-mode="step" aria-pressed="false">步进（动画）</button>
  <span style="width:1em"></span>
  <button type="button" data-act="prev">◀ 上一步</button>
  <button type="button" data-act="next">下一步 ▶</button>
  <button type="button" data-act="auto" aria-pressed="false">自动播放</button>
  <button type="button" data-act="reset">⟲ 复位</button>
  <span style="color:var(--anatomy-muted);font-size:12px">键盘：空格/→ 下一步 · ← 上一步 · A 自动 · V 切模式 · + − 0 F 缩放/全屏</span>
</div>
<p class="xsp-narr" data-status aria-live="polite">${esc(cfg.tourNarr || "总览模式：完整流程图。每框角标规范页码；虚线=事件回执流。")}</p>`;

  const legendHtml = `<div class="xsp-legend">
${cfg.legend.map((l) => `<span>${l.i ? `<i style="background:${l.i}"></i>` : ""}${l.t}</span>`).join("")}
</div>`;

  const linksHtml = cfg.linksHtml || "";

  const body = pageCss + navHtml + proseHtml + quotesHtml +
    k.plateHtml({
      fig: cfg.figNo,
      title: cfg.figTitle,
      hint: cfg.figHint || "总览=流程图 · 步进=动画（空格/A 驱动）· 可放大可全屏",
      readout: cfg.figReadout || `模式 总览 · 步 -/${N}`,
      keys: [],
      caption: cfg.figCaption,
      body: `<div class="iso-stage" tabindex="0" role="group" aria-label="${esc(cfg.figAria || cfg.figTitle)}">${svg}</div>` + ctlHtml + legendHtml + zoomBarHtml("放大看框内文字 / 全屏后滚轮上下看 · 键盘 + − 0 F 缩放全屏 · 空格步进"),
    }) + linksHtml + `
<p class="xsp-foot">${cfg.footLine}</p>`;

  const NARR = JSON.stringify(cfg.steps.map((s) => s.narr || ""));
  const tourNarr = JSON.stringify(cfg.tourNarr || "总览模式：完整流程图。每框角标规范页码；虚线=事件回执流。");
  const LIVE = `
(() => {
  const stage = document.querySelector(".iso-stage");
  const svgRoot = stage.querySelector("svg");
  const items = [...svgRoot.querySelectorAll("[data-step]")];
  const token = svgRoot.querySelector("#xsp-token");
  const narr = document.querySelector("[data-status]");
  const NARR = ${NARR};
  const TOUR = ${tourNarr};
  const readout = document.querySelector("[data-readout]");
  let mode = "tour", ix = 0, auto = null, idleT = null;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function paint() {
    items.forEach((el, i) => {
      el.classList.toggle("xsp-dim", mode === "step" && i !== ix);
      el.classList.toggle("xsp-on", mode === "step" && i === ix);
    });
    if (mode === "step") {
      const el = items[ix];
      token.setAttribute("opacity", "1");
      const bb = el.getBBox(), tw = 68, th = 22, VW = ${W};
      const cand = [];
      if (!el.classList.contains("xsp-note")) cand.push([bb.x + bb.width / 2 - tw / 2, bb.y - th - 12]);
      cand.push([bb.x - tw - 12, bb.y + bb.height / 2 - th / 2]);
      cand.push([bb.x + bb.width + 12, bb.y + bb.height / 2 - th / 2]);
      const tb = [...svgRoot.querySelectorAll("text")].filter((t) => !t.closest("#xsp-token")).map((t) => t.getBBox());
      let pos = cand[0] || [8, 8];
      for (const c of cand) {
        const cx = Math.max(8, Math.min(VW - tw - 8, c[0])), cy = Math.max(8, c[1]);
        const hit = tb.some((b2) => cx < b2.x + b2.width && cx + tw > b2.x && cy < b2.y + b2.height && cy + th > b2.y);
        if (!hit) { pos = [cx, cy]; break; }
      }
      token.style.transform = "translate(" + (pos[0] - 566) + "px," + (pos[1] - 59) + "px)";
      token.classList.toggle("xsp-pulse", el.classList.contains("xsp-bx") || el.classList.contains("xsp-note"));
      narr.textContent = (ix + 1) + "/${N} · " + NARR[ix];
    } else {
      token.setAttribute("opacity", "0"); token.classList.remove("xsp-pulse");
      narr.textContent = TOUR;
    }
    if (readout) readout.textContent = "模式 " + (mode === "tour" ? "总览" : "步进") + " · 步 " + (mode === "tour" ? "-" : ix + 1) + "/${N}";
    document.querySelectorAll(".xsp-ctl button[data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
  }
  function go(m) {
    if (mode === "tour") { mode = "step"; ix = Math.max(0, Math.min(m - 1, items.length - 1)); }
    else ix = ((m % items.length) + items.length) % items.length;
    paint(); arm();
  }
  function setMode(m) { mode = m; paint(); arm(); }
  function stopAuto() { if (auto) { clearInterval(auto); auto = null; const b = document.querySelector('[data-act="auto"]'); if (b) b.setAttribute("aria-pressed", "false"); } }
  function arm() {
    if (still) return;
    clearTimeout(idleT); stopAuto();
    idleT = setTimeout(() => { if (mode === "step") startAuto(true); }, 8000);
  }
  function startAuto(silent) {
    if (still) return; stopAuto();
    if (mode !== "step") mode = "step";
    auto = setInterval(() => { ix = (ix + 1) % items.length; paint(); }, 3200);
    const b = document.querySelector('[data-act="auto"]'); if (b) b.setAttribute("aria-pressed", "true");
    paint();
  }
  document.querySelector(".xsp-ctl").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.mode) { stopAuto(); setMode(b.dataset.mode); }
    else if (b.dataset.act === "next") { stopAuto(); go(ix + 1); }
    else if (b.dataset.act === "prev") { stopAuto(); go(ix - 1); }
    else if (b.dataset.act === "auto") { auto ? stopAuto() : startAuto(); arm(); }
    else if (b.dataset.act === "reset") { stopAuto(); ix = 0; mode = "tour"; paint(); arm(); }
  });
  stage.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "ArrowRight") { e.preventDefault(); stopAuto(); go(ix + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); stopAuto(); go(ix - 1); }
    else if (e.key === "r" || e.key === "R") { stopAuto(); ix = 0; mode = "tour"; paint(); arm(); }
    else if (e.key === "a" || e.key === "A") { auto ? stopAuto() : startAuto(); arm(); }
    else if (e.key === "v" || e.key === "V") { stopAuto(); setMode(mode === "tour" ? "step" : "tour"); }
  });
  paint();
})();`;

  const script = kitScript() + LIVE + zoomFsScript({ focus: ['[data-step].xsp-on'] });
  const page = k.pageHtml({ title: cfg.pageTitle, theme: cfg.theme, body, script, width: 1500 });
  return page;
}

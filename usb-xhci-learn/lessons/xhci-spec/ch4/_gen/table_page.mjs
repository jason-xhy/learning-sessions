// 表格节页面生成器 —— xhci-spec 板块第4章表格型小节共享模板（2026-11-04）
// DESIGN 分级「表格节不做动画」：无 iso-stage/无 zoomfs/无步进——静态卡片页。
// cfg = { theme, pageTitle, navTitle, specRef, prevHref/prevLabel, nextHref/nextLabel,
//         prose[], quotes[], cards[{h2, html}], linksHtml, footLine }
import * as k from "/Users/jason/.zcode/skills/anatomy/kit/iso-kit.mjs";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function tablePage(cfg) {
  const pageCss = `<style>
:root { --font-ui: -apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans CJK SC", "Segoe UI", sans-serif; --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace; }
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
.xsp-card li { color: var(--anatomy-text); font-size: 16px; line-height: 1.9; margin: 4px 0 4px 18px; }
.xsp-q { margin: 12px 0; padding: 10px 16px; border-left: 3px solid var(--anatomy-line-hi, #556); }
.xsp-q .en { font-family: var(--font-ui); font-style: italic; color: var(--anatomy-muted); font-size: 14.5px; line-height: 1.8; }
.xsp-q .zh { color: var(--anatomy-text); font-size: 15.5px; margin-top: 4px; }
.xsp-q .src { font-family: var(--font-mono); font-size: 12px; color: var(--anatomy-muted); }
.xsp-foot { font-family: var(--font-ui); font-size: 13px; color: var(--anatomy-muted); margin-top: 18px; }
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

  const cardsHtml = cfg.cards.map((c) => `<div class="xsp-card"><h2>${c.h2}</h2>
${c.html}</div>`).join("\n");

  const body = pageCss + navHtml + proseHtml + quotesHtml + cardsHtml + (cfg.linksHtml || "") + `
<p class="xsp-foot">${cfg.footLine}</p>`;

  return k.pageHtml({ title: cfg.pageTitle, theme: cfg.theme, body, script: "", width: 1500 });
}

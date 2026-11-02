// 缩放+全屏轮证据截图（2026-11-02，四机共用）
// 用法：node capture_zoomfs.mjs                # 四机全跑
//       node capture_zoomfs.mjs --only fig3-event-ring
// 每机产出 shots/zoomfs-*：桌面宽幅(1600)、2.4× 焦点件特写、真全屏(api)、phone-390 与 390-zoom、light 宽幅+全屏。
// 坑（§九入档）：captureBeyondViewport 视口重排会复位容器滚动——放大平移一律用负 margin，不用 scrollLeft。
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DRIVE = "/Users/jason/.zcode/skills/anatomy/scripts/drive.mjs";
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;

const FOCUS = {
  "fig1-assembly": '[data-part="actors-cards"]',
  "fig2-transfer-ring": '[data-part="cardface"]',
  "fig3-event-ring": '[data-part="cardface"]',
  "fig4-command-ring": '[data-part="trays"]',
};

// 负 margin 平移到焦点件居中（§九配方：transform/margin 不受 captureBeyondViewport 重排影响）
const panEval = (sel) => `(()=>{const s=document.querySelector('.iso-stage'),v=s.querySelector('svg');const c=document.querySelector('${sel}');if(!c)return {miss:1};const cr=c.getBoundingClientRect(),sr=s.getBoundingClientRect();const centre=(cr.left-sr.left)+s.scrollLeft+cr.width/2;const max=s.scrollWidth-s.clientWidth;const ml=-Math.max(0,Math.min(max,centre-s.clientWidth/2));v.style.marginLeft=ml+'px';return {ml};})()`;

const desktopActions = (tag, sel) => [
  ["wait", 1500], ["key", "Escape"], ["key", "ArrowRight"], ["wait", 2700],
  ["shot", `shots/zoomfs-wide-${tag}.png`, ".iso-plate", 1],
  ["shot", `shots/zoomfs-focal-${tag}.png`, sel, 3],
  ["eval", `(()=>{document.querySelector('[data-fs]').click();return 1;})()`],
  ["wait", 900],
  ["shot", `shots/zoomfs-fs-${tag}.png`, ".iso-stage", 1],
];
const phoneActions = (tag, sel) => [
  ["wait", 1500], ["key", "Escape"], ["key", "ArrowRight"], ["wait", 2700],
  ["shot", `shots/zoomfs-phone-390-${tag}.png`, ".iso-plate", 1],
  ["key", "="], ["key", "="], ["key", "="], ["wait", 400],
  ["eval", panEval(sel)], ["wait", 300],
  ["shot", `shots/zoomfs-phone-390-zoom-${tag}.png`, ".iso-stage", 1],
];
const lightActions = (tag) => [
  ["wait", 1500], ["key", "Escape"], ["key", "ArrowRight"], ["wait", 2700],
  ["shot", `shots/zoomfs-wide-${tag}.png`, ".iso-plate", 1],
  ["eval", `(()=>{document.querySelector('[data-fs]').click();return 1;})()`],
  ["wait", 900],
  ["shot", `shots/zoomfs-fs-${tag}.png`, ".iso-stage", 1],
];

let failed = 0;
for (const fig of Object.keys(FOCUS)) {
  if (only && fig !== only) continue;
  const dir = join(ROOT, fig);
  const GROUPS = [
    { name: `${fig}-dark`, page: "index.html", width: 1600, height: 1000, scale: 2, actions: desktopActions("dark", FOCUS[fig]) },
    { name: `${fig}-light`, page: "index-light.html", width: 1600, height: 1000, scale: 2, actions: lightActions("light") },
    { name: `${fig}-phone`, page: "index.html", width: 390, height: 844, scale: 2, actions: phoneActions("dark", FOCUS[fig]) },
  ];
  for (const g of GROUPS) {
    const actionsFile = join(tmpdir(), `zoomfs-actions-${g.name}.json`);
    writeFileSync(actionsFile, JSON.stringify(g.actions));
    console.log(`== drive ${g.name} (${g.page} @${g.width}) ==`);
    const r = spawnSync(process.execPath, [DRIVE, join(dir, g.page), "--actions", actionsFile,
      "--width", String(g.width), "--height", String(g.height), "--scale", String(g.scale)],
      { cwd: dir, stdio: "inherit" });
    if (r.status !== 0) { console.log(`GROUP-FAIL ${g.name} exit ${r.status}`); failed++; }
  }
}
console.log(failed ? `CAPTURE-ZOOMFS-FAIL (${failed} groups)` : "CAPTURE-ZOOMFS-DONE");
process.exit(failed ? 1 : 0);

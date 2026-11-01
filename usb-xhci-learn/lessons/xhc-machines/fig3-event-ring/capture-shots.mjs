// Fig3 shots 重生成管线（2026-11-01 可读性轮固化）
// 用法：node capture-shots.mjs            # 全量重生成 shots/
//       node capture-shots.mjs --only phone   # 只跑手机组
// 依赖 anatomy skill 的 drive.mjs（键序+等待+命名截图）；dark 页→dark shots、light 页→light shots 严格对应。
// 动作经 --actions 文件传入（含中文/引号，不进命令行 JSON）。
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DRIVE = "/Users/jason/.zcode/skills/anatomy/scripts/drive.mjs";
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;

// 逐帧推进 + 定格（Escape 先停巡游；每帧等 2700ms > 动画 2300ms）
const frameSeq = (names, extra = {}) => {
  const acts = [["wait", 1500], ["key", "Escape"], ["wait", 400]];
  names.forEach((n, i) => {
    if (i > 0) acts.push(["key", "ArrowRight"], ["wait", 2700]);
    acts.push(["shot", `shots/${n}.png`, ".iso-plate", 1]);
    if (extra.at && extra.at[i]) acts.push(...extra.at[i]);
  });
  return acts;
};

// 手机组：1× 全景（plate）→ 3.2× 放大居中位域卡（stage）。
// 坑：Page.captureScreenshot(captureBeyondViewport) 的视口重排会复位 stage 滚动——
// 用负 margin 平移 svg（transform/margin 不受重排影响），不用 scrollLeft。
const phoneActions = (outFull, outZoom) => [
  ["wait", 1500], ["key", "Escape"], ["key", "ArrowRight"], ["wait", 2700],
  ["shot", outFull, ".iso-plate", 1],
  ["key", "="], ["key", "="], ["key", "="], ["wait", 400],
  ["eval", "(()=>{const s=document.querySelector('.iso-stage'),v=s.querySelector('svg');const c=document.querySelector('[data-part=\"cardface\"]').getBoundingClientRect(),sr=s.getBoundingClientRect();const centre=(c.left-sr.left)+s.scrollLeft+c.width/2;const max=s.scrollWidth-s.clientWidth;const ml=-Math.max(0,Math.min(max,centre-s.clientWidth/2));v.style.marginLeft=ml+'px';return {centre,ml,sw:s.scrollWidth,cw:s.clientWidth};})()"],
  ["wait", 300],
  ["shot", outZoom, ".iso-stage", 1],
];

const GROUPS = [
  {
    name: "dark-frames",
    page: "index.html", width: 1440, height: 1000, scale: 2,
    actions: frameSeq(
      ["f0-empty", "f1-deliver", "f2-bell", "f3-pickup", "f4-writeback", "f5-quiet"],
      {
        at: {
          0: [["shot", "shots/lines-dark.png", ".iso-stage", 1],
              ["shot", "shots/close-card.png", '[data-part="cardface"]', 2],
              ["shot", "shots/close-booth.png", '[data-name="booth"]', 1.5],
              ["shot", "shots/close-bell.png", '[data-name="bell"]', 2],
              ["shot", "shots/close-bellsign.png", '[data-name="bellsign"]', 2]],
          1: [["shot", "shots/desktop-dark.png", ".iso-plate", 1],
              ["shot", "shots/lines-f1.png", ".iso-stage", 1],
              ["shot", "shots/close-card-vals.png", '[data-part="cardface"]', 2],
              ["shot", "shots/close-booth-f1.png", '[data-name="booth"]', 1.5]],
          2: [["shot", "shots/lines-f2.png", ".iso-stage", 1]],
          3: [["shot", "shots/lines-f3.png", ".iso-stage", 1]],
          4: [["shot", "shots/lines-f4.png", ".iso-stage", 1],
              ["shot", "shots/close-register.png", '[data-part="regface"]', 2]],
          5: [["shot", "shots/lines-f5.png", ".iso-stage", 1]],
        },
      }),
  },
  {
    name: "light-frames",
    page: "index-light.html", width: 1440, height: 1000, scale: 2,
    actions: frameSeq(["light-f0-empty", "light-f1-deliver", "light-f2-bell", "light-f3-pickup", "light-f4-writeback", "light-f5-quiet"],
      { at: { 1: [["shot", "shots/desktop-light.png", ".iso-plate", 1]] } }),
  },
  {
    name: "phone-dark",
    page: "index.html", width: 390, height: 844, scale: 2,
    actions: phoneActions("shots/phone-dark-390.png", "shots/phone-dark-390-zoom.png"),
  },
  {
    name: "phone-light",
    page: "index-light.html", width: 390, height: 844, scale: 2,
    actions: phoneActions("shots/phone-light-390.png", "shots/phone-light-390-zoom.png"),
  },
];

let failed = 0;
for (const g of GROUPS) {
  if (only && g.name !== only) continue;
  const actionsFile = join(HERE, `shots/.actions-${g.name}.json`);
  writeFileSync(actionsFile, JSON.stringify(g.actions));
  console.log(`== drive ${g.name} (${g.page} @${g.width}) ==`);
  const r = spawnSync(process.execPath, [DRIVE, join(HERE, g.page), "--actions", actionsFile,
    "--width", String(g.width), "--height", String(g.height), "--scale", String(g.scale)],
    { cwd: HERE, stdio: "inherit" });
  if (r.status !== 0) { console.log(`GROUP-FAIL ${g.name} exit ${r.status}`); failed++; }
}
console.log(failed ? `CAPTURE-SHOTS-FAIL (${failed} groups)` : "CAPTURE-SHOTS-DONE");
process.exit(failed ? 1 : 0);

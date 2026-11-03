// 终版截图生成：双主题全景 + 12 帧特写（≥1280 宽）+ 390px 全景/放大
// 用法：node shots.mjs dark | node shots.mjs light | node shots.mjs phone
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const mode = process.argv[2] ?? "dark";
const page = join(HERE, mode === "light" ? "index-light.html" : "index.html");
const OUT = join(HERE, "shots");

// 每帧：[帧号, p, 输出名, 特写区域 [x,y,w,h]（.xhp-stage CSS px）]
const FRAMES = [
  [0, 0.0, "f00-overview", [380, 300, 780, 500]],
  [1, 0.55, "f01-attach", [500, 330, 740, 450]],
  [2, 0.5, "f02-readport", [520, 380, 680, 340]],
  [3, 0.55, "f03-reset-done", [520, 380, 680, 340]],
  [4, 0.62, "f04-enable-slot", [500, 290, 780, 500]],
  [5, 0.55, "f05-slot-init", [390, 40, 720, 560]],
  [6, 0.66, "f06-address", [560, 330, 760, 440]],
  [7, 0.45, "f07-desc8", [540, 330, 800, 460]],
  [8, 0.55, "f08-evaluate", [390, 40, 720, 560]],
  [9, 0.62, "f09-read-desc", [400, 280, 880, 480]],
  [10, 0.8, "f10-configure", [560, 310, 760, 480]],
  [11, 0.6, "f11-done", [380, 280, 880, 520]],
];

function run(args) {
  const child = spawn(process.execPath, ["/Users/jason/.zcode/skills/anatomy/scripts/capture.mjs", ...args], { stdio: "inherit" });
  child.on("exit", (c) => process.exitCode ??= c ?? 0);
}

if (mode === "phone") {
  run([join(HERE, "index.html"), "--width", "390", "--height", "900", "--select", ".xhp-stage", "--out", join(OUT, "phone390-machine.png")]);
} else if (mode === "zoom") {
  // 390px + 3.2× 放大（缩放条最高档）
  const actions = [
    ["eval", "window.__zfs.setZoom(3)"],
    ["wait", 400],
    ["shot", join(OUT, "phone390-zoom.png"), ".xhp-stage", 2],
  ];
  const child = spawn(process.execPath, ["/Users/jason/.zcode/skills/anatomy/scripts/drive.mjs", join(HERE, "index.html"), JSON.stringify(actions), "--viewport", "390x900"], { stdio: "inherit" });
  child.on("exit", (c) => process.exit(c ?? 1));
} else {
  // 全景（页面级）与机器/流程图全景
  run([page, "--width", "1500", "--height", "2200", "--out", join(OUT, `full-${mode}.png`)]);
  run([page, "--select", ".xhp-stage", "--width", "1500", "--height", "900", "--scale", "2", "--out", join(OUT, `machine-${mode}.png`)]);
  run([page, "--select", ".iso-stage:not(.xhp-stage)", "--width", "1500", "--height", "900", "--scale", "1", "--out", join(OUT, `flowchart-${mode}.png`)]);

  // 12 帧特写（≥640 CSS 宽 × scale 2 = ≥1280px）
  const actions = [];
  for (const [f, p, name, region] of FRAMES) {
    actions.push(["eval", `window.__fig43.setFrame(${f},${p})`]);
    actions.push(["wait", 350]);
    actions.push(["shot", join(OUT, `${name}-${mode}.png`), ".xhp-stage", 2, region]);
  }
  const child = spawn(process.execPath, ["/Users/jason/.zcode/skills/anatomy/scripts/drive.mjs", page, JSON.stringify(actions)], { stdio: "inherit" });
  child.on("exit", (c) => process.exit(c ?? 1));
}

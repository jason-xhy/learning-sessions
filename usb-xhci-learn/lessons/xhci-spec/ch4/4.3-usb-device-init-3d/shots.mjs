// shots.mjs —— 3D 件截图：全景 + 12 工段机位（instant）+ 390px 移动宽（console 由 drive.mjs 全程抓取）
// 用法：node shots.mjs [轮次前缀] ；输出 shots/<prefix>*.png
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PREFIX = process.argv[2] || "r";
const page = join(HERE, "index.html");
const OUT = join(HERE, "shots");
const DRIVE = "/Users/jason/.zcode/skills/anatomy/scripts/drive.mjs";

const actions = [["wait", 2200]];
actions.push(["shot", join(OUT, `${PREFIX}-overview.png`), "body", 1]);
for (let i = 0; i < 12; i++) {
  actions.push(["eval", `window.__x43.goto(${i}, {instant:true}); 'ok'`]);
  actions.push(["wait", 420]);
  actions.push(["shot", join(OUT, `${PREFIX}-f${String(i).padStart(2, "0")}.png`), "body", 1]);
}
actions.push(["eval", "window.__x43.labelRects().length + ' labels visible'"]);

const child = spawn(process.execPath, [DRIVE, page, JSON.stringify(actions), "--width", "1440", "--height", "900"], { stdio: ["inherit", "pipe", "inherit"] });
let out = "";
child.stdout.on("data", (d) => { out += d.toString(); process.stdout.write(d); });
child.on("exit", (c) => process.exit(c ?? 1));

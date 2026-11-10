// lib.mjs —— pipeline/tools 共用库（V3 门工具）
// 职责：CLI 参数解析 / scene.dsl.json 读取 / drive.mjs 子进程封装（console 双域抓取判据输出）。
// 依赖：node ≥18、~/.zcode/skills/anatomy/scripts/drive.mjs（可用 --drive 覆盖）。
// 被消费分区：scene.dsl.json 全分区（cameras/timeline/interactions/sceneGraph.labels/panel）。
// 下游复用：S5 精修（全部探针）、S6（纹理回灌后复拍 shots）、S7（timeline 分镜表）。
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TOOLS_DIR = dirname(fileURLToPath(import.meta.url));

export function parseArgs(argv, defaults) {
  const o = { ...defaults };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const nxt = argv[i + 1];
    if (nxt === undefined || nxt.startsWith("--")) o[key] = true;
    else { o[key] = nxt; i++; }
  }
  return o;
}

export function resolvePaths(opts) {
  // 默认布局：<lesson>/pipeline/tools/<tool>.mjs → dsl=<lesson>/pipeline/scene.dsl.json，page=<lesson>/index.html
  const lessonDir = resolve(TOOLS_DIR, "..", "..");
  const dslPath = opts.dsl ? resolve(opts.dsl) : join(lessonDir, "pipeline", "scene.dsl.json");
  const page = opts.page ? resolve(opts.page) : join(lessonDir, "index.html");
  const out = opts.out ? resolve(opts.out) : join(lessonDir, "shots");
  const drive = opts.drive || "/Users/jason/.zcode/skills/anatomy/scripts/drive.mjs";
  return { lessonDir, dslPath, page, out, drive };
}

export function loadDSL(dslPath) {
  return JSON.parse(readFileSync(dslPath, "utf8"));
}

// 跑一条 drive 动作序列；返回完整 stdout（含 console/exception 报告行）。
export function runDrive(drive, page, actions, { width = 1440, height = 900, preload = null } = {}) {
  return new Promise((resolveP, rejectP) => {
    const args = [drive, page, JSON.stringify(actions), "--width", String(width), "--height", String(height)];
    if (preload) args.push("--preload", preload);
    const child = spawn(process.execPath, args, { stdio: ["inherit", "pipe", "inherit"] });
    let out = "";
    child.stdout.on("data", (d) => { out += d.toString(); });
    child.on("exit", (code) => resolveP({ code: code ?? 1, out }));
    child.on("error", rejectP);
  });
}

// console 双域判据：drive 输出不得含 console.error/console.warning(log)/exception 行。
export function consoleVerdict(out) {
  const bad = out.split("\n").filter((l) =>
    l.includes("console.error") || l.includes("console.warning") || l.includes("exception:"));
  return { clean: bad.length === 0, bad: bad.slice(0, 8) };
}

// 环帧：等两次 rAF（标签投影跟随相机）
export const FRAME_SETTLE = 120;

export const click = (sel) => [["scroll", sel], ["click", sel, 0.5, 0.5]];

// 终检：12 帧状态真值表（DOM 断言，写入 build.log；保留为验收证据）
import { spawn } from "node:child_process";
import { appendFileSync } from "node:fs";

const page = "/Users/jason/ZCodeProject/usb-xhci-study/lessons/xhci-spec/ch4/4.3-usb-device-init/index.html";
// [帧, p, 期望 {dev, slot, pls, speed, flags, clips, evCount, trbs}]
const CASES = [
  [0, 0.5, { dev: "off", slot: "—", pls: "—", speed: "—", flags: {}, clips: 0, evCount: 0, trbs: 0 }],
  [1, 0.3, { dev: "powered", slot: "—", pls: "7", speed: "—", flags: { ccs: 1, csc: 1, pr: 0, prc: 0, ped: 0 }, clips: 0, evCount: 0, trbs: 0 }],
  [1, 1, { dev: "powered", slot: "—", pls: "7", speed: "—", flags: { ccs: 1, csc: 1, pr: 0, prc: 0, ped: 0 }, clips: 0, evCount: 1, trbs: 0 }],
  [2, 0.7, { dev: "powered", slot: "—", pls: "复位", speed: "—", flags: { ccs: 1, csc: 1, pr: 1, prc: 0, ped: 0 }, clips: 0, evCount: 1, trbs: 0 }],
  [3, 0.25, { dev: "default", slot: "—", pls: "U0", speed: "FS", flags: { ccs: 1, csc: 1, pr: 0, prc: 1, ped: 1 }, clips: 0, evCount: 1, trbs: 0 }],
  [3, 1, { dev: "default", slot: "—", pls: "U0", speed: "FS", flags: { ccs: 1, csc: 1, pr: 0, prc: 1, ped: 1 }, clips: 0, evCount: 2, trbs: 0 }],
  [4, 0.95, { dev: "default", slot: "Enabled", pls: "U0", speed: "FS", flags: { ccs: 1, csc: 1, pr: 0, prc: 1, ped: 1 }, clips: 0, evCount: 3, trbs: 0 }],
  [5, 1, { dev: "default", slot: "Enabled", pls: "U0", speed: "FS", flags: {}, clips: 0, evCount: 3, trbs: 0, filled: 9, ep0ready: 1 }],
  [6, 0.85, { dev: "address", slot: "Addressed", pls: "U0", speed: "FS", flags: {}, clips: 1, evCount: 3, trbs: 0 }],
  [6, 1, { dev: "address", slot: "Addressed", pls: "U0", speed: "FS", flags: {}, clips: 1, evCount: 4, trbs: 0 }],
  [7, 0.6, { dev: "address", slot: "Addressed", pls: "U0", speed: "FS", flags: {}, clips: 2, evCount: 4, trbs: 3 }],
  [7, 1, { dev: "address", slot: "Addressed", pls: "U0", speed: "FS", flags: {}, clips: 2, evCount: 5, trbs: 0 }],
  [8, 1, { dev: "address", slot: "Addressed", pls: "U0", speed: "FS", flags: {}, clips: 2, evCount: 6, trbs: 0, mpsHot: 1 }],
  [9, 0.9, { dev: "address", slot: "Addressed", pls: "U0", speed: "FS", flags: {}, clips: 3, evCount: 6, trbs: 0 }],
  [9, 1, { dev: "address", slot: "Addressed", pls: "U0", speed: "FS", flags: {}, clips: 3, evCount: 7, trbs: 0 }],
  [10, 0.5, { dev: "address", slot: "Addressed", pls: "U0", speed: "FS", flags: {}, clips: 3, evCount: 7, trbs: 2 }],
  [10, 1, { dev: "configured", slot: "Configured", pls: "U0", speed: "FS", flags: {}, clips: 4, evCount: 9, trbs: 0 }],
  [11, 0.5, { dev: "configured", slot: "Configured", pls: "U0", speed: "FS", flags: {}, clips: 4, evCount: 9, trbs: 0, done: 1 }],
];

const js = `(() => {
  const CASES = ${JSON.stringify(CASES)};
  const out = [];
  for (const [f, p, want] of CASES) {
    window.__fig43.setFrame(f, p);
    const s = window.__fig43.state();
    const flags = Object.fromEntries(["ccs","csc","pr","prc","ped"].map((k) => [k, s.flags[k] ? 1 : 0]));
    const got = { dev: s.dev, slot: s.slot, pls: s.pls, speed: s.speed, flags, clips: s.clips.length, evCount: s.evCount, trbs: s.trbs };
    let ok = got.dev === want.dev && got.slot === want.slot && got.pls === want.pls && got.speed === want.speed
      && got.clips === want.clips && got.evCount === want.evCount && got.trbs === want.trbs;
    for (const k of Object.keys(want.flags || {})) if ((got.flags[k] ? 1 : 0) !== (want.flags[k] ? 1 : 0)) ok = false;
    if (want.filled !== undefined) ok = ok && Object.keys(s.filled).length === want.filled;
    if (want.ep0ready !== undefined) ok = ok && s.ep0ready === want.ep0ready;
    if (want.mpsHot !== undefined) ok = ok && s.mpsHot === want.mpsHot;
    if (want.done !== undefined) ok = ok && s.done === want.done;
    out.push((ok ? "PASS" : "FAIL") + " F" + f + "@p" + p + (ok ? "" : " got=" + JSON.stringify(got) + " want=" + JSON.stringify(want)));
  }
  return out.join("\\n");
})()`;

const child = spawn(process.execPath, ["/Users/jason/.zcode/skills/anatomy/scripts/drive.mjs", page, JSON.stringify([["eval", js]])], { stdio: ["inherit", "pipe", "inherit"] });
let out = "";
child.stdout.on("data", (d) => { out += d.toString(); });
child.on("exit", (c) => {
  const text = out.replace(/^eval: /m, "").replace(/^"/, "").replace(/"$/m, "").replace(/\\n/g, "\n");
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => /^(PASS|FAIL)/.test(l));
  const block = lines.join("\n");
  console.log(block);
  const fails = lines.filter((l) => l.startsWith("FAIL")).length;
  console.log(`frames-truth: ${lines.length - fails}/${lines.length} PASS`);
  appendFileSync("/Users/jason/ZCodeProject/usb-xhci-study/lessons/xhci-spec/ch4/4.3-usb-device-init/build.log", `\n--- 12 帧状态真值表（DOM 断言）---\n${block}\nframes-truth: ${lines.length - fails}/${lines.length} PASS\n`);
  process.exit(fails ? 1 : 0);
});

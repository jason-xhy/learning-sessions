// zoomfs 存活性机检（写入 build.log；保留为验收证据）
import { spawn } from "node:child_process";
import { appendFileSync, writeFileSync } from "node:fs";

const page = "/Users/jason/ZCodeProject/usb-xhci-study/lessons/xhci-spec/ch4/4.3-usb-device-init/index.html";
const js = `(() => {
  const z = window.__zfs;
  const stages = document.querySelectorAll(".iso-stage").length;
  const bars = document.querySelectorAll(".iso-zoombar").length;
  const focus = z ? z.ZOOMS.join("/") : null;
  return "ZFS " + JSON.stringify({ alive: !!z, zoomOf: z ? z.zoomOf() : null, isFs: z ? z.isFs() : null, stages, bars, zooms: focus });
})()`;
const child = spawn(process.execPath, ["/Users/jason/.zcode/skills/anatomy/scripts/drive.mjs", page, JSON.stringify([["eval", js]])], { stdio: ["inherit", "pipe", "inherit"] });
let out = "";
child.stdout.on("data", (d) => { out += d.toString(); process.stdout.write(d); });
child.on("exit", () => {
  const line = out.split("\n").find((l) => l.includes("ZFS"));
  if (line) appendFileSync("/Users/jason/ZCodeProject/usb-xhci-study/lessons/xhci-spec/ch4/4.3-usb-device-init/build.log", `--- zoomfs 存活机检 ---\n${line.trim()}\n`);
});

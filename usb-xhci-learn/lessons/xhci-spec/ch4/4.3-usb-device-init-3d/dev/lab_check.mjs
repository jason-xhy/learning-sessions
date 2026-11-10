// lab_check.mjs —— V2 ⑧ 互动流程行为验证门（drive.mjs 点选链路）
// 判据：正确链走通（badge/done=true）+ 错误选择被拦（做错不推进+提示）。
// 全部用真实 DOM click（drive click action），不用 API 旁路。
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const page = join(HERE, "..", "index.html");
const DRIVE = "/Users/jason/.zcode/skills/anatomy/scripts/drive.mjs";
const OUT = join(HERE, "..", "shots");

const click = (sel) => [["scroll", sel], ["click", sel, 0.5, 0.5]];
const st = () => ["eval", "JSON.stringify(window.__x43.lab.state())"];

const actions = [
  ["wait", 2600],
  ["eval", `window.__x43.tab('lab'); 'tab'`],
  ...click('[data-labstart="getdesc"]'),
  // s1 组 URB：先故意选错 bmRequestType=00h —— 应被拦（不推进+提示）
  ...click('[data-labpick="bmRequestType||00h"]'),
  st(),
  ["eval", `(() => { const m = document.getElementById('x43LabMsg'); return 'hint=' + (m && !m.hidden && m.dataset.bad === '1'); })()`],
  // 正确链 s1
  ...click('[data-labpick="bmRequestType||80h"]'),
  ...click('[data-labpick="bRequest||6"]'),
  ...click('[data-labpick="wValue||0100h"]'),
  ...click('[data-labpick="wLength||8"]'),
  ["wait", 1200],
  st(), // 期望 stepIdx=1
  // s2 TD/TRB：先错 data.dir=0（OUT）→ 拦；再全对
  ...click('[data-labpick="data.dir||0（OUT）"]'),
  st(),
  ...click('[data-labpick="setup.trt||IN Data Stage(3)"]'),
  ...click('[data-labpick="setup.idt||1"]'),
  ...click('[data-labpick="setup.ioc||0"]'),
  ...click('[data-labpick="data.dir||1（IN）"]'),
  ...click('[data-labpick="data.len||8"]'),
  ...click('[data-labpick="status.dir||0（OUT）"]'),
  ...click('[data-labpick="status.ioc||1"]'),
  ["wait", 1200],
  st(), // 期望 stepIdx=2
  ["shot", join(OUT, "v2lab-s2.png"), ".x43-panel", 1],
  // s3 写环：先乱序点 Data TRB（index 1）→ 拦；再按序 0/1/2
  ...click('[data-labplace="1"]'),
  st(),
  ...click('[data-labplace="0"]'),
  ...click('[data-labplace="1"]'),
  ...click('[data-labplace="2"]'),
  ["wait", 1300],
  st(), // 期望 stepIdx=3
  // s4 门铃：先点门铃 0（index 0）→ 拦+纠错提示；再点 EP 门铃（index 1）
  ...click('[data-labchoice="0"]'),
  ["eval", `(() => { const m = document.getElementById('x43LabMsg'); return 'bellhint=' + (m && !m.hidden && m.dataset.bad === '1' && m.textContent.includes('DB Target=1')); })()`],
  ...click('[data-labchoice="1"]'),
  ["wait", 1200],
  st(), // 期望 stepIdx=4
  ["shot", join(OUT, "v2lab-s5-wait.png"), ".x43-panel", 1],
  ["wait", 6200], // s5 等回执自动推进
  st(), // 期望 stepIdx=5
  // s6 取事件：先乱序点 upd → 拦；再按序 read → upd → badge
  ...click('[data-labact="upd"]'),
  st(),
  ...click('[data-labact="read"]'),
  ...click('[data-labact="upd"]'),
  ["wait", 300],
  st(),
  ["eval", `(() => { const s = window.__x43.lab.state(); const badge = document.querySelector('.x43-labbadge'); const ok = s.done && s.wrongCount >= 3 && s.blockedEver && badge; return (ok ? 'LAB-CHECK-PASS' : 'LAB-CHECK-FAIL') + ' wrong=' + s.wrongCount + ' done=' + s.done; })()`],
  ["shot", join(OUT, "v2lab-done.png"), ".x43-panel", 1],
  // 简版第二剧本：Enable Slot（错环 → 拦；对：命令环+门铃0 → BSR=1 legacy 分支）
  ...click('[data-labstart="enableslot"]'),
  ["wait", 400],
  ...click('[data-labpick="ring||事件环"]'),
  st(),
  ...click('[data-labpick="ring||命令环（唯一）"]'),
  ...click('[data-labpick="db||门铃 0 · DB Target=0"]'),
  ["wait", 1200],
  st(),
  ["wait", 6200], // s2 等回执
  st(), // 期望 stepIdx=2
  ...click('[data-labbranch="1"]'),
  ["wait", 300],
  ["eval", `(() => { const s = window.__x43.lab.state(); const msg = document.querySelector('.x43-labmsg'); const legacyOk = s.done && s.branch === 1 && msg && msg.textContent.includes('禁止'); return (legacyOk ? 'LAB2-CHECK-PASS' : 'LAB2-CHECK-FAIL') + ' branch=' + s.branch + ' done=' + s.done; })()`],
];

const child = spawn(process.execPath, [DRIVE, page, JSON.stringify(actions), "--width", "1440", "--height", "900"], { stdio: ["inherit", "pipe", "inherit"] });
child.stdout.on("data", (d) => process.stdout.write(d));
child.on("exit", (c) => process.exit(c ?? 1));

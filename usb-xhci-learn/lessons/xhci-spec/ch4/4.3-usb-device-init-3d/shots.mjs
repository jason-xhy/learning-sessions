// shots.mjs —— V2 3D 件截图：全景 + 12 工段机位（instant）+ 三环机位 + tab/互动 + 390px（console 由 drive.mjs 全程抓取）
// 用法：node shots.mjs [轮次前缀] ；输出 shots/<prefix>*.png
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PREFIX = process.argv[2] || "r";
const page = join(HERE, "index.html");
const OUT = join(HERE, "shots");
const DRIVE = "/Users/jason/.zcode/skills/anatomy/scripts/drive.mjs";
const RINGS_CAM = "[2.0,16.5,13.5],[1.6,11.8,0]";

const actions = [["wait", 2600]];
actions.push(["shot", join(OUT, `${PREFIX}-overview.png`), "body", 1]);
for (let i = 0; i < 12; i++) {
  actions.push(["eval", `window.__x43.goto(${i}, {instant:true}); 'ok'`]);
  actions.push(["wait", 420]);
  actions.push(["shot", join(OUT, `${PREFIX}-f${String(i).padStart(2, "0")}.png`), "body", 1]);
}
// 三环专属机位（V2 ⑥）
actions.push(["eval", `window.__x43.goto(0, {instant:true}); window.__x43.setCam(${RINGS_CAM}); 'rings'`]);
actions.push(["wait", 500]);
actions.push(["shot", join(OUT, `${PREFIX}-rings.png`), "body", 1]);
// F4 动画中段（命令环 TRB 卡 + DMA 光束 + 事件流转）
actions.push(["eval", `window.__x43.goto(4); 'play-f4'`]);
actions.push(["wait", 4300]);
actions.push(["shot", join(OUT, `${PREFIX}-f4-mid.png`), "body", 1]);
// 事件流转走廊（V2 ③：流转卡沿机柜上方可见走廊去文书台，带起终点小标）
// until 轮询流转卡进入走廊中段→再摆机位（setCam 会取消 goto 的相机飞行，须后置）
actions.push(["eval", `window.__x43.goto(1); 'play-f1'`]);
actions.push(["until", `(() => { let ok = false; window.__x43._scene.traverse(o => { if (o.userData && o.userData.flow && o.position.x > -10.5 && o.position.x < -4.5) ok = true; }); return ok; })()`, 40000]);
actions.push(["eval", `window.__x43.setCam([-5.0,12.4,10.5],[-7.5,10.2,0.7]); 'corridor-cam'`]);
actions.push(["wait", 700]);
actions.push(["shot", join(OUT, `${PREFIX}-corridor.png`), "body", 1]);
// 设备近景（V2 ④⑤：倒角外壳/做旧材质 + F6 后顶灯换色 + 铭牌翻面「地址 1」）
actions.push(["eval", `window.__x43.goto(6,{instant:true}); window.__x43.setCam([13.8,3.1,6.6],[12.6,1.45,1.0]); 'dev-close'`]);
actions.push(["wait", 600]);
actions.push(["shot", join(OUT, `${PREFIX}-device-close.png`), "body", 1]);
// 文书台近景（V2 ④：桌面划痕做旧 + 命令单 + 双匣）
actions.push(["eval", `window.__x43.setCam([-11.0,4.0,5.4],[-12.6,3.0,0.6]); 'desk-close'`]);
actions.push(["wait", 600]);
actions.push(["shot", join(OUT, `${PREFIX}-desk-close.png`), "body", 1]);
// tab：字段与引文 / 显示（速度档）
actions.push(["eval", `window.__x43.tab('fields'); 'tab-fields'`]);
actions.push(["wait", 350]);
actions.push(["shot", join(OUT, `${PREFIX}-tab-fields.png`), ".x43-panel", 1]);
actions.push(["eval", `window.__x43.tab('disp'); 'tab-disp'`]);
actions.push(["wait", 350]);
actions.push(["shot", join(OUT, `${PREFIX}-tab-disp.png`), ".x43-panel", 1]);
// 动手台：主练习开题（互动链路截图由 dev/lab_check.mjs 产出——含错选拦截与完成徽章）
actions.push(["eval", `window.__x43.tab('lab'); window.__x43.lab.start('getdesc'); 'lab-start'`]);
actions.push(["wait", 400]);
actions.push(["shot", join(OUT, `${PREFIX}-lab-s1.png`), ".x43-panel", 1]);
// 试错（回到讲解 tab + F5）
actions.push(["eval", `window.__x43.tab('exp'); window.__x43.goto(5,{instant:true}); window.__x43.triggerError(); 'trap'`]);
actions.push(["wait", 10400]);
actions.push(["shot", join(OUT, `${PREFIX}-trap.png`), "body", 1]);
actions.push(["eval", `window.__x43.labelRects().length + ' labels visible'`]);

const child = spawn(process.execPath, [DRIVE, page, JSON.stringify(actions), "--width", "1440", "--height", "900"], { stdio: ["inherit", "pipe", "inherit"] });
let out = "";
child.stdout.on("data", (d) => { out += d.toString(); process.stdout.write(d); });
child.on("exit", (c) => {
  // 390px 手机宽（面板初始折叠形态）
  const phone = [
    ["wait", 2600],
    ["shot", join(OUT, `${PREFIX}-phone390.png`), "body", 1],
    ["eval", `window.__x43.goto(1, {instant:true}); 'f1'`],
    ["wait", 500],
    ["shot", join(OUT, `${PREFIX}-phone390-f1.png`), "body", 1],
  ];
  const c2 = spawn(process.execPath, [DRIVE, page, JSON.stringify(phone), "--width", "390", "--height", "844"], { stdio: ["inherit", "pipe", "inherit"] });
  c2.stdout.on("data", (d) => process.stdout.write(d));
  c2.on("exit", (cc) => process.exit(c === 0 && cc === 0 ? 0 : 1));
});

// Cards.js —— 片头卡/章节卡/片尾卡（S7 组态件；色板=S2 §E 配色板）
// 文案口径：课名/工段名/页码锚出自 DSL timeline.stages 与 S2 §D；不发明数值与 URL。
import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} from "remotion";

const BG = "#0b0f14";
const INK = "#e8eef7";
const SUB = "#a9b7c9";
const BLUE = "#7c9ff0"; // 驱动
const AMBER = "#d9a860"; // xHC
const GREEN = "#86bd7a"; // 设备
const FONT = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';

const fade = (frame, din, dout, total) => ({
  opacity: interpolate(frame, [0, din, total - dout, total], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
});

function ZoneLegend() {
  const zones = [
    ["文书台 · xHCI 驱动", BLUE],
    ["xHC 总控台", AMBER],
    ["设备试验盒", GREEN],
  ];
  return (
    <div style={{ display: "flex", gap: 28, marginTop: 42 }}>
      {zones.map(([t, c]) => (
        <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 22, color: SUB, fontFamily: FONT }}>
          <span style={{ width: 14, height: 14, borderRadius: 3, background: c, display: "inline-block" }} />
          {t}
        </div>
      ))}
    </div>
  );
}

export function IntroCard({ stages }) {
  const frame = useCurrentFrame();
  const total = 4 * 24;
  const f = fade(frame, 12, 12, total);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center", fontFamily: FONT, ...f }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: AMBER, fontSize: 24, letterSpacing: 6, margin: 0 }}>xHCI 规范对照学习 · §4.3</p>
        <h1 style={{ color: INK, fontSize: 62, margin: "18px 0 10px" }}>USB 设备初始化 · xHC 启机车间</h1>
        <p style={{ color: SUB, fontSize: 26, margin: 0 }}>
          xHCI 1.2b §4.3 USB Device Initialization · p71–80
        </p>
        <p style={{ color: SUB, fontSize: 24, margin: "26px 0 0" }}>
          教学演示视频 · {stages.length} 工段 · 一台全速（FS）设备从插入到配置完工的登记全程
        </p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <ZoneLegend />
        </div>
      </div>
    </AbsoluteFill>
  );
}

export function ChapterCard({ stage, seconds }) {
  const frame = useCurrentFrame();
  const total = Math.round(2.0 * 24);
  const f = fade(frame, 8, 8, total);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center", fontFamily: FONT, ...f }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 18 }}>
          <span style={{ color: AMBER, fontSize: 30, fontFamily: FONT }}>{stage.id.replace("F", "工段 ")}</span>
          <span style={{ color: SUB, fontSize: 22 }}>{stage.page || "—"}</span>
        </div>
        <h1 style={{ color: INK, fontSize: 56, margin: "14px 0 12px" }}>{stage.title}</h1>
        {stage.hint ? <p style={{ color: SUB, fontSize: 24, margin: 0, maxWidth: 900 }}>{stage.hint}</p> : null}
        <div style={{ width: 220, height: 3, margin: "26px auto 0", background: `linear-gradient(90deg, ${BLUE}, ${AMBER}, ${GREEN})` }} />
      </div>
    </AbsoluteFill>
  );
}

export function OutroCard({ sizes }) {
  const frame = useCurrentFrame();
  const total = 6 * 24;
  const f = fade(frame, 14, 14, total);
  const totalMB = sizes && sizes.__totalMB ? sizes.__totalMB : "";
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center", fontFamily: FONT, ...f }}>
      <div style={{ textAlign: "center", maxWidth: 980 }}>
        <h1 style={{ color: INK, fontSize: 48, margin: "0 0 18px" }}>登记完工</h1>
        <p style={{ color: SUB, fontSize: 26, margin: 0 }}>
          设备 Configured（已配置）· 槽态 Configured · 管道全通——三方一台：驱动发令、xHC 执行、设备只见 USB 请求
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 26, marginTop: 40 }}>
          <div style={{ border: `1px solid ${BLUE}66`, borderRadius: 12, padding: "18px 26px", width: 400 }}>
            <p style={{ color: BLUE, fontSize: 24, margin: "0 0 8px" }}>完工自测</p>
            <p style={{ color: INK, fontSize: 22, margin: 0 }}>课件「讲解」tab：5 题，≥4 题通过（可重做）</p>
          </div>
          <div style={{ border: `1px solid ${GREEN}66`, borderRadius: 12, padding: "18px 26px", width: 400 }}>
            <p style={{ color: GREEN, fontSize: 24, margin: "0 0 8px" }}>动手台三关</p>
            <p style={{ color: INK, fontSize: 22, margin: 0 }}>按门铃 → 组一次控制读 → 值班工程师挑战</p>
          </div>
        </div>
        <p style={{ color: SUB, fontSize: 21, margin: "34px 0 0", wordBreak: "break-all" }}>
          在线版：https://jason-xhy.github.io/learning-sessions/usb-xhci-learn/lessons/xhci-spec/ch4/4.3-usb-device-init-3d/
        </p>
        <p style={{ color: SUB, fontSize: 22, margin: "10px 0 0" }}>
          交互课件 = 本页同目录 index.html{totalMB ? ` · 演示视频全集 ≈ ${totalMB}MB · 1280×720@24fps` : ""}
        </p>
      </div>
    </AbsoluteFill>
  );
}

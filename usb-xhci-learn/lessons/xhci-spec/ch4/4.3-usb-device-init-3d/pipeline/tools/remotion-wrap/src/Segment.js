// Segment.js —— 工段片段合成：章节卡前置 → 交叉淡化 → 帧序列画面 + 底部字幕 → 段尾淡出
// 帧序列=publicDir 下 <stageId>/NNNNNN.jpg（s7_record.mjs 产出，0 基 6 位编号）
import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { ChapterCard } from "./Cards";

const FPS = 24;
const CARD_LEAD = 2.0;
const CARD_XFADE = 0.4;
const TAIL_FADE = 0.6;
const FONT = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
const INK = "#e8eef7";

const pad6 = (n) => String(n).padStart(6, "0");

function StageFrames({ stageId, frameCount }) {
  const frame = useCurrentFrame();
  const idx = Math.min(Math.max(frame - Math.round(CARD_LEAD * FPS), 0), frameCount - 1);
  return (
    <Img
      src={staticFile(`${stageId}/${pad6(idx)}.jpg`)}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}

function Subtitles({ subs, videoOffsetFrames }) {
  const frame = useCurrentFrame();
  const t = (frame - videoOffsetFrames) / FPS; // 画面内秒
  const cur = subs.find((s) => t >= s.from && t < s.to);
  if (!cur) return null;
  // 字幕淡入淡出 0.25s
  const op = interpolate(t, [cur.from, cur.from + 0.25, cur.to - 0.25, cur.to], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        justifyContent: "center",
        opacity: op,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: "rgba(11,15,20,0.85)",
          borderRadius: "10px 10px 0 0",
          padding: "14px 30px 16px",
          maxWidth: 1080,
          textAlign: "center",
        }}
      >
        <span style={{ color: INK, fontSize: 27, fontFamily: FONT, lineHeight: 1.35, whiteSpace: "pre-wrap" }}>{cur.text}</span>
      </div>
    </div>
  );
}

export function StageSegment({ stage, subs, frameCount }) {
  const frame = useCurrentFrame();
  const total = Math.round((CARD_LEAD + stage.seconds + TAIL_FADE) * FPS);
  const card = frame < Math.round((CARD_LEAD + CARD_XFADE) * FPS);
  const cardOp = interpolate(
    frame,
    [Math.round(CARD_LEAD * FPS), Math.round((CARD_LEAD + CARD_XFADE) * FPS)],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const tailOp = interpolate(frame, [total - Math.round(TAIL_FADE * FPS), total], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ background: "#0b0f14" }}>
      <AbsoluteFill style={{ opacity: tailOp }}>
        {frame >= Math.round(CARD_LEAD * FPS) ? <StageFrames stageId={stage.id} frameCount={frameCount} /> : null}
        <Subtitles subs={subs} videoOffsetFrames={Math.round(CARD_LEAD * FPS)} />
        {card ? (
          <AbsoluteFill style={{ opacity: cardOp }}>
            <ChapterCard stage={stage} />
          </AbsoluteFill>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

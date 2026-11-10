// Root.js —— S7 Remotion 合成注册表（14 段：片头卡 / 12 工段 / 片尾卡）
// 每段 1280×720@24fps；工段表/字幕表运行时从 subtitles.json + render_all.mjs 传入的 props 生成。
// 章节卡 2.0s 前置 → 0.4s 交叉淡化 → 帧序列画面 → 段尾淡出 0.6s。
import React from "react";
import { Composition } from "remotion";
import { IntroCard, ChapterCard, OutroCard } from "./Cards";
import { StageSegment } from "./Segment";

export const FPS = 24;
export const WIDTH = 1280;
export const HEIGHT = 720;
export const CARD_LEAD = 2.0; // 章节卡前置秒
export const CARD_XFADE = 0.4; // 卡→画面交叉淡化秒
export const TAIL_FADE = 0.6; // 段尾淡出秒

const stageMeta = require("../stages.json");
const subtitles = require("../subtitles.json");
const sizes = require("../sizes.json");

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="S07-intro"
        component={IntroCard}
        durationInFrames={Math.round(4.0 * FPS)}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ stages: stageMeta }}
      />
      {stageMeta.map((st) => (
        <Composition
          key={st.id}
          id={"S07-" + st.id}
          component={StageSegment}
          width={WIDTH}
          height={HEIGHT}
          fps={FPS}
          durationInFrames={Math.round((CARD_LEAD + st.seconds + TAIL_FADE) * FPS)}
          defaultProps={{
            stage: st,
            subs: subtitles[st.id] || [],
            frameCount: Math.round(st.seconds * FPS),
            sizeLabel: (sizes && sizes[st.id]) || "",
          }}
        />
      ))}
      <Composition
        id="S07-outro"
        component={OutroCard}
        durationInFrames={Math.round(6.0 * FPS)}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ sizes }}
      />
    </>
  );
};

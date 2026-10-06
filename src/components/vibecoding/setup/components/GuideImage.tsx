import { useId } from "react"
import type { StepGuide } from "../steps"
import { vibecoding } from "@/config/vibecoding"

/**
 * 안내 그림 + 주황 점선 표시.
 * SVG 하나로 그려서 칸 크기가 바뀌어도 그림과 표시 위치가 함께 줄고 늘어요.
 */
export function GuideImage({ guide }: { guide: StepGuide }) {
  const clipId = useId()
  const { width, height, highlight: h, label } = guide
  // 작은 그림은 표시·이름표도 함께 작게 그려요.
  const s = guide.markScale ?? 1
  const pad = 10 * s
  const labelW = (label?.length ?? 0) * 26 * s + 36 * s
  const labelH = 44 * s
  const gap = pad + 12 * s

  let labelX = 0
  let labelY = 0
  if (h && label) {
    // 이름표는 표시 상자 아래 → 오른쪽 → 위 순서로, 그림 안에 들어가는 자리에 달아요.
    const side =
      guide.labelSide ??
      (h.y + h.h + gap + labelH <= height
        ? "below"
        : h.x + h.w + gap + labelW <= width
          ? "right"
          : "above")
    if (side === "below") {
      labelX = h.x + h.w / 2 - labelW / 2
      labelY = h.y + h.h + gap
    } else if (side === "right") {
      labelX = h.x + h.w + gap
      labelY = h.y + h.h / 2 - labelH / 2
    } else {
      labelX = h.x + h.w / 2 - labelW / 2
      labelY = h.y - gap - labelH
    }
    labelX = Math.min(Math.max(labelX, 8 * s), width - labelW - 8 * s)
  }

  return (
    <figure className="flex min-h-0 min-w-0 flex-1 flex-col">
      {guide.caption && (
        <figcaption className="mb-1.5 text-sm font-semibold text-foreground/85">
          {guide.caption}
        </figcaption>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMin meet"
        role="img"
        aria-label={guide.alt}
        className="min-h-0 w-full flex-1"
      >
        <rect
          x="0.5"
          y="0.5"
          width={width - 1}
          height={height - 1}
          rx="12"
          className="fill-surface"
        />
        <clipPath id={clipId}>
          <rect width={width} height={height} rx="12" />
        </clipPath>
        <image
          href={`${vibecoding.assetBase}${guide.src}`}
          width={width}
          height={height}
          clipPath={`url(#${clipId})`}
        />
        {guide.dim && (
          <g>
            <rect
              x={guide.dim.x}
              y={guide.dim.y}
              width={guide.dim.w}
              height={guide.dim.h}
              className="fill-background"
              opacity="0.82"
            />
            <text
              x={guide.dim.x + guide.dim.w / 2}
              y={guide.dim.y + guide.dim.h / 2}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-muted-foreground"
              style={{ fontSize: 22 * s, fontWeight: 600 }}
            >
              {guide.dim.text}
            </text>
          </g>
        )}
        <rect
          x="0.5"
          y="0.5"
          width={width - 1}
          height={height - 1}
          rx="12"
          fill="none"
          className="stroke-border"
          strokeWidth="2"
        />
        {h && (
          <rect
            x={h.x - pad}
            y={h.y - pad}
            width={h.w + pad * 2}
            height={h.h + pad * 2}
            rx={14 * s}
            fill="none"
            className="stroke-annotate"
            strokeWidth={5 * s}
            strokeDasharray={`${14 * s} ${9 * s}`}
            strokeLinecap="round"
          />
        )}
        {h && label && (
          <>
            <rect
              x={labelX}
              y={labelY}
              width={labelW}
              height={labelH}
              rx={labelH / 2}
              className="fill-annotate"
            />
            <text
              x={labelX + labelW / 2}
              y={labelY + labelH / 2}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-annotate-foreground"
              style={{ fontSize: 24 * s, fontWeight: 700 }}
            >
              {label}
            </text>
          </>
        )}
      </svg>
    </figure>
  )
}

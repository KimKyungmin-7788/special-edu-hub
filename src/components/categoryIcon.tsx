import { useId, type ComponentType, type SVGProps } from "react"
import { Sparkles, Zap } from "lucide-react"
import { handmadeIcons } from "@/components/handmadeIcons"

export type CategoryIcon = ComponentType<SVGProps<SVGSVGElement>>

/**
 * 손그림 아이콘 데이터 → currentColor 로 칠하는 SVG 컴포넌트.
 *  - layers 를 아래층부터 그린다(조합 아이콘은 층마다 transform 으로 배치).
 *  - 층의 knockout 영역은 마스크로 지워 앞에 놓인 그림 뒤 선을 가린다.
 *    (마스크의 흰/검정은 투명도 값일 뿐 화면 색이 아니다)
 *  - 채움 선에 화면 기준 0.7px 테두리를 더해 작게 보여도 선이 흐려지지 않게 한다.
 *  - strokes(손글씨 획)는 맨 위에 긋는다.
 */
function handmade(name: string): CategoryIcon {
  const { viewBox, layers, strokes } = handmadeIcons[name]
  const [vx, vy, vw, vh] = viewBox.split(" ").map(Number)
  function HandmadeIcon(props: SVGProps<SVGSVGElement>) {
    const uid = `hm-${useId().replace(/:/g, "")}`
    return (
      <svg viewBox={viewBox} fill="currentColor" {...props}>
        <g stroke="currentColor" strokeWidth={0.7} strokeLinejoin="round">
          {layers.map((layer, li) => {
            const body = (
              <g transform={layer.transform}>
                {layer.paths.map((d, i) => (
                  <path key={i} d={d} vectorEffect="non-scaling-stroke" />
                ))}
              </g>
            )
            if (!layer.knockout) return <g key={li}>{body}</g>
            const maskId = `${uid}-${li}`
            return (
              <g key={li}>
                <mask id={maskId} maskUnits="userSpaceOnUse" x={vx} y={vy} width={vw} height={vh}>
                  <rect x={vx} y={vy} width={vw} height={vh} fill="white" />
                  {layer.knockout.map((d, i) => (
                    <path key={i} d={d} fill="black" stroke="black" strokeWidth={2.4} strokeLinejoin="round" />
                  ))}
                </mask>
                <g mask={`url(#${maskId})`}>{body}</g>
              </g>
            )
          })}
        </g>
        {strokes?.map((s, i) => (
          <path
            key={i}
            d={s.d}
            fill="none"
            stroke="currentColor"
            strokeWidth={s.width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    )
  }
  HandmadeIcon.displayName = `Handmade(${name})`
  return HandmadeIcon
}

/**
 * config 의 icon 문자열 → 아이콘 컴포넌트 매핑.
 * 그리드에 보이는 카테고리는 손그림 아이콘, 숨김 카테고리(업무자동화)는 lucide 유지.
 */
export const iconMap: Record<string, CategoryIcon> = {
  "book-open": handmade("open-book-hangul"),
  calculator: handmade("math-123"),
  globe: handmade("globe-flask"),
  music: handmade("palette-note-ball"),
  briefcase: handmade("luggage"),
  house: handmade("alarm-clock"),
  sparkles: handmade("puzzle"),
  users: handmade("blackboard-uriban"),
  settings: handmade("laptop"),
  zap: Zap,
}

/** icon 문자열로 아이콘 컴포넌트 조회. 없으면 Sparkles 로 대체. */
export function getCategoryIcon(name?: string): CategoryIcon {
  return (name && iconMap[name]) || Sparkles
}

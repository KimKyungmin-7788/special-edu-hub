/**
 * 홍보 링크용 브랜드 마크 (2단계 묶음 C 후속).
 * lucide 에 빠져 있는 브랜드 아이콘을 단색(currentColor) 인라인 SVG 로 둔다.
 * 색을 박지 않고 currentColor 만 써서 중립 디자인(흑백)을 유지한다.
 * 블로그·사이트는 lucide 일반 아이콘(Rss·Link)을 그대로 쓴다.
 */

type IconProps = { className?: string }

/** 인스타그램 — 라인 마크(카메라 윤곽 + 렌즈 + 점). */
export function InstagramIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

/** 유튜브 — 솔리드 마크(둥근 사각형 + 재생 삼각형). */
export function YoutubeIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M23.5 6.5a3 3 0 0 0-2.11-2.12C19.5 4 12 4 12 4s-7.5 0-9.39.38A3 3 0 0 0 .5 6.5 31.4 31.4 0 0 0 .12 12a31.4 31.4 0 0 0 .38 5.5 3 3 0 0 0 2.11 2.12C4.5 20 12 20 12 20s7.5 0 9.39-.38a3 3 0 0 0 2.11-2.12A31.4 31.4 0 0 0 23.88 12a31.4 31.4 0 0 0-.38-5.5zM9.75 15.5v-7l6 3.5-6 3.5z" />
    </svg>
  )
}

import type { CSSProperties } from "react"
import type { Category } from "@/config/categories"
import { getCategoryIcon } from "@/components/categoryIcon"

/** 아래·왼쪽으로 갈수록 투명해지는 마스크 — 아이콘 윗부분은 선명, 아랫부분은 배경에 녹아든다. */
const FADE_EMBLEM: CSSProperties = {
  maskImage: "linear-gradient(200deg, #000 35%, transparent 90%)",
  WebkitMaskImage: "linear-gradient(200deg, #000 35%, transparent 90%)",
}
/** 가장자리로 갈수록 사라지는 원형 마스크 — 뒤에 깔린 큰 그림자 아이콘용. */
const FADE_GHOST: CSSProperties = {
  maskImage: "radial-gradient(circle at 35% 40%, #000 20%, transparent 70%)",
  WebkitMaskImage: "radial-gradient(circle at 35% 40%, #000 20%, transparent 70%)",
}

/**
 * 과목 페이지 상단 배너 — 과목 아이콘을 상징물처럼 크게 보여 준다.
 *  오른쪽: 선명한 상징 아이콘(아래로 페이드) + 그 뒤로 크게 기울어진 옅은 그림자 아이콘
 *  왼쪽  : 과목명 + 한 줄 소개(config tagline)
 * 색은 브랜드 토큰(bg-brand-soft / text-primary)만 쓴다. 장식 아이콘은 스크린리더 제외.
 */
export function SubjectBanner({ category }: { category: Category }) {
  const Icon = getCategoryIcon(category.icon)
  return (
    <div className="relative isolate overflow-hidden rounded-xl bg-brand-soft">
      {/* 뒤 — 크게 기울어진 그림자 아이콘(가장자리로 사라짐) */}
      <Icon
        aria-hidden
        style={FADE_GHOST}
        className="pointer-events-none absolute -right-16 -top-20 -z-10 size-80 -rotate-12 text-primary opacity-[0.16] sm:-right-10"
      />
      {/* 상징 아이콘 뒤의 은은한 빛번짐 */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-1/2 -z-10 size-40 -translate-y-1/2 rounded-full bg-background/70 blur-2xl sm:right-8 sm:size-56"
      />
      {/* 앞 — 상징 아이콘(윗부분 선명, 아래로 페이드) */}
      <Icon
        aria-hidden
        style={FADE_EMBLEM}
        className="pointer-events-none absolute right-4 top-1/2 -z-10 size-28 -translate-y-1/2 text-primary opacity-70 sm:right-14 sm:size-44 sm:opacity-100"
      />

      <div className="max-w-[70%] px-6 py-8 sm:max-w-[60%] sm:px-8 sm:py-12">
        <h1 className="text-2xl font-bold tracking-tight text-hero-foreground sm:text-3xl">
          {category.name}
        </h1>
        {category.tagline && (
          <p className="mt-2 text-sm text-hero-muted sm:text-base">
            {category.tagline}
          </p>
        )}
      </div>
    </div>
  )
}

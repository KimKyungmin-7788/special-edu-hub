import { useEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"
import { Link } from "react-router-dom"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { site, type HeroSlide } from "@/config/site"
import { cn } from "@/lib/utils"
import { WriteButton } from "@/components/app/WriteButton"

type PagerProps = {
  index: number
  count: number
  onGo: (i: number) => void
}

/** 넘김 표시 — 진행 막대(누르면 해당 장) + ‹ 1 / 3 ›. */
function Pager({ index, count, onGo }: PagerProps) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <div className="flex gap-1">
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${i + 1}번 슬라이드로`}
            onClick={() => onGo(i)}
            className="py-1.5"
          >
            <span
              className={cn(
                "block h-0.5 w-5 rounded-full transition-colors",
                i === index ? "bg-foreground" : "bg-border",
              )}
            />
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="이전 슬라이드"
          onClick={() => onGo(index - 1)}
          className="rounded p-0.5 hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" aria-hidden />
        </button>
        <span className="tabular-nums">
          {index + 1} / {count}
        </span>
        <button
          type="button"
          aria-label="다음 슬라이드"
          onClick={() => onGo(index + 1)}
          className="rounded p-0.5 hover:text-foreground"
        >
          <ChevronRight className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  )
}

/**
 * 슬라이드 한 장.
 * 넓은 화면: [키워드 칸 | 구분선 | 2×2 격자]
 *   격자 1행 = 제목 · 버튼 / 2행 = 부제 · 넘김 표시(버튼 바로 아래, 부제와 같은 줄)
 *   키워드 칸은 카드 왼쪽 끝~구분선 사이 전체이고, 키워드는 그 칸의 정중앙.
 * 모바일: 키워드 칸 숨김 → 제목 위 작은 키워드, 제목 → 부제 → 버튼 → 넘김 순서로 쌓기.
 */
function SlideContent({
  slide,
  pager,
}: {
  slide: HeroSlide
  pager?: PagerProps
}) {
  if (slide.type === "banner") {
    return (
      <img
        src={slide.imageUrl}
        alt={slide.alt ?? ""}
        className="h-full w-full object-cover"
      />
    )
  }
  return (
    <div className="flex h-full items-stretch">
      {slide.keyword && (
        <>
          <div className="hidden w-40 shrink-0 items-center justify-center sm:flex">
            <span className="text-4xl font-semibold tracking-tight text-muted-foreground/70">
              {slide.keyword}
            </span>
          </div>
          <div aria-hidden className="my-6 hidden w-px shrink-0 bg-border sm:block" />
        </>
      )}

      <div className="grid min-w-0 flex-1 content-center items-center gap-y-2 px-6 py-6 sm:grid-cols-[1fr_auto] sm:gap-x-8 sm:px-8">
        <div className="min-w-0 sm:col-start-1 sm:row-start-1">
          {slide.keyword && (
            <p className="mb-1 text-sm font-semibold text-muted-foreground sm:hidden">
              {slide.keyword}
            </p>
          )}
          <h1 className="whitespace-pre-line text-xl font-bold leading-snug tracking-tight sm:text-2xl">
            {slide.title}
          </h1>
        </div>

        {slide.subtitle && (
          <p className="text-sm text-muted-foreground sm:col-start-1 sm:row-start-2">
            {slide.subtitle}
          </p>
        )}

        {slide.ctaLabel && (
          <div className="mt-2 sm:col-start-2 sm:row-start-1 sm:mt-0 sm:justify-self-center">
            {slide.ctaAction === "write" ? (
              // 글쓰기 진입점과 동일 — 과목 선택 창 → /write/:categoryId (로그인·인증은 글쓰기 페이지가 안내)
              <WriteButton label={slide.ctaLabel} />
            ) : (
              <Link
                to={slide.ctaHref ?? "/apps/subject"}
                className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                {slide.ctaLabel}
              </Link>
            )}
          </div>
        )}

        {pager && (
          <div className="mt-2 sm:col-start-2 sm:row-start-2 sm:mt-0 sm:justify-self-center">
            <Pager {...pager} />
          </div>
        )}
      </div>
    </div>
  )
}

/** 자동 넘김 간격(ms) */
const AUTOPLAY_MS = 5000

/**
 * 히어로 캐러셀 — config(heroSlides)의 문구/배너 슬라이드를 갈아끼운다.
 * 1번부터 시작해 5초마다 다음 장으로, 가로로 밀려 넘어가는 슬라이드 방식.
 * 마지막 → 1번도 같은 방향으로 이어지도록 끝에 1번 복제본을 붙여 두고,
 * 복제본에 도착하면 전환 없이 진짜 1번 위치로 순간 이동한다(무한 루프처럼 보임).
 * 마우스를 올리거나 키보드 포커스가 있으면 멈춤, 수동으로 넘기면 5초를 다시 센다.
 * '동작 줄이기' 설정이면 밀림 효과 없이 바로 바뀜.
 */
export function Hero() {
  const slides = site.heroSlides
  const count = slides.length
  const hasControls = count > 1
  // 트랙 = 실제 슬라이드 + (여러 장이면) 1번 복제본
  const track = hasControls ? [...slides, slides[0]] : slides

  const [pos, setPos] = useState(0) // 0..count (count = 복제본)
  const [animate, setAnimate] = useState(true)
  const [paused, setPaused] = useState(false)
  const index = pos % count
  const trackRef = useRef<HTMLDivElement>(null)

  const next = () => {
    setAnimate(true)
    setPos((p) => (p >= count ? p : p + 1))
  }

  const go = (target: number) => {
    const t = (target + count) % count
    // 복제본에 머물러 있으면(전환 끝 이벤트 전) 먼저 진짜 1번으로 옮겨 두고 계산
    let from = pos
    if (from === count) {
      flushSync(() => {
        setAnimate(false)
        setPos(0)
      })
      void trackRef.current?.offsetWidth
      from = 0
    }
    // 1번에서 '이전' → 복제본(끝)으로 순간 이동한 뒤 마지막 장으로 밀려 오게
    if (target < 0 && from === 0) {
      flushSync(() => {
        setAnimate(false)
        setPos(count)
      })
      void trackRef.current?.offsetWidth // 순간 이동을 먼저 그리게 강제(리플로우)
      setAnimate(true)
      setPos(t)
      return
    }
    // 마지막 장에서 '다음' → 복제본으로 밀어서 이어지게
    if (target >= count && from === count - 1) {
      next()
      return
    }
    setAnimate(true)
    setPos(t)
  }

  // 복제본 도착(또는 동작 줄이기로 전환 이벤트가 없을 때) → 진짜 1번으로 순간 이동
  const snapIfClone = () => {
    if (pos === count) {
      setAnimate(false)
      setPos(0)
    }
  }
  useEffect(() => {
    if (pos !== count) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      snapIfClone()
    }
  })

  // pos 가 바뀔 때마다 타이머를 새로 건다 → 수동 넘김 후에도 5초 온전히 보여 줌
  useEffect(() => {
    if (!hasControls || paused) return
    const t = window.setTimeout(next, AUTOPLAY_MS)
    return () => window.clearTimeout(t)
  }, [pos, paused, hasControls])

  return (
    <section
      aria-roledescription="carousel"
      className="relative overflow-hidden rounded-xl border bg-surface"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false)
      }}
    >
      {/* 가로 트랙: 모든 장을 한 줄로 두고 translateX 로 민다.
          flex 항목은 높이가 같아져 → 배너 높이 = 가장 긴 슬라이드(넘겨도 아래가 들썩이지 않음). */}
      <div
        ref={trackRef}
        className={cn(
          "flex min-h-36",
          animate &&
            "transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        )}
        style={{ transform: `translateX(-${pos * 100}%)` }}
        onTransitionEnd={(e) => {
          if (e.target === e.currentTarget) snapIfClone()
        }}
      >
        {track.map((slide, i) => {
          const own = i % count // 이 장의 번호(복제본은 1번)
          const current = i === pos
          return (
            <div
              key={i}
              aria-hidden={!current}
              inert={!current}
              className="w-full shrink-0"
            >
              {/* 넘김 표시는 각 장에 자기 번호로 그려 장과 함께 밀려 간다 */}
              <SlideContent
                slide={slide}
                pager={
                  hasControls ? { index: own, count, onGo: go } : undefined
                }
              />
            </div>
          )
        })}
      </div>
      <span className="sr-only" aria-live="polite">
        {index + 1} / {count}
      </span>
    </section>
  )
}

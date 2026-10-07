import { useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { vibecodingPath } from "@/config/vibecoding"
import { WHY, WHY_TITLE } from "@/components/vibecoding/setup/steps"
import { SlideFrame } from "@/components/vibecoding/setup/components/SlideFrame"
import { WhyView } from "@/components/vibecoding/setup/components/WhyView"
import { WhyCover } from "@/components/vibecoding/setup/components/WhyCover"

/**
 * 왜 바이브코딩인가?(/vibecoding/why) — 바이브코딩 배우기의 첫 하위 페이지.
 * 내용은 환경구축과 같은 steps.ts(WHY)에서 읽고, 화면도 같은 16:9 슬라이드(SlideFrame·WhyView)를 쓴다.
 * 표지 + 3장. 몇 번째 장인지는 ?p= 로만 관리(표지는 p 없음). 마지막 장에서 환경구축으로 넘어간다.
 */
export function VibeWhy() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const n = Number(params.get("p"))
  /** 표지(0) + 슬라이드(1~) */
  const count = WHY.length + 1
  const index = Number.isInteger(n) && n >= 1 && n <= count ? n - 1 : 0
  const last = index === count - 1
  const slide = index > 0 ? WHY[index - 1] : null

  const go = (i: number) => {
    if (i < 0) return
    if (i >= count) navigate(vibecodingPath("setup"))
    else setParams(i === 0 ? {} : { p: String(i + 1) })
  }

  // 키보드 ← → 로 넘겨요. 글을 쓰는 중이면 넘기지 않아요.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const t = e.target as HTMLElement
      if (t.closest("input, textarea, [contenteditable], dialog[open]")) return
      if (e.key === "ArrowRight" && !last) go(index + 1)
      if (e.key === "ArrowLeft") go(index - 1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const view = slide ? (
    <WhyView
      slide={slide}
      number={index}
      total={WHY.length}
      nextLabel={last ? "환경구축 시작하기" : "다음"}
      onPrev={() => go(index - 1)}
      onNext={() => go(index + 1)}
    />
  ) : (
    <WhyCover onStart={() => go(1)} />
  )

  return (
    <>
      {/* 좁은 화면: 위아래로 읽어요 */}
      <div className="overflow-hidden rounded-xl border bg-surface shadow-sm lg:hidden">
        {view}
      </div>

      {/* 넓은 화면: 화면 높이에 맞춘 16:9 슬라이드 */}
      <div className="hidden h-[calc(100svh-5.5rem)] min-h-[36rem] overflow-hidden rounded-xl border bg-surface p-3 shadow-sm lg:flex">
        <SlideFrame
          footer={
            <footer className="flex h-10 shrink-0 items-center gap-4 border-t bg-background px-5 text-sm text-muted-foreground">
              <span className="min-w-0 flex-1 truncate">
                {WHY_TITLE} · {slide ? slide.short : "표지"}
              </span>
              <div className="flex items-center gap-1.5" aria-hidden>
                {Array.from({ length: count }, (_, i) => (
                  <span
                    key={i}
                    className={
                      "h-1.5 rounded-full transition-all " +
                      (i === index
                        ? "w-5 bg-primary"
                        : i === 0
                          ? "w-1.5 bg-hero-accent/60"
                          : "w-1.5 bg-border")
                    }
                  />
                ))}
              </div>
              <div className="flex flex-1 items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => go(index - 1)}
                  disabled={index === 0}
                  aria-label="이전 슬라이드"
                  className="rounded-md p-1 hover:bg-accent disabled:opacity-40"
                >
                  <ArrowLeft aria-hidden className="size-4" />
                </button>
                <span className="tabular-nums">
                  {index + 1} / {count}
                </span>
                <button
                  type="button"
                  onClick={() => go(index + 1)}
                  disabled={last}
                  aria-label="다음 슬라이드"
                  className="rounded-md p-1 hover:bg-accent disabled:opacity-40"
                >
                  <ArrowRight aria-hidden className="size-4" />
                </button>
              </div>
            </footer>
          }
        >
          {view}
        </SlideFrame>
      </div>
    </>
  )
}

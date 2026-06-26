import { useState } from "react"
import { Link } from "react-router-dom"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { site, type HeroSlide } from "@/config/site"
import { cn } from "@/lib/utils"

function SlideContent({ slide }: { slide: HeroSlide }) {
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
    <div className="flex h-full flex-col items-start justify-center gap-4 px-6 py-12 sm:px-12">
      <h1 className="whitespace-pre-line text-2xl font-semibold tracking-tight sm:text-3xl">
        {slide.title}
      </h1>
      {slide.subtitle && (
        <p className="text-muted-foreground">{slide.subtitle}</p>
      )}
      {slide.ctaLabel && (
        <Link
          to="/apps/subject"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {slide.ctaLabel}
        </Link>
      )}
    </div>
  )
}

/** 히어로 캐러셀 — config(heroSlides)의 문구/배너 슬라이드를 갈아끼운다. */
export function Hero() {
  const slides = site.heroSlides
  const [index, setIndex] = useState(0)
  const count = slides.length
  const hasControls = count > 1

  const go = (next: number) => setIndex((next + count) % count)

  return (
    <section className="relative overflow-hidden rounded-lg border bg-surface">
      <div className="min-h-56 sm:min-h-64">
        <SlideContent slide={slides[index]} />
      </div>

      {hasControls && (
        <>
          <button
            type="button"
            aria-label="이전 슬라이드"
            onClick={() => go(index - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md bg-background/90 p-1.5 hover:bg-background"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="다음 슬라이드"
            onClick={() => go(index + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-background/90 p-1.5 hover:bg-background"
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i + 1}번 슬라이드로`}
                onClick={() => setIndex(i)}
                className={cn(
                  "size-2 rounded-full transition-colors",
                  i === index ? "bg-foreground" : "bg-border",
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

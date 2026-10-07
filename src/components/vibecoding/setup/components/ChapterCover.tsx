import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import type { Chapter } from "../steps"

interface Props {
  chapter: Chapter
  /** 몇 번째 장인지 (1부터) */
  number: number
  lead: string
  /** 이 장의 단계들: 전체 단계 번호, 이름, 끝났는지 */
  items: { no: number; short: string; done: boolean }[]
  onPrev: () => void
  onStart: () => void
}

/** 장 표지 슬라이드 */
export function ChapterCover({
  chapter,
  number,
  lead,
  items,
  onPrev,
  onStart,
}: Props) {
  return (
    <div className="flex h-full flex-col justify-center bg-hero px-24">
      <p className="text-lg font-semibold text-hero-accent">{number}장</p>
      <h1 className="mt-2 text-5xl font-bold leading-tight tracking-tight text-hero-foreground">
        {chapter.title}
      </h1>
      <p className="mt-5 max-w-3xl text-xl leading-relaxed text-hero-muted">
        {lead}
      </p>

      <ol className="mt-10 flex flex-wrap gap-3">
        {items.map((it) => (
          <li
            key={it.no}
            className="flex items-center gap-2.5 rounded-xl bg-card px-4 py-3 text-base font-semibold ring-1 ring-brand-line"
          >
            <span
              className={
                "flex size-7 items-center justify-center rounded-full text-sm font-bold " +
                (it.done
                  ? "bg-primary text-primary-foreground"
                  : "bg-brand-muted text-brand-muted-foreground")
              }
            >
              {it.done ? <Check aria-hidden className="size-4" /> : it.no}
            </span>
            {it.short}
          </li>
        ))}
      </ol>

      <div className="mt-12 flex gap-3">
        <button
          type="button"
          onClick={onPrev}
          className="inline-flex h-12 items-center gap-1.5 rounded-md border border-brand-line bg-card px-5 text-base font-medium hover:bg-accent"
        >
          <ArrowLeft aria-hidden className="size-4" />
          이전
        </button>
        <button
          type="button"
          onClick={onStart}
          className="inline-flex h-12 items-center gap-2 rounded-md bg-cta px-7 text-base font-semibold text-cta-foreground hover:opacity-90"
        >
          {number}장 시작하기
          <ArrowRight aria-hidden className="size-5" />
        </button>
      </div>
    </div>
  )
}

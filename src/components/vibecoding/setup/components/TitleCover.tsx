import { ArrowRight, ListChecks, Monitor } from "lucide-react"
import type { Chapter } from "../steps"

interface Props {
  /** 장마다 이름과 단계 수 */
  chapters: { chapter: Chapter; count: number }[]
  onStart: () => void
}

/** 맨 앞 표지 슬라이드 */
export function TitleCover({ chapters, onStart }: Props) {
  const total = chapters.reduce((n, c) => n + c.count, 0)

  return (
    <div className="flex h-full flex-col bg-hero lg:flex-row">
      <div className="flex flex-1 flex-col justify-center px-6 py-10 lg:pl-24 lg:pr-12">
        <h1 className="text-5xl font-bold leading-tight tracking-tight text-hero-foreground lg:text-7xl">
          바이브코딩
          <br />
          시작 준비
        </h1>
        <p className="mt-6 text-2xl font-semibold text-hero-accent lg:text-3xl">
          최소한의 환경 세팅을 함께 해 봐요
        </p>

        <ul className="mt-8 flex flex-wrap gap-2.5 text-sm font-semibold text-brand-muted-foreground">
          <li className="inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2 shadow-sm">
            <Monitor aria-hidden className="size-4 text-primary" />
            Windows 기준
          </li>
          <li className="inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2 shadow-sm">
            <ListChecks aria-hidden className="size-4 text-primary" />
            3장 {total}단계
          </li>
        </ul>

        <div className="mt-10">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex h-14 items-center gap-2 rounded-2xl bg-cta px-8 text-lg font-semibold text-cta-foreground shadow-sm transition-all duration-200 hover:shadow-md active:scale-95 motion-safe:hover:-translate-y-0.5"
          >
            시작하기
            <ArrowRight aria-hidden className="size-5" />
          </button>
        </div>
      </div>

      {/* 오른쪽: 세 장을 길처럼 이어서 보여 줘요 */}
      <ol className="flex flex-col justify-center gap-5 px-6 pb-10 lg:w-[460px] lg:shrink-0 lg:pb-0 lg:pr-24 lg:pl-0">
        {chapters.map(({ chapter, count }, i) => (
          <li
            key={chapter.id}
            className="relative flex items-center gap-4 rounded-2xl bg-card p-5 shadow-sm"
          >
            {i < chapters.length - 1 && (
              <span
                aria-hidden
                className="absolute left-[2.625rem] top-full h-5 w-0.5 -translate-x-1/2 bg-brand-line"
              />
            )}
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-hero-accent">
                {i + 1}장 {chapter.short} · {count}단계
              </span>
              <span className="mt-0.5 block text-base font-bold leading-snug">
                {chapter.title}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

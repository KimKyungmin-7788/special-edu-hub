import {
  ArrowLeft,
  ArrowRight,
  HeartHandshake,
  Laptop,
  Lightbulb,
  type LucideIcon,
} from "lucide-react"
import { WHY, WHY_COVER, WHY_TITLE } from "../steps"

/** 슬라이드 순서대로 쓰는 아이콘(목차와 같아요) */
const ICONS: LucideIcon[] = [Lightbulb, Laptop, HeartHandshake]

interface Props {
  /** 없으면 이전 버튼을 숨겨요(허브에서 첫 화면일 때) */
  onPrev?: () => void
  onStart: () => void
}

/** 왜 바이브코딩인가? 표지 슬라이드 */
export function WhyCover({ onPrev, onStart }: Props) {
  return (
    <div className="flex h-full flex-col justify-center bg-hero px-6 py-10 lg:px-24">
      <p className="text-lg font-semibold text-hero-accent">
        {WHY_COVER.eyebrow}
      </p>
      <h1 className="mt-2 text-5xl font-bold leading-tight tracking-tight text-hero-foreground lg:text-6xl">
        {WHY_TITLE}
      </h1>
      <p className="mt-5 max-w-3xl text-xl leading-relaxed text-hero-muted">
        {WHY_COVER.lead}
      </p>

      <ol className="mt-10 flex flex-wrap gap-3">
        {WHY.map((w, i) => {
          const Icon = ICONS[i] ?? Lightbulb
          return (
            <li
              key={w.id}
              className="flex items-center gap-2.5 rounded-xl bg-card px-4 py-3 text-base font-semibold shadow-sm"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Icon aria-hidden className="size-4" />
              </span>
              {w.short}
            </li>
          )
        })}
      </ol>

      <div className="mt-12 flex gap-3">
        {onPrev && (
          <button
            type="button"
            onClick={onPrev}
            className="inline-flex h-12 items-center gap-1.5 rounded-2xl bg-card px-5 text-base font-medium shadow-sm transition-all duration-200 hover:shadow-md active:scale-95"
          >
            <ArrowLeft aria-hidden className="size-4" />
            이전
          </button>
        )}
        <button
          type="button"
          onClick={onStart}
          className="inline-flex h-12 items-center gap-2 rounded-2xl bg-cta px-7 text-base font-semibold text-cta-foreground shadow-sm transition-all duration-200 hover:shadow-md active:scale-95 motion-safe:hover:-translate-y-0.5"
        >
          시작하기
          <ArrowRight aria-hidden className="size-5" />
        </button>
      </div>
    </div>
  )
}

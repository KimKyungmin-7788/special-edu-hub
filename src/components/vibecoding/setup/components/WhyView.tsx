import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CloudUpload,
  FolderOpen,
  HeartHandshake,
  History,
  Lightbulb,
  MessageSquare,
  Share2,
  ShieldCheck,
  Target,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import { WHY_TITLE, type WhyPoint, type WhySlide } from "../steps"

const ICONS: Record<WhyPoint["icon"], LucideIcon> = {
  fix: Wrench,
  idea: Lightbulb,
  folder: FolderOpen,
  history: History,
  cloud: CloudUpload,
  robot: Bot,
  heart: HeartHandshake,
  target: Target,
  share: Share2,
  shield: ShieldCheck,
  chat: MessageSquare,
}

interface Props {
  slide: WhySlide
  /** 몇 번째 슬라이드인지 (1부터) / 전체 */
  number: number
  total: number
  nextLabel: string
  /** 없으면 이전 버튼을 숨겨요(첫 장) */
  onPrev?: () => void
  onNext: () => void
}

/** 들어가며: 왜 바이브코딩인가? 슬라이드 한 장 */
export function WhyView({
  slide,
  number,
  total,
  nextLabel,
  onPrev,
  onNext,
}: Props) {
  return (
    <div className="flex h-full flex-col justify-center bg-hero px-6 py-8 lg:px-20 lg:py-10">
      <p className="text-base font-semibold text-hero-accent">
        {WHY_TITLE}{" "}
        <span className="text-hero-muted">
          {number} / {total}
        </span>
      </p>
      <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-hero-foreground lg:text-[2.75rem]">
        {slide.title}
      </h1>
      <p className="mt-3 text-lg leading-relaxed text-hero-muted lg:text-xl">
        {slide.lead}
      </p>

      <div className="mt-8">
        {slide.kind === "reasons" && <Reasons slide={slide} />}
        {slide.kind === "compare" && <Compare slide={slide} />}
        {slide.kind === "teacher" && <Teacher slide={slide} />}
      </div>

      <div className="mt-8 flex gap-3">
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
          onClick={onNext}
          className="inline-flex h-12 items-center gap-2 rounded-2xl bg-cta px-7 text-base font-semibold text-cta-foreground shadow-sm transition-all duration-200 hover:shadow-md active:scale-95 motion-safe:hover:-translate-y-0.5"
        >
          {nextLabel}
          <ArrowRight aria-hidden className="size-5" />
        </button>
      </div>
    </div>
  )
}

function PointIcon({
  icon,
  tone = "primary",
  size = "md",
}: {
  icon: WhyPoint["icon"]
  tone?: "primary" | "muted"
  size?: "md" | "lg"
}) {
  const Icon = ICONS[icon]
  return (
    <span
      className={
        "flex shrink-0 items-center justify-center rounded-xl " +
        (size === "lg" ? "size-14 [&>svg]:size-7 " : "size-11 ") +
        (tone === "primary"
          ? "bg-primary text-primary-foreground"
          : "bg-accent text-muted-foreground")
      }
    >
      <Icon aria-hidden className="size-5" />
    </span>
  )
}

function Reasons({ slide }: { slide: Extract<WhySlide, { kind: "reasons" }> }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {slide.points.map((p) => (
          <div
            key={p.title}
            className="flex gap-5 rounded-2xl bg-card p-7 shadow-sm"
          >
            <PointIcon icon={p.icon} size="lg" />
            <div>
              <p className="text-2xl font-bold">{p.title}</p>
              {p.desc && (
                <p className="mt-2 text-lg leading-relaxed text-muted-foreground">
                  {p.desc}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-brand-muted px-7 py-6">
        <p className="text-base font-semibold text-hero-accent">
          {slide.define.term}란?
        </p>
        <p className="mt-1 text-2xl font-bold text-brand-muted-foreground">
          {slide.define.text}
        </p>
        <p className="mt-2 text-base text-hero-muted">{slide.define.origin}</p>
      </div>
    </div>
  )
}

function Compare({ slide }: { slide: Extract<WhySlide, { kind: "compare" }> }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <section className="rounded-2xl bg-card/70 p-6">
          <p className="text-lg font-bold text-muted-foreground">
            {slide.before.label}
          </p>
          <p className="text-sm text-muted-foreground">{slide.before.tools}</p>
          <ul className="mt-4 space-y-3">
            {slide.before.points.map((p) => (
              <li key={p.title} className="flex items-center gap-3">
                <PointIcon icon={p.icon} tone="muted" />
                <span className="text-lg text-foreground/80">{p.title}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl bg-card p-6 shadow-md ring-2 ring-primary">
          <p className="text-lg font-bold text-primary">{slide.after.label}</p>
          <p className="text-sm text-muted-foreground">{slide.after.tools}</p>
          <ul className="mt-4 space-y-3">
            {slide.after.points.map((p) => (
              <li key={p.title} className="flex items-center gap-3">
                <PointIcon icon={p.icon} />
                <span>
                  <span className="block text-lg font-bold">{p.title}</span>
                  {p.desc && (
                    <span className="block text-base text-muted-foreground">
                      {p.desc}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <p className="text-center text-xl font-bold text-hero-foreground">
        {slide.closing}
      </p>
    </div>
  )
}

function Teacher({ slide }: { slide: Extract<WhySlide, { kind: "teacher" }> }) {
  return (
    <div className="flex flex-col gap-6">
      <ul className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {slide.points.map((p) => (
          <li
            key={p.title}
            className="flex items-center gap-5 rounded-2xl bg-card p-6 shadow-sm"
          >
            <PointIcon icon={p.icon} size="lg" />
            <span className="text-lg font-semibold leading-relaxed">
              {p.title}
            </span>
          </li>
        ))}
      </ul>
      <div className="rounded-2xl bg-primary px-7 py-6 text-primary-foreground">
        <p className="text-base font-semibold opacity-80">
          {slide.closing.label}
        </p>
        <p className="mt-1 text-2xl font-bold leading-snug">
          {slide.closing.text}
        </p>
      </div>
    </div>
  )
}

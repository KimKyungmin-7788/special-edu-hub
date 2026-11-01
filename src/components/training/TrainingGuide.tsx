import { Link } from "react-router-dom"
import {
  ArrowRight,
  Clock,
  Gift,
  Info,
  MessagesSquare,
  Presentation,
  Radio,
  ShieldCheck,
  Split,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react"
import {
  firstActivePage,
  training,
  trainingPath,
  trainingSteps,
  type GuideIcon,
  type TrainingCourse,
  type TrainingStep,
} from "@/config/training"
import { cn } from "@/lib/utils"

const ICONS: Record<GuideIcon, LucideIcon> = {
  gift: Gift,
  clock: Clock,
  shield: ShieldCheck,
  slides: Presentation,
  video: Video,
  live: Radio,
  people: Users,
}

/**
 * 열린연수방이란?(/training, 누구나) — 글보다 그림이 먼저 읽히는 웹페이지.
 * 글자 위계: 큰 제목 → 구역 제목(연수 단계·앞으로) → 칸 제목 → 작은 설명.
 * 연수 단계는 모두 같은 크기 칸으로 1→2→3→… 이어지고(넓은 화면 가로, 좁은 화면 세로),
 * 열림·준비중은 동그라미 채움(●/○)으로만 가른다. 문구와 연수 목록은 config/training.ts 에서.
 */
export function TrainingGuide() {
  const { guide, courses } = training
  const firstCourse = courses.find((c) => firstActivePage(c))
  const firstPage = firstCourse && firstActivePage(firstCourse)
  return (
    <div className="max-w-5xl rounded-xl border bg-card p-4 shadow-sm sm:p-6 lg:p-8">
      <header className="rounded-2xl bg-hero px-6 py-7 sm:px-8 sm:py-8">
        <p className="text-sm font-semibold text-hero-accent">{training.guideLabel}</p>
        <h1 className="mt-2 text-2xl leading-tight font-bold tracking-tight text-hero-foreground break-keep sm:text-3xl">
          {guide.heading}
        </h1>
        <p className="mt-3 text-base text-hero-muted break-keep">{guide.lead}</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          {firstCourse && firstPage && (
            <Link
              to={trainingPath(firstCourse.slug, firstPage.slug)}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-cta px-5 text-sm font-semibold text-cta-foreground shadow-sm transition-all duration-200 hover:shadow-md active:scale-95 motion-safe:hover:-translate-y-0.5"
            >
              {guide.ctaLabel}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          )}
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-brand-muted-foreground">
            {guide.facts.map((fact) => {
              const Icon = ICONS[fact.icon]
              return (
                <li key={fact.label} className="inline-flex items-center gap-1.5">
                  <Icon aria-hidden className="size-4" />
                  {fact.label}
                </li>
              )
            })}
          </ul>
        </div>
      </header>

      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-lg font-bold">{guide.coursesHeading}</h2>
          <p className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-full bg-primary" />
              열림
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-full border-2 border-primary" />
              준비중
            </span>
          </p>
        </div>
        <ol className="mt-5 grid gap-3 sm:grid-flow-col sm:auto-cols-fr">
          {trainingSteps.map((step, i) => (
            <Step key={step.n} step={step} last={i === trainingSteps.length - 1} />
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-bold">{guide.future.heading}</h2>
        <ol className="mt-5 grid grid-flow-col auto-cols-fr gap-2 text-center">
          {guide.future.stages.map((stage, i) => {
            const Icon = ICONS[stage.icon]
            return (
              <li key={stage.label} className="relative">
                {i < guide.future.stages.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute top-[1.375rem] left-1/2 w-[calc(100%+0.5rem)] border-t-2 border-dashed border-brand-line"
                  />
                )}
                <span
                  aria-hidden
                  className={cn(
                    "relative mx-auto flex size-11 items-center justify-center rounded-full",
                    stage.now
                      ? "bg-brand-muted text-brand-muted-foreground"
                      : "border-2 border-dashed border-brand-line bg-card text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <p className={cn("mt-2 text-[13px] break-keep", stage.now ? "font-semibold" : "text-muted-foreground")}>
                  {stage.label}
                </p>
                {stage.now && (
                  <span className="mt-1 inline-block rounded-full bg-brand-muted px-2 text-[11px] leading-5 font-medium text-brand-muted-foreground">
                    지금
                  </span>
                )}
              </li>
            )
          })}
        </ol>
        <p className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MessagesSquare aria-hidden className="size-3.5" />
            {guide.future.note}
          </span>
          <Link
            to={guide.future.link.to}
            className="inline-flex items-center gap-0.5 font-medium text-primary underline-offset-4 hover:underline"
          >
            {guide.future.link.label}
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </p>
      </section>

      <p className="mt-10 flex items-center gap-1.5 border-t pt-4 text-xs text-muted-foreground">
        <Info aria-hidden className="size-3.5 shrink-0" />
        {guide.footnote}
      </p>
    </div>
  )
}

/**
 * 단계 한 칸 — 동그라미가 다음 단계와 선으로 이어진다(넓은 화면 가로선, 좁은 화면 세로선).
 * 갈래가 있는 단계(4A·4B)는 한 동그라미 아래 연수 칸이 위아래로 놓인다. 연수가 하나라도 열렸으면 ●.
 */
function Step({ step, last }: { step: TrainingStep; last: boolean }) {
  const open = step.courses.some(({ course }) => firstActivePage(course))
  const branched = step.courses.length > 1
  return (
    <li className="relative flex gap-3 sm:flex-col">
      {!last && (
        <>
          <span aria-hidden className="absolute top-9 -bottom-3 left-[calc(1.125rem-1px)] w-0.5 bg-brand-line sm:hidden" />
          <span aria-hidden className="absolute top-[calc(1.125rem-1px)] left-1/2 hidden h-0.5 w-[calc(100%+0.75rem)] bg-brand-line sm:block" />
        </>
      )}
      <span
        aria-hidden
        className={cn(
          "relative flex size-9 shrink-0 items-center justify-center rounded-full text-[15px] font-bold sm:mx-auto",
          open ? "bg-primary text-primary-foreground" : "border-2 border-primary bg-card text-primary",
        )}
      >
        {step.n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {branched && (
          <p className="flex items-center gap-1 pt-2 text-xs text-muted-foreground sm:justify-center sm:pt-0">
            <Split aria-hidden className="size-3.5" />
            갈래를 골라요
          </p>
        )}
        {step.courses.map(({ course, label }) => (
          <CourseCard key={course.slug} course={course} label={label} tag={branched} />
        ))}
      </div>
    </li>
  )
}

/** 연수 칸 — 모두 같은 회색 칸. 열린 연수는 쪽 바로가기, 준비 중인 연수는 '준비중' 표시만. 갈래 연수는 4A처럼 번호표를 붙인다 */
function CourseCard({ course, label, tag }: { course: TrainingCourse; label: string; tag: boolean }) {
  const open = !!firstActivePage(course)
  return (
    <div className="min-w-0 flex-1 rounded-2xl bg-muted p-4">
      {tag && <p aria-hidden className="mb-1 text-xs font-bold text-primary">{label}</p>}
      <h3 className="text-[15px] leading-snug font-semibold break-keep">
        <span className="sr-only">연수 {label}. </span>
        {course.title}
      </h3>
      {open ? (
        <ul className="mt-3 space-y-1 text-[13px]">
          {course.pages.map((page) => (
            <li key={page.slug}>
              {page.status === "active" ? (
                <Link
                  to={trainingPath(course.slug, page.slug)}
                  className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                >
                  {page.label}
                  <ArrowRight aria-hidden className="size-3.5" />
                </Link>
              ) : (
                <span className="text-muted-foreground">{page.label} · 준비중</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <span className="mt-3 inline-block rounded-full bg-card px-2.5 text-xs leading-6 text-muted-foreground">
          준비중
        </span>
      )}
    </div>
  )
}

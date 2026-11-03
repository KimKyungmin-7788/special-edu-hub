import type { CSSProperties } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight,
  Clock,
  CreditCard,
  Gift,
  Info,
  MessagesSquare,
  Monitor,
  Presentation,
  Radio,
  ShieldCheck,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react"
import {
  firstActivePage,
  soonLabel,
  training,
  trainingPath,
  type GuideIcon,
  type TrainingCourse,
  type TrainingPage,
} from "@/config/training"
import { cn } from "@/lib/utils"

const ICONS: Record<GuideIcon, LucideIcon> = {
  gift: Gift,
  clock: Clock,
  shield: ShieldCheck,
  monitor: Monitor,
  card: CreditCard,
  slides: Presentation,
  video: Video,
  live: Radio,
  people: Users,
}

/**
 * 열린연수방이란?(/training, 누구나) — 글보다 그림이 먼저 읽히는 웹페이지(사용자 시안 기준).
 * 글자 위계: 큰 제목 → 구역 제목(연수 단계·앞으로의 비전) → 칸 제목 → 바로가기·작은 설명.
 * 연수 단계는 위에서 아래로 영역 칸(1·2·3)을 ↓ 로 잇고, 칸 안에 세부 연수를 보여 준다.
 * 갈래가 있는 영역(현장 활용)은 번호 동그라미에서 내려온 선이 칸 안에서 A·B·C 칸으로 갈라진다.
 * 스터디 활동은 연수 흐름 밖이라 화살표로 잇지 않고 아래에 점선 칸으로 따로 둔다.
 * 열린 칸은 연두 바탕+초록 테두리, 공개예정 칸은 회색 바탕. 문구와 연수 목록은 config/training.ts 에서.
 */
export function TrainingGuide() {
  const { guide, courses } = training
  const firstCourse = courses.find((c) => firstActivePage(c))
  const firstPage = firstCourse && firstActivePage(firstCourse)
  return (
    <div className="max-w-5xl rounded-xl border bg-card p-4 shadow-sm sm:p-6 lg:p-7">
      <header className="flex flex-col gap-5 rounded-2xl bg-hero px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-8">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-hero-accent">{training.guideLabel}</p>
          <h1 className="mt-1 text-2xl leading-tight font-bold tracking-tight text-balance text-hero-foreground break-keep sm:text-3xl">
            {guide.heading}
          </h1>
          <p className="mt-2 text-base text-hero-muted break-keep">{guide.lead}</p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-brand-muted-foreground">
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
        {firstCourse && firstPage && (
          <Link
            to={trainingPath(firstCourse.slug, firstPage.slug)}
            className="inline-flex h-11 shrink-0 items-center gap-2 self-start rounded-2xl bg-cta px-6 text-base font-bold text-cta-foreground shadow-sm transition-all duration-200 hover:shadow-md active:scale-95 motion-safe:hover:-translate-y-0.5 sm:self-center"
          >
            {guide.ctaLabel}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        )}
      </header>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 className="text-xl font-bold tracking-tight">{guide.coursesHeading}</h2>
          <p className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-full bg-primary" />
              열림
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-full border-2 border-primary" />
              {training.soon.label}
            </span>
          </p>
        </div>
        <ol className="mx-auto mt-5 max-w-3xl">
          {courses.map((course, i) => (
            <li key={course.slug}>
              {i > 0 && <DownArrow />}
              <CourseCard course={course} label={String(i + 1)} />
            </li>
          ))}
        </ol>
        {/* 연수 흐름 밖의 활동 — 화살표로 잇지 않고 점선 칸으로 따로 */}
        <div className="mx-auto mt-6 flex max-w-3xl items-center gap-3.5 rounded-2xl border-2 border-dashed px-4 py-3.5 sm:px-5">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-brand-line text-muted-foreground"
          >
            <Users className="size-5" />
          </span>
          <h3 className="flex-1 text-base leading-snug font-bold break-keep sm:text-[17px]">{training.study.title}</h3>
          <span className="rounded-full bg-muted px-2.5 text-xs leading-6 text-muted-foreground">{training.soon.label}</span>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold tracking-tight">{guide.future.heading}</h2>
        <ol className="mt-5 grid grid-flow-col auto-cols-fr gap-2 text-center">
          {guide.future.stages.map((stage, i) => {
            const Icon = ICONS[stage.icon]
            return (
              <li key={stage.label} className="relative">
                {i < guide.future.stages.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute top-[calc(1.5rem-1px)] left-1/2 w-[calc(100%+0.5rem)] border-t-2 border-dashed border-brand-line"
                  />
                )}
                <span
                  aria-hidden
                  className={cn(
                    "relative mx-auto flex size-12 items-center justify-center rounded-full",
                    stage.now
                      ? "bg-brand-muted text-brand-muted-foreground"
                      : "border-2 border-dashed border-brand-line bg-card text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <p className={cn("mt-2 text-sm break-keep", stage.now ? "font-bold" : "text-muted-foreground")}>
                  {stage.label}
                </p>
                {stage.now && (
                  <span className="mt-1 inline-block rounded-full bg-brand-muted px-2 text-[11px] leading-5 font-semibold text-brand-muted-foreground">
                    지금
                  </span>
                )}
              </li>
            )
          })}
        </ol>
        <p className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MessagesSquare aria-hidden className="size-4" />
            {guide.future.note}
          </span>
          <Link
            to={guide.future.link.to}
            className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
          >
            {guide.future.link.label}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </p>
      </section>

      <p className="mt-8 flex items-center gap-1.5 border-t pt-4 text-xs text-muted-foreground">
        <Info aria-hidden className="size-3.5 shrink-0" />
        {guide.footnote}
      </p>
    </div>
  )
}

/**
 * 갈래 세부 연수 — 영역 번호 동그라미에서 내려온 선이 오른쪽으로 꺾여, 나란히 놓인 A·B·C 칸마다 ↓ 로 이어진다
 * (사이드바에서 번호 동그라미 아래로 세부 연수가 이어지는 것과 같은 모양).
 * 선은 SVG 한 장으로 그려 이음새가 어긋나지 않게 한다. 칸 사이 간격은 칸 안 여백(px-2)으로 띄워 칸 가운데가 정확히 (2i+1)/2n.
 * 좁은 화면은 나란히 두기엔 칸이 너무 좁아, 선 없이 한 줄씩 쌓는다.
 * 칸 안: 좁은 화면은 [글자][이름][공개예정] 한 줄, 넓은 화면은 [글자 … 공개예정] 아래 이름(이름이 칸 너비를 다 쓰게).
 */
function BranchPages({ course, pages }: { course: TrainingCourse; pages: TrainingPage[] }) {
  const n = pages.length
  const center = (i: number) => `${((2 * i + 1) / (2 * n)) * 100}%`
  // 번호 동그라미(size-10) 가운데 = 20px, 바깥으로 넓힌 8px(-mx-2)을 더한다
  const trunk = 28
  return (
    <div className="mt-3 sm:-mx-2 sm:mt-0">
      <svg
        aria-hidden
        className="hidden h-7 w-full overflow-visible text-primary sm:block"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <g shapeRendering="crispEdges">
          <line x1={trunk} y1={0} x2={trunk} y2={12} />
          <line x1={trunk} y1={12} x2={center(n - 1)} y2={12} strokeLinecap="square" />
        </g>
        {pages.map((page, i) => (
          <svg key={page.slug} x={center(i)} overflow="visible">
            <line x1={0} y1={12} x2={0} y2={24} shapeRendering="crispEdges" />
            <path d="M-4 20L0 24L4 20" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ))}
      </svg>
      <ul
        className="grid gap-2 sm:grid-cols-[repeat(var(--cols),minmax(0,1fr))] sm:gap-0"
        style={{ "--cols": n } as CSSProperties}
      >
        {pages.map((page) => {
          const active = page.status === "active"
          const body = (
            <>
              <span
                aria-hidden
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  active ? "bg-primary text-primary-foreground" : "border-2 border-primary bg-card text-primary",
                )}
              >
                {page.branch}
              </span>
              <span className="min-w-0 flex-1 text-sm leading-snug font-semibold break-keep sm:order-last sm:basis-full sm:text-base">
                <span className="sr-only">갈래 {page.branch}. </span>
                {page.label}
              </span>
              {active ? (
                <ArrowRight aria-hidden className="size-4 shrink-0 text-primary" />
              ) : (
                <span className="shrink-0 rounded-full bg-muted px-2.5 text-xs leading-6 text-muted-foreground">
                  {soonLabel(page.release)}
                </span>
              )}
            </>
          )
          const box =
            "flex h-full items-center gap-3 rounded-xl border bg-card px-3 py-2.5 sm:flex-wrap sm:content-start sm:justify-between sm:gap-2"
          return (
            <li key={page.slug} className="flex flex-col sm:px-2">
              {active ? (
                <Link to={trainingPath(course.slug, page.slug)} className={cn(box, "border-brand-line hover:shadow-sm")}>
                  {body}
                </Link>
              ) : (
                <div className={box}>{body}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** 영역 칸 사이 ↓ 화살표 — 위아래 칸과 똑같이 띄우고, 갈래 선과 같은 굵기·화살촉 */
function DownArrow() {
  return (
    <svg
      aria-hidden
      width="16"
      height="28"
      viewBox="-8 0 16 28"
      className="mx-auto block text-primary"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M0 4V24M-4 20L0 24L4 20" />
    </svg>
  )
}

/**
 * 영역 칸 — 모두 같은 모양, 내용만큼만. 왼쪽 동그라미(번호) + 영역 이름, 그 아래 세부 연수.
 * 세부 연수는 열린 것은 바로가기, 공개예정인 것은 '· (예정일) 공개예정'을 붙여 한 줄로. 갈래 세부 연수는 칸 안에서 A·B·C로 갈라진다.
 * 열린 영역은 연두 바탕+초록 테두리, 열린 세부 연수가 없는 영역은 회색 바탕.
 */
function CourseCard({ course, label }: { course: TrainingCourse; label: string }) {
  const open = !!firstActivePage(course)
  const branches = course.pages.filter((p) => p.branch)
  const pages = course.pages.filter((p) => !p.branch)
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3.5 sm:px-5",
        open ? "border-brand-line bg-brand-soft" : "border-border bg-muted",
      )}
    >
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full text-base font-bold",
            open ? "bg-primary text-primary-foreground" : "border-2 border-primary bg-card text-primary",
          )}
        >
          {label}
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1.5">
          <h3 className="text-base leading-snug font-bold break-keep sm:text-[17px]">
            <span className="sr-only">{label}. </span>
            {course.title}
            {branches.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">· {branches.length}갈래</span>
            )}
          </h3>
          {pages.length > 0 && (
            <ul className="flex w-full flex-wrap gap-x-4 gap-y-1 text-sm">
              {pages.map((page) => (
                <li key={page.slug}>
                  {page.status === "active" ? (
                    <Link
                      to={trainingPath(course.slug, page.slug)}
                      className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      {page.label}
                      <ArrowRight aria-hidden className="size-3.5" />
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">
                      {page.label} · {soonLabel(page.release)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {branches.length > 0 && <BranchPages course={course} pages={branches} />}
    </div>
  )
}

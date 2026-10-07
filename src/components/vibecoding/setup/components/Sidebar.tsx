import {
  BookMarked,
  BookOpen,
  Check,
  Flag,
  HeartHandshake,
  Laptop,
  Lightbulb,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react"

/** 들어가며 슬라이드 아이콘(순서대로) */
const INTRO_ICONS: LucideIcon[] = [Lightbulb, Laptop, HeartHandshake]
import type { Chapter } from "../steps"

export interface TocStep {
  no: number
  short: string
  pageIndex: number
  done: boolean
}

interface Props {
  chapters: {
    chapter: Chapter
    number: number
    pageIndex: number
    steps: TocStep[]
  }[]
  current: number
  /** 도구를 고르기 전이면 장·단계를 흐리게 보여요. 누르면 도구를 먼저 고르게 해요. */
  locked: boolean
  toolName: string | null
  doneCount: number
  total: number
  onGo: (pageIndex: number) => void
  /** 들어가며(왜 바이브코딩인가?) 슬라이드들 */
  /** 없으면(허브처럼 따로 페이지가 있을 때) 목차에서 빼요 */
  intro?: { title: string; items: { label: string; pageIndex: number }[] }
  /** 도구 고르는 시작 화면의 위치 */
  landingIndex: number
  /** 접힌 목차: 글자는 빼고 장 번호와 단계 번호만 보여요 */
  collapsed: boolean
  onToggle: () => void
}

/** 전자책 목차처럼 보이는 왼쪽 사이드바. 접으면 번호만 남는 좁은 띠가 돼요. */
export function Sidebar({
  chapters,
  intro,
  landingIndex,
  current,
  locked,
  toolName,
  doneCount,
  total,
  onGo,
  collapsed,
  onToggle,
}: Props) {
  const item = (active: boolean) =>
    "group flex w-full items-center rounded-xl text-left text-[15px] transition-colors " +
    (collapsed ? "justify-center py-0.5 " : "gap-3 px-3 py-2 ") +
    (active
      ? "bg-brand-muted font-bold text-brand-muted-foreground"
      : "text-foreground/85 hover:bg-accent")

  /** 번호(또는 아이콘)를 담는 동그라미 */
  const badge = (active: boolean, done = false) =>
    "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold " +
    (done
      ? "border-primary bg-primary text-primary-foreground"
      : active
        ? "border-2 border-primary bg-background text-primary"
        : "border-border bg-background text-muted-foreground")

  /** 접혔을 때는 글자를 화면에서 숨기고, 화면 읽기 프로그램과 마우스 풍선 도움말로만 알려요 */
  const label = (text: string) =>
    collapsed ? <span className="sr-only">{text}</span> : text

  /** 번호 없이 아이콘으로 표시하는 항목(표지·들어가며·시작) */
  const pageItem = (index: number, text: string, Icon: LucideIcon) => (
    <button
      type="button"
      onClick={() => onGo(index)}
      aria-current={current === index ? "page" : undefined}
      title={collapsed ? text : undefined}
      className={item(current === index)}
    >
      <span className={badge(current === index)}>
        <Icon aria-hidden className="size-3.5" />
      </span>
      {label(text)}
    </button>
  )

  const toggle = (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? "목차 열기" : "목차 닫기"}
      title={collapsed ? "목차 열기" : "목차 닫기"}
      className={
        "rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" +
        (collapsed ? "" : " -mr-1.5")
      }
    >
      {collapsed ? (
        <PanelLeftOpen aria-hidden className="size-4" />
      ) : (
        <PanelLeftClose aria-hidden className="size-4" />
      )}
    </button>
  )

  const progress = (
    <div
      role="progressbar"
      aria-label="진행도"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={doneCount}
      className={
        "h-2 overflow-hidden rounded-full bg-brand-muted " +
        (collapsed ? "mt-2 w-8" : "mt-3")
      }
    >
      <div
        className="h-full rounded-full bg-primary transition-all duration-500"
        style={{ width: `${(doneCount / total) * 100}%` }}
      />
    </div>
  )

  return (
    <aside
      className={
        "flex shrink-0 flex-col border-r bg-background transition-[width] duration-200 " +
        (collapsed ? "w-14" : "w-64")
      }
    >
      {collapsed ? (
        <div className="flex flex-col items-center border-b pb-3 pt-3">
          {toggle}
          {progress}
          <p className="mt-1 text-[11px] font-semibold tabular-nums text-muted-foreground">
            {doneCount}/{total}
          </p>
        </div>
      ) : (
        <div className="border-b px-4 pb-4 pt-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <BookOpen aria-hidden className="size-4" />
              목차
            </p>
            <span className="flex items-center gap-1">
              {toolName && (
                <span className="shrink-0 rounded-full bg-brand-muted px-2 py-0.5 text-xs font-semibold text-brand-muted-foreground">
                  {toolName}
                </span>
              )}
              {toggle}
            </span>
          </div>
          {progress}
          <p className="mt-2 text-sm text-muted-foreground">
            완료한 단계{" "}
            <strong className="font-bold text-foreground">{doneCount}개</strong>{" "}
            / 전체 {total}개
          </p>
        </div>
      )}

      <nav
        aria-label="목차"
        className={
          "min-h-0 flex-1 overflow-y-auto py-3 " +
          (collapsed ? "px-1.5" : "px-2")
        }
      >
        {/* 표지 → 들어가며 → 시작: 도구를 고르기 전에도 볼 수 있어요 */}
        {pageItem(0, "표지", BookMarked)}
        {intro && (
          <div className={collapsed ? "mt-2" : "mt-4"}>
            <p
              title={collapsed ? intro.title : undefined}
              className={
                "text-sm font-bold text-foreground/70 " +
                (collapsed ? "py-1 text-center text-xs" : "px-3 py-1.5")
              }
            >
              {collapsed ? (
                <>
                  <span aria-hidden>왜?</span>
                  <span className="sr-only">{intro.title}</span>
                </>
              ) : (
                intro.title
              )}
            </p>
            <ol className={collapsed ? "mt-0.5" : "mt-1 space-y-0.5"}>
              {intro.items.map((it, i) => (
                <li key={it.pageIndex}>
                  {pageItem(
                    it.pageIndex,
                    it.label,
                    INTRO_ICONS[i] ?? Lightbulb,
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
        <div className={intro ? (collapsed ? "mt-2" : "mt-4") : ""}>
          {pageItem(landingIndex, "시작", Flag)}
        </div>

        {chapters.map(({ chapter, number, pageIndex, steps }) => (
          <div
            key={chapter.id}
            className={
              (collapsed ? "mt-2" : "mt-4") + (locked ? " opacity-55" : "")
            }
          >
            <button
              type="button"
              onClick={() => onGo(pageIndex)}
              aria-current={current === pageIndex ? "page" : undefined}
              title={collapsed ? `${number}장. ${chapter.short}` : undefined}
              className={
                "w-full rounded-xl text-sm font-bold transition-colors " +
                (collapsed
                  ? "py-1 text-center text-xs "
                  : "px-3 py-1.5 text-left ") +
                (current === pageIndex
                  ? "bg-brand-muted text-brand-muted-foreground"
                  : "text-foreground/70 hover:bg-accent")
              }
            >
              {number}장
              {collapsed ? (
                <span className="sr-only">. {chapter.short}</span>
              ) : (
                `. ${chapter.short}`
              )}
            </button>
            <ol className={collapsed ? "mt-0.5" : "mt-1 space-y-0.5"}>
              {steps.map((s) => (
                <li key={s.no}>
                  <button
                    type="button"
                    onClick={() => onGo(s.pageIndex)}
                    aria-current={current === s.pageIndex ? "page" : undefined}
                    title={collapsed ? `${s.no}. ${s.short}` : undefined}
                    className={item(current === s.pageIndex)}
                  >
                    <span className={badge(current === s.pageIndex, s.done)}>
                      {s.done ? (
                        <Check aria-hidden className="size-3.5" />
                      ) : (
                        s.no
                      )}
                    </span>
                    {label(s.short)}
                    {s.done && <span className="sr-only">(완료)</span>}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </nav>
    </aside>
  )
}

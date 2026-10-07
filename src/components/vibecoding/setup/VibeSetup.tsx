import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { ArrowLeft, ArrowRight, PanelLeftOpen } from "lucide-react"
import {
  CHAPTERS,
  STEPS,
  TOOL_NAME,
  bodyFor,
  chapterLead,
  logoFor,
  titleFor,
  type Tool,
} from "./steps"
import { useProgress } from "./useProgress"
import { Landing } from "./components/Landing"
import { StepView } from "./components/StepView"
import { ChapterCover } from "./components/ChapterCover"
import { TitleCover } from "./components/TitleCover"
import { ToolPickDialog } from "./components/ToolPickDialog"
import { Sidebar } from "./components/Sidebar"
import { SlideFrame } from "./components/SlideFrame"

/** 슬라이드 순서: 표지 → 시작 → 1장 표지 → 1~4 → 2장 표지 → 5~7 → 3장 표지 → 8 */
type Page =
  | { kind: "title"; id: null; label: string }
  | { kind: "landing"; id: string; label: string }
  | { kind: "cover"; id: string; label: string; chapter: number }
  | { kind: "step"; id: string; label: string; step: number }

const PAGES: Page[] = [
  { kind: "title", id: null, label: "표지" },
  { kind: "landing", id: "choose", label: "시작" },
  ...CHAPTERS.flatMap((c, ci): Page[] => [
    { kind: "cover", id: c.id, label: `${ci + 1}장 ${c.short}`, chapter: ci },
    ...c.steps.map((sid): Page => {
      const step = STEPS.findIndex((s) => s.id === sid)
      return { kind: "step", id: sid, label: STEPS[step].short, step }
    }),
  ]),
]

const LANDING = PAGES.findIndex((p) => p.kind === "landing")

/** 노트북 이상 크기에서만 슬라이드·목차로 보여요. 좁은 화면은 그냥 위아래로 읽어요. */
function useWide() {
  const query = "(min-width: 1024px)"
  const [wide, setWide] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setWide(mq.matches)
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])
  return wide
}

/**
 * 바이브코딩 환경구축(/vibecoding/setup). 원래 vibecoding-setting 단독 앱이던 것을 허브로 옮겼다.
 * 현재 위치는 ?step= 으로만 관리(도구를 고르기 전에는 표지·시작만, 목차를 누르면 도구부터 고르게 함).
 * 허브 헤더 아래 한 칸: [목차] + [16:9 슬라이드]. 넓은 화면에선 화면 높이에 맞춰 스크롤 없이 보이게 한다.
 */
export function VibeSetup() {
  const [params, setParams] = useSearchParams()
  const { tool, checks, toggleCheck, setTool } = useProgress()
  const wide = useWide()
  // 넓은 화면은 목차를 펼쳐 두고, 노트북 화면은 슬라이드를 크게 보이도록 접어 둬요.
  const [tocOpen, setTocOpen] = useState(() => window.innerWidth >= 1440)
  // 도구를 고르기 전에 목차로 가려던 곳. 창에서 도구를 고르면 그리로 가요.
  const [askFor, setAskFor] = useState<number | null>(null)

  const found = PAGES.findIndex((p) => p.id === params.get("step"))
  // 도구를 고르기 전에는 표지와 시작 화면만 볼 수 있어요.
  const page = found < 0 ? 0 : !tool && found > LANDING ? LANDING : found
  const current = PAGES[page]

  const go = (i: number) => {
    const target = PAGES[Math.max(0, Math.min(i, PAGES.length - 1))]
    if (!tool && target.kind !== "title" && target.kind !== "landing") {
      setAskFor(PAGES.indexOf(target))
      return
    }
    setParams(target.id ? { step: target.id } : {})
  }

  const isDone = (i: number) => {
    const b = bodyFor(STEPS[i], tool)
    return !!b && b.checks.length > 0 && b.checks.every((c) => checks[c.id])
  }
  const doneCount = STEPS.filter((_, i) => isDone(i)).length

  const pick = (t: Tool, to?: number) => {
    // 같은 도구로 다시 들어오면 멈췄던 단계부터, 바꾸면 1장 표지부터 해요.
    const resumeStep = t === tool ? STEPS.findIndex((_, i) => !isDone(i)) : -1
    const target =
      to !== undefined
        ? to
        : resumeStep > 0
          ? PAGES.findIndex((p) => p.kind === "step" && p.step === resumeStep)
          : PAGES.findIndex((p) => p.kind === "cover")
    setTool(t)
    setAskFor(null)
    setParams({ step: PAGES[target].id! })
  }

  const dialog = (
    <ToolPickDialog
      open={askFor !== null}
      onPick={(t) => pick(t, askFor ?? undefined)}
      onClose={() => setAskFor(null)}
    />
  )

  // 키보드 ← → 로 넘겨요. 글을 쓰는 중이거나 안내 창이 열려 있으면 넘기지 않아요.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const t = e.target as HTMLElement
      if (t.closest("input, textarea, [contenteditable], dialog[open]")) return
      if (e.key === "ArrowRight") go(page + 1)
      if (e.key === "ArrowLeft") go(page - 1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const content =
    current.kind === "title" ? (
      <TitleCover
        chapters={CHAPTERS.map((c) => ({ chapter: c, count: c.steps.length }))}
        onStart={() => go(LANDING)}
      />
    ) : current.kind === "landing" ? (
      <Landing onPick={pick} />
    ) : current.kind === "cover" ? (
      <ChapterCover
        chapter={CHAPTERS[current.chapter]}
        number={current.chapter + 1}
        lead={chapterLead(CHAPTERS[current.chapter], tool)}
        items={CHAPTERS[current.chapter].steps.map((sid) => {
          const i = STEPS.findIndex((s) => s.id === sid)
          return { no: i + 1, short: STEPS[i].short, done: isDone(i) }
        })}
        onPrev={() => go(page - 1)}
        onStart={() => go(page + 1)}
      />
    ) : (
      <StepView
        step={STEPS[current.step]}
        title={titleFor(STEPS[current.step], tool)}
        logo={logoFor(STEPS[current.step], tool)}
        helpWhere={
          // 앱을 설치하기 전이라 웹 채팅에 물어봐요.
          current.id === "install"
            ? tool === "codex"
              ? "ChatGPT 웹 채팅"
              : "Claude 웹 채팅(claude.ai)"
            : tool
              ? TOOL_NAME[tool]
              : "Claude Code·Codex"
        }
        index={current.step}
        body={bodyFor(STEPS[current.step], tool)}
        checks={checks}
        onToggle={toggleCheck}
        prevLabel={PAGES[page - 1].label}
        nextLabel={page < PAGES.length - 1 ? PAGES[page + 1].label : null}
        onPrev={() => go(page - 1)}
        onNext={() => go(page + 1)}
      />
    )

  if (!wide) {
    return (
      <div className="flex flex-col overflow-hidden rounded-xl border bg-surface shadow-sm">
        <header className="flex h-12 items-center gap-2.5 border-b bg-background px-4">
          <span className="min-w-0 flex-1 truncate text-sm font-bold">
            {current.label}
          </span>
          <span className="text-xs text-muted-foreground">
            {page + 1} / {PAGES.length}
          </span>
        </header>
        <main className="flex-1">{content}</main>
        {dialog}
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100svh-5.5rem)] min-h-[36rem] overflow-hidden rounded-xl border bg-surface shadow-sm">
      {/* 접으면 같은 자리에 여는 버튼만 남겨요. */}
      {!tocOpen && (
        <div className="flex w-12 shrink-0 flex-col items-center border-r bg-background pt-3">
          <button
            type="button"
            onClick={() => setTocOpen(true)}
            aria-label="목차 열기"
            title="목차 열기"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <PanelLeftOpen aria-hidden className="size-4" />
          </button>
        </div>
      )}
      {tocOpen && (
        <Sidebar
          chapters={CHAPTERS.map((c, ci) => ({
            chapter: c,
            number: ci + 1,
            pageIndex: PAGES.findIndex((p) => p.id === c.id),
            steps: c.steps.map((sid) => {
              const i = STEPS.findIndex((s) => s.id === sid)
              return {
                no: i + 1,
                short: STEPS[i].short,
                pageIndex: PAGES.findIndex((p) => p.id === sid),
                done: isDone(i),
              }
            }),
          }))}
          current={page}
          locked={!tool}
          toolName={tool ? TOOL_NAME[tool] : null}
          doneCount={doneCount}
          total={STEPS.length}
          onGo={go}
          onClose={() => setTocOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 p-3">
        <SlideFrame
          footer={
            <footer className="flex h-10 shrink-0 items-center gap-4 border-t bg-background px-5 text-sm text-muted-foreground">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="truncate">
                  바이브코딩 시작 준비 · {current.label}
                </span>
              </div>
              <div className="flex items-center gap-1.5" aria-hidden>
                {PAGES.map((p, i) => (
                  <span
                    key={p.label + i}
                    className={
                      "h-1.5 rounded-full transition-all " +
                      (i === page
                        ? "w-5 bg-primary"
                        : p.kind === "cover" || p.kind === "title"
                          ? "w-1.5 bg-hero-accent/60"
                          : "w-1.5 bg-border")
                    }
                  />
                ))}
              </div>
              <div className="flex flex-1 items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => go(page - 1)}
                  disabled={page === 0}
                  aria-label="이전 슬라이드"
                  className="rounded-md p-1 hover:bg-accent disabled:opacity-40"
                >
                  <ArrowLeft aria-hidden className="size-4" />
                </button>
                <span className="tabular-nums">
                  {page + 1} / {PAGES.length}
                </span>
                <button
                  type="button"
                  onClick={() => go(page + 1)}
                  disabled={page === PAGES.length - 1}
                  aria-label="다음 슬라이드"
                  className="rounded-md p-1 hover:bg-accent disabled:opacity-40"
                >
                  <ArrowRight aria-hidden className="size-4" />
                </button>
              </div>
            </footer>
          }
        >
          {content}
        </SlideFrame>
      </div>
      {dialog}
    </div>
  )
}

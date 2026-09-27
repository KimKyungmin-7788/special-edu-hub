import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { LayoutGrid, List, PenLine } from "lucide-react"
import { subjectCategories } from "@/config/categories"
import { practiceCopy } from "@/config/practice"
import { getPractices, type Practice } from "@/lib/practices"
import { PracticeCard, PracticeRow } from "@/components/practice/PracticeCard"
import { cn } from "@/lib/utils"

type View = "card" | "list"
const VIEW_KEY = "practices.view"

function loadView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "card"
  } catch {
    return "card"
  }
}

/**
 * /practices — 수업실천사례 목록 (PRD §13, 묶음 P-3).
 * 교과 칩으로 거르기 · 카드/목록 보기 토글(이 브라우저에 기억) · "사례 쓰기"(권한 안내는 글쓰기 페이지에서).
 */
export function PracticeList() {
  const [items, setItems] = useState<Practice[] | null>(null)
  const [subject, setSubject] = useState<string | null>(null)
  const [view, setView] = useState<View>(loadView)

  useEffect(() => {
    let active = true
    setItems(null)
    getPractices(subject ?? undefined).then((d) => {
      if (active) setItems(d)
    })
    return () => {
      active = false
    }
  }, [subject])

  function changeView(v: View) {
    setView(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      // 저장 불가 환경 — 이번 방문에만 적용
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{practiceCopy.listTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{practiceCopy.listIntro}</p>
        </div>
        <Link
          to="/practices/write"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <PenLine className="size-4" aria-hidden />
          사례 쓰기
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Chip on={subject === null} onClick={() => setSubject(null)}>
            전체
          </Chip>
          {subjectCategories.map((c) => (
            <Chip key={c.id} on={subject === c.id} onClick={() => setSubject(c.id)}>
              {c.shortName ?? c.name}
            </Chip>
          ))}
        </div>
        <div className="flex rounded-md border border-border p-0.5" role="group" aria-label="보기 방식">
          <ViewButton on={view === "card"} onClick={() => changeView("card")} label="카드로 보기">
            <LayoutGrid className="size-4" aria-hidden />
          </ViewButton>
          <ViewButton on={view === "list"} onClick={() => changeView("list")} label="목록으로 보기">
            <List className="size-4" aria-hidden />
          </ViewButton>
        </div>
      </div>

      <div className="mt-6">
        {items === null ? (
          <p className="py-16 text-center text-sm text-muted-foreground">불러오는 중…</p>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {subject ? "이 교과의 수업 사례가 아직 없어요." : "아직 올라온 수업 사례가 없어요."}
            </p>
            <Link to="/practices/write" className="mt-3 inline-block text-sm font-medium underline">
              첫 사례 올리기
            </Link>
          </div>
        ) : view === "card" ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {items.map((p) => (
              <li key={p.id}>
                <PracticeCard practice={p} />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {items.map((p) => (
              <li key={p.id}>
                <PracticeRow practice={p} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        on
          ? "border-foreground bg-accent font-medium text-accent-foreground"
          : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {children}
    </button>
  )
}

function ViewButton({
  on,
  onClick,
  label,
  children,
}: {
  on: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={cn(
        "rounded p-1.5 transition-colors",
        on ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

import { History, X } from "lucide-react"
import { formatDraftTime, type Draft } from "@/lib/writingDrafts"

/** '아직 작성 중인 글이 있습니다' 카드 — 수업실천사례 쓰기 화면과 같은 모양(86) */
export function DraftResume<T>({ drafts, onOpen, onDiscard, disabled }: {
  drafts: Draft<T>[]
  onOpen: (d: Draft<T>) => void
  onDiscard: (d: Draft<T>) => void
  disabled?: boolean
}) {
  if (drafts.length === 0) return null
  return <section className="rounded-xl border border-border bg-card p-4">
    <h2 className="flex items-center gap-1.5 text-sm font-semibold"><History className="size-4" aria-hidden />아직 작성 중인 글이 있습니다</h2>
    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
      {drafts.map((d) => <li key={d.id} className="relative">
        <button type="button" onClick={() => onOpen(d)} disabled={disabled}
          className="flex w-full flex-col items-start gap-1 rounded-lg border border-border bg-surface px-3 py-2.5 pr-9 text-left hover:border-primary hover:bg-accent">
          <span className="line-clamp-1 text-sm font-medium">{d.title || "제목 없음"}</span>
          <span className="text-xs text-muted-foreground">마지막 작성 {formatDraftTime(d.updatedAt)}</span>
        </button>
        <button type="button" onClick={() => onDiscard(d)} aria-label={`${d.title || "제목 없음"} 지우기`} title="지우기"
          className="absolute right-1.5 top-1.5 rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive">
          <X className="size-4" aria-hidden />
        </button>
      </li>)}
    </ul>
  </section>
}

/** '임시 저장됨 · 11월 26일 (수) 오후 2:32' 한 줄 */
export function DraftStatus({ savedAt, saveError }: { savedAt: string | null; saveError: string | null }) {
  if (!savedAt && !saveError) return null
  return <span role="status" className={saveError ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
    {saveError ?? `임시 저장됨 · ${formatDraftTime(savedAt!)}`}
  </span>
}

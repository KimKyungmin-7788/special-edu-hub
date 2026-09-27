import { Plus, X } from "lucide-react"
import { PRACTICE_LINKS_MAX, type PracticeLink } from "@/lib/practices"

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"

/** 링크 목록 칸 — 제목(선택) + 주소. 영상·패들렛·구글 문서 등. 빈 주소 줄은 저장 때 빠진다. */
export function LinkListField({
  value,
  onChange,
  disabled,
}: {
  value: PracticeLink[]
  onChange: (v: PracticeLink[]) => void
  disabled?: boolean
}) {
  function patch(i: number, p: Partial<PracticeLink>) {
    onChange(value.map((l, j) => (j === i ? { ...l, ...p } : l)))
  }

  return (
    <div className="flex flex-col gap-2">
      {value.map((l, i) => (
        <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            className={inputClass + " sm:w-48 sm:shrink-0"}
            placeholder="이름 (예: 수업 영상)"
            value={l.title}
            onChange={(e) => patch(i, { title: e.target.value })}
            disabled={disabled}
          />
          <div className="flex items-center gap-2 sm:flex-1">
            <input
              className={inputClass}
              type="url"
              placeholder="https://..."
              value={l.url}
              onChange={(e) => patch(i, { url: e.target.value })}
              disabled={disabled}
            />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              disabled={disabled}
              aria-label="링크 빼기"
              className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      ))}

      {value.length < PRACTICE_LINKS_MAX && (
        <button
          type="button"
          onClick={() => onChange([...value, { title: "", url: "" }])}
          disabled={disabled}
          className="inline-flex w-fit items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          <Plus className="size-4" aria-hidden />
          링크 추가
        </button>
      )}
    </div>
  )
}

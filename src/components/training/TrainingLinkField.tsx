import { Plus, X } from "lucide-react"
import { TRAINING_LINK_KINDS, TRAINING_LINK_MAX, type TrainingLink, type TrainingLinkKind } from "@/lib/board"

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"

/** 연수 자료 링크 칸 — 종류 + 이름(선택) + 주소. 수업 사례 링크 칸(LinkListField)과 같은 모양. 빈 주소 줄은 저장 때 빠진다. */
export function TrainingLinkField({
  value,
  onChange,
  disabled,
}: {
  value: TrainingLink[]
  onChange: (v: TrainingLink[]) => void
  disabled?: boolean
}) {
  function patch(i: number, p: Partial<TrainingLink>) {
    onChange(value.map((l, j) => (j === i ? { ...l, ...p } : l)))
  }

  return (
    <div className="flex flex-col gap-2">
      {value.map((l, i) => (
        <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex gap-2 sm:shrink-0">
            <select
              aria-label="자료 종류"
              className={inputClass + " w-36 shrink-0"}
              value={l.kind}
              onChange={(e) => patch(i, { kind: e.target.value as TrainingLinkKind })}
              disabled={disabled}
            >
              {TRAINING_LINK_KINDS.map((k) => (
                <option key={k.kind} value={k.kind}>{k.label}</option>
              ))}
            </select>
            <input
              className={inputClass + " sm:w-40"}
              placeholder="이름 (선택)"
              maxLength={50}
              value={l.label}
              onChange={(e) => patch(i, { label: e.target.value })}
              disabled={disabled}
            />
          </div>
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

      {value.length < TRAINING_LINK_MAX && (
        <button
          type="button"
          onClick={() => onChange([...value, { kind: "slides", label: "", url: "" }])}
          disabled={disabled}
          className="inline-flex w-fit items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          <Plus className="size-4" aria-hidden />
          링크 더하기
        </button>
      )}
    </div>
  )
}

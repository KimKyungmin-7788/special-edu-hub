import { useEffect, useState, type DragEvent, type ReactNode } from "react"
import { ChevronDown, ChevronUp, GripVertical, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { ACHIEVEMENT_CODES_MAX, lookupStandards, type StandardLite } from "@/lib/standards"

/**
 * 고른 관련 성취기준 목록 — 순서 조정(위·아래 버튼 + 끌어서 옮기기)·삭제.
 * 태블릿에서는 끌기가 불편하므로 버튼이 기본, 끌기는 마우스용 보조.
 * 값은 코드 배열(순서 = 입력자가 정한 순서). 문장은 standards-lite.json 에서 찾아 보여준다.
 */
export function SelectedStandards({
  codes,
  onChange,
  onOpenFinder,
  disabled,
}: {
  codes: string[]
  onChange: (codes: string[]) => void
  onOpenFinder: () => void
  disabled?: boolean
}) {
  const [info, setInfo] = useState<Map<string, StandardLite>>(new Map())
  const [loadError, setLoadError] = useState(false)
  const [dragFrom, setDragFrom] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    lookupStandards(codes)
      .then((list) => alive && setInfo(new Map(list.map((s) => [s.code, s]))))
      .catch(() => alive && setLoadError(true))
    return () => {
      alive = false
    }
  }, [codes])

  function move(from: number, to: number) {
    if (to < 0 || to >= codes.length || from === to) return
    const next = [...codes]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  function remove(code: string) {
    onChange(codes.filter((c) => c !== code))
  }

  function onDrop(e: DragEvent, to: number) {
    e.preventDefault()
    if (dragFrom != null) move(dragFrom, to)
    setDragFrom(null)
  }

  return (
    <div className="flex flex-col gap-3">
      {codes.length > 0 && (
        <ol className="flex flex-col gap-2">
          {codes.map((code, i) => {
            const s = info.get(code)
            return (
              <li
                key={code}
                draggable={!disabled}
                onDragStart={() => setDragFrom(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, i)}
                onDragEnd={() => setDragFrom(null)}
                className={cn(
                  "flex items-start gap-2 rounded-xl border border-border bg-background p-3",
                  dragFrom === i && "opacity-50",
                )}
              >
                <GripVertical
                  className="mt-1 hidden size-4 shrink-0 cursor-grab text-muted-foreground sm:block"
                  aria-hidden
                />
                <span className="mt-0.5 w-5 shrink-0 text-sm tabular-nums text-muted-foreground">{i + 1}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm">
                    <span className="font-mono font-semibold">{code}</span>
                    {s && (
                      <span className="text-muted-foreground">
                        {" "}
                        {s.school_level} {s.grade_band} · {s.subject}
                      </span>
                    )}
                  </span>
                  <span className="text-base leading-relaxed">
                    {s ? s.text : loadError ? "문장을 불러오지 못했어요" : "불러오는 중…"}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-0.5">
                  <IconButton label="위로" onClick={() => move(i, i - 1)} disabled={disabled || i === 0}>
                    <ChevronUp className="size-4" aria-hidden />
                  </IconButton>
                  <IconButton
                    label="아래로"
                    onClick={() => move(i, i + 1)}
                    disabled={disabled || i === codes.length - 1}
                  >
                    <ChevronDown className="size-4" aria-hidden />
                  </IconButton>
                  <IconButton label="빼기" onClick={() => remove(code)} disabled={disabled}>
                    <X className="size-4" aria-hidden />
                  </IconButton>
                </span>
              </li>
            )
          })}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onOpenFinder}
          disabled={disabled}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-4 text-base hover:bg-accent disabled:opacity-60"
        >
          <Search className="size-4" aria-hidden />
          {codes.length ? "성취기준 더 찾기" : "관련 성취기준 찾기"}
        </button>
        <span className="text-sm text-muted-foreground tabular-nums">
          {codes.length ? `${codes.length} / ${ACHIEVEMENT_CODES_MAX}개 · 위아래 버튼으로 순서를 바꿔요` : "아직 고른 성취기준이 없어요"}
        </span>
      </div>
    </div>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
    >
      {children}
    </button>
  )
}

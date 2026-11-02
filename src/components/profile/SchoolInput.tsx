import { useEffect, useState } from "react"
import { schoolLabel, searchSchools, type SchoolHit } from "@/lib/account"

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"

/**
 * 소속 학교 입력칸 — 적는 동안 나이스 학교 목록을 보여 주고, 고르면 '학교명 (시도 시군구)'로 채운다.
 * 목록에 없으면(유치원·기관 근무 등) 적은 그대로 저장한다.
 */
export function SchoolInput({
  id,
  value,
  onChange,
  disabled,
  autoFocus,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  autoFocus?: boolean
}) {
  const [hits, setHits] = useState<SchoolHit[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  // 목록에서 고른 직후에는 다시 검색하지 않는다
  const [picked, setPicked] = useState(false)

  useEffect(() => {
    const q = value.trim()
    if (picked || q.length < 2) {
      setHits([])
      return
    }
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      setSearching(true)
      searchSchools(q, ctrl.signal)
        .then(setHits)
        .catch(() => setHits([]))
        .finally(() => setSearching(false))
    }, 300)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [value, picked])

  function pick(hit: SchoolHit) {
    setPicked(true)
    onChange(schoolLabel(hit))
    setOpen(false)
  }

  const showList = open && value.trim().length >= 2 && !picked

  return (
    <div className="relative w-full">
      <input
        id={id}
        role="combobox"
        aria-expanded={showList}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        autoComplete="off"
        className={inputClass}
        value={value}
        onChange={(e) => {
          setPicked(false)
          setOpen(true)
          onChange(e.target.value)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="학교 이름으로 검색 (예: ○○학교)"
        maxLength={60}
        autoFocus={autoFocus}
        disabled={disabled}
      />
      {showList && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute left-0 right-0 z-10 mt-1 max-h-60 overflow-y-auto rounded-md border border-border bg-background py-1 text-sm shadow-md"
        >
          {hits.map((h) => (
            <li key={`${h.name}-${h.region}`} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(h)}
                className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-accent"
              >
                <span className="font-medium">{h.name}</span>
                <span className="text-xs text-muted-foreground">
                  {[h.kind, h.region].filter(Boolean).join(" · ")}
                </span>
              </button>
            </li>
          ))}
          <li className="px-3 py-2 text-xs text-muted-foreground">
            {searching
              ? "찾는 중…"
              : hits.length
                ? "목록에 없으면 적은 그대로 저장돼요."
                : "검색 결과가 없어요. 적은 그대로 저장돼요."}
          </li>
        </ul>
      )}
    </div>
  )
}

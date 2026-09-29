import { useEffect, useId, useMemo, useState } from "react"
import { Check, Loader2, Plus } from "lucide-react"
import { Modal } from "@/components/ui/Modal"
import { SelectBox } from "@/components/form/FormParts"
import {
  ACHIEVEMENT_CODES_MAX,
  loadStandardsLite,
  type SchoolLevel,
  type StandardLite,
} from "@/lib/standards"

const LEVELS: SchoolLevel[] = ["초등학교", "중학교", "고등학교"]

/**
 * 관련 성취기준 직접 고르기 모달 — 검색 대신 드롭다운으로 학교급 → 교과 → 성취기준 번호.
 * 성취기준 목록은 학년군·영역별로 묶는다. [추가]는 목록 뒤에 붙이고 모달은 열어 둔다(여러 개 연달아 추가).
 * 데이터는 표시용 standards-lite.json(상세 페이지와 같은 파일).
 */
export function StandardsManualModal({
  open,
  onClose,
  selected,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  /** 이미 고른 코드 (중복·최대 개수 판단용) */
  selected: string[]
  onAdd: (code: string) => void
}) {
  const titleId = useId()
  const [all, setAll] = useState<StandardLite[] | null>(null)
  const [error, setError] = useState("")
  const [level, setLevel] = useState<SchoolLevel | "">("")
  const [subject, setSubject] = useState("")
  const [code, setCode] = useState("")

  useEffect(() => {
    if (!open || all) return
    let alive = true
    loadStandardsLite()
      .then((map) => alive && setAll(Array.from(map.values())))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "성취기준을 불러오지 못했습니다."))
    return () => {
      alive = false
    }
  }, [open, all])

  // 열 때마다 성취기준 칸만 비운다(학교급·교과는 이어서 고르기 편하게 유지)
  useEffect(() => {
    if (open) setCode("")
  }, [open])

  const subjects = useMemo(() => {
    if (!all || !level) return []
    return [...new Set(all.filter((s) => s.school_level === level).map((s) => s.subject))]
  }, [all, level])

  // 학년군 · 영역 별 묶음 (데이터 순서 유지)
  const groups = useMemo(() => {
    if (!all || !level || !subject) return []
    const map = new Map<string, StandardLite[]>()
    for (const s of all) {
      if (s.school_level !== level || s.subject !== subject) continue
      const key = `${s.grade_band} · ${s.domain}`
      map.set(key, [...(map.get(key) ?? []), s])
    }
    return Array.from(map, ([label, items]) => ({ label, items }))
  }, [all, level, subject])

  const picked = code ? all?.find((s) => s.code === code) : undefined
  const already = code !== "" && selected.includes(code)
  const full = selected.length >= ACHIEVEMENT_CODES_MAX

  function changeLevel(v: string) {
    setLevel(v as SchoolLevel | "")
    setSubject("")
    setCode("")
  }

  function changeSubject(v: string) {
    setSubject(v)
    setCode("")
  }

  function add() {
    if (!picked || already || full) return
    onAdd(picked.code)
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} className="flex max-h-[88vh] max-w-2xl flex-col">
      <div className="border-b border-border p-5 pr-14 sm:p-6 sm:pr-14">
        <h2 id={titleId} className="text-lg font-bold tracking-tight">
          성취기준 직접 고르기
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          학교급 → 교과 → 성취기준 순서로 골라 추가해요. 여러 개를 연달아 추가할 수 있어요.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 sm:p-6">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !all ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden /> 성취기준을 불러오는 중이에요
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold">학교급</span>
                <SelectBox value={level} onChange={(e) => changeLevel(e.target.value)}>
                  <option value="">학교급을 고르세요</option>
                  {LEVELS.map((lv) => (
                    <option key={lv} value={lv}>
                      {lv}
                    </option>
                  ))}
                </SelectBox>
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold">교과</span>
                <SelectBox
                  value={subject}
                  onChange={(e) => changeSubject(e.target.value)}
                  disabled={!level}
                >
                  <option value="">{level ? "교과를 고르세요" : "학교급을 먼저 고르세요"}</option>
                  {subjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </SelectBox>
              </label>
            </div>

            <label className="grid gap-1.5">
              <span className="text-sm font-semibold">성취기준</span>
              <SelectBox value={code} onChange={(e) => setCode(e.target.value)} disabled={!subject}>
                <option value="">{subject ? "성취기준 번호를 고르세요" : "교과를 먼저 고르세요"}</option>
                {groups.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.items.map((s) => (
                      <option key={s.code} value={s.code}>
                        {selected.includes(s.code) ? "✓ " : ""}
                        {s.code} {s.text}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </SelectBox>
            </label>

            {picked && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm">
                  <span className="font-mono font-semibold">{picked.code}</span>{" "}
                  <span className="text-muted-foreground">
                    {picked.school_level} {picked.grade_band} · {picked.subject} · {picked.domain}
                  </span>
                </p>
                <p className="mt-1 text-base leading-relaxed">{picked.text}</p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 sm:px-6">
        <p className="text-sm text-muted-foreground tabular-nums">
          {already
            ? "이미 목록에 있어요"
            : full
              ? `최대 ${ACHIEVEMENT_CODES_MAX}개까지 고를 수 있어요`
              : `${selected.length} / ${ACHIEVEMENT_CODES_MAX}개`}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-border bg-background px-4 text-base hover:bg-accent"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={add}
            disabled={!picked || already || full}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {already ? <Check className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
            {already ? "추가됨" : "목록에 추가"}
          </button>
        </div>
      </div>
    </Modal>
  )
}

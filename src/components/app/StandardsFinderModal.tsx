import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { Modal } from "@/components/ui/Modal"
import { SegmentedToggle, chipClass, fieldInput } from "@/components/form/FormParts"
import { cn } from "@/lib/utils"
import {
  ACHIEVEMENT_CODES_MAX,
  explainWords,
  searchStandards,
  type QueryTerm,
  type Result,
  type SchoolLevel,
  type Strength,
} from "@/lib/standards"

const LEVELS: SchoolLevel[] = ["초등학교", "중학교", "고등학교"]
const STRENGTH_RANK: Record<Strength, number> = { 강함: 3, 보통: 2, 약함: 1 }

/** 검색 기준 — 앱 설명(기본) 또는 수업 주제 중 하나만 쓴다 */
type QueryMode = "app" | "topic"
const MODE_OPTIONS: { value: QueryMode; label: string }[] = [
  { value: "app", label: "앱 설명으로 찾기" },
  { value: "topic", label: "수업 주제로 찾기" },
]

type Grouped = Awaited<ReturnType<typeof searchStandards>>["grouped"]

/**
 * 관련 성취기준 찾기 모달 (2022 개정 특수교육 기본 교육과정 688개).
 * 앱 설명(기본) 또는 수업 주제 중 토글로 고른 하나로 브라우저 안에서 검색하고, 체크한 코드를 돌려준다.
 * 두 입력값은 따로 기억해서 토글을 오가도 지워지지 않는다. 열 때마다 앱 설명으로 돌아간다.
 * - 이미 고른 코드는 체크된 채로 시작한다. 결과에 안 보여도 선택은 유지된다.
 * - 확인 시 순서: 기존 선택 순서 유지 + 새로 고른 것은 뒤에 붙인다(결과 순서대로).
 */
export function StandardsFinderModal({
  open,
  onClose,
  initialApp,
  selected,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  /** 앱 설명 칸에 미리 채울 문장 (보통 한줄 설명) */
  initialApp: string
  /** 이미 고른 코드 (순서 있음) */
  selected: string[]
  onConfirm: (codes: string[]) => void
}) {
  const titleId = useId()
  const [mode, setMode] = useState<QueryMode>("app")
  const [topic, setTopic] = useState("")
  const [appText, setAppText] = useState(initialApp)
  const [levels, setLevels] = useState<SchoolLevel[]>(LEVELS)
  const [checked, setChecked] = useState<string[]>(selected)
  const [grouped, setGrouped] = useState<Grouped>([])
  const [count, setCount] = useState(0)
  const [terms, setTerms] = useState<QueryTerm[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const reqId = useRef(0)

  // 열릴 때마다 폼의 현재 값으로 초기화
  useEffect(() => {
    if (!open) return
    setMode("app")
    setAppText(initialApp)
    setChecked(selected)
    setError("")
    // open 이 바뀔 때만 초기화한다 (입력 중 폼 값 변화로 덮어쓰지 않도록)
  }, [open])

  // 입력이 바뀌면 잠시 뒤 검색 (타이핑 중 과도한 계산 방지)
  useEffect(() => {
    if (!open) return
    const q = mode === "app" ? { topic: "", app: appText.trim() } : { topic: topic.trim(), app: "" }
    if (!q.topic && !q.app) {
      setGrouped([])
      setCount(0)
      setTerms([])
      return
    }
    const id = ++reqId.current
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await searchStandards(q, { schoolLevels: levels.length ? levels : LEVELS })
        if (id !== reqId.current) return
        setGrouped(res.grouped)
        setCount(res.results.length)
        setTerms(res.terms)
        setError("")
      } catch (e) {
        if (id !== reqId.current) return
        setError(e instanceof Error ? e.message : "검색 중 문제가 생겼습니다.")
      } finally {
        if (id === reqId.current) setLoading(false)
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [open, mode, topic, appText, levels])

  const resultOrder = useMemo(
    () => grouped.flatMap((g) => g.subjects.flatMap((s) => s.items.map((r) => r.standard.code))),
    [grouped],
  )
  const full = checked.length >= ACHIEVEMENT_CODES_MAX

  function toggle(code: string) {
    setChecked((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : prev.length >= ACHIEVEMENT_CODES_MAX
          ? prev
          : [...prev, code],
    )
  }

  function toggleLevel(lv: SchoolLevel) {
    setLevels((prev) => (prev.includes(lv) ? prev.filter((x) => x !== lv) : [...prev, lv]))
  }

  function confirm() {
    const kept = selected.filter((c) => checked.includes(c))
    const added = checked
      .filter((c) => !selected.includes(c))
      .sort((a, b) => {
        const ia = resultOrder.indexOf(a)
        const ib = resultOrder.indexOf(b)
        return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib)
      })
    onConfirm([...kept, ...added])
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} className="flex h-[min(88vh,760px)] max-w-2xl flex-col">
      {/* 머리: 입력 */}
      <div className="flex flex-col gap-4 border-b border-border p-5 pr-14 sm:p-6 sm:pr-14">
        <div>
          <h2 id={titleId} className="text-lg font-bold tracking-tight">
            관련 성취기준 찾기
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            2022 개정 특수교육 기본 교육과정 688개 중에서 찾아요.
          </p>
        </div>
        <div className="grid gap-2">
          <SegmentedToggle value={mode} options={MODE_OPTIONS} onChange={setMode} />
          {mode === "app" ? (
            <input
              aria-label="앱 설명"
              className={fieldInput}
              value={appText}
              onChange={(e) => setAppText(e.target.value)}
              placeholder="예: 내릴 곳에서 버스 하차 버튼을 눌러 스스로 버스 타기를 연습해요."
            />
          ) : (
            <input
              aria-label="수업 주제"
              className={fieldInput}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: 대중교통을 이용하여 목적지까지 이동하기"
            />
          )}
        </div>
        <QueryWords text={mode === "app" ? appText : topic} terms={terms} />
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="학교급">
          {LEVELS.map((lv) => (
            <button
              key={lv}
              type="button"
              className={chipClass(levels.includes(lv))}
              aria-pressed={levels.includes(lv)}
              onClick={() => toggleLevel(lv)}
            >
              {lv}
            </button>
          ))}
        </div>
      </div>

      {/* 본문: 결과 (여기만 스크롤) */}
      <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6" aria-live="polite">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !(mode === "app" ? appText : topic).trim() ? (
          <p className="text-sm text-muted-foreground">
            {mode === "app"
              ? '앱에서 학생이 실제로 하는 행동을 적어 주세요. 예: "지폐와 동전으로 물건값 내기"'
              : '수업 주제를 한 문장으로 적어 주세요. 예: "대중교통을 이용하여 목적지까지 이동하기"'}
          </p>
        ) : loading && count === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden /> 성취기준을 찾는 중이에요
          </p>
        ) : count === 0 ? (
          <p className="text-sm text-muted-foreground">
            찾지 못했어요. "게임"보다 "버스 하차 벨 누르기"처럼 구체적인 행동으로 바꿔 보세요.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {grouped.map((g) => (
              <section key={g.school_level} className="flex flex-col gap-3">
                <h3 className="border-b border-border pb-1.5 text-base font-bold">{g.school_level}</h3>
                {g.subjects.map((sub) => (
                  <div key={sub.subject} className="flex flex-col gap-2">
                    <p className="text-sm font-semibold text-muted-foreground">{sub.subject}</p>
                    {sub.items.map((r) => (
                      <ResultRow
                        key={r.standard.code}
                        r={r}
                        checked={checked.includes(r.standard.code)}
                        disabled={full && !checked.includes(r.standard.code)}
                        onToggle={() => toggle(r.standard.code)}
                      />
                    ))}
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}
      </div>

      {/* 발: 선택 수 + 확인 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 sm:px-6">
        <p className="text-sm text-muted-foreground tabular-nums">
          {checked.length}개 선택
          {full && ` · 최대 ${ACHIEVEMENT_CODES_MAX}개까지 고를 수 있어요`}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-border bg-background px-4 text-base hover:bg-accent"
          >
            취소
          </button>
          <button
            type="button"
            onClick={confirm}
            className="h-11 rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground hover:opacity-90"
          >
            선택 완료
          </button>
        </div>
      </div>
    </Modal>
  )
}

/**
 * 입력한 문장을 검색어로 어떻게 바꿨는지 보여준다 (독립 검색 앱과 같은 풀이).
 * - 검색에 쓴 단어: 조사·어미는 흐리게, 앱 형식·일반어처럼 약하게 반영한 말은 점선
 * - 함께 찾은 단어: 유의어 사전으로 넓혀 찾은 말 (어느 말에서 왔는지 함께)
 */
function QueryWords({ text, terms }: { text: string; terms: QueryTerm[] }) {
  const seen = new Set<string>()
  const words = explainWords(text.trim()).filter(
    (w) => w.kind !== "stop" && !seen.has(w.token) && Boolean(seen.add(w.token)),
  )
  if (!text.trim() || words.length === 0) return null
  const groups = new Map<string, string[]>()
  for (const t of terms) {
    const m = /^유의어\((.+)\)$/.exec(t.source)
    if (!m) continue
    const list = groups.get(m[1]) ?? []
    if (list.length < 4) list.push(t.token)
    groups.set(m[1], list)
  }
  const syn = [...groups].slice(0, 4)
  const chip = "rounded-md px-1.5 py-0.5 text-xs"
  return (
    <div className="grid gap-1.5 rounded-xl border border-border bg-background p-3 text-xs" aria-live="polite">
      <div className="grid grid-cols-[5.5rem_1fr] items-baseline gap-2">
        <span className="text-muted-foreground">검색에 쓴 단어</span>
        <span className="flex flex-wrap gap-1">
          {words.map((w) =>
            w.kind === "low" ? (
              <span
                key={w.token}
                title="앱 형식·일반어라 적게 반영해요"
                className={cn(chip, "border border-dashed border-border text-muted-foreground")}
              >
                {w.token}
                {w.rest && <span className="opacity-50">{w.rest}</span>}
              </span>
            ) : (
              <span key={w.token} className={cn(chip, "bg-brand-muted font-semibold text-brand-muted-foreground")}>
                {w.token}
                {w.rest && <span className="font-normal opacity-50">{w.rest}</span>}
              </span>
            ),
          )}
        </span>
      </div>
      {syn.length > 0 && (
        <div className="grid grid-cols-[5.5rem_1fr] items-baseline gap-2">
          <span className="text-muted-foreground">함께 찾은 단어</span>
          <span className="flex flex-wrap items-center gap-1">
            {syn.map(([from, list]) => (
              <span key={from} className="inline-flex flex-wrap items-center gap-1">
                <span className="text-muted-foreground">{from} →</span>
                {list.map((x) => (
                  <span key={x} className={cn(chip, "bg-secondary text-secondary-foreground")}>
                    {x}
                  </span>
                ))}
              </span>
            ))}
          </span>
        </div>
      )}
    </div>
  )
}

function ResultRow({
  r,
  checked,
  disabled,
  onToggle,
}: {
  r: Result
  checked: boolean
  disabled: boolean
  onToggle: () => void
}) {
  const s = r.standard
  const words = r.matched
    .filter((m) => m.core || m.source !== "query")
    .sort((a, b) => Number(b.rare) - Number(a.rare))
    .slice(0, 5)
  return (
    <label
      className={cn(
        "flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-colors",
        checked ? "border-primary bg-accent" : "border-border bg-card hover:bg-accent/50",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input
        type="checkbox"
        className="mt-1 size-4 shrink-0 accent-primary"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm">
            <span className="font-mono font-semibold">{s.code}</span>{" "}
            <span className="text-muted-foreground">
              {s.grade_band} · {s.domain}
            </span>
          </span>
          <StrengthBadge strength={r.strength} />
        </span>
        <span className="text-base leading-relaxed">{s.text}</span>
        {words.length > 0 && (
          <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            일치
            {words.map((m) => (
              <span key={m.word} className="rounded-md border border-border bg-background px-1.5 py-0.5">
                {m.word}
              </span>
            ))}
          </span>
        )}
      </span>
    </label>
  )
}

function StrengthBadge({ strength }: { strength: Strength }) {
  const n = STRENGTH_RANK[strength]
  return (
    <span
      title="입력한 말 중 드문 핵심어가 몇 개 맞았는지로 정한 연관 강도"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        n === 3 ? "border-primary text-primary" : "border-border text-muted-foreground",
      )}
    >
      <span className="inline-flex gap-0.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={cn("h-2.5 w-1 rounded-sm", i <= n ? "bg-current" : "bg-border")} />
        ))}
      </span>
      {strength}
    </span>
  )
}

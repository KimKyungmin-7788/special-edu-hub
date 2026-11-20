import { useState, type ReactNode } from "react"
import { HighTouchPicker } from "@/components/practice/HighTouchPicker"
import { ChevronDown, HeartHandshake, ListPlus, Plus, Trash2, X, type LucideIcon } from "lucide-react"
import { planText } from "@/config/practice"
import {
  emptyLesson,
  PLAN_LESSONS_MAX,
  PLAN_LEVELS,
  PLAN_TOOLS_MAX,
  type PlanGroup,
  type PlanLesson,
  type PlanStep,
  type PracticePlan,
} from "@/lib/practices"
import { cn } from "@/lib/utils"

/**
 * 지도안 표(72) — 레퍼런스 지도안처럼 왼쪽 회색 칸 이름 + 오른쪽 내용, 묶음마다 연두 머리줄.
 * 넓은 화면은 표, 휴대폰은 칸 이름을 위로 올려 쌓는다. 쓰기(…Fields)와 읽기(…View)가 같은 틀을 쓴다.
 */

/** 지도안과 실천 기록 사이 구분선 */
export function PlanDivider({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground" role="separator">
      <span className="h-px flex-1 bg-border" />
      {children}
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

export function PlanTable({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-xl border border-border bg-card text-sm">{children}</div>
}

/** tone="record": 수업 뒤 실천 기록처럼 지도안과 다른 구역임을 보이는 회색 머리줄 */
export function PlanBar({ icon: Icon, children, tone }: { icon: LucideIcon; children: ReactNode; tone?: "record" }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1.5 border-t border-border px-3 py-2 font-semibold first:border-t-0",
        tone === "record" ? "bg-secondary text-foreground" : "bg-brand-muted text-brand-muted-foreground",
      )}
    >
      <Icon className="size-4" aria-hidden />
      {children}
    </div>
  )
}

export function PlanRow({ label, required, children }: { label: ReactNode; required?: boolean; children: ReactNode }) {
  return (
    <div className="grid border-t border-border first:border-t-0 sm:grid-cols-[9rem_minmax(0,1fr)]">
      <div className="flex items-center break-keep bg-surface px-3 py-2 font-medium text-balance sm:justify-center sm:border-r sm:border-border sm:text-center">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/** 표 칸 안 입력 — 칸 테두리가 있으니 자체 테두리는 없이, 누르면 안쪽 강조. */
export const cellInput =
  "block w-full bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70 focus:bg-background focus:ring-2 focus:ring-inset focus:ring-ring disabled:opacity-60"
const cellArea = cellInput + " min-h-[4.5rem] resize-y leading-relaxed"

/** 집단 라벨(가·나·다) 칸 */
function LevelCell({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center bg-surface px-2 py-2 font-semibold sm:border-r sm:border-border">
      {children}
    </div>
  )
}

// ── 수업 목표(가·나·다) ──────────────────────────────

export function PlanGoalsFields({
  goals,
  onChange,
  disabled,
}: {
  goals: PracticePlan["goals"]
  onChange: (g: PracticePlan["goals"]) => void
  disabled?: boolean
}) {
  return (
    <div className="divide-y divide-border">
      {PLAN_LEVELS.map((l) => (
        <div key={l} className="grid grid-cols-[2.75rem_minmax(0,1fr)]">
          <LevelCell>{l}</LevelCell>
          <input
            className={cn(cellInput, "border-l border-border sm:border-l-0")}
            value={goals[l]}
            placeholder={planText.goalPlaceholders[l]}
            onChange={(e) => onChange({ ...goals, [l]: e.target.value })}
            aria-label={`${planText.goals} ${l}`}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  )
}

// ── 바깥 도구 이름 ────────────────────────────────────

export function PlanToolNames({
  value,
  onChange,
  disabled,
  max = PLAN_TOOLS_MAX,
}: {
  value: string[]
  onChange: (v: string[]) => void
  disabled?: boolean
  max?: number
}) {
  const [draft, setDraft] = useState("")
  function add() {
    const name = draft.trim().slice(0, 40)
    if (!name || value.includes(name) || value.length >= max) return
    onChange([...value, name])
    setDraft("")
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs">
          {t}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== t))}
            aria-label={`${t} 빼기`}
            disabled={disabled}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      {value.length < max && (
        <span className="inline-flex items-center gap-1">
          <input
            className="h-8 w-40 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={draft}
            placeholder={planText.toolsOtherPlaceholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault()
                add()
              }
            }}
            disabled={disabled}
          />
          <button
            type="button"
            onClick={add}
            disabled={disabled}
            className="h-8 rounded-md border border-border px-2.5 text-xs hover:bg-accent"
          >
            {planText.toolsOtherAdd}
          </button>
        </span>
      )}
    </div>
  )
}

// ── 학생 특성·개별화 지원 ─────────────────────────────

const GROUP_FIELDS = ["performance", "content", "highTouch"] as const
type GroupField = (typeof GROUP_FIELDS)[number]

function GroupHead() {
  return (
    <div className="hidden border-t border-border sm:grid sm:grid-cols-[2.75rem_minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1.25fr)]">
      <div className="break-keep bg-surface px-2 py-2 text-center text-xs font-semibold text-balance">{planText.group.level}</div>
      {GROUP_FIELDS.map((f) => (
        <div
          key={f}
          className={cn(
            "break-keep border-l border-border px-2 py-2 text-center text-xs font-semibold text-balance",
            f === "highTouch" ? "bg-brand-muted text-brand-muted-foreground" : "bg-surface",
          )}
        >
          {f === "highTouch" && <HeartHandshake className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />}
          {planText.group[f]}
        </div>
      ))}
    </div>
  )
}

/** 휴대폰에서는 칸마다 이름을 위에 붙인다(넓은 화면은 머리줄이 대신). */
function MobileLabel({ field }: { field: GroupField }) {
  return (
    <span
      className={cn(
        "block px-3 pt-2 text-xs font-semibold sm:hidden",
        field === "highTouch" ? "text-brand-muted-foreground" : "text-muted-foreground",
      )}
    >
      {planText.group[field]}
    </span>
  )
}

export function PlanGroupsFields({
  groups,
  onChange,
  disabled,
}: {
  groups: PlanGroup[]
  onChange: (g: PlanGroup[]) => void
  disabled?: boolean
}) {
  const [picking, setPicking] = useState<number | null>(null)
  const set = (i: number, f: GroupField, v: string) =>
    onChange(groups.map((g, j) => (j === i ? { ...g, [f]: v } : g)))
  function addHighTouch(i: number, lines: string[]) {
    const cur = groups[i].highTouch.trim()
    set(i, "highTouch", [cur, ...lines].filter(Boolean).join("\n"))
  }
  return (
    <>
      <GroupHead />
      {groups.map((g, i) => (
        <div key={g.level} className="grid border-t border-border sm:grid-cols-[2.75rem_minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1.25fr)]">
          <LevelCell>{g.level}</LevelCell>
          {GROUP_FIELDS.map((f) => (
            <div key={f} className={cn("flex flex-col sm:border-l sm:border-border", f === "highTouch" && "bg-brand-muted/40")}>
              <label className="flex flex-1 flex-col">
                <MobileLabel field={f} />
                <textarea
                  className={cn(cellArea, "flex-1")}
                  rows={f === "highTouch" ? 3 : 2}
                  value={g[f]}
                  placeholder={planText.groupPlaceholders[f]}
                  onChange={(e) => set(i, f, e.target.value)}
                  aria-label={`${g.level} ${planText.group[f]}`}
                  disabled={disabled}
                />
              </label>
              {f === "highTouch" && (
                <button
                  type="button"
                  onClick={() => setPicking(i)}
                  disabled={disabled}
                  className="m-2 mt-0 inline-flex items-center justify-center gap-1 self-start rounded-full border border-brand-muted-foreground/40 bg-card px-3 py-1 text-xs font-semibold text-brand-muted-foreground hover:bg-brand-muted"
                >
                  <ListPlus className="size-3.5" aria-hidden />
                  {planText.highTouchPick}
                </button>
              )}
            </div>
          ))}
        </div>
      ))}
      <HighTouchPicker
        open={picking !== null}
        onClose={() => setPicking(null)}
        level={picking !== null ? groups[picking].level : ""}
        current={picking !== null ? groups[picking].highTouch : ""}
        onAdd={(lines) => picking !== null && addHighTouch(picking, lines)}
      />
    </>
  )
}

// ── 차시별 활동 ──────────────────────────────────────

const STEPS = ["intro", "main", "wrap"] as const
export type ToolOption = { value: string; label: string }

function LessonHead() {
  return (
    <div className="hidden break-keep border-t border-border bg-surface text-xs font-semibold text-balance sm:grid sm:grid-cols-[6rem_3.5rem_minmax(0,1fr)_11rem]">
      <div className="px-2 py-2 text-center">{planText.lesson.head}</div>
      <div className="border-l border-border px-2 py-2 text-center">{planText.lesson.step}</div>
      <div className="border-l border-border px-2 py-2 text-center">{planText.lesson.text}</div>
      <div className="border-l border-border px-2 py-2 text-center">{planText.lesson.tool}</div>
    </div>
  )
}

export function PlanLessonsFields({
  lessons,
  onChange,
  toolOptions,
  disabled,
}: {
  lessons: PlanLesson[]
  onChange: (l: PlanLesson[]) => void
  toolOptions: ToolOption[]
  disabled?: boolean
}) {
  // 처음엔 1차시만 펼친다. 새로 더한 차시는 펼친 채로.
  const [open, setOpen] = useState<Set<number>>(() => new Set([0]))
  const toggle = (i: number) =>
    setOpen((cur) => {
      const next = new Set(cur)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  const setLesson = (i: number, l: PlanLesson) => onChange(lessons.map((x, j) => (j === i ? l : x)))
  const setStep = (i: number, s: (typeof STEPS)[number], v: PlanStep) => setLesson(i, { ...lessons[i], [s]: v })

  function add() {
    if (lessons.length >= PLAN_LESSONS_MAX) return
    onChange([...lessons, { ...emptyLesson(), minutes: lessons[lessons.length - 1]?.minutes ?? 40 }])
    setOpen((cur) => new Set(cur).add(lessons.length))
  }
  function remove(i: number) {
    onChange(lessons.filter((_, j) => j !== i))
    setOpen((cur) => new Set([...cur].filter((x) => x !== i).map((x) => (x > i ? x - 1 : x))))
  }

  return (
    <>
      <LessonHead />
      {lessons.map((l, i) => {
        const isOpen = open.has(i)
        const n = i + 1
        return (
          <div key={i} className="grid border-t border-border sm:grid-cols-[6rem_minmax(0,1fr)]">
            <div className="flex items-center gap-2 bg-brand-muted/50 px-3 py-2 sm:flex-col sm:justify-center sm:gap-1 sm:border-r sm:border-border">
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-expanded={isOpen}
                className="inline-flex items-center gap-0.5 font-semibold text-brand-muted-foreground"
              >
                {n}차시
                <ChevronDown className={cn("size-3.5 transition-transform", !isOpen && "-rotate-90")} aria-hidden />
              </button>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={l.minutes}
                  onChange={(e) => setLesson(i, { ...l, minutes: Math.max(1, Math.min(300, Number(e.target.value) || 0)) })}
                  aria-label={`${n}차시 ${planText.lesson.minutes}`}
                  className="h-7 w-12 rounded border border-input bg-background px-1 text-center text-xs"
                  disabled={disabled}
                />
                {planText.lesson.minutes}
              </span>
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label={`${n}차시 ${planText.lesson.remove}`}
                  title={planText.lesson.remove}
                  disabled={disabled}
                  className="ml-auto rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive sm:ml-0"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              )}
            </div>
            {isOpen ? (
              <div>
                {STEPS.map((s, k) => (
                  <div
                    key={s}
                    className={cn("grid sm:grid-cols-[3.5rem_minmax(0,1fr)_11rem]", k > 0 && "border-t border-border")}
                  >
                    <div className="flex items-center bg-surface px-3 py-1.5 text-xs font-semibold sm:justify-center sm:border-r sm:border-border sm:px-1">
                      {planText.steps[s]}
                    </div>
                    <textarea
                      className={cellArea}
                      rows={2}
                      value={l[s].text}
                      onChange={(e) => setStep(i, s, { ...l[s], text: e.target.value })}
                      aria-label={`${n}차시 ${planText.steps[s]} ${planText.lesson.text}`}
                      disabled={disabled}
                    />
                    <select
                      className={cn(cellInput, "border-t border-border sm:border-l sm:border-t-0")}
                      value={toolOptions.some((o) => o.value === l[s].tool) ? l[s].tool : ""}
                      onChange={(e) => setStep(i, s, { ...l[s], tool: e.target.value })}
                      aria-label={`${n}차시 ${planText.steps[s]} ${planText.lesson.tool}`}
                      disabled={disabled}
                    >
                      <option value="">{planText.lesson.noTool}</option>
                      {toolOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => toggle(i)}
                className="truncate px-3 py-2.5 text-left text-muted-foreground hover:bg-accent"
              >
                {l.main.text || l.intro.text || "…"}
              </button>
            )}
          </div>
        )
      })}
      {lessons.length < PLAN_LESSONS_MAX && (
        <button
          type="button"
          onClick={add}
          disabled={disabled}
          className="flex w-full items-center justify-center gap-1 border-t border-border py-2.5 font-semibold text-brand-muted-foreground hover:bg-brand-muted/40"
        >
          <Plus className="size-4" aria-hidden />
          {planText.lesson.add}
        </button>
      )}
    </>
  )
}

// ── 읽기 ─────────────────────────────────────────────

/** all: 인쇄본처럼 빈 칸도 모두 그린다 */
export function PlanGroupsView({ groups, all }: { groups: PlanGroup[]; all?: boolean }) {
  const rows = all ? groups : groups.filter((g) => GROUP_FIELDS.some((f) => g[f].trim()))
  if (!rows.length) return null
  return (
    <>
      <GroupHead />
      {rows.map((g) => (
        <div key={g.level} className="grid border-t border-border sm:grid-cols-[2.75rem_minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1.25fr)]">
          <LevelCell>{g.level}</LevelCell>
          {GROUP_FIELDS.map((f) => (
            <div key={f} className={cn("sm:border-l sm:border-border", f === "highTouch" && "bg-brand-muted/40")}>
              <MobileLabel field={f} />
              <p className="min-h-[3.5rem] whitespace-pre-line px-3 py-2.5">{g[f] || (all ? "" : "—")}</p>
            </div>
          ))}
        </div>
      ))}
    </>
  )
}

export function PlanLessonsView({
  lessons,
  toolLabel,
  all,
}: {
  lessons: PlanLesson[]
  toolLabel: (v: string) => ReactNode
  all?: boolean
}) {
  return (
    <>
      <LessonHead />
      {lessons.map((l, i) => (
        <div key={i} className="grid border-t border-border sm:grid-cols-[6rem_minmax(0,1fr)]">
          <div className="flex items-center gap-2 bg-brand-muted/50 px-3 py-2 font-semibold text-brand-muted-foreground sm:flex-col sm:justify-center sm:gap-0 sm:border-r sm:border-border">
            {i + 1}차시
            <span className="text-xs font-normal text-muted-foreground">
              {l.minutes}
              {planText.lesson.minutes}
            </span>
          </div>
          <div>
            {STEPS.map((s, k) => (
              <div key={s} className={cn("grid sm:grid-cols-[3.5rem_minmax(0,1fr)_11rem]", k > 0 && "border-t border-border")}>
                <div className="flex items-center bg-surface px-3 py-1.5 text-xs font-semibold sm:justify-center sm:border-r sm:border-border sm:px-1">
                  {planText.steps[s]}
                </div>
                <p className={cn("whitespace-pre-line px-3 py-2.5", all && "min-h-[3.5rem]")}>{l[s].text || (all ? "" : "—")}</p>
                <div className="px-3 pb-2.5 sm:border-l sm:border-border sm:py-2.5">{l[s].tool ? toolLabel(l[s].tool) : null}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

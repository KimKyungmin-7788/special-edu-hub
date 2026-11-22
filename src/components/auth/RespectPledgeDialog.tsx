import { useState, type FormEvent, type ReactNode } from "react"
import { Check, Heart, Sprout } from "lucide-react"
import { Modal } from "@/components/ui/Modal"
import { Emphasis } from "@/components/ui/Emphasis"
import { respectPledge as t } from "@/config/respectPledge"
import { recordRespectPledge } from "@/lib/consents"
import { cn } from "@/lib/utils"

/**
 * 서로 존중 약속 창(76) — 아직 약속하지 않은 회원에게 로그인 뒤 한 번.
 * 네 가지 약속을 체크하고, 맨 아래 '위 내용을 확인합니다'(오늘 날짜)까지 체크해야 '제출하기'가 눌린다.
 * 제출하면 계정·버전·시각이 기록된다. '나중에'(또는 닫기)는 기록 없이 닫고 이번 방문 동안은 다시 묻지 않는다.
 */
export function RespectPledgeDialog({ onDone, onLater }: { onDone: () => void; onLater: () => void }) {
  const [checked, setChecked] = useState<boolean[]>(() => t.promises.map(() => false))
  const [confirmed, setConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const n = checked.filter(Boolean).length
  const allPromises = n === t.promises.length
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!allPromises || !confirmed) return
    setSaving(true)
    setError(null)
    try {
      await recordRespectPledge()
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.")
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onLater} labelledBy="respect-title" className="max-w-lg">
      <form onSubmit={handleSubmit} className="flex max-h-[88vh] flex-col overflow-y-auto break-keep p-6 sm:p-8">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
          <Sprout className="size-4" aria-hidden />
          {t.eyebrow}
        </p>
        <h2 id="respect-title" className="mt-2 text-xl font-bold leading-snug tracking-tight sm:text-2xl">
          {t.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.lead}</p>

        <fieldset className="mt-5 flex flex-col gap-2">
          <legend className="sr-only">{t.title}</legend>
          {t.promises.map((p, i) => (
            <PledgeCheck
              key={i}
              checked={checked[i]}
              onChange={(on) => {
                setChecked((c) => c.map((v, j) => (j === i ? on : v)))
                if (!on) setConfirmed(false)
              }}
              disabled={saving}
            >
              <Emphasis text={p} />
            </PledgeCheck>
          ))}
        </fieldset>

        <details className="mt-3 text-sm leading-relaxed text-muted-foreground">
          <summary className="cursor-pointer">{t.moreLabel}</summary>
          <ul className="mt-2 flex flex-col gap-1.5 rounded-lg bg-surface px-4 py-3">
            {t.more.map((m) => (
              <li key={m} className="flex gap-2">
                <Check className="mt-1 size-3.5 shrink-0 text-primary" aria-hidden />
                <span>
                  <Emphasis text={m} />
                </span>
              </li>
            ))}
          </ul>
        </details>

        {/* 마지막 확인 — 네 가지를 모두 체크해야 누를 수 있다 */}
        <div className="mt-5 border-t border-border pt-4">
          <PledgeCheck
            checked={confirmed}
            onChange={setConfirmed}
            disabled={saving || !allPromises}
            plain
          >
            <span className="font-semibold">{t.confirm}</span>
            <span className="ml-2 whitespace-nowrap text-sm text-muted-foreground">{today}</span>
          </PledgeCheck>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-xs text-destructive">
            {error}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="whitespace-nowrap text-sm text-muted-foreground" aria-live="polite">
            {t.progress.replace("{n}", String(n)).replace("{total}", String(t.promises.length))}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onLater}
              disabled={saving}
              className="whitespace-nowrap rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {t.later}
            </button>
            <button
              type="submit"
              disabled={!allPromises || !confirmed || saving}
              className="whitespace-nowrap rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "저장 중…" : t.submit}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

/** 체크하면 상자가 톡 튀고 V자가 그려지며 하트가 튀어 오르는 체크 칸(index.css .pledge-*) */
function PledgeCheck({
  checked,
  onChange,
  disabled,
  plain,
  children,
}: {
  checked: boolean
  onChange: (on: boolean) => void
  disabled?: boolean
  /** 테두리 없는 한 줄(마지막 확인) */
  plain?: boolean
  children: ReactNode
}) {
  // 체크할 때마다 하트를 새로 그려 애니메이션을 다시 시작한다
  const [pops, setPops] = useState(0)
  return (
    <label
      className={cn(
        "flex items-start gap-3 leading-relaxed",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        plain
          ? "py-1 text-base"
          : cn(
              "rounded-xl border px-4 py-3 text-[0.95rem] transition-colors",
              checked ? "border-primary bg-brand-soft" : "border-border hover:bg-surface",
            ),
      )}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => {
          onChange(e.target.checked)
          if (e.target.checked) setPops((p) => p + 1)
        }}
        disabled={disabled}
      />
      <span className="relative mt-0.5 shrink-0 rounded-md peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">
        <span
          aria-hidden
          data-on={checked}
          className={cn(
            "pledge-box flex size-5 items-center justify-center rounded-md border-2",
            checked ? "border-primary bg-primary" : "border-muted-foreground/50 bg-background",
          )}
        >
          <svg viewBox="0 0 20 20" className="size-3.5 text-primary-foreground" fill="none">
            <path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        {checked && pops > 0 && (
          <Heart key={pops} aria-hidden className="pledge-heart absolute -top-1 left-0.5 size-4 fill-current" />
        )}
      </span>
      <span className="min-w-0">{children}</span>
    </label>
  )
}

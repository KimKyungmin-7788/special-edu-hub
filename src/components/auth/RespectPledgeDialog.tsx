import { useState, type FormEvent } from "react"
import { Check, Sprout } from "lucide-react"
import { Modal } from "@/components/ui/Modal"
import { Emphasis } from "@/components/ui/Emphasis"
import { respectPledge as t } from "@/config/respectPledge"
import { recordRespectPledge } from "@/lib/consents"
import { cn } from "@/lib/utils"

/**
 * 서로 존중 약속 창(76) — 아직 약속하지 않은 회원에게 로그인 뒤 한 번.
 * 네 가지를 모두 체크해야 '약속해요'가 눌리고, 그때 계정·버전·시각이 기록된다.
 * '나중에'(또는 닫기)는 기록 없이 닫고 이번 방문 동안은 다시 묻지 않는다.
 */
export function RespectPledgeDialog({ onDone, onLater }: { onDone: () => void; onLater: () => void }) {
  const [checked, setChecked] = useState<boolean[]>(() => t.promises.map(() => false))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const n = checked.filter(Boolean).length
  const all = n === t.promises.length

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!all) return
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
            <label
              key={i}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-[0.95rem] leading-relaxed transition-colors",
                checked[i] ? "border-primary bg-brand-soft" : "border-border hover:bg-surface",
              )}
            >
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0"
                checked={checked[i]}
                onChange={(e) => setChecked((c) => c.map((v, j) => (j === i ? e.target.checked : v)))}
                disabled={saving}
              />
              <span>
                <Emphasis text={p} />
              </span>
            </label>
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

        {error && (
          <p role="alert" className="mt-3 text-xs text-destructive">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
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
              disabled={!all || saving}
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

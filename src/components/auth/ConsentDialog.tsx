import { useState, type FormEvent } from "react"
import { Modal } from "@/components/ui/Modal"
import { ConsentChecks } from "@/components/auth/ConsentChecks"
import { recordConsents, type ConsentItem } from "@/lib/consents"
import type { ConsentKind } from "@/config/consents"

/**
 * 약관 동의 창(66) — 로그인 뒤 아직 동의하지 않은 문서가 있는 회원에게
 * (기존 회원·구글 가입자, 문서가 개정된 경우). 닫으면 다음 로그인에 다시 묻는다.
 */
export function ConsentDialog({
  pending,
  onComplete,
  onClose,
}: {
  pending: ConsentItem[]
  onComplete: () => void
  onClose: () => void
}) {
  const [checked, setChecked] = useState<ConsentKind[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (checked.length < pending.length) return setError("필수 항목에 모두 동의해 주세요.")
    setSaving(true)
    try {
      await recordConsents(pending, "login")
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.")
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} labelledBy="consent-title" className="max-w-md">
      <form onSubmit={handleSubmit} className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto p-6">
        <h2 id="consent-title" className="text-lg font-semibold tracking-tight">
          약관 동의
        </h2>
        <ConsentChecks
          kinds={pending.map((p) => p.kind)}
          checked={checked}
          onChange={(next) => {
            setChecked(next)
            if (error) setError(null)
          }}
          disabled={saving}
        />
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="self-start rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "저장 중…" : "동의하고 계속"}
        </button>
      </form>
    </Modal>
  )
}

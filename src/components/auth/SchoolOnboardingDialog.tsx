import { useState, type FormEvent } from "react"
import { Modal } from "@/components/ui/Modal"
import { saveMySchool } from "@/lib/account"

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"

/**
 * 소속 학교 묻기(52) — 로그인 뒤 학교가 없는 회원에게(새 가입자·구글 가입·기존 회원 모두).
 * 운영진만 보는 정보. 저장 전까지(닫아도) 다음 로그인에 다시 묻는다. 마이페이지에서 고칠 수 있다.
 */
export function SchoolOnboardingDialog({
  userId,
  onComplete,
  onClose,
}: {
  userId: string
  onComplete: () => void
  onClose: () => void
}) {
  const [school, setSchool] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await saveMySchool(userId, school)
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.")
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} labelledBy="school-onboard-title" className="max-w-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        <div>
          <h2 id="school-onboard-title" className="text-lg font-semibold tracking-tight">
            소속 학교를 알려 주세요
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            운영진만 볼 수 있고 다른 회원에게는 보이지 않아요. 나중에 마이페이지에서 바꿀 수 있어요.
          </p>
        </div>
        <input
          className={inputClass}
          value={school}
          onChange={(e) => setSchool(e.target.value)}
          placeholder="예: ○○특수학교"
          maxLength={60}
          autoFocus
          disabled={saving}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="self-start rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "저장 중…" : "저장하기"}
        </button>
      </form>
    </Modal>
  )
}

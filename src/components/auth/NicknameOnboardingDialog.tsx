import { useState, type FormEvent } from "react"
import { Modal } from "@/components/ui/Modal"
import { completeNicknameOnboarding } from "@/lib/profile"

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"

/**
 * 첫 로그인 닉네임 온보딩 (묶음 H).
 * profile.nicknameSet=false 인 동안 노출 — 누리집에 보일 이름을 직접 정한다.
 * 저장 전까지(닫아도) 다음 로그인에 다시 묻는다. 저장 시 nickname_set=true.
 * 부모는 open 일 때만 마운트(initialNickname 을 매번 새로 반영).
 */
export function NicknameOnboardingDialog({
  userId,
  initialNickname,
  onComplete,
  onClose,
}: {
  userId: string
  initialNickname: string
  onComplete: () => void
  onClose: () => void
}) {
  const [nickname, setNickname] = useState(initialNickname)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const n = nickname.trim()
    if (n === "") {
      setError("닉네임을 입력하세요.")
      return
    }
    setSaving(true)
    try {
      await completeNicknameOnboarding(userId, n)
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.")
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} labelledBy="nick-onboard-title" className="max-w-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        <div>
          <h2 id="nick-onboard-title" className="text-lg font-semibold tracking-tight">
            닉네임을 정해주세요
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            누리집에서 보일 이름이에요. 나중에 마이페이지에서 바꿀 수 있어요.
          </p>
        </div>
        <input
          className={inputClass}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="예: 햇살쌤"
          maxLength={20}
          autoFocus
          disabled={saving}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="self-start rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "저장 중…" : "시작하기"}
        </button>
      </form>
    </Modal>
  )
}

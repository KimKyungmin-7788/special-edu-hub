import { useEffect, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { deleteMyAccount, getMySchool, saveMySchool } from "@/lib/account"
import { SchoolInput } from "@/components/profile/SchoolInput"

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"

/** 탈퇴 확인 때 따라 적는 말 */
const CONFIRM_WORD = "탈퇴합니다"

/**
 * 마이페이지 '내 프로필' 아래 — 소속 학교(운영진만 봄)와 회원 탈퇴(52).
 * 프로필 저장 폼과 따로 저장한다.
 */
export function AccountSettings({ uid }: { uid: string }) {
  return (
    <div className="mt-12 space-y-10 border-t border-border pt-8">
      <SchoolForm uid={uid} />
      <DeleteAccount uid={uid} />
    </div>
  )
}

function SchoolForm({ uid }: { uid: string }) {
  const [school, setSchool] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    getMySchool(uid).then((s) => setSchool(s ?? ""))
  }, [uid])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      await saveMySchool(uid, school)
      setMessage({ ok: true, text: "저장되었습니다." })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "저장하지 못했습니다." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">소속 학교</h2>
      <p className="mt-1 text-sm text-muted-foreground">운영진만 볼 수 있어요. 다른 회원에게는 보이지 않아요.</p>
      <form onSubmit={handleSubmit} className="mt-4 flex max-w-md flex-col gap-3 sm:flex-row">
        <label htmlFor="my-school" className="sr-only">소속 학교</label>
        <SchoolInput id="my-school" value={school} onChange={setSchool} disabled={saving} />
        <button
          type="submit"
          disabled={saving}
          className="shrink-0 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60"
        >
          {saving ? "저장 중…" : "학교 저장"}
        </button>
      </form>
      {message && (
        <p role={message.ok ? "status" : "alert"} className={message.ok ? "mt-2 text-sm text-muted-foreground" : "mt-2 text-sm text-destructive"}>
          {message.text}
        </p>
      )}
    </section>
  )
}

function DeleteAccount({ uid }: { uid: string }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (typed.trim() !== CONFIRM_WORD || deleting) return
    setDeleting(true)
    setError(null)
    try {
      await deleteMyAccount(uid)
      navigate("/", { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "탈퇴하지 못했습니다. 잠시 뒤 다시 시도해 주세요.")
      setDeleting(false)
    }
  }

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">회원 탈퇴</h2>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 text-sm text-muted-foreground underline underline-offset-2 hover:text-destructive"
        >
          탈퇴하기
        </button>
      ) : (
        <div className="mt-4 max-w-md rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm font-semibold text-destructive">탈퇴하면 되돌릴 수 없어요</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>계정과 프로필, 교사인증이 사라져요.</li>
            <li>등록한 자료·올린 파일, 수업실천사례, 게시판 글, 함께 여는 연수 글, 댓글, 쪽지가 모두 지워져요.</li>
            <li>같은 이메일로 다시 가입할 수 있지만, 지운 글은 되살릴 수 없어요.</li>
          </ul>
          <label htmlFor="delete-confirm" className="mt-4 block text-sm">
            계속하려면 <span className="font-semibold text-foreground">{CONFIRM_WORD}</span> 라고 적어 주세요.
          </label>
          <input
            id="delete-confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className={inputClass + " mt-2"}
            autoComplete="off"
            disabled={deleting}
          />
          {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={typed.trim() !== CONFIRM_WORD || deleting}
              className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50"
            >
              {deleting ? "탈퇴하는 중…" : "탈퇴하기"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setTyped("")
                setError(null)
              }}
              disabled={deleting}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

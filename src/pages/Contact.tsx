import { useState, type FormEvent } from "react"
import {
  submitInquiry,
  INQUIRY_TYPES,
  INQUIRY_SUBJECT_MAX,
  INQUIRY_BODY_MAX,
} from "@/lib/inquiries"

/**
 * 운영진 문의 페이지(/contact) — 건의·요청·오류 등을 운영진에게 보낸다(트랙 C).
 * 비로그인도 가능(이메일 필수). 로그인 시 계정 이메일로 회신되며 이메일 입력은 선택.
 * 접수·검증은 lib/inquiries(submit_inquiry RPC = DB)에서. 이 페이지는 입력·표시만.
 */
export function Contact() {
  const [type, setType] = useState<string>(INQUIRY_TYPES[0].code)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    // 회신용 이메일은 항상 필수.
    if (email.trim() === "") {
      setError("회신받을 이메일을 입력하세요.")
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await submitInquiry({ type, subject, body, email: email.trim() || undefined })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "문의를 접수하지 못했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">문의가 접수되었습니다</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          운영진이 확인 후 회신드리겠습니다. 소중한 의견 감사합니다.
        </p>
        <button
          type="button"
          onClick={() => {
            setDone(false)
            setType(INQUIRY_TYPES[0].code)
            setSubject("")
            setBody("")
            setEmail("")
          }}
          className="mt-6 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          새 문의 작성
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">운영진 문의</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        건의·요청·오류 등 무엇이든 남겨주세요. 운영진이 확인 후 회신드립니다.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {/* 유형 */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">문의 유형</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {INQUIRY_TYPES.map((t) => (
              <label key={t.code} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="inquiry-type"
                  value={t.code}
                  checked={type === t.code}
                  onChange={() => setType(t.code)}
                  className="accent-[var(--primary)]"
                />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>

        {/* 제목 */}
        <div className="space-y-1.5">
          <label htmlFor="inquiry-subject" className="text-sm font-medium">
            제목
          </label>
          <input
            id="inquiry-subject"
            type="text"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value)
              if (error) setError(null)
            }}
            maxLength={INQUIRY_SUBJECT_MAX}
            placeholder="문의 제목"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* 내용 */}
        <div className="space-y-1.5">
          <label htmlFor="inquiry-body" className="text-sm font-medium">
            내용
          </label>
          <textarea
            id="inquiry-body"
            value={body}
            onChange={(e) => {
              setBody(e.target.value)
              if (error) setError(null)
            }}
            rows={6}
            maxLength={INQUIRY_BODY_MAX}
            placeholder="내용을 자세히 적어주세요."
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="block text-right text-xs text-muted-foreground">
            {body.length}/{INQUIRY_BODY_MAX}
          </span>
        </div>

        {/* 이메일 — 로그인: 선택(계정메일로 회신) / 비로그인: 필수 */}
        <div className="space-y-1.5">
          <label htmlFor="inquiry-email" className="text-sm font-medium">
            회신 이메일 <span className="text-destructive">*</span>
          </label>
          <input
            id="inquiry-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (error) setError(null)
            }}
            placeholder="회신받을 이메일 주소"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={
            submitting ||
            subject.trim() === "" ||
            body.trim() === "" ||
            email.trim() === ""
          }
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {submitting ? "접수 중…" : "문의 보내기"}
        </button>
      </form>
    </div>
  )
}

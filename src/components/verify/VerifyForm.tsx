import { useState } from "react"
import { useAuth } from "@/lib/auth"
import {
  buildVerificationMail,
  submitVerification,
  type VerificationRequest,
} from "@/lib/verification"
import { site } from "@/config/site"
import { VerifyMailActions, VerifyMailPreview } from "./VerifyMailActions"
import { VerifyDocDrop } from "./VerifyDocDrop"

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-70"

const labelClass = "text-sm font-medium"

/**
 * 교사인증 신청(48_verification_upload.sql).
 * mode="new" → 처음 신청 / mode="reapply" → 반려 후 재신청
 *
 * 기본: 학교·성함 입력 + 서류 파일을 끌어다 놓고 '신청하기' → 비공개 버킷에 올리고 심사중 화면으로.
 * 대체: 파일을 올리기 어려우면 접어 둔 '메일로 보내기'(예전 방식) — 서류는 메일에 직접 첨부.
 */
export function VerifyForm({
  mode,
  onSuccess,
}: {
  mode: "new" | "reapply"
  onSuccess: (req: VerificationRequest) => void
}) {
  const { user } = useAuth()
  const email = user?.email ?? ""
  const [school, setSchool] = useState("")
  const [name, setName] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [mailOpen, setMailOpen] = useState(false)

  const mail = buildVerificationMail({ school, name, email })

  function checkFields(): boolean {
    setError(null)
    if (school.trim() === "" || name.trim() === "") {
      setError("소속 학교와 성함을 입력해 주세요.")
      return false
    }
    return true
  }

  async function handleSubmit() {
    if (submitting || !checkFields()) return
    if (!file) {
      setError("인증 서류 파일을 넣어 주세요.")
      return
    }
    setSubmitting(true)
    try {
      onSuccess(await submitVerification({ school, name, file }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "신청하지 못했습니다. 잠시 뒤 다시 시도해 주세요.")
      setSubmitting(false)
    }
  }

  /** 메일로 보내기(대체 경로): 검증 → 통과하면 신청 기록(비동기, 메일 창 열기는 막지 않음). */
  function handleMailAction(): boolean {
    if (!checkFields()) return false
    if (submitting) return true
    setSubmitting(true)
    submitVerification({ school, name })
      .then(onSuccess)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "신청 기록에 실패했습니다.")
        setSubmitting(false)
      })
    return true
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 절차 안내 */}
      <div className="rounded-md border border-border bg-card p-4">
        <p className="text-sm font-semibold">
          {mode === "reapply" ? "재신청 방법" : "인증 방법"}
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
          <li>소속 학교와 성함을 입력합니다.</li>
          <li>
            아래 칸에 다음 중 하나를 <span className="font-medium text-foreground">끌어다 놓습니다</span>.
            <ul className="mt-1 list-disc pl-4">
              <li>개인정보(주민번호 등)를 가린 재직증명서</li>
              <li>본인 이름이 보이는 나이스 화면 캡처 이미지</li>
            </ul>
          </li>
          <li>운영자가 확인 후 승인하면 자료 등록 등 교사 전용 기능이 열립니다. 결과는 메일로 알려 드립니다.</li>
        </ol>
      </div>

      {/* 입력 */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="verify-school" className={labelClass}>
            소속 학교 <span className="text-destructive">*</span>
          </label>
          <input
            id="verify-school"
            className={inputClass}
            placeholder="예: 강릉오성학교"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="verify-name" className={labelClass}>
            성함 <span className="text-destructive">*</span>
          </label>
          <input
            id="verify-name"
            className={inputClass}
            placeholder="예: 홍길동"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="verify-email" className={labelClass}>
            누리집에 가입하신 이메일 주소
          </label>
          <input id="verify-email" className={inputClass} value={email} disabled />
          <p className="text-xs text-muted-foreground">
            로그인한 계정의 이메일이 자동으로 들어갑니다. 인증은 이 계정에 부여되고, 결과 안내도 이 주소로 갑니다.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className={labelClass}>
            인증 서류 <span className="text-destructive">*</span>
          </p>
          <p className="text-xs text-muted-foreground">
            ※ 첨부: 개인정보를 가린 재직증명서 또는 본인 이름이 보이는 나이스 화면 캡처
          </p>
          <VerifyDocDrop
            file={file}
            disabled={submitting}
            onChange={(f, problem) => {
              setFile(f)
              setError(problem)
            }}
          />
          <p className="text-xs text-muted-foreground">
            서류는 운영진만 볼 수 있는 비공개 저장소에 보관하고, 인증 확인이 끝나면 지웁니다.
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="self-start rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? "올리는 중…" : mode === "reapply" ? "다시 신청하기" : "신청하기"}
      </button>

      {/* 대체 경로: 메일로 보내기 */}
      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setMailOpen((v) => !v)}
          aria-expanded={mailOpen}
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          파일 올리기가 어려우신가요? 메일로 보내기
        </button>
        {mailOpen && (
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              아래 내용으로 메일을 쓰고 서류를 직접 첨부해{" "}
              <span className="font-medium text-foreground">{site.verification.email}</span> 로 보내 주세요.
            </p>
            <VerifyMailPreview mail={mail} />
            <VerifyMailActions mail={mail} onAction={handleMailAction} />
          </div>
        )}
      </div>
    </div>
  )
}

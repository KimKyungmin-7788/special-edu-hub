import { useState } from "react"
import { useAuth } from "@/lib/auth"
import {
  buildVerificationMail,
  submitVerification,
  type VerificationRequest,
} from "@/lib/verification"
import { site } from "@/config/site"
import { VerifyMailActions, VerifyMailPreview } from "./VerifyMailActions"

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-70"

const labelClass = "text-sm font-medium"

/**
 * 교사인증 신청 — 템플릿 작성 후 운영자에게 이메일로 제출(25_verify_by_email.sql).
 * mode="new" → 처음 신청 / mode="reapply" → 반려 후 재신청
 *
 * 메일 버튼을 누르면 학교·성함을 신청 기록(pending)으로 남기고 onSuccess 로 심사중 화면 전환.
 * 서류는 사이트에 올리지 않는다 — 사용자가 메일에 직접 첨부한다.
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
  const [error, setError] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)

  const mail = buildVerificationMail({ school, name, email })

  /** 메일 버튼 클릭 시: 검증 → 통과하면 신청 기록(비동기, 이동은 막지 않음). */
  function handleAction(): boolean {
    setError(null)
    if (school.trim() === "" || name.trim() === "") {
      setError("소속 학교와 성함을 입력해 주세요.")
      return false
    }
    if (recording) return true
    setRecording(true)
    submitVerification({ school, name })
      .then(onSuccess)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "신청 기록에 실패했습니다.")
        setRecording(false)
      })
    return true
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 절차 안내 */}
      <div className="rounded-md border border-border bg-muted/40 p-4">
        <p className="text-sm font-semibold">
          {mode === "reapply" ? "재신청 방법" : "인증 방법"}
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
          <li>아래에 소속 학교와 성함을 입력하면 인증 메일 내용이 만들어집니다.</li>
          <li>
            메일에 다음 중 하나를 <span className="font-medium text-foreground">직접 첨부</span>해{" "}
            <span className="font-medium text-foreground">{site.verification.email}</span> 로
            보내 주세요.
            <ul className="mt-1 list-disc pl-4">
              <li>개인정보(주민번호 등)를 가린 재직증명서</li>
              <li>본인 이름이 보이는 나이스 화면 캡처 이미지</li>
            </ul>
          </li>
          <li>운영자가 확인 후 승인하면 자료 등록 등 교사 전용 기능이 열립니다.</li>
        </ol>
      </div>

      {/* 템플릿 입력 */}
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
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="verify-email" className={labelClass}>
            누리집에 가입하신 이메일 주소
          </label>
          <input id="verify-email" className={inputClass} value={email} disabled />
          <p className="text-xs text-muted-foreground">
            로그인한 계정의 이메일이 자동으로 들어갑니다. 인증은 이 계정에 부여됩니다.
          </p>
        </div>
      </div>

      {/* 미리보기 + 보내기 */}
      <div className="flex flex-col gap-3">
        <p className={labelClass}>보낼 메일 내용</p>
        <VerifyMailPreview mail={mail} />
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <VerifyMailActions mail={mail} onAction={handleAction} />
      </div>
    </div>
  )
}

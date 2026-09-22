import { buildVerificationMail, type VerificationRequest } from "@/lib/verification"
import { site } from "@/config/site"
import { VerifyMailActions } from "./VerifyMailActions"

/**
 * 심사중(pending) 상태.
 * 메일 창을 닫았거나 아직 못 보낸 경우를 위해 같은 내용으로 다시 보낼 수 있게 한다.
 * (예전 업로드 방식 신청은 성함이 없어 재발송 영역을 숨긴다.)
 */
export function VerifyPending({
  request,
  email,
}: {
  request: VerificationRequest
  email: string
}) {
  const date = new Date(request.createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const mail = request.applicantName
    ? buildVerificationMail({ school: request.school, name: request.applicantName, email })
    : null

  return (
    <div className="flex flex-col items-center gap-6 py-12 text-center">
      <div className="text-4xl">⏳</div>
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
          심사 중
        </span>
        <p className="mt-4 text-lg font-semibold">인증 신청이 접수되었습니다</p>
        <p className="mt-1 text-sm text-muted-foreground">
          메일과 첨부 서류를 확인한 뒤 승인해 드립니다.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">신청일: {date}</p>
      </div>

      {mail && (
        <div className="w-full max-w-md rounded-md border border-border bg-muted/50 p-4 text-left text-sm">
          <p className="font-medium text-foreground">아직 메일을 보내지 않으셨나요?</p>
          <p className="mt-1 text-muted-foreground">
            재직증명서(개인정보 가림) 또는 이름이 보이는 나이스 화면 캡처를 첨부해{" "}
            {site.verification.email} 로 보내 주세요.
          </p>
          <div className="mt-3">
            <VerifyMailActions mail={mail} />
          </div>
        </div>
      )}
    </div>
  )
}

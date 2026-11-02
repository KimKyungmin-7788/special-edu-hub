import { buildVerificationMail, type VerificationRequest } from "@/lib/verification"
import { site } from "@/config/site"
import { VerifyMailActions } from "./VerifyMailActions"

/**
 * 심사중(pending) 상태.
 * 메일 창을 닫았거나 아직 못 보낸 경우를 위해 같은 내용으로 다시 보낼 수 있게 한다.
 * 서류를 인증센터에서 올렸으면(documentPath) '심사 중', 메일 길로 신청했으면 '서류 기다리는 중'으로 보내기 안내를 앞세운다.
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
  const uploaded = !!request.documentPath
  const mail = !uploaded && request.applicantName
    ? buildVerificationMail({ school: request.school, name: request.applicantName, email })
    : null

  // 메일 길로 신청한 경우: 신청 기록만 있고 서류는 아직 없을 수 있다 → '서류 기다리는 중'으로 보여 주고 보내기를 맨 앞에.
  const waitingDoc = !uploaded
  return (
    <div className="flex flex-col items-center gap-6 py-12 text-center">
      <div className="text-4xl">{waitingDoc ? "📮" : "⏳"}</div>
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
          {waitingDoc ? "서류 기다리는 중" : "심사 중"}
        </span>
        <p className="mt-4 text-lg font-semibold">
          {waitingDoc ? "서류가 도착해야 심사가 시작돼요" : "인증 신청이 접수되었습니다"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground break-keep">
          {waitingDoc
            ? "신청은 기록됐지만, 서류를 첨부한 메일을 받아야 확인할 수 있어요."
            : "올려 주신 서류를 확인한 뒤 결과를 메일로 알려 드립니다."}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">신청일: {date}</p>
      </div>
      {mail && (
        <div className="w-full max-w-md rounded-md border border-brand-line bg-brand-soft p-4 text-left text-sm">
          <p className="font-semibold text-brand-muted-foreground">메일을 아직 보내지 않으셨다면 지금 보내 주세요</p>
          <p className="mt-1 text-muted-foreground break-keep">
            재직증명서(개인정보 가림) 또는 이름이 보이는 나이스 화면 캡처를 <span className="font-medium text-foreground">꼭 첨부해</span>{" "}
            {site.verification.email} 로 보내 주세요. 이미 보내셨다면 확인 후 결과를 메일로 알려 드립니다.
          </p>
          <div className="mt-3">
            <VerifyMailActions mail={mail} />
          </div>
        </div>
      )}
    </div>
  )
}

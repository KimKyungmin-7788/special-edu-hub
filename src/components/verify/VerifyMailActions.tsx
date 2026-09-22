import { useState, type MouseEvent } from "react"
import {
  gmailComposeUrl,
  mailtoUrl,
  type VerificationMail,
} from "@/lib/verification"

/**
 * 인증 메일 보내기 버튼 묶음 — Gmail 작성창 / 기본 메일 앱 / 본문 복사.
 * 사이트가 메일을 직접 보내지 않는다(서류가 서버를 거치지 않게). 첨부는 사용자가 직접.
 *
 * onAction: 버튼을 누를 때마다 호출. false 를 돌려주면 이동을 막는다(입력 검증용).
 */
export function VerifyMailActions({
  mail,
  onAction,
}: {
  mail: VerificationMail
  onAction?: () => boolean
}) {
  const [copied, setCopied] = useState(false)

  function guard(e: MouseEvent) {
    if (onAction && !onAction()) e.preventDefault()
  }

  async function copy() {
    if (onAction && !onAction()) return
    const text = `받는 사람: ${mail.to}\n제목: ${mail.subject}\n\n${mail.body}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt("아래 내용을 복사해 주세요.", text)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <a
          href={gmailComposeUrl(mail)}
          target="_blank"
          rel="noopener"
          onClick={guard}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Gmail로 보내기 ↗
        </a>
        <a
          href={mailtoUrl(mail)}
          onClick={guard}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          다른 메일 앱으로 보내기
        </a>
        <button
          type="button"
          onClick={copy}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          {copied ? "복사됨 ✓" : "본문 복사"}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        복사한 경우 <span className="font-medium text-foreground">{mail.to}</span> 로 직접 보내 주세요.
      </p>
    </div>
  )
}

/** 템플릿 미리보기 — 실제로 보내질 메일 본문. */
export function VerifyMailPreview({ mail }: { mail: VerificationMail }) {
  return (
    <div className="rounded-md border border-border bg-surface">
      <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
        받는 사람: <span className="text-foreground">{mail.to}</span>
      </div>
      <pre className="whitespace-pre-wrap break-words px-4 py-3 font-sans text-sm leading-relaxed">
        {mail.body}
      </pre>
    </div>
  )
}

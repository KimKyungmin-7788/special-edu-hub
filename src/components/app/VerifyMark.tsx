import { Clock, RefreshCw, ShieldCheck, ShieldQuestion } from "lucide-react"
import { verifyText } from "@/config/safety"
import type { VerificationStatus } from "@/lib/apps"
import { cn } from "@/lib/utils"

const STYLE: Record<VerificationStatus, { icon: typeof ShieldCheck; className: string }> = {
  verified: { icon: ShieldCheck, className: "bg-brand-muted text-brand-muted-foreground" },
  reviewing: { icon: Clock, className: "bg-secondary text-secondary-foreground" },
  reverify: { icon: RefreshCw, className: "bg-secondary text-secondary-foreground" },
  unverified: { icon: ShieldQuestion, className: "border border-border text-muted-foreground" },
}

/** 검증 마크(68) — 누리집이 확인한 범위를 알려 줄 뿐, 안전을 보증하는 표시가 아니다. */
export function VerifyMark({ status, className }: { status: VerificationStatus; className?: string }) {
  const { icon: Icon, className: tone } = STYLE[status]
  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", tone, className)}
    >
      <Icon className="size-3" aria-hidden />
      {verifyText.marks[status].label}
    </span>
  )
}

/** 마크 + 눌러서 펼치는 설명(자료 상세용) */
export function VerifyMarkDetail({ status }: { status: VerificationStatus }) {
  return (
    <details className="text-sm">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5">
        <VerifyMark status={status} />
        <span className="text-xs text-muted-foreground underline">설명 보기</span>
      </summary>
      <p className="mt-2 rounded-lg bg-surface px-3 py-2 leading-relaxed text-muted-foreground">
        {verifyText.marks[status].detail} {verifyText.minimalNotice}
      </p>
    </details>
  )
}

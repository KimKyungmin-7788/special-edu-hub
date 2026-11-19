import { useEffect, useRef, useState } from "react"
import { ChevronDown, Clock, RefreshCw, ShieldCheck, ShieldQuestion } from "lucide-react"
import { verifyText } from "@/config/safety"
import type { VerificationStatus } from "@/lib/apps"
import { cn } from "@/lib/utils"

const STYLE: Record<VerificationStatus, { icon: typeof ShieldCheck; className: string }> = {
  verified: { icon: ShieldCheck, className: "bg-brand-muted text-brand-muted-foreground" },
  reviewing: { icon: Clock, className: "bg-secondary text-secondary-foreground" },
  reverify: { icon: RefreshCw, className: "bg-secondary text-secondary-foreground" },
  unverified: { icon: ShieldQuestion, className: "border border-border text-muted-foreground" },
}

/**
 * 검증 마크(68) — 누리집이 확인한 범위를 알려 줄 뿐, 안전을 보증하는 표시가 아니다.
 * iconOnly: 자료 카드용 — '자동 점검 확인'은 글자 없이 마크만(글은 화면 낭독기·마우스 올림 말풍선으로 전한다).
 *   말풍선은 가장 가까운 relative 부모의 너비로 뜨므로, 쓰는 곳의 줄에 relative 를 둔다.
 */
export function VerifyMark({
  status,
  className,
  iconOnly,
}: {
  status: VerificationStatus
  className?: string
  iconOnly?: boolean
}) {
  const { icon: Icon, className: tone } = STYLE[status]
  const label = verifyText.marks[status].label
  if (iconOnly && status === "verified")
    return (
      <span
        className={cn("group/mark inline-flex size-5 shrink-0 items-center justify-center rounded-full", tone, className)}
      >
        <Icon className="size-3.5" aria-hidden />
        <span className="sr-only">{label}</span>
        {/* 마우스를 올리면 바로 뜨는 말풍선 — 카드가 넘침을 자르므로 부모(뱃지 줄, relative)의 너비에 맞춰 위로 편다 */}
        <span
          aria-hidden
          className="pointer-events-none invisible absolute inset-x-0 bottom-full z-20 mb-1.5 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs font-normal leading-snug text-popover-foreground opacity-0 shadow-md transition-opacity group-hover/mark:visible group-hover/mark:opacity-100"
        >
          <span className="block font-semibold">{label}</span>
          {verifyText.marks[status].hint}
        </span>
      </span>
    )
  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", tone, className)}
    >
      <Icon className="size-3" aria-hidden />
      {label}
    </span>
  )
}

/**
 * 자료 상세용 — 마크 자체가 단추다(펼침 표시 ▾ + 올리면 테두리). 누르면 바로 아래에 작은 설명 팝업이 뜨고,
 * 바깥을 누르거나 ESC 로 닫힌다. 줄 오른쪽 끝에 놓이므로 팝업은 오른쪽에 맞춰 편다.
 */
export function VerifyMarkDetail({ status }: { status: VerificationStatus }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const { icon: Icon, className: tone } = STYLE[status]

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-current/40 transition hover:ring-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open && "ring-1",
          tone,
        )}
      >
        <Icon className="size-3" aria-hidden />
        {verifyText.marks[status].label}
        <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <span
          role="dialog"
          aria-label={verifyText.marks[status].label}
          className="absolute right-0 top-7 z-20 w-72 max-w-[80vw] rounded-md border border-border bg-popover p-3 text-xs leading-relaxed text-popover-foreground shadow-lg"
        >
          <span className="mb-1 flex items-center gap-1 font-semibold">
            <Icon className="size-3.5" aria-hidden />
            {verifyText.marks[status].label}
          </span>
          {verifyText.marks[status].detail} {verifyText.minimalNotice}
        </span>
      )}
    </span>
  )
}

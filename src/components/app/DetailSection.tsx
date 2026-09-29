import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

/**
 * 상세 페이지 정보 카드 — 머리띠(아이콘 원 + 굵은 제목) + 본문.
 * 머리띠는 중립 surface, 아이콘 원만 포인트색(primary). 교육적 의도·활용사례·관련 성취기준에 쓴다.
 */
export function DetailSection({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <h2 className="flex items-center gap-2.5 border-b border-border bg-surface px-5 py-3 text-base font-bold">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Icon className="size-4" aria-hidden />
        </span>
        {title}
      </h2>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

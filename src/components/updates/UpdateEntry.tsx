import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { UPDATE_KIND_LABEL } from "@/config/updates"
import type { SiteUpdate } from "@/lib/siteUpdates"
import { cn } from "@/lib/utils"
import { UpdateMedia } from "@/components/updates/UpdateMedia"

/** 소식 한 건 — 꼬리표·제목·내용·링크. 새 소식 페이지와 팝업이 함께 쓴다 */
export function UpdateEntry({ update: u, onLink }: { update: SiteUpdate; onLink?: () => void }) {
  return (
    <div className="break-keep">
      <span
        className={cn(
          "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
          u.kind === "new"
            ? "bg-brand-muted text-brand-muted-foreground"
            : "border border-border text-muted-foreground",
        )}
      >
        {UPDATE_KIND_LABEL[u.kind]}
      </span>
      <h2 className="mt-2 text-base font-bold">{u.title}</h2>
      {u.body && (
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{u.body}</p>
      )}
      {u.mediaUrl && <UpdateMedia src={u.mediaUrl} />}
      {u.linkTo && (
        <Link
          to={u.linkTo}
          onClick={onLink}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {u.linkLabel}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  )
}

/** ISO 날짜 → "11월 3일" (한국 시간) */
export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { month: "long", day: "numeric", timeZone: "Asia/Seoul" })
}

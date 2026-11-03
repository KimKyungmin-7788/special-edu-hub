import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { updates, updatesPage, UPDATE_KIND_LABEL } from "@/config/updates"
import { CONTAINER } from "@/config/layout"
import { usePageTitle } from "@/lib/usePageTitle"
import { cn } from "@/lib/utils"

/** 새 소식(/updates) — 날짜별 업데이트 목록. 내용은 config/updates. */
export function Updates() {
  usePageTitle(updatesPage.title)

  return (
    <div className={`${CONTAINER} py-10`}>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight">{updatesPage.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{updatesPage.lead}</p>

        <ol className="mt-6">
          {updates.map((u) => (
            <li
              key={`${u.date}-${u.title}`}
              className="grid gap-1 border-t border-border py-6 sm:grid-cols-[6rem_1fr] sm:gap-6"
            >
              <time dateTime={u.date} className="text-sm text-muted-foreground">
                {shortDate(u.date)}
              </time>
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
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{u.body}</p>
                {u.link && (
                  <Link
                    to={u.link.to}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    {u.link.label}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

/** "2026-11-03" → "11월 3일" */
function shortDate(date: string) {
  const [, m, d] = date.split("-").map(Number)
  return `${m}월 ${d}일`
}

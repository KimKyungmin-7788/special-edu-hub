import { Link } from "react-router-dom"
import { Bookmark, Heart } from "lucide-react"
import { AppThumbnail } from "@/components/app/AppThumbnail"
import { SectionHeading } from "@/components/home/AppCardList"
import { displayTitle, type App } from "@/lib/apps"
import { cn } from "@/lib/utils"

/**
 * 랜딩 "인기 수업자료" 순위 목록 — 1위부터 번호·작은 썸네일·제목·담기/좋아요 수를 한 줄씩.
 * 옆의 최신(카드 그리드)과 생김새를 일부러 다르게 해 두 섹션이 섞여 보이지 않게 한다.
 * 한 패널 안에서 일정한 행 간격을 유지하고, 상위 3위 숫자만 연한 브랜드 배지로 강조.
 */
export function PopularRankList({
  title,
  apps,
  moreHref,
  emptyText = "표시할 앱이 없습니다.",
}: {
  title: string
  apps: App[]
  moreHref?: string
  emptyText?: string
}) {
  return (
    <section className="flex min-w-0 flex-col">
      <SectionHeading title={title} moreHref={moreHref} />
      {apps.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ol className="overflow-hidden rounded-xl border bg-card divide-y divide-border">
          {apps.map((app, i) => (
            <li key={app.id}>
              <Link
                to={`/app/${app.id}`}
                className="group flex items-center gap-3 px-3 py-4 transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                    i < 3 ? "bg-brand-soft text-primary" : "text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
                <div className="relative aspect-video w-20 sm:w-24 lg:w-20 xl:w-24 shrink-0 overflow-hidden rounded-md bg-surface">
                  <AppThumbnail app={app} iconClassName="size-5" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
                    {displayTitle(app)}
                  </span>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1" title="담기">
                      <Bookmark className="size-3.5" aria-hidden />
                      {app.bookmarkCount}
                    </span>
                    <span className="inline-flex items-center gap-1" title="좋아요">
                      <Heart className="size-3.5" aria-hidden />
                      {app.likeCount}
                    </span>
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

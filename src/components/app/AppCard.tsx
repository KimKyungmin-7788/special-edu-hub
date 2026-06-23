import { Link } from "react-router-dom"
import { Heart, Bookmark, ImageOff } from "lucide-react"
import { getCategory } from "@/config/categories"
import type { App } from "@/lib/apps"

/**
 * 앱 목록 카드 — 썸네일 / 제목 / 카테고리 태그 / 좋아요·담기 수.
 * 좋아요·담기 수는 시드값 "표시만"(누적·토글 없음 — CLAUDE.md 규칙 4).
 * 담기(북마크) 버튼은 모양만, 비작동.
 */
export function AppCard({ app }: { app: App }) {
  const tags = app.categoryIds
    .map((id) => getCategory(id)?.name)
    .filter(Boolean) as string[]

  return (
    <Link
      to={`/app/${app.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:border-foreground/30"
    >
      <div className="relative aspect-video bg-surface">
        {app.thumbnailUrl ? (
          <img
            src={app.thumbnailUrl}
            alt={app.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-6" aria-hidden />
          </div>
        )}

        {/* 담기 버튼 — 모양만, 비작동 (준비 중) */}
        <span
          aria-disabled="true"
          title="준비 중"
          className="absolute right-2 top-2 rounded-md bg-background/90 p-1.5 text-muted-foreground"
        >
          <Bookmark className="size-4" aria-hidden />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="font-medium tracking-tight">{app.title}</h3>

        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <li
                key={t}
                className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
              >
                {t}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex items-center gap-3 pt-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Heart className="size-3.5" aria-hidden />
            {app.likeCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <Bookmark className="size-3.5" aria-hidden />
            {app.bookmarkCount}
          </span>
        </div>
      </div>
    </Link>
  )
}

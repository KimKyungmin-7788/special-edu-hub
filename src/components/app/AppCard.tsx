import { Link } from "react-router-dom"
import { Heart, Bookmark, ChevronUp, ChevronDown } from "lucide-react"
import { getCategory } from "@/config/categories"
import { AppThumbnail } from "@/components/app/AppThumbnail"
import type { App } from "@/lib/apps"

/** 운영진 순서 조정 컨트롤(있으면 카드에 ▲▼ 노출). */
export type CardMove = {
  onUp: () => void
  onDown: () => void
  canUp: boolean
  canDown: boolean
}

/**
 * 앱 목록 카드 — 썸네일 / 제목 / 카테고리 태그 / 좋아요·담기 수.
 * 좋아요·담기 수는 시드값 "표시만"(누적·토글 없음 — CLAUDE.md 규칙 4).
 * 담기(북마크) 버튼은 모양만, 비작동.
 * move 가 주어지면(운영진) 카드 좌상단에 순서 ▲▼ 버튼을 띄운다.
 */
export function AppCard({ app, move }: { app: App; move?: CardMove }) {
  const tags = app.categoryIds
    .map((id) => getCategory(id)?.name)
    .filter(Boolean) as string[]

  return (
    <Link
      to={`/app/${app.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:border-foreground/30"
    >
      <div className="relative aspect-video bg-surface">
        <AppThumbnail app={app} iconClassName="size-7" />

        {/* 순서 조정 ▲▼ — 운영진에게만(move 있을 때). Link 내부라 기본동작 차단. */}
        {move && (
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            <MoveButton
              dir="up"
              disabled={!move.canUp}
              onClick={move.onUp}
            />
            <MoveButton
              dir="down"
              disabled={!move.canDown}
              onClick={move.onDown}
            />
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

/** 순서 이동 버튼 — 카드(Link) 내부라 클릭 시 기본 이동을 막고 핸들러만 실행. */
function MoveButton({
  dir,
  disabled,
  onClick,
}: {
  dir: "up" | "down"
  disabled: boolean
  onClick: () => void
}) {
  const Icon = dir === "up" ? ChevronUp : ChevronDown
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={dir === "up" ? "위로" : "아래로"}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      className="rounded-md bg-background/90 p-1 text-muted-foreground shadow-sm hover:text-foreground disabled:opacity-30"
    >
      <Icon className="size-4" aria-hidden />
    </button>
  )
}

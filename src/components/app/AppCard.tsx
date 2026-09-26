import { useState } from "react"
import { Link } from "react-router-dom"
import {
  Eye,
  QrCode,
  Heart,
  Bookmark,
  MessageCircle,
  ChevronUp,
  ChevronDown,
  Lock,
} from "lucide-react"
import { getCategory } from "@/config/categories"
import { AppThumbnail } from "@/components/app/AppThumbnail"
import { ShareDialog } from "@/components/app/ShareDialog"
import { displayTitle, type App } from "@/lib/apps"
import { cn } from "@/lib/utils"

/** 운영진 순서 조정 컨트롤(있으면 카드에 ▲▼ 노출). */
export type CardMove = {
  onUp: () => void
  onDown: () => void
  canUp: boolean
  canDown: boolean
}

/** 카드 담기(북마크) 토글 컨트롤(있으면 우상단 버튼 활성). */
export type CardBookmark = {
  active: boolean
  onToggle: () => void
}

/**
 * 앱 목록 카드 — 썸네일 / 제목 / 카테고리 태그 / 좋아요·담기 수.
 * 썸네일 좌상단 = 대표 분류 뱃지(1개). 하단 좌 = 작성자 사진·이름 / 우 = 조회·좋아요·댓글 수. move 가 주어지면(운영진) 좌하단 순서 ▲▼. bookmark 가 주어지면 우상단 담기 토글.
 * 교사 전용 자료는 썸네일 좌상단에 "교사 전용" 칩, 볼 권한이 없으면(locked) 썸네일 잠금 + 담기·공유 숨김.
 * 썸네일 좌하단 = 공유 버튼(QR·주소 복사 창) + (운영진이면) 순서 ▲▼.
 * 카드 높이 통일: 제목·한줄 소개 각 2줄 고정 높이(태그 줄 없음).
 */
export function AppCard({
  app,
  move,
  bookmark,
}: {
  app: App
  move?: CardMove
  bookmark?: CardBookmark
}) {
  const cats = app.categoryIds.map((id) => getCategory(id)).filter((c) => !!c)
  // 대표 분류 = 첫 번째 상위 분류 1개만 썸네일 좌상단 뱃지(짧은 이름 우선).
  // 여러 과목에 걸친 자료도 카드엔 대표만 — 실제 분류 지정은 그대로 여러 개.
  const main = cats.find((c) => !c.parentId)
  const mainLabel = main ? (main.shortName ?? main.name) : null
  // 잠긴 카드는 가운데 "인증교사 전용" 오버레이가 있으므로 칩 생략
  const teachersOnly = app.visibility === "teachers" && !app.locked
  const [shareOpen, setShareOpen] = useState(false)

  return (
    <>
      <Link
        to={`/app/${app.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-[border-color,box-shadow,translate] duration-200 hover:border-primary/50 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:hover:-translate-y-1"
      >
        <div className="relative aspect-video overflow-hidden bg-surface">
          {/* 호버 시 썸네일 살짝 확대 */}
          <div className="h-full w-full transition-transform duration-300 motion-safe:group-hover:scale-[1.04]">
            <AppThumbnail app={app} iconClassName="size-7" />
          </div>

          {/* 잠금 — 교사 전용인데 볼 권한 없음. 제목·썸네일만 보여준다. */}
          {app.locked && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm">
                <Lock className="size-3.5" aria-hidden />
                인증교사 전용
              </span>
            </div>
          )}

          {/* 썸네일 좌상단 — 대표 분류 뱃지 + (교사 전용이면) 교사 전용 칩 */}
          {(mainLabel || teachersOnly) && (
            <div className="absolute left-2 top-2 flex max-w-[calc(100%-8.5rem)] items-center gap-1">
              {mainLabel && (
                <span className="truncate rounded-full bg-primary/90 px-2.5 py-0.5 text-xs font-medium text-primary-foreground shadow-sm">
                  {mainLabel}
                </span>
              )}
              {teachersOnly && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium text-foreground shadow-sm">
                  <Lock className="size-3" aria-hidden />
                  교사 전용
                </span>
              )}
            </div>
          )}

          {/* 좌하단 — 운영진 순서 ▲▼. Link 내부라 기본동작 차단. */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1">
            {move && (
              <>
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
              </>
            )}
          </div>

          {/* 우상단 동작 묶음 — 공유(잠긴 자료 제외) + 담기. 썸네일 위에서도 읽히도록 불투명 흰 바탕.
              Link 내부라 기본동작 차단. */}
          {!app.locked && (app.appUrl || bookmark) && (
            <div className="absolute right-2 top-2 flex items-center gap-1">
              {app.appUrl && (
                <button
                  type="button"
                  title="공유(QR·주소 복사)"
                  aria-label="공유"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShareOpen(true)
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-border bg-background px-2.5 text-xs font-semibold text-foreground shadow-md transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <QrCode className="size-3.5" aria-hidden />
                  공유
                </button>
              )}
              {bookmark && (
                <button
                  type="button"
                  aria-label="담기"
                  aria-pressed={bookmark.active}
                  title="담기"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    bookmark.onToggle()
                  }}
                  className="flex size-7 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-md transition-colors hover:border-primary hover:text-primary"
                >
                  <Bookmark
                    className={cn("size-3.5", bookmark.active && "fill-current text-primary")}
                    aria-hidden
                  />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 px-4 pt-3.5 pb-3">
          {/* 카드 높이 통일 — 제목·한줄 소개 모두 항상 2줄 높이를 확보하고 넘치면 … */}
          <h3 className="line-clamp-2 min-h-[2lh] text-base font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
            {displayTitle(app)}
          </h3>
          <p className="line-clamp-2 min-h-[2lh] text-sm leading-snug text-muted-foreground">
            {app.summary}
          </p>

          {/* 하단 — 구분선 아래 좌: 작성자 / 우: 수치 */}
          <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1.5">
              <OwnerAvatar name={app.authorName} url={app.ownerAvatarUrl} />
              <span className="truncate">{app.authorName}</span>
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <span className="inline-flex items-center gap-1" title="조회수">
                <Eye className="size-3.5" aria-hidden />
                {app.viewCount}
              </span>
              <span className="inline-flex items-center gap-1" title="좋아요">
                <Heart className="size-3.5" aria-hidden />
                {app.likeCount}
              </span>
              <span className="inline-flex items-center gap-1" title="댓글">
                <MessageCircle className="size-3.5" aria-hidden />
                {app.commentCount}
              </span>
            </span>
          </div>
        </div>
      </Link>

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={displayTitle(app)}
        url={app.appUrl}
      />
    </>
  )
}

/** 작성자 원형 아바타 — 프로필 사진 있으면 사진, 없으면 이름 첫 글자. */
function OwnerAvatar({ name, url }: { name: string; url: string | null }) {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-[10px] font-medium text-muted-foreground">
      {url ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          className="size-full object-cover"
        />
      ) : (
        (name || "?").charAt(0).toUpperCase()
      )}
    </span>
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

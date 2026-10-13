import { useState } from "react"
import { Link } from "react-router-dom"
import {
  Eye,
  ExternalLink,
  Heart,
  Bookmark,
  MessageCircle,
  ChevronUp,
  ChevronDown,
  Lock,
  Share2,
} from "lucide-react"
import { getCategory } from "@/config/categories"
import { AppThumbnail } from "@/components/app/AppThumbnail"
import { ShareDialog } from "@/components/app/ShareDialog"
import { cardSummary, displayTitle, type App } from "@/lib/apps"
import { cn } from "@/lib/utils"
import { avatarTone, AVATAR_PHOTO } from "@/lib/avatarTone"
import { relativeTime } from "@/lib/time"

/** 아래줄 아이콘 버튼(바로가기·공유). */
const iconButtonClass =
  "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-primary"

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
 * 앱 목록 카드. 썸네일은 가리지 않는다 — 위에 얹는 건 우상단 담기(bookmark) 하나와 잠금 표시뿐.
 * 썸네일 아래 순서:
 *  1) 뱃지 줄 — 대표 분류 1개(과목 페이지면 contextCategoryId 우선) · 교사 전용 칩 · (운영진) 순서 ▲▼
 *  2) 제목(호버 시 초록 + 밑줄) 3) 한줄 소개 — 각 2줄 고정 높이(카드 높이 통일)
 *  4) 작성자 사진·이름 / 올린 때(상대 시각)
 *  5) 구분선 아래 조회·좋아요·댓글 수 / 바로가기(새 탭)·공유(QR·주소 복사 창)
 * 볼 권한이 없으면(locked) 썸네일 잠금 + 담기·바로가기·공유 숨김.
 */
export function AppCard({
  app,
  move,
  bookmark,
  contextCategoryId,
}: {
  app: App
  move?: CardMove
  bookmark?: CardBookmark
  /** 지금 보고 있는 과목 페이지의 과목 id. 이 자료에 포함돼 있으면 뱃지를 이 과목으로. */
  contextCategoryId?: string
}) {
  const cats = app.categoryIds.map((id) => getCategory(id)).filter((c) => !!c)
  // 대표 분류 = 첫 번째 상위 분류 1개만 썸네일 좌상단 뱃지(짧은 이름 우선).
  // 여러 과목에 걸친 자료도 카드엔 대표만 — 실제 분류 지정은 그대로 여러 개.
  const main =
    (contextCategoryId && cats.find((c) => c.id === contextCategoryId && !c.parentId)) ||
    cats.find((c) => !c.parentId)
  const mainLabel = main ? (main.shortName ?? main.name) : null
  // 잠긴 카드는 가운데 "인증교사 전용" 오버레이가 있으므로 칩 생략
  const teachersOnly = app.visibility === "teachers" && !app.locked
  const [shareOpen, setShareOpen] = useState(false)

  return (
    <>
      <Link
        to={`/app/${app.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-[border-color,box-shadow,translate] duration-200 hover:border-primary/50 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:hover:-translate-y-1"
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

          {/* 우상단 — 담기. 썸네일 위에서도 읽히도록 불투명 흰 바탕. */}
          {!app.locked && bookmark && (
            <div className="absolute right-2 top-2 flex items-center gap-1">
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
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 px-4 pt-3 pb-3">
          {/* 뱃지 줄 — 대표 분류 · 교사 전용. 운영진이면 오른쪽에 순서 ▲▼. 높이 고정(카드 정렬). */}
          <div className="flex h-6 items-center gap-1.5">
            {mainLabel && (
              <span className="truncate rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
                {mainLabel}
              </span>
            )}
            {teachersOnly && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-foreground px-2.5 py-0.5 text-xs font-bold text-background">
                <Lock className="size-3" aria-hidden />
                교사 전용
              </span>
            )}
            {move && (
              <span className="ml-auto flex shrink-0 items-center gap-1">
                <MoveButton dir="up" disabled={!move.canUp} onClick={move.onUp} />
                <MoveButton dir="down" disabled={!move.canDown} onClick={move.onDown} />
              </span>
            )}
          </div>

          {/* 카드 높이 통일 — 제목·한줄 소개 모두 항상 2줄 높이를 확보하고 넘치면 … */}
          <h3 className="line-clamp-2 min-h-[2lh] text-lg font-bold leading-snug tracking-tight decoration-2 underline-offset-4 transition-colors group-hover:text-primary group-hover:underline">
            {displayTitle(app)}
          </h3>
          <p className="line-clamp-2 min-h-[2lh] text-sm leading-snug text-muted-foreground">
            {cardSummary(app)}
          </p>

          {/* 작성자 · 올린 때 */}
          <div className="mt-auto flex items-center justify-between gap-3 pt-1 text-xs text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1.5">
              <OwnerAvatar name={app.authorName} url={app.ownerAvatarUrl} />
              <span className="truncate">{app.authorName}</span>
            </span>
            <span className="shrink-0">{relativeTime(app.createdAt)}</span>
          </div>

          {/* 구분선 아래 — 좌: 조회·좋아요·댓글 / 우: 바로가기·공유(잠긴 자료는 숨김) */}
          <div className="flex items-center justify-between gap-3 border-t border-border pt-2.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-3">
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
            {/* Link 내부라 기본동작을 막고, 바로가기는 window.open 으로 새 탭(iframe 금지 규칙). */}
            {!app.locked && app.appUrl && (
              <span className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  title="앱 바로가기(새 탭)"
                  aria-label="바로가기"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    window.open(app.appUrl, "_blank", "noopener")
                  }}
                  className={iconButtonClass}
                >
                  <ExternalLink className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  title="공유(QR·주소 복사)"
                  aria-label="공유"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShareOpen(true)
                  }}
                  className={iconButtonClass}
                >
                  <Share2 className="size-4" aria-hidden />
                </button>
              </span>
            )}
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
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full border text-[10px] font-medium",
        url ? AVATAR_PHOTO : avatarTone(name),
      )}
    >
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
      className="rounded-md border border-border p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
    >
      <Icon className="size-4" aria-hidden />
    </button>
  )
}

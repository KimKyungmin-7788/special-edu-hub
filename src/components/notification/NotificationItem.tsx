import { BadgeCheck, Megaphone } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { avatarTone, AVATAR_PHOTO } from "@/lib/avatarTone"
import {
  markNotificationsRead,
  notificationHref,
  notificationMessage,
  notificationQuote,
  relativeTime,
  type Notification,
} from "@/lib/notifications"
import { cn } from "@/lib/utils"

/**
 * 알림 한 줄 — 헤더 종 목록·마이페이지 알림 탭 공용.
 * 왼쪽 아바타(공지·인증은 아이콘) · 가운데 "닉네임님이 …" + “요약” + 시각 · 오른쪽 썸네일.
 * 안 읽은 알림은 연한 브랜드 바탕. 누르면 읽음 처리 후 해당 화면으로 간다.
 */
export function NotificationItem({
  n,
  onOpened,
}: {
  n: Notification
  /** 눌러서 읽음 처리한 뒤(목록 상태 갱신·드롭다운 닫기용) */
  onOpened?: (id: string) => void
}) {
  const navigate = useNavigate()
  const href = notificationHref(n)
  const quote = notificationQuote(n)
  const name = n.actor?.nickname?.trim() || "알 수 없는 사용자"
  const system = n.type === "notice" || n.type.startsWith("verify")

  function open() {
    if (!n.readAt) void markNotificationsRead([n.id])
    onOpened?.(n.id)
    if (!href) return
    if (/^https?:\/\//.test(href)) window.open(href, "_blank", "noopener")
    else navigate(href)
  }

  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent",
        !n.readAt && "bg-brand-soft",
      )}
    >
      {system ? (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-muted text-brand-muted-foreground">
          {n.type === "notice" ? (
            <Megaphone className="size-4" aria-hidden />
          ) : (
            <BadgeCheck className="size-4" aria-hidden />
          )}
        </span>
      ) : (
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border text-sm font-medium",
            n.actor?.avatarUrl ? AVATAR_PHOTO : avatarTone(name),
          )}
        >
          {n.actor?.avatarUrl ? (
            <img src={n.actor.avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            name.slice(0, 1)
          )}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-snug text-foreground">
          {n.type === "notice" ? (
            <>
              <span className="font-semibold">[공지]</span> {notificationMessage(n)}
            </>
          ) : system ? (
            notificationMessage(n)
          ) : (
            <>
              <span className="font-semibold">{name}</span>
              {notificationMessage(n)}
            </>
          )}
        </span>
        {quote && (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {n.type === "notice" || n.type === "verify_rejected" ? quote : `“${quote}”`}
          </span>
        )}
        <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          {!n.readAt && <span className="size-1.5 rounded-full bg-primary" aria-label="안 읽음" />}
          {relativeTime(n.createdAt)}
        </span>
      </span>

      {n.thumbnailUrl && (
        <img
          src={n.thumbnailUrl}
          alt=""
          loading="lazy"
          className="size-12 shrink-0 rounded-md border border-border object-cover"
        />
      )}
    </button>
  )
}

import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Bell } from "lucide-react"
import { NotificationItem } from "@/components/notification/NotificationItem"
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationsRead,
  subscribeNotifications,
  type Notification,
} from "@/lib/notifications"
import { cn } from "@/lib/utils"

/**
 * 헤더 알림 종 (트랙 E). 로그인 사용자만 그린다.
 * - 안 읽은 수 뱃지는 실시간(Realtime)으로 갱신.
 * - 누르면 최근 알림 목록(드롭다운). 아래 '전체 보기' → 마이페이지 알림 탭.
 */
export function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<Notification[] | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const openRef = useRef(open)
  openRef.current = open
  const { pathname, search } = useLocation()

  const refresh = useCallback(() => {
    getUnreadNotificationCount().then(setUnread)
    if (openRef.current) getNotifications(15).then(setItems)
  }, [])

  // 처음 + 실시간 변화
  useEffect(() => {
    refresh()
    return subscribeNotifications(userId, refresh)
  }, [userId, refresh])

  // 페이지를 옮기면 닫는다
  useEffect(() => setOpen(false), [pathname, search])

  // 바깥 클릭·Esc 로 닫기
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", onDown)
    window.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  function toggle() {
    const next = !open
    setOpen(next)
    if (next) {
      setItems(null)
      getNotifications(15).then(setItems)
    }
  }

  async function readAll() {
    await markNotificationsRead()
    setItems((prev) => prev?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) ?? null)
    setUnread(0)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread > 0 ? `알림 ${unread}개 안 읽음` : "알림"}
        className={cn(
          "relative flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent",
          open && "bg-accent",
        )}
      >
        <Bell className="size-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="알림"
          className="fixed inset-x-2 top-16 z-50 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">알림</h2>
            {unread > 0 && (
              <button
                type="button"
                onClick={readAll}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                모두 읽음
              </button>
            )}
          </div>

          <div className="max-h-[min(28rem,calc(100svh-10rem))] overflow-y-auto">
            {items === null ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">불러오는 중…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                아직 알림이 없어요.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => (
                  <li key={n.id}>
                    <NotificationItem n={n} onOpened={() => setOpen(false)} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            to="/mypage?tab=notifications"
            className="block border-t border-border py-3 text-center text-sm font-medium hover:bg-accent"
          >
            전체 보기
          </Link>
        </div>
      )}
    </div>
  )
}

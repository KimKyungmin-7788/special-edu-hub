import { useEffect, useState } from "react"
import { NotificationItem } from "@/components/notification/NotificationItem"
import {
  getNotifications,
  markNotificationsRead,
  NOTIFICATION_PAGE,
  type Notification,
} from "@/lib/notifications"

/** 마이페이지 '알림' 탭 — 전체 알림(최신순), 모두 읽음, 더보기. */
export function NotificationList() {
  const [items, setItems] = useState<Notification[] | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    getNotifications().then((list) => {
      setItems(list)
      setHasMore(list.length === NOTIFICATION_PAGE)
    })
  }, [])

  async function more() {
    if (!items || items.length === 0 || loadingMore) return
    setLoadingMore(true)
    const next = await getNotifications(NOTIFICATION_PAGE, items[items.length - 1].createdAt)
    setItems([...items, ...next])
    setHasMore(next.length === NOTIFICATION_PAGE)
    setLoadingMore(false)
  }

  async function readAll() {
    await markNotificationsRead()
    setItems((prev) => prev?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) ?? null)
  }

  function markOne(id: string) {
    setItems((prev) =>
      prev?.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)) ?? null,
    )
  }

  if (items === null) return <p className="text-sm text-muted-foreground">불러오는 중…</p>

  const hasUnread = items.some((n) => !n.readAt)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          좋아요·댓글·답글·멘션·쪽지·교사인증·공지 소식을 모아 보여 줘요.
        </p>
        {hasUnread && (
          <button
            type="button"
            onClick={readAll}
            className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            모두 읽음
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-border px-4 py-10 text-center text-sm text-muted-foreground">
          아직 알림이 없어요.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {items.map((n) => (
            <li key={n.id}>
              <NotificationItem n={n} onOpened={markOne} />
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={more}
          disabled={loadingMore}
          className="mt-4 w-full rounded-lg border border-border py-3 text-sm font-medium hover:bg-accent disabled:opacity-60"
        >
          {loadingMore ? "불러오는 중…" : "더보기"}
        </button>
      )}
    </div>
  )
}

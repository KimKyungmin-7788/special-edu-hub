import { supabase } from "@/lib/supabase"

/**
 * 개인 알림 데이터 접근 일원화 지점 (트랙 E). 스키마·트리거는 supabase/41_notifications.sql.
 *
 * 알림은 전부 DB 트리거·RPC 가 만든다. 화면은 내 알림을 읽고 '읽음' 처리만 한다.
 *  - 목록: 최신순, 행동한 사람(actor) 프로필을 함께 가져온다.
 *  - 실시간: subscribeNotifications — 새 알림이 생기면 콜백(RLS 로 내 것만 온다).
 */

export type NotificationType =
  | "app_like"
  | "practice_like"
  | "comment_like"
  | "comment"
  | "reply"
  | "mention"
  | "message"
  | "verify_approved"
  | "verify_rejected"
  | "notice"

export type Notification = {
  id: string
  type: NotificationType
  actor: { id: string; nickname: string | null; avatarUrl: string | null } | null
  appId: string | null
  practiceId: string | null
  commentId: string | null
  title: string
  snippet: string
  thumbnailUrl: string
  link: string | null
  createdAt: string
  readAt: string | null
}

type NotificationRow = {
  id: string
  type: NotificationType
  app_id: string | null
  practice_id: string | null
  comment_id: string | null
  title: string
  snippet: string
  thumbnail_url: string
  link: string | null
  created_at: string
  read_at: string | null
  actor: { id: string; nickname: string | null; avatar_url: string | null } | null
}

const SELECT =
  "id, type, app_id, practice_id, comment_id, title, snippet, thumbnail_url, link, created_at, read_at, " +
  "actor:profiles!notifications_actor_id_fkey(id, nickname, avatar_url)"

function mapRow(r: NotificationRow): Notification {
  return {
    id: r.id,
    type: r.type,
    actor: r.actor
      ? { id: r.actor.id, nickname: r.actor.nickname, avatarUrl: r.actor.avatar_url }
      : null,
    appId: r.app_id,
    practiceId: r.practice_id,
    commentId: r.comment_id,
    title: r.title,
    snippet: r.snippet,
    thumbnailUrl: r.thumbnail_url,
    link: r.link,
    createdAt: r.created_at,
    readAt: r.read_at,
  }
}

export const NOTIFICATION_PAGE = 20

/** 내 알림(최신순). before 를 주면 그 시각보다 오래된 것(더보기). */
export async function getNotifications(
  limit = NOTIFICATION_PAGE,
  before?: string,
): Promise<Notification[]> {
  let q = supabase
    .from("notifications")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (before) q = q.lt("created_at", before)
  const { data, error } = await q
  if (error) {
    console.error("[notifications] getNotifications 실패:", error.message)
    return []
  }
  return (data as unknown as NotificationRow[]).map(mapRow)
}

/** 안 읽은 알림 수. */
export async function getUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null)
  if (error) {
    console.error("[notifications] getUnreadNotificationCount 실패:", error.message)
    return 0
  }
  return count ?? 0
}

/** 읽음 처리. ids 를 안 주면 전부. */
export async function markNotificationsRead(ids?: string[]): Promise<void> {
  const { error } = await supabase.rpc("mark_notifications_read", { p_ids: ids ?? null })
  if (error) console.error("[notifications] markNotificationsRead 실패:", error.message)
}

/** 운영진 공지 보내기(전체 회원). 보낸 수를 돌려준다. */
export async function sendNotice(title: string, body: string, link: string): Promise<number> {
  const { data, error } = await supabase.rpc("send_notice", {
    p_title: title,
    p_body: body,
    p_link: link.trim() || null,
  })
  if (error) throw error
  return Number(data ?? 0)
}

/** 내 알림 변화(새 알림·읽음) 구독. 해제 함수를 돌려준다. */
export function subscribeNotifications(userId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
      () => onChange(),
    )
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}

// ── 표시용 ────────────────────────────────────────────────

/** 행동한 사람 뒤에 붙는 문장. 공지·인증은 actor 없이 이 문장만. */
export function notificationMessage(n: Notification): string {
  switch (n.type) {
    case "app_like":
      return "님이 내 자료에 좋아요를 눌렀어요"
    case "practice_like":
      return "님이 내 수업 사례에 좋아요를 눌렀어요"
    case "comment_like":
      return "님이 내 댓글에 좋아요를 눌렀어요"
    case "comment":
      return "님이 내 글에 댓글을 남겼어요"
    case "reply":
      return "님이 내 댓글에 답글을 남겼어요"
    case "mention":
      return "님이 댓글에서 나를 언급했어요"
    case "message":
      return "님이 쪽지를 보냈어요"
    case "verify_approved":
      return "교사인증이 승인됐어요"
    case "verify_rejected":
      return "교사인증이 반려됐어요"
    case "notice":
      return n.title
  }
}

/** 따옴표로 보여 줄 요약. 좋아요(앱·사례)는 대상 제목, 그 밖에는 본문 요약. */
export function notificationQuote(n: Notification): string {
  if (n.type === "app_like" || n.type === "practice_like") return n.title
  return n.snippet
}

/** 누르면 갈 곳. 없으면 null. */
export function notificationHref(n: Notification): string | null {
  if (n.type === "notice") return n.link
  if (n.type === "message") return "/mypage?tab=messages"
  if (n.type === "verify_approved" || n.type === "verify_rejected") return "/verify"
  if (n.appId) return `/app/${n.appId}`
  if (n.practiceId) return `/practices/${n.practiceId}`
  return null
}

/** 21시간 전 · 1일 전 · 26.09.30 */
export function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return "방금 전"
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`
  const d = new Date(iso)
  const p = (x: number) => String(x).padStart(2, "0")
  return `${p(d.getFullYear() % 100)}.${p(d.getMonth() + 1)}.${p(d.getDate())}`
}

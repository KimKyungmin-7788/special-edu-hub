import { supabase } from "@/lib/supabase"

/**
 * 쪽지(1:1 메시지) 데이터 접근 일원화 지점 (2단계 묶음 E-1).
 * 스키마·RLS·RPC 는 supabase/08_messages.sql 참고.
 *
 * 보안은 전부 DB(RLS·RPC)에 있다. 이 파일은 그 위에서 화면이 쓰기 좋은 모양으로 감싼다.
 *  - 조회: RLS 가 "내 것 + 내 쪽 미삭제"만 돌려준다. 받은함/보낸함 구분은 sender/recipient 필터로.
 *  - 발신: sender_id 는 RLS(with check)가 강제 → 클라이언트가 보낸 값과 무관하게 위조 불가.
 *  - 수정(읽음/삭제): 직접 UPDATE 는 막혀 있고 RPC 로만. 본문·상대는 불변.
 */

/** 쪽지에 함께 표시할 상대 프로필(최소). */
export type MessageParty = {
  id: string
  nickname: string | null
  avatarUrl: string | null
}

/** 쪽지 한 건의 모양. DB 컬럼(snake_case)을 camelCase 로 변환해 쓴다. */
export type Message = {
  id: string
  body: string
  createdAt: string
  readAt: string | null
  sender: MessageParty
  recipient: MessageParty
}

type PartyRow = {
  id: string
  nickname: string | null
  avatar_url: string | null
}

type MessageRow = {
  id: string
  body: string
  created_at: string
  read_at: string | null
  sender: PartyRow | null
  recipient: PartyRow | null
}

// 조인 셀렉트(명시적 FK 임베드). 발신/수신 프로필을 한 번에 가져온다.
const SELECT_WITH_PARTIES =
  "id, body, created_at, read_at, " +
  "sender:profiles!messages_sender_id_fkey(id, nickname, avatar_url), " +
  "recipient:profiles!messages_recipient_id_fkey(id, nickname, avatar_url)"

function mapParty(row: PartyRow | null): MessageParty {
  // 프로필이 지워진 예외 상황까지 화면이 안 깨지게 방어.
  return {
    id: row?.id ?? "",
    nickname: row?.nickname ?? null,
    avatarUrl: row?.avatar_url ?? null,
  }
}

function mapRow(row: MessageRow): Message {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at,
    sender: mapParty(row.sender),
    recipient: mapParty(row.recipient),
  }
}

/** 현재 로그인 사용자 id(로컬 세션에서). 비로그인이면 null. */
async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

/**
 * 받은함: 내가 받은 쪽지(내가 삭제하지 않은 것), 최신순.
 * RLS 가 recipient_deleted_at is null 까지 걸러주므로 여기선 수신자 필터만.
 */
export async function getInbox(): Promise<Message[]> {
  const uid = await currentUserId()
  if (!uid) return []

  const { data, error } = await supabase
    .from("messages")
    .select(SELECT_WITH_PARTIES)
    .eq("recipient_id", uid)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[messages] getInbox 실패:", error.message)
    return []
  }
  return (data as unknown as MessageRow[]).map(mapRow)
}

/** 보낸함: 내가 보낸 쪽지(내가 삭제하지 않은 것), 최신순. */
export async function getSent(): Promise<Message[]> {
  const uid = await currentUserId()
  if (!uid) return []

  const { data, error } = await supabase
    .from("messages")
    .select(SELECT_WITH_PARTIES)
    .eq("sender_id", uid)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[messages] getSent 실패:", error.message)
    return []
  }
  return (data as unknown as MessageRow[]).map(mapRow)
}

/** 받은함의 안 읽은 쪽지 개수(헤더/탭 뱃지용). */
export async function getUnreadCount(): Promise<number> {
  const uid = await currentUserId()
  if (!uid) return 0

  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", uid)
    .is("read_at", null)
    .is("recipient_deleted_at", null)

  if (error) {
    console.error("[messages] getUnreadCount 실패:", error.message)
    return 0
  }
  return count ?? 0
}

/** 본문 길이 제한(스키마 check 와 동일). */
export const MESSAGE_MAX = 2000

/**
 * 쪽지 보내기. sender_id 는 RLS 가 강제하므로 보내지 않는다(위조 불가).
 * 본문은 trim 후 1~2000자. 자기 자신 금지는 DB 제약(messages_no_self)도 막지만 여기서도 거른다.
 */
export async function sendMessage(
  recipientId: string,
  body: string,
): Promise<void> {
  const uid = await currentUserId()
  if (!uid) throw new Error("로그인이 필요합니다.")

  const trimmed = body.trim()
  if (trimmed.length === 0) throw new Error("내용을 입력하세요.")
  if (trimmed.length > MESSAGE_MAX)
    throw new Error(`내용은 최대 ${MESSAGE_MAX}자까지 가능합니다.`)
  if (recipientId === uid) throw new Error("자기 자신에게는 보낼 수 없습니다.")

  const { error } = await supabase.from("messages").insert({
    sender_id: uid,
    recipient_id: recipientId,
    body: trimmed,
  })
  if (error) throw error
}

/** 받은 쪽지 읽음 처리(수신자 본인만, RPC). 이미 읽은 건 무시된다. */
export async function markRead(id: string): Promise<void> {
  const { error } = await supabase.rpc("mark_message_read", { p_id: id })
  if (error) throw error
}

/** 쪽지 삭제(소프트, RPC). 내 쪽에서만 사라지고 상대 사본은 유지된다. */
export async function deleteMessage(id: string): Promise<void> {
  const { error } = await supabase.rpc("delete_message", { p_id: id })
  if (error) throw error
}

// ── 대화방(스레드) — 메신저식 (사람별로 묶기) ─────────────
// 조회는 기존 RLS(내 것 + 내 쪽 미삭제)로 충분 → 클라이언트에서 상대별로 묶는다.
// 일괄 읽음/나가기만 RPC(18_messages_thread.sql).

/** 대화 목록 한 줄: 상대 + 마지막 메시지 요약 + 안 읽음 수. */
export type Conversation = {
  other: MessageParty
  lastBody: string
  lastAt: string
  /** 마지막 메시지를 내가 보냈는지(목록 미리보기에 "나: " 표시용). */
  lastFromMe: boolean
  unreadCount: number
}

/**
 * 대화 목록: 내 모든 쪽지(보낸+받은, RLS 가 삭제분 제외)를 상대별로 묶는다.
 * 최근 대화가 위로 온다. 안 읽음 수는 그 상대에게서 받은 미열람 쪽지 개수.
 */
export async function getConversations(): Promise<Conversation[]> {
  const uid = await currentUserId()
  if (!uid) return []

  const { data, error } = await supabase
    .from("messages")
    .select(SELECT_WITH_PARTIES)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[messages] getConversations 실패:", error.message)
    return []
  }

  const rows = (data as unknown as MessageRow[]).map(mapRow)
  // 행은 최신순 → 각 상대를 처음 만나는 순간이 그 대화의 최신. Map 삽입 순서가
  // 곧 최신순 정렬이 된다.
  const byOther = new Map<string, Conversation>()
  for (const m of rows) {
    const mine = m.sender.id === uid
    const other = mine ? m.recipient : m.sender
    if (!other.id) continue // 프로필이 지워진 예외 방어

    let conv = byOther.get(other.id)
    if (!conv) {
      conv = {
        other,
        lastBody: m.body,
        lastAt: m.createdAt,
        lastFromMe: mine,
        unreadCount: 0,
      }
      byOther.set(other.id, conv)
    }
    if (!mine && m.readAt === null) conv.unreadCount++
  }
  return Array.from(byOther.values())
}

/** 한 상대와 주고받은 모든 쪽지, 시간순(오래된 것부터 → 말풍선 위→아래). */
export async function getThread(otherId: string): Promise<Message[]> {
  const uid = await currentUserId()
  if (!uid) return []

  const { data, error } = await supabase
    .from("messages")
    .select(SELECT_WITH_PARTIES)
    .or(
      `and(sender_id.eq.${uid},recipient_id.eq.${otherId}),` +
        `and(sender_id.eq.${otherId},recipient_id.eq.${uid})`,
    )
    .order("created_at", { ascending: true })

  if (error) {
    console.error("[messages] getThread 실패:", error.message)
    return []
  }
  return (data as unknown as MessageRow[]).map(mapRow)
}

/** 대화방 열 때: 그 상대에게서 받은 안 읽은 쪽지를 한 번에 읽음(RPC). */
export async function markThreadRead(otherId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_thread_read", { p_other: otherId })
  if (error) throw error
}

/** 대화방 나가기: 그 상대와의 쪽지를 내 쪽에서만 소프트 삭제(RPC). 상대 사본 유지. */
export async function deleteThread(otherId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_thread", { p_other: otherId })
  if (error) throw error
}

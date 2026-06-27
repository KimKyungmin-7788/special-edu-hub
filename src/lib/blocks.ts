import { supabase } from "@/lib/supabase"

/**
 * 차단(block) 데이터 접근 일원화 지점 (묶음 R-1).
 * 스키마·RLS·헬퍼는 supabase/16_blocks.sql 참고.
 *
 * 보안은 전부 DB(RLS)에 있다. 이 파일은 그 위에서 화면이 쓰기 좋은 모양으로 감싼다.
 *  - 조회: RLS 가 "내가 차단한 행(blocker = 나)"만 돌려준다.
 *  - 추가/해제: blocker 는 RLS(with check)가 강제 → 위조 불가.
 *  - 발신 차단(쪽지)은 messages 의 insert 정책이 is_blocked 로 막는다(여기 책임 아님).
 */

/** 내가 차단한 상대(목록 표시용). */
export type BlockedUser = {
  id: string
  nickname: string | null
  avatarUrl: string | null
  blockedAt: string
}

type BlockRow = {
  blocked_id: string
  created_at: string
  blocked: {
    id: string
    nickname: string | null
    avatar_url: string | null
  } | null
}

/** 현재 로그인 사용자 id(로컬 세션에서). 비로그인이면 null. */
async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

/** 내가 차단한 사용자 목록(최신순). 차단한 상대의 프로필을 함께 가져온다. */
export async function getMyBlocks(): Promise<BlockedUser[]> {
  const uid = await currentUserId()
  if (!uid) return []

  const { data, error } = await supabase
    .from("blocks")
    .select(
      "blocked_id, created_at, " +
        "blocked:profiles!blocks_blocked_id_fkey(id, nickname, avatar_url)",
    )
    .eq("blocker_id", uid)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[blocks] getMyBlocks 실패:", error.message)
    return []
  }
  return (data as unknown as BlockRow[]).map((row) => ({
    id: row.blocked?.id ?? row.blocked_id,
    nickname: row.blocked?.nickname ?? null,
    avatarUrl: row.blocked?.avatar_url ?? null,
    blockedAt: row.created_at,
  }))
}

/** 내가 이 사용자를 차단했는지(프로필 모달의 버튼 상태용). */
export async function isBlockedByMe(userId: string): Promise<boolean> {
  const uid = await currentUserId()
  if (!uid) return false

  const { count, error } = await supabase
    .from("blocks")
    .select("blocked_id", { count: "exact", head: true })
    .eq("blocker_id", uid)
    .eq("blocked_id", userId)

  if (error) {
    console.error("[blocks] isBlockedByMe 실패:", error.message)
    return false
  }
  return (count ?? 0) > 0
}

/** 차단 추가. blocker 는 RLS 가 강제하므로 보내지 않는다(위조 불가). */
export async function blockUser(blockedId: string): Promise<void> {
  const uid = await currentUserId()
  if (!uid) throw new Error("로그인이 필요합니다.")
  if (blockedId === uid) throw new Error("자기 자신은 차단할 수 없습니다.")

  // 이미 차단돼 있어도 조용히 통과(중복은 PK 충돌 → ignore).
  const { error } = await supabase
    .from("blocks")
    .upsert({ blocker_id: uid, blocked_id: blockedId }, { onConflict: "blocker_id,blocked_id" })
  if (error) throw error
}

/** 차단 해제. */
export async function unblockUser(blockedId: string): Promise<void> {
  const uid = await currentUserId()
  if (!uid) throw new Error("로그인이 필요합니다.")

  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", uid)
    .eq("blocked_id", blockedId)
  if (error) throw error
}

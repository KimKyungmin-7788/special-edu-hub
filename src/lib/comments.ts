import { supabase } from "@/lib/supabase"
import { getMyBlocks } from "@/lib/blocks"

/**
 * 댓글(comment) 데이터 접근 일원화 지점 (PRD 4단계, 묶음 C-1).
 * 스키마·RLS·RPC 는 supabase/19_comments.sql 참고.
 *
 * 보안은 전부 DB(RLS·RPC)에 있다. 이 파일은 그 위에서 화면이 쓰기 좋은 모양으로 감싼다.
 *  - 조회: 공개읽기(미삭제). 작성자 닉네임·아바타를 함께 가져온다(ProfileTrigger 연결용).
 *  - 작성: author_id 는 RLS(with check)가 강제 → 클라가 보낸 값과 무관하게 위조 불가.
 *  - 삭제: delete_comment RPC(본인/운영진만, 소프트삭제). 직접 UPDATE/DELETE 는 막혀 있다.
 *  - 이번 범위는 평면 댓글(대댓글·수정 없음).
 */

/** 댓글 한 건(목록 표시용). 작성자 프로필을 함께 가져온다. */
export type Comment = {
  id: string
  appId: string
  body: string
  createdAt: string
  author: {
    id: string
    nickname: string | null
    avatarUrl: string | null
  }
}

type CommentRow = {
  id: string
  app_id: string
  body: string
  created_at: string
  author: {
    id: string
    nickname: string | null
    avatar_url: string | null
  } | null
}

const SELECT_WITH_AUTHOR =
  "id, app_id, body, created_at, " +
  "author:profiles!comments_author_id_fkey(id, nickname, avatar_url)"

function mapComment(row: CommentRow): Comment {
  return {
    id: row.id,
    appId: row.app_id,
    body: row.body,
    createdAt: row.created_at,
    author: {
      id: row.author?.id ?? "",
      nickname: row.author?.nickname ?? null,
      avatarUrl: row.author?.avatar_url ?? null,
    },
  }
}

/** 현재 로그인 사용자 id(로컬 세션에서). 비로그인이면 null. */
async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

/** 본문 길이 제한. */
export const COMMENT_BODY_MAX = 1000

/**
 * 한 앱의 댓글 목록(오래된 순). 미삭제만(RLS).
 * 내가 차단한 사용자의 댓글은 클라에서 가린다(차단=내 화면에서 안 보이게).
 */
export async function getComments(appId: string): Promise<Comment[]> {
  const [{ data, error }, blocks] = await Promise.all([
    supabase
      .from("comments")
      .select(SELECT_WITH_AUTHOR)
      .eq("app_id", appId)
      .order("created_at", { ascending: true }),
    getMyBlocks(),
  ])

  if (error) {
    console.error("[comments] getComments 실패:", error.message)
    return []
  }
  const blockedIds = new Set(blocks.map((b) => b.id))
  return (data as unknown as CommentRow[])
    .map(mapComment)
    .filter((c) => !blockedIds.has(c.author.id))
}

/** 댓글 작성. author_id 는 RLS 가 강제하므로 보내지 않는다(위조 불가). */
export async function addComment(appId: string, body: string): Promise<void> {
  const uid = await currentUserId()
  if (!uid) throw new Error("로그인이 필요합니다.")

  const trimmed = body.trim()
  if (trimmed === "") throw new Error("댓글 내용을 입력하세요.")
  if (trimmed.length > COMMENT_BODY_MAX)
    throw new Error(`댓글은 최대 ${COMMENT_BODY_MAX}자까지 가능합니다.`)

  const { error } = await supabase
    .from("comments")
    .insert({ app_id: appId, author_id: uid, body: trimmed })
  if (error) throw error
}

/** 댓글 삭제(소프트). 본인/운영진만(RPC 가 권한 강제). */
export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.rpc("delete_comment", { p_id: id })
  if (error) throw error
}

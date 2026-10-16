import { supabase } from "@/lib/supabase"
import { getMyBlocks } from "@/lib/blocks"
import { getCurrentNicknames, mentionedIds, plainMentions } from "@/lib/mentions"
import { downscaleImage } from "@/lib/image"

/**
 * 댓글(comment) 데이터 접근 일원화 지점 (PRD 4단계, 묶음 C-1).
 * 스키마·RLS·RPC 는 supabase/19_comments.sql 참고.
 *
 * 보안은 전부 DB(RLS·RPC)에 있다. 이 파일은 그 위에서 화면이 쓰기 좋은 모양으로 감싼다.
 *  - 조회: 공개읽기(미삭제). 작성자 닉네임·아바타를 함께 가져온다(ProfileTrigger 연결용).
 *  - 작성: author_id 는 RLS(with check)가 강제 → 클라가 보낸 값과 무관하게 위조 불가.
 *  - 삭제: delete_comment RPC(본인/운영진만, 소프트삭제). 직접 UPDATE/DELETE 는 막혀 있다.
 *  - 답글 = 1단계(최상위 댓글에만, 39_comment_replies.sql).
 *  - 수정 = edit_comment RPC(본인만, '(수정됨)'). 좋아요 = comment_likes 토글(40_comment_likes_edit.sql).
 *  - 멘션 = 본문 안 토큰(lib/mentions). 표시 이름은 현재 닉네임으로 맞춘다.
 *  - 이미지 = 최대 4장, 인증교사만. 공개 버킷 comment-images(42_comment_images.sql).
 *    DB 에는 경로만 두고 주소는 여기서 만든다. 본문 없이 사진만 있는 댓글도 된다.
 */

/** 댓글에 붙은 이미지 한 장. path = Storage 경로, url = 공개 주소. */
export type CommentImage = { path: string; url: string }

/** 댓글 한 건(목록 표시용). 작성자 프로필을 함께 가져온다. */
export type Comment = {
  id: string
  appId: string
  /** 답글이면 최상위 댓글 id, 최상위 댓글이면 null. */
  parentId: string | null
  /** 저장된 본문(멘션 토큰 포함). 표시는 parseMentions 로. */
  body: string
  createdAt: string
  /** 수정했으면 그 시각(화면에 '(수정됨)'). */
  editedAt: string | null
  /** 첨부 이미지(최대 4장). */
  images: CommentImage[]
  likeCount: number
  /** 내가 좋아요를 눌렀는지(비로그인이면 false). */
  likedByMe: boolean
  /** 본문에 멘션된 사용자의 현재 닉네임(id → 닉네임). 없으면 토큰 안 이름을 쓴다. */
  mentionNames: Record<string, string>
  author: {
    id: string
    nickname: string | null
    avatarUrl: string | null
  }
}

type CommentRow = {
  id: string
  app_id: string
  parent_id: string | null
  body: string
  created_at: string
  edited_at: string | null
  images: string[] | null
  like_count: number
  author: {
    id: string
    nickname: string | null
    avatar_url: string | null
  } | null
}

const SELECT_WITH_AUTHOR =
  "id, app_id, parent_id, body, created_at, edited_at, images, like_count, " +
  "author:profiles!comments_author_id_fkey(id, nickname, avatar_url)"

function mapComment(row: CommentRow): Comment {
  return {
    id: row.id,
    appId: row.app_id,
    parentId: row.parent_id,
    body: row.body,
    mentionNames: {},
    createdAt: row.created_at,
    editedAt: row.edited_at,
    images: (row.images ?? []).map(toCommentImage),
    likeCount: row.like_count ?? 0,
    likedByMe: false,
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

/** 댓글이 달리는 대상 — 앱 자료 또는 수업실천사례(34_practice_engagement.sql). */
export type CommentTarget = { kind: "app"; id: string } | { kind: "practice"; id: string }

function targetColumn(t: CommentTarget) {
  return t.kind === "app" ? "app_id" : "practice_id"
}

/** 본문 길이 제한. */
export const COMMENT_BODY_MAX = 1000

/** 이미지 첨부 제한(42_comment_images.sql 과 같게). */
export const COMMENT_IMAGE_MAX = 4
const IMAGE_BUCKET = "comment-images"
const IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const COMMENT_IMAGE_MIME = ["image/png", "image/jpeg", "image/webp", "image/gif"]
const IMAGE_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
}

function toCommentImage(path: string): CommentImage {
  return { path, url: supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl }
}

/** 이미지 한 장을 줄여서 올리고 경로를 돌려준다. 경로 comment-images/<uid>/<uuid>.<ext>. */
async function uploadCommentImage(uid: string, file: File): Promise<string> {
  if (!COMMENT_IMAGE_MIME.includes(file.type))
    throw new Error("이미지(PNG·JPG·WebP·GIF) 파일만 첨부할 수 있습니다.")
  const small = await downscaleImage(file)
  if (small.size > IMAGE_MAX_BYTES) throw new Error("이미지는 한 장에 5MB 이하만 첨부할 수 있습니다.")

  const path = `${uid}/${crypto.randomUUID()}.${IMAGE_EXT[small.type] ?? "webp"}`
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, small, { cacheControl: "3600", upsert: false, contentType: small.type })
  if (error) throw error
  return path
}

/** 올린 이미지를 지운다(실패해도 무시 — 등록 실패·수정 때 뺀 사진 정리용). */
async function removeCommentImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(IMAGE_BUCKET).remove(paths)
  if (error) console.error("[comments] 이미지 정리 실패:", error.message)
}

/** 새 파일들을 올린다. 하나라도 실패하면 이미 올린 것을 지우고 오류를 던진다. */
async function uploadAll(uid: string, files: File[]): Promise<string[]> {
  const done: string[] = []
  try {
    for (const f of files) done.push(await uploadCommentImage(uid, f))
    return done
  } catch (err) {
    await removeCommentImages(done)
    throw err
  }
}

/** 본문 검사(사진이 있으면 본문은 비워도 된다). 다듬은 본문을 돌려준다. */
function checkBody(body: string, imageCount: number): string {
  const trimmed = body.trim()
  if (trimmed === "" && imageCount === 0) throw new Error("댓글 내용을 입력하세요.")
  if (plainMentions(trimmed).length > COMMENT_BODY_MAX)
    throw new Error(`댓글은 최대 ${COMMENT_BODY_MAX}자까지 가능합니다.`)
  if (imageCount > COMMENT_IMAGE_MAX)
    throw new Error(`이미지는 최대 ${COMMENT_IMAGE_MAX}장까지 첨부할 수 있습니다.`)
  return trimmed
}

/**
 * 한 대상(앱·사례)의 댓글 목록(오래된 순). 미삭제만(RLS).
 * 내가 차단한 사용자의 댓글은 클라에서 가린다(차단=내 화면에서 안 보이게).
 */
export async function getComments(target: CommentTarget): Promise<Comment[]> {
  const [{ data, error }, blocks] = await Promise.all([
    supabase
      .from("comments")
      .select(SELECT_WITH_AUTHOR)
      .eq(targetColumn(target), target.id)
      .order("created_at", { ascending: true }),
    getMyBlocks(),
  ])

  if (error) {
    console.error("[comments] getComments 실패:", error.message)
    return []
  }
  const blockedIds = new Set(blocks.map((b) => b.id))
  const list = (data as unknown as CommentRow[])
    .map(mapComment)
    .filter((c) => !blockedIds.has(c.author.id))

  // 멘션 표시 이름을 현재 닉네임으로(닉네임을 바꿔도 반영되게) + 내가 누른 좋아요
  const [names, liked] = await Promise.all([
    getCurrentNicknames([...new Set(list.flatMap((c) => mentionedIds(c.body)))]),
    myLikedCommentIds(list.map((c) => c.id)),
  ])
  for (const c of list) {
    for (const id of mentionedIds(c.body)) {
      const n = names.get(id)
      if (n) c.mentionNames[id] = n
    }
    c.likedByMe = liked.has(c.id)
  }
  return list
}

/**
 * 댓글·답글 작성. author_id 는 RLS 가 강제한다(위조 불가).
 * parentId 를 주면 답글 — 최상위·미삭제·같은 대상인지는 DB 정책이 검사한다.
 * body 는 멘션 토큰이 들어간 저장 형식. 글자 수는 사람이 읽는 형태로 센다.
 * files 는 첨부 이미지(인증교사만 — 업로드·저장 모두 DB 가 검사). 등록에 실패하면 올린 파일을 지운다.
 */
export async function addComment(
  target: CommentTarget,
  body: string,
  parentId: string | null = null,
  files: File[] = [],
): Promise<void> {
  const uid = await currentUserId()
  if (!uid) throw new Error("로그인이 필요합니다.")

  const trimmed = checkBody(body, files.length)
  const images = await uploadAll(uid, files)

  const { error } = await supabase
    .from("comments")
    .insert({
      [targetColumn(target)]: target.id,
      author_id: uid,
      body: trimmed,
      parent_id: parentId,
      images,
    })
  if (error) {
    await removeCommentImages(images)
    throw error
  }
}

/** 댓글 삭제(소프트). 본인/운영진만(RPC 가 권한 강제). */
export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.rpc("delete_comment", { p_id: id })
  if (error) throw error
}

/**
 * 댓글 수정(본인만). body 는 멘션 토큰이 들어간 저장 형식.
 * before = 수정 전 이미지 경로, kept = 그중 남길 것, files = 새로 더할 이미지.
 * 저장에 성공하면 뺀 사진을 Storage 에서 지우고, 실패하면 새로 올린 것을 지운다.
 */
export async function editComment(
  id: string,
  body: string,
  before: string[] = [],
  kept: string[] = before,
  files: File[] = [],
): Promise<void> {
  const uid = await currentUserId()
  if (!uid) throw new Error("로그인이 필요합니다.")

  const trimmed = checkBody(body, kept.length + files.length)
  const added = await uploadAll(uid, files)
  const images = [...kept, ...added]

  const { error } = await supabase.rpc("edit_comment", {
    p_id: id,
    p_body: trimmed,
    p_images: images,
  })
  if (error) {
    await removeCommentImages(added)
    throw error
  }
  await removeCommentImages(before.filter((p) => !kept.includes(p)))
}

/** 이 댓글들 가운데 내가 좋아요 한 것(비로그인이면 빈 집합). */
async function myLikedCommentIds(ids: string[]): Promise<Set<string>> {
  const uid = await currentUserId()
  if (!uid || ids.length === 0) return new Set()
  const { data, error } = await supabase
    .from("comment_likes")
    .select("comment_id")
    .eq("user_id", uid)
    .in("comment_id", ids)
  if (error) {
    console.error("[comments] myLikedCommentIds 실패:", error.message)
    return new Set()
  }
  return new Set((data as { comment_id: string }[]).map((r) => r.comment_id))
}

/** 댓글 좋아요 토글. 누른 뒤 상태(true=좋아요)를 돌려준다. */
export async function toggleCommentLike(commentId: string, liked: boolean): Promise<boolean> {
  const uid = await currentUserId()
  if (!uid) throw new Error("로그인이 필요합니다.")
  if (liked) {
    const { error } = await supabase
      .from("comment_likes")
      .delete()
      .eq("user_id", uid)
      .eq("comment_id", commentId)
    if (error) throw error
    return false
  }
  const { error } = await supabase
    .from("comment_likes")
    .insert({ user_id: uid, comment_id: commentId })
  if (error) throw error
  return true
}

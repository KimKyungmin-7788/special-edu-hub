import { isTrainingStage, type TrainingStage } from "@/config/training"
import type { WhySlide } from "@/components/vibecoding/setup/steps"
import DOMPurify from "dompurify"
import { supabase } from "@/lib/supabase"
import { getMyBlocks } from "@/lib/blocks"
import { stripResearchImageSrc } from "@/lib/researchImages"

export type BoardSlug = "free" | "research" | "training"
export const boardName = (slug: BoardSlug) => slug === "research" ? "연구회게시판" : slug === "training" ? "함께 여는 연수" : "자유게시판"
/** 글 목록·글 보기 주소 — 함께 여는 연수(49)는 열린연수방 안에 있다 */
export const boardListPath = (slug: BoardSlug) => slug === "training" ? "/training/share" : `/board/${slug}`
export const boardPostPath = (slug: BoardSlug, id: string) => slug === "training" ? `/training/share/${id}` : `/board/${id}`

export const BOARD_PAGE_SIZE = 15
export const POST_TITLE_MAX = 100
export const POST_BODY_MAX = 100000
export type BoardPost = {
  id: string
  boards: { slug: BoardSlug }
  author_id: string
  title: string
  body: string
  pinned: boolean
  created_at: string
  updated_at: string
  view_count: number
  like_count: number
  author: { nickname: string | null; avatar_url: string | null } | null
  comments: { count: number }[]
  /** 함께 여는 연수(49)만 — 카드 대표 사진과 연수 자료 링크 */
  cover_url?: string | null
  links?: TrainingLink[]
  training_stage?: TrainingStage | null
  visibility?: "public" | "private"
  training_slides?: WhySlide[] | null
}
export type TrainingLinkKind = "slides" | "video" | "file" | "link"
export type TrainingLink = { kind: TrainingLinkKind; label: string; url: string }
/** label = 글쓰기·글 보기, short = 카드의 작은 표시 */
export const TRAINING_LINK_KINDS: { kind: TrainingLinkKind; label: string; short: string }[] = [
  { kind: "slides", label: "HTML 슬라이드", short: "슬라이드" },
  { kind: "video", label: "영상", short: "영상" },
  { kind: "file", label: "자료", short: "자료" },
  { kind: "link", label: "링크", short: "링크" },
]
export const TRAINING_LINK_MAX = 10
const POST_SELECT = "id, author_id, title, pinned, created_at, updated_at, view_count, like_count, author:profiles!posts_author_id_fkey(nickname, avatar_url), comments(count), boards!inner(slug)"

export function boardError(error: unknown): string {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : ""
  if (["42P01", "42703", "PGRST200", "PGRST202", "PGRST205"].includes(code))
    return "게시판 연결을 준비하고 있습니다. 잠시 후 다시 이용해 주세요."
  if (error instanceof Error) return error.message
  if (code === "P0001" && error && typeof error === "object" && "message" in error) return String(error.message)
  return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요."
}

export async function getBoardPosts(search: string, page: number, slug: BoardSlug = "free", filters?: { stage?: TrainingStage; kind?: TrainingLinkKind }) {
  const blocks = await getMyBlocks()
  // 함께 여는 연수 카드에는 대표 사진·링크가 필요하다(컬럼은 49 에만 있다)
  let query = supabase.from("posts").select(slug === "training" ? `${POST_SELECT}, cover_url, links, training_stage, visibility` : POST_SELECT, { count: "exact" })
    .eq("boards.slug", slug).is("deleted_at", null)
    .order("pinned", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false })
  if (slug === "training" && filters?.stage) query = query.eq("training_stage", filters.stage)
  if (slug === "training" && filters?.kind) query = query.contains("links", [{ kind: filters.kind }])
  if (search.trim()) query = query.ilike("title", `%${search.trim().replace(/[\\%_]/g, "\\$&")}%`)
  if (blocks.length) query = query.not("author_id", "in", `(${blocks.map((b) => b.id).join(",")})`)
  const { data, count, error } = await query.range((page - 1) * BOARD_PAGE_SIZE, page * BOARD_PAGE_SIZE - 1)
  if (error) throw error
  return { posts: data as unknown as BoardPost[], count: count ?? 0 }
}

export async function getBoardPost(id: string): Promise<BoardPost | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null
  const { data, error } = await supabase.from("posts").select(`${POST_SELECT}, body`)
    .eq("id", id).is("deleted_at", null).maybeSingle()
  if (error) throw error
  if (!data) return null
  const post = data as unknown as BoardPost
  const blocks = await getMyBlocks()
  if (blocks.some((b) => b.id === post.author_id)) return null
  // 대표 사진·링크 컬럼은 49 에만 있어, 다른 게시판 글은 따로 묻지 않는다
  if (post.boards.slug === "training") {
    const { data: extra, error: extraError } = await supabase.from("posts").select("cover_url, links, training_stage, visibility, training_slides").eq("id", id).single()
    if (extraError) throw extraError
    Object.assign(post, extra)
  }
  return post
}

export async function saveBoardPost(title: string, body: string, id?: string, slug: BoardSlug = "free"): Promise<string> {
  const sanitized = DOMPurify.sanitize(body)
  // 연구회 사진은 임시 주소를 지우고 위치만 저장한다(44 저장 규칙).
  const clean = slug === "research" ? stripResearchImageSrc(sanitized) : sanitized
  const text = new DOMParser().parseFromString(clean, "text/html").body.textContent?.trim()
  if (!title.trim() || [...title.trim()].length > POST_TITLE_MAX) throw new Error("제목은 1~100자로 입력하세요.")
  if (!text) throw new Error("본문 내용을 입력하세요.")
  if (clean.length > POST_BODY_MAX) throw new Error("본문이 너무 깁니다. 내용을 조금 줄여 주세요.")
  const { data, error } = await supabase.rpc("save_board_post_in_board", { p_title: title.trim(), p_body: clean, p_id: id ?? null, p_slug: slug })
  if (error) throw error
  return data as string
}
/** 함께 여는 연수 저장 — 제목·본문 검사는 게시판과 같고, 대표 사진·링크를 함께 넘긴다(49) */
export async function saveTrainingPost(title: string, body: string, coverUrl: string | null, links: TrainingLink[], stage: TrainingStage, visibility: "public" | "private", id?: string): Promise<string> {
  const clean = DOMPurify.sanitize(body)
  const text = new DOMParser().parseFromString(clean, "text/html").body.textContent?.trim()
  if (!title.trim() || [...title.trim()].length > POST_TITLE_MAX) throw new Error("제목은 1~100자로 입력하세요.")
  if (!text) throw new Error("본문 내용을 입력하세요.")
  if (clean.length > POST_BODY_MAX) throw new Error("본문이 너무 깁니다. 내용을 조금 줄여 주세요.")
  if (!isTrainingStage(stage)) throw new Error("연수 단계를 선택해 주세요.")
  const filled = links.map((l) => ({ ...l, label: l.label.trim(), url: l.url.trim() })).filter((l) => l.url)
  if (filled.some((l) => !/^https:\/\/\S+$/.test(l.url))) throw new Error("연수 자료 링크는 https:// 로 시작하는 주소로 넣어 주세요.")
  const { data, error } = await supabase.rpc("save_training_post_with_visibility", { p_title: title.trim(), p_body: clean, p_cover_url: coverUrl, p_links: filled, p_stage: stage, p_visibility: visibility, p_id: id ?? null })
  if (error) throw error
  return data as string
}
export async function deleteBoardPost(id: string) {
  const { error } = await supabase.rpc("delete_board_post", { p_id: id })
  if (error) throw error
}
export async function pinBoardPost(id: string, pinned: boolean) {
  const { error } = await supabase.rpc("pin_board_post", { p_id: id, p_pinned: pinned })
  if (error) throw error
}
export async function reportBoardPost(id: string, reason: string, detail: string) {
  const { error } = await supabase.rpc("report_board_post", { p_id: id, p_reason: reason, p_detail: detail.trim() || null })
  if (error) throw error
}

// ── 조회수·좋아요 (45_post_engagement.sql) ──────────────────

const VIEW_THROTTLE_MS = 24 * 60 * 60 * 1000 // 같은 글은 이 브라우저에서 하루 1회

/** 조회수 +1 (읽을 수 없는 글은 DB가 무시). 오류는 화면에 영향 없게 삼킨다. */
export async function incrementPostView(id: string): Promise<void> {
  try {
    const key = `viewed_post_${id}`
    if (Date.now() - Number(localStorage.getItem(key) || 0) < VIEW_THROTTLE_MS) return
    localStorage.setItem(key, String(Date.now()))
  } catch {
    // 저장 불가 환경이면 제한 없이 진행
  }
  const { error } = await supabase.rpc("increment_post_view", { p_post_id: id })
  if (error) console.error("[board] 조회수 실패:", error.message)
}

export async function isPostLiked(id: string): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  const uid = data.session?.user.id
  if (!uid) return false
  const { count, error } = await supabase.from("post_likes").select("post_id", { count: "exact", head: true }).eq("user_id", uid).eq("post_id", id)
  if (error) return false
  return (count ?? 0) > 0
}

/** 좋아요 켜기/끄기. 개수는 DB 트리거가 posts.like_count 에 반영. */
export async function setPostLike(id: string, on: boolean): Promise<void> {
  const { data } = await supabase.auth.getSession()
  const uid = data.session?.user.id
  if (!uid) throw new Error("로그인이 필요합니다.")
  const { error } = on
    ? await supabase.from("post_likes").insert({ user_id: uid, post_id: id })
    : await supabase.from("post_likes").delete().eq("user_id", uid).eq("post_id", id)
  if (error && error.code !== "23505") throw error // 이미 눌러 둔 경우(중복)는 성공으로 본다
}

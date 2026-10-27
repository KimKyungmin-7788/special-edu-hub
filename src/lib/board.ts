import DOMPurify from "dompurify"
import { supabase } from "@/lib/supabase"
import { getMyBlocks } from "@/lib/blocks"

export type BoardSlug = "free" | "research"
export const boardName = (slug: BoardSlug) => slug === "research" ? "연구회게시판" : "자유게시판"

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
  author: { nickname: string | null; avatar_url: string | null } | null
  comments: { count: number }[]
}
const POST_SELECT = "id, author_id, title, pinned, created_at, updated_at, author:profiles!posts_author_id_fkey(nickname, avatar_url), comments(count), boards!inner(slug)"

export function boardError(error: unknown): string {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : ""
  if (["42P01", "42703", "PGRST200", "PGRST202", "PGRST205"].includes(code))
    return "게시판 연결을 준비하고 있습니다. 잠시 후 다시 이용해 주세요."
  if (error instanceof Error) return error.message
  if (code === "P0001" && error && typeof error === "object" && "message" in error) return String(error.message)
  return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요."
}

export async function getBoardPosts(search: string, page: number, slug: BoardSlug = "free") {
  const blocks = await getMyBlocks()
  let query = supabase.from("posts").select(POST_SELECT, { count: "exact" })
    .eq("boards.slug", slug).is("deleted_at", null)
    .order("pinned", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false })
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
  return blocks.some((b) => b.id === post.author_id) ? null : post
}

export async function saveBoardPost(title: string, body: string, id?: string, slug: BoardSlug = "free"): Promise<string> {
  const clean = DOMPurify.sanitize(body)
  const text = new DOMParser().parseFromString(clean, "text/html").body.textContent?.trim()
  if (!title.trim() || [...title.trim()].length > POST_TITLE_MAX) throw new Error("제목은 1~100자로 입력하세요.")
  if (!text) throw new Error("본문 내용을 입력하세요.")
  if (clean.length > POST_BODY_MAX) throw new Error("본문이 너무 깁니다. 내용을 조금 줄여 주세요.")
  const { data, error } = await supabase.rpc("save_board_post_in_board", { p_title: title.trim(), p_body: clean, p_id: id ?? null, p_slug: slug })
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

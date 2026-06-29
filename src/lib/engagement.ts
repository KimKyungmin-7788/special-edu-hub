import { supabase } from "@/lib/supabase"
import { type App } from "@/lib/apps"

/**
 * 좋아요·담기·조회수 데이터 접근 일원화 지점 (트랙 B-1).
 * 스키마·RLS·트리거·RPC 는 supabase/24_likes_bookmarks.sql 참고.
 *
 *  - 토글: likes/bookmarks 에 본인 행 insert/delete(RLS 강제). 카운트는 트리거가 apps 컬럼에 유지.
 *  - 내 상태: 내 행만 조회(RLS) → isLiked/isBookmarked 용 id 집합.
 *  - 조회수: increment_view RPC. 새로고침 어뷰징은 클라 throttle(하루 1회/앱).
 */

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

type Table = "likes" | "bookmarks"

/** 토글 공통 — 있으면 삭제(false), 없으면 추가(true). 반환=토글 후 on 여부. */
async function toggle(table: Table, appId: string): Promise<boolean> {
  const uid = await currentUserId()
  if (!uid) throw new Error("로그인이 필요합니다.")

  const { count, error: selErr } = await supabase
    .from(table)
    .select("app_id", { count: "exact", head: true })
    .eq("user_id", uid)
    .eq("app_id", appId)
  if (selErr) throw selErr

  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("user_id", uid)
      .eq("app_id", appId)
    if (error) throw error
    return false
  }
  const { error } = await supabase.from(table).insert({ user_id: uid, app_id: appId })
  if (error) throw error
  return true
}

export function toggleLike(appId: string): Promise<boolean> {
  return toggle("likes", appId)
}
export function toggleBookmark(appId: string): Promise<boolean> {
  return toggle("bookmarks", appId)
}

/** 내가 좋아요/담기 한 app_id 집합(없거나 비로그인이면 빈 집합). 카드·상세 상태 표시용. */
async function myIds(table: Table): Promise<Set<string>> {
  const uid = await currentUserId()
  if (!uid) return new Set()
  const { data, error } = await supabase
    .from(table)
    .select("app_id")
    .eq("user_id", uid)
  if (error) {
    console.error(`[engagement] my ${table} 실패:`, error.message)
    return new Set()
  }
  return new Set((data as { app_id: string }[]).map((r) => r.app_id))
}

export function getMyLikedIds(): Promise<Set<string>> {
  return myIds("likes")
}
export function getMyBookmarkedIds(): Promise<Set<string>> {
  return myIds("bookmarks")
}

/** 내가 담기/좋아요 한 앱 목록(최신순) — 마이페이지용. apps 를 임베드한다. */
async function myApps(table: Table): Promise<App[]> {
  const uid = await currentUserId()
  if (!uid) return []
  const { data, error } = await supabase
    .from(table)
    .select("created_at, app:apps!inner(*)")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
  if (error) {
    console.error(`[engagement] my ${table} apps 실패:`, error.message)
    return []
  }
  // 임베드된 apps row → App. (mapRow 와 동일 매핑이 필요하므로 lib/apps 의 형태에 맞춘다)
  return (data as unknown as { app: AppRowLike }[])
    .map((r) => r.app)
    .filter(Boolean)
    .map(mapAppRow)
}

export function getMyBookmarkedApps(): Promise<App[]> {
  return myApps("bookmarks")
}
export function getMyLikedApps(): Promise<App[]> {
  return myApps("likes")
}

// apps row → App 매핑(lib/apps 의 mapRow 와 동일 모양). 임베드 결과에 쓰려고 별도 보관.
type AppRowLike = {
  id: string
  title: string
  app_url: string
  thumbnail_url: string
  author_name: string
  description: string
  category_ids: string[]
  view_count: number
  like_count: number
  bookmark_count: number
  created_at: string
  owner_id: string | null
  status: App["status"]
  sort_order: number | null
}
function mapAppRow(row: AppRowLike): App {
  return {
    id: row.id,
    title: row.title,
    appUrl: row.app_url,
    thumbnailUrl: row.thumbnail_url,
    authorName: row.author_name,
    description: row.description,
    categoryIds: row.category_ids ?? [],
    viewCount: row.view_count,
    likeCount: row.like_count,
    bookmarkCount: row.bookmark_count,
    createdAt: row.created_at,
    ownerId: row.owner_id ?? null,
    status: row.status,
    sortOrder: row.sort_order ?? null,
  }
}

// ── 조회수 ────────────────────────────────────────────────
const VIEW_THROTTLE_MS = 24 * 60 * 60 * 1000 // 하루 1회/앱

/** 조회수 +1. 같은 앱은 하루 1회만(localStorage throttle, 새로고침 어뷰징 방지). */
export async function incrementView(appId: string): Promise<void> {
  try {
    const key = `viewed_${appId}`
    const last = Number(localStorage.getItem(key) || 0)
    if (Date.now() - last < VIEW_THROTTLE_MS) return
    localStorage.setItem(key, String(Date.now()))
  } catch {
    // localStorage 불가 환경이면 throttle 없이 진행
  }
  const { error } = await supabase.rpc("increment_view", { p_app_id: appId })
  if (error) console.error("[engagement] increment_view 실패:", error.message)
}

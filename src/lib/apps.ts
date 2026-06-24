import { supabase } from "@/lib/supabase"
import { getCategory, type CategoryType } from "@/config/categories"

/**
 * 데이터 접근 일원화 지점.
 * 1단계: Supabase `apps` 테이블에서 읽는다(공개 읽기 RLS).
 * 화면·컴포넌트는 이 함수들의 반환 모양(App)만 의존하므로 그대로 둔다(BUILD.md 7).
 */

/** 앱 한 건의 모양. DB 컬럼(snake_case)을 이 camelCase 모양으로 변환해 쓴다. */
export type App = {
  id: string
  title: string
  appUrl: string // 새 탭 실행 대상
  thumbnailUrl: string
  authorName: string
  description: string // 블로그형 소개 본문
  categoryIds: string[] // categories.ts 의 id 참조
  viewCount: number
  likeCount: number
  bookmarkCount: number
  createdAt: string
}

/** DB row(snake_case) → App(camelCase) 변환. */
type AppRow = {
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
}

function mapRow(row: AppRow): App {
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
  }
}

/** 전체 앱 목록 (최신순). */
export async function getApps(): Promise<App[]> {
  const { data, error } = await supabase
    .from("apps")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[apps] getApps 실패:", error.message)
    return []
  }
  return (data as AppRow[]).map(mapRow)
}

/** id 로 단일 앱. */
export async function getApp(id: string): Promise<App | undefined> {
  const { data, error } = await supabase
    .from("apps")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("[apps] getApp 실패:", error.message)
    return undefined
  }
  return data ? mapRow(data as AppRow) : undefined
}

/** 특정 카테고리(과목·업무 id)에 속한 앱만 (최신순). */
export async function getAppsByCategory(categoryId: string): Promise<App[]> {
  const apps = await getApps()
  return apps.filter((a) => a.categoryIds.includes(categoryId))
}

/** 카테고리 타입('subject' | 'work')에 속한 앱만 (최신순). */
export async function getAppsByType(type: CategoryType): Promise<App[]> {
  const apps = await getApps()
  return apps.filter((a) =>
    a.categoryIds.some((id) => getCategory(id)?.type === type),
  )
}

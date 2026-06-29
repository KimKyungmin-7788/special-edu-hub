import { supabase } from "@/lib/supabase"
import { getCategory, type CategoryType } from "@/config/categories"

/**
 * 데이터 접근 일원화 지점.
 * 1단계: Supabase `apps` 테이블에서 읽는다(공개 읽기 RLS).
 * 화면·컴포넌트는 이 함수들의 반환 모양(App)만 의존하므로 그대로 둔다(BUILD.md 7).
 */

/** 앱 공개 상태. 'hidden' 은 삭제 대신 숨김(본인·관리자만 조회). */
export type AppStatus = "published" | "hidden"

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
  ownerId: string | null // 등록자(profiles.id). 시드앱은 null.
  status: AppStatus
  sortOrder: number | null // 과목 페이지 수동 정렬값(미지정=null → 최신순으로 뒤)
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
  owner_id: string | null
  status: AppStatus
  sort_order: number | null
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
    ownerId: row.owner_id ?? null,
    status: row.status,
    sortOrder: row.sort_order ?? null,
  }
}

/**
 * 과목 페이지 정렬 비교자 — 수동 순서(sort_order) 우선, 미지정은 뒤로(최신순).
 * 운영진이 정한 순서를 앞에 두고, 아직 순서 없는 앱은 created_at 내림차순으로 이어 붙인다.
 */
function byManualOrder(a: App, b: App): number {
  const ao = a.sortOrder
  const bo = b.sortOrder
  if (ao != null && bo != null) return ao - bo
  if (ao != null) return -1 // 순서 지정된 것이 앞
  if (bo != null) return 1
  return a.createdAt < b.createdAt ? 1 : -1 // 둘 다 미지정 → 최신순
}

/** 전체 앱 목록 (최신순). 공개(published)만 — RLS 와 별개로 명시적 이중 안전. */
export async function getApps(): Promise<App[]> {
  const { data, error } = await supabase
    .from("apps")
    .select("*")
    .eq("status", "published")
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

/**
 * 인기 점수 — 담기(2) + 좋아요(1) 가중합 (트랙 B-4).
 * 담기가 더 강한 관심 신호라 가중치를 높게. (조회수는 어뷰징 여지가 커 제외)
 * 현재 카운트는 시드값 + 실제 누적이 섞여 있다.
 */
export function popularityScore(a: App): number {
  return a.bookmarkCount * 2 + a.likeCount
}

/** 특정 카테고리(과목·업무 id)에 속한 앱만 (수동 순서 → 최신순). */
export async function getAppsByCategory(categoryId: string): Promise<App[]> {
  const apps = await getApps()
  return apps.filter((a) => a.categoryIds.includes(categoryId)).sort(byManualOrder)
}

/**
 * 특정 등록자(owner)의 공개 앱 목록 (최신순) — 프로필 모달 "작성 글 보기"용.
 * getApps 가 published 만 돌려주므로 남의 숨김앱은 노출되지 않는다.
 */
export async function getAppsByOwner(ownerId: string): Promise<App[]> {
  const apps = await getApps()
  return apps.filter((a) => a.ownerId === ownerId)
}

/** 카테고리 타입('subject' | 'work')에 속한 앱만 (수동 순서 → 최신순). */
export async function getAppsByType(type: CategoryType): Promise<App[]> {
  const apps = await getApps()
  return apps
    .filter((a) => a.categoryIds.some((id) => getCategory(id)?.type === type))
    .sort(byManualOrder)
}

/**
 * 과목 목록 수동 재정렬(운영진). orderedIds 순서대로 sort_order 를 0,1,2… 로 저장한다.
 * 현재 sort_order 와 다른 행만 갱신(불필요한 쓰기 최소화). 권한은 RLS(staff)가 강제.
 * 전역 단일 순서 모델 — 같은 앱이 여러 과목에 속하면 마지막 정렬이 우선한다(드문 경우).
 */
export async function reorderApps(orderedApps: App[]): Promise<void> {
  const changed = orderedApps
    .map((app, i) => ({ app, i }))
    .filter(({ app, i }) => app.sortOrder !== i)

  const results = await Promise.all(
    changed.map(({ app, i }) =>
      supabase.from("apps").update({ sort_order: i }).eq("id", app.id),
    ),
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) throw failed.error
}

// ── 쓰기(등록) — 3단계 묶음 F-1 ─────────────────────────────
// 인증교사만 등록 가능(RLS 가 최종 강제). 삭제는 없고 status='hidden' 으로 숨김.

const THUMBNAIL_BUCKET = "app-thumbnails"
const THUMBNAIL_MAX_BYTES = 2 * 1024 * 1024 // 2MB (버킷 정책과 동일)
export const THUMBNAIL_MIME = ["image/png", "image/jpeg", "image/webp", "image/gif"]

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

/** 등록/수정 입력. id·owner_id·status·집계수는 코드/RLS 가 정한다. */
export type AppInput = {
  title: string
  appUrl: string
  thumbnailUrl: string
  authorName: string
  description: string
  categoryIds: string[] // 상위+하위 분류 id 를 함께 넣는다
}

/**
 * 썸네일 업로드 → 공개 URL 반환. 경로 app-thumbnails/<uid>/<uuid>.<ext>.
 * RLS 가 본인 폴더만 허용하므로 폴더 첫 칸은 반드시 uid.
 */
export async function uploadThumbnail(file: File): Promise<string> {
  const uid = await currentUserId()
  if (!uid) throw new Error("로그인이 필요합니다.")
  if (!THUMBNAIL_MIME.includes(file.type))
    throw new Error("이미지(PNG·JPG·WebP·GIF) 파일만 업로드할 수 있습니다.")
  if (file.size > THUMBNAIL_MAX_BYTES)
    throw new Error("썸네일은 2MB 이하만 업로드할 수 있습니다.")

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin"
  const path = `${uid}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(THUMBNAIL_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from(THUMBNAIL_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/** 새 앱 등록. id 는 uuid 자동생성, owner_id=본인, status='published'(RLS 가 인증교사 강제). */
export async function createApp(input: AppInput): Promise<App> {
  const uid = await currentUserId()
  if (!uid) throw new Error("로그인이 필요합니다.")

  const title = input.title.trim()
  const appUrl = input.appUrl.trim()
  if (title === "") throw new Error("제목을 입력하세요.")
  if (appUrl === "") throw new Error("앱 URL 을 입력하세요.")
  if (input.categoryIds.length === 0)
    throw new Error("분류를 한 개 이상 선택하세요.")

  const { data, error } = await supabase
    .from("apps")
    .insert({
      id: crypto.randomUUID(),
      title,
      app_url: appUrl,
      thumbnail_url: input.thumbnailUrl,
      author_name: input.authorName.trim(),
      description: input.description,
      category_ids: input.categoryIds,
      owner_id: uid,
      status: "published",
    })
    .select()
    .single()

  if (error) throw error
  return mapRow(data as AppRow)
}

/** 본인 앱 내용 수정(RLS: owner_id=본인 또는 관리자). 부분 갱신. */
export async function updateApp(
  id: string,
  patch: Partial<AppInput>,
): Promise<App> {
  const row: Record<string, unknown> = {}
  if (patch.title !== undefined) row.title = patch.title.trim()
  if (patch.appUrl !== undefined) row.app_url = patch.appUrl.trim()
  if (patch.thumbnailUrl !== undefined) row.thumbnail_url = patch.thumbnailUrl
  if (patch.authorName !== undefined) row.author_name = patch.authorName.trim()
  if (patch.description !== undefined) row.description = patch.description
  if (patch.categoryIds !== undefined) row.category_ids = patch.categoryIds

  const { data, error } = await supabase
    .from("apps")
    .update(row)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return mapRow(data as AppRow)
}

/** 숨김/복구. 삭제 대신 status 토글(RLS: 본인 또는 관리자). */
export async function setAppStatus(id: string, status: AppStatus): Promise<App> {
  const { data, error } = await supabase
    .from("apps")
    .update({ status })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return mapRow(data as AppRow)
}

/**
 * 전체 앱(숨김 포함, 모든 등록자, 최신순) — 관리자 페이지(/admin)용.
 * status 필터 없이 가져온다. RLS(12_apps_owner.sql)의 is_admin() SELECT 가
 * 관리자에게만 숨김·타인 앱 조회를 허용하므로, 비관리자가 호출하면 published 만 온다.
 */
export async function getAllApps(): Promise<App[]> {
  const { data, error } = await supabase
    .from("apps")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[apps] getAllApps 실패:", error.message)
    return []
  }
  return (data as AppRow[]).map(mapRow)
}

/** 내가 등록한 앱(숨김 포함, 최신순) — 마이페이지용. */
export async function getMyApps(): Promise<App[]> {
  const uid = await currentUserId()
  if (!uid) return []

  const { data, error } = await supabase
    .from("apps")
    .select("*")
    .eq("owner_id", uid)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[apps] getMyApps 실패:", error.message)
    return []
  }
  return (data as AppRow[]).map(mapRow)
}

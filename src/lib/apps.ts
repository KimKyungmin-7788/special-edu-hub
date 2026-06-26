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
  }
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

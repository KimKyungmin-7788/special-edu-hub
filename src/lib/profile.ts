import { supabase } from "@/lib/supabase"

/**
 * 프로필 데이터 접근 일원화 지점 (2단계 묶음 B).
 * profiles 테이블: auth 사용자 1행 ↔ 프로필 1행. 가입 시 트리거로 자동 생성된다.
 * 화면은 이 함수들의 반환 모양(Profile)만 의존한다.
 */

export type Role = "member" | "teacher" | "admin"

/** 프로필 한 건의 모양. DB 컬럼(snake_case)을 이 camelCase 모양으로 변환해 쓴다. */
export type Profile = {
  id: string
  nickname: string | null
  avatarUrl: string | null
  blogUrl: string | null
  instagramUrl: string | null
  youtubeUrl: string | null
  websiteUrl: string | null
  isTeacherVerified: boolean
  role: Role
  createdAt: string
}

type ProfileRow = {
  id: string
  nickname: string | null
  avatar_url: string | null
  blog_url: string | null
  instagram_url: string | null
  youtube_url: string | null
  website_url: string | null
  is_teacher_verified: boolean
  role: Role
  created_at: string
}

function mapRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
    blogUrl: row.blog_url,
    instagramUrl: row.instagram_url,
    youtubeUrl: row.youtube_url,
    websiteUrl: row.website_url,
    isTeacherVerified: row.is_teacher_verified,
    role: row.role,
    createdAt: row.created_at,
  }
}

/** id(=auth 사용자 id) 로 단일 프로필. */
export async function getProfile(id: string): Promise<Profile | undefined> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("[profile] getProfile 실패:", error.message)
    return undefined
  }
  return data ? mapRow(data as ProfileRow) : undefined
}

/**
 * 본인이 수정 가능한 프로필 필드.
 * role / is_teacher_verified 는 일부러 제외 — DB 컬럼 GRANT 로도 잠겨 있다(04_profiles.sql).
 */
export type ProfileEditable = {
  nickname: string | null
  blogUrl: string | null
  instagramUrl: string | null
  youtubeUrl: string | null
  websiteUrl: string | null
}

/** 본인 프로필 수정. 성공 시 갱신된 프로필을 돌려준다. */
export async function updateProfile(
  id: string,
  patch: ProfileEditable,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      nickname: patch.nickname,
      blog_url: patch.blogUrl,
      instagram_url: patch.instagramUrl,
      youtube_url: patch.youtubeUrl,
      website_url: patch.websiteUrl,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return mapRow(data as ProfileRow)
}

/** 아바타 버킷(공개). 05_avatars.sql 에서 생성. */
const AVATAR_BUCKET = "avatars"

/** 공개 URL 에서 버킷 내부 경로(<uid>/<file>)만 뽑는다. 아니면 null. */
function avatarPathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const marker = `/${AVATAR_BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  return url.slice(i + marker.length).split("?")[0]
}

/**
 * 아바타 이미지를 업로드하고 avatar_url 을 갱신한다.
 * 경로는 avatars/<uid>/<timestamp>.<ext> — 본인 폴더에만 쓰도록 RLS 가 강제.
 * 성공 시 새 공개 URL 을 돌려준다.
 *
 * prevUrl 을 주면, 교체 성공 후 이전 파일을 삭제한다(Storage 누적 방지).
 * 삭제는 best-effort — 실패해도 교체 자체는 성공 처리한다.
 */
export async function uploadAvatar(
  userId: string,
  file: File,
  prevUrl?: string | null,
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png"
  const path = `${userId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false })
  if (uploadError) throw uploadError

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", userId)
  if (updateError) throw updateError

  // 교체 성공 후 이전 파일 정리(새 파일과 다를 때만).
  const prevPath = avatarPathFromUrl(prevUrl)
  if (prevPath && prevPath !== path) {
    const { error: removeError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .remove([prevPath])
    if (removeError) {
      console.warn("[profile] 이전 아바타 삭제 실패:", removeError.message)
    }
  }

  return publicUrl
}

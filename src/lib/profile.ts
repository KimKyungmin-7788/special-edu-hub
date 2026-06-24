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
  bio: string | null
  blogUrl: string | null
  instagramUrl: string | null
  websiteUrl: string | null
  isTeacherVerified: boolean
  role: Role
  createdAt: string
}

type ProfileRow = {
  id: string
  nickname: string | null
  avatar_url: string | null
  bio: string | null
  blog_url: string | null
  instagram_url: string | null
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
    bio: row.bio,
    blogUrl: row.blog_url,
    instagramUrl: row.instagram_url,
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
  bio: string | null
  blogUrl: string | null
  instagramUrl: string | null
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
      bio: patch.bio,
      blog_url: patch.blogUrl,
      instagram_url: patch.instagramUrl,
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

/**
 * 아바타 이미지를 업로드하고 avatar_url 을 갱신한다.
 * 경로는 avatars/<uid>/<timestamp>.<ext> — 본인 폴더에만 쓰도록 RLS 가 강제.
 * 성공 시 새 공개 URL 을 돌려준다.
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
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

  return publicUrl
}

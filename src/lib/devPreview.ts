import type { User } from "@supabase/supabase-js"
import type { Profile } from "@/lib/profile"

/**
 * 개발 서버(npm run dev)에서 로그인하지 않았을 때 쓰는 '미리보기 사용자'.
 * 인증교사·관리자로 보이게 해 로그인이 필요한 화면을 그대로 볼 수 있다.
 * 진짜 세션이 없으므로 저장·권한이 필요한 요청은 DB(RLS)가 막는다. 배포 빌드에는 들어가지 않는다.
 */
export const DEV_PREVIEW_ID = "00000000-0000-4000-8000-00000000dev0"

export const devPreviewUser = {
  id: DEV_PREVIEW_ID,
  email: "preview@localhost",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00Z",
} as User

export const devPreviewProfile: Profile = {
  id: DEV_PREVIEW_ID,
  email: "preview@localhost",
  emailPublic: false,
  nickname: "미리보기",
  avatarUrl: null,
  blogUrl: null,
  instagramUrl: null,
  youtubeUrl: null,
  websiteUrl: null,
  isResearchMember: true,
  isTeacherVerified: true,
  nicknameSet: true,
  verifiedCelebrated: true,
  role: "admin",
  createdAt: "2026-01-01T00:00:00Z",
}

import { supabase } from "@/lib/supabase"

/**
 * 소속 학교와 탈퇴(52_account_delete_school.sql).
 * 학교는 member_schools 에 두고 본인·운영진만 읽는다(profiles 는 누구나 읽는 표라 따로 둔다).
 */

/** 내 소속 학교. 아직 없거나 52 미적용이면 null */
export async function getMySchool(uid: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("member_schools")
    .select("school")
    .eq("user_id", uid)
    .maybeSingle()
  if (error) {
    console.error("[account] getMySchool 실패:", error.message)
    return null
  }
  return data?.school ?? null
}

/** 로그인 뒤 학교를 물어야 하는지 — 조회에 성공했는데 아직 없을 때만(52 미적용·오류면 묻지 않음) */
export async function needsSchool(uid: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("member_schools")
    .select("user_id")
    .eq("user_id", uid)
    .maybeSingle()
  return !error && !data
}

/** 내 소속 학교 저장(처음 넣기·고치기 모두) */
export async function saveMySchool(uid: string, school: string): Promise<void> {
  const s = school.trim()
  if (s.length < 2) throw new Error("소속 학교 이름을 2자 이상 입력하세요.")
  if (s.length > 60) throw new Error("소속 학교 이름은 60자까지 입력할 수 있어요.")
  const { error } = await supabase
    .from("member_schools")
    .upsert({ user_id: uid, school: s, updated_at: new Date().toISOString() })
  if (error) throw error
}

export type SchoolHit = { name: string; kind: string; region: string }

/** 학교 이름 검색(/api/school-search → 나이스 학교기본정보). 실패하면 빈 목록 — 직접 입력은 그대로 된다 */
export async function searchSchools(q: string, signal?: AbortSignal): Promise<SchoolHit[]> {
  const res = await fetch(`/api/school-search?q=${encodeURIComponent(q)}`, { signal })
  if (!res.ok) return []
  const data = await res.json().catch(() => null)
  return Array.isArray(data?.schools) ? data.schools : []
}

/** 저장하는 학교 표기 — 같은 이름 학교를 지역으로 구분 */
export function schoolLabel(hit: SchoolHit): string {
  return hit.region ? `${hit.name} (${hit.region})` : hit.name
}

/** 운영진 회원 목록용: 회원 id → 학교. 운영진이 아니면 RLS 로 본인 것만 온다 */
export async function listMemberSchools(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from("member_schools").select("user_id, school")
  if (error) {
    console.error("[account] listMemberSchools 실패:", error.message)
    return new Map()
  }
  return new Map(data.map((r) => [r.user_id as string, r.school as string]))
}

/** 본인 폴더에 파일을 두는 저장소들 — 탈퇴 전에 비운다(SQL 로는 저장소 파일을 지울 수 없음) */
const OWN_FOLDER_BUCKETS = [
  "avatars",
  "app-thumbnails",
  "app-files",
  "practice-files",
  "comment-images",
  "research-images",
  "verification-docs",
]

/** 저장소의 내 폴더 파일 지우기. 지울 권한이 없거나 없는 저장소는 건너뛴다 */
async function removeMyFiles(uid: string) {
  await Promise.all(
    OWN_FOLDER_BUCKETS.map(async (bucket) => {
      const { data } = await supabase.storage.from(bucket).list(uid, { limit: 1000 })
      const paths = (data ?? []).filter((f) => f.id).map((f) => `${uid}/${f.name}`)
      if (paths.length) await supabase.storage.from(bucket).remove(paths)
    }),
  )
}

/** 탈퇴 — 내 파일을 지우고, 글과 계정을 지운 뒤 로그아웃한다 */
export async function deleteMyAccount(uid: string): Promise<void> {
  await removeMyFiles(uid).catch(() => {})
  const { error } = await supabase.rpc("delete_my_account")
  if (error) throw error
  await supabase.auth.signOut()
}

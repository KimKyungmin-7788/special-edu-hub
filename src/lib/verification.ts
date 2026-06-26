import { supabase } from "@/lib/supabase"

/**
 * 교사인증 신청 데이터 접근 일원화 지점 (2단계 묶음 D-1).
 * 스키마·RLS·버킷은 supabase/09_verification.sql 참고.
 *
 *  - 서류는 비공개 버킷 verification-docs/<uid>/<file> 에만(RLS 가 본인 폴더 강제).
 *  - 신청은 status=pending 으로만 insert(RLS with check). 제출 후 사용자 수정 불가.
 *  - 인증 여부(is_teacher_verified)는 profiles 에 있고 lib/profile.getProfile 로 읽는다.
 *  - 페이지 상태(미신청/심사중/반려)는 getMyLatestRequest 의 결과로 판별한다.
 */

export type VerificationStatus = "pending" | "approved" | "rejected"

/** 신청 한 건의 모양. DB 컬럼(snake_case)을 camelCase 로 변환해 쓴다. */
export type VerificationRequest = {
  id: string
  userId: string
  documentPath: string
  region: string
  school: string
  status: VerificationStatus
  rejectReason: string | null
  reviewedAt: string | null
  createdAt: string
}

type VerificationRow = {
  id: string
  user_id: string
  document_path: string
  region: string
  school: string
  status: VerificationStatus
  reject_reason: string | null
  reviewed_at: string | null
  created_at: string
}

function mapRow(row: VerificationRow): VerificationRequest {
  return {
    id: row.id,
    userId: row.user_id,
    documentPath: row.document_path,
    region: row.region,
    school: row.school,
    status: row.status,
    rejectReason: row.reject_reason,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  }
}

/** 현재 로그인 사용자 id(로컬 세션에서). 비로그인이면 null. */
async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

/**
 * 내 최신 신청 1건. 없으면 null(= 미신청).
 * status 로 페이지 상태를 판별: pending=심사중, rejected=반려(재신청), approved=승인.
 */
export async function getMyLatestRequest(): Promise<VerificationRequest | null> {
  const uid = await currentUserId()
  if (!uid) return null

  const { data, error } = await supabase
    .from("verification_requests")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("[verification] getMyLatestRequest 실패:", error.message)
    return null
  }
  return data ? mapRow(data as VerificationRow) : null
}

/** 서류 파일 제한 — 09_verification.sql 버킷 설정과 일치. */
export const VERIFICATION_DOC_MAX_BYTES = 5 * 1024 * 1024 // 5MB
export const VERIFICATION_DOC_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]

const VERIFICATION_BUCKET = "verification-docs"

export type VerificationInput = {
  file: File
  region: string
  school: string
}

/**
 * 교사인증 신청.
 *  1) 서류를 verification-docs/<uid>/<ts>.<ext> 에 업로드(본인 폴더 RLS 강제).
 *  2) verification_requests insert(status=pending; user_id 는 RLS 가 강제).
 * 동시 pending 은 unique 인덱스가 막는다(중복 신청 시 에러).
 */
export async function submitVerification({
  file,
  region,
  school,
}: VerificationInput): Promise<VerificationRequest> {
  const uid = await currentUserId()
  if (!uid) throw new Error("로그인이 필요합니다.")

  const r = region.trim()
  const s = school.trim()
  if (r === "") throw new Error("근무 지역을 입력하세요.")
  if (s === "") throw new Error("학교를 입력하세요.")
  if (!VERIFICATION_DOC_MIME.includes(file.type))
    throw new Error("이미지(JPG·PNG·WebP) 또는 PDF 파일만 업로드할 수 있습니다.")
  if (file.size > VERIFICATION_DOC_MAX_BYTES)
    throw new Error("파일은 5MB 이하만 업로드할 수 있습니다.")

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin"
  const path = `${uid}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(VERIFICATION_BUCKET)
    .upload(path, file, { cacheControl: "0", upsert: false })
  if (uploadError) throw uploadError

  const { data, error: insertError } = await supabase
    .from("verification_requests")
    .insert({ user_id: uid, document_path: path, region: r, school: s })
    .select()
    .single()

  if (insertError) {
    // insert 가 실패하면 방금 올린 서류를 정리(고아 파일 방지). best-effort.
    await supabase.storage.from(VERIFICATION_BUCKET).remove([path])
    throw insertError
  }
  return mapRow(data as VerificationRow)
}

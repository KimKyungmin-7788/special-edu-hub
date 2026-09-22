import { supabase } from "@/lib/supabase"
import { site } from "@/config/site"

/**
 * 교사인증 신청 데이터 접근 일원화 지점 (2단계 묶음 D-1).
 * 스키마·RLS·버킷은 supabase/09_verification.sql 참고.
 *
 *  - 25 부터 서류는 이메일로 받는다(사이트 업로드 없음). 신청 행은 기록용.
 *    예전 업로드 방식 행은 document_path 가 남아 있어 관리자가 열람할 수 있다.
 *  - 신청은 status=pending 으로만 insert(RLS with check). 제출 후 사용자 수정 불가.
 *  - 인증 여부(is_teacher_verified)는 profiles 에 있고 lib/profile.getProfile 로 읽는다.
 *  - 페이지 상태(미신청/심사중/반려)는 getMyLatestRequest 의 결과로 판별한다.
 */

export type VerificationStatus = "pending" | "approved" | "rejected"

/** 신청 한 건의 모양. DB 컬럼(snake_case)을 camelCase 로 변환해 쓴다. */
export type VerificationRequest = {
  id: string
  userId: string
  documentPath: string | null
  region: string | null
  school: string
  applicantName: string | null
  status: VerificationStatus
  rejectReason: string | null
  reviewedAt: string | null
  createdAt: string
}

type VerificationRow = {
  id: string
  user_id: string
  document_path: string | null
  region: string | null
  school: string
  applicant_name: string | null
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
    applicantName: row.applicant_name,
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

export type VerificationInput = {
  school: string
  name: string
}

/**
 * 교사인증 신청 기록(25_verify_by_email.sql).
 * 서류는 사이트에 올리지 않고 신청자가 운영자에게 이메일로 보낸다 — 여기선
 * 학교·성함만 status=pending 으로 남겨 /admin 대기목록에 뜨게 한다.
 * 동시 pending 은 unique 인덱스가 막는다(중복 신청 시 에러).
 */
export async function submitVerification({
  school,
  name,
}: VerificationInput): Promise<VerificationRequest> {
  const uid = await currentUserId()
  if (!uid) throw new Error("로그인이 필요합니다.")

  const s = school.trim()
  const n = name.trim()
  if (s === "") throw new Error("소속 학교를 입력하세요.")
  if (n === "") throw new Error("성함을 입력하세요.")

  const { data, error } = await supabase
    .from("verification_requests")
    .insert({ user_id: uid, school: s, applicant_name: n })
    .select()
    .single()
  if (error) throw error
  return mapRow(data as VerificationRow)
}

// ── 인증 메일 템플릿 (config/site.ts verification) ─────────────

export type VerificationMail = { to: string; subject: string; body: string }

/** 인증센터 템플릿 → 메일 제목·본문. 빈 칸은 빈 채로 둔다(미리보기용). */
export function buildVerificationMail({
  school,
  name,
  email,
}: {
  school: string
  name: string
  email: string
}): VerificationMail {
  const v = site.verification
  const body = [
    v.title,
    `가입 플랫폼: ${v.platformName}`,
    `소속 학교: ${school.trim()}`,
    `성함: ${name.trim()}`,
    `누리집에 가입하신 정확한 이메일 주소: ${email}`,
    "",
    "※ 첨부: 개인정보를 가린 재직증명서 또는 본인 이름이 보이는 나이스 화면 캡처",
  ].join("\n")
  return { to: v.email, subject: v.title, body }
}

/** Gmail 웹 작성창을 받는사람·제목·본문이 채워진 채로 여는 URL. */
export function gmailComposeUrl({ to, subject, body }: VerificationMail): string {
  const q = new URLSearchParams({ view: "cm", fs: "1", to, su: subject, body })
  return `https://mail.google.com/mail/?${q.toString()}`
}

/** 기본 메일 앱용 mailto URL. */
export function mailtoUrl({ to, subject, body }: VerificationMail): string {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

// ── 관리자 심사 — /admin 묶음 A (RLS 가 최종 강제) ─────────────
// 14_admin.sql 의 verif_update_admin(UPDATE) + verif_docs_read_admin(서류 SELECT)
// 정책이 있어야 동작. 승인 시 09 의 트리거가 is_teacher_verified 를 반영한다.

/** 관리자 큐의 신청 한 건 — 신청자 표시 정보(닉네임·이메일)를 함께 묶는다. */
export type AdminVerificationRequest = VerificationRequest & {
  applicantNickname: string | null
  applicantEmail: string | null
}

type AdminVerificationRow = VerificationRow & {
  applicant: { nickname: string | null; email: string | null } | null
}

/**
 * 심사 대기(pending) 신청 목록(오래된 순 — 먼저 신청한 걸 먼저 처리).
 * 신청자 프로필(닉네임·이메일)을 user_id FK 로 임베드한다.
 * reviewed_by 도 profiles 를 참조하므로 FK 이름으로 명시해 모호함을 없앤다.
 */
export async function listPendingRequests(): Promise<AdminVerificationRequest[]> {
  const { data, error } = await supabase
    .from("verification_requests")
    .select(
      "*, applicant:profiles!verification_requests_user_id_fkey(nickname, email)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true })

  if (error) {
    console.error("[verification] listPendingRequests 실패:", error.message)
    return []
  }
  return (data as AdminVerificationRow[]).map((row) => ({
    ...mapRow(row),
    applicantNickname: row.applicant?.nickname ?? null,
    applicantEmail: row.applicant?.email ?? null,
  }))
}

/**
 * 처리 완료(승인/반려) 신청 이력(처리일 최신순) — 관리자 큐의 "처리 내역" 탭.
 * 09 의 verif_select_own_or_admin 이 admin 에게 전체 행을 열어주므로 SQL 불필요.
 * 서류는 노출하지 않는다(처리 후 삭제 예정 + 민감정보 최소화) — 메타데이터만.
 */
export async function listReviewedRequests(): Promise<AdminVerificationRequest[]> {
  const { data, error } = await supabase
    .from("verification_requests")
    .select(
      "*, applicant:profiles!verification_requests_user_id_fkey(nickname, email)",
    )
    .in("status", ["approved", "rejected"])
    .order("reviewed_at", { ascending: false })

  if (error) {
    console.error("[verification] listReviewedRequests 실패:", error.message)
    return []
  }
  return (data as AdminVerificationRow[]).map((row) => ({
    ...mapRow(row),
    applicantNickname: row.applicant?.nickname ?? null,
    applicantEmail: row.applicant?.email ?? null,
  }))
}

const VERIFICATION_BUCKET = "verification-docs"

/** 서류 열람용 서명 URL(기본 5분). 관리자만 발급됨(RLS). 새 탭으로 연다. */
export async function createDocSignedUrl(
  documentPath: string,
  expiresInSec = 300,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(VERIFICATION_BUCKET)
    .createSignedUrl(documentPath, expiresInSec)
  if (error) throw error
  return data.signedUrl
}

/** 현재 로그인 관리자 id. 심사자(reviewed_by) 기록용. */
async function adminUserId(): Promise<string> {
  const uid = await currentUserId()
  if (!uid) throw new Error("로그인이 필요합니다.")
  return uid
}

/**
 * 승인 — status='approved'. 트리거가 신청자 is_teacher_verified=true 로 올린다.
 * reviewed_by=처리한 관리자, reviewed_at=now.
 */
export async function approveRequest(
  id: string,
): Promise<VerificationRequest> {
  const reviewer = await adminUserId()
  const { data, error } = await supabase
    .from("verification_requests")
    .update({
      status: "approved",
      reject_reason: null,
      reviewed_by: reviewer,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return mapRow(data as VerificationRow)
}

/** 반려 — status='rejected' + 사유. 신청자는 인증센터에서 사유 보고 재신청 가능. */
export async function rejectRequest(
  id: string,
  reason: string,
): Promise<VerificationRequest> {
  const r = reason.trim()
  if (r === "") throw new Error("반려 사유를 입력하세요.")
  const reviewer = await adminUserId()
  const { data, error } = await supabase
    .from("verification_requests")
    .update({
      status: "rejected",
      reject_reason: r,
      reviewed_by: reviewer,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return mapRow(data as VerificationRow)
}

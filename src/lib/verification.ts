import { supabase } from "@/lib/supabase"
import { site } from "@/config/site"
import { downscaleImage } from "@/lib/image"

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

const VERIFICATION_BUCKET = "verification-docs"

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
  /** 인증 서류(재직증명서·나이스 캡처). 없으면 이메일로 따로 보내는 방식. */
  file?: File | null
}

/** 인증 서류로 받는 형식·크기(09 의 verification-docs 버킷과 같게). */
export const VERIFICATION_DOC_MIME = ["image/png", "image/jpeg", "image/webp", "application/pdf"]
export const VERIFICATION_DOC_MAX_BYTES = 5 * 1024 * 1024
const DOC_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
}

/** 고른 파일이 받을 수 있는 것인지. 문제가 있으면 안내 문구, 괜찮으면 null. */
export function checkVerificationDoc(file: File): string | null {
  if (!VERIFICATION_DOC_MIME.includes(file.type))
    return "PDF 또는 이미지(PNG·JPG·WebP) 파일만 올릴 수 있습니다."
  // 큰 사진은 올릴 때 줄이므로 PDF 만 크기를 미리 막는다.
  if (file.type === "application/pdf" && file.size > VERIFICATION_DOC_MAX_BYTES)
    return "PDF 는 5MB 이하만 올릴 수 있습니다."
  return null
}

/**
 * 서류를 비공개 버킷 verification-docs/<uid>/<uuid>.<ext> 에 올리고 경로를 돌려준다.
 * 본인 폴더에만 올릴 수 있고, 열람은 본인·운영진의 서명 URL 로만 된다(09·15).
 * 5MB 가 넘는 사진은 글자가 읽히도록 긴 변 2400px 로 줄인다.
 */
async function uploadVerificationDoc(uid: string, file: File): Promise<string> {
  const problem = checkVerificationDoc(file)
  if (problem) throw new Error(problem)
  const doc =
    file.type.startsWith("image/") && file.size > VERIFICATION_DOC_MAX_BYTES
      ? await downscaleImage(file, 2400, 0.9)
      : file
  if (doc.size > VERIFICATION_DOC_MAX_BYTES)
    throw new Error("파일이 너무 큽니다. 5MB 이하로 줄여서 올려 주세요.")

  const path = `${uid}/${crypto.randomUUID()}.${DOC_EXT[doc.type] ?? "bin"}`
  const { error } = await supabase.storage
    .from(VERIFICATION_BUCKET)
    .upload(path, doc, { upsert: false, contentType: doc.type })
  if (error) throw error
  return path
}

/**
 * 교사인증 신청(25_verify_by_email.sql, 48_verification_upload.sql).
 * 서류 파일이 있으면 먼저 비공개 버킷에 올리고 document_path 로 남긴다.
 * 없으면 학교·성함만 남기고 서류는 이메일로 받는다(예전 방식, 대체 경로).
 * 동시 pending 은 unique 인덱스가 막는다(중복 신청 시 에러). 실패하면 올린 파일을 지운다.
 */
export async function submitVerification({
  school,
  name,
  file,
}: VerificationInput): Promise<VerificationRequest> {
  const uid = await currentUserId()
  if (!uid) throw new Error("로그인이 필요합니다.")

  const s = school.trim()
  const n = name.trim()
  if (s === "") throw new Error("소속 학교를 입력하세요.")
  if (n === "") throw new Error("성함을 입력하세요.")

  const documentPath = file ? await uploadVerificationDoc(uid, file) : null

  const { data, error } = await supabase
    .from("verification_requests")
    .insert({ user_id: uid, school: s, applicant_name: n, document_path: documentPath })
    .select()
    .single()
  if (error) {
    if (documentPath) await supabase.storage.from(VERIFICATION_BUCKET).remove([documentPath])
    throw error
  }
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

/**
 * 심사가 끝난 서류 파일 삭제(개인정보처리방침: 인증 확인 후 지체 없이 삭제).
 * 운영진 삭제 정책(48)이 있어야 지워진다. 실패해도 심사 결과는 그대로 둔다.
 */
export async function removeVerificationDoc(documentPath: string): Promise<void> {
  const { error } = await supabase.storage.from(VERIFICATION_BUCKET).remove([documentPath])
  if (error) console.error("[verification] 서류 삭제 실패:", error.message)
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

import { supabase } from "@/lib/supabase"

/**
 * 운영진 문의(inquiry) 데이터 접근 일원화 지점 (5단계 트랙 C).
 * 스키마·RLS·RPC 는 supabase/21_inquiries.sql 참고.
 *
 * 보안은 전부 DB(RLS·RPC)에 있다. 이 파일은 그 위에서 화면이 쓰기 좋은 모양으로 감싼다.
 *  - 접수: submit_inquiry RPC(비로그인 포함, 검증·user_id 강제). 직접 INSERT 는 막혀 있다.
 *  - 조회(staff): RLS 가 staff/본인만 보게 막는다. 처리: handle_inquiry RPC.
 */

/** 문의 유형(분류 코드 + 표시 라벨). 폼·큐에서 공유. */
export const INQUIRY_TYPES = [
  { code: "suggestion", label: "건의사항" },
  { code: "request", label: "요청사항" },
  { code: "bug", label: "오류 신고" },
  { code: "other", label: "기타" },
] as const

export type InquiryTypeCode = (typeof INQUIRY_TYPES)[number]["code"]

/** 유형 코드 → 표시 라벨. 모르는 코드는 그대로. */
export function inquiryTypeLabel(code: string): string {
  return INQUIRY_TYPES.find((t) => t.code === code)?.label ?? code
}

export const INQUIRY_SUBJECT_MAX = 100
export const INQUIRY_BODY_MAX = 2000

/**
 * 문의 접수. submit_inquiry RPC 로만 보낸다(비로그인 포함).
 * 로그인 시 이메일을 비우면 DB 가 계정 이메일로 채운다. 비로그인은 이메일 필수.
 */
export async function submitInquiry(input: {
  type: string
  subject: string
  body: string
  email?: string
}): Promise<void> {
  const subject = input.subject.trim()
  const body = input.body.trim()
  if (subject === "" || body === "")
    throw new Error("제목과 내용을 입력하세요.")
  if (subject.length > INQUIRY_SUBJECT_MAX)
    throw new Error(`제목은 최대 ${INQUIRY_SUBJECT_MAX}자까지 가능합니다.`)
  if (body.length > INQUIRY_BODY_MAX)
    throw new Error(`내용은 최대 ${INQUIRY_BODY_MAX}자까지 가능합니다.`)

  const email = (input.email ?? "").trim()
  const { error } = await supabase.rpc("submit_inquiry", {
    p_type: input.type,
    p_subject: subject,
    p_body: body,
    p_email: email === "" ? null : email,
  })
  if (error) throw error
}

// ── 운영진(staff)용 — 문의 큐 ─────────────────────────────

/** 문의 한 건(운영진 큐 표시용). 작성자(로그인) 닉네임을 함께 가져온다. */
export type Inquiry = {
  id: string
  type: string
  subject: string
  body: string
  email: string
  status: "open" | "handled"
  createdAt: string
  handledAt: string | null
  handlerNote: string | null
  author: { id: string; nickname: string | null } | null
}

type InquiryRow = {
  id: string
  type: string
  subject: string
  body: string
  email: string
  status: "open" | "handled"
  created_at: string
  handled_at: string | null
  handler_note: string | null
  author: { id: string; nickname: string | null } | null
}

const SELECT_WITH_AUTHOR =
  "id, type, subject, body, email, status, created_at, handled_at, handler_note, " +
  "author:profiles!inquiries_user_id_fkey(id, nickname)"

function mapInquiry(row: InquiryRow): Inquiry {
  return {
    id: row.id,
    type: row.type,
    subject: row.subject,
    body: row.body,
    email: row.email,
    status: row.status,
    createdAt: row.created_at,
    handledAt: row.handled_at,
    handlerNote: row.handler_note,
    author: row.author ? { id: row.author.id, nickname: row.author.nickname } : null,
  }
}

/** 대기 중(open) 문의, 최신순. staff 만 결과를 받는다(RLS). */
export async function listOpenInquiries(): Promise<Inquiry[]> {
  const { data, error } = await supabase
    .from("inquiries")
    .select(SELECT_WITH_AUTHOR)
    .eq("status", "open")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[inquiries] listOpenInquiries 실패:", error.message)
    return []
  }
  return (data as unknown as InquiryRow[]).map(mapInquiry)
}

/** 처리 완료(handled) 문의, 처리 최신순. */
export async function listHandledInquiries(): Promise<Inquiry[]> {
  const { data, error } = await supabase
    .from("inquiries")
    .select(SELECT_WITH_AUTHOR)
    .eq("status", "handled")
    .order("handled_at", { ascending: false })

  if (error) {
    console.error("[inquiries] listHandledInquiries 실패:", error.message)
    return []
  }
  return (data as unknown as InquiryRow[]).map(mapInquiry)
}

/** 문의 처리(staff). 처리 완료로 표시하고 메모를 남긴다. RPC 가 권한 강제. */
export async function handleInquiry(id: string, note: string): Promise<void> {
  const { error } = await supabase.rpc("handle_inquiry", { p_id: id, p_note: note })
  if (error) throw error
}

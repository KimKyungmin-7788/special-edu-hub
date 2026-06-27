import { supabase } from "@/lib/supabase"

/**
 * 신고(report) 데이터 접근 일원화 지점 (묶음 R-2·R-3).
 * 스키마·RLS·RPC 는 supabase/17_reports.sql 참고.
 *
 * 보안은 전부 DB(RLS·RPC)에 있다. 이 파일은 그 위에서 화면이 쓰기 좋은 모양으로 감싼다.
 *  - 쪽지 신고: report_message RPC 가 당사자 검증 + 본문 스냅샷을 책임진다(위조 불가).
 *  - 신고 처리(staff): handle_report RPC. 직접 UPDATE 는 막혀 있다. (R-3)
 */

/** 신고 사유(분류 코드 + 표시 라벨). 제출·큐 표시에서 공유한다. */
export const REPORT_REASONS = [
  { code: "spam", label: "스팸/광고" },
  { code: "abuse", label: "욕설/비방/혐오" },
  { code: "sexual", label: "음란성/선정성" },
  { code: "impersonation", label: "사칭/사기" },
  { code: "other", label: "기타" },
] as const

export type ReportReasonCode = (typeof REPORT_REASONS)[number]["code"]

/** 사유 코드 → 표시 라벨(큐에서 코드 대신 보여줄 때). 모르는 코드는 그대로. */
export function reasonLabel(code: string): string {
  return REPORT_REASONS.find((r) => r.code === code)?.label ?? code
}

/** 본문(상세 서술) 길이 제한. */
export const REPORT_DETAIL_MAX = 1000

/**
 * 쪽지 신고. report_message RPC 로만 보낸다.
 * 신고자가 그 쪽지 당사자인지·본문 스냅샷은 DB 가 처리(위조 불가).
 * 같은 쪽지에 대기중 신고가 이미 있으면 DB 에서 조용히 무시된다.
 */
export async function reportMessage(
  messageId: string,
  reason: string,
  detail: string,
): Promise<void> {
  const trimmed = detail.trim()
  if (trimmed.length > REPORT_DETAIL_MAX)
    throw new Error(`상세 내용은 최대 ${REPORT_DETAIL_MAX}자까지 가능합니다.`)

  const { error } = await supabase.rpc("report_message", {
    p_message_id: messageId,
    p_reason: reason,
    p_detail: trimmed === "" ? null : trimmed,
  })
  if (error) throw error
}

/**
 * 댓글 신고. report_comment RPC 로만 보낸다(묶음 C-3).
 * 본문 스냅샷·피신고자(작성자)는 DB 가 처리(위조 불가). 댓글은 공개라 누구나 신고 가능.
 * 같은 댓글에 내 대기중 신고가 이미 있으면 DB 에서 조용히 무시된다.
 */
export async function reportComment(
  commentId: string,
  reason: string,
  detail: string,
): Promise<void> {
  const trimmed = detail.trim()
  if (trimmed.length > REPORT_DETAIL_MAX)
    throw new Error(`상세 내용은 최대 ${REPORT_DETAIL_MAX}자까지 가능합니다.`)

  const { error } = await supabase.rpc("report_comment", {
    p_comment_id: commentId,
    p_reason: reason,
    p_detail: trimmed === "" ? null : trimmed,
  })
  if (error) throw error
}

// ── 운영진(staff)용 — 신고 큐 (R-3) ──────────────────────
// 조회는 RLS 가 staff 만 전체를 보게 막는다. 처리는 handle_report RPC.

/** 신고 한 건(운영진 큐 표시용). 신고자·피신고자 닉네임을 함께 가져온다. */
export type Report = {
  id: string
  targetType: "user" | "app" | "message"
  targetId: string
  reason: string
  detail: string | null
  targetSnapshot: string | null
  status: "pending" | "resolved" | "dismissed"
  createdAt: string
  handledAt: string | null
  handlerNote: string | null
  reporter: { id: string; nickname: string | null }
  reported: { id: string; nickname: string | null } | null
}

type PartyRow = { id: string; nickname: string | null }

type ReportRow = {
  id: string
  target_type: "user" | "app" | "message"
  target_id: string
  reason: string
  detail: string | null
  target_snapshot: string | null
  status: "pending" | "resolved" | "dismissed"
  created_at: string
  handled_at: string | null
  handler_note: string | null
  reporter: PartyRow | null
  reported: PartyRow | null
}

const SELECT_WITH_PARTIES =
  "id, target_type, target_id, reason, detail, target_snapshot, status, " +
  "created_at, handled_at, handler_note, " +
  "reporter:profiles!reports_reporter_id_fkey(id, nickname), " +
  "reported:profiles!reports_reported_user_id_fkey(id, nickname)"

function mapReport(row: ReportRow): Report {
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    reason: row.reason,
    detail: row.detail,
    targetSnapshot: row.target_snapshot,
    status: row.status,
    createdAt: row.created_at,
    handledAt: row.handled_at,
    handlerNote: row.handler_note,
    reporter: {
      id: row.reporter?.id ?? "",
      nickname: row.reporter?.nickname ?? null,
    },
    reported: row.reported
      ? { id: row.reported.id, nickname: row.reported.nickname }
      : null,
  }
}

/** 대기 중(pending) 신고, 최신순. staff 만 결과를 받는다(RLS). */
export async function listPendingReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from("reports")
    .select(SELECT_WITH_PARTIES)
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[reports] listPendingReports 실패:", error.message)
    return []
  }
  return (data as unknown as ReportRow[]).map(mapReport)
}

/** 처리 완료(resolved/dismissed) 신고, 처리 최신순. */
export async function listHandledReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from("reports")
    .select(SELECT_WITH_PARTIES)
    .in("status", ["resolved", "dismissed"])
    .order("handled_at", { ascending: false })

  if (error) {
    console.error("[reports] listHandledReports 실패:", error.message)
    return []
  }
  return (data as unknown as ReportRow[]).map(mapReport)
}

/** 신고 처리(staff). status 는 resolved(조치함) 또는 dismissed(기각). RPC 가 권한 강제. */
export async function handleReport(
  id: string,
  status: "resolved" | "dismissed",
  note: string,
): Promise<void> {
  const trimmed = note.trim()
  const { error } = await supabase.rpc("handle_report", {
    p_id: id,
    p_status: status,
    p_note: trimmed === "" ? null : trimmed,
  })
  if (error) throw error
}

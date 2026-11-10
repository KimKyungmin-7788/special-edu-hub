import { supabase } from "@/lib/supabase"
import { CONSENT_KINDS, consents, type ConsentKind } from "@/config/consents"

/**
 * 가입 동의 기록 (66_consents.sql).
 * 누가 어떤 문서 버전에 언제 동의했는지는 DB 가 기록한다(RPC, 서버 시각).
 */

export type ConsentItem = { kind: ConsentKind; version: string }

/** 화면에 보이는 문서들의 현재 버전 — 가입 화면에서 동의한 버전으로 계정에 담아 둔다. */
export function shownConsentVersions(): Record<ConsentKind, string> {
  return Object.fromEntries(CONSENT_KINDS.map((k) => [k, consents[k].version])) as Record<ConsentKind, string>
}

/**
 * 로그인한 회원이 아직 동의하지 않은 현재 문서.
 * 화면 문서와 버전이 같은 것만 돌려준다(배포와 SQL 적용 사이에 다른 문서에 동의받지 않게).
 * 66 미적용 DB 나 조회 실패는 빈 목록.
 */
export async function getPendingConsents(): Promise<ConsentItem[]> {
  const { data, error } = await supabase.rpc("pending_consents")
  if (error) return []
  return (data as ConsentItem[]).filter((p) => consents[p.kind]?.version === p.version)
}

/** 동의 기록. source: 가입 화면에서 체크함(signup) / 로그인 뒤 묻는 창(login) */
export async function recordConsents(items: ConsentItem[], source: "signup" | "login"): Promise<void> {
  const { error } = await supabase.rpc("record_consents", { p_items: items, p_source: source })
  if (error) throw error
}

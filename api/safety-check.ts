import { createClient } from "@supabase/supabase-js"
import { scanApp } from "./_safety/scan.js"

/**
 * POST /api/safety-check — 등록한 웹앱 주소의 자동 점검 (PRD 14번, 68_app_review.sql).
 *
 * 요청: { appId, trigger } — trigger 는 register(등록 직후) · edit(주소 수정 뒤) · manual(작성자 다시 점검) · staff(운영진)
 * 헤더: Authorization: Bearer <Supabase 로그인 토큰>
 * 응답: { status, reviewStatus, verificationStatus }
 *
 * 점검할 주소는 요청이 아니라 DB 에서 읽는다(그 자료의 작성자나 운영진만 요청 가능 — RLS 로 확인).
 * 결과는 record_app_check RPC 로 기록하고, 그 RPC 가 공개·보류를 정한다.
 * 환경변수(Vercel 에만): EMAIL_WEBHOOK_SECRET — 메일 발송과 같은 값(Vault 의 email_webhook_secret).
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ""
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ""
const SECRET = process.env.EMAIL_WEBHOOK_SECRET ?? ""

/** 같은 자료를 연달아 점검하지 못하게 두는 간격 */
const MIN_INTERVAL_MS = 15_000

const TRIGGERS = ["register", "edit", "manual", "staff"]

/** 점검 규칙 → KERIS 「공교육 에듀테크 개인정보보호 가이드」(2026) 필수기준 번호 (src/config/criteria.ts 와 같은 번호) */
const RULE_CRITERIA: Record<string, string> = {
  secret: "2-1 안전조치",
  google_api_key: "2-1 안전조치",
  insecure: "2-1 안전조치",
  no_csp: "2-1 안전조치",
  device_permission: "1-1 최소 수집",
  declared_storage_mismatch: "1-1 최소 수집",
}

const BACKEND_NAMES: Record<string, string> = {
  supabase: "Supabase",
  firebase: "Firebase",
  "google-apps-script": "구글 앱스 스크립트",
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  })
}

export async function POST(request: Request): Promise<Response> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SECRET)
    return json(503, { error: "자동 점검 설정이 아직 없습니다." })

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  if (!token) return json(401, { error: "로그인이 필요합니다." })
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  const user = userData?.user
  if (userError || !user) return json(401, { error: "로그인이 만료되었습니다. 다시 로그인해 주세요." })

  let appId = ""
  let trigger = ""
  try {
    const body = await request.json()
    appId = String(body?.appId ?? "")
    trigger = String(body?.trigger ?? "")
  } catch {
    return json(400, { error: "요청 형식이 올바르지 않습니다." })
  }
  if (!appId || !TRIGGERS.includes(trigger)) return json(400, { error: "요청 형식이 올바르지 않습니다." })

  // 그 사람의 토큰으로 읽는다 → 볼 수 없는 자료는 나오지 않는다
  const { data: app } = await supabase.from("apps").select("id, app_url, owner_id").eq("id", appId).maybeSingle()
  if (!app) return json(404, { error: "자료를 찾을 수 없습니다." })
  const { data: isStaff } = await supabase.rpc("is_staff")
  if (app.owner_id !== user.id && isStaff !== true) return json(403, { error: "작성자나 운영진만 점검할 수 있습니다." })
  if (trigger === "staff" && isStaff !== true) trigger = "manual"
  if (!String(app.app_url ?? "").trim()) return json(400, { error: "점검할 앱 주소가 없습니다." })

  const { data: last } = await supabase
    .from("app_checks")
    .select("created_at")
    .eq("app_id", appId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (last && Date.now() - new Date(last.created_at).getTime() < MIN_INTERVAL_MS)
    return json(429, { error: "방금 점검했습니다. 잠시 뒤에 다시 해 주세요." })

  const result = await scanApp(String(app.app_url).trim())

  // 입력과 다름: 학생 정보를 "저장 안 함·기기에만"이라고 했는데 서버 저장 서비스가 보이면 보류 신호로 본다
  const { data: declared } = await supabase
    .from("app_safety_declarations")
    .select("student_data")
    .eq("app_id", appId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle()
  const saidNoServer = declared?.student_data === "none" || declared?.student_data === "device"
  if (saidNoServer && result.facts.backendHosts.length > 0) {
    const names = result.facts.backendHosts.map((h) => BACKEND_NAMES[h] ?? h).join(", ")
    result.findings.push({
      rule: "declared_storage_mismatch",
      level: "block",
      evidence:
        `점검에서 서버 저장 서비스(${names}) 주소를 찾았습니다. 학생 정보를 서버에 저장하는지 확인해 주세요. ` +
        `저장한다면 안전 확인 정보를 '서버에 저장'으로 고치고, 저장하지 않는다면 그 부분을 빼 주세요.`,
    })
    result.status = "blocked"
  }

  // KERIS 필수기준 번호를 앞에 붙인다 — 상세 안내·운영진 탭·보류 메일이 이 문장을 그대로 쓴다
  for (const f of result.findings) {
    const tag = RULE_CRITERIA[f.rule] ?? (f.rule.startsWith("secret_") ? RULE_CRITERIA.secret : undefined)
    if (tag) f.evidence = `[${tag}] ${f.evidence}`
  }

  const { data: recorded, error } = await supabase.rpc("record_app_check", {
    p_secret: SECRET,
    p_app_id: appId,
    p_trigger: trigger,
    p_requested_by: user.id,
    p_result: result,
  })
  if (error) {
    console.error("[safety-check] 기록 실패:", error.message)
    return json(502, { error: "점검 결과를 기록하지 못했습니다." })
  }
  return json(200, {
    status: result.status,
    reviewStatus: recorded?.review_status ?? null,
    verificationStatus: recorded?.verification_status ?? null,
  })
}

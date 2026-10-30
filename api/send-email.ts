import { timingSafeEqual } from "node:crypto"
import nodemailer from "nodemailer"
import { buildEmail, emailKinds, type EmailKind } from "../src/config/email.js"
import { site } from "../src/config/site.js"

/**
 * POST /api/send-email — 단계별 안내 메일 발송 (47_email_notifications.sql).
 *
 * 부르는 쪽: Supabase DB 트리거(pg_net)만. 화면 코드는 부르지 않는다.
 * 헤더: x-email-secret = EMAIL_WEBHOOK_SECRET (Vault 의 email_webhook_secret 과 같은 값)
 * 요청: { kind, to, nickname, data } — to 가 null 이면 운영자 알림(EMAIL_ADMIN_TO, 없으면 GMAIL_USER).
 *
 * 공식 도메인 개설 전까지 운영자 지메일로 보낸다. 답장도 그 지메일로 온다.
 * 환경변수(Vercel 에만): GMAIL_USER, GMAIL_APP_PASSWORD(구글 앱 비밀번호), EMAIL_WEBHOOK_SECRET,
 *                      EMAIL_ADMIN_TO(선택).
 */

const GMAIL_USER = process.env.GMAIL_USER ?? ""
const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD ?? "").replace(/\s+/g, "")
const WEBHOOK_SECRET = process.env.EMAIL_WEBHOOK_SECRET ?? ""
const ADMIN_TO = process.env.EMAIL_ADMIN_TO || GMAIL_USER

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  })
}

function sameSecret(given: string): boolean {
  const a = Buffer.from(given)
  const b = Buffer.from(WEBHOOK_SECRET)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** 문자열 값만 남긴 data(템플릿에 넣을 값). */
function stringRecord(v: unknown): Record<string, string> {
  if (!v || typeof v !== "object") return {}
  const out: Record<string, string> = {}
  for (const [k, x] of Object.entries(v)) if (typeof x === "string") out[k] = x.slice(0, 500)
  return out
}

export async function POST(request: Request): Promise<Response> {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD || !WEBHOOK_SECRET)
    return json(503, { error: "메일 발송 설정이 아직 없습니다." })

  if (!sameSecret(request.headers.get("x-email-secret") ?? ""))
    return json(401, { error: "unauthorized" })

  let body: { kind?: unknown; to?: unknown; nickname?: unknown; data?: unknown }
  try {
    body = await request.json()
  } catch {
    return json(400, { error: "bad json" })
  }

  const kind = body.kind as EmailKind
  if (!emailKinds.includes(kind)) return json(400, { error: "unknown kind" })

  const to = kind === "staff_new_request" ? ADMIN_TO : String(body.to ?? "")
  if (!EMAIL_RE.test(to)) return json(400, { error: "bad recipient" })

  const { subject, text } = buildEmail(kind, {
    nickname: typeof body.nickname === "string" ? body.nickname.slice(0, 50) : "",
    data: stringRecord(body.data),
    replyTo: GMAIL_USER,
  })

  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  })

  try {
    await transport.sendMail({
      from: { name: site.name, address: GMAIL_USER },
      replyTo: GMAIL_USER,
      to,
      subject,
      text,
    })
  } catch (err) {
    console.error("[send-email] 발송 실패:", kind, err instanceof Error ? err.message : err)
    return json(502, { error: "send failed" })
  }
  return json(200, { ok: true })
}

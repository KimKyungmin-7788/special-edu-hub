import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@supabase/supabase-js"
import { categories, subjectCategories } from "../src/config/categories"
import { practiceTargets } from "../src/config/practice"

/**
 * POST /api/practice-draft — 수업 설계안(PDF)으로 수업실천사례 초안 만들기 (PRD §13.4).
 *
 * 요청: { fileUrl } — 먼저 practice-files 버킷의 "본인 폴더"에 올린 PDF 의 공개 주소.
 * 헤더: Authorization: Bearer <Supabase 로그인 토큰>
 * 응답: PracticeDraft(JSON) — 폼 칸을 채울 값. 학생 반응·돌아보며는 만들지 않는다(실제 수업 모습이라).
 *
 * 권한: 인증교사만. 한도: 최근 24시간 DAILY_LIMIT 회(33_practice_draft_usage).
 * API 키는 서버 환경변수 ANTHROPIC_API_KEY 에만 있다(화면 코드에 절대 넣지 않음).
 */

const DAILY_LIMIT = 10
const MODEL = "claude-opus-5"

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ""
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ""

const subcategories = categories.filter(
  (c) => c.parentId && subjectCategories.some((s) => s.id === c.parentId),
)

/** 교과 목록을 모델에게 보여 줄 표 (id: 이름 — 세부 분류들). */
const subjectGuide = subjectCategories
  .map((s) => {
    const subs = subcategories.filter((c) => c.parentId === s.id)
    return `- ${s.id}: ${s.name}${subs.length ? ` (세부: ${subs.map((c) => `${c.id}=${c.name}`).join(", ")})` : ""}`
  })
  .join("\n")

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "summary",
    "subjectIds",
    "subcategoryIds",
    "target",
    "lessonCount",
    "overviewHtml",
    "flowHtml",
    "links",
    "personalInfoWarnings",
  ],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    subjectIds: { type: "array", items: { type: "string", enum: subjectCategories.map((c) => c.id) } },
    subcategoryIds: { type: "array", items: { type: "string", enum: subcategories.map((c) => c.id) } },
    target: { type: "string", enum: ["", ...practiceTargets] },
    lessonCount: { type: "integer" },
    overviewHtml: { type: "string" },
    flowHtml: { type: "string" },
    links: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "url"],
        properties: { title: { type: "string" }, url: { type: "string" } },
      },
    },
    personalInfoWarnings: { type: "array", items: { type: "string" } },
  },
} as const

const SYSTEM = `당신은 특수교육 교사 연구회 누리집의 편집자입니다. 교사가 올린 "교수·학습 설계안"을 읽고,
동료 특수교사들이 읽을 "수업실천사례" 글의 초안을 씁니다.

원칙
- 설계안에 있는 내용만 씁니다. 없는 사실(학생 반응, 수업 결과, 효과, 수치)을 지어내지 않습니다.
- 수업이 실제로 어땠는지는 모르므로, 결과를 단정하지 말고 설계 의도로 씁니다.
  예: "~하도록 구성했습니다", "~을 목표로 했습니다", "~하게 합니다".
- 문체: 담백하고 읽기 쉬운 존댓말(~합니다). 과장·홍보성 표현, 이모지 금지.
- 설계안의 표 조각·줄바꿈이 뒤섞여 있어도 의미를 복원해 자연스러운 문장으로 씁니다.
- 학생은 설계안 표기(가·나·다 등)를 그대로 씁니다. 실명이 보이면 본문에 쓰지 말고 personalInfoWarnings 에 "어디에 무엇이 있는지"를 적습니다(이름 자체는 적지 않음). 주민등록번호·연락처 등도 같습니다. 없으면 빈 배열.

필드
- title: 수업을 한눈에 알 수 있는 제목, 40자 이내. 설계안의 수업 주제를 살리되 자연스럽게.
- summary: 목록 카드용 한 줄 요약, 반드시 60자 이내.
- subjectIds: 아래 교과 중 가장 맞는 것 1개(두 교과에 걸치면 최대 2개, 대표 교과를 앞에).
- subcategoryIds: 고른 교과의 세부 분류 중 맞는 것(없으면 빈 배열).
- target: 대상 학교급. 목록에 맞는 게 없으면 "".
- lessonCount: 이 설계안이 다루는 차시 수(한 차시 설계안이면 1). 알 수 없으면 0.
- overviewHtml: "수업 개요" 소제목 아래 들어갈 본문.
  구성: 수업 소개 문단(단원·차시 위치·주제·대상) → <h3>성취기준</h3> → <h3>탐구 질문</h3>(목록) →
  <h3>수업 의도</h3> → <h3>학생과 과제</h3>(학생 수준별 특성·목표를 목록으로, 과제 분석) → <h3>활용 도구</h3>.
  설계안에 없는 항목은 빼세요.
- flowHtml: "활동 흐름" 소제목 아래 들어갈 본문.
  단계마다 <h3>도입 (7분) — 활동명</h3> 형식, 그 아래 쓰인 도구와 역할 한 문장, 교사 활동·학생 활동을 목록으로(수준별 활동은 (가·나), (다)처럼 표시).
  마지막에 <h3>평가</h3>: 영역별 평가 요소와 방법을 짧은 목록으로.
- links: 설계안에 적힌 웹 주소(웹앱·자료)를 모두. title 은 그 주소가 무엇인지 짧게(예: "교사 제작 웹앱"). 없으면 빈 배열.
- HTML 은 <p> <h3> <ul> <ol> <li> <strong> 만 쓰고, 속성·스타일·<h1>·<h2> 는 쓰지 않습니다.

교과 목록 (id: 이름)
${subjectGuide}

대상 목록: ${practiceTargets.join(", ")}`

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  })
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY)
    return json(503, { error: "설계안 초안 기능은 준비 중이에요. 곧 열어 드릴게요." })

  // ── 1. 로그인·인증교사 확인 (그 교사의 토큰으로 Supabase 에 묻는다 → RLS 그대로 적용) ──
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  if (!token) return json(401, { error: "로그인이 필요합니다." })
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  const user = userData?.user
  if (userError || !user) return json(401, { error: "로그인이 만료되었습니다. 다시 로그인해 주세요." })

  const { data: verified } = await supabase.rpc("is_verified_teacher")
  if (verified !== true) return json(403, { error: "인증교사만 사용할 수 있습니다." })

  // ── 2. 요청 확인: 본인 폴더에 올린 PDF 만 ──
  let fileUrl = ""
  try {
    fileUrl = String((await request.json())?.fileUrl ?? "")
  } catch {
    return json(400, { error: "요청 형식이 올바르지 않습니다." })
  }
  const allowedPrefix = `${SUPABASE_URL}/storage/v1/object/public/practice-files/${user.id}/`
  if (!fileUrl.startsWith(allowedPrefix) || !/\.pdf$/i.test(fileUrl))
    return json(400, { error: "직접 올린 PDF 설계안만 분석할 수 있습니다." })

  // ── 3. 하루 사용 한도 ──
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from("practice_draft_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since)
  if ((count ?? 0) >= DAILY_LIMIT)
    return json(429, { error: `초안 만들기는 하루 ${DAILY_LIMIT}번까지예요. 내일 다시 시도해 주세요.` })
  const usage = await supabase.from("practice_draft_usage").insert({ user_id: user.id })
  if (usage.error) return json(500, { error: "사용 기록을 남기지 못했습니다." })

  // ── 4. Claude 호출 ──
  const client = new Anthropic()
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high", format: { type: "json_schema", schema: SCHEMA } },
      // 안전 분류기가 드물게 거절할 때 서버에서 대체 모델로 다시 처리
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "document", source: { type: "url", url: fileUrl } },
            { type: "text", text: "이 설계안으로 수업실천사례 초안을 써 주세요." },
          ],
        },
      ],
    })

    if (response.stop_reason === "refusal")
      return json(422, { error: "이 문서는 분석할 수 없었습니다. 직접 작성해 주세요." })
    if (response.stop_reason === "max_tokens")
      return json(502, { error: "초안이 너무 길어 끝까지 만들지 못했습니다. 다시 시도해 주세요." })

    const text = response.content.find((b) => b.type === "text")
    if (!text || text.type !== "text") return json(502, { error: "초안을 받지 못했습니다." })
    return json(200, JSON.parse(text.text))
  } catch (err) {
    if (err instanceof Anthropic.BadRequestError) {
      console.error("[practice-draft] bad request:", err.message)
      return json(400, { error: "PDF를 읽지 못했습니다. 파일이 손상되지 않았는지 확인해 주세요." })
    }
    if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.InternalServerError)
      return json(503, { error: "AI 서비스가 붐빕니다. 잠시 후 다시 시도해 주세요." })
    console.error("[practice-draft] 실패:", err)
    return json(500, { error: "초안을 만들지 못했습니다. 잠시 후 다시 시도해 주세요." })
  }
}

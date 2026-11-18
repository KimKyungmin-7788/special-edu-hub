import type { AppCheck, Safety } from "@/lib/safety"

/**
 * 자동 점검 결과를 KERIS 「공교육 에듀테크 개인정보보호 가이드」(2026, GM 2026-1)의
 * 학습지원 소프트웨어 필수기준(5개 영역 9개 항목)에 맞춰 묶는다.
 * 번호는 api/safety-check.ts 의 RULE_CRITERIA 와 같다.
 * 가이드는 학생 개인정보를 처리하는 소프트웨어에만 적용된다(가이드 6쪽) → 처리 흔적이 없으면 '해당 없음'.
 * 보안 헤더(CSP)는 가이드가 직접 요구하는 항목이 아니라서 기준 밖 '기본 보안 권장'으로 따로 둔다.
 *
 * 화면은 고칠 것(실제로 찾은 문제)·확인할 것(조건에 따른 의무)·권장을 나눠 짧게, 항목마다 AI에게 붙여 넣을 프롬프트를 둔다.
 * 9개 기준 전체는 펼쳐 보기. **낱말** = 강조(Emphasis).
 */
export const criteriaSource = {
  name: "KERIS 공교육 에듀테크 개인정보보호 가이드(2026) 필수기준",
  caveat: "가이드는 연구·집필진의 견해(KERIS 공식 의견 아님)이며, 누리집 점검은 법률 검토나 학교운영위원회 심의를 대신하지 않습니다.",
}

export type CriterionState = "ok" | "attention" | "self" | "na" | "recommend"

export const criterionStateText: Record<CriterionState, string> = {
  ok: "충족 신호",
  attention: "확인 필요",
  self: "작성자 확인",
  na: "해당 없음",
  recommend: "권장",
}

export type CriterionResult = { id: string; title: string; state: CriterionState; note: string }
/**
 * level: fix = 고칠 것(누리집이 실제로 찾은 문제), check = 확인할 것(서버 저장 앱이면 누구나 챙기는 의무),
 * recommend = 권장(기준 밖 기본 보안). prompt = AI 코딩 도구에 붙여 넣을 글
 */
export type TodoLevel = "fix" | "check" | "recommend"
export type Todo = { text: string; ids: string[]; level: TodoLevel; prompt: string }
export const todoLevelText: Record<TodoLevel, string> = { fix: "고칠 것", check: "확인할 것", recommend: "권장" }

const BACKEND = { supabase: "Supabase", firebase: "Firebase", "google-apps-script": "구글 앱스 스크립트" } as Record<string, string>
const AI = { openai: "OpenAI", gemini: "Gemini", claude: "Claude" } as Record<string, string>
const DEVICE = { "camera-microphone": "카메라·마이크", location: "위치" } as Record<string, string>
const names = (list: string[], map: Record<string, string>) => list.map((x) => map[x] ?? x).join("·")

const NA = "학생 정보를 서버로 보내는 흔적이 없습니다."

/** 처리방침에 적을 내용(기준 번호 → 짧은 이름) — 할 일 한 줄로 묶는다 */
const POLICY: Record<string, { title: string; what: string; obj: string }> = {
  "1-2": { title: "수집·이용 목적", what: "목적", obj: "을" },
  "1-3": { title: "수집 항목·보유 기간", what: "항목·보관 기간", obj: "을" },
  "2-1": { title: "안전조치", what: "안전조치", obj: "를" },
  "3-1": { title: "열람·정정·삭제 절차", what: "보고 고치고 지우는 방법", obj: "을" },
  "5-1": { title: "보호책임자 안내", what: "연락처", obj: "를" },
}

/** AI 코딩 도구(Claude·Codex·ChatGPT 등)에 그대로 붙여 넣는 프롬프트 */
const PROMPTS = {
  csp: `내 웹앱에 보안 헤더(Content-Security-Policy)를 넣어 줘.
- 배포한 곳에 맞게 넣어 줘: Vercel이면 vercel.json, Netlify면 _headers 파일, 헤더를 넣을 수 없는 곳(GitHub Pages 등)이면 index.html의 <meta http-equiv="Content-Security-Policy">.
- 앱이 실제로 불러오는 외부 주소(글꼴, 스크립트, API)만 허용해 줘.
- 넣은 뒤 앱이 그대로 잘 동작하는지 확인하고, 무엇을 허용했는지 쉬운 말로 설명해 줘.`,
  secret: `점검에서 내 앱 코드에 비밀 키가 그대로 들어 있다고 나왔어. 단계별로 고쳐 줘.
1. 코드에서 비밀 키를 찾아 빼 줘.
2. 키가 꼭 필요한 기능은 서버 쪽(예: Vercel 서버리스 함수)과 환경변수로 옮겨 줘.
3. 이미 드러난 키는 그 서비스 사이트에서 폐기하고 새로 발급해야 한다는 것을 순서대로 알려 줘.
키 값을 채팅에 붙여 넣으라고 하거나 다시 보여 주지 마.`,
  device: (what: string) => `내 앱이 ${what} 기능을 쓰고 있어.
- 이 기능이 수업에 꼭 필요한지 함께 검토해 줘.
- 필요하면 학생이 버튼을 눌렀을 때만 켜지고 끝나면 꺼지게 해 줘. 필요 없으면 관련 코드를 지워 줘.
- 녹화·사진·위치를 저장하거나 밖으로 보내는 코드가 있는지도 찾아서 알려 줘.`,
  policyLink: `내 웹앱 첫 화면(맨 아래 등 잘 보이는 곳)에 개인정보처리방침 링크를 달아 줘.
처리방침 페이지가 아직 없다면 먼저 만들어야 한다고 알려 주고, 만들 때는 코드에서 확인할 수 없는 내용을 지어내지 말고 '[직접 입력]'으로 비워 둬.`,
  mismatch: `내 앱 코드에서 학생 정보를 서버(Supabase, Firebase, 구글 앱스 스크립트 등)에 저장하거나 보내는 부분을 모두 찾아서,
무엇을 어디에 저장하는지 표로 정리해 줘.
서버 저장이 꼭 필요하지 않다면 기기 안(localStorage)에만 두도록 바꾸는 방법도 알려 줘.`,
  minimal: `내 앱이 학생에게서 모으는 정보를 모두 찾아 표로 정리해 줘.
수업 기능에 꼭 필요한 것과 없어도 되는 것을 나누고, 없어도 되는 항목은 지우거나 선택 항목으로 바꾸는 코드를 제안해 줘.`,
  over14: `내 앱은 만 14세 이상만 쓰도록 했어.
가입이나 첫 화면에서 실제로 만 14세 미만의 이용을 막고 있는지 코드를 확인하고, 없다면 간단한 연령 확인 단계를 넣어 줘.`,
  guardian: `내 앱을 만 14세 미만 학생도 써. 개인정보 보호법 제22조의2에 맞게 보호자 동의를 받는 방법을 정리해 줘.
- 학교에서 가정통신문으로 받는 방법과 앱 안에서 받는 방법을 비교해 줘.
- 가정통신문에 넣을 동의 문구 초안(수집 항목, 목적, 보관 기간, 동의하지 않을 권리)도 써 줘.`,
  policy: (hasPolicy: boolean, services: string) => `내 웹앱의 개인정보처리방침을 ${hasPolicy ? "점검하고 고쳐" : "만들어"} 줘.
1. 먼저 코드를 읽고 실제로 수집·저장하는 학생 정보와 외부 서비스${services ? `(${services} 등)` : ""}를 찾아 줘.
2. KERIS 공교육 에듀테크 개인정보보호 가이드(2026) 필수기준에 맞춰 다음을 쉬운 말로 적어 줘:
   수집·이용 목적, 수집 항목과 보관 기간, 안전조치, 열람·정정·삭제 방법, 보호책임자 연락처${services ? ", 외부 서비스에 맡기거나 넘기는 정보(위탁·제3자 제공)" : ""}.
3. 코드에서 확인할 수 없는 내용은 지어내지 말고 '[직접 입력]'으로 비워 둬.
4. ${hasPolicy ? "첫 화면에서 방침 링크가 잘 보이는지 확인해 줘." : "첫 화면 아래에 방침 링크를 달아 줘."}`,
}

/** 점검 결과 + 등록 교사가 입력한 안전 확인 정보 → 할 일·권장과 기준별 결과. 파일을 받아 보지 못한 점검이면 null */
export function evaluateCriteria(
  check: AppCheck,
  safety: Safety | null,
): { processing: boolean; summary: string; todos: Todo[]; results: CriterionResult[]; baseline: CriterionResult } | null {
  if (check.status === "unverifiable") return null
  const f = check.facts
  const backend = f.backendHosts ?? []
  const ai = f.aiHosts ?? []
  const device = f.devicePermissions ?? []
  const rules = new Set(check.findings.map((x) => x.rule))
  const processing = safety?.studentData === "server" || backend.length > 0 || ai.length > 0
  const todos: Todo[] = []
  const results: CriterionResult[] = []
  const add = (level: TodoLevel, text: string, ids: string[], prompt: string) => todos.push({ text, ids, level, prompt })

  // 2-1 안전조치 — 드러난 비밀 키·https 는 처리 여부와 관계없이 맨 먼저 고칠 것
  const secrets = check.findings.filter((x) => x.rule.startsWith("secret_") || x.rule === "google_api_key" || x.rule === "insecure")
  if (secrets.length > 0) add("fix", "드러난 **비밀 키**가 있음 → 지우고 새 키로 바꾸기", ["2-1"], PROMPTS.secret)

  // 1-1 최소 수집
  if (rules.has("declared_storage_mismatch")) {
    results.push({ id: "1-1", title: "최소 수집", state: "attention", note: "입력한 **저장 방식**과 점검 결과가 다릅니다." })
    add("fix", "입력한 저장 방식과 달리 **서버 저장** 흔적이 있음 → 확인하고 안전 확인 정보 고치기", ["1-1"], PROMPTS.mismatch)
  } else if (device.length > 0) {
    results.push({ id: "1-1", title: "최소 수집", state: "attention", note: `**${names(device, DEVICE)}** 기능을 쓰는 코드가 있습니다.` })
    add("fix", `**${names(device, DEVICE)}** 기능을 쓰는 코드가 있음 → 수업에 꼭 필요한지 확인하기`, ["1-1"], PROMPTS.device(names(device, DEVICE)))
  } else if (processing) {
    results.push({ id: "1-1", title: "최소 수집", state: "self", note: "수업에 **꼭 필요한 정보만** 모으는지 확인해 주세요." })
    add("check", "학생 정보는 **꼭 필요한 것만** 모으는지 확인하기", ["1-1"], PROMPTS.minimal)
  } else results.push({ id: "1-1", title: "최소 수집", state: "na", note: NA })


  // 1-2 · 1-3 · 2-1 · 3-1 · 5-1 처리방침 내용 — 누리집이 내용을 읽지 못하므로 작성자 확인
  for (const id of Object.keys(POLICY)) {
    if (id === "2-1" && secrets.length > 0) {
      results.push({ id, title: POLICY[id].title, state: "attention", note: secrets.map((x) => x.evidence.replace(/^\[[^\]]+\]\s*/, "")).join(" / ") })
      continue
    }
    results.push({
      id,
      title: POLICY[id].title,
      state: !processing ? "na" : f.hasPrivacyLink ? "self" : "attention",
      note: !processing ? NA : `개인정보처리방침에 **${POLICY[id].what}**${POLICY[id].obj} 적어 주세요.`,
    })
  }

  // 4-1 만 14세 미만
  if (!processing) results.push({ id: "4-1", title: "만 14세 미만 보호", state: "na", note: NA })
  else if (safety?.targetAge === "over14") {
    results.push({ id: "4-1", title: "만 14세 미만 보호", state: "self", note: "**만 14세 이상** 대상으로 입력했습니다." })
    add("check", "**만 14세 이상**만 쓰도록 실제로 막았는지 확인하기", ["4-1"], PROMPTS.over14)
  } else {
    const note = safety?.targetAge === "all" ? "전 연령 대상입니다(개인정보 보호법 제22조의2)." : "대상 연령을 입력하지 않았습니다."
    results.push({ id: "4-1", title: "만 14세 미만 보호", state: "attention", note })
    add("check", "만 14세 미만 학생은 **보호자 동의** 받기", ["4-1"], PROMPTS.guardian)
  }

  // 5-2 제3자 제공 · 5-3 처리 위탁 — 외부 주소가 보일 때만
  results.push(
    ai.length > 0
      ? { id: "5-2", title: "제3자 제공", state: "attention", note: `외부 AI 서비스(**${names(ai, AI)}**) 주소가 있습니다.` }
      : { id: "5-2", title: "제3자 제공", state: "na", note: "외부로 전달하는 주소를 찾지 못했습니다." },
    backend.length > 0
      ? { id: "5-3", title: "처리 위탁", state: "attention", note: `**${names(backend, BACKEND)}** 주소가 있습니다.` }
      : { id: "5-3", title: "처리 위탁", state: "na", note: "외부 저장 서비스 주소를 찾지 못했습니다." },
  )

  // 처리방침에 적을 것은 한 줄로 묶는다
  if (processing) {
    const ids = Object.keys(POLICY)
    const items = ids.map((id) => `**${POLICY[id].what}**`)
    if (backend.length > 0) {
      items.push(`**${names(backend, BACKEND)} 위탁**`)
      ids.push("5-3")
    }
    if (ai.length > 0) {
      items.push(`**${names(ai, AI)} 제공**`)
      ids.push("5-2")
    }
    const services = [...backend.map((x) => BACKEND[x] ?? x), ...ai.map((x) => AI[x] ?? x)].join(", ")
    if (!f.hasPrivacyLink) add("fix", "첫 화면에 **개인정보처리방침 링크**가 없음 → 처리방침을 만들어 달기", ["1-2"], PROMPTS.policyLink)
    add("check", `처리방침에 적을 내용 확인하기: ${items.join(", ")}`, ids, PROMPTS.policy(!!f.hasPrivacyLink, services))
  }

  // 기준 밖 기본 보안: 보안 헤더(CSP) — 가이드가 직접 요구하지 않으므로 권장
  const baseline: CriterionResult = f.hasCsp
    ? { id: "기본 보안", title: "보안 헤더(CSP)", state: "ok", note: "**보안 헤더(CSP)**가 있습니다." }
    : { id: "기본 보안", title: "보안 헤더(CSP)", state: "recommend", note: "**보안 헤더(CSP)**가 없습니다. 가이드 기준은 아니지만 넣기를 권장합니다." }
  if (!f.hasCsp) todos.push({ text: "배포 설정에 **보안 헤더(CSP)** 넣기", ids: ["기본 보안"], level: "recommend", prompt: PROMPTS.csp })

  const order: TodoLevel[] = ["fix", "check", "recommend"]
  todos.sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level))
  results.sort((a, b) => a.id.localeCompare(b.id))
  const summary = processing
    ? "개인정보 기준: **적용** — 학생 정보를 서버로 보내는 앱입니다."
    : "개인정보 기준: **해당 없음** — 학생 정보를 서버로 보내지 않습니다."
  return { processing, summary, todos, results, baseline }
}

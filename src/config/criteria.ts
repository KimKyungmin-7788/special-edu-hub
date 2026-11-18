import type { AppCheck, Safety } from "@/lib/safety"

/**
 * 자동 점검 결과를 KERIS 「공교육 에듀테크 개인정보보호 가이드」(2026, GM 2026-1)의
 * 학습지원 소프트웨어 필수기준(5개 영역 9개 항목)에 맞춰 묶는다.
 * 번호는 api/safety-check.ts 의 RULE_CRITERIA 와 같다.
 * 가이드는 학생 개인정보를 처리하는 소프트웨어에만 적용된다(가이드 6쪽) → 처리 흔적이 없으면 '해당 없음'.
 *
 * 화면은 '할 일' 중심으로 짧게, 9개 기준 전체는 펼쳐 보기로 둔다. **낱말** = 강조(Emphasis).
 */
export const criteriaSource = {
  name: "KERIS 공교육 에듀테크 개인정보보호 가이드(2026) 필수기준",
  caveat: "가이드는 연구·집필진의 견해(KERIS 공식 의견 아님)이며, 누리집 점검은 법률 검토나 학교운영위원회 심의를 대신하지 않습니다.",
}

export type CriterionState = "ok" | "attention" | "self" | "na"

export const criterionStateText: Record<CriterionState, string> = {
  ok: "충족 신호",
  attention: "확인 필요",
  self: "작성자 확인",
  na: "해당 없음",
}

export type CriterionResult = { id: string; title: string; state: CriterionState; note: string }
export type Todo = { text: string; ids: string[] }

const BACKEND = { supabase: "Supabase", firebase: "Firebase", "google-apps-script": "구글 앱스 스크립트" } as Record<string, string>
const AI = { openai: "OpenAI", gemini: "Gemini", claude: "Claude" } as Record<string, string>
const DEVICE = { "camera-microphone": "카메라·마이크", location: "위치" } as Record<string, string>
const names = (list: string[], map: Record<string, string>) => list.map((x) => map[x] ?? x).join("·")

const NA = "학생 정보를 서버로 보내는 흔적이 없습니다."

/** 처리방침에 적을 내용(기준 번호 → 짧은 이름) — 할 일 한 줄로 묶는다 */
const POLICY: Record<string, { title: string; what: string; obj: string }> = {
  "1-2": { title: "수집·이용 목적", what: "목적", obj: "을" },
  "1-3": { title: "수집 항목·보유 기간", what: "항목·보관 기간", obj: "을" },
  "3-1": { title: "열람·정정·삭제 절차", what: "보고 고치고 지우는 방법", obj: "을" },
  "5-1": { title: "보호책임자 안내", what: "연락처", obj: "를" },
}

/** 점검 결과 + 등록 교사가 입력한 안전 확인 정보 → 할 일과 기준별 결과. 파일을 받아 보지 못한 점검이면 null */
export function evaluateCriteria(
  check: AppCheck,
  safety: Safety | null,
): { processing: boolean; summary: string; todos: Todo[]; results: CriterionResult[] } | null {
  if (check.status === "unverifiable") return null
  const f = check.facts
  const backend = f.backendHosts ?? []
  const ai = f.aiHosts ?? []
  const device = f.devicePermissions ?? []
  const rules = new Set(check.findings.map((x) => x.rule))
  const processing = safety?.studentData === "server" || backend.length > 0 || ai.length > 0
  const todos: Todo[] = []
  const results: CriterionResult[] = []

  // 1-1 최소 수집
  if (rules.has("declared_storage_mismatch")) {
    results.push({ id: "1-1", title: "최소 수집", state: "attention", note: "입력한 **저장 방식**과 점검 결과가 다릅니다." })
    todos.push({ text: "학생 정보를 **서버에 저장**하는지 확인하고 안전 확인 정보 고치기", ids: ["1-1"] })
  } else if (device.length > 0) {
    results.push({ id: "1-1", title: "최소 수집", state: "attention", note: `**${names(device, DEVICE)}** 기능을 쓰는 코드가 있습니다.` })
    todos.push({ text: `**${names(device, DEVICE)}**가 수업에 꼭 필요한지 확인하기`, ids: ["1-1"] })
  } else if (processing) {
    results.push({ id: "1-1", title: "최소 수집", state: "self", note: "수업에 **꼭 필요한 정보만** 모으는지 확인해 주세요." })
    todos.push({ text: "학생 정보는 **꼭 필요한 것만** 모으기", ids: ["1-1"] })
  } else results.push({ id: "1-1", title: "최소 수집", state: "na", note: NA })

  // 1-2 · 1-3 · 3-1 · 5-1 처리방침 내용 — 누리집이 내용을 읽지 못하므로 작성자 확인
  const policyIds = Object.keys(POLICY)
  for (const id of policyIds)
    results.push({
      id,
      title: POLICY[id].title,
      state: !processing ? "na" : f.hasPrivacyLink ? "self" : "attention",
      note: !processing ? NA : `개인정보처리방침에 **${POLICY[id].what}**${POLICY[id].obj} 적어 주세요.`,
    })

  // 2-1 안전조치 — 학생 정보 처리와 관계없이 본다
  const secrets = check.findings.filter((x) => x.rule.startsWith("secret_") || x.rule === "google_api_key" || x.rule === "insecure")
  if (secrets.length > 0) {
    results.push({ id: "2-1", title: "안전조치", state: "attention", note: secrets.map((x) => x.evidence.replace(/^\[[^\]]+\]\s*/, "")).join(" / ") })
    todos.push({ text: "드러난 **비밀 키**를 지우고 새 키로 바꾸기", ids: ["2-1"] })
  } else if (!f.hasCsp) {
    results.push({ id: "2-1", title: "안전조치", state: "attention", note: "**보안 헤더(CSP)**가 없습니다." })
    todos.push({ text: "배포 설정에 **보안 헤더(CSP)** 넣기", ids: ["2-1"] })
  } else results.push({ id: "2-1", title: "안전조치", state: "ok", note: "**안전한 연결(https)**, **보안 헤더(CSP)** 있음, 드러난 비밀 키 없음" })

  // 4-1 만 14세 미만
  if (!processing) results.push({ id: "4-1", title: "만 14세 미만 보호", state: "na", note: NA })
  else if (safety?.targetAge === "over14") {
    results.push({ id: "4-1", title: "만 14세 미만 보호", state: "self", note: "**만 14세 이상** 대상으로 입력했습니다." })
    todos.push({ text: "**만 14세 이상**만 쓰도록 실제로 막았는지 확인하기", ids: ["4-1"] })
  } else {
    const note = safety?.targetAge === "all" ? "전 연령 대상입니다(개인정보 보호법 제22조의2)." : "대상 연령을 입력하지 않았습니다."
    results.push({ id: "4-1", title: "만 14세 미만 보호", state: "attention", note })
    todos.push({ text: "만 14세 미만 학생은 **보호자 동의** 받기", ids: ["4-1"] })
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
    const items = policyIds.map((id) => `**${POLICY[id].what}**`)
    const ids = [...policyIds]
    if (backend.length > 0) {
      items.push(`**${names(backend, BACKEND)} 위탁**`)
      ids.push("5-3")
    }
    if (ai.length > 0) {
      items.push(`**${names(ai, AI)} 제공**`)
      ids.push("5-2")
    }
    todos.push({
      text: `${f.hasPrivacyLink ? "개인정보처리방침에 적기" : "**개인정보처리방침**을 만들고 적기"}: ${items.join(", ")}`,
      ids,
    })
  }

  results.sort((a, b) => a.id.localeCompare(b.id))
  const safeOk = results.find((r) => r.id === "2-1")?.state === "ok"
  const summary = processing
    ? "학생 정보를 **서버로 보내는 앱**으로 보고 점검했습니다."
    : `학생 정보를 서버로 보내지 않아 개인정보 필수기준 **해당 없음**입니다.${safeOk ? " **안전한 연결**·**보안 헤더** 확인됨." : ""}`
  return { processing, summary, todos, results }
}

import { supabase } from "@/lib/supabase"

/**
 * 자료별 안전 확인 정보 (67_app_safety.sql) — 등록 교사가 적는 선택 입력.
 * 저장할 때마다 새 줄이 쌓이고(이력), 가장 최근 줄이 그 자료의 현재 정보다.
 */

export type StudentData = "none" | "device" | "server"
export type DataItem = "non_identifying" | "identifying" | "other"
export type TargetAge = "all" | "over14"
export type Copyright = "own" | "includes_others"

export type Safety = {
  studentData: StudentData | null
  dataItems: DataItem[]
  dataOther: string
  studentAi: boolean | null
  aiService: string
  targetAge: TargetAge | null
  copyright: Copyright | null
  /** 저장한 시각(읽어 온 것만) */
  createdAt?: string
}

export const EMPTY_SAFETY: Safety = {
  studentData: null,
  dataItems: [],
  dataOther: "",
  studentAi: null,
  aiService: "",
  targetAge: null,
  copyright: null,
}

/** 화면에서 보이지 않는 칸의 값은 버리고 정리한다(예: 저장하지 않음이면 저장 항목 없음). */
export function cleanSafety(v: Safety): Safety {
  const stored = v.studentData === "device" || v.studentData === "server"
  const ai = v.studentAi === true
  const items = stored ? v.dataItems : []
  return {
    studentData: v.studentData,
    dataItems: items,
    dataOther: items.includes("other") ? v.dataOther.trim() : "",
    studentAi: v.studentAi,
    aiService: ai ? v.aiService.trim() : "",
    targetAge: stored || ai ? v.targetAge : null,
    copyright: v.copyright,
  }
}

/** 아무것도 고르지 않았는지 */
export function isEmptySafety(v: Safety): boolean {
  return v.studentData === null && v.studentAi === null && v.copyright === null
}

/** 보호자 동의 안내를 띄울 조건: 전 연령 + 서버에 저장 + 개인식별가능정보 */
export function needsGuardianConsent(v: Safety): boolean {
  return v.targetAge === "all" && v.studentData === "server" && v.dataItems.includes("identifying")
}

type Row = {
  student_data: StudentData | null
  data_items: DataItem[]
  data_other: string
  student_ai: boolean | null
  ai_service: string
  target_age: TargetAge | null
  copyright: Copyright | null
  created_at: string
}

/** 자료의 현재 안전 확인 정보. 없거나 67 미적용 DB 면 null */
export async function getSafety(appId: string): Promise<Safety | null> {
  const { data, error } = await supabase
    .from("app_safety_declarations")
    .select("student_data, data_items, data_other, student_ai, ai_service, target_age, copyright, created_at")
    .eq("app_id", appId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  const r = data as Row
  return {
    studentData: r.student_data,
    dataItems: r.data_items ?? [],
    dataOther: r.data_other,
    studentAi: r.student_ai,
    aiService: r.ai_service,
    targetAge: r.target_age,
    copyright: r.copyright,
    createdAt: r.created_at,
  }
}

/** 안전 확인 정보 저장(새 줄 추가). RLS: 자료 작성자 또는 운영진 */
export async function saveSafety(appId: string, value: Safety): Promise<void> {
  const { data: session } = await supabase.auth.getSession()
  const uid = session.session?.user.id
  if (!uid) throw new Error("로그인이 필요합니다.")
  const v = cleanSafety(value)
  const { error } = await supabase.from("app_safety_declarations").insert({
    app_id: appId,
    declared_by: uid,
    student_data: v.studentData,
    data_items: v.dataItems,
    data_other: v.dataOther,
    student_ai: v.studentAi,
    ai_service: v.aiService,
    target_age: v.targetAge,
    copyright: v.copyright,
  })
  if (error) throw error
}

/** 두 값이 같은 내용인지(저장 시각 제외) — 바뀐 경우에만 새 줄을 넣는다 */
export function sameSafety(a: Safety, b: Safety): boolean {
  const key = (v: Safety) => {
    const c = cleanSafety(v)
    return JSON.stringify([c.studentData, [...c.dataItems].sort(), c.dataOther, c.studentAi, c.aiService, c.targetAge, c.copyright])
  }
  return key(a) === key(b)
}

import { supabase } from "@/lib/supabase"
import type { PracticeAppLink, PracticeFile, PracticeLink, PracticePlan, PracticeVisibility } from "@/lib/practices"

/**
 * 작성 중인 수업 사례(73) — 사례 쓰기 화면이 자동으로 저장해 두고, 다시 들어오면 이어 쓴다.
 * 본인만 읽고 쓴다(RLS). 올리기에 성공하면 지운다.
 * 대표 사진을 새로 고른 파일(아직 올리지 않은 것)은 저장하지 않는다 — 주소가 있는 표지만.
 */

const TABLE = "practice_writing_drafts"

export type WritingDraftData = {
  format: "plan" | "free"
  title: string
  summary: string
  coverUrl: string
  subjects: string[]
  subs: Record<string, string[]>
  target: string
  lessonCount: string
  body: string
  apps: PracticeAppLink[]
  links: PracticeLink[]
  files: PracticeFile[]
  visibility: PracticeVisibility
  plan: PracticePlan
}

export type WritingDraft = { id: string; title: string; data: WritingDraftData; updatedAt: string }

export async function listWritingDrafts(): Promise<WritingDraft[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, title, data, updated_at")
    .order("updated_at", { ascending: false })
  if (error) {
    console.error("[drafts] 목록 실패:", error.message)
    return []
  }
  return (data as { id: string; title: string; data: WritingDraftData; updated_at: string }[]).map((r) => ({
    id: r.id,
    title: r.title,
    data: r.data,
    updatedAt: r.updated_at,
  }))
}

/** 저장(새로 만들거나 덮어쓰기). 저장된 id 와 서버 시각을 돌려준다. */
export async function saveWritingDraft(
  id: string | null,
  title: string,
  data: WritingDraftData,
): Promise<{ id: string; updatedAt: string }> {
  const row = { title: Array.from(title.trim()).slice(0, 100).join(""), data }
  const q = id
    ? supabase.from(TABLE).update(row).eq("id", id).select("id, updated_at").single()
    : supabase.from(TABLE).insert(row).select("id, updated_at").single()
  const { data: saved, error } = await q
  if (error) throw error
  const r = saved as { id: string; updated_at: string }
  return { id: r.id, updatedAt: r.updated_at }
}

export async function deleteWritingDraft(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id)
  if (error) console.error("[drafts] 삭제 실패:", error.message)
}

/** 카드·저장 표시용 날짜·시간: "11월 20일 (목) 오후 2:32" */
export function formatDraftTime(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}

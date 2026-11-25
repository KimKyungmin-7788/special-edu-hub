import { supabase } from "@/lib/supabase"
import { removeThumbnail } from "@/lib/apps"
import type { ProjectStatus } from "@/config/projects"

/**
 * 협업 프로젝트 데이터 접근 (PRD §15, 79_collab_projects.sql).
 * 보기는 누구나, 열기는 교사인증 회원, 고치기·지우기는 리더 본인·운영진(RLS).
 */

/** DB check 와 같은 값(79). */
export const PROJECT_TITLE_MAX = 40
export const PROJECT_VISION_MAX = 60
export const PROJECT_BODY_MAX = 2000
export const PROJECT_NEEDED_MAX = 10

export type Project = {
  id: string
  leader_id: string
  title: string
  vision: string
  body: string
  cover_url: string
  mockup_url: string
  needed: number
  status: ProjectStatus
  due_date: string | null
  created_at: string
  leader: { nickname: string | null; avatar_url: string | null } | null
}

export type ProjectInput = Pick<Project, "title" | "vision" | "body" | "cover_url" | "mockup_url" | "needed">

const SELECT = "*, leader:profiles!collab_projects_leader_id_fkey(nickname, avatar_url)"

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase.from("collab_projects").select(SELECT).order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as Project[]
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase.from("collab_projects").select(SELECT).eq("id", id).maybeSingle()
  if (error) throw error
  return data as unknown as Project | null
}

/** 모집 중·작업 중 수(바이브코딩 화면의 협업 프로젝트 패널) */
export async function countActive(): Promise<{ recruiting: number; working: number }> {
  const { data, error } = await supabase.from("collab_projects").select("status").in("status", ["recruiting", "working"])
  if (error) throw error
  const rows = data ?? []
  return { recruiting: rows.filter((r) => r.status === "recruiting").length, working: rows.filter((r) => r.status === "working").length }
}

export async function createProject(leaderId: string, input: ProjectInput): Promise<string> {
  const { data, error } = await supabase
    .from("collab_projects")
    .insert({ leader_id: leaderId, ...input })
    .select("id")
    .single()
  if (error) throw error
  return data.id as string
}

export async function updateProject(id: string, input: ProjectInput): Promise<void> {
  const { data, error } = await supabase.from("collab_projects").update(input).eq("id", id).select("id")
  if (error) throw error
  if (!data?.length) throw new Error("고칠 권한이 없어요.")
}

/** 지운 뒤 대표 사진도 정리한다(실패해도 삭제는 끝난 것). */
export async function deleteProject(project: Project): Promise<void> {
  const { data, error } = await supabase.from("collab_projects").delete().eq("id", project.id).select("id")
  if (error) throw error
  if (!data?.length) throw new Error("지울 권한이 없어요.")
  if (project.cover_url) await removeThumbnail(project.cover_url).catch(() => {})
}

/** 표에 없을 때(SQL 79 적용 전) 알아볼 수 있는 안내 */
export function projectError(e: unknown): string {
  const code = (e as { code?: string })?.code
  if (code === "42P01" || code === "PGRST205") return "협업 프로젝트를 준비하고 있습니다."
  return "협업 프로젝트를 불러오지 못했어요."
}

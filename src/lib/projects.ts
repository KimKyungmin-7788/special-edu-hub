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
  review: string
  app_id: string | null
  done_at: string | null
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

// ── 2묶음: 협업 요청·결성·팀 공간 (80_collab_requests.sql) ──

export const REQUEST_WORK_MAX = 60
export const REQUEST_MESSAGE_MAX = 300
export const REQUEST_GOAL_MAX = 200
export const KAKAO_URL = /^https:\/\/open\.kakao\.com\/[A-Za-z0-9/_-]+$/

export type RequestStatus = "pending" | "accepted" | "declined" | "closed"

export type CollabRequest = {
  id: string
  project_id: string
  user_id: string
  work: string
  message: string
  goal: string
  status: RequestStatus
  created_at: string
  requester?: { nickname: string | null; avatar_url: string | null } | null
  project?: Pick<Project, "id" | "title" | "status" | "needed" | "due_date"> | null
}

export type Member = { user_id: string; nickname: string | null; avatar_url: string | null }

/** RPC 가 던진 안내 문장은 그대로, 그 밖에는 일반 안내 */
export function rpcError(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? ""
  return /[가-힣]/.test(msg) ? msg : "처리하지 못했어요. 잠시 뒤 다시 시도해 주세요."
}

export async function getMembers(projectId: string): Promise<Member[]> {
  const { data, error } = await supabase.rpc("collab_members", { p_project: projectId })
  if (error) throw error
  return (data ?? []) as Member[]
}

/** 리더: 이 프로젝트에 온 요청 전부 / 신청자: 내 요청 한 건(RLS 가 걸러 준다) */
export async function getRequests(projectId: string): Promise<CollabRequest[]> {
  const { data, error } = await supabase
    .from("collab_requests")
    .select("*, requester:profiles!collab_requests_user_id_fkey(nickname, avatar_url)")
    .eq("project_id", projectId)
    .order("created_at")
  if (error) throw error
  return (data ?? []) as unknown as CollabRequest[]
}

export async function getTeamLink(projectId: string): Promise<string | null> {
  const { data, error } = await supabase.from("collab_team_links").select("kakao_url").eq("project_id", projectId).maybeSingle()
  if (error) throw error
  return data?.kakao_url ?? null
}

export async function sendRequest(projectId: string, work: string, message: string, goal: string) {
  const { error } = await supabase.rpc("send_collab_request", { p_project: projectId, p_work: work, p_message: message, p_goal: goal })
  if (error) throw error
}

export async function cancelRequest(requestId: string) {
  const { error } = await supabase.rpc("cancel_collab_request", { p_request: requestId })
  if (error) throw error
}

export async function decideRequest(requestId: string, accept: boolean) {
  const { error } = await supabase.rpc("decide_collab_request", { p_request: requestId, p_accept: accept })
  if (error) throw error
}

export async function formProject(projectId: string, due: string, kakao: string) {
  const { error } = await supabase.rpc("form_collab_project", { p_project: projectId, p_due: due, p_kakao: kakao })
  if (error) throw error
}

export async function setTeamLink(projectId: string, kakao: string) {
  const { error } = await supabase.rpc("set_collab_team_link", { p_project: projectId, p_kakao: kakao })
  if (error) throw error
}

/** 마이페이지 '내 협업': 내가 연 프로젝트(+ 기다리는 요청 수)와 내가 보낸 요청 */
export async function getMyCollabs(userId: string) {
  const [led, mine] = await Promise.all([
    supabase.from("collab_projects").select("id, title, status, needed, due_date, collab_requests(status)").eq("leader_id", userId).order("created_at", { ascending: false }),
    supabase.from("collab_requests").select("*, project:collab_projects(id, title, status, needed, due_date)").eq("user_id", userId).order("created_at", { ascending: false }),
  ])
  if (led.error) throw led.error
  if (mine.error) throw mine.error
  const ledRows = (led.data ?? []) as unknown as (Pick<Project, "id" | "title" | "status" | "needed" | "due_date"> & { collab_requests: { status: RequestStatus }[] })[]
  return {
    led: ledRows.map(({ collab_requests, ...p }) => ({
      ...p,
      pending: collab_requests.filter((r) => r.status === "pending").length,
      accepted: collab_requests.filter((r) => r.status === "accepted").length,
    })),
    requests: (mine.data ?? []) as unknown as CollabRequest[],
  }
}

// ── 3묶음: 진행 소식·마감 지남·완성·소감 (81_collab_progress.sql) ──

export const UPDATE_MAX = 100
export const NOTE_MAX = 100
export const REVIEW_MAX = 2000

export type CollabUpdate = { id: string; body: string; created_at: string }
export type CollabNote = { user_id: string; body: string; nickname: string | null }

/** 오늘(내 컴퓨터 날짜, YYYY-MM-DD) */
export function todayLocal(): string {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** 작업 중인데 마감일이 오늘보다 앞이면 마감 지남 */
export function isOverdue(p: Pick<Project, "status" | "due_date">): boolean {
  return p.status === "working" && !!p.due_date && p.due_date < todayLocal()
}

export async function getUpdates(projectId: string): Promise<CollabUpdate[]> {
  const { data, error } = await supabase.from("collab_updates").select("id, body, created_at").eq("project_id", projectId).order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getNotes(projectId: string): Promise<CollabNote[]> {
  const { data, error } = await supabase.from("collab_notes").select("user_id, body, author:profiles!collab_notes_user_id_fkey(nickname)").eq("project_id", projectId).order("created_at")
  if (error) throw error
  return ((data ?? []) as unknown as { user_id: string; body: string; author: { nickname: string | null } | null }[])
    .map((n) => ({ user_id: n.user_id, body: n.body, nickname: n.author?.nickname ?? null }))
}

async function call(fn: string, args: Record<string, unknown>) {
  const { error } = await supabase.rpc(fn, args)
  if (error) throw error
}

export const addUpdate = (projectId: string, body: string) => call("add_collab_update", { p_project: projectId, p_body: body })
export const deleteUpdate = (updateId: string) => call("delete_collab_update", { p_update: updateId })
export const extendDue = (projectId: string, due: string) => call("extend_collab_due", { p_project: projectId, p_due: due })
export const finishProject = (projectId: string, review: string, appId: string) => call("finish_collab_project", { p_project: projectId, p_review: review, p_app: appId })
export const stopProject = (projectId: string) => call("stop_collab_project", { p_project: projectId })
export const setNote = (projectId: string, body: string) => call("set_collab_note", { p_project: projectId, p_body: body })

/** 첫 화면 날개 배너·띠: 모집 중 프로젝트(최신순) */
export async function getRecruiting(): Promise<Pick<Project, "id" | "title" | "needed">[]> {
  const { data, error } = await supabase.from("collab_projects").select("id, title, needed").eq("status", "recruiting").order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

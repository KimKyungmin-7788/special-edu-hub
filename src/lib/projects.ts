import DOMPurify from "dompurify"
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
/** 소개는 자료 작성과 같은 편집기(HTML) — 83 에서 게시판과 같은 한도로 늘림 */
export const PROJECT_BODY_MAX = 100000
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
  /** 모집 마감일(82). 82 전에 연 프로젝트는 null */
  recruit_until: string | null
  app_id: string | null
  done_at: string | null
  /** 85: 조회수·좋아요 수(DB 함수·트리거만 바꿈). 85 전이면 없을 수 있다 */
  view_count?: number
  like_count?: number
  leader: { nickname: string | null; avatar_url: string | null } | null
}

export type ProjectInput = Pick<Project, "title" | "vision" | "body" | "cover_url" | "mockup_url" | "needed" | "recruit_until" | "due_date">

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
    .insert({ leader_id: leaderId, ...input, body: DOMPurify.sanitize(input.body) })
    .select("id")
    .single()
  if (error) throw error
  return data.id as string
}

export async function updateProject(id: string, input: ProjectInput): Promise<void> {
  const { data, error } = await supabase.from("collab_projects").update({ ...input, body: DOMPurify.sanitize(input.body) }).eq("id", id).select("id")
  if (error) throw error
  if (!data?.length) throw new Error("고칠 권한이 없어요.")
}

/** 지운 뒤 대표 사진도 정리한다(실패해도 삭제는 끝난 것). */
export async function deleteProject(project: Project): Promise<void> {
  const { data, error } = await supabase.from("collab_projects").delete().eq("id", project.id).select("id")
  if (error) throw error
  if (!data?.length) throw new Error("지울 권한이 없어요.")
  if (!project.cover_url) return
  // 등록된 자료의 썸네일을 대표 사진으로 같이 쓰는 경우(87·88)에는 파일을 남긴다
  const { data: shared, error: checkError } = await supabase.from("apps").select("id").eq("thumbnail_url", project.cover_url).limit(1)
  if (!checkError && !shared?.length) await removeThumbnail(project.cover_url).catch(() => {})
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

/** 모집 마감까지 남은 날(오늘 마감 = 0). 마감일 없으면 null */
export function daysLeft(until: string | null): number | null {
  if (!until) return null
  return Math.round((Date.parse(until) - Date.parse(todayLocal())) / 86400000)
}

/** 모집 중인데 모집 마감일이 지나 새 요청을 받지 않는 상태(82) */
export function isRecruitClosed(p: Pick<Project, "status" | "recruit_until">): boolean {
  return p.status === "recruiting" && !!p.recruit_until && p.recruit_until < todayLocal()
}

/** 모집 기한만 늘리기(모집 중, 리더) — DB 트리거가 날짜를 다시 검사한다 */
export async function extendRecruit(id: string, until: string): Promise<void> {
  const { data, error } = await supabase.from("collab_projects").update({ recruit_until: until }).eq("id", id).select("id")
  if (error) throw error
  if (!data?.length) throw new Error("고칠 권한이 없어요.")
}

/** 첫 화면 날개 배너·띠: 요청을 받는 모집 중 프로젝트(마감 가까운 순 → 마감일 없는 것은 최신순, 마감 지난 것 뺌) */
export async function getRecruiting(): Promise<Pick<Project, "id" | "title" | "needed" | "recruit_until">[]> {
  const { data, error } = await supabase.from("collab_projects").select("id, title, needed, recruit_until").eq("status", "recruiting").or(`recruit_until.is.null,recruit_until.gte.${todayLocal()}`).order("recruit_until", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

// ── 조회수·좋아요 (85_collab_engagement.sql, 게시판과 같은 방식) ──

const VIEW_THROTTLE_MS = 24 * 60 * 60 * 1000 // 같은 프로젝트는 이 브라우저에서 하루 1회

/** 조회수 +1. 오류는 화면에 영향 없게 삼킨다. */
export async function incrementProjectView(id: string): Promise<void> {
  try {
    const key = `viewed_project_${id}`
    if (Date.now() - Number(localStorage.getItem(key) || 0) < VIEW_THROTTLE_MS) return
    localStorage.setItem(key, String(Date.now()))
  } catch {
    // 저장 불가 환경이면 제한 없이 진행
  }
  const { error } = await supabase.rpc("increment_collab_view", { p_project: id })
  if (error) console.error("[projects] 조회수 실패:", error.message)
}

export async function isProjectLiked(id: string, uid: string): Promise<boolean> {
  const { count, error } = await supabase.from("collab_project_likes").select("project_id", { count: "exact", head: true }).eq("user_id", uid).eq("project_id", id)
  if (error) return false
  return (count ?? 0) > 0
}

/** 좋아요 켜기/끄기. 개수는 DB 트리거가 like_count 에 반영. */
export async function setProjectLike(id: string, uid: string, on: boolean): Promise<void> {
  const { error } = on
    ? await supabase.from("collab_project_likes").insert({ user_id: uid, project_id: id })
    : await supabase.from("collab_project_likes").delete().eq("user_id", uid).eq("project_id", id)
  if (error && error.code !== "23505") throw error // 이미 눌러 둔 경우(중복)는 성공으로 본다
}

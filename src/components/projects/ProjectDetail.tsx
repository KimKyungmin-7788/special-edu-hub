import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { Check, ExternalLink, Share2, X } from "lucide-react"
import { projectPath, projects } from "@/config/projects"
import { useAuth } from "@/lib/auth"
import {
  deleteProject, getMembers, getNotes, getProject, getRequests, getTeamLink, getUpdates, isOverdue, projectError,
  type CollabNote, type CollabRequest, type CollabUpdate, type Member, type Project,
} from "@/lib/projects"
import { ProfileTrigger } from "@/components/profile/ProfileTrigger"
import { RichTextViewer } from "@/components/app/RichTextViewer"
import { BoardShareDialog } from "@/components/board/BoardShareDialog"
import { PersonAvatar } from "@/components/projects/PersonAvatar"
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge"
import { LeaderPanel, RequestPanel, TeamSpace } from "@/components/projects/ProjectCollab"
import { DoneSection, FinishForm, OverduePanel, UpdatesSection } from "@/components/projects/ProjectProgress"
import { usePageTitle } from "@/lib/usePageTitle"
import { cn } from "@/lib/utils"

/**
 * 프로젝트 상세 — 왼쪽 비전·소개, 오른쪽 필요 인원·리더·함께하는 사람·협업 요청.
 * 리더에게는 아래 '받은 요청'과 결성 확정, 리더·함께하는 사람에게는 작업 중일 때 맨 위 '팀 공간'.
 */
const md = (d: string) => { const [, m, day] = d.split("-"); return `${Number(m)}월 ${Number(day)}일` }

export function ProjectDetail() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const { user, isStaff } = useAuth()
  const [project, setProject] = useState<Project | null | undefined>(undefined)
  const [members, setMembers] = useState<Member[]>([])
  const [requests, setRequests] = useState<CollabRequest[]>([])
  const [link, setLink] = useState<string | null>(null)
  const [updates, setUpdates] = useState<CollabUpdate[]>([])
  const [notes, setNotes] = useState<CollabNote[]>([])
  const [finishing, setFinishing] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState("")
  usePageTitle(project?.title ?? projects.title)

  const load = useCallback(async () => {
    try {
      const p = await getProject(id)
      setProject(p)
      if (!p) return
      setMembers(await getMembers(id))
      setUpdates(p.status === "recruiting" ? [] : await getUpdates(id).catch(() => []))
      setNotes(p.status === "done" ? await getNotes(id).catch(() => []) : [])
      setFinishing(false)
      setRequests(user ? await getRequests(id) : [])
      setLink(user && p.status !== "recruiting" ? await getTeamLink(id).catch(() => null) : null)
    } catch (e) { setError(projectError(e)) }
  }, [id, user])
  useEffect(() => { load() }, [load])

  const back = <Link to={projects.listPath} className="mb-5 inline-block text-sm text-muted-foreground hover:text-primary">← {projects.title}</Link>
  if (error) return <>{back}<p role="alert" className="text-sm text-muted-foreground">{error}</p></>
  if (project === undefined) return <p role="status" className="text-sm text-muted-foreground">불러오는 중…</p>
  if (!project) return <>{back}<p role="alert">프로젝트를 찾을 수 없어요.</p></>
  const p = project
  const isLeader = !!user && user.id === p.leader_id
  const canEdit = isLeader || isStaff
  const mine = requests.find((r) => r.user_id === user?.id)
  const isMember = mine?.status === "accepted"
  /** 모집 중에는 방문자·신청자에게 함께하기 수·막대·이름을 숨긴다(부담 없이 요청하게, SQL 84) */
  const hideProgress = p.status === "recruiting" && !isLeader && !isStaff

  const recruitMeta = p.recruit_until ? `${md(p.created_at.slice(0, 10))} ~ ${md(p.recruit_until)}` : `${md(p.created_at.slice(0, 10))}부터`

  async function remove() {
    if (!confirm("이 프로젝트를 지울까요? 되돌릴 수 없어요.")) return
    try { await deleteProject(p); navigate(projects.listPath) } catch { alert("지우지 못했어요. 잠시 뒤 다시 시도해 주세요.") }
  }

  return <div>
    {back}
    {/* 마감 지남(리더만): 급한 일이라 두 칸 위 가로로 */}
    {isLeader && isOverdue(p) && !finishing && <OverduePanel project={p} onFinish={() => setFinishing(true)} onChange={load} />}
    {/* 왼쪽 = 리더가 처음 게시한 글, 오른쪽 = 진행 과정 타임라인 1:1 */}
    <div className="grid gap-8 lg:grid-cols-2">
      <article className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <ProjectStatusBadge project={p} />
          <button type="button" onClick={() => setSharing(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-2 text-sm whitespace-nowrap hover:bg-accent"><Share2 className="size-4" aria-hidden />공유</button>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight break-keep">{p.title}</h1>
        <p className="mt-4 rounded-lg bg-brand-soft px-4 py-3 text-lg leading-relaxed break-keep text-brand-muted-foreground">{p.vision}</p>
        {p.cover_url && <img src={p.cover_url} alt="" className="mt-6 aspect-video w-full rounded-xl border object-cover" />}
        {p.mockup_url && <a href={p.mockup_url} target="_blank" rel="noopener" className="mt-4 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold whitespace-nowrap text-primary hover:bg-brand-soft">{projects.detail.mockup}<ExternalLink className="size-4" aria-hidden /></a>}
        {p.body && <div className="mt-6"><RichTextViewer html={p.body} /></div>}
        {canEdit && <div className="mt-8 flex flex-wrap gap-3 border-t pt-5 text-sm">
          <Link to={`${projects.path}/${p.id}/edit`} className="rounded-md border px-4 py-2 whitespace-nowrap hover:bg-accent">고치기</Link>
          {isLeader && (p.status === "working" || p.status === "done") && !finishing && <button type="button" onClick={() => setFinishing(true)} className="rounded-md border px-4 py-2 whitespace-nowrap hover:bg-accent">{p.status === "done" ? projects.finish.edit : projects.finish.heading}</button>}
          <button type="button" onClick={remove} className="rounded-md border px-4 py-2 whitespace-nowrap text-destructive hover:bg-accent">지우기</button>
        </div>}
      </article>
      {/* 진행 과정: 세로 타임라인(모집 → 작업 → 완성), 단계마다 그때의 칸이 매달린다(2026-11-26 B안). 왼쪽 제목 높이에서 시작 */}
      <aside aria-labelledby="collab-progress" className="h-fit min-w-0 rounded-xl border bg-card p-5 lg:mt-12">
        <h2 id="collab-progress" className="mb-5 text-lg font-semibold">{projects.progress.heading}</h2>
        <ol className="relative">
          <Step state={stage(p.status, 1)} title={projects.progress.recruit} meta={recruitMeta}>
            {hideProgress
              ? <p className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">{projects.detail.recruitCount}</span><span className="font-semibold whitespace-nowrap">{p.needed}명</span></p>
              : <>
                <div className="flex items-center justify-between gap-2 text-sm font-semibold"><span>{projects.detail.needed}</span><span className="whitespace-nowrap">{members.length} / {p.needed}명</span></div>
                <div className="mt-2 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.min(100, (members.length / p.needed) * 100)}%` }} /></div>
              </>}
            <dl className={cn("space-y-2 text-sm", hideProgress ? "mt-2" : "mt-4")}>
              <div className="flex items-center gap-2"><dt className="shrink-0 whitespace-nowrap text-muted-foreground">{projects.detail.leader}</dt><dd><ProfileTrigger userId={p.leader_id} className="inline-flex items-center gap-1.5"><PersonAvatar name={p.leader?.nickname} url={p.leader?.avatar_url} />{p.leader?.nickname || "사용자"}</ProfileTrigger></dd></div>
              {members.length > 0 && !hideProgress && <div className="flex items-start gap-2"><dt className="shrink-0 whitespace-nowrap text-muted-foreground">{projects.detail.members}</dt><dd className="flex flex-wrap gap-x-3 gap-y-1.5">{members.map((m) => <ProfileTrigger key={m.user_id} userId={m.user_id} className="inline-flex items-center gap-1.5"><PersonAvatar name={m.nickname} url={m.avatar_url} />{m.nickname || "사용자"}</ProfileTrigger>)}</dd></div>}
            </dl>
            {!isLeader && (mine || p.status === "recruiting") && <div className="mt-4 border-t pt-4">
              <RequestPanel project={p} mine={mine} onChange={load} />
            </div>}
            {isLeader && <div className="mt-4"><LeaderPanel project={p} requests={requests} accepted={members.length} onChange={load} /></div>}
          </Step>
          <Step state={stage(p.status, 2)} title={projects.progress.work} meta={p.due_date ? (p.status === "recruiting" ? `${md(p.due_date)} 목표` : `${md(p.due_date)}까지`) : undefined}>
            {p.status !== "recruiting" && <div className="flex flex-col gap-3">
              {(isLeader || isMember) && p.status === "working" && <TeamSpace project={p} members={members} link={link} isLeader={isLeader} onChange={load} />}
              <UpdatesSection project={p} updates={updates} isLeader={isLeader} isStaff={isStaff} onChange={load} />
            </div>}
          </Step>
          <Step last state={stage(p.status, 3)} title={p.status === "stopped" ? projects.status.stopped : projects.progress.done} meta={p.status === "done" ? undefined : p.status === "stopped" ? undefined : projects.progress.doneHint}>
            {isLeader && finishing && <FinishForm project={p} onCancel={() => setFinishing(false)} onChange={load} />}
            {p.status === "done" && !finishing && <DoneSection project={p} members={members} notes={notes} myId={user?.id} onChange={load} />}
          </Step>
        </ol>
      </aside>
    </div>
    <BoardShareDialog open={sharing} onClose={() => setSharing(false)} id={p.id} title={p.title} url={`${window.location.origin}${projectPath(p.id)}`} />
  </div>
}


type StepState = "done" | "current" | "upcoming" | "stopped"

/** 단계 상태: 모집 중이면 1단계가 지금, 작업 중이면 2단계, 완성이면 3단계(완료 표시), 그만둠은 3단계 회색 */
function stage(status: Project["status"], n: 1 | 2 | 3): StepState {
  const now = status === "recruiting" ? 1 : status === "working" ? 2 : 3
  if (status === "stopped" && n === 3) return "stopped"
  if (status === "done" && n === 3) return "done"
  return n < now ? "done" : n === now ? "current" : "upcoming"
}

/** 타임라인 한 단계: 왼쪽 점·세로선, 오른쪽 단계 이름·날짜·그때의 칸 */
function Step({ state, title, meta, last, children }: { state: StepState; title: string; meta?: string; last?: boolean; children?: React.ReactNode }) {
  return <li className={cn("relative pl-9", !last && "pb-6")} aria-current={state === "current" ? "step" : undefined}>
    {!last && <span aria-hidden className={cn("absolute top-7 bottom-0 left-[11px] w-0.5", state === "done" ? "bg-primary" : "bg-border")} />}
    <span aria-hidden className={cn("absolute top-0 left-0 flex size-6 items-center justify-center rounded-full border-2 text-xs font-semibold",
      state === "done" ? "border-primary bg-primary text-primary-foreground"
      : state === "current" ? "border-primary bg-card text-primary"
      : "border-border bg-card text-muted-foreground")}>
      {state === "done" ? <Check className="size-3.5" /> : state === "stopped" ? <X className="size-3.5" /> : state === "current" ? <span className="size-2 rounded-full bg-primary" /> : null}
    </span>
    <p className="flex flex-wrap items-baseline gap-x-2 leading-6">
      <span className={cn("font-semibold whitespace-nowrap", state === "current" ? "text-primary" : state === "upcoming" || state === "stopped" ? "text-muted-foreground" : "")}>{title}</span>
      {meta && <span className="text-sm whitespace-nowrap text-muted-foreground">{meta}</span>}
    </p>
    {children && <div className="mt-3">{children}</div>}
  </li>
}

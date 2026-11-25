import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ExternalLink } from "lucide-react"
import { projects } from "@/config/projects"
import { useAuth } from "@/lib/auth"
import { deleteProject, getProject, projectError, type Project } from "@/lib/projects"
import { ProfileTrigger } from "@/components/profile/ProfileTrigger"
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge"
import { usePageTitle } from "@/lib/usePageTitle"

/** 프로젝트 상세 — 왼쪽 비전·소개, 오른쪽 필요 인원·리더. 협업 요청 칸은 2묶음. */
export function ProjectDetail() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const { user, isStaff } = useAuth()
  const [project, setProject] = useState<Project | null | undefined>(undefined)
  const [error, setError] = useState("")
  usePageTitle(project?.title ?? projects.title)
  useEffect(() => {
    getProject(id).then(setProject).catch((e) => setError(projectError(e)))
  }, [id])

  const back = <Link to={projects.listPath} className="mb-5 inline-block text-sm text-muted-foreground hover:text-primary">← {projects.title}</Link>
  if (error) return <>{back}<p role="alert" className="text-sm text-muted-foreground">{error}</p></>
  if (project === undefined) return <p role="status" className="text-sm text-muted-foreground">불러오는 중…</p>
  if (!project) return <>{back}<p role="alert">프로젝트를 찾을 수 없어요.</p></>
  const p = project
  const canEdit = !!user && (user.id === p.leader_id || isStaff)

  async function remove() {
    if (!confirm("이 프로젝트를 지울까요? 되돌릴 수 없어요.")) return
    try { await deleteProject(p); navigate(projects.listPath) } catch { alert("지우지 못했어요. 잠시 뒤 다시 시도해 주세요.") }
  }

  return <div>
    {back}
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <article className="min-w-0">
        <ProjectStatusBadge project={p} />
        <h1 className="mt-2 text-3xl font-bold tracking-tight break-keep">{p.title}</h1>
        <p className="mt-4 rounded-lg bg-brand-soft px-4 py-3 text-lg leading-relaxed break-keep text-brand-muted-foreground">{p.vision}</p>
        {p.cover_url && <img src={p.cover_url} alt="" className="mt-6 aspect-video w-full rounded-xl border object-cover" />}
        {p.mockup_url && <a href={p.mockup_url} target="_blank" rel="noopener" className="mt-4 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold whitespace-nowrap text-primary hover:bg-brand-soft">{projects.detail.mockup}<ExternalLink className="size-4" aria-hidden /></a>}
        {p.body && <p className="mt-6 leading-relaxed whitespace-pre-line break-keep">{p.body}</p>}
        {canEdit && <div className="mt-8 flex gap-3 border-t pt-5 text-sm">
          <Link to={`${projects.path}/${p.id}/edit`} className="rounded-md border px-4 py-2 whitespace-nowrap hover:bg-accent">고치기</Link>
          <button type="button" onClick={remove} className="rounded-md border px-4 py-2 whitespace-nowrap text-destructive hover:bg-accent">지우기</button>
        </div>}
      </article>
      <aside className="h-fit rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between gap-2 text-sm font-semibold"><span>{projects.detail.needed}</span><span className="whitespace-nowrap">{p.needed}명</span></div>
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><span className="whitespace-nowrap">{projects.detail.leader}</span><ProfileTrigger userId={p.leader_id}>{p.leader?.nickname || "사용자"}</ProfileTrigger></div>
      </aside>
    </div>
  </div>
}

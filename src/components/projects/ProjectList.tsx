import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Users } from "lucide-react"
import { projectPath, projects, type ProjectStatus } from "@/config/projects"
import { getPeopleCount, getProjects, projectError, type Project } from "@/lib/projects"
import { cn } from "@/lib/utils"
import { PersonAvatar } from "@/components/projects/PersonAvatar"
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge"

/** 협업 프로젝트 목록 — 바이브코딩 화면 아래 영역에 뜬다. 상태 걸러보기는 주소(?status=)에 남긴다. */
export function ProjectCatalogue() {
  const [params, setParams] = useSearchParams()
  const setStatus = (s: ProjectStatus | null) => {
    const next = new URLSearchParams(params)
    if (s) next.set("status", s)
    else next.delete("status")
    setParams(next)
  }
  const raw = params.get("status") as ProjectStatus | null
  const filter = raw && projects.filters.includes(raw) ? raw : null
  const [list, setList] = useState<Project[] | null>(null)
  const [error, setError] = useState("")
  useEffect(() => {
    getProjects().then(setList).catch((e) => setError(projectError(e)))
  }, [])
  const count = (s: ProjectStatus) => list?.filter((p) => p.status === s).length ?? 0
  const shown = list?.filter((p) => (filter ? p.status === filter : p.status !== "stopped")) ?? []
  const chip = (on: boolean) => cn("rounded-full border px-3 py-1.5 text-sm whitespace-nowrap", on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent")
  return <div>
    <div role="group" aria-label="상태" className="mb-5 flex flex-wrap gap-2">
      <button type="button" aria-pressed={!filter} onClick={() => setStatus(null)} className={chip(!filter)}>전체</button>
      {projects.filters.map((s) => <button key={s} type="button" aria-pressed={filter === s} onClick={() => setStatus(s)} className={chip(filter === s)}>{projects.status[s]} {count(s)}</button>)}
    </div>
    {error ? <div role="alert" className="rounded-xl border px-4 py-10 text-center text-sm text-muted-foreground">{error}</div>
      : !list ? <p role="status" className="py-10 text-center text-sm text-muted-foreground">불러오는 중…</p>
      : shown.length === 0 ? <div className="rounded-xl border px-4 py-10 text-center"><Users className="mx-auto size-7 text-muted-foreground" aria-hidden /><p className="mt-3 font-medium">{filter ? `${projects.status[filter]} 프로젝트가 없습니다` : projects.emptyTitle}</p></div>
      : <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{shown.map((p) => <ProjectCard key={p.id} project={p} />)}</ul>}
  </div>
}

function ProjectCard({ project: p }: { project: Project }) {
  const to = projectPath(p.id)
  // 완성 메달의 'N명이 함께'
  const [people, setPeople] = useState<number>()
  useEffect(() => { if (p.status === "done") getPeopleCount(p.id).then(setPeople) }, [p.id, p.status])
  return <li className="flex flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-brand-line">
    <Link to={to} tabIndex={-1} aria-hidden>
      {p.cover_url ? <img src={p.cover_url} alt="" loading="lazy" className="aspect-video w-full object-cover" />
        : <div className="flex aspect-video items-end bg-brand-soft p-5"><span className="line-clamp-2 text-xl leading-snug font-bold break-keep text-brand-muted-foreground">{p.title}</span></div>}
    </Link>
    <div className="flex flex-1 flex-col p-4">
      <ProjectStatusBadge project={p} people={people} />
      <Link to={to} className="mt-2 font-bold leading-snug break-keep hover:text-primary">{p.title}</Link>
      <p className="mt-1 line-clamp-2 text-sm break-keep text-muted-foreground">{p.vision}</p>
      <p className="mt-auto flex items-center gap-1.5 pt-4 text-sm text-muted-foreground"><span className="whitespace-nowrap">{projects.detail.leader}</span><PersonAvatar name={p.leader?.nickname} url={p.leader?.avatar_url} />{p.leader?.nickname || "사용자"}</p>
    </div>
  </li>
}

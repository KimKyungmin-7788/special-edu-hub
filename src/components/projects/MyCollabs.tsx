import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { projectPath, projects } from "@/config/projects"
import { getMyCollabs, projectError } from "@/lib/projects"
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge"
import { RequestBadge } from "@/components/projects/ProjectCollab"

type Data = Awaited<ReturnType<typeof getMyCollabs>>

/** 마이페이지 '내 협업' — 내가 연 프로젝트(+ 새 요청 수)와 내가 보낸 요청·참여 중 */
export function MyCollabs({ uid }: { uid: string }) {
  const t = projects.my
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState("")
  useEffect(() => { getMyCollabs(uid).then(setData).catch((e) => setError(projectError(e))) }, [uid])
  if (error) return <p role="alert" className="text-sm text-muted-foreground">{error}</p>
  if (!data) return <p role="status" className="text-sm text-muted-foreground">불러오는 중…</p>
  const row = "flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 hover:border-brand-line"
  return <div className="space-y-10">
    <section>
      <h2 className="mb-4 text-lg font-semibold tracking-tight">{t.led}</h2>
      {data.led.length === 0 ? <p className="text-sm text-muted-foreground">{t.emptyLed}</p> : <ul className="flex flex-col gap-2">
        {data.led.map((p) => <li key={p.id}><Link to={projectPath(p.id)} className={row}>
          <span className="flex min-w-0 flex-wrap items-center gap-2"><span className="font-medium break-keep">{p.title}</span><ProjectStatusBadge project={p} /></span>
          {p.pending > 0 && <span className="text-sm font-semibold whitespace-nowrap text-primary">{t.newRequests(p.pending)}</span>}
        </Link></li>)}
      </ul>}
    </section>
    <section>
      <h2 className="mb-4 text-lg font-semibold tracking-tight">{t.joined}</h2>
      {data.requests.length === 0 ? <p className="text-sm text-muted-foreground">{t.emptyJoined}</p> : <ul className="flex flex-col gap-2">
        {data.requests.filter((r) => r.project).map((r) => <li key={r.id}><Link to={projectPath(r.project_id)} className={row}>
          <span className="flex min-w-0 flex-wrap items-center gap-2"><span className="font-medium break-keep">{r.project!.title}</span>{r.status === "accepted" ? <ProjectStatusBadge project={r.project!} /> : <RequestBadge status={r.status} />}</span>
          {r.status === "accepted" && r.project!.status === "working" && <span className="text-sm font-semibold whitespace-nowrap text-primary">{t.team}</span>}
        </Link></li>)}
      </ul>}
    </section>
  </div>
}

import { projects } from "@/config/projects"
import { isRecruitClosed, type Project } from "@/lib/projects"
import { cn } from "@/lib/utils"

/** 모집 중 · N명 · 11월 30일 마감 / 모집 기간 끝남 / 작업 중 · 12월 20일까지 / 완성 / 그만둠 */
export function ProjectStatusBadge({ project: p }: { project: Pick<Project, "status" | "needed" | "due_date"> & { recruit_until?: string | null } }) {
  const recruit = { status: p.status, recruit_until: p.recruit_until ?? null }
  const label = isRecruitClosed(recruit) ? projects.request.closedBadge
    : p.status === "recruiting" ? `${projects.status.recruiting} · ${p.needed}명${p.recruit_until ? ` · ${dueLabel(p.recruit_until)} 마감` : ""}`
    : p.status === "working" && p.due_date ? `${projects.status.working} · ${dueLabel(p.due_date)}까지`
    : projects.status[p.status]
  return <span className={cn("w-fit rounded px-2 py-1 text-xs whitespace-nowrap",
    p.status === "recruiting" ? "bg-brand-soft text-primary" : p.status === "working" ? "bg-cta/30 text-cta-foreground" : "bg-muted text-muted-foreground")}>{label}</span>
}

function dueLabel(date: string) {
  const [, m, d] = date.split("-").map(Number)
  return `${m}월 ${d}일`
}

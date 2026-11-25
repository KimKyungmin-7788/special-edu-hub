import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { projectPath, projects } from "@/config/projects"
import { getRecruiting, type Project } from "@/lib/projects"

type Item = Pick<Project, "id" | "title" | "needed">

/** 모집 중 협업 프로젝트(없거나 표가 아직 없으면 아무것도 안 보임) */
export function useRecruiting(): Item[] {
  const [list, setList] = useState<Item[]>([])
  useEffect(() => { getRecruiting().then(setList).catch(() => setList([])) }, [])
  return list
}

/** 넓은 화면: 본문 왼쪽 여백의 날개 배너(스크롤을 따라옴). 부모는 relative 여야 한다. */
export function CollabWing({ list }: { list: Item[] }) {
  if (list.length === 0) return null
  const t = projects.home
  return <aside aria-label={t.eyebrow} className="absolute inset-y-8 right-full mr-2 hidden w-44 min-[1840px]:block">
    <div className="sticky top-24 rounded-xl border-2 border-primary bg-brand-soft p-4">
      <p className="text-xs text-primary">{t.eyebrow}</p>
      <p className="mt-1 font-semibold leading-snug break-keep text-brand-muted-foreground">{t.title}</p>
      <p className="mt-3 whitespace-nowrap"><span className="text-3xl font-bold text-primary tabular-nums">{list.length}</span> <span className="text-xs text-muted-foreground">{t.count}</span></p>
      <ul className="mt-3 space-y-1.5 border-t border-brand-line pt-3 text-sm">
        {list.slice(0, 3).map((p) => <li key={p.id}><Link to={projectPath(p.id)} className="line-clamp-2 break-keep hover:text-primary hover:underline">{p.title}</Link></li>)}
      </ul>
      <Link to={`${projects.listPath}&status=recruiting`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold whitespace-nowrap text-primary hover:underline">{t.more}<ArrowRight className="size-3.5" aria-hidden /></Link>
    </div>
  </aside>
}

/** 날개 배너 자리가 없는 화면: 새로 올라온 수업자료 칸 위 한 줄 띠 */
export function CollabStrip({ list }: { list: Item[] }) {
  if (list.length === 0) return null
  const t = projects.home
  return <Link to={`${projects.listPath}&status=recruiting`} className="flex items-center gap-3 lg:col-span-3 rounded-lg border border-primary bg-brand-soft px-4 py-3 text-sm hover:bg-brand-muted min-[1840px]:hidden">
    <span className="shrink-0 font-semibold whitespace-nowrap text-primary">{t.count} {list.length}</span>
    <span className="min-w-0 flex-1 truncate text-brand-muted-foreground">{t.title} · {list.map((p) => p.title).join(" · ")}</span>
    <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden />
  </Link>
}

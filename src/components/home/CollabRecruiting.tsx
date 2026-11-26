import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { projectPath, projects } from "@/config/projects"
import { daysLeft, getRecruiting, type Project } from "@/lib/projects"
import { cn } from "@/lib/utils"

type Item = Pick<Project, "id" | "title" | "needed" | "recruit_until">

/** 마감 3일 안쪽이면 노란 D-day로 눈에 띄게 */
const SOON_DAYS = 3

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
  // A안(흰 카드·연두 머리·프로젝트별 한 칸) + B안의 D-day·모집 인원(2026-11-26 사용자 선택)
  return <aside aria-label={t.eyebrow} className="absolute inset-y-8 right-full mr-2 hidden w-44 min-[1840px]:block">
    <div className="sticky top-24 overflow-hidden rounded-xl border bg-card">
      {/* 머리(문구·모집 수) 어디를 눌러도 모집 중 목록으로 */}
      <Link to={`${projects.listPath}&status=recruiting`} className="group block border-b border-brand-line bg-brand-soft px-3 py-3 hover:bg-brand-muted">
        <span className="block font-semibold leading-snug break-keep text-brand-muted-foreground group-hover:underline">{t.title}</span>
        <span className="mt-1 block text-xs whitespace-nowrap text-primary">{t.eyebrow} · {t.count} {list.length}</span>
      </Link>
      <ul className="divide-y px-3">
        {list.slice(0, 3).map((p) => {
          const d = daysLeft(p.recruit_until)
          const soon = d !== null && d <= SOON_DAYS
          return <li key={p.id}><Link to={projectPath(p.id)} className="group block py-2.5">
            <span className="line-clamp-2 text-sm font-semibold leading-snug break-keep group-hover:text-primary group-hover:underline">{p.title}</span>
            <span className="mt-1 flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground">
              {d !== null && <span className={cn("rounded px-1 font-semibold tabular-nums", soon ? "bg-cta text-cta-foreground" : "bg-muted")}>{d === 0 ? "D-day" : `D-${d}`}</span>}
              {t.needed(p.needed)}
            </span>
          </Link></li>
        })}
      </ul>
      <Link to={`${projects.listPath}&status=recruiting`} className="flex items-center gap-1 border-t bg-muted/50 px-3 py-2.5 text-sm font-semibold whitespace-nowrap text-primary hover:underline">{t.more}<ArrowRight className="size-3.5" aria-hidden /></Link>
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

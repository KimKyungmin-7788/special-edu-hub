import { Link, Outlet, useLocation } from "react-router-dom"
import { TrainingAccessNotice } from "@/components/training/TrainingAccessNotice"
import { WIDE_CONTAINER } from "@/config/layout"
import { soonLabel, training, trainingPath } from "@/config/training"
import { useAuth } from "@/lib/auth"
import { usePageTitle } from "@/lib/usePageTitle"

/** 목록은 단계 패널로 탐색한다. 기존 고정 연수의 공개 상태와 교사인증 검사는 유지한다. */
export function TrainingPage() {
  const { pathname } = useLocation()
  const { user, profile, loading } = useAuth()
  const inside = (path: string) => pathname === path || pathname.startsWith(`${path}/`)
  const course = training.courses.find((c) => inside(trainingPath(c.slug)))
  const page = course?.pages.find((p) => inside(trainingPath(course.slug, p.slug)))
  const inShare = inside(training.share.path)
  usePageTitle(course && page ? `${page.label} · ${course.title}` : inShare ? training.share.title : training.title)
  const checking = loading || (!!user && !profile)
  const soon = page?.status === "soon"
    ? { title: page.label, release: page.release }
    : inShare && training.share.status === "soon" ? { title: training.share.title, release: undefined } : null
  const catalogue = pathname === training.basePath || pathname === training.share.path
  const back = course ? `${training.basePath}?stage=${course.slug}` : training.basePath
  return <div className={`${WIDE_CONTAINER} py-6 lg:py-8`}>
    {!catalogue && <Link to={back} className="mb-5 inline-block text-sm text-muted-foreground hover:text-primary">← {training.title}</Link>}
    {soon ? <div role="status" className="rounded-xl border bg-card p-6">
      <p className="text-sm font-semibold text-primary">{soonLabel(soon.release)}</p>
      <h1 className="mt-1 text-xl font-bold">{soon.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{training.soon.notice}</p>
    </div> : !course || page?.everyone || profile?.isTeacherVerified ? <Outlet />
      : checking ? <p role="status">교사인증 상태를 확인하고 있어요…</p> : <TrainingAccessNotice />}
  </div>
}

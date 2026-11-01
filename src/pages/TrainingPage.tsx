import { Fragment, type ReactNode } from "react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { TrainingAccessNotice } from "@/components/training/TrainingAccessNotice"
import { WIDE_CONTAINER } from "@/config/layout"
import { courseLabels, training, trainingPath } from "@/config/training"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { usePageTitle } from "@/lib/usePageTitle"

/**
 * 열린연수방(/training/*) 틀 — 왼쪽 사이드바(열린연수방이란? + 연수별 쪽 목록) + 오른쪽 본문(하위 페이지).
 * 좁은 화면에서는 사이드바가 본문 위 가로 칩 줄로 바뀐다(연수 이름 줄·준비 중인 쪽은 숨김).
 * 열린연수방이란?은 누구나, 연수 쪽은 로그인한 인증 교사만 본다(아니면 안내).
 * 메뉴는 config/training.ts 한 곳에서 불러온다.
 */
export function TrainingPage() {
  const { pathname } = useLocation()
  const { user, profile, loading } = useAuth()
  // vibecoding 과 vibecoding-expand 처럼 앞이 같은 주소를 가르려고 '/'까지 본다
  const inside = (path: string) => pathname === path || pathname.startsWith(`${path}/`)
  const course = training.courses.find((c) => inside(trainingPath(c.slug)))
  const page = course?.pages.find((p) => inside(trainingPath(course.slug, p.slug)))
  usePageTitle(course && page ? `${page.label} · ${course.title}` : training.title)
  // 로그인 직후엔 프로필이 조금 늦게 와서, 그동안은 안내를 띄우지 않고 기다린다
  const checking = loading || (!!user && !profile)
  return (
    <div
      className={`${WIDE_CONTAINER} grid grid-cols-1 gap-4 py-6 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-5 lg:py-3`}
    >
      <TrainingSidebar />
      <div className="min-w-0">
        {!course || profile?.isTeacherVerified ? (
          <Outlet />
        ) : checking ? null : (
          <TrainingAccessNotice />
        )}
      </div>
    </div>
  )
}

function TrainingSidebar() {
  return (
    <aside aria-label={`${training.title} 메뉴`}>
      <nav className="rounded-xl border bg-card p-2 shadow-sm lg:sticky lg:top-20 lg:p-3">
        <h2 className="hidden px-2 pb-2 text-sm font-bold text-foreground lg:block">
          {training.title}
        </h2>
        <ul className="flex gap-1 overflow-x-auto lg:flex-col">
          <li className="shrink-0">
            <SidebarLink to={training.basePath} end label={training.guideLabel} />
          </li>
          {training.courses.map((course, ci) => (
            <Fragment key={course.slug}>
              <li className="hidden items-start justify-between gap-2 px-3 pt-3 pb-1 text-xs font-semibold text-muted-foreground lg:flex">
                <span className="break-keep">
                  연수 {courseLabels[ci]}. {course.title}
                </span>
                {course.pages.length === 0 && <SoonBadge />}
              </li>
              {course.pages.map((page, pi) => {
                const label = (
                  <>
                    {/* 넓은 화면은 위에 연수 이름 줄이 있어 쪽 번호만, 좁은 화면 칩은 1-1처럼 연수 번호까지 */}
                    <span className="lg:hidden">{courseLabels[ci]}-</span>
                    {pi + 1}. {page.label}
                  </>
                )
                return page.status === "active" ? (
                  <li key={page.slug} className="shrink-0">
                    <SidebarLink to={trainingPath(course.slug, page.slug)} label={label} />
                  </li>
                ) : (
                  <li key={page.slug} className="hidden lg:block">
                    <span className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground">
                      <span className="break-keep">{label}</span>
                      <SoonBadge />
                    </span>
                  </li>
                )
              })}
            </Fragment>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

function SidebarLink({ to, label, end }: { to: string; label: ReactNode; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors lg:whitespace-normal",
          isActive
            ? "bg-brand-soft font-semibold text-primary"
            : "text-foreground/80 hover:bg-accent hover:text-foreground",
        )
      }
    >
      <span className="break-keep">{label}</span>
    </NavLink>
  )
}

function SoonBadge() {
  return (
    <span className="shrink-0 rounded-sm bg-muted px-1 py-px text-[10px] leading-4 font-medium text-muted-foreground">
      준비중
    </span>
  )
}

import { Fragment, type ReactNode } from "react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { TrainingAccessNotice } from "@/components/training/TrainingAccessNotice"
import { WIDE_CONTAINER } from "@/config/layout"
import { branchCount, firstActivePage, training, trainingPath } from "@/config/training"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { usePageTitle } from "@/lib/usePageTitle"

/**
 * 열린연수방(/training/*) 틀 — 왼쪽 사이드바(열린연수방이란? + 영역별 세부 연수 + 스터디 활동) + 오른쪽 본문(하위 페이지).
 * 사이드바: 영역 이름(번호 동그라미) 아래 세로선으로 세부 연수를 묶는다(준비 중인 것도 보이되 누르지 못함).
 * 좁은 화면에서는 사이드바가 본문 위 가로 칩 줄로 바뀐다(영역 이름 줄·준비 중인 것은 숨김).
 * 열린연수방이란?과 맛보기 쪽(everyone)은 누구나, 나머지 연수 쪽은 로그인한 인증 교사만 본다(아니면 안내).
 * 메뉴는 config/training.ts 한 곳에서 불러온다.
 */
export function TrainingPage() {
  const { pathname } = useLocation()
  const { user, profile, loading } = useAuth()
  // 앞이 같은 주소(예: agent 와 agent-x)를 가르려고 '/'까지 본다
  const inside = (path: string) => pathname === path || pathname.startsWith(`${path}/`)
  const course = training.courses.find((c) => inside(trainingPath(c.slug)))
  const page = course?.pages.find((p) => inside(trainingPath(course.slug, p.slug)))
  // 함께 여는 연수 쪽은 하위 화면이 글 제목 등으로 다시 정한다(부모 효과가 나중에 돌아 덮어쓰지 않게 같은 이름으로)
  usePageTitle(course && page ? `${page.label} · ${course.title}` : inside(training.share.path) ? training.share.title : training.title)
  // 로그인 직후엔 프로필이 조금 늦게 와서, 그동안은 안내를 띄우지 않고 기다린다
  const checking = loading || (!!user && !profile)
  return (
    <div
      className={`${WIDE_CONTAINER} grid grid-cols-1 gap-4 py-6 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-5 lg:py-3`}
    >
      <TrainingSidebar />
      <div className="min-w-0">
        {!course || page?.everyone || profile?.isTeacherVerified ? (
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
        <div className="hidden items-center justify-between gap-2 px-2 pb-2 lg:flex">
          <h2 className="text-sm font-bold text-foreground">{training.title}</h2>
          {/* 표시 설명 — 번호 동그라미·세로선 점 모두 같은 뜻(열린연수방이란?의 연수 단계와 같음) */}
          <p aria-hidden className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="size-[7px] rounded-full bg-primary" />
              열림
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-[7px] rounded-full border border-primary" />
              준비중
            </span>
          </p>
        </div>
        <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0">
          <li className="shrink-0">
            <SidebarLink to={training.basePath} end label={training.guideLabel} />
          </li>
          {training.courses.map((course, ci) => {
            const n = ci + 1
            const open = !!firstActivePage(course)
            return (
              <Fragment key={course.slug}>
                {/* 넓은 화면: 영역 이름 줄. 번호 동그라미는 연수 단계 그림과 같은 표시(열림 ●, 준비중 ○) */}
                <li
                  className={cn(
                    "hidden items-start gap-2 px-2 pb-1 lg:flex",
                    ci === 0 ? "mt-2 border-t pt-4" : "pt-4",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                      open ? "bg-primary text-primary-foreground" : "border border-primary bg-card text-primary",
                    )}
                  >
                    {n}
                  </span>
                  <span
                    className={cn(
                      "text-sm leading-5 font-semibold break-keep",
                      open ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <span className="sr-only">{n}. </span>
                    {course.title}
                    {branchCount(course) > 0 && (
                      <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                        · {branchCount(course)}갈래
                      </span>
                    )}
                  </span>
                </li>
                {/* 세부 연수 — 넓은 화면은 영역 이름 아래 세로선으로 묶고, 준비 중인 것도 보여 준다(누르지 못함).
                    좁은 화면 칩은 열린 것만, 1-1처럼 영역 번호를 붙인다 */}
                {course.pages.map((page, pi) =>
                  page.status === "active" ? (
                    <li key={page.slug} className="relative shrink-0 lg:ml-[1.125rem] lg:border-l lg:py-px lg:pl-1">
                      <TreeDot open />
                      <SidebarLink
                        to={trainingPath(course.slug, page.slug)}
                        className="lg:px-2.5 lg:py-1.5 lg:text-[13px]"
                        label={
                          <>
                            <span className="lg:hidden">
                              {n}-{pi + 1}.{" "}
                            </span>
                            {page.branch && <span className="mr-1 font-semibold">{page.branch}</span>}
                            {page.short ?? page.label}
                          </>
                        }
                      />
                    </li>
                  ) : (
                    <li key={page.slug} className="relative hidden lg:ml-[1.125rem] lg:block lg:border-l lg:py-px lg:pl-1">
                      <TreeDot />
                      <span className="block px-2.5 py-1.5 text-[13px] leading-5 break-keep text-muted-foreground">
                        {page.branch && <span className="mr-1 font-semibold">{page.branch}</span>}
                        {page.short ?? page.label}
                        <span className="sr-only"> (준비중)</span>
                      </span>
                    </li>
                  ),
                )}
              </Fragment>
            )
          })}
          {/* 회원이 여는 연수 — 단계형 연수와 나누려고 구분선 아래 따로(누구나 볼 수 있음) */}
          <li className="shrink-0 lg:mt-3 lg:border-t lg:pt-3">
            <SidebarLink to={training.share.path} label={training.share.title} />
          </li>
          {/* 연수 흐름 밖의 활동 — 구분선 아래 따로. 지금은 준비중이라 좁은 화면 칩엔 없다 */}
          <li className="mt-3 hidden items-start gap-2 border-t px-2 pt-4 pb-1 lg:flex">
            {/* 연수 단계 그림의 스터디 활동 칸처럼 점선 동그라미 */}
            <span aria-hidden className="size-5 shrink-0 rounded-full border border-dashed border-primary" />
            <span className="text-sm leading-5 font-semibold break-keep text-muted-foreground">
              {training.study.title}
              <span className="sr-only"> (준비중)</span>
            </span>
          </li>
        </ul>
      </nav>
    </aside>
  )
}

/** 세로선 위 점 — 열린 세부 연수 ●, 준비 중인 세부 연수 ○(넓은 화면만) */
function TreeDot({ open }: { open?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute top-[13px] -left-[4px] hidden size-[7px] rounded-full lg:block",
        open ? "bg-primary" : "border border-primary bg-card",
      )}
    />
  )
}

function SidebarLink({
  to,
  label,
  end,
  className,
}: {
  to: string
  label: ReactNode
  end?: boolean
  className?: string
}) {
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
          className,
        )
      }
    >
      <span className="break-keep">{label}</span>
    </NavLink>
  )
}

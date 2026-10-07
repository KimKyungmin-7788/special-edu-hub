import { NavLink, Outlet } from "react-router-dom"
import { WIDE_CONTAINER } from "@/config/layout"
import { vibecoding, vibecodingPath } from "@/config/vibecoding"
import { cn } from "@/lib/utils"

/**
 * 바이브코딩 영역(/vibecoding/*) 틀 — 왼쪽 사이드바(하위 페이지 목록) + 오른쪽 본문(하위 페이지).
 * 좁은 화면에서는 사이드바가 본문 위 가로 칩 줄로 바뀐다.
 * 메뉴는 config/vibecoding.ts 한 곳에서 불러온다.
 */
export function VibecodingPage() {
  return (
    <div
      className={`${WIDE_CONTAINER} grid grid-cols-1 gap-4 py-6 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-5 lg:py-3`}
    >
      <VibecodingSidebar />
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  )
}

function VibecodingSidebar() {
  return (
    <aside aria-label={`${vibecoding.title} 메뉴`}>
      <nav className="rounded-xl border bg-card p-2 shadow-sm lg:sticky lg:top-20 lg:p-3">
        <h2 className="hidden px-2 pb-2 text-sm font-bold text-foreground lg:block">
          {vibecoding.title}
        </h2>
        <ul className="flex gap-1 overflow-x-auto lg:flex-col">
          {vibecoding.pages.map((page, i) => (
            <li key={page.slug} className="shrink-0">
              <NavLink
                to={vibecodingPath(page.slug)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors lg:whitespace-normal",
                    isActive
                      ? "bg-brand-soft font-semibold text-primary"
                      : "text-foreground/80 hover:bg-accent hover:text-foreground",
                  )
                }
              >
                <span>
                  {i + 1}. {page.label}
                </span>
                {page.status === "soon" && (
                  <span className="rounded-sm bg-muted px-1 py-px text-[10px] leading-4 font-medium text-muted-foreground">
                    준비중
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

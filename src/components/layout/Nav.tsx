import { NavLink } from "react-router-dom"
import { navItems, type NavItem } from "@/config/nav"
import { cn } from "@/lib/utils"

/**
 * 주 네비게이션. navItems(단일 소스)에서 메뉴를 그린다.
 * "soon" 항목도 링크는 동작하되, 대상 페이지가 "준비 중" 자리다.
 *
 * variant
 *  - "bar"  : 넓은 화면 헤더 가로 메뉴. 헤더 높이를 꽉 채우고, 현재 메뉴는 아래 굵은 밑줄.
 *  - "list" : 좁은 화면 펼침 메뉴. 세로 목록, 현재 메뉴는 배경 강조.
 */
export function Nav({
  variant = "bar",
  onNavigate,
}: {
  variant?: "bar" | "list"
  onNavigate?: () => void
}) {
  if (variant === "list") {
    return (
      <nav aria-label="주 메뉴">
        <ul className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex items-center justify-between rounded-md px-3 py-2.5 text-[15px] transition-colors",
                    isActive
                      ? "bg-accent font-semibold text-foreground"
                      : "text-foreground/80 hover:bg-accent hover:text-foreground",
                  )
                }
              >
                {item.label}
                {item.status === "soon" && <SoonBadge />}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    )
  }

  return (
    <nav aria-label="주 메뉴" className="h-full">
      <ul className="flex h-full items-stretch">
        {navItems.map((item) => (
          <li key={item.to} className="flex">
            <BarLink item={item} />
          </li>
        ))}
      </ul>
    </nav>
  )
}

function BarLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-1.5 px-3.5 text-[15px] whitespace-nowrap transition-colors",
          // 현재 메뉴 표시: 헤더 아래 테두리 위에 겹치는 2px 밑줄
          "after:absolute after:inset-x-3.5 after:-bottom-px after:h-0.5 after:rounded-full after:transition-colors",
          isActive
            ? "font-semibold text-foreground after:bg-foreground"
            : "font-medium text-foreground/70 hover:text-foreground after:bg-transparent hover:after:bg-border",
        )
      }
    >
      {item.label}
      {item.status === "soon" && <SoonBadge />}
    </NavLink>
  )
}

function SoonBadge() {
  return (
    <span className="rounded-sm bg-muted px-1 py-px text-[10px] leading-4 font-medium text-muted-foreground">
      준비중
    </span>
  )
}

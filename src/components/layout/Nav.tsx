import { NavLink } from "react-router-dom"
import { navItems } from "@/config/nav"
import { cn } from "@/lib/utils"

/**
 * 주 네비게이션. navItems(단일 소스)에서 메뉴를 그린다.
 * "soon" 항목도 링크는 동작하되, 대상 페이지가 "준비 중" 자리다.
 */
export function Nav() {
  return (
    <nav className="-mx-1 flex items-center gap-1 overflow-x-auto">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              "shrink-0 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              isActive
                ? "font-medium text-foreground"
                : "text-muted-foreground",
            )
          }
        >
          {item.label}
          {item.status === "soon" && (
            <span className="ml-1 text-[10px] text-muted-foreground">
              준비 중
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

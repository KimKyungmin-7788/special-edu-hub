import { NavLink } from "react-router-dom"
import { navItems, type NavChild, type NavItem } from "@/config/nav"
import { cn } from "@/lib/utils"

/**
 * 주 네비게이션. navItems(단일 소스)에서 메뉴를 그린다.
 * "soon" 항목도 링크는 동작하되, 대상 페이지가 "준비 중" 자리다.
 *
 * variant
 *  - "bar"  : 넓은 화면 헤더 가로 메뉴. 헤더 높이를 꽉 채우고, 현재 메뉴는 아래 굵은 밑줄.
 *             children 이 있는 메뉴는 마우스를 올리거나(키보드로 들어가면) 아래로 하부 섹션이 펼쳐진다.
 *  - "list" : 좁은 화면 펼침 메뉴. 세로 목록, 현재 메뉴는 배경 강조.
 *
 * density(bar 전용): 헤더 자리가 모자랄 때 Header 가 올려 준다(글꼴이 넓은 윈도우·로그인 버튼 등).
 *  0 = 기본 / 1↑ = 글자·간격 조금 작게 / 2↑ = '준비중' 표시 생략
 */
export function Nav({
  variant = "bar",
  onNavigate,
  density = 0,
}: {
  variant?: "bar" | "list"
  onNavigate?: () => void
  density?: number
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
                      ? "bg-brand-soft font-semibold text-primary"
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
          <li key={item.to} className="group/nav relative flex">
            <BarLink item={item} density={density} />
            {item.children && <SubMenu label={item.label} items={item.children} />}
          </li>
        ))}
      </ul>
    </nav>
  )
}

function BarLink({ item, density }: { item: NavItem; density: number }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-1.5 whitespace-nowrap transition-colors",
          density >= 1
            ? "px-2 text-sm after:inset-x-2"
            : "px-2.5 text-[15px] after:inset-x-2.5 2xl:px-3.5 2xl:after:inset-x-3.5",
          // 현재 메뉴 표시: 헤더 아래 테두리 위에 겹치는 2px 밑줄
          "after:absolute after:-bottom-px after:h-0.5 after:rounded-full after:transition-colors",
          isActive
            ? "font-semibold text-primary after:bg-primary"
            : "font-medium text-foreground/70 hover:text-foreground after:bg-transparent hover:after:bg-border",
        )
      }
    >
      {item.label}
      {item.status === "soon" && density < 2 && <SoonBadge />}
    </NavLink>
  )
}

/** 하부 섹션 — 메뉴 바로 아래 담백한 목록. 고른 뒤에는 포커스를 풀어 바로 닫히게 한다. */
function SubMenu({ label, items }: { label: string; items: NavChild[] }) {
  return (
    <div className="absolute left-0 top-full z-50 hidden pt-px group-focus-within/nav:block group-hover/nav:block">
      <ul
        aria-label={`${label} 하부 메뉴`}
        className="min-w-48 rounded-b-md border bg-popover py-1.5 text-popover-foreground shadow-md"
      >
        {items.map((child) => (
          <li key={child.label}>
            <NavLink
              to={child.to}
              end
              onClick={(e) => e.currentTarget.blur()}
              className={({ isActive }) =>
                cn(
                  "block whitespace-nowrap px-4 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-brand-soft font-semibold text-primary"
                    : "text-foreground/80 hover:bg-accent hover:text-foreground",
                )
              }
            >
              {child.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SoonBadge() {
  return (
    <span className="rounded-sm bg-muted px-1 py-px text-[10px] leading-4 font-medium text-muted-foreground">
      준비중
    </span>
  )
}

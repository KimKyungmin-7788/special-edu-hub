import { NavLink } from "react-router-dom"
import { subjectCategories } from "@/config/categories"
import { cn } from "@/lib/utils"

const itemClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "block rounded-md px-3 py-2 text-sm transition-colors",
    "hover:bg-accent hover:text-accent-foreground",
    isActive
      ? "bg-accent font-medium text-accent-foreground"
      : "text-muted-foreground",
  )

/**
 * 과목별 페이지 좌측 과목 선택 사이드바.
 * "전체"(/apps/subject) + 각 과목(/apps/subject/:id) 으로 이동.
 * 카드 목록·필터 알맹이는 묶음 4에서 채운다.
 */
export function SubjectSidebar() {
  return (
    <aside className="lg:w-40 lg:shrink-0">
      <p className="px-3 text-sm font-semibold">과목</p>
      <nav className="mt-2 flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        <NavLink to="/apps/subject" end className={itemClass}>
          인기
        </NavLink>
        {subjectCategories.map((c) => (
          <NavLink
            key={c.id}
            to={`/apps/subject/${c.id}`}
            className={itemClass}
          >
            {c.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

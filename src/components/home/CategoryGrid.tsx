import { Link } from "react-router-dom"
import { categories, type Category } from "@/config/categories"
import { getCategoryIcon } from "@/components/categoryIcon"

/** 카테고리는 과목→과목별 상세, 업무→업무혁신 페이지로 이동. */
function categoryTo(c: Category): string {
  return c.type === "work" ? "/apps/work" : `/apps/subject/${c.id}`
}

/** 카테고리 진입 그리드 — 아이콘 + 라벨. */
export function CategoryGrid() {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-xl font-semibold tracking-tight">
        <span aria-hidden className="h-4 w-1 rounded-full bg-primary" />
        카테고리
      </h2>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {categories
          .filter((c) => !c.hideFromGrid && !c.parentId)
          .map((c) => {
          const Icon = getCategoryIcon(c.icon)
          return (
            <li key={c.id}>
              <Link
                to={categoryTo(c)}
                className="flex flex-col items-center gap-2 rounded-lg border bg-card px-2 py-4 text-center transition-colors hover:border-brand-line hover:bg-brand-soft"
              >
                <Icon className="size-10 text-primary" aria-hidden />
                <span className="text-sm">{c.name}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

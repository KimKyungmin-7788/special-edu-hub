import { Link } from "react-router-dom"
import { categories, type Category } from "@/config/categories"
import { getCategoryIcon } from "@/components/categoryIcon"

/** 카테고리는 과목→과목별 상세, 업무→업무혁신 페이지로 이동. */
function categoryTo(c: Category): string {
  return c.type === "work" ? "/apps/work" : `/apps/subject/${c.id}`
}

/**
 * 카테고리 진입 그리드 — 흰 카드(회색 바탕 위) · 연두 원 안의 손그림 아이콘 · 굵은 과목명.
 * 큰 화면에선 한 줄(9칸), 좁아지면 5칸·3칸. 호버 시 살짝 떠오르며 초록 테두리·원 진해짐.
 */
export function CategoryGrid() {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-xl font-semibold tracking-tight">
        <span aria-hidden className="h-4 w-1 rounded-full bg-primary" />
        카테고리
      </h2>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
        {categories
          .filter((c) => !c.hideFromGrid && !c.parentId)
          .map((c) => {
            const Icon = getCategoryIcon(c.icon)
            return (
              <li key={c.id}>
                <Link
                  to={categoryTo(c)}
                  className="group flex h-full flex-col items-center gap-3 rounded-2xl border bg-card px-2 pt-5 pb-4 text-center shadow-sm transition-[border-color,box-shadow,translate] duration-200 hover:border-primary/50 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:hover:-translate-y-1"
                >
                  <span className="flex size-16 items-center justify-center rounded-full bg-brand-soft ring-1 ring-brand-line transition-colors group-hover:bg-brand-muted">
                    <Icon
                      className="size-9 text-primary transition-transform duration-200 motion-safe:group-hover:scale-110"
                      aria-hidden
                    />
                  </span>
                  <span className="text-sm font-bold leading-tight tracking-tight break-keep transition-colors group-hover:text-primary">
                    {c.name}
                  </span>
                </Link>
              </li>
            )
          })}
      </ul>
    </section>
  )
}

import { Link } from "react-router-dom"
import { categories, type Category } from "@/config/categories"
import { getCategoryIcon } from "@/components/categoryIcon"

/** 카테고리는 과목→과목별 상세, 업무→업무혁신 페이지로 이동. */
function categoryTo(c: Category): string {
  return c.type === "work" ? "/apps/work" : `/apps/subject/${c.id}`
}

/**
 * 카테고리 진입 그리드 — 흰 카드(회색 바탕 위) · 연두 원 안의 손그림 아이콘 · 굵은 과목명 · 과목 한줄 소개.
 * 소개 글은 categories.ts 의 tagline(과목 페이지 배너와 같은 문구).
 */
export function CategoryGrid() {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-xl font-semibold tracking-tight">
        <span aria-hidden className="h-4 w-1 rounded-full bg-primary" />
        카테고리
      </h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories
          .filter((c) => !c.hideFromGrid && !c.parentId)
          .map((c) => {
            const Icon = getCategoryIcon(c.icon)
            return (
              <li key={c.id}>
                <Link
                  to={categoryTo(c)}
                  className="group flex h-full items-center gap-4 rounded-xl border bg-card p-4 shadow-sm transition-[border-color,box-shadow,translate] duration-200 hover:border-primary/50 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:hover:-translate-y-0.5"
                >
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-soft ring-1 ring-brand-line transition-colors group-hover:bg-brand-muted">
                    <Icon className="size-8 text-primary" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-lg font-bold tracking-tight transition-colors group-hover:text-primary">
                      {c.name}
                    </span>
                    {c.tagline && (
                      <span className="mt-0.5 line-clamp-2 block text-sm leading-snug text-muted-foreground">
                        {c.tagline}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            )
          })}
      </ul>
    </section>
  )
}

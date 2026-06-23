import { useParams } from "react-router-dom"
import { getCategory } from "@/config/categories"
import { SubjectSidebar } from "@/components/app/SubjectSidebar"

/**
 * 과목별 카탈로그.
 * 좌측: 과목 선택 사이드바 / 우측: 선택 과목의 앱 목록(묶음 4에서 채움).
 * categoryId 없으면 "전체" 보기.
 */
export function SubjectApps() {
  const { categoryId } = useParams<{ categoryId: string }>()
  const category = categoryId ? getCategory(categoryId) : undefined
  const unknown = Boolean(categoryId && !category)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-8 lg:flex-row">
        <SubjectSidebar />

        <section className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {category ? category.name : "전체 과목"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {unknown
              ? `알 수 없는 과목입니다: ${categoryId}`
              : "이 과목의 앱 목록은 묶음 4에서 작성됩니다."}
          </p>
        </section>
      </div>
    </div>
  )
}

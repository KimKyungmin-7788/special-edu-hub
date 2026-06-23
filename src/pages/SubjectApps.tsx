import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { getCategory } from "@/config/categories"
import { SubjectSidebar } from "@/components/app/SubjectSidebar"
import { AppCardList } from "@/components/home/AppCardList"
import { getAppsByCategory, getAppsByType, type App } from "@/lib/apps"

/**
 * 과목별 카탈로그.
 * 좌측: 과목 선택 사이드바 / 우측: 선택 과목의 앱 목록.
 * categoryId 없으면 전체 과목('subject' 타입) 앱을 보여준다.
 */
export function SubjectApps() {
  const { categoryId } = useParams<{ categoryId: string }>()
  const category = categoryId ? getCategory(categoryId) : undefined
  const unknown = Boolean(categoryId && !category)

  const [apps, setApps] = useState<App[]>([])

  useEffect(() => {
    if (unknown) {
      setApps([])
      return
    }
    let active = true
    const load = categoryId
      ? getAppsByCategory(categoryId)
      : getAppsByType("subject")
    load.then((data) => {
      if (active) setApps(data)
    })
    return () => {
      active = false
    }
  }, [categoryId, unknown])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-8 lg:flex-row">
        <SubjectSidebar />

        <section className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {category ? category.name : "전체 과목"}
          </h1>

          {unknown ? (
            <p className="mt-3 text-sm text-muted-foreground">
              알 수 없는 과목입니다: {categoryId}
            </p>
          ) : (
            <>
              <p className="mt-2 mb-8 text-sm text-muted-foreground">
                {apps.length}개 앱
              </p>
              <AppCardList apps={apps} emptyText="이 과목의 앱이 아직 없습니다." />
            </>
          )}
        </section>
      </div>
    </div>
  )
}

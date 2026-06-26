import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "react-router-dom"
import { getCategory, getSubcategories } from "@/config/categories"
import { SubjectSidebar } from "@/components/app/SubjectSidebar"
import { AppCardList } from "@/components/home/AppCardList"
import { getAppsByCategory, getAppsByType, type App } from "@/lib/apps"
import { CONTAINER } from "@/config/layout"
import { cn } from "@/lib/utils"

/**
 * 과목별 카탈로그.
 * 좌측: 과목 선택 사이드바 / 우측: 선택 과목의 앱 목록.
 * categoryId 없으면 전체 과목('subject' 타입) 앱을 보여준다.
 *
 * 선택 과목에 하위 분류가 있으면 제목 아래 칩 바로 추가 필터한다.
 * 선택 상태는 URL 쿼리(?sub=<하위분류id>)로 관리 → 공유·뒤로가기 자연스럽게.
 */
export function SubjectApps() {
  const { categoryId } = useParams<{ categoryId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const category = categoryId ? getCategory(categoryId) : undefined
  const unknown = Boolean(categoryId && !category)

  const subcategories = categoryId ? getSubcategories(categoryId) : []
  const sub = searchParams.get("sub")
  // 유효하지 않은 sub 값은 무시(전체로 취급).
  const activeSub = subcategories.some((s) => s.id === sub) ? sub : null

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

  // 하위 분류 선택 시 앱의 category_ids 에 해당 id 가 포함된 것만.
  const shownApps = activeSub
    ? apps.filter((a) => a.categoryIds.includes(activeSub))
    : apps

  function selectSub(next: string | null) {
    const params = new URLSearchParams(searchParams)
    if (next) params.set("sub", next)
    else params.delete("sub")
    setSearchParams(params, { replace: true })
  }

  return (
    <div className={`${CONTAINER} py-8`}>
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
              {/* 하위 분류 칩 바 */}
              {subcategories.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <SubChip
                    label="전체"
                    active={activeSub === null}
                    onClick={() => selectSub(null)}
                  />
                  {subcategories.map((s, i) => {
                    // 앞 칩과 group 이 다르면 사이에 세로 구분선.
                    const prev = subcategories[i - 1]
                    const divider =
                      prev && s.group && prev.group && s.group !== prev.group
                    return (
                      <span key={s.id} className="flex items-center gap-2">
                        {divider && (
                          <span
                            aria-hidden
                            className="mx-1 h-5 w-px self-center bg-border"
                          />
                        )}
                        <SubChip
                          label={s.name}
                          active={activeSub === s.id}
                          onClick={() => selectSub(s.id)}
                        />
                      </span>
                    )
                  })}
                </div>
              )}

              <p className="mt-4 mb-8 text-sm text-muted-foreground">
                {shownApps.length}개 앱
              </p>
              <AppCardList
                apps={shownApps}
                emptyText="이 분류의 앱이 아직 없습니다."
              />
            </>
          )}
        </section>
      </div>
    </div>
  )
}

/** 하위 분류 필터 칩. 토큰만 사용(중립). */
function SubChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-foreground bg-accent font-medium text-accent-foreground"
          : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {label}
    </button>
  )
}

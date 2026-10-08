import { useEffect, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { PenLine } from "lucide-react"
import { currentMonthSubId, getCategory, getSubcategories } from "@/config/categories"
import { SubjectSidebar } from "@/components/app/SubjectSidebar"
import { SubjectBanner } from "@/components/app/SubjectBanner"
import { AppCardList } from "@/components/home/AppCardList"
import { PopularDashboard } from "@/components/app/PopularDashboard"
import { WriteButton } from "@/components/app/WriteButton"
import {
  getAppsByCategory,
  getAppsByType,
  reorderApps,
  type App,
} from "@/lib/apps"
import { useAuth } from "@/lib/auth"
import { getPractices, type Practice } from "@/lib/practices"
import { PracticeCard } from "@/components/practice/PracticeCard"
import { CONTAINER } from "@/config/layout"
import { cn } from "@/lib/utils"

/**
 * 과목별 카탈로그.
 * 좌측: 과목 선택 사이드바 / 우측: 선택 과목의 앱 목록.
 * categoryId 없으면 전체 과목('subject' 타입) 앱을 보여준다.
 *
 * 선택 과목에 하위 분류가 있으면 제목 아래 칩 바로 추가 필터한다.
 * 선택 상태는 URL 쿼리(?sub=<하위분류id>)로 관리 → 공유·뒤로가기 자연스럽게.
 * 과목을 고르면 "학습자료 │ 수업 사례" 탭(?tab=practices). 같은 교과 분류를 공유한다(PRD §13.2).
 */
export function SubjectApps() {
  const { categoryId } = useParams<{ categoryId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const category = categoryId ? getCategory(categoryId) : undefined
  const unknown = Boolean(categoryId && !category)

  const subcategories = categoryId ? getSubcategories(categoryId) : []
  // 월 분류(계기교육)는 sub 가 없으면 이번 달을 먼저 고른다. '전체'는 ?sub=all 로 구분.
  const monthly = Boolean(category?.monthly)
  const sub =
    searchParams.get("sub") ?? (monthly && categoryId ? currentMonthSubId(categoryId) ?? null : null)
  // 유효하지 않은 sub 값(all 포함)은 무시(전체로 취급).
  const activeSub = subcategories.some((s) => s.id === sub) ? sub : null
  // 월 칩이 골라져 있으면 빈 목록 문구에 그 달을 쓴다.
  const emptyText = monthly && activeSub
    ? `${getCategory(activeSub)?.name} 자료가 아직 없습니다.`
    : "이 분류의 앱이 아직 없습니다."

  const tab = searchParams.get("tab") === "practices" ? "practices" : "apps"
  const [practices, setPractices] = useState<Practice[]>([])

  const { isStaff } = useAuth()
  const [apps, setApps] = useState<App[]>([])
  const [reorderError, setReorderError] = useState<string | null>(null)

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

  useEffect(() => {
    if (!categoryId || unknown) {
      setPractices([])
      return
    }
    let active = true
    getPractices(categoryId).then((d) => {
      if (active) setPractices(d)
    })
    return () => {
      active = false
    }
  }, [categoryId, unknown])

  const shownPractices = activeSub
    ? practices.filter((p) => p.categoryIds.includes(activeSub))
    : practices

  function selectTab(next: "apps" | "practices") {
    const params = new URLSearchParams(searchParams)
    if (next === "practices") params.set("tab", "practices")
    else params.delete("tab")
    setSearchParams(params, { replace: true })
  }

  // 하위 분류 선택 시 앱의 category_ids 에 해당 id 가 포함된 것만.
  const shownApps = activeSub
    ? apps.filter((a) => a.categoryIds.includes(activeSub))
    : apps

  function selectSub(next: string | null) {
    const params = new URLSearchParams(searchParams)
    if (next) params.set("sub", next)
    else if (monthly) params.set("sub", "all") // 지우면 다시 이번 달로 돌아가므로
    else params.delete("sub")
    setSearchParams(params, { replace: true })
  }

  // 순서 조정은 운영진 + 하위분류 필터가 없는(전체) 목록에서만(전역 순서를 다룬다).
  const canReorder = isStaff && !activeSub

  function moveApp(app: App, dir: "up" | "down") {
    const idx = apps.findIndex((a) => a.id === app.id)
    const j = dir === "up" ? idx - 1 : idx + 1
    if (idx < 0 || j < 0 || j >= apps.length) return

    const swapped = [...apps]
    ;[swapped[idx], swapped[j]] = [swapped[j], swapped[idx]]
    const prev = apps
    // 낙관적 반영(로컬 sortOrder 도 인덱스로 갱신).
    setApps(swapped.map((a, i) => ({ ...a, sortOrder: i })))
    setReorderError(null)
    // 저장은 옛 sortOrder 기준으로 바뀐 행만(swapped 는 옛 값 유지).
    reorderApps(swapped).catch((err) => {
      setApps(prev) // 실패 시 원복
      setReorderError(err instanceof Error ? err.message : "순서 저장에 실패했습니다.")
    })
  }

  return (
    <div className={`${CONTAINER} py-8`}>
      <div className="flex flex-col gap-8 lg:flex-row">
        <SubjectSidebar />

        <section className="min-w-0 flex-1">
          {unknown ? (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">과목</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                알 수 없는 과목입니다: {categoryId}
              </p>
            </>
          ) : !category ? (
            // 과목 미선택 = "인기" 대시보드
            <>
              <h1 className="text-2xl font-semibold tracking-tight">인기</h1>
              <p className="mt-1 mb-8 text-sm text-muted-foreground">
                인기있는 수업자료를 과목별로 보여줍니다.
              </p>
              <PopularDashboard apps={apps} />
              <div className="mt-8 flex justify-end">
                <WriteButton />
              </div>
            </>
          ) : (
            <>
              <SubjectBanner category={category} />

              {/* 학습자료 │ 수업 사례 탭 */}
              <div role="tablist" className="mt-5 flex gap-1 border-b border-border">
                <TabButton active={tab === "apps"} onClick={() => selectTab("apps")}>
                  학습자료 <span className="text-muted-foreground">{apps.length}</span>
                </TabButton>
                <TabButton active={tab === "practices"} onClick={() => selectTab("practices")}>
                  수업 사례 <span className="text-muted-foreground">{practices.length}</span>
                </TabButton>
              </div>

              {/* 하위 분류 칩 바 */}
              {subcategories.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
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

              {tab === "practices" ? (
                <>
                  <p className="mt-4 mb-4 text-sm text-muted-foreground">
                    {shownPractices.length}개 사례
                  </p>
                  {shownPractices.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {monthly && activeSub ? `${getCategory(activeSub)?.name} 수업 사례` : "이 분류의 수업 사례"}가 아직 없습니다.
                    </p>
                  ) : (
                    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                      {shownPractices.map((p) => (
                        <li key={p.id}>
                          <PracticeCard practice={p} />
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-8 flex justify-end">
                    <Link
                      to="/practices/write"
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                    >
                      <PenLine className="size-4" aria-hidden />
                      사례 쓰기
                    </Link>
                  </div>
                </>
              ) : (
              <>
              <p className="mt-4 mb-2 text-sm text-muted-foreground">
                {shownApps.length}개 앱
              </p>
              {canReorder && (
                <p className="mb-6 text-xs text-muted-foreground">
                  운영진: 카드의 ▲▼ 로 노출 순서를 조정할 수 있어요. (전체 목록에서만)
                </p>
              )}
              {reorderError && (
                <p className="mb-4 text-sm text-destructive">{reorderError}</p>
              )}
              <AppCardList
                apps={shownApps}
                columns={4}
                contextCategoryId={categoryId}
                emptyText={emptyText}
                bookmarkable
                reorder={
                  canReorder
                    ? {
                        onMoveUp: (a) => moveApp(a, "up"),
                        onMoveDown: (a) => moveApp(a, "down"),
                      }
                    : undefined
                }
              />
              <div className="mt-8 flex justify-end">
                <WriteButton categoryId={categoryId} />
              </div>
              </>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

/** 학습자료/수업 사례 탭 버튼 — 밑줄로 활성 표시(헤더 메뉴와 같은 방식). */
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "-mb-px border-b-2 px-4 py-2 text-sm transition-colors",
        active
          ? "border-primary font-semibold text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
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

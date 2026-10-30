import { useEffect, useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import { Hero } from "@/components/home/Hero"
import { CategoryGrid } from "@/components/home/CategoryGrid"
import { AppCardList } from "@/components/home/AppCardList"
import { PopularRankList } from "@/components/home/PopularRankList"
import { RegisterCtaCard } from "@/components/app/RegisterCtaCard"
import { registerCta } from "@/config/registerCta"
import { getApps, comparePopularApps, type App } from "@/lib/apps"
import { CONTAINER } from "@/config/layout"
import { usePageTitle } from "@/lib/usePageTitle"

/**
 * 랜딩(홈) — Hero + 카테고리 그리드 + 새로 올라온(카드 3열, 2/3 폭) / 인기(순위 목록, 1/3 폭).
 * 두 섹션을 생김새부터 다르게 해 구분되게 한다.
 */
const INITIAL_LATEST_LIMIT = 5
const LATEST_PAGE_SIZE = 6 // 더 보기마다 데스크톱 기준 두 줄 추가.
const POPULAR_LIMIT = 10 // 인기자료 1~10위

export function Home() {
  usePageTitle()
  const [apps, setApps] = useState<App[]>([])
  const [latestLimit, setLatestLimit] = useState(INITIAL_LATEST_LIMIT)

  useEffect(() => {
    let active = true
    getApps().then((data) => {
      if (active) setApps(data)
    })
    return () => {
      active = false
    }
  }, [])

  // 최신 = getApps 기본 정렬(created_at desc).
  const latest = apps.slice(0, latestLimit)
  const hasMoreLatest = latest.length < apps.length
  // 인기 = 인기 점수 내림차순·동점은 최신순.
  const popular = useMemo(
    () =>
      [...apps]
        .sort(comparePopularApps)
        .slice(0, POPULAR_LIMIT),
    [apps],
  )

  return (
    <div className={`${CONTAINER} flex flex-col gap-12 py-8`}>
      <Hero />
      <CategoryGrid />
      {/* 새로 올라온(카드 그리드) + 인기(순위 목록) 를 2:1 로 나란히. 좁은 화면은 위아래로. */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div id="latest-resources">
            <AppCardList
              title="새로 올라온 수업자료"
              apps={latest}
              columns={3}
              moreHref="/apps/latest"
              bookmarkable
              leading={registerCta.showCardTile ? <RegisterCtaCard /> : undefined}
            />
          </div>
          {apps.length > 0 && (
            <div className="mt-6 flex flex-col items-center gap-2">
              {hasMoreLatest && (
                <button
                  type="button"
                  aria-controls="latest-resources"
                  onClick={() => setLatestLimit((limit) => limit + LATEST_PAGE_SIZE)}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
                >
                  수업자료 더 보기
                  <ChevronDown className="size-4" aria-hidden />
                </button>
              )}
              <p role="status" className="text-xs text-muted-foreground">
                {hasMoreLatest
                  ? `전체 ${apps.length}개 중 ${latest.length}개 표시`
                  : `수업자료 ${latest.length}개를 모두 확인했어요.`}
              </p>
            </div>
          )}
        </div>
        <PopularRankList title="인기 수업자료" apps={popular} moreHref="/apps/subject" />
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from "react"
import { Hero } from "@/components/home/Hero"
import { CategoryGrid } from "@/components/home/CategoryGrid"
import { AppCardList } from "@/components/home/AppCardList"
import { PopularRankList } from "@/components/home/PopularRankList"
import { RegisterCtaCard } from "@/components/app/RegisterCtaCard"
import { registerCta } from "@/config/registerCta"
import { getApps, popularityScore, type App } from "@/lib/apps"
import { CONTAINER } from "@/config/layout"

/**
 * 랜딩(홈) — Hero + 카테고리 그리드 + 새로 올라온(카드 3열, 2/3 폭) / 인기(순위 목록, 1/3 폭).
 * 두 섹션을 생김새부터 다르게 해 구분되게 한다.
 */
const LATEST_SLOTS = 6 // 카드 3열 × 2줄. 글쓰기 타일이 켜져 있으면 한 칸을 차지한다.
const POPULAR_LIMIT = 8 // 왼쪽 카드 2줄과 높이를 맞추는 개수

export function Home() {
  const [apps, setApps] = useState<App[]>([])

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
  const latest = apps.slice(0, LATEST_SLOTS - (registerCta.showCardTile ? 1 : 0))
  // 인기 = 담기·좋아요 가중합(인기 점수) 내림차순, 동점은 최신순.
  const popular = useMemo(
    () =>
      [...apps]
        .sort(
          (a, b) =>
            popularityScore(b) - popularityScore(a) ||
            (a.createdAt < b.createdAt ? 1 : -1),
        )
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
          <AppCardList
            title="새로 올라온 수업자료"
            apps={latest}
            columns={3}
            moreHref="/apps/latest"
            bookmarkable
            leading={registerCta.showCardTile ? <RegisterCtaCard /> : undefined}
          />
        </div>
        <PopularRankList title="인기 수업자료" apps={popular} moreHref="/apps/subject" />
      </div>
    </div>
  )
}

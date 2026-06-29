import { useEffect, useMemo, useState } from "react"
import { Hero } from "@/components/home/Hero"
import { CategoryGrid } from "@/components/home/CategoryGrid"
import { AppCardList } from "@/components/home/AppCardList"
import { RegisterCtaCard } from "@/components/app/RegisterCtaCard"
import { registerCta } from "@/config/registerCta"
import { getApps, type App } from "@/lib/apps"
import { CONTAINER } from "@/config/layout"

/** 랜딩(홈) — Hero + 카테고리 그리드 + 최신/인기 수업자료(각 2열). */
const SECTION_LIMIT = 6

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
  const latest = apps.slice(0, SECTION_LIMIT)
  // 인기 = 좋아요 수 내림차순(동점은 최신순). 현재 좋아요는 시드값 기준.
  const popular = useMemo(
    () =>
      [...apps]
        .sort(
          (a, b) =>
            b.likeCount - a.likeCount || (a.createdAt < b.createdAt ? 1 : -1),
        )
        .slice(0, SECTION_LIMIT),
    [apps],
  )

  return (
    <div className={`${CONTAINER} flex flex-col gap-12 py-8`}>
      <Hero />
      <CategoryGrid />
      {/* 최신(2열) + 인기(2열) 를 나란히 → 큰 화면에서 전체 4열 */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <AppCardList
          title="최신 수업자료"
          apps={latest}
          columns={2}
          moreHref="/apps/latest"
          leading={registerCta.showCardTile ? <RegisterCtaCard /> : undefined}
        />
        <AppCardList
          title="인기 수업자료"
          apps={popular}
          columns={2}
          moreHref="/apps/subject"
        />
      </div>
    </div>
  )
}

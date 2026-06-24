import { useEffect, useState } from "react"
import { Hero } from "@/components/home/Hero"
import { CategoryGrid } from "@/components/home/CategoryGrid"
import { AppCardList } from "@/components/home/AppCardList"
import { getApps, type App } from "@/lib/apps"
import { CONTAINER } from "@/config/layout"

/** 랜딩(홈) — Hero 캐러셀 + 카테고리 그리드 + 최신 앱 목록. */
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

  return (
    <div className={`${CONTAINER} flex flex-col gap-12 py-8`}>
      <Hero />
      <CategoryGrid />
      <AppCardList title="최신 앱" apps={apps} />
    </div>
  )
}

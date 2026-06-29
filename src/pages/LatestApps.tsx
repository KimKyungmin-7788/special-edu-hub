import { useEffect, useState } from "react"
import { AppCardList } from "@/components/home/AppCardList"
import { getApps, type App } from "@/lib/apps"
import { CONTAINER } from "@/config/layout"

/** 최신 수업자료 전체 목록 — getApps 기본 정렬(최신순). 랜딩 "최신 수업자료" 더보기 대상. */
export function LatestApps() {
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
    <div className={`${CONTAINER} py-8`}>
      <h1 className="text-2xl font-semibold tracking-tight">최신 수업자료</h1>
      <p className="mt-2 mb-8 text-sm text-muted-foreground">{apps.length}개 앱</p>
      <AppCardList apps={apps} emptyText="등록된 수업자료가 아직 없습니다." />
    </div>
  )
}

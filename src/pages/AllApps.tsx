import { useEffect, useState } from "react"
import { AppCardList } from "@/components/home/AppCardList"
import { getApps, type App } from "@/lib/apps"

/** 전체 카탈로그 — 모든 앱을 카드 목록으로(최신순). */
export function AllApps() {
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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">전체</h1>
      <p className="mt-2 mb-8 text-sm text-muted-foreground">
        전체 {apps.length}개 앱
      </p>
      <AppCardList apps={apps} />
    </div>
  )
}

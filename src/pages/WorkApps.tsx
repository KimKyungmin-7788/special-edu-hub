import { useEffect, useState } from "react"
import { AppCardList } from "@/components/home/AppCardList"
import { WriteButton } from "@/components/app/WriteButton"
import { getAppsByType, type App } from "@/lib/apps"
import { CONTAINER } from "@/config/layout"

/** 업무혁신 카탈로그 — 'work' 타입 카테고리 앱을 카드 목록으로. */
export function WorkApps() {
  const [apps, setApps] = useState<App[]>([])

  useEffect(() => {
    let active = true
    getAppsByType("work").then((data) => {
      if (active) setApps(data)
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className={`${CONTAINER} py-8`}>
      <h1 className="text-2xl font-semibold tracking-tight">업무혁신</h1>
      <p className="mt-2 mb-8 text-sm text-muted-foreground">
        {apps.length}개 앱
      </p>
      <AppCardList apps={apps} emptyText="업무혁신 앱이 아직 없습니다." bookmarkable />
      <div className="mt-8 flex justify-end">
        <WriteButton categoryId="work" />
      </div>
    </div>
  )
}

import { useEffect, useState } from "react"
import { AppCardList } from "@/components/home/AppCardList"
import type { App } from "@/lib/apps"

/**
 * 저장한 앱 목록(즐겨찾기/좋아요) — loader 로 받은 앱을 카드 그리드로.
 * 마이페이지의 "즐겨찾기" 탭과 "내 활동"의 좋아요 목록에서 공용으로 쓴다.
 * 카드에 담기 토글(bookmarkable)을 달아 여기서 바로 해제할 수 있다.
 */
export function SavedAppList({
  load,
  emptyText,
}: {
  load: () => Promise<App[]>
  emptyText: string
}) {
  const [apps, setApps] = useState<App[] | null>(null)

  useEffect(() => {
    let active = true
    load().then((data) => {
      if (active) setApps(data)
    })
    return () => {
      active = false
    }
    // load 는 호출부에서 안정적인 함수 참조를 넘긴다(모듈 함수).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (apps === null) {
    return <p className="mt-2 text-sm text-muted-foreground">불러오는 중…</p>
  }
  return (
    <AppCardList apps={apps} emptyText={emptyText} columns={2} bookmarkable />
  )
}

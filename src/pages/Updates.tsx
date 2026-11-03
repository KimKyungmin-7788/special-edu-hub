import { useEffect, useState } from "react"
import { updatesPage } from "@/config/updates"
import { CONTAINER } from "@/config/layout"
import { listUpdates, markSeen, type SiteUpdate } from "@/lib/siteUpdates"
import { usePageTitle } from "@/lib/usePageTitle"
import { shortDate, UpdateEntry } from "@/components/updates/UpdateEntry"

/** 새 소식(/updates) — 날짜별 업데이트 목록. 소식은 운영진 페이지에서 쓴다(SQL 54). */
export function Updates() {
  usePageTitle(updatesPage.title)
  const [items, setItems] = useState<SiteUpdate[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    listUpdates()
      .then((list) => {
        setItems(list)
        // 이 페이지를 봤으면 팝업은 다시 띄우지 않는다
        if (list[0]) markSeen(list[0].createdAt)
      })
      .catch(() => setError(true))
  }, [])

  return (
    <div className={`${CONTAINER} py-10`}>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight">{updatesPage.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{updatesPage.lead}</p>

        {error ? (
          <p className="mt-8 text-sm text-destructive">소식을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</p>
        ) : items === null ? (
          <p className="mt-8 text-sm text-muted-foreground">불러오는 중…</p>
        ) : items.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">{updatesPage.empty}</p>
        ) : (
          <ol className="mt-6">
            {items.map((u) => (
              <li
                key={u.id}
                className="grid gap-1 border-t border-border py-6 sm:grid-cols-[6rem_1fr] sm:gap-6"
              >
                <time dateTime={u.createdAt} className="text-sm text-muted-foreground">
                  {shortDate(u.createdAt)}
                </time>
                <UpdateEntry update={u} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

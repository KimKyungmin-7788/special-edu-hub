import type { ReactNode } from "react"
import { AppCard } from "@/components/app/AppCard"
import type { App } from "@/lib/apps"

/**
 * 앱 카드 그리드. 제목·앱 배열을 받아 렌더링한다.
 * leading: 그리드 첫 칸에 끼울 노드(예: 등록 CTA 타일). 선택.
 */
export function AppCardList({
  title,
  apps,
  emptyText = "표시할 앱이 없습니다.",
  leading,
}: {
  title?: string
  apps: App[]
  emptyText?: string
  leading?: ReactNode
}) {
  const hasContent = apps.length > 0 || leading != null
  return (
    <section>
      {title && (
        <h2 className="mb-4 text-lg font-semibold tracking-tight">{title}</h2>
      )}

      {!hasContent ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {leading != null && <li>{leading}</li>}
          {apps.map((app) => (
            <li key={app.id}>
              <AppCard app={app} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

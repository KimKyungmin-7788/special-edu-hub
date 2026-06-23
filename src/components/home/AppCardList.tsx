import { AppCard } from "@/components/app/AppCard"
import type { App } from "@/lib/apps"

/** 앱 카드 그리드. 제목·앱 배열을 받아 렌더링한다. */
export function AppCardList({
  title,
  apps,
  emptyText = "표시할 앱이 없습니다.",
}: {
  title?: string
  apps: App[]
  emptyText?: string
}) {
  return (
    <section>
      {title && (
        <h2 className="mb-4 text-lg font-semibold tracking-tight">{title}</h2>
      )}

      {apps.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

import { useEffect, useState, type ReactNode } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import { AppCard } from "@/components/app/AppCard"
import { useAuth } from "@/lib/auth"
import { getMyBookmarkedIds, toggleBookmark } from "@/lib/engagement"
import type { App } from "@/lib/apps"

/**
 * 앱 카드 그리드. 제목·앱 배열을 받아 렌더링한다.
 * leading: 그리드 첫 칸에 끼울 노드(예: 등록 CTA 타일). 선택.
 * reorder: 주어지면(운영진) 각 카드에 순서 ▲▼ 버튼을 단다.
 */
export function AppCardList({
  title,
  apps,
  emptyText = "표시할 앱이 없습니다.",
  leading,
  reorder,
  columns = 4,
  moreHref,
  bookmarkable,
}: {
  title?: string
  apps: App[]
  emptyText?: string
  leading?: ReactNode
  reorder?: { onMoveUp: (app: App) => void; onMoveDown: (app: App) => void }
  /** 큰 화면에서의 열 수. 기본 4(목록), 랜딩 섹션은 2. */
  columns?: 2 | 4
  /** 주어지면 헤더 오른쪽에 "더보기" 링크(해당 전체 목록으로). */
  moreHref?: string
  /** true 면 각 카드에 담기(북마크) 토글을 단다(내 담기 상태를 직접 로드·관리). */
  bookmarkable?: boolean
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!bookmarkable) return
    let active = true
    getMyBookmarkedIds().then((ids) => {
      if (active) setBookmarkedIds(ids)
    })
    return () => {
      active = false
    }
  }, [bookmarkable, user])

  async function onToggleBookmark(appId: string) {
    if (!user) return navigate("/login")
    const has = bookmarkedIds.has(appId)
    setBookmarkedIds((prev) => {
      const n = new Set(prev)
      if (has) n.delete(appId)
      else n.add(appId)
      return n
    })
    try {
      await toggleBookmark(appId)
    } catch {
      // 실패 시 원복
      setBookmarkedIds((prev) => {
        const n = new Set(prev)
        if (has) n.add(appId)
        else n.delete(appId)
        return n
      })
    }
  }
  const hasContent = apps.length > 0 || leading != null
  const gridCols =
    columns === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
  return (
    <section>
      {(title || moreHref) && (
        <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
          {title && (
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          )}
          {moreHref && (
            <Link
              to={moreHref}
              className="inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              더보기
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>
      )}

      {!hasContent ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className={`grid gap-4 ${gridCols}`}>
          {leading != null && <li>{leading}</li>}
          {apps.map((app, i) => (
            <li key={app.id}>
              <AppCard
                app={app}
                move={
                  reorder && {
                    onUp: () => reorder.onMoveUp(app),
                    onDown: () => reorder.onMoveDown(app),
                    canUp: i > 0,
                    canDown: i < apps.length - 1,
                  }
                }
                bookmark={
                  bookmarkable
                    ? {
                        active: bookmarkedIds.has(app.id),
                        onToggle: () => onToggleBookmark(app.id),
                      }
                    : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getCategory } from "@/config/categories"
import { AppThumbnail } from "@/components/app/AppThumbnail"
import { getAllApps, setAppStatus, type App } from "@/lib/apps"

/**
 * 관리자 "앱 관리" — 전체 앱(숨김 포함, 모든 등록자) 목록 + 공개/숨김 토글 (묶음 A).
 * getAllApps 는 RLS(is_admin) 가 관리자에게만 숨김·타인 앱을 내려준다.
 * 삭제는 없고 status 토글만(PRD §11.3). MyAppList 와 같은 패턴, 작성자 표시를 더한다.
 */
export function AdminAppList() {
  const [apps, setApps] = useState<App[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getAllApps().then((data) => {
      if (active) setApps(data)
    })
    return () => {
      active = false
    }
  }, [])

  async function toggle(app: App) {
    setError(null)
    setBusyId(app.id)
    const next = app.status === "published" ? "hidden" : "published"
    try {
      const updated = await setAppStatus(app.id, next)
      setApps((list) => list?.map((a) => (a.id === app.id ? updated : a)) ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "변경에 실패했습니다.")
    } finally {
      setBusyId(null)
    }
  }

  if (apps === null) {
    return <p className="mt-2 text-sm text-muted-foreground">불러오는 중…</p>
  }

  if (apps.length === 0) {
    return (
      <p className="mt-2 rounded-lg border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
        등록된 앱이 없습니다.
      </p>
    )
  }

  const hiddenCount = apps.filter((a) => a.status === "hidden").length

  return (
    <>
      <p className="mb-2 text-sm text-muted-foreground">
        전체 {apps.length}개 · 숨김 {hiddenCount}개
      </p>
      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
      <ul className="divide-y divide-border rounded-lg border border-border">
        {apps.map((app) => {
          const hidden = app.status === "hidden"
          const tags = app.categoryIds
            .map((id) => getCategory(id)?.name)
            .filter(Boolean)
            .slice(0, 3) as string[]
          return (
            <li key={app.id} className="flex items-center gap-3 p-3">
              <Link
                to={`/app/${app.id}`}
                className="relative aspect-video w-24 shrink-0 overflow-hidden rounded border border-border bg-surface"
              >
                <AppThumbnail app={app} iconClassName="size-5" />
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  to={`/app/${app.id}`}
                  className={
                    "block truncate text-sm font-medium hover:underline " +
                    (hidden ? "text-muted-foreground" : "text-foreground")
                  }
                >
                  {app.title}
                </Link>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-xs " +
                      (hidden
                        ? "bg-secondary text-secondary-foreground"
                        : "border border-border text-muted-foreground")
                    }
                  >
                    {hidden ? "숨김" : "공개"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {app.authorName || "작성자 없음"}
                    {tags.length > 0 && <> · {tags.join(" · ")}</>}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggle(app)}
                disabled={busyId === app.id}
                className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
              >
                {busyId === app.id ? "처리 중…" : hidden ? "공개로" : "숨기기"}
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}

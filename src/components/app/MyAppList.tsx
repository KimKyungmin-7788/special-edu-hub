import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getCategory } from "@/config/categories"
import { AppThumbnail } from "@/components/app/AppThumbnail"
import { getMyApps, setAppStatus, type App } from "@/lib/apps"

/**
 * 마이페이지 "내 활동" — 내가 등록한 앱 목록 + 숨김/공개 토글 (묶음 F-3).
 * getMyApps 는 숨김 앱도 포함(본인). 삭제는 없고 status 토글만(PRD §11.3).
 * 숨김 앱은 공개 목록에서 빠지지만 본인에겐 여기 보인다.
 */
export function MyAppList() {
  const [apps, setApps] = useState<App[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getMyApps().then((data) => {
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
      <div className="mt-2 rounded-lg border border-border bg-surface p-6 text-center">
        <p className="text-sm text-muted-foreground">아직 등록한 앱이 없어요.</p>
        <Link
          to="/apps/subject"
          className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          글쓰기로 등록하기
        </Link>
      </div>
    )
  }

  return (
    <>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
        {apps.map((app) => {
          const hidden = app.status === "hidden"
          const tags = app.categoryIds
            .map((id) => getCategory(id)?.name)
            .filter(Boolean)
            .slice(0, 3) as string[]
          return (
            <li
              key={app.id}
              className="flex items-center gap-3 p-3"
            >
              {/* 썸네일 */}
              <Link
                to={`/app/${app.id}`}
                className="aspect-video w-24 shrink-0 overflow-hidden rounded border border-border bg-surface"
              >
                <AppThumbnail app={app} iconClassName="size-5" />
              </Link>

              {/* 본문 */}
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
                  {tags.length > 0 && (
                    <span className="truncate text-xs text-muted-foreground">
                      {tags.join(" · ")}
                    </span>
                  )}
                </div>
              </div>

              {/* 토글 */}
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
      <p className="mt-2 text-xs text-muted-foreground">
        숨긴 앱은 목록·검색에서 빠지지만 삭제되지 않아요. 언제든 다시 공개할 수 있어요.
      </p>
    </>
  )
}

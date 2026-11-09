import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ExternalLink, LayoutGrid, Lock, Search, Share2, Table2 } from "lucide-react"
import { SeedlingIntro } from "@/components/app/SeedlingIntro"
import { useAuth } from "@/lib/auth"
import { AppCardList } from "@/components/home/AppCardList"
import { AppThumbnail } from "@/components/app/AppThumbnail"
import { ShareDialog } from "@/components/app/ShareDialog"
import { categories, getCategory } from "@/config/categories"
import { CONTAINER } from "@/config/layout"
import { seedling } from "@/config/seedling"
import { getSeedlingApps, cardSummary, displayTitle, type App } from "@/lib/apps"
import { usePageTitle } from "@/lib/usePageTitle"
import { cn } from "@/lib/utils"

const filters = categories.filter((category) => !category.parentId && !category.hideFromGrid)

export function SeedlingRoom() {
  usePageTitle(seedling.title)
  const [params, setParams] = useSearchParams()
  const { user, profile } = useAuth()
  const [seedlingApps, setSeedlingApps] = useState<App[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError(false)
    getSeedlingApps()
      .then((apps) => { if (active) setSeedlingApps(apps) })
      .catch(() => { if (active) { setSeedlingApps([]); setLoadError(true) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user?.id, profile?.isTeacherVerified, profile?.role])
  const [sharing, setSharing] = useState<App | null>(null)
  const categoryId = filters.find((category) => category.id === params.get("subject"))?.id
  const query = params.get("q") ?? ""
  const view = params.get("view") === "table" ? "table" : "gallery"
  const keyword = query.trim().normalize("NFC").toLocaleLowerCase()
  const apps = seedlingApps.filter((app) => {
    const inCategory = !categoryId || app.categoryIds.includes(categoryId)
    const text = [app.title, app.authorName, cardSummary(app), ...app.categoryIds.map((id) => getCategory(id)?.name ?? "")]
      .join(" ").normalize("NFC").toLocaleLowerCase()
    return inCategory && text.includes(keyword)
  })

  function updateParam(key: string, value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    }, { replace: true })
  }

  return (
    <div className={`${CONTAINER} py-8`}>
      <SeedlingIntro categoryId={categoryId} />

      <label className="mt-6 flex items-center gap-3 rounded-lg border border-border px-4 py-3 focus-within:ring-2 focus-within:ring-ring">
        <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="sr-only">자료 검색</span>
        <input
          type="search"
          value={query}
          onChange={(event) => updateParam("q", event.target.value)}
          placeholder="자료명, 제작자, 키워드로 검색해 보세요"
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
        />
      </label>

      <div role="group" aria-label="교과목 선택" className="mt-4 flex flex-wrap gap-2">
        {[{ id: "", name: "전체" }, ...filters].map((category) => (
          <button
            key={category.id}
            type="button"
            aria-pressed={(categoryId ?? "") === category.id}
            onClick={() => updateParam("subject", category.id)}
            className={cn(
              "min-h-11 rounded-full border px-3 py-2 text-sm transition-colors sm:min-h-0 sm:py-1.5",
              (categoryId ?? "") === category.id
                ? "border-primary bg-primary font-medium text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="mt-6 mb-4 flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {categoryId ? getCategory(categoryId)?.name : "전체 자료"}{" "}
          <strong className="font-semibold text-foreground">{apps.length}</strong>개
          {keyword && " · 검색 결과"}
        </p>
        <div role="group" aria-label="보기 방식" className="flex gap-1 rounded-lg border border-border p-1">
          {([
            { value: "gallery", label: "갤러리", Icon: LayoutGrid },
            { value: "table", label: "표", Icon: Table2 },
          ] as const).map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              onClick={() => updateParam("view", value === "gallery" ? "" : value)}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 py-2 text-sm sm:min-h-0",
                view === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
              )}
            >
              <Icon className="size-4" aria-hidden />{label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p role="status" className="py-16 text-center text-sm text-muted-foreground">자료를 불러오는 중…</p>
      ) : loadError ? (
        <p role="alert" className="py-16 text-center text-sm text-muted-foreground">새싹자료를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</p>
      ) : view === "gallery" ? (
        apps.length > 0 ? (
          <AppCardList apps={apps} columns={4} contextCategoryId={categoryId} bookmarkable />
        ) : <EmptyResults filtered={Boolean(categoryId || keyword)} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">새싹자료 목록</caption>
            <thead className="bg-surface text-xs text-muted-foreground">
              <tr>{["자료명", "교과목", "제작자", "조회", "바로가기"].map((label) => (
                <th key={label} scope="col" className="whitespace-nowrap px-4 py-3 font-medium">{label}</th>
              ))}</tr>
            </thead>
            <tbody>
              {apps.map((app) => {
                const category = getCategory(categoryId ?? app.categoryIds.find((id) => !getCategory(id)?.parentId) ?? "")
                return (
                  <tr key={app.id} className="border-t border-border">
                    <td className="min-w-64 px-4 py-3">
                      <Link to={`/app/${app.id}`} className="group flex items-center gap-3">
                        <div className="relative aspect-video w-16 shrink-0 overflow-hidden rounded-md bg-surface"><AppThumbnail app={app} /></div>
                        <div>
                          <span className="font-semibold group-hover:text-primary group-hover:underline">{displayTitle(app)}</span>
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{cardSummary(app)}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">{category && <span className="whitespace-nowrap rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">{category.shortName ?? category.name}</span>}</td>
                    <td className="whitespace-nowrap px-4 py-3">{app.authorName}</td>
                    <td className="px-4 py-3 tabular-nums">{app.viewCount}</td>
                    <td className="px-4 py-3">
                      {app.locked ? <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground"><Lock className="size-4" aria-hidden />교사 전용</span> : app.appUrl && (
                        <div className="flex gap-1">
                          <a href={app.appUrl} target="_blank" rel="noopener noreferrer" aria-label={`${app.title} 바로가기(새 탭)`} className="rounded-md p-3 text-muted-foreground hover:bg-accent hover:text-primary"><ExternalLink className="size-4" aria-hidden /></a>
                          <button type="button" onClick={() => setSharing(app)} aria-label={`${app.title} 공유`} className="rounded-md p-3 text-muted-foreground hover:bg-accent hover:text-primary"><Share2 className="size-4" aria-hidden /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {apps.length === 0 && <tr><td colSpan={5}><EmptyResults filtered={Boolean(categoryId || keyword)} /></td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {sharing && <ShareDialog open onClose={() => setSharing(null)} title={displayTitle(sharing)} url={sharing.appUrl} />}
    </div>
  )
}

function EmptyResults({ filtered }: { filtered: boolean }) {
  return (
    <div className="rounded-xl bg-surface px-4 py-16 text-center text-sm text-muted-foreground">
      <p>{filtered ? "검색 조건에 맞는 자료가 없습니다." : "아직 등록된 새싹자료가 없습니다."}</p>
      <p className="mt-2">{filtered ? "다른 교과목이나 검색어로 찾아보세요." : "처음 만든 앱과 시작 이야기를 남겨 주세요."}</p>
    </div>
  )
}

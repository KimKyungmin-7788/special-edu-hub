import { getCategory } from "@/config/categories"
import { getCategoryIcon } from "@/components/categoryIcon"
import { displayTitle, type App } from "@/lib/apps"

/**
 * 앱 썸네일 — 부모 컨테이너(relative + aspect 지정)를 꽉 채운다.
 * 자식을 absolute inset-0 으로 깔아 부모의 aspect-ratio 가 높이를 정하게 한다
 * (img 에 height:100% 를 주면 aspect-ratio 와 순환해 이미지 원본 비율로 카드가 늘어나는 버그).
 * 호출부는 반드시 부모에 `relative` 를 둔다(AppCard·AppDetail·MyAppList).
 * 썸네일이 있으면 이미지, 없으면 "의도된" 플레이스홀더(상위 과목 아이콘 + 제목).
 * 중립 토큰만 사용(CLAUDE.md).
 */
export function AppThumbnail({
  app,
  iconClassName = "size-8",
}: {
  app: App
  iconClassName?: string
}) {
  if (app.thumbnailUrl) {
    return (
      <img
        src={app.thumbnailUrl}
        alt={app.title}
        className="absolute inset-0 h-full w-full object-cover"
      />
    )
  }

  // 상위(부모 없는) 카테고리를 대표로 골라 그 아이콘을 쓴다.
  const primary = app.categoryIds
    .map((id) => getCategory(id))
    .find((c) => c && !c.parentId)
  const Icon = getCategoryIcon(primary?.icon)

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface px-3 text-muted-foreground">
      <Icon className={iconClassName} aria-hidden />
      <span className="line-clamp-2 text-center text-xs">{displayTitle(app)}</span>
    </div>
  )
}

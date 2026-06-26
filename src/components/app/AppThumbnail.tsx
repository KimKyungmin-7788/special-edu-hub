import { getCategory } from "@/config/categories"
import { getCategoryIcon } from "@/components/categoryIcon"
import type { App } from "@/lib/apps"

/**
 * 앱 썸네일 — 부모 컨테이너(aspect 지정)를 꽉 채운다.
 * 썸네일이 있으면 이미지, 없으면 "의도된" 플레이스홀더
 * (상위 과목 아이콘 + 제목)를 보여준다 — 빈 칸이 깨져 보이지 않게.
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
        className="h-full w-full object-cover"
      />
    )
  }

  // 상위(부모 없는) 카테고리를 대표로 골라 그 아이콘을 쓴다.
  const primary = app.categoryIds
    .map((id) => getCategory(id))
    .find((c) => c && !c.parentId)
  const Icon = getCategoryIcon(primary?.icon)

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface px-3 text-muted-foreground">
      <Icon className={iconClassName} aria-hidden />
      <span className="line-clamp-2 text-center text-xs">{app.title}</span>
    </div>
  )
}

import { Link } from "react-router-dom"
import { Heart } from "lucide-react"
import { subjectCategories, getCategory } from "@/config/categories"
import type { App } from "@/lib/apps"

/**
 * 과목별 "인기" 대시보드 (묶음 I).
 * 상위 과목마다 박스 1개 — 그 과목의 앱을 좋아요순 최대 5개씩 컴팩트 줄로.
 * 박스 헤더의 "더보기"로 해당 과목 전체 목록(/apps/subject/:id)으로.
 * 자료 없는 과목도 빈 박스로 표시(레퍼런스 구성). 중립 토큰만.
 */
const MAX_PER_BOX = 5

export function PopularDashboard({ apps }: { apps: App[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
      {subjectCategories.map((cat) => {
        const items = apps
          .filter((a) => a.categoryIds.includes(cat.id))
          .sort(
            (a, b) =>
              b.likeCount - a.likeCount ||
              (a.createdAt < b.createdAt ? 1 : -1), // 동점은 최신순
          )
          .slice(0, MAX_PER_BOX)
        return (
          <CategoryBox
            key={cat.id}
            categoryId={cat.id}
            name={cat.name}
            items={items}
          />
        )
      })}
    </div>
  )
}

function CategoryBox({
  categoryId,
  name,
  items,
}: {
  categoryId: string
  name: string
  items: App[]
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2.5">
        <h2 className="text-sm font-semibold tracking-tight">{name}</h2>
        <Link
          to={`/apps/subject/${categoryId}`}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          더보기
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-muted-foreground">
          아직 등록된 자료가 없어요.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((app) => (
            <Row key={app.id} app={app} categoryId={categoryId} />
          ))}
        </ul>
      )}
    </section>
  )
}

/** 한 줄: [세부분류] 제목 ♥좋아요 · 작성자. */
function Row({ app, categoryId }: { app: App; categoryId: string }) {
  // 이 과목에 속한 세부분류 라벨(있으면).
  const sub = app.categoryIds
    .map((id) => getCategory(id))
    .find((c) => c?.parentId === categoryId)

  return (
    <li>
      <Link
        to={`/app/${app.id}`}
        className="flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-accent"
      >
        {sub && (
          <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
            {sub.name}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate">{app.title}</span>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <Heart className="size-3" aria-hidden />
          {app.likeCount}
        </span>
        <span className="max-w-24 shrink-0 truncate text-xs text-muted-foreground">
          {app.authorName}
        </span>
      </Link>
    </li>
  )
}

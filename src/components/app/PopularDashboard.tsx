import { subjectCategories } from "@/config/categories"
import { AppCardList } from "@/components/home/AppCardList"
import { popularityScore, type App } from "@/lib/apps"

/**
 * 과목별 "인기" 대시보드 (묶음 I).
 * 상위 과목마다 섹션 1개 — 그 과목의 앱을 인기순 최대 4개(카드 한 줄)씩.
 * 랜딩 최신/인기 섹션과 같은 AppCardList(헤더+더보기+카드 그리드)를 재사용한다.
 * 섹션 "더보기"로 해당 과목 전체 목록(/apps/subject/:id)으로. 자료 없는 과목도 빈 안내로 표시.
 */
const MAX_PER_SECTION = 4

export function PopularDashboard({ apps }: { apps: App[] }) {
  return (
    <div className="flex flex-col gap-12">
      {subjectCategories.map((cat) => {
        const items = apps
          .filter((a) => a.categoryIds.includes(cat.id))
          .sort(
            (a, b) =>
              popularityScore(b) - popularityScore(a) ||
              (a.createdAt < b.createdAt ? 1 : -1), // 동점은 최신순
          )
          .slice(0, MAX_PER_SECTION)
        return (
          <AppCardList
            key={cat.id}
            title={cat.name}
            apps={items}
            moreHref={`/apps/subject/${cat.id}`}
            emptyText="아직 등록된 자료가 없어요."
            columns={4}
            bookmarkable
          />
        )
      })}
    </div>
  )
}

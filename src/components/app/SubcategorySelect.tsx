import { getSubcategories } from "@/config/categories"
import { cn } from "@/lib/utils"

/**
 * 세부(하위) 분류 다중선택 칩.
 * 상위 카테고리는 글쓰기 진입 시 이미 정해졌으므로, 그 하위 분류만 고른다.
 * group 이 바뀌면 사이에 세로 구분선(SubjectApps 와 동일 스타일).
 * 하위 분류가 없는 상위면 아무것도 렌더하지 않는다(부모가 안내문 처리).
 */
export function SubcategorySelect({
  parentId,
  value,
  onChange,
  disabled,
}: {
  parentId: string
  value: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}) {
  const subs = getSubcategories(parentId)
  if (subs.length === 0) return null

  function toggle(id: string) {
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {subs.map((s, i) => {
        const prev = subs[i - 1]
        const divider = prev && s.group && prev.group && s.group !== prev.group
        return (
          <span key={s.id} className="flex items-center gap-2">
            {divider && (
              <span aria-hidden className="mx-1 h-5 w-px self-center bg-border" />
            )}
            <button
              type="button"
              onClick={() => toggle(s.id)}
              disabled={disabled}
              aria-pressed={value.includes(s.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors disabled:opacity-50",
                value.includes(s.id)
                  ? "border-foreground bg-accent font-medium text-accent-foreground"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {s.name}
            </button>
          </span>
        )
      })}
    </div>
  )
}

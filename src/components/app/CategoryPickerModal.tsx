import { Modal } from "@/components/ui/Modal"
import { subjectCategories, workCategories } from "@/config/categories"
import { getCategoryIcon } from "@/components/categoryIcon"

/**
 * 글쓰기 진입용 카테고리 선택 모달.
 * 카테고리 문맥 없이(랜딩·전체) 글쓰기를 누르면 이 모달로 분류를 먼저 고른다.
 * 그리드 노출 카테고리(국어~업무혁신)만 — hideFromGrid 제외.
 */
export function CategoryPickerModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  onSelect: (categoryId: string) => void
}) {
  const cats = [...subjectCategories, ...workCategories].filter(
    (c) => !c.hideFromGrid,
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="write-pick-title"
      className="max-w-md"
    >
      <div className="p-6">
        <h2 id="write-pick-title" className="text-lg font-semibold tracking-tight">
          어떤 분류에 글을 쓸까요?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          분류를 선택하면 글쓰기 화면으로 이동합니다.
        </p>
        <ul className="mt-5 grid grid-cols-3 gap-2">
          {cats.map((c) => {
            const Icon = getCategoryIcon(c.icon)
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className="flex w-full flex-col items-center gap-1.5 rounded-lg border border-border px-2 py-3 text-center transition-colors hover:border-foreground/30 hover:bg-accent"
                >
                  <Icon className="size-5 text-foreground" aria-hidden />
                  <span className="text-sm">{c.name}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </Modal>
  )
}

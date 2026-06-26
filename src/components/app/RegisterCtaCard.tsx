import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus } from "lucide-react"
import { CategoryPickerModal } from "@/components/app/CategoryPickerModal"

/**
 * 랜딩 최신 앱 그리드 첫 칸 '+ 글쓰기' 타일 (배치 실험용 — registerCta.showCardTile).
 * 카테고리 문맥이 없으므로 클릭 시 분류 선택 모달 → /write/:categoryId 로 이동.
 * 카드와 같은 칸을 채우는 점선 타일. 중립 토큰만.
 */
export function RegisterCtaCard() {
  const navigate = useNavigate()
  const [pickOpen, setPickOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setPickOpen(true)}
        className="flex h-full min-h-44 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-surface p-6 text-center text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
      >
        <Plus className="size-7" aria-hidden />
        <span className="text-sm font-medium">글쓰기</span>
        <span className="text-xs">직접 제작한 수업자료를 공개해보세요.</span>
      </button>
      <CategoryPickerModal
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        onSelect={(id) => {
          setPickOpen(false)
          navigate(`/write/${id}`)
        }}
      />
    </>
  )
}

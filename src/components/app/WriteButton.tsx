import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { CategoryPickerModal } from "@/components/app/CategoryPickerModal"

/**
 * '글쓰기' 진입 버튼 — 모든 등록 진입점의 통일된 입구.
 *  - categoryId 가 주어지면(과목 페이지 등) 바로 /write/:categoryId 로.
 *  - 없으면(랜딩·전체) 카테고리 선택 모달을 띄운 뒤 이동.
 * 로그인·인증 안내는 글쓰기 페이지(게이트)가 처리 — 항상 노출.
 */
export function WriteButton({
  categoryId,
  label = "글쓰기",
  variant = "solid",
  className,
}: {
  categoryId?: string
  label?: string
  variant?: "solid" | "outline"
  className?: string
}) {
  const navigate = useNavigate()
  const [pickOpen, setPickOpen] = useState(false)

  const classes = cn(
    "inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors",
    variant === "solid"
      ? "bg-primary text-primary-foreground hover:opacity-90"
      : "border border-border text-foreground hover:bg-accent",
    className,
  )

  if (categoryId) {
    return (
      <Link to={`/write/${categoryId}`} className={classes}>
        <Pencil className="size-4" aria-hidden />
        {label}
      </Link>
    )
  }

  return (
    <>
      <button type="button" onClick={() => setPickOpen(true)} className={classes}>
        <Pencil className="size-4" aria-hidden />
        {label}
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

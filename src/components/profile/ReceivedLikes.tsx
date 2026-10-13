import { useEffect, useState } from "react"
import { ThumbsUp } from "lucide-react"
import { getReceivedLikeCount } from "@/lib/profile"
import { cn } from "@/lib/utils"

/**
 * 받은 좋아요 누계 뱃지 — 앱·수업실천사례·댓글에서 다른 사람에게 받은 좋아요 합.
 * 프로필 미리보기·마이페이지 공용. 불러오기 전·실패 시에는 아무것도 그리지 않는다.
 */
export function ReceivedLikes({ userId, className }: { userId: string; className?: string }) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    setCount(null)
    getReceivedLikeCount(userId).then((n) => {
      if (active) setCount(n)
    })
    return () => {
      active = false
    }
  }, [userId])

  if (count === null) return null
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-brand-muted px-2 py-0.5 text-xs font-medium text-brand-muted-foreground",
        className,
      )}
      title="자료·수업 사례·댓글에서 받은 좋아요"
    >
      <ThumbsUp className="size-3.5" aria-hidden />
      받은 좋아요 {count.toLocaleString("ko-KR")}
    </span>
  )
}

import { AVATAR_PHOTO, avatarTone } from "@/lib/avatarTone"
import { cn } from "@/lib/utils"

/** 계정 아이콘: 프로필 사진, 없으면 이름 첫 글자 동그라미(댓글·알림과 같은 색 규칙) */
export function PersonAvatar({ name, url, className }: { name: string | null | undefined; url: string | null | undefined; className?: string }) {
  const n = name?.trim() || "사용자"
  return <span aria-hidden className={cn("inline-flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full border text-xs", url ? AVATAR_PHOTO : avatarTone(n), className)}>
    {url ? <img src={url} alt="" className="size-full object-cover" /> : n.slice(0, 1)}
  </span>
}

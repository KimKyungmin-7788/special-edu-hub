import { useId, useState, type ReactNode } from "react"
import { Modal } from "@/components/ui/Modal"
import { ProfilePreview } from "@/components/profile/ProfilePreview"
import { getProfile, type Profile } from "@/lib/profile"
import { cn } from "@/lib/utils"

/**
 * 프로필 미리보기 트리거 (2단계 묶음 C) — 통일 컴포넌트.
 * 어디서든 사용자명/아바타를 <ProfileTrigger userId={id}>…</ProfileTrigger> 로
 * 감싸면 클릭 시 미리보기 모달이 뜬다.
 * 트리거 동작·모달을 여기 한 곳에 모아, 한 곳만 고치면 전체에 반영된다.
 *
 * 데이터: getProfile(userId) — 처음 열 때 한 번 로드하고 같은 id 면 재사용.
 * (앱 개발자 이름 등 실제 연결은 owner_id 가 생기는 3단계에 이걸로 감싼다.)
 */

type ProfileTriggerProps = {
  userId: string
  children: ReactNode
  className?: string
}

export function ProfileTrigger({ userId, children, className }: ProfileTriggerProps) {
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const titleId = useId()

  function handleOpen() {
    setOpen(true)
    if (loadedFor === userId) return // 같은 사용자면 재요청 안 함
    setLoading(true)
    getProfile(userId).then((p) => {
      setProfile(p ?? null)
      setLoadedFor(userId)
      setLoading(false)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          "inline-flex items-center rounded-sm underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        {children}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} labelledBy={titleId}>
        <ProfilePreview profile={profile} loading={loading} titleId={titleId} />
      </Modal>
    </>
  )
}

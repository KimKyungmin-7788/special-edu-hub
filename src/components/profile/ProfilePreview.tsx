import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { Mail, ChevronLeft, ChevronRight } from "lucide-react"
import { PromoLinks } from "@/components/profile/PromoLinks"
import { AppThumbnail } from "@/components/app/AppThumbnail"
import { useAuth } from "@/lib/auth"
import { sendMessage, MESSAGE_MAX } from "@/lib/messages"
import { getAppsByOwner, type App } from "@/lib/apps"
import type { Profile } from "@/lib/profile"

/**
 * 프로필 미리보기 내용 (2단계 묶음 C, E-3).
 * 아바타 · 닉네임 · 교사인증 배지 · (공개 시) 이메일 · 홍보 링크 ·
 * 쪽지 보내기(E-3, 본인·비로그인 제외) · "프로필 전체 보기"(준비 중).
 * 홍보 링크는 흑백 브랜드 로고 아이콘 버튼으로 표시(글자 없이, 종류는 aria/title).
 * 모달 동작은 Modal/ProfileTrigger 가 담당하고, 여기는 표시만 한다.
 */

type ProfilePreviewProps = {
  profile: Profile | null
  loading: boolean
  /** 제목 요소 id (모달 aria-labelledby 연결) */
  titleId?: string
  /** 모달 닫기 — "작성 글" 항목 클릭 시 모달 닫고 상세로 이동하는 데 쓴다. */
  onClose?: () => void
}

export function ProfilePreview({ profile, loading, titleId, onClose }: ProfilePreviewProps) {
  const { user } = useAuth()
  // 같은 모달 안에서 화면 전환: 프로필 ↔ 작성 글 목록(중첩 모달 대신).
  const [view, setView] = useState<"profile" | "posts">("profile")

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">불러오는 중…</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          프로필을 불러올 수 없습니다.
        </p>
      </div>
    )
  }

  const name = profile.nickname?.trim() || "이름 없음"
  const initial = name.charAt(0).toUpperCase()
  const isSelf = !!user && user.id === profile.id

  // 작성 글 목록 화면(같은 모달 안).
  if (view === "posts") {
    return (
      <AuthorPosts
        ownerId={profile.id}
        ownerName={name}
        titleId={titleId}
        onBack={() => setView("profile")}
        onClose={onClose}
      />
    )
  }

  return (
    <div className="p-6">
      {/* 아바타 + 이름 + 교사인증 배지 */}
      <div className="flex items-center gap-4 pr-8">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-xl font-medium text-muted-foreground">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <div className="min-w-0">
          <h2
            id={titleId}
            className="truncate text-lg font-semibold tracking-tight"
          >
            {name}
          </h2>
          {profile.isTeacherVerified && (
            <span className="mt-1 inline-block rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium text-foreground">
              교사 인증됨
            </span>
          )}
        </div>
      </div>

      {/* 이메일 — 본인이 공개로 둔 경우에만 */}
      {profile.emailPublic && profile.email && (
        <a
          href={`mailto:${profile.email}`}
          className="mt-4 inline-flex max-w-full items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <Mail className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{profile.email}</span>
        </a>
      )}

      {/* 홍보 링크 — 입력된 것만, 흑백 로고 버튼. 새 탭 + noopener noreferrer */}
      <PromoLinks profile={profile} className="mt-4" />

      {/* 쪽지 보내기 (E-3) — 본인 프로필엔 안 보인다. 비로그인은 로그인 안내. */}
      {!isSelf && (
        <div className="mt-6 border-t border-border pt-4">
          {user ? (
            <SendMessageForm recipientId={profile.id} recipientName={name} />
          ) : (
            <p className="text-sm text-muted-foreground">
              쪽지를 보내려면{" "}
              <Link to="/login" className="underline underline-offset-2">
                로그인
              </Link>
              하세요.
            </p>
          )}
        </div>
      )}

      {/* 작성 글 보기 — 같은 모달 안에서 작성한 수업자료 목록으로 전환 */}
      <button
        type="button"
        onClick={() => setView("posts")}
        className="mt-6 flex w-full items-center justify-between rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
      >
        작성한 수업자료 보기
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
      </button>
    </div>
  )
}

/**
 * 작성 글 목록 화면(프로필 모달 내부 전환). 등록자의 공개 앱을 컴팩트 행으로.
 * 항목 클릭 → 모달 닫고 해당 상세로 이동(같은 탭). 후속(게시판) 도입 시 글도 합칠 수 있음.
 */
function AuthorPosts({
  ownerId,
  ownerName,
  titleId,
  onBack,
  onClose,
}: {
  ownerId: string
  ownerName: string
  titleId?: string
  onBack: () => void
  onClose?: () => void
}) {
  const [apps, setApps] = useState<App[] | null>(null)

  useEffect(() => {
    let active = true
    getAppsByOwner(ownerId).then((data) => {
      if (active) setApps(data)
    })
    return () => {
      active = false
    }
  }, [ownerId])

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 pr-8">
        <button
          type="button"
          onClick={onBack}
          aria-label="프로필로 돌아가기"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <h2 id={titleId} className="truncate text-base font-semibold tracking-tight">
          {ownerName} 님의 수업자료
        </h2>
      </div>

      <div className="mt-4">
        {apps === null ? (
          <p className="text-sm text-muted-foreground">불러오는 중…</p>
        ) : apps.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            아직 작성한 수업자료가 없어요.
          </p>
        ) : (
          <ul className="-mx-2 max-h-80 space-y-1 overflow-y-auto">
            {apps.map((app) => (
              <li key={app.id}>
                <Link
                  to={`/app/${app.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent"
                >
                  <span className="relative aspect-video w-16 shrink-0 overflow-hidden rounded border border-border bg-surface">
                    <AppThumbnail app={app} iconClassName="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {app.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/**
 * 쪽지 작성 폼 (E-3). 자체 상태로 본문·전송 상태를 관리한다.
 * 발신은 lib/messages.sendMessage 가 담당(sender_id 는 RLS 가 강제 → 위조 불가).
 * 모달이 닫히면 언마운트되어 상태가 초기화된다.
 */
function SendMessageForm({
  recipientId,
  recipientName,
}: {
  recipientId: string
  recipientName: string
}) {
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (body.trim() === "" || sending) return
    setError(null)
    setSending(true)
    try {
      await sendMessage(recipientId, body)
      setSent(true)
      setBody("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "쪽지를 보내지 못했습니다.")
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="space-y-3">
        <p role="status" className="text-sm text-foreground">
          {recipientName} 님에게 쪽지를 보냈습니다.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          한 통 더 보내기
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label htmlFor="message-body" className="text-sm font-medium">
        쪽지 보내기
      </label>
      <textarea
        id="message-body"
        value={body}
        onChange={(e) => {
          setBody(e.target.value)
          if (error) setError(null)
        }}
        rows={3}
        maxLength={MESSAGE_MAX}
        placeholder={`${recipientName} 님에게 보낼 내용을 입력하세요.`}
        className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {body.length}/{MESSAGE_MAX}
        </span>
        <button
          type="submit"
          disabled={sending || body.trim() === ""}
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {sending ? "보내는 중…" : "보내기"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}

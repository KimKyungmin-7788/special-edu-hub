import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react"
import { Navigate, Link } from "react-router-dom"
import { useAuth } from "@/lib/auth"
import {
  getProfile,
  updateProfile,
  updateEmailPublic,
  uploadAvatar,
  type Profile,
  type ProfileEditable,
} from "@/lib/profile"
import { ProfileTrigger } from "@/components/profile/ProfileTrigger"
import { MyAppList } from "@/components/app/MyAppList"
import { SavedAppList } from "@/components/app/SavedAppList"
import { getMyBookmarkedApps, getMyLikedApps } from "@/lib/engagement"
import { InfoHint } from "@/components/ui/InfoHint"
import { MessageBox } from "@/components/messages/MessageBox"
import { getUnreadCount } from "@/lib/messages"

/**
 * 마이페이지 (/mypage) — 2단계 묶음 B.
 * 비로그인 시 /login 으로 보낸다(본인만 접근).
 * 프로필 편집: 아바타 이미지(B-3)·닉네임·한 줄 소개·홍보 링크.
 * "내 활동 모음"은 자리만(3단계에서 채움).
 */

const MAX_AVATAR_BYTES = 2 * 1024 * 1024 // 2MB — 05_avatars.sql 버킷 제한과 일치

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"

const labelClass = "text-sm font-medium"

/** 빈 문자열은 저장 시 null 로 — DB 에 빈 문자열 대신 비움으로 둔다. */
function emptyToNull(v: string): string | null {
  const t = v.trim()
  return t === "" ? null : t
}

type MyTab = "bookmarks" | "profile" | "activity" | "messages"

export function MyPage() {
  const { user, loading } = useAuth()

  // 상단 탭(즐겨찾기 · 내 프로필 · 내 활동 · 쪽지함). 즐겨찾기가 기본.
  const [tab, setTab] = useState<MyTab>("bookmarks")
  const [unread, setUnread] = useState(0)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // 폼 입력 상태
  const [nickname, setNickname] = useState("")
  const [emailPublic, setEmailPublic] = useState(false)
  const [blogUrl, setBlogUrl] = useState("")
  const [instagramUrl, setInstagramUrl] = useState("")
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // 아바타
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    let active = true
    setLoadingProfile(true)
    getProfile(user.id).then((p) => {
      if (!active) return
      if (p) {
        setProfile(p)
        setNickname(p.nickname ?? "")
        setEmailPublic(p.emailPublic)
        setBlogUrl(p.blogUrl ?? "")
        setInstagramUrl(p.instagramUrl ?? "")
        setYoutubeUrl(p.youtubeUrl ?? "")
        setWebsiteUrl(p.websiteUrl ?? "")
        setAvatarUrl(p.avatarUrl)
      }
      setLoadingProfile(false)
    })
    return () => {
      active = false
    }
  }, [user])

  // 쪽지함 탭 뱃지용 안 읽음 개수(첫 진입 시 1회). 쪽지함을 열면 MessageBox 가 최신값으로 갱신한다.
  useEffect(() => {
    if (!user) return
    let active = true
    getUnreadCount().then((n) => {
      if (active) setUnread(n)
    })
    return () => {
      active = false
    }
  }, [user])

  // 세션 확인 전에는 깜빡임 방지로 비움.
  if (loading) return null
  // 비로그인 → 로그인으로(돌아올 곳 기억).
  if (!user) return <Navigate to="/login" state={{ from: "/mypage" }} replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setError(null)
    setSaved(false)
    setSaving(true)
    const patch: ProfileEditable = {
      nickname: emptyToNull(nickname),
      blogUrl: emptyToNull(blogUrl),
      instagramUrl: emptyToNull(instagramUrl),
      youtubeUrl: emptyToNull(youtubeUrl),
      websiteUrl: emptyToNull(websiteUrl),
    }
    try {
      const updated = await updateProfile(user.id, patch)
      setProfile(updated)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // 같은 파일 재선택도 받도록 input 값 비우기
    e.target.value = ""
    if (!file || !user) return

    setAvatarError(null)
    if (!file.type.startsWith("image/")) {
      setAvatarError("이미지 파일만 업로드할 수 있습니다.")
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("이미지는 2MB 이하만 업로드할 수 있습니다.")
      return
    }

    setUploadingAvatar(true)
    try {
      const url = await uploadAvatar(user.id, file, avatarUrl)
      setAvatarUrl(url)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "업로드에 실패했습니다.")
    } finally {
      setUploadingAvatar(false)
    }
  }

  // 이메일 공개 토글 — 즉시 저장(낙관적 업데이트, 실패 시 롤백)
  async function handleEmailPublicToggle(next: boolean) {
    if (!user) return
    setEmailPublic(next)
    try {
      await updateEmailPublic(user.id, next)
    } catch {
      setEmailPublic(!next)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">마이페이지</h1>
        {/* 내 프로필이 남에게 어떻게 보이는지 미리보기 (묶음 C 트리거) */}
        <ProfileTrigger userId={user.id} className="text-sm text-muted-foreground">
          내 프로필 미리보기
        </ProfileTrigger>
      </div>

      {/* 상단 탭 — 마이페이지/쪽지함을 섹션 탭으로 분리(레이아웃만 참고, 색은 중립 토큰). */}
      <div
        role="tablist"
        aria-label="마이페이지 메뉴"
        className="mt-6 grid grid-cols-4 divide-x divide-border overflow-hidden rounded-lg border border-border"
      >
        <MyTabButton selected={tab === "bookmarks"} onClick={() => setTab("bookmarks")}>
          즐겨찾기
        </MyTabButton>
        <MyTabButton selected={tab === "profile"} onClick={() => setTab("profile")}>
          내 프로필
        </MyTabButton>
        <MyTabButton selected={tab === "activity"} onClick={() => setTab("activity")}>
          내 활동
        </MyTabButton>
        <MyTabButton selected={tab === "messages"} onClick={() => setTab("messages")}>
          쪽지함
          {unread > 0 && (
            <span
              className={
                "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium " +
                (tab === "messages"
                  ? "bg-primary-foreground text-primary"
                  : "bg-primary text-primary-foreground")
              }
            >
              {unread}
            </span>
          )}
        </MyTabButton>
      </div>

      {tab === "bookmarks" && (
        <section className="mt-6">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">즐겨찾기</h2>
          <SavedAppList
            load={getMyBookmarkedApps}
            emptyText="담아둔 자료가 아직 없어요. 자료 카드의 담기 버튼으로 저장하세요."
          />
        </section>
      )}

      {tab === "profile" && (
        <>
      {/* 계정 정보(읽기 전용) */}
      <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>{user.email}</span>
        {profile?.isTeacherVerified ? (
          <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium text-foreground">
            교사 인증됨
          </span>
        ) : (
          <span className="rounded-full border border-border px-2 py-0.5 text-xs">
            미인증
          </span>
        )}

        {/* 이메일 공개 토글 — 즉시 저장. 안내는 ? 팝업으로. */}
        <div className="ml-auto inline-flex items-center gap-1.5">
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={emailPublic}
              onChange={(e) => handleEmailPublicToggle(e.target.checked)}
              disabled={loadingProfile}
              className="size-4 accent-foreground"
            />
            <span className="text-foreground">이메일 공개</span>
          </label>
          <InfoHint label="이메일 공개 안내">
            체크하면 내 프로필 미리보기에 이메일({user.email})이 보입니다. 기본은
            비공개예요.
          </InfoHint>
        </div>
      </div>

      {/* 미인증 안내 — 교사인증 유도(준비 중인 /verify 로) */}
      {!loadingProfile && profile && !profile.isTeacherVerified && (
        <div className="mt-6 rounded-lg border border-border bg-surface p-4">
          <p className="text-sm font-medium text-foreground">
            교사 인증을 마치면 앱 등록·글쓰기 권한이 부여됩니다.
          </p>
          <Link
            to="/verify"
            className="mt-3 inline-block rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            교사인증센터 바로가기
          </Link>
        </div>
      )}

      {loadingProfile ? (
        <p className="mt-8 text-sm text-muted-foreground">불러오는 중…</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {/* 아바타 — 폼 저장과 별개로 즉시 업로드된다(B-3) */}
          <div className="flex items-center gap-4">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-xl font-medium text-muted-foreground">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="프로필 이미지"
                  className="size-full object-cover"
                />
              ) : (
                <span>{(nickname || user.email || "?").charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="space-y-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-60"
              >
                {uploadingAvatar ? "업로드 중…" : "사진 변경"}
              </button>
              <p className="text-xs text-muted-foreground">
                JPG·PNG·WebP·GIF, 2MB 이하
              </p>
              {avatarError && (
                <p role="alert" className="text-xs text-destructive">
                  {avatarError}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="nickname" className={labelClass}>
              닉네임
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className={inputClass}
            />
          </div>

          <fieldset className="space-y-3">
            <legend className={labelClass}>홍보 링크 (선택)</legend>
            <div className="space-y-1.5">
              <label htmlFor="blog" className="text-xs text-muted-foreground">
                블로그
              </label>
              <input
                id="blog"
                type="url"
                placeholder="https://…  (네이버·티스토리·브런치 등)"
                value={blogUrl}
                onChange={(e) => setBlogUrl(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="instagram" className="text-xs text-muted-foreground">
                인스타그램
              </label>
              <input
                id="instagram"
                type="url"
                placeholder="https://instagram.com/…"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="youtube" className="text-xs text-muted-foreground">
                유튜브
              </label>
              <input
                id="youtube"
                type="url"
                placeholder="https://youtube.com/@…"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="website" className="text-xs text-muted-foreground">
                개인 사이트
              </label>
              <input
                id="website"
                type="url"
                placeholder="https://…"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className={inputClass}
              />
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {saved && (
            <p role="status" className="text-sm text-muted-foreground">
              저장되었습니다.
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        </form>
      )}
        </>
      )}

      {tab === "activity" && (
        <div className="mt-6 space-y-10">
          <section>
            <h2 className="mb-2 text-lg font-semibold tracking-tight">
              내가 등록한 앱
            </h2>
            <MyAppList />
          </section>
          <section>
            <h2 className="mb-4 text-lg font-semibold tracking-tight">
              내가 좋아요한 앱
            </h2>
            <SavedAppList
              load={getMyLikedApps}
              emptyText="좋아요한 자료가 아직 없어요."
            />
          </section>
        </div>
      )}

      {/* 쪽지함(대화방) — 묶음 E-2 개편. 차단 목록은 MessageBox 안(목록 화면)에. */}
      {tab === "messages" && (
        <div className="mt-6">
          <MessageBox onUnreadChange={setUnread} />
        </div>
      )}
    </div>
  )
}

function MyTabButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={
        "flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm transition-colors " +
        (selected
          ? "bg-primary font-medium text-primary-foreground"
          : "bg-card text-muted-foreground hover:bg-accent")
      }
    >
      {children}
    </button>
  )
}

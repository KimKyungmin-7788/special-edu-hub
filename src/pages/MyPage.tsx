import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "@/lib/auth"
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  type Profile,
  type ProfileEditable,
} from "@/lib/profile"

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

export function MyPage() {
  const { user, loading } = useAuth()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // 폼 입력 상태
  const [nickname, setNickname] = useState("")
  const [bio, setBio] = useState("")
  const [blogUrl, setBlogUrl] = useState("")
  const [instagramUrl, setInstagramUrl] = useState("")
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
        setBio(p.bio ?? "")
        setBlogUrl(p.blogUrl ?? "")
        setInstagramUrl(p.instagramUrl ?? "")
        setWebsiteUrl(p.websiteUrl ?? "")
        setAvatarUrl(p.avatarUrl)
      }
      setLoadingProfile(false)
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
      bio: emptyToNull(bio),
      blogUrl: emptyToNull(blogUrl),
      instagramUrl: emptyToNull(instagramUrl),
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">마이페이지</h1>

      {/* 계정 정보(읽기 전용) */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
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
      </div>

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

          <div className="space-y-1.5">
            <label htmlFor="bio" className={labelClass}>
              한 줄 소개
            </label>
            <textarea
              id="bio"
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
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
                placeholder="https://blog.naver.com/…"
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

      {/* 내 활동 모음 — 자리만 (3단계에서 채움) */}
      <section className="mt-12 border-t border-border pt-8">
        <h2 className="text-lg font-semibold tracking-tight">내가 등록한 앱</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          앱 등록 기능은 준비 중입니다. 교사 인증 후 등록한 앱이 여기에 모입니다.
        </p>
      </section>
    </div>
  )
}

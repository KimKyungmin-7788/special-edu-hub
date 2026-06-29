import { useEffect, useState } from "react"
import { Link, useNavigate, useLocation, useParams } from "react-router-dom"
import {
  ArrowLeft,
  ExternalLink,
  Eye,
  Heart,
  Bookmark,
  Share2,
  Pencil,
  Trash2,
} from "lucide-react"
import { getCategory } from "@/config/categories"
import { AppThumbnail } from "@/components/app/AppThumbnail"
import { RichTextViewer } from "@/components/app/RichTextViewer"
import { CommentSection } from "@/components/comment/CommentSection"
import { ProfileTrigger } from "@/components/profile/ProfileTrigger"
import { PromoLinks } from "@/components/profile/PromoLinks"
import { getApp, setAppStatus, displayTitle, type App } from "@/lib/apps"
import { getProfile, type Profile } from "@/lib/profile"
import { useAuth } from "@/lib/auth"
import {
  toggleLike,
  toggleBookmark,
  getMyLikedIds,
  getMyBookmarkedIds,
  incrementView,
} from "@/lib/engagement"

/**
 * 앱 상세 — 제목·개발자·소개 본문·조회수·"앱 열기"(새 탭)·댓글(CommentSection).
 * 좋아요/담기/공유는 모양만(준비 중) — 동작 없음(CLAUDE.md 규칙 4).
 * 앱 실행은 iframe 금지, 새 탭 링크(target="_blank" rel="noopener").
 */
export function AppDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAdmin } = useAuth()
  const [app, setApp] = useState<App | undefined>()
  const [owner, setOwner] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  // 좋아요·담기 상태/카운트(로컬). app 로드 시 초기화.
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [bookmarkCount, setBookmarkCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // "목록으로" — 직전 페이지로. 직접 진입(앱 내 이력 없음)이면 인기로.
  function goBack() {
    if (location.key !== "default") navigate(-1)
    else navigate("/apps/subject")
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    setOwner(null)
    getApp(id ?? "").then((data) => {
      if (!active) return
      setApp(data)
      setLoading(false)
      // 등록자(owner) 프로필 — 홍보 링크·프로필 모달용. 시드앱은 owner 없음.
      if (data?.ownerId) {
        getProfile(data.ownerId).then((p) => {
          if (active) setOwner(p ?? null)
        })
      }
    })
    return () => {
      active = false
    }
  }, [id])

  // 좋아요·담기 카운트/내 상태 초기화 + 조회수 누적(앱 바뀔 때).
  useEffect(() => {
    if (!app) return
    setLikeCount(app.likeCount)
    setBookmarkCount(app.bookmarkCount)
    setLiked(false)
    setBookmarked(false)
    incrementView(app.id)
    let active = true
    Promise.all([getMyLikedIds(), getMyBookmarkedIds()]).then(([likes, bms]) => {
      if (!active) return
      setLiked(likes.has(app.id))
      setBookmarked(bms.has(app.id))
    })
    return () => {
      active = false
    }
  }, [app?.id])

  // 좋아요/담기 토글 — 낙관적 반영 후 실패 시 원복. 비로그인은 로그인으로.
  async function handleToggleLike() {
    if (!app || busy) return
    if (!user) return navigate("/login")
    const next = !liked
    setLiked(next)
    setLikeCount((c) => c + (next ? 1 : -1))
    setBusy(true)
    try {
      await toggleLike(app.id)
    } catch {
      setLiked(!next)
      setLikeCount((c) => c + (next ? -1 : 1))
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleBookmark() {
    if (!app || busy) return
    if (!user) return navigate("/login")
    const next = !bookmarked
    setBookmarked(next)
    setBookmarkCount((c) => c + (next ? 1 : -1))
    setBusy(true)
    try {
      await toggleBookmark(app.id)
    } catch {
      setBookmarked(!next)
      setBookmarkCount((c) => c + (next ? -1 : 1))
    } finally {
      setBusy(false)
    }
  }

  // 삭제 = 숨김(복구 가능) — 이 프로젝트는 하드 삭제 대신 status='hidden'.
  async function handleDelete() {
    if (!app || deleting) return
    if (
      !window.confirm(
        "이 자료를 삭제할까요?\n목록에서 숨겨지며, 마이페이지 '내 활동'에서 다시 공개할 수 있어요.",
      )
    )
      return
    setDeleteError(null)
    setDeleting(true)
    try {
      await setAppStatus(app.id, "hidden")
      navigate("/mypage")
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "삭제에 실패했습니다.")
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <p className="text-sm text-muted-foreground">불러오는 중…</p>
      </div>
    )
  }

  if (!app) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          앱을 찾을 수 없습니다
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          요청한 앱(id: {id ?? "?"})이 존재하지 않습니다.
        </p>
        <Link
          to="/apps/subject"
          className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          인기 목록으로
        </Link>
      </div>
    )
  }

  const tags = app.categoryIds
    .map((cid) => getCategory(cid)?.name)
    .filter(Boolean) as string[]

  // 작성자 본인 또는 관리자만 수정 진입(최종 강제는 RLS).
  const canEdit = !!user && (app.ownerId === user.id || isAdmin)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <button
        type="button"
        onClick={goBack}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        목록으로
      </button>

      {/* 헤더: 제목 · 개발자 · 조회수 · 태그 */}
      <div className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight">{displayTitle(app)}</h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {app.ownerId ? (
            // 등록자 연결: 아바타+이름 클릭 → 프로필 미리보기 모달
            <ProfileTrigger
              userId={app.ownerId}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <AuthorAvatar
                name={app.authorName || owner?.nickname || "개발자"}
                avatarUrl={owner?.avatarUrl ?? null}
              />
              {app.authorName || owner?.nickname || "개발자"}
            </ProfileTrigger>
          ) : (
            // 시드앱 등 owner 없는 경우는 아바타(이니셜)+텍스트만(의도된 동작)
            <span className="inline-flex items-center gap-1.5">
              <AuthorAvatar name={app.authorName} avatarUrl={null} />
              {app.authorName}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Eye className="size-4" aria-hidden />
            조회 {app.viewCount}
          </span>
        </div>

        {/* 개발자 홍보 링크 — 등록자가 입력한 것만(블로그·인스타·유튜브·사이트) */}
        {owner && <PromoLinks profile={owner} className="mt-3" />}

        {tags.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1">
            {tags.map((t) => (
              <li
                key={t}
                className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
              >
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 썸네일 */}
      <div className="relative mt-6 aspect-video overflow-hidden rounded-lg border bg-surface">
        <AppThumbnail app={app} />
      </div>

      {/* 액션: 앱 열기(작동) + 담기·공유(모양만) */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <a
          href={app.appUrl}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <ExternalLink className="size-4" aria-hidden />앱 열기
        </a>

        {/* 수정 — 작성자 본인·관리자만 */}
        {canEdit && (
          <Link
            to={`/edit/${app.id}`}
            replace
            className="inline-flex items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <Pencil className="size-4" aria-hidden />
            수정
          </Link>
        )}

        {/* 좋아요 — 토글(로그인 필요) */}
        <button
          type="button"
          onClick={handleToggleLike}
          disabled={busy}
          aria-pressed={liked}
          title={user ? "좋아요" : "로그인이 필요합니다"}
          className={
            "inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm transition-colors disabled:opacity-60 " +
            (liked
              ? "border-foreground/30 bg-accent text-foreground"
              : "bg-card text-muted-foreground hover:bg-accent")
          }
        >
          <Heart className={"size-4" + (liked ? " fill-current" : "")} aria-hidden />
          {likeCount}
        </button>

        {/* 담기(북마크) — 토글(로그인 필요) */}
        <button
          type="button"
          onClick={handleToggleBookmark}
          disabled={busy}
          aria-pressed={bookmarked}
          title={user ? "담기" : "로그인이 필요합니다"}
          className={
            "inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm transition-colors disabled:opacity-60 " +
            (bookmarked
              ? "border-foreground/30 bg-accent text-foreground"
              : "bg-card text-muted-foreground hover:bg-accent")
          }
        >
          <Bookmark
            className={"size-4" + (bookmarked ? " fill-current" : "")}
            aria-hidden
          />
          {bookmarkCount}
        </button>

        {/* 공유 — 모양만, 비작동(준비 중) */}
        <button
          type="button"
          disabled
          title="준비 중"
          className="inline-flex cursor-not-allowed items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm text-muted-foreground"
        >
          <Share2 className="size-4" aria-hidden />
          공유
        </button>
      </div>

      {/* 개발자 소개 글(블로그형) — HTML 정화 후 렌더 */}
      <section className="mt-8 border-t pt-8">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground">
          이런 학습자료에요.
        </h2>
        {app.description.trim() ? (
          <div className="mt-3">
            <RichTextViewer html={app.description} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            소개 내용이 없습니다.
          </p>
        )}
      </section>

      {/* 작성자(또는 관리자) 전용 — 글 하단 수정·삭제 */}
      {canEdit && (
        <div className="mt-8 border-t pt-6">
          <div className="flex items-center justify-end gap-2">
            <Link
              to={`/edit/${app.id}`}
              replace
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              <Pencil className="size-4" aria-hidden />
              수정
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 bg-card px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"
            >
              <Trash2 className="size-4" aria-hidden />
              {deleting ? "삭제 중…" : "삭제"}
            </button>
          </div>
          {deleteError && (
            <p role="alert" className="mt-2 text-right text-sm text-destructive">
              {deleteError}
            </p>
          )}
        </div>
      )}

      {/* 댓글 (PRD 4단계) */}
      <CommentSection appId={app.id} />
    </div>
  )
}

/** 작성자 원형 아바타 — 이미지 있으면 사진, 없으면 이름 이니셜. */
function AuthorAvatar({
  name,
  avatarUrl,
}: {
  name: string
  avatarUrl: string | null
}) {
  const initial = (name || "?").charAt(0).toUpperCase()
  return (
    <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-[10px] font-medium text-muted-foreground">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="size-full object-cover" />
      ) : (
        initial
      )}
    </span>
  )
}

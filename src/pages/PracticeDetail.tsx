import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Check,
  Download,
  ExternalLink,
  EyeOff,
  FileText,
  Link2,
  Lock,
  Pencil,
  Share2,
} from "lucide-react"
import { getCategory } from "@/config/categories"
import { useAuth } from "@/lib/auth"
import { getAppsByIds, type App } from "@/lib/apps"
import {
  getPractice,
  getPracticeApps,
  setPracticeStatus,
  errorText,
  stripEmptySections,
  type Practice,
  type PracticeAppLink,
} from "@/lib/practices"
import { RichTextViewer } from "@/components/app/RichTextViewer"
import { AppCard } from "@/components/app/AppCard"
import { ProfileTrigger } from "@/components/profile/ProfileTrigger"
import { formatBytes } from "@/components/practice/FileListField"
import { OwnerAvatar, PracticeCover, formatDate } from "@/components/practice/PracticeCard"

/**
 * /practices/:id — 수업실천사례 상세 (PRD §13, 묶음 P-3).
 * 머리(교과·대상·차시·작성자) → 대표 사진 → 본문 → 이 수업에서 쓴 자료(앱 카드) → 첨부 파일·링크.
 * 교사 전용인데 권한 없으면 본문·자료·첨부 대신 잠금 안내.
 * 좋아요·담기·댓글·조회수는 P-5.
 */
export function PracticeDetail() {
  const { id = "" } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isStaff } = useAuth()
  const [practice, setPractice] = useState<Practice | null | undefined>()
  const [links, setLinks] = useState<PracticeAppLink[]>([])
  const [apps, setApps] = useState<App[]>([])
  const [copied, setCopied] = useState(false)
  const [hiding, setHiding] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setPractice(undefined)
    getPractice(id).then((p) => {
      if (!active) return
      setPractice(p)
      if (p && !p.locked) {
        getPracticeApps(p.id).then(async (l) => {
          const a = await getAppsByIds(l.map((x) => x.appId))
          if (!active) return
          setLinks(l)
          setApps(a)
        })
      }
    })
    return () => {
      active = false
    }
  }, [id])

  function goBack() {
    if (location.key !== "default") navigate(-1)
    else navigate("/practices")
  }

  async function share() {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: practice?.title, url })
      } catch {
        // 취소 등 — 무시
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 클립보드 불가 — 무시
    }
  }

  async function toggleHidden() {
    if (!practice || hiding) return
    const hide = practice.status === "published"
    if (
      hide &&
      !window.confirm("이 사례를 숨길까요?\n목록에서 사라지며, 이 화면에서 다시 공개할 수 있어요.")
    )
      return
    setActionError(null)
    setHiding(true)
    try {
      await setPracticeStatus(practice.id, hide ? "hidden" : "published")
      setPractice({ ...practice, status: hide ? "hidden" : "published" })
    } catch (e) {
      setActionError(errorText(e, "처리하지 못했습니다."))
    } finally {
      setHiding(false)
    }
  }

  if (practice === undefined)
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <p className="text-sm text-muted-foreground">불러오는 중…</p>
      </div>
    )

  if (practice === null)
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">사례를 찾을 수 없습니다</h1>
        <p className="mt-3 text-sm text-muted-foreground">숨겨졌거나 없는 사례입니다.</p>
        <Link
          to="/practices"
          className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          수업실천사례 목록으로
        </Link>
      </div>
    )

  const canEdit = !!user && (practice.ownerId === user.id || isStaff)
  const subjects = practice.categoryIds
    .map((cid) => getCategory(cid))
    .filter((c) => !!c)
  const name = practice.ownerNickname ?? "선생님"
  const noteById = new Map(links.map((l) => [l.appId, l.note]))
  const body = stripEmptySections(practice.body) // 예전 글의 빈 소제목도 숨김

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

      {practice.status === "hidden" && (
        <p className="mt-4 rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted-foreground">
          숨긴 사례입니다. 작성자와 운영진에게만 보여요.
        </p>
      )}

      {/* 머리 */}
      <header className="mt-6">
        <ul className="flex flex-wrap gap-1">
          {practice.visibility === "teachers" && (
            <li className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs">
              <Lock className="size-3" aria-hidden />
              교사 전용
            </li>
          )}
          {subjects.map((c) => (
            <li
              key={c.id}
              className={
                c.parentId
                  ? "rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                  : "rounded-md bg-brand-muted px-2 py-0.5 text-xs font-semibold text-brand-muted-foreground"
              }
            >
              {c.name}
            </li>
          ))}
        </ul>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{practice.title}</h1>
        <p className="mt-2 text-base text-muted-foreground">{practice.summary}</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <ProfileTrigger
            userId={practice.ownerId}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <OwnerAvatar name={name} url={practice.ownerAvatarUrl} size="size-6" />
            {name}
          </ProfileTrigger>
          <span className="tabular-nums">{formatDate(practice.createdAt)}</span>
          {practice.target && <span>대상 {practice.target}</span>}
          {practice.lessonCount != null && <span>{practice.lessonCount}차시</span>}
        </div>
      </header>

      <div className="relative mt-6 aspect-video overflow-hidden rounded-lg border bg-surface">
        <PracticeCover practice={practice} />
      </div>

      {/* 동작 */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={share}
          className="inline-flex items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {copied ? <Check className="size-4" aria-hidden /> : <Share2 className="size-4" aria-hidden />}
          {copied ? "링크 복사됨" : "공유"}
        </button>
        {canEdit && (
          <>
            <Link
              to={`/practices/${practice.id}/edit`}
              className="inline-flex items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              <Pencil className="size-4" aria-hidden />
              수정
            </Link>
            <button
              type="button"
              onClick={toggleHidden}
              disabled={hiding}
              className="inline-flex items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-60"
            >
              <EyeOff className="size-4" aria-hidden />
              {practice.status === "published" ? "숨기기" : "다시 공개"}
            </button>
          </>
        )}
      </div>
      {actionError && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {actionError}
        </p>
      )}

      {practice.locked ? (
        <LockedNotice loggedIn={!!user} from={location.pathname} />
      ) : (
        <>
          <section className="mt-8 border-t pt-8">
            {body ? (
              <RichTextViewer html={body} />
            ) : (
              <p className="text-sm text-muted-foreground">본문이 없습니다.</p>
            )}
          </section>

          {apps.length > 0 && (
            <section className="mt-10 border-t pt-8">
              <h2 className="text-lg font-semibold tracking-tight">이 수업에서 쓴 학습자료</h2>
              <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {apps.map((a) => (
                  <li key={a.id} className="flex flex-col gap-2">
                    <AppCard app={a} />
                    {noteById.get(a.id) && (
                      <p className="px-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">이렇게 썼어요</span>{" "}
                        {noteById.get(a.id)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(practice.files.length > 0 || practice.links.length > 0) && (
            <section className="mt-10 border-t pt-8">
              <h2 className="text-lg font-semibold tracking-tight">첨부</h2>
              <ul className="mt-4 flex flex-col divide-y divide-border rounded-lg border border-border">
                {practice.files.map((f) => (
                  <li key={f.path}>
                    <a
                      href={`${f.url}?download=${encodeURIComponent(f.name.normalize("NFC"))}`}
                      rel="noopener"
                      className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent/60"
                    >
                      <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{f.name}</span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {formatBytes(f.size)}
                      </span>
                      <Download className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </a>
                  </li>
                ))}
                {practice.links.map((l, i) => (
                  <li key={`${l.url}-${i}`}>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener"
                      className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent/60"
                    >
                      <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">
                        {l.title || l.url}
                        {l.title && (
                          <span className="ml-2 text-xs text-muted-foreground">{hostOf(l.url)}</span>
                        )}
                      </span>
                      <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

function LockedNotice({ loggedIn, from }: { loggedIn: boolean; from: string }) {
  return (
    <section className="mt-8 border-t pt-8">
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface px-6 py-10 text-center">
        <Lock className="size-6 text-muted-foreground" aria-hidden />
        <p className="text-base font-semibold">인증교사만 열람할 수 있는 사례입니다</p>
        <p className="text-sm text-muted-foreground">
          {loggedIn
            ? "교사인증을 받으면 본문·학습자료·첨부파일을 볼 수 있어요."
            : "로그인 후 교사인증을 받으면 본문·학습자료·첨부파일을 볼 수 있어요."}
        </p>
        <Link
          to={loggedIn ? "/verify" : "/login"}
          state={loggedIn ? undefined : { from }}
          className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {loggedIn ? "교사인증센터로 가기" : "로그인하기"}
        </Link>
      </div>
    </section>
  )
}

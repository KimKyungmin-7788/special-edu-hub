import { useEffect, useState } from "react"
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { ArrowLeft, ExternalLink, Eye, Heart, List, Pin, Share2 } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { usePageTitle } from "@/lib/usePageTitle"
import { boardError, boardListPath, boardPostPath, deleteBoardPost, getBoardPost, incrementPostView, isPostLiked, setPostLike, pinBoardPost, reportBoardPost, TRAINING_LINK_KINDS, type BoardPost, type TrainingLink, boardName } from "@/lib/board"
import { BoardNotice } from "@/components/board/BoardNotice"
import { BoardAccessNotice } from "@/components/board/BoardAccessNotice"
import { BoardShareDialog } from "@/components/board/BoardShareDialog"
import { RichTextViewer } from "@/components/app/RichTextViewer"
import { resolveResearchImages } from "@/lib/researchImages"
import { ProfileTrigger } from "@/components/profile/ProfileTrigger"
import { CommentSection } from "@/components/comment/CommentSection"
import { TrainingVideo } from "@/components/training/TrainingVideo"
import { youtubeVideoId } from "@/lib/trainingVideo"
import { training as trainingConfig } from "@/config/training"
import { ReportDialog } from "@/components/report/ReportDialog"

export function BoardDetail() {
  const { id = "" } = useParams()
  // 다른 글로 바로 이동할 때 이전 글의 상태와 댓글을 남기지 않는다.
  return <BoardDetailContent key={id} id={id} />
}
function BoardDetailContent({ id }: { id: string }) {
  const { user, profile, isStaff, loading: authLoading } = useAuth()
  const [params] = useSearchParams()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const [post, setPost] = useState<BoardPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState(false)
  const [retry, setRetry] = useState(0)
  const [sharing, setSharing] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeBusy, setLikeBusy] = useState(false)
  const slug = post?.boards.slug ?? "free"
  const canWrite = slug === "research" ? !!profile?.isResearchMember : !!profile?.isTeacherVerified
  const canRead = slug !== "research" || !!profile?.isResearchMember
  usePageTitle(canRead ? post?.title ?? "게시판" : "게시판")
  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError("")
    // 연구회 사진은 글을 그리기 전에 임시 주소를 채운다(그린 뒤에 채우면 화면이 사진을 놓칠 수 있다).
    getBoardPost(id).then(async (p) => p?.boards.slug === "research" ? { ...p, body: await resolveResearchImages(p.body) } : p)
      .then((p) => { if (active) setPost(p) })
      .catch((e) => { if (active) setLoadError(boardError(e)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, user?.id, profile?.isResearchMember, retry])
  // 읽을 수 있는 글을 열면 조회수 +1(같은 글은 하루 1회), 내 좋아요 여부를 불러온다.
  const readable = !!post && canRead
  useEffect(() => {
    if (!readable) return
    let active = true
    void incrementPostView(id)
    isPostLiked(id).then((v) => { if (active) setLiked(v) })
    return () => { active = false }
  }, [readable, id, user?.id])
  async function toggleLike() {
    if (!post || likeBusy) return
    if (!user) { navigate("/login", { state: { from: `/board/${id}` } }); return }
    const on = !liked
    setLikeBusy(true); setError("")
    setLiked(on); setPost({ ...post, like_count: Math.max(0, post.like_count + (on ? 1 : -1)) })
    try { await setPostLike(id, on) }
    catch (e) { setLiked(!on); setPost(post); setError(boardError(e)) }
    finally { setLikeBusy(false) }
  }
  async function remove() {
    if (busy || !window.confirm("이 게시글을 삭제할까요? 삭제한 글은 목록에서 사라집니다.")) return
    setBusy(true); setError("")
    try { await deleteBoardPost(id); navigate(boardListPath(slug), { replace: true }) }
    catch (e) { setError(boardError(e)) }
    finally { setBusy(false) }
  }
  async function togglePin() {
    if (!post || busy) return
    setBusy(true); setError("")
    try { await pinBoardPost(id, !post.pinned); setPost({ ...post, pinned: !post.pinned }) }
    catch (e) { setError(boardError(e)) }
    finally { setBusy(false) }
  }
  // 함께 여는 연수 글은 열린연수방 안에서 보여 준다(알림·옛 공유 주소 /board/:id 로 와도 옮겨 감). 반대 방향도 같다
  if (post && pathname !== boardPostPath(slug, id)) return <Navigate to={boardPostPath(slug, id) + search} replace />
  const training = slug === "training"
  const listPath = training ? `${trainingConfig.basePath}?stage=${post?.training_stage ?? "all"}` : boardListPath(slug)
  return <div className={training ? "rounded-xl border bg-card p-5 shadow-sm sm:p-7" : "mx-auto max-w-3xl px-4 py-10"}>
    <Link to={listPath} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" aria-hidden />{boardName(slug)}</Link>
    {loading || authLoading ? <p role="status" className="py-16 text-center text-sm text-muted-foreground">게시글을 불러오는 중…</p>
      : loadError ? <div role="alert"><BoardNotice title={loadError} /><button onClick={() => setRetry((n) => n + 1)} className="mt-3 text-sm text-primary underline">다시 시도</button></div>
      : !post || !canRead ? <BoardAccessNotice research={post?.boards.slug === "research" || params.get("board") === "research"} />
      : <>
        <article>
          {post.pinned && <span className="mb-3 inline-flex items-center gap-1 rounded bg-brand-muted px-2 py-1 text-xs text-brand-muted-foreground"><Pin className="size-3" aria-hidden />상단 고정</span>}
          <h1 className="break-words text-2xl font-bold">{post.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 border-b pb-6 text-sm text-muted-foreground"><ProfileTrigger userId={post.author_id} className="font-medium text-foreground">{post.author?.nickname || "사용자"}</ProfileTrigger><time dateTime={post.created_at}>{new Date(post.created_at).toLocaleString("ko-KR")}</time>{post.updated_at !== post.created_at && <span>(수정됨)</span>}<span className="inline-flex items-center gap-1"><Eye className="size-4" aria-hidden />조회 {post.view_count.toLocaleString()}</span></div>
          {training && !!post.links?.length && <TrainingLinks links={post.links} />}
          <div className={training ? "max-w-3xl py-8" : "py-8"}><RichTextViewer html={post.body} /></div>
          <div className="flex justify-center pb-8">
            <button type="button" onClick={() => void toggleLike()} disabled={likeBusy} aria-pressed={liked} title={user ? undefined : "로그인하면 좋아요를 누를 수 있어요"}
              className={"inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 " + (liked ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent")}>
              <Heart className={"size-4" + (liked ? " fill-current" : "")} aria-hidden />좋아요 {post.like_count.toLocaleString()}
            </button>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t pt-4 text-sm">
            <div className="mr-auto flex gap-2">
              <Link to={listPath} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 hover:bg-accent"><List className="size-4" aria-hidden />목록</Link>
              <button type="button" onClick={() => setSharing(true)} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 hover:bg-accent"><Share2 className="size-4" aria-hidden />공유</button>
            </div>
            {isStaff && <button disabled={busy} onClick={togglePin} className="rounded-md border px-3 py-2 hover:bg-accent disabled:opacity-50">{post.pinned ? "고정 해제" : "상단 고정"}</button>}
            {user?.id === post.author_id && canWrite && <Link to={`${boardPostPath(slug, id)}/edit`} className="rounded-md border px-3 py-2 hover:bg-accent">수정</Link>}
            {(user?.id === post.author_id || isStaff) && <button disabled={busy} onClick={remove} className="rounded-md border px-3 py-2 text-destructive hover:bg-accent disabled:opacity-50">{busy ? "처리 중…" : "삭제"}</button>}
            {user && user.id !== post.author_id && <button onClick={() => setReport(true)} className="rounded-md px-3 py-2 text-muted-foreground hover:bg-accent">신고</button>}
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        </article>
        <CommentSection target={{ kind: "post", id }} boardCanWrite={canWrite} />
        <BoardShareDialog open={sharing} onClose={() => setSharing(false)} id={id} title={post.title} slug={slug} />
        <ReportDialog open={report} onClose={() => setReport(false)} targetLabel="게시글" onSubmit={(reason, detail) => reportBoardPost(id, reason, detail)} />
      </>}
  </div>
}

/** 첫 슬라이드·영상을 시작 버튼으로 안내하고, 나머지 자료와 영상 재생은 유지한다. */
function TrainingLinks({ links }: { links: TrainingLink[] }) {
  const primaryIndex = Math.max(0, links.findIndex((link) => link.kind === "slides" || link.kind === "video"))
  const primary = links[primaryIndex]
  const primaryKind = TRAINING_LINK_KINDS.find((kind) => kind.kind === primary.kind)?.label ?? "링크"
  const primaryVideoId = primary.kind === "video" ? youtubeVideoId(primary.url) : null
  const startLabel = primary.kind === "slides" || primary.kind === "video" ? "연수 시작하기" : "연수 자료 열기"
  return <section aria-label="연수 시작 안내" className="mt-6 rounded-xl border border-brand-line bg-brand-soft p-5 sm:p-6">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-xl font-bold text-brand-muted-foreground">여기서 연수를 시작하세요</h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground">‘{startLabel}’ 버튼을 누르면 연수 자료가 새 탭에서 열립니다.</p>
        <p className="mt-3 text-sm text-muted-foreground">{primaryKind}{primary.label && <> · {primary.label}</>}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:min-w-48">
        <a href={primary.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-lg bg-cta px-6 py-4 text-lg font-bold text-cta-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{startLabel}</a>
        <span className="text-center text-xs text-muted-foreground">새 탭에서 열립니다</span>
      </div>
    </div>
    {primaryVideoId && <TrainingVideo videoId={primaryVideoId} title={primary.label || "연수 영상"} />}
    {links.length > 1 && <div className="mt-6 border-t border-brand-line pt-4">
      <h3 className="text-sm font-semibold text-brand-muted-foreground">함께 볼 연수 자료</h3>
      <ul className="mt-2 space-y-2">
        {links.map((l, i) => {
          if (i === primaryIndex) return null
          const kind = TRAINING_LINK_KINDS.find((k) => k.kind === l.kind)?.label ?? "링크"
          const videoId = l.kind === "video" ? youtubeVideoId(l.url) : null
          return <li key={`${i}:${l.url}`}><a href={l.url} target="_blank" rel="noopener noreferrer" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-3 py-3 hover:border-primary">
            <span className="min-w-0 break-keep"><span className="font-semibold">{l.label || kind}</span>{l.label && <span className="ml-2 text-xs text-muted-foreground">{kind}</span>}</span>
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">새 탭에서 열기<ExternalLink className="size-3.5" aria-hidden /></span>
          </a>{videoId && <TrainingVideo videoId={videoId} title={l.label || "연수 영상"} />}</li>
        })}
      </ul>
    </div>}
  </section>
}

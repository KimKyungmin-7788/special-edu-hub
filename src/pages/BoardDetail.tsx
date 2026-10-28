import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Check, Pin, Share2 } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { usePageTitle } from "@/lib/usePageTitle"
import { boardError, deleteBoardPost, getBoardPost, pinBoardPost, reportBoardPost, type BoardPost, boardName } from "@/lib/board"
import { BoardNotice } from "@/components/board/BoardNotice"
import { RichTextViewer } from "@/components/app/RichTextViewer"
import { ProfileTrigger } from "@/components/profile/ProfileTrigger"
import { CommentSection } from "@/components/comment/CommentSection"
import { ReportDialog } from "@/components/report/ReportDialog"

export function BoardDetail() {
  const { id = "" } = useParams()
  // 다른 글로 바로 이동할 때 이전 글의 상태와 댓글을 남기지 않는다.
  return <BoardDetailContent key={id} id={id} />
}
function BoardDetailContent({ id }: { id: string }) {
  const { user, profile, isStaff } = useAuth()
  const navigate = useNavigate()
  const [post, setPost] = useState<BoardPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState(false)
  const [retry, setRetry] = useState(0)
  const [copied, setCopied] = useState(false)
  const slug = post?.boards.slug ?? "free"
  const canWrite = slug === "research" ? !!profile?.isResearchMember : !!profile?.isTeacherVerified
  const canRead = slug !== "research" || !!profile?.isResearchMember
  usePageTitle(canRead ? post?.title ?? "게시판" : "게시판")
  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError("")
    getBoardPost(id).then((p) => { if (active) setPost(p) })
      .catch((e) => { if (active) setLoadError(boardError(e)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, user?.id, profile?.isResearchMember, retry])
  async function remove() {
    if (busy || !window.confirm("이 게시글을 삭제할까요? 삭제한 글은 목록에서 사라집니다.")) return
    setBusy(true); setError("")
    try { await deleteBoardPost(id); navigate(`/board/${slug}`, { replace: true }) }
    catch (e) { setError(boardError(e)) }
    finally { setBusy(false) }
  }
  // 수업실천사례와 같은 방식: 휴대폰은 공유 시트, 그 밖에는 주소 복사.
  // 연구회 글은 제목도 비공개라 공유 시트(다른 앱으로 제목 전달) 없이 주소만 복사한다.
  async function share() {
    const url = `${window.location.origin}/board/${id}`
    setError("")
    if (slug !== "research" && navigator.share) {
      try { await navigator.share({ title: post?.title, url }) } catch { /* 취소 등 — 무시 */ }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch { setError("주소를 복사하지 못했습니다. 주소창의 주소를 직접 복사해 주세요.") }
  }
  async function togglePin() {
    if (!post || busy) return
    setBusy(true); setError("")
    try { await pinBoardPost(id, !post.pinned); setPost({ ...post, pinned: !post.pinned }) }
    catch (e) { setError(boardError(e)) }
    finally { setBusy(false) }
  }
  return <div className="mx-auto max-w-3xl px-4 py-10">
    <Link to={`/board/${slug}`} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" aria-hidden />{boardName(slug)}</Link>
    {loading ? <p role="status" className="py-16 text-center text-sm text-muted-foreground">게시글을 불러오는 중…</p>
      : loadError ? <div role="alert"><BoardNotice title={loadError} /><button onClick={() => setRetry((n) => n + 1)} className="mt-3 text-sm text-primary underline">다시 시도</button></div>
      : !post || !canRead ? <BoardNotice title="게시글을 찾을 수 없습니다" body="삭제되었거나 표시할 수 없는 글입니다." />
      : <>
        <article>
          {post.pinned && <span className="mb-3 inline-flex items-center gap-1 rounded bg-brand-muted px-2 py-1 text-xs text-brand-muted-foreground"><Pin className="size-3" aria-hidden />상단 고정</span>}
          <h1 className="break-words text-2xl font-bold">{post.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 border-b pb-6 text-sm text-muted-foreground"><ProfileTrigger userId={post.author_id} className="font-medium text-foreground">{post.author?.nickname || "사용자"}</ProfileTrigger><time dateTime={post.created_at}>{new Date(post.created_at).toLocaleString("ko-KR")}</time>{post.updated_at !== post.created_at && <span>(수정됨)</span>}</div>
          <div className="py-8"><RichTextViewer html={post.body} /></div>
          <div className="flex flex-wrap justify-end gap-2 border-t pt-4 text-sm">
            <button type="button" onClick={() => void share()} className="mr-auto inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground">
              {copied ? <Check className="size-4" aria-hidden /> : <Share2 className="size-4" aria-hidden />}
              {copied ? (slug === "research" ? "링크 복사됨 · 연구회원만 열 수 있어요" : "링크 복사됨") : "공유"}
            </button>
            {isStaff && <button disabled={busy} onClick={togglePin} className="rounded-md border px-3 py-2 hover:bg-accent disabled:opacity-50">{post.pinned ? "고정 해제" : "상단 고정"}</button>}
            {user?.id === post.author_id && canWrite && <Link to={`/board/${id}/edit`} className="rounded-md border px-3 py-2 hover:bg-accent">수정</Link>}
            {(user?.id === post.author_id || isStaff) && <button disabled={busy} onClick={remove} className="rounded-md border px-3 py-2 text-destructive hover:bg-accent disabled:opacity-50">{busy ? "처리 중…" : "삭제"}</button>}
            {user && user.id !== post.author_id && <button onClick={() => setReport(true)} className="rounded-md px-3 py-2 text-muted-foreground hover:bg-accent">신고</button>}
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        </article>
        <CommentSection target={{ kind: "post", id }} boardCanWrite={canWrite} />
        <ReportDialog open={report} onClose={() => setReport(false)} targetLabel="게시글" onSubmit={(reason, detail) => reportBoardPost(id, reason, detail)} />
      </>}
  </div>
}

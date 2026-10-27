import { useEffect, useRef, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useAuth } from "@/lib/auth"
import { usePageTitle } from "@/lib/usePageTitle"
import { boardError, getBoardPost, POST_TITLE_MAX, saveBoardPost, type BoardPost, type BoardSlug, boardName } from "@/lib/board"
import { BoardNotice } from "@/components/board/BoardNotice"
import { RichTextEditor } from "@/components/app/RichTextEditor"

export function BoardWritePage({ slug = "free" }: { slug?: BoardSlug }) {
  const { id } = useParams()
  const { user, profile, loading } = useAuth()
  usePageTitle(id ? "게시글 수정" : `${boardName(slug)} 글쓰기`)
  return <div className="mx-auto max-w-3xl px-4 py-10">
    <Link to={id ? `/board/${id}` : `/board/${slug}`} className="text-sm text-muted-foreground hover:text-primary">← {id ? "게시글로" : "목록으로"}</Link>
    <h1 className="mb-2 mt-6 text-2xl font-bold">{id ? "게시글 수정" : "이야기 나누기"}</h1>
    <p className="mb-8 text-sm text-muted-foreground">서로의 경험을 존중하며 편하게 나눠 주세요. 학생을 식별할 수 있는 정보는 담지 말아 주세요.</p>
    {loading ? <p role="status">로그인 상태를 확인하고 있어요…</p>
      : !user ? <BoardNotice title="로그인이 필요합니다" body="로그인 후 작성 권한을 확인할 수 있어요." to="/login" label="로그인하기" />
      : !profile ? <p role="status">교사인증 상태를 확인하고 있어요…</p>
      : !id && slug === "research" && !profile.isResearchMember ? <BoardNotice title="접근 권한이 없습니다" />
      : !id && slug === "free" && !profile.isTeacherVerified ? <BoardNotice title="교사인증이 필요합니다" body="인증을 마치면 글과 댓글을 남길 수 있어요." to="/verify" label="교사인증하기" />
      : <LoadForm key={`${slug}:${user.id}:${id ?? "new"}`} id={id} userId={user.id} slug={slug} />}
  </div>
}
function LoadForm({ id, userId, slug }: { id?: string; userId: string; slug: BoardSlug }) {
  const { profile } = useAuth()
  const [post, setPost] = useState<BoardPost | null>(null)
  const [loading, setLoading] = useState(!!id)
  const [error, setError] = useState("")
  useEffect(() => {
    if (!id) return
    let active = true
    getBoardPost(id).then((p) => { if (active) setPost(p) })
      .catch((e) => { if (active) setError(boardError(e)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])
  if (loading) return <p role="status" className="text-sm text-muted-foreground">게시글을 불러오는 중…</p>
  if (error) return <div role="alert"><BoardNotice title={error} /></div>
  if (id && !post) return <BoardNotice title="게시글을 찾을 수 없습니다" />
  if (post && post.author_id !== userId) return <BoardNotice title="작성자 본인만 수정할 수 있습니다" />
  const actualSlug = post?.boards.slug ?? slug
  if (actualSlug === "research" ? !profile?.isResearchMember : !profile?.isTeacherVerified) return <BoardNotice title="작성 권한이 없습니다" />
  return <PostForm post={post} slug={actualSlug} />
}
function PostForm({ post, slug }: { post: BoardPost | null; slug: BoardSlug }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState(post?.title ?? "")
  const [body, setBody] = useState(post?.body ?? "")
  const [busy, setBusy] = useState(false)
  const [imageBusy, setImageBusy] = useState(false)
  const submitting = useRef(false)
  const [error, setError] = useState("")
  const dirty = title !== (post?.title ?? "") || body !== (post?.body ?? "")
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = "" }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (submitting.current || imageBusy) return
    submitting.current = true; setBusy(true); setError("")
    try {
      const id = await saveBoardPost(title, body, post?.id, slug)
      navigate(`/board/${id}`, { replace: true })
    } catch (e) { setError(boardError(e)) }
    finally { submitting.current = false; setBusy(false) }
  }
  function cancel() {
    if (!dirty || window.confirm("작성 중인 내용을 저장하지 않고 나갈까요?")) navigate(post ? `/board/${post.id}` : `/board/${slug}`)
  }
  return <form onSubmit={submit}>
    <fieldset disabled={busy} className="space-y-6 disabled:opacity-60">
      <div><label htmlFor="post-title" className="mb-2 block text-sm font-medium">제목 <span className="text-muted-foreground">(필수)</span></label><input id="post-title" required maxLength={POST_TITLE_MAX} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="어떤 이야기를 나누고 싶으신가요?" className="w-full rounded-md border border-input bg-background px-3 py-2.5" /><p className="mt-1 text-right text-xs text-muted-foreground">{title.length} / {POST_TITLE_MAX}</p></div>
      <div><p id="post-body-label" className="mb-2 text-sm font-medium">본문 <span className="text-muted-foreground">(필수)</span></p><div role="group" aria-labelledby="post-body-label"><RichTextEditor allowImages={slug !== "research"} value={body} onChange={setBody} disabled={busy} onBusyChange={setImageBusy} placeholder="나누고 싶은 이야기를 적어 주세요." /></div></div>
    </fieldset>
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    <div className="mt-6 flex justify-end gap-2"><button type="button" disabled={busy} onClick={cancel} className="rounded-md border px-4 py-2.5 text-sm hover:bg-accent disabled:opacity-50">취소</button><button disabled={busy || imageBusy} type="submit" className="rounded-md bg-cta px-5 py-2.5 text-sm font-semibold text-cta-foreground disabled:opacity-50">{busy ? "저장 중…" : imageBusy ? "이미지 작업 중…" : post ? "수정 완료" : "게시글 등록"}</button></div>
  </form>
}

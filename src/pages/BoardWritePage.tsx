import { useEffect, useRef, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useAuth } from "@/lib/auth"
import { usePageTitle } from "@/lib/usePageTitle"
import { boardError, boardListPath, boardPostPath, getBoardPost, POST_TITLE_MAX, saveBoardPost, saveTrainingPost, type BoardPost, type BoardSlug, type TrainingLink, boardName } from "@/lib/board"
import { uploadThumbnail } from "@/lib/apps"
import { isTrainingStage, training, type TrainingStage } from "@/config/training"
import { CoverField, type CoverValue } from "@/components/practice/CoverField"
import { TrainingLinkField } from "@/components/training/TrainingLinkField"
import { BoardNotice } from "@/components/board/BoardNotice"
import { RichTextEditor } from "@/components/app/RichTextEditor"
import { resolveResearchImages } from "@/lib/researchImages"

export function BoardWritePage({ slug = "free" }: { slug?: BoardSlug }) {
  const { id } = useParams()
  const { user, profile, loading } = useAuth()
  const isTraining = slug === "training"
  usePageTitle(id ? "게시글 수정" : isTraining ? training.share.writeHeading : `${boardName(slug)} 글쓰기`)
  return <div className={isTraining ? "rounded-xl border bg-card p-5 shadow-sm sm:p-7" : "mx-auto max-w-3xl px-4 py-10"}>
    <Link to={id ? boardPostPath(slug, id) : boardListPath(slug)} className="text-sm text-muted-foreground hover:text-primary">← {id ? "게시글로" : "목록으로"}</Link>
    <h1 className="mb-2 mt-6 text-2xl font-bold">{id ? "게시글 수정" : isTraining ? training.share.writeHeading : "이야기 나누기"}</h1>
    {isTraining
      ? <p className="mb-8 rounded-lg border border-brand-line bg-brand-soft px-4 py-3 text-sm text-brand-muted-foreground break-keep">{training.share.writeGuard}</p>
      : <p className="mb-8 text-sm text-muted-foreground">서로의 경험을 존중하며 편하게 나눠 주세요. 학생을 식별할 수 있는 정보는 담지 말아 주세요.</p>}
    {loading ? <p role="status">로그인 상태를 확인하고 있어요…</p>
      : !user ? <BoardNotice title="로그인이 필요합니다" body="로그인 후 작성 권한을 확인할 수 있어요." to="/login" label="로그인하기" />
      : !profile ? <p role="status">교사인증 상태를 확인하고 있어요…</p>
      : !id && slug === "research" && !profile.isResearchMember ? <BoardNotice title="접근 권한이 없습니다" />
      : !id && slug !== "research" && !profile.isTeacherVerified ? <BoardNotice title="교사인증이 필요합니다" body="인증을 마치면 글과 댓글을 남길 수 있어요." to="/verify" label="교사인증하기" />
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
    // 연구회 사진은 위치만 저장돼 있어 편집기에 넣기 전에 임시 주소를 채운다.
    getBoardPost(id).then(async (p) => p?.boards.slug === "research" ? { ...p, body: await resolveResearchImages(p.body) } : p)
      .then((p) => { if (active) setPost(p) })
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
  const [params] = useSearchParams()
  const requestedStage = params.get("stage")
  const [stage, setStage] = useState<TrainingStage | "">(post?.training_stage ?? (isTrainingStage(requestedStage) ? requestedStage : ""))
  const [visibility, setVisibility] = useState<"public" | "private">(post?.visibility ?? "public")
  const [title, setTitle] = useState(post?.title ?? "")
  const [body, setBody] = useState(post?.body ?? "")
  // 함께 여는 연수만 — 카드 대표 사진(선택)과 연수 자료 링크
  const [cover, setCover] = useState<CoverValue>({ file: null, url: post?.cover_url ?? "" })
  const [links, setLinks] = useState<TrainingLink[]>(post?.links ?? [])
  const [busy, setBusy] = useState(false)
  const [imageBusy, setImageBusy] = useState(false)
  const submitting = useRef(false)
  const [error, setError] = useState("")
  const dirty = (slug === "training" && visibility !== (post?.visibility ?? "public")) || (slug === "training" && stage !== (post?.training_stage ?? (isTrainingStage(requestedStage) ? requestedStage : ""))) || title !== (post?.title ?? "") || body !== (post?.body ?? "")
    || !!cover.file || cover.url !== (post?.cover_url ?? "") || JSON.stringify(links) !== JSON.stringify(post?.links ?? [])
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
      let id: string
      if (slug === "training") {
        if (!isTrainingStage(stage)) throw new Error("연수 단계를 선택해 주세요.")
        const coverUrl = cover.file ? await uploadThumbnail(cover.file) : cover.url || null
        if (cover.file && coverUrl) setCover({ file: null, url: coverUrl }) // 다시 눌러도 재업로드 안 하게
        id = await saveTrainingPost(title, body, coverUrl, links, stage, visibility, post?.id)
      } else id = await saveBoardPost(title, body, post?.id, slug)
      navigate(boardPostPath(slug, id), { replace: true })
    } catch (e) { setError(boardError(e)) }
    finally { submitting.current = false; setBusy(false) }
  }
  function cancel() {
    if (!dirty || window.confirm("작성 중인 내용을 저장하지 않고 나갈까요?")) navigate(post ? boardPostPath(slug, post.id) : boardListPath(slug))
  }
  return <form onSubmit={submit}>
    <fieldset disabled={busy} className="space-y-6 disabled:opacity-60">
      <div><label htmlFor="post-title" className="mb-2 block text-sm font-medium">제목 <span className="text-muted-foreground">(필수)</span></label><input id="post-title" required maxLength={POST_TITLE_MAX} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={slug === "training" ? "어떤 연수인지 한 줄로 알려 주세요" : "어떤 이야기를 나누고 싶으신가요?"} className="w-full rounded-md border border-input bg-background px-3 py-2.5" /><p className="mt-1 text-right text-xs text-muted-foreground">{title.length} / {POST_TITLE_MAX}</p></div>
      {slug === "training" && <>
        <fieldset><legend className="mb-2 text-sm font-medium">공개 범위</legend><div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-sm"><input type="radio" name="visibility" value="public" checked={visibility === "public"} onChange={() => setVisibility("public")} />공개</label>
          <label className="flex items-center gap-2 text-sm"><input type="radio" name="visibility" value="private" checked={visibility === "private"} onChange={() => setVisibility("private")} />비공개 · 나만 보기</label>
        </div>{visibility === "private" && <p className="mt-2 text-xs text-muted-foreground">외부 링크와 업로드한 이미지의 공개 여부는 별도로 관리됩니다.</p>}</fieldset>
        <div><label htmlFor="training-stage" className="mb-2 block text-sm font-medium">연수 단계 (필수)</label><select id="training-stage" required value={stage} onChange={(e) => setStage(isTrainingStage(e.target.value) ? e.target.value : "")} className="w-full rounded-md border border-input bg-background px-3 py-2.5"><option value="">단계를 선택해 주세요</option>{training.courses.map((course, i) => <option key={course.slug} value={course.slug}>{i + 1}. {course.title}</option>)}</select></div>
        <div><p className="mb-2 text-sm font-medium">대표 사진 <span className="text-muted-foreground">(선택 · 카드에 보여요)</span></p><CoverField value={cover} onChange={setCover} disabled={busy} /></div>
        <div><p className="mb-2 text-sm font-medium">연수 자료 링크 <span className="text-muted-foreground">(선택 · 유튜브는 본문에서, 다른 자료는 새 탭에서 열려요)</span></p><TrainingLinkField value={links} onChange={setLinks} disabled={busy} /></div>
      </>}
      <div><p id="post-body-label" className="mb-2 text-sm font-medium">본문 <span className="text-muted-foreground">(필수)</span></p><div role="group" aria-labelledby="post-body-label"><RichTextEditor imageStore={slug === "research" ? "research" : "public"} value={body} onChange={setBody} disabled={busy} onBusyChange={setImageBusy} placeholder={slug === "training" ? "무엇을 알려 주고 싶은지, 어떤 필요에서 만들었는지, 준비물은 무엇인지 적어 주세요." : "나누고 싶은 이야기를 적어 주세요."} /></div></div>
    </fieldset>
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    <div className="mt-6 flex justify-end gap-2"><button type="button" disabled={busy} onClick={cancel} className="rounded-md border px-4 py-2.5 text-sm hover:bg-accent disabled:opacity-50">취소</button><button disabled={busy || imageBusy} type="submit" className="rounded-md bg-cta px-5 py-2.5 text-sm font-semibold text-cta-foreground disabled:opacity-50">{busy ? "저장 중…" : imageBusy ? "이미지 작업 중…" : post ? "수정 완료" : "게시글 등록"}</button></div>
  </form>
}

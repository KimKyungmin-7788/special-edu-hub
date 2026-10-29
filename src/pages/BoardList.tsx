import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Eye, Heart, MessageSquare, PenLine, Pin, Search, Share2 } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { usePageTitle } from "@/lib/usePageTitle"
import { BOARD_PAGE_SIZE, boardError, getBoardPosts, type BoardPost, type BoardSlug, boardName } from "@/lib/board"
import { ProfileTrigger } from "@/components/profile/ProfileTrigger"
import { BoardAccessNotice } from "@/components/board/BoardAccessNotice"
import { BoardShareDialog } from "@/components/board/BoardShareDialog"
import { relativeTime } from "@/lib/time"

export function BoardList({ slug = "free" }: { slug?: BoardSlug }) {
  const { profile, loading } = useAuth()
  usePageTitle(boardName(slug))
  // 연구회게시판: 권한이 없어도 게시판 이름·소개는 보이고, 글 목록 자리에 안내만 보인다.
  if (slug === "research" && !profile?.isResearchMember) return <div className="mx-auto max-w-5xl px-4 py-10">
    <BoardHeading slug={slug} />
    <div className="mt-6">{loading ? <p role="status" className="text-sm text-muted-foreground">확인 중…</p> : <BoardAccessNotice research />}</div>
  </div>
  return <BoardListContent key={slug} slug={slug} />
}
function BoardHeading({ slug }: { slug: BoardSlug }) {
  return <div><h1 className="text-2xl font-bold">{boardName(slug)}</h1><p className="mt-2 text-sm text-muted-foreground">{slug === "research" ? "연구회 활동과 자료, 함께 논의할 이야기를 나눕니다." : "수업 이야기부터 작은 질문까지, 선생님들의 생각을 나누는 공간입니다."}</p></div>
}
function BoardListContent({ slug }: { slug: BoardSlug }) {
  const { user, profile } = useAuth()
  const [params, setParams] = useSearchParams()
  const search = params.get("q") ?? ""
  const rawPage = Number(params.get("page") ?? 1)
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 100000 ? rawPage : 1
  const [draft, setDraft] = useState(search)
  const [result, setResult] = useState<{ posts: BoardPost[]; count: number } | null>(null)
  const [error, setError] = useState("")
  const [retry, setRetry] = useState(0)
  const [sharing, setSharing] = useState<BoardPost | null>(null)
  useEffect(() => { setDraft(search) }, [search])
  useEffect(() => {
    let active = true
    setResult(null)
    setError("")
    getBoardPosts(search, page, slug).then((data) => { if (active) setResult(data) })
      .catch((e) => { if (active) setError(boardError(e)) })
    return () => { active = false }
  }, [search, page, user?.id, retry, slug])
  const pages = Math.max(1, Math.ceil((result?.count ?? 0) / BOARD_PAGE_SIZE))
  function move(next: number, q = search) { setParams({ ...(q ? { q } : {}), ...(next > 1 ? { page: String(next) } : {}) }) }
  return <div className="mx-auto max-w-5xl px-4 py-10">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <BoardHeading slug={slug} />
      <Link to={`/board/${slug}/write`} className="inline-flex items-center gap-2 rounded-md bg-cta px-4 py-2.5 text-sm font-semibold text-cta-foreground"><PenLine className="size-4" aria-hidden />글쓰기</Link>
    </div>
    <div className="mt-6 rounded-lg border border-brand-line bg-brand-soft px-4 py-3 text-sm text-brand-muted-foreground">
      {slug === "research" ? "연구회회원만 읽고 글과 댓글을 남길 수 있어요." : "누구나 읽을 수 있고, 인증 교사는 글과 댓글을 남길 수 있어요."}
      {slug === "free" && !profile?.isTeacherVerified && <Link to={user ? "/verify" : "/login"} className="ml-2 font-semibold underline underline-offset-4">{user ? "교사인증하기" : "로그인하기"}</Link>}
    </div>
    <form role="search" onSubmit={(e) => { e.preventDefault(); move(1, draft.trim()) }} className="mt-8 flex gap-2">
      <label htmlFor="board-search" className="sr-only">게시글 제목 검색</label>
      <input id="board-search" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={100} placeholder="궁금한 이야기를 제목으로 검색해 보세요" className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
      <button type="submit" className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"><Search className="size-4" aria-hidden />검색</button>
      {search && <button type="button" onClick={() => move(1, "")} className="rounded-md px-3 text-sm text-muted-foreground hover:bg-accent">초기화</button>}
    </form>
    {error ? <div role="alert" className="mt-6 rounded-lg border p-6 text-center"><p className="text-sm text-destructive">{error}</p><button onClick={() => setRetry((v) => v + 1)} className="mt-3 text-sm text-primary underline">다시 시도</button></div>
      : !result ? <p role="status" className="py-16 text-center text-sm text-muted-foreground">게시글을 불러오는 중…</p>
      : <>
        <p className="mb-3 mt-6 text-sm text-muted-foreground">{search ? `‘${search}’ 검색 결과` : "전체 글"} {result.count.toLocaleString()}개</p>
        {result.posts.length === 0 ? <div className="rounded-lg border bg-card px-4 py-16 text-center"><MessageSquare className="mx-auto size-8 text-muted-foreground" aria-hidden /><p className="mt-4 font-medium">{search ? "검색 결과가 없습니다" : page > 1 ? "이 페이지에 게시글이 없습니다" : "첫 이야기를 기다리고 있어요"}</p><p className="mt-2 text-sm text-muted-foreground">{search ? "다른 검색어로 찾아보세요." : page > 1 ? "이전 페이지로 이동해 주세요." : "함께 나누고 싶은 질문이나 일상을 남겨 주세요."}</p></div>
          : <ul className="divide-y rounded-lg border bg-card">{result.posts.map((post) => <li key={post.id} className="px-4 py-5 sm:px-6">
            <div className="flex items-start gap-2">{post.pinned && <span className="inline-flex shrink-0 items-center gap-1 rounded bg-brand-muted px-2 py-1 text-xs font-medium text-brand-muted-foreground"><Pin className="size-3" aria-hidden />고정</span>}<Link to={`/board/${post.id}`} className="min-w-0 flex-1 break-words font-semibold hover:text-primary">{post.title}</Link>
              <button type="button" onClick={() => setSharing(post)} aria-label={`‘${post.title}’ 공유`} title="공유" className="-my-1.5 -mr-2 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"><Share2 className="size-4" aria-hidden /></button></div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"><ProfileTrigger userId={post.author_id}>{post.author?.nickname || "사용자"}</ProfileTrigger><time dateTime={post.created_at}>{relativeTime(post.created_at)}</time><span className="inline-flex items-center gap-1"><Eye className="size-3.5" aria-hidden />조회 {post.view_count.toLocaleString()}</span><span className="inline-flex items-center gap-1"><Heart className="size-3.5" aria-hidden />좋아요 {post.like_count.toLocaleString()}</span><span className="inline-flex items-center gap-1"><MessageSquare className="size-3.5" aria-hidden />댓글 {post.comments[0]?.count ?? 0}</span></div>
          </li>)}</ul>}
        {sharing && <BoardShareDialog open onClose={() => setSharing(null)} id={sharing.id} title={sharing.title} slug={slug} />}
        {(pages > 1 || page > 1) && <nav aria-label="게시판 페이지" className="mt-6 flex items-center justify-center gap-4"><button disabled={page <= 1} onClick={() => move(page - 1)} className="rounded-md border px-4 py-2 text-sm disabled:opacity-40">이전</button><span className="text-sm">{page} / {pages}</span><button disabled={page >= pages} onClick={() => move(page + 1)} className="rounded-md border px-4 py-2 text-sm disabled:opacity-40">다음</button></nav>}
      </>}
  </div>
}

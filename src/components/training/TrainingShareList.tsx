import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { BookOpen, Eye, FileText, Heart, LayoutGrid, Link2, List, MessageSquare, PenLine, Pin, PlayCircle, Presentation, Search, type LucideIcon } from "lucide-react"
import { training } from "@/config/training"
import { useAuth } from "@/lib/auth"
import { usePageTitle } from "@/lib/usePageTitle"
import { BOARD_PAGE_SIZE, boardError, boardPostPath, getBoardPosts, TRAINING_LINK_KINDS, type BoardPost, type TrainingLinkKind } from "@/lib/board"
import { ProfileTrigger } from "@/components/profile/ProfileTrigger"
import { relativeTime } from "@/lib/time"
import { cn } from "@/lib/utils"

const KIND_ICON: Record<TrainingLinkKind, LucideIcon> = { slides: Presentation, video: PlayCircle, file: FileText, link: Link2 }

/** 글에 담긴 링크 종류(중복 없이, 정해 둔 순서). 링크가 없으면 빈 배열 = '글' */
function postKinds(post: BoardPost) {
  const kinds = new Set((post.links ?? []).map((l) => l.kind))
  return TRAINING_LINK_KINDS.filter((k) => kinds.has(k.kind))
}

/**
 * 함께 여는 연수(/training/share) — 회원이 올린 연수 목록. 카드 / 목록 보기를 ?view=list 로 바꾼다.
 * 누구나 보고, 인증 교사가 올린다(49). 문구는 config/training.ts 의 share.
 */
export function TrainingShareList() {
  const { share } = training
  const { user, profile } = useAuth()
  usePageTitle(share.title)
  const [params, setParams] = useSearchParams()
  const search = params.get("q") ?? ""
  const listView = params.get("view") === "list"
  const rawPage = Number(params.get("page") ?? 1)
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 100000 ? rawPage : 1
  const [draft, setDraft] = useState(search)
  const [result, setResult] = useState<{ posts: BoardPost[]; count: number } | null>(null)
  const [error, setError] = useState("")
  const [retry, setRetry] = useState(0)
  useEffect(() => { setDraft(search) }, [search])
  useEffect(() => {
    let active = true
    setResult(null)
    setError("")
    getBoardPosts(search, page, "training").then((data) => { if (active) setResult(data) })
      .catch((e) => { if (active) setError(boardError(e)) })
    return () => { active = false }
  }, [search, page, user?.id, retry])
  const pages = Math.max(1, Math.ceil((result?.count ?? 0) / BOARD_PAGE_SIZE))
  function move(next: number, q = search, list = listView) {
    setParams({ ...(q ? { q } : {}), ...(next > 1 ? { page: String(next) } : {}), ...(list ? { view: "list" } : {}) })
  }

  return <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold text-primary">{training.title}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{share.title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground break-keep">{share.description}</p>
      </div>
      <Link to={`${share.path}/write`} className="inline-flex items-center gap-2 rounded-md bg-cta px-4 py-2.5 text-sm font-semibold text-cta-foreground"><PenLine className="size-4" aria-hidden />{share.ctaLabel}</Link>
    </div>
    <div className="mt-5 rounded-lg border border-brand-line bg-brand-soft px-4 py-3 text-sm text-brand-muted-foreground break-keep">
      {share.notice}
      {!profile?.isTeacherVerified && <Link to={user ? "/verify" : "/login"} className="ml-2 font-semibold underline underline-offset-4">{user ? "교사인증하기" : "로그인하기"}</Link>}
    </div>

    <div className="mt-6 flex flex-wrap gap-2">
      <form role="search" onSubmit={(e) => { e.preventDefault(); move(1, draft.trim()) }} className="flex w-full min-w-0 gap-2 sm:w-auto sm:flex-1">
        <label htmlFor="training-search" className="sr-only">연수 제목 검색</label>
        <input id="training-search" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={100} placeholder="연수 제목으로 검색해 보세요" className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <button type="submit" className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"><Search className="size-4" aria-hidden />검색</button>
        {search && <button type="button" onClick={() => move(1, "")} className="rounded-md px-3 text-sm text-muted-foreground hover:bg-accent">초기화</button>}
      </form>
      <div role="group" aria-label="보기 방식" className="flex overflow-hidden rounded-md border">
        <ViewButton on={!listView} onClick={() => move(page, search, false)} icon={LayoutGrid} label="카드" />
        <ViewButton on={listView} onClick={() => move(page, search, true)} icon={List} label="목록" />
      </div>
    </div>

    {error ? <div role="alert" className="mt-6 rounded-lg border p-6 text-center"><p className="text-sm text-destructive">{error}</p><button onClick={() => setRetry((v) => v + 1)} className="mt-3 text-sm text-primary underline">다시 시도</button></div>
      : !result ? <p role="status" className="py-16 text-center text-sm text-muted-foreground">연수를 불러오는 중…</p>
      : <>
        <p className="mb-3 mt-5 text-sm text-muted-foreground">{search ? `‘${search}’ 검색 결과` : "전체 연수"} {result.count.toLocaleString()}개</p>
        {result.posts.length === 0 ? <div className="rounded-lg border px-4 py-16 text-center"><BookOpen className="mx-auto size-8 text-muted-foreground" aria-hidden /><p className="mt-4 font-medium">{search ? "검색 결과가 없습니다" : page > 1 ? "이 페이지에 연수가 없습니다" : share.emptyTitle}</p><p className="mt-2 text-sm text-muted-foreground break-keep">{search ? "다른 검색어로 찾아보세요." : page > 1 ? "이전 페이지로 이동해 주세요." : share.emptyBody}</p></div>
          : listView ? <ul className="divide-y border-y">{result.posts.map((post) => <ListRow key={post.id} post={post} />)}</ul>
          : <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{result.posts.map((post) => <Card key={post.id} post={post} />)}</ul>}
        {(pages > 1 || page > 1) && <nav aria-label="연수 페이지" className="mt-6 flex items-center justify-center gap-4"><button disabled={page <= 1} onClick={() => move(page - 1)} className="rounded-md border px-4 py-2 text-sm disabled:opacity-40">이전</button><span className="text-sm">{page} / {pages}</span><button disabled={page >= pages} onClick={() => move(page + 1)} className="rounded-md border px-4 py-2 text-sm disabled:opacity-40">다음</button></nav>}
      </>}
  </div>
}

function ViewButton({ on, onClick, icon: Icon, label }: { on: boolean; onClick: () => void; icon: LucideIcon; label: string }) {
  return <button type="button" onClick={onClick} aria-pressed={on} className={cn("inline-flex items-center gap-1.5 px-3 py-2 text-sm", on ? "bg-brand-soft font-semibold text-brand-muted-foreground" : "text-muted-foreground hover:bg-accent")}>
    <Icon className="size-4" aria-hidden />{label}
  </button>
}

/** 대표 사진 — 없으면 첫 링크 종류 그림이 들어간 담백한 칸 */
function Cover({ post, className }: { post: BoardPost; className?: string }) {
  const Icon = KIND_ICON[post.links?.[0]?.kind as TrainingLinkKind] ?? BookOpen
  return post.cover_url
    ? <img src={post.cover_url} alt="" loading="lazy" className={cn("aspect-video w-full object-cover", className)} />
    : <div aria-hidden className={cn("flex aspect-video w-full items-center justify-center bg-muted text-muted-foreground/60", className)}><Icon className="size-1/4 max-h-10 max-w-10" /></div>
}

function Kinds({ post }: { post: BoardPost }) {
  const kinds = postKinds(post)
  return <span className="inline-flex flex-wrap gap-1">
    {(kinds.length ? kinds.map((k) => k.short) : ["글"]).map((label) => <span key={label} className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-foreground/70">{label}</span>)}
  </span>
}

function Card({ post }: { post: BoardPost }) {
  const to = boardPostPath("training", post.id)
  return <li className="overflow-hidden rounded-xl border bg-card transition-colors hover:border-brand-line">
    <Link to={to} tabIndex={-1} aria-hidden><Cover post={post} /></Link>
    <div className="p-4">
      <div className="flex items-center gap-1.5">{post.pinned && <Pin className="size-3.5 text-primary" aria-label="고정" />}<Kinds post={post} /></div>
      <Link to={to} className="mt-2 block font-bold leading-snug break-keep hover:text-primary">{post.title}</Link>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <ProfileTrigger userId={post.author_id}>{post.author?.nickname || "사용자"}</ProfileTrigger>
        <span className="inline-flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1"><Heart className="size-3.5" aria-hidden /><span className="sr-only">좋아요</span>{post.like_count.toLocaleString()}</span>
          <span className="inline-flex items-center gap-1"><Eye className="size-3.5" aria-hidden /><span className="sr-only">조회</span>{post.view_count.toLocaleString()}</span>
        </span>
      </div>
    </div>
  </li>
}

function ListRow({ post }: { post: BoardPost }) {
  const to = boardPostPath("training", post.id)
  return <li className="flex items-center gap-4 py-3.5">
    <Link to={to} tabIndex={-1} aria-hidden className="hidden w-20 shrink-0 overflow-hidden rounded-md sm:block"><Cover post={post} /></Link>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">{post.pinned && <Pin className="size-3.5 text-primary" aria-label="고정" />}<Link to={to} className="font-semibold break-keep hover:text-primary">{post.title}</Link><Kinds post={post} /></div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <ProfileTrigger userId={post.author_id}>{post.author?.nickname || "사용자"}</ProfileTrigger>
        <time dateTime={post.created_at}>{relativeTime(post.created_at)}</time>
        <span className="inline-flex items-center gap-1"><Heart className="size-3.5" aria-hidden />좋아요 {post.like_count.toLocaleString()}</span>
        <span className="inline-flex items-center gap-1"><MessageSquare className="size-3.5" aria-hidden />댓글 {post.comments[0]?.count ?? 0}</span>
      </div>
    </div>
  </li>
}

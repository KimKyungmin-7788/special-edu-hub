import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ArrowDown, ArrowRight, BookOpen, FileText, Heart, LayoutGrid, Link2, List, MessageSquare, PenLine, Pin, PlayCircle, Presentation, Search, Users, type LucideIcon } from "lucide-react"
import { isTrainingStage, setupMaterial, soonLabel, training, trainingPath, type TrainingCourse, type TrainingPage } from "@/config/training"
import { useAuth } from "@/lib/auth"
import { usePageTitle } from "@/lib/usePageTitle"
import { BOARD_PAGE_SIZE, boardError, boardPostPath, getBoardPosts, TRAINING_LINK_KINDS, type BoardPost, type TrainingLinkKind } from "@/lib/board"
import { ProfileTrigger } from "@/components/profile/ProfileTrigger"
import { relativeTime } from "@/lib/time"
import { cn } from "@/lib/utils"
import { avatarTone, AVATAR_PHOTO } from "@/lib/avatarTone"

const KIND_ICON: Record<TrainingLinkKind, LucideIcon> = { slides: Presentation, video: PlayCircle, file: FileText, link: Link2 }

function postKinds(post: BoardPost) {
  const kinds = new Set((post.links ?? []).map((l) => l.kind))
  return TRAINING_LINK_KINDS.filter((k) => kinds.has(k.kind))
}

/** 단계·형식·검색·페이지를 URL에 남겨 새로고침과 뒤로 가기에서도 목록을 복원한다. */
export function TrainingShareList() {
  const { user } = useAuth()
  usePageTitle(training.title)
  const [params, setParams] = useSearchParams()
  const rawStage = params.get("stage")
  const stage = rawStage === "all" || rawStage === "study" || isTrainingStage(rawStage) ? rawStage : "all"
  const kind = TRAINING_LINK_KINDS.find((k) => k.kind === params.get("kind"))?.kind
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
    if (stage === "study") return
    getBoardPosts(search, page, "training", { stage: isTrainingStage(stage) ? stage : undefined, kind })
      .then((data) => { if (active) setResult(data) })
      .catch((e) => { if (active) setError(boardError(e)) })
    return () => { active = false }
  }, [stage, kind, search, page, user?.id, retry])
  function change(values: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    next.delete("page")
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next)
  }
  const fixed = training.courses.filter((c) => stage === "all" || c.slug === stage)
    .flatMap((c) => c.pages.map((p) => ({ course: c, page: p })))
    .filter(({ page: p }) => (!kind || kind === (p.slug === "survey" ? "link" : "slides")) && p.label.includes(search.trim()))
  const activeFixed = fixed.filter(({ page: p }) => p.status === "active")
  const upcoming = fixed.filter(({ page: p }) => p.status === "soon")
  const pages = Math.max(1, Math.ceil((result?.count ?? 0) / BOARD_PAGE_SIZE))
  const writeTo = `${training.share.path}/write${isTrainingStage(stage) ? `?stage=${stage}` : ""}`
  return <div>
    <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-3xl font-bold tracking-tight">{training.title}</h1><p className="mt-2 text-sm text-muted-foreground">{training.description}</p></div>
      <div className="flex flex-wrap items-center gap-3 sm:gap-5">
      <Link to={`${training.basePath}/guide`} className="py-3 text-sm font-semibold text-primary underline-offset-4 hover:underline">{training.guideLabel}</Link>
      <Link to={writeTo} className="inline-flex items-center gap-2 rounded-lg bg-cta px-5 py-3 text-sm font-semibold text-cta-foreground"><PenLine className="size-4" aria-hidden />{training.share.ctaLabel}</Link>
      </div>
    </header>
    <div className="grid gap-6 xl:grid-cols-[3fr_1fr]">
      <ol aria-label="연수 단계" className="grid gap-7 sm:grid-cols-3 sm:gap-8">
        {training.courses.map((c, i) => <li key={c.slug} className="relative min-w-0">
          <button type="button" aria-pressed={stage === c.slug} aria-controls="training-catalogue" onClick={() => change({ stage: c.slug, kind: null, q: null })}
            className={cn("flex h-full w-full flex-col items-start gap-4 rounded-xl border-2 p-5 text-left transition-colors", stage === c.slug ? "border-primary bg-brand-soft" : "border-border bg-card hover:border-brand-line")}>
            <span className="flex items-center gap-3 text-primary"><span className="text-4xl leading-none font-bold tracking-tighter">{String(i + 1).padStart(2, "0")}</span><span className="text-sm font-semibold">{c.eyebrow}</span></span>
            <span className="text-xl leading-snug font-bold break-keep">{c.title}</span>
            <span className="text-sm leading-relaxed break-keep text-muted-foreground">{c.description}</span>
            <span className="mt-auto inline-flex items-center gap-2 pt-2 text-sm font-semibold text-primary">연수 둘러보기<ArrowRight className="size-4" aria-hidden /></span>
          </button>
          {i < training.courses.length - 1 && <><ArrowRight aria-hidden className="absolute top-1/2 -right-6 hidden size-4 -translate-y-1/2 text-muted-foreground sm:block" /><ArrowDown aria-hidden className="absolute -bottom-5 left-8 size-4 text-muted-foreground sm:hidden" /></>}
        </li>)}
      </ol>
      <button type="button" aria-pressed={stage === "study"} aria-controls="training-catalogue" onClick={() => change({ stage: "study", kind: null, q: null })}
        className={cn("flex h-full flex-col items-start gap-4 rounded-xl border-2 border-dashed p-5 text-left transition-colors", stage === "study" ? "border-primary bg-brand-soft" : "border-border bg-card hover:border-brand-line")}>
        <span className="text-sm font-semibold text-primary">함께 배우기</span>
        <span className="text-xl font-bold">{training.study.title}</span>
        <span className="text-sm leading-relaxed break-keep text-muted-foreground">{training.study.description}</span>
        <span className="mt-auto pt-2 text-sm text-muted-foreground">준비 중</span>
      </button>
    </div>
    <section id="training-catalogue" aria-label="선택한 단계의 연수" className="mt-8">
      <div className="mb-5 flex items-start justify-between gap-4">{stage === "study" && <h2 className="text-xl font-bold">{training.study.title}</h2>}<button type="button" onClick={() => change({ stage: "all", kind: null, q: null })} className="ml-auto shrink-0 py-1 text-sm text-primary underline underline-offset-4">전체 연수 보기</button></div>
      {stage === "study" ? <div className="rounded-xl bg-brand-soft px-5 py-16 text-center"><Users className="mx-auto size-8 text-primary" aria-hidden /><p className="mt-4 font-semibold">준비 중</p></div> : <>
        <div role="group" aria-label="자료 형식" className="mb-4 flex flex-wrap gap-2">
          {[{ kind: undefined, label: "전체" }, ...TRAINING_LINK_KINDS].map((k) => <button key={k.kind ?? "all"} type="button" aria-pressed={kind === k.kind} onClick={() => change({ kind: k.kind ?? null })} className={cn("rounded-full border px-3 py-1.5 text-sm", kind === k.kind ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent")}>{k.label}</button>)}
        </div>
        <div className="mb-5 flex flex-wrap gap-2">
          <form role="search" onSubmit={(e) => { e.preventDefault(); change({ q: draft.trim() || null }) }} className="flex min-w-0 flex-1 gap-2"><label htmlFor="training-search" className="sr-only">연수 제목 검색</label><input id="training-search" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={100} placeholder="연수 제목 검색" className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" /><button type="submit" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"><Search className="size-4" aria-hidden />검색</button>{search && <button type="button" onClick={() => change({ q: null })} className="text-sm text-muted-foreground">초기화</button>}</form>
          <div role="group" aria-label="보기 방식" className="flex overflow-hidden rounded-md border"><ViewButton on={!listView} onClick={() => change({ view: null })} icon={LayoutGrid} label="카드" /><ViewButton on={listView} onClick={() => change({ view: "list" })} icon={List} label="목록" /></div>
        </div>
        {activeFixed.length > 0 && page === 1 && <ul className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{activeFixed.map(({ course: c, page: p }) => <FixedCard key={`${c.slug}/${p.slug}`} course={c} page={p} />)}</ul>}
        {error ? <div role="alert" className="rounded-lg border p-6 text-center"><p className="text-sm text-destructive">{error}</p><button type="button" onClick={() => setRetry((v) => v + 1)} className="mt-3 text-sm text-primary underline">다시 시도</button></div>
          : !result ? <p role="status" className="py-10 text-center text-sm text-muted-foreground">연수를 불러오는 중…</p>
          : <div aria-live="polite">
            {result.posts.length === 0 ? (activeFixed.length > 0 && page === 1 ? null : <div className="rounded-xl border px-4 py-10 text-center"><BookOpen className="mx-auto size-7 text-muted-foreground" aria-hidden /><p className="mt-3 font-medium">{search || kind ? "조건에 맞는 연수가 없습니다" : page > 1 ? "이 페이지에 연수가 없습니다" : training.share.emptyTitle}</p>{(search || kind || page > 1) && <p className="mt-2 text-sm text-muted-foreground">{search || kind ? "다른 제목이나 자료 형식으로 찾아보세요." : "이전 페이지로 이동해 주세요."}</p>}</div>)
              : listView ? <ul className="divide-y border-y">{result.posts.map((post) => <ListRow key={post.id} post={post} />)}</ul>
              : <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{result.posts.map((post) => <Card key={post.id} post={post} />)}</ul>}
            {(pages > 1 || page > 1) && <nav aria-label="연수 페이지" className="mt-6 flex items-center justify-center gap-4"><button disabled={page <= 1} onClick={() => change({ page: String(page - 1) })} className="rounded-md border px-4 py-2 text-sm disabled:opacity-40">이전</button><span className="text-sm">{page} / {pages}</span><button disabled={page >= pages} onClick={() => change({ page: String(page + 1) })} className="rounded-md border px-4 py-2 text-sm disabled:opacity-40">다음</button></nav>}
          </div>}
        {upcoming.length > 0 && <details key={`${stage}:${kind}:${search}`} className="mt-7 border-t pt-4 text-sm text-muted-foreground">
          <summary className="w-fit cursor-pointer py-2">공개예정 연수 <span className="ml-1">{upcoming.length}개</span></summary>
          <ul className="mt-3 flex flex-wrap gap-2">{upcoming.map(({ course: c, page: p }) => <li key={`${c.slug}/${p.slug}`} className="rounded-md border bg-card px-3 py-2 text-xs"><span className="font-medium text-foreground">{p.label}</span><span className="ml-2">{soonLabel(p.release)}</span></li>)}</ul>
        </details>}
      </>}
    </section>
    <p className="mt-8 border-t pt-5 text-xs leading-relaxed text-muted-foreground">{training.guide.footnote}</p>
  </div>
}

function FixedCard({ course, page }: { course: TrainingCourse; page: TrainingPage }) {
  const open = page.status === "active"
  return <li className="flex flex-col overflow-hidden rounded-xl border bg-card">
    <div className="flex aspect-video flex-col justify-between bg-brand-soft p-5 text-brand-muted-foreground"><span className="text-xs">{course.eyebrow}</span><span className="text-xl leading-snug font-bold break-keep">{page.label}</span><Presentation className="ml-auto size-6" aria-hidden /></div>
    <div className="flex flex-1 flex-col p-4"><div className="mb-2 flex flex-wrap gap-1.5"><span className="rounded bg-brand-soft px-2 py-1 text-xs text-primary">기본 연수</span><span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">{page.slug === "survey" ? "설문" : "HTML 슬라이드"}</span></div><h3 className="mb-4 font-semibold leading-snug break-keep">{page.label}</h3><p className="mb-4 text-xs text-muted-foreground">{training.title} · 무료</p>
      {open ? <Link to={trainingPath(course.slug, page.slug)} className="mt-auto flex items-center justify-between rounded-md border px-3 py-2 text-sm font-semibold text-primary hover:bg-brand-soft">연수 보기<ArrowRight className="size-4" aria-hidden /></Link> : <p className="mt-auto rounded-md bg-muted px-3 py-2 text-center text-sm text-muted-foreground">{soonLabel(page.release)}</p>}
    </div>
  </li>
}
function ViewButton({ on, onClick, icon: Icon, label }: { on: boolean; onClick: () => void; icon: LucideIcon; label: string }) {
  return <button type="button" onClick={onClick} aria-pressed={on} className={cn("inline-flex items-center gap-1.5 px-3 py-2 text-sm", on ? "bg-brand-soft font-semibold text-brand-muted-foreground" : "text-muted-foreground hover:bg-accent")}>
    <Icon className="size-4" aria-hidden />{label}
  </button>
}

/** 올린 표지는 그대로 사용하고, 표지가 없으면 자료 내용에 맞는 타이포 표지를 만든다. */
function materialInfo(post: BoardPost) {
  return post.links?.some((link) => link.url.replace(/\/$/, "") === setupMaterial.url.replace(/\/$/, "")) ? setupMaterial : null
}

function Cover({ post, compact = false }: { post: BoardPost; compact?: boolean }) {
  const Icon = KIND_ICON[post.links?.[0]?.kind as TrainingLinkKind] ?? BookOpen
  const info = materialInfo(post)
  if (post.cover_url) return <img src={post.cover_url} alt="" loading="lazy" className="aspect-video w-full object-cover" />
  return <div aria-hidden className={cn("flex aspect-video w-full flex-col justify-between bg-hero-foreground text-primary-foreground", compact ? "items-center justify-center p-2" : "gap-3 p-5")}>
    {compact ? <Icon className="size-6" /> : <>
      <span className="text-xs text-primary-foreground/80">{info?.heading ?? postKinds(post)[0]?.label ?? "함께 여는 연수"}</span>
      <span className="line-clamp-3 text-2xl leading-snug font-bold tracking-tight break-keep">{post.title}</span>
      {info ? <span className="flex flex-wrap items-center gap-1.5 text-xs">{info.topics.map((topic, i) => <span key={topic} className="inline-flex items-center gap-1.5">{i > 0 && <ArrowRight className="size-3" />}<span className="rounded border border-primary-foreground/30 px-1.5 py-0.5">{topic}</span></span>)}</span> : <Icon className="ml-auto size-6" />}
    </>}
  </div>
}

function Kinds({ post }: { post: BoardPost }) {
  const kinds = postKinds(post)
  return <span className="inline-flex flex-wrap gap-1">
    {post.visibility === "private" && <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">비공개</span>}
    {(kinds.length ? kinds.map((k) => k.short) : ["글"]).map((label) => <span key={label} className="rounded bg-brand-soft px-2 py-1 text-xs text-primary">{label}</span>)}
  </span>
}

function Card({ post }: { post: BoardPost }) {
  const to = boardPostPath("training", post.id)
  const info = materialInfo(post)
  const author = post.author?.nickname || "사용자"
  return <li className="flex flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-brand-line">
    <Link to={to} tabIndex={-1} aria-hidden><Cover post={post} /></Link>
    <div className="flex flex-1 flex-col p-4">
      <div className="flex flex-wrap items-center gap-1.5">{post.pinned && <Pin className="size-3.5 text-primary" aria-label="고정" />}<Kinds post={post} />{info && <span className="rounded bg-brand-soft px-2 py-1 text-xs text-primary">{info.badge}</span>}</div>
      <Link to={to} className="mt-2 block font-bold leading-snug break-keep hover:text-primary">{post.title}</Link>
      {info && <p className="mt-2 text-xs text-muted-foreground">{info.summary}</p>}
      <div className="mt-4 text-sm"><ProfileTrigger userId={post.author_id} className="gap-2">
        <span aria-hidden className={cn("flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full border text-xs", post.author?.avatar_url ? AVATAR_PHOTO : avatarTone(author))}>
          {post.author?.avatar_url ? <img src={post.author.avatar_url} alt="" loading="lazy" className="size-full object-cover" /> : author[0]}
        </span>{author}
      </ProfileTrigger></div>
      <div className="mt-auto pt-4"><Link to={to} className="flex items-center justify-between rounded-md border px-3 py-2.5 text-sm font-semibold text-primary hover:bg-brand-soft">연수 보기<ArrowRight className="size-4" aria-hidden /></Link></div>
    </div>
  </li>
}

function ListRow({ post }: { post: BoardPost }) {
  const to = boardPostPath("training", post.id)
  return <li className="flex items-center gap-4 py-3.5">
    <Link to={to} tabIndex={-1} aria-hidden className="hidden w-20 shrink-0 overflow-hidden rounded-md sm:block"><Cover post={post} compact /></Link>
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

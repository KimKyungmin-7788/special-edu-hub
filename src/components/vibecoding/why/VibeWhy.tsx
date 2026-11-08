import { useEffect, useState } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { boardError, getBoardPost, type BoardPost } from "@/lib/board"
import { WHY_TITLE, type WhySlide } from "@/components/vibecoding/setup/steps"
import { SlideFrame } from "@/components/vibecoding/setup/components/SlideFrame"
import { WhyView } from "@/components/vibecoding/setup/components/WhyView"
import { WhyCover } from "@/components/vibecoding/setup/components/WhyCover"

/** 분리한 슬라이드 본문도 게시글 RLS를 통과한 뒤에만 내려받는다. */
export function VibeWhy() {
  const { id = "62dc3495-9d6e-49ba-a7ef-126e0f0c273a" } = useParams()
  const { user, loading } = useAuth()
  if (loading) return <p role="status">연수를 불러오는 중…</p>
  return <LoadSlides key={`${id}:${user?.id ?? "anon"}`} id={id} />
}

function LoadSlides({ id }: { id: string }) {
  const [post, setPost] = useState<BoardPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  useEffect(() => {
    let active = true
    getBoardPost(id).then((data) => { if (active) setPost(data) })
      .catch((e) => { if (active) setError(boardError(e)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])
  if (loading) return <p role="status">연수를 불러오는 중…</p>
  if (error) return <p role="alert">{error}</p>
  if (post?.boards.slug !== "training" || !post.training_slides?.length) return <div className="rounded-xl border bg-card p-6"><p>연수를 찾을 수 없거나 열람 권한이 없습니다.</p><Link to="/training" className="mt-4 inline-block text-sm text-primary">연수 목록</Link></div>
  return <><Link to={`/training/share/${id}`} className="mb-5 inline-block text-sm text-muted-foreground hover:text-primary">← 연수 소개</Link><WhySlides slides={post.training_slides} postId={id} /></>
}

function WhySlides({ slides, postId }: { slides: WhySlide[]; postId: string }) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const n = Number(params.get("p"))
  /** 표지(0) + 슬라이드(1~) */
  const count = slides.length + 1
  const index = Number.isInteger(n) && n >= 1 && n <= count ? n - 1 : 0
  const last = index === count - 1
  const slide = index > 0 ? slides[index - 1] : null

  const go = (i: number) => {
    if (i < 0) return
    if (i >= count) navigate(`/training/share/${postId}`)
    else setParams(i === 0 ? {} : { p: String(i + 1) })
  }

  // 키보드 ← → 로 넘겨요. 글을 쓰는 중이면 넘기지 않아요.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const t = e.target as HTMLElement
      if (t.closest("input, textarea, [contenteditable], dialog[open]")) return
      if (e.key === "ArrowRight" && !last) go(index + 1)
      if (e.key === "ArrowLeft") go(index - 1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const view = slide ? (
    <WhyView
      slide={slide}
      number={index}
      total={slides.length}
      nextLabel={last ? "연수 마치기" : "다음"}
      onPrev={() => go(index - 1)}
      onNext={() => go(index + 1)}
    />
  ) : (
    <WhyCover slides={slides} onStart={() => go(1)} />
  )

  return (
    <>
      {/* 좁은 화면: 위아래로 읽어요 */}
      <div className="overflow-hidden rounded-xl border bg-surface shadow-sm lg:hidden">
        {view}
      </div>

      {/* 넓은 화면: 화면 높이에 맞춘 16:9 슬라이드 */}
      <div className="hidden h-[calc(100svh-5.5rem)] min-h-[36rem] overflow-hidden rounded-xl border bg-surface p-3 shadow-sm lg:flex">
        <SlideFrame
          footer={
            <footer className="flex h-10 shrink-0 items-center gap-4 border-t bg-background px-5 text-sm text-muted-foreground">
              <span className="min-w-0 flex-1 truncate">
                {WHY_TITLE} · {slide ? slide.short : "표지"}
              </span>
              <div className="flex items-center gap-1.5" aria-hidden>
                {Array.from({ length: count }, (_, i) => (
                  <span
                    key={i}
                    className={
                      "h-1.5 rounded-full transition-all " +
                      (i === index
                        ? "w-5 bg-primary"
                        : i === 0
                          ? "w-1.5 bg-hero-accent/60"
                          : "w-1.5 bg-border")
                    }
                  />
                ))}
              </div>
              <div className="flex flex-1 items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => go(index - 1)}
                  disabled={index === 0}
                  aria-label="이전 슬라이드"
                  className="rounded-md p-1 hover:bg-accent disabled:opacity-40"
                >
                  <ArrowLeft aria-hidden className="size-4" />
                </button>
                <span className="tabular-nums">
                  {index + 1} / {count}
                </span>
                <button
                  type="button"
                  onClick={() => go(index + 1)}
                  disabled={last}
                  aria-label="다음 슬라이드"
                  className="rounded-md p-1 hover:bg-accent disabled:opacity-40"
                >
                  <ArrowRight aria-hidden className="size-4" />
                </button>
              </div>
            </footer>
          }
        >
          {view}
        </SlideFrame>
      </div>
    </>
  )
}

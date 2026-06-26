import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft,
  ExternalLink,
  Eye,
  Heart,
  Bookmark,
  Share2,
} from "lucide-react"
import { getCategory } from "@/config/categories"
import { AppThumbnail } from "@/components/app/AppThumbnail"
import { getApp, type App } from "@/lib/apps"

/**
 * 앱 상세 — 제목·개발자·소개 본문·조회수·"앱 열기"(새 탭).
 * 좋아요/담기/공유/댓글은 모양만(준비 중) — 동작 없음(CLAUDE.md 규칙 4).
 * 앱 실행은 iframe 금지, 새 탭 링크(target="_blank" rel="noopener").
 */
export function AppDetail() {
  const { id } = useParams<{ id: string }>()
  const [app, setApp] = useState<App | undefined>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    getApp(id ?? "").then((data) => {
      if (!active) return
      setApp(data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [id])

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
          to="/apps"
          className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          전체 목록으로
        </Link>
      </div>
    )
  }

  const tags = app.categoryIds
    .map((cid) => getCategory(cid)?.name)
    .filter(Boolean) as string[]

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        to="/apps"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        목록으로
      </Link>

      {/* 헤더: 제목 · 개발자 · 조회수 · 태그 */}
      <div className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight">{app.title}</h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>{app.authorName}</span>
          <span className="inline-flex items-center gap-1">
            <Eye className="size-4" aria-hidden />
            조회 {app.viewCount}
          </span>
        </div>

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
      <div className="mt-6 aspect-video overflow-hidden rounded-lg border bg-surface">
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

        {/* 좋아요 — 모양만, 비작동(준비 중) */}
        <button
          type="button"
          disabled
          title="준비 중"
          className="inline-flex cursor-not-allowed items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm text-muted-foreground"
        >
          <Heart className="size-4" aria-hidden />
          {app.likeCount}
        </button>

        {/* 담기 — 모양만, 비작동(준비 중) */}
        <button
          type="button"
          disabled
          title="준비 중"
          className="inline-flex cursor-not-allowed items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm text-muted-foreground"
        >
          <Bookmark className="size-4" aria-hidden />
          {app.bookmarkCount}
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

      {/* 개발자 소개 글(블로그형) */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">소개</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
          {app.description}
        </p>
      </section>

      {/* 댓글 — 자리만, 준비 중 */}
      <section className="mt-10 border-t pt-6">
        <h2 className="text-lg font-semibold tracking-tight">댓글</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          댓글 기능은 준비 중입니다.
        </p>
      </section>
    </div>
  )
}

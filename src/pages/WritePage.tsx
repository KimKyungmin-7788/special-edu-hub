import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ShieldCheck } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { getProfile } from "@/lib/profile"
import { getCategory } from "@/config/categories"
import { WriteForm } from "@/components/app/WriteForm"

/**
 * /write/:categoryId — 글쓰기 (3단계 묶음 G-1).
 *
 * 상위 분류는 진입 경로(과목 페이지·랜딩 모달)에서 정해져 URL 로 들어온다.
 * 상단에 카테고리 이름을 보여주고, 폼에서는 세부 분류만 고른다.
 *
 * 상태 분기 (안내용 — 최종 권한은 RLS):
 *   비로그인 → 로그인 안내 / 미인증 → 교사인증센터 안내 / 인증교사 → 폼
 */
type State =
  | { kind: "loading" }
  | { kind: "notLoggedIn" }
  | { kind: "notVerified" }
  | { kind: "ready"; authorName: string }

export function WritePage() {
  const { categoryId } = useParams<{ categoryId: string }>()
  const category = categoryId ? getCategory(categoryId) : undefined
  const { user, loading: authLoading } = useAuth()
  const [state, setState] = useState<State>({ kind: "loading" })

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setState({ kind: "notLoggedIn" })
      return
    }

    let cancelled = false
    getProfile(user.id).then((profile) => {
      if (cancelled) return
      if (!profile?.isTeacherVerified) {
        setState({ kind: "notVerified" })
      } else {
        setState({ kind: "ready", authorName: profile.nickname ?? "" })
      }
    })
    return () => {
      cancelled = true
    }
  }, [user, authLoading])

  // 잘못된 카테고리로 들어온 경우
  if (categoryId && !category) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-1 text-2xl font-bold">글쓰기</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          알 수 없는 분류입니다: {categoryId}
        </p>
        <Link to="/" className="mt-4 inline-block text-sm underline">
          홈으로
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* 상단: "<카테고리명> 글쓰기" */}
      <h1 className="mb-1 text-2xl font-bold">
        {category ? `${category.name} 글쓰기` : "글쓰기"}
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        인증교사가 만든 교육 웹앱을 누리집에 공개합니다. 등록하면 바로 목록에
        나타납니다.
      </p>

      {state.kind === "loading" && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          불러오는 중…
        </div>
      )}

      {state.kind === "notLoggedIn" && (
        <Notice
          title="로그인이 필요합니다"
          body="글쓰기는 인증교사만 할 수 있어요. 먼저 로그인해 주세요."
          to="/login"
          cta="로그인하러 가기"
        />
      )}

      {state.kind === "notVerified" && (
        <Notice
          title="교사인증이 필요합니다"
          body="글쓰기는 교사인증을 받은 분만 할 수 있어요. 교사인증센터에서 인증을 진행해 주세요."
          to="/verify"
          cta="교사인증센터 바로가기"
        />
      )}

      {state.kind === "ready" && categoryId && (
        <WriteForm categoryId={categoryId} defaultAuthorName={state.authorName} />
      )}
    </div>
  )
}

/** 비로그인·미인증 안내 카드 (중립 토큰만). */
function Notice({
  title,
  body,
  to,
  cta,
}: {
  title: string
  body: string
  to: string
  cta: string
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-6">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-5 text-muted-foreground" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{body}</p>
        </div>
      </div>
      <Link
        to={to}
        className="mt-4 inline-block rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        {cta}
      </Link>
    </div>
  )
}

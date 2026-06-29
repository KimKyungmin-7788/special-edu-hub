import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useAuth } from "@/lib/auth"
import { getCategory } from "@/config/categories"
import { getApp, type App } from "@/lib/apps"
import { WriteForm } from "@/components/app/WriteForm"

/**
 * /edit/:appId — 등록한 자료 수정 (5단계).
 * 권한: 작성자 본인(owner_id=나) 또는 관리자만. 최종 강제는 RLS(updateApp).
 * 상위 분류는 기존 category_ids 에서 상위(부모 없는) 항목을 골라 WriteForm 에 넘긴다.
 */
type State =
  | { kind: "loading" }
  | { kind: "notLoggedIn" }
  | { kind: "notFound" }
  | { kind: "denied" }
  | { kind: "ready"; app: App; categoryId: string }

export function EditPage() {
  const { appId } = useParams<{ appId: string }>()
  const { user, isAdmin, loading: authLoading } = useAuth()
  const [state, setState] = useState<State>({ kind: "loading" })

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setState({ kind: "notLoggedIn" })
      return
    }

    let cancelled = false
    getApp(appId ?? "").then((app) => {
      if (cancelled) return
      if (!app) {
        setState({ kind: "notFound" })
        return
      }
      if (app.ownerId !== user.id && !isAdmin) {
        setState({ kind: "denied" })
        return
      }
      // 상위(부모 없는) 분류를 대표로. 없으면 첫 항목.
      const primaryId =
        app.categoryIds.find((id) => !getCategory(id)?.parentId) ??
        app.categoryIds[0]
      setState({ kind: "ready", app, categoryId: primaryId })
    })
    return () => {
      cancelled = true
    }
  }, [appId, user, isAdmin, authLoading])

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold">자료 수정</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        등록한 자료의 내용을 수정합니다. 저장하면 바로 반영됩니다.
      </p>

      {state.kind === "loading" && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          불러오는 중…
        </div>
      )}

      {state.kind === "notLoggedIn" && (
        <Notice
          title="로그인이 필요합니다"
          body="자료 수정은 작성자 본인만 할 수 있어요. 먼저 로그인해 주세요."
          to="/login"
          cta="로그인하러 가기"
        />
      )}

      {state.kind === "notFound" && (
        <Notice
          title="자료를 찾을 수 없습니다"
          body="이미 삭제되었거나 존재하지 않는 자료입니다."
          to="/apps/subject"
          cta="목록으로"
        />
      )}

      {state.kind === "denied" && (
        <Notice
          title="수정 권한이 없습니다"
          body="이 자료는 작성자 본인 또는 관리자만 수정할 수 있어요."
          to="/"
          cta="홈으로"
        />
      )}

      {state.kind === "ready" && (
        <WriteForm categoryId={state.categoryId} app={state.app} />
      )}
    </div>
  )
}

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
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      <Link
        to={to}
        className="mt-4 inline-block rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        {cta}
      </Link>
    </div>
  )
}

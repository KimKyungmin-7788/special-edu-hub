import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ShieldCheck } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { getProfile } from "@/lib/profile"
import { practiceCopy } from "@/config/practice"
import {
  getPractice,
  getPracticeApps,
  type Practice,
  type PracticeAppLink,
} from "@/lib/practices"
import { PracticeForm } from "@/components/practice/PracticeForm"

/**
 * /practices/write — 사례 쓰기 (인증교사만)
 * /practices/:id/edit — 사례 수정 (작성자·운영진만)
 * 안내용 분기이며 최종 권한은 RLS(31_practices.sql).
 */
type State =
  | { kind: "loading" }
  | { kind: "notLoggedIn" }
  | { kind: "notVerified" }
  | { kind: "notFound" }
  | { kind: "denied" }
  | { kind: "ready"; practice?: Practice; apps: PracticeAppLink[] }

export function PracticeWritePage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = id != null
  const { user, isStaff, loading: authLoading } = useAuth()
  const [state, setState] = useState<State>({ kind: "loading" })

  useEffect(() => {
    if (authLoading) return
    if (!user) return setState({ kind: "notLoggedIn" })
    let cancelled = false

    if (isEdit) {
      getPractice(id).then(async (p) => {
        if (cancelled) return
        if (!p) return setState({ kind: "notFound" })
        if (p.ownerId !== user.id && !isStaff) return setState({ kind: "denied" })
        const apps = await getPracticeApps(p.id)
        if (!cancelled) setState({ kind: "ready", practice: p, apps })
      })
    } else {
      getProfile(user.id).then((profile) => {
        if (cancelled) return
        setState(
          profile?.isTeacherVerified ? { kind: "ready", apps: [] } : { kind: "notVerified" },
        )
      })
    }
    return () => {
      cancelled = true
    }
  }, [id, isEdit, user, isStaff, authLoading])

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold">
        {isEdit ? practiceCopy.editTitle : practiceCopy.writeTitle}
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        {isEdit ? practiceCopy.editIntro : practiceCopy.writeIntro}
      </p>

      {state.kind === "loading" && (
        <div className="py-16 text-center text-sm text-muted-foreground">불러오는 중…</div>
      )}
      {state.kind === "notLoggedIn" && (
        <Notice
          title="로그인이 필요합니다"
          body="수업 사례는 인증교사만 올릴 수 있어요. 먼저 로그인해 주세요."
          to="/login"
          cta="로그인하러 가기"
        />
      )}
      {state.kind === "notVerified" && (
        <Notice
          title="교사인증이 필요합니다"
          body="수업 사례는 교사인증을 받은 분만 올릴 수 있어요. 교사인증센터에서 인증을 진행해 주세요."
          to="/verify"
          cta="교사인증센터 바로가기"
        />
      )}
      {state.kind === "notFound" && (
        <Notice
          title="사례를 찾을 수 없습니다"
          body="없거나 숨겨진 사례입니다."
          to="/practices"
          cta="목록으로"
        />
      )}
      {state.kind === "denied" && (
        <Notice
          title="수정 권한이 없습니다"
          body="이 사례는 작성자 본인 또는 운영진만 수정할 수 있어요."
          to="/practices"
          cta="목록으로"
        />
      )}
      {state.kind === "ready" && (
        <PracticeForm practice={state.practice} initialApps={state.apps} />
      )}
    </div>
  )
}

function Notice({ title, body, to, cta }: { title: string; body: string; to: string; cta: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
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

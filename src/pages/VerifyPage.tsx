import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { getProfile } from "@/lib/profile"
import {
  getMyLatestRequest,
  type VerificationRequest,
} from "@/lib/verification"
import { VerifyNotLoggedIn } from "@/components/verify/VerifyNotLoggedIn"
import { VerifyAlreadyCertified } from "@/components/verify/VerifyAlreadyCertified"
import { VerifyPending } from "@/components/verify/VerifyPending"
import { VerifyRejected } from "@/components/verify/VerifyRejected"
import { VerifyForm } from "@/components/verify/VerifyForm"

/**
 * /verify — 교사인증센터 (2단계 묶음 D-2).
 *
 * 상태 분기:
 *   비로그인                → VerifyNotLoggedIn
 *   profile.isTeacherVerified → VerifyAlreadyCertified
 *   최신 신청 없음(미신청)   → VerifyForm(mode="new")
 *   pending                 → VerifyPending
 *   rejected                → VerifyRejected + VerifyForm(mode="reapply")
 *   approved(트리거로 verified됨) → VerifyAlreadyCertified (위에서 처리)
 */

type PageState =
  | { kind: "loading" }
  | { kind: "notLoggedIn" }
  | { kind: "certified" }
  | { kind: "noRequest" }
  | { kind: "pending"; request: VerificationRequest }
  | { kind: "rejected"; request: VerificationRequest }
  | { kind: "reapply"; request: VerificationRequest } // 반려 후 재신청 폼 표시

export function VerifyPage() {
  const { user, loading: authLoading } = useAuth()
  const [pageState, setPageState] = useState<PageState>({ kind: "loading" })

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setPageState({ kind: "notLoggedIn" })
      return
    }

    let cancelled = false

    async function load() {
      const [profile, latestReq] = await Promise.all([
        getProfile(user!.id),
        getMyLatestRequest(),
      ])

      if (cancelled) return

      if (profile?.isTeacherVerified) {
        setPageState({ kind: "certified" })
        return
      }

      if (!latestReq) {
        setPageState({ kind: "noRequest" })
        return
      }

      if (latestReq.status === "pending") {
        setPageState({ kind: "pending", request: latestReq })
      } else if (latestReq.status === "rejected") {
        setPageState({ kind: "rejected", request: latestReq })
      } else {
        // approved 인데 isTeacherVerified가 아직 안 반영된 경우 (트리거 지연 극히 드묾)
        setPageState({ kind: "certified" })
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user, authLoading])

  // ── 렌더 ──────────────────────────────────────────
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold">교사인증센터</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        교사인증을 받으면 앱 등록 등 교사 전용 기능을 이용할 수 있습니다.
      </p>

      <Content
        state={pageState}
        onFormSuccess={(req) =>
          setPageState({ kind: "pending", request: req })
        }
        onReapply={(req) => setPageState({ kind: "reapply", request: req })}
      />
    </div>
  )
}

// ── 내부 컴포넌트: 상태별 분기 ──────────────────────
function Content({
  state,
  onFormSuccess,
  onReapply,
}: {
  state: PageState
  onFormSuccess: (req: VerificationRequest) => void
  onReapply: (req: VerificationRequest) => void
}) {
  switch (state.kind) {
    case "loading":
      return (
        <div className="py-16 text-center text-sm text-muted-foreground">
          불러오는 중…
        </div>
      )

    case "notLoggedIn":
      return <VerifyNotLoggedIn />

    case "certified":
      return <VerifyAlreadyCertified />

    case "noRequest":
      return <VerifyForm mode="new" onSuccess={onFormSuccess} />

    case "pending":
      return <VerifyPending createdAt={state.request.createdAt} />

    case "rejected":
      return (
        <div className="flex flex-col gap-8">
          <VerifyRejected
            rejectReason={state.request.rejectReason}
            onReapply={() => onReapply(state.request)}
          />
        </div>
      )

    case "reapply":
      return (
        <div className="flex flex-col gap-6">
          <VerifyRejected
            rejectReason={state.request.rejectReason}
            onReapply={() => {}} // 이미 재신청 폼이 열려 있음
          />
          <hr className="border-border" />
          <p className="text-sm font-semibold">재신청</p>
          <VerifyForm mode="reapply" onSuccess={onFormSuccess} />
        </div>
      )
  }
}

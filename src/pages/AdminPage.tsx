import { useEffect, useState } from "react"
import { Link, Navigate, useSearchParams } from "react-router-dom"
import { useAuth } from "@/lib/auth"
import { AdminAppList } from "@/components/admin/AdminAppList"
import { AdminVerifyQueue } from "@/components/admin/AdminVerifyQueue"
import { AdminMemberList } from "@/components/admin/AdminMemberList"
import { AdminReportQueue } from "@/components/admin/AdminReportQueue"
import { AdminInquiryQueue } from "@/components/admin/AdminInquiryQueue"
import { AdminNoticeForm } from "@/components/admin/AdminNoticeForm"
import { AdminUpdateManager } from "@/components/admin/AdminUpdateManager"
import { usePageTitle } from "@/lib/usePageTitle"
import { listPendingRequests } from "@/lib/verification"
import { listPendingReports } from "@/lib/reports"
import { listOpenInquiries } from "@/lib/inquiries"

/**
 * /admin — 관리자 운영 페이지 (묶음 A).
 *
 * 게이트(UI 가드 + RLS 최종 강제):
 *   세션 확인 중 → 대기 / 비로그인 → /login / 비관리자 → 권한 없음 안내
 *   관리자       → 탭(앱 관리 / 교사인증 큐)
 *
 * 권한 체크의 진짜 강제는 DB RLS(is_admin)다. 여기 가드는 화면 접근 차단일 뿐.
 */

const ADMIN_TABS = ["apps", "verify", "members", "reports", "inquiries", "notice", "updates"] as const
type AdminTab = (typeof ADMIN_TABS)[number]

export function AdminPage() {
  usePageTitle("관리")
  const { user, isStaff, loading } = useAuth()
  // 탭은 주소(?tab=)를 따른다 — 알림 메일 링크(/admin?tab=verify)로 오면 그 탭이 바로 열린다. 없으면 앱 관리
  const [params, setParams] = useSearchParams()
  const asked = params.get("tab")
  const tab: AdminTab = ADMIN_TABS.find((t) => t === asked) ?? "apps"
  const setTab = (t: AdminTab) => setParams(t === "apps" ? {} : { tab: t }, { replace: true })
  const pending = usePendingCounts(isStaff, tab)

  // 최초 세션 확인 중에는 깜빡임 방지로 대기.
  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-muted-foreground">
        불러오는 중…
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold">접근 권한이 없습니다</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          이 페이지는 운영진만 이용할 수 있습니다.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          홈으로
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold">관리</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        앱 공개 상태·교사인증 신청·회원·신고·문의를 관리하고 공지 알림과 새 소식을 올립니다.
      </p>

      <div className="mb-6 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border">
        <TabButton active={tab === "apps"} onClick={() => setTab("apps")}>
          앱 관리
        </TabButton>
        <TabButton active={tab === "verify"} onClick={() => setTab("verify")} count={pending.verify}>
          교사인증 큐
        </TabButton>
        <TabButton active={tab === "members"} onClick={() => setTab("members")}>
          회원
        </TabButton>
        <TabButton active={tab === "reports"} onClick={() => setTab("reports")} count={pending.reports}>
          신고
        </TabButton>
        <TabButton active={tab === "inquiries"} onClick={() => setTab("inquiries")} count={pending.inquiries}>
          문의
        </TabButton>
        <TabButton active={tab === "notice"} onClick={() => setTab("notice")}>
          공지 알림
        </TabButton>
        <TabButton active={tab === "updates"} onClick={() => setTab("updates")}>
          새 소식
        </TabButton>
      </div>

      {/* 회원 표만 넓게 쓰고, 나머지 탭은 읽기 좋은 폭을 유지한다 */}
      {tab === "members" ? (
        <AdminMemberList />
      ) : (
        <div className="max-w-3xl">
          {tab === "apps" && <AdminAppList />}
          {tab === "verify" && <AdminVerifyQueue />}
          {tab === "reports" && <AdminReportQueue />}
          {tab === "inquiries" && <AdminInquiryQueue />}
          {tab === "notice" && <AdminNoticeForm />}
          {tab === "updates" && <AdminUpdateManager />}
        </div>
      )}
    </div>
  )
}

/** 처리 대기 건수(교사인증·신고·문의). 탭을 옮길 때마다 다시 센다(처리한 뒤 줄어들게). */
function usePendingCounts(isStaff: boolean, tab: AdminTab) {
  const [counts, setCounts] = useState({ verify: 0, reports: 0, inquiries: 0 })
  useEffect(() => {
    if (!isStaff) return
    let active = true
    Promise.all([listPendingRequests(), listPendingReports(), listOpenInquiries()]).then(([v, r, i]) => {
      if (active) setCounts({ verify: v.length, reports: r.length, inquiries: i.length })
    })
    return () => {
      active = false
    }
  }, [isStaff, tab])
  return counts
}

function TabButton({
  active,
  onClick,
  count = 0,
  children,
}: {
  active: boolean
  onClick: () => void
  /** 처리 대기 건수 — 1 이상이면 빨간 숫자 */
  count?: number
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium " +
        (active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground")
      }
    >
      {children}
      {count > 0 && (
        <span className="ml-1.5 rounded-full bg-destructive px-1.5 py-0.5 text-xs font-bold text-destructive-foreground">
          {count}
        </span>
      )}
    </button>
  )
}

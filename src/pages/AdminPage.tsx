import { useState } from "react"
import { Link, Navigate } from "react-router-dom"
import { useAuth } from "@/lib/auth"
import { AdminAppList } from "@/components/admin/AdminAppList"
import { AdminVerifyQueue } from "@/components/admin/AdminVerifyQueue"
import { AdminMemberList } from "@/components/admin/AdminMemberList"
import { AdminReportQueue } from "@/components/admin/AdminReportQueue"
import { AdminInquiryQueue } from "@/components/admin/AdminInquiryQueue"

/**
 * /admin — 관리자 운영 페이지 (묶음 A).
 *
 * 게이트(UI 가드 + RLS 최종 강제):
 *   세션 확인 중 → 대기 / 비로그인 → /login / 비관리자 → 권한 없음 안내
 *   관리자       → 탭(앱 관리 / 교사인증 큐)
 *
 * 권한 체크의 진짜 강제는 DB RLS(is_admin)다. 여기 가드는 화면 접근 차단일 뿐.
 */

type AdminTab = "apps" | "verify" | "members" | "reports" | "inquiries"

export function AdminPage() {
  const { user, isStaff, loading } = useAuth()
  const [tab, setTab] = useState<AdminTab>("apps")

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
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold">관리</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        앱 공개 상태·교사인증 신청·회원·신고·문의를 관리합니다.
      </p>

      <div className="mb-6 flex gap-1 border-b border-border">
        <TabButton active={tab === "apps"} onClick={() => setTab("apps")}>
          앱 관리
        </TabButton>
        <TabButton active={tab === "verify"} onClick={() => setTab("verify")}>
          교사인증 큐
        </TabButton>
        <TabButton active={tab === "members"} onClick={() => setTab("members")}>
          회원
        </TabButton>
        <TabButton active={tab === "reports"} onClick={() => setTab("reports")}>
          신고
        </TabButton>
        <TabButton active={tab === "inquiries"} onClick={() => setTab("inquiries")}>
          문의
        </TabButton>
      </div>

      {tab === "apps" && <AdminAppList />}
      {tab === "verify" && <AdminVerifyQueue />}
      {tab === "members" && <AdminMemberList />}
      {tab === "reports" && <AdminReportQueue />}
      {tab === "inquiries" && <AdminInquiryQueue />}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "-mb-px border-b-2 px-4 py-2 text-sm font-medium " +
        (active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </button>
  )
}

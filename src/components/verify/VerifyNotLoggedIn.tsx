import { Link } from "react-router-dom"

/**
 * 비로그인 상태 — 로그인 안내.
 */
export function VerifyNotLoggedIn() {
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <div className="text-4xl">🔒</div>
      <div>
        <p className="text-lg font-semibold">로그인이 필요합니다</p>
        <p className="mt-1 text-sm text-muted-foreground">
          교사인증을 신청하려면 먼저 로그인해 주세요.
        </p>
      </div>
      <Link
        to="/login"
        className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        로그인하기
      </Link>
    </div>
  )
}

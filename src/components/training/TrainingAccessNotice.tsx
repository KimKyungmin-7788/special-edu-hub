import { Link, useLocation } from "react-router-dom"
import { useAuth } from "@/lib/auth"

/**
 * 연수 쪽을 볼 수 없을 때의 안내 — 로그인 전이면 로그인으로, 교사인증 전이면 교사인증센터로 보낸다.
 * 화면에서만 막는다(연수 자료가 앱 코드에 함께 들어 있어 DB로 막을 대상이 없음).
 */
export function TrainingAccessNotice() {
  const { user } = useAuth()
  const location = useLocation()
  const here = location.pathname + location.search
  const primary = "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
  return (
    <div role="alert" className="max-w-3xl rounded-xl border bg-card p-6 shadow-sm">
      <h2 className="font-semibold">{user ? "교사인증이 필요해요" : "로그인이 필요해요"}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {user
          ? "열린연수방의 연수는 교사인증을 마친 선생님이 볼 수 있어요. 교사인증센터에서 인증을 신청하거나 진행 상황을 확인해 주세요."
          : "열린연수방의 연수는 로그인하고 교사인증을 마친 선생님이 볼 수 있어요. 로그인한 뒤 다시 열어 주세요."}
      </p>
      <div className="mt-4">
        {user ? (
          <Link to="/verify" className={primary}>교사인증하기</Link>
        ) : (
          <Link to="/login" state={{ from: here }} className={primary}>로그인하기</Link>
        )}
      </div>
    </div>
  )
}

import { Link } from "react-router-dom"
import { site } from "@/config/site"
import { Nav } from "@/components/layout/Nav"
import { useAuth } from "@/lib/auth"

/**
 * 상단 고정 헤더 — 로고 · 네비 · 인증 영역을 한 줄에 배치.
 * 인증 영역은 세션 상태에 따라 바뀐다(2단계 묶음 A-3):
 *   로딩 중 → 비움(깜빡임 방지) / 비로그인 → 로그인·회원가입 / 로그인 → 이메일·로그아웃
 */
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="flex items-center rounded-md bg-muted px-2.5 py-1 text-sm font-semibold tracking-tight text-muted-foreground">
            {site.logoText}
          </span>
          <span className="hidden text-sm text-muted-foreground lg:inline">
            {site.name}
          </span>
        </Link>

        <div className="min-w-0 flex-1">
          <Nav />
        </div>

        <AuthArea />
      </div>
    </header>
  )
}

/** 헤더 우측 인증 영역 — 세션 상태로 분기. */
function AuthArea() {
  const { user, loading, signOut } = useAuth()

  // 최초 세션 확인 전에는 비워 둔다(로그인/로그아웃 깜빡임 방지).
  if (loading) {
    return <div className="h-8 w-px shrink-0" aria-hidden="true" />
  }

  if (user) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <Link
          to="/mypage"
          className="hidden max-w-[12rem] truncate text-sm text-muted-foreground hover:text-foreground sm:inline"
          title={user.email ?? undefined}
        >
          {user.email}
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          로그아웃
        </button>
      </div>
    )
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Link
        to="/login"
        className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        로그인
      </Link>
      <Link
        to="/signup"
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
      >
        회원가입
      </Link>
    </div>
  )
}

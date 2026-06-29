import { Link } from "react-router-dom"
import { site } from "@/config/site"
import { CONTAINER } from "@/config/layout"
import { Nav } from "@/components/layout/Nav"
import { useAuth } from "@/lib/auth"

/**
 * 상단 고정 헤더 — 로고 · 네비 · 인증 영역을 한 줄에 배치.
 * 인증 영역은 세션 상태에 따라 바뀐다(2단계 묶음 A-3):
 *   로딩 중 → 비움(깜빡임 방지) / 비로그인 → 로그인·회원가입
 *   로그인 → 원형 아바타 + 닉네임(이메일 대신, 일반 관행) → 마이페이지 / 로그아웃
 */
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className={`${CONTAINER} flex h-14 items-center gap-4`}>
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
  const { user, profile, isStaff, loading, signOut } = useAuth()

  // 최초 세션 확인 전에는 비워 둔다(로그인/로그아웃 깜빡임 방지).
  if (loading) {
    return <div className="h-8 w-px shrink-0" aria-hidden="true" />
  }

  if (user) {
    // 표시 이름: 닉네임 우선, 없으면 이메일 앞부분(이메일 전체는 노출하지 않음).
    const displayName =
      profile?.nickname?.trim() || user.email?.split("@")[0] || "사용자"
    const initial = displayName.charAt(0).toUpperCase()
    return (
      <div className="flex shrink-0 items-center gap-2">
        {isStaff && (
          <Link
            to="/admin"
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            관리
          </Link>
        )}
        <Link
          to="/mypage"
          className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm text-muted-foreground hover:text-foreground"
          title="마이페이지"
        >
          <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-xs font-medium text-muted-foreground">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              initial
            )}
          </span>
          <span className="hidden max-w-[8rem] truncate sm:inline">
            {displayName}
          </span>
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

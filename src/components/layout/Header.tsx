import { useEffect, useRef, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { ChevronDown, LogOut, Menu, Settings, User, X } from "lucide-react"
import { site } from "@/config/site"
import { SiteLogo } from "@/config/logo"
import { CONTAINER } from "@/config/layout"
import { Nav } from "@/components/layout/Nav"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"

/**
 * 상단 고정 헤더.
 *  넓은 화면(xl↑): [로고·누리집명] [주 메뉴(밑줄 강조)] ··· [관리 · 계정 메뉴]
 *  좁은 화면     : [로고·누리집명] ··· [로그인/아바타] [☰] → 아래로 펼쳐지는 메뉴 패널
 * 인증 영역은 세션 상태로 분기:
 *   로딩 중 → 비움(깜빡임 방지) / 비로그인 → 로그인·회원가입
 *   로그인 → 아바타+닉네임 드롭다운(마이페이지·관리·로그아웃)
 */
export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()

  // 페이지가 바뀌면 모바일 메뉴 닫기
  useEffect(() => setMenuOpen(false), [pathname])

  // 넓은 화면으로 바뀌면 모바일 메뉴 닫기 / ESC 닫기
  useEffect(() => {
    if (!menuOpen) return
    const mq = window.matchMedia("(min-width: 1280px)")
    const onChange = () => mq.matches && setMenuOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false)
    mq.addEventListener("change", onChange)
    window.addEventListener("keydown", onKey)
    return () => {
      mq.removeEventListener("change", onChange)
      window.removeEventListener("keydown", onKey)
    }
  }, [menuOpen])

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className={cn(CONTAINER, "flex h-16 items-center gap-6")}>
        <Brand />

        <div className="hidden h-full min-w-0 flex-1 xl:block">
          <Nav variant="bar" />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <AuthArea />
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
            className="-mr-2 ml-1 flex size-10 items-center justify-center rounded-md text-foreground hover:bg-accent xl:hidden"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full max-h-[calc(100svh-4rem)] overflow-y-auto border-b bg-background shadow-sm xl:hidden"
        >
          <div className={cn(CONTAINER, "py-3")}>
            <Nav variant="list" onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}
    </header>
  )
}

/** 로고 + 2줄 워드마크(config 단일 소스 — 윗줄 eyebrow, 아랫줄 title, 없으면 name). */
function Brand() {
  const { eyebrow } = site.headerBrand
  const title = site.headerBrand.title || site.name
  return (
    <Link
      to="/"
      className="flex min-w-0 items-center gap-2.5 rounded-md xl:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      aria-label={`${[eyebrow, title].filter(Boolean).join(" ")} 홈`}
    >
      <SiteLogo className="size-9 shrink-0" />
      <span className="flex min-w-0 flex-col justify-center gap-0.5">
        {eyebrow && (
          <span className="truncate text-[11px] leading-none font-medium tracking-tight text-muted-foreground sm:text-xs">
            {eyebrow}
          </span>
        )}
        <span className="truncate text-sm leading-tight font-bold tracking-tight text-foreground sm:text-[15px]">
          {title}
        </span>
      </span>
    </Link>
  )
}

/** 헤더 우측 인증 영역 — 세션 상태로 분기. */
function AuthArea() {
  const { user, profile, isStaff, loading, signOut } = useAuth()

  // 최초 세션 확인 전에는 비워 둔다(로그인/로그아웃 깜빡임 방지).
  if (loading) {
    return <div className="h-9 w-px" aria-hidden="true" />
  }

  if (!user) {
    return (
      <div className="flex items-center gap-1.5">
        <Link
          to="/login"
          className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground"
        >
          로그인
        </Link>
        <Link
          to="/signup"
          className="hidden rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:inline-block"
        >
          회원가입
        </Link>
      </div>
    )
  }

  // 표시 이름: 닉네임 우선, 없으면 이메일 앞부분(이메일 전체는 노출하지 않음).
  const displayName =
    profile?.nickname?.trim() || user.email?.split("@")[0] || "사용자"

  return (
    <div className="flex items-center gap-1">
      {isStaff && (
        <Link
          to="/admin"
          className="hidden items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground md:flex"
        >
          <Settings className="size-4" aria-hidden />
          관리
        </Link>
      )}
      <AccountMenu
        displayName={displayName}
        avatarUrl={profile?.avatarUrl ?? null}
        verified={!!profile?.isTeacherVerified}
        isStaff={isStaff}
        onSignOut={() => void signOut()}
      />
    </div>
  )
}

function Avatar({
  name,
  url,
  className,
}: {
  name: string
  url: string | null
  className?: string
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-surface text-xs font-semibold text-muted-foreground",
        className,
      )}
    >
      {url ? (
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  )
}

/** 아바타 버튼 → 드롭다운(마이페이지 · 관리 · 로그아웃). 바깥 클릭·ESC 로 닫힘. */
function AccountMenu({
  displayName,
  avatarUrl,
  verified,
  isStaff,
  onSignOut,
}: {
  displayName: string
  avatarUrl: string | null
  verified: boolean
  isStaff: boolean
  onSignOut: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", onDown)
    window.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  const itemClass =
    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-accent"

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="계정 메뉴"
        className={cn(
          "flex items-center gap-2 rounded-full py-1 pr-2 pl-1 text-sm font-medium text-foreground transition-colors hover:bg-accent",
          open && "bg-accent",
        )}
      >
        <Avatar name={displayName} url={avatarUrl} className="size-8" />
        <span className="hidden max-w-[7rem] truncate sm:inline">
          {displayName}
        </span>
        <ChevronDown
          className={cn(
            "hidden size-4 text-muted-foreground transition-transform sm:block",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-lg"
        >
          <div className="flex items-center gap-3 px-2.5 pt-2 pb-3">
            <Avatar name={displayName} url={avatarUrl} className="size-10" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="text-xs text-muted-foreground">
                {verified ? "인증 교사" : "교사인증 전"}
              </p>
            </div>
          </div>
          <div className="my-1 h-px bg-border" />
          <Link to="/mypage" role="menuitem" className={itemClass}>
            <User className="size-4 text-muted-foreground" aria-hidden />
            마이페이지
          </Link>
          {isStaff && (
            <Link to="/admin" role="menuitem" className={itemClass}>
              <Settings className="size-4 text-muted-foreground" aria-hidden />
              관리
            </Link>
          )}
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onSignOut()
            }}
            className={itemClass}
          >
            <LogOut className="size-4 text-muted-foreground" aria-hidden />
            로그아웃
          </button>
        </div>
      )}
    </div>
  )
}

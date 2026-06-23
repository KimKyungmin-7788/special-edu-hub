import { Link } from "react-router-dom"
import { site } from "@/config/site"
import { Nav } from "@/components/layout/Nav"

/**
 * 상단 고정 헤더 — 로고 · 네비 · 로그인/회원가입을 한 줄에 배치.
 * 로그인·회원가입은 이번 단계 "모양만" — 동작하지 않는다(CLAUDE.md 규칙 4).
 */
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="text-base font-semibold tracking-tight">
            {site.logoText}
          </span>
          <span className="hidden text-sm text-muted-foreground lg:inline">
            {site.name}
          </span>
        </Link>

        <div className="min-w-0 flex-1">
          <Nav />
        </div>

        {/* 모양만 — 비작동 (준비 중) */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-disabled="true"
            title="준비 중"
            className="cursor-not-allowed rounded-md px-3 py-1.5 text-sm text-muted-foreground"
          >
            로그인
          </button>
          <button
            type="button"
            aria-disabled="true"
            title="준비 중"
            className="cursor-not-allowed rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground opacity-60"
          >
            회원가입
          </button>
        </div>
      </div>
    </header>
  )
}

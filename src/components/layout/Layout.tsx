import { Suspense } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { ErrorBoundary } from "@/components/layout/ErrorBoundary"
import { CONTAINER } from "@/config/layout"

/**
 * 공통 레이아웃 — 모든 페이지를 Header / Footer 로 감싼다.
 * 본문 바탕은 옅은 회색(surface), 카드·패널은 흰색(card)으로 올려 구분한다. 헤더·푸터는 흰색.
 * 페이지는 들어갈 때 따로 내려받으므로(App.tsx lazy) 받는 동안 PageLoading 을, 실패하면 ErrorBoundary 안내를 보여 준다.
 */
export function Layout() {
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        본문으로 건너뛰기
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 bg-surface pb-16 outline-none">
        <ErrorBoundary key={pathname}>
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  )
}

function PageLoading() {
  return (
    <div role="status" className={`${CONTAINER} py-24 text-center text-sm text-muted-foreground`}>
      불러오는 중…
    </div>
  )
}

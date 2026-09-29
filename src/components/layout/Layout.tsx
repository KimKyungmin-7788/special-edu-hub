import { Outlet } from "react-router-dom"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"

/**
 * 공통 레이아웃 — 모든 페이지를 Header / Footer 로 감싼다.
 * 본문 바탕은 옅은 회색(surface), 카드·패널은 흰색(card)으로 올려 구분한다. 헤더·푸터는 흰색.
 */
export function Layout() {
  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="flex-1 bg-surface pb-16">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

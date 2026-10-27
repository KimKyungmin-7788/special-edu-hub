import { NavLink, Outlet } from "react-router-dom"
import { useAuth } from "@/lib/auth"

export function BoardLayout() {
  const { profile } = useAuth()
  const items = [{ to: "/board/free", label: "자유게시판" }, ...(profile?.isResearchMember ? [{ to: "/board/research", label: "연구회게시판" }] : [])]
  return <>
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <p className="mb-4 text-sm font-semibold text-muted-foreground">게시판</p>
      <nav aria-label="게시판 하위 메뉴" className="flex gap-2 border-b pb-3">
        {items.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => `rounded-md px-4 py-2 text-sm font-medium ${isActive ? "bg-brand-muted text-brand-muted-foreground" : "text-muted-foreground hover:bg-accent"}`}>{item.label}</NavLink>)}
      </nav>
    </div>
    <Outlet />
  </>
}

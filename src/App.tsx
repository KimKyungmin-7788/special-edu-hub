import { useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { site } from "@/config/site"
import { AuthProvider } from "@/lib/auth"
import { Layout } from "@/components/layout/Layout"
import { Home } from "@/pages/Home"
import { SubjectApps } from "@/pages/SubjectApps"
import { WorkApps } from "@/pages/WorkApps"
import { AppDetail } from "@/pages/AppDetail"
import { WritePage } from "@/pages/WritePage"
// (전체 카탈로그 페이지는 제거 — 인기/과목별로 대체)
import { ComingSoon } from "@/pages/ComingSoon"
import { Login } from "@/pages/Login"
import { Signup } from "@/pages/Signup"
import { MyPage } from "@/pages/MyPage"
import { VerifyPage } from "@/pages/VerifyPage"
import { AdminPage } from "@/pages/AdminPage"
import { NotFound } from "@/pages/NotFound"

function App() {
  useEffect(() => {
    document.title = site.name
  }, [])

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            {/* 전체(/apps)는 없앰 — 인기로 리다이렉트(옛 링크·뒤로가기 대비) */}
            <Route path="apps" element={<Navigate to="/apps/subject" replace />} />
            <Route path="write/:categoryId" element={<WritePage />} />
            <Route path="apps/subject" element={<SubjectApps />} />
            <Route path="apps/subject/:categoryId" element={<SubjectApps />} />
            <Route path="apps/work" element={<WorkApps />} />
            <Route path="app/:id" element={<AppDetail />} />

            {/* 로그인 / 회원가입 (이메일+비번) */}
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            <Route path="mypage" element={<MyPage />} />
            <Route path="admin" element={<AdminPage />} />

            {/* 자리만 / 준비 중 */}
            <Route
              path="practices"
              element={<ComingSoon title="수업실천사례" />}
            />
            <Route path="board" element={<ComingSoon title="자유게시판" />} />
            <Route path="verify" element={<VerifyPage />} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App

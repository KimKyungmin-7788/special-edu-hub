import { useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { site } from "@/config/site"
import { AuthProvider } from "@/lib/auth"
import { Layout } from "@/components/layout/Layout"
import { Home } from "@/pages/Home"
import { SubjectApps } from "@/pages/SubjectApps"
import { WorkApps } from "@/pages/WorkApps"
import { LatestApps } from "@/pages/LatestApps"
import { AppDetail } from "@/pages/AppDetail"
import { WritePage } from "@/pages/WritePage"
import { EditPage } from "@/pages/EditPage"
import { Privacy } from "@/pages/Privacy"
import { Terms } from "@/pages/Terms"
import { Contact } from "@/pages/Contact"
// (전체 카탈로그 페이지는 제거 — 인기/과목별로 대체)
import { ComingSoon } from "@/pages/ComingSoon"
import { Login } from "@/pages/Login"
import { Signup } from "@/pages/Signup"
import { MyPage } from "@/pages/MyPage"
import { VerifyPage } from "@/pages/VerifyPage"
import { AdminPage } from "@/pages/AdminPage"
import { NotFound } from "@/pages/NotFound"
import { PracticeList } from "@/pages/PracticeList"
import { PracticeDetail } from "@/pages/PracticeDetail"
import { PracticeWritePage } from "@/pages/PracticeWritePage"
import { VibecodingPage } from "@/pages/VibecodingPage"
import { VibeSetup } from "@/components/vibecoding/setup/VibeSetup"
import { VibeWhy } from "@/components/vibecoding/why/VibeWhy"
import { VibeSurvey } from "@/components/vibecoding/survey/VibeSurvey"
import { vibecoding, vibecodingPath } from "@/config/vibecoding"

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
            <Route path="apps/latest" element={<LatestApps />} />
            <Route path="write/:categoryId" element={<WritePage />} />
            <Route path="edit/:appId" element={<EditPage />} />
            <Route path="apps/subject" element={<SubjectApps />} />
            <Route path="apps/subject/:categoryId" element={<SubjectApps />} />
            <Route path="apps/work" element={<WorkApps />} />
            <Route path="app/:id" element={<AppDetail />} />

            {/* 로그인 / 회원가입 (이메일+비번) */}
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            <Route path="mypage" element={<MyPage />} />
            <Route path="admin" element={<AdminPage />} />

            {/* 수업실천사례 (PRD §13) */}
            <Route path="practices" element={<PracticeList />} />
            <Route path="practices/write" element={<PracticeWritePage />} />
            <Route path="practices/:id" element={<PracticeDetail />} />
            <Route path="practices/:id/edit" element={<PracticeWritePage />} />
            {/* 바이브코딩: 오른쪽 사이드바 + 하위 페이지. /vibecoding 은 첫 하위 페이지로 */}
            <Route path="vibecoding" element={<VibecodingPage />}>
              <Route
                index
                element={<Navigate to={vibecodingPath(vibecoding.pages[0].slug)} replace />}
              />
              <Route path="why" element={<VibeWhy />} />
              <Route path="setup" element={<VibeSetup />} />
              <Route path="survey" element={<VibeSurvey />} />
            </Route>
            {/* 옛 주소(단독 튜토리얼을 넘겨주던 때) → 허브 하위 페이지로 */}
            <Route path="vibe-setup/*" element={<Navigate to={vibecodingPath("setup")} replace />} />

            {/* 자리만 / 준비 중 */}
            <Route path="board" element={<ComingSoon title="자유게시판" />} />
            <Route path="verify" element={<VerifyPage />} />

            {/* 정적·법적 페이지 (트랙 A) — 소개는 준비 중 */}
            <Route path="about" element={<ComingSoon title="소개" />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="terms" element={<Terms />} />
            <Route path="contact" element={<Contact />} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
